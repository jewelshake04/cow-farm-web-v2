const express = require('express');
const session = require('express-session');
const Database = require('./database/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: '/tmp/' });

const app = express();
let db;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'cow-farm-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function auth(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Pages
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/app');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/app', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Auth
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.getUser(username, password);
  if (user) { req.session.user = user; res.json({ success: true, user }); }
  else res.json({ success: false, message: 'ভুল পাসওয়ার্ড বা ইউজারনেম' });
});
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/me', (req, res) => { if (req.session.user) res.json(req.session.user); else res.status(401).json({ error: 'Not logged in' }); });

// Cows
app.get('/api/cows', auth, (req, res) => res.json(db.getCows()));
app.get('/api/cows/:id', auth, (req, res) => res.json(db.getCow(req.params.id)));
app.post('/api/cows', auth, (req, res) => res.json(db.addCow(req.body)));
app.put('/api/cows/:id', auth, (req, res) => res.json(db.updateCow(req.params.id, req.body)));
app.delete('/api/cows/:id', auth, (req, res) => res.json(db.deleteCow(req.params.id)));

// Milk
app.get('/api/milk', auth, (req, res) => res.json(db.getMilkEntries(req.query.cowId, req.query.dateFrom, req.query.dateTo)));
app.post('/api/milk', auth, (req, res) => res.json(db.addMilkEntry(req.body)));
app.delete('/api/milk/:id', auth, (req, res) => res.json(db.deleteMilkEntry(req.params.id)));
app.get('/api/milk/summary/:period', auth, (req, res) => res.json(db.getMilkSummary(req.params.period)));
app.get('/api/milk/daily/:date', auth, (req, res) => res.json(db.getDailyMilkTotal(req.params.date)));

// Transactions
app.get('/api/transactions', auth, (req, res) => res.json(db.getTransactions(req.query)));
app.post('/api/transactions', auth, (req, res) => res.json(db.addTransaction(req.body)));
app.delete('/api/transactions/:id', auth, (req, res) => res.json(db.deleteTransaction(req.params.id)));
app.get('/api/transactions/summary/:period', auth, (req, res) => res.json(db.getAccountSummary(req.params.period)));

// Parties
app.get('/api/parties', auth, (req, res) => res.json(db.getParties(req.query.type)));
app.post('/api/parties', auth, (req, res) => res.json(db.addParty(req.body)));
app.put('/api/parties/:id', auth, (req, res) => res.json(db.updateParty(req.params.id, req.body)));
app.delete('/api/parties/:id', auth, (req, res) => res.json(db.deleteParty(req.params.id)));
app.get('/api/parties/:id/ledger', auth, (req, res) => res.json(db.getPartyLedger(req.params.id, req.query.dateFrom, req.query.dateTo)));
app.post('/api/party-transactions', auth, (req, res) => res.json(db.addPartyTransaction(req.body)));
app.delete('/api/party-transactions/:id', auth, (req, res) => res.json(db.deletePartyTransaction(req.params.id)));
app.get('/api/parties/:id/balance', auth, (req, res) => res.json(db.getPartyBalance(req.params.id)));
app.get('/api/dues', auth, (req, res) => res.json(db.getAllDues()));

// Health
app.get('/api/health', auth, (req, res) => res.json(db.getHealthRecords(req.query.cowId)));
app.post('/api/health', auth, (req, res) => res.json(db.addHealthRecord(req.body)));
app.delete('/api/health/:id', auth, (req, res) => res.json(db.deleteHealthRecord(req.params.id)));
app.get('/api/vaccinations-due', auth, (req, res) => res.json(db.getVaccinationsDue()));

// Breeding
app.get('/api/breeding', auth, (req, res) => res.json(db.getBreedingRecords(req.query.cowId)));
app.post('/api/breeding', auth, (req, res) => res.json(db.addBreedingRecord(req.body)));
app.delete('/api/breeding/:id', auth, (req, res) => res.json(db.deleteBreedingRecord(req.params.id)));
app.get('/api/calves', auth, (req, res) => res.json(db.getCalfRecords()));
app.post('/api/calves', auth, (req, res) => res.json(db.addCalfRecord(req.body)));

// Dashboard
app.get('/api/dashboard', auth, (req, res) => res.json(db.getDashboardData()));

// Settings
app.get('/api/settings', auth, (req, res) => res.json(db.getSettings()));
app.post('/api/settings', auth, (req, res) => res.json(db.saveSettings(req.body)));

// Backup
app.get('/api/backup/download', auth, (req, res) => res.download(db.dbPath, `backup-${new Date().toISOString().slice(0,10)}.db`));
app.post('/api/backup/restore', auth, upload.single('backup'), (req, res) => {
  try {
    if (!req.file) return res.json({ success: false });
    fs.copyFileSync(req.file.path, db.dbPath);
    fs.unlinkSync(req.file.path);
    res.json({ success: true });
  } catch(e) { res.json({ success: false, error: e.message }); }
});

app.get('*', (req, res) => res.redirect('/'));

const PORT = process.env.PORT || 3000;

// Init DB then start server
const dbInstance = new Database();
dbInstance.ready.then(() => {
  db = dbInstance;
  app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
