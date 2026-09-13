const { buildRollingDateRangeMatch, buildDateRangeMatch } = require('../repositories/mongoQuery');

function createCodeHistoryController({ config, fetchRecordsFromFile, getMongoCollection, getCachedResponse, cacheResponse }) {
  async function getCodeHistory(req, res) {
    const code = String(req.query.code || '').trim().toUpperCase();
    if (!code) return res.json({ source: 'none', code, days: [] });

    const requestedDays = req.query.days ? parseInt(req.query.days, 10) : null;
    const month = req.query.month || null;
    const cacheKey = `history:${code}:days-${requestedDays || 'all'}:${month || 'all'}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) return res.json(cached);

    try {
      if (!config.mongoUri) {
        const records = await fetchRecordsFromFile();
        const cutoff = requestedDays ? new Date(Date.now() - requestedDays * 24 * 60 * 60 * 1000) : null;
        const countsByDate = new Map();
        records.filter(record => {
          const matchesRange = cutoff
            ? new Date(`${record.date}T00:00:00Z`) >= cutoff
            : (!month || record.date.startsWith(month));
          return matchesRange && (record.codes || []).map(String).includes(code);
        }).forEach(record => countsByDate.set(record.date, (countsByDate.get(record.date) || 0) + 1));
        const matchingDays = Array.from(countsByDate, ([date, count]) => ({ date, count, minProfit: null, maxProfit: null }));
        return res.json(cacheResponse(cacheKey, { source: 'file', code, days: matchingDays }));
      }

      const collection = await getMongoCollection();
      const pipeline = [{ $match: { $or: [{ codes: code }, { code }] } }];
      if (requestedDays) {
        pipeline.push({ $match: buildRollingDateRangeMatch(requestedDays) });
      } else if (month && /^\d{4}-\d{2}$/.test(month)) {
        const [year, monthNumber] = month.split('-').map(Number);
        const nextMonth = monthNumber === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`;
        pipeline.push({ $match: buildDateRangeMatch(`${month}-01`, nextMonth) });
      }
      pipeline.push(
        { $addFields: { dateNormalized: { $cond: [{ $ifNull: ['$datetime', false] }, { $dateToString: { format: '%Y-%m-%d', date: '$datetime' } }, { $substrCP: [{ $convert: { input: '$date', to: 'string', onError: '', onNull: '' } }, 0, 10] }] } } },
        { $project: { dateNormalized: 1, codes: { $cond: [{ $isArray: '$codes' }, '$codes', { $cond: [{ $ifNull: ['$code', false] }, ['$code'], []] }] }, profit_percent: 1 } },
        { $unwind: '$codes' },
        { $match: { codes: code } }
      );
      pipeline.push(
        { $group: { _id: '$dateNormalized', count: { $sum: 1 }, minProfit: { $min: '$profit_percent' }, maxProfit: { $max: '$profit_percent' } } },
        { $sort: { _id: 1 } }
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
