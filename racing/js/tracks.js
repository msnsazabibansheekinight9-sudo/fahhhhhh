// Track generation: every track is built from its style + seed into a sampled centreline.
var RX = window.RX || (window.RX = {});

RX.rng = function (seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

RX.SURF = {
  asphalt: { id: 0, mu: 1.0, roll: 0.012, dust: 0, color: '#3a3b3e' },
  gravel: { id: 1, mu: 0.74, roll: 0.03, dust: 1, color: '#9a8566' },
  dirt: { id: 2, mu: 0.70, roll: 0.03, dust: 1, color: '#7a5636' },
  mud: { id: 3, mu: 0.56, roll: 0.05, dust: 0.5, color: '#4e3a26' },
  snow: { id: 4, mu: 0.46, roll: 0.03, dust: 0.8, color: '#e8eef4' },
  sand: { id: 5, mu: 0.62, roll: 0.06, dust: 1, color: '#d9b77a' },
  salt: { id: 6, mu: 0.78, roll: 0.015, dust: 0.6, color: '#eceae2' },
  grass: { id: 7, mu: 0.55, roll: 0.05, dust: 0.3, color: '#4f7a34' }
};
RX.SURF_LIST = ['asphalt', 'gravel', 'dirt', 'mud', 'snow', 'sand', 'salt', 'grass'];

// Round polygon corners with arcs of radius r (r can be per-vertex array).
function filletPolygon(poly, rad, step) {
  var out = [], n = poly.length;
  for (var i = 0; i < n; i++) {
    var p0 = poly[(i - 1 + n) % n], p1 = poly[i], p2 = poly[(i + 1) % n];
    var r = Array.isArray(rad) ? rad[i] : rad;
    var ax = p0[0] - p1[0], az = p0[1] - p1[1], bx = p2[0] - p1[0], bz = p2[1] - p1[1];
    var la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    ax /= la; az /= la; bx /= lb; bz /= lb;
    var cosA = ax * bx + az * bz, ang = Math.acos(Math.max(-1, Math.min(1, cosA)));
    var t = r / Math.tan(ang / 2);
    t = Math.min(t, la * 0.48, lb * 0.48);
    var s = [p1[0] + ax * t, p1[1] + az * t], e = [p1[0] + bx * t, p1[1] + bz * t];
    var segs = Math.max(3, Math.ceil((Math.PI - ang) * t / step));
    for (var k = 0; k <= segs; k++) {
      var u = k / segs, v = 1 - u;
      // quadratic bezier from s via p1 to e — close to a circular arc for these angles
      out.push([v * v * s[0] + 2 * v * u * p1[0] + u * u * e[0], v * v * s[1] + 2 * v * u * p1[1] + u * u * e[1]]);
    }
  }
  return out;
}

function catmull(pts, closed, samplesPer) {
  var out = [], n = pts.length;
  var count = closed ? n : n - 1;
  for (var i = 0; i < count; i++) {
    var p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = pts[i],
        p2 = pts[closed ? (i + 1) % n : i + 1], p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
    for (var k = 0; k < samplesPer; k++) {
      var t = k / samplesPer, t2 = t * t, t3 = t2 * t;
      var o = [];
      for (var d = 0; d < p1.length; d++) {
        o.push(0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3));
      }
      out.push(o);
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}

// Resample polyline [x,z] to even spacing ds.
function resample(poly, ds, closed) {
  var pts = poly.slice(); if (closed) pts.push(poly[0]);
  var out = [pts[0].slice()], acc = 0;
  for (var i = 1; i < pts.length; i++) {
    var a = pts[i - 1], b = pts[i];
    var seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (seg < 1e-6) continue;
    var pos = 0;
    while (acc + (seg - pos) >= ds) {
      pos += ds - acc; acc = 0;
      var t = pos / seg;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    acc += seg - pos;
  }
  if (closed) { var l = out[out.length - 1]; if (Math.hypot(l[0] - out[0][0], l[1] - out[0][1]) < ds * 0.5) out.pop(); }
  else out.push(pts[pts.length - 1].slice());
  return out;
}

// Chaikin smoothing to soften corners while keeping the shape.
function smooth(poly, iters, closed) {
  for (var it = 0; it < iters; it++) {
    var o = [], n = poly.length;
    for (var i = 0; i < (closed ? n : n - 1); i++) {
      var a = poly[i], b = poly[(i + 1) % n];
      o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      o.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) { o.unshift(poly[0]); o.push(poly[n - 1]); }
    poly = o;
  }
  return poly;
}

RX.buildTrack = function (def, sport) {
  var R = RX.rng(def.seed * 7919 + 13), o = def.opts, style = def.style;
  var poly, closed = true, halfW = 7, ds = 2;
  var defaultSurf = o.surface || (sport.surface === 'mixed' ? 'asphalt' : sport.surface);
  if (style === 'circuit' || style === 'kart') {
    var kart = style === 'kart';
    var Rbase = kart ? 110 : (o.small ? 260 : o.long ? 720 : 480);
    var n = kart ? 14 + Math.floor(R() * 6) : (o.fast ? 9 + Math.floor(R() * 4) : 12 + Math.floor(R() * 7));
    poly = [];
    var a0 = R() * Math.PI * 2;
    for (var i = 0; i < n; i++) {
      var a = a0 + i / n * Math.PI * 2 + (R() - 0.5) * (0.5 / n) * Math.PI * 2;
      var r = Rbase * (0.55 + R() * 0.65);
      if (!o.fast && R() < 0.3) r *= 0.6; // tighter infield section -> hairpins
      poly.push([Math.cos(a) * r * (1.25), Math.sin(a) * r * 0.85]);
    }
    // a long main straight: flatten two consecutive points onto a line
    var sIdx = Math.floor(R() * n);
    var pA = poly[sIdx], pB = poly[(sIdx + 1) % n];
    poly[sIdx] = [pA[0] * 1.08, pA[1] * 1.08];
    poly[(sIdx + 1) % n] = [pB[0] * 1.08, pB[1] * 1.08];
    var rads = poly.map(function () { return kart ? 8 + R() * 18 : (o.fast ? 60 + R() * 120 : 18 + R() * 70); });
    poly = filletPolygon(poly, rads, 3);
    poly = smooth(poly, 2, true);
    halfW = kart ? 4.2 : (o.small ? 6 : 7.5);
    ds = kart ? 1.2 : 2;
  } else if (style === 'street') {
    var Wd = 380 + R() * 240, Hd = 260 + R() * 180;
    poly = [[-Wd, -Hd]];
    // bottom side notch
    var pushNotch = function (x0, z0, x1, z1, inx, inz) {
      if (R() < 0.75) {
        var L = Math.hypot(x1 - x0, z1 - z0), f0 = 0.2 + R() * 0.25, f1 = f0 + 0.15 + R() * 0.25;
        var depth = (0.15 + R() * 0.3) * (inx ? Wd : Hd);
        var a = [x0 + (x1 - x0) * f0, z0 + (z1 - z0) * f0], b = [x0 + (x1 - x0) * f1, z0 + (z1 - z0) * f1];
        poly.push(a, [a[0] + inx * depth, a[1] + inz * depth], [b[0] + inx * depth, b[1] + inz * depth], b);
      }
      poly.push([x1, z1]);
    };
    pushNotch(-Wd, -Hd, Wd, -Hd, 0, 1);
    pushNotch(Wd, -Hd, Wd, Hd, -1, 0);
    pushNotch(Wd, Hd, -Wd, Hd, 0, -1);
    pushNotch(-Wd, Hd, -Wd, -Hd, 1, 0);
    poly.pop();
    // a waterfront swerve: slight skew
    var skew = (R() - 0.5) * 0.3;
    poly = poly.map(function (p) { return [p[0] + p[1] * skew, p[1]]; });
    poly = filletPolygon(poly, poly.map(function () { return 9 + R() * 16; }), 2);
    halfW = 6; ds = 2;
  } else if (style === 'oval') {
    var big = o.big ? 1.45 : o.small ? 0.42 : 1;
    var L = (420 + R() * 200) * big, Wo = (200 + R() * 80) * big, rr = Wo * 0.48;
    var shape = o.oval || 'egg';
    if (shape === 'rect') poly = [[-L, -Wo], [L, -Wo], [L, Wo], [-L, Wo]], rr = Wo * 0.42;
    else if (shape === 'paperclip') poly = [[-L, -Wo * 0.7], [L, -Wo * 0.7], [L, Wo * 0.7], [-L, Wo * 0.7]], rr = Wo * 0.7;
    else if (shape === 'tri') poly = [[-L, -Wo], [0, -Wo * 1.35], [L, -Wo], [L, Wo], [-L, Wo]], rr = [Wo * 0.9, Wo * 2.5, Wo * 0.9, Wo * 0.9, Wo * 0.9];
    else if (shape === 'quad') poly = [[-L, -Wo], [-L * 0.3, -Wo * 1.15], [L * 0.3, -Wo * 1.15], [L, -Wo], [L, Wo], [-L, Wo]], rr = [Wo * 0.9, Wo * 2, Wo * 2, Wo * 0.9, Wo * 0.9, Wo * 0.9];
    else poly = [[-L, -Wo], [L * 1.05, -Wo * 1.05], [L, Wo], [-L, Wo * 0.9]], rr = [Wo * 0.85, Wo, Wo, Wo * 0.85];
    poly = filletPolygon(poly, rr, 3);
    poly = smooth(poly, 2, true);
    halfW = o.small ? 8 : 10.5; ds = 2;
  } else if (style === 'rx') {
    var Rb = 150;
    var nr = 9 + Math.floor(R() * 4);
    poly = [];
    var ar = R() * 6.28;
    for (var j = 0; j < nr; j++) {
      var aa = ar + j / nr * Math.PI * 2;
      var rad = Rb * (0.6 + R() * 0.6);
      poly.push([Math.cos(aa) * rad * 1.3, Math.sin(aa) * rad]);
    }
    poly = filletPolygon(poly, poly.map(function () { return 12 + R() * 25; }), 2);
    poly = smooth(poly, 2, true);
    halfW = 6.5; ds = 1.5;
  } else if (style === 'stage' || style === 'hill') {
    closed = false;
    poly = [[0, 0]];
    var hd = 0, x = 0, z = 0, len = (o.long ? 6500 : o.small ? 1800 : 4000 + R() * 1600);
    var step = 3, travelled = 0;
    var twisty = style === 'hill' ? 1 : (o.dunes ? 0.45 : sport.id === 'offroad' ? 0.6 : 1);
    var legDir = R() < 0.5 ? 1 : -1, switchLeft = 0;
    var walk = function (dist, rate) {
      var n = Math.max(1, Math.round(dist / step));
      for (var w = 0; w < n; w++) {
        hd += rate * step;
        x += Math.sin(hd) * step; z += Math.cos(hd) * step;
        poly.push([x, z]); travelled += step;
      }
    };
    while (travelled < len) {
      if (style === 'hill' && !o.small && switchLeft === 0 && R() < 0.25) switchLeft = 3 + Math.floor(R() * 4);
      if (switchLeft > 0) {
        // switchback: traverse the slope then a hairpin back the other way
        var aim = legDir * 1.5;
        var turnTo = function (target, r) { var d = target - hd; walk(Math.abs(d) * r, Math.sign(d) / r); };
        turnTo(aim, 14 + R() * 6);
        walk(60 + R() * 70, 0);
        legDir = -legDir; switchLeft--;
        if (switchLeft === 0) turnTo(0, 25 + R() * 20);
        continue;
      }
      walk((20 + R() * 160) / twisty, 0); // straight
      // corner: radius from hairpin to flat-out kink
      var rr = R(), radius = rr < 0.15 ? 12 + R() * 10 : rr < 0.5 ? 25 + R() * 35 : 60 + R() * 140;
      radius /= Math.min(1, twisty + 0.3);
      var angle = (0.3 + R() * 1.6) * (R() < 0.5 ? -1 : 1);
      if (Math.abs(hd + angle) > 1.55) angle = -angle * 0.8;
      if (Math.abs(hd + angle) > 1.55) angle = -hd * 0.7;
      walk(Math.abs(angle) * radius, Math.sign(angle) / radius);
      if (R() < 0.35) { // linked corner (esses / chicane)
        var a2 = -angle * (0.5 + R() * 0.6), r2 = radius * (0.6 + R() * 0.8);
        if (Math.abs(hd + a2) > 1.55) a2 = -hd * 0.5;
        walk(Math.abs(a2) * r2, Math.sign(a2) / r2);
      }
    }
    poly = smooth(poly, 1, false);
    halfW = style === 'hill' ? 4.5 : (defaultSurf === 'sand' || defaultSurf === 'dirt' ? 6 : 4.6);
    if (sport.id === 'offroad') halfW = 9;
    if (sport.id === 'drift') halfW = 6;
    ds = 2;
  } else if (style === 'drag') {
    closed = false;
    var dl = (o.len || 402);
    poly = [[0, -60], [0, dl + Math.max(500, dl * 0.6)]];
    halfW = 11; ds = 2;
  }

  var pts = resample(poly, ds, closed);
  var N = pts.length;
  var P = new Array(N);
  var total = 0;
  for (var k = 0; k < N; k++) {
    var p = pts[k], q = pts[closed ? (k + 1) % N : Math.min(N - 1, k + 1)], pr = pts[closed ? (k - 1 + N) % N : Math.max(0, k - 1)];
    var tx = q[0] - pr[0], tz = q[1] - pr[1], tl = Math.hypot(tx, tz) || 1;
    tx /= tl; tz /= tl;
    if (k > 0) total += Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]);
    P[k] = { x: p[0], z: p[1], y: 0, tx: tx, tz: tz, nx: tz, nz: -tx, w: halfW, bank: 0, surf: defaultSurf, s: total, curv: 0, kerb: 0, jump: 0 };
  }
  var length = closed ? total + Math.hypot(pts[0][0] - pts[N - 1][0], pts[0][1] - pts[N - 1][1]) : total;
  // curvature (signed, + = turning right)
  for (k = 0; k < N; k++) {
    var a1 = P[closed ? (k - 3 + N) % N : Math.max(0, k - 3)], a2 = P[closed ? (k + 3) % N : Math.min(N - 1, k + 3)];
    var cross = a1.tx * a2.tz - a1.tz * a2.tx, dot = a1.tx * a2.tx + a1.tz * a2.tz;
    var ang = Math.atan2(cross, dot);
    P[k].curv = ang / (6 * ds);
  }
  // elevation
  var amp = o.hilly ? 22 : (style === 'oval' || style === 'drag' ? 0 : 4);
  if (style === 'kart') amp = 1.5;
  if (style === 'hill') amp = 10;
  var harm = [];
  for (var hh = 0; hh < 5; hh++) harm.push([1 + hh + Math.floor(R() * 2), R() * 6.28, (R() * 0.8 + 0.2) / (hh + 1)]);
  for (k = 0; k < N; k++) {
    var u = P[k].s / length * Math.PI * 2, y = 0;
    for (hh = 0; hh < harm.length; hh++) y += Math.sin(u * harm[hh][0] + harm[hh][1]) * harm[hh][2];
    y *= amp;
    if (style === 'hill') y += (o.down ? -1 : 1) * P[k].s * (o.small ? 0.06 : 0.085);
    if (!closed && style === 'stage') y += Math.sin(P[k].s / 300) * (o.hilly ? 18 : 6) + Math.sin(P[k].s / 97) * (o.dunes ? 4 : 1.5);
    if (style === 'drag' && o.hilly) y = 0;
    P[k].y = y;
  }
  // jumps / crests on stages and rx tracks
  if (o.jumps || style === 'rx' || o.dunes) {
    var nj = style === 'rx' ? 1 : 5 + Math.floor(R() * 5);
    for (var jj = 0; jj < nj; jj++) {
      var c = Math.floor((0.12 + R() * 0.8) * N);
      if (Math.abs(P[c].curv) > 0.01) continue;
      var span = Math.floor(14 / ds), hgt = 1.8 + R() * 1.6;
      for (var q2 = -span; q2 <= span; q2++) {
        var idx = closed ? (c + q2 + N) % N : c + q2;
        if (idx < 0 || idx >= N) continue;
        var f = q2 / span;
        // steep take-off, gentler landing
        var shapeY = f < 0 ? Math.cos(f * Math.PI / 2) : Math.pow(Math.cos(f * Math.PI / 2), 0.6);
        P[idx].y += shapeY * hgt;
        P[idx].jump = 1;
      }
    }
  }
  // banking for ovals, kerbs at corners
  for (k = 0; k < N; k++) {
    var cv = P[k].curv;
    if (style === 'oval') {
      var bankDeg = (o.bank || 10) * Math.min(1, Math.abs(cv) * (o.small ? 70 : 160));
      P[k].bank = -Math.sign(cv) * bankDeg * Math.PI / 180;
    }
    if (Math.abs(cv) > (style === 'kart' ? 0.02 : 0.008) && style !== 'oval' && style !== 'drag') P[k].kerb = 1;
  }
  // smooth bank
  if (style === 'oval') {
    for (var pass = 0; pass < 30; pass++) {
      var nb = P.map(function (pt, i2) { return (P[(i2 - 1 + N) % N].bank + pt.bank * 2 + P[(i2 + 1) % N].bank) / 4; });
      for (k = 0; k < N; k++) P[k].bank = nb[k];
    }
  }
  // mixed surfaces
  if (o.surface === 'mixed' || (sport.surface === 'mixed' && style === 'rx')) {
    for (k = 0; k < N; k++) {
      var fr = P[k].s / length;
      P[k].surf = (fr > 0.35 && fr < 0.72) ? 'gravel' : 'asphalt';
    }
  }
  // rally snow/mud stages keep their own surface; offroad sections with some rocky bits
  if (sport.id === 'offroad') for (k = 0; k < N; k++) if (Math.sin(P[k].s / 420) > 0.75) P[k].surf = 'gravel';

  // start positions
  var startIdx = closed ? 0 : (style === 'drag' ? Math.round(60 / ds) : Math.round(30 / ds));
  if (closed) {
    // start/finish on the longest straight
    var best = 0, bestRun = 0, run = 0;
    for (k = 0; k < N * 2; k++) {
      var kk = k % N;
      if (Math.abs(P[kk].curv) < 0.002) { run++; if (run > bestRun) { bestRun = run; best = kk; } } else run = 0;
    }
    startIdx = (best - Math.floor(bestRun * 0.35) + N) % N;
    // rotate so index 0 is the start line
    P = P.slice(startIdx).concat(P.slice(0, startIdx));
    var s0 = P[0].s;
    for (k = 0; k < N; k++) { P[k].s = (P[k].s - s0 + length) % length; }
    startIdx = 0;
  }
  var finishS = closed ? 0 : (style === 'drag' ? (o.len || 402) : P[N - 1].s - 60);
  var startS = P[startIdx].s;

  var walls = style === 'street' || style === 'oval' || o.walls || style === 'kart';
  var track = {
    def: def, sport: sport, style: style, closed: closed, pts: P, N: N, ds: ds, length: length,
    halfW: halfW, theme: def.theme, surface: defaultSurf, startIdx: startIdx, startS: startS, finishS: finishS,
    walls: walls,
    wallOff: style === 'street' ? 1.2 : style === 'oval' ? 1.5 : style === 'kart' ? 3 : (style === 'stage' || style === 'hill') ? 9 : 18,
    dragLen: style === 'drag' ? (o.len || 402) : 0,
    night: !!o.night, rain: !!o.rain
  };
  // spatial hash for nearest-point queries from scenery
  track.hash = {};
  for (k = 0; k < N; k++) {
    var key = Math.floor(P[k].x / 40) + ',' + Math.floor(P[k].z / 40);
    (track.hash[key] || (track.hash[key] = [])).push(k);
  }
  // bounds
  var minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
  P.forEach(function (pt) { minx = Math.min(minx, pt.x); maxx = Math.max(maxx, pt.x); minz = Math.min(minz, pt.z); maxz = Math.max(maxz, pt.z); });
  track.bounds = { minx: minx, maxx: maxx, minz: minz, maxz: maxz };
  // pit lane zone (closed circuits): last 3% of lap and first 2%
  track.pitStart = length * 0.965; track.pitEnd = length * 0.02;
  // attack-mode zone for Formula E
  track.attackS = length * 0.4;
  // joker lane for rallycross
  track.jokerS = length * 0.8;
  return track;
};

// Nearest centreline sample to (x,z) using the spatial hash (search radius in cells).
RX.nearestIdx = function (track, x, z, rad) {
  rad = rad || 2;
  var cx = Math.floor(x / 40), cz = Math.floor(z / 40), best = -1, bd = 1e18;
  for (var i = -rad; i <= rad; i++) for (var j = -rad; j <= rad; j++) {
    var arr = track.hash[(cx + i) + ',' + (cz + j)];
    if (!arr) continue;
    for (var k = 0; k < arr.length; k++) {
      var p = track.pts[arr[k]], d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < bd) { bd = d; best = arr[k]; }
    }
  }
  return { idx: best, d2: bd };
};

// Local search from a previous index (cheap per-frame tracking).
RX.trackLocal = function (track, x, z, idx) {
  var P = track.pts, N = track.N, best = idx, bd = 1e18;
  var span = 30;
  for (var i = -span; i <= span; i++) {
    var k = track.closed ? (idx + i + N) % N : Math.max(0, Math.min(N - 1, idx + i));
    var p = P[k], d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
    if (d < bd) { bd = d; best = k; }
  }
  if (bd > 60 * 60) { var r = RX.nearestIdx(track, x, z, 3); if (r.idx >= 0) best = r.idx; }
  var p0 = P[best];
  // project onto segment to the next sample for continuous s and lateral offset
  var nxt = P[track.closed ? (best + 1) % N : Math.min(N - 1, best + 1)];
  var dx = x - p0.x, dz = z - p0.z;
  var along = dx * p0.tx + dz * p0.tz;
  var lat = dx * p0.nx + dz * p0.nz;
  var s = p0.s + along;
  if (track.closed) s = (s + track.length) % track.length;
  var t = Math.max(-1, Math.min(1, along / track.ds));
  var y = p0.y + (t > 0 ? (nxt.y - p0.y) * t : 0);
  return { idx: best, s: s, lat: lat, y: y, p: p0 };
};

// Sample position at distance s along the centreline with lateral offset.
RX.trackAt = function (track, s, lat) {
  var N = track.N, ds = track.ds, L = track.length;
  if (track.closed) s = ((s % L) + L) % L; else s = Math.max(0, Math.min(track.pts[N - 1].s, s));
  var i = Math.floor(s / ds);
  // samples are near-uniform; correct index by scanning
  i = Math.max(0, Math.min(N - 1, i));
  while (i < N - 1 && track.pts[i + 1].s <= s) i++;
  while (i > 0 && track.pts[i].s > s) i--;
  var a = track.pts[i], b = track.pts[track.closed ? (i + 1) % N : Math.min(N - 1, i + 1)];
  var segL = (b.s > a.s ? b.s - a.s : (track.closed ? L - a.s + b.s : 1)) || 1;
  var t = Math.max(0, Math.min(1, (s - a.s) / segL));
  var tx = a.tx + (b.tx - a.tx) * t, tz = a.tz + (b.tz - a.tz) * t, l = Math.hypot(tx, tz) || 1;
  tx /= l; tz /= l;
  var bank = a.bank + (b.bank - a.bank) * t;
  var y = a.y + (b.y - a.y) * t + Math.sin(-bank) * (lat || 0) * 0; // bank height applied in world via roadHeight
  return {
    x: a.x + (b.x - a.x) * t + tz * (lat || 0), z: a.z + (b.z - a.z) * t - tx * (lat || 0),
    y: y, tx: tx, tz: tz, bank: bank, curv: a.curv, idx: i, w: a.w, surf: a.surf, p: a
  };
};

// Height of the road surface at a lateral offset (accounts for banking).
RX.roadHeight = function (p, lat) {
  var w = p.w;
  var cl = Math.max(-w, Math.min(w, lat));
  var h = p.y - Math.tan(p.bank) * cl;
  var off = Math.abs(lat) - w;
  if (off > 0) {
    // banked ovals: apron/wall slope continues a little, otherwise the runoff is flat-ish
    h -= Math.min(off, 3) * 0.04;
  }
  return h;
};
