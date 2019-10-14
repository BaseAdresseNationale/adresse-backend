const {Router} = require('express')
const {json} = require('express')
const session = require('express-session')
const passport = require('passport')
const emailValidator = require('email-validator')
const w = require('../util/w')
const fcStrategy = require('./franceconnect-strategy')
const {findConseillerMunicipal} = require('./rne')
const {findAdmin} = require('./admins')
const {getSubmission, updateSubmission, createSubmission, getPublishedSubmissions} = require('./models')

const app = new Router()

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
  .put(w(async (req, res) => {
    if (req.submission.status === 'published') {
      return res.sendStatus(403)
    }

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

      const mandat = findAdmin(req.user) || findConseillerMunicipal(req.user, submission.commune.code)

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

module.exports = app
