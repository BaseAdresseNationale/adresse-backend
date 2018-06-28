const {chain, maxBy, uniq, flatten} = require('lodash')

function mergeSet(arrays) {
  return uniq(flatten(arrays))
}

function extractRowsAsPositions(rows) {
  return rows.map(row => {
    return {
      type: row.typePosition,
      coords: row.position,
      dateMAJ: row.dateMAJ,
      source: [row.source]
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
        positions: positions.filter(p => p.coords),
        source: mergeSet(positions.map(e => e.source)),
        dateMAJ: maxBy(positions, e => new Date(e.dateMAJ)).dateMAJ
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
      const voie = {
        idVoie,
        codeVoie,
        nomVoie,
        source: mergeSet(Object.values(numeros).map(e => e.source)),
        dateMAJ: maxBy(Object.values(numeros), e => new Date(e.dateMAJ)).dateMAJ
      }
      if (Object.keys(numeros).length === 1 && numeros['99999']) {
        if (numeros['99999'].positions.length > 0) {
          voie.position = numeros['99999'].positions[0]
        }
        voie.numerosCount = 0
      } else {
        voie.numeros = numeros
        voie.numerosCount = Object.keys(numeros).length
      }
      return voie
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
        source: mergeSet(Object.values(voies).map(e => e.source)),
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
    source: mergeSet(Object.values(communes).map(e => e.source)),
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

module.exports = {
  mergeSet,
  extractAsTree,
  extractRowsAsCommunes,
  extractRowsAsVoies,
  extractRowsAsNumeros
}
