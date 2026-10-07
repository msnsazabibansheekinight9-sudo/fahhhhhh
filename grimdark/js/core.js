'use strict';
// Core: maths helpers, renderer, input, synth audio, procedural textures,
// particles, lights, gibs, decals and the box collision world.
const G = window.G = {
  t: 0, dt: 0, enemyScale: 1, shake: 0,
  settings: { quality: 'high', sens: 1, difficulty: 1, volume: 0.7, fov: 80 },
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: a => a[Math.floor(Math.random() * a.length)],
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  damp: (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)),
  smooth: t => t * t * (3 - 2 * t),
};
// keyframe track: [[t, v], ...] with smoothstep between keys
G.kf = function (t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i];
      const u = G.smooth((t - a[0]) / ((b[0] - a[0]) || 1));
      return a[1] + (b[1] - a[1]) * u;
    }
  }
  return keys[keys.length - 1][1];
};

/* ---------------- renderer ---------------- */
G.initRenderer = function () {
  const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, G.settings.quality === 'high' ? 1.5 : 1));
  r.setSize(innerWidth, innerHeight);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.outputEncoding = THREE.sRGBEncoding;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.15;
  r.autoClear = false;
  document.getElementById('view').appendChild(r.domElement);
  G.renderer = r;
  G.scene = new THREE.Scene();
  G.camera = new THREE.PerspectiveCamera(G.settings.fov, innerWidth / innerHeight, 0.05, 700);
  G.vmScene = new THREE.Scene();
  G.vmCamera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.01, 10);
  G.vmScene.add(G.vmCamera);
  G.vmAmb = new THREE.HemisphereLight(0xffffff, 0x333333, 0.7);
  G.vmScene.add(G.vmAmb);
  G.vmSun = new THREE.DirectionalLight(0xffffff, 1.6);
  G.vmSun.position.set(0.5, 1, 0.3);
  G.vmScene.add(G.vmSun);
  G.vmFlash = new THREE.PointLight(0xffaa55, 0, 3, 2);
  G.vmFlash.position.set(0.1, 0, -0.9);
  G.vmCamera.add(G.vmFlash);
  addEventListener('resize', G.onResize);
  G.onResize();
};
G.onResize = function () {
  G.renderer.setSize(innerWidth, innerHeight);
  for (const c of [G.camera, G.vmCamera]) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }
  G.fx && G.fx.updateScale();
};
// environment map from a gradient sky so metal reads as metal
// A plain mipmapped cube map (no PMREM render targets, which some GPUs and
// software renderers turn black).
G.makeEnv = function (top, horizon, bottom, glow) {
  const T = new THREE.Color(top), Hc = new THREE.Color(horizon), B = new THREE.Color(bottom), L = new THREE.Color(glow || 0xffffff);
  const N = 64, faces = [];
  const dirOf = [
    (u, v) => [1, -v, -u], (u, v) => [-1, -v, u], (u, v) => [u, 1, v],
    (u, v) => [u, -1, -v], (u, v) => [u, -v, 1], (u, v) => [-u, -v, -1]
  ];
  const c = new THREE.Color();
  for (let f = 0; f < 6; f++) {
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const x = cv.getContext('2d'), img = x.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const [dx, dy, dz] = dirOf[f]((i + 0.5) / N * 2 - 1, (j + 0.5) / N * 2 - 1);
      const h = dy / Math.hypot(dx, dy, dz);
      if (h > 0) c.copy(Hc).lerp(T, Math.pow(h, 0.6)); else c.copy(Hc).lerp(B, Math.pow(-h, 0.4));
      // a few bright "windows" so metal catches highlights
      const a = Math.atan2(dz, dx);
      if (h > 0.15 && h < 0.5 && Math.sin(a * 3) > 0.85) c.lerp(L, 0.8);
      const k = (j * N + i) * 4;
      img.data[k] = Math.min(255, c.r * 255); img.data[k + 1] = Math.min(255, c.g * 255); img.data[k + 2] = Math.min(255, c.b * 255); img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    faces.push(cv);
  }
  const tex = new THREE.CubeTexture(faces);
  tex.encoding = THREE.sRGBEncoding;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
};

/* ---------------- input ---------------- */
G.input = {
  keys: {}, pressed: {}, mdx: 0, mdy: 0, lmb: false, rmb: false, lmbPressed: false, rmbPressed: false, wheel: 0, locked: false,
  init() {
    addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.mdx += e.movementX; this.mdy += e.movementY;
    });
    addEventListener('mousedown', e => {
      if (!this.locked) return;
      if (e.button === 0) { this.lmb = true; this.lmbPressed = true; }
      if (e.button === 2) { this.rmb = true; this.rmbPressed = true; }
    });
    addEventListener('mouseup', e => {
      if (e.button === 0) this.lmb = false;
      if (e.button === 2) this.rmb = false;
    });
    addEventListener('wheel', e => { if (this.locked) this.wheel += Math.sign(e.deltaY); });
    addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === G.renderer.domElement;
      if (!this.locked) { this.lmb = this.rmb = false; G.onUnlock && G.onUnlock(); }
    });
  },
  lock() { G.renderer.domElement.requestPointerLock(); },
  endFrame() { this.pressed = {}; this.mdx = this.mdy = 0; this.lmbPressed = this.rmbPressed = false; this.wheel = 0; }
};

/* ---------------- synth audio ---------------- */
G.audio = {
  ctx: null,
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain();
    this.master.gain.value = G.settings.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    this.nbuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.nbuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // cheap reverb for the cathedral-scale spaces
    const ir = ctx.createBuffer(2, ctx.sampleRate * 2.2, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3);
    }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir;
    this.verbIn = ctx.createGain(); this.verbIn.gain.value = 0.22;
    this.verbIn.connect(this.verb); this.verb.connect(this.master);
  },
  setVolume(v) { if (this.master) this.master.gain.value = v; },
  out(pos, vol) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    let v = vol == null ? 1 : vol, pan = 0;
    if (pos && G.player) {
      const cp = G.camera.getWorldPosition(_a1);
      const dx = pos.x - cp.x, dy = pos.y - cp.y, dz = pos.z - cp.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      v *= 1 / (1 + d * d * 0.0025);
      const yaw = G.player.yaw;
      pan = G.clamp((dx * Math.cos(yaw) - dz * Math.sin(yaw)) / (d + 0.01), -1, 1) * 0.8;
    }
    if (v < 0.01) return null;
    g.gain.value = v;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = pan; g.connect(p); p.connect(this.master); p.connect(this.verbIn); }
    else { g.connect(this.master); }
    return g;
  },
  noise(dest, dur, type, f0, f1, q, vol, att) {
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.nbuf;
    s.playbackRate.value = 0.5 + Math.random();
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1 || f0), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (att || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  tone(dest, type, f0, f1, dur, vol, delay) {
    const ctx = this.ctx, t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  },
  play(name, pos, vol) {
    if (!this.ctx) return;
    const o = this.out(pos, vol);
    if (!o) return;
    const N = (...a) => this.noise(o, ...a), T = (...a) => this.tone(o, ...a);
    switch (name) {
      case 'bolter': T('square', 160, 45, 0.14, 0.35); N(0.22, 'lowpass', 2600, 250, 1, 0.9); N(0.04, 'highpass', 4000, 3000, 1, 0.5); break;
      case 'boltexp': N(0.3, 'lowpass', 1400, 120, 1, 0.6); T('sine', 90, 40, 0.2, 0.4); break;
      case 'plasma': T('sawtooth', 1400, 180, 0.3, 0.25); T('sine', 700, 90, 0.35, 0.4); N(0.25, 'bandpass', 4000, 800, 2, 0.3); break;
      case 'plasmaBig': T('sawtooth', 600, 50, 0.7, 0.4); T('sine', 300, 30, 0.8, 0.6); N(0.6, 'lowpass', 3000, 200, 1, 0.8); break;
      case 'charge': T('sine', 200, 1400, 0.9, 0.15); break;
      case 'melta': N(0.7, 'bandpass', 300, 3000, 3, 0.9); T('sawtooth', 80, 40, 0.7, 0.4); T('sine', 2000, 200, 0.5, 0.15); break;
      case 'explosion': N(1.4, 'lowpass', 900, 60, 1, 1.4); T('sine', 70, 25, 0.9, 0.9); N(0.3, 'highpass', 2000, 800, 1, 0.4); break;
      case 'slug': N(0.15, 'bandpass', 1300, 500, 1.5, 0.8); T('square', 220, 70, 0.1, 0.25); break;
      case 'autogun': N(0.08, 'highpass', 2500, 1200, 1, 0.6); T('square', 400, 120, 0.05, 0.12); break;
      case 'gauss': T('sawtooth', 1600, 90, 0.45, 0.25); T('sine', 3000, 2400, 0.3, 0.08); N(0.3, 'bandpass', 5000, 1500, 4, 0.3); break;
      case 'gaussCharge': T('sine', 300, 2400, 0.6, 0.07); break;
      case 'acid': N(0.25, 'bandpass', 700, 300, 3, 0.6); T('sine', 300, 120, 0.2, 0.2); break;
      case 'fireball': N(0.6, 'lowpass', 1200, 200, 1, 0.7); T('sawtooth', 120, 60, 0.5, 0.15); break;
      case 'screech': { const f = G.rand(700, 1100); T('sawtooth', f, f * 1.6, 0.18, 0.12); T('sawtooth', f * 1.5, f * 0.6, 0.35, 0.1, 0.15); break; }
      case 'grunt': { const f = G.rand(90, 140); T('sawtooth', f, f * 0.6, 0.4, 0.3); N(0.35, 'bandpass', 500, 300, 2, 0.3); break; }
      case 'roar': T('sawtooth', 75, 35, 1.2, 0.5); T('square', 110, 50, 1, 0.2); N(1.1, 'lowpass', 700, 120, 1, 0.6); break;
      case 'hum': T('sine', 55, 50, 0.7, 0.4); T('sine', 110, 108, 0.6, 0.1); break;
      case 'cultist': { const f = G.rand(160, 260); T('triangle', f, f * 0.7, 0.35, 0.2); break; }
      case 'hit': N(0.09, 'lowpass', 1100, 300, 1, 0.5); break;
      case 'armorHit': N(0.08, 'bandpass', 3000, 2000, 3, 0.4); T('square', 1200, 900, 0.05, 0.1); break;
      case 'hitmark': T('sine', 1700, 1600, 0.05, 0.12); break;
      case 'headshot': T('sine', 2400, 2300, 0.08, 0.15); T('sine', 1200, 1200, 0.1, 0.1, 0.03); break;
      case 'kill': T('sine', 900, 600, 0.12, 0.1); break;
      case 'pickup': T('sine', 600, 1300, 0.18, 0.25); T('sine', 900, 1800, 0.18, 0.15, 0.06); break;
      case 'magout': N(0.06, 'bandpass', 2400, 1800, 3, 0.5); T('square', 320, 200, 0.04, 0.12); break;
      case 'magin': N(0.05, 'bandpass', 3200, 2500, 3, 0.6); T('square', 500, 300, 0.05, 0.2); break;
      case 'rack': N(0.04, 'highpass', 3000, 2000, 2, 0.5); T('square', 700, 400, 0.04, 0.18); N(0.05, 'highpass', 2500, 2000, 2, 0.5); break;
      case 'step': N(0.09, 'lowpass', 380, 120, 1, 0.35); T('sine', 70, 40, 0.08, 0.2); break;
      case 'land': N(0.2, 'lowpass', 500, 80, 1, 0.8); T('sine', 60, 30, 0.2, 0.5); break;
      case 'hurt': N(0.18, 'lowpass', 500, 200, 1, 0.6); T('sine', 120, 60, 0.2, 0.4); break;
      case 'swing': N(0.25, 'bandpass', 400, 2400, 2, 0.5); break;
      case 'chainHit': N(0.25, 'bandpass', 1800, 900, 2, 0.7); T('sawtooth', 220, 160, 0.25, 0.3); break;
      case 'bounce': T('triangle', 900, 700, 0.05, 0.2); break;
      case 'vent': N(0.9, 'highpass', 3000, 6000, 1, 0.5, 0.05); break;
      case 'overheat': N(1.2, 'highpass', 2000, 5000, 1, 0.6); T('square', 400, 380, 0.3, 0.1); T('square', 400, 380, 0.3, 0.1, 0.4); break;
      case 'empty': T('square', 1000, 900, 0.03, 0.15); break;
      case 'ui': T('sine', 800, 900, 0.06, 0.15); break;
      case 'fury': T('sawtooth', 60, 120, 1.2, 0.4); N(1.4, 'lowpass', 300, 2000, 1, 0.6); T('sine', 400, 800, 1, 0.15); break;
      case 'spawnWarp': T('sine', 900, 60, 0.9, 0.2); N(0.8, 'bandpass', 2000, 200, 4, 0.3); break;
      case 'pulse': T('sine', 1800, 400, 0.12, 0.2); N(0.1, 'bandpass', 3000, 1500, 3, 0.35); break;
      case 'shuriken': N(0.05, 'highpass', 5000, 4000, 2, 0.35); T('triangle', 2400, 1800, 0.04, 0.08); break;
      case 'sniper': N(0.25, 'bandpass', 2400, 600, 2, 0.8); T('sawtooth', 900, 120, 0.3, 0.3); T('sine', 3200, 2800, 0.15, 0.08); break;
      case 'missile': N(0.9, 'lowpass', 2500, 300, 1, 0.9); T('sawtooth', 160, 60, 0.6, 0.15); break;
      case 'warpbolt': T('sine', 300, 1400, 0.25, 0.18); T('sawtooth', 120, 600, 0.3, 0.1); N(0.3, 'bandpass', 1200, 4000, 5, 0.25); break;
      case 'lightning': N(0.35, 'highpass', 1500, 6000, 1, 0.8); T('square', 60, 40, 0.3, 0.3); N(0.15, 'bandpass', 4000, 1500, 2, 0.5); break;
      case 'pod': T('sawtooth', 300, 40, 1.6, 0.3); N(1.6, 'lowpass', 4000, 300, 1, 0.6); break;
      case 'engine': N(2.5, 'lowpass', 900, 300, 1, 0.5); T('sawtooth', 70, 90, 2.5, 0.15); break;
      case 'vox': T('square', 900, 900, 0.05, 0.05); N(0.15, 'bandpass', 2000, 2000, 6, 0.15); T('square', 700, 700, 0.05, 0.05, 0.1); break;
      case 'bell':T('sine', 196, 194, 3, 0.35); T('sine', 392, 390, 2.5, 0.15); T('sine', 588, 585, 2, 0.08); break;
    }
  },
  // continuous sounds; returns {set(level), stop()}
  loop(kind) {
    if (!this.ctx) return { set() {}, stop() {} };
    const ctx = this.ctx, g = ctx.createGain(); g.gain.value = 0;
    g.connect(this.master); g.connect(this.verbIn);
    const nodes = [];
    let setF;
    if (kind === 'flamer' || kind === 'wind') {
      const s = ctx.createBufferSource(); s.buffer = this.nbuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = kind === 'wind' ? 'lowpass' : 'bandpass';
      f.frequency.value = kind === 'wind' ? 350 : 600; f.Q.value = 0.6;
      s.connect(f); f.connect(g); s.start(); nodes.push(s);
      setF = l => { f.frequency.setTargetAtTime((kind === 'wind' ? 200 : 450) + l * 600, ctx.currentTime, 0.1); };
    } else if (kind === 'chain') {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o1.type = o2.type = 'sawtooth'; o1.frequency.value = 70; o2.frequency.value = 141;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
      o1.connect(f); o2.connect(f); f.connect(g); o1.start(); o2.start(); nodes.push(o1, o2);
      setF = l => { const t = ctx.currentTime; o1.frequency.setTargetAtTime(70 + l * 110, t, 0.05); o2.frequency.setTargetAtTime(141 + l * 230, t, 0.05); };
    } else if (kind === 'drone') {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o1.type = 'sine'; o2.type = 'triangle'; o1.frequency.value = 41; o2.frequency.value = 61.7;
      o1.connect(g); o2.connect(g); o1.start(); o2.start(); nodes.push(o1, o2);
      setF = () => {};
    }
    return {
      set(level, vol) { g.gain.setTargetAtTime(vol == null ? level * 0.5 : vol, ctx.currentTime, 0.06); setF(level); },
      stop() { g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); setTimeout(() => { nodes.forEach(n => n.stop()); g.disconnect(); }, 400); }
    };
  }
};
const _a1 = new THREE.Vector3();

/* ---------------- procedural textures ---------------- */
G.texCache = {};
G.canvasTex = function (key, size, draw, rep, linear) {
  if (G.texCache[key]) return G.texCache[key];
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  draw(x, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (!linear) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 4;
  if (rep) t.repeat.set(rep, rep);
  G.texCache[key] = t;
  return t;
};
const hex = (c, a) => {
  const col = new THREE.Color(c);
  return `rgba(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0},${a == null ? 1 : a})`;
};
G.hex = hex;
G.texNoise = function (key, base, opts) {
  opts = opts || {};
  return G.canvasTex(key, opts.size || 256, (x, s) => {
    x.fillStyle = hex(base); x.fillRect(0, 0, s, s);
    const n = opts.n || 2500;
    for (let i = 0; i < n; i++) {
      const l = Math.random() < 0.5;
      x.fillStyle = l ? `rgba(255,255,255,${Math.random() * (opts.v || 0.08)})` : `rgba(0,0,0,${Math.random() * (opts.v || 0.08) * 1.6})`;
      const r = Math.random() * (opts.r || 6) + 1;
      x.beginPath(); x.arc(Math.random() * s, Math.random() * s, r, 0, 7); x.fill();
    }
    if (opts.cracks) {
      x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1;
      for (let i = 0; i < opts.cracks; i++) {
        let px = Math.random() * s, py = Math.random() * s;
        x.beginPath(); x.moveTo(px, py);
        for (let k = 0; k < 8; k++) { px += G.rand(-14, 14); py += G.rand(-14, 14); x.lineTo(px, py); }
        x.stroke();
      }
    }
    if (opts.bands) {
      for (let i = 0; i < opts.bands; i++) {
        x.fillStyle = `rgba(0,0,0,${G.rand(0.1, 0.3)})`;
        x.fillRect(0, (i / opts.bands) * s, s, G.rand(2, 5));
      }
    }
    if (opts.extra) opts.extra(x, s);
  }, opts.rep);
};
G.texPanels = function (key, base, opts) {
  opts = opts || {};
  return G.canvasTex(key, 256, (x, s) => {
    x.fillStyle = hex(base); x.fillRect(0, 0, s, s);
    for (let i = 0; i < 1800; i++) {
      x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`;
      x.fillRect(Math.random() * s, Math.random() * s, G.rand(1, 30), 1);
    }
    const g = opts.grid || 4;
    x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 2;
    for (let i = 0; i <= g; i++) {
      const p = i * s / g;
      x.beginPath(); x.moveTo(p, 0); x.lineTo(p, s); x.stroke();
      x.beginPath(); x.moveTo(0, p); x.lineTo(s, p); x.stroke();
    }
    x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 1;
    for (let i = 0; i <= g; i++) {
      const p = i * s / g + 2;
      x.beginPath(); x.moveTo(p, 0); x.lineTo(p, s); x.stroke();
      x.beginPath(); x.moveTo(0, p); x.lineTo(s, p); x.stroke();
    }
    x.fillStyle = 'rgba(0,0,0,0.5)';
    for (let i = 0; i < g; i++) for (let j = 0; j < g; j++) {
      const cx = i * s / g, cy = j * s / g;
      for (const [ox, oy] of [[6, 6], [s / g - 6, 6], [6, s / g - 6], [s / g - 6, s / g - 6]]) {
        x.beginPath(); x.arc(cx + ox, cy + oy, 2, 0, 7); x.fill();
      }
    }
    if (opts.rust) {
      for (let i = 0; i < opts.rust; i++) {
        x.fillStyle = `rgba(${G.randi(90, 140)},${G.randi(40, 60)},20,${G.rand(0.05, 0.25)})`;
        x.beginPath(); x.arc(Math.random() * s, Math.random() * s, G.rand(3, 18), 0, 7); x.fill();
      }
    }
    if (opts.stripes) {
      x.save(); x.globalAlpha = 0.85;
      for (let i = -s; i < s * 2; i += 32) {
        x.fillStyle = (i / 32) % 2 ? '#c9a21a' : '#151515';
        x.beginPath(); x.moveTo(i, s - 24); x.lineTo(i + 16, s - 24); x.lineTo(i + 40, s); x.lineTo(i + 24, s); x.fill();
      }
      x.restore();
    }
  }, opts.rep);
};
G.texBricks = function (key, base, opts) {
  opts = opts || {};
  return G.canvasTex(key, 256, (x, s) => {
    x.fillStyle = hex(base); x.fillRect(0, 0, s, s);
    const rows = opts.rows || 8, bw = s / (opts.cols || 4), bh = s / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = -1; c < (opts.cols || 4) + 1; c++) {
        const ox = (r % 2) * bw / 2 + c * bw;
        const sh = G.rand(-0.08, 0.08);
        x.fillStyle = sh > 0 ? `rgba(255,255,255,${sh})` : `rgba(0,0,0,${-sh * 1.5})`;
        x.fillRect(ox + 2, r * bh + 2, bw - 4, bh - 4);
      }
      x.fillStyle = 'rgba(0,0,0,0.55)';
      x.fillRect(0, r * bh, s, 2);
      for (let c = -1; c < (opts.cols || 4) + 1; c++) x.fillRect((r % 2) * bw / 2 + c * bw, r * bh, 2, bh);
    }
    for (let i = 0; i < 2500; i++) {
      x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.08})`;
      x.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    if (opts.grime) {
      const gr = x.createLinearGradient(0, 0, 0, s);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)');
      x.fillStyle = gr; x.fillRect(0, 0, s, s);
    }
  }, opts.rep);
};
G.texSoft = function () {
  return G.canvasTex('soft', 64, (x, s) => {
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
  }, 0, true);
};
G.texPuff = function () {
  return G.canvasTex('puff', 128, (x, s) => {
    for (let i = 0; i < 14; i++) {
      const cx = s / 2 + G.rand(-22, 22), cy = s / 2 + G.rand(-22, 22), r = G.rand(16, 34);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, s, s);
    }
  }, 0, true);
};
G.texSplat = function () {
  return G.canvasTex('splat', 128, (x, s) => {
    x.fillStyle = '#fff';
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 7, d = Math.random() * s * 0.32;
      x.beginPath(); x.arc(s / 2 + Math.cos(a) * d, s / 2 + Math.sin(a) * d, G.rand(3, 16) * (1 - d / s), 0, 7); x.fill();
    }
    x.beginPath(); x.arc(s / 2, s / 2, s * 0.16, 0, 7); x.fill();
  }, 0, true);
};

/* ---------------- materials ---------------- */
G.matCache = {};
G.mat = function (key, o) {
  if (G.matCache[key]) return G.matCache[key];
  o = o || {};
  const m = new THREE.MeshStandardMaterial({
    color: o.color == null ? 0xffffff : o.color, roughness: o.rough == null ? 0.7 : o.rough, metalness: o.metal || 0,
    map: o.map || null, bumpMap: o.bump || null, bumpScale: o.bs || 0.02,
    emissive: o.emissive || 0, emissiveIntensity: o.ei == null ? 1 : o.ei,
    transparent: !!o.transparent, opacity: o.opacity == null ? 1 : o.opacity,
    side: o.side || THREE.FrontSide, flatShading: !!o.flat, depthWrite: o.depthWrite !== false
  });
  G.matCache[key] = m;
  return m;
};
G.glow = function (key, color, opacity) {
  if (G.matCache[key]) return G.matCache[key];
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity == null ? 1 : opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  G.matCache[key] = m;
  return m;
};

/* ---------------- particles ---------------- */
class PSys {
  constructor(cap, additive, tex) {
    this.cap = cap; this.n = 0;
    this.p = new Float32Array(cap * 3); this.v = new Float32Array(cap * 3);
    this.life = new Float32Array(cap); this.max = new Float32Array(cap);
    this.s0 = new Float32Array(cap); this.s1 = new Float32Array(cap);
    this.c0 = new Float32Array(cap * 3); this.c1 = new Float32Array(cap * 3);
    this.a0 = new Float32Array(cap); this.a1 = new Float32Array(cap);
    this.gr = new Float32Array(cap); this.dr = new Float32Array(cap);
    const g = this.geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.col = new THREE.BufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.siz = new THREE.BufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.pos); g.setAttribute('pcolor', this.col); g.setAttribute('size', this.siz);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 500 } },
      vertexShader: 'attribute float size; attribute vec4 pcolor; varying vec4 vC; uniform float scale; void main(){ vC=pcolor; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*scale/max(.1,-mv.z); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec4 vC; void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vC.rgb,vC.a*t.a); }',
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 10 : 9;
  }
  emit(x, y, z, vx, vy, vz, life, s0, s1, c0, c1, a0, a1, grav, drag) {
    let i = this.n;
    if (i >= this.cap) i = Math.floor(Math.random() * this.cap); else this.n++;
    const i3 = i * 3;
    this.p[i3] = x; this.p[i3 + 1] = y; this.p[i3 + 2] = z;
    this.v[i3] = vx; this.v[i3 + 1] = vy; this.v[i3 + 2] = vz;
    this.life[i] = 0; this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1;
    this.c0[i3] = c0.r; this.c0[i3 + 1] = c0.g; this.c0[i3 + 2] = c0.b;
    this.c1[i3] = c1.r; this.c1[i3 + 1] = c1.g; this.c1[i3 + 2] = c1.b;
    this.a0[i] = a0; this.a1[i] = a1; this.gr[i] = grav || 0; this.dr[i] = drag || 0;
  }
  update(dt) {
    const P = this.pos.array, C = this.col.array, S = this.siz.array;
    let i = 0;
    while (i < this.n) {
      this.life[i] += dt;
      if (this.life[i] >= this.max[i]) { this.kill(i); continue; }
      const i3 = i * 3, t = this.life[i] / this.max[i];
      const dr = Math.exp(-this.dr[i] * dt);
      this.v[i3] *= dr; this.v[i3 + 1] = this.v[i3 + 1] * dr - this.gr[i] * dt; this.v[i3 + 2] *= dr;
      this.p[i3] += this.v[i3] * dt; this.p[i3 + 1] += this.v[i3 + 1] * dt; this.p[i3 + 2] += this.v[i3 + 2] * dt;
      if (this.p[i3 + 1] < 0.02 && this.gr[i] > 0) { this.p[i3 + 1] = 0.02; this.v[i3 + 1] *= -0.3; this.v[i3] *= 0.6; this.v[i3 + 2] *= 0.6; }
      P[i3] = this.p[i3]; P[i3 + 1] = this.p[i3 + 1]; P[i3 + 2] = this.p[i3 + 2];
      const i4 = i * 4;
      C[i4] = this.c0[i3] + (this.c1[i3] - this.c0[i3]) * t;
      C[i4 + 1] = this.c0[i3 + 1] + (this.c1[i3 + 1] - this.c0[i3 + 1]) * t;
      C[i4 + 2] = this.c0[i3 + 2] + (this.c1[i3 + 2] - this.c0[i3 + 2]) * t;
      C[i4 + 3] = this.a0[i] + (this.a1[i] - this.a0[i]) * t;
      S[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      i++;
    }
    this.geo.setDrawRange(0, this.n);
    this.pos.needsUpdate = this.col.needsUpdate = this.siz.needsUpdate = true;
  }
  kill(i) {
    const j = --this.n;
    if (i === j) return;
    const i3 = i * 3, j3 = j * 3;
    for (let k = 0; k < 3; k++) {
      this.p[i3 + k] = this.p[j3 + k]; this.v[i3 + k] = this.v[j3 + k];
      this.c0[i3 + k] = this.c0[j3 + k]; this.c1[i3 + k] = this.c1[j3 + k];
    }
    this.life[i] = this.life[j]; this.max[i] = this.max[j]; this.s0[i] = this.s0[j]; this.s1[i] = this.s1[j];
    this.a0[i] = this.a0[j]; this.a1[i] = this.a1[j]; this.gr[i] = this.gr[j]; this.dr[i] = this.dr[j];
  }
  clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
}

const C = c => new THREE.Color(c);
const COL = {};
const col = c => COL[c] || (COL[c] = new THREE.Color(c));
G.fx = {
  init() {
    this.add = new PSys(G.settings.quality === 'high' ? 7000 : 3500, true, G.texSoft());
    this.smoke = new PSys(G.settings.quality === 'high' ? 4000 : 2000, false, G.texPuff());
    this.updateScale();
    // pooled point lights (fixed count so shaders never recompile)
    this.lights = [];
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 10, 2);
      l.userData = { life: 0, max: 1, peak: 0 };
      this.lights.push(l);
    }
    this.gibs = []; this.decals = []; this.tracers = [];
    this.gibGeo = [new THREE.BoxGeometry(1, 1, 1), new THREE.DodecahedronGeometry(0.6), new THREE.CylinderGeometry(0.35, 0.5, 1.4, 6)];
    this.decalGeo = new THREE.PlaneGeometry(1, 1); this.decalGeo.rotateX(-Math.PI / 2);
    this.tracerGeo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true); this.tracerGeo.rotateX(Math.PI / 2);
  },
  attach(scene) {
    scene.add(this.add.points, this.smoke.points);
    this.lights.forEach(l => scene.add(l));
  },
  reset() {
    this.add.clear(); this.smoke.clear();
    this.gibs.forEach(g => g.mesh.parent && g.mesh.parent.remove(g.mesh)); this.gibs = [];
    this.decals.forEach(d => d.parent && d.parent.remove(d)); this.decals = [];
    this.tracers.forEach(t => t.mesh.parent && t.mesh.parent.remove(t.mesh)); this.tracers = [];
    this.lights.forEach(l => { l.intensity = 0; l.userData.life = l.userData.max; });
  },
  updateScale() {
    if (!this.add) return;
    const s = innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(G.camera.fov) / 2));
    this.add.mat.uniforms.scale.value = s; this.smoke.mat.uniforms.scale.value = s;
  },
  flash(pos, color, intensity, dist, dur) {
    let best = this.lights[0];
    for (const l of this.lights) if (l.userData.life / l.userData.max > best.userData.life / best.userData.max || l.intensity === 0) { best = l; if (l.intensity === 0) break; }
    best.position.copy(pos); best.color.set(color); best.distance = dist;
    best.userData.life = 0; best.userData.max = dur; best.userData.peak = intensity; best.intensity = intensity;
  },
  burst(sys, pos, n, o) {
    const c0 = col(o.c0), c1 = col(o.c1 || o.c0);
    for (let i = 0; i < n; i++) {
      const sp = G.rand(o.sp[0], o.sp[1]);
      let dx = G.rand(-1, 1), dy = G.rand(-1, 1), dz = G.rand(-1, 1);
      if (o.dir) { dx = o.dir.x + dx * o.cone; dy = o.dir.y + dy * o.cone; dz = o.dir.z + dz * o.cone; }
      const l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const j = o.jit || 0;
      sys.emit(pos.x + G.rand(-j, j), pos.y + G.rand(-j, j), pos.z + G.rand(-j, j),
        dx / l * sp, dy / l * sp + (o.up || 0), dz / l * sp,
        G.rand(o.life[0], o.life[1]), G.rand(o.s0[0], o.s0[1]), o.s1, c0, c1, o.a0 == null ? 1 : o.a0, o.a1 || 0, o.grav, o.drag);
    }
  },
  sparks(pos, dir, color, n) {
    this.burst(this.add, pos, n || 10, { c0: 0xffffff, c1: color || 0xff8820, sp: [3, 12], dir, cone: 0.9, life: [0.15, 0.45], s0: [0.04, 0.09], s1: 0.01, grav: 14, drag: 1 });
  },
  muzzle(pos, dir, color, big) {
    const k = big || 1;
    this.burst(this.add, pos, 8 * k, { c0: 0xffffff, c1: color, sp: [1, 6 * k], dir, cone: 0.35, life: [0.03, 0.08], s0: [0.15 * k, 0.35 * k], s1: 0.05, drag: 6 });
    this.burst(this.smoke, pos, 3, { c0: 0x777777, sp: [0.3, 1.5], dir, cone: 0.6, life: [0.5, 1.2], s0: [0.2, 0.4], s1: 1.2, a0: 0.25, drag: 2, up: 0.4 });
  },
  explosion(pos, r, color, smokeCol) {
    const c = color || 0xff7a20;
    this.burst(this.add, pos, 40 * r, { c0: 0xfff2c0, c1: c, sp: [2, 9 * r], life: [0.2, 0.6], s0: [0.8 * r, 1.6 * r], s1: 0.2, drag: 3, jit: 0.3 * r });
    this.burst(this.add, pos, 30, { c0: 0xffffff, c1: c, sp: [8, 22], life: [0.3, 0.9], s0: [0.05, 0.12], s1: 0.02, grav: 16, drag: 0.8 });
    this.burst(this.smoke, pos, 18 * r, { c0: smokeCol || 0x2a2622, c1: 0x555048, sp: [0.5, 3 * r], life: [1.2, 3.2], s0: [0.8 * r, 1.6 * r], s1: 4 * r, a0: 0.55, drag: 1.5, up: 1.5, jit: 0.5 * r });
    this.flash(pos, c, 18 * r, 8 + r * 7, 0.35);
    this.decal(pos, 0x0a0806, 1.6 * r + 1, 0.85);
    const d = G.player ? G.camera.getWorldPosition(_a1).distanceTo(pos) : 30;
    G.shake = Math.min(1.4, G.shake + r * 6 / (4 + d));
  },
  blood(pos, dir, color, n) {
    this.burst(this.smoke, pos, n || 10, { c0: color, c1: color, sp: [1, 6], dir, cone: 0.8, life: [0.4, 0.9], s0: [0.08, 0.2], s1: 0.25, a0: 0.95, a1: 0.6, grav: 12, drag: 1.2 });
    this.burst(this.smoke, pos, 3, { c0: color, sp: [0.3, 1], life: [0.3, 0.6], s0: [0.3, 0.5], s1: 0.9, a0: 0.5, drag: 3 });
  },
  gib(pos, mat, size, vel) {
    if (this.gibs.length > (G.settings.quality === 'high' ? 90 : 40)) { const o = this.gibs.shift(); o.mesh.parent && o.mesh.parent.remove(o.mesh); }
    const m = new THREE.Mesh(G.pick(this.gibGeo), mat);
    m.scale.setScalar(size); m.position.copy(pos); m.castShadow = true;
    m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    G.scene.add(m);
    this.gibs.push({ mesh: m, v: vel.clone(), av: new THREE.Vector3(G.rand(-9, 9), G.rand(-9, 9), G.rand(-9, 9)), life: 0, size, trail: mat.userData.blood });
  },
  decal(pos, color, size, alpha) {
    const key = 'decal' + color + '_' + (alpha || 0.8);
    let m = G.matCache[key];
    if (!m) m = G.matCache[key] = new THREE.MeshBasicMaterial({ map: G.texSplat(), color, transparent: true, opacity: alpha || 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const d = new THREE.Mesh(this.decalGeo, m);
    const gy = G.world.groundAt(pos.x, pos.z, pos.y + 0.5);
    d.position.set(pos.x, gy + 0.02 + Math.random() * 0.01, pos.z);
    d.rotation.y = Math.random() * 6; d.scale.setScalar(size);
    d.renderOrder = 1;
    G.scene.add(d);
    this.decals.push(d);
    if (this.decals.length > 140) { const o = this.decals.shift(); o.parent && o.parent.remove(o); }
  },
  tracer(from, to, color, width, life) {
    const key = 'tr' + color;
    const m = G.glow(key, color, 0.9);
    const mesh = new THREE.Mesh(this.tracerGeo, m.clone());
    const len = from.distanceTo(to);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.lookAt(to); mesh.scale.set(width, width, len);
    G.scene.add(mesh);
    this.tracers.push({ mesh, life: 0, max: life || 0.08, w: width });
  },
  update(dt) {
    this.add.update(dt); this.smoke.update(dt);
    for (const l of this.lights) {
      const u = l.userData;
      if (u.life < u.max) { u.life += dt; l.intensity = u.peak * Math.max(0, 1 - u.life / u.max); }
      else l.intensity = 0;
    }
    for (let i = this.gibs.length - 1; i >= 0; i--) {
      const g = this.gibs[i]; g.life += dt;
      const m = g.mesh;
      if (g.v.lengthSq() > 0.01 || m.position.y > 0.1) {
        g.v.y -= 20 * dt;
        m.position.addScaledVector(g.v, dt);
        m.rotation.x += g.av.x * dt; m.rotation.y += g.av.y * dt; m.rotation.z += g.av.z * dt;
        const gy = G.world.groundAt(m.position.x, m.position.z, m.position.y + 0.3) + g.size * 0.3;
        if (m.position.y < gy) {
          m.position.y = gy;
          if (g.v.y < -3 && g.trail) this.decal(m.position, g.trail, g.size * 2.5, 0.8);
          g.v.y *= -0.3; g.v.x *= 0.6; g.v.z *= 0.6; g.av.multiplyScalar(0.6);
          if (Math.abs(g.v.y) < 1) g.v.y = 0;
        }
        if (g.trail && Math.random() < 0.3) this.smoke.emit(m.position.x, m.position.y, m.position.z, 0, -1, 0, 0.4, 0.06, 0.12, col(g.trail), col(g.trail), 0.9, 0, 6, 0);
      }
      if (g.life > 8) m.scale.setScalar(g.size * Math.max(0, 1 - (g.life - 8)));
      if (g.life > 9) { m.parent && m.parent.remove(m); this.gibs.splice(i, 1); }
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i]; t.life += dt;
      const k = 1 - t.life / t.max;
      t.mesh.material.opacity = Math.max(0, k);
      t.mesh.scale.x = t.mesh.scale.y = t.w * Math.max(0.05, k);
      if (t.life >= t.max) { t.mesh.parent && t.mesh.parent.remove(t.mesh); t.mesh.material.dispose(); this.tracers.splice(i, 1); }
    }
  }
};

/* ---------------- collision world ---------------- */
G.world = {
  boxes: [],
  clear() { this.boxes = []; },
  add(x0, y0, z0, x1, y1, z1, tag) {
    const b = { x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), tag };
    this.boxes.push(b); return b;
  },
  // add an axis-aligned collider covering a box of size (w,h,d) centered at (x, y+h/2, z)
  addCentered(x, y, z, w, h, d, tag) { return this.add(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, tag); },
  groundAt(x, z, y) {
    let g = 0;
    for (const b of this.boxes) {
      if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && b.y1 <= y + 0.05 && b.y1 > g) g = b.y1;
    }
    return g;
  },
  // push a cylinder (feet at pos.y, radius r, height h) out of boxes; stepping up low ledges
  collide(pos, r, h, step) {
    let hit = false;
    for (const b of this.boxes) {
      if (pos.y + h <= b.y0 || pos.y >= b.y1 - 0.001) continue;
      if (b.y1 - pos.y <= step) continue; // steppable, groundAt will lift us
      const cx = G.clamp(pos.x, b.x0, b.x1), cz = G.clamp(pos.z, b.z0, b.z1);
      let dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      hit = true;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2), push = r - d;
        pos.x += dx / d * push; pos.z += dz / d * push;
      } else {
        const l = pos.x - b.x0, rr = b.x1 - pos.x, f = pos.z - b.z0, bk = b.z1 - pos.z;
        const m = Math.min(l, rr, f, bk);
        if (m === l) pos.x = b.x0 - r; else if (m === rr) pos.x = b.x1 + r; else if (m === f) pos.z = b.z0 - r; else pos.z = b.z1 + r;
      }
    }
    return hit;
  },
  ceilingAt(x, z, y, r) {
    let c = 1e9;
    for (const b of this.boxes) {
      if (b.y0 >= y && b.y0 < c && x + r > b.x0 && x - r < b.x1 && z + r > b.z0 && z - r < b.z1) c = b.y0;
    }
    return c;
  },
  ray(o, d, maxT) {
    let best = maxT, hitB = null, nAxis = 0, nSign = 0;
    const ix = 1 / (d.x || 1e-9), iy = 1 / (d.y || 1e-9), iz = 1 / (d.z || 1e-9);
    for (const b of this.boxes) {
      let t1 = (b.x0 - o.x) * ix, t2 = (b.x1 - o.x) * ix;
      let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2), ax = 0;
      t1 = (b.y0 - o.y) * iy; t2 = (b.y1 - o.y) * iy;
      let a = Math.min(t1, t2); if (a > tmin) { tmin = a; ax = 1; } tmax = Math.min(tmax, Math.max(t1, t2));
      t1 = (b.z0 - o.z) * iz; t2 = (b.z1 - o.z) * iz;
      a = Math.min(t1, t2); if (a > tmin) { tmin = a; ax = 2; } tmax = Math.min(tmax, Math.max(t1, t2));
      if (tmax >= Math.max(tmin, 0) && tmin < best && tmin >= 0) { best = tmin; hitB = b; nAxis = ax; nSign = ax === 0 ? -Math.sign(d.x) : ax === 1 ? -Math.sign(d.y) : -Math.sign(d.z); }
    }
    // ground plane
    if (d.y < 0) { const tg = -o.y / d.y; if (tg >= 0 && tg < best) { best = tg; hitB = 'ground'; nAxis = 1; nSign = 1; } }
    if (!hitB) return null;
    const n = new THREE.Vector3(); n.setComponent(nAxis, nSign);
    return { t: best, box: hitB, normal: n };
  },
  los(a, b) {
    const d = _a2.subVectors(b, a); const L = d.length(); d.divideScalar(L);
    const h = this.ray(a, d, L - 0.1);
    return !h;
  }
};
const _a2 = new THREE.Vector3();
