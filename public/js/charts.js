window.chartRenderer = (() => {
  let monthChart;
  let yearChart;

  function createGradient(ctx, chartArea) {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#1d4ed8');
    return gradient;
  }

  function draw(canvasId, labels, values, color, month) {
    const oldChart = canvasId === 'monthChart' ? monthChart : yearChart;
    if (oldChart) oldChart.destroy();
    const isMonthChart = canvasId === 'monthChart';
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return '#3b82f6';
            return createGradient(c, chartArea);
          },
          hoverBackgroundColor: '#2563eb',
          borderRadius: 3,
          barPercentage: isMonthChart ? 0.75 : 0.7,
          categoryPercentage: isMonthChart ? 0.85 : 0.7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0d1526',
            borderColor: '#283548',
            borderWidth: 1,
            titleColor: '#eef2f7',
            bodyColor: '#8b9bb4',
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: items => isMonthChart ? `Ngày ${items[0].label}/${month}` : `Tháng ${items[0].label}`,
              label: item => `${item.raw} lượt`
            }
          }
        },
        scales: {
          x: {
            offset: true,
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0,
              padding: 4,
              font: { size: isMonthChart ? 8 : 11 },
              color: '#5a6a82'
            },
            border: { color: '#283548' }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(40,53,72,0.5)',
              drawBorder: false
            },
            ticks: {
              precision: 0,
              color: '#5a6a82',
              font: { size: 10 }
            },
            border: { display: false }
          }
        }
      }
    });
    if (isMonthChart) monthChart = chart;
    else yearChart = chart;
  }

  return { draw };
})();
