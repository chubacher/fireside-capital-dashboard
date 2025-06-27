// transactions.js

// ========== STORAGE UTIL ========== //
function getData(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}

function setData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ========== GENERIC RENDER FUNCTION ========== //
function renderTable(key, tableBodyId, formatRowFn) {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;
  const items = getData(key);
  tbody.innerHTML = '';
  items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = formatRowFn(item, index);
    tbody.appendChild(row);
  });
}

// ========== BILLS ========== //
const BILL_STORAGE_KEY = 'fireside_bills';
function renderBills() {
  renderTable(BILL_STORAGE_KEY, 'billTableBody', (bill, index) => `
    <td>${bill.name}</td>
    <td>${bill.type}</td>
    <td>$${parseFloat(bill.amount).toFixed(2)}</td>
    <td>${bill.frequency}</td>
    <td>${bill.nextDueDate || ''}</td>
    <td>
      <button class="btn btn-sm btn-outline-secondary me-2" onclick="editBill(${index})"><i class="bi bi-pencil"></i></button>
      <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteBill(${index})"><i class="bi bi-trash"></i></button>
    </td>
  `);
}

function addOrUpdateBill(e) {
  e.preventDefault();
  const form = e.target;
  const bills = getData(BILL_STORAGE_KEY);
  const bill = {
    name: form.billName.value,
    type: form.billType.value,
    amount: parseFloat(form.billAmount.value),
    frequency: form.billFrequency.value,
    nextDueDate: form.billNextDueDate.value || '',
  };
  const index = form.dataset.editIndex;
  if (index) {
    bills[parseInt(index)] = bill;
    delete form.dataset.editIndex;
  } else {
    bills.push(bill);
  }
  setData(BILL_STORAGE_KEY, bills);
  renderBills();
  form.reset();
  bootstrap.Modal.getInstance(document.getElementById('addBillModal')).hide();
}

function editBill(index) {
  const bill = getData(BILL_STORAGE_KEY)[index];
  const form = document.getElementById('billForm');
  form.billName.value = bill.name;
  form.billType.value = bill.type;
  form.billAmount.value = bill.amount;
  form.billFrequency.value = bill.frequency;
  form.billNextDueDate.value = bill.nextDueDate;
  form.dataset.editIndex = index;
  new bootstrap.Modal(document.getElementById('addBillModal')).show();
}

let deleteBillIndex = null;
function confirmDeleteBill(index) {
  deleteBillIndex = index;
  document.getElementById('deleteBillName').textContent = getData(BILL_STORAGE_KEY)[index].name;
  new bootstrap.Modal(document.getElementById('confirmDeleteBillModal')).show();
}
function deleteBillConfirmed() {
  const bills = getData(BILL_STORAGE_KEY);
  bills.splice(deleteBillIndex, 1);
  setData(BILL_STORAGE_KEY, bills);
  renderBills();
  deleteBillIndex = null;
  bootstrap.Modal.getInstance(document.getElementById('confirmDeleteBillModal')).hide();
}

// ========== INCOME ========== //
const INCOME_STORAGE_KEY = 'fireside_income';
function renderIncome() {
  renderTable(INCOME_STORAGE_KEY, 'incomeTableBody', (income, index) => `
    <td>${income.name}</td>
    <td>${income.type}</td>
    <td>$${parseFloat(income.amount).toFixed(2)}</td>
    <td>${income.frequency}</td>
    <td>${income.nextDueDate || ''}</td>
    <td>
      <button class="btn btn-sm btn-outline-secondary me-2" onclick="editIncome(${index})"><i class="bi bi-pencil"></i></button>
      <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteIncome(${index})"><i class="bi bi-trash"></i></button>
    </td>
  `);
}

function addOrUpdateIncome(e) {
  e.preventDefault();
  const form = e.target;
  const incomeList = getData(INCOME_STORAGE_KEY);
  const income = {
    name: form.incomeName.value,
    type: form.incomeType.value,
    amount: parseFloat(form.incomeAmount.value),
    frequency: form.incomeFrequency.value,
    nextDueDate: form.incomeNextDueDate.value || '',
  };
  const index = form.dataset.editIndex;
  if (index) {
    incomeList[parseInt(index)] = income;
    delete form.dataset.editIndex;
  } else {
    incomeList.push(income);
  }
  setData(INCOME_STORAGE_KEY, incomeList);
  renderIncome();
  form.reset();
  bootstrap.Modal.getInstance(document.getElementById('addIncomeModal')).hide();
}

function editIncome(index) {
  const income = getData(INCOME_STORAGE_KEY)[index];
  const form = document.getElementById('incomeForm');
  form.incomeName.value = income.name;
  form.incomeType.value = income.type;
  form.incomeAmount.value = income.amount;
  form.incomeFrequency.value = income.frequency;
  form.incomeNextDueDate.value = income.nextDueDate;
  form.dataset.editIndex = index;
  new bootstrap.Modal(document.getElementById('addIncomeModal')).show();
}

let deleteIncomeIndex = null;
function confirmDeleteIncome(index) {
  deleteIncomeIndex = index;
  document.getElementById('deleteIncomeName').textContent = getData(INCOME_STORAGE_KEY)[index].name;
  new bootstrap.Modal(document.getElementById('confirmDeleteIncomeModal')).show();
}
function deleteIncomeConfirmed() {
  const incomeList = getData(INCOME_STORAGE_KEY);
  incomeList.splice(deleteIncomeIndex, 1);
  setData(INCOME_STORAGE_KEY, incomeList);
  renderIncome();
  deleteIncomeIndex = null;
  bootstrap.Modal.getInstance(document.getElementById('confirmDeleteIncomeModal')).hide();
}

// ========== ASSETS ========== //
const ASSET_STORAGE_KEY = 'fireside_assets';
function renderAssets() {
  renderTable(ASSET_STORAGE_KEY, 'assetTableBody', (asset, index) => `
    <td>${asset.name}</td>
    <td>${asset.type}</td>
    <td>$${parseFloat(asset.currentValue).toFixed(2)}</td>
    <td>$${parseFloat(asset.loanBalance || 0).toFixed(2)}</td>
    <td>$${(parseFloat(asset.currentValue || 0) - parseFloat(asset.loanBalance || 0)).toFixed(2)}</td>
    <td>${asset.nextDueDate || ''}</td>
    <td>
      <button class="btn btn-sm btn-outline-secondary me-2" onclick="editAsset(${index})"><i class="bi bi-pencil"></i></button>
      <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteAsset(${index})"><i class="bi bi-trash"></i></button>
    </td>
  `);
}

function addOrUpdateAsset(e) {
  e.preventDefault();
  const form = e.target;
  const assets = getData(ASSET_STORAGE_KEY);

  const type = form.assetType.value;
  let asset = {
    name: form.assetName.value,
    type: type,
  };

  if (type === 'realEstate') {
    asset.currentValue = parseFloat(form.propertyValue.value);
    asset.loanBalance = parseFloat(form.loanAmount.value);
    asset.nextDueDate = form.realEstateNextDueDate.value;
  } else {
    asset.currentValue = parseFloat(form.vehicleValue.value);
    asset.loanBalance = parseFloat(form.vehicleLoanBalance.value);
    asset.nextDueDate = form.vehicleNextDueDate.value;
  }

  const index = form.dataset.editIndex;
  if (index) {
    assets[parseInt(index)] = asset;
    delete form.dataset.editIndex;
  } else {
    assets.push(asset);
  }
  setData(ASSET_STORAGE_KEY, assets);
  renderAssets();
  form.reset();
  bootstrap.Modal.getInstance(document.getElementById('addAssetModal')).hide();
}

function editAsset(index) {
  const asset = getData(ASSET_STORAGE_KEY)[index];
  const form = document.getElementById('assetForm');
  form.assetName.value = asset.name;
  form.assetType.value = asset.type;
  form.dataset.editIndex = index;
  form.assetType.dispatchEvent(new Event('change'));

  if (asset.type === 'realEstate') {
    form.propertyValue.value = asset.currentValue;
    form.loanAmount.value = asset.loanBalance;
    form.realEstateNextDueDate.value = asset.nextDueDate;
  } else {
    form.vehicleValue.value = asset.currentValue;
    form.vehicleLoanBalance.value = asset.loanBalance;
    form.vehicleNextDueDate.value = asset.nextDueDate;
  }
  new bootstrap.Modal(document.getElementById('addAssetModal')).show();
}

let deleteAssetIndex = null;
function confirmDeleteAsset(index) {
  deleteAssetIndex = index;
  document.getElementById('deleteAssetName').textContent = getData(ASSET_STORAGE_KEY)[index].name;
  new bootstrap.Modal(document.getElementById('confirmDeleteModal')).show();
}
function deleteAssetConfirmed() {
  const assets = getData(ASSET_STORAGE_KEY);
  assets.splice(deleteAssetIndex, 1);
  setData(ASSET_STORAGE_KEY, assets);
  renderAssets();
  deleteAssetIndex = null;
  bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
}

// ========== DEBTS ========== //
const DEBT_STORAGE_KEY = 'fireside_debts';
function renderDebts() {
  renderTable(DEBT_STORAGE_KEY, 'debtTableBody', (debt, index) => `
    <td>${debt.name}</td>
    <td>${debt.type}</td>
    <td>$${parseFloat(debt.amount).toFixed(2)}</td>
    <td>${parseFloat(debt.interest).toFixed(2)}%</td>
    <td>${debt.term} months</td>
    <td>$${parseFloat(debt.monthly).toFixed(2)}</td>
    <td>${debt.nextDueDate || ''}</td>
    <td>
      <button class="btn btn-sm btn-outline-secondary me-2" onclick="editDebt(${index})"><i class="bi bi-pencil"></i></button>
      <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteDebt(${index})"><i class="bi bi-trash"></i></button>
    </td>
  `);
}

function addOrUpdateDebt(e) {
  e.preventDefault();
  const form = e.target;
  const debts = getData(DEBT_STORAGE_KEY);
  const debt = {
    name: form.debtName.value,
    type: form.debtType.value,
    amount: parseFloat(form.debtAmount.value),
    interest: parseFloat(form.debtInterest.value),
    term: parseInt(form.debtTerm.value),
    monthly: parseFloat(form.debtMonthly.value),
    nextDueDate: form.debtNextPaymentDate.value || '',
  };
  const index = form.dataset.editIndex;
  if (index) {
    debts[parseInt(index)] = debt;
    delete form.dataset.editIndex;
  } else {
    debts.push(debt);
  }
  setData(DEBT_STORAGE_KEY, debts);
  renderDebts();
  form.reset();
  bootstrap.Modal.getInstance(document.getElementById('addDebtModal')).hide();
}

function editDebt(index) {
  const debt = getData(DEBT_STORAGE_KEY)[index];
  const form = document.getElementById('debtForm');
  form.debtName.value = debt.name;
  form.debtType.value = debt.type;
  form.debtAmount.value = debt.amount;
  form.debtInterest.value = debt.interest;
  form.debtTerm.value = debt.term;
  form.debtMonthly.value = debt.monthly;
  form.debtNextPaymentDate.value = debt.nextDueDate;
  form.dataset.editIndex = index;
  new bootstrap.Modal(document.getElementById('addDebtModal')).show();
}

let deleteDebtIndex = null;
function confirmDeleteDebt(index) {
  deleteDebtIndex = index;
  document.getElementById('deleteDebtName').textContent = getData(DEBT_STORAGE_KEY)[index].name;
  new bootstrap.Modal(document.getElementById('confirmDeleteDebtModal')).show();
}
function deleteDebtConfirmed() {
  const debts = getData(DEBT_STORAGE_KEY);
  debts.splice(deleteDebtIndex, 1);
  setData(DEBT_STORAGE_KEY, debts);
  renderDebts();
  deleteDebtIndex = null;
  bootstrap.Modal.getInstance(document.getElementById('confirmDeleteDebtModal')).hide();
}

// ========== INVESTMENTS ========== //
const INVESTMENT_STORAGE_KEY = 'fireside_investments';
function renderInvestments() {
  renderTable(INVESTMENT_STORAGE_KEY, 'investmentTableBody', (inv, index) => `
    <td>${inv.name}</td>
    <td>${inv.type}</td>
    <td>$${parseFloat(inv.startingBalance).toFixed(2)}</td>
    <td>$${parseFloat(inv.monthlyContribution).toFixed(2)}</td>
    <td>${parseFloat(inv.annualReturn).toFixed(2)}%</td>
    <td>${inv.nextContributionDate || ''}</td>
    <td>$${parseFloat(inv.currentValue).toFixed(2)}</td>
    <td>
      <button class="btn btn-sm btn-outline-secondary me-2" onclick="editInvestment(${index})"><i class="bi bi-pencil"></i></button>
      <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteInvestment(${index})"><i class="bi bi-trash"></i></button>
    </td>
  `);
}

function addOrUpdateInvestment(e) {
  e.preventDefault();
  const form = e.target;
  const investments = getData(INVESTMENT_STORAGE_KEY);
  const inv = {
    name: form.investmentName.value,
    type: form.investmentType.value,
    startingBalance: parseFloat(form.startingBalance.value),
    monthlyContribution: parseFloat(form.monthlyContribution.value),
    annualReturn: parseFloat(form.annualReturn.value),
    currentValue: parseFloat(form.investmentValue.value),
    nextContributionDate: form.nextContributionDate.value || '',
  };
  const index = form.dataset.editIndex;
  if (index) {
    investments[parseInt(index)] = inv;
    delete form.dataset.editIndex;
  } else {
    investments.push(inv);
  }
  setData(INVESTMENT_STORAGE_KEY, investments);
  renderInvestments();
  form.reset();
  bootstrap.Modal.getInstance(document.getElementById('addInvestmentModal')).hide();
}

function editInvestment(index) {
  const inv = getData(INVESTMENT_STORAGE_KEY)[index];
  const form = document.getElementById('investmentForm');
  form.investmentName.value = inv.name;
  form.investmentType.value = inv.type;
  form.startingBalance.value = inv.startingBalance;
  form.monthlyContribution.value = inv.monthlyContribution;
  form.annualReturn.value = inv.annualReturn;
  form.investmentValue.value = inv.currentValue;
  form.nextContributionDate.value = inv.nextContributionDate;
  form.dataset.editIndex = index;
  new bootstrap.Modal(document.getElementById('addInvestmentModal')).show();
}

let deleteInvestmentIndex = null;
function confirmDeleteInvestment(index) {
  deleteInvestmentIndex = index;
  document.getElementById('deleteInvestmentName').textContent = getData(INVESTMENT_STORAGE_KEY)[index].name;
  new bootstrap.Modal(document.getElementById('confirmDeleteInvestmentModal')).show();
}
function deleteInvestmentConfirmed() {
  const investments = getData(INVESTMENT_STORAGE_KEY);
  investments.splice(deleteInvestmentIndex, 1);
  setData(INVESTMENT_STORAGE_KEY, investments);
  renderInvestments();
  deleteInvestmentIndex = null;
  bootstrap.Modal.getInstance(document.getElementById('confirmDeleteInvestmentModal')).hide();
}

// ========== INIT BY PAGE ========== //
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('billTableBody')) {
    renderBills();
    document.getElementById('billForm')?.addEventListener('submit', addOrUpdateBill);
  }
  if (document.getElementById('incomeTableBody')) {
    renderIncome();
    document.getElementById('incomeForm')?.addEventListener('submit', addOrUpdateIncome);
  }
  if (document.getElementById('assetTableBody')) {
    renderAssets();
    document.getElementById('assetForm')?.addEventListener('submit', addOrUpdateAsset);
  }
  if (document.getElementById('debtTableBody')) {
    renderDebts();
    document.getElementById('debtForm')?.addEventListener('submit', addOrUpdateDebt);
  }
  if (document.getElementById('investmentTableBody')) {
    renderInvestments();
    document.getElementById('investmentForm')?.addEventListener('submit', addOrUpdateInvestment);
  }
});
