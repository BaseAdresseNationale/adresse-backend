const {Router} = require('express')
const {json} = require('express')
const session = require('express-session')
const passport = require('passport')
const emailValidator = require('email-validator')
const mongo = require('../util/mongo')
const fcStrategy = require('./franceconnect-strategy')
const {findElu} = require('./rne')
const {getSubmission, updateSubmission, createSubmission} = require('./models')

const app = new Router()

function w(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}

app.use(json())
app.use(session({secret: process.env.SESSION_SECRET || 'foobar', saveUninitialized: false, resave: false}))
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
      return res.sendStatus(400)
    }

    const submission = await createSubmission({url: req.body.url})
    res.send(submission)
  }))

app.route('/submissions/published')
  .get(w(async (req, res) => {
    const projection = {url: 1, commune: 1, _created: 1, _updated: 1}
    const submissions = await mongo.db.collection('submissions').find({status: 'published'}, {projection}).toArray()
    res.send(submissions)
  }))

app.route('/submissions/:submissionId')
  .get((req, res) => {
    res.send(req.submission)
  })
  .put(w(async (req, res) => {
    const changes = {}
    if (req.body.email) {
      if (emailValidator.validate(req.body.email)) {
        changes.email = req.body.email
      } else {
        return res.sendStatus(400)
      }
    }

    if (Object.keys(changes).length === 0) {
      return res.send(req.submission)
    }

    const submission = await updateSubmission(req.submission._id, changes)
    res.send(submission)
  }))

app.route('/submissions/:submissionId/authenticate')
  .get((req, res, next) => {
    req.session.submissionId = req.submission._id
    passport.authenticate('franceconnect')(req, res, next)
  })

app.route('/submissions/:submissionId/publish')
  .post(w(async (req, res) => {
    if (req.submission.status !== 'pending' || !req.submission.email || !req.submission.authentication) {
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

      const elu = findElu(req.user)

      if (!elu || elu.codeCommune !== submission.commune.code) {
        await updateSubmission(req.submissionId, {
          authenticationError: 'Aucun mandat valide trouvé pour cette commune.'
        })
        return res.redirect(req.redirectUrl)
      }

      await updateSubmission(req.submissionId, {
        status: 'pending',
        authenticationUrl: null,
        authenticationError: null,
        authentication: elu
      })

      res.redirect(req.redirectUrl)
    })
  )

module.exports = app
