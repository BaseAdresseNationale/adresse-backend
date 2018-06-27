const {sortBy} = require('lodash')

function sortByNumero(rows) {
  return sortBy(rows, row => String(row.numero).padStart(5, '0') + (row.suffixe || ''))
}

module.exports = {sortByNumero}
