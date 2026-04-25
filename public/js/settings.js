// SETTINGS.JS
// ============================================================
const Settings = {
  async render() {
    const s = await ipcRenderer.invoke('getSettings');
    App.setContent(`
      <div>
        <div class="page-header"><h2>⚙️ সেটিংস</h2></div>
        <div class="card" style="max-width:600px;">
          <h3 style="margin-bottom:20px;font-size:16px;">🏡 খামারের তথ্য</h3>
          <div class="form-grid">
            <div class="form-group" style="grid-column:1/-1"><label>খামারের নাম</label><input type="text" id="s-farm_name" value="${s.farm_name||''}"></div>
            <div class="form-group"><label>মালিকের নাম</label><input type="text" id="s-owner_name" value="${s.owner_name||''}"></div>
            <div class="form-group"><label>ফোন নম্বর</label><input type="text" id="s-phone" value="${s.phone||''}"></div>
            <div class="form-group" style="grid-column:1/-1"><label>ঠিকানা</label><input type="text" id="s-address" value="${s.address||''}"></div>
            <div class="form-group"><label>দুধের মূল্য (৳/লিটার)</label><input type="number" id="s-milk_price" value="${s.milk_price||60}" min="0"></div>
            <div class="form-group"><label>মুদ্রা</label><input type="text" id="s-currency" value="${s.currency||'BDT'}"></div>
          </div>

          <h3 style="margin:24px 0 16px;font-size:16px;">🔐 পাসওয়ার্ড পরিবর্তন</h3>
          <div class="form-grid">
            <div class="form-group"><label>নতুন পাসওয়ার্ড</label><input type="password" id="s-new-pass" placeholder="নতুন পাসওয়ার্ড..."></div>
            <div class="form-group"><label>পাসওয়ার্ড নিশ্চিত করুন</label><input type="password" id="s-confirm-pass" placeholder="পুনরায় লিখুন..."></div>
          </div>

          <div class="form-actions" style="margin-top:24px;">
            <button class="btn btn-primary" onclick="Settings.save()">💾 পরিবর্তন সংরক্ষণ করুন</button>
          </div>
        </div>
      </div>
    `);
  },

  async save() {
    const data = {
      farm_name: document.getElementById('s-farm_name').value.trim(),
      owner_name: document.getElementById('s-owner_name').value.trim(),
      phone: document.getElementById('s-phone').value.trim(),
      address: document.getElementById('s-address').value.trim(),
      milk_price: document.getElementById('s-milk_price').value,
      currency: document.getElementById('s-currency').value.trim()
    };
    await ipcRenderer.invoke('saveSettings', data);
    App.settings = data;
    document.getElementById('farm-name-sidebar').textContent = data.farm_name || 'গরুর খামার';
    App.toast('সেটিংস সংরক্ষিত হয়েছে ✅');
  }
};

// ============================================================
