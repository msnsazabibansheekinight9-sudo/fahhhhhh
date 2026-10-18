/* Rock & Stone — friendly hardware. The drop pod that puts you in the hole,
   the M.U.L.E. that carries what you dig out, Bosco the mining drone that
   keeps a solo dwarf alive, and the resupply pods nitra pays for. */
(function (RS) {
  'use strict';

  RS.Units = function (game) {
    this.g = game;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    var mats = RS.makeMats();
    this.mat = mats.flat;
    this.metal = mats.metal;
    this.resupplies = [];
    this.escapePod = null;
    this._v = new THREE.Vector3();
    this.buildDropPod();
    this.buildMule();
    this.buildBosco();
    this.resupplyGeo = RS.buildResupplyPod();
    this.crateGeo = RS.buildAmmoCrate();
  };
  var U = RS.Units.prototype;

  // ------------------------------------------------------------- drop pod
  U.buildDropPod = function () {
    var g = this.g;
    var start = g.world.start;
    this.podMat = this.metal.clone();
    this.podMat.side = THREE.DoubleSide;
    var mesh = new THREE.Mesh(RS.buildDropPod(false), this.podMat);
    mesh.frustumCulled = false;
    // turn the doorway to face the way the dwarf is looking
    mesh.rotation.y = g.player.yaw;
    this.group.add(mesh);
    // Carve a shaft so the pod has somewhere to come down from and leave by.
    var ceilY = Math.min(g.terrain.ny - 6, start.y + 34);
    g.terrain.carveTube(start.x, start.y + 1, start.z, start.x, ceilY, start.z, 4.0, 0.12, 1.6);
    this.dropPod = {
      mesh: mesh, x: start.x, z: start.z, groundY: start.y - 0.2,
      topY: ceilY, t: 0, state: 'descend', timer: 0
    };
    mesh.position.set(start.x, ceilY, start.z);
    g.cinematic = true;
    this.light = new THREE.PointLight(0xffd080, 0, 15, 1.9);
    this.group.add(this.light);
  };

  U.updateDropPod = function (dt) {
    var d = this.dropPod;
    if (!d) return;
    var g = this.g, p = g.player;
    d.timer += dt;
    if (d.state === 'descend') {
      d.t = Math.min(1, d.t + dt / 3.6);
      var k = 1 - Math.pow(1 - d.t, 2.2);
      var y = RS.lerp(d.topY, d.groundY, k);
      d.mesh.position.y = y;
      // player rides down inside
      p.pos.set(d.x, y + 1.0, d.z);
      p.vel.set(0, 0, 0);
      p.yaw += dt * 0.12;
      p.updateCamera(dt);
      this.light.position.set(d.x, y + 2, d.z);
      this.light.intensity = 0.85;
      g.player.shake = Math.max(g.player.shake, 0.12 + d.t * 0.2);
      if (d.t > 0.7) {
        g.fx.dust(d.x + (Math.random() - 0.5) * 5, d.groundY + 0.3, d.z + (Math.random() - 0.5) * 5, 2, 0x55493a, 2);
      }
      if (d.t >= 1) {
        d.state = 'step'; d.timer = 0;
        g.audio.play('pod_land', p.pos, 1);
        g.player.shake = 0.9;
        g.fx.dust(d.x, d.groundY, d.z, 22, 0x55493a, 7);
        d.exitYaw = p.yaw;
        g.radio('Welcome to ' + g.biome.name + '. Management expects a full load.');
      }
    } else if (d.state === 'step') {
      // walk out of the open door rather than teleporting onto the rock
      var ex = -Math.sin(d.exitYaw), ez = -Math.cos(d.exitYaw);
      if (d.timer > 0.9) {
        var k2 = RS.clamp01((d.timer - 0.9) / 1.2);
        var dist = k2 * 7.0;
        var fy = g.terrain.floorBelow(d.x + ex * dist, d.groundY + 2.5, d.z + ez * dist, 8);
        p.pos.set(d.x + ex * dist, fy === null ? d.groundY : fy, d.z + ez * dist);
        p.updateCamera(dt);
        if (k2 >= 1) { d.state = 'open'; d.timer = 0; g.cinematic = false; }
      }
      this.light.intensity = 0.7;
    } else if (d.state === 'open') {
      if (d.timer > 5.5) { d.state = 'leave'; d.timer = 0; g.audio.play('pod_launch', p.pos, 0.9); }
      this.light.intensity = 0.6 + Math.sin(g.time * 3) * 0.08;
    } else if (d.state === 'leave') {
      d.mesh.position.y += dt * (3 + d.timer * d.timer * 5);
      this.light.position.y = d.mesh.position.y;
      this.light.intensity = Math.max(0, 1.1 - d.timer * 0.4);
      g.fx.dust(d.x + (Math.random() - 0.5) * 3, d.mesh.position.y, d.z + (Math.random() - 0.5) * 3, 2, 0x6a5a48, 2);
      if (d.mesh.position.y > d.topY + 6) {
        this.group.remove(d.mesh);
        this.light.intensity = 0;
        this.dropPod = null;
      }
    }
  };

  // ----------------------------------------------------------------- MULE
  U.buildMule = function () {
    var g = this.g;
    var root = new THREE.Group();
    var body = new THREE.Mesh(RS.buildMule(), this.metal);
    body.frustumCulled = false;
    root.add(body);
    var legs = [];
    var legGeo = RS.buildMuleLeg();
    for (var i = 0; i < 4; i++) {
      var l = new THREE.Mesh(legGeo, this.metal);
      l.position.set((i % 2 ? 1 : -1) * 0.5, 0.8, (i < 2 ? 1 : -1) * 0.55);
      l.frustumCulled = false;
      root.add(l); legs.push(l);
    }
    this.group.add(root);
    var s = g.world.start;
    this.mule = {
      root: root, body: body, legs: legs, active: true,
      pos: new THREE.Vector3(s.x + 3.2, s.y, s.z + 1.4),
      target: null, yaw: 0, walkT: 0, speed: 3.4, stuck: 0,
      hp: 400, state: 'idle', deposited: { nitra: 0, morkite: 0, gold: 0, crystal: 0 },
      calling: 0, beepT: 0
    };
    root.position.copy(this.mule.pos);
  };

  U.callMule = function () {
    var m = this.mule, p = this.g.player;
    if (!m.active) return;
    m.target = new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z);
    m.state = 'walk';
    this.g.audio.play('beep', m.pos, 0.6);
    this.g.toast('M.U.L.E. called');
  };

  U.updateMule = function (dt) {
    var m = this.mule;
    if (!m || !m.active) return;
    var g = this.g, t = g.terrain;

    // Once the pod is down she makes her own way to it, same as you.
    if (g.mission && g.mission.state === 'extracting' && this.escapePod && this.escapePod.landed) {
      if (!m.headingHome) {
        m.headingHome = true;
        m.target = new THREE.Vector3(this.escapePod.x, this.escapePod.y, this.escapePod.z);
        m.state = 'walk';
        m.speed = 5.0;
      } else if (m.state === 'idle') {
        var dpx = this.escapePod.x - m.pos.x, dpz = this.escapePod.z - m.pos.z;
        if (dpx * dpx + dpz * dpz > 16) {
          m.target = new THREE.Vector3(this.escapePod.x, this.escapePod.y, this.escapePod.z);
          m.state = 'walk';
        }
      }
    }
    m.beepT -= dt;
    if (m.beepT <= 0) { m.beepT = 4 + Math.random() * 4; g.audio.play('beep', m.pos, 0.18); }

    if (m.state === 'walk' && m.target) {
      var dx = m.target.x - m.pos.x, dz = m.target.z - m.pos.z;
      var d = Math.hypot(dx, dz);
      if (d < 2.2) { m.state = 'idle'; m.target = null; }
      else {
        var step = Math.min(d, m.speed * dt);
        var nx = m.pos.x + dx / d * step, nz = m.pos.z + dz / d * step;
        // step up small ledges, walk around anything bigger
        var fy = t.floorBelow(nx, m.pos.y + 2.2, nz, 6);
        if (fy !== null && Math.abs(fy - m.pos.y) < 1.8) {
          m.pos.x = nx; m.pos.z = nz;
          m.pos.y += (fy - m.pos.y) * Math.min(1, dt * 7);
          m.stuck = Math.max(0, m.stuck - dt);
        } else {
          m.stuck += dt;
          // sidestep around the obstruction
          m.pos.x += -dz / d * m.speed * dt * 0.8;
          m.pos.z += dx / d * m.speed * dt * 0.8;
          var fy2 = t.floorBelow(m.pos.x, m.pos.y + 2.2, m.pos.z, 6);
          if (fy2 !== null) m.pos.y += (fy2 - m.pos.y) * Math.min(1, dt * 7);
        }
        // a mule that has been wedged for a while just walks her way free
        if (m.stuck > 5) {
          m.stuck = 0;
          var p2 = g.player;
          var fy3 = t.floorBelow(p2.pos.x, p2.pos.y + 2, p2.pos.z, 8);
          m.pos.set(p2.pos.x - 1.6, fy3 === null ? p2.pos.y : fy3, p2.pos.z - 1.6);
          g.fx.dust(m.pos.x, m.pos.y, m.pos.z, 10, 0x6a6a72, 1.5);
        }
        m.yaw = RS.damp(m.yaw, Math.atan2(dx, dz), 6, dt);
        m.walkT += dt * 7;
      }
    } else {
      var fy4 = t.floorBelow(m.pos.x, m.pos.y + 1.6, m.pos.z, 4);
      if (fy4 !== null) m.pos.y += (fy4 - m.pos.y) * Math.min(1, dt * 5);
      m.walkT += dt * 0.6;
    }
    m.root.position.copy(m.pos);
    m.root.rotation.y = m.yaw;
    m.body.position.y = Math.sin(m.walkT * 2) * 0.04;
    for (var i = 0; i < m.legs.length; i++) {
      m.legs[i].rotation.x = Math.sin(m.walkT + i * 1.57) * 0.45;
    }
  };

  U.depositAt = function () {
    var m = this.mule, p = this.g.player, g = this.g;
    if (!m.active) return false;
    if (p.pos.distanceTo(m.pos) > 3.6) return false;
    var any = 0;
    for (var k in p.resources) {
      if (p.resources[k] > 0) {
        m.deposited[k] = (m.deposited[k] || 0) + p.resources[k];
        any += p.resources[k];
        if (g.mission) g.mission.onDeposit(k, p.resources[k]);
        p.resources[k] = 0;
      }
    }
    if (any > 0) {
      RS.perkOnDeposit(g);
      g.audio.play('deposit', m.pos, 0.9);
      g.fx.dust(m.pos.x, m.pos.y + 1.6, m.pos.z, 10, 0x60ff90, 1);
      g.toast('Deposited ' + any + ' units');
      return true;
    }
    g.toast('Nothing to deposit');
    return false;
  };

  // ---------------------------------------------------------------- Bosco
  U.buildBosco = function () {
    var g = this.g;
    var mesh = new THREE.Mesh(RS.buildBosco(), this.metal);
    mesh.frustumCulled = false;
    this.group.add(mesh);
    var s = g.world.start;
    this.bosco = {
      mesh: mesh, pos: new THREE.Vector3(s.x - 1.5, s.y + 2.2, s.z),
      vel: new THREE.Vector3(), target: null, mineTarget: null,
      cool: 0, state: 'follow', reviveT: 0, mineT: 0, bobT: 0, yaw: 0,
      salute: 0, hp: 100
    };
    mesh.position.copy(this.bosco.pos);
    this.boscoLight = new THREE.PointLight(0x80d0ff, 0.0, 10, 1.6);
    this.group.add(this.boscoLight);
  };

  U.boscoSalute = function () { this.bosco.salute = 1.2; };

  U.orderBoscoMine = function (point) {
    var b = this.bosco, g = this.g;
    if (!g.decor) return;
    var list = g.decor.oreInSphere(point.x, point.y, point.z, 2.6);
    if (!list.length) { g.audio.play('beep', null, 0.3); return false; }
    b.mineTarget = list[0];
    b.state = 'mine';
    g.audio.play('beep', null, 0.5);
    g.toast('Bosco: mining that for you');
    return true;
  };

  U.updateBosco = function (dt) {
    var b = this.bosco, g = this.g, p = g.player, t = g.terrain;
    b.bobT += dt;
    b.cool = Math.max(0, b.cool - dt);
    b.salute = Math.max(0, b.salute - dt);

    var want = this._v;
    var speed = 9;

    if (p.downed && !p.dead) {
      b.state = 'revive';
    } else if (b.state === 'revive') {
      b.state = 'follow'; b.reviveT = 0;
    }

    if (b.state === 'revive') {
      want.set(p.pos.x, p.pos.y + 1.1, p.pos.z);
      var dr = b.pos.distanceTo(want);
      if (dr < 2.2) {
        b.reviveT += dt;
        p.reviveProgress = RS.clamp01(b.reviveT / 5.5);
        g.fx.emit(p.pos.x + (Math.random() - 0.5), p.pos.y + 0.6, p.pos.z + (Math.random() - 0.5),
          0, 1.2, 0, 0.4, 0.12, 0x60ff90, 4, -0.2, 1.5);
        if (b.reviveT >= 5.5) {
          p.revive();
          b.reviveT = 0; b.state = 'follow';
          g.audio.play('revive', null, 0.9);
          g.toast('Bosco got you back on your feet');
        }
      } else b.reviveT = Math.max(0, b.reviveT - dt * 0.5);
      speed = 13;
    } else if (b.state === 'mine' && b.mineTarget && b.mineTarget.alive) {
      var m = b.mineTarget;
      want.set(m.x + m.nx * 2.2, m.y + m.ny * 2.2 + 0.4, m.z + m.nz * 2.2);
      if (b.pos.distanceTo(want) < 2.6) {
        b.mineT += dt;
        g.fx.tracer(b.pos.x, b.pos.y - 0.2, b.pos.z, m.x, m.y, m.z, 0x60ffd0);
        g.fx.sparks({ x: m.x, y: m.y, z: m.z, nx: m.nx, ny: m.ny, nz: m.nz }, 2, 0x80ffd0);
        if (b.mineT > 1.6) {
          b.mineT = 0;
          t.carveSphere(m.x, m.y, m.z, 1.2, 0.3, undefined, 0.5);
          g.collectOreIn(m.x, m.y, m.z, 1.8);
          g.audio.play('pickbig', b.pos, 0.5);
          b.mineTarget = null; b.state = 'follow';
        }
      }
      speed = 11;
    } else {
      b.state = 'follow';
      // hold station over the dwarf's shoulder
      var side = Math.sin(b.bobT * 0.5) * 0.6;
      want.set(
        p.pos.x - Math.sin(p.yaw) * -1.9 + Math.cos(p.yaw) * (1.6 + side),
        p.pos.y + 2.0 + Math.sin(b.bobT * 1.3) * 0.18,
        p.pos.z - Math.cos(p.yaw) * -1.9 - Math.sin(p.yaw) * (1.6 + side)
      );
      // shoot things
      if (b.cool <= 0) {
        var e = g.enemies ? g.enemies.nearestTo(b.pos.x, b.pos.y, b.pos.z, 26, true) : null;
        if (e) {
          b.cool = 0.55;
          g.enemies.damage(e, 22, null, false, 'bosco');
          g.fx.tracer(b.pos.x, b.pos.y, b.pos.z, e.pos.x, e.pos.y + e.def.h * 0.5, e.pos.z, 0x90e0ff);
          g.fx.flash(b.pos.x, b.pos.y, b.pos.z, 0.8, 0x90e0ff, 0.05);
          g.audio.play('gun_nail', b.pos, 0.35);
          b.aimAt = e.pos.clone();
        }
      }
    }

    // fly there, avoiding rock
    var dx = want.x - b.pos.x, dy = want.y - b.pos.y, dz = want.z - b.pos.z;
    var d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    var acc = 24;
    b.vel.x += (dx / d) * acc * dt; b.vel.y += (dy / d) * acc * dt; b.vel.z += (dz / d) * acc * dt;
    if (t.sample(b.pos.x, b.pos.y, b.pos.z) > -0.8) {
      var n = new THREE.Vector3();
      t.normalAt(b.pos.x, b.pos.y, b.pos.z, n);
      b.vel.addScaledVector(n, 26 * dt);
    }
    var sp = b.vel.length();
    var maxS = Math.min(speed, d * 3.2 + 0.6);
    if (sp > maxS) b.vel.multiplyScalar(maxS / sp);
    b.vel.multiplyScalar(Math.max(0, 1 - dt * 2.4));
    b.pos.addScaledVector(b.vel, dt);
    // teleport home if he ends up behind a wall far away
    if (b.pos.distanceTo(p.pos) > 46) b.pos.copy(want);

    b.mesh.position.copy(b.pos);
    var lookAt = b.aimAt && b.cool > 0.3 ? b.aimAt : (b.state === 'mine' && b.mineTarget ? b.mineTarget : p.pos);
    b.yaw = RS.damp(b.yaw, Math.atan2(lookAt.x - b.pos.x, lookAt.z - b.pos.z), 7, dt);
    b.mesh.rotation.y = b.yaw;
    b.mesh.rotation.z = Math.sin(b.bobT * 2) * 0.07 + (b.salute > 0 ? Math.sin(b.salute * 30) * 0.4 : 0);
    b.mesh.position.y += Math.sin(b.bobT * 2.6) * 0.05;
    this.boscoLight.position.copy(b.pos);
    this.boscoLight.intensity = 0.55 + Math.sin(b.bobT * 3) * 0.05;
  };

  // ------------------------------------------------------------- resupply
  U.callResupply = function () {
    var g = this.g, p = g.player;
    var cost = 80;
    var have = (this.mule.deposited.nitra || 0) + p.resources.nitra;
    if (have < cost) {
      g.toast('Need ' + cost + ' nitra for a resupply (have ' + Math.floor(have) + ')');
      g.audio.play('beep', null, 0.4);
      return false;
    }
    // spend banked nitra first, then what is in your pockets
    var fromBank = Math.min(this.mule.deposited.nitra || 0, cost);
    this.mule.deposited.nitra -= fromBank;
    p.resources.nitra -= (cost - fromBank);

    var fy = g.terrain.floorBelow(p.pos.x, p.pos.y + 2, p.pos.z, 10);
    var x = p.pos.x + 2.6, z = p.pos.z;
    var gy = g.terrain.floorBelow(x, p.pos.y + 2, z, 10);
    if (gy === null) { x = p.pos.x; z = p.pos.z; gy = fy === null ? p.pos.y : fy; }
    var topY = Math.min(g.terrain.ny - 5, gy + 30);
    g.terrain.carveTube(x, gy + 1, z, x, topY, z, 2.6, 0.14, 1.5);
    var mesh = new THREE.Mesh(this.resupplyGeo, this.metal);
    mesh.position.set(x, topY, z);
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.resupplies.push({ mesh: mesh, x: x, z: z, y: gy, topY: topY, t: 0, landed: false, uses: 2 });
    g.audio.play('resupply', null, 0.9);
    g.radio('Resupply pod away. Try not to stand under it.');
    return true;
  };

  U.updateResupplies = function (dt) {
    var g = this.g;
    for (var i = 0; i < this.resupplies.length; i++) {
      var r = this.resupplies[i];
      if (!r.landed) {
        r.t += dt;
        var k = Math.min(1, r.t / 2.6);
        var e = 1 - Math.pow(1 - k, 2.4);
        r.mesh.position.y = RS.lerp(r.topY, r.y, e);
        if (k >= 1) {
          r.landed = true;
          g.audio.play('pod_land', { x: r.x, y: r.y, z: r.z }, 0.9);
          g.fx.dust(r.x, r.y, r.z, 26, 0x55493a, 4);
          g.player.shake = Math.max(g.player.shake, 0.5);
          // squash anything standing underneath
          if (g.enemies) g.enemies.sphereDamage({ x: r.x, y: r.y + 1, z: r.z }, 2.6, 400, 'crush');
        }
      }
    }
  };

  U.useResupply = function () {
    var p = this.g.player, g = this.g;
    for (var i = 0; i < this.resupplies.length; i++) {
      var r = this.resupplies[i];
      if (!r.landed || r.uses <= 0) continue;
      var dx = r.x - p.pos.x, dz = r.z - p.pos.z, dy = r.y - p.pos.y;
      if (dx * dx + dy * dy + dz * dz > 12) continue;
      r.uses--;
      g.weapons.resupply();
      p.heal(p.maxHp * 0.45);
      p.shield = p.maxShield;
      RS.perkOnResupply(g);
      g.audio.play('resupply', null, 0.8);
      g.toast('Resupplied' + (r.uses ? ' — 1 use left' : ' — pod empty'));
      if (r.uses <= 0) {
        r.mesh.scale.set(1, 0.55, 1);
      }
      return true;
    }
    return false;
  };

  // ------------------------------------------------------------ escape pod
  U.callEscapePod = function (at) {
    if (this.escapePod) return;
    var g = this.g;
    var x = at.x, z = at.z;
    var gy = g.terrain.floorBelow(x, at.y + 3, z, 14);
    if (gy === null) gy = at.y;
    var topY = Math.min(g.terrain.ny - 5, gy + 36);
    g.terrain.carveTube(x, gy + 1, z, x, topY, z, 4.2, 0.12, 1.6);
    g.terrain.carveRoom(x, gy, z, 7, 7, 0.25, 2.0);
    var emat = this.metal.clone(); emat.side = THREE.DoubleSide;
    var mesh = new THREE.Mesh(RS.buildDropPod(true), emat);
    mesh.rotation.y = Math.atan2(g.player.pos.x - x, g.player.pos.z - z);
    mesh.position.set(x, topY, z);
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.escapePod = { mesh: mesh, x: x, y: gy - 0.2, z: z, topY: topY, t: 0, landed: false, launched: 0 };
    this.podLight = new THREE.PointLight(0xff8040, 1.6, 26, 1.5);
    this.podLight.position.set(x, gy + 3, z);
    this.group.add(this.podLight);
    g.audio.play('resupply', null, 1);
  };

  U.updateEscapePod = function (dt) {
    var e = this.escapePod;
    if (!e) return;
    var g = this.g;
    if (!e.landed) {
      e.t += dt;
      var k = Math.min(1, e.t / 4.2);
      e.mesh.position.y = RS.lerp(e.topY, e.y, 1 - Math.pow(1 - k, 2.2));
      this.podLight.position.y = e.mesh.position.y + 3;
      if (k >= 1) {
        e.landed = true;
        g.audio.play('pod_land', { x: e.x, y: e.y, z: e.z }, 1);
        g.fx.dust(e.x, e.y, e.z, 24, 0x55493a, 7);
        g.player.shake = Math.max(g.player.shake, 0.8);
        g.radio('Drop pod is down. Get in — I am not waiting all day.');
        if (g.enemies) g.enemies.sphereDamage({ x: e.x, y: e.y + 1, z: e.z }, 3.5, 600, 'crush');
      }
    } else if (e.launched > 0) {
      e.launched += dt;
      e.mesh.position.y += dt * (4 + e.launched * e.launched * 9);
      this.podLight.position.y = e.mesh.position.y;
      g.player.pos.set(e.x, e.mesh.position.y + 1.2, e.z);
      g.player.updateCamera(dt);
      g.fx.dust(e.x + (Math.random() - 0.5) * 4, e.mesh.position.y - 2, e.z + (Math.random() - 0.5) * 4, 3, 0x7a6a50, 3);
    }
    this.podLight.intensity = 1.3 + Math.sin(g.time * 7) * 0.4;
  };

  U.boardEscapePod = function () {
    var e = this.escapePod, g = this.g;
    if (!e || !e.landed || e.launched > 0) return false;
    var dx = e.x - g.player.pos.x, dz = e.z - g.player.pos.z, dy = e.y - g.player.pos.y;
    if (dx * dx + dz * dz > 14 || Math.abs(dy) > 5) return false;
    e.launched = 0.001;
    g.cinematic = true;
    g.audio.play('pod_launch', null, 1);
    g.player.shake = 1;
    if (g.mission) g.mission.onBoard();
    return true;
  };

  // --------------------------------------------------------------- shared
  U.supportAt = function (x, y, z, maxDrop) {
    var best = null;
    for (var i = 0; i < this.resupplies.length; i++) {
      var r = this.resupplies[i];
      if (!r.landed) continue;
      var dx = x - r.x, dz = z - r.z;
      if (dx * dx + dz * dz > 3.6) continue;
      var top = r.y + (r.uses > 0 ? 1.72 : 0.95);
      if (y >= top - 0.2 && y - top < maxDrop && (best === null || top > best)) best = top;
    }
    return best;
  };

  U.nearestInteractable = function () {
    var g = this.g, p = g.player, best = null, bd = 16;
    if (this.mule && this.mule.active) {
      var d = p.pos.distanceToSquared(this.mule.pos);
      if (d < 13) { best = { kind: 'mule', label: 'Deposit minerals', d: d }; bd = d; }
    }
    for (var i = 0; i < this.resupplies.length; i++) {
      var r = this.resupplies[i];
      if (!r.landed || r.uses <= 0) continue;
      var dx = r.x - p.pos.x, dz = r.z - p.pos.z, dy = r.y - p.pos.y;
      var d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < 12 && d2 < bd) { bd = d2; best = { kind: 'resupply', label: 'Resupply', d: d2 }; }
    }
    var e = this.escapePod;
    if (e && e.landed && !e.launched) {
      var ex = e.x - p.pos.x, ez = e.z - p.pos.z, ey = e.y - p.pos.y;
      var d3 = ex * ex + ez * ez;
      if (d3 < 14 && Math.abs(ey) < 5 && d3 < bd) { bd = d3; best = { kind: 'pod', label: 'Board the drop pod', d: d3 }; }
    }
    return best;
  };

  U.interact = function () {
    var n = this.nearestInteractable();
    if (!n) return false;
    if (n.kind === 'mule') return this.depositAt();
    if (n.kind === 'resupply') return this.useResupply();
    if (n.kind === 'pod') return this.boardEscapePod();
    return false;
  };

  U.update = function (dt) {
    this.updateDropPod(dt);
    this.updateMule(dt);
    this.updateBosco(dt);
    this.updateResupplies(dt);
    this.updateEscapePod(dt);
    var g = this.g;
    if (g.wasPressed('KeyC')) this.callMule();
    if (g.wasPressed('KeyB')) this.callResupply();
    if (g.wasPressed('KeyX')) {
      var w = g.weapons;
      if (w && w.laserTarget) this.orderBoscoMine(w.laserTarget);
    }
  };

  U.dispose = function () {
    this.g.scene.remove(this.group);
    this.resupplies.length = 0;
    this.escapePod = null;
  };
})(window.RS);
