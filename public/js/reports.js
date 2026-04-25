// REPORTS.JS
// ============================================================
const Reports = {
  async render() {
    App.setContent(`
      <div>
        <div class="page-header"><h2>📈 রিপোর্ট</h2></div>
        <div class="tabs">
          <div class="tab active" onclick="Reports.switchTab('milk', this)">🥛 দুধ রিপোর্ট</div>
          <div class="tab" onclick="Reports.switchTab('finance', this)">💰 আর্থিক রিপোর্ট</div>
          <div class="tab" onclick="Reports.switchTab('cow', this)">🐄 গরু রিপোর্ট</div>
        </div>
        <div id="report-content"></div>
      </div>
    `);
    Reports.showMilkReport();
  },

  switchTab(tab, el) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    if (tab === 'milk') this.showMilkReport();
    else if (tab === 'finance') this.showFinanceReport();
    else if (tab === 'cow') this.showCowReport();
  },

  async showMilkReport() {
    const monthly = await ipcRenderer.invoke('getMilkSummary', 'month');
    const yearly = await ipcRenderer.invoke('getMilkSummary', 'year');
    const monthTotal = monthly.reduce((s,r) => s+r.total_milk, 0);
    const yearTotal = yearly.reduce((s,r) => s+r.total_milk, 0);
    const milkPrice = parseFloat(App.settings.milk_price || 60);

    document.getElementById('report-content').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;">
        <div class="stat-card blue"><span class="stat-icon">📅</span><div class="stat-info"><h3>মাসিক দুধ</h3><p>${monthTotal.toFixed(1)} লি.</p></div></div>
        <div class="stat-card green"><span class="stat-icon">💰</span><div class="stat-info"><h3>মাসিক দুধের আয়</h3><p style="font-size:16px">${App.formatMoney(monthTotal*milkPrice)}</p></div></div>
        <div class="stat-card teal"><span class="stat-icon">📆</span><div class="stat-info"><h3>বার্ষিক দুধ</h3><p>${yearTotal.toFixed(1)} লি.</p></div></div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:16px;font-size:15px;">📊 মাসিক দৈনিক উৎপাদন</h3>
        <div class="chart-container" style="height:300px"><canvas id="report-milk-chart"></canvas></div>
      </div>
    `;
    new Chart(document.getElementById('report-milk-chart'), {
      type: 'line',
      data: {
        labels: monthly.map(r => r.date.slice(5)),
        datasets: [{ label: 'দুধ (লি.)', data: monthly.map(r => r.total_milk), borderColor: '#1e7e4e', backgroundColor: 'rgba(30,126,78,0.1)', tension: 0.4, fill: true }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  },

  async showFinanceReport() {
    const month = await ipcRenderer.invoke('getAccountSummary', 'month');
    const year = await ipcRenderer.invoke('getAccountSummary', 'year');
    const txs = await ipcRenderer.invoke('getTransactions', { dateFrom: App.monthStart(), dateTo: App.today() });
    // Group by category
    const catMap = {};
    txs.forEach(t => {
      if (!catMap[t.category]) catMap[t.category] = { income: 0, expense: 0 };
      catMap[t.category].income += t.credit;
      catMap[t.category].expense += t.debit;
    });

    document.getElementById('report-content').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;">
        <div class="stat-card green"><span class="stat-icon">💰</span><div class="stat-info"><h3>মাসিক আয়</h3><p style="font-size:16px">${App.formatMoney(month.total_income)}</p></div></div>
        <div class="stat-card red"><span class="stat-icon">💸</span><div class="stat-info"><h3>মাসিক ব্যয়</h3><p style="font-size:16px">${App.formatMoney(month.total_expense)}</p></div></div>
        <div class="stat-card ${month.profit>=0?'green':'red'}"><span class="stat-icon">📊</span><div class="stat-info"><h3>মাসিক লাভ/ক্ষতি</h3><p style="font-size:16px">${App.formatMoney(month.profit)}</p></div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="card">
          <h3 style="margin-bottom:14px;font-size:15px;">ক্যাটাগরি ভিত্তিক</h3>
          <table><thead><tr><th>ক্যাটাগরি</th><th>আয়</th><th>ব্যয়</th></tr></thead>
          <tbody>${Object.entries(catMap).map(([cat, v]) => `
            <tr><td>${cat}</td>
            <td class="text-credit">${v.income > 0 ? App.formatMoney(v.income) : '-'}</td>
            <td class="text-debit">${v.expense > 0 ? App.formatMoney(v.expense) : '-'}</td></tr>
          `).join('')}</tbody></table>
        </div>
        <div class="card">
          <h3 style="margin-bottom:14px;font-size:15px;">বার্ষিক সারসংক্ষেপ</h3>
          <table><tbody>
            <tr><td>মোট আয়</td><td class="text-credit">${App.formatMoney(year.total_income)}</td></tr>
            <tr><td>মোট ব্যয়</td><td class="text-debit">${App.formatMoney(year.total_expense)}</td></tr>
            <tr><td><strong>নেট লাভ/ক্ষতি</strong></td><td style="font-weight:700;color:${year.profit>=0?'#28a745':'#dc3545'}">${App.formatMoney(year.profit)}</td></tr>
          </tbody></table>
        </div>
      </div>
    `;
  },

  async showCowReport() {
    const cows = await ipcRenderer.invoke('getCows');
    const total = cows.length;
    const healthy = cows.filter(c => c.health_status === 'সুস্থ').length;
    const pregnant = cows.filter(c => c.pregnancy_status === 'হ্যাঁ').length;
    const breeds = {};
    cows.forEach(c => { breeds[c.breed||'অজানা'] = (breeds[c.breed||'অজানা']||0)+1; });

    document.getElementById('report-content').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;">
        <div class="stat-card blue"><span class="stat-icon">🐄</span><div class="stat-info"><h3>মোট গরু</h3><p>${total}</p></div></div>
        <div class="stat-card green"><span class="stat-icon">💚</span><div class="stat-info"><h3>সুস্থ গরু</h3><p>${healthy}</p></div></div>
        <div class="stat-card red"><span class="stat-icon">🤒</span><div class="stat-info"><h3>অসুস্থ গরু</h3><p>${total-healthy}</p></div></div>
        <div class="stat-card orange"><span class="stat-icon">🤰</span><div class="stat-info"><h3>গর্ভবতী</h3><p>${pregnant}</p></div></div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:14px;font-size:15px;">জাত অনুযায়ী তালিকা</h3>
        <table><thead><tr><th>জাত</th><th>সংখ্যা</th></tr></thead>
        <tbody>${Object.entries(breeds).map(([b,n]) => `<tr><td>${b}</td><td><strong>${n}</strong></td></tr>`).join('')}</tbody></table>
      </div>
    `;
  }
};

// ============================================================
