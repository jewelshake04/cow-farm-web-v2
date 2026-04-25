const Breeding = {
  cows: [],

  async render() {
    this.cows = await ipcRenderer.invoke('getCows');
    App.setContent(`
      <div>
        <div class="page-header"><h2>🐣 প্রজনন ও বাছুর ব্যবস্থাপনা</h2></div>
        <div class="tabs">
          <div class="tab active" onclick="Breeding.switchTab('breeding', this)">🤰 গর্ভধারণ ট্র্যাকিং</div>
          <div class="tab" onclick="Breeding.switchTab('calf', this)">🐮 বাছুর রেকর্ড</div>
        </div>

        <!-- BREEDING TAB -->
        <div id="breeding-tab">
          <div class="page-header">
            <h3 style="font-size:16px">গর্ভধারণের তালিকা</h3>
            <button class="btn btn-primary" onclick="Breeding.openAdd()">➕ গর্ভধারণ রেকর্ড</button>
          </div>
          <div class="card"><div id="breeding-list"></div></div>
        </div>

        <!-- CALF TAB -->
        <div id="calf-tab" style="display:none;">
          <div class="page-header">
            <h3 style="font-size:16px">বাছুরের তালিকা</h3>
            <button class="btn btn-primary" onclick="Breeding.openCalfAdd()">➕ বাছুর রেকর্ড</button>
          </div>
          <div class="card"><div id="calf-list"></div></div>
        </div>

        <!-- BREEDING MODAL -->
        <div class="modal-overlay" id="breeding-modal">
          <div class="modal">
            <div class="modal-header"><h3>🤰 গর্ভধারণ রেকর্ড</h3><button class="modal-close" onclick="App.closeModal('breeding-modal')">✕</button></div>
            <div class="form-grid">
              <div class="form-group"><label>গরু *</label>
                <select id="br-cow_id" onchange="Breeding.calcDelivery()">
                  <option value="">নির্বাচন করুন</option>
                  ${this.cows.map(c => `<option value="${c.id}">${c.name} (${c.cow_id})</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label>সংগম/গর্ভধারণের তারিখ *</label><input type="date" id="br-mating_date" value="${App.today()}" onchange="Breeding.calcDelivery()"></div>
              <div class="form-group"><label>পদ্ধতি</label>
                <select id="br-method">
                  <option value="">নির্বাচন করুন</option>
                  <option>স্বাভাবিক</option><option>কৃত্রিম প্রজনন</option>
                </select>
              </div>
              <div class="form-group"><label>সম্ভাব্য প্রসব তারিখ</label><input type="date" id="br-expected_delivery"></div>
              <div class="form-group"><label>অবস্থা</label>
                <select id="br-status">
                  <option>গর্ভবতী</option><option>প্রসব হয়েছে</option><option>গর্ভপাত</option>
                </select>
              </div>
              <div class="form-group" style="grid-column:1/-1"><label>নোট</label><textarea id="br-notes" rows="2"></textarea></div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" onclick="Breeding.save()">💾 সংরক্ষণ</button>
              <button class="btn btn-secondary" onclick="App.closeModal('breeding-modal')">বাতিল</button>
            </div>
          </div>
        </div>

        <!-- CALF MODAL -->
        <div class="modal-overlay" id="calf-modal">
          <div class="modal">
            <div class="modal-header"><h3>🐮 বাছুর রেকর্ড</h3><button class="modal-close" onclick="App.closeModal('calf-modal')">✕</button></div>
            <div class="form-grid">
              <div class="form-group"><label>মা গরু *</label>
                <select id="cf-cow_id">
                  <option value="">নির্বাচন করুন</option>
                  ${this.cows.map(c => `<option value="${c.id}">${c.name} (${c.cow_id})</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label>জন্ম তারিখ *</label><input type="date" id="cf-birth_date" value="${App.today()}"></div>
              <div class="form-group"><label>লিঙ্গ</label>
                <select id="cf-gender"><option value="">নির্বাচন করুন</option><option>বাছুর (পুরুষ)</option><option>বকনা (মহিলা)</option></select>
              </div>
              <div class="form-group"><label>জন্মের সময় ওজন (কেজি)</label><input type="number" id="cf-weight" min="0" step="0.1"></div>
              <div class="form-group"><label>স্বাস্থ্য অবস্থা</label>
                <select id="cf-health"><option>সুস্থ</option><option>অসুস্থ</option><option>মৃত</option></select>
              </div>
              <div class="form-group" style="grid-column:1/-1"><label>নোট</label><textarea id="cf-notes" rows="2"></textarea></div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" onclick="Breeding.saveCalfRecord()">💾 সংরক্ষণ</button>
              <button class="btn btn-secondary" onclick="App.closeModal('calf-modal')">বাতিল</button>
            </div>
          </div>
        </div>
      </div>
    `);
    await this.loadBreeding();
  },

  calcDelivery() {
    const d = document.getElementById('br-mating_date')?.value;
    if (d) {
      const delivery = new Date(d);
      delivery.setDate(delivery.getDate() + 280); // ~9 months
      document.getElementById('br-expected_delivery').value = delivery.toISOString().slice(0,10);
    }
  },

  switchTab(tab, el) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('breeding-tab').style.display = tab === 'breeding' ? '' : 'none';
    document.getElementById('calf-tab').style.display = tab === 'calf' ? '' : 'none';
    if (tab === 'calf') this.loadCalfs();
  },

  async loadBreeding() {
    const records = await ipcRenderer.invoke('getBreedingRecords', null);
    const el = document.getElementById('breeding-list');
    if (!records.length) {
      el.innerHTML = `<div class="empty-state"><span class="icon">🤰</span><p>কোনো রেকর্ড নেই</p></div>`;
      return;
    }
    el.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>গরু</th><th>গর্ভধারণ তারিখ</th><th>পদ্ধতি</th><th>সম্ভাব্য প্রসব</th><th>অবস্থা</th><th>নোট</th><th>মুছুন</th></tr></thead>
        <tbody>
          ${records.map(r => {
            const isOverdue = r.expected_delivery && r.expected_delivery < App.today() && r.status === 'গর্ভবতী';
            return `<tr>
              <td>${r.cow_name}</td>
              <td>${App.formatDate(r.mating_date)}</td>
              <td>${r.method || '-'}</td>
              <td style="${isOverdue?'color:#dc3545;font-weight:700':''}">${r.expected_delivery ? App.formatDate(r.expected_delivery) + (isOverdue?' ⚠️':'') : '-'}</td>
              <td><span class="badge ${r.status==='গর্ভবতী'?'badge-warning':'badge-success'}">${r.status}</span></td>
              <td>${r.notes||''}</td>
              <td><button class="btn btn-danger btn-sm btn-icon" onclick="Breeding.deleteRecord(${r.id})">🗑️</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;
  },

  async loadCalfs() {
    const records = await ipcRenderer.invoke('getCalfRecords');
    const el = document.getElementById('calf-list');
    if (!records.length) {
      el.innerHTML = `<div class="empty-state"><span class="icon">🐮</span><p>কোনো বাছুরের রেকর্ড নেই</p></div>`;
      return;
    }
    el.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>মা গরু</th><th>জন্ম তারিখ</th><th>লিঙ্গ</th><th>ওজন (কেজি)</th><th>স্বাস্থ্য</th><th>নোট</th></tr></thead>
        <tbody>
          ${records.map(r => `<tr>
            <td>${r.cow_name||'-'}</td>
            <td>${App.formatDate(r.birth_date)}</td>
            <td>${r.gender||'-'}</td>
            <td>${r.weight||'-'}</td>
            <td><span class="badge ${r.health==='সুস্থ'?'badge-success':'badge-danger'}">${r.health}</span></td>
            <td>${r.notes||''}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  },

  openAdd() {
    document.getElementById('br-cow_id').value = '';
    document.getElementById('br-mating_date').value = App.today();
    document.getElementById('br-method').value = '';
    document.getElementById('br-expected_delivery').value = '';
    document.getElementById('br-status').value = 'গর্ভবতী';
    document.getElementById('br-notes').value = '';
    App.openModal('breeding-modal');
  },

  openCalfAdd() {
    document.getElementById('cf-cow_id').value = '';
    document.getElementById('cf-birth_date').value = App.today();
    document.getElementById('cf-gender').value = '';
    document.getElementById('cf-weight').value = '';
    document.getElementById('cf-health').value = 'সুস্থ';
    document.getElementById('cf-notes').value = '';
    App.openModal('calf-modal');
  },

  async save() {
    const data = {
      cow_id: document.getElementById('br-cow_id').value,
      mating_date: document.getElementById('br-mating_date').value,
      method: document.getElementById('br-method').value,
      expected_delivery: document.getElementById('br-expected_delivery').value || null,
      status: document.getElementById('br-status').value,
      notes: document.getElementById('br-notes').value.trim()
    };
    if (!data.cow_id || !data.mating_date) { App.toast('গরু ও তারিখ দেওয়া আবশ্যক', 'error'); return; }
    await ipcRenderer.invoke('addBreedingRecord', data);
    App.closeModal('breeding-modal');
    App.toast('প্রজনন রেকর্ড সংরক্ষিত হয়েছে ✅');
    await this.loadBreeding();
  },

  async saveCalfRecord() {
    const data = {
      cow_id: document.getElementById('cf-cow_id').value,
      birth_date: document.getElementById('cf-birth_date').value,
      gender: document.getElementById('cf-gender').value,
      weight: document.getElementById('cf-weight').value || null,
      health: document.getElementById('cf-health').value,
      notes: document.getElementById('cf-notes').value.trim()
    };
    if (!data.cow_id || !data.birth_date) { App.toast('মা গরু ও জন্ম তারিখ দেওয়া আবশ্যক', 'error'); return; }
    await ipcRenderer.invoke('addCalfRecord', data);
    App.closeModal('calf-modal');
    App.toast('বাছুরের রেকর্ড সংরক্ষিত হয়েছে ✅');
    await this.loadCalfs();
  },

  async deleteRecord(id) {
    if (!App.confirm('এই রেকর্ড মুছে ফেলতে চান?')) return;
    await ipcRenderer.invoke('deleteBreedingRecord', id);
    App.toast('রেকর্ড মুছে ফেলা হয়েছে');
    await this.loadBreeding();
  }
};
