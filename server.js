const path = require('path')
const express = require('express')
const cors = require('cors')

const datasets = require('./db/datasets.json')

const app = express()

app.use(cors())

app.get('/datasets', (req, res) => {
  res.send(datasets)
})

app.get('/datasets/:id', (req, res) => {
  const {id} = req.params
  res.send(datasets.find(dataset => dataset.id === id))
})

app.get('/datasets/:id/report', (req, res) => {
  const {id} = req.params
  const dataset = datasets.find(dataset => dataset.id === id)
  const fileName = path.join(__dirname, 'db', 'reports', `${dataset.id}.json`)

  res.sendFile(fileName)
})

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log('Start listening on port ' + port)
})
