require('dotenv').config()
const {callbackify} = require('util')
const path = require('path')
const express = require('express')
const cors = require('cors')
const {omit} = require('lodash')
const contentDisposition = require('content-disposition')
const Keyv = require('keyv')

const {expandCommune, expandCommunes} = require('./lib/expand-communes')
const {createExtraction} = require('./lib/ban')
const {loadDataset} = require('./lib/db')
const {sortByNumero} = require('./lib/helpers/sort')

const datasets = require('./db/datasets.json')

const fantoirDatabase = new Keyv(`sqlite://${process.env.FANTOIR_DB_PATH}`)

function wrap(handler) {
  handler = callbackify(handler)
  return (req, res) => {
    handler(req, res, (err, result) => {
      if (err && err.notFound) {
        res.status(404).send({code: 404, message: err.message})
      } else if (err) {
        res.status(500).send({code: 500, message: err.message})
      } else if (result) {
        res.send(result)
      }
    })
  }
}

const app = express()

app.use(cors())

app.param('datasetId', (req, res, next, id) => {
  req.dataset = datasets.find(d => d.id === id)
  if (!req.dataset) {
    return res.sendStatus(404)
  }
  next()
})

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

app.get('/datasets', (req, res) => {
  res.send(datasets)
})

app.get('/datasets/:datasetId', (req, res) => {
  res.send(req.dataset)
})

app.get('/datasets/:datasetId/report', (req, res) => {
  res.sendFile(path.join(__dirname, 'db', 'reports', req.dataset.id + '.json'))
})

app.get('/datasets/:datasetId/data/summary', wrap(async req => {
  const dataset = await loadDataset(req.dataset.id)
  return {
    ...dataset,
    communes: await expandCommunes(
      Object.values(dataset.communes).map(c => omit(c, 'voies'))
    )
  }
}))

app.get('/datasets/:datasetId/data/:codeCommune', wrap(async req => {
  const dataset = await loadDataset(req.dataset.id)
  const commune = await expandCommune(dataset.communes[req.params.codeCommune])
  return {...commune, voies: Object.values(commune.voies).map(v => omit(v, 'numeros'))}
}))

app.get('/datasets/:datasetId/data/:codeCommune/:codeVoie', wrap(async req => {
  const dataset = await loadDataset(req.dataset.id)
  const voie = dataset.communes[req.params.codeCommune].voies[req.params.codeVoie]
  if (voie.numeros) {
    return {...voie, numeros: sortByNumero(Object.values(voie.numeros))}
  }
  return voie
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
