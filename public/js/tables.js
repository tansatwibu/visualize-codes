window.tableRenderer = (() => {
  function profit(value) {
    return value == null ? '-' : `${(Number(value) * 100).toFixed(2)}%`;
  }

  function profitClass(value) {
    if (value == null) return 'profit-null';
    return Number(value) >= 0 ? 'profit-gain' : 'profit-loss';
  }

  function addCell(row, value, className) {
    const cell = document.createElement('td');
    cell.textContent = value;
    if (className) cell.className = className;
    row.appendChild(cell);
  }

  function addTickerCell(row, code) {
    const cell = document.createElement('td');
    cell.textContent = code;
    cell.className = 'ticker';
    row.appendChild(cell);
  }

  function addProfitCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = profit(value);
    cell.className = `num ${profitClass(value)}`;
    row.appendChild(cell);
  }

  function empty(body, columns, message) {
    body.innerHTML = `<tr><td colspan="${columns}" class="empty-row">${message}</td></tr>`;
  }

  function renderCodeRows(body, items) {
    body.innerHTML = '';
    if (!items.length) return empty(body, 4, 'Không có dữ liệu');
    items.forEach(item => {
      const row = document.createElement('tr');
      addTickerCell(row, item.code);
      addCell(row, item.count, 'num');
      addProfitCell(row, item.minProfit);
      addProfitCell(row, item.maxProfit);
      body.appendChild(row);
    });
  }

  function renderDateRows(body, row) {
    body.innerHTML = '';
    const items = row ? (row.items || []) : [];
    if (!items.length) return empty(body, 4, 'Không có dữ liệu cho ngày này');
    items.forEach(item => {
      const tableRow = document.createElement('tr');
      addTickerCell(tableRow, item.code);
      addCell(tableRow, item.count, 'num');
      addProfitCell(tableRow, item.minProfit);
      addProfitCell(tableRow, item.maxProfit);
      body.appendChild(tableRow);
    });
  }

  function renderHistoryRows(body, result, code = '') {
    body.innerHTML = '';
    if (!result.length) return empty(body, 4, 'Không tìm thấy dữ liệu');
    result.forEach(row => {
      const tableRow = document.createElement('tr');
      addTickerCell(tableRow, code || '-');
      addCell(tableRow, row.date);
      addProfitCell(tableRow, row.minProfit);
      addProfitCell(tableRow, row.maxProfit);
      body.appendChild(tableRow);
    });
  }

  return { empty, renderCodeRows, renderDateRows, renderHistoryRows };
})();
