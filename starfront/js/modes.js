// Game modes. Each mode supplies spawn points, bot goals, objective logic, scoring and a HUD summary.
var SF = window.SF || (window.SF = {});

(function () {
  var V3 = THREE.Vector3;
  var G = function () { return SF.G; };
  var Modes = SF.Modes = {};
  var tmp = new V3();

  // ------------------------------------------------------------------ capture zones
  function Zone(x, y, z, r, name, owner) {
    this.x = x; this.y = y; this.z = z; this.r = r || 9; this.name = name; this.owner = owner == null ? -1 : owner;
    this.progress = this.owner === 0 ? -1 : this.owner === 1 ? 1 : 0;
    this.contested = false; this.count = [0, 0]; this.active = true;
    var g = G(), M = SF.Models;
    var grp = new THREE.Group(); grp.position.set(x, y, z);
    var ring = new THREE.Mesh(new THREE.RingGeometry(this.r - 0.4, this.r, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; grp.add(ring);
    var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 30, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 15; grp.add(beam);
    var flag = M.mesh('box', new THREE.MeshStandardMaterial({ color: 0xdddddd, side: THREE.DoubleSide }), grp, 0.6, 2.8, 0, 1.2, 0.7, 0.04);
    this.ring = ring; this.beam = beam; this.flag = flag; this.mesh = grp;
    g.scene.add(grp);
    this.setColor();
  }
  Zone.prototype.teamColor = function (t) { var g = G(); return t < 0 ? 0xdddddd : (g.teams[t].color); };
  Zone.prototype.setColor = function () {
    var c = this.teamColor(this.owner);
    this.ring.material.color.setHex(c); this.beam.material.color.setHex(c); this.flag.material.color.setHex(c);
  };
  Zone.prototype.remove = function () { G().scene.remove(this.mesh); };
  // classic capture: neutralise, then take. rate per second per extra capper
  Zone.prototype.update = function (dt, opts) {
    opts = opts || {};
    var g = G();
    var c0 = 0, c1 = 0, k0 = 1, k1 = 1;
    for (var i = 0; i < g.units.length; i++) {
      var u = g.units[i];
      if (!u.alive || (u.vehicle && u.vehicle.kind === 'fighter')) continue;
      var dx = u.pos.x - this.x, dz = u.pos.z - this.z;
      if (dx * dx + dz * dz > this.r * this.r || Math.abs(u.pos.y - this.y) > 6) continue;
      if (u.team === 0) { c0++; if (u.has('capturer')) k0 = 1.35; } else { c1++; if (u.has('capturer')) k1 = 1.35; }
      if (u.isPlayer) g.playerInZone = this;
    }
    this.count[0] = c0; this.count[1] = c1;
    this.contested = c0 > 0 && c1 > 0;
    var prevOwner = this.owner;
    if (!this.active) return null;
    var rate = (opts.rate || 0.22);
    if (c0 && !c1 && opts.lock !== 0) this.progress -= rate * Math.min(3, c0) * k0 * dt;
    else if (c1 && !c0 && opts.lock !== 1) this.progress += rate * Math.min(3, c1) * k1 * dt;
    this.progress = Math.max(-1, Math.min(1, this.progress));
    if (this.progress <= -1) this.owner = 0;
    else if (this.progress >= 1) this.owner = 1;
    else if ((this.owner === 0 && this.progress > 0) || (this.owner === 1 && this.progress < 0)) this.owner = -1;
    if (this.owner !== prevOwner) {
      this.setColor();
      if (this.owner >= 0) {
        // reward cappers
        for (i = 0; i < g.units.length; i++) { var cu = g.units[i]; if (cu.alive && cu.team === this.owner && Math.hypot(cu.pos.x - this.x, cu.pos.z - this.z) < this.r + 1) g.addBp(cu, 200, 'Captured ' + this.name); }
        g.announce((g.teams[this.owner].name) + ' captured ' + this.name, this.owner);
        if (g.player && g.player.team === this.owner) SF.Audio.capture();
      }
      return this.owner;
    }
    this.flag.position.y = 0.7 + Math.abs(this.progress) * 2.1;
    return null;
  };

  // ------------------------------------------------------------------ carried objectives (flags, intel, pods)
  function Carry(x, y, z, team, color, label) {
    var g = G(), M = SF.Models;
    this.home = new V3(x, y, z); this.pos = new V3(x, y, z); this.team = team; this.carrier = null; this.dropT = 0; this.label = label;
    var grp = new THREE.Group();
    M.mesh('cyl', M.mat(0x8a8e94, 0.4, 0.6), grp, 0, 1.2, 0, 0.08, 2.4, 0.08);
    M.mesh('box', M.mat(color, 0.5, 0, 'emis'), grp, 0.45, 2.1, 0, 0.9, 0.55, 0.04);
    var gl = M.mesh('sph', M.mat(color, 0, 0, 'add'), grp, 0, 1.2, 0, 1.6, 2.8, 1.6); gl.castShadow = false;
    grp.position.copy(this.pos); g.scene.add(grp);
    this.mesh = grp;
  }
  Carry.prototype.update = function (dt, canTake) {
    var g = G();
    if (this.carrier) {
      if (!this.carrier.alive) { this.drop(); }
      else { this.pos.copy(this.carrier.pos); this.pos.y += this.carrier.height + 0.3; }
    } else {
      if (!this.atHome()) { this.dropT -= dt; if (this.dropT <= 0) this.returnHome(); }
      for (var i = 0; i < g.units.length; i++) {
        var u = g.units[i];
        if (!u.alive || u.vehicle) continue;
        if (u.pos.distanceTo(this.pos) < 2.2) {
          var r = canTake(u, this);
          if (r === 'take') { this.carrier = u; u.carrying = this; g.announce(u.name + ' has the ' + this.label, u.team); SF.Audio.blip(700, 0.15, 0.1); break; }
          if (r === 'return' && !this.atHome()) { this.returnHome(); g.addBp(u, 100, 'Returned ' + this.label); g.announce(this.label + ' returned', u.team); break; }
        }
      }
    }
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y += dt;
  };
  Carry.prototype.atHome = function () { return !this.carrier && this.pos.distanceTo(this.home) < 0.5; };
  Carry.prototype.drop = function () {
    var g = G();
    if (this.carrier) { this.carrier.carrying = null; }
    this.carrier = null;
    this.pos.y = g.world.groundAt(this.pos.x, this.pos.z, this.pos.y) + 0.1;
    if (this.pos.y < g.world.killY + 5) { this.returnHome(); return; }
    this.dropT = 20;
  };
  Carry.prototype.returnHome = function () { if (this.carrier) this.carrier.carrying = null; this.carrier = null; this.pos.copy(this.home); };
  Carry.prototype.remove = function () { G().scene.remove(this.mesh); if (this.carrier) this.carrier.carrying = null; };

  // ------------------------------------------------------------------ helpers
  function base(team) { var w = G().world; return w.bases[team]; }
  function spawnAt(x, y, z, label, id) { return { x: x, y: y, z: z, label: label, id: id }; }
  function baseSpawn(team, label) { var b = base(team); return spawnAt(b.x, b.y, b.z, label || 'Base', 'base' + team); }
  function nearestZone(zones, u, filter) {
    var best = null, bd = 1e9;
    zones.forEach(function (z) { if (!z.active || (filter && !filter(z))) return; var d = Math.hypot(z.x - u.pos.x, z.z - u.pos.z); if (d < bd) { bd = d; best = z; } });
    return best;
  }
  function pickSpread(zones, u, filter) {
    // spread bots across objectives: prefer by id hash then distance
    var list = zones.filter(function (z) { return z.active && (!filter || filter(z)); });
    if (!list.length) return null;
    list.sort(function (a, b) { return Math.hypot(a.x - u.pos.x, a.z - u.pos.z) - Math.hypot(b.x - u.pos.x, b.z - u.pos.z); });
    var k = u.id % 3 === 0 && list.length > 1 ? 1 : 0;
    return list[k];
  }
  function zoneGoal(z) { return { x: z.x, z: z.z, r: z.r * 0.6 }; }
  function enemyGoal(u) {
    var g = G(), best = null, bd = 1e9;
    g.units.forEach(function (e) { if (e.alive && e.team !== u.team) { var d = e.pos.distanceTo(u.pos); if (d < bd) { bd = d; best = e; } } });
    if (best) return { x: best.pos.x, z: best.pos.z, r: u.melee ? 1.5 : 12 };
    var b = base(1 - u.team); return { x: b.x, z: b.z, r: 10 };
  }
  function makeZones(cps, owners) {
    return cps.map(function (c, i) { return new Zone(c.x, c.y, c.z, c.r, c.name, owners ? owners[i] : -1); });
  }

  // ------------------------------------------------------------------ factory
  Modes.create = function (def, match) {
    var m = new (TYPES[def.type] || TYPES.conquest)(def, match);
    m.def = def; m.match = match;
    m.time = 0;
    if (!m.respawn) m.respawn = def.heroesOnly ? 4 : 6;
    return m;
  };
  function Base() { }
  Base.prototype.init = function () { };
  Base.prototype.update = function (dt) { };
  Base.prototype.spawnPoints = function (team) { return [baseSpawn(team)]; };
  Base.prototype.botGoal = function (u) { return enemyGoal(u); };
  Base.prototype.onKill = function (v, k) { };
  Base.prototype.cleanup = function () { (this.zones || []).forEach(function (z) { z.remove(); }); (this.carries || []).forEach(function (c) { c.remove(); }); };
  Base.prototype.allowHero = function (team) { return this.def.heroes !== false && G().teamHeroes(team) < (this.heroCap || 2); };
  Base.prototype.allowVehicle = function (team) { return !!this.def.vehicles && G().teamVehicles(team) < 3; };
  Base.prototype.finish = function (winner, reason) { if (this.result) return; this.result = { winner: winner, reason: reason }; };
  Base.prototype.timeLeft = function () { return this.limit ? Math.max(0, this.limit - this.time) : null; };
  Base.prototype.tickTime = function (dt, onOut) { this.time += dt; if (this.limit && this.time >= this.limit) onOut(); };
  function inherit(C) { C.prototype = Object.create(Base.prototype); C.prototype.constructor = C; return C; }

  var TYPES = Modes.types = {};

  // ---------------- Conquest
  TYPES.conquest = inherit(function (def) {
    var g = G();
    var n = (def.players || 16);
    this.tickets = [Math.round(60 + n * 7), Math.round(60 + n * 7)];
    this.limit = 20 * 60;
    this.zones = makeZones(g.world.cps);
    // each side starts owning the closest post
    var zs = this.zones;
    if (zs.length >= 3) { zs[0].owner = 0; zs[0].progress = -1; zs[0].setColor(); zs[zs.length - 1].owner = 1; zs[zs.length - 1].progress = 1; zs[zs.length - 1].setColor(); }
    this.bleedT = [0, 0];
  });
  TYPES.conquest.prototype.update = function (dt) {
    var self = this;
    this.zones.forEach(function (z) { z.update(dt); });
    var own = [0, 0];
    this.zones.forEach(function (z) { if (z.owner >= 0) own[z.owner]++; });
    for (var t = 0; t < 2; t++) {
      var diff = own[1 - t] - own[t];
      if (diff > 0 && own[1 - t] > this.zones.length / 2) {
        this.bleedT[t] += dt * diff;
        if (this.bleedT[t] > 3) { this.bleedT[t] = 0; this.tickets[t]--; }
      }
      if (own[t] === 0 && G().teamAlive(t) === 0 && this.time > 30) this.tickets[t] = 0;
    }
    this.tickTime(dt, function () { self.finish(self.tickets[0] > self.tickets[1] ? 0 : self.tickets[1] > self.tickets[0] ? 1 : -1, 'Time limit reached'); });
    if (this.tickets[0] <= 0) this.finish(1, 'Reinforcements depleted');
    if (this.tickets[1] <= 0) this.finish(0, 'Reinforcements depleted');
  };
  TYPES.conquest.prototype.onKill = function (v) { if (this.tickets[v.team] > 0) this.tickets[v.team]--; };
  TYPES.conquest.prototype.spawnPoints = function (team) {
    var out = [baseSpawn(team)];
    this.zones.forEach(function (z, i) { if (z.owner === team && !z.contested) out.push(spawnAt(z.x, z.y, z.z, z.name, 'cp' + i)); });
    return out;
  };
  TYPES.conquest.prototype.botGoal = function (u) {
    var z = pickSpread(this.zones, u, function (z) { return z.owner !== u.team || z.contested; });
    if (!z) z = pickSpread(this.zones, u);
    return z ? zoneGoal(z) : enemyGoal(u);
  };
  TYPES.conquest.prototype.hud = function () {
    return { score: [this.tickets[0], this.tickets[1]], scoreLabel: 'Reinforcements', zones: this.zones, time: this.timeLeft() };
  };

  // ---------------- Supremacy
  TYPES.supremacy = inherit(function (def) {
    var g = G();
    this.points = [0, 0]; this.target = 600; this.limit = 15 * 60;
    this.zones = makeZones(g.world.cps);
    var zs = this.zones;
    zs[0].owner = 0; zs[0].progress = -1; zs[0].setColor(); zs[zs.length - 1].owner = 1; zs[zs.length - 1].progress = 1; zs[zs.length - 1].setColor();
    this.acc = 0;
  });
  TYPES.supremacy.prototype.update = function (dt) {
    var self = this;
    this.zones.forEach(function (z) { z.update(dt); });
    this.acc += dt;
    if (this.acc >= 1) { this.acc -= 1; this.zones.forEach(function (z) { if (z.owner >= 0) self.points[z.owner] += 2; }); }
    if (this.points[0] >= this.target) this.onTarget(0);
    else if (this.points[1] >= this.target) this.onTarget(1);
    this.tickTime(dt, function () { self.finish(self.points[0] > self.points[1] ? 0 : self.points[1] > self.points[0] ? 1 : -1, 'Time limit reached'); });
  };
  TYPES.supremacy.prototype.onTarget = function (t) { this.finish(t, 'Supremacy achieved'); };
  TYPES.supremacy.prototype.onKill = function (v, k) { if (k && k.team != null && k.team !== v.team) this.points[k.team] += 1; };
  TYPES.supremacy.prototype.spawnPoints = TYPES.conquest.prototype.spawnPoints;
  TYPES.supremacy.prototype.botGoal = TYPES.conquest.prototype.botGoal;
  TYPES.supremacy.prototype.hud = function () { return { score: this.points.slice(), scoreLabel: 'Points (to ' + this.target + ')', zones: this.zones, time: this.timeLeft() }; };

  // ---------------- Capital Supremacy: ground phase then a boarding phase near the losing team's base
  TYPES.capsup = inherit(function (def) {
    TYPES.supremacy.call(this, def);
    this.target = 400; this.phase = 'ground';
  });
  Object.assign(TYPES.capsup.prototype, TYPES.supremacy.prototype);
  TYPES.capsup.prototype.constructor = TYPES.capsup;
  TYPES.capsup.prototype.onTarget = function (t) {
    if (this.phase !== 'ground') return;
    var g = G();
    this.phase = 'boarding'; this.attacker = t; this.boardT = 180;
    var b = base(1 - t);
    this.zones.forEach(function (z) { z.active = false; z.mesh.visible = false; });
    var w = g.world;
    var p1 = SF.World.randomNavPoint(w, Math.random, b.x * 0.7, b.z * 0.7, 20), p2 = SF.World.randomNavPoint(w, Math.random, b.x, b.z * 0.92, 10);
    this.board = [new Zone(p1.x, w.groundAt(p1.x, p1.z, 300), p1.z, 9, 'Hangar Breach', 1 - t), new Zone(p2.x, w.groundAt(p2.x, p2.z, 300), p2.z, 9, 'Reactor Core', 1 - t)];
    this.board[1].active = false; this.board[1].mesh.visible = false;
    this.bi = 0;
    g.announce(g.teams[t].name + ' are boarding the enemy capital ship!', t);
  };
  TYPES.capsup.prototype.update = function (dt) {
    if (this.phase === 'ground') { TYPES.supremacy.prototype.update.call(this, dt); return; }
    var self = this, z = this.board[this.bi];
    var o = z.update(dt, { lock: 1 - this.attacker, rate: 0.12 });
    if (o === this.attacker) {
      if (this.bi === 0) { this.bi = 1; this.board[1].active = true; this.board[1].mesh.visible = true; this.boardT += 90; G().announce('Hangar breached! Push to the reactor!', this.attacker); }
      else this.finish(this.attacker, 'Capital ship destroyed');
    }
    this.boardT -= dt;
    if (this.boardT <= 0) this.finish(1 - this.attacker, 'Boarding party repelled');
  };
  TYPES.capsup.prototype.spawnPoints = function (team) {
    if (this.phase === 'ground') return TYPES.conquest.prototype.spawnPoints.call(this, team);
    var out = [baseSpawn(team)];
    if (team === this.attacker && this.bi === 1) out.push(spawnAt(this.board[0].x, this.board[0].y, this.board[0].z, 'Hangar', 'h'));
    return out;
  };
  TYPES.capsup.prototype.botGoal = function (u) {
    if (this.phase === 'ground') return TYPES.conquest.prototype.botGoal.call(this, u);
    return zoneGoal(this.board[this.bi]);
  };
  TYPES.capsup.prototype.hud = function () {
    if (this.phase === 'ground') return { score: this.points.slice(), scoreLabel: 'Ground phase · to ' + this.target, zones: this.zones, time: this.timeLeft() };
    return { score: this.points.slice(), scoreLabel: 'Boarding: ' + this.board[this.bi].name, zones: [this.board[this.bi]], time: this.boardT };
  };
  TYPES.capsup.prototype.cleanup = function () { Base.prototype.cleanup.call(this); (this.board || []).forEach(function (z) { z.remove(); }); };

  // ---------------- Sequential attack (Frontline Assault / Turning Point)
  TYPES.sequential = inherit(function (def) {
    var g = G();
    this.attacker = (g.world.map.seed % 2);
    var cps = g.world.cps.slice();
    // order zones from attacker's base toward defender's
    var ab = base(this.attacker);
    cps.sort(function (a, b) { return Math.hypot(a.x - ab.x, a.z - ab.z) - Math.hypot(b.x - ab.x, b.z - ab.z); });
    this.zones = makeZones(cps);
    var def0 = 1 - this.attacker;
    var self = this;
    this.zones.forEach(function (z) { z.owner = def0; z.progress = def0 === 0 ? -1 : 1; z.setColor(); z.active = false; });
    this.idx = 0; this.zones[0].active = true;
    if (!def.timeBonus) { this.zones[1] && (this.zones[1].active = true); }
    this.tickets = 120 + (def.players || 16) * 6;
    this.clock = def.timeBonus ? 150 : 300;
  });
  TYPES.sequential.prototype.update = function (dt) {
    var self = this, g = G();
    var cap = false;
    this.zones.forEach(function (z, i) {
      if (!z.active) return;
      var o = z.update(dt, { lock: 1 - self.attacker, rate: 0.14 });
      if (o === self.attacker) { z.active = false; cap = true; }
    });
    if (cap) {
      var remaining = this.zones.filter(function (z) { return z.owner !== self.attacker; });
      if (!remaining.length) { this.finish(this.attacker, 'All objectives captured'); return; }
      if (!this.zones.some(function (z) { return z.active; })) {
        var next = remaining.slice(0, this.def.timeBonus ? 1 : 2);
        next.forEach(function (z) { z.active = true; });
        this.clock += this.def.timeBonus ? 120 : 240;
        g.announce('Objective captured — the front moves forward!', this.attacker);
      }
    }
    this.clock -= dt;
    if (this.clock <= 0) this.finish(1 - this.attacker, 'Attackers ran out of time');
    if (this.tickets <= 0) this.finish(1 - this.attacker, 'Attackers ran out of reinforcements');
  };
  TYPES.sequential.prototype.onKill = function (v) { if (v.team === this.attacker) this.tickets--; };
  TYPES.sequential.prototype.spawnPoints = function (team) {
    var out = [baseSpawn(team)], self = this;
    var active = this.zones.filter(function (z) { return z.active; });
    this.zones.forEach(function (z, i) {
      if (team === self.attacker && z.owner === self.attacker) out.push(spawnAt(z.x, z.y, z.z, z.name, 'z' + i));
      if (team !== self.attacker && z.owner !== self.attacker && !z.contested) out.push(spawnAt(z.x, z.y, z.z, z.name, 'z' + i));
    });
    return out;
  };
  TYPES.sequential.prototype.botGoal = function (u) {
    var z = pickSpread(this.zones, u, function (z) { return z.active; });
    return z ? zoneGoal(z) : enemyGoal(u);
  };
  TYPES.sequential.prototype.hud = function () {
    var a = this.attacker;
    var s = [0, 0]; s[a] = this.tickets; s[1 - a] = this.zones.filter(function (z) { return z.owner !== a; }).length;
    return { score: s, scoreLabel: (a === 0 ? 'Attacking ◂ ' : '') + 'Tickets / Objectives left' + (a === 1 ? ' ▸ Attacking' : ''), zones: this.zones.filter(function (z) { return z.active; }), time: this.clock, attacker: a };
  };

  // ---------------- Colossus Assault (walker escort)
  TYPES.colossus = inherit(function (def) {
    var g = G(), w = g.world, self = this;
    this.attacker = g.match.era === 'cw' ? 0 : 1;
    var fac = g.teams[this.attacker].faction;
    var vdef = SF.D.vehById[this.attacker === 0 ? 'atte' : 'atat'];
    this.walkers = [];
    w.walkerPaths.forEach(function (path, i) {
      var p = self.attacker === 1 ? path : path.slice().reverse();
      var v = g.spawnVehicle(vdef, self.attacker, fac, null, p[0].x, w.groundAt(p[0].x, p[0].z, 300), p[0].z);
      v.path = p; v.pi = 1; v.invuln = true; v.autoGun = true;
      v.maxHp = v.hp = vdef.id === 'atat' ? 9000 : 6000;
      self.walkers.push(v);
    });
    // uplinks are two posts in the middle third
    var mid = w.cps.slice(1, w.cps.length - 1);
    this.zones = makeZones(mid.slice(0, 2), [this.attacker, this.attacker]);
    this.zones.forEach(function (z) { z.progress = self.attacker === 0 ? -1 : 1; });
    this.cycle = 0; this.phase = 'uplink'; this.phaseT = 50; this.tickets = 150 + (def.players || 16) * 5;
  });
  TYPES.colossus.prototype.update = function (dt) {
    var self = this, g = G(), w = g.world;
    var d = 1 - this.attacker;
    this.zones.forEach(function (z) { z.update(dt, { rate: 0.18 }); });
    this.phaseT -= dt;
    if (this.phase === 'uplink' && this.phaseT <= 0) {
      var held = this.zones.filter(function (z) { return z.owner === d; }).length;
      if (held > 0) {
        this.phase = 'bombers'; this.phaseT = 10 + held * 8;
        this.walkers.forEach(function (v) { v.invuln = false; });
        g.announce('Bombers inbound! The walkers are vulnerable!', d);
        this.bombT = 0;
      } else { this.phaseT = 50; g.announce('Uplinks failed — hold the uplinks to call in bombers', d); }
    } else if (this.phase === 'bombers') {
      this.bombT -= dt;
      if (this.bombT <= 0) {
        this.bombT = 3;
        this.walkers.forEach(function (v) { if (v.alive) { var c = v.center(new V3()); SF.FX.beam(c.clone().add(new V3(0, 60, 0)), c, 0xff9a3a, 4, 0.2); SF.FX.explosion(c.clone().add(new V3((Math.random() - 0.5) * 6, 3, (Math.random() - 0.5) * 6)), 6); v.damage(v.maxHp * 0.05, null, 'explosive'); } });
      }
      if (this.phaseT <= 0) { this.phase = 'uplink'; this.phaseT = 50; this.walkers.forEach(function (v) { v.invuln = true; }); }
    }
    // walkers advance
    var reached = false;
    this.walkers.forEach(function (v) {
      if (!v.alive || !v.path) return;
      var p = v.path[v.pi];
      if (!p) { reached = true; return; }
      var dx = p.x - v.pos.x, dz = p.z - v.pos.z, dd = Math.hypot(dx, dz);
      if (dd < 3) { v.pi++; return; }
      var want = Math.atan2(-dx, -dz);
      v.yaw += Math.max(-0.2 * dt, Math.min(0.2 * dt, SF.angDiff(want, v.yaw)));
      var sp = v.def.speed * 0.45;
      v.vel.set(-Math.sin(v.yaw) * sp, 0, -Math.cos(v.yaw) * sp);
      v.legPhase += sp * dt * 0.22;
      v.pos.x += v.vel.x * dt; v.pos.z += v.vel.z * dt;
      v.pos.y = w.groundAt(v.pos.x, v.pos.z, v.pos.y + 3);
      v.updateMesh(dt);
    });
    if (reached) this.finish(this.attacker, 'A walker reached the target');
    if (this.walkers.every(function (v) { return !v.alive; })) this.finish(d, 'All walkers destroyed');
    if (this.tickets <= 0) this.finish(d, 'Attackers ran out of reinforcements');
  };
  TYPES.colossus.prototype.onKill = function (v) { if (v.team === this.attacker) this.tickets--; };
  TYPES.colossus.prototype.spawnPoints = function (team) {
    var out = [baseSpawn(team)], self = this;
    this.zones.forEach(function (z, i) { if (z.owner === team && !z.contested) out.push(spawnAt(z.x, z.y, z.z, z.name, 'u' + i)); });
    if (team === this.attacker) this.walkers.forEach(function (v, i) { if (v.alive) { var b = v.pos.clone().add(new V3(Math.sin(v.yaw) * 22, 0, Math.cos(v.yaw) * 22)); out.push(spawnAt(b.x, G().world.groundAt(b.x, b.z, 300), b.z, 'Walker ' + (i + 1), 'w' + i)); } });
    return out;
  };
  TYPES.colossus.prototype.botGoal = function (u) {
    var d = 1 - this.attacker;
    if (u.team === d && u.id % 2 === 0) { var z = pickSpread(this.zones, u, function (z) { return z.owner !== d; }); if (z) return zoneGoal(z); }
    if (u.team === this.attacker && u.id % 2 === 0) { var z2 = pickSpread(this.zones, u, function (z) { return z.owner === d; }); if (z2) return zoneGoal(z2); }
    var alive = this.walkers.filter(function (v) { return v.alive; });
    if (alive.length) { var v = alive[u.id % alive.length]; return { x: v.pos.x + Math.sin(v.yaw) * (u.team === d ? -30 : 15), z: v.pos.z + Math.cos(v.yaw) * (u.team === d ? -30 : 15), r: 12 }; }
    return enemyGoal(u);
  };
  TYPES.colossus.prototype.hud = function () {
    var s = [0, 0]; s[this.attacker] = this.tickets;
    s[1 - this.attacker] = this.walkers.filter(function (v) { return v.alive; }).length;
    var wl = this.walkers.map(function (v) { return v.alive ? Math.round(v.hp / v.maxHp * 100) + '%' : '✖'; }).join(' · ');
    return { score: s, scoreLabel: (this.phase === 'bombers' ? 'BOMBERS INBOUND ' : 'Uplink cycle ' + Math.ceil(this.phaseT) + 's ') + '· Walkers ' + wl, zones: this.zones, time: null, attacker: this.attacker };
  };
  TYPES.colossus.prototype.allowHero = function (team) { return G().teamHeroes(team) < 2; };
  TYPES.colossus.prototype.cleanup = function () { Base.prototype.cleanup.call(this); };

  // ---------------- Extraction (escort cargo)
  TYPES.escort = inherit(function (def) {
    var g = G(), w = g.world;
    this.attacker = w.map.seed % 2;
    var path = w.walkerPaths[0];
    if (this.attacker === 0) path = path.slice().reverse();
    var vdef = SF.D.vehById.occupier;
    var cargo = this.cargo = g.spawnVehicle(vdef, this.attacker, g.teams[this.attacker].faction, null, path[0].x, w.groundAt(path[0].x, path[0].z, 300), path[0].z);
    cargo.invuln = true; cargo.path = path; cargo.pi = 1; cargo.isCargo = true;
    this.clock = 8 * 60;
    this.zones = [];
  });
  TYPES.escort.prototype.update = function (dt) {
    var g = G(), w = g.world, c = this.cargo;
    var near = [0, 0];
    g.units.forEach(function (u) { if (u.alive && u.pos.distanceTo(c.pos) < 12) near[u.team]++; });
    var moving = near[this.attacker] > 0 && near[1 - this.attacker] === 0;
    this.moving = moving; this.contest = near[1 - this.attacker] > 0;
    var p = c.path[c.pi];
    if (!p) { this.finish(this.attacker, 'Cargo extracted'); return; }
    if (moving) {
      var dx = p.x - c.pos.x, dz = p.z - c.pos.z, dd = Math.hypot(dx, dz);
      if (dd < 2) c.pi++;
      else {
        c.yaw += SF.angDiff(Math.atan2(-dx, -dz), c.yaw) * Math.min(1, dt * 2);
        c.pos.x += dx / dd * 4 * dt; c.pos.z += dz / dd * 4 * dt;
        c.pos.y = w.groundAt(c.pos.x, c.pos.z, c.pos.y + 3) + 0.6;
      }
    }
    c.updateMesh(dt);
    this.clock -= dt;
    if (this.clock <= 0) this.finish(1 - this.attacker, 'Cargo not extracted in time');
  };
  TYPES.escort.prototype.spawnPoints = function (team) { return [baseSpawn(team)]; };
  TYPES.escort.prototype.botGoal = function (u) { var c = this.cargo; return { x: c.pos.x, z: c.pos.z, r: 8 }; };
  TYPES.escort.prototype.hud = function () {
    var a = this.attacker, s = [0, 0];
    s[a] = Math.round(this.cargo.pi / this.cargo.path.length * 100); s[1 - a] = 0;
    return { score: s, scoreLabel: 'Cargo progress % ' + (this.moving ? '▶ MOVING' : this.contest ? '■ CONTESTED' : '■ STOPPED'), zones: [], time: this.clock, attacker: a, marker: this.cargo.pos };
  };

  // ---------------- Sabotage
  TYPES.sabotage = inherit(function (def) {
    var g = G(), w = g.world, self = this;
    this.attacker = (w.map.seed >>> 3) % 2;
    var d = 1 - this.attacker;
    var cps = w.cps.slice().sort(function (a, b) { var bb = base(d); return Math.hypot(a.x - bb.x, a.z - bb.z) - Math.hypot(b.x - bb.x, b.z - bb.z); }).slice(0, 3);
    this.targets = cps.map(function (c, i) {
      var M = SF.Models, grp = new THREE.Group();
      M.mesh('box', M.mat(0x4a4e54, 0.5, 0.5), grp, 0, 1.2, 0, 2.2, 2.4, 2.2);
      M.mesh('cyl', M.mat(0x8ad8ff, 0, 0, 'glow'), grp, 0, 2.6, 0, 0.8, 0.4, 0.8);
      grp.position.set(c.x, c.y, c.z); g.scene.add(grp);
      w.addBox(c.x, c.y, c.z, 2.2, 2.4, 2.2);
      return { x: c.x, y: c.y, z: c.z, name: ['Generator', 'Comms Relay', 'Fuel Depot'][i] + ' ' + String.fromCharCode(65 + i), state: 'idle', plant: 0, timer: 0, mesh: grp, alive: true };
    });
    this.tickets = 100 + (def.players || 16) * 5; this.clock = 10 * 60;
  });
  TYPES.sabotage.prototype.update = function (dt) {
    var g = G(), self = this, a = this.attacker;
    this.targets.forEach(function (t) {
      if (!t.alive) return;
      var near = [0, 0];
      g.units.forEach(function (u) { if (u.alive && Math.hypot(u.pos.x - t.x, u.pos.z - t.z) < 5) near[u.team]++; });
      if (t.state === 'idle') {
        if (near[a] && !near[1 - a]) { t.plant += dt; if (t.plant > 4) { t.state = 'armed'; t.timer = 25; t.plant = 0; g.announce('Charge planted on ' + t.name + '!', a); } }
        else t.plant = Math.max(0, t.plant - dt);
      } else if (t.state === 'armed') {
        t.timer -= dt;
        if (near[1 - a] && !near[a]) { t.plant += dt; if (t.plant > 4) { t.state = 'idle'; t.plant = 0; g.announce('Charge defused at ' + t.name, 1 - a); } }
        else t.plant = Math.max(0, t.plant - dt);
        if (t.timer <= 0) { t.alive = false; t.state = 'destroyed'; SF.FX.explosion(new V3(t.x, t.y + 1, t.z), 12); t.mesh.visible = false; self.clock += 120; g.announce(t.name + ' destroyed!', a); }
      }
    });
    var dead = this.targets.filter(function (t) { return !t.alive; }).length;
    if (dead >= 2) this.finish(a, 'Targets destroyed');
    this.clock -= dt;
    if (this.clock <= 0) this.finish(1 - a, 'Sabotage failed — time up');
    if (this.tickets <= 0) this.finish(1 - a, 'Attackers ran out of reinforcements');
  };
  TYPES.sabotage.prototype.onKill = function (v) { if (v.team === this.attacker) this.tickets--; };
  TYPES.sabotage.prototype.botGoal = function (u) {
    var alive = this.targets.filter(function (t) { return t.alive; });
    var armed = alive.filter(function (t) { return t.state === 'armed'; });
    var list = u.team !== this.attacker && armed.length ? armed : alive;
    var t = list[u.id % list.length];
    return t ? { x: t.x, z: t.z, r: 3.5 } : enemyGoal(u);
  };
  TYPES.sabotage.prototype.hud = function () {
    var s = [0, 0]; s[this.attacker] = this.tickets; s[1 - this.attacker] = this.targets.filter(function (t) { return t.alive; }).length;
    var lab = this.targets.map(function (t) { return t.name.split(' ').pop() + ':' + (t.state === 'armed' ? Math.ceil(t.timer) + 's' : t.state === 'destroyed' ? '✖' : t.plant > 0 ? Math.round(t.plant / 4 * 100) + '%' : 'OK'); }).join('  ');
    return { score: s, scoreLabel: lab, zones: [], markers: this.targets.filter(function (t) { return t.alive; }), time: this.clock, attacker: this.attacker };
  };
  TYPES.sabotage.prototype.cleanup = function () { var g = G(); this.targets.forEach(function (t) { g.scene.remove(t.mesh); }); };

  // ---------------- Capture the Flag (two flags) / Cargo / Jetpack Cargo
  TYPES.ctf = inherit(function (def) {
    var g = G();
    this.caps = [0, 0]; this.target = 3; this.limit = 12 * 60;
    var self = this;
    this.carries = [0, 1].map(function (t) { var b = base(t); return new Carry(b.x + 6, b.y, b.z, t, g.teams[t].color, def.id === 'ctf' ? g.teams[t].short + ' flag' : g.teams[t].short + ' cargo'); });
  });
  TYPES.ctf.prototype.update = function (dt) {
    var g = G(), self = this;
    this.carries.forEach(function (c) {
      c.update(dt, function (u, cc) { return u.team !== cc.team ? 'take' : 'return'; });
      if (c.carrier) {
        var own = self.carries[c.carrier.team];
        if (own.atHome() && c.carrier.pos.distanceTo(own.home) < 4) {
          self.caps[c.carrier.team]++;
          g.addBp(c.carrier, 500, 'Captured ' + c.label);
          g.announce(c.carrier.name + ' captured the ' + c.label + '!', c.carrier.team);
          if (g.player && g.player.team === c.carrier.team) SF.Audio.capture();
          c.returnHome();
        }
      }
    });
    if (this.caps[0] >= this.target) this.finish(0, 'Captures complete');
    if (this.caps[1] >= this.target) this.finish(1, 'Captures complete');
    this.tickTime(dt, function () { self.finish(self.caps[0] > self.caps[1] ? 0 : self.caps[1] > self.caps[0] ? 1 : -1, 'Time limit reached'); });
  };
  TYPES.ctf.prototype.botGoal = function (u) {
    var mine = this.carries[u.team], theirs = this.carries[1 - u.team];
    if (u.carrying) return { x: mine.home.x, z: mine.home.z, r: 1.5 };
    if (mine.carrier || !mine.atHome()) { if (u.id % 2 === 0) return { x: mine.pos.x, z: mine.pos.z, r: 1.5 }; }
    if (u.id % 3 === 0) return { x: mine.home.x + 8, z: mine.home.z, r: 10 };
    if (theirs.carrier) return { x: theirs.pos.x, z: theirs.pos.z, r: 6 };
    return { x: theirs.pos.x, z: theirs.pos.z, r: 1.2 };
  };
  TYPES.ctf.prototype.hud = function () { return { score: this.caps.slice(), scoreLabel: 'Captures (to ' + this.target + ')', zones: [], markers: this.carries.map(function (c) { return c.pos; }), time: this.timeLeft() }; };

  TYPES.ctf1 = inherit(function (def) {
    var g = G(), w = g.world;
    this.caps = [0, 0]; this.target = 3; this.limit = 12 * 60;
    var c = w.cps[Math.floor(w.cps.length / 2)];
    this.carries = [new Carry(c.x, c.y, c.z, -1, 0xffd84a, 'flag')];
  });
  TYPES.ctf1.prototype.update = function (dt) {
    var g = G(), self = this, f = this.carries[0];
    f.update(dt, function () { return 'take'; });
    if (f.carrier) {
      var eb = base(1 - f.carrier.team);
      if (Math.hypot(f.carrier.pos.x - eb.x, f.carrier.pos.z - eb.z) < 12) {
        self.caps[f.carrier.team]++; g.addBp(f.carrier, 500, 'Flag delivered'); g.announce(f.carrier.name + ' scored with the flag!', f.carrier.team);
        f.returnHome();
      }
    }
    if (this.caps[0] >= this.target) this.finish(0, 'Captures complete');
    if (this.caps[1] >= this.target) this.finish(1, 'Captures complete');
    this.tickTime(dt, function () { self.finish(self.caps[0] > self.caps[1] ? 0 : self.caps[1] > self.caps[0] ? 1 : -1, 'Time limit reached'); });
  };
  TYPES.ctf1.prototype.botGoal = function (u) {
    var f = this.carries[0];
    if (u.carrying) { var eb = base(1 - u.team); return { x: eb.x, z: eb.z, r: 4 }; }
    if (f.carrier && f.carrier.team === u.team) { return { x: f.pos.x, z: f.pos.z, r: 8 }; }
    return { x: f.pos.x, z: f.pos.z, r: 1.2 };
  };
  TYPES.ctf1.prototype.hud = function () { return { score: this.caps.slice(), scoreLabel: 'Flag deliveries (to ' + this.target + ')', zones: [], markers: [this.carries[0].pos], time: this.timeLeft() }; };

  // ---------------- Strike
  TYPES.strike = inherit(function (def) {
    var g = G(), w = g.world;
    this.attacker = w.map.seed % 2;
    var d = 1 - this.attacker;
    var c = w.cps.slice().sort(function (a, b) { var bb = base(d); return Math.hypot(a.x - bb.x, a.z - bb.z) - Math.hypot(b.x - bb.x, b.z - bb.z); })[1] || w.cps[0];
    this.carries = [new Carry(c.x, c.y, c.z, d, 0x5affd8, 'intel')];
    var ab = base(this.attacker);
    this.extract = new Zone(ab.x, ab.y, ab.z + (this.attacker === 0 ? 20 : -20), 7, 'Extraction', this.attacker);
    this.clock = 7 * 60;
  });
  TYPES.strike.prototype.update = function (dt) {
    var g = G(), a = this.attacker, f = this.carries[0], self = this;
    f.update(dt, function (u) { return u.team === a ? 'take' : 'return'; });
    if (f.carrier && Math.hypot(f.carrier.pos.x - this.extract.x, f.carrier.pos.z - this.extract.z) < 7) { g.addBp(f.carrier, 800, 'Intel extracted'); this.finish(a, 'Intel extracted'); }
    this.clock -= dt;
    if (this.clock <= 0) this.finish(1 - a, 'Defenders held the intel');
  };
  TYPES.strike.prototype.botGoal = function (u) {
    var f = this.carries[0];
    if (u.carrying) return { x: this.extract.x, z: this.extract.z, r: 3 };
    if (u.team === this.attacker) return f.carrier ? { x: f.pos.x, z: f.pos.z, r: 8 } : { x: f.pos.x, z: f.pos.z, r: 1.2 };
    return f.atHome() ? { x: f.home.x, z: f.home.z, r: 12 } : { x: f.pos.x, z: f.pos.z, r: 1.2 };
  };
  TYPES.strike.prototype.hud = function () { var s = [0, 0]; return { score: s, scoreLabel: this.carries[0].carrier ? 'Intel carried by ' + this.carries[0].carrier.name : 'Seize the intel', zones: [this.extract], markers: [this.carries[0].pos], time: this.clock, attacker: this.attacker }; };
  TYPES.strike.prototype.cleanup = function () { Base.prototype.cleanup.call(this); this.extract.remove(); };

  // ---------------- Drop Zone
  TYPES.dropzone = inherit(function (def) {
    this.caps = [0, 0]; this.target = 5; this.limit = 12 * 60; this.zones = []; this.nextT = 3;
  });
  TYPES.dropzone.prototype.update = function (dt) {
    var g = G(), w = g.world, self = this;
    if (!this.pod) {
      this.nextT -= dt;
      if (this.nextT <= 0) {
        var p = SF.World.randomNavPoint(w, Math.random, 0, 0, w.half * 0.55);
        var y = w.groundAt(p.x, p.z, 300);
        this.pod = new Zone(p.x, y, p.z, 7, 'Escape Pod');
        this.pod.hold = [0, 0];
        this.zones = [this.pod];
        SF.FX.beam(new V3(p.x, y + 120, p.z), new V3(p.x, y, p.z), 0xffaa44, 4, 0.6);
        SF.FX.explosion(new V3(p.x, y + 1, p.z), 6);
        var M = SF.Models; this.podMesh = M.mesh('sph', M.mat(0x8a8e94, 0.4, 0.6), g.scene, p.x, y + 1.2, p.z, 2.6, 2.4, 2.6);
        g.announce('An escape pod has landed!', -1);
      }
      return;
    }
    var z = this.pod;
    z.update(dt, { rate: 0 });
    if (z.count[0] && !z.count[1]) z.hold[0] += dt; else if (z.count[1] && !z.count[0]) z.hold[1] += dt;
    for (var t = 0; t < 2; t++) if (z.hold[t] >= 20) {
      this.caps[t]++; g.announce(g.teams[t].name + ' secured the pod!', t);
      g.units.forEach(function (u) { if (u.alive && u.team === t && Math.hypot(u.pos.x - z.x, u.pos.z - z.z) < 8) g.addBp(u, 300, 'Pod secured'); });
      z.remove(); g.scene.remove(this.podMesh); this.pod = null; this.zones = []; this.nextT = 6; break;
    }
    if (this.caps[0] >= this.target) this.finish(0, 'Five pods secured');
    if (this.caps[1] >= this.target) this.finish(1, 'Five pods secured');
    this.tickTime(dt, function () { self.finish(self.caps[0] > self.caps[1] ? 0 : self.caps[1] > self.caps[0] ? 1 : -1, 'Time limit reached'); });
  };
  TYPES.dropzone.prototype.botGoal = function (u) { return this.pod ? zoneGoal(this.pod) : enemyGoal(u); };
  TYPES.dropzone.prototype.hud = function () {
    var p = this.pod;
    return { score: this.caps.slice(), scoreLabel: p ? 'Pod hold ' + Math.round(p.hold[0]) + 's / ' + Math.round(p.hold[1]) + 's of 20s' : 'Next pod inbound…', zones: this.zones, time: this.timeLeft() };
  };
  TYPES.dropzone.prototype.cleanup = function () { if (this.pod) this.pod.remove(); if (this.podMesh) G().scene.remove(this.podMesh); };

  // ---------------- Synth Run: three wandering synths are moving capture zones
  TYPES.synthrun = inherit(function (def) {
    var g = G(), w = g.world, self = this;
    this.points = [0, 0]; this.target = 300; this.limit = 12 * 60; this.acc = 0;
    this.zones = [];
    this.synths = [0, 1, 2].map(function (i) {
      var c = w.cps[Math.min(w.cps.length - 1, 1 + i)];
      var R = SF.Models.styles.brute([0, 0, 0, 0], null);
      R.root.position.set(c.x, c.y, c.z); R.root.scale.setScalar(1.3); g.scene.add(R.root);
      var z = new Zone(c.x, c.y, c.z, 6, 'Synth ' + 'ABC'[i]);
      self.zones.push(z);
      return { rig: R, zone: z, pos: new V3(c.x, c.y, c.z), target: null, ph: 0 };
    });
  });
  TYPES.synthrun.prototype.update = function (dt) {
    var g = G(), w = g.world, self = this;
    this.synths.forEach(function (s) {
      s.zone.update(dt, { rate: 0.35 });
      if (!s.target || s.pos.distanceTo(s.target) < 2) { var p = SF.World.randomNavPoint(w, Math.random, 0, 0, w.half * 0.5); s.target = new V3(p.x, 0, p.z); }
      var dx = s.target.x - s.pos.x, dz = s.target.z - s.pos.z, d = Math.hypot(dx, dz);
      var sp = s.zone.contested ? 0 : 1.6;
      s.pos.x += dx / d * sp * dt; s.pos.z += dz / d * sp * dt; s.pos.y = w.groundAt(s.pos.x, s.pos.z, s.pos.y + 2);
      s.zone.x = s.pos.x; s.zone.z = s.pos.z; s.zone.y = s.pos.y; s.zone.mesh.position.copy(s.pos);
      s.rig.root.position.copy(s.pos); s.rig.root.rotation.y = Math.atan2(-dx, -dz);
      s.ph += dt * sp * 2.5;
      s.rig.lThigh.rotation.x = Math.sin(s.ph) * 0.5; s.rig.rThigh.rotation.x = -Math.sin(s.ph) * 0.5;
    });
    this.acc += dt;
    if (this.acc >= 1) { this.acc -= 1; this.synths.forEach(function (s) { if (s.zone.owner >= 0) self.points[s.zone.owner] += 3; }); }
    if (this.points[0] >= this.target) this.finish(0, 'Synths controlled');
    if (this.points[1] >= this.target) this.finish(1, 'Synths controlled');
    this.tickTime(dt, function () { self.finish(self.points[0] > self.points[1] ? 0 : self.points[1] > self.points[0] ? 1 : -1, 'Time limit reached'); });
  };
  TYPES.synthrun.prototype.botGoal = function (u) { var z = pickSpread(this.zones, u, function (z) { return z.owner !== u.team; }) || pickSpread(this.zones, u); return { x: z.x, z: z.z, r: 3 }; };
  TYPES.synthrun.prototype.hud = function () { return { score: this.points.slice(), scoreLabel: 'Points (to ' + this.target + ')', zones: this.zones, time: this.timeLeft() }; };
  TYPES.synthrun.prototype.cleanup = function () { Base.prototype.cleanup.call(this); var g = G(); this.synths.forEach(function (s) { g.scene.remove(s.rig.root); }); };

  // ---------------- Team deathmatch (Blast, Legends Assault)
  TYPES.tdm = inherit(function (def) { this.kills = [0, 0]; this.target = def.target || 100; this.limit = 10 * 60; this.zones = []; if (def.heroesOnly) this.heroCap = 99; });
  TYPES.tdm.prototype.update = function (dt) {
    var self = this;
    if (this.kills[0] >= this.target) this.finish(0, 'Elimination target reached');
    if (this.kills[1] >= this.target) this.finish(1, 'Elimination target reached');
    this.tickTime(dt, function () { self.finish(self.kills[0] > self.kills[1] ? 0 : self.kills[1] > self.kills[0] ? 1 : -1, 'Time limit reached'); });
  };
  TYPES.tdm.prototype.onKill = function (v, k) { this.kills[1 - v.team]++; };
  TYPES.tdm.prototype.spawnPoints = function (team) {
    var b = base(team), w = G().world;
    var out = [baseSpawn(team)];
    // spread spawns along own half
    for (var i = 0; i < 2; i++) { var p = SF.World.randomNavPoint(w, Math.random, b.x * 0.5, b.z * 0.5, w.half * 0.3); out.push(spawnAt(p.x, w.groundAt(p.x, p.z, 300), p.z, 'Forward ' + (i + 1), 'f' + i)); }
    return out;
  };
  TYPES.tdm.prototype.hud = function () { return { score: this.kills.slice(), scoreLabel: 'Eliminations (to ' + this.target + ')', zones: [], time: this.timeLeft() }; };

  // ---------------- Hunt: natives vs an army
  TYPES.hunt = inherit(function (def) { TYPES.tdm.call(this, def); this.target = def.target || 50; });
  Object.assign(TYPES.hunt.prototype, TYPES.tdm.prototype); TYPES.hunt.prototype.constructor = TYPES.hunt;

  // ---------------- Forest Hunt (infection)
  TYPES.infect = inherit(function (def) { this.limit = 5 * 60; this.zones = []; this.noRespawn = true; });
  TYPES.infect.prototype.update = function (dt) {
    var g = G(), self = this;
    var troopers = g.units.filter(function (u) { return u.team === 0; });
    if (this.time > 5 && troopers.length === 0) this.finish(1, 'The tribe claimed everyone');
    this.tickTime(dt, function () { self.finish(0, 'Survivors made it to extraction'); });
  };
  TYPES.infect.prototype.onKill = function (v) {
    var g = G();
    if (v.team === 0) g.convertUnit(v, 1);
  };
  TYPES.infect.prototype.spawnPoints = function (team) { return TYPES.tdm.prototype.spawnPoints.call(this, team); };
  TYPES.infect.prototype.hud = function () {
    var g = G(), n = [0, 0]; g.units.forEach(function (u) { n[u.team]++; });
    return { score: n, scoreLabel: 'Survivors / Tribe', zones: [], time: this.timeLeft() };
  };

  // ---------------- Champions vs Tyrants (rounds, one target per side)
  TYPES.cvt = inherit(function (def) { this.points = [0, 0]; this.target = 5; this.zones = []; this.heroCap = 99; this.round = 0; this.noRespawn = true; this.roundT = 0; });
  TYPES.cvt.prototype.update = function (dt) {
    var g = G(), self = this;
    this.roundT += dt;
    if (!this.targets && this.roundT > 3.5) this.pickTargets();
    if (this.targets) for (var t = 0; t < 2; t++) {
      var tu = this.targets[t];
      if (tu && !tu.alive) { this.points[1 - t]++; g.announce(g.teams[1 - t].name + ' eliminated the target!', 1 - t); this.nextRound(); return; }
    }
    if (g.teamAlive(0) === 0 && this.roundT > 4) { this.points[1]++; this.nextRound(); }
    else if (g.teamAlive(1) === 0 && this.roundT > 4) { this.points[0]++; this.nextRound(); }
    if (this.points[0] >= this.target) this.finish(0, 'Five targets eliminated');
    if (this.points[1] >= this.target) this.finish(1, 'Five targets eliminated');
  };
  TYPES.cvt.prototype.pickTargets = function () {
    var g = G();
    this.targets = [0, 1].map(function (t) { var list = g.units.filter(function (u) { return u.team === t && u.alive; }); var tu = list[(Math.random() * list.length) | 0]; if (tu) tu.isTarget = true; return tu; });
  };
  TYPES.cvt.prototype.nextRound = function () {
    var g = G();
    if (this.targets) this.targets.forEach(function (u) { if (u) u.isTarget = false; });
    this.targets = null; this.roundT = 0; this.round++;
    g.respawnAll(2.5);
  };
  TYPES.cvt.prototype.botGoal = function (u) {
    if (this.targets) { var tu = this.targets[1 - u.team]; if (tu && tu.alive) return { x: tu.pos.x, z: tu.pos.z, r: u.melee ? 1.5 : 12 }; }
    return enemyGoal(u);
  };
  TYPES.cvt.prototype.spawnPoints = function (team) { return [baseSpawn(team)]; };
  TYPES.cvt.prototype.hud = function () {
    var lab = this.targets ? 'Targets: ' + (this.targets[0] ? this.targets[0].name : '-') + ' / ' + (this.targets[1] ? this.targets[1].name : '-') : 'Round ' + (this.round + 1);
    return { score: this.points.slice(), scoreLabel: lab, zones: [], time: null };
  };

  // ---------------- Legends Showdown (2v2 rounds)
  TYPES.showdown = inherit(function (def) { this.wins = [0, 0]; this.target = 3; this.zones = []; this.heroCap = 99; this.noRespawn = true; this.roundT = 0; this.round = 1; });
  TYPES.showdown.prototype.update = function (dt) {
    var g = G();
    this.roundT += dt;
    if (this.roundT < 4.5) return;
    var a0 = g.teamAlive(0), a1 = g.teamAlive(1);
    if (!a0 || !a1 || this.roundT > 150) {
      var w = a0 > a1 ? 0 : a1 > a0 ? 1 : (g.teamHp(0) >= g.teamHp(1) ? 0 : 1);
      this.wins[w]++; g.announce(g.teams[w].name + ' win round ' + this.round, w);
      this.round++; this.roundT = 0;
      if (this.wins[w] >= this.target) { this.finish(w, 'Showdown won'); return; }
      g.respawnAll(3, true);
    }
  };
  TYPES.showdown.prototype.spawnPoints = function (team) { var b = base(team), w = G().world; if (w.bio.void != null) return [baseSpawn(team)]; return [spawnAt(b.x * 0.4, w.groundAt(b.x * 0.4, b.z * 0.4, 300), b.z * 0.4, 'Arena', 'a')]; };
  TYPES.showdown.prototype.hud = function () { return { score: this.wins.slice(), scoreLabel: 'Round ' + this.round + ' · best of 5', zones: [], time: Math.max(0, 150 - this.roundT) }; };

  // ---------------- Legend Hunt (one legend vs all)
  TYPES.legendhunt = inherit(function (def) { this.zones = []; this.pts = {}; this.target = 25; this.limit = 10 * 60; this.heroCap = 1; });
  TYPES.legendhunt.prototype.onKill = function (v, k) {
    var g = G();
    if (!k || !k.name) return;
    if (v.team === 1 && k.team === 0) {
      this.pts[k.id] = (this.pts[k.id] || 0) + 5;
      g.announce(k.name + ' slew the legend and takes up the mantle!', 0);
      g.swapLegend(v, k);
    } else if (k.team === 1) this.pts[k.id] = (this.pts[k.id] || 0) + 1;
    var self = this;
    g.units.forEach(function (u) { if ((self.pts[u.id] || 0) >= self.target) self.finish(u.team, u.name + ' wins the hunt'); });
  };
  TYPES.legendhunt.prototype.update = function (dt) {
    var self = this, g = G();
    this.tickTime(dt, function () { var best = null, bp = -1; g.units.forEach(function (u) { if ((self.pts[u.id] || 0) > bp) { bp = self.pts[u.id] || 0; best = u; } }); self.finish(best ? best.team : -1, (best ? best.name : 'Nobody') + ' had the most points'); });
  };
  TYPES.legendhunt.prototype.allowHero = function (team) { return team === 1; };
  TYPES.legendhunt.prototype.hud = function () {
    var g = G(), self = this, me = g.player ? (this.pts[g.player.id] || 0) : 0;
    var top = g.units.slice().sort(function (a, b) { return (self.pts[b.id] || 0) - (self.pts[a.id] || 0); })[0];
    return { score: [me, top ? (this.pts[top.id] || 0) : 0], scoreLabel: 'You / Leader (' + (top ? top.name : '-') + ') · to ' + this.target, zones: [], time: this.timeLeft() };
  };

  // ---------------- Survival (waves)
  TYPES.survival = inherit(function (def) {
    this.wave = 0; this.maxWave = 15; this.zones = []; this.lives = 12; this.waveT = 5; this.botsTeam1 = 0; this.custom = true;
  });
  TYPES.survival.prototype.update = function (dt) {
    var g = G();
    var enemies = g.units.filter(function (u) { return u.team === 1; });
    var alive = enemies.filter(function (u) { return u.alive; }).length + g.vehicles.filter(function (v) { return v.alive && v.team === 1; }).length;
    if (this.wave === 0 || (alive === 0 && this.spawned)) {
      this.waveT -= dt;
      if (this.waveT <= 0) {
        if (this.wave >= this.maxWave) { this.finish(0, 'Survived all ' + this.maxWave + ' waves'); return; }
        this.wave++; this.spawned = true; this.waveT = 8;
        g.clearTeam(1);
        var n = 4 + this.wave * 2;
        var b = base(1);
        for (var i = 0; i < n; i++) g.addBot(1, { classId: ['assault', 'assault', 'heavy', 'specialist', 'officer', 'commando'][i % 6] });
        if (this.wave % 5 === 0) { var hs = SF.D.heroes.filter(function (h) { return h.era === g.match.era && h.side === g.teams[1].side; }); g.addBot(1, { heroId: hs[(Math.random() * hs.length) | 0].id }); }
        if (this.wave >= 7 && g.match.vehiclesOk) { var vs = SF.D.vehicles.filter(function (v) { return v.era === g.match.era && v.side === g.teams[1].side && v.type !== 'fighter' && v.id !== 'atat'; }); if (vs.length) g.addBotVehicle(1, vs[(Math.random() * vs.length) | 0]); }
        g.units.forEach(function (u) { if (u.team === 0 && !u.alive) g.queueRespawn(u, 1); });
        g.announce('Wave ' + this.wave + ' of ' + this.maxWave, 1);
      }
    }
    if (this.lives <= 0 && g.teamAlive(0) === 0) this.finish(1, 'Your squad was wiped out on wave ' + this.wave);
  };
  TYPES.survival.prototype.onKill = function (v) { if (v.team === 0) this.lives--; else v.noRespawn = true; };
  TYPES.survival.prototype.spawnPoints = function (team) { return team === 0 ? [baseSpawn(0, 'Holdout')] : TYPES.tdm.prototype.spawnPoints.call(this, team); };
  TYPES.survival.prototype.botGoal = function (u) { if (u.team === 0) { var b = base(0); var e = enemyGoal(u); return Math.hypot(e.x - b.x, e.z - b.z) < 50 ? e : { x: b.x, z: b.z, r: 14 }; } return enemyGoal(u); };
  TYPES.survival.prototype.hud = function () { return { score: [this.lives, this.wave], scoreLabel: 'Lives · Wave ' + this.wave + '/' + this.maxWave, zones: [], time: null }; };

  // ---------------- Space: Fighter Squadron / Legend Starships
  TYPES.squadron = inherit(function (def) {
    this.zones = []; this.space = true;
    if (def.heroesOnly) { this.kills = [0, 0]; this.target = 30; } else this.tickets = [80 + (def.players || 12) * 4, 80 + (def.players || 12) * 4];
    this.limit = 12 * 60;
  });
  TYPES.squadron.prototype.update = function (dt) {
    var self = this;
    if (this.tickets) { if (this.tickets[0] <= 0) this.finish(1, 'Squadron wiped out'); if (this.tickets[1] <= 0) this.finish(0, 'Squadron wiped out'); }
    else { if (this.kills[0] >= this.target) this.finish(0, 'Thirty kills'); if (this.kills[1] >= this.target) this.finish(1, 'Thirty kills'); }
    this.tickTime(dt, function () { var s = self.tickets || self.kills; var hi = self.tickets ? 1 : 1; self.finish(s[0] > s[1] ? 0 : s[1] > s[0] ? 1 : -1, 'Time limit reached'); });
  };
  TYPES.squadron.prototype.onKill = function (v) { if (this.tickets) this.tickets[v.team] = Math.max(0, this.tickets[v.team] - 1); else this.kills[1 - v.team]++; };
  TYPES.squadron.prototype.spawnPoints = function (team) { var b = base(team); return [spawnAt(b.x, 0, b.z * 0.85, 'Hangar', 'h')]; };
  TYPES.squadron.prototype.botGoal = function (u) { return enemyGoal(u); };
  TYPES.squadron.prototype.hud = function () { return { score: (this.tickets || this.kills).slice(), scoreLabel: this.tickets ? 'Reinforcements' : 'Kills (to ' + this.target + ')', zones: [], time: this.timeLeft() }; };

  // ---------------- Space Assault / Starfighter Assault (capital ships)
  TYPES.spaceassault = inherit(function (def) {
    var g = G();
    this.zones = []; this.space = true;
    g.capitals = [0, 1].map(function (t) { var b = base(t); return new SF.Capital(g.teams[t].faction, t, new V3(b.x + (t ? 120 : -120), 30, b.z * 1.25), t === 0 ? 0 : Math.PI); });
    this.tickets = [150, 150]; this.limit = 15 * 60;
  });
  TYPES.spaceassault.prototype.update = function (dt) {
    var g = G(), self = this;
    g.capitals.forEach(function (c) { c.update(dt); });
    for (var t = 0; t < 2; t++) {
      var cap = g.capitals[t];
      if (cap.subs[1].hp <= 0 && cap.subs[2].hp <= 0) { this.finish(1 - t, cap.name + ' destroyed'); return; }
    }
    if (this.tickets[0] <= 0) this.finish(1, 'Fleet depleted'); if (this.tickets[1] <= 0) this.finish(0, 'Fleet depleted');
    this.tickTime(dt, function () { var hp = g.capitals.map(function (c) { return c.subs.reduce(function (s, x) { return s + x.hp; }, 0); }); self.finish(hp[0] > hp[1] ? 0 : 1, 'Time limit — more intact capital ship'); });
  };
  TYPES.spaceassault.prototype.onKill = function (v) { this.tickets[v.team] = Math.max(0, this.tickets[v.team] - 1); };
  TYPES.spaceassault.prototype.spawnPoints = TYPES.squadron.prototype.spawnPoints;
  TYPES.spaceassault.prototype.botGoal = function (u) { return enemyGoal(u); };
  TYPES.spaceassault.prototype.hud = function () {
    var g = G();
    var lab = g.capitals.map(function (c) { return c.subs.map(function (s) { return s.name.split(' ')[0] + ' ' + Math.round(s.hp / s.maxHp * 100) + '%'; }).join(' · '); });
    return { score: this.tickets.slice(), scoreLabel: 'Enemy ship: ' + lab[g.player ? 1 - g.player.team : 1], zones: [], time: this.timeLeft(), subsystems: true };
  };
  TYPES.spaceassault.prototype.cleanup = function () { var g = G(); (g.capitals || []).forEach(function (c) { g.scene.remove(c.root); c.subs.forEach(function (s) { g.scene.remove(s.marker); }); }); g.capitals = null; };

  Modes.Zone = Zone;
  Modes.Carry = Carry;
})();
