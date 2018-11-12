const licensesLabels = {
  notspecified: 'Non spécifiée',
  'odc-odbl': 'ODbL 1.0',
  'fr-lo': 'Licence Ouverte',
  lov2: 'Licence Ouverte'
}

function getLicenseLabel(token) {
  if (token in licensesLabels) {
    return licensesLabels[token]
  }

  return token
}

module.exports = {getLicenseLabel}
