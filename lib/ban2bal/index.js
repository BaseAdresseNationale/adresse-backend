const {Router} = require('express')
const contentDisposition = require('content-disposition')
const wrap = require('../util/wrap')
const {createCommunesExtraction, createDepartementExtraction} = require('./extract')

const app = new Router()

function setExtractionHeaders(res) {
  const date = (new Date()).toISOString().substr(0, 10).replace(/-/g, '')
  res.set('Content-Disposition', contentDisposition(`${date}_bal_xxxxxxxxx.csv`))
  res.set('Content-Type', 'text/csv')
}

app.get('/extract', wrap(async (req, res) => {
  if (!req.query.communes && !req.query.departement) {
    res.sendStatus(400)
    return
  }
  const communes = req.query.communes ? req.query.communes.split(',') : null
  const {departement} = req.query
  if (communes) {
    const extraction = await createCommunesExtraction(communes)
    setExtractionHeaders(res)
    return extraction
  }
  const extraction = await createDepartementExtraction(departement)
  setExtractionHeaders(res)
  return extraction
}))

module.exports = app
