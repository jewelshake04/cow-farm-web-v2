// API Bridge - replaces Electron's ipcRenderer with REST API calls
const ipcRenderer = {
  invoke: async (channel, ...args) => {
    const routes = {
      // Auth
      'login': () => api('POST', '/api/login', args[0]),
      'logout': () => api('POST', '/api/logout'),
      // Cows
      'getCows': () => api('GET', '/api/cows'),
      'getCow': () => api('GET', `/api/cows/${args[0]}`),
      'addCow': () => api('POST', '/api/cows', args[0]),
      'updateCow': () => api('PUT', `/api/cows/${args[0]}`, args[1]),
      'deleteCow': () => api('DELETE', `/api/cows/${args[0]}`),
      // Milk
      'getMilkEntries': () => api('GET', `/api/milk?cowId=${args[0]||''}&dateFrom=${args[1]||''}&dateTo=${args[2]||''}`),
      'addMilkEntry': () => api('POST', '/api/milk', args[0]),
      'deleteMilkEntry': () => api('DELETE', `/api/milk/${args[0]}`),
      'getMilkSummary': () => api('GET', `/api/milk/summary/${args[0]||'month'}`),
      'getDailyMilkTotal': () => api('GET', `/api/milk/daily/${args[0]||''}`),
      // Transactions
      'getTransactions': () => api('GET', `/api/transactions?${new URLSearchParams(args[0]||{})}`),
      'addTransaction': () => api('POST', '/api/transactions', args[0]),
      'deleteTransaction': () => api('DELETE', `/api/transactions/${args[0]}`),
      'getAccountSummary': () => api('GET', `/api/transactions/summary/${args[0]||'month'}`),
      // Parties
      'getParties': () => api('GET', `/api/parties?type=${args[0]||''}`),
      'addParty': () => api('POST', '/api/parties', args[0]),
      'updateParty': () => api('PUT', `/api/parties/${args[0]}`, args[1]),
      'deleteParty': () => api('DELETE', `/api/parties/${args[0]}`),
      'getPartyLedger': () => api('GET', `/api/parties/${args[0]}/ledger?dateFrom=${args[1]||''}&dateTo=${args[2]||''}`),
      'addPartyTransaction': () => api('POST', '/api/party-transactions', args[0]),
      'deletePartyTransaction': () => api('DELETE', `/api/party-transactions/${args[0]}`),
      'getPartyBalance': () => api('GET', `/api/parties/${args[0]}/balance`),
      'getAllDues': () => api('GET', '/api/dues'),
      // Health
      'getHealthRecords': () => api('GET', `/api/health?cowId=${args[0]||''}`),
      'addHealthRecord': () => api('POST', '/api/health', args[0]),
      'deleteHealthRecord': () => api('DELETE', `/api/health/${args[0]}`),
      'getVaccinationsDue': () => api('GET', '/api/vaccinations-due'),
      // Breeding
      'getBreedingRecords': () => api('GET', `/api/breeding?cowId=${args[0]||''}`),
      'addBreedingRecord': () => api('POST', '/api/breeding', args[0]),
      'deleteBreedingRecord': () => api('DELETE', `/api/breeding/${args[0]}`),
      'getCalfRecords': () => api('GET', '/api/calves'),
      'addCalfRecord': () => api('POST', '/api/calves', args[0]),
      // Dashboard
      'getDashboardData': () => api('GET', '/api/dashboard'),
      // Settings
      'getSettings': () => api('GET', '/api/settings'),
      'saveSettings': () => api('POST', '/api/settings', args[0]),
      // Backup
      'backupDatabase': () => { window.open('/api/backup/download'); return Promise.resolve({success:true}); },
      'restoreDatabase': () => Promise.resolve({success:false, message:'Web version এ restore সরাসরি হয় না'}),
      'uploadImage': () => Promise.resolve(null),
      'getUserDataPath': () => Promise.resolve(''),
    };
    if (routes[channel]) return routes[channel]();
    console.warn('Unknown channel:', channel);
    return null;
  },
  send: (channel) => {
    if (channel === 'logout') {
      api('POST', '/api/logout').then(() => { window.location.href = '/'; });
    }
    // minimize/maximize/close - no-op in web
  }
};

async function api(method, url, body) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (res.status === 401) {
      window.location.href = '/';
      return null;
    }
    return res.json();
  } catch(e) {
    console.error('API error:', e);
    return null;
  }
}
