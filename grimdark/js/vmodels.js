'use strict';
// More first-person weapons. Same conventions as models.js: barrel along -Z,
// grip at the origin; return {root, muzzle, mag?, leftGrip?, adsY, ...}.
(function () {
  const M = G.models, VM = M.vm, mats = M.mats;
  const { box, sph, cyl, cone, tor, grp, mesh } = M.h;
  const barrel = (r0, r1, len, mat, p, x, y, z) => { const c = cyl(r0, r1, len, mat, p, x, y, z); c.rotation.x = Math.PI / 2; return c; };
  function seal(p, x, y, z) {
    const g = grp(p, x, y, z);
    cyl(0.02, 0.02, 0.008, mats.wax, g, 0, 0, 0, 12).rotation.z = Math.PI / 2;
    box(0.003, 0.09, 0.02, mats.parch, g, 0.004, -0.055, 0);
    return g;
  }
  const grip = (R, mat) => { const g = box(0.055, 0.15, 0.075, mat || mats.glove, R, 0, -0.06, 0.02); g.rotation.x = 0.35; return g; };

  VM.boltPistol = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    box(0.07, 0.11, 0.3, mats.ceramite, R, 0, 0.05, -0.1);
    box(0.072, 0.03, 0.26, mats.blackMetal, R, 0, 0.11, -0.1);
    barrel(0.025, 0.028, 0.08, mats.blackMetal, R, 0, 0.06, -0.28);
    box(0.012, 0.025, 0.012, mats.blackMetal, R, 0, 0.135, -0.22); box(0.03, 0.025, 0.012, mats.blackMetal, R, 0, 0.135, 0.02);
    grip(R);
    const mag = r.mag = grp(R, 0, -0.02, 0.0);
    box(0.045, 0.12, 0.06, mats.blackMetal, mag, 0, -0.08, 0.01);
    box(0.074, 0.02, 0.2, mats.trim, R, 0, 0.0, -0.1);
    seal(R, 0.04, 0.08, -0.05);
    r.muzzle = grp(R, 0, 0.06, -0.33); r.eject = grp(R, 0.04, 0.1, -0.08);
    r.leftGrip = null; r.adsY = -0.135; r.oneHand = true;
    return r;
  };
  VM.plasmaPistol = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    box(0.07, 0.11, 0.24, mats.blackMetal, R, 0, 0.05, -0.06);
    r.coilMat = new THREE.MeshStandardMaterial({ color: 0x103050, emissive: 0x30a0ff, emissiveIntensity: 1, roughness: 0.2 });
    barrel(0.03, 0.03, 0.2, r.coilMat, R, 0, 0.06, -0.26);
    r.rings = [];
    for (let i = 0; i < 4; i++) r.rings.push(tor(0.045, 0.01, mats.blackMetal, R, 0, 0.06, -0.19 - i * 0.04));
    barrel(0.04, 0.03, 0.05, mats.blackMetal, R, 0, 0.06, -0.38);
    r.vents = [];
    for (const sd of [-1, 1]) r.vents.push({ v: box(0.008, 0.07, 0.1, mats.ceramite, R, sd * 0.038, 0.05, -0.03), sd, base: 0.038 });
    grip(R);
    box(0.012, 0.025, 0.012, mats.blackMetal, R, 0, 0.12, -0.15);
    r.muzzle = grp(R, 0, 0.06, -0.42);
    r.leftGrip = null; r.adsY = -0.125; r.oneHand = true;
    return r;
  };
  VM.stormBolter = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    box(0.14, 0.16, 0.38, mats.ceramite, R, 0, 0.06, -0.12);
    for (const sd of [-1, 1]) {
      box(0.06, 0.07, 0.28, mats.blackMetal, R, sd * 0.035, 0.1, -0.42);
      barrel(0.025, 0.03, 0.06, mats.blackMetal, R, sd * 0.035, 0.1, -0.58);
      const mg = box(0.05, 0.14, 0.07, mats.blackMetal, R, sd * 0.035, 0.22, -0.12);
    }
    box(0.15, 0.02, 0.4, mats.trim, R, 0, 0.0, -0.14);
    // gauntlet-style grip: the whole fist wraps the frame
    grip(R);
    box(0.05, 0.04, 0.03, mats.blackMetal, R, 0, 0.17, -0.5);
    seal(R, 0.075, 0.08, -0.2);
    r.muzzles = [grp(R, -0.035, 0.1, -0.62), grp(R, 0.035, 0.1, -0.62)];
    r.muzzle = r.muzzles[0];
    r.eject = grp(R, 0.08, 0.1, -0.1);
    r.mag = grp(R, 0, 0, 0);
    r.leftGrip = new THREE.Vector3(0, 0.0, -0.32);
    r.adsY = -0.19;
    return r;
  };
  VM.heavyBolter = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    box(0.16, 0.2, 0.5, mats.blackMetal, R, 0, 0.07, -0.18);
    box(0.17, 0.06, 0.44, mats.ceramite, R, 0, 0.18, -0.18);
    barrel(0.045, 0.05, 0.5, mats.blackMetal, R, 0, 0.08, -0.65);
    for (let i = 0; i < 4; i++) tor(0.06, 0.012, mats.trim, R, 0, 0.08, -0.48 - i * 0.1);
    barrel(0.065, 0.055, 0.12, mats.blackMetal, R, 0, 0.08, -0.92);
    // ammo belt to a backpack drum (off-screen right)
    const mag = r.mag = grp(R, 0.09, 0.02, -0.15);
    for (let i = 0; i < 8; i++) { const l = box(0.04, 0.03, 0.05, mats.brass, mag, 0.03 + i * 0.025, -0.02 - i * 0.03, 0.03 + i * 0.02); l.rotation.z = -0.5; }
    grip(R);
    box(0.08, 0.04, 0.04, mats.blackMetal, R, 0, 0.23, -0.05);
    box(0.06, 0.08, 0.06, mats.glove, R, 0, 0.0, -0.42).rotation.x = -0.3;
    seal(R, -0.085, 0.1, -0.3);
    r.muzzle = grp(R, 0, 0.08, -1.0); r.eject = grp(R, 0.09, 0.1, -0.1);
    r.leftGrip = new THREE.Vector3(0, 0.02, -0.44);
    r.adsY = -0.25;
    return r;
  };
  VM.assaultCannon = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    box(0.18, 0.2, 0.36, mats.ceramite, R, 0, 0.06, -0.1);
    box(0.19, 0.04, 0.38, mats.trim, R, 0, 0.17, -0.1);
    r.spinner = grp(R, 0, 0.07, -0.3);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; barrel(0.018, 0.018, 0.55, mats.blackMetal, r.spinner, Math.cos(a) * 0.05, Math.sin(a) * 0.05, -0.27); }
    for (const z of [-0.12, -0.5]) tor(0.075, 0.015, mats.blackMetal, r.spinner, 0, 0, z);
    barrel(0.03, 0.03, 0.6, mats.blackMetal, r.spinner, 0, 0, -0.27);
    const mag = r.mag = grp(R, 0.11, 0, -0.1);
    box(0.08, 0.16, 0.2, mats.blackMetal, mag, 0.02, -0.02, 0);
    grip(R);
    r.muzzle = grp(R, 0, 0.07, -0.86);
    r.leftGrip = new THREE.Vector3(-0.04, 0.0, -0.3);
    r.adsY = -0.24;
    return r;
  };
  VM.lascannon = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    box(0.16, 0.2, 0.4, mats.blackMetal, R, 0, 0.07, -0.1);
    r.heatMat = new THREE.MeshStandardMaterial({ color: 0x300808, emissive: 0xff2010, emissiveIntensity: 0.3, roughness: 0.4, metalness: 0.5 });
    barrel(0.05, 0.05, 0.85, mats.ceramite, R, 0, 0.09, -0.7);
    for (let i = 0; i < 6; i++) tor(0.065, 0.014, r.heatMat, R, 0, 0.09, -0.4 - i * 0.1);
    barrel(0.07, 0.05, 0.12, mats.blackMetal, R, 0, 0.09, -1.16);
    const sc = barrel(0.03, 0.03, 0.22, mats.blackMetal, R, 0.0, 0.2, -0.2);
    const lens = cyl(0.025, 0.025, 0.005, G.glow('lasLens', 0xff4020), R, 0, 0.2, -0.31); lens.rotation.x = Math.PI / 2;
    const mag = r.mag = grp(R, 0, -0.03, -0.05);
    box(0.12, 0.14, 0.14, G.mat('lascell', { color: 0x3a3a2a, metal: 0.6, rough: 0.4 }), mag, 0, -0.08, 0);
    grip(R);
    r.muzzle = grp(R, 0, 0.09, -1.24);
    r.leftGrip = new THREE.Vector3(0, 0.02, -0.5);
    r.adsY = -0.2;
    return r;
  };
  VM.missile = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    barrel(0.09, 0.09, 1.3, mats.ceramite, R, 0, 0.12, -0.35);
    barrel(0.1, 0.1, 0.06, mats.trim, R, 0, 0.12, -1.0);
    barrel(0.1, 0.1, 0.06, mats.trim, R, 0, 0.12, 0.28);
    box(0.06, 0.1, 0.12, mats.blackMetal, R, -0.1, 0.18, -0.3);
    grip(R);
    box(0.06, 0.1, 0.06, mats.glove, R, 0, 0.0, -0.5);
    const mag = r.mag = grp(R, 0, 0.12, 0.35);
    const rk = barrel(0.06, 0.06, 0.25, G.mat('rocket', { color: 0x3a4a2a, rough: 0.5, metal: 0.4 }), mag, 0, 0, -0.1);
    cone(0.06, 0.12, mats.trim, mag, 0, 0, -0.28).rotation.x = -Math.PI / 2;
    r.muzzle = grp(R, 0, 0.12, -1.05);
    r.leftGrip = new THREE.Vector3(0, -0.02, -0.52);
    r.adsY = -0.29; r.adsX = 0.1;
    return r;
  };
  VM.lasgun = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    box(0.06, 0.1, 0.34, mats.gunmetal, R, 0, 0.05, -0.1);
    box(0.065, 0.08, 0.28, mats.wood, R, 0, 0.03, -0.38);
    barrel(0.015, 0.018, 0.25, mats.gunmetal, R, 0, 0.06, -0.62);
    barrel(0.025, 0.02, 0.05, mats.gunmetal, R, 0, 0.06, -0.76);
    box(0.06, 0.1, 0.2, mats.wood, R, 0, 0.02, 0.15);
    box(0.012, 0.03, 0.012, mats.gunmetal, R, 0, 0.1, -0.5);
    box(0.03, 0.025, 0.02, mats.gunmetal, R, 0, 0.11, -0.02);
    grip(R, mats.wood);
    const mag = r.mag = grp(R, 0, -0.01, -0.18);
    box(0.05, 0.08, 0.1, G.mat('lascell2', { color: 0x4a4a3a, metal: 0.6, rough: 0.4 }), mag, 0, -0.05, 0);
    r.muzzle = grp(R, 0, 0.06, -0.8);
    r.leftGrip = new THREE.Vector3(0, -0.01, -0.38);
    r.adsY = -0.115;
    return r;
  };
  VM.longlas = function () {
    const r = VM.lasgun();
    const R = r.root;
    barrel(0.015, 0.015, 0.4, mats.gunmetal, R, 0, 0.06, -0.95);
    r.muzzle.position.z = -1.15;
    barrel(0.028, 0.028, 0.3, mats.blackMetal, R, 0, 0.15, -0.12);
    for (const z of [-0.27, 0.03]) barrel(0.034, 0.03, 0.04, mats.blackMetal, R, 0, 0.15, z);
    box(0.02, 0.06, 0.02, mats.blackMetal, R, 0, 0.115, -0.12);
    r.adsY = -0.15; r.scope = true;
    return r;
  };
  // power weapons: hammer, claws, staff, knife; and the psyker's open hand
  VM.hammer = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    cyl(0.025, 0.025, 0.7, mats.blackMetal, R, 0, 0, -0.25).rotation.x = Math.PI / 2;
    const head = grp(R, 0, 0, -0.62);
    box(0.24, 0.16, 0.16, mats.ceramite, head, 0, 0.0, 0);
    for (const sd of [-1, 1]) box(0.04, 0.18, 0.18, mats.trim, head, sd * 0.12, 0, 0);
    r.arcMat = G.glow('hamArc', 0x80c0ff, 0.9);
    r.arcs = [];
    for (let i = 0; i < 3; i++) { const a = box(0.005, 0.005, 0.2, r.arcMat, head, G.rand(-0.1, 0.1), G.rand(-0.08, 0.08), 0); a.castShadow = false; r.arcs.push(a); }
    sph(0.04, mats.trim, R, 0, 0, 0.12, 8);
    r.muzzle = grp(head, 0, 0, 0);
    r.leftGrip = null; r.melee = true;
    return r;
  };
  VM.claws = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    // right claw: blades sprout from the gauntlet
    for (let i = 0; i < 3; i++) { const b = box(0.008, 0.02, 0.32, G.mat('clawb', { color: 0x9ab0d0, emissive: 0x203060, metal: 1, rough: 0.15 }), R, -0.025 + i * 0.025, 0.02, -0.22); }
    r.leftClaw = new THREE.Group();
    const lg = M.gauntlet(-1); r.leftClaw.add(lg.hand);
    for (let i = 0; i < 3; i++) box(0.008, 0.02, 0.32, G.mat('clawb', {}), r.leftClaw, -0.025 + i * 0.025, 0.02, -0.22);
    r.leftFore = lg.fore;
    r.muzzle = grp(R, 0, 0.02, -0.38);
    r.leftGrip = null; r.melee = true;
    return r;
  };
  VM.forceStaff = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    cyl(0.02, 0.02, 1.1, G.mat('staffwood', { color: 0x2a1a10, rough: 0.6 }), R, 0, 0, -0.2).rotation.x = Math.PI / 2;
    const head = grp(R, 0, 0, -0.78);
    tor(0.06, 0.012, mats.trim, head, 0, 0, 0);
    r.orb = sph(0.04, G.glow('psyorb', 0x60a0ff), head, 0, 0, 0, 10);
    for (let i = 0; i < 4; i++) { const w = cone(0.012, 0.12, mats.trim, head, Math.cos(i * 1.57) * 0.06, Math.sin(i * 1.57) * 0.06, -0.03); w.rotation.x = -Math.PI / 2; }
    r.muzzle = head;
    r.leftGrip = new THREE.Vector3(0, 0, -0.3); r.melee = true;
    return r;
  };
  VM.smite = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    // an open hand around a crackling psychic orb, grimoire chained to the wrist
    r.orb = sph(0.045, G.glow('smiteOrb', 0x80b0ff), R, 0, 0.02, -0.12, 10);
    r.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.texSoft(), color: 0x4080ff, blending: THREE.AdditiveBlending, depthWrite: false }));
    r.halo.scale.setScalar(0.2); r.halo.position.set(0, 0.02, -0.12); R.add(r.halo);
    box(0.08, 0.1, 0.02, G.mat('grimoire', { color: 0x4a1a10, rough: 0.8 }), R, 0.07, -0.12, 0.05).rotation.z = 0.3;
    r.arcMat = G.glow('smiteArc', 0xa0c8ff, 0.9);
    r.arcs = [];
    for (let i = 0; i < 4; i++) { const a = box(0.004, 0.004, 0.12, r.arcMat, R, 0, 0.02, -0.12); a.castShadow = false; r.arcs.push(a); }
    r.muzzle = grp(R, 0, 0.02, -0.16);
    r.leftGrip = null; r.psychic = true; r.oneHand = true;
    return r;
  };
  VM.knife = function () {
    const r = { root: new THREE.Group() }, R = r.root;
    cyl(0.02, 0.022, 0.12, mats.wood, R, 0, 0, 0.0).rotation.x = Math.PI / 2;
    box(0.08, 0.02, 0.02, mats.gunmetal, R, 0, 0, -0.07);
    const b = box(0.008, 0.04, 0.24, G.mat('edge', { color: 0xb0b0b0, metal: 1, rough: 0.2 }), R, 0, 0.005, -0.2);
    r.muzzle = grp(R, 0, 0, -0.3);
    r.leftGrip = null; r.melee = true;
    return r;
  };
})();
