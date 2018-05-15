const got = require('got')
const {validate} = require('@etalab/bal')

async function downloadCsv(url) {
  const response = await got(url, {encoding: null})

  return response.body
}

// function fakeValidate() {
//   return new Promise(resolve => {
//     setTimeout(() => resolve(true), 60000)
//   })
// }

async function isValid(resources) {
  const {url} = resources.find(ressource => ressource.format === 'csv')

  const buffer = await downloadCsv(url)
  const report = await validate(buffer)

  return report
}

module.exports = isValid