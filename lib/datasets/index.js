const {Router} = require('express')
const w = require('../util/w')
const {getDatasets, getReport, computeStats} = require('./models')

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

module.exports = app
