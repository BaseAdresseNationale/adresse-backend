const {MongoClient, ObjectID} = require('mongodb')

class Mongo {
  async connect() {
    this.dbName = process.env.MONGODB_DBNAME || 'adresse-backend'
    this.client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017', {
      useUnifiedTopology: true,
      useNewUrlParser: true
    })
    this.db = this.client.db(this.dbName)
  }

  async ensureIndexes() {
    await this.db.collection('submissions').createIndex({status: 1})
    await this.db.collection('submissions').createIndex({'commune.code': 1})
  }

  disconnect(force) {
    if (this.client && this.client.isConnected()) {
      return this.client.close(force)
    }
  }

  parseObjectID(string) {
    try {
      return new ObjectID(string)
    } catch {
      return null
    }
  }
}

module.exports = new Mongo()
module.exports.ObjectID = ObjectID
