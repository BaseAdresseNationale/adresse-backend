#!/usr/bin/env node
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const mongo = require('./lib/util/mongo')
const HttpProxy = require('http-proxy')

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://backend.adresse.data.gouv.fr'

const proxy = new HttpProxy()

const app = express()

app.use(cors())

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

async function main() {
  await mongo.connect()
  await mongo.ensureIndexes()

  app.use('/datasets', require('./lib/datasets'))
  app.use('/publication', require('./lib/publication'))
  app.use('/backend', (req, res) => {
    proxy.web(req, res, { target: BACKEND_API_URL, changeOrigin: true})
  })

  app.listen(process.env.PORT || 5000)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
