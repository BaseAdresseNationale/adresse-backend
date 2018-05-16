#!/usr/bin/env node
const {promisify} = require('util')
const writeFile = promisify(require('fs').writeFile)
const {pick} = require('lodash')
const got = require('got')

const {getLicenseLabel} = require('../lib/helpers/licenses')
const {isValid} = require('../lib/helpers/validate')
const {checkReport} = require('../lib/helpers/report')

async function getDatasets() {
  const response = await got('https://www.data.gouv.fr/api/1/datasets/?tag=base-adresse-locale', {json: true})
  return response.body.data
}

async function main() {
  // Fetch data.gouv datasets
  const data = await getDatasets()

  // Filter only data with csv
  const csvDatasets = data.filter(dataset => dataset.resources.some(resource => resource.format === 'csv'))

  // ForEach => validate
  const datasets = await Promise.all(csvDatasets.map(async dataset => {
    const {url} = dataset.resources.find(ressource => ressource.format === 'csv')
    let report = null
    let error = null
    let status = 'unknow'

    try {
      report = await isValid(url)
      status = 'ok'
    } catch (err) {
      status = 'malformed'
      error = error.message
    }

    return {
      url,
      report,
      status,
      error,
      id: dataset.id,
      title: dataset.title,
      license: dataset.license,
      licenseLabel: getLicenseLabel(dataset.license),
      valid: checkReport(report),
      page: dataset.page,
      organization: pick(dataset.organization, ['name', 'page', 'logo'])
    }
  }))

  // Write JSON result file /datasets.json
  const json = JSON.stringify(datasets)
  await writeFile('datasets.json', json)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
