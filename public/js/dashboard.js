window.dashboardPage = (() => {
  function init() {
    const buttons = document.querySelectorAll('.range-buttons button');
    const loader = document.getElementById('loader');
    const monthPicker = document.getElementById('monthPicker');
    const yearPicker = document.getElementById('yearPicker');
    const datePicker = document.getElementById('datePicker');
    const codeSearch = document.getElementById('codeSearch');
    const codeBody = document.querySelector('#codes-table tbody');
    const dateBody = document.querySelector('#date-table tbody');
    const historyBody = document.querySelector('#history-table tbody');
    let dailyRows = [];
    let initialMonthLoaded = false;
    let selectedDays = 30;
    let searchTimer;
    const cache = new Map();

    function setLoading(value) {
      loader.style.display = value ? 'block' : 'none';
    }

    function renderHistory(rows) {
      const query = codeSearch.value.trim().toLowerCase();
      const result = rows.filter(row => !query || (row.codes || []).some(code => String(code).toLowerCase().includes(query)) || row.date.includes(query));
      tableRenderer.renderHistoryRows(historyBody, result, codeSearch.value.trim());
    }

    async function loadCodes(days) {
      setLoading(true);
      try {
        const key = `codes:${days}`;
        const data = cache.get(key) || await apiClient.fetchJson(`/api/data?days=${days}&top=8`);
        cache.set(key, data);
        tableRenderer.renderCodeRows(codeBody, data.items || []);
      } catch (error) {
        tableRenderer.empty(codeBody, 4, 'Không thể tải dữ liệu');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    async function loadMonth(month) {
      setLoading(true);
      try {
        const key = `month:${month}`;
        const data = cache.get(key) || await apiClient.fetchJson(`/api/daily-counts?month=${month}`);
        cache.set(key, data);
        const chartDays = buildMonthChartDays(month, data.days || []);
        chartRenderer.draw('monthChart', chartDays.map(row => row.label), chartDays.map(row => row.count), '#999', monthPicker.value);
        if (!initialMonthLoaded) {
          dailyRows = data.days || [];
          renderHistory(dailyRows);
          initialMonthLoaded = true;
        }
      } catch (error) {
        tableRenderer.empty(historyBody, 4, 'Không thể tải dữ liệu ngày');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    async function loadDate(date) {
      if (!date) return tableRenderer.renderDateRows(dateBody, null);
      setLoading(true);
      try {
        const key = `date:${date}`;
        const data = cache.get(key) || await apiClient.fetchJson(`/api/daily-counts?start=${date}&end=${date}`);
        cache.set(key, data);
        tableRenderer.renderDateRows(dateBody, (data.days || [])[0]);
      } catch (error) {
        tableRenderer.empty(dateBody, 4, 'Không thể tải dữ liệu ngày');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    function buildMonthChartDays(month, rows) {
      const [year, monthNumber] = month.split('-').map(Number);
      const daysInMonth = new Date(year, monthNumber, 0).getDate();
      const countsByDate = new Map(rows.map(row => [row.date, row.count]));
      return Array.from({ length: daysInMonth }, (_, index) => {
        const day = String(index + 1).padStart(2, '0');
        const date = `${month}-${day}`;
        return { label: day, date, count: countsByDate.get(date) || 0 };
      });
    }

    async function loadYear(year) {
      try {
        const data = await apiClient.fetchJson(`/api/monthly-counts?year=${year}`);
        renderYearChart(year, data.months || []);
      } catch (error) {
        try {
          const data = await apiClient.fetchJson(`/api/daily-counts?start=${year}-01-01&end=${year}-12-31`);
          const values = new Map();
          (data.days || []).forEach(row => values.set(row.date.slice(0, 7), (values.get(row.date.slice(0, 7)) || 0) + row.count));
          renderYearChart(year, Array.from(values, ([month, count]) => ({ month, count })));
        } catch (fallbackError) {
          console.error(fallbackError);
        }
      }
    }

    function renderYearChart(year, monthlyRows) {
      const values = new Map(monthlyRows.map(item => [item.month, item.count]));
      const months = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
      chartRenderer.draw('yearChart', months.map(month => month.slice(5)), months.map(month => values.get(month) || 0), '#999');
    }

    async function searchCode() {
      const code = codeSearch.value.trim();
      if (!code) return renderHistory(dailyRows);
      try {
        setLoading(true);
        const data = await apiClient.fetchJson(`/api/code-history?code=${encodeURIComponent(code)}&days=${selectedDays}`);
        tableRenderer.renderHistoryRows(historyBody, data.days || [], data.code || code);
      } catch (error) {
        tableRenderer.empty(historyBody, 4, `Không thể tìm kiếm dữ liệu: ${error.message}`);
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    buttons.forEach(button => button.addEventListener('click', () => {
      buttons.forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      selectedDays = Number(button.dataset.days);
      loadCodes(selectedDays);
      if (codeSearch.value.trim()) searchCode();
    }));
    monthPicker.addEventListener('change', () => loadMonth(monthPicker.value));
    yearPicker.addEventListener('change', () => loadYear(yearPicker.value));
    datePicker.addEventListener('change', () => loadDate(datePicker.value));
    codeSearch.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(searchCode, 350);
    });

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    monthPicker.value = currentMonth;
    yearPicker.value = now.getFullYear();
    datePicker.value = now.toISOString().slice(0, 10);
    loadCodes(selectedDays);
    loadMonth(currentMonth);
    loadDate(datePicker.value);
    loadYear(now.getFullYear());
  }

  return { init };
})();
