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

// —————— SNAPSHOT & DASHBOARD ——————
function saveSnapshot() {
  const invs = JSON.parse(localStorage.getItem('investments') || '[]');
  const debts = JSON.parse(localStorage.getItem('debts') || '[]');
  const assets = JSON.parse(localStorage.getItem('assets') || '[]');

  const totalInv = invs.reduce((sum, i) => sum + getRaw(i.value), 0);
  const totalDebt = debts.reduce((sum, d) => sum + getRaw(d.amount), 0);
  const totalAssetEquity = assets.reduce((sum, a) => sum + Math.max(getRaw(a.value) - getRaw(a.loan), 0), 0);
  const net = totalInv + totalAssetEquity - totalDebt;

  [['totalInvestments', totalInv], ['totalDebts', totalDebt], ['totalAssets', totalAssetEquity], ['netWorth', net]]
    .forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatCurrency(val);
    });

  const snaps = JSON.parse(localStorage.getItem('snapshots') || '[]');
  const today = new Date().toISOString().slice(0, 10);
  if (!snaps.find(s => s.date === today)) {
    snaps.push({ date: today, netWorth: net });
    localStorage.setItem('snapshots', JSON.stringify(snaps));
  }
}

// —————— NET WORTH CHART ——————
function renderNetWorthChart() {
  const ctx = document.getElementById('netWorthTimelineChart');
  if (!ctx) return;
  const snaps = JSON.parse(localStorage.getItem('snapshots') || '[]');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: snaps.map(s => s.date),
      datasets: [{
        label: 'Net Worth',
        data: snaps.map(s => getRaw(s.netWorth)),
        borderColor: '#007bff',
        backgroundColor: 'rgba(0,123,255,0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { ticks: { callback: v => formatCurrency(v) } } },
      plugins: { legend: { display: false } }
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

// —————— UPCOMING PAYMENTS ——————
function renderUpcomingPayments() {
  const container = document.getElementById('upcomingPaymentsList');
  if (!container) return;

  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const debts = JSON.parse(localStorage.getItem('debts') || '[]');
  const bills = JSON.parse(localStorage.getItem('bills') || '[]');

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

// —————— INIT ——————
window.addEventListener('DOMContentLoaded', function () {
  loadAssets();
  loadInvestments();
  renderAssets();
  renderInvestments();
  saveSnapshot();
  renderNetWorthChart();
  loadDebts();
  renderDebts();
  loadBills();
  renderBills();
  renderUpcomingPayments();
  
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
