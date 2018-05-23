const path = require('path')
const express = require('express')
const paginate = require('express-paginate')
const cors = require('cors')

const datasets = require('./db/datasets.json')

const app = express()

app.use(cors())

app.param('id', (req, res, next, id) => {
  req.dataset = datasets.find(d => d.id === id)
  if (!req.dataset) {
    return res.sendStatus(404)
  }
  next()
})

app.get('/datasets', paginate.middleware(10, 50), (req, res) => {
  const results = [...datasets]
  const itemCount = results.length
  const pageCount = Math.ceil(itemCount / req.query.limit)
  const datasetsArrays = []

  while (results.length > 0) {
    datasetsArrays.push(results.splice(0, req.query.limit))
  }

  res.send({
    datasets: datasetsArrays[req.query.page - 1],
    pageCount,
    itemCount,
    pages: paginate.getArrayPages(req)(5, pageCount, req.query.page)
  })
})

app.get('/datasets/:id', (req, res) => {
  res.send(req.dataset)
})

app.get('/datasets/:id/report', (req, res) => {
  res.sendFile(path.join(__dirname, 'db', 'reports', req.dataset.id + '.json'))
})

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log('Start listening on port ' + port)
})
