'use strict';
// Map generation: heightfields per layout, roads, bridges, buildings, navigation grids and scenery.
(function () {
  const T = THREE, PI = Math.PI;
  const smooth = (a, b, x) => { const t = SM.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // ------------------------------------------------------------ simplex noise
  function makeNoise(seed) {
    const r = SM.rng(seed), p = new Uint8Array(512), perm = [];
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const g = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    function n2(xin, yin) {
      const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s);
      const t = (i + j) * G2, x0 = xin - (i - t), y0 = yin - (j - t);
      const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      let n0 = 0, n1 = 0, nn2 = 0;
      let t0 = 0.5 - x0 * x0 - y0 * y0; if (t0 > 0) { const gg = g[p[ii + p[jj]] & 7]; t0 *= t0; n0 = t0 * t0 * (gg[0] * x0 + gg[1] * y0); }
      let t1 = 0.5 - x1 * x1 - y1 * y1; if (t1 > 0) { const gg = g[p[ii + i1 + p[jj + j1]] & 7]; t1 *= t1; n1 = t1 * t1 * (gg[0] * x1 + gg[1] * y1); }
      let t2 = 0.5 - x2 * x2 - y2 * y2; if (t2 > 0) { const gg = g[p[ii + 1 + p[jj + 1]] & 7]; t2 *= t2; nn2 = t2 * t2 * (gg[0] * x2 + gg[1] * y2); }
      return 70 * (n0 + n1 + nn2);
    }
    function fbm(x, y, oct, lac, gain) { let a = 1, f = 1, s = 0, n = 0; for (let i = 0; i < oct; i++) { s += a * n2(x * f, y * f); n += a; a *= gain || 0.5; f *= lac || 2; } return s / n; }
    function ridged(x, y, oct) { let a = 1, f = 1, s = 0, n = 0; for (let i = 0; i < oct; i++) { s += a * (1 - Math.abs(n2(x * f, y * f))); n += a; a *= 0.5; f *= 2; } return s / n; }
    return { n2, fbm, ridged };
  }
  SM.makeNoise = makeNoise;

  // ------------------------------------------------------------ heightfield layouts
  const LAYOUT = {
    dunes(x, z, N, r) { return 3 + 6 * N.fbm(x / 160, z / 160, 4) + 5 * Math.pow(Math.abs(Math.sin((x * 0.75 + z * 0.35) / 22 + 3 * N.n2(x / 110, z / 110))), 1.6) * (0.6 + 0.4 * N.n2(x / 70, z / 70)); },
    canyon(x, z, N) { const v = Math.abs(N.fbm(x / 170, z / 170, 3)); const wall = smooth(0.1, 0.17, v); return 1 + 2 * N.fbm(x / 40, z / 40, 2) + wall * (24 + 6 * N.fbm(x / 60, z / 60, 3)); },
    jungle(x, z, N) { let h = 5 + 9 * N.fbm(x / 110, z / 110, 4) + 2.5 * N.fbm(x / 22, z / 22, 2); const rx = 70 * Math.sin(z / 85) + 25 * N.n2(z / 50, 3); const d = Math.abs(x - rx); h -= 11 * Math.exp(-(d / 14) * (d / 14)); return h; },
    delta(x, z, N) { let h = 2.2 + 2.2 * N.fbm(x / 80, z / 80, 4); const cx = 150 + 35 * Math.sin(z / 75); const d = Math.abs(x - cx); h -= 9 * smooth(30, 8, d); const d2 = Math.abs(z - 40 * Math.sin(x / 60) - 20); if (x > -200) h -= 4 * smooth(14, 4, d2); const d3 = Math.abs(x + 160 + 25 * Math.sin(z / 50)); h -= 7 * smooth(20, 5, d3); return h; },
    alpine(x, z, N) { const m = smooth(50, 150, Math.abs(x - 35 * Math.sin(z / 110))); return 3 + 3 * N.fbm(x / 60, z / 60, 3) + m * 58 * Math.pow(N.ridged(x / 190, z / 190, 5), 2.2); },
    fjord(x, z, N) { const cx = 110 + 40 * Math.sin(z / 95) + 15 * N.n2(z / 40, 9); const land = 7 + 7 * N.fbm(x / 90, z / 90, 4) + 18 * Math.pow(Math.max(0, N.ridged(x / 150, z / 150, 4) - 0.5), 1.5) * 3; const t = smooth(cx - 25, cx + 10, x); return land * (1 - t) + (-14 - 4 * N.fbm(x / 60, z / 60, 2)) * t; },
    urban(x, z, N) { let h = 1.2 + 1.4 * N.fbm(x / 160, z / 160, 3); const d = Math.abs(z - 15 * Math.sin(x / 70)); h -= 6 * smooth(16, 7, d); return h; },
    caldera(x, z, N) { const rr = Math.hypot(x, z); return 3 + 4 * N.fbm(x / 70, z / 70, 4) + 46 * Math.exp(-(rr / 95) * (rr / 95)) - 58 * Math.exp(-(rr / 34) * (rr / 34)); },
    flats(x, z, N) { return 0.6 + 1.4 * N.fbm(x / 220, z / 220, 3) + 0.4 * N.fbm(x / 30, z / 30, 2); },
    archipelago(x, z, N, r, isl) { let h = -9 + 3 * N.fbm(x / 90, z / 90, 3); for (const s of isl) { const d = Math.hypot(x - s[0], z - s[1]) / s[2]; h += (s[3] + 9) * Math.exp(-d * d * 1.6) * (0.85 + 0.3 * N.n2(x / 30, z / 30)); } return h; },
    steppe(x, z, N) { return 3 + 7 * N.fbm(x / 200, z / 200, 4) + 1.5 * N.fbm(x / 45, z / 45, 2); },
    forest(x, z, N) { let h = 4 + 10 * N.fbm(x / 120, z / 120, 4) + 2 * N.fbm(x / 28, z / 28, 2); const d = Math.abs(z + 20 + 40 * Math.sin(x / 90)); h -= 6 * smooth(10, 2, d); return h; },
    highland(x, z, N) { let h = 6 + 13 * N.fbm(x / 140, z / 140, 5); const l = N.fbm(x / 90 + 40, z / 90, 3); if (l > 0.25) h -= (l - 0.25) * 60; return h; },
    crater(x, z, N, r, isl) { let h = 3 + 3 * N.fbm(x / 90, z / 90, 4); for (const c of isl) { const d = Math.hypot(x - c[0], z - c[1]) / c[2]; h += c[3] * (1.2 * Math.exp(-Math.pow((d - 1) * 3, 2)) - (d < 1 ? (1 - d * d) * 1.6 : 0)); } return h; },
    savanna(x, z, N, r, isl) { let h = 2 + 3 * N.fbm(x / 160, z / 160, 3); for (const c of isl) { const d = Math.hypot(x - c[0], z - c[1]) / c[2]; if (d < 1.2) h += c[3] * smooth(1.2, 0.6, d) * (0.8 + 0.4 * N.n2(x / 6, z / 6)); } return h; },
    coast(x, z, N) { const cx = -130 + 30 * Math.sin(z / 80); const land = 6 + 6 * N.fbm(x / 100, z / 100, 4); const cliff = smooth(cx + 20, cx + 45, x) * 12; const t = smooth(cx + 15, cx - 25, x); return (land + cliff) * (1 - t) + (-12 + 2 * N.n2(x / 50, z / 50)) * t + smooth(cx - 5, cx + 15, x) * (1 - smooth(cx + 15, cx + 30, x)) * 1.5; },
    taiga(x, z, N) { let h = 4 + 9 * N.fbm(x / 140, z / 140, 4); const l = N.fbm(x / 70, z / 70 + 30, 3); if (l > 0.3) h = h * (1 - smooth(0.3, 0.4, l)) - 1.2 * smooth(0.3, 0.4, l); return h; },
    swamp(x, z, N) { let h = 0.9 + 1.6 * N.fbm(x / 70, z / 70, 4); const p = N.fbm(x / 40 + 9, z / 40, 3); if (p > 0.15) h -= (p - 0.15) * 9; return h; },
    wreck(x, z, N) { return 3 + 7 * N.fbm(x / 120, z / 120, 4) + 3 * N.ridged(x / 50, z / 50, 2); },
    rift(x, z, N) { const d = Math.abs(x - 25 * Math.sin(z / 120)); return 2 + 3 * N.fbm(x / 60, z / 60, 3) + smooth(62, 105, d) * (24 + 6 * N.fbm(x / 80, z / 80, 3)) - smooth(150, 230, d) * 8; },
    atoll(x, z, N) { const rr = Math.hypot(x, z), th = Math.atan2(z, x); const ring = Math.exp(-Math.pow((rr - 215) / 48, 2)) * smooth(0.12, 0.38, Math.abs(Math.sin(th))); return -11 + 2 * N.fbm(x / 70, z / 70, 3) + ring * (17 + 4 * N.fbm(x / 40, z / 40, 3)); },
    terraces(x, z, N) { const base = 7 + 16 * N.fbm(x / 130, z / 130, 4); const step = 2.4; let h = Math.floor(base / step) * step + (base % step) * 0.12; if (base < 3.2) h -= 2.2; return h; },
    strait(x, z, N) { const land = 6 + 8 * N.fbm(x / 110, z / 110, 4); const d = Math.abs(z - 22 * Math.sin(x / 95)); return land * (1 - smooth(52, 28, d)) + (-13 + N.n2(x / 50, z / 50)) * smooth(52, 28, d); },
    glass(x, z, N, r, isl) { let h = 2 + 2.5 * N.fbm(x / 120, z / 120, 3); for (const c of isl) { const d = Math.hypot(x - c[0], z - c[1]) / c[2]; h -= c[3] * (d < 1 ? (1 - d * d) : 0) - c[3] * 0.3 * Math.exp(-Math.pow((d - 1) * 4, 2)); } return h; },
  };

  const POINT_SETS = {
    3: [[0, 0], [-135, 45], [135, -45]],
    4: [[-145, 10], [145, -10], [60, -85], [-60, 85]],
    5: [[0, 0], [-135, -85], [135, 85], [-135, 85], [135, -85]],
  };

  SM.MAP_SIZE = 640;
  SM.genMap = function (def, N) {
    const S = SM.MAP_SIZE, half = S / 2, cell = S / N, V = N + 1;
    const r = SM.rng(def.seed), noise = makeNoise(def.seed);
    const biome = SM.BIOMES[def.biome];
    const M = { def, biome, N, S, half, cell, V, H: new Float32Array(V * V), water: def.water !== undefined || def.naval ? 0 : null, lava: !!biome.lava, ice: !!biome.ice };
    // feature lists
    const isl = [];
    if (def.layout === 'archipelago') {
      isl.push([0, 235, 55, 8], [0, -235, 55, 8]);
      for (let i = 0; i < 9; i++) isl.push([(r() - 0.5) * 520, (r() - 0.5) * 400, 30 + r() * 40, 3 + r() * 7]);
    } else if (def.layout === 'crater') { for (let i = 0; i < 26; i++) isl.push([(r() - 0.5) * 560, (r() - 0.5) * 560, 12 + r() * 34, 2 + r() * 4]); }
    else if (def.layout === 'savanna') { for (let i = 0; i < 14; i++) isl.push([(r() - 0.5) * 540, (r() - 0.5) * 460, 10 + r() * 16, 8 + r() * 12]); }
    else if (def.layout === 'glass') { for (let i = 0; i < 18; i++) isl.push([(r() - 0.5) * 560, (r() - 0.5) * 560, 15 + r() * 35, 1.5 + r() * 3]); }
    // points
    const nP = def.points || 4;
    const ps = POINT_SETS[nP] || POINT_SETS[4];
    const jit = [];
    for (let i = 0; i < ps.length; i++) jit.push([(r() - 0.5) * 30, (r() - 0.5) * 30]);
    M.points = ps.map((p, i) => {
      // keep rotational symmetry: partner of i is i^1 for the pairs after the optional centre
      let jx = jit[i][0], jz = jit[i][1];
      const hasC = nP % 2 === 1;
      if (hasC && i === 0) { jx = 0; jz = 0; }
      else { const base = hasC ? 1 : 0, k = i - base, partner = base + (k ^ 1); if (k % 2 === 1) { jx = -jit[partner][0]; jz = -jit[partner][1]; } }
      return { x: p[0] + jx, z: p[1] + jz, letter: 'ABCDE'[i] };
    });
    M.points.sort((a, b) => (a.x - b.x) || (a.z - b.z)).forEach((p, i) => p.letter = 'ABCDE'[i]);
    // HQs (team 0 south / +z, team 1 north / -z)
    let hqx = 0;
    if (def.layout === 'fjord') hqx = -60; if (def.layout === 'coast') hqx = 60; if (def.layout === 'delta') hqx = 20; if (def.layout === 'caldera') hqx = 0;
    M.hq = [{ x: hqx, z: 238 }, { x: hqx, z: -238 }];
    // base heights
    const fn = LAYOUT[def.layout] || LAYOUT.steppe;
    const H = M.H;
    for (let iz = 0; iz < V; iz++) for (let ix = 0; ix < V; ix++) {
      const x = -half + ix * cell, z = -half + iz * cell;
      let h = fn(x, z, noise, r, isl);
      const e = Math.max(Math.abs(x), Math.abs(z));
      if (!def.naval || h > 0) h += smooth(255, 318, e) * (14 + 8 * noise.n2(x / 50, z / 50));
      H[iz * V + ix] = h;
    }
    const W = M.water;
    // flatten helpers
    const flatten = (cx, cz, rad, fall, target) => {
      const i0 = Math.max(0, Math.floor((cx - rad - fall + half) / cell)), i1 = Math.min(N, Math.ceil((cx + rad + fall + half) / cell));
      const j0 = Math.max(0, Math.floor((cz - rad - fall + half) / cell)), j1 = Math.min(N, Math.ceil((cz + rad + fall + half) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = -half + i * cell, z = -half + j * cell, d = Math.hypot(x - cx, z - cz);
        const t = 1 - smooth(rad, rad + fall, d);
        if (t > 0) H[j * V + i] = H[j * V + i] * (1 - t) + target * t;
      }
    };
    const avgH = (cx, cz, rad) => { let s = 0, n = 0; for (let a = 0; a < 12; a++) { const x = cx + Math.cos(a) * rad * 0.6, z = cz + Math.sin(a) * rad * 0.6; s += M.heightAt(x, z); n++; } return s / n; };
    M.heightAt = function (x, z) {
      const fx = SM.clamp((x + half) / cell, 0, N - 0.0001), fz = SM.clamp((z + half) / cell, 0, N - 0.0001);
      const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
      const a = H[iz * V + ix], b = H[iz * V + ix + 1], c = H[(iz + 1) * V + ix], d = H[(iz + 1) * V + ix + 1];
      return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
    };
    // roads
    M.road = new Uint8Array(V * V);
    M.bridge = new Uint8Array(N * N);
    M.bridgeSegs = [];
    M.roads = [];
    const segs = [];
    const order = M.points.slice().sort((a, b) => b.z - a.z);
    for (const hq of M.hq) {
      const near = M.points.slice().sort((a, b) => Math.hypot(a.x - hq.x, a.z - hq.z) - Math.hypot(b.x - hq.x, b.z - hq.z)).slice(0, 2);
      for (const p of near) segs.push([hq, p]);
    }
    for (let i = 0; i < order.length - 1; i++) segs.push([order[i], order[i + 1]]);
    if (order.length > 2) segs.push([order[0], order[order.length - 1]]);
    // flatten HQ pads first so roads start at pad height
    for (const hq of M.hq) { const t = Math.max(avgH(hq.x, hq.z, 30), W !== null ? W + 2.5 : -99); flatten(hq.x, hq.z, 32, 14, t); }
    for (const p of M.points) { const t = Math.max(avgH(p.x, p.z, 14), W !== null ? W + 1.2 : -99); flatten(p.x, p.z, 16, 12, t); }
    for (const sg of segs) {
      const a = sg[0], b = sg[1];
      const mx = (a.x + b.x) / 2 + (r() - 0.5) * 60, mz = (a.z + b.z) / 2 + (r() - 0.5) * 40;
      const pts = [];
      const L = Math.hypot(b.x - a.x, b.z - a.z) * 1.1, steps = Math.ceil(L / 2);
      for (let s = 0; s <= steps; s++) { const t = s / steps; const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x, z = (1 - t) * (1 - t) * a.z + 2 * (1 - t) * t * mz + t * t * b.z; pts.push([x, z]); }
      // target profile: smoothed terrain height along the road
      const raw = pts.map(p => M.heightAt(p[0], p[1]));
      const prof = raw.map((_, i) => { let s = 0, n = 0; for (let k = -9; k <= 9; k++) { const j = SM.clamp(i + k, 0, raw.length - 1); s += raw[j]; n++; } return s / n; });
      prof[0] = raw[0]; prof[prof.length - 1] = raw[raw.length - 1];
      for (let i = 1; i < 6; i++) { const t = i / 6; prof[i] = raw[0] * (1 - t) + prof[i] * t; const j = prof.length - 1 - i; prof[j] = raw[raw.length - 1] * (1 - t) + prof[j] * t; }
      M.roads.push(pts);
      pts.forEach((p, k) => {
        let target = prof[k];
        const deep = W !== null && raw[k] < W - 1.5;
        if (deep && def.naval) { // bridge over navigable water
          const ci = Math.floor((p[0] + half) / cell), cj = Math.floor((p[1] + half) / cell);
          for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = ci + di, jj = cj + dj; if (ii >= 0 && jj >= 0 && ii < N && jj < N) M.bridge[jj * N + ii] = 1; }
          if (k > 0) M.bridgeSegs.push([pts[k - 1][0], pts[k - 1][1], p[0], p[1]]);
          if (k < pts.length - 1) M.bridgeSegs.push([p[0], p[1], pts[k + 1][0], pts[k + 1][1]]);
          return;
        }
        if (W !== null) target = Math.max(target, W - (M.ice ? 1.2 : 0.5));
        const rad = 6;
        const i0 = Math.max(0, Math.floor((p[0] - rad - 6 + half) / cell)), i1 = Math.min(N, Math.ceil((p[0] + rad + 6 + half) / cell));
        const j0 = Math.max(0, Math.floor((p[1] - rad - 6 + half) / cell)), j1 = Math.min(N, Math.ceil((p[1] + rad + 6 + half) / cell));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const x = -half + i * cell, z = -half + j * cell, d = Math.hypot(x - p[0], z - p[1]);
          const t = 1 - smooth(rad * 0.6, rad + 6, d);
          if (t > 0) { const idx = j * V + i; H[idx] = H[idx] * (1 - t) + target * t; if (d < rad * 0.9) M.road[idx] = 1; }
        }
      });
    }
    // re-flatten pads (roads may have nudged them)
    for (const hq of M.hq) { const t = Math.max(avgH(hq.x, hq.z, 18), W !== null ? W + 2.5 : -99); flatten(hq.x, hq.z, 30, 6, t); }
    for (const p of M.points) { const t = Math.max(avgH(p.x, p.z, 8), W !== null ? W + 1.2 : -99); flatten(p.x, p.z, 14, 5, t); }

    // buildings / wreck hulls (block navigation)
    M.blocked = new Uint8Array(N * N);
    M.buildings = [];
    const clearOf = (x, z, pad) => {
      for (const hq of M.hq) if (Math.hypot(x - hq.x, z - hq.z) < 42 + pad) return false;
      for (const p of M.points) if (Math.hypot(x - p.x, z - p.z) < 26 + pad) return false;
      const i = Math.round((x + half) / cell), j = Math.round((z + half) / cell);
      for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii <= N && jj <= N && M.road[jj * V + ii]) return false; }
      return true;
    };
    const block = (x, z, w, d, rot, val) => {
      const c = Math.cos(rot || 0), s = Math.sin(rot || 0), ext = Math.hypot(w, d) / 2 + cell;
      for (let jz = Math.floor((z - ext + half) / cell); jz <= Math.ceil((z + ext + half) / cell); jz++) for (let ix = Math.floor((x - ext + half) / cell); ix <= Math.ceil((x + ext + half) / cell); ix++) {
        if (ix < 0 || jz < 0 || ix >= N || jz >= N) continue;
        const cx = -half + (ix + 0.5) * cell - x, cz = -half + (jz + 0.5) * cell - z;
        const lx = cx * c - cz * s, lz = cx * s + cz * c;
        if (Math.abs(lx) < w / 2 + cell * 0.4 && Math.abs(lz) < d / 2 + cell * 0.4) M.blocked[jz * N + ix] = val === 0 ? 0 : 1;
      }
    };
    M.block = block;
    const bmode = def.buildings || biome.buildings;
    if (bmode) {
      const sparse = bmode === 'sparse';
      for (let bz = -260; bz <= 260; bz += 34) for (let bx = -280; bx <= 280; bx += 34) {
        if (r() < (sparse ? 0.8 : 0.22)) continue;
        const x = bx + (r() - 0.5) * 8, z = bz + (r() - 0.5) * 8;
        const w = 10 + r() * 14, d = 10 + r() * 14;
        if (!clearOf(x, z, Math.max(w, d) / 2)) continue;
        if (W !== null && M.heightAt(x, z) < W + 0.5) continue;
        const h = sparse ? 5 + r() * 6 : 8 + Math.pow(r(), 1.8) * (def.biome === 'ruins' ? 20 : 46);
        M.buildings.push({ x, z, w, d, h, y: M.heightAt(x, z), ruined: r() < 0.35, rot: 0 });
        block(x, z, w, d, 0);
      }
    }
    if (def.layout === 'wreck') {
      // a crashed orbital carrier broken into segments across the map
      const segsW = [[-170, 30, 40, 70, 0.35], [-90, -5, 36, 62, 0.42], [-15, -40, 30, 48, 0.55], [80, 60, 28, 40, -0.3], [170, -70, 24, 34, 0.8]];
      for (const s of segsW) { if (!clearOf(s[0], s[1], 0)) { s[0] += 30; } M.buildings.push({ x: s[0], z: s[1], w: s[2], d: s[3], h: s[2] * 0.7, y: M.heightAt(s[0], s[1]) - 4, wreck: true, rot: s[4] }); block(s[0], s[1], s[2] * 0.9, s[3] * 0.9, s[4]); }
    }
    // navigation, then guarantee every point and both HQs are reachable on foot
    SM.buildNav(M);
    for (let pass = 0; pass < 5; pass++) {
      const gc = M.groundComp;
      const spot = (x, z) => { let c = SM.cellOf(M, x, z); if (!M.nav.ground[c]) { const c2 = SM.nearestOpen(M, M.nav.ground, c, 6); if (c2 >= 0) c = c2; } return c; };
      const main = gc[spot(M.hq[0].x, M.hq[0].z - 30)];
      const targets = [[M.hq[1].x, M.hq[1].z + 30]].concat(M.points.map(p => [p.x, p.z]));
      let fixed = 0;
      for (const t of targets) {
        const c = spot(t[0], t[1]);
        if (main && gc[c] === main) continue;
        // nearest cell of the main component
        let best = -1, bd = 1e18;
        for (let k = 0; k < N * N; k++) if (gc[k] === main) { const q = SM.cellCenter(M, k), d = (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2; if (d < bd) { bd = d; best = k; } }
        if (best < 0) continue;
        const q = SM.cellCenter(M, best);
        SM.carveCorridor(M, t[0], t[1], q[0], q[1]);
        fixed++;
      }
      if (!fixed) break;
      SM.buildNav(M);
    }
    M.buildings = M.buildings.filter(b => !b.removed);
    // docks for naval maps
    M.docks = [null, null];
    if (def.naval) {
      const comp = M.navComp;
      // biggest naval component
      const counts = {};
      for (let i = 0; i < comp.length; i++) if (comp[i] > 0) counts[comp[i]] = (counts[comp[i]] || 0) + 1;
      let best = 0, bc = 0; for (const k in counts) if (counts[k] > bc) { bc = counts[k]; best = +k; }
      M.docks = M.hq.map(hq => {
        let bd = 1e9, out = null;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          if (comp[j * N + i] !== best) continue;
          const x = -half + (i + 0.5) * cell, z = -half + (j + 0.5) * cell;
          if (Math.abs(x) > 290 || Math.abs(z) > 290) continue;
          // prefer cells with open water around
          let open = 0; for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < N && jj < N && comp[jj * N + ii] === best) open++; }
          if (open < 22) continue;
          const d = Math.hypot(x - hq.x, z - hq.z);
          if (d < bd) { bd = d; out = { x, z }; }
        }
        return out;
      });
    }
    M.groundAt = function (x, z) {
      let h = M.heightAt(x, z);
      if (M.water !== null) {
        const i = Math.floor((x + half) / cell), j = Math.floor((z + half) / cell);
        if (i >= 0 && j >= 0 && i < N && j < N && M.bridge[j * N + i]) h = Math.max(h, M.water + 1.4);
        if (M.ice) h = Math.max(h, M.water);
      }
      return h;
    };
    return M;
  };

  SM.carveCorridor = function (M, x0, z0, x1, z1) {
    const H = M.H, V = M.V, N = M.N, cell = M.cell, half = M.half, W = M.water;
    const L = Math.hypot(x1 - x0, z1 - z0) + 12, steps = Math.ceil(L / 1.5);
    const ux = (x1 - x0) / (L - 12 || 1), uz = (z1 - z0) / (L - 12 || 1);
    const h0 = M.heightAt(x0, z0), h1 = M.heightAt(x1, z1);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, px = x0 - ux * 6 + (x1 - x0 + ux * 12) * t, pz = z0 - uz * 6 + (z1 - z0 + uz * 12) * t;
      let target = h0 + (h1 - h0) * SM.clamp(t, 0, 1);
      for (const b of M.buildings) if (!b.removed && !b.wreck && Math.hypot(b.x - px, b.z - pz) < 8 + Math.max(b.w, b.d) / 2) { b.removed = true; M.block(b.x, b.z, b.w, b.d, b.rot || 0, 0); }
      if (W !== null) target = Math.max(target, W - 0.4);
      const rad = 7;
      for (let j = Math.max(0, Math.floor((pz - rad - 5 + half) / cell)); j <= Math.min(N, Math.ceil((pz + rad + 5 + half) / cell)); j++)
        for (let i = Math.max(0, Math.floor((px - rad - 5 + half) / cell)); i <= Math.min(N, Math.ceil((px + rad + 5 + half) / cell)); i++) {
          const x = -half + i * cell, z = -half + j * cell, d = Math.hypot(x - px, z - pz);
          const k = 1 - smooth(rad * 0.7, rad + 5, d);
          if (k > 0) { const idx = j * V + i; H[idx] = H[idx] * (1 - k) + target * k; if (d < rad) M.road[idx] = 1; }
          if (d < rad && i < N && j < N) M.blocked[j * N + i] = 0;
        }
    }
  };

  // ------------------------------------------------------------ navigation grids
  SM.buildNav = function (M) {
    const N = M.N, V = M.V, H = M.H, W = M.water, cell = M.cell;
    const ground = new Uint8Array(N * N), naval = new Uint8Array(N * N), amphib = new Uint8Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = H[j * V + i], b = H[j * V + i + 1], c = H[(j + 1) * V + i], d = H[(j + 1) * V + i + 1];
      const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d), avg = (a + b + c + d) / 4;
      const slope = (hi - lo) / cell;
      const idx = j * N + i;
      const edge = i < 2 || j < 2 || i >= N - 2 || j >= N - 2;
      const blk = M.blocked[idx];
      const br = M.bridge[idx];
      const wet = W !== null && !M.ice ? avg < W - 1.2 : false;
      const deep = W !== null && !M.ice && !M.lava ? hi < W - 1.6 : false;
      ground[idx] = !edge && !blk && (br || (!wet && slope < 0.85)) && !(M.lava && W !== null && avg < W + 0.3) ? 1 : 0;
      naval[idx] = !edge && deep && !blk ? 1 : 0;
      amphib[idx] = !edge && !blk && (ground[idx] || (W !== null && !M.lava && avg < W + 0.5 && slope < 1.2)) ? 1 : 0;
    }
    M.nav = { ground, naval, amphib, air: null };
    // connected components for the naval grid
    const comp = new Int32Array(N * N);
    let cid = 0;
    const st = [];
    for (let s = 0; s < N * N; s++) {
      if (!naval[s] || comp[s]) continue;
      cid++; comp[s] = cid; st.push(s);
      while (st.length) {
        const c = st.pop(), ci = c % N, cj = (c / N) | 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; const k = jj * N + ii; if (naval[k] && !comp[k]) { comp[k] = cid; st.push(k); } }
      }
    }
    M.navComp = comp;
    // ground components (used to validate reachability)
    const gc = new Int32Array(N * N); cid = 0;
    for (let s = 0; s < N * N; s++) {
      if (!ground[s] || gc[s]) continue;
      cid++; gc[s] = cid; st.push(s);
      while (st.length) {
        const c = st.pop(), ci = c % N, cj = (c / N) | 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; const k = jj * N + ii; if (ground[k] && !gc[k]) { gc[k] = cid; st.push(k); } }
      }
    }
    M.groundComp = gc;
  };
  SM.cellOf = (M, x, z) => { const i = SM.clamp(Math.floor((x + M.half) / M.cell), 0, M.N - 1), j = SM.clamp(Math.floor((z + M.half) / M.cell), 0, M.N - 1); return j * M.N + i; };
  SM.cellCenter = (M, c) => [-M.half + (c % M.N + 0.5) * M.cell, -M.half + (((c / M.N) | 0) + 0.5) * M.cell];

  // ------------------------------------------------------------ A* path finding
  SM.findPath = function (M, grid, sx, sz, tx, tz, maxIter) {
    const N = M.N;
    let s = SM.cellOf(M, sx, sz), t = SM.cellOf(M, tx, tz);
    if (!grid[t]) t = SM.nearestOpen(M, grid, t, 12);
    if (t < 0) return null;
    if (!grid[s]) { const s2 = SM.nearestOpen(M, grid, s, 6); if (s2 >= 0) s = s2; }
    if (s === t) return [[tx, tz]];
    const g = new Float32Array(N * N).fill(1e9), from = new Int32Array(N * N).fill(-1), closed = new Uint8Array(N * N);
    const heap = [], hf = [];
    const ti = t % N, tj = (t / N) | 0;
    const hfun = c => { const dx = Math.abs(c % N - ti), dz = Math.abs(((c / N) | 0) - tj); return (dx + dz) + (1.4142 - 2) * Math.min(dx, dz); };
    const push = (c, f) => { heap.push(c); hf.push(f); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= hf[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [hf[p], hf[i]] = [hf[i], hf[p]]; i = p; } };
    const pop = () => { const top = heap[0]; const lc = heap.pop(), lf = hf.pop(); if (heap.length) { heap[0] = lc; hf[0] = lf; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && hf[l] < hf[m]) m = l; if (r < heap.length && hf[r] < hf[m]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; [hf[m], hf[i]] = [hf[i], hf[m]]; i = m; } } return top; };
    g[s] = 0; push(s, hfun(s));
    let it = 0, found = false, best = s, bestH = hfun(s);
    const lim = maxIter || 30000;
    while (heap.length && it++ < lim) {
      const c = pop();
      if (closed[c]) continue;
      closed[c] = 1;
      if (c === t) { found = true; break; }
      const hc = hfun(c); if (hc < bestH) { bestH = hc; best = c; }
      const ci = c % N, cj = (c / N) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = ci + di, jj = cj + dj;
        if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
        const k = jj * N + ii;
        if (!grid[k] || closed[k]) continue;
        if (di && dj && (!grid[cj * N + ii] || !grid[jj * N + ci])) continue; // no corner cutting
        const ng = g[c] + (di && dj ? 1.4142 : 1);
        if (ng < g[k]) { g[k] = ng; from[k] = c; push(k, ng + hfun(k)); }
      }
    }
    const end = found ? t : best;
    const cells = [];
    for (let c = end; c !== -1 && cells.length < 4000; c = from[c]) cells.push(c);
    cells.reverse();
    // string-pull the path
    const out = [];
    let anchor = 0;
    for (let i = 2; i < cells.length; i++) {
      if (!SM.lineOpen(M, grid, cells[anchor], cells[i])) { out.push(SM.cellCenter(M, cells[i - 1])); anchor = i - 1; }
    }
    if (found) out.push([tx, tz]); else if (cells.length) out.push(SM.cellCenter(M, end));
    if (found && !grid[SM.cellOf(M, tx, tz)]) out[out.length - 1] = SM.cellCenter(M, t);
    return out;
  };
  SM.lineOpen = function (M, grid, a, b) {
    const N = M.N;
    let x0 = a % N, y0 = (a / N) | 0; const x1 = b % N, y1 = (b / N) | 0;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, n = 0;
    while (n++ < 600) {
      if (!grid[y0 * N + x0]) return false;
      if (x0 === x1 && y0 === y1) return true;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
      if (!grid[y0 * N + x0]) return false;
    }
    return false;
  };
  SM.nearestOpen = function (M, grid, c, rad) {
    const N = M.N, ci = c % N, cj = (c / N) | 0;
    for (let r = 1; r <= rad; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
      if (grid[jj * N + ii]) return jj * N + ii;
    }
    return -1;
  };

  // ------------------------------------------------------------ terrain colouring
  SM.terrainColor = function (M, i, j, out) {
    const V = M.V, H = M.H, b = M.biome, W = M.water;
    const idx = j * V + i, h = H[idx];
    const hl = H[j * V + Math.max(0, i - 1)], hr = H[j * V + Math.min(V - 1, i + 1)], hu = H[Math.max(0, j - 1) * V + i], hd = H[Math.min(V - 1, j + 1) * V + i];
    const slope = Math.hypot(hr - hl, hd - hu) / (2 * M.cell);
    const x = i * M.cell, z = j * M.cell;
    const nz = M._noise || (M._noise = makeNoise(M.def.seed + 17));
    const v = nz.fbm(x / 45, z / 45, 3);
    let c = h < 6 ? SM.mixColor(b.low, b.mid, SM.clamp(h / 6 + v * 0.4, 0, 1)) : SM.mixColor(b.mid, b.high, SM.clamp((h - 6) / 18 + v * 0.3, 0, 1));
    const ex = nz.fbm(x / 90 + 50, z / 90, 3);
    if (ex > 0.22) c = SM.mixColor(c, b.extra, SM.clamp((ex - 0.22) * 3, 0, 0.7));
    if (W !== null && h < W + 1.6) c = SM.mixColor(c, M.lava ? 0x1a1414 : b.shore, SM.clamp((W + 1.6 - h) / 1.6, 0, 1));
    if (M.ice && h < W + 0.2) c = 0xc8dce8;
    c = SM.mixColor(c, b.rock, smooth(0.45, 0.9, slope));
    if (M.road[idx]) c = SM.mixColor(c, SM.mixColor(b.rock, b.low, 0.5), 0.55);
    const sh = 1 + v * 0.18;
    out.setHex(c); out.multiplyScalar(sh);
    return out;
  };

  // ------------------------------------------------------------ scene construction
  SM.buildTerrainMesh = function (M) {
    const N = M.N, V = M.V, S = M.S;
    const geo = new T.PlaneGeometry(S, S, N, N);
    geo.rotateX(-PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new T.Color();
    for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
      const k = j * V + i; // PlaneGeometry rows run from -z to +z after rotation
      pos.setY(k, M.H[k]);
      SM.terrainColor(M, i, j, c); c.convertSRGBToLinear();
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const det = SM.detailTexture();
    det.repeat.set(48, 48);
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0.02, map: det });
    const mesh = new T.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    // skirt beyond the map so the horizon is not empty
    const outer = new T.Mesh(new T.RingGeometry(S * 0.7, S * 3, 32, 1), new T.MeshStandardMaterial({ color: new T.Color(M.biome.high).convertSRGBToLinear(), roughness: 1 }));
    outer.rotation.x = -PI / 2; outer.position.y = M.water !== null && M.def.naval ? M.water - 6 : 14;
    if (M.def.naval) outer.position.y = -14;
    const g = new T.Group(); g.add(mesh); g.add(outer);
    return g;
  };

  SM.mapThumb = function (def, size) {
    const M = SM.genMap(def, 64);
    const c = document.createElement('canvas'); c.width = c.height = size || 128;
    const ctx = c.getContext('2d'), img = ctx.createImageData(c.width, c.height), col = new T.Color();
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const i = Math.floor(x / c.width * M.V), j = Math.floor(y / c.height * M.V);
      SM.terrainColor(M, i, j, col);
      let r = col.r, g = col.g, b = col.b;
      const h = M.H[j * M.V + i];
      if (M.water !== null && h < M.water && !M.ice) { const wc = new T.Color(M.biome.water); const t = M.lava ? 1 : SM.clamp((M.water - h) / 6, 0.4, 0.9); r = r * (1 - t) + wc.r * t; g = g * (1 - t) + wc.g * t; b = b * (1 - t) + wc.b * t; }
      // hillshade
      const hl = M.H[j * M.V + Math.max(0, i - 1)], hu = M.H[Math.max(0, j - 1) * M.V + i];
      const sh = SM.clamp(1 + (h - hl + h - hu) * 0.05, 0.6, 1.3);
      const k = (y * c.width + x) * 4;
      img.data[k] = Math.min(255, r * 255 * sh); img.data[k + 1] = Math.min(255, g * 255 * sh); img.data[k + 2] = Math.min(255, b * 255 * sh); img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const toPx = (x, z) => [(x + M.half) / M.S * c.width, (z + M.half) / M.S * c.height];
    for (const p of M.points) { const q = toPx(p.x, p.z); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q[0], q[1], 3, 0, 7); ctx.fill(); }
    M.hq.forEach((h, t) => { const q = toPx(h.x, h.z); ctx.fillStyle = t ? '#ff5a4a' : '#4ab0ff'; ctx.fillRect(q[0] - 4, q[1] - 4, 8, 8); });
    return c;
  };

  // ------------------------------------------------------------ water / lava / ice
  SM.buildWater = function (M, sunDir) {
    if (M.water === null) return null;
    const V = M.V;
    const data = new Uint8Array(V * V * 4);
    for (let k = 0; k < V * V; k++) { const d = SM.clamp((M.water - M.H[k]) / 10, 0, 1); data[k * 4] = d * 255; data[k * 4 + 3] = 255; }
    const tex = new T.DataTexture(data, V, V, T.RGBAFormat);
    tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearFilter; tex.needsUpdate = true;
    const mode = M.lava ? 1 : M.ice ? 2 : 0;
    const mat = new T.ShaderMaterial({
      transparent: mode === 0, depthWrite: mode !== 0,
      uniforms: {
        uTime: { value: 0 }, uDepth: { value: tex }, uSize: { value: M.S }, uDeep: { value: new T.Color(M.biome.water).multiplyScalar(0.55) }, uShallow: { value: new T.Color(M.biome.water).lerp(new T.Color(0x9fe0d0), 0.35) },
        uSun: { value: new T.Vector3().fromArray(sunDir).normalize() }, uSunCol: { value: new T.Color(1, 1, 1) }, uSky: { value: new T.Color(0x9fc3e0) },
        uFogCol: { value: new T.Color() }, uFogD: { value: 0.002 }, uMode: { value: mode }, uLight: { value: 1 },
      },
      vertexShader: `
        uniform float uTime; varying vec3 vW; varying vec2 vUv;
        void main(){ vec3 p = position; vec4 w = modelMatrix * vec4(p,1.0);
          w.y += (sin(w.x*0.08+uTime*1.3)+sin(w.z*0.11+uTime*1.1))*0.12;
          vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform float uTime; uniform sampler2D uDepth; uniform float uSize; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uSky; uniform vec3 uFogCol; uniform float uFogD; uniform int uMode; uniform float uLight;
        varying vec3 vW;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec2 uv = (vW.xz + uSize*0.5)/uSize;
          float d = (uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0) ? 1.0 : texture2D(uDepth, uv).r;
          vec3 col; float a = 1.0;
          if (uMode == 1) {
            float n = vn(vW.xz*0.08 + uTime*0.05) * 0.6 + vn(vW.xz*0.3 - uTime*0.1)*0.4;
            float crust = smoothstep(0.45, 0.62, n);
            col = mix(vec3(3.0,0.9,0.15), vec3(0.08,0.05,0.04), crust);
            col += vec3(1.2,0.3,0.0) * (0.5+0.5*sin(uTime*2.0 + vW.x*0.05)) * (1.0-crust) * 0.4;
          } else if (uMode == 2) {
            float n = vn(vW.xz*0.12)*0.5 + vn(vW.xz*0.5)*0.5;
            col = mix(vec3(0.72,0.84,0.92), vec3(0.88,0.95,1.0), n) * uLight;
            float crack = smoothstep(0.02, 0.0, abs(vn(vW.xz*0.06)-0.5)) ;
            col = mix(col, vec3(0.4,0.6,0.75), crack*0.6);
          } else {
            vec2 q = vW.xz*0.15; float t = uTime*0.6;
            vec3 n = normalize(vec3(sin(q.x*1.7+t)*0.15 + (vn(q*3.0+t)-0.5)*0.4, 1.0, cos(q.y*1.3+t*1.2)*0.15 + (vn(q*3.0-t)-0.5)*0.4));
            vec3 V = normalize(cameraPosition - vW);
            float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
            col = mix(uShallow, uDeep, smoothstep(0.0, 0.6, d)) * uLight;
            col = mix(col, uSky, fres*0.55);
            vec3 Hh = normalize(uSun + V);
            col += uSunCol * pow(max(dot(n, Hh), 0.0), 120.0) * 1.5;
            float foam = smoothstep(0.06, 0.0, d) * (0.6 + 0.4*vn(vW.xz*0.5 + uTime));
            col = mix(col, vec3(0.95), foam*0.8);
            a = mix(0.55, 0.93, smoothstep(0.0, 0.25, d));
          }
          float dist = length(cameraPosition - vW);
          float f = 1.0 - exp(-uFogD*uFogD*dist*dist);
          col = mix(col, uFogCol, clamp(f,0.0,1.0));
          gl_FragColor = vec4(col, a);
        }`,
    });
    const mesh = new T.Mesh(new T.PlaneGeometry(M.S * 1.6, M.S * 1.6, 80, 80), mat);
    mesh.rotation.x = -PI / 2; mesh.position.y = M.water; mesh.name = 'water'; mesh.renderOrder = 2;
    mesh.receiveShadow = false;
    return mesh;
  };

  // ------------------------------------------------------------ sky
  SM.buildSky = function (time, biome) {
    const tm = SM.TIMES[time];
    const mat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false,
      uniforms: { uTop: { value: new T.Color(tm.top) }, uHor: { value: new T.Color(tm.horizon) }, uGround: { value: new T.Color(biome.fog).multiplyScalar(0.6) }, uSun: { value: new T.Vector3().fromArray(tm.sun).normalize() }, uSunCol: { value: new T.Color(tm.sunColor) }, uCloud: { value: 0.3 }, uTime: { value: 0 }, uAurora: { value: 0 }, uFlash: { value: 0 }, uFogCol: { value: new T.Color(biome.fog) }, uFogMix: { value: 0 }, uNight: { value: time === 'night' || time === 'space' ? 1 : 0 }, uRed: { value: 0 }, uLight: { value: 1 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
      fragmentShader: `
        uniform vec3 uTop, uHor, uGround, uSun, uSunCol, uFogCol; uniform float uCloud, uTime, uAurora, uFlash, uFogMix, uNight, uLight, uRed; varying vec3 vD;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p*=2.03; a*=0.5;} return s; }
        void main(){
          vec3 d = normalize(vD); float y = d.y;
          vec3 col = y > 0.0 ? mix(uHor, uTop, pow(clamp(y,0.0,1.0), 0.55)) : mix(uHor, uGround, clamp(-y*4.0,0.0,1.0));
          float sd = max(dot(d, uSun), 0.0);
          col += uSunCol * (pow(sd, 900.0)*6.0 + pow(sd, 12.0)*0.35) * (1.0 - uCloud*0.8);
          if (uNight > 0.5 && y > 0.0) { vec2 sp = d.xz/(y+0.2)*90.0; float st = step(0.985, hash(floor(sp))); col += vec3(st) * (1.0-uCloud) * 0.9 * smoothstep(0.0,0.3,y); }
          if (y > 0.0) {
            vec2 cp = d.xz / (y + 0.12) * 1.6 + vec2(uTime*0.01, uTime*0.004);
            float c = fbm(cp);
            float cov = smoothstep(1.0 - uCloud*0.95 - 0.15, 1.15 - uCloud*0.6, c + uCloud*0.35);
            vec3 cc = mix(vec3(1.0), uHor*0.7, 0.4) * (0.55 + 0.45*uLight);
            cc = mix(cc, cc*0.45, uCloud*0.7);
            col = mix(col, cc, cov * smoothstep(0.0, 0.18, y));
            if (uAurora > 0.0) { float band = sin(d.x*6.0 + uTime*0.25 + fbm(d.xz*4.0+uTime*0.05)*4.0); float a = smoothstep(0.2, 1.0, band) * smoothstep(0.1, 0.4, y) * smoothstep(0.85, 0.5, y); col += mix(mix(vec3(0.1,1.0,0.5), vec3(0.6,0.2,1.0), fbm(d.xz*3.0)), vec3(1.0,0.12,0.08), uRed) * a * uAurora * 0.8; }
          }
          if (uRed > 0.0) { float md = max(dot(d, normalize(vec3(-0.4, 0.45, -0.8))), 0.0); col += vec3(1.0, 0.18, 0.08) * (pow(md, 1600.0) * 4.0 + pow(md, 40.0) * 0.35) * uRed; }
          col = mix(col, uFogCol, uFogMix * smoothstep(0.5, -0.05, y));
          col += vec3(0.8,0.85,1.0) * uFlash;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const sky = new T.Mesh(new T.SphereGeometry(2500, 32, 16), mat);
    sky.name = 'sky'; sky.frustumCulled = false; sky.renderOrder = -1;
    return sky;
  };

  // ------------------------------------------------------------ scenery props (instanced, vertex coloured)
  class CB { // colour builder
    constructor() { this.list = []; }
    add(geo, col, x, y, z, rx, ry, rz, sx, sy, sz) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      const m = new T.Matrix4().compose(new T.Vector3(x || 0, y || 0, z || 0), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)), new T.Vector3(sx || 1, sy || 1, sz || 1));
      g.applyMatrix4(m);
      const c = new T.Color(col).convertSRGBToLinear(), n = g.attributes.position.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const v = 0.88 + ((i * 7919) % 97) / 97 * 0.24; arr[i * 3] = c.r * v; arr[i * 3 + 1] = c.g * v; arr[i * 3 + 2] = c.b * v; }
      g.setAttribute('color', new T.BufferAttribute(arr, 3));
      this.list.push(g); return this;
    }
    build() {
      const merged = SM.mergeGeos(this.list, 0.2);
      let n = 0; for (const g of this.list) n += g.attributes.position.count;
      const col = new Float32Array(n * 3); let o = 0;
      for (const g of this.list) { col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
      merged.setAttribute('color', new T.BufferAttribute(col, 3));
      return merged;
    }
  }
  const ico = (r, d) => new T.IcosahedronGeometry(r, d || 0);
  function propGeo(type, b) {
    const c = new CB();
    switch (type) {
      case 'rock': c.add(ico(1.6, 1), b.rock, 0, 0.6, 0, 0, 0, 0, 1.4, 0.8, 1.1); c.add(ico(0.9, 0), SM.shade(b.rock, -0.15), 1.4, 0.3, 0.4); break;
      case 'cactus': c.add(new T.CylinderGeometry(0.35, 0.4, 4, 8), 0x4f7a3a, 0, 2, 0); c.add(new T.CylinderGeometry(0.22, 0.25, 1.6, 6), 0x4f7a3a, 0.7, 2.4, 0, 0, 0, -0.2); c.add(new T.CylinderGeometry(0.22, 0.25, 1.2, 6), 0x4f7a3a, -0.6, 1.9, 0, 0, 0, 0.3); c.add(new T.SphereGeometry(0.35, 6, 4), 0x4f7a3a, 0, 4, 0); break;
      case 'dry': for (let i = 0; i < 5; i++) c.add(new T.ConeGeometry(0.06, 1.4, 4), 0x8a6a42, Math.cos(i) * 0.3, 0.6, Math.sin(i) * 0.3, Math.cos(i * 2) * 0.5, 0, Math.sin(i * 2) * 0.5); c.add(ico(0.7, 0), 0x9a8a5a, 0, 0.5, 0, 0, 0, 0, 1, 0.6, 1); break;
      case 'wreck': c.add(new T.BoxGeometry(3.4, 1.2, 6.5), 0x2c2a28, 0, 0.9, 0, 0.05, 0, 0.08); c.add(new T.CylinderGeometry(1.2, 1.3, 0.8, 8), 0x1f1d1b, 0.2, 1.9, -0.4, 0.1, 0, 0.3); c.add(new T.CylinderGeometry(0.12, 0.12, 4, 6), 0x1f1d1b, 0.4, 2.1, 1.6, 1.3, 0, 0); c.add(new T.BoxGeometry(0.8, 1, 6.6), 0x151515, 1.9, 0.5, 0); c.add(new T.BoxGeometry(0.8, 1, 6.6), 0x151515, -1.9, 0.5, 0); break;
      case 'jungle': c.add(new T.CylinderGeometry(0.45, 0.9, 13, 7), 0x5a4a35, 0, 6.5, 0); for (let i = 0; i < 4; i++) c.add(new T.ConeGeometry(0.5, 2.4, 4), 0x5a4a35, Math.cos(i * 1.57) * 0.9, 0.9, Math.sin(i * 1.57) * 0.9, Math.sin(i * 1.57) * 0.5, 0, -Math.cos(i * 1.57) * 0.5); c.add(ico(4.4, 1), 0x2d5a1f, 0, 13.5, 0, 0, 0, 0, 1.3, 0.55, 1.3); c.add(ico(3.2, 1), 0x3b6b26, 1.8, 11.5, 1.2, 0, 0, 0, 1.2, 0.5, 1.2); c.add(ico(2.8, 1), 0x24481a, -2, 10.5, -1, 0, 0, 0, 1.2, 0.5, 1.2); break;
      case 'palm': c.add(new T.CylinderGeometry(0.25, 0.4, 9, 6), 0x7a6448, 0.6, 4.4, 0, 0, 0, -0.13); for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; c.add(new T.BoxGeometry(0.9, 0.08, 4.2), 0x4c8a2c, 1.2 + Math.cos(a) * 1.7, 8.6, Math.sin(a) * 1.7, 0.35 * Math.sin(a), -a + PI / 2, 0.35 * Math.cos(a)); } break;
      case 'fern': for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; c.add(new T.BoxGeometry(0.4, 0.05, 1.8), 0x3e7a2a, Math.cos(a) * 0.7, 0.5, Math.sin(a) * 0.7, 0.5 * Math.sin(a), -a + PI / 2, 0.5 * Math.cos(a)); } break;
      case 'pine': case 'pinesnow': { const snow = type === 'pinesnow'; c.add(new T.CylinderGeometry(0.22, 0.35, 3, 6), 0x5a4030, 0, 1.5, 0); for (let i = 0; i < 4; i++) c.add(new T.ConeGeometry(2.6 - i * 0.5, 3.2, 8), i % 2 && snow ? 0xe8f0f4 : 0x2c4a2c, 0, 3.2 + i * 1.8, 0); if (snow) c.add(new T.ConeGeometry(0.9, 1.4, 8), 0xf2f6f8, 0, 9.6, 0); break; }
      case 'ice': c.add(new T.ConeGeometry(1.2, 6, 5), 0xb9dcef, 0, 3, 0, 0.1, 0, 0.08); c.add(new T.ConeGeometry(0.7, 3.4, 5), 0xd6eef8, 1.2, 1.7, 0.3, 0, 0, -0.3); break;
      case 'rubble': c.add(new T.BoxGeometry(3, 0.8, 2.2), 0x5c5c58, 0, 0.4, 0, 0.1, 0.4, 0.05); c.add(new T.BoxGeometry(1.4, 1.6, 1.2), 0x6d6a64, 1.4, 0.8, 0.8, 0.3, 0, 0.2); c.add(new T.CylinderGeometry(0.08, 0.08, 3, 4), 0x6a3a2a, -0.5, 1, 0, 0.5, 0, 0.9); break;
      case 'dead': c.add(new T.CylinderGeometry(0.2, 0.4, 7, 5), 0x3e3530, 0, 3.5, 0, 0.05, 0, 0.06); c.add(new T.CylinderGeometry(0.08, 0.15, 3, 4), 0x3e3530, 0.9, 5.5, 0, 0, 0, -0.8); c.add(new T.CylinderGeometry(0.08, 0.15, 2.4, 4), 0x3e3530, -0.7, 4.6, 0.3, 0.3, 0, 0.9); break;
      case 'crystalRed': case 'crystalGreen': case 'crystal': case 'glassShard': { const col = type === 'crystalRed' ? 0xff5a2a : type === 'crystalGreen' ? 0x9aff4a : type === 'glassShard' ? 0x6fd8c8 : 0xa070ff; for (let i = 0; i < 4; i++) c.add(new T.ConeGeometry(0.5 + i * 0.1, 3 + i * 1.2, 5), col, Math.cos(i * 1.7) * 0.8, 1.4 + i * 0.4, Math.sin(i * 1.7) * 0.8, Math.cos(i) * 0.4, 0, Math.sin(i) * 0.4); break; }
      case 'grass': for (let i = 0; i < 7; i++) c.add(new T.ConeGeometry(0.12, 1.1, 3), SM.shade(b.extra, (i % 3 - 1) * 0.1), Math.cos(i * 2.4) * 0.6, 0.5, Math.sin(i * 2.4) * 0.6, Math.cos(i) * 0.3, 0, Math.sin(i) * 0.3); break;
      case 'broad': c.add(new T.CylinderGeometry(0.3, 0.5, 5, 6), 0x5a4532, 0, 2.5, 0); c.add(ico(3, 1), 0x3d6a2a, 0, 6.2, 0, 0, 0, 0, 1, 0.85, 1); c.add(ico(2, 1), 0x4c7a32, 1.5, 5.2, 0.8); break;
      case 'heather': c.add(ico(0.9, 1), 0x7a4a6a, 0, 0.4, 0, 0, 0, 0, 1.3, 0.6, 1.2); c.add(ico(0.6, 0), 0x5a6a3a, 0.7, 0.3, 0.3); break;
      case 'acacia': c.add(new T.CylinderGeometry(0.2, 0.35, 5, 6), 0x5a4532, 0, 2.5, 0, 0, 0, 0.1); c.add(new T.CylinderGeometry(4.2, 3.0, 0.9, 10), 0x6a7a32, 0.4, 5.4, 0); break;
      case 'bunker': c.add(new T.BoxGeometry(5, 2.2, 4), 0x8a8a84, 0, 1.1, 0); c.add(new T.BoxGeometry(4, 0.3, 0.5), 0x1a1a1a, 0, 1.4, 2.0); c.add(new T.BoxGeometry(5.6, 0.4, 4.6), 0x7a7a74, 0, 2.3, 0); break;
      case 'pipe': c.add(new T.CylinderGeometry(0.9, 0.9, 12, 10), 0x8a8f94, 0, 2.6, 0, 0, 0, PI / 2); c.add(new T.BoxGeometry(0.4, 2.2, 1.6), 0x4a4a4a, -4, 1.1, 0); c.add(new T.BoxGeometry(0.4, 2.2, 1.6), 0x4a4a4a, 4, 1.1, 0); break;
      case 'mangrove': c.add(new T.CylinderGeometry(0.3, 0.4, 5, 6), 0x4a3e30, 0, 4, 0); for (let i = 0; i < 5; i++) c.add(new T.CylinderGeometry(0.08, 0.12, 2.6, 4), 0x4a3e30, Math.cos(i * 1.25) * 0.8, 1.1, Math.sin(i * 1.25) * 0.8, Math.sin(i * 1.25) * 0.5, 0, -Math.cos(i * 1.25) * 0.5); c.add(ico(2.6, 1), 0x3a4a26, 0, 7, 0, 0, 0, 0, 1.2, 0.6, 1.2); break;
      case 'debris': c.add(new T.BoxGeometry(4, 0.4, 1.6), 0x6a6a74, 0, 1, 0, 0.6, 0.3, 0.4); c.add(new T.BoxGeometry(1.2, 3, 0.3), 0x4a4a54, 1, 1.2, 0.6, 0.3, 0, 0.5); break;
      default: c.add(ico(1, 0), 0x777777);
    }
    return c.build();
  }

  SM.buildProps = function (M, quality) {
    const g = new T.Group();
    const b = M.biome, r = SM.rng(M.def.seed + 5);
    const W = M.water;
    const dens = quality === 'low' ? 0.45 : quality === 'high' ? 1.15 : 0.8;
    for (const [type, d] of b.props) {
      const geo = propGeo(type, b);
      const glow = /crystal|glassShard/.test(type);
      const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: glow ? 0.3 : 0.9, metalness: glow ? 0.3 : 0, emissive: glow ? new T.Color(type === 'crystalRed' ? 0xff4010 : type === 'crystalGreen' ? 0x60ff20 : type === 'glassShard' ? 0x30a090 : 0x8040ff).multiplyScalar(0.45) : new T.Color(0) });
      const n = Math.round(d * 650 * dens);
      const mats = [];
      let tries = 0;
      while (mats.length < n && tries++ < n * 8) {
        const x = (r() - 0.5) * 610, z = (r() - 0.5) * 610;
        const h = M.heightAt(x, z);
        if (W !== null && h < W + (type === 'mangrove' ? -1.2 : 0.4)) continue;
        const c = SM.cellOf(M, x, z);
        if (M.blocked[c] || M.bridge[c]) continue;
        const i = Math.round((x + M.half) / M.cell), j = Math.round((z + M.half) / M.cell);
        if (M.road[j * M.V + i]) continue;
        let ok = true;
        for (const hq of M.hq) if (Math.hypot(x - hq.x, z - hq.z) < 40) ok = false;
        for (const p of M.points) if (Math.hypot(x - p.x, z - p.z) < 23) ok = false;
        if (M.docks) for (const dk of M.docks) if (dk && Math.hypot(x - dk.x, z - dk.z) < 20) ok = false;
        if (!ok) continue;
        const hl = M.heightAt(x + 2, z) - M.heightAt(x - 2, z), hz = M.heightAt(x, z + 2) - M.heightAt(x, z - 2);
        if (Math.hypot(hl, hz) / 4 > (type === 'rock' ? 1.5 : 0.7)) continue;
        const s = 0.7 + r() * 0.7;
        const m = new T.Matrix4().compose(new T.Vector3(x, h - 0.15, z), new T.Quaternion().setFromEuler(new T.Euler(0, r() * PI * 2, 0)), new T.Vector3(s, s * (0.85 + r() * 0.3), s));
        mats.push(m);
      }
      if (!mats.length) continue;
      const im = new T.InstancedMesh(geo, mat, mats.length);
      mats.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = !/grass|fern|heather|dry/.test(type) && quality !== 'low';
      im.receiveShadow = true;
      im.name = 'props_' + type;
      g.add(im);
    }
    // city buildings / wreck hull (one merged mesh)
    if (M.buildings.length) {
      const night = M.def.time === 'night';
      const mb = new SM.MB(1 / 12);
      const mats = {
        wall: new T.MeshStandardMaterial({ map: SM.windowTexture(night), roughness: 0.85, metalness: 0.1, emissiveMap: SM.windowTexture(night), emissive: new T.Color(night ? 0xffffff : 0x000000), emissiveIntensity: night ? 0.9 : 0 }),
        roof: new T.MeshStandardMaterial({ color: 0x3a3c3e, roughness: 0.9 }),
        hull: new T.MeshStandardMaterial({ color: 0x5a5c66, roughness: 0.6, metalness: 0.6 }),
        dark: new T.MeshStandardMaterial({ color: 0x24252b, roughness: 0.7, metalness: 0.5 }),
        glow: new T.MeshBasicMaterial({ color: 0x9a6aff, toneMapped: false }),
      };
      for (const bd of M.buildings) {
        if (bd.wreck) {
          mb.push('hull', new T.CylinderGeometry(bd.w / 2, bd.w / 2, bd.d, 10, 1, true), bd.x, bd.y + bd.w * 0.25, bd.z, PI / 2, bd.rot, 0.25);
          for (let i = 0; i < 5; i++) mb.push('dark', new T.BoxGeometry(bd.w * 0.3, bd.w * 0.12, bd.d * 0.18), bd.x + Math.sin(bd.rot) * (i - 2) * bd.d * 0.2, bd.y + bd.w * 0.72, bd.z + Math.cos(bd.rot) * (i - 2) * bd.d * 0.2, 0, bd.rot, 0.25);
          mb.push('glow', new T.BoxGeometry(0.6, 0.6, bd.d * 0.8), bd.x, bd.y + bd.w * 0.5, bd.z, 0, bd.rot, 0.25);
        } else {
          const h = bd.ruined ? bd.h * 0.6 : bd.h;
          mb.box('wall', bd.w, h, bd.d, bd.x, bd.y + h / 2 - 1, bd.z);
          mb.box('roof', bd.w + 0.4, 0.6, bd.d + 0.4, bd.x, bd.y + h - 0.7, bd.z);
          if (bd.ruined) { mb.box('wall', bd.w * 0.5, bd.h * 0.25, bd.d * 0.4, bd.x - bd.w * 0.2, bd.y + h + bd.h * 0.1, bd.z + bd.d * 0.2, 0.2, 0, 0.15); }
          else { mb.box('roof', bd.w * 0.3, 2, bd.d * 0.3, bd.x + bd.w * 0.15, bd.y + h + 0.7, bd.z - bd.d * 0.1); if (bd.h > 35) mb.cyl('dark', 0.15, 0.2, 8, bd.x, bd.y + h + 4, bd.z, 0, 0, 0, 5); }
        }
      }
      const bm = mb.build(mats);
      bm.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      g.add(bm);
    }
    // bridges
    if (M.bridgeSegs.length) {
      const mb = new SM.MB(0.2);
      let n = 0;
      for (const sg of M.bridgeSegs) {
        const dx = sg[2] - sg[0], dz = sg[3] - sg[1], L = Math.hypot(dx, dz) + 0.6, a = Math.atan2(dx, dz);
        const cx = (sg[0] + sg[2]) / 2, cz = (sg[1] + sg[3]) / 2, y = M.water + 1.15;
        mb.box('deck', 9, 0.6, L, cx, y, cz, 0, a, 0);
        mb.box('rail', 0.3, 1.0, L, cx + Math.cos(a) * 4.4, y + 0.7, cz - Math.sin(a) * 4.4, 0, a, 0);
        mb.box('rail', 0.3, 1.0, L, cx - Math.cos(a) * 4.4, y + 0.7, cz + Math.sin(a) * 4.4, 0, a, 0);
        if (n++ % 4 === 0) { mb.cyl('pier', 0.7, 0.9, 9, cx + Math.cos(a) * 3, M.water - 3, cz - Math.sin(a) * 3, 0, 0, 0, 8); mb.cyl('pier', 0.7, 0.9, 9, cx - Math.cos(a) * 3, M.water - 3, cz + Math.sin(a) * 3, 0, 0, 0, 8); }
      }
      const bm = mb.build({ deck: new T.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.9 }), rail: new T.MeshStandardMaterial({ color: 0x5a3a26, roughness: 0.6, metalness: 0.5 }), pier: new T.MeshStandardMaterial({ color: 0x2e2e2c, roughness: 0.9 }) });
      bm.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = true; } });
      g.add(bm);
    }
    // landmark extras
    if (M.def.layout === 'taiga') { // pipeline across the map
      const mb = new SM.MB(0.2);
      for (let x = -300; x < 300; x += 6) { const z = -60 + Math.sin(x / 80) * 30; const h = M.heightAt(x, z); mb.cylX('pipe', 0.9, 6.1, x, h + 2.4, z, 10); if ((x / 6) % 3 === 0) { mb.box('sup', 0.4, 2.2, 1.6, x, h + 1.1, z); } }
      const pm = mb.build({ pipe: new T.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.4, metalness: 0.7 }), sup: new T.MeshStandardMaterial({ color: 0x3a3a3a }) });
      pm.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      g.add(pm);
    }
    if (M.def.layout === 'highland') { // standing stones at the centre-most point
      const p = M.points[0]; const mb = new SM.MB(0.3);
      for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2; mb.box('stone', 1.4, 4 + (i % 3), 0.8, p.x + Math.cos(a) * 12, M.heightAt(p.x, p.z) + 2, p.z + Math.sin(a) * 12, 0, -a, 0.05); }
      const sm = mb.build({ stone: new T.MeshStandardMaterial({ color: 0x77736a, roughness: 1 }) }); sm.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(sm);
    }
    M.turbines = [];
    if (M.def.layout === 'steppe') {
      for (let i = 0; i < 7; i++) {
        const x = -260 + i * 85, z = 120 * (i % 2 ? 1 : -1) + (r() - 0.5) * 40, h = M.heightAt(x, z);
        const tg = new T.Group(); tg.position.set(x, h, z);
        const mb = new SM.MB(0.3); mb.cyl('w', 0.7, 1.2, 40, 0, 20, 0, 0, 0, 0, 10); mb.box('w', 2, 2, 4, 0, 40.5, 0.5);
        tg.add(mb.build({ w: new T.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.5 }) }));
        const rot = new T.Group(); rot.position.set(0, 40.5, 2.8);
        const bb = new SM.MB(0.3); for (let k = 0; k < 3; k++) bb.box('w', 1.2, 17, 0.3, Math.sin(k * 2.094) * 8.5, Math.cos(k * 2.094) * 8.5, 0, 0, 0, -k * 2.094);
        rot.add(bb.build({ w: new T.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 }) }));
        tg.add(rot); M.turbines.push(rot);
        tg.traverse(o => { if (o.isMesh) o.castShadow = true; });
        g.add(tg);
      }
    }
    return g;
  };
})();
