

const App = {
  currentPage: 'dashboard',
  settings: {},

  async init() {
    this.settings = await ipcRenderer.invoke('getSettings');
    document.getElementById('farm-name-sidebar').textContent = this.settings.farm_name || 'গরুর খামার';
    this.setupNav();
    this.navigate('dashboard');
  },

  setupNav() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        this.navigate(item.dataset.page);
      });
    });
  },

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');
    const titles = {
      dashboard: 'ড্যাশবোর্ড', cows: 'গরুর তালিকা', milk: 'দুধ ট্র্যাকিং',
      accounting: 'হিসাব খাতা', parties: 'পার্টি লেজার', health: 'স্বাস্থ্য ও চিকিৎসা',
      breeding: 'প্রজনন ও বাছুর', invoice: 'ইনভয়েস', reports: 'রিপোর্ট',
      settings: 'সেটিংস', backup: 'ব্যাকআপ ও রিস্টোর'
    };
    document.getElementById('page-title').textContent = titles[page] || page;
    const pages = {
      dashboard: Dashboard.render, cows: Cows.render, milk: Milk.render,
      accounting: Accounting.render, parties: Parties.render, health: Health.render,
      breeding: Breeding.render, invoice: Invoice.render, reports: Reports.render,
      settings: Settings.render, backup: Backup.render
    };
    if (pages[page]) pages[page]();
  },

  logout() {
    if (confirm('লগআউট করতে চান?')) fetch('/api/logout',{method:'POST'}).then(()=>window.location.href='/');
  },

  toast(msg, type = 'success') {
    const t = document.getElementById('toast');
    const m = document.getElementById('toast-msg');
    const colors = { success: '#28a745', error: '#dc3545', warning: '#fd7e14', info: '#007bff' };
    m.style.background = colors[type] || '#333';
    m.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
  },

  confirm(msg) {
    return window.confirm(msg);
  },

  formatDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatMoney(n) {
    return '৳' + (parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  today() {
    return new Date().toISOString().slice(0, 10);
  },

  monthStart() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  },

  openModal(id) {
    document.getElementById(id).classList.add('open');
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('open');
  },

  setContent(html) {
    document.getElementById('page-content').innerHTML = html;
  },

  bn(n) {
    const digits = { '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯' };
    return String(n).replace(/[0-9]/g, d => digits[d]);
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());
