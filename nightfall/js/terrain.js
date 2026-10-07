// Ashgrove County: a 6 km x 6 km open world streamed in 128 m chunks around the player.
var NF = window.NF || (window.NF = {});
NF.terrain = (function () {
  var T = { ready: false, CH: 128, S: 40, HALF: 8192, LIMIT: 8150, chunks: {}, lamps: [], pois: [], roads: [] };
  T.NCH = T.HALF / T.CH;
  var scene, W, Mo, std, V3 = THREE.Vector3;
  var CH = T.CH, S = T.S;
  // ------------------------------------------------------------------ noise
  function hash(ix, iz) { var n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16; return (n >>> 0) / 4294967295; }
  function vnoise(x, z) {
    var ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
    var a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    return (a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz) * 2 - 1;
  }
  function fbm(x, z, o) { var s = 0, a = 1, f = 1, n = 0; for (var i = 0; i < (o || 4); i++) { s += vnoise(x * f + i * 17.3, z * f - i * 9.1) * a; n += a; a *= 0.5; f *= 2.03; } return s / n; }
  T.fbm = fbm;
  function rng(seed) { var a = seed >>> 0; return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  T.rng = rng;
  function sstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  // --------------------------------------------------------------- the map
  var P = function (id, name, x, z, r, o) { var p = { id: id, name: name, x: x, z: z, r: r }; for (var k in o) p[k] = o[k]; return p; };
  T.pois = [
    P('manor', 'Ashgrove Manor', 0, 36, 64, { h: -0.06, flat: true }),
    P('gas1', 'Route 9 Gas & Diner', 200, 455, 36, { flat: true }),
    P('town', 'Halverson Falls', 420, 820, 205, { flat: true }),
    P('relay', 'Crow Ridge Relay', 1650, 420, 46, { flat: true, hill: 75 }),
    P('church', 'St. Agnes Church', 1150, 1480, 78, { flat: true }),
    P('gas2', 'Pike Road Gas', 1480, 1080, 32, { flat: true }),
    P('airfield', 'Halverson County Airfield', 2150, 2330, 250, { flat: true }),
    P('millbrook', 'Millbrook', -950, 1250, 140, { flat: true }),
    P('harlan', 'Harlan Farm', -720, 300, 85, { flat: true }),
    P('odell', 'Odell Farm', 900, 190, 72, { flat: true }),
    P('camp', 'Pinecrest Campground', -1600, -820, 55, { flat: true }),
    P('quarry', 'Ashgrove Quarry', 1320, -700, 95, { pit: true }),
    P('lake', 'Blackwater Reservoir', -520, 2320, 270, { lake: true }),
    P('dam', 'Blackwater Dam', -520, 2050, 40, { flat: true }),
    P('fieldlab', 'Velgen Field Station', 2380, -1480, 70, { flat: true }),
    P('ranger', 'Ranger Lookout', -2100, 600, 30, { flat: true, hill: 60 }),
    P('mine', 'Old Copper Mine', -2300, 2100, 45, { flat: true }),
    // the wider county
    P('granite', 'Granite Falls', 4800, 3200, 230, { flat: true }),
    P('truckstop', 'Route 9 Truck Stop', 3600, 600, 60, { flat: true }),
    P('campus', 'Velgen Corporate Campus', 6200, -1800, 230, { flat: true }),
    P('windfarm', 'Copper Hills Wind Farm', 5200, -4800, 260, {}),
    P('prison', 'Saltmarsh Penitentiary', 2600, -6000, 170, { flat: true }),
    P('fort', 'Fort Halvers', -1500, -5200, 250, { flat: true }),
    P('railyard', 'Ashgrove Rail Yard', -2800, -1800, 170, { flat: true }),
    P('bayou', 'Blackroot Bayou', -5200, -3200, 430, { lake: true, bayou: true }),
    P('coldcreek', 'Cold Creek', -4600, 5200, 170, { flat: true }),
    P('lodge', 'Kessler Pass Lodge', 1200, 6600, 75, { flat: true, hill: 150 }),
    P('observatory', 'Echo Ridge Observatory', -6400, 1600, 45, { flat: true, hill: 130 }),
    P('halloran', 'Lake Halloran', 3200, 5400, 460, { lake: true }),
    P('logging', 'Pine Hollow Logging Camp', -2400, 7000, 90, { flat: true })
  ];
  T.lakes = T.pois.filter(function (p) { return p.lake; });
  function poi(id) { for (var i = 0; i < T.pois.length; i++) if (T.pois[i].id === id) return T.pois[i]; }
  T.poi = poi;
  var ROADS = [
    [[0, 76], [60, 200], [200, 455], [420, 640]],
    [[420, 640], [420, 1010]],
    [[420, 1010], [800, 1170], [1150, 1400], [1480, 1080]],
    [[1150, 1560], [1600, 1920], [2030, 2080]],
    [[560, 820], [1050, 700], [1450, 520], [1600, 440]],
    [[250, 820], [-300, 1000], [-860, 1220]],
    [[-1050, 1260], [-820, 1700], [-560, 2010]],
    [[0, 76], [-300, 250], [-700, 300], [-1150, -250], [-1600, -780]],
    [[200, 455], [700, 260], [900, 190], [1250, -300], [1320, -600]],
    [[1320, -700], [1900, -1050], [2350, -1440]],
    [[1480, 1080], [1600, 520]],
    [[-860, 1220], [-1500, 900], [-2050, 640]],
    [[-820, 1700], [-1600, 1950], [-2250, 2080]],
    [[2030, 2080], [2150, 2140]],
    // highways into the wider county
    [[1600, 440], [2600, 560], [3600, 600]],
    [[3600, 600], [4700, -300], [5600, -1200], [6100, -1650]],
    [[3600, 600], [4200, 1700], [4800, 2990]],
    [[2400, 2330], [3600, 2800], [4620, 3200]],
    [[4800, 3410], [4300, 4300], [3600, 4900]],
    [[3600, 4900], [2600, 5600], [1250, 6540]],
    [[-2250, 2080], [-3500, 3600], [-4600, 5050]],
    [[-4600, 5350], [-3600, 6400], [-2450, 6950]],
    [[-2350, 7000], [-600, 7050], [1150, 6620]],
    [[-1600, -780], [-2200, -1300], [-2800, -1620]],
    [[-2800, -1980], [-2300, -3600], [-1500, -4940]],
    [[-1250, -5200], [700, -5700], [2420, -6000]],
    [[2780, -6000], [4000, -5500], [5000, -4900]],
    [[5200, -4600], [5800, -3200], [6200, -2040]],
    [[2380, -1480], [2500, -3500], [2600, -5820]],
    [[-2970, -1800], [-4200, -2500], [-4800, -2900]],
    [[-5600, -2900], [-5900, -800], [-6400, 1550]],
    [[-2050, 640], [-4000, 1100], [-6350, 1600]],
    [[-2800, -1800], [0, -2600], [2800, -2700], [6000, -2050]]
  ];
  // town streets
  var STREETS = [[[300, 740], [540, 740]], [[300, 820], [560, 820]], [[300, 900], [540, 900]], [[340, 700], [340, 960]], [[500, 700], [500, 960]],
    // Granite Falls
    [[4800, 2990], [4800, 3410]], [[4620, 3100], [4980, 3100]], [[4620, 3200], [4980, 3200]], [[4620, 3300], [4980, 3300]], [[4700, 3040], [4700, 3360]], [[4900, 3040], [4900, 3360]],
    // Cold Creek
    [[-4600, 5050], [-4600, 5350]], [[-4730, 5200], [-4470, 5200]]];
  function segs(list, w) { var out = []; list.forEach(function (pl) { for (var i = 0; i < pl.length - 1; i++) out.push({ ax: pl[i][0], az: pl[i][1], bx: pl[i + 1][0], bz: pl[i + 1][1], w: w }); }); return out; }
  T.roads = segs(ROADS, 4.2).concat(segs(STREETS, 4.5));
  function segDist(s, x, z) {
    var dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz, t = ((x - s.ax) * dx + (z - s.az) * dz) / l2; t = Math.max(0, Math.min(1, t));
    var px = s.ax + dx * t - x, pz = s.az + dz * t - z; return Math.sqrt(px * px + pz * pz);
  }
  T.roadDist = function (x, z) { var m = 1e9; for (var i = 0; i < T.roads.length; i++) { var s = T.roads[i]; if (Math.abs(x - (s.ax + s.bx) / 2) > Math.abs(s.ax - s.bx) / 2 + 40 || Math.abs(z - (s.az + s.bz) / 2) > Math.abs(s.az - s.bz) / 2 + 40) continue; var d = segDist(s, x, z) - s.w; if (d < m) m = d; } return m; };
  // ------------------------------------------------------------ heights
  function low(x, z) {
    var h = 34 * fbm(x / 760, z / 760, 3) + 6;
    T.pois.forEach(function (p) { if (p.hill) { var d2 = (x - p.x) * (x - p.x) + (z - p.z) * (z - p.z); h += p.hill * Math.exp(-d2 / (240 * 240)); } });
    var s = Math.max(Math.abs(x), Math.abs(z)), e0 = T.HALF - 650; if (s > e0) h += Math.pow((s - e0) / 600, 2) * 260 * (0.8 + 0.4 * fbm(x / 120, z / 120, 2));
    if (z > 4600) h += Math.pow(Math.min(1, (z - 4600) / 2600), 1.6) * 210 * (0.55 + 0.45 * fbm(x / 420, z / 420, 3));
    if (z < -3800 && x < -3000) h -= 18 * Math.min(1, (-3800 - z) / 1200) * Math.min(1, (-3000 - x) / 1500);
    return h;
  }
  function base(x, z) { return low(x, z) + 9 * fbm(x / 170 + 5, z / 170, 3) + 1.6 * fbm(x / 38, z / 38, 2); }
  T.hExact = function (x, z) {
    var h = base(x, z);
    // roads follow the low-frequency land
    var rd = T.roadDist(x, z); if (rd < 12) { var rh = low(x, z) + 9 * fbm(x / 170 + 5, z / 170, 3) * 0.6; h = rh + (h - rh) * sstep(1, 12, rd); }
    for (var i = 0; i < T.pois.length; i++) {
      var p = T.pois[i], d = Math.sqrt((x - p.x) * (x - p.x) + (z - p.z) * (z - p.z));
      if (d > p.r * 1.6 + 60) continue;
      if (p.flat) { var t = sstep(p.r, p.r * 1.5 + 30, d); h = p.h + (h - p.h) * t; }
      else if (p.bayou) { var fb = sstep(p.r + 60, p.r - 80, d); var marsh = p.water - 0.9 + 2.4 * fbm(x / 70, z / 70, 3); h = h + (marsh - h) * fb; }
      else if (p.lake) { var f = sstep(p.r + 40, p.r - 60, d); h = h + (p.water - 9 - h) * f; }
      else if (p.pit) { var g = sstep(p.r + 10, p.r - 30, d); var floorH = p.h - 24 * sstep(p.r, 0, d); var ter = Math.floor((p.h - (p.h - floorH)) / 4) * 4; h = h + (Math.min(h, ter + 0.5) - h) * g; }
    }
    return h;
  };
  T.pois.forEach(function (p) { if (p.h === undefined) { p.h = base(p.x, p.z); } if (p.lake) p.water = base(p.x, p.z) - 3; });
  poi('dam').h = poi('lake').water + 1.5;
  T.height = function (x, z) {
    var cx = Math.floor(x / CH), cz = Math.floor(z / CH), c = T.chunks[cx + ',' + cz];
    if (!c || !c.hg) return T.hExact(x, z);
    var gx = (x - cx * CH) / CH * S, gz = (z - cz * CH) / CH * S, ix = Math.min(S - 1, Math.floor(gx)), iz = Math.min(S - 1, Math.floor(gz)), fx = gx - ix, fz = gz - iz, n = S + 1, H = c.hg;
    var a = H[iz * n + ix], b = H[iz * n + ix + 1], cc = H[(iz + 1) * n + ix], d = H[(iz + 1) * n + ix + 1];
    return fx + fz < 1 ? a + (b - a) * fx + (cc - a) * fz : d + (cc - d) * (1 - fx) + (b - d) * (1 - fz);
  };
  T.rayHit = function (o, d, best) {
    var t = 0.2, prev = 0.2;
    while (t < best) {
      var x = o.x + d.x * t, z = o.z + d.z * t, y = o.y + d.y * t, gh = T.height(x, z);
      if (y < gh) { var a = prev, b = t; for (var i = 0; i < 6; i++) { var m = (a + b) / 2; if (o.y + d.y * m < T.height(o.x + d.x * m, o.z + d.z * m)) b = m; else a = m; } return b; }
      prev = t; t += Math.max(0.35, Math.min(4, (y - gh) * 0.6));
    }
    return best;
  };
  T.lakeAt = function (x, z, pad) { for (var i = 0; i < T.lakes.length; i++) { var l = T.lakes[i]; if (Math.hypot(x - l.x, z - l.z) < l.r + (pad || 0)) return l; } return null; };
  T.inWater = function (x, z) { var l = T.lakeAt(x, z, 60); return !!l && T.height(x, z) < l.water - 0.4; };
  // ------------------------------------------------------------ textures & geometry
  var tex = {}, mats = {}, geos = {};
  function canvasTex(w, h, fn, rep) { var c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; if (rep) t.repeat.set(rep, rep); return t; }
  function noisy(g, w, h, a, r) { var d = g.getImageData(0, 0, w, h), p = d.data; for (var i = 0; i < p.length; i += 4) { var n = (r() - 0.5) * a; p[i] += n; p[i + 1] += n; p[i + 2] += n; } g.putImageData(d, 0, 0); }
  T.signTex = function (text, bg, fg, w) {
    return canvasTex(w || 512, 128, function (g, W2, H2) { g.fillStyle = bg; g.fillRect(0, 0, W2, H2); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, W2 - 12, H2 - 12); g.fillStyle = fg; g.font = 'bold 64px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W2 / 2, H2 / 2 + 4); noisy(g, W2, H2, 30, rng(text.length)); });
  };
  function mergeGeos(parts) { // [geometry, colorHex]
    var pos = [], nor = [], col = [];
    parts.forEach(function (pt) {
      var g = pt[0].index ? pt[0].toNonIndexed() : pt[0]; g.computeVertexNormals();
      var c = new THREE.Color(pt[1]).convertSRGBToLinear(), pa = g.attributes.position.array, na = g.attributes.normal.array;
      for (var i = 0; i < pa.length; i++) { pos.push(pa[i]); nor.push(na[i]); }
      for (var j = 0; j < pa.length / 3; j++) { var v = 0.85 + Math.random() * 0.3; col.push(c.r * v, c.g * v, c.b * v); }
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return out;
  }
  function tr(g, x, y, z, rx, ry, rz, s) { if (s) g.scale(s[0], s[1], s[2]); if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0))); g.translate(x, y, z); return g; }
  function initAssets() {
    var r = rng(7);
    tex.grass = canvasTex(256, 256, function (g, w, h) { g.fillStyle = '#8a8a7a'; g.fillRect(0, 0, w, h); for (var i = 0; i < 3000; i++) { g.fillStyle = 'rgba(' + (60 + r() * 120 | 0) + ',' + (70 + r() * 120 | 0) + ',' + (40 + r() * 80 | 0) + ',0.35)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 3 + r() * 6); } noisy(g, w, h, 40, r); });
    tex.siding = canvasTex(256, 256, function (g, w, h) { g.fillStyle = '#c8c0b0'; g.fillRect(0, 0, w, h); for (var y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, y + 2, w, 3); } for (var k = 0; k < 30; k++) { var gr = g.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 30); gr.addColorStop(0, 'rgba(40,30,10,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } noisy(g, w, h, 26, r); });
    tex.shingle = canvasTex(256, 256, function (g, w, h) { g.fillStyle = '#3a3634'; g.fillRect(0, 0, w, h); for (var y = 0; y < h; y += 18) for (var x = (y / 18 % 2) * 14; x < w; x += 28) { var b = 40 + r() * 30; g.fillStyle = 'rgb(' + (b | 0) + ',' + (b - 4 | 0) + ',' + (b - 6 | 0) + ')'; g.fillRect(x + 1, y + 1, 26, 16); } noisy(g, w, h, 20, r); });
    tex.brick = canvasTex(256, 256, function (g, w, h) { g.fillStyle = '#4a3a34'; g.fillRect(0, 0, w, h); for (var y = 0; y < h; y += 16) for (var x = (y / 16 % 2) * 16; x < w; x += 32) { var b = 90 + r() * 40; g.fillStyle = 'rgb(' + (b | 0) + ',' + (b * 0.45 | 0) + ',' + (b * 0.35 | 0) + ')'; g.fillRect(x + 1, y + 1, 30, 14); } noisy(g, w, h, 24, r); });
    tex.concrete = canvasTex(256, 256, function (g, w, h) { g.fillStyle = '#7a7872'; g.fillRect(0, 0, w, h); for (var k = 0; k < 40; k++) { var gr = g.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 40); gr.addColorStop(0, 'rgba(30,30,20,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } g.strokeStyle = 'rgba(0,0,0,0.3)'; g.strokeRect(0, 0, w, h); noisy(g, w, h, 30, r); });
    tex.bark = canvasTex(64, 128, function (g, w, h) { g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, w, h); for (var i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(r() * w, 0, 1 + r() * 2, h); } noisy(g, w, h, 30, r); });
    mats.terrain = std({ map: tex.grass, vertexColors: true, roughness: 0.95, color: '#ffffff' });
    tex.grass.repeat.set(1, 1);
    mats.tree = std({ vertexColors: true, roughness: 0.9, color: '#ffffff' });
    mats.rock = std({ color: '#6a6862', roughness: 0.9, map: NF.tex.stone() });
    mats.siding = std({ map: tex.siding, roughness: 0.85 });
    mats.shingle = std({ map: tex.shingle, roughness: 0.9 });
    mats.brick = std({ map: tex.brick, roughness: 0.9 });
    mats.concrete = std({ map: tex.concrete, roughness: 0.95 });
    mats.metal = std({ map: NF.tex.metal(), metalness: 0.7, roughness: 0.45 });
    mats.rust = std({ map: NF.tex.metal(), color: '#8a5a3a', metalness: 0.5, roughness: 0.7 });
    mats.wood = std({ map: NF.tex.wood(), color: '#8a6a4a', roughness: 0.8 });
    mats.darkwood = std({ map: NF.tex.wood(), color: '#5a3a28', roughness: 0.7 });
    mats.floor = std({ map: NF.tex.wood(), color: '#7a5a40', roughness: 0.7 });
    mats.window = std({ color: '#1a2230', emissive: '#0a1220', roughness: 0.2, metalness: 0.3 });
    mats.windowLit = std({ color: '#ffd090', emissive: '#ffb050', emissiveIntensity: 0.9 });
    mats.lamp = std({ color: '#fff0c0', emissive: '#ffd890', emissiveIntensity: 2 });
    mats.red = std({ color: '#ff2020', emissive: '#ff1010', emissiveIntensity: 2 });
    mats.water = new THREE.MeshStandardMaterial({ color: new THREE.Color('#0a1a22').convertSRGBToLinear(), roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.88 });
    mats.swamp = new THREE.MeshStandardMaterial({ color: new THREE.Color('#1a2214').convertSRGBToLinear(), roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.92 });
    mats.asphalt = std({ color: '#2a2a2a', roughness: 0.9, map: NF.tex.stone() });
    mats.stone = std({ map: NF.tex.stone(), roughness: 0.95 });
    mats.cloth = std({ color: '#6a5a3a', roughness: 1, side: THREE.DoubleSide });
    // trees
    var pine = [[new THREE.CylinderGeometry(0.16, 0.26, 2.6, 6), '#3a2a1e', [0, 1.3, 0]]];
    [[2.0, 3.2, 2.6], [1.55, 2.8, 4.2], [1.05, 2.4, 5.6], [0.55, 1.8, 6.8]].forEach(function (c) { pine.push([new THREE.ConeGeometry(c[0], c[1], 7), '#1e2e1c', [0, c[2], 0]]); });
    geos.pine = mergeGeos(pine.map(function (p) { tr(p[0], p[2][0], p[2][1], p[2][2]); return [p[0], p[1]]; }));
    var dead = [[tr(new THREE.CylinderGeometry(0.12, 0.28, 6, 6), 0, 3, 0), '#4a3e34']];
    for (var b = 0; b < 5; b++) dead.push([tr(new THREE.CylinderGeometry(0.03, 0.08, 2.2, 5), 0, 0, 0, 0, b * 1.3, 0.9 + r() * 0.5), '#4a3e34']);
    dead.forEach(function (d, i) { if (i) { d[0].translate(0, 0, 0); d[0].applyMatrix4(new THREE.Matrix4().makeTranslation(Math.cos(i * 1.3) * 0.6, 2.5 + i * 0.6, Math.sin(i * 1.3) * 0.6)); } });
    geos.dead = mergeGeos(dead);
    var oak = [[tr(new THREE.CylinderGeometry(0.25, 0.4, 3.4, 7), 0, 1.7, 0), '#3e2e22']];
    for (var k = 0; k < 6; k++) oak.push([tr(new THREE.IcosahedronGeometry(1.6 + r() * 0.8, 0), Math.cos(k) * 1.4, 4.2 + r() * 1.4, Math.sin(k) * 1.4), k % 2 ? '#2a3a20' : '#33421f']);
    geos.oak = mergeGeos(oak);
    geos.bush = mergeGeos([[tr(new THREE.IcosahedronGeometry(0.8, 0), 0, 0.4, 0, 0, 0, 0, [1.3, 0.7, 1.1]), '#26331c']]);
    geos.rock = new THREE.DodecahedronGeometry(1, 0);
    geos.grave = new THREE.BoxGeometry(0.6, 0.9, 0.15);
  }
  // ------------------------------------------------------------ placements
  var buckets = {};
  function key(x, z) { return Math.floor(x / CH) + ',' + Math.floor(z / CH); }
  T.placements = [];
  function place(o) { T.placements.push(o); var k = key(o.x, o.z); (buckets[k] || (buckets[k] = { s: [], e: [], i: [] })).s.push(o); return o; }
  function spawnAt(type, id, x, z, o) { o = o || {}; o.type = type; o.id = id; o.x = x; o.z = z; var k = key(x, z); (buckets[k] || (buckets[k] = { s: [], e: [], i: [] })).e.push(o); return o; }
  function itemAt(id, type, x, z, o) { o = o || {}; o.id = id; o.type = type; o.x = x; o.z = z; var k = key(x, z); (buckets[k] || (buckets[k] = { s: [], e: [], i: [] })).i.push(o); return o; }
  T.spawnAt = spawnAt; T.itemAt = itemAt; T.place = place;
  function clearOf(x, z, pad) { // not on roads, not in a flat POI
    if (T.roadDist(x, z) < (pad || 6)) return false;
    for (var i = 0; i < T.pois.length; i++) { var p = T.pois[i]; if (Math.hypot(x - p.x, z - p.z) < p.r + (pad || 6)) return false; }
    return true;
  }
  T.clearOf = clearOf;
  var LOOT = ['hg_ammo', 'hg_ammo', 'hg_ammo', 'sg_ammo', 'herb', 'herb', 'red_herb', 'powder', 'powder', 'money', 'money', 'smg_ammo', 'rifle_ammo', 'grenade', 'treasure', 'blue_herb'];
  function loot(id, x, z, r, y) { var t = LOOT[(r() * LOOT.length) | 0]; return itemAt(id, t, x, z, { y: y }); }
  T.loot = loot;
  function initPlacements() {
    var r = rng(1998), n = 0;
    // ---- Halverson Falls
    var town = poi('town'), bi = 0;
    function lot(x, z, face, kind) {
      var w = kind === 'shop' ? 12 : 8 + (r() * 3 | 0), d = kind === 'shop' ? 10 : 7 + (r() * 3 | 0);
      if (r() < 0.75) loot('tb' + bi + 'l', x + (r() - .5) * 3, z + (r() - .5) * 3, r);
      place({ kind: kind || 'house', id: 'tb' + (bi++), x: x, z: z, w: face % 2 ? d : w, d: face % 2 ? w : d, face: face, h: kind === 'shop' ? 4 : 3.2, style: r() < 0.3 ? 'brick' : 'siding', tint: ['#c8c0b0', '#9aa8a0', '#b0a088', '#a08a7a', '#8a9aa8', '#c0b8a0'][(r() * 6) | 0], sign: kind === 'shop' ? ['HARDWARE', 'PHARMACY', 'DINER', 'GROCERY', 'BARBER', 'BANK', 'TAVERN', 'BOOKS', 'GUNS & TACKLE', 'POST OFFICE'][(r() * 10) | 0] : null });
    }
    for (var z = 708; z <= 952; z += 18) {
      if (Math.abs(z - 740) < 9 || Math.abs(z - 820) < 9 || Math.abs(z - 900) < 9) continue;
      lot(420 - 15, z, 1, r() < 0.5 ? 'shop' : 'house'); if (!(z > 845 && z < 880)) lot(420 + 15, z, 3, r() < 0.5 ? 'shop' : 'house');
      lot(340 - 14, z, 1); lot(340 + 14, z, 3); lot(500 - 14, z, 1); lot(500 + 14, z, 3);
    }
    for (var x = 300; x <= 545; x += 18) { if (Math.abs(x - 340) < 12 || Math.abs(x - 420) < 12 || Math.abs(x - 500) < 12) continue; [740, 820, 900].forEach(function (zz) { lot(x, zz - 13, 0); lot(x, zz + 13, 2); }); }
    place({ kind: 'police', id: 'police', x: 446, z: 862, w: 22, d: 16, h: 4.2 });
    place({ kind: 'watertower', id: 'wt', x: 520, z: 960 });
    place({ kind: 'fountain', id: 'fount', x: 420, z: 820 });
    for (var lz = 700; lz <= 960; lz += 26) { T.lamps.push({ x: 426, y: 5, z: lz }); place({ kind: 'streetlamp', id: 'sl' + lz, x: 426, z: lz }); }
    for (var lx = 310; lx <= 550; lx += 30) { T.lamps.push({ x: lx, y: 5, z: 826 }); place({ kind: 'streetlamp', id: 'slx' + lx, x: lx, z: 826 }); }
    for (var c = 0; c < 26; c++) place({ kind: 'car', id: 'car' + c, x: 420 + (r() < 0.5 ? -2.5 : 2.5) + (r() - .5) * 2, z: 700 + r() * 260, rot: r() * 6.28 });
    // town population
    for (var zi = 0; zi < 70; zi++) { var ang = r() * 6.28, rad = 10 + r() * 180; var zx = town.x + Math.cos(ang) * rad, zz2 = town.z + Math.sin(ang) * rad; spawnAt(r() < 0.06 ? 'bloater' : 'zombie', 'tz' + zi, zx, zz2, { variant: (r() * 8) | 0, revenant: r() < 0.15 }); }
    spawnAt('skinner', 'tsk1', 470, 760); spawnAt('skinner', 'tsk2', 360, 930);
    spawnAt('reaper', 'trp1', 300, 980);
    for (var cr = 0; cr < 4; cr++) spawnAt('crows', 'tcr' + cr, town.x + (r() - .5) * 300, town.z + (r() - .5) * 300);
    // ---- gas stations
    ['gas1', 'gas2'].forEach(function (g) { var p = poi(g); place({ kind: 'gas', id: g, x: p.x, z: p.z }); T.lamps.push({ x: p.x, y: 5, z: p.z, c: '#e8f0ff', i: 1.4 }); for (var k = 0; k < 5; k++) spawnAt('zombie', g + 'z' + k, p.x + (r() - .5) * 40, p.z + (r() - .5) * 40, { variant: (r() * 8) | 0 }); spawnAt('dogpack', g + 'dg', p.x + 30, p.z - 25); });
    // ---- relay
    var rl = poi('relay'); place({ kind: 'relay', id: 'relay', x: rl.x, z: rl.z }); place({ kind: 'shack', id: 'relayshack', x: rl.x - 22, z: rl.z + 14, safe: true, name: 'Relay Shack' });
    T.lamps.push({ x: rl.x - 22, y: 3, z: rl.z + 10, c: '#ffd090', i: 1 });
    for (var k2 = 0; k2 < 6; k2++) spawnAt('zombie', 'rlz' + k2, rl.x + (r() - .5) * 70, rl.z + (r() - .5) * 70, { variant: 3 });
    spawnAt('reaper', 'rlrp', rl.x + 60, rl.z + 40);
    // ---- church
    var ch = poi('church'); place({ kind: 'church', id: 'church', x: ch.x, z: ch.z }); place({ kind: 'shack', id: 'churchshack', x: ch.x - 50, z: ch.z - 40, safe: true, name: 'Sexton\'s Lodge' });
    for (var gv = 0; gv < 70; gv++) place({ kind: 'grave', id: 'gv' + gv, x: ch.x + 18 + (gv % 10) * 2.4, z: ch.z - 22 + Math.floor(gv / 10) * 3 });
    for (var k3 = 0; k3 < 10; k3++) spawnAt('zombie', 'chz' + k3, ch.x + 18 + r() * 25, ch.z - 22 + r() * 22, { variant: r() < 0.5 ? 5 : 0 });
    spawnAt('crows', 'chcr', ch.x + 30, ch.z - 10); spawnAt('crows', 'chcr2', ch.x - 10, ch.z + 30);
    T.lamps.push({ x: ch.x, y: 3, z: ch.z - 9, c: '#ff9a50', i: 1.2 });
    // ---- airfield
    var af = poi('airfield'); place({ kind: 'airfield', id: 'airfield', x: af.x, z: af.z });
    for (var k4 = 0; k4 < 14; k4++) spawnAt(r() < 0.3 ? 'hollow' : 'zombie', 'afz' + k4, af.x + (r() - .5) * 300, af.z + (r() - .5) * 300, { variant: 3, weapon: 'axe' });
    spawnAt('reaper', 'afrp1', af.x - 80, af.z + 60); spawnAt('reaper', 'afrp2', af.x + 90, af.z - 80);
    for (var al = 0; al < 6; al++) T.lamps.push({ x: af.x - 60 + al * 24, y: 6, z: af.z - 130, c: '#cfe0ff', i: 1.2 });
    // ---- Millbrook
    var mb = poi('millbrook');
    for (var h = 0; h < 14; h++) { var a = h / 14 * 6.28, rr = 55 + r() * 30; var hx = mb.x + Math.cos(a) * rr, hz = mb.z + Math.sin(a) * rr; var face = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 1 : 3) : (Math.sin(a) > 0 ? 2 : 0); place({ kind: 'house', id: 'mb' + h, x: Math.round(hx), z: Math.round(hz), w: 9, d: 8, face: face, h: 3, style: 'old', tint: '#8a7a68' }); }
    place({ kind: 'belltower', id: 'bell', x: mb.x, z: mb.z + 14 }); place({ kind: 'bonfire', id: 'bonfire', x: mb.x, z: mb.z }); T.lamps.push({ x: mb.x, y: 1.5, z: mb.z, c: '#ff7a30', i: 2.6, flick: true });
    place({ kind: 'shack', id: 'mbshack', x: mb.x - 110, z: mb.z - 70, safe: true, name: 'Trapper\'s Cabin' });
    for (var hv = 0; hv < 22; hv++) { var aa = r() * 6.28, rd2 = 8 + r() * 85; spawnAt('hollow', 'mbh' + hv, mb.x + Math.cos(aa) * rd2, mb.z + Math.sin(aa) * rd2, { weapon: ['axe', 'pitchfork', 'sickle', 'torch', 'axe', 'shield'][(r() * 6) | 0] }); }
    spawnAt('butcher', 'butcher', mb.x + 5, mb.z - 20);
    // ---- farms
    ['harlan', 'odell'].forEach(function (f, fi) { var p = poi(f); place({ kind: 'farm', id: f, x: p.x, z: p.z }); for (var k5 = 0; k5 < 6; k5++) spawnAt(fi ? 'bloater' : 'hollow', f + 'h' + k5, p.x + (r() - .5) * 90, p.z + (r() - .5) * 90, { weapon: 'pitchfork' }); spawnAt('crows', f + 'cr', p.x + 30, p.z + 30); spawnAt('burrower', f + 'worm', p.x + 50, p.z - 40); });
    // ---- camp, quarry, field lab, ranger, mine, dam
    var cp = poi('camp'); place({ kind: 'camp', id: 'camp', x: cp.x, z: cp.z }); T.lamps.push({ x: cp.x, y: 1.2, z: cp.z, c: '#ff8040', i: 1.8, flick: true }); for (var k6 = 0; k6 < 6; k6++) spawnAt('zombie', 'cpz' + k6, cp.x + (r() - .5) * 50, cp.z + (r() - .5) * 50, { variant: 5 }); spawnAt('spider', 'cpsp', cp.x + 40, cp.z + 30);
    var q = poi('quarry'); place({ kind: 'quarry', id: 'quarry', x: q.x, z: q.z }); spawnAt('burrower', 'qworm', q.x, q.z, { boss: true }); spawnAt('spider', 'qsp1', q.x + 60, q.z + 40); spawnAt('spider', 'qsp2', q.x - 70, q.z - 30);
    var fl = poi('fieldlab'); place({ kind: 'bunker', id: 'fieldlab', x: fl.x, z: fl.z }); for (var k7 = 0; k7 < 3; k7++) spawnAt('skinner', 'flsk' + k7, fl.x + (r() - .5) * 60, fl.z + (r() - .5) * 60); spawnAt('reaper', 'flrp', fl.x + 30, fl.z);
    var rg = poi('ranger'); place({ kind: 'lookout', id: 'ranger', x: rg.x, z: rg.z }); place({ kind: 'shack', id: 'rangershack', x: rg.x + 12, z: rg.z, safe: true, name: 'Ranger Station' });
    var mn = poi('mine'); place({ kind: 'mine', id: 'mine', x: mn.x, z: mn.z }); for (var k8 = 0; k8 < 4; k8++) spawnAt('spider', 'mnsp' + k8, mn.x + (r() - .5) * 60, mn.z + (r() - .5) * 60);
    var dm = poi('dam'); place({ kind: 'dam', id: 'dam', x: dm.x, z: dm.z }); place({ kind: 'shack', id: 'boathouse', x: dm.x + 60, z: dm.z + 40, safe: true, name: 'Boathouse' }); for (var k9 = 0; k9 < 5; k9++) spawnAt('bloom', 'dmbl' + k9, dm.x - 80 + k9 * 40, dm.z + 30 + r() * 20);
    spawnAt('spider', 'dmsp', dm.x + 30, dm.z - 20);
    // safehouse on the gas station lot near the manor
    place({ kind: 'shack', id: 'gas1shack', x: poi('gas1').x - 26, z: poi('gas1').z + 4, safe: true, name: 'Motel Office' });
    // ---- wilderness: cabins, wrecks, camps, hunting stands
    var EDGE = T.HALF - 500;
    for (var wc = 0; wc < 1700; wc++) {
      var cx2 = (r() * 2 - 1) * EDGE, cz2 = (r() * 2 - 1) * EDGE;
      if (T.lakeAt(cx2, cz2, 30)) continue;
      if (!clearOf(cx2, cz2, 30) || Math.hypot(cx2, cz2 - 36) < 160) continue;
      var kind = r(); var id = 'w' + wc;
      if (kind < 0.4) place({ kind: 'house', id: id, x: Math.round(cx2), z: Math.round(cz2), w: 7, d: 6, face: (r() * 4) | 0, h: 2.8, style: 'old', tint: '#7a6a58', wild: true });
      else if (kind < 0.55) place({ kind: 'campfire', id: id, x: cx2, z: cz2 });
      else if (kind < 0.7) place({ kind: 'stand', id: id, x: cx2, z: cz2 });
      else if (kind < 0.8) place({ kind: 'crash', id: id, x: cx2, z: cz2, rot: r() * 6 });
      else place({ kind: 'ruin', id: id, x: cx2, z: cz2 });
      if (r() < 0.75) loot(id + 'l', cx2 + (kind < 0.4 ? 0.5 : 2.5), cz2 + (kind < 0.4 ? 0.5 : 1.5), r);
    }
    // wrecked cars on the roads
    T.roads.forEach(function (s, si) { var len = Math.hypot(s.bx - s.ax, s.bz - s.az); for (var t = 30; t < len; t += 90 + r() * 120) { var f = t / len; if (r() < 0.55) place({ kind: 'car', id: 'rc' + si + '_' + (t | 0), x: s.ax + (s.bx - s.ax) * f + (r() - .5) * 5, z: s.az + (s.bz - s.az) * f + (r() - .5) * 5, rot: Math.atan2(s.bx - s.ax, s.bz - s.az) + (r() - .5) * 1.2 }); } });
    // power poles along the main roads
    T.roads.forEach(function (s, si) { if (s.w > 4.3) return; var len = Math.hypot(s.bx - s.ax, s.bz - s.az), nx = -(s.bz - s.az) / len, nz = (s.bx - s.ax) / len; for (var t = 0; t < len; t += 45) { var f = t / len; place({ kind: 'pole', id: 'pp' + si + '_' + t, x: s.ax + (s.bx - s.ax) * f + nx * 7, z: s.az + (s.bz - s.az) * f + nz * 7 }); } });
    // wandering threats in the wild
    var types = ['zombie', 'zombie', 'zombie', 'dogpack', 'crows', 'spider', 'reaper', 'zombie', 'hollow', 'bloater', 'skinner'];
    for (var wz = 0; wz < 3200; wz++) {
      var ex = (r() * 2 - 1) * EDGE, ez = (r() * 2 - 1) * EDGE; if (Math.hypot(ex, ez - 36) < 120) continue;
      var ty = types[(r() * types.length) | 0]; if (T.inWaterExact(ex, ez)) continue;
      spawnAt(ty, 'wz' + wz, ex, ez, { variant: (r() * 8) | 0, weapon: 'axe', revenant: r() < 0.12 });
      if (ty === 'zombie') for (var g2 = 0; g2 < 2 + (r() * 3 | 0); g2++) spawnAt('zombie', 'wz' + wz + 'g' + g2, ex + (r() - .5) * 12, ez + (r() - .5) * 12, { variant: (r() * 8) | 0 });
    }
    // story items & treasures
    // ================================================================ the wider county
    var SHOPS = ['HARDWARE', 'PHARMACY', 'DINER', 'GROCERY', 'BARBER', 'BANK', 'TAVERN', 'BOOKS', 'GUNS & TACKLE', 'POST OFFICE', 'LAUNDROMAT', 'MOTEL', 'FEED & SEED', 'CINEMA'];
    var TINTS = ['#c8c0b0', '#9aa8a0', '#b0a088', '#a08a7a', '#8a9aa8', '#c0b8a0', '#a8a090'];
    function lot2(pre, i, x, z, face, kind, style) {
      var shop = kind === 'shop', w = shop ? 12 : 8 + (r() * 3 | 0), d = shop ? 10 : 7 + (r() * 3 | 0);
      if (r() < 0.7) loot(pre + i + 'l', x + (r() - .5) * 3, z + (r() - .5) * 3, r);
      place({ kind: 'house', id: pre + i, x: x, z: z, w: face % 2 ? d : w, d: face % 2 ? w : d, face: face, h: shop ? 4 : 3.2, style: style || (r() < 0.3 ? 'brick' : 'siding'), tint: TINTS[(r() * TINTS.length) | 0], sign: shop ? SHOPS[(r() * SHOPS.length) | 0] : null });
    }
    function townGrid(pre, cx, cz, half, mainX, crossZ, sideX, style) {
      var n = 0;
      for (var z = cz - half + 8; z <= cz + half - 8; z += 18) {
        if (crossZ.some(function (cz2) { return Math.abs(z - cz2) < 10; })) continue;
        lot2(pre, n++, mainX - 15, z, 1, r() < 0.5 ? 'shop' : 'house', style); lot2(pre, n++, mainX + 15, z, 3, r() < 0.5 ? 'shop' : 'house', style);
        sideX.forEach(function (sx) { lot2(pre, n++, sx - 14, z, 1, 'house', style); lot2(pre, n++, sx + 14, z, 3, 'house', style); });
      }
      crossZ.forEach(function (zz) { for (var x = cx - half + 20; x <= cx + half - 20; x += 18) { if (Math.abs(x - mainX) < 12 || sideX.some(function (sx) { return Math.abs(x - sx) < 12; })) continue; lot2(pre, n++, x, zz - 13, 0, r() < 0.3 ? 'shop' : 'house', style); lot2(pre, n++, x, zz + 13, 2, 'house', style); } });
      return n;
    }
    function crowd(pre, cx, cz, rad, n, mix, o) { for (var i = 0; i < n; i++) { var a = r() * 6.28, d = 8 + r() * rad, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (T.inWaterExact(x, z)) continue; var ty = mix[(r() * mix.length) | 0]; spawnAt(ty, pre + i, x, z, Object.assign({ variant: (r() * 8) | 0, weapon: ['axe', 'pitchfork', 'sickle', 'torch', 'shield'][(r() * 5) | 0], revenant: r() < 0.15 }, o || {})); } }
    function safehouse(id, x, z, name) { place({ kind: 'shack', id: id, x: x, z: z, safe: true, name: name }); T.lamps.push({ x: x, y: 3, z: z - 4, c: '#ffd090', i: 1 }); }
    // ---- Granite Falls, the county seat
    var gf = poi('granite');
    townGrid('gf', gf.x, gf.z, 190, 4800, [3100, 3200, 3300], [4700, 4900]);
    place({ kind: 'house', id: 'gfhospital', x: 4980, z: 3050, w: 30, d: 18, face: 3, h: 7, style: 'concrete', flatRoof: true, sign: 'COUNTY HOSPITAL', doorW: 3, lit: true, name: 'Granite County Hospital' });
    for (var hs = 0; hs < 6; hs++) itemAt('gfhosp' + hs, ['spray', 'herb', 'blue_herb', 'red_herb', 'spray', 'herb'][hs], 4970 + (hs % 3) * 6, 3045 + (hs / 3 | 0) * 6);
    place({ kind: 'house', id: 'gfcourt', x: 4620, z: 3380, w: 24, d: 16, face: 2, h: 6, style: 'brick', sign: 'COURTHOUSE', doorW: 2.4, name: 'Courthouse' });
    place({ kind: 'watertower', id: 'gfwt', x: 4980, z: 3400 });
    safehouse('gfshack', 4560, 3080, 'Granite Falls Motel');
    for (var gl2 = 3000; gl2 <= 3400; gl2 += 28) { T.lamps.push({ x: 4806, y: 5, z: gl2 }); place({ kind: 'streetlamp', id: 'gfl' + gl2, x: 4806, z: gl2 }); }
    for (var gc = 0; gc < 30; gc++) place({ kind: 'car', id: 'gfcar' + gc, x: 4800 + (r() < 0.5 ? -2.5 : 2.5), z: 3000 + r() * 400, rot: r() * 6.28 });
    crowd('gfz', gf.x, gf.z, 210, 110, ['zombie', 'zombie', 'zombie', 'zombie', 'bloater', 'zombie', 'reaper']);
    spawnAt('skinner', 'gfsk1', 4980, 3060); spawnAt('skinner', 'gfsk2', 4700, 3300); spawnAt('crows', 'gfcr', 4850, 3150);
    // ---- Route 9 truck stop
    var ts = poi('truckstop'); place({ kind: 'gas', id: 'truckstop', x: ts.x, z: ts.z }); T.lamps.push({ x: ts.x, y: 5, z: ts.z, c: '#e8f0ff', i: 1.4 });
    safehouse('tsshack', ts.x - 30, ts.z + 6, 'Truck Stop Office'); for (var tt = 0; tt < 5; tt++) place({ kind: 'car', id: 'tscar' + tt, x: ts.x + 20 + tt * 5, z: ts.z - 20, rot: 1.57 });
    crowd('tsz', ts.x, ts.z, 50, 10, ['zombie', 'zombie', 'dogpack']);
    // ---- Velgen corporate campus
    var cp2 = poi('campus');
    [[-70, -60, 'VELGEN BIOMEDICAL', 'Velgen Research Tower'], [60, -60, 'LAZARUS WING', 'Lazarus Wing'], [-70, 60, 'ANIMAL RESEARCH', 'Animal Research'], [60, 60, 'ADMINISTRATION', 'Administration']].forEach(function (b, i) {
      place({ kind: 'house', id: 'vc' + i, x: cp2.x + b[0], z: cp2.z + b[1], w: 34, d: 24, face: i < 2 ? 2 : 0, h: 9, style: 'concrete', flatRoof: true, sign: b[2], doorW: 3.2, lit: true, name: b[3], empty: true });
      for (var lv = 0; lv < 3; lv++) itemAt('vcl' + i + lv, ['rpg_ammo', 'gl_ammo', 'treasure', 'sample', 'rifle_ammo', 'spray'][(i * 3 + lv) % 6], cp2.x + b[0] - 8 + lv * 8, cp2.z + b[1] + (r() - .5) * 6, { name: (i * 3 + lv) % 6 === 2 ? 'Velgen Board Ring' : (i * 3 + lv) % 6 === 3 ? 'Velgen Sample Case' : undefined, value: 9000 });
    });
    for (var pk = 0; pk < 24; pk++) place({ kind: 'car', id: 'vccar' + pk, x: cp2.x - 60 + (pk % 8) * 15, z: cp2.z + (pk / 8 | 0) * 6 - 6, rot: 0 });
    for (var cl = 0; cl < 8; cl++) T.lamps.push({ x: cp2.x - 90 + cl * 26, y: 6, z: cp2.z, c: '#cfe0ff', i: 1.2 });
    safehouse('vcshack', cp2.x - 200, cp2.z + 40, 'Security Gatehouse');
    crowd('vcz', cp2.x, cp2.z, 200, 45, ['zombie', 'zombie', 'skinner', 'reaper', 'zombie'], { variant: 2 });
    spawnAt('reaper', 'r01', cp2.x, cp2.z + 10, { boss: true });
    // ---- Copper Hills wind farm
    var wf = poi('windfarm'); for (var tb = 0; tb < 14; tb++) { var a2 = tb / 14 * 6.28 + r() * 0.3, d2 = 80 + r() * 200; place({ kind: 'turbine', id: 'wt' + tb, x: wf.x + Math.cos(a2) * d2, z: wf.z + Math.sin(a2) * d2 }); }
    place({ kind: 'house', id: 'wfsub', x: wf.x, z: wf.z, w: 14, d: 10, face: 0, h: 4, style: 'concrete', flatRoof: true, sign: 'SUBSTATION 4' });
    spawnAt('burrower', 'wfworm', wf.x + 60, wf.z + 40, { boss: true }); crowd('wfz', wf.x, wf.z, 250, 14, ['crows', 'zombie', 'dogpack', 'reaper']);
    // ---- Saltmarsh Penitentiary
    var pr = poi('prison');
    place({ kind: 'wall', id: 'prw1', x: pr.x, z: pr.z - 110, w: 220, d: 1.2, h: 8, gap: 16 }); place({ kind: 'wall', id: 'prw2', x: pr.x, z: pr.z + 110, w: 220, d: 1.2, h: 8 });
    place({ kind: 'wall', id: 'prw3', x: pr.x - 110, z: pr.z, w: 1.2, d: 220, h: 8 }); place({ kind: 'wall', id: 'prw4', x: pr.x + 110, z: pr.z, w: 1.2, d: 220, h: 8 });
    [[-50, -30], [50, -30], [-50, 40], [50, 40]].forEach(function (c2, i) { place({ kind: 'house', id: 'prcb' + i, x: pr.x + c2[0], z: pr.z + c2[1], w: 40, d: 14, face: i % 2 ? 3 : 1, h: 6, style: 'concrete', flatRoof: true, name: 'Cell Block ' + 'ABCD'[i], empty: false }); });
    [[-105, -105], [105, -105], [-105, 105], [105, 105]].forEach(function (c2, i) { place({ kind: 'lookout', id: 'prt' + i, x: pr.x + c2[0], z: pr.z + c2[1] }); });
    safehouse('prshack', pr.x - 30, pr.z - 150, 'Prison Visitor Centre');
    crowd('prz', pr.x, pr.z, 95, 60, ['zombie', 'zombie', 'zombie', 'hollow'], { variant: 4 });
    spawnAt('butcher', 'butcher2', pr.x, pr.z + 5);
    for (var pl2 = 0; pl2 < 6; pl2++) itemAt('prl' + pl2, ['hg_ammo', 'sg_ammo', 'mag_ammo', 'grenade', 'smg_ammo', 'treasure'][pl2], pr.x - 60 + pl2 * 24, pr.z + 5, { name: pl2 === 5 ? 'Warden\'s Gold Watch' : undefined, value: 7000 });
    // ---- Fort Halvers
    var ft = poi('fort');
    for (var bk = 0; bk < 8; bk++) place({ kind: 'house', id: 'ftb' + bk, x: ft.x - 120 + (bk % 4) * 70, z: ft.z - 50 + (bk / 4 | 0) * 90, w: 26, d: 9, face: bk < 4 ? 2 : 0, h: 3.6, style: 'siding', tint: '#6a7058', name: 'Barracks ' + (bk + 1) });
    place({ kind: 'house', id: 'ftarmory', x: ft.x + 140, z: ft.z, w: 16, d: 12, face: 3, h: 4, style: 'concrete', flatRoof: true, sign: 'ARMORY', name: 'Fort Armory' });
    for (var fa = 0; fa < 6; fa++) itemAt('ftal' + fa, ['grenade', 'gl_ammo', 'rifle_ammo', 'grenade', 'rpg_ammo', 'smg_ammo'][fa], ft.x + 134 + (fa % 3) * 4, ft.z - 3 + (fa / 3 | 0) * 6, { amount: [3, 4, 10, 3, 1, 60][fa] });
    [[-230, -230], [230, -230], [-230, 230], [230, 230]].forEach(function (c2, i) { place({ kind: 'lookout', id: 'ftt' + i, x: ft.x + c2[0], z: ft.z + c2[1] }); });
    for (var fs = -2; fs < 2; fs++) { place({ kind: 'fenceSeg', id: 'ffn' + fs, x0: ft.x + fs * 115, z0: ft.z + 240, x1: ft.x + (fs + 1) * 115, z1: ft.z + 240, x: ft.x + fs * 115 + 57, z: ft.z + 240 }); place({ kind: 'fenceSeg', id: 'ffs' + fs, x0: ft.x + fs * 115, z0: ft.z - 240, x1: ft.x + (fs + 1) * 115, z1: ft.z - 240, x: ft.x + fs * 115 + 57, z: ft.z - 240, gap: fs === 0 ? 20 : 0 }); }
    for (var mv = 0; mv < 10; mv++) place({ kind: 'car', id: 'ftcar' + mv, x: ft.x - 60 + mv * 13, z: ft.z + 30, rot: 0, color: '#4a5236' });
    place({ kind: 'helipad', id: 'fthp', x: ft.x + 60, z: ft.z - 150 });
    safehouse('ftshack', ft.x + 40, ft.z - 270, 'Checkpoint Hut');
    crowd('ftz', ft.x, ft.z, 230, 55, ['zombie', 'zombie', 'zombie', 'reaper', 'dogpack'], { variant: 3 });
    // ---- Ashgrove rail yard
    var ry = poi('railyard');
    for (var bc = 0; bc < 22; bc++) place({ kind: 'boxcar', id: 'rybc' + bc, x: ry.x - 120 + (bc % 11) * 22, z: ry.z - 30 + (bc / 11 | 0) * 18 + (r() - .5) * 2, rot: 1.57 + (r() - .5) * 0.1 });
    place({ kind: 'house', id: 'rystation', x: ry.x, z: ry.z + 60, w: 22, d: 10, face: 0, h: 5, style: 'brick', sign: 'ASHGROVE STATION', name: 'Ashgrove Station' });
    place({ kind: 'watertower', id: 'rywt', x: ry.x + 120, z: ry.z + 50 });
    safehouse('ryshack', ry.x - 140, ry.z + 70, 'Signal Box');
    crowd('ryz', ry.x, ry.z, 160, 35, ['zombie', 'zombie', 'hollow', 'dogpack', 'bloater']);
    // ---- Blackroot Bayou
    var bay = poi('bayou');
    for (var sh = 0; sh < 16; sh++) { var a3 = r() * 6.28, d3 = 60 + r() * 330, sx3 = bay.x + Math.cos(a3) * d3, sz3 = bay.z + Math.sin(a3) * d3; place({ kind: 'house', id: 'bys' + sh, x: Math.round(sx3), z: Math.round(sz3), w: 7, d: 6, face: (r() * 4) | 0, h: 2.8, style: 'old', tint: '#5a5040', wild: true }); if (r() < 0.8) loot('bys' + sh + 'l', sx3 + 0.5, sz3 + 0.5, r); }
    safehouse('byshack', bay.x + 380, bay.z + 200, 'Bait Shop');
    crowd('byz', bay.x, bay.z, 380, 40, ['bloom', 'spider', 'bloater', 'zombie', 'crows', 'zombie']);
    spawnAt('spider', 'bayoubrood', bay.x - 40, bay.z + 30, { boss: true });
    // ---- Cold Creek, a mining town in the hills
    var cc = poi('coldcreek'); townGrid('cc', cc.x, cc.z, 140, -4600, [5200], [], 'old');
    place({ kind: 'lookout', id: 'cchead', x: cc.x + 90, z: cc.z + 60 }); place({ kind: 'mine', id: 'ccmine', x: cc.x + 110, z: cc.z + 90 });
    safehouse('ccshack', cc.x - 150, cc.z - 40, 'Assay Office');
    crowd('ccz', cc.x, cc.z, 150, 40, ['hollow', 'hollow', 'zombie', 'spider']);
    // ---- Kessler Pass Lodge, up in the snow
    var lg = poi('lodge'); place({ kind: 'house', id: 'lodge', x: lg.x, z: lg.z, w: 26, d: 14, face: 0, h: 5, style: 'old', tint: '#6a4a30', sign: 'KESSLER PASS LODGE', lit: true, name: 'Kessler Pass Lodge' });
    for (var lf = 0; lf < 10; lf++) place({ kind: 'pole', id: 'lift' + lf, x: lg.x + 30 + lf * 4, z: lg.z - 40 - lf * 70 });
    for (var cb = 0; cb < 6; cb++) place({ kind: 'house', id: 'lgc' + cb, x: lg.x - 50 + cb * 20, z: lg.z + 40, w: 7, d: 6, face: 0, h: 2.8, style: 'old', tint: '#5a4030' });
    safehouse('lgshack', lg.x + 40, lg.z + 10, 'Ski Patrol Hut');
    crowd('lgz', lg.x, lg.z, 120, 22, ['hollow', 'reaper', 'zombie', 'dogpack']);
    itemAt('treasure_lodge', 'treasure', lg.x, lg.z + 2, { name: 'Silver Ski Trophy', value: 5000 });
    // ---- Echo Ridge Observatory
    var ob = poi('observatory'); place({ kind: 'observatory', id: 'obs', x: ob.x, z: ob.z }); safehouse('obshack', ob.x + 25, ob.z, 'Observer\'s Quarters');
    itemAt('treasure_obs', 'treasure', ob.x, ob.z, { name: 'Brass Astrolabe', value: 8000 }); crowd('obz', ob.x, ob.z, 80, 8, ['reaper', 'zombie', 'crows']);
    // ---- Lake Halloran
    var lh = poi('halloran'); place({ kind: 'house', id: 'lhisland', x: lh.x + 30, z: lh.z - 20, w: 8, d: 7, face: 2, h: 3, style: 'old', name: 'Island Cabin', y: lh.water + 0.5 });
    safehouse('lhshack', lh.x - lh.r - 40, lh.z, 'Halloran Boat Rental'); crowd('lhz', lh.x, lh.z, lh.r + 120, 16, ['bloom', 'zombie', 'spider']);
    // ---- Pine Hollow Logging Camp
    var lc = poi('logging'); for (var lp = 0; lp < 8; lp++) place({ kind: 'logpile', id: 'lp' + lp, x: lc.x - 50 + (lp % 4) * 30, z: lc.z - 30 + (lp / 4 | 0) * 50 });
    place({ kind: 'house', id: 'sawmill', x: lc.x + 40, z: lc.z, w: 22, d: 14, face: 3, h: 6, style: 'old', tint: '#6a5038', sign: 'PINE HOLLOW SAWMILL', doorW: 4, doorH: 4, name: 'Sawmill' });
    safehouse('lcshack', lc.x - 70, lc.z + 60, 'Foreman\'s Cabin'); crowd('lcz', lc.x, lc.z, 100, 20, ['hollow', 'hollow', 'dogpack', 'zombie']); spawnAt('butcher', 'butcher3', lc.x + 40, lc.z);
    // story items for the longer Act 2
    var hp2 = poi('harlan'); itemAt('fuel', 'fuel', hp2.x + 23, hp2.z + 4.6, { name: 'Fuel Can' });
    // side quest: Raven Unit dog tags, lost when the helicopter went down
    [[-1600 + 6, -820 + 3], [mn.x + 1, mn.z + 9], [q.x + 40, q.z - 30], [rg.x + 3, rg.z - 4], [poi('lake').x + 240, poi('lake').z - 120], [poi('odell').x - 10, poi('odell').z + 20]].forEach(function (p, i) { itemAt('tag' + i, 'dogtag', p[0], p[1], { name: 'Raven Unit Dog Tag' }); });
    // side quest: Velgen sample cases scattered by the outbreak
    for (var sv = 0; sv < 24; sv++) { var sx = (r() * 2 - 1) * (T.HALF - 900), sz = (r() * 2 - 1) * (T.HALF - 900); if (!clearOf(sx, sz, 20) || T.inWaterExact(sx, sz)) { sv--; continue; } itemAt('sample' + sv, 'sample', sx, sz, { name: 'Velgen Sample Case' }); place({ kind: 'crash', id: 'samplecrash' + sv, x: sx + 5, z: sz + 4, rot: r() * 6 }); }
    // bounty targets
    spawnAt('spider', 'broodmother', mn.x + 4, mn.z + 18, { boss: true });
    spawnAt('reaper', 'alpha', rg.x + 40, rg.z - 30, { boss: true });
    itemAt('rifle', 'rifle', 440, 869, { y: 0.95, name: 'Remington 700 Rifle' });
    itemAt('treasure_bell', 'treasure', mb.x, mb.z + 14, { y: 0.1, name: 'Millbrook Silver Bell', value: 4000 });
    itemAt('treasure_mine', 'treasure', mn.x + 2, mn.z - 6, { name: 'Copper Idol', value: 6000 });
    itemAt('treasure_lab', 'treasure', fl.x, fl.z + 2, { y: 0.9, name: 'Velgen Prototype Vial', value: 8000 });
    itemAt('rpg', 'rpg', q.x + 3, q.z + 3, { name: 'M72 Rocket Launcher' });
    itemAt('gl', 'gl', fl.x + 3, fl.z - 2, { y: 0.9, name: 'M79 Grenade Launcher' });
    itemAt('file_dispatch', 'file', 448, 866, { y: 0.95, file: 'dispatch' });
    itemAt('file_pastor', 'file', ch.x - 46, ch.z - 40, { y: 0.8, file: 'pastor' });
    itemAt('file_hollow', 'file', mb.x + 3, mb.z + 3, { y: 0.1, file: 'hollow' });
    itemAt('file_field', 'file', fl.x - 2, fl.z + 1, { y: 0.9, file: 'field' });
    itemAt('file_ranger', 'file', rg.x + 12, rg.z + 1, { y: 0.8, file: 'ranger' });
    itemAt('file_quarry', 'file', q.x + 50, q.z + 70, { file: 'quarry' });
  }
  T.inWaterExact = function (x, z) { var l = T.lakeAt(x, z, -20); return !!l && (!l.bayou || T.hExact(x, z) < l.water); };

  // ------------------------------------------------------------ chunk build
  function terrainMesh(c) {
    var n = S + 1, x0 = c.cx * CH, z0 = c.cz * CH, step = CH / S;
    var g = new THREE.PlaneGeometry(CH, CH, S, S); g.rotateX(-Math.PI / 2);
    var pos = g.attributes.position, uv = g.attributes.uv, cols = new Float32Array(pos.count * 3);
    var H = new Float32Array(n * n);
    for (var iz = 0; iz < n; iz++) for (var ix = 0; ix < n; ix++) H[iz * n + ix] = T.hExact(x0 + ix * step, z0 + iz * step);
    c.hg = H;
    var cg = new THREE.Color(), lk;
    for (var i = 0; i < pos.count; i++) {
      var lx = pos.getX(i) + CH / 2, lz = pos.getZ(i) + CH / 2, ix2 = Math.round(lx / step), iz2 = Math.round(lz / step);
      var wx = x0 + lx, wz = z0 + lz, h = H[iz2 * n + ix2];
      pos.setXYZ(i, wx, h, wz); uv.setXY(i, wx / 6, wz / 6);
      var hx = H[iz2 * n + Math.min(S, ix2 + 1)] - H[iz2 * n + Math.max(0, ix2 - 1)], hz = H[Math.min(S, iz2 + 1) * n + ix2] - H[Math.max(0, iz2 - 1) * n + ix2];
      var slope = Math.sqrt(hx * hx + hz * hz) / (2 * step);
      var nz = fbm(wx / 60, wz / 60, 2), rd = T.roadDist(wx, wz);
      if (rd < 0.5) cg.set(rd < -1 ? '#26272a' : '#33302c');
      else if (slope > 0.75) cg.set('#4e4c48');
      else if ((lk = T.lakeAt(wx, wz, 60)) && h < lk.water + 1.2) cg.set(lk.bayou ? '#2e3220' : '#3a3226');
      else if (h > 150 + 25 * fbm(wx / 90, wz / 90, 1)) cg.set(slope > 0.6 ? '#9a9c9e' : '#d8dde2');
      else if (nz > 0.25) cg.set('#4a4230');
      else cg.set(nz < -0.3 ? '#2c3a20' : '#34402a');
      if (rd >= 0.5 && rd < 2.5) cg.lerp(new THREE.Color('#3e3528'), 0.6);
      cg.convertSRGBToLinear();
      var v = 0.85 + 0.3 * fbm(wx / 9, wz / 9, 1);
      cols[i * 3] = cg.r * v; cols[i * 3 + 1] = cg.g * v; cols[i * 3 + 2] = cg.b * v;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals(); g.computeBoundingSphere();
    var m = new THREE.Mesh(g, mats.terrain); m.receiveShadow = true; c.group.add(m);
  }
  function scatter(c) {
    var r = rng(hash(c.cx, c.cz) * 1e9), x0 = c.cx * CH, z0 = c.cz * CH, mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), p = new V3();
    var lists = { pine: [], dead: [], oak: [], bush: [], rock: [] };
    var dens = 0.5 + 0.5 * fbm(x0 / 500, z0 / 500, 2);
    var count = Math.floor(40 + dens * 160);
    for (var i = 0; i < count; i++) {
      var x = x0 + r() * CH, z = z0 + r() * CH;
      var f = fbm(x / 140, z / 140, 2); if (f < -0.25 && r() < 0.7) continue;
      if (!clearOf(x, z, 4)) { if (r() < 0.97) continue; if (T.roadDist(x, z) < 6) continue; }
      var lkx = T.lakeAt(x, z, 20); if (lkx && (!lkx.bayou || T.height(x, z) < lkx.water + 0.3)) continue;
      var h = T.height(x, z), t = r();
      var kind = Math.max(Math.abs(x), Math.abs(z)) > T.HALF - 700 || h > 140 ? (t < 0.6 ? 'pine' : 'rock') : T.lakeAt(x, z, 0) && T.lakeAt(x, z, 0).bayou ? (t < 0.6 ? 'dead' : 'bush') : t < 0.55 ? 'pine' : t < 0.68 ? 'oak' : t < 0.78 ? 'dead' : t < 0.93 ? 'bush' : 'rock';
      var s = kind === 'rock' ? 0.5 + r() * 2 : kind === 'bush' ? 0.7 + r() * 0.8 : 0.8 + r() * 0.7;
      lists[kind].push([x, h - (kind === 'rock' ? s * 0.4 : 0.1), z, s, r() * 6.28]);
      if (kind === 'pine' || kind === 'oak' || kind === 'dead') c.boxes.push(W.collider(x - 0.3 * s, x + 0.3 * s, z - 0.3 * s, z + 0.3 * s, h - 1, h + 6, 'tree'));
      if (kind === 'rock' && s > 1) c.boxes.push(W.collider(x - 0.8 * s, x + 0.8 * s, z - 0.8 * s, z + 0.8 * s, h - 1, h + s * 0.9, 'rock'));
    }
    Object.keys(lists).forEach(function (k) {
      var L = lists[k]; if (!L.length) return;
      var im = new THREE.InstancedMesh(geos[k], k === 'rock' ? mats.rock : mats.tree, L.length);
      L.forEach(function (e, j) { p.set(e[0], e[1], e[2]); q.setFromEuler(new THREE.Euler(k === 'rock' ? e[4] : 0, e[4], 0)); sc.set(e[3], e[3] * (k === 'rock' ? 0.7 : 1), e[3]); mat4.compose(p, q, sc); im.setMatrixAt(j, mat4); });
      im.castShadow = k !== 'bush'; im.receiveShadow = true; c.group.add(im);
    });
  }
  // build helpers bound to a chunk
  function B(c) {
    var g = c.group;
    var api = {
      box: function (x, y, z, w, h, d, mat, collide, uvs) {
        var geo = new THREE.BoxGeometry(w, h, d); var uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], s = uvs || 2.5;
        for (var f = 0; f < 6; f++) for (var v = 0; v < 4; v++) { var i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s); }
        var m = new THREE.Mesh(geo, mat); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m);
        if (collide) c.boxes.push(W.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + h, 'struct'));
        return m;
      },
      mesh: function (geo, mat, x, y, z, rx, ry, rz) { var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; },
      col: function (x0, x1, z0, z1, y0, y1) { c.boxes.push(W.collider(x0, x1, z0, z1, y0, y1, 'struct')); },
      room: function (rm) { rm.chunk = c.k; W.extraRooms.push(rm); c.rooms.push(rm); return rm; },
      door: function (d) { d.panels = []; d.box = { on: false }; d.open = true; d.t = 1; W.doors.push(d); c.doors.push(d); return d; },
      spot: function (s) { var sp = W.spot(s.id, s.x, s.z, s.r, s.prompt, s.fn, s.y); c.spots.push(sp); return sp; }
    };
    return api;
  }
  T.B = B;
  // a rectangular building with one room and a doorway on side `face` (0:-z,1:+x,2:+z,3:-x)
  function building(c, o) {
    var b = B(c), x = o.x, z = o.z, w = o.w, d = o.d, H = o.h || 3.2, face = o.face || 0, th = 0.25;
    var y = o.y !== undefined ? o.y : Math.min(T.hExact(x - w / 2, z - d / 2), T.hExact(x + w / 2, z - d / 2), T.hExact(x - w / 2, z + d / 2), T.hExact(x + w / 2, z + d / 2), T.hExact(x, z));
    var hi = Math.max(T.hExact(x - w / 2, z - d / 2), T.hExact(x + w / 2, z - d / 2), T.hExact(x - w / 2, z + d / 2), T.hExact(x + w / 2, z + d / 2), T.hExact(x, z));
    if (hi - y > 0.3) y = hi - 0.05; // sit on a foundation
    var wallMat = o.style === 'brick' ? mats.brick : o.style === 'concrete' ? mats.concrete : (function () { var m = mats.siding.clone(); m.color.set(o.tint || '#c8c0b0').convertSRGBToLinear(); return m; })();
    if (o.style === 'old') { wallMat = mats.wood.clone(); wallMat.color.set(o.tint || '#7a6a58').convertSRGBToLinear(); }
    b.box(x, y - 3, z, w + 0.4, 3.08, d + 0.4, mats.concrete, false);
    var dw = o.doorW || 1.5, dh = o.doorH || 2.3;
    function wallX(zz, isDoor) { if (!isDoor) { b.box(x, y, zz, w, H, th, wallMat, true); return; } b.box(x - (w + dw) / 4, y, zz, (w - dw) / 2, H, th, wallMat, true); b.box(x + (w + dw) / 4, y, zz, (w - dw) / 2, H, th, wallMat, true); b.box(x, y + dh, zz, dw, H - dh, th, wallMat, false); }
    function wallZ(xx, isDoor) { if (!isDoor) { b.box(xx, y, z, th, H, d, wallMat, true); return; } b.box(xx, y, z - (d + dw) / 4, th, H, (d - dw) / 2, wallMat, true); b.box(xx, y, z + (d + dw) / 4, th, H, (d - dw) / 2, wallMat, true); b.box(xx, y + dh, z, th, H - dh, dw, wallMat, false); }
    wallX(z - d / 2, face === 0); wallX(z + d / 2, face === 2); wallZ(x + w / 2, face === 1); wallZ(x - w / 2, face === 3);
    // windows
    var lit = o.lit !== undefined ? o.lit : Math.random() < 0.15;
    [[0, -1], [0, 1], [1, 0], [-1, 0]].forEach(function (s, si) {
      var fi = [0, 2, 1, 3][si]; var along = s[0] === 0 ? w : d; if (along < 5) return;
      [-0.28, 0.28].forEach(function (k) {
        if (fi === face && Math.abs(k) < 0.4) return;
        var px = s[0] === 0 ? x + k * w : x + s[0] * (w / 2 + 0.135), pz = s[0] === 0 ? z + s[1] * (d / 2 + 0.135) : z + k * d;
        var win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), lit ? mats.windowLit : mats.window); win.position.set(px, y + 1.6, pz); win.rotation.y = s[0] === 0 ? (s[1] > 0 ? 0 : Math.PI) : (s[0] > 0 ? Math.PI / 2 : -Math.PI / 2); c.group.add(win);
      });
    });
    // floor and ceiling
    var fl = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, d - 0.3), mats.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(x, y + 0.02, z); fl.receiveShadow = true; c.group.add(fl);
    var cl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std({ color: '#2a2622', roughness: 1 })); cl.rotation.x = Math.PI / 2; cl.position.set(x, y + H - 0.02, z); c.group.add(cl);
    // gable roof
    var ridgeAlongX = w >= d, span = ridgeAlongX ? d : w, len = ridgeAlongX ? w : d, rise = span * 0.35, slope = Math.sqrt((span / 2) * (span / 2) + rise * rise), ang = Math.atan2(rise, span / 2);
    if (o.flatRoof) b.box(x, y + H, z, w + 0.4, 0.3, d + 0.4, mats.concrete, false);
    else [-1, 1].forEach(function (sd) {
      var rf = new THREE.Mesh(new THREE.BoxGeometry(ridgeAlongX ? len + 0.6 : slope + 0.4, 0.14, ridgeAlongX ? slope + 0.4 : len + 0.6), mats.shingle);
      if (ridgeAlongX) { rf.position.set(x, y + H + rise / 2, z + sd * span / 4); rf.rotation.x = sd * ang; } else { rf.position.set(x + sd * span / 4, y + H + rise / 2, z); rf.rotation.z = -sd * ang; }
      rf.castShadow = true; c.group.add(rf);
      var gab = new THREE.Shape(); gab.moveTo(-span / 2, 0); gab.lineTo(span / 2, 0); gab.lineTo(0, rise); gab.closePath();
      var gm = new THREE.Mesh(new THREE.ShapeGeometry(gab), wallMat); gm.material = wallMat; gm.material.side = THREE.DoubleSide;
      if (ridgeAlongX) { gm.rotation.y = Math.PI / 2; gm.position.set(x + sd * w / 2, y + H, z); } else gm.position.set(x, y + H, z + sd * d / 2);
      c.group.add(gm);
    });
    if (o.sign) { var sm = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w - 1, 6), 1.1), std({ map: T.signTex(o.sign, '#1a1410', '#d8c890'), emissive: '#ffffff', emissiveMap: T.signTex(o.sign, '#1a1410', '#d8c890'), emissiveIntensity: 0.25 })); var sx = face === 1 ? x + w / 2 + 0.2 : face === 3 ? x - w / 2 - 0.2 : x, sz = face === 0 ? z - d / 2 - 0.2 : face === 2 ? z + d / 2 + 0.2 : z; sm.position.set(sx, y + H - 0.5, sz); sm.rotation.y = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][face]; c.group.add(sm); }
    var rid = 'room_' + o.id;
    b.room({ id: rid, name: o.name || (o.sign ? o.sign.charAt(0) + o.sign.slice(1).toLowerCase() : 'House'), x0: x - w / 2 + th / 2, x1: x + w / 2 - th / 2, z0: z - d / 2 + th / 2, z1: z + d / 2 - th / 2, y: y, h: H, floor: 'wood', wall: 'panel', safe: !!o.safe });
    var dx = face === 1 ? x + w / 2 : face === 3 ? x - w / 2 : x, dz = face === 0 ? z - d / 2 : face === 2 ? z + d / 2 : z;
    b.door({ id: 'door_' + o.id, a: rid, b: null, x: dx, z: dz, axis: face % 2 ? 'z' : 'x', along: face % 2 ? z : x, w: dw, c: face % 2 ? dx : dz });
    // furniture
    var r = rng(hash(Math.round(x), Math.round(z)) * 1e9);
    if (!o.empty) {
      var tx = x + (r() - .5) * (w - 3), tz = z + (r() - .5) * (d - 3);
      b.box(tx, y, tz, 1.4, 0.78, 0.8, mats.darkwood, true);
      if (r() < 0.6) b.box(x - w / 2 + 1.1, y, z + d / 2 - 0.6, 1.9, 0.5, 0.9, mats.cloth, true);
      if (r() < 0.6) b.box(x + w / 2 - 0.5, y, z - d / 2 + 1.2, 0.5, 1.9, 1.6, mats.darkwood, true);
      c.furn = c.furn || []; c.furn.push([tx, y + 0.78, tz]);
    }
    return { y: y, x: x, z: z, w: w, d: d, room: rid };
  }
  T.building = building;
  T.mats = mats;
  // ------------------------------------------------------------ chunks
  T.init = function (sc) {
    scene = sc; W = NF.world; Mo = NF.models; std = Mo.std;
    initAssets(); initPlacements();
    // global water
    T.lakes.forEach(function (lake) {
      var water = new THREE.Mesh(new THREE.CircleGeometry(lake.r + (lake.bayou ? 120 : 80), 64), lake.bayou ? mats.swamp : mats.water); water.rotation.x = -Math.PI / 2; water.position.set(lake.x, lake.water, lake.z); scene.add(water);
    });
    T.ready = true;
  };
  function buildChunk(cx, cz) {
    var k = cx + ',' + cz, c = { cx: cx, cz: cz, k: k, group: new THREE.Group(), boxes: [], rooms: [], doors: [], spots: [], items: [], enemies: [] };
    T.chunks[k] = c;
    terrainMesh(c);
    var bk = buckets[k];
    if (bk) bk.s.forEach(function (o) { try { NF.structures.build(c, o); } catch (err) { console.error('structure', o.kind, err); } });
    scatter(c);
    scene.add(c.group);
    c.ready = true;
    return c;
  }
  function freeChunk(c) {
    scene.remove(c.group);
    c.group.traverse(function (o) { if (o.geometry && !o.geometry._shared && o.geometry !== geos.pine && o.geometry !== geos.dead && o.geometry !== geos.oak && o.geometry !== geos.bush && o.geometry !== geos.rock && o.geometry !== geos.grave) o.geometry.dispose(); });
    c.boxes.forEach(W.removeCollider);
    c.rooms.forEach(function (r) { var i = W.extraRooms.indexOf(r); if (i >= 0) W.extraRooms.splice(i, 1); });
    c.doors.forEach(function (d) { var i = W.doors.indexOf(d); if (i >= 0) W.doors.splice(i, 1); });
    c.spots.forEach(function (s) { var i = W.spots.indexOf(s); if (i >= 0) W.spots.splice(i, 1); });
    c.items.forEach(function (it) { W.removeItem(it); });
    c.enemies.forEach(function (e) { if (!e.dead || e.t > 0) NF.enemies.remove(e); });
    if (c.extra) c.extra.forEach(function (f) { f(); });
    T.lamps = T.lamps.filter(function (l) { return l.chunk !== c.k; });
    delete T.chunks[c.k];
  }
  function activate(c, flags) {
    if (c.active) return; c.active = true;
    var bk = buckets[c.k]; if (!bk) return;
    var taken = flags.taken || {}, killed = flags.killed || {};
    bk.i.forEach(function (o) {
      if (taken[o.id]) return;
      var y = o.y !== undefined ? T.groundY(o.x, o.z) + o.y : T.groundY(o.x, o.z);
      var it = W.item(o.id, o.type, o.x, y, o.z, { amount: o.amount || defaultAmount(o.type), name: o.name, file: o.file, value: o.value });
      c.items.push(it);
    });
    bk.e.forEach(function (o) {
      if (o.type === 'dogpack') { for (var di = 0; di < 3; di++) { var id = o.id + '_' + di; if (killed[id]) continue; var de = NF.enemies.spawn('dog', id, o.x + di * 2, o.z + (di % 2) * 2, { chunk: c.k, seed: di + 3, yaw: Math.random() * 6.28 }); c.enemies.push(de); de.far = true; } return; }
      if (killed[o.id]) return;
      var gate = NF.game.spawnGate ? NF.game.spawnGate(o) : true; if (!gate) return;
      var e = NF.enemies.spawn(o.type, o.id, o.x, o.z, { variant: o.variant, weapon: o.weapon, revenant: o.revenant, boss: o.boss, chunk: c.k, yaw: Math.random() * 6.28, seed: hash(Math.round(o.x), Math.round(o.z)) * 1e5 | 0 });
      if (e) { c.enemies.push(e); e.far = true; }
    });
  }
  T.groundY = function (x, z) { return W.ground(x, z); };
  function defaultAmount(t) { return t === 'hg_ammo' ? 10 + (Math.random() * 8 | 0) : t === 'sg_ammo' ? 4 + (Math.random() * 3 | 0) : t === 'smg_ammo' ? 30 : t === 'rifle_ammo' ? 5 : t === 'mag_ammo' ? 3 : t === 'money' ? 50 * (2 + (Math.random() * 10 | 0)) : t === 'grenade' ? 1 : t === 'powder' ? 1 : t === 'gl_ammo' ? 3 : t === 'rpg_ammo' ? 1 : undefined; }
  T.defaultAmount = defaultAmount;
  var queue = [];
  T.update = function (px, pz, flags, force) {
    if (!T.ready) return;
    var pcx = Math.floor(px / CH), pcz = Math.floor(pz / CH), R = 2;
    // unload far chunks
    Object.keys(T.chunks).forEach(function (k) { var c = T.chunks[k]; if (Math.abs(c.cx - pcx) > R + 1 || Math.abs(c.cz - pcz) > R + 1) freeChunk(c); });
    var want = [];
    for (var dx = -R; dx <= R; dx++) for (var dz = -R; dz <= R; dz++) { var cx = pcx + dx, cz = pcz + dz; if (Math.abs(cx) > T.NCH || Math.abs(cz) > T.NCH) continue; if (!T.chunks[cx + ',' + cz]) want.push([cx, cz, dx * dx + dz * dz]); }
    want.sort(function (a, b) { return a[2] - b[2]; });
    var budget = force ? 99 : 1;
    for (var i = 0; i < want.length && budget > 0; i++) { buildChunk(want[i][0], want[i][1]); budget--; }
    // activate items and enemies in the near ring
    Object.keys(T.chunks).forEach(function (k) { var c = T.chunks[k]; var near = Math.abs(c.cx - pcx) <= 1 && Math.abs(c.cz - pcz) <= 1; if (near) activate(c, flags); });
  };
  T.pending = function (px, pz) { var pcx = Math.floor(px / CH), pcz = Math.floor(pz / CH); for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) if (!T.chunks[(pcx + dx) + ',' + (pcz + dz)]) return true; return false; };
  T.nearestPoi = function (x, z) { var best = null, bd = 1e9; T.pois.forEach(function (p) { var d = Math.hypot(x - p.x, z - p.z) - p.r; if (d < bd) { bd = d; best = p; } }); return bd < 40 ? best : null; };
  return T;
})();
