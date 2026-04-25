const Backup = {
  render() {
    App.setContent(`
      <div>
        <div class="page-header"><h2>💾 ব্যাকআপ ও রিস্টোর</h2></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div class="card" style="text-align:center;padding:40px;">
            <div style="font-size:64px;margin-bottom:16px;">💾</div>
            <h3 style="margin-bottom:10px;">ডেটা ব্যাকআপ করুন</h3>
            <p style="color:#666;font-size:14px;margin-bottom:20px;">আপনার সমস্ত ডেটা ডাউনলোড করুন।</p>
            <button class="btn btn-primary" onclick="Backup.doBackup()" style="width:100%;padding:14px;font-size:16px;">📥 ব্যাকআপ ডাউনলোড করুন</button>
          </div>
          <div class="card" style="text-align:center;padding:40px;">
            <div style="font-size:64px;margin-bottom:16px;">📂</div>
            <h3 style="margin-bottom:10px;">ব্যাকআপ থেকে রিস্টোর</h3>
            <p style="color:#666;font-size:14px;margin-bottom:20px;">⚠️ রিস্টোর করলে বর্তমান সব ডেটা মুছে যাবে।</p>
            <input type="file" id="restoreFile" accept=".db" style="display:none" onchange="Backup.doRestore(this)">
            <button class="btn btn-danger" onclick="document.getElementById('restoreFile').click()" style="width:100%;padding:14px;font-size:16px;">📤 ফাইল নির্বাচন করুন</button>
          </div>
        </div>
        <div class="card" style="margin-top:20px;">
          <h3 style="margin-bottom:12px;font-size:16px;">ℹ️ ব্যাকআপ সম্পর্কে তথ্য</h3>
          <ul style="color:#666;font-size:14px;line-height:2;">
            <li>✅ ব্যাকআপ ফাইলে সমস্ত গরু, দুধ, হিসাব, পার্টি ডেটা থাকে</li>
            <li>✅ প্রতিদিন ব্যাকআপ নেওয়া ভালো অভ্যাস</li>
            <li>✅ ব্যাকআপ ফাইল গুগল ড্রাইভে রাখুন</li>
          </ul>
        </div>
      </div>
    `);
  },

  doBackup() {
    window.open('/api/backup/download', '_blank');
    App.toast('ব্যাকআপ ডাউনলোড শুরু হয়েছে ✅');
  },

  async doRestore(input) {
    if (!input.files[0]) return;
    if (!confirm('⚠️ রিস্টোর করলে বর্তমান সব ডেটা মুছে যাবে। নিশ্চিত?')) return;
    const formData = new FormData();
    formData.append('backup', input.files[0]);
    const res = await fetch('/api/backup/restore', { method: 'POST', body: formData });
    const result = await res.json();
    if (result.success) {
      App.toast('রিস্টোর সফল! পেজ রিফ্রেশ হচ্ছে...', 'success');
      setTimeout(() => window.location.reload(), 2000);
    } else {
      App.toast('রিস্টোর ব্যর্থ হয়েছে', 'error');
    }
  }
};
