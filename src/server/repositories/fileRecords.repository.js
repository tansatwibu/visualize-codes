const fs = require('fs');

function createFileRecordsRepository(dataFile) {
  return {
    async getRecords() {
      const raw = fs.readFileSync(dataFile, 'utf8');
      const records = JSON.parse(raw);
      return records.map(record => ({
        date: record.date.split('T')[0],
        codes: record.codes
      }));
    }
  };
}

module.exports = { createFileRecordsRepository };
