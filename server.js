#!/usr/bin/env node
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const contentDisposition = require('content-disposition')
const Keyv = require('keyv')
const morgan = require('morgan')
const wrap = require('./lib/util/wrap')
const mongo = require('./lib/util/mongo')
const {createCommunesExtraction, createDepartementExtraction} = require('./lib/ban/extract')
const {getDatasets, getReport, getSummary, getCommune, getVoie, computeStats} = require('./lib/datasets')

const fantoirDatabase = new Keyv(`sqlite://${process.env.FANTOIR_DB_PATH}`)

const app = express()

app.use(cors())

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

function setExtractionHeaders(res) {
  const date = (new Date()).toISOString().substr(0, 10).replace(/-/g, '')
  res.set('Content-Disposition', contentDisposition(`${date}_bal_xxxxxxxxx.csv`))
  res.set('Content-Type', 'text/csv')
}

app.get('/ban/extract', wrap(async (req, res) => {
  if (!req.query.communes && !req.query.departement) {
    res.sendStatus(400)
    return
  }
  const communes = req.query.communes ? req.query.communes.split(',') : null
  const {departement} = req.query
  if (communes) {
    const extraction = await createCommunesExtraction(communes)
    setExtractionHeaders(res)
    return extraction
  }
  const extraction = await createDepartementExtraction(departement)
  setExtractionHeaders(res)
  return extraction
}))

app.use('/datasets', wrap(async req => {
  req.datasets = await getDatasets()
}))

app.param('datasetId', (req, res, next, id) => {
  req.dataset = req.datasets.find(d => d.id === id)
  if (!req.dataset) {
    return res.sendStatus(404)
  }
  next()
})

app.get('/datasets', (req, res) => {
  res.send(req.datasets)
})

app.get('/datasets/stats', (req, res) => {
  res.send(computeStats(req.datasets))
})

app.get('/datasets/:datasetId', (req, res) => {
  res.send(req.dataset)
})

app.get('/datasets/:datasetId/report', wrap(req => {
  return getReport(req.dataset.id)
}))

app.get('/datasets/:datasetId/data/summary', wrap(req => {
  return getSummary(req.dataset.id)
}))

app.get('/datasets/:datasetId/data/:codeCommune', wrap(req => {
  return getCommune(req.dataset.id, req.params.codeCommune)
}))

app.get('/datasets/:datasetId/data/:codeCommune/:codeVoie', wrap(req => {
  return getVoie(req.dataset.id, req.params.codeCommune, req.params.codeVoie)
}))

app.get('/fantoir/:codeCommune', wrap(async req => {
  const {codeCommune} = req.params
  const fantoirCommune = await fantoirDatabase.get(codeCommune)
  if (!fantoirCommune) {
    throw notFound('Commune non présente dans FANTOIR')
  }
  return {raw: fantoirCommune}
}))

app.use('/publication', require('./lib/publication'))

function notFound(message) {
  const error = new Error(message)
  error.notFound = true
  return error
}

async function main() {
  await mongo.connect()
  await mongo.ensureIndexes()

  app.listen(process.env.PORT || 5000)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
