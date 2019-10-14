const communes = require('@etalab/decoupage-administratif/data/communes.json')
const departements = require('@etalab/decoupage-administratif/data/departements.json')

const codesCommunes = communes.map(c => c.code)
const codesDepartements = departements.map(c => c.code)

function codeCommuneIsValid(codeCommune) {
  return codesCommunes.includes(codeCommune)
}

function codeDepartementIsValid(codeDepartement) {
  return codesDepartements.includes(codeDepartement)
}

function getCodeDepartement(codeCommune) {
  if (codeCommune.startsWith('97')) {
    return codeCommune.substr(0, 3)
  }
  return codeCommune.substr(0, 2)
}

module.exports = {getCodeDepartement, codeCommuneIsValid, codeDepartementIsValid}
