/* Rock & Stone — deployed equipment: engineer platforms and sentries, gunner
   ziplines and shields, driller satchel charges. Everything here persists in
   the cave and most of it can be stood on. */
(function (RS) {
  'use strict';

  RS.Gear = function (game) {
    this.g = game;
    this.platforms = [];
    this.ziplines = [];
    this.sentries = [];
    this.shields = [];
    this.c4s = [];
    this.group = new THREE.Group();
    game.scene.add(this.group);
    RS.initPrims();
    var mats = RS.makeMats();
    this.mat = mats.flat;
    this.metal = mats.metal;
    this.platGeo = RS.buildPlatform();
    this.sentryGeo = RS.buildSentry();
    this.sentryHeadGeo = RS.buildSentryHead();
    this.c4Geo = RS.buildC4();
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x3ac8ff, transparent: true, opacity: 0.17,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    this.zipMat = new THREE.LineBasicMaterial({ color: 0xd8a830 });
    this._v = new THREE.Vector3();
  };
  var GR = RS.Gear.prototype;

  // ----------------------------------------------------------- platforms
  GR.addPlatform = function (x, y, z, nx, ny, nz) {
    // Platforms always build flat, whatever surface they are shot at.
    var py = y + 0.08;
    if (ny < 0.3) py = y + 0.3;
    var m = new THREE.Mesh(this.platGeo, this.mat);
    m.position.set(x, py, z);
    m.scale.set(0.001, 0.001, 0.001);
    this.group.add(m);
    var p = { x: x, y: py + 0.08, z: z, r: 2.0, mesh: m, t: 0 };
    this.platforms.push(p);
    this.g.platforms.push(p);
    this.g.fx.dust(x, py, z, 8, 0xd8d24a, 1.5);
    this.g.audio.play('platform', { x: x, y: py, z: z }, 0.6);
    if (this.platforms.length > 40) {
      var old = this.platforms.shift();
      RS.removeFrom(this.g.platforms, old);
      this.group.remove(old.mesh);
    }
    return p;
  };

  // ----------------------------------------------------------- ziplines
  GR.addZipline = function (a, b) {
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z], 3));
    var line = new THREE.Line(geo, this.zipMat);
    line.frustumCulled = false;
    this.group.add(line);
    var anchorA = new THREE.Mesh(RS.PRIM.cylLo, this.metal);
    anchorA.position.copy(a); anchorA.scale.set(0.3, 0.3, 0.3);
    var anchorB = anchorA.clone(); anchorB.position.copy(b);
    this.group.add(anchorA); this.group.add(anchorB);
    var z = { a: a.clone(), b: b.clone(), len: a.distanceTo(b), line: line, anchors: [anchorA, anchorB] };
    this.ziplines.push(z);
    this.g.ziplines.push(z);
    this.g.toast('Zipline deployed — press E on the line to ride');
    return z;
  };

  // Nearest point on any zipline within reach, for mounting.
  GR.ziplineNear = function (pos, maxDist) {
    var best = null, bestD = maxDist * maxDist;
    for (var i = 0; i < this.ziplines.length; i++) {
      var z = this.ziplines[i];
      var ab = this._v.copy(z.b).sub(z.a);
      var t = RS.clamp(this._v.copy(pos).sub(z.a).dot(ab) / ab.lengthSq(), 0, 1);
      var px = z.a.x + ab.x * t, py = z.a.y + ab.y * t, pz = z.a.z + ab.z * t;
      var dx = px - pos.x, dy = py - pos.y - 1.2, dz = pz - pos.z;
      var d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bestD) { bestD = d2; best = { zip: z, t: t }; }
    }
    return best;
  };

  GR.mountZipline = function () {
    var p = this.g.player;
    var near = this.ziplineNear(p.pos, 3.4);
    if (!near) return false;
    p.onZip = near.zip;
    p.zipT = near.t;
    // ride downhill by default; uphill if that is the only way
    p.zipDir = (near.zip.b.y < near.zip.a.y) ? 1 : -1;
    if (near.t <= 0.02) p.zipDir = 1;
    if (near.t >= 0.98) p.zipDir = -1;
    this.g.audio.loop('zipride', true, 0.2);
    return true;
  };

  // ----------------------------------------------------------- sentries
  GR.addSentry = function (x, y, z) {
    var base = new THREE.Mesh(this.sentryGeo, this.metal);
    base.position.set(x, y + 0.05, z);
    var head = new THREE.Mesh(this.sentryHeadGeo, this.metal);
    head.position.set(x, y + 0.42, z);
    this.group.add(base); this.group.add(head);
    var s = {
      x: x, y: y, z: z, base: base, head: head, hp: 200, ammo: 220,
      cool: 0, target: null, yaw: 0, pitch: 0, scanT: 0
    };
    this.sentries.push(s);
    if (this.sentries.length > 2) this.removeSentry(this.sentries[0]);
    this.g.toast('Gun platform online');
    return s;
  };

  GR.removeSentry = function (s) {
    this.group.remove(s.base); this.group.remove(s.head);
    RS.removeFrom(this.sentries, s);
    var w = this.g.weapons && this.g.weapons.list.filter(function (x) { return x.kind === 'sentry'; })[0];
    if (w && w.charges < w.chargeMax) w.charges++;
  };

  GR.recallSentry = function () {
    if (!this.sentries.length) return;
    var p = this.g.player, best = null, bd = 1e9;
    for (var i = 0; i < this.sentries.length; i++) {
      var d = (this.sentries[i].x - p.pos.x) * (this.sentries[i].x - p.pos.x) + (this.sentries[i].z - p.pos.z) * (this.sentries[i].z - p.pos.z);
      if (d < bd) { bd = d; best = this.sentries[i]; }
    }
    if (best && bd < 400) {
      this.removeSentry(best);
      this.g.toast('Gun platform recalled');
      this.g.audio.play('platform', null, 0.5);
    }
  };

  GR.updateSentries = function (dt) {
    var g = this.g;
    for (var i = this.sentries.length - 1; i >= 0; i--) {
      var s = this.sentries[i];
      s.cool = Math.max(0, s.cool - dt);
      if (s.ammo <= 0) { this.removeSentry(s); g.toast('Gun platform out of ammo'); continue; }
      // reacquire periodically rather than every frame
      s.scanT -= dt;
      if (s.scanT <= 0 || !s.target || !s.target.alive) {
        s.scanT = 0.3;
        s.target = g.enemies ? g.enemies.nearestTo(s.x, s.y + 0.4, s.z, 26, true) : null;
      }
      if (s.target && s.target.alive) {
        var tx = s.target.pos.x, ty = s.target.pos.y + s.target.def.h * 0.5, tz = s.target.pos.z;
        var wantYaw = Math.atan2(tx - s.x, tz - s.z);
        s.yaw = wantYaw;
        s.head.rotation.y = s.yaw;
        var dx = tx - s.x, dy = ty - (s.y + 0.42), dz = tz - s.z;
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        s.head.rotation.x = Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz)) * -1;
        if (s.cool <= 0) {
          s.cool = 0.1;
          s.ammo--;
          g.enemies.damage(s.target, 9, { x: dx / d, y: dy / d, z: dz / d }, false, 'sentry');
          g.fx.tracer(s.x, s.y + 0.45, s.z, tx, ty, tz, 0xffd27a);
          g.fx.flash(s.x, s.y + 0.5, s.z, 0.9, 0xffc070, 0.05);
          g.audio.play('gun_nail', { x: s.x, y: s.y, z: s.z }, 0.35);
        }
      } else {
        s.head.rotation.y += dt * 0.5;
      }
    }
  };

  // ----------------------------------------------------------- shields
  GR.addShield = function (x, y, z, r, dur) {
    var m = new THREE.Mesh(RS.PRIM.sphere, this.shieldMat);
    m.position.set(x, y, z);
    m.scale.setScalar(r * 2);
    this.group.add(m);
    var s = { x: x, y: y, z: z, r: r, t: 0, dur: dur, mesh: m };
    this.shields.push(s);
    return s;
  };

  GR.insideShield = function (p) {
    for (var i = 0; i < this.shields.length; i++) {
      var s = this.shields[i];
      var dx = p.x - s.x, dy = p.y - s.y, dz = p.z - s.z;
      if (dx * dx + dy * dy + dz * dz < s.r * s.r) return s;
    }
    return null;
  };

  // Enemies and hostile projectiles stop at the dome.
  GR.blockedBy = function (x, y, z, r) {
    for (var i = 0; i < this.shields.length; i++) {
      var s = this.shields[i];
      var dx = x - s.x, dy = y - s.y, dz = z - s.z;
      var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < s.r + (r || 0) && d > 0.01) return { s: s, nx: dx / d, ny: dy / d, nz: dz / d, depth: s.r + (r || 0) - d };
    }
    return null;
  };

  GR.updateShields = function (dt) {
    var g = this.g;
    for (var i = this.shields.length - 1; i >= 0; i--) {
      var s = this.shields[i];
      s.t += dt;
      var k = s.t / s.dur;
      if (k >= 1) { this.group.remove(s.mesh); this.shields.splice(i, 1); g.audio.play('shieldbreak', { x: s.x, y: s.y, z: s.z }, 0.6); continue; }
      var pulse = 1 + Math.sin(s.t * 6) * 0.012;
      s.mesh.scale.setScalar(s.r * 2 * pulse * Math.min(1, s.t * 6));
      s.mesh.material.opacity = 0.17 * (k > 0.8 ? (1 - (k - 0.8) / 0.2) * 0.6 + 0.4 : 1);
      // the bubble is a safe pocket: it tops you back up
      var p = g.player;
      var dx = p.pos.x - s.x, dy = p.pos.y - s.y, dz = p.pos.z - s.z;
      if (dx * dx + dy * dy + dz * dz < s.r * s.r) {
        p.shieldTimer = 99;
        p.shield = Math.min(p.maxShield, p.shield + p.maxShield * dt * 0.8);
        p.heal(7 * dt);
      }
    }
  };

  // ----------------------------------------------------------- C4
  GR.addC4 = function (x, y, z, dmg, radius) {
    var m = new THREE.Mesh(this.c4Geo, this.metal);
    m.position.set(x, y, z);
    this.group.add(m);
    var c = { x: x, y: y, z: z, mesh: m, dmg: dmg, radius: radius, t: 0 };
    this.c4s.push(c);
    return c;
  };

  GR.detonateC4 = function () {
    if (!this.c4s.length) { this.g.toast('Nothing to detonate'); return; }
    var g = this.g;
    for (var i = 0; i < this.c4s.length; i++) {
      var c = this.c4s[i];
      this.group.remove(c.mesh);
      g.fx.explosion(c.x, c.y, c.z, c.radius, 0xffb050);
      g.audio.play('c4', { x: c.x, y: c.y, z: c.z }, 1.0);
      g.terrain.carveSphere(c.x, c.y, c.z, c.radius * 0.72, 0.35, undefined, 1.0);
      g.collectOreIn(c.x, c.y, c.z, c.radius * 0.85);
      if (g.enemies) g.enemies.sphereDamage({ x: c.x, y: c.y, z: c.z }, c.radius, c.dmg, 'explosion');
      var pdx = g.player.pos.x - c.x, pdy = g.player.pos.y - c.y, pdz = g.player.pos.z - c.z;
      var d = Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz);
      if (d < c.radius * 1.25) {
        g.player.hurt(c.dmg * 0.18 * (1 - d / (c.radius * 1.25)), 'own C4');
        g.player.shake = 1.4;
      }
      g.player.shake = Math.max(g.player.shake, RS.clamp(1.6 - d * 0.08, 0, 1.4));
    }
    this.c4s.length = 0;
  };

  // ----------------------------------------------------------- shared
  GR.supportAt = function (x, y, z, maxDrop) {
    var best = null;
    for (var i = 0; i < this.platforms.length; i++) {
      var p = this.platforms[i];
      if (p.t < 0.25) continue;
      var dx = x - p.x, dz = z - p.z;
      if (dx * dx + dz * dz > p.r * p.r) continue;
      if (y >= p.y - 0.2 && y - p.y < maxDrop && (best === null || p.y > best)) best = p.y;
    }
    return best;
  };

  GR.nearHeat = function (pos) {
    for (var i = 0; i < this.c4s.length; i++) {
      var c = this.c4s[i];
      var dx = c.x - pos.x, dz = c.z - pos.z;
      if (dx * dx + dz * dz < 25) return true;
    }
    return false;
  };

  GR.update = function (dt) {
    for (var i = 0; i < this.platforms.length; i++) {
      var p = this.platforms[i];
      if (p.t < 1) {
        p.t = Math.min(1, p.t + dt * 3.2);
        var s = p.t < 0.6 ? p.t / 0.6 : 1;
        p.mesh.scale.set(s, 1, s);
      }
    }
    this.updateSentries(dt);
    this.updateShields(dt);
    // interact key mounts a zipline
    if (this.g.wasPressed('KeyE')) {
      if (!this.g.tryInteract || !this.g.tryInteract()) this.mountZipline();
    }
  };

  GR.dispose = function () {
    this.g.scene.remove(this.group);
    this.platforms.length = 0; this.ziplines.length = 0;
    this.sentries.length = 0; this.shields.length = 0; this.c4s.length = 0;
    this.shieldMat.dispose(); this.zipMat.dispose();
  };
})(window.RS);
