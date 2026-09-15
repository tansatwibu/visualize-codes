const { buildDatetimeRangeMatch } = require('../repositories/mongoQuery');

function createDailyCountsController({ config, fetchRecordsFromFile, getMongoCollection, getCachedResponse, cacheResponse }) {
  async function getDailyCounts(req, res) {
    try {
      if (!config.mongoUri) {
        const records = await fetchRecordsFromFile();
        const { start, end } = req.query;
        let startDate = start ? new Date(start) : null;
        let endDate = end ? new Date(end) : null;
        if (req.query.month) {
          const [year, month] = req.query.month.split('-').map(Number);
          startDate = new Date(year, month - 1, 1);
          endDate = new Date(year, month, 0);
        }
        const filtered = records.filter(record => {
          const date = new Date(record.date);
          if (startDate && date < startDate) return false;
          if (endDate && date > endDate) return false;
          return true;
        });
        const byDate = new Map();
        filtered.forEach(record => {
          if (!byDate.has(record.date)) byDate.set(record.date, new Map());
          const codes = byDate.get(record.date);
          (record.codes || []).forEach(code => {
            const normalizedCode = String(code);
            codes.set(normalizedCode, (codes.get(normalizedCode) || 0) + 1);
          });
        });
        const days = Array.from(byDate.entries()).map(([date, codes]) => ({
          date,
          count: codes.size,
          codes: Array.from(codes.keys()),
          items: Array.from(codes, ([code, count]) => ({ code, count, minProfit: null, maxProfit: null }))
        }));
        days.sort((left, right) => left.date.localeCompare(right.date));
        res.json({
          source: 'file',
          range: { start: startDate?.toISOString().split('T')[0] || null, end: endDate?.toISOString().split('T')[0] || null },
          days
        });
        return;
      }

      const collection = await getMongoCollection();
      let startDate = req.query.start || null;
      let endDate = req.query.end || null;
      if (req.query.month) {
        const [year, month] = req.query.month.split('-').map(Number);
        startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        endDate = new Date(year, month, 0).toISOString().split('T')[0];
      }

      const pipeline = [];
      if (startDate || endDate) pipeline.push({ $match: buildDatetimeRangeMatch(startDate, endDate) });
      pipeline.push(
        {
          $addFields: {
            dateNormalized: { $dateToString: { format: '%Y-%m-%d', date: '$datetime' } },
            codes: { $cond: [{ $isArray: '$codes' }, '$codes', ['$code']] }
          }
        },
        { $project: { dateNormalized: 1, codes: 1, profit_percent: 1 } },
        { $unwind: '$codes' }
      );
      pipeline.push(
        { $group: { _id: { date: '$dateNormalized', code: '$codes' }, count: { $sum: 1 }, minProfit: { $min: '$profit_percent' }, maxProfit: { $max: '$profit_percent' } } },
        { $group: { _id: '$_id.date', items: { $push: { code: '$_id.code', count: '$count', minProfit: '$minProfit', maxProfit: '$maxProfit' } }, codes: { $addToSet: '$_id.code' } } },
        { $project: { date: '$_id', count: { $size: '$codes' }, codes: 1, items: 1 } },
        { $sort: { date: 1 } }
      );

      const cacheKey = `daily:${startDate || ''}:${endDate || ''}`;
      const cached = getCachedResponse(cacheKey);
      if (cached) return res.json(cached);
      const days = await collection.aggregate(pipeline).toArray();
      res.json(cacheResponse(cacheKey, { source: 'mongo', range: { start: startDate, end: endDate }, days }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  return { getDailyCounts };
}

module.exports = { createDailyCountsController };
