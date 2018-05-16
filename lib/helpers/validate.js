const got = require('got')
const {validate} = require('@etalab/bal')

async function downloadCsv(url) {
  const response = await got(url, {
    encoding: null,
    headers: {
      'content-type': 'text/plain'
    }
  })

  return response.body
}

async function isValid(url) {
  const buffer = await downloadCsv(url)
  const report = await validate(buffer)

  return report
}

module.exports = {isValid}