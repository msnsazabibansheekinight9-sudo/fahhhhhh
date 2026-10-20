'use strict';
// ============================================================================
// Viewmodels — the first-person hands and gun, drawn in their own scene.
//
// Each weapon gets a blocky model and a pair of Roblox arms, plus a per-weapon
// rest pose. The animator layers sway, walk bob, slide dip, recoil kick,
// reload, melee swing, bow draw and the sniper's scope-in on top of that pose.
// ============================================================================

function vbrick(w, h, d, color, surface) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), R.tiledMat(color, surface || 'plastic', Math.max(w, d), h));
}

// Rest pose per weapon. Everything inside a viewmodel is authored in WEAPON
// SPACE — the same stud units as the third-person model, barrel pointing +z —
// and the whole rig is then turned 180 degrees so the barrel faces the camera's
// forward axis. That means x is mirrored: the trigger hand is authored at
// negative x and appears on the right.
//   p      rig position in camera space
//   scale  studs to camera units
//   tip    barrel tip in studs, for the muzzle flash
//   grip   [x, y, z, pitch] of the trigger hand, in studs
//   supp   [x, y, z, pitch] of the support hand, in studs
//   eye    rig position while scoped
const POSE = {
  fists:    { p: [0.00, -0.22, -0.52], scale: 0.26, tip: 0, grip: [-0.8, -0.55, 1.1, -0.3], supp: [0.8, -0.65, 0.7, -0.45] },
  rifle:    { p: [0.34, -0.34, -0.58], scale: 0.125, tip: 4.1, grip: [-0.2, -0.8, 0.3, -0.5], supp: [0.1, -0.45, 2.2, -0.55] },
  burst:    { p: [0.34, -0.34, -0.58], scale: 0.125, tip: 3.75, grip: [-0.2, -0.8, 0.2, -0.5], supp: [0.1, -0.45, 2.0, -0.55] },
  smg:      { p: [0.33, -0.32, -0.54], scale: 0.15, tip: 2.7, grip: [-0.2, -0.85, 0.1, -0.5], supp: [0.1, -0.5, 1.5, -0.6] },
  lmg:      { p: [0.35, -0.36, -0.62], scale: 0.11, tip: 4.4, grip: [-0.2, -0.85, -0.5, -0.45], supp: [0.15, -0.6, 1.5, -0.55] },
  sniper:   { p: [0.33, -0.34, -0.64], scale: 0.105, tip: 5.6, grip: [-0.2, -0.8, -0.1, -0.45], supp: [0.15, -0.6, 2.0, -0.55], eye: [0.0, 0.088, -0.46] },
  shotgun:  { p: [0.34, -0.34, -0.60], scale: 0.12, tip: 3.9, grip: [-0.2, -0.75, -0.3, -0.5], supp: [0.1, -0.45, 1.7, -0.55] },
  revolver: { p: [0.25, -0.26, -0.52], scale: 0.17, tip: 1.9, grip: [-0.12, -0.7, -0.35, -0.45], supp: [0.42, -0.8, -0.45, -0.5] },
  rpg:      { p: [0.36, -0.30, -0.64], scale: 0.1, tip: 4.5, grip: [-0.22, -0.9, 0.1, -0.45], supp: [0.2, -0.65, 1.7, -0.55] },
  gl:       { p: [0.34, -0.34, -0.58], scale: 0.125, tip: 2.7, grip: [-0.2, -1.0, -0.45, -0.45], supp: [0.15, -0.7, 1.5, -0.55] },
  energy:   { p: [0.34, -0.34, -0.58], scale: 0.125, tip: 3.6, grip: [-0.2, -0.8, -0.3, -0.5], supp: [0.1, -0.5, 1.8, -0.55] },
  freeze:   { p: [0.33, -0.32, -0.54], scale: 0.15, tip: 2.4, grip: [-0.2, -0.78, -0.3, -0.5], supp: [0.1, -0.5, 1.2, -0.6] },
  bow:      { p: [0.12, -0.26, -0.58], scale: 0.145, tip: 0, grip: [0.55, -0.25, -1.0, -0.35], supp: [-0.12, -0.1, 0.25, -0.25] },
  knife:    { p: [0.30, -0.30, -0.48], scale: 0.23, tip: 0, grip: [-0.12, -0.3, -0.45, -0.4], supp: [0.95, -0.95, -0.7, -0.45] },
  axe:      { p: [0.31, -0.32, -0.54], scale: 0.17, tip: 0, grip: [-0.12, -0.25, -1.0, -0.4], supp: [0.3, -0.5, 0.1, -0.55] },
};
R.buildViewmodel = function (id, opts) {
  opts = opts || {};
  const skin = R.SKINS.find(s => s.id === (opts.skin || 'default')) || R.SKINS[0];
  const team = R.TEAM_COLORS[opts.team] || R.TEAM_COLORS.blue;
  const shirt = skin.shirt || team.shirt;
  const flesh = skin.skin || '#f3c98b';

  const pose = POSE[id] || POSE.rifle;
  const root = new THREE.Group();

  // The rig holds the gun and the arms together, in studs.
  const rig = new THREE.Group();
  rig.scale.setScalar(pose.scale);
  rig.rotation.y = Math.PI;                    // barrel +z becomes forward
  root.add(rig);

  if (id !== 'fists') {
    const w = R.buildWorldWeapon(id);
    w.scale.setScalar(1);                      // the rig owns the scale
    rig.add(w);
  }

  // A forearm: a sleeve running back from the hand, which sits at the pivot.
  const arm = (len, thick) => {
    const g = new THREE.Group();
    const sleeve = vbrick(thick, thick, len, shirt);
    sleeve.position.z = -len / 2 - 0.3;
    const hand = vbrick(thick * 1.05, thick * 1.05, 0.75, flesh);
    g.add(sleeve, hand);
    return g;
  };
  const place = (g, a) => { g.position.set(a[0], a[1], a[2]); g.rotation.x = a[3]; };
  const armR = arm(id === 'fists' ? 2.4 : 2.1, id === 'fists' ? 1.15 : 0.7);
  const armL = arm(id === 'fists' ? 2.4 : 1.9, id === 'fists' ? 1.15 : 0.7);
  place(armR, pose.grip);
  place(armL, pose.supp);
  if (id === 'bow') armL.rotation.y = 0.3;
  rig.add(armR, armL);

  // Muzzle flash and its light, at the barrel tip.
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: R.tex.muzzle, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
  }));
  flash.scale.setScalar(2.4);
  flash.position.set(0, 0.1, pose.tip || 0);
  if (pose.tip) rig.add(flash);
  const light = new THREE.PointLight(0xffc880, 0, 40);
  light.position.copy(flash.position);
  if (pose.tip) rig.add(light);

  root.position.set(pose.p[0], pose.p[1], pose.p[2]);

  root.userData = {
    id, pose, gun: rig, armR, armL, flash, light,
    rest: { p: new THREE.Vector3(pose.p[0], pose.p[1], pose.p[2]), r: new THREE.Euler(0, 0, 0) },
    kick: 0, kickRot: 0, sway: new THREE.Vector2(), bob: 0, reloadT: 0, swingT: 0, drawT: 0, scopeT: 0, equipT: 1,
    gripZ: pose.grip[2], suppZ: pose.supp[2],
  };
  return root;
};

// Fire: punch the gun back and light the flash.
R.vmFire = function (vm, def) {
  const u = vm.userData;
  const power = def.class === 'melee' ? 0 : R.clamp((def.recoil || 0.5) * 0.4 + 0.1, 0.1, 1);
  u.kick = Math.min(1.4, u.kick + power);
  u.kickRot = Math.min(1.4, u.kickRot + power * 1.1);
  if (def.class === 'melee') u.swingT = 1;
  if (def.class !== 'melee' && def.projectile !== 'arrow') {
    u.flash.material.opacity = 1;
    u.flash.scale.setScalar(R.rand(1.8, 3.0) * (def.splash ? 1.7 : 1));
    u.flash.material.rotation = Math.random() * 7;
    u.light.intensity = def.splash ? 9 : 5;
  }
};

R.animateViewmodel = function (vm, s, dt) {
  const u = vm.userData;
  const rest = u.rest;

  // Equip slide-up.
  u.equipT = Math.min(1, u.equipT + dt * 4.5);
  const equip = 1 - R.smooth(u.equipT);

  // Mouse sway, lagging behind the look input.
  u.sway.x = R.damp(u.sway.x, R.clamp(-(s.lookDx || 0) * 0.0007, -0.07, 0.07), 9, dt);
  u.sway.y = R.damp(u.sway.y, R.clamp((s.lookDy || 0) * 0.0007, -0.07, 0.07), 9, dt);

  // Walk bob, scaled by speed and the user's bobbing setting.
  const moving = s.grounded && s.speed > 1.5 && !s.sliding;
  u.bob = R.damp(u.bob, moving ? R.clamp(s.speed / 24, 0, 1.2) : 0, 7, dt);
  const bobAmt = u.bob * (R.settings.bobbing || 0);
  const bx = Math.sin(R.t * 10.5) * 0.022 * bobAmt;
  const by = Math.abs(Math.cos(R.t * 10.5)) * 0.018 * bobAmt - 0.008 * bobAmt;

  // Recoil and swing decay.
  u.kick = R.damp(u.kick, 0, 11, dt);
  u.kickRot = R.damp(u.kickRot, 0, 9, dt);
  u.swingT = Math.max(0, u.swingT - dt * 5.2);
  u.flash.material.opacity = Math.max(0, u.flash.material.opacity - dt * 22);
  u.light.intensity = Math.max(0, u.light.intensity - dt * 90);

  // Reload: drop the gun out of frame and tip it over.
  const rl = s.reloadFrac || 0;
  u.reloadT = R.damp(u.reloadT, rl > 0 ? 1 : 0, 10, dt);
  const rlDip = Math.sin(R.clamp(rl, 0, 1) * Math.PI) * u.reloadT;

  // Scope: pull the sniper to the eye.
  const wantScope = s.scoped ? 1 : 0;
  u.scopeT = R.damp(u.scopeT, wantScope, 14, dt);
  const eye = u.pose.eye;

  // Bow draw pulls the string hand back.
  u.drawT = R.damp(u.drawT, s.chargeFrac || 0, 12, dt);

  const slideDip = s.sliding ? 0.08 : 0;
  const airDip = s.grounded ? 0 : R.clamp(-s.velY / 240, -0.05, 0.06);

  let px = rest.p.x + bx + u.sway.x - u.kick * 0.02;
  let py = rest.p.y + by + u.sway.y - slideDip - rlDip * 0.3 - equip * 0.5 + airDip;
  let pz = rest.p.z + u.kick * 0.1 + rlDip * 0.1;

  if (eye && u.scopeT > 0.001) {
    px = R.lerp(px, eye[0], u.scopeT);
    py = R.lerp(py, eye[1] + by * 0.3, u.scopeT);
    pz = R.lerp(pz, eye[2], u.scopeT);
  }

  vm.position.set(px, py, pz);
  vm.rotation.set(
    rest.r.x - u.kickRot * 0.16 + rlDip * 0.5 + u.sway.y * 1.4 + Math.sin(R.t * 1.3) * 0.004 - u.swingT * 0.9,
    rest.r.y + u.sway.x * 1.6 + rlDip * 0.3 + (eye ? -u.scopeT * rest.r.y : 0),
    rest.r.z + Math.sin(R.t * 0.9) * 0.005 + (s.strafe || 0) * 0.02 + rlDip * 0.4 + u.swingT * 0.5);

  // Bow: the string hand travels back as the draw builds.
  if (u.id === 'bow') u.armR.position.z = u.gripZ - u.drawT * 1.5;
  // Melee: the arm leads the swing, the other follows.
  if (u.id === 'knife' || u.id === 'axe' || u.id === 'fists') {
    const sv = Math.sin(R.clamp(u.swingT, 0, 1) * Math.PI);
    u.armR.rotation.x = u.pose.grip[3] - sv * 0.9;
    u.armL.rotation.x = u.pose.supp[3] - Math.max(0, sv - 0.35) * 0.8;
  }
};

/* --------------------------- scope overlay --------------------------- */
// The sniper's scope is drawn as a DOM overlay (see index.html), so this just
// reports how far in the scope is for the UI to read.

R.vmScopeAmount = vm => (vm && vm.userData ? vm.userData.scopeT : 0);
