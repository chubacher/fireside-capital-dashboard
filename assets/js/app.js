import { renderNetWorthChart, generateMonthlyCashFlowChart } from './charts.js';
import {
  loadAssets, renderAssets, openAssetModal, deleteAsset,
  loadInvestments, renderInvestments, editInvestment, confirmDeleteInvestment,
  loadDebts, renderDebts, editDebt, confirmDeleteDebt, 
  loadBills, renderBills, editBill, confirmDeleteBill,
  loadIncome, renderIncome, editIncome, confirmDeleteIncome,
} from './transactions.js';
import { formatCurrency, getRaw, formatDate } from './utility.js';
import { initializePlaid, openPlaidLink } from './plaid.js';
import { signUp, login, logout } from './authentication.js';

// Initialize Supabase
const supabaseUrl = 'https://bgsdnlkhwgbdbdvmhrzv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnc2RubGtod2diZGJkdm1ocnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNjM0MjQsImV4cCI6MjA2NTczOTQyNH0.fCUUUrwn5Gy6J7KIMty3grq2a8GtNIHSqLLue3Q_nVM';
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

// Snapshot & Dashboard
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

  if (!snaps.some(s => s.date === today)) {
    snaps.push({ date: today, netWorth: net });
    localStorage.setItem('snapshots', JSON.stringify(snaps));
  }
}

// Upcoming Payments
function renderUpcomingPayments() {
  const container = document.getElementById('upcomingPaymentsList');
  if (!container) return;

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const debts = JSON.parse(localStorage.getItem('debts') || '[]');
  const bills = JSON.parse(localStorage.getItem('bills') || '[]');
  const income = JSON.parse(localStorage.getItem('income') || '[]');

  const all = [
    ...debts.map(d => ({ ...d, amount: d.monthlyPayment, category: 'Debt' })),
    ...bills.map(b => ({ ...b, category: 'Bill' })),
    ...income.map(i => ({ ...i, category: 'Income' }))
  ];

  const upcoming = all.filter(item => {
    if (!item.nextDueDate) return false;
    const dueDate = new Date(item.nextDueDate);
    return dueDate >= today && dueDate <= nextWeek;
  }).sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));

  container.innerHTML = upcoming.length ? upcoming.map(item => `
    <div class="d-flex justify-content-between border-bottom py-2">
      <div>
        <strong>${item.name}</strong> <span class="text-muted">(${item.category})</span><br>
        <small class="text-muted">${item.type}</small>
      </div>
      <div class="text-end">
        <div>${formatCurrency(item.amount)}</div>
        <small class="text-muted">${formatDate(item.nextDueDate)}</small>
      </div>
    </div>
  `).join('') : '<div class="text-muted">No upcoming payments this week.</div>';
}

// Theme Toggle
function setupThemeToggle() {
  const themeSwitch = document.getElementById('themeSwitch');
  const themeLabel = document.querySelector('label[for="themeSwitch"]');

  themeSwitch?.addEventListener('change', function () {
    const isDark = this.checked;
    document.body.setAttribute('data-theme', isDark ? 'dark' : '');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (themeLabel) themeLabel.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    renderNetWorthChart();
    generateMonthlyCashFlowChart();
  });

  // Load theme from localStorage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    if (themeSwitch) themeSwitch.checked = true;
  }
}

// Main initialization

function init() {
  loadAssets();
  console.log('Assets loaded:', window.assets);
  loadInvestments();
  console.log('Investments loaded:', window.investments);
  loadDebts();
  console.log('Debts loaded:', window.debts);
  loadBills();
  console.log('Bills loaded:', window.bills);
  loadIncome();
  console.log('Income loaded:', window.income);

  renderAssets();
  renderInvestments();
  renderDebts();
  renderBills();
  renderIncome();
  saveSnapshot();
  renderUpcomingPayments();
  renderNetWorthChart();
  generateMonthlyCashFlowChart();
  setupThemeToggle();
  initializePlaid();
}
// Event Listeners
document.getElementById('connectBankBtn')?.addEventListener('click', openPlaidLink);

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const user = await login(email, password);
    console.log('Login successful:', user); // Add this line
    // Handle successful login (e.g., hide login modal, show user info)
  } catch (error) {
    console.error('Login error:', error); // Add this line
    // Handle login error (e.g., show error message)
  }
});

document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const firstName = document.getElementById('signupFirstName').value;
  const lastName = document.getElementById('signupLastName').value;
  try {
    const user = await signUp(email, password, firstName, lastName);
    console.log('Signup successful:', user); // Add this line
    // Handle successful signup (e.g., hide signup modal, show success message)
  } catch (error) {
    console.error('Signup error:', error); // Add this line
    // Handle signup error (e.g., show error message)
  }
});

document.getElementById('logoutButton')?.addEventListener('click', async () => {
  try {
    await logout();
    // Handle successful logout (e.g., clear user data, redirect to login page)
  } catch (error) {
    // Handle logout error
  }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);
// Expose necessary functions to global scope
window.openAssetModal = openAssetModal;
window.deleteAsset = deleteAsset;
window.editInvestment = editInvestment;
window.confirmDeleteInvestment = confirmDeleteInvestment;
window.editDebt = editDebt;
window.confirmDeleteDebt = confirmDeleteDebt;
window.editBill = editBill;
window.confirmDeleteBill = confirmDeleteBill;
window.editIncome = editIncome;
window.confirmDeleteIncome = confirmDeleteIncome;
window.openPlaidLink = openPlaidLink; // Add this line