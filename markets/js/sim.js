// ============================================================================
// TERMINAL — the market engine. When no provider is connected this generates
// the tape: a three-factor return model (market · sector · idiosyncratic) under
// a slow-moving regime, with session-aware volume, a depth book and a trade
// tape. Price history is built deterministically from the symbol, so a chart
// looks the same every time you open it.
//
// Everything it produces is flagged src:'sim'. providers.js overwrites the same
// fields with real prints where a feed exists, and the two live side by side.
// ============================================================================
'use strict';
(function () {
const S = M.Sim = {};
const U = M.Universe;
const YEARS = 2.2, DAYS = Math.round(252 * YEARS);

// ------------------------------------------------------------------ regime
// Four states with their own drift and vol multipliers. The chain is slow: a
// regime lasts weeks, not minutes, because that is the thing that actually
// makes a market feel real.
const REGIMES = {
  bull:   { name: 'Risk-On Expansion', drift: .085, vol: .82, breadth: .72, credit: -.18, tone: 'g' },
  chop:   { name: 'Range / Rotation', drift: .018, vol: 1.0, breadth: .50, credit: .02, tone: 'n' },
  bear:   { name: 'Risk-Off Contraction', drift: -.072, vol: 1.42, breadth: .30, credit: .44, tone: 'r' },
  crisis: { name: 'Liquidity Event', drift: -.26, vol: 2.65, breadth: .12, credit: 1.35, tone: 'r' }
};
S.REGIMES = REGIMES;
S.regime = M.store.get('regime', 'chop');
S.regimeSince = M.store.get('regimeSince', Date.now() - 864e5 * 9);

// Macro stress from the debt board tilts the chain: a fiscally stressed state
// does not forbid a bull market, it just makes the bad states stickier.
function regimeStep(dt) {
  const stress = M.Debt ? M.Debt.macro().stress : .4;
  const p = dt / 86400 * .22;                                   // ~22% chance of a draw per simulated day
  if (Math.random() > p) return;
  const r = Math.random();
  const to = { bull: ['bull', 'bull', 'chop', 'bear'], chop: ['chop', 'chop', 'bull', 'bear'], bear: ['bear', 'chop', 'crisis', 'bull'], crisis: ['crisis', 'bear', 'bear', 'chop'] }[S.regime];
  let next = to[Math.floor(r * to.length)];
  if (stress > .62 && next === 'bull' && Math.random() < stress) next = 'chop';
  if (next !== S.regime) {
    S.regime = next; S.regimeSince = Date.now();
    M.store.set('regime', next); M.store.set('regimeSince', S.regimeSince);
    M.emit('regime', next);
  }
}
S.regimeInfo = () => Object.assign({ id: S.regime, since: S.regimeSince }, REGIMES[S.regime]);

// ------------------------------------------------------------------ session
// US cash session in the browser's own clock, converted from New York.
S.session = (d) => {
  d = d || new Date();
  const ny = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = ny.getDay(), mins = ny.getHours() * 60 + ny.getMinutes();
  if (day === 0 || day === 6) return { id: 'closed', name: 'Weekend — closed', open: false, mult: .04 };
  if (mins < 240) return { id: 'closed', name: 'Closed', open: false, mult: .03 };
  if (mins < 570) return { id: 'pre', name: 'Pre-market', open: false, mult: .22 };
  if (mins < 600) return { id: 'open', name: 'Opening auction', open: true, mult: 2.6 };
  if (mins < 720) return { id: 'morning', name: 'Regular hours', open: true, mult: 1.25 };
  if (mins < 870) return { id: 'midday', name: 'Regular hours — midday', open: true, mult: .72 };
  if (mins < 955) return { id: 'afternoon', name: 'Regular hours', open: true, mult: 1.1 };
  if (mins < 960) return { id: 'close', name: 'Closing auction', open: true, mult: 3.1 };
  if (mins < 1200) return { id: 'post', name: 'After hours', open: false, mult: .26 };
  return { id: 'closed', name: 'Closed', open: false, mult: .03 };
};

// ------------------------------------------------------------------ factors
// One market factor, one factor per sector. Both are Ornstein–Uhlenbeck so they
// wander and revert rather than drifting off to nothing.
const factors = { mkt: 0 };
for (const s of Object.keys(U.SECTOR)) factors['s:' + s] = 0;
for (const s of ['Indices', 'Digital Assets', 'Currencies', 'Fixed Income', 'Energy', 'Metals', 'Agriculture', 'Rates', 'Volatility']) factors['s:' + s] = 0;
S.factors = factors;

const sectorBeta = { 'Technology': 1.22, 'Communication': 1.10, 'Consumer Discretionary': 1.16, 'Consumer Staples': .58, 'Healthcare': .74, 'Financials': 1.14, 'Energy': .92, 'Materials': 1.02, 'Industrials': 1.06, 'Utilities': .52, 'Real Estate': .96, 'Digital Assets': 2.3, 'Fixed Income': -.22, 'Currencies': .12, 'Indices': 1 };

// ------------------------------------------------------------------ history
// Daily candles built backwards from today's price so the last close lines up
// with the quote. Deterministic per symbol.
function buildDaily(inst, n) {
  const rnd = M.rng('hist:' + inst.sym), out = [];
  const beta = (inst.f && inst.f.beta) || 1;
  const annVol = inst.type === 'crypto' ? .72 : inst.type === 'fx' ? .09 : inst.type === 'bond' ? .07 : inst.type === 'future' ? (inst.sector === 'Volatility' ? 1.1 : .28) : M.clamp(.17 * Math.abs(beta) + .06, .08, .95);
  const dVol = annVol / Math.sqrt(252);
  const drift = (inst.type === 'bond' ? .005 : inst.type === 'fx' ? 0 : .07) / 252;
  // Walk backwards, then flip: guarantees the series ends exactly at inst.px.
  let px = inst.px;
  const rows = [];
  // A couple of regime blocks per history so charts have real trends in them.
  const blocks = [];
  for (let t = 0, k = 0; t < n; k++) { const len = 25 + Math.floor(rnd() * 70); blocks.push({ to: Math.min(n, t + len), mu: (rnd() - .42) * 3.1, sg: .65 + rnd() * 1.5 }); t += len; }
  let bi = 0;
  for (let i = 0; i < n; i++) {
    while (bi < blocks.length - 1 && i >= blocks[bi].to) bi++;
    const b = blocks[bi];
    const ret = drift * b.mu + dVol * b.sg * M.gauss(rnd);
    const prevPx = px / Math.exp(ret);
    const rng = Math.abs(dVol * b.sg * (0.9 + rnd() * 1.5)) * px;
    const o = prevPx, c = px;
    const hi = Math.max(o, c) + rng * rnd() * .8;
    const lo = Math.min(o, c) - rng * rnd() * .8;
    const base = inst.type === 'crypto' ? 4.2e4 : inst.f && inst.f.mcap ? Math.sqrt(inst.f.mcap) * 1.6 : 2.4e6;
    rows.push({ o, h: hi, l: Math.max(lo, 0.0001), c, v: Math.round(base * (0.55 + rnd() * 1.5) * (1 + Math.abs(ret) * 22)) });
    px = prevPx;
  }
  rows.reverse();
  // Stamp dates on trading days only, ending today.
  let d = new Date(); d.setHours(16, 0, 0, 0);
  const stamps = [];
  while (stamps.length < n) { const wd = d.getDay(); if (wd !== 0 && wd !== 6) stamps.push(d.getTime()); d = new Date(d.getTime() - 864e5); }
  stamps.reverse();
  for (let i = 0; i < n; i++) { rows[i].t = stamps[i]; out.push(rows[i]); }
  return out;
}

// Intraday minutes for the sessions we can plausibly show, folded out of the
// daily bar so the two timeframes never disagree about the day's range.
function buildMinutes(inst, sessions) {
  const daily = S.history(inst, '1D');
  const rnd = M.rng('min:' + inst.sym);
  const out = [];
  const take = daily.slice(-sessions);
  for (const day of take) {
    const n = 390, step = (day.c - day.o) / n;
    let px = day.o;
    const span = Math.max(1e-9, day.h - day.l);
    const start = new Date(day.t); start.setHours(9, 30, 0, 0);
    for (let i = 0; i < n; i++) {
      const o = px;
      const noise = span * .09 * M.gauss(rnd);
      px = M.clamp(px + step + noise, day.l, day.h);
      const w = span * .045 * rnd();
      out.push({ t: start.getTime() + i * 60000, o, h: Math.max(o, px) + w, l: Math.min(o, px) - w, c: px, v: Math.round(day.v / n * (0.4 + rnd() * 2.2) * (i < 30 || i > 360 ? 2.1 : 1)) });
    }
    // Force the last minute to the daily close so the series is consistent.
    if (out.length) { const last = out[out.length - 1]; last.c = day.c; last.h = Math.max(last.h, day.c); last.l = Math.min(last.l, day.c); }
  }
  return out;
}

const cache = new Map();
// tf: 1m 5m 15m 1h 1D 1W 1M
S.history = (inst, tf) => {
  const key = inst.sym + ':' + tf;
  if (cache.has(key)) return cache.get(key);
  let rows;
  if (tf === '1D') rows = buildDaily(inst, DAYS);
  else if (tf === '1m') rows = buildMinutes(inst, 6);
  else if (tf === '5m' || tf === '15m' || tf === '1h') rows = agg(S.history(inst, '1m'), { '5m': 5, '15m': 15, '1h': 60 }[tf]);
  else if (tf === '1W') rows = agg(S.history(inst, '1D'), 5);
  else if (tf === '1M') rows = agg(S.history(inst, '1D'), 21);
  else rows = S.history(inst, '1D');
  cache.set(key, rows);
  return rows;
};
S.invalidate = inst => { for (const k of [...cache.keys()]) if (k.startsWith(inst.sym + ':')) cache.delete(k); };

function agg(src, n) {
  const out = [];
  for (let i = 0; i < src.length; i += n) {
    const chunk = src.slice(i, i + n); if (!chunk.length) break;
    out.push({ t: chunk[0].t, o: chunk[0].o, h: Math.max(...chunk.map(c => c.h)), l: Math.min(...chunk.map(c => c.l)), c: chunk[chunk.length - 1].c, v: chunk.reduce((a, c) => a + c.v, 0) });
  }
  return out;
}
S.agg = agg;

// ------------------------------------------------------------------ seed state
// Each instrument starts the session with a plausible open, high and low taken
// from its own history, so the quote row is populated before the first tick.
for (const inst of U.list) {
  const r = M.rng('open:' + inst.sym);
  const vol = inst.type === 'crypto' ? .035 : inst.type === 'fx' ? .004 : inst.type === 'bond' ? .006 : .013;
  inst.prev = inst.px / (1 + M.gauss(r) * vol);
  inst.open = inst.prev * (1 + M.gauss(r) * vol * .4);
  inst.hi = Math.max(inst.px, inst.open) * (1 + Math.abs(M.gauss(r)) * vol * .5);
  inst.lo = Math.min(inst.px, inst.open) * (1 - Math.abs(M.gauss(r)) * vol * .5);
  inst.vol = Math.round((inst.f && inst.f.mcap ? Math.sqrt(inst.f.mcap) * 1.4 : 2e6) * (0.5 + r()));
  inst.chg = inst.px - inst.prev;
  inst.chgPct = inst.prev ? inst.chg / inst.prev * 100 : 0;
  inst.spread = Math.max(0.01, inst.px * (inst.type === 'crypto' ? .0004 : inst.type === 'fx' ? .00006 : .0002));
  inst.bid = inst.px - inst.spread / 2; inst.ask = inst.px + inst.spread / 2;
}

// ------------------------------------------------------------------ shocks
// News, earnings and macro prints land here. A shock decays over its horizon;
// several can overlap on one name.
const shocks = [];
S.shock = (sym, pct, horizonMs, reason) => {
  const inst = U.get(sym); if (!inst) return;
  shocks.push({ sym: inst.sym, left: pct / 100, decay: horizonMs || 9e5, born: Date.now(), reason: reason || '' });
  M.emit('shock', { sym: inst.sym, pct, reason });
};
S.shockSector = (sector, pct, horizonMs, reason) => {
  for (const i of (U.sectors[sector] || [])) S.shock(i.sym, pct * (0.5 + Math.random()), horizonMs, reason);
};
S.activeShocks = () => shocks.slice();

// ------------------------------------------------------------------ tick
let acc = 0;
const BOOK_LEVELS = 12;

function tickOne(inst, dt, sess) {
  if (inst.src === 'live') return;                               // a real feed owns this symbol
  const f = inst.f || {}, beta = f.beta == null ? 1 : f.beta;
  const sb = sectorBeta[inst.sector] == null ? 1 : sectorBeta[inst.sector];
  const reg = REGIMES[S.regime];
  const annVol = inst.type === 'crypto' ? .72 : inst.type === 'fx' ? .085 : inst.type === 'bond' ? .065 : inst.type === 'future' ? (inst.sector === 'Volatility' ? 1.2 : .28) : M.clamp(.17 * Math.abs(beta) + .06, .08, .95);
  const secVol = annVol * reg.vol * sess.mult;
  const perSec = secVol / Math.sqrt(252 * 23400);                // one trading year in seconds
  const rnd = Math.random;
  const idio = M.gauss(rnd) * perSec * .72;
  const sysMkt = factors.mkt * beta * perSec * .9;
  const sysSec = (factors['s:' + inst.sector] || 0) * sb * perSec * .6;
  const driftPerSec = reg.drift / (252 * 23400) * (inst.type === 'bond' ? .12 : 1);

  // Shocks: pull out this name's live share and bleed it off.
  let sh = 0;
  for (let i = shocks.length - 1; i >= 0; i--) {
    const s = shocks[i]; if (s.sym !== inst.sym) continue;
    const take = s.left * M.clamp(dt * 1000 / s.decay * 3.2, 0, 1);
    s.left -= take; sh += take;
    if (Math.abs(s.left) < 1e-5 || Date.now() - s.born > s.decay * 2) shocks.splice(i, 1);
  }

  const ret = (idio + sysMkt + sysSec) * Math.sqrt(dt) + driftPerSec * dt + sh;
  const next = Math.max(inst.px * .55, inst.px * (1 + ret));
  inst.px = inst.type === 'fx' ? next : inst.type === 'bond' ? M.clamp(next, .02, 22) : next;
  inst.hi = Math.max(inst.hi, inst.px); inst.lo = Math.min(inst.lo, inst.px);
  inst.chg = inst.px - inst.prev;
  inst.chgPct = inst.prev ? inst.chg / inst.prev * 100 : 0;
  inst.spread = Math.max(inst.type === 'fx' ? 1e-5 : 0.01, inst.px * (inst.type === 'crypto' ? .0004 : inst.type === 'fx' ? .00006 : .00018) * (1 + reg.credit * .5));
  inst.bid = inst.px - inst.spread / 2; inst.ask = inst.px + inst.spread / 2;
  const addVol = Math.round((f.mcap ? Math.sqrt(f.mcap) * .00035 : 420) * sess.mult * (0.4 + Math.random() * 1.6) * dt * 60);
  inst.vol += addVol;
  inst.last = Date.now();
  if (inst.f && inst.f.eps > 0) { inst.f.pe = inst.px / inst.f.eps; inst.f.mcap = inst.px * inst.f.shares; }
  return addVol;
}

// Depth and tape are only kept for the symbol being looked at — building a book
// for 280 instruments every tick would be pure waste.
S.focus = null;
S.setFocus = sym => { const i = U.get(sym); S.focus = i || null; if (i && !i.book) i.book = { bids: [], asks: [] }; };

function buildBook(inst) {
  const b = inst.book || (inst.book = { bids: [], asks: [] });
  const step = Math.max(inst.spread, inst.px * .00012);
  const base = inst.type === 'crypto' ? 1.8 : inst.f && inst.f.mcap > 1e11 ? 2400 : 480;
  b.bids.length = 0; b.asks.length = 0;
  let cb = 0, ca = 0;
  for (let i = 0; i < BOOK_LEVELS; i++) {
    const sz = Math.round(base * (0.4 + Math.random() * 1.8) * (1 + i * .45));
    const sz2 = Math.round(base * (0.4 + Math.random() * 1.8) * (1 + i * .45));
    cb += sz; ca += sz2;
    b.bids.push({ p: inst.bid - i * step, s: sz, c: cb });
    b.asks.push({ p: inst.ask + i * step, s: sz2, c: ca });
  }
  b.imbalance = (cb - ca) / (cb + ca);
}

function tape(inst, vol) {
  if (!vol) return;
  const n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const side = Math.random() < .5 + (inst.book ? inst.book.imbalance * .25 : 0) ? 'B' : 'S';
    inst.tape.unshift({ t: Date.now(), p: side === 'B' ? inst.ask : inst.bid, s: Math.max(1, Math.round(vol / n * (0.2 + Math.random() * 1.6))), side });
  }
  if (inst.tape.length > 220) inst.tape.length = 220;
}

// Roll the intraday series so the chart grows while you watch it.
function rollMinute(inst) {
  const rows = cache.get(inst.sym + ':1m'); if (!rows || !rows.length) return;
  const now = Date.now(), m = Math.floor(now / 60000) * 60000;
  const last = rows[rows.length - 1];
  if (last.t === m) { last.c = inst.px; last.h = Math.max(last.h, inst.px); last.l = Math.min(last.l, inst.px); last.v += 1; }
  else if (m > last.t) {
    rows.push({ t: m, o: inst.px, h: inst.px, l: inst.px, c: inst.px, v: 1 });
    if (rows.length > 3000) rows.shift();
    for (const tf of ['5m', '15m', '1h']) cache.delete(inst.sym + ':' + tf);
  }
}

S.start = () => {
  M.frame((now, dt) => {
    acc += dt;
    if (acc < 0.25) return;                                      // 4 Hz is plenty; the DOM is the bottleneck
    const step = acc; acc = 0;
    const sess = S.session();
    S.sess = sess;
    regimeStep(step);
    // Factors revert toward zero and get re-kicked.
    const theta = 0.08;
    for (const k in factors) factors[k] += -theta * factors[k] * step + M.gauss(Math.random) * Math.sqrt(step) * .9;
    for (const inst of U.list) {
      const v = tickOne(inst, step, sess);
      if (inst === S.focus) { buildBook(inst); tape(inst, v); rollMinute(inst); }
    }
    M.emit('tick', step);
  });
};

// ------------------------------------------------------------------ derived reads
// Breadth, the advance/decline line and sector performance — what a trader
// actually glances at to know whether a move is real.
S.breadth = () => {
  const st = U.ofType('stock');
  let up = 0, dn = 0, flat = 0, sum = 0, w = 0;
  for (const i of st) { if (i.chgPct > .05) up++; else if (i.chgPct < -.05) dn++; else flat++; const mc = (i.f && i.f.mcap) || 1; sum += i.chgPct * mc; w += mc; }
  return { up, dn, flat, total: st.length, ratio: dn ? up / dn : up, capWeighted: w ? sum / w : 0, equalWeighted: st.reduce((a, i) => a + i.chgPct, 0) / Math.max(1, st.length) };
};
S.sectorPerf = () => Object.keys(U.SECTOR).map(s => {
  const list = (U.sectors[s] || []).filter(i => i.type === 'stock');
  let sum = 0, w = 0;
  for (const i of list) { const mc = (i.f && i.f.mcap) || 1; sum += i.chgPct * mc; w += mc; }
  return { sector: s, chgPct: w ? sum / w : 0, count: list.length, members: list };
}).sort((a, b) => b.chgPct - a.chgPct);
S.movers = (n = 10) => {
  const st = U.list.filter(i => i.type === 'stock' || i.type === 'crypto');
  const by = [...st].sort((a, b) => b.chgPct - a.chgPct);
  return { gainers: by.slice(0, n), losers: by.slice(-n).reverse(), active: [...st].sort((a, b) => (b.vol * b.px) - (a.vol * a.px)).slice(0, n) };
};
// Realised vol off daily closes — the input to every risk number downstream.
S.realisedVol = (inst, days = 20) => {
  const h = S.history(inst, '1D').slice(-(days + 1));
  if (h.length < 3) return 0;
  const rets = []; for (let i = 1; i < h.length; i++) rets.push(Math.log(h[i].c / h[i - 1].c));
  const m = rets.reduce((a, b) => a + b, 0) / rets.length;
  return Math.sqrt(rets.reduce((a, b) => a + (b - m) ** 2, 0) / (rets.length - 1) * 252) * 100;
};
S.maxDrawdown = (inst, days = 252) => {
  const h = S.history(inst, '1D').slice(-days);
  let peak = -Infinity, mdd = 0;
  for (const c of h) { peak = Math.max(peak, c.c); mdd = Math.min(mdd, c.c / peak - 1); }
  return mdd * 100;
};
S.ret = (inst, days) => {
  const h = S.history(inst, '1D');
  if (h.length < days + 1) return 0;
  const a = h[h.length - 1 - days].c, b = h[h.length - 1].c;
  return (b / a - 1) * 100;
};
// Correlation of daily returns, used by the portfolio risk read.
S.corr = (a, b, days = 120) => {
  const ha = S.history(a, '1D').slice(-days), hb = S.history(b, '1D').slice(-days);
  const n = Math.min(ha.length, hb.length); if (n < 20) return 0;
  const ra = [], rb = [];
  for (let i = 1; i < n; i++) { ra.push(Math.log(ha[i].c / ha[i - 1].c)); rb.push(Math.log(hb[i].c / hb[i - 1].c)); }
  const ma = ra.reduce((x, y) => x + y, 0) / ra.length, mb = rb.reduce((x, y) => x + y, 0) / rb.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < ra.length; i++) { const x = ra[i] - ma, y = rb[i] - mb; num += x * y; da += x * x; db += y * y; }
  return da && db ? num / Math.sqrt(da * db) : 0;
};
})();
