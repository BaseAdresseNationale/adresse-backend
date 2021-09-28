const randomNumber = require('random-number-csprng')

async function generatePinCode() {
  return (await randomNumber(0, 999999)).toString().padStart(6, '0')
}

function getExpirationDate(startDate) {
  const expireAt = new Date(startDate)
  expireAt.setHours(expireAt.getHours() + 24)
  return expireAt
}

function validatePinCode(codeA, codeB, expirationDate) {
  const now = new Date()
  return codeA === codeB && now < expirationDate
}

module.exports = {generatePinCode, getExpirationDate, validatePinCode}
