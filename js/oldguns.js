// ============================================================================
// IRONSIGHT — models for the weapon families the main builder doesn't cover:
//   break     break-action doubles, over-unders, drillings, single-shots, M79
//   falling   single-shot breechloaders (Martini, Snider, trapdoor, rolling
//             block, Sharps, tip-up and screw-plug flintlock breechloaders)
//   musket    matchlock / wheellock / flintlock / percussion long arms,
//             blunderbusses, the Nock volley gun, the Girandoni air rifle
//   fpistol   flintlock and percussion pistols
//   cannon    muzzle-loading cannon on field, naval, slide, swivel and bed
//             carriages; old mortars; bombards
//   gatling / puckle / hwacha
//   art       modern artillery: mortars, anti-tank guns, field guns and
//             howitzers, anti-aircraft guns, recoilless rifles, siege,
//             railway and naval guns, rotary CIWS
// Everything is built at real scale in the same gun-space convention as gun.js
// (-z toward the muzzle, +x right, y up) and returns the same rig interface.
// Large pieces carry rig.vmScale so the first-person view can show them whole.
// ============================================================================
'use strict';
(function () {
const G = window.G, PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const { gBox, gCyl, gCylX, gCylY, gSph, gTor, gRBox, gProf } = G.geo;
Object.assign(G.metalColors, { bronze: '#8a6630', iron: '#2a2a2a', brass: '#b38d3c', og: '#4a5232', haze: '#7f878e', white: '#d7d9d6', sand: '#a08a62', bright: '#9aa0a6' });
Object.assign(G.woodColors, { walnut: '#5a3418', oak: '#7a5a34', maple: '#9a6a3a', painted: '#4a5232' });

const SPECIAL = new Set(['break', 'falling', 'musket', 'fpistol', 'cannon', 'mortar_old', 'gatling', 'puckle', 'hwacha', 'art']);
G.SPECIAL_T = SPECIAL;
const build0 = G.buildGun;
G.buildGun = function (wp, L, opt = {}) {
  if (!wp.m || !SPECIAL.has(wp.m.t)) return build0(wp, L, opt);
  L = L || G.defaultLoadout(wp);
  const S = G.resolveStats(wp, L, opt.st);
  const MT = opt.mats || G.gunMaterials(wp, S);
  const m = wp.m, root = new THREE.Group(); root.name = wp.id;
  const rig = { root, wp, S, L, mats: MT, animated: {}, parts: [], magFixed: true, magType: 'int', special: m.t };
  let cur = root; rig.sec = 'receiver';
  const add = (geo, mat, x = 0, y = 0, z = 0, p) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; o.userData.sec = rig.sec; (p || cur).add(o); return o; };
  const grp = (x = 0, y = 0, z = 0, p) => { const g = new THREE.Group(); g.position.set(x, y, z); (p || cur).add(g); return g; };
  const C = { add, grp, rig, MT, m, wp, S, L, setCur: g => { cur = g; } };
  // extra materials
  const solid = (col, r = .5, mt = .85) => G.linMat(new THREE.MeshStandardMaterial({ color: col, roughness: r, metalness: mt }));
  MT.bronze = solid(G.metalColors.bronze, .35, .9); MT.iron = solid('#262626', .55, .7); MT.brassF = solid('#b38d3c', .28, 1);
  MT.paint = solid(G.metalColors[m.mt] || '#4a5232', .7, .3); MT.tire = solid('#151515', .9, 0); MT.flint = solid('#3a3632', .8, 0);
  MT.oak = G.linMat(new THREE.MeshStandardMaterial({ map: G.texWood('oak'), color: '#ffffff', roughness: .8, metalness: 0 }));
  MT.glowMatch = new THREE.MeshBasicMaterial({ color: '#ff5a1a' });
  MT.barrelMat = m.mt === 'bronze' ? MT.bronze : m.mt === 'brass' ? MT.brassF : m.mt === 'iron' ? MT.iron : ['og', 'haze', 'white', 'sand', 'grey'].includes(m.mt) ? MT.paint : MT.metal;
  MT.furn = m.brass ? MT.brassF : MT.steel;
  ({ break: buildBreak, falling: buildFalling, musket: buildMusket, fpistol: buildFPistol, cannon: buildCannon, mortar_old: buildCannon, gatling: buildGatling, puckle: buildPuckle, hwacha: buildHwacha, art: buildArt })[m.t](C);
  // shared anchors
  rig.muzzle = new THREE.Object3D(); rig.muzzle.position.set(0, rig.muzzleY || 0, rig.muzzleZ); root.add(rig.muzzle);
  if (rig.muzzleDir) rig.muzzle.lookAt(rig.muzzle.position.clone().add(rig.muzzleDir));
  rig.eject = rig.eject || new THREE.Object3D(); if (!rig.eject.parent) { rig.eject.position.copy(rig.ejectPos || V3(0, .02, 0)); root.add(rig.eject); }
  rig.ejectDir = rig.ejectDir || V3(.3, .8, .6);
  rig.gripPos = rig.gripPos || V3(0, -.07, .05); rig.hgPos = rig.hgPos || V3(0, -.03, -.25);
  rig.sightX = rig.sightX || 0;
  root.traverse(o => { if (o.isMesh) rig.parts.push(o); });
  return rig;
};
// view-model fit for big pieces: scale the root and every gun-space measurement the viewmodel uses
G.vmFit = function (rig) {
  const s = rig.vmScale; if (!s || s === 1) return;
  rig.root.scale.setScalar(s);
  for (const k of ['sightH', 'sightZ', 'eyeDist', 'sightX', 'muzzleZ', 'muzzleY', 'zr', 'zf', 'top', 'bot', 'boltStroke']) if (typeof rig[k] === 'number') rig[k] *= s;
  rig.eyeDist = Math.max(rig.eyeDist, .25);
};

// ------------------------------------------------------------------ helpers
function wheel(C, r, w, x, y, z, spokes = 12, mat) { // spoked wooden or steel wheel; axis along x
  const { add, grp, MT } = C; const g = grp(x, y, z);
  add(gTor(r - w * .2, w * .2), mat || MT.oak, 0, 0, 0, g).rotation.y = PI / 2;
  add(gTor(r, w * .08), MT.iron, 0, 0, 0, g).rotation.y = PI / 2; // iron tyre
  add(gCylX(r * .14, r * .14, w * 1.6, 14), mat || MT.oak, 0, 0, 0, g);
  for (let i = 0; i < spokes; i++) { const a = i / spokes * 2 * PI; const s = add(gBox(w * .25, r * .86, w * .35), mat || MT.oak, 0, Math.cos(a) * r * .5, Math.sin(a) * r * .5, g); s.rotation.x = a; }
  return g;
}
function tyre(C, r, w, x, y, z) { // rubber tyre with steel hub (modern artillery)
  const { add, grp, MT } = C; const g = grp(x, y, z);
  add(gTor(r - w * .32, w * .32), MT.tire, 0, 0, 0, g).rotation.y = PI / 2;
  add(gCylX(r * .55, r * .55, w * .7, 18), MT.paint, 0, 0, 0, g);
  add(gCylX(r * .2, r * .2, w * .9, 12), MT.steel, 0, 0, 0, g);
  return g;
}
function lockPlate(C, kind, x, y, z, sz = 1) { // flint / match / wheel / percussion lock on the right side
  const { add, grp, MT, rig } = C;
  add(gRBox(.004, .028 * sz, .11 * sz, .004), MT.furn === MT.brassF ? MT.steel : MT.steel, x, y, z);
  const cock = rig.hammer = grp(x + .006, y + .006 * sz, z + .03 * sz); // pivot
  if (kind === 'flint') {
    add(gProf([[0, 0], [.004, .012], [-.006, .03], [-.018, .034], [-.02, .026], [-.01, .022], [-.004, .008]], .006 * sz, .001), MT.steel, 0, 0, 0, cock);
    add(gBox(.006 * sz, .006 * sz, .008 * sz), MT.flint, 0, .03 * sz, -.016 * sz, cock);
    const fz = rig.frizzen = grp(x + .006, y + .012 * sz, z - .022 * sz); // frizzen + pan cover, hinged at the front
    add(gBox(.008 * sz, .026 * sz, .004 * sz), MT.steel, 0, .013 * sz, .004 * sz, fz);
    add(gBox(.01 * sz, .003 * sz, .014 * sz), MT.steel, 0, 0, .01 * sz, fz);
    add(gBox(.012 * sz, .006 * sz, .016 * sz), MT.steel, x + .006, y + .006 * sz, z - .012 * sz); // pan
  } else if (kind === 'match') {
    add(gProf([[0, 0], [.004, .01], [-.01, .04], [-.016, .04], [-.006, .008]], .005 * sz, .001), MT.brassF, 0, 0, 0, cock);
    add(gCylY(.0025, .0025, .03, 6), C.MT.cloth || MT.rubber, 0, .04 * sz, -.012 * sz, cock);
    add(gSph(.003, 6), MT.glowMatch, 0, .055 * sz, -.012 * sz, cock); // glowing match
    add(gBox(.012 * sz, .006 * sz, .016 * sz), MT.brassF, x + .006, y + .006 * sz, z - .012 * sz);
    const fz = rig.frizzen = grp(x + .006, y + .01 * sz, z - .012 * sz); add(gBox(.012 * sz, .002, .018 * sz), MT.brassF, 0, 0, 0, fz);
  } else if (kind === 'wheel') {
    const wh = rig.wheel = grp(x + .006, y - .006 * sz, z - .01 * sz); add(gCylX(.014 * sz, .014 * sz, .006, 16), MT.steel, 0, 0, 0, wh);
    add(gProf([[0, 0], [.004, .01], [-.006, .028], [-.014, .028], [-.004, .006]], .005 * sz, .001), MT.steel, 0, 0, 0, cock);
    add(gBox(.005, .005, .006), MT.flint, 0, .028 * sz, -.012 * sz, cock);
    const fz = rig.frizzen = grp(x + .006, y + .008 * sz, z - .012 * sz); add(gBox(.012 * sz, .002, .016 * sz), MT.steel, 0, 0, 0, fz);
  } else { // percussion: hammer onto a nipple
    add(gProf([[0, 0], [.004, .01], [-.004, .026], [-.016, .03], [-.016, .024], [-.004, .018]], .006 * sz, .001), MT.steel, 0, 0, 0, cock);
    add(gCylY(.0025, .0025, .008, 8), MT.steel, x + .002, y + .012 * sz, z - .006 * sz);
  }
  rig.panPos = V3(x + .008, y + .012 * sz, z - .012 * sz);
}

// ------------------------------------------------------------------ break-action doubles and single-shots
function buildBreak(C) {
  const { add, grp, rig, MT, m, wp } = C;
  const nb = m.nb || 2, lay = m.lay || 'sxs', L = (m.B && m.B[0]) || .7, br = (m.B && m.B[1]) || .009;
  const pistol = wp.c === 'PST', wood = MT.wood;
  const rw = .045, rh = .05;
  rig.sec = 'receiver';
  add(gRBox(rw, rh, .1, .008), MT.metal, 0, -.012, 0);              // action body
  add(gRBox(rw * .9, .012, .06, .004), MT.metal, 0, .016, .04);      // top strap / tang
  const tl = rig.toplever = grp(0, .02, .05); add(gRBox(.012, .006, .032, .003), MT.steel, 0, 0, .01, tl); // top lever
  rig.sec = 'trigger';
  rig.trigger = grp(0, -.04, .03); add(gBox(.004, .018, .004), MT.steel, 0, -.009, 0, rig.trigger); if (nb > 1 && !m.single1) add(gBox(.004, .016, .004), MT.steel, 0, -.008, .014, rig.trigger);
  add(gTor(.016, .002, PI * 1.2), MT.steel, 0, -.044, .032).rotation.set(0, PI / 2, PI * .9);
  if (m.hammers) { rig.sec = 'action'; const hm = rig.hammer = grp(0, .01, .045); for (const s of nb > 1 ? [-1, 1] : [0]) add(gProf([[0, 0], [.004, .012], [-.004, .03], [-.014, .03], [-.004, .016]], .005, .001), MT.steel, s * .013, 0, 0, hm); }
  // stock
  rig.sec = 'stock';
  if (m.stk === 'grip') add(gProf([[.05, -.005], [.07, -.03], [.11, -.11], [.075, -.12], [.045, -.04], [.04, -.02]].map(([z, y]) => [z, y]), .036, .008, true), wood, 0, 0, 0);
  else if (m.stk !== 'none' && !pistol) {
    add(gProf([[.05, .01], [.12, -.0], [.4, .0], [.42, -.13], [.33, -.11], [.13, -.055], [.05, -.04]], .04, .01, true), wood, 0, 0, 0);
    add(gBox(.042, .13, .01), MT.rubber, 0, -.06, .425);
    rig.stockEnd = V3(0, -.04, .42);
  } else if (pistol) add(gProf([[.05, -.005], [.07, -.03], [.1, -.12], [.065, -.13], [.04, -.04]], .032, .008, true), wood, 0, 0, 0);
  // barrels on a hinge at the front of the action
  rig.sec = 'barrel';
  const bk = rig.brk = grp(0, -.025, -.05);
  const bpos = lay === 'ou' ? [[0, .025], [0, .025 - br * 2.3]] : lay === 'single' ? [[0, .02]] : lay === 'drill' ? [[-br * 1.15, .025], [br * 1.15, .025], [0, .025 - br * 2.2]] : [[-br * 1.15, .025], [br * 1.15, .025]];
  for (const [x, y] of bpos.slice(0, Math.max(1, nb))) { add(gCyl(br * 1.32, br * 1.12, L, 16), MT.metal, x, y, -L / 2, bk); add(gCyl(br * .9, br * .9, .004, 12), MT.rubber, x, y, -L - .001, bk); }
  if (m.bigbore) add(gCyl(br * 1.6, br * 1.5, L, 18), MT.metal, 0, .02, -L / 2, bk); // M79's fat 40 mm tube
  add(gBox(nb > 1 && lay !== 'ou' ? br * 1.2 : br * .8, .004, L), MT.steel, 0, .025 + br * 1.3, -L / 2, bk); // rib
  add(gSph(.002, 6), MT.brassF, 0, .025 + br * 1.35 + .003, -L + .01, bk); // bead
  rig.sec = 'handguard';
  if (!m.noFore) add(gRBox(.034, .026, Math.min(.24, L * .4), .008), MT.wood, 0, .025 - br * (lay === 'ou' ? 3.2 : 1.6), -.03 - Math.min(.24, L * .4) / 2, bk);
  if (m.ladder) { rig.sec = 'sights'; add(gBox(.02, .03, .004), MT.steel, 0, .06, -.06, bk); }
  rig.muzzleZ = -.05 - L; rig.muzzleY = .0; rig.zr = .05; rig.zf = -.05; rig.top = .03; rig.bot = -.04;
  rig.sightH = .025 + br * 1.4 + .003 - .025; rig.sightZ = -.05; rig.eyeDist = pistol ? .45 : .3;
  rig.gripPos = pistol ? V3(0, -.08, .08) : V3(0, -.05, .1); rig.hgPos = V3(0, -.03, -.18);
  rig.ejectPos = V3(0, .0, -.05); rig.ejectDir = V3(0, .7, 1);
  rig.boltType = 'break'; rig.brkOpen = -.6;
}

// ------------------------------------------------------------------ single-shot breechloaders
function buildFalling(C) {
  const { add, grp, rig, MT, m, wp } = C;
  const L = (m.B && m.B[0]) || .8, br = (m.B && m.B[1]) || .0072, kind = m.kind || 'martini';
  const flint = m.lock === 'flint';
  rig.sec = 'receiver';
  add(gRBox(.036, .05, .12, .006), m.mt === 'brass' ? MT.brassF : MT.metal, 0, -.01, 0);
  rig.sec = 'barrel'; add(gCyl(br * 1.6, br * 1.3, L, 14), MT.metal, 0, .005, -.06 - L / 2);
  rig.sec = 'stock';
  add(gProf([[.06, .01], [.13, .0], [.42, .005], [.44, -.13], [.34, -.11], [.13, -.06], [.06, -.04]], .04, .01, true), MT.wood, 0, 0, 0);
  rig.stockEnd = V3(0, -.04, .43);
  rig.sec = 'handguard'; add(gRBox(.034, .03, L * .7, .008), MT.wood, 0, -.006, -.06 - L * .35);
  for (const z of [-.06 - L * .3, -.06 - L * .65]) add(gTor(.017, .0025), MT.furn, 0, -.004, z);
  rig.sec = 'action';
  const bb = rig.breech = grp(0, .012, .04);
  add(gRBox(.03, .024, .05, .004), MT.steel, 0, 0, -.025, bb);
  if (kind === 'martini' || kind === 'sharps' || kind === 'rolling') { const lv = rig.flever = grp(0, -.04, .02); add(gBox(.006, .006, .11), MT.metal, 0, -.01, .05, lv); add(gTor(.018, .003, PI), MT.metal, 0, -.016, .09, lv).rotation.set(0, PI / 2, PI); }
  if (kind === 'rolling' || kind === 'trapdoor' || kind === 'sharps' || flint) { const hm = rig.hammer = grp(.012, .02, .05); add(gProf([[0, 0], [.004, .012], [-.004, .028], [-.014, .03], [-.004, .016]], .006, .001), MT.steel, 0, 0, 0, hm); }
  if (flint) lockPlate(C, 'flint', .018, 0, .04);
  rig.sec = 'trigger'; rig.trigger = grp(0, -.045, .035); add(gBox(.004, .018, .004), MT.steel, 0, -.009, 0, rig.trigger);
  rig.sec = 'sights'; add(gBox(.004, .008, .004), MT.steel, 0, .005 + br * 1.6 + .004, -.06 - L + .02); add(gBox(.012, .012, .006), MT.steel, 0, .036, -.08);
  rig.muzzleZ = -.06 - L; rig.muzzleY = .005; rig.zr = .06; rig.zf = -.06; rig.top = .02; rig.bot = -.04;
  rig.sightH = .005 + br * 1.6 + .008; rig.sightZ = -.06; rig.eyeDist = .32;
  rig.gripPos = V3(0, -.05, .1); rig.hgPos = V3(0, -.03, -.06 - L * .35);
  rig.ejectPos = V3(0, .02, .02); rig.ejectDir = V3(.2, .9, .8);
  rig.boltType = 'falling'; rig.fkind = kind;
}

// ------------------------------------------------------------------ muskets, rifles, blunderbusses, volley guns, air rifle
function buildMusket(C) {
  const { add, grp, rig, MT, m, wp } = C;
  const L = (m.B && m.B[0]) || 1.1, br = (m.B && m.B[1]) || .0105, nb = m.nb || 1;
  const bm = m.mt === 'brass' ? MT.brassF : MT.metal;
  rig.sec = 'barrel';
  if (nb > 1) { for (let i = 0; i < nb; i++) { const a = i / (nb - 1 || 1) * 2 * PI; const r = i === 0 ? 0 : br * 2.2; add(gCyl(br * 1.15, br * 1.15, L, 12), bm, Math.cos(a) * r, .005 + Math.sin(a) * r, -L / 2); } }
  else add(gCyl(br * 1.55, br * 1.25, L, 16), bm, 0, .005, -L / 2);
  if (m.bell) add(gCyl(br * 1.4, br * 3.2, .1, 18, true), bm, 0, .005, -L - .04);
  add(gCyl(br * 1.65, br * 1.6, .1, 16), bm, 0, .005, -.05); // breech
  rig.sec = 'stock';
  const full = m.stock !== 'half' && m.stock !== 'club';
  add(gProf([[.0, .005], [.14, -.005], [.48, .02], [.5, -.14], [.4, -.12], [.18, -.06], [.0, -.03]], .042, .012, true), MT.wood, 0, 0, 0);
  if (m.stock === 'club') add(gProf([[.0, .0], [.4, .0], [.42, -.06], [.0, -.03]], .04, .01, true), MT.wood, 0, 0, 0);
  add(gBox(.044, .14, .008), MT.furn, 0, -.06, .5); rig.stockEnd = V3(0, -.05, .5);
  if (m.air) add(gSph(.055, 16), MT.iron, 0, -.06, .42); // Girandoni air reservoir butt
  rig.sec = 'handguard';
  add(gRBox(.036, .024, (full ? L * .9 : L * .45), .008), MT.wood, 0, -.008, -(full ? L * .45 : L * .225));
  const bands = m.bands || (full ? 3 : 1);
  for (let i = 1; i <= bands; i++) add(gTor(br * 2.2, .0025), MT.furn, 0, -.002, -(full ? L * .9 : L * .45) * i / (bands + .5));
  if (m.rod !== false) { rig.sec = 'extras'; const rd = rig.rod = grp(0, -.018, 0); add(gCyl(.003, .003, L * .95, 6), m.brass ? MT.steel : MT.wood, 0, 0, -L * .5, rd); add(gCyl(.0045, .0045, .02, 8), MT.brassF, 0, 0, -L * .97, rd); rig.rodLen = L * .95; }
  if (m.patchbox) add(gRBox(.002, .03, .07, .003), MT.brassF, .021, -.04, .34);
  rig.sec = 'action'; lockPlate(C, m.lock || 'flint', .021, -.002, -.02);
  rig.sec = 'trigger'; rig.trigger = grp(0, -.035, .06); add(gBox(.004, .016, .004), MT.steel, 0, -.008, 0, rig.trigger);
  add(gTor(.018, .0022, PI * 1.1), MT.furn, 0, -.04, .06).rotation.set(0, PI / 2, PI * .95);
  rig.sec = 'sights'; add(gBox(.003, .005, .006), MT.brassF, 0, .005 + br * 1.3 + .003, -L + .03);
  if (m.rifled) add(gBox(.012, .008, .004), MT.steel, 0, .005 + br * 1.6 + .004, -.12);
  rig.muzzleZ = -L - (m.bell ? .09 : 0); rig.muzzleY = .005; rig.zr = .02; rig.zf = -.06; rig.top = .02; rig.bot = -.03;
  rig.sightH = .005 + br * 1.4 + .005; rig.sightZ = -.05; rig.eyeDist = .3;
  rig.gripPos = V3(0, -.045, .1); rig.hgPos = V3(0, -.03, -.3);
  rig.ejectPos = V3(.02, .01, -.03); rig.ejectDir = V3(1, .5, .2);
  rig.boltType = 'musket';
}
function buildFPistol(C) {
  const { add, grp, rig, MT, m } = C;
  const L = (m.B && m.B[0]) || .23, br = (m.B && m.B[1]) || .008;
  const bm = m.mt === 'brass' ? MT.brassF : MT.metal;
  rig.sec = 'barrel'; add(gCyl(br * 1.6, br * 1.3, L, 14), bm, 0, .01, -.02 - L / 2);
  if (m.bell) add(gCyl(br * 1.3, br * 2.6, .05, 14, true), bm, 0, .01, -.02 - L - .02);
  rig.sec = 'stock';
  add(gProf([[-.02, .0], [.02, .004], [.07, -.06], [.1, -.13], [.06, -.14], [.03, -.05], [-.02, -.012]], .03, .009, true), MT.wood, 0, 0, 0);
  add(gSph(.018, 12), MT.furn, 0, -.13, .085); // butt cap
  add(gRBox(.026, .016, L * .85, .006), MT.wood, 0, -.002, -.02 - L * .42);
  if (m.rod !== false) { const rd = rig.rod = grp(0, -.012, 0); add(gCyl(.0022, .0022, L * .9, 6), MT.wood, 0, 0, -.02 - L * .45, rd); rig.rodLen = L * .9; }
  rig.sec = 'action'; lockPlate(C, m.lock || 'flint', .016, .0, .0, .8);
  rig.sec = 'trigger'; rig.trigger = grp(0, -.025, .03); add(gBox(.004, .014, .004), MT.steel, 0, -.007, 0, rig.trigger);
  add(gTor(.014, .0018, PI * 1.1), MT.furn, 0, -.03, .03).rotation.set(0, PI / 2, PI * .95);
  rig.muzzleZ = -.02 - L - (m.bell ? .045 : 0); rig.muzzleY = .01; rig.zr = .02; rig.zf = -.02; rig.top = .02; rig.bot = -.02;
  rig.sightH = .01 + br * 1.6 + .004; rig.sightZ = 0; rig.eyeDist = .45;
  rig.gripPos = V3(0, -.07, .07); rig.hgPos = V3(0, -.06, .03);
  rig.boltType = 'musket';
}

// ------------------------------------------------------------------ cannon & mortars
function buildCannon(C) {
  const { add, grp, rig, MT, m, wp } = C;
  const bore = m.cal || .117, L = m.L || 1.66, car = m.car || 'field', mortar = m.t === 'mortar_old' || car === 'mortarbed';
  const rb = bore * 1.45, rm = bore * .95; // breech / muzzle outer radius
  const BM = MT.barrelMat;
  const g = rig.recoilG = grp(0, 0, 0);
  C.setCur(g); rig.sec = 'barrel';
  const tube = mortar ? grp(0, 0, 0, g) : g;
  C.setCur(tube);
  if (m.bottle) { add(gCyl(rb * 1.25, rb * 1.05, L * .35, 22), BM, 0, 0, -L * .175); add(gCyl(rb * 1.05, rm, L * .65, 20), BM, 0, 0, -L * .35 - L * .325); }
  else add(gCyl(rb, rm, L, 22), BM, 0, 0, -L / 2);
  add(gSph(rb * 1.02, 18), BM, 0, 0, 0).scale.set(1, 1, .5);                  // breech face
  add(gCylY(rb * .25, rb * .3, rb * .7, 12), BM, 0, 0, rb * .75).rotation.x = PI / 2; add(gSph(rb * .32, 12), BM, 0, 0, rb * 1.15); // cascabel
  const rings = m.rings ?? 3; for (let i = 0; i < rings; i++) { const t = (i + 1) / (rings + 1); add(gTor(lerp(rb, rm, t) * 1.04, bore * .08), BM, 0, 0, -L * t); }
  add(gTor(rm * 1.12, bore * .14), BM, 0, 0, -L + bore * .2);                 // muzzle swell
  if (m.band) add(gCyl(rb * 1.12, rb * 1.12, L * .2, 22), MT.iron, 0, 0, -L * .1); // Parrott reinforcing band
  add(gCyl(bore * .5, bore * .5, .003, 14), MT.rubber, 0, 0, -L - .002);
  add(gCylY(bore * .06, bore * .06, bore * .3, 8), BM, 0, rb, -bore * .4);    // vent
  const tz = -L * (mortar ? .3 : .42); add(gCylX(bore * .32, bore * .32, rb * 2.8, 12), BM, 0, 0, tz); // trunnions
  rig.ventPos = V3(0, rb + bore * .15, -bore * .4);
  if (m.breech === 'chamber') { rig.sec = 'action'; const ch = rig.breech = grp(0, 0, rb * .4, tube); add(gCyl(rb * .8, rb * .8, rb * 1.4, 14), MT.iron, 0, 0, 0, ch); add(gCylY(.006, .006, rb * 1.4, 6), MT.iron, 0, rb * .9, 0, ch); }
  if (m.breech === 'screw') { rig.sec = 'action'; const ch = rig.breech = grp(0, 0, rb * .55, tube); add(gCyl(rb * .7, rb * .7, rb * .5, 14), MT.steel, 0, 0, 0, ch); add(gCylX(.008, .008, rb * 2.4, 6), MT.steel, 0, 0, .03, ch); }
  if (mortar) tube.rotation.x = .78;
  C.setCur(rig.root); rig.sec = 'stock';
  const wr = m.wheel || Math.max(.4, bore * 9);
  let ground = -wr;
  if (car === 'field') {
    for (const s of [-1, 1]) add(gRBox(.05, rb * 2.4, L * .55, .01), MT.oak, s * rb * 1.6, -rb * .9, tz + L * .12);
    add(gCylX(.035, .035, rb * 3.2 + .3, 10), MT.iron, 0, -wr * .55, tz);
    for (const s of [-1, 1]) wheel(C, wr, .06, s * (rb * 1.6 + .14), -wr * .55, tz, 14);
    const tl = add(gRBox(.12, .1, wr * 2.6, .02), MT.oak, 0, -wr * .55 - wr * .4, tz + wr * 1.25); tl.rotation.x = -.42; // trail to the ground
    ground = -wr * 1.55;
  } else if (car === 'naval' || car === 'slide') {
    const h = rb * 1.6; add(gRBox(rb * 3.4, h, L * .45, .02), MT.oak, 0, -rb - h / 2 + .02, tz + L * .05);
    if (car === 'slide') add(gRBox(rb * 2.6, .08, L * 1.2, .01), MT.oak, 0, -rb - h - .04, tz + L * .1);
    else for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(gCylX(rb * .55, rb * .55, .06, 12), MT.oak, sx * rb * 1.7, -rb - h + .02, tz + L * .05 + sz * L * .18);
    ground = -rb - h - (car === 'slide' ? .08 : rb * .5);
  } else if (car === 'swivel') {
    const y = add(gTor(rb * 1.4, .01, PI), MT.iron, 0, -rb * .2, tz); y.rotation.set(PI, PI / 2, 0); add(gCylY(.02, .02, .6, 10), MT.iron, 0, -rb - .3, tz);
    add(gCyl(.008, .008, .5, 6), MT.iron, 0, 0, .3); ground = -rb - .6;
    rig.tiller = true;
  } else if (car === 'bed' || car === 'mortarbed') {
    add(gRBox(rb * 3, rb * 1.4, mortar ? rb * 3.2 : L * 1.05, .03), MT.oak, 0, -rb * 1.4, mortar ? 0 : -L * .45);
    ground = -rb * 2.1;
  } else if (car === 'big') { // Tsar Cannon: ornamental carriage with huge cast wheels
    add(gRBox(rb * 2.6, rb * 1.4, L * .9, .05), MT.bronze, 0, -rb * 1.5, -L * .45);
    for (const s of [-1, 1]) wheel(C, rb * 2, .25, s * rb * 1.6, -rb * 1.9, -L * .3, 10, MT.bronze);
    ground = -rb * 3.9;
  }
  rig.ground = ground;
  C.setCur(rig.root);
  rig.muzzleZ = mortar ? -Math.cos(.78) * L : -L; rig.muzzleY = mortar ? Math.sin(.78) * L : 0;
  if (mortar) rig.muzzleDir = V3(0, Math.sin(.78), -Math.cos(.78));
  rig.zr = .2; rig.zf = -L * .5; rig.top = rb; rig.bot = ground;
  rig.sightH = rb + bore * .2; rig.sightZ = rb * 1.2; rig.eyeDist = .5;
  rig.gripPos = V3(rb * .9 + .05, -rb * .4, rb * 1.4); rig.hgPos = V3(-rb * .9 - .05, -rb * .4, rb * 1.2);
  rig.ejectPos = V3(0, rb, 0);
  rig.boltType = m.breech === 'chamber' ? 'chamber' : m.breech === 'screw' ? 'breech' : 'cannon';
  rig.vmScale = Math.min(1, 1.25 / Math.max(.3, L + (car === 'field' ? wr * 2.5 : rb * 2)));
  rig.recoilDist = Math.min(.6, L * .25);
}
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ Gatling, Puckle, Hwacha
function buildGatling(C) {
  const { add, grp, rig, MT, m } = C;
  const nb = m.nb || 6, L = m.L || .8, br = .009, R = m.nb > 6 ? .045 : .036;
  rig.sec = 'barrel';
  const rot = rig.rotor = grp(0, 0, -.12);
  for (let i = 0; i < nb; i++) { const a = i / nb * 2 * PI; add(gCyl(br * 1.4, br * 1.25, L, 10), MT.metal, Math.cos(a) * R, Math.sin(a) * R, -L / 2, rot); }
  for (const z of [-L * .3, -L * .95]) add(gCyl(R + br * 2, R + br * 2, .02, 18), MT.brassF, 0, 0, z, rot);
  rig.sec = 'receiver';
  add(gRBox(.14, .14, .26, .02), MT.brassF, 0, 0, .02);
  const cr = rig.crank = grp(.09, 0, .02); add(gBox(.012, .012, .1), MT.steel, .01, 0, .05, cr); add(gCylX(.008, .008, .04, 8), MT.wood, .03, 0, .1, cr);
  rig.sec = 'mag';
  const hp = rig.mag = grp(0, .1, -.02); add(gRBox(.03, .2, .06, .004), MT.brassF, 0, .1, 0, hp); rig.magHome = { pos: hp.position.clone(), rot: hp.rotation.clone() }; rig.magFixed = false; rig.magType = 'top_curve';
  rig.sec = 'stock';
  const wr = m.wheel || .6;
  for (const s of [-1, 1]) { add(gRBox(.04, .1, .4, .01), MT.oak, s * .1, -.08, .0); wheel(C, wr, .05, s * .25, -wr * .6, .0, 12); }
  add(gCylX(.025, .025, .55, 10), MT.iron, 0, -wr * .6, 0);
  const tl = add(gRBox(.1, .08, wr * 2.4, .02), MT.oak, 0, -wr, wr * 1.1); tl.rotation.x = -.4;
  rig.muzzleZ = -.12 - L; rig.muzzleY = 0; rig.zr = .15; rig.zf = -.12; rig.top = .08; rig.bot = -wr * 1.6;
  rig.sightH = .095; rig.sightZ = .12; rig.eyeDist = .4;
  rig.gripPos = V3(.12, 0, .1); rig.hgPos = V3(-.08, .02, .1);
  rig.ejectPos = V3(0, -.08, .02); rig.ejectDir = V3(0, -1, .2);
  rig.boltType = 'gatling'; rig.vmScale = .7; rig.recoilDist = 0;
}
function buildPuckle(C) {
  const { add, grp, rig, MT, m } = C;
  const L = m.L || 1, br = .016;
  rig.sec = 'barrel'; add(gCyl(br * 1.5, br * 1.3, L, 14), MT.bronze, 0, 0, -.1 - L / 2);
  rig.sec = 'mag'; const d = rig.drum = grp(0, 0, 0); for (let i = 0; i < 9; i++) { const a = i / 9 * 2 * PI; add(gCyl(br * 1.1, br * 1.1, .16, 10), MT.bronze, Math.cos(a) * .045, Math.sin(a) * .045, 0, d); } add(gCyl(.065, .065, .14, 18), MT.bronze, 0, 0, 0, d);
  rig.sec = 'action'; lockPlate(C, 'flint', .07, .03, -.06);
  const cr = rig.crank = grp(0, 0, .1); add(gCylY(.006, .006, .14, 6), MT.iron, 0, 0, .02, cr);
  rig.sec = 'stock'; add(gCylY(.03, .03, .2, 10), MT.iron, 0, -.15, 0); for (let i = 0; i < 3; i++) { const a = i / 3 * 2 * PI; const l = add(gCylY(.012, .012, 1.0, 8), MT.oak, Math.cos(a) * .25, -.6, Math.sin(a) * .25); l.rotation.set(-Math.sin(a) * .3, 0, Math.cos(a) * .3); }
  rig.muzzleZ = -.1 - L; rig.muzzleY = 0; rig.zr = .1; rig.zf = -.1; rig.top = .07; rig.bot = -1.1;
  rig.sightH = .06; rig.sightZ = .1; rig.eyeDist = .4; rig.gripPos = V3(.05, -.02, .22); rig.hgPos = V3(-.05, -.02, .2);
  rig.boltType = 'puckle'; rig.vmScale = .75;
}
function buildHwacha(C) {
  const { add, grp, rig, MT, m, wp } = C;
  rig.sec = 'mag';
  const rack = rig.rack = grp(0, 0, 0); rack.rotation.x = .35;
  add(gRBox(.7, .5, .5, .02), MT.oak, 0, 0, -.25, rack);
  const n = wp.mag >= 50 ? 10 : 5;
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) add(gCyl(.012, .012, .52, 6), MT.wood, -.3 + i * .6 / (n - 1), -.2 + k * .4 / (n - 1), -.25, rack);
  rig.sec = 'stock';
  for (const s of [-1, 1]) wheel(C, .45, .05, s * .42, -.4, .0, 10);
  add(gCylX(.03, .03, .9, 8), MT.oak, 0, -.4, 0);
  for (const s of [-1, 1]) { const h = add(gBox(.04, .04, 1.4), MT.oak, s * .3, -.42, .55); h.rotation.x = -.15; }
  rig.muzzleZ = -.5 * Math.cos(.35); rig.muzzleY = .5 * Math.sin(.35); rig.muzzleDir = V3(0, Math.sin(.35), -Math.cos(.35));
  rig.zr = .3; rig.zf = -.3; rig.top = .3; rig.bot = -.85; rig.sightH = .32; rig.sightZ = .2; rig.eyeDist = .5;
  rig.gripPos = V3(.3, -.35, 1.1); rig.hgPos = V3(-.3, -.35, 1.1);
  rig.boltType = 'hwacha'; rig.vmScale = .6;
}

// ------------------------------------------------------------------ modern artillery
function buildArt(C) {
  const { add, grp, rig, MT, m, wp } = C;
  const bore = m.cal || .105, L = m.L || Math.max(.6, bore * 25), kind = m.kind || 'howitzer', nb = m.nb || 1;
  const P = MT.paint, ST = MT.steel;
  const tubeR = bore * (kind === 'mortar' ? .62 : .95), breechL = bore * 3.2;
  const mortar = kind === 'mortar', mount = m.mount || (mortar ? 'baseplate' : kind === 'aa' ? 'cruciform' : kind === 'naval' ? 'turret' : kind === 'rail' ? 'rail' : kind === 'recoilless' ? 'tripod' : 'wheels');
  const elev = mortar ? (m.elev || .9) : (m.elev || 0);
  const pivot = grp(0, 0, 0); // elevating mass (cradle + barrel)
  const rec = rig.recoilG = grp(0, 0, 0, pivot);
  C.setCur(rec); rig.sec = 'barrel';
  const offs = nb === 1 ? [[0, 0]] : nb === 2 ? [[-bore * 2.2, 0], [bore * 2.2, 0]] : nb === 4 ? [[-bore * 2.2, bore * 1.6], [bore * 2.2, bore * 1.6], [-bore * 2.2, -bore * 1.6], [bore * 2.2, -bore * 1.6]] : [[0, 0]];
  if (m.rotary) { const r = rig.rotor = grp(0, 0, -breechL, rec); for (let i = 0; i < 6; i++) { const a = i / 6 * 2 * PI; add(gCyl(bore * .9, bore * .8, L, 10), ST, Math.cos(a) * bore * 2.2, Math.sin(a) * bore * 2.2, -L / 2, r); } add(gCyl(bore * 3.4, bore * 3.4, .02, 16), ST, 0, 0, -L * .9, r); }
  else for (const [ox, oy] of offs) {
    add(gCyl(tubeR * 1.25, tubeR, L, 20), kind === 'naval' || kind === 'rail' || mortar ? P : ST, ox, oy, -breechL - L / 2);
    if (!mortar && L / bore > 18) add(gCyl(tubeR * 1.45, tubeR * 1.45, L * .12, 18), P, ox, oy, -breechL - L * .55); // fume extractor / thermal sleeve
    if (m.brake) { const bl = bore * 2.2; add(gRBox(tubeR * 3, tubeR * 2.4, bl, bore * .2), ST, ox, oy, -breechL - L - bl / 2); for (const s of [-1, 1]) add(gBox(.004, tubeR * 2, bl * .6), MT.rubber, ox + s * tubeR * 1.51, oy, -breechL - L - bl / 2); }
    if (kind === 'recoilless') add(gCyl(tubeR * 1.2, tubeR * 2.2, bore * 3, 16, true), ST, ox, oy, bore * 1.5); // venturi
    add(gCyl(tubeR * .78, tubeR * .78, .004, 14), MT.rubber, ox, oy, -breechL - L - (m.brake ? bore * 2.2 : 0) - .003);
  }
  rig.sec = 'action';
  if (!mortar && kind !== 'recoilless') {
    add(gRBox(bore * 3.2 * (nb > 1 ? 2.6 : 1), bore * 3.2, breechL, bore * .4), ST, 0, 0, -breechL / 2);   // breech ring
    const bb = rig.breech = grp(0, 0, 0, rec); add(gRBox(bore * 2.4, bore * 2.4, bore * 1.2, bore * .3), ST, 0, 0, -bore * .6, bb);
    add(gCylX(bore * .18, bore * .18, bore * 1.6, 8), MT.steel, bore * 1.6, bore * .6, -bore * .4, bb); // breech lever
    rig.breechSlide = m.breech !== 'screw';
  }
  C.setCur(pivot); rig.sec = 'receiver';
  if (!mortar && !m.rotary) { // cradle and recoil cylinders
    add(gRBox(bore * 3.6 * (nb > 1 ? 2.6 : 1), bore * 2.6, L * .35, bore * .3), P, 0, -bore * 2.2, -breechL - L * .12);
    add(gCyl(bore * .7, bore * .7, L * .3, 12), P, 0, bore * 2.1, -breechL - L * .12);
  }
  C.setCur(rig.root);
  pivot.rotation.x = elev;
  const trunH = mortar ? 0 : Math.max(.5, bore * 9);
  rig.sec = 'stock';
  let ground = -trunH;
  const shieldOn = m.shield !== false && ['atgun', 'field', 'howitzer'].includes(kind) && bore < .16;
  if (mount === 'wheels') {
    const wr = m.wheel || Math.max(.35, bore * 4.8); const ax = -trunH + wr * .95;
    add(gRBox(bore * 6, bore * 3, bore * 8, bore * .5), P, 0, -trunH * .5, -bore * 2);                         // top carriage
    add(gCylX(bore * .5, bore * .5, bore * 12 + .3, 10), P, 0, ax, -bore * 2);
    for (const s of [-1, 1]) (m.spoked ? wheel(C, wr, .09, s * (bore * 6 + .15), ax, -bore * 2, 14) : tyre(C, wr, Math.max(.16, bore * 2.2), s * (bore * 6 + .15), ax, -bore * 2));
    const tl = Math.max(1.6, L * .9), trail = m.trail || 'split';
    if (trail === 'box') { const t0 = add(gRBox(bore * 4, bore * 3, tl, bore * .5), P, 0, -trunH * .65, tl / 2); t0.rotation.x = -Math.atan2(trunH * .4, tl); }
    else if (trail === 'tri') for (let i = 0; i < 3; i++) { const a = i / 3 * 2 * PI; const l = add(gRBox(bore * 2, bore * 2, tl * .7, bore * .4), P, Math.sin(a) * tl * .3, -trunH * .85, Math.cos(a) * tl * .3); l.rotation.y = a; }
    else for (const s of [-1, 1]) { const t0 = add(gRBox(bore * 2.6, bore * 2.4, tl, bore * .4), P, s * tl * .18, -trunH * .65, tl * .48); t0.rotation.set(-Math.atan2(trunH * .35, tl), s * .35, 0); add(gBox(bore * 4, bore * 3, .03), ST, s * tl * .34, -trunH * .95, tl * .92); }
    if (shieldOn) { add(gRBox(bore * 16, bore * 9, .012, .01), P, 0, bore * .5, -breechL - bore * 4); }
    ground = ax - wr;
  } else if (mount === 'cruciform') {
    add(gCylY(bore * 4, bore * 5, trunH * .6, 16), P, 0, -trunH * .55, -bore * 2);
    for (let i = 0; i < 4; i++) { const a = i / 4 * 2 * PI + PI / 4; const l = add(gRBox(bore * 2.4, bore * 1.5, Math.max(1.5, L * .55), bore * .3), P, Math.sin(a) * L * .25, -trunH * .95, -bore * 2 + Math.cos(a) * L * .25); l.rotation.y = a; }
    if (m.seat !== false) for (const s of [-1, 1]) add(gRBox(.25, .05, .25, .02), P, s * bore * 7, -trunH * .3, bore * 3);
    ground = -trunH * 1.05;
  } else if (mount === 'baseplate') {
    add(gCylY(bore * 5.5, bore * 6, bore * .9, 20), P, 0, -bore * .4, 0);
    const mz = -Math.cos(elev) * L * .55, my = Math.sin(elev) * L * .55;
    for (const s of [-1, 1]) strut(C, P, bore * .22, V3(s * bore * 5, -bore * .3, mz * 1.25), V3(0, my * .62, mz * .62));
    add(gRBox(bore * 1.6, bore * 1.2, bore * 2, bore * .2), ST, -bore * 1.8, my * .9, mz * .95); // sight
    if (m.wheeled) for (const s of [-1, 1]) tyre(C, bore * 3.2, bore * 1.5, s * bore * 4.5, bore * 3.2 - bore * .8, mz);
    ground = -bore * .85;
  } else if (mount === 'tripod') {
    for (let i = 0; i < 3; i++) { const a = i / 3 * 2 * PI; const l = add(gCylY(.018, .018, 1.0, 8), P, Math.sin(a) * .28, -.55, Math.cos(a) * .28 - breechL); l.rotation.set(-Math.cos(a) * .3, 0, Math.sin(a) * .3); }
    ground = -1.05;
  } else if (mount === 'shoulder') {
    add(gRBox(.03, .08, .04, .01), MT.poly, 0, -tubeR - .04, -.15); add(gRBox(.03, .07, .04, .01), MT.poly, 0, -tubeR - .035, -.45); add(gRBox(.03, .04, .06, .01), MT.poly, -tubeR - .02, tubeR * .7, -.35);
    ground = -.2;
  } else if (mount === 'turret') {
    const tw = Math.max(bore * 18 * (nb > 1 ? 1.6 : 1), .8), th = Math.max(bore * 9, .6), td = Math.max(bore * 20, 1);
    add(gRBox(tw, th, td, th * .15), P, 0, -th * .2, td * .35 - breechL * .5);
    add(gCylY(tw * .55, tw * .55, th * .4, 24), P, 0, -th * .85, td * .3);
    if (m.dome) add(gSph(tw * .45, 18), solidWhite(C), 0, th * .3, td * .2);
    ground = -th * 1.05;
  } else if (mount === 'rail') {
    const cl = Math.max(L * .8, 6), cw = Math.max(bore * 10, 2.4);
    add(gRBox(cw, bore * 6, cl, .05), P, 0, -trunH * .8, cl * .1);
    for (const z of [-cl * .38, -cl * .2, cl * .3, cl * .48]) for (const s of [-1, 1]) { const b = add(gCylX(.45, .45, .15, 14), MT.iron, s * cw * .4, -trunH * .8 - bore * 3 - .3, z); }
    add(gRBox(cw * 1.4, .15, cl * 1.3, .02), MT.oak, 0, -trunH * .8 - bore * 3 - .78, cl * .1); // rails / sleepers
    ground = -trunH * .8 - bore * 3 - .85;
  } else if (mount === 'tracks') {
    add(gRBox(bore * 10, bore * 4, L * 1.1, .05), P, 0, -trunH * .7, L * .1);
    for (const s of [-1, 1]) add(gRBox(bore * 2.6, bore * 3.4, L * 1.15, bore * 1.5), MT.tire, s * bore * 5.5, -trunH * .7 - bore * 2.6, L * .1);
    ground = -trunH * .7 - bore * 4.3;
  } else if (mount === 'pit') {
    add(gRBox(bore * 6, bore * 4, bore * 6, .1), P, 0, -bore * 1.5, 0); add(gRBox(bore * 10, .3, bore * 10, .05), MT.oak, 0, -bore * 3.6, 0);
    ground = -bore * 3.7;
  } else if (mount === 'tractors') {
    add(gRBox(.8, .5, L * 1.4, .05), P, 0, -trunH * .7, L * .1);
    for (const z of [-L * .55, L * .75]) add(gRBox(2.6, 1.8, 2.2, .2), P, 0, -trunH * .7 - .3, z);
    ground = -trunH * .7 - 1.2;
  }
  rig.ground = ground;
  const mL = breechL + L + (m.brake ? bore * 2.2 : 0);
  rig.muzzleZ = -Math.cos(elev) * mL; rig.muzzleY = Math.sin(elev) * mL;
  if (elev) rig.muzzleDir = V3(0, Math.sin(elev), -Math.cos(elev));
  rig.zr = breechL; rig.zf = -breechL; rig.top = bore * 2; rig.bot = ground;
  rig.sightX = mount === 'shoulder' ? -tubeR - .02 : 0;
  rig.sightH = mount === 'shoulder' ? tubeR * .7 + .025 : bore * 2.5; rig.sightZ = mount === 'shoulder' ? -.32 : bore * 3; rig.eyeDist = mount === 'shoulder' ? .12 : .6;
  rig.gripPos = mount === 'shoulder' ? V3(0, -tubeR - .07, -.15) : V3(bore * 3 + .1, -bore * 1.5, bore * 2);
  rig.hgPos = mount === 'shoulder' ? V3(0, -tubeR - .06, -.45) : V3(-bore * 3 - .1, -bore * 1.5, bore * 2);
  rig.ejectPos = V3(0, -bore, bore * 1.5); rig.ejectDir = V3(0, -.3, 1);
  rig.boltType = mortar && !m.breechLoad ? 'mortar' : 'breech';
  rig.recoilDist = mortar ? 0 : Math.min(1.4, bore * 9);
  rig.vmScale = mount === 'shoulder' ? 1 : mortar ? Math.min(.55, 1.2 / Math.max(.5, mL)) : Math.min(1, 1.5 / Math.max(.5, mL + Math.abs(ground) * .6));
}
function strut(C, mat, r, a, b) { const d = b.clone().sub(a), len = d.length(); const o = C.add(gCylY(r, r, len, 8), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); o.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); return o; }
function solidWhite(C) { return C.MT.white || (C.MT.white = G.linMat(new THREE.MeshStandardMaterial({ color: '#e8e9e6', roughness: .5, metalness: .2 }))); }

// ------------------------------------------------------------------ cartridges: balls, cannon shot, mortar bombs, bagged shells, arrows
const mkR0 = G.makeRound, mkC0 = G.makeCasing;
const ballMat = () => G.ballMat || (G.ballMat = new THREE.MeshStandardMaterial({ color: '#5c5c60', metalness: .8, roughness: .45 }));
G.makeRound = function (cal) {
  const c = G.CAL[cal]; if (!c || !(c.ball || c.fin || c.bag || c.arrow || c.paper)) return mkR0(cal);
  const g = new THREE.Group();
  if (c.ball) g.add(new THREE.Mesh(gSph(c.cs[1], 12), c.stone ? (G.stoneMat || (G.stoneMat = new THREE.MeshStandardMaterial({ color: '#8a857a', roughness: .95 }))) : ballMat()));
  else if (c.paper) { const p = new THREE.Mesh(gCyl(c.cs[1] * 1.3, c.cs[1] * 1.3, c.cs[0] * 3, 8), G.paperMat || (G.paperMat = new THREE.MeshStandardMaterial({ color: '#d9d0b8', roughness: 1 }))); g.add(p); }
  else if (c.fin) { const m = new THREE.MeshStandardMaterial({ color: '#4a5232', roughness: .6, metalness: .3 }); const b = new THREE.Mesh(gSph(c.cs[1], 12), m); b.scale.set(1, 1, 2); g.add(b); const t = new THREE.Mesh(gCyl(c.cs[1] * .3, c.cs[1] * .3, c.cs[0] * .5, 8), m); t.position.z = c.cs[0] * .45; g.add(t); for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(gBox(.002, c.cs[1] * 1.6, c.cs[0] * .2), m); f.position.z = c.cs[0] * .62; f.rotation.z = i * PI / 4; g.add(f); } }
  else if (c.bag) { const m = new THREE.MeshStandardMaterial({ color: '#6a6a50', roughness: .5, metalness: .4 }); const b = new THREE.Mesh(gCyl(c.cs[1], c.cs[1], c.cs[0] * .7, 16), m); b.position.z = c.cs[0] * .1; g.add(b); const n = new THREE.Mesh(gCyl(c.cs[1], c.cs[1] * .15, c.cs[0] * .35, 16), m); n.position.z = -c.cs[0] * .42; g.add(n); const band = new THREE.Mesh(gCyl(c.cs[1] * 1.03, c.cs[1] * 1.03, c.cs[0] * .05, 16), G.copperMat || new THREE.MeshStandardMaterial({ color: '#b5653a', metalness: 1, roughness: .3 })); band.position.z = c.cs[0] * .38; g.add(band); }
  else if (c.arrow) { const s = new THREE.Mesh(gCyl(.004, .004, c.cs[0], 6), new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: .8 })); g.add(s); const tube = new THREE.Mesh(gCyl(.012, .012, c.cs[0] * .2, 8), new THREE.MeshStandardMaterial({ color: '#6a2a1a', roughness: .7 })); tube.position.z = -c.cs[0] * .3; g.add(tube); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
};
G.makeCasing = function (cal) {
  const c = G.CAL[cal]; if (c && (c.ball || c.paper || c.fin || c.arrow)) { const g = new THREE.Group(); const p = new THREE.Mesh(gBox(.006, .002, .01), G.paperMat || (G.paperMat = new THREE.MeshStandardMaterial({ color: '#d9d0b8', roughness: 1 }))); g.add(p); return g; } // a scrap of paper wadding
  return mkC0(cal);
};
})();
