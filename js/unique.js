// ============================================================================
// IRONSIGHT — every gun gets its own model. Many guns in the armory began as
// copies of a modelled relative (a Kar98k variant, an AKM clone…) and so looked
// exactly like it. This pass keeps each original model as it is and gives every
// copy its own look, worked out from the gun's id so it is the same every time:
// receiver and barrel proportions, magazine length and curve, muzzle device,
// sights, grip, stock, handguard length, wood, polymer colour and metal finish.
// Every change is taken from what other guns of the same action type and
// period really use, and nothing that drives the mechanism (action type, bolt
// handle, magazine type, special parts) is touched, so reloads, the bench and
// the inner workings stay correct.
// ============================================================================
'use strict';
(function () {
const G = window.G, W = G.WEAPONS;
const key = m => JSON.stringify(m);
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = seed => { let a = seed || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const r3 = v => Math.round(v * 1000) / 1000;
const SPECIAL = ['break', 'falling', 'musket', 'fpistol', 'cannon', 'mortar_old', 'gatling', 'puckle', 'hwacha', 'art'];

// what the real guns use, per action type: [value, year]
const POOL = {};
const note = (t, k, v, y) => { const P = POOL[t] = POOL[t] || {}; (P[k] = P[k] || []).push([v, y]); };
for (const w of W) {
  if (w.custom || w.psy || !w.m) continue; const m = w.m, t = m.t;
  for (const k of ['mz', 'sgt', 'wd', 'pl', 'mt']) if (m[k] !== undefined) note(t, k, m[k], w.y);
  for (const k of ['wd', 'mt']) if (m[k] !== undefined) note('*', k, m[k], w.y); // timber and metal finishes suit any gun of the period
  if (m.grip && !['none'].includes(m.grip)) note(t, 'grip', m.grip, w.y);
  if (m.stk && m.stk !== 'none') note(t, 'stk', m.stk, w.y);
}
// a value used by guns of this type within `span` years of this one (widening if nothing is that close)
function pick(t, k, y, cur, R) {
  const P = POOL[t] && POOL[t][k]; if (!P) return cur;
  for (const span of [15, 30, 60]) {
    const opts = [...new Set(P.filter(([, yy]) => Math.abs(yy - y) <= span).map(([v]) => JSON.stringify(v)))].filter(v => v !== JSON.stringify(cur));
    if (opts.length) return JSON.parse(opts[Math.floor(R() * opts.length)]);
  }
  return cur;
}

function vary(w, strength) {
  const m = w.m, t = m.t, R = rng(hash(w.id + ':' + strength)), j = a => 1 + (R() * 2 - 1) * a * strength;
  const chance = p => R() < Math.min(1, p * strength);
  if (m.R) m.R = [r3(m.R[0] * j(.08)), r3(m.R[1] * j(.08)), r3(m.R[2] * j(.06))];
  if (m.B && m.B.length >= 2 && !w.dataB) m.B = [r3(m.B[0] * j(.1)), +(m.B[1] * j(.08)).toFixed(4), ...m.B.slice(2)];
  if (m.hg && typeof m.hg[1] === 'number') { m.hg = m.hg.slice(); m.hg[1] = r3(m.hg[1] * j(.12)); }
  if (m.mag && ['box', 'pst', 'stick', 'curved'].includes(m.mag[0]) && typeof m.mag[1] === 'number') {
    m.mag = m.mag.slice(); m.mag[1] = r3(m.mag[1] * j(.1)); if (typeof m.mag[2] === 'number' && m.mag[2]) m.mag[2] = r3(m.mag[2] * j(.25));
  }
  if (SPECIAL.includes(t)) {
    // muskets, doubles, falling blocks, cannon: timber, metal, furniture and carriage size
    for (const k of ['wd', 'mt', 'pl']) if (m[k] !== undefined && chance(.6)) { const v = pick(t, k, w.y, m[k], R); m[k] = v !== m[k] || k === 'pl' ? v : pick('*', k, w.y, m[k], R); }
    if (m.B && m.B.length >= 2) m.B = [r3(m.B[0] * j(.1)), +(m.B[1] * j(.06)).toFixed(4), ...m.B.slice(2)];
    if (t === 'break' && typeof m.hammers === 'boolean' && chance(.4)) m.hammers = !m.hammers;
    if (t === 'break' && m.nb === 2 && ['sxs', 'ou'].includes(m.lay) && chance(.3)) m.lay = m.lay === 'sxs' ? 'ou' : 'sxs';
    if (typeof m.brass === 'boolean' && chance(.35)) m.brass = !m.brass;
    if (typeof m.bands === 'number' && m.bands > 0 && chance(.4)) m.bands = Math.max(1, Math.min(3, m.bands + (R() < .5 ? -1 : 1)));
    if (t === 'musket' && ['full', 'half'].includes(m.stock || 'full') && chance(.3)) m.stock = (m.stock || 'full') === 'full' ? 'half' : 'full';
    if (t === 'musket' && chance(.3)) m.patchbox = !m.patchbox;
    for (const k of ['shield', 'brake', 'spoked']) if (typeof m[k] === 'boolean' && chance(.35)) m[k] = !m[k];
    if (typeof m.cal === 'number' && t !== 'art') m.cal = r3(m.cal * j(.06));
    if (typeof m.wheel === 'number') m.wheel = r3(m.wheel * j(.1));
    if (typeof m.L === 'number') m.L = r3(m.L * j(.05));
    if (typeof m.rings === 'number' && chance(.5)) m.rings = Math.max(0, m.rings + (R() < .5 ? -1 : 1));
    return;
  }
  for (const [k, p] of [['mz', .55], ['sgt', .45], ['grip', .4], ['stk', .4], ['mt', .5], ['wd', .6], ['pl', .6]]) {
    if (m[k] === undefined || !chance(p)) continue;
    if (k === 'stk' && m.stk === 'none') continue;
    if (k === 'grip' && m.grip === 'none') continue;
    m[k] = pick(t, k, w.y, m[k], R);
  }
}

// how different two guns of the same type look: one point per visible feature, half a point
// for a clear change in proportions
const CAT = ['mz', 'sgt', 'grip', 'stk', 'mt', 'wd', 'pl', 'brass', 'bands', 'rings', 'hammers', 'lay', 'kind', 'nb', 'lock', 'stock', 'car', 'patchbox', 'shield', 'brake', 'spoked'];
const rel = (x, y) => x && y ? Math.abs(x - y) / Math.max(x, y) : 0;
function dist(a, b) {
  let d = 0; for (const k of CAT) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) d++;
  if (a.R && b.R && (rel(a.R[0], b.R[0]) > .04 || rel(a.R[1], b.R[1]) > .04)) d += .5;
  if (a.B && b.B && rel(a.B[0], b.B[0]) > .05) d += .5;
  if (a.L && b.L && rel(a.L, b.L) > .04) d += .5;
  if (a.cal && b.cal && rel(a.cal, b.cal) > .05) d += .5;
  if (a.mag && b.mag && typeof a.mag[1] === 'number' && rel(a.mag[1], b.mag[1]) > .06) d += .5;
  if (a.mag && b.mag && a.mag[0] !== b.mag[0]) d++;
  if (a.hg && b.hg && a.hg[0] !== b.hg[0]) d++;
  return d;
}
const NEED = 1.5;
const kept = {}; let changed = 0;
for (const w of W) {
  if (w.custom || !w.m) continue;
  const list = kept[w.m.t] = kept[w.m.t] || [];
  const near = m => list.reduce((lo, o) => Math.min(lo, dist(m, o)), 99);
  // the first gun of its kind keeps its model; the rest must look clearly different from everything before them
  if (near(w.m) >= NEED) { list.push(w.m); continue; }
  const m0 = JSON.parse(key(w.m)); let best = null, bd = -1;
  for (let s = 1; s <= 14; s++) {
    w.m = JSON.parse(JSON.stringify(m0)); vary(w, s <= 3 ? 1 : 1 + (s - 3) * .2);
    const d = near(w.m); if (d > bd) { bd = d; best = w.m; } if (d >= NEED) break;
  }
  w.m = best; list.push(w.m); changed++;
}
// and no two guns anywhere share exactly the same numbers
{ const seen = new Set(); for (const w of W) { if (w.custom || !w.m) continue; let k = key(w.m); for (let i = 1; seen.has(k) && w.m.R && i < 20; i++) { w.m.R = [r3(w.m.R[0] * 1.006), w.m.R[1], w.m.R[2]]; k = key(w.m); } seen.add(k); } }
G.N_UNIQUE = changed;
})();
