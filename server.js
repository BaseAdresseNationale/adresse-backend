require('dotenv').config()
const {callbackify} = require('util')
const express = require('express')
const cors = require('cors')
const contentDisposition = require('content-disposition')
const Keyv = require('keyv')
const {createExtraction} = require('./lib/ban')
const {getDatasets, getReport, getSummary, getCommune, getVoie} = require('./lib/datasets')

const fantoirDatabase = new Keyv(`sqlite://${process.env.FANTOIR_DB_PATH}`)

function wrap(handler) {
  handler = callbackify(handler)
  return (req, res, next) => {
    handler(req, res, next, (err, result) => {
      if (err && err.notFound) {
        res.status(404).send({code: 404, message: err.message})
      } else if (err) {
        res.status(500).send({code: 500, message: err.message})
      } else if (result) {
        res.send(result)
      } else {
        next()
      }
    })
  }
}

const app = express()

app.use(cors())

app.get('/ban/extract', wrap(async (req, res) => {
  if (!req.query.communes) {
    res.sendStatus(400)
    return
  }
  const codesCommunes = req.query.communes.split(',')
  const extraction = await createExtraction(codesCommunes)
  const date = (new Date()).toISOString().substr(0, 10).replace(/-/g, '')
  res.set('Content-Disposition', contentDisposition(`${date}_bal_xxxxxxxxx.csv`))
  res.set('Content-Type', 'text/csv')
  extraction.pipe(res)
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

function notFound(message) {
  const error = new Error(message)
  error.notFound = true
  return error
}

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log('Start listening on port ' + port)
})
