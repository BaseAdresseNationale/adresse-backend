const path = require('path')
const express = require('express')
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

app.get('/datasets', (req, res) => {
  res.send(datasets)
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
