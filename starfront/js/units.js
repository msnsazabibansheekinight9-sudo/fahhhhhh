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
    if (o.mods !== undefined) this.mods = o.mods;
    if (o.look !== undefined) this.look = o.look;
    if (this.weapon && this.mods && !this.isHero) this.weapon = SF.Custom.applyMods(this.weapon, this.mods);
    if (!this.look && !this.isHero && !this.native && !this.isPlayer) this.look = SF.Custom.randomLook(this.faction, this.classId);
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
    else R = SF.Models.trooper(this.faction, this.classId, this.skin, this.look);
    SF.Models.arm(R, this.weaponSpec, D().factions[this.faction] ? D().factions[this.faction].pal[1] : 0x666666, this.isHero ? null : this.mods);
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
    this.anim.deathT = 0; this.anim.knockT = 0; this.anim.swingT = -1; this.anim.emote = null; this.anim.dv = null; this.anim.blendInit = false; this.rig.root.scale.setScalar(1);
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
    if (this.anim.deflectT > 0) this.anim.deflectT -= dt;
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
    if (this.weapon && this.weapon.boltColor) return this.weapon.boltColor;
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
      if (a.swingT >= 1) { a.swingT = inp.fire ? 0 : -1; a.swingIdx = (a.swingIdx + 1) % 4; this.swingHitDone = false; if (a.swingT === 0) SF.Audio.swing(this.pos, 1 + a.swingIdx * 0.1); }
    } else if (inp.fire) {
      a.swingT = 0; this.swingHitDone = false; SF.Audio.swing(this.pos, 1 + a.swingIdx * 0.1);
      if (this.onGround) { var lf2 = this.forward(tmp3); this.vel.x += lf2.x * 2.5; this.vel.z += lf2.z * 2.5; }
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
    this.anim.hitT = 0.22;
    if (src && src.pos) this.anim.hitDir = Math.atan2(src.pos.x - this.pos.x, src.pos.z - this.pos.z) - Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw));
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
    this.alive = false; this.deadT = 0; this.anim.deathT = 0.0001; this.anim.swingT = -1; this.anim.dv = null;
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
  // Saber combo keyframes per swing: [windup, strike-end]. Each: [rUA.x, rUA.z, rEl.x, spine.y, chest.x, lThigh.x, rThigh.x]
  var COMBO = [
    [[2.6, -1.0, 0.9, -0.85, -0.15, 0.1, -0.1], [0.35, 0.85, 0.7, 0.75, 0.25, 0.55, -0.35]],   // high right → low left diagonal
    [[1.3, 1.25, 0.9, 0.95, 0.0, -0.1, 0.3], [1.45, -1.15, 0.35, -0.9, 0.1, 0.45, -0.3]],      // backhand horizontal
    [[3.15, -0.15, 1.3, 0.1, -0.35, 0.0, 0.0], [0.45, 0.05, 0.35, 0.05, 0.45, 0.75, -0.45]],   // overhead chop
    [[0.5, -0.6, 1.5, -0.5, 0.1, 0.0, 0.2], [1.7, 0.2, 0.05, 0.3, 0.15, 0.85, -0.55]]          // rising thrust
  ];
  var BLEND_BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'lUA', 'rUA', 'lEl', 'rEl', 'lThigh', 'rThigh', 'lKnee', 'rKnee', 'lFoot', 'rFoot', 'body'];
  function savePose(R) {
    for (var i = 0; i < BLEND_BONES.length; i++) {
      var b = R[BLEND_BONES[i]]; if (!b) continue;
      var p = b.userData.p || (b.userData.p = [b.rotation.x, b.rotation.y, b.rotation.z, b.position.y]);
      p[0] = b.rotation.x; p[1] = b.rotation.y; p[2] = b.rotation.z; p[3] = b.position.y;
    }
  }
  function blendPose(R, k, kArms) {
    for (var i = 0; i < BLEND_BONES.length; i++) {
      var b = R[BLEND_BONES[i]]; if (!b || !b.userData.p) continue;
      var p = b.userData.p, kk = i >= 5 && i <= 8 ? kArms : k;
      b.rotation.x = p[0] + (b.rotation.x - p[0]) * kk;
      b.rotation.y = p[1] + (b.rotation.y - p[1]) * kk;
      b.rotation.z = p[2] + (b.rotation.z - p[2]) * kk;
      if (i === 0 || i === 15) b.position.y = p[3] + (b.position.y - p[3]) * k;
    }
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  UP.animate = function (dt) {
    var R = this.rig, a = this.anim, inp = this.input;
    if (!R) return;
    var g = G();
    R.root.position.copy(this.pos);
    var dc = 0;
    if (g.camPos) {
      dc = g.camPos.distanceToSquared(this.pos);
      SF.Models.setDetail(R, dc < 70 * 70);
      R.root.visible = (this.alive || a.deathT < 7) && dc < 450 * 450 && !(this.isPlayer && g.firstPerson && !this.vehicle) && !(this.vehicle && this.vehicle.hideDriver);
      if (dc > 160 * 160 && this.alive && (g.frame + this.id) % 3) return;
    }
    var t = g.time;
    if (!this.alive) { this.animDeath(R, a, dt); return; }
    R.root.scale.setScalar(1);
    savePose(R);
    R.root.rotation.set(0, this.yaw, 0);
    R.body.rotation.set(0, 0, 0); R.body.position.set(0, 0, 0);
    var hv = Math.hypot(this.vel.x, this.vel.z);
    var crouch = inp.crouch && this.onGround;
    var run = Math.min(1, Math.max(0, (hv - 3) / 4));       // 0 walk … 1 run
    a.ph += dt * (hv * (1.75 - run * 0.35) / Math.max(0.6, R.s));
    var ph = a.ph;
    var amp = Math.min(1, hv / 4.5) * (1 + run * 0.25 + (this.sprinting ? 0.15 : 0));
    // local move direction
    var cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    var lf = -this.vel.x * sy - this.vel.z * cy, ls = this.vel.x * cy - this.vel.z * sy;   // forward / right speeds
    var mvA = hv > 0.5 ? Math.atan2(-ls, lf) : 0;
    var back = lf < -0.5 && Math.abs(lf) > Math.abs(ls) * 0.6;
    var hipYaw = 0;
    if (hv > 0.5) { hipYaw = back ? (mvA > 0 ? mvA - Math.PI : mvA + Math.PI) : mvA; hipYaw = Math.max(-0.85, Math.min(0.85, hipYaw)) * 0.85; }
    var dirSign = back ? -1 : 1;
    // turn & acceleration lean
    var yawRate = SF.angDiff(this.yaw, a.lastYaw == null ? this.yaw : a.lastYaw) / Math.max(dt, 1e-3); a.lastYaw = this.yaw;
    a.turn = (a.turn || 0) + (Math.max(-3, Math.min(3, yawRate)) - (a.turn || 0)) * Math.min(1, dt * 6);
    var acc = (lf - (a.lastLf || 0)) / Math.max(dt, 1e-3); a.lastLf = lf;
    a.accLean = (a.accLean || 0) + (Math.max(-12, Math.min(12, acc)) - (a.accLean || 0)) * Math.min(1, dt * 5);
    a.exert = Math.min(1, Math.max(0, (a.exert || 0) + (this.sprinting ? dt * 0.25 : -dt * 0.12)));

    // ---------------- legs
    var lT, rT, lK, rK, lF = 0, rF = 0;
    var bladeStance = this.melee && !this.vehicle && hv < 1.5;
    if (!this.onGround && !this.vehicle) {
      var rising = this.vel.y > 0;
      lT = this.jetting ? 0.15 : rising ? 0.95 : 0.35; rT = this.jetting ? 0.05 : rising ? -0.15 : 0.1;
      lK = this.jetting ? -0.3 : rising ? -1.3 : -0.55; rK = this.jetting ? -0.25 : rising ? -0.6 : -0.45;
    } else if (this.vehicle) {
      var pose = this.vehicle.riderPose || 'sit';
      lT = rT = pose === 'stand' ? 0.05 : 1.45; lK = rK = pose === 'stand' ? -0.05 : -1.5;
      if (pose === 'bike') { lT = rT = 1.1; lK = rK = -1.9; }
    } else {
      // gait: contact → passing → toe-off shaped curves; knees flex on the recovery swing
      var s1 = Math.sin(ph) * dirSign, s2 = -s1;
      var swingK = 0.75 + run * 0.35;
      lT = s1 * swingK * amp; rT = s2 * swingK * amp;
      var fl1 = Math.max(0, Math.sin(ph + 1.35)), fl2 = Math.max(0, Math.sin(ph + Math.PI + 1.35));
      lK = -(fl1 * (0.9 + run * 0.9) + 0.06) * amp; rK = -(fl2 * (0.9 + run * 0.9) + 0.06) * amp;
      lF = -lT * 0.45 - lK * 0.55 + Math.max(0, -Math.cos(ph)) * 0.3 * amp; rF = -rT * 0.45 - rK * 0.55 + Math.max(0, Math.cos(ph)) * 0.3 * amp;
      if (crouch) { lT += 1.3; rT += 0.6; lK += -2.0; rK += -1.05; }
      else if (hv < 0.4) { lK = rK = -0.08; lT = 0.05; rT = -0.05; }
    }
    R.lThigh.rotation.set(lT, 0, bladeStance ? 0.14 : 0.03); R.rThigh.rotation.set(rT, 0, bladeStance ? -0.14 : -0.03);
    R.lKnee.rotation.set(lK, 0, 0); R.rKnee.rotation.set(rK, 0, 0);
    R.lFoot.rotation.set(lF || -(lT + lK) * 0.5, 0, 0); R.rFoot.rotation.set(rF || -(rT + rK) * 0.5, 0, 0);
    var bob = this.onGround ? (Math.abs(Math.cos(ph)) - 0.4) * (0.05 + run * 0.06) * amp : 0;
    var hy = R.hipsY + bob - (crouch ? 0.42 * R.s : 0) - (a.land > 0 ? a.land * 1.2 : 0) - (bladeStance ? 0.06 : 0) - (this.onGround && hv < 0.4 && !this.melee ? 0.015 : 0);
    // foot placement on uneven ground (near camera only)
    if (this.onGround && !this.vehicle && dc < 40 * 40 && hv < 6 && !g.noIK) {
      var w = g.world, side = 0.1 * R.s;
      var gl = w.groundAt(this.pos.x - cy * side, this.pos.z + sy * side, this.pos.y + 0.6) - this.pos.y;
      var gr = w.groundAt(this.pos.x + cy * side, this.pos.z - sy * side, this.pos.y + 0.6) - this.pos.y;
      gl = Math.max(-0.45, Math.min(0.45, gl)); gr = Math.max(-0.45, Math.min(0.45, gr));
      var low = Math.min(gl, gr);
      hy += low;
      var lu = gl - low, ru = gr - low;
      R.lThigh.rotation.x += lu * 1.6; R.lKnee.rotation.x -= lu * 3.2; R.lFoot.rotation.x += lu * 1.6;
      R.rThigh.rotation.x += ru * 1.6; R.rKnee.rotation.x -= ru * 3.2; R.rFoot.rotation.x += ru * 1.6;
    }
    if (this.vehicle) hy = R.hipsY * (this.vehicle.riderPose === 'stand' ? 1 : 0.55);
    R.hips.position.y = hy;
    if (a.land > 0) a.land -= dt;
    var idle = hv < 0.4 && this.onGround && !this.vehicle;
    R.hips.rotation.set(0, hipYaw, idle ? Math.sin(t * 0.7 + this.id) * 0.025 : Math.sin(ph) * 0.06 * amp);
    var lean = (crouch ? 0.35 : 0) + run * 0.12 + (this.sprinting ? 0.12 : 0) + Math.max(-0.15, Math.min(0.22, a.accLean * 0.015));
    R.spine.rotation.set(lean, -hipYaw * 0.9 + Math.sin(ph) * 0.07 * amp * (this.melee ? 1 : 0.5), -Math.max(-0.25, Math.min(0.25, a.turn * 0.05 * Math.min(1, hv / 3))));
    var breath = Math.sin(t * (1.6 + a.exert * 2.2) + this.id) * (0.015 + a.exert * 0.03);
    R.chest.rotation.set(breath, -Math.sin(ph) * 0.1 * amp * (this.melee ? 0.4 : 0.25), Math.sin(ph) * 0.04 * amp);
    R.neck.rotation.set(-lean * 0.5, 0, 0);
    R.head.rotation.set(-this.pitch * 0.45 - breath, Math.sin(t * 0.37 + this.id * 3) * (idle ? 0.12 : 0.03), 0);
    R.body.rotation.z = Math.max(-0.2, Math.min(0.2, -a.turn * 0.03 * Math.min(1, hv / 4)));

    // ---------------- arms
    var pitch = this.pitch;
    var lUA = R.lUA.rotation, rUA = R.rUA.rotation, lEl = R.lEl.rotation, rEl = R.rEl.rotation;
    lUA.set(0, 0, 0); rUA.set(0, 0, 0); lEl.set(0, 0, 0); rEl.set(0, 0, 0);
    var b = this.buffs;
    a.recoil = Math.max(0, a.recoil - dt * 10);
    var sway = Math.sin(t * 1.3 + this.id) * 0.02 + Math.sin(ph * 2) * 0.03 * amp;
    var fast = false;
    if (b.lifted > 0) {
      lUA.set(2.5 + Math.sin(t * 11) * 0.2, 0, 0.25); rUA.set(2.5 + Math.cos(t * 13) * 0.2, 0, -0.25); lEl.x = 1.7; rEl.x = 1.7;
      R.lThigh.rotation.x = Math.sin(t * 9) * 0.35; R.rThigh.rotation.x = Math.sin(t * 9 + 2) * 0.35;
      R.lKnee.rotation.x = -0.4 + Math.sin(t * 9) * 0.3; R.rKnee.rotation.x = -0.4; R.head.rotation.x = 0.4;
    } else if (a.knockT > 0) {
      var kk = Math.min(1, a.knockT / 1.0);
      R.body.rotation.x = -Math.sin(kk * Math.PI) * 1.3; R.body.position.y = Math.sin(kk * Math.PI) * 0.15;
      lUA.set(1.6, 0, -0.7); rUA.set(1.6, 0, 0.7); lEl.x = 0.5; rEl.x = 0.5;
      R.lThigh.rotation.x = 0.6 * kk; R.lKnee.rotation.x = -1.0 * kk;
    } else if (b.stun > 0) {
      lUA.set(0.6, 0, 0.5); rUA.set(0.6, 0, -0.5); lEl.x = 1.4; rEl.x = 1.4; R.head.rotation.z = Math.sin(t * 6) * 0.25; R.spine.rotation.x = 0.3;
    } else if (a.emote && !this.vehicle) {
      this.animEmote(R, a, t, dt);
    } else if (this.melee) {
      fast = this.animBlade(R, a, t, pitch, amp, ph, dt);
    } else if (a.throwT > 0) {
      a.throwT -= dt; fast = true;
      var tk = 1 - a.throwT / 0.35;
      rUA.set(tk < 0.35 ? lerp(1.2, 3.0, tk / 0.35) : lerp(3.0, 0.7, easeOut((tk - 0.35) / 0.65)), 0, -0.25); rEl.x = tk < 0.35 ? 1.2 : lerp(1.2, 0.05, (tk - 0.35) / 0.65);
      lUA.set(1.3, 0, 0.35); lEl.x = 0.5; R.spine.rotation.y += tk < 0.35 ? -0.4 : lerp(-0.4, 0.35, (tk - 0.35) / 0.65);
    } else if (a.castT > 0) {
      a.castT -= dt;
      lUA.set(1.55 + pitch, 0, 0.15); lEl.x = 0.05; R.spine.rotation.y += 0.25; R.lHand.rotation.x = -0.6;
      if (a.castKind === 'both') { rUA.set(1.55 + pitch, 0, -0.15); rEl.x = 0.05; R.spine.rotation.y -= 0.25; }
      else { rUA.set(0.3, 0, -0.15); rEl.x = 0.6; }
    } else if (this.vehicle && this.vehicle.riderPose !== 'stand') {
      lUA.set(1.0, 0, 0.3); rUA.set(1.0, 0, -0.3); lEl.x = 0.6; rEl.x = 0.6;
    } else {
      var wk = R.weaponKind;
      var oneHand = wk === 'pistol' || wk === 'hpistol';
      var twin = !!R.gun2;
      if (this.overT > 0 && !inp.fire && !twin) {
        // venting: weapon tipped up, off hand slaps the heat sink
        rUA.set(0.9, 0, -0.3); rEl.x = 1.3; lUA.set(1.1, 0, 0.6); lEl.x = 1.0 + Math.max(0, Math.sin(t * 14)) * 0.3;
        R.rHand.rotation.z = -0.6;
      } else if (this.sprinting && !inp.fire) {
        R.rHand.rotation.z = 0;
        if (oneHand || twin) { lUA.x = -Math.sin(ph) * 1.0; rUA.x = Math.sin(ph) * 1.0; lEl.x = 1.25; rEl.x = 1.25; lUA.z = 0.1; rUA.z = -0.1; }
        else { rUA.set(0.5 + Math.sin(ph) * 0.12, 0, -0.35); rEl.x = 1.45; lUA.set(0.95 - Math.sin(ph) * 0.12, 0, 0.6); lEl.x = 1.3; R.chest.rotation.y += 0.32; }
      } else {
        R.rHand.rotation.z = 0;
        var rec = a.recoil * (wk === 'sniper' || wk === 'launcher' || wk === 'shotgun' ? 0.3 : 0.12);
        if (a.recoil > 0.5) fast = true;
        if (oneHand || twin) {
          rUA.set(1.5 + pitch - rec + sway, 0, -0.08); rEl.x = 0.05 + rec;
          if (twin) { lUA.set(1.5 + pitch - rec * 0.6 - sway, 0, 0.08); lEl.x = 0.05 + rec * 0.5; }
          else { lUA.set(1.25 + pitch, 0, 0.55); lEl.x = 0.35; }
        } else if (wk === 'launcher') {
          rUA.set(0.6 + pitch, 0, -0.45); rEl.x = 0.6; lUA.set(1.2 + pitch, 0, 0.55); lEl.x = 0.6;
        } else {
          var aimK = inp.aim ? 1 : 0;
          rUA.set(1.08 + pitch - rec + sway, 0, -0.18 - aimK * 0.05); rEl.x = 0.5 + rec * 0.6 - aimK * 0.08;
          lUA.set(1.25 + pitch - rec + sway, 0, 0.6 + aimK * 0.05); lEl.x = 0.55;
          if (inp.aim) R.head.rotation.z = 0.12;
        }
        R.chest.rotation.x += pitch * 0.25 - rec * 0.3;
      }
    }
    // directional hit reaction
    if (a.hitT > 0) {
      a.hitT -= dt;
      var hk = a.hitT / 0.22, hd = a.hitDir || 0;
      R.chest.rotation.x -= Math.cos(hd) * hk * 0.35; R.chest.rotation.z += Math.sin(hd) * hk * 0.3; R.head.rotation.x -= hk * 0.3;
      fast = true;
    }
    // blend from the previous pose for smooth transitions
    var k = 1 - Math.exp(-dt * (this.vehicle ? 10 : 15)), kArms = fast ? 1 - Math.exp(-dt * 45) : 1 - Math.exp(-dt * 18);
    if (!a.blendInit) { a.blendInit = true; k = kArms = 1; }
    blendPose(R, k, kArms);
    // jetpack flames
    if (this.jetting && R.jetNozzles) {
      R.chest.updateMatrixWorld();
      for (var i = 0; i < R.jetNozzles.length; i++) { tmp2.copy(R.jetNozzles[i]).applyMatrix4(R.chest.matrixWorld); SF.FX.jet(tmp2); }
      SF.Audio.jet(this.pos);
    }
    // cloth & secondary motion
    if (R.cape) {
      a.capeV = a.capeV || 0; a.capeA = a.capeA == null ? 0.1 : a.capeA;
      var target = 0.08 + Math.min(1.0, hv * 0.1) + (!this.onGround ? 0.45 : 0) + Math.sin(t * 2.3 + this.id) * 0.04 + Math.max(0, -a.accLean * 0.02);
      a.capeV += (target - a.capeA) * 40 * dt; a.capeV *= Math.exp(-dt * 6); a.capeA += a.capeV * dt;
      R.cape.rotation.x = a.capeA; R.cape.rotation.z = -a.turn * 0.04;
    }
    if (R.wings) { var fl = !this.onGround ? Math.sin(t * 40) * 0.6 : 0.1; R.wings[0].rotation.y = 0.3 + fl; R.wings[1].rotation.y = -0.3 - fl; }
    if (R.lUA2) {
      var swv = a.swingT >= 0 ? Math.sin(a.swingT * Math.PI) : 0;
      R.lUA2.rotation.set(0.9 + swv * 1.3 + Math.sin(t * 2) * 0.1, 0, 0.5 + swv * 0.7); R.lEl2.rotation.x = 0.8 - swv * 0.4;
      R.rUA2.rotation.set(0.9 + swv * 1.5 + Math.sin(t * 2 + 1) * 0.1, 0, -0.5 - swv * 0.7); R.rEl2.rotation.x = 0.8 - swv * 0.4;
    }
  };

  // physically tumbling deaths with several variants
  UP.animDeath = function (R, a, dt) {
    var g = G();
    if (a.deathT === 0.0001 || !a.dv) {
      var k = this.deathKind;
      var dirx = Math.sin(this.deathDir), dirz = Math.cos(this.deathDir);
      a.dv = { x: dirx * (k === 'explosive' ? 7 : 1.2) + this.vel.x * 0.5, y: k === 'explosive' ? 7 + Math.random() * 3 : (k === 'fall' ? 0 : 0.6), z: dirz * (k === 'explosive' ? 7 : 1.2) + this.vel.z * 0.5, off: new THREE.Vector3(), spin: (Math.random() - 0.5) * (k === 'explosive' ? 9 : 1.5), ground: false };
      a.variant = k === 'explosive' ? 4 : k === 'melee' && Math.random() < 0.5 ? 1 : (Math.random() * 4) | 0;
      a.flop = [Math.random(), Math.random(), Math.random(), Math.random()];
    }
    a.deathT += dt;
    if (this.disintegrated) { R.root.scale.setScalar(Math.max(0.01, 1 - a.deathT * 1.5)); if (Math.random() < 0.5) SF.FX.add.emit(this.pos.x, this.pos.y + 1, this.pos.z, 0, 2, 0, 0x9ad8ff, 0.4, 0.3, 0, 0, 0); return; }
    var d = a.dv;
    // ballistic slide of the body
    if (!d.ground) {
      d.y -= 20 * dt;
      d.off.x += d.x * dt; d.off.y += d.y * dt; d.off.z += d.z * dt;
      var gy = g.world.groundAt(this.pos.x + d.off.x, this.pos.z + d.off.z, this.pos.y + d.off.y + 1) - this.pos.y;
      if (d.off.y <= gy && d.y < 0) { d.off.y = gy; d.ground = true; if (a.deathT > 0.2 && g.camPos && g.camPos.distanceTo(this.pos) < 30) SF.FX.dust(tmp2.copy(this.pos).add(d.off), 0x8a8070, 4); }
    } else { d.x *= Math.exp(-dt * 6); d.z *= Math.exp(-dt * 6); d.off.x += d.x * dt; d.off.z += d.z * dt; }
    R.root.position.set(this.pos.x + d.off.x, this.pos.y + d.off.y, this.pos.z + d.off.z);
    var t = Math.min(1, a.deathT / 0.75), e = t * t * (3 - 2 * t);
    var v = a.variant, f = a.flop;
    R.root.rotation.set(0, this.deathDir + Math.PI + (v === 2 ? e * 1.4 : 0) + (v === 4 ? a.deathT * d.spin * (d.ground ? 0 : 1) : 0), 0);
    R.hips.rotation.set(0, 0, 0); R.spine.rotation.set(0, 0, 0); R.chest.rotation.set(0, 0, 0); R.neck.rotation.set(0, 0, 0);
    R.head.rotation.set(0, 0, 0);
    var settle = Math.max(0, 1 - a.deathT * 1.5);
    var wob = function (i) { return Math.sin(a.deathT * (9 + f[i] * 5) + f[i] * 6) * 0.35 * settle; };
    if (v === 0 || v === 4) { // thrown backwards
      R.body.rotation.x = -e * 1.52; R.body.position.y = e * 0.16;
      R.lUA.rotation.set(-e * 2.5 + wob(0), 0, -e * 0.7); R.rUA.rotation.set(-e * 2.2 + wob(1), 0, e * 0.8);
      R.lEl.rotation.x = 0.5 * e; R.rEl.rotation.x = 0.3 * e;
      R.lThigh.rotation.set(0.35 * e + wob(2), 0, 0.15 * e); R.rThigh.rotation.set(-0.05 * e + wob(3), 0, -0.2 * e); R.lKnee.rotation.x = -0.7 * e; R.rKnee.rotation.x = -0.2 * e;
      R.head.rotation.x = -0.5 * e;
    } else if (v === 1) { // knees buckle, fall forward
      var k1 = Math.min(1, a.deathT / 0.45), k2 = Math.max(0, Math.min(1, (a.deathT - 0.4) / 0.5));
      R.hips.position.y = R.hipsY * (1 - k1 * 0.5);
      R.lThigh.rotation.x = 1.3 * k1 - 1.2 * k2; R.rThigh.rotation.x = 1.1 * k1 - 1.0 * k2; R.lKnee.rotation.x = -2.2 * k1 + 1.8 * k2; R.rKnee.rotation.x = -2.0 * k1 + 1.6 * k2;
      R.body.rotation.x = k2 * 1.45; R.body.position.y = k2 * 0.12;
      R.lUA.rotation.set(0.4 + k2 * 2.6 + wob(0), 0, 0.2); R.rUA.rotation.set(0.3 + k2 * 2.4 + wob(1), 0, -0.2); R.lEl.rotation.x = 0.3; R.rEl.rotation.x = 0.4;
      R.spine.rotation.x = 0.5 * k1; R.head.rotation.x = 0.4 * k1 - 0.8 * k2;
    } else if (v === 2) { // spin and fall sideways
      R.body.rotation.z = e * 1.5; R.body.position.y = e * 0.18;
      R.lUA.rotation.set(0.2 + wob(0), 0, -e * 2.2); R.rUA.rotation.set(0.6 + wob(1), 0, e * 0.6); R.lEl.rotation.x = 0.4; R.rEl.rotation.x = 1.0 * e;
      R.lThigh.rotation.set(0.5 * e + wob(2), 0, 0); R.rThigh.rotation.set(-0.2 * e, 0, 0); R.lKnee.rotation.x = -0.9 * e; R.rKnee.rotation.x = -0.3 * e;
      R.spine.rotation.z = 0.3 * e;
    } else { // clutch and collapse backward slowly
      var c1 = Math.min(1, a.deathT / 0.6), c2 = Math.max(0, Math.min(1, (a.deathT - 0.5) / 0.6));
      R.lUA.rotation.set(1.3 * (1 - c2) - 2.0 * c2, 0, 0.6); R.rUA.rotation.set(0.8 - 1.8 * c2 + wob(1), 0, -0.3); R.lEl.rotation.x = 1.8 * (1 - c2); R.rEl.rotation.x = 0.5;
      R.spine.rotation.x = 0.4 * c1 * (1 - c2); R.hips.position.y = R.hipsY * (1 - 0.3 * c1);
      R.lKnee.rotation.x = -0.9 * c1 * (1 - c2); R.rKnee.rotation.x = -0.7 * c1 * (1 - c2); R.lThigh.rotation.x = 0.5 * c1 * (1 - c2); R.rThigh.rotation.x = 0.4 * c1 * (1 - c2);
      R.body.rotation.x = -c2 * 1.5; R.body.position.y = c2 * 0.15;
    }
    if (R.cape) R.cape.rotation.x = 0.1 + settle * 0.5;
  };

  UP.animBlade = function (R, a, t, pitch, amp, ph, dt) {
    var lUA = R.lUA.rotation, rUA = R.rUA.rotation, lEl = R.lEl.rotation, rEl = R.rEl.rotation;
    if (this.weapon && this.weapon.kind === 'melee') {
      var th = a.swingT >= 0 ? (a.swingT < 0.35 ? -a.swingT / 0.35 * 0.4 : Math.sin((a.swingT - 0.35) / 0.65 * Math.PI)) : 0;
      rUA.set(1.0 + th * 0.6, 0, -0.2); rEl.x = 0.9 - th * 0.8; lUA.set(1.1 + th * 0.5, 0, 0.5); lEl.x = 0.8 - th * 0.6;
      R.spine.rotation.y += th * 0.4;
      return a.swingT >= 0;
    }
    var dual = this.blade.style === 'dual' || this.blade.style === 'quad', dbl = this.blade.style === 'double';
    if (a.swingT >= 0) {
      var sw = COMBO[a.swingIdx % COMBO.length];
      var st = a.swingT, P;
      // windup (0-0.3) → strike (0.3-0.62, fast) → follow-through hold
      if (st < 0.3) { var w = easeOut(st / 0.3); P = sw[0].map(function (x, i) { return x * w + GUARD[i] * (1 - w); }); }
      else { var s = easeOut(Math.min(1, (st - 0.3) / 0.32)); P = sw[0].map(function (x, i) { return x + (sw[1][i] - x) * s; }); }
      rUA.set(P[0], 0, P[1]); rEl.x = P[2];
      R.spine.rotation.y += P[3]; R.chest.rotation.x += P[4];
      R.lThigh.rotation.x += P[5] * 0.6; R.rThigh.rotation.x += P[6] * 0.6; R.lKnee.rotation.x -= Math.abs(P[5]) * 0.5; R.rKnee.rotation.x -= Math.abs(P[6]) * 0.6;
      R.hips.position.y -= 0.08 * Math.sin(Math.min(1, st) * Math.PI);
      if (dual) { lUA.set(P[0] * 0.85 + 0.2, 0, -P[1] * 0.8); lEl.x = P[2] * 0.9; }
      else if (dbl) { lUA.set(P[0] * 0.75, 0, P[1] * 0.5 + 0.45); lEl.x = 0.85; }
      else { lUA.set(0.5 + st * 0.3, 0, 0.45 + st * 0.2); lEl.x = 0.7; }
      // blade trail at the tip
      if (this.rig.bladeObjs[0] && G().camPos && G().camPos.distanceToSquared(this.pos) < 900 && st > 0.25 && st < 0.75) {
        var bo = this.rig.bladeObjs[0].blades[0];
        bo.updateMatrixWorld(); tmp2.set(0, 0.45, 0).applyMatrix4(bo.matrixWorld);
        SF.FX.add.emit(tmp2.x, tmp2.y, tmp2.z, 0, 0, 0, this.blade.blade, 0.32, 0.16, 0, 0, -0.5);
        tmp2.set(0, 0.05, 0).applyMatrix4(bo.matrixWorld);
        SF.FX.add.emit(tmp2.x, tmp2.y, tmp2.z, 0, 0, 0, this.blade.blade, 0.22, 0.12, 0, 0, -0.5);
      }
      return true;
    }
    if (this.blocking) {
      var jit = a.deflectT > 0 ? Math.sin(t * 60) * 0.15 : 0;
      rUA.set(1.25 + pitch * 0.5 + jit, 0, 0.5); rEl.x = 1.25; lUA.set(1.0, 0, 0.5); lEl.x = 1.1;
      R.spine.rotation.y += 0.25;
      if (dual) { lUA.set(1.3, 0, -0.25); lEl.x = 1.2; }
      return a.deflectT > 0;
    }
    if (this.sprinting) {
      rUA.set(-0.6 + Math.sin(ph) * 0.2, 0, -0.35); rEl.x = 0.35; lUA.x = -Math.sin(ph) * 1.0; lEl.x = 1.0;
      if (dual) { lUA.set(-0.6 - Math.sin(ph) * 0.2, 0, 0.35); lEl.x = 0.35; }
      return false;
    }
    var s2 = Math.sin(t * 1.6 + this.id) * 0.05;
    rUA.set(GUARD[0] + s2, 0, GUARD[1]); rEl.x = GUARD[2]; lUA.set(0.6 - s2, 0, 0.45); lEl.x = 0.9;
    R.spine.rotation.y += 0.2;
    if (dual) { lUA.set(0.75 + s2, 0, 0.25); lEl.x = 0.95; }
    if (a.castT > 0) { a.castT -= G().dt; lUA.set(1.55 + pitch, 0, 0.1); lEl.x = 0.05; R.lHand.rotation.x = -0.6; if (a.castKind === 'both') { rUA.set(1.55 + pitch, 0, -0.1); rEl.x = 0.05; } }
    if (a.throwT > 0) { a.throwT -= G().dt; var tk = 1 - a.throwT / 0.35; rUA.set(tk < 0.4 ? lerp(0.8, 2.7, tk / 0.4) : lerp(2.7, 1.1, (tk - 0.4) / 0.6), 0, -0.5); rEl.x = 0.2; return true; }
    return false;
  };
  var GUARD = [0.78, -0.28, 0.98, 0.2, 0, 0, 0];

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
