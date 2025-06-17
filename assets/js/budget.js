document.addEventListener('DOMContentLoaded', () => {
    const monthLabel = document.getElementById('currentMonth');
    const tableBody = document.getElementById('budgetAssignmentTable');
    const expectedIncomeEl = document.getElementById('expectedIncome');
    const assignedAmountEl = document.getElementById('assignedAmount');
    const activityAmountEl = document.getElementById('activityAmount');
    const availableAmountEl = document.getElementById('availableAmount');
  
    let currentMonth = new Date();
  
    function formatMonth(date) {
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
  
    function formatCurrency(num) {
      return `$${parseFloat(num || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }
  
    function updateMonthLabel() {
      if (monthLabel) {
        monthLabel.textContent = formatMonth(currentMonth);
      }
    }
  
    function getStartAndEndOfMonth() {
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      return { start, end };
    }
  
    function filterByMonth(items, key) {
      const { start, end } = getStartAndEndOfMonth();
      return items.filter(item => {
        const rawDate = item[key];
        if (!rawDate) return false;
        const due = new Date(rawDate);
        return due >= start && due <= end;
      });
    }
  
    function getGroupedData() {
      const bills = filterByMonth(JSON.parse(localStorage.getItem('bills') || '[]'), 'nextDueDate');
      const debts = filterByMonth(JSON.parse(localStorage.getItem('debts') || '[]'), 'nextDueDate');
      const investments = filterByMonth(JSON.parse(localStorage.getItem('investments') || '[]'), 'nextContributionDate');
      const assets = filterByMonth(JSON.parse(localStorage.getItem('assets') || '[]'), 'nextDueDate');
  
      return [
        { category: 'Bills', items: bills },
        { category: 'Debts', items: debts },
        { category: 'Investments', items: investments },
        { category: 'Assets', items: assets.filter(a => a.loan) }
      ];
    }
  
    function getExpectedIncome() {
      const income = JSON.parse(localStorage.getItem('income') || '[]');
      const { start, end } = getStartAndEndOfMonth();
      return income.reduce((total, item) => {
        const rawDate = item.nextDueDate || item.nextPaymentDate || item.due;
        if (!rawDate) return total;
        const date = new Date(rawDate);
        if (date >= start && date <= end) {
          return total + parseFloat(item.amount || 0);
        }
        return total;
      }, 0);
    }
  
    function renderTable() {
      const groups = getGroupedData();
      const expectedIncome = getExpectedIncome();
      let assigned = 0;
      let spent = 0;
  
      expectedIncomeEl.textContent = formatCurrency(expectedIncome);
      assignedAmountEl.textContent = formatCurrency(assigned);
      activityAmountEl.textContent = formatCurrency(spent);
      availableAmountEl.textContent = formatCurrency(expectedIncome - assigned);
  
      tableBody.innerHTML = '';
  
      groups.forEach(group => {
        if (group.items.length === 0) return;
  
        const groupRow = document.createElement('tr');
        const groupCell = document.createElement('td');
        groupCell.colSpan = 6;
        groupCell.innerHTML = `<strong>${group.category}</strong>`;
        groupRow.appendChild(groupCell);
        tableBody.appendChild(groupRow);
  
        group.items.forEach(item => {
          const row = document.createElement('tr');
          const amount = item.amount || item.monthlyPayment || item.monthlyContribution || 0;
  
          row.innerHTML = `
            <td>${group.category}</td>
            <td>${item.name}</td>
            <td>${formatCurrency(amount)}</td>
            <td>$0.00</td>
            <td>$0.00</td>
            <td><button class="btn btn-sm btn-outline-primary">Assign</button></td>
          `;
          tableBody.appendChild(row);
        });
      });
    }
  
    // Month navigation
    document.getElementById('prevMonth')?.addEventListener('click', () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      updateMonthLabel();
      renderTable();
    });
  
    document.getElementById('nextMonth')?.addEventListener('click', () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      updateMonthLabel();
      renderTable();
    });
  
    updateMonthLabel();
    renderTable();
  });
  