const Accounting = {
  categories: ['দুধ বিক্রয়', 'গরু ক্রয়', 'গরু বিক্রয়', 'খাদ্য খরচ', 'ওষুধ খরচ', 'শ্রমিক মজুরি', 'ভেটেরিনারি', 'পরিবহন', 'অন্যান্য আয়', 'অন্যান্য খরচ'],

  async render() {
    App.setContent(`
      <div>
        <div class="page-header">
          <h2>📒 হিসাব খাতা</h2>
          <button class="btn btn-primary" onclick="Accounting.openAdd()">➕ লেনদেন যোগ করুন</button>
        </div>

        <!-- SUMMARY -->
        <div id="acc-summary" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;"></div>

        <!-- FILTERS -->
        <div class="card">
          <div class="filter-row">
            <input type="date" id="acc-from" value="${App.monthStart()}">
            <input type="date" id="acc-to" value="${App.today()}">
            <select id="acc-cat">
              <option value="">সব ক্যাটাগরি</option>
              ${this.categories.map(c => `<option>${c}</option>`).join('')}
            </select>
            <button class="btn btn-primary btn-sm" onclick="Accounting.load()">🔍 ফিল্টার</button>
            <button class="btn btn-secondary btn-sm" onclick="Accounting.reset()">রিসেট</button>
            <button class="btn btn-outline btn-sm" onclick="Accounting.print()">🖨️ প্রিন্ট</button>
          </div>
          <div id="acc-table"></div>
        </div>

        <!-- MODAL -->
        <div class="modal-overlay" id="acc-modal">
          <div class="modal">
            <div class="modal-header">
              <h3>➕ নতুন লেনদেন</h3>
              <button class="modal-close" onclick="App.closeModal('acc-modal')">✕</button>
            </div>
            <div class="form-grid">
              <div class="form-group"><label>তারিখ *</label><input type="date" id="a-date" value="${App.today()}"></div>
              <div class="form-group"><label>ক্যাটাগরি *</label>
                <select id="a-category">
                  <option value="">নির্বাচন করুন</option>
                  ${this.categories.map(c => `<option>${c}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="grid-column:1/-1"><label>বিবরণ</label><input type="text" id="a-description" placeholder="লেনদেনের বিবরণ লিখুন..."></div>
              <div class="form-group">
                <label>আয় / ক্রেডিট (৳)</label>
                <input type="number" id="a-credit" min="0" step="0.01" value="0" placeholder="0.00">
              </div>
              <div class="form-group">
                <label>ব্যয় / ডেবিট (৳)</label>
                <input type="number" id="a-debit" min="0" step="0.01" value="0" placeholder="0.00">
              </div>
              <div class="form-group"><label>রেফারেন্স</label><input type="text" id="a-reference" placeholder="ঐচ্ছিক..."></div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" onclick="Accounting.save()">💾 সংরক্ষণ</button>
              <button class="btn btn-secondary" onclick="App.closeModal('acc-modal')">বাতিল</button>
            </div>
          </div>
        </div>
      </div>
    `);
    await this.load();
  },

  async load() {
    const from = document.getElementById('acc-from')?.value;
    const to = document.getElementById('acc-to')?.value;
    const category = document.getElementById('acc-cat')?.value;
    const txs = await ipcRenderer.invoke('getTransactions', { dateFrom: from, dateTo: to, category });
    await this.renderSummary(from, to);
    this.renderTable(txs);
  },

  async renderSummary(from, to) {
    const s = await ipcRenderer.invoke('getAccountSummary', 'today');
    const m = await ipcRenderer.invoke('getAccountSummary', 'month');
    document.getElementById('acc-summary').innerHTML = `
      <div class="stat-card green"><span class="stat-icon">💰</span><div class="stat-info"><h3>আজকের আয়</h3><p style="font-size:18px">${App.formatMoney(s.total_income)}</p></div></div>
      <div class="stat-card red"><span class="stat-icon">💸</span><div class="stat-info"><h3>আজকের ব্যয়</h3><p style="font-size:18px">${App.formatMoney(s.total_expense)}</p></div></div>
      <div class="stat-card ${m.profit>=0?'green':'red'}"><span class="stat-icon">📊</span><div class="stat-info"><h3>মাসিক লাভ/ক্ষতি</h3><p style="font-size:18px">${App.formatMoney(m.profit)}</p></div></div>
    `;
  },

  renderTable(txs) {
    const el = document.getElementById('acc-table');
    if (!txs.length) {
      el.innerHTML = `<div class="empty-state"><span class="icon">📒</span><p>কোনো লেনদেন নেই</p></div>`;
      return;
    }
    let totalDebit = 0, totalCredit = 0, balance = 0;
    const rows = txs.map(t => {
      totalDebit += t.debit;
      totalCredit += t.credit;
      balance += t.credit - t.debit;
      return `<tr>
        <td>${App.formatDate(t.date)}</td>
        <td><span class="badge badge-secondary">${t.category}</span></td>
        <td>${t.description || ''}</td>
        <td class="text-credit">${t.credit > 0 ? App.formatMoney(t.credit) : '-'}</td>
        <td class="text-debit">${t.debit > 0 ? App.formatMoney(t.debit) : '-'}</td>
        <td>${t.reference || ''}</td>
        <td><button class="btn btn-danger btn-sm btn-icon" onclick="Accounting.delete(${t.id})">🗑️</button></td>
      </tr>`;
    }).join('');
    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>তারিখ</th><th>ক্যাটাগরি</th><th>বিবরণ</th><th>আয় (৳)</th><th>ব্যয় (৳)</th><th>রেফারেন্স</th><th>মুছুন</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot style="background:#f0f4f1;font-weight:700;">
            <tr>
              <td colspan="3" style="padding:12px 14px;">মোট</td>
              <td style="padding:12px 14px;color:#28a745">${App.formatMoney(totalCredit)}</td>
              <td style="padding:12px 14px;color:#dc3545">${App.formatMoney(totalDebit)}</td>
              <td colspan="2" style="padding:12px 14px;color:${balance>=0?'#28a745':'#dc3545'}">নেট: ${App.formatMoney(balance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;
  },

  reset() {
    document.getElementById('acc-from').value = App.monthStart();
    document.getElementById('acc-to').value = App.today();
    document.getElementById('acc-cat').value = '';
    this.load();
  },

  openAdd() {
    ['date','description','reference'].forEach(f => {
      const el = document.getElementById('a-'+f);
      if (el) el.value = f === 'date' ? App.today() : '';
    });
    document.getElementById('a-category').value = '';
    document.getElementById('a-credit').value = '0';
    document.getElementById('a-debit').value = '0';
    App.openModal('acc-modal');
  },

  async save() {
    const data = {
      date: document.getElementById('a-date').value,
      category: document.getElementById('a-category').value,
      description: document.getElementById('a-description').value.trim(),
      credit: parseFloat(document.getElementById('a-credit').value) || 0,
      debit: parseFloat(document.getElementById('a-debit').value) || 0,
      reference: document.getElementById('a-reference').value.trim()
    };
    if (!data.date || !data.category) { App.toast('তারিখ ও ক্যাটাগরি দেওয়া আবশ্যক', 'error'); return; }
    if (data.credit === 0 && data.debit === 0) { App.toast('আয় বা ব্যয়ের পরিমাণ দিন', 'error'); return; }
    await ipcRenderer.invoke('addTransaction', data);
    App.closeModal('acc-modal');
    App.toast('লেনদেন সংরক্ষিত হয়েছে ✅');
    await this.load();
  },

  async delete(id) {
    if (!App.confirm('এই লেনদেন মুছে ফেলতে চান?')) return;
    await ipcRenderer.invoke('deleteTransaction', id);
    App.toast('লেনদেন মুছে ফেলা হয়েছে');
    await this.load();
  },

  print() {
    window.print();
  }
};
