const {join} = require('path')
const {readFile} = require('fs-extra')

async function loadDataset(datasetId) {
  const content = await readFile(join(__dirname, '..', 'db', 'data', datasetId + '.json'), 'utf8')
  return JSON.parse(content)
}

module.exports = {loadDataset}
