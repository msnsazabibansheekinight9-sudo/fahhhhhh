'use strict';
// Procedural models: articulated biped rigs for every faction, bosses,
// first-person weapons with armoured gauntlets, pickups.
(function () {
  const M = G.models = {};
  const geoCache = {};
  const geo = (k, f) => geoCache[k] || (geoCache[k] = f());
  const add = (p, m, x, y, z) => { if (x != null) m.position.set(x, y, z); p && p.add(m); return m; };
  const mesh = (g, mat, shadow) => { const m = new THREE.Mesh(g, mat); if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; } return m; };
  const box = (w, h, d, mat, p, x, y, z) => add(p, mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), mat), x || 0, y || 0, z || 0);
  const sph = (r, mat, p, x, y, z, seg) => add(p, mesh(geo(`s${r},${seg || 12}`, () => new THREE.SphereGeometry(r, seg || 12, Math.max(6, (seg || 12) * 2 / 3 | 0))), mat), x || 0, y || 0, z || 0);
  const cyl = (rt, rb, h, mat, p, x, y, z, seg) => add(p, mesh(geo(`c${rt},${rb},${h},${seg || 10}`, () => new THREE.CylinderGeometry(rt, rb, h, seg || 10)), mat), x || 0, y || 0, z || 0);
  const cone = (r, h, mat, p, x, y, z, seg) => add(p, mesh(geo(`k${r},${h},${seg || 8}`, () => new THREE.ConeGeometry(r, h, seg || 8)), mat), x || 0, y || 0, z || 0);
  const tor = (r, t, mat, p, x, y, z, arc) => add(p, mesh(geo(`t${r},${t},${arc || 6.283}`, () => new THREE.TorusGeometry(r, t, 6, 16, arc || Math.PI * 2)), mat), x || 0, y || 0, z || 0);
  // limb hanging from its pivot along -y
  const limb = (r0, r1, len, mat, p, seg) => add(p, mesh(geo(`l${r0},${r1},${len},${seg || 10}`, () => { const g = new THREE.CylinderGeometry(r0, r1, len, seg || 10); g.translate(0, -len / 2, 0); return g; }), mat), 0, 0, 0);
  const grp = (p, x, y, z) => { const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); p && p.add(g); return g; };
  M.h = { box, sph, cyl, cone, tor, limb, grp, mesh, geo };
  const unit = new THREE.CylinderGeometry(1, 1, 1, 8); unit.translate(0, 0.5, 0); unit.rotateX(Math.PI / 2);
  // stretch a unit cylinder between two points (local to the mesh parent)
  const _Z = new THREE.Vector3(0, 0, 1);
  M.span = function (m, a, b, r) {
    m.position.copy(a);
    _t.subVectors(b, a); const len = _t.length();
    m.quaternion.setFromUnitVectors(_Z, _t.divideScalar(len || 1));
    m.scale.set(r, r, len);
  };
  const _t = new THREE.Vector3();

  /* ---------- faction materials ---------- */
  const mats = M.mats = {};
  M.initMats = function () {
    const n = (k, c, o) => G.texNoise(k, c, o);
    mats.chitin = G.mat('chitin', { color: 0xffffff, map: n('tchitin', 0x3b1240, { v: 0.12, bands: 10, r: 4 }), bump: n('tchitin', 0x3b1240), rough: 0.3, metal: 0.15, bs: 0.04 });
    mats.chitin.userData.blood = 0x6e8a10;
    mats.sflesh = G.mat('sflesh', { color: 0xffffff, map: n('tsflesh', 0xb4a184, { v: 0.12, r: 8, cracks: 20 }), rough: 0.6, bs: 0.03 });
    mats.sflesh.userData.blood = 0x6e8a10;
    mats.sglow = G.glow('sglow', 0xffd23a);
    mats.acid = G.mat('acid', { color: 0x4d6a08, emissive: 0x6a9a10, ei: 0.8, rough: 0.2 });
    mats.oskin = G.mat('oskin', { color: 0xffffff, map: n('toskin', 0x3f6b22, { v: 0.14, r: 5, cracks: 12 }), bump: n('toskin', 0x3f6b22), rough: 0.75, bs: 0.04 });
    mats.oskin.userData.blood = 0x5a0a06;
    mats.rust = G.mat('rust', { color: 0xffffff, map: G.texPanels('trust', 0x5a4a3a, { rust: 60, grid: 2 }), rough: 0.6, metal: 0.6 });
    mats.rust.userData.blood = 0x5a0a06;
    mats.ocloth = G.mat('ocloth', { color: 0xffffff, map: n('tocloth', 0x4a3420, { v: 0.15, r: 3 }), rough: 0.95 });
    mats.ored = G.mat('ored', { color: 0x7a1410, rough: 0.5, metal: 0.3 });
    mats.tusk = G.mat('tusk', { color: 0xd8cfb0, rough: 0.4 });
    mats.oeye = G.glow('oeye', 0xff2a10);
    mats.necro = G.mat('necro', { color: 0xffffff, map: G.texPanels('tnecro', 0x8d9294, { grid: 3 }), rough: 0.28, metal: 0.95 });
    mats.necro.userData.blood = 0x36ff7a;
    mats.necroDark = G.mat('necroDark', { color: 0x1d2022, rough: 0.4, metal: 0.85 });
    mats.necroDark.userData.blood = 0x36ff7a;
    mats.ngreen = G.glow('ngreen', 0x3dff7a);
    mats.ngold = G.mat('ngold', { color: 0xb8902c, rough: 0.25, metal: 1 });
    mats.robe = G.mat('robe', { color: 0xffffff, map: n('trobe', 0x3a1a16, { v: 0.12, r: 3, bands: 6 }), rough: 0.95, side: THREE.DoubleSide });
    mats.robe.userData.blood = 0x6a0a0a;
    mats.cflesh = G.mat('cflesh', { color: 0x9a7466, rough: 0.7 });
    mats.cflesh.userData.blood = 0x6a0a0a;
    mats.mask = G.mat('mask', { color: 0x2a2826, rough: 0.5, metal: 0.4 });
    mats.cred = G.glow('cred', 0xff3018);
    mats.brass = G.mat('brass', { color: 0xa07a30, rough: 0.3, metal: 1 });
    mats.dskin = G.mat('dskin', { color: 0xffffff, map: n('tdskin', 0x7e1610, { v: 0.15, r: 5, cracks: 25 }), bump: n('tdskin', 0x7e1610), rough: 0.45, bs: 0.04 });
    mats.dskin.userData.blood = 0x3a0000;
    mats.horn = G.mat('horn', { color: 0x1a1210, rough: 0.35 });
    mats.hellblade = G.mat('hellblade', { color: 0x301010, emissive: 0xff3a10, ei: 0.6, rough: 0.2, metal: 0.8 });
    mats.wing = G.mat('wing', { color: 0x4a0e0a, rough: 0.6, side: THREE.DoubleSide });
    mats.gunmetal = G.mat('gunmetal', { color: 0xffffff, map: G.texPanels('tgun', 0x2c2d30, { grid: 2 }), rough: 0.4, metal: 0.85 });
    mats.wood = G.mat('wood', { color: 0xffffff, map: n('twood', 0x4a2e18, { bands: 30, v: 0.1, r: 2 }), rough: 0.7 });
    // player ceramite
    mats.ceramite = G.mat('ceramite', { color: 0xffffff, map: G.texPanels('tcer', 0x3b4048, { grid: 1 }), rough: 0.35, metal: 0.35 });
    mats.trim = G.mat('trim', { color: 0xc4983a, rough: 0.25, metal: 1 });
    mats.blackMetal = G.mat('blackMetal', { color: 0xffffff, map: G.texPanels('tblk', 0x1e1f22, { grid: 2 }), rough: 0.35, metal: 0.9 });
    mats.crimson = G.mat('crimson', { color: 0x6a0d0d, rough: 0.8 });
    mats.parch = G.mat('parch', { color: 0xd8c8a0, rough: 0.9, side: THREE.DoubleSide });
    mats.wax = G.mat('wax', { color: 0x8a1010, rough: 0.35 });
    mats.glove = G.mat('glove', { color: 0x1a1a1a, rough: 0.8 });
    mats.lens = G.mat('lens', { color: 0x200000, emissive: 0xff2200, ei: 1.2, rough: 0.1 });
  };

  /* ---------- generic biped rig ---------- */
  M.biped = function (s) {
    const rig = { root: new THREE.Group(), s };
    const j = rig.j = {};
    const legH = s.thigh + s.shin + 0.08;
    j.pelvis = grp(rig.root, 0, legH, 0);
    j.torso = grp(j.pelvis, 0, 0.02, 0);
    j.neck = grp(j.torso, 0, s.torso, s.neckZ || 0);
    j.head = grp(j.neck, 0, 0.04, 0);
    for (const side of [-1, 1]) {
      const k = side < 0 ? 'L' : 'R';
      const hip = j['hip' + k] = grp(j.pelvis, side * s.hipW, 0, 0);
      limb(s.legR || 0.09, (s.legR || 0.09) * 0.8, s.thigh, s.legMat, hip);
      const knee = j['knee' + k] = grp(hip, 0, -s.thigh, 0);
      limb((s.legR || 0.09) * 0.8, (s.legR || 0.09) * 0.6, s.shin, s.shinMat || s.legMat, knee);
      const foot = j['foot' + k] = grp(knee, 0, -s.shin, 0);
      box((s.legR || 0.09) * 2, 0.08, (s.foot || 0.28), s.footMat || s.shinMat || s.legMat, foot, 0, -0.04, (s.foot || 0.28) * 0.3);
      const sh = j['sh' + k] = grp(j.torso, side * s.shW, s.torso * 0.86, 0);
      limb(s.armR || 0.07, (s.armR || 0.07) * 0.85, s.upper, s.armMat, sh);
      const el = j['el' + k] = grp(sh, 0, -s.upper, 0);
      limb((s.armR || 0.07) * 0.85, (s.armR || 0.07) * 0.7, s.fore, s.foreMat || s.armMat, el);
      j['hand' + k] = grp(el, 0, -s.fore, 0);
    }
    rig.legH = legH;
    rig.headY = legH + s.torso + 0.15;
    rig.anim = { phase: Math.random() * 6, move: 0, aim: 0, atk: -1, atkType: 0, flinch: 0, flinchV: 0, dead: -1, deathDir: 1, lean: 0, idle: Math.random() * 10 };
    return rig;
  };

  // animate a biped from its anim state
  M.animate = function (rig, dt) {
    const a = rig.anim, j = rig.j, s = rig.s;
    a.idle += dt;
    // spring for hit flinch
    a.flinchV += (-a.flinch * 140 - a.flinchV * 14) * dt;
    a.flinch += a.flinchV * dt;
    const w = G.clamp(a.move, 0, 1.6), ph = a.phase;
    const hunch = s.hunch || 0;
    const gait = s.gait || 1;
    const sw = Math.sin(ph), cw = Math.cos(ph);
    // legs
    const stride = 0.65 * Math.min(1, w) * gait;
    j.hipL.rotation.x = -sw * stride - hunch * 0.5 - (s.digi ? 0.4 : 0);
    j.hipR.rotation.x = sw * stride - hunch * 0.5 - (s.digi ? 0.4 : 0);
    const kb = (s.digi ? 0.8 : 0.1) + hunch * 0.6;
    j.kneeL.rotation.x = kb + Math.max(0, Math.sin(ph + 1.4)) * 1.1 * Math.min(1, w);
    j.kneeR.rotation.x = kb + Math.max(0, Math.sin(ph + 1.4 + Math.PI)) * 1.1 * Math.min(1, w);
    j.footL.rotation.x = -(j.hipL.rotation.x + j.kneeL.rotation.x) * 0.8;
    j.footR.rotation.x = -(j.hipR.rotation.x + j.kneeR.rotation.x) * 0.8;
    const bend = Math.cos(j.hipL.rotation.x) * s.thigh * 0 + (1 - Math.cos(kb)) * s.shin * 0.6 + hunch * 0.08;
    j.pelvis.position.y = rig.legH - bend - Math.abs(cw) * 0.06 * Math.min(1, w) + Math.sin(a.idle * 2) * 0.01;
    j.pelvis.rotation.y = sw * 0.12 * Math.min(1, w);
    j.pelvis.rotation.z = cw * 0.04 * Math.min(1, w);
    // torso
    j.torso.rotation.x = hunch + a.lean + w * 0.12 + a.flinch + Math.sin(a.idle * 2) * 0.02;
    j.torso.rotation.y = -sw * 0.18 * Math.min(1, w);
    j.neck.rotation.x = -hunch * 0.8 - w * 0.08 - a.flinch * 0.6;
    j.head.rotation.y = Math.sin(a.idle * 0.7) * 0.15;
    // arms: walk swing, blended into aim and attack
    const swing = 0.55 * Math.min(1, w);
    let lx = sw * swing, rx = -sw * swing, lz = -0.12, rz = 0.12, le = -0.3, re = -0.3;
    if (s.armsOut) { lz -= 0.25; rz += 0.25; }
    const aim = a.aim;
    if (aim > 0) {
      rx = G.lerp(rx, -1.45 - hunch * 0.6, aim); re = G.lerp(re, -0.15, aim); rz = G.lerp(rz, 0.05, aim);
      if (s.twoHand) { lx = G.lerp(lx, -1.25 - hunch * 0.6, aim); lz = G.lerp(lz, 0.5, aim); le = G.lerp(le, -0.6, aim); }
    }
    if (a.atk >= 0) {
      const p = a.atk;
      const up = G.kf(p, [[0, 0], [0.4, 1], [0.55, -0.2], [1, 0]]);
      if (a.atkType === 0) { // overhead right
        rx = G.lerp(rx, -2.8, Math.max(0, up)) + Math.min(0, up) * -1.2; re = G.lerp(re, -1.2, Math.max(0, up));
        if (s.dual) { lx = G.lerp(lx, -2.6, Math.max(0, up)) + Math.min(0, up) * -1.2; le = G.lerp(le, -1.2, Math.max(0, up)); }
      } else { // horizontal sweep
        const sx = G.kf(p, [[0, 0], [0.4, 1], [0.6, -1], [1, 0]]);
        rx = -1.3 * Math.abs(sx) - 0.2; rz = 0.9 * sx + 0.3; re = -0.5;
        j.torso.rotation.y += -sx * 0.5;
      }
    }
    j.shL.rotation.set(lx, 0, lz); j.shR.rotation.set(rx, 0, rz);
    j.elL.rotation.x = le; j.elR.rotation.x = re;
    if (rig.extra) rig.extra(rig, dt);
    // death: crumple then topple
    if (a.dead >= 0) {
      const t = Math.min(1, a.dead / 0.9);
      const buckle = G.kf(t, [[0, 0], [0.35, 1], [1, 0.4]]);
      j.kneeL.rotation.x += buckle * 1.2; j.kneeR.rotation.x += buckle * 1.0;
      j.hipL.rotation.x -= buckle * 0.8; j.hipR.rotation.x -= buckle * 0.6;
      j.shL.rotation.x = G.lerp(j.shL.rotation.x, -2.6 * a.deathDir, t); j.shR.rotation.x = G.lerp(j.shR.rotation.x, -2.3 * a.deathDir, t);
      j.neck.rotation.x = G.lerp(j.neck.rotation.x, 0.5 * a.deathDir, t);
      const fall = G.kf(t, [[0, 0], [0.25, 0.05], [0.85, 1.04], [0.93, 0.97], [1, 1]]);
      rig.root.rotation.x = -fall * Math.PI / 2 * a.deathDir;
      rig.root.position.y = rig.baseY - buckle * 0.15 + fall * (s.chestD || 0.3) * 0.45;
      if (a.dead > 4) rig.root.position.y -= (a.dead - 4) * 0.4;
    }
  };

  /* ---------- faction builders ---------- */
  // each returns rig with .hit (body/head radii) and attaches weapon refs
  const B = M.build = {};

  function eyes(p, mat, y, z, sep, r) {
    sph(r || 0.03, mat, p, -sep, y, z, 6); sph(r || 0.03, mat, p, sep, y, z, 6);
  }

  B.ripper = function (big) {
    const k = big ? 1 : 1;
    const s = { thigh: 0.42 * k, shin: 0.48 * k, hipW: 0.15, torso: 0.55, shW: 0.24, upper: 0.36, fore: 0.42, legR: 0.07, armR: 0.05, hunch: 0.75, digi: true, gait: 1.2, chestD: 0.4,
      legMat: mats.chitin, shinMat: mats.sflesh, armMat: mats.sflesh, foreMat: mats.chitin, neckZ: 0.08 };
    const r = M.biped(s), j = r.j;
    const body = sph(0.26, mats.sflesh, j.torso, 0, 0.28, 0); body.scale.set(1, 1.25, 0.9);
    for (let i = 0; i < 4; i++) { const p = sph(0.2 - i * 0.02, mats.chitin, j.torso, 0, 0.12 + i * 0.13, -0.13); p.scale.set(1.25, 0.5, 0.8); }
    const head = sph(0.15, mats.chitin, j.head, 0, 0.06, 0.1); head.scale.set(0.9, 0.8, 1.6);
    const crest = cone(0.09, 0.4, mats.chitin, j.head, 0, 0.15, -0.12); crest.rotation.x = -1.9;
    const jaw = box(0.14, 0.04, 0.16, mats.sflesh, j.head, 0, -0.04, 0.22); jaw.rotation.x = 0.2;
    for (const sd of [-1, 1]) { const m = cone(0.02, 0.14, mats.tusk, j.head, sd * 0.07, -0.05, 0.3); m.rotation.x = 1.9; }
    eyes(j.head, mats.sglow, 0.08, 0.26, 0.07, 0.025);
    // scything talons
    for (const k2 of ['L', 'R']) {
      const t = cone(0.05, 0.7, mats.chitin, j['hand' + k2], 0, -0.3, 0.05); t.rotation.x = Math.PI;
    }
    // vestigial claws
    for (const sd of [-1, 1]) { const c = limbAt(j.torso, sd * 0.18, 0.2, 0.15, 0.03, 0.25, mats.sflesh); c.rotation.x = -0.8; }
    // tail
    let tp = j.pelvis; const tail = [];
    for (let i = 0; i < 4; i++) { const g = grp(tp, 0, 0, i === 0 ? -0.15 : -0.22); const c = cone(0.07 - i * 0.014, 0.28, i % 2 ? mats.chitin : mats.sflesh, g, 0, 0, -0.1); c.rotation.x = -Math.PI / 2; tail.push(g); tp = g; }
    r.extra = (rg, dt) => { tail.forEach((g, i) => { g.rotation.y = Math.sin(rg.anim.idle * 5 + i) * 0.25; g.rotation.x = 0.15; }); };
    r.hit = { body: 0.38, head: 0.17 };
    return r;
  };
  function limbAt(p, x, y, z, rad, len, mat) { const g = grp(p, x, y, z); limb(rad, rad * 0.6, len, mat, g); return g; }

  B.spitter = function () {
    const r = B.ripper();
    const j = r.j;
    r.s.hunch = 0.45; r.s.twoHand = false;
    // bio-cannon on right arm
    const can = cyl(0.07, 0.09, 0.5, mats.sflesh, j.handR, 0, -0.2, 0);
    for (let i = 0; i < 3; i++) tor(0.085, 0.02, mats.chitin, j.handR, 0, -0.05 - i * 0.13, 0).rotation.x = Math.PI / 2;
    sph(0.06, mats.acid, j.handR, 0, -0.46, 0);
    r.muzzle = grp(j.handR, 0, -0.5, 0);
    // glowing sacs
    for (let i = 0; i < 3; i++) sph(0.08, mats.acid, j.torso, G.rand(-0.12, 0.12), 0.25 + i * 0.12, -0.24);
    r.hit = { body: 0.38, head: 0.17 };
    return r;
  };

  B.warrior = function () {
    const s = { thigh: 0.55, shin: 0.6, hipW: 0.2, torso: 0.75, shW: 0.33, upper: 0.48, fore: 0.55, legR: 0.1, armR: 0.08, hunch: 0.45, digi: true, chestD: 0.5,
      legMat: mats.chitin, shinMat: mats.sflesh, armMat: mats.sflesh, foreMat: mats.chitin, neckZ: 0.1, twoHand: false };
    const r = M.biped(s), j = r.j;
    const body = sph(0.36, mats.sflesh, j.torso, 0, 0.38, 0.02); body.scale.set(1, 1.2, 0.9);
    for (let i = 0; i < 5; i++) { const p = sph(0.28 - i * 0.02, mats.chitin, j.torso, 0, 0.1 + i * 0.15, -0.16); p.scale.set(1.3, 0.45, 0.85); }
    for (const sd of [-1, 1]) { const p = sph(0.17, mats.chitin, j.torso, sd * 0.33, 0.68, 0); p.scale.set(1, 0.7, 1.1); cone(0.04, 0.3, mats.tusk, j.torso, sd * 0.36, 0.86, -0.05).rotation.z = -sd * 0.4; }
    const head = sph(0.19, mats.chitin, j.head, 0, 0.08, 0.12); head.scale.set(0.9, 0.85, 1.6);
    const crest = cone(0.14, 0.6, mats.chitin, j.head, 0, 0.24, -0.18); crest.rotation.x = -2;
    eyes(j.head, mats.sglow, 0.1, 0.33, 0.09, 0.03);
    for (const sd of [-1, 1]) { const m = cone(0.025, 0.18, mats.tusk, j.head, sd * 0.08, -0.05, 0.38); m.rotation.x = 1.9; }
    const t = cone(0.07, 0.9, mats.chitin, j.handL, 0, -0.4, 0.05); t.rotation.x = Math.PI;
    cyl(0.09, 0.11, 0.55, mats.sflesh, j.handR, 0, -0.22, 0);
    for (let i = 0; i < 3; i++) tor(0.11, 0.025, mats.chitin, j.handR, 0, -0.05 - i * 0.15, 0).rotation.x = Math.PI / 2;
    r.muzzle = grp(j.handR, 0, -0.52, 0);
    // second (upper) pair of scythes on the shoulders
    r.upper = [];
    for (const sd of [-1, 1]) {
      const g = grp(j.torso, sd * 0.4, 0.75, 0.05);
      limb(0.06, 0.05, 0.4, mats.sflesh, g);
      const e = grp(g, 0, -0.4, 0);
      const bl = cone(0.07, 1.0, mats.chitin, e, 0, -0.45, 0); bl.rotation.x = Math.PI;
      g.userData.side = sd; r.upper.push({ g, e });
    }
    r.extra = (rg) => {
      const a = rg.anim;
      r.upper.forEach(({ g, e }, i) => {
        const at = a.atk >= 0 ? G.kf(a.atk, [[0, 0], [0.4, 1], [0.6, -0.5], [1, 0]]) : 0;
        g.rotation.set(-0.9 - at * 1.3 + Math.sin(a.idle * 3 + i) * 0.1, 0, g.userData.side * (0.5 - at * 0.3));
        e.rotation.x = -1.6 + at * 1.2;
      });
    };
    r.hit = { body: 0.55, head: 0.22 };
    return r;
  };

  B.tyrant = function () {
    const r = B.warrior();
    const j = r.j;
    for (let i = 0; i < 6; i++) { const c = cone(0.06, 0.6, mats.tusk, j.torso, (i % 2 ? 1 : -1) * (0.12 + (i >> 1) * 0.04), 0.3 + (i >> 1) * 0.2, -0.3); c.rotation.x = -2.2; }
    // membrane wings
    r.wings = [];
    for (const sd of [-1, 1]) {
      const w = grp(j.torso, sd * 0.25, 0.7, -0.3);
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(sd * 1.8, 0.9); shape.lineTo(sd * 2.2, -0.4); shape.lineTo(sd * 1.4, -0.9); shape.lineTo(sd * 0.7, -1.1); shape.lineTo(0, -0.3);
      const wm = mesh(new THREE.ShapeGeometry(shape), G.mat('swing', { color: 0x4a2a40, rough: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
      w.add(wm);
      for (let b = 0; b < 3; b++) { const bone = cone(0.03, 1.8, mats.chitin, w, sd * 0.8, 0.1 - b * 0.3, 0); bone.rotation.z = -sd * (1.1 + b * 0.35); }
      r.wings.push({ w, sd });
    }
    const prev = r.extra;
    r.extra = (rg, dt) => { prev(rg, dt); r.wings.forEach(({ w, sd }) => { w.rotation.y = sd * (0.6 + Math.sin(rg.anim.idle * 2) * 0.25); w.rotation.x = 0.2; }); };
    return r;
  };

  B.brute = function (ranged) {
    const s = { thigh: 0.4, shin: 0.42, hipW: 0.2, torso: 0.62, shW: 0.42, upper: 0.42, fore: 0.42, legR: 0.11, armR: 0.1, hunch: 0.3, chestD: 0.5,
      legMat: mats.ocloth, shinMat: mats.ocloth, footMat: mats.rust, armMat: mats.oskin, neckZ: 0.18, armsOut: true, twoHand: false };
    const r = M.biped(s), j = r.j;
    const ch = sph(0.36, mats.oskin, j.torso, 0, 0.36, 0.04); ch.scale.set(1.25, 1, 0.85);
    box(0.62, 0.18, 0.42, mats.ocloth, j.torso, 0, 0.06, 0);
    box(0.5, 0.06, 0.44, mats.rust, j.torso, 0, 0.16, 0.0);
    // shoulder pad with spikes
    const pad = box(0.32, 0.12, 0.36, mats.rust, j.torso, -0.44, 0.62, 0); pad.rotation.z = 0.3;
    for (let i = 0; i < 3; i++) cone(0.03, 0.16, mats.rust, j.torso, -0.48 - i * 0.04, 0.76 - i * 0.03, -0.1 + i * 0.1).rotation.z = 0.5;
    box(0.06, 0.6, 0.06, mats.ocloth, j.torso, 0.1, 0.4, 0.33).rotation.z = 0.6;
    // head: low, heavy jaw, tusks, red eyes
    const hd = sph(0.17, mats.oskin, j.head, 0, 0.1, 0.06); hd.scale.set(1.1, 0.9, 1);
    const brow = box(0.28, 0.06, 0.1, mats.oskin, j.head, 0, 0.14, 0.17);
    const jaw = box(0.3, 0.12, 0.22, mats.oskin, j.head, 0, -0.02, 0.12);
    for (const sd of [-1, 1]) { const t = cone(0.025, 0.12, mats.tusk, j.head, sd * 0.1, 0.06, 0.22); t.rotation.x = -0.2; const ear = cone(0.05, 0.18, mats.oskin, j.head, sd * 0.18, 0.12, 0); ear.rotation.z = -sd * 1.4; }
    eyes(j.head, mats.oeye, 0.1, 0.22, 0.07, 0.025);
    sph(0.12, mats.oskin, j.handL, 0, -0.04, 0); sph(0.12, mats.oskin, j.handR, 0, -0.04, 0);
    if (ranged) {
      const gun = grp(j.handR, 0, -0.05, 0.05);
      box(0.12, 0.5, 0.16, mats.rust, gun, 0, -0.2, 0.04);
      cyl(0.04, 0.04, 0.4, mats.gunmetal, gun, 0, -0.5, 0.06);
      cyl(0.1, 0.1, 0.1, mats.rust, gun, 0, -0.18, -0.08).rotation.z = Math.PI / 2;
      box(0.06, 0.18, 0.08, mats.ored, gun, 0, -0.1, 0.12);
      r.muzzle = grp(j.handR, 0, -0.72, 0.1);
    } else {
      const bl = box(0.04, 0.6, 0.22, mats.gunmetal, j.handR, 0, -0.36, 0.08);
      box(0.045, 0.6, 0.03, G.mat('edge', { color: 0xb0b0b0, metal: 1, rough: 0.2 }), j.handR, 0, -0.36, 0.2);
      cyl(0.03, 0.03, 0.18, mats.wood, j.handR, 0, -0.02, 0);
    }
    r.hit = { body: 0.5, head: 0.2 };
    return r;
  };

  B.warlord = function () {
    const s = { thigh: 0.45, shin: 0.5, hipW: 0.28, torso: 0.75, shW: 0.6, upper: 0.5, fore: 0.5, legR: 0.16, armR: 0.14, hunch: 0.25, chestD: 0.7,
      legMat: mats.rust, armMat: mats.rust, neckZ: 0.22, armsOut: true };
    const r = M.biped(s), j = r.j;
    box(1.1, 0.75, 0.75, mats.rust, j.torso, 0, 0.42, 0);
    box(0.9, 0.3, 0.1, mats.ored, j.torso, 0, 0.55, 0.38);
    for (const sd of [-1, 1]) {
      const p = box(0.45, 0.3, 0.6, mats.rust, j.torso, sd * 0.62, 0.78, 0); p.rotation.z = -sd * 0.25;
      for (let i = 0; i < 3; i++) cone(0.05, 0.25, mats.gunmetal, j.torso, sd * (0.6 + i * 0.08), 0.98, -0.15 + i * 0.15);
      cyl(0.08, 0.1, 0.7, mats.gunmetal, j.torso, sd * 0.25, 1.0, -0.42);
    }
    r.exhaust = [grp(j.torso, -0.25, 1.38, -0.42), grp(j.torso, 0.25, 1.38, -0.42)];
    const hd = sph(0.2, mats.oskin, j.head, 0, 0.12, 0.08);
    box(0.36, 0.14, 0.26, mats.oskin, j.head, 0, 0.0, 0.14);
    box(0.44, 0.2, 0.3, mats.rust, j.head, 0, 0.28, 0.02);
    for (const sd of [-1, 1]) { cone(0.035, 0.16, mats.tusk, j.head, sd * 0.12, 0.08, 0.27).rotation.x = -0.2; cone(0.06, 0.4, mats.ored, j.head, sd * 0.18, 0.5, -0.05).rotation.z = -sd * 0.3; }
    eyes(j.head, mats.oeye, 0.14, 0.27, 0.08, 0.03);
    // power claw
    box(0.3, 0.3, 0.3, mats.ored, j.handL, 0, -0.1, 0);
    for (let i = 0; i < 4; i++) { const c = cone(0.05, 0.55, mats.gunmetal, j.handL, -0.1 + (i % 2) * 0.2, -0.45, -0.1 + (i >> 1) * 0.2); c.rotation.x = Math.PI; }
    // big shoota
    box(0.25, 0.7, 0.3, mats.rust, j.handR, 0, -0.3, 0.05);
    for (const o of [-0.07, 0.07]) cyl(0.05, 0.05, 0.5, mats.gunmetal, j.handR, o, -0.85, 0.12);
    r.muzzle = grp(j.handR, 0, -1.1, 0.12);
    r.extra = (rg) => {
      if (Math.random() < 0.25) for (const e of r.exhaust) { e.getWorldPosition(_t); G.fx.smoke.emit(_t.x, _t.y, _t.z, G.rand(-0.3, 0.3), 2, G.rand(-0.3, 0.3), 1.2, 0.2, 0.9, smokeC, smokeC2, 0.4, 0, -0.5, 1); }
    };
    r.hit = { body: 0.75, head: 0.24 };
    return r;
  };
  const smokeC = new THREE.Color(0x1a1a1a), smokeC2 = new THREE.Color(0x444444);

  B.husk = function () {
    const s = { thigh: 0.48, shin: 0.5, hipW: 0.14, torso: 0.62, shW: 0.25, upper: 0.38, fore: 0.38, legR: 0.045, armR: 0.04, hunch: 0.1, chestD: 0.3,
      legMat: mats.necro, armMat: mats.necro, twoHand: true };
    const r = M.biped(s), j = r.j;
    cyl(0.035, 0.035, 0.6, mats.necroDark, j.torso, 0, 0.3, -0.06);
    for (let i = 0; i < 5; i++) { const rb = tor(0.14 - Math.abs(i - 1.5) * 0.015, 0.018, mats.necro, j.torso, 0, 0.18 + i * 0.09, 0, Math.PI * 1.4); rb.rotation.x = Math.PI / 2; rb.rotation.z = -Math.PI * 0.2 + Math.PI; }
    sph(0.06, mats.ngreen, j.torso, 0, 0.36, 0.02, 8);
    for (const sd of [-1, 1]) { const p = sph(0.12, mats.necro, j.torso, sd * 0.25, 0.58, 0); p.scale.set(1, 0.6, 1); }
    box(0.3, 0.06, 0.18, mats.necroDark, j.pelvis, 0, 0, 0);
    // skull
    const sk = sph(0.13, mats.necro, j.head, 0, 0.1, 0.02); sk.scale.set(0.9, 1.05, 1);
    box(0.18, 0.05, 0.1, mats.necroDark, j.head, 0, 0.03, 0.12);
    box(0.13, 0.05, 0.09, mats.necro, j.head, 0, -0.03, 0.08);
    eyes(j.head, mats.ngreen, 0.11, 0.12, 0.045, 0.028);
    // gauss rifle along the right forearm
    const gun = grp(j.handR, 0, 0, 0.05);
    box(0.06, 0.8, 0.1, mats.necroDark, gun, 0, -0.3, 0);
    const rod = cyl(0.015, 0.015, 0.6, mats.ngreen, gun, 0, -0.35, 0.065, 6); rod.castShadow = false;
    const bl = box(0.02, 0.25, 0.1, mats.necro, gun, 0, -0.8, -0.04);
    r.muzzle = grp(j.handR, 0, -0.7, 0.08);
    r.hit = { body: 0.32, head: 0.15 };
    return r;
  };

  B.overlord = function () {
    const r = B.husk();
    const j = r.j;
    box(0.5, 0.45, 0.32, mats.ngold, j.torso, 0, 0.42, 0.02);
    for (const sd of [-1, 1]) { const p = box(0.3, 0.12, 0.34, mats.ngold, j.torso, sd * 0.3, 0.64, 0); p.rotation.z = -sd * 0.3; }
    const crest = box(0.04, 0.4, 0.3, mats.ngold, j.head, 0, 0.28, -0.05);
    for (const sd of [-1, 1]) box(0.03, 0.3, 0.2, mats.ngold, j.head, sd * 0.12, 0.2, -0.05).rotation.z = -sd * 0.3;
    // cloak
    const shape = new THREE.PlaneGeometry(0.8, 1.4, 4, 6);
    const cloak = mesh(shape, G.mat('ncloak', { color: 0x10201a, rough: 0.9, side: THREE.DoubleSide }));
    cloak.position.set(0, 0.0, -0.22); j.torso.add(cloak);
    r.cloak = cloak;
    // staff
    cyl(0.025, 0.025, 1.8, mats.ngold, j.handL, 0, -0.2, 0);
    sph(0.1, mats.ngreen, j.handL, 0, 0.75, 0);
    tor(0.14, 0.02, mats.ngold, j.handL, 0, 0.75, 0);
    r.s.twoHand = false;
    r.extra = (rg) => { cloak.rotation.x = 0.15 + rg.anim.move * 0.3 + Math.sin(rg.anim.idle * 2) * 0.05; };
    r.hit = { body: 0.38, head: 0.16 };
    return r;
  };

  B.cultist = function () {
    const s = { thigh: 0.42, shin: 0.44, hipW: 0.1, torso: 0.55, shW: 0.2, upper: 0.3, fore: 0.3, legR: 0.06, armR: 0.045, hunch: 0.12, chestD: 0.25,
      legMat: mats.robe, armMat: mats.robe, foreMat: mats.cflesh, twoHand: true };
    const r = M.biped(s), j = r.j;
    const ch = cyl(0.17, 0.15, 0.55, mats.robe, j.torso, 0, 0.27, 0); ch.scale.z = 0.75;
    const skirt = cyl(0.17, 0.3, 0.6, mats.robe, j.pelvis, 0, -0.25, 0, 12); skirt.material = mats.robe;
    r.skirt = skirt;
    box(0.36, 0.05, 0.25, mats.brass, j.torso, 0, 0.05, 0);
    box(0.05, 0.5, 0.03, G.mat('cband', { color: 0x8a1a10, rough: 0.8 }), j.torso, 0.06, 0.3, 0.13).rotation.z = 0.5;
    // hood + rebreather
    const hood = sph(0.14, mats.robe, j.head, 0, 0.1, -0.01, 12); hood.scale.set(1, 1.15, 1.1);
    const face = sph(0.1, mats.mask, j.head, 0, 0.07, 0.06, 10);
    for (const sd of [-1, 1]) { const l = cyl(0.035, 0.035, 0.03, mats.lens, j.head, sd * 0.045, 0.1, 0.15); l.rotation.x = Math.PI / 2; }
    const tube = cyl(0.03, 0.04, 0.1, mats.mask, j.head, 0, 0.0, 0.14); tube.rotation.x = 1.2;
    // autogun
    const gun = grp(j.handR, 0, 0, 0.04);
    box(0.05, 0.6, 0.08, mats.gunmetal, gun, 0, -0.2, 0);
    box(0.04, 0.2, 0.05, mats.wood, gun, 0, 0.12, -0.02);
    box(0.04, 0.12, 0.05, mats.gunmetal, gun, 0, -0.18, 0.08);
    cyl(0.012, 0.012, 0.3, mats.gunmetal, gun, 0, -0.6, 0.01, 6);
    r.muzzle = grp(j.handR, 0, -0.74, 0.05);
    r.hit = { body: 0.3, head: 0.14 };
    return r;
  };

  B.bloodfiend = function () {
    const s = { thigh: 0.5, shin: 0.52, hipW: 0.14, torso: 0.6, shW: 0.25, upper: 0.42, fore: 0.44, legR: 0.07, armR: 0.055, hunch: 0.5, digi: true, gait: 1.3, chestD: 0.3,
      legMat: mats.dskin, armMat: mats.dskin, neckZ: 0.1, footMat: mats.horn };
    const r = M.biped(s), j = r.j;
    const ch = sph(0.23, mats.dskin, j.torso, 0, 0.32, 0.02); ch.scale.set(1.1, 1.3, 0.8);
    for (let i = 0; i < 5; i++) cone(0.03, 0.18, mats.horn, j.torso, 0, 0.1 + i * 0.12, -0.17).rotation.x = -2;
    const hd = sph(0.13, mats.dskin, j.head, 0, 0.06, 0.08); hd.scale.set(0.85, 0.9, 1.5);
    const jaw = box(0.12, 0.04, 0.18, mats.dskin, j.head, 0, -0.04, 0.17);
    for (const sd of [-1, 1]) {
      const h1 = grp(j.head, sd * 0.08, 0.14, 0.02);
      let p = h1;
      for (let i = 0; i < 4; i++) { const g = grp(p, 0, i ? 0.12 : 0, 0); g.rotation.set(-0.45, 0, -sd * 0.25); cone(0.04 - i * 0.008, 0.16, mats.horn, g, 0, 0.06, 0); p = g; }
    }
    eyes(j.head, G.glow('dey', 0xffee66), 0.08, 0.2, 0.05, 0.022);
    // hellblade
    const bl = box(0.03, 1.0, 0.1, mats.hellblade, j.handR, 0, -0.5, 0.05);
    cone(0.05, 0.12, mats.horn, j.handR, 0, 0.02, 0);
    for (let i = 0; i < 3; i++) cone(0.02, 0.2, mats.horn, j.handL, -0.03 + i * 0.03, -0.12, 0.03).rotation.x = Math.PI;
    r.hit = { body: 0.34, head: 0.15 };
    return r;
  };

  B.bloodlord = function () {
    const s = { thigh: 0.6, shin: 0.65, hipW: 0.22, torso: 0.8, shW: 0.45, upper: 0.55, fore: 0.55, legR: 0.13, armR: 0.11, hunch: 0.35, digi: true, chestD: 0.6,
      legMat: mats.dskin, armMat: mats.dskin, neckZ: 0.12, footMat: mats.horn };
    const r = M.biped(s), j = r.j;
    const ch = sph(0.42, mats.dskin, j.torso, 0, 0.45, 0.04); ch.scale.set(1.2, 1.1, 0.85);
    box(0.9, 0.2, 0.55, mats.brass, j.torso, 0, 0.82, 0);
    for (let i = 0; i < 5; i++) cone(0.05, 0.3, mats.brass, j.torso, -0.36 + i * 0.18, 0.98, 0);
    box(0.6, 0.2, 0.5, mats.brass, j.pelvis, 0, 0, 0);
    const hd = sph(0.2, mats.dskin, j.head, 0, 0.1, 0.1); hd.scale.set(0.9, 0.9, 1.4);
    box(0.2, 0.06, 0.24, mats.dskin, j.head, 0, -0.04, 0.24);
    for (const sd of [-1, 1]) {
      let p = grp(j.head, sd * 0.12, 0.18, 0);
      for (let i = 0; i < 5; i++) { const g = grp(p, 0, i ? 0.17 : 0, 0); g.rotation.set(-0.35, 0, -sd * 0.35); cone(0.07 - i * 0.012, 0.22, mats.horn, g, 0, 0.09, 0); p = g; }
    }
    eyes(j.head, G.glow('dey', 0xffee66), 0.13, 0.3, 0.08, 0.03);
    // wings
    r.wings = [];
    for (const sd of [-1, 1]) {
      const w = grp(j.torso, sd * 0.3, 0.85, -0.3);
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(sd * 2.4, 1.4); shape.lineTo(sd * 2.8, -0.2); shape.lineTo(sd * 2.2, -0.9); shape.lineTo(sd * 1.4, -0.7); shape.lineTo(sd * 0.8, -1.3); shape.lineTo(0, -0.4);
      w.add(mesh(new THREE.ShapeGeometry(shape), mats.wing));
      for (let b = 0; b < 4; b++) { const bone = cone(0.035, 2.4, mats.horn, w, sd * 1.1, 0.4 - b * 0.35, 0); bone.rotation.z = -sd * (1.0 + b * 0.3); }
      r.wings.push({ w, sd });
    }
    // great axe
    cyl(0.04, 0.04, 1.8, mats.horn, j.handR, 0, -0.5, 0);
    const ax = box(0.04, 0.7, 0.6, mats.hellblade, j.handR, 0, -1.2, 0.3);
    box(0.04, 0.5, 0.4, mats.brass, j.handR, 0, -1.2, -0.18);
    r.s.dual = true;
    r.extra = (rg) => { r.wings.forEach(({ w, sd }) => { w.rotation.y = sd * (0.5 + Math.sin(rg.anim.idle * 1.6) * 0.3); w.rotation.x = 0.25; }); };
    r.hit = { body: 0.6, head: 0.24 };
    return r;
  };

  /* ---------- first-person weapons ---------- */
  // Barrel along -Z, grip near the origin. Each returns {root, parts, muzzle, mag, leftGrip}
  const VM = M.vm = {};
  function seal(p, x, y, z) {
    const g = grp(p, x, y, z);
    const w = cyl(0.022, 0.022, 0.008, mats.wax, g, 0, 0, 0, 12); w.rotation.z = Math.PI / 2;
    for (let i = 0; i < 2; i++) { const s = box(0.003, 0.1 + i * 0.03, 0.02, mats.parch, g, 0.004, -0.06 - i * 0.015, -0.012 + i * 0.024); s.rotation.x = 0.1 - i * 0.2; }
    return g;
  }
  function skull(p, x, y, z, s, mat) {
    const g = grp(p, x, y, z); g.scale.setScalar(s);
    sph(0.05, mat, g, 0, 0.01, 0, 10);
    box(0.06, 0.03, 0.04, mat, g, 0, -0.035, 0.01);
    for (const sd of [-1, 1]) sph(0.014, mats.blackMetal, g, sd * 0.02, 0.008, 0.04, 6);
    return g;
  }
  VM.bolter = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    const body = mats.ceramite, dark = mats.blackMetal, trim = mats.trim;
    box(0.11, 0.15, 0.44, body, R, 0, 0.06, -0.12);
    box(0.115, 0.04, 0.3, dark, R, 0, 0.15, -0.1);
    box(0.02, 0.05, 0.36, trim, R, -0.058, 0.06, -0.13);
    box(0.02, 0.05, 0.36, trim, R, 0.058, 0.06, -0.13);
    // barrel shroud with vent slots
    box(0.09, 0.09, 0.32, dark, R, 0, 0.07, -0.5);
    for (let i = 0; i < 5; i++) box(0.095, 0.02, 0.03, mats.glove, R, 0, 0.09, -0.4 - i * 0.05);
    const mz = cyl(0.04, 0.045, 0.1, dark, R, 0, 0.07, -0.7); mz.rotation.x = Math.PI / 2;
    for (const sd of [-1, 1]) box(0.012, 0.03, 0.05, mats.glove, R, sd * 0.045, 0.07, -0.7);
    // sights
    box(0.02, 0.05, 0.02, dark, R, 0, 0.15, -0.62);
    box(0.06, 0.04, 0.03, dark, R, 0, 0.19, -0.02);
    const notch = box(0.02, 0.02, 0.031, mats.glove, R, 0, 0.205, -0.02);
    // grip + stock
    const grip = box(0.06, 0.16, 0.08, mats.glove, R, 0, -0.06, 0.02); grip.rotation.x = 0.35;
    box(0.07, 0.09, 0.12, body, R, 0, 0.05, 0.14);
    // ejection port
    box(0.005, 0.04, 0.09, mats.glove, R, 0.058, 0.09, -0.1);
    // sickle magazine
    const mag = r.mag = grp(R, 0, -0.01, -0.2);
    for (let i = 0; i < 4; i++) { const s = box(0.07, 0.065, 0.1, dark, mag, 0, -0.04 - i * 0.06, i * 0.022); s.rotation.x = -0.2 - i * 0.05; }
    box(0.075, 0.02, 0.1, trim, mag, 0, -0.27, 0.08).rotation.x = -0.35;
    // ammo counter
    r.counter = mesh(new THREE.PlaneGeometry(0.03, 0.014), new THREE.MeshBasicMaterial({ color: 0xff3020 }), false);
    r.counter.position.set(0.035, 0.172, 0.0); r.counter.rotation.x = -Math.PI / 2 + 0.4; R.add(r.counter);
    skull(R, -0.062, 0.06, -0.25, 0.5, trim).rotation.y = -Math.PI / 2;
    seal(R, 0.06, 0.12, -0.32);
    r.muzzle = grp(R, 0, 0.07, -0.76);
    r.eject = grp(R, 0.07, 0.09, -0.1);
    r.leftGrip = new THREE.Vector3(0, 0.0, -0.45);
    r.adsY = -0.205; r.adsX = 0;
    return r;
  };
  VM.plasma = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    const body = mats.ceramite, dark = mats.blackMetal;
    box(0.12, 0.16, 0.4, dark, R, 0, 0.06, -0.1);
    box(0.06, 0.04, 0.3, mats.trim, R, 0, 0.16, -0.12);
    r.coilMat = new THREE.MeshStandardMaterial({ color: 0x103050, emissive: 0x30a0ff, emissiveIntensity: 1, roughness: 0.2 });
    const core = cyl(0.045, 0.045, 0.34, r.coilMat, R, 0, 0.07, -0.42); core.rotation.x = Math.PI / 2;
    r.rings = [];
    for (let i = 0; i < 6; i++) { const t = tor(0.065, 0.014, dark, R, 0, 0.07, -0.29 - i * 0.055); r.rings.push(t); }
    for (const sd of [-1, 1]) { const rail = box(0.015, 0.02, 0.38, body, R, sd * 0.07, 0.07, -0.43); }
    const mz = cyl(0.055, 0.04, 0.08, dark, R, 0, 0.07, -0.63); mz.rotation.x = Math.PI / 2;
    r.vents = [];
    for (const sd of [-1, 1]) { const v = box(0.01, 0.1, 0.16, body, R, sd * 0.065, 0.07, -0.05); r.vents.push({ v, sd }); }
    const grip = box(0.06, 0.16, 0.08, mats.glove, R, 0, -0.06, 0.02); grip.rotation.x = 0.35;
    box(0.07, 0.09, 0.12, body, R, 0, 0.05, 0.13);
    // flask
    const mag = r.mag = grp(R, 0, -0.02, -0.18);
    const fl = cyl(0.04, 0.04, 0.16, r.coilMat, mag, 0, -0.08, 0);
    cyl(0.045, 0.045, 0.03, dark, mag, 0, -0.17, 0);
    box(0.02, 0.06, 0.02, dark, R, 0, 0.17, -0.55);
    box(0.06, 0.04, 0.03, dark, R, 0, 0.19, -0.02);
    seal(R, -0.065, 0.11, -0.2);
    r.muzzle = grp(R, 0, 0.07, -0.68);
    r.leftGrip = new THREE.Vector3(0, -0.02, -0.4);
    r.adsY = -0.205; r.adsX = 0;
    return r;
  };
  VM.flamer = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    const body = mats.ceramite, dark = mats.blackMetal;
    box(0.1, 0.13, 0.36, body, R, 0, 0.05, -0.1);
    const nozzle = cyl(0.03, 0.05, 0.4, dark, R, 0, 0.08, -0.45); nozzle.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) tor(0.05, 0.01, mats.brass, R, 0, 0.08, -0.32 - i * 0.07);
    const tip = cyl(0.05, 0.03, 0.06, mats.brass, R, 0, 0.08, -0.68); tip.rotation.x = Math.PI / 2;
    box(0.012, 0.012, 0.12, dark, R, 0, 0.03, -0.66);
    const mag = r.mag = grp(R, 0, -0.04, -0.25);
    const tank = cyl(0.06, 0.06, 0.3, G.mat('ftank', { color: 0x5a1a10, rough: 0.4, metal: 0.6 }), mag, 0, -0.03, 0); tank.rotation.x = Math.PI / 2;
    for (const z of [-0.1, 0.1]) tor(0.062, 0.01, mats.brass, mag, 0, -0.03, z);
    const grip = box(0.06, 0.16, 0.08, mats.glove, R, 0, -0.06, 0.02); grip.rotation.x = 0.35;
    box(0.07, 0.08, 0.1, body, R, 0, 0.04, 0.12);
    r.pilot = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.texSoft(), color: 0x55aaff, blending: THREE.AdditiveBlending, depthWrite: false }));
    r.pilot.scale.setScalar(0.06); r.pilot.position.set(0, 0.03, -0.73); R.add(r.pilot);
    skull(R, 0, 0.13, -0.18, 0.55, mats.trim);
    r.muzzle = grp(R, 0, 0.08, -0.73);
    r.leftGrip = new THREE.Vector3(0, 0.0, -0.42);
    r.adsY = -0.2; r.adsX = 0;
    return r;
  };
  VM.melta = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    const body = mats.ceramite, dark = mats.blackMetal;
    box(0.13, 0.17, 0.38, body, R, 0, 0.06, -0.1);
    r.heatMat = new THREE.MeshStandardMaterial({ color: 0x301008, emissive: 0xff5a10, emissiveIntensity: 0.3, roughness: 0.5, metalness: 0.6 });
    for (const sd of [-1, 1]) {
      const b = cyl(0.04, 0.045, 0.42, dark, R, sd * 0.04, 0.08, -0.45); b.rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) { const t = tor(0.05, 0.012, r.heatMat, R, sd * 0.04, 0.08, -0.32 - i * 0.06); }
    }
    box(0.18, 0.1, 0.05, dark, R, 0, 0.08, -0.68);
    const grip = box(0.06, 0.16, 0.08, mats.glove, R, 0, -0.06, 0.02); grip.rotation.x = 0.35;
    box(0.07, 0.09, 0.12, body, R, 0, 0.05, 0.13);
    const mag = r.mag = grp(R, 0, -0.03, -0.2);
    box(0.08, 0.12, 0.1, G.mat('mcan', { color: 0x6a5020, metal: 0.8, rough: 0.3 }), mag, 0, -0.06, 0);
    box(0.02, 0.04, 0.02, dark, R, 0, 0.17, -0.5);
    seal(R, 0.068, 0.1, -0.18);
    r.muzzle = grp(R, 0, 0.08, -0.72);
    r.leftGrip = new THREE.Vector3(0, -0.01, -0.42);
    r.adsY = -0.22; r.adsX = 0;
    return r;
  };
  VM.chainsword = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    // hilt is at origin, blade extends along -Z (up/forward when held)
    cyl(0.025, 0.028, 0.16, mats.glove, R, 0, 0, 0.0).rotation.x = Math.PI / 2;
    box(0.2, 0.05, 0.05, mats.trim, R, 0, 0.0, -0.09);
    skull(R, 0, 0.0, 0.1, 0.5, mats.trim);
    const casing = box(0.04, 0.11, 0.7, mats.ceramite, R, 0, 0.02, -0.46);
    box(0.045, 0.03, 0.66, mats.trim, R, 0, -0.03, -0.46);
    box(0.06, 0.12, 0.12, mats.blackMetal, R, 0, 0.0, -0.16);
    seal(R, 0.03, 0.06, -0.2);
    // chain teeth running around the blade edge
    r.teeth = [];
    const tg = geo('tooth', () => { const g = new THREE.ConeGeometry(0.012, 0.03, 4); return g; });
    const tm = G.mat('teeth', { color: 0x8a8a8a, metal: 1, rough: 0.25 });
    for (let i = 0; i < 36; i++) { const t = mesh(tg, tm, false); R.add(t); r.teeth.push(t); }
    r.chainOff = 0;
    r.updateChain = (dt, speed) => {
      r.chainOff = (r.chainOff + dt * speed) % 1;
      const L = 0.7, H = 0.13, per = 2 * L + 2 * H;
      r.teeth.forEach((t, i) => {
        let d = ((i / r.teeth.length + r.chainOff) % 1) * per;
        let y, z, ang;
        if (d < L) { y = 0.085; z = -0.11 - d; ang = 0; }
        else if ((d -= L) < H) { y = 0.085 - d; z = -0.11 - L; ang = -Math.PI / 2; }
        else if ((d -= H) < L) { y = -0.045; z = -0.11 - L + d; ang = Math.PI; }
        else { d -= L; y = -0.045 + d; z = -0.11; ang = Math.PI / 2; }
        t.position.set(0, y + 0.02, z); t.rotation.set(ang, 0, 0);
      });
    };
    r.updateChain(0, 0);
    r.muzzle = grp(R, 0, 0.02, -0.8);
    r.leftGrip = null;
    return r;
  };

  // armoured gauntlet: fingers wrap round a grip
  M.gauntlet = function (side) {
    const g = new THREE.Group();
    box(0.09, 0.085, 0.11, mats.ceramite, g, 0, 0, 0);
    box(0.092, 0.02, 0.112, mats.trim, g, 0, 0.045, 0);
    for (let i = 0; i < 4; i++) { const f = box(0.02, 0.03, 0.055, mats.glove, g, -0.03 + i * 0.02, -0.04, -0.035); f.rotation.x = -0.6; }
    const th = box(0.025, 0.025, 0.06, mats.glove, g, side * 0.05, 0.0, -0.04); th.rotation.y = side * 0.4;
    // forearm: vambrace (stretched between hand and elbow each frame)
    const fa = mesh(unit, mats.ceramite);
    const cuff = cyl(0.065, 0.06, 0.04, mats.trim, g, 0, 0, 0.07); cuff.rotation.x = Math.PI / 2;
    return { hand: g, fore: fa };
  };

  /* ---------- pickups ---------- */
  M.pickup = function (kind) {
    const g = new THREE.Group();
    if (kind === 'health') {
      const v = cyl(0.08, 0.08, 0.25, G.mat('vial', { color: 0x800000, emissive: 0xff1010, ei: 0.6, rough: 0.1, transparent: true, opacity: 0.85 }), g, 0, 0, 0);
      cyl(0.09, 0.09, 0.04, mats.trim, g, 0, 0.14, 0); cyl(0.09, 0.09, 0.04, mats.trim, g, 0, -0.14, 0);
      g.userData.color = 0xff3030;
    } else if (kind === 'ammo') {
      box(0.32, 0.18, 0.2, G.mat('ammobox', { color: 0x3a4a2a, rough: 0.6, metal: 0.3 }), g, 0, 0, 0);
      box(0.34, 0.03, 0.22, mats.trim, g, 0, 0.1, 0);
      for (let i = 0; i < 4; i++) cyl(0.02, 0.02, 0.1, mats.brass, g, -0.1 + i * 0.065, 0.16, 0);
      g.userData.color = 0xffcc40;
    } else {
      sph(0.12, G.mat('furyorb', { color: 0x400000, emissive: 0xff4400, ei: 1.5 }), g, 0, 0, 0);
      g.userData.color = 0xff6600;
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.texSoft(), color: g.userData.color, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
    halo.scale.setScalar(0.9); g.add(halo);
    return g;
  };
})();
