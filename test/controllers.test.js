const test = require('node:test');
const assert = require('node:assert/strict');
const { createDataController } = require('../src/server/controllers/data.controller');
const { createCodeHistoryController } = require('../src/server/controllers/codeHistory.controller');
const { createMonthlyCountsController } = require('../src/server/controllers/monthlyCounts.controller');
const { createDailyCountsController } = require('../src/server/controllers/dailyCounts.controller');

const records = [
  { date: '2026-08-29', codes: ['ACB', 'HPG'] },
  { date: '2026-08-30', codes: ['ACB'] },
  { date: '2026-09-01', codes: ['HPG', 'VIC'] }
];

function response() {
  return {
    body: null,
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

function dependencies() {
  const cache = new Map();
  return {
    config: { mongoUri: null },
    fetchRecordsFromFile: async () => records,
    getMongoCollection: async () => { throw new Error('Mongo should not be used in file mode'); },
    aggregate: (items, days, top) => {
      const counts = new Map();
      items.forEach(item => item.codes.forEach(code => counts.set(code, (counts.get(code) || 0) + 1)));
      return { totalDays: items.length, items: Array.from(counts, ([code, count]) => ({ code, count })).slice(0, top || 10) };
    },
    getCachedResponse: key => cache.get(key) || null,
    cacheResponse: (key, value) => { cache.set(key, value); return value; },
    getCachedAggregation: async () => { throw new Error('Mongo aggregation should not be used in file mode'); }
  };
}

test('data controller returns top codes in file mode', async () => {
  const controller = createDataController(dependencies());
  const res = response();
  await controller.getData({ query: { top: '2' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.source, 'file');
  assert.deepEqual(res.body.items.map(item => item.code), ['ACB', 'HPG']);
});

test('code history controller filters by code', async () => {
  const controller = createCodeHistoryController(dependencies());
  const res = response();
  await controller.getCodeHistory({ query: { code: 'acb' } }, res);
  assert.equal(res.body.source, 'file');
  assert.equal(res.body.code, 'ACB');
  assert.deepEqual(res.body.days.map(day => day.date), ['2026-08-29', '2026-08-30']);
});

test('monthly counts controller groups unique code days', async () => {
  const controller = createMonthlyCountsController(dependencies());
  const res = response();
  await controller.getMonthlyCounts({ query: { year: '2026' } }, res);
  assert.equal(res.body.source, 'file');
  assert.deepEqual(res.body.months, [
    { month: '2026-08', count: 3 },
    { month: '2026-09', count: 2 }
  ]);
});

test('daily counts controller supports a month filter', async () => {
  const controller = createDailyCountsController(dependencies());
  const res = response();
  await controller.getDailyCounts({ query: { month: '2026-08' } }, res);
  assert.equal(res.body.source, 'file');
  assert.deepEqual(res.body.days.map(day => day.date), ['2026-08-29', '2026-08-30']);
  assert.deepEqual(res.body.days.map(day => day.count), [2, 1]);
});
