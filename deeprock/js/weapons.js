/* Rock & Stone — class loadouts, firing, reloading and the first-person
   viewmodel. Four dwarves, six slots each: primary, secondary, throwable,
   pickaxe, traversal tool and support tool. */
(function (RS) {
  'use strict';

  var DEG = Math.PI / 180;

  /* ------------------------------------------------------------- loadouts */
  function W(o) {
    o.magMax = o.mag; o.reserveMax = o.reserve || 0;
    o.cool = 0; o.reloading = 0; o.heat = 0; o.locked = 0;
    o.spin = 0; o.charge = 0;
    if (o.charges !== undefined) { o.chargeMax = o.charges; o.chargeTimer = 0; }
    return o;
  }

  var LOADOUTS = {
    scout: {
      name: 'Scout', colour: 0x3ad0e0,
      blurb: 'Fast, fragile, lights the cave and gets to the ore nobody else can reach.',
      weapons: [
        W({ id: 'gk2', name: 'Deepcore GK2', slot: 'primary', kind: 'hitscan', auto: true,
          dmg: 16, rof: 8.3, mag: 25, reserve: 350, reload: 1.9, spread: 0.013, range: 95,
          recoil: { v: 0.9, h: 0.5, kick: 0.035 }, sfx: 'gun_rifle', tracer: 0xffd27a,
          model: 'gun', spec: { len: 0.46, recH: 0.1, recW: 0.07, barLen: 0.3, mag: 'box', magLen: 0.19, stock: 2, sight: 'red', body: 0x3f4752, accent: 0x3ad0e0 } }),
        W({ id: 'boomstick', name: 'Jury-Rigged Boomstick', slot: 'secondary', kind: 'shotgun',
          dmg: 9, pellets: 8, rof: 1.7, mag: 2, reserve: 24, reload: 2.1, spread: 0.1, range: 26,
          recoil: { v: 4.5, h: 1.6, kick: 0.16 }, sfx: 'gun_shotgun', tracer: 0xffc060,
          altBoth: true,
          model: 'gun', spec: { len: 0.34, recH: 0.11, recW: 0.085, barLen: 0.36, barR: 0.027, barrels: 2, mag: 'none', stock: 1, sight: 'iron', body: 0x4a3a2c, accent: 0x8a6a3a, shroud: false } }),
        W({ id: 'cryo', name: 'Cryo Grenade', slot: 'throwable', kind: 'throw', proj: 'cryo',
          dmg: 20, radius: 5.2, mag: 4, reserve: 0, rof: 1.1, model: 'grenade', spec: 'cryo' }),
        W({ id: 'pick', name: 'Pickaxe', slot: 'pickaxe', kind: 'melee', auto: true, model: 'pickaxe' }),
        W({ id: 'grapple', name: 'Grappling Hook', slot: 'traversal', kind: 'grapple',
          cooldown: 5.0, range: 48, model: 'grapple' }),
        W({ id: 'flaregun', name: 'Flare Gun', slot: 'support', kind: 'flaregun',
          charges: 5, rechargeTime: 7.5, rof: 1.4, model: 'flaregun' })
      ]
    },
    gunner: {
      name: 'Gunner', colour: 0xe05a2a,
      blurb: 'Carries the heavy ordnance, the shield that saves the team and the zipline that saves the walk.',
      weapons: [
        W({ id: 'minigun', name: '"Lead Storm" Powered Minigun', slot: 'primary', kind: 'hitscan', auto: true,
          dmg: 10, rof: 30, mag: 600, reserve: 0, reload: 0, spread: 0.028, range: 85,
          spinUp: 0.75, heatRate: 0.17, coolRate: 0.3, overheatLock: 4.0,
          recoil: { v: 0.35, h: 0.35, kick: 0.012 }, sfx: 'gun_mini', tracer: 0xffb060, moveSlow: 0.45,
          model: 'gun', spec: { len: 0.4, recH: 0.17, recW: 0.14, barLen: 0.5, barR: 0.026, barrels: 6, mag: 'drum', stock: 0, sight: 'none', body: 0x4a4a52, accent: 0xe05a2a, shroud: false } }),
        W({ id: 'bulldog', name: '"Bulldog" Heavy Revolver', slot: 'secondary', kind: 'hitscan',
          dmg: 55, rof: 2.2, mag: 4, reserve: 24, reload: 2.6, spread: 0.008, range: 110,
          recoil: { v: 3.4, h: 1.0, kick: 0.11 }, sfx: 'gun_revolver', tracer: 0xffe0a0, weakBonus: 2.2,
          model: 'gun', spec: { len: 0.2, recH: 0.1, recW: 0.055, barLen: 0.26, barR: 0.022, mag: 'cyl', stock: 0, sight: 'iron', body: 0x55585f, accent: 0x8a5a2a, shroud: false } }),
        W({ id: 'frag', name: 'Sticky Grenade', slot: 'throwable', kind: 'throw', proj: 'frag',
          dmg: 130, radius: 5.6, mag: 4, reserve: 0, rof: 1.1, model: 'grenade', spec: 'frag' }),
        W({ id: 'pick', name: 'Pickaxe', slot: 'pickaxe', kind: 'melee', auto: true, model: 'pickaxe' }),
        W({ id: 'zipline', name: 'Zipline Launcher', slot: 'traversal', kind: 'zipline',
          charges: 3, rechargeTime: 0, range: 38, model: 'zipgun' }),
        W({ id: 'shield', name: 'Shield Generator', slot: 'support', kind: 'shield',
          charges: 3, rechargeTime: 0, duration: 14, radius: 5.2, model: 'shieldgen' })
      ]
    },
    engineer: {
      name: 'Engineer', colour: 0xe0b23a,
      blurb: 'Builds the floor under your feet and the turret behind your back.',
      weapons: [
        W({ id: 'warthog', name: '"Warthog" Auto 210', slot: 'primary', kind: 'shotgun',
          dmg: 7, pellets: 8, rof: 2.6, mag: 8, reserve: 90, reload: 2.4, spread: 0.075, range: 30,
          recoil: { v: 2.6, h: 1.0, kick: 0.1 }, sfx: 'gun_shotgun', tracer: 0xffc060,
          model: 'gun', spec: { len: 0.44, recH: 0.12, recW: 0.085, barLen: 0.34, barR: 0.028, mag: 'box', magLen: 0.12, stock: 1, sight: 'iron', body: 0x4a4038, accent: 0xe0b23a } }),
        W({ id: 'stubby', name: '"Stubby" Voltaic SMG', slot: 'secondary', kind: 'hitscan', auto: true,
          dmg: 11, rof: 11, mag: 30, reserve: 360, reload: 1.9, spread: 0.022, range: 70,
          recoil: { v: 0.7, h: 0.5, kick: 0.025 }, sfx: 'gun_smg', tracer: 0x9ad8ff,
          model: 'gun', spec: { len: 0.3, recH: 0.095, recW: 0.065, barLen: 0.16, mag: 'box', magLen: 0.22, stock: 2, sight: 'red', body: 0x3a4048, accent: 0x6ad0ff } }),
        W({ id: 'plasma', name: 'Plasma Burster', slot: 'throwable', kind: 'throw', proj: 'plasma',
          dmg: 60, radius: 4.0, mag: 4, reserve: 0, rof: 1.1, model: 'grenade', spec: 'plasma' }),
        W({ id: 'pick', name: 'Pickaxe', slot: 'pickaxe', kind: 'melee', auto: true, model: 'pickaxe' }),
        W({ id: 'platgun', name: 'Platform Gun', slot: 'traversal', kind: 'platform',
          charges: 14, rof: 1.5, range: 40, model: 'platgun' }),
        W({ id: 'sentry', name: 'LMG Gun Platform', slot: 'support', kind: 'sentry',
          charges: 2, model: 'sentry' })
      ]
    },
    driller: {
      name: 'Driller', colour: 0xd8d24a,
      blurb: 'Does not go around. Goes through. Brings fire.',
      weapons: [
        W({ id: 'crspr', name: 'CRSPR Flamethrower', slot: 'primary', kind: 'beam', auto: true,
          dmg: 9, rof: 12, mag: 50, reserve: 300, reload: 3.0, range: 11, burn: 5,
          recoil: { v: 0.1, h: 0.1, kick: 0.004 }, sfx: null,
          model: 'gun', spec: { len: 0.36, recH: 0.12, recW: 0.085, barLen: 0.3, barR: 0.03, mag: 'tank', stock: 1, sight: 'none', body: 0x4a4a3a, accent: 0xd8d24a, shroud: false } }),
        W({ id: 'subata', name: 'Subata 120', slot: 'secondary', kind: 'hitscan',
          dmg: 13, rof: 6, mag: 15, reserve: 150, reload: 1.6, spread: 0.014, range: 80,
          recoil: { v: 1.2, h: 0.6, kick: 0.05 }, sfx: 'gun_pistol', tracer: 0xffd27a,
          model: 'gun', spec: { len: 0.19, recH: 0.095, recW: 0.05, barLen: 0.1, mag: 'box', magLen: 0.15, stock: 0, sight: 'iron', body: 0x3a3f46, accent: 0xd8d24a, shroud: false } }),
        W({ id: 'axe', name: 'Impact Axe', slot: 'throwable', kind: 'throw', proj: 'axe',
          dmg: 130, radius: 0, mag: 6, reserve: 0, rof: 2.2, model: 'axe' }),
        W({ id: 'pick', name: 'Pickaxe', slot: 'pickaxe', kind: 'melee', auto: true, model: 'pickaxe' }),
        W({ id: 'drills', name: 'Reinforced Power Drills', slot: 'traversal', kind: 'drills',
          fuel: 100, fuelMax: 100, burnRate: 9, regen: 6, model: 'drills' }),
        W({ id: 'c4', name: 'C4 Satchel Charge', slot: 'support', kind: 'c4',
          charges: 2, dmg: 350, radius: 7.0, model: 'c4' })
      ]
    }
  };
  RS.LOADOUTS = LOADOUTS;
  RS.CLASS_IDS = ['driller', 'engineer', 'gunner', 'scout'];

  /* -------------------------------------------------------------- weapons */
  RS.Weapons = function (game, className) {
    this.g = game;
    this.classId = LOADOUTS[className] ? className : 'scout';
    var src = LOADOUTS[this.classId];
    this.className = src.name;
    this.colour = src.colour;
    // deep-ish copy so a mission never mutates the master loadout
    this.list = src.weapons.map(function (w) {
      var c = {};
      for (var k in w) c[k] = w[k];
      c.mag = w.magMax; c.reserve = w.reserveMax;
      c.cool = 0; c.reloading = 0; c.heat = 0; c.locked = 0; c.spin = 0;
      if (w.chargeMax !== undefined) { c.charges = w.chargeMax; c.chargeTimer = 0; }
      if (w.fuelMax !== undefined) c.fuel = w.fuelMax;
      return c;
    });
    this.idx = 0;
    this.prevIdx = 1;
    this.switchT = 0;
    this.fireHeld = 0;
    this.projectiles = [];
    this.laser = null; this.laserOn = false;
    this._v = new THREE.Vector3(); this._v2 = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this.recoilV = 0; this.recoilH = 0; this.kick = 0; this.kickVel = 0;
    this.buildViewmodel();
    this.buildProjectilePool();
  };
  var WP = RS.Weapons.prototype;

  WP.cur = function () { return this.list[this.idx]; };

  // -------------------------------------------------------------- viewmodel
  /* The viewmodel lives in its own scene, drawn in a second pass with a
     narrower field of view and a cleared depth buffer. That is how the gun
     stays a sane size at a wide world FOV and never clips into rock. */
  WP.buildViewmodel = function () {
    var g = this.g;
    this.vmScene = new THREE.Scene();
    this.vmCamera = new THREE.PerspectiveCamera(55, g.camera.aspect, 0.01, 14);
    this.vmScene.add(new THREE.AmbientLight(0x6a7488, 0.55));
    var key = new THREE.DirectionalLight(0xfff0d8, 1.05);
    key.position.set(-0.4, 0.9, 0.5);
    this.vmScene.add(key);
    var rim = new THREE.DirectionalLight(0x5a7ac0, 0.5);
    rim.position.set(0.7, -0.3, -0.6);
    this.vmScene.add(rim);
    this.vmKey = key;
    this.vm = new THREE.Group();
    this.vmScene.add(this.vm);
    this.vmInner = new THREE.Group();
    this.vm.add(this.vmInner);

    var mats = RS.makeMats();
    this.vmMat = mats.flat;
    this.vmMetal = mats.metal;
    this.vmGlow = mats.glow;

    this.models = [];
    for (var i = 0; i < this.list.length; i++) {
      var w = this.list[i];
      var grp = new THREE.Group();
      var geo, mesh;
      switch (w.model) {
        case 'gun': geo = RS.buildGun(w.spec); break;
        case 'pickaxe': geo = RS.buildPickaxe(); break;
        case 'grenade': geo = RS.buildGrenade(w.spec); break;
        case 'axe': geo = RS.buildAxe(); break;
        case 'grapple': geo = RS.buildGrapple(); break;
        case 'flaregun': geo = RS.buildFlareGun(); break;
        case 'zipgun': geo = RS.buildZipGun(); break;
        case 'platgun': geo = RS.buildPlatformGun(); break;
        case 'sentry': geo = RS.buildSentry(); break;
        case 'shieldgen': geo = RS.buildShieldProjector(); break;
        case 'c4': geo = RS.buildC4(); break;
        case 'drills': geo = RS.buildDrills(); break;
        default: geo = RS.buildGun({ len: 0.4 });
      }
      mesh = new THREE.Mesh(geo, this.vmMetal);
      mesh.frustumCulled = false;
      grp.add(mesh);
      grp.userData.main = mesh;

      // moving sub-parts
      if (w.id === 'drills') {
        grp.userData.bits = [];
        for (var b = 0; b < 2; b++) {
          var bit = new THREE.Mesh(RS.buildDrillBit(), this.vmMetal);
          bit.position.set(b ? 0.11 : -0.11, 0, -0.12);
          bit.frustumCulled = false;
          grp.add(bit);
          grp.userData.bits.push(bit);
        }
      }
      if (w.id === 'sentry') grp.userData.head = null;

      // muzzle marker in local space
      var muzzleZ = -(((w.spec && w.spec.len) || 0.4) + ((w.spec && w.spec.barLen) || 0.3) + 0.05);
      grp.userData.muzzle = new THREE.Vector3(0, (w.spec && w.spec.recH ? w.spec.recH * 0.06 : 0), muzzleZ);

      grp.visible = (i === 0);
      // held slightly right of centre, low, angled in
      grp.position.set(0.17, -0.16, -0.34);
      grp.rotation.set(0, 0.07, 0);
      this.vmInner.add(grp);
      this.models.push(grp);
    }

    // hands
    this.handR = new THREE.Mesh(RS.buildHand(false), this.vmMat);
    this.handL = new THREE.Mesh(RS.buildHand(true), this.vmMat);
    this.handR.frustumCulled = this.handL.frustumCulled = false;
    this.vmInner.add(this.handR); this.vmInner.add(this.handL);

    // laser pointer dot + beam
    var lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    this.laserLine = new THREE.Line(lgeo, new THREE.LineBasicMaterial({ color: 0x40ff70, transparent: true, opacity: 0.55 }));
    this.laserLine.frustumCulled = false;
    this.laserLine.visible = false;
    g.scene.add(this.laserLine);
    this.laserDot = new THREE.Mesh(RS.PRIM.sphereLo, new THREE.MeshBasicMaterial({ color: 0x60ff90 }));
    this.laserDot.scale.setScalar(0.12);
    this.laserDot.visible = false;
    g.scene.add(this.laserDot);
  };

  WP.buildProjectilePool = function () {
    var g = this.g;
    this.projPool = [];
    var geos = {
      frag: RS.buildGrenade('frag'), cryo: RS.buildGrenade('cryo'),
      plasma: RS.buildGrenade('plasma'), axe: RS.buildAxe(),
      blob: RS.PRIM.sphereLo, anchor: RS.PRIM.coneLo, flare: RS.buildFlare()
    };
    this.projGeos = geos;
    for (var i = 0; i < 18; i++) {
      var m = new THREE.Mesh(geos.frag, this.vmMetal);
      m.visible = false; m.frustumCulled = false;
      g.scene.add(m);
      this.projPool.push({ mesh: m, active: false });
    }
  };

  // ---------------------------------------------------------------- input
  WP.handleInput = function (input, g) {
    var w = this.cur();
    // slot keys
    var keys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];
    for (var i = 0; i < keys.length; i++) if (g.wasPressed(keys[i])) this.switchTo(i);
    if (input.wheel) {
      var dir = input.wheel > 0 ? 1 : -1;
      input.wheel = 0;
      this.switchTo((this.idx + dir + this.list.length) % this.list.length);
    }
    if (g.wasPressed('KeyR')) this.startReload();
    if (g.wasPressed('KeyQ')) this.laserOn = !this.laserOn;

    if (g.player.downed || g.player.dead) { this.fireHeld = 0; return; }
    // Carrying an objective takes both hands — the point of Point Extraction.
    if (g.player.carried) {
      this.fireHeld = 0;
      for (var m = 0; m < this.models.length; m++) this.models[m].visible = false;
      this.handR.visible = this.handL.visible = false;
      this.carryHidden = true;
      return;
    }
    if (this.carryHidden) {
      this.carryHidden = false;
      this.models[this.idx].visible = true;
      this.handR.visible = true;
    }

    // fire
    if (input.fire) {
      if (w.auto || this.fireHeld === 0) this.tryFire(false);
      this.fireHeld += g.dt;
    } else {
      if (this.fireHeld > 0 && w.kind === 'beam') g.audio.loop('flame', false);
      if (this.fireHeld > 0 && w.kind === 'drills') g.audio.loop('drill', false);
      this.fireHeld = 0;
      if (w.spinUp) w.spin = Math.max(0, w.spin - g.dt * 1.6);
    }
    if (input.alt && !this.altHeld) this.tryFire(true);
    this.altHeld = input.alt;
  };

  WP.switchTo = function (i) {
    if (i === this.idx || i < 0 || i >= this.list.length) return;
    var old = this.cur();
    if (old.kind === 'beam') this.g.audio.loop('flame', false);
    if (old.kind === 'drills') { this.g.audio.loop('drill', false); this.g.player.drilling = false; }
    if (old.spinUp) old.spin = 0;
    old.reloading = 0;
    this.prevIdx = this.idx;
    this.idx = i;
    this.switchT = 0.3;
    for (var k = 0; k < this.models.length; k++) this.models[k].visible = (k === i);
    this.g.audio.play('drop', null, 0.4);
    RS.bus.emit('weapon-switch', this.cur());
  };

  WP.startReload = function () {
    var w = this.cur();
    if (!w.reload || w.reloading > 0) return;
    if (w.mag >= w.magMax || w.reserve <= 0) return;
    w.reloading = w.reload;
    this.g.audio.play('drop', null, 0.5);
  };

  // ---------------------------------------------------------------- firing
  WP.tryFire = function (alt) {
    var g = this.g, w = this.cur(), p = g.player;
    if (this.switchT > 0.12) return;
    if (w.cool > 0 || w.reloading > 0 || w.locked > 0) return;

    switch (w.kind) {
      case 'melee': p.mine(alt); this.kickVel += alt ? 2.4 : 1.4; return;
      case 'hitscan': if (alt) return; this.fireHitscan(w); return;
      case 'shotgun': this.fireShotgun(w, alt && w.altBoth); return;
      case 'beam': if (alt) return; this.fireBeam(w); return;
      case 'throw': if (alt) return; this.fireThrow(w); return;
      case 'grapple': if (alt) return; this.fireGrapple(w); return;
      case 'flaregun': if (alt) return; this.fireFlareGun(w); return;
      case 'zipline': if (alt) return; this.fireZipline(w); return;
      case 'platform': if (alt) return; this.firePlatform(w); return;
      case 'sentry': if (alt) { g.gear.recallSentry(); } else this.placeSentry(w); return;
      case 'shield': if (alt) return; this.placeShield(w); return;
      case 'c4': if (alt) { g.gear.detonateC4(); } else this.placeC4(w); return;
      case 'drills': if (alt) return; this.useDrills(w); return;
    }
  };

  WP.ammoCheck = function (w) {
    if (w.mag !== undefined && w.magMax) {
      if (w.mag <= 0) {
        if (w.reserve > 0) this.startReload();
        else { this.g.audio.play('beep', null, 0.3); this.g.toast('Out of ammo — call a resupply (B)'); }
        return false;
      }
    }
    return true;
  };

  // Viewmodel space is camera space; push the muzzle out into the world so
  // tracers and muzzle flashes start where the barrel actually is.
  WP.muzzleWorld = function (out) {
    var grp = this.models[this.idx];
    out.copy(grp.userData.muzzle);
    this.vmInner.updateMatrixWorld();
    grp.localToWorld(out);
    this.g.camera.updateMatrixWorld();
    out.applyMatrix4(this.g.camera.matrixWorld);
    return out;
  };

  WP.aimDir = function (out, spread) {
    var p = this.g.player;
    p.forward(out);
    if (spread) {
      var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
      var right = this.g.player.rightVec(this._v2);
      out.x += right.x * Math.cos(a) * r; out.z += right.z * Math.cos(a) * r;
      out.y += Math.sin(a) * r;
      out.normalize();
    }
    return out;
  };

  WP.applyRecoil = function (w) {
    if (!w.recoil) return;
    var p = this.g.player;
    var rs = RS.perkRecoilScale(this.g);
    this.recoilV += w.recoil.v * DEG * (0.8 + Math.random() * 0.4) * rs;
    this.recoilH += (Math.random() - 0.5) * 2 * w.recoil.h * DEG * rs;
    this.kickVel += w.recoil.kick * 26;
    p.shake = Math.min(1, p.shake + w.recoil.kick * 0.6);
  };

  /* A single ray: bugs first (they have weak points), then rock. */
  WP.hitscanShot = function (w, dmgMul) {
    var g = this.g;
    var dir = this.aimDir(this._v, w.spread);
    var o = g.camera.position;
    var muzzle = this.muzzleWorld(this._v2);
    var range = w.range || 90;
    var eHit = g.enemies ? g.enemies.raycast(o.x, o.y, o.z, dir.x, dir.y, dir.z, range) : null;
    var tHit = g.terrain.raycast(o.x, o.y, o.z, dir.x, dir.y, dir.z, range);
    var tDist = tHit.hit ? tHit.dist : range;
    if (eHit && eHit.dist < tDist) {
      var dmg = w.dmg * (dmgMul || 1) * (eHit.weak ? (w.weakBonus || 2.0) : 1);
      g.enemies.damage(eHit.enemy, dmg, dir, eHit.weak, 'bullet');
      g.fx.tracer(muzzle.x, muzzle.y, muzzle.z, eHit.x, eHit.y, eHit.z, w.tracer || 0xffd27a);
      g.fx.blood(eHit.x, eHit.y, eHit.z, eHit.weak ? 9 : 5, eHit.enemy.def.blood);
      return;
    }
    if (tHit.hit) {
      g.fx.tracer(muzzle.x, muzzle.y, muzzle.z, tHit.x, tHit.y, tHit.z, w.tracer || 0xffd27a);
      g.fx.sparks(tHit, 3, 0xffd090);
      g.fx.rubble(tHit.x, tHit.y, tHit.z, tHit.mat, 2);
      // bullets chip the rock a little; a long burst actually opens a hole
      if (w.chipRock !== false && Math.random() < 0.5) {
        g.terrain.carveSphere(tHit.x, tHit.y, tHit.z, 0.34, 0.3, undefined, 0.3);
        g.collectOreIn(tHit.x, tHit.y, tHit.z, 0.9);
      }
    } else {
      g.fx.tracer(muzzle.x, muzzle.y, muzzle.z,
        o.x + dir.x * range, o.y + dir.y * range, o.z + dir.z * range, w.tracer || 0xffd27a);
    }
  };

  WP.fireHitscan = function (w) {
    var g = this.g;
    if (w.spinUp) {
      w.spin = Math.min(1, w.spin + g.dt / w.spinUp);
      if (w.spin < 0.999) { g.audio.loop('spin', true, 0.2, 0.6 + w.spin * 0.9); return; }
      g.audio.loop('spin', true, 0.14, 1.5);
    }
    if (!this.ammoCheck(w)) return;
    if (w.mag !== undefined) w.mag--;
    w.cool = 1 / w.rof;
    this.hitscanShot(w);
    this.applyRecoil(w);
    if (w.sfx) g.audio.play(w.sfx, null, 0.75, 0.95 + Math.random() * 0.1);
    this.muzzleFlash(w);
    if (w.heatRate) {
      w.heat += w.heatRate * (1 / w.rof) * w.rof * g.dt * 2.2;
      w.heat = Math.min(1.2, w.heat);
      if (w.heat >= 1) { w.locked = w.overheatLock; w.heat = 1; g.audio.play('hiss', null, 0.8); g.toast('Barrels overheated'); }
    }
  };

  WP.fireShotgun = function (w, both) {
    var g = this.g;
    if (!this.ammoCheck(w)) return;
    var shots = both && w.mag >= 2 ? 2 : 1;
    w.mag -= shots;
    w.cool = 1 / w.rof;
    for (var s = 0; s < shots; s++)
      for (var i = 0; i < w.pellets; i++) this.hitscanShot(w);
    this.applyRecoil(w);
    if (shots > 1) { this.recoilV *= 1.8; this.kickVel *= 1.7; }
    g.audio.play(w.sfx, null, 0.85 * shots, 0.95 + Math.random() * 0.1);
    this.muzzleFlash(w, 1.6);
  };

  /* Flamethrower: a cone of particles that sets whatever it touches alight. */
  WP.fireBeam = function (w) {
    var g = this.g;
    if (w.mag <= 0) { this.startReload(); g.audio.loop('flame', false); return; }
    w.mag -= g.dt * w.rof;
    if (w.mag < 0) w.mag = 0;
    w.cool = 0;
    g.audio.loop('flame', true, 0.3);
    var dir = this.aimDir(this._v, 0.03);
    var m = this.muzzleWorld(this._v2);
    var range = w.range;
    var tHit = g.terrain.raycast(m.x, m.y, m.z, dir.x, dir.y, dir.z, range);
    var reach = tHit.hit ? tHit.dist : range;
    for (var i = 0; i < 3; i++) {
      var sp = 11 + Math.random() * 6;
      g.fx.fire(m.x, m.y, m.z,
        dir.x * sp + (Math.random() - 0.5) * 3, dir.y * sp + (Math.random() - 0.5) * 3 + 0.6, dir.z * sp + (Math.random() - 0.5) * 3,
        0.3 + Math.random() * 0.3, Math.min(0.55, reach / 22));
    }
    if (g.frame % 2 === 0) g.fx.flash(m.x + dir.x * 2, m.y + dir.y * 2, m.z + dir.z * 2, 1.1, 0xff7a20, 0.09);
    if (g.enemies) {
      var hits = g.enemies.coneDamage(m, dir, reach, 0.42, w.dmg * g.dt * w.rof * 0.25, 'fire');
      for (var h = 0; h < hits.length; h++) g.enemies.ignite(hits[h], w.burn);
    }
  };

  WP.fireThrow = function (w) {
    var g = this.g;
    if (w.mag <= 0) { g.audio.play('beep', null, 0.3); return; }
    w.mag--; w.cool = 1 / w.rof;
    var dir = this.aimDir(this._v, 0.004);
    var m = this.muzzleWorld(this._v2);
    var spd = w.proj === 'axe' ? 40 : 22;
    this.spawnProjectile(w.proj, m, dir, spd, w);
    g.audio.play('drop', null, 0.5);
    this.kickVel += 1.0;
  };

  WP.fireGrapple = function (w) {
    var g = this.g, p = g.player;
    if (w.cool > 0) return;
    var dir = this.aimDir(this._v, 0);
    var o = g.camera.position;
    var hit = g.terrain.raycast(o.x, o.y, o.z, dir.x, dir.y, dir.z, w.range);
    if (!hit.hit) { g.audio.play('beep', null, 0.3); return; }
    p.grappleTarget = new THREE.Vector3(hit.x + hit.nx * 1.2, hit.y + hit.ny * 1.2, hit.z + hit.nz * 1.2);
    p.grappleT = 0;
    w.cool = w.cooldown;
    g.audio.play('grapple', null, 0.8);
    g.fx.tracer(o.x, o.y - 0.2, o.z, hit.x, hit.y, hit.z, 0x90ffc0);
  };

  WP.fireFlareGun = function (w) {
    var g = this.g;
    if (w.charges <= 0) { g.audio.play('beep', null, 0.3); return; }
    w.charges--; w.cool = 1 / w.rof;
    var dir = this.aimDir(this._v, 0);
    var m = this.muzzleWorld(this._v2);
    g.spawnFlare(m.x, m.y, m.z, dir.x * 34, dir.y * 34 + 2, dir.z * 34);
    g.audio.play('flare', null, 0.8);
    this.applyRecoil({ recoil: { v: 1.6, h: 0.4, kick: 0.06 } });
  };

  WP.fireZipline = function (w) {
    var g = this.g, p = g.player;
    if (w.charges <= 0) { g.audio.play('beep', null, 0.3); return; }
    var dir = this.aimDir(this._v, 0);
    var o = g.camera.position;
    var hit = g.terrain.raycast(o.x, o.y, o.z, dir.x, dir.y, dir.z, w.range);
    if (!hit.hit) { g.toast('No anchor point in range'); return; }
    var a = new THREE.Vector3(p.pos.x, p.pos.y + 1.6, p.pos.z);
    var b = new THREE.Vector3(hit.x + hit.nx * 0.6, hit.y + hit.ny * 0.6, hit.z + hit.nz * 0.6);
    if (a.distanceTo(b) < 4) { g.toast('Too close to anchor'); return; }
    w.charges--;
    g.gear.addZipline(a, b);
    g.audio.play('gun_zip', null, 0.8);
  };

  WP.firePlatform = function (w) {
    var g = this.g;
    if (w.charges <= 0) { g.audio.play('beep', null, 0.3); return; }
    var dir = this.aimDir(this._v, 0);
    var o = g.camera.position;
    var hit = g.terrain.raycast(o.x, o.y, o.z, dir.x, dir.y, dir.z, w.range);
    if (!hit.hit) { g.toast('Out of range'); return; }
    w.charges--; w.cool = 1 / w.rof;
    g.gear.addPlatform(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz);
    g.audio.play('gun_plat', null, 0.7);
    this.kickVel += 1.2;
  };

  WP.placeSentry = function (w) {
    var g = this.g;
    if (w.charges <= 0) { g.toast('No gun platforms left'); return; }
    var dir = this.aimDir(this._v, 0);
    var o = g.camera.position;
    var hit = g.terrain.raycast(o.x, o.y, o.z, dir.x, dir.y, dir.z, 7);
    if (!hit.hit || hit.ny < 0.55) { g.toast('Needs flat ground'); return; }
    w.charges--;
    g.gear.addSentry(hit.x, hit.y, hit.z);
    g.audio.play('platform', null, 0.7);
  };

  WP.placeShield = function (w) {
    var g = this.g;
    if (w.charges <= 0) { g.toast('No shields left'); return; }
    w.charges--;
    var p = g.player;
    g.gear.addShield(p.pos.x, p.pos.y + 0.3, p.pos.z, w.radius, w.duration);
    g.audio.play('platform', null, 0.8);
    g.toast('Shield deployed');
  };

  WP.placeC4 = function (w) {
    var g = this.g;
    if (w.charges <= 0) { g.toast('No charges left'); return; }
    var dir = this.aimDir(this._v, 0);
    var o = g.camera.position;
    var hit = g.terrain.raycast(o.x, o.y, o.z, dir.x, dir.y, dir.z, 6);
    var px, py, pz;
    if (hit.hit) { px = hit.x + hit.nx * 0.2; py = hit.y + hit.ny * 0.2; pz = hit.z + hit.nz * 0.2; }
    else { px = o.x + dir.x * 2.5; py = o.y + dir.y * 2.5 - 0.5; pz = o.z + dir.z * 2.5; }
    w.charges--;
    g.gear.addC4(px, py, pz, w.dmg, w.radius);
    g.audio.play('drop', null, 0.6);
    g.toast('C4 placed — right click to detonate');
  };

  /* Drills chew straight through rock, which is the Driller's whole point. */
  WP.useDrills = function (w) {
    var g = this.g, p = g.player;
    if (w.fuel <= 0.5) { g.audio.loop('drill', false); p.drilling = false; g.toast('Drills out of fuel'); return; }
    w.fuel -= w.burnRate * g.dt;
    p.drilling = true;
    g.audio.loop('drill', true, 0.3, 1);
    var dir = this.aimDir(this._v, 0);
    var o = g.camera.position;
    var reach = 2.6;
    var hit = g.terrain.raycast(o.x, o.y, o.z, dir.x, dir.y, dir.z, reach);
    if (hit.hit && hit.mat === RS.MAT.HARD) {
      g.fx.sparks(hit, 4, 0xffd090);
      return;
    }
    var tx = o.x + dir.x * reach, ty = o.y + dir.y * reach, tz = o.z + dir.z * reach;
    if (hit.hit) { tx = hit.x + dir.x * 0.6; ty = hit.y + dir.y * 0.6; tz = hit.z + dir.z * 0.6; }
    if (hit.hit || g.terrain.sample(tx, ty, tz) > -1.2) {
      g.terrain.carveSphere(tx, ty, tz, 1.55, 0.25, undefined, 0.45);
      g.collectOreIn(tx, ty, tz, 2.1);
      g.fx.rubble(tx, ty, tz, hit.hit ? hit.mat : RS.MAT.ROCK, 3);
      p.shake = Math.max(p.shake, 0.14);
    }
    // drills also shred anything standing in front of them
    if (g.enemies) g.enemies.coneDamage(o, dir, 3.2, 0.5, 150 * g.dt, 'drill');
  };

  WP.muzzleFlash = function (w, scale) {
    var m = this.muzzleWorld(this._v2);
    var g = this.g;
    g.fx.flash(m.x, m.y, m.z, 2.4 * (scale || 1), 0xffc070, 0.055);
    for (var i = 0; i < 3; i++) {
      g.fx.emit(m.x, m.y, m.z,
        (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3 + 1, (Math.random() - 0.5) * 3,
        0.1, 0.1 * (scale || 1), 0xffd890, 1, 0.3, 2);
    }
  };

  // ----------------------------------------------------------- projectiles
  WP.spawnProjectile = function (type, from, dir, speed, w) {
    var slot = null;
    for (var i = 0; i < this.projPool.length; i++) if (!this.projPool[i].active) { slot = this.projPool[i]; break; }
    if (!slot) { slot = this.projPool[0]; }
    slot.active = true;
    slot.type = type;
    slot.mesh.geometry = this.projGeos[type] || this.projGeos.frag;
    slot.mesh.visible = true;
    slot.mesh.position.copy(from);
    slot.pos = slot.pos || new THREE.Vector3();
    slot.vel = slot.vel || new THREE.Vector3();
    slot.pos.copy(from);
    slot.vel.copy(dir).multiplyScalar(speed);
    slot.vel.y += 2.2;
    slot.life = 0;
    slot.fuse = type === 'frag' ? 2.2 : (type === 'cryo' ? 1.6 : (type === 'plasma' ? 1.4 : 9));
    slot.dmg = w ? w.dmg : 80;
    slot.radius = w ? w.radius : 4;
    slot.bounces = type === 'plasma' ? 3 : (type === 'axe' ? 0 : 6);
    slot.spin = new THREE.Vector3(Math.random() * 10 - 5, Math.random() * 10 - 5, 14);
    this.projectiles.push(slot);
  };

  WP.updateProjectiles = function (dt) {
    var g = this.g, t = g.terrain;
    for (var i = this.projectiles.length - 1; i >= 0; i--) {
      var pr = this.projectiles[i];
      pr.life += dt;
      var steps = 2;
      var hitSomething = false;
      for (var s = 0; s < steps && !hitSomething; s++) {
        pr.vel.y -= 22 * dt / steps;
        pr.pos.addScaledVector(pr.vel, dt / steps);
        // direct hit on a bug
        if (g.enemies) {
          var e = g.enemies.sphereHit(pr.pos, pr.type === 'axe' ? 0.7 : 0.45);
          if (e) {
            if (pr.type === 'axe') {
              g.enemies.damage(e, pr.dmg, pr.vel, false, 'axe');
              g.fx.blood(pr.pos.x, pr.pos.y, pr.pos.z, 10, e.def.blood);
              this.detonate(pr, true);
            } else this.detonate(pr);
            hitSomething = true; break;
          }
        }
        if (t.sample(pr.pos.x, pr.pos.y, pr.pos.z) > 0) {
          if (pr.type === 'axe' || pr.bounces <= 0) { this.detonate(pr, pr.type === 'axe'); hitSomething = true; break; }
          var n = this._v;
          t.normalAt(pr.pos.x, pr.pos.y, pr.pos.z, n);
          pr.pos.addScaledVector(n, 0.3);
          pr.vel.reflect(n).multiplyScalar(0.42);
          pr.bounces--;
          g.audio.play('drop', pr.pos, 0.4);
          if (pr.type === 'plasma') { this.burst(pr); }
        }
      }
      if (hitSomething) { this.projectiles.splice(i, 1); continue; }
      pr.mesh.position.copy(pr.pos);
      pr.mesh.rotation.x += pr.spin.x * dt;
      pr.mesh.rotation.z += pr.spin.z * dt;
      if (pr.type === 'cryo') {
        g.fx.emit(pr.pos.x, pr.pos.y, pr.pos.z, 0, 0, 0, 0.3, 0.1, 0x8fe8ff, 3, -0.1, 2);
      } else if (pr.type === 'plasma') {
        g.fx.emit(pr.pos.x, pr.pos.y, pr.pos.z, 0, 0, 0, 0.25, 0.12, 0xc85ae0, 4, -0.1, 2);
      }
      if (pr.life > pr.fuse) { this.detonate(pr); this.projectiles.splice(i, 1); }
    }
  };

  WP.burst = function (pr) {
    var g = this.g;
    g.fx.explosion(pr.pos.x, pr.pos.y, pr.pos.z, 2.4, 0xc85ae0);
    g.audio.play('explode', pr.pos, 0.5);
    if (g.enemies) g.enemies.sphereDamage(pr.pos, pr.radius * 0.6, pr.dmg * 0.5, 'plasma');
  };

  WP.detonate = function (pr, noBlast) {
    var g = this.g;
    pr.active = false; pr.mesh.visible = false;
    if (noBlast) {
      g.fx.sparks({ x: pr.pos.x, y: pr.pos.y, z: pr.pos.z, nx: 0, ny: 1, nz: 0 }, 6, 0xd0d8e0);
      g.audio.play('clang', pr.pos, 0.6);
      return;
    }
    if (pr.type === 'cryo') {
      g.fx.explosion(pr.pos.x, pr.pos.y, pr.pos.z, pr.radius * 0.8, 0x8fe8ff);
      g.audio.play('ice', pr.pos, 0.9);
      if (g.enemies) {
        var hits = g.enemies.sphereDamage(pr.pos, pr.radius, pr.dmg, 'cryo');
        for (var i = 0; i < hits.length; i++) g.enemies.freeze(hits[i], 6);
      }
      for (i = 0; i < 24; i++) {
        g.fx.emit(pr.pos.x, pr.pos.y, pr.pos.z,
          (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14,
          0.6, 0.14, 0xaaf0ff, 3, 0.1, 1.6);
      }
      return;
    }
    g.fx.explosion(pr.pos.x, pr.pos.y, pr.pos.z, pr.radius, 0xffa040);
    g.audio.play('explode', pr.pos, 1.0);
    g.terrain.carveSphere(pr.pos.x, pr.pos.y, pr.pos.z, pr.radius * 0.5, 0.3, undefined, 0.8);
    g.collectOreIn(pr.pos.x, pr.pos.y, pr.pos.z, pr.radius * 0.6);
    if (g.enemies) g.enemies.sphereDamage(pr.pos, pr.radius, pr.dmg, 'explosion');
    var d = g.player.pos.distanceTo(pr.pos);
    if (d < pr.radius * 1.1) {
      g.player.hurt(pr.dmg * 0.22 * (1 - d / (pr.radius * 1.1)), 'friendly fire');
      g.player.shake = 1;
    }
  };

  // --------------------------------------------------------------- update
  WP.update = function (dt) {
    var g = this.g, p = g.player;
    var w = this.cur();
    for (var i = 0; i < this.list.length; i++) {
      var x = this.list[i];
      if (x.cool > 0) x.cool = Math.max(0, x.cool - dt);
      if (x.locked > 0) x.locked = Math.max(0, x.locked - dt);
      if (x.heat > 0 && (x !== w || !g.input.fire)) x.heat = Math.max(0, x.heat - (x.coolRate || 0.3) * dt);
      if (x.reloading > 0) {
        x.reloading -= dt;
        if (x.reloading <= 0) {
          x.reloading = 0;
          var need = x.magMax - x.mag;
          var take = Math.min(need, x.reserve);
          x.mag += take; x.reserve -= take;
          g.audio.play('clang', null, 0.3);
        }
      }
      if (x.chargeMax !== undefined && x.rechargeTime && x.charges < x.chargeMax) {
        x.chargeTimer += dt;
        if (x.chargeTimer >= x.rechargeTime) { x.chargeTimer = 0; x.charges++; }
      }
      if (x.fuelMax !== undefined && x !== w) x.fuel = Math.min(x.fuelMax, x.fuel + x.regen * dt);
      else if (x.fuelMax !== undefined && !g.input.fire) x.fuel = Math.min(x.fuelMax, x.fuel + x.regen * dt * 0.5);
    }
    if (w.kind !== 'drills' || !g.input.fire) p.drilling = false;
    if (w.spinUp && !g.input.fire) {
      w.spin = Math.max(0, w.spin - dt * 1.4);
      if (w.spin <= 0.01) g.audio.loop('spin', false);
    }

    this.updateProjectiles(dt);
    this.updateViewmodel(dt);
    this.updateLaser();

    // recoil decays back toward centre
    if (this.recoilV > 0 || this.recoilH !== 0) {
      p.pitch += this.recoilV * 0.55;
      p.yaw += this.recoilH * 0.55;
      p.pitch = RS.clamp(p.pitch, -1.52, 1.52);
      this.recoilV *= Math.max(0, 1 - dt * 14);
      this.recoilH *= Math.max(0, 1 - dt * 14);
      if (Math.abs(this.recoilV) < 1e-4) this.recoilV = 0;
      if (Math.abs(this.recoilH) < 1e-4) this.recoilH = 0;
    }
  };

  // How much the equipped weapon slows the dwarf (a spun-up minigun is heavy).
  WP.moveSlowFactor = function () {
    var w = this.cur();
    return (w.moveSlow && w.spin > 0.2) ? (1 - w.moveSlow * w.spin) : 1;
  };

  WP.updateViewmodel = function (dt) {
    var g = this.g, p = g.player, cam = g.camera;
    if (this.vmCamera.aspect !== cam.aspect) {
      this.vmCamera.aspect = cam.aspect;
      this.vmCamera.updateProjectionMatrix();
    }
    this.switchT = Math.max(0, this.switchT - dt);
    this.kick += (0 - this.kick) * Math.min(1, dt * 16);
    this.kick += this.kickVel * dt;
    this.kickVel *= Math.max(0, 1 - dt * 18);

    var w = this.cur();
    var grp = this.models[this.idx];
    var sw = this.switchT / 0.3;
    var bob = p.bobAmt;
    var t = g.time;

    // idle sway + walk bob + swap dip
    var bx = Math.cos(p.bobT) * 0.018 * bob + Math.sin(t * 0.9) * 0.004;
    var by = Math.abs(Math.sin(p.bobT)) * -0.016 * bob + Math.sin(t * 1.3) * 0.003;
    var dip = sw * sw * 0.3;

    // bring the weapon in close to the body when a wall is right in front,
    // the way you would shoulder it stepping through a tunnel
    var fwd = p.forward(this._v);
    var wallHit = g.terrain.raycast(cam.position.x, cam.position.y, cam.position.z, fwd.x, fwd.y, fwd.z, 1.1);
    var wallPull = wallHit.hit ? (1 - wallHit.dist / 1.1) : 0;

    grp.position.set(0.2 + bx, -0.2 + by - dip, -0.58 + this.kick * 0.1 + wallPull * 0.16);
    grp.rotation.set(-this.kick * 0.5 - wallPull * 0.5, 0.07, dip * 1.2 + wallPull * 0.25);

    // reload: tilt the weapon out of view and back
    if (w.reloading > 0 && w.reload) {
      var rt = 1 - Math.abs(w.reloading / w.reload - 0.5) * 2;
      grp.position.y -= rt * 0.16;
      grp.rotation.x -= rt * 0.9;
      grp.rotation.z += rt * 0.4;
    }
    // pickaxe swing
    if (w.kind === 'melee' && p.swingT > 0) {
      var st = p.swingT / 0.3;
      grp.rotation.x += Math.sin((1 - st) * Math.PI) * -1.5;
      grp.position.z -= (1 - st) * 0.2;
      grp.rotation.z += (1 - st) * 0.5;
    }
    // minigun barrels spin up
    if (w.spinUp && grp.userData.main) {
      grp.userData.main.rotation.z += w.spin * dt * 26;
    }
    // drill bits
    if (grp.userData.bits) {
      var on = (g.input.fire && w.fuel > 0.5) ? 1 : 0;
      for (var b = 0; b < grp.userData.bits.length; b++) {
        grp.userData.bits[b].rotation.z += dt * (6 + on * 40);
        grp.userData.bits[b].position.z = -0.12 - on * 0.04 * Math.sin(t * 40);
      }
    }

    // hands follow the weapon: one at the grip, one forward on the barrel
    var hb = grp.position;
    this.handR.position.set(hb.x - 0.015, hb.y - 0.075, hb.z + 0.085);
    this.handR.rotation.set(grp.rotation.x - 0.25, 0.1, grp.rotation.z);
    var fwdHold = w.model === 'gun' ? -((w.spec && w.spec.len) || 0.4) * 0.9 - 0.1 : -0.16;
    this.handL.position.set(hb.x - 0.13, hb.y - 0.055, hb.z + fwdHold);
    this.handL.rotation.set(grp.rotation.x - 0.1, -0.2, grp.rotation.z - 0.3);
    var twoHanded = (w.model === 'gun' && ((w.spec && w.spec.len) || 0) > 0.25) || w.model === 'drills' || w.model === 'pickaxe' || w.model === 'platgun' || w.model === 'zipgun';
    this.handL.visible = twoHanded;
    if (w.model === 'pickaxe') {
      this.handR.position.set(hb.x + 0.02, hb.y - 0.06, hb.z + 0.16);
      this.handL.position.set(hb.x + 0.0, hb.y - 0.04, hb.z - 0.02);
    }
  };

  WP.updateLaser = function () {
    var g = this.g;
    if (!this.laserOn || g.player.downed) {
      this.laserLine.visible = false; this.laserDot.visible = false;
      this.laserTarget = null;
      return;
    }
    var dir = this.aimDir(this._v, 0);
    var o = g.camera.position;
    var hit = g.terrain.raycast(o.x, o.y, o.z, dir.x, dir.y, dir.z, 60);
    var end = hit.hit ? hit : { x: o.x + dir.x * 60, y: o.y + dir.y * 60, z: o.z + dir.z * 60 };
    var pos = this.laserLine.geometry.attributes.position.array;
    var m = this.muzzleWorld(this._v2);
    pos[0] = m.x; pos[1] = m.y; pos[2] = m.z;
    pos[3] = end.x; pos[4] = end.y; pos[5] = end.z;
    this.laserLine.geometry.attributes.position.needsUpdate = true;
    this.laserLine.visible = true;
    this.laserDot.position.set(end.x, end.y, end.z);
    this.laserDot.visible = true;
    this.laserTarget = { x: end.x, y: end.y, z: end.z, hit: hit.hit };
  };

  // ---------------------------------------------------------------- resupply
  WP.resupply = function () {
    for (var i = 0; i < this.list.length; i++) {
      var w = this.list[i];
      if (w.reserveMax) w.reserve = Math.min(w.reserveMax, w.reserve + Math.ceil(w.reserveMax * 0.5));
      if (w.magMax && !w.reserveMax && w.kind !== 'throw') w.mag = Math.min(w.magMax, w.mag + Math.ceil(w.magMax * 0.5));
      if (w.kind === 'throw') w.mag = w.magMax;
      if (w.chargeMax !== undefined) w.charges = w.chargeMax;
      if (w.fuelMax !== undefined) w.fuel = w.fuelMax;
      if (w.id === 'minigun') w.mag = Math.min(w.magMax, w.mag + 300);
    }
    this.g.player.flares = Math.min(12, this.g.player.flares + 6);
  };

  WP.ammoString = function () {
    var w = this.cur();
    if (w.kind === 'melee') return '∞';
    if (w.kind === 'drills') return Math.round(w.fuel) + '%';
    if (w.chargeMax !== undefined) return w.charges + ' / ' + w.chargeMax;
    if (w.reserveMax) return Math.ceil(w.mag) + ' / ' + w.reserve;
    return Math.ceil(w.mag) + '';
  };

  WP.dispose = function () {
    this.g.scene.remove(this.laserLine);
    this.g.scene.remove(this.laserDot);
    for (var i = 0; i < this.projPool.length; i++) this.g.scene.remove(this.projPool[i].mesh);
    this.projectiles.length = 0;
  };
})(window.RS);
