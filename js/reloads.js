// ============================================================================
// IRONSIGHT — reloads. Every weapon gets a reload built from what it really is:
// its feed system, its charging handle, its era's drill and its own geometry,
// played as a keyframed timeline in which the support hand actually handles
// the objects involved — a fresh magazine from the pouch (the old one dropped
// or stowed), stripper clips and chargers thumbed into the guides, Mannlicher
// and Garand en-bloc clips, single cartridges and shotgun shells, speedloaders
// and loose rounds for revolvers, belts laid on feed trays, pan magazines,
// Hotchkiss strips, coilgun cells. Bolt catches, HK slaps, AK rock-ins, over-
// the-top charging, slide releases, Luger toggles, G11 cranks and bolt throws
// finish the job. Small per-weapon variations (from a hash of its id) keep two
// guns of the same family from moving identically.
// ============================================================================
'use strict';
(function () {
const G = window.G, PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ss = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
function trackAt(k, T) {
  if (T <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (T <= k[i][0]) { const a = k[i - 1], b = k[i]; return lerp(a[1], b[1], ss((T - a[0]) / (b[0] - a[0] || 1))); }
  return k[k.length - 1][1];
}
const DEF = { mv: 1, iv: 0, irn: 99 };

// ------------------------------------------------------------------ timeline with a cursor
class Seq {
  constructor() { this.ch = {}; this.T = 0; this.evs = []; }
  val(c, T = this.T) { const k = this.ch[c]; return k && k.length ? trackAt(k, T) : (DEF[c] !== undefined ? DEF[c] : 0); }
  // move channels to values over d seconds starting at the cursor; advance unless par
  go(d, o, par) { const T0 = this.T, T1 = T0 + Math.max(.001, d); for (const c in o) { const v0 = this.val(c, T0); const k = this.ch[c] || (this.ch[c] = []); k.push([T0, v0], [T1, o[c]]); } if (!par) this.T = T1; return this; }
  set(o) { return this.go(.001, o); }
  wait(d) { this.T += d; return this; }
  at(fn, dt = 0) { this.evs.push([this.T + dt, fn]); return this; }
}
const vec = (p, pre = 'l') => ({ [pre + 'x']: p.x, [pre + 'y']: p.y, [pre + 'z']: p.z });
const pose = o => ({ px: o.px || 0, py: o.py || 0, pz: o.pz || 0, rx: o.rx || 0, ry: o.ry || 0, rz: o.rz || 0 });
const POSE = { // viewmodel offsets that bring the part being worked into view
  rifle: { px: -.03, py: .08, pz: .02, rx: .12, ry: .15, rz: -.32 },
  rock: { px: -.04, py: .09, pz: .03, rx: .18, ry: .2, rz: -.4 },
  pistol: { px: -.05, py: .11, pz: .03, rx: .35, ry: .25, rz: -.45 },
  bullpup: { px: -.02, py: .11, pz: -.22, rx: .4, ry: .45, rz: -.55 },
  pupTop: { px: -.04, py: .1, pz: -.2, rx: .35, ry: .5, rz: .2 },
  top: { px: -.03, py: .06, pz: .03, rx: .05, ry: .2, rz: .3 },
  side: { px: -.03, py: .07, pz: .03, rx: .12, ry: .35, rz: .1 },
  belt: { px: -.02, py: .05, pz: .02, rx: .05, ry: .15, rz: .4 },
  strip: { px: -.03, py: .06, pz: .02, rx: .12, ry: .12, rz: .3 },
  tube: { px: -.04, py: .1, pz: .03, rx: .2, ry: .2, rz: -.7 },
  port: { px: -.03, py: .07, pz: .02, rx: .1, ry: .1, rz: .6 },
  revOpen: { px: -.05, py: .03, pz: .04, rx: .35, ry: .3, rz: .6 },
  revUp: { px: -.03, py: .09, pz: .03, rx: 1, ry: .2, rz: -.2 },
  revDown: { px: -.04, py: .07, pz: .03, rx: -.25, ry: .25, rz: -.35 },
  heavy: { px: -.02, py: .05, pz: .03, rx: .08, ry: .2, rz: -.25 },
  rest: {},
};

// ------------------------------------------------------------------ objects the hand carries
function mkRounds(cal, n, lay) { // lay(i) -> [x, y, z]
  const g = new THREE.Group(), rs = [];
  for (let i = 0; i < n; i++) { const r = G.makeRound(cal); const [x, y, z] = lay(i); r.position.set(x, y, z); g.add(r); rs.push(r); }
  g.userData.rounds = rs; return g;
}
const steel = () => G.mat({ color: '#8f8a80', metalness: 1, roughness: .38 });
const darkSteel = () => G.mat({ color: '#3a3a3a', metalness: .9, roughness: .45 });
function makeItem(kind, w, n) {
  const rig = w.rig, cal = w.wp.cal, c = G.CAL[cal] || G.CAL['5.56×45mm'], cl = c.cs[0], cr = c.cs[1];
  let g;
  if (kind === 'mag' && rig.mag) { g = rig.mag.clone(true); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.visible = true; g.traverse(o => { o.visible = true; }); }
  else if (kind === 'clip') { // stripper clip / charger: rounds stacked, rims in a sheet-steel spine
    const sp = cr * 1.95; g = mkRounds(cal, n, i => [0, i * sp, i % 2 ? .0012 : 0]);
    const sp2 = new THREE.Mesh(G.geo.gBox(.012, sp * n + .004, .003), steel()); sp2.position.set(0, sp * (n - 1) / 2, cl / 2 - .0005); g.add(sp2);
  } else if (kind === 'enbloc') { // Garand / Mannlicher en-bloc: staggered column held in a sheet-metal clip
    const sp = cr * 1.7; g = mkRounds(cal, n, i => [(i % 2 ? 1 : -1) * cr * .9, i * sp, 0]);
    for (const s of [-1, 1]) { const side = new THREE.Mesh(G.geo.gBox(.002, sp * n + .004, cl * .55), steel()); side.position.set(s * cr * 2.1, sp * (n - 1) / 2, cl * .1); g.add(side); }
    const back = new THREE.Mesh(G.geo.gBox(cr * 4.3, sp * n * .4, .002), steel()); back.position.set(0, sp * n * .2, cl / 2); g.add(back);
  } else if (kind === 'round' || kind === 'shell') { g = mkRounds(cal, 1, () => [0, 0, 0]); }
  else if (kind === 'loose') { g = mkRounds(cal, n, i => [(i - (n - 1) / 2) * cr * 2.2, (i % 2) * .002, 0]); } // a pinch of rounds
  else if (kind === 'speedloader' || kind === 'moon') {
    const R = rig.cyl ? (w.wp.m.R[1] * .55) * .58 : .009; const k = Math.max(5, n);
    g = mkRounds(cal, k, i => [Math.cos(i / k * 2 * PI) * R, Math.sin(i / k * 2 * PI) * R, 0]);
    const disk = new THREE.Mesh(G.geo.gCyl(R * (kind === 'moon' ? 1.45 : 1.7), R * (kind === 'moon' ? 1.45 : 1.7), kind === 'moon' ? .0012 : .014, 18), kind === 'moon' ? steel() : darkSteel()); disk.position.z = cl / 2 + (kind === 'moon' ? .0005 : .008); g.add(disk);
    if (kind === 'speedloader') { const knob = new THREE.Mesh(G.geo.gCyl(.006, .006, .01, 12), darkSteel()); knob.position.z = cl / 2 + .02; g.add(knob); }
  } else if (kind === 'belt' || kind === 'strip') { // rounds side by side, linked (belt) or on a rigid strip (Hotchkiss, Breda charger)
    const sp = cr * (kind === 'belt' ? 2.5 : 2.3); g = mkRounds(cal, n, i => [-i * sp, 0, 0]);
    if (kind === 'belt') for (let i = 0; i < n; i++) { const l = new THREE.Mesh(G.geo.gBox(sp * .9, cr * 2.3, .006), darkSteel()); l.position.set(-i * sp, 0, cl * .1); g.add(l); }
    else { const s = new THREE.Mesh(G.geo.gBox(sp * n, .002, cl * .6), steel()); s.position.set(-sp * (n - 1) / 2, -cr * 1.1, 0); g.add(s); }
  } else if (kind === 'cell') { // psycho-arsenal power cell
    g = new THREE.Group(); const b = new THREE.Mesh(G.geo.gRBox(.035, .07, .05, .006), darkSteel()); b.position.y = -.035; g.add(b);
    const glow = new THREE.Mesh(G.geo.gBox(.037, .012, .03), new THREE.MeshBasicMaterial({ color: '#36d6ff' })); glow.position.y = -.05; g.add(glow);
  } else if (kind === 'cartridge') { // paper cartridge: powder and ball twisted up in paper
    g = new THREE.Group(); const pm = G.paperMat || (G.paperMat = new THREE.MeshStandardMaterial({ color: '#d9d0b8', roughness: 1 }));
    const b = new THREE.Mesh(G.geo.gCyl(.0075, .0075, .06, 8), pm); g.add(b); const t = new THREE.Mesh(G.geo.gCyl(.004, .0075, .012, 8), pm); t.position.z = .036; g.add(t);
  } else if (kind === 'cap') { g = new THREE.Group(); g.add(new THREE.Mesh(G.geo.gCylY(.0028, .0028, .004, 8), G.copperMat || new THREE.MeshStandardMaterial({ color: '#b5653a', metalness: 1, roughness: .3 }))); }
  else if (kind === 'flask') { g = new THREE.Group(); const hm = new THREE.MeshStandardMaterial({ color: '#c9b48a', roughness: .5 }); const h = new THREE.Mesh(G.geo.gCyl(.025, .006, .16, 10), hm); g.add(h); const sp = new THREE.Mesh(G.geo.gCyl(.004, .004, .03, 6), G.brassMat || hm); sp.position.z = -.09; g.add(sp); }
  else if (kind === 'sponge' || kind === 'rammer' || kind === 'worm') { // cannon tools: long staves with a head the size of the bore
    const bore = (w.wp.m.cal || .1), L = (w.wp.m.L || 1.5) * 1.15; g = new THREE.Group();
    const st = new THREE.Mesh(G.geo.gCyl(bore * .12, bore * .12, L, 8), new THREE.MeshStandardMaterial({ color: '#7a5a34', roughness: .8 })); st.position.z = L / 2; g.add(st);
    const hd = new THREE.Mesh(kind === 'sponge' ? G.geo.gCyl(bore * .5, bore * .5, bore * 1.4, 12) : kind === 'worm' ? G.geo.gTor(bore * .3, bore * .05) : G.geo.gCyl(bore * .48, bore * .48, bore * .5, 12), new THREE.MeshStandardMaterial({ color: kind === 'sponge' ? '#3a3a30' : '#6a5030', roughness: 1 })); g.add(hd);
  } else if (kind === 'bag') { const bore = w.wp.m.cal || .1; g = new THREE.Group(); g.add(new THREE.Mesh(G.geo.gCyl(bore * .47, bore * .47, bore * 1.6, 12), new THREE.MeshStandardMaterial({ color: '#c8b88a', roughness: 1 }))); }
  else if (kind === 'shot') { g = G.makeRound(cal); }
  else if (kind === 'part' && n && n.isObject3D) { g = n.clone(true); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.set(1, 1, 1); }
  else g = new THREE.Group();
  g.traverse(o => { o.frustumCulled = false; if (o.isMesh) o.castShadow = false; });
  return g;
}

// ------------------------------------------------------------------ what kind of reload a gun gets
const STRIP_SEMI = ['sks', 'g41', 'c96', 'm712', 'steyr1912', 'johnson'];
const MANNLICHER = ['carcano', 'm1895aus', 'berthier', 'berthier1907', 'rsc17'];
const CHARGER10 = ['smle', 'no4', 'no1', 'ross', 'smle_mk3'];
const GATE_REV = ['nagant', 'saa', 'colt1873', 'm1892', 'chamelot', 'lebel1892'];
const TOPBREAK = ['webley', 'enfield2', 'schofield', 'webleymk6'];
const ROCK = ['fal', 'falpara', 'sa58', 'm14', 'm21', 'mk14', 'bm59', 't44', 't20e2', 'svd', 'svds', 'fedorov', 'avt40', 'svt40'];
function classify(w) {
  const wp = w.wp, rig = w.rig, m = wp.m, t = m.t, bh = m.bh || 'none', mt = rig.magType || (m.mag || [])[0] || 'int', id = wp.id;
  const ord = G.ERA[wp.home || wp.e] ? G.ERA[wp.home || wp.e].ord : 4;
  const fixed = rig.magFixed || !rig.mag;
  if (wp.reloadKind) return wp.reloadKind === 'gatling' ? 'mag' : wp.reloadKind;
  if (wp.enbloc || id === 'garand' || id === 'm1c') return 'garand';
  if (rig.boltType === 'rev' || mt === 'cyl' || t === 'rev') return 'rev';
  if (MANNLICHER.includes(id)) return 'mannlicher';
  if (id === 'hotchkiss') return 'hotstrip';
  if (id === 'breda30') return 'breda';
  if (mt.startsWith('belt')) return 'belt';
  if (mt === 'pan') return 'pan';
  if (mt === 'p90') return 'p90';
  if (mt === 'top_long') return 'g11';
  if (mt === 'cassette') return 'cassette';
  if (mt === 'helical') return 'helical';
  if (STRIP_SEMI.includes(id)) return id === 'johnson' ? 'single' : 'stripsemi';
  if (wp.tubeLoad || mt === 'tube' || mt === 'tube2') return 'tube';
  if (rig.boltType === 'bolt') {
    if (t === 'precision' || (!fixed && ord >= 3) || wp.c === 'SMG' || t === 'lmg' || t === 'bullpup') return 'mag';
    if (mt === 'int' && ord >= 2) return 'single';
    if (id === 'krag' || id === 'tgewehr') return 'single';
    return 'stripper';
  }
  if (rig.boltType === 'lever') return fixed || mt === 'box' ? 'single' : 'mag';
  if (fixed) return wp.heavy || bh === 'none' ? 'cell' : 'single';
  return 'mag';
}
// where on a mag-fed gun the new magazine goes in, and how
function magStyle(w) {
  const wp = w.wp, m = wp.m, mt = w.rig.magType || (m.mag || [])[0] || 'box', id = wp.id;
  if (m.t === 'pistol' || mt === 'pst') return 'pistol';
  if (mt === 'top_curve' || mt === 'pedersen') return 'top';
  if (mt === 'sidebox_l') return 'side';
  if (mt === 'snail') return 'snail';
  if (mt === 'drum' && /^thompson/.test(id)) return 'drumside';
  if (m.t === 'ak' || ROCK.includes(id) || (mt === 'drum' && m.t !== 'ar')) return 'rock';
  return 'straight';
}

// ------------------------------------------------------------------ the reload
G.Player.prototype.reloadAnim = function (w, empty) {
  const P = this, rig = w.rig, wp = w.wp, S = w.S, m = wp.m;
  const R0 = m.R || [.2, .05, .04], RW = R0[2], RH = R0[1], RL = R0[0], zr = rig.zr, zf = rig.zf, top = rig.top, bot = rig.bot;
  const ord = G.ERA[wp.home || wp.e] ? G.ERA[wp.home || wp.e].ord : 4;
  const h = hash(wp.id), h2 = hash(wp.id + 'b');
  const need = S.mag - w.mag;
  const kind = classify(w);
  let dur = (empty ? S.rl[1] * (S.rle || 1) : S.rl[0]) * (this.km ? this.km.reload : 1);
  if (S.qc) w.heat = 0;
  const q = new Seq();
  const C = { items: [], item: null };
  const home = rig.magHome ? rig.magHome.pos.clone() : V3(0, bot, -.06);
  const hrot = rig.magHome ? rig.magHome.rot.clone() : new THREE.Euler();
  const mt = rig.magType || (m.mag || [])[0] || 'int';
  const magLen = (m.mag && m.mag[1]) || .15;
  let POUCH = wp.c === 'PST' ? V3(-.12, -.3, .22) : V3(-.16, -.32, .2);
  const hg = rig.hgPos.clone();
  const fill = n => { const k = Math.min(n === undefined ? need : n, w.reserve, S.mag - w.mag); if (k > 0) { w.mag += k; w.reserve -= k; P.hudDirty = true; } return k; };
  const snd = k => () => G.Audio.mech(k);
  // ----- the support hand's targets
  const boltBack = rig.boltType === 'bolt' ? (rig.boltStroke || .08) : rig.boltType === 'slide' ? (rig.slideStroke || .02) : (rig.boltStroke || .05);
  const side = { side_l: -1, famas: 0, g36: 0, qbz: 0, top: 0, ar: 0 }[m.bh] ?? 1;
  const handleBase = (() => {
    const bh = m.bh;
    if (rig.boltType === 'bolt') return V3(RW * .5 + .052, -.004, zr - .022);
    if (bh === 'ak' || bh === 'ak_up') return V3(RW * .5 + .014, RH * .05, zr - RL * .62);
    if (bh === 'ar' && rig.charge) return V3(0, top + .004, zr + .012);
    if (bh === 'hk' && rig.charge) return rig.charge.position.clone().add(V3(-.014, 0, -.05));
    if (bh === 'top') return V3(0, top + .012, zr - RL * .5);
    if (bh === 'g36' || bh === 'qbz' || bh === 'famas') return V3(0, top + .03, zr - RL * .25);
    if (bh === 'crank') return V3(RW * .5 + .006, 0, -.02);
    if (rig.boltType === 'slide') return V3(0, RH * .2, zr - .012);
    if (rig.boltType === 'lever') return V3(0, bot - .03, .03);
    if (rig.boltType === 'pump') return hg.clone();
    return V3(side * (RW * .5 + .024), RH * .1, zr - RL * (m.t === 'lmg' || m.t === 'mg' ? .7 : .5));
  })();
  // hand follows the handle as it moves: bolt knob orbits when lifted; others translate
  const handlePos = c => {
    const p = handleBase.clone();
    if (rig.boltType === 'bolt') { const r = Math.hypot(p.x, p.y), a = Math.atan2(p.y, p.x) + (c.bl || 0) * 1.35; p.x = Math.cos(a) * r; p.y = Math.sin(a) * r; p.z += (c.b || 0) * boltBack; }
    else if (rig.boltType === 'lever') { const a = (c.lev || 0) * .9; p.y -= Math.sin(a) * .05; p.z += (1 - Math.cos(a)) * .05 + a * .03; }
    else if (rig.boltType === 'pump') p.z += (c.pmp || 0) * .085;
    else if (m.bh === 'ar' && rig.charge) p.z += (c.ch || 0) * .06;
    else if (m.bh === 'hk' && rig.charge) p.z += (c.ch || 0) * .07;
    else p.z += (c.b || c.sl || 0) * boltBack;
    return p;
  };
  // ----- current item management
  let gI = V3(0, -.05, 0), gM = V3(0, -.07, 0);
  const GI = g => { gI = g.clone(); const c = g.clone(); q.at(() => { C.grabI = c; }); return gI; };
  const GM = g => { gM = g.clone(); const c = g.clone(); q.at(() => { C.grabM = c; }); return gM; };
  // fetch something from the pouch: the hand travels there, then holds it
  const fetch = (k, n, grab, rot, d = .2) => { q.go(d, Object.assign(vec(POUCH), { lf: 0, lm: 0, lk: 0, lcy: 0 })); GI(grab); q.at(setItem(k, n)); q.set(Object.assign(vec(POUCH.clone().sub(grab), 'i'), { irx: 0, iry: 0, irz: 0 }, rot || {}, { iv: 1, lf: 1 })); };
  const setItem = (k, n) => () => { dropItemObj(); if (!k) return; const it = makeItem(k, w, n || 1); it.visible = false; rig.root.add(it); C.item = it; C.items.push(it); };
  const dropItemObj = () => { if (C.item) { rig.root.remove(C.item); C.item = null; } };
  const flingItem = (vel, keep) => () => { if (!C.item) return; P.throwObj(C.item, vel); if (!keep) dropItemObj(); };
  // ----- channel defaults at the start
  const holdOpen = ['ar', 'side_l', 'g36', 'famas', 'qbz', 'side_both'].includes(m.bh) || rig.boltType === 'slide';
  const locked = empty && w.slideLock && holdOpen;
  const startB = locked ? 1 : 0;
  q.set(Object.assign(vec(hg), { lw: 0, b: startB, sl: locked && rig.boltType === 'slide' ? 1 : 0, mv: 1, iv: 0, ch: 0, chu: 0 }));
  const toPose = (d, p, extra) => q.go(d, Object.assign(pose(p), extra || {}));
  const handTo = (d, p, extra, par) => q.go(d, Object.assign(vec(p), { lf: 0, lm: 0, lk: 0, lc: 0 }, extra || {}), par);
  const R = { dur, ev: [], cancel: false, end: null };

  // ===== charging / bolt-finishing moves (after the feed is replenished, when empty)
  const charge = (opt = {}) => {
    const bh = m.bh, ob = wp.act === 'auto_ob';
    if (rig.boltType === 'slide') { // pistols
      if (!locked) return;
      if (m.bh === 'toggle') { q.go(.18, { lk: 1, lw: 1 }); q.go(.08, { sl: 1.1 }); q.at(snd('slide')); q.go(.06, { sl: 0 }); q.go(.12, { lk: 0 }); return; }
      if (h < .55 || ord <= 1) { q.at(snd('slide')); q.go(.07, { sl: 0, rz: q.val('rz') + .05 }); } // thumb on the slide stop
      else { q.go(.16, { lk: 1 }); q.go(.08, { sl: 1.05 }); q.at(snd('slide')); q.go(.05, { sl: 0 }); q.go(.1, { lk: 0 }); } // overhand slingshot
      return;
    }
    if (rig.boltType === 'bolt') { q.go(.16, { lk: 1 }); q.go(.1, { bl: 1 }); q.at(snd('boltup')); q.go(.14, { b: 1 }); q.at(snd('boltback')); q.at(() => P.ejectCasing()); q.go(.14, { b: 0 }); q.at(snd('boltfwd')); q.go(.08, { bl: 0 }); q.go(.12, { lk: 0 }); return; }
    if (rig.boltType === 'lever') { q.go(.12, { lk: 1 }); q.go(.15, { lev: 1 }); q.at(snd('lever')); q.go(.15, { lev: 0 }); q.go(.1, { lk: 0 }); return; }
    if (rig.boltType === 'pump') { q.go(.12, { lk: 1 }); q.go(.12, { pmp: 1 }); q.at(snd('pump')); q.go(.1, { pmp: 0 }); return; }
    if (bh === 'hk') { q.go(.16, { lk: 1 }); q.at(snd('boltfwd')); q.go(.05, { ch: 0, chu: 0, b: 0 }); q.go(.1, { lk: 0, ly: q.val('ly') + .02 }); return; } // the HK slap
    if (bh === 'crank') { if (ob) return; q.go(.15, { lk: 1 }); q.go(.35, { crk: 1 }); q.at(snd('boltback')); q.go(.1, { lk: 0 }); return; }
    if (bh === 'ar' && locked && h2 < .7 && !opt.noCatch) { // thumb or palm on the bolt catch on the left side
      handTo(.16, V3(-RW * .5 - .012, -RH * .32, -.075)); q.at(snd('boltfwd')); q.go(.05, { b: 0 }); return;
    }
    if (bh === 'ar' && rig.charge) { q.go(.16, { lk: 1 }); q.go(.1, { ch: 1, b: 1 }); q.at(snd('boltback')); q.go(.06, { ch: 0, b: 0 }); q.at(snd('boltfwd')); q.go(.1, { lk: 0 }); return; }
    if (bh === 'none') return;
    // side / top handles: left-side ones are grabbed directly, right-side ones over the top (or under, randomly per gun)
    const over = side > 0 && h2 > .4;
    if (over) toPose(.12, Object.assign({}, POSE.rifle, { rz: .2, ry: .1 }), {}, true);
    q.go(.16, { lk: 1 });
    if (locked) { q.at(snd('boltfwd')); q.go(.06, { b: 0 }); } // slap it off the hold-open
    else { q.go(.1, { b: 1 }); q.at(snd('boltback')); q.go(.06, { b: 0 }); q.at(snd('boltfwd')); }
    q.go(.1, { lk: 0 });
  };

  // ===== detachable magazine (rifles, SMGs, pistols, bullpups, top / side / drum mags)
  const magReload = () => {
    const style = magStyle(w);
    const pistol = style === 'pistol', pup = m.t === 'bullpup';
    let axis = V3(0, -1, 0).applyEuler(hrot);
    if (style === 'top' || mt === 'pan') axis = V3(0, 1, 0);
    if (style === 'side' || style === 'snail') axis = V3(-1, 0, 0);
    if (style === 'drumside') axis = V3(-1, 0, 0);
    const grab = rig.magGrab ? rig.magGrab.clone() : axis.clone().multiplyScalar(Math.min(.1, magLen * .55));
    GM(grab); GI(grab);
    const ps = pistol ? POSE.pistol : pup ? POSE.bullpup : style === 'rock' ? POSE.rock : style === 'top' ? POSE.top : style === 'side' || style === 'snail' || style === 'drumside' ? POSE.side : wp.heavy || wp.c === 'LMG' ? POSE.heavy : POSE.rifle;
    const heavy = /drum|snail/.test(mt) || wp.heavy;
    const dropFree = empty ? ord >= 2 : (ord >= 4 && h < .25);
    // HK roller guns: lock the cocking handle back first when empty
    if (empty && m.bh === 'hk') { toPose(.16, ps, { lw: 1, lk: 1 }); q.go(.12, { ch: 1, b: 1 }); q.at(snd('boltback')); q.go(.06, { chu: 1 }); q.go(.12, { lk: 0, lm: 1 }); }
    else toPose(.22, ps, { lw: 1, lm: 1 });
    // --- out with the old one
    q.at(snd('magout'));
    if (style === 'rock') { // AK paddle: roll the magazine forward off its front lug
      q.go(.14, { mrx: .55, ...vec(axis.clone().multiplyScalar(.02).add(V3(0, 0, -.02)), 'm') });
      q.go(.12, vec(axis.clone().multiplyScalar(.09).add(V3(0, 0, -.05)), 'm'));
    } else q.go(.12, vec(axis.clone().multiplyScalar(dropFree ? .05 : .1), 'm'));
    if (dropFree) { // let it fall and go for the pouch
      q.at(() => P.dropMag()); q.set({ mv: 0, lm: 0, ...vec(home.clone().add(grab).add(axis.clone().multiplyScalar(.05))) });
      handTo(.26, POUCH);
    } else { // keep it: carry it to the pouch
      const cur = V3(q.val('mx'), q.val('my'), q.val('mz'));
      q.go(.28, { ...vec(POUCH.clone().sub(home).sub(grab), 'm'), mrz: .4 });
      q.set({ mv: 0, lm: 0, ...vec(POUCH) }); void cur;
      q.wait(.08);
    }
    // --- the fresh magazine
    q.at(setItem('mag'));
    const ip0 = POUCH.clone().sub(grab);
    q.set({ ...vec(ip0, 'i'), irx: hrot.x + .5, iry: hrot.y, irz: hrot.z + .4, iv: 1, lf: 1 });
    let pre = home.clone().add(axis.clone().multiplyScalar(.075)), preR = { irx: hrot.x + .12, iry: hrot.y, irz: hrot.z };
    if (style === 'rock') { pre = home.clone().add(axis.clone().multiplyScalar(.035)).add(V3(0, 0, -.03)); preR = { irx: hrot.x + .5, iry: hrot.y, irz: hrot.z }; }
    if (style === 'top') { pre = home.clone().add(V3(0, .05, -.03)); preR = { irx: hrot.x - .35, iry: hrot.y, irz: hrot.z }; }
    if (style === 'drumside') { pre = home.clone().add(V3(-.09, 0, 0)); preR = { irx: hrot.x, iry: hrot.y, irz: hrot.z }; }
    q.go(heavy ? .42 : .32, { ...vec(pre, 'i'), ...preR });
    if (style === 'rock' || style === 'top') { q.go(.08, vec(home.clone().add(axis.clone().multiplyScalar(.012)).add(V3(0, 0, -.006)), 'i')); q.go(.12, { ...vec(home, 'i'), irx: hrot.x }); }
    else q.go(heavy ? .18 : .12, vec(home, 'i'));
    q.at(() => { if (C.item) C.item.visible = false; fill(); }); q.at(snd('magin'));
    q.set({ iv: 0, mv: 1, mx: 0, my: 0, mz: 0, mrx: 0, mrz: 0, lf: 0, lm: 1 });
    // seat it with a palm tap, and on some guns a tug to check it
    q.go(.05, { ...vec(axis.clone().multiplyScalar(-.006), 'm') }); q.go(.05, { mx: 0, my: 0, mz: 0 });
    if (h > .6 && !pistol) { q.go(.05, vec(axis.clone().multiplyScalar(.004), 'm')); q.go(.05, { mx: 0, my: 0, mz: 0 }); }
    if (empty) { q.go(.1, { lm: 0, ...vec(home.clone().add(grab)) }); charge(); }
    toPose(.22, POSE.rest, { lw: 0, lm: 0, lk: 0 });
  };

  // ===== bolt-action stripper clips / chargers
  const stripper = (semi) => {
    const per = semi ? (wp.id === 'g41' ? 5 : Math.max(1, Math.round(S.mag))) : 5;
    const clips = Math.max(1, Math.ceil(need / per)), full = need >= per;
    const guide = rig.boltType === 'bolt' ? V3(0, RW * .5 + .006, zr - RL * .5) : V3(0, top + .006, zr - RL * .45);
    const c = G.CAL[wp.cal] || {}; const stackH = (c.cs ? c.cs[1] * 1.95 : .02) * per;
    toPose(.2, POSE.strip, { lw: 1 });
    if (rig.boltType === 'bolt') { q.go(.12, { lk: 1 }); q.go(.1, { bl: 1 }); q.at(snd('boltup')); q.go(.14, { b: 1 }); q.at(snd('boltback')); if (!empty) q.at(() => P.ejectCasing()); }
    else if (!locked) { q.go(.14, { lk: 1 }); q.go(.1, { b: 1, sl: 1 }); q.at(snd('boltback')); }
    else q.go(.14, { lk: 1, b: 1, sl: rig.boltType === 'slide' ? 1 : 0 });
    q.go(.1, { lk: 0, ...vec(handlePos({ b: 1, bl: 1, sl: 1 })) });
    if (!full) { // topping up a partly full magazine: single rounds
      for (let i = 0; i < need; i++) {
        fetch('round', 1, V3(0, .012, .01));
        q.go(.22, vec(guide.clone().add(V3(0, .012, 0)), 'i')); q.go(.08, vec(guide.clone().add(V3(0, -.012, 0)), 'i'));
        q.at(() => { if (C.item) C.item.visible = false; fill(1); }); q.at(snd('shell')); q.set({ iv: 0 });
      }
    } else for (let k = 0; k < clips; k++) {
      const last = k === clips - 1;
      q.set({ irn: per }); fetch('clip', per, V3(0, stackH + .01, 0));
      q.go(.3, vec(guide.clone().add(V3(0, .03, 0)), 'i')); q.go(.08, vec(guide, 'i'));
      q.at(snd('cover'));
      // thumb strips the rounds down into the magazine, one after another
      q.go(.45, { irn: 0, ly: q.val('ly') }, true); q.go(.45, { iy: guide.y - .004 });
      q.at(() => { fill(per); G.Audio.mech('magin'); });
      if (!last) { q.go(.14, vec(guide.clone().add(V3(.03, .08, .02)), 'i')); q.at(flingItem(V3(.6, 1, .2))); q.set({ iv: 0, lf: 0, ...vec(guide.clone().add(V3(.03, .08, .02)).add(gI)) }); }
      else q.set({ lf: 0, ...vec(guide.clone().add(gI)) });
    }
    // close the action: the bolt kicks the empty clip out of the guides (Mauser drill)
    q.go(.14, { lk: 1 });
    if (rig.boltType === 'bolt') { q.at(flingItem(V3(1.2, 2, .3))); q.set({ iv: 0 }); q.go(.14, { b: 0 }); q.at(snd('boltfwd')); q.go(.08, { bl: 0 }); }
    else { q.at(flingItem(V3(.8, 1.6, .2))); q.set({ iv: 0 }); q.at(snd('boltfwd')); q.go(.06, { b: 0, sl: 0 }); }
    q.go(.1, { lk: 0 });
    toPose(.22, POSE.rest, { lw: 0 });
    R.end0 = () => { w.cycleNeeded = false; };
  };

  // ===== Mannlicher en-bloc (Carcano, Steyr M95, Berthier, RSC 1917)
  const mannlicher = () => {
    const per = Math.max(3, S.mag), guide = V3(0, RW * .5 + .006, zr - RL * .5);
    toPose(.2, POSE.strip, { lw: 1 });
    if (rig.boltType === 'bolt') { q.go(.12, { lk: 1 }); q.go(.1, { bl: 1 }); q.at(snd('boltup')); q.go(.14, { b: 1 }); q.at(snd('boltback')); }
    else { q.go(.14, { lk: 1 }); q.go(.1, { b: 1 }); q.at(snd('boltback')); }
    if (empty) q.at(() => { const it = makeItem('enbloc', w, 0); it.position.copy(home).add(V3(0, -.04, 0)); rig.root.add(it); P.throwObj(it, V3(0, -1, .1)); rig.root.remove(it); }); // spent clip drops out of the bottom
    else { q.at(() => { const it = makeItem('enbloc', w, w.mag); it.position.copy(guide); rig.root.add(it); P.throwObj(it, V3(.3, 2.2, .1)); rig.root.remove(it); w.reserve += w.mag; w.mag = 0; P.hudDirty = true; }); q.at(snd('ping')); } // clip latch: the partial clip springs out of the top
    q.go(.1, { lk: 0, ...vec(handlePos({ b: 1, bl: 1 })) });
    fetch('enbloc', per, V3(0, .03, .01));
    q.go(.32, vec(guide.clone().add(V3(0, .025, 0)), 'i'));
    q.go(.16, vec(guide.clone().add(V3(0, -.03, 0)), 'i'));
    q.at(() => { if (C.item) C.item.visible = false; fill(S.mag); }); q.at(snd('magin')); q.set({ iv: 0, lf: 0, ...vec(guide.clone().add(V3(0, 0, .01))) });
    q.go(.12, { lk: 1 });
    if (rig.boltType === 'bolt') { q.go(.14, { b: 0 }); q.at(snd('boltfwd')); q.go(.08, { bl: 0 }); } else { q.go(.06, { b: 0 }); q.at(snd('boltfwd')); }
    toPose(.22, POSE.rest, { lw: 0, lk: 0 });
    R.end0 = () => { w.cycleNeeded = false; };
  };

  // ===== M1 Garand: en-bloc pressed in with the thumb; the bolt slams home
  const garand = () => {
    const guide = V3(0, top + .004, zr - RL * .45);
    toPose(.2, POSE.strip, { lw: 1 });
    if (!empty) { // press the clip latch: the partial clip and chambered round pop out with a ping
      handTo(.18, V3(-RW * .5 - .01, top - .01, zr - .02)); q.at(snd('ping'));
      q.at(() => { const it = makeItem('enbloc', w, Math.max(0, w.mag - 1)); it.position.copy(guide); rig.root.add(it); P.throwObj(it, V3(.2, 2.6, .2)); rig.root.remove(it); w.reserve += w.mag; w.mag = 0; P.hudDirty = true; });
      q.go(.08, { b: 1 }); q.at(snd('boltback'));
    } else q.set({ b: 1 });
    fetch('enbloc', 8, V3(0, .045, .005), {}, .24);
    q.go(.32, vec(guide.clone().add(V3(0, .03, 0)), 'i'));
    q.go(.14, vec(guide.clone().add(V3(0, -.035, 0)), 'i'));
    q.at(() => { if (C.item) C.item.visible = false; fill(8); }); q.at(snd('magin'));
    // thumb out of the way, fast: the operating rod slams forward
    q.set({ iv: 0, lf: 0, ...vec(guide.clone().add(gI).add(V3(0, -.03, 0))) });
    q.go(.06, { ...vec(guide.clone().add(V3(-.04, .06, .02))) }); q.at(snd('boltfwd')); q.go(.04, { b: 0 });
    toPose(.24, POSE.rest, { lw: 0 });
  };

  // ===== one round at a time: shotgun tubes, Lebel, Krag, single-shot and top-loaded actions
  const singles = () => {
    const tube = mt === 'tube' || mt === 'tube2' || wp.tubeLoad;
    const sg = wp.c === 'SG';
    const pup = m.t === 'bullpup';
    const port = tube ? (pup ? V3(0, bot - .005, zr - .06) : V3(0, bot - .006, zr - RL * .4)) : rig.boltType === 'bolt' ? V3(0, RW * .5 + .006, zr - RL * .5) : rig.boltType === 'lever' && wp.id !== 'win1895' ? V3(RW * .5 + .004, -RH * .1, zr - RL * .3) : V3(0, top + .004, zr - RL * .45);
    const fromSide = rig.boltType === 'lever' && wp.id !== 'win1895';
    const n = Math.min(need, w.reserve); if (n <= 0) return null;
    const per = Math.max(.4, Math.min(1, S.rl[0] < 1.2 ? S.rl[0] : S.rl[0] / Math.max(2, S.mag) * 1.8)) * (this.km ? this.km.reload : 1); // seconds per round
    const openFirst = !tube || (rig.boltType === 'bolt');
    R.cancel = true;
    toPose(.3, tube ? (pup ? POSE.bullpup : POSE.tube) : POSE.strip, { lw: 1 });
    // open the action where the rounds go in from the top
    if (openFirst && rig.boltType === 'bolt') { q.go(.12, { lk: 1 }); q.go(.1, { bl: 1 }); q.at(snd('boltup')); q.go(.12, { b: 1 }); q.at(snd('boltback')); if (!empty) q.at(() => P.ejectCasing()); q.go(.08, { lk: 0, ...vec(handlePos({ b: 1, bl: 1 })) }); }
    else if (openFirst && rig.boltType === 'lever') { q.go(.12, { lk: 1 }); q.go(.14, { lev: 1 }); q.at(snd('lever')); q.go(.08, { lk: 0, ...vec(handlePos({ lev: 1 })) }); }
    else if (openFirst && rig.boltType !== 'none') { q.go(.12, { lk: 1 }); q.go(.1, { b: 1, sl: 1 }); q.at(snd('boltback')); q.go(.08, { lk: 0, ...vec(handlePos({ b: 1, sl: 1 })) }); }
    let left = n;
    if (tube && empty && rig.boltType === 'reciprocate') q.set({ b: 1 });
    // empty shotgun: drop the first shell straight into the ejection port, close the action
    if (tube && empty && rig.boltType !== 'bolt') {
      const ej = rig.eject ? rig.eject.position.clone() : V3(RW * .5, RH * .1, zr - RL * .4);
      fetch('shell', 1, V3(.01, -.012, .02), { iry: .6 });
      toPose(.2, POSE.port, {}, true); q.go(.3, vec(ej.clone().add(V3(.02, .025, 0)), 'i')); q.go(.08, { ...vec(ej.clone().add(V3(-.005, 0, 0)), 'i'), iry: 0 });
      q.at(() => { if (C.item) C.item.visible = false; fill(1); }); q.at(snd('shell')); q.set({ iv: 0, lf: 0, ...vec(ej.clone().add(gI)) });
      if (rig.boltType === 'pump') { q.go(.12, { lk: 1 }); q.go(.08, { pmp: 1 }); q.go(.1, { pmp: 0 }); q.at(snd('pump')); q.go(.08, { lk: 0 }); }
      else { q.at(snd('boltfwd')); q.go(.05, { b: 0 }); } // bolt release button
      toPose(.18, pup ? POSE.bullpup : POSE.tube); left--;
    }
    for (let i = 0; i < left; i++) {
      const k = sg ? 'shell' : 'round';
      const grab = tube ? V3(.006, -.014, .028) : V3(0, .012, .01);
      const tilt = tube ? { irx: -.25, iry: 0, irz: 0 } : fromSide ? { irx: 0, iry: -.5, irz: 0 } : { irx: .15, iry: 0, irz: 0 };
      fetch(k, 1, grab, tilt, per * .2);
      q.go(per * .4, vec(port.clone().add(tube ? V3(0, -.02, .04) : fromSide ? V3(.02, 0, .01) : V3(0, .025, 0)), 'i'));
      q.go(per * .25, { ...vec(port.clone().add(tube ? V3(0, .004, -.035) : fromSide ? V3(-.012, 0, -.02) : V3(0, -.012, 0)), 'i'), irx: 0, iry: 0 }); // the thumb pushes it home
      q.at(() => { if (C.item) C.item.visible = false; if (w.reserve > 0 && w.mag < S.mag) { w.mag++; w.reserve--; P.hudDirty = true; } }); q.at(snd(sg ? 'shell' : 'magin'));
      q.set({ iv: 0, lf: 0, ...vec(port.clone().add(grab)) });
    }
    // close up
    if (openFirst && rig.boltType === 'bolt') { q.go(.12, { lk: 1 }); q.go(.12, { b: 0 }); q.at(snd('boltfwd')); q.go(.08, { bl: 0 }); q.go(.08, { lk: 0 }); }
    else if (openFirst && rig.boltType === 'lever') { q.go(.12, { lk: 1 }); q.go(.14, { lev: 0 }); q.at(snd('lever')); q.go(.08, { lk: 0 }); }
    else if (openFirst && rig.boltType !== 'none') { q.go(.12, { lk: 1 }); q.at(snd('boltfwd')); q.go(.06, { b: 0, sl: 0 }); q.go(.08, { lk: 0 }); }
    toPose(.3, POSE.rest, { lw: 0 });
    R.end0 = () => { w.cycleNeeded = false; };
    return true;
  };

  // ===== revolvers
  const revolver = () => {
    const cyl = rig.cyl, n = Math.max(1, Math.round(S.mag));
    const cylP = c => cyl ? cyl.position.clone().setX(-.045 * (c.cy || 0)) : V3(0, RH * .1, -.022);
    const face = V3(0, 0, .024 + ((G.CAL[wp.cal] || {}).cs || [.03])[0] / 2);
    const spent = Math.min(n, need);
    const gate = GATE_REV.includes(wp.id) || (ord <= 0 && !TOPBREAK.includes(wp.id) && !(m.x || []).includes('topbreak'));
    const brk = TOPBREAK.includes(wp.id) || (m.x || []).includes('topbreak');
    C.cylPos = cylP;
    POUCH = V3(-.14, -.2, .12);
    if (gate) { // Nagant / Single Action: open the loading gate, punch each empty out with the rod, load each chamber
      toPose(.25, POSE.revOpen, { lw: 1, lcy: 1 }); q.at(snd('cover'));
      for (let i = 0; i < spent; i++) { q.go(.12, { cyr: (i + 1) * 2 * PI / n }); q.at(snd('mode')); q.at(() => P.ejectCasing(true)); q.wait(.1); }
      for (let i = 0; i < spent; i++) {
        fetch('round', 1, V3(.004, .008, .016));
        const gp = cylP({}).add(V3(RW * .3, -RH * .12, .04));
        q.go(.22, vec(gp.clone().add(V3(.01, 0, .02)), 'i')); q.go(.06, vec(gp, 'i'));
        q.at(() => { if (C.item) C.item.visible = false; fill(1); }); q.at(snd('magin')); q.set({ iv: 0, lf: 0, ...vec(gp.clone().add(gI)) });
        q.go(.08, { cyr: (spent + i + 1) * 2 * PI / n });
      }
      q.at(snd('cover')); toPose(.25, POSE.rest, { lw: 0, lcy: 0 });
      return;
    }
    // swing-out (or top-break): open, muzzle up, eject, muzzle down, reload, close
    toPose(.22, POSE.revOpen, { lw: 1, lcy: 1 });
    q.at(snd('cyl')); q.go(.12, brk ? { brk: 1 } : { cy: 1 });
    if (brk) q.at(() => { for (let i = 0; i < spent; i++) setTimeout(() => P.ejectCasing(true), i * 20); }); // the extractor star throws the empties
    else { toPose(.2, POSE.revUp); q.go(.1, { lcy: .6, ly: q.val('ly') + .02 }); q.at(() => { for (let i = 0; i < spent; i++) setTimeout(() => P.ejectCasing(true), i * 20); }); q.at(snd('shell')); q.wait(.08); }
    toPose(.2, POSE.revOpen, { lcy: 0, ...vec(POUCH) });
    const modern = ord >= 2 || wp.id === 'sw1917';
    if (modern && spent >= n - 1) { // speedloader / moon clip
      const k = wp.id === 'sw1917' ? 'moon' : 'speedloader';
      fetch(k, n, V3(0, 0, face.z + .02), {}, .08);
      const cp = cylP({ cy: brk ? 0 : 1 }).add(face);
      q.go(.3, vec(cp.clone().add(V3(0, 0, .03)), 'i')); q.go(.1, vec(cp.clone().add(V3(0, 0, -.012)), 'i'));
      if (k === 'speedloader') { q.go(.08, { irz: .5 }); q.at(snd('magin')); q.at(() => { if (C.item) { C.item.userData.rounds.forEach(r => r.visible = false); } fill(); }); q.go(.1, vec(cp.clone().add(V3(-.02, -.02, .04)), 'i')); q.at(flingItem(V3(-.4, -1, .4))); q.set({ iv: 0 }); }
      else { q.at(snd('magin')); q.at(() => { if (C.item) C.item.visible = false; fill(); }); q.set({ iv: 0 }); }
      q.set({ lf: 0, ...vec(cp.clone().add(gI)) });
    } else { // loose rounds, two at a time
      for (let i = 0; i < spent; i += 2) {
        const k2 = Math.min(2, spent - i);
        fetch('loose', k2, V3(0, .006, .015));
        const cp = cylP({ cy: brk ? 0 : 1 }).add(face).add(V3(0, .004, 0));
        q.go(.26, vec(cp.clone().add(V3(0, .01, .02)), 'i')); q.go(.07, vec(cp, 'i'));
        q.at(() => { if (C.item) C.item.visible = false; fill(k2); }); q.at(snd('magin')); q.set({ iv: 0, lf: 0, ...vec(cp.clone().add(gI)) });
      }
    }
    toPose(.16, POSE.revOpen, { lcy: 1 }); q.at(snd('cyl')); q.go(.1, brk ? { brk: 0 } : { cy: 0 }); q.go(.08, { cyr: 2 * PI / n * (h > .5 ? 1 : 0) });
    toPose(.22, POSE.rest, { lw: 0, lcy: 0 });
  };

  // ===== belt-fed machine guns: cover up, belt out, box / drum / pouch swapped, belt laid, cover slammed, charged
  const belt = () => {
    const tray = V3(-RW * .5 - .01, (rig.cover ? rig.cover.position.y : top) + .006, rig.cover ? rig.cover.position.z - RL * .25 : zr - RL * .45);
    const latch = rig.cover ? rig.cover.position.clone().add(V3(0, .02, .01)) : V3(0, top + .02, zr);
    const hasBox = rig.mag && !rig.magFixed && /beltbox|beltdrum|beltpouch/.test(mt);
    toPose(.24, POSE.belt, { lw: 1, ...vec(latch) });
    q.at(snd('cover')); q.go(.14, { cov: 1, ly: latch.y + .06, lz: latch.z - .03 });
    if (!empty) { // strip the old belt off the tray
      q.at(setItem('belt', 6)); GI(V3(-.01, .01, .01));
      q.set({ ...vec(tray, 'i'), irx: 0, iry: 0, irz: 0, iv: 1, lf: 1 });
      q.go(.22, { ...vec(tray.clone().add(V3(-.12, .05, .06)), 'i'), irz: .6 }); q.at(flingItem(V3(-1, .5, .3))); q.set({ iv: 0, lf: 0, ...vec(tray.clone().add(V3(-.12, .05, .06)).add(gI)) });
    }
    if (hasBox) { // swap the ammunition box / drum / pouch
      const ax = V3(-.4, -1, 0).normalize(); GM(ax.clone().multiplyScalar(.05)); GI(gM);
      q.go(.18, { lm: 1 }); q.at(snd('magout')); q.go(.14, vec(ax.clone().multiplyScalar(.1), 'm'));
      if (ord >= 3 || empty) { q.at(() => P.dropMag()); q.set({ mv: 0, lm: 0, ...vec(home.clone().add(ax.clone().multiplyScalar(.15))) }); }
      else { q.go(.24, vec(POUCH.clone().sub(home), 'm')); q.set({ mv: 0, lm: 0, ...vec(POUCH.clone().add(gM)) }); }
      handTo(.22, POUCH);
      q.at(setItem('mag')); q.set({ ...vec(POUCH.clone().sub(gI), 'i'), irx: hrot.x + .3, iry: hrot.y, irz: hrot.z + .3, iv: 1, lf: 1 });
      q.go(.4, { ...vec(home.clone().add(ax.clone().multiplyScalar(.06)), 'i'), irx: hrot.x, irz: hrot.z }); q.go(.14, vec(home, 'i'));
      q.at(() => { if (C.item) C.item.visible = false; }); q.at(snd('magin')); q.set({ iv: 0, mv: 1, mx: 0, my: 0, mz: 0, lf: 0, ...vec(home.clone().add(gI)) });
    }
    // lay the first rounds of the new belt across the feed tray
    const src = hasBox ? home.clone().add(V3(-.03, .02, 0)) : POUCH;
    GI(V3(-.004, .012, .012)); handTo(.2, src.clone().add(gI)); q.at(setItem('belt', 7));
    q.set({ ...vec(src, 'i'), irx: 0, iry: 0, irz: -.8, iv: 1, lf: 1 });
    q.go(.32, { ...vec(tray.clone().add(V3(-.03, .03, 0)), 'i'), irz: -.2 }); q.go(.14, { ...vec(tray, 'i'), irz: 0 });
    q.at(snd('belt')); q.at(() => fill());
    q.set({ lf: 0, ...vec(tray.clone().add(gI)) });
    // slam the cover
    handTo(.16, latch.clone().add(V3(0, .07, -.03)));
    q.go(.1, { cov: 0, ...vec(latch) }); q.at(snd('cover'));
    q.at(() => { if (C.item) C.item.visible = false; }); q.set({ iv: 0 });
    // the belt stays visible on the tray only until the cover closes
    toPose(.12, POSE.rifle, {});
    if (empty || h > .5) { q.go(.16, { lk: 1 }); q.go(.12, { b: 1 }); q.at(snd('boltback')); q.go(.1, { b: wp.act === 'auto_ob' ? 1 : 0 }); if (wp.act !== 'auto_ob') q.at(snd('boltfwd')); q.go(.08, { lk: 0 }); if (wp.act === 'auto_ob') q.set({ b: 0 }); }
    toPose(.24, POSE.rest, { lw: 0 });
  };

  // ===== Lewis / DP-28 pan magazines on top
  const pan = () => {
    const up = V3(0, 1, 0); GM(V3(-.05, .01, 0)); GI(gM);
    toPose(.22, POSE.top, { lw: 1, lm: 1 });
    q.at(snd('magout')); q.go(.1, { mry: .25 }); q.go(.16, vec(up.clone().multiplyScalar(.06), 'm'));
    q.go(.26, { ...vec(POUCH.clone().sub(home), 'm'), mrz: .8 }); q.set({ mv: 0, lm: 0, ...vec(POUCH.clone().add(gM)) });
    q.at(setItem('mag')); q.set({ ...vec(POUCH.clone().sub(gI), 'i'), irx: hrot.x, iry: hrot.y + .5, irz: hrot.z + .6, iv: 1, lf: 1 });
    q.go(.42, { ...vec(home.clone().add(V3(0, .05, 0)), 'i'), irz: hrot.z, iry: hrot.y + .3 }); q.go(.14, { ...vec(home, 'i') });
    q.go(.12, { iry: hrot.y }); q.at(snd('magin')); q.at(() => { if (C.item) C.item.visible = false; fill(); });
    q.set({ iv: 0, mv: 1, mx: 0, my: 0, mz: 0, mrz: 0, mry: 0, lf: 0, lm: 1 });
    if (empty) { q.go(.1, { lm: 0, ...vec(home.clone().add(gM)) }); charge(); }
    toPose(.22, POSE.rest, { lw: 0, lm: 0 });
  };

  // ===== FN P90: release behind the magazine, lift the rear, slide it back; new one front first, press the rear down
  const p90 = () => {
    GM(V3(0, .012, .05)); GI(gM);
    toPose(.22, POSE.pupTop, { lw: 1, lm: 1 });
    q.at(snd('magout')); q.go(.12, { mrx: -.25, my: .01 }); q.go(.14, { mz: .1, my: .03 });
    if (empty) { q.at(() => P.dropMag()); q.set({ mv: 0, lm: 0, ...vec(home.clone().add(V3(0, .03, .1)).add(gM)) }); }
    else { q.go(.24, vec(POUCH.clone().sub(home), 'm')); q.set({ mv: 0, lm: 0, ...vec(POUCH.clone().add(gM)) }); }
    handTo(.2, POUCH);
    q.at(setItem('mag')); q.set({ ...vec(POUCH.clone().sub(gI), 'i'), irx: hrot.x - .4, iry: hrot.y, irz: hrot.z, iv: 1, lf: 1 });
    q.go(.32, vec(home.clone().add(V3(0, .025, .01)), 'i')); q.go(.1, { ...vec(home.clone().add(V3(0, .006, 0)), 'i'), irx: hrot.x - .2 }); q.go(.1, { ...vec(home, 'i'), irx: hrot.x });
    q.at(snd('magin')); q.at(() => { if (C.item) C.item.visible = false; fill(); }); q.set({ iv: 0, mv: 1, mx: 0, my: 0, mz: 0, mrx: 0, lf: 0, lm: 1 });
    if (empty) { q.go(.1, { lm: 0, ...vec(V3(-RW * .5 - .02, bot + .01, zf + .05)) }); q.go(.08, { b: 1 }); q.at(snd('boltback')); q.go(.05, { b: 0 }); q.at(snd('boltfwd')); }
    toPose(.22, POSE.rest, { lw: 0, lm: 0 });
  };

  // ===== H&K G11: horizontal caseless magazine slid in from the front over the barrel, then the crank
  const g11 = () => {
    GM(V3(0, .02, -.04)); GI(gM);
    toPose(.22, POSE.top, { lw: 1, lm: 1 });
    q.at(snd('magout')); q.go(.2, { mz: -.16, my: .01 });
    q.go(.24, vec(POUCH.clone().sub(home), 'm')); q.set({ mv: 0, lm: 0, ...vec(POUCH.clone().add(gM)) });
    q.at(setItem('mag')); q.set({ ...vec(POUCH.clone().sub(gI), 'i'), irx: hrot.x, iry: hrot.y, irz: hrot.z, iv: 1, lf: 1 });
    q.go(.32, vec(home.clone().add(V3(0, .01, -.17)), 'i')); q.go(.18, vec(home, 'i'));
    q.at(snd('magin')); q.at(() => { if (C.item) C.item.visible = false; fill(); }); q.set({ iv: 0, mv: 1, mx: 0, my: 0, mz: 0, lf: 0, ...vec(home.clone().add(gI)) });
    q.go(.16, { lk: 1 }); q.go(.4, { crk: 1 }); q.at(snd('boltback')); q.go(.1, { lk: 0 });
    toPose(.22, POSE.rest, { lw: 0 });
  };

  // ===== Jackhammer cassette, Bizon / Hornet helical magazines
  const swapPivot = (pivotFront) => {
    GM(pivotFront ? V3(0, -.02, .06) : V3(0, -.05, 0)); GI(gM);
    toPose(.22, POSE.rifle, { lw: 1, lm: 1 });
    q.at(snd('magout')); if (pivotFront) { q.go(.14, { mrx: -.35 }); q.go(.12, { mz: -.04, my: -.04 }); } else q.go(.16, { my: -.08 });
    if (empty && ord >= 3) { q.at(() => P.dropMag()); q.set({ mv: 0, lm: 0, ...vec(home.clone().add(V3(0, -.05, -.04)).add(gM)) }); handTo(.22, POUCH); }
    else { q.go(.26, vec(POUCH.clone().sub(home), 'm')); q.set({ mv: 0, lm: 0, ...vec(POUCH.clone().add(gM)) }); }
    q.at(setItem('mag')); q.set({ ...vec(POUCH.clone().sub(gI), 'i'), irx: hrot.x + (pivotFront ? -.35 : .2), iry: hrot.y, irz: hrot.z + .3, iv: 1, lf: 1 });
    q.go(.34, { ...vec(home.clone().add(pivotFront ? V3(0, -.03, -.03) : V3(0, -.06, 0)), 'i'), irz: hrot.z });
    if (pivotFront) { q.go(.08, vec(home, 'i')); q.go(.12, { irx: hrot.x }); } else q.go(.14, { ...vec(home, 'i'), irx: hrot.x });
    q.at(snd('magin')); q.at(() => { if (C.item) C.item.visible = false; fill(); }); q.set({ iv: 0, mv: 1, mx: 0, my: 0, mz: 0, mrx: 0, lf: 0, lm: 1 });
    if (empty) { q.go(.1, { lm: 0, ...vec(home.clone().add(gM)) }); charge(); }
    toPose(.22, POSE.rest, { lw: 0, lm: 0 });
  };

  // ===== Hotchkiss strips and the Breda 30's charger-filled side magazine
  const strip = (breda) => {
    const port = breda ? V3(RW * .5 + .03, 0, zr - RL * .55) : V3(RW * .5 + .01, -RH * .05, zr - RL * .5);
    const per = breda ? 20 : 24, n = Math.max(1, Math.ceil(need / per));
    toPose(.22, breda ? POSE.port : POSE.side, { lw: 1 });
    if (breda) { handTo(.16, port); q.go(.12, { lx: port.x + .02, lz: port.z - .04 }); q.at(snd('cover')); } // swing the magazine forward
    for (let i = 0; i < n; i++) {
      fetch('strip', breda ? 10 : 12, V3(.03, .01, .01), { iry: breda ? 0 : PI / 2, irz: breda ? PI / 2 : 0 });
      q.go(.3, vec(port.clone().add(V3(.06, 0, 0)), 'i')); q.go(.26, vec(port.clone().add(V3(-.04, 0, 0)), 'i'));
      q.at(() => { if (C.item) C.item.visible = false; fill(per); }); q.at(snd('magin')); q.set({ iv: 0, lf: 0, ...vec(port.clone().add(V3(-.04, 0, 0)).add(gI)) });
    }
    if (breda) { q.go(.12, { lz: port.z }); q.at(snd('cover')); }
    if (empty) charge();
    toPose(.22, POSE.rest, { lw: 0 });
  };

  // ===== power cells / one-piece feeds of the psycho arsenal (and anything without a removable magazine)
  const cell = () => {
    const port = V3(-RW * .5 - .02, -RH * .2, zr - RL * .3);
    toPose(.24, POSE.side, { lw: 1 });
    handTo(.16, port.clone().add(V3(-.02, 0, 0))); q.at(snd('cover'));
    q.at(setItem('cell')); GI(V3(-.02, -.02, 0));
    q.set({ ...vec(port, 'i'), irx: 0, iry: 0, irz: 0, iv: 1, lf: 1 });
    q.go(.2, vec(port.clone().add(V3(-.08, -.04, 0)), 'i')); q.at(flingItem(V3(-1, -.6, .2))); q.set({ iv: 0, lf: 0, ...vec(port.clone().add(V3(-.08, -.04, 0)).add(gI)) });
    fetch('cell', 1, gI);
    q.go(.34, vec(port.clone().add(V3(-.06, 0, 0)), 'i')); q.go(.14, vec(port, 'i'));
    q.at(snd('magin')); q.at(() => { if (C.item) C.item.visible = false; fill(); }); q.set({ iv: 0, lf: 0, ...vec(port.clone().add(gI)) });
    if (empty) charge();
    toPose(.22, POSE.rest, { lw: 0 });
  };

  // ===== muzzle-loaders: the full drill with the gun's own ramrod
  const rodL = rig.rodLen || .9, mzZ = rig.muzzleZ || -1, boreY = rig.muzzleY || .005;
  const rodDraw = (d) => { // draw the rammer out of its pipes, turn it and enter the muzzle
    q.go(d * .2, { lrod: 1 }); q.at(snd('slide'));
    q.go(d * .3, { rdz: -rodL * .98 });
    q.go(d * .25, { rdy: .06, rdz: -rodL - .12, rdf: 1 });
    q.go(d * .25, { rdy: boreY, rdz: mzZ - rodL * .97 - .02 });
  };
  const ram = (n, d) => { const deep = mzZ - rodL * .97 + Math.abs(mzZ) - .06; for (let i = 0; i < n; i++) { q.go(d * .55, { rdz: deep }); q.at(snd('boltfwd')); q.go(d * .45, { rdz: deep - .12 }); } q.go(d * .3, { rdz: deep }); };
  const rodReturn = (d) => { q.go(d * .3, { rdz: mzZ - rodL * .97 - .05 }); q.go(d * .3, { rdy: .06, rdz: -rodL - .12, rdf: 0 }); q.go(d * .25, { rdy: -.018, rdz: -rodL * .98 }); q.go(d * .25, { rdz: 0 }); q.at(snd('slide')); q.go(.1, { lrod: 0 }); };
  const muzzleLoad = () => {
    const lockK = m.lock || (wp.c === 'PST' ? 'flint' : 'flint'), pst = wp.c === 'PST';
    const MOUTH = V3(-.06, .12, .3), PAN = rig.panPos ? rig.panPos.clone() : V3(.02, .01, -.02);
    // stand the gun on its butt: muzzle just under the chin so you look down into it
    const ra = pst ? 1.0 : 1.4, D = Math.abs(mzZ) + .4, yUp = D * Math.sin(ra) - .13 * Math.cos(ra);
    const UPR = { px: -.1, py: -yUp - .06, pz: -.05, rx: ra, ry: .1, rz: .1 };
    toPose(.3, POSE.strip, { lw: 1, ...vec(hg) });
    // half-cock; open the pan (or blow on the match / wind the wheel / take a cap)
    q.at(snd('boltup')); q.go(.12, { hm: .35 });
    if (lockK === 'flint' || lockK === 'match' || lockK === 'wheel') { handTo(.18, PAN.clone().add(V3(.02, .02, 0))); q.go(.1, { fz: 1 }); q.at(snd('cover')); }
    if (lockK === 'wheel') { q.go(.35, { whl: 3 }); q.at(snd('mode')); }
    // tear the cartridge with the teeth, prime the pan
    fetch(wp.act === 'muzzle' && (G.CAL[wp.cal] || {}).paper ? 'cartridge' : 'cartridge', 1, V3(0, 0, .02));
    q.go(.28, { ...vec(MOUTH.clone().sub(V3(0, 0, .02)), 'i'), irx: -.8 }); q.at(snd('cover'));
    if (lockK !== 'cap') { q.go(.25, { ...vec(PAN.clone().add(V3(.015, .03, 0)), 'i'), irx: .9 }); q.wait(.12); q.go(.1, { fz: 0 }); q.at(snd('cover')); }
    // stand the gun up and charge the barrel: powder, ball and paper down the muzzle
    toPose(.35, UPR);
    q.go(.3, { ...vec(V3(0, boreY + .03, mzZ - .03), 'i'), irx: 1.5 }); q.wait(.25); q.at(snd('belt'));
    q.go(.12, vec(V3(0, boreY, mzZ + .02), 'i')); q.at(() => { if (C.item) C.item.visible = false; }); q.set({ iv: 0, lf: 0, ...vec(V3(0, boreY, mzZ - .02).add(V3(0, 0, .02))) });
    // the ramrod
    if (rig.rod) { rodDraw(1.1); ram(m.rifled ? 3 : 2, .45); q.at(() => fill()); rodReturn(.9); } else { q.wait(.4); q.at(() => fill()); }
    // caps go on last, at full cock
    toPose(.3, POSE.strip);
    if (lockK === 'cap') { fetch('cap', 1, V3(0, .006, 0)); q.go(.25, vec(PAN.clone().add(V3(0, .006, 0)), 'i')); q.at(() => { if (C.item) C.item.visible = false; }); q.at(snd('magin')); q.set({ iv: 0, lf: 0, ...vec(PAN.clone().add(V3(0, .012, 0))) }); }
    handTo(.15, PAN.clone().add(V3(.02, .04, .04))); q.go(.12, { hm: 1 }); q.at(snd('boltback')); q.go(.08, { hm: 0 });
    toPose(.3, POSE.rest, { lw: 0 });
  };
  // ===== cannon drill: worm and sponge, cartridge, shot, ram, prick and prime the vent
  const cannonLoad = () => {
    const bore = m.cal || .1, L = m.L || 1.5, mz = rig.muzzleZ != null ? rig.muzzleZ / (rig.vmScale || 1) : -L;
    const M = V3(0, 0, -L), T = { px: -.04, py: .06, pz: -.05, rx: .12, ry: .45, rz: .05 };
    toPose(.4, T, { lw: 1 });
    const tool = (k, d, twist) => { q.at(setItem(k)); q.set({ ...vec(M.clone().add(V3(bore * 3, 0, -L * .2)), 'i'), irx: 0, iry: PI, irz: 0, iv: 1, lf: 0 }); q.go(d * .3, vec(M.clone().add(V3(0, 0, -bore * .5)), 'i')); q.go(d * .3, { iz: M.z + L * .85 }); if (twist) { q.go(d * .1, { irz: 3 }); q.at(snd('cover')); } q.go(d * .3, { iz: M.z - bore * .5, irz: 0 }); q.at(() => { if (C.item) C.item.visible = false; }); q.set({ iv: 0 }); };
    tool('worm', 1.2, true); tool('sponge', 1.3, true);
    const load = (k) => { q.at(setItem(k)); q.set({ ...vec(M.clone().add(V3(bore * 4, -bore * 2, -.3)), 'i'), irx: 0, iry: 0, irz: 0, iv: 1, lf: 0 }); q.go(.5, vec(M.clone().add(V3(0, 0, -bore)), 'i')); q.go(.15, vec(M.clone().add(V3(0, 0, bore * .5)), 'i')); q.at(snd('magin')); q.set({ iv: 0, lf: 0 }); };
    if (!(G.CAL[wp.cal] || {}).stone || true) load('bag');
    load('shot');
    q.at(setItem('rammer')); q.set({ ...vec(M.clone().add(V3(bore * 3, 0, -L * .2)), 'i'), irx: 0, iry: PI, irz: 0, iv: 1, lf: 0 });
    q.go(.4, vec(M.clone().add(V3(0, 0, -bore * .5)), 'i')); q.go(.5, { iz: M.z + L * .85 }); q.at(snd('boltfwd')); q.go(.2, { iz: M.z + L * .7 }); q.go(.2, { iz: M.z + L * .85 }); q.at(snd('boltfwd')); q.at(() => fill());
    q.go(.4, { iz: M.z - bore * .5 }); q.at(() => { if (C.item) C.item.visible = false; }); q.set({ iv: 0, lf: 0 });
    // prick the cartridge through the vent and prime it
    const V = rig.ventPos ? rig.ventPos.clone() : V3(0, bore, 0);
    handTo(.4, V.clone().add(V3(0, .05, 0))); q.go(.12, { ly: V.y + .01 }); q.at(snd('mode')); q.go(.12, { ly: V.y + .05 });
    q.at(snd('belt')); q.wait(.2);
    toPose(.35, POSE.rest, { lw: 0 });
  };
  // ===== breech-loading artillery: open the breech, eject the case, load shell (and bags), ram, close
  const breechLoad = () => {
    const bore = m.cal || .1, s0 = rig.vmScale || 1;
    const B = V3(0, 0, bore * .3), crate = V3(-bore * 6 - .2, -bore * 4, bore * 4);
    const T = { px: -.03, py: .05, pz: .02, rx: .1, ry: .35, rz: .05 };
    const cased = !(G.CAL[wp.cal] || {}).bag;
    toPose(.3, T, { lw: 1 });
    if (rig.breech) { handTo(.25, B.clone().add(V3(bore * 1.6, bore * .6, 0))); q.go(.3, rig.breechSlide ? { brx: bore * 2.6 } : { brr: 1.2 }); q.at(snd('boltback')); if (cased) q.at(() => P.ejectCasing()); }
    else if (m.kind === 'recoilless') { handTo(.25, V3(bore, 0, bore * 2)); q.go(.3, { brr: 1.4 }); q.at(snd('boltback')); }
    // the shell from the ammunition crate (fixed rounds carry their own case)
    q.at(setItem('shot')); GI(V3(bore * .5, 0, 0)); q.set({ ...vec(crate, 'i'), irx: 0, iry: 0, irz: 0, iv: 1, lf: 1 });
    q.go(.55, vec(B.clone().add(V3(0, bore * .2, bore * 6)), 'i'));
    q.go(.3, vec(B.clone().add(V3(0, 0, -bore * 1.5)), 'i')); q.at(snd('magin'));
    q.at(() => { if (C.item) C.item.visible = false; fill(1); }); q.set({ iv: 0, lf: 0, ...vec(B.clone().add(V3(bore * .5, 0, -bore * 1.5))) });
    if (!cased) { q.at(setItem('bag')); GI(V3(bore * .5, 0, 0)); q.set({ ...vec(crate, 'i'), irx: 0, iry: 0, irz: 0, iv: 1, lf: 1 }); q.go(.45, vec(B.clone().add(V3(0, 0, bore * 3)), 'i')); q.go(.2, vec(B.clone().add(V3(0, 0, -bore)), 'i')); q.at(snd('belt')); q.at(() => { if (C.item) C.item.visible = false; }); q.set({ iv: 0, lf: 0 }); }
    if (rig.breech || m.kind === 'recoilless') { handTo(.2, B.clone().add(V3(bore * 1.6, bore * .6, 0))); q.go(.18, { brx: 0, brr: 0 }); q.at(snd('boltfwd')); }
    q.at(() => fill());
    toPose(.3, POSE.rest, { lw: 0 });
  };
  // ===== mortars: hang the bomb over the muzzle, let go, duck
  const mortarLoad = () => {
    const bore = m.cal || .08, mzP = V3(0, rig.muzzleY / (rig.vmScale || 1), rig.muzzleZ / (rig.vmScale || 1));
    const T = { px: -.02, py: -.02, pz: -.04, rx: -.15, ry: .2, rz: .05 };
    toPose(.3, T, { lw: 1 });
    fetch('shot', 1, V3(0, -bore * .2, bore * 2.2));
    q.go(.5, { ...vec(mzP.clone().add(V3(0, bore * 3.5, 0)), 'i'), irx: -1.5 });
    q.go(.15, vec(mzP.clone().add(V3(0, bore * 1.2, 0)), 'i')); q.at(snd('belt'));
    q.go(.12, vec(mzP.clone().add(V3(0, -bore * .5, bore * .4)), 'i')); q.at(() => { if (C.item) C.item.visible = false; fill(); }); q.set({ iv: 0, lf: 0, ...vec(mzP.clone().add(V3(0, bore * 1.5, 0))) });
    handTo(.25, mzP.clone().add(V3(-bore * 4, -bore * 2, bore * 6))); toPose(.2, { px: -.02, py: -.08, pz: .02, rx: -.3, ry: .25, rz: .05 }); q.wait(.15);
    toPose(.3, POSE.rest, { lw: 0 });
  };
  // ===== break-actions: top lever, barrels drop, ejectors kick the shells out, two in, snap shut
  const breakLoad = () => {
    const nb = Math.max(1, Math.round(S.mag)), pst = wp.c === 'PST';
    const brA = rig.brkOpen || -.6, breechF = V3(0, .03, -.05);
    toPose(.22, pst ? POSE.pistol : { px: -.03, py: .07, pz: .03, rx: .25, ry: .15, rz: -.25 }, { lw: 1 });
    q.at(snd('boltup')); q.go(.1, { tlv: .6 });
    q.go(.16, { brk: 1 }); q.at(snd('cover'));
    q.at(() => { const n = Math.min(nb, S.mag - w.mag + (empty ? 0 : 0)); for (let i = 0; i < Math.max(1, nb - w.mag); i++) setTimeout(() => P.ejectCasing(), i * 30); w.reserve += w.mag; w.mag = 0; P.hudDirty = true; });
    q.go(.06, { tlv: 0 });
    for (let i = 0; i < nb; i += 2) {
      const k = Math.min(2, nb - i);
      fetch('loose', k, V3(0, .006, .03), { irx: 0 }, .22);
      const bp = breechF.clone().add(V3(0, Math.sin(-brA) * .02, .06));
      q.go(.28, vec(bp.clone().add(V3(0, .03, .02)), 'i')); q.go(.08, vec(bp, 'i'));
      q.at(() => { if (C.item) C.item.visible = false; fill(k); }); q.at(snd('shell')); q.set({ iv: 0, lf: 0, ...vec(bp.clone().add(V3(0, .006, .03))) });
    }
    q.go(.12, { brk: 0, ...vec(hg) }); q.at(snd('boltfwd'));
    toPose(.22, POSE.rest, { lw: 0 });
  };
  // ===== single-shot breechloaders: open the block, extract, cartridge in, close (prime the pan on flintlock breechloaders)
  const fallingLoad = () => {
    const fk = rig.fkind || 'martini', flint = !!wp.lock;
    const BR = V3(0, .02, -.01);
    toPose(.22, POSE.strip, { lw: 1 });
    if (rig.hammer && (fk === 'trapdoor' || fk === 'rolling' || fk === 'sharps' || flint)) { handTo(.15, V3(.012, .04, .05)); q.go(.1, { hm: .4 }); q.at(snd('boltup')); }
    if (fk === 'martini' || fk === 'sharps') { handTo(.15, V3(0, -.06, .08)); q.go(.14, { flv: 1, brr: fk === 'martini' ? .5 : 0, bry: fk === 'sharps' ? -.03 : 0 }); }
    else if (fk === 'trapdoor') { handTo(.15, V3(0, .04, .02)); q.go(.14, { brr: -1.6 }); }
    else if (fk === 'snider') { handTo(.15, V3(.02, .02, .02)); q.go(.14, { bryaw: 1.6 }); }
    else if (fk === 'rolling') { q.go(.14, { brr: .9 }); }
    else if (fk === 'screw') { handTo(.15, V3(0, -.05, .04)); q.go(.3, { bry: -.04 }); }
    else if (fk === 'tipup') { handTo(.15, V3(0, .03, .03)); q.go(.14, { brr: -.5 }); }
    q.at(snd('boltback')); if (!flint) q.at(() => P.ejectCasing());
    fetch(flint ? 'shot' : 'round', 1, V3(0, .008, .02));
    q.go(.28, vec(BR.clone().add(V3(0, .03, .02)), 'i')); q.go(.1, vec(BR.clone().add(V3(0, 0, -.03)), 'i'));
    q.at(() => { if (C.item) C.item.visible = false; fill(1); }); q.at(snd('magin')); q.set({ iv: 0, lf: 0, ...vec(BR.clone().add(V3(0, .01, 0))) });
    if (flint) { fetch('cartridge', 1, V3(0, 0, .02)); q.go(.2, vec(BR.clone().add(V3(0, .04, 0)), 'i')); q.wait(.12); q.at(() => { if (C.item) C.item.visible = false; }); q.set({ iv: 0, lf: 0 }); }
    q.go(.14, { flv: 0, brr: 0, bry: 0, bryaw: 0 }); q.at(snd('boltfwd'));
    if (rig.hammer) { q.go(.1, { hm: 1 }); q.at(snd('boltup')); q.go(.06, { hm: 0 }); }
    toPose(.22, POSE.rest, { lw: 0 });
  };
  // ===== cap-and-ball revolvers: powder, ball and lever-ram each chamber, then a cap on every nipple
  const capRev = () => {
    const n = Math.max(1, Math.round(S.mag)), cylP = rig.cyl ? rig.cyl.position.clone() : V3(0, RH * .1, -.022);
    const FRONT = cylP.clone().add(V3(0, .006, -.03)), BACK = cylP.clone().add(V3(0, .006, .028));
    toPose(.3, POSE.revOpen, { lw: 1 }); q.at(snd('boltup')); q.go(.1, { hm: .3 });
    const k = Math.min(n, Math.max(1, S.mag - w.mag));
    for (let i = 0; i < k; i++) {
      q.go(.08, { cyr: (i + 1) * 2 * PI / n }); q.at(snd('mode'));
      fetch('flask', 1, V3(0, 0, .06), { irx: .6 }, .15); q.go(.15, vec(FRONT.clone().add(V3(0, .04, -.05)), 'i')); q.wait(.08); q.at(snd('belt'));
      q.at(setItem('round')); q.set({ ...vec(FRONT.clone().add(V3(0, .03, -.02)), 'i'), irx: 0, iv: 1 }); GI(V3(0, .01, .01)); q.go(.12, vec(FRONT, 'i'));
      q.at(() => { if (C.item) C.item.visible = false; fill(1); }); q.set({ iv: 0, lf: 0, ...vec(FRONT.clone().add(V3(0, -.03, .02))) }); q.go(.1, { ly: FRONT.y - .05 }); q.at(snd('boltfwd')); // loading lever
    }
    for (let i = 0; i < k; i++) { fetch('cap', 1, V3(0, .004, 0), {}, .12); q.go(.1, vec(BACK.clone().add(V3(0, .006, 0)), 'i')); q.at(() => { if (C.item) C.item.visible = false; }); q.at(snd('magin')); q.set({ iv: 0, lf: 0 }); q.go(.05, { cyr: (k + i + 1) * 2 * PI / n }); }
    toPose(.3, POSE.rest, { lw: 0, hm: 0 });
  };
  // ===== swap a pre-loaded chamber (swivel gun) or cylinder (Puckle gun)
  const chamberSwap = () => {
    const part = rig.breech || rig.drum; if (!part) return cell();
    const home0 = part.position.clone(), up = V3(0, .2, .15);
    toPose(.3, POSE.side, { lw: 1 });
    handTo(.2, home0.clone().add(V3(0, .05, 0))); q.at(snd('cover'));
    q.go(.3, { ...vec(up, 'br') }); q.at(snd('magout'));
    q.go(.25, { ...vec(up.clone().add(V3(-.3, -.3, .2)), 'br') }); q.set({ brv: 0 });
    q.at(setItem('part', part)); GI(V3(0, .05, 0)); q.set({ ...vec(home0.clone().add(V3(-.3, -.1, .35)), 'i'), irx: 0, iry: 0, irz: 0, iv: 1, lf: 1 });
    q.go(.4, vec(home0.clone().add(up), 'i')); q.go(.25, vec(home0, 'i')); q.at(snd('magin'));
    q.at(() => { if (C.item) C.item.visible = false; fill(); }); q.set({ iv: 0, lf: 0, brv: 1, brx: 0, bry: 0, brz: 0, ...vec(home0.clone().add(V3(0, .05, 0))) });
    q.go(.1, { ly: home0.y + .02 }); q.at(snd('boltfwd')); q.go(.1, { ly: home0.y + .06 }); q.at(snd('boltfwd')); // wedge hammered home
    toPose(.3, POSE.rest, { lw: 0 });
  };
  // ===== Armstrong screw breech
  const screwBreech = () => {
    const bore = m.cal || .076, B = rig.breech ? rig.breech.position.clone() : V3(0, 0, .1);
    toPose(.3, { px: -.03, py: .05, pz: .02, rx: .1, ry: .35, rz: .05 }, { lw: 1 });
    handTo(.2, B.clone().add(V3(bore, 0, .03))); q.go(.4, { brr2: 6, brz: .06 }); q.at(snd('boltback'));
    q.at(setItem('shot')); GI(V3(bore * .5, 0, 0)); q.set({ ...vec(B.clone().add(V3(-.3, -.2, .3)), 'i'), irx: 0, iry: 0, irz: 0, iv: 1, lf: 1 });
    q.go(.45, vec(B.clone().add(V3(0, 0, .1)), 'i')); q.go(.2, vec(B.clone().add(V3(0, 0, -.15)), 'i')); q.at(snd('magin')); q.at(() => { if (C.item) C.item.visible = false; fill(); }); q.set({ iv: 0, lf: 0 });
    handTo(.2, B.clone().add(V3(bore, 0, .03))); q.go(.4, { brr2: 0, brz: 0 }); q.at(snd('boltfwd'));
    toPose(.3, POSE.rest, { lw: 0 });
  };
  // ===== ammunition clips into an automatic cannon's feed guides (Bofors, Flak, naval mounts)
  const clipFeed = () => {
    const bore = m.cal || .04, per = Math.min(10, Math.max(1, wp.id === 'bofors40' ? 4 : Math.round(S.mag / 4))), n = Math.min(4, Math.ceil(need / per));
    const G0 = V3(0, bore * 4, bore * 2);
    toPose(.3, { px: -.03, py: .05, pz: .02, rx: .05, ry: .3, rz: .1 }, { lw: 1 });
    for (let i = 0; i < n; i++) {
      q.go(.2, { ...vec(G0.clone().add(V3(-bore * 6, -bore * 4, bore * 4))), lf: 0 });
      q.at(setItem('clip', Math.min(per, 6))); GI(V3(0, bore * 3, 0)); q.set({ ...vec(G0.clone().add(V3(-bore * 6, -bore * 7, bore * 4)), 'i'), irx: 0, iry: 0, irz: 0, iv: 1, irn: 99, lf: 1 });
      q.go(.4, vec(G0.clone().add(V3(0, bore * 2, 0)), 'i')); q.go(.15, vec(G0, 'i')); q.at(snd('magin'));
      q.at(() => { if (C.item) C.item.visible = false; fill(i === n - 1 ? undefined : per); }); q.set({ iv: 0, lf: 0, ...vec(G0.clone().add(V3(0, bore * 3, 0))) });
    }
    toPose(.3, POSE.rest, { lw: 0 });
  };
  // ===== Hwacha / Congreve: arrows into the rack, fuses lit later
  const arrows = () => {
    const n = Math.min(4, Math.max(1, Math.ceil(need / 25)));
    toPose(.3, POSE.side, { lw: 1 });
    for (let i = 0; i < n; i++) { fetch('loose', 5, V3(0, .02, .4), { irx: .35 }, .3); q.go(.45, vec(V3(-.2 + i * .12, .1, -.1), 'i')); q.go(.2, vec(V3(-.2 + i * .12, .05, -.4), 'i')); q.at(snd('belt')); q.at(() => { if (C.item) C.item.visible = false; fill(i === n - 1 ? undefined : 25); }); q.set({ iv: 0, lf: 0 }); }
    toPose(.3, POSE.rest, { lw: 0 });
  };
  // ===== Girandoni air rifle: balls poured into the side magazine, a fresh reservoir screwed on
  const airLoad = () => {
    toPose(.3, POSE.port, { lw: 1 });
    const port = V3(.02, .01, -.08);
    fetch('loose', 6, V3(0, .01, .02), { iry: PI / 2 }, .2); q.go(.35, vec(port.clone().add(V3(.02, .04, 0)), 'i')); q.go(.3, { iy: port.y }); q.at(snd('belt')); q.at(() => { if (C.item) C.item.visible = false; fill(); }); q.set({ iv: 0, lf: 0 });
    fetch('cell', 1, V3(0, -.02, 0), {}, .2); q.go(.35, vec(V3(0, -.04, .42), 'i')); q.go(.3, { irz: 4 }); q.at(snd('magin')); q.at(() => { if (C.item) C.item.visible = false; }); q.set({ iv: 0, lf: 0 });
    toPose(.3, POSE.rest, { lw: 0 });
  };
  // ===== Spencer: pull the magazine tube out of the butt, drop in seven, push it home
  const buttLoad = () => {
    const BT = rig.stockEnd ? rig.stockEnd.clone() : V3(0, -.04, .42);
    toPose(.3, { px: -.03, py: .1, pz: .06, rx: -.3, ry: .25, rz: -.3 }, { lw: 1 });
    handTo(.2, BT.clone().add(V3(0, -.02, .02))); q.go(.2, { lz: BT.z + .12 }); q.at(snd('magout'));
    fetch('loose', 7, V3(0, .01, .02), { irx: 1.4 }, .2); q.go(.35, vec(BT.clone().add(V3(0, 0, .05)), 'i')); q.go(.2, { iz: BT.z - .05 }); q.at(snd('belt')); q.at(() => { if (C.item) C.item.visible = false; fill(); }); q.set({ iv: 0, lf: 0 });
    handTo(.2, BT.clone().add(V3(0, -.02, .12))); q.go(.2, { lz: BT.z + .01 }); q.at(snd('magin'));
    toPose(.3, POSE.rest, { lw: 0 });
  };

  // ----- pick and build
  let fixedDur = false;
  if (kind === 'mag') magReload();
  else if (kind === 'stripper') stripper(false);
  else if (kind === 'stripsemi') stripper(true);
  else if (kind === 'mannlicher') mannlicher();
  else if (kind === 'garand') garand();
  else if (kind === 'tube' || kind === 'single') { if (!singles()) return { dur: .1, fn: () => {}, ev: [], end: null }; fixedDur = true; }
  else if (kind === 'rev') revolver();
  else if (kind === 'muzzle') muzzleLoad();
  else if (kind === 'cannon') cannonLoad();
  else if (kind === 'breech') breechLoad();
  else if (kind === 'mortar') mortarLoad();
  else if (kind === 'break') breakLoad();
  else if (kind === 'falling') fallingLoad();
  else if (kind === 'caprev') capRev();
  else if (kind === 'chamber') chamberSwap();
  else if (kind === 'screwbreech') screwBreech();
  else if (kind === 'clip') clipFeed();
  else if (kind === 'hwacha') arrows();
  else if (kind === 'air') airLoad();
  else if (kind === 'butt') buttLoad();
  else if (kind === 'belt') belt();
  else if (kind === 'pan') pan();
  else if (kind === 'p90') p90();
  else if (kind === 'g11') g11();
  else if (kind === 'cassette') swapPivot(false);
  else if (kind === 'helical') swapPivot(true);
  else if (kind === 'hotstrip') strip(false);
  else if (kind === 'breda') strip(true);
  else cell();
  if (!q.T) return { dur: .1, fn: () => {}, ev: [], end: null };
  // stripper / revolver loads scale with the number of clips or rounds; everything else fits the weapon's reload time
  const total = fixedDur || ['stripper', 'stripsemi'].includes(kind) && need > 5 ? Math.max(dur, q.T * .9) : dur;
  for (const c in q.ch) q.ch[c].sort((a, b) => a[0] - b[0]);
  const T = q.T;
  // ----- per-frame application of the channels to the viewmodel and the gun's parts
  const mag = rig.mag, cyl = rig.cyl;
  const has = c => q.ch[c] && q.ch[c].length;
  const tmp = V3(0, 0, 0);
  R.dur = total;
  R.fn = t => {
    const Tn = t * T, c = {};
    for (const k in q.ch) c[k] = trackAt(q.ch[k], Tn);
    P.anim = { px: c.px || 0, py: c.py || 0, pz: c.pz || 0, rx: c.rx || 0, ry: c.ry || 0, rz: c.rz || 0 };
    if (mag && rig.magHome && !rig.magFixed && (has('mx') || has('my') || has('mz') || has('mv') || has('mrx') || has('mry') || has('mrz'))) {
      mag.position.set(home.x + (c.mx || 0), home.y + (c.my || 0), home.z + (c.mz || 0));
      if (!rig.panSpin || has('mry')) mag.rotation.set(hrot.x + (c.mrx || 0), hrot.y + (c.mry || 0), hrot.z + (c.mrz || 0));
      mag.visible = (c.mv === undefined ? 1 : c.mv) > .5;
    }
    const it = C.item;
    if (it) {
      it.position.set(c.ix || 0, c.iy || 0, c.iz || 0); it.rotation.set(c.irx || 0, c.iry || 0, c.irz || 0); it.visible = (c.iv || 0) > .5;
      const rs = it.userData.rounds; if (rs && has('irn')) { const n = Math.round(c.irn); for (let i = 0; i < rs.length; i++) rs[i].visible = i >= rs.length - n; }
    }
    // parts
    if (rig.boltType === 'bolt' && rig.bolt && (has('b') || has('bl'))) { rig.bolt.rotation.z = (c.bl || 0) * 1.35; rig.bolt.position.z = zr - .04 + (c.b || 0) * boltBack; }
    else if (rig.bolt && has('b') && rig.boltType !== 'lever' && rig.boltType !== 'pump') rig.bolt.position.z = (c.b || 0) * (rig.boltStroke || .05);
    if (rig.charge && (has('ch') || has('chu'))) { if (m.bh === 'hk') { rig.charge.position.z = zf - .01 + (c.ch || 0) * .07; rig.charge.rotation.z = (c.chu || 0) * .5; } else rig.charge.position.z = zr + .005 + (c.ch || 0) * .06; }
    if (rig.slide && has('sl')) { rig.slide.position.z = (c.sl || 0) * (rig.slideStroke || .02); if (rig.toggleR) { const th = Math.acos(Math.max(-1, 1 - rig.slide.position.z / .064)); rig.toggleR.rotation.x = th; rig.toggleF.rotation.x = -2 * th; } }
    if (rig.cover && has('cov')) rig.cover.rotation.x = -1.3 * (c.cov || 0);
    if (cyl && (has('cy') || has('cyr') || has('brk'))) { cyl.position.x = -.045 * (c.cy || 0); cyl.position.y = (cyl.userData.y0 ?? (cyl.userData.y0 = cyl.position.y)) - (c.brk || 0) * .012; cyl.rotation.z = (c.cyr || 0); cyl.rotation.x = -(c.brk || 0) * .5; }
    if (rig.rod && (has('rdz') || has('rdf'))) { rig.rod.position.set(0, c.rdy ?? -.018, c.rdz || 0); rig.rod.rotation.y = PI * (c.rdf || 0); }
    if (rig.hammer && has('hm')) rig.hammer.rotation.x = -(c.hm || 0) * .9;
    if (rig.frizzen && has('fz')) rig.frizzen.rotation.x = -(c.fz || 0) * 1.1;
    if (rig.wheel && has('whl')) rig.wheel.rotation.x = (c.whl || 0) * 2 * PI;
    if (rig.brk && has('brk')) rig.brk.rotation.x = (rig.brkOpen || -.6) * (c.brk || 0);
    if (rig.toplever && has('tlv')) rig.toplever.rotation.y = c.tlv || 0;
    if (rig.flever && has('flv')) rig.flever.rotation.x = (c.flv || 0) * .9;
    const BRK = rig.breech || rig.drum;
    if (BRK && (has('brx') || has('bry') || has('brz') || has('brr') || has('brr2') || has('bryaw') || has('brv'))) {
      const h0 = BRK.userData.home || (BRK.userData.home = { p: BRK.position.clone(), r: BRK.rotation.clone() });
      BRK.position.set(h0.p.x + (c.brx || 0), h0.p.y + (c.bry || 0), h0.p.z + (c.brz || 0));
      BRK.rotation.set(h0.r.x + (c.brr || 0), h0.r.y + (c.bryaw || 0), h0.r.z + (c.brr2 || 0));
      BRK.visible = (c.brv ?? 1) > .5;
    }
    if (rig.lever && has('lev')) { rig.lever.rotation.x = (c.lev || 0) * .9; if (rig.bolt) rig.bolt.position.z = (c.lev || 0) * (rig.boltStroke || .05); }
    if (rig.pump && has('pmp')) { rig.pump.position.z = (c.pmp || 0) * .085; if (rig.bolt) rig.bolt.position.z = (c.pmp || 0) * .07; }
    if (rig.bolt && has('crk')) rig.bolt.rotation.x = (c.crk || 0) * 2 * PI;
    // support hand: its own path, pulled toward whatever it is holding
    const p = tmp.set(c.lx ?? hg.x, c.ly ?? hg.y, c.lz ?? hg.z);
    if (c.lm > 0 && mag) p.lerp(mag.position.clone().add((C.grabM || V3(0, -.07, 0)).clone().applyEuler(new THREE.Euler(c.mrx || 0, c.mry || 0, c.mrz || 0))), Math.min(1, c.lm));
    if (c.lf > 0 && it) p.lerp(it.position.clone().add(C.grabI || V3(0, -.05, 0)), Math.min(1, c.lf));
    if (c.lk > 0) p.lerp(handlePos(c), Math.min(1, c.lk));
    if (c.lrod > 0 && rig.rod) p.lerp(V3(0, (c.rdy ?? -.018) + .012, (c.rdz || 0) + ((c.rdf || 0) > .5 ? -.04 : -.02 - rodL * .02)), Math.min(1, c.lrod));
    if (c.lcy > 0 && C.cylPos) p.lerp(C.cylPos(c).add(V3(-.025, -.01, 0)), Math.min(1, c.lcy));
    P.lhOverride = { w: Math.min(1, c.lw || 0), p: p.clone(), rot: 0 };
  };
  R.ev = q.evs.map(([t0, fn], i) => [Math.min(.999, t0 / T), fn, i]).sort((a, b) => b[0] - a[0] || b[2] - a[2]).map(([a, f]) => [a, f]);
  const end0 = R.end0;
  R.end = () => {
    for (const it of C.items) rig.root.remove(it);
    C.items.length = 0; C.item = null;
    if (mag && rig.magHome) { mag.position.copy(home); mag.rotation.copy(hrot); mag.visible = true; }
    if (rig.cover) rig.cover.rotation.x = 0;
    if (rig.charge) { rig.charge.rotation.z = 0; rig.charge.position.z = m.bh === 'hk' ? zf - .01 : zr + .005; }
    if (rig.bolt && has('crk')) rig.bolt.rotation.x = 0;
    if (rig.bolt && rig.boltType === 'reciprocate') rig.bolt.position.z = 0;
    if (rig.slide) rig.slide.position.z = 0;
    if (rig.rod) { rig.rod.position.set(0, -.018, 0); rig.rod.rotation.y = 0; }
    if (rig.hammer && (has('hm'))) rig.hammer.rotation.x = 0; if (rig.frizzen) rig.frizzen.rotation.x = 0; if (rig.brk) rig.brk.rotation.x = 0; if (rig.toplever) rig.toplever.rotation.y = 0; if (rig.flever) rig.flever.rotation.x = 0;
    { const BRK = rig.breech || rig.drum; if (BRK && BRK.userData.home) { BRK.position.copy(BRK.userData.home.p); BRK.rotation.copy(BRK.userData.home.r); BRK.visible = true; } }
    if (cyl) { cyl.position.x = 0; cyl.rotation.x = 0; if (cyl.userData.y0 !== undefined) cyl.position.y = cyl.userData.y0; }
    w.slideLock = false;
    if (end0) end0();
  };
  R.kind = kind; R.cancel = R.cancel || false;
  return R;
};

// throw a held object (in viewmodel space) into the world so it falls and bounces
G.Player.prototype.throwObj = function (obj, vel) {
  if (!G.FX || !G.FX.casings) return;
  obj.updateMatrixWorld(true);
  const m = G.mergeByMaterial(obj);
  const p = this.vmToWorld(obj.getWorldPosition(V3()));
  m.position.copy(p);
  const cam = G.E.camera;
  m.quaternion.copy(cam.quaternion).multiply(obj.getWorldQuaternion(new THREE.Quaternion()));
  G.FX.scene.add(m);
  const v = (vel || V3(0, -1, 0)).clone().applyQuaternion(cam.quaternion).add(this.vel || V3(0, 0, 0));
  G.FX.casings.push({ m, v, w: V3(Math.random() * 6, Math.random() * 6, Math.random() * 3), life: 12, bounces: 2, ground: (x, z, y) => G.E.world.groundAt(x, z, y) + .01, shell: false });
};
G.reloadKind = w => classify(w);
G.ReloadPose = POSE;
})();
