const path = require('path');

require('dotenv').config();

const integerFromEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) ? value : fallback;
};

module.exports = {
  dataFile: path.join(__dirname, '..', '..', '..', 'data', 'data.json'),
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || undefined,
  mongoUri: process.env.MONGO_URI || null,
  mongoDbName: process.env.MONGO_DBNAME,
  mongoCollection: process.env.MONGO_COLLECTION || 'records',
  responseCacheTtlMs: integerFromEnv('RESPONSE_CACHE_TTL_MS', 30000),
  aggregationCacheTtlMs: integerFromEnv('AGG_CACHE_TTL_MS', 15000)
};
