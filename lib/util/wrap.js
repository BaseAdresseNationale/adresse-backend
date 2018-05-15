/* eslint promise/prefer-await-to-then: off */

function wrap(handler) {
  return (req, res) => {
    handler(req)
      .then(result => res.send(result))
      .catch(err => {
        if (err.badRequest) {
          return res.status(400).send({
            code: 400,
            message: err.message
          })
        }
        if (err.response) {
          return res.status(err.statusCode).send(err.response.body)
        }
        if (err.status && err.body) {
          return res.status(err.status).send(err.body)
        }
        res.status(500).send({
          code: 500,
          message: err.message
        })
      })
  }
}

module.exports = wrap