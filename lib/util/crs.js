const proj4 = require('proj4')

const crsMapping = {
  // Guadeloupe
  971: 5490,
  // Martinique
  972: 5490,
  // Guyane
  973: 2972,
  // Réunion
  974: 2975,
  // Mayotte
  976: 4471
}

function getLegalCrsCode(codeDepartement) {
  return codeDepartement in crsMapping ? crsMapping[codeDepartement] : 2154
}

function getProjFn(codeDepartement) {
  const crsCode = getLegalCrsCode(codeDepartement)
  const projFn = proj4(
    require('epsg-index/s/4326.json').proj4,
    require(`epsg-index/s/${crsCode}.json`).proj4
  )
  return c => projFn.forward(c)
}

module.exports = {getLegalCrsCode, getProjFn}
