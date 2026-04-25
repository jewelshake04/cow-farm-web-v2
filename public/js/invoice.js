// ============================================================
const Invoice = {
  cows: [],
  parties: [],

  async render() {
    this.cows = await ipcRenderer.invoke('getCows');
    this.parties = await ipcRenderer.invoke('getParties', 'customer');
    const settings = await ipcRenderer.invoke('getSettings');
    App.setContent(`
      <div>
        <div class="page-header"><h2>🧾 ইনভয়েস / বিক্রয় রশিদ</h2></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <!-- FORM -->
          <div class="card">
            <h3 style="margin-bottom:16px;font-size:16px;">নতুন ইনভয়েস তৈরি করুন</h3>
            <div class="form-group" style="margin-bottom:14px;"><label>তারিখ</label><input type="date" id="inv-date" value="${App.today()}"></div>
            <div class="form-group" style="margin-bottom:14px;"><label>ক্রেতা</label>
              <select id="inv-party">
                <option value="">নির্বাচন করুন</option>
                ${this.parties.map(p => `<option value="${p.id}" data-name="${p.name}" data-phone="${p.phone||''}" data-addr="${p.address||''}">${p.name}</option>`).join('')}
                <option value="walk-in">সাধারণ ক্রেতা</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:14px;"><label>পণ্যের বিবরণ</label><input type="text" id="inv-desc" placeholder="যেমন: দুধ বিক্রয় — ২০ লিটার"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;">
              <div class="form-group"><label>পরিমাণ</label><input type="number" id="inv-qty" value="1" min="0.1" step="0.1" oninput="Invoice.calcTotal()"></div>
              <div class="form-group"><label>একক মূল্য (৳)</label><input type="number" id="inv-price" value="${settings.milk_price||60}" min="0" oninput="Invoice.calcTotal()"></div>
              <div class="form-group"><label>মোট (৳)</label><input type="number" id="inv-total" readonly style="background:#f8f9fa;font-weight:700;color:#1e7e4e"></div>
            </div>
            <div class="form-group" style="margin-bottom:14px;"><label>নোট</label><input type="text" id="inv-notes" placeholder="ঐচ্ছিক নোট..."></div>
            <button class="btn btn-primary" onclick="Invoice.generate()" style="width:100%;">🖨️ ইনভয়েস তৈরি করুন</button>
          </div>

          <!-- PREVIEW -->
          <div class="card" id="inv-preview" style="font-size:14px;">
            <div style="text-align:center;color:#999;padding:40px;">
              <div style="font-size:48px;">🧾</div>
              <p>ইনভয়েস প্রিভিউ এখানে দেখাবে</p>
            </div>
          </div>
        </div>
      </div>
    `);
    Invoice.calcTotal();
  },

  calcTotal() {
    const qty = parseFloat(document.getElementById('inv-qty')?.value) || 0;
    const price = parseFloat(document.getElementById('inv-price')?.value) || 0;
    const el = document.getElementById('inv-total');
    if (el) el.value = (qty * price).toFixed(2);
  },

  async generate() {
    const settings = await ipcRenderer.invoke('getSettings');
    const date = document.getElementById('inv-date').value;
    const partyEl = document.getElementById('inv-party');
    const partyOpt = partyEl.options[partyEl.selectedIndex];
    const partyName = partyEl.value === 'walk-in' ? 'সাধারণ ক্রেতা' : (partyOpt?.dataset.name || '-');
    const partyPhone = partyOpt?.dataset.phone || '';
    const partyAddr = partyOpt?.dataset.addr || '';
    const desc = document.getElementById('inv-desc').value;
    const qty = document.getElementById('inv-qty').value;
    const price = document.getElementById('inv-price').value;
    const total = document.getElementById('inv-total').value;
    const notes = document.getElementById('inv-notes').value;
    const invNo = 'INV-' + Date.now().toString().slice(-6);

    document.getElementById('inv-preview').innerHTML = `
      <div id="printable-invoice" style="font-family:'Hind Siliguri',sans-serif;max-width:400px;margin:0 auto;">
        <div style="text-align:center;border-bottom:2px solid #1e7e4e;padding-bottom:12px;margin-bottom:12px;">
          <div style="font-size:32px">🐄</div>
          <h2 style="color:#1e7e4e;font-size:18px">${settings.farm_name}</h2>
          <p style="font-size:12px;color:#666">${settings.address||''} ${settings.phone ? '· ☎ '+settings.phone : ''}</p>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:13px;">
          <div><strong>রশিদ নং:</strong> ${invNo}</div>
          <div><strong>তারিখ:</strong> ${App.formatDate(date)}</div>
        </div>
        <div style="background:#f8f9fa;padding:10px;border-radius:8px;margin-bottom:12px;font-size:13px;">
          <strong>ক্রেতা:</strong> ${partyName}<br>
          ${partyPhone ? `📞 ${partyPhone}<br>` : ''}
          ${partyAddr ? `📍 ${partyAddr}` : ''}
        </div>
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          <thead><tr style="background:#e8f5e9;"><th style="padding:8px;text-align:left;">বিবরণ</th><th style="padding:8px;">পরিমাণ</th><th style="padding:8px;">মূল্য</th><th style="padding:8px;text-align:right;">মোট</th></tr></thead>
          <tbody><tr><td style="padding:8px;border-bottom:1px solid #eee">${desc||'দুধ বিক্রয়'}</td><td style="padding:8px;text-align:center;">${qty}</td><td style="padding:8px;text-align:center;">৳${price}</td><td style="padding:8px;text-align:right;font-weight:700;">৳${total}</td></tr></tbody>
        </table>
        <div style="text-align:right;padding:12px 0;border-top:2px solid #1e7e4e;margin-top:8px;">
          <strong style="font-size:16px;color:#1e7e4e;">মোট = ৳${total}</strong>
        </div>
        ${notes ? `<p style="font-size:12px;color:#666;margin-top:8px;">নোট: ${notes}</p>` : ''}
