const {callbackify} = require('util')
const path = require('path')
const express = require('express')
const cors = require('cors')
const {omit} = require('lodash')
const contentDisposition = require('content-disposition')

const {expandCommune, expandCommunes} = require('./lib/expand-communes')
const {createExtraction} = require('./lib/ban')
const {loadDataset} = require('./lib/db')
const {sortByNumero} = require('./lib/helpers/sort')

const datasets = require('./db/datasets.json')

function wrap(handler) {
  handler = callbackify(handler)
  return (req, res) => {
    handler(req, res, (err, result) => {
      if (err) {
        res.status(500).send({code: 500, message: err.message})
      } else if (result) {
        res.send(result)
      }
    })
  }
}

const app = express()

app.use(cors())

app.param('id', (req, res, next, id) => {
  req.dataset = datasets.find(d => d.id === id)
  if (!req.dataset) {
    return res.sendStatus(404)
  }
  next()
})

app.get('/ban/extract', wrap(async (req, res) => {
  if (!req.query.communes) {
    res.sendStatus(400)
    return
  }
  const codesCommunes = req.query.communes.split(',')
  const extraction = await createExtraction(codesCommunes)
  const date = (new Date()).toISOString().substr(0, 10).replace(/-/g, '')
  res.set('Content-Disposition', contentDisposition(`${date}_bal_xxxxxxxxx.csv`))
  res.set('Content-Type', 'text/csv')
  extraction.pipe(res)
}))

app.get('/datasets', (req, res) => {
  res.send(datasets)
})

app.get('/datasets/:id', (req, res) => {
  res.send(req.dataset)
})

app.get('/datasets/:id/report', (req, res) => {
  res.sendFile(path.join(__dirname, 'db', 'reports', req.dataset.id + '.json'))
})

app.get('/datasets/:id/data/summary', wrap(async req => {
  const dataset = await loadDataset(req.dataset.id)
  return {
    ...dataset,
    communes: await expandCommunes(
      Object.values(dataset.communes).map(c => omit(c, 'voies'))
    )
  }
}))

app.get('/datasets/:id/data/:codeCommune', wrap(async req => {
  const dataset = await loadDataset(req.dataset.id)
  const commune = await expandCommune(dataset.communes[req.params.codeCommune])
  return {...commune, voies: Object.values(commune.voies).map(v => omit(v, 'numeros'))}
}))

app.get('/datasets/:id/data/:codeCommune/:codeVoie', wrap(async req => {
  const dataset = await loadDataset(req.dataset.id)
  const voie = dataset.communes[req.params.codeCommune].voies[req.params.codeVoie]
  return {...voie, numeros: sortByNumero(Object.values(voie.numeros))}
}))

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log('Start listening on port ' + port)
})
