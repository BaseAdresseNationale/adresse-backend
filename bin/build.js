#!/usr/bin/env node
const fs = require('fs')
const got = require('got')

const getLicenseLabel = require('../lib/helpers/licenses')
const filterCsvResource = require('../lib/helpers/filters')
const validate = require('../lib/helpers/validate')

async function main() {
  // Fetch data.gouv datasets
  const response = await got('https://www.data.gouv.fr/api/1/datasets/?page_size=20&tag=base-adresse-locale', {json: true})
  const {data} = response.body

  // Filter only data with csv
  const filtered = filterCsvResource(data)

  // ForEach => validate
  const items = await Promise.all(filtered.map(async item => {
    return {
      id: item.id,
      title: item.title,
      license: getLicenseLabel(item.license),
      report: await validate(item.resources),
      page: item.page,
      organization: {
        name: item.organization.name,
        page: item.organization.page,
        logo: item.organization.logo
      }
    }
  }))

  // Write JSON result file /datasets.json
  const json = JSON.stringify(items)
  await fs.writeFile('datasets.json', json)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
