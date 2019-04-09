const {promisify} = require('util')
const zlib = require('zlib')
const {Router} = require('express')
const {json} = require('express')
const session = require('express-session')
const passport = require('passport')
const got = require('got')
const {uniq, keyBy, pick} = require('lodash')
const emailValidator = require('email-validator')
const {validate} = require('@etalab/bal')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
const mongo = require('../util/mongo')
const fcStrategy = require('./franceconnect-strategy')
const {findElu} = require('./rne')

const gzip = promisify(zlib.gzip)
const communesIndex = keyBy(communes.filter(c => c.type === 'commune-actuelle'), 'code')

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

function getSubmission(submissionId) {
  return mongo.db.collection('submissions').findOne({
    _id: mongo.parseObjectID(submissionId)
  }, {projection: {data: 0}})
}

async function updateSubmission(submissionId, changes) {
  const {value} = await mongo.db.collection('submissions').findOneAndUpdate(
    {_id: mongo.parseObjectID(submissionId)},
    {$set: {...changes, _updated: new Date()}},
    {returnOriginal: false, projection: {data: 0}}
  )
  return value
}

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

    const response = await got(req.body.url, {encoding: null})
    const data = response.body
    const report = await validate(data)

    if (!report.isValid) {
      return res.sendStatus(400)
    }

    const communes = uniq(report.normalizedRows.map(r => r.codeCommune))

    if (communes.length !== 1) {
      return res.sendStatus(400)
    }

    const now = new Date()
    const _id = new mongo.ObjectID()

    const submission = {
      _id,
      url: req.body.url,
      status: 'created',
      commune: pick(communesIndex[communes[0]], 'code', 'nom'),
      authenticationUrl: `${process.env.BACKEND_API_URL}/publication/submissions/${_id}/authenticate`,
      data: await gzip(data),
      _created: now,
      _updated: now
    }

    await mongo.db.collection('submissions').insertOne(submission)
    submission.data = undefined

    res.send(submission)
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
