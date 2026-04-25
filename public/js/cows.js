const Cows = {
  list: [],
  editId: null,

  async render() {
    App.setContent(`
      <div>
        <div class="page-header">
          <h2>🐄 গরুর তালিকা</h2>
          <button class="btn btn-primary" onclick="Cows.openAdd()">➕ নতুন গরু যোগ করুন</button>
        </div>
        <div class="search-bar">
          <input class="search-input" id="cow-search" placeholder="🔍 গরুর নাম বা আইডি খুঁজুন..." oninput="Cows.filter()">
          <select id="cow-health-filter" onchange="Cows.filter()" style="padding:9px 12px;border:1.5px solid #dee2e6;border-radius:8px;font-family:inherit;font-size:14px;">
            <option value="">সব অবস্থা</option>
            <option value="সুস্থ">সুস্থ</option>
            <option value="অসুস্থ">অসুস্থ</option>
            <option value="চিকিৎসাধীন">চিকিৎসাধীন</option>
          </select>
        </div>
        <div id="cow-list-container"></div>

        <!-- ADD/EDIT MODAL -->
        <div class="modal-overlay" id="cow-modal">
          <div class="modal">
            <div class="modal-header">
              <h3 id="cow-modal-title">নতুন গরু যোগ করুন</h3>
              <button class="modal-close" onclick="App.closeModal('cow-modal')">✕</button>
            </div>
            <div class="form-grid">
              <div class="form-group"><label>গরুর আইডি *</label><input type="text" id="c-cow_id" placeholder="যেমন: COW001"></div>
              <div class="form-group"><label>নাম *</label><input type="text" id="c-name" placeholder="গরুর নাম"></div>
              <div class="form-group"><label>জাত/প্রজাতি</label>
                <select id="c-breed">
                  <option value="">নির্বাচন করুন</option>
                  <option>শাহীওয়াল</option><option>হলস্টেইন</option><option>জার্সি</option>
                  <option>ব্রাহমান</option><option>দেশি</option><option>ক্রস ব্রিড</option><option>অন্যান্য</option>
                </select>
              </div>
              <div class="form-group"><label>বয়স (বছর)</label><input type="number" id="c-age" min="0" step="0.5"></div>
              <div class="form-group"><label>ওজন (কেজি)</label><input type="number" id="c-weight" min="0"></div>
              <div class="form-group"><label>স্বাস্থ্য অবস্থা</label>
                <select id="c-health_status">
                  <option value="সুস্থ">সুস্থ</option>
                  <option value="অসুস্থ">অসুস্থ</option>
                  <option value="চিকিৎসাধীন">চিকিৎসাধীন</option>
                </select>
              </div>
              <div class="form-group"><label>গর্ভবতী?</label>
                <select id="c-pregnancy_status">
                  <option value="না">না</option>
                  <option value="হ্যাঁ">হ্যাঁ</option>
                </select>
              </div>
              <div class="form-group" style="grid-column:1/-1">
                <label>ছবি</label>
                <div style="display:flex;gap:10px;align-items:center;">
                  <button class="btn btn-outline btn-sm" type="button" onclick="Cows.uploadImage()">📷 ছবি আপলোড</button>
                  <span id="c-img-name" style="font-size:13px;color:#666">কোনো ছবি নেই</span>
                  <input type="hidden" id="c-image_path">
                </div>
              </div>
              <div class="form-group" style="grid-column:1/-1"><label>নোট</label><textarea id="c-notes" rows="2" placeholder="অতিরিক্ত তথ্য..."></textarea></div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" onclick="Cows.save()">💾 সংরক্ষণ করুন</button>
              <button class="btn btn-secondary" onclick="App.closeModal('cow-modal')">বাতিল</button>
            </div>
          </div>
        </div>

        <!-- VIEW MODAL -->
        <div class="modal-overlay" id="cow-view-modal">
          <div class="modal modal-lg"><div id="cow-view-content"></div></div>
        </div>
      </div>
    `);
    await this.loadList();
  },

  async loadList() {
    this.list = await ipcRenderer.invoke('getCows');
    this.renderList(this.list);
  },

  renderList(cows) {
    const c = document.getElementById('cow-list-container');
    if (!cows.length) {
      c.innerHTML = `<div class="empty-state"><span class="icon">🐄</span><p>কোনো গরু নেই। নতুন গরু যোগ করুন।</p></div>`;
      return;
    }
    c.innerHTML = `<div class="cow-grid">${cows.map(cow => `
      <div class="cow-card">
        <div class="cow-card-img">
          ${cow.image_path ? `<img src="${cow.image_path}" alt="${cow.name}">` : '🐄'}
        </div>
        <div class="cow-card-body">
          <div class="cow-card-title">${cow.name} <small style="color:#999;font-weight:400">#${cow.cow_id}</small></div>
          <div class="cow-card-info">
            <span>🌿 জাত: ${cow.breed || 'অজানা'}</span>
            <span>📅 বয়স: ${cow.age ? cow.age + ' বছর' : 'অজানা'}</span>
            <span>⚖️ ওজন: ${cow.weight ? cow.weight + ' কেজি' : 'অজানা'}</span>
            <span>🥛 আজকের দুধ: ${cow.today_milk || 0} লিটার</span>
          </div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
            <span class="badge ${cow.health_status === 'সুস্থ' ? 'badge-success' : 'badge-danger'}">${cow.health_status}</span>
            ${cow.pregnancy_status === 'হ্যাঁ' ? '<span class="badge badge-warning">গর্ভবতী</span>' : ''}
          </div>
          <div class="cow-card-actions">
            <button class="btn btn-outline btn-sm" onclick="Cows.view(${cow.id})">👁️ বিস্তারিত</button>
            <button class="btn btn-warning btn-sm" onclick="Cows.openEdit(${cow.id})">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="Cows.delete(${cow.id})">🗑️</button>
          </div>
        </div>
      </div>`).join('')}</div>`;
  },

  filter() {
    const q = document.getElementById('cow-search').value.toLowerCase();
    const h = document.getElementById('cow-health-filter').value;
    const filtered = this.list.filter(c =>
      (!q || c.name.toLowerCase().includes(q) || c.cow_id.toLowerCase().includes(q)) &&
      (!h || c.health_status === h)
    );
    this.renderList(filtered);
  },

  openAdd() {
    this.editId = null;
    document.getElementById('cow-modal-title').textContent = 'নতুন গরু যোগ করুন';
    ['cow_id','name','age','weight','notes','image_path'].forEach(f => { const el = document.getElementById('c-'+f); if(el) el.value = ''; });
    document.getElementById('c-breed').value = '';
    document.getElementById('c-health_status').value = 'সুস্থ';
    document.getElementById('c-pregnancy_status').value = 'না';
    document.getElementById('c-img-name').textContent = 'কোনো ছবি নেই';
    App.openModal('cow-modal');
  },

  async openEdit(id) {
    this.editId = id;
    const cow = await ipcRenderer.invoke('getCow', id);
    document.getElementById('cow-modal-title').textContent = 'গরুর তথ্য সম্পাদনা';
    ['cow_id','name','age','weight','notes','image_path'].forEach(f => {
      const el = document.getElementById('c-'+f);
      if (el) el.value = cow[f] || '';
    });
    document.getElementById('c-breed').value = cow.breed || '';
    document.getElementById('c-health_status').value = cow.health_status || 'সুস্থ';
    document.getElementById('c-pregnancy_status').value = cow.pregnancy_status || 'না';
    document.getElementById('c-img-name').textContent = cow.image_path ? '✅ ছবি আছে' : 'কোনো ছবি নেই';
    App.openModal('cow-modal');
  },

  async uploadImage() {
    const path = await ipcRenderer.invoke('uploadImage');
    if (path) {
      document.getElementById('c-image_path').value = path;
      document.getElementById('c-img-name').textContent = '✅ ছবি নির্বাচিত';
    }
  },

  async save() {
    const data = {
      cow_id: document.getElementById('c-cow_id').value.trim(),
      name: document.getElementById('c-name').value.trim(),
      breed: document.getElementById('c-breed').value,
      age: document.getElementById('c-age').value || null,
      weight: document.getElementById('c-weight').value || null,
      health_status: document.getElementById('c-health_status').value,
      pregnancy_status: document.getElementById('c-pregnancy_status').value,
      image_path: document.getElementById('c-image_path').value || null,
      notes: document.getElementById('c-notes').value.trim()
    };
    if (!data.cow_id || !data.name) { App.toast('গরুর আইডি ও নাম দেওয়া আবশ্যক', 'error'); return; }
    try {
      if (this.editId) await ipcRenderer.invoke('updateCow', this.editId, data);
      else await ipcRenderer.invoke('addCow', data);
      App.closeModal('cow-modal');
      App.toast(this.editId ? 'গরুর তথ্য আপডেট হয়েছে ✅' : 'নতুন গরু যোগ হয়েছে ✅');
      await this.loadList();
    } catch(e) { App.toast('সংরক্ষণে সমস্যা হয়েছে: ' + e.message, 'error'); }
  },

  async delete(id) {
    if (!App.confirm('এই গরুটি মুছে ফেলতে চান?')) return;
    await ipcRenderer.invoke('deleteCow', id);
    App.toast('গরু মুছে ফেলা হয়েছে');
    await this.loadList();
  },

  async view(id) {
    const cow = await ipcRenderer.invoke('getCow', id);
    const health = await ipcRenderer.invoke('getHealthRecords', id);
    const milk = await ipcRenderer.invoke('getMilkEntries', id, null, null);
    const totalMilk = milk.reduce((s,m) => s + m.total, 0);
    document.getElementById('cow-view-content').innerHTML = `
      <div class="modal-header">
        <h3>🐄 ${cow.name} বিস্তারিত</h3>
        <button class="modal-close" onclick="App.closeModal('cow-view-modal')">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:start;">
        <div style="width:180px;height:180px;border-radius:12px;overflow:hidden;background:#e8f5e9;display:flex;align-items:center;justify-content:center;font-size:72px;">
          ${cow.image_path ? `<img src="${cow.image_path}" style="width:100%;height:100%;object-fit:cover">` : '🐄'}
        </div>
        <div>
          <table style="width:100%;">
            <tr><td style="padding:6px;color:#666;width:140px;">আইডি</td><td style="padding:6px;font-weight:600">${cow.cow_id}</td></tr>
            <tr><td style="padding:6px;color:#666">নাম</td><td style="padding:6px;font-weight:600">${cow.name}</td></tr>
            <tr><td style="padding:6px;color:#666">জাত</td><td style="padding:6px">${cow.breed || '-'}</td></tr>
            <tr><td style="padding:6px;color:#666">বয়স</td><td style="padding:6px">${cow.age ? cow.age+' বছর' : '-'}</td></tr>
            <tr><td style="padding:6px;color:#666">ওজন</td><td style="padding:6px">${cow.weight ? cow.weight+' কেজি' : '-'}</td></tr>
            <tr><td style="padding:6px;color:#666">স্বাস্থ্য</td><td style="padding:6px"><span class="badge ${cow.health_status==='সুস্থ'?'badge-success':'badge-danger'}">${cow.health_status}</span></td></tr>
            <tr><td style="padding:6px;color:#666">গর্ভবতী</td><td style="padding:6px">${cow.pregnancy_status}</td></tr>
            <tr><td style="padding:6px;color:#666">মোট দুধ</td><td style="padding:6px;font-weight:600;color:#1e7e4e">${totalMilk.toFixed(1)} লিটার</td></tr>
          </table>
        </div>
      </div>
      <h4 style="margin:20px 0 10px">💉 সর্বশেষ চিকিৎসা রেকর্ড</h4>
      ${health.slice(0,3).map(h => `
        <div style="background:#f8f9fa;padding:10px 14px;border-radius:8px;margin-bottom:8px;font-size:13px;">
          <strong>${h.type}</strong> — ${App.formatDate(h.date)} | ${h.description || ''} ${h.medicine ? '| ওষুধ: '+h.medicine : ''}
        </div>`).join('') || '<p style="color:#999;font-size:13px">কোনো রেকর্ড নেই</p>'}
    `;
    App.openModal('cow-view-modal');
  }
};
