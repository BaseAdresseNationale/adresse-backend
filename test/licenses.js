const test = require('ava')
const getLicenseLabel = require('../lib/helpers/licenses')

test('known license', t => {
  t.is(getLicenseLabel('fr-lo'), 'Licence Ouverte 2.0')
})

test('unknown license', t => {
  t.is(getLicenseLabel('unknow license'), 'unknow license')
})
