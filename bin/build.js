#!/usr/bin/env node
const {promisify} = require('util')
const writeFile = promisify(require('fs').writeFile)
const {pick} = require('lodash')
const got = require('got')

const {getLicenseLabel} = require('../lib/helpers/licenses')
const {isValid} = require('../lib/helpers/validate')
const {checkReport} = require('../lib/helpers/report')

function isCertified(organization) {
  const {badges} = organization

  return badges.some(b => b.kind === 'certified') &&
    badges.some(b => b.kind === 'public-service')
}

async function getOrganization(organization) {
  const {id} = organization
  const response = await got(`https://www.data.gouv.fr/api/1/organizations/${id}/`, {json: true})

  return response.body
}

async function getDatasets() {
  const response = await got('https://www.data.gouv.fr/api/1/datasets/?tag=base-adresse-locale', {json: true})
  const {data} = response.body

  // Filter only data with csv
  const datasets = data.filter(dataset => {
    return dataset.resources.some(resource => resource.format === 'csv')
  })

  // Fetch dataset organization
  const organizations = await Promise.all(datasets.map(async dataset => {
    return getOrganization(dataset.organization)
  }))

  // Filter certified datasets with certified organization
  const certifiedDataset = datasets.filter(dataset => {
    const organization = organizations.find(organization => organization.id === dataset.organization.id)
    return isCertified(organization)
  })

  return certifiedDataset
}

async function main() {
  // Fetch data.gouv datasets
  const data = await getDatasets()

  // ForEach => validate
  const datasets = await Promise.all(data.map(async dataset => {
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
      valid: report && checkReport(report),
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
