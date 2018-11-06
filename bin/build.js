#!/usr/bin/env node
const path = require('path')
const fs = require('fs-extra')
const bluebird = require('bluebird')
const chalk = require('chalk')
const {pick} = require('lodash')
const got = require('got')
const {validate, extractAsTree} = require('@etalab/bal')

const {getLicenseLabel} = require('../lib/helpers/licenses')
const {saveReport, saveData} = require('../lib/helpers/report')

const REPORT_KEYS_TO_PERSIST = [
  'knownFields',
  'unknownFields',
  'aliasedFields',
  'fileValidation',
  'rowsWithErrors',
  'parseMeta',
  'rowsErrorsCount'
]

/*
** DATASETS
*/

function isCertified(organization) {
  const {badges} = organization

  return badges.some(b => b.kind === 'certified') &&
    badges.some(b => b.kind === 'public-service')
}

function isBAL(resource) {
  return resource.format === 'csv' || resource.url.endsWith('csv')
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
  console.log(chalk.blue.bold(data.length) + ' jeux de données trouvés')
  const datasets = data.filter(dataset => {
    return dataset.resources.some(isBAL)
  })

  // Fetch dataset organization
  const organizations = await Promise.all(datasets.map(dataset => {
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
  const dir = 'db'

  // Write JSON datatset in datasets.json
  await fs.ensureDir(dir)
  await fs.writeJson(path.join(dir, 'datasets.json'), datasets)
}

/*
** DOWNLOAD
*/

function checkHeaders(headers) {
  const contentType = headers['content-type']

  if (contentType &&
    (contentType.includes('csv') || contentType.includes('application/octet-stream'))) {
    return true
  }

  return false
}

async function downloadCsv(url) {
  console.log('Téléchargement…')

  const response = await got(url, {
    encoding: null
  })

  if (checkHeaders(response.headers)) {
    return response.body
  }

  throw new Error('Le fichier n’est pas au format CSV')
}

/*
** MAIN
*/

async function main() {
  // Fetch data.gouv datasets
  const data = await getDatasets()
  console.log(chalk.green.bold(data.length) + ' jeux de données éligibles')

  // Create reports
  const datasets = await bluebird.mapSeries(data, async dataset => {
    console.log(chalk.blue(dataset.title))
    const {url} = dataset.resources.find(isBAL)
    let report = null
    let error = null
    let status = 'unknow'
    let lastUpdate
    let count

    // Download and validate dataset
    try {
      // Downloading file
      const buffer = await downloadCsv(url)
      // Analysis
      console.log('Analyse…')
      report = await validate(buffer)

      console.log('Sauvegarde…')
      await saveReport(pick(report, REPORT_KEYS_TO_PERSIST), dataset.id)
      const tree = extractAsTree(report.normalizedRows)
      lastUpdate = tree.dateMAJ
      count = tree.numerosCount
      await saveData(tree, dataset.id)

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
      description: dataset.description,
      license: dataset.license,
      licenseLabel: getLicenseLabel(dataset.license),
      valid: report && report.isValid,
      lastUpdate,
      count,
      page: dataset.page,
      organization: pick(dataset.organization, ['name', 'page', 'logo'])
    }
  })

  try {
    await saveDatasets(datasets)
    console.log(chalk.blue.bgGreen('Fin du processus'))
  } catch (error) {
    console.error(chalk.red(error))
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
