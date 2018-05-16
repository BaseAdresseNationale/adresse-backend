const licensesLabels = {
  notspecified: 'Non spécifiée',
  'odc-odbl': 'ODbL 1.0',
  'fr-lo': 'Licence Ouverte 2.0'
}

function getLicenseLabel(token) {
  if (token in licensesLabels) {
    return licensesLabels[token]
  }

  return token
}

module.exports = {getLicenseLabel}
