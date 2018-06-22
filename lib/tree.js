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
      return {
        idVoie,
        codeVoie,
        nomVoie,
        numeros: extractRowsAsNumeros(voieRows)
      }
    })
    .value()
}

function extractRowsAsCommunes(rows) {
  return chain(rows)
    .groupBy('codeCommune')
    .mapValues(communeRows => {
      const [{codeCommune}] = communeRows
      return {
        codeCommune,
        voies: extractRowsAsVoies(communeRows)
      }
    })
    .value()
}

module.exports = {extractRowsAsCommunes, extractRowsAsVoies, extractRowsAsNumeros}
