const got = require('got')
const {keyBy} = require('lodash')
const indexedCommunes = keyBy(require('@etalab/cog/data/communes.json'), 'code')

const API_GEO_URL = 'https://geo.api.gouv.fr'

const cache = new Map()

async function expandCommune(commune) {
  const {code} = commune

  if (cache.has(code)) {
    return cache.get(code)
  }

  const expandedCommune = {code}

  // Expand with COG
  try {
    const {nom} = indexedCommunes[code]
    expandedCommune.nom = nom
  } catch (err) {
    console.error('Commune inconnue du COG: ' + code)
  }

  // Expand with API Géo
  try {
    const response = await got(`${API_GEO_URL}/communes/${code}?fields=population,contour`, {json: true})
    expandedCommune.population = response.body.population
    expandedCommune.contour = response.body.contour
  } catch (err) {

  }

  cache.set(code, expandedCommune)

  return expandedCommune
}

function expandCommunes(communes) {
  return Promise.all(communes.map(expandCommune))
}

module.exports = {expandCommunes}
