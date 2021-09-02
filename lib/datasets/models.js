const Keyv = require('@livingdata/keyv')
const {chain, sumBy} = require('lodash')

const datasetsDatabase = new Keyv(`sqlite://${process.env.DATASETS_DB_PATH}`)

function computeStats(datasets) {
  return {
    count: datasets.length,
    communesCount: chain(datasets).map(d => d.communes).flatten().uniqBy('code').value().length,
    rowsCount: sumBy(datasets, dataset => dataset.rowsCount)
  }
}

function getDatasets() {
  return datasetsDatabase.get('datasets')
}

function getReport(datasetId) {
  return datasetsDatabase.get(`${datasetId}-report`)
}

module.exports = {getDatasets, getReport, computeStats}
