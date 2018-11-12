const test = require('ava')
const {getLicenseLabel} = require('../lib/helpers/licenses')

test('Licence Ouverte', t => {
  t.is(getLicenseLabel('fr-lo'), 'Licence Ouverte')
  t.is(getLicenseLabel('lov2'), 'Licence Ouverte')
})

test('ODbL 1.0', t => {
  t.is(getLicenseLabel('odc-odbl'), 'ODbL 1.0')
})

test('Unknown license', t => {
  t.is(getLicenseLabel('unknow license'), 'unknow license')
})
