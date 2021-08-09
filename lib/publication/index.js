const {Router} = require('express')
const {raw, json} = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const passport = require('passport')
const {pick} = require('lodash')
const contentDisposition = require('content-disposition')
const w = require('../util/w')
const {client, dbName} = require('../util/mongo')
const createFranceConnectStrategy = require('./auth/franceconnect')
const {publishSubmission, getSubmission, updateSubmission, createSubmission, getPublishedSubmissions} = require('./models')
const {generatePinCode, getExpirationDate, validatePinCode} = require('../util/pin-code')
const {sendMail} = require('../util/sendmail')
const createPinCodeEmail = require('../emails/pin-code')
const createError = require('http-errors')

const app = new Router()

app.use(json())

function hasBeenSentRecently(sentAt) {
  const now = new Date()
  const floodLimitTime = new Date(sentAt)
  floodLimitTime.setMinutes(floodLimitTime.getMinutes() + 5)
  return now < floodLimitTime
}

const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'foobar',
  saveUninitialized: false,
  resave: false
}

if (process.env.NODE_ENV === 'production') {
  sessionOptions.store = new MongoStore({client, dbName})
}

app.use(session(sessionOptions))
app.use(passport.initialize())

if (process.env.FC_SERVICE_URL) {
  passport.use('franceconnect', createFranceConnectStrategy())
}

app.param('submissionId', w(async (req, res, next) => {
  const submission = await getSubmission(req.params.submissionId)
  if (!submission) {
    throw createError(404, 'submissionId inconnu')
  }

  req.submission = submission
  next()
}))

app.route('/submissions')
  .post(w(async (req, res) => {
    if (!req.body.url) {
      throw createError(400, '`url` est un champ obligatoire')
    }

    const submission = await createSubmission({url: req.body.url})
    res.status(201).send(submission)
  }))

app.route('/submissions/upload')
  .post(raw({limit: '10mb', type: 'text/csv'}), w(async (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      throw createError(400, 'Le fichier soumis n’a pas pu être traité. Vous devez soumettre un fichier CSV de moins de 10 Mo')
    }

    const submission = await createSubmission({file: req.body})
    res.status(201).send(submission)
  }))

app.route('/submissions/published')
  .get(w(async (req, res) => {
    const submissions = await getPublishedSubmissions()
    res.send(submissions)
  }))

app.route('/submissions/:submissionId')
  .get((req, res) => {
    res.send(req.submission)
  })

app.route('/submissions/:submissionId/data')
  .get(w((req, res) => {
    if (!req.submission.data) {
      throw createError(400, 'No data')
    }

    res
      .set('content-disposition', contentDisposition(`bal-${req.submission.commune.code}.csv`))
      .type('text/csv')
      .send(req.submission.data.toString())
  }))

app.route('/submissions/:submissionId/send-pin-code')
  .post(w(async (req, res) => {
    const {_id, commune, emailValidation} = req.submission

    if (req.submission.status !== 'created' || !commune.email) {
      throw createError(403, 'Impossible d’envoyer le code')
    }

    const now = new Date()
    if (emailValidation && hasBeenSentRecently(emailValidation.createAt)) {
      throw createError(409, 'Un courriel a déjà été envoyé, merci de patienter')
    }

    const code = await generatePinCode()
    await updateSubmission(_id, {emailValidation: {
      code,
      email: commune.email,
      expirationDate: getExpirationDate(now),
      createAt: now,
      validatedAt: null
    }})

    const email = createPinCodeEmail({code, commune})
    await sendMail(email, [commune.email])

    res.sendStatus(200)
  }))

app.route('/submissions/:submissionId/validate-pin-code')
  .post(w(async (req, res) => {
    if (!req.body.code) {
      throw createError(400, '`code` est un champ obligatoire')
    }

    if (req.submission.status !== 'created' || !req.submission.emailValidation) {
      throw createError(403, 'Impossible de valider le code')
    }

    const {code, expirationDate} = req.submission.emailValidation

    if (!validatePinCode(req.body.code, code, expirationDate)) {
      return res.send({validated: false, error: 'Code non valide ou expiré'})
    }

    const submission = await updateSubmission(req.submission._id, {
      status: 'pending',
      emailValidation: {
        ...req.submission.emailValidation,
        validatedAt: new Date()
      }})
    res.send(submission)
  }))

app.route('/submissions/:submissionId/authenticate')
  .get((req, res, next) => {
    req.session.submissionId = req.submission._id
    passport.authenticate('franceconnect')(req, res, next)
  })

app.route('/submissions/:submissionId/publish')
  .post(w(async (req, res) => {
    if (req.submission.status !== 'pending') {
      throw createError(403, 'La soumission ne peut plus être publiée')
    }

    const submission = await publishSubmission(req.submission)
    res.send(submission)
  }))

app.route('/fc/callback')
  .get(
    w((req, res, next) => {
      if (!req.session.submissionId) {
        throw createError(500, 'Session invalide')
      }

      req.submissionId = req.session.submissionId
      req.redirectUrl = `${process.env.ADRESSE_URL}/bases-locales/publication?submissionId=${req.submissionId}`
      req.session.submissiondId = null

      const authenticateOptions = {
        session: false,
        failureRedirect: req.redirectUrl
      }
      passport.authenticate('franceconnect', authenticateOptions)(req, res, next)
    }),
    w(async (req, res) => {
      const submission = await getSubmission(req.submissionId)
      if (!submission) {
        throw createError(500, 'La submission n’existe plus. Impossible de poursuivre')
      }

      if (submission.status !== 'created') {
        res.redirect(req.redirectUrl)
      }

      const mandat = getMandatCommune(req.user, submission.commune.code)

      if (!mandat) {
        await updateSubmission(req.submissionId, {
          authenticationError: 'Aucun mandat valide trouvé pour cette commune.'
        })
        return res.redirect(req.redirectUrl)
      }

      await updateSubmission(req.submissionId, {
        status: 'pending',
        authenticationUrl: null,
        authenticationError: null,
        authentication: mandat
      })

      res.redirect(req.redirectUrl)
    })
  )

app.use((err, req, res, _) => {
  if (err) {
    const statusCode = err.statusCode || 500
    const exposeError = statusCode !== 500
    res
      .status(statusCode)
      .send({
        code: statusCode,
        message: exposeError ? err.message : 'Une erreur inattendue est survenue.'
      })
  }
})

function getMandatCommune(user, codeCommune) {
  const userProps = pick(user, 'nomMarital', 'nomNaissance', 'prenom')

  if (user.isAdmin) {
    return {...userProps, typeMandat: 'administrateur'}
  }

  if (!user.mandats) {
    return
  }

  const mandatCommune = user.mandats.find(m => m.codeCommune === codeCommune)

  if (mandatCommune) {
    return {...userProps, typeMandat: mandatCommune.fonction || 'conseiller-municipal'}
  }
}

module.exports = app
