// Infantry and legends: movement physics, procedural animation, weapons/heat, blades, damage and abilities.
var SF = window.SF || (window.SF = {});

(function () {
  var V3 = THREE.Vector3;
  var D = function () { return SF.D; };
  var G = function () { return SF.G; };
  var tmp = new V3(), tmp2 = new V3(), tmp3 = new V3();
  var GRAV = 22;

  var namePools = {
    concord: ['Echo', 'Fives', 'Hardcase', 'Jesse', 'Kix', 'Tup', 'Dogma', 'Hevy', 'Cutup', 'Boil', 'Waxer', 'Wolffe', 'Gregor', 'Hawk', 'Sinker', 'Boost', 'Comet', 'Jet', 'Ace', 'Flint'],
    syndicate: [],
    alliance: ['Tarn', 'Mira', 'Dov', 'Kessa', 'Brin', 'Jorran', 'Hale', 'Lio', 'Varra', 'Pell', 'Coren', 'Sabe', 'Tobin', 'Rhys', 'Anwen', 'Dex', 'Wil', 'Nara', 'Oslo', 'Teague'],
    dominion: [],
    rangers: ['Carver', 'Dune', 'Ash', 'Reyes', 'Ostrow', 'Vance', 'Keel', 'Marlo', 'Juno', 'Sorrel', 'Tamsin', 'Quill', 'Rook', 'Bram', 'Ivo', 'Sela', 'Thorne', 'Wade', 'Yara', 'Zev'],
    remnant: []
  };
  function botName(fid, R) {
    var p = namePools[fid];
    var n = 1000 + ((R() * 8999) | 0);
    if (fid === 'concord') return 'CT-' + n + ' "' + p[(R() * p.length) | 0] + '"';
    if (fid === 'syndicate') return 'SK-' + n;
    if (fid === 'dominion') return 'DT-' + n;
    if (fid === 'remnant') return 'RT-' + n;
    if (p && p.length) return p[(R() * p.length) | 0] + ' ' + ['Vel', 'Orr', 'Kade', 'Sol', 'Marr', 'Teel', 'Bix', 'Rann', 'Jex', 'Holt'][(R() * 10) | 0];
    var F = D().factions[fid];
    return (F ? F.short.charAt(0) + F.short.slice(1).toLowerCase() : 'Native') + ' ' + n % 100;
  }
  SF.botName = botName;

  // ------------------------------------------------------------------ Unit
  function Unit(o) {
    this.type = 'unit';
    this.id = (Unit.nextId = (Unit.nextId || 0) + 1);
    this.team = o.team; this.faction = o.faction; this.isPlayer = !!o.isPlayer;
    this.name = o.name || botName(o.faction, Math.random);
    this.cards = o.cards || [];
    this.skin = o.skin || 'default';
    this.pos = new V3(); this.vel = new V3(); this.yaw = 0; this.pitch = 0;
    this.input = { fwd: 0, strafe: 0, jump: false, sprint: false, crouch: false, fire: false, aim: false, ab: [false, false, false], vent: false };
    this.buffs = {};
    this.alive = false; this.deadT = 0;
    this.kills = 0; this.deaths = 0; this.score = 0; this.bp = 0; this.streak = 0;
    this.anim = { ph: 0, swingT: -1, swingIdx: 0, castT: 0, castKind: null, throwT: 0, hitT: 0, deathT: 0, knockT: 0, emote: null, emoteT: 0, recoil: 0, land: 0 };
    this.blockEnergy = 100; this.jetFuel = 100;
    this.setKit(o);
  }
  SF.Unit = Unit;
  var UP = Unit.prototype;

  UP.setKit = function (o) {
    var Dd = D();
    this.heroId = o.heroId || null; this.classId = o.classId || 'assault';
    this.isHero = !!this.heroId;
    this.native = !!(Dd.factions[this.faction] && Dd.factions[this.faction].era === '*');
    var spec;
    if (this.isHero) { spec = Dd.heroById[this.heroId]; this.weaponSpec = spec.weapon; this.abilityIds = spec.abilities.slice(); }
    else {
      spec = Dd.classById[this.classId] || Dd.reinfById[this.classId];
      var lo = Dd.loadouts[this.faction] || Dd.loadouts.concord;
      var list = lo[this.classId] || lo.assault;
      this.weaponSpec = o.weaponId && list.indexOf(o.weaponId) >= 0 ? o.weaponId : list[0];
      this.abilityIds = spec.abilities.slice();
      if (this.native) this.abilityIds = this.classId === 'heavy' ? ['thermal', 'dash', 'rally'] : ['dash', 'thermal', 'medDrone'];
    }
    this.spec = spec;
    this.maxHp = spec.hp * (this.has('bodyArmor') ? 1.15 : 1);
    this.hp = this.maxHp;
    this.speedK = (spec.speed || 1) * (this.has('sprinter') ? 1.1 : 1);
    this.weapon = typeof this.weaponSpec === 'string' ? Dd.weapons[this.weaponSpec] : null;
    this.blade = typeof this.weaponSpec === 'object' ? this.weaponSpec : null;
    this.melee = !!this.blade || (this.weapon && this.weapon.kind === 'melee');
    this.abilities = this.abilityIds.map(function (id) { return { id: id, t: 0, cd: (Dd.abilities[id] || { cd: 10 }).cd }; });
    var cdK = this.has('quickCd') ? 0.8 : 1;
    this.abilities.forEach(function (a) { a.cd *= cdK; });
    this.heat = 0; this.overT = 0; this.fireT = 0; this.burstLeft = 0; this.bloom = 0;
    this.jetpack = !!(spec.jetpack || (this.isHero && spec.body && spec.body.jetpack && !spec.body.nojet) || o.allJet);
    this.jumpPack = !!spec.jumpPack;
    this.radius = this.isHero && spec.body && (spec.body.kind === 'wroshan' || spec.body.kind === 'darklord' || spec.body.kind === 'cyborg') ? 0.5 : 0.4;
    if (this.isHero && spec.body.kind === 'small') this.radius = 0.32;
    this.buildModel();
  };
  UP.has = function (card) { return this.cards.indexOf(card) >= 0; };

  UP.buildModel = function () {
    var g = G();
    if (this.rig) { g.scene.remove(this.rig.root); this.stopHum(); }
    var R;
    if (this.isHero) R = SF.Models.legend(this.spec, this.skin);
    else if (this.native) R = SF.Models.native(this.faction);
    else R = SF.Models.trooper(this.faction, this.classId, this.skin);
    SF.Models.arm(R, this.weaponSpec, D().factions[this.faction] ? D().factions[this.faction].pal[1] : 0x666666);
    this.rig = R;
    this.height = R.height;
    R.root.userData.unit = this;
    g.scene.add(R.root);
    R.root.visible = this.alive;
    this.origMats = null;
    if (this.blade) this.hum = SF.Audio.hum();
  };
  UP.stopHum = function () { if (this.hum) { this.hum.stop(); this.hum = null; } };

  UP.spawn = function (x, y, z, yaw) {
    this.pos.set(x, y, z); this.vel.set(0, 0, 0); this.yaw = yaw || 0; this.pitch = 0;
    this.hp = this.maxHp; this.alive = true; this.deadT = 0; this.buffs = {}; this.heat = 0; this.overT = 0;
    this.blockEnergy = 100; this.jetFuel = 100; this.streak = 0;
    this.abilities.forEach(function (a) { a.t = 0; });
    this.anim.deathT = 0; this.anim.knockT = 0; this.anim.swingT = -1; this.anim.emote = null;
    this.rig.root.visible = true; this.rig.root.rotation.set(0, yaw || 0, 0); this.rig.body.position.set(0, 0, 0); this.rig.body.rotation.set(0, 0, 0);
    this.setCloak(false);
    this.regenT = 99; this.lastHitBy = null; this.onGround = true;
    this.spawnProt = 2.5;
    if (this.hum) this.hum.set(0.6);
  };
  UP.remove = function () { var g = G(); g.scene.remove(this.rig.root); this.stopHum(); };

  UP.forward = function (out) { return (out || new V3()).set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); };
  UP.aimDir = function (out) {
    var cp = Math.cos(this.pitch);
    return (out || new V3()).set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  };
  UP.eye = function (out) { return (out || new V3()).set(this.pos.x, this.pos.y + this.height * (this.input.crouch ? 0.62 : 0.9), this.pos.z); };
  UP.chest = function (out) { return (out || new V3()).set(this.pos.x, this.pos.y + this.height * (this.input.crouch ? 0.45 : 0.68), this.pos.z); };
  UP.muzzle = function (out) {
    var f = this.aimDir(tmp3);
    var rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    out = out || new V3();
    out.set(this.pos.x + f.x * 0.8 + rx * 0.22, this.pos.y + this.height * (this.input.crouch ? 0.55 : 0.76) + f.y * 0.8, this.pos.z + f.z * 0.8 + rz * 0.22);
    return out;
  };

  // ------------------------------------------------------------------ update
  UP.update = function (dt) {
    var g = G(), w = g.world;
    if (!this.alive) { this.animate(dt); return; }
    if (this.vehicle) { this.pos.copy(this.vehicle.seatPos()); this.tickTimers(dt); this.animate(dt); return; }
    var inp = this.input, b = this.buffs;
    this.tickTimers(dt);
    if (this.spawnProt > 0) this.spawnProt -= dt;

    var stunned = b.stun > 0 || b.lifted > 0 || this.anim.knockT > 0;
    // ---------------- movement
    var fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    var mf = stunned ? 0 : inp.fwd, ms = stunned ? 0 : inp.strafe;
    var ml = Math.hypot(mf, ms); if (ml > 1) { mf /= ml; ms /= ml; }
    var base = 4.8 * this.speedK;
    var sprint = inp.sprint && mf > 0.3 && !inp.aim && !inp.crouch && !this.blocking;
    var sp = base * (sprint ? 1.55 : inp.crouch ? 0.5 : inp.aim ? 0.72 : 1);
    if (b.cloakSpeed > 0) sp *= 1.3;
    if (b.fury > 0) sp *= 1.1;
    if (b.slow > 0) sp *= 0.55;
    if (this.melee && this.anim.swingT >= 0) sp *= 0.75;
    if (this.inWater) sp *= 0.55;
    var wantX = (fx * mf + rx * ms) * sp, wantZ = (fz * mf + rz * ms) * sp;
    var acc = this.onGround ? 40 : (this.jetpack || this.jumpPack ? 10 : 5);
    if (b.dashT > 0) { acc = 0; }
    var dvx = wantX - this.vel.x, dvz = wantZ - this.vel.z, dl = Math.hypot(dvx, dvz), mx = acc * dt;
    if (dl > mx) { dvx *= mx / dl; dvz *= mx / dl; }
    if (this.onGround || this.jetpack || this.jumpPack || ml > 0.01) { this.vel.x += dvx; this.vel.z += dvz; }
    this.sprinting = sprint && ml > 0.1;

    // jump / jetpack
    if (inp.jump && this.onGround && !stunned) {
      this.vel.y = this.isHero ? 8.2 : 7.0; this.onGround = false; inp.jump = this.jetpack;
    } else if (inp.jump && this.jetpack && !this.onGround && this.jetFuel > 0 && !stunned) {
      this.vel.y += 30 * dt; if (this.vel.y > 8) this.vel.y = 8;
      this.jetFuel -= 32 * dt; this.jetting = true;
    } else this.jetting = false;
    if (this.onGround && this.jetFuel < 100) this.jetFuel = Math.min(100, this.jetFuel + 25 * dt);
    else if (!this.jetting) this.jetFuel = Math.min(100, this.jetFuel + 6 * dt);

    var grav = GRAV;
    if (b.hover > 0) { grav = 0; this.vel.y *= 0.9; }
    if (b.lifted > 0) { grav = 0; this.vel.set(0, (this.liftY - this.pos.y) * 3, 0); }
    if (!this.onGround) this.vel.y -= grav * dt;
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt; this.pos.y += this.vel.y * dt;

    // world collision
    var half = w.half * 0.985;
    if (this.pos.x > half) this.pos.x = half; if (this.pos.x < -half) this.pos.x = -half;
    if (this.pos.z > half) this.pos.z = half; if (this.pos.z < -half) this.pos.z = -half;
    if (w.collide(this.pos, this.radius, this.height * (inp.crouch ? 0.7 : 1))) { /* slide */ }
    var gy = w.groundAt(this.pos.x, this.pos.z, this.pos.y);
    this.inWater = false;
    if (w.water != null && gy < w.water - 1.3) { gy = w.water - 1.3; this.inWater = true; }
    else if (w.water != null && gy < w.water - 0.5) this.inWater = true;
    if (this.pos.y <= gy) {
      if (!this.onGround && this.vel.y < -14) this.damage((-this.vel.y - 14) * 9, null, 'fall');
      if (!this.onGround) { this.anim.land = 0.15; if (this.leapLand) { this.leapLand(); this.leapLand = null; } }
      this.pos.y = gy; this.vel.y = Math.max(0, this.vel.y); this.onGround = true;
    } else if (this.pos.y > gy + 0.25 && this.onGround) {
      // stepping down small ledges keeps contact; otherwise fall
      if (this.pos.y - gy < 0.6 && this.vel.y <= 0) this.pos.y = gy; else this.onGround = false;
    }
    if (this.onGround) { var fr = Math.min(1, (stunned ? 8 : 0) * dt); this.vel.x *= 1 - fr; this.vel.z *= 1 - fr; }
    if (this.pos.y < w.killY) { this.damage(9999, this.lastHitBy, 'fall'); return; }
    if (w.lava != null && this.pos.y < w.lava + 0.3) this.damage(80 * dt, this.lastHitBy, 'fire');

    // regen
    this.regenT += dt;
    if (!this.isHero && this.hp < this.maxHp && this.regenT > (this.has('fastRegen') ? 3 : 5)) this.hp = Math.min(this.maxHp, this.hp + 26 * dt);

    // ---------------- weapons
    this.blocking = false;
    if (!stunned && !b.channel) {
      if (this.melee) this.updateMelee(dt);
      else this.updateGun(dt);
      for (var i = 0; i < this.abilities.length; i++) if (inp.ab[i]) { inp.ab[i] = false; this.useAbility(i); }
    }
    if (b.channel) this.updateChannel(dt);
    // flames
    if (b.flaming > 0) SF.Abilities.flameTick(this, dt);

    if (this.hum) {
      var dcam = g.camPos ? g.camPos.distanceTo(this.pos) : 0;
      var hatt = this.isPlayer ? 1 : Math.max(0, 1 - dcam / 25) * 0.6;
      this.hum.set((this.anim.swingT >= 0 ? 1.4 : 0.7) * hatt, this.anim.swingT >= 0 ? 1.3 : 1);
    }
    this.animate(dt);
  };

  UP.tickTimers = function (dt) {
    var b = this.buffs;
    for (var k in b) if (typeof b[k] === 'number' && b[k] > 0) { b[k] -= dt; if (b[k] <= 0) { b[k] = 0; if (k === 'cloak') this.setCloak(false); } }
    for (var i = 0; i < this.abilities.length; i++) if (this.abilities[i].t > 0) this.abilities[i].t -= dt;
    if (this.anim.knockT > 0) this.anim.knockT -= dt;
    if (b.dashT > 0) { this.vel.x = this.dashV.x; this.vel.z = this.dashV.z; if (this.dashHit) this.dashHit(); }
  };

  UP.updateGun = function (dt) {
    var w = this.weapon, inp = this.input, b = this.buffs;
    var cool = w.cool * (this.has('quickCool') ? 1.3 : 1) * (this.isHero ? 1.4 : 1);
    if (this.overT > 0) { this.overT -= dt; this.heat = Math.max(0, this.heat - cool * 1.4 * dt); if (this.overT <= 0) this.heat = Math.min(this.heat, 30); }
    else if (this.fireT < -0.2) this.heat = Math.max(0, this.heat - cool * dt);
    this.fireT -= dt;
    this.bloom = Math.max(0, this.bloom - dt * 3);
    if (inp.vent && this.heat > 15 && this.overT <= 0) { this.overT = 0.7; inp.vent = false; if (this.isPlayer) SF.Audio.overheat(); }
    var firing = inp.fire || this.burstLeft > 0 || b.dualFire > 0;
    if (firing && this.fireT <= 0 && this.overT <= 0) {
      var interval = 60 / w.rpm;
      if (b.dualFire > 0) interval = 0.07;
      this.fireShot();
      this.fireT = interval;
      if (w.burst) { if (this.burstLeft > 0) this.burstLeft--; else this.burstLeft = w.burst - 1; if (this.burstLeft === 0) this.fireT = interval * 2.5; }
      if (!(b.overcharge > 0) && !(b.dualFire > 0)) this.heat += w.heat * (this.isHero ? 0.7 : 1);
      if (this.heat >= 100) { this.heat = 100; this.overT = this.isHero ? 1.4 : 2.2; this.burstLeft = 0; if (this.isPlayer) SF.Audio.overheat(); }
    }
  };
  UP.fireShot = function () {
    var w = this.weapon, b = this.buffs, g = G();
    var origin = this.muzzle(new V3());
    var dir;
    if (this.isPlayer && g.aimPoint) dir = tmp.subVectors(g.aimPoint, origin).normalize();
    else if (this.aimTarget) dir = tmp.subVectors(this.aimTarget, origin).normalize();
    else dir = this.aimDir(tmp);
    var spread = w.spread * (this.input.aim ? 0.45 : 1) * (Math.hypot(this.vel.x, this.vel.z) > 2 ? 1.35 : 1) * (this.input.crouch ? 0.75 : 1) * (this.has('marksman') ? 0.65 : 1) + this.bloom;
    if (b.sharpshot > 0) spread = 0;
    if (!this.isPlayer) spread += (this.aiSpread || 0);
    var dmgK = (this.has('heavyHitter') ? 1.08 : 1) * (b.rallied > 0 ? 1.2 : 1) * (b.sharpshot > 0 ? 2 : 1) * (b.fury > 0 ? 1.3 : 1);
    var pellets = w.pellets || 1;
    for (var p = 0; p < pellets; p++) {
      var d = dir.clone();
      var s = spread * Math.PI / 180;
      if (s > 0) { d.x += (Math.random() - 0.5) * 2 * s; d.y += (Math.random() - 0.5) * 2 * s; d.z += (Math.random() - 0.5) * 2 * s; d.normalize(); }
      if (w.kind === 'flamer') { SF.Combat.flameCone(this, origin, d, w.range, w.dmg * dmgK, 0.35); break; }
      SF.Combat.fire(this, origin, d, w, { dmgK: dmgK, explosive: b.explosiveShots > 0 });
    }
    if (b.sharpshot > 0) { this.sharpLeft = (this.sharpLeft || 5) - 1; if (this.sharpLeft <= 0) { b.sharpshot = 0; this.sharpLeft = 5; } }
    if (b.explosiveShots > 0) { this.expLeft = (this.expLeft == null ? 3 : this.expLeft) - 1; if (this.expLeft <= 0) { b.explosiveShots = 0; this.expLeft = 3; } }
    this.bloom = Math.min(3, this.bloom + w.spread * 0.18);
    this.anim.recoil = 1;
    if (this.cloaked()) this.setCloak(false), this.buffs.cloak = 0;
    SF.FX.muzzle(origin, w.kind === 'flamer' ? 0xff8a20 : this.boltColor());
    SF.Audio.shot(w.kind, origin, this.isHero ? 0.9 : 1);
    if (this.isPlayer) g.camKick = (g.camKick || 0) + (w.kind === 'sniper' || w.kind === 'launcher' ? 1 : 0.25);
  };
  UP.boltColor = function () {
    var F = D().factions[this.faction];
    if (this.weapon && this.weapon.disintegrate) return 0x9ad8ff;
    return F ? F.bolt : 0xff3322;
  };

  // ---------------- melee (blades / spear)
  UP.updateMelee = function (dt) {
    var inp = this.input, a = this.anim, b = this.buffs;
    var swingDur = (b.fury > 0 ? 0.27 : 0.36) / (this.spec.body && this.spec.body.kind === 'small' ? 1.15 : 1);
    this.blockEnergy = Math.min(100, this.blockEnergy + 22 * dt);
    if (inp.aim && a.swingT < 0 && this.blade && this.blockEnergy > 5) { this.blocking = true; }
    if (a.swingT >= 0) {
      a.swingT += dt / swingDur;
      if (a.swingT > 0.35 && a.swingT < 0.75 && !this.swingHitDone) { this.swingHitDone = true; SF.Combat.meleeSwing(this, this.heavySwing ? 180 : 75 * (b.fury > 0 ? 1.35 : 1), this.heavySwing ? 3.6 : (this.spec.body && this.spec.body.kind === 'small' ? 2.4 : 2.9), this.heavySwing ? -0.3 : 0.25); this.heavySwing = false; }
      if (a.swingT >= 1) { a.swingT = inp.fire ? 0 : -1; a.swingIdx = (a.swingIdx + 1) % 3; this.swingHitDone = false; if (a.swingT === 0) SF.Audio.swing(this.pos, 1 + a.swingIdx * 0.1); }
    } else if (inp.fire) {
      a.swingT = 0; this.swingHitDone = false; SF.Audio.swing(this.pos, 1 + a.swingIdx * 0.1);
      if (this.cloaked()) { this.setCloak(false); this.buffs.cloak = 0; }
    }
  };
  UP.updateChannel = function (dt) {
    var b = this.buffs;
    if (b.channel === 'lightning') SF.Abilities.lightningTick(this, dt);
    if (b.channelT != null) { b.channelT -= dt; if (b.channelT <= 0) { b.channel = null; b.channelT = null; } }
  };

  UP.useAbility = function (i) {
    var a = this.abilities[i];
    if (!a || a.t > 0 || !this.alive) return false;
    var fn = SF.Abilities[a.id];
    if (!fn) return false;
    var ok = fn(this);
    if (ok !== false) {
      a.t = a.cd;
      if (this.cloaked() && a.id !== 'cloak' && a.id !== 'cloakHero') { this.setCloak(false); this.buffs.cloak = 0; }
      return true;
    }
    return false;
  };

  UP.cloaked = function () { return this.buffs.cloak > 0; };
  UP.setCloak = function (on) {
    var R = this.rig;
    if (!R) return;
    if (on && !this._cloakOn) {
      this._cloakOn = true;
      R.root.traverse(function (o) { if (o.isMesh) { o.userData.m0 = o.material; o.material = SF.Models.cloakMat; o.castShadow = false; } });
    } else if (!on && this._cloakOn) {
      this._cloakOn = false;
      R.root.traverse(function (o) { if (o.isMesh && o.userData.m0) { o.material = o.userData.m0; o.castShadow = true; } });
    }
  };

  // ------------------------------------------------------------------ damage
  UP.damage = function (amt, src, kind, hitPos) {
    if (!this.alive || amt <= 0) return 0;
    var b = this.buffs, g = G();
    if (this.spawnProt > 0 && kind !== 'fall') return 0;
    if (b.invuln > 0 && kind !== 'fall') { if (hitPos) SF.FX.sparks(hitPos, 0x8ad8ff, 4); return 0; }
    if (src && src.team === this.team && src !== this && kind !== 'fall') return 0;
    if (b.shielded > 0) amt *= 0.5;
    if (b.marked > 0) amt *= 1.25;
    if (kind === 'explosive' && this.has('blastRes')) amt *= 0.65;
    if (src && src.has && src.has('heroBane') && this.isHero) amt *= 1.25;
    if (this.isHero && g.mode && g.mode.heroDamageK) amt *= g.mode.heroDamageK;
    if (this.isPlayer && g.settings && g.difficultyK) amt *= g.difficultyK.taken;
    this.hp -= amt;
    this.regenT = 0;
    if (src && src !== this) this.lastHitBy = src;
    this.anim.hitT = 0.18;
    if (hitPos && kind !== 'fire') SF.FX.blood(hitPos, this.faction === 'syndicate' || (this.spec.body && (this.spec.body.kind === 'cyborg' || this.spec.body.kind === 'shadowunit')));
    if (src && src.isPlayer && src !== this) { g.hitMarker = 0.15; SF.Audio.hit(); }
    if (this.isPlayer) { g.dmgFlash = Math.min(1, (g.dmgFlash || 0) + amt / 80); if (src && src.pos) g.dmgFrom = src.pos.clone(); }
    if (this.ai) this.ai.onHurt(src);
    if (this.hp <= 0) { this.hp = 0; this.die(src, kind); }
    return amt;
  };
  UP.heal = function (amt) { if (!this.alive) return; this.hp = Math.min(this.maxHp, this.hp + amt); };
  UP.die = function (src, kind) {
    if (!this.alive) return;
    var g = G();
    this.alive = false; this.deadT = 0; this.anim.deathT = 0.0001; this.anim.swingT = -1;
    this.buffs = {}; this.setCloak(false);
    this.deaths++; this.streak = 0;
    this.deathKind = kind;
    this.deathDir = src && src.pos ? Math.atan2(this.pos.x - src.pos.x, this.pos.z - src.pos.z) : Math.random() * 6;
    if (this.vehicle) { this.vehicle.ejectDriver(true); }
    if (this.hum) this.hum.set(0);
    if (this.weapon && this.weapon.disintegrate && src && src.weapon === this.weapon) this.disintegrated = true;
    var killer = src && src !== this ? src : this.lastHitBy;
    g.onKill(this, killer, kind);
  };

  // ------------------------------------------------------------------ animation
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  // blade swing keyframes: [rUA.x, rUA.z, rEl.x, spine.y, lUA.x]
  var SWINGS = [
    [[2.7, -0.9, 0.7, -0.7, 0.4], [0.5, 0.7, 0.9, 0.7, 0.3]],
    [[1.4, 1.1, 0.8, 0.8, 0.3], [1.5, -1.0, 0.5, -0.8, 0.5]],
    [[3.1, -0.2, 0.6, 0.0, 0.8], [0.6, 0.1, 0.7, 0.1, 0.2]]
  ];
  UP.animate = function (dt) {
    var R = this.rig, a = this.anim, inp = this.input;
    if (!R) return;
    var g = G();
    R.root.position.copy(this.pos);
    // LOD by camera distance
    if (g.camPos) {
      var dc = g.camPos.distanceToSquared(this.pos);
      SF.Models.setDetail(R, dc < 70 * 70);
      R.root.visible = (this.alive || a.deathT < 6) && dc < 450 * 450 && !(this.isPlayer && g.firstPerson && !this.vehicle) && !(this.vehicle && this.vehicle.hideDriver);
      if (dc > 160 * 160 && this.alive && (g.frame + this.id) % 3) return; // cheaper far animation
    }
    var t = g.time;
    // death
    if (!this.alive) {
      a.deathT += dt;
      var k = Math.min(1, a.deathT / 0.7);
      if (this.disintegrated) { R.root.scale.setScalar(Math.max(0.01, 1 - a.deathT * 1.5)); if (Math.random() < 0.5) SF.FX.add.emit(this.pos.x, this.pos.y + 1, this.pos.z, 0, 2, 0, 0x9ad8ff, 0.4, 0.3, 0, 0, 0); return; }
      R.root.rotation.set(0, this.deathDir + Math.PI, 0);
      R.body.rotation.x = -ease(k) * Math.PI / 2 * 0.98;
      R.body.position.y = ease(k) * 0.18;
      R.lUA.rotation.set(-k * 2.4, 0, -k * 0.6); R.rUA.rotation.set(-k * 2.2, 0, k * 0.6);
      R.lEl.rotation.x = 0.4 * k; R.rEl.rotation.x = 0.3 * k;
      R.lThigh.rotation.x = 0.3 * k; R.rThigh.rotation.x = -0.1 * k; R.lKnee.rotation.x = -0.6 * k; R.rKnee.rotation.x = -0.2 * k;
      R.spine.rotation.set(0, 0, 0); R.chest.rotation.set(0, 0, 0); R.hips.rotation.set(0, 0, 0);
      if (R.cape) R.cape.rotation.x = 0.1;
      return;
    }
    R.root.scale.setScalar(1);
    R.root.rotation.set(0, this.yaw, 0);
    R.body.rotation.set(0, 0, 0); R.body.position.set(0, 0, 0);
    var hv = Math.hypot(this.vel.x, this.vel.z);
    var crouch = inp.crouch && this.onGround;
    a.ph += dt * (hv * 1.65 / Math.max(0.6, R.s)) * (this.sprinting ? 1.05 : 1);
    var ph = a.ph;
    var amp = Math.min(1, hv / 5) * (this.sprinting ? 1.25 : 1);
    // local movement direction relative to facing
    var mvA = hv > 0.5 ? Math.atan2(-(this.vel.x * Math.cos(this.yaw) - this.vel.z * Math.sin(this.yaw)), -(-this.vel.x * Math.sin(this.yaw) - this.vel.z * Math.cos(this.yaw))) : 0;
    var back = Math.abs(mvA) > Math.PI / 2;
    var hipYaw = 0;
    if (hv > 0.5) { hipYaw = back ? (mvA > 0 ? mvA - Math.PI : mvA + Math.PI) : mvA; hipYaw = Math.max(-0.9, Math.min(0.9, hipYaw)) * 0.8; }
    var dirSign = back ? -1 : 1;

    // ---- legs
    var lT, rT, lK, rK;
    if (!this.onGround && !this.vehicle) {
      lT = this.jetting ? 0.15 : 0.6; rT = this.jetting ? 0.1 : -0.25; lK = this.jetting ? -0.25 : -0.9; rK = this.jetting ? -0.2 : -0.4;
    } else if (this.vehicle) {
      var pose = this.vehicle.riderPose || 'sit';
      lT = rT = pose === 'stand' ? 0.05 : 1.45; lK = rK = pose === 'stand' ? -0.05 : -1.5;
      if (pose === 'bike') { lT = rT = 1.1; lK = rK = -1.9; }
    } else {
      var s1 = Math.sin(ph) * dirSign, s2 = Math.sin(ph + Math.PI) * dirSign;
      lT = s1 * 0.75 * amp; rT = s2 * 0.75 * amp;
      lK = -(Math.max(0, Math.sin(ph + 1.4)) * 1.1 + 0.05) * amp; rK = -(Math.max(0, Math.sin(ph + Math.PI + 1.4)) * 1.1 + 0.05) * amp;
      if (crouch) { lT += 1.25; rT += 0.55; lK += -1.9; rK += -0.9; }
    }
    R.lThigh.rotation.set(lT, 0, 0); R.rThigh.rotation.set(rT, 0, 0);
    R.lKnee.rotation.x = lK; R.rKnee.rotation.x = rK;
    R.lFoot.rotation.x = -(lT + lK) * 0.5; R.rFoot.rotation.x = -(rT + rK) * 0.5;
    var bob = this.onGround ? Math.abs(Math.sin(ph)) * 0.06 * amp : 0;
    var hy = R.hipsY + bob - (crouch ? 0.42 * R.s : 0) - (a.land > 0 ? a.land * 0.8 : 0);
    if (this.vehicle) hy = R.hipsY * (this.vehicle.riderPose === 'stand' ? 1 : 0.55);
    R.hips.position.y = hy;
    if (a.land > 0) a.land -= dt;
    R.hips.rotation.set(0, hipYaw, 0);
    R.spine.rotation.set((crouch ? 0.35 : 0) + (this.sprinting ? 0.18 : 0), -hipYaw, 0);
    R.chest.rotation.set(0, 0, Math.sin(ph) * 0.05 * amp);
    R.neck.rotation.set(0, 0, 0);
    R.head.rotation.set(-this.pitch * 0.5, 0, 0);

    // ---- arms
    var pitch = this.pitch;
    var lUA = R.lUA.rotation, rUA = R.rUA.rotation, lEl = R.lEl.rotation, rEl = R.rEl.rotation;
    lUA.set(0, 0, 0); rUA.set(0, 0, 0); lEl.set(0, 0, 0); rEl.set(0, 0, 0);
    var b = this.buffs;
    a.recoil = Math.max(0, a.recoil - dt * 9);
    if (b.lifted > 0) {
      // choked: dangling, clawing at throat
      lUA.set(2.4, 0, 0.2); rUA.set(2.4, 0, -0.2); lEl.x = 1.6; rEl.x = 1.6;
      R.lThigh.rotation.x = Math.sin(t * 9) * 0.3; R.rThigh.rotation.x = Math.sin(t * 9 + 2) * 0.3;
      R.lKnee.rotation.x = -0.3; R.rKnee.rotation.x = -0.3;
    } else if (a.knockT > 0) {
      var kk = Math.min(1, a.knockT / 0.9);
      R.body.rotation.x = -Math.sin(kk * Math.PI) * 1.2;
      lUA.set(1.5, 0, -0.6); rUA.set(1.5, 0, 0.6);
    } else if (a.emote && !this.vehicle) {
      this.animEmote(R, a, t, dt);
    } else if (this.melee) {
      this.animBlade(R, a, t, pitch, amp, ph);
    } else if (a.throwT > 0) {
      a.throwT -= dt;
      var tk = 1 - a.throwT / 0.35;
      rUA.set(lerp(2.9, 0.9, ease(Math.min(1, tk))), 0, -0.2); rEl.x = lerp(0.9, 0.1, tk);
      lUA.set(1.2, 0, 0.3); lEl.x = 0.4;
    } else if (a.castT > 0) {
      a.castT -= dt;
      lUA.set(1.55 + pitch, 0, 0.15); lEl.x = 0.05;
      if (a.castKind === 'both') { rUA.set(1.55 + pitch, 0, -0.15); rEl.x = 0.05; }
      else { rUA.set(0.2, 0, -0.1); rEl.x = 0.5; }
    } else if (this.vehicle && this.vehicle.riderPose !== 'stand') {
      lUA.set(1.0, 0, 0.3); rUA.set(1.0, 0, -0.3); lEl.x = 0.6; rEl.x = 0.6;
    } else {
      var wk = R.weaponKind;
      var oneHand = wk === 'pistol' || wk === 'hpistol';
      var twin = !!R.gun2;
      if (this.sprinting && !inp.fire) {
        if (oneHand || twin) {
          lUA.x = -Math.sin(ph) * 0.9; rUA.x = Math.sin(ph) * 0.9; lEl.x = 1.1; rEl.x = 1.1;
        } else { rUA.set(0.55, 0, -0.35); rEl.x = 1.35; lUA.set(0.9, 0, 0.55); lEl.x = 1.25; R.chest.rotation.y = 0.3; }
      } else {
        var rec = a.recoil * 0.12;
        if (oneHand || twin) {
          rUA.set(1.5 + pitch - rec, 0, -0.08); rEl.x = 0.05;
          if (twin) { lUA.set(1.5 + pitch - rec * 0.5, 0, 0.08); lEl.x = 0.05; }
          else { lUA.set(1.25 + pitch, 0, 0.55); lEl.x = 0.35; }
        } else if (wk === 'launcher') {
          rUA.set(0.6 + pitch, 0, -0.45); rEl.x = 0.6; lUA.set(1.2 + pitch, 0, 0.55); lEl.x = 0.6;
          R.rHand.children.forEach(function (c) { c.rotation.y = 0; });
        } else {
          rUA.set(1.08 + pitch - rec, 0, -0.18); rEl.x = 0.5 + rec * 0.5;
          lUA.set(1.25 + pitch - rec, 0, 0.6); lEl.x = 0.55;
        }
        R.chest.rotation.x = pitch * 0.25;
      }
    }
    // hit flinch
    if (a.hitT > 0) { a.hitT -= dt; R.chest.rotation.x -= a.hitT * 1.2; }
    // jetpack flames
    if (this.jetting && R.jetNozzles) {
      R.chest.updateMatrixWorld();
      for (var i = 0; i < R.jetNozzles.length; i++) { tmp2.copy(R.jetNozzles[i]).applyMatrix4(R.chest.matrixWorld); SF.FX.jet(tmp2); }
      SF.Audio.jet(this.pos);
    }
    if (R.cape) R.cape.rotation.x = 0.08 + Math.min(0.9, hv * 0.09) + Math.sin(t * 3 + this.id) * 0.04 + (!this.onGround ? 0.4 : 0);
    if (R.wings) { var fl = !this.onGround ? Math.sin(t * 40) * 0.6 : 0.1; R.wings[0].rotation.y = 0.3 + fl; R.wings[1].rotation.y = -0.3 - fl; }
    // second pair of arms mirrors blade swing with an offset
    if (R.lUA2) {
      var sw = a.swingT >= 0 ? Math.sin(a.swingT * Math.PI) : 0;
      R.lUA2.rotation.set(0.9 + sw * 1.2 + Math.sin(t * 2) * 0.1, 0, 0.5 + sw * 0.6); R.lEl2.rotation.x = 0.8;
      R.rUA2.rotation.set(0.9 + sw * 1.4 + Math.sin(t * 2 + 1) * 0.1, 0, -0.5 - sw * 0.6); R.rEl2.rotation.x = 0.8;
    }
  };
  UP.animBlade = function (R, a, t, pitch, amp, ph) {
    var lUA = R.lUA.rotation, rUA = R.rUA.rotation, lEl = R.lEl.rotation, rEl = R.rEl.rotation;
    if (this.weapon && this.weapon.kind === 'melee') {
      // spear: held forward two-handed, thrust on swing
      var th = a.swingT >= 0 ? Math.sin(a.swingT * Math.PI) : 0;
      rUA.set(1.0 + th * 0.6, 0, -0.2); rEl.x = 0.9 - th * 0.8; lUA.set(1.1 + th * 0.5, 0, 0.5); lEl.x = 0.8 - th * 0.6;
      return;
    }
    if (a.swingT >= 0) {
      var sw = SWINGS[a.swingIdx];
      var k = ease(Math.min(1, a.swingT * 1.15));
      rUA.set(lerp(sw[0][0], sw[1][0], k), 0, lerp(sw[0][1], sw[1][1], k));
      rEl.x = lerp(sw[0][2], sw[1][2], k);
      R.spine.rotation.y += lerp(sw[0][3], sw[1][3], k);
      if (this.blade.style === 'dual' || this.blade.style === 'quad') { lUA.set(lerp(sw[1][0], sw[0][0], k), 0, -lerp(sw[1][1], sw[0][1], k)); lEl.x = 0.7; }
      else if (this.blade.style === 'double') { lUA.set(lerp(sw[0][0], sw[1][0], k) * 0.8, 0, lerp(sw[0][1], sw[1][1], k) * 0.6 + 0.4); lEl.x = 0.8; }
      else { lUA.set(sw[0][4] + 0.4, 0, 0.3); lEl.x = 0.6; }
      // blade trail sparks at the tip for flair
      if (this.rig.bladeObjs[0] && G().camPos && G().camPos.distanceToSquared(this.pos) < 900) {
        var bo = this.rig.bladeObjs[0].blades[0];
        bo.updateMatrixWorld(); tmp2.set(0, 0.4, 0).applyMatrix4(bo.matrixWorld);
        SF.FX.add.emit(tmp2.x, tmp2.y, tmp2.z, 0, 0, 0, this.blade.blade, 0.22, 0.12, 0, 0, -0.6);
      }
    } else if (this.blocking) {
      rUA.set(1.2, 0, 0.45); rEl.x = 1.25; lUA.set(1.0, 0, 0.5); lEl.x = 1.1;
      if (this.blade.style === 'dual') { lUA.set(1.3, 0, -0.2); lEl.x = 1.2; }
    } else if (this.sprinting) {
      rUA.set(-0.5, 0, -0.3); rEl.x = 0.3; lUA.x = -Math.sin(ph) * 0.9; lEl.x = 0.8;
      if (this.blade.style === 'dual') { lUA.set(-0.5, 0, 0.3); lEl.x = 0.3; }
    } else {
      // guard stance with slow idle sway
      var s = Math.sin(t * 1.6 + this.id) * 0.05;
      rUA.set(0.75 + s, 0, -0.25); rEl.x = 0.95; lUA.set(0.6 - s, 0, 0.45); lEl.x = 0.9;
      if (this.blade.style === 'dual') { lUA.set(0.75 + s, 0, 0.25); lEl.x = 0.95; }
      if (a.castT > 0) { a.castT -= G().dt; lUA.set(1.55 + pitch, 0, 0.1); lEl.x = 0.05; if (a.castKind === 'both') { rUA.set(1.55 + pitch, 0, -0.1); rEl.x = 0.05; } }
      if (a.throwT > 0) { a.throwT -= G().dt; var tk = 1 - a.throwT / 0.35; rUA.set(lerp(2.6, 1.2, tk), 0, -0.5); rEl.x = 0.2; }
    }
  };
  UP.animEmote = function (R, a, t, dt) {
    a.emoteT += dt;
    var lUA = R.lUA.rotation, rUA = R.rUA.rotation, lEl = R.lEl.rotation, rEl = R.rEl.rotation;
    var e = a.emote, s = Math.sin(a.emoteT * 8);
    if (e === 'wave') { rUA.set(0, 0, -2.6 + s * 0.3); rEl.z = 0; rEl.x = 0.3 + s * 0.4; }
    else if (e === 'salute') { rUA.set(1.8, 0, -0.9); rEl.x = 2.2; }
    else if (e === 'cheer') { lUA.set(0, 0, 2.7 + s * 0.2); rUA.set(0, 0, -2.7 - s * 0.2); R.body.position.y = Math.abs(s) * 0.25; }
    else if (e === 'dance') { lUA.set(0.5 + s, 0, 1.2); rUA.set(0.5 - s, 0, -1.2); lEl.x = 1.2; rEl.x = 1.2; R.hips.rotation.y = s * 0.4; R.lThigh.rotation.x = Math.max(0, s) * 0.8; R.rThigh.rotation.x = Math.max(0, -s) * 0.8; R.body.position.y = Math.abs(s) * 0.12; }
    else if (e === 'sit') { R.hips.position.y = R.hipsY * 0.45; R.lThigh.rotation.x = 1.5; R.rThigh.rotation.x = 1.5; R.lKnee.rotation.x = -1.5; R.rKnee.rotation.x = -1.5; lUA.set(0.3, 0, 0.2); rUA.set(0.3, 0, -0.2); }
    else if (e === 'pushup') { R.body.rotation.x = -1.45; R.body.position.y = 0.3 + Math.abs(s) * 0.15; lUA.set(1.5, 0, 0); rUA.set(1.5, 0, 0); lEl.x = Math.abs(s); rEl.x = Math.abs(s); }
    else if (e === 'taunt') { rUA.set(1.4, 0, -0.2); rEl.x = 1.2 + Math.max(0, s) * 0.8; lUA.set(0.2, 0, 0.6); }
    else if (e === 'flex') { lUA.set(0, 0, 1.6); rUA.set(0, 0, -1.6); lEl.x = 2.2 + s * 0.1; rEl.x = 2.2 - s * 0.1; }
    else if (e === 'spinblade') { rUA.set(1.2, 0, -0.3); rEl.x = 0.6; R.rHand.rotation.y = a.emoteT * 14; }
    else if (e === 'kneel') { R.hips.position.y = R.hipsY * 0.6; R.lThigh.rotation.x = 1.5; R.lKnee.rotation.x = -1.5; R.rThigh.rotation.x = -0.2; R.rKnee.rotation.x = -1.8; R.spine.rotation.x = 0.3; }
    else if (e === 'clap') { lUA.set(1.4, 0, 0.4); rUA.set(1.4, 0, -0.4); lEl.x = 0.6; rEl.x = 0.6; lUA.z = 0.4 - Math.max(0, s) * 0.3; rUA.z = -0.4 + Math.max(0, s) * 0.3; }
    else if (e === 'shrug') { lUA.set(0.3, 0, 0.8 + Math.max(0, s) * 0.2); rUA.set(0.3, 0, -0.8 - Math.max(0, s) * 0.2); lEl.x = 1.8; rEl.x = 1.8; }
    if (a.emoteT > 3.5 || this.input.fwd || this.input.strafe || this.input.fire) { a.emote = null; R.rHand.rotation.y = 0; }
  };
})();
