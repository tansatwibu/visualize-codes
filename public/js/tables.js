window.tableRenderer = (() => {
  function profit(value) {
    return value == null ? '-' : `${(Number(value) * 100).toFixed(2)}%`;
  }

  function addCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value;
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
      addCell(row, item.code);
      addCell(row, item.count);
      addCell(row, profit(item.minProfit));
      addCell(row, profit(item.maxProfit));
      body.appendChild(row);
    });
  }

  function renderDateRows(body, row) {
    body.innerHTML = '';
    const items = row ? (row.items || []) : [];
    if (!items.length) return empty(body, 4, 'Không có dữ liệu cho ngày này');
    items.forEach(item => {
      const tableRow = document.createElement('tr');
      addCell(tableRow, item.code);
      addCell(tableRow, item.count);
      addCell(tableRow, profit(item.minProfit));
      addCell(tableRow, profit(item.maxProfit));
      body.appendChild(tableRow);
    });
  }

  function renderHistoryRows(body, result, code = '') {
    body.innerHTML = '';
    if (!result.length) return empty(body, 4, 'Không tìm thấy dữ liệu');
    result.forEach(row => {
      const tableRow = document.createElement('tr');
      addCell(tableRow, code || '-');
      addCell(tableRow, row.date);
      addCell(tableRow, profit(row.minProfit));
      addCell(tableRow, profit(row.maxProfit));
      body.appendChild(tableRow);
    });
  }

  return { empty, renderCodeRows, renderDateRows, renderHistoryRows };
})();
