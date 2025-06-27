// ===== UTILITY & HELPER FUNCTIONS =====
function getRaw(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
  return 0;
}
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(getRaw(value));
}
function formatDate(dateString) {
  if (!dateString || !dateString.includes('-')) return '';
  return new Intl.DateTimeFormat('en-US').format(new Date(dateString + 'T00:00:00'));
}
function getNextDate(currentDate, frequency) {
  let nextDate = new Date(currentDate);
  switch ((frequency || '').toLowerCase()) {
      case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
      case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
      case 'bi-weekly': nextDate.setDate(nextDate.getDate() + 14); break;
      case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
      case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
      case 'annually': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
      default: console.error(`Unknown frequency: ${frequency}`); break;
  }
  return nextDate;
}
function getThemeColors() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  return {
      fill: isDark ? 'rgba(78, 115, 223, 0.2)' : 'rgba(78, 115, 223, 0.1)',
      text: isDark ? '#eaeaea' : '#333',
      grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
}
function dedupeSnapshotsByDate(snaps) {
  const uniqueSnaps = {};
  (snaps || []).forEach(snap => { uniqueSnaps[snap.date] = snap; });
  return Object.values(uniqueSnaps).sort((a, b) => new Date(a.date) - new Date(b.date));
}



// ===== SUPABASE CLIENT =====
const supabaseUrl = 'https://bgsdnlkhwgbdbdvmhrzv.supabase.co';      // <-- IMPORTANT: Replace with your actual URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnc2RubGtod2diZGJkdm1ocnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNjM0MjQsImV4cCI6MjA2NTczOTQyNH0.fCUUUrwn5Gy6J7KIMty3grq2a8GtNIHSqLLue3Q_nVM'; // <-- IMPORTANT: Replace with your actual key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===== STATE & GLOBAL VARIABLES =====
let currentUser = null;
let editAssetId = null, deleteAssetId = null;
let editInvestmentId = null, deleteInvestmentId = null;
let editDebtId = null, deleteDebtId = null;
let editBillId = null, deleteBillId = null;
let editIncomeId = null, deleteIncomeId = null;
let netWorthChart, cashFlowChart, emergencyFundChart;
let currentBudgetMonth = new Date();
let budgetAssignments = {};

// ===== AUTHENTICATION =====
async function handleAuthStateChange(event, session) {
  currentUser = session?.user || null;
  const dataContainer = document.getElementById('dataContainer');
  const loggedInState = document.getElementById('loggedInState');
  const loggedOutState = document.getElementById('loggedOutState');

  if (loggedInState) loggedInState.classList.toggle('d-none', !currentUser);
  if (loggedOutState) loggedOutState.classList.toggle('d-none', !!currentUser);
  if (dataContainer) dataContainer.style.visibility = currentUser ? 'visible' : 'hidden';

  if (currentUser) {
      if(document.getElementById('username')) {
          document.getElementById('username').textContent = currentUser.user_metadata?.first_name || currentUser.email;
      }
      
      // THE FIX: We now 'await' the fetch to complete before proceeding.
      await fetchAllDataFromSupabase();
      
      // This will now only run after all data is loaded.
      renderAll();

  } else {
      // Clear data and render the empty state when logged out
      window.assets = []; window.investments = []; window.debts = []; 
      window.bills = []; window.income = []; window.snapshots = [];
      renderAll(); 
  }
}

async function signUp(email, password, firstName, lastName) {
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { first_name: firstName, last_name: lastName } } });
  if (error) { alert(error.message); return; }
  alert('Sign up successful! Please check your email to confirm.');
  bootstrap.Modal.getInstance(document.getElementById('signupModal')).hide();
}

async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { alert(error.message); }
  else { bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide(); }
}

async function logout() { await supabase.auth.signOut(); }

// ===== ONE-TIME DATA SYNC =====
async function syncLocalToSupabase() {
  if (!currentUser) return alert("You must be logged in to sync data.");
  console.log("Starting final data migration...");

  const tablesToSync = ['assets', 'investments', 'debts', 'bills', 'income', 'snapshots'];

  for (const table of tablesToSync) {
      try {
          let localData = JSON.parse(localStorage.getItem(table) || '[]');

          if (localData.length > 0) {
              // Use a special, safe 'upsert' for snapshots to handle duplicates
              if (table === 'snapshots') {
                  const snapshotData = localData.map(item => ({
                      date: item.date,
                      netWorth: item.netWorth,
                      user_id: currentUser.id
                  }));
                  // Use upsert on the primary key (date, user_id)
                  const { error } = await supabase.from('snapshots').upsert(snapshotData, { onConflict: 'date, user_id' });
                  if (error) throw error;
              } else {
                  // Use 'insert' for all other tables
                  const dataToInsert = localData.map(item => {
                      const newItem = { ...item, user_id: currentUser.id };
                      delete newItem.id;
                      
                      // Clean up any empty date strings
                      if (newItem.nextDueDate === "") newItem.nextDueDate = null;
                      if (newItem.nextContributionDate === "") newItem.nextContributionDate = null;
                      if (newItem.loanStartDate === "") newItem.loanStartDate = null;
                      if (newItem.purchaseDate === "") newItem.purchaseDate = null;

                      return newItem;
                  });
                  const { error } = await supabase.from(table).insert(dataToInsert);
                  if (error) throw error;
              }
              console.log(`Successfully processed ${localData.length} items for '${table}'.`);
          }
      } catch (error) {
          console.error(`Error syncing table '${table}':`, error);
          alert(`Sync failed for table '${table}'. Please check the console.`);
          return;
      }
  }
  console.log("Data migration finished! Refreshing application data...");
  await fetchAllDataFromSupabase();
  renderAll();
  alert("Data migration complete!");
}

// ===== CORE DATA & RENDER FUNCTIONS =====
// --- THE DEBUGGING FUNCTION ---
async function fetchAllDataFromSupabase() {
  if (!currentUser) return; // Exit if no user is logged in
  
  try {
      // Fetch all data streams at the same time
      const [assetsRes, investmentsRes, debtsRes, billsRes, incomeRes, snapshotsRes, settingsRes] = await Promise.all([
        supabase.from('assets').select('*').eq('user_id', currentUser.id),
        supabase.from('investments').select('*').eq('user_id', currentUser.id),
        supabase.from('debts').select('*').eq('user_id', currentUser.id),
        supabase.from('bills').select('*').eq('user_id', currentUser.id),
        supabase.from('income').select('*').eq('user_id', currentUser.id),
        supabase.from('snapshots').select('*').eq('user_id', currentUser.id),
        supabase.from('settings').select('*').eq('user_id', currentUser.id).single() // Fetch settings
    ]);

      // Check if any of the requests failed
      const responses = [assetsRes, investmentsRes, debtsRes, billsRes, incomeRes, snapshotsRes];
      for (const res of responses) {
          if (res.error) {
              throw new Error(`Failed to fetch data: ${res.error.message}`);
          }
      }

      // THE FIX: Assign data to the global window object
      window.assets = assetsRes.data || [];
      window.investments = investmentsRes.data || [];
      window.debts = debtsRes.data || [];
      window.bills = billsRes.data || [];
      window.income = incomeRes.data || [];
      window.snapshots = snapshotsRes.data || [];
      window.settings = settingsRes.data || {};

      console.log("FETCH: Data fetch successful for all tables.");
    // ADD THIS LINE:
    console.log("1. Data fetch is complete.");
  } catch (error) {
      console.error("Error during data fetch:", error);
      alert("A critical error occurred while fetching your data. Please check the console.");
  }
}


function renderAll() {
  // Render all the tables for the sub-pages
  renderAssets(); 
  renderInvestments(); 
  renderDebts(); 
  renderBills(); 
  renderIncome();

  // If we are on the dashboard, render the dashboard components
  if (document.getElementById('netWorthTimelineChart')) {
      updateDashboardCards();
      renderUpcomingPayments();
      renderNetWorthChart();
      generateMonthlyCashFlowChart();
      renderEmergencyFundChart();
  }
}
// ===== FULL CRUD OPERATIONS =====

// --- ASSETS ---
function renderAssets() {
  const tbody = document.getElementById('assetTableBody');
  if (!tbody) return;
  tbody.innerHTML = (window.assets || []).map(a => `
      <tr>
          <td>${a.name}</td><td>${a.type}</td><td>${formatCurrency(a.value)}</td>
          <td>${formatCurrency(a.loan)}</td><td>${formatCurrency(Math.max(getRaw(a.value) - getRaw(a.loan), 0))}</td>
          <td>${a.nextDueDate ? formatDate(a.nextDueDate) : '-'}</td>
          <td>
              <button class="btn btn-sm btn-outline-primary" onclick="openAssetModal('${a.id}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteAsset('${a.id}')"><i class="bi bi-trash"></i></button>
          </td>
      </tr>`).join('');
}
function openAssetModal(id = null) {
  editAssetId = id;
  const f = document.getElementById('assetForm');
  f.reset();
  document.querySelectorAll('.asset-fields').forEach(el => el.classList.add('d-none'));
  if (id) {
      document.getElementById('addAssetModalLabel').textContent = "Edit Asset";
      const asset = window.assets.find(x => x.id == id); // FIX: Changed === to ==
      if (asset) { // Add a check to ensure the asset was found
          f.assetName.value = asset.name;
          f.assetType.value = asset.type;
          if (asset.type === 'realEstate') {
              document.querySelector('.real-estate-fields').classList.remove('d-none');
              f.propertyValue.value = asset.value; f.loanAmount.value = asset.loan; f.realEstateNextDueDate.value = asset.nextDueDate;
          } else if (asset.type === 'vehicle') {
              document.querySelector('.vehicle-fields').classList.remove('d-none');
              f.vehicleValue.value = asset.value; f.vehicleLoanBalance.value = asset.loan; f.vehicleNextDueDate.value = asset.nextDueDate;
          }
      }
  } else { document.getElementById('addAssetModalLabel').textContent = "Add Asset"; }
  bootstrap.Modal.getOrCreateInstance(f.closest('.modal')).show();
}
async function saveAsset() {
  const f = document.getElementById('assetForm');
  const type = f.assetType.value;
  const record = { name: f.assetName.value, type, user_id: currentUser.id };
  if (type === 'realEstate') {
      record.value = getRaw(f.propertyValue.value); record.loan = getRaw(f.loanAmount.value); record.nextDueDate = f.realEstateNextDueDate.value || null;
  } else if (type === 'vehicle') {
      record.value = getRaw(f.vehicleValue.value); record.loan = getRaw(f.vehicleLoanBalance.value); record.nextDueDate = f.vehicleNextDueDate.value || null;
  }
  const { error } = editAssetId ? await supabase.from('assets').update(record).eq('id', editAssetId) : await supabase.from('assets').insert(record);
  if (error) return alert(error.message);
  bootstrap.Modal.getInstance(f.closest('.modal')).hide();
  await fetchAllDataFromSupabase();
  renderAll();
}
function confirmDeleteAsset(id) {
  deleteAssetId = id;
  document.getElementById('deleteAssetName').textContent = `"${window.assets.find(a=>a.id===id).name}"`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmDeleteModal')).show();
}
async function deleteAssetConfirmed() {
  const { error } = await supabase.from('assets').delete().eq('id', deleteAssetId);
  if (error) return alert(error.message);
  bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
  await fetchAllDataFromSupabase();
  renderAll();
}

// --- INVESTMENTS ---
function renderInvestments() {
  const tbody = document.getElementById('investmentTableBody');
  if (!tbody) return;
  tbody.innerHTML = (window.investments || []).map(inv => `
      <tr>
          <td>${inv.name}</td><td>${inv.type}</td><td>${formatCurrency(inv.startingBalance)}</td>
          <td>${formatCurrency(inv.monthlyContribution)}</td><td>${inv.annualReturn ? inv.annualReturn + '%' : '-'}</td>
          <td>${inv.nextContributionDate ? formatDate(inv.nextContributionDate) : '-'}</td><td>${formatCurrency(inv.value)}</td>
          <td>
              <button class="btn btn-sm btn-outline-primary" onclick="openInvestmentModal('${inv.id}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteInvestment('${inv.id}')"><i class="bi bi-trash"></i></button>
          </td>
      </tr>`).join('');
}
function openInvestmentModal(id = null) {
  editInvestmentId = id;
  const f = document.getElementById('investmentForm');
  f.reset();
  if (id) {
      const inv = window.investments.find(i => i.id == id); // FIX: Changed === to ==
      if(inv) {
          f.investmentName.value = inv.name; f.investmentType.value = inv.type; f.investmentValue.value = inv.value; 
          f.monthlyContribution.value = inv.monthlyContribution; f.annualReturn.value = inv.annualReturn; 
          f.nextContributionDate.value = inv.nextContributionDate;
      }
  }
  bootstrap.Modal.getOrCreateInstance(f.closest('.modal')).show();
}
async function saveInvestment() {
  // This is the new line for debugging
  console.log("DEBUG: saveInvestment() function was called. The ID to edit is:", editInvestmentId);

  const f = document.getElementById('investmentForm');
  const record = {
      name: f.investmentName.value, type: f.investmentType.value, value: getRaw(f.investmentValue.value),
      monthlyContribution: getRaw(f.monthlyContribution.value), annualReturn: getRaw(f.annualReturn.value),
      nextContributionDate: f.nextContributionDate.value || null, user_id: currentUser.id
  };
  const { error } = editInvestmentId ? await supabase.from('investments').update(record).eq('id', editInvestmentId) : await supabase.from('investments').insert(record);

  editInvestmentId = null;
  if (error) return alert(error.message);

  bootstrap.Modal.getInstance(f.closest('.modal')).hide();
  await fetchAllDataFromSupabase();
  renderAll();
}
function confirmDeleteInvestment(id) {
  if (confirm(`Are you sure you want to delete "${window.investments.find(i=>i.id===id).name}"?`)) {
      deleteInvestmentConfirmed(id);
  }
}
async function deleteInvestmentConfirmed(id) {
  const { error } = await supabase.from('investments').delete().eq('id', id);
  if (error) return alert(error.message);
  await fetchAllDataFromSupabase();
  renderAll();
}

// --- DEBTS ---
function renderDebts() {
  const tbody = document.getElementById('debtTableBody');
  if (!tbody) return;
  tbody.innerHTML = (window.debts || []).map(d => `
      <tr>
          <td>${d.name}</td><td>${d.type}</td><td>${formatCurrency(d.amount)}</td><td>${d.interestRate}%</td>
          <td>${d.term || '-'} months</td><td>${formatCurrency(d.monthlyPayment)}</td>
          <td>${d.nextDueDate ? formatDate(d.nextDueDate) : '-'}</td>
          <td>
              <button class="btn btn-sm btn-outline-primary" onclick="openDebtModal('${d.id}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteDebt('${d.id}')"><i class="bi bi-trash"></i></button>
          </td>
      </tr>`).join('');
}
function openDebtModal(id = null) {
  editDebtId = id;
  const f = document.getElementById('debtForm');
  f.reset();
  if (id) {
      const d = window.debts.find(x => x.id == id); // FIX: Changed === to ==
      if(d) {
          f.debtName.value = d.name; f.debtType.value = d.type; f.debtAmount.value = d.amount;
          f.debtInterest.value = d.interestRate; f.debtTerm.value = d.term; f.debtMonthly.value = d.monthlyPayment;
          f.debtNextPaymentDate.value = d.nextDueDate;
      }
  }
  bootstrap.Modal.getOrCreateInstance(f.closest('.modal')).show();
}
async function saveDebt() {
  const f = document.getElementById('debtForm');
  const record = {
      name: f.debtName.value, type: f.debtType.value, amount: getRaw(f.debtAmount.value), interestRate: getRaw(f.debtInterest.value),
      term: getRaw(f.debtTerm.value), monthlyPayment: getRaw(f.debtMonthly.value),
      nextDueDate: f.debtNextPaymentDate.value || null, user_id: currentUser.id
  };
  const { error } = editDebtId ? await supabase.from('debts').update(record).eq('id', editDebtId) : await supabase.from('debts').insert(record);
  if (error) return alert(error.message);
  bootstrap.Modal.getInstance(f.closest('.modal')).hide();
  await fetchAllDataFromSupabase();
  renderAll();
}
function confirmDeleteDebt(id) {
  deleteDebtId = id;
  document.getElementById('deleteDebtName').textContent = `"${window.debts.find(d=>d.id===id).name}"`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmDeleteDebtModal')).show();
}
async function deleteDebtConfirmed() {
  const { error } = await supabase.from('debts').delete().eq('id', deleteDebtId);
  if (error) return alert(error.message);
  bootstrap.Modal.getInstance(document.getElementById('confirmDeleteDebtModal')).hide();
  await fetchAllDataFromSupabase();
  renderAll();
}

// --- BILLS ---
function renderBills() {
  const tbody = document.getElementById('billTableBody');
  if (!tbody) return;
  tbody.innerHTML = (window.bills || []).map(b => `
      <tr>
          <td>${b.name}</td><td>${b.type}</td><td>${formatCurrency(b.amount)}</td>
          <td>${b.frequency}</td><td>${b.nextDueDate ? formatDate(b.nextDueDate) : '-'}</td>
          <td>
              <button class="btn btn-sm btn-outline-primary" onclick="openBillModal('${b.id}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteBill('${b.id}')"><i class="bi bi-trash"></i></button>
          </td>
      </tr>`).join('');
}
function openBillModal(id = null) {
  editBillId = id;
  const f = document.getElementById('billForm');
  f.reset();
  if (id) {
      const b = window.bills.find(x => x.id == id); // FIX: Changed === to ==
      if (b) {
          f.billName.value = b.name; f.billType.value = b.type; f.billAmount.value = b.amount;
          f.billFrequency.value = b.frequency; f.billNextDueDate.value = b.nextDueDate;
      }
  }
  bootstrap.Modal.getOrCreateInstance(f.closest('.modal')).show();
}
async function saveBill() {
  const f = document.getElementById('billForm');
  const record = {
      name: f.billName.value, type: f.billType.value, amount: getRaw(f.billAmount.value),
      frequency: f.billFrequency.value, nextDueDate: f.billNextDueDate.value || null, user_id: currentUser.id
  };
  const { error } = editBillId ? await supabase.from('bills').update(record).eq('id', editBillId) : await supabase.from('bills').insert(record);
  if (error) return alert(error.message);
  bootstrap.Modal.getInstance(f.closest('.modal')).hide();
  await fetchAllDataFromSupabase();
  renderAll();
}
function confirmDeleteBill(id) {
  deleteBillId = id;
  document.getElementById('deleteBillName').textContent = `"${window.bills.find(b=>b.id===id).name}"`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmDeleteBillModal')).show();
}
async function deleteBillConfirmed() {
  const { error } = await supabase.from('bills').delete().eq('id', deleteBillId);
  if (error) return alert(error.message);
  bootstrap.Modal.getInstance(document.getElementById('confirmDeleteBillModal')).hide();
  await fetchAllDataFromSupabase();
  renderAll();
}

// --- INCOME ---
function renderIncome() {
  const tbody = document.getElementById('incomeTableBody');
  if (!tbody) return;
  tbody.innerHTML = (window.income || []).map(i => `
      <tr>
          <td>${i.name}</td><td>${i.type}</td><td>${formatCurrency(i.amount)}</td>
          <td>${i.frequency}</td><td>${i.nextDueDate ? formatDate(i.nextDueDate) : '-'}</td>
          <td>
              <button class="btn btn-sm btn-outline-primary" onclick="openIncomeModal('${i.id}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteIncome('${i.id}')"><i class="bi bi-trash"></i></button>
          </td>
      </tr>`).join('');
}
function openIncomeModal(id = null) {
  editIncomeId = id;
  const f = document.getElementById('incomeForm');
  f.reset();
  if (id) {
      const i = window.income.find(x => x.id == id); // FIX: Changed === to ==
      if (i) {
          f.incomeName.value = i.name; f.incomeType.value = i.type; f.incomeAmount.value = i.amount;
          f.incomeFrequency.value = i.frequency; f.incomeNextDueDate.value = i.nextDueDate;
      }
  }
  bootstrap.Modal.getOrCreateInstance(f.closest('.modal')).show();
}
async function saveIncome() {
  const f = document.getElementById('incomeForm');
  const record = {
      name: f.incomeName.value, type: f.incomeType.value, amount: getRaw(f.incomeAmount.value),
      frequency: f.incomeFrequency.value, nextDueDate: f.incomeNextDueDate.value || null, user_id: currentUser.id
  };
  const { error } = editIncomeId ? await supabase.from('income').update(record).eq('id', editIncomeId) : await supabase.from('income').insert(record);
  if (error) return alert(error.message);
  bootstrap.Modal.getInstance(f.closest('.modal')).hide();
  await fetchAllDataFromSupabase();
  renderAll();
}
function confirmDeleteIncome(id) {
  deleteIncomeId = id;
  document.getElementById('deleteIncomeName').textContent = `"${window.income.find(i=>i.id===id).name}"`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmDeleteIncomeModal')).show();
}
async function deleteIncomeConfirmed() {
  const { error } = await supabase.from('income').delete().eq('id', deleteIncomeId);
  if (error) return alert(error.message);
  bootstrap.Modal.getInstance(document.getElementById('confirmDeleteIncomeModal')).hide();
  await fetchAllDataFromSupabase();
  renderAll();
}


// ===== DASHBOARD & CHARTING =====

// This new function renders the Emergency Fund chart OR the custom message
function renderEmergencyFundChart() {
  const wrapper = document.getElementById('emergencyFundChartWrapper');
  if (!wrapper) return;

  // Clear any previous chart or message
  if (emergencyFundChart) emergencyFundChart.destroy();
  wrapper.innerHTML = '';

  const emergencyGoal = window.settings?.emergency_fund_goal || 0;
  const emergencyFundAsset = (window.assets || []).find(a => a.name.toLowerCase().includes('emergency fund'));
  const emergencyCurrent = emergencyFundAsset?.value || 0;

  if (emergencyGoal > 0) {
      // If a goal is set, render the chart
      const canvas = document.createElement('canvas');
      wrapper.appendChild(canvas);
      const theme = getThemeColors();

      emergencyFundChart = new Chart(canvas, {
          type: 'bar',
          data: {
              labels: ['Goal', 'Current'],
              datasets: [{
                  data: [emergencyGoal, emergencyCurrent],
                  backgroundColor: ['#f6c23e', '#1cc88a'],
                  barThickness: 50
              }]
          },
          options: {
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                  x: { ticks: { color: theme.text, callback: v => formatCurrency(v) }, grid: { color: theme.grid }, min: 0 },
                  y: { ticks: { color: theme.text }, grid: { display: false } }
              }
          }
      });
  } else {
      // If no goal is set, render your custom message
      wrapper.innerHTML = `
          <div class="text-center">
              <p class="text-muted mb-2">You don't have an emergency fund goal set.</p>
              <a href="settings.html" class="btn btn-primary btn-sm">Click here to set one</a>
          </div>
      `;
  }
}

// This new function saves your settings to Supabase
async function saveSettings() {
  if (!currentUser) return;
  const goal = getRaw(document.getElementById('emergencyFundGoal').value);

  const { error } = await supabase
      .from('settings')
      .upsert({ user_id: currentUser.id, emergency_fund_goal: goal });

  const statusEl = document.getElementById('settingsStatus');
  if (error) {
      statusEl.textContent = "Error saving settings.";
      statusEl.className = "ms-3 text-danger";
      console.error(error);
  } else {
      statusEl.textContent = "Settings saved!";
      statusEl.className = "ms-3 text-success";
      // Re-fetch settings data to update the app state
      await fetchAllDataFromSupabase();
  }
  setTimeout(() => { statusEl.textContent = ''; }, 3000);
}

async function renderAdditionalCharts() {
  if (!currentUser) return;

  // Fetch all necessary data
  const [snapshotsRes, billsRes, debtsRes, incomeRes, investmentsRes, assetsRes] = await Promise.all([
    supabase.from('snapshots').select('date, netWorth').eq('user_id', currentUser.id),
    supabase.from('bills').select('type, amount').eq('user_id', currentUser.id),
    supabase.from('debts').select('type, monthlyPayment').eq('user_id', currentUser.id),
    supabase.from('income').select('amount, frequency').eq('user_id', currentUser.id),
    supabase.from('investments').select('value').eq('user_id', currentUser.id),
    supabase.from('assets').select('name, value').eq('user_id', currentUser.id)
  ]);

  const snapshots = snapshotsRes.data || [];
  const bills = billsRes.data || [];
  const debts = debtsRes.data || [];
  const income = incomeRes.data || [];
  const investments = investmentsRes.data || [];
  const assets = assetsRes.data || [];

  // --- Net Worth Change ---
  const monthGroups = {};
  snapshots.forEach(({ date, netWorth }) => {
    const key = new Date(date).toLocaleString('default', { month: 'short', year: 'numeric' });
    monthGroups[key] = netWorth;
  });
  const sortedNetWorth = Object.entries(monthGroups).sort(([a], [b]) => new Date(a) - new Date(b));
  const netLabels = sortedNetWorth.map(([label]) => label);
  const netData = sortedNetWorth.map(([, val], i, arr) => i === 0 ? 0 : val - arr[i - 1][1]);

  new Chart(document.getElementById('netWorthDeltaChart'), {
    type: 'bar',
    data: {
      labels: netLabels,
      datasets: [{
        label: 'Change ($)',
        data: netData,
        backgroundColor: ctx => ctx.raw < 0 ? '#e74a3b' : '#1cc88a'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } }, x: { ticks: { color: '#ccc' }, grid: { display: false } } } }
  });

  // --- Spending Categories ---
  const categorySums = {};
  [...bills, ...debts.map(d => ({ type: d.type, amount: d.monthlyPayment }))].forEach(item => {
    categorySums[item.type] = (categorySums[item.type] || 0) + parseFloat(item.amount || 0);
  });
  const spendLabels = Object.keys(categorySums);
  const spendValues = Object.values(categorySums);

  new Chart(document.getElementById('spendingCategoriesChart'), {
    type: 'doughnut',
    data: {
      labels: spendLabels,
      datasets: [{
        data: spendValues,
        backgroundColor: ['#4e73df', '#36b9cc', '#f6c23e', '#e74a3b', '#858796']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#ccc' } } } }
  });

  // --- Emergency Fund Progress ---
  const emergencyFund = assets.find(a => a.name.toLowerCase().includes('emergency'));
  const emergencyCurrent = emergencyFund?.value || 0;
  const emergencyGoal = 15000;

  new Chart(document.getElementById('emergencyFundChart'), {
    type: 'bar',
    data: {
      labels: ['Goal', 'Current'],
      datasets: [{
        data: [emergencyGoal, emergencyCurrent],
        backgroundColor: ['#f6c23e', '#1cc88a']
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' }, min: 0, max: emergencyGoal * 1.1 },
        y: { ticks: { color: '#ccc' }, grid: { display: false } }
      }
    }
  });

  // --- Savings Rate Over Time ---
  const savingsLabels = netLabels;
  const savingsData = netLabels.map(() => {
    const totalIncome = income.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
    const totalExpenses = spendValues.reduce((sum, amt) => sum + amt, 0);
    return totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;
  });

  new Chart(document.getElementById('savingsRateChart'), {
    type: 'line',
    data: {
      labels: savingsLabels,
      datasets: [{
        label: 'Savings Rate %',
        data: savingsData,
        fill: true,
        borderColor: '#1cc88a',
        backgroundColor: 'rgba(28, 200, 138, 0.2)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#ccc' } } },
      scales: {
        y: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        x: { ticks: { color: '#ccc' }, grid: { display: false } }
      }
    }
  });

  // --- Investment Growth ---
  const investLabels = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const startValue = investments.length ? parseFloat(investments[0].value || 0) : 10000;
  const investData = investLabels.map((_, i) => Math.round(startValue * Math.pow(1.03, i)));

  new Chart(document.getElementById('investmentGrowthChart'), {
    type: 'line',
    data: {
      labels: investLabels,
      datasets: [{
        label: 'Investment Value ($)',
        data: investData,
        fill: true,
        borderColor: '#4e73df',
        backgroundColor: 'rgba(78, 115, 223, 0.2)',
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#ccc' } } },
      scales: {
        y: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        x: { ticks: { color: '#ccc' }, grid: { display: false } }
      }
    }
  });
}

async function fetchMonthlyNetWorthChanges() {
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('snapshots')
    .select('date, netWorth')
    .eq('user_id', currentUser.id);

  if (error) {
    console.error("Failed to fetch snapshots:", error.message);
    return [];
  }

  const byMonth = {};

  data.forEach(({ date, netWorth }) => {
    const monthKey = new Date(date).toLocaleString('default', { month: 'short', year: 'numeric' });
    byMonth[monthKey] = netWorth;
  });

  const sorted = Object.entries(byMonth).sort(
    ([a], [b]) => new Date(a) - new Date(b)
  );

  const labels = sorted.map(([month]) => month);
  const values = sorted.map(([, val], i, arr) =>
    i === 0 ? 0 : val - arr[i - 1][1]
  );

  return { labels, values };
}



// ===== BUDGET LOGIC =====

// This is the main function that runs when the budget page loads or the month changes
async function loadAndRenderBudget() {
  // Only run this function if we are on the budget page
  if (!document.getElementById('budgetAssignmentTable')) return;

  // --- NEW FIX #1: Wait for data before rendering ---
  // This robustly checks if the data from Supabase has arrived.
  // It will wait up to 3 seconds before showing an error.
  const startTime = Date.now();
  while ((!window.bills || !window.debts) && Date.now() - startTime < 3000) {
      // Wait 50 milliseconds and check again
      await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // If data is still not available after waiting, show a clear error message.
  if (!window.bills || !window.debts) {
      console.error("Budget page timeout: Data is not available after 3 seconds.");
      document.getElementById('budgetAssignmentTable').innerHTML = `<tr><td colspan="6" class="text-center text-danger">Could not load bill and debt data. Please try refreshing the page.</td></tr>`;
      return;
  }
  // --- END OF FIX #1 ---

  const monthString = `${currentBudgetMonth.getFullYear()}-${(currentBudgetMonth.getMonth() + 1).toString().padStart(2, '0')}`;
  if (document.getElementById('currentMonth')) {
      document.getElementById('currentMonth').textContent = currentBudgetMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  let budgetAssignments = {};
  if (currentUser) {
      const { data: assignments, error } = await supabase.from('budgets').select('*').eq('user_id', currentUser.id).eq('month', monthString);
      if (error) {
          console.error("Could not fetch saved budget assignments:", error.message);
      } else {
          (assignments || []).forEach(a => { budgetAssignments[a.item_id] = a.assigned_amount; });
      }
  }

  const totalIncome = (window.income || []).reduce((sum, i) => sum + getRaw(i.amount), 0);
  const totalAssigned = Object.values(budgetAssignments).reduce((sum, amount) => sum + getRaw(amount), 0);
  const remainingToBudget = totalIncome - totalAssigned;

  if(document.getElementById('expectedIncome')) document.getElementById('expectedIncome').textContent = formatCurrency(totalIncome);
  if(document.getElementById('assignedAmount')) document.getElementById('assignedAmount').textContent = formatCurrency(totalAssigned);
  if(document.getElementById('remainingToBudget')) document.getElementById('remainingToBudget').textContent = formatCurrency(remainingToBudget);

  const tbody = document.getElementById('budgetAssignmentTable');
  tbody.innerHTML = '';
  
  const budgetItems = [...(window.bills || []), ...(window.debts || [])].filter(Boolean);

  budgetItems.forEach(item => {
      if (!item.id) {
          console.warn("Skipping an invalid budget item without an ID:", item);
          return;
      }
      const itemId = item.id;
      const needed = item.amount || item.monthlyPayment || 0;
      const assigned = budgetAssignments[itemId] || 0;
      const remaining = needed - assigned;
      const fundingPercent = needed > 0 ? (assigned / needed) * 100 : (assigned > 0 ? 100 : 0);
      
      let progressBarClass = 'bg-dashboard-green';
      if (fundingPercent > 100) progressBarClass = 'bg-dashboard-red';
      else if (fundingPercent < 100) progressBarClass = 'bg-dashboard-yellow';
      
      const remainingTextColor = remaining <= 0 ? 'text-dashboard-green' : 'text-dashboard-yellow';

      const row = document.createElement('tr');
      row.innerHTML = `
          <td>${item.type || 'N/A'}</td><td>${item.name || 'Unnamed'}</td><td>${formatCurrency(needed)}</td>
          <td><div class="input-group input-group-sm"><span class="input-group-text">$</span><input type="number" class="form-control assigned-input" value="${assigned.toFixed(2)}" data-item-id="${item.id}" step="0.01"></div></td>
          <td class="${remainingTextColor} fw-bold">${formatCurrency(remaining)}</td>
          <td><div class="progress" style="height: 20px;"><div class="progress-bar ${progressBarClass}" style="width: ${Math.min(fundingPercent, 100)}%">${Math.round(fundingPercent)}%</div></div></td>
      `;
      tbody.appendChild(row);
  });

  // --- NEW FIX #2: The corrected event listener ---
  document.querySelectorAll('.assigned-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const itemId = e.target.getAttribute('data-item-id');
      const assignedAmount = getRaw(e.target.value);
      if (!currentUser || !itemId) return;
    
      // 🧠 NEW: Derive item type
      const isBill = window.bills?.some(b => b.id === itemId);
      const itemType = isBill ? 'bill' : 'debt';
    
      await saveBudgetAssignment(itemId, assignedAmount, itemType);
    
    
      const totalIncome = (window.income || []).reduce((sum, i) => sum + getRaw(i.amount), 0);
      const allAssignedInputs = Array.from(document.querySelectorAll('.assigned-input'));
      const newTotalAssigned = allAssignedInputs.reduce((sum, currentInput) => sum + getRaw(currentInput.value), 0);
      const newRemainingToBudget = totalIncome - newTotalAssigned;
    
      if(document.getElementById('assignedAmount')) document.getElementById('assignedAmount').textContent = formatCurrency(newTotalAssigned);
      if(document.getElementById('remainingToBudget')) document.getElementById('remainingToBudget').textContent = formatCurrency(newRemainingToBudget);
    
      const row = e.target.closest('tr');
      const needed = getRaw(row.cells[2].textContent);
      const remainingCell = row.cells[4];
      const progressBar = row.querySelector('.progress-bar');
    
      const remaining = needed - assignedAmount;
      const fundingPercent = needed > 0 ? (assignedAmount / needed) * 100 : (assignedAmount > 0 ? 100 : 0);
    
      remainingCell.textContent = formatCurrency(remaining);
    
      let pBarClass = 'bg-dashboard-green';
      if (fundingPercent > 100) pBarClass = 'bg-dashboard-red';
      else if (fundingPercent < 100) pBarClass = 'bg-dashboard-yellow';
    
      progressBar.className = `progress-bar ${pBarClass}`;
      progressBar.style.width = `${Math.min(fundingPercent, 100)}%`;
      progressBar.textContent = `${Math.round(fundingPercent)}%`;
    
      const remTextColor = remaining <= 0 ? 'text-dashboard-green' : 'text-dashboard-yellow';
      remainingCell.className = `fw-bold ${remTextColor}`;
    });    
  });
}
async function saveBudgetAssignment(itemId, assignedAmount, itemType) {
  if (!currentUser || !itemId || !itemType) return;

  const monthString = `${currentBudgetMonth.getFullYear()}-${(currentBudgetMonth.getMonth() + 1).toString().padStart(2, '0')}`;

  const record = {
    user_id: currentUser.id,
    item_id: itemId,
    item_type: itemType,
    month: monthString,
    assigned_amount: assignedAmount
  };

  const { error } = await supabase
    .from('budgets')
    .upsert(record, { onConflict: 'user_id,month,item_id' });

  if (error) {
    console.error("Error saving assignment:", error);
    alert("Could not save the change.");
    return;
  }

  await fetchAllDataFromSupabase();
  renderAll();
}

// This function saves a single assignment value to Supabase
async function saveBudgetItem() {
  if (!currentUser) return;
  const monthString = `${currentBudgetMonth.getFullYear()}-${(currentBudgetMonth.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const record = {
    user_id: currentUser.id,
    month: monthString,
    name: document.getElementById('budgetItemName').value,
    category: document.getElementById('budgetItemCategory').value,
    needed_amount: getRaw(document.getElementById('budgetItemNeeded').value),
    assigned_amount: getRaw(document.getElementById('budgetItemNeeded').value)
  };

  const { error } = await supabase.from('budgets').insert(record);

  if (error) {
    alert("Error saving item: " + error.message);
  } else {
    // Hide the modal and reset the form
    bootstrap.Modal.getInstance(document.getElementById('addBudgetItemModal')).hide();
    document.getElementById('budgetItemForm').reset();
    
    // THE FIX: Use the same successful pattern as your other save functions
    // 1. Fetch all data again to get the new item.
    await fetchAllDataFromSupabase(); 
    // 2. Re-render the entire UI with the fresh data.
    renderAll(); 
  }
}

// This function will be the entry point for the budget page
function initializeBudgetPage() {
  // Only run this if we are on the budget page
  if (!document.getElementById('budgetAssignmentTable')) return;

  // Set up the month change buttons to re-render the budget when clicked
  document.getElementById('prevMonth')?.addEventListener('click', () => {
      currentBudgetMonth.setMonth(currentBudgetMonth.getMonth() - 1);
      loadAndRenderBudget();
  });

  document.getElementById('nextMonth')?.addEventListener('click', () => {
      currentBudgetMonth.setMonth(currentBudgetMonth.getMonth() + 1);
      loadAndRenderBudget();
  });
}


async function updateDashboardCards() {
  if (!currentUser) return;
  const totalInv = (window.investments || []).reduce((s, i) => s + getRaw(i.value), 0);
  const totalDebt = (window.debts || []).reduce((s, d) => s + getRaw(d.amount), 0);
  const totalAssetEquity = (window.assets || []).reduce((s, a) => s + Math.max(0, getRaw(a.value) - getRaw(a.loan)), 0);
  const netWorth = totalInv + totalAssetEquity - totalDebt;
  [['totalInvestments', totalInv], ['totalDebts', totalDebt], ['totalAssets', totalAssetEquity], ['netWorth', netWorth]].forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatCurrency(val);
  });
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase.from('snapshots').upsert({ date: today, netWorth, user_id: currentUser.id }, { onConflict: 'date,user_id' });
  if (error) console.error("Error saving snapshot:", error);
}
function renderUpcomingPayments() {
  const c = document.getElementById('upcomingPaymentsList');
  if (!c) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = [...(window.debts || []).map(d => ({ ...d, amount: d.monthlyPayment, category: 'Debt' })), ...(window.bills || [])].filter(item => {
      if (!item.nextDueDate) return false;
      const d = new Date(item.nextDueDate + 'T00:00:00');
      return d >= today && d <= nextWeek;
  }).sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
  c.innerHTML = upcoming.length ? upcoming.map(item => `<div class="d-flex justify-content-between border-bottom py-2"><div><strong>${item.name}</strong><span class="badge bg-secondary-subtle text-secondary-emphasis rounded-pill ms-2">${item.category || 'Bill'}</span></div><div class="text-end"><div class="text-danger fw-bold">-${formatCurrency(item.amount)}</div><small class="text-muted">${formatDate(item.nextDueDate)}</small></div></div>`).join('') : '<p class="text-muted fst-italic">No upcoming payments this week.</p>';
}
function renderNetWorthChart() {
  const ctx = document.getElementById('netWorthTimelineChart');
  if (!ctx) return;
  if (netWorthChart) netWorthChart.destroy();
  const snaps = dedupeSnapshotsByDate(window.snapshots || []);
  const theme = getThemeColors();
  netWorthChart = new Chart(ctx, { type: 'line', data: { labels: snaps.map(s => s.date), datasets: [{ label: 'Net Worth', data: snaps.map(s => getRaw(s.netWorth)), borderColor: '#4e73df', backgroundColor: theme.fill, tension: 0.3, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => formatCurrency(v), color: theme.text }, grid: { color: theme.grid } }, x: { ticks: { color: theme.text }, grid: { display: false } } }, plugins: { legend: { display: false } } } });
}
function generateMonthlyCashFlowChart() {
  const ctx = document.getElementById('cashFlowChart');
  if (!ctx) return;
  if (cashFlowChart) cashFlowChart.destroy();
  const theme = getThemeColors();
  const months = []; const incomeTotals = []; const expenseTotals = []; const today = new Date();
  for (let i = 0; i < 6; i++) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
      months.push(monthStart.toLocaleString('default', { month: 'short' }));
      let monthlyIncome = 0; let monthlyExpenses = 0;
      [...(window.income || []), ...(window.bills || []), ...(window.debts || []).map(d => ({ ...d, amount: d.monthlyPayment, frequency: 'monthly' }))].forEach(item => {
          if (!item.nextDueDate || !item.frequency) return;
          const isIncome = (typeof item.type === 'string' && (item.type.toLowerCase() === 'w2' || item.type.toLowerCase() === '1099'));
          const amount = getRaw(item.amount);
          let nextDate = new Date(item.nextDueDate + 'T00:00:00');
          while (nextDate < monthStart && nextDate.getFullYear() < today.getFullYear() + 2) { try { nextDate = getNextDate(nextDate, item.frequency); } catch { break; } }
          while (nextDate <= monthEnd) {
              if (isIncome) monthlyIncome += amount; else monthlyExpenses += amount;
              try { nextDate = getNextDate(nextDate, item.frequency); } catch { break; }
          }
      });
      incomeTotals.push(monthlyIncome); expenseTotals.push(monthlyExpenses);
  }
  cashFlowChart = new Chart(ctx, { type: 'bar', data: { labels: months, datasets: [{ label: 'Income', data: incomeTotals, backgroundColor: '#1cc88a' }, { label: 'Expenses', data: expenseTotals, backgroundColor: '#e74a3b' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, ticks: { color: theme.text }, grid: { display: false } }, y: { stacked: true, ticks: { color: theme.text }, grid: { color: theme.grid } } }, plugins: { legend: { labels: { color: theme.text } } } } });
}

// ===== INITIALIZATION =====
function setupThemeToggle() {
  const themeSwitch = document.getElementById('themeSwitch');
  if (!themeSwitch) return; // Exit if the toggle isn't on this page

  const themeLabel = document.querySelector('label[for="themeSwitch"]');

  // This function applies the selected theme to the page
  const applyTheme = (isDark) => {
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
      themeSwitch.checked = isDark;
      if (themeLabel) {
          themeLabel.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
      }
  };

  // Listen for when the user clicks the toggle
  themeSwitch.addEventListener('change', () => {
      const isDark = themeSwitch.checked;
      // Save the user's preference in their browser
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      applyTheme(isDark);
      // Re-render all components so the charts can adopt the new colors
      if (typeof renderAll === 'function') {
          renderAll();
      }
  });

  // On page load, apply the theme that was saved in localStorage
  applyTheme(localStorage.getItem('theme') === 'dark');
}
function initializeAssetForm() {
  const assetTypeDropdown = document.getElementById("assetType");
  if (!assetTypeDropdown) return;
  assetTypeDropdown.addEventListener("change", function () {
      const type = this.value;
      document.querySelectorAll(".asset-fields").forEach(el => el.classList.add("d-none"));
      if (type === "realEstate") { document.querySelector(".real-estate-fields").classList.remove("d-none"); }
      else if (type === "vehicle") { document.querySelector(".vehicle-fields").classList.remove("d-none"); }
  });
}
function init() {
  console.log("INIT: Page loaded, starting initialization.");

  function setupThemeToggle() {
    const themeSwitch = document.getElementById('themeSwitch');
    if (!themeSwitch) return; // Exit if the toggle isn't on this page

    const themeLabel = document.querySelector('label[for="themeSwitch"]');

    // This function applies the selected theme to the page
    const applyTheme = (isDark) => {
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        themeSwitch.checked = isDark;
        if (themeLabel) {
            themeLabel.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
        }
    };

    // Listen for when the user clicks the toggle
    themeSwitch.addEventListener('change', () => {
        const isDark = themeSwitch.checked;
        // Save the user's preference in their browser
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        applyTheme(isDark);
        // Re-render all components so the charts can adopt the new colors
        renderAll();
    });

    // On page load, apply the theme that was saved in localStorage
    applyTheme(localStorage.getItem('theme') === 'dark');
}

  // Auth state change listener
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`%cAUTH: Event received: ${event}`, "color: purple; font-weight: bold;");
    currentUser = session?.user || null;
  
    // Update UI based on auth state
    document.getElementById('loggedInState')?.classList.toggle('d-none', !currentUser);
    document.getElementById('loggedOutState')?.classList.toggle('d-none', !!currentUser);
    if (document.getElementById('dataContainer')) {
      document.getElementById('dataContainer').style.visibility = currentUser ? 'visible' : 'hidden';
    }
  
    if (currentUser) {
      document.getElementById('username').textContent = currentUser.user_metadata?.first_name || currentUser.email;
  
      fetchAllDataFromSupabase().then(() => {
        renderAll();
        renderAdditionalCharts(); // ✅ Moved inside fetch callback
      });
  
    } else {
      renderAll(); // Render empty tables on logout
    }
  });
  
  // Attach all event listeners safely
  document.body.addEventListener('click', (e) => {
      if (e.target.closest('#logoutButton')) {
          e.preventDefault();
          logout();
      }
  });
  document.getElementById('loginForm')?.addEventListener('submit', (e) => { e.preventDefault(); login(e.target.loginEmail.value, e.target.loginPassword.value); });
  document.getElementById('signupForm')?.addEventListener('submit', (e) => { e.preventDefault(); signUp(e.target.signupEmail.value, e.target.signupPassword.value, e.target.signupFirstName.value, e.target.signupLastName.value); });
  // CORRECTED: Listen for clicks on the SAVE buttons in each modal
  document.getElementById('saveAssetBtn')?.addEventListener('click', (e) => { e.preventDefault(); saveAsset(); });
  document.getElementById('saveInvestmentBtn')?.addEventListener('click', (e) => { e.preventDefault(); saveInvestment(); });
  document.getElementById('saveDebtBtn')?.addEventListener('click', (e) => { e.preventDefault(); saveDebt(); });
  document.getElementById('saveBillBtn')?.addEventListener('click', (e) => { e.preventDefault(); saveBill(); });
  document.getElementById('saveIncomeBtn')?.addEventListener('click', (e) => { e.preventDefault(); saveIncome(); });
  document.getElementById('saveBudgetItemBtn')?.addEventListener('click', (e) => { e.preventDefault(); saveBudgetItem(); });
  document.getElementById('saveSettingsBtn')?.addEventListener('click', (e) => { e.preventDefault(); saveSettings(); });
  console.log("INIT: Initialization complete.");

  // If we are on the dashboard, render the dashboard components
  if (document.getElementById('netWorthTimelineChart')) {
    updateDashboardCards();
    renderUpcomingPayments();
    renderNetWorthChart();
    generateMonthlyCashFlowChart();
    
}

// FIX: Also render the budget page if we are on it.
// This ensures the budget is only drawn AFTER the data fetch is complete.
if (document.getElementById('budgetAssignmentTable')) {
    loadAndRenderBudget();
}


   // 3. Setup remaining UI components.
   setupThemeToggle();
   initializeAssetForm();
   initializeBudgetPage();
   //renderAdditionalCharts();
}
document.addEventListener('DOMContentLoaded', init);

// ===== GLOBAL EXPORTS =====
window.syncLocalToSupabase = syncLocalToSupabase;
window.openAssetModal = openAssetModal;
window.confirmDeleteAsset = confirmDeleteAsset;
window.deleteAssetConfirmed = deleteAssetConfirmed;
window.openInvestmentModal = openInvestmentModal;
window.confirmDeleteInvestment = confirmDeleteInvestment;
window.deleteInvestmentConfirmed = deleteInvestmentConfirmed;
window.openDebtModal = openDebtModal;
window.confirmDeleteDebt = confirmDeleteDebt;
window.deleteDebtConfirmed = deleteDebtConfirmed;
window.openBillModal = openBillModal;
window.confirmDeleteBill = confirmDeleteBill;
window.deleteBillConfirmed = deleteBillConfirmed;
window.openIncomeModal = openIncomeModal;
window.confirmDeleteIncome = confirmDeleteIncome;
window.deleteIncomeConfirmed = deleteIncomeConfirmed;
