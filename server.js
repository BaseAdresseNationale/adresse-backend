#!/usr/bin/env
const express = require('express')
const cors = require('cors')
const {omit} = require('lodash')

const wrap = require('./lib/util/wrap')
const checkReport = require('./lib/helpers/report')

const datasets = require('./datasets.json')

const app = express()

app.use(cors())

app.get('/datasets', wrap(async () => {
  return datasets.map(data => {
    data.valid = checkReport(data.report)
    return omit(data, 'report')
  })
}))

app.get('/datasets/:id', wrap(async req => {
  const {id} = req.params
  return datasets.find(dataset => dataset.id === id)
}))

const port = process.env.PORT || 5000

async function main() {
  app.listen(port, () => {
    console.log('Start listening on port ' + port)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
