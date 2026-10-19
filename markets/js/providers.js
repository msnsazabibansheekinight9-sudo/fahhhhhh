// ============================================================================
// TERMINAL — live data. Three keyless feeds connect on their own (US Treasury
// debt, crypto spot, ECB reference FX); the rest light up when you paste a free
// API key in the Sources panel. Every adapter reports into M.sources, and that
// ledger is the only thing the UI trusts when it badges a number LIVE or SIM.
//
// Keys are kept in this browser's localStorage and sent to nobody but the
// provider they belong to. Nothing here phones home.
// ============================================================================
'use strict';
(function () {
const P = M.Providers = { active: {}, timers: [], sockets: [] };
const U = M.Universe;

const SRC = M.sources;
SRC.declare('treasury', { name: 'US Treasury — Debt to the Penny', kind: 'macro', url: 'https://fiscaldata.treasury.gov', detail: 'Keyless. Re-anchors the national debt counter.' });
SRC.declare('crypto', { name: 'Crypto spot', kind: 'quotes', url: 'https://api.coinbase.com', detail: 'Keyless. Coinbase, then Binance, then CoinGecko.' });
SRC.declare('fx', { name: 'ECB reference rates', kind: 'quotes', url: 'https://frankfurter.app', detail: 'Keyless. Daily fix, not a live tick.' });
SRC.declare('finnhub', { name: 'Finnhub — stocks, fundamentals, news', kind: 'quotes', url: 'https://finnhub.io/register', detail: 'Free key. Real-time US trades over websocket.' });
SRC.declare('twelvedata', { name: 'Twelve Data — quotes and history', kind: 'quotes', url: 'https://twelvedata.com/pricing', detail: 'Free key, 800 calls a day.' });
SRC.declare('alphavantage', { name: 'Alpha Vantage — fundamentals', kind: 'fundamentals', url: 'https://www.alphavantage.co/support/#api-key', detail: 'Free key, 25 calls a day. Overview endpoint.' });
SRC.declare('marketaux', { name: 'Marketaux — market news', kind: 'news', url: 'https://www.marketaux.com', detail: 'Free key. Headlines tagged by ticker.' });
SRC.declare('llm', { name: 'Language model bridge', kind: 'ai', url: '', detail: 'Optional. Writes narrative on top of the council verdict.' });

// How many symbols we are willing to poll on a free tier before we start
// starving the quota. Watchlist and open positions come first.
const PRIORITY = () => {
  const out = [];
  const push = s => { const i = U.get(s); if (i && !out.includes(i)) out.push(i); };
  (M.Portfolio ? M.Portfolio.positions.map(p => p.sym) : []).forEach(push);
  (M.store.get('watch', ['AAPL', 'MSFT', 'NVDA', 'SPY', 'TSLA'])).forEach(push);
  if (M.Sim && M.Sim.focus) push(M.Sim.focus.sym);
  return out;
};

function applyQuote(inst, q) {
  if (!inst || !isFinite(q.px) || q.px <= 0) return;
  inst.px = q.px;
  if (isFinite(q.prev) && q.prev > 0) inst.prev = q.prev;
  if (isFinite(q.open) && q.open > 0) inst.open = q.open;
  if (isFinite(q.hi) && q.hi > 0) inst.hi = q.hi;
  if (isFinite(q.lo) && q.lo > 0) inst.lo = q.lo;
  if (isFinite(q.vol) && q.vol > 0) inst.vol = q.vol;
  inst.chg = inst.px - inst.prev;
  inst.chgPct = inst.prev ? inst.chg / inst.prev * 100 : 0;
  inst.spread = Math.max(0.01, inst.px * 0.0002);
  inst.bid = inst.px - inst.spread / 2; inst.ask = inst.px + inst.spread / 2;
  inst.src = 'live'; inst.srcName = q.src || 'live'; inst.last = Date.now();
  if (inst.f && inst.f.eps > 0) { inst.f.pe = inst.px / inst.f.eps; inst.f.mcap = inst.px * inst.f.shares; }
  M.emit('quote', inst);
}
P.applyQuote = applyQuote;

// ------------------------------------------------------------------ 1. US Treasury
// The one number on the debt board that can be real without a key. Everything
// else on that board stays a projection and is badged as one.
async function treasury() {
  try {
    const url = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page%5Bsize%5D=1&format=json';
    const j = await M.net.json(url, { timeout: 12000 });
    const row = j && j.data && j.data[0];
    const v = row && parseFloat(row.tot_pub_debt_out_amt);
    if (!isFinite(v) || v < 1e12) throw new Error('unexpected payload');
    M.Debt.setAnchor('natDebt', v, Date.parse(row.record_date + 'T17:00:00-04:00'), 'Treasury ' + row.record_date);
    SRC.set('treasury', 'live', 'Debt to the Penny · ' + row.record_date + ' · ' + M.fmt.bigUsd(v));
    M.emit('debt:live', v);
  } catch (e) {
    SRC.set('treasury', 'error', 'Unreachable from this browser (' + e.message + '). Board stays on projection.');
  }
}

// ------------------------------------------------------------------ 2. Crypto
// Three fallbacks, because whichever exchange works depends on where you are.
const CB_MAP = { BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD', XRP: 'XRP-USD', ADA: 'ADA-USD', DOGE: 'DOGE-USD', AVAX: 'AVAX-USD', LINK: 'LINK-USD', DOT: 'DOT-USD', MATIC: 'MATIC-USD', LTC: 'LTC-USD', UNI: 'UNI-USD', ATOM: 'ATOM-USD' };
const CG_MAP = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', AVAX: 'avalanche-2', LINK: 'chainlink', DOT: 'polkadot', MATIC: 'matic-network', LTC: 'litecoin', UNI: 'uniswap', ATOM: 'cosmos' };

async function cryptoCoinbase() {
  const syms = Object.keys(CB_MAP);
  let ok = 0;
  await Promise.all(syms.map(async s => {
    try {
      const j = await M.net.json('https://api.exchange.coinbase.com/products/' + CB_MAP[s] + '/stats', { timeout: 8000 });
      const px = parseFloat(j.last);
      if (!isFinite(px)) return;
      applyQuote(U.get(s), { px, prev: parseFloat(j.open) || px, open: parseFloat(j.open), hi: parseFloat(j.high), lo: parseFloat(j.low), vol: parseFloat(j.volume), src: 'Coinbase' });
      ok++;
    } catch (e) {}
  }));
  return ok;
}
async function cryptoGecko() {
  const ids = Object.values(CG_MAP).join(',');
  const j = await M.net.json('https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true', { timeout: 10000 });
  let ok = 0;
  for (const s in CG_MAP) {
    const d = j[CG_MAP[s]]; if (!d || !isFinite(d.usd)) continue;
    const chg = d.usd_24h_change || 0;
    applyQuote(U.get(s), { px: d.usd, prev: d.usd / (1 + chg / 100), vol: d.usd_24h_vol, src: 'CoinGecko' });
    ok++;
  }
  return ok;
}
// Binance's combined ticker stream is the only genuinely tick-by-tick feed
// available here without a key.
function cryptoBinanceWS() {
  const pairs = ['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt', 'adausdt', 'dogeusdt', 'avaxusdt', 'linkusdt', 'dotusdt', 'ltcusdt', 'uniusdt', 'atomusdt'];
  const rev = { btcusdt: 'BTC', ethusdt: 'ETH', solusdt: 'SOL', bnbusdt: 'BNB', xrpusdt: 'XRP', adausdt: 'ADA', dogeusdt: 'DOGE', avaxusdt: 'AVAX', linkusdt: 'LINK', dotusdt: 'DOT', ltcusdt: 'LTC', uniusdt: 'UNI', atomusdt: 'ATOM' };
  try {
    const ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + pairs.map(p => p + '@ticker').join('/'));
    let got = 0;
    ws.onmessage = ev => {
      try {
        const m = JSON.parse(ev.data), d = m.data; if (!d || !d.s) return;
        const sym = rev[d.s.toLowerCase()]; if (!sym) return;
        applyQuote(U.get(sym), { px: +d.c, prev: +d.o, open: +d.o, hi: +d.h, lo: +d.l, vol: +d.v, src: 'Binance' });
        if (++got === 1) SRC.set('crypto', 'live', 'Binance websocket · tick by tick');
      } catch (e) {}
    };
    ws.onerror = () => {};
    ws.onclose = () => { P.sockets = P.sockets.filter(x => x !== ws); };
    P.sockets.push(ws);
    return ws;
  } catch (e) { return null; }
}
async function crypto() {
  try {
    const n = await cryptoCoinbase();
    if (n >= 3) { SRC.set('crypto', 'live', 'Coinbase · ' + n + ' pairs · 15s poll'); cryptoBinanceWS(); return; }
    const g = await cryptoGecko();
    if (g >= 3) { SRC.set('crypto', 'live', 'CoinGecko · ' + g + ' pairs'); return; }
    throw new Error('no exchange answered');
  } catch (e) { SRC.set('crypto', 'error', e.message + ' — crypto stays simulated.'); }
}

// ------------------------------------------------------------------ 3. FX
async function fx() {
  try {
    const j = await M.net.json('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,CHF,AUD,CAD,NZD,CNY,MXN,INR,BRL', { timeout: 9000 });
    const r = j.rates; if (!r) throw new Error('no rates');
    const set = (sym, v) => { const i = U.get(sym); if (i && isFinite(v)) { const prev = i.px; i.px = v; i.prev = prev || v; i.chg = i.px - i.prev; i.chgPct = i.prev ? i.chg / i.prev * 100 : 0; i.src = 'live'; i.srcName = 'ECB'; } };
    set('EURUSD', 1 / r.EUR); set('GBPUSD', 1 / r.GBP); set('USDJPY', r.JPY); set('USDCHF', r.CHF);
    set('AUDUSD', 1 / r.AUD); set('USDCAD', r.CAD); set('NZDUSD', 1 / r.NZD); set('USDCNH', r.CNY);
    set('USDMXN', r.MXN); set('USDINR', r.INR); set('USDBRL', r.BRL);
    SRC.set('fx', 'live', 'ECB reference fix · ' + j.date + ' · daily, not intraday');
  } catch (e) { SRC.set('fx', 'error', e.message + ' — FX stays simulated.'); }
}

// ------------------------------------------------------------------ 4. Finnhub
// The one free key that gives real US equity trades over a socket, plus
// fundamentals and news from the same place.
const FH = () => M.keys.get('finnhub');
async function finnhubQuote(inst) {
  const j = await M.net.json('https://finnhub.io/api/v1/quote?symbol=' + encodeURIComponent(inst.sym.replace('.', '-')) + '&token=' + FH(), { timeout: 9000 });
  if (!j || !isFinite(j.c) || j.c === 0) throw new Error('empty quote for ' + inst.sym);
  applyQuote(inst, { px: j.c, prev: j.pc, open: j.o, hi: j.h, lo: j.l, src: 'Finnhub' });
}
async function finnhubFundamentals(inst) {
  if (!FH() || inst.type !== 'stock') return false;
  try {
    const j = await M.net.json('https://finnhub.io/api/v1/stock/metric?symbol=' + encodeURIComponent(inst.sym.replace('.', '-')) + '&metric=all&token=' + FH(), { timeout: 11000 });
    const m = j && j.metric; if (!m) return false;
    const f = inst.f, n = (v, cur) => (isFinite(v) && v !== 0 ? v : cur);
    f.pe = n(m.peTTM, f.pe); f.pb = n(m.pbQuarterly ?? m.pbAnnual, f.pb); f.ps = n(m.psTTM, f.ps);
    f.eps = n(m.epsTTM ?? m.epsBasicExclExtraItemsTTM, f.eps);
    f.roe = n(m.roeTTM, f.roe); f.roa = n(m.roaTTM, f.roa); f.roic = n(m.roiTTM, f.roic);
    f.grossMargin = n(m.grossMarginTTM, f.grossMargin); f.opMargin = n(m.operatingMarginTTM, f.opMargin); f.netMargin = n(m.netProfitMarginTTM, f.netMargin);
    f.currentRatio = n(m.currentRatioQuarterly, f.currentRatio); f.quickRatio = n(m.quickRatioQuarterly, f.quickRatio);
    f.debtEquity = n(m['totalDebt/totalEquityQuarterly'], f.debtEquity);
    f.divYield = n(m.dividendYieldIndicatedAnnual, f.divYield);
    f.revGrowth = n(m.revenueGrowthTTMYoy, f.revGrowth); f.epsGrowth = n(m.epsGrowthTTMYoy, f.epsGrowth);
    f.epsGrowth5y = n(m.epsGrowth5Y, f.epsGrowth5y); f.revGrowth3y = n(m.revenueGrowth3Y, f.revGrowth3y);
    f.beta = n(m.beta, f.beta);
    f.evEbitda = n(m['currentEv/freeCashFlowTTM'], f.evEbitda);
    f.src = 'Finnhub';
    inst.fSrc = 'live';
    M.emit('fundamentals', inst);
    return true;
  } catch (e) { return false; }
}
P.fundamentals = finnhubFundamentals;

function finnhubWS() {
  const key = FH(); if (!key) return;
  try {
    const ws = new WebSocket('wss://ws.finnhub.io?token=' + key);
    ws.onopen = () => { for (const i of PRIORITY().filter(i => i.type === 'stock').slice(0, 25)) ws.send(JSON.stringify({ type: 'subscribe', symbol: i.sym.replace('.', '-') })); SRC.set('finnhub', 'live', 'Websocket open · real US trades'); };
    ws.onmessage = ev => {
      try {
        const m = JSON.parse(ev.data); if (m.type !== 'trade' || !m.data) return;
        for (const t of m.data) {
          const inst = U.get(t.s.replace('-', '.')); if (!inst) continue;
          inst.px = t.p; inst.chg = inst.px - inst.prev; inst.chgPct = inst.prev ? inst.chg / inst.prev * 100 : 0;
          inst.hi = Math.max(inst.hi, inst.px); inst.lo = Math.min(inst.lo, inst.px);
          inst.vol += t.v || 0; inst.src = 'live'; inst.srcName = 'Finnhub'; inst.last = Date.now();
          if (inst === M.Sim.focus) inst.tape.unshift({ t: t.t || Date.now(), p: t.p, s: t.v || 0, side: t.p >= inst.ask ? 'B' : 'S' });
        }
      } catch (e) {}
    };
    ws.onerror = () => SRC.set('finnhub', 'error', 'Websocket refused — check the key.');
    ws.onclose = () => { P.sockets = P.sockets.filter(x => x !== ws); };
    P.sockets.push(ws);
  } catch (e) {}
}

async function finnhub() {
  if (!FH()) { SRC.set('finnhub', 'off', 'No key. Stocks stay simulated.'); return; }
  try {
    const list = PRIORITY().filter(i => i.type === 'stock' || i.type === 'etf').slice(0, 12);
    let ok = 0;
    for (const i of list) { try { await finnhubQuote(i); ok++; } catch (e) {} }
    if (!ok) throw new Error('no quotes returned — key may be invalid or rate limited');
    SRC.set('finnhub', 'live', ok + ' symbols on REST · websocket for the watchlist');
    finnhubWS();
    for (const i of list.slice(0, 4)) finnhubFundamentals(i);
  } catch (e) { SRC.set('finnhub', 'error', e.message); }
}

// ------------------------------------------------------------------ 5. Twelve Data
async function twelvedata() {
  const key = M.keys.get('twelvedata');
  if (!key) { SRC.set('twelvedata', 'off', 'No key.'); return; }
  try {
    const syms = PRIORITY().filter(i => i.type === 'stock' || i.type === 'etf').slice(0, 8).map(i => i.sym).join(',');
    if (!syms) return;
    const j = await M.net.json('https://api.twelvedata.com/quote?symbol=' + syms + '&apikey=' + key, { timeout: 11000 });
    const rows = j.symbol ? { [j.symbol]: j } : j;
    let ok = 0;
    for (const s in rows) {
      const q = rows[s]; if (!q || !q.close) continue;
      applyQuote(U.get(s), { px: +q.close, prev: +q.previous_close, open: +q.open, hi: +q.high, lo: +q.low, vol: +q.volume, src: 'Twelve Data' });
      ok++;
    }
    if (!ok) throw new Error(j.message || 'no rows');
    SRC.set('twelvedata', 'live', ok + ' symbols · free tier is 8 credits a minute');
  } catch (e) { SRC.set('twelvedata', 'error', e.message); }
}

// ------------------------------------------------------------------ 6. Alpha Vantage
// 25 calls a day, so this only ever runs for the symbol in front of you, and
// only when you ask for it.
P.alphaOverview = async (inst) => {
  const key = M.keys.get('alphavantage');
  if (!key) throw new Error('No Alpha Vantage key');
  const j = await M.net.json('https://www.alphavantage.co/query?function=OVERVIEW&symbol=' + inst.sym + '&apikey=' + key, { timeout: 14000 });
  if (!j || !j.Symbol) throw new Error(j.Note || j.Information || 'no overview returned');
  const f = inst.f, num = (v, cur) => { const x = parseFloat(v); return isFinite(x) && x !== 0 ? x : cur; };
  f.pe = num(j.PERatio, f.pe); f.fpe = num(j.ForwardPE, f.fpe); f.pb = num(j.PriceToBookRatio, f.pb);
  f.ps = num(j.PriceToSalesRatioTTM, f.ps); f.eps = num(j.EPS, f.eps);
  f.evEbitda = num(j.EVToEBITDA, f.evEbitda); f.ebitda = num(j.EBITDA, f.ebitda);
  f.revenue = num(j.RevenueTTM, f.revenue); f.netIncome = num(j.NetIncomeTTM ?? j.ProfitMargin * j.RevenueTTM, f.netIncome);
  f.grossMargin = num(parseFloat(j.GrossProfitTTM) / parseFloat(j.RevenueTTM) * 100, f.grossMargin);
  f.opMargin = num(parseFloat(j.OperatingMarginTTM) * 100, f.opMargin);
  f.netMargin = num(parseFloat(j.ProfitMargin) * 100, f.netMargin);
  f.roe = num(parseFloat(j.ReturnOnEquityTTM) * 100, f.roe); f.roa = num(parseFloat(j.ReturnOnAssetsTTM) * 100, f.roa);
  f.divYield = num(parseFloat(j.DividendYield) * 100, f.divYield);
  f.beta = num(j.Beta, f.beta); f.mcap = num(j.MarketCapitalization, f.mcap);
  f.bvps = num(j.BookValue, f.bvps); f.revGrowth = num(parseFloat(j.QuarterlyRevenueGrowthYOY) * 100, f.revGrowth);
  f.epsGrowth = num(parseFloat(j.QuarterlyEarningsGrowthYOY) * 100, f.epsGrowth);
  f.src = 'Alpha Vantage'; inst.fSrc = 'live';
  if (j.Description) inst.about = j.Description;
  SRC.set('alphavantage', 'live', 'Overview pulled for ' + inst.sym);
  M.emit('fundamentals', inst);
  return j;
};

// ------------------------------------------------------------------ 7. News
P.newsFinnhub = async () => {
  const key = FH(); if (!key) return null;
  const j = await M.net.json('https://finnhub.io/api/v1/news?category=general&token=' + key, { timeout: 11000 });
  if (!Array.isArray(j)) throw new Error('bad payload');
  return j.slice(0, 60).map(n => ({
    id: 'fh' + n.id, t: (n.datetime || 0) * 1000, head: n.headline, body: n.summary || '',
    src: n.source || 'Finnhub', url: n.url, tickers: (n.related || '').split(',').filter(Boolean).slice(0, 6), live: true
  }));
};
P.newsMarketaux = async () => {
  const key = M.keys.get('marketaux'); if (!key) return null;
  const j = await M.net.json('https://api.marketaux.com/v1/news/all?language=en&filter_entities=true&limit=50&api_token=' + key, { timeout: 11000 });
  if (!j || !j.data) throw new Error(j && j.error ? j.error.message : 'bad payload');
  return j.data.map(n => ({
    id: 'mx' + n.uuid, t: Date.parse(n.published_at), head: n.title, body: n.description || n.snippet || '',
    src: n.source, url: n.url, tickers: (n.entities || []).filter(e => e.type === 'equity').map(e => e.symbol).slice(0, 6),
    sentiment: (n.entities || []).reduce((a, e) => a + (e.sentiment_score || 0), 0) / Math.max(1, (n.entities || []).length), live: true
  }));
};
// Any RSS feed, through a proxy the user supplies. Nothing is fetched through a
// third party unless they put one in deliberately.
P.newsRSS = async (url) => {
  const proxy = M.store.get('corsProxy', '');
  if (!proxy) return null;
  const txt = await M.net.text(proxy.replace('{url}', encodeURIComponent(url)), { timeout: 13000 });
  const doc = new DOMParser().parseFromString(txt, 'text/xml');
  const items = [...doc.querySelectorAll('item, entry')].slice(0, 40);
  return items.map((it, k) => {
    const g = t => { const n = it.querySelector(t); return n ? n.textContent.trim() : ''; };
    const link = g('link') || (it.querySelector('link') && it.querySelector('link').getAttribute('href')) || '';
    return { id: 'rss' + M.hash(g('title') + k), t: Date.parse(g('pubDate') || g('updated') || g('published')) || Date.now(), head: g('title'), body: g('description').replace(/<[^>]+>/g, '').slice(0, 400), src: new URL(url).hostname.replace('www.', ''), url: link, tickers: [], live: true };
  }).filter(n => n.head);
};

// ------------------------------------------------------------------ 8. LLM bridge
// Optional. The council's verdict is computed locally either way; this only
// asks a model to write it up, and it is labelled as model prose in the UI.
P.llm = async (prompt, system) => {
  const prov = M.store.get('llmProvider', 'anthropic');
  const key = M.keys.get('llm');
  if (!key) throw new Error('No model key set');
  if (prov === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: M.store.get('llmModel', 'claude-sonnet-4-5'), max_tokens: 1400, system: system || '', messages: [{ role: 'user', content: prompt }] })
    });
    const j = await r.json();
    if (!r.ok) throw new Error((j.error && j.error.message) || 'HTTP ' + r.status);
    return j.content.map(c => c.text || '').join('');
  }
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
    body: JSON.stringify({ model: M.store.get('llmModel', 'gpt-4o-mini'), max_tokens: 1400, messages: [{ role: 'system', content: system || '' }, { role: 'user', content: prompt }] })
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || 'HTTP ' + r.status);
  return j.choices[0].message.content;
};

// ------------------------------------------------------------------ scheduler
function every(ms, fn) { fn(); const t = setInterval(fn, ms); P.timers.push(t); return t; }

P.start = () => {
  every(6 * 3600e3, treasury);
  every(20e3, crypto);
  every(15 * 60e3, fx);
  every(45e3, () => { if (FH()) finnhub(); else SRC.set('finnhub', 'off', 'No key. Stocks stay simulated.'); });
  every(70e3, () => { if (M.keys.get('twelvedata')) twelvedata(); });
  SRC.set('alphavantage', M.keys.get('alphavantage') ? 'idle' : 'off', M.keys.get('alphavantage') ? 'Key set. Pulled on demand from a symbol page.' : 'No key.');
  SRC.set('marketaux', M.keys.get('marketaux') ? 'idle' : 'off', M.keys.get('marketaux') ? 'Key set.' : 'No key.');
  SRC.set('llm', M.keys.get('llm') ? 'idle' : 'off', M.keys.get('llm') ? 'Key set. Used only when you ask for a written brief.' : 'No key. The council still runs — it is local.');
  M.on('keys', () => { P.stop(); setTimeout(P.start, 200); });
};
P.stop = () => { P.timers.forEach(clearInterval); P.timers = []; P.sockets.forEach(s => { try { s.close(); } catch (e) {} }); P.sockets = []; };
P.refresh = () => { treasury(); crypto(); fx(); if (FH()) finnhub(); };
})();
