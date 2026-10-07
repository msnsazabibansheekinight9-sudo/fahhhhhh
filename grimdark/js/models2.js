'use strict';
// More rigs: legionaries (loyal and traitor), sisters, troopers of many races,
// battlesuits, drones, constructs, walkers, daemons, swarm beasts and set pieces.
(function () {
  const M = G.models, B = M.build, mats = M.mats;
  const { box, sph, cyl, cone, tor, limb, grp, mesh } = M.h;
  const _t = new THREE.Vector3();
  const eyes = (p, mat, y, z, sep, r) => { sph(r || 0.03, mat, p, -sep, y, z, 6); sph(r || 0.03, mat, p, sep, y, z, 6); };

  M.initMats2 = function () {
    const n = (k, c, o) => G.texNoise(k, c, o);
    const pan = (k, c, o) => G.texPanels(k, c, o || { grid: 1 });
    const armour = (key, c, blood) => { const m = G.mat(key, { color: 0xffffff, map: pan('t' + key, c), rough: 0.35, metal: 0.35 }); m.userData.blood = blood || 0x5a0606; return m; };
    mats.loyal = armour('loyal', 0x3a4a6a); mats.loyalTrim = G.mat('loyalTrim', { color: 0xc49a3a, rough: 0.25, metal: 1 });
    mats.traitor = armour('traitor', 0x5a1414); mats.traitorTrim = G.mat('traitorTrim', { color: 0x8a7a40, rough: 0.35, metal: 1 });
    mats.blackArm = armour('blackArm', 0x1c1c20); mats.sisterRobe = G.mat('sisterRobe', { color: 0x6a0c0c, rough: 0.85, side: THREE.DoubleSide });
    mats.whiteHair = G.mat('whiteHair', { color: 0xe8e4dc, rough: 0.9 });
    mats.skin = G.mat('skin', { color: 0xb08870, rough: 0.7 }); mats.skin.userData.blood = 0x6a0a0a;
    mats.flak = G.mat('flak', { color: 0xffffff, map: n('tflak', 0x4a5236, { v: 0.12, r: 3 }), rough: 0.85 }); mats.flak.userData.blood = 0x6a0a0a;
    mats.fatigue = G.mat('fatigue', { color: 0xffffff, map: n('tfat', 0x5a5444, { v: 0.15, r: 4 }), rough: 0.95 }); mats.fatigue.userData.blood = 0x6a0a0a;
    mats.lensG = G.glow('lensG', 0x50ff60); mats.lensR = G.glow('lensR', 0xff3020); mats.lensB = G.glow('lensB', 0x40c0ff);
    mats.tauArm = armour('tauArm', 0xc8b890, 0x6a1010); mats.tauDark = G.mat('tauDark', { color: 0x2a2a30, rough: 0.5, metal: 0.4 });
    mats.tauSkin = G.mat('tauSkin', { color: 0x5a6a8a, rough: 0.7 }); mats.tauSkin.userData.blood = 0x6a1010;
    mats.eldarArm = armour('eldarArm', 0x2a4a3a, 0x7a0a0a); mats.eldarTrim = G.mat('eldarTrim', { color: 0xd8d0b0, rough: 0.2, metal: 0.3 });
    mats.wraithbone = G.mat('wraithbone', { color: 0xe4dcc8, rough: 0.25, metal: 0.05 }); mats.wraithbone.userData.blood = 0x60c0ff;
    mats.soulstone = G.glow('soulstone', 0x4ad0ff); mats.bansheeArm = armour('banshee', 0xd8d4cc, 0x7a0a0a);
    mats.bansheeRed = G.mat('bansheeRed', { color: 0x9a1010, rough: 0.4, metal: 0.2 });
    mats.molten = G.mat('molten', { color: 0x2a1a14, emissive: 0xff5a10, ei: 2.2, rough: 0.6, map: n('tmolt', 0x3a2a24, { v: 0.2, r: 4 }) }); mats.molten.userData.blood = 0xff6010;
    mats.molten.emissiveMap = G.canvasTex('tmoltE', 256, (x, s) => {
      x.fillStyle = '#000'; x.fillRect(0, 0, s, s);
      x.strokeStyle = '#ffb060'; x.lineWidth = 2;
      for (let i = 0; i < 45; i++) { let px = Math.random() * s, py = Math.random() * s; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 7; k++) { px += G.rand(-16, 16); py += G.rand(-16, 16); x.lineTo(px, py); } x.stroke(); }
    });
    mats.cultSkin = G.mat('cultSkin', { color: 0xffffff, map: n('tcult', 0x8a7a9a, { v: 0.12, r: 5 }), rough: 0.6 }); mats.cultSkin.userData.blood = 0x4a0a4a;
    mats.cultChitin = G.mat('cultChitin', { color: 0xffffff, map: n('tcultc', 0x2a2050, { v: 0.12, bands: 8 }), rough: 0.3, metal: 0.15 }); mats.cultChitin.userData.blood = 0x4a0a4a;
    mats.cultOveralls = G.mat('cultOver', { color: 0xffffff, map: n('tcover', 0x7a6a2a, { v: 0.15, r: 3 }), rough: 0.9 }); mats.cultOveralls.userData.blood = 0x4a0a4a;
    mats.plague = G.mat('plague', { color: 0xffffff, map: n('tplague', 0x7a8a50, { v: 0.2, cracks: 40, r: 6 }), rough: 0.6 }); mats.plague.userData.blood = 0x4a5a10;
    mats.pinkFlesh = G.mat('pinkFlesh', { color: 0xd040a0, emissive: 0x401030, rough: 0.5 }); mats.pinkFlesh.userData.blood = 0x60a0ff;
    mats.lilac = G.mat('lilac', { color: 0xc8a0d8, rough: 0.4 }); mats.lilac.userData.blood = 0x8a0a6a;
    mats.warpfire = G.glow('warpfire', 0x60a0ff);
    mats.scrap = G.mat('scrap', { color: 0xffffff, map: G.texPanels('tscrap', 0x5a5040, { rust: 90, grid: 3, stripes: true }), rough: 0.6, metal: 0.6 }); mats.scrap.userData.blood = 0x2a2a2a;
    mats.carapace = G.mat('carapace', { color: 0xffffff, map: n('tcarap', 0x4a1650, { v: 0.12, bands: 14, r: 4 }), rough: 0.25, metal: 0.2 }); mats.carapace.userData.blood = 0x6e8a10;
    mats.hull = G.mat('hull', { color: 0xffffff, map: G.texPanels('thull', 0x4a5060, { grid: 4 }), rough: 0.4, metal: 0.6 });
    mats.engine = G.glow('engine', 0x80c0ff);
    mats.cloak = new THREE.MeshStandardMaterial({ color: 0x9ab0c0, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.9, depthWrite: false });
  };

  /* ---------- power-armoured legionary (loyal brothers, traitors, possessed, lords) ---------- */
  B.legionary = function (o) {
    o = o || {};
    const A = o.armor || mats.loyal, T = o.trim || mats.loyalTrim, L = o.lens || mats.lensG;
    const s = { thigh: 0.5, shin: 0.52, hipW: 0.18, torso: 0.64, shW: 0.36, upper: 0.4, fore: 0.38, legR: 0.12, armR: 0.1, hunch: 0.08, chestD: 0.5,
      legMat: A, armMat: A, footMat: A, twoHand: !o.melee, foot: 0.36 };
    if (o.bulk) { s.shW = 0.5; s.legR = 0.16; s.armR = 0.14; s.torso = 0.7; s.hipW = 0.24; }
    const r = M.biped(s), j = r.j;
    const k = o.bulk ? 1.3 : 1;
    box(0.62 * k, 0.5, 0.42 * k, A, j.torso, 0, 0.42, 0);
    box(0.5 * k, 0.24, 0.36, A, j.torso, 0, 0.12, 0);
    // chest eagle
    for (const sd of [-1, 1]) { const w = box(0.26, 0.06, 0.04, T, j.torso, sd * 0.13, 0.55, 0.22 * k); w.rotation.z = sd * 0.35; }
    sph(0.05, T, j.torso, 0, 0.5, 0.22 * k, 8);
    box(0.5 * k, 0.07, 0.4, T, j.pelvis, 0, 0.0, 0);
    for (const sd of [-1, 1]) {
      const tass = box(0.2, 0.26, 0.06, A, j.pelvis, sd * 0.16, -0.14, 0.2); tass.rotation.x = -0.15;
      // pauldrons ride on the shoulders
      const pd = sph(0.21 * k, A, j['sh' + (sd < 0 ? 'L' : 'R')], sd * 0.04, 0.02, 0, 12); pd.scale.set(1.1, 0.85, 1.15);
      tor(0.21 * k, 0.025, T, j['sh' + (sd < 0 ? 'L' : 'R')], sd * 0.04, -0.05, 0).rotation.x = Math.PI / 2;
      sph(0.1, A, j['knee' + (sd < 0 ? 'L' : 'R')], 0, 0, 0.06, 8);
      sph(0.1 * k, A, j['hand' + (sd < 0 ? 'L' : 'R')], 0, -0.04, 0, 8);
    }
    // backpack
    box(0.5 * k, 0.48, 0.24, A, j.torso, 0, 0.5, -0.32);
    for (const sd of [-1, 1]) { cyl(0.06, 0.07, 0.28, mats.blackMetal, j.torso, sd * 0.15, 0.8, -0.38); }
    r.exhaust = [grp(j.torso, -0.15, 0.95, -0.38), grp(j.torso, 0.15, 0.95, -0.38)];
    // helmet
    if (o.head === 'hair') {
      sph(0.13, mats.skin, j.head, 0, 0.1, 0.02, 10);
      const hair = sph(0.15, mats.whiteHair, j.head, 0, 0.14, -0.03, 10); hair.scale.set(1, 0.9, 1.05);
      box(0.32, 0.12, 0.3, A, j.neck, 0, -0.02, 0);
    } else {
      const hm = sph(0.15, A, j.head, 0, 0.1, 0.02, 12); hm.scale.set(1, 1.05, 1.05);
      box(0.1, 0.1, 0.1, A, j.head, 0, 0.03, 0.15).rotation.x = o.beaky ? 0.6 : 0;
      for (let i = 0; i < 3; i++) box(0.09, 0.012, 0.02, mats.blackMetal, j.head, 0, 0.0 + i * 0.025, 0.2);
      eyes(j.head, L, 0.12, 0.14, 0.055, 0.03);
      box(0.32, 0.12, 0.3, A, j.neck, 0, -0.02, 0);
    }
    if (o.horns) for (const sd of [-1, 1]) { let p = grp(j.head, sd * 0.12, 0.18, 0); for (let i = 0; i < 3; i++) { const g = grp(p, 0, i ? 0.12 : 0, 0); g.rotation.set(-0.3, 0, -sd * 0.5); cone(0.04 - i * 0.01, 0.15, mats.horn, g, 0, 0.06, 0); p = g; } }
    if (o.spikes) for (let i = 0; i < 4; i++) cone(0.04, 0.3, T, j.torso, -0.2 + i * 0.13, 0.8, -0.32);
    if (o.cape) { const cp = mesh(new THREE.PlaneGeometry(0.75 * k, 1.3), o.cape); cp.position.set(0, -0.05, -0.46); j.torso.add(cp); r.cape = cp; }
    if (o.robe) { const sk = cyl(0.26, 0.42, 0.7, o.robe, j.pelvis, 0, -0.32, 0, 12); }
    if (o.tentacle) { let p = j.elL; for (let i = 0; i < 4; i++) { const g = grp(p, 0, i ? -0.18 : -0.2, 0); cone(0.09 - i * 0.018, 0.22, mats.dskin, g, 0, -0.1, 0).rotation.x = Math.PI; p = g; } r.tentacle = true; }
    // weapon
    if (o.weapon === 'bolter') {
      const g = grp(j.handR, 0, 0, 0.06);
      box(0.1, 0.55, 0.14, mats.blackMetal, g, 0, -0.18, 0.02);
      box(0.08, 0.2, 0.08, mats.blackMetal, g, 0, -0.1, 0.12);
      cyl(0.03, 0.035, 0.2, mats.blackMetal, g, 0, -0.52, 0.04);
      box(0.105, 0.3, 0.02, T, g, 0, -0.18, -0.06);
      r.muzzle = grp(j.handR, 0, -0.66, 0.1);
    } else if (o.weapon === 'flamer') {
      const g = grp(j.handR, 0, 0, 0.06);
      box(0.09, 0.4, 0.12, mats.blackMetal, g, 0, -0.15, 0);
      cyl(0.03, 0.05, 0.3, mats.brass, g, 0, -0.45, 0.02);
      cyl(0.05, 0.05, 0.2, G.mat('ftank', { color: 0x5a1a10, rough: 0.4, metal: 0.6 }), g, 0, -0.15, 0.1);
      r.muzzle = grp(j.handR, 0, -0.62, 0.08);
    } else if (o.weapon === 'axe' || o.weapon === 'sword') {
      cyl(0.025, 0.025, 0.4, mats.blackMetal, j.handR, 0, -0.1, 0);
      if (o.weapon === 'axe') { box(0.03, 0.3, 0.28, G.mat('edge', { color: 0xb0b0b0, metal: 1, rough: 0.2 }), j.handR, 0, -0.38, 0.12); }
      else { box(0.03, 0.9, 0.1, o.daemonblade ? mats.hellblade : G.mat('edge', { color: 0xb0b0b0, metal: 1, rough: 0.2 }), j.handR, 0, -0.6, 0.02); box(0.25, 0.04, 0.06, T, j.handR, 0, -0.12, 0); }
    }
    r.hit = { body: 0.48 * k, head: 0.17 };
    const prev = r.extra;
    r.extra = (rg, dt) => {
      if (r.cape) r.cape.rotation.x = 0.12 + rg.anim.move * 0.3 + Math.sin(rg.anim.idle * 2) * 0.04;
      if (Math.random() < 0.05) for (const e of r.exhaust) { e.getWorldPosition(_t); G.fx.smoke.emit(_t.x, _t.y, _t.z, 0, 1, 0, 0.8, 0.05, 0.3, C1, C2, 0.3, 0, -0.3, 1); }
    };
    return r;
  };
  const C1 = new THREE.Color(0x333333), C2 = new THREE.Color(0x666666);

  /* ---------- light infantry of many races ---------- */
  B.trooper = function (o) {
    o = o || {};
    const s = { thigh: 0.43, shin: 0.45, hipW: 0.1, torso: 0.55, shW: 0.21, upper: 0.31, fore: 0.3, legR: 0.065, armR: 0.05, hunch: 0.06, chestD: 0.25,
      legMat: o.legs || mats.fatigue, armMat: o.arms || mats.fatigue, foreMat: o.fore || o.arms || mats.fatigue, footMat: mats.blackMetal, twoHand: true };
    if (o.tall) { s.thigh = 0.52; s.shin = 0.54; s.torso = 0.6; s.upper = 0.36; s.fore = 0.34; }
    const r = M.biped(s), j = r.j;
    const chest = box(0.36, 0.42, 0.24, o.chest || mats.flak, j.torso, 0, 0.3, 0);
    box(0.3, 0.12, 0.22, o.legs || mats.fatigue, j.torso, 0, 0.06, 0);
    for (const sd of [-1, 1]) { const sp = box(0.12, 0.08, 0.2, o.chest || mats.flak, j['sh' + (sd < 0 ? 'L' : 'R')], sd * 0.02, 0.02, 0); }
    // heads
    const hs = o.head || 'guard';
    if (hs === 'guard') {
      sph(0.11, mats.skin, j.head, 0, 0.08, 0.02, 10);
      const h = sph(0.14, mats.flak, j.head, 0, 0.13, 0, 12); h.scale.set(1, 0.6, 1.05);
      box(0.2, 0.02, 0.06, mats.blackMetal, j.head, 0, 0.12, 0.12);
      box(0.24, 0.3, 0.14, mats.fatigue, j.torso, 0, 0.32, -0.18);
    } else if (hs === 'tau') {
      const h = sph(0.14, o.chest, j.head, 0, 0.1, 0.02, 12); h.scale.set(0.95, 1, 1.2);
      box(0.2, 0.05, 0.05, mats.tauDark, j.head, 0, 0.1, 0.16);
      sph(0.03, mats.lensR, j.head, 0, 0.1, 0.19, 6);
      cyl(0.006, 0.006, 0.2, mats.tauDark, j.head, 0.1, 0.22, -0.04, 4);
      box(0.4, 0.06, 0.3, o.chest, j.torso, 0, 0.55, 0);
    } else if (hs === 'eldar') {
      const h = sph(0.13, o.chest, j.head, 0, 0.1, 0.02, 12); h.scale.set(0.9, 1.15, 1.15);
      const crest = box(0.03, 0.12, 0.3, mats.eldarTrim, j.head, 0, 0.24, -0.02);
      eyes(j.head, mats.lensG, 0.1, 0.13, 0.05, 0.025);
      sph(0.04, mats.soulstone, j.torso, 0, 0.42, 0.13, 8);
    } else if (hs === 'hybrid') {
      const h = sph(0.13, mats.cultSkin, j.head, 0, 0.11, 0.02, 12); h.scale.set(1, 1.2, 1.1);
      for (let i = 0; i < 5; i++) sph(0.04, mats.cultSkin, j.head, G.rand(-0.06, 0.06), 0.2 + G.rand(0, 0.04), G.rand(-0.06, 0.04), 6);
      eyes(j.head, G.glow('cy', 0xffe040), 0.1, 0.13, 0.045, 0.02);
      // third arm
      const ex = grp(j.torso, 0.18, 0.3, 0.1); limb(0.04, 0.03, 0.35, mats.cultChitin, ex); ex.rotation.set(-0.8, 0, 0.4);
      cone(0.03, 0.15, mats.cultChitin, ex, 0, -0.4, 0).rotation.x = Math.PI;
    } else if (hs === 'ranger') {
      const h = sph(0.14, mats.eldarArm, j.head, 0, 0.11, 0, 10); h.scale.set(1, 1.1, 1.1);
      eyes(j.head, mats.lensG, 0.1, 0.12, 0.045, 0.022);
      const cloak = cyl(0.18, 0.36, 1.0, G.mat('rcloak', { color: 0x3a3a2a, rough: 0.95, side: THREE.DoubleSide }), j.torso, 0, 0.0, -0.04, 10);
    }
    // gun along the forearm
    const gk = o.gun || 'lasgun';
    const g = grp(j.handR, 0, 0, 0.04);
    if (gk === 'lasgun') {
      box(0.05, 0.62, 0.08, mats.wood, g, 0, -0.2, 0); box(0.055, 0.2, 0.06, mats.gunmetal, g, 0, -0.32, 0.06);
      box(0.04, 0.12, 0.03, mats.gunmetal, g, 0, -0.1, 0.07);
      r.muzzle = grp(j.handR, 0, -0.72, 0.05);
    } else if (gk === 'pulse') {
      box(0.06, 0.8, 0.09, mats.tauDark, g, 0, -0.3, 0); box(0.08, 0.3, 0.1, mats.tauArm, g, 0, -0.2, 0.02);
      cyl(0.02, 0.02, 0.2, mats.tauDark, g, 0, -0.75, 0.02, 6);
      r.muzzle = grp(j.handR, 0, -0.85, 0.05);
    } else if (gk === 'shuriken') {
      box(0.05, 0.5, 0.08, mats.eldarArm, g, 0, -0.2, 0); cyl(0.07, 0.07, 0.03, mats.eldarTrim, g, 0, -0.1, 0.06, 12).rotation.x = Math.PI / 2;
      r.muzzle = grp(j.handR, 0, -0.62, 0.05);
    } else if (gk === 'longrifle') {
      box(0.04, 1.1, 0.07, mats.eldarArm, g, 0, -0.4, 0); cyl(0.02, 0.02, 0.2, mats.blackMetal, g, 0, -0.2, 0.08, 6);
      r.muzzle = grp(j.handR, 0, -1.0, 0.04);
    } else if (gk === 'autogun') {
      box(0.05, 0.55, 0.08, mats.gunmetal, g, 0, -0.2, 0); box(0.04, 0.14, 0.05, mats.gunmetal, g, 0, -0.18, 0.08);
      r.muzzle = grp(j.handR, 0, -0.66, 0.05);
    }
    if (o.backpack) box(0.3, 0.35, 0.16, o.backpack, j.torso, 0, 0.35, -0.2);
    r.hit = { body: 0.3, head: 0.14 };
    return r;
  };

  /* ---------- battlesuit ---------- */
  B.battlesuit = function (big) {
    const k = big ? 1.4 : 1;
    const s = { thigh: 0.5, shin: 0.6, hipW: 0.24, torso: 0.62, shW: 0.48, upper: 0.42, fore: 0.44, legR: 0.13, armR: 0.11, hunch: 0.05, digi: true, chestD: 0.6,
      legMat: mats.tauArm, armMat: mats.tauDark, foreMat: mats.tauArm, footMat: mats.tauDark, twoHand: false, armsOut: true };
    const r = M.biped(s), j = r.j;
    const ch = box(0.8, 0.55, 0.6, mats.tauArm, j.torso, 0, 0.36, 0.05); ch.rotation.x = -0.1;
    box(0.6, 0.2, 0.5, mats.tauDark, j.torso, 0, 0.06, 0);
    box(0.24, 0.16, 0.2, mats.tauArm, j.head, 0, 0.06, 0.08);
    sph(0.05, mats.lensR, j.head, 0, 0.08, 0.19, 8);
    box(0.06, 0.06, 0.06, mats.tauArm, j.head, 0.13, 0.05, 0.08);
    // jetpack
    box(0.6, 0.5, 0.26, mats.tauDark, j.torso, 0, 0.4, -0.38);
    r.jets = [];
    for (const sd of [-1, 1]) {
      const n = cyl(0.11, 0.14, 0.24, mats.tauArm, j.torso, sd * 0.24, 0.12, -0.42);
      const fl = sph(0.09, mats.engine, j.torso, sd * 0.24, -0.02, -0.42, 8); fl.castShadow = false;
      r.jets.push(fl);
      // shoulder pods / pauldrons
      const p = box(0.26, 0.16, 0.36, mats.tauArm, j['sh' + (sd < 0 ? 'L' : 'R')], sd * 0.05, 0.05, 0); p.rotation.z = -sd * 0.15;
    }
    // missile pod on the right shoulder, gun on each forearm
    const pod = box(0.24, 0.24, 0.34, mats.tauArm, j.torso, 0.42, 0.78, 0); for (let i = 0; i < 4; i++) cyl(0.03, 0.03, 0.02, mats.blackMetal, j.torso, 0.36 + (i % 2) * 0.1, 0.72 + (i >> 1) * 0.1, 0.18, 6).rotation.x = Math.PI / 2;
    r.pod = grp(j.torso, 0.42, 0.9, 0.2);
    for (const k2 of ['L', 'R']) { box(0.12, 0.45, 0.14, mats.tauDark, j['hand' + k2], 0, -0.2, 0.05); cyl(0.025, 0.025, 0.22, mats.tauDark, j['hand' + k2], 0, -0.5, 0.05, 6); }
    r.muzzle = grp(j.handR, 0, -0.62, 0.05);
    r.extra = (rg) => { r.jets.forEach(f => f.scale.setScalar(rg.hovering ? 1.6 + Math.random() * 0.4 : 0.6)); };
    r.hit = { body: 0.55, head: 0.18 };
    return r;
  };

  /* ---------- custom (non-biped) rigs share the biped interface ---------- */
  function customRig(build, torsoH, hit, animate) {
    const rig = { root: new THREE.Group(), j: {}, s: { torso: torsoH, thigh: 0.2, shin: 0.2 }, legH: 0, custom: true };
    rig.anim = { phase: 0, move: 0, aim: 0, atk: -1, atkType: 0, flinch: 0, flinchV: 0, dead: -1, deathDir: 1, lean: 0, idle: Math.random() * 10 };
    rig.j.body = grp(rig.root, 0, 0, 0);
    rig.j.torso = grp(rig.j.body, 0, 0, 0);
    rig.j.head = grp(rig.j.torso, 0, torsoH, 0.1);
    build(rig);
    rig.hit = hit;
    rig.animate = animate;
    return rig;
  }
  // flying gun drone
  B.drone = function () {
    return customRig(r => {
      const b = r.j.torso;
      const d = cyl(0.35, 0.35, 0.08, mats.tauArm, b, 0, 0.1, 0, 16);
      sph(0.15, mats.tauDark, r.j.head, 0, -0.04, -0.1, 10).scale.y = 0.6;
      tor(0.36, 0.03, mats.tauDark, b, 0, 0.1, 0).rotation.x = Math.PI / 2;
      const ring = tor(0.3, 0.02, mats.lensB, b, 0, 0.04, 0); ring.rotation.x = Math.PI / 2; ring.castShadow = false;
      cyl(0.005, 0.005, 0.3, mats.tauDark, b, 0.2, 0.3, 0, 4);
      const gun = cyl(0.025, 0.025, 0.35, mats.tauDark, b, 0, -0.02, 0.12, 6); gun.rotation.x = Math.PI / 2;
      sph(0.04, mats.lensR, b, 0, 0.1, 0.33, 6);
      r.muzzle = grp(b, 0, -0.02, 0.32);
    }, 0.12, { body: 0.4, head: 0.18 }, (rig, dt, u) => {
      const a = rig.anim; a.idle += dt;
      if (a.dead >= 0) { rig.j.body.rotation.z += dt * 6; rig.j.body.rotation.x += dt * 3; return; }
      rig.j.body.rotation.x = G.clamp(a.move * 0.25, -0.4, 0.4) + a.flinch;
      rig.j.body.rotation.z = Math.sin(a.idle * 2) * 0.08;
      a.flinchV += (-a.flinch * 140 - a.flinchV * 14) * dt; a.flinch += a.flinchV * dt;
    });
  };
  // skittering scarab
  B.scarab = function () {
    return customRig(r => {
      const b = r.j.torso;
      const sh = sph(0.22, mats.necro, b, 0, 0.15, 0, 10); sh.scale.set(1, 0.6, 1.3);
      sph(0.06, mats.ngreen, r.j.head, 0, -0.05, 0.2, 8);
      r.legs = [];
      for (let i = 0; i < 6; i++) { const sd = i % 2 ? 1 : -1; const g = grp(b, sd * 0.15, 0.1, -0.15 + (i >> 1) * 0.15); limb(0.015, 0.01, 0.22, mats.necroDark, g); g.rotation.z = sd * 1.0; r.legs.push(g); }
    }, 0.08, { body: 0.28, head: 0.12 }, (rig, dt) => {
      const a = rig.anim; a.idle += dt; a.phase += dt * 20 * Math.min(1, a.move);
      rig.legs = rig.legs || [];
      if (a.dead >= 0) { rig.j.body.rotation.z = Math.PI; return; }
      rig.j.body.position.y = Math.abs(Math.sin(a.phase)) * 0.03;
    });
  };
  // eldar-style construct: tall, thin, bone-white
  B.wraithguard = function () {
    const s = { thigh: 0.62, shin: 0.66, hipW: 0.15, torso: 0.72, shW: 0.3, upper: 0.48, fore: 0.48, legR: 0.08, armR: 0.07, hunch: 0.02, chestD: 0.4,
      legMat: mats.wraithbone, armMat: mats.wraithbone, twoHand: false };
    const r = M.biped(s), j = r.j;
    const ch = sph(0.3, mats.wraithbone, j.torso, 0, 0.5, 0.02, 14); ch.scale.set(1.15, 1.1, 0.8);
    box(0.3, 0.25, 0.2, mats.wraithbone, j.torso, 0, 0.15, 0);
    for (const sd of [-1, 1]) { const p = sph(0.16, mats.wraithbone, j.torso, sd * 0.32, 0.72, 0, 10); p.scale.set(1, 0.6, 1.2); }
    const hd = cone(0.12, 0.55, mats.wraithbone, j.head, 0, 0.22, 0, 10); hd.rotation.x = 0.15;
    sph(0.05, mats.soulstone, j.head, 0, 0.08, 0.1, 8);
    sph(0.07, mats.soulstone, j.torso, 0, 0.55, 0.24, 10);
    cyl(0.08, 0.1, 0.7, mats.wraithbone, j.handR, 0, -0.3, 0.05);
    tor(0.1, 0.02, mats.soulstone, j.handR, 0, -0.62, 0.05).rotation.x = Math.PI / 2;
    r.muzzle = grp(j.handR, 0, -0.7, 0.05);
    r.hit = { body: 0.45, head: 0.16 };
    return r;
  };
  B.banshee = function () {
    const s = { thigh: 0.48, shin: 0.5, hipW: 0.1, torso: 0.52, shW: 0.2, upper: 0.32, fore: 0.32, legR: 0.06, armR: 0.045, hunch: 0.15, chestD: 0.25,
      legMat: mats.bansheeArm, armMat: mats.bansheeArm, twoHand: false };
    const r = M.biped(s), j = r.j;
    const ch = cyl(0.15, 0.13, 0.5, mats.bansheeArm, j.torso, 0, 0.26, 0, 10); ch.scale.z = 0.8;
    box(0.2, 0.25, 0.04, mats.bansheeRed, j.pelvis, 0, -0.15, 0.13);
    const h = sph(0.12, mats.bansheeArm, j.head, 0, 0.1, 0.02, 10); h.scale.set(0.9, 1.2, 1.1);
    const hair = cone(0.08, 0.7, mats.bansheeRed, j.head, 0, 0.0, -0.25, 6); hair.rotation.x = -2.6;
    r.hair = hair;
    eyes(j.head, G.glow('bey', 0xff3030), 0.1, 0.12, 0.04, 0.02);
    box(0.02, 0.8, 0.06, G.mat('pblade', { color: 0x80c0ff, emissive: 0x2050ff, ei: 0.6, metal: 0.8, rough: 0.2 }), j.handR, 0, -0.45, 0);
    r.hit = { body: 0.28, head: 0.13 };
    return r;
  };
  B.avatar = function () {
    const s = { thigh: 0.6, shin: 0.65, hipW: 0.2, torso: 0.8, shW: 0.42, upper: 0.52, fore: 0.52, legR: 0.13, armR: 0.11, hunch: 0.05, chestD: 0.5,
      legMat: mats.molten, armMat: mats.molten, twoHand: false };
    const r = M.biped(s), j = r.j;
    const ch = sph(0.42, mats.molten, j.torso, 0, 0.48, 0.03, 14); ch.scale.set(1.15, 1.1, 0.8);
    box(0.85, 0.15, 0.5, mats.brass, j.torso, 0, 0.82, 0);
    const hd = sph(0.18, mats.molten, j.head, 0, 0.14, 0.04, 12); hd.scale.y = 1.2;
    for (let i = 0; i < 7; i++) { const c = cone(0.03, 0.3, mats.brass, j.head, Math.cos(i) * 0.12, 0.3, Math.sin(i) * 0.1 - 0.02); c.rotation.set(Math.sin(i) * 0.4, 0, -Math.cos(i) * 0.4); }
    eyes(j.head, G.glow('aey', 0xfff0a0), 0.16, 0.18, 0.06, 0.03);
    cyl(0.03, 0.03, 2.4, mats.brass, j.handR, 0, -0.4, 0);
    const tip = cone(0.08, 0.5, G.glow('spear', 0xffc040), j.handR, 0, 0.98, 0, 6);
    r.hit = { body: 0.55, head: 0.22 };
    r.extra = (rg) => {
      if (Math.random() < 0.6) { rg.j.torso.getWorldPosition(_t); _t.y += 0.5; G.fx.add.emit(_t.x + G.rand(-0.6, 0.6), _t.y + G.rand(-0.5, 0.8), _t.z + G.rand(-0.6, 0.6), 0, G.rand(1, 3), 0, 0.6, 0.5, 0.1, FA, FB, 0.9, 0, 0, 0); }
    };
    return r;
  };
  const FA = new THREE.Color(0xffd070), FB = new THREE.Color(0xff3000);

  B.purestrain = function (big) {
    const s = { thigh: 0.42, shin: 0.46, hipW: 0.14, torso: 0.62, shW: 0.25, upper: 0.38, fore: 0.42, legR: 0.07, armR: 0.06, hunch: 0.45, chestD: 0.4,
      legMat: mats.cultChitin, armMat: mats.cultSkin, foreMat: mats.cultChitin, neckZ: 0.06, twoHand: false, dual: true };
    const r = M.biped(s), j = r.j;
    const b = sph(0.26, mats.cultSkin, j.torso, 0, 0.3, 0); b.scale.set(1, 1.25, 0.85);
    for (let i = 0; i < 4; i++) { const p = sph(0.22 - i * 0.02, mats.cultChitin, j.torso, 0, 0.18 + i * 0.13, -0.12); p.scale.set(1.2, 0.5, 0.75); }
    const hd = sph(0.17, mats.cultChitin, j.head, 0, 0.14, 0.02, 12); hd.scale.set(0.9, 1.35, 1.05);
    box(0.1, 0.06, 0.12, mats.cultSkin, j.head, 0, -0.01, 0.12);
    eyes(j.head, G.glow('pey', 0xffe040), 0.08, 0.14, 0.06, 0.022);
    for (const k of ['L', 'R']) for (let i = 0; i < 3; i++) { const c = cone(0.025, 0.25, mats.tusk, j['hand' + k], -0.04 + i * 0.04, -0.12, 0.02); c.rotation.x = Math.PI; }
    r.upper = [];
    for (const sd of [-1, 1]) { const g = grp(j.torso, sd * 0.24, 0.55, 0.05); limb(0.05, 0.04, 0.35, mats.cultSkin, g); const e = grp(g, 0, -0.35, 0); limb(0.04, 0.03, 0.35, mats.cultChitin, e); for (let i = 0; i < 2; i++) cone(0.02, 0.2, mats.tusk, e, -0.02 + i * 0.04, -0.45, 0).rotation.x = Math.PI; g.userData.sd = sd; r.upper.push({ g, e }); }
    if (big) for (let i = 0; i < 8; i++) { const c = cone(0.04, 0.35, mats.cultChitin, j.head, Math.cos(i * 0.8) * 0.1, 0.3, Math.sin(i * 0.8) * 0.1 - 0.05); c.rotation.set(Math.sin(i * 0.8) * 0.5, 0, -Math.cos(i * 0.8) * 0.5); }
    r.extra = (rg) => { const a = rg.anim; r.upper.forEach(({ g, e }, i) => { const at = a.atk >= 0 ? G.kf(a.atk, [[0, 0], [0.4, 1], [0.6, -0.4], [1, 0]]) : 0; g.rotation.set(-0.7 - at * 1.4 + Math.sin(a.idle * 3 + i) * 0.1, 0, g.userData.sd * 0.4); e.rotation.x = -1.3 + at; }); };
    r.hit = { body: 0.36, head: 0.17 };
    return r;
  };
  B.aberrant = function () {
    const r = B.brute(false);
    r.root.traverse(o => { if (o.isMesh) { if (o.material === mats.oskin) o.material = mats.cultSkin; if (o.material === mats.ocloth) o.material = mats.cultOveralls; } });
    sph(0.12, mats.cultSkin, r.j.torso, 0.25, 0.75, -0.15, 8); sph(0.1, mats.cultSkin, r.j.torso, -0.2, 0.8, -0.2, 8);
    box(0.25, 0.25, 0.4, mats.gunmetal, r.j.handR, 0, -0.75, 0.05); cyl(0.03, 0.03, 0.7, mats.wood, r.j.handR, 0, -0.35, 0);
    return r;
  };
  B.plaguebearer = function () {
    const s = { thigh: 0.4, shin: 0.42, hipW: 0.15, torso: 0.55, shW: 0.26, upper: 0.34, fore: 0.34, legR: 0.07, armR: 0.06, hunch: 0.2, chestD: 0.5,
      legMat: mats.plague, armMat: mats.plague, twoHand: false };
    const r = M.biped(s), j = r.j;
    const belly = sph(0.34, mats.plague, j.torso, 0, 0.24, 0.08, 14); belly.scale.set(1, 1, 1.1);
    for (let i = 0; i < 4; i++) sph(0.05, G.mat('pus', { color: 0x8a8a20, emissive: 0x303000, rough: 0.3 }), j.torso, G.rand(-0.2, 0.2), G.rand(0.1, 0.4), 0.38, 6);
    const hd = sph(0.15, mats.plague, j.head, 0, 0.08, 0.06, 10);
    sph(0.06, G.glow('ceye', 0xfff060), j.head, 0, 0.1, 0.19, 8);
    cone(0.04, 0.3, mats.horn, j.head, 0, 0.3, 0.04, 6);
    box(0.03, 0.75, 0.08, G.mat('rust2', { color: 0x5a4a2a, rough: 0.8, metal: 0.4 }), j.handR, 0, -0.42, 0.02);
    r.extra = (rg) => { if (Math.random() < 0.2) { rg.j.head.getWorldPosition(_t); G.fx.smoke.emit(_t.x + G.rand(-0.5, 0.5), _t.y + G.rand(-0.3, 0.4), _t.z + G.rand(-0.5, 0.5), G.rand(-1, 1), G.rand(-0.5, 0.5), G.rand(-1, 1), 0.8, 0.03, 0.03, FLY, FLY, 1, 1, 0, 0); } };
    r.hit = { body: 0.4, head: 0.15 };
    return r;
  };
  const FLY = new THREE.Color(0x111111);
  B.horror = function () {
    const s = { thigh: 0.25, shin: 0.25, hipW: 0.14, torso: 0.4, shW: 0.3, upper: 0.42, fore: 0.42, legR: 0.07, armR: 0.05, hunch: 0.0, chestD: 0.4,
      legMat: mats.pinkFlesh, armMat: mats.pinkFlesh, twoHand: false, armsOut: true };
    const r = M.biped(s), j = r.j;
    const b = sph(0.38, mats.pinkFlesh, j.torso, 0, 0.3, 0, 14); b.scale.set(1, 1.1, 0.9);
    const mouth = box(0.4, 0.08, 0.1, G.mat('maw', { color: 0x200010, rough: 0.9 }), j.torso, 0, 0.28, 0.32);
    for (let i = 0; i < 6; i++) cone(0.025, 0.07, mats.tusk, j.torso, -0.16 + i * 0.065, 0.32, 0.36).rotation.x = Math.PI;
    eyes(j.torso, G.glow('hey', 0xffff60), 0.48, 0.3, 0.12, 0.05);
    for (const k of ['L', 'R']) { const f = sph(0.08, mats.warpfire, j['hand' + k], 0, -0.05, 0, 8); f.castShadow = false; }
    r.muzzle = grp(j.handR, 0, -0.1, 0.05);
    r.hit = { body: 0.4, head: 0.1 };
    return r;
  };
  B.daemonette = function () {
    const s = { thigh: 0.5, shin: 0.52, hipW: 0.11, torso: 0.5, shW: 0.19, upper: 0.32, fore: 0.32, legR: 0.055, armR: 0.04, hunch: 0.15, digi: true, chestD: 0.25,
      legMat: mats.lilac, armMat: mats.lilac, footMat: mats.horn, twoHand: false, dual: true };
    const r = M.biped(s), j = r.j;
    const ch = sph(0.17, mats.lilac, j.torso, 0, 0.3, 0.02, 12); ch.scale.set(1, 1.4, 0.75);
    const hd = sph(0.1, mats.lilac, j.head, 0, 0.1, 0.03, 10); hd.scale.z = 1.2;
    for (let i = 0; i < 6; i++) { const h = cone(0.04, 0.45, G.mat('dhair', { color: 0x2a0a3a, rough: 0.6 }), j.head, G.rand(-0.06, 0.06), 0.05, -0.12); h.rotation.x = -2.5 + G.rand(-0.2, 0.2); }
    for (const sd of [-1, 1]) cone(0.02, 0.18, mats.horn, j.head, sd * 0.06, 0.2, 0, 6).rotation.z = -sd * 0.4;
    eyes(j.head, G.glow('dtey', 0xa0ffff), 0.1, 0.12, 0.035, 0.018);
    for (const k of ['L', 'R']) for (const sd of [-1, 1]) { const c = cone(0.04, 0.32, mats.lilac, j['hand' + k], sd * 0.04, -0.16, 0); c.rotation.set(Math.PI, 0, sd * 0.25); }
    r.hit = { body: 0.28, head: 0.12 };
    return r;
  };
  B.gretchin = function () {
    const r = B.brute(true);
    sph(0.07, mats.oskin, r.j.head, 0, 0.08, 0.2, 6); // big nose
    for (const sd of [-1, 1]) { const ear = cone(0.08, 0.35, mats.oskin, r.j.head, sd * 0.2, 0.15, 0); ear.rotation.z = -sd * 1.3; }
    r.hit = { body: 0.5, head: 0.24 };
    return r;
  };
  B.nob = function () {
    const r = B.brute(false);
    box(0.7, 0.4, 0.5, mats.rust, r.j.torso, 0, 0.45, 0);
    for (const sd of [-1, 1]) box(0.36, 0.14, 0.4, mats.rust, r.j.torso, sd * 0.42, 0.66, 0).rotation.z = -sd * 0.3;
    box(0.3, 0.3, 0.3, mats.ored, r.j.handL, 0, -0.1, 0);
    for (let i = 0; i < 3; i++) cone(0.05, 0.5, mats.gunmetal, r.j.handL, -0.1 + i * 0.1, -0.42, 0).rotation.x = Math.PI;
    r.s.dual = true;
    return r;
  };
  B.carnifex = function () {
    const s = { thigh: 0.6, shin: 0.6, hipW: 0.36, torso: 0.8, shW: 0.55, upper: 0.6, fore: 0.7, legR: 0.18, armR: 0.15, hunch: 0.85, chestD: 0.8,
      legMat: mats.carapace, shinMat: mats.sflesh, armMat: mats.sflesh, foreMat: mats.carapace, neckZ: 0.15, twoHand: false, dual: true, armsOut: true };
    const r = M.biped(s), j = r.j;
    const body = sph(0.6, mats.sflesh, j.torso, 0, 0.45, 0, 14); body.scale.set(1.1, 1.1, 0.9);
    for (let i = 0; i < 5; i++) { const p = sph(0.55 - i * 0.05, mats.carapace, j.torso, 0, 0.15 + i * 0.2, -0.3); p.scale.set(1.25, 0.5, 0.75); }
    for (let i = 0; i < 6; i++) { const c = cone(0.07, 0.45, mats.tusk, j.torso, (i % 2 ? 1 : -1) * 0.25, 0.3 + (i >> 1) * 0.28, -0.6); c.rotation.x = -2.2; }
    const hd = sph(0.25, mats.carapace, j.head, 0, 0.05, 0.15, 12); hd.scale.set(1, 0.8, 1.3);
    eyes(j.head, mats.sglow, 0.06, 0.45, 0.12, 0.04);
    for (const sd of [-1, 1]) cone(0.05, 0.3, mats.tusk, j.head, sd * 0.14, -0.05, 0.42).rotation.x = 1.8;
    for (const k of ['L', 'R']) { const t = cone(0.12, 1.1, mats.carapace, j['hand' + k], 0, -0.45, 0.08); t.rotation.x = Math.PI; }
    r.hit = { body: 0.8, head: 0.3 };
    return r;
  };
  B.lictor = function () {
    const s = { thigh: 0.6, shin: 0.62, hipW: 0.15, torso: 0.72, shW: 0.28, upper: 0.45, fore: 0.5, legR: 0.07, armR: 0.05, hunch: 0.35, digi: true, chestD: 0.35,
      legMat: mats.chitin, shinMat: mats.sflesh, armMat: mats.sflesh, foreMat: mats.chitin, twoHand: false, dual: true };
    const r = M.biped(s), j = r.j;
    const b = sph(0.26, mats.sflesh, j.torso, 0, 0.36, 0); b.scale.set(1, 1.5, 0.8);
    for (let i = 0; i < 4; i++) { const p = sph(0.22, mats.chitin, j.torso, 0, 0.2 + i * 0.16, -0.12); p.scale.set(1.2, 0.5, 0.7); }
    const hd = sph(0.15, mats.chitin, j.head, 0, 0.08, 0.1); hd.scale.set(0.8, 0.9, 1.5);
    for (let i = 0; i < 4; i++) { const tt = cone(0.015, 0.3, mats.sflesh, j.head, -0.04 + i * 0.027, -0.12, 0.2); tt.rotation.x = 2.6; }
    eyes(j.head, mats.sglow, 0.1, 0.28, 0.06, 0.022);
    for (const k of ['L', 'R']) { const t = cone(0.06, 1.0, mats.chitin, j['hand' + k], 0, -0.42, 0.05); t.rotation.x = Math.PI; }
    r.hit = { body: 0.36, head: 0.16 };
    return r;
  };
  B.gargoyle = function () {
    const r = B.ripper();
    r.wings = [];
    for (const sd of [-1, 1]) {
      const w = grp(r.j.torso, sd * 0.15, 0.5, -0.15);
      const shp = new THREE.Shape(); shp.moveTo(0, 0); shp.lineTo(sd * 0.9, 0.3); shp.lineTo(sd * 1.0, -0.3); shp.lineTo(sd * 0.4, -0.4); shp.lineTo(0, -0.2);
      w.add(mesh(new THREE.ShapeGeometry(shp), G.mat('gwing', { color: 0x3a1a3a, rough: 0.6, side: THREE.DoubleSide })));
      r.wings.push({ w, sd });
    }
    const prev = r.extra;
    r.extra = (rg, dt) => { prev && prev(rg, dt); r.wings.forEach(({ w, sd }) => { w.rotation.y = sd * Math.sin(rg.anim.idle * 18) * 0.7; }); };
    return r;
  };
  B.cwraith = function () {
    const r = B.husk();
    r.j.hipL.visible = r.j.hipR.visible = false;
    let p = r.j.pelvis;
    for (let i = 0; i < 6; i++) { const g = grp(p, 0, -0.12, -0.06); cyl(0.07 - i * 0.009, 0.06 - i * 0.009, 0.14, mats.necro, g, 0, -0.07, 0, 8); p = g; g.rotation.x = 0.25; }
    for (const k of ['L', 'R']) for (let i = 0; i < 3; i++) { const c = cone(0.02, 0.4, mats.necro, r.j['hand' + k], -0.03 + i * 0.03, -0.2, 0.02); c.rotation.x = Math.PI; }
    r.s.twoHand = false; r.s.dual = true; r.muzzle = null;
    r.hit = { body: 0.36, head: 0.16 };
    return r;
  };
  B.chaosLord = function () {
    const cape = G.mat('lordcape', { color: 0x2a0606, rough: 0.9, side: THREE.DoubleSide });
    const r = B.legionary({ armor: mats.traitor, trim: mats.traitorTrim, lens: mats.lensR, bulk: true, horns: true, spikes: true, cape, weapon: 'sword', daemonblade: true, melee: true });
    // warp flame in the off hand
    const f = sph(0.12, mats.warpfire, r.j.handL, 0, -0.08, 0, 8); f.castShadow = false;
    r.muzzle = grp(r.j.handL, 0, -0.1, 0.05);
    return r;
  };
  // walkers: loyal dreadnought, greenskin junk-dread
  B.walker = function (style) {
    const ork = style === 'ork';
    const A = ork ? mats.scrap : mats.loyal, T = ork ? mats.ored : mats.loyalTrim;
    const s = { thigh: 0.6, shin: 0.6, hipW: 0.45, torso: 0.6, shW: 0.85, upper: 0.5, fore: 0.6, legR: 0.22, armR: 0.2, hunch: 0, chestD: 1.0,
      legMat: A, armMat: A, footMat: A, foot: 0.7, twoHand: false, armsOut: false };
    const r = M.biped(s), j = r.j;
    if (ork) {
      const can = cyl(0.75, 0.85, 1.4, A, j.torso, 0, 0.6, 0, 10);
      box(0.5, 0.2, 0.1, mats.oeye, j.torso, 0, 1.0, 0.72);
      for (const sd of [-1, 1]) cyl(0.08, 0.1, 0.8, mats.gunmetal, j.torso, sd * 0.4, 1.4, -0.5);
      r.exhaust = [grp(j.torso, -0.4, 1.85, -0.5), grp(j.torso, 0.4, 1.85, -0.5)];
    } else {
      box(1.4, 1.2, 1.1, A, j.torso, 0, 0.6, 0);
      box(0.7, 0.8, 0.1, T, j.torso, 0, 0.65, 0.56);
      const sar = box(0.5, 0.6, 0.06, G.mat('sarc', { color: 0x2a2620, metal: 0.8, rough: 0.3 }), j.torso, 0, 0.65, 0.6);
      box(0.6, 0.35, 0.5, A, j.head, 0, 0.1, 0.25);
      eyes(j.head, mats.lensG, 0.12, 0.5, 0.12, 0.04);
      for (let i = 0; i < 2; i++) cyl(0.08, 0.1, 0.5, mats.blackMetal, j.torso, -0.35 + i * 0.7, 1.35, -0.5);
      r.exhaust = [grp(j.torso, -0.35, 1.6, -0.5), grp(j.torso, 0.35, 1.6, -0.5)];
      sph(0.45, mats.ceramite, j.torso, 0, 1.25, 0.1, 12).scale.y = 0.5;
    }
    for (const sd of [-1, 1]) { const p = box(0.6, 0.5, 0.7, A, j['sh' + (sd < 0 ? 'L' : 'R')], sd * 0.1, 0.05, 0); }
    // right: rotary cannon; left: power fist / klaw
    box(0.4, 0.6, 0.4, A, j.handR, 0, -0.1, 0);
    r.barrels = grp(j.handR, 0, -0.45, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; cyl(0.04, 0.04, 0.8, mats.blackMetal, r.barrels, Math.cos(a) * 0.1, -0.3, Math.sin(a) * 0.1, 6); }
    r.muzzle = grp(j.handR, 0, -1.25, 0);
    box(0.45, 0.45, 0.45, T, j.handL, 0, -0.15, 0);
    for (let i = 0; i < 4; i++) { const c = ork ? cone(0.07, 0.6, mats.gunmetal, j.handL, -0.15 + i * 0.1, -0.6, 0) : box(0.1, 0.3, 0.12, A, j.handL, -0.15 + i * 0.1, -0.5, 0.1); if (ork) c.rotation.x = Math.PI; }
    r.extra = (rg) => {
      if (r.barrels) r.barrels.rotation.y += rg.anim.aim * 0.5;
      if (Math.random() < 0.15) for (const e of r.exhaust) { e.getWorldPosition(_t); G.fx.smoke.emit(_t.x, _t.y, _t.z, 0, 1.5, 0, 1.2, 0.15, 0.7, C1, C2, 0.4, 0, -0.4, 1); }
    };
    r.hit = { body: 0.95, head: 0.3 };
    return r;
  };
  B.colossus = function () {
    const r = B.battlesuit(true);
    box(0.5, 0.5, 0.5, mats.tauArm, r.j.torso, 0, 1.0, -0.1);
    const gen = sph(0.18, mats.lensB, r.j.torso, 0, 0.5, 0.36, 10); gen.castShadow = false;
    cyl(0.08, 0.08, 1.0, mats.tauDark, r.j.handR, 0, -0.75, 0.05);
    r.muzzle = grp(r.j.handR, 0, -1.25, 0.05);
    return r;
  };
  B.brother = () => B.legionary({ weapon: 'bolter' });
  B.sister = () => B.legionary({ armor: mats.blackArm, trim: mats.loyalTrim, head: 'hair', robe: mats.sisterRobe, weapon: 'bolter', lens: mats.lensR });
  B.sisterFlamer = () => B.legionary({ armor: mats.blackArm, trim: mats.loyalTrim, head: 'hair', robe: mats.sisterRobe, weapon: 'flamer' });
  B.traitorMarine = () => B.legionary({ armor: mats.traitor, trim: mats.traitorTrim, lens: mats.lensR, spikes: true, weapon: 'bolter', beaky: true });
  B.possessed = () => B.legionary({ armor: mats.traitor, trim: mats.traitorTrim, lens: G.glow('pey2', 0xffe060), horns: true, tentacle: true, weapon: 'axe', melee: true });
  B.guardsman = () => B.trooper({ gun: 'lasgun', backpack: mats.fatigue });
  B.fireWarrior = () => B.trooper({ head: 'tau', chest: mats.tauArm, arms: mats.tauDark, legs: mats.tauDark, gun: 'pulse' });
  B.guardian = () => B.trooper({ head: 'eldar', chest: mats.eldarArm, arms: mats.eldarArm, legs: mats.eldarArm, gun: 'shuriken', tall: true });
  B.ranger = () => B.trooper({ head: 'ranger', chest: mats.eldarArm, arms: mats.eldarArm, legs: mats.eldarArm, gun: 'longrifle', tall: true });
  B.hybrid = () => B.trooper({ head: 'hybrid', chest: mats.cultOveralls, arms: mats.cultSkin, legs: mats.cultOveralls, gun: 'autogun' });

  /* ---------- set pieces ---------- */
  M.dropPod = function (tint) {
    const g = new THREE.Group(), A = tint || mats.loyal;
    const body = cyl(0.9, 1.4, 3.2, A, g, 0, 1.8, 0, 8);
    cone(0.9, 1.2, A, g, 0, 4.0, 0, 8);
    g.petals = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const p = grp(g, Math.cos(a) * 1.35, 0.2, Math.sin(a) * 1.35);
      p.rotation.y = -a + Math.PI / 2;
      box(1.5, 2.8, 0.12, A, p, 0, 1.4, 0);
      box(0.3, 2.4, 0.13, mats.loyalTrim, p, 0, 1.4, 0.01);
      g.petals.push(p);
    }
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + 0.4; const f = box(0.1, 1.2, 0.6, mats.blackMetal, g, Math.cos(a) * 1.2, 3.4, Math.sin(a) * 1.2); f.rotation.y = -a; }
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.texSoft(), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false }));
    fl.scale.setScalar(4); fl.position.y = -0.5; g.add(fl); g.flame = fl;
    return g;
  };
  M.gunship = function () {
    const g = new THREE.Group(), A = mats.hull;
    box(2.4, 2.2, 9, A, g, 0, 0, 0);
    const nose = box(1.8, 1.6, 2.4, A, g, 0, -0.2, 5.4); nose.rotation.x = 0.15;
    box(1.6, 0.4, 0.8, G.glow('cockpit', 0xff9020, 0.8), g, 0, 0.4, 6.0);
    for (const sd of [-1, 1]) {
      const w = box(7, 0.25, 3.5, A, g, sd * 4.5, 0.4, -1); w.rotation.z = sd * 0.08;
      box(0.5, 0.5, 2.6, mats.blackMetal, g, sd * 6.5, 0.2, 0.2);
      const en = cyl(0.8, 0.9, 2.6, A, g, sd * 1.8, 0.6, -4.2); en.rotation.x = Math.PI / 2;
      const fl = sph(0.7, mats.engine, g, sd * 1.8, 0.6, -5.6, 10); fl.castShadow = false;
      box(0.2, 2.2, 2.2, A, g, sd * 1.2, 1.9, -3.8);
    }
    box(2.6, 0.2, 3, mats.loyalTrim, g, 0, 1.15, 1);
    return g;
  };
  // colossal war-engine silhouette for the skyline
  M.titan = function () {
    const dark = G.mat('titanMat', { color: 0x16130f, rough: 0.9, metal: 0.3 });
    const s = { thigh: 1.1, shin: 1.1, hipW: 0.45, torso: 1.1, shW: 0.95, upper: 0.8, fore: 0.9, legR: 0.28, armR: 0.25, legMat: dark, armMat: dark, foot: 0.8 };
    const r = M.biped(s), j = r.j;
    box(1.8, 1.4, 1.4, dark, j.torso, 0, 0.7, 0);
    box(0.7, 0.5, 0.7, dark, j.head, 0, 0.1, 0.3);
    sph(0.12, G.glow('teye', 0xffd040), j.head, 0, 0.12, 0.66, 6);
    for (const sd of [-1, 1]) { box(1.0, 0.7, 1.0, dark, j['sh' + (sd < 0 ? 'L' : 'R')], sd * 0.2, 0.1, 0); box(0.5, 1.6, 0.5, dark, j['hand' + (sd < 0 ? 'L' : 'R')], 0, -0.6, 0); }
    box(0.4, 1.2, 0.4, dark, j.torso, 0, 1.8, -0.4);
    r.root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    r.muzzles = [grp(j.handL, 0, -1.4, 0), grp(j.handR, 0, -1.4, 0)];
    return r;
  };
  M.beacon = function (color) {
    const g = new THREE.Group();
    const ring = tor(8, 0.12, G.glow('beac' + color, color, 0.7), g, 0, 0.1, 0); ring.rotation.x = Math.PI / 2; ring.castShadow = false;
    const pillar = cyl(0.6, 0.6, 60, G.glow('beacp' + color, color, 0.12), g, 0, 30, 0, 12); pillar.castShadow = false;
    g.ring = ring;
    return g;
  };
  M.relic = function () {
    const g = new THREE.Group();
    box(2.4, 0.8, 2.4, mats.loyalTrim, g, 0, 0.4, 0);
    box(1.6, 1.6, 1.6, G.mat('relicStone', { color: 0x3a3632, rough: 0.6, metal: 0.3 }), g, 0, 1.6, 0);
    const o = sph(0.5, G.glow('relicGlow', 0xffd060), g, 0, 3.0, 0, 12); o.castShadow = false; g.orb = o;
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; cyl(0.08, 0.08, 3, mats.loyalTrim, g, Math.cos(a) * 1.1, 1.5, Math.sin(a) * 1.1); }
    return g;
  };
})();
