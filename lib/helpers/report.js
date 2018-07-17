const fs = require('fs-extra')

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

module.exports = {saveReport, saveData}
