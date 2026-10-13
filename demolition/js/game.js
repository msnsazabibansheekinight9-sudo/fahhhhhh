'use strict';
/* Crumble — renderer, input, missions, HUD and the main loop. */

const INF = 1e9;
const MISSIONS = [
  {
    id: 'cleanslate', name: 'Clean Slate', where: 'Halloway house · north lot', light: 'day',
    brief: 'The Halloways sold the lot and the developer wants the old brick house gone by lunch. Bring at least 85% of it down. The loader is parked across the road.',
    loadout: { hammer: INF, spray: INF, shotgun: 16, bomb: 3, planks: 4 },
    goal: { type: 'demolish', building: 'house', pct: 0.85 }, spawn: { x: 40, z: 88, yaw: 0 }
  },
  {
    id: 'kindling', name: 'Kindling', where: 'Pruitt barn · west field', light: 'overcast',
    brief: 'Old man Pruitt wants the rotten barn burned for the insurance before the volunteer brigade finishes their card game. Bring 75% of it down in four minutes. No explosives.',
    loadout: { hammer: INF, torch: 40, spray: INF },
    goal: { type: 'demolish', building: 'barn', pct: 0.75, limit: 240 }, spawn: { x: 47, z: 150, yaw: Math.PI }
  },
  {
    id: 'nightshift', name: 'Night Shift', where: 'Gull Point · whole town', light: 'dusk',
    brief: 'Four items, four buildings, one alarm. The moment you lift an alarmed item you have 75 seconds to grab the rest and reach the boat at the end of the pier. Plan your route first: cut holes, lay planks, move the loader.',
    loadout: { hammer: INF, spray: INF, torch: 30, shotgun: 8, planks: 8, bomb: 3, rocket: 2 },
    goal: { type: 'heist', alarm: 75 }, spawn: { x: 106, z: 214, yaw: 0 }
  },
  {
    id: 'sandbox', name: 'Free Roam', where: 'Gull Point · no rules', light: 'day',
    brief: 'Every tool, no limits, nobody watching. Knock the water tower over. Drive the loader through the bank.',
    loadout: { hammer: INF, torch: INF, ext: INF, spray: INF, shotgun: INF, planks: INF, bomb: INF, rocket: INF },
    goal: { type: 'none' }, spawn: { x: 106, z: 214, yaw: 0 }
  }
];
const LIGHTS = {
  day: { top: 0x5d97cf, hor: 0xcfe2ec, fog: 0xc4d8e2, sun: 0xfff0d8, sunI: 1.05, sunDir: [-0.45, 1, 0.35], hemiS: 0xbfd8ff, hemiG: 0x6d5c46, hemiI: 0.6, water: 0x0c3448 },
  overcast: { top: 0x7c8892, hor: 0xb7bec2, fog: 0xa8b0b5, sun: 0xdfe4e8, sunI: 0.55, sunDir: [0.3, 1, -0.2], hemiS: 0xc6ced6, hemiG: 0x5c574e, hemiI: 0.75, water: 0x16313d },
  dusk: { top: 0x18213d, hor: 0xd8774a, fog: 0x5a4656, sun: 0xff9a5c, sunI: 0.7, sunDir: [0.9, 0.35, 0.5], hemiS: 0x6a78a8, hemiG: 0x2a2028, hemiI: 0.45, water: 0x0a1822 }
};

const Input = {
  keys: new Set(), mouse: [false, false, false], pressed0: false, pressed2: false, locked: false,
  key(c) { return this.keys.has(c); }
};

const Game = {
  state: 'menu', world: null, loader: null, mission: null, checks: [], targets: [], stats: {},
  settings: { sens: 1, shadows: true, volume: 0.7, invert: false },
  hud: {},

  init() {
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem('crumble_settings') || '{}')); } catch (e) { }
    try { this.best = JSON.parse(localStorage.getItem('crumble_best') || '{}'); } catch (e) { this.best = {}; }
    const canvas = document.getElementById('c');
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.autoClear = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.2, 1400); this.camera.rotation.order = 'YXZ';
    this.vmScene = new THREE.Scene(); this.vmCam = new THREE.PerspectiveCamera(60, 1, 0.01, 10);
    this.vmScene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.9)); const vd = new THREE.DirectionalLight(0xffffff, 0.7); vd.position.set(1, 2, 1); this.vmScene.add(vd);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -110; sc.right = 110; sc.top = 110; sc.bottom = -110; sc.near = 1; sc.far = 500;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.scene.fog = new THREE.Fog(0xffffff, 140, 560);
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() } },
      vertexShader: 'varying float h; void main(){ h=normalize(position).y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying float h; void main(){ gl_FragColor=vec4(mix(hor, top, pow(clamp(h,0.0,1.0),0.55)),1.0); }'
    }));
    this.scene.add(this.sky);
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ color: 0x2f6377, transparent: true, opacity: 0.84 }));
    this.water.rotation.x = -Math.PI / 2; this.water.position.set(WORLD_X / 2, WATER_Y, WORLD_Z / 2); this.scene.add(this.water);
    // Land beyond the playable map.
    const landMat = new THREE.MeshLambertMaterial({ color: 0x4f6a35 });
    for (const [w, d, x, z] of [[1200, 1200, -600, -400], [1200, 1200, WORLD_X + 600, -400], [WORLD_X, 1000, WORLD_X / 2, -500]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), landMat); p.rotation.x = -Math.PI / 2; p.position.set(x, GY, z); p.receiveShadow = true; this.scene.add(p);
    }
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 120, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x57e08a, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    this.beacon.visible = false; this.scene.add(this.beacon);
    this.targetGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);

    Bodies.init(this.scene); Fire.init(this.scene); FX.init(this.scene); Tools.init(this.scene, this.vmScene);
    this.bodyHooks = {
      impact: (x, y, z, mass, speed) => {
        const r = Math.min(3.2, 0.9 + Math.cbrt(mass) * 0.12), power = mass > 600 ? 2 : 1;
        const res = this.world.carve(x, y, z, r, power, false, i => Fire.map.delete(i));
        if (res.n) { FX.burst(res.samples, x, y, z, 7); this.queueCheck([res.x0, res.y0, res.z0, res.x1, res.y1, res.z1]); }
        const p = new THREE.Vector3(x, y, z);
        SFX.rumble(p, mass); FX.dust(x, y, z); FX.dust(x, y, z);
        FX.shake = Math.max(FX.shake, Math.min(0.8, mass / 4000 * 40 / (p.distanceTo(Player.pos) + 10)));
      }
    };
    this.bindInput(); this.bindUI(); this.resize();
    window.addEventListener('resize', () => this.resize());
    this.applySettings();
    this.renderMenu();
    // Show the town behind the menu.
    this.loadWorld(MISSIONS[3]); this.menuCam = 0;
    this.last = performance.now();
    requestAnimationFrame(t => this.frame(t));
  },

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.vmCam.aspect = w / h; this.vmCam.updateProjectionMatrix();
    FX.setScale(h / (2 * Math.tan(this.camera.fov * Math.PI / 360)) * Math.min(window.devicePixelRatio, 1.5));
  },
  applySettings() {
    SFX.setVolume(this.settings.volume);
    this.sun.castShadow = this.settings.shadows;
    if (this.world) this.world.setShadows(this.settings.shadows);
    try { localStorage.setItem('crumble_settings', JSON.stringify(this.settings)); } catch (e) { }
  },

  bindInput() {
    const canvas = this.renderer.domElement;
    addEventListener('keydown', e => {
      if (e.code === 'Tab') e.preventDefault();
      if (this.state !== 'play') return;
      if (!e.repeat) this.onKey(e.code);
      this.keysDown(e);
    });
    addEventListener('keyup', e => Input.keys.delete(e.code));
    addEventListener('blur', () => { Input.keys.clear(); Input.mouse = [false, false, false]; });
    canvas.addEventListener('mousedown', e => {
      if (this.state !== 'play') return;
      if (!Input.locked) { this.lock(); return; }
      Input.mouse[e.button] = true; if (e.button === 0) Input.pressed0 = true; if (e.button === 2) Input.pressed2 = true;
    });
    addEventListener('mouseup', e => { Input.mouse[e.button] = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => {
      if (!Input.locked || this.state !== 'play') return;
      const s = 0.0022 * this.settings.sens;
      Player.yaw -= e.movementX * s;
      Player.pitch -= e.movementY * s * (this.settings.invert ? -1 : 1);
      Player.pitch = Math.max(-1.55, Math.min(1.55, Player.pitch));
    });
    addEventListener('wheel', e => { if (this.state === 'play' && Input.locked && !Player.vehicle) Tools.cycle(e.deltaY > 0 ? 1 : -1); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      Input.locked = document.pointerLockElement === canvas;
      if (!Input.locked && this.state === 'play') this.pause();
    });
  },
  keysDown(e) { Input.keys.add(e.code); },
  lock() { const c = this.renderer.domElement; try { const p = c.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } },
  onKey(code) {
    if (code.startsWith('Digit')) { const n = +code.slice(5) - 1; if (n >= 0 && n < TOOL_DEFS.length && !Player.vehicle) Tools.select(n); }
    if (code === 'KeyQ' && !Player.vehicle) Tools.cycle(1);
    if (code === 'KeyE') this.interact();
    if (code === 'KeyR' && this.state === 'play') this.toast('Press Esc and choose Restart to start the job again.');
  },

  bindUI() {
    const $ = id => document.getElementById(id);
    $('btnResume').onclick = () => this.resume();
    $('btnRestart').onclick = () => this.start(this.mission);
    $('btnQuit').onclick = () => this.toMenu();
    $('resRetry').onclick = () => this.start(this.mission);
    $('resMenu').onclick = () => this.toMenu();
    for (const [id, key, fn] of [['setSens', 'sens', parseFloat], ['setVol', 'volume', parseFloat]]) {
      const el = $(id); el.value = this.settings[key];
      el.oninput = () => { this.settings[key] = fn(el.value); this.applySettings(); };
    }
    const sh = $('setShadows'); sh.checked = this.settings.shadows; sh.onchange = () => { this.settings.shadows = sh.checked; this.applySettings(); };
    const inv = $('setInvert'); inv.checked = this.settings.invert; inv.onchange = () => { this.settings.invert = inv.checked; this.applySettings(); };
    this.el = {
      hud: $('hud'), obj: $('objectives'), timer: $('timer'), prompt: $('prompt'), toolbar: $('toolbar'), health: $('healthFill'),
      toast: $('toast'), markers: $('markers'), progress: $('progress'), progFill: $('progFill'), progTxt: $('progTxt'), hurt: $('hurt'), toolName: $('toolName')
    };
    this.el.toolbar.innerHTML = TOOL_DEFS.map((d, i) => `<div class="slot" data-i="${i}"><span class="k">${i + 1}</span><span class="nm">${d.name}</span><span class="am"></span></div>`).join('');
  },
  renderMenu() {
    const list = document.getElementById('missionList');
    list.innerHTML = MISSIONS.map((m, i) => {
      const b = this.best[m.id];
      return `<button class="mission" data-i="${i}" id="mission-${m.id}">
        <span class="mtop"><b>${m.name}</b><em>${m.where}</em></span>
        <span class="mbrief">${m.brief}</span>
        <span class="mbest">${b ? 'Best ' + this.fmtTime(b) : m.goal.type === 'none' ? 'Sandbox' : 'Not completed'}</span>
      </button>`;
    }).join('');
    list.querySelectorAll('.mission').forEach(btn => btn.onclick = () => { SFX.init(); this.start(MISSIONS[+btn.dataset.i]); });
  },
  show(id) {
    for (const s of ['menu', 'loading', 'pause', 'result']) document.getElementById(s).hidden = s !== id;
    this.el.hud.hidden = !(id === null);
  },
  fmtTime(t) { t = Math.max(0, t); const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + String(s).padStart(2, '0'); },
  toast(msg) {
    const t = this.el.toast; t.textContent = msg; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('on'), 3200);
  },

  loadWorld(m) {
    if (this.world) this.world.dispose();
    Bodies.clear(); Fire.clear(); FX.clear(); this.checks = [];
    for (const t of this.targets) this.scene.remove(t.mesh);
    if (this.loader) this.loader.dispose();
    this.world = new World(WORLD_X, WORLD_Y, WORLD_Z, this.scene);
    this.world.shadows = this.settings.shadows;
    this.level = Level.build(this.world);
    this.world.buildAll();
    const L = LIGHTS[m.light];
    this.sky.material.uniforms.top.value.set(L.top); this.sky.material.uniforms.hor.value.set(L.hor);
    this.scene.fog.color.set(L.fog);
    this.sun.color.set(L.sun); this.sun.intensity = L.sunI; this.sunDir = new THREE.Vector3(...L.sunDir).normalize();
    this.hemi.color.set(L.hemiS); this.hemi.groundColor.set(L.hemiG); this.hemi.intensity = L.hemiI;
    this.water.material.color.set(L.water);
    this.loader = new Loader(this.scene, this.level.loader.x, this.level.loader.z, this.level.loader.yaw);
    this.targets = [];
  },

  start(m) {
    this.mission = m;
    this.show('loading');
    setTimeout(() => {
      this.loadWorld(m);
      const g = m.goal;
      const sp = m.spawn; Player.reset(sp.x, GY, sp.z, sp.yaw);
      Tools.setLoadout(m.loadout);
      this.stats = { explosions: 0, pieces: 0, t: 0 };
      this.alarm = null; this.done = false;
      if (g.type === 'heist') {
        const mat = (c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 });
        this.targets = this.level.targets.map(t => {
          const mesh = new THREE.Mesh(this.targetGeo, mat(t.alarm ? 0xf2b33d : 0x7fc8ff)); mesh.castShadow = true; this.scene.add(mesh);
          return Object.assign({}, t, { pos: new THREE.Vector3(t.x + 0.5, t.y, t.z + 0.5), vy: 0, taken: false, mesh });
        });
        this.beacon.visible = true; this.beacon.position.set(this.level.escape.x, GY + 60, this.level.escape.z);
      } else this.beacon.visible = false;
      if (g.type === 'demolish') {
        const b = this.level.buildings[g.building];
        this.demoBox = [Math.max(0, b[0]), GY + 3, Math.max(0, b[2]), Math.min(WORLD_X - 1, b[3]), Math.min(WORLD_Y - 1, b[4]), Math.min(WORLD_Z - 1, b[5])];
        this.demo0 = this.world.countBox(...this.demoBox); this.demoPct = 0; this.demoT = 0;
      }
      this.el.progress.hidden = g.type !== 'demolish';
      this.state = 'play'; this.show(null);
      this.renderObjectives();
      this.toast(m.name + ' — ' + (g.type === 'heist' ? 'Lifting an orange item starts the alarm.' : g.type === 'demolish' ? 'Click to grab the mouse. Esc pauses.' : 'Click to grab the mouse. Esc pauses.'));
      this.lock();
    }, 30);
  },
  pause() { if (this.state !== 'play') return; this.state = 'pause'; SFX.silence(); this.show('pause'); },
  resume() { this.state = 'play'; this.show(null); this.lock(); },
  toMenu() {
    this.state = 'menu'; SFX.silence(); if (document.pointerLockElement) document.exitPointerLock();
    this.renderMenu(); this.show('menu'); this.beacon.visible = false;
  },
  finish(ok, why) {
    if (this.state !== 'play') return;
    this.state = 'result'; SFX.silence(); if (document.pointerLockElement) document.exitPointerLock();
    const m = this.mission, t = this.stats.t;
    if (ok) {
      SFX.win();
      if (!this.best[m.id] || t < this.best[m.id]) { this.best[m.id] = t; try { localStorage.setItem('crumble_best', JSON.stringify(this.best)); } catch (e) { } }
    } else SFX.lose();
    document.getElementById('resTitle').textContent = ok ? 'Job done' : 'Job failed';
    document.getElementById('resWhy').textContent = why;
    const rows = [['Time', this.fmtTime(t)], ['Explosions', this.stats.explosions], ['Pieces that came loose', this.stats.pieces]];
    if (m.goal.type === 'heist') rows.push(['Items taken', this.targets.filter(x => x.taken).length + ' / ' + this.targets.length]);
    if (m.goal.type === 'demolish') rows.push(['Demolished', Math.round(this.demoPct * 100) + '%']);
    if (ok && this.best[m.id]) rows.push(['Best time', this.fmtTime(this.best[m.id])]);
    document.getElementById('resTable').innerHTML = rows.map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
    this.show('result');
  },
  fail(why) { this.finish(false, why); },

  queueCheck(box) { this.checks.push(box); },
  processChecks() {
    let budget = 10;
    while (this.checks.length && budget-- > 0) {
      const b = this.checks.shift();
      const clusters = this.world.findDetached(b[0], b[1], b[2], b[3], b[4], b[5]);
      for (const c of clusters) {
        const rec = this.world.extract(c);
        if (rec.n < 8) {
          const s = []; for (let k = 0; k < rec.n; k++) s.push(rec.xs[k], rec.ys[k], rec.zs[k], rec.ms[k], rec.ps[k]);
          FX.burst(s, rec.xs[0], rec.ys[0] + 1, rec.zs[0], 2);
        } else {
          const body = Bodies.add(rec); this.stats.pieces++;
          if (rec.n > 150) { SFX.rumble(body.pos, rec.n); for (let k = 0; k < 4; k++) FX.dust(body.pos.x, body.pos.y, body.pos.z); }
          for (let k = 0; k < rec.n; k++) { const i = this.world.idx(rec.xs[k], rec.ys[k], rec.zs[k]); Fire.map.delete(i); }
        }
      }
    }
  },

  interact() {
    if (Player.vehicle) {
      const l = this.loader, [fx, fz] = l.fwd();
      Player.vehicle = null;
      Player.pos.set(l.pos.x - fz * 8, l.pos.y + 1, l.pos.z + fx * 8);
      for (let k = 0; k < 12 && Player.collides(this.world, Player.pos.x, Player.pos.y, Player.pos.z); k++) Player.pos.y += 1;
      Tools.hideVM(false); return;
    }
    const t = this.lookTarget();
    if (t) {
      t.taken = true; this.scene.remove(t.mesh); SFX.pickup();
      if (t.alarm && !this.alarm) { this.alarm = { t: this.mission.goal.alarm }; this.toast('Alarm! ' + this.mission.goal.alarm + ' seconds to reach the boat.'); }
      else this.toast(t.name + ' taken.');
      this.renderObjectives(); return;
    }
    if (this.nearLoader()) { Player.vehicle = this.loader; Tools.hideVM(true); this.toast('W/S drive · A/D steer · Space brake · E get out'); }
  },
  nearLoader() { return this.loader && Player.pos.distanceTo(this.loader.pos) < 13; },
  lookTarget() {
    const eye = Player.eye(new THREE.Vector3()), dir = Player.dir(new THREE.Vector3());
    let best = null, bd = 1e9;
    for (const t of this.targets) {
      if (t.taken) continue;
      const c = t.pos.clone(); c.y += 0.9;
      const v = c.clone().sub(eye), d = v.length();
      if (d > 11) continue;
      if (v.normalize().dot(dir) < 0.9) continue;
      const h = this.world.raycast(eye.x, eye.y, eye.z, v.x, v.y, v.z, d - 1.2, true);
      if (h) continue;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  },
  renderObjectives() {
    const m = this.mission, g = m.goal;
    let h = `<div class="mname">${m.name}</div>`;
    if (g.type === 'heist') {
      for (const t of this.targets) h += `<div class="ob ${t.taken ? 'done' : ''}"><i class="${t.alarm ? 'al' : 'op'}"></i>${t.name}${t.required ? '' : ' <small>optional</small>'}</div>`;
      const all = this.targets.filter(t => t.required).every(t => t.taken);
      h += `<div class="ob ${all ? '' : 'dim'}"><i class="ex"></i>Reach the boat at the pier</div>`;
    } else if (g.type === 'demolish') h += `<div class="ob"><i class="op"></i>Bring down ${Math.round(g.pct * 100)}% of the ${g.building === 'house' ? 'Halloway house' : 'Pruitt barn'}</div>`;
    else h += `<div class="ob dim">No objectives. Break things.</div>`;
    this.el.obj.innerHTML = h;
  },

  updateMission(dt) {
    const g = this.mission.goal;
    this.stats.t += dt;
    if (g.type === 'heist') {
      for (const t of this.targets) {
        if (t.taken) continue;
        const w = this.world, below = w.getf(t.pos.x, t.pos.y - 0.05, t.pos.z);
        if (SOLID[w.getf(t.pos.x, t.pos.y + 0.2, t.pos.z)]) { t.pos.y = Math.floor(t.pos.y) + 1; t.vy = 0; }
        else if (!SOLID[below]) { t.vy -= G * dt; t.pos.y += t.vy * dt; if (SOLID[w.getf(t.pos.x, t.pos.y, t.pos.z)]) { t.pos.y = Math.floor(t.pos.y) + 1; t.vy = 0; } }
        else t.vy = 0;
        if (t.pos.y < -5) t.pos.y = GY + 1;
        t.mesh.position.set(t.pos.x, t.pos.y + 0.9 + Math.sin(this.stats.t * 2 + t.x) * 0.15, t.pos.z);
        t.mesh.rotation.y += dt;
      }
      if (this.alarm) {
        this.alarm.t -= dt;
        if (this.alarm.t <= 0) return this.fail('The alarm ran out. The police reached the pier first.');
      }
      const req = this.targets.filter(t => t.required), got = req.every(t => t.taken);
      const e = this.level.escape, p = Player.vehicle ? this.loader.pos : Player.pos;
      if (got && Math.hypot(p.x - e.x, p.z - e.z) < e.r && p.y < GY + 6) {
        const opt = this.targets.filter(t => !t.required && t.taken).length;
        this.finish(true, `You made the boat with ${this.alarm ? Math.ceil(this.alarm.t) + ' s on the clock' : 'the alarm never tripped'}${opt ? ' and the painting under your arm' : ''}.`);
      }
    } else if (g.type === 'demolish') {
      this.demoT -= dt;
      if (this.demoT <= 0) {
        this.demoT = 0.4;
        // Debris still in flight counts as standing until it lands.
        const B = this.demoBox;
        let left = this.world.countBox(...B);
        for (const b of Bodies.list) if (b.pos.x > B[0] && b.pos.x < B[3] && b.pos.z > B[2] && b.pos.z < B[5]) left += b.n;
        this.demoPct = Math.max(0, 1 - left / this.demo0);
        if (this.demoPct >= g.pct) this.finish(true, `Down to ${Math.round((1 - this.demoPct) * 100)}% of what was standing.`);
      }
      if (g.limit && this.stats.t > g.limit) this.fail('The fire brigade arrived. The barn is still standing.');
    }
  },

  updateHUD() {
    const e = this.el, g = this.mission.goal;
    e.health.style.width = Player.health + '%';
    e.hurt.style.opacity = Player.hurtT > 0 ? Player.hurtT * 1.5 : 0;
    if (g.type === 'heist' && this.alarm) { e.timer.hidden = false; e.timer.className = 'alarm'; e.timer.textContent = this.alarm.t.toFixed(1); }
    else if (g.limit) { e.timer.hidden = false; e.timer.className = ''; e.timer.textContent = this.fmtTime(g.limit - this.stats.t); }
    else { e.timer.hidden = false; e.timer.className = 'quiet'; e.timer.textContent = this.fmtTime(this.stats.t); }
    if (g.type === 'demolish') { e.progFill.style.width = Math.min(100, this.demoPct / g.pct * 100) + '%'; e.progTxt.textContent = Math.round(this.demoPct * 100) + '% / ' + Math.round(g.pct * 100) + '%'; }
    // Toolbar.
    const slots = e.toolbar.children;
    for (let i = 0; i < slots.length; i++) {
      const d = TOOL_DEFS[i], a = Tools.ammo[d.id];
      slots[i].classList.toggle('on', i === Tools.cur && !Player.vehicle);
      slots[i].classList.toggle('none', !(a > 0));
      slots[i].lastChild.textContent = a >= INF / 2 ? '∞' : a > 0 ? (d.unit ? Math.ceil(a) + d.unit : a) : '–';
    }
    e.toolName.textContent = Player.vehicle ? 'Wheel loader' : Tools.def().name + ' · ' + Tools.def().hint + (Tools.def().id === 'planks' && Tools.plankA ? ' · pick the second point' : '');
    // Prompt.
    let pr = '';
    if (Player.vehicle) pr = '<kbd>E</kbd> Get out';
    else { const t = this.lookTarget(); if (t) pr = `<kbd>E</kbd> Take ${t.name}${t.alarm && !this.alarm ? ' <span class="warn">starts alarm</span>' : ''}`; else if (this.nearLoader()) pr = '<kbd>E</kbd> Drive loader'; }
    if (pr !== this._pr) { e.prompt.innerHTML = pr; this._pr = pr; }
    // Item markers.
    let mh = '';
    const W = innerWidth, H = innerHeight, v = new THREE.Vector3();
    const marks = this.targets.filter(t => !t.taken).map(t => ({ p: t.pos.clone().add(new THREE.Vector3(0, 2.5, 0)), n: t.name, c: t.alarm ? 'al' : 'op' }));
    if (g.type === 'heist' && this.targets.filter(t => t.required).every(t => t.taken)) marks.push({ p: new THREE.Vector3(this.level.escape.x, GY + 3, this.level.escape.z), n: 'Boat', c: 'ex' });
    for (const mk of marks) {
      v.copy(mk.p).project(this.camera);
      if (v.z > 1) continue;
      const x = Math.max(16, Math.min(W - 16, (v.x * 0.5 + 0.5) * W)), y = Math.max(16, Math.min(H - 16, (-v.y * 0.5 + 0.5) * H));
      const d = Math.round(mk.p.distanceTo(Player.pos) * 0.25);
      mh += `<div class="mk ${mk.c}" style="transform:translate(${x}px,${y}px)"><i></i><span>${mk.n} · ${d} m</span></div>`;
    }
    e.markers.innerHTML = mh;
  },

  frame(t) {
    requestAnimationFrame(tt => this.frame(tt));
    let dt = (t - this.last) / 1000; this.last = t;
    dt = Math.min(0.05, Math.max(0.0001, dt));
    const w = this.world, cam = this.camera;
    if (this.state === 'play') {
      if (Player.vehicle) { this.loader.update(dt, w, Input, true); Player.pos.copy(this.loader.pos); Player.pos.y += 4; SFX.setEngine(true, this.loader.speed); }
      else { Player.update(dt, w, Input); this.loader.update(dt, w, Input, false); this.loader.pushOut(Player); SFX.setEngine(false, 0); }
      const eye = Player.eye(new THREE.Vector3()), dir = Player.dir(new THREE.Vector3());
      if (!Player.vehicle) Tools.update(dt, Input, w, eye, dir); else Tools.updateProj(dt, w);
      Bodies.update(dt, w);
      // Falling debris hurts.
      for (const b of Bodies.list) {
        const sp = b.v.length(); if (sp < 8 || Player.vehicle) continue;
        const pc = Player.pos.clone(); pc.y += 3.5;
        if (pc.distanceTo(b.pos) < b.radius * 0.55 + 2) Player.damage(sp * 0.6 * dt * 10, 'crush');
      }
      this.processChecks();
      Fire.update(dt, w);
      SFX.setLoop('fire', Math.min(0.35, Fire.map.size / 1500) * (Fire.map.size ? 1 : 0));
      this.updateMission(dt);
      SFX.update(dt, !!this.alarm && this.state === 'play');
      Input.pressed0 = Input.pressed2 = false;
      // Camera.
      if (Player.vehicle) {
        const l = this.loader, d = 26, cp = Math.cos(Player.pitch * 0.6 - 0.35);
        cam.position.set(l.pos.x + Math.sin(Player.yaw) * d * cp, l.pos.y + 8 + Math.sin(0.35 - Player.pitch * 0.6) * d, l.pos.z + Math.cos(Player.yaw) * d * cp);
        cam.lookAt(l.pos.x, l.pos.y + 6, l.pos.z);
      } else {
        cam.position.copy(eye); cam.rotation.set(Player.pitch, Player.yaw, 0);
      }
      if (FX.shake > 0) { const s = FX.shake * 0.35; cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s; cam.rotation.z = (Math.random() - 0.5) * s * 0.04; }
      SFX.listener = cam.position;
      this.updateHUD();
      this.beacon.material.opacity = 0.12 + Math.sin(t / 300) * 0.05;
    } else if (this.state === 'menu') {
      this.menuCam += dt * 0.05;
      cam.position.set(128 + Math.sin(this.menuCam) * 150, 70, 128 + Math.cos(this.menuCam) * 150);
      cam.lookAt(128, 10, 110);
      Bodies.update(dt, w); Fire.update(dt, w); this.processChecks();
    }
    if (this.state === 'play' || this.state === 'menu') FX.update(dt, w);
    w.rebuildDirty();
    // Sun shadow box follows the camera.
    const c = this.state === 'play' ? Player.pos : new THREE.Vector3(128, 0, 128);
    this.sun.target.position.set(Math.round(c.x / 8) * 8, 0, Math.round(c.z / 8) * 8);
    this.sun.position.copy(this.sun.target.position).addScaledVector(this.sunDir, 250);
    this.sky.position.copy(cam.position);
    const r = this.renderer;
    r.clear(); r.render(this.scene, cam);
    if (this.state === 'play' && !Player.vehicle) { r.clearDepth(); r.render(this.vmScene, this.vmCam); }
  }
};

window.addEventListener('load', () => Game.init());
