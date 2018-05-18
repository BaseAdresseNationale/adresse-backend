#!/usr/bin/env node
const fs = require('fs-extra')
const bluebird = require('bluebird')
const chalk = require('chalk')
const {pick} = require('lodash')
const got = require('got')

const {getLicenseLabel} = require('../lib/helpers/licenses')
const {computeReport} = require('../lib/helpers/validate')
const {checkReport, saveReport} = require('../lib/helpers/report')

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
  console.log('Récupération des données…')
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

async function saveDatasets(datasets) {
  const dir = 'db/'

  // Write JSON datatset in datasets.json
  try {
    await fs.ensureDir(dir)
    await fs.writeJson(dir + 'datasets.json', datasets)
  } catch (err) {
    console.error(chalk.red(err))
  }
}

async function main() {
  // Fetch data.gouv datasets
  const data = await getDatasets()
  console.log(chalk.green.bold(data.length) + ' jeux de données trouvés')

  // Create reports
  const datasets = await bluebird.mapSeries(data, async dataset => {
    console.log(chalk.blue(dataset.title))
    const {url} = dataset.resources.find(ressource => ressource.format === 'csv')
    let report = null
    let error = null
    let status = 'unknow'

    // Download and validate dataset
    try {
      report = await computeReport(url)
      await saveReport(report, dataset.id)
      console.log(chalk.green('Terminé !'))
      status = 'ok'
    } catch (err) {
      console.error(chalk.red(err))
      status = 'malformed'
      error = error.message
    }

    return {
      url,
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
  })

  saveDatasets(datasets)
  console.log(chalk.blue.bgGreen('Fin du processus'))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
