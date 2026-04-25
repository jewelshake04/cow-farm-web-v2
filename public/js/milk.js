const Milk = {
  cows: [],
  entries: [],

  async render() {
    this.cows = await ipcRenderer.invoke('getCows');
    App.setContent(`
      <div>
        <div class="page-header">
          <h2>🥛 দুধ ট্র্যাকিং</h2>
          <button class="btn btn-primary" onclick="Milk.openAdd()">➕ দুধ এন্ট্রি</button>
        </div>

        <!-- SUMMARY CARDS -->
        <div id="milk-summary-cards" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;"></div>

        <!-- CHART -->
        <div class="card" style="margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-size:16px;">📈 দুধ উৎপাদন গ্রাফ</h3>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-outline btn-sm" onclick="Milk.loadChart('week')">সপ্তাহ</button>
              <button class="btn btn-outline btn-sm" onclick="Milk.loadChart('month')">মাস</button>
              <button class="btn btn-outline btn-sm" onclick="Milk.loadChart('year')">বছর</button>
            </div>
          </div>
          <div class="chart-container"><canvas id="milk-chart"></canvas></div>
        </div>

        <!-- FILTERS -->
        <div class="card">
          <div class="filter-row">
            <select id="milk-cow-filter" onchange="Milk.loadEntries()">
              <option value="">সব গরু</option>
              ${this.cows.map(c => `<option value="${c.id}">${c.name} (${c.cow_id})</option>`).join('')}
            </select>
            <input type="date" id="milk-from" value="${App.today()}" onchange="Milk.loadEntries()">
            <input type="date" id="milk-to" value="${App.today()}" onchange="Milk.loadEntries()">
            <button class="btn btn-outline btn-sm" onclick="Milk.loadEntries()">🔍 ফিল্টার</button>
            <button class="btn btn-secondary btn-sm" onclick="Milk.clearFilter()">রিসেট</button>
          </div>
          <div id="milk-list"></div>
        </div>

        <!-- ADD MODAL -->
        <div class="modal-overlay" id="milk-modal">
          <div class="modal">
            <div class="modal-header">
              <h3>🥛 দুধ এন্ট্রি</h3>
              <button class="modal-close" onclick="App.closeModal('milk-modal')">✕</button>
            </div>
            <div class="form-grid">
              <div class="form-group"><label>গরু *</label>
                <select id="m-cow_id">
                  <option value="">নির্বাচন করুন</option>
                  ${this.cows.map(c => `<option value="${c.id}">${c.name} (${c.cow_id})</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label>তারিখ *</label><input type="date" id="m-date" value="${App.today()}"></div>
              <div class="form-group"><label>সকালের দুধ (লিটার)</label><input type="number" id="m-morning" min="0" step="0.1" value="0" oninput="Milk.calcTotal()"></div>
              <div class="form-group"><label>বিকালের দুধ (লিটার)</label><input type="number" id="m-evening" min="0" step="0.1" value="0" oninput="Milk.calcTotal()"></div>
              <div class="form-group"><label>মোট (লিটার)</label><input type="number" id="m-total" readonly style="background:#f8f9fa;font-weight:700;color:#1e7e4e"></div>
              <div class="form-group"><label>নোট</label><input type="text" id="m-notes" placeholder="ঐচ্ছিক..."></div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" onclick="Milk.save()">💾 সংরক্ষণ</button>
              <button class="btn btn-secondary" onclick="App.closeModal('milk-modal')">বাতিল</button>
            </div>
          </div>
        </div>
      </div>
    `);
    await this.loadSummary();
    await this.loadEntries();
    await this.loadChart('week');
  },

  calcTotal() {
    const m = parseFloat(document.getElementById('m-morning').value) || 0;
    const e = parseFloat(document.getElementById('m-evening').value) || 0;
    document.getElementById('m-total').value = (m + e).toFixed(1);
  },

  async loadSummary() {
    const today = await ipcRenderer.invoke('getDailyMilkTotal', App.today());
    const week = await ipcRenderer.invoke('getMilkSummary', 'week');
    const month = await ipcRenderer.invoke('getMilkSummary', 'month');
    const weekTotal = week.reduce((s,r) => s+r.total_milk, 0);
    const monthTotal = month.reduce((s,r) => s+r.total_milk, 0);
    const milkPrice = parseFloat(App.settings.milk_price || 60);
    document.getElementById('milk-summary-cards').innerHTML = `
      <div class="stat-card blue"><span class="stat-icon">🥛</span><div class="stat-info"><h3>আজকের মোট দুধ</h3><p>${App.bn(today.total.toFixed(1))} লি.</p></div></div>
      <div class="stat-card green"><span class="stat-icon">📅</span><div class="stat-info"><h3>সাপ্তাহিক মোট</h3><p>${App.bn(weekTotal.toFixed(1))} লি.</p></div></div>
      <div class="stat-card teal"><span class="stat-icon">💰</span><div class="stat-info"><h3>মাসিক মোট</h3><p>${App.bn(monthTotal.toFixed(1))} লি. — ${App.formatMoney(monthTotal*milkPrice)}</p></div></div>
    `;
  },

  async loadEntries() {
    const cowId = document.getElementById('milk-cow-filter')?.value || '';
    const from = document.getElementById('milk-from')?.value || '';
    const to = document.getElementById('milk-to')?.value || '';
    this.entries = await ipcRenderer.invoke('getMilkEntries', cowId || null, from || null, to || null);
    const container = document.getElementById('milk-list');
    if (!this.entries.length) {
      container.innerHTML = `<div class="empty-state"><span class="icon">🥛</span><p>কোনো এন্ট্রি নেই</p></div>`;
      return;
    }
    const total = this.entries.reduce((s,e) => s+e.total, 0);
    container.innerHTML = `
      <div style="margin-bottom:10px;font-weight:600;color:#1e7e4e">মোট দুধ: ${total.toFixed(1)} লিটার — ${App.formatMoney(total * parseFloat(App.settings.milk_price||60))}</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>তারিখ</th><th>গরু</th><th>সকাল (লি.)</th><th>বিকাল (লি.)</th><th>মোট (লি.)</th><th>নোট</th><th>মুছুন</th></tr></thead>
          <tbody>
            ${this.entries.map(e => `
            <tr>
              <td>${App.formatDate(e.date)}</td>
              <td>${e.cow_name} <small style="color:#999">${e.cow_code}</small></td>
              <td>${e.morning}</td>
              <td>${e.evening}</td>
              <td><strong>${e.total}</strong></td>
              <td>${e.notes || ''}</td>
              <td><button class="btn btn-danger btn-sm btn-icon" onclick="Milk.delete(${e.id})">🗑️</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async loadChart(period) {
    const data = await ipcRenderer.invoke('getMilkSummary', period);
    const ctx = document.getElementById('milk-chart');
    if (!ctx) return;
    if (this._chart) this._chart.destroy();
    this._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(r => r.date.slice(5)),
        datasets: [{ label: 'দুধ (লিটার)', data: data.map(r => r.total_milk), backgroundColor: 'rgba(30,126,78,0.7)', borderColor: '#1e7e4e', borderWidth: 1, borderRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  },

  clearFilter() {
    document.getElementById('milk-cow-filter').value = '';
    document.getElementById('milk-from').value = '';
    document.getElementById('milk-to').value = '';
    this.loadEntries();
  },

  openAdd() {
    document.getElementById('m-cow_id').value = '';
    document.getElementById('m-date').value = App.today();
    document.getElementById('m-morning').value = '0';
    document.getElementById('m-evening').value = '0';
    document.getElementById('m-total').value = '0';
    document.getElementById('m-notes').value = '';
    App.openModal('milk-modal');
  },

  async save() {
    const data = {
      cow_id: document.getElementById('m-cow_id').value,
      date: document.getElementById('m-date').value,
      morning: document.getElementById('m-morning').value || 0,
      evening: document.getElementById('m-evening').value || 0,
      notes: document.getElementById('m-notes').value
    };
    if (!data.cow_id || !data.date) { App.toast('গরু ও তারিখ নির্বাচন করুন', 'error'); return; }
    await ipcRenderer.invoke('addMilkEntry', data);
    App.closeModal('milk-modal');
    App.toast('দুধ এন্ট্রি সংরক্ষিত হয়েছে ✅');
    await this.loadSummary();
    await this.loadEntries();
  },

  async delete(id) {
    if (!App.confirm('এই এন্ট্রি মুছে ফেলতে চান?')) return;
    await ipcRenderer.invoke('deleteMilkEntry', id);
    App.toast('এন্ট্রি মুছে ফেলা হয়েছে');
    await this.loadSummary();
    await this.loadEntries();
  }
};
