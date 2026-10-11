'use strict';
// Models: rigged humanoids with procedural animation, modular guns, masks,
// cars, palm trees and street furniture. All built from primitives.

const MC = {}; // material cache
H.mat = function (color, rough = 0.7, metal = 0, extra) {
  const k = color + '|' + rough + '|' + metal + (extra ? JSON.stringify(extra) : '');
  if (!MC[k]) MC[k] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal }, extra || {}));
  return MC[k];
};
const GC = {}; // geometry cache
const geo = (k, f) => GC[k] || (GC[k] = f());
const mesh = (g, m, x = 0, y = 0, z = 0, parent) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; if (parent) parent.add(o); return o; };
const box = (sx, sy, sz) => geo('b' + sx + ',' + sy + ',' + sz, () => new THREE.BoxGeometry(sx, sy, sz));
const cyl = (r1, r2, h, s = 10) => geo('c' + r1 + ',' + r2 + ',' + h + ',' + s, () => new THREE.CylinderGeometry(r1, r2, h, s));
const sph = (r, ws = 12, hs = 10) => geo('s' + r + ',' + ws + ',' + hs, () => new THREE.SphereGeometry(r, ws, hs));
// rounded limb segment: tapered cylinder with domed ends, pivot at the top
const limb = (r1, r2, len) => geo('l' + r1 + ',' + r2 + ',' + len, () => {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r2, -len + r2 - Math.cos(a) * r2)); }
  for (let i = 6; i >= 0; i--) { const a = i / 6 * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r1, -r1 + Math.cos(a) * r1)); }
  const g = new THREE.LatheGeometry(pts, 12); g.computeVertexNormals(); return g;
});
H.geo = { box, cyl, sph, limb };

/* =================== HUMANOIDS =================== */
const SKINS = [0xf1c8a8, 0xe0ac88, 0xc68a64, 0x9a6444, 0x6e4430, 0x4a2c20];
const HAIRS = [0x1a1410, 0x3a2414, 0x6a4424, 0xb08850, 0xd8c8a0, 0x8a2a14, 0x2a2a2a];
const SHIRTS = [0xf2f2f2, 0xe86a8a, 0x4ac0d0, 0xf0c040, 0x7ad070, 0xa070e0, 0xf08a3a, 0x3a6ad0, 0x202020, 0xe0e0c0, 0xff5a8a, 0x40e0b0];
const PANTS = [0x2a3550, 0x1a1a1a, 0xc8b890, 0x5a5a60, 0xe8e8e8, 0x3a4a2a, 0x6a4a3a];
H.HUMAN_PALETTE = { SKINS, HAIRS, SHIRTS, PANTS };

H.makeHuman = function (o = {}) {
  const skin = H.mat(o.skin ?? H.pick(SKINS), 0.65);
  const shirt = H.mat(o.shirt ?? H.pick(SHIRTS), 0.85);
  const pants = H.mat(o.pants ?? H.pick(PANTS), 0.85);
  const shoes = H.mat(o.shoes ?? 0x1a1612, 0.5);
  const bulk = o.bulk || 1, fem = !!o.fem;
  const root = new THREE.Group();
  const J = {}; // joints
  const sw = fem ? 0.92 : 1;
  // hips
  J.hips = new THREE.Group(); J.hips.position.y = 0.95; root.add(J.hips);
  mesh(box(0.34 * bulk * sw, 0.2, 0.2 * bulk), pants, 0, 0, 0, J.hips);
  // spine & chest
  J.spine = new THREE.Group(); J.spine.position.y = 0.08; J.hips.add(J.spine);
  const torsoG = geo('torso' + bulk + fem, () => {
    const g = new THREE.CylinderGeometry(0.2 * bulk * sw, 0.16 * bulk, 0.5, 12, 1); g.translate(0, 0.25, 0); g.scale(1, 1, 0.62); return g;
  });
  const torso = mesh(torsoG, shirt, 0, 0, 0, J.spine);
  J.chest = new THREE.Group(); J.chest.position.y = 0.45; J.spine.add(J.chest);
  mesh(geo('shoulders' + bulk, () => { const g = new THREE.SphereGeometry(0.21 * bulk, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1.05, 0.45, 0.62); return g; }), shirt, 0, -0.02, 0, J.chest);
  if (o.vest) { // tactical vest with pouches and a printed label
    const vm = H.mat(o.vestColor ?? 0x22252a, 0.9);
    mesh(geo('vest' + bulk, () => { const g = new THREE.CylinderGeometry(0.22 * bulk, 0.19 * bulk, 0.42, 12); g.translate(0, 0.25, 0); g.scale(1, 1, 0.68); return g; }), vm, 0, 0, 0, J.spine);
    for (let i = -1; i <= 1; i++) mesh(box(0.08, 0.1, 0.05), vm, i * 0.1 * bulk, 0.18, 0.15 * bulk, J.spine);
    if (o.vest !== true) {
      const t = H._vestTex || (H._vestTex = {});
      if (!t[o.vest]) t[o.vest] = new THREE.MeshBasicMaterial({ map: H.textTex(o.vest, { w: 256, h: 64, font: 'bold 52px Arial', fg: o.vest === '+' ? '#e33' : '#e8e8e8' }), transparent: true });
      const lab = mesh(geo('vestlab', () => new THREE.PlaneGeometry(0.26, 0.065)), t[o.vest], 0, 0.36, -0.15 * bulk - 0.001, J.spine); lab.rotation.y = Math.PI; lab.castShadow = false;
    }
  }
  if (o.jacket) { // open jacket over the shirt
    const jm = H.mat(o.jacket, 0.8);
    for (const s of [-1, 1]) mesh(box(0.13 * bulk, 0.5, 0.27 * bulk), jm, s * 0.12 * bulk, 0.25, -0.01, J.spine);
    mesh(box(0.38 * bulk, 0.5, 0.06), jm, 0, 0.25, -0.12 * bulk, J.spine);
  }
  if (o.tie) mesh(box(0.05, 0.3, 0.02), H.mat(o.tie, 0.6), 0, 0.27, 0.105 * bulk, J.spine);
  // neck & head
  J.neck = new THREE.Group(); J.neck.position.y = 0.08; J.chest.add(J.neck);
  mesh(cyl(0.055, 0.065, 0.12, 8), skin, 0, 0.04, 0, J.neck);
  J.head = new THREE.Group(); J.head.position.y = 0.12; J.neck.add(J.head);
  const headG = geo('head' + fem, () => { const g = new THREE.SphereGeometry(0.115, 16, 12); g.scale(fem ? 0.9 : 0.95, 1.12, 1.02); g.translate(0, 0.1, 0); return g; });
  mesh(headG, skin, 0, 0, 0, J.head);
  mesh(geo('jaw', () => { const g = new THREE.SphereGeometry(0.085, 12, 8); g.scale(1, 0.7, 1); return g; }), skin, 0, 0.04, 0.03, J.head);
  mesh(geo('nose', () => new THREE.ConeGeometry(0.018, 0.05, 6)), skin, 0, 0.1, 0.115, J.head).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    mesh(sph(0.016, 8, 6), H.mat(0xf8f8f0, 0.3), s * 0.04, 0.12, 0.098, J.head);
    mesh(sph(0.009, 6, 6), H.mat(0x1a1410, 0.2), s * 0.04, 0.12, 0.111, J.head);
    mesh(box(0.035, 0.008, 0.01), H.mat(o.hair ?? 0x2a1a10, 0.9), s * 0.04, 0.145, 0.105, J.head);
    mesh(sph(0.025, 6, 6), skin, s * 0.108, 0.1, 0, J.head).scale.set(0.5, 1, 0.7);
  }
  mesh(box(0.05, 0.008, 0.01), H.mat(0x8a4a44, 0.6), 0, 0.055, 0.108, J.head);
  const hairCol = H.mat(o.hair ?? H.pick(HAIRS), 0.9);
  const headgear = o.head || 'hair';
  if (headgear === 'hair' || headgear === 'none') {
    const hg = geo('hair' + fem, () => { const g = new THREE.SphereGeometry(0.122, 14, 10, 0, Math.PI * 2, 0, fem ? Math.PI * 0.62 : Math.PI * 0.45); g.scale(0.97, 1.1, 1.05); g.translate(0, 0.115, -0.01); return g; });
    mesh(hg, hairCol, 0, 0, 0, J.head);
    if (fem) mesh(box(0.2, 0.22, 0.08), hairCol, 0, 0.04, -0.08, J.head);
  } else if (headgear === 'cap' || headgear === 'police') {
    const cm = H.mat(headgear === 'police' ? 0x161c30 : 0x232a40, 0.7);
    mesh(geo('cap', () => { const g = new THREE.SphereGeometry(0.125, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42); g.translate(0, 0.13, 0); return g; }), cm, 0, 0, 0, J.head);
    mesh(box(0.2, 0.012, 0.09), cm, 0, 0.17, 0.12, J.head);
    if (headgear === 'police') mesh(box(0.04, 0.04, 0.01), H.mat(0xd8b04a, 0.3, 1), 0, 0.2, 0.12, J.head);
  } else if (headgear.startsWith('helmet') || headgear === 'dozer' || headgear === 'nvg' || headgear === 'gasmask') {
    const hm = H.mat(0x1c1f24, 0.6, 0.2);
    mesh(geo('helm', () => { const g = new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55); g.scale(1, 0.95, 1.08); g.translate(0, 0.12, -0.005); return g; }), hm, 0, 0, 0, J.head);
    if (headgear === 'helmet_v' || headgear === 'dozer') {
      const vis = mesh(geo('visor', () => { const g = new THREE.SphereGeometry(0.15, 14, 8, -Math.PI * 0.4, Math.PI * 0.8, Math.PI * 0.3, Math.PI * 0.45); return g; }), H.mat(headgear === 'dozer' ? 0x2a2a20 : 0x2a3a4a, 0.1, 0.6, { transparent: true, opacity: 0.75 }), 0, 0.1, 0.01, J.head);
      vis.castShadow = false;
    }
    if (headgear === 'dozer') { mesh(box(0.2, 0.2, 0.03), H.mat(0x15171a, 0.4, 0.5), 0, 0.08, 0.13, J.head); for (const s of [-1, 1]) mesh(box(0.05, 0.02, 0.01), H.mat(0x60ff40, 0.3, 0, { emissive: 0x30a020 }), s * 0.04, 0.12, 0.146, J.head); }
    if (headgear === 'nvg') { for (const s of [-1, 1]) mesh(cyl(0.022, 0.022, 0.08, 8), H.mat(0x101010, 0.4), s * 0.035, 0.13, 0.13, J.head).rotation.x = Math.PI / 2; for (const s of [-1, 1]) mesh(sph(0.012, 6, 6), H.mat(0x40ff60, 0.2, 0, { emissive: 0x40ff60 }), s * 0.035, 0.13, 0.172, J.head); }
    if (headgear === 'gasmask') { mesh(geo('gm', () => { const g = new THREE.SphereGeometry(0.1, 12, 8); g.scale(1, 0.9, 0.7); return g; }), H.mat(0x1a1a1a, 0.7), 0, 0.07, 0.07, J.head); mesh(cyl(0.035, 0.04, 0.05, 10), H.mat(0x2a2a2a, 0.6), 0, 0.03, 0.14, J.head).rotation.x = Math.PI / 2; for (const s of [-1, 1]) mesh(cyl(0.028, 0.028, 0.02, 10), H.mat(0x60a0ff, 0.1, 0.3, { emissive: 0x204060 }), s * 0.045, 0.12, 0.12, J.head).rotation.x = Math.PI / 2; }
  }
  if (o.mask) { const mk = H.buildMask(o.mask); mk.position.set(0, 0.1, 0.02); mk.scale.setScalar(1.0); J.head.add(mk); J.mask = mk; }
  if (o.glasses) { for (const s of [-1, 1]) mesh(box(0.05, 0.03, 0.01), H.mat(0x101010, 0.1, 0.5), s * 0.04, 0.12, 0.115, J.head); }
  // arms
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R';
    const sh = new THREE.Group(); sh.position.set(s * 0.22 * bulk * sw, 0.0, 0); J.chest.add(sh); J['sh' + side] = sh;
    mesh(limb(0.06 * bulk, 0.05 * bulk, 0.3), o.shortSleeve ? skin : shirt, 0, 0, 0, sh);
    if (o.shortSleeve) mesh(limb(0.065 * bulk, 0.06 * bulk, 0.12), shirt, 0, 0, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.28; sh.add(el); J['el' + side] = el;
    mesh(limb(0.048 * bulk, 0.04 * bulk, 0.27), (o.jacket || o.longSleeve) ? H.mat(o.jacket || o.shirt, 0.8) : skin, 0, 0, 0, el);
    const hand = new THREE.Group(); hand.position.y = -0.27; el.add(hand); J['hand' + side] = hand;
    mesh(box(0.06, 0.09, 0.035), o.gloves ? H.mat(0x151515, 0.8) : skin, 0, -0.045, 0, hand);
    mesh(box(0.02, 0.05, 0.02), o.gloves ? H.mat(0x151515, 0.8) : skin, s * -0.025, -0.03, 0.025, hand);
  }
  // legs
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R';
    const hip = new THREE.Group(); hip.position.set(s * 0.1 * bulk, -0.05, 0); J.hips.add(hip); J['hip' + side] = hip;
    mesh(limb(0.085 * bulk, 0.06 * bulk, 0.45), pants, 0, 0, 0, hip);
    const kn = new THREE.Group(); kn.position.y = -0.43; hip.add(kn); J['kn' + side] = kn;
    mesh(limb(0.06 * bulk, 0.045 * bulk, 0.43), pants, 0, 0, 0, kn);
    const ft = new THREE.Group(); ft.position.y = -0.43; kn.add(ft); J['ft' + side] = ft;
    mesh(geo('shoe', () => { const g = new THREE.BoxGeometry(0.1, 0.07, 0.25); g.translate(0, -0.03, 0.05); return g; }), shoes, 0, 0, 0, ft);
  }
  if (o.gun) {
    const gun = H.buildGun(typeof o.gun === 'string' ? H.npcGun(o.gun) : o.gun, null, null, true);
    gun.scale.setScalar(1);
    J.handR.add(gun); gun.position.set(0, -0.07, 0.04); gun.rotation.set(-Math.PI / 2, 0, 0); J.gun = gun;
  }
  if (o.shield) {
    const sm = new THREE.Group();
    mesh(box(0.6, 1.1, 0.04), H.mat(0x20242a, 0.4, 0.6), 0, 0, 0, sm);
    const win = mesh(box(0.4, 0.12, 0.05), H.mat(0x6a8aa0, 0.1, 0.2, { transparent: true, opacity: 0.6 }), 0, 0.35, 0, sm); win.castShadow = false;
    const lab = new THREE.Mesh(geo('shl', () => new THREE.PlaneGeometry(0.5, 0.12)), new THREE.MeshBasicMaterial({ map: H.textTex('POLICE', { w: 256, h: 64, font: 'bold 50px Arial' }), transparent: true }));
    lab.position.set(0, 0.05, 0.026); sm.add(lab);
    J.handL.add(sm); sm.position.set(0.05, -0.2, 0.25); sm.rotation.set(Math.PI / 2, 0, 0); J.shield = sm;
  }
  root.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
  const h = { root, J, a: { phase: Math.random() * 6, speed: 0, state: 'idle', aimPitch: 0, t: 0, lean: 0, deadT: 0, deadSide: 1 }, bulk };
  H.animHuman(h, 0);
  return h;
};
// NPC-held gun stand-ins
H.npcGun = k => ({ pistol: H.WMAP.chimano_88, smg: H.WMAP.compact_5, ar: H.WMAP.bastion_m4, shotgun: H.WMAP.reinfeld_880, sniper: H.WMAP.rattlesnake, taser: H.WMAP.chimano_88, lmg: H.WMAP.brenner_21 }[k] || H.WMAP.chimano_88);

/* Procedural animation. States: idle, walk/run (by speed), aim, crouch, surrender,
 kneel (cable-tied), cower, phone, carry, downed, dead, sit, drive, melee, wave. */
const R = (j, x, y, z, k, dt) => { j.rotation.x = H.damp(j.rotation.x, x, k, dt); j.rotation.y = H.damp(j.rotation.y, y, k, dt); j.rotation.z = H.damp(j.rotation.z, z, k, dt); };
H.animHuman = function (h, dt) {
  const J = h.J, a = h.a; a.t += dt;
  const sp = a.speed, st = a.state;
  const k = dt === 0 ? 1e9 : 12;
  const run = H.clamp(sp / 5, 0, 1), walking = sp > 0.15;
  a.phase += dt * (walking ? 2.2 + sp * 1.25 : 0);
  const ph = a.phase, sn = Math.sin(ph), cs = Math.cos(ph);
  let hipY = 0.95, hipX = 0, hipRotY = 0, spX = 0, spY = 0, chX = 0, nkX = 0, nkY = 0, rootTilt = 0;
  let lH = [0, 0, 0], rH = [0, 0, 0], lK = 0, rK = 0, lF = 0, rF = 0;
  let lS = [0, 0, 0.08], rS = [0, 0, -0.08], lE = [0, 0, 0], rE = [0, 0, 0];
  const swing = walking ? (0.35 + run * 0.55) : 0;
  if (walking) {
    lH = [-sn * swing, 0, 0]; rH = [sn * swing, 0, 0];
    lK = Math.max(0, cs) * (0.5 + run * 0.9) + 0.05; rK = Math.max(0, -cs) * (0.5 + run * 0.9) + 0.05;
    lF = -lH[0] * 0.3; rF = -rH[0] * 0.3;
    hipY = 0.95 - Math.abs(cs) * 0.03 * (1 + run) - run * 0.04; hipRotY = sn * 0.12 * (1 + run);
    spX = run * 0.18; spY = -hipRotY * 1.4;
    lS = [sn * swing * 0.9, 0, 0.08]; rS = [-sn * swing * 0.9, 0, -0.08];
    lE = [-0.3 - run * 0.9 - Math.max(0, sn) * 0.4, 0, 0]; rE = [-0.3 - run * 0.9 - Math.max(0, -sn) * 0.4, 0, 0];
  } else {
    const br = Math.sin(a.t * 1.6) * 0.015; chX = br; lS[2] = 0.08 + br; rS[2] = -0.08 - br;
    lE = [-0.12, 0, 0]; rE = [-0.12, 0, 0];
  }
  const aimP = a.aimPitch || 0;
  if (st === 'aim' || st === 'shoot') {
    // rifle/pistol hold: right arm forward, left arm supporting
    const p = -Math.PI / 2 - aimP;
    rS = [p + 0.1, -0.15, -0.1]; rE = [-0.25, 0, 0];
    lS = [p + 0.25, 0.65, 0.1]; lE = [-0.65, 0, 0];
    spY = -0.25; nkY = 0.25; nkX = aimP * 0.5;
    if (st === 'shoot') { rS[0] -= Math.sin(a.t * 40) * 0.04; }
  }
  if (st === 'crouch' || a.crouch) { hipY -= 0.38; lH[0] -= 1.0; rH[0] -= 0.7; lK += 1.6; rK += 1.3; lF -= 0.5; rF -= 0.5; spX += 0.25; }
  if (st === 'surrender') { lS = [-2.9, 0, 0.3]; rS = [-2.9, 0, -0.3]; lE = [-0.6, 0, 0]; rE = [-0.6, 0, 0]; }
  if (st === 'kneel' || st === 'tied') {
    hipY = 0.5; lH = [-1.5, 0, 0.05]; rH = [0.15, 0, -0.05]; lK = 1.5; rK = 1.6; lF = 0.2; rF = 1.3; spX = 0.05;
    if (st === 'tied') { lS = [0.5, 0, 0.35]; rS = [0.5, 0, -0.35]; lE = [-0.9, 0.6, 0]; rE = [-0.9, -0.6, 0]; }
    else { lS = [-2.6, 0, 0.5]; rS = [-2.6, 0, -0.5]; lE = [-1.9, 0, 0]; rE = [-1.9, 0, 0]; }
    nkX = 0.3;
  }
  if (st === 'cower') {
    hipY = 0.42; lH = [-1.9, 0, 0.2]; rH = [-1.9, 0, -0.2]; lK = 2.3; rK = 2.3; lF = -0.3; rF = -0.3; spX = 0.7;
    lS = [-2.5, 0, 0.5]; rS = [-2.5, 0, -0.5]; lE = [-2.0, 0, 0]; rE = [-2.0, 0, 0]; nkX = 0.5;
  }
  if (st === 'phone') { rS = [-0.4, 0, -0.5]; rE = [-2.4, -0.3, 0]; nkY = -0.2; }
  if (st === 'carry') { lS = [-0.3, 0, 0.5]; lE = [-0.2, 0, 0]; spY -= 0.1; }
  if (st === 'wave') { rS = [-2.8, 0, -0.2]; rE = [-0.4 + Math.sin(a.t * 10) * 0.4, 0, 0]; }
  if (st === 'melee') { const m = Math.sin(H.clamp(a.meleeT || 0, 0, 1) * Math.PI); rS = [-1.6 - m * 0.6, 0.4 - m * 1.2, -0.4]; rE = [-0.5, 0, 0]; spY = 0.4 - m * 0.8; }
  if (st === 'sit' || st === 'drive') { hipY = 0.55; lH = [-1.5, 0, 0.08]; rH = [-1.5, 0, -0.08]; lK = 1.5; rK = 1.5; if (st === 'drive') { lS = [-1.1, 0.3, 0.1]; rS = [-1.1, -0.3, -0.1]; lE = [-0.6, 0, 0]; rE = [-0.6, 0, 0]; } }
  if (st === 'downed') { hipY = 0.3; lH = [-1.3, 0, 0.4]; rH = [-0.4, 0, -0.2]; lK = 0.6; rK = 1.4; spX = -0.5; lS = [0.3, 0, 0.5]; rS = [-1.4, 0, -0.1]; rE = [-0.4, 0, 0]; rootTilt = -0.2; }
  if (st === 'dead') {
    // fall over: blend into a sprawled pose over 0.6s
    a.deadT += dt;
    const u = H.clamp(a.deadT / 0.6, 0, 1), e = u * u * (3 - 2 * u);
    hipY = H.lerp(0.95, 0.14, e); rootTilt = -e * Math.PI / 2 * a.deadSide;
    lH = [-0.3 * e, 0, 0.3]; rH = [0.2 * e, 0, -0.2]; lK = 0.4 * e; rK = 0.8 * e;
    lS = [-1.8 * e, 0, 0.6]; rS = [-0.4 * e, 0, -1.2 * e]; lE = [-0.5, 0, 0]; rE = [-0.2, 0, 0]; nkY = 0.6 * e * a.deadSide;
    if (dt) { h.root.rotation.x = H.damp(h.root.rotation.x, rootTilt, 8, dt); }
    J.hips.position.y = hipY;
    R(J.hipL, ...lH, 10, dt); R(J.hipR, ...rH, 10, dt); R(J.knL, lK, 0, 0, 10, dt); R(J.knR, rK, 0, 0, 10, dt);
    R(J.shL, ...lS, 8, dt); R(J.shR, ...rS, 8, dt); R(J.elL, ...lE, 8, dt); R(J.elR, ...rE, 8, dt); R(J.neck, 0, nkY, 0, 8, dt);
    return;
  }
  h.root.rotation.x = H.damp(h.root.rotation.x, rootTilt, k, dt);
  J.hips.position.y = H.damp(J.hips.position.y, hipY, k, dt); J.hips.position.x = hipX;
  R(J.hips, 0, hipRotY, 0, k, dt); R(J.spine, spX, spY, 0, k, dt); R(J.chest, chX, 0, 0, k, dt); R(J.neck, nkX, nkY, 0, k, dt);
  R(J.hipL, ...lH, k, dt); R(J.hipR, ...rH, k, dt); R(J.knL, lK, 0, 0, k, dt); R(J.knR, rK, 0, 0, k, dt);
  R(J.ftL, lF, 0, 0, k, dt); R(J.ftR, rF, 0, 0, k, dt);
  R(J.shL, ...lS, k, dt); R(J.shR, ...rS, k, dt); R(J.elL, ...lE, k, dt); R(J.elR, ...rE, k, dt);
};

/* =================== GUNS ===================
 Built along -z (muzzle forward). Parts are chosen from the archetype and the
 equipped mods' visual keys, so every mod changes the model. */
const PAINT_PATTERN = {};
H.paintTex = function (paint) {
  const [name, a, b, pat] = paint;
  if (PAINT_PATTERN[name]) return PAINT_PATTERN[name];
  const ca = '#' + a.toString(16).padStart(6, '0'), cb = '#' + b.toString(16).padStart(6, '0');
  const t = H.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = ca; g.fillRect(0, 0, w, h);
    g.fillStyle = cb;
    if (pat === 'camo') for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 16, 4 + Math.random() * 10, Math.random() * 3, 0, 7); g.fill(); }
    if (pat === 'stripe') for (let i = 0; i < 10; i++) { g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 20, w / 2, y - 20, w, y + 8); g.lineWidth = 3 + Math.random() * 5; g.strokeStyle = cb; g.stroke(); }
    if (pat === 'hex') { g.strokeStyle = cb; g.lineWidth = 2; for (let y = 0; y < h; y += 14) for (let x = 0; x < w; x += 16) { g.beginPath(); for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2; g.lineTo(x + ((y / 14) % 2) * 8 + Math.cos(an) * 7, y + Math.sin(an) * 7); } g.closePath(); g.stroke(); } }
    if (pat === 'digital') for (let i = 0; i < 300; i++) g.fillRect(Math.floor(Math.random() * 32) * 4, Math.floor(Math.random() * 32) * 4, 4, 4);
    if (pat === 'damascus') { g.strokeStyle = cb; for (let i = 0; i < 40; i++) { g.lineWidth = 1 + Math.random() * 2; g.beginPath(); let y = i * 4; g.moveTo(0, y); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.1 + i) * 6); g.stroke(); } }
    if (pat === 'circuit') { g.strokeStyle = cb; g.lineWidth = 2; for (let i = 0; i < 24; i++) { let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 4; s++) { if (Math.random() < 0.5) x += (Math.random() - 0.5) * 50; else y += (Math.random() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); g.fillStyle = cb; g.fillRect(x - 2, y - 2, 4, 4); } }
  });
  PAINT_PATTERN[name] = t; return t;
};
H.buildGun = function (w, modIds, paintIdx, npc) {
  const g = new THREE.Group();
  const vis = {}; // slot -> visual key
  if (modIds) for (const s in modIds) { const m = H.MODMAP[modIds[s]]; if (m) vis[s] = m.vis; }
  const paint = H.WEAPON_PAINTS[paintIdx || 0];
  const body = paintIdx ? new THREE.MeshStandardMaterial({ map: H.paintTex(paint), roughness: paint[3] === 'metal' ? 0.25 : 0.55, metalness: paint[3] === 'metal' ? 0.85 : 0.35 }) : H.mat(0x1d1f22, 0.45, 0.6);
  const dark = H.mat(0x121314, 0.5, 0.5), steel = H.mat(0x50555c, 0.3, 0.9), wood = new THREE.MeshStandardMaterial({ map: H.tex.wood, roughness: 0.6, color: 0xb07040 });
  const poly = H.mat(0x24262a, 0.85), glass = H.mat(0x305070, 0.05, 0.3, { transparent: true, opacity: 0.6, emissive: 0x0a1a2a });
  const ar = w.arch;
  const P = (sx, sy, sz, m, x, y, z, parent = g) => mesh(box(sx, sy, sz), m, x, y, z, parent);
  const C = (r, len, m, x, y, z, s = 10, parent = g) => { const o = mesh(cyl(r, r, len, s), m, x, y, z, parent); o.rotation.x = Math.PI / 2; return o; };
  let barrelLen = 0.35, muzzleZ = -0.5, topY = 0.06, magZ = -0.1, gripZ = 0.05;
  const isLong = !['pistol', 'revolver'].includes(ar);
  const bmod = vis.barrel === 'short' ? 0.7 : vis.barrel === 'long' ? 1.3 : 1;
  const woody = ['lever', 'double'].includes(ar) || w.name.includes('Volkov 47') || w.name.includes('Crusader') || w.name.includes('Arbiter') || w.name.includes('Chicago') || w.name.includes('Repeater') || w.name.includes('Nagant') || w.name.includes('Peacemaker');
  const furn = woody ? wood : poly;
  if (ar === 'pistol' || ar === 'revolver') {
    if (ar === 'pistol') {
      P(0.034, 0.045, 0.2, body, 0, 0.035, -0.06); // slide
      P(0.03, 0.035, 0.17, dark, 0, -0.005, -0.04); // frame
      for (let i = 0; i < 6; i++) P(0.036, 0.004, 0.003, dark, 0, 0.045, 0.01 + i * 0.008); // serrations
      P(0.008, 0.012, 0.01, dark, 0, 0.064, -0.15); P(0.02, 0.012, 0.01, dark, 0, 0.064, 0.03);
      barrelLen = 0.16;
    } else {
      P(0.035, 0.06, 0.08, steel, 0, 0.02, -0.02);
      const cylr = mesh(cyl(0.032, 0.032, 0.05, 6), steel, 0, 0.015, -0.02, g); cylr.rotation.x = Math.PI / 2;
      C(0.012, 0.18 * bmod, steel, 0, 0.035, -0.15 * bmod);
      P(0.012, 0.012, 0.18 * bmod, steel, 0, 0.05, -0.15 * bmod);
      barrelLen = 0.25 * bmod;
    }
    const gr = P(0.03, 0.1, 0.045, vis.grip === 'wood' || ar === 'revolver' ? wood : poly, 0, -0.06, 0.04); gr.rotation.x = 0.25;
    P(0.004, 0.025, 0.02, steel, 0, -0.025, -0.005); // trigger guard-ish
    P(0.03, 0.006, 0.05, dark, 0, -0.03, -0.01);
    muzzleZ = -0.16 - (ar === 'revolver' ? 0.12 * bmod : 0); topY = 0.06; magZ = 0.04; gripZ = 0.04;
    if (ar === 'pistol') { const m = P(0.026, 0.02, 0.035, dark, 0, -0.12, 0.055); m.rotation.x = 0.25; if (vis.mag === 'ext') P(0.026, 0.06, 0.035, dark, 0, -0.15, 0.065).rotation.x = 0.25; }
  } else if (['gl', 'rocket', 'flame', 'minigun', 'bow', 'crossbow', 'saw'].includes(ar)) {
    if (ar === 'gl') { C(0.045, 0.32, steel, 0, 0.02, -0.18, 14); if (w.name === 'Piglet') { const d = mesh(cyl(0.09, 0.09, 0.14, 12), dark, 0, 0.0, -0.05, g); d.rotation.x = Math.PI / 2; } P(0.05, 0.08, 0.2, poly, 0, -0.02, 0.08); P(0.03, 0.1, 0.04, poly, 0, -0.08, 0.05).rotation.x = 0.3; P(0.04, 0.08, 0.18, poly, 0, -0.01, 0.25); muzzleZ = -0.35; }
    if (ar === 'rocket') { C(0.055, 1.0, H.mat(0x3a4a2a, 0.7), 0, 0.03, -0.1, 14); const war = mesh(geo('rpgwar', () => new THREE.ConeGeometry(0.06, 0.25, 12)), H.mat(0x4a5a3a, 0.6), 0, 0.03, -0.72, g); war.rotation.x = -Math.PI / 2; mesh(cyl(0.07, 0.04, 0.1, 12), H.mat(0x4a5a3a, 0.6), 0, 0.03, -0.55, g).rotation.x = Math.PI / 2; P(0.03, 0.1, 0.04, poly, 0, -0.06, 0.0).rotation.x = 0.3; P(0.03, 0.1, 0.04, poly, 0, -0.06, -0.2).rotation.x = 0.3; P(0.02, 0.06, 0.08, dark, -0.06, 0.08, -0.1); muzzleZ = -0.85; }
    if (ar === 'flame') { C(0.03, 0.55, steel, 0, 0.0, -0.3, 10); C(0.06, 0.35, H.mat(0xa02a1a, 0.4, 0.5), 0, -0.07, -0.05, 14); P(0.03, 0.1, 0.04, poly, 0, -0.07, 0.15).rotation.x = 0.3; P(0.03, 0.08, 0.04, poly, 0, -0.05, -0.3); C(0.04, 0.06, dark, 0, 0.0, -0.6, 10); muzzleZ = -0.62; }
    if (ar === 'minigun') { const bar = new THREE.Group(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; C(0.012, 0.7, steel, Math.cos(a) * 0.04, Math.sin(a) * 0.04, -0.35, 8, bar); } C(0.065, 0.04, dark, 0, 0, -0.55, 12, bar); C(0.065, 0.04, dark, 0, 0, -0.2, 12, bar); g.add(bar); g.userData.spin = bar; P(0.14, 0.14, 0.3, dark, 0, -0.01, 0.15); P(0.03, 0.1, 0.04, poly, 0, -0.12, 0.2).rotation.x = 0.3; P(0.16, 0.03, 0.03, dark, 0, 0.1, 0.05); muzzleZ = -0.72; }
    if (ar === 'bow') { const curve = new THREE.Group(); for (let i = -5; i <= 5; i++) { const a = i / 5; P(0.02, 0.14, 0.025, wood, 0, a * 0.62, -(Math.abs(a) ** 2) * -0.12 - 0.05, curve).rotation.x = a * 0.35; } g.add(curve); const sline = mesh(cyl(0.002, 0.002, 1.35, 4), H.mat(0xe8e0d0), 0, 0, 0.12, g); g.userData.string = sline; P(0.03, 0.1, 0.04, H.mat(0x3a2a1a, 0.9), 0, 0, -0.04); const arrow = C(0.005, 0.75, H.mat(0x8a6a4a), 0, 0.02, -0.25, 6); g.userData.arrow = arrow; muzzleZ = -0.6; topY = 0.05; }
    if (ar === 'crossbow') { P(0.04, 0.05, 0.5, wood, 0, 0, -0.1); const lm = H.mat(0x2a2a2a, 0.5, 0.4); P(0.7, 0.025, 0.04, lm, 0, 0.02, -0.33); mesh(cyl(0.002, 0.002, 0.66, 4), H.mat(0xe8e0d0), 0, 0.03, -0.28, g).rotation.z = Math.PI / 2; P(0.03, 0.1, 0.04, wood, 0, -0.07, 0.06).rotation.x = 0.3; C(0.006, 0.4, H.mat(0x5a4a3a), 0, 0.045, -0.2, 6); muzzleZ = -0.4; }
    if (ar === 'saw') { P(0.12, 0.14, 0.3, H.mat(0xd0a020, 0.5), 0, 0, -0.05); const blade = mesh(cyl(0.16, 0.16, 0.01, 24), steel, 0.08, 0, -0.28, g); blade.rotation.z = Math.PI / 2; g.userData.spin = blade; P(0.03, 0.12, 0.04, poly, 0, -0.1, 0.05).rotation.x = 0.3; P(0.16, 0.03, 0.03, dark, 0, 0.1, -0.1); muzzleZ = -0.3; }
  } else {
    // receiver
    const rl = ar === 'bullpup' || ar === 'bullpupsmg' ? 0.42 : ar === 'smg' ? 0.22 : ar === 'lmg' ? 0.38 : ar === 'sniper' ? 0.3 : SGARCH(ar) ? 0.3 : 0.3;
    const rh = ar === 'lmg' ? 0.09 : ar === 'smg' ? 0.06 : 0.07;
    const rz = ar === 'bullpup' || ar === 'bullpupsmg' ? 0.05 : -0.02;
    P(0.048, rh, rl, body, 0, 0.02, rz);
    P(0.05, 0.03, rl * 0.6, dark, 0, -0.025, rz - 0.02); // lower
    P(0.012, 0.015, 0.03, dark, 0.026, 0.035, rz + 0.04); // charging handle
    P(0.003, 0.03, 0.06, steel, 0.025, 0.02, rz - 0.02); // ejection port
    // top rail
    if (ar !== 'lever' && ar !== 'double') for (let i = 0; i < 8; i++) P(0.03, 0.008, 0.012, dark, 0, 0.02 + rh / 2 + 0.004, rz - rl / 2 + 0.03 + i * (rl - 0.06) / 7);
    // barrel
    const blBase = ar === 'sniper' ? 0.55 : ar === 'dmr' ? 0.48 : ar === 'lmg' ? 0.5 : ar === 'smg' ? 0.22 : ar === 'bullpupsmg' ? 0.15 : ar === 'bullpup' ? 0.3 : SGARCH(ar) ? 0.45 : 0.38;
    barrelLen = blBase * bmod;
    const frontZ = rz - rl / 2;
    const br = (SGARCH(ar) ? 0.016 : 0.011) * (vis.barrel === 'heavy' ? 1.4 : 1);
    if (ar === 'double') { C(br, barrelLen, steel, -0.017, 0.03, frontZ - barrelLen / 2, 10); C(br, barrelLen, steel, 0.017, 0.03, frontZ - barrelLen / 2, 10); }
    else C(br, barrelLen, steel, 0, 0.035, frontZ - barrelLen / 2, 10);
    if (ar === 'pump' || ar === 'lever' || ar === 'autosg') C(0.013, barrelLen * 0.8, dark, 0, 0.005, frontZ - barrelLen * 0.4, 10); // tube mag
    // handguard
    const hgLen = Math.min(barrelLen * 0.8, 0.3);
    const fv = vis.fore || 'std';
    if (ar === 'pump') { const pumpG = P(0.05, 0.045, 0.14, furn, 0, 0.005, frontZ - 0.12); g.userData.pump = pumpG; }
    else if (ar === 'sniper' || woody) P(0.05, 0.05, hgLen + 0.05, furn, 0, 0.01, frontZ - hgLen / 2);
    else if (fv === 'slim') P(0.04, 0.04, hgLen, body, 0, 0.03, frontZ - hgLen / 2);
    else { P(0.056, 0.056, hgLen, fv === 'rail' ? dark : body, 0, 0.03, frontZ - hgLen / 2); if (fv === 'rail') for (let i = 0; i < 6; i++) P(0.062, 0.006, 0.01, steel, 0, 0.03, frontZ - 0.02 - i * hgLen / 6); }
    if (fv === 'vert') P(0.025, 0.08, 0.028, poly, 0, -0.03, frontZ - hgLen * 0.6);
    if (fv === 'angled') P(0.025, 0.04, 0.07, poly, 0, -0.01, frontZ - hgLen * 0.4).rotation.x = -0.5;
    if (fv === 'bipod') { for (const s of [-1, 1]) { const l = P(0.008, 0.16, 0.008, dark, s * 0.02, -0.06, frontZ - hgLen); l.rotation.z = s * 0.3; l.rotation.x = -0.6; } }
    // front sight post
    if (!vis.sight || vis.sight === 'irons') P(0.006, 0.03, 0.006, dark, 0, 0.07, frontZ - barrelLen + 0.04);
    muzzleZ = frontZ - barrelLen;
    // magazine
    magZ = ar === 'bullpup' || ar === 'bullpupsmg' ? rz + rl / 2 - 0.08 : rz - 0.03;
    const mv = vis.mag || 'std';
    if (ar === 'lmg') { const bx = P(0.08, 0.1, 0.1, H.mat(0x3a4030, 0.8), 0.0, -0.06, rz); if (mv === 'drum') bx.scale.set(1.1, 1.2, 1.1); }
    else if (SGARCH(ar)) { if (ar === 'autosg') P(0.036, 0.12, 0.05, dark, 0, -0.07, magZ).rotation.x = 0.15; }
    else if (ar === 'sniper' || ar === 'dmr') P(0.036, 0.06, 0.06, dark, 0, -0.05, magZ);
    else if (mv === 'drum') { const d = mesh(cyl(0.065, 0.065, 0.06, 16), dark, 0, -0.09, magZ, g); d.rotation.z = Math.PI / 2; P(0.03, 0.05, 0.04, dark, 0, -0.04, magZ); }
    else {
      const ml = mv === 'quad' ? 0.24 : mv === 'ext' ? 0.2 : 0.15, curv = w.name.includes('Volkov') ? 0.35 : 0.12;
      const mg = new THREE.Group(); mg.position.set(0, -0.02, magZ); mg.rotation.x = curv; g.add(mg);
      P(mv === 'quad' ? 0.05 : 0.028, ml, 0.06, dark, 0, -ml / 2, 0, mg);
      if (mv === 'quick') P(0.015, 0.02, 0.01, H.mat(0xd04020), 0, -ml - 0.005, 0.02, mg);
      g.userData.mag = mg;
    }
    // pistol grip
    gripZ = ar === 'bullpup' || ar === 'bullpupsmg' ? rz - 0.05 : rz + rl / 2 - 0.04;
    const gm = vis.grip === 'wood' ? wood : vis.grip === 'rubber' ? H.mat(0x1a1a1a, 1) : poly;
    if (!woody || ar === 'pump') { const gr = P(0.032, 0.1, 0.04, gm, 0, -0.06, gripZ); gr.rotation.x = 0.3; }
    P(0.004, 0.025, 0.03, steel, 0, -0.025, gripZ - 0.04);
    // stock
    const sv = vis.stock || 'std', sz = rz + rl / 2;
    if (ar === 'bullpup' || ar === 'bullpupsmg') P(0.05, 0.08, 0.06, body, 0, 0.0, sz + 0.03);
    else if (sv === 'none') { /* no stock */ }
    else if (woody || ar === 'sniper') { const st = P(0.045, 0.1, 0.3, furn, 0, -0.025, sz + 0.15); st.rotation.x = -0.08; P(0.046, 0.11, 0.02, dark, 0, -0.035, sz + 0.3); }
    else if (sv === 'folded') { P(0.01, 0.06, 0.2, dark, 0.03, 0, sz - 0.08); }
    else if (sv === 'skeleton') { P(0.012, 0.012, 0.22, dark, 0, 0.025, sz + 0.11); P(0.012, 0.012, 0.2, dark, 0, -0.045, sz + 0.1); P(0.03, 0.09, 0.02, poly, 0, -0.01, sz + 0.22); }
    else { C(0.015, 0.16, dark, 0, 0.02, sz + 0.08, 8); const sl = sv === 'heavy' ? 0.17 : sv === 'precision' ? 0.2 : 0.14; P(0.042, sv === 'heavy' ? 0.1 : 0.08, sl, poly, 0, -0.005, sz + 0.1 + sl / 2 - 0.04); P(0.044, sv === 'heavy' ? 0.11 : 0.09, 0.015, H.mat(0x101010, 1), 0, -0.005, sz + 0.1 + sl - 0.04); if (sv === 'precision') P(0.03, 0.03, 0.08, poly, 0, 0.05, sz + 0.16); }
    topY = 0.02 + rh / 2 + 0.01;
  }
  // sight
  const sightV = vis.sight;
  let sightH = 0;
  if (sightV && sightV !== 'irons') {
    const sz = (ar === 'pistol' || ar === 'revolver') ? -0.04 : -0.03;
    if (sightV === 'reddot' || sightV === 'pistoldot') { P(0.03, 0.012, 0.04, dark, 0, topY + 0.006, sz); const h = mesh(geo('tube17', () => new THREE.CylinderGeometry(0.017, 0.017, 0.04, 14, 1, true)), H.mat(0x121314, 0.5, 0.5, { side: THREE.DoubleSide }), 0, topY + 0.03, sz, g); h.rotation.x = Math.PI / 2; mesh(cyl(0.014, 0.014, 0.002, 12), glass, 0, topY + 0.03, sz - 0.02, g).rotation.x = Math.PI / 2; H.addReticle(g, 'dot', 0, topY + 0.03, sz - 0.015, 0.024); sightH = 0.03; }
    else if (sightV === 'reddot2') { P(0.034, 0.02, 0.05, dark, 0, topY + 0.01, sz); const h = mesh(geo('tube20', () => new THREE.CylinderGeometry(0.02, 0.02, 0.06, 14, 1, true)), H.mat(0x121314, 0.5, 0.5, { side: THREE.DoubleSide }), 0, topY + 0.04, sz, g); h.rotation.x = Math.PI / 2; mesh(cyl(0.017, 0.017, 0.002, 12), glass, 0, topY + 0.04, sz - 0.03, g).rotation.x = Math.PI / 2; H.addReticle(g, 'chevron', 0, topY + 0.04, sz - 0.025, 0.03); sightH = 0.04; }
    else if (sightV === 'holo' || sightV === 'reflex') { P(0.04, 0.012, 0.07, dark, 0, topY + 0.006, sz); P(0.006, 0.04, 0.06, dark, -0.018, topY + 0.03, sz); P(0.006, 0.04, 0.06, dark, 0.018, topY + 0.03, sz); P(0.04, 0.006, 0.06, dark, 0, topY + 0.052, sz); const gl = P(0.03, 0.035, 0.002, glass, 0, topY + 0.03, sz - 0.025); gl.castShadow = false; H.addReticle(g, sightV === 'holo' ? 'holo' : 'dot', 0, topY + 0.03, sz - 0.02, 0.032); sightH = 0.03; }
    else { // scopes
      const len = sightV === 'scope_l' ? 0.34 : sightV === 'acog' ? 0.14 : 0.26, r = sightV === 'acog' ? 0.02 : 0.018;
      P(0.02, 0.02, 0.03, dark, 0, topY + 0.01, sz - len * 0.25); P(0.02, 0.02, 0.03, dark, 0, topY + 0.01, sz + len * 0.25);
      C(r, len, sightV === 'thermal' ? H.mat(0x2a2a20, 0.5) : dark, 0, topY + 0.04, sz, 14);
      if (sightV !== 'acog') { C(r * 1.5, 0.06, dark, 0, topY + 0.04, sz - len / 2, 14); C(r * 1.3, 0.04, dark, 0, topY + 0.04, sz + len / 2, 14); }
      mesh(cyl(r * 1.3, r * 1.3, 0.002, 14), glass, 0, topY + 0.04, sz - len / 2 - 0.03, g).rotation.x = Math.PI / 2;
      const er = sightV === 'acog' ? r * 1.1 : r * 1.25, ez = sz + len / 2 + (sightV === 'acog' ? 0.004 : 0.022);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(er, 32), H.lensMaterial(sightV === 'thermal')); lens.position.set(0, topY + 0.04, ez); g.add(lens);
      g.userData.lens = lens; g.userData.optic = sightV;
      P(0.012, 0.015, 0.015, dark, 0, topY + 0.065, sz); P(0.015, 0.012, 0.015, dark, 0.024, topY + 0.04, sz);
      sightH = 0.04;
    }
  } else if (ar !== 'bow' && ar !== 'saw' && ar !== 'minigun' && ar !== 'flame') {
    for (const sx of [-1, 1]) P(0.006, 0.016, 0.01, dark, sx * 0.009, topY + 0.008, (isLong ? 0.08 : 0.02)); // rear notch
    P(0.024, 0.004, 0.01, dark, 0, topY + 0.002, (isLong ? 0.08 : 0.02));
  }
  // muzzle device
  const mv = vis.muzzle;
  if (mv && mv !== 'none' && !['gl', 'rocket', 'flame', 'minigun', 'bow', 'crossbow', 'saw'].includes(ar)) {
    const my = ar === 'pistol' ? 0.035 : 0.035, sr = ar === 'pistol' || ar === 'revolver' ? 0.018 : 0.022;
    if (mv.startsWith('sup')) { const l = mv === 'sup_s' ? 0.1 : mv === 'sup_m' ? 0.15 : 0.22; C(sr * (mv === 'sup_l' ? 1.25 : 1), l, H.mat(0x222428, 0.6, 0.4), 0, my, muzzleZ - l / 2, 14); muzzleZ -= l; }
    else if (mv === 'brake') { C(sr * 0.9, 0.06, steel, 0, my, muzzleZ - 0.03, 8); for (let i = 0; i < 3; i++) P(0.05, 0.005, 0.01, dark, 0, my, muzzleZ - 0.012 - i * 0.017); muzzleZ -= 0.06; }
    else if (mv === 'comp' || mv === 'flash') { const c = mesh(cyl(sr * (mv === 'flash' ? 1.3 : 0.9), sr * 0.7, 0.07, 8), steel, 0, my, muzzleZ - 0.035, g); c.rotation.x = -Math.PI / 2; muzzleZ -= 0.07; }
  }
  // gadget
  const gv = vis.gadget;
  if (gv && gv !== 'none') {
    const gz = ar === 'pistol' || ar === 'revolver' ? -0.1 : muzzleZ * 0.5, gx = ar === 'pistol' || ar === 'revolver' ? 0 : 0.035, gy = ar === 'pistol' || ar === 'revolver' ? -0.025 : 0.03;
    P(0.022, 0.025, 0.06, dark, gx, gy, gz);
    if (gv === 'laser' || gv === 'combo') { const dot = mesh(sph(0.005, 6, 6), H.mat(0xff2020, 0.2, 0, { emissive: 0xff0000 }), gx, gy + 0.005, gz - 0.031, g); dot.castShadow = false; g.userData.laserAt = new THREE.Vector3(gx, gy + 0.005, gz - 0.035); }
    if (gv === 'flash' || gv === 'combo') { mesh(cyl(0.014, 0.014, 0.003, 10), H.mat(0xffffe0, 0.2, 0, { emissive: 0xffffc0 }), gx, gy - 0.003, gz - 0.031, g).rotation.x = Math.PI / 2; }
  }
  g.userData.muzzle = new THREE.Vector3(0, ar === 'pistol' || ar === 'revolver' ? 0.035 : 0.035, muzzleZ);
  g.userData.sightY = topY + (sightH || 0.012);
  g.userData.magZ = magZ; g.userData.gripZ = gripZ;
  g.traverse(m => { if (m.isMesh) m.castShadow = !npc; });
  return g;
};
function SGARCH(a) { return a === 'pump' || a === 'autosg' || a === 'lever' || a === 'double'; }

/* optics: reflex reticles and scope lenses */
const RET_TEX = {};
H.addReticle = function (g, kind, x, y, z, size) {
  if (!RET_TEX[kind]) RET_TEX[kind] = H.canvasTex(64, 64, (c) => {
    c.strokeStyle = c.fillStyle = kind === 'holo' ? '#ff3a3a' : kind === 'chevron' ? '#ff4020' : '#ff2020'; c.shadowColor = '#ff0000'; c.shadowBlur = 6;
    if (kind === 'dot') { c.beginPath(); c.arc(32, 32, 3, 0, 7); c.fill(); }
    if (kind === 'holo') { c.lineWidth = 2; c.beginPath(); c.arc(32, 32, 20, 0, 7); c.stroke(); c.beginPath(); c.arc(32, 32, 2.5, 0, 7); c.fill(); for (const [a, b] of [[32, 4], [32, 60], [4, 32], [60, 32]]) { c.fillRect(a - 1, b - 4, 2, 8); } }
    if (kind === 'chevron') { c.lineWidth = 3; c.beginPath(); c.moveTo(22, 40); c.lineTo(32, 30); c.lineTo(42, 40); c.stroke(); c.fillRect(31, 40, 2, 14); }
  }, false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: RET_TEX[kind], transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending }));
  m.position.set(x, y, z); m.renderOrder = 5; g.add(m); g.userData.reticle = m;
};
H.lensMaterial = function (thermal) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, on: { value: 0 }, thermal: { value: thermal ? 1 : 0 }, t: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D map; uniform float on; uniform float thermal; uniform float t; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
      void main(){
        vec2 c = vUv - 0.5; float r = length(c) * 2.0; if (r > 1.0) discard;
        vec3 col = vec3(0.01, 0.015, 0.03);
        if (on > 0.5) {
          col = texture2D(map, vUv).rgb;
          if (thermal > 0.5) { float l = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(vec3(0.05,0.07,0.12), vec3(1.0,0.95,0.85), smoothstep(0.08, 0.9, l)); col += (fract(sin(dot(vUv*t, vec2(12.9898,78.233)))*43758.5453) - 0.5) * 0.05; }
          else col = pow(aces(col * 1.05), vec3(1.0/2.2));
        }
        float lw = 0.0035;
        float cross = (abs(c.x) < lw && abs(c.y) < 0.46) || (abs(c.y) < lw && abs(c.x) < 0.46) ? 1.0 : 0.0;
        float posts = (abs(c.x) < 0.014 && abs(c.y) > 0.22) || (abs(c.y) < 0.014 && abs(c.x) > 0.22) ? 1.0 : 0.0;
        float mils = 0.0; for (int i = 1; i < 5; i++) { float p = float(i) * 0.045; if (length(vec2(abs(c.x) - p, c.y)) < 0.006 || length(vec2(c.x, abs(c.y) - p)) < 0.006) mils = 1.0; }
        col = mix(col, thermal > 0.5 ? vec3(0.0, 0.9, 0.3) : vec3(0.0), max(max(cross, posts), mils));
        if (length(c) < 0.008) col = vec3(1.0, 0.15, 0.1);
        col *= mix(1.0, 0.0, smoothstep(0.86, 1.0, r));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
};

/* melee models held in the right hand, pointing along -z */
H.buildMelee = function (m) {
  const g = new THREE.Group(), s = m.shape;
  const steel = H.mat(0xb8bec4, 0.25, 0.9), dark = H.mat(0x1a1a1a, 0.7), wood = new THREE.MeshStandardMaterial({ map: H.tex.wood, roughness: 0.6, color: 0xb07040 });
  const P = (sx, sy, sz, mt, x, y, z) => mesh(box(sx, sy, sz), mt, x, y, z, g);
  if (s === 'fist' || s === 'knuckles') { if (s === 'knuckles') for (let i = 0; i < 4; i++) mesh(geo('ring', () => new THREE.TorusGeometry(0.012, 0.005, 6, 10)), steel, 0, 0.02, -0.02 - i * 0.022, g).rotation.y = Math.PI / 2; return g; }
  if (s === 'knife' || s === 'cleaver' || s === 'machete' || s === 'sword') {
    const L = s === 'sword' ? 0.75 : s === 'machete' ? 0.45 : s === 'cleaver' ? 0.2 : 0.18, W = s === 'cleaver' ? 0.09 : s === 'machete' ? 0.045 : 0.03;
    P(0.025, 0.03, 0.12, s === 'sword' ? H.mat(0x2a1a14, 0.8) : dark, 0, 0, 0.04);
    P(0.006, W, L, steel, 0, W * 0.3, -L / 2 - 0.02);
    if (s === 'sword') P(0.03, 0.05, 0.01, H.mat(0xd8b04a, 0.3, 1), 0, 0, -0.02);
  } else if (s === 'axe' || s === 'pick' || s === 'hammer' || s === 'shovel' || s === 'crowbar') {
    const L = s === 'hammer' ? 0.8 : s === 'crowbar' ? 0.6 : 0.6;
    if (s === 'crowbar') { P(0.02, 0.02, L, H.mat(0xa01a1a, 0.4, 0.6), 0, 0, -L / 2 + 0.1); P(0.02, 0.06, 0.02, H.mat(0xa01a1a, 0.4, 0.6), 0, 0.03, -L + 0.1); }
    else {
      P(0.03, 0.03, L, wood, 0, 0, -L / 2 + 0.1);
      if (s === 'axe') P(0.012, 0.14, 0.1, H.mat(0xc02a1a, 0.4, 0.6), 0, 0.06, -L + 0.12);
      if (s === 'pick') P(0.025, 0.32, 0.03, steel, 0, 0, -L + 0.12);
      if (s === 'hammer') P(0.09, 0.09, 0.16, dark, 0, 0, -L + 0.12).rotation.x = Math.PI / 2;
      if (s === 'shovel') P(0.16, 0.01, 0.2, steel, 0, 0, -L);
    }
  } else if (s === 'bat' || s === 'club' || s === 'stick') {
    if (s === 'bat') { const b = mesh(cyl(0.035, 0.018, 0.8, 10), wood, 0, 0, -0.3, g); b.rotation.x = -Math.PI / 2; }
    else { P(0.018, 0.018, 0.8, s === 'club' ? steel : dark, 0, 0, -0.3); P(0.04, 0.05, 0.1, s === 'club' ? steel : wood, 0, s === 'club' ? 0.02 : 0, -0.72); }
  } else if (s === 'pan') { P(0.02, 0.02, 0.25, dark, 0, 0, -0.05); const p = mesh(cyl(0.12, 0.1, 0.03, 16), dark, 0, 0, -0.3, g); p.rotation.x = 0; }
  else if (s === 'bottle') { const b = mesh(cyl(0.03, 0.035, 0.22, 10), H.mat(0x2a6a2a, 0.1, 0.1, { transparent: true, opacity: 0.8 }), 0, 0, -0.12, g); b.rotation.x = Math.PI / 2; }
  else if (s === 'saw') { P(0.08, 0.12, 0.25, H.mat(0xd06a20, 0.5), 0, 0, 0); P(0.01, 0.06, 0.45, steel, 0, 0, -0.33); }
  return g;
};

/* =================== MASKS =================== */
const MASK_TEX = {};
H.maskPatternTex = function (pi, ci) {
  const k = pi + '_' + ci; if (MASK_TEX[k]) return MASK_TEX[k];
  const pat = H.MASK_PATTERNS[pi], [, a, b] = H.MASK_COLORS[ci];
  const ca = '#' + a.toString(16).padStart(6, '0'), cb = '#' + b.toString(16).padStart(6, '0');
  const t = H.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = ca; g.fillRect(0, 0, w, h); g.fillStyle = cb; g.strokeStyle = cb;
    const R = H.seeded(pi * 31 + ci * 7 + 1);
    switch (pat) {
      case 'stripes': for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 14, h); break;
      case 'checker': for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) g.fillRect(x * 32, y * 32, 32, 32); break;
      case 'dots': for (let y = 16; y < h; y += 32) for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); } break;
      case 'camo': for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(R() * w, R() * h, 10 + R() * 26, 6 + R() * 16, R() * 3, 0, 7); g.fill(); } break;
      case 'flames': for (let i = 0; i < 9; i++) { g.beginPath(); const x = i * 30; g.moveTo(x, h); g.quadraticCurveTo(x - 20, h * 0.5, x + 10, h * (0.1 + R() * 0.3)); g.quadraticCurveTo(x + 10, h * 0.6, x + 30, h); g.fill(); } break;
      case 'zebra': g.lineWidth = 10; for (let i = 0; i < 14; i++) { g.beginPath(); const y = i * 20; g.moveTo(0, y); g.bezierCurveTo(80, y + 30 * (R() - 0.5), 160, y + 30 * (R() - 0.5), w, y); g.stroke(); } break;
      case 'hex': g.lineWidth = 3; for (let y = 0; y < h; y += 24) for (let x = 0; x < w; x += 28) { g.beginPath(); for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2; g.lineTo(x + ((y / 24) % 2) * 14 + Math.cos(an) * 12, y + Math.sin(an) * 12); } g.closePath(); g.stroke(); } break;
      case 'splatter': for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(R() * w, R() * h, 2 + R() * 14, 0, 7); g.fill(); } break;
      case 'tribal': g.lineWidth = 8; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w / 2, h / 2, 20 + i * 22, i, i + 2.4); g.stroke(); } break;
      case 'stars': for (let i = 0; i < 18; i++) { const x = R() * w, y = R() * h, r = 6 + R() * 10; g.beginPath(); for (let j = 0; j < 10; j++) { const an = j / 10 * Math.PI * 2 - Math.PI / 2, rr = j % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } g.fill(); } break;
      case 'skulls': for (let i = 0; i < 12; i++) { const x = R() * w, y = R() * h; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); g.fillRect(x - 6, y + 6, 12, 8); g.fillStyle = ca; g.fillRect(x - 6, y - 2, 4, 4); g.fillRect(x + 2, y - 2, 4, 4); g.fillStyle = cb; } break;
      case 'circuit': g.lineWidth = 3; for (let i = 0; i < 30; i++) { let x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 5; s++) { if (R() < 0.5) x += (R() - 0.5) * 70; else y += (R() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); g.fillRect(x - 4, y - 4, 8, 8); } break;
      case 'tiger': g.lineWidth = 9; for (let i = 0; i < 12; i++) { g.beginPath(); const x = R() * w; g.moveTo(x, 0); g.quadraticCurveTo(x + 30 * (R() - 0.5), h / 2, x + 20 * (R() - 0.5), h * R()); g.stroke(); } break;
      case 'gradient': { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, ca); gr.addColorStop(1, cb); g.fillStyle = gr; g.fillRect(0, 0, w, h); break; }
      case 'grid': g.lineWidth = 3; for (let i = 0; i <= w; i += 24) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } break;
      case 'waves': g.lineWidth = 6; for (let y = 0; y < h; y += 22) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.06) * 8); g.stroke(); } break;
      case 'cracks': g.lineWidth = 2; for (let i = 0; i < 14; i++) { let x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (R() - 0.5) * 40; y += (R() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); } break;
      case 'diamonds': for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x + 16, y); g.lineTo(x + 32, y + 16); g.lineTo(x + 16, y + 32); g.lineTo(x, y + 16); g.closePath(); if ((x + y) / 32 % 2) g.fill(); } break;
      case 'leopard': for (let i = 0; i < 40; i++) { const x = R() * w, y = R() * h; g.beginPath(); g.arc(x, y, 6 + R() * 5, 0, 5); g.lineWidth = 4; g.stroke(); } break;
      default: break;
    }
  });
  MASK_TEX[k] = t; return t;
};
// mask: {shape, mat, pat, col}
H.buildMask = function (m) {
  const g = new THREE.Group();
  const [, rough, metal] = H.MASK_MATERIALS[m.mat || 0];
  const base = new THREE.MeshStandardMaterial({ map: H.maskPatternTex(m.pat || 0, m.col || 0), roughness: rough, metalness: metal });
  const [, ca, cb] = H.MASK_COLORS[m.col || 0];
  const acc = H.mat(cb, rough, metal), acc2 = H.mat(ca, rough, metal);
  const black = H.mat(0x050505, 0.9), white = H.mat(0xf4f4f0, 0.5), red = H.mat(0xc01818, 0.4);
  const shape = m.shape || 'clown';
  // face shell: a half-ellipsoid facing +z
  const shell = geo('maskshell', () => { const s = new THREE.SphereGeometry(0.13, 20, 16, -Math.PI / 2, Math.PI, 0, Math.PI); s.scale(0.95, 1.2, 0.85); return s; });
  const face = mesh(shell, base, 0, 0, 0.005, g); face.rotation.y = 0;
  const eye = (x, y, r = 0.022, m2 = black) => { const e = mesh(sph(r, 10, 8), m2, x, y, 0.1, g); e.scale.z = 0.4; return e; };
  const P = (sx, sy, sz, mt, x, y, z) => mesh(box(sx, sy, sz), mt, x, y, z, g);
  const cone = (r, h, mt, x, y, z, rx = 0, rz = 0) => { const c = mesh(geo('mc' + r + h, () => new THREE.ConeGeometry(r, h, 10)), mt, x, y, z, g); c.rotation.set(rx, 0, rz); return c; };
  const S = (r, mt, x, y, z, sx = 1, sy = 1, sz = 1) => { const s = mesh(sph(r, 12, 10), mt, x, y, z, g); s.scale.set(sx, sy, sz); return s; };
  switch (shape) {
    case 'clown': eye(-0.045, 0.03); eye(0.045, 0.03); S(0.03, red, 0, 0, 0.115); P(0.1, 0.02, 0.02, red, 0, -0.06, 0.1); for (const s of [-1, 1]) S(0.05, acc, s * 0.12, 0.07, 0, 1, 1.2, 1); break;
    case 'skull': S(0.03, black, -0.045, 0.03, 0.09, 1, 1.2, 0.5); S(0.03, black, 0.045, 0.03, 0.09, 1, 1.2, 0.5); cone(0.018, 0.04, black, 0, -0.02, 0.105, Math.PI); for (let i = -3; i <= 3; i++) P(0.012, 0.03, 0.01, white, i * 0.016, -0.08, 0.1); break;
    case 'hockey': for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if ((x + y) % 2 === 0) S(0.008, black, x * 0.03, y * 0.035, 0.11); P(0.03, 0.04, 0.01, red, -0.06, 0.07, 0.1).rotation.z = 0.5; P(0.03, 0.04, 0.01, red, 0.06, 0.07, 0.1).rotation.z = -0.5; eye(-0.045, 0.03, 0.02); eye(0.045, 0.03, 0.02); break;
    case 'demon': eye(-0.045, 0.03, 0.022, H.mat(0xffcc00, 0.2, 0, { emissive: 0xaa6600 })); eye(0.045, 0.03, 0.022, H.mat(0xffcc00, 0.2, 0, { emissive: 0xaa6600 })); cone(0.025, 0.12, acc, -0.08, 0.15, 0.02, 0, 0.4); cone(0.025, 0.12, acc, 0.08, 0.15, 0.02, 0, -0.4); P(0.1, 0.02, 0.02, black, 0, -0.06, 0.1); for (let i = -2; i <= 2; i++) cone(0.007, 0.025, white, i * 0.02, -0.07, 0.105, Math.PI); break;
    case 'robot': P(0.22, 0.26, 0.05, acc2, 0, 0, 0.09); P(0.16, 0.03, 0.02, H.mat(0x40e0ff, 0.2, 0, { emissive: 0x2090c0 }), 0, 0.03, 0.12); P(0.1, 0.04, 0.02, black, 0, -0.07, 0.12); mesh(cyl(0.006, 0.006, 0.1, 6), acc, 0, 0.18, 0, g); S(0.015, red, 0, 0.23, 0); break;
    case 'kabuki': eye(-0.045, 0.03, 0.018); eye(0.045, 0.03, 0.018); P(0.06, 0.008, 0.01, red, -0.045, 0.06, 0.11).rotation.z = 0.4; P(0.06, 0.008, 0.01, red, 0.045, 0.06, 0.11).rotation.z = -0.4; P(0.05, 0.015, 0.01, red, 0, -0.07, 0.105); break;
    case 'bear': case 'panda': case 'monkey': case 'pig': case 'cat': case 'wolf': case 'fox': case 'owl': case 'bull': case 'buffalo': {
      const ears = { bear: 'round', panda: 'round', monkey: 'side', pig: 'tri', cat: 'tri', wolf: 'tri', fox: 'tri', owl: 'tuft', bull: 'horn', buffalo: 'horn' }[shape];
      if (ears === 'round') { S(0.045, shape === 'panda' ? black : acc, -0.1, 0.13, 0); S(0.045, shape === 'panda' ? black : acc, 0.1, 0.13, 0); }
      if (ears === 'side') { S(0.04, acc, -0.13, 0.02, 0, 0.5, 1, 1); S(0.04, acc, 0.13, 0.02, 0, 0.5, 1, 1); }
      if (ears === 'tri') { cone(0.04, 0.08, acc, -0.08, 0.15, 0, 0, 0.3); cone(0.04, 0.08, acc, 0.08, 0.15, 0, 0, -0.3); }
      if (ears === 'tuft') { cone(0.03, 0.07, acc, -0.08, 0.15, 0, 0, 0.6); cone(0.03, 0.07, acc, 0.08, 0.15, 0, 0, -0.6); }
      if (ears === 'horn') { cone(0.022, 0.14, white, -0.13, 0.1, 0, 0, 1.2); cone(0.022, 0.14, white, 0.13, 0.1, 0, 0, -1.2); }
      if (shape === 'panda') { S(0.035, black, -0.045, 0.03, 0.09, 1, 1.2, 0.5); S(0.035, black, 0.045, 0.03, 0.09, 1, 1.2, 0.5); }
      if (shape === 'owl') { S(0.04, white, -0.045, 0.03, 0.09, 1, 1, 0.5); S(0.04, white, 0.045, 0.03, 0.09, 1, 1, 0.5); cone(0.015, 0.05, H.mat(0xd8a020, 0.4), 0, -0.01, 0.12, Math.PI / 2 + 0.6); }
      eye(-0.045, 0.03, 0.016, shape === 'owl' ? black : black); eye(0.045, 0.03, 0.016);
      const snout = ['wolf', 'fox', 'bear', 'pig', 'bull', 'buffalo', 'monkey', 'panda', 'cat'].includes(shape);
      if (snout) { S(0.05, acc2, 0, -0.04, 0.1, shape === 'pig' ? 1 : 0.9, 0.7, shape === 'wolf' || shape === 'fox' ? 1.6 : 0.9); S(shape === 'pig' ? 0.03 : 0.014, shape === 'pig' ? H.mat(0xf0a0a0, 0.6) : black, 0, -0.03, shape === 'wolf' || shape === 'fox' ? 0.18 : 0.14, 1, 0.8, 0.5); }
      if (shape === 'bull' || shape === 'buffalo') mesh(geo('ring2', () => new THREE.TorusGeometry(0.02, 0.004, 6, 12)), H.mat(0xd8b04a, 0.2, 1), 0, -0.07, 0.15, g);
      break;
    }
    case 'gas': S(0.1, black, 0, 0.0, 0.05, 1, 1, 0.8); for (const s of [-1, 1]) { const l = mesh(cyl(0.032, 0.032, 0.02, 12), H.mat(0x60a0ff, 0.05, 0.4, { transparent: true, opacity: 0.8 }), s * 0.048, 0.03, 0.12, g); l.rotation.x = Math.PI / 2; } { const f = mesh(cyl(0.04, 0.045, 0.07, 12), acc, 0, -0.06, 0.14, g); f.rotation.x = Math.PI / 2 - 0.4; } break;
    case 'tiki': P(0.22, 0.3, 0.04, new THREE.MeshStandardMaterial({ map: H.tex.wood, roughness: 0.8 }), 0, 0, 0.1); eye(-0.05, 0.05, 0.03, white); eye(0.05, 0.05, 0.03, white); P(0.14, 0.04, 0.02, black, 0, -0.07, 0.125); for (let i = -2; i <= 2; i++) P(0.02, 0.03, 0.01, white, i * 0.025, -0.07, 0.135); break;
    case 'pumpkin': S(0.15, H.mat(0xe07010, 0.7), 0, 0.01, 0.0, 1.1, 0.95, 1); mesh(cyl(0.012, 0.015, 0.05, 6), H.mat(0x3a5a1a), 0, 0.16, 0, g); cone(0.025, 0.04, black, -0.05, 0.04, 0.125, Math.PI / 2); cone(0.025, 0.04, black, 0.05, 0.04, 0.125, Math.PI / 2); P(0.12, 0.025, 0.02, black, 0, -0.05, 0.13); break;
    case 'alien': S(0.15, acc2, 0, 0.04, 0, 1, 1.2, 0.9); S(0.04, black, -0.05, 0.02, 0.11, 1.4, 0.8, 0.5).rotation.z = -0.5; S(0.04, black, 0.05, 0.02, 0.11, 1.4, 0.8, 0.5).rotation.z = 0.5; break;
    case 'samurai': case 'oni': P(0.2, 0.06, 0.04, acc, 0, -0.07, 0.1); eye(-0.045, 0.03, 0.018); eye(0.045, 0.03, 0.018); if (shape === 'oni') { cone(0.022, 0.09, white, -0.07, 0.15, 0.03, 0, 0.3); cone(0.022, 0.09, white, 0.07, 0.15, 0.03, 0, -0.3); for (const s of [-1, 1]) cone(0.01, 0.035, white, s * 0.04, -0.06, 0.13, 0); } else { P(0.28, 0.04, 0.12, acc, 0, 0.15, -0.02); cone(0.012, 0.1, H.mat(0xd8b04a, 0.2, 1), 0, 0.2, 0.06, 0, 0); } break;
    case 'plague': eye(-0.045, 0.04, 0.026, H.mat(0x203040, 0.05, 0.5)); eye(0.045, 0.04, 0.026, H.mat(0x203040, 0.05, 0.5)); cone(0.04, 0.24, acc, 0, -0.04, 0.2, Math.PI / 2 + 0.3); break;
    case 'luchador': eye(-0.045, 0.03, 0.026, black); eye(0.045, 0.03, 0.026, black); for (const s of [-1, 1]) { const f = cone(0.03, 0.08, acc, s * 0.05, 0.08, 0.1, 0, s * 0.8); f.scale.z = 0.3; } P(0.07, 0.03, 0.01, acc, 0, -0.07, 0.105); break;
    case 'cyborg': eye(-0.045, 0.03); S(0.03, H.mat(0xff2020, 0.2, 0, { emissive: 0xff0000 }), 0.045, 0.03, 0.1, 1, 1, 0.5); P(0.09, 0.2, 0.03, H.mat(0x9aa0a8, 0.25, 0.9), 0.06, 0.02, 0.09); break;
    case 'jester': eye(-0.045, 0.03); eye(0.045, 0.03); for (let i = -1; i <= 1; i++) { cone(0.03, 0.15, i ? acc : acc2, i * 0.09, 0.17, 0, 0, -i * 0.7); S(0.018, H.mat(0xd8b04a, 0.2, 1), i * 0.16, 0.22 + (i ? 0 : 0.03), 0); } P(0.1, 0.012, 0.01, black, 0, -0.07, 0.105).rotation.z = 0.15; break;
    case 'knight': case 'spartan': S(0.15, H.mat(0x9aa0a8, 0.3, 0.9), 0, 0.02, -0.01, 1, 1.15, 1); P(0.16, 0.025, 0.04, black, 0, 0.04, 0.13); if (shape === 'knight') for (let i = -2; i <= 2; i++) P(0.006, 0.07, 0.02, black, i * 0.025, -0.04, 0.135); else { P(0.03, 0.14, 0.02, black, 0, -0.04, 0.14); P(0.03, 0.06, 0.32, red, 0, 0.19, -0.02); } break;
    case 'ghost': S(0.16, white, 0, 0.02, 0, 1, 1.3, 1); S(0.03, black, -0.045, 0.03, 0.14, 1, 1.4, 0.4); S(0.03, black, 0.045, 0.03, 0.14, 1, 1.4, 0.4); S(0.025, black, 0, -0.06, 0.14, 1, 1.5, 0.4); break;
    case 'diamond': { const d = mesh(geo('dia', () => new THREE.OctahedronGeometry(0.17, 0)), H.mat(ca, 0.05, 0.3, { transparent: true, opacity: 0.85 }), 0, 0.02, 0.02, g); d.scale.set(0.9, 1.2, 0.8); eye(-0.045, 0.03); eye(0.045, 0.03); break; }
    case 'crown': eye(-0.045, 0.03); eye(0.045, 0.03); mesh(cyl(0.12, 0.12, 0.08, 12, 1), H.mat(0xd8b04a, 0.2, 1), 0, 0.16, 0, g); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cone(0.02, 0.06, H.mat(0xd8b04a, 0.2, 1), Math.cos(a) * 0.11, 0.22, Math.sin(a) * 0.11); } break;
    case 'visor': P(0.24, 0.07, 0.04, H.mat(0x101820, 0.05, 0.6, { emissive: 0x0a2030 }), 0, 0.04, 0.1); break;
    case 'balaclava': S(0.135, black, 0, 0.02, -0.005, 0.98, 1.22, 0.92); P(0.13, 0.035, 0.02, H.mat(0xe0ac88, 0.6), 0, 0.03, 0.115); break;
    case 'welding': P(0.24, 0.3, 0.06, acc2, 0, 0, 0.09); P(0.12, 0.04, 0.02, H.mat(0x203a20, 0.05, 0.5), 0, 0.03, 0.125); break;
    case 'carnival': P(0.24, 0.07, 0.02, acc, 0, 0.04, 0.115); eye(-0.05, 0.04, 0.022); eye(0.05, 0.04, 0.022); for (let i = 0; i < 5; i++) cone(0.01, 0.14, H.mat(H.pick([0xd02a2a, 0x2a8ad0, 0xd8b04a]), 0.5), -0.1 + i * 0.05, 0.15, -0.02, 0, (2 - i) * 0.25); break;
    case 'stitch': eye(-0.045, 0.03); eye(0.045, 0.03); for (let i = 0; i < 6; i++) P(0.004, 0.025, 0.004, black, -0.06 + i * 0.024, -0.06, 0.11); P(0.15, 0.004, 0.004, black, 0, -0.06, 0.11); P(0.004, 0.12, 0.004, black, 0.07, 0.07, 0.1); break;
    case 'dragon': eye(-0.045, 0.04, 0.02, H.mat(0x80ff40, 0.2, 0, { emissive: 0x40a020 })); eye(0.045, 0.04, 0.02, H.mat(0x80ff40, 0.2, 0, { emissive: 0x40a020 })); S(0.06, acc2, 0, -0.05, 0.12, 0.9, 0.6, 1.4); for (const s of [-1, 1]) cone(0.02, 0.15, acc, s * 0.08, 0.15, -0.03, -0.6, s * -0.3); break;
    case 'medusa': eye(-0.045, 0.03); eye(0.045, 0.03); for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI; const sn = mesh(cyl(0.012, 0.004, 0.14, 6), acc, Math.cos(a) * 0.13, 0.08 + Math.sin(a) * 0.1, -0.02, g); sn.rotation.z = a - Math.PI / 2; } break;
    case 'zombie': eye(-0.045, 0.03, 0.024, H.mat(0xe8e8c0, 0.4)); eye(0.045, 0.03, 0.02); P(0.1, 0.03, 0.02, black, 0, -0.07, 0.1); S(0.03, H.mat(0x5a0a0a, 0.8), 0.06, -0.03, 0.1, 1, 1, 0.4); break;
    case 'mime': eye(-0.045, 0.03, 0.02); eye(0.045, 0.03, 0.02); P(0.004, 0.05, 0.005, black, -0.045, 0.07, 0.11); P(0.004, 0.05, 0.005, black, 0.045, 0.07, 0.11); S(0.02, red, 0, -0.07, 0.1, 1.6, 0.6, 0.5); break;
    default: eye(-0.045, 0.03); eye(0.045, 0.03);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
};

/* =================== VEHICLES =================== */
H.CAR_TYPES = {
  sedan: { L: 4.6, W: 1.85, H: 1.45, speed: 38, accel: 9, color: null, name: 'Stallion Sedan' },
  sports: { L: 4.4, W: 1.95, H: 1.18, speed: 52, accel: 14, color: null, name: 'Cheetah GT' },
  muscle: { L: 4.8, W: 1.95, H: 1.3, speed: 46, accel: 12, color: null, name: 'Sabre V8' },
  suv: { L: 4.9, W: 2.0, H: 1.8, speed: 36, accel: 8, color: null, name: 'Granger 4x4' },
  van: { L: 5.2, W: 2.05, H: 2.2, speed: 30, accel: 6, color: 0xe8e8e8, name: 'Burrito Van' },
  taxi: { L: 4.6, W: 1.85, H: 1.45, speed: 36, accel: 9, color: 0xf0c020, name: 'Cab' },
  police: { L: 4.8, W: 1.9, H: 1.5, speed: 48, accel: 12, color: 0x101418, name: 'Interceptor' },
  swatvan: { L: 5.6, W: 2.2, H: 2.4, speed: 32, accel: 7, color: 0x14161a, name: 'Riot Van' },
  armored: { L: 6.4, W: 2.4, H: 2.6, speed: 26, accel: 5, color: 0xa8aaa0, name: 'Securicar' },
  convertible: { L: 4.5, W: 1.9, H: 1.2, speed: 44, accel: 11, color: null, name: 'Coquette Cabrio' },
};
const CAR_COLORS = [0xe8e8e8, 0x101010, 0xc01a1a, 0x1a4ac0, 0xf0c020, 0x20a0a0, 0xe86aa0, 0x6a2ac0, 0x2a7a3a, 0xd06a1a, 0x8a8a8a, 0x40e0d0, 0xff4a8a];
H.buildCar = function (type, color) {
  const T = H.CAR_TYPES[type] || H.CAR_TYPES.sedan;
  const g = new THREE.Group();
  const col = color ?? T.color ?? H.pick(CAR_COLORS);
  const paint = new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.55 });
  const glass = H.mat(0x1a2a3a, 0.05, 0.6, { transparent: true, opacity: 0.75 });
  const dark = H.mat(0x111111, 0.8), chrome = H.mat(0xd8dce0, 0.15, 1), tyre = H.mat(0x161616, 0.9);
  const L = T.L, W = T.W, Hh = T.H;
  const P = (sx, sy, sz, m, x, y, z, parent = g) => mesh(box(sx, sy, sz), m, x, y, z, parent);
  const boxy = ['van', 'swatvan', 'armored', 'suv'].includes(type);
  const lowY = 0.35, bodyH = boxy ? Hh * 0.55 : Hh * 0.45;
  // lower body with a beveled look: main block + side skirts + bumpers
  P(W, bodyH, L, paint, 0, lowY + bodyH / 2, 0);
  P(W * 0.96, 0.12, L + 0.12, dark, 0, lowY + 0.06, 0);
  P(W * 0.9, 0.18, 0.1, type === 'police' ? dark : chrome, 0, lowY + 0.15, L / 2 + 0.03);
  P(W * 0.9, 0.18, 0.1, type === 'police' ? dark : chrome, 0, lowY + 0.15, -L / 2 - 0.03);
  // hood slope
  if (!boxy) { const hood = P(W * 0.98, 0.1, L * 0.32, paint, 0, lowY + bodyH + 0.0, -L * 0.3); hood.rotation.x = 0.06; }
  // cabin
  const cabL = boxy ? L * (type === 'van' || type === 'swatvan' || type === 'armored' ? 0.78 : 0.62) : L * (type === 'sports' ? 0.42 : 0.5);
  const cabZ = boxy ? L * 0.08 : L * 0.04, cabH = Hh - bodyH - lowY + 0.05;
  if (type === 'convertible') {
    P(W * 0.9, 0.3, 0.06, glass, 0, lowY + bodyH + 0.15, cabZ - cabL / 2 + 0.2).rotation.x = -0.4;
    for (const s of [-1, 1]) P(0.45, 0.5, 0.45, H.mat(0x3a2a1a, 0.7), s * 0.42, lowY + bodyH, cabZ + 0.2);
  } else {
    const cab = new THREE.Group(); cab.position.set(0, lowY + bodyH, cabZ); g.add(cab);
    const roofW = W * (boxy ? 0.98 : 0.86);
    P(roofW, 0.06, cabL * (boxy ? 1 : 0.7), type === 'taxi' ? paint : paint, 0, cabH, boxy ? 0 : cabL * 0.05, cab);
    // windows: windscreen, rear, sides
    const ws = P(roofW * 0.98, cabH * 1.05, 0.04, glass, 0, cabH / 2, -cabL / 2 + (boxy ? 0.05 : cabL * 0.12), cab); ws.rotation.x = boxy ? -0.15 : -0.55;
    const rw = P(roofW * 0.98, cabH * 1.05, 0.04, boxy ? paint : glass, 0, cabH / 2, cabL / 2 - (boxy ? 0.05 : cabL * 0.1), cab); rw.rotation.x = boxy ? 0 : 0.5;
    for (const s of [-1, 1]) {
      P(0.04, cabH * 0.8, cabL * (boxy ? 0.35 : 0.62), glass, s * roofW / 2, cabH / 2, boxy ? -cabL * 0.3 : cabL * 0.03, cab);
      if (boxy) P(0.05, cabH, cabL * 0.62, paint, s * roofW / 2, cabH / 2, cabL * 0.18, cab);
      P(0.05, cabH, 0.08, paint, s * roofW / 2, cabH / 2, -cabL * 0.05, cab); // B pillar
    }
    if (type === 'taxi') { P(0.6, 0.15, 0.22, H.mat(0xfff0a0, 0.4, 0, { emissive: 0x806020 }), 0, cabH + 0.1, 0, cab); }
    if (type === 'police') {
      P(1.1, 0.1, 0.25, dark, 0, cabH + 0.08, 0, cab);
      const lr = P(0.45, 0.1, 0.24, H.mat(0xff2020, 0.3, 0, { emissive: 0xff0000 }), -0.3, cabH + 0.12, 0, cab);
      const lb = P(0.45, 0.1, 0.24, H.mat(0x2050ff, 0.3, 0, { emissive: 0x0030ff }), 0.3, cabH + 0.12, 0, cab);
      g.userData.lights = [lr, lb];
      for (const s of [-1, 1]) P(0.06, bodyH * 0.6, L * 0.5, H.mat(0xf0f0f0, 0.4), s * (W / 2 + 0.01), lowY + bodyH * 0.55, 0);
      const lab = new THREE.Mesh(geo('poltxt', () => new THREE.PlaneGeometry(1.6, 0.35)), new THREE.MeshBasicMaterial({ map: H.textTex('POLICE', { w: 512, h: 112, font: 'bold 80px Arial', fg: '#1a2a6a' }), transparent: true }));
      for (const s of [-1, 1]) { const l = lab.clone(); l.position.set(s * (W / 2 + 0.04), lowY + bodyH * 0.55, 0); l.rotation.y = s * Math.PI / 2; g.add(l); }
    }
    if (type === 'swatvan' || type === 'armored') {
      const lab = new THREE.Mesh(geo('swtxt' + type, () => new THREE.PlaneGeometry(2.4, 0.45)), new THREE.MeshBasicMaterial({ map: H.textTex(type === 'armored' ? 'SECURICAR' : 'SWAT', { w: 512, h: 96, font: 'bold 76px Arial', fg: type === 'armored' ? '#1a3a1a' : '#e8e8e8' }), transparent: true }));
      for (const s of [-1, 1]) { const l = lab.clone(); l.position.set(s * (W / 2 + 0.03), lowY + bodyH + cabH * 0.5, cabL * 0.15); l.rotation.y = s * Math.PI / 2; g.add(l); }
    }
  }
  // lights
  const head = H.mat(0xfffff0, 0.1, 0, { emissive: 0xfff8d0, emissiveIntensity: 0.6 }), tail = H.mat(0xc01010, 0.2, 0, { emissive: 0x900000 });
  for (const s of [-1, 1]) { P(0.32, 0.12, 0.05, head, s * (W / 2 - 0.25), lowY + bodyH - 0.1, -L / 2 - 0.01); P(0.3, 0.1, 0.05, tail, s * (W / 2 - 0.25), lowY + bodyH - 0.1, L / 2 + 0.01); }
  P(W * 0.4, 0.14, 0.04, dark, 0, lowY + bodyH * 0.5, -L / 2 - 0.02); // grille
  // wheels
  g.userData.wheels = [];
  const wr = boxy ? 0.42 : 0.36;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wg = new THREE.Group(); wg.position.set(sx * (W / 2 - 0.12), wr, sz * (L / 2 - 0.85)); g.add(wg);
    const t = mesh(cyl(wr, wr, 0.26, 16), tyre, 0, 0, 0, wg); t.rotation.z = Math.PI / 2;
    const rim = mesh(cyl(wr * 0.62, wr * 0.62, 0.27, 10), chrome, 0, 0, 0, wg); rim.rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) { const sp = P(0.28, 0.05, wr * 1.1, H.mat(0x8a8e92, 0.3, 0.9), 0, 0, 0, wg); sp.rotation.x = i / 5 * Math.PI; }
    g.userData.wheels.push(wg);
    P(0.3, 0.08, wr * 2.3, paint, sx * (W / 2 - 0.05), wr * 1.9, sz * (L / 2 - 0.85)); // arch
  }
  // mirrors and handles
  if (!boxy || type === 'suv') for (const s of [-1, 1]) P(0.18, 0.1, 0.08, paint, s * (W / 2 + 0.06), lowY + bodyH + 0.1, cabZ - cabL * 0.35);
  g.userData.type = type; g.userData.T = T; g.userData.paint = paint;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return g;
};

/* =================== CITY PROPS =================== */
H.buildPalm = function (h = 8, seed = Math.random()) {
  const g = new THREE.Group();
  const trunkM = H.mat(0x8a6a4a, 0.9);
  const segs = 9; let x = 0, y = 0, lean = (seed - 0.5) * 0.4;
  for (let i = 0; i < segs; i++) {
    const r = 0.22 - i * 0.012;
    const s = mesh(cyl(r * 0.92, r, h / segs + 0.05, 8), trunkM, x, y + h / segs / 2, 0, g);
    s.rotation.z = -lean * (i / segs) * 0.6;
    x += Math.sin(lean * i / segs) * h / segs; y += h / segs;
  }
  const leafM = new THREE.MeshStandardMaterial({ map: H.tex.palmLeaf, side: THREE.DoubleSide, alphaTest: 0.4, roughness: 0.8 });
  const lg = geo('palmleaf', () => { const p = new THREE.PlaneGeometry(1.2, 3.4, 1, 6); const pos = p.attributes.position; for (let i = 0; i < pos.count; i++) { const v = (pos.getY(i) + 1.7) / 3.4; pos.setZ(i, -v * v * 1.6); } p.translate(0, 1.7, 0); p.computeVertexNormals(); return p; });
  for (let i = 0; i < 9; i++) {
    const l = new THREE.Mesh(lg, leafM); l.position.set(x, y, 0);
    l.rotation.set(0, i / 9 * Math.PI * 2 + seed, 0); l.rotateX(-1.0 - Math.random() * 0.3);
    l.castShadow = true; g.add(l);
  }
  for (let i = 0; i < 4; i++) mesh(sph(0.12, 6, 6), H.mat(0x5a4020, 0.8), x + Math.cos(i * 1.6) * 0.18, y - 0.15, Math.sin(i * 1.6) * 0.18, g);
  return g;
};
H.buildStreetLight = function () {
  const g = new THREE.Group(), m = H.mat(0x2a2c30, 0.5, 0.6);
  mesh(cyl(0.08, 0.12, 6, 8), m, 0, 3, 0, g);
  mesh(box(0.08, 0.08, 1.6), m, 0, 6, -0.75, g);
  mesh(box(0.35, 0.12, 0.6), m, 0, 5.94, -1.5, g);
  mesh(box(0.3, 0.02, 0.5), H.mat(0xfff0c0, 0.2, 0, { emissive: 0xffe0a0, emissiveIntensity: 1 }), 0, 5.87, -1.5, g);
  return g;
};
H.buildNeon = function (text, color) {
  const c = '#' + color.toString(16).padStart(6, '0');
  const t = H.textTex(text, { w: 512, h: 128, font: 'italic bold 78px "Brush Script MT", "Pacifico", cursive', fg: '#fff', glow: c });
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, color, depthWrite: false, side: THREE.DoubleSide });
  const p = new THREE.Mesh(geo('neon', () => new THREE.PlaneGeometry(6, 1.5)), m);
  p.userData.neon = true;
  return p;
};
