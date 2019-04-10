/* eslint camelcase: off, promise/prefer-await-to-then: off */
const {groupBy} = require('lodash')
const pumpify = require('pumpify')
const csvWrite = require('csv-write-stream')
const csvParse = require('csv-parser')
const bluebird = require('bluebird')
const got = require('got')
const decompress = require('decompress')
const getStream = require('get-stream')
const through2 = require('through2')

const {getProjFn} = require('../util/crs')
const {bufferToStream} = require('../util/stream')
const {codeCommuneIsValid, getCodeDepartement, codeDepartementIsValid} = require('../cog')

function createCleInterop(codeCommune, codeVoie, numero, suffixe) {
  const parts = [
    codeCommune,
    codeVoie,
    numero.toString().padStart(5, '0')
  ]
  if (suffixe) {
    suffixe.split(' ').forEach(s => parts.push(s))
  }
  return parts.join('_').toLowerCase()
}

function convert(adresseBan, proj) {
  const codeCommune = adresseBan.code_insee
  const codeVoie = adresseBan.id_fantoir
  const numero = Number.parseInt(adresseBan.numero, 10)
  const suffixe = adresseBan.rep.toLowerCase()

  const nomVoie = adresseBan.nom_voie || adresseBan.nom_ld

  if (!nomVoie || !codeCommune || !codeVoie || !Number.isInteger(numero)) {
    return
  }

  if (numero > 5000) {
    return
  }

  const adresseBal = {
    cle_interop: createCleInterop(codeCommune, codeVoie, numero, suffixe),
    uid_adresse: '',
    voie_nom: nomVoie,
    numero: numero.toString(),
    suffixe: suffixe || '',
    commune_nom: adresseBan.nom_commune,
    position: '',
    x: '',
    y: '',
    long: '',
    lat: '',
    source: 'BAN v1',
    date_der_maj: (new Date()).toISOString().substr(0, 10)
  }

  if (adresseBan.lat && adresseBan.lon) {
    const position = [parseFloat(adresseBan.lon), parseFloat(adresseBan.lat)]
    const projectedPosition = proj(position)

    adresseBal.position = 'entrée' // Mwai...
    adresseBal.x = roundPrecision(projectedPosition[0], 2)
    adresseBal.y = roundPrecision(projectedPosition[1], 2)
    adresseBal.long = roundPrecision(position[0], 6)
    adresseBal.lat = roundPrecision(position[1], 6)
  }

  return adresseBal
}

async function downloadBanArchive(codeDepartement) {
  const url = `https://adresse.data.gouv.fr/data/BAN_licence_gratuite_repartage_${codeDepartement}.zip`
  const response = await got(url, {encoding: null})
  return response.body
}

async function getBanFile(codeDepartement) {
  const archive = await downloadBanArchive(codeDepartement)
  const files = await decompress(archive)
  const file = files.find(f => f.path.endsWith('csv')).data
  return file
}

async function extractFromDepartement(codeDepartement, codesCommunesFilter, outputStream) {
  const proj = getProjFn(codeDepartement)
  const banFile = await getBanFile(codeDepartement)
  const adresses = await getStream.array(
    pumpify.obj(
      bufferToStream(banFile),
      csvParse({separator: ';'}),
      through2.obj((adresseBan, enc, cb) => {
        if (codesCommunesFilter && !codesCommunesFilter.includes(adresseBan.code_insee)) {
          return cb()
        }
        const adresseBal = convert(adresseBan, proj)
        if (!adresseBal) {
          return cb()
        }
        cb(null, adresseBal)
      })
    )
  )
  adresses.forEach(a => outputStream.write(a))
}

function createDepartementExtraction(codeDepartement) {
  if (!codeDepartement || !codeDepartementIsValid(codeDepartement)) {
    throw new Error('Un code département valide doit être fourni.')
  }
  const csvStream = csvWrite({
    separator: ';',
    newline: '\r\n'
  })
  extractFromDepartement(codeDepartement, null, csvStream)
    .then(() => csvStream.end()).catch(error => csvStream.destroy(error))
  return csvStream
}

function createCommunesExtraction(codesCommunes) {
  if (codesCommunes.length === 0) {
    throw new Error('Au moins un code commune doit être fourni.')
  }
  const notValidCodesCommunes = codesCommunes.filter(c => !codeCommuneIsValid(c))
  if (notValidCodesCommunes.length > 0) {
    throw new Error('Certains codes communes ne sont pas valides : ' + notValidCodesCommunes.join(', '))
  }
  const csvStream = csvWrite({
    separator: ';',
    newline: '\r\n'
  })
  const groupedCodesCommunes = groupBy(codesCommunes, getCodeDepartement)
  bluebird.mapSeries(Object.keys(groupedCodesCommunes), async codeDepartement => {
    const codesCommunesInDep = groupedCodesCommunes[codeDepartement]
    return extractFromDepartement(codeDepartement, codesCommunesInDep, csvStream)
  }).then(() => csvStream.end()).catch(error => csvStream.destroy(error))
  return csvStream
}

function roundPrecision(value, precision) {
  return parseFloat(value.toFixed(precision))
}

module.exports = {convert, createCommunesExtraction, createDepartementExtraction, roundPrecision}
