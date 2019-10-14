const {invert, chain, deburr} = require('lodash')

const codesCommunes = chain(require('@etalab/decoupage-administratif/data/communes.json'))
  .map('code')
  .uniq()
  .value()

const headersMapping = invert({
  pseudoCodeDepartement: 'Code du département (Maire)',
  pseudoCodeCommune: 'Code Insee de la commune',
  nomCommune: 'Libellé de la commune',
  libelleFonction: 'Libellé de fonction'
})

function getFonction(libelleFonction) {
  if (!libelleFonction) {
    return
  }

  const normalized = deburr(libelleFonction).toLowerCase()

  if (normalized.includes('adjoint')) {
    return 'adjoint-au-maire'
  }

  if (normalized === 'maire delegue') {
    return 'maire-delegue'
  }

  if (normalized === 'maire') {
    return 'maire'
  }
}

const DROM = ['ZA', 'ZB', 'ZC', 'ZD']
const NON_SUPPORTE = ['ZN', 'ZP', 'ZS', 'ZM'] // Pour le moment

function prepare({pseudoCodeDepartement, pseudoCodeCommune, nomCommune, libelleFonction}) {
  if (!pseudoCodeDepartement || NON_SUPPORTE.includes(pseudoCodeDepartement)) {
    return null
  }

  const codeDepartement = DROM.includes(pseudoCodeDepartement) ? '97' : pseudoCodeDepartement
  const codeCommune = `${codeDepartement}${pseudoCodeCommune}`
  if (!codesCommunes.includes(codeCommune)) {
    console.log(`Code commune inconnu : ${codeCommune}`)
    return null
  }

  return {
    typeMandat: 'conseiller-municipal',
    codeCommune,
    nomCommune,
    fonction: getFonction(libelleFonction)
  }
}

module.exports = {headersMapping, prepare}
