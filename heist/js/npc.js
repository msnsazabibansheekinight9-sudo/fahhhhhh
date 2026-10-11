'use strict';
// NPCs: pedestrians, heist civilians, guards, police (with specials), gang
// members and the AI crew. Movement uses the nav grid (A* or the police flow
// field); combat uses line of sight and per-type accuracy.

H.npcs = [];
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _d = new THREE.Vector3();
let NPC_ID = 1;

H.Npc = class {
  constructor(kind, x, z, opts = {}) {
    this.id = NPC_ID++; this.kind = kind; this.opts = opts;
    this.pos = new THREE.Vector3(x, 0, z); this.vel = new THREE.Vector3(); this.yaw = opts.yaw ?? Math.random() * 6.28;
    this.team = opts.team || (kind === 'ped' || kind === 'civ' ? 'civ' : kind === 'bot' ? 'crew' : kind === 'thug' ? 'gang' : 'law');
    this.etype = opts.etype || (kind === 'guard' ? 'guard' : kind === 'cop' ? 'cop' : kind === 'thug' ? 'thug' : null);
    this.def = this.etype ? H.ENEMIES[this.etype] : null;
    const diff = H.run ? H.DIFFS[H.run.diff] : H.DIFFS[Math.min(H.game.wantedDiff || 0, 6)];
    this.hpMax = this.def ? this.def.hp * diff.hpMul : kind === 'bot' ? 400 : 60;
    if (kind === 'bot') this.hpMax = 400 + diff.hpMul * 120;
    this.hp = this.hpMax;
    this.plate = this.def && this.def.plate ? this.def.plate * diff.hpMul : 0; this.visor = this.def && this.def.visor ? this.def.visor * diff.hpMul : 0;
    this.state = opts.state || 'idle'; this.t = 0; this.fireT = H.rand(0.5, 1.5); this.path = null; this.pathI = 0; this.pathT = 0;
    this.alert = 0; this.detect = 0; this.dead = false; this.special = this.def ? this.def.special : null;
    this.speedBase = this.def ? this.def.speed : kind === 'bot' ? 5.2 : opts.speed || 1.4;
    // model
    const look = {};
    if (this.def) {
      Object.assign(look, { shirt: this.def.uniform, pants: this.def.pants, head: this.def.head, vest: this.def.vest || (['swat', 'heavy', 'medic', 'shield', 'taser', 'dozer'].includes(this.etype) ? true : null), bulk: this.def.bulk, gun: this.def.gun === 'taser' ? 'pistol' : this.def.gun, longSleeve: true, gloves: this.etype !== 'guard' && this.etype !== 'cop' && this.etype !== 'thug', shield: this.special === 'shield' });
      if (this.etype === 'guard') { look.shirt = 0x8a9ab0; look.tie = 0x1a2233; look.shortSleeve = true; }
      if (this.etype === 'fbi') { look.shirt = 0xe8e8e8; look.jacket = 0x2a2a2a; look.tie = 0x2a2a2a; look.vest = 'FBI'; look.vestColor = 0x2a3a5a; }
      if (this.etype === 'thug') { look.shirt = H.pick([0xd03030, 0x2a2a2a, 0xf0f0f0]); look.head = 'hair'; look.glasses = Math.random() < 0.4; look.shortSleeve = true; }
      if (this.etype === 'medic') { look.vestColor = 0xe8e8e8; }
    } else if (kind === 'bot') {
      Object.assign(look, { shirt: 0x1a1a1a, jacket: 0x22252a, pants: 0x1a1a1a, longSleeve: true, gloves: true, vest: true, mask: opts.mask, gun: 'ar' });
    } else {
      const fem = Math.random() < 0.45;
      Object.assign(look, { fem, shortSleeve: Math.random() < 0.6 });
      if (opts.role === 'teller' || opts.role === 'manager' || opts.role === 'worker' || opts.role === 'clerk') { look.shirt = 0xf0f0f0; look.tie = opts.role === 'manager' ? 0x8a1a1a : 0x2a3a6a; look.jacket = opts.role === 'manager' ? 0x2a2a35 : null; look.pants = 0x2a2a35; look.shortSleeve = false; look.longSleeve = true; }
      if (opts.role === 'scientist') { look.shirt = 0xf4f4f4; look.jacket = 0xf8f8f8; look.longSleeve = true; }
    }
    this.h = H.makeHuman(look);
    this.h.root.position.copy(this.pos); this.h.root.rotation.y = this.yaw;
    H.scene.add(this.h.root);
    this.role = opts.role;
    if (this.special === 'cloaker') { this.h.J.head.traverse(m => { if (m.material && m.material.emissive) m.material = m.material; }); }
    if (this.special === 'taser') { this.tazeT = 0; }
    if (this.special === 'sniper') { const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]); this.laser = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.6 })); H.scene.add(this.laser); this.laser.visible = false; this.aimT = 0; }
    H.npcs.push(this);
  }
  get head() { return this.h.J.head.getWorldPosition(_v).add(_w.set(0, 0.1, 0)); }
  headPos(out) { this.h.J.head.getWorldPosition(out); out.y += 0.1; return out; }
  chestPos(out) { this.h.J.chest.getWorldPosition(out); return out; }
  eyePos(out) { out.set(this.pos.x, this.pos.y + (this.state === 'cower' || this.state === 'down' ? 0.9 : 1.62), this.pos.z); return out; }
  remove() {
    H.scene.remove(this.h.root); if (this.laser) H.scene.remove(this.laser);
    const i = H.npcs.indexOf(this); if (i >= 0) H.npcs.splice(i, 1);
  }
  // walk toward world point; returns remaining distance
  steer(tx, tz, speed, dt) {
    _d.set(tx - this.pos.x, 0, tz - this.pos.z); const dist = _d.length();
    if (dist > 0.05) { _d.divideScalar(dist); this.vel.x = H.damp(this.vel.x, _d.x * speed, 8, dt); this.vel.z = H.damp(this.vel.z, _d.z * speed, 8, dt); }
    return dist;
  }
  // follow an A* path to (tx,tz)
  goTo(tx, tz, speed, dt, repath = 2) {
    this.pathT -= dt;
    if (!this.path || this.pathT <= 0 || Math.hypot(this.goal.x - tx, this.goal.z - tz) > 1.5) {
      this.goal = { x: tx, z: tz }; this.pathT = repath;
      this.path = H.nav.path(this.pos.x, this.pos.z, tx, tz, 6000) || [{ x: tx, z: tz }]; this.pathI = 0;
    }
    let p = this.path[this.pathI];
    while (p && Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 0.6 && this.pathI < this.path.length - 1) p = this.path[++this.pathI];
    if (!p) return 0;
    this.steer(p.x, p.z, speed, dt);
    return Math.hypot(tx - this.pos.x, tz - this.pos.z);
  }
  stop(dt) { this.vel.x = H.damp(this.vel.x, 0, 10, dt); this.vel.z = H.damp(this.vel.z, 0, 10, dt); }
  face(x, z, dt, k = 8) { const a = Math.atan2(x - this.pos.x, z - this.pos.z); let d = a - this.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; this.yaw += d * Math.min(1, k * dt); }
  canSee(p, maxD = 60, fov = 0.5) {
    _d.set(p.x - this.pos.x, 0, p.z - this.pos.z); const d = _d.length(); if (d > maxD) return false;
    if (fov > -1 && d > 1.5) { _d.divideScalar(d); const f = Math.sin(this.yaw) * _d.x + Math.cos(this.yaw) * _d.z; if (f < fov) return false; }
    return H.world.los(this.eyePos(_w), p);
  }
  update(dt) {
    if (this.dead) { this.deadT = (this.deadT || 0) + dt; this.h.a.state = 'dead'; H.animHuman(this.h, dt); return; }
    this.t += dt;
    const fn = this['u_' + this.kind]; if (fn) fn.call(this, dt);
    // integrate
    if (this.state !== 'static') {
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      this.pos.y = H.world.move(this.pos, this.bulkR || 0.3, 1.7);
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > 0.3 && !this.faceLock) this.face(this.pos.x + this.vel.x, this.pos.z + this.vel.z, dt, 6);
      this.h.a.speed = sp;
    }
    this.faceLock = false;
    this.h.root.position.copy(this.pos); this.h.root.rotation.y = this.yaw;
    const far = this.pos.distanceToSquared(H.camera.position) > 160 * 160;
    this.h.root.visible = !far;
    if (!far) H.animHuman(this.h, dt);
  }
  /* ---------- damage ---------- */
  damage(amt, from, opts = {}) {
    if (this.dead) return false;
    if (this.kind === 'bot' && opts.friendly) return false;
    const diff = H.run ? H.DIFFS[H.run.diff] : H.DIFFS[0];
    // juggernaut armour: faceplate and visor soak damage first
    if (this.special === 'dozer' && !opts.explosive) {
      if (opts.head && this.visor > 0) { this.visor -= amt; if (this.visor <= 0) { H.fx.sparks(this.headPos(_v), 10, 0xaaaaaa); this.h.J.head.children.forEach(c => { if (c.material && c.material.transparent) c.visible = false; }); } return 'armor'; }
      if (!opts.head && this.plate > 0) { this.plate -= amt; return 'armor'; }
    }
    this.hp -= amt; this.lastHitT = H.t; this.alert = 1;
    if (from && this.team !== 'crew') this.attacker = from;
    if (this.state === 'idle' || this.state === 'patrol') this.state = 'alerted';
    if (this.hp <= 0) { this.die(from, opts); return 'kill'; }
    if (this.kind !== 'bot' && Math.random() < H.mod('stagger') && !this.special) this.staggerT = 0.6;
    return 'hit';
  }
  die(from, opts) {
    this.dead = true; this.hp = 0; this.vel.set(0, 0, 0);
    this.h.a.state = 'dead'; this.h.a.deadT = 0; this.h.a.deadSide = Math.random() < 0.5 ? -1 : 1;
    if (this.laser) this.laser.visible = false;
    if (this.h.J.gun && this.kind !== 'bot') { /* drop gun visually */ this.h.J.gun.visible = false; }
    H.game.onNpcDeath(this, from, opts);
  }
};

const N = H.Npc.prototype;

/* ---------- city pedestrians ---------- */
N.u_ped = function (dt) {
  const P = H.P;
  if (this.state === 'static' || !this.loop) { this.vel.set(0, 0, 0); return; }
  if (this.state === 'flee') {
    this.fleeT -= dt;
    _d.set(this.pos.x - this.danger.x, 0, this.pos.z - this.danger.z).normalize();
    const tx = this.pos.x + _d.x * 6, tz = this.pos.z + _d.z * 6;
    this.steer(tx, tz, 5.2, dt); this.h.a.state = 'idle';
    if (this.fleeT <= 0) { this.state = 'cower'; this.cowerT = 6; }
    return;
  }
  if (this.state === 'cower') { this.stop(dt); this.h.a.state = 'cower'; this.cowerT -= dt; if (this.cowerT <= 0) this.state = 'walk'; return; }
  if (this.state === 'hands') { this.stop(dt); this.h.a.state = 'surrender'; this.face(P.pos.x, P.pos.z, dt); this.handsT -= dt; if (this.handsT <= 0) { this.state = 'flee'; this.fleeT = 6; this.danger = P.pos.clone(); } return; }
  // walk the sidewalk loop around the block
  const L = this.loop;
  if (!this.wp || Math.hypot(this.wp.x - this.pos.x, this.wp.z - this.pos.z) < 1) {
    this.corner = (this.corner + this.dir + 4) % 4;
    const c = [[L.x0, L.z0], [L.x1, L.z0], [L.x1, L.z1], [L.x0, L.z1]][this.corner];
    this.wp = { x: c[0], z: c[1] };
  }
  this.h.a.state = this.phone ? 'phone' : 'idle';
  this.steer(this.wp.x, this.wp.z, this.speedBase, dt);
  // react to an armed, masked player close by
  if (P.masked && !P.inCar && this.pos.distanceToSquared(P.pos) < 64 && Math.random() < dt * 2) { this.state = 'hands'; this.handsT = 3; }
};

/* ---------- heist civilians ---------- */
N.u_civ = function (dt) {
  const run = H.run, P = H.P;
  const st = this.state;
  if (st === 'tied') { this.stop(dt); this.h.a.state = 'tied'; return; }
  if (st === 'down') {
    this.stop(dt); this.h.a.state = 'kneel'; this.downT -= dt;
    if (this.downT <= 0 && !(run && run.loud)) { this.state = 'flee'; this.fleeT = 8; }
    else if (this.downT <= 0) this.downT = 5; // in loud they stay down
    return;
  }
  if (st === 'flee' || st === 'phone') {
    if (run && run.loud && this.state !== 'flee2') { this.state = 'cower'; return; }
    const exit = run ? run.site.spec.points.entrance : null;
    if (st === 'phone') {
      this.stop(dt); this.h.a.state = 'phone'; this.callT -= dt;
      if (this.callT <= 0 && run && !run.loud) run.raiseAlarm('A civilian called the police');
      if (this.callT <= 0 && !run && !H.heat.wanted) H.heat.setWanted(1, H.P.pos, 'A witness called the police.');
      if (this.callT <= 0) { this.state = 'cower'; }
      return;
    }
    this.fleeT -= dt; this.h.a.state = 'idle';
    if (exit) { const d = this.goTo(exit.x, exit.z + 12, 5, dt); if (d < 2) { this.state = 'phone'; this.callT = 3; } }
    if (this.fleeT <= 0 && !this.called) { this.called = true; this.state = 'phone'; this.callT = 4; }
    return;
  }
  if (st === 'cower') { this.stop(dt); this.h.a.state = 'cower'; return; }
  // idle: mill around a home point, sometimes chat on the phone
  this.h.a.state = this.role === 'teller' || this.role === 'clerk' ? 'idle' : (this.phone ? 'phone' : 'idle');
  if (!this.home) this.home = this.pos.clone();
  this.idleT = (this.idleT || H.rand(2, 8)) - dt;
  if (this.role === 'teller' || this.role === 'clerk' || this.role === 'dj' || this.role === 'worker' || this.role === 'resident') { this.stop(dt); if (this.role === 'dj') this.h.a.state = 'wave'; return; }
  if (this.idleT <= 0) { this.idleT = H.rand(4, 10); this.wander = { x: this.home.x + H.rand(-4, 4), z: this.home.z + H.rand(-4, 4) }; if (H.nav.blocked(...H.nav.cellOf(this.wander.x, this.wander.z))) this.wander = null; }
  if (this.wander) { const d = this.goTo(this.wander.x, this.wander.z, 1.2, dt, 6); if (d < 0.6) this.wander = null; } else this.stop(dt);
};

/* ---------- guards (stealth patrol, then combat) ---------- */
N.u_guard = function (dt) {
  const run = H.run;
  if (this.state === 'surrender' || this.state === 'tied' || this.state === 'kneel') return this.u_surrendered(dt);
  if (run && run.loud) return this.u_cop(dt);
  if (this.state === 'investigate') {
    this.h.a.state = 'aim';
    const d = this.goTo(this.inv.x, this.inv.z, 2.2, dt);
    this.invT -= dt;
    if (d < 1.2 || this.invT <= 0) { this.state = 'patrol'; this.wait = 2; }
    return;
  }
  if (this.state === 'calling') {
    this.stop(dt); this.h.a.state = 'phone'; this.callT -= dt;
    if (this.callT <= 0 && run) run.raiseAlarm(this.callReason || 'A guard raised the alarm');
    return;
  }
  // patrol between waypoints with pauses
  this.h.a.state = 'idle';
  const path = this.patrol; if (!path || !path.length) { this.stop(dt); return; }
  if (this.wait > 0) { this.wait -= dt; this.stop(dt); this.lookT = (this.lookT || 0) + dt; this.yaw += Math.sin(this.lookT * 0.8) * dt * 0.6; return; }
  const p = path[this.pi % path.length];
  const d = this.goTo(p.x, p.z, 1.5, dt, 8);
  if (d < 0.8) { this.pi++; this.wait = H.rand(2, 5); }
};
N.u_surrendered = function (dt) {
  this.stop(dt);
  this.h.a.state = this.state === 'surrender' ? 'surrender' : this.state === 'kneel' ? 'kneel' : 'tied';
  if (this.state === 'surrender') { this.surT -= dt; if (this.surT <= 0) this.state = 'kneel'; }
};

/* ---------- police & combat AI (also used by loud guards and thugs) ---------- */
H.crewTargets = function () {
  const P = H.P, list = [];
  if (!P.custody && !P.inCar) list.push({ pos: P.pos, eye: H.camera.position, isPlayer: true, downed: P.downed });
  else if (P.inCar) list.push({ pos: P.inCar.pos, eye: P.inCar.pos.clone().setY(1.2), isPlayer: true, car: P.inCar });
  for (const n of H.npcs) if (!n.dead && (n.team === 'crew') && !n.downed && !n.hidden) list.push({ pos: n.pos, eye: n.eyePos(new THREE.Vector3()), npc: n });
  if (H.game.sentries) for (const s of H.game.sentries) if (s.hp > 0) list.push({ pos: s.pos, eye: s.pos.clone().setY(0.8), sentry: s });
  return list;
};
N.u_thug = function (dt) { return this.u_cop(dt); };
N.u_cop = function (dt) {
  const def = this.def, P = H.P;
  if (this.state === 'surrender' || this.state === 'tied' || this.state === 'kneel') return this.u_surrendered(dt);
  if (this.staggerT > 0) { this.staggerT -= dt; this.stop(dt); this.h.a.state = 'idle'; return; }
  const diff = H.run ? H.DIFFS[H.run.diff] : H.DIFFS[Math.min(6, (H.game.wanted || 1) - 1)];
  // choose target: nearest visible crew member, re-evaluated every 0.5s
  this.tgtT = (this.tgtT || 0) - dt;
  if (this.tgtT <= 0) {
    this.tgtT = 0.5;
    let best = null, bd = 1e9;
    for (const t of H.crewTargets()) {
      let d = t.pos.distanceTo(this.pos);
      if (t.isPlayer && H.mod('aggroMul') !== 1) d /= H.mod('aggroMul') * H.mod('aggroMul2', 1);
      if (d < bd && (d < 12 || this.canSee(t.eye, 90, -1))) { bd = d; best = t; }
    }
    this.tgt = best; this.tgtVis = !!best;
    if (!best) this.tgt = H.crewTargets()[0];
  }
  const tgt = this.tgt; if (!tgt) { this.stop(dt); return; }
  const dist = tgt.pos.distanceTo(this.pos);
  const vis = this.tgtVis && this.canSee(tgt.eye, def.range * 2.5, -1);
  // movement
  let speed = def.speed * (this.special === 'shield' ? 0.8 : 1);
  if (this.special === 'sniper') { this.stop(dt); }
  else if (this.special === 'cloaker') {
    this.h.a.state = 'idle';
    if (dist > 2.2) { const fd = H.nav.flowDir(this.pos.x, this.pos.z, _d); if (fd && tgt.isPlayer && !tgt.car) this.steer(this.pos.x + fd.x, this.pos.z + fd.z, speed, dt); else this.goTo(tgt.pos.x, tgt.pos.z, speed, dt, 1); }
    else { this.stop(dt); this.fireT -= dt; if (this.fireT <= 0) { this.fireT = 2.5; this.face(tgt.pos.x, tgt.pos.z, 1, 1); this.h.a.state = 'melee'; this.h.a.meleeT = 0.5; H.game.cloakerKick(this, tgt); } }
    this.beepT = (this.beepT || 0) - dt; if (this.beepT <= 0) { this.beepT = 1.4; H.audio.beep(this.pos, 2600); }
    return;
  } else {
    const ideal = def.range * (this.special === 'dozer' ? 0.4 : this.special === 'taser' ? 0.5 : 0.55);
    if (!vis || dist > ideal) {
      const fd = tgt.isPlayer && !tgt.car ? H.nav.flowDir(this.pos.x, this.pos.z, _d) : null;
      if (fd && (fd.x || fd.z)) this.steer(this.pos.x + fd.x, this.pos.z + fd.z, speed, dt);
      else this.goTo(tgt.pos.x, tgt.pos.z, speed, dt, 1.5);
    } else {
      // strafe while engaged
      this.strafeT = (this.strafeT || 0) - dt;
      if (this.strafeT <= 0) { this.strafeT = H.rand(1, 3); this.strafe = H.pick([-1, 0, 0, 1]); }
      const a = Math.atan2(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z) + Math.PI / 2;
      this.vel.x = H.damp(this.vel.x, Math.sin(a) * this.strafe * speed * 0.4, 6, dt); this.vel.z = H.damp(this.vel.z, Math.cos(a) * this.strafe * speed * 0.4, 6, dt);
    }
  }
  if (vis) { this.face(tgt.pos.x, tgt.pos.z, dt, 10); this.faceLock = true; }
  this.h.a.state = vis ? 'aim' : 'idle';
  if (vis) this.h.a.aimPitch = Math.atan2(tgt.eye.y - 1.4 - this.pos.y, dist) * 0.8;
  // medic heals allies
  if (this.special === 'medic') {
    this.healT = (this.healT || 0) - dt;
    if (this.healT <= 0) for (const n of H.npcs) if (n !== this && !n.dead && n.team === 'law' && n.hp < n.hpMax * 0.5 && n.pos.distanceTo(this.pos) < 8) { n.hp = n.hpMax; this.healT = 6; H.fx.sparks(n.chestPos(_w), 8, 0x40ff80, 2); break; }
  }
  // taser
  if (this.special === 'taser' && vis && dist < 15 && tgt.isPlayer && !tgt.car && !P.downed) {
    this.tazeT += dt;
    if (this.tazeT > 1.2) { if (Math.random() > H.mod('shockproof')) { P.tased = Math.max(P.tased, 0.3); P.tasedBy = this; P.tasedTotal = (P.tasedTotal || 0) + dt; if (P.tasedTotal > 4.5) { P.tasedTotal = 0; H.game.downPlayer('Tased'); } H.game.zap(this); } else this.tazeT = 0; }
    return;
  } else if (this.special === 'taser') { this.tazeT = 0; if (P.tasedBy === this) P.tasedTotal = 0; }
  // sniper: laser, aim then fire
  if (this.special === 'sniper') {
    if (vis) {
      this.aimT += dt; this.laser.visible = true;
      const a = this.headPos(_v); const pts = this.laser.geometry.attributes.position;
      pts.setXYZ(0, a.x, a.y - 0.1, a.z); pts.setXYZ(1, tgt.eye.x, tgt.eye.y - 0.2, tgt.eye.z); pts.needsUpdate = true;
      if (this.aimT > 3) { this.aimT = 0; H.game.npcShoot(this, tgt, def.dmg * diff.dmgMul, def.acc * diff.accMul); }
    } else { this.aimT = Math.max(0, this.aimT - dt); this.laser.visible = false; }
    return;
  }
  // shooting
  this.fireT -= dt;
  if (vis && dist < def.range * 1.6 && this.fireT <= 0) {
    const burst = def.gun === 'ar' || def.gun === 'smg' ? 3 : 1;
    this.fireT = (1 / def.rof) * burst * H.rand(0.8, 1.4);
    for (let i = 0; i < burst; i++) setTimeout(() => { if (!this.dead && this.tgt) H.game.npcShoot(this, this.tgt, def.dmg * diff.dmgMul * (def.gun === 'shotgun' ? H.clamp(1.6 - dist / 12, 0.2, 1.6) : 1), def.acc * diff.accMul); }, i * 90);
  }
};

/* ---------- AI crew ---------- */
N.u_bot = function (dt) {
  const P = H.P, run = H.run;
  if (this.downed) { this.stop(dt); this.h.a.state = 'downed'; this.bleed -= dt; if (this.bleed <= 0) H.game.botCustody(this); return; }
  if (this.hidden) { this.stop(dt); this.h.a.state = 'idle'; this.h.root.visible = false; return; }
  this.h.root.visible = true;
  // revive the player first
  if (P.downed && !P.custody) {
    const d = this.goTo(P.pos.x, P.pos.z, 6.2, dt, 0.8);
    if (d < 1.6) { this.stop(dt); this.h.a.state = 'crouch'; this.reviveT = (this.reviveT || 0) + dt; if (this.reviveT > 2.5) { this.reviveT = 0; H.game.revivePlayer(); } }
    return;
  }
  this.reviveT = 0;
  // revive downed bots
  const downedBot = H.npcs.find(n => n.kind === 'bot' && n !== this && n.downed && n.pos.distanceTo(this.pos) < 25);
  if (downedBot) { const d = this.goTo(downedBot.pos.x, downedBot.pos.z, 6, dt, 0.8); if (d < 1.4) { this.stop(dt); this.revB = (this.revB || 0) + dt; if (this.revB > 3) { this.revB = 0; H.game.reviveBot(downedBot); } } return; }
  // follow
  const slot = this.slot || 0, ang = P.yaw + Math.PI + (slot - 1) * 0.8;
  const fx = P.pos.x + Math.sin(ang) * 3, fz = P.pos.z + Math.cos(ang) * 3;
  const dP = this.pos.distanceTo(P.pos);
  if (dP > 30) { this.pos.set(fx, P.pos.y, fz); this.path = null; }
  if (dP > 4.5) this.goTo(fx, fz, dP > 10 ? 6.4 : 4.5, dt, 1); else this.stop(dt);
  // shoot police
  this.tgtT = (this.tgtT || 0) - dt;
  if (this.tgtT <= 0) {
    this.tgtT = 0.4; this.tgt = null; let bd = 45;
    for (const n of H.npcs) if (!n.dead && (n.team === 'law' || n.team === 'gang') && !n.surrendered && n.state !== 'surrender' && n.state !== 'tied' && n.state !== 'kneel' && (!run || run.loud || n.team === 'gang')) { const d = n.pos.distanceTo(this.pos); if (d < bd && this.canSee(n.chestPos(_w), 45, -1)) { bd = d; this.tgt = n; } }
  }
  this.h.a.state = this.tgt ? 'aim' : 'idle';
  if (this.tgt && !this.tgt.dead) {
    this.face(this.tgt.pos.x, this.tgt.pos.z, dt, 10); this.faceLock = true;
    this.fireT -= dt;
    if (this.fireT <= 0) {
      this.fireT = H.rand(0.12, 0.25);
      const hit = Math.random() < 0.55;
      const mp = this.h.J.gun ? this.h.J.gun.localToWorld(_v.set(0, 0.04, -0.5)) : this.eyePos(_v);
      const tp = this.tgt.chestPos(_w).clone().add(new THREE.Vector3(H.rand(-0.5, 0.5), H.rand(-0.3, 0.3), H.rand(-0.5, 0.5)).multiplyScalar(hit ? 0 : 1));
      H.fx.flash(mp, 0.4); H.fx.tracer(mp, tp); H.audio.gun(H.WMAP.bastion_m4, mp);
      if (hit) { const dmg = 40 * (this.kind === 'bot' && this.converted ? H.mod('jokerDmgMul') : 1); this.tgt.damage(this.tgt.special === 'dozer' ? dmg * 1.5 : dmg, 'bot', { head: Math.random() < 0.15 }); }
    }
  }
};

/* ---------- spawning helpers ---------- */
H.spawnPeds = function (n) {
  const C = H.city;
  for (let i = 0; i < n; i++) {
    const b = H.pick(C.blocks.filter(bb => bb.dist !== 'beach' || Math.random() < 0.3));
    const L = b.L, m = 1.9;
    const loop = { x0: L.x0 + m, x1: L.x1 - m, z0: L.z0 + m, z1: L.z1 - m };
    const corner = H.randi(0, 3), c = [[loop.x0, loop.z0], [loop.x1, loop.z0], [loop.x1, loop.z1], [loop.x0, loop.z1]][corner];
    const t = Math.random();
    const nx = corner % 2 === 0 ? H.lerp(c[0], corner === 0 ? loop.x1 : loop.x0, t) : c[0], nz = corner % 2 === 1 ? H.lerp(c[1], corner === 1 ? loop.z1 : loop.z0, t) : c[1];
    const p = new H.Npc('ped', nx, nz, { speed: H.rand(1.1, 1.7) });
    p.loop = loop; p.corner = corner; p.dir = Math.random() < 0.5 ? 1 : -1; p.state = 'walk'; p.phone = Math.random() < 0.15;
  }
};
// beach-goers stroll on the sand
H.spawnBeach = function (n) {
  const S = H.city.SIZE;
  for (let i = 0; i < n; i++) {
    const p = new H.Npc('ped', S + 20 + Math.random() * 80, Math.random() * S, { speed: H.rand(0.8, 1.3) });
    p.loop = { x0: S + 12, x1: S + 110, z0: p.pos.z - 30, z1: p.pos.z + 30 }; p.corner = 0; p.dir = 1; p.state = 'walk';
  }
};
