const { buildDatetimeRangeMatch } = require('../repositories/mongoQuery');

function createMonthlyCountsController({ config, fetchRecordsFromFile, getMongoCollection, getCachedResponse, cacheResponse }) {
  async function getMonthlyCounts(req, res) {
    const year = String(req.query.year || new Date().getFullYear());
    const cacheKey = `monthly:${year}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) return res.json(cached);

    try {
      if (!config.mongoUri) {
        const records = await fetchRecordsFromFile();
        const counts = new Map();
        records.filter(record => record.date.startsWith(`${year}-`)).forEach(record => {
          const month = record.date.slice(0, 7);
          if (!counts.has(month)) counts.set(month, new Set());
          (record.codes || []).forEach(code => counts.get(month).add(`${record.date}:${code}`));
        });
        const months = Array.from(counts, ([month, values]) => ({ month, count: values.size }));
        return res.json(cacheResponse(cacheKey, { source: 'file', year, months }));
      }

      const collection = await getMongoCollection();
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      const pipeline = [
        { $match: buildDatetimeRangeMatch(yearStart, yearEnd) },
        { $addFields: { dateNormalized: { $dateToString: { format: '%Y-%m-%d', date: '$datetime' } }, codes: { $cond: [{ $isArray: '$codes' }, '$codes', ['$code']] } } },
        { $unwind: '$codes' },
        { $group: { _id: { month: { $substrCP: ['$dateNormalized', 0, 7] }, date: '$dateNormalized', code: '$codes' } } },
        { $group: { _id: '$_id.month', count: { $sum: 1 } } },
        { $project: { _id: 0, month: '$_id', count: 1 } },
        { $sort: { month: 1 } }
      ];
      const months = await collection.aggregate(pipeline).toArray();
      return res.json(cacheResponse(cacheKey, { source: 'mongo', year, months }));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  return { getMonthlyCounts };
}

module.exports = { createMonthlyCountsController };
