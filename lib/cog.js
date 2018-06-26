const communes = require('@etalab/cog/data/communes.json')

const codesCommunes = communes.map(c => c.code)

function codeCommuneIsValid(codeCommune) {
  return codesCommunes.includes(codeCommune)
}

function getCodeDepartement(codeCommune) {
  if (codeCommune.startsWith('97')) {
    return codeCommune.substr(0, 3)
  }
  return codeCommune.substr(0, 2)
}

module.exports = {getCodeDepartement, codeCommuneIsValid}
