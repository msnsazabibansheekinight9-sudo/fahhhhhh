/* Rock & Stone — mission types and the run of play: objectives, the swarm
   beats they trigger, the call for extraction and the scoring at the end. */
(function (RS) {
  'use strict';

  var TYPES = RS.MISSION_TYPES = [
    {
      id: 'mining', name: 'Mining Expedition', icon: '⛏',
      blurb: 'Mine the morkite quota and deposit it in the M.U.L.E.',
      primary: function (len) { return { morkite: Math.round(100 + len * 75) }; }
    },
    {
      id: 'egg', name: 'Egg Hunt', icon: '🥚',
      blurb: 'Pull glyphid eggs out of the rock. They will object.',
      primary: function (len) { return { eggs: 3 + len * 2 }; }
    },
    {
      id: 'point', name: 'Point Extraction', icon: '◈',
      blurb: 'Haul aquarqs back to the mine head. Hands full, guns down.',
      primary: function (len) { return { aquarqs: 3 + len * 2 }; }
    },
    {
      id: 'elim', name: 'Elimination', icon: '☠',
      blurb: 'Kill the dreadnoughts. Nothing else counts.',
      primary: function (len) { return { dreads: len >= 3 ? 3 : 2 }; }
    },
    {
      id: 'salvage', name: 'Salvage Operation', icon: '⚙',
      blurb: 'Repair the abandoned mules, then hold the uplink.',
      primary: function (len) { return { mules: 2, uplink: 1 }; }
    }
  ];

  RS.missionTypeById = function (id) {
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i];
    return TYPES[0];
  };

  var LINES = {
    start: {
      mining: 'Morkite quota is on your HUD. Dig it out, feed it to the mule, come home.',
      egg: 'Those eggs are worth more than you are. Pull them and run.',
      point: 'Aquarqs to the mine head. You cannot shoot while carrying one, so plan ahead.',
      elim: 'Two dreadnoughts down there. Management wants them dead. Good luck.',
      salvage: 'Two mules went dark. Fix them, bring the uplink up, hold it.'
    }
  };

  RS.Mission = {
    create: function (game, def, world) {
      var m = new Mission(game, def, world);
      return m;
    }
  };

  function Mission(game, def, world) {
    this.g = game;
    this.def = def;
    this.world = world;
    this.type = RS.missionTypeById(def.type || 'mining');
    this.length = def.length || 2;
    this.hazard = def.hazard || 3;
    this.state = 'briefing';
    this.time = 0;
    this.goals = this.type.primary(this.length);
    this.progress = { morkite: 0, eggs: 0, aquarqs: 0, dreads: 0, mules: 0, uplink: 0 };
    this.secondaryGoal = Math.round(8 + this.length * 4);
    this.secondaryProgress = 0;
    this.extractTimer = 0;
    this.extractLimit = 180;
    this.podCalled = false;
    this.objectsGroup = new THREE.Group();
    game.scene.add(this.objectsGroup);
    this.items = [];
    this.swarmBeats = [];
    this.nextSwarmAt = 95 + Math.random() * 60;
    this.stats = { kills: 0, mined: 0, deepest: 0 };
    var mats = RS.makeMats();
    this.mat = mats.flat;
    this.metal = mats.metal;
    this.glowMat = RS.makeGlowMaterial(0.55, true);
  }
  var M = Mission.prototype;

  // ----------------------------------------------------------------- setup
  M.begin = function () {
    var g = this.g;
    this.state = 'active';
    this.setupObjects();
    g.radio(LINES.start[this.type.id] || 'Get to work.');
    RS.bus.emit('mission-start', this);
  };

  M.spotFor = function (i) {
    var spots = this.world.objectiveSpots;
    if (!spots.length) return { x: this.world.start.x + 6, y: this.world.start.y, z: this.world.start.z + 6, floorY: this.world.start.y };
    return spots[i % spots.length];
  };

  M.setupObjects = function () {
    var g = this.g, t = g.terrain;
    var i, s, mesh;
    if (this.type.id === 'egg') {
      for (i = 0; i < this.goals.eggs; i++) {
        s = this.spotFor(i);
        var ex = s.x, ey = s.floorY, ez = s.z;
        if (s.wall) { ex = s.wall.x - s.wall.nx * 0.4; ey = s.wall.y - s.wall.ny * 0.4; ez = s.wall.z - s.wall.nz * 0.4; }
        // eggs sit in a carved alcove so they are visible but embedded
        t.carveSphere(ex, ey + 0.6, ez, 2.2, 0.25, undefined, 1.0);
        var fy = t.floorBelow(ex, ey + 2.5, ez, 6);
        mesh = new THREE.Mesh(RS.buildEgg(), this.glowMat);
        mesh.position.set(ex, fy === null ? ey : fy, ez);
        mesh.frustumCulled = false;
        this.objectsGroup.add(mesh);
        this.items.push({ kind: 'egg', mesh: mesh, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z, taken: false });
      }
    } else if (this.type.id === 'point') {
      // mine head in the first big cavern
      var room = this.world.rooms[0];
      var hy = t.floorBelow(room.x, room.y + 4, room.z, 10);
      this.minehead = new THREE.Mesh(RS.buildMinehead(), this.metal);
      this.minehead.position.set(room.x, hy === null ? room.y : hy, room.z);
      this.objectsGroup.add(this.minehead);
      this.mineheadPos = this.minehead.position.clone();
      for (i = 0; i < this.goals.aquarqs; i++) {
        s = this.spotFor(i + 1);
        var ay = t.floorBelow(s.x, s.y + 3, s.z, 10);
        mesh = new THREE.Mesh(RS.buildAquarq(), this.glowMat);
        mesh.position.set(s.x, ay === null ? s.floorY : ay, s.z);
        mesh.frustumCulled = false;
        this.objectsGroup.add(mesh);
        this.items.push({ kind: 'aquarq', mesh: mesh, x: s.x, y: mesh.position.y, z: s.z, taken: false });
      }
    } else if (this.type.id === 'elim') {
      this.dreadSites = [];
      for (i = 0; i < this.goals.dreads; i++) {
        s = this.spotFor(i * 3 + 2);
        var dy = t.floorBelow(s.x, s.y + 4, s.z, 12);
        // clear a proper arena — a dreadnought needs room to charge
        t.carveRoom(s.x, (dy === null ? s.floorY : dy) - 0.5, s.z, 13, 10, 0.3, 2.2);
        mesh = new THREE.Mesh(RS.buildEgg(), this.glowMat);
        mesh.scale.setScalar(2.4);
        mesh.position.set(s.x, dy === null ? s.floorY : dy, s.z);
        mesh.frustumCulled = false;
        this.objectsGroup.add(mesh);
        this.items.push({ kind: 'cocoon', mesh: mesh, x: s.x, y: mesh.position.y, z: s.z, taken: false });
      }
    } else if (this.type.id === 'salvage') {
      this.brokenMules = [];
      for (i = 0; i < this.goals.mules; i++) {
        s = this.spotFor(i * 4 + 1);
        var my = t.floorBelow(s.x, s.y + 3, s.z, 10);
        mesh = new THREE.Mesh(RS.buildMule(), this.metal);
        mesh.position.set(s.x, my === null ? s.floorY : my, s.z);
        mesh.rotation.z = 0.35;
        mesh.frustumCulled = false;
        this.objectsGroup.add(mesh);
        var bm = { kind: 'mule', mesh: mesh, x: s.x, y: mesh.position.y, z: s.z, repaired: false, repairT: 0 };
        this.items.push(bm);
        this.brokenMules.push(bm);
      }
      var uroom = this.world.rooms[Math.min(2, this.world.rooms.length - 1)];
      var uy = t.floorBelow(uroom.x, uroom.y + 4, uroom.z, 10);
      this.uplink = new THREE.Mesh(RS.buildMinehead(), this.metal);
      this.uplink.position.set(uroom.x, uy === null ? uroom.y : uy, uroom.z);
      this.uplink.scale.setScalar(0.8);
      this.objectsGroup.add(this.uplink);
      this.uplinkPos = this.uplink.position.clone();
      this.uplinkState = 'locked'; this.uplinkT = 0; this.uplinkDur = 120;
    }
  };

  // ----------------------------------------------------------- interaction
  M.nearestItem = function () {
    var p = this.g.player, best = null, bd = 16;
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.taken || it.repaired) continue;
      var dx = it.x - p.pos.x, dy = it.y - p.pos.y, dz = it.z - p.pos.z;
      var d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  };

  M.interactLabel = function () {
    var p = this.g.player;
    if (p.carried) {
      if (this.type.id === 'point' && this.mineheadPos) {
        var d = p.pos.distanceTo(this.mineheadPos);
        if (d < 5) return 'Deposit aquarq';
      }
      return null;
    }
    var it = this.nearestItem();
    if (!it) {
      if (this.type.id === 'salvage' && this.uplinkPos && this.uplinkState === 'ready' &&
        this.g.player.pos.distanceTo(this.uplinkPos) < 5) return 'Start uplink';
      return null;
    }
    if (it.kind === 'egg') return 'Take egg';
    if (it.kind === 'aquarq') return 'Pick up aquarq';
    if (it.kind === 'cocoon') return 'Break open the cocoon';
    if (it.kind === 'mule') return 'Repair M.U.L.E. (hold E)';
    return null;
  };

  M.interact = function () {
    var g = this.g, p = g.player;
    if (p.carried) {
      if (this.type.id === 'point' && this.mineheadPos && p.pos.distanceTo(this.mineheadPos) < 5) {
        this.dropCarried(true);
        return true;
      }
      this.dropCarried(false);
      return true;
    }
    if (this.type.id === 'salvage' && this.uplinkPos && this.uplinkState === 'ready' &&
      p.pos.distanceTo(this.uplinkPos) < 5) {
      this.uplinkState = 'running';
      g.radio('Uplink is transmitting. Hold this room for two minutes.');
      g.enemies && g.enemies.startSwarm(1.4, 'They can hear the uplink. Everything is coming.');
      return true;
    }
    var it = this.nearestItem();
    if (!it) return false;
    if (it.kind === 'egg') {
      it.taken = true;
      this.objectsGroup.remove(it.mesh);
      this.progress.eggs++;
      g.audio.play('objective', null, 0.8);
      g.fx.dust(it.x, it.y + 0.5, it.z, 14, 0xc8b070, 1.5);
      g.toast('Egg secured (' + this.progress.eggs + '/' + this.goals.eggs + ')');
      // eggs are alarms
      if (Math.random() < 0.72) g.enemies.startSwarm(0.8, 'You poked the nest. Incoming!');
      else g.enemies.spawnGroup('grunt', 3, true);
      this.checkPrimary();
      return true;
    }
    if (it.kind === 'aquarq') {
      it.taken = true;
      this.objectsGroup.remove(it.mesh);
      this.carry('aquarq', it);
      return true;
    }
    if (it.kind === 'cocoon') {
      it.taken = true;
      this.objectsGroup.remove(it.mesh);
      g.fx.explosion(it.x, it.y + 1, it.z, 4, 0xc8b070);
      var boss = g.enemies.spawnBoss(it.x, it.y, it.z);
      if (boss) boss.isObjective = true;
      g.radio('It is awake. Keep moving and shoot the soft bits.');
      return true;
    }
    return false;
  };

  M.carry = function (kind, src) {
    var g = this.g, p = g.player;
    var geo = kind === 'aquarq' ? RS.buildAquarq() : RS.buildEgg();
    var mesh = new THREE.Mesh(geo, this.glowMat);
    mesh.frustumCulled = false;
    mesh.scale.setScalar(0.8);
    g.scene.add(mesh);
    p.carried = { kind: kind, mesh: mesh, heavy: true, src: src };
    g.toast('Carrying ' + kind + ' — hands are full');
    g.audio.play('pickup', null, 0.7);
  };

  M.dropCarried = function (deposit) {
    var g = this.g, p = g.player;
    if (!p.carried) return;
    var c = p.carried;
    g.scene.remove(c.mesh);
    if (deposit) {
      this.progress.aquarqs++;
      g.audio.play('objective', null, 0.9);
      g.fx.dust(this.mineheadPos.x, this.mineheadPos.y + 1.5, this.mineheadPos.z, 18, 0x3ad0e0, 2);
      g.toast('Aquarq delivered (' + this.progress.aquarqs + '/' + this.goals.aquarqs + ')');
      if (Math.random() < 0.45) g.enemies.spawnGroup('grunt', 3, true);
      this.checkPrimary();
    } else {
      // put it back on the ground where it can be picked up again
      var fy = g.terrain.floorBelow(p.pos.x, p.pos.y + 1.5, p.pos.z, 6);
      var mesh = new THREE.Mesh(c.kind === 'aquarq' ? RS.buildAquarq() : RS.buildEgg(), this.glowMat);
      mesh.position.set(p.pos.x, fy === null ? p.pos.y : fy, p.pos.z);
      mesh.frustumCulled = false;
      this.objectsGroup.add(mesh);
      this.items.push({ kind: c.kind, mesh: mesh, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z, taken: false });
      g.toast('Dropped the ' + c.kind);
    }
    p.carried = null;
  };

  // -------------------------------------------------------------- events
  M.onResource = function (key, amount) {
    this.stats.mined += amount;
  };

  M.onDeposit = function (key, amount) {
    if (key === 'morkite' && this.type.id === 'mining') {
      this.progress.morkite += amount;
      this.checkPrimary();
    }
    if (key === 'crystal') {
      this.secondaryProgress += amount;
      if (this.secondaryProgress >= this.secondaryGoal && !this.secondaryDone) {
        this.secondaryDone = true;
        this.g.audio.play('objective', null, 0.8);
        this.g.radio('Secondary objective complete. The bonus is real, the gratitude is not.');
      }
    }
  };

  M.onKill = function (e) {
    this.stats.kills++;
    if (e.def.boss && e.isObjective) {
      this.progress.dreads++;
      this.g.radio('Dreadnought down. ' + (this.goals.dreads - this.progress.dreads) + ' to go.');
      this.checkPrimary();
    }
  };

  M.onBoard = function () {
    this.state = 'complete';
    this.completeTimer = 0;
    this.g.audio.stopAllLoops();
  };

  M.primaryDone = function () {
    var gl = this.goals, pr = this.progress;
    if (gl.morkite !== undefined && pr.morkite < gl.morkite) return false;
    if (gl.eggs !== undefined && pr.eggs < gl.eggs) return false;
    if (gl.aquarqs !== undefined && pr.aquarqs < gl.aquarqs) return false;
    if (gl.dreads !== undefined && pr.dreads < gl.dreads) return false;
    if (gl.mules !== undefined && pr.mules < gl.mules) return false;
    if (gl.uplink !== undefined && pr.uplink < gl.uplink) return false;
    return true;
  };

  M.checkPrimary = function () {
    if (this.state !== 'active') return;
    if (!this.primaryDone()) return;
    this.state = 'extracting';
    this.extractTimer = 0;
    this.g.audio.play('objective', null, 1);
    this.g.radio('Primary objective complete! Drop pod inbound — move it.');
    var self = this;
    setTimeout(function () {
      if (self.state !== 'extracting' || self.podCalled) return;
      self.podCalled = true;
      self.g.units.callEscapePod(self.world.extraction);
      self.g.enemies.startSwarm(1.2, 'They know you are leaving. Run.');
    }, 2500);
    RS.bus.emit('objective-complete', this);
  };

  // -------------------------------------------------------------- update
  M.update = function (dt) {
    var g = this.g, p = g.player;
    this.time += dt;
    this.stats.deepest = Math.max(this.stats.deepest, Math.round(g.terrain.ny - p.pos.y));

    // carried item floats in front of the dwarf
    if (p.carried) {
      var f = p.forward(new THREE.Vector3());
      p.carried.mesh.position.set(
        g.camera.position.x + f.x * 1.25,
        g.camera.position.y + f.y * 1.25 - 0.75,
        g.camera.position.z + f.z * 1.25);
      p.carried.mesh.rotation.y += dt * 0.4;
    }

    // spin the loose objective props so they catch the eye
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.taken || !it.mesh) continue;
      if (it.kind === 'aquarq') it.mesh.rotation.y += dt * 0.55;
      if (it.kind === 'cocoon') it.mesh.rotation.y += dt * 0.12;
    }

    if (this.type.id === 'salvage') this.updateSalvage(dt);

    if (this.state === 'active') {
      this.nextSwarmAt -= dt;
      if (this.nextSwarmAt <= 0) {
        this.nextSwarmAt = 120 + Math.random() * 90;
        g.enemies.startSwarm(1, null);
      }
    } else if (this.state === 'extracting') {
      this.extractTimer += dt;
      var left = this.extractLimit - this.extractTimer;
      if (!this.warned60 && left < 60) { this.warned60 = true; g.radio('Sixty seconds. I am not joking.'); }
      if (!this.warned20 && left < 20) { this.warned20 = true; g.audio.play('fail', null, 0.5); }
      if (left <= 0) {
        this.fail('Left behind');
      }
      // pressure keeps up the whole way out
      if (g.enemies && g.enemies.count() < 6 && Math.random() < dt * 0.5) {
        g.enemies.spawnGroup(g.enemies.pickAmbient(), 2 + ((Math.random() * 3) | 0), true);
      }
    } else if (this.state === 'complete') {
      this.completeTimer += dt;
      if (this.completeTimer > 3.2 && !this.reported) {
        this.reported = true;
        this.finish(true);
      }
    }

    if (p.dead && this.state !== 'failed' && this.state !== 'complete') {
      this.fail('All dwarves down');
    }
  };

  M.updateSalvage = function (dt) {
    var g = this.g, p = g.player;
    // repairing: stand next to a dead mule and hold E
    for (var i = 0; i < this.brokenMules.length; i++) {
      var bm = this.brokenMules[i];
      if (bm.repaired) continue;
      var d = Math.hypot(bm.x - p.pos.x, bm.y - p.pos.y, bm.z - p.pos.z);
      if (d < 3.2 && g.input.keys.KeyE) {
        bm.repairT += dt;
        g.fx.sparks({ x: bm.x, y: bm.y + 1.2, z: bm.z, nx: 0, ny: 1, nz: 0 }, 1, 0xffd060);
        if (g.frame % 10 === 0) g.audio.play('weld', { x: bm.x, y: bm.y, z: bm.z }, 0.4);
        if (bm.repairT > 7) {
          bm.repaired = true;
          bm.mesh.rotation.z = 0;
          this.progress.mules++;
          g.audio.play('objective', null, 0.8);
          g.toast('M.U.L.E. repaired (' + this.progress.mules + '/' + this.goals.mules + ')');
          g.enemies.spawnGroup('grunt', 4, true);
          if (this.progress.mules >= this.goals.mules && this.uplinkState === 'locked') {
            this.uplinkState = 'ready';
            g.radio('Both mules are up. Get to the uplink and start the transmission.');
          }
        }
      } else if (bm.repairT > 0) bm.repairT = Math.max(0, bm.repairT - dt * 2);
    }
    if (this.uplinkState === 'running') {
      this.uplinkT += dt;
      this.uplink.rotation.y += dt * 1.5;
      if (this.uplinkT >= this.uplinkDur) {
        this.uplinkState = 'done';
        this.progress.uplink = 1;
        g.audio.play('objective', null, 1);
        this.checkPrimary();
      }
      if (Math.random() < dt * 0.35) g.enemies.spawnGroup(g.enemies.pickAmbient(), 3, true);
    }
  };

  // --------------------------------------------------------------- finish
  M.fail = function (reason) {
    if (this.state === 'failed' || this.state === 'complete') return;
    this.state = 'failed';
    this.g.audio.stopAllLoops();
    this.g.audio.play('fail', null, 1);
    this.finish(false, reason);
  };

  M.finish = function (won, reason) {
    var g = this.g;
    var prof = g.profile;
    var mul = (0.6 + this.hazard * 0.28) * (0.7 + this.length * 0.22);
    var dep = g.units && g.units.mule ? g.units.mule.deposited : {};
    var xp = 0, credits = 0;
    if (won) {
      xp += Math.round(600 * mul);
      credits += Math.round(900 * mul);
      if (this.secondaryDone) { xp += Math.round(220 * mul); credits += Math.round(350 * mul); }
    } else {
      xp += Math.round(90 * mul);
      credits += Math.round(120 * mul);
    }
    xp += this.stats.kills * 3;
    credits += Math.round(((dep.gold || 0) * 11) + ((dep.crystal || 0) * 26) + ((dep.morkite || 0) * 2));
    var summary = {
      won: won, reason: reason || null, type: this.type.name, biome: g.biome.name,
      hazard: this.hazard, length: this.length, time: this.time,
      kills: this.stats.kills, mined: this.stats.mined,
      deposited: dep, secondary: !!this.secondaryDone,
      xp: xp, credits: credits,
      progress: this.progress, goals: this.goals
    };
    prof.xp += xp; prof.credits += credits;
    if (won) prof.missions++;
    prof.classXp[g.weapons.classId] = (prof.classXp[g.weapons.classId] || 0) + xp;
    var key = this.type.id + '|' + this.hazard;
    if (won && (!prof.best[key] || prof.best[key] > this.time)) prof.best[key] = Math.round(this.time);
    RS.saveProfile(prof);
    RS.bus.emit('mission-end', summary);
  };

  // --------------------------------------------------------------- HUD data
  M.objectiveText = function () {
    var gl = this.goals, pr = this.progress;
    if (gl.morkite !== undefined) return 'Morkite deposited: ' + Math.min(pr.morkite, gl.morkite) + ' / ' + gl.morkite;
    if (gl.eggs !== undefined) return 'Eggs secured: ' + pr.eggs + ' / ' + gl.eggs;
    if (gl.aquarqs !== undefined) return 'Aquarqs delivered: ' + pr.aquarqs + ' / ' + gl.aquarqs;
    if (gl.dreads !== undefined) return 'Dreadnoughts killed: ' + pr.dreads + ' / ' + gl.dreads;
    if (gl.mules !== undefined) {
      if (this.uplinkState === 'running') return 'Hold the uplink: ' + RS.fmtTime(this.uplinkDur - this.uplinkT);
      if (this.uplinkState === 'ready') return 'Start the uplink';
      if (this.uplinkState === 'done') return 'Uplink complete';
      return 'M.U.L.E.s repaired: ' + pr.mules + ' / ' + gl.mules;
    }
    return '';
  };

  M.objectiveProgress = function () {
    var gl = this.goals, pr = this.progress;
    if (gl.morkite !== undefined) return RS.clamp01(pr.morkite / gl.morkite);
    if (gl.eggs !== undefined) return pr.eggs / gl.eggs;
    if (gl.aquarqs !== undefined) return pr.aquarqs / gl.aquarqs;
    if (gl.dreads !== undefined) return pr.dreads / gl.dreads;
    if (gl.mules !== undefined) {
      if (this.uplinkState === 'running') return 0.5 + 0.5 * (this.uplinkT / this.uplinkDur);
      return 0.5 * (pr.mules / gl.mules);
    }
    return 0;
  };

  M.dispose = function () {
    this.g.scene.remove(this.objectsGroup);
    this.items.length = 0;
    this.glowMat.dispose();
  };
})(window.RS);
