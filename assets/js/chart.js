// —————— NET WORTH CHART ——————
let netWorthChart;
let cashFlowChart;

function renderNetWorthChart() {
  const ctx = document.getElementById('netWorthTimelineChart');
  if (!ctx) return;

  if (netWorthChart) netWorthChart.destroy(); // Clean up before re-render

  let snaps = JSON.parse(localStorage.getItem('snapshots') || '[]');
  snaps = dedupeSnapshotsByDate(snaps);

  const theme = getThemeColors();

  netWorthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: snaps.map(s => s.date),
      datasets: [{
        label: 'Net Worth',
        data: snaps.map(s => getRaw(s.netWorth)),
        borderColor: '#007bff',
        backgroundColor: theme.fill,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: null, // Remove hard cap
          ticks: {
            callback: v => formatCurrency(v),
            color: theme.text || '#ccc'
          },
          grid: {
            color: theme.grid || '#444'
          }
        },
        x: {
          ticks: {
            color: theme.text || '#ccc'
          },
          grid: {
            color: theme.grid || '#444'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// —————— CASH FLOW CHART ——————
function generateMonthlyCashFlowChart() {
    const ctx = document.getElementById('cashFlowChart')?.getContext('2d');
    if (!ctx) return;
  
    const income = JSON.parse(localStorage.getItem('income') || '[]');
    const bills = JSON.parse(localStorage.getItem('bills') || '[]');
    const debts = JSON.parse(localStorage.getItem('debts') || '[]');
    const investments = JSON.parse(localStorage.getItem('investments') || '[]');
  
    const today = new Date();
    const months = [];
    const incomeTotals = [];
    const expenseTotals = [];
  
    // Loop through next 6 months
    for (let i = 0; i < 6; i++) {
      const month = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthStart = new Date(month);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  
      months.push(month.toLocaleString('default', { month: 'long' }));
  
      let incomeSum = 0;
      let expenseSum = 0;
  
      income.forEach((item) => {
        const pay = parseFloat(item.amount);
        let nextDate = new Date(item.nextDueDate || item.nextPaymentDate || item.due || today);
        const frequency = (item.frequency || '').toLowerCase();

  
        while (nextDate <= monthEnd) {
          if (nextDate >= monthStart && nextDate <= monthEnd) {
            incomeSum += pay;
          }
          nextDate = getNextDate(nextDate, item.frequency);
        }
      });
  
      bills.forEach((item) => {
        const cost = parseFloat(item.amount);
        let nextDate = new Date(item.nextDueDate || today);
  
        while (nextDate <= monthEnd) {
          if (nextDate >= monthStart && nextDate <= monthEnd) {
            expenseSum += cost;
          }
          nextDate = getNextDate(nextDate, item.frequency);
        }
      });

      debts.forEach((item) => {
        const cost = parseFloat(item.monthlyPayment || 0);
        let nextDate = new Date(item.nextDueDate || today);
        const frequency = 'monthly'; // Assume monthly by default for debts
      
        while (nextDate <= monthEnd) {
          if (nextDate >= monthStart && nextDate <= monthEnd) {
            expenseSum += cost;
          }
          nextDate = getNextDate(nextDate, frequency);
        }
      });
      investments.forEach((item) => {
        const contrib = parseFloat(item.monthlyContribution || 0);
        let nextDate = new Date(item.nextContributionDate || today);
        const frequency = 'monthly'; // Assume monthly contributions
      
        while (nextDate <= monthEnd) {
          if (nextDate >= monthStart && nextDate <= monthEnd) {
            expenseSum += contrib;
          }
          nextDate = getNextDate(nextDate, frequency);
        }
      });          
  
      incomeTotals.push(incomeSum);
      expenseTotals.push(expenseSum);
    }
  
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Income',
            data: incomeTotals,
            backgroundColor: '#4e73df'
          },
          {
            label: 'Expenses',
            data: expenseTotals,
            backgroundColor: '#e74a3b'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom', // or 'top'
            labels: {
              color: getComputedStyle(document.body).getPropertyValue('--chart-text-color') || '#000',
              font: {
                size: 14 // increase legend text size
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: getComputedStyle(document.body).getPropertyValue('--chart-text-color') || '#000',
              font: {
                size: 14 // increase X-axis label size
              }
            }
          },
          y: {
            title: {
              display: true,
              text: 'Amount ($)',
              color: getComputedStyle(document.body).getPropertyValue('--chart-text-color') || '#000',
              font: {
                size: 14
              }
            },
            ticks: {
              color: getComputedStyle(document.body).getPropertyValue('--chart-text-color') || '#000',
              font: {
                size: 14 // increase Y-axis label size
              },
              callback: v => formatCurrency(v)
            }
          }
        }
      }
    });
  } 

  export {renderNetWorthChart, generateMonthlyCashFlowChart };