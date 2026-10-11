// Main game: loop, input, block interaction, dimensions, portals, sky, saving and menus.
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const DAY = 1200;
  const SAVE_KEY = 'blockhaven_save_v1', SET_KEY = 'blockhaven_settings_v1';
  const GOALS = [
    ['wood', 'Gather wood', 'Punch a tree to collect logs.'],
    ['table', 'Workbench', 'Craft a Crafting Table.'],
    ['stone', 'Stone Age', 'Mine stone with a pickaxe.'],
    ['iron', 'Iron Will', 'Smelt an iron ingot in a furnace.'],
    ['diamond', 'Shiny', 'Find a diamond.'],
    ['gate', 'Through the Ember Gate', 'Light an obsidian frame with flint and steel.'],
    ['cinder', 'Into the Cinderdeep', 'Enter the Cinderdeep.'],
    ['rod', 'Rod Collector', 'Take an Ember Rod from an Ember Sentinel.'],
    ['eye', 'Seeker', 'Craft a Seeker Eye (Drift Pearl + Ember Dust).'],
    ['archive', 'The Sealed Archive', 'Follow thrown Seeker Eyes to the Archive and fill the Rift Frame.'],
    ['hollow', 'The Hollow', 'Step through the Rift.'],
    ['warden', 'Warden Slayer', 'Defeat the Hollow Warden.'],
    ['cloak', 'Drifting', 'Find a Drift Cloak in an Outer Hollow spire.'],
    ['duskiron', 'Duskiron', 'Forge a Duskiron Ingot.'],
  ];
  const TRADES = {
    farmer: { title: 'Settler · Farmer', t: [{ give: ['wheat', 20], get: ['emerald', 1] }, { give: ['carrot', 15], get: ['emerald', 1] }, { give: ['emerald', 1], get: ['bread', 6] }, { give: ['emerald', 1], get: ['apple', 4] }, { give: ['emerald', 1], get: ['pumpkin_pie', 4] }, { give: ['emerald', 2], get: ['sapling_oak', 3] }] },
    smith: { title: 'Settler · Smith', t: [{ give: ['coal', 15], get: ['emerald', 1] }, { give: ['iron_ingot', 4], get: ['emerald', 1] }, { give: ['emerald', 5], get: ['iron_pickaxe', 1] }, { give: ['emerald', 9], get: ['iron_chestplate', 1] }, { give: ['emerald', 4], get: ['shears', 1] }, { give: ['emerald', 18], get: ['diamond_sword', 1] }, { give: ['emerald', 14], get: ['diamond_pickaxe', 1] }] },
    librarian: { title: 'Settler · Librarian', t: [{ give: ['paper', 24], get: ['emerald', 1] }, { give: ['book', 4], get: ['emerald', 1] }, { give: ['emerald', 6], get: ['bookshelf', 1] }, { give: ['emerald', 5], get: ['compass', 1] }, { give: ['emerald', 8], get: ['drift_pearl', 1] }, { give: ['emerald', 3], get: ['name_tag', 1] }] },
    butcher: { title: 'Settler · Butcher', t: [{ give: ['porkchop', 14], get: ['emerald', 1] }, { give: ['chicken', 14], get: ['emerald', 1] }, { give: ['emerald', 1], get: ['cooked_porkchop', 5] }, { give: ['emerald', 1], get: ['steak', 5] }, { give: ['emerald', 1], get: ['cooked_mutton', 5] }] },
    mason: { title: 'Settler · Mason', t: [{ give: ['clay_ball', 10], get: ['emerald', 1] }, { give: ['stone', 20], get: ['emerald', 1] }, { give: ['emerald', 1], get: ['bricks', 10] }, { give: ['emerald', 1], get: ['stone_bricks', 8] }, { give: ['emerald', 1], get: ['lamp', 2] }, { give: ['emerald', 1], get: ['chiseled_sandstone', 4] }] },
    cleric: { title: 'Settler · Cleric', t: [{ give: ['rotten_flesh', 32], get: ['emerald', 1] }, { give: ['emerald', 2], get: ['glow_dust', 4] }, { give: ['emerald', 1], get: ['lapis', 2] }, { give: ['emerald', 5], get: ['ember_dust', 1] }, { give: ['emerald', 6], get: ['cinnabar', 8] }, { give: ['emerald', 10], get: ['golden_apple', 1] }] },
  };

  function Game() {
    this.settings = Object.assign({ radius: 6, fov: 75, sens: 1, vol: 0.5 }, load(SET_KEY) || {});
    this.renderer = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.autoClear = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, 1, 0.05, 1000);
    this.camera.rotation.order = 'YXZ';
    this.hudScene = new THREE.Scene();
    this.hudCam = new THREE.PerspectiveCamera(70, 1, 0.01, 10);
    this.hudScene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const hl = new THREE.DirectionalLight(0xffffff, 0.5); hl.position.set(-1, 2, 1); this.hudScene.add(hl);
    this.amb = new THREE.AmbientLight(0xffffff, 0.7); this.scene.add(this.amb);
    this.sun = new THREE.DirectionalLight(0xffffff, 0.5); this.sun.position.set(0.5, 1, 0.3); this.scene.add(this.sun);
    this.audio = new BH.Audio();
    this.audio.setVolume(this.settings.vol);
    this.input = { f: 0, s: 0, jump: false, sneak: false, sneakRaw: false, sprint: false, flyToggle: false };
    this.keys = {};
    this.mouse = { left: false, right: false };
    this.running = false;
    this.stats = { kills: 0, crafted: 0, mined: 0, placed: 0 };
    this.buildSky();
    this.buildOverlays();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.bindInput();
    this.bindMenus();
    this.clock = new THREE.Clock();
    this.fpsT = 0; this.frames = 0; this.fps = 0;
    requestAnimationFrame(t => this.frame(t));
  }
  function load(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  Game.prototype.resize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.hudCam.aspect = w / h; this.hudCam.updateProjectionMatrix();
  };

  // ---------- sky
  Game.prototype.buildSky = function () {
    const sq = (color, size, draw) => {
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const g = c.getContext('2d'); draw(g);
      const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: false, depthWrite: false }));
      m.renderOrder = -10; return m;
    };
    this.sunMesh = sq(0, 60, g => { g.fillStyle = '#fff8c0'; g.fillRect(4, 4, 24, 24); g.fillStyle = '#fffbe8'; g.fillRect(8, 8, 16, 16); });
    this.moonMesh = sq(0, 40, g => { g.fillStyle = '#d8dce8'; g.fillRect(6, 6, 20, 20); g.fillStyle = '#a8acb8'; g.fillRect(10, 10, 5, 5); g.fillRect(18, 16, 4, 4); g.fillRect(12, 20, 3, 3); });
    this.scene.add(this.sunMesh, this.moonMesh);
    const sp = [];
    const r = BH.mulberry32(42);
    for (let i = 0; i < 900; i++) { const u = r() * 2 - 1, a = r() * 6.28, s = Math.sqrt(1 - u * u); sp.push(Math.cos(a) * s * 400, Math.abs(u) * 400, Math.sin(a) * s * 400); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
    this.stars.renderOrder = -11;
    this.scene.add(this.stars);
    // blocky clouds
    const cc = document.createElement('canvas'); cc.width = cc.height = 64;
    const cg = cc.getContext('2d'); const cn = new BH.Simplex(7);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (cn.noise2(x / 6, y / 6) > 0.25) { cg.fillStyle = '#fff'; cg.fillRect(x, y, 1, 1); }
    const ct = new THREE.CanvasTexture(cc); ct.magFilter = ct.minFilter = THREE.NearestFilter; ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(4, 4);
    this.clouds = new THREE.Mesh(new THREE.PlaneGeometry(2048, 2048), new THREE.MeshBasicMaterial({ map: ct, transparent: true, opacity: 0.8, fog: false, depthWrite: false, side: THREE.DoubleSide }));
    this.clouds.rotation.x = -Math.PI / 2;
    this.scene.add(this.clouds);
  };
  Game.prototype.updateSky = function (dt) {
    const dim = this.world.dim;
    const t = (this.time % DAY) / DAY;
    const ang = t * Math.PI * 2;
    const sunH = Math.sin(ang);
    let daylight, sky, fogNear, fogFar;
    const far = this.world.radius * 16;
    if (dim === 'over') {
      daylight = Math.max(0.12, Math.min(1, sunH * 3 + 0.45));
      const day = new THREE.Color(0x88b8ff), night = new THREE.Color(0x070a16), dusk = new THREE.Color(0xe8905a);
      sky = night.clone().lerp(day, (daylight - 0.12) / 0.88);
      const duskF = Math.max(0, 1 - Math.abs(sunH) * 5) * 0.6;
      sky.lerp(dusk, duskF);
      fogNear = far * 0.55; fogFar = far * 0.95;
      this.sunMesh.visible = this.moonMesh.visible = true;
      this.clouds.visible = true;
      this.stars.visible = daylight < 0.6;
      this.stars.material.opacity = Math.max(0, 1 - daylight * 1.8);
    } else if (dim === 'cinder') {
      daylight = 0; sky = new THREE.Color(0x3a0e08); fogNear = 12; fogFar = Math.min(far, 70);
      this.sunMesh.visible = this.moonMesh.visible = this.clouds.visible = this.stars.visible = false;
    } else {
      daylight = 0.55; sky = new THREE.Color(0x120a1e); fogNear = far * 0.5; fogFar = far;
      this.sunMesh.visible = this.moonMesh.visible = this.clouds.visible = false;
      this.stars.visible = true; this.stars.material.opacity = 0.7;
    }
    const p = this.player;
    if (p.underwater) { sky = new THREE.Color(0x10306a).multiplyScalar(0.3 + daylight * 0.7); fogNear = 1; fogFar = 24; }
    if (p.inLava) { sky = new THREE.Color(0xd84a10); fogNear = 0; fogFar = 3; }
    this.daylight = daylight;
    this.scene.background = sky;
    this.world.mats.all.forEach(m => {
      m.uniforms.daylight.value = daylight;
      m.uniforms.fogColor.value.copy(sky);
      m.uniforms.fogNear.value = fogNear; m.uniforms.fogFar.value = fogFar;
      m.uniforms.ambient.value = dim === 'cinder' ? 0.42 : dim === 'hollow' ? 0.3 : 0;
    });
    this.amb.intensity = 0.35 + 0.45 * Math.max(daylight, dim === 'cinder' ? 0.6 : 0);
    this.sun.intensity = 0.2 + 0.4 * daylight;
    const cam = this.camera.position;
    const sd = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0.15).normalize();
    this.sunMesh.position.copy(cam).addScaledVector(sd, 400); this.sunMesh.lookAt(cam);
    this.moonMesh.position.copy(cam).addScaledVector(sd, -400); this.moonMesh.lookAt(cam);
    this.stars.position.copy(cam);
    this.stars.rotation.z = ang;
    this.clouds.position.set(cam.x, 150, cam.z);
    this.clouds.material.map.offset.set((this.time * 0.0004 + cam.x / 2048 * 4) % 1, (-cam.z / 2048 * 4) % 1);
    this.clouds.material.opacity = 0.25 + 0.6 * daylight;
  };

  Game.prototype.buildOverlays = function () {
    // block highlight + crack overlay
    const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.highlight = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }));
    this.highlight.visible = false;
    this.scene.add(this.highlight);
    this.crackTex = [];
    for (let s = 0; s < 10; s++) {
      const c = document.createElement('canvas'); c.width = c.height = 16;
      const g = c.getContext('2d'); const r = BH.mulberry32(s + 1);
      g.fillStyle = 'rgba(0,0,0,0.75)';
      let x = 8, y = 8;
      for (let k = 0; k < (s + 1) * 7; k++) { g.fillRect(x, y, 1, 1); x = (x + (r() < 0.5 ? -1 : 1) + 16) % 16; y = (y + (r() < 0.5 ? -1 : 1) + 16) % 16; if (r() < 0.12) { x = (r() * 16) | 0; y = (r() * 16) | 0; } }
      const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter;
      this.crackTex.push(t);
    }
    this.crack = new THREE.Mesh(new THREE.BoxGeometry(1.006, 1.006, 1.006), new THREE.MeshBasicMaterial({ map: this.crackTex[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    this.crack.visible = false;
    this.scene.add(this.crack);
  };

  // ---------- world lifecycle
  Game.prototype.newGame = function (seed, mode, difficulty) {
    this.seed = seed;
    this.mode = mode; this.difficulty = difficulty;
    this.peaceful = difficulty === 'peaceful';
    this.time = DAY * 0.03;
    this.dims = {};
    this.state = { wardenDead: false, crystals: [], goals: {}, archiveEyes: {} };
    this.inv = new BH.Inventory(this);
    this.player = new BH.Player(this);
    this.ui = new BH.UI(this); this.ui.bind();
    this.stats = { kills: 0, crafted: 0, mined: 0, placed: 0 };
    this.enterDim('over', null);
    const sp = this.findSpawn();
    this.worldSpawn = sp;
    this.player.pos.set(sp.x + 0.5, 140, sp.z + 0.5);
    this.awaitSpawn = true;
    if (mode === 'creative') {
      ['diamond_pickaxe', 'diamond_axe', 'diamond_shovel', 'diamond_sword', 'torch', 'crafting_table', 'oak_planks', 'glass', 'stone_bricks'].forEach((k, i) => this.inv.slots[i] = { id: BH.ID[k], n: BH.itemByKey(k).stack, dur: 0 });
    }
    this.start();
  };
  Game.prototype.findSpawn = function () {
    const g = new BH.Generator(this.seed);
    for (let r = 0; r < 2000; r += 24) for (let a = 0; a < 12; a++) {
      const x = Math.round(Math.cos(a / 12 * 6.28) * r), z = Math.round(Math.sin(a / 12 * 6.28) * r);
      const c = g.column(x, z), b = BH.BIOMES[c.b];
      if (c.h > BH.SEA && !['ocean', 'frozen_ocean', 'river', 'beach', 'mountains', 'frozen_river', 'snowy_beach'].includes(b.key)) return { x, z };
    }
    return { x: 0, z: 0 };
  };
  Game.prototype.enterDim = function (dim, at) {
    $('#portalfx').style.opacity = 0;
    if (this.world) {
      this.world.chunks.forEach(c => this.world.disposeMesh(c));
      this.world.chunks.clear();
      this.entities && this.entities.list.forEach(e => this.entities.removeMob(e));
      this.entities && this.entities.items.forEach(d => this.scene.remove(d.mesh));
      this.entities && this.entities.projectiles.forEach(p => this.scene.remove(p.mesh));
    }
    if (!this.dims[dim]) {
      const w = new BH.World(this.seed, this.scene, dim);
      const saved = this.pendingSave && this.pendingSave.dims && this.pendingSave.dims[dim];
      if (saved) {
        Object.keys(saved.mods).forEach(k => { const m = new Map(); const a = saved.mods[k]; for (let i = 0; i < a.length; i += 2) m.set(a[i], a[i + 1]); w.mods.set(k, m); });
        Object.keys(saved.data || {}).forEach(k => w.blockData.set(k, saved.data[k]));
      }
      this.dims[dim] = w;
    }
    this.world = this.dims[dim];
    this.world.radius = dim === 'cinder' ? Math.min(this.settings.radius, 6) : this.settings.radius;
    if (this.entities) { this.scene.remove(this.entities.particles.points); }
    this.entities = new BH.Entities(this);
    this.spawnedNPC = new Set();
    if (this.ui) this.ui.meshCache = {};
    if (at) { this.player.pos.copy(at); this.player.vel.set(0, 0, 0); }
    this.bossSpawned = false;
    if (this.heldMesh) { this.hudScene.remove(this.heldMesh); this.heldMesh = null; this.heldId = -1; }
  };

  Game.prototype.start = function () {
    $('#menu').hidden = true; $('#hud').hidden = false;
    $('#loading').hidden = false;
    this.running = true; this.paused = false;
    this.ui.refresh();
    this.lockPointer();
  };
  Game.prototype.lockPointer = function () {
    if (this.ui && this.ui.screen) return;
    const c = $('#c');
    try { const p = c.requestPointerLock && c.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
  };

  // ---------- input
  Game.prototype.bindInput = function () {
    const c = $('#c');
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === c;
      this.locked = locked;
      if (!locked && this.running && !this.ui.screen && !this.player.dead && !this.chatOpen) this.pause(true);
    });
    c.addEventListener('mousedown', e => {
      this.audio.init();
      if (!this.running || this.paused) return;
      if (!this.locked) { this.lockPointer(); return; }
      if (e.button === 0) { this.mouse.left = true; this.attackOrStart(); }
      if (e.button === 2) { this.mouse.right = true; this.useT = 0; this.use(true); }
      if (e.button === 1) this.pickBlock();
    });
    document.addEventListener('mouseup', e => {
      if (e.button === 0) { this.mouse.left = false; this.breaking = null; }
      if (e.button === 2) { this.mouse.right = false; this.releaseUse(); }
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mousemove', e => {
      if (!this.locked || !this.running) return;
      const s = 0.0022 * this.settings.sens;
      this.player.yaw -= e.movementX * s;
      this.player.pitch = Math.max(-1.55, Math.min(1.55, this.player.pitch - e.movementY * s));
    });
    document.addEventListener('wheel', e => {
      if (!this.running || this.ui.screen || this.paused) return;
      this.inv.sel = (this.inv.sel + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
      this.ui.refresh(); this.ui.showHeldName(); this.eatT = 0;
    }, { passive: true });
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') { if (e.code === 'Escape') e.target.blur(); return; }
      this.audio.init();
      const k = e.code;
      if (!this.running) return;
      if (k === 'Escape') { if (this.ui.screen) { this.ui.close(); } else if ($('#journal').hidden === false) { $('#journal').hidden = true; this.pause(true); } else if (this.paused) this.resume(); return; }
      if (k === 'KeyE' && !this.paused && !this.player.dead) { if (this.ui.screen) this.ui.close(); else this.ui.open('inv'); return; }
      if (this.ui.screen) {
        if (/^Digit[1-9]$/.test(k)) this.hotkeySwap(+k.slice(5) - 1);
        return;
      }
      if (this.paused || this.player.dead) return;
      if (k === 'Space' && !e.repeat) { const now = performance.now(); if (now - (this.lastSpace || 0) < 300) this.input.flyToggle = true; this.lastSpace = now; }
      if (k === 'KeyW' && !e.repeat) { const now = performance.now(); if (now - (this.lastW || 0) < 280) this.input.sprintTap = true; this.lastW = now; }
      this.keys[k] = true;
      if (/^Digit[1-9]$/.test(k)) { this.inv.sel = +k.slice(5) - 1; this.ui.refresh(); this.ui.showHeldName(); this.eatT = 0; }
      if (k === 'KeyQ') this.dropHeld(e.ctrlKey);
      if (k === 'F3') { e.preventDefault(); this.debug = !this.debug; $('#debug').hidden = !this.debug; }
      if (k === 'F1') { e.preventDefault(); $('#hud').classList.toggle('hidehud'); }
      if (k === 'KeyF' && this.mode === 'creative') { this.player.flying = !this.player.flying; }
      if (k === 'KeyJ') this.openJournal();
      if (k === 'KeyB' && this.world.dim === 'over') this.ui.toast('Biome: ' + this.world.biomeAt(Math.floor(this.player.pos.x), Math.floor(this.player.pos.z)).name);
    });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.mouse.left = this.mouse.right = false; });
  };
  Game.prototype.hotkeySwap = function (n) {
    const el = document.querySelector('#panel .slot:hover');
    if (!el || el.dataset.l === 'cat' || el.dataset.l === 'craftout') {
      if (el && el.dataset.l === 'cat') { const id = +el.dataset.i; this.inv.slots[n] = { id, n: BH.ITEMS[id].stack, dur: 0 }; this.ui.refresh(); }
      return;
    }
    const list = this.ui.listRef(el.dataset.l), i = el.dataset.i;
    const t = list[i]; list[i] = this.inv.slots[n]; this.inv.slots[n] = t;
    this.ui.refresh();
  };
  Game.prototype.readInput = function () {
    const k = this.keys, inp = this.input;
    inp.f = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
    inp.s = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    inp.jump = !!k.Space;
    inp.sneakRaw = !!(k.ShiftLeft || k.ShiftRight);
    inp.sneak = inp.sneakRaw;
    if (inp.sprintTap) { inp.sprintLatch = true; inp.sprintTap = false; }
    if (inp.f <= 0) inp.sprintLatch = false;
    inp.sprint = !!(k.ControlLeft || k.ControlRight || k.KeyR) || inp.sprintLatch;
    if (this.mode !== 'creative') inp.flyToggle = false;
  };

  // ---------- interaction
  Game.prototype.target = function () {
    const p = this.player, reach = this.mode === 'creative' ? 5.5 : 4.6;
    const o = p.eyePos(), d = p.lookDir();
    const hit = this.world.raycast(o, d, reach);
    const mob = this.entities.rayMob(o, d, reach);
    if (mob && (!hit || mob.dist < hit.dist)) return { mob: mob.mob };
    return hit;
  };
  Game.prototype.attackOrStart = function () {
    const t = this.target();
    this.swing = 0.25;
    if (t && t.mob) this.attack(t.mob);
  };
  Game.prototype.attack = function (e) {
    const now = this.time;
    const held = this.inv.held();
    const tool = held && held.tool;
    const cd = tool ? tool.cd : 0.4;
    const charge = Math.min(1, (now - (this.lastAttack || 0)) / cd);
    this.lastAttack = now;
    if (e.def.npc && this.mode === 'survival') { /* allowed but discouraged */ }
    let dmg = (tool ? tool.dmg : 1) * (0.2 + charge * 0.8);
    const p = this.player;
    const crit = !p.onGround && p.vel.y < 0 && charge > 0.9;
    if (crit) { dmg *= 1.5; for (let i = 0; i < 8; i++) this.entities.particles.spawn(e.pos.x, e.pos.y + e.h * 0.7, e.pos.z, [1, 1, 0.6], 1, 0.5); }
    const dir = p.lookDir().setY(0).normalize();
    const kb = dir.multiplyScalar((p.sprint ? 8 : 4) * charge); kb.y = 4;
    if (this.entities.damageMob(e, dmg, kb, p)) {
      p.addExhaust(0.1);
      if (tool) this.inv.damageHeld(tool.type === 'sword' ? 1 : 2);
      if (p.sprint) p.sprint = false, this.input.sprintLatch = false;
    }
  };
  Game.prototype.harvestInfo = function (b) {
    const held = this.inv.held();
    const tool = held && held.tool;
    if (this.mode === 'creative') return { time: 0, can: true };
    if (b.hardness < 0) return { time: Infinity, can: false };
    let correct = false;
    if (tool) {
      if (tool.type === b.tool) correct = true;
      if (tool.type === 'shears' && (b.leaves || b.wool)) correct = true;
      if (tool.type === 'sword' && (b.leaves || b.key === 'cactus' || b.key.includes('mushroom') || b.key === 'pumpkin' || b.key === 'melon')) correct = true;
      if (tool.type === 'hoe' && (b.leaves || b.key === 'hay_bale' || b.key === 'ember_cap' || b.key === 'moss_block')) correct = true;
    }
    let can = true;
    if (b.tool === 'pickaxe' && b.tier >= 0) can = !!(tool && tool.type === 'pickaxe' && tool.tier >= b.tier);
    if (b.wool) can = true;
    const speed = correct ? tool.speed : 1;
    let time = b.hardness * (can ? 1.5 : 5) / speed;
    if (!this.player.onGround && !this.player.flying && !BH.inBlock(this.world, this.player, id => id === BH.ID.water || (id && BH.BLOCKS[id].climb))) time *= 5;
    if (this.player.underwater) time *= 5;
    return { time, can, correct };
  };
  Game.prototype.updateBreaking = function (dt) {
    if (!this.mouse.left || this.ui.screen || this.paused || this.player.dead) { this.breaking = null; this.crack.visible = false; return; }
    const t = this.target();
    if (!t || t.mob) {
      this.breaking = null; this.crack.visible = false;
      if (t && t.mob) { this.attackHoldT = (this.attackHoldT || 0) + dt; }
      return;
    }
    const key = t.x + ',' + t.y + ',' + t.z;
    if (!this.breaking || this.breaking.key !== key) this.breaking = { key, prog: 0, t, sndT: 0 };
    const b = BH.BLOCKS[t.id];
    const info = this.harvestInfo(b);
    if (this.mode === 'creative') {
      this.creativeBreakT = (this.creativeBreakT || 0) - dt;
      if (this.creativeBreakT <= 0) { this.creativeBreakT = 0.22; this.breakBlockAt(t.x, t.y, t.z, true, false); this.swing = 0.25; }
      return;
    }
    if (info.time === Infinity) return;
    this.breaking.prog += info.time ? dt / info.time : 1;
    this.breaking.sndT -= dt;
    this.swingHold = true;
    if (this.breaking.sndT <= 0) {
      this.breaking.sndT = 0.25; this.audio.play('dig', b.sound);
      for (let i = 0; i < 2; i++) this.entities.particles.spawn(t.x + 0.5 + t.nx * 0.55 + (Math.random() - 0.5) * 0.6, t.y + 0.5 + t.ny * 0.55 + (Math.random() - 0.5) * 0.6, t.z + 0.5 + t.nz * 0.55 + (Math.random() - 0.5) * 0.6, this.blockColor(t.id), 0.3, 0.4);
    }
    this.crack.visible = true;
    this.crack.position.set(t.x + 0.5, t.y + 0.5, t.z + 0.5);
    this.crack.material.map = this.crackTex[Math.min(9, Math.floor(this.breaking.prog * 10))];
    if (this.breaking.prog >= 1) {
      this.breakBlockAt(t.x, t.y, t.z, true, info.can);
      const held = this.inv.held();
      if (held && held.tool && b.hardness > 0) this.inv.damageHeld(held.tool.type === 'sword' ? 2 : 1);
      this.player.addExhaust(0.005);
      this.breaking = null; this.crack.visible = false;
    }
  };
  Game.prototype.blockColor = function (id) {
    this.colorCache = this.colorCache || {};
    if (this.colorCache[id]) return this.colorCache[id];
    const b = BH.BLOCKS[id], t = BH.TEX[b.tex.side], N = BH.ATLAS_COLS;
    const d = BH.atlas.getContext('2d').getImageData((t % N) * 16, ((t / N) | 0) * 16, 16, 16).data;
    let r = 0, g = 0, bl = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100) { r += d[i]; g += d[i + 1]; bl += d[i + 2]; n++; }
    const c = n ? [r / n / 255, g / n / 255, bl / n / 255] : [0.5, 0.5, 0.5];
    if (b.tint === 'foliage' || b.tintTop) { c[0] *= 0.6; c[2] *= 0.5; }
    this.colorCache[id] = c; return c;
  };
  // Removes a block; byPlayer gives drops via harvest rules, drop=false gives none.
  Game.prototype.breakBlockAt = function (x, y, z, byPlayer, drop) {
    const w = this.world, ID = BH.ID;
    const id = w.getBlock(x, y, z);
    if (!id) return;
    const b = BH.BLOCKS[id];
    const held = this.inv.held();
    const tool = held && held.tool;
    if (byPlayer) {
      this.audio.play('break', b.sound);
      for (let i = 0; i < 14; i++) this.entities.particles.spawn(x + Math.random(), y + Math.random(), z + Math.random(), this.blockColor(id), 0.7, 0.6);
      this.stats.mined++;
    }
    const meta = w.getMeta(x, y, z);
    // container contents spill
    const bd = w.blockData.get(x + ',' + y + ',' + z);
    if (bd) { bd.slots.forEach(s => s && this.entities.dropItem(s.id, s.n, x + 0.5, y + 0.5, z + 0.5)); w.blockData.delete(x + ',' + y + ',' + z); }
    w.setBlock(x, y, z, 0);
    if (drop && this.mode !== 'creative') this.spawnDrops(b, x, y, z, byPlayer && tool);
    if (byPlayer && this.mode === 'survival') {
      if (b.log) this.goal('wood');
      if (id === ID.stone || id === ID.cobble) this.goal('stone');
      if (b.key === 'diamond_ore' || b.key === 'slate_diamond_ore') this.goal('diamond');
      if (/_ore$/.test(b.key) && drop && !['iron_ore', 'gold_ore', 'copper_ore', 'cinder_gold_ore', 'duskiron_ore'].includes(b.key)) this.player.xp += 1 + Math.floor(Math.random() * 3);
    }
    if (id === ID.obsidian) this.clearPortal(x, y, z, ID.ember_gate);
    if (id === ID.ember_gate) this.clearPortal(x, y, z, ID.ember_gate);
    this.afterChange(x, y, z);
  };
  Game.prototype.spawnDrops = function (b, x, y, z, tool) {
    const ID = BH.ID, E = this.entities;
    const cx = x + 0.5, cy = y + 0.4, cz = z + 0.5;
    const info = this.harvestInfo(b);
    if (b.leaves) {
      if (tool && tool.type === 'shears') { E.dropItem(b.id, 1, cx, cy, cz); return; }
      if (Math.random() < 0.06) E.dropItem('sapling_' + b.leafOf, 1, cx, cy, cz);
      if (b.apple && Math.random() < 0.02) E.dropItem('apple', 1, cx, cy, cz);
      if (Math.random() < 0.02) E.dropItem('stick', 1, cx, cy, cz);
      return;
    }
    if ((b.key === 'tall_grass' || b.key === 'fern') && tool && tool.type === 'shears') { E.dropItem(b.id, 1, cx, cy, cz); return; }
    if (b.crop !== undefined) {
      if (b.crop === 3) { E.dropItem('wheat', 1, cx, cy, cz); E.dropItem('seeds', 1 + Math.floor(Math.random() * 3), cx, cy, cz); }
      else E.dropItem('seeds', 1, cx, cy, cz);
      return;
    }
    if (!info.can) return;
    if (b.key === 'gravel' && Math.random() < 0.1) { E.dropItem('flint', 1, cx, cy, cz); return; }
    if (b.key === 'mushroom_block' || b.key === 'mushroom_stem') { if (Math.random() < 0.25) E.dropItem(Math.random() < 0.5 ? 'red_mushroom' : 'brown_mushroom', 1, cx, cy, cz); return; }
    if (!b.drop) return;
    if (b.dropChance && Math.random() > b.dropChance) return;
    let n = 1;
    if (b.dropN) n = b.dropN[0] + Math.floor(Math.random() * (b.dropN[1] - b.dropN[0] + 1));
    E.dropItem(b.drop, n, cx, cy, cz);
  };
  // Reacts to a block change: gravity, unsupported plants, water filling in.
  Game.prototype.afterChange = function (x, y, z) {
    const w = this.world, ID = BH.ID;
    // plants above lose support
    let yy = y + 1;
    while (true) {
      const a = w.getBlock(x, yy, z);
      if (!a) break;
      const ab = BH.BLOCKS[a];
      if (!(ab.support || ab.torch)) break;
      const below = w.getBlock(x, yy - 1, z);
      const ok = below && (BH.BLOCKS[below].solid && !(ab.cactus && false)) && !(ab.cane && below !== ID.sugar_cane && !BH.BLOCKS[below].solid) || (ab.cane && below === ID.sugar_cane) || (ab.cactus && below === ID.cactus) || (ab.torch && below && BH.BLOCKS[below].solid);
      if (ok && !(ab.crop !== undefined && below !== ID.farmland)) break;
      w.setBlock(x, yy, z, 0);
      if (this.mode !== 'creative') this.spawnDrops(ab, x, yy, z, null);
      yy++;
    }
    // falling sand / gravel above
    for (let k = y + 1; k < BH.CH; k++) {
      const a = w.getBlock(x, k, z);
      if (!a || !BH.BLOCKS[a].gravity) break;
      this.fallBlock(x, k, z);
    }
    if (w.getBlock(x, y, z) && BH.BLOCKS[w.getBlock(x, y, z)].gravity) this.fallBlock(x, y, z);
    // water flows into the gap
    if (!w.getBlock(x, y, z)) {
      const src = [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]].find(([dx, dy, dz]) => w.getBlock(x + dx, y + dy, z + dz) === ID.water);
      if (src) { this.flowWater(x, y, z, 24); }
      const lsrc = [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]].find(([dx, dy, dz]) => w.getBlock(x + dx, y + dy, z + dz) === ID.lava);
      if (!src && lsrc && w.dim !== 'over') w.setBlock(x, y, z, ID.lava);
    }
  };
  Game.prototype.flowWater = function (x, y, z, budget) {
    const w = this.world, ID = BH.ID;
    w.setBlock(x, y, z, ID.water);
    // water falls down until it lands, then stays
    let yy = y - 1;
    while (budget-- > 0 && yy > 0) {
      const b = w.getBlock(x, yy, z);
      if (b && !BH.BLOCKS[b].replaceable) break;
      if (b === ID.lava) { w.setBlock(x, yy, z, ID.obsidian); break; }
      w.setBlock(x, yy, z, ID.water); yy--;
    }
  };
  Game.prototype.fallBlock = function (x, y, z) {
    const w = this.world, id = w.getBlock(x, y, z), meta = w.getMeta(x, y, z);
    let ty = y;
    while (ty > 1) { const b = w.getBlock(x, ty - 1, z); if (b && !BH.BLOCKS[b].replaceable && !BH.BLOCKS[b].cross) break; ty--; }
    if (ty === y) return;
    w.setBlock(x, y, z, 0);
    w.setBlock(x, ty, z, id, meta);
  };
  Game.prototype.clearPortal = function (x, y, z, pid) {
    const w = this.world, stack = [[x, y, z]], seen = new Set();
    while (stack.length && seen.size < 600) {
      const [a, b, c] = stack.pop();
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const k = (a + dx) + ',' + (b + dy) + ',' + (c + dz);
        if (seen.has(k)) continue;
        if (w.getBlock(a + dx, b + dy, c + dz) === pid) { seen.add(k); w.setBlock(a + dx, b + dy, c + dz, 0); stack.push([a + dx, b + dy, c + dz]); }
      }
    }
  };

  Game.prototype.facingMeta = function () {
    const y = ((this.player.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return (4 - (Math.round(y / (Math.PI / 2)) % 4)) % 4;
  };
  Game.prototype.canPlaceAt = function (x, y, z, id) {
    const w = this.world, cur = w.getBlock(x, y, z);
    if (y <= 0 || y >= BH.CH - 1) return false;
    if (cur && !BH.BLOCKS[cur].replaceable) return false;
    const b = BH.BLOCKS[id];
    if (b.solid) {
      const p = this.player;
      const ov = (e) => x + 1 > e.pos.x - e.w / 2 && x < e.pos.x + e.w / 2 && z + 1 > e.pos.z - e.w / 2 && z < e.pos.z + e.w / 2 && y + 1 > e.pos.y && y < e.pos.y + e.h;
      if (ov(p) && !(this.mode === 'creative' && p.flying && false)) return false;
      if (this.entities.list.some(e => !e.dead && ov(e))) return false;
    }
    return true;
  };
  Game.prototype.plantOk = function (b, x, y, z) {
    const w = this.world, ID = BH.ID, below = w.getBlock(x, y - 1, z);
    const soil = [ID.grass, ID.dirt, ID.podzol, ID.coarse_dirt, ID.farmland, ID.snowy_grass, ID.moss_block, ID.mud, ID.mycelium];
    if (b.crop !== undefined) return below === ID.farmland;
    if (b.sapling || ['dandelion', 'poppy', 'blue_orchid', 'cornflower', 'tall_grass', 'fern'].includes(b.key)) return soil.includes(below);
    if (b.key === 'dead_bush') return [ID.sand, ID.red_sand, ID.terracotta, ID.dirt, ID.coarse_dirt].includes(below);
    if (b.cane) return below === ID.sugar_cane || ([ID.sand, ID.red_sand, ID.grass, ID.dirt].includes(below) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => w.getBlock(x + dx, y - 1, z + dz) === ID.water));
    if (b.cactus) return (below === ID.sand || below === ID.red_sand || below === ID.cactus) && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => !w.getBlock(x + dx, y, z + dz));
    if (b.key === 'drift_bloom') return below === ID.voidstone || below === ID.drift_bloom;
    if (b.key === 'glowshroom' || b.key.includes('mushroom')) return below && BH.BLOCKS[below].solid;
    if (b.torch) return below && BH.BLOCKS[below].solid;
    return below && BH.BLOCKS[below].solid;
  };

  // Right click: interact with blocks/mobs, place, eat, throw, draw a bow.
  Game.prototype.use = function (first) {
    if (this.ui.screen || this.paused || this.player.dead) return;
    const g = this, w = this.world, ID = BH.ID, inv = this.inv, p = this.player;
    const held = inv.held(), stack = inv.heldStack();
    const t = this.target();
    const sneaking = this.input.sneakRaw;
    // mobs
    if (t && t.mob && first) {
      const e = t.mob;
      if (e.def.npc) { this.openTrade(e); return; }
      if (held && held.key === 'shears' && e.type === 'sheep' && !e.sheared && !e.baby) { e.sheared = true; this.entities.colorSheep(e); this.entities.dropItem('wool_' + e.color, 1 + Math.floor(Math.random() * 3), e.pos.x, e.pos.y + 1, e.pos.z); inv.damageHeld(1); this.swing = 0.25; return; }
      if (held && held.key === 'bucket' && e.type === 'cow' && !e.baby) { inv.replaceHeld('milk_bucket'); this.swing = 0.25; return; }
      if (held && e.def.food && held.key === e.def.food && !e.baby && e.love <= 0) { e.love = 30; inv.consumeHeld(1); for (let i = 0; i < 6; i++) this.entities.particles.spawn(e.pos.x, e.pos.y + e.h, e.pos.z, [1, 0.4, 0.5], 0.6, 0.6); this.swing = 0.25; return; }
      if (held && held.key === 'name_tag') { e.named = true; this.ui.toast('Named your ' + e.def.name); inv.consumeHeld(1); return; }
    }
    // block interactions (sneak skips them)
    if (t && !t.mob && !sneaking && first) {
      const b = BH.BLOCKS[t.id], key = t.x + ',' + t.y + ',' + t.z;
      if (b.interact === 'craft') { this.ui.open('craft'); return; }
      if (b.interact === 'furnace') { this.ui.open('furnace', this.container(key, 'furnace')); return; }
      if (b.interact === 'chest') { this.ui.open('chest', Object.assign(this.container(key, 'chest', t), { title: b.name })); return; }
      if (b.interact === 'bed') { this.sleep(t); return; }
      if (b.key === 'bell') { this.audio.play('bell'); this.swing = 0.25; return; }
      if (b.interact === 'tnt' && held && (held.igniter)) { w.setBlock(t.x, t.y, t.z, 0); this.entities.primeTNT(t.x, t.y, t.z); this.audio.play('hiss'); if (held.key === 'flint_steel') inv.damageHeld(1); else inv.consumeHeld(1); return; }
      if (b.frame && held && held.key === 'seeker_eye' && t.id === ID.rift_frame) {
        w.setBlock(t.x, t.y, t.z, ID.rift_frame_eye, 0); inv.consumeHeld(1); this.audio.play('crystal');
        this.checkRift(t.x, t.y, t.z); return;
      }
    }
    if (!held) return;
    // tools on blocks
    if (t && !t.mob && first) {
      if (held.tool && held.tool.type === 'hoe' && (t.id === ID.grass || t.id === ID.dirt || t.id === ID.grass_path || t.id === ID.coarse_dirt) && !w.getBlock(t.x, t.y + 1, t.z)) {
        w.setBlock(t.x, t.y, t.z, t.id === ID.coarse_dirt ? ID.dirt : ID.farmland); this.audio.play('place', 'dirt'); inv.damageHeld(1); this.swing = 0.25; return;
      }
      if (held.tool && held.tool.type === 'shovel' && t.id === ID.grass && !w.getBlock(t.x, t.y + 1, t.z) && t.ny === 1) { w.setBlock(t.x, t.y, t.z, ID.grass_path); this.audio.play('place', 'dirt'); inv.damageHeld(1); this.swing = 0.25; return; }
      if (held.key === 'bone_meal') { if (this.growAt(t.x, t.y, t.z, true)) { inv.consumeHeld(1); for (let i = 0; i < 8; i++) this.entities.particles.spawn(t.x + Math.random(), t.y + 1, t.z + Math.random(), [0.4, 1, 0.4], 0.5, 0.6); this.swing = 0.25; } return; }
      if (held.igniter) {
        if (t.id === ID.obsidian && this.lightGate(t.x + t.nx, t.y + t.ny, t.z + t.nz)) { this.audio.play('portal'); if (held.key === 'flint_steel') inv.damageHeld(1); else inv.consumeHeld(1); this.goal('gate'); return; }
        this.audio.play('fire'); if (held.key === 'flint_steel') inv.damageHeld(1); else inv.consumeHeld(1);
        for (let i = 0; i < 6; i++) this.entities.particles.spawn(t.x + 0.5 + t.nx * 0.6, t.y + 0.5 + t.ny * 0.6, t.z + 0.5 + t.nz * 0.6, [1, 0.6, 0.1], 0.5, 0.4);
        return;
      }
    }
    // buckets
    if (held.key === 'bucket' && first) {
      const lt = w.raycast(p.eyePos(), p.lookDir(), 4.6, true);
      if (lt && (lt.id === ID.water || lt.id === ID.lava)) { w.setBlock(lt.x, lt.y, lt.z, 0); inv.replaceHeld(lt.id === ID.water ? 'water_bucket' : 'lava_bucket'); this.audio.play('splash'); }
      return;
    }
    // food
    if (held.food !== undefined) {
      if (this.mode === 'creative' && !held.teleport) return;
      if (p.food < 20 || held.key === 'golden_apple' || held.teleport || held.cure) { this.eating = true; return; }
      return;
    }
    if (held.bow) { this.drawing = true; this.drawT = 0; return; }
    if (held.throwable && first) { this.throwHeld(held); return; }
    if (!first) return;
    // placing
    if (!t || t.mob) return;
    let px = t.x + t.nx, py = t.y + t.ny, pz = t.z + t.nz;
    const tb = BH.BLOCKS[t.id];
    if (tb.replaceable && tb.id !== ID.water && tb.id !== ID.lava) { px = t.x; py = t.y; pz = t.z; }
    let placeId = held.block !== undefined ? held.block : held.places ? ID[held.places] : undefined;
    if (placeId === undefined) return;
    const pb = BH.BLOCKS[placeId];
    if (held.places && held.places === 'wheat_0' && w.getBlock(px, py - 1, pz) !== ID.farmland) return;
    if (!this.canPlaceAt(px, py, pz, placeId)) return;
    if ((pb.cross && !pb.climb) || pb.support) { if (!this.plantOk(pb, px, py, pz)) return; }
    let meta = 0;
    if (pb.orient) meta = this.facingMeta();
    if (pb.climb) {
      if (t.ny !== 0) return;
      meta = t.nz === -1 ? 0 : t.nx === 1 ? 1 : t.nz === 1 ? 2 : 3;
    }
    w.setBlock(px, py, pz, placeId, meta);
    this.stats.placed++;
    this.audio.play('place', pb.sound);
    this.swing = 0.25;
    if (held.leaves) inv.replaceHeld(held.leaves);
    else inv.consumeHeld(1);
    if (pb.gravity) this.fallBlock(px, py, pz);
    if (placeId === ID.water && w.dim === 'cinder') { w.setBlock(px, py, pz, 0); this.audio.play('fire'); for (let i = 0; i < 10; i++) this.entities.particles.spawn(px + 0.5, py + 0.5, pz + 0.5, [0.9, 0.9, 0.9], 0.6, 0.8); }
    if (placeId === ID.water) this.flowWater(px, py, pz, 24);
    if (placeId === ID.lava || placeId === ID.water) {
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]]) {
        const n = w.getBlock(px + dx, py + dy, pz + dz);
        if (placeId === ID.water && n === ID.lava) w.setBlock(px + dx, py + dy, pz + dz, ID.obsidian);
        if (placeId === ID.lava && n === ID.water) { w.setBlock(px, py, pz, ID.cobble); break; }
      }
    }
  };
  Game.prototype.releaseUse = function () {
    if (this.drawing) {
      const t = Math.min(1, this.drawT);
      this.drawing = false;
      if (t < 0.15) return;
      const inv = this.inv;
      const hasArrow = this.mode === 'creative' || inv.count(BH.ID.arrow) > 0;
      if (!hasArrow) { this.ui.toast('No arrows'); return; }
      if (this.mode !== 'creative') inv.remove(BH.ID.arrow, 1);
      const p = this.player, d = p.lookDir();
      this.entities.shoot(p.eyePos().addScaledVector(d, 0.5), d, 12 + 36 * t, p, 'arrow');
      this.audio.play('bow');
      inv.damageHeld(1);
    }
    this.eating = false; this.eatT = 0;
  };
  Game.prototype.throwHeld = function (held) {
    const p = this.player, d = p.lookDir();
    if (held.key === 'seeker_eye') {
      const target = this.world.dim === 'over' ? BH.Structures.nearest(this.world.gen, 'archive', p.pos.x, p.pos.z) : null;
      this.eyes = this.eyes || [];
      const mesh = this.ui.spriteMesh(held.id, 0.4);
      mesh.position.copy(p.eyePos());
      this.scene.add(mesh);
      const dir = target ? new THREE.Vector3(target.x - p.pos.x, 0, target.z - p.pos.z) : d.clone().setY(0);
      const dist = dir.length(); dir.normalize();
      this.eyes.push({ mesh, pos: p.eyePos(), dir, t: 0, dist });
      this.inv.consumeHeld(1);
      if (target && dist < 12) this.ui.toast('The Seeker Eye dives into the ground. The Archive is directly below.');
      return;
    }
    const kind = held.key === 'drift_pearl' ? 'pearl' : held.key;
    this.entities.shoot(p.eyePos().addScaledVector(d, 0.4), d, 20, p, kind);
    this.inv.consumeHeld(1);
    this.swing = 0.25;
    this.audio.play('bow');
  };
  Game.prototype.updateEyes = function (dt) {
    if (!this.eyes) return;
    this.eyes = this.eyes.filter(e => {
      e.t += dt;
      const sp = Math.min(e.dist, 12) / 2;
      e.pos.addScaledVector(e.dir, sp * dt);
      e.pos.y += (e.t < 1.2 ? 2.5 : -0.5) * dt;
      e.mesh.position.copy(e.pos);
      e.mesh.lookAt(this.camera.position);
      if (Math.random() < 0.5) this.entities.particles.spawn(e.pos.x, e.pos.y, e.pos.z, [0.3, 0.8, 0.6], 0.1, 0.4);
      if (e.t > 2.2) {
        this.scene.remove(e.mesh);
        if (Math.random() < 0.8) this.entities.dropItem('seeker_eye', 1, e.pos.x, e.pos.y, e.pos.z, new THREE.Vector3(0, 1, 0), 0.5);
        else { this.ui.toast('The Seeker Eye shattered'); for (let i = 0; i < 10; i++) this.entities.particles.spawn(e.pos.x, e.pos.y, e.pos.z, [0.3, 0.8, 0.6], 1, 0.5); }
        return false;
      }
      return true;
    });
  };
  Game.prototype.updateUse = function (dt) {
    if (!this.mouse.right || this.ui.screen || this.paused) { this.eating = false; this.drawing = this.drawing && this.mouse.right; return; }
    if (this.drawing) { this.drawT += dt; return; }
    if (this.eating) {
      const held = this.inv.held();
      if (!held || held.food === undefined) { this.eating = false; return; }
      this.eatT = (this.eatT || 0) + dt;
      this.eatSnd = (this.eatSnd || 0) - dt;
      if (this.eatSnd <= 0) { this.eatSnd = 0.22; this.audio.play('eat'); const d = this.player.lookDir(); const ep = this.player.eyePos().addScaledVector(d, 0.5); for (let i = 0; i < 2; i++) this.entities.particles.spawn(ep.x, ep.y - 0.2, ep.z, [0.8, 0.5, 0.3], 0.3, 0.3); }
      if (this.eatT >= 1.6) { this.eat(held); this.eatT = 0; }
      return;
    }
    // hold to keep placing
    this.useT = (this.useT || 0) + dt;
    if (this.useT > 0.25) { this.useT = 0.05; const held = this.inv.held(); if (held && (held.block !== undefined || held.places)) this.use(true); }
  };
  Game.prototype.eat = function (it) {
    const p = this.player;
    p.food = Math.min(20, p.food + it.food);
    p.sat = Math.min(p.food, p.sat + it.sat);
    if (it.poison && Math.random() < it.poison) p.poison = 5;
    if (it.regen) p.regen = it.regen;
    if (it.cure) { p.poison = 0; p.fire = 0; }
    if (it.teleport) this.randomTeleport();
    this.audio.play('pop');
    if (it.leaves) this.inv.replaceHeld(it.leaves); else this.inv.consumeHeld(1);
    this.eating = this.mouse.right && p.food < 20;
    this.ui.refresh();
  };
  Game.prototype.randomTeleport = function () {
    const p = this.player, w = this.world;
    for (let t = 0; t < 16; t++) {
      const x = Math.floor(p.pos.x + (Math.random() - 0.5) * 16), z = Math.floor(p.pos.z + (Math.random() - 0.5) * 16);
      for (let y = Math.floor(p.pos.y) + 8; y > Math.floor(p.pos.y) - 8; y--) {
        if (BH.BLOCKS[w.getBlock(x, y - 1, z)].solid && !w.getBlock(x, y, z) && !w.getBlock(x, y + 1, z)) { p.pos.set(x + 0.5, y, z + 0.5); p.vel.set(0, 0, 0); p.fall = 0; this.audio.play('teleport'); return; }
      }
    }
  };
  Game.prototype.growAt = function (x, y, z, forced) {
    const w = this.world, ID = BH.ID, id = w.getBlock(x, y, z), b = BH.BLOCKS[id];
    if (b.crop !== undefined && b.crop < 3) { w.setBlock(x, y, z, ID['wheat_' + Math.min(3, b.crop + (forced ? 1 + Math.floor(Math.random() * 2) : 1))]); return true; }
    if (b.sapling && w.gen.tree) {
      if (forced && Math.random() < 0.55) return true;
      const put = (xx, yy, zz, bid, force) => { const c = w.getBlock(xx, yy, zz); if (force || !c || BH.BLOCKS[c].replaceable || BH.BLOCKS[c].cross || (BH.BLOCKS[c].leaves && !BH.BLOCKS[bid].leaves)) w.setBlock(xx, yy, zz, bid); };
      w.setBlock(x, y, z, 0);
      const kinds = { oak: Math.random() < 0.1 ? 'big_oak' : 'oak', birch: 'birch', spruce: 'spruce', jungle: 'jungle', acacia: 'acacia', dark_oak: 'dark_oak' };
      w.gen.tree(kinds[b.sapling], x, y, z, put, Math.random);
      return true;
    }
    if (id === ID.grass && forced) {
      for (let k = 0; k < 10; k++) { const xx = x + Math.floor((Math.random() - 0.5) * 6), zz = z + Math.floor((Math.random() - 0.5) * 6); if (w.getBlock(xx, y, zz) === ID.grass && !w.getBlock(xx, y + 1, zz)) w.setBlock(xx, y + 1, zz, Math.random() < 0.85 ? ID.tall_grass : (Math.random() < 0.5 ? ID.dandelion : ID.poppy)); }
      return true;
    }
    return false;
  };
  Game.prototype.randomTicks = function () {
    const w = this.world, ID = BH.ID, p = this.player;
    const pcx = Math.floor(p.pos.x / 16), pcz = Math.floor(p.pos.z / 16);
    for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) {
      const ch = w.chunk(pcx + a, pcz + b); if (!ch) continue;
      for (let k = 0; k < 3; k++) {
        const lx = (Math.random() * 16) | 0, lz = (Math.random() * 16) | 0, y = 1 + ((Math.random() * Math.max(1, ch.maxY)) | 0);
        const x = ch.cx * 16 + lx, z = ch.cz * 16 + lz;
        const id = ch.data[BH.chunkIdx(lx, y, lz)];
        if (!id) continue;
        const bl = BH.BLOCKS[id];
        if (bl.crop !== undefined && bl.crop < 3 && Math.random() < 0.35) this.growAt(x, y, z, false);
        else if (bl.sapling && Math.random() < 0.12 && !w.getBlock(x, y + 1, z)) this.growAt(x, y, z, false);
        else if (id === ID.dirt && !w.getBlock(x, y + 1, z) && w.dim === 'over') {
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let dy = -1; dy <= 1; dy++) if (w.getBlock(x + dx, y + dy, z + dz) === ID.grass) { w.setBlock(x, y, z, ID.grass); return; }
        } else if ((bl.cane || bl.cactus) && !w.getBlock(x, y + 1, z) && Math.random() < 0.25) {
          let h = 1; while (w.getBlock(x, y - h, z) === id) h++;
          if (h < 3) w.setBlock(x, y + 1, z, id);
        } else if (bl.leaves && Math.random() < 0.4 && w.dim === 'over') {
          // leaves far from any log decay
          let near = false;
          for (let dy = -4; dy <= 4 && !near; dy++) for (let dz = -4; dz <= 4 && !near; dz++) for (let dx = -4; dx <= 4 && !near; dx++) { const n = w.getBlock(x + dx, y + dy, z + dz); if (n && BH.BLOCKS[n].log) near = true; }
          if (!near && w.getMeta(x, y, z) === 0) { w.setBlock(x, y, z, 0); this.spawnDrops(bl, x, y, z, null); }
        }
      }
    }
  };

  // ---------- containers, furnaces, trading
  Game.prototype.container = function (key, type, t) {
    const w = this.world;
    let c = w.blockData.get(key);
    if (!c) {
      c = { type, slots: new Array(type === 'furnace' ? 3 : 27).fill(null), burn: 0, burnMax: 0, cook: 0 };
      if (type === 'chest' && t) {
        const ch = w.chunk(t.x >> 4, t.z >> 4);
        const i = BH.chunkIdx(t.x & 15, t.y, t.z & 15);
        const table = ch && ch.loot.get(i);
        if (table) c.slots = BH.Structures.rollLoot(table, BH.mulberry32((t.x * 7349) ^ (t.y * 113) ^ (t.z * 9001) ^ this.seed));
      }
      w.blockData.set(key, c);
      if (type === 'chest' && t) { const m = w.mods; /* mark the chest as touched so its loot does not regenerate */ w.setBlock(t.x, t.y, t.z, w.getBlock(t.x, t.y, t.z), w.getMeta(t.x, t.y, t.z)); }
    }
    return c;
  };
  Game.prototype.updateFurnaces = function (dt) {
    const w = this.world, ID = BH.ID;
    w.blockData.forEach((c, key) => {
      if (c.type !== 'furnace') return;
      const [x, y, z] = key.split(',').map(Number);
      if (!w.loaded(x, z)) return;
      const inp = c.slots[0], fuel = c.slots[1], out = c.slots[2];
      const res = inp && BH.SMELT[BH.ITEMS[inp.id].key];
      const resId = res ? BH.ID[res] : -1;
      const canOut = res && (!out || (out.id === resId && out.n < BH.ITEMS[resId].stack));
      if (c.burn <= 0 && canOut && fuel) {
        const fi = BH.ITEMS[fuel.id];
        const fv = fi.fuel || (fi.block !== undefined && BH.BLOCKS[fi.block].fuel) || 0;
        if (fv) {
          c.burn = c.burnMax = fv / 8 * 10 / 10 * 10; // seconds: 80-fuel coal smelts 8 items at 10s each
          c.burn = c.burnMax = fv;
          if (fi.leaves) c.slots[1] = { id: BH.ID[fi.leaves], n: 1, dur: 0 };
          else { fuel.n--; if (!fuel.n) c.slots[1] = null; }
        }
      }
      const lit = c.burn > 0;
      if (lit) c.burn -= dt;
      if (lit && canOut) {
        c.cook += dt;
        if (c.cook >= 10) {
          c.cook = 0;
          inp.n--; if (!inp.n) c.slots[0] = null;
          if (c.slots[2]) c.slots[2].n++; else c.slots[2] = { id: resId, n: 1, dur: 0 };
          if (res === 'iron_ingot') this.goal('iron');
          if (res === 'duskiron_ingot') this.goal('duskiron');
        }
      } else c.cook = Math.max(0, c.cook - dt * 2);
      const id = w.getBlock(x, y, z);
      if (lit && id === ID.furnace) w.setBlock(x, y, z, ID.furnace_lit, w.getMeta(x, y, z));
      if (!lit && id === ID.furnace_lit) w.setBlock(x, y, z, ID.furnace, w.getMeta(x, y, z));
    });
    if (this.ui.screen === 'furnace') { this.furnUiT = (this.furnUiT || 0) + dt; if (this.furnUiT > 0.2) { this.furnUiT = 0; this.ui.renderScreen(); } }
  };
  Game.prototype.openTrade = function (e) {
    const prof = e.prof || 'farmer';
    const T = TRADES[prof];
    this.ui.open('trade', { title: T.title, trades: T.t });
  };
  Game.prototype.doTrade = function (npc, i) {
    const t = npc.trades[i], inv = this.inv;
    const giveId = BH.ID[t.give[0]];
    if (inv.count(giveId) < t.give[1]) { this.audio.play('click'); return; }
    inv.remove(giveId, t.give[1]);
    const left = inv.add(BH.ID[t.get[0]], t.get[1]);
    if (left) this.entities.dropItem(t.get[0], left, this.player.pos.x, this.player.pos.y + 1, this.player.pos.z);
    this.player.xp += 2;
    this.audio.play('pop');
    this.ui.renderScreen();
  };
  Game.prototype.sleep = function (t) {
    const p = this.player;
    this.player.spawn = { x: t.x + 0.5, y: t.y + 1, z: t.z + 0.5 };
    if (this.world.dim !== 'over') { this.ui.toast('Beds do not work here!'); this.entities.explode(t.x + 0.5, t.y + 0.5, t.z + 0.5, 4); return; }
    const night = this.daylight < 0.35;
    if (!night) { this.ui.toast('Spawn point set. You can only sleep at night.'); return; }
    if (this.entities.list.some(e => e.def.hostile && e.pos.distanceTo(p.pos) < 10)) { this.ui.toast('You may not rest now; there are monsters nearby.'); return; }
    $('#fade').classList.add('on');
    setTimeout(() => { this.time = Math.ceil(this.time / DAY) * DAY + DAY * 0.02; $('#fade').classList.remove('on'); this.ui.toast('Good morning. Spawn point set.'); this.save(); }, 900);
  };

  // ---------- portals
  Game.prototype.lightGate = function (x, y, z) {
    const w = this.world, ID = BH.ID;
    if (w.getBlock(x, y, z)) return false;
    for (const axis of ['x', 'z']) {
      const cells = [], seen = new Set([x + ',' + y + ',' + z]), stack = [[x, y, z]];
      let ok = true;
      while (stack.length) {
        const [a, b, c] = stack.pop();
        cells.push([a, b, c]);
        if (cells.length > 441) { ok = false; break; }
        const nb = axis === 'x' ? [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]] : [[0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]];
        for (const [dx, dy, dz] of nb) {
          const k = (a + dx) + ',' + (b + dy) + ',' + (c + dz);
          if (seen.has(k)) continue;
          const id = w.getBlock(a + dx, b + dy, c + dz);
          if (id === ID.obsidian) continue;
          if (id) { ok = false; break; }
          seen.add(k); stack.push([a + dx, b + dy, c + dz]);
        }
        if (!ok) break;
      }
      if (!ok) continue;
      const ys = cells.map(c => c[1]), hs = cells.map(c => axis === 'x' ? c[0] : c[2]);
      if (Math.max(...ys) - Math.min(...ys) < 2 || Math.max(...hs) - Math.min(...hs) < 1) continue;
      cells.forEach(([a, b, c]) => w.setBlock(a, b, c, ID.ember_gate, axis === 'x' ? 0 : 1));
      return true;
    }
    return false;
  };
  Game.prototype.checkRift = function (x, y, z) {
    const w = this.world, ID = BH.ID;
    // find the 2x2 hole the frame ring surrounds: scan nearby for a ring of 8 frames all with eyes
    for (let ox = -4; ox <= 1; ox++) for (let oz = -4; oz <= 1; oz++) {
      const cx = x + ox, cz = z + oz;
      const ring = BH.RIFT_RING;
      let frames = 0, eyes = 0;
      ring.forEach(([dx, dz]) => { const id = w.getBlock(cx + dx, y, cz + dz); if (id === ID.rift_frame || id === ID.rift_frame_eye) frames++; if (id === ID.rift_frame_eye) eyes++; });
      if (frames === 8) {
        if (eyes === 8) {
          for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) w.setBlock(cx + a, y, cz + b, ID.rift_portal);
          this.audio.play('portal'); this.ui.toast('The Rift is open.', true); this.goal('archive');
        } else this.ui.toast(eyes + ' of 8 Seeker Eyes placed');
        return;
      }
    }
  };
  Game.prototype.updatePortal = function (dt) {
    const p = this.player, w = this.world, ID = BH.ID;
    if (p.portalCd > 0) { p.portalT = 0; $('#portalfx').style.opacity = 0; return; }
    const id = w.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y + 0.5), Math.floor(p.pos.z));
    const id2 = w.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y - 0.2), Math.floor(p.pos.z));
    const b = BH.BLOCKS[id], b2 = BH.BLOCKS[id2];
    const portal = b.portal || (b2.portal && b2.portal !== 'cinder' ? b2.portal : null);
    $('#portalfx').style.opacity = portal === 'cinder' ? Math.min(1, p.portalT / 3) : 0;
    if (!portal) { p.portalT = 0; return; }
    if (portal === 'cinder') {
      p.portalT += dt;
      if (p.portalT === dt) this.audio.play('portal');
      if (p.portalT < (this.mode === 'creative' ? 0.5 : 3.5)) return;
      p.portalT = 0; p.portalCd = 5;
      if (w.dim === 'over') this.travelGate('cinder', p.pos.x / 8, p.pos.z / 8);
      else this.travelGate('over', p.pos.x * 8, p.pos.z * 8);
    } else if (portal === 'hollow') {
      p.portalCd = 5; this.travelHollow();
    } else if (portal === 'home') {
      p.portalCd = 5;
      const meta = w.getMeta(Math.floor(p.pos.x), Math.floor(p.pos.y + 0.5), Math.floor(p.pos.z)) || w.getMeta(Math.floor(p.pos.x), Math.floor(p.pos.y - 0.2), Math.floor(p.pos.z));
      if (meta === 1) this.travelOuter(); else this.travelHome();
    }
  };
  Game.prototype.withLoading = function (fn) {
    $('#loading').hidden = false;
    $('#loading p').textContent = 'Travelling…';
    setTimeout(fn, 30);
  };
  Game.prototype.travelGate = function (dim, x, z) {
    this.withLoading(() => {
      const fromDim = this.world.dim;
      this.enterDim(dim, new THREE.Vector3(x, 70, z));
      this.pendingArrival = { kind: 'gate', x: Math.floor(x), z: Math.floor(z), fromDim };
      this.awaitSpawn = true;
      if (dim === 'cinder') this.goal('cinder');
    });
  };
  Game.prototype.travelHollow = function () {
    this.withLoading(() => {
      this.enterDim('hollow', new THREE.Vector3(100.5, 59, 0.5));
      this.pendingArrival = { kind: 'hollow' };
      this.awaitSpawn = true;
      this.goal('hollow');
    });
  };
  Game.prototype.travelHome = function () {
    this.withLoading(() => {
      const sp = this.player.spawn || { x: this.worldSpawn.x + 0.5, y: 140, z: this.worldSpawn.z + 0.5 };
      this.enterDim('over', new THREE.Vector3(sp.x, sp.y, sp.z));
      this.pendingArrival = { kind: 'home', bed: !!this.player.spawn };
      this.awaitSpawn = true;
    });
  };
  Game.prototype.travelOuter = function () {
    const p = this.player;
    this.pendingArrival = { kind: 'outer' };
    p.pos.set(560.5, 90, 0.5); p.vel.set(0, 0, 0);
    this.awaitSpawn = true;
  };
  // Runs once chunks around the arrival point exist.
  Game.prototype.arrive = function () {
    const w = this.world, p = this.player, a = this.pendingArrival, ID = BH.ID;
    this.pendingArrival = null;
    if (!a) {
      // initial world spawn: an open column whose top is ground, not a tree or water
      const bx = Math.floor(p.pos.x), bz = Math.floor(p.pos.z);
      let best = null;
      for (let r = 0; r < 24 && !best; r++) for (let dx = -r; dx <= r && !best; dx++) for (let dz = -r; dz <= r && !best; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = bx + dx, z = bz + dz, y = w.surfaceY(x, z), top = BH.BLOCKS[w.getBlock(x, y, z)];
        if (!top.leaves && !top.log && !top.liquid && !w.getBlock(x, y + 1, z) && !w.getBlock(x, y + 2, z) && y >= BH.SEA) best = { x, y, z };
      }
      if (best) p.pos.set(best.x + 0.5, best.y + 1, best.z + 0.5);
      else p.pos.y = w.surfaceY(bx, bz) + 1;
      return;
    }
    if (a.kind === 'gate') {
      // look for an existing gate nearby
      let found = null;
      const R = 16;
      for (let dx = -R; dx <= R && !found; dx++) for (let dz = -R; dz <= R && !found; dz++) for (let y = 4; y < 124; y++) if (w.getBlock(a.x + dx, y, a.z + dz) === ID.ember_gate && w.getBlock(a.x + dx, y - 1, a.z + dz) !== ID.ember_gate) { found = { x: a.x + dx, y, z: a.z + dz }; break; }
      if (!found) found = this.buildGate(a.x, a.z);
      p.pos.set(found.x + 0.5, found.y, found.z + 0.5);
      p.portalCd = 4;
    } else if (a.kind === 'hollow') {
      p.pos.set(100.5, 59, 0.5);
      this.ui.toast('The Hollow. Destroy the Warding Crystals atop the pillars, then defeat the Warden.', true);
    } else if (a.kind === 'home') {
      if (a.bed) { p.pos.y = this.player.spawn.y; }
      else { const y = w.surfaceY(Math.floor(p.pos.x), Math.floor(p.pos.z)); p.pos.y = y + 1; }
    } else if (a.kind === 'outer') {
      let y = w.surfaceY(560, 0);
      if (y < 10) { for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) w.setBlock(560 + dx, 60, dz, ID.voidstone); y = 60; }
      p.pos.set(560.5, y + 1, 0.5);
      this.ui.toast('The Outer Hollow. Look for the lumen spires.', true);
    }
  };
  Game.prototype.buildGate = function (x, z) {
    const w = this.world, ID = BH.ID;
    let y = null;
    if (w.dim === 'cinder') { const s = w.gen.spawnPoint(w, x, z); if (s) { x = s.x; z = s.z; y = s.y; } else y = 70; }
    else { y = w.surfaceY(x, z) + 1; if (y < BH.SEA) y = BH.SEA + 1; }
    // platform, frame and clear interior
    for (let dx = -1; dx <= 4; dx++) for (let dz = -2; dz <= 2; dz++) {
      w.setBlock(x + dx, y - 1, z + dz, ID.obsidian);
      for (let k = 0; k < 5; k++) if (dz !== 0) w.setBlock(x + dx, y + k, z + dz, 0);
    }
    for (let u = 0; u < 4; u++) for (let v = -1; v < 5; v++) {
      const edge = u === 0 || u === 3 || v === -1 || v === 4;
      w.setBlock(x + u, y + v, z, edge ? ID.obsidian : ID.ember_gate, 0);
    }
    return { x: x + 1, y, z };
  };

  // ---------- the Hollow boss
  Game.prototype.updateBoss = function () {
    const w = this.world;
    const bar = $('#bossbar');
    if (w.dim !== 'hollow') { bar.hidden = true; return; }
    if (!this.state.wardenDead && !this.bossSpawned && w.chunk(0, 0)) {
      this.bossSpawned = true;
      this.warden = this.entities.spawnMob('warden', 0, 84, 30);
      w.gen.pillars.forEach((pl, i) => { if (!this.state.crystals.includes(i)) { const c = this.entities.spawnMob('crystal', pl.x + 0.5, pl.h + 2, pl.z + 0.5); c.pillar = i; } });
    }
    const wd = this.warden;
    if (wd && !wd.dead) {
      bar.hidden = false;
      $('#bossfill').style.width = (wd.hp / wd.def.hp * 100) + '%';
      const cr = this.entities.list.filter(e => e.def.crystal && !e.dead).length;
      $('#bossname').textContent = 'The Hollow Warden' + (cr ? ` · ${cr} Warding Crystal${cr > 1 ? 's' : ''} remain` : '');
    } else bar.hidden = true;
  };
  Game.prototype.onCrystalDestroyed = function (e) { if (e.pillar !== undefined) this.state.crystals.push(e.pillar); };
  Game.prototype.onBossDefeated = function (e) {
    const w = this.world, ID = BH.ID;
    this.state.wardenDead = true;
    for (let i = 0; i < 120; i++) this.entities.particles.spawn(e.pos.x + (Math.random() - 0.5) * 4, e.pos.y + Math.random() * 4, e.pos.z + (Math.random() - 0.5) * 4, [0.6, 1, 0.8], 3, 2);
    this.audio.play('roar');
    const top = w.surfaceY(0, 0);
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      const d = Math.max(Math.abs(dx), Math.abs(dz));
      w.setBlock(dx, top, dz, d === 3 ? ID.voidstone_bricks : d <= 1 ? ID.exit_portal : ID.voidstone_bricks, 0);
    }
    for (let k = 1; k <= 4; k++) w.setBlock(0, top + k, 0, ID.voidstone_bricks);
    w.setBlock(0, top + 5, 0, ID.hollow_lantern);
    // gateway to the Outer Hollow
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) w.setBlock(dx, 72, 50 + dz, Math.abs(dx) + Math.abs(dz) === 0 ? ID.exit_portal : ID.voidstone_bricks, 1);
    w.setBlock(0, 72, 50, ID.exit_portal, 1);
    this.entities.dropItem('warden_heart', 1, 0.5, top + 2, 0.5);
    this.goal('warden');
    setTimeout(() => this.showVictory(), 2500);
  };
  Game.prototype.showVictory = function () {
    document.exitPointerLock && document.exitPointerLock();
    const v = $('#victory');
    v.querySelector('.vstats').textContent = `Blocks mined: ${this.stats.mined} · placed: ${this.stats.placed} · creatures defeated: ${this.stats.kills} · items crafted: ${this.stats.crafted}`;
    v.hidden = false;
    this.paused = true;
  };

  // ---------- goals
  Game.prototype.goal = function (k) {
    if (!this.state || this.state.goals[k] || this.mode !== 'survival') return;
    this.state.goals[k] = true;
    const g = GOALS.find(x => x[0] === k);
    if (g) { this.ui.toast('Journal: ' + g[1] + ' complete'); this.audio.play('level'); }
  };
  Game.prototype.onCraft = function (key) {
    if (key === 'crafting_table') this.goal('table');
    if (key === 'seeker_eye') this.goal('eye');
    if (key === 'duskiron_ingot') this.goal('duskiron');
  };
  Game.prototype.checkInventoryGoals = function () {
    const inv = this.inv;
    const has = k => inv.count(BH.ID[k]) > 0;
    if (has('ember_rod')) this.goal('rod');
    if (has('drift_cloak') || (inv.armor[1] && BH.ITEMS[inv.armor[1].id].key === 'drift_cloak')) this.goal('cloak');
    if (has('diamond')) this.goal('diamond');
    if (has('iron_ingot')) this.goal('iron');
    if (has('duskiron_ingot')) this.goal('duskiron');
    if ([...BH.BLOCKS].some(b => b.log && has(b.key))) this.goal('wood');
  };
  Game.prototype.openJournal = function () {
    this.pause(false);
    $('#pause').hidden = true;
    const list = $('#goals');
    const next = GOALS.find(g => !this.state.goals[g[0]]);
    list.innerHTML = GOALS.map(g => `<li class="${this.state.goals[g[0]] ? 'done' : ''} ${next === g ? 'next' : ''}"><b>${g[1]}</b><span>${g[2]}</span></li>`).join('');
    $('#journal').hidden = false;
  };

  // ---------- death
  Game.prototype.die = function (cause) {
    const p = this.player;
    p.dead = true;
    const msgs = { fall: 'hit the ground too hard', lava: 'tried to swim in lava', fire: 'burned to death', drown: 'drowned', starve: 'starved to death', void: 'fell out of the world', explosion: 'blew up', poison: 'succumbed to poison', cactus: 'was pricked to death', suffocate: 'suffocated in a wall', arrow: 'was shot' };
    $('#deathmsg').textContent = 'You ' + (msgs[cause] || 'were slain by ' + cause);
    $('#deathscore').textContent = 'Experience: ' + p.xp;
    if (this.mode === 'survival') {
      this.inv.slots.forEach((s, i) => { if (s) { this.entities.dropItem(s.id, s.n, p.pos.x, p.pos.y + 1, p.pos.z, new THREE.Vector3((Math.random() - 0.5) * 6, 4, (Math.random() - 0.5) * 6), 1); s.dropped = true; this.inv.slots[i] = null; } });
      this.inv.armor.forEach((s, i) => { if (s) { this.entities.dropItem(s.id, s.n, p.pos.x, p.pos.y + 1, p.pos.z, null, 1); this.entities.items[this.entities.items.length - 1].dur = s.dur; this.inv.armor[i] = null; } });
      const xpDrop = Math.min(100, p.xp);
      p.xp = Math.floor(p.xp / 2) - Math.floor(xpDrop / 4);
      if (p.xp < 0) p.xp = 0;
    }
    if (this.ui.screen) this.ui.close();
    document.exitPointerLock && document.exitPointerLock();
    $('#death').hidden = false;
  };
  Game.prototype.respawn = function () {
    const p = this.player;
    $('#death').hidden = true;
    p.dead = false; p.hp = 20; p.food = 20; p.sat = 5; p.air = 15; p.fire = 0; p.poison = 0; p.fall = 0; p.vel.set(0, 0, 0);
    if (this.world.dim !== 'over') { this.travelHome(); }
    else {
      const sp = p.spawn;
      if (sp && BH.BLOCKS[this.world.getBlock(Math.floor(sp.x), Math.floor(sp.y) - 1, Math.floor(sp.z))].interact === 'bed') p.pos.set(sp.x, sp.y, sp.z);
      else { if (sp) this.ui.toast('Your bed was missing or obstructed'); p.spawn = null; p.pos.set(this.worldSpawn.x + 0.5, 140, this.worldSpawn.z + 0.5); this.pendingArrival = null; this.awaitSpawn = true; }
    }
    this.ui.refresh();
    this.lockPointer();
  };

  Game.prototype.dropHeld = function (all) {
    const s = this.inv.heldStack(); if (!s) return;
    const p = this.player, d = p.lookDir();
    const n = all ? s.n : 1;
    const e = this.entities.dropItem(s.id, n, p.pos.x + d.x * 0.4, p.pos.y + p.eye - 0.3, p.pos.z + d.z * 0.4, d.clone().multiplyScalar(5).setY(d.y * 5 + 1.5), 1.5);
    if (e) e.dur = s.dur;
    if (this.mode !== 'creative') { s.n -= n; if (!s.n) this.inv.slots[this.inv.sel] = null; }
    this.ui.refresh();
  };
  Game.prototype.pickBlock = function () {
    const t = this.target(); if (!t || t.mob) return;
    let id = t.id; const b = BH.BLOCKS[id];
    if (b.drop && BH.ID[b.drop] !== undefined && (b.hidden || id === BH.ID.furnace_lit)) id = BH.ID[b.drop];
    const i = this.inv.slots.findIndex((s, k) => k < 9 && s && s.id === id);
    if (i >= 0) { this.inv.sel = i; }
    else if (this.mode === 'creative') { this.inv.slots[this.inv.sel] = { id, n: BH.ITEMS[id].stack, dur: 0 }; }
    else { const j = this.inv.slots.findIndex(s => s && s.id === id); if (j >= 9) { const tmp = this.inv.slots[this.inv.sel]; this.inv.slots[this.inv.sel] = this.inv.slots[j]; this.inv.slots[j] = tmp; } }
    this.ui.refresh(); this.ui.showHeldName();
  };

  // ---------- held item & camera
  Game.prototype.updateHeld = function (dt) {
    const s = this.inv.heldStack();
    const id = s ? s.id : -2;
    if (id !== this.heldId) {
      if (this.heldMesh) this.hudScene.remove(this.heldMesh);
      this.heldId = id;
      if (s) {
        const it = BH.ITEMS[s.id];
        if (it.block !== undefined && !BH.BLOCKS[it.block].cross) { this.heldMesh = this.ui.blockMesh(it.block, 0.4); this.heldBlock = true; }
        else { this.heldMesh = this.ui.spriteMesh(s.id, 0.62); this.heldBlock = false; }
      } else {
        this.heldMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.55), new THREE.MeshLambertMaterial({ color: 0xc89a78 }));
        this.heldBlock = null;
      }
      this.hudScene.add(this.heldMesh);
      this.equipT = 0.2;
    }
    this.equipT = Math.max(0, (this.equipT || 0) - dt);
    this.swing = Math.max(0, (this.swing || 0) - dt);
    if (this.swingHold && this.mouse.left && this.swing <= 0) this.swing = 0.25;
    this.swingHold = false;
    const m = this.heldMesh, p = this.player;
    const sw = this.swing > 0 ? Math.sin((1 - this.swing / 0.25) * Math.PI) : 0;
    const bob = Math.sin(p.bob) * 0.02, bobY = Math.abs(Math.cos(p.bob)) * 0.02;
    let x = 0.5 + bob, y = -0.48 + bobY - this.equipT * 1.5, z = -0.85;
    m.rotation.set(0, 0, 0);
    if (this.heldBlock === true) { m.rotation.set(0, Math.PI / 4, 0); x = 0.48; y += 0.05; }
    else if (this.heldBlock === false) { m.rotation.set(0, -Math.PI / 2 + 0.3, 0.35); x = 0.52; y += 0.08; }
    else { m.rotation.set(-0.2, 0.1, 0); x = 0.42; y = -0.42 + bobY; z = -0.6; }
    if (this.eating && this.eatT > 0.1) { x = 0.15; y = -0.3 + Math.sin(this.eatT * 20) * 0.03; }
    if (this.drawing) { x = 0.2; y = -0.32; m.rotation.z += 0.4; z = -0.7 + Math.min(1, this.drawT) * 0.08; }
    m.position.set(x - sw * 0.25, y + sw * 0.15, z - sw * 0.15);
    m.rotation.x -= sw * 0.9;
    const L = BH.lightAt(this.world, p.pos.x, p.pos.y + p.eye, p.pos.z, this.daylight);
    BH.shadeObject(m, 0.25 + 0.75 * Math.max(L.v, this.world.dim === 'cinder' ? 0.6 : this.world.dim === 'hollow' ? 0.6 : 0));
  };
  Game.prototype.updateCamera = function (dt) {
    const p = this.player, cam = this.camera;
    const bobOn = p.onGround && !p.flying;
    const bx = bobOn ? Math.sin(p.bob) * 0.04 : 0, by = bobOn ? Math.abs(Math.cos(p.bob)) * 0.05 : 0;
    cam.position.set(p.pos.x + Math.cos(p.yaw) * bx, p.pos.y + p.eye + by, p.pos.z - Math.sin(p.yaw) * bx);
    cam.rotation.set(p.pitch, p.yaw, p.hurtT > 0 ? Math.sin(p.hurtT * 20) * 0.03 : 0);
    const targetFov = this.settings.fov * (p.sprint ? 1.12 : 1) * (this.drawing ? 1 - Math.min(1, this.drawT) * 0.15 : 1);
    cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 10);
    cam.updateProjectionMatrix();
  };

  // ---------- main loop
  Game.prototype.frame = function (now) {
    requestAnimationFrame(t => this.frame(t));
    const dt = Math.min(0.05, this.clock.getDelta());
    this.frames++; this.fpsT += dt;
    if (this.fpsT >= 1) { this.fps = this.frames; this.frames = 0; this.fpsT = 0; }
    if (!this.running) { this.renderer.clear(); this.renderer.render(this.menuScene || this.scene, this.camera); return; }
    const p = this.player, w = this.world;
    w.update(p.pos.x, p.pos.z, this.awaitSpawn ? 40 : 7);
    if (this.awaitSpawn) {
      const c = w.chunk(Math.floor(p.pos.x / 16), Math.floor(p.pos.z / 16));
      const ready = c && c.meshes && w.chunks.size > 20;
      $('#loading p').textContent = ready ? 'Ready' : 'Generating terrain… ' + w.chunks.size + ' chunks';
      if (ready) { this.awaitSpawn = false; this.arrive(); $('#loading').hidden = true; }
      this.updateSky(dt); this.updateCamera(dt);
      this.renderer.clear(); this.renderer.render(this.scene, this.camera);
      return;
    }
    if (!this.paused) {
      this.time += dt;
      this.readInput();
      if (!this.ui.screen && !p.dead) p.update(dt, this.input);
      else p.update(dt, { f: 0, s: 0, jump: false, sneak: false, sneakRaw: false, sprint: false });
      this.input.flyToggle = false;
      this.entities.update(dt);
      this.updateBreaking(dt);
      this.updateUse(dt);
      this.updateFurnaces(dt);
      this.updatePortal(dt);
      this.updateEyes(dt);
      this.updateBoss();
      this.tickT = (this.tickT || 0) + dt;
      if (this.tickT > 0.05) { this.tickT = 0; this.randomTicks(); }
      this.npcT = (this.npcT || 0) + dt;
      if (this.npcT > 1) { this.npcT = 0; this.spawnNPCs(); this.checkInventoryGoals(); }
      this.saveT = (this.saveT || 0) + dt;
      if (this.saveT > 30) { this.saveT = 0; this.save(); }
      if (w.dim === 'over' && p.pos.y < 40 && Math.random() < dt / 40) this.audio.play('cave');
    }
    this.updateSky(dt);
    this.updateCamera(dt);
    this.updateHeld(dt);
    // target highlight
    const t = !this.ui.screen && !p.dead ? this.target() : null;
    if (t && !t.mob) { this.highlight.visible = true; this.highlight.position.set(t.x + 0.5, t.y + 0.5, t.z + 0.5); }
    else this.highlight.visible = false;
    // overlays
    $('#hurt').style.opacity = p.hurtT > 0 ? p.hurtT * 2 : (p.hp <= 4 && this.mode === 'survival' ? 0.25 + Math.sin(this.time * 4) * 0.1 : 0);
    $('#water').style.opacity = p.underwater ? 0.35 : 0;
    $('#fire').style.opacity = p.fire > 0 && this.mode === 'survival' ? 0.55 : 0;
    if (this.debug) this.updateDebug();
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (!p.dead && !$('#hud').classList.contains('hidehud')) { this.renderer.clearDepth(); this.renderer.render(this.hudScene, this.hudCam); }
  };
  Game.prototype.spawnNPCs = function () {
    const w = this.world, p = this.player;
    const pcx = Math.floor(p.pos.x / 16), pcz = Math.floor(p.pos.z / 16);
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) {
      const ch = w.chunk(pcx + a, pcz + b); if (!ch || !ch.npcs.length || !ch.meshes) continue;
      ch.npcs.forEach(n => {
        const k = Math.floor(n.x) + ',' + n.y + ',' + Math.floor(n.z);
        if (this.spawnedNPC.has(k)) return;
        this.spawnedNPC.add(k);
        const e = this.entities.spawnMob('settler', n.x, n.y, n.z, { prof: n.prof });
        const hat = { farmer: 0xc8a840, smith: 0x3a3a3a, librarian: 0xe8e0d0, butcher: 0xd04040, mason: 0x7a7a7a, cleric: 0x8a3ac0 }[n.prof] || 0xc8a840;
        e.model.mats.forEach(m => { if (m.userData.base && m.userData.base.getHex() === 0xc8a840) m.userData.base.setHex(hat); });
      });
    }
  };
  Game.prototype.updateDebug = function () {
    const p = this.player, w = this.world;
    const x = Math.floor(p.pos.x), y = Math.floor(p.pos.y), z = Math.floor(p.pos.z);
    const L = BH.lightAt(w, x, y + 1, z, this.daylight);
    const dirs = ['north', 'west', 'south', 'east'];
    const yaw = ((p.yaw % 6.283) + 6.283) % 6.283;
    $('#debug').textContent = [
      `Blockhaven · ${this.fps} fps · ${w.chunks.size} chunks · ${this.entities.list.length} creatures`,
      `XYZ: ${p.pos.x.toFixed(2)} / ${p.pos.y.toFixed(2)} / ${p.pos.z.toFixed(2)}`,
      `Chunk: ${x >> 4}, ${z >> 4} · Dimension: ${{ over: 'Overworld', cinder: 'Cinderdeep', hollow: 'Hollow' }[w.dim]}`,
      `Facing: ${dirs[Math.round(yaw / 1.5708) % 4]}`,
      `Biome: ${w.biomeAt(x, z).name}`,
      `Light: sky ${L.sky.toFixed(2)} block ${L.bl.toFixed(2)} · Day ${((this.time % DAY) / DAY * 24).toFixed(1)}h`,
      `Seed: ${this.seed} · ${this.mode} · ${this.difficulty}`,
    ].join('\n');
  };

  // ---------- pause / menus / save
  Game.prototype.pause = function (show) {
    if (!this.running) return;
    this.paused = true;
    this.keys = {}; this.mouse.left = this.mouse.right = false;
    $('#pause').hidden = !show;
    if (show) this.save();
  };
  Game.prototype.resume = function () {
    $('#pause').hidden = true; $('#journal').hidden = true; $('#victory').hidden = true; $('#settings').hidden = true;
    this.paused = false;
    this.lockPointer();
  };
  Game.prototype.save = function () {
    if (!this.running || !this.player) return;
    const dims = {};
    Object.keys(this.dims).forEach(k => {
      const w = this.dims[k], mods = {};
      w.mods.forEach((m, ck) => { const a = []; m.forEach((v, i) => a.push(i, v)); mods[ck] = a; });
      const data = {}; w.blockData.forEach((v, kk) => data[kk] = v);
      dims[k] = { mods, data };
    });
    // keep dims we haven't loaded this session
    if (this.pendingSave && this.pendingSave.dims) Object.keys(this.pendingSave.dims).forEach(k => { if (!dims[k]) dims[k] = this.pendingSave.dims[k]; });
    const p = this.player;
    const data = {
      v: 1, seed: this.seed, mode: this.mode, difficulty: this.difficulty, time: this.time, worldSpawn: this.worldSpawn,
      player: { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, pitch: p.pitch, hp: p.hp, food: p.food, sat: p.sat, xp: p.xp, spawn: p.spawn, dim: this.world.dim, dead: p.dead },
      inv: this.inv.slots, armor: this.inv.armor, sel: this.inv.sel, state: this.state, stats: this.stats, dims,
    };
    if (!store(SAVE_KEY, data)) this.ui && this.ui.toast('Could not save (browser storage unavailable or full)');
  };
  Game.prototype.loadGame = function () {
    const d = load(SAVE_KEY); if (!d) return false;
    this.seed = d.seed; this.mode = d.mode; this.difficulty = d.difficulty; this.peaceful = d.difficulty === 'peaceful';
    this.time = d.time; this.worldSpawn = d.worldSpawn;
    this.dims = {}; this.pendingSave = d;
    this.state = Object.assign({ wardenDead: false, crystals: [], goals: {} }, d.state);
    this.stats = d.stats || this.stats;
    this.inv = new BH.Inventory(this);
    this.inv.slots = d.inv; this.inv.armor = d.armor; this.inv.sel = d.sel || 0;
    this.player = new BH.Player(this);
    this.ui = new BH.UI(this); this.ui.bind();
    const p = this.player, s = d.player;
    Object.assign(p, { hp: s.hp, food: s.food, sat: s.sat, xp: s.xp, spawn: s.spawn, yaw: s.yaw, pitch: s.pitch });
    this.enterDim(s.dim || 'over', new THREE.Vector3(s.x, s.y + 0.01, s.z));
    this.pendingArrival = { kind: 'resume' };
    this.awaitSpawn = true;
    this.start();
    if (s.dead || p.hp <= 0) { p.hp = 0; setTimeout(() => this.die('a past misfortune'), 500); }
    return true;
  };
  const origArrive = Game.prototype.arrive;
  Game.prototype.arrive = function () {
    if (this.pendingArrival && this.pendingArrival.kind === 'resume') { this.pendingArrival = null; this.player.portalCd = 3; return; }
    return origArrive.call(this);
  };

  Game.prototype.bindMenus = function () {
    const sv = load(SAVE_KEY);
    $('#continue').hidden = !sv;
    if (sv) $('#continue').textContent = `Continue (${sv.mode}, seed ${sv.seed})`;
    $('#seed').value = String(Math.floor(Math.random() * 1e9));
    document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('on', x === b)); }));
    document.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('[data-diff]').forEach(x => x.classList.toggle('on', x === b)); }));
    $('#play').addEventListener('click', () => {
      this.audio.init();
      if (sv && !this.confirmNew) {
        this.confirmNew = true;
        $('#play').textContent = 'Click again to replace your saved world';
        setTimeout(() => { this.confirmNew = false; $('#play').textContent = 'Create New World'; }, 4000);
        return;
      }
      const raw = $('#seed').value.trim();
      let seed = parseInt(raw, 10);
      if (isNaN(seed)) { seed = 0; for (let i = 0; i < raw.length; i++) seed = (seed * 31 + raw.charCodeAt(i)) | 0; }
      const mode = document.querySelector('[data-mode].on').dataset.mode;
      const diff = document.querySelector('[data-diff].on').dataset.diff;
      this.newGame(seed >>> 0, mode, diff);
    });
    $('#continue').addEventListener('click', () => { this.audio.init(); this.loadGame(); });
    $('#resume').addEventListener('click', () => this.resume());
    $('#savequit').addEventListener('click', () => { this.save(); location.reload(); });
    $('#respawn').addEventListener('click', () => this.respawn());
    $('#journalbtn').addEventListener('click', () => this.openJournal());
    $('#closejournal').addEventListener('click', () => { $('#journal').hidden = true; this.pause(true); });
    $('#victoryclose').addEventListener('click', () => this.resume());
    $('#settingsbtn').addEventListener('click', () => { $('#pause').hidden = true; $('#settings').hidden = false; });
    $('#closesettings').addEventListener('click', () => { $('#settings').hidden = true; this.pause(true); });
    const bindRange = (id, key, fmt, apply) => {
      const el = $(id), out = $(id + 'v');
      el.value = this.settings[key]; out.textContent = fmt(this.settings[key]);
      el.addEventListener('input', () => { this.settings[key] = +el.value; out.textContent = fmt(+el.value); apply && apply(+el.value); store(SET_KEY, this.settings); });
    };
    bindRange('#rdist', 'radius', v => v + ' chunks', v => { if (this.world) this.world.radius = this.world.dim === 'cinder' ? Math.min(v, 6) : v; });
    bindRange('#fovr', 'fov', v => v + '°');
    bindRange('#sens', 'sens', v => v.toFixed(1) + '×');
    bindRange('#vol', 'vol', v => Math.round(v * 100) + '%', v => this.audio.setVolume(v));
    if ('ontouchstart' in window && !matchMedia('(pointer: fine)').matches) $('#touchnote').hidden = false;
    // title backdrop: a slowly turning view of a real world
    this.menuWorld();
  };
  Game.prototype.menuWorld = function () {
    const seed = 1337;
    this.seed = seed;
    const w = new BH.World(seed, this.scene, 'over');
    w.radius = 4;
    this.world = w;
    const g = new BH.Generator(seed);
    const sp = { x: 40, z: 40 };
    const h = g.column(sp.x, sp.z).h;
    this.camera.position.set(sp.x, h + 18, sp.z);
    this.time = DAY * 0.1;
    this.player = { pos: new THREE.Vector3(sp.x, h, sp.z), underwater: false, inLava: false };
    const tick = () => {
      if (this.running) { w.chunks.forEach(c => w.disposeMesh(c)); w.chunks.clear(); return; }
      w.update(sp.x, sp.z, 12);
      this.camera.rotation.set(-0.25, performance.now() / 1000 * 0.04, 0);
      this.updateSky(0.016);
      requestAnimationFrame(tick);
    };
    tick();
  };

  BH.Game = Game;
  window.addEventListener('load', () => { BH.game = new Game(); });
})();
