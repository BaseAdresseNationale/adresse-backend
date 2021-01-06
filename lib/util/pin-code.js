const randomNumber = require('random-number-csprng')

async function generatePinCode() {
  return (await randomNumber(0, 999999999)).toString().padStart(9, '0')
}

function getExpirationDate(startDate) {
  const expireAt = new Date(startDate)
  expireAt.setHours(expireAt.getHours() + 1)
  return expireAt
}

module.exports = {generatePinCode, getExpirationDate}
