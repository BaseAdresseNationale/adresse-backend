const got = require('got')
const {validate} = require('@etalab/bal')

function checkHeaders(headers) {
  const contentType = headers['content-type']

  if (contentType &&
      (contentType.includes('csv') || contentType.includes('application/octet-stream'))) {
    return true
  }

  return false
}

async function downloadCsv(url) {
  console.log('Téléchargement…')

  const response = await got(url, {
    encoding: null
  })

  if (checkHeaders(response.headers)) {
    return response.body
  }

  throw new Error('Le fichier n’est pas au format CSV')
}

async function getReport(url) {
  // Downloading file
  const buffer = await downloadCsv(url)

  // Analysis
  console.log('Analyse…')
  const report = await validate(buffer)

  return report
}

module.exports = {getReport}




