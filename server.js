const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const CONFIG_PATH = path.join(__dirname, 'config.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); }
  catch { return []; }
}

async function fetchBalance(apiKey) {
  const res = await fetch('https://api.deepseek.com/user/balance', {
    headers: { Authorization: 'Bearer ' + apiKey },
  });
  if (!res.ok) throw new Error('DeepSeek API ' + res.status + ': ' + await res.text());
  return res.json();
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function serveStatic(urlPath, res) {
  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end(); return; }
  const ext = path.extname(filePath).toLowerCase();
  const ct = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, data2) => {
        if (err2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  });
}

async function route(req, res) {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;

  if (pathname === '/api/accounts' && req.method === 'GET') {
    const accounts = readConfig();
    return sendJSON(res, 200, accounts.map(a => ({
      name: a.name,
      provider: a.provider || 'deepseek',
      keyPreview: a.apiKey ? a.apiKey.slice(0, 6) + '...' + a.apiKey.slice(-4) : null,
    })));
  }

  if (pathname === '/api/refresh' && req.method === 'POST') {
    const body = await readBody(req);
    const accounts = readConfig();
    const account = accounts.find(a => a.name === body.name);
    if (!account) return sendJSON(res, 404, { error: 'account not found' });
    try {
      const raw = await fetchBalance(account.apiKey);
      const bals = (raw.balance_infos || []).map(i => ({
        totalBalance: i.total_balance,
        currency: i.currency,
      }));
      return sendJSON(res, 200, {
        name: account.name, provider: account.provider || 'deepseek',
        balances: bals,
        isAvailable: raw.is_available !== false,
      });
    } catch (err) { return sendJSON(res, 502, { error: err.message }); }
  }

  if (pathname === '/api/refresh-all' && req.method === 'POST') {
    const accounts = readConfig();
    if (!accounts.length) return sendJSON(res, 200, []);
    const results = await Promise.allSettled(accounts.map(async (a) => {
      const raw = await fetchBalance(a.apiKey);
      const bals = (raw.balance_infos || []).map(i => ({
        totalBalance: i.total_balance,
        currency: i.currency,
      }));
      return {
        name: a.name, provider: a.provider || 'deepseek',
        balances: bals,
        isAvailable: raw.is_available !== false,
      };
    }));
    return sendJSON(res, 200, results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { name: accounts[i].name, error: r.reason.message }
    ));
  }

  if (pathname === '/api/shutdown' && req.method === 'POST') {
    sendJSON(res, 200, { status: 'stopping' });
    setTimeout(function() { server.close(function() { process.exit(0); }); }, 300);
    return;
  }

  serveStatic(pathname, res);
}

const server = http.createServer(route);
server.listen(PORT, '127.0.0.1', function() {
  console.log('AI Accounts Dashboard http://localhost:' + PORT);
  console.log('Config: ' + CONFIG_PATH);
});
