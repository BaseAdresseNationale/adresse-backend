const {chain} = require('lodash')

function extractRowsAsPositions(rows) {
  return rows.map(row => {
    return {
      type: row.typePosition,
      coords: row.position,
      dateMAJ: row.dateMAJ,
      source: row.source
    }
  })
}

function extractRowsAsNumeros(rows) {
  return chain(rows)
    .groupBy('numeroComplet')
    .mapValues(numeroCompletRows => {
      const [{id, numeroComplet, numero, suffixe}] = numeroCompletRows
      return {
        id,
        numeroComplet,
        numero,
        suffixe,
        positions: extractRowsAsPositions(numeroCompletRows)
      }
    })
    .value()
}

function extractRowsAsVoies(rows) {
  return chain(rows)
    .groupBy('codeVoie')
    .mapValues(voieRows => {
      const [{idVoie, codeVoie, nomVoie}] = voieRows
      const numeros = extractRowsAsNumeros(voieRows)
      return {
        idVoie,
        codeVoie,
        nomVoie,
        numeros,
        numerosCount: Object.keys(numeros).length
      }
    })
    .value()
}

function extractRowsAsCommunes(rows) {
  return chain(rows)
    .groupBy('codeCommune')
    .mapValues(communeRows => {
      const [{codeCommune}] = communeRows
      const voies = extractRowsAsVoies(communeRows)
      return {
        code: codeCommune,
        voies,
        voiesCount: Object.keys(voies).length,
        numerosCount: Object.values(voies).reduce((acc, {numerosCount}) => {
          return acc + numerosCount
        }, 0)
      }
    })
    .value()
}

function extractAsTree(rows) {
  return {
    communes: extractRowsAsCommunes(rows)
  }
}

module.exports = {extractAsTree, extractRowsAsCommunes, extractRowsAsVoies, extractRowsAsNumeros}
