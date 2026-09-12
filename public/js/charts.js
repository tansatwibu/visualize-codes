window.chartRenderer = (() => {
  let monthChart;
  let yearChart;

  function draw(canvasId, labels, values, color, month) {
    const oldChart = canvasId === 'monthChart' ? monthChart : yearChart;
    if (oldChart) oldChart.destroy();
    const isMonthChart = canvasId === 'monthChart';
    const chart = new Chart(document.getElementById(canvasId), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: color,
          barPercentage: isMonthChart ? 0.82 : 0.9,
          categoryPercentage: isMonthChart ? 0.9 : 0.8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: items => isMonthChart ? `Ngày ${items[0].label}/${month}` : items[0].label
            }
          }
        },
        scales: {
          x: { offset: true, ticks: { autoSkip: false, maxRotation: 0, minRotation: 0, padding: 0, font: { size: isMonthChart ? 8 : 11 } } },
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
    if (isMonthChart) monthChart = chart;
    else yearChart = chart;
  }

  return { draw };
})();
