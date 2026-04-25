const Dashboard = {
  async render() {
    const data = await ipcRenderer.invoke('getDashboardData');
    const s = App.settings;
    const milkPrice = parseFloat(s.milk_price || 60);
    const monthProfit = data.monthIncome - data.monthExpense;

    App.setContent(`
      <div>
        <!-- ALERTS -->
        ${data.sickCows > 0 ? `<div class="alert alert-danger">⚠️ <strong>${App.bn(data.sickCows)}টি গরু অসুস্থ!</strong> অবিলম্বে চিকিৎসা করুন।</div>` : ''}
        ${data.vaccinationsDue > 0 ? `<div class="alert alert-warning">💉 <strong>${App.bn(data.vaccinationsDue)}টি টিকা</strong> আগামী ৭ দিনের মধ্যে দিতে হবে।</div>` : ''}

        <!-- STAT CARDS -->
        <div class="stats-grid">
          <div class="stat-card green">
            <span class="stat-icon">🐄</span>
            <div class="stat-info"><h3>মোট গরু</h3><p>${App.bn(data.totalCows)}</p></div>
          </div>
          <div class="stat-card blue">
            <span class="stat-icon">🥛</span>
            <div class="stat-info"><h3>আজকের দুধ (লিটার)</h3><p>${App.bn(data.todayMilk.toFixed(1))}</p></div>
          </div>
          <div class="stat-card green">
            <span class="stat-icon">💰</span>
            <div class="stat-info"><h3>আজকের আয়</h3><p style="font-size:18px">${App.formatMoney(data.todayIncome)}</p></div>
          </div>
          <div class="stat-card red">
            <span class="stat-icon">💸</span>
            <div class="stat-info"><h3>আজকের খরচ</h3><p style="font-size:18px">${App.formatMoney(data.todayExpense)}</p></div>
          </div>
          <div class="stat-card ${monthProfit >= 0 ? 'green' : 'red'}">
            <span class="stat-icon">📊</span>
            <div class="stat-info"><h3>মাসিক লাভ/ক্ষতি</h3><p style="font-size:18px">${App.formatMoney(monthProfit)}</p></div>
          </div>
          <div class="stat-card orange">
            <span class="stat-icon">🤰</span>
            <div class="stat-info"><h3>গর্ভবতী গরু</h3><p>${App.bn(data.pregnantCows)}</p></div>
          </div>
          <div class="stat-card purple">
            <span class="stat-icon">👥</span>
            <div class="stat-info"><h3>মোট পার্টি</h3><p>${App.bn(data.totalParties)}</p></div>
          </div>
          <div class="stat-card teal">
            <span class="stat-icon">📅</span>
            <div class="stat-info"><h3>মাসিক আয়</h3><p style="font-size:18px">${App.formatMoney(data.monthIncome)}</p></div>
          </div>
        </div>

        <!-- CHARTS ROW -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
          <div class="card">
            <h3 style="margin-bottom:16px;font-size:16px;">📈 সাপ্তাহিক দুধ উৎপাদন (লিটার)</h3>
            <div class="chart-container"><canvas id="milkChart"></canvas></div>
          </div>
          <div class="card">
            <h3 style="margin-bottom:16px;font-size:16px;">💹 মাসিক আয়-ব্যয়</h3>
            <div class="chart-container"><canvas id="finChart"></canvas></div>
          </div>
        </div>

        <!-- RECENT TRANSACTIONS -->
        <div class="card">
          <div class="page-header"><h3 style="font-size:16px;">🧾 সাম্প্রতিক লেনদেন</h3><button class="btn btn-outline btn-sm" onclick="App.navigate('accounting')">সব দেখুন</button></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>তারিখ</th><th>বিবরণ</th><th>ক্যাটাগরি</th><th>আয় (৳)</th><th>ব্যয় (৳)</th></tr></thead>
              <tbody>
                ${data.recentTransactions.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:#999">কোনো লেনদেন নেই</td></tr>` :
                  data.recentTransactions.map(t => `
                  <tr>
                    <td>${App.formatDate(t.date)}</td>
                    <td>${t.description || ''}</td>
                    <td><span class="badge badge-secondary">${t.category}</span></td>
                    <td class="text-credit">${t.credit > 0 ? App.formatMoney(t.credit) : '-'}</td>
                    <td class="text-debit">${t.debit > 0 ? App.formatMoney(t.debit) : '-'}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `);

    // Milk Chart
    const milkLabels = data.recentMilk.map(r => r.date.slice(5));
    const milkVals = data.recentMilk.map(r => r.total_milk);
    new Chart(document.getElementById('milkChart'), {
      type: 'line',
      data: {
        labels: milkLabels,
        datasets: [{ label: 'দুধ (লি.)', data: milkVals, borderColor: '#1e7e4e', backgroundColor: 'rgba(30,126,78,0.1)', tension: 0.4, fill: true, pointRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    // Finance Chart
    new Chart(document.getElementById('finChart'), {
      type: 'bar',
      data: {
        labels: ['মাসিক'],
        datasets: [
          { label: 'আয়', data: [data.monthIncome], backgroundColor: '#28a745' },
          { label: 'ব্যয়', data: [data.monthExpense], backgroundColor: '#dc3545' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
  }
};
