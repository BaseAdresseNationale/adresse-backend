const {pick, keyBy, omit, uniq} = require('lodash')
const got = require('got')
const createError = require('http-errors')
const {validate} = require('@etalab/bal')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
const mongo = require('../util/mongo')
const {notifyPublication} = require('../util/slack')

const communesIndex = keyBy(communes.filter(c => c.type === 'commune-actuelle'), 'code')

const API_ETABLISSEMENTS_PUBLICS = process.env.API_ETABLISSEMENTS_PUBLICS || 'https://etablissements-publics.api.gouv.fr/v3'

const getCommuneEmail = async function (codeCommune) {
  try {
    const response = await got(`${API_ETABLISSEMENTS_PUBLICS}/communes/${codeCommune}/mairie`, {responseType: 'json'})
    const mairie = response.body.features[0]
    return mairie.properties.email
  } catch (error) {
    console.log(`Une erreur s’est produite lors de la récupération de l’adresse email de la mairie : ${error}`)
  }
}

async function createSubmission({url, file}) {
  const submission = {url}
  let data = file

  if (url) {
    const response = await got(url, {responseType: 'buffer'})
    data = response.body
  }

  const {parseOk, rows, profilesValidation} = await validate(data)

  if (!parseOk) {
    throw createError(400, 'Fichier CSV contenant des erreurs')
  }

  if (!profilesValidation['1.2-etalab'].isValid) {
    throw createError(400, 'Fichier BAL contenant des erreurs')
  }

  const communes = uniq(rows.map(r => r.parsedValues.commune_insee || r.additionalValues.cle_interop.codeCommune))

  if (communes.length !== 1) {
    throw createError(400, 'Fichier BAL vide ou contenant plusieurs communes')
  }

  const now = new Date()
  const _id = new mongo.ObjectID()
  const commune = pick(communesIndex[communes[0]], 'code', 'nom')
  commune.email = await getCommuneEmail(commune.code)

  Object.assign(submission, {
    _id,
    url,
    data,
    commune,
    status: 'created',
    authenticationUrl: `${process.env.BACKEND_API_URL}/publication/submissions/${_id}/authenticate`,
    _created: now,
    _updated: now
  })

  await mongo.db.collection('submissions').insertOne(submission)

  return omit(submission, 'data')
}

function getSubmission(submissionId) {
  return mongo.db.collection('submissions').findOne({
    _id: mongo.parseObjectID(submissionId)
  }, {data: 0})
}

async function updateSubmission(submissionId, changes) {
  const {value} = await mongo.db.collection('submissions').findOneAndUpdate(
    {_id: mongo.parseObjectID(submissionId)},
    {$set: {...changes, _updated: new Date()}},
    {returnOriginal: false, projection: {data: 0}}
  )
  return value
}

async function getPublishedSubmission(codeCommune) {
  return mongo.db.collection('submissions').findOne({
    'commune.code': codeCommune,
    status: 'published'
  }, {data: 0})
}

async function publishSubmission(submission) {
  const actualSubmission = await getPublishedSubmission(submission.commune.code)

  if (actualSubmission) {
    await updateSubmission(actualSubmission._id, {
      status: 'replaced',
      _replaced: new Date()
    })
  }

  const updatedSubmission = await updateSubmission(submission._id, {
    status: 'published',
    _published: new Date()
  })

  await notifyPublication({
    commune: submission.commune,
    operation: actualSubmission ? 'update' : 'create',
    method: submission.emailValidation && submission.emailValidation.validatedAt ? 'email' : 'franceconnect'
  })

  return updatedSubmission
}

function getPublishedSubmissions() {
  const projection = {url: 1, commune: 1, _created: 1, _updated: 1}
  return mongo.db.collection('submissions').find({status: 'published'}, {projection}).toArray()
}

function getPublishedSubmissionsUrls() {
  return mongo.db.collection('submissions').distinct('url', {status: 'published', url: {$ne: null}})
}

module.exports = {publishSubmission, getSubmission, updateSubmission, createSubmission, getPublishedSubmissions, getPublishedSubmissionsUrls}
