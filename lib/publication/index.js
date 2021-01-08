const {Router} = require('express')
const {json} = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const passport = require('passport')
const {pick} = require('lodash')
const w = require('../util/w')
const {client, dbName} = require('../util/mongo')
const fcStrategy = require('./auth/franceconnect')
const {getSubmission, updateSubmission, createSubmission, getPublishedSubmissions} = require('./models')
const {generatePinCode, getExpirationDate, validatePinCode} = require('../util/pin-code')
const {sendMail} = require('../util/sendmail')
const createPinCodeEmail = require('../emails/pin-code')

const app = new Router()

app.use(json())

function hasBeenSentRecently(date) {
  const now = new Date()
  const coolDownTime = new Date(date)
  coolDownTime.setMinutes(coolDownTime.getMinutes() + 5)
  return now > coolDownTime
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

passport.use('franceconnect', fcStrategy)

app.param('submissionId', w(async (req, res, next) => {
  const submission = await getSubmission(req.params.submissionId)
  if (!submission) {
    return res.sendStatus(404)
  }

  req.submission = submission
  next()
}))

app.route('/submissions')
  .post(w(async (req, res) => {
    if (!req.body.url) {
      return res.status(400).send({code: 400, message: '`url` est un champ obligatoire.'})
    }

    const submission = await createSubmission({url: req.body.url})
    res.send(submission)
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

app.route('/submissions/:submissionId/send-pin-code')
  .post(w(async (req, res) => {
    const {_id, commune, emailValidation} = req.submission

    if (req.submission.status !== 'created' || !commune.email) {
      return res.sendStatus(403)
    }

    const now = new Date()
    if (emailValidation && !hasBeenSentRecently(emailValidation.createAt)) {
      return res.status(409).send({code: 409, message: 'Un courriel a déjà été envoyé, merci de patienter.'})
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
      return res.status(400).send({code: 400, message: '`code` est un champ obligatoire.'})
    }

    if (req.submission.status !== 'created' || !req.submission.emailValidation) {
      return res.sendStatus(403)
    }

    const {code, expirationDate} = req.submission.emailValidation

    if (!validatePinCode(req.body.code, code, expirationDate)) {
      return res.status(200).send({validated: false, error: 'Code non valide ou expiré'})
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
      return res.sendStatus(403)
    }

    const submission = await updateSubmission(req.submission._id, {status: 'published'})
    res.send(submission)
  }))

app.route('/fc/callback')
  .get(
    (req, res, next) => {
      if (!req.session.submissionId) {
        return res.sendStatus(500)
      }

      req.submissionId = req.session.submissionId
      req.redirectUrl = `${process.env.ADRESSE_URL}/bases-locales/publication?submissionId=${req.submissionId}`
      req.session.submissiondId = null

      const authenticateOptions = {
        session: false,
        failureRedirect: req.redirectUrl
      }
      passport.authenticate('franceconnect', authenticateOptions)(req, res, next)
    },
    w(async (req, res) => {
      const submission = await getSubmission(req.submissionId)
      if (!submission) {
        return res.sendStatus(500)
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
