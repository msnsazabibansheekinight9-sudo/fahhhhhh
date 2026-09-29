// ============================================================================
// Procedural textures (canvas) – wood, metal, polymer, camo, terrain, sprites
// ============================================================================
'use strict';
(function () {
const G = window.G;
const cache = {};

// deterministic PRNG
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
G.rng = rng;

// 2D value noise, tileable over period p
function makeNoise(seed, p) {
  const r = rng(seed), g = new Float32Array(p * p);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const sm = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const x0 = ((xi % p) + p) % p, y0 = ((yi % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
    const a = g[y0 * p + x0], b = g[y0 * p + x1], c = g[y1 * p + x0], d = g[y1 * p + x1];
    const u = sm(xf), v = sm(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function fbm(n, x, y, oct) { let s = 0, a = .5, f = 1, t = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f); t += a; a *= .5; f *= 2; } return s / t; }

function hex(c) { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', { willReadFrequently: true }); return c; }
function toTex(c, rep, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (rep) t.repeat.set(rep[0], rep[1]);
  t.anisotropy = G.maxAniso || 4;
  if (srgb) t.encoding = THREE.sRGBEncoding;
  return t;
}
function pixels(w, h, fn) {
  const c = canvas(w, h), x = c.getContext('2d'), id = x.createImageData(w, h), d = id.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4, p = fn(i, j);
    d[k] = p[0]; d[k + 1] = p[1]; d[k + 2] = p[2]; d[k + 3] = p[3] === undefined ? 255 : p[3];
  }
  x.putImageData(id, 0, 0); return c;
}

// --------------------------------------------------------------------- wood
G.woodColors = { wood: '#6a4122', wood_dark: '#3e2614', wood_red: '#6e2f16', plum: '#6b2b2e', bakelite: '#4a2418' };
// r128 treats material colours as linear: convert sRGB hex colours once per material
G.linMat = function (m) { if (!m || m.userData.lin) return m; if (m.color) m.color.convertSRGBToLinear(); if (m.emissive) m.emissive.convertSRGBToLinear(); m.userData.lin = true; return m; };
G.mat = function (o, Kind) { return G.linMat(new (Kind || THREE.MeshStandardMaterial)(o)); };
G.col = function (h) { return new THREE.Color(h).convertSRGBToLinear(); };
G.texWood = function (key) {
  const id = 'wood_' + key; if (cache[id]) return cache[id];
  const base = hex(G.woodColors[key] || G.woodColors.wood), dark = mix(base, [18, 9, 4], .45), light = mix(base, [200, 140, 90], .12);
  const n = makeNoise(11 + key.length, 64), n2 = makeNoise(7, 64);
  const c = pixels(512, 256, (i, j) => {
    const x = i / 512, y = j / 256;
    const warp = fbm(n, x * 3, y * 6, 4) * 5;
    const ring = Math.sin((y * 70 + warp) * Math.PI) * .5 + .5;
    const streak = n2(x * 6, y * 160);
    const fig = fbm(n, x * 8, y * 2, 2);
    let t = Math.pow(ring, 4) * .45 + streak * .35 + fig * .2;
    const col = mix(light, dark, Math.min(1, t));
    const pore = Math.random() < .015 ? .25 : 0;
    return mix(col, [15, 8, 3], pore);
  });
  return (cache[id] = toTex(c));
};
// -------------------------------------------------------------------- metal
G.metalColors = { blued: '#1c2128', park: '#3a3d38', black: '#1a1a1c', stainless: '#9ba0a4', grey: '#4b4f53', fde: '#8a7657', coyote: '#7d6a4c', nickel: '#c9cbcc', gold: '#d4a93a', odc: '#4f553b', tungsten: '#4d545c', engraved: '#4a4f58', whitewash: '#d9d6cc' };
G.texBrushed = function (seed) {
  const id = 'brushed' + (seed || 0); if (cache[id]) return cache[id];
  const n = makeNoise(31 + (seed || 0), 128);
  const c = pixels(256, 256, (i, j) => { const v = 150 + (n(i * .5, j * 12) - .5) * 70 + (Math.random() - .5) * 30; return [v, v, v]; });
  return (cache[id] = toTex(c, null, false));
};
G.texStipple = function () {
  if (cache.stipple) return cache.stipple;
  const n = makeNoise(5, 64);
  const c = pixels(128, 128, (i, j) => { const v = 128 + (n(i * .7, j * .7) - .5) * 120 + (Math.random() - .5) * 60; return [v, v, v]; });
  return (cache.stipple = toTex(c, null, false));
};
G.texKnurl = function () {
  if (cache.knurl) return cache.knurl;
  const c = pixels(64, 64, (i, j) => { const v = ((i + j) % 8 < 4) ^ ((i - j + 64) % 8 < 4) ? 200 : 60; return [v, v, v]; });
  return (cache.knurl = toTex(c, [4, 4], false));
};

// -------------------------------------------------------------------- camo
const CAMO = {
  woodland: ['#5c5f3a', '#2d2a1f', '#6e5638', '#1c1d18'],
  desert: ['#c6b186', '#9b7c52', '#6c5236', '#e8dcc0', '#1f1a14'],
  multicam: ['#8e8561', '#6d6849', '#b4a57f', '#4b4b33', '#7c6040', '#e2d3b1'],
  tiger: ['#6b7447', '#27281e', '#3e4a2c', '#1c1c16'],
  digital: ['#8d9092', '#5f6365', '#b3b6b6', '#3a3d40'],
  splinter: ['#8b8465', '#4d5a3c', '#6b5b3f', '#2f3228'],
};
G.texCamo = function (kind) {
  const id = 'camo_' + kind; if (cache[id]) return cache[id];
  const pal = CAMO[kind]; let c;
  if (kind === 'digital') {
    const n = makeNoise(3, 16), r = rng(9);
    c = pixels(128, 128, (i, j) => { const x = Math.floor(i / 4), y = Math.floor(j / 4); const v = fbm(n, x * .25, y * .25, 2) + r() * .15; return hex(pal[Math.min(3, Math.floor(v * 4.2))]); });
  } else if (kind === 'tiger') {
    const n = makeNoise(17, 32);
    c = pixels(256, 256, (i, j) => { const x = i / 256, y = j / 256; const s = Math.sin((y * 10 + fbm(n, x * 3, y * 3, 3) * 5) * Math.PI); const v = fbm(n, x * 8, y * 2, 2); return hex(s > .55 && v > .35 ? pal[1] : s > .35 ? pal[2] : pal[0]); });
  } else if (kind === 'splinter') {
    c = canvas(256, 256); const x = c.getContext('2d'), r = rng(21);
    x.fillStyle = pal[0]; x.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 40; k++) { x.fillStyle = pal[1 + (k % 2)]; x.beginPath(); const cx = r() * 256, cy = r() * 256; x.moveTo(cx, cy); for (let q = 0; q < 4; q++) x.lineTo(cx + (r() - .5) * 90, cy + (r() - .5) * 60); x.fill(); }
    x.strokeStyle = pal[3]; x.lineWidth = 2; for (let k = 0; k < 60; k++) { const sx = r() * 256, sy = r() * 256; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + 10, sy + 16); x.stroke(); }
  } else {
    const noises = pal.map((_, k) => makeNoise(41 + k * 13, 32));
    c = pixels(256, 256, (i, j) => { const x = i / 256, y = j / 256; let col = hex(pal[0]);
      for (let k = 1; k < pal.length; k++) { const v = fbm(noises[k], x * (kind === 'desert' && k >= 3 ? 16 : 5), y * (kind === 'desert' && k >= 3 ? 16 : 5), 3); if (v > (kind === 'desert' && k >= 3 ? .68 : .56)) col = hex(pal[k]); }
      return col; });
  }
  return (cache[id] = toTex(c));
};
G.texEngraved = function () {
  if (cache.engr) return cache.engr;
  const c = canvas(256, 256), x = c.getContext('2d');
  x.fillStyle = '#3a3f48'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = '#c9a54a'; x.lineWidth = 1.4;
  for (let k = 0; k < 30; k++) { const cx = (k * 53) % 256, cy = (k * 97) % 256; for (let r = 4; r < 22; r += 5) { x.beginPath(); x.arc(cx, cy, r, k, k + 4); x.stroke(); } }
  x.strokeStyle = '#8a9099'; x.lineWidth = .6; for (let k = 0; k < 400; k++) { const a = Math.random() * 256, b = Math.random() * 256; x.beginPath(); x.moveTo(a, b); x.lineTo(a + 3, b + 2); x.stroke(); }
  return (cache.engr = toTex(c));
};

// ------------------------------------------------------------------ terrain
const GROUND = {
  mud:     { a: '#4a3b2a', b: '#2f261c', c: '#5d4a33', s: 1 },
  grass:   { a: '#4d5a2b', b: '#36401f', c: '#6a6b37', s: 2 },
  jungle:  { a: '#2f3a1e', b: '#1f2613', c: '#4d4526', s: 3 },
  sand:    { a: '#c9ad7c', b: '#a88d5e', c: '#dcc59a', s: 4 },
  snow:    { a: '#e6e9ee', b: '#c3c9d3', c: '#f7f8fa', s: 5 },
  concrete:{ a: '#7d7c78', b: '#62615d', c: '#8f8d88', s: 6 },
  asphalt: { a: '#3b3c3e', b: '#2a2b2d', c: '#4a4b4d', s: 7 },
  dirt:    { a: '#6b5a42', b: '#524431', c: '#7c6a4f', s: 8 },
  rubble:  { a: '#6e675d', b: '#4f4a43', c: '#8a8277', s: 9 },
  gravel:  { a: '#77726a', b: '#5a564f', c: '#948e84', s: 10 },
  frozen:  { a: '#9aa3ab', b: '#e3e7ec', c: '#6f7a83', s: 11 },
};
G.texGround = function (kind) {
  const id = 'g_' + kind; if (cache[id]) return cache[id];
  const P = GROUND[kind] || GROUND.dirt, A = hex(P.a), B = hex(P.b), C = hex(P.c);
  const n = makeNoise(P.s * 7, 64), n2 = makeNoise(P.s * 13, 128);
  const c = pixels(512, 512, (i, j) => {
    const x = i / 512, y = j / 512;
    let v = fbm(n, x * 8, y * 8, 4), v2 = n2(x * 128, y * 128);
    let col = mix(A, B, v);
    if (v2 > .72) col = mix(col, C, .6);
    if (kind === 'grass' || kind === 'jungle') { const bl = n2(x * 128 + 7, y * 40); if (bl > .6) col = mix(col, [110, 125, 55], .3); }
    if (kind === 'concrete' || kind === 'asphalt') { col = mix(col, [0, 0, 0], (Math.random() * .08)); if ((i % 128 === 0 || j % 128 === 0) && kind === 'concrete') col = mix(col, [30, 30, 30], .5); }
    if (kind === 'snow') col = mix(col, [255, 255, 255], Math.random() * .1);
    return col;
  });
  return (cache[id] = toTex(c));
};
// surfaces for walls/props
G.texSurface = function (kind) {
  const id = 's_' + kind; if (cache[id]) return cache[id];
  const c = canvas(256, 256), x = c.getContext('2d'), r = rng(kind.length * 31);
  const noiseOver = (a) => { const d = x.getImageData(0, 0, 256, 256); for (let k = 0; k < d.data.length; k += 4) { const q = (Math.random() - .5) * a; d.data[k] += q; d.data[k + 1] += q; d.data[k + 2] += q; } x.putImageData(d, 0, 0); };
  if (kind === 'brick' || kind === 'redbrick') {
    x.fillStyle = kind === 'brick' ? '#8b8074' : '#6d3a2a'; x.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 16; row++) for (let col = 0; col < 5; col++) {
      const off = row % 2 ? 26 : 0; const base = kind === 'brick' ? [150, 138, 120] : [140, 70, 50];
      const q = (r() - .5) * 30; x.fillStyle = `rgb(${base[0] + q},${base[1] + q},${base[2] + q})`;
      x.fillRect(col * 52 + off - 26 + 2, row * 16 + 2, 48, 13);
    } noiseOver(26);
  } else if (kind === 'plaster') {
    x.fillStyle = '#b9ae98'; x.fillRect(0, 0, 256, 256); noiseOver(20);
    for (let k = 0; k < 14; k++) { x.fillStyle = `rgba(90,80,70,${r() * .25})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, r() * 40, r() * 25, r() * 3, 0, 7); x.fill(); }
    for (let k = 0; k < 6; k++) { x.fillStyle = '#8b7a66'; const px = r() * 256, py = r() * 256; x.fillRect(px, py, 30 + r() * 30, 16 + r() * 10); }
  } else if (kind === 'stone') {
    x.fillStyle = '#7d766b'; x.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 40; k++) { const q = 90 + r() * 60; x.fillStyle = `rgb(${q},${q * .95},${q * .88})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 18 + r() * 20, 12 + r() * 12, 0, 0, 7); x.fill(); x.strokeStyle = '#4a453f'; x.stroke(); } noiseOver(24);
  } else if (kind === 'planks') {
    for (let k = 0; k < 8; k++) { const q = (r() - .5) * 30; x.fillStyle = `rgb(${110 + q},${82 + q},${55 + q})`; x.fillRect(0, k * 32, 256, 31); x.fillStyle = 'rgba(40,25,10,.8)'; x.fillRect(0, k * 32 + 31, 256, 1); }
    for (let k = 0; k < 300; k++) { x.strokeStyle = `rgba(50,30,15,${r() * .3})`; const py = r() * 256; x.beginPath(); x.moveTo(0, py); x.bezierCurveTo(80, py + 3, 160, py - 3, 256, py); x.stroke(); }
  } else if (kind === 'sandbag') {
    x.fillStyle = '#9b8a65'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 3) { x.fillStyle = 'rgba(60,50,30,.18)'; x.fillRect(i, 0, 1, 256); x.fillRect(0, i, 256, 1); } noiseOver(30);
  } else if (kind === 'corrugated' || kind === 'container_r' || kind === 'container_b' || kind === 'container_g') {
    const base = { corrugated: [120, 118, 110], container_r: [140, 50, 38], container_b: [40, 70, 110], container_g: [60, 90, 60] }[kind];
    for (let i = 0; i < 256; i++) { const s = Math.sin(i / 256 * Math.PI * 16) * 30; x.fillStyle = `rgb(${base[0] + s},${base[1] + s},${base[2] + s})`; x.fillRect(i, 0, 1, 256); }
    for (let k = 0; k < 30; k++) { x.fillStyle = `rgba(90,50,20,${r() * .35})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, r() * 20, r() * 40, 0, 0, 7); x.fill(); } noiseOver(18);
  } else if (kind === 'crate') {
    x.fillStyle = '#6f5a3a'; x.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? '#7a6442' : '#6a5536'; x.fillRect(0, k * 43, 256, 42); }
    x.strokeStyle = '#3a2d1b'; x.lineWidth = 12; x.strokeRect(6, 6, 244, 244); x.beginPath(); x.moveTo(12, 12); x.lineTo(244, 244); x.stroke();
    x.fillStyle = 'rgba(20,20,20,.55)'; x.font = 'bold 22px monospace'; x.fillText('AMMO', 90, 130); noiseOver(20);
  } else if (kind === 'concrete_wall') {
    x.fillStyle = '#8a8883'; x.fillRect(0, 0, 256, 256); noiseOver(28);
    x.fillStyle = 'rgba(60,60,60,.25)'; for (let k = 0; k < 4; k++) x.fillRect(0, k * 64, 256, 2);
    for (let k = 0; k < 8; k++) { x.fillStyle = `rgba(40,35,30,${r() * .2})`; x.fillRect(r() * 256, 0, 2 + r() * 6, 256); }
  } else if (kind === 'metal_panel') {
    x.fillStyle = '#5a6066'; x.fillRect(0, 0, 256, 256); noiseOver(16);
    x.strokeStyle = '#2d3135'; x.lineWidth = 3; for (let k = 0; k < 4; k++) x.strokeRect(k * 64 + 2, 2, 60, 252);
    x.fillStyle = '#c9a14a'; for (let k = 0; k < 8; k++) x.fillRect(0, 230, 256, 0);
  } else if (kind === 'thatch') {
    x.fillStyle = '#8a7a4a'; x.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 900; k++) { x.strokeStyle = `rgba(${60 + r() * 80},${50 + r() * 60},${20 + r() * 30},.6)`; const px = r() * 256, py = r() * 256; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - .5) * 6, py + 20 + r() * 20); x.stroke(); }
  } else if (kind === 'bamboo') {
    x.fillStyle = '#8f8a4a'; x.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 16; k++) { x.fillStyle = k % 2 ? '#a19a55' : '#7d7840'; x.fillRect(k * 16, 0, 15, 256); for (let q = 0; q < 5; q++) { x.fillStyle = '#5a5530'; x.fillRect(k * 16, (q * 51 + k * 13) % 256, 15, 3); } }
  } else {
    x.fillStyle = '#777'; x.fillRect(0, 0, 256, 256); noiseOver(30);
  }
  return (cache[id] = toTex(c));
};

// ------------------------------------------------------------------ targets
G.texTarget = function (kind) {
  const id = 't_' + kind; if (cache[id]) return cache[id];
  const c = canvas(512, 512), x = c.getContext('2d');
  if (kind === 'paper') {
    x.fillStyle = '#f2eee2'; x.fillRect(0, 0, 512, 512);
    for (let r = 10; r >= 1; r--) { x.beginPath(); x.arc(256, 256, r * 24, 0, 7); x.fillStyle = r <= 6 ? '#161616' : '#f2eee2'; x.fill(); x.strokeStyle = r <= 6 ? '#e8e3d2' : '#161616'; x.lineWidth = 1.5; x.stroke(); }
    x.fillStyle = '#e8e3d2'; x.font = '14px monospace'; for (let r = 1; r <= 9; r++) { x.fillStyle = r <= 5 ? '#e8e3d2' : '#161616'; x.fillText(String(11 - r), 256 + r * 24 - 16, 260); }
    x.fillStyle = '#161616'; x.font = '12px monospace'; x.fillText('NRA B-8  25 YD TIMED & RAPID FIRE', 120, 500);
  } else if (kind === 'ipsc') {
    x.fillStyle = '#00000000'; x.clearRect(0, 0, 512, 512);
    x.fillStyle = '#b48d5c';
    x.beginPath(); x.moveTo(146, 150); x.lineTo(206, 150); x.lineTo(206, 40); x.lineTo(306, 40); x.lineTo(306, 150); x.lineTo(366, 150); x.lineTo(406, 190); x.lineTo(406, 460); x.lineTo(366, 506); x.lineTo(146, 506); x.lineTo(106, 460); x.lineTo(106, 190); x.closePath(); x.fill();
    x.strokeStyle = '#7a5d38'; x.lineWidth = 2; x.stroke();
    x.strokeRect(226, 60, 60, 44); x.strokeRect(206, 180, 100, 180); x.strokeRect(166, 170, 180, 290);
    x.fillStyle = '#6b5030'; x.font = 'bold 20px monospace'; x.fillText('A', 248, 280); x.fillText('C', 182, 300); x.fillText('D', 116, 330); x.fillText('A', 250, 90);
  } else if (kind === 'sil') {
    x.clearRect(0, 0, 512, 512); x.fillStyle = '#2b3a2a';
    x.beginPath(); x.arc(256, 90, 54, 0, 7); x.fill();
    x.beginPath(); x.moveTo(150, 170); x.quadraticCurveTo(256, 130, 362, 170); x.lineTo(410, 512); x.lineTo(102, 512); x.closePath(); x.fill();
    x.strokeStyle = '#e8e3d2'; x.lineWidth = 2; x.beginPath(); x.ellipse(256, 300, 60, 80, 0, 0, 7); x.stroke();
  }
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return (cache[id] = t);
};

// ------------------------------------------------------------------ sprites
G.texSprite = function (kind) {
  const id = 'sp_' + kind; if (cache[id]) return cache[id];
  const S = 128, c = canvas(S, S), x = c.getContext('2d'), r = rng(kind.length * 5 + 3);
  if (kind === 'flash') {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,250,230,1)'); g.addColorStop(.15, 'rgba(255,210,120,.95)'); g.addColorStop(.45, 'rgba(255,120,30,.45)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    x.fillStyle = g; x.translate(64, 64);
    for (let k = 0; k < 7; k++) { x.rotate(Math.PI * 2 / 7 + r() * .3); x.beginPath(); x.moveTo(-7, 0); x.lineTo(0, -64 + r() * 20); x.lineTo(7, 0); x.fill(); }
    x.beginPath(); x.arc(0, 0, 30, 0, 7); x.fill();
  } else if (kind === 'flashside') {
    const g = x.createLinearGradient(0, 64, 128, 64); g.addColorStop(0, 'rgba(255,245,210,1)'); g.addColorStop(.35, 'rgba(255,170,60,.85)'); g.addColorStop(1, 'rgba(255,80,10,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, 52); x.quadraticCurveTo(50, 20, 128, 58); x.lineTo(128, 70); x.quadraticCurveTo(50, 108, 0, 76); x.fill();
    for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(20 + r() * 30, 64); x.lineTo(80 + r() * 48, 64 + (r() - .5) * 60); x.lineTo(30 + r() * 30, 66); x.fill(); }
  } else if (kind === 'smoke') {
    for (let k = 0; k < 14; k++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); x.save(); x.translate(64 + (r() - .5) * 40, 64 + (r() - .5) * 40); const s = 20 + r() * 26; x.scale(s, s); g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill(); x.restore(); }
  } else if (kind === 'glow') {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.2, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  } else if (kind === 'spark') {
    const g = x.createLinearGradient(0, 64, 128, 64); g.addColorStop(0, 'rgba(255,200,80,0)'); g.addColorStop(.7, 'rgba(255,230,160,1)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.fillRect(0, 58, 128, 12);
  } else if (kind === 'hole') {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.18, 'rgba(10,8,6,1)'); g.addColorStop(.3, 'rgba(40,35,30,.8)'); g.addColorStop(.6, 'rgba(60,55,50,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(20,20,20,.5)'; for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(64, 64); const a = r() * 7; x.lineTo(64 + Math.cos(a) * (20 + r() * 26), 64 + Math.sin(a) * (20 + r() * 26)); x.stroke(); }
  } else if (kind === 'holepaper') {
    x.fillStyle = 'rgba(0,0,0,1)'; x.beginPath(); x.arc(64, 64, 22, 0, 7); x.fill(); x.strokeStyle = 'rgba(80,60,40,.8)'; x.lineWidth = 4; x.stroke();
  } else if (kind === 'holemetal') {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(210,210,200,1)'); g.addColorStop(.25, 'rgba(160,160,150,.9)'); g.addColorStop(.5, 'rgba(60,60,60,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  } else if (kind === 'blood') {
    for (let k = 0; k < 10; k++) { x.fillStyle = `rgba(${100 + r() * 40},10,10,${.4 + r() * .4})`; x.beginPath(); x.arc(64 + (r() - .5) * 60, 64 + (r() - .5) * 60, 4 + r() * 14, 0, 7); x.fill(); }
  } else if (kind === 'dust') {
    for (let k = 0; k < 18; k++) { x.fillStyle = `rgba(255,255,255,${.05 + r() * .12})`; x.beginPath(); x.arc(64 + (r() - .5) * 70, 64 + (r() - .5) * 70, 6 + r() * 22, 0, 7); x.fill(); }
  } else if (kind === 'debris') {
    for (let k = 0; k < 12; k++) { x.fillStyle = `rgba(255,255,255,${.6 + r() * .4})`; x.fillRect(20 + r() * 88, 20 + r() * 88, 3 + r() * 6, 3 + r() * 6); }
  } else if (kind === 'fire') {
    const g = x.createRadialGradient(64, 80, 0, 64, 70, 64); g.addColorStop(0, 'rgba(255,255,200,1)'); g.addColorStop(.3, 'rgba(255,170,40,.9)'); g.addColorStop(.7, 'rgba(200,50,0,.4)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  } else if (kind === 'wire') {
    x.strokeStyle = 'rgba(40,40,38,1)'; x.lineWidth = 2;
    for (let k = 0; k < 6; k++) { x.beginPath(); for (let t = 0; t <= 128; t += 4) x.lineTo(t, 64 + Math.sin(t * .09 + k) * 40 * Math.sin(k + t * .01)); x.stroke(); }
    x.fillStyle = 'rgba(40,40,38,1)'; for (let k = 0; k < 60; k++) x.fillRect(r() * 128, r() * 128, 3, 1);
  } else if (kind === 'leaf') {
    for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(${30 + r() * 40},${60 + r() * 60},${20 + r() * 20},1)`; x.save(); x.translate(r() * 128, r() * 128); x.rotate(r() * 7); x.beginPath(); x.ellipse(0, 0, 10, 4, 0, 0, 7); x.fill(); x.restore(); }
  }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return (cache[id] = t);
};

// Sky gradient texture for the scene background and environment map
G.texSky = function (top, mid, bottom, sunDir) {
  const c = canvas(16, 256), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, top); g.addColorStop(.48, mid); g.addColorStop(.52, bottom); g.addColorStop(1, bottom);
  x.fillStyle = g; x.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.mapping = THREE.EquirectangularReflectionMapping; return t;
};

G.makeNoise = makeNoise; G.fbm = fbm;
})();
