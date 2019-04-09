#!/usr/bin/env node
const {outputJson} = require('fs-extra')
const csvParse = require('csv-parser')
const getStream = require('get-stream').array
const {decodeStream} = require('iconv-lite')
const {omit} = require('lodash')
const got = require('got')

const models = {
  elu: require('./elu'),
  mandat: require('./mandats/common'),
  cm: require('./mandats/cm')
}

async function loadMandats(url, codeMandat, registry) {
  const rows = await getStream(
    got.stream(url, {encoding: null})
      .pipe(decodeStream('latin1'))
      .pipe(csvParse({
        separator: '\t',
        skipLines: 1,
        mapHeaders: ({header}) => {
          const headersMapping = {
            ...models.elu.headersMapping,
            ...models.mandat.headersMapping,
            ...models[codeMandat].headersMapping
          }
          if (!(header in headersMapping)) {
            return false
          }

          return headersMapping[header]
        }
      }))
  )

  rows.forEach(row => {
    const elu = models.elu.prepare(row)
    const mandat = {
      ...models.mandat.prepare(row),
      ...models[codeMandat].prepare(row)
    }

    if (!elu) {
      return
    }

    if (!(elu.id in registry)) {
      registry[elu.id] = {
        ...omit(elu, 'id'),
        mandats: []
      }
    }

    registry[elu.id].mandats.push(mandat)
  })
}

async function main() {
  const registry = {}
  await loadMandats('https://static.data.gouv.fr/resources/donnees-du-repertoire-national-des-elus/20190409-151245/1-rne-cm.txt', 'cm', registry)
  await outputJson('elus.json', Object.values(registry))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
