'use strict';
// Game: save data, the main loop, interactions, shooting and damage,
// explosions, deployables, vehicles, heist completion, pursuit payout,
// card drops, achievements and the day cycle.

/* ---------------- save ---------------- */
H.defaultSave = function () {
  return {
    v: 2, money: 25000, offshore: 0, xp: 0, level: 1, infamy: 0, day: 1, heatPoints: 0, rep: 0,
    skills: {}, perk: { deck: 'crew', cards: 1, points: 0 },
    weapons: [
      { uid: 1, id: 'bastion_m4', mods: { sight: 'm1' }, paint: 0 },
      { uid: 2, id: 'chimano_88', mods: {}, paint: 0 },
      { uid: 3, id: 'reinfeld_880', mods: {}, paint: 0 },
      { uid: 4, id: 'compact_5', mods: { muzzle: 'm13' }, paint: 0 },
    ],
    nextUid: 10, unlockedMods: ['m1', 'm13'],
    loadout: { primary: 1, secondary: 2, melee: 'combat_knife', throwable: 'frag', deployable: 'ammo', armor: 'lbv', mask: 0 },
    masks: [{ shape: 'clown', mat: 0, pat: 0, col: 0 }, { shape: 'skull', mat: 12, pat: 0, col: 9 }],
    maskParts: { shapes: ['clown', 'skull', 'hockey', 'balaclava', 'bear', 'tiki'], mats: [0, 1, 2, 6, 12], pats: [0, 1, 2, 3], cols: [0, 1, 2, 9] },
    owned: { melee: ['fists', 'combat_knife'], throwables: ['frag'], deployables: ['ammo', 'doctor'], armors: ['suit', 'lbv'] },
    crewMasks: [], crewName: 'The Payday Gang',
    cars: [], stats: { heists: 0, stealth: 0, loud: 0, kills: 0, civKills: 0, bags: 0, earned: 0, fails: 0, busted: 0, chases: 0 },
    completed: {}, achievements: [], lastHeist: null, news: null, settingsSeen: false,
  };
};
H.loadSave = function () {
  let s = null;
  try { s = JSON.parse(localStorage.getItem('heist_save') || 'null'); } catch (e) { s = null; }
  const d = H.defaultSave();
  if (!s || s.v !== d.v) s = d;
  for (const k in d) if (s[k] === undefined) s[k] = d[k];
  H.save = s;
  if (!s.news || s.news.day !== s.day) s.news = H.makeNewspaper(s.day);
};
H.persist = function () { try { localStorage.setItem('heist_save', JSON.stringify(H.save)); } catch (e) { /* storage unavailable */ } };

/* ---------------- achievements ---------------- */
H.ACHIEVEMENTS = [
  ['first_score', 'First Score', 'Complete your first heist.', s => s.stats.heists >= 1],
  ['ghost', 'Ghost', 'Complete 5 heists in stealth.', s => s.stats.stealth >= 5],
  ['loudmouth', 'Loud and Proud', 'Complete 5 heists loud.', s => s.stats.loud >= 5],
  ['millionaire', 'Millionaire', 'Earn $1,000,000 in total.', s => s.stats.earned >= 1e6],
  ['bagman', 'Bag Man', 'Secure 50 bags of loot.', s => s.stats.bags >= 50],
  ['wanted', 'Most Wanted', 'Reach danger level 5.', s => H.heat.danger() >= 5],
  ['shaker', 'Shake It Off', 'Escape 10 police pursuits.', s => s.stats.chases >= 10],
  ['collector', 'Gun Nut', 'Own 15 weapons.', s => s.weapons.length >= 15],
  ['masked', 'Many Faces', 'Own 10 masks.', s => s.masks.length >= 10],
  ['reserve', 'The Big One', 'Rob the Federal Reserve.', s => !!s.completed.reserve],
  ['dw', 'Death Wish', 'Complete a heist on Death Wish or harder.', s => Object.values(s.completed).some(v => v >= 5)],
  ['infamous', 'Infamous', 'Reach infamy rank 1.', s => s.infamy >= 1],
  ['level50', 'Career Criminal', 'Reach level 50.', s => s.level >= 50],
  ['clean', 'Professional', 'Complete a heist without killing a civilian.', s => s.lastHeist && s.lastHeist.civKills === 0],
  ['killer', 'Body Count', 'Kill 1,000 enemies.', s => s.stats.kills >= 1000],
  ['all', 'Grand Tour', 'Complete every heist in the city.', s => H.HEISTS.every(h => s.completed[h.id] !== undefined)],
];
H.checkAchievements = function () {
  const s = H.save;
  for (const [id, name, desc, fn] of H.ACHIEVEMENTS) if (!s.achievements.includes(id) && fn(s)) { s.achievements.push(id); H.ui.toast('Achievement unlocked', name + ' — ' + desc); H.audio.cash(); }
};

/* ---------------- game ---------------- */
H.game = {
  state: 'title', interacts: [], projectiles: [], bags: [], deployed: [], sentries: [], shake: 0, alarmSoon: 0, ecmT: 0, wantedDiff: 0,
  addInteract(o) { this.interacts.push(o); return o; },
  removeInteract(o) { const i = this.interacts.indexOf(o); if (i >= 0) this.interacts.splice(i, 1); },
  allowWeapons() { const P = H.P; if (P.inCar) return false; if (H.run && !H.run.loud && !P.masked) return false; if (H.ui.menuOpen) return false; return true; },
  ecmActive() { return this.ecmT > 0; },
  inSafehouse() { const s = H.city.safePos; return !!s && !H.P.inCar && (H.ui.safehouseOpen || (H.P.pos.distanceTo(s) < 3.5)); },

  /* ---------- lifecycle ---------- */
  init() {
    H.loadSave(); H.calcMods();
    H.makePlayer();
    const s = H.city.safePos;
    H.P.pos.set(s.x, 0.2, s.z + 2); H.P.yaw = Math.PI;
    H.equipLoadout();
    H.traffic.parkCars();
    H.spawnPeds(70); H.spawnBeach(16);
    H.placeContacts(); H.spawnGangs();
    // plan markers at every heist location
    for (const h of H.HEISTS) {
      const site = H.sites[h.id], pt = site.spec.points.plan;
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 24), new THREE.MeshBasicMaterial({ color: 0x40ff90, transparent: true, opacity: 0.6 }));
      beacon.position.set(pt.x, 0.2, pt.z); H.scene.add(beacon); site.beacon = beacon;
      this.addInteract({ pos: new THREE.Vector3(pt.x, 1, pt.z), r: 2.2, label: 'Plan the job: ' + h.name, time: 0, world: true, cond: () => !H.run, done: () => H.ui.openPlanner(h) });
    }
    // safehouse
    this.addInteract({ pos: new THREE.Vector3(s.x, 1.2, s.z - 1.5), r: 3, label: () => H.P.bag ? 'Stash ' + H.LOOT[H.P.bag].name.toLowerCase() + ' (' + H.money(H.LOOT[H.P.bag].value * 0.6) + ')' : 'Enter safehouse', time: 0, world: true, cond: () => !H.run, done: () => { if (H.P.bag) { this.fenceBag(0.6); } else H.ui.openSafehouse(); } });
    this.state = 'city';
    H.music.set('city');
  },
  cleanupRun() {
    const run = H.run; if (!run) return;
    for (const n of H.npcs.slice()) if (n.run) n.remove();
    for (const c of run.vanCars) c.remove();
    H.scene.remove(run.group);
    for (const d of run.doors) if (!d.open) { H.world.remove(d.box); H.nav.stamp(d.box, 0); for (const b of H.world.query(d.x - 2, d.z - 2, d.x + 2, d.z + 2)) if (!b.nonav && !b.door) H.nav.stamp(b, 1); }
    for (const b of H.world.boxes) if ((b.runTemp || b.glass || b.destroy || b.cam) && !b.dead) H.world.remove(b);
    this.interacts = this.interacts.filter(i => i.world);
    for (const b of this.bags) H.scene.remove(b.m); this.bags = [];
    for (const d of this.deployed) H.scene.remove(d.m); this.deployed = []; this.sentries = [];
    for (const p of this.projectiles) H.scene.remove(p.m); this.projectiles = [];
    H.audio.drill(false); H.audio.stopLoop('alarm'); H.audio.siren(false);
    H.ui.banner('');
    H.run = null;
  },

  /* ---------- interactions ---------- */
  pickInteract() {
    const P = H.P, cam = H.camera; if (P.inCar || P.custody > 0) return null;
    const f = cam.getWorldDirection(H._v1), eye = cam.position;
    let best = null, bs = -1;
    for (const o of this.interacts) {
      if (o.cond && !o.cond()) { if (!(o.showLocked)) continue; }
      const d = eye.distanceTo(o.pos); if (d > o.r) continue;
      const to = H._v2.subVectors(o.pos, eye).normalize(); const dot = to.dot(f);
      const score = dot - d * 0.05;
      if ((dot > 0.75 || d < 1.0) && score > bs) { bs = score; best = o; }
    }
    // NPC interactions
    for (const n of H.npcs) {
      const d = n.pos.distanceTo(P.pos); if (d > 2.4) continue;
      const to = H._v2.set(n.pos.x - eye.x, (n.dead ? 0.3 : 1.0) + n.pos.y - eye.y, n.pos.z - eye.z).normalize(); const dot = to.dot(f);
      if (dot < 0.7) continue;
      let ia = null;
      const run = H.run;
      if (n.kind === 'bot' && n.downed) ia = { label: 'Revive ' + n.name, time: 2.5 * H.mod('reviveSpeedMul'), done: () => this.reviveBot(n) };
      else if (n.dead && run && !run.loud && n.pager && !n.pager.answered) ia = { label: 'Answer pager', time: 4 * H.mod('pagerSpeedMul') * H.mod('pagerSpeedMul2', 1), done: () => { n.pager.answered = true; run.pagersUsed++; if (run.pagersUsed > P.pagers) run.raiseAlarm('The operator didn\'t buy it'); else H.ui.toast('Pager answered', (P.pagers - run.pagersUsed) + ' left.'); } };
      else if (n.dead && run && !run.loud && !n.bagged && n.run && P.bodyBags > 0 && !P.bag) ia = { label: 'Bag body (' + P.bodyBags + ' bags)', time: 2 * H.mod('bagCorpseMul'), done: () => { n.bagged = true; P.bodyBags--; P.bag = 'body'; n.remove(); } };
      else if (n.kind === 'civ' && n.state === 'down' && P.ties > 0 && P.masked) ia = { label: 'Tie up (' + P.ties + ' ties)', time: 1.6 * H.mod('tieSpeedMul'), done: () => { n.state = 'tied'; P.ties--; if (run) run.hostages++; P.hostages++; if (n.keycard) { n.keycard = false; this.dropKeycard(n.pos); } } };
      else if ((n.kind === 'cop' || n.kind === 'guard') && n.state === 'kneel' && !n.dead) ia = H.mod('joker') && !this.converted ? { label: 'Convert to your side', time: 2, done: () => this.convert(n) } : { label: 'Cuff', time: 1.5, done: () => { n.state = 'tied'; if (run) run.hostages++; P.hostages++; } };
      if (ia) { const score = dot + 1; if (score > bs) { bs = score; best = Object.assign({ pos: n.pos, r: 2.4, npc: n }, ia); } }
    }
    // cars
    if (!H.run || H.run.done) for (const c of H.cars) {
      if (c.static || c.dead) continue;
      const d = c.pos.distanceTo(P.pos); if (d > 3.6) continue;
      const score = 0.2 - d * 0.05; if (!best || score > bs - 1) { if (!best) { best = { pos: c.pos, r: 3.6, label: c.driver === 'ai' ? 'Steal the ' + c.T.name : 'Enter ' + c.T.name, time: 0, done: () => this.enterCar(c) }; bs = score; } }
    }
    return best;
  },
  updateInteract(dt) {
    const P = H.P;
    const it = this.pickInteract();
    this.curIa = it;
    const holding = H.keys.KeyF;
    if (it && it.cond && !it.cond()) { this.iaProg = 0; return; }
    if (!it) {
      if (H.wasPressed('KeyF')) this.shout();
      this.iaProg = 0; this.iaTarget = null; return;
    }
    const time = typeof it.time === 'function' ? it.time() : it.time;
    if (this.iaTarget !== it.label + (it.npc ? it.npc.id : '')) { this.iaTarget = it.label + (it.npc ? it.npc.id : ''); this.iaProg = 0; }
    if (!time) { if (H.wasPressed('KeyF')) { it.done(); this.iaProg = 0; } return; }
    if (holding && !P.reloading) {
      this.iaProg += dt * (H.mod('interactMul') || 1) / time;
      if (this.iaProg >= 1) { this.iaProg = 0; it.done(); this.iaTarget = null; }
    } else this.iaProg = 0;
  },
  shout() {
    const P = H.P, cam = H.camera, f = cam.getWorldDirection(H._v1);
    H.audio.shout(); this.shoutT = 0.4;
    let any = false;
    for (const n of H.npcs) {
      if (n.dead) continue;
      const d = n.pos.distanceTo(P.pos); if (d > 14) continue;
      const to = H._v2.set(n.pos.x - cam.position.x, 1 + n.pos.y - cam.position.y, n.pos.z - cam.position.z).normalize();
      const aim = to.dot(f);
      if (n.kind === 'civ' && P.masked && (aim > 0.85 || d < 5) && ['idle', 'flee', 'phone', 'cower', 'down', 'alerted'].includes(n.state)) { n.state = 'down'; n.downT = 14; any = true; }
      if (n.kind === 'ped' && aim > 0.8) { n.state = 'hands'; n.handsT = 4; any = true; }
      if ((n.kind === 'cop' || n.kind === 'guard') && H.run && H.run.loud && aim > 0.9 && !n.special && n.hp < n.hpMax * 0.6 && Math.random() < 0.45) { n.state = 'surrender'; n.surT = 1.2; n.vel.set(0, 0, 0); any = true; H.ui.toast('Surrender', n.def.name + ' surrendered. Cuff him.'); }
      if (n.kind === 'bot' && n.downed && d < 9 && H.mod('inspireAce')) { this.reviveBot(n); any = true; }
    }
    return any;
  },
  fenceBag(cut) {
    const P = H.P; if (!P.bag || P.bag === 'body') { P.bag = null; return; }
    const v = Math.round(H.LOOT[P.bag].value * cut); H.save.money += v; H.save.stats.earned += v; P.bag = null; H.audio.cash(); H.ui.floatMoney(v, 'Fenced'); H.persist();
  },
  dropKeycard(pos) {
    const run = H.run; if (!run) return;
    const m = new THREE.Mesh(H.geo.box(0.09, 0.01, 0.06), H.mat(0xe0e0f0, 0.3, 0, { emissive: 0x202060 })); m.position.set(pos.x, 0.25, pos.z); run.group.add(m);
    const ia = this.addInteract({ pos: m.position.clone(), r: 2, label: 'Take keycard', time: 0, done: () => { run.keycards++; m.visible = false; this.removeInteract(ia); H.audio.ui(); H.ui.toast('Keycard', 'You have ' + run.keycards + ' keycard(s).'); } });
  },
  convert(n) {
    n.kind = 'bot'; n.team = 'crew'; n.converted = true; n.state = 'idle'; n.hidden = false; n.slot = 3; n.name = 'Converted ' + n.def.name;
    this.converted = n; H.ui.toast('Converted', n.def.name + ' now fights for you.');
  },

  /* ---------- shooting ---------- */
  fire(W, power = 1) {
    const P = H.P, st = W.st, w = st.w, cam = H.camera;
    const origin = cam.position.clone(), fwd = cam.getWorldDirection(new THREE.Vector3());
    const mz = H.vm.guns[0] && H.vm.guns[0].g.localToWorld(H.vm.guns[0].g.userData.muzzle.clone());
    // muzzle position approximated in world space in front of the camera
    const muzzle = origin.clone().addScaledVector(fwd, 0.6).add(new THREE.Vector3(0, -0.12, 0));
    H.audio.gun(w, null, st.silent);
    if (!st.silent) { this.noise(P.pos, w.cat === 'sniper' ? 60 : 42); if (H.run && !H.run.loud) H.run.raiseAlarm('Gunshots were heard'); this.publicGunfire(P.pos); }
    if (w.proj === 'flame') return this.flame(origin, fwd, st);
    if (w.proj === 'saw') return this.saw(origin, fwd, st);
    if (w.proj) return this.launch(w.proj, muzzle, fwd, st, power);
    const spreadDeg = H.lerp(st.spreadHip, st.spreadAds, P.ads) * (1 + P.bloom * 0.3) * (Math.hypot(P.vel.x, P.vel.z) > 1 ? 1.4 * H.mod('moveAccMul') : 1) * (P.crouching ? 0.8 : 1);
    const spread = spreadDeg * Math.PI / 180;
    for (let i = 0; i < st.pellets; i++) {
      const dir = fwd.clone();
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * Math.tan(spread);
      const up = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3().crossVectors(dir, up).normalize(); up.crossVectors(right, dir).normalize();
      dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      this.hitscan(origin, dir, st, st.dmg / (st.pellets > 1 ? 1 : 1), muzzle, i === 0);
    }
  },
  hitscan(o, dir, st, dmg, muzzle, tracer, fromNpc) {
    const range = 220;
    let wh = H.world.ray(o, dir, range);
    let maxT = wh ? wh.t : range;
    // npc hits
    let hits = [];
    for (const n of H.npcs) {
      if (n.dead || (n.kind === 'bot' && !fromNpc)) continue;
      if (n.team === 'crew' && !fromNpc) continue;
      if (n.immortal) continue;
      const c = H._v2.set(n.pos.x, n.pos.y + 1, n.pos.z);
      const tc = H._v3.subVectors(c, o).dot(dir); if (tc < 0 || tc > maxT + 1) continue;
      const px = o.x + dir.x * tc - c.x, py = o.y + dir.y * tc - c.y, pz = o.z + dir.z * tc - c.z;
      if (px * px + py * py + pz * pz > 1.5 * n.h.bulk) continue;
      n.h.root.updateMatrixWorld(true);
      const spheres = [['head', n.headPos(new THREE.Vector3()), 0.15], ['chest', n.chestPos(new THREE.Vector3()).add(new THREE.Vector3(0, 0.15, 0)), 0.3 * n.h.bulk], ['hips', n.h.J.hips.getWorldPosition(new THREE.Vector3()), 0.26 * n.h.bulk], ['legL', n.h.J.knL.getWorldPosition(new THREE.Vector3()), 0.14], ['legR', n.h.J.knR.getWorldPosition(new THREE.Vector3()), 0.14]];
      let bt = Infinity, part = null;
      for (const [nm, p, r] of spheres) { const t = raySphere(o, dir, p, r); if (t !== null && t < bt) { bt = t; part = nm; } }
      if (part && bt < maxT) hits.push({ n, t: bt, part });
    }
    hits.sort((a, b) => a.t - b.t);
    if (!st.pierce) hits = hits.slice(0, 1);
    let endT = maxT;
    for (const h of hits) {
      const n = h.n, hp = o.clone().addScaledVector(dir, h.t);
      // riot shields stop frontal shots
      if (n.special === 'shield' && !st.pierce) {
        const fx = Math.sin(n.yaw), fz = Math.cos(n.yaw);
        if (fx * -dir.x + fz * -dir.z > 0.35 && h.part !== 'head') { H.fx.sparks(hp, 6); H.audio.tone(1800, 0.05, 0.2, 'square', hp); endT = h.t; break; }
      }
      let d = dmg * falloff(h.t, st.range);
      const head = h.part === 'head';
      if (head) d *= (st.cat === 'sniper' ? 3 : 2) * (st.silent ? H.mod('proHs') : 1);
      else if (st.w.fire === 'a' && H.mod('bodyExp')) d *= 1 + H.mod('bodyExp');
      if (h.part.startsWith('leg')) d *= 0.75;
      d *= this.dmgMods(st, n);
      const res = n.damage(d, 'player', { head, cat: st.cat });
      if (res) { H.fx.blood(hp, head ? 8 : 4); if (res === 'armor') { H.fx.sparks(hp, 4, 0xaaaaaa); H.audio.tone(900, 0.04, 0.15, 'square'); } else { head ? H.audio.head() : H.audio.hit(); H.ui.hitmark(res === 'kill', head); } }
      if (res === 'kill' && head && st.w.fire !== 'a') { if (H.mod('aggroReload')) H.P.aggroT = 4; if (H.mod('aggroAce')) H.P.aggroAceT = 4; }
      if (st.explode) this.explode(hp, 2.5, 300, 'he');
      if (st.burn) H.fx.fire(hp.clone().setY(0.1), 3, 1);
      endT = h.t;
      if (!st.pierce) break;
    }
    if (wh && endT >= wh.t - 0.01) {
      const hp = o.clone().addScaledVector(dir, wh.t), b = wh.box;
      if (b.glassObj) this.breakGlass(b.glassObj);
      else if (b.camObj) this.breakCam(b.camObj);
      else if (b.destroyObj) this.hitProp(b.destroyObj, dmg);
      else { H.fx.decal(hp, wh.n); H.fx.sparks(hp, 3, 0xffd080, 3); if (Math.random() < 0.3) H.fx.smoke(hp, 0.3, 0.6, 0xaaaaaa); }
      if (st.explode) this.explode(hp, 2.5, 300, 'he');
      if (st.burn) H.fx.fire(hp.clone().setY(0.1), 3, 1);
    }
    // cars
    for (const c of H.cars) { if (c.dead) continue; const t = raySphere(o, dir, H._v2.set(c.pos.x, 1, c.pos.z), 1.6); if (t !== null && t < endT) { c.hp -= dmg * 0.6; H.fx.sparks(o.clone().addScaledVector(dir, t), 3); if (c.hp <= 0 && !c.dead) this.carExplode(c); if (c.police && !H.run) H.heat.crime(2, H.P.pos); break; } }
    if (tracer && Math.random() < 0.5) H.fx.tracer(muzzle, o.clone().addScaledVector(dir, Math.min(endT, 120)));
  },
  dmgMods(st, n) {
    const P = H.P; let m = 1;
    if (P.overkillT > 0 && (st.cat === 'shotgun' || H.mod('overkillAll'))) m *= 1 + H.mod('overkill');
    if (P.ads > 0.8) m *= H.mod('adsDmgMul');
    if (n && n.marked) m *= H.mod('markedDmgMul');
    if (P.hp < P.hpMax * 0.5 && H.mod('berserkAce')) m *= 1 + (1 - P.hp / P.hpMax);
    if (H.mod('underdog') && H.npcs.filter(x => !x.dead && x.team === 'law' && x.pos.distanceTo(P.pos) < 18).length >= 3) m *= 1 + H.mod('underdog');
    if (P.triggerT > 0) m *= 1 + Math.min(1.2, P.triggerStacks * 0.4);
    return m;
  },
  flame(o, dir, st) {
    for (let i = 0; i < 2; i++) { const p = o.clone().addScaledVector(dir, 1 + i * 2).add(new THREE.Vector3(0, -0.3, 0)); H.fx.flash(p, 1.2 + i, 0.12); }
    for (const n of H.npcs) { if (n.dead || n.team === 'crew') continue; const to = H._v2.subVectors(n.pos, o).setY(0); const d = to.length(); if (d > 9) continue; to.normalize(); if (to.dot(H._v3.set(dir.x, 0, dir.z).normalize()) > 0.85) { n.damage(st.dmg * 1.5, 'player', { fire: true }); n.burnT = 3; } }
  },
  saw(o, dir, st) {
    const wh = H.world.ray(o, dir, 2.2);
    for (const n of H.npcs) { if (n.dead || n.team === 'crew') continue; if (n.pos.distanceTo(H.P.pos) < 2.4 && H._v2.subVectors(n.pos, H.P.pos).normalize().dot(H._v3.set(dir.x, 0, dir.z).normalize()) > 0.7) { n.damage(st.dmg * H.mod('sawDmgMul') * 2, 'player', {}); H.fx.blood(n.chestPos(H._v2), 4); } }
    if (wh) H.fx.sparks(o.clone().addScaledVector(dir, wh.t), 4, 0xffd080, 4);
  },
  launch(kind, pos, dir, st, power) {
    const speed = kind === 'gl' ? 38 : kind === 'rocket' ? 55 : kind === 'arrow' ? 40 + power * 45 : 60;
    let m;
    if (kind === 'rocket') { m = new THREE.Group(); const b = new THREE.Mesh(H.geo.cyl(0.04, 0.04, 0.6, 8), H.mat(0x4a5a3a)); b.rotation.x = Math.PI / 2; m.add(b); }
    else if (kind === 'gl') m = new THREE.Mesh(H.geo.sph(0.05, 8, 6), H.mat(0x3a4a2a));
    else { m = new THREE.Mesh(H.geo.cyl(0.006, 0.006, 0.7, 4), H.mat(0x8a6a4a)); m.rotation.x = Math.PI / 2; }
    const g = new THREE.Group(); g.add(m); g.position.copy(pos); H.scene.add(g);
    this.projectiles.push({ m: g, vel: dir.clone().multiplyScalar(speed), kind, grav: kind === 'rocket' ? 0 : kind === 'gl' ? 6 : 4, dmg: st.dmg * (kind === 'arrow' ? 0.4 + power * 0.6 : 1), st, life: 8, explode: kind === 'gl' || kind === 'rocket' || st.explode, r: kind === 'rocket' ? 6 : 5, burn: st.burn });
  },
  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]; p.life -= dt;
      const pos = p.m.position; const step = p.vel.clone().multiplyScalar(dt); const len = step.length();
      p.vel.y -= p.grav * dt;
      if (p.kind === 'rocket' && Math.random() < 0.8) H.fx.smoke(pos.clone(), 0.5, 0.8, 0xcccccc, new THREE.Vector3());
      p.m.lookAt(H._v1.copy(pos).add(p.vel));
      let hit = false, hitPos = null, hitN = null;
      const dir = step.clone().normalize();
      const wh = H.world.ray(pos, dir, len);
      if (wh) { hit = true; hitPos = pos.clone().addScaledVector(dir, wh.t); if (wh.box.glassObj) this.breakGlass(wh.box.glassObj); }
      if (!p.thrown) for (const n of H.npcs) { if (n.dead || n.team === 'crew' || n.team === 'civ' && p.owner === 'npc') continue; if (H._v2.set(n.pos.x, n.pos.y + 1, n.pos.z).distanceTo(pos) < 0.7) { hit = true; hitN = n; hitPos = pos.clone(); break; } }
      if (pos.y < 0.05) { hit = true; hitPos = pos.clone().setY(0.1); }
      if (p.fuse !== undefined) { // grenades bounce until the fuse runs out
        p.fuse -= dt;
        if (hit && !hitN) { p.vel.multiplyScalar(0.35); p.vel.y = Math.abs(p.vel.y) * 0.5; if (wh) p.vel.reflect(wh.n).multiplyScalar(0.5); pos.y = Math.max(pos.y, 0.1); hit = false; }
        else pos.add(step);
        if (p.kind === 'molotov' && (hit || pos.y <= 0.12)) { H.fx.fire(pos.clone().setY(0.1), 8, p.r * H.mod('fireTrapAce', 1)); H.audio.glass(pos); this.removeProj(i); continue; }
        if (p.fuse <= 0) { this.detonate(p, pos.clone()); this.removeProj(i); }
        continue;
      }
      if (!hit) { pos.add(step); if (p.life <= 0) this.removeProj(i); continue; }
      if (p.explode) this.explode(hitPos, p.r, p.dmg, p.kind);
      else if (hitN) { const head = hitPos.y - hitN.pos.y > 1.45; const r = hitN.damage(p.dmg * (head ? 2 : 1) * this.dmgMods(p.st, hitN), 'player', { head }); if (r) { H.ui.hitmark(r === 'kill', head); H.audio.hit(); } if (p.burn) hitN.burnT = 6; }
      if (p.burn) H.fx.fire(hitPos.clone().setY(0.1), 4, 1.5);
      if (!p.explode && (p.kind === 'arrow' || p.kind === 'bolt') && !hitN) { // retrievable arrow
        const m = p.m; m.position.copy(hitPos); this.projectiles.splice(i, 1);
        const ia = this.addInteract({ pos: hitPos.clone(), r: 1.8, label: 'Pick up ' + p.kind, time: 0, done: () => { const W = H.P.weapons.find(w => w.st.w.proj === p.kind); if (W) W.reserve++; H.scene.remove(m); this.removeInteract(ia); } });
        continue;
      }
      this.removeProj(i);
    }
  },
  removeProj(i) { H.scene.remove(this.projectiles[i].m); this.projectiles.splice(i, 1); },
  throwGrenade(t) {
    const cam = H.camera, dir = cam.getWorldDirection(new THREE.Vector3());
    let m;
    if (t.kind === 'knife') { m = new THREE.Mesh(H.geo.box(0.02, 0.02, 0.25), H.mat(0xc0c0c0, 0.2, 1)); }
    else if (t.id === 'molotov') { m = new THREE.Mesh(H.geo.cyl(0.035, 0.04, 0.22, 8), H.mat(0x3a7a2a, 0.1, 0.1, { transparent: true, opacity: 0.8 })); }
    else if (t.id === 'dynamite') { m = new THREE.Mesh(H.geo.cyl(0.025, 0.025, 0.2, 8), H.mat(0xc02020)); }
    else { m = new THREE.Mesh(H.geo.sph(0.06, 10, 8), H.mat(t.kind === 'stun' ? 0x3a5a8a : 0x3a4a2a, 0.6, 0.3)); }
    const g = new THREE.Group(); g.add(m); g.position.copy(cam.position).addScaledVector(dir, 0.5); H.scene.add(g);
    const p = { m: g, vel: dir.multiplyScalar(t.kind === 'knife' ? 30 : 16 * H.mod('throwMul')).add(new THREE.Vector3(0, t.kind === 'knife' ? 0.5 : 3, 0)), kind: t.id, grav: 12, life: 10, r: t.radius, dmg: t.dmg, st: H.P.weapons[0].st, thrownT: t };
    if (t.kind === 'knife') { p.grav = 4; } else { p.fuse = t.id === 'molotov' ? 99 : t.fuse; p.kind = t.id; }
    this.projectiles.push(p);
    H.audio.noise(0.15, 600, 1, 0.3);
  },
  detonate(p, pos) {
    const t = p.thrownT;
    if (!t) return this.explode(pos, p.r, p.dmg, p.kind);
    if (t.kind === 'stun') { H.fx.flash(pos, 6, 0.2); H.audio.boom(pos, 0.5); for (const n of H.npcs) if (!n.dead && n.team !== 'crew' && n.pos.distanceTo(pos) < t.radius) { n.staggerT = 4; if (n.kind === 'civ') { n.state = 'down'; n.downT = 20; } } return; }
    if (t.kind === 'cluster') { this.explode(pos, t.radius, t.dmg, 'frag'); for (let i = 0; i < 3; i++) { const q = pos.clone().add(new THREE.Vector3(H.rand(-3, 3), 0, H.rand(-3, 3))); setTimeout(() => this.explode(q, 3, 500, 'frag'), 400 + i * 200); } return; }
    this.explode(pos, t.radius, t.dmg, t.kind);
  },
  explode(pos, r, dmg, src) {
    H.fx.explosion(pos, r); H.audio.boom(pos, r / 5);
    const d0 = H.camera.position.distanceTo(pos); this.shake = Math.max(this.shake, H.clamp(2 - d0 / 15, 0, 2));
    for (const n of H.npcs) { if (n.dead) continue; const d = n.pos.distanceTo(pos); if (d < r * 1.5) { const f = 1 - d / (r * 1.5); const res = n.damage(dmg * f * (n.team === 'crew' ? 0.1 : 1), src === 'npc' ? 'npc' : 'player', { explosive: true }); if (res && n.team !== 'crew' && src !== 'npc') H.ui.hitmark(res === 'kill', false); } }
    const pd = H.P.pos.distanceTo(pos);
    if (pd < r * 1.3) this.damagePlayer(dmg * (1 - pd / (r * 1.3)) * (src === 'npc' ? 1 : 0.15), pos, 'explosion');
    for (const c of H.cars) if (!c.dead && c.pos.distanceTo(pos) < r * 1.5) { c.hp -= dmg * 0.8; if (c.hp <= 0) this.carExplode(c); }
    const run = H.run;
    if (run) { for (const g of run.glass) if (!g.broken && g.m.position.distanceTo(pos) < r * 2) this.breakGlass(g); for (const o of run.destroy) if (!o.dead && o.m.position.distanceTo(pos) < r * 1.5) this.hitProp(o, 999); for (const c of run.cams) if (!c.dead && c.g.position.distanceTo(pos) < r) this.breakCam(c); if (!run.loud) run.raiseAlarm('An explosion was heard'); }
    this.noise(pos, 80); this.publicGunfire(pos);
  },
  carExplode(c) {
    if (c.dead) return; c.dead = true; c.speed = 0;
    if (c.driver === 'player') this.exitCar();
    if (c.driver === 'ai' && c.police) H.heat.onCopKilled();
    c.driver = null;
    c.g.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material = H.mat(0x1a1a1a, 0.95); } });
    this.explode(c.pos.clone().setY(1), 5, 900, 'car');
    H.fx.fire(c.pos.clone(), 15, 1.5);
  },
  fireDamage(pos, r, dt) {
    for (const n of H.npcs) if (!n.dead && n.pos.distanceTo(pos) < r) n.damage(40 * dt * (n.team === 'crew' ? 0.2 : 1), 'player', { fire: true });
    if (H.P.pos.distanceTo(pos) < r * 0.8) this.damagePlayer(15 * dt, pos, 'fire');
  },
  breakGlass(g) { if (g.broken) return; g.broken = true; g.m.visible = false; H.world.remove(g.b); H.audio.glass(g.m.position); for (let i = 0; i < 12; i++) H.fx.sparks(g.m.position.clone().add(new THREE.Vector3(H.rand(-1, 1), H.rand(-1, 1), 0)), 1, 0xc0f0ff, 3); if (H.run) { H.run.destroyed += g.value || 0; this.noise(g.m.position, 25); } },
  breakCam(c) { if (c.dead) return; c.dead = true; c.head.visible = false; H.fx.sparks(c.g.position, 10); H.world.remove(c.b); },
  hitProp(o, dmg) { if (o.dead) return; o.hp -= dmg; H.fx.sparks(o.m.position, 4, 0xffffff); if (o.hp <= 0) { o.dead = true; o.m.visible = false; H.world.remove(o.b); H.run.destroyed += o.value; H.fx.smoke(o.m.position, 1, 1.5); H.ui.floatMoney(o.value); } },
  // gunfire draws guards and scares civilians
  noise(pos, r) {
    for (const n of H.npcs) {
      if (n.dead || n.pos.distanceTo(pos) > r) continue;
      if (n.kind === 'ped' && n.state !== 'flee' && n.state !== 'cower') { n.state = 'flee'; n.fleeT = H.rand(5, 9); n.danger = pos.clone(); }
      if (n.kind === 'civ' && (n.state === 'idle')) { n.state = H.run && H.run.loud ? 'cower' : 'flee'; n.fleeT = 4; }
    }
  },
  publicGunfire(pos) {
    if (H.run && !H.run.done) return;
    // a cop who hears it comes running; otherwise someone calls it in
    let copNear = false; for (const n of H.npcs) if (!n.dead && n.team === 'law' && n.pos.distanceTo(pos) < 70) { copNear = true; break; }
    if (copNear) H.heat.crime(2, pos);
    else if (!this.callInT) this.callInT = 15;
  },

  /* ---------- NPC shooting at the crew ---------- */
  npcShoot(n, tgt, dmg, acc) {
    if (n.dead || !tgt) return;
    const P = H.P;
    const mp = n.h.J.gun ? n.h.J.gun.localToWorld(H._v1.set(0, 0.04, -0.4)) : n.headPos(H._v1);
    const from = mp.clone();
    const tp = tgt.eye.clone(); tp.y -= 0.25;
    const d = from.distanceTo(tp);
    // accuracy falls with distance and target movement; crouching helps
    let chance = acc * H.clamp(1.2 - d / 60, 0.25, 1);
    if (tgt.isPlayer) { const sp = Math.hypot(P.vel.x, P.vel.z); chance *= sp > 3 ? 0.6 : 1; if (P.crouching) chance *= 0.85; if (P.downed) chance *= 0.6; }
    const hit = Math.random() < chance;
    const end = hit ? tp : tp.clone().add(new THREE.Vector3(H.rand(-1.5, 1.5), H.rand(-0.8, 1.2), H.rand(-1.5, 1.5)));
    const dir = end.clone().sub(from).normalize();
    // walls block
    const wh = H.world.ray(from, dir, from.distanceTo(end), false);
    H.fx.flash(from, 0.35); H.audio.gun(n.def && n.def.gun === 'sniper' ? H.WMAP.rattlesnake : H.WMAP.compact_5, from);
    if (Math.random() < 0.4) H.fx.tracer(from, wh ? from.clone().addScaledVector(dir, wh.t) : end);
    if (wh) { if (wh.box.glassObj) this.breakGlass(wh.box.glassObj); else { const hp = from.clone().addScaledVector(dir, wh.t); H.fx.decal(hp, wh.n); H.fx.sparks(hp, 2); } return; }
    if (!hit) { if (tgt.isPlayer && end.distanceTo(H.camera.position) < 3) H.audio.noise(0.06, 3000, 3, 0.2); return; }
    if (tgt.isPlayer) { if (tgt.car) { tgt.car.hp -= dmg * 0.7; if (tgt.car.hp <= 0) this.carExplode(tgt.car); } else this.damagePlayer(dmg, from, 'gun'); }
    else if (tgt.npc) tgt.npc.damage(dmg, 'npc', {});
    else if (tgt.sentry) { tgt.sentry.hp -= dmg; if (tgt.sentry.hp <= 0) { H.fx.explosion(tgt.sentry.pos, 1.5); H.scene.remove(tgt.sentry.m); } }
  },
  cloakerKick(n, tgt) {
    H.audio.melee(n.pos);
    if (tgt.isPlayer && !tgt.car) { if (H.mod('counter') && H.P.meleeT > 0) { n.damage(9999, 'player', {}); H.ui.toast('Countered', 'You countered the ninja kick.'); return; } this.downPlayer('Ninja kick'); }
    else if (tgt.npc) { tgt.npc.damage(9999, 'npc', {}); }
  },
  zap(n) { if (Math.random() < 0.3) { H.fx.sparks(H.camera.position.clone().add(H.camera.getWorldDirection(H._v1).multiplyScalar(0.5)), 3, 0x80c0ff, 2); H.audio.noise(0.08, 4000, 2, 0.2); } },

  /* ---------- player damage ---------- */
  damagePlayer(amt, from, kind) {
    const P = H.P; if (P.custody > 0 || P.invuln > 0 || P.inCar) return;
    if (P.downed) { if (kind === 'gun' || kind === 'explosion') { P.bleed -= amt * 0.02; } return; }
    if (kind === 'gun' && Math.random() * 100 < P.dodge + (P.crouching ? H.mod('crouchDodge') : 0) + (H.mod('sneaky') ? Math.max(0, (75 - P.detect) / 10) : 0)) { H.ui.dodge(); return; }
    let dr = 1 - (H.mod('drAdd') || 0);
    if (P.reviveDrT > 0) dr *= 1 - H.mod('uyg');
    if (H.run && H.run.loud && P.hostages > 0) dr *= 1 - Math.min(0.3, P.hostages * 0.05 * (H.mod('hostageAbsorb') ? 2 : 1));
    if (kind === 'melee') dr *= 1 - H.mod('meleeDr');
    amt *= dr;
    P.armorT = 3.2 / H.mod('armorRegenMul'); P.lastDmgT = H.t;
    if (P.armor > 0 && kind !== 'fall') {
      const a = Math.min(P.armor, amt); P.armor -= a; amt -= a;
      if (P.armor <= 0) { if (H.mod('secondWind')) P.secondWindT = 5; if (H.mod('armorInvuln')) P.invuln = 2; }
    }
    if (amt > 0) {
      if (H.mod('resilience')) amt = Math.min(amt, P.hpMax * 0.5);
      P.hp -= amt;
    }
    P.hurtT = 0.4; H.audio.hurt();
    if (from) H.ui.damageDir(from);
    if (P.hp <= 0) {
      if (H.mod('swanSong') && !P.swanUsed) { P.swanUsed = true; P.swanT = H.mod('swanSong'); P.hp = 1; H.ui.toast('Swan Song', 'Keep fighting!'); return; }
      this.downPlayer('Downed');
    }
  },
  downPlayer(reason) {
    const P = H.P; if (P.downed || P.custody) return;
    if (!H.run || H.run.done) { this.wasted(reason); return; }
    P.downs++;
    if (P.downs >= P.maxDowns) { this.toCustody(); return; }
    if (Math.random() < H.mod('feign')) { P.hp = P.hpMax * 0.4; H.ui.toast('Feign Death', 'You got back up.'); return; }
    P.downed = true; P.bleed = 30; P.hp = 0; P.armor = 0; P.tased = 0; P.tasedTotal = 0;
    if (P.bag) this.dropBag(P.bag, P.pos.clone().setY(0.3)), P.bag = null;
    H.ui.toast('You are down', 'Your crew will try to revive you. Downs: ' + P.downs + '/' + P.maxDowns);
  },
  revivePlayer() {
    const P = H.P; if (!P.downed) return;
    P.downed = false; P.hp = P.hpMax * (0.4 + H.mod('reviveHpAdd')); P.armor = P.armorMax * 0.5; P.reviveDrT = 5; P.swanUsed = false;
    H.ui.toast('Revived', 'Get back in the fight.');
  },
  toCustody() {
    const P = H.P; P.downed = false; P.custody = H.run && H.run.hostages > 0 ? 10 : 30;
    if (H.run && H.run.hostages > 0) { H.run.hostages--; H.ui.toast('In custody', 'Trading a hostage for you in 10 seconds.'); }
    else H.ui.toast('In custody', 'You will be released in 30 seconds.');
    if (P.bag) { this.dropBag(P.bag, P.pos.clone().setY(0.3)); P.bag = null; }
    // the heist fails if no one is left
    if (H.run && !H.npcs.some(n => n.kind === 'bot' && !n.dead && !n.custody)) { setTimeout(() => { if (H.P.custody > 0) this.failHeist('The whole crew was taken into custody'); }, 1500); }
  },
  leaveCustody() {
    const P = H.P, run = H.run;
    P.custody = 0; P.hp = P.hpMax; P.armor = P.armorMax; P.downs = 0;
    if (run) P.pos.copy(run.secure).add(new THREE.Vector3(-2, 0, 0));
    H.ui.toast('Released', 'Back in action.');
  },
  wasted(reason) {
    const P = H.P, s = H.save;
    const lost = Math.round(s.money * 0.1);
    s.money -= lost;
    let msg = 'Hospital bills: ' + H.money(lost) + '.';
    if (H.heat.pendingTake) { const half = Math.round(H.heat.pendingTake.cash / 2); msg += ' The police seized half the take.'; H.heat.pendingTake.cash -= half; H.heat.pendingTake.offshore = Math.round(H.heat.pendingTake.offshore / 2); this.bankTake(H.heat.pendingTake); H.heat.pendingTake = null; s.stats.busted++; }
    H.heat.clear('');
    if (P.inCar) this.exitCar();
    P.hp = P.hpMax; P.armor = P.armorMax; P.downed = false;
    const doc = H.contactSpots.find(c => c.c.id === 'doc');
    P.pos.set(doc ? doc.x : H.city.safePos.x, 0.2, (doc ? doc.z : H.city.safePos.z) + 2);
    for (const n of H.npcs.slice()) if (!n.dead && n.state === 'combat' && !n.run && n.team !== 'civ') { if (n.gang) { n.state = 'loiter'; n.team = 'neutralgang'; } else if (n.pursuitCop) n.remove(); }
    H.ui.wasted(reason === 'Downed' ? 'WASTED' : reason.toUpperCase(), msg);
    H.persist();
  },
  reviveBot(n) { n.downed = false; n.hp = n.hpMax * 0.5; n.h.a.state = 'idle'; H.ui.toast('Revived', n.name + ' is back up.'); },
  botCustody(n) { n.downed = false; n.custody = true; n.h.root.visible = false; n.hidden = true; n.dead = false; H.ui.toast('Crew down', n.name + ' was taken into custody.'); setTimeout(() => { if (H.run) { n.custody = false; n.hidden = false; n.hp = n.hpMax; n.pos.copy(H.run.secure); } }, 45000); },

  onNpcDeath(n, from, opts) {
    const run = H.run, s = H.save, P = H.P;
    if (n.kind === 'bot') { n.dead = false; n.hp = 0; n.downed = true; n.bleed = 40; n.h.a.state = 'downed'; return; }
    if (from === 'player' || from === 'bot') {
      if (n.team === 'law' || n.team === 'gang') { s.stats.kills++; if (run) run.kills++; P.kills++; if (H.mod('overkill')) P.overkillT = 2; if (n.team === 'law' && !run) { H.heat.onCopKilled(); H.heat.crime(4, P.pos); } if (n.team === 'gang') s.rep += 1; }
      if (n.team === 'civ' && from === 'player') { s.stats.civKills++; if (run) { run.civKills++; } else H.heat.crime(3, P.pos, true); }
      if (n.kind === 'guard' && run && !run.loud) { n.pager = { t: 12, answered: false }; run.pagerQueue.push(n.pager); H.audio.beep(n.pos, 1400); }
      if (n.keycard) { n.keycard = false; this.dropKeycard(n.pos); }
      if (n.team !== 'civ' && Math.random() < 0.35 && run && run.loud) this.dropAmmo(n.pos);
    }
    if (n.pursuitCop && from !== 'player') H.heat.onCopKilled();
    if (n.team === 'law' && n === P.tasedBy) { P.tased = 0; P.tasedTotal = 0; }
    // corpses fade in loud or in the street
    if (!run || run.loud || !n.run) setTimeout(() => n.remove(), 25000);
  },
  dropAmmo(pos) {
    const m = new THREE.Mesh(H.geo.box(0.22, 0.12, 0.14), H.mat(0x5a6a3a, 0.6)); m.position.set(pos.x, 0.25, pos.z); H.scene.add(m);
    this.deployed.push({ m, kind: 'ammobox', pos: m.position, t: 30 });
  },
  updatePickups(dt) {
    const P = H.P;
    for (let i = this.deployed.length - 1; i >= 0; i--) {
      const d = this.deployed[i];
      if (d.kind === 'ammobox') {
        d.t -= dt; d.m.rotation.y += dt * 2;
        if (d.pos.distanceTo(P.pos) < 1.6 * H.mod('pickupRangeMul')) { for (const W of P.weapons) W.reserve = Math.min(W.st.total, W.reserve + Math.ceil(W.st.mag * 0.25 * H.mod('pickupAmmoMul'))); if (H.mod('ammoHeal')) P.hp = Math.min(P.hpMax, P.hp + H.mod('ammoHeal')); H.audio.click(); H.scene.remove(d.m); this.deployed.splice(i, 1); continue; }
        if (d.t <= 0) { H.scene.remove(d.m); this.deployed.splice(i, 1); }
      }
      if (d.kind === 'trip' && H.run && H.run.loud) {
        for (const n of H.npcs) if (!n.dead && n.team === 'law' && n.pos.distanceTo(d.pos) < 1.8 * H.mod('tripRadiusMul')) { this.explode(d.pos.clone().setY(0.6), 3 * H.mod('tripRadiusMul'), 800 * H.mod('tripDmgMul'), 'trip'); if (H.mod('fireTrap')) H.fx.fire(d.pos.clone(), 6, 2); H.scene.remove(d.m); this.deployed.splice(i, 1); break; }
      }
      if (d.kind === 'ecm') { d.t -= dt; if (d.t <= 0) { H.scene.remove(d.m); this.deployed.splice(i, 1); } }
    }
    this.ecmT = Math.max(0, this.ecmT - dt);
    // sentries
    for (const s of this.sentries) {
      if (s.hp <= 0 || s.ammo <= 0) continue;
      s.cd -= dt;
      let tgt = null, bd = 30; for (const n of H.npcs) if (!n.dead && (n.team === 'law' || n.team === 'gang') && (!H.run || H.run.loud || n.team === 'gang')) { const d = n.pos.distanceTo(s.pos); if (d < bd && H.world.los(H._v1.set(s.pos.x, 0.9, s.pos.z), n.chestPos(H._v2))) { bd = d; tgt = n; } }
      if (tgt) { const a = Math.atan2(tgt.pos.x - s.pos.x, tgt.pos.z - s.pos.z); s.head.rotation.y = H.damp(s.head.rotation.y, a, 8 * H.mod('sentryTurnMul'), dt);
        if (s.cd <= 0) { s.cd = 0.12; s.ammo--; const from = s.pos.clone().setY(0.9); H.fx.flash(from, 0.3); H.audio.gun(H.WMAP.brenner_21, from, H.mod('silentSentry')); if (Math.random() < 0.5 * H.mod('sentryAccMul')) tgt.damage(28 * (H.mod('sentryAP') ? 1.4 : 1), 'player', {}); H.fx.tracer(from, tgt.chestPos(H._v2)); } }
    }
  },
  placeDeployable(dep) {
    const P = H.P, pos = P.pos.clone().add(new THREE.Vector3(-Math.sin(P.yaw) * 1.1, 0, -Math.cos(P.yaw) * 1.1));
    if (dep.id === 'ammo' || dep.id === 'doctor' || dep.id === 'fak' || dep.id === 'armorbag' || dep.id === 'bodybags') { this.placeBag(dep.id, pos, dep.id === 'ammo' ? 4 + H.mod('ammoBagAdd') : dep.id === 'doctor' ? 2 + H.mod('doctorAdd') : 1); return true; }
    if (dep.id === 'ecm') { const m = new THREE.Mesh(H.geo.box(0.3, 0.12, 0.2), H.mat(0x2a2a2a, 0.5, 0, { emissive: 0x002060 })); m.position.copy(pos).setY(0.1); H.scene.add(m); this.ecmT = 20 * H.mod('ecmDurMul'); this.deployed.push({ m, kind: 'ecm', pos: m.position, t: this.ecmT }); H.ui.toast('ECM active', 'Cameras, pagers and phones are jammed.'); if (H.run) for (const pg of H.run.pagerQueue) pg.t += this.ecmT; return true; }
    if (dep.id === 'trip') { const m = new THREE.Mesh(H.geo.box(0.12, 0.06, 0.08), H.mat(0x3a3a3a, 0.5, 0, { emissive: 0x400000 })); m.position.copy(pos).setY(0.05); H.scene.add(m); this.deployed.push({ m, kind: 'trip', pos: m.position }); return true; }
    if (dep.id === 'sentry') {
      const g = new THREE.Group(); g.position.copy(pos);
      for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(H.geo.box(0.04, 0.6, 0.04), H.mat(0x2a2a2a)); l.position.set(Math.sin(i * 2.1) * 0.2, 0.28, Math.cos(i * 2.1) * 0.2); l.rotation.set(Math.cos(i * 2.1) * 0.4, 0, -Math.sin(i * 2.1) * 0.4); g.add(l); }
      const head = new THREE.Group(); head.position.y = 0.75; g.add(head);
      const b = new THREE.Mesh(H.geo.box(0.25, 0.22, 0.4), H.mat(0x3a3e44, 0.4, 0.6)); head.add(b);
      const barrel = new THREE.Mesh(H.geo.cyl(0.025, 0.025, 0.5, 8), H.mat(0x1a1a1a)); barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.4; head.add(barrel);
      H.scene.add(g);
      const s = { m: g, head, pos: g.position, hp: 600 * H.mod('sentryHpMul'), ammo: Math.round(200 * H.mod('sentryAmmoMul')), cd: 0 };
      this.sentries.push(s); this.deployed.push({ m: g, kind: 'sentry', pos: g.position });
      const W = P.weapons[0]; W.reserve = Math.max(0, W.reserve - Math.round(W.st.total * 0.4 * H.mod('sentryCost')));
      return true;
    }
    return false;
  },
  placeBag(kind, pos, uses) {
    const col = { ammo: 0x4a5a2a, doctor: 0xe8e8e8, fak: 0xd02020, armorbag: 0x2a3a5a, bodybags: 0x1a1a1a }[kind];
    const g = new THREE.Group(); const b = new THREE.Mesh(H.geo.box(0.6, 0.35, 0.4), H.mat(col, 0.8)); b.position.y = 0.18; g.add(b);
    if (kind === 'doctor' || kind === 'fak') { const c1 = new THREE.Mesh(H.geo.box(0.2, 0.06, 0.02), H.mat(kind === 'fak' ? 0xffffff : 0xd02020)); c1.position.set(0, 0.2, 0.21); g.add(c1); const c2 = c1.clone(); c2.rotation.z = Math.PI / 2; g.add(c2); }
    g.position.copy(pos).setY(0.1); H.scene.add(g);
    const d = { m: g, kind, pos: g.position, uses };
    this.deployed.push(d);
    const names = { ammo: 'Refill ammo', doctor: 'Use doctor bag', fak: 'Use first aid kit', armorbag: 'Swap to heavy armour', bodybags: 'Take body bags' };
    d.ia = this.addInteract({ pos: g.position.clone().setY(0.6), r: 1.8, label: () => names[kind] + ' (' + d.uses + ')', time: () => kind === 'doctor' || kind === 'fak' ? 1 * H.mod('medUseMul') : 0.6, done: () => {
      const P = H.P;
      if (kind === 'ammo') { for (const W of P.weapons) W.reserve = W.st.total - W.mag; P.throws = Math.max(P.throws, Math.min(P.throwable.count, P.throws + 1)); if (H.mod('bulletstorm')) P.bulletstormT = H.mod('bulletstorm'); }
      if (kind === 'doctor') { P.hp = P.hpMax; P.downs = 0; }
      if (kind === 'fak') { P.hp = Math.min(P.hpMax, P.hp + P.hpMax * 0.3); }
      if (kind === 'armorbag') { P.armorMax = 200; P.armor = 200; }
      if (kind === 'bodybags') { P.bodyBags += 2; }
      d.uses--; H.audio.ui();
      if (d.uses <= 0) { H.scene.remove(g); this.removeInteract(d.ia); }
    } });
  },
  meleeHit() {
    const P = H.P, cam = H.camera, f = cam.getWorldDirection(H._v1).clone(), m = P.melee;
    let hit = false;
    for (const n of H.npcs) {
      if (n.dead || n.team === 'crew') continue;
      const d = H._v2.set(n.pos.x, n.pos.y + 1.2, n.pos.z).distanceTo(cam.position);
      if (d > m.range + 0.5) continue;
      const to = H._v2.sub(cam.position).normalize(); if (to.dot(f) < 0.6) continue;
      let dmg = m.dmg * H.mod('meleeDmgMul') * (H.mod('berserk') && P.hp < P.hpMax * 0.5 ? 1 + H.mod('berserk') : 1) * (1 + (P.bloodStacks || 0));
      if (n.kind === 'civ' && P.masked) { n.state = 'down'; n.downT = 20; hit = true; continue; }
      if (n.special === 'shield' && !H.mod('ironManAce')) { H.fx.sparks(n.chestPos(H._v2), 4); hit = true; continue; }
      if (n.special === 'taser' && P.tasedBy === n) { n.staggerT = 2; P.tased = 0; P.tasedTotal = 0; }
      const r = n.damage(dmg, 'player', { melee: true });
      n.staggerT = 0.8;
      H.fx.blood(n.chestPos(H._v2), 6); H.ui.hitmark(r === 'kill', false); hit = true;
      if (r === 'kill' && H.mod('bloodthirst')) P.bloodStacks = 0; else if (H.mod('bloodthirst')) P.bloodStacks = Math.min(15, (P.bloodStacks || 0) + 1);
      if (n.kind === 'ped' && !H.run) H.heat.crime(1, P.pos, false);
      break;
    }
    // glass, cameras, drills
    const wh = H.world.ray(cam.position, f, m.range);
    if (wh) { if (wh.box.glassObj) this.breakGlass(wh.box.glassObj); else if (wh.box.camObj) this.breakCam(wh.box.camObj); else if (wh.box.destroyObj) this.hitProp(wh.box.destroyObj, m.dmg); else H.fx.sparks(cam.position.clone().addScaledVector(f, wh.t), 3); hit = true; }
    if (H.run) for (const d of H.run.drills) if (d.jammed && d.pos.distanceTo(cam.position) < 2.4 && Math.random() < H.mod('kickstarter')) { d.jammed = false; d.nextJam = H.rand(14, 30); H.ui.toast('Kickstart', 'You smacked the drill back to life.'); }
    if (H.run) for (const c of H.run.cases) if (!c.done && c.g.position.distanceTo(cam.position) < 2.2) { const ia = c.ia; ia.done(); }
    if (hit) H.audio.melee();
  },

  /* ---------- loot bags ---------- */
  dropBag(type, pos) {
    const m = H.bagMesh(type); m.position.copy(pos); H.scene.add(m);
    const b = { m, type, vel: new THREE.Vector3(), rest: true };
    b.ia = this.addInteract({ pos: m.position, r: 1.8, label: 'Pick up ' + H.LOOT[type].name.toLowerCase() + ' bag', time: 0, cond: () => !H.P.bag, done: () => { H.P.bag = type; H.scene.remove(m); this.removeInteract(b.ia); this.bags.splice(this.bags.indexOf(b), 1); } });
    this.bags.push(b);
    return b;
  },
  throwBag() {
    const P = H.P, cam = H.camera, dir = cam.getWorldDirection(new THREE.Vector3());
    const b = this.dropBag(P.bag, cam.position.clone().addScaledVector(dir, 0.6));
    b.vel.copy(dir).multiplyScalar(7 * H.mod('throwMul') * (1.2 - H.LOOT[P.bag].weight * 0.4)).add(new THREE.Vector3(0, 2.5, 0)); b.rest = false;
    P.bag = null;
  },
  updateBags(dt) {
    const run = H.run;
    for (const b of this.bags.slice()) {
      if (!b.rest) {
        b.vel.y -= 12 * dt;
        const step = b.vel.clone().multiplyScalar(dt), len = step.length(), dir = step.clone().normalize();
        const wh = len > 0 ? H.world.ray(b.m.position, dir, len + 0.2) : null;
        if (wh) { b.vel.reflect(wh.n).multiplyScalar(0.3); } else b.m.position.add(step);
        b.m.rotation.x += dt * 4;
        const ground = H.world.move({ x: b.m.position.x, y: b.m.position.y - 0.3, z: b.m.position.z }, 0.01, 0.3, 0.6);
        if (b.m.position.y < ground + 0.05) { b.m.position.y = ground + 0.05; b.vel.multiplyScalar(0.3); b.vel.y = 0; if (b.vel.length() < 0.5) { b.rest = true; b.m.rotation.x = 0; } }
      }
      if (run && b.m.position.distanceTo(run.secure) < 2.6 && b.m.position.y < 2.5) { this.secureBag(b.type); H.scene.remove(b.m); this.removeInteract(b.ia); this.bags.splice(this.bags.indexOf(b), 1); }
    }
  },
  secureBag(type) {
    const run = H.run; if (!run) return;
    if (type === 'body') { H.ui.toast('Body stashed', 'The body is in the van.'); return; }
    run.secured[type] = (run.secured[type] || 0) + 1; run.securedBags++; run.securedValue += H.LOOT[type].value;
    H.audio.cash(); H.ui.floatMoney(H.LOOT[type].value, 'Secured ' + H.LOOT[type].name);
  },
  addSmall(v) { v = Math.round(v); if (H.run) H.run.smallValue += v; else H.save.money += v; H.audio.cash(); H.ui.floatMoney(v); },

  /* ---------- vehicles ---------- */
  enterCar(c) {
    const P = H.P;
    if (c.driver === 'ai') {
      // pull the driver out
      const d = new H.Npc('ped', c.pos.x + 1.5, c.pos.z, { speed: 1.5 }); d.state = 'flee'; d.fleeT = 8; d.danger = P.pos.clone(); d.loop = { x0: d.pos.x - 20, x1: d.pos.x + 20, z0: d.pos.z - 20, z1: d.pos.z + 20 }; d.corner = 0; d.dir = 1;
      if (c.police) H.heat.crime(3, P.pos); else H.heat.crime(1, P.pos, H.heat.seenByPolice());
    }
    c.driver = 'player'; c.wp = null; c.pursuit = false; c.patrol = false; c.keep = true;
    P.inCar = c; P.vel.set(0, 0, 0); H.vm.group.visible = false;
    H.music.set(H.heat.wanted ? 'assault' : 'radio');
    H.ui.toast(c.T.name, 'W/S drive, A/D steer, Space handbrake, R radio, F to exit.');
  },
  exitCar() {
    const P = H.P, c = P.inCar; if (!c) return;
    c.driver = null; c.speed *= 0.3; P.inCar = null;
    const side = new THREE.Vector3(Math.cos(c.yaw), 0, -Math.sin(c.yaw));
    P.pos.copy(c.pos).addScaledVector(side, -(c.T.W / 2 + 0.8)); P.pos.y = 0.2; P.yaw = c.yaw;
    H.audio.engine(false); H.music.set(H.heat.wanted ? 'assault' : 'city');
  },
  updateCarCam(dt) {
    const P = H.P, c = P.inCar; if (!c) return;
    if (H.wasPressed('KeyF') && Math.abs(c.speed) < 6) { this.exitCar(); return; }
    if (H.wasPressed('KeyR')) { H.radioIdx = (H.radioIdx + 1) % H.RADIO.length; H.ui.toast('Radio', H.RADIO[H.radioIdx]); H.music.set(H.heat.wanted ? 'assault' : 'radio'); }
    P.pos.copy(c.pos);
    this.camYaw = H.damp(this.camYaw ?? c.yaw, c.yaw, 4, dt);
    this.camOrbit = (this.camOrbit || 0) - H.mouse.dx * 0.004; this.camOrbit = H.damp(this.camOrbit, 0, H.mouse.dx ? 0 : 1.2, dt);
    this.camPitch = H.clamp((this.camPitch ?? 0.25) + H.mouse.dy * 0.002, 0.05, 0.9);
    const yaw = this.camYaw + this.camOrbit, dist = 8 + c.T.L * 0.4 + Math.abs(c.speed) * 0.05;
    const target = c.pos.clone().setY(1.5);
    const cp = target.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(this.camPitch) * dist, Math.sin(this.camPitch) * dist + 1, Math.cos(yaw) * Math.cos(this.camPitch) * dist));
    const dir = cp.clone().sub(target), len = dir.length(); dir.normalize();
    const wh = H.world.ray(target, dir, len); if (wh) cp.copy(target).addScaledVector(dir, Math.max(1.5, wh.t - 0.4));
    H.camera.position.copy(cp); H.camera.lookAt(target);
    const fov = H.settings.fov + Math.min(14, Math.abs(c.speed) * 0.3);
    if (Math.abs(H.camera.fov - fov) > 0.1) { H.camera.fov = H.damp(H.camera.fov, fov, 3, dt); H.camera.updateProjectionMatrix(); }
    // drive-by: aim with the camera, shoot the secondary
    if (H.mouse.l && P.fireT <= 0 && P.weapons[1]) { const W = P.weapons[1]; if (W.mag > 0) { W.mag--; P.fireT = 1 / W.st.rof; const o = c.pos.clone().setY(1.5), d = H.camera.getWorldDirection(new THREE.Vector3()); this.hitscan(o.addScaledVector(d, 2), d, W.st, W.st.dmg, o, true); H.audio.gun(W.st.w, null, W.st.silent); this.publicGunfire(c.pos); } else if (W.reserve > 0) { const n = Math.min(W.st.mag, W.reserve); W.mag = n; W.reserve -= n; P.fireT = W.st.reload; } }
    P.fireT -= dt;
    // dropping off a stolen car at Vinnie's
  },

  /* ---------- heist end ---------- */
  completeHeist() {
    const run = H.run, s = H.save, D = H.DIFFS[run.diff], def = run.def, P = H.P;
    run.done = true;
    const news = H.newsFx();
    const payMul = D.payMul * (news.pay[def.id] || 1);
    const contract = Math.round(def.pay * payMul * (run.loud ? 1 : 1.15));
    const lootV = Math.round(run.securedValue * (0.5 + payMul * 0.5));
    const civPenalty = run.civKills * 8000 * (1 + run.diff);
    const total = Math.max(0, contract + lootV - civPenalty);
    const xp = Math.round((1800 + run.securedBags * 500 + (run.loud ? 0 : 1500) + run.kills * 20) * D.xpMul * H.mod('xpMul'));
    const take = { name: def.name, id: def.id, diff: run.diff, cash: Math.round(total * 0.8) + run.smallValue, offshore: Math.round(total * 0.2), xp, contract, lootV, small: run.smallValue, civPenalty, bags: run.securedBags, secured: { ...run.secured }, loud: run.loud, kills: run.kills, civKills: run.civKills };
    s.lastHeist = { name: def.name, loud: run.loud, take: total + run.smallValue, kills: run.kills, civKills: run.civKills };
    s.stats.heists++; if (run.loud) s.stats.loud++; else s.stats.stealth++;
    s.stats.bags += run.securedBags;
    s.heatPoints += run.loud ? 2 + (run.kills > 30 ? 1 : 0) : 1;
    s.completed[def.siteId || def.id] = Math.max(s.completed[def.siteId || def.id] ?? -1, run.diff);
    s.rep += 5 + run.diff * 2;
    // swap to the getaway van and start the chase
    const van = run.vanCars[0];
    const vpos = van ? van.pos.clone() : run.secure.clone(), vyaw = van ? van.yaw : 0;
    const crewMasks = H.npcs.filter(n => n.kind === 'bot');
    this.cleanupRun();
    P.masked = false; P.bag = null; P.downed = false; P.custody = 0; P.hp = P.hpMax; P.armor = P.armorMax;
    const car = new H.Car('van', vpos.x, vpos.z, vyaw, { color: 0x2a2e33 }); car.keep = true; car.getaway = true;
    this.enterCar(car);
    const danger = H.heat.danger();
    const stars = Math.min(5, (run.loud ? 2 : 1) + Math.floor(danger / 2) + (run.diff >= 4 ? 1 : 0));
    H.heat.pendingTake = take;
    H.heat.setWanted(stars, vpos, 'The cops are on your tail! Shake them, take them out, or lie low at the safehouse.');
    H.heat.pursuitPool = 4 + stars * 4;
    s.stats.chases++;
    H.persist();
  },
  bankTake(take) {
    const s = H.save;
    s.money += take.cash; s.offshore += take.offshore; s.stats.earned += take.cash + take.offshore;
    const lvl0 = s.level;
    s.xp += take.xp;
    while (s.level < 100 && s.xp >= H.LEVEL_XP(s.level)) { s.xp -= H.LEVEL_XP(s.level); s.level++; }
    s.perk.points += Math.floor(take.xp / 1500);
    H.checkAchievements();
    H.persist();
    H.ui.payday(take, s.level - lvl0);
  },
  failHeist(reason) {
    const s = H.save; s.stats.fails++;
    this.cleanupRun();
    const P = H.P; P.custody = 0; P.downed = false; P.hp = P.hpMax; P.armor = P.armorMax; P.masked = false; P.bag = null;
    P.pos.copy(H.city.safePos).add(new THREE.Vector3(0, 0, 3));
    H.ui.wasted('HEIST FAILED', reason);
    H.heat.setWanted(1, P.pos);
    H.persist();
  },

  /* ---------- main update ---------- */
  update(dt) {
    const P = H.P, run = H.run;
    H.t += dt;
    // mask up
    if (!P.inCar && !P.masked && H.keys.KeyX && !H.ui.menuOpen) { P.maskHold += dt; if (P.maskHold > 0.8) { P.masked = true; P.maskHold = 0; H.audio.noise(0.3, 600, 1, 0.3); H.ui.toast('Masked up', run ? 'No turning back now.' : 'People will remember this.'); if (run && run.phase === 'casing') run.phase = 'stealth'; } } else P.maskHold = 0;
    if (P.inCar) { this.updateCarCam(dt); } else { H.updatePlayer(dt); H.updateWeapons(dt); this.updateInteract(dt); }
    if (H.wasPressed('KeyT')) this.mark();
    H.updateViewmodel(dt);
    H.updateSky(dt);
    H.traffic.update(dt);
    // flow field for police
    this.flowT = (this.flowT || 0) - dt;
    if (this.flowT <= 0) { this.flowT = 0.4; H.nav.buildFlow(P.pos.x, P.pos.z); }
    // npc separation & updates
    const list = H.npcs;
    for (let i = 0; i < list.length; i++) {
      const a = list[i]; if (a.dead || a.state === 'static') continue;
      for (let j = i + 1; j < list.length; j++) { const b = list[j]; if (b.dead || b.state === 'static') continue; const dx = a.pos.x - b.pos.x, dz = a.pos.z - b.pos.z, d2 = dx * dx + dz * dz; if (d2 < 0.36 && d2 > 1e-6) { const d = Math.sqrt(d2), p = (0.6 - d) / d * 0.5; a.pos.x += dx * p; a.pos.z += dz * p; b.pos.x -= dx * p; b.pos.z -= dz * p; } }
    }
    for (const n of list.slice()) {
      if (n.fixedY !== undefined) { n.update(dt); n.pos.y = n.fixedY; n.h.root.position.y = n.fixedY; continue; }
      n.update(dt);
      if (n.burnT > 0) { n.burnT -= dt; n.damage(30 * dt, 'player', { fire: true }); if (Math.random() < dt * 8) H.fx.flash(n.chestPos(H._v2), 0.6, 0.2); }
    }
    // cull and respawn pedestrians around the player
    this.pedT = (this.pedT || 0) - dt;
    if (this.pedT <= 0) {
      this.pedT = 3;
      const peds = list.filter(n => n.kind === 'ped' && !n.contact);
      for (const p of peds) if (p.pos.distanceTo(P.pos) > 280) p.remove();
      if (peds.length < 60 && !run) H.spawnPeds(4);
    }
    if (run) {
      H.updateDoors(dt); H.updateStealth(dt); H.updateDrills(dt); H.updateVaults(dt); H.updateComputers(dt); H.updateCook(dt); H.updateTruck(dt); H.updateAssault(dt); H.updateRunLoot(dt);
      if (run.site.danceTiles) run.site.danceTiles.forEach((m, i) => m.material.emissive.setHSL(((H.t * 0.3 + i * 0.13) % 1), 1, 0.4));
    }
    H.heat.update(dt);
    H.interiors.update(dt);
    // a civilian calls the police after public gunfire
    if (this.callInT) { this.callInT -= dt; if (this.callInT <= 0) { this.callInT = 0; if (!H.heat.wanted) H.heat.setWanted(1, P.pos, 'Someone called the police about gunfire.'); } }
    this.updateProjectiles(dt); this.updateBags(dt); this.updatePickups(dt);
    P.aggroT = Math.max(0, (P.aggroT || 0) - dt); P.aggroAceT = Math.max(0, (P.aggroAceT || 0) - dt); P.bulletstormT = Math.max(0, (P.bulletstormT || 0) - dt); P.reviveDrT = Math.max(0, (P.reviveDrT || 0) - dt); P.swanT = Math.max(0, (P.swanT || 0) - dt);
    if (P.swanUsed && P.swanT <= 0 && P.hp <= 1 && !P.downed && !P.custody) this.downPlayer('Downed');
    H.fx.update(dt);
    // day rolls over
    const day = H.save.day;
    if (H.city.timeOfDay < this.lastTod) { H.save.day++; }
    this.lastTod = H.city.timeOfDay;
    if (H.save.day !== day) { H.interiors.newDay(); H.save.news = H.makeNewspaper(H.save.day); H.ui.toast('The Herald', 'A new edition is out. Check your phone (P).'); H.persist(); }
    // autosave
    this.saveT = (this.saveT || 0) + dt; if (this.saveT > 30) { this.saveT = 0; H.persist(); }
  },
  mark() {
    const cam = H.camera, f = cam.getWorldDirection(H._v1);
    let best = null, bd = 0.97;
    for (const n of H.npcs) { if (n.dead || n.team === 'crew' || n.team === 'civ') continue; const to = H._v2.set(n.pos.x - cam.position.x, n.pos.y + 1.2 - cam.position.y, n.pos.z - cam.position.z); const d = to.length(); to.normalize(); const dot = to.dot(f); if (dot > bd && d < 60) { bd = dot; best = n; } }
    if (best) { best.marked = true; best.markT = 8; H.audio.ui(); }
  },
};
function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r;
  const h = b * b - cc; if (h < 0) return null;
  const t = -b - Math.sqrt(h); return t >= 0 ? t : null;
}
function falloff(d, range) { return d < range ? 1 : Math.max(0.35, 1 - (d - range) / (range * 2)); }
H.raySphere = raySphere;
