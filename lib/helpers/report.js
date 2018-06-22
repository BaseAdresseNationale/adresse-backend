const fs = require('fs-extra')

const fieldToFind = [
  'cle_interop',
  'uid_adresse',
  'voie_nom',
  'numero',
  'suffixe',
  'commune_nom',
  'position',
  'x',
  'y',
  'long',
  'lat',
  'source',
  'date_der_maj'
]

async function saveReport(report, datasetId) {
  const dir = 'db/reports/'

  try {
    await fs.ensureDir(dir)
    await fs.writeJson(dir + `${datasetId}.json`, report)
  } catch (err) {
    throw new Error(`${datasetId} n’a pas pu être sauvegardé : ${err}`)
  }
}

async function saveData(data, datasetId) {
  const dir = 'db/data/'

  try {
    await fs.ensureDir(dir)
    await fs.writeJson(dir + `${datasetId}.json`, data)
  } catch (err) {
    throw new Error(`Les données contenues dans ${datasetId} n’ont pas pu être sauvegardée : ${err}`)
  }
}

function checkFileValidation(fileValidation) {
  const {encoding, delimiter, linebreak} = fileValidation
  return encoding.isValid && delimiter.isValid && linebreak.isValid
}

function checkKnownFields(fields) {
  for (const i in fields) {
    if (!fieldToFind.includes(fields[i])) {
      return false
    }
  }

  return true
}

function checkReport(report) {
  const {knownFields, fileValidation, rowsErrorsCount} = report

  const fields = checkKnownFields(knownFields)
  const fileValidations = checkFileValidation(fileValidation)

  return fields && fileValidations && rowsErrorsCount === 0
}

module.exports = {checkReport, saveReport, saveData}
