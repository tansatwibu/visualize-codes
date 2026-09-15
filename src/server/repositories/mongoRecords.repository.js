const { MongoClient } = require('mongodb');

const RECORD_INDEXES = [
  { key: { date: 1 }, name: 'idx_records_date' },
  { key: { codes: 1, date: 1 }, name: 'idx_records_codes_date' },
  { key: { datetime: 1 }, name: 'idx_records_datetime' },
  { key: { codes: 1, datetime: 1 }, name: 'idx_records_codes_datetime' },
  {
    key: { code: 1, date: 1 },
    name: 'idx_records_code_date',
    partialFilterExpression: { code: { $exists: true } }
  },
  {
    key: { code: 1, datetime: 1 },
    name: 'idx_records_code_datetime',
    partialFilterExpression: { code: { $exists: true } }
  },
  {
    key: { datetime: 1, code: 1, profit_percent: 1 },
    name: 'idx_records_datetime_code_profit',
    partialFilterExpression: { code: { $exists: true }, datetime: { $exists: true } }
  }
];

function sameIndexKey(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function samePartialFilter(left, right) {
  return JSON.stringify(left || null) === JSON.stringify(right || null);
}

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
      }).then(() => verifyIndexes(collection));
    }
    await indexesPromise;
    return collection;
  }

  async function verifyIndexes(collection) {
    const indexes = await collection.listIndexes().toArray();
    const indexesByName = new Map(indexes.map(index => [index.name, index]));
    const invalidIndexes = RECORD_INDEXES.filter(expected => {
      const actual = indexesByName.get(expected.name);
      return !actual
        || !sameIndexKey(actual.key, expected.key)
        || !samePartialFilter(actual.partialFilterExpression, expected.partialFilterExpression);
    });

    if (invalidIndexes.length) {
      const details = invalidIndexes.map(index => index.name).join(', ');
      throw new Error(`Mongo index verification failed: ${details}`);
    }

    console.log(`Mongo indexes verified: ${RECORD_INDEXES.map(index => index.name).join(', ')}`);
  }

  return { getCollection };
}

module.exports = { createMongoRecordsRepository };
