function getApiUrl() {
  if (process.env.BACKEND_API_URL) {
    return process.env.BACKEND_API_URL
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('BACKEND_API_URL must be defined in production mode')
  }

  return 'http://api.domain.tld'
}

module.exports = {getApiUrl}
