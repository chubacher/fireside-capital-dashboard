// Assets

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

  // INVESTMENTS

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

  // DEBTS

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

  // BILLS

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

  // INCOME

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

  export {
    loadAssets, renderAssets,openAssetModal,deleteAsset,
    loadInvestments, renderInvestments,editInvestment, confirmDeleteInvestment, deleteInvestment,
    loadDebts, renderDebts, editDebt,confirmDeleteDebt,
    loadBills, renderBills, confirmDeleteBill, deleteBillConfirmed,editBill,
    loadIncome, renderIncome, editIncome, confirmDeleteIncome, deleteIncomeConfirmed
}