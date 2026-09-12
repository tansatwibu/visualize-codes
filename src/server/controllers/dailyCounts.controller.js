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
          if (!byDate.has(record.date)) byDate.set(record.date, new Set());
          (record.codes || []).forEach(code => byDate.get(record.date).add(String(code)));
        });
        const days = Array.from(byDate.entries()).map(([date, codes]) => ({
          date,
          count: codes.size,
          codes: Array.from(codes),
          items: Array.from(codes).map(code => ({ code, count: 1, minProfit: null, maxProfit: null }))
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

      const pipeline = [
        { $addFields: { dateStr: { $ifNull: ['$datetime', '$date'] } } },
        {
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
        },
        { $project: { dateNormalized: 1, codes: { $cond: [{ $isArray: '$codes' }, '$codes', { $cond: [{ $ifNull: ['$code', false] }, ['$code'], []] }] }, profit_percent: 1 } },
        { $unwind: '$codes' },
        { $match: { dateNormalized: { $ne: null } } }
      ];
      if (startDate || endDate) {
        const match = {};
        if (startDate) match.$gte = startDate;
        if (endDate) match.$lte = endDate;
        pipeline.push({ $match: { dateNormalized: match } });
      }
      pipeline.push(
        { $group: { _id: { date: '$dateNormalized', code: '$codes' }, minProfit: { $min: '$profit_percent' }, maxProfit: { $max: '$profit_percent' } } },
        { $group: { _id: '$_id.date', items: { $push: { code: '$_id.code', count: 1, minProfit: '$minProfit', maxProfit: '$maxProfit' } }, codes: { $addToSet: '$_id.code' } } },
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
