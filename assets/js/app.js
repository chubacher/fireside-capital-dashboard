// @ts-nocheck
// @ts-nocheck
let deleteAssetIndex = null;
let editAssetIndex = null;
let editInvestmentIndex = null;
let deleteInvestmentIndex = null;
let editDebtIndex = null;
let deleteDebtIndex = null;
let editBillIndex = null;
let deleteBillIndex = null;
let editIncomeIndex = null;
let deleteIncomeIndex = null;


// —————— UTILS ——————
function formatCurrency(val) {
  const n = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.-]+/g, '')) || 0;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}
function getRaw(val) {
  return typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.-]+/g, '')) || 0;
}
function formatDate(iso) {
  if (!iso) return '-';
  const [year, month, day] = iso.split('-');
  return `${month}-${day}-${year}`;
}

function dedupeSnapshotsByDate(snapshots) {
  const map = new Map();
  snapshots.forEach(snap => {
    map.set(snap.date, snap); // if duplicate date, newer one wins
  });
  return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Initialize Supabase
const supabaseUrl = 'https://bgsdnlkhwgbdbdvmhrzv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnc2RubGtod2diZGJkdm1ocnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNjM0MjQsImV4cCI6MjA2NTczOTQyNH0.fCUUUrwn5Gy6J7KIMty3grq2a8GtNIHSqLLue3Q_nVM'; // Replace this with your actual key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Function to push local data to Supabase
async function pushLocalDataToSupabase() {
  const tables = ['assets', 'bills', 'debts', 'investments', 'snapshots'];

  for (const table of tables) {
    const localData = JSON.parse(localStorage.getItem(table) || '[]');

    if (localData.length > 0) {
      const { error } = await supabase.from(table).upsert(localData, { onConflict: 'id' });
      if (error) {
        console.error(`Error uploading ${table}:`, error.message);
      } else {
        console.log(`✅ Uploaded ${localData.length} rows to ${table}`);
      }
    }
  }
}
// —————— SNAPSHOT & DASHBOARD ——————
const historical = [
  { date: '2025-06-16', netWorth: 247278 }
];

let snaps = JSON.parse(localStorage.getItem('snapshots') || '[]');

// Add missing ones
historical.forEach(entry => {
  if (!snaps.some(s => s.date === entry.date)) {
    snaps.push(entry);
  }
});

localStorage.setItem('snapshots', JSON.stringify(snaps));


function saveSnapshot() {
  const invs = JSON.parse(localStorage.getItem('investments') || '[]');
  const debts = JSON.parse(localStorage.getItem('debts') || '[]');
  const assets = JSON.parse(localStorage.getItem('assets') || '[]');

  const totalInv = invs.reduce((sum, i) => sum + getRaw(i.value), 0);
  const totalDebt = debts.reduce((sum, d) => sum + getRaw(d.amount), 0);
  const totalAssetEquity = assets.reduce((sum, a) => Math.max(sum + getRaw(a.value) - getRaw(a.loan), 0), 0);
  const net = totalInv + totalAssetEquity - totalDebt;

  [['totalInvestments', totalInv], ['totalDebts', totalDebt], ['totalAssets', totalAssetEquity], ['netWorth', net]]
    .forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatCurrency(val);
    });

  const today = new Date().toISOString().split('T')[0];
  let snaps = JSON.parse(localStorage.getItem('snapshots') || '[]');

  // Only add new snapshot if one doesn't already exist for today
  if (!snaps.some(s => s.date === today)) {np
    snaps.push({ date: today, netWorth: net });
    localStorage.setItem('snapshots', JSON.stringify(snaps));
  }
}


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



// —————— ASSETS ——————
function loadAssets() {
  const data = JSON.parse(localStorage.getItem('assets') || '[]');
  window.assets = data;
}

function renderAssets() {
  const tbody = document.getElementById('assetTableBody');
  if (!tbody || !window.assets) return;
  tbody.innerHTML = '';
  window.assets.forEach((a, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.name}</td>
      <td>${a.type}</td>
      <td>${formatCurrency(a.value)}</td>
      <td>${formatCurrency(a.loan)}</td>
      <td>${formatCurrency(Math.max(getRaw(a.value) - getRaw(a.loan), 0))}</td>
      <td>${a.nextDueDate ? formatDate(a.nextDueDate) : '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openAssetModal(${i})" title="Edit">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteAsset(${i})" title="Delete">
          <i class="bi bi-trash"></i>
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('assetForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  const f = document;
  const type = f.getElementById('assetType').value;

  let asset = {
    name: f.getElementById('assetName').value,
    type,
    nextDueDate:
      type === 'realEstate'
        ? f.getElementById('realEstateNextDueDate')?.value || ''
        : f.getElementById('vehicleNextDueDate')?.value || ''
  };

  if (type === 'realEstate') {
    asset.purchasePrice = getRaw(f.getElementById('purchasePrice').value);
    asset.purchaseDate = f.getElementById('purchaseDate').value;
    asset.value = getRaw(f.getElementById('propertyValue').value);
    asset.loan = getRaw(f.getElementById('loanAmount').value);
    asset.interestRate = getRaw(f.getElementById('interestRate').value);
    asset.termYears = getRaw(f.getElementById('termYears').value);
  } else if (type === 'vehicle') {
    asset.value = getRaw(f.getElementById('vehicleValue').value);
    asset.loan = getRaw(f.getElementById('vehicleLoanBalance').value);
    asset.loanStartDate = f.getElementById('vehicleLoanStartDate').value;
    asset.interestRate = getRaw(f.getElementById('vehicleInterestRate').value);
  }

  if (editAssetIndex !== null) {
    window.assets[editAssetIndex] = asset;
    editAssetIndex = null;
  } else {
    window.assets.push(asset);
  }

  localStorage.setItem('assets', JSON.stringify(window.assets));
  renderAssets();
  saveSnapshot();
  bootstrap.Modal.getInstance(document.getElementById('addAssetModal')).hide();
  f.getElementById('assetForm').reset();
});

function openAssetModal(idx = null) {
  const f = document;
  editAssetIndex = idx;
  document.querySelectorAll('.asset-fields').forEach(el => el.classList.add('d-none'));
  f.getElementById('assetForm').reset();

  if (idx !== null) {
    const a = window.assets[idx];
    f.getElementById('assetName').value = a.name;
    f.getElementById('assetType').value = a.type;

    if (a.type === 'realEstate') {
      document.querySelector('.real-estate-fields').classList.remove('d-none');
      f.getElementById('purchasePrice').value = a.purchasePrice || '';
      f.getElementById('purchaseDate').value = a.purchaseDate || '';
      f.getElementById('propertyValue').value = a.value || '';
      f.getElementById('loanAmount').value = a.loan || '';
      f.getElementById('interestRate').value = a.interestRate || '';
      f.getElementById('termYears').value = a.termYears || '';
      f.getElementById('realEstateNextDueDate').value = a.nextDueDate || '';
    } else {
      document.querySelector('.vehicle-fields').classList.remove('d-none');
      f.getElementById('vehicleValue').value = a.value || '';
      f.getElementById('vehicleLoanBalance').value = a.loan || '';
      f.getElementById('vehicleLoanStartDate').value = a.loanStartDate || '';
      f.getElementById('vehicleInterestRate').value = a.interestRate || '';
      f.getElementById('vehicleNextDueDate').value = a.nextDueDate || '';
    }
  }

  new bootstrap.Modal(document.getElementById('addAssetModal')).show();
}

function deleteAsset(index) {
  const asset = window.assets[index];
  if (!asset) return;

  deleteAssetIndex = index;
  document.getElementById('deleteAssetName').textContent = `"${asset.name}"`;
  const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
  modal.show();
}

// —————— INVESTMENTS ——————
function loadInvestments() {
  const data = JSON.parse(localStorage.getItem('investments') || '[]');
  window.investments = data;
}

function renderInvestments() {
  const tbody = document.getElementById('investmentTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  window.investments.forEach((inv, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${inv.name}</td>
      <td>${inv.type}</td>
      <td>${formatCurrency(inv.startingBalance)}</td>
      <td>${formatCurrency(inv.monthlyContribution)}</td>
      <td>${inv.annualReturn}%</td>
      <td>${inv.nextContributionDate ? formatDate(inv.nextContributionDate) : '-'}</td>
      <td>${formatCurrency(inv.value)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editInvestment(${i})" title="Edit">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteInvestment(${i})" title="Delete">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editInvestment(index) {
  const f = document;
  const i = window.investments[index];
  if (!i) return;

  editInvestmentIndex = index;
  f.getElementById('investmentName').value = i.name;
  f.getElementById('investmentType').value = i.type;
  f.getElementById('startingBalance').value = i.startingBalance;
  f.getElementById('monthlyContribution').value = i.monthlyContribution;
  f.getElementById('annualReturn').value = i.annualReturn;
  f.getElementById('investmentValue').value = i.value;
  f.getElementById('nextContributionDate').value = i.nextContributionDate || '';

  new bootstrap.Modal(document.getElementById('addInvestmentModal')).show();
}

function confirmDeleteInvestment(index) {
  deleteInvestmentIndex = index;
  const item = window.investments[index];
  if (!item) return;
  if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
    deleteInvestment(index);
  }
}

function deleteInvestment(index) {
  window.investments.splice(index, 1);
  localStorage.setItem('investments', JSON.stringify(window.investments));
  renderInvestments();
  saveSnapshot();
}

document.getElementById('investmentForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  const f = document;
  const investment = {
    name: f.getElementById('investmentName').value,
    type: f.getElementById('investmentType').value,
    startingBalance: getRaw(f.getElementById('startingBalance').value),
    monthlyContribution: getRaw(f.getElementById('monthlyContribution').value),
    annualReturn: parseFloat(f.getElementById('annualReturn').value),
    value: getRaw(f.getElementById('investmentValue').value),
    nextContributionDate: f.getElementById('nextContributionDate').value
  };

  if (editInvestmentIndex !== null) {
    window.investments[editInvestmentIndex] = investment;
  } else {
    window.investments.push(investment);
  }

  localStorage.setItem('investments', JSON.stringify(window.investments));
  renderInvestments();
  saveSnapshot();
  bootstrap.Modal.getInstance(document.getElementById('addInvestmentModal')).hide();
  f.getElementById('investmentForm').reset();
  editInvestmentIndex = null;
});

// —————— DEBTS ——————
function loadDebts() {
  const data = JSON.parse(localStorage.getItem('debts') || '[]');
  window.debts = data;
}

function renderDebts() {
  const tbody = document.getElementById('debtTableBody');
  if (!tbody || !window.debts) return;
  tbody.innerHTML = '';
  window.debts.forEach((d, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.name}</td>
      <td>${d.type}</td>
      <td>${formatCurrency(d.amount)}</td>
      <td>${d.interestRate}%</td>
      <td>${d.term}</td>
      <td>${formatCurrency(d.monthlyPayment)}</td>
      <td>${d.nextDueDate ? formatDate(d.nextDueDate) : '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editDebt(${i})"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteDebt(${i})"><i class="bi bi-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function editDebt(index) {
  const d = window.debts[index];
  if (!d) return;
  editDebtIndex = index;
  const f = document;
  f.getElementById('debtName').value = d.name;
  f.getElementById('debtType').value = d.type;
  f.getElementById('debtAmount').value = d.amount;
  f.getElementById('debtInterest').value = d.interestRate;
  f.getElementById('debtTerm').value = d.term;
  f.getElementById('debtMonthly').value = d.monthlyPayment;
  f.getElementById('debtNextPaymentDate').value = d.nextDueDate || '';
  new bootstrap.Modal(document.getElementById('addDebtModal')).show();
}

function confirmDeleteDebt(index) {
  deleteDebtIndex = index;
  const item = window.debts[index];
  document.getElementById('deleteDebtName').textContent = `"${item.name}"`;
  new bootstrap.Modal(document.getElementById('confirmDeleteDebtModal')).show();
}

function deleteDebtConfirmed() {
  if (deleteDebtIndex !== null) {
    window.debts.splice(deleteDebtIndex, 1);
    localStorage.setItem('debts', JSON.stringify(window.debts));
    renderDebts();
    saveSnapshot();
    deleteDebtIndex = null;
    bootstrap.Modal.getInstance(document.getElementById('confirmDeleteDebtModal')).hide();
  }
}

document.getElementById('debtForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  const f = document;
  const debt = {
    name: f.getElementById('debtName').value,
    type: f.getElementById('debtType').value,
    amount: getRaw(f.getElementById('debtAmount').value),
    interestRate: parseFloat(f.getElementById('debtInterest').value),
    term: parseInt(f.getElementById('debtTerm').value, 10),
    monthlyPayment: getRaw(f.getElementById('debtMonthly').value),
    nextDueDate: f.getElementById('debtNextPaymentDate').value
  };

  if (editDebtIndex !== null) {
    window.debts[editDebtIndex] = debt;
    editDebtIndex = null;
  } else {
    window.debts.push(debt);
  }

  localStorage.setItem('debts', JSON.stringify(window.debts));
  renderDebts();
  saveSnapshot();
  bootstrap.Modal.getInstance(document.getElementById('addDebtModal')).hide();
  f.getElementById('debtForm').reset();
});

// —————— BILLS ——————
function loadBills() {
  const data = JSON.parse(localStorage.getItem('bills') || '[]');
  window.bills = data;
}

function renderBills() {
  const tbody = document.getElementById('billTableBody');
  if (!tbody || !window.bills) return;
  tbody.innerHTML = '';
  window.bills.forEach((b, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.name}</td>
      <td>${b.type}</td>
      <td>${formatCurrency(b.amount)}</td>
      <td>${b.frequency}</td>
      <td>${b.nextDueDate ? formatDate(b.nextDueDate) : '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editBill(${i})"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteBill(${i})"><i class="bi bi-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function editBill(index) {
  const b = window.bills[index];
  if (!b) return;
  editBillIndex = index;
  const f = document;
  f.getElementById('billName').value = b.name;
  f.getElementById('billType').value = b.type;
  f.getElementById('billAmount').value = b.amount;
  f.getElementById('billFrequency').value = b.frequency;
  f.getElementById('billNextDueDate').value = b.nextDueDate || '';
  new bootstrap.Modal(document.getElementById('addBillModal')).show();
}

function confirmDeleteBill(index) {
  deleteBillIndex = index;
  const item = window.bills[index];
  document.getElementById('deleteBillName').textContent = `"${item.name}"`;
  new bootstrap.Modal(document.getElementById('confirmDeleteBillModal')).show();
}

function deleteBillConfirmed() {
  if (deleteBillIndex !== null) {
    window.bills.splice(deleteBillIndex, 1);
    localStorage.setItem('bills', JSON.stringify(window.bills));
    renderBills();
    deleteBillIndex = null;
    bootstrap.Modal.getInstance(document.getElementById('confirmDeleteBillModal')).hide();
  }
}

document.getElementById('billForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  const f = document;
  const bill = {
    name: f.getElementById('billName').value,
    type: f.getElementById('billType').value,
    amount: getRaw(f.getElementById('billAmount').value),
    frequency: f.getElementById('billFrequency').value,
    nextDueDate: f.getElementById('billNextDueDate').value
  };

  if (editBillIndex !== null) {
    window.bills[editBillIndex] = bill;
    editBillIndex = null;
  } else {
    window.bills.push(bill);
  }

  localStorage.setItem('bills', JSON.stringify(window.bills));
  renderBills();
  bootstrap.Modal.getInstance(document.getElementById('addBillModal')).hide();
  f.getElementById('billForm').reset();
});

// —————— INCOME ——————
function loadIncome() {
  const data = JSON.parse(localStorage.getItem('income') || '[]');
  window.income = data;
}

function renderIncome() {
  const tbody = document.getElementById('incomeTableBody');
  if (!tbody || !window.income) return;
  tbody.innerHTML = '';
  window.income.forEach((i, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i.name}</td>
      <td>${i.type}</td>
      <td>${formatCurrency(i.amount)}</td>
      <td>${i.frequency}</td>
      <td>${i.nextDueDate ? formatDate(i.nextDueDate) : '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editIncome(${index})"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteIncome(${index})"><i class="bi bi-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editIncome(index) {
  const i = window.income[index];
  if (!i) return;
  editIncomeIndex = index;
  const f = document;
  f.getElementById('incomeName').value = i.name;
  f.getElementById('incomeType').value = i.type;
  f.getElementById('incomeAmount').value = i.amount;
  f.getElementById('incomeFrequency').value = i.frequency;
  f.getElementById('incomeNextDueDate').value = i.nextDueDate || '';
  new bootstrap.Modal(document.getElementById('addIncomeModal')).show();
}

function confirmDeleteIncome(index) {
  deleteIncomeIndex = index;
  const item = window.income[index];
  document.getElementById('deleteIncomeName').textContent = `${item.name}`;
  new bootstrap.Modal(document.getElementById('confirmDeleteIncomeModal')).show();
}

function deleteIncomeConfirmed() {
  if (deleteIncomeIndex !== null) {
    window.income.splice(deleteIncomeIndex, 1);
    localStorage.setItem('income', JSON.stringify(window.income));
    renderIncome();
    deleteIncomeIndex = null;
    bootstrap.Modal.getInstance(document.getElementById('confirmDeleteIncomeModal')).hide();
  }
}

document.getElementById('incomeForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  const f = document;
  const income = {
    name: f.getElementById('incomeName').value,
    type: f.getElementById('incomeType').value,
    amount: getRaw(f.getElementById('incomeAmount').value),
    frequency: f.getElementById('incomeFrequency').value,
    nextDueDate: f.getElementById('incomeNextDueDate').value
  };

  if (editIncomeIndex !== null) {
    window.income[editIncomeIndex] = income;
    editIncomeIndex = null;
  } else {
    window.income.push(income);
  }

  localStorage.setItem('income', JSON.stringify(window.income));
  renderIncome();
  bootstrap.Modal.getInstance(document.getElementById('addIncomeModal')).hide();
  f.getElementById('incomeForm').reset();
});

// —————— MONTHLY CASHFLOW ——————
      // —————— INCOME PROJECTION ——————
function getIncomeProjections(income, monthsAhead = 12) {
  const projections = [];
  const today = new Date();
  const endDate = new Date();
  endDate.setMonth(today.getMonth() + monthsAhead);

  let next = new Date(income.nextDueDate);
  if (isNaN(next)) return projections;

  while (next <= endDate) {
    if (next >= today) {
      projections.push({
        date: next.toISOString().split('T')[0],
        name: income.name,
        amount: getRaw(income.amount)
      });
    }

    switch (income.frequency) {
      case 'Bi-Weekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'Monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'Annually':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        break;
    }
  }

  return projections;
}
      // —————— MONTHLY CASH FLOW ——————
      function getThemeColors() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        return {
          text: isDark ? '#f1f1f1' : '#000000',
          grid: isDark ? '#666666' : '#d0d0d0', // << this was too dark before
          fill: isDark ? 'rgba(0,123,255,0.15)' : 'rgba(0,123,255,0.05)'
        };
      }
      

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
      
      
      function getNextDate(date, frequency) {
        const next = new Date(date);
        switch ((frequency || '').toLowerCase()) {
          case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
          case 'bi-weekly':
          case 'biweekly':
            next.setDate(next.getDate() + 14);
            break;
          case 'quarterly':
            next.setMonth(next.getMonth() + 3);
            break;
          case 'annually':
            next.setFullYear(next.getFullYear() + 1);
            break;
          default:
            next.setMonth(next.getMonth() + 1); // fallback
        }
        return next;
      }
      

// —————— UPCOMING PAYMENTS ——————
function renderUpcomingPayments() {
  const container = document.getElementById('upcomingPaymentsList');
  if (!container) return;

  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const debts = JSON.parse(localStorage.getItem('debts') || '[]');
  const bills = JSON.parse(localStorage.getItem('bills') || '[]');
  const income = JSON.parse(localStorage.getItem('income') || '[]');
  

  const all = [...debts.map(d => ({
    name: d.name,
    type: d.type,
    amount: d.monthlyPayment,
    due: d.nextDueDate,
    category: 'Debt'
  })), ...bills.map(b => ({
    name: b.name,
    type: b.type,
    amount: b.amount,
    due: b.nextDueDate,
    category: 'Bill'
  })), ...income.map(b => ({
    name: b.name,
    type: b.type,
    amount: b.amount,
    due: b.nextDueDate,
    category: 'Income'
  }))];

  const upcoming = all.filter(item => {
    if (!item.due) return false;
    const dueDate = new Date(item.due);
    return dueDate >= today && dueDate <= nextWeek;
  });

  // Sort by due date
  upcoming.sort((a, b) => new Date(a.due) - new Date(b.due));

  // Grouped layout
  if (upcoming.length === 0) {
    container.innerHTML = `<div class="text-muted">No upcoming payments this week.</div>`;
    return;
  }

  container.innerHTML = upcoming.map(item => `
    <div class="d-flex justify-content-between border-bottom py-2">
      <div>
        <strong>${item.name}</strong> <span class="text-muted">(${item.category})</span><br>
        <small class="text-muted">${item.type}</small>
      </div>
      <div class="text-end">
        <div>${formatCurrency(item.amount)}</div>
        <small class="text-muted">${formatDate(item.due)}</small>
      </div>
    </div>
  `).join('');
}
 // -----Toggle Dark Mode -----
 const themeSwitch = document.getElementById('themeSwitch');
const themeLabel = document.querySelector('label[for="themeSwitch"]');

themeSwitch?.addEventListener('change', function () {
  const isDark = this.checked;
  document.body.setAttribute('data-theme', isDark ? 'dark' : '');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  if (themeLabel) themeLabel.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
});


// Load from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  const toggle = document.getElementById('themeSwitch');
  if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    if (toggle) toggle.checked = true;
  }
});
// —————— INIT ——————
window.addEventListener('DOMContentLoaded', function () {
  loadAssets();
  loadInvestments();
  renderAssets();
  renderInvestments();
  saveSnapshot();
  loadDebts();
  renderDebts();
  loadBills();
  renderBills();
  renderUpcomingPayments();
  loadIncome();
  renderIncome();
  renderNetWorthChart();
  generateMonthlyCashFlowChart();  

  

  const assetTypeEl = document.getElementById('assetType');
  if (assetTypeEl) {
    assetTypeEl.addEventListener('change', function (e) {
      document.querySelectorAll('.asset-fields').forEach(el => el.classList.add('d-none'));
      const selector = (e.target.value === 'realEstate') ? '.real-estate-fields' : '.vehicle-fields';
      const showEl = document.querySelector(selector);
      if (showEl) showEl.classList.remove('d-none');
    });
  }
});

document.getElementById('themeToggle').addEventListener('change', () => {
  document.body.setAttribute('data-theme', themeToggle.checked ? 'dark' : 'light');
  renderNetWorthChart();
  generateMonthlyCashFlowChart();
});

