
// @ts-nocheck

// —————— UTILS ——————
function formatCurrency(val) {
  const n = typeof val === 'number'
    ? val
    : Number(String(val).replace(/[^0-9.-]+/g, '')) || 0;
  return n.toLocaleString('en-US', { style:'currency', currency:'USD', minimumFractionDigits:2 });
}
function getRaw(val) {
  return typeof val === 'number'
    ? val
    : Number(String(val).replace(/[^0-9.-]+/g, '')) || 0;
}

// —————— SNAPSHOT & DASHBOARD ——————
function saveSnapshot() {
  const invs   = JSON.parse(localStorage.getItem('investments')||'[]');
  const debts  = JSON.parse(localStorage.getItem('debts')||'[]');
  const assets = JSON.parse(localStorage.getItem('assets')||'[]');

  const totalInv = invs.reduce((sum,i)=> sum + getRaw(i.value),0);
  const totalDebt = debts.reduce((sum,d)=> sum + getRaw(d.amount),0);
  const totalAssetEquity = assets.reduce((sum,a)=>{
    return sum + Math.max(getRaw(a.value)-getRaw(a.loan),0);
  },0);
  const net = totalInv + totalAssetEquity - totalDebt;

  [['totalInvestments',totalInv],
   ['totalDebts',     totalDebt],
   ['totalAssets',    totalAssetEquity],
   ['netWorth',       net]
  ].forEach(([id,val])=>{
    const el = document.getElementById(id);
    if(el) el.textContent = formatCurrency(val);
  });

  const snaps = JSON.parse(localStorage.getItem('snapshots')||'[]');
  const today = new Date().toISOString().slice(0,10);
  if(!snaps.find(s=>s.date===today)){
    snaps.push({ date: today, netWorth: net });
    localStorage.setItem('snapshots', JSON.stringify(snaps));
  }
}

// —————— NET WORTH CHART ——————
function renderNetWorthChart(){
  const ctx = document.getElementById('netWorthTimelineChart');
  if(!ctx) return;
  const snaps = JSON.parse(localStorage.getItem('snapshots')||'[]');
  new Chart(ctx,{
    type:'line',
    data:{
      labels: snaps.map(s=>s.date),
      datasets:[{
        label:'Net Worth',
        data: snaps.map(s=>getRaw(s.netWorth)),
        borderColor:'#007bff',
        backgroundColor:'rgba(0,123,255,0.1)',
        tension:0.3, fill:true
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      scales:{ y:{ ticks:{ callback:v=>formatCurrency(v) } } },
      plugins:{ legend:{ display:false } }
    }
  });
}

// BOOTSTRAP ONLOAD FIXED (correct braces, correct formatting)
window.addEventListener('DOMContentLoaded', function () {
  loadInvestments(); renderInvestments();
  loadDebts();       renderDebts();
  loadAssets();      renderAssets();
  saveSnapshot();
  renderNetWorthChart();

  const assetTypeEl = document.getElementById('assetType');
  if (assetTypeEl) {
    assetTypeEl.addEventListener('change', function (e) {
      document.querySelectorAll('.asset-fields').forEach(function (el) {
        el.classList.add('d-none');
      });

      const selector = (e.target.value === 'realEstate')
        ? '.real-estate-fields'
        : '.vehicle-fields';

      const showEl = document.querySelector(selector);
      if (showEl) showEl.classList.remove('d-none');
    });
  }
});
