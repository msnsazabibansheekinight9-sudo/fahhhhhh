// Vehicles: hover speeders/tanks, walkers with stepping legs, starfighters with arcade flight, capital ships.
var SF = window.SF || (window.SF = {});

(function () {
  var V3 = THREE.Vector3;
  var G = function () { return SF.G; };
  var tmp = new V3(), tmp2 = new V3(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');

  function Vehicle(def, team, faction) {
    this.type = 'vehicle';
    this.id = 100000 + (Vehicle.nid = (Vehicle.nid || 0) + 1);
    this.def = def; this.team = team; this.faction = faction;
    this.kind = def.type;
    var o = SF.VModels.build(def, faction);
    this.model = o; this.root = o.root;
    this.radius = o.radius; this.height = o.height;
    this.maxHp = def.hp; this.hp = def.hp; this.alive = true;
    this.pos = new V3(); this.vel = new V3(); this.yaw = 0; this.pitch = 0; this.roll = 0;
    this.quat = new THREE.Quaternion();
    this.throttle = 0.6; this.boostT = 0; this.boostFuel = 100;
    this.armored = def.type === 'walker' && def.legs !== 2 || /crawler|occupier|sabre|sixlegger|colossus|spider|crab|strider$/.test(def.model);
    this.armored = this.armored && !/strider_open/.test(def.model);
    this.weapons = def.weapons.map(function (id) { var w = SF.D.vweapons[id]; return { w: w, heat: 0, fireT: 0, overT: 0, side: 0 }; });
    this.riderPose = o.riderPose || null;
    this.hideDriver = !o.seat;
    this.turretYaw = 0; this.turretPitch = 0;
    this.legPhase = 0;
    this.smokeT = 0;
    this.engine = null;
    this.lockT = 0; this.lockTarget = null;
    G().scene.add(this.root);
  }
  SF.Vehicle = Vehicle;
  var VP = Vehicle.prototype;

  VP.spawn = function (x, y, z, yaw) {
    this.pos.set(x, y, z); this.yaw = yaw || 0; this.pitch = 0; this.roll = 0; this.vel.set(0, 0, 0);
    this.quat.setFromEuler(e.set(0, this.yaw, 0));
    if (this.kind === 'fighter') {
      if (!G().world.space) this.pos.y = Math.max(y, G().world.groundAt(x, z, 500) + 40);
      this.throttle = 0.7;
      this.vel.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).multiplyScalar(this.def.speed * 0.7);
    }
    this.alive = true; this.hp = this.maxHp;
    this.root.visible = true;
    this.updateMesh(0);
  };
  VP.enter = function (u) {
    this.driver = u; u.vehicle = this; u.vel.set(0, 0, 0);
    if (this.hideDriver) u.rig.root.visible = false;
    if (u.isPlayer && SF.Audio.ctx) { this.engine = SF.Audio.engine(this.kind); }
  };
  VP.ejectDriver = function (dead) {
    var u = this.driver;
    if (!u) return;
    u.vehicle = null; this.driver = null;
    if (this.engine) { this.engine.stop(); this.engine = null; }
    if (!dead && u.alive) {
      var g = G();
      if (this.kind === 'fighter') { u.die(null, 'eject'); return; }
      var side = new V3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).multiplyScalar(this.radius + 1.2);
      u.pos.copy(this.pos).add(side); u.pos.y = g.world.groundAt(u.pos.x, u.pos.z, this.pos.y + 3) + 0.1;
      u.rig.root.visible = true;
    }
  };
  VP.seatPos = function () {
    var s = this.model.seat;
    if (s) { s.updateMatrixWorld(); return s.getWorldPosition(tmp2).clone(); }
    return this.pos.clone();
  };
  VP.center = function (out) {
    out = out || new V3();
    if (this.kind === 'walker') return out.set(this.pos.x, this.pos.y + this.model.hipY + 1, this.pos.z);
    if (this.kind === 'fighter') return out.copy(this.pos);
    return out.set(this.pos.x, this.pos.y + this.height * 0.45, this.pos.z);
  };
  VP.chest = VP.center;
  VP.hitSpheres = function () {
    var c = this.center(this._c || (this._c = new V3()));
    if (!this._hs) this._hs = [{ x: 0, y: 0, z: 0, r: 0 }, { x: 0, y: 0, z: 0, r: 0 }];
    var a = this._hs[0], b = this._hs[1];
    if (this.model.big) {
      // colossus: body and head
      a.x = c.x; a.y = this.pos.y + this.model.hipY + 2.6; a.z = c.z; a.r = 7;
      var f = tmp.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      b.x = c.x + f.x * 13; b.y = this.pos.y + this.model.hipY + 2.4; b.z = c.z + f.z * 13; b.r = 3.5;
      return this._hs;
    }
    a.x = c.x; a.y = c.y; a.z = c.z; a.r = this.kind === 'fighter' ? this.radius * 0.7 : this.radius * 0.85;
    if (this.kind === 'walker') { b.x = this.pos.x; b.y = this.pos.y + this.model.hipY * 0.5; b.z = this.pos.z; b.r = 0.9; return this._hs; }
    return this._hs.slice(0, 1);
  };
  VP.cloaked = function () { return false; };

  VP.damage = function (amt, src, kind, at) {
    if (!this.alive || amt <= 0) return;
    if (src && src.team === this.team) return;
    if (this.invuln) return;
    this.hp -= amt;
    if (src && src.isPlayer) { G().hitMarker = 0.15; SF.Audio.hit(); }
    if (this.driver && this.driver.isPlayer) G().dmgFlash = Math.min(1, (G().dmgFlash || 0) + amt / 300);
    if (this.driver && this.driver.ai) this.driver.ai.onHurt(src);
    if (src) this.lastHitBy = src;
    if (this.hp <= 0) this.destroy(src);
  };
  VP.destroy = function (src) {
    var g = G();
    this.alive = false; this.hp = 0;
    var c = this.center(new V3());
    SF.FX.explosion(c, Math.max(5, this.radius * 1.4));
    if (this.radius > 6) setTimeout(function () { SF.FX.explosion(c.clone().add(new V3(3, 2, 0)), 8); }, 250);
    var d = this.driver;
    if (d) { this.ejectDriver(true); d.spawnProt = 0; d.buffs.invuln = 0; if (d.alive) d.damage(9999, src || this.lastHitBy, 'explosive'); }
    if (this.engine) { this.engine.stop(); this.engine = null; }
    this.root.visible = false;
    this.deadT = 0;
    g.onVehicleDestroyed(this, src || this.lastHitBy);
  };
  VP.remove = function () { G().scene.remove(this.root); if (this.engine) this.engine.stop(); };

  // ------------------------------------------------------------------ update
  VP.update = function (dt) {
    if (!this.alive) { this.deadT += dt; return; }
    var u = this.driver, inp = u ? u.input : null;
    if (this.kind === 'fighter') this.updateFighter(dt, inp, u);
    else this.updateGround(dt, inp, u);
    // weapons
    for (var i = 0; i < this.weapons.length; i++) {
      var W = this.weapons[i];
      W.fireT -= dt;
      if (W.overT > 0) { W.overT -= dt; W.heat = Math.max(0, W.heat - 40 * dt); }
      else if (W.fireT < -0.2) W.heat = Math.max(0, W.heat - 35 * dt);
    }
    if (inp) {
      if (inp.fire) this.fire(0);
      if ((this.kind !== 'fighter' && inp.aim) || inp.ab[0]) { if (this.weapons[1]) this.fire(1); inp.ab[0] = false; }
      if (inp.ab[1] && this.kind === 'fighter') { this.boostT = 1.5; inp.ab[1] = false; }
    } else if (this.autoGun) this.autoFire(dt);
    // damage smoke
    if (this.hp < this.maxHp * 0.4) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) { this.smokeT = 0.05; var c = this.center(tmp); SF.FX.smoke.emit(c.x, c.y + this.height * 0.3, c.z, 0, 2, 0, 0x2a2622, this.radius * 0.4, 1.5, -0.5, 0.5, 2); if (this.hp < this.maxHp * 0.2) SF.FX.add.emit(c.x, c.y, c.z, 0, 1, 0, 0xff7a2a, this.radius * 0.3, 0.3, 0, 0, 1); }
    }
    if (this.engine) this.engine.set(this.kind === 'fighter' ? this.throttle + (this.boostT > 0 ? 0.4 : 0) : Math.min(1, this.vel.length() / this.def.speed), 0.1);
    this.updateMesh(dt);
  };

  VP.updateGround = function (dt, inp, u) {
    var g = G(), w = g.world, def = this.def;
    var walker = this.kind === 'walker';
    var bike = /skimmer|skiff|landspeeder/.test(def.model);
    var fwd = inp ? inp.fwd : 0, str = inp ? inp.strafe : 0;
    // steering: bikes & small walkers follow aim yaw; tanks/walkers turn with strafe keys
    var turnRate = walker ? (this.model.big ? 0.25 : 0.9) : bike ? 2.6 : 1.1;
    if (u && (bike || def.model === 'strider_open')) {
      var dy = angDiff(u.yaw, this.yaw);
      this.yaw += Math.max(-turnRate * dt, Math.min(turnRate * dt, dy));
      if (u.isPlayer) str = 0;
    } else if (u) this.yaw -= str * turnRate * dt;
    var fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    var speed = def.speed * (inp && inp.sprint && !walker ? 1.25 : 1);
    var want = fwd * speed;
    var cur = this.vel.x * fx + this.vel.z * fz;
    var acc = walker ? 3 : bike ? 22 : 8;
    cur += Math.max(-acc * dt, Math.min(acc * dt, want - cur));
    // lateral damping
    this.vel.x = fx * cur; this.vel.z = fz * cur;
    if (bike && inp && u && u.isPlayer && inp.strafe) { this.vel.x += Math.cos(this.yaw) * inp.strafe * 8; this.vel.z += -Math.sin(this.yaw) * inp.strafe * 8; }
    var ox = this.pos.x, oz = this.pos.z;
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    var half = w.half * 0.97;
    this.pos.x = Math.max(-half, Math.min(half, this.pos.x)); this.pos.z = Math.max(-half, Math.min(half, this.pos.z));
    var hoverH = walker ? 0 : (bike ? 0.4 : 0.6);
    var colR = Math.min(this.radius * 0.7, walker ? 3 : 2.5);
    if (w.collide(this.pos, colR, walker ? 4 : 2, walker ? 1.2 : 0.9)) {
      if (Math.abs(cur) > 18 && bike) this.damage(Math.abs(cur) * 8, null, 'crash');
      this.vel.multiplyScalar(0.5);
    }
    var gy = w.groundAt(this.pos.x, this.pos.z, this.pos.y + 1.2);
    if (w.water != null && gy < w.water && !walker) gy = w.water; // hover over water
    // steepness block for heavy vehicles
    if (gy - this.pos.y > (walker ? 1.6 : 2.4)) { this.pos.x = ox; this.pos.z = oz; this.vel.multiplyScalar(0.2); gy = w.groundAt(ox, oz, this.pos.y + 1.2); }
    var target = gy + hoverH;
    if (this.pos.y > target + 0.5) { this.vel.y -= 22 * dt; this.pos.y += this.vel.y * dt; if (this.pos.y < target) { this.pos.y = target; this.vel.y = 0; } }
    else { this.pos.y += (target - this.pos.y) * Math.min(1, dt * 10); this.vel.y = 0; }
    if (this.pos.y < w.killY) this.destroy(this.lastHitBy);
    if (w.lava != null && this.pos.y < w.lava + 0.2 && walker) this.damage(200 * dt, null, 'fire');
    // tilt to slope
    var e1 = w.groundAt(this.pos.x + fx * 2, this.pos.z + fz * 2, this.pos.y + 2), e2 = w.groundAt(this.pos.x - fx * 2, this.pos.z - fz * 2, this.pos.y + 2);
    var tp = walker ? 0 : Math.atan2(e1 - e2, 4) * 0.8;
    this.pitch += (tp - this.pitch) * Math.min(1, dt * 5);
    var tr = bike && inp ? -(u && u.isPlayer ? angDiff(u.yaw, this.yaw) * 0.6 : str * 0.3) : 0;
    this.roll += (Math.max(-0.5, Math.min(0.5, tr)) - this.roll) * Math.min(1, dt * 5);
    // turret aims at driver's aim
    if (u) {
      var ay = u.yaw, ap = u.pitch;
      if (!u.isPlayer && u.aimTarget) { tmp.subVectors(u.aimTarget, this.center(tmp2)); ay = Math.atan2(-tmp.x, -tmp.z); ap = Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)); }
      this.turretYaw = ay; this.turretPitch = Math.max(-0.35, Math.min(0.5, ap));
    }
    this.legPhase += cur * dt * (walker ? (this.model.big ? 0.22 : 0.55) : 0);
    if (!walker && Math.abs(cur) > 4 && Math.random() < 0.5) SF.FX.dust(tmp.set(this.pos.x - fx * this.radius, this.pos.y, this.pos.z - fz * this.radius), g.world.bio && g.world.bio.g ? g.world.bio.g[1] : 0x9a8a70, 1);
    if (walker && this.model.big && Math.abs(cur) > 0.5) { var st = Math.sin(this.legPhase * 2); if (st > 0.98 && !this.stomp) { this.stomp = true; if (g.camPos && g.camPos.distanceTo(this.pos) < 60) g.shake = Math.max(g.shake || 0, 0.35); } else if (st < 0.9) this.stomp = false; }
  };

  VP.updateFighter = function (dt, inp, u) {
    var g = G(), w = g.world, def = this.def;
    var maxTurn = (def.hero ? 1.4 : 1.6) * (def.speed > 110 ? 1.15 : def.speed < 80 ? 0.75 : 1);
    if (inp) {
      if (inp.fwd > 0) this.throttle = Math.min(1, this.throttle + dt * 0.8);
      if (inp.fwd < 0) this.throttle = Math.max(0.25, this.throttle - dt * 0.8);
    }
    if (this.boostT > 0) { this.boostT -= dt; }
    // desired direction
    var want = null;
    if (u) {
      if (u.isPlayer) want = new V3(-Math.sin(u.yaw) * Math.cos(u.pitch), Math.sin(u.pitch), -Math.cos(u.yaw) * Math.cos(u.pitch));
      else if (u.flyTo) want = tmp2.subVectors(u.flyTo, this.pos).normalize().clone();
    }
    // keep in bounds / above ground
    var bound = w.space ? 1100 : w.half * 1.1;
    var fwdV = tmp.set(0, 0, -1).applyQuaternion(this.quat);
    if (Math.abs(this.pos.x) > bound || Math.abs(this.pos.z) > bound || (w.space && Math.abs(this.pos.y) > 600)) want = new V3(-this.pos.x, -this.pos.y * (w.space ? 1 : 0), -this.pos.z).normalize();
    if (!w.space) {
      var gh = w.groundAt(this.pos.x + fwdV.x * 20, this.pos.z + fwdV.z * 20, 500);
      var minAlt = (def.low ? 6 : 14);
      if (this.pos.y < gh + minAlt) { want = (want || fwdV.clone()); want.y = Math.max(want.y, 0.5); want.normalize(); }
      if (this.pos.y > 220) { want = (want || fwdV.clone()); want.y = Math.min(want.y, -0.3); want.normalize(); }
    }
    var rollIn = inp ? -inp.strafe : 0;
    if (want) {
      // rotate toward desired direction with limited rate
      var cur = fwdV.clone();
      var ang = cur.angleTo(want);
      if (ang > 1e-4) {
        var axis = tmp2.crossVectors(cur, want).normalize();
        var step = Math.min(ang, maxTurn * dt);
        q.setFromAxisAngle(axis, step);
        this.quat.premultiply(q);
        // bank into turns
        var localAxis = axis.clone().applyQuaternion(this.quat.clone().invert());
        rollIn += -localAxis.y * Math.min(1, ang * 2) * 1.2;
      }
    }
    // roll toward desired bank around local forward, auto-level when idle
    var upW = new V3(0, 1, 0).applyQuaternion(this.quat);
    var rightW = new V3(1, 0, 0).applyQuaternion(this.quat);
    var curRoll = Math.atan2(-rightW.y, upW.y);
    var targetRoll = Math.max(-1.2, Math.min(1.2, rollIn));
    var dr = (targetRoll - curRoll) * Math.min(1, dt * 3);
    q.setFromAxisAngle(new V3(0, 0, -1), -dr);
    this.quat.multiply(q);
    this.quat.normalize();
    fwdV = new V3(0, 0, -1).applyQuaternion(this.quat);
    var speed = def.speed * (0.35 + this.throttle * 0.65) * (this.boostT > 0 ? 1.6 : 1);
    this.vel.lerp(fwdV.multiplyScalar(speed), Math.min(1, dt * 2.5));
    this.pos.addScaledVector(this.vel, dt);
    // collisions
    if (!w.space) {
      var gy = w.groundAt(this.pos.x, this.pos.z, this.pos.y + 1);
      if (this.pos.y < gy + 1.5) this.damage(9999, this.lastHitBy, 'crash');
      if (w.collide(this.pos, this.radius * 0.5, 2, 0)) this.damage(this.maxHp * 0.5 * dt * 4, this.lastHitBy, 'crash');
    } else {
      for (var i = 0; i < w.spheres.length; i++) {
        var s = w.spheres[i];
        var dx = this.pos.x - s.x, dy = this.pos.y - s.y, dz = this.pos.z - s.z;
        if (dx * dx + dy * dy + dz * dz < (s.r + this.radius * 0.5) * (s.r + this.radius * 0.5)) { this.damage(9999, this.lastHitBy, 'crash'); break; }
      }
    }
    e.setFromQuaternion(this.quat, 'YXZ');
    this.yaw = e.y; this.pitch = e.x; this.roll = e.z;
    // engine trail
    if (g.camPos && g.camPos.distanceToSquared(this.pos) < 300 * 300) {
      var back = new V3(0, 0, 1).applyQuaternion(this.quat);
      SF.FX.engine(tmp.copy(this.pos).addScaledVector(back, this.radius * 0.6), this.def.side === 0 ? 0xff7a3a : 0x6aa0ff, this.boostT > 0 ? 1.2 : 0.7);
    }
  };

  VP.fire = function (idx) {
    var W = this.weapons[idx];
    if (!W || W.fireT > 0 || W.overT > 0) return;
    var w = W.w, g = G();
    var u = this.driver;
    W.fireT = 60 / w.rpm;
    W.heat += w.heat;
    if (W.heat >= 100) { W.heat = 100; W.overT = 2.5; }
    var muzzles = this.model.muzzles;
    var m = muzzles[W.side++ % muzzles.length];
    var origin;
    if (this.model.turret && this.model.turretMuzzle && idx === 0 && this.kind !== 'fighter') {
      this.model.turret.updateMatrixWorld(); origin = this.model.turretMuzzle.clone().applyMatrix4(this.model.turret.matrixWorld);
    } else { this.root.updateMatrixWorld(); origin = m.clone().applyMatrix4(this.root.matrixWorld); }
    var dir;
    if (u && u.isPlayer && g.aimPoint) dir = new V3().subVectors(g.aimPoint, origin).normalize();
    else if (u && u.aimTarget) dir = new V3().subVectors(u.aimTarget, origin).normalize();
    else if (this.kind === 'fighter') dir = new V3(0, 0, -1).applyQuaternion(this.quat);
    else dir = new V3(-Math.sin(this.turretYaw) * Math.cos(this.turretPitch), Math.sin(this.turretPitch), -Math.cos(this.turretYaw) * Math.cos(this.turretPitch));
    if (this.kind === 'fighter' && !w.drop) {
      // keep fighter guns within a cone of the nose
      var nose = new V3(0, 0, -1).applyQuaternion(this.quat);
      if (dir.dot(nose) < 0.93) dir.copy(nose);
      if (u && !u.isPlayer) { dir.x += (Math.random() - 0.5) * 0.04; dir.y += (Math.random() - 0.5) * 0.04; dir.z += (Math.random() - 0.5) * 0.04; dir.normalize(); }
    }
    var owner = u || this;
    var F = SF.D.factions[this.faction];
    var color = F ? F.bolt : 0xff3322;
    if (w.drop) {
      var p = { kind: 'grenade', owner: owner, team: this.team, pos: this.center(new V3()).add(new V3(0, -1.5, 0)), vel: this.vel.clone().multiplyScalar(0.7), life: 6, radius: w.radius, dmg: w.dmg, antiv: 2, mesh: SF.FX.grenadeMesh(0x3a3e44), grav: 20 };
      p.mesh.scale.setScalar(w.radius > 12 ? 6 : 3);
      g.proj.push(p);
      if (w.radius > 12) { p.life = 2.2; }
      SF.Audio.shot('launcher', origin);
      return;
    }
    var pw = { dmg: w.dmg, speed: w.speed + (this.kind === 'fighter' ? this.vel.length() : 0), range: 300, kind: w.radius ? 'launcher' : 'repeater', radius: w.radius, antiv: w.antiv || (w.radius ? 2 : 1), homing: w.homing, spread: 0 };
    var target = null;
    if (w.homing) target = this.lockTarget && this.lockTarget.alive ? this.lockTarget : SF.Combat.lockTarget(owner, origin, dir, 300, 0.9);
    var pr = SF.Combat.fire(owner, origin, dir, pw, { color: color, vehicle: this, homing: !!(w.homing && target), target: target, rocket: !!w.radius });
    if (w.homing && target) pr.homing = target;
    SF.FX.muzzle(origin, color);
    SF.Audio.shot(w.radius ? 'cannon' : 'laser', origin, this.kind === 'fighter' ? 1.2 : 0.8);
    if (u && u.isPlayer) g.camKick = (g.camKick || 0) + (w.radius ? 0.8 : 0.1);
  };
  // driverless vehicles (colossus walkers) shoot at nearby enemies
  VP.autoFire = function (dt) {
    this.autoT = (this.autoT || 0) - dt;
    if (this.autoT > 0) return;
    this.autoT = 0.5;
    var best = null, bd = this.model.big ? 160 : 80, c = this.center(tmp);
    SF.Combat.targets(this.team, true, true).forEach(function (t) { var d = t.pos.distanceTo(c); if (d < bd) { bd = d; best = t; } });
    this.autoTarget = best;
    if (best) {
      var fake = { isPlayer: false, aimTarget: best.chest ? best.chest(new V3()) : best.center(new V3()), team: this.team, has: function () { return false; }, pos: this.pos, alive: true, boltColor: function () { return 0xff2a1a; } };
      var save = this.driver; this.driver = fake;
      this.fire(Math.random() < 0.3 && this.weapons[1] ? 1 : 0);
      this.driver = save;
      this.turretYaw = Math.atan2(-(fake.aimTarget.x - c.x), -(fake.aimTarget.z - c.z));
    }
  };

  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
  SF.angDiff = angDiff;

  VP.updateMesh = function (dt) {
    var r = this.root;
    r.position.copy(this.pos);
    if (this.kind === 'fighter') { r.quaternion.copy(this.quat); return; }
    r.rotation.set(0, 0, 0, 'YXZ'); r.rotation.order = 'YXZ';
    r.rotation.y = this.yaw; r.rotation.x = this.pitch; r.rotation.z = this.roll;
    var M = this.model;
    if (M.turret) {
      M.turret.rotation.y = angDiff(this.turretYaw, this.yaw);
      M.turret.rotation.x = this.turretPitch * 0.6;
    }
    if (M.head && !M.turret) { M.head.rotation.y = Math.max(-0.6, Math.min(0.6, angDiff(this.turretYaw, this.yaw))); M.head.rotation.x = this.turretPitch * 0.5; }
    if (M.legs) {
      var ph = this.legPhase, moving = Math.abs(this.vel.x) + Math.abs(this.vel.z) > 0.3;
      M.blend = (M.blend || 0) + ((moving ? 1 : 0) - (M.blend || 0)) * Math.min(1, dt * 3);
      var bl = M.blend, bobSum = 0;
      for (var i = 0; i < M.legs.length; i++) {
        var L = M.legs[i];
        // stance: foot planted, leg sweeps back linearly; swing: leg lifts and steps forward
        var t = (((ph + L.phase) / (Math.PI * 2)) % 1 + 1) % 1, sw, lift;
        if (t < 0.6) { sw = L.amp * (1 - t / 0.6 * 2); lift = 0; }
        else { var u = (t - 0.6) / 0.4, e2 = u * u * (3 - 2 * u); sw = L.amp * (-1 + 2 * e2); lift = Math.sin(u * Math.PI) * L.lift; }
        sw *= bl; lift *= bl;
        bobSum += lift;
        if (L.back) { L.hip.rotation.x = -0.6 + sw; L.knee.rotation.x = 1.2 + lift * 0.9; L.foot.rotation.x = -0.6 - sw - lift * 0.9; }
        else if (L.spread) { if (L.hip.userData.y0 == null) L.hip.userData.y0 = L.hip.rotation.y; L.hip.rotation.y = L.hip.userData.y0 + sw * 0.7; L.knee.rotation.z = L.baseKneeZ + lift * 0.45 * L.side; }
        else { L.hip.rotation.x = sw; L.knee.rotation.x = -lift * 0.9 - 0.04; L.foot.rotation.x = -sw + lift * 0.9; }
      }
      if (M.top) { M.top.position.y = M.hipY - (M.big ? 0.35 : 0.1) * (1 - Math.min(1, bobSum)) * bl; M.top.rotation.z = Math.sin(ph) * (M.gait === 'biped' ? 0.05 : 0.012) * bl; }
    }
  };

  // ------------------------------------------------------------------ capital ship
  function Capital(faction, team, pos, yaw) {
    var g = G();
    var cdef = SF.D.capitalShips[faction] || SF.D.capitalShips.dominion;
    var o = SF.VModels.capital(cdef.model, team);
    this.name = cdef.name; this.team = team; this.faction = faction;
    this.root = o.root; this.root.position.copy(pos); this.root.rotation.y = yaw;
    g.scene.add(this.root);
    this.root.updateMatrixWorld(true);
    var self = this;
    this.subs = o.subsystems.map(function (s, i) {
      var sb = { sub: true, name: s.name, r: s.r, hp: i === 0 ? 4000 : 6000, maxHp: i === 0 ? 4000 : 6000, wpos: s.pos.clone().applyMatrix4(self.root.matrixWorld), cap: self, alive: true, team: team, id: 900000 + i + team * 10, pos: null };
      sb.pos = sb.wpos;
      sb.center = function (out) { return (out || new V3()).copy(sb.wpos); };
      sb.damage = function (amt, src) {
        if (sb.hp <= 0) return;
        if (i > 0 && self.subs[0].hp > 0) amt *= 0.15; // shields protect other subsystems
        sb.hp -= amt; if (src && src.isPlayer) { g.hitMarker = 0.15; }
        if (sb.hp <= 0) { sb.hp = 0; sb.alive = false; SF.FX.explosion(sb.wpos, 30); SF.FX.explosion(sb.wpos.clone().add(new V3(10, 5, 0)), 20); g.onSubsystemDestroyed(self, sb, src); }
      };
      // marker glow
      var mk = SF.Models.mesh('sph', SF.Models.mat(team === 0 ? 0x4a8aff : 0xff4a4a, 0, 0, 'add'), g.scene, sb.wpos.x, sb.wpos.y, sb.wpos.z, s.r * 0.6, s.r * 0.6, s.r * 0.6);
      mk.castShadow = false; sb.marker = mk;
      return sb;
    });
    // hull collision spheres along the ship's long axis
    var f = new V3(-Math.sin(yaw), 0, -Math.cos(yaw));
    for (var k = -3; k <= 3; k++) g.world.spheres.push({ x: pos.x + f.x * k * 50, y: pos.y + 20, z: pos.z + f.z * k * 50, r: 48 });
    this.turrets = [];
    for (var t = 0; t < 10; t++) this.turrets.push({ pos: new V3(pos.x + f.x * (t - 5) * 40 + (Math.random() - 0.5) * 60, pos.y + 30 + Math.random() * 20, pos.z + f.z * (t - 5) * 40 + (Math.random() - 0.5) * 60), t: Math.random() * 2 });
  }
  Capital.prototype.update = function (dt) {
    var g = G(), self = this;
    this.turrets.forEach(function (tu) {
      tu.t -= dt;
      if (tu.t > 0) return;
      tu.t = 0.6 + Math.random() * 0.6;
      var best = null, bd = 450;
      g.vehicles.forEach(function (v) { if (v.alive && v.team !== self.team) { var d = v.pos.distanceTo(tu.pos); if (d < bd) { bd = d; best = v; } } });
      if (!best) return;
      var lead = best.pos.clone().addScaledVector(best.vel, bd / 260);
      var dir = lead.sub(tu.pos).normalize();
      dir.x += (Math.random() - 0.5) * 0.05; dir.y += (Math.random() - 0.5) * 0.05; dir.z += (Math.random() - 0.5) * 0.05; dir.normalize();
      var fake = { team: self.team, isPlayer: false, has: function () { return false; }, pos: tu.pos, boltColor: function () { return self.team === 0 ? 0x4a8aff : 0x5aff5a; } };
      SF.Combat.fire(fake, tu.pos.clone(), dir, { dmg: 45, speed: 260, range: 400, kind: 'repeater' }, { color: fake.boltColor() }).mesh.scale.set(3, 3, 6);
    });
    this.subs.forEach(function (sb) { if (sb.marker) { sb.marker.visible = sb.hp > 0; sb.marker.material.opacity = 0.25 + Math.sin(g.time * 4) * 0.1; } });
  };
  SF.Capital = Capital;
})();
