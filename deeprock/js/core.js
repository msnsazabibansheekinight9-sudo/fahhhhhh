/* Rock & Stone — core math, noise, RNG, helpers.
   A homage to Deep Rock Galactic: procedural destructible caves, four dwarf
   classes, glyphid swarms, mining quotas and drop-pod extraction. */
window.RS = window.RS || {};
(function (RS) {
  'use strict';

  // ---------------------------------------------------------------- random
  RS.mulberry32 = function (a) {
    a = a | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Deterministic stream with convenience helpers.
  RS.Rng = function (seed) {
    var r = RS.mulberry32(seed === undefined ? (Math.random() * 1e9) | 0 : seed);
    r.range = function (a, b) { return a + (b - a) * r(); };
    r.int = function (a, b) { return a + Math.floor(r() * (b - a + 1)); };
    r.pick = function (arr) { return arr[Math.floor(r() * arr.length) % arr.length]; };
    r.chance = function (p) { return r() < p; };
    r.sign = function () { return r() < 0.5 ? -1 : 1; };
    r.shuffle = function (arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(r() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    };
    return r;
  };

  // ---------------------------------------------------------------- scalars
  var clamp = RS.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  RS.clamp01 = function (v) { return v < 0 ? 0 : (v > 1 ? 1 : v); };
  var lerp = RS.lerp = function (a, b, t) { return a + (b - a) * t; };
  RS.smoothstep = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  RS.mix = lerp;
  RS.sat = function (v) { return v < 0 ? 0 : (v > 1 ? 1 : v); };
  // Polynomial smooth min — keeps carved tunnels blending into each other.
  RS.smin = function (a, b, k) {
    var h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1);
    return lerp(b, a, h) - k * h * (1 - h);
  };
  RS.smax = function (a, b, k) { return -RS.smin(-a, -b, k); };
  RS.damp = function (cur, target, rate, dt) { return target + (cur - target) * Math.exp(-rate * dt); };
  RS.approach = function (cur, target, step) {
    if (cur < target) return Math.min(target, cur + step);
    return Math.max(target, cur - step);
  };
  RS.wrapAngle = function (a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };

  // ---------------------------------------------------------------- noise
  // Integer hash -> [0,1). Cheap, stable, no tables to build.
  function hash3(x, y, z) {
    var h = x * 374761393 + y * 668265263 + z * 1274126177;
    h = (h ^ (h >>> 13)) | 0;
    h = Math.imul(h, 1274126177);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  }
  RS.hash3 = hash3;
  RS.hash1 = function (x) {
    var h = Math.imul(x | 0, 374761393);
    h = (h ^ (h >>> 13)) | 0; h = Math.imul(h, 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // Trilinear value noise. Fast enough to evaluate millions of times during
  // cave carving; smooth enough that rock walls read as rock.
  var noise3 = RS.noise3 = function (x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var xf = x - xi, yf = y - yi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    var c000 = hash3(xi, yi, zi), c100 = hash3(xi + 1, yi, zi);
    var c010 = hash3(xi, yi + 1, zi), c110 = hash3(xi + 1, yi + 1, zi);
    var c001 = hash3(xi, yi, zi + 1), c101 = hash3(xi + 1, yi, zi + 1);
    var c011 = hash3(xi, yi + 1, zi + 1), c111 = hash3(xi + 1, yi + 1, zi + 1);
    var x00 = lerp(c000, c100, u), x10 = lerp(c010, c110, u);
    var x01 = lerp(c001, c101, u), x11 = lerp(c011, c111, u);
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
  };

  RS.fbm3 = function (x, y, z, oct, lac, gain) {
    oct = oct || 3; lac = lac || 2.03; gain = gain || 0.5;
    var a = 0.5, f = 1, sum = 0, norm = 0;
    for (var i = 0; i < oct; i++) {
      sum += a * noise3(x * f, y * f, z * f);
      norm += a; a *= gain; f *= lac;
    }
    return sum / norm;
  };

  // Signed ridged noise, good for rock striations and cracks.
  RS.ridge3 = function (x, y, z) {
    var n = noise3(x, y, z) * 2 - 1;
    return 1 - Math.abs(n);
  };

  // ---------------------------------------------------------------- colour
  RS.hexLerp = function (a, b, t) {
    var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return ((ar + (br - ar) * t) << 16 | (ag + (bg - ag) * t) << 8 | (ab + (bb - ab) * t)) & 0xffffff;
  };
  RS.shade = function (hex, f) {
    var r = clamp(((hex >> 16) & 255) * f, 0, 255) | 0;
    var g = clamp(((hex >> 8) & 255) * f, 0, 255) | 0;
    var b = clamp((hex & 255) * f, 0, 255) | 0;
    return (r << 16) | (g << 8) | b;
  };

  // ---------------------------------------------------------------- misc
  RS.fmtTime = function (s) {
    s = Math.max(0, s | 0);
    var m = (s / 60) | 0, r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  };
  RS.fmtNum = function (n) { return (n | 0).toLocaleString('en-US'); };

  RS.removeFrom = function (arr, item) {
    var i = arr.indexOf(item);
    if (i >= 0) arr.splice(i, 1);
    return i >= 0;
  };

  // Tiny pub/sub so systems don't have to know about each other.
  RS.bus = (function () {
    var map = {};
    return {
      on: function (k, fn) { (map[k] || (map[k] = [])).push(fn); return fn; },
      off: function (k, fn) { if (map[k]) RS.removeFrom(map[k], fn); },
      emit: function (k, a, b, c) {
        var l = map[k]; if (!l) return;
        for (var i = 0; i < l.length; i++) l[i](a, b, c);
      }
    };
  })();

  // Saved profile (XP, credits, settings). Browser storage is a convenience
  // only — every read is guarded because it can throw or come back empty.
  var SAVE_KEY = 'rockandstone.profile.v1';
  RS.loadProfile = function () {
    var def = {
      xp: 0, credits: 0, missions: 0, deepest: 0,
      classXp: { driller: 0, engineer: 0, gunner: 0, scout: 0 },
      best: {}, settings: { invertY: false, sens: 1, fov: 78, sfx: 0.8, music: 0.5, shake: 1 }
    };
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return def;
      var p = JSON.parse(raw);
      for (var k in def) if (!(k in p)) p[k] = def[k];
      for (var s in def.settings) if (!(s in p.settings)) p.settings[s] = def.settings[s];
      return p;
    } catch (e) { return def; }
  };
  RS.saveProfile = function (p) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(p)); } catch (e) { /* private mode */ }
  };
  // Promotion ranks, in the spirit of the originals' dwarf ranks.
  RS.RANKS = ['Greenbeard', 'Rock Hauler', 'Cave Crawler', 'Tunnel Rat', 'Stone Breaker',
    'Vein Hunter', 'Deep Diver', 'Bug Stomper', 'Core Breacher', 'Legendary Beard'];
  RS.rankFor = function (xp) {
    var lvl = Math.min(24, Math.floor(Math.sqrt(Math.max(0, xp) / 900)));
    return { level: lvl + 1, title: RS.RANKS[Math.min(RS.RANKS.length - 1, Math.floor(lvl / 2.5))] };
  };
})(window.RS);
