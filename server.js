#!/usr/bin/env node
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const app = express()

app.use(cors({origin: true}))

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

async function main() {
  app.use('/datasets', require('./lib/datasets'))

  app.listen(process.env.PORT || 5000)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
