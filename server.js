const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./src/server/config/env');
const { createFileRecordsRepository } = require('./src/server/repositories/fileRecords.repository');
const { createMongoRecordsRepository } = require('./src/server/repositories/mongoRecords.repository');
const { createDataRouter } = require('./src/server/routes/data.routes');
const { createCodeHistoryRouter } = require('./src/server/routes/codeHistory.routes');
const { createMonthlyCountsRouter } = require('./src/server/routes/monthlyCounts.routes');
const { createDailyCountsRouter } = require('./src/server/routes/dailyCounts.routes');

const app = express();
const corsOptions = config.corsOrigin ? { origin: config.corsOrigin } : undefined;
app.use(cors(corsOptions));
app.use(express.json());

const DATA_FILE = config.dataFile;
const fileRecordsRepository = createFileRecordsRepository(DATA_FILE);
const mongoRecordsRepository = createMongoRecordsRepository(config);
const responseCache = new Map();
const RESPONSE_CACHE_TTL_MS = config.responseCacheTtlMs;

async function getMongoCollection() {
  return mongoRecordsRepository.getCollection();
}

function getCachedResponse(key) {
  const entry = responseCache.get(key);
  return entry && Date.now() - entry.timestamp < RESPONSE_CACHE_TTL_MS ? entry.data : null;
}

function cacheResponse(key, data) {
  responseCache.set(key, { timestamp: Date.now(), data });
  return data;
}

async function fetchRecordsFromFile() {
  return fileRecordsRepository.getRecords();
}

function aggregate(records, days, top) {
  const now = new Date();
  let cutoff = null;
  if (days) {
    cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  }
  const filtered = cutoff ? records.filter(r => new Date(r.date) >= cutoff) : records;
  const codesByDate = new Map();
  filtered.forEach(r => {
    const d = r.date || null;
    if (!d) return;
    if (!codesByDate.has(d)) codesByDate.set(d, new Set());
    (r.codes || []).forEach(code => { if (code) codesByDate.get(d).add(String(code)); });
  });
  const totalDays = codesByDate.size || 0;
  const counts = {};
  for (const set of codesByDate.values()) {
    for (const code of set) {
      counts[code] = (counts[code] || 0) + 1;
    }
  }
  const items = Object.keys(counts).map(code => ({ code, count: counts[code], percent: totalDays ? Math.round((counts[code] / totalDays) * 100) : 0 }));
  items.sort((a, b) => b.count - a.count);
  return { totalDays, items: items.slice(0, top || items.length) };
}

async function aggregateFromMongo(days, top) {
  const uri = config.mongoUri;
  if (!uri) throw new Error('MONGO_URI not set');
  const coll = await getMongoCollection();

    const pipeline = [];
    pipeline.push({ $addFields: { dateStr: { $ifNull: ['$datetime', '$date'] } } });
    pipeline.push({
      $addFields: {
        dateNormalized: {
          $cond: [
            { $ifNull: ['$datetime', false] },
            { $dateToString: { format: '%Y-%m-%d', date: '$datetime' } },
            {
              $cond: [
                { $regexMatch: { input: '$date', regex: '^\\d{2}-\\d{2}-\\d{4}$' } },
                { $let: { vars: { parts: { $split: ['$date', '-'] } }, in: { $concat: [{ $arrayElemAt: ['$$parts', 2] }, '-', { $arrayElemAt: ['$$parts', 1] }, '-', { $arrayElemAt: ['$$parts', 0] }] } } },
                { $substrCP: ['$date', 0, 10] }
              ]
            }
          ]
        }
      }
    });
    pipeline.push({
      $project: {
        dateNormalized: 1,
        codes: { $cond: [{ $isArray: '$codes' }, '$codes', { $cond: [{ $ifNull: ['$code', false] }, ['$code'], []] }] },
        profit_percent: 1
      }
    });
    pipeline.push({ $unwind: '$codes' });
    pipeline.push({ $match: { dateNormalized: { $ne: null } } });

    if (days) {
      const now = new Date();
      const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      const cutoffStr = cutoff.toISOString().split('T')[0];
      pipeline.push({ $match: { dateNormalized: { $gte: cutoffStr } } });
    }

    // group by date+code to get max profit per day-code
    pipeline.push({ $group: { _id: { date: '$dateNormalized', code: '$codes' }, minProfitPerDayCode: { $min: '$profit_percent' }, maxProfitPerDayCode: { $max: '$profit_percent' } } });
    // then group by code to count distinct days and overall max profit
    pipeline.push({ $group: { _id: '$_id.code', count: { $sum: 1 }, minProfit: { $min: '$minProfitPerDayCode' }, maxProfit: { $max: '$maxProfitPerDayCode' } } });
    pipeline.push({ $sort: { count: -1 } });
    pipeline.push({ $limit: top || 100 });

    const itemsRaw = await coll.aggregate(pipeline).toArray();
    const items = itemsRaw.map(r => ({ code: r._id, count: r.count, minProfit: (typeof r.minProfit === 'number') ? r.minProfit : null, maxProfit: (typeof r.maxProfit === 'number') ? r.maxProfit : null }));

    // total distinct days
    const dayPipeline = [];
    dayPipeline.push({ $addFields: { dateStr: { $ifNull: ['$datetime', '$date'] } } });
    dayPipeline.push({ $addFields: { dateNormalized: {
      $cond: [
        { $ifNull: ['$datetime', false] },
        { $dateToString: { format: '%Y-%m-%d', date: '$datetime' } },
        { $cond: [ { $regexMatch: { input: '$date', regex: '^\\d{2}-\\d{2}-\\d{4}$' } }, { $let: { vars: { parts: { $split: ['$date', '-'] } }, in: { $concat: [{ $arrayElemAt: ['$$parts',2] }, '-', { $arrayElemAt: ['$$parts',1] }, '-', { $arrayElemAt: ['$$parts',0] }] } } }, { $substrCP: ['$date',0,10] } ] }
      ]
    } } });
    dayPipeline.push({ $match: { dateNormalized: { $ne: null } } });
    if (days) {
      const now = new Date();
      const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      const cutoffStr = cutoff.toISOString().split('T')[0];
      dayPipeline.push({ $match: { dateNormalized: { $gte: cutoffStr } } });
    }
    dayPipeline.push({ $group: { _id: '$dateNormalized' } });
    dayPipeline.push({ $count: 'totalDays' });
    const dayRes = await coll.aggregate(dayPipeline).toArray();
    const totalDays = dayRes.length ? dayRes[0].totalDays : 0;

    const enriched = items.map(i => ({ code: i.code, count: i.count, percent: totalDays ? Math.round((i.count / totalDays) * 100) : 0, minProfit: i.minProfit, maxProfit: i.maxProfit }));
    return { totalDays, items: enriched };
}

// Simple in-memory cache to reduce repeated heavy DB aggregation
const aggCache = new Map(); // key -> { ts, data }
const CACHE_TTL_MS = config.aggregationCacheTtlMs;

async function getCachedAggregation(days, top) {
  const key = `d:${days||'all'}:t:${top||100}`;
  const now = Date.now();
  const entry = aggCache.get(key);
  if (entry && (now - entry.ts) < CACHE_TTL_MS) return entry.data;
  const data = await aggregateFromMongo(days, top);
  aggCache.set(key, { ts: now, data });
  return data;
}

app.use('/api', createDataRouter({
  config,
  fetchRecordsFromFile,
  aggregate,
  getCachedAggregation,
  getMongoCollection
}));
app.use('/api', createCodeHistoryRouter({
  config,
  fetchRecordsFromFile,
  getMongoCollection,
  getCachedResponse,
  cacheResponse
}));
app.use('/api', createMonthlyCountsRouter({
  config,
  fetchRecordsFromFile,
  getMongoCollection,
  getCachedResponse,
  cacheResponse
}));
app.use('/api', createDailyCountsRouter({
  config,
  fetchRecordsFromFile,
  getMongoCollection,
  getCachedResponse,
  cacheResponse
}));

app.use('/', express.static(path.join(__dirname, 'public')));

app.listen(config.port, config.host, () => console.log(`Server running on http://${config.host}:${config.port} (accessible externally)`));
