const {Router} = require('express')
const {sampleSize, omit} = require('lodash')
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
  if (req.query.sample) {
    const parsedValue = Number.parseInt(req.query.sample, 10)
    if (Number.isNaN(parsedValue || parsedValue <= 0)) {
      return res.sendStatus(400)
    }
  }

  const datasets = req.query.sample ?
    sampleSize(req.datasets, Number.parseInt(req.query.sample, 10)) :
    req.datasets

  res.send(
    req.query.noContour === '1' ?
      datasets.map(d => omit(d, 'contour')) :
      datasets
  )
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
