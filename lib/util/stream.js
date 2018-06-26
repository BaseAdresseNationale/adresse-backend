const {PassThrough} = require('stream')

function bufferToStream(buffer) {
  const stream = new PassThrough()
  stream.write(buffer)
  stream.end()
  return stream
}

module.exports = {bufferToStream}
