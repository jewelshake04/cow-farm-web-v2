const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

class Database {
  constructor() {
    this.dbDir = process.env.DB_PATH || path.join(__dirname, '..', 'data');
    fs.mkdirSync(this.dbDir, { recursive: true });
    this.dbPath = path.join(this.dbDir, 'farm.db');
    this.db = null;
    this.ready = this._init();
  }

  async _init() {
    const SQL = await initSqlJs();
    if (fs.existsSync(this.dbPath)) {
      const buf = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buf);
    } else {
      this.db = new SQL.Database();
    }
    this._createTables();
    this._saveDb();
    return this;
  }

  _saveDb() {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  _run(sql, params = []) {
    this.db.run(sql, params);
    this._saveDb();
  }

  _get(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  _all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  _exec(sql) {
    this.db.run(sql);
    this._saveDb();
  }

  _createTables() {
    this.db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'admin', created_at TEXT DEFAULT (datetime('now','localtime')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS cows (id INTEGER PRIMARY KEY AUTOINCREMENT, cow_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, breed TEXT, age REAL, weight REAL, health_status TEXT DEFAULT 'সুস্থ', pregnancy_status TEXT DEFAULT 'না', image_path TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now','localtime')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS milk_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, cow_id INTEGER, date TEXT NOT NULL, morning REAL DEFAULT 0, evening REAL DEFAULT 0, total REAL DEFAULT 0, notes TEXT, created_at TEXT DEFAULT (datetime('now','localtime')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, category TEXT NOT NULL, description TEXT, debit REAL DEFAULT 0, credit REAL DEFAULT 0, reference TEXT, created_at TEXT DEFAULT (datetime('now','localtime')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS parties (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, phone TEXT, address TEXT, opening_balance REAL DEFAULT 0, balance_type TEXT DEFAULT 'debit', notes TEXT, created_at TEXT DEFAULT (datetime('now','localtime')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS party_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, party_id INTEGER, date TEXT NOT NULL, description TEXT, debit REAL DEFAULT 0, credit REAL DEFAULT 0, reference TEXT, created_at TEXT DEFAULT (datetime('now','localtime')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS health_records (id INTEGER PRIMARY KEY AUTOINCREMENT, cow_id INTEGER, date TEXT NOT NULL, type TEXT NOT NULL, description TEXT, medicine TEXT, vet_name TEXT, cost REAL DEFAULT 0, next_date TEXT, created_at TEXT DEFAULT (datetime('now','localtime')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS breeding_records (id INTEGER PRIMARY KEY AUTOINCREMENT, cow_id INTEGER, mating_date TEXT NOT NULL, method TEXT, expected_delivery TEXT, actual_delivery TEXT, status TEXT DEFAULT 'গর্ভবতী', notes TEXT, created_at TEXT DEFAULT (datetime('now','localtime')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS calf_records (id INTEGER PRIMARY KEY AUTOINCREMENT, cow_id INTEGER, birth_date TEXT NOT NULL, gender TEXT, weight REAL, health TEXT DEFAULT 'সুস্থ', notes TEXT, created_at TEXT DEFAULT (datetime('now','localtime')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    this._saveDb();

    if (!this._get('SELECT id FROM users WHERE username=?', ['admin'])) {
      this.db.run('INSERT INTO users (username,password,role) VALUES (?,?,?)', ['admin','admin123','admin']);
    }
    [['farm_name','আমার গরুর খামার'],['milk_price','60'],['currency','BDT'],['owner_name','মালিক'],['phone',''],['address','']].forEach(([k,v]) => {
      this.db.run('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)', [k,v]);
    });
    this._saveDb();
  }

  getUser(u,p) { return this._get('SELECT * FROM users WHERE username=? AND password=?',[u,p]); }

  getCows() {
    const cows = this._all('SELECT * FROM cows ORDER BY name');
    const today = new Date().toISOString().slice(0,10);
    return cows.map(c => {
      const m = this._get('SELECT COALESCE(SUM(total),0) as n FROM milk_entries WHERE cow_id=? AND date=?',[c.id,today]);
      return { ...c, today_milk: m ? m.n : 0 };
    });
  }
  getCow(id) { return this._get('SELECT * FROM cows WHERE id=?',[id]); }
  addCow(d) {
    this.db.run('INSERT INTO cows (cow_id,name,breed,age,weight,health_status,pregnancy_status,image_path,notes) VALUES (?,?,?,?,?,?,?,?,?)',
      [d.cow_id,d.name,d.breed,d.age,d.weight,d.health_status,d.pregnancy_status,d.image_path,d.notes]);
    this._saveDb();
    const r = this._get('SELECT last_insert_rowid() as id');
    return { id: r.id, ...d };
  }
  updateCow(id,d) {
    this.db.run('UPDATE cows SET cow_id=?,name=?,breed=?,age=?,weight=?,health_status=?,pregnancy_status=?,image_path=?,notes=? WHERE id=?',
      [d.cow_id,d.name,d.breed,d.age,d.weight,d.health_status,d.pregnancy_status,d.image_path,d.notes,id]);
    this._saveDb();
    return this.getCow(id);
  }
  deleteCow(id) { this._run('DELETE FROM cows WHERE id=?',[id]); return {success:true}; }

  getMilkEntries(cowId,dateFrom,dateTo) {
    let q=`SELECT m.*,c.name as cow_name,c.cow_id as cow_code FROM milk_entries m LEFT JOIN cows c ON c.id=m.cow_id WHERE 1=1`,p=[];
    if(cowId){q+=' AND m.cow_id=?';p.push(cowId);}
    if(dateFrom){q+=' AND m.date>=?';p.push(dateFrom);}
    if(dateTo){q+=' AND m.date<=?';p.push(dateTo);}
    return this._all(q+' ORDER BY m.date DESC',p);
  }
  addMilkEntry(d) {
    d.total=(parseFloat(d.morning)||0)+(parseFloat(d.evening)||0);
    this.db.run('INSERT INTO milk_entries (cow_id,date,morning,evening,total,notes) VALUES (?,?,?,?,?,?)',
      [d.cow_id,d.date,d.morning,d.evening,d.total,d.notes]);
    this._saveDb();
    const r=this._get('SELECT last_insert_rowid() as id');
    return {id:r.id,...d};
  }
  deleteMilkEntry(id) { this._run('DELETE FROM milk_entries WHERE id=?',[id]); return {success:true}; }
  getMilkSummary(period) {
    let days=30;
    if(period==='week')days=7;
    if(period==='year')days=365;
    const from=new Date(Date.now()-days*86400000).toISOString().slice(0,10);
    return this._all('SELECT date,SUM(total) as total_milk,COUNT(DISTINCT cow_id) as cow_count FROM milk_entries WHERE date>=? GROUP BY date ORDER BY date',[from]);
  }
  getDailyMilkTotal(date) { return this._get('SELECT COALESCE(SUM(total),0) as total FROM milk_entries WHERE date=?',[date||new Date().toISOString().slice(0,10)]); }

  getTransactions(f={}) {
    let q='SELECT * FROM transactions WHERE 1=1',p=[];
    if(f.dateFrom){q+=' AND date>=?';p.push(f.dateFrom);}
    if(f.dateTo){q+=' AND date<=?';p.push(f.dateTo);}
    if(f.category){q+=' AND category=?';p.push(f.category);}
    return this._all(q+' ORDER BY date DESC,id DESC',p);
  }
  addTransaction(d) {
    this.db.run('INSERT INTO transactions (date,category,description,debit,credit,reference) VALUES (?,?,?,?,?,?)',
      [d.date,d.category,d.description,d.debit,d.credit,d.reference]);
    this._saveDb();
    const r=this._get('SELECT last_insert_rowid() as id');
    return {id:r.id,...d};
  }
  deleteTransaction(id) { this._run('DELETE FROM transactions WHERE id=?',[id]); return {success:true}; }
  getAccountSummary(period) {
    let from=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
    const today=new Date().toISOString().slice(0,10);
    let q='SELECT COALESCE(SUM(credit),0) as total_income,COALESCE(SUM(debit),0) as total_expense FROM transactions WHERE ';
    let row;
    if(period==='today') row=this._get(q+'date=?',[today]);
    else if(period==='week') row=this._get(q+'date>=?',[new Date(Date.now()-7*86400000).toISOString().slice(0,10)]);
    else if(period==='year') row=this._get(q+'date>=?',[new Date().getFullYear()+'-01-01']);
    else row=this._get(q+'date>=?',[from]);
    row.profit=row.total_income-row.total_expense;
    return row;
  }

  getParties(type) {
    let q='SELECT * FROM parties WHERE 1=1',p=[];
    if(type){q+=' AND type=?';p.push(type);}
    return this._all(q+' ORDER BY name',p);
  }
  addParty(d) {
    this.db.run('INSERT INTO parties (name,type,phone,address,opening_balance,balance_type,notes) VALUES (?,?,?,?,?,?,?)',
      [d.name,d.type,d.phone,d.address,d.opening_balance,d.balance_type,d.notes]);
    this._saveDb();
    const r=this._get('SELECT last_insert_rowid() as id');
    return {id:r.id,...d};
  }
  updateParty(id,d) {
    this.db.run('UPDATE parties SET name=?,type=?,phone=?,address=?,opening_balance=?,balance_type=?,notes=? WHERE id=?',
      [d.name,d.type,d.phone,d.address,d.opening_balance,d.balance_type,d.notes,id]);
    this._saveDb();
    return {success:true};
  }
  deleteParty(id) { this._run('DELETE FROM parties WHERE id=?',[id]); this._run('DELETE FROM party_transactions WHERE party_id=?',[id]); return {success:true}; }
  getPartyLedger(partyId,dateFrom,dateTo) {
    let q='SELECT * FROM party_transactions WHERE party_id=?',p=[partyId];
    if(dateFrom){q+=' AND date>=?';p.push(dateFrom);}
    if(dateTo){q+=' AND date<=?';p.push(dateTo);}
    return this._all(q+' ORDER BY date,id',p);
  }
  addPartyTransaction(d) {
    this.db.run('INSERT INTO party_transactions (party_id,date,description,debit,credit,reference) VALUES (?,?,?,?,?,?)',
      [d.party_id,d.date,d.description,d.debit,d.credit,d.reference]);
    this._saveDb();
    const r=this._get('SELECT last_insert_rowid() as id');
    return {id:r.id,...d};
  }
  deletePartyTransaction(id) { this._run('DELETE FROM party_transactions WHERE id=?',[id]); return {success:true}; }
  getPartyBalance(partyId) {
    const party=this._get('SELECT * FROM parties WHERE id=?',[partyId]);
    if(!party)return null;
    const txs=this._get('SELECT SUM(debit) as td,SUM(credit) as tc FROM party_transactions WHERE party_id=?',[partyId]);
    const td=(party.balance_type==='debit'?parseFloat(party.opening_balance):0)+(parseFloat(txs.td)||0);
    const tc=(party.balance_type==='credit'?parseFloat(party.opening_balance):0)+(parseFloat(txs.tc)||0);
    const balance=td-tc;
    return {party,totalDebit:td,totalCredit:tc,balance,balanceLabel:balance>=0?'পাওনা (ডেবিট)':'দেনা (ক্রেডিট)'};
  }
  getAllDues() {
    return this.getParties().map(p=>{const b=this.getPartyBalance(p.id);return{...p,balance:b?b.balance:0};}).filter(p=>p.balance!==0);
  }

  getHealthRecords(cowId) {
    let q=`SELECT h.*,c.name as cow_name FROM health_records h LEFT JOIN cows c ON c.id=h.cow_id WHERE 1=1`,p=[];
    if(cowId){q+=' AND h.cow_id=?';p.push(cowId);}
    return this._all(q+' ORDER BY h.date DESC',p);
  }
  addHealthRecord(d) {
    this.db.run('INSERT INTO health_records (cow_id,date,type,description,medicine,vet_name,cost,next_date) VALUES (?,?,?,?,?,?,?,?)',
      [d.cow_id,d.date,d.type,d.description,d.medicine,d.vet_name,d.cost,d.next_date]);
    this._saveDb();
    const r=this._get('SELECT last_insert_rowid() as id');
    return {id:r.id,...d};
  }
  deleteHealthRecord(id) { this._run('DELETE FROM health_records WHERE id=?',[id]); return {success:true}; }
  getVaccinationsDue() {
    const today=new Date().toISOString().slice(0,10);
    const next7=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
    return this._all(`SELECT h.*,c.name as cow_name FROM health_records h LEFT JOIN cows c ON c.id=h.cow_id WHERE h.next_date BETWEEN ? AND ? ORDER BY h.next_date`,[today,next7]);
  }

  getBreedingRecords(cowId) {
    let q=`SELECT b.*,c.name as cow_name FROM breeding_records b LEFT JOIN cows c ON c.id=b.cow_id WHERE 1=1`,p=[];
    if(cowId){q+=' AND b.cow_id=?';p.push(cowId);}
    return this._all(q+' ORDER BY b.mating_date DESC',p);
  }
  addBreedingRecord(d) {
    this.db.run('INSERT INTO breeding_records (cow_id,mating_date,method,expected_delivery,status,notes) VALUES (?,?,?,?,?,?)',
      [d.cow_id,d.mating_date,d.method,d.expected_delivery,d.status,d.notes]);
    this._saveDb();
    const r=this._get('SELECT last_insert_rowid() as id');
    return {id:r.id,...d};
  }
  deleteBreedingRecord(id) { this._run('DELETE FROM breeding_records WHERE id=?',[id]); return {success:true}; }
  getCalfRecords() { return this._all(`SELECT f.*,c.name as cow_name FROM calf_records f LEFT JOIN cows c ON c.id=f.cow_id ORDER BY f.birth_date DESC`); }
  addCalfRecord(d) {
    this.db.run('INSERT INTO calf_records (cow_id,birth_date,gender,weight,health,notes) VALUES (?,?,?,?,?,?)',
      [d.cow_id,d.birth_date,d.gender,d.weight,d.health,d.notes]);
    this._saveDb();
    const r=this._get('SELECT last_insert_rowid() as id');
    return {id:r.id,...d};
  }

  getDashboardData() {
    const today=new Date().toISOString().slice(0,10);
    const ms=today.slice(0,8)+'01';
    return {
      totalCows: (this._get('SELECT COUNT(*) as n FROM cows')||{n:0}).n,
      sickCows: (this._get("SELECT COUNT(*) as n FROM cows WHERE health_status!='সুস্থ'")||{n:0}).n,
      pregnantCows: (this._get("SELECT COUNT(*) as n FROM cows WHERE pregnancy_status='হ্যাঁ'")||{n:0}).n,
      todayMilk: (this._get('SELECT COALESCE(SUM(total),0) as n FROM milk_entries WHERE date=?',[today])||{n:0}).n,
      todayIncome: (this._get('SELECT COALESCE(SUM(credit),0) as n FROM transactions WHERE date=?',[today])||{n:0}).n,
      todayExpense: (this._get('SELECT COALESCE(SUM(debit),0) as n FROM transactions WHERE date=?',[today])||{n:0}).n,
      monthIncome: (this._get('SELECT COALESCE(SUM(credit),0) as n FROM transactions WHERE date>=?',[ms])||{n:0}).n,
      monthExpense: (this._get('SELECT COALESCE(SUM(debit),0) as n FROM transactions WHERE date>=?',[ms])||{n:0}).n,
      totalParties: (this._get('SELECT COUNT(*) as n FROM parties')||{n:0}).n,
      vaccinationsDue: this.getVaccinationsDue().length,
      recentMilk: this.getMilkSummary('week'),
      recentTransactions: this._all('SELECT * FROM transactions ORDER BY date DESC,id DESC LIMIT 5')
    };
  }

  getSettings() {
    const obj={};
    this._all('SELECT key,value FROM settings').forEach(r=>obj[r.key]=r.value);
    return obj;
  }
  saveSettings(data) {
    Object.entries(data).forEach(([k,v])=>this.db.run('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)',[k,v]));
    this._saveDb();
    return {success:true};
  }
}

module.exports = Database;
