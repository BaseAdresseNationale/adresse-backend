const {MongoClient, ObjectID} = require('mongodb')
const indexes = require('../../mongo.indexes')

class Mongo {
  async connect() {
    this.client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017', {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      reconnectTries: 1
    })
    this.db = this.client.db(process.env.MONGODB_DBNAME || 'adresse-backend')
  }

  async ensureIndexes() {
    await Promise.all(Object.keys(indexes).map(collectionName => {
      const collectionIndexes = indexes[collectionName]
      return Promise.all(collectionIndexes.map(collectionIndex => {
        return this.db.collection(collectionName).createIndex(collectionIndex)
      }))
    }))
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
