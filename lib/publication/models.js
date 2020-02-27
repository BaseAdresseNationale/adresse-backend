
const {promisify} = require('util')
const zlib = require('zlib')
const {pick, keyBy, uniq} = require('lodash')
const got = require('got')
const {validate} = require('@etalab/bal')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
const mongo = require('../util/mongo')

const gzip = promisify(zlib.gzip)
const communesIndex = keyBy(communes.filter(c => c.type === 'commune-actuelle'), 'code')

async function createSubmission({url}) {
  const submission = {url}

  const response = await got(url, {responseType: 'buffer'})
  const data = response.body
  const report = await validate(data)

  if (report.hasErrors) {
    throw new Error('Fichier BAL contenant des erreurs')
  }

  const communes = uniq(report.normalizedRows.map(r => r.codeCommune))

  if (communes.length !== 1) {
    throw new Error('Fichier BAL vide ou contenant plusieurs communes')
  }

  const now = new Date()
  const _id = new mongo.ObjectID()

  Object.assign(submission, {
    _id,
    url,
    status: 'created',
    commune: pick(communesIndex[communes[0]], 'code', 'nom'),
    authenticationUrl: `${process.env.BACKEND_API_URL}/publication/submissions/${_id}/authenticate`,
    data: await gzip(data),
    _created: now,
    _updated: now
  })

  await mongo.db.collection('submissions').insertOne(submission)
  submission.data = undefined

  return submission
}

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

function getPublishedSubmissions() {
  const projection = {url: 1, commune: 1, _created: 1, _updated: 1}
  return mongo.db.collection('submissions').find({status: 'published'}, {projection}).toArray()
}

module.exports = {getSubmission, updateSubmission, createSubmission, getPublishedSubmissions}
