function buildDateRangeMatch(start, end) {
  const dateRange = {};
  const datetimeRange = {};

  if (start) {
    dateRange.$gte = start;
    datetimeRange.$gte = new Date(`${start}T00:00:00.000Z`);
  }
  if (end) {
    dateRange.$lte = end;
    datetimeRange.$lte = new Date(`${end}T23:59:59.999Z`);
  }

  const dateAsDdMmYyyy = {
    $expr: {
      $and: [
        { $gte: [{ $dateFromString: { dateString: '$date', format: '%d-%m-%Y', onError: null, onNull: null } }, datetimeRange.$gte || new Date('0000-01-01T00:00:00.000Z')] },
        { $lte: [{ $dateFromString: { dateString: '$date', format: '%d-%m-%Y', onError: null, onNull: null } }, datetimeRange.$lte || new Date('9999-12-31T23:59:59.999Z')] }
      ]
    }
  };

  return { $or: [{ date: dateRange }, { datetime: datetimeRange }, dateAsDdMmYyyy] };
}

function buildRollingDateRangeMatch(days) {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - Math.max(Number(days) - 1, 0));
  return buildDateRangeMatch(cutoff.toISOString().split('T')[0], today.toISOString().split('T')[0]);
}

function buildDatetimeRangeMatch(start, end) {
  const datetimeRange = {};
  if (start) datetimeRange.$gte = new Date(`${start}T00:00:00.000Z`);
  if (end) {
    const exclusiveEnd = new Date(`${end}T00:00:00.000Z`);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    datetimeRange.$lt = exclusiveEnd;
  }
  return { datetime: datetimeRange };
}

function buildRollingDatetimeRangeMatch(days) {
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - Math.max(Number(days) - 1, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + Math.max(Number(days) - 1, 0));
  return buildDatetimeRangeMatch(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
}

module.exports = {
  buildDateRangeMatch,
  buildRollingDateRangeMatch,
  buildDatetimeRangeMatch,
  buildRollingDatetimeRangeMatch
};