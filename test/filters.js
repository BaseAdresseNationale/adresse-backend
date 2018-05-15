const test = require('ava')
const filterCsvResource = require('../lib/helpers/filters')

test('known license', t => {
  const data = [
    {resources: [{format: 'csv'}, {format: 'shp'}]},
    {resources: [{format: 'zip'}, {format: 'shp'}]}
  ]
  t.deepEqual(filterCsvResource(data), [data[0]])
})
