// ============================================================================
// TERMINAL — paper trading. Cash, positions, working orders, fills against the
// live tape, realised and unrealised P&L, a trade blotter and price alerts.
// Everything persists to this browser; nothing is sent anywhere.
//
// Fills are deliberately honest: a market order crosses the spread and pays
// slippage scaled to the order's size against displayed depth, because a paper
// account that always fills at the mid teaches the wrong lesson.
// ============================================================================
'use strict';
(function () {
const P = M.Portfolio = {};
const U = M.Universe;

const START_CASH = 100000;
P.cash = M.store.get('cash', START_CASH);
P.positions = M.store.get('positions', []);
P.orders = M.store.get('orders', []);
P.blotter = M.store.get('blotter', []);
P.alerts = M.store.get('alerts', []);
P.watch = M.store.get('watch', ['AAPL', 'MSFT', 'NVDA', 'SPY', 'TSLA', 'BTC', 'GLD', 'US10Y']);

const save = M.throttle(() => {
  M.store.set('cash', P.cash); M.store.set('positions', P.positions);
  M.store.set('orders', P.orders); M.store.set('blotter', P.blotter.slice(0, 400));
  M.store.set('alerts', P.alerts); M.store.set('watch', P.watch);
}, 1200);
P.save = save;

P.reset = () => {
  P.cash = START_CASH; P.positions = []; P.orders = []; P.blotter = []; 
  save(); M.emit('portfolio');
};

// ------------------------------------------------------------------ reads
P.find = sym => P.positions.find(p => p.sym === sym);
P.marketValue = () => P.positions.reduce((a, p) => { const i = U.get(p.sym); return a + (i ? p.qty * i.px : 0); }, 0);
P.equity = () => P.cash + P.marketValue();
P.unrealised = () => P.positions.reduce((a, p) => { const i = U.get(p.sym); return a + (i ? (i.px - p.avg) * p.qty : 0); }, 0);
P.realised = () => P.blotter.reduce((a, b) => a + (b.realised || 0), 0);
P.dayPnl = () => P.positions.reduce((a, p) => { const i = U.get(p.sym); return a + (i ? (i.px - i.prev) * p.qty : 0); }, 0);
P.exposure = () => { const mv = P.marketValue(), eq = P.equity(); return { gross: P.positions.reduce((a, p) => { const i = U.get(p.sym); return a + Math.abs(i ? p.qty * i.px : 0); }, 0), net: mv, pctInvested: eq ? mv / eq * 100 : 0 }; };
P.posView = () => P.positions.map(p => {
  const i = U.get(p.sym); if (!i) return null;
  const v = p.qty * i.px, pl = (i.px - p.avg) * p.qty;
  return { ...p, inst: i, px: i.px, value: v, pl, plPct: p.avg ? (i.px / p.avg - 1) * 100 * Math.sign(p.qty) : 0, day: (i.px - i.prev) * p.qty, weight: P.marketValue() ? v / P.marketValue() * 100 : 0 };
}).filter(Boolean);

// ------------------------------------------------------------------ fills
// Slippage model: cross the spread, then add an impact term that grows with
// the order's size relative to the visible top-of-book.
function fillPrice(inst, side, qty) {
  const half = (inst.spread || inst.px * .0002) / 2;
  const topSize = inst.book && inst.book.bids.length ? (side === 'buy' ? inst.book.asks[0].s : inst.book.bids[0].s) : Math.max(100, inst.vol / 4000);
  const impact = M.clamp(Math.sqrt(Math.abs(qty) / Math.max(1, topSize)) * .0006, 0, .02);
  return side === 'buy' ? inst.px + half + inst.px * impact : inst.px - half - inst.px * impact;
}
P.quoteFill = (sym, side, qty) => { const i = U.get(sym); return i ? fillPrice(i, side, qty) : 0; };

function blot(row) { P.blotter.unshift(Object.assign({ t: Date.now() }, row)); if (P.blotter.length > 400) P.blotter.length = 400; }

// side: 'buy' | 'sell'. Shorting is allowed; a sell beyond the holding opens one.
P.execute = (sym, side, qty, opts = {}) => {
  const inst = U.get(sym);
  if (!inst) return { ok: false, err: 'Unknown symbol' };
  qty = Math.abs(+qty);
  if (!qty || !isFinite(qty)) return { ok: false, err: 'Quantity must be a positive number' };
  const px = opts.px || fillPrice(inst, side, qty);
  const notional = px * qty;
  const fee = Math.max(0, notional * 0.00008);                  // a realistic all-in cost, not zero
  const signed = side === 'buy' ? qty : -qty;

  if (side === 'buy' && notional + fee > P.cash + 1e-9 && !opts.allowMargin) return { ok: false, err: `Not enough cash. Need ${M.fmt.cap(notional + fee)}, have ${M.fmt.cap(P.cash)}.` };

  let pos = P.find(sym);
  let realised = 0;
  if (!pos) { pos = { sym, qty: 0, avg: 0, opened: Date.now() }; P.positions.push(pos); }
  const before = pos.qty;
  if (before === 0 || Math.sign(before) === Math.sign(signed)) {
    // Adding to, or opening, a position: weighted average cost.
    pos.avg = (pos.avg * Math.abs(before) + px * qty) / (Math.abs(before) + qty);
    pos.qty = before + signed;
  } else {
    // Closing against an existing position: realise P&L on the closed part.
    const closing = Math.min(Math.abs(before), qty);
    realised = (px - pos.avg) * closing * Math.sign(before) - fee;
    pos.qty = before + signed;
    if (Math.sign(pos.qty) !== Math.sign(before) && pos.qty !== 0) pos.avg = px;   // flipped through zero
  }
  P.cash -= signed * px + fee;
  if (Math.abs(pos.qty) < 1e-9) P.positions = P.positions.filter(x => x !== pos);
  blot({ sym, side, qty, px, notional, fee, realised, kind: opts.kind || 'market', note: opts.note || '' });
  save(); M.emit('portfolio'); M.emit('fill', { sym, side, qty, px, realised });
  return { ok: true, px, qty, realised, fee };
};

// ------------------------------------------------------------------ working orders
P.place = (o) => {
  const inst = U.get(o.sym); if (!inst) return { ok: false, err: 'Unknown symbol' };
  if (o.type === 'market') return P.execute(o.sym, o.side, o.qty, { kind: 'market' });
  const order = { id: 'o' + Date.now() + Math.floor(Math.random() * 999), t: Date.now(), status: 'working', ...o };
  P.orders.unshift(order); save(); M.emit('portfolio');
  return { ok: true, order };
};
P.cancel = id => { const o = P.orders.find(x => x.id === id); if (o) { o.status = 'cancelled'; o.closed = Date.now(); } save(); M.emit('portfolio'); };
P.clearDone = () => { P.orders = P.orders.filter(o => o.status === 'working'); save(); M.emit('portfolio'); };

// Working orders and alerts are checked on every tick batch.
function sweep() {
  let changed = false;
  for (const o of P.orders) {
    if (o.status !== 'working') continue;
    const i = U.get(o.sym); if (!i) continue;
    let hit = false;
    if (o.type === 'limit') hit = o.side === 'buy' ? i.px <= o.limit : i.px >= o.limit;
    else if (o.type === 'stop') hit = o.side === 'buy' ? i.px >= o.stop : i.px <= o.stop;
    else if (o.type === 'stoplimit') hit = (o.side === 'buy' ? i.px >= o.stop : i.px <= o.stop);
    if (!hit) continue;
    const px = o.type === 'limit' ? o.limit : undefined;
    const r = P.execute(o.sym, o.side, o.qty, { px, kind: o.type, note: 'Triggered ' + o.type });
    o.status = r.ok ? 'filled' : 'rejected'; o.closed = Date.now(); o.err = r.err; o.fillPx = r.px;
    changed = true;
    if (r.ok) M.toast(`${o.type} ${o.side} ${o.qty} ${o.sym} filled at ${M.fmt.px(r.px)}`, 'ok');
    else M.toast(`${o.sym} ${o.type} rejected: ${r.err}`, 'err');
  }
  for (const a of P.alerts) {
    if (a.fired) continue;
    const i = U.get(a.sym); if (!i) continue;
    const hit = a.dir === 'above' ? i.px >= a.px : i.px <= a.px;
    if (hit) { a.fired = Date.now(); changed = true; M.toast(`${a.sym} ${a.dir} ${M.fmt.px(a.px)} — now ${M.fmt.px(i.px)}`, 'alert'); M.emit('alert', a); }
  }
  if (changed) { save(); M.emit('portfolio'); }
}

// ------------------------------------------------------------------ watchlist & alerts
P.toggleWatch = sym => {
  sym = String(sym).toUpperCase();
  const i = P.watch.indexOf(sym);
  if (i >= 0) P.watch.splice(i, 1); else P.watch.push(sym);
  save(); M.emit('watch'); return i < 0;
};
P.isWatched = sym => P.watch.includes(String(sym).toUpperCase());
P.addAlert = (sym, px, dir) => { P.alerts.unshift({ id: 'a' + Date.now(), sym, px: +px, dir: dir || (U.get(sym) && U.get(sym).px < px ? 'above' : 'below'), t: Date.now() }); save(); M.emit('portfolio'); };
P.removeAlert = id => { P.alerts = P.alerts.filter(a => a.id !== id); save(); M.emit('portfolio'); };

// ------------------------------------------------------------------ equity curve
// Sampled once a minute so the performance tab has something true to draw.
P.curve = M.store.get('curve', []);
function sample() {
  const eq = P.equity();
  const last = P.curve[P.curve.length - 1];
  if (last && Date.now() - last.t < 55000) return;
  P.curve.push({ t: Date.now(), v: eq });
  if (P.curve.length > 4000) P.curve.shift();
  M.store.set('curve', P.curve);
}
P.stats = () => {
  if (P.curve.length < 3) return null;
  const v = P.curve.map(c => c.v), rets = [];
  for (let i = 1; i < v.length; i++) if (v[i - 1] > 0) rets.push(v[i] / v[i - 1] - 1);
  if (!rets.length) return null;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length) || 1e-9;
  const perYear = 252 * 390;                                   // samples are roughly per minute of session
  let peak = -Infinity, mdd = 0;
  for (const x of v) { peak = Math.max(peak, x); mdd = Math.min(mdd, x / peak - 1); }
  const wins = P.blotter.filter(b => b.realised > 0), losses = P.blotter.filter(b => b.realised < 0);
  const avgWin = wins.length ? wins.reduce((a, b) => a + b.realised, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b.realised, 0) / losses.length : 0;
  return {
    total: (v[v.length - 1] / START_CASH - 1) * 100,
    sharpe: sd ? mean / sd * Math.sqrt(perYear) : 0,
    vol: sd * Math.sqrt(perYear) * 100,
    mdd: mdd * 100,
    trades: P.blotter.length,
    winRate: wins.length + losses.length ? wins.length / (wins.length + losses.length) * 100 : 0,
    avgWin, avgLoss,
    // Van Tharp's expectancy: what one unit of risk returns on average.
    expectancy: (wins.length + losses.length) ? (wins.length * avgWin + losses.length * avgLoss) / (wins.length + losses.length) : 0,
    profitFactor: losses.length && avgLoss ? Math.abs(wins.reduce((a, b) => a + b.realised, 0) / losses.reduce((a, b) => a + b.realised, 0)) : 0
  };
};

P.start = () => {
  M.on('tick', () => { sweep(); sample(); });
  sample();
};
})();
