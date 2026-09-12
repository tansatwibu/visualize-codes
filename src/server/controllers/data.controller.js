function createDataController({ config, fetchRecordsFromFile, aggregate, getCachedAggregation, getMongoCollection }) {
  async function getData(req, res) {
    try {
      const days = req.query.days ? parseInt(req.query.days, 10) : null;
      const top = req.query.top ? parseInt(req.query.top, 10) : 10;
      if (config.mongoUri) {
        const result = await getCachedAggregation(days, top);
        res.json(Object.assign({ source: 'mongo' }, result));
        return;
      }
      const records = await fetchRecordsFromFile();
      const result = aggregate(records, days, top);
      res.json({ source: 'file', totalDays: result.totalDays, items: result.items });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  async function getSample(req, res) {
    try {
      if (config.mongoUri) {
        const collection = await getMongoCollection();
        const docs = await collection.find({}).limit(20).toArray();
        res.json({ source: 'mongo', sampleCount: docs.length, docs });
        return;
      }
      const records = await fetchRecordsFromFile();
      res.json({ source: 'file', sampleCount: records.length, docs: records.slice(0, 20) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  return { getData, getSample };
}

module.exports = { createDataController };
