
const {deburr, groupBy, pick} = require('lodash')
const elus = require('../../elus.json')

const dateNaissanceIndex = groupBy(elus, 'dateNaissance')

function normalize(str) {
  return deburr(str).toUpperCase().replace(/[^A-Z]+/g, ' ')
}

function findConseillerMunicipal({dateNaissance, nomNaissance, prenom, sexe}, codeCommune) {
  const nNomNaissance = normalize(nomNaissance)
  const nPrenom = normalize(prenom)
  const elu = (dateNaissanceIndex[dateNaissance] || [])
    .find(c => c.sexe === sexe && normalize(c.nomNaissance) === nNomNaissance && nPrenom.startsWith(normalize(c.prenom)))

  if (!elu) {
    return
  }

  const mandat = elu.mandats.find(m => m.typeMandat === 'conseiller-municipal' && m.codeCommune === codeCommune)

  if (mandat) {
    return {
      ...pick(elu, 'sexe', 'nomNaissance', 'nomMarital', 'prenom'),
      typeMandat: mandat.fonction || 'conseiller municipal'
    }
  }
}

module.exports = {findConseillerMunicipal}
