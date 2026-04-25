const Parties = {
  list: [],
  currentParty: null,
  editId: null,

  async render() {
    App.setContent(`
      <div>
        <div class="page-header">
          <h2>👥 পার্টি / কাস্টমার লেজার</h2>
          <button class="btn btn-primary" onclick="Parties.openAdd()">➕ নতুন পার্টি যোগ করুন</button>
        </div>

        <!-- DUE SUMMARY -->
        <div id="due-summary" style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px;"></div>

        <div style="display:grid;grid-template-columns:280px 1fr;gap:20px;min-height:500px;">
          <!-- PARTY LIST -->
          <div class="card" style="padding:0;overflow:hidden;">
            <div style="padding:14px 16px;border-bottom:1px solid #dee2e6;display:flex;justify-content:space-between;align-items:center;">
              <strong>পার্টির তালিকা</strong>
              <select id="party-type-filter" onchange="Parties.filterList()" style="padding:5px 8px;border:1.5px solid #dee2e6;border-radius:6px;font-size:13px;font-family:inherit">
                <option value="">সব</option>
                <option value="customer">ক্রেতা</option>
                <option value="supplier">সরবরাহকারী</option>
                <option value="buyer">গরু ক্রেতা</option>
              </select>
            </div>
            <input class="search-input" id="party-search" placeholder="🔍 নাম বা ফোন..." oninput="Parties.filterList()" style="margin:10px;width:calc(100% - 20px);">
            <div id="party-list-panel" style="overflow-y:auto;max-height:500px;"></div>
          </div>

          <!-- LEDGER PANEL -->
          <div id="ledger-panel">
            <div class="empty-state card"><span class="icon">👈</span><p>বাম থেকে একটি পার্টি নির্বাচন করুন</p></div>
          </div>
        </div>

        <!-- ADD PARTY MODAL -->
        <div class="modal-overlay" id="party-modal">
          <div class="modal">
            <div class="modal-header">
              <h3 id="party-modal-title">নতুন পার্টি যোগ করুন</h3>
              <button class="modal-close" onclick="App.closeModal('party-modal')">✕</button>
            </div>
            <div class="form-grid">
              <div class="form-group"><label>নাম *</label><input type="text" id="p-name" placeholder="পার্টির নাম"></div>
              <div class="form-group"><label>ধরন *</label>
                <select id="p-type">
                  <option value="customer">ক্রেতা (দুধ/গরু)</option>
                  <option value="supplier">সরবরাহকারী (খাদ্য/ওষুধ)</option>
                  <option value="buyer">গরু ক্রেতা</option>
                </select>
              </div>
              <div class="form-group"><label>ফোন</label><input type="text" id="p-phone" placeholder="01XXXXXXXXX"></div>
              <div class="form-group"><label>ঠিকানা</label><input type="text" id="p-address" placeholder="গ্রাম/থানা/জেলা"></div>
              <div class="form-group"><label>প্রারম্ভিক ব্যালেন্স (৳)</label><input type="number" id="p-opening_balance" value="0" min="0"></div>
              <div class="form-group"><label>ব্যালেন্স ধরন</label>
                <select id="p-balance_type">
                  <option value="debit">পাওনা (ডেবিট)</option>
                  <option value="credit">দেনা (ক্রেডিট)</option>
                </select>
              </div>
              <div class="form-group" style="grid-column:1/-1"><label>নোট</label><textarea id="p-notes" rows="2"></textarea></div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" onclick="Parties.saveParty()">💾 সংরক্ষণ</button>
              <button class="btn btn-secondary" onclick="App.closeModal('party-modal')">বাতিল</button>
            </div>
          </div>
        </div>

        <!-- ADD TRANSACTION MODAL -->
        <div class="modal-overlay" id="ptx-modal">
          <div class="modal">
            <div class="modal-header">
              <h3 id="ptx-party-name">লেনদেন যোগ করুন</h3>
              <button class="modal-close" onclick="App.closeModal('ptx-modal')">✕</button>
            </div>
            <div class="form-grid">
              <div class="form-group"><label>তারিখ *</label><input type="date" id="pt-date" value="${App.today()}"></div>
              <div class="form-group" style="grid-column:1/-1"><label>বিবরণ *</label><input type="text" id="pt-description" placeholder="লেনদেনের বিবরণ..."></div>
              <div class="form-group"><label>পাওনা / ডেবিট (৳)</label><input type="number" id="pt-debit" value="0" min="0" step="0.01"></div>
              <div class="form-group"><label>দেনা / ক্রেডিট (৳)</label><input type="number" id="pt-credit" value="0" min="0" step="0.01"></div>
              <div class="form-group"><label>রেফারেন্স</label><input type="text" id="pt-reference" placeholder="ঐচ্ছিক..."></div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" onclick="Parties.saveTransaction()">💾 সংরক্ষণ</button>
              <button class="btn btn-secondary" onclick="App.closeModal('ptx-modal')">বাতিল</button>
            </div>
          </div>
        </div>
      </div>
    `);
    await this.loadDueSummary();
    await this.loadList();
  },

  async loadDueSummary() {
    const dues = await ipcRenderer.invoke('getAllDues');
    const receivable = dues.filter(d => d.balance > 0).reduce((s,d) => s+d.balance, 0);
    const payable = dues.filter(d => d.balance < 0).reduce((s,d) => s+Math.abs(d.balance), 0);
    document.getElementById('due-summary').innerHTML = `
      <div class="stat-card green"><span class="stat-icon">💵</span><div class="stat-info"><h3>মোট পাওনা (পাবেন)</h3><p style="font-size:18px">${App.formatMoney(receivable)}</p></div></div>
      <div class="stat-card red"><span class="stat-icon">💳</span><div class="stat-info"><h3>মোট দেনা (দেবেন)</h3><p style="font-size:18px">${App.formatMoney(payable)}</p></div></div>
    `;
  },

  async loadList() {
    this.list = await ipcRenderer.invoke('getParties');
    this.renderList(this.list);
  },

  renderList(parties) {
    const el = document.getElementById('party-list-panel');
    if (!parties.length) {
      el.innerHTML = `<p style="text-align:center;color:#999;padding:20px;font-size:13px">কোনো পার্টি নেই</p>`;
      return;
    }
    el.innerHTML = parties.map(p => {
      const typeLabels = { customer: 'ক্রেতা', supplier: 'সরবরাহকারী', buyer: 'গরু ক্রেতা' };
      return `<div class="party-item ${this.currentParty?.id === p.id ? 'active' : ''}" onclick="Parties.selectParty(${p.id})"
        style="padding:12px 16px;cursor:pointer;border-bottom:1px solid #f0f0f0;transition:background 0.15s;${this.currentParty?.id === p.id ? 'background:#e8f5e9;border-left:3px solid #1e7e4e;' : ''}">
        <div style="font-weight:600;font-size:14px">${p.name}</div>
        <div style="font-size:12px;color:#999;margin-top:2px">
          <span class="badge badge-info" style="font-size:10px">${typeLabels[p.type]||p.type}</span>
          ${p.phone ? ' · '+p.phone : ''}
        </div>
      </div>`;
    }).join('');
  },

  filterList() {
    const q = document.getElementById('party-search')?.value.toLowerCase() || '';
    const t = document.getElementById('party-type-filter')?.value || '';
    const filtered = this.list.filter(p =>
      (!q || p.name.toLowerCase().includes(q) || (p.phone||'').includes(q)) &&
      (!t || p.type === t)
    );
    this.renderList(filtered);
  },

  async selectParty(id) {
    const bal = await ipcRenderer.invoke('getPartyBalance', id);
    this.currentParty = bal.party;
    this.filterList();
    const ledger = await ipcRenderer.invoke('getPartyLedger', id, null, null);
    const typeLabels = { customer: 'ক্রেতা', supplier: 'সরবরাহকারী', buyer: 'গরু ক্রেতা' };

    // Calculate running balance
    let runBal = bal.party.balance_type === 'debit' ? bal.party.opening_balance : -bal.party.opening_balance;
    const rows = ledger.map(tx => {
      runBal += tx.debit - tx.credit;
      return `<tr>
        <td>${App.formatDate(tx.date)}</td>
        <td>${tx.description || ''}</td>
        <td class="text-debit">${tx.debit > 0 ? App.formatMoney(tx.debit) : '-'}</td>
        <td class="text-credit">${tx.credit > 0 ? App.formatMoney(tx.credit) : '-'}</td>
        <td class="running-balance" style="color:${runBal>=0?'#dc3545':'#28a745'}">${App.formatMoney(Math.abs(runBal))} ${runBal>0?'Dr':'Cr'}</td>
        <td><button class="btn btn-danger btn-sm btn-icon" onclick="Parties.deleteTransaction(${tx.id})">🗑️</button></td>
      </tr>`;
    });

    document.getElementById('ledger-panel').innerHTML = `
      <div class="card">
        <div class="page-header">
          <div>
            <h3>${bal.party.name}</h3>
            <p style="font-size:13px;color:#666">${typeLabels[bal.party.type]||bal.party.type} ${bal.party.phone ? '· 📞 '+bal.party.phone : ''} ${bal.party.address ? '· 📍 '+bal.party.address : ''}</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-primary btn-sm" onclick="Parties.openTransaction()">➕ লেনদেন</button>
            <button class="btn btn-warning btn-sm" onclick="Parties.openEdit(${bal.party.id})">✏️ সম্পাদনা</button>
            <button class="btn btn-danger btn-sm" onclick="Parties.deleteParty(${bal.party.id})">🗑️</button>
            <button class="btn btn-outline btn-sm" onclick="window.print()">🖨️</button>
          </div>
        </div>

        <!-- BALANCE SUMMARY -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
          <div style="background:#e8f5e9;padding:14px;border-radius:10px;text-align:center;">
            <div style="font-size:12px;color:#666;">মোট পাওনা</div>
            <div class="text-debit" style="font-size:20px;font-weight:700;">${App.formatMoney(bal.totalDebit)}</div>
          </div>
          <div style="background:#ffeef0;padding:14px;border-radius:10px;text-align:center;">
            <div style="font-size:12px;color:#666;">মোট পরিশোধ</div>
            <div class="text-credit" style="font-size:20px;font-weight:700;">${App.formatMoney(bal.totalCredit)}</div>
          </div>
          <div style="background:${bal.balance>=0?'#fff3cd':'#d4edda'};padding:14px;border-radius:10px;text-align:center;">
            <div style="font-size:12px;color:#666;">নেট ব্যালেন্স</div>
            <div style="font-size:20px;font-weight:700;color:${bal.balance>=0?'#dc3545':'#28a745'}">${App.formatMoney(Math.abs(bal.balance))} ${bal.balance>0?'(পাওনা)':'(দেনা)'}</div>
          </div>
        </div>

        <!-- LEDGER TABLE -->
        <div class="table-wrap">
          <table>
            <thead>
              <tr style="background:#e8f5e9;">
                <td colspan="6" style="padding:10px 14px;font-weight:600;">প্রারম্ভিক ব্যালেন্স: ${App.formatMoney(bal.party.opening_balance)} (${bal.party.balance_type==='debit'?'পাওনা':'দেনা'})</td>
              </tr>
              <tr><th>তারিখ</th><th>বিবরণ</th><th>পাওনা (Dr)</th><th>পরিশোধ (Cr)</th><th>ব্যালেন্স</th><th>মুছুন</th></tr>
            </thead>
            <tbody>
              ${rows.length ? rows.join('') : `<tr><td colspan="6" style="text-align:center;color:#999;padding:30px;">কোনো লেনদেন নেই</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  openAdd() {
    this.editId = null;
    document.getElementById('party-modal-title').textContent = 'নতুন পার্টি যোগ করুন';
    ['name','phone','address','notes'].forEach(f => { const el = document.getElementById('p-'+f); if(el) el.value = ''; });
    document.getElementById('p-type').value = 'customer';
    document.getElementById('p-opening_balance').value = '0';
    document.getElementById('p-balance_type').value = 'debit';
    App.openModal('party-modal');
  },

  async openEdit(id) {
    this.editId = id;
    const party = this.currentParty;
    document.getElementById('party-modal-title').textContent = 'পার্টির তথ্য সম্পাদনা';
    ['name','phone','address','notes'].forEach(f => { const el = document.getElementById('p-'+f); if(el) el.value = party[f] || ''; });
    document.getElementById('p-type').value = party.type;
    document.getElementById('p-opening_balance').value = party.opening_balance;
    document.getElementById('p-balance_type').value = party.balance_type;
    App.openModal('party-modal');
  },

  async saveParty() {
    const data = {
      name: document.getElementById('p-name').value.trim(),
      type: document.getElementById('p-type').value,
      phone: document.getElementById('p-phone').value.trim(),
      address: document.getElementById('p-address').value.trim(),
      opening_balance: parseFloat(document.getElementById('p-opening_balance').value) || 0,
      balance_type: document.getElementById('p-balance_type').value,
      notes: document.getElementById('p-notes').value.trim()
    };
    if (!data.name) { App.toast('পার্টির নাম দেওয়া আবশ্যক', 'error'); return; }
    if (this.editId) await ipcRenderer.invoke('updateParty', this.editId, data);
    else await ipcRenderer.invoke('addParty', data);
    App.closeModal('party-modal');
    App.toast('পার্টি সংরক্ষিত হয়েছে ✅');
    await this.loadDueSummary();
    await this.loadList();
    if (this.editId) await this.selectParty(this.editId);
  },

  openTransaction() {
    if (!this.currentParty) { App.toast('পার্টি নির্বাচন করুন', 'error'); return; }
    document.getElementById('ptx-party-name').textContent = `লেনদেন — ${this.currentParty.name}`;
    document.getElementById('pt-date').value = App.today();
    document.getElementById('pt-description').value = '';
    document.getElementById('pt-debit').value = '0';
    document.getElementById('pt-credit').value = '0';
    document.getElementById('pt-reference').value = '';
    App.openModal('ptx-modal');
  },

  async saveTransaction() {
    const data = {
      party_id: this.currentParty.id,
      date: document.getElementById('pt-date').value,
      description: document.getElementById('pt-description').value.trim(),
      debit: parseFloat(document.getElementById('pt-debit').value) || 0,
      credit: parseFloat(document.getElementById('pt-credit').value) || 0,
      reference: document.getElementById('pt-reference').value.trim()
    };
    if (!data.date || !data.description) { App.toast('তারিখ ও বিবরণ দেওয়া আবশ্যক', 'error'); return; }
    await ipcRenderer.invoke('addPartyTransaction', data);
    App.closeModal('ptx-modal');
    App.toast('লেনদেন সংরক্ষিত হয়েছে ✅');
    await this.loadDueSummary();
    await this.selectParty(this.currentParty.id);
  },

  async deleteTransaction(id) {
    if (!App.confirm('এই লেনদেন মুছে ফেলতে চান?')) return;
    await ipcRenderer.invoke('deletePartyTransaction', id);
    App.toast('লেনদেন মুছে ফেলা হয়েছে');
    await this.selectParty(this.currentParty.id);
  },

  async deleteParty(id) {
    if (!App.confirm('এই পার্টি এবং সকল লেনদেন মুছে ফেলতে চান?')) return;
    await ipcRenderer.invoke('deleteParty', id);
    this.currentParty = null;
    App.toast('পার্টি মুছে ফেলা হয়েছে');
    document.getElementById('ledger-panel').innerHTML = `<div class="empty-state card"><span class="icon">👈</span><p>বাম থেকে একটি পার্টি নির্বাচন করুন</p></div>`;
    await this.loadDueSummary();
    await this.loadList();
  }
};
