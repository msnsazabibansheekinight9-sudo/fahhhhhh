'use strict';
// Player: movement, stats from skills/perks/armour, weapons with a fully
// animated viewmodel (arms, ADS, recoil, sway, reloads), melee, throwables,
// deployables, health/armour/dodge, downs and custody.

/* ---------------- stat aggregation ---------------- */
H.calcMods = function () {
  const s = H.save, out = {};
  const addFx = fx => { for (const k0 in fx) { const k = k0.replace(/\d+$/, ''), v = fx[k0]; if (k.endsWith('Mul')) out[k] = (out[k] ?? 1) * v; else out[k] = (out[k] || 0) + v; } };
  for (const tr of H.SKILL_TREES) tr.subs.forEach((sub, si) => sub.skills.forEach((sk, ki) => {
    const lv = s.skills[tr.id + si + '_' + ki] || 0;
    if (lv >= 1) addFx(sk[2]); if (lv >= 2) addFx(sk[4]);
  }));
  const deck = H.PERK_DECKS.find(d => d.id === s.perk.deck);
  if (deck) for (let i = 0; i < Math.min(s.perk.cards || 0, deck.cards.length); i++) addFx(deck.cards[i][1]);
  if (s.infamy) addFx({ xpMul: 1 + s.infamy * 0.05 });
  H.M = out;
  return out;
};
H.mod = (k, d) => H.M && H.M[k] !== undefined ? H.M[k] : (d !== undefined ? d : (k.endsWith('Mul') ? 1 : 0));

H.weaponStats = function (inst) {
  const w = H.WMAP[inst.id];
  const st = { dmg: 0, acc: 0, stab: 0, conceal: 0, mag: 0, reload: 0, total: 0, zoom: 0, silent: 0, pierce: 0, explode: 0, burn: 0, pellets: 0 };
  for (const slot in (inst.mods || {})) { const m = H.MODMAP[inst.mods[slot]]; if (!m) continue; for (const k in m.st) st[k] = (st[k] || 0) + m.st[k]; }
  const cat = w.cat === 'akimbo' ? (w.id.includes('compact') ? 'smg' : 'pistol') : w.cat;
  let dmg = w.dmg * (1 + st.dmg);
  if (cat === 'shotgun') dmg *= H.mod('sgDmgMul');
  if (cat === 'pistol') dmg += H.mod('pistolDmgAdd');
  if (st.silent) dmg *= H.mod('supDmgMul');
  let acc = H.clamp(w.acc + st.acc + H.mod('accAdd') + (cat === 'pistol' ? H.mod('pistolAccAdd') : 0), 0, 100);
  let stab = H.clamp(w.stab + st.stab + H.mod('stabAdd') + (cat === 'shotgun' ? H.mod('sgStabAdd') : 0) + (w.akimbo ? H.mod('akimboStabAdd') : 0), 0, 100);
  let mag = Math.max(1, Math.round(w.mag * (1 + st.mag)) + (cat === 'pistol' ? H.mod('pistolMagAdd') : 0) + (cat === 'shotgun' && w.mag > 2 ? H.mod('sgMagAdd') : 0));
  let total = Math.round(w.total * (1 + st.total) * H.mod('totalMul') * (w.akimbo ? H.mod('akimboAmmoMul') : 1));
  let reload = w.reload * (1 + st.reload) * (cat === 'shotgun' ? H.mod('sgReloadMul') : 1);
  let rof = w.rpm / 60 * (w.fire === 'a' ? H.mod('autoRofMul') : 1) * (cat === 'pistol' && w.fire === 's' ? H.mod('pistolRofMul') : 1);
  const conceal = H.clamp(w.conceal + st.conceal + (st.silent ? H.mod('supConceal') : 0), 0, 30);
  const pellets = st.pellets ? st.pellets : w.pellets;
  return {
    w, cat, dmg, acc, stab, mag, total, reload, rof, conceal, pellets,
    zoom: 1.2 + (st.zoom || 0) + (w.cat === 'sniper' && !st.zoom ? 0.3 : 0), optic: (H.MODMAP[(inst.mods || {}).sight] || {}).vis || 'irons',
    silent: st.silent > 0 || w.proj === 'arrow' || w.proj === 'bolt', pierce: st.pierce > 0 || w.cat === 'sniper', explode: st.explode > 0, burn: st.burn > 0,
    spreadHip: (1 - acc / 100) * 5.5 + (pellets > 1 ? 2.2 : 0.4), spreadAds: (1 - acc / 100) * 1.2 + (pellets > 1 ? 1.6 : 0.05),
    kick: (1 - stab / 100) * 2.6 + 0.35, range: (cat === 'shotgun' ? 18 * H.mod('sgRangeMul') : cat === 'sniper' ? 200 : 60),
  };
};
H.conceal = function () {
  const s = H.save, lo = s.loadout;
  const inv = id => s.weapons.find(x => x.uid === id);
  let c = 0;
  for (const k of ['primary', 'secondary']) { const i = inv(lo[k]); if (i) c += H.weaponStats(i).conceal; }
  c += (H.ARMORS.find(a => a.id === lo.armor) || H.ARMORS[0]).conceal;
  c += H.mod('concealAdd') + H.mod('concealAdd3');
  // detection risk 3..75 (lower is better)
  return Math.round(H.clamp(75 - c * 0.85, 3, 75));
};

/* ---------------- player object ---------------- */
H.P = null;
H.makePlayer = function () {
  const P = H.P = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: true, crouch: 0, crouching: false, sprint: false, stamina: 1,
    eye: 1.62, height: 1.75, radius: 0.35,
    hp: 100, hpMax: 100, armor: 50, armorMax: 50, armorT: 0, dodge: 0, downed: false, downs: 0, maxDowns: 3, bleed: 0, custody: 0,
    masked: false, maskHold: 0, weapons: [], cur: 0, fireT: 0, reloadT: 0, reloading: false, swapT: 0, ads: 0, aiming: false,
    recoil: 0, recoilYaw: 0, bloom: 0, meleeT: 0, meleeCd: 0, throwCd: 0, throws: 0, deploy: null, deployUses: 0, bag: null,
    ties: 4, bodyBags: 3, inCar: null, hurtT: 0, flash: 0, tased: 0, stagger: 0, kills: 0, swanT: 0, invuln: 0, lastDmgT: 0,
    hostages: 0, overkillT: 0, bobT: 0, stepT: 0, hostageRegen: 0, sixth: 0,
  };
  return P;
};
H.equipLoadout = function () {
  const P = H.P, s = H.save, lo = s.loadout;
  H.calcMods();
  const armor = H.ARMORS.find(a => a.id === lo.armor) || H.ARMORS[0];
  P.armorDef = armor;
  P.hpMax = Math.round(100 * H.mod('hpMul') * (s.perk.deck === 'yakuza' ? 0.8 : 1));
  P.armorMax = Math.round(armor.armor * H.mod('armorMul'));
  P.dodge = armor.dodge + H.mod('dodgeAdd');
  P.hp = P.hpMax; P.armor = P.armorMax; P.downed = false; P.downs = 0;
  P.maxDowns = H.DIFFS[H.run ? H.run.diff : 0].oneDown ? 1 : 3 + H.mod('downsAdd');
  P.speedMul = armor.speed * H.mod('speedMul');
  P.weapons = ['primary', 'secondary'].map(k => {
    const inst = s.weapons.find(x => x.uid === lo[k]) || s.weapons[0];
    const st = H.weaponStats(inst);
    return { inst, st, mag: st.mag, reserve: st.total - st.mag };
  });
  P.cur = 0;
  P.melee = H.MELEE.find(m => m.id === lo.melee) || H.MELEE[0];
  P.throwable = H.THROWABLES.find(t => t.id === lo.throwable) || H.THROWABLES[0];
  P.throws = P.throwable.count;
  const dep = H.DEPLOYABLES.find(d => d.id === lo.deployable) || H.DEPLOYABLES[0];
  P.deploy = dep;
  P.deployUses = dep.id === 'fak' ? 4 + H.mod('fakAdd') : dep.id === 'trip' ? 6 + H.mod('tripAdd') : dep.id === 'ecm' ? 1 + H.mod('ecmAdd') : dep.id === 'sentry' ? 1 + H.mod('sentryAdd') : dep.id === 'doctor' ? 1 + H.mod('doctorAdd2') : dep.id === 'ammo' ? 1 + H.mod('ammoBag') : 1;
  P.ties = 4 + H.mod('tiesAdd'); P.bodyBags = 3 + H.mod('bodyBagAdd');
  P.pagers = 4 + H.mod('pagerAdd');
  P.detect = H.conceal();
  H.buildViewmodel();
};

/* ---------------- viewmodel ---------------- */
H.vm = { group: null, gun: null, arms: null, melee: null, bob: 0, kick: 0, swayX: 0, swayY: 0, reloadPh: 0, equip: 0 };
function buildArm(side, sleeve) {
  // forearm + glove with fingers; pivot at the wrist
  const g = new THREE.Group();
  const glove = H.mat(0x1c1c1e, 0.75), cuff = H.mat(sleeve, 0.85), watch = H.mat(0xc0c0c0, 0.2, 1);
  const fa = new THREE.Mesh(H.geo.limb(0.042, 0.034, 0.34), cuff); fa.rotation.x = -Math.PI / 2; fa.position.z = 0.0; g.add(fa);
  const cf = new THREE.Mesh(H.geo.cyl(0.037, 0.037, 0.04, 10), H.mat(0x15161a, 0.8)); cf.rotation.x = Math.PI / 2; cf.position.z = 0.02; g.add(cf);
  if (side > 0) { const w = new THREE.Mesh(H.geo.cyl(0.036, 0.036, 0.02, 10), watch); w.rotation.x = Math.PI / 2; w.position.z = 0.05; g.add(w); }
  const palm = new THREE.Mesh(H.geo.box(0.07, 0.03, 0.08), glove); palm.position.set(0, 0, -0.04); g.add(palm);
  const fingers = [];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group(); f.position.set(-0.026 + i * 0.017, 0, -0.08); g.add(f);
    const a = new THREE.Mesh(H.geo.box(0.015, 0.016, 0.04), glove); a.position.z = -0.02; f.add(a);
    const b = new THREE.Group(); b.position.z = -0.04; f.add(b);
    const bm = new THREE.Mesh(H.geo.box(0.014, 0.015, 0.035), glove); bm.position.z = -0.017; b.add(bm);
    f.rotation.x = -1.1; b.rotation.x = -1.2; fingers.push(f);
  }
  const th = new THREE.Group(); th.position.set(side * 0.035, -0.005, -0.03); g.add(th);
  const tm = new THREE.Mesh(H.geo.box(0.016, 0.016, 0.05), glove); tm.position.z = -0.025; th.add(tm); th.rotation.set(-0.4, -side * 0.7, 0);
  g.userData.fingers = fingers;
  g.traverse(o => { o.castShadow = false; });
  return g;
}
H.buildViewmodel = function () {
  const P = H.P, vm = H.vm;
  if (vm.group) H.vmCamera.remove(vm.group);
  vm.group = new THREE.Group(); H.vmCamera.add(vm.group);
  vm.guns = []; vm.armsR = []; vm.armsL = [];
  const W = P.weapons[P.cur];
  const sleeve = 0x2a2e36;
  const holder = new THREE.Group(); vm.group.add(holder); vm.holder = holder;
  const make = (side) => {
    const g = H.buildGun(W.inst.w || H.WMAP[W.inst.id], W.inst.mods, W.inst.paint);
    const pivot = new THREE.Group(); pivot.add(g); holder.add(pivot);
    const u = g.userData;
    // right hand on the grip, left hand on the handguard (or both on a pistol)
    const r = buildArm(1, sleeve); r.position.set(0.0, -0.06, u.gripZ + 0.02); r.rotation.set(0.35, 0, 0); g.add(r);
    const w = H.WMAP[W.inst.id];
    const pistolish = ['pistol', 'revolver'].includes(w.arch);
    const l = buildArm(-1, sleeve);
    if (pistolish && !w.akimbo) { l.position.set(-0.02, -0.07, u.gripZ + 0.04); l.rotation.set(0.5, 0.4, 0.3); }
    else if (w.akimbo) { l.visible = false; }
    else { l.position.set(-0.025, -0.04, Math.min(-0.15, u.muzzle.z * 0.55)); l.rotation.set(0.2, 0.25, 0.5); }
    g.add(l);
    vm.guns.push({ pivot, g, side, armL: l, armR: r });
    return pivot;
  };
  const w = H.WMAP[W.inst.id];
  if (w.akimbo) { make(1).position.x = 0.12; make(-1).position.x = -0.12; }
  else make(1);
  vm.equip = 0; vm.reloadPh = 0;
  const g0 = vm.guns[0].g;
  // hip / ads offsets: ads aligns the sight with the screen centre
  vm.hip = new THREE.Vector3(w.akimbo ? 0 : 0.2, -0.21, -0.58);
  if (['pistol', 'revolver'].includes(w.arch) && !w.akimbo) vm.hip.set(0.17, -0.17, -0.45);
  vm.adsPos = new THREE.Vector3(0, -g0.userData.sightY, ['pistol', 'revolver'].includes(w.arch) ? -0.36 : -0.24);
  if (w.arch === 'minigun' || w.arch === 'saw' || w.arch === 'flame' || w.arch === 'rocket') vm.adsPos.set(0.08, -0.12, -0.42);
  // melee model for quick melee
  vm.meleeG = new THREE.Group(); vm.group.add(vm.meleeG);
  const mm = H.buildMelee(P.melee); vm.meleeG.add(mm);
  const ma = buildArm(1, sleeve); ma.position.set(0, -0.02, 0.06); vm.meleeG.add(ma);
  vm.meleeG.visible = false;
  vm.laser = null;
  if (g0.userData.laserAt) {
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -30)]);
    vm.laser = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.5 }));
    vm.laser.position.copy(g0.userData.laserAt); g0.add(vm.laser);
  }
  vm.flashS = new THREE.Sprite(new THREE.SpriteMaterial({ map: H.tex.flash, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  vm.flashS.scale.setScalar(0.25); vm.flashS.visible = false; g0.add(vm.flashS); vm.flashS.position.copy(g0.userData.muzzle);
};

H.updateViewmodel = function (dt) {
  const P = H.P, vm = H.vm; if (!vm.group) return;
  const W = P.weapons[P.cur], w = H.WMAP[W.inst.id];
  vm.group.visible = !P.inCar && !P.custody && !H.ui.menuOpen;
  vm.equip = Math.min(1, vm.equip + dt * 3.5);
  const moving = Math.hypot(P.vel.x, P.vel.z);
  const sprinting = P.sprint && moving > 1 && !P.aiming;
  vm.bob += dt * moving * (sprinting ? 1.6 : 1.9);
  const ads = P.ads;
  // target pose
  const pos = new THREE.Vector3().lerpVectors(vm.hip, vm.adsPos, ads);
  let rx = 0, ry = 0, rz = 0;
  const bobA = (1 - ads * 0.85) * Math.min(1, moving / 4);
  pos.x += Math.sin(vm.bob) * 0.012 * bobA * (sprinting ? 2.4 : 1);
  pos.y += -Math.abs(Math.cos(vm.bob)) * 0.012 * bobA * (sprinting ? 2.4 : 1);
  // idle breathing
  pos.y += Math.sin(H.t * 1.4) * 0.002 * (1 - ads);
  if (sprinting) { rx += -0.25; ry += 0.7; rz += 0.25; pos.x -= 0.05; pos.y -= 0.03; }
  if (P.downed) { pos.y -= 0.03; rz += 0.15; }
  // mouse sway
  vm.swayX = H.damp(vm.swayX, -H.mouse.dx * 0.0006 * (1 - ads * 0.7), 10, dt);
  vm.swayY = H.damp(vm.swayY, H.mouse.dy * 0.0006 * (1 - ads * 0.7), 10, dt);
  pos.x += vm.swayX; pos.y += vm.swayY; ry += vm.swayX * 2; rx += vm.swayY * 2;
  // recoil kick
  vm.kick = H.damp(vm.kick, 0, 18, dt);
  pos.z += vm.kick * 0.06; rx += vm.kick * 0.14;
  // equip raise
  const e = 1 - vm.equip; pos.y -= e * 0.25; rx -= e * 0.8;
  // reload: tilt the gun, drop the mag, bring a new one in
  if (P.reloading) {
    vm.reloadPh += dt / Math.max(0.2, P.reloadDur);
    const u = H.clamp(vm.reloadPh, 0, 1), tilt = Math.sin(u * Math.PI);
    rz += tilt * 0.6; rx += tilt * 0.25; pos.y -= tilt * 0.04; pos.x -= tilt * 0.03;
    for (const G of vm.guns) {
      const mg = G.g.userData.mag; if (mg) { mg.position.y = (G.g.userData.magBaseY ??= mg.position.y) - (u < 0.5 ? u * 2 : (1 - u) * 2) * 0.18; mg.visible = !(u > 0.42 && u < 0.5); }
      const pump = G.g.userData.pump; if (pump && w.arch === 'pump') pump.position.z = (pump.userData.z0 ??= pump.position.z) + Math.sin(u * Math.PI * 4) * 0.02;
      // left hand reaches down to the magazine
      if (G.armL.visible && !['pistol', 'revolver'].includes(w.arch)) { G.armL.position.y = -0.04 - tilt * 0.12; }
    }
    if (u >= 0.45 && !vm.clickA) { vm.clickA = true; H.audio.reload(0); }
    if (u >= 0.85 && !vm.clickB) { vm.clickB = true; H.audio.reload(1); }
  } else { vm.reloadPh = 0; vm.clickA = vm.clickB = false; for (const G of vm.guns) { const mg = G.g.userData.mag; if (mg) { if (G.g.userData.magBaseY !== undefined) mg.position.y = G.g.userData.magBaseY; mg.visible = true; } if (G.armL.visible) G.armL.position.y = -0.04; } }
  // pump action after each shot
  for (const G of vm.guns) {
    const pump = G.g.userData.pump; if (pump && (w.fire === 'p') && P.pumpT > 0) pump.position.z = (pump.userData.z0 ??= pump.position.z) + Math.sin((1 - P.pumpT / 0.35) * Math.PI) * 0.08;
    const spin = G.g.userData.spin; if (spin) spin.rotation[w.arch === 'saw' ? 'x' : 'z'] += dt * (H.mouse.l && !P.reloading ? 40 : 2);
    if (G.g.userData.string && w.arch === 'bow') { const dr = H.mouse.l ? Math.min(1, (P.drawT || 0)) : 0; G.g.userData.string.position.z = 0.12 + dr * 0.25; if (G.g.userData.arrow) G.g.userData.arrow.visible = W.mag > 0; }
  }
  // melee swing replaces the gun briefly
  const melee = P.meleeT > 0;
  vm.holder.visible = !melee; vm.meleeG.visible = melee;
  if (melee) {
    const u = 1 - P.meleeT / P.meleeDur, s = Math.sin(u * Math.PI);
    vm.meleeG.position.set(0.25 - s * 0.35, -0.2 + s * 0.08, -0.35 - s * 0.15);
    vm.meleeG.rotation.set(-0.2 + s * 0.5, 0.6 - s * 1.6, -0.3 + s * 0.6);
  }
  vm.holder.position.lerp(pos, 1 - Math.exp(-dt * 22));
  vm.holder.rotation.x = H.damp(vm.holder.rotation.x, rx, 16, dt);
  vm.holder.rotation.y = H.damp(vm.holder.rotation.y, ry, 12, dt);
  vm.holder.rotation.z = H.damp(vm.holder.rotation.z, rz, 12, dt);
  // akimbo: alternate kick
  if (vm.guns.length > 1) for (const G of vm.guns) G.pivot.position.z = (G.kick || 0) * 0.05, G.kick = H.damp(G.kick || 0, 0, 18, dt);
  vm.flashS.visible = P.flashT > 0; P.flashT = Math.max(0, (P.flashT || 0) - dt);
  H.vmFlash.intensity = P.flashT > 0 ? 3 : 0;
  if (vm.laser) vm.laser.visible = true;
  // reflex reticles fade in while aiming
  for (const G of vm.guns) { const r = G.g.userData.reticle; if (r) r.material.opacity = H.clamp((ads - 0.4) * 2, 0, 1); }
};

/* ---------------- movement ---------------- */
H.updatePlayer = function (dt) {
  const P = H.P;
  if (P.custody > 0) { P.custody -= dt; if (P.custody <= 0) H.game.leaveCustody(); return; }
  if (P.inCar) return;
  // look
  const sens = 0.0022 * H.settings.sens * (1 - P.ads * (1 - 1 / P.weapons[P.cur].st.zoom) * (P.scoped ? 0.9 : 0.6));
  if (P.tased > 0) { P.yaw += Math.sin(H.t * 30) * 0.02; P.pitch += Math.cos(H.t * 27) * 0.02; }
  P.yaw -= H.mouse.dx * sens; P.pitch -= H.mouse.dy * sens;
  P.pitch = H.clamp(P.pitch, -1.5, 1.5);
  // recoil recovers
  // recoil settles back once you stop firing; pulling the mouse down counts toward it
  if (H.mouse.dy > 0 && P.recoilAcc > 0) P.recoilAcc = Math.max(0, P.recoilAcc - H.mouse.dy * sens);
  if (P.recoilAcc > 0 && H.t - (P.lastShot || 0) > 0.1) { const r = Math.min(P.recoilAcc, dt * (0.5 + P.recoilAcc * 6)); P.pitch -= r; P.recoilAcc -= r; }
  // input
  const fwd = (H.keys.KeyW ? 1 : 0) - (H.keys.KeyS ? 1 : 0), str = (H.keys.KeyD ? 1 : 0) - (H.keys.KeyA ? 1 : 0);
  const wantCrouch = H.keys.KeyC || H.keys.ControlLeft;
  P.crouching = !!wantCrouch && !P.downed;
  P.crouch = H.damp(P.crouch, P.crouching || P.downed ? 1 : 0, 12, dt);
  const bagW = P.bag ? H.LOOT[P.bag].weight : 0;
  P.sprint = !!H.keys.ShiftLeft && fwd > 0 && !P.crouching && !P.downed && P.stamina > 0.05 && !(bagW > 0.8);
  if (P.sprint && (P.aiming || P.reloading) && !H.mod('sprintReload')) P.sprint = false;
  let speed = (P.sprint ? 6.4 * H.mod('sprintMul') : 3.9) * (P.speedMul || 1);
  if (P.crouching) speed *= 0.5 * H.mod('crouchMul');
  if (P.aiming) speed *= 0.6;
  if (P.downed) speed = 0;
  if (P.bag) speed *= 1 - bagW * 0.45 * (1 / H.mod('bagSpeedMul'));
  if (P.secondWindT > 0) speed *= 1.3;
  if (P.tased > 0) speed *= 0.2;
  P.stamina = H.clamp(P.stamina + dt * (P.sprint ? -0.12 / H.mod('staminaMul') : 0.18), 0, 1);
  const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw);
  let mx = -sy * fwd + cy * str, mz = -cy * fwd - sy * str;
  const ml = Math.hypot(mx, mz); if (ml > 0) { mx /= ml; mz /= ml; }
  const acc = P.onGround ? 14 : 3;
  P.vel.x = H.damp(P.vel.x, mx * speed, acc, dt); P.vel.z = H.damp(P.vel.z, mz * speed, acc, dt);
  if (H.wasPressed('Space') && P.onGround && !P.downed && !P.crouching) { P.vel.y = 4.6; P.onGround = false; }
  P.vel.y -= 14 * dt;
  P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt; P.pos.y += P.vel.y * dt;
  const h = P.height * (1 - P.crouch * 0.4);
  const ground = H.world.move(P.pos, P.radius, h);
  // head bump on ceilings
  if (P.pos.y < ground + 0.02 || (P.onGround && P.pos.y - ground < 0.5 && P.vel.y <= 0)) {
    if (P.vel.y < -11) H.game.damagePlayer((-P.vel.y - 11) * 8, null, 'fall');
    P.pos.y = ground; P.vel.y = 0; P.onGround = true;
  } else P.onGround = P.pos.y <= ground + 0.02;
  // footsteps
  const sp = Math.hypot(P.vel.x, P.vel.z);
  P.stepT -= dt * sp;
  if (P.stepT < 0 && P.onGround) { P.stepT = P.sprint ? 2.6 : 2.0; H.audio.step(null, P.crouching ? 0.04 : 0.12); }
  // camera
  P.eye = H.damp(P.eye, P.downed ? 0.55 : P.crouching ? 1.05 : 1.62, 12, dt);
  const cam = H.camera;
  cam.position.set(P.pos.x, P.pos.y + P.eye, P.pos.z);
  P.bobT += dt * sp * 1.9;
  const bob = P.onGround ? Math.min(1, sp / 4) : 0;
  cam.position.y += Math.abs(Math.cos(P.bobT)) * 0.04 * bob * (1 - P.ads);
  const shake = H.game.shake || 0;
  cam.rotation.order = 'YXZ';
  cam.rotation.set(P.pitch + (Math.random() - 0.5) * shake * 0.03, P.yaw + (Math.random() - 0.5) * shake * 0.03, Math.sin(P.bobT) * 0.004 * bob + (P.downed ? 0.12 : 0));
  cam.updateMatrixWorld();
  // ADS & fov
  const W = P.weapons[P.cur];
  P.aiming = H.mouse.r && !P.sprint && !P.reloading && P.meleeT <= 0 && !P.downed || (P.downed && H.mouse.r);
  P.ads = H.damp(P.ads, P.aiming ? 1 : 0, 14 / H.mod('adsMul'), dt);
  const scoped = ['acog', 'scope', 'scope_l', 'thermal'].includes(W.st.optic);
  P.scoped = scoped;
  const fov = H.settings.fov / (1 + ((scoped ? 1.3 : W.st.zoom) - 1) * P.ads) * (P.sprint ? 1.06 : 1);
  if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = H.damp(cam.fov, fov, 16, dt); cam.updateProjectionMatrix(); }
  H.game.shake = Math.max(0, shake - dt * 3);
  P.tased = Math.max(0, P.tased - dt); P.hurtT = Math.max(0, P.hurtT - dt); P.invuln = Math.max(0, P.invuln - dt);
  P.secondWindT = Math.max(0, (P.secondWindT || 0) - dt); P.overkillT = Math.max(0, P.overkillT - dt); P.flash = Math.max(0, P.flash - dt * 0.4);
  // armour regen
  P.armorT -= dt;
  if (P.armorT <= 0 && P.armor < P.armorMax && !P.downed) {
    const rate = H.mod('armorRegenMul') * (H.save.perk.deck === 'anarchist' ? 0.3 : 1);
    P.armor = H.save.perk.deck === 'anarchist' ? Math.min(P.armorMax, P.armor + P.armorMax * 0.15 * dt * rate) : P.armorMax;
  }
  if (H.mod('regen') && !P.downed) P.hp = Math.min(P.hpMax, P.hp + P.hpMax * H.mod('regen') * dt);
  if (H.mod('hostRegen') && P.hostages > 0 && !P.downed) P.hp = Math.min(P.hpMax, P.hp + P.hpMax * H.mod('hostRegen') * dt);
  // downed bleed-out
  if (P.downed) {
    P.bleed -= dt / H.mod('bleedMul');
    if (P.bleed <= 0) H.game.toCustody();
  }
};

/* ---------------- weapons ---------------- */
H.updateWeapons = function (dt) {
  const P = H.P; if (P.inCar || P.custody > 0) return;
  const W = P.weapons[P.cur], st = W.st, w = st.w;
  P.fireT -= dt; P.swapT -= dt; P.meleeCd -= dt; P.throwCd -= dt; P.pumpT = Math.max(0, (P.pumpT || 0) - dt);
  P.bloom = Math.max(0, P.bloom - dt * 4);
  // swap
  let want = -1;
  if (H.wasPressed('Digit1')) want = 0; if (H.wasPressed('Digit2')) want = 1;
  if (H.mouse.wheel) want = 1 - P.cur;
  if (H.wasPressed('KeyQ')) want = 1 - P.cur;
  if (P.downed && P.cur === 0 && H.WMAP[P.weapons[1].inst.id]) want = 1; // downed: secondary only
  if (want >= 0 && want !== P.cur && P.meleeT <= 0) {
    P.cur = want; P.reloading = false; P.swapT = 0.45 * H.mod('swapMul') * (H.WMAP[P.weapons[want].inst.id].cat === 'pistol' ? H.mod('pistolSwapMul') : 1);
    H.buildViewmodel(); H.audio.click();
    return;
  }
  // reload
  if (P.reloading) {
    P.reloadT -= dt;
    if (P.reloadT <= 0) {
      P.reloading = false;
      if (w.fire === 'p' && st.pellets > 1 && w.mag > 2) { // shell-by-shell for pumps
        const n = Math.min(1, W.reserve, st.mag - W.mag); W.mag += n; W.reserve -= n;
        if (W.mag < st.mag && W.reserve > 0 && !H.mouse.l) { P.reloading = true; P.reloadT = P.reloadDur = st.reload; }
      } else { const n = Math.min(st.mag - W.mag, W.reserve); W.mag += n; W.reserve -= n; }
    }
  }
  const wantReload = H.wasPressed('KeyR') || (W.mag === 0 && H.mouse.l && W.reserve > 0 && P.fireT <= 0);
  if (wantReload && !P.reloading && W.mag < st.mag && W.reserve > 0 && P.meleeT <= 0) {
    P.reloading = true;
    let r = st.reload * (W.mag === 0 ? H.mod('emptyReloadMul') : 1);
    if (P.aggroT > 0) r *= 0.5;
    if (w.fire === 'p' && st.pellets > 1 && w.mag > 2) r = 0.45 * H.mod('sgReloadMul');
    P.reloadT = P.reloadDur = r;
    H.audio.reload(0);
  }
  // melee
  if (H.wasPressed('KeyV') && P.meleeCd <= 0 && !P.downed) {
    P.meleeDur = P.melee.speed * H.mod('meleeSpeedMul') + 0.15; P.meleeT = P.meleeDur; P.meleeCd = P.meleeDur; P.meleeHit = false; P.reloading = false;
    H.audio.melee();
  }
  if (P.meleeT > 0) {
    P.meleeT -= dt;
    if (!P.meleeHit && P.meleeT < P.meleeDur * 0.55) { P.meleeHit = true; H.game.meleeHit(); }
    return;
  }
  // throwable / bag throw
  if (H.wasPressed('KeyG') && P.throwCd <= 0 && !P.downed) {
    if (P.bag) { H.game.throwBag(); P.throwCd = 0.5; }
    else if (P.throws > 0 && H.game.allowWeapons()) { P.throws--; P.throwCd = 0.8; H.game.throwGrenade(P.throwable); }
  }
  // deployable
  if (H.wasPressed('KeyE') && P.deployUses > 0 && !P.downed && !P.bag) { if (H.game.placeDeployable(P.deploy)) P.deployUses--; }
  if (P.swapT > 0 || P.reloading && !(w.fire === 'p' && H.mouse.l && W.mag > 0)) return;
  if (!H.game.allowWeapons()) return;
  if (P.sprint && !H.mod('sprintFire')) return;
  // firing
  const trigger = H.mouse.l;
  if (w.arch === 'bow') {
    if (trigger) { P.drawT = Math.min(1, (P.drawT || 0) + dt * 1.4); return; }
    if (P.drawT > 0.15 && W.mag > 0 && P.fireT <= 0) { H.game.fire(W, P.drawT); W.mag--; P.fireT = 0.6; if (W.reserve > 0) { P.reloading = true; P.reloadT = P.reloadDur = st.reload; } }
    P.drawT = 0; return;
  }
  if (P.reloading && w.fire === 'p') { if (trigger && W.mag > 0) P.reloading = false; else return; }
  const semi = w.fire !== 'a';
  if (trigger && P.fireT <= 0 && W.mag > 0 && (!semi || H.wasPressed('Mouse0') || w.fire === 'b' && P.burstLeft > 0)) {
    if (w.fire === 'b' && H.wasPressed('Mouse0')) P.burstLeft = 3;
    const rofMul = (P.aggroAceT > 0 ? 1.5 : 1);
    P.fireT = 1 / (st.rof * rofMul);
    if (w.fire === 'b') { P.burstLeft--; if (P.burstLeft <= 0) P.fireT = 0.25; }
    if (w.fire === 'p') P.pumpT = 0.35;
    const free = P.bulletstormT > 0;
    if (!free && !(P.swanT > 0 && H.mod('swanAce'))) W.mag--;
    H.game.fire(W, 1);
    // recoil
    const kick = st.kick * (1 - P.ads * 0.4) * (P.crouching ? 0.8 : 1);
    P.pitch += kick * 0.008; P.recoilAcc = (P.recoilAcc || 0) + kick * 0.008; P.lastShot = H.t; P.yaw += (Math.random() - 0.5) * kick * 0.006;
    P.bloom = Math.min(3, P.bloom + kick * 0.35);
    H.vm.kick = Math.min(1.5, H.vm.kick + 0.6 + kick * 0.15);
    if (H.vm.guns.length > 1) { const G = H.vm.guns[(P.akSide = 1 - (P.akSide || 0))]; G.kick = 1; }
    P.flashT = st.silent ? 0 : 0.05;
  }
};
