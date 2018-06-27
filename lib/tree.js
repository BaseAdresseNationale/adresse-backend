const {chain, maxBy} = require('lodash')

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
      const positions = extractRowsAsPositions(numeroCompletRows)
      return {
        id,
        numeroComplet,
        numero,
        suffixe,
        positions,
        dateMAJ: maxBy(Object.values(positions), e => new Date(e.dateMAJ)).dateMAJ
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
        numerosCount: Object.keys(numeros).length,
        dateMAJ: maxBy(Object.values(numeros), e => new Date(e.dateMAJ)).dateMAJ
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
        }, 0),
        dateMAJ: maxBy(Object.values(voies), e => new Date(e.dateMAJ)).dateMAJ
      }
    })
    .value()
}

function extractAsTree(rows) {
  const communes = extractRowsAsCommunes(rows)
  return {
    communes,
    communesCount: Object.keys(communes).length,
    voiesCount: Object.values(communes).reduce((acc, {voiesCount}) => {
      return acc + voiesCount
    }, 0),
    numerosCount: Object.values(communes).reduce((acc, {numerosCount}) => {
      return acc + numerosCount
    }, 0),
    dateMAJ: maxBy(Object.values(communes), e => new Date(e.dateMAJ)).dateMAJ
  }
}

module.exports = {extractAsTree, extractRowsAsCommunes, extractRowsAsVoies, extractRowsAsNumeros}
