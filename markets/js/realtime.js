// ============================================================================
// TERMINAL — the realtime layer. Websocket-first: where a provider streams,
// we stream; where it only polls, we poll on the tightest interval its tier
// allows. Every instrument records who last priced it and when, and a quote
// that stops arriving goes stale and visibly hands back to the simulation
// rather than freezing on a dead number and pretending it is current.
//
// Nothing here has a server behind it. Each adapter talks straight from the
// browser to the provider, which is why CORS decides what is possible without
// a key: an exchange that sends the header works, a venue that does not needs
// either a key or the proxy you supply in Sources.
// ============================================================================
'use strict';
(function () {
const RT = M.RT = {};
const U = M.Universe, SRC = M.sources;

// A quote is "live" only while it keeps arriving. Past this it is stale.
const STALE_TICK = 25000;      // streamed: a socket should beat this easily
const STALE_POLL = 180000;     // polled: generous, these are minutes apart
RT.STALE_TICK = STALE_TICK;

// --------------------------------------------------------------- ingest
// Everything real funnels through here so there is exactly one place that can
// mark an instrument live, and exactly one definition of what live means.
RT.feed = (sym, q, meta) => {
  const inst = U.get(sym);
  if (!inst || !q || !isFinite(q.px) || q.px <= 0) return false;
  const prevPx = inst.px;
  inst.px = q.px;
  if (isFinite(q.prev) && q.prev > 0) inst.prev = q.prev;
  if (isFinite(q.open) && q.open > 0) inst.open = q.open;
  if (isFinite(q.hi) && q.hi > 0) inst.hi = Math.max(q.hi, inst.px);
  if (isFinite(q.lo) && q.lo > 0) inst.lo = Math.min(q.lo, inst.px);
  else inst.lo = Math.min(inst.lo || inst.px, inst.px);
  inst.hi = Math.max(inst.hi || inst.px, inst.px);
  if (isFinite(q.vol) && q.vol > 0) inst.vol = q.vol;
  if (isFinite(q.bid) && q.bid > 0) inst.bid = q.bid;
  if (isFinite(q.ask) && q.ask > 0) inst.ask = q.ask;
  inst.chg = inst.px - inst.prev;
  inst.chgPct = inst.prev ? inst.chg / inst.prev * 100 : 0;
  if (!isFinite(q.bid) || !isFinite(q.ask)) {
    inst.spread = Math.max(inst.type === 'fx' ? 1e-5 : 0.01, inst.px * 0.0002);
    inst.bid = inst.px - inst.spread / 2; inst.ask = inst.px + inst.spread / 2;
  } else inst.spread = Math.max(0, inst.ask - inst.bid);

  inst.src = 'live';
  inst.srcName = meta.name;
  inst.srcKind = meta.kind;                 // 'tick' | 'poll'
  inst.srcDelay = meta.delay || 0;          // minutes of provider delay, 0 = real time
  inst.last = Date.now();
  inst.rtAge = 0;
  if (inst.f && inst.f.eps > 0) { inst.f.pe = inst.px / inst.f.eps; inst.f.mcap = inst.px * inst.f.shares; }
  // A streamed print is a print: put it on the tape of the symbol being watched.
  if (meta.kind === 'tick' && inst === M.Sim.focus && q.px !== prevPx) {
    inst.tape.unshift({ t: q.t || Date.now(), p: q.px, s: q.size || 0, side: q.px >= prevPx ? 'B' : 'S', real: true });
    if (inst.tape.length > 220) inst.tape.length = 220;
  }
  stats.ticks++;
  M.emit('rt:quote', inst);
  return true;
};

// Has a real feed priced this recently enough to still be trusted?
RT.owned = inst => inst.src === 'live' && (Date.now() - (inst.last || 0)) < (inst.srcKind === 'tick' ? STALE_TICK : STALE_POLL);
RT.ageOf = inst => inst.last ? Date.now() - inst.last : Infinity;

// Demote anything whose feed has gone quiet, so the badge stops claiming LIVE.
function sweepStale() {
  let demoted = 0;
  for (const inst of U.list) {
    if (inst.src !== 'live') continue;
    if (!RT.owned(inst)) { inst.src = 'sim'; inst.srcName = null; inst.srcKind = null; demoted++; }
  }
  if (demoted) M.emit('rt:stale', demoted);
}

const stats = RT.stats = { ticks: 0, msgs: 0, since: Date.now(), rate: 0 };
setInterval(() => { const dt = (Date.now() - stats.since) / 1000; stats.rate = dt ? stats.ticks / dt : 0; stats.ticks = 0; stats.since = Date.now(); sweepStale(); }, 5000);

// --------------------------------------------------------------- sockets
// One supervisor for every stream: exponential backoff, a heartbeat watchdog,
// and a status the Sources panel can render without guessing.
const socks = RT.socks = {};
function sock(id, name, build) {
  const s = socks[id] = socks[id] || { id, name, ws: null, status: 'off', tries: 0, lastMsg: 0, detail: '', symbols: new Set(), want: true };
  s.build = build;
  return s;
}
function openSock(s) {
  if (!s.want || (s.ws && (s.ws.readyState === 0 || s.ws.readyState === 1))) return;
  let ws;
  try { ws = s.build(s); } catch (e) { s.status = 'error'; s.detail = e.message; return; }
  if (!ws) return;
  s.ws = ws; s.status = 'connecting'; s.detail = 'opening…';
  M.emit('rt:status', s);
  ws.addEventListener('open', () => { s.status = 'open'; s.tries = 0; s.lastMsg = Date.now(); s.detail = 'connected'; M.emit('rt:status', s); });
  ws.addEventListener('message', () => { s.lastMsg = Date.now(); stats.msgs++; });
  ws.addEventListener('error', () => { s.status = 'error'; s.detail = 'socket error — the host may be unreachable from this browser'; M.emit('rt:status', s); });
  ws.addEventListener('close', () => {
    s.ws = null;
    if (!s.want) { s.status = 'off'; s.detail = 'stopped'; M.emit('rt:status', s); return; }
    s.status = 'retrying';
    const wait = Math.min(45000, 1200 * Math.pow(1.8, s.tries++));
    s.detail = `reconnecting in ${(wait / 1000).toFixed(0)}s (attempt ${s.tries})`;
    M.emit('rt:status', s);
    setTimeout(() => openSock(s), wait);
  });
}
// A socket that connected but then went silent is worse than one that failed
// loudly, so the watchdog recycles it.
setInterval(() => {
  for (const id in socks) {
    const s = socks[id];
    if (s.status === 'open' && Date.now() - s.lastMsg > 70000) { s.detail = 'silent for 70s — recycling'; try { s.ws.close(); } catch (e) {} }
  }
}, 20000);
RT.stopSock = id => { const s = socks[id]; if (!s) return; s.want = false; try { s.ws && s.ws.close(); } catch (e) {} };
RT.startSock = id => { const s = socks[id]; if (!s) return; s.want = true; s.tries = 0; openSock(s); };

// --------------------------------------------------------------- crypto streams
// Binance publishes a combined stream with no key and no origin restriction,
// which makes it the one genuinely tick-by-tick feed available for free.
const BINANCE = { BTC: 'btcusdt', ETH: 'ethusdt', SOL: 'solusdt', BNB: 'bnbusdt', XRP: 'xrpusdt', ADA: 'adausdt', DOGE: 'dogeusdt', AVAX: 'avaxusdt', LINK: 'linkusdt', DOT: 'dotusdt', LTC: 'ltcusdt', UNI: 'uniusdt', ATOM: 'atomusdt' };
const BIN_REV = Object.fromEntries(Object.entries(BINANCE).map(([k, v]) => [v, k]));

function binance() {
  const s = sock('binance', 'Binance — crypto trades', () => {
    const streams = Object.values(BINANCE).flatMap(p => [p + '@trade', p + '@ticker']).join('/');
    const ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + streams);
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      const d = m.data; if (!d) return;
      const sym = BIN_REV[(d.s || '').toLowerCase()]; if (!sym) return;
      if (d.e === 'trade') RT.feed(sym, { px: +d.p, size: +d.q, t: d.T }, { name: 'Binance', kind: 'tick' });
      else if (d.e === '24hrTicker') RT.feed(sym, { px: +d.c, prev: +d.o, open: +d.o, hi: +d.h, lo: +d.l, vol: +d.v, bid: +d.b, ask: +d.a }, { name: 'Binance', kind: 'tick' });
      s.symbols = new Set(Object.keys(BINANCE));
      s.detail = Object.keys(BINANCE).length + ' pairs streaming';
    };
    return ws;
  });
  openSock(s);
}

// Coinbase's feed is the fallback where Binance is geo-blocked.
const COINBASE = { 'BTC-USD': 'BTC', 'ETH-USD': 'ETH', 'SOL-USD': 'SOL', 'XRP-USD': 'XRP', 'ADA-USD': 'ADA', 'DOGE-USD': 'DOGE', 'AVAX-USD': 'AVAX', 'LINK-USD': 'LINK', 'DOT-USD': 'DOT', 'LTC-USD': 'LTC', 'UNI-USD': 'UNI', 'ATOM-USD': 'ATOM' };
function coinbase() {
  const s = sock('coinbase', 'Coinbase — crypto ticker', () => {
    const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', product_ids: Object.keys(COINBASE), channels: ['ticker'] }));
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type !== 'ticker' || !m.product_id) return;
      const sym = COINBASE[m.product_id]; if (!sym) return;
      // Only let Coinbase price a coin Binance is not already streaming.
      const inst = U.get(sym);
      if (inst && inst.srcName === 'Binance' && RT.owned(inst)) return;
      RT.feed(sym, { px: +m.price, open: +m.open_24h, hi: +m.high_24h, lo: +m.low_24h, prev: +m.open_24h, vol: +m.volume_24h, bid: +m.best_bid, ask: +m.best_ask, size: +m.last_size }, { name: 'Coinbase', kind: 'tick' });
      s.detail = Object.keys(COINBASE).length + ' products subscribed';
    };
    return ws;
  });
  openSock(s);
}

// Kraken adds depth of coverage and is a third independent route.
const KRAKEN = { 'XBT/USD': 'BTC', 'ETH/USD': 'ETH', 'SOL/USD': 'SOL', 'ADA/USD': 'ADA', 'DOT/USD': 'DOT', 'LINK/USD': 'LINK', 'LTC/USD': 'LTC', 'ATOM/USD': 'ATOM', 'XRP/USD': 'XRP' };
function kraken() {
  const s = sock('kraken', 'Kraken — crypto ticker', () => {
    const ws = new WebSocket('wss://ws.kraken.com');
    const names = {};
    ws.onopen = () => ws.send(JSON.stringify({ event: 'subscribe', pair: Object.keys(KRAKEN), subscription: { name: 'ticker' } }));
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.event === 'subscriptionStatus' && m.channelID != null) { names[m.channelID] = m.pair; return; }
      if (!Array.isArray(m)) return;
      const pair = m[3] || names[m[0]];
      const sym = KRAKEN[pair]; if (!sym) return;
      const d = m[1]; if (!d || !d.c) return;
      const inst = U.get(sym);
      if (inst && (inst.srcName === 'Binance' || inst.srcName === 'Coinbase') && RT.owned(inst)) return;
      RT.feed(sym, { px: +d.c[0], bid: d.b && +d.b[0], ask: d.a && +d.a[0], hi: d.h && +d.h[1], lo: d.l && +d.l[1], vol: d.v && +d.v[1], prev: d.o && +(Array.isArray(d.o) ? d.o[1] : d.o) }, { name: 'Kraken', kind: 'tick' });
      s.detail = Object.keys(KRAKEN).length + ' pairs subscribed';
    };
    return ws;
  });
  openSock(s);
}

// --------------------------------------------------------------- equity streams
// Finnhub: a free key, and the only free tier that streams actual US trades.
function finnhubWS() {
  const key = M.keys.get('finnhub'); if (!key) return;
  const s = sock('finnhubws', 'Finnhub — US equity trades', (self) => {
    const ws = new WebSocket('wss://ws.finnhub.io?token=' + encodeURIComponent(key));
    ws.onopen = () => { self.subscribed = new Set(); resubscribe(self, ws); };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'error') { self.detail = m.msg || 'provider rejected the key'; self.status = 'error'; M.emit('rt:status', self); return; }
      if (m.type !== 'trade' || !m.data) return;
      for (const t of m.data) {
        const sym = String(t.s || '').replace('-', '.');
        RT.feed(sym, { px: t.p, size: t.v, t: t.t }, { name: 'Finnhub', kind: 'tick' });
      }
      self.detail = self.subscribed ? self.subscribed.size + ' symbols streaming' : '';
    };
    return ws;
  });
  openSock(s);
}
// The watchlist changes, so the subscription has to follow it.
function resubscribe(s, ws) {
  if (!ws || ws.readyState !== 1) return;
  const want = new Set(RT.priority().filter(i => i.type === 'stock' || i.type === 'etf').slice(0, 40).map(i => i.sym.replace('.', '-')));
  for (const sym of want) if (!s.subscribed.has(sym)) { ws.send(JSON.stringify({ type: 'subscribe', symbol: sym })); s.subscribed.add(sym); }
  for (const sym of [...s.subscribed]) if (!want.has(sym)) { ws.send(JSON.stringify({ type: 'unsubscribe', symbol: sym })); s.subscribed.delete(sym); }
  s.symbols = s.subscribed;
}

// Alpaca's free tier streams IEX trades in real time; it needs a key and secret.
function alpacaWS() {
  const key = M.keys.get('alpaca'), secret = M.keys.get('alpacaSecret');
  if (!key || !secret) return;
  const s = sock('alpaca', 'Alpaca — IEX trades', (self) => {
    const ws = new WebSocket('wss://stream.data.alpaca.markets/v2/iex');
    ws.onmessage = ev => {
      let rows; try { rows = JSON.parse(ev.data); } catch (e) { return; }
      for (const m of [].concat(rows)) {
        if (m.T === 'success' && m.msg === 'connected') { ws.send(JSON.stringify({ action: 'auth', key, secret })); continue; }
        if (m.T === 'success' && m.msg === 'authenticated') {
          const syms = RT.priority().filter(i => i.type === 'stock' || i.type === 'etf').slice(0, 30).map(i => i.sym);
          ws.send(JSON.stringify({ action: 'subscribe', trades: syms, quotes: syms }));
          self.symbols = new Set(syms); self.detail = syms.length + ' symbols subscribed';
          continue;
        }
        if (m.T === 'error') { self.status = 'error'; self.detail = m.msg || 'auth rejected'; M.emit('rt:status', self); continue; }
        if (m.T === 't') RT.feed(m.S, { px: m.p, size: m.s, t: Date.parse(m.t) }, { name: 'Alpaca IEX', kind: 'tick' });
        else if (m.T === 'q') { const inst = U.get(m.S); if (inst) { inst.bid = m.bp; inst.ask = m.ap; } }
      }
    };
    return ws;
  });
  openSock(s);
}

// Twelve Data streams quotes for equities, FX and crypto on one socket.
function twelveWS() {
  const key = M.keys.get('twelvedata'); if (!key) return;
  const s = sock('twelvews', 'Twelve Data — quote stream', (self) => {
    const ws = new WebSocket('wss://ws.twelvedata.com/v1/quotes/price?apikey=' + encodeURIComponent(key));
    ws.onopen = () => {
      const syms = RT.priority().slice(0, 20).map(i => i.sym).concat(['EUR/USD', 'GBP/USD', 'USD/JPY']);
      ws.send(JSON.stringify({ action: 'subscribe', params: { symbols: syms.join(',') } }));
      self.symbols = new Set(syms); self.detail = syms.length + ' symbols requested';
    };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.event === 'subscribe-status' && m.status === 'error') { self.status = 'error'; self.detail = 'subscription rejected — check the plan limits'; M.emit('rt:status', self); return; }
      if (m.event !== 'price' || !m.symbol) return;
      RT.feed(String(m.symbol).replace('/', ''), { px: +m.price, t: (m.timestamp || 0) * 1000 }, { name: 'Twelve Data', kind: 'tick' });
    };
    return ws;
  });
  openSock(s);
}

// --------------------------------------------------------------- pollers
// Where there is no stream there is a poll, on the tightest interval the tier
// allows. Each one reports what it covered so the Sources panel can show it.
const polls = RT.polls = {};
function poller(id, name, everyMs, fn, note) {
  const p = polls[id] = polls[id] || { id, name, status: 'off', detail: note || '', every: everyMs, last: 0, covered: 0, timer: null, want: true };
  p.run = async () => {
    if (!p.want || document.hidden) return;
    try {
      const n = await fn(p);
      p.covered = n || 0; p.last = Date.now();
      p.status = n ? 'live' : 'empty';
      if (!n && !p.detail) p.detail = 'answered but priced nothing';
    } catch (e) {
      p.status = 'error';
      p.detail = (e && e.message) || 'request failed';
    }
    M.emit('rt:status', p);
  };
  return p;
}
function startPoll(p) { if (p.timer) clearInterval(p.timer); p.run(); p.timer = setInterval(p.run, p.every); }

// Yahoo's chart endpoint is the widest keyless quote source. Whether a browser
// may read it depends on the headers Yahoo returns that day, so the failure is
// reported rather than hidden, and the proxy in Sources is the fallback.
const viaProxy = url => { const px = M.store.get('corsProxy', ''); return px ? px.replace('{url}', encodeURIComponent(url)) : null; };
async function getJSON(url, opt) {
  try { return await M.net.json(url, opt); }
  catch (e) {
    const p = viaProxy(url);
    if (!p) throw e;
    const txt = await M.net.text(p, opt);
    return JSON.parse(txt);
  }
}

function yahooPoll() {
  return poller('yahoo', 'Yahoo Finance — keyless quotes', 12000, async (p) => {
    const want = RT.priority().filter(i => ['stock', 'etf', 'index', 'future', 'fx'].includes(i.type)).slice(0, 14);
    if (!want.length) return 0;
    let ok = 0, failed = 0, lastErr = '';
    for (const inst of want) {
      try {
        const j = await getJSON('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(yahooSym(inst)) + '?interval=1m&range=1d', { timeout: 9000 });
        const r = j && j.chart && j.chart.result && j.chart.result[0];
        const m = r && r.meta; if (!m || !isFinite(m.regularMarketPrice)) continue;
        RT.feed(inst.sym, {
          px: m.regularMarketPrice, prev: m.chartPreviousClose || m.previousClose,
          hi: m.regularMarketDayHigh, lo: m.regularMarketDayLow, vol: m.regularMarketVolume
        }, { name: 'Yahoo', kind: 'poll', delay: 0 });
        ok++;
      } catch (e) { failed++; lastErr = e.message; }
    }
    if (!ok && failed) throw new Error('every request was refused (' + lastErr + ') — your browser is not allowed to read this host, so add a CORS proxy in Sources or use a key provider');
    p.detail = ok + ' of ' + want.length + ' symbols, refreshed every 12s';
    return ok;
  }, 'Keyless. Works only if your browser is allowed to read the response.');
}
// Yahoo's own symbology for the things that are not plain tickers.
const YMAP = { SPX: '^GSPC', NDX: '^NDX', DJI: '^DJI', RUT: '^RUT', VIX: '^VIX', TNX: '^TNX', DXY: 'DX-Y.NYB', N225: '^N225', FTSE: '^FTSE', DAX: '^GDAXI', HSI: '^HSI', SX5E: '^STOXX50E', 'BRK.B': 'BRK-B', GC: 'GC=F', SI: 'SI=F', CL: 'CL=F', BZ: 'BZ=F', NG: 'NG=F', HG: 'HG=F', PL: 'PL=F', ZC: 'ZC=F', ZW: 'ZW=F', ZS: 'ZS=F', KC: 'KC=F', ES: 'ES=F', NQ: 'NQ=F', YM: 'YM=F', RTY: 'RTY=F', ZB: 'ZB=F', ZN: 'ZN=F', US3M: '^IRX', US5Y: '^FVX', US10Y: '^TNX', US30Y: '^TYX', EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X', USDCHF: 'USDCHF=X', AUDUSD: 'AUDUSD=X', USDCAD: 'USDCAD=X', NZDUSD: 'NZDUSD=X', USDCNH: 'USDCNH=X', USDMXN: 'USDMXN=X', USDINR: 'USDINR=X', USDBRL: 'USDBRL=X', BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD' };
const yahooSym = inst => YMAP[inst.sym] || inst.sym;

// Stooq serves a plain CSV line per symbol and is a useful second opinion.
function stooqPoll() {
  return poller('stooq', 'Stooq — keyless quotes', 30000, async (p) => {
    const want = RT.priority().filter(i => i.type === 'stock' || i.type === 'etf').slice(0, 10);
    if (!want.length) return 0;
    const list = want.map(i => i.sym.toLowerCase().replace('.', '-') + '.us').join(',');
    const url = 'https://stooq.com/q/l/?s=' + list + '&f=sd2t2ohlcv&h&e=csv';
    let txt;
    try { txt = await M.net.text(url, { timeout: 10000 }); }
    catch (e) { const pr = viaProxy(url); if (!pr) throw e; txt = await M.net.text(pr, { timeout: 12000 }); }
    const lines = txt.trim().split('\n').slice(1);
    let ok = 0;
    for (const line of lines) {
      const c = line.split(',');
      const sym = (c[0] || '').replace(/\.US$/i, '').replace('-', '.').toUpperCase();
      const close = parseFloat(c[7]);
      if (!U.has(sym) || !isFinite(close)) continue;
      const inst = U.get(sym);
      if (inst.srcKind === 'tick' && RT.owned(inst)) continue;   // never overwrite a stream
      RT.feed(sym, { px: close, open: parseFloat(c[4]), hi: parseFloat(c[5]), lo: parseFloat(c[6]), vol: parseFloat(c[8]) }, { name: 'Stooq', kind: 'poll', delay: 15 });
      ok++;
    }
    if (ok) p.detail = ok + ' symbols, 30s refresh, end-of-interval close';
    return ok;
  }, 'Keyless CSV. Delayed, not a live tick.');
}

function geckoPoll() {
  return poller('gecko', 'CoinGecko — crypto fallback', 45000, async (p) => {
    const map = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', AVAX: 'avalanche-2', LINK: 'chainlink', DOT: 'polkadot', MATIC: 'matic-network', LTC: 'litecoin', UNI: 'uniswap', ATOM: 'cosmos' };
    // Only fill in what no socket is already covering.
    const need = Object.keys(map).filter(s => { const i = U.get(s); return i && !RT.owned(i); });
    if (!need.length) { p.detail = 'idle — the crypto sockets are covering everything'; return 0; }
    const j = await getJSON('https://api.coingecko.com/api/v3/simple/price?ids=' + need.map(s => map[s]).join(',') + '&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true', { timeout: 11000 });
    let ok = 0;
    for (const s of need) {
      const d = j[map[s]]; if (!d || !isFinite(d.usd)) continue;
      RT.feed(s, { px: d.usd, prev: d.usd / (1 + (d.usd_24h_change || 0) / 100), vol: d.usd_24h_vol }, { name: 'CoinGecko', kind: 'poll' });
      ok++;
    }
    p.detail = ok + ' coins filled in where no socket reached';
    return ok;
  }, 'Keyless. Fallback only.');
}

function fxPoll() {
  return poller('fx', 'ECB reference rates', 15 * 60000, async (p) => {
    const j = await getJSON('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,CHF,AUD,CAD,NZD,CNY,MXN,INR,BRL', { timeout: 10000 });
    const r = j && j.rates; if (!r) throw new Error('no rates in the payload');
    const put = (sym, v) => { if (isFinite(v)) { const i = U.get(sym); if (i && RT.owned(i) && i.srcKind === 'tick') return 0; RT.feed(sym, { px: v }, { name: 'ECB', kind: 'poll', delay: 1440 }); return 1; } return 0; };
    let n = 0;
    n += put('EURUSD', 1 / r.EUR); n += put('GBPUSD', 1 / r.GBP); n += put('USDJPY', r.JPY); n += put('USDCHF', r.CHF);
    n += put('AUDUSD', 1 / r.AUD); n += put('USDCAD', r.CAD); n += put('NZDUSD', 1 / r.NZD); n += put('USDCNH', r.CNY);
    n += put('USDMXN', r.MXN); n += put('USDINR', r.INR); n += put('USDBRL', r.BRL);
    p.detail = n + ' pairs at the ' + j.date + ' fix — a daily reference rate, not an intraday tick';
    return n;
  }, 'Keyless. One fix a day.');
}

function finnhubPoll() {
  return poller('finnhubrest', 'Finnhub — REST quotes', 20000, async (p) => {
    const key = M.keys.get('finnhub'); if (!key) { p.detail = 'no key'; p.status = 'off'; return 0; }
    const want = RT.priority().filter(i => (i.type === 'stock' || i.type === 'etf') && !RT.owned(i)).slice(0, 10);
    let ok = 0;
    for (const inst of want) {
      const j = await M.net.json('https://finnhub.io/api/v1/quote?symbol=' + encodeURIComponent(inst.sym.replace('.', '-')) + '&token=' + key, { timeout: 9000 });
      if (!j || !isFinite(j.c) || j.c === 0) continue;
      RT.feed(inst.sym, { px: j.c, prev: j.pc, open: j.o, hi: j.h, lo: j.l }, { name: 'Finnhub', kind: 'poll' });
      ok++;
    }
    p.detail = ok ? ok + ' symbols the socket had not covered' : 'the socket is covering everything';
    return ok;
  }, 'Needs a free key.');
}

// --------------------------------------------------------------- priority
// Free tiers are small, so spend them on what is actually on screen: the
// focused symbol first, then open positions, then the watchlist.
RT.priority = () => {
  const out = [], push = s => { const i = U.get(s); if (i && !out.includes(i)) out.push(i); };
  if (M.Sim.focus) push(M.Sim.focus.sym);
  (M.Portfolio ? M.Portfolio.positions : []).forEach(p => push(p.sym));
  (M.Portfolio ? M.Portfolio.watch : []).forEach(push);
  ['SPX', 'NDX', 'VIX', 'US10Y', 'BTC', 'GC', 'DXY', 'CL'].forEach(push);
  return out;
};

// --------------------------------------------------------------- summary
RT.summary = () => {
  const live = U.list.filter(i => RT.owned(i));
  const byProv = {};
  for (const i of live) byProv[i.srcName] = (byProv[i.srcName] || 0) + 1;
  const streams = Object.values(socks).filter(s => s.status === 'open').length;
  return {
    live: live.length, total: U.list.length, byProv, streams,
    tickRate: stats.rate,
    sockets: Object.values(socks),
    pollers: Object.values(polls),
    anyTick: live.some(i => i.srcKind === 'tick')
  };
};

// --------------------------------------------------------------- lifecycle
let started = false;
RT.start = () => {
  if (started) return; started = true;
  binance(); coinbase(); kraken();
  finnhubWS(); alpacaWS(); twelveWS();
  [yahooPoll(), stooqPoll(), geckoPoll(), fxPoll(), finnhubPoll()].forEach(startPoll);
  // Re-aim the equity stream whenever the watchlist or the focused symbol moves.
  const reaim = M.debounce(() => { const s = socks.finnhubws; if (s && s.ws && s.ws.readyState === 1 && s.subscribed) resubscribe(s, s.ws); }, 900);
  M.on('watch', reaim); M.on('focus', reaim);
  // A key being added or removed changes which providers exist at all.
  M.on('keys', () => { finnhubWS(); alpacaWS(); twelveWS(); });
  // Coming back to the tab should refresh immediately, not on the next interval.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) for (const id in polls) polls[id].run(); });
};
RT.refresh = () => { for (const id in polls) polls[id].run(); for (const id in socks) if (socks[id].status !== 'open') RT.startSock(id); };
})();
