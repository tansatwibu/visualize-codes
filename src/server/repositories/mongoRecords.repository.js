const { MongoClient } = require('mongodb');

const RECORD_INDEXES = [
  { key: { date: 1 }, name: 'idx_records_date' },
  { key: { codes: 1, date: 1 }, name: 'idx_records_codes_date' },
  { key: { datetime: 1 }, name: 'idx_records_datetime' },
  { key: { codes: 1, datetime: 1 }, name: 'idx_records_codes_datetime' }
];

function createMongoRecordsRepository(config) {
  let clientPromise;
  let indexesPromise;

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
    const collection = client.db(config.mongoDbName).collection(config.mongoCollection);
    if (!indexesPromise) {
      indexesPromise = collection.createIndexes(RECORD_INDEXES).catch(error => {
        console.warn(`Mongo index setup skipped: ${error.message}`);
        return [];
      });
    }
    await indexesPromise;
    return collection;
  }

  return { getCollection };
}

module.exports = { createMongoRecordsRepository };
