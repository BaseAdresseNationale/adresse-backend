const express = require('express')
const cors = require('cors')
const {omit} = require('lodash')

const wrap = require('./lib/util/wrap')

const datasets = require('./datasets.json')

const app = express()

app.use(cors())

app.get('/datasets', wrap(async () => {
  return datasets.map(dataset => {
    return omit(dataset, 'report')
  })
}))

app.get('/datasets/:id', wrap(async req => {
  const {id} = req.params
  return datasets.find(dataset => dataset.id === id)
}))

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log('Start listening on port ' + port)
})
