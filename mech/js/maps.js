// Ironwalkers — 20 procedural battle arenas: terrain, landmarks, hazards, sky, weather, collision, raycasts, nav grid.
(function () {
'use strict';
const MW = window.MW;
const G = MW.mechs.geo;

// ---------- noise ----------
function makeNoise(seed) {
  const r = MW.rng(seed); const p = new Uint8Array(512); const v = new Float32Array(256);
  for (let i = 0; i < 256; i++) { p[i] = i; v[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 256; i++) p[i + 256] = p[i];
  const sm = t => t * t * (3 - 2 * t);
  const n2 = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi; const X = xi & 255, Z = zi & 255;
    const a = v[p[X + p[Z]]], b = v[p[X + 1 + p[Z]]], c = v[p[X + p[Z + 1]]], d = v[p[X + 1 + p[Z + 1]]];
    const u = sm(xf), w = sm(zf); return (a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w) * 2 - 1;
  };
  const fbm = (x, z, o) => { let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < (o || 4); i++) { s += n2(x * f, z * f) * a; t += a; a *= 0.5; f *= 2.03; } return s / t; };
  return { n2, fbm };
}
const ss = (a, b, x) => { const t = MW.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------- themes ----------
// pal: ground colours [low, mid, high, steep]; sky: [top, horizon, bottom]
const TH = {
  foundry:  { pal: ['#2a2420', '#4a4038', '#5a4e42', '#3a322c'], sky: ['#0d0807', '#3a1a0c', '#120806'], fog: ['#2a160c', 50, 240], sun: ['#ffb070', 1.1, 0.8, 0.6], hemi: ['#ff9a50', '#1a0e08', 0.55], amb: 0.25, lava: -1.2, weather: 'embers', rough: 0.9 },
  colosseum:{ pal: ['#a88a62', '#c2a47a', '#8a7050', '#6a5a48'], sky: ['#02040c', '#1a2440', '#060810'], fog: ['#0c1222', 80, 330], sun: ['#9fb8ff', 0.7, 0.9, 2.2], hemi: ['#6a7aa8', '#2a2018', 0.5], amb: 0.2, night: true, stars: true, rough: 0.95 },
  crystal:  { pal: ['#1c1830', '#2c2448', '#3a3058', '#141020'], sky: ['#05030c', '#2a0e48', '#08040f'], fog: ['#1a0c30', 40, 230], sun: ['#b48aff', 0.6, 1.1, 1.0], hemi: ['#7a4aff', '#0a0614', 0.6], amb: 0.25, night: true, stars: true, weather: 'spores', rough: 0.6 },
  rustyard: { pal: ['#5a4a3a', '#6e5a44', '#7d6a52', '#4a3a2c'], sky: ['#5a6a7a', '#c8a07a', '#6a5a4a'], fog: ['#a08a72', 90, 380], sun: ['#ffd0a0', 1.6, 0.45, 2.4], hemi: ['#c0c8d0', '#4a3a2a', 0.6], amb: 0.3, weather: 'dust', rough: 0.95 },
  neon:     { pal: ['#15171c', '#1c1f26', '#22262e', '#101216'], sky: ['#05040c', '#2a0e3a', '#0a0610'], fog: ['#1a0e2a', 40, 260], sun: ['#8a9aff', 0.35, 1.2, 1.4], hemi: ['#ff4fc8', '#0a1830', 0.5], amb: 0.2, night: true, weather: 'rain', rough: 0.25, wet: true },
  snow:     { pal: ['#dfe6ee', '#f2f6fa', '#c8d2dc', '#7a8490'], sky: ['#6a8ab0', '#d8e2ee', '#a8b8c8'], fog: ['#d0dae6', 80, 420], sun: ['#fff4e0', 1.6, 0.55, 0.8], hemi: ['#d8e8ff', '#8a96a4', 0.7], amb: 0.35, weather: 'snow', rough: 0.85 },
  canyon:   { pal: ['#b8643a', '#c87848', '#d8946a', '#8a4428'], sky: ['#3a7ac8', '#f0c8a0', '#c89070'], fog: ['#e0b090', 120, 520], sun: ['#fff0d0', 2.0, 0.75, 2.0], hemi: ['#a8c8ff', '#8a4a2a', 0.6], amb: 0.3, rough: 0.95 },
  jungle:   { pal: ['#2e4a1e', '#3e5e26', '#4e6a30', '#4a3e2a'], sky: ['#4a7aa0', '#c0d8c0', '#6a8a6a'], fog: ['#7a9a7a', 50, 300], sun: ['#fff0c0', 1.6, 0.9, 1.0], hemi: ['#c8f0c0', '#2a3a1a', 0.7], amb: 0.3, weather: 'spores', rough: 0.9 },
  harbor:   { pal: ['#4a4c50', '#5a5e62', '#6a6e72', '#3a3c40'], sky: ['#5a7898', '#c8d4dc', '#7a8a98'], fog: ['#a8b8c4', 90, 420], sun: ['#fff4e8', 1.5, 0.6, 3.6], hemi: ['#c8d8e8', '#3a4048', 0.6], amb: 0.35, water: -1.5, weather: 'gulls', rough: 0.8 },
  volcano:  { pal: ['#1e1a18', '#2a2420', '#3a302a', '#120e0c'], sky: ['#1a0604', '#6a1e08', '#200805'], fog: ['#3a140a', 40, 280], sun: ['#ff7a3a', 1.1, 0.6, 1.2], hemi: ['#ff6a2a', '#100604', 0.55], amb: 0.25, lava: -2.5, weather: 'ash', rough: 0.9 },
  moon:     { pal: ['#6a6a6c', '#8a8a8c', '#9a9a9c', '#4a4a4c'], sky: ['#000000', '#05060a', '#000000'], fog: ['#05060a', 300, 900], sun: ['#ffffff', 2.4, 0.5, 0.7], hemi: ['#8a8aa0', '#202024', 0.25], amb: 0.12, stars: true, gravity: 0.35, earth: true, rough: 0.95 },
  swamp:    { pal: ['#2a2e1e', '#3a3e26', '#4a4a30', '#2a2418'], sky: ['#3a4038', '#7a8070', '#3a4034'], fog: ['#5a6252', 25, 210], sun: ['#e0e8c0', 0.9, 0.7, 1.6], hemi: ['#a0a890', '#1a1e12', 0.6], amb: 0.3, water: 0.2, weather: 'rain', rough: 0.7 },
  refinery: { pal: ['#4a4842', '#5a5852', '#6a665e', '#3a3832'], sky: ['#3a3a48', '#c88a5a', '#4a3a3a'], fog: ['#8a6a5a', 70, 400], sun: ['#ffb070', 1.3, 0.25, 2.8], hemi: ['#ffc8a0', '#2a2a2a', 0.55], amb: 0.3, weather: 'smoke', rough: 0.85 },
  salt:     { pal: ['#d8d8d4', '#eeeeea', '#c8c8c0', '#9a9890'], sky: ['#1e242e', '#5a6474', '#2a2e36'], fog: ['#4a5260', 70, 420], sun: ['#c8d8ff', 0.9, 0.9, 1.0], hemi: ['#a8b8d0', '#6a6a68', 0.7], amb: 0.3, weather: 'storm', rough: 0.6 },
  mars:     { pal: ['#8a3e1e', '#a8522a', '#b8683c', '#6a2e16'], sky: ['#6a4a3a', '#d89a6a', '#8a5a3a'], fog: ['#c08060', 80, 480], sun: ['#ffe0c0', 1.5, 0.6, 1.8], hemi: ['#e0a080', '#4a2010', 0.6], amb: 0.3, gravity: 0.6, weather: 'dust', rough: 0.95 },
  glacier:  { pal: ['#a8c8e0', '#c8e0f0', '#e0f0fa', '#5a88b0'], sky: ['#020814', '#1a3a5a', '#04101c'], fog: ['#14304a', 70, 460], sun: ['#a0c8ff', 0.9, 0.7, 1.2], hemi: ['#6affd8', '#1a2a3a', 0.6], amb: 0.3, night: true, stars: true, aurora: true, weather: 'snow', rough: 0.3 },
  city:     { pal: ['#3a3a3c', '#4a4a4c', '#5a5a5a', '#2e2e30'], sky: ['#4a5058', '#a89c8c', '#5a5a5a'], fog: ['#7a7470', 80, 520], sun: ['#ffe8d0', 1.4, 0.5, 2.2], hemi: ['#c8c8d0', '#2a2a2a', 0.6], amb: 0.3, weather: 'ash', rough: 0.9 },
  forest:   { pal: ['#2a3a1a', '#3a4a22', '#4a3e28', '#3a2e1e'], sky: ['#5a8ac0', '#d0e0d0', '#7a9a8a'], fog: ['#9ab0a0', 60, 420], sun: ['#fff0c8', 1.8, 0.95, 0.5], hemi: ['#d0f0d0', '#2a3018', 0.65], amb: 0.3, weather: 'spores', rough: 0.9 },
  spaceport:{ pal: ['#6a6a66', '#8a8a84', '#9a9890', '#5a5a56'], sky: ['#2a6ac0', '#c8e0f8', '#8aa0b8'], fog: ['#c0d0e0', 150, 650], sun: ['#ffffff', 2.0, 0.85, 3.0], hemi: ['#d0e0ff', '#5a5a50', 0.7], amb: 0.35, rough: 0.8 },
  toxic:    { pal: ['#3a3a20', '#4a4a26', '#5a522e', '#2a2a18'], sky: ['#2a3418', '#8a9a40', '#2a3014'], fog: ['#6a7a30', 50, 380], sun: ['#e8ff90', 1.1, 0.7, 2.0], hemi: ['#c0e070', '#1a1e0a', 0.6], amb: 0.3, toxic: -0.8, weather: 'spores', rough: 0.85 },
};
MW.THEMES = TH;

function heightFn(theme, S, N) {
  const edge = (x, z, k) => ss(S * 0.86, S * 1.15, Math.max(Math.abs(x), Math.abs(z))) * (k || 30);
  const f = N.fbm;
  switch (theme) {
    case 'foundry': return (x, z) => { let h = f(x * 0.02, z * 0.02, 2) * 0.4; const ch = Math.min(Math.abs(x - S * 0.32), Math.abs(x + S * 0.32)); if (Math.abs(z) < S * 0.62) h -= (1 - ss(5, 9, ch)) * 3.2; const cr = Math.abs(z); if (Math.abs(x) < S * 0.6) h -= (1 - ss(4, 7, cr)) * 3.2 * (Math.abs(x) > 18 ? 1 : 0); return h + edge(x, z, 40); };
    case 'colosseum': return (x, z) => { const r = Math.hypot(x, z); return f(x * 0.03, z * 0.03, 2) * 0.5 + ss(S * 0.88, S * 1.1, r) * 22; };
    case 'crystal': return (x, z) => { const r = Math.hypot(x, z); return f(x * 0.02, z * 0.02, 4) * 5 - (1 - ss(0, S * 0.5, r)) * 4 + ss(S * 0.75, S * 1.1, r) * 45; };
    case 'rustyard': return (x, z) => f(x * 0.015, z * 0.015, 3) * 2.5 + edge(x, z, 25);
    case 'neon': return (x, z) => edge(x, z, 2) * 0;
    case 'snow': return (x, z) => { let h = f(x * 0.008, z * 0.008, 5) * 16 + f(x * 0.03, z * 0.03, 2) * 2; const lake = Math.hypot(x + S * 0.2, z - S * 0.05); h = MW.lerp(-0.5, h, ss(18, 34, lake)); return h + edge(x, z, 60) + Math.max(0, Math.abs(x) - S * 0.6) * 0.5; };
    case 'canyon': return (x, z) => { const riv = Math.abs(x - Math.sin(z * 0.012) * S * 0.25); let h = f(x * 0.006, z * 0.006, 3) * 12 + 10; const mesa = f(x * 0.011 + 7, z * 0.011 - 3, 3); if (mesa > 0.22) h += ss(0.22, 0.27, mesa) * 24; h = MW.lerp(h, -1, 1 - ss(14, 40, riv)); return h + edge(x, z, 50); };
    case 'jungle': return (x, z) => f(x * 0.012, z * 0.012, 4) * 7 + edge(x, z, 30);
    case 'harbor': return (x, z) => { let h = f(x * 0.02, z * 0.02, 3) * 0.8 + 1; if (x > S * 0.55) h -= (x - S * 0.55) * 0.6; return Math.max(-8, h) + ss(S * 0.86, S * 1.15, Math.max(-x, Math.abs(z))) * 30; };
    case 'volcano': return (x, z) => { let h = f(x * 0.01, z * 0.01, 4) * 10; const riv = Math.abs(z - Math.sin(x * 0.02) * S * 0.12); h = MW.lerp(h, -4.5, 1 - ss(5, 14, riv)) ; const riv2 = Math.abs(x + Math.cos(z * 0.025) * S * 0.1); if (Math.abs(z) > S * 0.3) h = MW.lerp(h, -4.5, (1 - ss(4, 10, riv2)) * 0.95); return h + edge(x, z, 60); };
    case 'moon': return (x, z) => { let h = f(x * 0.008, z * 0.008, 4) * 6; for (let i = 0; i < 9; i++) { const cx = Math.sin(i * 7.3) * S * 0.7, cz = Math.cos(i * 4.1) * S * 0.7, cr = 18 + (i % 4) * 9; const d = Math.hypot(x - cx, z - cz) / cr; if (d < 1.4) h += d < 1 ? -(1 - d * d) * cr * 0.25 + ss(0.7, 1, d) * cr * 0.12 : (1.4 - d) / 0.4 * cr * 0.12; } return h + edge(x, z, 50); };
    case 'swamp': return (x, z) => f(x * 0.014, z * 0.014, 4) * 3.5 + edge(x, z, 25);
    case 'refinery': return (x, z) => f(x * 0.02, z * 0.02, 2) * 0.6 + edge(x, z, 25);
    case 'salt': return (x, z) => f(x * 0.005, z * 0.005, 3) * 2 + edge(x, z, 30);
    case 'mars': return (x, z) => { const du = Math.sin(x * 0.04 + f(x * 0.005, z * 0.005) * 4) * 3 + Math.sin(z * 0.025 + x * 0.01) * 2; return f(x * 0.006, z * 0.006, 4) * 12 + du + edge(x, z, 60); };
    case 'glacier': return (x, z) => { let h = f(x * 0.007, z * 0.007, 4) * 10; const c1 = Math.abs(z - x * 0.4 - S * 0.25), c2 = Math.abs(z + x * 0.3 + S * 0.3); if (Math.abs(x) < S * 0.75) h -= (1 - ss(3, 7, Math.min(c1, c2))) * 9 * (Math.abs(x) > 25 ? 1 : 0); return h + edge(x, z, 70); };
    case 'city': return (x, z) => f(x * 0.01, z * 0.01, 2) * 0.8 + edge(x, z, 20);
    case 'forest': return (x, z) => f(x * 0.006, z * 0.006, 4) * 14 + edge(x, z, 50);
    case 'spaceport': return (x, z) => f(x * 0.01, z * 0.01, 2) * 0.6 + edge(x, z, 40);
    case 'toxic': return (x, z) => { let h = f(x * 0.008, z * 0.008, 4) * 7; const p = f(x * 0.02 + 4, z * 0.02, 2); if (p > 0.3) h -= ss(0.3, 0.4, p) * 3; return h + edge(x, z, 40); };
  }
  return () => 0;
}

const matCache = {};
function mat(col, rough, metal, extra) {
  const key = col + '|' + rough + '|' + metal + '|' + (extra ? JSON.stringify(Object.keys(extra)) + (extra.emissive || '') + (extra.mapKey || '') : '');
  if (matCache[key]) return matCache[key];
  const m = new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(col), roughness: rough == null ? 0.8 : rough, metalness: metal || 0 }, extra || {}));
  if (extra && extra.emissive) { m.emissive = new THREE.Color(extra.emissive); m.emissiveIntensity = extra.emissiveIntensity || 1; }
  delete m.mapKey;
  return (matCache[key] = m);
}
const glow = (col, k) => mat('#000000', 1, 0, { emissive: col, emissiveIntensity: k || 2 });

MW.maps = {
  build(def, scene, opts) {
    opts = opts || {};
    const th = TH[def.theme]; const S = def.size; const N = makeNoise(def.id);
    const rnd = MW.rng(def.id + 'props');
    const H = heightFn(def.theme, S, N);
    const W = Object.assign(Object.create(WP), {
      def, th, S, scene, heightAt: H, obstacles: [], grid: new Map(), cell: 16, group: new THREE.Group(), dyn: [], weather: null,
      water: th.water != null ? th.water : null, lava: th.lava != null ? th.lava : null, toxic: th.toxic != null ? th.toxic : null, gravity: (th.gravity || 1) * 22,
      keep: [], lights: [],
    });
    scene.add(W.group);
    const statics = new THREE.Group(); W.group.add(statics);

    // ----- layout: bases, points, generators -----
    W.bases = [{ x: 0, z: -S * 0.8 }, { x: 0, z: S * 0.8 }];
    if (def.theme === 'harbor') { W.bases = [{ x: -S * 0.2, z: -S * 0.8 }, { x: -S * 0.2, z: S * 0.8 }]; }
    W.points = [{ x: -S * 0.5, z: -S * 0.08, name: 'A' }, { x: 0, z: 0, name: 'B' }, { x: S * 0.5, z: S * 0.08, name: 'C' }];
    if (def.theme === 'harbor') W.points[2].x = S * 0.38;
    W.gens = [{ x: -S * 0.38, z: S * 0.42 }, { x: S * 0.38, z: S * 0.42 }, { x: 0, z: S * 0.62 }];
    if (def.theme === 'harbor') W.gens[1].x = S * 0.3;
    W.center = { x: 0, z: 0 };
    W.keep.push(...W.bases.map(b => ({ x: b.x, z: b.z, r: S * 0.16 })), ...W.points.map(p => ({ x: p.x, z: p.z, r: 15 })), ...W.gens.map(g => ({ x: g.x, z: g.z, r: 13 })), { x: 0, z: 0, r: 14 });
    const free = (x, z, r) => { if (Math.abs(x) > S * 0.92 || Math.abs(z) > S * 0.92) return false; for (const k of W.keep) if (Math.hypot(x - k.x, z - k.z) < k.r + r) return false; return true; };
    W.free = free;
    const minH = (x, z, rx, rz) => Math.min(H(x, z), H(x - rx, z - rz), H(x + rx, z - rz), H(x - rx, z + rz), H(x + rx, z + rz));

    // ----- collider + mesh helpers -----
    const addObs = o => { o.i = W.obstacles.length; W.obstacles.push(o); const R = o.type === 'box' ? Math.hypot(o.w, o.d) / 2 : o.r; o.R = R; const c = W.cell; for (let gx = Math.floor((o.x - R) / c); gx <= Math.floor((o.x + R) / c); gx++) for (let gz = Math.floor((o.z - R) / c); gz <= Math.floor((o.z + R) / c); gz++) { const k = gx + ',' + gz; if (!W.grid.has(k)) W.grid.set(k, []); W.grid.get(k).push(o.i); } return o; };
    const B = (x, z, w, d, h, m, o) => {
      o = o || {}; const rot = o.rot || 0; const y0 = o.y0 != null ? o.y0 : minH(x, z, w / 2, d / 2) - 0.5; const geo = o.geo || (o.bevel ? G.bbox(w, h, d, o.bevel) : new THREE.BoxGeometry(w, h, d));
      if (!o.nomesh) { const me = new THREE.Mesh(geo, m); me.position.set(x, y0 + h / 2, z); me.rotation.y = rot; me.castShadow = !o.noshadow; me.receiveShadow = true; statics.add(me); }
      if (!o.nocol) addObs({ type: 'box', x, z, w, d, h, y0, top: y0 + h, rot, c: Math.cos(rot), s: Math.sin(rot) });
      return y0;
    };
    const C = (x, z, r, h, m, o) => {
      o = o || {}; const y0 = o.y0 != null ? o.y0 : minH(x, z, r * 0.7, r * 0.7) - 0.5;
      if (!o.nomesh) { const me = new THREE.Mesh(o.geo || new THREE.CylinderGeometry(o.rt != null ? o.rt : r, r, h, o.seg || 16), m); me.position.set(x, y0 + h / 2, z); if (o.ry) me.rotation.y = o.ry; me.castShadow = !o.noshadow; me.receiveShadow = true; statics.add(me); }
      if (!o.nocol) addObs({ type: 'cyl', x, z, r: o.colR || r, h, y0, top: y0 + h });
      return y0;
    };
    const D = (geo, m, x, y, z, rx, ry, rz, sx, sy, sz, shadow) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, rz || 0); if (sx) me.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz); me.castShadow = shadow !== false; me.receiveShadow = true; statics.add(me); return me; };
    W.B = B; W.C = C; W.D = D;
    const inst = []; // [{geo, mat, mats:[Matrix4]}]
    const I = (key, geo, m, x, y, z, ry, s, sy, rx) => { let e = inst.find(q => q.key === key); if (!e) { e = { key, geo, mat: m, list: [] }; inst.push(e); } const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, 0)); e.list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, sy == null ? s : sy, s))); };
    const scatter = (n, r, fn) => { let k = 0, tries = 0; while (k < n && tries < n * 20) { tries++; const x = (rnd() * 2 - 1) * S * 0.95, z = (rnd() * 2 - 1) * S * 0.95; if (!free(x, z, r)) continue; fn(x, z, k); k++; } };
    W.scatter = scatter;

    // ----- common props -----
    const rockGeo = (() => { const g = new THREE.DodecahedronGeometry(1, 1); const p = g.attributes.position; const r = MW.rng('rock' + def.id); for (let i = 0; i < p.count; i++) { const k = 0.75 + r() * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); } g.computeVertexNormals(); return g; })();
    const rock = (x, z, r, col, collide) => { const y = H(x, z); D(rockGeo, mat(col || th.pal[3], 0.95), x, y + r * 0.2, z, rnd(), rnd() * 6, rnd() * 0.3, r, r * (0.6 + rnd() * 0.5), r * (0.8 + rnd() * 0.4)); if (collide !== false) addObs({ type: 'cyl', x, z, r: r * 0.85, h: r * 1.2, y0: y - 1, top: y + r }); };
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 1, 7); trunkGeo.translate(0, 0.5, 0);
    const coneGeo = new THREE.ConeGeometry(1, 1, 8); coneGeo.translate(0, 0.5, 0);
    const blobGeo = new THREE.IcosahedronGeometry(1, 1);
    const pine = (x, z, s, col) => { const y = H(x, z); I('trunk', trunkGeo, mat('#4a3424', 0.9), x, y, z, 0, s * 1.2, s * 3); for (let i = 0; i < 3; i++) I('pine' + (col || ''), coneGeo, mat(col || '#2a4a2a', 0.85), x, y + s * (2 + i * 2.2), z, i, s * (3.4 - i * 0.9), s * 4); addObs({ type: 'cyl', x, z, r: s * 0.7, h: s * 9, y0: y - 1, top: y + s * 9 }); };
    const leafy = (x, z, s, col) => { const y = H(x, z); I('trunk', trunkGeo, mat('#4a3424', 0.9), x, y, z, 0, s * 1.4, s * 5); I('leaf' + (col || ''), blobGeo, mat(col || '#3a6a2a', 0.85), x, y + s * 5.5, z, rnd() * 6, s * 3, s * 2.4); addObs({ type: 'cyl', x, z, r: s * 0.7, h: s * 8, y0: y - 1, top: y + s * 7 }); };
    const deadTree = (x, z, s, col) => { const y = H(x, z); const m = mat(col || '#3a3228', 0.95); I('dt', trunkGeo, m, x, y, z, rnd() * 6, s * 1.2, s * 7); for (let i = 0; i < 3; i++) I('dtb', trunkGeo, m, x, y + s * (3 + i * 1.2), z, rnd() * 6, s * 0.5, s * 2.5, 0.9 + rnd() * 0.5); addObs({ type: 'cyl', x, z, r: s * 0.5, h: s * 7, y0: y - 1, top: y + s * 7 }); };
    const container = (x, z, rot, stack, col) => { const cols = ['#a83a2a', '#2a5a9a', '#3a7a3a', '#c8862a', '#6a6a6a', '#2a8a8a', '#8a2a5a']; for (let i = 0; i < stack; i++) { const c = col || cols[Math.floor(rnd() * cols.length)]; B(x, z, 6, 2.6 * 5.5 / 2.6, 2.9, mat(c, 0.6, 0.5, { map: corrTex(), mapKey: 'corr' }), { rot, y0: minH(x, z, 4, 4) - 0.2 + i * 2.9, nocol: i > 0 }); } const o = W.obstacles[W.obstacles.length - 1]; if (o && o.x === x) { o.h = stack * 2.9; o.top = o.y0 + o.h; } };
    const corrTex = () => { if (MW._corr) return MW._corr; const cv = MW.tex.canvas(64, 64), c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); for (let i = 0; i < 64; i += 4) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(i, 0, 2, 64); } c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 0, 64, 2); c.fillRect(0, 62, 64, 2); const t = MW.tex.toTex(cv, true); t.repeat.set(2, 1); return (MW._corr = t); };
    const building = (x, z, w, d, h, o) => {
      o = o || {}; const lit = o.lit != null ? o.lit : (th.night ? 0.45 : 0.08);
      const winTex = MW.tex.windows(lit, o.winCol || (th.night ? '#ffd890' : '#8aa0b0'), def.id + Math.floor(rnd() * 4));
      const tex = winTex.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(h / 6)));
      const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.col || '#6a6e74'), map: tex, roughness: 0.8, metalness: 0.2, emissive: new THREE.Color(th.night ? '#ffffff' : '#000000'), emissiveMap: th.night ? tex : null, emissiveIntensity: th.night ? 0.9 : 0 });
      const y0 = B(x, z, w, d, h, m, { rot: o.rot || 0 });
      D(new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6), mat(o.trim || '#3a3c40', 0.8), x, y0 + h + 0.4, z, 0, o.rot || 0);
      if (rnd() < 0.5) D(new THREE.BoxGeometry(w * 0.3, 2.5, d * 0.3), mat('#4a4c50', 0.7, 0.4), x + w * 0.15, y0 + h + 1.6, z - d * 0.1, 0, o.rot || 0);
      return y0;
    };
    const wreck = (x, z, scale, rot) => {
      const b = MW.randomBuild(0, rnd); b.colors = ['#3a3430', '#2a2420', '#5a3020']; b.finish = MW.item('f_scarred'); b.emblem = null;
      const mm = MW.mechs.build(b, {}); mm.root.position.set(x, H(x, z) - 1.5, z); mm.root.rotation.set(rnd() * 0.5, rot || rnd() * 6, (rnd() < 0.5 ? 1 : -1) * (0.9 + rnd() * 0.6)); mm.root.scale.setScalar(scale || 1);
      MW.mechs.animate(mm, 0.016, { speed: 0, maxSpeed: 1, twist: rnd() - 0.5, pitch: 0.3, t: 0 });
      W.group.add(mm.root); addObs({ type: 'cyl', x, z, r: 4 * (scale || 1), h: 6 * (scale || 1), y0: H(x, z) - 1, top: H(x, z) + 5 * (scale || 1) });
      W.dyn.push({ smoke: new THREE.Vector3(x, H(x, z) + 3, z), rate: 0.6 });
    };
    W.helpers = { B, C, D, I, rock, pine, leafy, deadTree, container, building, wreck, mat, glow, free, scatter, minH, addObs };

    // ----- theme landmarks -----
    const LM = LANDMARKS[def.theme]; if (LM) LM(W, rnd);

    // instanced meshes
    inst.forEach(e => { const im = new THREE.InstancedMesh(e.geo, e.mat, e.list.length); e.list.forEach((m4, i) => im.setMatrixAt(i, m4)); im.castShadow = true; im.receiveShadow = true; W.group.add(im); });

    // ----- terrain mesh -----
    const ext = S * 1.6; const seg = Math.min(220, Math.round(ext * 2 / 3.2));
    const tg = new THREE.PlaneGeometry(ext * 2, ext * 2, seg, seg); tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position; const cols = new Float32Array(tp.count * 3);
    const pc = th.pal.map(c => new THREE.Color(c)); const tmp = new THREE.Color();
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i); const h = H(x, z); tp.setY(i, h);
      const sl = Math.min(1, Math.hypot(H(x + 1.5, z) - H(x - 1.5, z), H(x, z + 1.5) - H(x, z - 1.5)) / 3);
      const n = N.fbm(x * 0.05, z * 0.05, 2) * 0.5 + 0.5;
      const hh = MW.clamp((h + 3) / 20, 0, 1);
      tmp.copy(pc[0]).lerp(pc[1], n).lerp(pc[2], hh * 0.7).lerp(pc[3], ss(0.35, 0.75, sl));
      if (def.theme === 'jungle' || def.theme === 'forest' || def.theme === 'swamp') tmp.lerp(new THREE.Color('#2e4a1e'), (1 - sl) * N.fbm(x * 0.02 + 5, z * 0.02, 2) * 0.5);
      if (W.lava != null && h < W.lava + 0.6) tmp.lerp(new THREE.Color('#1a0a04'), 0.8);
      cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); tg.computeVertexNormals();
    const uv = tg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ext / 8, uv.getY(i) * ext / 8);
    const gtex = MW.tex.ground(def.theme);
    const gm = new THREE.MeshStandardMaterial({ vertexColors: true, map: gtex, roughness: th.rough, metalness: th.wet ? 0.3 : 0 });
    const ground = new THREE.Mesh(tg, gm); ground.receiveShadow = true; W.group.add(ground); W.ground = ground;

    // liquids
    if (W.water != null) { const wm = new THREE.MeshStandardMaterial({ color: def.theme === 'swamp' ? 0x2a3a22 : 0x1a4a6a, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.82 }); const w = new THREE.Mesh(new THREE.PlaneGeometry(ext * 2, ext * 2), wm); w.rotation.x = -Math.PI / 2; w.position.y = W.water; W.group.add(w); W.waterMesh = w; }
    if (W.lava != null || W.toxic != null) {
      const isL = W.lava != null; const cv = MW.tex.canvas(128, 128), c = cv.getContext('2d'); const r = MW.rng('lava');
      c.fillStyle = isL ? '#ff4a0a' : '#5aff2a'; c.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 60; i++) { c.fillStyle = isL ? (r() < 0.5 ? '#ffb020' : '#7a1a02') : (r() < 0.5 ? '#c8ff6a' : '#1a6a0a'); c.globalAlpha = 0.5; c.beginPath(); c.arc(r() * 128, r() * 128, 3 + r() * 14, 0, 7); c.fill(); }
      const lt = MW.tex.toTex(cv, true); lt.repeat.set(ext / 10, ext / 10);
      const lm = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: lt, emissiveIntensity: isL ? 1.6 : 0.9, roughness: 0.6 });
      const l = new THREE.Mesh(new THREE.PlaneGeometry(ext * 2, ext * 2), lm); l.rotation.x = -Math.PI / 2; l.position.y = isL ? W.lava : W.toxic; W.group.add(l); W.lavaTex = lt;
    }

    // ----- sky, fog, lights -----
    const skyU = { top: { value: new THREE.Color(th.sky[0]) }, hor: { value: new THREE.Color(th.sky[1]) }, bot: { value: new THREE.Color(th.sky[2]) }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color(th.sun[0]) }, flash: { value: 0 } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(S * 5, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top,hor,bot,sunDir,sunCol; uniform float flash; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h>0.0 ? mix(hor, top, pow(min(1.0,h*1.6),0.7)) : mix(hor, bot, min(1.0,-h*4.0)); float s = max(0.0, dot(vP, sunDir)); c += sunCol * (pow(s, 600.0)*3.0 + pow(s, 12.0)*0.25); c += vec3(0.8,0.85,1.0)*flash; gl_FragColor = vec4(c,1.0); }' }));
    sky.renderOrder = -10; W.group.add(sky); W.sky = sky; W.skyU = skyU;
    const az = th.sun[3], el = th.sun[2];
    const sunDir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize();
    skyU.sunDir.value.copy(sunDir); W.sunDir = sunDir;
    scene.fog = new THREE.Fog(new THREE.Color(th.fog[0]), th.fog[1], th.fog[2] * Math.max(1, S / 200));
    scene.background = new THREE.Color(th.fog[0]);
    const hemi = new THREE.HemisphereLight(new THREE.Color(th.hemi[0]), new THREE.Color(th.hemi[1]), th.hemi[2]); W.group.add(hemi);
    const amb = new THREE.AmbientLight(0xffffff, th.amb); W.group.add(amb);
    const sun = new THREE.DirectionalLight(new THREE.Color(th.sun[0]), th.sun[1]);
    sun.castShadow = MW.profile.s.quality !== 'low';
    sun.shadow.mapSize.set(MW.profile.s.quality === 'high' ? 2048 : 1024, MW.profile.s.quality === 'high' ? 2048 : 1024);
    const sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 500; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
    W.group.add(sun); W.group.add(sun.target); W.sun = sun; W.hemi = hemi;
    if (th.stars) { const n = 1500, p = new Float32Array(n * 3), r = MW.rng('stars'); for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * 6.28, q = Math.sqrt(1 - u * u); p[i * 3] = Math.cos(a) * q * S * 4.5; p[i * 3 + 1] = Math.abs(u) * S * 4.5; p[i * 3 + 2] = Math.sin(a) * q * S * 4.5; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const st = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false })); W.group.add(st); }
    if (th.earth) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: earthTex(), fog: false })); e.position.set(-S * 2, S * 2.2, S * 3); e.scale.setScalar(S * 0.9); W.group.add(e); }
    if (th.aurora) { W.aurora = []; for (let i = 0; i < 3; i++) { const g = new THREE.PlaneGeometry(S * 6, S * 0.8, 60, 1); const m = new THREE.MeshBasicMaterial({ map: auroraTex(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, color: i === 1 ? 0xa060ff : 0x60ffc0 }); const a = new THREE.Mesh(g, m); a.position.set(0, S * 1.3 + i * 30, S * (1.2 + i * 0.5)); a.rotation.x = -0.3; W.group.add(a); W.aurora.push(a); } }
    // distant mountain ring for open themes
    if (['snow', 'canyon', 'mars', 'glacier', 'forest', 'salt', 'volcano', 'moon', 'jungle', 'toxic', 'swamp'].includes(def.theme)) {
      const mg = new THREE.ConeGeometry(1, 1, 6); mg.translate(0, 0.5, 0); const n = 36; const im = new THREE.InstancedMesh(mg, mat(new THREE.Color(th.pal[3]).lerp(new THREE.Color(th.fog[0]), 0.4).getStyle(), 1), n);
      for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rnd() * 0.1; const d = S * (2.1 + rnd() * 0.6); const h = S * (0.25 + rnd() * 0.35) * (def.theme === 'salt' ? 0.3 : 1); const m4 = new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * d, -5, Math.sin(a) * d), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 3, 0)), new THREE.Vector3(h * 1.4, h, h * 1.4)); im.setMatrixAt(i, m4); }
      W.group.add(im);
    }
    if (def.theme === 'volcano') { const v = new THREE.Mesh(new THREE.ConeGeometry(S * 0.9, S * 0.7, 24, 1, true), mat('#1a1210', 1)); v.position.set(S * 0.4, S * 0.3, S * 2.4); W.group.add(v); const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: MW.tex.sprite('soft'), color: 0xff5a1a, blending: THREE.AdditiveBlending, transparent: true, fog: false })); fl.position.set(S * 0.4, S * 0.7, S * 2.4); fl.scale.setScalar(S * 0.6); W.group.add(fl); W.dyn.push({ fire: new THREE.Vector3(S * 0.4, S * 0.66, S * 2.4), rate: 6, big: 9, far: true }); }

    // boundary posts
    const postM = glow('#ff5a3a', 1.5);
    for (let i = -6; i <= 6; i++) for (const s of [-1, 1]) { const p = i / 6 * S; for (const [x, z] of [[p, s * S], [s * S, p]]) { if (def.theme === 'harbor' && x > S * 0.5) continue; const y = H(x, z); D(G.box(0.4, 6, 0.4), mat('#2a2a2a', 0.6, 0.6), x, y + 3, z); D(G.box(0.5, 0.4, 0.5), postM, x, y + 6.2, z, 0, 0, 0, 1, 1, 1, false); } }

    // merge statics
    MW.mechs.mergeNode(statics);
    statics.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    // ----- weather particles -----
    const wk = th.weather;
    if (wk && !opts.noWeather) {
      const n = { rain: 3500, snow: 2500, ash: 1500, embers: 700, dust: 1200, spores: 600, storm: 3500, smoke: 600, gulls: 0 }[wk] || 0;
      if (n) {
        const p = new Float32Array(n * 3), r = MW.rng('wx'); for (let i = 0; i < n; i++) { p[i * 3] = (r() - 0.5) * 120; p[i * 3 + 1] = r() * 60; p[i * 3 + 2] = (r() - 0.5) * 120; }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
        const col = { rain: 0x9ab0c8, storm: 0x9ab0c8, snow: 0xffffff, ash: 0x8a8480, embers: 0xff8a3a, dust: 0xc8a07a, spores: 0xc8ffb0, smoke: 0x6a6460 }[wk];
        const m = new THREE.PointsMaterial({ color: col, size: wk === 'rain' || wk === 'storm' ? 0.12 : wk === 'embers' || wk === 'spores' ? 0.25 : 0.2, transparent: true, opacity: wk === 'dust' || wk === 'smoke' ? 0.5 : 0.85, map: MW.tex.sprite('soft'), depthWrite: false, blending: wk === 'embers' || wk === 'spores' ? THREE.AdditiveBlending : THREE.NormalBlending });
        if (wk === 'rain' || wk === 'storm') { m.size = 0.18; }
        const pts = new THREE.Points(g, m); pts.frustumCulled = false; W.group.add(pts);
        W.weather = { kind: wk, pts, n, vel: { rain: [0, -38, 0], storm: [6, -42, 2], snow: [0.5, -2.5, 0.3], ash: [0.6, -1.4, 0.2], embers: [0.3, 2.2, 0.2], dust: [6, -0.3, 2], spores: [0.2, 0.3, 0.1], smoke: [1, 0.6, 0.4] }[wk] };
      }
    }
    W.lightning = 0; W.lightT = 4 + Math.random() * 8;

    // ----- nav grid -----
    W.navCell = MW.clamp(S / 46, 3, 7); const NC = W.navCell; W.navN = Math.ceil(S * 2 / NC);
    const nn = W.navN; W.nav = new Uint8Array(nn * nn); // 0 blocked, 1..9 cost
    for (let j = 0; j < nn; j++) for (let i = 0; i < nn; i++) {
      const x = -S + (i + 0.5) * NC, z = -S + (j + 0.5) * NC; let cost = 1;
      const h = H(x, z); const sl = Math.hypot(H(x + 2, z) - H(x - 2, z), H(x, z + 2) - H(x, z - 2)) / 4;
      if (sl > 0.9) cost = 0;
      if (Math.abs(x) > S * 0.95 || Math.abs(z) > S * 0.95) cost = 0;
      if (cost && W.lava != null && h < W.lava + 0.4) cost = 9;
      if (cost && W.toxic != null && h < W.toxic + 0.3) cost = 6;
      if (cost && W.water != null && h < W.water - 0.8) cost = h < W.water - 5 ? 0 : 3;
      if (cost && W.blockedAt(x, z, 3.2)) cost = 0;
      W.nav[j * nn + i] = cost;
    }
    // ensure spawn and objective cells are walkable
    [...W.bases, ...W.points, ...W.gens, W.center].forEach(p => { const [i, j] = W.navIJ(p.x, p.z); for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const k = (j + b) * nn + (i + a); if (k >= 0 && k < nn * nn && W.nav[k] === 0 && !W.blockedAt(-S + (i + a + 0.5) * NC, -S + (j + b + 0.5) * NC, 1)) W.nav[k] = 2; } });
    return W;
  },
};

MW.maps.preview = function (def, size) {
  const th = TH[def.theme]; const S = def.size; const H = heightFn(def.theme, S, makeNoise(def.id));
  const cv = MW.tex.canvas(size, size), c = cv.getContext('2d'); const img = c.createImageData(size, size); const pc = th.pal.map(x => new THREE.Color(x)); const tmp = new THREE.Color();
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = -S + (i + 0.5) / size * 2 * S, z = -S + (j + 0.5) / size * 2 * S; const hh = H(x, z);
    const sl = Math.min(1, Math.hypot(H(x + 3, z) - H(x - 3, z), H(x, z + 3) - H(x, z - 3)) / 6);
    tmp.copy(pc[1]).lerp(pc[2], MW.clamp((hh + 3) / 20, 0, 1)).lerp(pc[3], sl); let k = 0.6 + MW.clamp(hh / 30, -0.3, 0.4) - sl * 0.2;
    if (th.water != null && hh < th.water) { tmp.set('#1a4a6a'); k = 0.9; } if (th.lava != null && hh < th.lava + 0.2) { tmp.set('#ff5a1a'); k = 1; } if (th.toxic != null && hh < th.toxic + 0.2) { tmp.set('#6aff2a'); k = 0.8; }
    const o = (j * size + i) * 4; img.data[o] = tmp.r * 255 * k; img.data[o + 1] = tmp.g * 255 * k; img.data[o + 2] = tmp.b * 255 * k; img.data[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  c.fillStyle = '#3ea6ff'; c.fillRect(size / 2 - 4, size * 0.9 - 2, 8, 4); c.fillStyle = '#ff4a3a'; c.fillRect(size / 2 - 4, size * 0.1 - 2, 8, 4);
  return cv;
};
function earthTex() { const cv = MW.tex.canvas(128), c = cv.getContext('2d'); const g = c.createRadialGradient(54, 54, 4, 64, 64, 60); g.addColorStop(0, '#9fd0ff'); g.addColorStop(0.8, '#2a6ac8'); g.addColorStop(1, 'rgba(40,100,200,0)'); c.fillStyle = g; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); const r = MW.rng('earth'); c.fillStyle = '#4a8a3a'; for (let i = 0; i < 14; i++) { c.beginPath(); c.ellipse(30 + r() * 70, 30 + r() * 70, 5 + r() * 14, 3 + r() * 8, r() * 3, 0, 7); c.fill(); } c.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 10; i++) { c.beginPath(); c.ellipse(30 + r() * 70, 30 + r() * 70, 6 + r() * 16, 2 + r() * 4, r() * 3, 0, 7); c.fill(); } c.globalCompositeOperation = 'destination-in'; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.fill(); return MW.tex.toTex(cv); }
function auroraTex() { if (MW._aur) return MW._aur; const cv = MW.tex.canvas(256, 64), c = cv.getContext('2d'); for (let x = 0; x < 256; x++) { const h = 20 + Math.sin(x * 0.07) * 12 + Math.sin(x * 0.21) * 6; const g = c.createLinearGradient(0, 64, 0, 64 - h - 10); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, 0, 1, 64); } return (MW._aur = MW.tex.toTex(cv, true)); }

// ---------- world queries (attached to prototype via helper) ----------
const WP = {
  navIJ(x, z) { return [MW.clamp(Math.floor((x + this.S) / this.navCell), 0, this.navN - 1), MW.clamp(Math.floor((z + this.S) / this.navCell), 0, this.navN - 1)]; },
  navXZ(i, j) { return { x: -this.S + (i + 0.5) * this.navCell, z: -this.S + (j + 0.5) * this.navCell }; },
  near(x, z, r, fn) { const c = this.cell; const seen = this._seen || (this._seen = new Uint32Array(1 << 14)); const stamp = (this._stamp = (this._stamp || 0) + 1);
    for (let gx = Math.floor((x - r) / c); gx <= Math.floor((x + r) / c); gx++) for (let gz = Math.floor((z - r) / c); gz <= Math.floor((z + r) / c); gz++) { const L = this.grid.get(gx + ',' + gz); if (!L) continue; for (const i of L) { if (seen[i & 16383] === stamp) continue; seen[i & 16383] = stamp; if (fn(this.obstacles[i]) === false) return; } } },
  blockedAt(x, z, r) { let hit = false; this.near(x, z, r + 8, o => { if (this.circleHit(o, x, z, r)) { hit = true; return false; } }); return hit; },
  circleHit(o, x, z, r) {
    if (o.type === 'cyl') return Math.hypot(x - o.x, z - o.z) < o.r + r;
    const dx = x - o.x, dz = z - o.z; const lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
    const px = MW.clamp(lx, -o.w / 2, o.w / 2), pz = MW.clamp(lz, -o.d / 2, o.d / 2); return Math.hypot(lx - px, lz - pz) < r;
  },
  // push a circle out of obstacles. Returns true if collided. pos {x,y,z}; feetY = bottom y
  collide(pos, r, feetY) {
    let hit = false;
    this.near(pos.x, pos.z, r + 10, o => {
      if (feetY != null && feetY > o.top - 0.6) return; // standing on top
      if (o.type === 'cyl') { const dx = pos.x - o.x, dz = pos.z - o.z; const d = Math.hypot(dx, dz); const m = o.r + r; if (d < m && d > 1e-4) { pos.x = o.x + dx / d * m; pos.z = o.z + dz / d * m; hit = true; } }
      else { const dx = pos.x - o.x, dz = pos.z - o.z; const lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c; const hw = o.w / 2, hd = o.d / 2; const px = MW.clamp(lx, -hw, hw), pz = MW.clamp(lz, -hd, hd); let ex = lx - px, ez = lz - pz; const d = Math.hypot(ex, ez);
        if (d < r) { let nx, nz; if (d > 1e-4) { nx = ex / d; nz = ez / d; } else { const ox = hw - Math.abs(lx), oz = hd - Math.abs(lz); if (ox < oz) { nx = Math.sign(lx) || 1; nz = 0; } else { nx = 0; nz = Math.sign(lz) || 1; } }
          const tx = px + nx * r, tz = pz + nz * r; const wx = tx * o.c + tz * o.s, wz = -tx * o.s + tz * o.c; pos.x = o.x + wx; pos.z = o.z + wz; hit = true; } }
    });
    return hit;
  },
  // top surface height of obstacles under a point (for standing on roofs)
  topAt(x, z, r, feetY) { let best = -1e9; this.near(x, z, r + 8, o => { if (this.circleHit(o, x, z, r * 0.5) && o.top <= feetY + 1.2) best = Math.max(best, o.top); }); return best; },
  // ray vs obstacles; returns t or Infinity
  rayObs(o, d, maxT) {
    let best = maxT; const c = this.cell; const steps = Math.ceil(maxT / (c * 0.5)) + 1; const seen = new Set();
    for (let k = 0; k <= steps; k++) {
      const t = Math.min(maxT, k * c * 0.5); if (t > best + c) break;
      const x = o.x + d.x * t, z = o.z + d.z * t;
      for (let ax = -1; ax <= 1; ax++) for (let az = -1; az <= 1; az++) { const L = this.grid.get((Math.floor(x / c) + ax) + ',' + (Math.floor(z / c) + az)); if (!L) continue; for (const i of L) { if (seen.has(i)) continue; seen.add(i); const ob = this.obstacles[i]; const tt = this.rayOne(ob, o, d, best); if (tt < best) best = tt; } }
    }
    return best < maxT ? best : Infinity;
  },
  rayOne(ob, o, d, maxT) {
    if (ob.type === 'cyl') {
      const ox = o.x - ob.x, oz = o.z - ob.z; const a = d.x * d.x + d.z * d.z; const b = 2 * (ox * d.x + oz * d.z); const cc = ox * ox + oz * oz - ob.r * ob.r;
      let t; if (cc < 0) t = 0; else { if (a < 1e-9) return Infinity; const disc = b * b - 4 * a * cc; if (disc < 0) return Infinity; t = (-b - Math.sqrt(disc)) / (2 * a); if (t < 0) return Infinity; }
      if (t > maxT) return Infinity; const y = o.y + d.y * t; if (y >= ob.y0 && y <= ob.top) return t;
      if (d.y !== 0) { const tt = (ob.top - o.y) / d.y; if (tt > t && tt < maxT) { const x = o.x + d.x * tt - ob.x, z = o.z + d.z * tt - ob.z; if (x * x + z * z < ob.r * ob.r) return tt; } }
      return Infinity;
    }
    const dx = o.x - ob.x, dz = o.z - ob.z; const lx = dx * ob.c - dz * ob.s, lz = dx * ob.s + dz * ob.c; const ldx = d.x * ob.c - d.z * ob.s, ldz = d.x * ob.s + d.z * ob.c;
    let t0 = 0, t1 = maxT;
    const slab = (p, v, lo, hi) => { if (Math.abs(v) < 1e-9) return p >= lo && p <= hi; let a = (lo - p) / v, b = (hi - p) / v; if (a > b) { const q = a; a = b; b = q; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); return t0 <= t1; };
    if (!slab(lx, ldx, -ob.w / 2, ob.w / 2)) return Infinity; if (!slab(lz, ldz, -ob.d / 2, ob.d / 2)) return Infinity; if (!slab(o.y, d.y, ob.y0, ob.top)) return Infinity;
    return t0;
  },
  rayTerrain(o, d, maxT) {
    const H = this.heightAt; let step = 2; let prevT = 0; let t = 0;
    if (o.y < H(o.x, o.z)) return 0;
    while (t < maxT) {
      t = Math.min(maxT, t + step);
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y < H(x, z)) { let a = prevT, b = t; for (let i = 0; i < 8; i++) { const m = (a + b) / 2; if (o.y + d.y * m < H(o.x + d.x * m, o.z + d.z * m)) b = m; else a = m; } return b; }
      prevT = t; step = Math.min(6, step * 1.15);
    }
    return Infinity;
  },
  ray(o, d, maxT) { const a = this.rayTerrain(o, d, maxT); const b = this.rayObs(o, d, Math.min(maxT, a)); return Math.min(a, b); },
  los(a, b) { const d = new THREE.Vector3().subVectors(b, a); const L = d.length(); d.multiplyScalar(1 / L); return this.ray(a, d, L - 1) === Infinity; },
  // A* path on the nav grid
  path(from, to) {
    const nn = this.navN, nav = this.nav; let [si, sj] = this.navIJ(from.x, from.z); const [ti, tj] = this.navIJ(to.x, to.z);
    const start = sj * nn + si, goal = tj * nn + ti;
    if (!nav[start]) { // step to nearest walkable
      let found = -1; for (let r = 1; r < 6 && found < 0; r++) for (let a = -r; a <= r && found < 0; a++) for (let b = -r; b <= r; b++) { const i = si + a, j = sj + b; if (i >= 0 && j >= 0 && i < nn && j < nn && nav[j * nn + i]) { found = j * nn + i; break; } }
      if (found < 0) return null;
    }
    const g = this._g || (this._g = new Float32Array(nn * nn)); const came = this._came || (this._came = new Int32Array(nn * nn)); const stampA = this._st || (this._st = new Uint32Array(nn * nn)); const stamp = (this._sv = (this._sv || 0) + 1);
    const heap = []; const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const hfn = k => { const i = k % nn, j = (k / nn) | 0; const dx = Math.abs(i - ti), dz = Math.abs(j - tj); return (dx + dz) + (1.414 - 2) * Math.min(dx, dz); };
    stampA[start] = stamp; g[start] = 0; came[start] = -1; push(start, hfn(start));
    let best = start, bestH = hfn(start), it = 0;
    while (heap.length && it++ < 9000) {
      const [, k] = pop(); if (k === goal) { best = k; break; }
      const i = k % nn, j = (k / nn) | 0; const hk = hfn(k); if (hk < bestH) { bestH = hk; best = k; }
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        if (!a && !b) continue; const ni = i + a, nj = j + b; if (ni < 0 || nj < 0 || ni >= nn || nj >= nn) continue;
        const nk = nj * nn + ni; const cost = nav[nk]; if (!cost) continue;
        if (a && b && (!nav[j * nn + ni] || !nav[nj * nn + i])) continue;
        const ng = g[k] + (a && b ? 1.414 : 1) * cost;
        if (stampA[nk] !== stamp || ng < g[nk]) { stampA[nk] = stamp; g[nk] = ng; came[nk] = k; push(nk, ng + hfn(nk)); }
      }
    }
    const out = []; let k = best; let guard = 0; while (k !== -1 && guard++ < 4000) { out.push(this.navXZ(k % nn, (k / nn) | 0)); k = came[k]; if (k === start) break; }
    out.reverse();
    // string-pull smoothing
    const sm = []; let cur = { x: from.x, z: from.z };
    for (let i = 0; i < out.length; i++) { const nx = out[i + 1]; if (nx && this.walkLine(cur, nx)) continue; sm.push(out[i]); cur = out[i]; }
    if (!sm.length || Math.hypot(sm[sm.length - 1].x - to.x, sm[sm.length - 1].z - to.z) > this.navCell * 2) { if (best === goal) sm.push({ x: to.x, z: to.z }); }
    return sm;
  },
  walkLine(a, b) { const d = Math.hypot(b.x - a.x, b.z - a.z); const n = Math.ceil(d / (this.navCell * 0.5)); for (let i = 1; i <= n; i++) { const t = i / n; const [ii, jj] = this.navIJ(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t); const c = this.nav[jj * this.navN + ii]; if (!c || c > 2) return false; } return true; },
  // ---- per-frame world update ----
  update(dt, cam, t) {
    if (this.lavaTex) { this.lavaTex.offset.x += dt * 0.01; this.lavaTex.offset.y += dt * 0.006; }
    if (this.aurora) this.aurora.forEach((a, i) => { const p = a.geometry.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setZ(k, Math.sin(x * 0.01 + t * 0.3 + i) * 40); } p.needsUpdate = true; a.material.opacity = 0.35 + Math.sin(t * 0.5 + i) * 0.15; });
    // sun shadow follows the camera
    if (this.sun) { const c = cam.position; this.sun.position.set(c.x + this.sunDir.x * 200, c.y + this.sunDir.y * 200, c.z + this.sunDir.z * 200); this.sun.target.position.set(c.x, c.y, c.z); this.sky.position.set(c.x, 0, c.z); }
    if (this.weather) {
      const w = this.weather, p = w.pts.geometry.attributes.position, v = w.vel; const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
      for (let i = 0; i < w.n; i++) {
        let x = p.array[i * 3] + v[0] * dt + (w.kind === 'snow' || w.kind === 'spores' ? Math.sin(t + i) * dt * 0.8 : 0), y = p.array[i * 3 + 1] + v[1] * dt, z = p.array[i * 3 + 2] + v[2] * dt;
        if (x - cx > 60) x -= 120; else if (x - cx < -60) x += 120; if (z - cz > 60) z -= 120; else if (z - cz < -60) z += 120;
        if (y < cy - 25) y += 60; else if (y > cy + 35) y -= 60;
        p.array[i * 3] = x; p.array[i * 3 + 1] = y; p.array[i * 3 + 2] = z;
      }
      p.needsUpdate = true;
      if (w.kind === 'storm') { this.lightT -= dt; if (this.lightT < 0) { this.lightT = 4 + Math.random() * 10; this.lightning = 1; const bx = cam.position.x + (Math.random() - 0.5) * 300, bz = cam.position.z + (Math.random() - 0.5) * 300; MW.fx.bolt(new THREE.Vector3(bx, 160, bz), new THREE.Vector3(bx + (Math.random() - 0.5) * 30, this.heightAt(bx, bz), bz), '#e0e8ff', 0.25, 25); setTimeout(() => MW.audio.play('thunder', null, 0.8), 600 + Math.random() * 1500); } }
    }
    if (this.lightning > 0) { this.lightning = Math.max(0, this.lightning - dt * 3); this.skyU.flash.value = this.lightning * (Math.random() < 0.7 ? 1 : 0.2); this.hemi.intensity = this.th.hemi[2] + this.lightning * 2; }
    for (const d of this.dyn) {
      if (d.smoke && Math.random() < d.rate * dt * 4) { const k = d.smoke.distanceTo(cam.position); if (k < 260) MW.fx.smoke(d.smoke, d.big || 1.5, true); }
      if (d.fire && Math.random() < d.rate * dt * 3) { if (d.far || d.fire.distanceTo(cam.position) < 220) MW.fx.fire(d.fire, d.big || 1.5); }
      if (d.blink) { d.blink.visible = Math.sin(t * d.f + d.ph) > 0; }
      if (d.spin) d.spin.rotation.y += dt * d.rate;
    }
  },
  // minimap thumbnail
  minimap(size) {
    const S = this.S, cv = MW.tex.canvas(size, size), c = cv.getContext('2d'); const img = c.createImageData(size, size); const pc = this.th.pal.map(x => new THREE.Color(x)); const tmp = new THREE.Color();
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const x = -S + (i + 0.5) / size * 2 * S, z = -S + (j + 0.5) / size * 2 * S; const h = this.heightAt(x, z);
      const sl = Math.min(1, Math.hypot(this.heightAt(x + 2, z) - this.heightAt(x - 2, z), this.heightAt(x, z + 2) - this.heightAt(x, z - 2)) / 4);
      tmp.copy(pc[1]).lerp(pc[2], MW.clamp((h + 3) / 20, 0, 1)).lerp(pc[3], sl);
      let k = 0.55 + MW.clamp(h / 30, -0.3, 0.4);
      if (this.water != null && h < this.water) { tmp.set('#1a4a6a'); k = 0.8; }
      if (this.lava != null && h < this.lava + 0.2) { tmp.set('#ff5a1a'); k = 1; }
      if (this.toxic != null && h < this.toxic + 0.2) { tmp.set('#6aff2a'); k = 0.8; }
      const o = (j * size + i) * 4; img.data[o] = tmp.r * 255 * k; img.data[o + 1] = tmp.g * 255 * k; img.data[o + 2] = tmp.b * 255 * k; img.data[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    c.fillStyle = 'rgba(20,22,26,0.85)';
    this.obstacles.forEach(o => { const x = (o.x + S) / (2 * S) * size, z = (o.z + S) / (2 * S) * size; if (o.type === 'cyl') { c.beginPath(); c.arc(x, z, Math.max(1, o.r / (2 * S) * size), 0, 7); c.fill(); } else { c.save(); c.translate(x, z); c.rotate(-o.rot); c.fillRect(-o.w / 2 / (2 * S) * size, -o.d / 2 / (2 * S) * size, Math.max(1, o.w / (2 * S) * size), Math.max(1, o.d / (2 * S) * size)); c.restore(); } });
    return cv;
  },
  dispose() { this.scene.remove(this.group); this.group.traverse(o => { if (o.geometry && !o.geometry.parameters) o.geometry.dispose(); }); },
};
// ---------- landmarks per theme ----------
const LANDMARKS = {
  foundry(W, r) {
    const { B, C, D, mat, glow, scatter, I } = W.helpers; const S = W.S;
    const steel = mat('#4a4c50', 0.5, 0.7), rust = mat('#6a3a24', 0.85, 0.3), dark = mat('#2a2826', 0.8, 0.4), hot = glow('#ff6a1a', 2.5);
    // factory walls around the arena
    for (const s of [-1, 1]) { B(0, s * S * 0.98, S * 2, 4, 28, steel, { y0: -1 }); B(s * S * 0.98, 0, 4, S * 2, 28, steel, { y0: -1 }); }
    // furnaces
    for (const [x, z] of [[-S * 0.6, S * 0.35], [S * 0.6, -S * 0.35], [-S * 0.12, S * 0.45], [S * 0.12, -S * 0.45]]) { if (!W.free(x, z, 8)) continue; B(x, z, 14, 12, 16, dark, { bevel: 0.6 }); D(G.box(8, 4, 0.3), hot, x, 5, z + 6.2); C(x + 4, z - 3, 1.6, 30, rust, { nocol: true, y0: 10 }); W.dyn.push({ smoke: new THREE.Vector3(x + 4, 41, z - 3), rate: 1.2, big: 2.5 }); }
    // crucibles
    for (const [x, z] of [[-S * 0.32, -S * 0.68], [S * 0.32, S * 0.68], [S * 0.6, S * 0.2], [-S * 0.6, -S * 0.2]]) { if (!W.free(x, z, 5)) continue; C(x, z, 4.5, 7, rust, { rt: 5.2 }); D(G.cyl(4.6, 4.6, 0.2, 16), hot, x, 7, z); W.dyn.push({ fire: new THREE.Vector3(x, 7.5, z), rate: 0.5, big: 2 }); }
    // gantry crane: pillars and overhead beam
    for (const s of [-1, 1]) { C(s * S * 0.82, -S * 0.2, 1.6, 26, steel); C(s * S * 0.82, S * 0.2, 1.6, 26, steel); }
    D(G.box(S * 1.7, 2.5, 3), mat('#c8862a', 0.6, 0.4), 0, 27, -S * 0.2); D(G.box(S * 1.7, 2.5, 3), mat('#c8862a', 0.6, 0.4), 0, 27, S * 0.2); D(G.box(10, 3, S * 0.45), dark, S * 0.1, 29, 0);
    D(G.cyl(0.1, 0.1, 14, 4), steel, S * 0.1, 21, 0); D(G.box(6, 2, 6), dark, S * 0.1, 13, 0, 0, 0, 0, 1, 1, 1);
    // ingot stacks and cover blocks
    scatter(18, 4, (x, z) => B(x, z, 4 + r() * 4, 3 + r() * 4, 2 + r() * 3, r() < 0.5 ? steel : rust, { rot: (r() * 4 | 0) * Math.PI / 2 }));
    // bridges over channels
    for (const s of [-1, 1]) for (const zz of [-S * 0.3, S * 0.3]) D(G.box(16, 0.8, 8), steel, s * S * 0.32, 0.2, zz);
  },
  colosseum(W, r) {
    const { B, C, D, mat, glow, I } = W.helpers; const S = W.S;
    const stone = mat('#a8987a', 0.9), stone2 = mat('#8a7a62', 0.9), marble = mat('#d8d0c0', 0.5);
    const R = S * 0.9; const n = 40;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const x = Math.cos(a) * R, z = Math.sin(a) * R; if (i % 10 === 0) continue; B(x, z, 2 * Math.PI * R / n + 0.5, 4, 14, stone, { rot: -a + Math.PI / 2, y0: -1 }); for (let k = 1; k <= 4; k++) { const rr = R + k * 6; D(G.box(2 * Math.PI * rr / n + 1, 3, 6), k % 2 ? stone2 : stone, Math.cos(a) * rr, 12 + k * 3, Math.sin(a) * rr, 0, -a + Math.PI / 2); } }
    // gate arches
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const x = Math.cos(a) * R, z = Math.sin(a) * R; for (const s of [-1, 1]) C(x + Math.cos(a + Math.PI / 2) * s * 7, z + Math.sin(a + Math.PI / 2) * s * 7, 1.8, 18, marble); D(G.box(18, 3, 4), marble, x, 19, z, 0, -a + Math.PI / 2); }
    // broken pillars
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + 0.2; const rr = S * (0.35 + (i % 2) * 0.22); const x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (!W.free(x, z, 3)) continue; C(x, z, 1.6, 6 + r() * 12, marble, { seg: 12 }); }
    B(0, 0, 4, 4, 3, marble, { nocol: false }); C(0, 0, 1.2, 22, marble, { rt: 0.2, seg: 4 });
    // floodlights
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5; const x = Math.cos(a) * (R + 30), z = Math.sin(a) * (R + 30); D(G.cyl(0.8, 1.2, 50, 8), mat('#3a3a3a', 0.5, 0.7), x, 25, z); D(G.box(10, 5, 1), glow('#fff4e0', 3), x, 52, z, 0, -a - Math.PI / 2); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: MW.tex.sprite('flare'), color: 0xfff0d0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.position.set(x, 52, z); s.scale.setScalar(40); W.group.add(s); }
    // stands crowd lights
    for (let i = 0; i < 120; i++) { const a = r() * Math.PI * 2, rr = R + 6 + r() * 22; I('crowd', G.box(0.6, 0.6, 0.6), glow(['#ffd27a', '#ff6a6a', '#7fdcff'][i % 3], 1.5), Math.cos(a) * rr, 16 + (rr - R) * 0.5, Math.sin(a) * rr, 0, 1); }
  },
  crystal(W, r) {
    const { C, D, mat, rock, scatter } = W.helpers; const S = W.S;
    const cols = ['#62f6ff', '#b866ff', '#ff4fc8'];
    scatter(28, 6, (x, z, k) => { const col = cols[k % 3]; const cm = mat(col, 0.1, 0.3, { emissive: col, emissiveIntensity: 0.9, transparent: true, opacity: 0.88 }); const h = 10 + r() * 22; C(x, z, 2 + r() * 2, h, cm, { rt: 0.2, seg: 6 }); for (let i = 0; i < 3; i++) { const a = r() * 6.28; D(G.cyl(0.1, 1.2, 6 + r() * 6, 6), cm, x + Math.cos(a) * 3, W.heightAt(x, z) + 3, z + Math.sin(a) * 3, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); } if (k % 4 === 0) W.dyn.push({ smoke: null }); });
    scatter(26, 5, (x, z) => rock(x, z, 3 + r() * 5, '#2a2440'));
    // arches
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.5; const x = Math.cos(a) * S * 0.35, z = Math.sin(a) * S * 0.35; if (!W.free(x, z, 10)) continue; const arch = new THREE.Mesh(new THREE.TorusGeometry(12, 2.5, 8, 16, Math.PI), mat('#2a2440', 0.9)); arch.position.set(x, W.heightAt(x, z) - 1, z); arch.rotation.y = a; W.group.add(arch); for (const s of [-1, 1]) W.helpers.addObs({ type: 'cyl', x: x + Math.cos(a) * 12 * s, z: z - Math.sin(a) * 12 * s, r: 2.6, h: 12, y0: W.heightAt(x, z) - 2, top: W.heightAt(x, z) + 10 }); }
    // giant central geode
    C(0, S * 0.25, 4, 30, mat('#ff4fc8', 0.1, 0.3, { emissive: '#ff4fc8', emissiveIntensity: 1.2 }), { rt: 0.5, seg: 6 });
  },
  rustyard(W, r) {
    const { B, C, D, mat, container, rock, scatter, wreck } = W.helpers; const S = W.S;
    // container maze
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const x = i * S * 0.24 + (r() - 0.5) * 8, z = j * S * 0.24 + (r() - 0.5) * 8; if (!W.free(x, z, 7) || r() < 0.25) continue; container(x, z, (r() < 0.5 ? 0 : Math.PI / 2), 1 + (r() * 3 | 0)); if (r() < 0.5 && W.free(x + 7, z, 6)) container(x + 7, z, 0, 1 + (r() * 2 | 0)); }
    scatter(14, 7, (x, z) => { for (let i = 0; i < 5; i++) rock(x + (r() - 0.5) * 8, z + (r() - 0.5) * 8, 2 + r() * 3, ['#6a4a2a', '#5a5a5a', '#8a5a3a'][i % 3], i === 0); });
    for (let i = 0; i < 5; i++) { const x = (r() - 0.5) * S * 1.4, z = (r() - 0.5) * S * 1.2; if (W.free(x, z, 6)) wreck(x, z, 1 + r() * 0.5); }
    // yard crane
    const x0 = S * 0.55, z0 = -S * 0.5; if (W.free(x0, z0, 4)) { C(x0, z0, 1.4, 34, mat('#c8862a', 0.6, 0.4)); D(G.box(40, 2, 2), mat('#c8862a', 0.6, 0.4), x0 - 14, 34, z0); D(G.box(0.2, 16, 0.2), mat('#222', 0.5, 0.6), x0 - 26, 26, z0); D(G.cyl(3, 3, 0.8, 12), mat('#3a3a3a', 0.5, 0.8), x0 - 26, 17.5, z0); }
  },
  neon(W, r) {
    const { B, D, mat, glow, building } = W.helpers; const S = W.S;
    const blk = S * 0.26; const signs = ['BROKER', 'RAMEN', 'NEXUS', 'MECHA', '24/7', 'HOTEL', 'BAR', 'DATA', 'KAIJU', 'ZERO'];
    const signCols = ['#ff2a8a', '#2af6ff', '#ffd02a', '#a05aff', '#5aff7a'];
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
      const x = i * blk, z = j * blk; if (!W.free(x, z, 9)) continue; if ((i + j) % 2 === 0 && Math.abs(i) < 2 && Math.abs(j) < 2) continue;
      const h = 18 + r() * 50; building(x, z, blk * 0.55, blk * 0.55, h, { col: '#2a2c34', winCol: ['#7fdcff', '#ff6ad5', '#ffd890'][(i + j + 9) % 3] });
      if (r() < 0.8) { const col = signCols[(r() * signCols.length) | 0]; const t = signs[(r() * signs.length) | 0]; const tex = MW.tex.label(t, col, '#05050a', 256, 64); const sm = new THREE.MeshBasicMaterial({ map: tex }); const side = r() < 0.5 ? 1 : -1; const sg = D(new THREE.PlaneGeometry(12, 3), sm, x + side * (blk * 0.275 + 0.1), W.heightAt(x, z) + 8 + r() * 10, z, 0, side * Math.PI / 2, 0); sg.castShadow = false; if (r() < 0.3) W.dyn.push({ blink: sg, f: 3 + r() * 6, ph: r() * 6 }); D(G.box(0.3, 3.4, 12.4), glow(col, 2), x + side * (blk * 0.275), sg.position.y, z); }
    }
    // street lights & puddle glows
    for (let i = -4; i <= 4; i++) for (const s of [-1, 1]) { const x = i * blk * 0.75, z = s * blk * 0.5; D(G.cyl(0.15, 0.2, 9, 6), mat('#222', 0.4, 0.8), x, 4.5, z); D(G.box(2, 0.3, 0.6), glow('#ffcf8a', 2.5), x, 9, z); }
    for (let i = 0; i < 30; i++) { const x = (r() - 0.5) * S * 1.6, z = (r() - 0.5) * S * 1.6; const p = new THREE.Mesh(new THREE.CircleGeometry(2 + r() * 3, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(signCols[i % 5]).multiplyScalar(0.25), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.05, z); W.group.add(p); }
    // walls of the district
    for (const s of [-1, 1]) { B(0, s * S * 0.99, S * 2, 3, 60, mat('#1a1c22', 0.8), { y0: -1 }); B(s * S * 0.99, 0, 3, S * 2, 60, mat('#1a1c22', 0.8), { y0: -1 }); }
  },
  snow(W, r) {
    const { pine, rock, scatter, B, D, mat, C } = W.helpers; const S = W.S;
    scatter(220, 3, (x, z) => { const h = W.heightAt(x, z); if (h < 0.3) return; pine(x, z, 1 + r() * 0.8, r() < 0.5 ? '#2a4a3a' : '#e8eef4'); });
    scatter(40, 4, (x, z) => rock(x, z, 2 + r() * 4, '#6a7480'));
    // cabins and a radio station
    for (let i = 0; i < 6; i++) { const x = (r() - 0.5) * S * 1.3, z = (r() - 0.5) * S * 1.3; if (!W.free(x, z, 8)) continue; const y0 = B(x, z, 10, 8, 5, mat('#5a3a24', 0.9)); D(new THREE.CylinderGeometry(0, 7.5, 4, 4), mat('#f0f4f8', 0.8), x, y0 + 7, z, 0, Math.PI / 4, 0, 1, 1, 0.8); }
    const x = S * 0.45, z = S * 0.35; if (W.free(x, z, 6)) { C(x, z, 1, 40, mat('#c83a2a', 0.6, 0.4), { rt: 0.3, seg: 4 }); D(G.cyl(4, 4, 0.5, 16), mat('#ddd', 0.4, 0.6), x, W.heightAt(x, z) + 20, z, 1.2); }
  },
  canyon(W, r) {
    const { rock, scatter, B, C, D, mat, wreck } = W.helpers; const S = W.S;
    scatter(60, 4, (x, z) => rock(x, z, 2 + r() * 5, '#9a4a2a'));
    // hoodoo spires
    scatter(14, 4, (x, z) => { const h = 10 + r() * 16; C(x, z, 2 + r() * 1.5, h, mat('#b8643a', 0.95), { rt: 1.2, seg: 7 }); D(G.cyl(3.2, 2.2, 2, 7), mat('#8a4428', 0.95), x, W.heightAt(x, z) + h - 0.5, z); });
    // mining outpost
    const x0 = -S * 0.45, z0 = S * 0.4; if (W.free(x0, z0, 12)) { B(x0, z0, 18, 10, 7, mat('#8a8070', 0.8, 0.3)); C(x0 + 14, z0, 4, 12, mat('#6a6a6a', 0.5, 0.7)); D(G.box(2, 2, 30), mat('#5a4a3a', 0.9), x0, W.heightAt(x0, z0) + 6, z0 - 20, 0.2); }
    wreck(S * 0.3, -S * 0.15, 1.3);
    // bridge over the riverbed
    D(G.box(12, 1.2, 60), mat('#6a5a4a', 0.9), Math.sin(0) * S * 0.25, 9, 0, 0, 0.3);
  },
  jungle(W, r) {
    const { leafy, rock, scatter, B, C, D, mat, I } = W.helpers; const S = W.S;
    const stone = mat('#7a7a62', 0.95), moss = mat('#4a5a32', 0.95);
    // stepped pyramid in the centre-north
    const px = 0, pz = S * 0.32; for (let i = 0; i < 6; i++) { const w = 44 - i * 7; B(px, pz, w, w, 4, i % 2 ? moss : stone, { y0: W.heightAt(px, pz) - 2 + i * 4, nocol: i > 0 }); } const o = W.obstacles[W.obstacles.length - 1]; void o;
    W.helpers.addObs({ type: 'box', x: px, z: pz, w: 44, d: 44, h: 22, y0: W.heightAt(px, pz) - 2, top: W.heightAt(px, pz) + 20, rot: 0, c: 1, s: 0 });
    D(G.box(8, 30, 1), stone, px, W.heightAt(px, pz) + 10, pz - 22, -0.6);
    // temple ruins columns & walls
    scatter(30, 3, (x, z) => { if (r() < 0.5) C(x, z, 1.4, 5 + r() * 9, stone, { seg: 8 }); else B(x, z, 8 + r() * 6, 1.6, 3 + r() * 4, moss, { rot: r() * 3 }); });
    scatter(240, 2.5, (x, z) => leafy(x, z, 1 + r() * 0.9, ['#2a5a1e', '#3a6a22', '#1e4a1a'][(r() * 3) | 0]));
    scatter(300, 0, (x, z) => I('fern', new THREE.ConeGeometry(1, 1.4, 5), mat('#2e5a1e', 0.9), x, W.heightAt(x, z) + 0.6, z, r() * 6, 1 + r(), 1));
    scatter(20, 3, (x, z) => rock(x, z, 2 + r() * 3, '#4a4a3a'));
  },
  harbor(W, r) {
    const { B, C, D, mat, container, scatter, building } = W.helpers; const S = W.S;
    const concrete = mat('#7a7a76', 0.85);
    // docks
    for (let i = -2; i <= 2; i++) { B(S * 0.72, i * S * 0.35, S * 0.36, 14, 2.4, concrete, { y0: -1.2 }); }
    // container stacks
    for (let i = 0; i < 26; i++) { const x = -S * 0.6 + r() * S * 1.1, z = (r() - 0.5) * S * 1.7; if (!W.free(x, z, 6)) continue; container(x, z, r() < 0.7 ? 0 : Math.PI / 2, 1 + (r() * 4 | 0)); }
    // gantry cranes along the quay
    for (const z of [-S * 0.5, 0.05 * S, S * 0.55]) { const x = S * 0.52; if (!W.free(x, z, 6)) continue; for (const s of [-1, 1]) for (const t of [-1, 1]) C(x + s * 6, z + t * 7, 0.9, 30, mat('#c8402a', 0.6, 0.4)); D(G.box(14, 3, 40), mat('#c8402a', 0.6, 0.4), x + 4, 31, z, 0, Math.PI / 2); D(G.box(4, 4, 6), mat('#2a2a2a', 0.5, 0.6), x + 12, 28, z); }
    // beached cargo ship
    const sx = S * 0.95, sz = -S * 0.15; B(sx, sz, 22, 110, 14, mat('#3a4a5a', 0.7, 0.5), { y0: -6, rot: 0.15 }); D(G.box(18, 14, 18), mat('#e8e8e8', 0.6), sx - 1, 14, sz + 40, 0, 0.15); D(G.cyl(2.5, 2.5, 10, 12), mat('#c8402a', 0.6), sx, 26, sz + 40);
    // warehouses
    for (let i = 0; i < 4; i++) { const x = -S * 0.75, z = -S * 0.45 + i * S * 0.3; if (W.free(x, z, 10)) building(x, z, 26, 18, 12, { col: '#5a6a7a', lit: 0.05 }); }
    // lighthouse
    C(S * 0.8, S * 0.88, 3, 34, mat('#f0f0f0', 0.6), { rt: 2.2 }); D(G.cyl(2.6, 2.6, 4, 12), W.helpers.glow('#ffeeaa', 2), S * 0.8, 36, S * 0.88);
  },
  volcano(W, r) {
    const { rock, scatter, B, C, D, mat, glow, wreck } = W.helpers; const S = W.S;
    scatter(70, 4, (x, z) => { if (W.heightAt(x, z) < W.lava + 1) return; rock(x, z, 2 + r() * 6, r() < 0.3 ? '#3a1a10' : '#1e1a18'); });
    // obsidian pillars with glowing cracks
    scatter(16, 4, (x, z) => { if (W.heightAt(x, z) < W.lava + 1) return; const h = 12 + r() * 14; C(x, z, 2.5, h, mat('#0e0c0c', 0.15, 0.6), { rt: 0.8, seg: 5 }); D(G.box(0.3, h * 0.6, 0.3), glow('#ff4a12', 2), x + 1.3, W.heightAt(x, z) + h * 0.4, z); });
    // research station
    const x0 = -S * 0.5, z0 = -S * 0.45; if (W.free(x0, z0, 10)) { B(x0, z0, 16, 12, 8, mat('#8a8a8a', 0.6, 0.6)); C(x0 + 12, z0, 3, 16, mat('#aaa', 0.5, 0.7), { rt: 1 }); }
    wreck(S * 0.4, S * 0.4, 1.2); wreck(-S * 0.3, S * 0.15, 1);
    for (let i = 0; i < 14; i++) { const x = (r() - 0.5) * S * 1.6, z = (r() - 0.5) * S * 1.6; if (W.heightAt(x, z) < W.lava + 0.3) W.dyn.push({ fire: new THREE.Vector3(x, W.lava + 0.5, z), rate: 0.4, big: 2.5 }); }
  },
  moon(W, r) {
    const { B, C, D, mat, glow, rock, scatter } = W.helpers; const S = W.S;
    const white = mat('#e8e8ec', 0.5, 0.3), panel = mat('#1a2a5a', 0.2, 0.8);
    // habitat domes
    for (const [x, z, R] of [[-S * 0.45, -S * 0.4, 14], [S * 0.45, S * 0.4, 14], [S * 0.5, -S * 0.5, 9], [-S * 0.5, S * 0.5, 9], [0, -S * 0.42, 10], [0, S * 0.42, 10]]) { if (!W.free(x, z, R)) continue; const y = W.heightAt(x, z); D(new THREE.SphereGeometry(R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), white, x, y - 1, z); D(new THREE.TorusGeometry(R, 0.5, 6, 32), glow('#62f6ff', 1.2), x, y, z, Math.PI / 2); W.helpers.addObs({ type: 'cyl', x, z, r: R * 0.92, h: R, y0: y - 2, top: y + R * 0.7 }); }
    // tunnels between domes
    D(G.cyl(3, 3, S * 0.4, 12), white, -S * 0.22, W.heightAt(-S * 0.22, -S * 0.41) + 2, -S * 0.41, 0, 0, Math.PI / 2);
    // radar dish
    const dx = -S * 0.15, dz = S * 0.15; if (W.free(dx, dz, 6)) { C(dx, dz, 2, 14, white); const dish = D(new THREE.SphereGeometry(10, 20, 8, 0, Math.PI * 2, 0, 0.9), white, dx, W.heightAt(dx, dz) + 18, dz, -0.9); dish.material = white; }
    // solar arrays
    for (let i = 0; i < 10; i++) { const x = S * 0.2 + (i % 5) * 9, z = -S * 0.2 + Math.floor(i / 5) * 12; if (!W.free(x, z, 3)) continue; B(x, z, 7, 4, 0.3, panel, { y0: W.heightAt(x, z) + 3, nocol: true }); D(G.cyl(0.2, 0.2, 3, 6), white, x, W.heightAt(x, z) + 1.5, z); }
    scatter(70, 3, (x, z) => rock(x, z, 1.5 + r() * 4, '#5a5a5c'));
    // lunar lander
    D(G.box(6, 4, 6), mat('#d8b040', 0.4, 0.8), S * 0.1, W.heightAt(S * 0.1, -S * 0.1) + 4, -S * 0.1); for (let i = 0; i < 4; i++) D(G.cyl(0.15, 0.15, 5, 4), white, S * 0.1 + Math.cos(i * 1.57 + 0.78) * 4, W.heightAt(S * 0.1, -S * 0.1) + 2, -S * 0.1 + Math.sin(i * 1.57 + 0.78) * 4, 0.4 * Math.sin(i * 1.57), 0, 0.4 * Math.cos(i * 1.57));
  },
  swamp(W, r) {
    const { deadTree, B, C, D, mat, scatter, I, wreck } = W.helpers; const S = W.S;
    scatter(160, 3, (x, z) => deadTree(x, z, 0.9 + r() * 0.9, '#2a2418'));
    scatter(200, 0, (x, z) => { if (W.heightAt(x, z) > W.water + 0.2) I('reed', new THREE.ConeGeometry(0.3, 2.5, 4), mat('#5a5a2a', 0.9), x, W.heightAt(x, z) + 1.2, z, r() * 6, 1, 1); });
    // stilt shacks
    for (let i = 0; i < 9; i++) { const x = (r() - 0.5) * S * 1.5, z = (r() - 0.5) * S * 1.5; if (!W.free(x, z, 7)) continue; const y = Math.max(W.water, W.heightAt(x, z)) + 4; B(x, z, 10, 8, 5, mat('#4a3a28', 0.95), { y0: y }); W.helpers.addObs({ type: 'box', x, z, w: 10, d: 8, h: y + 5, y0: W.heightAt(x, z) - 1, top: y + 5, rot: 0, c: 1, s: 0 }); for (let k = 0; k < 4; k++) D(G.cyl(0.3, 0.3, y - W.heightAt(x, z) + 1, 5), mat('#3a2a1a', 0.9), x + (k % 2 ? 4 : -4), (y + W.heightAt(x, z)) / 2, z + (k < 2 ? 3 : -3)); }
    wreck(S * 0.2, S * 0.3, 1.1); wreck(-S * 0.35, -S * 0.2, 1);
    // boardwalks
    for (let i = 0; i < 6; i++) D(G.box(3, 0.4, 30), mat('#5a4a32', 0.9), (r() - 0.5) * S, W.water + 0.4, (r() - 0.5) * S, 0, r() * 3);
  },
  refinery(W, r) {
    const { B, C, D, mat, glow, scatter } = W.helpers; const S = W.S;
    const tankM = mat('#c8c8c0', 0.5, 0.5), pipeM = mat('#8a8a84', 0.5, 0.7), rust = mat('#7a4a2a', 0.8, 0.4);
    // tank farm
    for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) { const x = i * S * 0.3 + S * 0.05, z = j * S * 0.55 + (i % 2) * S * 0.12; if (!W.free(x, z, 12)) continue; const R = 8 + r() * 5; C(x, z, R, 10 + r() * 8, tankM, { seg: 24 }); D(G.tor(R, 0.3, 4, 24), rust, x, W.heightAt(x, z) + 4, z, Math.PI / 2); }
    // pipe racks
    for (let k = 0; k < 6; k++) { const x = (r() - 0.5) * S * 1.4, z = (r() - 0.5) * S * 1.4; if (!W.free(x, z, 10)) continue; const rot = r() < 0.5 ? 0 : Math.PI / 2; B(x, z, 40, 4, 9, pipeM, { rot, nomesh: true }); for (let p = 0; p < 3; p++) D(G.cyl(0.8, 0.8, 40, 10), p === 1 ? rust : pipeM, x, W.heightAt(x, z) + 3 + p * 2.2, z, 0, rot, Math.PI / 2); for (let s = -2; s <= 2; s++) D(G.box(1, 9, 4), mat('#4a4a4a', 0.6, 0.6), x + (rot ? 0 : s * 9), W.heightAt(x, z) + 4.5, z + (rot ? s * 9 : 0), 0, rot); }
    // flare stacks
    for (const [x, z] of [[-S * 0.75, S * 0.1], [S * 0.75, -S * 0.1]]) { C(x, z, 1.4, 50, mat('#9a3a2a', 0.6, 0.5), { rt: 0.8 }); W.dyn.push({ fire: new THREE.Vector3(x, W.heightAt(x, z) + 51, z), rate: 8, big: 3.5 }); }
    // cooling towers
    for (const [x, z] of [[-S * 0.65, -S * 0.55], [S * 0.65, S * 0.55]]) { if (!W.free(x, z, 14)) continue; const g = new THREE.LatheGeometry([0, 0.15, 0.35, 0.55, 0.75, 1].map((t, i) => new THREE.Vector2(14 - Math.sin(t * Math.PI) * 4.5, t * 40)), 24); D(g, mat('#b8b4ac', 0.9), x, W.heightAt(x, z) - 1, z); W.helpers.addObs({ type: 'cyl', x, z, r: 13, h: 40, y0: W.heightAt(x, z) - 1, top: W.heightAt(x, z) + 39 }); W.dyn.push({ smoke: new THREE.Vector3(x, W.heightAt(x, z) + 40, z), rate: 2, big: 6 }); }
    scatter(12, 3, (x, z) => B(x, z, 3, 3, 3, mat('#3a5a8a', 0.6, 0.4)));
  },
  salt(W, r) {
    const { rock, scatter, B, C, D, mat, wreck } = W.helpers; const S = W.S;
    scatter(16, 8, (x, z) => { const h = 5 + r() * 12; C(x, z, 4 + r() * 5, h, mat('#a8a49a', 0.9), { rt: 2 + r() * 3, seg: 7 }); });
    scatter(30, 3, (x, z) => rock(x, z, 1.5 + r() * 3, '#8a8880'));
    // abandoned speed-record camp
    B(-S * 0.3, S * 0.3, 14, 6, 4, mat('#c8c0b0', 0.8)); B(S * 0.3, -S * 0.3, 14, 6, 4, mat('#c8c0b0', 0.8));
    wreck(S * 0.05, S * 0.35, 1.4); wreck(-S * 0.25, -S * 0.25, 1);
    // lightning rods
    for (let i = 0; i < 6; i++) { const x = (r() - 0.5) * S * 1.4, z = (r() - 0.5) * S * 1.4; if (W.free(x, z, 3)) C(x, z, 0.5, 26, mat('#4a4a4a', 0.4, 0.9), { rt: 0.1, seg: 6 }); }
  },
  mars(W, r) {
    const { B, C, D, mat, glow, rock, scatter } = W.helpers; const S = W.S;
    const white = mat('#e0dcd4', 0.6, 0.3), panel = mat('#1a2a4a', 0.2, 0.8);
    // habitat modules (lying cylinders) and domes
    for (let i = 0; i < 9; i++) { const x = (r() - 0.5) * S * 1.4, z = (r() - 0.5) * S * 1.4; if (!W.free(x, z, 12)) continue; const rot = r() * Math.PI; const y = W.heightAt(x, z); D(G.cyl(4, 4, 18, 16), white, x, y + 3.6, z, 0, rot, Math.PI / 2); B(x, z, 18, 8, 7.5, white, { rot, nomesh: true }); D(G.box(0.3, 0.6, 18.2), glow('#ff9a3a', 1.5), x, y + 7, z, 0, rot + Math.PI / 2); }
    for (const [x, z] of [[-S * 0.35, S * 0.55], [S * 0.35, -S * 0.55]]) { if (!W.free(x, z, 16)) continue; const y = W.heightAt(x, z); D(new THREE.SphereGeometry(16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#a8d8ff', 0.1, 0.5, { transparent: true, opacity: 0.55 }), x, y - 1, z); W.helpers.addObs({ type: 'cyl', x, z, r: 15, h: 14, y0: y - 2, top: y + 12 }); }
    // solar farms
    for (let i = 0; i < 18; i++) { const x = -S * 0.2 + (i % 6) * 9, z = S * 0.2 + Math.floor(i / 6) * 9; if (!W.free(x, z, 3)) continue; D(G.box(7, 0.25, 4), panel, x, W.heightAt(x, z) + 2.5, z, -0.4); }
    // rover and rocket
    const rx = S * 0.5, rz = S * 0.1; if (W.free(rx, rz, 5)) { B(rx, rz, 6, 9, 3, white); for (let i = 0; i < 6; i++) D(G.cyl(1, 1, 0.8, 12), mat('#2a2a2a', 0.9), rx + (i % 2 ? 3.4 : -3.4), W.heightAt(rx, rz) + 1, rz - 3 + (i >> 1) * 3, 0, 0, Math.PI / 2); }
    const kx = -S * 0.6, kz = -S * 0.1; if (W.free(kx, kz, 6)) { C(kx, kz, 4, 34, white, { seg: 16 }); D(new THREE.ConeGeometry(4, 8, 16), white, kx, W.heightAt(kx, kz) + 37, kz); }
    scatter(80, 3, (x, z) => rock(x, z, 1.5 + r() * 4, '#6a2e16'));
  },
  glacier(W, r) {
    const { C, D, mat, rock, scatter, B } = W.helpers; const S = W.S;
    const ice = mat('#a8d8ff', 0.08, 0.1, { emissive: '#2a6aa8', emissiveIntensity: 0.25, transparent: true, opacity: 0.9 });
    scatter(40, 5, (x, z) => { const h = 10 + r() * 25; C(x, z, 3 + r() * 3, h, ice, { rt: 0.3, seg: 6 }); });
    scatter(30, 6, (x, z) => B(x, z, 8 + r() * 10, 6 + r() * 8, 3 + r() * 5, mat('#d8ecfa', 0.4), { rot: r() * 3, bevel: 1 }));
    scatter(30, 3, (x, z) => rock(x, z, 2 + r() * 3, '#4a5a6a'));
    // research outpost
    const x = -S * 0.5, z = S * 0.3; if (W.free(x, z, 10)) { B(x, z, 14, 10, 6, mat('#c83a2a', 0.6, 0.4)); C(x + 10, z, 0.4, 20, mat('#888', 0.4, 0.8), { rt: 0.1 }); }
  },
  city(W, r) {
    const { B, C, D, mat, glow, building, scatter, wreck } = W.helpers; const S = W.S;
    const blk = S * 0.18;
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
      const x = i * blk, z = j * blk; if (!W.free(x, z, blk * 0.35)) continue; if (r() < 0.12) continue;
      const w = blk * (0.45 + r() * 0.2), d = blk * (0.45 + r() * 0.2);
      if (r() < 0.25) { // rubble mound
        for (let k = 0; k < 5; k++) D(G.box(4 + r() * 6, 2 + r() * 3, 4 + r() * 6), mat('#5a5a58', 0.95), x + (r() - 0.5) * w, W.heightAt(x, z) + 1, z + (r() - 0.5) * d, r(), r() * 3, r());
        W.helpers.addObs({ type: 'cyl', x, z, r: w * 0.4, h: 5, y0: W.heightAt(x, z) - 1, top: W.heightAt(x, z) + 4 });
        continue;
      }
      const h = 14 + r() * (Math.abs(i) + Math.abs(j) < 4 ? 30 : 70);
      const y0 = building(x, z, w, d, h, { col: ['#6a6e74', '#7a746a', '#5a6068', '#8a8478'][(r() * 4) | 0], lit: 0.04 });
      if (r() < 0.5) { // broken crown
        for (let k = 0; k < 4; k++) D(G.box(w * 0.3, 2 + r() * 6, d * 0.3), mat('#5a5a5a', 0.9), x + (r() - 0.5) * w * 0.6, y0 + h + 2, z + (r() - 0.5) * d * 0.6, r() * 0.5, 0, r() * 0.5);
        W.dyn.push({ smoke: new THREE.Vector3(x, y0 + h + 2, z), rate: 0.4, big: 3 });
      }
    }
    // burning cars & barricades
    scatter(30, 2, (x, z) => { B(x, z, 2.2, 4.6, 1.6, mat(['#5a2a2a', '#2a3a5a', '#3a3a3a'][(r() * 3) | 0], 0.6, 0.5), { rot: r() * 3 }); if (r() < 0.3) W.dyn.push({ fire: new THREE.Vector3(x, W.heightAt(x, z) + 1.8, z), rate: 0.6, big: 1.5 }); });
    scatter(16, 2, (x, z) => { for (let k = -1; k <= 1; k++) D(G.box(1.2, 1.2, 1.2), mat('#6a6a6a', 0.8, 0.6), x + k * 1.3, W.heightAt(x, z) + 0.6, z, 0, 0.78, 0.95); W.helpers.addObs({ type: 'box', x, z, w: 4, d: 1.4, h: 1.6, y0: W.heightAt(x, z) - 1, top: W.heightAt(x, z) + 1.4, rot: 0, c: 1, s: 0 }); });
    for (let i = 0; i < 4; i++) { const x = (r() - 0.5) * S * 1.4, z = (r() - 0.5) * S * 1.4; if (W.free(x, z, 6)) wreck(x, z, 1.3); }
    // elevated highway segment
    for (let k = -6; k <= 6; k++) { const x = k * 14, z = -S * 0.35; if (W.free(x, z, 3)) C(x, z, 1.4, 12, mat('#7a7a76', 0.9)); }
    D(G.box(200, 1.5, 14), mat('#6a6a66', 0.9), 0, 12.7, -S * 0.35);
  },
  forest(W, r) {
    const { C, D, mat, scatter, I, B, rock, pine } = W.helpers; const S = W.S;
    const bark = mat('#5a3424', 0.95);
    // giant redwoods
    scatter(70, 6, (x, z) => { const R = 2 + r() * 2.2, h = 55 + r() * 30; C(x, z, R, h, bark, { rt: R * 0.55, seg: 10 }); const y = W.heightAt(x, z); for (let i = 0; i < 4; i++) I('crown', new THREE.IcosahedronGeometry(1, 1), mat('#2a4a22', 0.9), x + (r() - 0.5) * 6, y + h * (0.65 + i * 0.1), z + (r() - 0.5) * 6, r() * 6, 7 + r() * 5, 5 + r() * 2); });
    scatter(160, 3, (x, z) => pine(x, z, 1 + r() * 0.8, '#2a4a2a'));
    scatter(500, 0, (x, z) => I('fern', new THREE.ConeGeometry(1.2, 1.2, 5), mat('#3a6a2a', 0.9), x, W.heightAt(x, z) + 0.5, z, r() * 6, 1 + r(), 0.8));
    scatter(30, 3, (x, z) => rock(x, z, 2 + r() * 3, '#5a5a4a'));
    // logging camps
    for (let i = 0; i < 4; i++) { const x = (r() - 0.5) * S * 1.4, z = (r() - 0.5) * S * 1.4; if (!W.free(x, z, 12)) continue; B(x, z, 14, 10, 6, mat('#6a4a2a', 0.9)); for (let k = 0; k < 6; k++) D(G.cyl(1, 1, 16, 8), bark, x + 12, W.heightAt(x, z) + 1 + (k % 3) * 1.9, z - 3 + Math.floor(k / 3) * 2, 0, 0, Math.PI / 2); W.helpers.addObs({ type: 'box', x: x + 12, z, w: 16, d: 6, h: 6, y0: W.heightAt(x, z) - 1, top: W.heightAt(x, z) + 5, rot: 0, c: 1, s: 0 }); }
    // fallen giant
    D(G.cyl(3, 3.5, 70, 10), bark, S * 0.25, W.heightAt(S * 0.25, -S * 0.2) + 2.5, -S * 0.2, 0, 0.6, Math.PI / 2);
    W.helpers.addObs({ type: 'box', x: S * 0.25, z: -S * 0.2, w: 70, d: 6.5, h: 6, y0: W.heightAt(S * 0.25, -S * 0.2) - 1, top: W.heightAt(S * 0.25, -S * 0.2) + 5.5, rot: 0.6, c: Math.cos(0.6), s: Math.sin(0.6) });
  },
  spaceport(W, r) {
    const { B, C, D, mat, glow, scatter, building } = W.helpers; const S = W.S;
    const conc = mat('#9a9a94', 0.85), white = mat('#ecece8', 0.5, 0.3), steel = mat('#6a6e74', 0.5, 0.7), orange = mat('#e86a1a', 0.6, 0.3);
    // launch tower and rocket
    const lx = S * 0.4, lz = S * 0.05;
    B(lx, lz, 50, 50, 1.2, conc, { y0: W.heightAt(lx, lz) - 0.2, nocol: true });
    C(lx, lz, 5, 70, white, { seg: 20 }); D(new THREE.ConeGeometry(5, 14, 20), white, lx, W.heightAt(lx, lz) + 77, lz); D(G.cyl(5.05, 5.05, 8, 20), orange, lx, W.heightAt(lx, lz) + 40, lz);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; C(lx + Math.cos(a) * 7, lz + Math.sin(a) * 7, 2, 18, white, { seg: 12, rt: 1.6 }); D(new THREE.ConeGeometry(2, 4, 12), white, lx + Math.cos(a) * 7, W.heightAt(lx, lz) + 20, lz + Math.sin(a) * 7); }
    B(lx + 12, lz, 5, 5, 80, steel, {}); for (let k = 0; k < 8; k++) D(G.box(10, 0.6, 1), steel, lx + 8, W.heightAt(lx, lz) + 10 + k * 9, lz, 0, 0, 0);
    // hangars
    for (const [x, z] of [[-S * 0.45, -S * 0.3], [-S * 0.45, S * 0.3], [S * 0.15, -S * 0.55]]) { if (!W.free(x, z, 20)) continue; const y = W.heightAt(x, z); const h = new THREE.CylinderGeometry(14, 14, 40, 20, 1, false, 0, Math.PI); D(h, mat('#b8bcc0', 0.5, 0.6), x, y, z, 0, 0, Math.PI / 2); D(new THREE.CircleGeometry(14, 20, 0, Math.PI), mat('#3a3e44', 0.6), x + 20, y, z, 0, Math.PI / 2, 0); W.helpers.addObs({ type: 'box', x, z, w: 40, d: 28, h: 14, y0: y - 1, top: y + 13, rot: 0, c: 1, s: 0 }); }
    // control tower
    const tx = -S * 0.15, tz = S * 0.55; if (W.free(tx, tz, 6)) { C(tx, tz, 3, 40, white, { seg: 12 }); D(G.cyl(7, 5, 6, 12), mat('#3a6aa8', 0.1, 0.8), tx, W.heightAt(tx, tz) + 43, tz); }
    // fuel tanks and landing pads
    for (let i = 0; i < 4; i++) { const x = S * 0.7, z = -S * 0.6 + i * 14; if (W.free(x, z, 6)) C(x, z, 5, 14, white, { seg: 20 }); }
    for (const [x, z] of [[-S * 0.1, -S * 0.1], [S * 0.15, S * 0.4], [-S * 0.6, 0]]) { const p = new THREE.Mesh(new THREE.RingGeometry(8, 10, 32), glow('#ffd02a', 1)); p.rotation.x = -Math.PI / 2; p.position.set(x, W.heightAt(x, z) + 0.1, z); W.group.add(p); }
    scatter(24, 3, (x, z) => B(x, z, 3, 3, 2.5, mat('#4a5a3a', 0.8)));
    W.dyn.push({ smoke: new THREE.Vector3(lx, W.heightAt(lx, lz) + 2, lz + 10), rate: 0.8, big: 4 });
  },
  toxic(W, r) {
    const { C, D, B, mat, glow, deadTree, scatter, rock, wreck, addObs } = W.helpers; const S = W.S;
    const bone = mat('#cfc8b0', 0.8, 0.2), metalBone = mat('#5a5a50', 0.6, 0.7);
    // colossal fallen mech skeleton: ribcage, spine, skull
    const cx = -S * 0.05, cz = S * 0.05; const y = W.heightAt(cx, cz);
    for (let i = 0; i < 9; i++) { const z = cz - 50 + i * 12; for (const s of [-1, 1]) { const rib = new THREE.Mesh(new THREE.TorusGeometry(18, 1.8, 6, 12, Math.PI * 0.6), i % 2 ? bone : metalBone); rib.position.set(cx + s * 2, y - 2, z); rib.rotation.set(0, Math.PI / 2, s > 0 ? 0.3 : Math.PI - 0.3); rib.castShadow = true; W.group.add(rib); addObs({ type: 'cyl', x: cx + s * 18, z, r: 2.2, h: 14, y0: y - 2, top: y + 10 }); } }
    D(G.cyl(3, 3, 120, 10), metalBone, cx, y + 1, cz - 2, Math.PI / 2, 0, 0); addObs({ type: 'box', x: cx, z: cz - 2, w: 6, d: 120, h: 4, y0: y - 2, top: y + 3, rot: 0, c: 1, s: 0 });
    const sk = new THREE.Group(); sk.position.set(cx, y + 6, cz + 70); W.group.add(sk);
    const skm = new THREE.Mesh(G.bbox(22, 14, 20, 2), metalBone); sk.add(skm); const vis = new THREE.Mesh(G.box(18, 3, 1), glow('#6aff2a', 1.5)); vis.position.set(0, 1, 10.5); sk.add(vis); sk.rotation.set(0.25, 0.3, 0.2);
    addObs({ type: 'cyl', x: cx, z: cz + 70, r: 12, h: 18, y0: y - 2, top: y + 14 });
    // giant arm
    D(G.bbox(10, 10, 50, 1), metalBone, cx + S * 0.45, W.heightAt(cx + S * 0.45, cz - S * 0.3) + 3, cz - S * 0.3, 0.1, 0.8, 0.2);
    addObs({ type: 'box', x: cx + S * 0.45, z: cz - S * 0.3, w: 10, d: 50, h: 10, y0: y - 3, top: W.heightAt(cx + S * 0.45, cz - S * 0.3) + 8, rot: 0.8, c: Math.cos(0.8), s: Math.sin(0.8) });
    scatter(90, 3, (x, z) => deadTree(x, z, 0.9 + r(), '#2a2a1a'));
    scatter(40, 3, (x, z) => rock(x, z, 2 + r() * 4, '#3a3a22'));
    for (let i = 0; i < 4; i++) { const x = (r() - 0.5) * S * 1.4, z = (r() - 0.5) * S * 1.4; if (W.free(x, z, 6)) wreck(x, z, 1.2); }
    // barrels
    scatter(30, 2, (x, z) => { C(x, z, 0.8, 2, mat('#c8a02a', 0.6, 0.4), { seg: 10 }); });
  },
};
})();
