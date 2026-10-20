'use strict';
// ============================================================================
// Core — the engine under the game: Roblox-accurate units and physics
// constants, renderer, input, a synth audio bus, procedural Roblox-style
// materials (studded plastic, neon, concrete, grates), particles, decals,
// tracers, and the swept-AABB collision world everything moves through.
//
// Units are STUDS, like Roblox: a character is 5 studs tall, gravity is
// 196.2 studs/s^2, and a default jump leaves the ground at 50 studs/s.
// ============================================================================

const R = window.R = {
  t: 0, dt: 0, frame: 0, shake: 0, hitStop: 0,
  // Roblox engine constants, used verbatim so movement feels like the real game
  GRAVITY: 196.2,
  JUMP_POWER: 50,
  STUD: 1,
  settings: {
    quality: 'high', sens: 0.42, fov: 70, volume: 0.6, master: true,
    showFps: false, viewmodel: true, crosshairDot: true, bobbing: 0.7,
  },
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: a => a[Math.floor(Math.random() * a.length)],
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  damp: (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)),
  smooth: t => t * t * (3 - 2 * t),
  sign: v => v < 0 ? -1 : v > 0 ? 1 : 0,
  fmt: n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : '' + Math.round(n),
};

// Deterministic PRNG so a named map always builds the same way.
R.seeded = function (seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0;
  s = (s ^ 0x9e3779b9) >>> 0;
  return function () {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
};

/* ============================ renderer ============================ */

R.initRenderer = function () {
  const hi = R.settings.quality !== 'low';
  const r = new THREE.WebGLRenderer({ antialias: hi, powerPreference: 'high-performance', stencil: false });
  r.setPixelRatio(Math.min(devicePixelRatio, hi ? 1.5 : 1));
  r.setSize(innerWidth, innerHeight);
  r.shadowMap.enabled = hi;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.outputEncoding = THREE.sRGBEncoding;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.08;
  r.autoClear = false;
  document.getElementById('view').appendChild(r.domElement);
  R.renderer = r;

  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(R.settings.fov, innerWidth / innerHeight, 0.08, 4000);
  // Viewmodel lives in its own scene so geometry never clips into the world.
  R.vmScene = new THREE.Scene();
  R.vmCamera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.02, 60);
  const amb = new THREE.AmbientLight(0xffffff, 0.62);
  R.vmScene.add(amb);
  const vl = new THREE.DirectionalLight(0xffffff, 0.85); vl.position.set(-2, 3, 2);
  R.vmScene.add(vl);

  addEventListener('resize', () => {
    R.camera.aspect = R.vmCamera.aspect = innerWidth / innerHeight;
    R.camera.updateProjectionMatrix(); R.vmCamera.updateProjectionMatrix();
    r.setSize(innerWidth, innerHeight);
  });
  return r;
};

R.render = function () {
  const r = R.renderer;
  r.clear();
  r.render(R.scene, R.camera);
  if (R.settings.viewmodel) { r.clearDepth(); r.render(R.vmScene, R.vmCamera); }
};

/* ============================== input ============================== */

R.input = {
  keys: Object.create(null), down: Object.create(null), up: Object.create(null),
  mouse: [false, false, false], mdown: [false, false, false],
  dx: 0, dy: 0, wheel: 0, locked: false,
};

R.initInput = function (canvas) {
  const I = R.input;
  const norm = e => {
    const c = e.code;
    if (c.startsWith('Key')) return c.slice(3).toLowerCase();
    if (c.startsWith('Digit')) return c.slice(5);
    return c;
  };
  addEventListener('keydown', e => {
    const k = norm(e);
    if (!I.keys[k]) I.down[k] = true;
    I.keys[k] = true;
    if (['Space', 'Tab', 'ShiftLeft', 'ControlLeft'].includes(e.code) || /^Digit|^Key/.test(e.code)) {
      if (I.locked || e.code === 'Tab') e.preventDefault();
    }
  });
  addEventListener('keyup', e => { const k = norm(e); I.keys[k] = false; I.up[k] = true; });
  addEventListener('blur', () => { for (const k in I.keys) I.keys[k] = false; I.mouse = [false, false, false]; });

  canvas.addEventListener('mousedown', e => { I.mouse[e.button] = true; I.mdown[e.button] = true; });
  addEventListener('mouseup', e => { I.mouse[e.button] = false; });
  addEventListener('contextmenu', e => { if (I.locked) e.preventDefault(); });
  addEventListener('wheel', e => { I.wheel += Math.sign(e.deltaY); if (I.locked) e.preventDefault(); }, { passive: false });
  addEventListener('mousemove', e => {
    if (!I.locked) return;
    I.dx += e.movementX || 0; I.dy += e.movementY || 0;
  });
  document.addEventListener('pointerlockchange', () => {
    I.locked = document.pointerLockElement === canvas;
    if (R.onLockChange) R.onLockChange(I.locked);
  });
  R.lockPointer = () => canvas.requestPointerLock && canvas.requestPointerLock();
  R.unlockPointer = () => document.exitPointerLock && document.exitPointerLock();
};

R.endFrameInput = function () {
  const I = R.input;
  I.down = Object.create(null); I.up = Object.create(null);
  I.mdown = [false, false, false];
  I.dx = 0; I.dy = 0; I.wheel = 0;
};

/* ============================== audio ============================== */
// Everything is synthesised — no sample files, so the page is self-contained.

R.audio = {
  ctx: null, bus: null, ready: false,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.bus = this.ctx.createGain();
    this.bus.gain.value = R.settings.volume;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 7; comp.attack.value = 0.003;
    this.bus.connect(comp); comp.connect(this.ctx.destination);
    this.ready = true;
    this.noiseBuf = this.makeNoise(2);
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setVolume(v) { if (this.bus) this.bus.gain.value = v; },
  makeNoise(sec) {
    const n = Math.floor(this.ctx.sampleRate * sec);
    const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  },
  // Positional attenuation relative to the camera, in studs.
  gainAt(pos, falloff) {
    if (!pos) return 1;
    const d = R.camera.position.distanceTo(pos);
    return R.clamp(1 - d / (falloff || 240), 0, 1) ** 1.6;
  },
  noise(t, dur, { gain = 0.3, hp = 200, lp = 8000, q = 1, pos = null, falloff = 240, curve = 2 } = {}) {
    if (!this.ready) return;
    const g0 = gain * this.gainAt(pos, falloff);
    if (g0 < 0.002) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const hpf = this.ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = hp;
    const lpf = this.ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = lp; lpf.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(g0, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur * curve);
    s.connect(hpf); hpf.connect(lpf); lpf.connect(g); g.connect(this.bus);
    s.start(t); s.stop(t + dur * curve + 0.02);
  },
  tone(t, f0, f1, dur, { type = 'sine', gain = 0.2, pos = null, falloff = 240 } = {}) {
    if (!this.ready) return;
    const g0 = gain * this.gainAt(pos, falloff);
    if (g0 < 0.002) return;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(g0, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.bus);
    o.start(t); o.stop(t + dur + 0.02);
  },
  // ---- the game's sound set -------------------------------------------
  shot(kind, pos) {
    this.init(); if (!this.ready) return;
    const t = this.ctx.currentTime;
    const P = {
      rifle: [0.055, 0.42, 320, 7000, 150, 60],
      burst: [0.05, 0.38, 380, 7600, 170, 70],
      smg: [0.04, 0.3, 420, 8200, 190, 80],
      lmg: [0.07, 0.5, 240, 6200, 120, 48],
      sniper: [0.14, 0.7, 160, 6000, 90, 32],
      pistol: [0.045, 0.3, 420, 8000, 200, 90],
      revolver: [0.085, 0.52, 260, 7000, 130, 52],
      shotgun: [0.12, 0.62, 180, 6400, 100, 40],
      rocket: [0.3, 0.6, 120, 4200, 70, 26],
      grenade: [0.1, 0.42, 200, 5200, 110, 44],
      bow: [0.05, 0.16, 900, 9000, 0, 0],
      energy: [0.08, 0.3, 700, 9000, 420, 160],
      freeze: [0.12, 0.22, 900, 7000, 300, 120],
      melee: [0.06, 0.2, 500, 6000, 0, 0],
    }[kind] || [0.06, 0.4, 300, 7000, 150, 60];
    const [dur, gain, hp, lp, f0, f1] = P;
    this.noise(t, dur, { gain, hp, lp, pos, falloff: 400 });
    if (f0) this.tone(t, f0, f1, dur * 1.4, { type: 'square', gain: gain * 0.5, pos, falloff: 400 });
    if (kind === 'energy') this.tone(t, 1400, 420, 0.22, { type: 'sawtooth', gain: 0.14, pos, falloff: 400 });
    if (kind === 'bow') this.tone(t, 180, 90, 0.18, { type: 'triangle', gain: 0.18, pos, falloff: 300 });
  },
  explosion(pos) {
    this.init(); if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.5, { gain: 0.8, hp: 40, lp: 2400, pos, falloff: 500, curve: 2.4 });
    this.tone(t, 90, 24, 0.7, { type: 'sine', gain: 0.5, pos, falloff: 500 });
    this.noise(t + 0.04, 0.3, { gain: 0.3, hp: 900, lp: 9000, pos, falloff: 500 });
  },
  hit(crit, pos) {
    this.init(); if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.05, { gain: 0.3, hp: 1200, lp: 9000, pos, falloff: 300 });
    this.tone(t, crit ? 1500 : 950, crit ? 900 : 620, 0.09, { type: 'square', gain: 0.1 });
  },
  hitmark(crit) {
    this.init(); if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.tone(t, crit ? 1760 : 1320, crit ? 1320 : 990, 0.07, { type: 'triangle', gain: 0.2 });
    if (crit) this.tone(t + 0.05, 2200, 1700, 0.07, { type: 'triangle', gain: 0.15 });
  },
  kill() {
    this.init(); if (!this.ready) return;
    const t = this.ctx.currentTime;
    [880, 1174, 1568].forEach((f, i) => this.tone(t + i * 0.06, f, f * 1.2, 0.12, { type: 'square', gain: 0.17 }));
  },
  reload(stage, pos) {
    this.init(); if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.06, { gain: 0.22, hp: 600, lp: 5000, pos, falloff: 160 });
    this.tone(t, stage === 'in' ? 300 : 460, stage === 'in' ? 180 : 260, 0.08, { type: 'square', gain: 0.1, pos, falloff: 160 });
  },
  step(pos, slide) {
    this.init(); if (!this.ready) return;
    const t = this.ctx.currentTime;
    if (slide) this.noise(t, 0.3, { gain: 0.14, hp: 300, lp: 2600, pos, falloff: 120 });
    else this.noise(t, 0.05, { gain: 0.1, hp: 200, lp: 1800, pos, falloff: 110 });
  },
  jump(pos) { this.init(); if (this.ready) this.noise(this.ctx.currentTime, 0.05, { gain: 0.08, hp: 300, lp: 2000, pos, falloff: 100 }); },
  ui(kind) {
    this.init(); if (!this.ready) return;
    const t = this.ctx.currentTime;
    if (kind === 'click') this.tone(t, 760, 540, 0.05, { type: 'square', gain: 0.1 });
    else if (kind === 'buy') { [660, 990, 1320].forEach((f, i) => this.tone(t + i * 0.07, f, f, 0.12, { type: 'triangle', gain: 0.14 })); }
    else if (kind === 'deny') this.tone(t, 300, 150, 0.16, { type: 'sawtooth', gain: 0.12 });
    else if (kind === 'round') { [523, 659, 784, 1046].forEach((f, i) => this.tone(t + i * 0.1, f, f, 0.22, { type: 'triangle', gain: 0.15 })); }
    else if (kind === 'lose') { [523, 440, 349].forEach((f, i) => this.tone(t + i * 0.14, f, f * 0.9, 0.28, { type: 'sine', gain: 0.15 })); }
    else if (kind === 'countdown') this.tone(t, 1100, 1100, 0.1, { type: 'square', gain: 0.12 });
  },
};

/* ====================== procedural materials ====================== */
// Roblox's look comes from a few repeating surfaces. We draw them once into
// canvases and share the textures across every map.

R.tex = {};

// Colours in this project are authored as sRGB hex, the way a designer picks
// them, but the renderer lights in linear space and converts back on output.
// Without this conversion every surface came out one step too bright and the
// whole palette washed to white.
R.col = function (hex) { return new THREE.Color(hex).convertSRGBToLinear(); };

R._canvas = function (size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  draw(x, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.encoding = THREE.sRGBEncoding;
  return t;
};

R.buildTextures = function () {
  const T = R.tex;
  // The signature studded plastic top: a grid of little cylinders.
  T.studs = R._canvas(128, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    const n = 4, cell = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = (i + 0.5) * cell, cy = (j + 0.5) * cell, rad = cell * 0.3;
      const g = x.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.1, cx, cy, rad);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.65, '#e2e2e2'); g.addColorStop(1, '#b4b4b4');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.14)'; x.lineWidth = 1.5; x.stroke();
    }
  });
  // Plain smooth plastic with a faint noise so flat walls are not dead flat.
  T.plastic = R._canvas(64, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) {
      x.fillStyle = `rgba(0,0,0,${Math.random() * 0.045})`;
      x.fillRect(Math.random() * s, Math.random() * s, 1, 1);
    }
  });
  T.concrete = R._canvas(256, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      const v = Math.random();
      x.fillStyle = `rgba(${v > 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.12})`;
      x.fillRect(Math.random() * s, Math.random() * s, Math.random() * 3, Math.random() * 3);
    }
    x.strokeStyle = 'rgba(0,0,0,.07)';
    for (let i = 0; i < 14; i++) {
      x.beginPath(); x.moveTo(Math.random() * s, Math.random() * s);
      x.lineTo(Math.random() * s, Math.random() * s); x.stroke();
    }
  });
  T.metal = R._canvas(128, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 2) {
      x.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.05})`;
      x.fillRect(0, i, s, 1);
    }
    x.fillStyle = 'rgba(0,0,0,.10)';
    for (let i = 8; i < s; i += 32) for (let j = 8; j < s; j += 32) { x.beginPath(); x.arc(i, j, 2, 0, 7); x.fill(); }
  });
  T.grate = R._canvas(128, (x, s) => {
    x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, s, s);
    x.fillStyle = '#2a2a2a';
    for (let i = 0; i < s; i += 16) for (let j = 0; j < s; j += 16) x.fillRect(i + 4, j + 4, 8, 8);
  });
  T.wood = R._canvas(128, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
      x.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.07})`;
      x.lineWidth = 0.6 + Math.random() * 2;
      x.beginPath(); x.moveTo(0, Math.random() * s);
      x.bezierCurveTo(s * 0.33, Math.random() * s, s * 0.66, Math.random() * s, s, Math.random() * s);
      x.stroke();
    }
    x.fillStyle = 'rgba(0,0,0,.12)';
    for (let i = 0; i < s; i += 32) x.fillRect(0, i, s, 1);
  });
  T.tile = R._canvas(128, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 2;
    for (let i = 0; i <= s; i += s / 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, s); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(s, i); x.stroke(); }
    for (let i = 0; i < 2200; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`; x.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
  });
  T.sand = R._canvas(128, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 12000; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`; x.fillRect(Math.random() * s, Math.random() * s, 1.6, 1.6); }
  });
  T.grass = R._canvas(128, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      x.strokeStyle = `rgba(${Math.random() > 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.14})`;
      const px = Math.random() * s, py = Math.random() * s;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + R.rand(-1, 1), py - R.rand(1, 4)); x.stroke();
    }
  });
  T.carpet = R._canvas(128, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`; x.fillRect(Math.random() * s, Math.random() * s, 2, 1); }
  });
  T.circuit = R._canvas(256, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      let px = Math.floor(Math.random() * 8) * 32, py = Math.floor(Math.random() * 8) * 32;
      x.beginPath(); x.moveTo(px, py);
      for (let j = 0; j < 4; j++) { Math.random() > 0.5 ? px += 32 * (Math.random() > 0.5 ? 1 : -1) : py += 32 * (Math.random() > 0.5 ? 1 : -1); x.lineTo(px, py); }
      x.stroke();
      x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.arc(px, py, 3, 0, 7); x.fill();
    }
  });
  T.muzzle = R._canvas(64, (x, s) => {
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.3, 'rgba(255,214,120,.8)');
    g.addColorStop(0.7, 'rgba(255,140,40,.25)'); g.addColorStop(1, 'rgba(255,120,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    x.strokeStyle = 'rgba(255,240,200,.85)'; x.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * 7, L = s * (0.2 + Math.random() * 0.3);
      x.beginPath(); x.moveTo(s / 2, s / 2); x.lineTo(s / 2 + Math.cos(a) * L, s / 2 + Math.sin(a) * L); x.stroke();
    }
  });
  T.smoke = R._canvas(64, (x, s) => {
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.5, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
  });
  T.spark = R._canvas(32, (x, s) => {
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,220,150,.7)'); g.addColorStop(1, 'rgba(255,170,60,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
  });
  T.hole = R._canvas(32, (x, s) => {
    x.clearRect(0, 0, s, s);
    const g = x.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(12,10,10,.95)'); g.addColorStop(0.55, 'rgba(30,26,24,.6)'); g.addColorStop(1, 'rgba(60,54,50,0)');
    x.fillStyle = g; x.beginPath(); x.arc(s / 2, s / 2, s / 2, 0, 7); x.fill();
  });
};

// Material cache keyed on colour + surface, so maps of thousands of parts
// still draw in a handful of materials.
R._mats = new Map();
R.mat = function (color, surface, opts) {
  opts = opts || {};
  const key = color + '|' + surface + '|' + JSON.stringify(opts);
  if (R._mats.has(key)) return R._mats.get(key);
  const o = { color: R.col(color) };
  if (surface === 'neon') {
    const m = new THREE.MeshBasicMaterial({ color: R.col(color), transparent: !!opts.opacity, opacity: opts.opacity != null ? opts.opacity : 1 });
    R._mats.set(key, m); return m;
  }
  if (surface === 'glass') {
    const m = new THREE.MeshPhongMaterial({ color: R.col(color), transparent: true, opacity: opts.opacity != null ? opts.opacity : 0.26, shininess: 90, specular: 0xffffff });
    R._mats.set(key, m); return m;
  }
  const map = R.tex[surface] || R.tex.plastic;
  const m = new THREE.MeshLambertMaterial({ color: o.color, map });
  m.map = map;
  if (opts.repeat) { /* per-mesh repeat handled by cloning below */ }
  if (opts.opacity != null && opts.opacity < 1) { m.transparent = true; m.opacity = opts.opacity; }
  R._mats.set(key, m);
  return m;
};

// A material whose texture repeats to match the part's size, so studs stay
// one-stud-wide however big the brick is.
R.tiledMat = function (color, surface, w, h, opacity) {
  const base = R.tex[surface] || R.tex.plastic;
  const t = base.clone(); t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.max(0.25, w / 4), Math.max(0.25, h / 4));
  const m = new THREE.MeshLambertMaterial({ color: R.col(color), map: t });
  if (opacity != null && opacity < 1) { m.transparent = true; m.opacity = opacity; }
  return m;
};

/* ======================== collision world ======================== */
// Every solid in a map is an axis-aligned box. A uniform grid keeps both the
// player sweep and the bullet raycast cheap enough for hundreds of parts.

R.world = {
  boxes: [], grid: new Map(), cell: 24, bounds: null,
  reset() { this.boxes.length = 0; this.grid.clear(); this.bounds = new THREE.Box3(); },
  _key(ix, iz) { return ix + ',' + iz; },
  add(box) {
    const i = this.boxes.length;
    this.boxes.push(box);
    const c = this.cell;
    const x0 = Math.floor(box.min.x / c), x1 = Math.floor(box.max.x / c);
    const z0 = Math.floor(box.min.z / c), z1 = Math.floor(box.max.z / c);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const k = this._key(ix, iz);
      let a = this.grid.get(k); if (!a) { a = []; this.grid.set(k, a); }
      a.push(i);
    }
    if (this.bounds) this.bounds.union(new THREE.Box3(box.min, box.max));
    return i;
  },
  // Boxes overlapping an AABB region, de-duplicated.
  query(min, max, out) {
    out.length = 0;
    const c = this.cell, seen = R._seen || (R._seen = new Set());
    seen.clear();
    const x0 = Math.floor(min.x / c), x1 = Math.floor(max.x / c);
    const z0 = Math.floor(min.z / c), z1 = Math.floor(max.z / c);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const a = this.grid.get(this._key(ix, iz)); if (!a) continue;
      for (let i = 0; i < a.length; i++) if (!seen.has(a[i])) { seen.add(a[i]); out.push(this.boxes[a[i]]); }
    }
    return out;
  },
};

// A solid part: a box in the collision world plus its mesh.
R.part = function (opts) {
  const { x = 0, y = 0, z = 0, w = 4, h = 4, d = 4 } = opts;
  const color = opts.color || '#b8b8b8';
  const surface = opts.surface || 'plastic';
  const g = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(g, opts.mat || R.tiledMat(color, surface, Math.max(w, d), Math.max(h, d), opts.opacity));
  mesh.position.set(x, y + h / 2, z);
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  mesh.castShadow = !!opts.shadow && R.settings.quality !== 'low';
  mesh.receiveShadow = true;
  R.scene.add(mesh);
  if (!opts.decor) {
    // Rotated parts get their swept bounds, which is accurate enough for the
    // 45-degree ramps and props the maps use.
    const box = new THREE.Box3().setFromObject(mesh);
    R.world.add({
      min: { x: box.min.x, y: box.min.y, z: box.min.z },
      max: { x: box.max.x, y: box.max.y, z: box.max.z },
      climb: !!opts.climb, kill: !!opts.kill, bouncy: opts.bouncy || 0, mat: surface,
    });
  }
  return mesh;
};

/* --------------------------- raycasting --------------------------- */
// Slab test against one box; returns entry distance or -1.
R.rayBox = function (o, d, b) {
  let tmin = 0, tmax = Infinity, axis = -1, sign = 1;
  for (let i = 0; i < 3; i++) {
    const k = i === 0 ? 'x' : i === 1 ? 'y' : 'z';
    const inv = 1 / (d[k] || 1e-9);
    let t1 = (b.min[k] - o[k]) * inv, t2 = (b.max[k] - o[k]) * inv;
    let s = -1;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
    if (t1 > tmin) { tmin = t1; axis = i; sign = s; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }
  R.rayBox.axis = axis; R.rayBox.sign = sign;
  return tmin;
};

R._qbuf = [];
// Walk the ray through the grid and return the nearest solid hit.
R.raycastWorld = function (origin, dir, maxDist) {
  const o = { x: origin.x, y: origin.y, z: origin.z };
  const min = {
    x: Math.min(o.x, o.x + dir.x * maxDist), y: Math.min(o.y, o.y + dir.y * maxDist), z: Math.min(o.z, o.z + dir.z * maxDist),
  };
  const max = {
    x: Math.max(o.x, o.x + dir.x * maxDist), y: Math.max(o.y, o.y + dir.y * maxDist), z: Math.max(o.z, o.z + dir.z * maxDist),
  };
  const list = R.world.query(min, max, R._qbuf);
  let best = maxDist, hit = null, nAxis = -1, nSign = 1;
  for (let i = 0; i < list.length; i++) {
    const t = R.rayBox(o, dir, list[i]);
    if (t >= 0 && t < best) { best = t; hit = list[i]; nAxis = R.rayBox.axis; nSign = R.rayBox.sign; }
  }
  if (!hit) return null;
  const n = new THREE.Vector3();
  n[nAxis === 0 ? 'x' : nAxis === 1 ? 'y' : 'z'] = nSign;
  return {
    dist: best, box: hit, normal: n,
    point: new THREE.Vector3(o.x + dir.x * best, o.y + dir.y * best, o.z + dir.z * best),
  };
};

// Line of sight between two points, ignoring characters.
R.losClear = function (a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length(); if (len < 0.01) return true;
  d.multiplyScalar(1 / len);
  const h = R.raycastWorld(a, d, len - 0.3);
  return !h;
};

/* ======================= particles and decals ======================= */
// One pooled, additively blended points cloud for sparks and smoke, plus a
// small pool of quads for bullet holes and blood.

R.fx = {
  max: 1600, n: 0, pos: null, col: null, siz: null, vel: null, life: null, ttl: null, grav: null, drag: null, kind: null,
  init() {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.max * 3);
    this.col = new Float32Array(this.max * 3);
    this.siz = new Float32Array(this.max);
    this.vel = new Float32Array(this.max * 3);
    this.life = new Float32Array(this.max);
    this.ttl = new Float32Array(this.max);
    this.grav = new Float32Array(this.max);
    this.drag = new Float32Array(this.max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.siz, 1));
    const m = new THREE.PointsMaterial({
      size: 1, map: R.tex.spark, vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    R.scene.add(this.points);
    this.geo = g;

    // Smoke puffs use a separate, normally-blended cloud.
    const g2 = new THREE.BufferGeometry();
    this.spos = new Float32Array(400 * 3); this.scol = new Float32Array(400 * 3); this.ssiz = new Float32Array(400);
    this.svel = new Float32Array(400 * 3); this.slife = new Float32Array(400); this.sttl = new Float32Array(400);
    this.sn = 0;
    g2.setAttribute('position', new THREE.BufferAttribute(this.spos, 3));
    g2.setAttribute('color', new THREE.BufferAttribute(this.scol, 3));
    g2.setAttribute('size', new THREE.BufferAttribute(this.ssiz, 1));
    this.smoke = new THREE.Points(g2, new THREE.PointsMaterial({
      size: 1, map: R.tex.smoke, vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false, sizeAttenuation: true,
    }));
    this.smoke.frustumCulled = false;
    R.scene.add(this.smoke); this.sgeo = g2;
  },
  spark(p, v, color, size, ttl, gravity, drag) {
    const i = this.n < this.max ? this.n++ : Math.floor(Math.random() * this.max);
    const c = R.col(color);
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    this.vel[i * 3] = v.x; this.vel[i * 3 + 1] = v.y; this.vel[i * 3 + 2] = v.z;
    this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    this.siz[i] = size; this.life[i] = 0; this.ttl[i] = ttl;
    this.grav[i] = gravity == null ? 120 : gravity; this.drag[i] = drag == null ? 1.6 : drag;
  },
  puff(p, v, color, size, ttl) {
    const i = this.sn < 400 ? this.sn++ : Math.floor(Math.random() * 400);
    const c = R.col(color);
    this.spos[i * 3] = p.x; this.spos[i * 3 + 1] = p.y; this.spos[i * 3 + 2] = p.z;
    this.svel[i * 3] = v.x; this.svel[i * 3 + 1] = v.y; this.svel[i * 3 + 2] = v.z;
    this.scol[i * 3] = c.r; this.scol[i * 3 + 1] = c.g; this.scol[i * 3 + 2] = c.b;
    this.ssiz[i] = size; this.slife[i] = 0; this.sttl[i] = ttl;
  },
  burst(p, n, color, speed, size, ttl) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.acos(1 - Math.random() * 2), s = speed * (0.4 + Math.random() * 0.9);
      this.spark(p, {
        x: Math.sin(e) * Math.cos(a) * s, y: Math.cos(e) * s, z: Math.sin(e) * Math.sin(a) * s,
      }, color, size * R.rand(0.7, 1.3), ttl * R.rand(0.6, 1.3));
    }
  },
  impact(p, n, color) {
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * 7, s = R.rand(10, 44);
      this.spark(p, { x: n.x * 18 + Math.cos(a) * s, y: n.y * 18 + Math.abs(Math.sin(a)) * s, z: n.z * 18 + Math.sin(a) * s },
        color || '#ffd27a', R.rand(0.1, 0.26), R.rand(0.14, 0.4));
    }
    this.puff({ x: p.x + n.x * 0.4, y: p.y + n.y * 0.4, z: p.z + n.z * 0.4 },
      { x: n.x * 4, y: n.y * 4 + 2, z: n.z * 4 }, '#cfc9bd', R.rand(0.35, 0.8), 0.4);
  },
  blood(p, dir, amount) {
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * 7, s = R.rand(8, 34);
      this.spark(p, { x: dir.x * 16 + Math.cos(a) * s, y: R.rand(2, 24), z: dir.z * 16 + Math.sin(a) * s },
        '#c81e2a', R.rand(0.14, 0.34), R.rand(0.25, 0.6), 160, 1.1);
    }
  },
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] >= this.ttl[i]) { this.siz[i] = 0; continue; }
      this.life[i] += dt;
      const k = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= k; this.vel[i * 3 + 2] *= k;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const u = 1 - this.life[i] / this.ttl[i];
      this.siz[i] = Math.max(0, this.siz[i] * 0.995) * (u > 0.2 ? 1 : 0.9);
    }
    for (let i = 0; i < this.sn; i++) {
      if (this.slife[i] >= this.sttl[i]) { this.ssiz[i] = 0; continue; }
      this.slife[i] += dt;
      this.spos[i * 3] += this.svel[i * 3] * dt;
      this.spos[i * 3 + 1] += this.svel[i * 3 + 1] * dt;
      this.spos[i * 3 + 2] += this.svel[i * 3 + 2] * dt;
      this.svel[i * 3] *= 0.97; this.svel[i * 3 + 1] *= 0.97; this.svel[i * 3 + 2] *= 0.97;
      this.ssiz[i] *= 1 + dt * 1.4;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
    this.sgeo.attributes.position.needsUpdate = true;
    this.sgeo.attributes.size.needsUpdate = true;
    this.sgeo.attributes.color.needsUpdate = true;
  },
  clear() {
    for (let i = 0; i < this.n; i++) { this.siz[i] = 0; this.life[i] = 9; this.ttl[i] = 1; }
    for (let i = 0; i < this.sn; i++) { this.ssiz[i] = 0; this.slife[i] = 9; this.sttl[i] = 1; }
  },
};

R.decals = {
  pool: [], max: 90, i: 0,
  init() {
    const g = new THREE.PlaneGeometry(1, 1);
    for (let k = 0; k < this.max; k++) {
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        map: R.tex.hole, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4,
      }));
      m.visible = false; R.scene.add(m); this.pool.push(m);
    }
  },
  put(p, n, size, color) {
    const m = this.pool[this.i = (this.i + 1) % this.max];
    m.visible = true;
    m.material.opacity = 0.9;
    m.material.color = new THREE.Color(color || '#ffffff');
    m.position.set(p.x + n.x * 0.06, p.y + n.y * 0.06, p.z + n.z * 0.06);
    m.scale.set(size, size, 1);
    const look = new THREE.Vector3(p.x + n.x, p.y + n.y, p.z + n.z);
    m.lookAt(look);
    m.userData.born = R.t;
  },
  update() {
    for (const m of this.pool) {
      if (!m.visible) continue;
      const age = R.t - m.userData.born;
      if (age > 16) { m.visible = false; continue; }
      if (age > 12) m.material.opacity = 0.9 * (1 - (age - 12) / 4);
    }
  },
  clear() { for (const m of this.pool) m.visible = false; },
};

// Bullet tracers: short bright segments that fade.
R.tracers = {
  list: [], pool: [], max: 48,
  init() {
    const g = new THREE.CylinderGeometry(0.035, 0.035, 1, 5, 1, true);
    g.rotateX(Math.PI / 2);
    for (let i = 0; i < this.max; i++) {
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        color: 0xfff0b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      m.visible = false; R.scene.add(m); this.pool.push(m);
    }
  },
  add(a, b, color, width, ttl) {
    const m = this.pool.find(p => !p.visible) || this.pool[0];
    m.visible = true;
    m.material.color = R.col(color || '#fff0b0');
    m.material.opacity = 0.85;
    const d = new THREE.Vector3().subVectors(b, a);
    const len = d.length();
    m.position.copy(a).add(d.clone().multiplyScalar(0.5));
    m.lookAt(b);
    m.scale.set(width || 1, width || 1, len);
    m.userData.born = R.t; m.userData.ttl = ttl || 0.09;
  },
  update() {
    for (const m of this.pool) {
      if (!m.visible) continue;
      const u = (R.t - m.userData.born) / m.userData.ttl;
      if (u >= 1) { m.visible = false; continue; }
      m.material.opacity = 0.85 * (1 - u);
      m.scale.x = m.scale.y = (m.scale.x) * 0.94;
    }
  },
  clear() { for (const m of this.pool) m.visible = false; },
};

/* ========================= camera shake ========================= */
R.addShake = function (amount) { R.shake = Math.min(1.6, R.shake + amount); };
R.shakeOffset = function () {
  if (R.shake <= 0.0005) return { x: 0, y: 0, r: 0 };
  const s = R.shake * R.shake;
  return {
    x: (Math.random() * 2 - 1) * s * 0.5,
    y: (Math.random() * 2 - 1) * s * 0.5,
    r: (Math.random() * 2 - 1) * s * 0.03,
  };
};
