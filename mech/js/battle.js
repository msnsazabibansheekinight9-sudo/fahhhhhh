// Ironwalkers — battle simulation: mechs, weapons, projectiles, damage, abilities, AI, game modes, cameras.
(function () {
'use strict';
const MW = window.MW;
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const TEAM_COL = ['#3ea6ff', '#ff4a3a'];
const DEG = Math.PI / 180;
const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const fwd = (yaw, out) => (out || new THREE.Vector3()).set(Math.sin(yaw), 0, Math.cos(yaw));

let B = null; // current battle
const SOUND_FOR = { mg: 'mg', ac5: 'ac', ac20: 'ac20', rac: 'rac', gauss: 'gauss', slas: 'laser', llas: 'llaser', plas: 'plaser', ppc: 'ppc', srm: 'missile', lrm: 'lrm', flamer: 'flamer', plasma: 'plasma', rail: 'rail', mortar: 'mortar', arc: 'arc' };

// ---------------------------------------------------------------- mech creation
function derive(build) {
  const c = build.cdef; const e = {}; for (const k in build.equip) e[k] = MW.equipEffect(build.equip[k]);
  const ar = e.armor, re = e.reactor, ac = e.actuator, je = e.jets, ta = e.targeting, mo = e.module;
  const hpK = ar.hp * (re.hp || 1) * 1.7; // tuned for ~10-20 s focused time-to-kill
  const st = {
    hp: { core: c.hp.core * hpK, armL: c.hp.arm * hpK, armR: c.hp.arm * hpK, legs: c.hp.leg * hpK * (ac.legHp || 1) },
    speed: c.speed * ar.speed * re.speed * ac.speed, accel: c.accel * ac.accel, turn: c.turn * ac.turn, twistMax: c.twist * DEG, twistRate: 2.2 * ac.turn,
    heatCap: c.heat.cap * re.cap, diss: c.heat.diss * re.diss, hotSpeed: ac.hotSpeed || 0,
    jumpFuel: c.jump > 0 ? c.jump * je.fuel : 0, jumpThrust: je.thrust, jumpAir: je.air, jumpRegen: je.regen,
    res: { ballistic: ar.ballisticRes || 0, energy: ar.energyRes || 0, splash: ar.splashRes || 0 },
    spread: ta.spread, lock: ta.lock, range: ta.range, radar: Math.round(320 * ta.radar),
    ams: mo.ams || 0, ecm: mo.ecm || 0, repair: mo.repair || 0, shield: mo.shield || 0,
  };
  return st;
}

function makeMech(build, team, isPlayer) {
  const m = {
    id: ++B.idc, build, cls: build.cdef, team, isPlayer, name: build.name, st: derive(build), tier: 0,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: team === 0 ? 0 : Math.PI, twist: 0, pitch: 0, aimYaw: 0, aimPitch: 0, speed: 0, strafe: 0,
    hp: {}, alive: false, heat: 0, shutdown: 0, jumpFuel: 0, jet: 0, shield: 0, onGround: true, fallV: 0,
    ability: { cd: 4, t: 0 }, fx: { emp: 0, cloak: 0, fortify: 0, overdrive: 0, barrage: 0, focus: 0, flight: 0, ram: 0, overload: 0 },
    weapons: [], kills: 0, deaths: 0, assists: 0, dmg: 0, obj: 0, caps: 0, gens: 0, heistCaps: 0, abilities: 0, score: 0,
    dmgBy: new Map(), lastHit: -99, lastFire: -99, respawn: 0, input: { throttle: 0, turn: 0, move: null, back: false, fire: [false, false], jump: false },
    lockT: 0, lockTarget: null, carrying: false, dropT: 0,
  };
  m.tier = Math.max(...build.weapons.map(w => w.item ? w.item.tier : 0), ...Object.values(build.equip).map(i => i.tier));
  build.weapons.forEach((w, i) => {
    if (!w.item) return; const wt = MW.WTYPE[w.item.wtype];
    const s = MW.weaponStats(wt, w.item.tier, w.item.mod); s.range *= m.st.range; s.spread *= m.st.spread;
    m.weapons.push({ i, item: w.item, wt, s, group: w.group, mount: w.hp.mount, cd: Math.random() * 0.5, burst: 0, burstT: 0, charge: 0, beamT: 0, beam: null, spin: 0, alive: true, held: false, mi: -1 });
  });
  buildModel(m);
  return m;
}
function buildModel(m) {
  if (m.model) { B.scene.remove(m.model.root); disposeModel(m.model); }
  m.model = MW.mechs.build(m.build, { noShadow: false });
  m.model.weapons.forEach((mw, k) => { const w = m.weapons.find(x => x.i === mw.index); if (w) w.mi = k; });
  B.scene.add(m.model.root);
  m.sc = m.model.scale; m.radius = Math.max(m.model.hit.coreR, m.model.hit.legR) * m.sc * 0.85;
  m.torsoY = m.model.torso.position.y;
}
function disposeModel(model) { model.root.traverse(o => { if (o.isMesh && o.userData.merged) o.geometry.dispose(); }); }

function spawnMech(m, drop) {
  const base = B.world.bases[m.team]; const S = B.world.S;
  let x, z, tries = 0;
  do { x = base.x + (Math.random() - 0.5) * S * 0.6; z = base.z + (Math.random() - 0.5) * S * 0.18; tries++; } while (tries < 30 && (B.world.blockedAt(x, z, m.radius + 1) || B.mechs.some(o => o !== m && o.alive && Math.hypot(o.pos.x - x, o.pos.z - z) < 10)));
  if (m.alive === false && m.model && m.deadT != null) buildModel(m);
  const h = groundAt(x, z, 1e9);
  m.pos.set(x, h + (drop ? 70 + Math.random() * 30 : 0), z);
  m.vel.set(0, drop ? -25 : 0, 0);
  m.yaw = m.aimYaw = m.team === 0 ? 0 : Math.PI; m.twist = 0; m.pitch = m.aimPitch = 0; m.speed = 0;
  m.hp = Object.assign({}, m.st.hp); m.alive = true; m.heat = 0; m.shutdown = 0; m.jumpFuel = m.st.jumpFuel; m.shield = m.st.shield; m.deadT = null; m.onGround = !drop; m.dropping = !!drop;
  m.spawnProt = 3; m.carrying = false; m.lockT = 0; m.dmgBy.clear();
  for (const k in m.fx) m.fx[k] = 0;
  m.weapons.forEach(w => { w.alive = true; w.cd = 0.5; w.charge = 0; w.burst = 0; w.beamT = 0; });
  m.model.root.visible = true; m.model.root.rotation.set(0, 0, 0);
  if (m.ai) { m.ai.path = null; m.ai.thinkT = Math.random() * 0.5; m.ai.target = null; }
}
function groundAt(x, z, feetY) {
  const W = B.world; let h = W.heightAt(x, z);
  if (feetY < 1e8) { const t = W.topAt(x, z, 2, feetY); if (t > h) h = t; }
  return h;
}

// hit spheres (core, arms, legs) in world space
function spheres(m) {
  const md = m.model, h = md.hit, sc = m.sc, ty = (md.hipH + m.torsoY) * sc;
  const ya = m.yaw + m.twist; const rx = Math.cos(ya), rz = -Math.sin(ya);
  const out = m._sp || (m._sp = [{ c: new THREE.Vector3(), r: 0, part: 'core' }, { c: new THREE.Vector3(), r: 0, part: 'armL' }, { c: new THREE.Vector3(), r: 0, part: 'armR' }, { c: new THREE.Vector3(), r: 0, part: 'legs' }]);
  out[0].c.set(m.pos.x, m.pos.y + ty + h.coreY * sc, m.pos.z); out[0].r = h.coreR * sc;
  out[1].c.set(m.pos.x - rx * h.armX * sc, m.pos.y + ty + h.armY * sc, m.pos.z - rz * h.armX * sc); out[1].r = h.armR * sc;
  out[2].c.set(m.pos.x + rx * h.armX * sc, m.pos.y + ty + h.armY * sc, m.pos.z + rz * h.armX * sc); out[2].r = h.armR * sc;
  out[3].c.set(m.pos.x, m.pos.y + (md.hipH + h.legY * 0.5) * sc, m.pos.z); out[3].r = h.legR * sc;
  return out;
}
function centerOf(m, out) { return (out || new THREE.Vector3()).set(m.pos.x, m.pos.y + (m.model.hipH + m.torsoY + m.model.hit.coreY) * m.sc, m.pos.z); }
function segSphere(p, d, len, c, r) { // d normalised; returns t in [0,len] or -1
  const ox = p.x - c.x, oy = p.y - c.y, oz = p.z - c.z; const b = ox * d.x + oy * d.y + oz * d.z; const cc = ox * ox + oy * oy + oz * oz - r * r;
  if (cc < 0) return 0; const disc = b * b - cc; if (disc < 0) return -1; const t = -b - Math.sqrt(disc); return t >= 0 && t <= len ? t : -1;
}
// ray against mechs + generators; returns {t, target, part}
function rayTargets(p, d, len, team, ignore) {
  let best = { t: len, target: null, part: null };
  for (const m of B.mechs) { if (!m.alive || m === ignore || (team != null && m.team === team)) continue; const c = centerOf(m, V3); if (Math.hypot(c.x - p.x, c.z - p.z) > len + 20) continue; for (const s of spheres(m)) { const t = segSphere(p, d, best.t, s.c, s.r); if (t >= 0 && t < best.t) best = { t, target: m, part: s.part }; } }
  for (const g of B.gens) { if (!g.alive || (team != null && g.team === team)) continue; const t = segSphere(p, d, best.t, g.c, g.r); if (t >= 0 && t < best.t) best = { t, target: g, part: 'core' }; }
  return best;
}
// barrier domes block enemy fire
function domeBlock(p, d, len, team) {
  let best = -1;
  for (const dm of B.domes) { if (dm.team === team) continue; const ox = p.x - dm.pos.x, oy = p.y - dm.pos.y, oz = p.z - dm.pos.z; const cc = ox * ox + oy * oy + oz * oz - dm.r * dm.r; if (cc < 0) continue; const b = ox * d.x + oy * d.y + oz * d.z; const disc = b * b - cc; if (disc < 0) continue; const t = -b - Math.sqrt(disc); if (t >= 0 && t <= len && (best < 0 || t < best)) best = t; }
  return best;
}

// ---------------------------------------------------------------- damage
function damage(tg, amt, part, kind, attacker, pos, splash) {
  if (!tg.alive || B.over) return;
  if (tg.isGen) {
    tg.hp -= amt; if (attacker) { attacker.dmg += amt; attacker.score += amt / 10; }
    if (attacker && attacker.isPlayer) hitMarker(false);
    if (tg.hp <= 0) { tg.alive = false; MW.fx.mechDeath(tg.c.clone(), 3); MW.audio.play('bigexplode', tg.c); tg.mesh.visible = false; tg.wreck.visible = true; if (attacker) { attacker.gens++; attacker.obj += 3; attacker.score += 500; } feed(attacker, null, 'destroyed a shield generator'); announce(tg.team === B.playerTeam ? 'GENERATOR LOST' : 'GENERATOR DESTROYED', tg.team === B.playerTeam ? 'bad' : 'good'); }
    return;
  }
  if (tg.spawnProt > 0) return;
  let a = amt;
  if (kind === 'ballistic') a *= 1 - tg.st.res.ballistic; else if (kind === 'energy') a *= 1 - tg.st.res.energy;
  if (splash) a *= 1 - tg.st.res.splash;
  if (tg.fx.fortify > 0) a *= 0.5;
  if (tg.shield > 0) { const s = Math.min(tg.shield, a * 0.8); tg.shield -= s; a -= s; tg.shieldHit = 0.3; }
  if (attacker) { attacker.dmg += a; attacker.score += a / 10; const r = tg.dmgBy.get(attacker) || { d: 0, t: 0 }; r.d += a; r.t = B.time; tg.dmgBy.set(attacker, r); }
  tg.lastHit = B.time; tg.lastAttacker = attacker;
  if (tg.isPlayer && attacker) { B.hud.damageFrom(attacker.pos); B.camShake = Math.min(1, B.camShake + a / 80); MW.audio.play('hitme', null, Math.min(1, 0.3 + a / 40)); }
  if (attacker && attacker.isPlayer) hitMarker(part === 'core');
  let left = a;
  if ((part === 'armL' || part === 'armR') && tg.hp[part] <= 0) part = 'core';
  if (part === 'legs' && tg.hp.legs <= 0) { left *= 0.6; part = 'core'; }
  tg.hp[part] -= left;
  if (part !== 'core' && tg.hp[part] <= 0) {
    const over = -tg.hp[part]; tg.hp[part] = 0;
    if (part === 'armL' || part === 'armR') loseArm(tg, part);
    if (part === 'legs') { if (tg.isPlayer) announce('LEG ACTUATORS DESTROYED', 'bad'); }
    tg.hp.core -= over * 0.5;
  }
  if (tg.hp.core <= 0) kill(tg, attacker);
}
function hitMarker(crit) { B.hud.hit(crit); MW.audio.play('hit', null, 0.35); }
function loseArm(m, part) {
  m.weapons.forEach(w => { if (w.mount === part) { w.alive = false; if (w.beam) { w.beam.life = 0; w.beam = null; } } });
  const arm = m.model.arms[part]; if (!arm) return;
  const p = new THREE.Vector3(); arm.sh.getWorldPosition(p);
  arm.sh.visible = false;
  MW.fx.explosion(p, 1.2, { ground: false }); MW.fx.sparks(p, 30); MW.audio.play('explode', p, 0.8);
  // debris chunk
  const chunk = new THREE.Mesh(MW.mechs.geo.bbox(1.5 * m.sc, 2.5 * m.sc, 1.5 * m.sc), m.model.mats.p); chunk.position.copy(p); chunk.castShadow = true; B.scene.add(chunk);
  B.debris.push({ mesh: chunk, v: new THREE.Vector3((Math.random() - 0.5) * 10, 8, (Math.random() - 0.5) * 10), w: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4), life: 8 });
  if (m.isPlayer) announce((part === 'armL' ? 'LEFT' : 'RIGHT') + ' ARM DESTROYED', 'bad');
}
function kill(m, killer) {
  if (!m.alive) return;
  m.alive = false; m.deadT = 0; m.deaths++; m.hp.core = 0;
  m.fallDir = Math.random() < 0.5 ? 1 : -1;
  m.weapons.forEach(w => { if (w.beam) { w.beam.life = 0; w.beam = null; } });
  const c = centerOf(m);
  MW.fx.mechDeath(c, 1 + m.sc * 0.5); MW.audio.play('bigexplode', c);
  if (killer && killer !== m) { killer.kills++; killer.score += 100; if (killer.isPlayer) { MW.audio.play('killconfirm'); B.hud.killConfirm(m); } }
  for (const [att, r] of m.dmgBy) if (att !== killer && B.time - r.t < 20 && r.d > 15) { att.assists++; att.score += 40; }
  feed(killer, m);
  if (m.carrying) dropCore(m);
  B.modeKill(m, killer);
  m.respawn = B.respawnTime;
  if (m.isPlayer) { B.deathCam = { killer: killer || m, t: 0 }; MW.audio.loop('jetP', 'jet', false); }
}
function feed(a, v, verb) { B.feed.push({ a: a ? a.name : 'Environment', at: a ? a.team : -1, v: v ? v.name : '', vt: v ? v.team : -1, verb, t: B.time, me: (a && a.isPlayer) || (v && v.isPlayer) }); if (B.feed.length > 6) B.feed.shift(); }
function announce(text, kind) { if (B.hud) B.hud.announce(text, kind); }

// ---------------------------------------------------------------- weapons
function muzzlePos(m, w, out) {
  const mw = m.model.weapons[w.mi]; if (!mw) return centerOf(m, out);
  return mw.muzzle.getWorldPosition(out);
}
function spreadDir(d, deg) { if (!deg) return d; const a = Math.random() * Math.PI * 2, r = Math.tan(deg * DEG) * Math.sqrt(Math.random()); const t1 = V2.set(-d.z, 0, d.x).normalize(); if (t1.lengthSq() < 0.1) t1.set(1, 0, 0); const t2 = V3.crossVectors(d, t1); return d.addScaledVector(t1, Math.cos(a) * r).addScaledVector(t2, Math.sin(a) * r).normalize(); }

function fireOnce(m, w, aim, target) {
  const wt = w.wt, s = w.s; const p = muzzlePos(m, w, new THREE.Vector3());
  const focus = m.fx.focus > 0; const dmgK = (focus ? 1.4 : 1);
  const spread = focus ? 0 : s.spread * (m.isPlayer ? 1 : 1.25);
  const dir = new THREE.Vector3().subVectors(aim, p).normalize();
  if (m.fx.cloak > 0) m.fx.cloak = 0;
  m.lastFire = B.time;
  const col = new THREE.Color(wt.color);
  const mwm = m.model.weapons[w.mi];
  MW.mechs.recoil(m.model, w.mi, { L: 0.5, M: 0.3, S: 0.15 }[wt.size]);
  const snd = SOUND_FOR[wt.id];
  if (snd && (wt.fire !== 'auto' && wt.fire !== 'spin' || Math.random() < 0.6)) MW.audio.play(snd, p, m.isPlayer ? 0.8 : 0.9);
  const kind = wt.kind === 'missile' ? 'ballistic' : wt.kind;
  switch (wt.fire) {
    case 'auto': case 'spin': case 'semi': case 'burst': {
      const d = spreadDir(dir.clone(), spread);
      const isOrb = wt.id === 'plasma' || wt.id === 'ppc' || wt.id === 'plas';
      B.proj.push({ p: p.clone(), v: d.multiplyScalar(s.speed), owner: m, team: m.team, dmg: s.dmg * dmgK, kind, col, life: s.range / s.speed * 1.15, splash: wt.splash || 0, wt: wt.id, orb: isOrb, size: wt.id === 'ac20' ? 0.5 : wt.id === 'plasma' ? 0.9 : wt.id === 'ppc' ? 0.7 : wt.size === 'S' ? 0.12 : 0.22, emp: wt.emp, grav: wt.id === 'ac20' ? 3 : 0 });
      MW.fx.muzzle(p, dir, wt.color, { S: 0.4, M: 0.7, L: 1.2 }[wt.size]);
      if (isOrb) MW.fx.light(p, wt.color, 2, 12, 0.08);
      break; }
    case 'charge': {
      const d = dir.clone();
      B.proj.push({ p: p.clone(), v: d.multiplyScalar(s.speed), owner: m, team: m.team, dmg: s.dmg * dmgK, kind, col, life: s.range / s.speed * 1.1, splash: 0, wt: wt.id, size: 0.3, slug: true });
      MW.fx.muzzle(p, dir, '#9fd7ff', 1.6); MW.fx.light(p, '#9fd7ff', 3, 16, 0.1);
      if (m.isPlayer) B.camKick = 0.6;
      break; }
    case 'salvo': {
      for (let k = 0; k < wt.count; k++) {
        const d = spreadDir(dir.clone(), wt.spread * (wt.homing ? 3 : 1));
        if (wt.arc) d.y += 0.55 + Math.random() * 0.15;
        const lockT = wt.homing ? (m.lockTarget && m.lockLocked ? m.lockTarget : (m.isPlayer ? null : target)) : null;
        B.proj.push({ p: p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6)), v: d.normalize().multiplyScalar(s.speed * (wt.arc ? 0.7 : 1)), owner: m, team: m.team, dmg: s.dmg * dmgK, kind: 'ballistic', life: s.range / s.speed * 1.6, splash: wt.splash || 0, wt: wt.id, missile: true, homing: lockT, aimPt: aim.clone(), delay: k * 0.05, speed: s.speed, arc: wt.arc });
      }
      MW.fx.muzzle(p, dir, '#ffe0a0', 1);
      if (wt.homing && m.lockTarget && m.lockLocked && m.lockTarget.isPlayer) B.mslWarn = 3;
      break; }
    case 'lob': {
      // solve a ballistic arc to the aim point
      const g = B.world.gravity * 0.6; const dx = aim.x - p.x, dz = aim.z - p.z, dy = aim.y - p.y; const hd = Math.hypot(dx, dz);
      const v = s.speed; const v2 = v * v; const disc = v2 * v2 - g * (g * hd * hd + 2 * dy * v2);
      let ang = disc >= 0 ? Math.atan((v2 + Math.sqrt(disc)) / (g * hd)) : Math.PI / 4;
      if (hd < 1) ang = Math.PI / 2.2;
      const vel = new THREE.Vector3(dx / (hd || 1) * Math.cos(ang) * v, Math.sin(ang) * v, dz / (hd || 1) * Math.cos(ang) * v);
      B.proj.push({ p: p.clone(), v: vel, owner: m, team: m.team, dmg: s.dmg * dmgK, kind: 'ballistic', life: 12, splash: wt.splash, wt: wt.id, shell: true, grav: g, size: 0.35, col });
      MW.fx.muzzle(p, UP, '#ffaa55', 1.2);
      break; }
    case 'hitscan': {
      const d = dir.clone(); const len = s.range; const wr = B.world.ray(p, d, len); const tr = rayTargets(p, d, Math.min(len, wr), m.team, m); const db = domeBlock(p, d, tr.t, m.team);
      let end;
      if (db >= 0) { end = p.clone().addScaledVector(d, db); MW.fx.impact(end, 'energy', '#62c8ff', 1.5); }
      else if (tr.target) { end = p.clone().addScaledVector(d, tr.t); damage(tr.target, s.dmg * dmgK, tr.part, 'energy', m, end); MW.fx.impact(end, 'energy', wt.color, 1.6); }
      else { end = p.clone().addScaledVector(d, Math.min(len, wr)); if (wr < len) MW.fx.impact(end, 'ground', wt.color, 1.2); }
      MW.fx.beam(p, end, wt.color, 0.35, 0.35); MW.fx.light(p, wt.color, 3, 20, 0.12);
      for (let k = 0; k < 10; k++) { const q = p.clone().lerp(end, Math.random()); MW.fx.p(true, q.x, q.y, q.z, (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, 0.6, 0.6, 0.1, new THREE.Color(wt.color), new THREE.Color('#ffffff'), 0.8, 0, 1); }
      if (m.isPlayer) B.camKick = 0.5;
      break; }
    case 'chain': {
      // strike the enemy nearest the aim line, then arc to more
      let first = null, bd = 1e9;
      for (const o of B.mechs) { if (!o.alive || o.team === m.team) continue; const c = centerOf(o, V1); const to = V2.subVectors(c, p); const dist = to.length(); if (dist > s.range) continue; const ang = to.normalize().angleTo(dir); if (ang < 8 * DEG && dist < bd && B.world.los(p, c)) { bd = dist; first = o; } }
      let from = p.clone(), cur = first; const hit = new Set();
      if (!cur) { const end = p.clone().addScaledVector(dir, Math.min(s.range, B.world.ray(p, dir, s.range))); MW.fx.bolt(p, end, wt.color, 0.15, 2); }
      for (let k = 0; cur && k <= (wt.chains || 2); k++) {
        const c = centerOf(cur); MW.fx.bolt(from, c, wt.color, 0.2, 3); MW.fx.impact(c, 'energy', wt.color, 1); damage(cur, s.dmg * dmgK * (k ? 0.6 : 1), 'core', 'energy', m, c); hit.add(cur);
        from = c; let nx = null, nd = 45; for (const o of B.mechs) { if (!o.alive || o.team === m.team || hit.has(o)) continue; const d2 = centerOf(o, V1).distanceTo(c); if (d2 < nd) { nd = d2; nx = o; } } cur = nx;
      }
      MW.fx.light(p, wt.color, 3, 18, 0.1);
      break; }
  }
  // heat
  if (m.fx.overload <= 0) m.heat += wt.fire === 'auto' || wt.fire === 'spin' ? s.heat : wt.fire === 'burst' ? s.heat / (wt.burst || 1) : s.heat;
}

function updateWeapons(m, dt, aim, target) {
  const cdK = (m.fx.barrage > 0 ? 2 : 1) * (m.fx.overload > 0 ? 1.3 : 1);
  const canFire = m.alive && m.shutdown <= 0 && !m.dropping;
  for (const w of m.weapons) {
    const wt = w.wt, s = w.s; const trig = canFire && w.alive && m.input.fire[w.group - 1];
    w.cd = Math.max(0, w.cd - dt * cdK);
    if (wt.fire === 'spin') { w.spin = MW.clamp(w.spin + (trig ? dt / wt.spinup : -dt), 0, 1); const mw = m.model.weapons[w.mi]; if (mw) mw.spinRate = w.spin; }
    if (!w.alive) continue;
    // continuous beams
    if (w.beamT > 0) {
      w.beamT -= dt; const p = muzzlePos(m, w, new THREE.Vector3()); const d = new THREE.Vector3().subVectors(aim, p).normalize(); const len = s.range;
      const wr = B.world.ray(p, d, len); const tr = rayTargets(p, d, Math.min(wr, len), m.team, m); const db = domeBlock(p, d, tr.t, m.team);
      let end; const dK = m.fx.focus > 0 ? 1.4 : 1;
      if (db >= 0) { end = p.clone().addScaledVector(d, db); if (Math.random() < 0.4) MW.fx.impact(end, 'energy', '#62c8ff', 0.6); }
      else if (tr.target) { end = p.clone().addScaledVector(d, tr.t); damage(tr.target, s.dmg / wt.dur * dt * dK, tr.part, 'energy', m, end); if (Math.random() < 0.5) MW.fx.impact(end, 'energy', wt.color, 0.6); }
      else { end = p.clone().addScaledVector(d, Math.min(wr, len)); if (wr < len && Math.random() < 0.4) MW.fx.impact(end, 'ground', wt.color, 0.5); }
      if (!w.beam || w.beam.life <= 0) w.beam = MW.fx.beam(p, end, wt.color, wt.size === 'L' ? 0.28 : 0.14, w.beamT + 0.05);
      MW.fx.setBeam(w.beam, p, end); w.beam.life = Math.max(w.beam.life, 0.06);
      if (m.isPlayer) MW.audio.loop('beam' + w.i, 'beam', true, 0.06);
      if (w.beamT <= 0) { w.beam = null; if (m.isPlayer) MW.audio.loop('beam' + w.i, 'beam', false); }
      continue;
    }
    if (wt.fire === 'stream') {
      if (trig && m.heat < m.st.heatCap) {
        const p = muzzlePos(m, w, new THREE.Vector3()); const d = new THREE.Vector3().subVectors(aim, p).normalize();
        MW.fx.flame(p, d, s.range);
        for (const o of B.mechs) { if (!o.alive || o.team === m.team) continue; const c = centerOf(o, V1); const to = V2.subVectors(c, p); const dist = to.length(); if (dist > s.range + o.radius) continue; if (to.normalize().angleTo(d) < 14 * DEG) { damage(o, s.dmg * dt, 'core', 'energy', m, c); o.heat += (wt.targetHeat || 5) * dt; } }
        if (m.fx.overload <= 0) m.heat += s.heat * dt; m.lastFire = B.time; if (m.fx.cloak > 0) m.fx.cloak = 0;
        if (Math.random() < dt * 6) MW.audio.play('flamer', p, 0.6);
      }
      continue;
    }
    if (wt.fire === 'charge') {
      if (trig && w.cd <= 0) { if (w.charge === 0) MW.audio.play('charge', muzzlePos(m, w, V1), 0.5); w.charge += dt; }
      const ready = w.charge >= wt.charge;
      if ((ready && (!trig || !m.isPlayer)) || (w.charge > 0 && !trig && !ready)) { if (ready) { fireOnce(m, w, aim, target); w.cd = 1 / s.rate; } w.charge = 0; }
      continue;
    }
    if (w.burst > 0) { w.burstT -= dt; if (w.burstT <= 0) { fireOnce(m, w, aim, target); w.burst--; w.burstT = wt.gap || 0.08; } continue; }
    if (!trig || w.cd > 0) continue;
    if (m.heat >= m.st.heatCap * 0.995 && m.fx.overload <= 0) continue;
    switch (wt.fire) {
      case 'auto': fireOnce(m, w, aim, target); w.cd = 1 / s.rate; break;
      case 'spin': if (w.spin >= 0.98) { fireOnce(m, w, aim, target); w.cd = 1 / s.rate; } break;
      case 'semi': case 'lob': case 'chain': case 'hitscan': fireOnce(m, w, aim, target); w.cd = 1 / s.rate; break;
      case 'burst': w.burst = wt.burst; w.burstT = 0; w.cd = 1 / s.rate; break;
      case 'salvo': if (wt.minRange && target && centerOf(target, V1).distanceTo(m.pos) < wt.minRange) break; fireOnce(m, w, aim, target); w.cd = 1 / s.rate; break;
      case 'beam': w.beamT = wt.dur; w.cd = 1 / s.rate; if (m.fx.overload <= 0) m.heat += s.heat; MW.audio.play(SOUND_FOR[wt.id], muzzlePos(m, w, V1), 0.8); m.lastFire = B.time; if (m.fx.cloak > 0) m.fx.cloak = 0; break;
    }
  }
}

// ---------------------------------------------------------------- projectiles
function updateProjectiles(dt) {
  const W = B.world; const P = B.proj; const fx = MW.fx;
  fx.beginInstances();
  for (let i = P.length - 1; i >= 0; i--) {
    const q = P[i];
    if (q.delay > 0) { q.delay -= dt; if (q.delay > 0) continue; q.p.copy(muzzleFallback(q)); }
    q.life -= dt;
    if (q.missile) {
      // missiles: accelerate, home toward target, smoke trail
      const tgt = q.homing && q.homing.alive ? centerOf(q.homing, V1) : q.aimPt;
      const desired = V2.subVectors(tgt, q.p); const dist = desired.length(); desired.normalize();
      const turn = q.homing ? 2.6 : (q.arc ? 1.4 : 0.6);
      if (q.arc && q.life > 0 && q.v.y > 0 && dist > 60) desired.y = Math.max(desired.y, 0.35);
      const sp = Math.min(q.speed * 1.4, q.v.length() + dt * 80);
      q.v.normalize().lerp(desired, Math.min(1, dt * turn)).normalize().multiplyScalar(sp);
      if (Math.random() < 0.6) fx.trail(q.p, '#ffb347');
      // AMS on targets
      if (q.homing && q.homing.st && q.homing.st.ams && dist < 60 && Math.random() < q.homing.st.ams * dt * 6) { fx.impact(q.p, 'metal', '#ffd27a', 0.5); fx.tracer(q.p, V3.subVectors(centerOf(q.homing, V1), q.p), 6, 0.08, new THREE.Color('#ffd27a')); P.splice(i, 1); continue; }
    }
    if (q.grav) q.v.y -= q.grav * dt;
    const len = q.v.length() * dt; const d = V3.copy(q.v).normalize();
    let hitT = len, hitTarget = null, hitPart = null, hitKind = null;
    const wr = W.ray(q.p, d, len); if (wr < hitT) { hitT = wr; hitKind = 'world'; }
    const tr = rayTargets(q.p, d, hitT, q.team, q.owner); if (tr.target) { hitT = tr.t; hitTarget = tr.target; hitPart = tr.part; hitKind = 'target'; }
    const db = domeBlock(q.p, d, hitT, q.team); if (db >= 0) { hitT = db; hitKind = 'dome'; hitTarget = null; }
    if (W.water != null && q.p.y > W.water && q.p.y + q.v.y * dt < W.water && hitKind !== 'target') { const t = (q.p.y - W.water) / -q.v.y; if (t < hitT / (q.v.length() || 1)) { const wp = q.p.clone().addScaledVector(q.v, t); for (let k = 0; k < 6; k++) fx.p(false, wp.x, wp.y, wp.z, (Math.random() - 0.5) * 4, 6 + Math.random() * 8, (Math.random() - 0.5) * 4, 1, 0.6, 1.8, new THREE.Color('#d8e8f0'), new THREE.Color('#a8c0d0'), 0.6, 15, 0.5); } }
    if (hitKind || q.life <= 0) {
      const hp = q.p.clone().addScaledVector(d, hitT);
      if (hitKind === 'target') { damage(hitTarget, q.dmg, hitPart, q.kind, q.owner, hp); if (q.emp && !hitTarget.isGen) { hitTarget.fx.emp = 2.5; } }
      if (q.splash) splash(hp, q.splash, q.dmg * 0.6, q.owner, q.team, hitTarget);
      const big = q.splash >= 6 || q.wt === 'ac20';
      if (q.missile || q.shell || big) { fx.explosion(hp, q.shell ? 1.2 : big ? 1 : 0.45, { groundY: W.heightAt(hp.x, hp.z) }); MW.audio.play(q.missile ? 'explode' : 'explode', hp, q.missile ? 0.35 : 0.8); }
      else if (hitKind === 'dome') fx.impact(hp, 'energy', '#62c8ff', 0.8);
      else if (hitKind === 'target') fx.impact(hp, q.orb || q.kind === 'energy' ? 'energy' : 'metal', q.col ? '#' + q.col.getHexString() : null, q.slug ? 2 : 1);
      else if (hitKind === 'world') { fx.impact(hp, q.orb ? 'energy' : 'ground', q.col ? '#' + q.col.getHexString() : null, q.slug ? 2 : 0.8); if (q.slug || q.wt === 'ac5') fx.decal(hp.x, W.heightAt(hp.x, hp.z), hp.z, 1.2); }
      if (q.wt === 'ppc' && hitKind) { for (let k = 0; k < 3; k++) fx.bolt(hp, hp.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8)), '#9fd7ff', 0.15, 1.5); }
      P.splice(i, 1); continue;
    }
    q.p.addScaledVector(q.v, dt);
    // render
    if (q.missile) fx.missile(q.p, q.v);
    else if (q.shell) fx.orb(q.p, 0.35, q.col);
    else if (q.orb) { fx.orb(q.p, q.size, q.col); if (q.wt === 'plasma' && Math.random() < 0.5) fx.p(true, q.p.x, q.p.y, q.p.z, 0, 0, 0, 0.25, 1.5, 0.2, q.col, q.col, 0.7, 0, 0); }
    else if (q.slug) { fx.tracer(q.p, q.v, 14, 0.25, q.col); fx.p(true, q.p.x, q.p.y, q.p.z, 0, 0, 0, 0.3, 0.6, 0.1, q.col, q.col, 0.6, 0, 0); }
    else fx.tracer(q.p, q.v, Math.min(len * 1.6, q.wt === 'mg' || q.wt === 'rac' ? 5 : 8), q.size, q.col);
  }
  fx.endInstances();
}
function muzzleFallback(q) { return q.owner && q.owner.alive ? centerOf(q.owner, V1).add(V2.set(0, 2, 0)) : q.p; }
function splash(pos, r, dmg, owner, team, direct) {
  for (const m of B.mechs) { if (!m.alive || m.team === team || m === direct) continue; const c = centerOf(m, V1); const d = c.distanceTo(pos) - m.radius; if (d < r) damage(m, dmg * (1 - Math.max(0, d) / r), d < 2 ? 'core' : 'legs', 'ballistic', owner, c, true); }
  for (const g of B.gens) { if (!g.alive || g.team === team) continue; const d = g.c.distanceTo(pos) - g.r; if (d < r) damage(g, dmg * (1 - Math.max(0, d) / r), 'core', 'ballistic', owner); }
}

// ---------------------------------------------------------------- abilities
function useAbility(m) {
  const ab = m.cls.ability; if (m.ability.cd > 0 || !m.alive || m.shutdown > 0) return false;
  m.ability.cd = ab.cd; m.abilities++;
  const c = centerOf(m);
  MW.audio.play('ability', c, m.isPlayer ? 0.7 : 0.5);
  switch (ab.id) {
    case 'overdrive': m.fx.overdrive = ab.dur; break;
    case 'barrage': m.fx.barrage = ab.dur; break;
    case 'fortify': m.fx.fortify = ab.dur; MW.fx.ring(m.pos, 14, '#ffd27a', 0.6); break;
    case 'focus': m.fx.focus = ab.dur; break;
    case 'cloak': m.fx.cloak = ab.dur; MW.fx.ring(c, 10, '#9b6bff', 0.5); break;
    case 'barrier': { const dm = { pos: m.pos.clone().add(new THREE.Vector3(0, 2, 0)), r: 18, team: m.team, t: ab.dur }; dm.mesh = new THREE.Mesh(new THREE.SphereGeometry(dm.r, 32, 16), new THREE.MeshBasicMaterial({ color: TEAM_COL[m.team], transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); dm.mesh.position.copy(dm.pos); B.scene.add(dm.mesh); B.domes.push(dm); break; }
    case 'flight': m.fx.flight = ab.dur; break;
    case 'ram': m.fx.ram = ab.dur; m.rammed = new Set(); break;
    case 'overload': m.fx.overload = ab.dur; m.heat = Math.max(0, m.heat - m.st.heatCap * 0.3); break;
    case 'artillery': {
      const tgt = m.isPlayer ? B.aimPoint.clone() : (m.ai && m.ai.target ? centerOf(m.ai.target) : c.clone().addScaledVector(fwd(m.yaw), 120));
      B.strikes.push({ pos: tgt, t: 2.5, n: 8, team: m.team, owner: m, dmg: 30 * (1 + 0.3 * m.tier) });
      if (m.team !== B.playerTeam && B.player && B.player.alive && B.player.pos.distanceTo(tgt) < 40) announce('INCOMING ARTILLERY', 'bad');
      MW.fx.light(tgt, '#ff3030', 4, 30, 2.5);
      break; }
  }
  return true;
}

// ---------------------------------------------------------------- mech physics
function updateMech(m, dt) {
  const W = B.world; const st = m.st; const inp = m.input;
  // timers
  for (const k in m.fx) if (m.fx[k] > 0) m.fx[k] = Math.max(0, m.fx[k] - dt);
  m.ability.cd = Math.max(0, m.ability.cd - dt);
  if (m.spawnProt > 0) m.spawnProt -= dt;
  // heat
  const inWater = W.water != null && m.pos.y < W.water - 0.5;
  const diss = st.diss * (inWater ? 1.7 : 1) * (m.shutdown > 0 ? 2.2 : 1);
  m.heat = Math.max(0, m.heat - diss * dt);
  if (m.fx.overload > 0) m.heat = Math.max(0, m.heat - st.diss * dt);
  if (m.heat >= st.heatCap && m.shutdown <= 0 && m.fx.overload <= 0) { m.shutdown = 3.5; if (m.isPlayer) { MW.audio.play('shutdown'); announce('REACTOR SHUTDOWN — OVERHEAT', 'bad'); } }
  if (m.shutdown > 0) { m.shutdown -= dt; if (m.shutdown <= 0 && m.isPlayer) MW.audio.play('powerup'); }
  if (m.heat > st.heatCap * 1.15) { damage(m, (m.heat - st.heatCap) * dt * 2, 'core', null, null); }
  // repair & shield regen
  if (st.repair && B.time - m.lastHit > 5) { for (const p of ['armL', 'armR', 'legs', 'core']) if (m.hp[p] > 0) m.hp[p] = Math.min(m.st.hp[p], m.hp[p] + st.repair * dt); }
  if (st.shield && B.time - m.lastHit > 4) m.shield = Math.min(st.shield, m.shield + st.shield * 0.15 * dt);
  // hazards
  const gh = W.heightAt(m.pos.x, m.pos.z);
  if (m.onGround && W.lava != null && gh < W.lava + 0.3) { damage(m, 14 * dt, 'legs', null, null); m.heat += 20 * dt; if (Math.random() < dt * 10) MW.fx.fire(m.pos, 1.5); }
  if (m.onGround && W.toxic != null && gh < W.toxic + 0.3) { damage(m, 9 * dt, 'legs', null, null); }
  // movement
  const legsDead = m.hp.legs <= 0;
  let maxSp = st.speed * (legsDead ? 0.4 : 1) * (m.fx.overdrive > 0 ? 1.6 : 1) * (m.fx.fortify > 0 ? 0.6 : 1) * (m.fx.emp > 0 ? 0.6 : 1) * (inWater ? 0.72 : 1) * (m.carrying ? 0.85 : 1);
  if (st.hotSpeed && m.heat > st.heatCap * 0.6) maxSp *= 1 + st.hotSpeed;
  const turnRate = st.turn * (m.fx.overdrive > 0 ? 1.6 : 1) * (legsDead ? 0.6 : 1);
  const can = m.shutdown <= 0 && !m.dropping;
  let target = 0;
  if (can) {
    if (m.fx.ram > 0) { target = maxSp * 2.2; }
    else if (inp.move != null) {
      // walk toward a world-space direction; legs turn to face it
      let want = inp.move; if (inp.back) want = wrapA(want + Math.PI);
      const diff = wrapA(want - m.yaw); m.yaw = wrapA(m.yaw + MW.clamp(diff, -turnRate * dt, turnRate * dt));
      const align = Math.max(0, Math.cos(diff)); target = (inp.back ? -0.6 : 1) * maxSp * inp.throttle * align * align;
    } else {
      m.yaw = wrapA(m.yaw + inp.turn * turnRate * dt);
      target = inp.throttle * maxSp * (inp.throttle < 0 ? 0.6 : 1);
    }
  }
  const acc = st.accel * (m.onGround ? 1 : 0.3);
  m.speed += MW.clamp(target - m.speed, -acc * dt * 1.6, acc * dt);
  // torso twist toward aim
  const twWant = MW.clamp(wrapA(m.aimYaw - m.yaw), -st.twistMax, st.twistMax);
  const twRate = st.twistRate * (m.isPlayer ? 3 : 1);
  m.twist += MW.clamp(twWant - m.twist, -twRate * dt, twRate * dt);
  if (m.isPlayer && B.scheme === 'classic') { m.twist = twWant; m.aimYaw = wrapA(m.yaw + m.twist); }
  m.pitch += MW.clamp(m.aimPitch - m.pitch, -2 * dt, 2 * dt);
  // horizontal motion
  const f = fwd(m.yaw, V1);
  const nx = m.pos.x + f.x * m.speed * dt, nz = m.pos.z + f.z * m.speed * dt;
  const oh = groundAt(m.pos.x, m.pos.z, m.pos.y), nh = groundAt(nx, nz, m.pos.y);
  const step = Math.hypot(nx - m.pos.x, nz - m.pos.z);
  if (!m.onGround || step < 1e-5 || (nh - oh) / step < 1.15 || nh < oh) { m.pos.x = nx; m.pos.z = nz; }
  else { // slide along the slope
    const nh1 = groundAt(nx, m.pos.z, m.pos.y); if ((nh1 - oh) / Math.max(1e-4, Math.abs(nx - m.pos.x)) < 1.15) m.pos.x = nx;
    const nh2 = groundAt(m.pos.x, nz, m.pos.y); if ((nh2 - oh) / Math.max(1e-4, Math.abs(nz - m.pos.z)) < 1.15) m.pos.z = nz;
    m.speed *= 0.8;
  }
  // vertical: jets, gravity
  const jetting = can && ((inp.jump && m.jumpFuel > 0) || m.fx.flight > 0);
  if (jetting) {
    const thrust = B.world.gravity * (m.fx.flight > 0 ? 1.4 : 1.9 * st.jumpThrust);
    m.vel.y = Math.min(m.vel.y + thrust * dt, m.fx.flight > 0 ? 9 : 16);
    if (m.fx.flight <= 0) m.jumpFuel = Math.max(0, m.jumpFuel - dt);
    m.jet = Math.min(1, m.jet + dt * 6);
    if (m.fx.flight > 0) m.speed = Math.max(m.speed, st.speed * 1.5);
  } else m.jet = Math.max(0, m.jet - dt * 4);
  if (m.dropping) { m.jet = m.pos.y - groundAt(m.pos.x, m.pos.z, 1e9) < 35 ? 1 : 0.3; m.vel.y = Math.max(m.vel.y - B.world.gravity * 0.3 * dt, m.pos.y - groundAt(m.pos.x, m.pos.z, 1e9) < 35 ? -8 : -30); }
  else m.vel.y -= B.world.gravity * dt;
  m.pos.y += m.vel.y * dt;
  const g = groundAt(m.pos.x, m.pos.z, m.pos.y);
  if (m.pos.y <= g) {
    if (!m.onGround && m.vel.y < -6) { const k = Math.min(1, -m.vel.y / 30); MW.fx.dust(m.pos, 3 * m.sc * (0.5 + k), B.world.th.pal[1]); MW.audio.play('land', m.pos, 0.5 + k * 0.5); if (m.isPlayer) B.camShake = Math.min(1.2, B.camShake + k); if (m.vel.y < -24 && !m.dropping) damage(m, (-m.vel.y - 24) * 1.5, 'legs', null, null); if (m.dropping) { MW.fx.ring(m.pos, 14 * m.sc, '#ffffff', 0.6); } }
    m.pos.y = g; m.vel.y = 0; m.onGround = true; m.dropping = false;
    if (st.jumpFuel) m.jumpFuel = Math.min(st.jumpFuel, m.jumpFuel + dt * 0.35 * st.jumpRegen);
  } else m.onGround = m.pos.y - g < 0.05;
  if (m.onGround && W.water != null && m.pos.y < W.water && Math.abs(m.speed) > 2 && Math.random() < dt * 4) MW.fx.p(false, m.pos.x, W.water, m.pos.z, (Math.random() - 0.5) * 3, 3, (Math.random() - 0.5) * 3, 1, 1, 3, new THREE.Color('#d0dde6'), new THREE.Color('#a0b0c0'), 0.5, 8, 1);
  // collisions with world and other mechs
  if (W.collide(m.pos, m.radius, m.pos.y + 0.5)) m.speed *= 0.9;
  for (const o of B.mechs) {
    if (o === m || !o.alive) continue; const dx = m.pos.x - o.pos.x, dz = m.pos.z - o.pos.z; const d = Math.hypot(dx, dz); const rr = m.radius + o.radius;
    if (d < rr && d > 1e-3 && Math.abs(m.pos.y - o.pos.y) < 8) {
      const push = (rr - d) * 0.5; m.pos.x += dx / d * push; m.pos.z += dz / d * push;
      if (m.fx.ram > 0 && o.team !== m.team && !m.rammed.has(o)) { m.rammed.add(o); damage(o, 90 * (1 + 0.3 * m.tier), 'core', 'ballistic', m, centerOf(o)); o.speed = -6; MW.fx.explosion(centerOf(o).lerp(centerOf(m), 0.5), 0.8, { ground: false }); MW.audio.play('ac20', o.pos); }
    }
  }
  const S = W.S * 0.97; m.pos.x = MW.clamp(m.pos.x, -S, S); m.pos.z = MW.clamp(m.pos.z, -S, S);
  // regen jets on ground
  // animate model
  const md = m.model; md.root.position.copy(m.pos); md.root.rotation.y = m.yaw;
  const steps = MW.mechs.animate(md, dt, { speed: m.speed, maxSpeed: st.speed, twist: m.twist, pitch: m.pitch, turn: Math.abs(inp.turn || 0) * 0.5, jet: m.jet, air: !m.onGround, heat: m.heat / st.heatCap, t: B.time, crouch: m.fx.fortify > 0 ? 0.25 : 0 });
  if (steps.length) {
    const near = !m.isPlayer && B.cam.position.distanceTo(m.pos) < 150;
    if (m.isPlayer || near) MW.audio.play('step', m.pos, (m.isPlayer ? 0.5 : 0.9) * MW.clamp(m.sc, 0.6, 1.6));
    if (m.isPlayer) { B.camShake = Math.min(1, B.camShake + 0.12 * m.sc); B.stepBump = 1; }
    if (near || m.isPlayer) MW.fx.dust(m.pos, 1.6 * m.sc, W.th.pal[1]);
  }
  if (m.jet > 0.05 && md.jets.length && Math.random() < 0.6) { const j = md.jets[(Math.random() * md.jets.length) | 0]; j.getWorldPosition(V2); MW.fx.jetwash(V2, m.build.jet ? m.build.jet.color : '#ff9a3a'); }
  // damage smoke
  if (m.hp.core < m.st.hp.core * 0.4 && Math.random() < dt * 6) MW.fx.smoke(centerOf(m, V2), 0.8 * m.sc, true);
  if (m.hp.core < m.st.hp.core * 0.2 && Math.random() < dt * 4) MW.fx.sparks(centerOf(m, V2), 4);
  // cloak & shield visuals
  setCloak(m, m.fx.cloak > 0);
}
function setCloak(m, on) {
  if (m._cloak === on) return; m._cloak = on;
  const ms = m.model.mats; [ms.p, ms.s, ms.a].forEach(mt => { mt.transparent = on; mt.opacity = on ? (m.team === B.playerTeam ? 0.35 : 0.08) : 1; mt.needsUpdate = true; });
  m.model.root.traverse(o => { if (o.isMesh && !o.material.transparent) { o.visible = !on || m.team === B.playerTeam || o.material === ms.p || o.material === ms.s; } });
  m.model.root.traverse(o => { if (o.isMesh) o.castShadow = !on; });
}
function updateDead(m, dt) {
  m.deadT += dt; const md = m.model; const k = Math.min(1, m.deadT / 1.4); const e = k * k;
  md.root.rotation.z = m.fallDir * e * 1.35; md.root.rotation.x = e * 0.3;
  md.root.position.y = m.pos.y - e * m.sc * 1.5;
  if (m.deadT < 0.05) { [md.mats.p, md.mats.s, md.mats.a].forEach(mt => { mt.color.multiplyScalar(0.25); if (mt.map) mt.color.setScalar(0.22); }); md.mats.vent.emissiveIntensity = 0; }
  if (m.deadT < 9 && Math.random() < dt * 8) MW.fx.smoke(centerOf(m, V2).setY(m.pos.y + 3), 1.2 * m.sc, true);
  if (m.deadT < 5 && Math.random() < dt * 6) MW.fx.fire(V2.set(m.pos.x, m.pos.y + 2, m.pos.z), 1.5 * m.sc);
  if (B.respawnTime >= 0 && !B.over) { m.respawn -= dt; if (m.respawn <= 0 && B.canRespawn(m)) spawnMech(m, true); }
}

// ---------------------------------------------------------------- AI
function initAI(m) { const sk = m.tier; m.ai = { thinkT: Math.random(), target: null, goal: null, path: null, pathT: 0, wp: 0, err: new THREE.Vector3(), errT: 0, sigma: (3.4 - sk * 0.38) * DEG, react: 0.55 - sk * 0.06, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 0, stuckT: 0, lastPos: new THREE.Vector3(), seen: 0, losT: 0, los: false, role: Math.floor(Math.random() * 3), lockT: 0 }; }
function engageRange(m) { let r = 0, n = 0; m.weapons.forEach(w => { if (w.alive) { r += w.s.range * (w.wt.homing ? 0.5 : 0.65); n++; } }); return MW.clamp(n ? r / n : 150, 50, 380); }
function aiThink(m) {
  const ai = m.ai, W = B.world; const me = centerOf(m);
  // target selection
  let best = null, bs = 1e9;
  for (const o of B.mechs) {
    if (!o.alive || o.team === m.team) continue; const c = centerOf(o, V1); const d = c.distanceTo(me);
    if (o.fx.cloak > 0 && d > 45) continue;
    if (d > m.st.radar * (o.st.ecm ? 0.75 : 1) && B.time - o.lastFire > 2) continue;
    let s = d - (o === ai.target ? 60 : 0) - (o.carrying ? 150 : 0) + (o.hp.core / o.st.hp.core) * 40 - (o.isPlayer ? 15 : 0);
    if (s < bs) { bs = s; best = o; }
  }
  if (best && best !== ai.target) { ai.target = best; ai.seen = -ai.react; }
  if (!best) ai.target = null;
  if (ai.target) { ai.los = W.los(me, centerOf(ai.target, V1)); }
  // objective goal
  const S = W.S; let goal = null; const mode = B.mode;
  if (mode === 'dom') {
    const pts = B.points; let pick = pts[ai.role % 3];
    const contested = pts.filter(p => p.owner !== m.team); if (contested.length && (pick.owner === m.team) && Math.random() < 0.6) pick = contested[(m.id) % contested.length];
    goal = { x: pick.x + (Math.random() - 0.5) * 18, z: pick.z + (Math.random() - 0.5) * 18 };
  } else if (mode === 'heist') {
    const core = B.core;
    if (m.carrying) goal = W.bases[m.team];
    else if (core.carrier && core.carrier.team === m.team) { const c = core.carrier.pos; goal = { x: c.x + (Math.random() - 0.5) * 30, z: c.z + (Math.random() - 0.5) * 30 }; }
    else if (core.carrier) { goal = { x: core.carrier.pos.x, z: core.carrier.pos.z }; ai.target = core.carrier; }
    else { goal = { x: core.pos.x, z: core.pos.z }; }
  } else if (mode === 'siege') {
    const gens = B.gens.filter(g => g.alive);
    if (m.team === B.attackers && gens.length) { const g = gens.reduce((a, b) => (a.c.distanceTo(me) < b.c.distanceTo(me) ? a : b)); const r = engageRange(m) * 0.7; const ang = Math.atan2(me.x - g.c.x, me.z - g.c.z) + (Math.random() - 0.5) * 0.6; goal = { x: g.c.x + Math.sin(ang) * r, z: g.c.z + Math.cos(ang) * r }; if (!ai.target || centerOf(ai.target, V1).distanceTo(me) > 140) ai.genTarget = g; else ai.genTarget = null; }
    else if (gens.length) { const g = gens[m.id % gens.length]; goal = { x: g.c.x + (Math.random() - 0.5) * 40, z: g.c.z - (m.team === 0 ? -1 : 1) * 25 + (Math.random() - 0.5) * 20 }; }
  }
  if (ai.target && (!goal || mode === 'tdm' || mode === 'att' || centerOf(ai.target, V1).distanceTo(me) < engageRange(m) * 1.1)) {
    const tc = centerOf(ai.target, V1); const er = engageRange(m); const d = Math.hypot(tc.x - me.x, tc.z - me.z);
    if (ai.los && d < er * 1.3) { // orbit / strafe at engagement range
      if ((ai.strafeT -= 0.3) < 0) { ai.strafe *= -1; ai.strafeT = 2 + Math.random() * 4; }
      const ang = Math.atan2(me.x - tc.x, me.z - tc.z) + ai.strafe * 0.5; const rr = MW.lerp(d, er * 0.8, 0.5);
      goal = { x: tc.x + Math.sin(ang) * rr, z: tc.z + Math.cos(ang) * rr };
    } else if (!goal || mode === 'tdm' || mode === 'att') goal = { x: tc.x, z: tc.z };
  }
  if (!goal) { // wander toward the enemy side
    const eb = W.bases[1 - m.team]; goal = { x: eb.x * 0.3 + (Math.random() - 0.5) * S, z: eb.z * 0.3 + (Math.random() - 0.5) * S * 0.6 };
  }
  // retreat when crippled
  if (m.hp.core < m.st.hp.core * 0.22 && mode !== 'att' && Math.random() < 0.5 && !m.carrying) { const b = W.bases[m.team]; goal = { x: b.x + (Math.random() - 0.5) * 30, z: b.z }; }
  // path
  const gd = ai.goal ? Math.hypot(goal.x - ai.goal.x, goal.z - ai.goal.z) : 1e9;
  if (!ai.path || gd > 12 || B.time > ai.pathT) {
    ai.goal = goal; ai.pathT = B.time + 3 + Math.random() * 2;
    ai.path = W.walkLine(m.pos, goal) ? [goal] : (W.path(m.pos, goal) || [goal]); ai.wp = 0;
  }
  // abilities
  const ab = m.cls.ability.id; const tdist = ai.target ? centerOf(ai.target, V1).distanceTo(me) : 1e9;
  if (m.ability.cd <= 0) {
    if ((ab === 'overdrive' && (tdist > 250 || m.carrying)) || ((ab === 'barrage' || ab === 'overload' || ab === 'focus') && ai.los && tdist < engageRange(m)) || (ab === 'fortify' && m.hp.core < m.st.hp.core * 0.6 && B.time - m.lastHit < 2) || (ab === 'cloak' && ai.target && tdist > 80 && tdist < 300) || (ab === 'barrier' && B.time - m.lastHit < 1.5) || (ab === 'flight' && (ai.stuckT > 1 || (ai.los && tdist < 200 && Math.random() < 0.3))) || (ab === 'ram' && ai.los && tdist < 60) || (ab === 'artillery' && ai.target && tdist < 420 && tdist > 60)) useAbility(m);
  }
}
function aiUpdate(m, dt) {
  const ai = m.ai; const inp = m.input;
  ai.thinkT -= dt; if (ai.thinkT <= 0) { ai.thinkT = 0.3 + Math.random() * 0.25; aiThink(m); }
  // follow path
  inp.move = null; inp.throttle = 0; inp.back = false;
  if (ai.path && ai.path.length) {
    let wp = ai.path[ai.wp]; while (wp && Math.hypot(wp.x - m.pos.x, wp.z - m.pos.z) < Math.max(6, m.radius * 1.5) && ai.wp < ai.path.length - 1) wp = ai.path[++ai.wp];
    if (wp) { const d = Math.hypot(wp.x - m.pos.x, wp.z - m.pos.z); if (d > 4 || ai.wp < ai.path.length - 1) { inp.move = Math.atan2(wp.x - m.pos.x, wp.z - m.pos.z); inp.throttle = MW.clamp(d / 15, 0.35, 1); } }
  }
  // separation from allies
  if (inp.move != null) { let sx = 0, sz = 0; for (const o of B.mechs) { if (o === m || !o.alive || o.team !== m.team) continue; const dx = m.pos.x - o.pos.x, dz = m.pos.z - o.pos.z; const d = Math.hypot(dx, dz); if (d < 14 && d > 0.01) { sx += dx / d * (14 - d); sz += dz / d * (14 - d); } } if (sx || sz) { const mv = fwd(inp.move, V1).multiplyScalar(14).add(V2.set(sx, 0, sz)); inp.move = Math.atan2(mv.x, mv.z); } }
  // stuck detection
  ai.stuckT = inp.throttle > 0.3 && m.pos.distanceTo(ai.lastPos) < 1.2 * dt * 10 ? ai.stuckT + dt : Math.max(0, ai.stuckT - dt * 2);
  ai.lastPos.copy(m.pos);
  inp.jump = (ai.stuckT > 1.2 && m.jumpFuel > 0.2) || (inp.jump && m.jumpFuel > 0.1 && !m.onGround && ai.stuckT > 0.5);
  if (ai.stuckT > 3) { ai.path = null; ai.stuckT = 0; ai.strafe *= -1; }
  // aim & fire
  inp.fire[0] = inp.fire[1] = false;
  const tgt = ai.genTarget && ai.genTarget.alive && !ai.target ? ai.genTarget : ai.target;
  if (tgt && (tgt.isGen || tgt.alive)) {
    const me = centerOf(m, V1).clone(); const tc = tgt.isGen ? tgt.c.clone() : centerOf(tgt);
    const dist = me.distanceTo(tc);
    // lead the target with the main weapon's projectile speed
    const pw = m.weapons.find(w => w.alive && w.s.speed > 0); if (pw && !tgt.isGen) { const tt = dist / pw.s.speed; tc.x += Math.sin(tgt.yaw) * tgt.speed * tt * 0.9; tc.z += Math.cos(tgt.yaw) * tgt.speed * tt * 0.9; }
    ai.errT -= dt; if (ai.errT <= 0) { ai.errT = 0.4 + Math.random() * 0.6; const s = ai.sigma * dist; ai.err.set((Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * 2 * s); }
    tc.add(ai.err);
    m.aimYaw = Math.atan2(tc.x - me.x, tc.z - me.z); m.aimPitch = Math.atan2(tc.y - me.y, Math.hypot(tc.x - me.x, tc.z - me.z));
    if (Math.abs(wrapA(m.aimYaw - m.yaw)) > m.st.twistMax * 0.9 && inp.move == null) { inp.move = m.aimYaw; inp.throttle = 0.05; }
    ai.seen += dt;
    const los = tgt.isGen ? true : ai.los;
    // lock-on for LRMs
    if (los && dist < 760) { ai.lockT += dt; } else ai.lockT = 0;
    m.lockTarget = tgt.isGen ? null : tgt; m.lockLocked = ai.lockT > 1.3 * m.st.lock * (tgt.st && tgt.st.ecm ? 1 + tgt.st.ecm : 1);
    if (m.lockLocked && tgt.isPlayer && !B.lockWarnT) { B.lockWarn = 1.5; }
    const twistOK = Math.abs(wrapA(m.aimYaw - m.yaw - m.twist)) < 6 * DEG;
    if ((los || m.lockLocked) && ai.seen > 0 && twistOK && m.heat < m.st.heatCap * 0.82) {
      for (const w of m.weapons) { if (!w.alive) continue; const inR = dist < w.s.range * 0.95 && !(w.wt.minRange && dist < w.wt.minRange); const indirect = w.wt.homing && m.lockLocked; if (inR && (los || indirect)) inp.fire[w.group - 1] = true; }
    }
  } else { m.aimYaw = inp.move != null ? inp.move : m.yaw; m.aimPitch = 0; m.lockLocked = false; }
}

// ---------------------------------------------------------------- modes
function setupMode() {
  const mode = B.mode, W = B.world; const n = B.teamSize;
  B.score = [0, 0]; B.respawnTime = 7; B.maxTime = 600; B.target = 0;
  B.canRespawn = () => true;
  if (mode === 'tdm') { B.target = Math.min(60, n * 4); B.respawnTime = 6; }
  if (mode === 'dom') { B.target = 300; B.points = W.points.map(p => ({ x: p.x, z: p.z, name: p.name, owner: -1, prog: 0, r: 17, h: W.heightAt(p.x, p.z) })); B.points.forEach(p => { p.mesh = pointMesh(p); }); }
  if (mode === 'att') { B.respawnTime = -1; B.maxTime = 720; }
  if (mode === 'heist') { B.target = 3; const c = { x: 0, z: 0 }; B.core = { pos: new THREE.Vector3(c.x, W.heightAt(c.x, c.z) + 2, c.z), carrier: null, dropT: 0, home: new THREE.Vector3(c.x, W.heightAt(c.x, c.z) + 2, c.z) }; B.core.mesh = coreMesh(); B.scene.add(B.core.mesh); W.bases.forEach((b, i) => { const r = new THREE.Mesh(new THREE.RingGeometry(16, 18, 40), new THREE.MeshBasicMaterial({ color: TEAM_COL[i], transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.set(b.x, W.heightAt(b.x, b.z) + 0.3, b.z); B.scene.add(r); }); }
  if (mode === 'siege') {
    B.attackers = Math.random() < 0.5 ? 0 : 1; const def = 1 - B.attackers; B.maxTime = 600;
    B.tickets = n * 3; B.target = 3;
    W.gens.forEach(g => { const z = def === 1 ? g.z : -g.z; B.gens.push(makeGen(g.x, z, def)); });
    B.canRespawn = m => m.team !== B.attackers || B.tickets > 0;
  }
}
function pointMesh(p) {
  const g = new THREE.Group(); g.position.set(p.x, p.h, p.z);
  const ring = new THREE.Mesh(new THREE.RingGeometry(p.r - 0.8, p.r, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.4; g.add(ring);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 14, 8), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.7, roughness: 0.4 })); pole.position.y = 7; g.add(pole);
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(1.4), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 2 })); beacon.position.y = 15.5; g.add(beacon);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 120, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.y = 75; g.add(beam);
  const lbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: MW.tex.label(p.name, '#ffffff', null, 64, 64), depthWrite: false })); lbl.position.y = 19; lbl.scale.setScalar(4); g.add(lbl);
  B.scene.add(g); return { g, ring, beacon, beam };
}
function coreMesh() { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 0), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd02a, emissiveIntensity: 2.5, flatShading: true })); g.add(c); const h = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.12, 6, 30), new THREE.MeshBasicMaterial({ color: 0xffd02a })); g.add(h); const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 100, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd02a, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.y = 50; g.add(beam); g.userData.c = c; g.userData.h = h; return g; }
function makeGen(x, z, team) {
  const W = B.world; const y = W.heightAt(x, z); const g = { isGen: true, team, alive: true, hp: 7000 * (1 + 0.7 * B.tier), maxHp: 0, c: new THREE.Vector3(x, y + 7, z), r: 6.5, x, z, name: 'Generator' }; g.maxHp = g.hp;
  const mesh = new THREE.Group(); mesh.position.set(x, y, z);
  const base = new THREE.Mesh(MW.mechs.geo.bbox(10, 3, 10, 0.5), new THREE.MeshStandardMaterial({ color: 0x4a4e54, metalness: 0.7, roughness: 0.4 })); base.position.y = 1.5; mesh.add(base);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3, 10, 12), new THREE.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.7, roughness: 0.4 })); col.position.y = 8; mesh.add(col);
  const core = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(TEAM_COL[team]), emissiveIntensity: 2.2 })); core.position.y = 14; mesh.add(core);
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(3.6 + i * 0.4, 0.15, 6, 30), new THREE.MeshBasicMaterial({ color: TEAM_COL[team] })); r.position.y = 14; r.rotation.x = Math.PI / 2 + i * 0.5; mesh.add(r); }
  const shell = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), new THREE.MeshBasicMaterial({ color: TEAM_COL[team], transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false })); shell.position.y = 8; mesh.add(shell);
  mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  B.scene.add(mesh); g.mesh = mesh; g.core = core;
  const wreck = new THREE.Mesh(MW.mechs.geo.bbox(10, 3, 10, 0.5), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })); wreck.position.set(x, y + 1.5, z); wreck.visible = false; B.scene.add(wreck); g.wreck = wreck;
  B.world.helpers.addObs({ type: 'cyl', x, z, r: 5, h: 3, y0: y - 1, top: y + 3 });
  return g;
}
function dropCore(m) { const c = B.core; c.carrier = null; m.carrying = false; c.pos.set(m.pos.x, B.world.heightAt(m.pos.x, m.pos.z) + 2, m.pos.z); c.dropT = 20; announce('DATA CORE DROPPED', 'neutral'); }
function updateMode(dt) {
  const mode = B.mode, W = B.world;
  if (mode === 'dom') {
    B.points.forEach(p => {
      const cnt = [0, 0]; B.mechs.forEach(m => { if (m.alive && Math.hypot(m.pos.x - p.x, m.pos.z - p.z) < p.r) cnt[m.team]++; });
      const net = Math.min(3, cnt[0]) - Math.min(3, cnt[1]);
      if (net && !(cnt[0] && cnt[1])) {
        const prev = p.owner; p.prog = MW.clamp(p.prog + net * 0.09 * dt, -1, 1);
        if (p.prog >= 1 && p.owner !== 0) { p.owner = 0; capEvent(p, 0, prev); } else if (p.prog <= -1 && p.owner !== 1) { p.owner = 1; capEvent(p, 1, prev); }
        else if (p.owner === 0 && p.prog < 0) p.owner = -1; else if (p.owner === 1 && p.prog > 0) p.owner = -1;
      }
      if (p.owner >= 0) B.score[p.owner] += dt;
      const col = p.owner >= 0 ? TEAM_COL[p.owner] : (p.prog > 0.02 ? TEAM_COL[0] : p.prog < -0.02 ? TEAM_COL[1] : '#ffffff');
      p.mesh.ring.material.color.set(col); p.mesh.beacon.material.emissive.set(col); p.mesh.beam.material.color.set(col); p.mesh.beacon.rotation.y += dt;
    });
    for (let t = 0; t < 2; t++) if (B.score[t] >= B.target) return endMatch(t);
  } else if (mode === 'tdm') { for (let t = 0; t < 2; t++) if (B.score[t] >= B.target) return endMatch(t); }
  else if (mode === 'att') { for (let t = 0; t < 2; t++) if (!B.mechs.some(m => m.team === t && m.alive) && B.time > 5) return endMatch(1 - t); }
  else if (mode === 'heist') {
    const c = B.core; c.mesh.userData.c.rotation.y += dt * 2; c.mesh.userData.h.rotation.x += dt;
    if (c.carrier) { if (!c.carrier.alive) dropCore(c.carrier); else { c.pos.copy(centerOf(c.carrier)).add(V1.set(0, c.carrier.model.hit.coreR * c.carrier.sc + 3, 0)); const b = W.bases[c.carrier.team]; if (Math.hypot(c.carrier.pos.x - b.x, c.carrier.pos.z - b.z) < 18) { const m = c.carrier; B.score[m.team]++; m.heistCaps++; m.obj += 3; m.score += 300; m.carrying = false; c.carrier = null; c.pos.copy(c.home); c.dropT = 0; feed(m, null, 'captured the data core'); announce(m.team === B.playerTeam ? 'DATA CORE CAPTURED' : 'ENEMY CAPTURED THE CORE', m.team === B.playerTeam ? 'good' : 'bad'); MW.audio.play('capture'); if (B.score[m.team] >= B.target) return endMatch(m.team); } } }
    else {
      if (c.dropT > 0) { c.dropT -= dt; if (c.dropT <= 0) { c.pos.copy(c.home); announce('DATA CORE RESET', 'neutral'); } }
      for (const m of B.mechs) if (m.alive && !m.dropping && m.pos.distanceTo(c.pos) < 10 + m.radius) { c.carrier = m; m.carrying = true; m.obj++; announce(m.team === B.playerTeam ? (m.isPlayer ? 'YOU HAVE THE CORE — RETURN TO BASE' : 'ALLY HAS THE CORE') : 'ENEMY HAS THE CORE', m.team === B.playerTeam ? 'good' : 'bad'); MW.audio.play('capture', null, 0.6); break; }
    }
    c.mesh.position.copy(c.pos);
  } else if (mode === 'siege') {
    B.gens.forEach(g => { if (g.alive) { g.core.rotation.y += dt; g.core.material.emissiveIntensity = 1.6 + Math.sin(B.time * 4) * 0.6; } });
    B.score[B.attackers] = B.gens.filter(g => !g.alive).length; B.score[1 - B.attackers] = B.tickets;
    if (B.gens.every(g => !g.alive)) return endMatch(B.attackers);
    if (B.tickets <= 0 && !B.mechs.some(m => m.team === B.attackers && m.alive)) return endMatch(1 - B.attackers);
  }
  if (B.time >= B.maxTime) {
    if (mode === 'siege') return endMatch(1 - B.attackers);
    if (mode === 'att') { const hp = t => B.mechs.filter(m => m.team === t && m.alive).reduce((a, m) => a + m.hp.core / m.st.hp.core, 0); return endMatch(hp(0) >= hp(1) ? 0 : 1); }
    return endMatch(B.score[0] === B.score[1] ? -1 : B.score[0] > B.score[1] ? 0 : 1);
  }
}
function capEvent(p, team, prev) {
  B.mechs.forEach(m => { if (m.alive && m.team === team && Math.hypot(m.pos.x - p.x, m.pos.z - p.z) < p.r) { m.caps++; m.obj += 2; m.score += 150; } });
  announce((team === B.playerTeam ? 'POINT ' : 'ENEMY TOOK POINT ') + p.name + (team === B.playerTeam ? ' CAPTURED' : ''), team === B.playerTeam ? 'good' : 'bad'); MW.audio.play('capture', null, 0.7);
}
function modeKill(m, killer) {
  if (B.mode === 'tdm' && killer && killer.team !== m.team) B.score[killer.team]++;
  if (B.mode === 'tdm' && (!killer || killer === m)) B.score[1 - m.team]++;
  if (B.mode === 'siege' && m.team === B.attackers) B.tickets = Math.max(0, B.tickets - 1);
}
function endMatch(winner) {
  if (B.over) return; B.over = true; B.winner = winner; B.endT = 0;
  if (B.cinematic) { B.restartT = 4; return; }
  MW.audio.play(winner === B.playerTeam ? 'levelup' : 'alarm');
}

// ---------------------------------------------------------------- player control
function playerControl(m, dt) {
  const I = MW.input; const s = MW.profile.s; const inp = m.input;
  const sens = 0.0022 * s.sens * (B.zoom > 1 ? 1 / B.zoom : 1);
  if (!B.paused && I.locked) { m.aimYaw = wrapA(m.aimYaw - I.mdx * sens); m.aimPitch = MW.clamp(m.aimPitch - I.mdy * sens * (s.invertY ? -1 : 1), -0.6, 0.55); }
  I.mdx = I.mdy = 0;
  const k = I.keys;
  const W = k.KeyW || k.ArrowUp, S = k.KeyS || k.ArrowDown, A = k.KeyA || k.ArrowLeft, D = k.KeyD || k.ArrowRight;
  if (B.scheme === 'classic') {
    inp.move = null; inp.turn = (A ? 1 : 0) - (D ? 1 : 0); inp.throttle = (W ? 1 : 0) - (S ? 1 : 0);
  } else {
    const fx = (D ? 1 : 0) - (A ? 1 : 0), fz = (W ? 1 : 0) - (S ? 1 : 0);
    if (fx || fz) { const camYaw = m.yaw + m.twist; if (fz < 0 && !fx) { inp.move = camYaw; inp.back = true; } else { inp.move = wrapA(camYaw + Math.atan2(-fx, Math.max(0, fz) || (fx ? 0 : 1))); inp.back = false; } inp.throttle = 1; } else { inp.move = null; inp.throttle = 0; inp.back = false; }
    inp.turn = 0;
  }
  inp.jump = !!k.Space;
  inp.fire[0] = I.lmb || (k.KeyF ? true : false); inp.fire[1] = I.rmb || (k.KeyF ? true : false);
  B.zoom = k.KeyZ ? 3 : (m.fx.focus > 0 ? 2 : 1);
}
// aim point: ray from the camera centre
function computeAim(m) {
  const cam = B.cam; const o = cam.position.clone(); const d = new THREE.Vector3(); cam.getWorldDirection(d);
  const wr = B.world.ray(o, d, 900); const tr = rayTargets(o, d, Math.min(900, wr), m.team, m);
  const t = tr.target ? tr.t : Math.min(900, wr);
  B.aimPoint = o.addScaledVector(d, Math.max(25, t)); B.aimTarget = tr.target;
  return B.aimPoint;
}
function updateLock(m, dt) {
  // nearest enemy to the crosshair within 7 degrees
  const cam = B.cam; const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
  let best = null, ba = 7 * DEG;
  for (const o of B.mechs) { if (!o.alive || o.team === m.team || (o.fx.cloak > 0 && o.pos.distanceTo(m.pos) > 45)) continue; const c = centerOf(o, V1); const to = V2.subVectors(c, cam.position); const dist = to.length(); if (dist > 800) continue; const a = to.normalize().angleTo(dir); if (a < ba && o.vis) { ba = a; best = o; } }
  if (best && best === m.lockTarget) m.lockT += dt; else { m.lockTarget = best; m.lockT = 0; }
  const need = 1.3 * m.st.lock * (best && best.st.ecm ? 1 + best.st.ecm : 1);
  const was = m.lockLocked; m.lockLocked = !!best && m.lockT >= need; m.lockProg = best ? Math.min(1, m.lockT / need) : 0;
  if (m.weapons.some(w => w.wt.homing && w.alive)) { if (best && !m.lockLocked && Math.random() < dt * 8) MW.audio.play('lock', null, 0.2); if (m.lockLocked && !was) MW.audio.play('locked', null, 0.3); }
  if (best) { B.target = B.target; B.hudTarget = best; B.hudTargetT = 3; }
  else if (B.aimTarget && !B.aimTarget.isGen) { B.hudTarget = B.aimTarget; B.hudTargetT = 3; }
}

// ---------------------------------------------------------------- cameras
function updateCamera(dt) {
  const cam = B.cam; const P = B.player;
  B.camShake = Math.max(0, (B.camShake || 0) - dt * 2.5) + MW.fx.shake * 0.02;
  const shake = B.camShake;
  if (B.cinematic || !P) return cinematicCam(dt);
  if (!P.alive && B.deathCam) {
    const dc = B.deathCam; dc.t += dt; const k = dc.killer && dc.killer.alive ? dc.killer : P;
    const c = centerOf(k); const a = dc.t * 0.25 + 0.5; const r = 26 * k.sc + 10;
    cam.position.lerp(V1.set(c.x + Math.sin(a) * r, c.y + 8 * k.sc, c.z + Math.cos(a) * r), Math.min(1, dt * 3)); cam.lookAt(c);
    B.cockpit && (B.cockpit.root.visible = false); cam.fov = 60; cam.updateProjectionMatrix(); return;
  }
  const md = P.model;
  const third = B.view === 3;
  if (B.cockpit) B.cockpit.root.visible = !third;
  md.root.visible = third || !P.alive;
  const yaw = P.yaw + P.twist; const pitch = P.pitch;
  if (!third) {
    md.root.updateMatrixWorld(true);
    md.eye.getWorldPosition(V1);
    cam.position.copy(V1);
    cam.rotation.order = 'YXZ'; cam.rotation.set(pitch + (B.camKick || 0) * 0.03, yaw + Math.PI, -md.hips.rotation.z * 0.5);
  } else {
    const c = centerOf(P); const f = fwd(yaw); const back = 22 * P.sc;
    const want = V1.set(c.x - f.x * back, c.y + 6 * P.sc - Math.sin(pitch) * back * 0.6, c.z - f.z * back);
    const gh = B.world.heightAt(want.x, want.z) + 2; if (want.y < gh) want.y = gh;
    cam.position.lerp(want, Math.min(1, dt * 10));
    cam.rotation.order = 'YXZ'; cam.rotation.set(pitch * 0.9 + (B.camKick || 0) * 0.02, yaw + Math.PI, 0);
  }
  if (shake > 0) { cam.position.x += (Math.random() - 0.5) * shake * 0.25; cam.position.y += (Math.random() - 0.5) * shake * 0.25; cam.rotation.z += (Math.random() - 0.5) * shake * 0.01; }
  B.camKick = Math.max(0, (B.camKick || 0) - dt * 4);
  const fov = (MW.profile.s.fov || 72) / (B.zoom || 1);
  if (Math.abs(cam.fov - fov) > 0.1) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 10); cam.updateProjectionMatrix(); }
}
// cinematic director for the title screen
function cinematicCam(dt) {
  const cam = B.cam; const D = B.dir || (B.dir = { t: 0, shot: -1, subj: null, from: new THREE.Vector3(), look: new THREE.Vector3() });
  D.t -= dt;
  const alive = B.mechs.filter(m => m.alive && !m.dropping);
  if (D.t <= 0 || !D.subj || !D.subj.alive) {
    const busy = alive.filter(m => B.time - m.lastFire < 2);
    D.subj = MW.pick(Math.random, busy.length ? busy : alive.length ? alive : B.mechs); D.shot = (D.shot + 1 + Math.floor(Math.random() * 2)) % 5; D.t = 5 + Math.random() * 4; D.a0 = Math.random() * 6.28; D.side = Math.random() < 0.5 ? 1 : -1; D.cut = true;
  }
  const m = D.subj; if (!m) return; const c = centerOf(m); const f = fwd(m.yaw); const r = V2.set(f.z, 0, -f.x);
  const sc = m.sc; let pos = V1, look = V3;
  switch (D.shot) {
    case 0: pos.copy(c).addScaledVector(r, D.side * 16 * sc).addScaledVector(f, 6 * sc).add(V3.set(0, -2 * sc, 0)); look.copy(c).addScaledVector(f, 8); break;            // tracking alongside
    case 1: { const g = c.clone().addScaledVector(f, 30 * sc).addScaledVector(r, D.side * 8 * sc); g.y = B.world.heightAt(g.x, g.z) + 1.2; pos.copy(g); look.copy(c).add(V3.set(0, 2 * sc, 0)); break; } // low ground, looking up
    case 2: { const a = D.a0 + B.time * 0.2; pos.set(c.x + Math.sin(a) * 30 * sc, c.y + 6 * sc, c.z + Math.cos(a) * 30 * sc); look.copy(c); break; } // orbit
    case 3: pos.copy(c).add(V3.set(Math.sin(D.a0) * 70, 55 + D.t * 3, Math.cos(D.a0) * 70)); look.copy(c); break; // high crane
    case 4: pos.copy(c).addScaledVector(fwd(m.yaw + m.twist), -14 * sc).addScaledVector(r, D.side * 5 * sc).add(V3.set(0, 4 * sc, 0)); look.copy(c).addScaledVector(fwd(m.yaw + m.twist), 60); break; // over the shoulder
  }
  const gh = B.world.heightAt(pos.x, pos.z) + 1; if (pos.y < gh) pos.y = gh;
  if (D.cut) { cam.position.copy(pos); D.look.copy(look); D.cut = false; }
  cam.position.lerp(pos, Math.min(1, dt * 2.5)); D.look.lerp(look, Math.min(1, dt * 3)); cam.lookAt(D.look);
  cam.position.x += Math.sin(B.time * 1.3) * 0.05; cam.position.y += Math.sin(B.time * 1.7) * 0.05;
  if (cam.fov !== 55) { cam.fov = 55; cam.updateProjectionMatrix(); }
}

// ---------------------------------------------------------------- public API
MW.battle = {
  get B() { return B; },
  start(cfg) {
    const core = MW.core;
    const scene = new THREE.Scene();
    B = {
      cfg, scene, mode: cfg.mode, mapDef: cfg.map, tier: cfg.tier, teamSize: cfg.teamSize || cfg.map.team, cinematic: !!cfg.cinematic, idc: 0,
      mechs: [], proj: [], gens: [], domes: [], strikes: [], debris: [], feed: [], time: 0, over: false, view: 1, zoom: 1, playerTeam: 0, scheme: MW.profile.s.scheme,
      cam: core.camera, camShake: 0, paused: false, mslWarn: 0, lockWarn: 0, aimPoint: new THREE.Vector3(), modeKill,
    };
    B.world = MW.maps.build(cfg.map, scene, { noWeather: false });
    // reflection environment from this arena's own sky
    { const th = B.world.th; const es = new THREE.Scene(); const sg = new THREE.SphereGeometry(50, 32, 16); const cols = []; const top = new THREE.Color(th.sky[0]), hor = new THREE.Color(th.sky[1]), bot = new THREE.Color(th.pal[1]).multiplyScalar(0.5); const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 50; const c = y > 0 ? hor.clone().lerp(top, Math.min(1, y * 1.6)) : hor.clone().lerp(bot, Math.min(1, -y * 4)); cols.push(c.r, c.g, c.b); } sg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); es.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }))); const sun = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(th.sun[0]).multiplyScalar(th.sun[1] * 4) })); sun.position.copy(B.world.sunDir).multiplyScalar(40); es.add(sun); const pm = new THREE.PMREMGenerator(MW.core.renderer); B.env = pm.fromScene(es, 0.03).texture; pm.dispose(); scene.environment = B.env; }
    MW.fx.init(scene);
    B.hud = cfg.cinematic ? MW.hud.dummy() : MW.hud;
    setupMode();
    // teams
    const r = MW.rng((cfg.seed || Date.now()) + '');
    if (cfg.playerBuild) { const p = makeMech(cfg.playerBuild, 0, true); B.player = p; B.mechs.push(p); }
    for (let t = 0; t < 2; t++) {
      const n = B.teamSize - (t === 0 && B.player ? 1 : 0);
      for (let i = 0; i < n; i++) { const m = makeMech(MW.randomBuild(cfg.tier, r), t, false); initAI(m); B.mechs.push(m); }
    }
    B.mechs.forEach((m, i) => { spawnMech(m, true); m.pos.y += i * 1.5; });
    if (B.player) {
      B.cockpit = MW.cockpit.create(cfg.playerBuild); core.camera.add(B.cockpit.root);
      B.boot = 0; B.player.model.root.visible = false;
      B.mapCanvas = B.world.minimap(160);
      MW.hud.start(B);
      MW.audio.play('drop', null, 0.6);
    }
    scene.add(core.camera);
    core.camera.near = 0.04; core.camera.far = B.world.S * 7; core.camera.fov = cfg.cinematic ? 55 : MW.profile.s.fov; core.camera.updateProjectionMatrix();
    MW.audio.music(cfg.cinematic ? 'menu' : 'battle');
    if (B.player) MW.audio.loop('hum', 'hum', true, 0.12);
    core.setView({ scene, camera: core.camera, update: dt => this.update(dt) });
    return B;
  },
  stop() {
    if (!B) return;
    MW.audio.stopLoops();
    if (B.cockpit) MW.core.camera.remove(B.cockpit.root);
    B.scene.traverse(o => { if (o.isMesh && o.geometry && o.userData.merged) o.geometry.dispose(); });
    if (B.env) B.env.dispose();
    MW.fx.dispose(); MW.hud.stop && MW.hud.stop();
    B = null;
  },
  togglePause(p) { if (B) B.paused = p; },
  setView(v) { if (B) B.view = v; },
  cockpitPage(which) { if (B && B.cockpit) MW.cockpit.page(B.cockpit, which); },
  ability() { if (B && B.player && B.player.alive && useAbility(B.player)) B.hud.announce(B.player.cls.ability.name.toUpperCase(), 'good'); },

  update(dt) {
    if (!B) return;
    dt = Math.min(dt, 0.05);
    if (B.paused) { MW.fx.update(0, B.cam); return; }
    B.time += dt;
    const P = B.player;
    if (P && P.alive) { playerControl(P, dt); }
    // boot sequence
    if (P && B.boot < 1) { B.boot = Math.min(1, B.boot + dt / 4.5); if (B.boot >= 0.35 && !B.bootSnd) { B.bootSnd = true; MW.audio.play('powerup'); } }
    if (P && P.alive && P.dropping && B.boot < 0.85) { P.input.fire[0] = P.input.fire[1] = false; }
    // AI + physics
    for (const m of B.mechs) {
      if (m.alive) { if (!m.isPlayer) aiUpdate(m, dt); updateMech(m, dt); }
      else updateDead(m, dt);
    }
    // weapons
    if (P && P.alive) { updateCamera(0); computeAim(P); updateLock(P, dt); }
    for (const m of B.mechs) {
      if (!m.alive) continue;
      let aim, tgt = null;
      if (m.isPlayer) { aim = B.aimPoint; tgt = m.lockTarget; }
      else { const ai = m.ai; tgt = ai.target; const tt = ai.genTarget && ai.genTarget.alive && !ai.target ? ai.genTarget : tgt; aim = tt ? (tt.isGen ? tt.c.clone() : centerOf(tt)).add(ai.err) : centerOf(m).addScaledVector(fwd(m.yaw + m.twist), 100); }
      updateWeapons(m, dt, aim, tgt);
    }
    updateProjectiles(dt);
    // artillery strikes
    for (let i = B.strikes.length - 1; i >= 0; i--) { const s = B.strikes[i]; s.t -= dt; if (s.t <= 0 && s.n > 0) { s.n--; s.t = 0.22; const p = s.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 30, 120, (Math.random() - 0.5) * 30)); B.proj.push({ p, v: new THREE.Vector3((Math.random() - 0.5) * 4, -140, (Math.random() - 0.5) * 4), owner: s.owner, team: s.team, dmg: s.dmg, kind: 'ballistic', life: 4, splash: 11, wt: 'mortar', shell: true, size: 0.5, col: new THREE.Color('#ffaa55') }); } if (s.n <= 0) B.strikes.splice(i, 1); }
    // domes
    for (let i = B.domes.length - 1; i >= 0; i--) { const d = B.domes[i]; d.t -= dt; d.mesh.material.opacity = 0.12 + Math.sin(B.time * 6) * 0.03 + (d.t < 1 ? -0.1 * (1 - d.t) : 0); if (d.t <= 0) { B.scene.remove(d.mesh); B.domes.splice(i, 1); } }
    // debris
    for (let i = B.debris.length - 1; i >= 0; i--) { const d = B.debris[i]; d.life -= dt; d.v.y -= 20 * dt; d.mesh.position.addScaledVector(d.v, dt); d.mesh.rotation.x += d.w.x * dt; d.mesh.rotation.y += d.w.y * dt; const g = B.world.heightAt(d.mesh.position.x, d.mesh.position.z); if (d.mesh.position.y < g + 0.5) { d.mesh.position.y = g + 0.5; d.v.multiplyScalar(0.3); d.v.y = Math.abs(d.v.y) * 0.3; d.w.multiplyScalar(0.5); } if (Math.random() < dt * 4) MW.fx.smoke(d.mesh.position, 0.6, true); if (d.life <= 0) { B.scene.remove(d.mesh); B.debris.splice(i, 1); } }
    if (!B.over) updateMode(dt);
    else if (B.cinematic) { B.restartT -= dt; if (B.restartT <= 0) { const cfg = Object.assign({}, B.cfg, { map: MW.pick(Math.random, MW.MAPS.filter(m => m.team <= 10)), mode: MW.pick(Math.random, MW.MODES).id, tier: Math.floor(Math.random() * 6) }); this.stop(); this.start(cfg); return; } }
    else { B.endT += dt; if (B.endT > 3.5 && !B.endSent) { B.endSent = true; B.cfg.onEnd && B.cfg.onEnd(this.results()); } }
    // player-specific
    if (P) {
      if (P.alive) {
        // visibility of enemies (staggered line-of-sight checks)
        const eye = B.cam.position; B.visI = ((B.visI || 0) + 1) % B.mechs.length;
        for (let k = 0; k < 3; k++) { const o = B.mechs[(B.visI + k * 7) % B.mechs.length]; if (o.team !== P.team && o.alive) o.vis = o.pos.distanceTo(P.pos) < 900 && B.world.los(eye, centerOf(o, V1)); }
      }
      B.mslWarn = Math.max(0, B.mslWarn - dt); B.lockWarn = Math.max(0, B.lockWarn - dt);
      if (B.proj.some(q => q.homing === P)) { B.mslWarn = 0.5; if (Math.random() < dt * 4) MW.audio.play('warn', null, 0.3); }
      if (P.alive && P.heat > P.st.heatCap * 0.85 && Math.random() < dt * 2) MW.audio.play('alarm', null, 0.35);
      if (P.alive && !P.lowWarned && P.hp.core < P.st.hp.core * 0.3) { P.lowWarned = true; announce('CRITICAL DAMAGE', 'bad'); }
      if (!P.alive) P.lowWarned = false;
      MW.audio.loop('jetP', 'jet', P.alive && P.jet > 0.05, 0.25 * P.jet);
      if (B.hudTargetT > 0) { B.hudTargetT -= dt; if (B.hudTargetT <= 0 || !B.hudTarget || !B.hudTarget.alive) B.hudTarget = null; }
    }
    updateCamera(dt);
    // listener for 3D audio
    const cd = new THREE.Vector3(); B.cam.getWorldDirection(cd); MW.audio.listener = { pos: B.cam.position, right: new THREE.Vector3(-cd.z, 0, cd.x).normalize() };
    // cockpit
    if (P && B.cockpit) {
      const k = MW.input.keys; const f = fwd(P.yaw);
      const lat = P.speed * (P.input.turn || 0);
      MW.cockpit.update(B.cockpit, dt, {
        throttle: P.alive ? (B.scheme === 'classic' ? P.input.throttle : (P.input.move != null ? (P.input.back ? -0.6 : 1) : 0)) : 0,
        stickX: MW.clamp((MW.input.mdxSmooth || 0) * 0.05 + (P.input.turn || 0) * -0.5, -1, 1), stickY: MW.clamp((MW.input.mdySmooth || 0) * 0.05, -1, 1),
        firing: P.input.fire[0] || P.input.fire[1], t: B.time, accel: { x: lat * 0.3, y: B.stepBump ? 8 : 0, z: 0 }, turn: P.input.turn || 0, bump: (B.stepBump || 0) * 0.5,
        shutdown: P.shutdown > 0, locked: B.lockWarn > 0, msl: B.mslWarn > 0, dmg: 1 - P.hp.core / P.st.hp.core, boot: B.boot, dead: !P.alive,
        info: this.cockpitInfo(P),
      });
      B.stepBump = 0;
    }
    if (P) MW.hud.update(dt, B);
    B.world.update(dt, B.cam, B.time);
    MW.fx.update(dt, B.cam);
  },
  cockpitInfo(P) {
    const S = B.world.S; const yaw = P.yaw + P.twist; const blips = []; const mapBlips = [];
    const R = P.st.radar;
    for (const o of B.mechs) {
      if (!o.alive) continue; const dx = o.pos.x - P.pos.x, dz = o.pos.z - P.pos.z;
      const enemyShown = o.team === P.team || ((Math.hypot(dx, dz) < R * (o.st.ecm ? 0.5 : 1) || B.time - o.lastFire < 2 || o.vis) && !(o.fx.cloak > 0));
      if (!enemyShown) continue;
      const rx = (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / R, rz = (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / R;
      if (o !== P) blips.push({ x: -rx, y: -rz, c: o.team === P.team ? TEAM_COL[0] : TEAM_COL[1], tgt: o === B.hudTarget });
      mapBlips.push({ x: (o.pos.x + S) / (2 * S), y: (o.pos.z + S) / (2 * S), c: o === P ? '#ffffff' : o.team === P.team ? TEAM_COL[0] : TEAM_COL[1], me: o === P });
    }
    (B.points || []).forEach(p => { const dx = p.x - P.pos.x, dz = p.z - P.pos.z; blips.push({ x: -(dx * Math.cos(yaw) - dz * Math.sin(yaw)) / R, y: -(dx * Math.sin(yaw) + dz * Math.cos(yaw)) / R, c: p.owner >= 0 ? TEAM_COL[p.owner] : '#ffffff', obj: true }); });
    const t = B.hudTarget;
    const hdg = ((-yaw * 180 / Math.PI) % 360 + 360 + 180) % 360;
    return {
      hp: { core: P.hp.core / P.st.hp.core, armL: P.hp.armL / P.st.hp.armL, armR: P.hp.armR / P.st.hp.armR, legs: P.hp.legs / P.st.hp.legs },
      heat: P.heat / P.st.heatCap, speed: Math.abs(P.speed) * 3.6, twist: P.twist, blips, radar: R, heading: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(hdg / 45) % 8], headingDeg: hdg,
      weapons: P.weapons.map(w => ({ group: w.group, short: w.wt.short, cd: w.wt.fire === 'beam' && w.beamT > 0 ? 0 : 1 - Math.min(1, w.cd * w.s.rate), ready: w.cd <= 0 && w.alive, dead: !w.alive })),
      target: t ? { name: t.name, cls: t.cls.name, tier: MW.TIERS[t.tier].roman, dist: t.pos.distanceTo(P.pos), hp: t.hp.core / t.st.hp.core, parts: { core: t.hp.core / t.st.hp.core, armL: t.hp.armL / t.st.hp.armL, armR: t.hp.armR / t.st.hp.armR, legs: t.hp.legs / t.st.hp.legs } } : null,
      emp: P.fx.emp, shield: P.st.shield ? P.shield / P.st.shield : null, jumpFuel: P.st.jumpFuel ? P.jumpFuel / P.st.jumpFuel : 0, hasJets: P.st.jumpFuel > 0, ecm: P.st.ecm > 0, abilityReady: P.ability.cd <= 0,
      diss: P.st.diss, water: B.world.water != null && P.pos.y < B.world.water - 0.5, restart: P.shutdown, pitch: P.pitch, roll: P.model.hips.rotation.z * 3,
      map: B.mapCanvas, mapBlips,
    };
  },
  results() {
    const P = B.player; const team = B.mechs.filter(m => m.team === P.team).sort((a, b) => b.score - a.score);
    return {
      win: B.winner === P.team, draw: B.winner === -1, mode: B.mode, map: B.mapDef, tier: B.tier, teamSize: B.teamSize,
      kills: P.kills, deaths: P.deaths, assists: P.assists, dmg: Math.round(P.dmg), obj: P.obj, caps: P.caps, gens: P.gens, heistCaps: P.heistCaps, abilities: P.abilities,
      mvp: team[0] === P, top3: team.indexOf(P) < 3, score: B.score.slice(),
      board: B.mechs.map(m => ({ name: m.name, team: m.team, cls: m.cls.name, k: m.kills, d: m.deaths, a: m.assists, dmg: Math.round(m.dmg), score: Math.round(m.score), me: m.isPlayer })).sort((a, b) => b.score - a.score),
    };
  },
  scoreboard() { if (!B) return []; return B.mechs.map(m => ({ name: m.name, team: m.team, cls: m.cls.name, tier: MW.TIERS[m.tier].roman, k: m.kills, d: m.deaths, a: m.assists, dmg: Math.round(m.dmg), score: Math.round(m.score), me: m.isPlayer, alive: m.alive })).sort((a, b) => b.score - a.score); },
  centerOf, derive,
};
})();
