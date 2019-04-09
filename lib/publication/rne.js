
const {deburr, groupBy} = require('lodash')
const elus = require('../../elus.json')

const dateNaissanceIndex = groupBy(elus, 'dateNaissance')

function normalize(str) {
  return deburr(str).toUpperCase().replace(/[^A-Z]+/g, ' ')
}

function findElu({dateNaissance, nomNaissance, prenom, sexe}) {
  const nNomNaissance = normalize(nomNaissance)
  const nPrenom = normalize(prenom)
  return (dateNaissanceIndex[dateNaissance] || [])
    .find(c => c.sexe === sexe && normalize(c.nomNaissance) === nNomNaissance && normalize(c.prenom) === nPrenom)
}

module.exports = {findElu}
