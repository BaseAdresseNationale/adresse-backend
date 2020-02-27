#!/usr/bin/env node
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const Keyv = require('keyv')
const morgan = require('morgan')
const w = require('./lib/util/w')
const mongo = require('./lib/util/mongo')

const fantoirDatabase = new Keyv(`sqlite://${process.env.FANTOIR_DB_PATH}`)

const app = express()

app.use(cors())

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

app.get('/fantoir/:codeCommune', w(async (req, res) => {
  const {codeCommune} = req.params
  const fantoirCommune = await fantoirDatabase.get(codeCommune)
  if (!fantoirCommune) {
    return res.status(404).send({code: 404, message: 'Commune non présente dans FANTOIR'})
  }

  res.send({raw: fantoirCommune})
}))

app.use('/ban', require('./lib/ban2bal'))
app.use('/datasets', require('./lib/datasets'))
app.use('/publication', require('./lib/publication'))

async function main() {
  await mongo.connect()
  await mongo.ensureIndexes()

  app.listen(process.env.PORT || 5000)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
