const {Router} = require('express')
const wrap = require('../util/wrap')
const {getDatasets, getReport, getSummary, getCommune, getVoie, computeStats} = require('./models')

const app = new Router()

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

app.get('/', (req, res) => {
  res.send(req.datasets)
})

app.get('/stats', (req, res) => {
  res.send(computeStats(req.datasets))
})

app.get('/:datasetId', (req, res) => {
  res.send(req.dataset)
})

app.get('/:datasetId/report', wrap(req => {
  return getReport(req.dataset.id)
}))

app.get('/:datasetId/data/summary', wrap(req => {
  return getSummary(req.dataset.id)
}))

app.get('/:datasetId/data/:codeCommune', wrap(req => {
  return getCommune(req.dataset.id, req.params.codeCommune)
}))

app.get('/:datasetId/data/:codeCommune/:codeVoie', wrap(req => {
  return getVoie(req.dataset.id, req.params.codeCommune, req.params.codeVoie)
}))

module.exports = app
