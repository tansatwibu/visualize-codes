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

  function frequencyLabel(count) {
    const frequency = Number(count) || 0;
    if (frequency < 5) return 'Thấp';
    if (frequency <= 20) return 'Trung bình';
    return 'Cao';
  }

  function frequencyClass(count) {
    const frequency = Number(count) || 0;
    if (frequency < 5) return 'frequency-low';
    if (frequency <= 20) return 'frequency-medium';
    return 'frequency-high';
  }

  function addFrequencyCell(row, count) {
    addCell(row, frequencyLabel(count), frequencyClass(count));
  }

  function empty(body, columns, message) {
    body.innerHTML = `<tr><td colspan="${columns}" class="empty-row">${message}</td></tr>`;
  }

  function sortRows(rows, key, direction) {
    const multiplier = direction === 'desc' ? -1 : 1;
    return rows.slice().sort((left, right) => {
      if (key === 'code') return String(left.code || '').localeCompare(String(right.code || ''), 'vi') * multiplier;
      if (key === 'date') {
        const now = Date.now();
        const leftDistance = Math.abs(new Date(left.date).getTime() - now);
        const rightDistance = Math.abs(new Date(right.date).getTime() - now);
        return (leftDistance - rightDistance) * multiplier;
      }
      const field = key === 'frequency' ? 'count' : key;
      const leftValue = Number(left[field]);
      const rightValue = Number(right[field]);
      const leftNumber = Number.isFinite(leftValue) ? leftValue : Number.NEGATIVE_INFINITY;
      const rightNumber = Number.isFinite(rightValue) ? rightValue : Number.NEGATIVE_INFINITY;
      return (leftNumber - rightNumber) * multiplier;
    });
  }

  function bindSort(table, onSort) {
    const buttons = table.querySelectorAll('.sort-button');
    const directions = new Map();
    buttons.forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.sortKey;
      const direction = directions.get(key) === 'asc' ? 'desc' : 'asc';
      directions.set(key, direction);
      buttons.forEach(item => {
        item.removeAttribute('data-sort-direction');
        item.setAttribute('aria-sort', 'none');
      });
      button.dataset.sortDirection = direction;
      button.setAttribute('aria-sort', direction === 'asc' ? 'ascending' : 'descending');
      onSort(key, direction);
    }));
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
      addFrequencyCell(tableRow, item.count);
      addProfitCell(tableRow, item.minProfit);
      addProfitCell(tableRow, item.maxProfit);
      body.appendChild(tableRow);
    });
  }

  function renderHistoryRows(body, result, code = '') {
    body.innerHTML = '';
    if (!result.length) return empty(body, 5, 'Không tìm thấy dữ liệu');
    result.forEach(row => {
      const tableRow = document.createElement('tr');
      addTickerCell(tableRow, code || '-');
      addCell(tableRow, row.date);
      addFrequencyCell(tableRow, row.count);
      addProfitCell(tableRow, row.minProfit);
      addProfitCell(tableRow, row.maxProfit);
      body.appendChild(tableRow);
    });
  }

  return { empty, renderCodeRows, renderDateRows, renderHistoryRows, sortRows, bindSort };
})();
