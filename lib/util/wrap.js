const {callbackify} = require('util')
const isStream = require('is-stream')

function wrap(handler) {
  handler = callbackify(handler)
  return (req, res, next) => {
    handler(req, res, next, (err, result) => {
      if (err && err.notFound) {
        res.status(404).send({code: 404, message: err.message})
      } else if (err) {
        res.status(500).send({code: 500, message: err.message})
        console.error(err)
      } else if (result && isStream(result)) {
        result.pipe(res)
      } else if (result) {
        res.send(result)
      } else {
        next()
      }
    })
  }
}

module.exports = wrap
