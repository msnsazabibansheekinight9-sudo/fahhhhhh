// ============================================================================
// TERMINAL — core. Namespace, persistence, event bus, number formatting,
// deterministic RNG and small DOM helpers. Everything else hangs off window.M.
// Nothing here knows about markets; it is the plumbing the rest sits on.
// ============================================================================
'use strict';
const M = window.M = { ver: '1.0', boot: Date.now() };

// ------------------------------------------------------------------ storage
M.store = {
  get(k, d) { try { const v = localStorage.getItem('terminal.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('terminal.' + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem('terminal.' + k); } catch (e) {} },
  keys() { try { return Object.keys(localStorage).filter(k => k.startsWith('terminal.')).map(k => k.slice(9)); } catch (e) { return []; } }
};

// ------------------------------------------------------------------ event bus
const subs = new Map();
M.on = (ev, fn) => { if (!subs.has(ev)) subs.set(ev, new Set()); subs.get(ev).add(fn); return () => M.off(ev, fn); };
M.off = (ev, fn) => { const s = subs.get(ev); if (s) s.delete(fn); };
M.emit = (ev, data) => { const s = subs.get(ev); if (!s) return; for (const fn of [...s]) { try { fn(data); } catch (e) { console.warn('[bus]', ev, e); } } };

// ------------------------------------------------------------------ deterministic RNG
// mulberry32 off a string hash: the same ticker always gets the same numbers,
// so a reload never silently rewrites a company's fundamentals.
M.hash = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
M.rng = seed => { let a = (typeof seed === 'string' ? M.hash(seed) : seed) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
// Normal deviate from a uniform source (Box–Muller, cached pair).
M.gauss = rnd => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
M.pick = (arr, rnd) => arr[Math.floor((rnd ? rnd() : Math.random()) * arr.length)];
M.clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
M.lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ formatting
const NF = new Intl.NumberFormat('en-US');
const nf = (d) => new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const NF2 = nf(2), NF1 = nf(1), NF0 = nf(0), NF4 = nf(4);
M.fmt = {
  int: v => NF0.format(Math.round(v || 0)),
  n: (v, d = 2) => nf(d).format(v || 0),
  // Price precision follows the magnitude, the way a real tape does.
  px: v => { v = +v || 0; const a = Math.abs(v); return a >= 1000 ? NF2.format(v) : a >= 1 ? NF2.format(v) : a >= 0.01 ? NF4.format(v) : v.toPrecision(4); },
  usd: v => '$' + NF0.format(Math.round(v || 0)),
  usd2: v => '$' + NF2.format(v || 0),
  // Compact money for caps and notionals: $1.24T, $880.5B, $12.0M.
  cap(v) { v = +v || 0; const s = v < 0 ? '-' : ''; const a = Math.abs(v);
    if (a >= 1e12) return s + '$' + NF2.format(a / 1e12) + 'T';
    if (a >= 1e9) return s + '$' + NF2.format(a / 1e9) + 'B';
    if (a >= 1e6) return s + '$' + NF2.format(a / 1e6) + 'M';
    if (a >= 1e3) return s + '$' + NF1.format(a / 1e3) + 'K';
    return s + '$' + NF2.format(a); },
  qty(v) { v = +v || 0; const a = Math.abs(v);
    if (a >= 1e9) return NF2.format(v / 1e9) + 'B';
    if (a >= 1e6) return NF2.format(v / 1e6) + 'M';
    if (a >= 1e3) return NF1.format(v / 1e3) + 'K';
    return NF0.format(v); },
  pct: (v, d = 2) => (v >= 0 ? '+' : '') + nf(d).format(v) + '%',
  pctRaw: (v, d = 1) => nf(d).format(v) + '%',
  sign: v => v > 0 ? 'up' : v < 0 ? 'down' : 'flat',
  // 40,340,991,409,885 — the debt-clock look.
  big: v => NF.format(Math.floor(v || 0)),
  bigUsd: v => '$' + NF.format(Math.floor(v || 0)),
  time(ts) { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0'); },
  hm(ts) { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); },
  date(ts) { const d = new Date(ts); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); },
  dayMon(ts) { const d = new Date(ts); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); },
  // "4m ago" / "2h ago" — news needs this everywhere.
  ago(ts) { const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return Math.floor(s) + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago'; },
  dur(ms) { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + 'h ' : '') + m + 'm'; }
};

// ------------------------------------------------------------------ DOM
M.el = (tag, attrs, kids) => {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'data' && typeof v === 'object') for (const d in v) e.dataset[d] = v[d];
    else e.setAttribute(k, v === true ? '' : v);
  }
  if (kids != null) for (const k of [].concat(kids)) { if (k == null || k === false) continue; e.appendChild(typeof k === 'object' ? k : document.createTextNode(String(k))); }
  return e;
};
M.$ = (sel, root) => (root || document).querySelector(sel);
M.$$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
M.clear = n => { while (n && n.firstChild) n.removeChild(n.firstChild); return n; };
M.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Write text only when it actually changed, and flash the cell green/red.
// Called for a few hundred cells a second on the debt board, so it has to be cheap.
M.setText = (node, txt, flash) => {
  if (!node || node.__t === txt) return false;
  const had = node.__t !== undefined;
  node.__t = txt; node.textContent = txt;
  if (flash && had) { node.classList.remove('tick-up', 'tick-dn'); void node.offsetWidth; node.classList.add(flash > 0 ? 'tick-up' : 'tick-dn'); }
  return true;
};

// ------------------------------------------------------------------ frame loop
// One rAF for the whole app; subscribers get (now, dtSeconds). Tabs that are
// hidden get skipped so a background terminal costs nothing.
const frames = new Set();
let last = performance.now(), running = false;
function loop(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  for (const fn of frames) { try { fn(now, dt); } catch (e) { console.warn('[frame]', e); } }
  if (running) requestAnimationFrame(loop);
}
M.frame = fn => { frames.add(fn); if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } return () => frames.delete(fn); };

// Throttle: for handlers that must not run every frame (re-layouts, saves).
M.throttle = (fn, ms) => { let t = 0, pend = null; return (...a) => { const now = Date.now(); if (now - t >= ms) { t = now; fn(...a); } else if (!pend) { pend = setTimeout(() => { pend = null; t = Date.now(); fn(...a); }, ms - (now - t)); } }; };
M.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// ------------------------------------------------------------------ net
// Every outbound call is wrapped: a timeout, a typed failure, and a note in the
// source ledger so the Sources panel can say exactly what is live and what is not.
M.net = {
  async json(url, opt = {}) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), opt.timeout || 9000);
    try {
      const r = await fetch(url, { signal: ctl.signal, headers: opt.headers, mode: 'cors', cache: opt.cache || 'default' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  },
  async text(url, opt = {}) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), opt.timeout || 9000);
    try { const r = await fetch(url, { signal: ctl.signal, mode: 'cors' }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); }
    finally { clearTimeout(t); }
  }
};

// ------------------------------------------------------------------ source ledger
// The honesty layer. Nothing in this app claims to be real unless a provider
// actually answered: each feed registers here and the UI badges every number
// LIVE or SIM from this ledger, never from a hard-coded label.
M.sources = {
  reg: {},
  declare(id, o) { this.reg[id] = Object.assign({ id, name: id, status: 'off', detail: '', kind: 'sim', url: '', last: 0, errors: 0 }, o); M.emit('sources', this.reg); return this.reg[id]; },
  set(id, status, detail) { const s = this.reg[id]; if (!s) return; s.status = status; if (detail !== undefined) s.detail = detail; if (status === 'live') { s.last = Date.now(); s.errors = 0; } if (status === 'error') s.errors++; M.emit('sources', this.reg); },
  live(id) { const s = this.reg[id]; return !!s && s.status === 'live'; },
  all() { return Object.values(this.reg); },
  // One word for the whole app: are we on real data at all?
  anyLive() { return this.all().some(s => s.status === 'live'); }
};

// ------------------------------------------------------------------ keys
// Provider keys live in localStorage only. They are never sent anywhere except
// to the provider whose key it is.
M.keys = {
  get(p) { return M.store.get('key.' + p, ''); },
  set(p, v) { v = String(v || '').trim(); if (v) M.store.set('key.' + p, v); else M.store.del('key.' + p); M.emit('keys', p); },
  has(p) { return !!this.get(p); }
};

// ------------------------------------------------------------------ toast
M.toast = (msg, kind) => {
  let host = M.$('#toasts');
  if (!host) { host = M.el('div', { id: 'toasts' }); document.body.appendChild(host); }
  const t = M.el('div', { class: 'toast ' + (kind || ''), text: msg });
  host.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, kind === 'err' ? 5200 : 3200);
};
