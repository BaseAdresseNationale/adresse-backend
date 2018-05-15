function filterCsvResource(data) {
  return data.filter(item => {
    const tab = item.resources.map(resource => resource.format === 'csv')
    return tab.includes(true)
  })
}

module.exports = filterCsvResource