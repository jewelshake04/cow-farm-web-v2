const Health = {
  cows: [],

  async render() {
    this.cows = await ipcRenderer.invoke('getCows');
    const due = await ipcRenderer.invoke('getVaccinationsDue');
    App.setContent(`
      <div>
        <div class="page-header">
          <h2>💉 স্বাস্থ্য ও চিকিৎসা</h2>
          <button class="btn btn-primary" onclick="Health.openAdd()">➕ রেকর্ড যোগ করুন</button>
        </div>
        ${due.length > 0 ? `<div class="alert alert-warning">⏰ <strong>আসন্ন টিকা:</strong> ${due.map(d => `${d.cow_name} — ${d.next_date}`).join(', ')}</div>` : ''}
        
        <div class="filter-row" style="margin-bottom:16px;">
          <select id="health-cow-filter" onchange="Health.load()">
            <option value="">সব গরু</option>
            ${this.cows.map(c => `<option value="${c.id}">${c.name} (${c.cow_id})</option>`).join('')}
          </select>
          <select id="health-type-filter" onchange="Health.load()">
            <option value="">সব ধরন</option>
            <option>অসুস্থতা</option><option>টিকা</option><option>ভেটেরিনারি পরিদর্শন</option><option>অস্ত্রোপচার</option><option>অন্যান্য</option>
          </select>
        </div>
        <div class="card"><div id="health-list"></div></div>

        <!-- MODAL -->
        <div class="modal-overlay" id="health-modal">
          <div class="modal">
            <div class="modal-header"><h3>💉 নতুন রেকর্ড</h3><button class="modal-close" onclick="App.closeModal('health-modal')">✕</button></div>
            <div class="form-grid">
              <div class="form-group"><label>গরু *</label>
                <select id="h-cow_id">
                  <option value="">নির্বাচন করুন</option>
                  ${this.cows.map(c => `<option value="${c.id}">${c.name} (${c.cow_id})</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label>তারিখ *</label><input type="date" id="h-date" value="${App.today()}"></div>
              <div class="form-group"><label>ধরন *</label>
                <select id="h-type">
                  <option value="">নির্বাচন করুন</option>
                  <option>অসুস্থতা</option><option>টিকা</option><option>ভেটেরিনারি পরিদর্শন</option><option>অস্ত্রোপচার</option><option>অন্যান্য</option>
                </select>
              </div>
              <div class="form-group"><label>ডাক্তারের নাম</label><input type="text" id="h-vet_name" placeholder="ভেটেরিনারি ডাক্তার..."></div>
              <div class="form-group" style="grid-column:1/-1"><label>বিবরণ</label><textarea id="h-description" rows="2" placeholder="সমস্যা বা চিকিৎসার বিবরণ..."></textarea></div>
              <div class="form-group"><label>ওষুধের নাম</label><input type="text" id="h-medicine" placeholder="ওষুধ/টিকার নাম..."></div>
              <div class="form-group"><label>খরচ (৳)</label><input type="number" id="h-cost" min="0" value="0"></div>
              <div class="form-group"><label>পরবর্তী তারিখ</label><input type="date" id="h-next_date"></div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" onclick="Health.save()">💾 সংরক্ষণ</button>
              <button class="btn btn-secondary" onclick="App.closeModal('health-modal')">বাতিল</button>
            </div>
          </div>
        </div>
      </div>
    `);
    await this.load();
  },

  async load() {
    const cowId = document.getElementById('health-cow-filter')?.value || '';
    const type = document.getElementById('health-type-filter')?.value || '';
    let records = await ipcRenderer.invoke('getHealthRecords', cowId || null);
    if (type) records = records.filter(r => r.type === type);
    const el = document.getElementById('health-list');
    if (!records.length) {
      el.innerHTML = `<div class="empty-state"><span class="icon">💉</span><p>কোনো রেকর্ড নেই</p></div>`;
      return;
    }
    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>তারিখ</th><th>গরু</th><th>ধরন</th><th>বিবরণ</th><th>ওষুধ</th><th>ডাক্তার</th><th>খরচ (৳)</th><th>পরবর্তী তারিখ</th><th>মুছুন</th></tr></thead>
          <tbody>
            ${records.map(r => `
            <tr>
              <td>${App.formatDate(r.date)}</td>
              <td>${r.cow_name || '-'}</td>
              <td><span class="badge badge-info">${r.type}</span></td>
              <td>${r.description || ''}</td>
              <td>${r.medicine || '-'}</td>
              <td>${r.vet_name || '-'}</td>
              <td>${r.cost > 0 ? App.formatMoney(r.cost) : '-'}</td>
              <td>${r.next_date ? `<span style="color:#fd7e14">${App.formatDate(r.next_date)}</span>` : '-'}</td>
              <td><button class="btn btn-danger btn-sm btn-icon" onclick="Health.delete(${r.id})">🗑️</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  openAdd() {
    document.getElementById('h-cow_id').value = '';
    document.getElementById('h-date').value = App.today();
    document.getElementById('h-type').value = '';
    document.getElementById('h-vet_name').value = '';
    document.getElementById('h-description').value = '';
    document.getElementById('h-medicine').value = '';
    document.getElementById('h-cost').value = '0';
    document.getElementById('h-next_date').value = '';
    App.openModal('health-modal');
  },

  async save() {
    const data = {
      cow_id: document.getElementById('h-cow_id').value,
      date: document.getElementById('h-date').value,
      type: document.getElementById('h-type').value,
      description: document.getElementById('h-description').value.trim(),
      medicine: document.getElementById('h-medicine').value.trim(),
      vet_name: document.getElementById('h-vet_name').value.trim(),
      cost: parseFloat(document.getElementById('h-cost').value) || 0,
      next_date: document.getElementById('h-next_date').value || null
    };
    if (!data.cow_id || !data.type) { App.toast('গরু ও ধরন দেওয়া আবশ্যক', 'error'); return; }
    await ipcRenderer.invoke('addHealthRecord', data);
    App.closeModal('health-modal');
    App.toast('স্বাস্থ্য রেকর্ড সংরক্ষিত হয়েছে ✅');
    await this.load();
  },

  async delete(id) {
    if (!App.confirm('এই রেকর্ড মুছে ফেলতে চান?')) return;
    await ipcRenderer.invoke('deleteHealthRecord', id);
    App.toast('রেকর্ড মুছে ফেলা হয়েছে');
    await this.load();
  }
};
