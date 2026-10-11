// Battlefield generation: terrain, 34 biomes, 14 layouts, structures, props, sky, collision and a nav grid for bots.
var SF = window.SF || (window.SF = {});

(function () {
  var W = SF.World = {};

  // ------------------------------------------------------------------ noise
  function rng(seed) {
    var a = seed >>> 0 || 1;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  W.rng = rng;
  function hash2(i, j, s) {
    var h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 982451653);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  }
  function vnoise(x, z, s) {
    var i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
    var u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    var a = hash2(i, j, s), b = hash2(i + 1, j, s), c = hash2(i, j + 1, s), d = hash2(i + 1, j + 1, s);
    return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
  }
  function fbm(x, z, s, oct) {
    var t = 0, amp = 0.5, f = 1;
    for (var o = 0; o < (oct || 4); o++) { t += (vnoise(x * f, z * f, s + o * 17) - 0.5) * 2 * amp; amp *= 0.5; f *= 2.03; }
    return t;
  }
  W.fbm = fbm;

  // ------------------------------------------------------------------ biomes
  var B = W.biomes = {
    desert: { g: [0xd9b67c, 0xcaa063, 0xa98052], sky: [0x5e9ad8, 0xf0dcb4], fog: 0xe9d5ac, fd: 0.0028, sun: 0xfff0d6, si: 1.7, amb: 0.55, amp: 14, rough: 0.012, props: { rock: 0.4, boulder: 0.2, vapor: 0.15 }, wall: 0xd8c8a8, roof: 0xc8b088, accent: 0x8a6a4a, suns: 2 },
    desertTown: { base: 'desert', amp: 6, props: { rock: 0.3, vapor: 0.2, crate: 0.4 } },
    ice: { g: [0xf3f7fb, 0xe0e9f3, 0xb9c9da], sky: [0x8fa8c2, 0xe2eaf2], fog: 0xdce5ee, fd: 0.006, sun: 0xffffff, si: 1.15, amb: 0.75, amp: 11, rough: 0.01, props: { icerock: 0.5, boulder: 0.1 }, wall: 0xc8ccd0, roof: 0xa8acb2, accent: 0x6a7280, snowfall: 0.6 },
    forest: { g: [0x3d5a2a, 0x4c6a33, 0x5a5839], sky: [0x6fa2d6, 0xcfe0e6], fog: 0x93a88a, fd: 0.0075, sun: 0xfff2d0, si: 1.2, amb: 0.5, amp: 12, rough: 0.012, props: { redwood: 1.0, fern: 1.4, log: 0.2, boulder: 0.15 }, wall: 0x7a6a50, roof: 0x5a4a38, accent: 0x6a7a5a },
    plains: { g: [0x6ea44c, 0x7db35c, 0x8d9c6a], sky: [0x4f92e6, 0xd8ecfa], fog: 0xc8dcea, fd: 0.0025, sun: 0xfff4dc, si: 1.6, amb: 0.55, amp: 18, rough: 0.008, props: { broadtree: 0.35, rock: 0.25, flower: 1.2 }, wall: 0xdcccA4, roof: 0x5a8a6a, accent: 0xb8a070 },
    classical: { base: 'plains', amp: 5, props: { broadtree: 0.25, flower: 0.6 }, wall: 0xdccca4, roof: 0x5f8f6e },
    redrock: { g: [0xbb683c, 0xa4532f, 0x8a4c30], sky: [0xd98c5c, 0xf2c494], fog: 0xd8a07a, fd: 0.004, sun: 0xffe0b8, si: 1.6, amb: 0.5, amp: 22, rough: 0.01, props: { spire: 0.3, rock: 0.4, boulder: 0.2 }, wall: 0xa86040, roof: 0x8a4a30, accent: 0x6a3a22 },
    ocean: { g: [0x6a7078, 0x5a6068, 0x4a5058], sky: [0x3c4a5a, 0x7c8c9c], fog: 0x6c7c8c, fd: 0.008, sun: 0xd8e4f0, si: 0.9, amb: 0.7, amp: 2, rough: 0.01, water: { level: -2, color: 0x2a4a5a }, void: -14, props: {}, wall: 0xe8eef2, roof: 0xb8c4cc, accent: 0x3a5a7a, rain: 0.8 },
    jungle: { g: [0x3b6b2b, 0x4b7b33, 0x5b6b3b], sky: [0x6aa2ca, 0xd0e8da], fog: 0x9ab8a0, fd: 0.006, sun: 0xfff0d0, si: 1.3, amb: 0.55, amp: 14, rough: 0.011, props: { wroshyr: 0.12, palm: 0.4, fern: 1.4, jungletree: 0.6 }, wall: 0x8a6a40, roof: 0x5a4a30, accent: 0x6a8a4a },
    sky: { g: [0x8a8a8a, 0x8a8a8a, 0x8a8a8a], sky: [0xe0905e, 0xf8d6ae], fog: 0xf0c8a0, fd: 0.003, sun: 0xffd8a8, si: 1.4, amb: 0.65, amp: 0, void: -120, clouds: 0xf4d0b0, props: {}, wall: 0xe8e2da, roof: 0xd8885a, accent: 0x8a6a5a },
    skycity: { base: 'sky' },
    jungleTemple: { base: 'jungle', props: { jungletree: 1.2, fern: 1.6, palm: 0.2, boulder: 0.1 }, wall: 0x8a8a7a, roof: 0x6a6a5a, gasGiant: true },
    snow: { g: [0xe9eff5, 0xd1dbe5, 0xa9b5c1], sky: [0x8996a5, 0xc9d1d9], fog: 0xc8d0d8, fd: 0.006, sun: 0xf0f4ff, si: 1.0, amb: 0.75, amp: 16, rough: 0.012, props: { snowpine: 0.6, icerock: 0.3 }, wall: 0x8a8e94, roof: 0x6a6e74, accent: 0x5a6a8a, snowfall: 0.9 },
    lava: { g: [0x2b2522, 0x3a312b, 0x1b1715], sky: [0x3b1a12, 0xa64422], fog: 0x5c2a18, fd: 0.006, sun: 0xff9a5a, si: 1.0, amb: 0.45, amp: 18, rough: 0.012, lava: { level: -3, color: 0xff5a10 }, props: { lavarock: 0.6 }, wall: 0x4a4e54, roof: 0x3a3e44, accent: 0xff7a2a, embers: 1 },
    sinkhole: { g: [0xa99b82, 0x958a74, 0x7a7262], sky: [0x98a0a8, 0xd8d8d0], fog: 0xc8c8c0, fd: 0.004, sun: 0xfff4e0, si: 1.3, amb: 0.6, amp: 10, rough: 0.01, props: { rock: 0.3, boulder: 0.2 }, wall: 0xb8ac94, roof: 0x8a8070, accent: 0x6a8a9a },
    metro: { g: [0x8a8e94, 0x8a8e94, 0x7a7e84], sky: [0xe39a5e, 0xf6d6ae], fog: 0xd8b090, fd: 0.004, sun: 0xffd8a8, si: 1.4, amb: 0.55, amp: 0, props: { crate: 0.3 }, wall: 0xb8b0a0, roof: 0x8a8680, accent: 0xc8a040, skyline: 1, paved: true },
    metroNight: { g: [0x3a3e44, 0x3a3e44, 0x2a2e34], sky: [0x0a0c18, 0x2a2440], fog: 0x1a1830, fd: 0.006, sun: 0x8a9ac8, si: 0.5, amb: 0.4, amp: 0, props: { crate: 0.4 }, wall: 0x4a4e58, roof: 0x2a2e38, accent: 0xff3aa0, skyline: 1, neon: 1, night: 1, paved: true },
    fungal: { g: [0x3c6a3c, 0x5a8a3c, 0x7a6a3c], sky: [0x78b0a0, 0xd6f0c6], fog: 0x9ac8a8, fd: 0.006, sun: 0xfff8d0, si: 1.2, amb: 0.6, amp: 16, rough: 0.012, props: { mushroom: 0.5, fern: 1.0, pod: 0.4 }, wall: 0x7a8a6a, roof: 0x5a6a4a, accent: 0xd84aa0 },
    crystal: { g: [0x3a4048, 0x2e343c, 0x464c54], sky: [0x26303c, 0x56667a], fog: 0x3c4a5a, fd: 0.007, sun: 0xb8d0ff, si: 0.7, amb: 0.5, amp: 12, rough: 0.012, props: { crystal: 0.6, rock: 0.3 }, wall: 0x5a6068, roof: 0x3a4048, accent: 0x4ad8ff, rain: 0.9, night: 1 },
    asteroid: { g: [0x8e8c88, 0x7a7874, 0x5e5c58], sky: [0x02030a, 0x0a0c1a], fog: 0x0a0c14, fd: 0.002, sun: 0xffffff, si: 1.5, amb: 0.4, amp: 14, rough: 0.016, props: { rock: 0.6, boulder: 0.3 }, wall: 0xe8eaee, roof: 0xb8bcc4, accent: 0x4a8ad8, stars: 1, night: 1 },
    swamp: { g: [0x3a4a2a, 0x4a5a32, 0x2a3a22], sky: [0x6a7a6a, 0xaab8a0], fog: 0x6a7a62, fd: 0.016, sun: 0xd8e0c0, si: 0.8, amb: 0.65, amp: 6, rough: 0.012, water: { level: -0.6, color: 0x3a4a2a }, props: { gnarl: 0.7, fern: 1.0, reed: 0.8 }, wall: 0x5a5a4a, roof: 0x4a4a3a, accent: 0x7a8a5a },
    station: { g: [0x4a4e54, 0x44484e, 0x3a3e44], sky: [0x02030a, 0x0a0c18], fog: 0x0a0c14, fd: 0.004, sun: 0xd8e4ff, si: 1.1, amb: 0.55, amp: 0, props: { crate: 0.4 }, wall: 0x5a5e66, roof: 0x3a3e44, accent: 0x8ab0ff, stars: 1, paved: true, night: 1 },
    ship: { g: [0xd8dce0, 0xd0d4d8, 0xc8ccd0], sky: [0x02030a, 0x0a0c18], fog: 0x0a0c14, fd: 0.004, sun: 0xffffff, si: 1.0, amb: 0.75, amp: 0, props: { crate: 0.2 }, wall: 0xe8ecf0, roof: 0xc8ccd0, accent: 0xb83030, stars: 1, paved: true },
    junk: { base: 'desert', props: { rock: 0.3, boulder: 0.2, junk: 0.6 }, wall: 0x8a8a8a },
    tropical: { g: [0xe6d6a6, 0x6aa04a, 0x5a8a3a], sky: [0x3c8ae6, 0xd0eaff], fog: 0xb8dcf0, fd: 0.003, sun: 0xfff4dc, si: 1.7, amb: 0.55, amp: 12, rough: 0.01, water: { level: -1.5, color: 0x2a9ab8 }, props: { palm: 0.8, fern: 0.6 }, wall: 0x8a8e94, roof: 0x5a5e66, accent: 0xd8a040, sandShore: true },
    mine: { g: [0x5c524a, 0x4a423c, 0x6a5e52], sky: [0x8a7a6a, 0xc8b8a0], fog: 0x9a8a7a, fd: 0.006, sun: 0xffe8c8, si: 1.2, amb: 0.5, amp: 18, rough: 0.012, props: { rock: 0.6, boulder: 0.3, crate: 0.3 }, wall: 0x6a6058, roof: 0x4a4038, accent: 0xd8a040 },
    lake: { base: 'plains', water: { level: -2.5, color: 0x3a6a8a }, props: { broadtree: 0.6, rock: 0.2, flower: 0.6 }, wall: 0x8a8070, roof: 0x5a5048 },
    salt: { g: [0xf2f0ec, 0xe8e4de, 0xb84a3a], sky: [0x98a8b8, 0xe8e8ec], fog: 0xe0e0e4, fd: 0.003, sun: 0xffffff, si: 1.5, amb: 0.65, amp: 6, rough: 0.01, props: { rock: 0.2 }, wall: 0x8a8e94, roof: 0x5a5e66, accent: 0xb84a3a, salt: true },
    snowforest: { base: 'snow', props: { snowpine: 1.4, icerock: 0.2 }, wall: 0x2a2c30, roof: 0x1a1c20, accent: 0xd83a3a },
    grass: { g: [0x7a9a4a, 0x8aa45a, 0x9a9a6a], sky: [0x5a9ae0, 0xe0ecf4], fog: 0xd0dce4, fd: 0.0025, sun: 0xfff4dc, si: 1.6, amb: 0.55, amp: 12, rough: 0.008, props: { pillar: 0.12, rock: 0.3, flower: 1.0 }, wall: 0x8a8070, roof: 0x5a5048, accent: 0xb8a070 },
    hollow: { g: [0x1e1c22, 0x2a2830, 0x141218], sky: [0x0a0814, 0x2a1a40], fog: 0x1a1428, fd: 0.008, sun: 0xa0a0ff, si: 0.8, amb: 0.45, amp: 16, rough: 0.012, props: { spire: 0.3, rock: 0.4 }, wall: 0x2a2830, roof: 0x1a1820, accent: 0x6a4aff, night: 1, lightning: 1 },
    lavafield: { g: [0x2a2624, 0x3a3430, 0x4a2a1a], sky: [0x6a5a4a, 0xc8a080], fog: 0x8a7060, fd: 0.005, sun: 0xffd8b0, si: 1.3, amb: 0.5, amp: 10, rough: 0.012, lava: { level: -3.5, color: 0xff6a20 }, props: { lavarock: 0.5 }, wall: 0x8a7a68, roof: 0x5a4a3a, accent: 0xd88a3a },
    farm: { g: [0x5a8a3a, 0x7a9a4a, 0x6a7a4a], sky: [0x6aa2d8, 0xdcecf2], fog: 0xb8d0c8, fd: 0.004, sun: 0xfff4dc, si: 1.5, amb: 0.55, amp: 8, rough: 0.01, water: { level: -1.8, color: 0x4a7a8a }, props: { broadtree: 0.9, fern: 0.5, flower: 0.8 }, wall: 0x9a8058, roof: 0x7a6040, accent: 0x6a8a4a },
    space: { sky: [0x000005, 0x05060e], stars: 1, sun: 0xfff4e8, si: 1.6, amb: 0.35, amp: 0, props: {} }
  };
  Object.keys(B).forEach(function (k) {
    var b = B[k];
    if (b.base) { var base = B[b.base]; for (var p in base) if (b[p] === undefined) b[p] = base[p]; }
  });

  // ------------------------------------------------------------------ static geometry merger
  function Merger() { this.pos = []; this.nor = []; this.col = []; this.idx = []; this.n = 0; }
  var _v = new THREE.Vector3(), _c = new THREE.Color(), _m3 = new THREE.Matrix3();
  Merger.prototype.add = function (geo, matrix, color, shade) {
    var p = geo.attributes.position, nn = geo.attributes.normal, ix = geo.index;
    _m3.getNormalMatrix(matrix);
    _c.set(color);
    var base = this.n;
    for (var i = 0; i < p.count; i++) {
      _v.fromBufferAttribute(p, i).applyMatrix4(matrix);
      this.pos.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(nn, i).applyMatrix3(_m3).normalize();
      this.nor.push(_v.x, _v.y, _v.z);
      var k = shade ? 1 - shade * (0.5 - _v.y * 0.5) : 1;
      this.col.push(_c.r * k, _c.g * k, _c.b * k);
    }
    if (ix) for (i = 0; i < ix.count; i++) this.idx.push(base + ix.getX(i));
    else for (i = 0; i < p.count; i++) this.idx.push(base + i);
    this.n += p.count;
  };
  Merger.prototype.build = function (mat) {
    if (!this.n) return null;
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return new THREE.Mesh(g, mat);
  };
  W.Merger = Merger;

  var GEO = {
    box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12), cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
    cone: new THREE.ConeGeometry(0.5, 1, 9), cone5: new THREE.ConeGeometry(0.5, 1, 5), sph: new THREE.SphereGeometry(0.5, 12, 8), hemi: new THREE.SphereGeometry(0.5, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2),
    ico: new THREE.IcosahedronGeometry(0.5, 0), ico1: new THREE.IcosahedronGeometry(0.5, 1), taper: new THREE.CylinderGeometry(0.3, 0.5, 1, 10), dod: new THREE.DodecahedronGeometry(0.5, 0)
  };
  // noise-displaced rock shapes so boulders read as real stone, not dice
  (function () {
    for (var v = 0; v < 4; v++) {
      var g = new THREE.IcosahedronGeometry(0.5, 2), p = g.attributes.position, q = new THREE.Vector3();
      for (var i = 0; i < p.count; i++) {
        q.fromBufferAttribute(p, i);
        var n = 1 + fbm(q.x * 3 + v * 7, q.z * 3 + q.y * 2, 77 + v, 3) * 0.35 + fbm(q.x * 9, q.y * 9 + v, 91 + v, 2) * 0.08;
        q.multiplyScalar(n); if (q.y < -0.15) q.y = -0.15 + (q.y + 0.15) * 0.3;
        p.setXYZ(i, q.x, q.y * (0.75 + v * 0.1), q.z);
      }
      g.computeVertexNormals();
      GEO['rock' + v] = g;
    }
  })();
  var _mat = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
  function tm(x, y, z, sx, sy, sz, rx, ry, rz) {
    _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
    return _mat.compose(_p, _q, _s);
  }

  // ------------------------------------------------------------------ world object
  W.build = function (map, scene, opts) {
    opts = opts || {};
    var bio = B[map.biome] || B.plains;
    var R = rng(map.seed);
    var half = map.size / 2;
    var w = {
      map: map, bio: bio, half: half, boxes: [], circles: [], grid: {}, cell: 16, cps: [], bases: [], killY: bio.void != null ? bio.void - 10 : -60,
      water: bio.water ? bio.water.level : null, lava: bio.lava ? bio.lava.level : null, group: new THREE.Group(), lights: [], anim: [], space: !!map.space,
      walkerPaths: [], flatZones: []
    };
    w.groundAt = function (x, z, y, step) { return groundAt(w, x, z, y, step); };
    scene.add(w.group);
    if (map.space) { buildSpace(w, map, bio, R, scene); return w; }

    // ---------- height function
    var seed = map.seed % 10007;
    var layout = map.layout;
    var amp = bio.amp, rough = bio.rough || 0.01;
    var flat = bio.amp === 0 || layout === 'corridor' || layout === 'platforms' || (bio.void != null);
    var feat = []; // carve features: {type, ...}
    // canyon: winding valley along z
    var canyonW = half * 0.28;
    function canyonX(z) { return Math.sin(z / half * 2.2 + seed) * half * 0.22; }
    function rawH(x, z) {
      if (flat) return 0;
      var h = fbm(x * rough, z * rough, seed, 5) * amp + fbm(x * rough * 4, z * rough * 4, seed + 9, 3) * amp * 0.12;
      if (layout === 'canyon') {
        var dx = Math.abs(x - canyonX(z));
        var wall = Math.min(1, Math.max(0, (dx - canyonW) / (half * 0.12)));
        h = h * 0.3 + wall * wall * (20 + amp * 1.2) + (map.biome === 'sinkhole' ? -Math.max(0, 1 - Math.hypot(x, z) / (half * 0.25)) * 26 : 0);
      } else if (layout === 'trench') {
        var tz = Math.abs(((z / (half * 0.5)) % 1 + 1) % 1 - 0.5) * 2;
        h = h * 0.6 - (tz < 0.12 ? (1 - tz / 0.12) * 4.5 : 0);
      } else if (layout === 'arena') {
        var r = Math.hypot(x, z) / half;
        h = h * 0.15 + Math.max(0, r - 0.72) * 60;
      } else if (layout === 'harbor') {
        // water on the +x side
        var sx = (x / half - 0.35);
        h = h * 0.7 + (bio.water ? -Math.max(0, sx) * 30 + 2 : 0);
      }
      if (map.biome === 'lava' || map.biome === 'lavafield') {
        // lava channels
        var ch = Math.abs(fbm(x * 0.008, z * 0.008, seed + 3, 3));
        if (ch < 0.08) h -= (1 - ch / 0.08) * 9;
      }
      if (bio.water && layout !== 'harbor' && map.biome !== 'swamp') {
        var lk = fbm(x * 0.006, z * 0.006, seed + 21, 3);
        if (lk > 0.25) h -= (lk - 0.25) * 40;
      }
      // edge mountains to bound the battlefield
      var e = Math.max(Math.abs(x), Math.abs(z)) / half;
      if (e > 0.86 && layout !== 'arena') h += Math.pow((e - 0.86) / 0.14, 2) * (14 + amp);
      return h;
    }

    // ---------- control point & base layout
    var cpN = map.cps || 5;
    var baseZ = half * 0.78;
    w.bases = [{ x: 0, z: -baseZ }, { x: 0, z: baseZ }];
    var cpNames = cpLabels(map, R);
    for (var i = 0; i < cpN; i++) {
      var t = cpN === 1 ? 0.5 : i / (cpN - 1);
      var z = -half * 0.62 + t * half * 1.24;
      var x = (i % 2 === 0 ? -1 : 1) * half * (0.12 + R() * 0.28) * (i === (cpN - 1) / 2 ? 0.3 : 1);
      if (layout === 'canyon') x = canyonX(z) + (R() - 0.5) * canyonW * 0.8;
      if (layout === 'harbor') x = Math.min(x, half * 0.2);
      if (layout === 'corridor' || layout === 'arena') x *= 0.5;
      w.cps.push({ x: x, z: z, name: cpNames[i], r: 9 });
    }
    if (layout === 'canyon') { w.bases[0].x = canyonX(-baseZ); w.bases[1].x = canyonX(baseZ); }
    if (layout === 'harbor') { w.bases[0].x = -half * 0.2; w.bases[1].x = -half * 0.2; }
    // walker lanes (colossus / extraction)
    for (var l = 0; l < 2; l++) {
      var lane = [], lx = (l ? 1 : -1) * half * 0.22;
      for (var k = 0; k <= 12; k++) {
        var zz = half * 0.8 - k / 12 * half * 1.5;
        var xx = lx + Math.sin(k * 0.7 + l * 2 + seed) * half * 0.08;
        if (layout === 'canyon') xx = canyonX(zz) + (l ? 1 : -1) * canyonW * 0.4;
        if (layout === 'harbor') xx = -half * 0.25 + (l ? 1 : -1) * half * 0.15;
        lane.push({ x: xx, z: zz });
      }
      w.walkerPaths.push(lane);
    }

    // ---------- bake height grid
    var N = map.size > 380 ? 150 : 120;
    var step = map.size / N;
    var H = new Float32Array((N + 1) * (N + 1));
    for (var gz = 0; gz <= N; gz++) for (var gx = 0; gx <= N; gx++) H[gz * (N + 1) + gx] = rawH(-half + gx * step, -half + gz * step);
    w.N = N; w.step = step; w.H = H;
    function sampleH(x, z) {
      var fx = (x + half) / step, fz = (z + half) / step;
      if (fx < 0) fx = 0; if (fz < 0) fz = 0; if (fx > N - 0.001) fx = N - 0.001; if (fz > N - 0.001) fz = N - 0.001;
      var ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, n1 = N + 1;
      var a = H[iz * n1 + ix], b = H[iz * n1 + ix + 1], c = H[(iz + 1) * n1 + ix], d = H[(iz + 1) * n1 + ix + 1];
      return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
    }
    w.heightAt = sampleH;
    function flatten(x, z, r, soft, target) {
      var h0 = target != null ? target : sampleH(x, z);
      if (w.water != null && h0 < w.water + 0.6 && !bio.void) h0 = w.water + 0.6;
      if (w.lava != null && h0 < w.lava + 1.5) h0 = w.lava + 1.5;
      var rr = r + soft;
      var x0 = Math.max(0, Math.floor((x - rr + half) / step)), x1 = Math.min(N, Math.ceil((x + rr + half) / step));
      var z0 = Math.max(0, Math.floor((z - rr + half) / step)), z1 = Math.min(N, Math.ceil((z + rr + half) / step));
      for (var iz = z0; iz <= z1; iz++) for (var ix = x0; ix <= x1; ix++) {
        var px = -half + ix * step, pz = -half + iz * step;
        var d = Math.hypot(px - x, pz - z);
        if (d > rr) continue;
        var k = d < r ? 1 : 1 - (d - r) / soft;
        k = k * k * (3 - 2 * k);
        var id = iz * (N + 1) + ix;
        H[id] = H[id] + (h0 - H[id]) * k;
      }
      return h0;
    }
    w.flatten = flatten;
    if (!flat) {
      w.cps.forEach(function (c) { c.y = flatten(c.x, c.z, 10, 10); });
      w.bases.forEach(function (b) { b.y = flatten(b.x, b.z, 18, 14); });
      if (map.walkerPath || layout === 'trench' || layout === 'open') w.walkerPaths.forEach(function (p) { p.forEach(function (q) { flatten(q.x, q.z, 6, 10); }); });
    }

    // ---------- collision structures
    w.addBox = function (x, y, z, sx, sy, sz, opts) {
      var b = { x0: x - sx / 2, x1: x + sx / 2, y0: y, y1: y + sy, z0: z - sz / 2, z1: z + sz / 2, walk: !!(opts && opts.walk), cover: !(opts && opts.nocover) };
      w.boxes.push(b);
      var c = w.cell;
      for (var cx = Math.floor(b.x0 / c); cx <= Math.floor(b.x1 / c); cx++) for (var cz = Math.floor(b.z0 / c); cz <= Math.floor(b.z1 / c); cz++) {
        var key = cx + ',' + cz; (w.grid[key] || (w.grid[key] = [])).push(b);
      }
      return b;
    };
    w.addCircle = function (x, z, r, y0, y1) {
      var b = { x0: x - r, x1: x + r, z0: z - r, z1: z + r, y0: y0, y1: y1, circle: true, cx: x, cz: z, r: r, cover: true };
      w.boxes.push(b);
      var c = w.cell;
      for (var cx = Math.floor(b.x0 / c); cx <= Math.floor(b.x1 / c); cx++) for (var cz = Math.floor(b.z0 / c); cz <= Math.floor(b.z1 / c); cz++) {
        var key = cx + ',' + cz; (w.grid[key] || (w.grid[key] = [])).push(b);
      }
      return b;
    };

    var solid = new Merger(), glowM = new Merger(), foliage = new Merger(), glass = new Merger(), rockM = new Merger(), barkM = new Merger();
    w.mergers = { solid: solid, glow: glowM, foliage: foliage };
    var S = new Structs(w, solid, glowM, foliage, glass, bio, R); S.rk = rockM; S.bk = barkM;
    w.S = S;
    if (bio.void != null) LAYOUTS.platforms(w, S, R, map, bio);
    else (LAYOUTS[layout] || LAYOUTS.open)(w, S, R, map, bio);

    // CP markers & base pads
    w.cps.forEach(function (c) {
      if (c.y == null) c.y = w.groundAt(c.x, c.z, 200);
      S.cpPad(c.x, c.y, c.z);
    });
    w.bases.forEach(function (b) { if (b.y == null) b.y = w.groundAt(b.x, b.z, 200); });

    // ---------- props
    scatterProps(w, S, R, bio, map);

    // ---------- terrain mesh
    if (bio.void == null) { buildTerrain(w, bio, map, scene); buildGrass(w, bio, map); }
    // water / lava / void clouds
    if (w.water != null) {
      var wg = new THREE.PlaneGeometry(map.size * 3, map.size * 3); wg.rotateX(-Math.PI / 2);
      var wt = SF.Tex.water();
      var wn = wt.normal.clone(); wn.needsUpdate = true; wn.wrapS = wn.wrapT = THREE.RepeatWrapping; wn.repeat.set(map.size * 3 / 18, map.size * 3 / 18);
      var wm = new THREE.MeshStandardMaterial({ color: bio.water.color, roughness: 0.08, metalness: 0.55, transparent: true, opacity: 0.88, normalMap: wn, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 1.6 });
      w.anim.push(function (dt, t) { wn.offset.set(t * 0.012, t * 0.007); });
      var water = new THREE.Mesh(wg, wm); water.position.y = w.water; water.receiveShadow = true; w.group.add(water); w.waterMesh = water;
    }
    if (w.lava != null) {
      var lg = new THREE.PlaneGeometry(map.size * 3, map.size * 3); lg.rotateX(-Math.PI / 2);
      var lava = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ color: bio.lava.color })); lava.position.y = w.lava; w.group.add(lava);
      w.lavaMesh = lava;
    }
    if (bio.void != null) {
      var cg = new THREE.PlaneGeometry(4000, 4000); cg.rotateX(-Math.PI / 2);
      var cloud = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: bio.clouds || bio.fog, fog: true }));
      cloud.position.y = bio.void; w.group.add(cloud);
      if (w.water != null) { w.waterMesh.position.y = bio.void + 1; }
    }

    // ---------- merged meshes
    var T = SF.Tex, sci = /metro|station|ship|sky|ocean|crystal|asteroid/.test(map.biome);
    var vc = T.triplanar(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: sci ? 0.55 : 0.85, metalness: sci ? 0.35 : 0.05 }), sci ? T.panels() : T.armor(), sci ? 0.08 : 0.18, 0.9);
    var sm = solid.build(vc); if (sm) { sm.castShadow = true; sm.receiveShadow = true; w.group.add(sm); }
    var rm = rockM.build(T.triplanar(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), T.rock(), 0.22, 1.4));
    if (rm) { rm.castShadow = true; rm.receiveShadow = true; w.group.add(rm); }
    var bm = barkM.build(T.triplanar(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), T.bark(), 0.6, 1.2));
    if (bm) { bm.castShadow = true; bm.receiveShadow = true; w.group.add(bm); }
    var fm = foliage.build(T.triplanar(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }), T.leaf(), 0.35, 1.0));
    if (fm) { fm.castShadow = true; fm.receiveShadow = true; w.group.add(fm); }
    var gm = glowM.build(new THREE.MeshBasicMaterial({ vertexColors: true })); if (gm) w.group.add(gm);
    var glm = glass.build(new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.8 })); if (glm) w.group.add(glm);

    buildSky(w, bio, map, scene);
    buildNav(w);
    return w;
  };

  function cpLabels(map, R) {
    var pool = ['North Ridge', 'Landing Pad', 'Comms Array', 'Old Bunker', 'Market Square', 'Hangar Bay', 'Generator', 'Crash Site', 'Overlook', 'Supply Depot', 'Plaza', 'Watchtower', 'Bridge', 'Reactor', 'Docks', 'Shrine', 'Garrison', 'Courtyard', 'Refinery', 'Outpost'];
    var out = [];
    for (var i = 0; i < 8; i++) out.push(pool[(map.seed + i * 7) % pool.length]);
    return out.map(function (n, i) { return String.fromCharCode(65 + i) + ' · ' + n; });
  }

  // ------------------------------------------------------------------ collision queries
  W.proto = {};
  function cellBoxes(w, x, z) { return w.grid[Math.floor(x / w.cell) + ',' + Math.floor(z / w.cell)]; }
  // Highest standable surface at (x,z) not more than `step` above y.
  function groundAt(w, x, z, y, step) {
    var h = w.space ? -1e9 : w.heightAt(x, z);
    if (w.bio && w.bio.void != null) h = w.killY - 50;
    var list = cellBoxes(w, x, z);
    if (list) {
      var lim = y + (step == null ? 0.75 : step);
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (b.y1 > lim || b.y1 <= h) continue;
        if (b.circle) { if ((x - b.cx) * (x - b.cx) + (z - b.cz) * (z - b.cz) > b.r * b.r) continue; }
        else if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
        h = b.y1;
      }
    }
    return h;
  }
  // push a circle (radius r) at feet y with height ht out of walls; returns adjusted {x,z,hit}
  function collide(w, pos, r, ht, step) {
    var hit = false;
    for (var pass = 0; pass < 2; pass++) {
      var list = cellBoxes(w, pos.x, pos.z);
      if (!list) break;
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (b.y1 <= pos.y + (step || 0.75) || b.y0 >= pos.y + ht) continue;
        if (b.circle) {
          var dx = pos.x - b.cx, dz = pos.z - b.cz, d2 = dx * dx + dz * dz, rr = b.r + r;
          if (d2 < rr * rr) { var d = Math.sqrt(d2) || 0.001; pos.x = b.cx + dx / d * rr; pos.z = b.cz + dz / d * rr; hit = true; }
          continue;
        }
        if (pos.x + r <= b.x0 || pos.x - r >= b.x1 || pos.z + r <= b.z0 || pos.z - r >= b.z1) continue;
        var px1 = b.x1 - (pos.x - r), px0 = (pos.x + r) - b.x0, pz1 = b.z1 - (pos.z - r), pz0 = (pos.z + r) - b.z0;
        var m = Math.min(px1, px0, pz1, pz0);
        if (m === px1) pos.x += px1; else if (m === px0) pos.x -= px0; else if (m === pz1) pos.z += pz1; else pos.z -= pz0;
        hit = true;
      }
    }
    return hit;
  }
  // Segment vs static world. Returns fraction t in [0,1] of first hit or 1.
  function raycast(w, ax, ay, az, bx, by, bz, ignoreTerrain) {
    var tBest = 1;
    var dx = bx - ax, dy = by - ay, dz = bz - az;
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-6) return 1;
    if (!w.space && !ignoreTerrain && !(w.bio && w.bio.void != null)) {
      var n = Math.min(60, Math.ceil(len / 2.5));
      var prevAbove = true;
      for (var i = 1; i <= n; i++) {
        var t = i / n, x = ax + dx * t, y = ay + dy * t, z = az + dz * t;
        if (y < w.heightAt(x, z)) { tBest = Math.max(0, (i - 0.5) / n); break; }
      }
    }
    // boxes along segment: visit cells sampled every half-cell
    var seen = W._seen || (W._seen = []); var stamp = (W._stamp = (W._stamp || 0) + 1);
    var steps = Math.max(1, Math.ceil(len / (w.cell * 0.5)));
    var lastKey = null;
    for (var s = 0; s <= steps; s++) {
      var tt = s / steps;
      if (tt > tBest + 0.05) break;
      var cx = Math.floor((ax + dx * tt) / w.cell), cz = Math.floor((az + dz * tt) / w.cell);
      for (var ox = -1; ox <= 1; ox++) for (var oz = -1; oz <= 1; oz++) {
        if ((ox || oz) && s % 1) continue;
        var key = (cx + ox) + ',' + (cz + oz);
        var list = w.grid[key]; if (!list) continue;
        for (var j = 0; j < list.length; j++) {
          var b = list[j];
          if (b._st === stamp) continue; b._st = stamp;
          var th = b.circle ? segCyl(ax, ay, az, dx, dy, dz, b) : segBox(ax, ay, az, dx, dy, dz, b);
          if (th < tBest) tBest = th;
        }
      }
    }
    return tBest;
  }
  function segBox(ax, ay, az, dx, dy, dz, b) {
    var t0 = 0, t1 = 1, p, q;
    var arr = [[dx, ax, b.x0, b.x1], [dy, ay, b.y0, b.y1], [dz, az, b.z0, b.z1]];
    for (var i = 0; i < 3; i++) {
      var d = arr[i][0], o = arr[i][1], mn = arr[i][2], mx = arr[i][3];
      if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) return 2; continue; }
      var ta = (mn - o) / d, tb = (mx - o) / d;
      if (ta > tb) { p = ta; ta = tb; tb = p; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
      if (t0 > t1) return 2;
    }
    return t0;
  }
  function segCyl(ax, ay, az, dx, dy, dz, b) {
    var fx = ax - b.cx, fz = az - b.cz;
    var A = dx * dx + dz * dz, Bq = 2 * (fx * dx + fz * dz), C = fx * fx + fz * fz - b.r * b.r;
    if (A < 1e-9) return 2;
    var disc = Bq * Bq - 4 * A * C; if (disc < 0) return 2;
    var t = (-Bq - Math.sqrt(disc)) / (2 * A);
    if (t < 0) t = C < 0 ? 0 : 2;
    if (t > 1) return 2;
    var y = ay + dy * t; if (y < b.y0 || y > b.y1) return 2;
    return t;
  }
  W.groundAt = groundAt; W.collide = collide; W.raycast = raycast;

  // ------------------------------------------------------------------ structures helper
  function Structs(w, solid, glowM, foliage, glass, bio, R) { this.w = w; this.s = solid; this.g = glowM; this.f = foliage; this.gl = glass; this.bio = bio; this.R = R; }
  var SP = Structs.prototype;
  // axis-aligned solid box (collides). y = bottom.
  SP.box = function (x, y, z, sx, sy, sz, color, opts) {
    this.s.add(GEO.box, tm(x, y + sy / 2, z, sx, sy, sz), color == null ? this.bio.wall : color, 0.25);
    if (!opts || !opts.nocol) this.w.addBox(x, y, z, sx, sy, sz, opts);
  };
  SP.deco = function (geo, x, y, z, sx, sy, sz, color, rx, ry, rz, shade) { this.s.add(GEO[geo], tm(x, y, z, sx, sy, sz, rx, ry, rz), color, shade == null ? 0.2 : shade); };
  SP.glow = function (geo, x, y, z, sx, sy, sz, color, rx, ry, rz) { this.g.add(GEO[geo], tm(x, y, z, sx, sy, sz, rx, ry, rz), color); };
  SP.rock = function (x, y, z, sx, sy, sz, color, rx, ry) { this.rk.add(GEO['rock' + ((this.R() * 4) | 0)], tm(x, y, z, sx, sy, sz, rx || 0, ry || 0, 0), color, 0.3); };
  SP.trunk = function (geo, x, y, z, sx, sy, sz, color, rx, ry, rz) { this.bk.add(GEO[geo], tm(x, y, z, sx, sy, sz, rx, ry, rz), color, 0.2); };
  SP.leaf = function (geo, x, y, z, sx, sy, sz, color, rx, ry, rz) { this.f.add(GEO[geo], tm(x, y, z, sx, sy, sz, rx, ry, rz), color, 0.35); };
  SP.glassBox = function (x, y, z, sx, sy, sz, color) { this.gl.add(GEO.box, tm(x, y + sy / 2, z, sx, sy, sz), color || 0x8ab0d0); };
  SP.ground = function (x, z) { return this.w.groundAt(x, z, 500); };
  // stairs going up from (x,z) toward dir (0:+z,1:+x,2:-z,3:-x), each step 0.5 high 0.7 deep
  SP.stairs = function (x, y, z, dir, width, height, color) {
    var n = Math.ceil(height / 0.5);
    for (var i = 0; i < n; i++) {
      var d = (i + 0.5) * 0.7, hh = Math.min(height, (i + 1) * 0.5);
      var px = x + (dir === 1 ? d : dir === 3 ? -d : 0), pz = z + (dir === 0 ? d : dir === 2 ? -d : 0);
      var sx = dir % 2 ? 0.7 : width, sz = dir % 2 ? width : 0.7;
      this.box(px, y, pz, sx, hh, sz, color, { walk: true });
    }
    return n * 0.7;
  };
  // building with a flat walkable roof reachable by outside stairs
  SP.building = function (x, z, sx, sz, h, color, roofColor, opts) {
    opts = opts || {};
    var y = this.ground(x, z) - 0.3;
    this.box(x, y, z, sx, h, sz, color);
    this.deco('box', x, y + h + 0.2, z, sx + 0.4, 0.4, sz + 0.4, roofColor || this.bio.roof);
    this.w.addBox(x, y + h, z, sx + 0.4, 0.4, sz + 0.4, { walk: true });
    // windows
    var win = this.bio.night || this.bio.neon ? 0xffd88a : 0x2a3038;
    var floors = Math.max(1, Math.floor(h / 3.5));
    for (var f = 0; f < floors && f < 12; f++) {
      var wy = y + 1.8 + f * 3.5;
      if (this.bio.night || this.bio.neon) {
        this.glow('box', x, wy, z - sz / 2 - 0.03, sx * 0.8, 0.6, 0.05, this.R() < 0.6 ? win : 0x2a2a30);
        this.glow('box', x, wy, z + sz / 2 + 0.03, sx * 0.8, 0.6, 0.05, this.R() < 0.6 ? win : 0x2a2a30);
      } else {
        this.deco('box', x, wy, z - sz / 2 - 0.03, sx * 0.8, 0.8, 0.06, win);
        this.deco('box', x, wy, z + sz / 2 + 0.03, sx * 0.8, 0.8, 0.06, win);
      }
    }
    if (opts.stairs !== false && h < 12) this.stairs(x + sx / 2 + 0.1, y, z - sz / 2 + 1.0, 0, 1.6, h, color);
    if (this.bio.neon && this.R() < 0.6) this.glow('box', x + sx / 2 + 0.06, y + h * 0.6, z, 0.1, Math.min(6, h * 0.4), 1.2, [0xff3aa0, 0x3affd8, 0xffd83a, 0x8a3aff][(this.R() * 4) | 0]);
    return y + h;
  };
  SP.dome = function (x, z, r, color) {
    var y = this.ground(x, z) - 0.2;
    this.deco('cyl', x, y + r * 0.35, z, r * 2, r * 0.7, r * 2, color);
    this.deco('hemi', x, y + r * 0.7, z, r * 2, r * 1.3, r * 2, color);
    this.deco('box', x, y + r * 0.35, z - r * 0.95, r * 0.6, r * 0.6, 0.3, 0x3a2e22);
    this.w.addCircle(x, z, r * 0.95, y, y + r * 1.25);
  };
  SP.tower = function (x, z, r, h, color, top) {
    var y = this.ground(x, z) - 0.3;
    this.deco('cyl', x, y + h / 2, z, r * 2, h, r * 2, color);
    if (top) this.deco(top, x, y + h + r * 0.6, z, r * 2.6, r * 1.4, r * 2.6, this.bio.roof);
    this.w.addCircle(x, z, r, y, y + h);
  };
  SP.wall = function (x0, z0, x1, z1, h, t, color) {
    var y = Math.min(this.ground(x0, z0), this.ground(x1, z1), this.ground((x0 + x1) / 2, (z0 + z1) / 2)) - 0.5;
    var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) this.box(cx, y, cz, Math.abs(x1 - x0), h + 0.5, t, color);
    else this.box(cx, y, cz, t, h + 0.5, Math.abs(z1 - z0), color);
  };
  SP.cover = function (x, z, kind, color) {
    var y = this.ground(x, z);
    var R = this.R;
    if (kind === 'crate') { var s = 1 + R() * 0.6; this.box(x, y, z, s, s, s, color || 0x6a5a40); this.deco('box', x, y + s / 2, z, s * 1.02, 0.12, s * 1.02, 0x3a3228); }
    else if (kind === 'barricade') { var horiz = R() < 0.5; this.box(x, y - 0.2, z, horiz ? 4 : 0.6, 1.4, horiz ? 0.6 : 4, color || 0x6a6e74); }
    else if (kind === 'barrel') { this.deco('cyl', x, y + 0.6, z, 0.9, 1.2, 0.9, color || 0x8a4a2a); this.w.addCircle(x, z, 0.45, y, y + 1.2); }
  };
  SP.cpPad = function (x, y, z) {
    this.deco('cyl', x, y + 0.06, z, 7, 0.12, 7, 0x3a3e44, 0, 0, 0, 0);
    this.glow('cyl', x, y + 0.14, z, 1.0, 0.04, 1.0, 0xdddddd);
    this.deco('cyl', x, y + 1.6, z, 0.2, 3.2, 0.2, 0x5a5e66);
  };

  // ------------------------------------------------------------------ props
  var PROPS = {
    rock: function (S, x, y, z, R) { var s = 0.8 + R() * 2.2; S.rock(x, y + s * 0.2, z, s * 1.5, s * 1.1, s * 1.3, rockCol(S, R), 0, R() * 6); if (s > 1.6) S.w.addCircle(x, z, s * 0.55, y - 1, y + s * 0.75); },
    boulder: function (S, x, y, z, R) { var s = 3 + R() * 5; S.rock(x, y + s * 0.2, z, s * 1.4, s * 1.1, s * 1.25, rockCol(S, R), 0, R() * 6); S.w.addCircle(x, z, s * 0.55, y - 2, y + s * 0.7); },
    icerock: function (S, x, y, z, R) { var s = 1.5 + R() * 4; S.deco('ico', x, y + s * 0.2, z, s, s * 1.4, s, 0xd8e8f4, R(), R() * 6, R()); if (s > 2) S.w.addCircle(x, z, s * 0.4, y - 1, y + s * 0.8); },
    lavarock: function (S, x, y, z, R) { var s = 1 + R() * 4; S.rock(x, y + s * 0.15, z, s * 1.4, s, s * 1.2, 0x2a2420, 0, R() * 6); if (R() < 0.4) S.glow('box', x, y + 0.05, z, s * 1.4, 0.06, 0.2, 0xff6a20, 0, R() * 6, 0); if (s > 2) S.w.addCircle(x, z, s * 0.5, y - 1, y + s * 0.6); },
    spire: function (S, x, y, z, R) { var h = 14 + R() * 30, r = 2 + R() * 4; S.rock(x, y + h * 0.1, z, r * 2.2, h * 0.5, r * 2.2, rockCol(S, R), 0, R() * 6); S.rock(x, y + h * 0.45, z, r * 1.5, h * 0.55, r * 1.5, rockCol(S, R), 0, R() * 6); S.rock(x, y + h * 0.78, z, r * 0.9, h * 0.35, r * 0.9, rockCol(S, R), 0, R() * 6); S.w.addCircle(x, z, r * 0.7, y - 1, y + h * 0.6); },
    pillar: function (S, x, y, z, R) { var h = 25 + R() * 45, r = 4 + R() * 6; S.rock(x, y + h * 0.3, z, r * 2.3, h * 0.7, r * 2.5, 0x8a7a6a, 0, R() * 6); S.rock(x, y + h * 0.75, z, r * 2.1, h * 0.5, r * 2.2, 0x8a7a6a, 0, R() * 6); S.leaf('cyl6', x, y + h - 1.6, z, r * 2.1, 1.2, r * 2.4, 0x7a9a4a, 0, R() * 6, 0); S.w.addCircle(x, z, r, y - 2, y + h); },
    crystal: function (S, x, y, z, R) { var h = 3 + R() * 9; var c = [0x4ad8ff, 0x7ab8ff, 0x4affc8][(R() * 3) | 0]; S.glow('cone5', x, y + h / 2, z, 1.2 + R(), h, 1.2 + R(), c, (R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.4); S.w.addCircle(x, z, 0.8, y, y + h); },
    vapor: function (S, x, y, z, R) { var h = 4 + R() * 2; S.deco('cyl', x, y + h / 2, z, 0.5, h, 0.5, 0xb8b0a0); S.deco('cyl', x, y + h * 0.75, z, 1.4, 0.15, 1.4, 0x8a8478); S.deco('box', x, y + h * 0.6, z, 0.12, 1.2, 1.6, 0x9a9488); S.w.addCircle(x, z, 0.35, y, y + h); },
    crate: function (S, x, y, z, R) { S.cover(x, z, R() < 0.7 ? 'crate' : 'barrel'); },
    junk: function (S, x, y, z, R) { var s = 3 + R() * 6; S.deco('box', x, y + s * 0.2, z, s * 1.6, s * 0.5, s, 0x6a6c70, R() * 0.6, R() * 6, R() * 0.6); S.w.addCircle(x, z, s * 0.6, y - 1, y + s * 0.5); },
    redwood: function (S, x, y, z, R) {
      var h = 30 + R() * 25, r = 0.8 + R() * 1.4;
      S.trunk('taper', x, y + h / 2 - 1, z, r * 2, h, r * 2, 0x5a3424, 0, R() * 6, 0);
      for (var i = 0; i < 4; i++) S.leaf('ico1', x + (R() - 0.5) * 4, y + h * (0.6 + i * 0.12), z + (R() - 0.5) * 4, 7 - i, 4, 7 - i, mix(S.bio.g[1], 0x2a4a1a, 0.5 + R() * 0.3), 0, R() * 6, 0);
      S.w.addCircle(x, z, r, y - 1, y + h);
    },
    broadtree: function (S, x, y, z, R) {
      var h = 5 + R() * 5;
      S.trunk('taper', x, y + h / 2, z, 0.7, h, 0.7, 0x5a4030, 0, 0, 0);
      for (var bi = 0; bi < 4; bi++) { var ba = bi * 1.6 + R(); S.trunk('taper', x + Math.cos(ba) * 0.9, y + h * 0.85, z + Math.sin(ba) * 0.9, 0.25, h * 0.45, 0.25, 0x5a4030, Math.sin(ba) * 0.7, 0, -Math.cos(ba) * 0.7); }
      for (var ci = 0; ci < 5; ci++) { var ca = ci * 1.26 + R(); var cr = ci ? 1.8 + R() : 0; S.leaf('ico1', x + Math.cos(ca) * cr, y + h + 0.8 + (ci ? R() * 1.2 : 1.6), z + Math.sin(ca) * cr, 3.6 + R() * 1.6, 2.6 + R(), 3.6 + R() * 1.6, mix(S.bio.g[1], 0x2a5a1a, 0.35 + R() * 0.35), 0, R() * 6, 0); }
      S.w.addCircle(x, z, 0.4, y, y + h);
    },
    jungletree: function (S, x, y, z, R) {
      var h = 10 + R() * 12;
      S.trunk('taper', x, y + h / 2, z, 1.2, h, 1.2, 0x4a3a2a, 0, 0, 0);
      S.leaf('ico1', x, y + h + 1, z, 8 + R() * 4, 3.5, 8 + R() * 4, mix(S.bio.g[1], 0x1a4a1a, 0.5), 0, R() * 6, 0);
      S.leaf('ico1', x + 2, y + h * 0.7, z - 1, 5, 2.5, 5, mix(S.bio.g[1], 0x2a5a1a, 0.5), 0, R() * 6, 0);
      S.w.addCircle(x, z, 0.6, y, y + h);
    },
    wroshyr: function (S, x, y, z, R) {
      var h = 60 + R() * 30, r = 4 + R() * 3;
      S.trunk('taper', x, y + h / 2 - 2, z, r * 2, h, r * 2, 0x6a5a40, 0, R() * 6, 0);
      for (var i = 0; i < 5; i++) { var a = R() * 6.28; S.deco('cyl', x + Math.cos(a) * r * 1.6, y + 2, z + Math.sin(a) * r * 1.6, 1.4, 8, 1.4, 0x5a4a32, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); }
      S.leaf('ico1', x, y + h + 4, z, 30, 12, 30, mix(S.bio.g[1], 0x1a4a1a, 0.6), 0, R() * 6, 0);
      S.w.addCircle(x, z, r, y - 2, y + h);
    },
    palm: function (S, x, y, z, R) {
      var h = 7 + R() * 6, lean = (R() - 0.5) * 0.5;
      S.trunk('taper', x + lean * h / 2, y + h / 2, z, 0.5, h, 0.5, 0x7a6040, 0, 0, -lean);
      for (var i = 0; i < 6; i++) { var a = i * 1.05 + R(); S.leaf('box', x + lean * h + Math.cos(a) * 2, y + h - 0.4, z + Math.sin(a) * 2, 4.5, 0.08, 1.0, 0x4a8a2a, 0, -a, 0.35); }
      S.w.addCircle(x, z, 0.3, y, y + h);
    },
    snowpine: function (S, x, y, z, R) {
      var h = 8 + R() * 10;
      S.trunk('cyl', x, y + 1.5, z, 0.6, 3, 0.6, 0x4a3628, 0, 0, 0);
      S.leaf('cone', x, y + h * 0.5, z, h * 0.5, h * 0.75, h * 0.5, 0x2a4a32, 0, R() * 6, 0);
      S.leaf('cone', x, y + h * 0.82, z, h * 0.32, h * 0.45, h * 0.32, 0xe8eef4, 0, R() * 6, 0);
      S.w.addCircle(x, z, 0.5, y, y + h);
    },
    gnarl: function (S, x, y, z, R) {
      var h = 6 + R() * 6;
      S.trunk('taper', x, y + h / 2, z, 1.4, h, 1.4, 0x3a3428, (R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.4);
      for (var i = 0; i < 3; i++) S.deco('cyl', x + (R() - 0.5) * 3, y + h * 0.8, z + (R() - 0.5) * 3, 0.35, 5, 0.35, 0x3a3428, R() - 0.5, R() * 6, R() - 0.5);
      S.leaf('ico', x, y + h + 0.5, z, 6, 2.5, 6, 0x4a5a32, 0, R() * 6, 0);
      S.w.addCircle(x, z, 0.7, y, y + h);
    },
    mushroom: function (S, x, y, z, R) {
      var h = 4 + R() * 14, r = h * (0.35 + R() * 0.25);
      var c = [0xd84aa0, 0xe8a03a, 0x4ac8d8, 0xa04ad8, 0xd8d84a][(R() * 5) | 0];
      S.deco('cyl', x, y + h / 2, z, h * 0.12, h, h * 0.12, 0xe8e0c8);
      S.leaf('hemi', x, y + h - 0.2, z, r * 2, r * 0.8, r * 2, c);
      S.glow('sph', x, y + h - 0.4, z, r * 1.6, 0.25, r * 1.6, mix(c, 0xffffff, 0.3));
      S.w.addCircle(x, z, h * 0.07 + 0.2, y, y + h);
      if (h > 10) S.w.addBox(x, y + h - 0.5, z, r * 1.4, 0.6, r * 1.4, { walk: true });
    },
    pod: function (S, x, y, z, R) { var s = 1 + R() * 2; S.leaf('sph', x, y + s * 0.4, z, s, s * 1.3, s, [0xe86a3a, 0x8a3ad8, 0x3ad8a0][(R() * 3) | 0]); },
    fern: function (S, x, y, z, R) { var s = 0.8 + R() * 1.4; for (var i = 0; i < 4; i++) S.leaf('box', x, y + 0.3 * s, z, 2.2 * s, 0.05, 0.45 * s, mix(S.bio.g[1], 0x2a6a1a, 0.4 + R() * 0.3), 0, i * 0.8 + R(), 0.4); },
    reed: function (S, x, y, z, R) { for (var i = 0; i < 5; i++) S.leaf('box', x + (R() - 0.5) * 1.5, y + 1, z + (R() - 0.5) * 1.5, 0.06, 2 + R(), 0.06, 0x6a7a3a, (R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3); },
    flower: function (S, x, y, z, R) { S.leaf('box', x, y + 0.2, z, 1.6, 0.35, 1.6, mix(S.bio.g[1], 0x3a6a2a, 0.3), 0, R() * 6, 0); var c = [0xe8d84a, 0xe86a8a, 0xffffff, 0xa86ae8][(R() * 4) | 0]; S.leaf('box', x, y + 0.42, z, 0.5, 0.1, 0.5, c, 0, R() * 6, 0); },
    log: function (S, x, y, z, R) { var l = 8 + R() * 8, a = R() * 6; S.deco('cyl', x, y + 0.7, z, 1.4, l, 1.4, 0x4a3424, Math.PI / 2, a, 0); S.w.addCircle(x, z, 0.8, y, y + 1.4); }
  };
  function mix(a, b, t) { var A = new THREE.Color(a), Bc = new THREE.Color(b); return A.lerp(Bc, t).getHex(); }
  function rockCol(S, R) { return mix(S.bio.g[2], 0x6a6460, 0.3 + R() * 0.3); }

  function scatterProps(w, S, R, bio, map) {
    var area = map.size * map.size / 10000; // hectares
    var props = bio.props || {};
    Object.keys(props).forEach(function (k) {
      var n = Math.round(props[k] * area * 6 * (map.layout === 'forest' && k.indexOf('tree') < 0 && k !== 'redwood' ? 1 : map.layout === 'forest' ? 1.6 : 1));
      if (map.layout === 'corridor' || map.layout === 'arena') n = Math.round(n * 0.25);
      for (var i = 0; i < n; i++) {
        var x = (R() - 0.5) * map.size * 0.92, z = (R() - 0.5) * map.size * 0.92;
        if (tooClose(w, x, z, k === 'fern' || k === 'flower' || k === 'reed' ? 3 : 7)) continue;
        var y = w.groundAt(x, z, 500);
        if (bio.void != null && y < w.killY + 20) continue;
        if (w.water != null && y < w.water - 0.3 && k !== 'reed') continue;
        if (w.lava != null && y < w.lava + 0.6) continue;
        PROPS[k](S, x, y, z, R);
      }
    });
  }
  function tooClose(w, x, z, r) {
    for (var i = 0; i < w.cps.length; i++) if (Math.hypot(x - w.cps[i].x, z - w.cps[i].z) < 12 + r) return true;
    for (i = 0; i < w.bases.length; i++) if (Math.hypot(x - w.bases[i].x, z - w.bases[i].z) < 22 + r) return true;
    var list = w.grid[Math.floor(x / w.cell) + ',' + Math.floor(z / w.cell)];
    if (list) for (i = 0; i < list.length; i++) { var b = list[i]; if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return true; }
    for (i = 0; i < w.walkerPaths.length; i++) for (var j = 0; j < w.walkerPaths[i].length; j++) { var p = w.walkerPaths[i][j]; if (Math.abs(p.x - x) < 8 && Math.abs(p.z - z) < 14) return true; }
    return false;
  }

  // ------------------------------------------------------------------ layouts
  var LAYOUTS = W.layouts = {};
  LAYOUTS.open = function (w, S, R, map, bio) {
    var n = Math.round(map.size / 40);
    for (var i = 0; i < n; i++) {
      var x = (R() - 0.5) * map.size * 0.7, z = (R() - 0.5) * map.size * 0.7;
      if (tooClose(w, x, z, 6)) continue;
      if (R() < 0.5) { S.cover(x, z, 'barricade'); S.cover(x + 3, z + 2, 'crate'); }
      else ruin(S, x, z, R);
    }
    baseCamps(w, S, R);
  };
  function ruin(S, x, z, R) {
    var y = S.ground(x, z) - 0.5, c = S.bio.wall;
    S.box(x, y, z, 8, 2 + R() * 3, 1, c);
    S.box(x - 3.5, y, z + 3, 1, 1.5 + R() * 2, 6, c);
    if (R() < 0.5) S.box(x + 3.5, y, z + 2, 1, 3 + R() * 2, 4, c);
  }
  function baseCamps(w, S, R) {
    w.bases.forEach(function (b, ti) {
      var y = S.ground(b.x, b.z) - 0.2;
      var dir = ti === 0 ? 1 : -1;
      S.box(b.x - 10, y, b.z - dir * 8, 6, 3, 4, S.bio.wall);
      S.box(b.x + 10, y, b.z - dir * 8, 6, 3, 4, S.bio.wall);
      S.deco('cyl', b.x, y + 0.08, b.z, 14, 0.16, 14, 0x3a3e44, 0, 0, 0, 0);
      S.glow('cyl', b.x, y + 0.18, b.z, 13, 0.02, 13, ti === 0 ? 0x2a4a8a : 0x8a2a2a);
      for (var i = -1; i <= 1; i += 2) S.cover(b.x + i * 7, b.z + dir * 12, 'barricade');
    });
  }
  LAYOUTS.town = function (w, S, R, map, bio) {
    var desert = map.biome.indexOf('desert') === 0 || map.biome === 'junk' || map.planet === 'saleth';
    var n = Math.round(map.size * map.size / 1700);
    for (var i = 0; i < n; i++) {
      var x = (R() - 0.5) * map.size * 0.78, z = (R() - 0.5) * map.size * 0.78;
      if (tooClose(w, x, z, 9)) continue;
      if (desert && R() < 0.65) S.dome(x, z, 3 + R() * 4, mix(bio.wall, 0xffffff, R() * 0.2));
      else if (map.biome === 'lake' && R() < 0.3) S.tower(x, z, 3, 12 + R() * 8, bio.wall, 'cone');
      else S.building(x, z, 7 + R() * 8, 7 + R() * 8, 4 + R() * 6, mix(bio.wall, 0x8a8070, R() * 0.3), bio.roof);
      if (R() < 0.4) S.cover(x + 6, z + 6, 'crate');
    }
    if (map.biome === 'lake') castle(w, S, R, 0, -map.size * 0.05);
    baseCamps(w, S, R);
  };
  function castle(w, S, R, x, z) {
    var y = S.ground(x, z) - 0.5, c = 0x7a7064;
    S.wall(x - 18, z - 18, x + 18, z - 18, 9, 2, c); S.wall(x - 18, z + 18, x - 4, z + 18, 9, 2, c); S.wall(x + 4, z + 18, x + 18, z + 18, 9, 2, c);
    S.wall(x - 18, z - 18, x - 18, z + 18, 9, 2, c); S.wall(x + 18, z - 18, x + 18, z + 18, 9, 2, c);
    [[-18, -18], [18, -18], [-18, 18], [18, 18]].forEach(function (p) { S.tower(x + p[0], z + p[1], 3.2, 14, c, 'cone'); });
    S.building(x, z - 4, 12, 10, 11, c, 0x5a4a3a);
    for (var i = 0; i < 8; i++) S.glow('box', x - 17 + i * 5, y + 7, z - 19.1, 0.6, 0.9, 0.1, [0xe84a4a, 0x4ae84a, 0x4a8ae8, 0xe8d84a][i % 4]);
  }
  LAYOUTS.canyon = function (w, S, R, map, bio) {
    // bridges and walkways over the canyon, mining structures
    for (var i = 0; i < 4; i++) {
      var z = -map.size * 0.3 + i * map.size * 0.2;
      var y = S.ground(map.size * 0.4, z);
      var x0 = -map.size * 0.35, x1 = map.size * 0.35;
      var yb = Math.max(S.ground(x0, z), S.ground(x1, z)) - 1;
      S.box(0, yb, z, map.size * 0.7, 0.6, 4, bio.wall, { walk: true });
      for (var p = -2; p <= 2; p++) S.box(p * map.size * 0.12, yb - 30, z, 1.2, 30, 1.2, bio.accent || bio.wall);
    }
    var n = Math.round(map.size / 30);
    for (i = 0; i < n; i++) {
      var x = (R() - 0.5) * map.size * 0.6, zz = (R() - 0.5) * map.size * 0.7;
      if (tooClose(w, x, zz, 7)) continue;
      if (map.biome === 'mine' || map.biome === 'sinkhole') S.building(x, zz, 6 + R() * 5, 6 + R() * 5, 4 + R() * 4, bio.wall, bio.roof);
      else if (R() < 0.5) ruin(S, x, zz, R); else S.cover(x, zz, 'barricade');
    }
    baseCamps(w, S, R);
  };
  LAYOUTS.platforms = function (w, S, R, map, bio) {
    // Floating / stilted platforms joined by bridges. CPs and bases each get a platform.
    var nodes = [];
    var col = bio.wall, top = bio.roof;
    function plat(x, z, r, y) {
      var ht = 2;
      S.box(x, y - ht, z, r * 2, ht, r * 2, col, { walk: true });
      S.deco('box', x, y - ht - 2, z, r * 1.6, 4, r * 1.6, mix(col, 0x000000, 0.25));
      S.deco('cyl', x, y - ht - 12, z, 3, 20, 3, mix(col, 0x000000, 0.3));
      // edge trim and lights (decorative so bridges stay open)
      S.deco('box', x, y + 0.1, z - r + 0.2, r * 2, 0.2, 0.4, top); S.deco('box', x, y + 0.1, z + r - 0.2, r * 2, 0.2, 0.4, top);
      S.deco('box', x - r + 0.2, y + 0.1, z, 0.4, 0.2, r * 2, top); S.deco('box', x + r - 0.2, y + 0.1, z, 0.4, 0.2, r * 2, top);
      S.glow('box', x, y + 0.22, z - r + 0.2, r * 1.6, 0.04, 0.1, bio.accent); S.glow('box', x, y + 0.22, z + r - 0.2, r * 1.6, 0.04, 0.1, bio.accent);
      nodes.push({ x: x, z: z, r: r, y: y });
    }
    var y0 = 0;
    w.bases.forEach(function (b) { b.y = y0; plat(b.x, b.z, 22, y0); });
    w.cps.forEach(function (c) { c.y = y0; plat(c.x, c.z, 15, y0); });
    // ring of extra platforms
    for (var i = 0; i < 6; i++) {
      var x = (R() - 0.5) * map.size * 0.7, z = (R() - 0.5) * map.size * 0.7;
      var ok = nodes.every(function (n) { return Math.hypot(n.x - x, n.z - z) > n.r + 22; });
      if (ok) plat(x, z, 10 + R() * 6, y0);
    }
    // connect each node to its two nearest neighbours with bridges (cut openings in rails)
    var links = {};
    nodes.forEach(function (a, ia) {
      var near = nodes.map(function (b, ib) { return { b: b, ib: ib, d: Math.hypot(a.x - b.x, a.z - b.z) }; }).filter(function (o) { return o.ib !== ia; }).sort(function (p, q) { return p.d - q.d; }).slice(0, 2);
      near.forEach(function (o) {
        var key = Math.min(ia, o.ib) + '-' + Math.max(ia, o.ib); if (links[key]) return; links[key] = 1;
        bridge(S, a, o.b, col, top);
      });
    });
    w.platformNodes = nodes;
    // buildings on platforms
    nodes.forEach(function (n, i) {
      if (i < 2) return;
      if (R() < 0.6) { S.box(n.x + n.r * 0.4, n.y, n.z - n.r * 0.4, 4, 3, 4, col); S.cover(n.x - n.r * 0.4, n.z + n.r * 0.3, 'crate'); }
    });
    if (map.biome === 'skycity' || map.biome === 'ocean') {
      nodes.forEach(function (n) {
        if (n.r > 14 && R() < 0.6) S.tower(n.x - n.r * 0.5, n.z + n.r * 0.5, 2.5, 10 + R() * 8, col, 'hemi');
        if (n.r > 14 && map.layout === 'city') S.building(n.x + n.r * 0.55, n.z + n.r * 0.5, 7, 7, 6 + R() * 10, col, top, { stairs: false });
      });
    }
  };
  function bridge(S, a, b, col, top) {
    var dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    var ux = dx / d, uz = dz / d;
    var sx = a.x + ux * (a.r - 1), sz = a.z + uz * (a.r - 1), ex = b.x - ux * (b.r - 1), ez = b.z - uz * (b.r - 1);
    var segs = Math.ceil(Math.hypot(ex - sx, ez - sz) / 3);
    for (var i = 0; i <= segs; i++) {
      var t = i / segs, x = sx + (ex - sx) * t, z = sz + (ez - sz) * t;
      S.box(x, a.y - 0.6, z, 4.2, 0.6, 4.2, mix(col, 0x8a8a8a, 0.2), { walk: true });
    }
  }
  LAYOUTS.temple = function (w, S, R, map, bio) {
    var x = 0, z = 0, y = S.ground(x, z) - 0.5;
    var c = bio.wall;
    // stepped pyramid: 4 tiers with stairs on two faces
    var tiers = map.biome === 'snow' || map.biome === 'metro' ? 3 : 4;
    var size = 44, th = 4;
    for (var i = 0; i < tiers; i++) {
      var s = size - i * 9;
      S.box(x, y + i * th, z, s, th, s, mix(c, 0x000000, i * 0.05), { walk: true });
      S.stairs(x - 2, y + i * th, z - s / 2 - (th / 0.5) * 0.7, 0, 4, th, c);
      S.stairs(x - 2, y + i * th, z + s / 2 + (th / 0.5) * 0.7, 2, 4, th, c);
    }
    var topY = y + tiers * th;
    S.box(x, topY, z, 10, 6, 10, mix(c, 0x000000, 0.15));
    S.glow('box', x, topY + 3, z - 5.05, 3, 3.5, 0.1, bio.accent);
    w.cps[Math.floor(w.cps.length / 2)].x = x - 6; w.cps[Math.floor(w.cps.length / 2)].z = z - size / 2 - 14;
    w.cps[Math.floor(w.cps.length / 2)].y = null;
    // ruins & columns
    for (i = 0; i < 26; i++) {
      var px = (R() - 0.5) * map.size * 0.75, pz = (R() - 0.5) * map.size * 0.75;
      if (Math.abs(px) < 34 && Math.abs(pz) < 34) continue;
      if (tooClose(w, px, pz, 5)) continue;
      if (R() < 0.6) { var gy = S.ground(px, pz) - 0.5, h = 3 + R() * 8; S.deco('cyl', px, gy + h / 2, pz, 1.6, h, 1.6, c); w.addCircle(px, pz, 0.8, gy, gy + h); }
      else ruin(S, px, pz, R);
    }
    if (map.biome === 'metro') { for (i = 0; i < 4; i++) S.tower((i < 2 ? -1 : 1) * 16, (i % 2 ? -1 : 1) * 16, 2.5, 36, c, 'cone'); }
    baseCamps(w, S, R);
  };
  LAYOUTS.city = function (w, S, R, map, bio) {
    var block = 34, road = 12;
    var lim = map.size * 0.42;
    for (var bx = -lim; bx <= lim; bx += block + road) {
      for (var bz = -lim; bz <= lim; bz += block + road) {
        if (tooClose(w, bx, bz, 4)) { // plaza around CPs
          S.cover(bx + 8, bz + 3, 'barricade'); S.cover(bx - 6, bz - 5, 'crate');
          continue;
        }
        var nb = 1 + ((R() * 3) | 0);
        for (var k = 0; k < nb; k++) {
          var sx = 8 + R() * 10, sz = 8 + R() * 10, h = map.biome === 'classical' ? 5 + R() * 8 : 6 + R() * (bio.skyline ? 30 : 14);
          var ox = (R() - 0.5) * (block - sx), oz = (R() - 0.5) * (block - sz);
          if (tooClose(w, bx + ox, bz + oz, Math.max(sx, sz) / 2 + 2)) continue;
          S.building(bx + ox, bz + oz, sx, sz, h, mix(bio.wall, 0x6a6a6a, R() * 0.2), bio.roof, { stairs: h < 12 });
          if (map.biome === 'classical' && R() < 0.4) { var gy = S.ground(bx + ox, bz + oz) - 0.3; S.deco('hemi', bx + ox, gy + h + 0.4, bz + oz, Math.min(sx, sz) * 0.8, Math.min(sx, sz) * 0.5, Math.min(sx, sz) * 0.8, bio.roof); }
        }
      }
    }
    if (bio.skyline || map.biome === 'skycity') skyline(w, S, R, map, bio);
    baseCamps(w, S, R);
  };
  function skyline(w, S, R, map, bio) {
    for (var i = 0; i < 80; i++) {
      var a = R() * Math.PI * 2, d = map.size * (0.75 + R() * 0.8);
      var x = Math.cos(a) * d, z = Math.sin(a) * d, h = 40 + R() * 160, s = 12 + R() * 22;
      S.deco('box', x, h / 2 - 10, z, s, h, s, mix(bio.wall, 0x2a2a30, 0.3 + R() * 0.4));
      if (bio.neon || bio.night) for (var f = 0; f < 6; f++) S.glow('box', x, 5 + R() * h, z + s / 2 + 0.1, s * 0.8, 0.8, 0.1, R() < 0.5 ? 0xffd88a : 0x8ad8ff);
    }
  }
  LAYOUTS.corridor = function (w, S, R, map, bio) {
    // a grid maze of corridors: walls 9 m tall, rooms, doors
    var cell = 24, lim = Math.floor(map.size / 2 / cell) * cell;
    var c = bio.wall, h = 9;
    for (var x = -lim; x <= lim; x += cell) {
      for (var z = -lim; z <= lim; z += cell) {
        // horizontal wall segment from (x,z)→(x+cell,z) with a door gap
        if (x < lim && R() < 0.62) {
          var gap = 4 + R() * 3, gx = x + cell * (0.3 + R() * 0.4);
          S.box((x + gx - gap / 2) / 2, 0, z, gx - gap / 2 - x, h, 1.2, c);
          S.box((gx + gap / 2 + x + cell) / 2, 0, z, x + cell - gx - gap / 2, h, 1.2, c);
          S.glow('box', (x + x + cell) / 2, h - 0.6, z, cell * 0.8, 0.2, 1.3, bio.accent);
        }
        if (z < lim && R() < 0.5) {
          var gz = z + cell * (0.3 + R() * 0.4), gp = 4 + R() * 3;
          S.box(x, 0, (z + gz - gp / 2) / 2, 1.2, h, gz - gp / 2 - z, c);
          S.box(x, 0, (gz + gp / 2 + z + cell) / 2, 1.2, h, z + cell - gz - gp / 2, c);
        }
      }
    }
    // outer walls
    var L = lim + 2;
    S.box(0, 0, -L, L * 2, h * 1.5, 2, c); S.box(0, 0, L, L * 2, h * 1.5, 2, c); S.box(-L, 0, 0, 2, h * 1.5, L * 2, c); S.box(L, 0, 0, 2, h * 1.5, L * 2, c);
    // floor panels and light strips
    for (var i = 0; i < 40; i++) S.glow('box', (R() - 0.5) * L * 2, 0.02, (R() - 0.5) * L * 2, 0.3, 0.02, 6, bio.accent);
    for (i = 0; i < 30; i++) S.cover((R() - 0.5) * L * 1.8, (R() - 0.5) * L * 1.8, R() < 0.6 ? 'crate' : 'barricade', 0x5a5e66);
    // remove walls near CPs/bases by not placing - simpler: CPs are put in open cells
    clearAround(w, w.cps.concat(w.bases), 8);
  };
  function clearAround(w, pts, r) {
    // remove colliders (and keep visuals) intersecting points so spawns aren't inside walls — move points instead
    pts.forEach(function (p) {
      for (var tries = 0; tries < 30; tries++) {
        var blocked = w.boxes.some(function (b) { return !b.walk && p.x > b.x0 - r && p.x < b.x1 + r && p.z > b.z0 - r && p.z < b.z1 + r && b.y1 > 1; });
        if (!blocked) break;
        p.x += (Math.random() - 0.5) * 12; p.z += (Math.random() - 0.5) * 12;
      }
    });
  }
  LAYOUTS.arena = function (w, S, R, map, bio) {
    var r = map.size * 0.36, c = bio.wall;
    var segs = 28;
    for (var i = 0; i < segs; i++) {
      var a = i / segs * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
      var y = S.ground(x, z) - 1;
      if (i % 7 === 3) continue; // gates
      S.deco('box', x, y + 7, z, r * 2 * Math.PI / segs + 0.5, 14, 3, c, 0, -a + Math.PI / 2, 0);
      w.addCircle(x, z, r * Math.PI / segs + 0.5, y, y + 14);
      if (i % 2 === 0) S.deco('cyl', x * 1.04, y + 9, z * 1.04, 3, 18, 3, mix(c, 0x000000, 0.2));
    }
    for (i = 0; i < 14; i++) {
      var a2 = R() * Math.PI * 2, d = R() * r * 0.8;
      var px = Math.cos(a2) * d, pz = Math.sin(a2) * d;
      if (tooClose(w, px, pz, 4)) continue;
      if (R() < 0.5) { var gy = S.ground(px, pz) - 0.5, h = 4 + R() * 7; S.deco('cyl', px, gy + h / 2, pz, 2, h, 2, c); w.addCircle(px, pz, 1, gy, gy + h); }
      else S.cover(px, pz, R() < 0.5 ? 'barricade' : 'crate');
    }
    if (map.indoor) { // palace: interior walls
      for (i = 0; i < 10; i++) { var x0 = (R() - 0.5) * r * 1.4, z0 = (R() - 0.5) * r * 1.4; if (!tooClose(w, x0, z0, 6)) S.box(x0, S.ground(x0, z0) - 0.5, z0, R() < 0.5 ? 14 : 1.4, 7, R() < 0.5 ? 1.4 : 14, c); }
    }
    w.bases[0].z = -r * 0.75; w.bases[1].z = r * 0.75; w.bases.forEach(function (b) { b.y = null; });
  };
  LAYOUTS.base = function (w, S, R, map, bio) {
    // military base: bunkers, hangar, shield generator, perimeter walls with gaps, turrets
    var c = bio.wall, roof = bio.roof;
    var hx = map.size * 0.05, hz = -map.size * 0.08;
    var gy = S.ground(hx, hz) - 0.5;
    // hangar (open front)
    S.box(hx - 14, gy, hz, 2, 12, 26, c); S.box(hx + 14, gy, hz, 2, 12, 26, c); S.box(hx, gy, hz + 13, 30, 12, 2, c);
    S.deco('box', hx, gy + 12.5, hz, 30, 1, 26, roof); w.addBox(hx, gy + 12, hz, 30, 1, 26, { walk: true });
    S.glow('box', hx, gy + 11, hz - 12.9, 26, 0.3, 0.1, bio.accent);
    // shield generator dish
    var sx = -map.size * 0.22, sz = map.size * 0.12, sy = S.ground(sx, sz);
    S.deco('cyl', sx, sy + 5, sz, 3, 10, 3, 0x6a6e74); S.deco('hemi', sx, sy + 10, sz, 14, 5, 14, 0xb8bcc4, Math.PI, 0, 0);
    S.glow('sph', sx, sy + 10.5, sz, 2, 2, 2, 0x8ad8ff); w.addCircle(sx, sz, 1.6, sy, sy + 10);
    // bunkers
    for (var i = 0; i < 10; i++) {
      var x = (R() - 0.5) * map.size * 0.7, z = (R() - 0.5) * map.size * 0.7;
      if (tooClose(w, x, z, 9) || Math.abs(x - hx) < 22 && Math.abs(z - hz) < 22) continue;
      var y = S.ground(x, z) - 0.6;
      S.box(x, y, z, 10, 4, 8, c);
      S.deco('box', x, y + 4.2, z, 11, 0.6, 9, roof); w.addBox(x, y + 4, z, 11, 0.8, 9, { walk: true });
      S.glow('box', x, y + 2.5, z - 4.05, 6, 0.4, 0.1, bio.accent);
      S.stairs(x + 5.6, y, z - 3, 0, 1.6, 4.8, c);
    }
    // trench-style walls
    for (i = 0; i < 8; i++) {
      var wx = (R() - 0.5) * map.size * 0.6, wz = (R() - 0.5) * map.size * 0.6;
      if (tooClose(w, wx, wz, 8)) continue;
      if (R() < 0.5) S.wall(wx - 8, wz, wx + 8, wz, 1.6, 0.8, c); else S.wall(wx, wz - 8, wx, wz + 8, 1.6, 0.8, c);
    }
    for (i = 0; i < 6; i++) { var cx = (R() - 0.5) * map.size * 0.5, cz = (R() - 0.5) * map.size * 0.5; if (!tooClose(w, cx, cz, 4)) S.cover(cx, cz, 'crate'); }
    baseCamps(w, S, R);
  };
  LAYOUTS.trench = function (w, S, R, map, bio) {
    // sandbag/ice walls along trench lines
    for (var row = -1; row <= 1; row++) {
      var z = row * map.size * 0.25;
      for (var x = -map.size * 0.4; x < map.size * 0.4; x += 10) {
        if (R() < 0.35 || tooClose(w, x, z + 4, 3)) continue;
        S.wall(x, z + 4, x + 8, z + 4, 1.4, 1.2, mix(bio.wall, 0xffffff, 0.3));
      }
      // turret tower
      var tx = (R() - 0.5) * map.size * 0.5;
      if (!tooClose(w, tx, z + 10, 5)) { var ty = S.ground(tx, z + 10); S.deco('cyl', tx, ty + 3, z + 10, 3, 6, 3, bio.wall); S.deco('box', tx, ty + 6.5, z + 9, 2, 1.2, 4, 0x4a4e54); w.addCircle(tx, z + 10, 1.5, ty, ty + 7); }
    }
    if (map.biome === 'ice') {
      // ion cannon / shield dome flavour near defenders' base
      var b = w.bases[0], by = S.ground(b.x, b.z - 30);
      S.deco('sph', b.x + 30, by + 4, b.z - 20, 16, 16, 16, 0xb8bcc4); w.addCircle(b.x + 30, b.z - 20, 7, by, by + 10);
      S.deco('cyl', b.x + 30, by + 14, b.z - 20, 2, 12, 2, 0x6a6e74);
    }
    if (map.biome === 'station') {
      for (var t = 0; t < 30; t++) { var px = (R() - 0.5) * map.size * 0.8, pz = (R() - 0.5) * map.size * 0.8; if (!tooClose(w, px, pz, 6)) S.box(px, S.ground(px, pz) - 0.5, pz, 4 + R() * 10, 2 + R() * 10, 4 + R() * 10, mix(bio.wall, 0x2a2e34, R() * 0.5)); }
    }
    baseCamps(w, S, R);
  };
  LAYOUTS.wreck = function (w, S, R, map, bio) {
    // half-buried dreadnought hull and fighter wrecks
    var x = map.size * 0.15, z = map.size * 0.05, y = S.ground(x, z);
    var hullC = 0x7a7e84;
    S.deco('box', x, y + 8, z, 70, 40, 160, hullC, 0.35, 0.4, 0.25);
    w.addBox(x, y - 5, z, 50, 30, 120);
    S.deco('box', x - 30, y + 2, z - 70, 30, 14, 30, mix(hullC, 0x000000, 0.2), 0.2, 0.6, 0.2);
    w.addBox(x - 30, y - 2, z - 70, 24, 14, 24);
    for (var i = 0; i < 18; i++) {
      var px = (R() - 0.5) * map.size * 0.8, pz = (R() - 0.5) * map.size * 0.8;
      if (tooClose(w, px, pz, 8) || Math.abs(px - x) < 50 && Math.abs(pz - z) < 90) continue;
      var py = S.ground(px, pz);
      if (R() < 0.5) { S.deco('sph', px, py + 1, pz, 4, 4, 4, 0x5a5e66); S.deco('cyl6', px + 3, py + 2, pz, 6, 0.3, 6, 0x2a2c30, 0, 0, 1.2); w.addCircle(px, pz, 2.2, py, py + 3); }
      else { S.deco('cyl', px, py + 2, pz, 3, 12, 3, 0x6a6e74, Math.PI / 2, R() * 6, 0.3); w.addCircle(px, pz, 3, py, py + 3.5); }
    }
    LAYOUTS.open(w, S, R, map, bio);
  };
  LAYOUTS.forest = function (w, S, R, map, bio) {
    // tree platforms / huts
    var n = Math.round(map.size / 40);
    for (var i = 0; i < n; i++) {
      var x = (R() - 0.5) * map.size * 0.7, z = (R() - 0.5) * map.size * 0.7;
      if (tooClose(w, x, z, 8)) continue;
      var y = S.ground(x, z);
      if (map.biome === 'farm') { S.building(x, z, 7, 7, 3.5, bio.wall, bio.roof); continue; }
      if (map.biome === 'forest') {
        // hut on stilts with ramp
        var hy = y + 4;
        S.box(x, hy - 0.5, z, 8, 0.5, 8, 0x6a4a30, { walk: true });
        for (var k = 0; k < 4; k++) S.deco('cyl', x + (k % 2 ? 3.5 : -3.5), y + 2, z + (k < 2 ? 3.5 : -3.5), 0.5, 4.5, 0.5, 0x4a3424);
        S.deco('cone', x, hy + 2, z, 7, 4, 7, 0x8a6a40);
        S.stairs(x - 4.3, y, z - 4, 2, 1.6, 4, 0x6a4a30);
      } else ruin(S, x, z, R);
    }
    if (map.biome === 'fungal' || map.biome === 'swamp') LAYOUTS.open(w, S, R, map, bio); else baseCamps(w, S, R);
  };
  LAYOUTS.harbor = function (w, S, R, map, bio) {
    // docks extending into water on +x
    var c = bio.wall;
    for (var i = 0; i < 4; i++) {
      var z = -map.size * 0.3 + i * map.size * 0.2;
      var x0 = map.size * 0.12, len = map.size * 0.3;
      var y = Math.max(w.water != null ? w.water + 1.2 : 1, S.ground(x0, z) - 0.2);
      S.box(x0 + len / 2, y - 0.8, z, len, 0.8, 7, mix(c, 0x6a4a30, 0.5), { walk: true });
      for (var p = 0; p < 6; p++) S.deco('cyl', x0 + p * len / 5, y - 6, z + (p % 2 ? 3 : -3), 0.6, 10, 0.6, 0x4a3424);
      if (R() < 0.7) S.box(x0 + len * 0.8, y, z, 6, 4, 5, c);
    }
    // seawall & warehouses
    var n = Math.round(map.size / 35);
    for (i = 0; i < n; i++) {
      var x = -map.size * 0.35 + R() * map.size * 0.4, zz = (R() - 0.5) * map.size * 0.75;
      if (tooClose(w, x, zz, 9)) continue;
      if (map.biome === 'jungle' && R() < 0.4) { S.tower(x, zz, 2.5, 12 + R() * 10, mix(c, 0x6a4a30, 0.3), 'cone'); continue; }
      S.building(x, zz, 8 + R() * 8, 8 + R() * 8, 4 + R() * 5, c, bio.roof);
    }
    baseCamps(w, S, R);
  };

  // ------------------------------------------------------------------ terrain mesh
  function buildTerrain(w, bio, map, scene) {
    var N = w.N, half = w.half, step = w.step;
    var ext = 2.2; // render a skirt beyond play area
    var geo = new THREE.PlaneGeometry(map.size * ext, map.size * ext, N, N);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    var c0 = new THREE.Color(bio.g[0]), c1 = new THREE.Color(bio.g[1]), c2 = new THREE.Color(bio.g[2]), tmp = new THREE.Color();
    var seed = map.seed % 9973;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i);
      var inside = Math.abs(x) <= half && Math.abs(z) <= half;
      var h;
      if (inside) h = w.heightAt(x, z);
      else {
        var ex = Math.max(0, Math.abs(x) - half), ez = Math.max(0, Math.abs(z) - half);
        h = w.heightAt(Math.max(-half, Math.min(half, x)), Math.max(-half, Math.min(half, z))) + (ex + ez) * 0.25 * (bio.amp > 0 ? 1 : 0) + (bio.amp > 0 ? fbm(x * 0.01, z * 0.01, seed + 5, 3) * 25 * Math.min(1, (ex + ez) / 60) : 0);
      }
      pos.setY(i, h);
      var n = fbm(x * 0.05, z * 0.05, seed + 11, 3) * 0.5 + 0.5;
      var t = Math.max(0, Math.min(1, (h + bio.amp * 0.5) / (bio.amp * 1.4 + 1)));
      tmp.copy(c0).lerp(c1, n);
      if (t > 0.6) tmp.lerp(c2, (t - 0.6) / 0.4);
      if (bio.sandShore && w.water != null && h < w.water + 1.6) tmp.copy(c0);
      if (bio.salt) { var sc = fbm(x * 0.12, z * 0.6, seed + 77, 2); if (sc > 0.35) tmp.lerp(c2, Math.min(1, (sc - 0.35) * 3)); }
      if (bio.paved) { var gx = Math.abs(((x / 6) % 1 + 1) % 1 - 0.5), gz = Math.abs(((z / 6) % 1 + 1) % 1 - 0.5); if (gx > 0.47 || gz > 0.47) tmp.multiplyScalar(0.8); }
      var k = 0.92 + (n - 0.5) * 0.18;
      cols[i * 3] = tmp.r * k; cols[i * 3 + 1] = tmp.g * k; cols[i * 3 + 2] = tmp.b * k;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    // slope darkening
    var nor = geo.attributes.normal;
    for (i = 0; i < pos.count; i++) {
      var ny = nor.getY(i);
      if (ny < 0.8) { var d = 0.55 + ny * 0.5; cols[i * 3] *= d; cols[i * 3 + 1] *= d; cols[i * 3 + 2] *= d; }
    }
    var mat = SF.Tex.triplanar(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: bio.salt || bio.paved ? 0.7 : 0.95, metalness: bio.paved ? 0.1 : 0 }), bio.paved ? SF.Tex.panels() : SF.Tex.ground(), bio.paved ? 0.12 : 0.2, bio.paved ? 0.8 : 1.3);
    var mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    w.group.add(mesh);
    w.terrainMesh = mesh;
  }

  // ------------------------------------------------------------------ grass: instanced clumps with wind sway
  var GRASSY = { plains: 1, classical: 0.6, forest: 0.8, jungle: 1, grass: 1.2, farm: 1, lake: 1, fungal: 0.7, swamp: 0.8, tropical: 0.7, jungleTemple: 1, desert: 0.15, desertTown: 0.1, redrock: 0.1, sinkhole: 0.2, mine: 0.15, junk: 0.1, snowforest: 0.2, snow: 0.1 };
  function buildGrass(w, bio, map) {
    var dens = GRASSY[map.biome]; if (!dens) return;
    var blades = new THREE.BufferGeometry(), pos = [], col = [], idx = [];
    var base = new THREE.Color(bio.g[1]).lerp(new THREE.Color(0x3a5a20), 0.25), tip = base.clone().lerp(new THREE.Color(0xd8e0a0), 0.45);
    if (map.biome.indexOf('desert') === 0 || map.biome === 'redrock' || map.biome === 'junk' || map.biome === 'mine' || map.biome === 'sinkhole') { base = new THREE.Color(0x8a7a4a); tip = new THREE.Color(0xc8b880); }
    if (map.biome.indexOf('snow') === 0) { base = new THREE.Color(0x6a7a5a); tip = new THREE.Color(0xd8e0d0); }
    for (var b = 0; b < 12; b++) {
      var a = b / 12 * Math.PI * 2 + Math.random() * 0.5, r = Math.random() * 0.3, h = 0.22 + Math.random() * 0.32, lean = 0.06 + Math.random() * 0.12;
      var cx = Math.cos(a) * r, cz = Math.sin(a) * r, wx = Math.cos(a + 1.57) * 0.022, wz = Math.sin(a + 1.57) * 0.022;
      var n = pos.length / 3;
      pos.push(cx - wx, 0, cz - wz, cx + wx, 0, cz + wz, cx + Math.cos(a) * lean, h, cz + Math.sin(a) * lean);
      col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
      idx.push(n, n + 1, n + 2);
    }
    blades.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    blades.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    blades.setIndex(idx); blades.computeVertexNormals();
    var mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 });
    var uni = { gTime: { value: 0 } };
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.gTime = uni.gTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float gTime;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 ip = instanceMatrix * vec4(0.0,0.0,0.0,1.0);\nfloat sw = sin(gTime * 1.7 + ip.x * 0.25 + ip.z * 0.18) * 0.12 + sin(gTime * 3.1 + ip.x * 0.9) * 0.04;\ntransformed.x += sw * position.y; transformed.z += sw * 0.6 * position.y;');
    };
    var count = Math.min(22000, Math.round(map.size * map.size / 8 * dens));
    var inst = new THREE.InstancedMesh(blades, mat, count);
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    var placed = 0, tries = 0;
    while (placed < count && tries < count * 3) {
      tries++;
      var x = (Math.random() - 0.5) * map.size * 0.96, z = (Math.random() - 0.5) * map.size * 0.96;
      var patch = fbm(x * 0.02, z * 0.02, 900, 3);
      if (patch < -0.15 * (2 - dens)) continue;
      var th = w.heightAt(x, z), gy = w.groundAt(x, z, th + 0.5);
      if (gy > th + 0.05) continue;
      if (w.water != null && gy < w.water + 0.1) continue;
      if (w.lava != null && gy < w.lava + 0.5) continue;
      if (Math.abs(w.heightAt(x + 1, z) - th) > 0.8 || Math.abs(w.heightAt(x, z + 1) - th) > 0.8) continue;
      var near = false;
      for (var c = 0; c < w.cps.length; c++) if (Math.abs(w.cps[c].x - x) < 4 && Math.abs(w.cps[c].z - z) < 4) near = true;
      if (near) continue;
      q.setFromAxisAngle(up, Math.random() * 6.28);
      var s0 = 0.6 + Math.random() * 0.6 + Math.max(0, patch) * 0.7;
      m4.compose(p.set(x, gy - 0.02, z), q, sc.set(s0, s0 * (0.8 + Math.random() * 0.5), s0));
      inst.setMatrixAt(placed++, m4);
    }
    inst.count = placed;
    inst.receiveShadow = true;
    inst.frustumCulled = false;
    w.group.add(inst);
    w.anim.push(function (dt, t) { uni.gTime.value = t; });
  }

  // ------------------------------------------------------------------ sky
  function buildSky(w, bio, map, scene) {
    var geo = new THREE.SphereGeometry(3000, 24, 12);
    var cols = [], pos = geo.attributes.position, top = new THREE.Color(bio.sky[0]), hor = new THREE.Color(bio.sky[1]), c = new THREE.Color();
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i) / 3000;
      c.copy(hor).lerp(top, Math.pow(Math.max(0, y), 0.6));
      if (y < 0) c.copy(hor).multiplyScalar(0.85);
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    var sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -10;
    w.group.add(sky); w.sky = sky;
    if (bio.stars || bio.night) addStars(w, bio.night && !bio.stars ? 600 : 2500);
    // suns
    var nsun = bio.suns || 1;
    for (var s = 0; s < nsun; s++) {
      if (bio.night && !bio.stars) break;
      var sun = new THREE.Mesh(new THREE.SphereGeometry(s ? 45 : 70, 16, 10), new THREE.MeshBasicMaterial({ color: s ? 0xffe0a0 : 0xfff6e0, fog: false }));
      sun.position.set(-1400 + s * 260, 1100 - s * 120, -2000);
      w.group.add(sun);
      var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: SF.Tex.glow(), color: bio.sun || 0xfff0d0, transparent: true, opacity: 0.7, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.position.copy(sun.position); halo.scale.set(900, 900, 1); w.group.add(halo);
    }
    if (bio.gasGiant || map.planet === 'stratos' || map.planet === 'vanta') {
      var gg = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.MeshBasicMaterial({ color: map.planet === 'stratos' ? 0xd8a070 : 0xd88a3a, fog: false }));
      gg.position.set(1500, 900, 1600); w.group.add(gg);
      var ring = new THREE.Mesh(new THREE.RingGeometry(620, 820, 48), new THREE.MeshBasicMaterial({ color: 0xc8a888, fog: false, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
      ring.position.copy(gg.position); ring.rotation.x = 1.2; w.group.add(ring);
    }
    if (map.planet === 'eclipse' && !map.space) {
      var ds = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.MeshBasicMaterial({ color: 0x5a5e66, fog: false }));
      ds.position.set(-800, 1200, -2200); w.group.add(ds);
    }
    // clouds layer
    if (!bio.stars && !bio.night) {
      var cg = new THREE.Group();
      var cm = new THREE.SpriteMaterial({ map: SF.Tex.cloud(), color: bio.clouds || 0xffffff, transparent: true, opacity: 0.85, fog: false, depthWrite: false });
      for (var k = 0; k < 34; k++) {
        var cl = new THREE.Sprite(cm);
        var a = Math.random() * Math.PI * 2, d = 700 + Math.random() * 1600;
        cl.position.set(Math.cos(a) * d, 220 + Math.random() * 380, Math.sin(a) * d);
        var cs = 500 + Math.random() * 700; cl.scale.set(cs, cs * 0.45, 1);
        cg.add(cl);
      }
      w.anim.push(function (dt) { cg.rotation.y += dt * 0.003; });
      w.group.add(cg); w.clouds = cg;
    }
  }
  function addStars(w, n) {
    var g = new THREE.BufferGeometry(), p = [];
    for (var i = 0; i < n; i++) {
      var v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(2800);
      p.push(v.x, v.y, v.z);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    var st = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 3.2, sizeAttenuation: false, fog: false }));
    w.group.add(st);
  }

  // ------------------------------------------------------------------ space
  function buildSpace(w, map, bio, R, scene) {
    w.heightAt = function () { return -1e9; };
    w.groundAt = function () { return -1e9; };
    w.bases = [{ x: 0, y: 0, z: -420 }, { x: 0, y: 0, z: 420 }];
    w.killY = -1e9;
    var sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 16, 8), new THREE.MeshBasicMaterial({ color: 0x010208, side: THREE.BackSide, fog: false, depthWrite: false }));
    w.group.add(sky); w.sky = sky;
    var g = new THREE.BufferGeometry(), p = [], col = [];
    for (var i = 0; i < 4000; i++) {
      var v = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(4500);
      p.push(v.x, v.y, v.z); var b = 0.6 + R() * 0.4; col.push(b, b, b * (0.9 + R() * 0.2));
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    w.group.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.5, sizeAttenuation: false, vertexColors: true, fog: false })));
    // planet
    var planet = new THREE.Mesh(new THREE.SphereGeometry(2200, 48, 24), new THREE.MeshStandardMaterial({ color: map.planetColor || 0x3d7a3d, roughness: 1, fog: false }));
    planet.position.set(-800, -2600, 600); w.group.add(planet);
    var atm = new THREE.Mesh(new THREE.SphereGeometry(2260, 48, 24), new THREE.MeshBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 0.12, fog: false, side: THREE.BackSide }));
    atm.position.copy(planet.position); w.group.add(atm);
    if (map.gasGiant) { planet.material.color.setHex(0xd88a3a); }
    if (map.nebula) {
      for (i = 0; i < 6; i++) {
        var nb = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: map.nebula, transparent: true, opacity: 0.08, fog: false, depthWrite: false }));
        nb.position.set((R() - 0.5) * 3000, (R() - 0.2) * 1500, (R() - 0.5) * 3000); nb.scale.setScalar(500 + R() * 600); w.group.add(nb);
      }
    }
    if (map.fortress) {
      var ds = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.MeshStandardMaterial({ color: 0x5a5e66, roughness: 0.9 }));
      ds.position.set(1800, 400, -2600); w.group.add(ds);
    }
    // asteroids / debris (also colliders as circles in 3D: we store spheres)
    w.spheres = [];
    var M = new Merger();
    var nAst = map.asteroids ? 140 : map.debris ? 60 : 30;
    for (i = 0; i < nAst; i++) {
      var r = map.asteroids ? 6 + R() * 30 : 4 + R() * 12;
      var x = (R() - 0.5) * 1400, y = (R() - 0.5) * 500, z = (R() - 0.5) * 900;
      if (map.debris) M.add(GEO.box, tm(x, y, z, r * 2, r * 0.4, r * 1.2, R() * 6, R() * 6, R() * 6), 0x5a5e66, 0.3);
      else M.add(GEO.dod, tm(x, y, z, r * 2, r * 1.6, r * 1.8, R() * 6, R() * 6, R() * 6), 0x6a5e54, 0.3);
      w.spheres.push({ x: x, y: y, z: z, r: r * 0.8 });
    }
    var am = M.build(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    if (am) w.group.add(am);
    w.raycastSpace = function (ax, ay, az, bx, by, bz) {
      var best = 1, dx = bx - ax, dy = by - ay, dz = bz - az, L2 = dx * dx + dy * dy + dz * dz;
      if (L2 < 1e-9) return 1;
      for (var i = 0; i < w.spheres.length; i++) {
        var s = w.spheres[i], fx = ax - s.x, fy = ay - s.y, fz = az - s.z;
        var b = 2 * (fx * dx + fy * dy + fz * dz), c = fx * fx + fy * fy + fz * fz - s.r * s.r;
        var disc = b * b - 4 * L2 * c; if (disc < 0) continue;
        var t = (-b - Math.sqrt(disc)) / (2 * L2);
        if (t >= 0 && t < best) best = t;
      }
      return best;
    };
    w.nav = null;
  }

  // ------------------------------------------------------------------ navigation grid
  function buildNav(w) {
    var cs = 2.5, n = Math.ceil(w.map.size / cs);
    var half = w.half;
    var hgt = new Float32Array(n * n), ok = new Uint8Array(n * n);
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
      var x = -half + (i + 0.5) * cs, z = -half + (j + 0.5) * cs;
      var h = groundAt(w, x, z, 400, 0);
      var id = j * n + i;
      hgt[id] = h;
      var good = h > w.killY + 15;
      if (w.water != null && h < w.water - 1.0) good = false;
      if (w.lava != null && h < w.lava + 0.3) good = false;
      // blocked by solid
      if (good) {
        var list = cellBoxes(w, x, z);
        if (list) for (var k = 0; k < list.length; k++) {
          var b = list[k];
          if (b.y1 <= h + 0.8 || b.y0 > h + 1.9) continue;
          if (b.circle) { if ((x - b.cx) * (x - b.cx) + (z - b.cz) * (z - b.cz) < (b.r + 0.5) * (b.r + 0.5)) { good = false; break; } }
          else if (x > b.x0 - 0.5 && x < b.x1 + 0.5 && z > b.z0 - 0.5 && z < b.z1 + 0.5) { good = false; break; }
        }
      }
      ok[id] = good ? 1 : 0;
    }
    w.nav = { cs: cs, n: n, h: hgt, ok: ok };
  }
  W.navCell = function (w, x, z) {
    var nv = w.nav; if (!nv) return -1;
    var i = Math.floor((x + w.half) / nv.cs), j = Math.floor((z + w.half) / nv.cs);
    if (i < 0 || j < 0 || i >= nv.n || j >= nv.n) return -1;
    return j * nv.n + i;
  };
  function nearestOk(w, id) {
    var nv = w.nav; if (id < 0) return -1; if (nv.ok[id]) return id;
    var ci = id % nv.n, cj = (id / nv.n) | 0;
    for (var r = 1; r < 8; r++) for (var dj = -r; dj <= r; dj++) for (var di = -r; di <= r; di++) {
      if (Math.abs(di) !== r && Math.abs(dj) !== r) continue;
      var i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nv.n || j >= nv.n) continue;
      var k = j * nv.n + i; if (nv.ok[k]) return k;
    }
    return -1;
  }
  // A* returning list of {x,z} waypoints (smoothed) or null
  var heap = [], gScore = null, came = null, closed = null, stampArr = null, stampN = 0;
  W.findPath = function (w, sx, sz, tx, tz, maxExp) {
    var nv = w.nav; if (!nv) return null;
    var n = nv.n, total = n * n;
    if (!gScore || gScore.length !== total) { gScore = new Float32Array(total); came = new Int32Array(total); stampArr = new Uint32Array(total); closed = new Uint32Array(total); stampN = 0; }
    stampN++;
    var s = nearestOk(w, W.navCell(w, sx, sz)), t = nearestOk(w, W.navCell(w, tx, tz));
    if (s < 0 || t < 0) return null;
    var ti = t % n, tj = (t / n) | 0;
    heap.length = 0;
    function push(id, f) { heap.push([f, id]); var i = heap.length - 1; while (i > 0) { var p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; var tt = heap[p]; heap[p] = heap[i]; heap[i] = tt; i = p; } }
    function pop() { var top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; var i = 0; for (; ;) { var l = i * 2 + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; var tt = heap[m]; heap[m] = heap[i]; heap[i] = tt; i = m; } } return top; }
    stampArr[s] = stampN; gScore[s] = 0; came[s] = -1;
    push(s, 0);
    var exp = 0, found = false, best = s, bestH = 1e9;
    var dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [-1, -1, 1.414]];
    while (heap.length && exp < (maxExp || 9000)) {
      var cur = pop()[1];
      if (closed[cur] === stampN) continue;
      closed[cur] = stampN; exp++;
      if (cur === t) { found = true; break; }
      var ci = cur % n, cj = (cur / n) | 0, ch = nv.h[cur];
      var hh = Math.abs(ci - ti) + Math.abs(cj - tj);
      if (hh < bestH) { bestH = hh; best = cur; }
      for (var d = 0; d < 8; d++) {
        var ni = ci + dirs[d][0], nj = cj + dirs[d][1];
        if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
        var nid = nj * n + ni;
        if (!nv.ok[nid] || closed[nid] === stampN) continue;
        if (Math.abs(nv.h[nid] - ch) > 1.1 * dirs[d][2]) continue;
        if (d >= 4 && (!nv.ok[cj * n + ni] || !nv.ok[nj * n + ci])) continue;
        var g = gScore[cur] + dirs[d][2] + Math.max(0, nv.h[nid] - ch) * 0.3;
        if (stampArr[nid] !== stampN || g < gScore[nid]) {
          stampArr[nid] = stampN; gScore[nid] = g; came[nid] = cur;
          var dx = Math.abs(ni - ti), dz = Math.abs(nj - tj);
          push(nid, g + (dx + dz + (1.414 - 2) * Math.min(dx, dz)) * 1.05);
        }
      }
    }
    var end = found ? t : best;
    var cells = [];
    for (var c = end; c !== -1 && cells.length < 4000; c = came[c]) cells.push(c);
    cells.reverse();
    // smooth: keep cells where straight walk is blocked
    var pts = [];
    var anchor = 0;
    for (var k = 2; k < cells.length; k++) {
      if (!lineOk(w, cells[anchor], cells[k])) { pts.push(cells[k - 1]); anchor = k - 1; }
    }
    if (cells.length) pts.push(cells[cells.length - 1]);
    var cs = nv.cs, half = w.half;
    var out = pts.map(function (id) { return { x: -half + ((id % n) + 0.5) * cs, z: -half + (((id / n) | 0) + 0.5) * cs }; });
    if (found && out.length) { out[out.length - 1] = { x: tx, z: tz }; }
    out.partial = !found;
    return out;
  };
  function lineOk(w, a, b) {
    var nv = w.nav, n = nv.n;
    var ai = a % n, aj = (a / n) | 0, bi = b % n, bj = (b / n) | 0;
    var steps = Math.max(Math.abs(bi - ai), Math.abs(bj - aj));
    var ph = nv.h[a];
    for (var s = 1; s <= steps; s++) {
      var i = Math.round(ai + (bi - ai) * s / steps), j = Math.round(aj + (bj - aj) * s / steps);
      var id = j * n + i;
      if (!nv.ok[id] || Math.abs(nv.h[id] - ph) > 1.2) return false;
      ph = nv.h[id];
    }
    return true;
  }
  W.navOk = function (w, x, z) { var id = W.navCell(w, x, z); return id >= 0 && w.nav.ok[id] === 1; };
  W.randomNavPoint = function (w, R, cx, cz, rad) {
    for (var i = 0; i < 40; i++) {
      var x = cx + (R() - 0.5) * 2 * rad, z = cz + (R() - 0.5) * 2 * rad;
      if (Math.abs(x) > w.half * 0.95 || Math.abs(z) > w.half * 0.95) continue;
      if (!w.nav || W.navOk(w, x, z)) return { x: x, z: z };
    }
    if (w.nav) {
      var best = null, bd = 1e9, nv = w.nav;
      for (var k = 0; k < 600; k++) {
        var id = (R() * nv.n * nv.n) | 0; if (!nv.ok[id]) continue;
        var px = -w.half + ((id % nv.n) + 0.5) * nv.cs, pz = -w.half + (((id / nv.n) | 0) + 0.5) * nv.cs;
        var d = Math.hypot(px - cx, pz - cz); if (d < bd) { bd = d; best = { x: px, z: pz }; }
      }
      if (best) return best;
    }
    return { x: cx, z: cz };
  };

  // bind methods
  var _build = W.build;
  W.build = function (map, scene, opts) {
    var out = _build(map, scene, opts);
    out.collide = function (pos, r, ht, step) { return out.space ? false : collide(out, pos, r, ht, step); };
    out.raycast = function (ax, ay, az, bx, by, bz, it) { return out.space ? out.raycastSpace(ax, ay, az, bx, by, bz) : raycast(out, ax, ay, az, bx, by, bz, it); };
    out.los = function (a, b) { return out.raycast(a.x, a.y, a.z, b.x, b.y, b.z) >= 0.98; };
    return out;
  };
})();
