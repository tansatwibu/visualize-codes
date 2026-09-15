const { buildDateRangeMatch } = require('../repositories/mongoQuery');

const HISTORY_LIMIT = 50;

function createCodeHistoryController({ config, fetchRecordsFromFile, getMongoCollection, getCachedResponse, cacheResponse }) {
  async function getCodeHistory(req, res) {
    const code = String(req.query.code || '').trim().toUpperCase();
    if (!code) return res.json({ source: 'none', code, days: [] });

    const cacheKey = `history:${code}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) return res.json(cached);

    try {
      if (!config.mongoUri) {
        const records = await fetchRecordsFromFile();
        const now = Date.now();
        const countsByDate = new Map();
        records.filter(record => {
          const recordDate = new Date(record.datetime || `${record.date}T23:59:59.999Z`).getTime();
          return recordDate <= now && (record.codes || []).map(String).includes(code);
        }).forEach(record => countsByDate.set(record.date, (countsByDate.get(record.date) || 0) + 1));
        const matchingDays = Array.from(countsByDate, ([date, count]) => ({ date, count, minProfit: null, maxProfit: null }))
          .sort((left, right) => right.date.localeCompare(left.date))
          .slice(0, HISTORY_LIMIT);
        return res.json(cacheResponse(cacheKey, { source: 'file', code, days: matchingDays }));
      }

      const collection = await getMongoCollection();
      const today = new Date().toISOString().split('T')[0];
      const pipeline = [
        { $match: { $and: [{ $or: [{ codes: code }, { code }] }, buildDateRangeMatch(null, today)] } }
      ];
      pipeline.push(
        { $addFields: { dateNormalized: { $cond: [{ $ifNull: ['$datetime', false] }, { $dateToString: { format: '%Y-%m-%d', date: '$datetime' } }, { $substrCP: [{ $convert: { input: '$date', to: 'string', onError: '', onNull: '' } }, 0, 10] }] } } },
        { $project: { dateNormalized: 1, codes: { $cond: [{ $isArray: '$codes' }, '$codes', { $cond: [{ $ifNull: ['$code', false] }, ['$code'], []] }] }, profit_percent: 1 } },
        { $unwind: '$codes' },
        { $match: { codes: code } }
      );
      pipeline.push(
        { $group: { _id: '$dateNormalized', count: { $sum: 1 }, minProfit: { $min: '$profit_percent' }, maxProfit: { $max: '$profit_percent' } } },
        { $sort: { _id: -1 } },
        { $limit: HISTORY_LIMIT }
      );
      const days = (await collection.aggregate(pipeline).toArray()).map(item => ({
        date: item._id,
        count: item.count,
        minProfit: typeof item.minProfit === 'number' ? item.minProfit : null,
        maxProfit: typeof item.maxProfit === 'number' ? item.maxProfit : null
      }));
      return res.json(cacheResponse(cacheKey, { source: 'mongo', code, days }));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  return { getCodeHistory };
}

module.exports = { createCodeHistoryController };
