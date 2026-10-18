/* Rock & Stone — glyphids and the swarm director.
   Ground bugs are surface crawlers: they stick to whatever rock is nearest and
   walk along it, so they pour down walls and across ceilings the way they
   should. When one gets properly stuck it chews through the rock instead. */
(function (RS) {
  'use strict';

  var TYPES = RS.BUGS = {
    swarmer: {
      id: 'swarmer', name: 'Glyphid Swarmer', hp: 14, speed: 6.4, accel: 20,
      r: 0.3, h: 0.5, dmg: 6, atkRate: 0.8, atkRange: 1.2, xp: 2,
      blood: 0x9ad83a, mass: 0.3, climbs: true, merged: true,
      model: { scale: 0.42, abdoR: 0.42, abdoLift: 0.12, thorR: 0.3, headR: 0.24, legLen: 0.3, legs: 3, colour: 0x5a4320, accent: 0xc8a030, eyeColour: 0xffd040 }
    },
    grunt: {
      id: 'grunt', name: 'Glyphid Grunt', hp: 95, speed: 3.6, accel: 13,
      r: 0.55, h: 0.95, dmg: 14, atkRate: 1.25, atkRange: 1.9, xp: 6,
      blood: 0x8fd43a, mass: 1, climbs: true,
      model: { scale: 0.85, abdoR: 0.45, abdoLift: 0.22, thorR: 0.36, headR: 0.28, legLen: 0.44, legs: 3, colour: 0x4a3526, accent: 0xb07a30 }
    },
    slasher: {
      id: 'slasher', name: 'Glyphid Slasher', hp: 95, speed: 5.0, accel: 18,
      r: 0.55, h: 0.9, dmg: 18, atkRate: 1.0, atkRange: 2.3, xp: 8, lunge: true,
      blood: 0x8fd43a, mass: 1, climbs: true,
      model: { scale: 0.85, abdoR: 0.42, abdoLift: 0.2, thorR: 0.34, headR: 0.3, legLen: 0.48, legs: 3, colour: 0x4a2c2c, accent: 0xd04a30, spikes: 3, eyeColour: 0xff5030 }
    },
    guard: {
      id: 'guard', name: 'Glyphid Praetorian Guard', hp: 210, speed: 2.9, accel: 10,
      r: 0.7, h: 1.1, dmg: 24, atkRate: 1.5, atkRange: 2.2, xp: 14,
      blood: 0x8fd43a, mass: 2.2, climbs: true, frontArmour: 0.25,
      model: { scale: 1.05, abdoR: 0.5, abdoLift: 0.26, thorR: 0.42, headR: 0.3, legLen: 0.5, legs: 3, colour: 0x3e3a30, accent: 0x8a8060, armour: 0.8, armourColour: 0x7a7260 }
    },
    exploder: {
      id: 'exploder', name: 'Glyphid Exploder', hp: 34, speed: 4.2, accel: 14,
      r: 0.5, h: 0.8, dmg: 55, atkRate: 1, atkRange: 2.4, xp: 7, suicide: true,
      blastRadius: 4.6, blood: 0x9ad83a, mass: 0.8, climbs: true,
      model: { scale: 0.82, abdoR: 0.62, abdoLift: 0.3, thorR: 0.3, headR: 0.22, legLen: 0.42, legs: 3, colour: 0x3a4a22, accent: 0x9aff40, weakColour: 0x9aff40, eyeColour: 0xa0ff40 }
    },
    praetorian: {
      id: 'praetorian', name: 'Glyphid Praetorian', hp: 620, speed: 2.5, accel: 8,
      r: 1.05, h: 1.7, dmg: 32, atkRate: 1.7, atkRange: 3.0, xp: 40,
      blood: 0x8fd43a, mass: 6, climbs: false, frontArmour: 0.82, gas: true,
      model: { scale: 1.7, abdoR: 0.58, abdoLift: 0.34, thorR: 0.5, headR: 0.38, legLen: 0.64, legR: 0.075, legs: 3, colour: 0x3a3228, accent: 0xc87a20, armour: 1, armourColour: 0x6e6050, spikes: 4 }
    },
    spitter: {
      id: 'spitter', name: 'Glyphid Acid Spitter', hp: 70, speed: 4.6, accel: 10,
      r: 0.6, h: 0.7, dmg: 16, atkRate: 2.2, atkRange: 22, xp: 12,
      flying: true, ranged: 'acid', blood: 0xb0e03a, mass: 0.7,
      model: { scale: 0.7, colour: 0x4a5a2a, accent: 0xa0d040, wingColour: 0xa8c070 }
    },
    mactera: {
      id: 'mactera', name: 'Mactera Spawn', hp: 140, speed: 5.2, accel: 9,
      r: 0.75, h: 0.9, dmg: 22, atkRate: 2.6, atkRange: 26, xp: 18,
      flying: true, ranged: 'goo', blood: 0xc07ad0, mass: 1.2,
      model: { scale: 0.95, colour: 0x5a4a6a, accent: 0xc07ad0, wingColour: 0xb0a0d0 }
    },
    dreadnought: {
      id: 'dreadnought', name: 'Glyphid Dreadnought', hp: 3200, speed: 2.8, accel: 7,
      r: 1.9, h: 2.6, dmg: 48, atkRate: 1.6, atkRange: 4.2, xp: 260,
      blood: 0x8fd43a, mass: 20, climbs: false, boss: true, frontArmour: 0.9,
      plates: 5, charge: true, breath: true,
      model: { scale: 2.9, abdoR: 0.62, abdoLift: 0.4, thorR: 0.56, headR: 0.44, legLen: 0.78, legR: 0.1, legs: 4, colour: 0x2e2820, accent: 0xff5a20, armour: 1, armourColour: 0x5a5244, spikes: 5, eyeColour: 0xff4020 }
    }
  };

  RS.Enemies = function (game) {
    this.g = game;
    this.list = [];
    this.pools = {};
    this.group = new THREE.Group();
    game.scene.add(this.group);
    var mats = RS.makeMats();
    this.mat = mats.flat;
    this.frozenMat = new THREE.MeshPhongMaterial({ color: 0x9fe0ff, shininess: 60, specular: 0x88bbdd, flatShading: true });
    this.geoCache = {};
    this.spit = [];
    this.spitPool = [];
    this._v = new THREE.Vector3(); this._v2 = new THREE.Vector3(); this._n = new THREE.Vector3();
    this.killCount = 0;
    this.buildSpitPool();
    // swarm director
    this.tension = 0;
    this.nextAmbient = 24;
    this.waveTimer = 0;
    this.wave = null;
    this.hazard = game.def ? (game.def.hazard || 3) : 3;
    this.cap = Math.round(26 + this.hazard * 9);
  };
  var E = RS.Enemies.prototype;

  E.buildSpitPool = function () {
    var geo = RS.PRIM.sphereLo;
    var mat = new THREE.MeshBasicMaterial({ color: 0xa0e040 });
    this.spitMat = mat;
    for (var i = 0; i < 24; i++) {
      var m = new THREE.Mesh(geo, mat);
      m.visible = false; m.scale.setScalar(0.3); m.frustumCulled = false;
      this.group.add(m);
      this.spitPool.push({ mesh: m, active: false });
    }
  };

  E.geoFor = function (def) {
    var c = this.geoCache[def.id];
    if (c) return c;
    if (def.flying) {
      c = { body: RS.buildMactera(def.model), wingL: RS.buildWing(def.model, 0), wingR: RS.buildWing(def.model, 1) };
    } else {
      c = {
        body: RS.buildGlyphidBody(def.model),
        legL: RS.buildGlyphidLegs(def.model, 0),
        legR: RS.buildGlyphidLegs(def.model, 1)
      };
    }
    this.geoCache[def.id] = c;
    return c;
  };

  // ---------------------------------------------------------------- spawn
  E.spawn = function (typeId, x, y, z, opts) {
    var def = TYPES[typeId];
    if (!def) return null;
    if (this.list.length >= this.cap + (def.boss ? 10 : 0)) return null;
    var geo = this.geoFor(def);
    var root = new THREE.Group();
    var body = new THREE.Mesh(geo.body, this.mat);
    body.frustumCulled = false;
    root.add(body);
    var limbs = [];
    if (def.flying) {
      var wl = new THREE.Mesh(geo.wingL, this.mat), wr = new THREE.Mesh(geo.wingR, this.mat);
      wl.frustumCulled = wr.frustumCulled = false;
      root.add(wl); root.add(wr); limbs.push(wl, wr);
    } else {
      var ll = new THREE.Mesh(geo.legL, this.mat), lr = new THREE.Mesh(geo.legR, this.mat);
      ll.frustumCulled = lr.frustumCulled = false;
      root.add(ll); root.add(lr); limbs.push(ll, lr);
    }
    this.group.add(root);

    var hazMul = 0.7 + this.hazard * 0.18;
    var e = {
      def: def, root: root, body: body, limbs: limbs,
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      fwd: new THREE.Vector3(0, 0, 1),
      hp: def.hp * hazMul, maxHp: def.hp * hazMul,
      alive: true, grounded: false,
      atkCool: Math.random() * 0.7, walkT: Math.random() * 6,
      stuck: 0, digCool: 0, frozen: 0, burning: 0, burnSrc: 0,
      lunging: 0, state: 'chase', stateT: 0, target: null,
      armour: def.frontArmour || 0, plates: def.plates || 0,
      spawnT: 0, emerge: opts && opts.emerge ? 1 : 0,
      yawVis: 0, bob: 0, wobble: Math.random() * 6,
      chargeT: 0, breathT: 0, gasCool: 3
    };
    if (opts && opts.hpMul) { e.hp *= opts.hpMul; e.maxHp *= opts.hpMul; }
    root.position.copy(e.pos);
    this.list.push(e);
    RS.bus.emit('enemy-spawn', e);
    return e;
  };

  // ---------------------------------------------------------------- queries
  E.nearestTo = function (x, y, z, maxDist, losOnly) {
    var best = null, bd = maxDist * maxDist;
    for (var i = 0; i < this.list.length; i++) {
      var e = this.list[i];
      if (!e.alive) continue;
      var dx = e.pos.x - x, dy = e.pos.y - y, dz = e.pos.z - z;
      var d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= bd) continue;
      if (losOnly) {
        var d = Math.sqrt(d2);
        var hit = this.g.terrain.raycast(x, y, z, dx / d, dy / d, dz / d, d - 0.6);
        if (hit.hit) continue;
      }
      bd = d2; best = e;
    }
    return best;
  };

  /* Capsule-ish hit test along a ray. The rear third of the body is the weak
     point, which is why flanking a praetorian is worth the walk. */
  E.raycast = function (ox, oy, oz, dx, dy, dz, maxDist) {
    var best = null, bestT = maxDist;
    for (var i = 0; i < this.list.length; i++) {
      var e = this.list[i];
      if (!e.alive) continue;
      var r = e.def.r * 1.05;
      var cx = e.pos.x - ox, cy = (e.pos.y + e.def.h * 0.55) - oy, cz = e.pos.z - oz;
      var t = cx * dx + cy * dy + cz * dz;
      if (t < 0 || t > bestT) continue;
      var px = cx - dx * t, py = cy - dy * t, pz = cz - dz * t;
      var d2 = px * px + py * py + pz * pz;
      if (d2 > r * r) continue;
      var back = Math.sqrt(Math.max(0, r * r - d2));
      var tHit = t - back;
      if (tHit < 0) tHit = t;
      if (tHit > bestT) continue;
      bestT = tHit;
      var hx = ox + dx * tHit, hy = oy + dy * tHit, hz = oz + dz * tHit;
      // weak point: behind the midline, relative to the bug's facing
      var rel = (hx - e.pos.x) * e.fwd.x + (hz - e.pos.z) * e.fwd.z;
      var weak = rel > e.def.r * 0.25;
      best = { enemy: e, dist: tHit, x: hx, y: hy, z: hz, weak: weak };
    }
    return best;
  };

  E.sphereHit = function (p, r) {
    for (var i = 0; i < this.list.length; i++) {
      var e = this.list[i];
      if (!e.alive) continue;
      var dx = e.pos.x - p.x, dy = (e.pos.y + e.def.h * 0.5) - p.y, dz = e.pos.z - p.z;
      var rr = r + e.def.r;
      if (dx * dx + dy * dy + dz * dz < rr * rr) return e;
    }
    return null;
  };

  E.sphereDamage = function (p, r, dmg, cause) {
    var hits = [];
    for (var i = 0; i < this.list.length; i++) {
      var e = this.list[i];
      if (!e.alive) continue;
      var dx = e.pos.x - p.x, dy = (e.pos.y + e.def.h * 0.5) - p.y, dz = e.pos.z - p.z;
      var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > r + e.def.r) continue;
      var falloff = 1 - RS.clamp01((d - e.def.r) / r) * 0.65;
      this.damage(e, dmg * falloff, { x: dx / (d || 1), y: dy / (d || 1), z: dz / (d || 1) }, false, cause || 'explosion');
      hits.push(e);
    }
    return hits;
  };

  E.coneDamage = function (origin, dir, range, minDot, dmg, cause) {
    var hits = [];
    for (var i = 0; i < this.list.length; i++) {
      var e = this.list[i];
      if (!e.alive) continue;
      var dx = e.pos.x - origin.x, dy = (e.pos.y + e.def.h * 0.5) - origin.y, dz = e.pos.z - origin.z;
      var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > range + e.def.r) continue;
      if (d > 0.3 && (dx * dir.x + dy * dir.y + dz * dir.z) / d < minDot) continue;
      this.damage(e, dmg, dir, false, cause);
      hits.push(e);
    }
    return hits;
  };

  // ---------------------------------------------------------------- damage
  E.damage = function (e, amount, dir, weak, cause) {
    if (!e.alive) return;
    var def = e.def;
    // frontal armour soaks a lot unless you hit the weak point or flank it
    if (e.armour > 0 && !weak && dir) {
      var facing = -(dir.x * e.fwd.x + dir.z * e.fwd.z);
      if (facing > 0.25) amount *= (1 - e.armour * facing);
    }
    if (e.frozen > 0) amount *= 1.6;          // brittle
    if (cause === 'fire' && def.id === 'exploder') amount *= 2;
    e.hp -= amount;
    e.hitFlash = 0.1;
    if (e.plates > 0 && amount > 40) {
      e.plates--;
      e.armour *= 0.72;
      this.g.fx.sparks({ x: e.pos.x, y: e.pos.y + def.h, z: e.pos.z, nx: 0, ny: 1, nz: 0 }, 10, 0xd0c090);
      this.g.audio.play('clang', e.pos, 0.7);
      RS.bus.emit('boss-plate', e);
    }
    if (e.hp <= 0) this.kill(e, cause);
    else if (Math.random() < 0.3) this.g.audio.play('bug_hurt', e.pos, 0.5);
    // being shot makes a bug notice you
    if (e.state === 'idle') e.state = 'chase';
  };

  E.kill = function (e, cause) {
    if (!e.alive) return;
    e.alive = false;
    e.deadT = 0;
    this.killCount++;
    var g = this.g;
    g.fx.blood(e.pos.x, e.pos.y + e.def.h * 0.5, e.pos.z, 16, e.def.blood);
    g.audio.play(e.def.boss ? 'bug_roar' : 'bug_die', e.pos, e.def.boss ? 1 : 0.7, e.def.boss ? 0.7 : (0.85 + Math.random() * 0.3));
    if (e.def.suicide && cause !== 'defused') this.explode(e);
    RS.perkOnKill(g, cause);
    RS.bus.emit('enemy-killed', e, cause);
    if (g.mission) g.mission.onKill(e);
  };

  E.explode = function (e) {
    var g = this.g, def = e.def;
    g.fx.explosion(e.pos.x, e.pos.y + 0.4, e.pos.z, def.blastRadius || 4, 0x9aff40);
    g.audio.play('explode', e.pos, 0.9);
    g.terrain.carveSphere(e.pos.x, e.pos.y + 0.4, e.pos.z, (def.blastRadius || 4) * 0.35, 0.3, undefined, 0.6);
    var p = g.player;
    var d = p.pos.distanceTo(e.pos);
    if (d < (def.blastRadius || 4)) p.hurt(def.dmg * (1 - d / (def.blastRadius || 4)), def.name);
    this.sphereDamage(e.pos, (def.blastRadius || 4) * 0.8, 40, 'explosion');
  };

  E.freeze = function (e, dur) { if (e.alive) e.frozen = Math.max(e.frozen, dur); };
  E.ignite = function (e, dur) {
    if (!e.alive) return;
    e.burning = Math.max(e.burning, dur);
  };

  // ---------------------------------------------------------------- update
  E.update = function (dt) {
    var g = this.g, t = g.terrain, p = g.player;
    this.director(dt);
    for (var i = this.list.length - 1; i >= 0; i--) {
      var e = this.list[i];
      if (!e.alive) {
        e.deadT += dt;
        // slump, shrink and go
        var k = Math.min(1, e.deadT / 1.1);
        e.root.position.y -= dt * 0.9 * (1 - k);
        e.root.rotation.z += dt * 1.8 * (1 - k);
        e.root.scale.setScalar(Math.max(0.001, 1 - k));
        if (e.deadT > 1.2) { this.group.remove(e.root); this.list.splice(i, 1); }
        continue;
      }
      this.stepEnemy(e, dt, t, p);
    }
    this.updateSpit(dt);
  };

  E.stepEnemy = function (e, dt, t, p) {
    var g = this.g, def = e.def;
    e.spawnT += dt;
    if (e.hitFlash > 0) e.hitFlash -= dt;

    // status effects
    if (e.burning > 0) {
      e.burning -= dt;
      e.burnSrc -= dt;
      if (e.burnSrc <= 0) {
        e.burnSrc = 0.28;
        this.damage(e, 7, null, false, 'burn');
        if (!e.alive) return;
      }
      if (Math.random() < 0.5) g.fx.fire(e.pos.x + (Math.random() - 0.5), e.pos.y + Math.random() * def.h, e.pos.z + (Math.random() - 0.5), 0, 1.6, 0, 0.2, 0.4);
    }
    if (e.frozen > 0) {
      e.frozen -= dt;
      if (e.body.material !== this.frozenMat) e.body.material = this.frozenMat;
      e.root.position.copy(e.pos);
      return;              // frozen solid: no movement at all
    } else if (e.body.material === this.frozenMat) e.body.material = this.mat;

    // ---- pick a target -------------------------------------------------
    var tgt = this.chooseTarget(e, p);
    var tx = tgt.x, ty = tgt.y, tz = tgt.z;
    var dx = tx - e.pos.x, dy = ty - e.pos.y, dz = tz - e.pos.z;
    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;

    // A dreadnought is the only thing down here that fights back with a plan.
    if (def.boss) {
      var skip = this.stepBoss(e, dt, t, dx, dy, dz, dist, tgt);
      if (skip) { this.poseEnemy(e, dt); return; }
    }

    if (def.flying) this.stepFlyer(e, dt, t, dx, dy, dz, dist, tgt);
    else this.stepCrawler(e, dt, t, dx, dy, dz, dist, tgt);

    // ---- attacks --------------------------------------------------------
    e.atkCool -= dt;
    if (def.ranged) {
      if (dist < def.atkRange && dist > 3 && e.atkCool <= 0 && this.hasLos(e, tgt)) {
        e.atkCool = def.atkRate;
        this.fireSpit(e, tgt);
      }
    } else if (dist < def.atkRange + def.r && e.atkCool <= 0) {
      e.atkCool = def.atkRate;
      this.melee(e, tgt);
    }
    if (def.gas && e.gasCool !== undefined) {
      e.gasCool -= dt;
      if (e.gasCool <= 0 && dist < 7) {
        e.gasCool = 6;
        this.gasCloud(e);
      }
    }

    // ---- visuals --------------------------------------------------------
    this.poseEnemy(e, dt);
  };

  E.chooseTarget = function (e, p) {
    // Bugs mostly want the dwarf, but machines in the way are fair game.
    var g = this.g;
    if (e.lockTarget && e.lockTarget.alive !== false) {
      return e.lockTarget;
    }
    var best = { x: p.pos.x, y: p.pos.y + 0.8, z: p.pos.z, isPlayer: true };
    var bd = e.pos.distanceToSquared(p.pos);
    if (g.gear) {
      for (var i = 0; i < g.gear.sentries.length; i++) {
        var s = g.gear.sentries[i];
        var d = (s.x - e.pos.x) * (s.x - e.pos.x) + (s.z - e.pos.z) * (s.z - e.pos.z);
        if (d < bd * 0.4 && d < 100) { bd = d; best = { x: s.x, y: s.y + 0.4, z: s.z, sentry: s }; }
      }
    }
    if (g.units && g.units.mule && g.units.mule.active) {
      var m = g.units.mule;
      var dm = (m.pos.x - e.pos.x) * (m.pos.x - e.pos.x) + (m.pos.z - e.pos.z) * (m.pos.z - e.pos.z);
      if (dm < 36 && dm < bd * 0.3) best = { x: m.pos.x, y: m.pos.y + 1, z: m.pos.z, mule: m };
    }
    return best;
  };

  E.hasLos = function (e, tgt) {
    var dx = tgt.x - e.pos.x, dy = tgt.y - (e.pos.y + e.def.h * 0.5), dz = tgt.z - e.pos.z;
    var d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    var hit = this.g.terrain.raycast(e.pos.x, e.pos.y + e.def.h * 0.5, e.pos.z, dx / d, dy / d, dz / d, d - 0.5);
    return !hit.hit;
  };

  /* Ground bugs: stick to the nearest rock face and walk along it. */
  E.stepCrawler = function (e, dt, t, dx, dy, dz, dist, tgt) {
    var def = e.def, g = this.g;
    var r = def.r;

    // find the surface we are standing on, searching along our current up first
    var up = e.up;
    var probe = t.raycast(e.pos.x + up.x * 0.3, e.pos.y + up.y * 0.3, e.pos.z + up.z * 0.3,
      -up.x, -up.y, -up.z, r * 2.4 + 0.6);
    var found = probe.hit && !probe.inside;
    if (!found && def.climbs) {
      // look around for any face within reach — this is what lets them pour
      // down a wall and keep going along the ceiling
      var dirs = [[0, -1, 0], [up.x, up.y, up.z], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
      for (var k = 0; k < dirs.length && !found; k++) {
        var q = t.raycast(e.pos.x, e.pos.y, e.pos.z, dirs[k][0], dirs[k][1], dirs[k][2], r * 2.6);
        if (q.hit && !q.inside) { probe = q; found = true; }
      }
    } else if (!found) {
      var q2 = t.raycast(e.pos.x, e.pos.y + 0.3, e.pos.z, 0, -1, 0, r * 3.2);
      if (q2.hit && !q2.inside) { probe = q2; found = true; }
    }

    if (found) {
      e.grounded = true;
      var tn = this._n.set(probe.nx, probe.ny, probe.nz);
      if (!def.climbs && tn.y < 0.35) tn.set(0, 1, 0);     // heavies stay on the floor
      e.up.lerp(tn, Math.min(1, dt * 9)).normalize();
      // sit on the surface
      var targetPos = this._v.set(probe.x, probe.y, probe.z).addScaledVector(e.up, r * 0.9);
      e.pos.lerp(targetPos, Math.min(1, dt * 12));
      e.vel.y = 0;
    } else {
      e.grounded = false;
      e.up.lerp(this._n.set(0, 1, 0), Math.min(1, dt * 2)).normalize();
      e.vel.y -= 24 * dt;
      e.pos.y += e.vel.y * dt;
    }

    // desired direction, flattened into the surface plane
    var d = this._v.set(dx, dy, dz);
    var along = d.clone().addScaledVector(e.up, -d.dot(e.up));
    if (along.lengthSq() < 1e-6) along.set(e.fwd.x, e.fwd.y, e.fwd.z);
    along.normalize();

    var speed = def.speed * (e.lunging > 0 ? 2.2 : 1) * (this.g.slowEnemies || 1);
    if (e.state === 'idle') speed *= 0.25;
    if (e.spawnT < 0.6) speed *= e.spawnT / 0.6;

    // lunge: slashers close the last few metres in a jump
    if (def.lunge) {
      e.lunging = Math.max(0, e.lunging - dt);
      if (e.lunging <= 0 && dist < 7 && dist > 3 && Math.random() < dt * 0.8) e.lunging = 0.45;
    }

    var step = this._v2.copy(along).multiplyScalar(speed * dt);
    var nx = e.pos.x + step.x, ny = e.pos.y + step.y, nz = e.pos.z + step.z;

    // blocked? try climbing over, then give up and chew through
    var ahead = t.sample(nx + along.x * r, ny + along.y * r + 0.1, nz + along.z * r);
    if (ahead > -r * 0.4) {
      var climbX = nx + e.up.x * r * 1.1, climbY = ny + e.up.y * r * 1.1, climbZ = nz + e.up.z * r * 1.1;
      if (t.sample(climbX + along.x * r, climbY, climbZ + along.z * r) < -r * 0.3) {
        nx = climbX; ny = climbY; nz = climbZ;
        e.stuck = Math.max(0, e.stuck - dt);
      } else {
        e.stuck += dt;
        // sidestep
        var side = this._v.set(e.up.y * along.z - e.up.z * along.y, e.up.z * along.x - e.up.x * along.z, e.up.x * along.y - e.up.y * along.x);
        var sgn = ((e.wobble | 0) % 2) ? 1 : -1;
        nx = e.pos.x + side.x * sgn * speed * dt;
        ny = e.pos.y + side.y * sgn * speed * dt;
        nz = e.pos.z + side.z * sgn * speed * dt;
      }
    } else e.stuck = Math.max(0, e.stuck - dt * 0.6);

    // a properly stuck glyphid simply digs — that is how swarms reach you
    e.digCool -= dt;
    if (e.stuck > 1.1 && e.digCool <= 0) {
      e.digCool = 0.3;
      var bx = e.pos.x + along.x * (r + 0.4), by = e.pos.y + along.y * (r + 0.4) + 0.2, bz = e.pos.z + along.z * (r + 0.4);
      if (t.sample(bx, by, bz) > 0) {
        t.carveSphere(bx, by, bz, Math.max(0.9, r * 1.5), 0.3, undefined, 0.5);
        g.collectOreIn(bx, by, bz, r * 1.6);
        g.fx.rubble(bx, by, bz, RS.MAT.ROCK, 4);
        g.audio.play('pick', e.pos, 0.3);
      }
      if (e.stuck > 4) { e.stuck = 0; }
    }

    // shields are solid to bugs
    if (g.gear) {
      var blk = g.gear.blockedBy(nx, ny, nz, r * 0.8);
      if (blk) {
        nx += blk.nx * blk.depth; ny += blk.ny * blk.depth; nz += blk.nz * blk.depth;
        e.atkCool = Math.max(e.atkCool, 0.2);
      }
    }

    e.pos.set(nx, ny, nz);
    e.pos.x = RS.clamp(e.pos.x, 2, t.nx - 2);
    e.pos.z = RS.clamp(e.pos.z, 2, t.nz - 2);
    if (e.pos.y < 1) { this.kill(e, 'void'); return; }

    // face travel direction, projected into the surface plane
    e.fwd.lerp(along, Math.min(1, dt * 10)).normalize();
  };

  E.stepFlyer = function (e, dt, t, dx, dy, dz, dist, tgt) {
    var def = e.def;
    // hover at eye level and keep a stand-off distance
    var want = def.atkRange * 0.55;
    var pull = dist > want ? 1 : -0.6;
    var ax = (dx / dist) * pull, ay = (dy / dist) * pull + 0.1, az = (dz / dist) * pull;
    // drift sideways so they are not sitting ducks
    e.wobble += dt;
    var side = Math.sin(e.wobble * 0.9);
    ax += -(dz / dist) * side * 0.6; az += (dx / dist) * side * 0.6;

    // steer away from rock
    for (var k = 0; k < 3; k++) {
      var sx = e.pos.x + (k === 0 ? 1.6 : 0) * Math.sign(ax), sy = e.pos.y + (k === 1 ? 1.6 : 0), sz = e.pos.z + (k === 2 ? 1.6 : 0) * Math.sign(az);
      if (t.sample(sx, sy, sz) > -0.6) {
        var n = this._n;
        t.normalAt(e.pos.x, e.pos.y, e.pos.z, n);
        ax += n.x * 2.5; ay += n.y * 2.5; az += n.z * 2.5;
        break;
      }
    }
    if (t.sample(e.pos.x, e.pos.y, e.pos.z) > -0.4) {
      var n2 = this._n;
      t.normalAt(e.pos.x, e.pos.y, e.pos.z, n2);
      e.pos.addScaledVector(n2, dt * 6);
    }
    var acc = def.accel;
    e.vel.x += ax * acc * dt; e.vel.y += ay * acc * dt; e.vel.z += az * acc * dt;
    var sp = e.vel.length();
    var maxS = def.speed * (e.spawnT < 1 ? e.spawnT : 1);
    if (sp > maxS) e.vel.multiplyScalar(maxS / sp);
    e.vel.multiplyScalar(Math.max(0, 1 - dt * 1.4));
    e.pos.addScaledVector(e.vel, dt);
    e.pos.y = RS.clamp(e.pos.y, 2, t.ny - 2);
    e.fwd.set(dx / dist, 0, dz / dist);
    e.up.set(0, 1, 0);
  };

  /* Boss script: wind up, charge in a straight line through anything in the
     way, or stand and breathe fire. Returns true when it has taken over
     movement for this frame. */
  E.stepBoss = function (e, dt, t, dx, dy, dz, dist, tgt) {
    var g = this.g, def = e.def;
    if (!e.bossState) { e.bossState = 'move'; e.bossT = 4; e.chargeDir = new THREE.Vector3(); }
    e.bossT -= dt;

    if (e.bossState === 'move') {
      if (e.bossT <= 0) {
        // Pick from whatever is actually available at this range, otherwise a
        // charge-capable boss would never once use its fire breath.
        var opts = [];
        if (def.charge && dist > 9 && dist < 34) opts.push('windup');
        if (def.breath && dist < 17) opts.push('breath', 'breath');
        if (!opts.length) { e.bossT = 1.5 + Math.random() * 2.5; return false; }
        var pick = opts[(Math.random() * opts.length) | 0];
        if (pick === 'windup') {
          e.bossState = 'windup'; e.bossT = 1.1;
          g.audio.play('bug_roar', e.pos, 0.9, 1.2);
          g.radio('It is winding up — get out of the lane.', 'BOSCO');
        } else {
          e.bossState = 'breath'; e.bossT = 2.4;
          g.audio.play('hiss', e.pos, 1);
          g.radio('Flames! Break line of sight.', 'BOSCO');
        }
      }
      return false;                      // walk normally
    }

    if (e.bossState === 'windup') {
      // rear up and track the target until the moment it commits
      var l = Math.sqrt(dx * dx + dz * dz) || 1;
      e.chargeDir.set(dx / l, 0, dz / l);
      e.fwd.lerp(e.chargeDir, Math.min(1, dt * 6)).normalize();
      e.body.position.y = def.r * 0.55 + Math.sin(g.time * 22) * 0.1 + 0.4;
      if (e.bossT <= 0) {
        e.bossState = 'charge'; e.bossT = 1.7;
        g.audio.play('bug_roar', e.pos, 1);
        g.player.shake = Math.max(g.player.shake, 0.4);
      }
      return true;
    }

    if (e.bossState === 'charge') {
      var spd = def.speed * 3.6;
      var step = spd * dt;
      e.pos.x += e.chargeDir.x * step;
      e.pos.z += e.chargeDir.z * step;
      var fy = t.floorBelow(e.pos.x, e.pos.y + 3, e.pos.z, 8);
      if (fy !== null) e.pos.y += (fy + def.r * 0.4 - e.pos.y) * Math.min(1, dt * 8);
      // it simply goes through the rock
      t.carveSphere(e.pos.x, e.pos.y + def.h * 0.4, e.pos.z, def.r * 1.25, 0.25, undefined, 0.8);
      g.collectOreIn(e.pos.x, e.pos.y + def.h * 0.4, e.pos.z, def.r * 1.5);
      if (g.frame % 3 === 0) g.fx.dust(e.pos.x, e.pos.y + 0.4, e.pos.z, 3, 0x6a5a44, 2.4);
      g.player.shake = Math.max(g.player.shake, 0.25);
      if (dist < def.r + 2.2) {
        g.player.hurt(def.dmg * 1.4, def.name + ' charge');
        g.player.vel.x += e.chargeDir.x * 18;
        g.player.vel.z += e.chargeDir.z * 18;
        g.player.vel.y += 5;
        e.bossT = Math.min(e.bossT, 0.2);
      }
      if (e.bossT <= 0) { e.bossState = 'recover'; e.bossT = 1.4; }
      return true;
    }

    if (e.bossState === 'breath') {
      var bl = Math.sqrt(dx * dx + dz * dz) || 1;
      e.fwd.lerp(this._v.set(dx / bl, 0, dz / bl), Math.min(1, dt * 1.8)).normalize();
      var m = this._v2.set(e.pos.x + e.fwd.x * def.r, e.pos.y + def.h * 0.55, e.pos.z + e.fwd.z * def.r);
      for (var i = 0; i < 4; i++) {
        var sp = 13 + Math.random() * 7;
        g.fx.fire(m.x, m.y, m.z,
          e.fwd.x * sp + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3 + 0.8, e.fwd.z * sp + (Math.random() - 0.5) * 4,
          0.45 + Math.random() * 0.4, 0.6);
      }
      if (g.frame % 2 === 0) g.fx.flash(m.x + e.fwd.x * 3, m.y, m.z + e.fwd.z * 3, 1.6, 0xff6a20, 0.1);
      // scorch anything in the cone, the dwarf included
      var pdx = g.player.pos.x - e.pos.x, pdz = g.player.pos.z - e.pos.z;
      var pd = Math.sqrt(pdx * pdx + pdz * pdz) || 1;
      if (pd < 15 && (pdx / pd * e.fwd.x + pdz / pd * e.fwd.z) > 0.78) {
        g.player.hurt(26 * dt, def.name + ' fire');
      }
      if (e.bossT <= 0) { e.bossState = 'recover'; e.bossT = 1.0; }
      return true;
    }

    if (e.bossState === 'recover') {
      e.body.position.y = def.r * 0.55 - 0.15;
      if (e.bossT <= 0) { e.bossState = 'move'; e.bossT = 3 + Math.random() * 4; }
      return true;
    }
    return false;
  };

  E.melee = function (e, tgt) {
    var g = this.g, def = e.def;
    g.audio.play('bite', e.pos, 0.6);
    if (def.suicide) {
      this.kill(e, 'suicide');
      return;
    }
    if (tgt.isPlayer) {
      g.player.hurt(def.dmg * (0.85 + Math.random() * 0.3), def.name);
      RS.perkOnMeleeHit(g, e);
      // a solid hit shoves you
      var kx = g.player.pos.x - e.pos.x, kz = g.player.pos.z - e.pos.z;
      var kl = Math.hypot(kx, kz) || 1;
      g.player.vel.x += kx / kl * def.mass * 1.6;
      g.player.vel.z += kz / kl * def.mass * 1.6;
    } else if (tgt.sentry) {
      tgt.sentry.hp -= def.dmg;
      g.fx.sparks({ x: tgt.x, y: tgt.y, z: tgt.z, nx: 0, ny: 1, nz: 0 }, 5, 0xffd090);
      if (tgt.sentry.hp <= 0) { g.gear.removeSentry(tgt.sentry); g.toast('Gun platform destroyed'); }
    } else if (tgt.mule) {
      g.units.mule.hp -= def.dmg * 0.4;
    }
  };

  E.gasCloud = function (e) {
    var g = this.g;
    g.audio.play('spit', e.pos, 0.7);
    for (var i = 0; i < 26; i++) {
      var a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 4;
      g.fx.emit(e.pos.x, e.pos.y + 0.5, e.pos.z,
        Math.cos(a) * s, Math.random() * 1.5, Math.sin(a) * s,
        1.4, 0.4, 0x8ad040, 3, -0.1, 1.2);
    }
    var d = g.player.pos.distanceTo(e.pos);
    if (d < 6) g.player.hurt(16, 'praetorian gas');
  };

  E.fireSpit = function (e, tgt) {
    var slot = null;
    for (var i = 0; i < this.spitPool.length; i++) if (!this.spitPool[i].active) { slot = this.spitPool[i]; break; }
    if (!slot) return;
    var g = this.g;
    g.audio.play('spit', e.pos, 0.7);
    var ox = e.pos.x, oy = e.pos.y + e.def.h * 0.5, oz = e.pos.z;
    var dx = tgt.x - ox, dy = tgt.y - oy, dz = tgt.z - oz;
    var d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    var speed = 26;
    // crude lead so they actually hit a moving dwarf sometimes
    var lead = d / speed;
    dx += g.player.vel.x * lead * 0.6; dz += g.player.vel.z * lead * 0.6;
    d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    slot.active = true;
    slot.mesh.visible = true;
    slot.pos = slot.pos || new THREE.Vector3();
    slot.vel = slot.vel || new THREE.Vector3();
    slot.pos.set(ox, oy, oz);
    slot.vel.set(dx / d * speed, dy / d * speed + 2.4, dz / d * speed);
    slot.life = 0;
    slot.dmg = e.def.dmg;
    slot.kind = e.def.ranged;
    slot.mesh.position.copy(slot.pos);
    slot.mesh.scale.setScalar(e.def.ranged === 'goo' ? 0.4 : 0.28);
    this.spit.push(slot);
  };

  E.updateSpit = function (dt) {
    var g = this.g, t = g.terrain;
    for (var i = this.spit.length - 1; i >= 0; i--) {
      var s = this.spit[i];
      s.life += dt;
      s.vel.y -= 11 * dt;
      s.pos.addScaledVector(s.vel, dt);
      s.mesh.position.copy(s.pos);
      g.fx.emit(s.pos.x, s.pos.y, s.pos.z, 0, 0, 0, 0.25, 0.1, s.kind === 'goo' ? 0xc07ad0 : 0xa0e040, 3, -0.1, 2);
      var hitPlayer = g.player.pos.distanceTo(s.pos) < 1.1;
      var blocked = g.gear && g.gear.blockedBy(s.pos.x, s.pos.y, s.pos.z, 0.2) && !(g.gear.insideShield(s.pos) && g.gear.insideShield(g.player.pos));
      if (hitPlayer || t.sample(s.pos.x, s.pos.y, s.pos.z) > 0 || s.life > 4 || blocked) {
        if (hitPlayer) {
          g.player.hurt(s.dmg, 'acid');
          if (s.kind === 'goo') g.player.slowUntil = g.time + 2.5;
        }
        g.fx.blood(s.pos.x, s.pos.y, s.pos.z, 8, s.kind === 'goo' ? 0xc07ad0 : 0xa0e040);
        s.active = false; s.mesh.visible = false;
        this.spit.splice(i, 1);
      }
    }
  };

  /* Pose: body bob and roll on the walk cycle, legs scissoring out of phase.
     Orientation comes from the surface normal, so a bug on the ceiling is
     genuinely upside down. */
  var _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
  E.poseEnemy = function (e, dt) {
    var def = e.def;
    e.walkT += dt * (def.flying ? 18 : (4 + def.speed * 1.6));
    var root = e.root;
    root.position.copy(e.pos);

    // build an orientation from forward + up
    var f = this._v.copy(e.fwd);
    var u = this._v2.copy(e.up);
    f.addScaledVector(u, -f.dot(u));
    if (f.lengthSq() < 1e-6) f.set(0, 0, 1);
    f.normalize();
    var right = new THREE.Vector3().crossVectors(u, f);
    _m.makeBasis(right, u, f);
    _q.setFromRotationMatrix(_m);
    root.quaternion.slerp(_q, Math.min(1, dt * 12));

    var bob = Math.sin(e.walkT) * (def.flying ? 0.09 : 0.06) * def.model.scale;
    var roll = Math.cos(e.walkT * 0.5) * 0.06;
    e.body.position.set(0, def.r * 0.55 + bob, 0);
    e.body.rotation.set(Math.sin(e.walkT * 0.5) * 0.05, 0, roll);
    if (e.hitFlash > 0) e.body.position.y += 0.03 * Math.sin(e.hitFlash * 90);

    if (def.flying) {
      for (var i = 0; i < e.limbs.length; i++) {
        e.limbs[i].position.set(0, def.r * 0.75, 0);
        e.limbs[i].rotation.z = Math.sin(e.walkT) * 0.75 * (i ? -1 : 1);
      }
    } else {
      for (var k = 0; k < e.limbs.length; k++) {
        var ph = k ? e.walkT : e.walkT + Math.PI;
        e.limbs[k].position.set(0, def.r * 0.55 + bob * 0.4, 0);
        e.limbs[k].rotation.set(Math.sin(ph) * 0.3, Math.sin(ph) * 0.26, 0);
      }
    }
    // lunging slashers lean into it
    if (e.lunging > 0) e.body.rotation.x -= 0.4;
  };

  // ------------------------------------------------------------- director
  /* Keeps a trickle of bugs around and fires off proper swarms. Composition
     and size scale with the hazard level and how far the mission has got. */
  E.director = function (dt) {
    var g = this.g;
    var p = g.player;
    this.tension = RS.damp(this.tension, this.wave ? 1 : RS.clamp01(this.count() / 12), 0.6, dt);
    g.audio.setTension(this.tension);

    if (g.mission && g.mission.state === 'complete') return;
    if (p.dead) return;

    this.nextAmbient -= dt;
    if (this.nextAmbient <= 0) {
      this.nextAmbient = Math.max(7, 26 - this.hazard * 2.5) * (0.7 + Math.random() * 0.8);
      var n = 1 + Math.floor(Math.random() * (1 + this.hazard * 0.6));
      this.spawnGroup(this.pickAmbient(), n);
    }

    if (this.wave) {
      this.wave.t += dt;
      if (this.wave.pending > 0 && this.wave.t > this.wave.nextAt) {
        var batch = Math.min(this.wave.pending, 3 + ((Math.random() * 3) | 0));
        this.spawnGroup(this.wave.pick(), batch, true);
        this.wave.pending -= batch;
        this.wave.nextAt = this.wave.t + 0.7 + Math.random() * 1.1;
      }
      if (this.wave.pending <= 0 && this.count() < 3) {
        this.wave = null;
        g.radio('Swarm neutralised. Good work down there.');
        RS.bus.emit('swarm-end');
      }
    }
  };

  E.count = function () {
    var n = 0;
    for (var i = 0; i < this.list.length; i++) if (this.list[i].alive) n++;
    return n;
  };

  E.pickAmbient = function () {
    var r = Math.random();
    if (r < 0.34) return 'grunt';
    if (r < 0.52) return 'swarmer';
    if (r < 0.68) return 'slasher';
    if (r < 0.8) return 'spitter';
    if (r < 0.9) return 'guard';
    return 'mactera';
  };

  E.startSwarm = function (sizeMul, reason) {
    if (this.wave) { this.wave.pending += Math.round(14 * (sizeMul || 1)); return; }
    var haz = this.hazard;
    var total = Math.round((16 + haz * 7) * (sizeMul || 1));
    var self = this;
    this.wave = {
      t: 0, nextAt: 0.4, pending: total,
      pick: function () {
        var r = Math.random();
        if (r < 0.3) return 'swarmer';
        if (r < 0.58) return 'grunt';
        if (r < 0.72) return 'slasher';
        if (r < 0.82) return 'exploder';
        if (r < 0.9) return 'guard';
        if (r < 0.96) return 'spitter';
        return haz >= 4 ? 'praetorian' : 'mactera';
      }
    };
    this.g.audio.play('swarm', null, 1.0);
    this.g.radio(reason || 'Heads up! Massive swarm inbound — hold position and kill everything.');
    RS.bus.emit('swarm-start');
  };

  /* Spawn a group out of sight, preferring burrow points behind the player. */
  E.spawnGroup = function (typeId, n, nearPlayer) {
    var g = this.g, w = g.world, p = g.player;
    if (!w || !w.spawnPts.length) return;
    var best = [], i;
    for (i = 0; i < w.spawnPts.length; i++) {
      var s = w.spawnPts[i];
      var d = Math.hypot(s.x - p.pos.x, s.y - p.pos.y, s.z - p.pos.z);
      if (d < 10) continue;
      if (nearPlayer && d > 42) continue;
      if (!nearPlayer && d > 70) continue;
      best.push({ s: s, d: d });
    }
    if (!best.length) {
      for (i = 0; i < w.spawnPts.length; i++) best.push({ s: w.spawnPts[i], d: 50 });
    }
    best.sort(function (a, b) { return a.d - b.d; });
    var pickFrom = best.slice(0, Math.max(3, Math.min(14, best.length)));
    var site = pickFrom[(Math.random() * pickFrom.length) | 0].s;
    for (i = 0; i < n; i++) {
      var ox = site.x + (Math.random() - 0.5) * 4;
      var oz = site.z + (Math.random() - 0.5) * 4;
      var oy = site.y + 0.6 + Math.random() * 0.5;
      var e = this.spawn(typeId, ox, oy, oz, { emerge: true });
      if (e) {
        g.fx.dust(ox, oy, oz, 4, 0x5a4a32, 1.6);
        if (i === 0) g.audio.play('bug_screech', e.pos, 0.6);
      }
    }
  };

  E.spawnBoss = function (x, y, z) {
    var e = this.spawn('dreadnought', x, y + 1.5, z);
    if (e) {
      this.g.audio.play('bug_roar', e.pos, 1.0);
      this.g.fx.explosion(x, y, z, 5, 0xff6020);
      RS.bus.emit('boss-spawn', e);
    }
    return e;
  };

  E.killAll = function () {
    for (var i = 0; i < this.list.length; i++) if (this.list[i].alive) this.kill(this.list[i], 'cleanup');
  };

  E.dispose = function () {
    this.g.scene.remove(this.group);
    this.list.length = 0; this.spit.length = 0;
    this.frozenMat.dispose(); this.spitMat.dispose();
    for (var k in this.geoCache) {
      var c = this.geoCache[k];
      for (var g2 in c) c[g2].dispose();
    }
    this.geoCache = {};
  };
})(window.RS);
