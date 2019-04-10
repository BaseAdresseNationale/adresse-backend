#!/usr/bin/env node
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const Keyv = require('keyv')
const morgan = require('morgan')
const wrap = require('./lib/util/wrap')
const mongo = require('./lib/util/mongo')

const fantoirDatabase = new Keyv(`sqlite://${process.env.FANTOIR_DB_PATH}`)

const app = express()

app.use(cors())

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

app.get('/fantoir/:codeCommune', wrap(async req => {
  const {codeCommune} = req.params
  const fantoirCommune = await fantoirDatabase.get(codeCommune)
  if (!fantoirCommune) {
    throw notFound('Commune non présente dans FANTOIR')
  }
  return {raw: fantoirCommune}
}))

app.use('/ban', require('./lib/ban2bal'))
app.use('/datasets', require('./lib/datasets'))
app.use('/publication', require('./lib/publication'))

function notFound(message) {
  const error = new Error(message)
  error.notFound = true
  return error
}

async function main() {
  await mongo.connect()
  await mongo.ensureIndexes()

  app.listen(process.env.PORT || 5000)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
