const {callbackify} = require('util')

function wrap(handler) {
  handler = callbackify(handler)
  return (req, res, next) => {
    handler(req, res, next, (err, result) => {
      if (err && err.notFound) {
        res.status(404).send({code: 404, message: err.message})
      } else if (err) {
        res.status(500).send({code: 500, message: err.message})
      } else if (result) {
        res.send(result)
      } else {
        next()
      }
    })
  }
}

module.exports = wrap
