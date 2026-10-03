// ============================================================================
// IRONSIGHT — weapon workshop. Players design their own guns two ways:
//   merge   – pick two or more real weapons; the result keeps each donor's
//             strongest trait (hardest-hitting cartridge, fastest cyclic rate,
//             biggest magazine, tightest group, softest recoil, every special
//             mechanic) on a body assembled from the donors' parts
//   scratch – a full editor over every model part the armory uses, every
//             mechanic (action, fire modes, rate, calibre, ballistics, recoil)
//             and special mechanic (spin-up, coil charge, salvo, explosive,
//             seeker, incendiary …), plus workshop-only parts no real gun has
// Players can also design their own attachments. Everything is saved in
// localStorage ('ironsight.custom') and registered as ordinary weapons of the
// "Workshop" era, so they work in the armory, range, missions, battlefield,
// extraction and on the handling bench.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const KEY = 'ironsight.custom';

G.ERAS.push({ id: 'custom', name: 'Workshop', span: 'Your own designs', ord: 4, custom: true });
G.ERA.custom = G.ERAS[G.ERAS.length - 1];
if (G.UNIFORMS && !G.UNIFORMS.custom) G.UNIFORMS.custom = G.UNIFORMS.now;

const CW = G.Custom = {};
CW.data = (() => { try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && v.guns) return Object.assign({ atts: [] }, v); } catch (e) {} return { guns: [], atts: [] }; })();
CW.save = () => { try { localStorage.setItem(KEY, JSON.stringify(CW.data)); } catch (e) {} };
const clone = o => JSON.parse(JSON.stringify(o));
const uid = p => p + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
CW.uid = uid;

// ------------------------------------------------------------------ workshop-only parts (rendered in gun.js)
CW.XS = [
  ['xs_fins', 'Radiator fins', 'Finned aluminium barrel shroud. Barrel heats up 35% slower.'],
  ['xs_shield', 'Gun shield', 'Bolted steel shield ahead of the receiver. Heavy (-1 mobility), but it looks like it means it.'],
  ['xs_tank', 'Coolant tank', 'Side-mounted coolant cylinder. +10% sustained rate of fire.'],
  ['xs_coils', 'Glowing coil array', 'Magnetic accelerator rings around the barrel. +8% muzzle velocity.'],
  ['xs_spikes', 'Spiked muzzle crown', 'Breaching crown. Melee hits 40% harder.'],
  ['xs_blade', 'Under-barrel blade', 'Full-length cutlass under the barrel. Melee hits 60% harder.'],
  ['xs_handle', 'Top carry handle', 'Tall loop handle over the receiver.'],
  ['xs_drum2', 'Twin side drums', 'A second drum magazine on the left. Doubles capacity.'],
  ['xs_cannon', 'Under-barrel mini cannon', 'Short 40 mm tube under the barrel. Works as a grenade launcher.'],
  ['xs_armor', 'Receiver armour plates', 'Bolt-on plates over the receiver. -0.5 mobility.'],
  ['xs_stab', 'Gyro stabiliser pod', 'Spinning flywheel under the stock. 15% less muzzle climb.'],
  ['xs_spine', 'Exposed spine rail', 'Skeletal steel spine over the top. 5% tighter groups.'],
];
const XSM = Object.fromEntries(CW.XS.map(x => [x[0], x]));
const rs0 = G.resolveStats;
G.resolveStats = function (wp, L, st) {
  const S = rs0(wp, L, st), X = (wp.m && wp.m.x) || [];
  if (!X.length || !X.some(x => XSM[x])) return S;
  if (X.includes('xs_shield')) S.mob = Math.max(1, S.mob - 1);
  if (X.includes('xs_armor')) S.mob = Math.max(1, S.mob - .5);
  if (X.includes('xs_tank')) S.rpm *= 1.1;
  if (X.includes('xs_coils')) S.v *= 1.08;
  if (X.includes('xs_spikes')) S.melee = Math.max(S.melee, 1.4);
  if (X.includes('xs_blade')) S.melee = Math.max(S.melee, 1.6);
  if (X.includes('xs_drum2')) S.mag *= 2;
  if (X.includes('xs_cannon')) S.gl = 1;
  if (X.includes('xs_stab')) S.rv *= .85;
  if (X.includes('xs_spine')) S.acc *= .95;
  if (X.includes('xs_fins')) S.heat = (S.heat || 1) * .65;
  return S;
};

// ------------------------------------------------------------------ attachment rules for workshop guns
// Custom guns take any attachment that suits their class, whatever the era; an attachment made for one
// specific gun fits if that gun was one of the donors. Psycho-arsenal parts fit too. Player-made
// attachments fit every gun.
const ERA_BY_ORD = ['ww1', 'ww2', 'cold', 'mod', 'now', 'psycho'];
const ok1 = G.attachOK;
G.attachOK = function (wp, at) {
  if (at.cust) return !at.cls || at.cls.includes(wp.c);
  if (!wp.custom) return ok1(wp, at);
  if (wp.anyAtt && !(at.slot === 'ammo' && at.cal)) return true;
  const e = at.psy ? 'psycho' : ERA_BY_ORD[Math.max(0, Math.min(4, at.e1 !== undefined ? at.e1 : 4))];
  const id = at.only ? ((wp.donors || []).find(d => at.only.includes(d)) || wp.id) : wp.id;
  return ok1(Object.assign({}, wp, { e, id, m: Object.assign({}, wp.m, { x: (wp.m.x || []).concat(['railT']) }) }), at); // workshop guns count as railed
};
G.attachFor = (wp, slot) => G.ATTACH.filter(at => at.slot === slot && G.attachOK(wp, at));

// ------------------------------------------------------------------ registry
function normalize(wp) {
  wp.e = 'custom'; wp.custom = true; wp.home = 'now';
  wp.m = wp.m || {}; wp.m.x = (wp.m.x || []).slice();
  wp.modes = wp.modes && wp.modes.length ? wp.modes : ['semi'];
  wp.rec = wp.rec || [1, .4]; wp.rl = wp.rl || [2.5, 3];
  if (!G.CAL[wp.cal]) wp.cal = '5.56×45mm';
  for (const k of ['rpm', 'mag', 'v', 'dmg', 'acc', 'wt', 'y']) wp[k] = +wp[k] || 1;
  wp.mag = Math.max(1, Math.round(wp.mag));
  if (!wp.he || !(wp.he.r > 0)) delete wp.he; else wp.he = { r: +wp.he.r, dmg: +wp.he.dmg || 40 };
  if (!wp.gyro || !(wp.gyro.v > 0)) delete wp.gyro; else wp.gyro = { v: +wp.gyro.v, burn: +wp.gyro.burn || .12 };
  for (const k of ['spin', 'charge', 'homing', 'burstRpm']) if (!(wp[k] > 0)) delete wp[k];
  if (!(wp.salvo > 1)) delete wp.salvo;
  if (!(wp.pellets > 1)) delete wp.pellets;
  for (const k of ['inc', 'intSup', 'duplex', 'caseless', 'hyper', 'heavy', 'tubeLoad', 'anyAtt']) if (!wp[k]) delete wp[k];
  if (!wp.m.bip) delete wp.m.bip;
  if (wp.defOptic && !G.ATT[wp.defOptic]) delete wp.defOptic;
  return wp;
}
CW.normalize = normalize;
function registerAtt(at) {
  const i = G.ATTACH.findIndex(a => a.id === at.id);
  if (i >= 0) G.ATTACH[i] = at; else G.ATTACH.push(at);
  G.ATT[at.id] = at;
}
function register(wp) {
  normalize(wp);
  const i = G.WEAPONS.findIndex(w => w.id === wp.id);
  if (i >= 0) G.WEAPONS[i] = wp; else G.WEAPONS.push(wp);
  G.WEAPON[wp.id] = wp;
  return wp;
}
CW.validate = function (wp) {
  try { const L = G.defaultLoadout(wp); G.resolveStats(wp, L); G.buildGun(wp, L, { lod: 1 }); return null; } catch (e) { return e && e.message || String(e); }
};
CW.saveGun = function (wp, L) {
  wp = normalize(clone(wp));
  if (!wp.id || !/^cw_/.test(wp.id)) wp.id = uid('cw_');
  const err = CW.validate(wp); if (err) return { err };
  const i = CW.data.guns.findIndex(g => g.id === wp.id);
  if (i >= 0) CW.data.guns[i] = wp; else CW.data.guns.push(wp);
  CW.save(); register(wp);
  if (L && G.UI) G.UI.saveLoadout(wp, L);
  return { wp };
};
CW.deleteGun = function (id) {
  CW.data.guns = CW.data.guns.filter(g => g.id !== id); CW.save();
  const i = G.WEAPONS.findIndex(w => w.id === id); if (i >= 0) G.WEAPONS.splice(i, 1);
  delete G.WEAPON[id];
  if (G.UI) { delete G.UI.loadouts[id]; G.UI.store.set('loadouts', G.UI.loadouts); }
  if (G.Raid && G.Raid.stash) { G.Raid.stash.items = G.Raid.stash.items.filter(it => !(it.t === 'w' && it.id === id)); G.Raid.save(); }
};
CW.saveAtt = function (at) {
  at = clone(at); if (!at.id || !/^ca_/.test(at.id)) at.id = uid('ca_'); at.cust = true;
  const i = CW.data.atts.findIndex(a => a.id === at.id);
  if (i >= 0) CW.data.atts[i] = at; else CW.data.atts.push(at);
  CW.save(); registerAtt(at); return at;
};
CW.deleteAtt = function (id) {
  CW.data.atts = CW.data.atts.filter(a => a.id !== id); CW.save();
  const i = G.ATTACH.findIndex(a => a.id === id); if (i >= 0) G.ATTACH.splice(i, 1);
  delete G.ATT[id];
};
// attachment restrictions dropped on a player-made copy
const RESTRICT = ['e0', 'e1', 'only', 'only_family', 'not', 'cls', 'not_cls', 'needs', 'cal', 'not_family', 'psy', 'fixedOk'];
CW.attFrom = function (base, over) {
  const at = clone(base); for (const k of RESTRICT) delete at[k];
  at.as = base.as || base.id; at.base = base.id; at.cust = true; at.id = undefined;
  return Object.assign(at, over || {});
};
for (const at of CW.data.atts) { try { registerAtt(at); } catch (e) {} }
for (const wp of CW.data.guns) { try { register(wp); } catch (e) { console.warn('custom gun skipped', e); } }

// ------------------------------------------------------------------ part vocabulary, read from every real gun
let VOC = null;
CW.vocab = function () {
  if (VOC) return VOC;
  const V = { t: new Map(), hg: new Map(), stk: new Map(), grip: new Map(), mag: new Map(), sgt: new Map(), bh: new Map(), mz: new Map(), pl: new Map(), mt: new Map(), wd: new Map(), x: new Map(), cal: [] };
  for (const w of G.WEAPONS) {
    if (w.custom) continue; const m = w.m || {};
    const put = (k, v, smp) => { if (v === undefined || v === null) return; if (!V[k].has(v)) V[k].set(v, { n: 0, smp, ex: w.n }); V[k].get(v).n++; };
    put('t', m.t, w.id); put('stk', m.stk); put('grip', m.grip); put('sgt', m.sgt); put('bh', m.bh); put('mz', m.mz); put('pl', m.pl); put('mt', m.mt); put('wd', m.wd);
    if (m.hg) put('hg', m.hg[0], m.hg); if (m.mag) put('mag', m.mag[0], m.mag);
    for (const x of m.x || []) put('x', x);
  }
  V.cal = Object.keys(G.CAL);
  VOC = V; return V;
};
// readable names for the model codes
const PN = {
  t: { bolt: 'Bolt-action receiver', lever: 'Lever-action receiver', smg: 'SMG receiver', lmg: 'Light MG receiver', battle: 'Battle-rifle receiver', mg: 'Machine-gun receiver', pump: 'Pump-gun receiver', pistol: 'Pistol frame', rev: 'Revolver frame', semiw: 'Semi-auto rifle receiver', ak: 'AK receiver', ar: 'AR-15 upper/lower', bullpup: 'Bullpup shell', scar: 'SCAR-style receiver', precision: 'Precision chassis', amr: 'Anti-materiel receiver', autosg: 'Auto-shotgun receiver' },
};
CW.partName = (k, v) => (PN[k] && PN[k][v]) || String(v).replace(/_/g, ' ');

// ------------------------------------------------------------------ merging
const isHand = w => w.c === 'PST' || ['pistol', 'rev'].includes(w.m.t);
const autoish = w => w.modes.some(m => m === 'auto' || m.startsWith('burst'));
const short = w => { const ws = w.n.replace(/\(.*?\)|[“”"].*?[“”"]/g, '').trim().split(/\s+/), o = []; for (const x of ws) { o.push(x); if (/\d/.test(x) || o.length >= 2) break; } return o.join(' ').replace(/[,]$/, ''); };
CW.merge = function (ids) {
  const ws = ids.map(id => G.WEAPON[id]).filter(Boolean);
  if (ws.length < 2) return null;
  const P = ws[0], fam = ws.filter(w => isHand(w) === isHand(P));
  const best = (arr, f) => arr.reduce((a, b) => f(b) > f(a) ? b : a);
  const hit = best(ws, w => w.dmg * (w.pellets || 1) * (w.he ? 2 : 1));
  const reach = best(fam, w => w.v);
  const soft = best(fam, w => -(w.rec[0] + w.rec[1]));
  const cap = best(ws, w => w.mag);
  const capM = best(fam, w => w.mag);
  const tight = best(ws, w => -w.acc), tightM = best(fam, w => -w.acc);
  const fast = best(ws, w => (autoish(w) ? 10000 : 0) + w.rpm);
  const quick = best(ws, w => -(w.rl[0] + w.rl[1]));
  const m = clone(P.m), from = {};
  const hand = isHand(P), pup = m.t === 'bullpup';
  // body: the first gun's receiver, other parts from the donor that does that job best
  if (!hand && reach !== P) { m.B = [Math.max(m.B[0], reach.m.B[0] * .9), Math.max(m.B[1], reach.m.B[1])]; if (reach.m.mz) m.mz = reach.m.mz; if (reach.m.hg && !isHand(reach)) m.hg = clone(reach.m.hg); from.barrel = reach.n; }
  if (!hand && !pup && soft !== P && soft.m.t !== 'bullpup' && soft.m.stk) { m.stk = soft.m.stk; if (soft.m.grip && !isHand(soft)) m.grip = soft.m.grip; from.stock = soft.n; }
  if (capM !== P && capM.m.mag) {
    const mt0 = capM.m.mag[0];
    const okType = hand ? capM.m.t === P.m.t : !['pst', 'cyl'].includes(mt0);
    if (okType) { const mz = P.m.mag && P.m.mag[3]; m.mag = clone(capM.m.mag); if (mz !== undefined && m.mag.length > 3 && !['tube', 'tube2', 'int', 'belt', 'beltbox', 'beltdrum', 'beltpouch'].includes(mt0)) m.mag[3] = mz; from.mag = capM.n; }
  }
  if (tightM !== P && tightM.m.sgt && isHand(tightM) === hand) { m.sgt = tightM.m.sgt; from.sights = tightM.n; }
  const xs = new Set(m.x || []);
  for (const w of fam) for (const x of w.m.x || []) xs.add(x);
  m.x = Array.from(xs);
  if (ws.some(w => w.m.bip)) m.bip = 1;
  // mechanics
  const modes = []; for (const w of ws) for (const md of w.modes) if (!modes.includes(md)) modes.push(md);
  const manual = ['bolt', 'pump', 'lever'];
  let act = P.act;
  if (modes.includes('auto') || modes.some(x => x.startsWith('burst'))) act = P.act === 'auto_ob' ? 'auto_ob' : 'auto';
  else if (modes.includes('semi') && manual.includes(P.act)) act = 'semi';
  let md = act === 'auto' || act === 'auto_ob' || act === 'semi' || act === 'rev' ? modes.filter(x => !manual.includes(x)) : modes;
  if (!md.length) md = ['semi'];
  md.sort((a, b) => ['auto', 'burst3', 'burst2', 'semi', 'bolt', 'pump', 'lever'].indexOf(a) - ['auto', 'burst3', 'burst2', 'semi', 'bolt', 'pump', 'lever'].indexOf(b));
  // a self-loading merge needs a self-loading action: borrow one from a donor
  if (!manual.includes(act) && act !== 'rev' && ['bolt', 'bolt_bent', 'lever', 'pump'].includes(m.bh)) {
    const d = fam.find(w => !manual.includes(w.act) && !['bolt', 'bolt_bent', 'lever', 'pump', 'none'].includes(w.m.bh) && w.m.t === P.m.t) || fam.find(w => !manual.includes(w.act) && ['side_r', 'side_l', 'ak', 'ar', 'hk', 'top'].includes(w.m.bh));
    m.bh = d ? d.m.bh : 'side_r'; if (m.bh === 'ar' && m.t !== 'ar') m.bh = 'side_r';
  }
  const avg = f => ws.reduce((s, w) => s + f(w), 0) / ws.length;
  const wp = {
    id: uid('cw_'), e: 'custom', custom: true, home: 'now', n: ws.length <= 3 ? ws.map(short).join(' × ') : `${short(P)} × ${ws.length - 1} more`, c: P.c, y: new Date().getFullYear(), co: 'Workshop',
    cal: hit.cal, act, modes: md, rpm: Math.round(fast.rpm), mag: Math.max(P.mag, cap.mag), v: Math.round(Math.max(hit.v, avg(w => w.v))), dmg: Math.round(hit.dmg * 1.04),
    rec: [+(avg(w => w.rec[0]) * .92).toFixed(2), +(avg(w => w.rec[1]) * .92).toFixed(2)], rl: quick.rl.slice(), acc: +(tight.acc * 1.05).toFixed(2), wt: +(avg(w => w.wt) * 1.08).toFixed(2), m,
    donors: ws.map(w => w.id),
  };
  if (hit.pellets) wp.pellets = hit.pellets;
  const flagMax = ['spin', 'charge', 'salvo', 'homing', 'burstRpm'];
  for (const k of flagMax) { const v = Math.max(0, ...ws.map(w => w[k] || 0)); if (v) wp[k] = v; }
  for (const k of ['inc', 'intSup', 'duplex', 'caseless', 'hyper', 'heavy']) if (ws.some(w => w[k])) wp[k] = true;
  const he = ws.filter(w => w.he); if (he.length) wp.he = { r: Math.max(...he.map(w => w.he.r)), dmg: Math.max(...he.map(w => w.he.dmg)) };
  const gy = ws.find(w => w.gyro); if (gy) wp.gyro = clone(gy.gyro);
  const tm = m.mag && m.mag[0]; if (ws.some(w => w.tubeLoad) && ['tube', 'tube2', 'int', 'enbloc', 'cyl'].includes(tm)) wp.tubeLoad = true;
  const opt = ws.find(w => w.defOptic); if (opt) wp.defOptic = opt.defOptic;
  // what came from where, shown in the merge panel
  const feats = [];
  feats.push(['Receiver & action', P.n]);
  feats.push(['Cartridge & hit', `${hit.n} — ${hit.cal}, ${hit.dmg} dmg`]);
  feats.push(['Rate of fire', `${fast.n} — ${fast.rpm} rpm`]);
  feats.push(['Capacity', `${cap.n} — ${wp.mag} rds`]);
  feats.push(['Accuracy', `${tight.n} — ${tight.acc} MOA`]);
  feats.push(['Reload', `${quick.n} — ${quick.rl[0]} s`]);
  if (from.barrel) feats.push(['Barrel & handguard', from.barrel]);
  if (from.stock) feats.push(['Stock & grip', from.stock]);
  if (from.mag) feats.push(['Magazine body', from.mag]);
  if (from.sights) feats.push(['Sights', from.sights]);
  const sp = []; if (wp.spin) sp.push('rotary spin-up'); if (wp.charge) sp.push('coil charge'); if (wp.salvo) sp.push(`${wp.salvo}-round salvo`); if (wp.he) sp.push('explosive rounds'); if (wp.homing) sp.push('seeker rounds'); if (wp.inc) sp.push('incendiary'); if (wp.intSup) sp.push('integral suppressor'); if (wp.gyro) sp.push('rocket rounds'); if (wp.duplex) sp.push('duplex'); if (wp.caseless) sp.push('caseless'); if (wp.hyper) sp.push('hyperburst'); if (wp.m.bip) sp.push('bipod');
  if (sp.length) feats.push(['Special mechanics', sp.join(' · ')]);
  wp.blurb = `Workshop merge of ${ws.map(w => w.n).join(', ')}.`;
  // fall back to the first gun's body if the mix will not assemble
  if (CW.validate(wp)) { wp.m = clone(P.m); wp.m.x = Array.from(new Set([...(P.m.x || []), ...ws.flatMap(w => (w.m.x || []).filter(x => /^rail|^bip|heat|vents|lug/.test(x)))])); }
  if (CW.validate(wp)) wp.m = clone(P.m);
  // starting attachments: each slot from the first donor that had something fitted there
  const L = G.defaultLoadout(wp);
  if (G.UI) for (const w of ws) { const Lw = G.UI.loadoutFor(w); for (const s in Lw) if (L[s] === G.defaultLoadout(wp)[s] && !G.DEFAULT_IDS.includes(Lw[s]) && G.ATT[Lw[s]] && G.attachOK(wp, G.ATT[Lw[s]])) L[s] = Lw[s]; }
  return { wp: normalize(wp), L, feats };
};

// ------------------------------------------------------------------ chaos build (random everything)
CW.random = function (R = Math.random) {
  const V = CW.vocab(), pick = a => a[Math.floor(R() * a.length)], keys = k => Array.from(V[k].keys());
  const base = pick(G.WEAPONS.filter(w => !w.custom));
  const wp = clone(base); wp.id = undefined; wp.donors = [base.id];
  const hand = isHand(base);
  if (!hand) {
    for (const k of ['stk', 'mz', 'sgt']) if (R() < .7) wp.m[k] = pick(keys(k));
    if (R() < .7) { const h = pick(keys('hg')); wp.m.hg = clone(V.hg.get(h).smp); }
    if (R() < .5) { const mg = pick(keys('mag').filter(x => !['pst', 'cyl'].includes(x))); wp.m.mag = clone(V.mag.get(mg).smp); }
    wp.m.B = [Math.max(.1, wp.m.B[0] * (.7 + R() * .8)), wp.m.B[1]];
  }
  wp.m.pl = pick(keys('pl')); wp.m.mt = pick(keys('mt'));
  wp.m.x = (wp.m.x || []).concat(CW.XS.filter(() => R() < .2).map(x => x[0]));
  wp.cal = pick(V.cal); wp.dmg = Math.round(wp.dmg * (.8 + R() * .8)); wp.rpm = Math.round(wp.rpm * (.7 + R() * 1.2)); wp.mag = Math.max(1, Math.round(wp.mag * (.8 + R() * 1.6)));
  if (R() < .15) wp.he = { r: 1 + R() * 2.5, dmg: 30 + R() * 50 }; if (R() < .12) wp.homing = 2 + R() * 2; if (R() < .15) wp.inc = true; if (R() < .1) wp.salvo = 2 + Math.floor(R() * 3);
  wp.n = 'Chaos ' + short(base) + ' ' + Math.floor(R() * 90 + 10);
  return normalize(wp);
};
})();
