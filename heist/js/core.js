'use strict';
// Core: renderer, input, synth audio, procedural textures, batched box
// geometry, the static collision world, nav grid, rays and particles.

H.t = 0; H.dt = 0;
H.settings = { sens: 1, fov: 78, volume: 0.6, quality: 'high', music: 0.5 };
try { Object.assign(H.settings, JSON.parse(localStorage.getItem('heist_settings') || '{}')); } catch (e) { /* storage unavailable */ }
H.saveSettings = () => { try { localStorage.setItem('heist_settings', JSON.stringify(H.settings)); } catch (e) { /* ignore */ } };

/* ---------------- renderer ---------------- */
H.initRenderer = function () {
  const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, H.settings.quality === 'high' ? 1.5 : 1));
  r.setSize(innerWidth, innerHeight);
  r.shadowMap.enabled = H.settings.quality === 'high';
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.outputEncoding = THREE.sRGBEncoding;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.autoClear = false;
  document.getElementById('view').appendChild(r.domElement);
  H.renderer = r;
  H.scene = new THREE.Scene();
  H.camera = new THREE.PerspectiveCamera(H.settings.fov, innerWidth / innerHeight, 0.05, 900);
  H.scene.add(H.camera);
  H.vmScene = new THREE.Scene();
  H.vmCamera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 10);
  H.vmScene.add(H.vmCamera);
  H.vmScene.add(new THREE.HemisphereLight(0xfff2e0, 0x404050, 0.9));
  const vs = new THREE.DirectionalLight(0xffffff, 1.4); vs.position.set(0.4, 1, 0.6); H.vmScene.add(vs);
  H.vmFlash = new THREE.PointLight(0xffb060, 0, 3, 2); H.vmFlash.position.set(0.1, 0, -0.9); H.vmCamera.add(H.vmFlash);
  addEventListener('resize', H.onResize);
  H.onResize();
};
// scope picture-in-picture: render the zoomed view into the lens texture
H.renderScope = function () {
  const P = H.P, vm = H.vm; if (!P || !vm.guns || !vm.guns[0]) return;
  const g = vm.guns[0].g, lens = g.userData.lens; if (!lens) return;
  const on = P.ads > 0.35 && vm.group.visible;
  lens.material.uniforms.on.value = on ? 1 : 0;
  if (!on) return;
  if (!H.scopeRT) { H.scopeRT = new THREE.WebGLRenderTarget(512, 512); H.scopeCam = new THREE.PerspectiveCamera(10, 1, 0.1, 900); H.coldMat = new THREE.MeshBasicMaterial({ color: 0x1c2430 }); H.hotMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); }
  const W = P.weapons[P.cur], cam = H.scopeCam;
  cam.position.copy(H.camera.position); cam.quaternion.copy(H.camera.quaternion);
  cam.fov = H.settings.fov / (W.st.zoom * 2.2); cam.updateProjectionMatrix();
  const r = H.renderer, thermal = g.userData.optic === 'thermal';
  r.setRenderTarget(H.scopeRT); r.clear();
  if (thermal) {
    H.scene.overrideMaterial = H.coldMat; r.render(H.scene, cam);
    // second pass: only people, white-hot, depth-tested against the first pass
    const vis = []; for (const c of H.scene.children) { vis.push(c.visible); c.visible = false; }
    for (const n of H.npcs) if (!n.dead) n.h.root.visible = true;
    H.scene.overrideMaterial = H.hotMat; r.render(H.scene, cam);
    H.scene.children.forEach((c, i) => c.visible = vis[i]);
    H.scene.overrideMaterial = null;
  } else r.render(H.scene, cam);
  r.setRenderTarget(null);
  lens.material.uniforms.map.value = H.scopeRT.texture; lens.material.uniforms.t.value = H.t % 10;
};
H.onResize = function () {
  H.renderer.setSize(innerWidth, innerHeight);
  for (const c of [H.camera, H.vmCamera]) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }
};

/* ---------------- input ---------------- */
H.keys = {}; H.mouse = { dx: 0, dy: 0, l: false, r: false, wheel: 0 };
H.pressed = {};
H.locked = false;
addEventListener('keydown', e => {
  if (e.repeat) return;
  H.keys[e.code] = true; H.pressed[e.code] = true;
  if (['Tab', 'Space', 'F1'].includes(e.code) || (e.code.startsWith('Arrow'))) e.preventDefault();
});
addEventListener('keyup', e => { H.keys[e.code] = false; });
addEventListener('mousemove', e => { if (H.locked) { H.mouse.dx += e.movementX; H.mouse.dy += e.movementY; } });
addEventListener('mousedown', e => { if (e.button === 0) { H.mouse.l = true; H.pressed.Mouse0 = true; } if (e.button === 2) { H.mouse.r = true; H.pressed.Mouse2 = true; } });
addEventListener('mouseup', e => { if (e.button === 0) H.mouse.l = false; if (e.button === 2) H.mouse.r = false; });
addEventListener('wheel', e => { H.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { H.locked = document.pointerLockElement === H.renderer.domElement; if (!H.locked && H.onUnlock) H.onUnlock(); });
H.lock = function () { try { const p = H.renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not supported */ } };
H.wasPressed = c => { const v = H.pressed[c]; return !!v; };
H.endFrameInput = () => { H.pressed = {}; H.mouse.dx = 0; H.mouse.dy = 0; H.mouse.wheel = 0; };

/* ---------------- audio ---------------- */
H.audio = {
  ctx: null, master: null, sfx: null, mus: null, noiseBuf: null,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = H.settings.volume; this.master.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.gain.value = H.settings.music * 0.5; this.mus.connect(this.master);
    const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
  },
  setVol() { if (this.master) { this.master.gain.value = H.settings.volume; this.mus.gain.value = H.settings.music * 0.5; } },
  // positional attenuation by distance from the camera
  att(pos) {
    if (!pos) return 1;
    const d = H.camera.position.distanceTo(pos);
    return Math.max(0, 1 - d / 140) ** 1.6;
  },
  noise(dur, freq, q, vol, pos, type = 'bandpass', attack = 0.002) {
    const c = this.ctx; if (!c) return;
    const g0 = vol * this.att(pos); if (g0 < 0.01) return;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    s.playbackRate.value = 0.5 + Math.random();
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); const t = c.currentTime;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(g0, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  tone(freq, dur, vol, type = 'sine', pos, slide = 0) {
    const c = this.ctx; if (!c) return;
    const g0 = vol * this.att(pos); if (g0 < 0.01) return;
    const o = c.createOscillator(); o.type = type; const t = c.currentTime;
    o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + 0.02);
  },
  gun(w, pos, silent) {
    if (silent) { this.noise(0.09, 1800, 1.2, 0.35, pos); this.tone(300, 0.05, 0.12, 'square', pos, 0.5); return; }
    const heavy = w ? Math.min(1, (w.dmg || 40) / 250) : 0.3;
    this.noise(0.08 + heavy * 0.25, 900 - heavy * 500, 0.8, 0.9, pos, 'lowpass');
    this.noise(0.04, 3200, 0.7, 0.5, pos);
    this.tone(120 - heavy * 60, 0.12 + heavy * 0.2, 0.5, 'sine', pos, 0.3);
  },
  boom(pos, big = 1) { this.noise(1.2 * big, 300, 0.5, 1.2, pos, 'lowpass'); this.tone(60, 1 * big, 0.9, 'sine', pos, 0.3); this.noise(0.3, 2000, 0.5, 0.4, pos); },
  hit() { this.tone(1400, 0.05, 0.18, 'square', null, 0.7); },
  head() { this.tone(2200, 0.08, 0.22, 'triangle', null, 1.2); },
  click() { this.tone(900, 0.03, 0.15, 'square'); },
  ui() { this.tone(660, 0.06, 0.15, 'triangle', null, 1.4); },
  cash() { this.tone(1320, 0.08, 0.2, 'triangle'); setTimeout(() => this.tone(1760, 0.12, 0.2, 'triangle'), 70); },
  hurt() { this.noise(0.12, 500, 1, 0.5); this.tone(180, 0.15, 0.3, 'sawtooth', null, 0.6); },
  melee(pos) { this.noise(0.12, 600, 1.5, 0.6, pos); },
  step(pos, v = 0.15) { this.noise(0.05, 300, 2, v, pos, 'lowpass'); },
  reload(part) { this.tone(part ? 500 : 340, 0.04, 0.2, 'square', null, 0.8); this.noise(0.05, 2400, 3, 0.25); },
  glass(pos) { for (let i = 0; i < 5; i++) setTimeout(() => this.tone(2500 + Math.random() * 3000, 0.15, 0.12, 'sine', pos), i * 25); this.noise(0.3, 5000, 1, 0.4, pos, 'highpass'); },
  beep(pos, f = 1800) { this.tone(f, 0.12, 0.3, 'square', pos); },
  shout() { this.noise(0.35, 700, 2.5, 0.5); this.tone(220, 0.3, 0.15, 'sawtooth', null, 0.8); },
  // loops (alarm, drill, siren, engine) keep running nodes we can stop
  loops: {},
  loop(id, make) {
    if (!this.ctx || this.loops[id]) return;
    this.loops[id] = make(this.ctx);
  },
  stopLoop(id) { const l = this.loops[id]; if (l) { try { l.stop(); } catch (e) { /* already stopped */ } delete this.loops[id]; } },
  stopAll() { for (const k in this.loops) this.stopLoop(k); },
  alarm() {
    this.loop('alarm', c => {
      const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'square'; o.frequency.value = 900; lfo.frequency.value = 2; lg.gain.value = 300;
      lfo.connect(lg); lg.connect(o.frequency); g.gain.value = 0.05; o.connect(g); g.connect(this.sfx); o.start(); lfo.start();
      return { stop() { o.stop(); lfo.stop(); }, g };
    });
  },
  drill(on, pos) {
    if (!on) { this.stopLoop('drill'); return; }
    this.loop('drill', c => {
      const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 4;
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 95;
      const g = c.createGain(); g.gain.value = 0.0;
      s.connect(f); f.connect(g); o.connect(g); g.connect(this.sfx); s.start(); o.start();
      return { stop() { s.stop(); o.stop(); }, g };
    });
    const l = this.loops.drill; if (l) l.g.gain.value = 0.12 * this.att(pos);
  },
  engine(on, rpm = 0.3) {
    if (!on) { this.stopLoop('engine'); return; }
    this.loop('engine', c => {
      const o = c.createOscillator(), o2 = c.createOscillator(); o.type = 'sawtooth'; o2.type = 'square';
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
      const g = c.createGain(); g.gain.value = 0.06;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfx); o.start(); o2.start();
      return { stop() { o.stop(); o2.stop(); }, o, o2, g };
    });
    const l = this.loops.engine; if (l) { l.o.frequency.value = 40 + rpm * 120; l.o2.frequency.value = 20 + rpm * 60; l.g.gain.value = 0.04 + rpm * 0.05; }
  },
  siren(on, pos) {
    if (!on) { this.stopLoop('siren'); return; }
    this.loop('siren', c => {
      const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = 900; lfo.frequency.value = 0.6; lg.gain.value = 350; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.value = 0; o.connect(g); g.connect(this.sfx); o.start(); lfo.start();
      return { stop() { o.stop(); lfo.stop(); }, g };
    });
    const l = this.loops.siren; if (l) l.g.gain.value = 0.06 * this.att(pos);
  },
};

/* ---------------- music: a synthwave score that follows the action ---------------- */
H.music = {
  on: false, step: 0, next: 0, mode: 'city', bpm: 104,
  start() { this.on = true; this.next = 0; },
  set(m) { this.mode = m; this.bpm = m === 'assault' ? 132 : m === 'stealth' ? 92 : m === 'loud' ? 120 : 104; },
  update() {
    const a = H.audio; if (!this.on || !a.ctx || H.settings.music <= 0) return;
    const c = a.ctx; const spb = 60 / this.bpm / 4;
    if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.2) { this.play(this.step++, this.next); this.next += spb; }
  },
  play(s, t) {
    const a = H.audio, c = a.ctx, m = this.mode;
    const prog = m === 'assault' ? [0, 0, 3, 5] : m === 'stealth' ? [0, 8, 5, 3] : [0, 5, 8, 7];
    const root = 41 + prog[Math.floor(s / 32) % 4];
    const f = n => 440 * Math.pow(2, (n - 69) / 12);
    const note = (n, dur, vol, type, cut) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f(n);
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut;
      const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(fl); fl.connect(g); g.connect(a.mus); o.start(t); o.stop(t + dur + 0.02);
    };
    const drum = (freq, dur, vol, nz) => {
      if (nz) {
        const n = c.createBufferSource(); n.buffer = a.noiseBuf; const fl = c.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = freq;
        const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); n.connect(fl); fl.connect(g); g.connect(a.mus); n.start(t, Math.random()); n.stop(t + dur);
      } else {
        const o = c.createOscillator(); o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(40, t + dur);
        const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(a.mus); o.start(t); o.stop(t + dur);
      }
    };
    const i = s % 16;
    if (m === 'stealth') {
      if (i % 8 === 0) note(root, 0.9, 0.18, 'triangle', 500);
      if (i === 6 || i === 14) note(root + 12 + (s % 3) * 3, 0.3, 0.05, 'sine', 2000);
      if (i % 4 === 2) drum(9000, 0.03, 0.03, true);
      return;
    }
    if (i % 4 === 0) drum(150, 0.25, 0.5);
    if (i === 4 || i === 12) drum(1800, 0.18, 0.18, true);
    if (i % 2 === 1) drum(8000, 0.04, m === 'city' ? 0.04 : 0.07, true);
    note(root + (i % 4 === 3 ? 12 : 0), 0.18, 0.12, 'sawtooth', m === 'assault' ? 1400 : 800);
    if (m === 'city' && (i === 0 || i === 6 || i === 10)) {
      const sc = [0, 3, 5, 7, 10, 12, 15];
      note(root + 24 + sc[(s * 7 + i) % sc.length], 0.4, 0.05, 'square', 2600);
    }
    if (m !== 'city' && i % 8 === 0) note(root + 19, 0.5, 0.05, 'sawtooth', 1800);
  },
};

/* ---------------- procedural textures ---------------- */
H.tex = {};
H.canvasTex = function (w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4; t.encoding = THREE.sRGBEncoding;
  return t;
};
H.makeTextures = function () {
  const T = H.tex;
  const noise = (g, w, h, a, col = '0,0,0') => { for (let i = 0; i < w * h / 20; i++) { g.fillStyle = `rgba(${col},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } };
  T.asphalt = H.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3a3c40'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.25); noise(g, w, h, 0.08, '255,255,255'); });
  T.road = H.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#34363a'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.3); noise(g, w, h, 0.06, '255,255,255');
    g.fillStyle = '#e8c040'; g.fillRect(w / 2 - 5, 0, 3, h); g.fillRect(w / 2 + 2, 0, 3, h);
    g.fillStyle = '#e8e8e8'; for (let y = 0; y < h; y += 64) { g.fillRect(w * 0.25 - 2, y, 4, 32); g.fillRect(w * 0.75 - 2, y, 4, 32); }
  });
  T.crossing = H.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#34363a'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.3);
    g.fillStyle = '#e8e8e8'; for (let x = 0; x < w; x += 32) { g.fillRect(x + 4, 4, 18, 30); g.fillRect(x + 4, h - 34, 18, 30); g.fillRect(4, x + 4, 30, 18); g.fillRect(w - 34, x + 4, 30, 18); }
  });
  T.sidewalk = H.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#b8b2a6'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } noise(g, w, h, 0.12); });
  T.sand = H.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e6d3a3'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.18, '120,90,40'); noise(g, w, h, 0.2, '255,255,255'); });
  T.grass = H.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#4f7d3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { g.fillStyle = `hsl(${90 + Math.random() * 30},${40 + Math.random() * 20}%,${22 + Math.random() * 18}%)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 3); } });
  T.water = H.canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1a8ab0'); gr.addColorStop(1, '#127098'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 60; i++) { g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 22, y); g.stroke(); } });
  T.floorTile = H.canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#d8d4cc' : '#c4beb2'; g.fillRect(x * 64, y * 64, 64, 64); } g.strokeStyle = 'rgba(0,0,0,.2)'; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } noise(g, w, h, 0.05); });
  T.marble = H.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ece8e2'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(80,70,60,.18)'; g.lineWidth = 1.5; for (let i = 0; i < 14; i++) { g.beginPath(); let x = Math.random() * w, y = 0; g.moveTo(x, y); while (y < h) { x += (Math.random() - 0.5) * 30; y += 20; g.lineTo(x, y); } g.stroke(); } g.strokeStyle = 'rgba(0,0,0,.12)'; g.strokeRect(0, 0, w, h); });
  T.wood = H.canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = `hsl(28,${40 + Math.random() * 10}%,${30 + Math.random() * 8}%)`; g.fillRect(0, y, w, 32); g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeRect(-1, y, w + 2, 32); for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(0, y + Math.random() * 32); g.bezierCurveTo(w / 3, y + Math.random() * 32, w * 2 / 3, y + Math.random() * 32, w, y + Math.random() * 32); g.stroke(); } } });
  T.carpet = H.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#6a1a24'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.3); g.strokeStyle = 'rgba(216,176,74,.35)'; g.lineWidth = 3; for (let i = 0; i < w; i += 32) { g.beginPath(); g.arc(i + 16, 16, 10, 0, 7); g.arc(i + 16, 80, 10, 0, 7); g.stroke(); } });
  T.concrete = H.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8c8a86'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.2); noise(g, w, h, 0.1, '255,255,255'); g.strokeStyle = 'rgba(0,0,0,.15)'; g.strokeRect(0, 0, w, h); });
  T.metal = H.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#7a8088'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(0, y, w, 1); } g.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 8; i < w; i += 24) { g.beginPath(); g.arc(i, 6, 2, 0, 7); g.arc(i, h - 6, 2, 0, 7); g.fill(); } });
  T.plaster = H.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#e8e2d6'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.06); });
  T.brick = H.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8a8070'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = -32; x < w; x += 32) { g.fillStyle = `hsl(12,${35 + Math.random() * 15}%,${32 + Math.random() * 10}%)`; g.fillRect(x + ((y / 16) % 2) * 16 + 1, y + 1, 30, 14); } });
  T.container = H.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, 0, 3, h); } noise(g, w, h, 0.15, '90,40,20'); });
  T.palmLeaf = H.canvasTex(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = '#2f5a1e'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke();
    for (let y = 8; y < h; y += 7) { const l = (1 - Math.abs(y / h - 0.45) * 1.6) * w * 0.48; g.strokeStyle = `hsl(${95 + Math.random() * 20},45%,${26 + Math.random() * 10}%)`; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 - l, y + 18); g.moveTo(w / 2, y); g.lineTo(w / 2 + l, y + 18); g.stroke(); }
  }, false);
  // building facades: several window styles; uv maps 1 unit = 1 metre / scale
  const facade = (base, win, lit, style) => H.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); noise(g, w, h, 0.08);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const on = Math.random() < lit;
      const px = x * 64, py = y * 64;
      if (style === 'glass') { g.fillStyle = on ? '#e8d8a0' : win; g.fillRect(px + 2, py + 2, 60, 60); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(px + 2, py + 2, 60, 20); }
      else if (style === 'deco') { g.fillStyle = on ? '#ffe0a0' : win; g.fillRect(px + 16, py + 10, 32, 44); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(px + 8, py + 56, 48, 4); }
      else { g.fillStyle = on ? '#ffe7b0' : win; g.fillRect(px + 12, py + 14, 40, 36); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px + 10, py + 50, 44, 4); }
    }
  });
  T.facades = [
    facade('#e8e0d0', '#3a5a70', 0.15, 'win'), facade('#f0c8b8', '#3a5a70', 0.15, 'deco'), facade('#b8e0d8', '#2a4a5a', 0.15, 'deco'),
    facade('#7a8a9a', '#1e2c3a', 0.2, 'glass'), facade('#30404e', '#16222c', 0.25, 'glass'), facade('#d8d0a0', '#3a5060', 0.12, 'win'),
    facade('#f4e8f0', '#4a3a60', 0.15, 'deco'), facade('#a05a3a', '#2a2a2a', 0.15, 'win'), facade('#5a8ab0', '#1a2a3a', 0.25, 'glass'),
  ];
  T.roof = H.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#6a6862'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.25); });
  T.blood = H.canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(110,0,0,.9)'); gr.addColorStop(1, 'rgba(90,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
  T.smoke = H.canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
  T.flash = H.canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 30); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.3, 'rgba(255,190,80,.8)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,220,150,.8)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 30, 32 + Math.sin(a) * 30); g.stroke(); } }, false);
  T.hole = H.canvasTex(32, 32, (g) => { g.fillStyle = 'rgba(20,20,20,.9)'; g.beginPath(); g.arc(16, 16, 4, 0, 7); g.fill(); g.fillStyle = 'rgba(60,60,60,.5)'; g.beginPath(); g.arc(16, 16, 8, 0, 7); g.fill(); }, false);
  T.sky = H.canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a3a8a'); gr.addColorStop(0.45, '#7a6ab8'); gr.addColorStop(0.7, '#f08a7a'); gr.addColorStop(0.85, '#ffc070'); gr.addColorStop(1, '#ffd8a0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
};
// label texture: neon signs, vests, map labels
H.textTex = function (text, opts = {}) {
  const { w = 512, h = 128, font = 'bold 72px Arial', fg = '#fff', bg = null, glow = null } = opts;
  return H.canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (glow) { g.shadowColor = glow; g.shadowBlur = 18; }
    g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 4); g.fillText(text, w / 2, h / 2 + 4);
  }, false);
};

/* ---------------- batched boxes ----------------
 BoxBatch accumulates world-space boxes with vertex colours and metre-scaled UVs
 into one BufferGeometry per material, so a whole city is a handful of draw calls. */
H.BoxBatch = class {
  constructor(mat, uvScale = 4) { this.mat = mat; this.s = uvScale; this.pos = []; this.nor = []; this.uv = []; this.col = []; }
  // box centred at x,y,z with size sx,sy,sz rotated by ry (radians) around y
  add(x, y, z, sx, sy, sz, color = 0xffffff, ry = 0, faces = 63) {
    const c = new THREE.Color(color), hx = sx / 2, hy = sy / 2, hz = sz / 2, s = this.s;
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const P = (a, b, d) => [x + a * cs + d * sn, y + b, z - a * sn + d * cs];
    const N = (a, b, d) => [a * cs + d * sn, b, -a * sn + d * cs];
    const F = [
      // +x, -x, +y, -y, +z, -z: four corners, normal, uv dims
      [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [1, 0, 0], sz, sy],
      [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-1, 0, 0], sz, sy],
      [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz], [0, 1, 0], sx, sz],
      [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz], [0, -1, 0], sx, sz],
      [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], [0, 0, 1], sx, sy],
      [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [0, 0, -1], sx, sy],
    ];
    for (let f = 0; f < 6; f++) {
      if (!(faces & (1 << f))) continue;
      const [a, b, cc, d, n, u, v] = F[f];
      const pa = P(...a), pb = P(...b), pc = P(...cc), pd = P(...d), nn = N(...n);
      const U = u / s, V = v / s, by = f < 2 || f > 3 ? (y - hy) / s : 0;
      this.pos.push(...pa, ...pb, ...pc, ...pa, ...pc, ...pd);
      for (let i = 0; i < 6; i++) { this.nor.push(...nn); this.col.push(c.r, c.g, c.b); }
      this.uv.push(0, by, U, by, U, by + V, 0, by, U, by + V, 0, by + V);
    }
  }
  build(shadows = true) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, this.mat);
    m.castShadow = shadows; m.receiveShadow = true; m.matrixAutoUpdate = false;
    return m;
  }
};

/* ---------------- collision world ----------------
 Static axis-aligned boxes live in a spatial hash. Movers are vertical capsules
 resolved in XZ; floors are found by the highest box top under the feet. */
H.world = {
  cell: 8, map: new Map(), boxes: [],
  key(i, j) { return i * 73856093 ^ j * 19349663; },
  clear() { this.map.clear(); this.boxes.length = 0; },
  // box: {x0,x1,y0,y1,z0,z1, tag?, solid:true, owner?}
  add(b) {
    b.id = this.boxes.length; this.boxes.push(b);
    const c = this.cell;
    for (let i = Math.floor(b.x0 / c); i <= Math.floor(b.x1 / c); i++)
      for (let j = Math.floor(b.z0 / c); j <= Math.floor(b.z1 / c); j++) {
        const k = this.key(i, j); let a = this.map.get(k); if (!a) this.map.set(k, a = []); a.push(b);
      }
    return b;
  },
  addBox(x, y, z, sx, sy, sz, extra) { return this.add(Object.assign({ x0: x - sx / 2, x1: x + sx / 2, y0: y - sy / 2, y1: y + sy / 2, z0: z - sz / 2, z1: z + sz / 2 }, extra)); },
  remove(b) {
    b.dead = true;
    const c = this.cell;
    for (let i = Math.floor(b.x0 / c); i <= Math.floor(b.x1 / c); i++)
      for (let j = Math.floor(b.z0 / c); j <= Math.floor(b.z1 / c); j++) {
        const a = this.map.get(this.key(i, j)); if (a) { const idx = a.indexOf(b); if (idx >= 0) a.splice(idx, 1); }
      }
  },
  query(x0, z0, x1, z1, out = []) {
    out.length = 0; const c = this.cell, seen = H.world._seen || (H.world._seen = new Set()); seen.clear();
    for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++)
      for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) {
        const a = this.map.get(this.key(i, j)); if (!a) continue;
        for (const b of a) if (!seen.has(b)) { seen.add(b); out.push(b); }
      }
    return out;
  },
  // push a capsule (feet y, height h, radius r) out of boxes; returns ground height
  _q: [],
  move(p, r, h, stepUp = 0.45) {
    const q = this.query(p.x - r - 1, p.z - r - 1, p.x + r + 1, p.z + r + 1, this._q);
    let ground = -50;
    for (let pass = 0; pass < 2; pass++) {
      for (const b of q) {
        if (b.nocollide) continue;
        if (b.y1 <= p.y + stepUp || b.y0 >= p.y + h) continue; // walk over low boxes, under high ones
        const cx = H.clamp(p.x, b.x0, b.x1), cz = H.clamp(p.z, b.z0, b.z1);
        let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 < 1e-8) { // centre inside the box: push out along the shallowest axis
          const ox = Math.min(p.x - b.x0, b.x1 - p.x), oz = Math.min(p.z - b.z0, b.z1 - p.z);
          if (ox < oz) p.x = (p.x - b.x0 < b.x1 - p.x) ? b.x0 - r : b.x1 + r; else p.z = (p.z - b.z0 < b.z1 - p.z) ? b.z0 - r : b.z1 + r;
          continue;
        }
        const d = Math.sqrt(d2), push = r - d; p.x += dx / d * push; p.z += dz / d * push;
      }
    }
    for (const b of q) {
      if (b.nocollide) continue;
      if (p.x < b.x0 - 0.05 || p.x > b.x1 + 0.05 || p.z < b.z0 - 0.05 || p.z > b.z1 + 0.05) continue;
      if (b.y1 <= p.y + stepUp + 0.01 && b.y1 > ground) ground = b.y1;
    }
    return Math.max(ground, 0);
  },
  // ray vs boxes. Returns {t, box, n} for nearest hit within maxT.
  ray(o, d, maxT, ignoreGlass) {
    let best = null, bt = maxT;
    const c = this.cell, steps = Math.ceil(maxT / (c * 0.5));
    const seen = this._rs || (this._rs = new Set()); seen.clear();
    for (let s = 0; s <= steps; s++) {
      const t = Math.min(maxT, s * c * 0.5);
      if (t > bt + c) break;
      const x = o.x + d.x * t, z = o.z + d.z * t;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const a = this.map.get(this.key(Math.floor(x / c) + di, Math.floor(z / c) + dj)); if (!a) continue;
        for (const b of a) {
          if (seen.has(b)) continue; seen.add(b);
          if (b.noray || (ignoreGlass && b.glass)) continue;
          const hit = H.rayBox(o, d, b, bt);
          if (hit && hit.t < bt) { bt = hit.t; best = hit; best.box = b; }
        }
      }
    }
    return best;
  },
  // line of sight between two points (ignores glass)
  los(a, b) {
    const d = H._v1.subVectors(b, a); const len = d.length(); if (len < 0.01) return true; d.divideScalar(len);
    return !this.ray(a, d, len - 0.05, true);
  },
};
H._v1 = new THREE.Vector3(); H._v2 = new THREE.Vector3(); H._v3 = new THREE.Vector3();
H.rayBox = function (o, d, b, maxT) {
  let tmin = 0, tmax = maxT, nx = 0, ny = 0, nz = 0;
  const ax = [['x', b.x0, b.x1], ['y', b.y0, b.y1], ['z', b.z0, b.z1]];
  for (const [k, lo, hi] of ax) {
    const dv = d[k], ov = o[k];
    if (Math.abs(dv) < 1e-9) { if (ov < lo || ov > hi) return null; continue; }
    let t1 = (lo - ov) / dv, t2 = (hi - ov) / dv, s = -1;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
    if (t1 > tmin) { tmin = t1; nx = ny = nz = 0; if (k === 'x') nx = s; else if (k === 'y') ny = s; else nz = s; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  return { t: tmin, n: new THREE.Vector3(nx, ny, nz) };
};

/* ---------------- nav grid (1 m cells) ----------------
 Built once from the collision world. Police use a flow field around the
 player; guards, civilians and the crew use A*. */
H.nav = {
  size: 0, origin: 0, cs: 0.5, grid: null, flow: null, flowCx: 0, flowCz: 0, R: 120,
  build(metres, origin) {
    const size = Math.ceil(metres / this.cs);
    this.size = size; this.origin = origin; this.grid = new Uint8Array(size * size);
    for (const b of H.world.boxes) this.stamp(b, 1);
  },
  stamp(b, v) {
    if (b.nocollide || b.y0 > 1.6 || b.y1 < 0.4 || b.nonav) return;
    // a cell is blocked when its centre lies inside the box grown by the walker radius
    const inf = 0.25, cs = this.cs, o = this.origin;
    const i0 = Math.max(0, Math.ceil((b.x0 - inf - o) / cs - 0.5)), i1 = Math.min(this.size - 1, Math.floor((b.x1 + inf - o) / cs - 0.5));
    const j0 = Math.max(0, Math.ceil((b.z0 - inf - o) / cs - 0.5)), j1 = Math.min(this.size - 1, Math.floor((b.z1 + inf - o) / cs - 0.5));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.grid[j * this.size + i] = v;
  },
  cellOf(x, z) { return [Math.floor((x - this.origin) / this.cs), Math.floor((z - this.origin) / this.cs)]; },
  wx(i) { return (i + 0.5) * this.cs + this.origin; },
  blocked(i, j) { return i < 0 || j < 0 || i >= this.size || j >= this.size || this.grid[j * this.size + i] === 1; },
  // breadth-first distance field around (x,z); NPCs walk downhill
  buildFlow(x, z) {
    const R = this.R, N = R * 2 + 1;
    if (!this.flow) this.flow = new Uint16Array(N * N);
    const f = this.flow; f.fill(65535);
    const [ci, cj] = this.cellOf(x, z); this.flowCx = ci; this.flowCz = cj;
    const q = this._q || (this._q = new Int32Array(N * N)); let qh = 0, qt = 0;
    const start = (R) * N + R; f[start] = 0; q[qt++] = start;
    while (qh < qt) {
      const cur = q[qh++], li = cur % N, lj = (cur / N) | 0, dcur = f[cur];
      for (let k = 0; k < 4; k++) {
        const ni = li + (k === 0 ? 1 : k === 1 ? -1 : 0), nj = lj + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
        const idx = nj * N + ni; if (f[idx] !== 65535) continue;
        if (this.blocked(ci - R + ni, cj - R + nj)) continue;
        f[idx] = dcur + 1; q[qt++] = idx;
      }
    }
  },
  // direction to step from world x,z following the flow; null if outside field
  flowDir(x, z, out) {
    const R = this.R, N = R * 2 + 1; const [i, j] = this.cellOf(x, z);
    const li = i - this.flowCx + R, lj = j - this.flowCz + R;
    if (li < 1 || lj < 1 || li >= N - 1 || lj >= N - 1) return null;
    const f = this.flow; let best = f[lj * N + li], bi = 0, bj = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const v = f[(lj + dj) * N + li + di];
      if (di && dj && (f[lj * N + li + di] === 65535 || f[(lj + dj) * N + li] === 65535)) continue; // no corner cutting
      if (v < best) { best = v; bi = di; bj = dj; }
    }
    if (best === 65535) return null;
    if (!bi && !bj) { out.set(0, 0, 0); return out; }
    out.set(this.wx(i + bi) - x, 0, this.wx(j + bj) - z).normalize();
    return out;
  },
  flowDist(x, z) {
    const R = this.R, N = R * 2 + 1; const [i, j] = this.cellOf(x, z);
    const li = i - this.flowCx + R, lj = j - this.flowCz + R;
    if (li < 0 || lj < 0 || li >= N || lj >= N) return 65535;
    return this.flow[lj * N + li];
  },
  // A* with octile moves, capped expansions; returns array of {x,z} waypoints
  path(ax, az, bx, bz, maxExp = 16000) {
    const S = this.size; let [si, sj] = this.cellOf(ax, az); let [ti, tj] = this.cellOf(bx, bz);
    const fixStart = (i, j) => { if (!this.blocked(i, j)) return [i, j]; for (let r = 1; r < 4; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (!this.blocked(i + di, j + dj)) return [i + di, j + dj]; return [i, j]; };
    [si, sj] = fixStart(si, sj); [ti, tj] = fixStart(ti, tj);
    if (this.blocked(ti, tj)) return null;
    const open = [], g = new Map(), came = new Map(), key = (i, j) => j * S + i;
    const h = (i, j) => { const dx = Math.abs(i - ti), dz = Math.abs(j - tj); return Math.max(dx, dz) + 0.41 * Math.min(dx, dz); };
    const push = (n) => { open.push(n); let i = open.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (open[p].f <= open[i].f) break; [open[p], open[i]] = [open[i], open[p]]; i = p; } };
    const pop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < open.length && open[l].f < open[m].f) m = l; if (r < open.length && open[r].f < open[m].f) m = r; if (m === i) break; [open[m], open[i]] = [open[i], open[m]]; i = m; } } return top; };
    g.set(key(si, sj), 0); push({ i: si, j: sj, f: h(si, sj) });
    let exp = 0, found = false;
    while (open.length && exp++ < maxExp) {
      const c = pop(); if (c.i === ti && c.j === tj) { found = true; break; }
      const gc = g.get(key(c.i, c.j));
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const ni = c.i + di, nj = c.j + dj;
        if (this.blocked(ni, nj)) continue;
        if (di && dj && (this.blocked(c.i + di, c.j) || this.blocked(c.i, c.j + dj))) continue;
        const ng = gc + (di && dj ? 1.414 : 1), k = key(ni, nj);
        if (g.has(k) && g.get(k) <= ng) continue;
        g.set(k, ng); came.set(k, key(c.i, c.j)); push({ i: ni, j: nj, f: ng + h(ni, nj) });
      }
    }
    if (!found) return null;
    const pts = []; let k = key(ti, tj); const sk = key(si, sj);
    while (k !== sk && k !== undefined) { pts.push({ x: this.wx(k % S), z: this.wx(Math.floor(k / S)) }); k = came.get(k); }
    pts.reverse();
    // string-pull: keep only points where straight walking would hit a wall
    const out = []; let anchor = { x: ax, z: az }, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.clear(anchor.x, anchor.z, pts[j].x, pts[j].z)) j--;
      out.push(pts[j]); anchor = pts[j]; i = j + 1;
    }
    return out;
  },
  clear(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.25);
    for (let s = 1; s <= n; s++) { const t = s / n; const [i, j] = this.cellOf(ax + (bx - ax) * t, az + (bz - az) * t); if (this.blocked(i, j)) return false; }
    return true;
  },
};

/* ---------------- particles & decals ---------------- */
H.fx = {
  list: [], decals: [],
  init() {
    this.group = new THREE.Group(); H.scene.add(this.group);
    this.sprMat = (tex, add) => new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.smokeMat = this.sprMat(H.tex.smoke); this.flashMat = this.sprMat(H.tex.flash, true);
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.7 });
    this.decalGeo = new THREE.PlaneGeometry(0.14, 0.14);
    this.holeMat = new THREE.MeshBasicMaterial({ map: H.tex.hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    this.bloodMat = new THREE.MeshBasicMaterial({ map: H.tex.blood, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    this.sparkGeo = new THREE.BoxGeometry(0.03, 0.03, 0.12);
  },
  spawn(o) { this.list.push(o); this.group.add(o.obj); },
  smoke(pos, size = 1, life = 1.4, color = 0xcccccc, vel) {
    const m = this.smokeMat.clone(); m.color.setHex(color); m.opacity = 0.5;
    const s = new THREE.Sprite(m); s.position.copy(pos); s.scale.setScalar(size * 0.5);
    this.spawn({ obj: s, life, t: 0, vel: vel || new THREE.Vector3(H.rand(-0.3, 0.3), H.rand(0.4, 1.2), H.rand(-0.3, 0.3)), grow: size * 1.4, fade: 0.5 });
  },
  flash(pos, size = 0.6, life = 0.06) {
    const s = new THREE.Sprite(this.flashMat); s.position.copy(pos); s.scale.setScalar(size);
    this.spawn({ obj: s, life, t: 0, vel: new THREE.Vector3(), grow: 0, shared: true });
  },
  sparks(pos, n = 6, color = 0xffcc66, speed = 5) {
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.sparkGeo, mat); m.position.copy(pos);
      const v = new THREE.Vector3(H.rand(-1, 1), H.rand(0, 1.5), H.rand(-1, 1)).normalize().multiplyScalar(speed * H.rand(0.4, 1));
      this.spawn({ obj: m, life: H.rand(0.2, 0.5), t: 0, vel: v, grav: 9, spin: true });
    }
  },
  blood(pos, n = 5) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x7a0000 });
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.sparkGeo, mat); m.position.copy(pos); m.scale.setScalar(1.6);
      this.spawn({ obj: m, life: H.rand(0.3, 0.6), t: 0, vel: new THREE.Vector3(H.rand(-2, 2), H.rand(0, 3), H.rand(-2, 2)), grav: 12 });
    }
  },
  tracer(a, b) {
    const g = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
    const l = new THREE.Line(g, this.tracerMat);
    this.spawn({ obj: l, life: 0.05, t: 0, vel: new THREE.Vector3(), geo: g, shared: true });
  },
  decal(pos, n, blood) {
    const m = new THREE.Mesh(this.decalGeo, blood ? this.bloodMat : this.holeMat);
    m.position.copy(pos).addScaledVector(n, 0.01);
    m.lookAt(H._v2.copy(m.position).add(n));
    if (blood) m.scale.setScalar(H.rand(3, 7));
    H.scene.add(m); this.decals.push(m);
    if (this.decals.length > 120) { const d = this.decals.shift(); H.scene.remove(d); }
  },
  explosion(pos, r = 5) {
    this.flash(pos, r * 2.2, 0.15);
    for (let i = 0; i < 14; i++) this.smoke(pos.clone().add(new THREE.Vector3(H.rand(-1, 1), H.rand(0, 1), H.rand(-1, 1)).multiplyScalar(r * 0.4)), r * 0.9, H.rand(1.5, 3), i < 5 ? 0x553322 : 0x444444);
    this.sparks(pos, 20, 0xffaa33, 12);
    const l = new THREE.PointLight(0xffaa55, 8, r * 5, 2); l.position.copy(pos); H.scene.add(l);
    this.spawn({ obj: new THREE.Object3D(), life: 0.3, t: 0, vel: new THREE.Vector3(), light: l });
  },
  fire(pos, life = 6, r = 2) {
    // a burning patch: periodic flame sprites
    this.spawn({ obj: new THREE.Object3D(), life, t: 0, vel: new THREE.Vector3(), fireAt: pos.clone(), fireR: r, tick: 0 });
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.t += dt;
      if (p.t >= p.life) {
        this.group.remove(p.obj);
        if (p.geo) p.geo.dispose();
        if (p.light) H.scene.remove(p.light);
        if (!p.shared && p.obj.material && p.obj.material !== this.smokeMat && p.obj.isSprite) p.obj.material.dispose();
        this.list.splice(i, 1); continue;
      }
      const k = p.t / p.life;
      p.obj.position.addScaledVector(p.vel, dt);
      if (p.grav) p.vel.y -= p.grav * dt;
      if (p.spin) p.obj.lookAt(H._v2.copy(p.obj.position).add(p.vel));
      if (p.grow) { p.obj.scale.setScalar(p.obj.scale.x + p.grow * dt); }
      if (p.obj.isSprite && p.fade !== undefined) p.obj.material.opacity = p.fade * (1 - k);
      if (p.light) p.light.intensity = 8 * (1 - k);
      if (p.fireAt) {
        p.tick -= dt;
        if (p.tick <= 0) {
          p.tick = 0.06;
          const fp = p.fireAt.clone().add(new THREE.Vector3(H.rand(-p.fireR, p.fireR), 0.2, H.rand(-p.fireR, p.fireR)));
          const m = this.flashMat.clone(); m.opacity = 0.9;
          const s = new THREE.Sprite(m); s.position.copy(fp); s.scale.setScalar(H.rand(0.6, 1.3));
          this.spawn({ obj: s, life: 0.5, t: 0, vel: new THREE.Vector3(0, 1.8, 0), grow: -1, fade: 0.9 });
        }
        if (H.game && H.game.fireDamage) H.game.fireDamage(p.fireAt, p.fireR, dt);
      }
    }
  },
  clear() { for (const p of this.list) { this.group.remove(p.obj); if (p.light) H.scene.remove(p.light); } this.list.length = 0; for (const d of this.decals) H.scene.remove(d); this.decals.length = 0; },
};
