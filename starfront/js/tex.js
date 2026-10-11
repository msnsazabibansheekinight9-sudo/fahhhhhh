// Procedural texture library: canvas-generated albedo detail + normal maps for armour, cloth, metal, skin,
// bark, rock, terrain and clouds, plus a triplanar shader patch so world geometry gets texture without UVs.
var SF = window.SF || (window.SF = {});

(function () {
  var T = SF.Tex = {};
  var cache = {};

  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // tileable value noise on a size×size grid
  function noiseField(size, cells, seed, oct) {
    var R = rng(seed), out = new Float32Array(size * size);
    var amp = 1, total = 0;
    for (var o = 0; o < (oct || 4); o++) {
      var c = cells << o, g = new Float32Array(c * c);
      for (var i = 0; i < g.length; i++) g[i] = R();
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        var fx = x / size * c, fy = y / size * c, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var a = g[(iy % c) * c + ix % c], b = g[(iy % c) * c + (ix + 1) % c], d = g[((iy + 1) % c) * c + ix % c], e = g[((iy + 1) % c) * c + (ix + 1) % c];
        out[y * size + x] += ((a + (b - a) * tx) * (1 - ty) + (d + (e - d) * tx) * ty) * amp;
      }
      total += amp; amp *= 0.5;
    }
    for (i = 0; i < out.length; i++) out[i] /= total;
    return out;
  }
  function canvas(size) { var c = document.createElement('canvas'); c.width = c.height = size; return c; }
  // build albedo (grey, tinted by material colour) + normal map from a height function
  function make(key, size, fn, opts) {
    if (cache[key]) return cache[key];
    opts = opts || {};
    var h = new Float32Array(size * size), alb = new Float32Array(size * size);
    fn(h, alb, size);
    var ca = canvas(size), cx = ca.getContext('2d'), ia = cx.createImageData(size, size);
    var cn = canvas(size), nx = cn.getContext('2d'), inn = nx.createImageData(size, size);
    var str = opts.normal || 2.0;
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var i = y * size + x;
      var v = Math.max(0, Math.min(255, alb[i] * 255));
      ia.data[i * 4] = ia.data[i * 4 + 1] = ia.data[i * 4 + 2] = v; ia.data[i * 4 + 3] = 255;
      var l = h[y * size + (x + size - 1) % size], r = h[y * size + (x + 1) % size], u = h[((y + size - 1) % size) * size + x], d = h[((y + 1) % size) * size + x];
      var dx = (l - r) * str, dy = (u - d) * str, len = Math.sqrt(dx * dx + dy * dy + 1);
      inn.data[i * 4] = (dx / len * 0.5 + 0.5) * 255; inn.data[i * 4 + 1] = (dy / len * 0.5 + 0.5) * 255; inn.data[i * 4 + 2] = (1 / len * 0.5 + 0.5) * 255; inn.data[i * 4 + 3] = 255;
    }
    cx.putImageData(ia, 0, 0); nx.putImageData(inn, 0, 0);
    var map = new THREE.CanvasTexture(ca), nor = new THREE.CanvasTexture(cn);
    [map, nor].forEach(function (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; });
    cache[key] = { map: map, normal: nor };
    return cache[key];
  }
  T.make = make;

  // ------------------------------------------------------------------ material surfaces
  T.armor = function () {
    return make('armor', 256, function (h, a, S) {
      var n = noiseField(S, 8, 11, 4), R = rng(5);
      for (var i = 0; i < S * S; i++) { h[i] = n[i] * 0.15; a[i] = 0.9 + n[i] * 0.12; }
      // panel seams
      var lines = [0, 64, 150, 210], cols = [0, 90, 170];
      for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
        var i = y * S + x, seam = 0;
        lines.forEach(function (ly) { if (Math.abs(y - ly) < 1.5) seam = 1; });
        cols.forEach(function (lx) { if (Math.abs(x - lx) < 1.5 && ((y / 40) | 0) % 2 === 0) seam = 1; });
        if (seam) { h[i] -= 0.6; a[i] *= 0.55; }
      }
      // scratches and chips
      for (var s = 0; s < 70; s++) {
        var sx = R() * S, sy = R() * S, ang = R() * 6.28, len = 4 + R() * 26;
        for (var t = 0; t < len; t++) { var px = (sx + Math.cos(ang) * t) & (S - 1), py = (sy + Math.sin(ang) * t) & (S - 1); var k = py * S + px; h[k] -= 0.12; a[k] *= 0.8; }
      }
      // grime
      var g = noiseField(S, 4, 99, 3);
      for (i = 0; i < S * S; i++) if (g[i] > 0.62) a[i] *= 1 - (g[i] - 0.62) * 1.1;
    }, { normal: 3 });
  };
  T.cloth = function () {
    return make('cloth', 256, function (h, a, S) {
      var n = noiseField(S, 16, 3, 3);
      for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
        var i = y * S + x;
        var weave = (Math.sin(x * 1.6) * 0.5 + 0.5) * ((y >> 1) % 2) + (Math.sin(y * 1.6) * 0.5 + 0.5) * (((y >> 1) + 1) % 2);
        h[i] = weave * 0.3 + n[i] * 0.5; a[i] = 0.82 + weave * 0.08 + n[i] * 0.15;
      }
    }, { normal: 2.5 });
  };
  T.metal = function () {
    return make('metal', 256, function (h, a, S) {
      var n = noiseField(S, 8, 21, 4), R = rng(8);
      for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) { var i = y * S + x; var br = Math.sin(y * 3.1 + n[i] * 4) * 0.04; h[i] = n[i] * 0.2; a[i] = 0.78 + n[i] * 0.18 + br; }
      // panels + rivets
      for (var py = 0; py < S; py += 64) for (var px = 0; px < S; px += 64) {
        for (var k = 0; k < 64; k++) { var e1 = py * S + ((px + k) & (S - 1)), e2 = ((py + k) & (S - 1)) * S + px; h[e1] -= 0.5; h[e2] -= 0.5; a[e1] *= 0.6; a[e2] *= 0.6; }
        for (var rv = 0; rv < 4; rv++) { var rx = px + 6 + (rv % 2) * 52, ry = py + 6 + (rv >> 1) * 52; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 4) { var q = ((ry + dy) & (S - 1)) * S + ((rx + dx) & (S - 1)); h[q] += 0.4; a[q] *= 1.1; } }
      }
    }, { normal: 3 });
  };
  T.skin = function () {
    return make('skin', 128, function (h, a, S) { var n = noiseField(S, 16, 41, 3); for (var i = 0; i < S * S; i++) { h[i] = n[i] * 0.3; a[i] = 0.93 + n[i] * 0.07; } }, { normal: 1 });
  };
  T.fur = function () {
    return make('fur', 256, function (h, a, S) {
      var R = rng(77);
      for (var i = 0; i < S * S; i++) { h[i] = 0.5; a[i] = 0.85; }
      for (var s = 0; s < 4000; s++) { var x = R() * S | 0, y = R() * S | 0, len = 4 + R() * 8, v = 0.6 + R() * 0.5; for (var t = 0; t < len; t++) { var k = ((y + t) & (S - 1)) * S + ((x + (t >> 2)) & (S - 1)); h[k] = v; a[k] = 0.65 + v * 0.35; } }
    }, { normal: 2 });
  };
  T.bark = function () {
    return make('bark', 256, function (h, a, S) {
      var n = noiseField(S, 6, 55, 4);
      for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) { var i = y * S + x; var r = Math.abs(Math.sin(x * 0.18 + n[i] * 9)); h[i] = r * 0.8 + n[i] * 0.3; a[i] = 0.55 + r * 0.45; }
    }, { normal: 4 });
  };
  T.rock = function () {
    return make('rock', 256, function (h, a, S) {
      var n = noiseField(S, 4, 66, 6), c = noiseField(S, 12, 67, 2);
      for (var i = 0; i < S * S; i++) { var crack = Math.abs(c[i] - 0.5) < 0.02 ? -0.4 : 0; h[i] = n[i] + crack; a[i] = 0.65 + n[i] * 0.45 + crack * 0.6; }
    }, { normal: 5 });
  };
  T.ground = function () {
    return make('ground', 512, function (h, a, S) {
      var n = noiseField(S, 8, 101, 6), p = noiseField(S, 64, 102, 2), R = rng(103);
      for (var i = 0; i < S * S; i++) { h[i] = n[i] * 0.7 + p[i] * 0.4; a[i] = 0.78 + n[i] * 0.3 + (p[i] - 0.5) * 0.15; }
      // pebbles
      for (var s = 0; s < 900; s++) { var x = R() * S | 0, y = R() * S | 0, r = 1 + R() * 3; for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) { var k = ((y + dy) & (S - 1)) * S + ((x + dx) & (S - 1)); h[k] += 0.25 * (1 - (dx * dx + dy * dy) / (r * r + 1)); a[k] *= 0.92 + R() * 0.12; } }
    }, { normal: 4 });
  };
  T.panels = function () {
    // large sci-fi floor/wall panels for structures
    return make('panels', 512, function (h, a, S) {
      var n = noiseField(S, 8, 201, 5), R = rng(202);
      for (var i = 0; i < S * S; i++) { h[i] = n[i] * 0.2; a[i] = 0.82 + n[i] * 0.2; }
      function rect(x0, y0, w, hh, depth, bright) { for (var y = y0; y < y0 + hh; y++) for (var x = x0; x < x0 + w; x++) { var k = (y & (S - 1)) * S + (x & (S - 1)); h[k] += depth; a[k] *= bright; } }
      for (var y = 0; y < S; y += 128) for (var x = 0; x < S; x += 128) {
        rect(x, y, 128, 2, -0.6, 0.55); rect(x, y, 2, 128, -0.6, 0.55);
        if (R() < 0.5) rect(x + 16, y + 16, 96, 96, 0.15, 1.05);
        if (R() < 0.4) for (var v = 0; v < 6; v++) rect(x + 20 + v * 14, y + 40, 6, 48, -0.3, 0.75);
      }
    }, { normal: 3 });
  };
  T.leaf = function () {
    return make('leaf', 256, function (h, a, S) {
      var n = noiseField(S, 16, 301, 3), m = noiseField(S, 4, 302, 3);
      for (var i = 0; i < S * S; i++) { h[i] = n[i]; a[i] = 0.62 + n[i] * 0.35 + (m[i] - 0.5) * 0.3; }
    }, { normal: 3 });
  };
  T.water = function () {
    return make('water', 256, function (h, a, S) { var n = noiseField(S, 8, 401, 4); for (var i = 0; i < S * S; i++) { h[i] = n[i]; a[i] = 1; } }, { normal: 6 });
  };
  T.cloud = function () {
    if (cache.cloud) return cache.cloud;
    var S = 256, c = canvas(S), x = c.getContext('2d'), id = x.createImageData(S, S), n = noiseField(S, 4, 501, 6);
    for (var py = 0; py < S; py++) for (var px = 0; px < S; px++) {
      var i = py * S + px, dx = px / S - 0.5, dy = py / S - 0.5, fall = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2.1);
      var v = Math.max(0, n[i] - 0.38) * 2.6 * fall;
      id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = Math.min(255, v * 255);
    }
    x.putImageData(id, 0, 0);
    cache.cloud = new THREE.CanvasTexture(c);
    return cache.cloud;
  };
  T.glow = function () {
    if (cache.glow) return cache.glow;
    var S = 128, c = canvas(S), x = c.getContext('2d'), g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    cache.glow = new THREE.CanvasTexture(c);
    return cache.glow;
  };

  // ------------------------------------------------------------------ triplanar patch for MeshStandardMaterial
  // Samples map + normalMap in world space, blended by the surface normal. Works on merged geometry without UVs.
  T.triplanar = function (mat, tex, scale, normalScale) {
    mat.map = tex.map; mat.normalMap = tex.normal;
    mat.normalScale = new THREE.Vector2(normalScale || 0.8, normalScale || 0.8);
    mat.userData.triScale = scale;
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.triScale = { value: scale };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNor;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz; vWNor = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNor; uniform float triScale;\n' +
          'vec3 triW(){ vec3 b = pow(abs(vWNor), vec3(4.0)); return b / (b.x + b.y + b.z); }\n' +
          'vec4 triTex(sampler2D t){ vec3 w = triW(); vec2 a = vWPos.zy * triScale, b = vWPos.xz * triScale, c = vWPos.xy * triScale;\n' +
          '  return texture2D(t, a) * w.x + texture2D(t, b) * w.y + texture2D(t, c) * w.z; }\n' +
          'vec4 triTexFar(sampler2D t){ vec3 w = triW(); float s = triScale * 0.17; return texture2D(t, vWPos.zy * s) * w.x + texture2D(t, vWPos.xz * s) * w.y + texture2D(t, vWPos.xy * s) * w.z; }')
        .replace('#include <map_fragment>', 'vec4 texelColor = mix(triTex(map), triTexFar(map), 0.45); texelColor = mapTexelToLinear(texelColor); diffuseColor *= texelColor;')
        .replace('#include <normal_fragment_maps>',
          'vec3 tn = triTex(normalMap).xyz * 2.0 - 1.0; tn.xy *= normalScale;\n' +
          'vec3 wn = normalize(vWNor); vec3 up = abs(wn.y) < 0.95 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);\n' +
          'vec3 tg = normalize(cross(up, wn)); vec3 bt = cross(wn, tg);\n' +
          'vec3 pn = normalize(tg * tn.x + bt * tn.y + wn * tn.z);\n' +
          'normal = normalize((viewMatrix * vec4(pn, 0.0)).xyz);');
    };
    mat.needsUpdate = true;
    return mat;
  };
})();
