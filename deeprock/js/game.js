/* Rock & Stone — the shell: renderer, lights, mission loading, the main loop
   and the glue between the player, the terrain and everything deployed in it. */
(function (RS) {
  'use strict';

  var G = RS.Game = {
    scene: null, camera: null, renderer: null,
    terrain: null, chunks: null, decor: null, world: null, biome: null,
    player: null, fx: null, audio: null,
    running: false, paused: false, loaded: false,
    time: 0, dt: 0, frame: 0,
    flares: [], pickups: [], platforms: [], ziplines: [],
    slowFactor: 1, godMode: false,
    stats: { fps: 60, acc: 0, frames: 0 }
  };

  // ------------------------------------------------------------------ input
  var input = G.input = {
    fwd: false, back: false, left: false, right: false, jump: false, sprint: false, crouch: false,
    fire: false, alt: false, mx: 0, my: 0, wheel: 0, keys: {}, pressed: {}, locked: false
  };
  var KEYMAP = {
    KeyW: 'fwd', KeyA: 'left', KeyS: 'back', KeyD: 'right',
    ArrowUp: 'fwd', ArrowLeft: 'left', ArrowDown: 'back', ArrowRight: 'right',
    Space: 'jump', ShiftLeft: 'sprint', ShiftRight: 'sprint',
    ControlLeft: 'crouch', KeyC: 'crouchKey'
  };

  G.bindInput = function (canvas) {
    var g = this;
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Tab') e.preventDefault();
      if (input.keys[e.code]) return;
      input.keys[e.code] = true;
      input.pressed[e.code] = true;
      var k = KEYMAP[e.code];
      if (k && k !== 'crouchKey') input[k] = true;
      if (e.code === 'ControlLeft' || e.code === 'KeyC') input.crouch = true;
      if (e.code === 'Escape') RS.bus.emit('key-escape');
    });
    window.addEventListener('keyup', function (e) {
      input.keys[e.code] = false;
      var k = KEYMAP[e.code];
      if (k && k !== 'crouchKey') input[k] = false;
      if (e.code === 'ControlLeft' || e.code === 'KeyC') {
        if (!input.keys.ControlLeft && !input.keys.KeyC) input.crouch = false;
      }
    });
    window.addEventListener('blur', function () {
      for (var k in input.keys) input.keys[k] = false;
      input.fwd = input.back = input.left = input.right = input.jump = input.sprint = input.crouch = false;
      input.fire = input.alt = false;
    });

    canvas.addEventListener('mousedown', function (e) {
      if (!input.locked) { g.requestLock(); return; }
      if (e.button === 0) input.fire = true;
      if (e.button === 2) input.alt = true;
      if (e.button === 1) { input.pressed.Middle = true; e.preventDefault(); }
    });
    window.addEventListener('mouseup', function (e) {
      if (e.button === 0) input.fire = false;
      if (e.button === 2) input.alt = false;
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('mousemove', function (e) {
      if (!input.locked) return;
      input.mx += e.movementX || 0;
      input.my += e.movementY || 0;
    });
    canvas.addEventListener('wheel', function (e) {
      input.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('pointerlockchange', function () {
      input.locked = document.pointerLockElement === canvas;
      RS.bus.emit('lock-change', input.locked);
    });
  };

  G.requestLock = function () {
    var c = this.renderer.domElement;
    if (c.requestPointerLock) c.requestPointerLock();
    this.audio && this.audio.resume();
  };

  G.wasPressed = function (code) {
    if (input.pressed[code]) { input.pressed[code] = false; return true; }
    return false;
  };

  // ------------------------------------------------------------------- init
  G.init = function (canvas) {
    this.profile = RS.loadProfile();
    var r = this.renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: window.devicePixelRatio < 1.6, powerPreference: 'high-performance'
    });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
    this.pixelRatioMax = this.pixelRatio;
    r.setPixelRatio(this.pixelRatio);
    r.setSize(window.innerWidth, window.innerHeight);
    r.setClearColor(0x05070c, 1);
    r.shadowMap.enabled = false;
    // Filmic roll-off: a flare or a muzzle flash should read as hot, not as a
    // flat white hole where the rock used to be.
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.25;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.profile.settings.fov, window.innerWidth / window.innerHeight, 0.06, 420);
    this.camera.rotation.order = 'YXZ';

    RS.initPrims();
    this.audio = new RS.Audio(this.profile);
    this.fx = new RS.Fx(this);
    this.player = new RS.Player(this);

    // Fixed light set: the shader never has to recompile mid-mission.
    this.ambient = new THREE.AmbientLight(0x202838, 0.26);
    this.scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0x8899bb, 0x201810, 0.14);
    this.scene.add(this.hemi);

    this.lamp = new THREE.SpotLight(0xfff2d8, 2.1, 44, 0.72, 0.58, 1.15);
    this.lamp.position.set(0, 0, 0);
    this.scene.add(this.lamp);
    this.scene.add(this.lamp.target);
    this.player.lamp = this.lamp;
    this.lampFill = new THREE.PointLight(0xffe8c8, 0.5, 13, 1.5);
    this.scene.add(this.lampFill);

    // flare light pool
    this.flareLights = [];
    for (var i = 0; i < 6; i++) {
      var L = new THREE.PointLight(0xff9a3c, 0, 27, 1.6);
      this.scene.add(L);
      this.flareLights.push(L);
    }

    this.flareMat = new THREE.MeshBasicMaterial({ color: 0xffb060 });
    this.pickupMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.initPickupPool();
    this.initFlarePool();

    this.bindInput(canvas);
    window.addEventListener('resize', function () { G.onResize(); });
    this.onResize();
    return this;
  };

  G.onResize = function () {
    if (!this.renderer) return;
    var w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  // ------------------------------------------------------------- pools
  G.initPickupPool = function () {
    this.pickupPool = [];
    for (var i = 0; i < 90; i++) {
      var m = new THREE.Mesh(RS.makePickup(RS.MAT.MORKITE), this.pickupMat);
      m.visible = false;
      m.frustumCulled = false;
      this.scene.add(m);
      this.pickupPool.push({ mesh: m, active: false });
    }
  };

  G.initFlarePool = function () {
    this.flarePool = [];
    for (var i = 0; i < 6; i++) {
      var m = new THREE.Mesh(RS.PRIM.sphereLo, this.flareMat);
      m.scale.setScalar(0.22);
      m.visible = false;
      this.scene.add(m);
      this.flarePool.push({ mesh: m, light: this.flareLights[i], active: false, life: 0, vel: new THREE.Vector3(), pos: new THREE.Vector3() });
    }
  };

  // ------------------------------------------------------------ mission load
  /* Loading runs in slices off a timer so the progress bar actually moves and
     the browser never thinks the tab has hung. */
  G.loadMission = function (def, onProgress, onDone) {
    var g = this;
    this.unloadMission();
    this.def = def;
    this.biome = RS.biomeById(def.biome);
    var b = this.biome;
    this.scene.fog = new THREE.Fog(b.fog, b.fogNear, b.fogFar);
    this.renderer.setClearColor(b.fog, 1);
    this.ambient.color.setHex(b.ambient);
    this.ambient.intensity = b.ambientPower;
    this.hemi.color.setHex(b.glow); this.hemi.groundColor.setHex(b.rock);
    this.hemi.intensity = 0.13;

    var steps = [
      ['Surveying cave system', function () {
        g.terrain = new RS.Terrain(def.sizeX || 176, def.sizeY || 80, def.sizeZ || 176);
      }],
      ['Boring tunnels', function () {
        g.world = RS.generateCave(g.terrain, b, def.seed, {
          rooms: def.rooms || 9, complexity: def.complexity || 1, ore: def.ore
        });
      }],
      ['Assaying mineral seams', function () {
        g.decor = new RS.Decor(g);
        g.decor.buildOre(g.world);
      }],
      ['Cataloguing flora', function () { g.decor.buildProps(g.world, b); }],
      ['Building rock faces', function () {
        g.chunks = new RS.ChunkManager(g.terrain, g.scene, b);
        g.chunks.buildAll(function (p) { onProgress && onProgress(0.45 + p * 0.4, 'Building rock faces'); });
      }],
      ['Deploying support rig', function () {
        g.fx.resetBiome();
        if (RS.Mission) g.mission = RS.Mission.create(g, def, g.world);
        if (RS.Enemies) g.enemies = new RS.Enemies(g);
        if (RS.Gear) g.gear = new RS.Gear(g);
        if (RS.Weapons) g.weapons = new RS.Weapons(g, def.dwarfClass);
        if (RS.Units) g.units = new RS.Units(g);
      }],
      ['Dropping in', function () {
        g.player.spawn(g.world.start);
        g.player.lives = 3;
        g.player.yaw = Math.atan2(-(g.world.extraction.x - g.world.start.x), -(g.world.extraction.z - g.world.start.z));
        g.player.resources = { nitra: 0, morkite: 0, gold: 0, crystal: 0 };
        g.player.flares = 8;
        g.player.maxHp = 110; g.player.hp = 110;
        if (RS.applyPerks) RS.applyPerks(g, g.profile.perks);
        g.player.hp = g.player.maxHp;
        if (g.mission) g.mission.begin();
        g.loaded = true;
      }]
    ];

    var i = 0;
    function step() {
      if (i >= steps.length) { onProgress && onProgress(1, 'Ready'); onDone && onDone(); return; }
      var s = steps[i];
      onProgress && onProgress(i / steps.length, s[0]);
      try { s[1](); } catch (err) {
        console.error('Mission load failed at "' + s[0] + '"', err);
        RS.bus.emit('load-error', err);
        return;
      }
      i++;
      setTimeout(step, 0);
    }
    setTimeout(step, 0);
  };

  G.unloadMission = function () {
    this.loaded = false;
    if (this.chunks) { this.chunks.dispose(); this.chunks = null; }
    if (this.decor) { this.decor.dispose(); this.decor = null; }
    if (this.enemies) { this.enemies.dispose(); this.enemies = null; }
    if (this.gear) { this.gear.dispose(); this.gear = null; }
    if (this.units) { this.units.dispose(); this.units = null; }
    if (this.weapons) { this.weapons.dispose(); this.weapons = null; }
    if (this.mission) { this.mission.dispose && this.mission.dispose(); this.mission = null; }
    this.terrain = null; this.world = null;
    for (var i = 0; i < (this.flarePool || []).length; i++) {
      this.flarePool[i].active = false;
      this.flarePool[i].mesh.visible = false;
      this.flarePool[i].light.intensity = 0;
    }
    for (i = 0; i < (this.pickupPool || []).length; i++) {
      this.pickupPool[i].active = false;
      this.pickupPool[i].mesh.visible = false;
    }
    this.platforms.length = 0; this.ziplines.length = 0;
    RS.clearPropCache();
  };

  // ------------------------------------------------------------------- loop
  G.start = function () {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    var g = this;
    function frame(now) {
      if (!g.running) return;
      requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - g.last) / 1000);
      g.last = now;
      if (dt <= 0) return;
      g.stats.frames++; g.stats.acc += dt;
      if (g.stats.acc >= 0.5) {
        g.stats.fps = Math.round(g.stats.frames / g.stats.acc);
        g.stats.frames = 0; g.stats.acc = 0;
        if (g.loaded) g.adaptQuality();
      }
      if (!g.paused && g.loaded) g.update(dt);
      g.render();
    }
    requestAnimationFrame(frame);
  };

  G.stop = function () { this.running = false; };

  /* If the machine cannot hold a decent frame rate, render fewer pixels
     rather than drop frames. Steps down slowly and back up grudgingly. */
  G.adaptQuality = function () {
    var fps = this.stats.fps;
    this.qTimer = (this.qTimer || 0) + 0.5;
    if (this.qTimer < 2.5) return;
    var pr = this.pixelRatio;
    if (fps < 38 && pr > 0.65) {
      this.pixelRatio = Math.max(0.65, pr - 0.15);
    } else if (fps > 56 && pr < this.pixelRatioMax) {
      this.pixelRatio = Math.min(this.pixelRatioMax, pr + 0.1);
    } else return;
    this.qTimer = 0;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  G.update = function (dt) {
    this.dt = dt; this.time += dt; this.frame++;
    var p = this.player;

    // mouse look
    if (input.locked && !this.paused) {
      p.look(input.mx, input.my, this.profile.settings.sens, this.profile.settings.invertY);
    }
    input.mx = 0; input.my = 0;

    // One place decides how fast the dwarf walks: acid slows you, a wound-up
    // minigun slows you, and they stack.
    this.slowFactor = 1;
    if (p.slowUntil && this.time < p.slowUntil) this.slowFactor *= 0.55;
    if (this.weapons) this.slowFactor *= this.weapons.moveSlowFactor();

    if (this.cinematic) {
      // riding the pod in or out: look around, nothing else
      p.updateCamera(dt);
    } else {
      if (this.weapons) this.weapons.handleInput(input, this);
      p.update(dt, input);
    }

    if (this.weapons) this.weapons.update(dt);
    if (this.gear) this.gear.update(dt);
    else if (this.wasPressed('KeyE')) this.tryInteract();
    if (this.units) this.units.update(dt);
    if (this.enemies) this.enemies.update(dt);
    if (this.mission) this.mission.update(dt);

    if (RS.updatePerks) RS.updatePerks(this, dt);
    this.updateFlares(dt);
    this.updatePickups(dt);

    this.lampFill.position.copy(this.camera.position);
    this.lamp.intensity = p.downed ? 0.7 : 2.1;

    this.chunks.update(this.camera.position);
    this.fx.update(dt);
    this.audio.setListener(this.camera.position, p.yaw);

    // universal keys
    if (this.wasPressed('KeyF')) p.throwFlare();
    if (this.wasPressed('KeyZ') && RS.usePerk) RS.usePerk(this);
    if (this.wasPressed('KeyV')) this.salute();
    if (this.wasPressed('KeyG')) this.godMode = !this.godMode;

    RS.bus.emit('hud', this);
  };

  G.render = function () {
    var r = this.renderer;
    r.render(this.scene, this.camera);
    // three resets info.render on every render() call, so snapshot the world
    // pass before the viewmodel pass overwrites it
    this.drawStats = { calls: r.info.render.calls, tris: r.info.render.triangles };
    // second pass: the first-person weapon, on top of the world, own FOV
    if (this.weapons && this.weapons.vmScene && !this.cinematic && !this.player.downed) {
      r.autoClear = false;
      r.clearDepth();
      r.render(this.weapons.vmScene, this.weapons.vmCamera);
      r.autoClear = true;
    }
  };

  // ------------------------------------------------------------------- glue
  /* Highest walkable surface from deployed objects (platforms, pods, crates).
     Terrain is handled separately by the density field. */
  G.supportAt = function (x, y, z, maxDrop) {
    var best = null;
    var i, p;
    for (i = 0; i < this.platforms.length; i++) {
      p = this.platforms[i];
      if (p.t < 0.6) continue;
      var dx = x - p.x, dz = z - p.z;
      if (dx * dx + dz * dz > p.r * p.r) continue;
      if (y >= p.y - 0.15 && y - p.y < maxDrop && (best === null || p.y > best)) best = p.y;
    }
    if (this.gear) {
      var gb = this.gear.supportAt(x, y, z, maxDrop);
      if (gb !== null && (best === null || gb > best)) best = gb;
    }
    if (this.units) {
      var ub = this.units.supportAt(x, y, z, maxDrop);
      if (ub !== null && (best === null || ub > best)) best = ub;
    }
    return best;
  };

  // ---- ore -----------------------------------------------------------
  G.collectOreIn = function (x, y, z, r) {
    if (!this.decor) return 0;
    var hits = this.decor.oreInSphere(x, y, z, r);
    var got = 0;
    for (var i = 0; i < hits.length; i++) {
      var n = hits[i];
      n.alive = false;
      this.decor.hideInstance(n);
      this.spawnPickup(n);
      got += n.yield;
    }
    if (hits.length) this.decor.cullPropsNear(x, y, z, r + 1.5);
    return got;
  };

  G.oreNodeNear = function (origin, dir, reach) {
    if (!this.decor) return null;
    for (var t = 1; t <= reach; t += 0.8) {
      var list = this.decor.oreInSphere(origin.x + dir.x * t, origin.y + dir.y * t, origin.z + dir.z * t, 1.0);
      if (list.length) return list[0];
    }
    return null;
  };

  var MATKEY = ['rock', 'dirt', 'nitra', 'morkite', 'gold', 'crystal'];
  G.spawnPickup = function (node) {
    var slot = null;
    for (var i = 0; i < this.pickupPool.length; i++) if (!this.pickupPool[i].active) { slot = this.pickupPool[i]; break; }
    if (!slot) { this.grantResource(node.mat, node.yield); return; }
    slot.active = true;
    slot.mesh.geometry = RS.makePickup(node.mat);
    slot.mesh.visible = true;
    slot.mesh.position.set(node.x, node.y, node.z);
    slot.mesh.scale.setScalar(0.5 + Math.random() * 0.2);
    slot.vel = slot.vel || new THREE.Vector3();
    slot.vel.set(node.nx * 2.5 + (Math.random() - 0.5) * 3, 3 + Math.random() * 2.5, node.nz * 2.5 + (Math.random() - 0.5) * 3);
    slot.mat = node.mat; slot.yield = node.yield; slot.life = 0; slot.homing = false;
    slot.spin = new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6);
  };

  G.updatePickups = function (dt) {
    var p = this.player, pp = this.camera.position;
    for (var i = 0; i < this.pickupPool.length; i++) {
      var s = this.pickupPool[i];
      if (!s.active) continue;
      s.life += dt;
      var m = s.mesh;
      var dx = pp.x - m.position.x, dy = (p.pos.y + 0.8) - m.position.y, dz = pp.z - m.position.z;
      var d2 = dx * dx + dy * dy + dz * dz;
      if (s.homing || (s.life > 0.25 && d2 < 30)) {
        s.homing = true;
        var d = Math.sqrt(d2) || 1;
        var pull = 26;
        s.vel.set(dx / d * pull, dy / d * pull, dz / d * pull);
        m.position.addScaledVector(s.vel, dt);
        if (d < 1.1) {
          s.active = false; m.visible = false;
          this.grantResource(s.mat, s.yield);
          this.audio.play('pickup', null, 0.5, 0.9 + Math.random() * 0.3);
          continue;
        }
      } else {
        s.vel.y -= 22 * dt;
        m.position.addScaledVector(s.vel, dt);
        if (this.terrain.sample(m.position.x, m.position.y, m.position.z) > 0) {
          this.terrain.normalAt(m.position.x, m.position.y, m.position.z, this.fx._n || (this.fx._n = new THREE.Vector3()));
          var n = this.fx._n;
          m.position.addScaledVector(n, 0.3);
          s.vel.multiplyScalar(-0.28);
          s.vel.addScaledVector(n, 1.2);
        }
      }
      m.rotation.x += s.spin.x * dt; m.rotation.y += s.spin.y * dt;
      if (s.life > 50) { s.active = false; m.visible = false; this.grantResource(s.mat, s.yield); }
    }
  };

  G.grantResource = function (mat, amount) {
    var key = MATKEY[mat];
    if (!key || key === 'rock' || key === 'dirt') return;
    var p = this.player;
    amount = amount * RS.perkOreMultiplier(this);
    RS.perkOnPickup(this);
    p.resources[key] = (p.resources[key] || 0) + amount;
    RS.bus.emit('resource', key, amount);
    if (this.mission) this.mission.onResource(key, amount);
  };

  // ---- flares ---------------------------------------------------------
  G.spawnFlare = function (x, y, z, vx, vy, vz) {
    var slot = null, oldest = null;
    for (var i = 0; i < this.flarePool.length; i++) {
      var f = this.flarePool[i];
      if (!f.active) { slot = f; break; }
      if (!oldest || f.life > oldest.life) oldest = f;
    }
    if (!slot) slot = oldest;
    slot.active = true; slot.life = 0;
    slot.pos.set(x, y, z);
    slot.vel.set(vx, vy, vz);
    slot.mesh.visible = true;
    slot.mesh.position.copy(slot.pos);
    slot.landed = false;
  };

  G.updateFlares = function (dt) {
    var t = this.terrain;
    for (var i = 0; i < this.flarePool.length; i++) {
      var f = this.flarePool[i];
      if (!f.active) continue;
      f.life += dt;
      if (f.life > 62) {
        f.active = false; f.mesh.visible = false; f.light.intensity = 0;
        continue;
      }
      if (!f.landed) {
        f.vel.y -= 20 * dt;
        var steps = 2;
        for (var s = 0; s < steps; s++) {
          f.pos.addScaledVector(f.vel, dt / steps);
          if (t.sample(f.pos.x, f.pos.y, f.pos.z) > 0) {
            var n = this._fn || (this._fn = new THREE.Vector3());
            t.normalAt(f.pos.x, f.pos.y, f.pos.z, n);
            f.pos.addScaledVector(n, 0.35);
            f.vel.reflect(n).multiplyScalar(0.32);
            if (f.vel.length() < 1.6) { f.landed = true; f.vel.set(0, 0, 0); }
          }
        }
        f.mesh.position.copy(f.pos);
      }
      // burn down over the last few seconds
      var fade = f.life > 52 ? RS.clamp01((62 - f.life) / 10) : 1;
      var flick = 0.88 + Math.sin(f.life * 11 + i) * 0.07 + Math.random() * 0.05;
      f.light.position.copy(f.pos);
      f.light.intensity = 2.1 * fade * flick;
      f.mesh.scale.setScalar(0.2 * flick);
      if (Math.random() < 0.25) {
        this.fx.emit(f.pos.x, f.pos.y + 0.1, f.pos.z,
          (Math.random() - 0.5) * 0.5, 0.6 + Math.random(), (Math.random() - 0.5) * 0.5,
          0.5, 0.09, 0xffb060, 4, -0.2, 1.2);
      }
    }
  };

  G.flareCount = function () {
    var n = 0;
    for (var i = 0; i < this.flarePool.length; i++) if (this.flarePool[i].active) n++;
    return n;
  };

  // ---- chatter ---------------------------------------------------------
  var SALUTES = ['Rock and Stone!', 'Rock and Stone, brother!', 'For Karl!', 'Did I hear a Rock and Stone?',
    'ROCK AND STONE TO THE BONE!', 'Rock and roll and stone!', 'We fight for Rock and Stone!'];
  G.salute = function () {
    var line = SALUTES[(Math.random() * SALUTES.length) | 0];
    RS.bus.emit('shout', line);
    this.audio.play('rockstone', null, 0.9);
    if (this.units && this.units.bosco) this.units.boscoSalute();
  };

  /* E is one key for everything: mission objectives first, then machines,
     then the zipline you are standing under. */
  G.tryInteract = function () {
    if (this.mission && this.mission.interact()) return true;
    if (this.units && this.units.interact()) return true;
    return false;
  };

  G.interactLabel = function () {
    if (this.mission) {
      var l = this.mission.interactLabel();
      if (l) return l;
    }
    if (this.units) {
      var n = this.units.nearestInteractable();
      if (n) return n.label;
    }
    if (this.gear && this.gear.ziplineNear(this.player.pos, 3.4)) return 'Ride the zipline';
    return null;
  };

  G.toast = function (msg) { RS.bus.emit('toast', msg); };
  G.radio = function (msg, who) {
    RS.bus.emit('radio', msg, who || 'MISSION CONTROL');
    this.audio.play('radio', null, 0.7);
  };

  // ---- environment queries used by hazards -----------------------------
  G.nearLava = function (pos) {
    if (!this.world) return false;
    for (var i = 0; i < this.world.props.length; i += 3) {
      var p = this.world.props[i];
      if (p.type !== 'lavacrack' || !p.alive) continue;
      var dx = p.x - pos.x, dy = p.y - pos.y, dz = p.z - pos.z;
      if (dx * dx + dy * dy + dz * dz < 6.25) return true;
    }
    return false;
  };
  G.nearRadSource = function (pos) {
    if (!this.world) return false;
    for (var i = 0; i < this.world.props.length; i += 2) {
      var p = this.world.props[i];
      if (p.type !== 'radcrystal' || !p.alive) continue;
      var dx = p.x - pos.x, dy = p.y - pos.y, dz = p.z - pos.z;
      if (dx * dx + dy * dy + dz * dz < 36) return true;
    }
    return false;
  };
  G.nearHeat = function (pos) {
    for (var i = 0; i < this.flarePool.length; i++) {
      var f = this.flarePool[i];
      if (!f.active) continue;
      if (f.pos.distanceToSquared(pos) < 36) return true;
    }
    if (this.gear && this.gear.nearHeat) return this.gear.nearHeat(pos);
    return false;
  };
})(window.RS);
