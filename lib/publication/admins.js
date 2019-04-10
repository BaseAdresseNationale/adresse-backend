const {deburr} = require('lodash')
const admins = require('../../admins.json')

function normalize(str) {
  return deburr(str).toUpperCase().replace(/[^A-Z]+/g, ' ')
}

function findAdmin({dateNaissance, nomNaissance, prenom, sexe}) {
  const nNomNaissance = normalize(nomNaissance)
  const nPrenom = normalize(prenom)
  const admin = admins
    .find(a => a.sexe === sexe && normalize(a.nomNaissance) === nNomNaissance && normalize(a.prenom) === nPrenom && dateNaissance === a.dateNaissance)

  if (admin) {
    return {
      ...admin,
      typeMandat: 'administrateur'
    }
  }
}

module.exports = {findAdmin}
