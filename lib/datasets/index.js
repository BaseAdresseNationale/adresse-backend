const {Router} = require('express')
const w = require('../util/w')
const {getDatasets, getReport, getSummary, getCommune, getVoie, computeStats} = require('./models')

const app = new Router()

app.use(w(async (req, res, next) => {
  req.datasets = await getDatasets()
  next()
}))

app.param('datasetId', (req, res, next, id) => {
  req.dataset = req.datasets.find(d => d.id === id)
  if (!req.dataset) {
    return res.sendStatus(404)
  }
  next()
})

app.get('/', (req, res) => {
  res.send(req.datasets)
})

app.get('/stats', (req, res) => {
  res.send(computeStats(req.datasets))
})

app.get('/:datasetId', (req, res) => {
  res.send(req.dataset)
})

app.get('/:datasetId/report', w(async (req, res) => {
  const report = await getReport(req.dataset.id)
  res.send(report)
}))

app.get('/:datasetId/data/summary', w(async (req, res) => {
  const summary = await getSummary(req.dataset.id)
  res.send(summary)
}))

app.get('/:datasetId/data/:codeCommune', w(async (req, res) => {
  const commune = await getCommune(req.dataset.id, req.params.codeCommune)
  res.send(commune)
}))

app.get('/:datasetId/data/:codeCommune/:codeVoie', w(async (req, res) => {
  const voie = await getVoie(req.dataset.id, req.params.codeCommune, req.params.codeVoie)
  res.send(voie)
}))

module.exports = app
