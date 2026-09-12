const { MongoClient } = require('mongodb');

function createMongoRecordsRepository(config) {
  let clientPromise;

  async function getCollection() {
    if (!config.mongoUri) throw new Error('MONGO_URI not set');
    if (!clientPromise) {
      const client = new MongoClient(config.mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000
      });
      clientPromise = client.connect().then(() => client);
    }
    const client = await clientPromise;
    return client.db(config.mongoDbName).collection(config.mongoCollection);
  }

  return { getCollection };
}

module.exports = { createMongoRecordsRepository };
