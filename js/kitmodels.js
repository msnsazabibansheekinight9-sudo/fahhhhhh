// ============================================================================
// Personal-equipment models: every item in gear.js built to its real outline.
//  - Helmets are swept shells with the item's own cut line (brim, visor lip,
//    ear cut-outs, flared skirt), thickness, edge trim, rails, shrouds, covers,
//    bands and chin straps (2-point, 4-point, FAST dial).
//  - Night vision hangs from the helmet shroud (or a skull-crusher head mount)
//    with each device's layout: PVS-14 monocular, PVS-7 single-objective,
//    PVS-31 twin pods, GPNVG-18 four tubes, ENVG-B thermal bridge.
//  - Body armour: SAPI-cut plate bags, cummerbunds (full, cage, elastic),
//    collars, throat/groin/lower-back protectors, soft vests, steel armour,
//    chest rigs and WW web gear, with real pouch layouts per vest.
//  - Headsets, masks, packs with shoulder straps, boots and gloves.
// All coordinates are in the soldier's bone frames (metres, -z = front,
// +x = the wearer's right).
// ============================================================================
'use strict';
(function () {
const G = window.G, PI = Math.PI, TAU = PI * 2;
const { gBox, gCyl, gCylY, gCylX, gSph, gRBox } = G.geo;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const GC = {};
const cache = (k, f) => GC[k] || (GC[k] = f());
let HM = null, add = null, M = null; // set per soldier in the entry points
const mat = (c, r, m) => HM.mat(c, r, m), fab = (c, r) => HM.fabric(c, r);
const glass = (c, o = .1) => cache('gl' + c + o, () => G.mat({ color: c, roughness: o, metalness: .85 }));
const clear = (c, op) => cache('cl' + c + op, () => G.mat({ color: c, roughness: .03, metalness: 0, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false }));

// ---------------------------------------------------------------- geometry helpers
// smooth curve over the angle from the front (0) to the back (π), symmetric left/right
function curve(pts) {
  if (typeof pts === 'number') return () => pts;
  return a => { a = Math.abs(a) % TAU; if (a > PI) a = TAU - a;
    for (let i = 1; i < pts.length; i++) if (a <= pts[i][0]) { const [a0, y0] = pts[i - 1], [a1, y1] = pts[i], t = (a - a0) / (a1 - a0 || 1); return y0 + (y1 - y0) * (1 - Math.cos(t * PI)) / 2; }
    return pts[pts.length - 1][1]; };
}
// azimuthal sweep. prof(θ) → [[r, y], …] (same length for every θ); θ = 0 straight ahead (-z), θ = π/2 the wearer's right (+x)
function sweep(key, o, prof) {
  return cache(key, () => {
    const n = o.n || 40, t0 = o.t0 || 0, t1 = o.t1 === undefined ? TAU : o.t1, k = o.k || 1, cz = o.cz || 0, su = o.su || 3;
    const pos = [], uv = [], idx = []; let m = 0;
    for (let i = 0; i <= n; i++) {
      const th = t0 + (t1 - t0) * i / n, P = prof(th); m = P.length;
      const sx = Math.sin(th), cz_ = -Math.cos(th);
      let acc = 0;
      for (let j = 0; j < m; j++) { const [r, y] = P[j]; if (j) acc += Math.hypot(r - P[j - 1][0], y - P[j - 1][1]);
        pos.push(r * sx, y, r * cz_ * k + cz); uv.push((th - t0) * (o.ur || .15) * 6 * (su / 3), acc * 6); }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = (i + 1) * m + j, c = a + 1, d = b + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  });
}
// closed loop profile with a hard edge between segments: duplicate the corner points
function loop(...segs) { const out = []; for (const s of segs) { if (out.length) out.push(out[out.length - 1]); out.push(...s); } return out; }
// box-section ribbon along a smooth path; side = the width direction hint
function ribbon(key, pts, w, t, side = [0, 0, 1], segs) {
  return cache(key, () => {
    const cv = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), N = segs || pts.length * 6;
    const S = new THREE.Vector3(...side), pos = [], idx = [];
    const T = new THREE.Vector3(), B = new THREE.Vector3(), Nn = new THREE.Vector3(), P = new THREE.Vector3();
    const cs = [[1, 1], [-1, 1], [-1, 1], [-1, -1], [-1, -1], [1, -1], [1, -1], [1, 1]];
    for (let i = 0; i <= N; i++) { const u = i / N; cv.getPointAt(u, P); cv.getTangentAt(u, T);
      B.copy(S).addScaledVector(T, -S.dot(T)).normalize(); Nn.crossVectors(T, B);
      for (const [b, nn] of cs) pos.push(P.x + B.x * b * w / 2 + Nn.x * nn * t / 2, P.y + B.y * b * w / 2 + Nn.y * nn * t / 2, P.z + B.z * b * w / 2 + Nn.z * nn * t / 2); }
    for (let i = 0; i < N; i++) for (let f = 0; f < 4; f++) { const a0 = i * 8 + f * 2, a1 = a0 + 1, b0 = a0 + 8, b1 = a1 + 8; idx.push(a0, a1, b0, a1, b1, b0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const uv = new Float32Array(pos.length / 3 * 2); for (let i = 0; i < uv.length / 2; i++) { uv[i * 2] = (i % 8) / 8; uv[i * 2 + 1] = Math.floor(i / 8) / N * 4; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return g;
  });
}
const cable = (key, pts, r) => cache(key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), pts.length * 6, r, 6, false));
// panel from a star-shaped outline (x/y), subdivided so it can bend around the torso (z += bend·x² + curveY·y²),
// with a soft pillow bulge on the faces (fabric bags) and a rounded edge
function slab(key, outline, depth, bend = 0, bev = .004, curveY = 0, pillow) {
  return cache(key, () => {
    // resample the outline evenly
    const per = []; let L = 0; for (let i = 0; i < outline.length; i++) { const a = outline[i], b = outline[(i + 1) % outline.length]; per.push(L); L += Math.hypot(b[0] - a[0], b[1] - a[1]); }
    const N = 56, pts = []; let j = 0;
    for (let i = 0; i < N; i++) { const d = i / N * L; while (j < outline.length - 1 && per[j + 1] <= d) j++; const a = outline[j], b = outline[(j + 1) % outline.length], t = (d - per[j]) / Math.max(1e-9, Math.hypot(b[0] - a[0], b[1] - a[1])); pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x; cy += y; } cx /= N; cy /= N;
    const R = 7, pl = pillow === undefined ? depth * .25 : pillow, h = depth / 2, pos = [], uv = [], idx = [];
    const ring = (k, zs, inset) => { const f = k / R; return pts.map(([x, y]) => { const px = cx + (x - cx) * f, py = cy + (y - cy) * f; const ix = inset ? cx + (x - cx) * (1 - inset / Math.hypot(x - cx, y - cy)) : px, iy = inset ? cy + (y - cy) * (1 - inset / Math.hypot(x - cx, y - cy)) : py; return [inset ? ix : px, inset ? iy : py, zs * (h + pl * (1 - f * f))]; }); };
    const cols = [];
    for (let k = 0; k < R; k++) cols.push(ring(k, -1));
    cols.push(ring(R, -1, bev)); cols.push(pts.map(([x, y]) => [x, y, -h + bev * .3])); cols.push(pts.map(([x, y]) => [x, y, h - bev * .3])); cols.push(ring(R, 1, bev));
    for (let k = R - 1; k >= 0; k--) cols.push(ring(k, 1));
    const m = cols.length;
    for (let i = 0; i <= N; i++) for (let c = 0; c < m; c++) { const [x, y, z] = cols[c][i % N]; pos.push(x, y, z + bend * x * x + curveY * y * y); uv.push(x * 5, y * 5); }
    for (let i = 0; i < N; i++) for (let c = 0; c < m - 1; c++) { const a = i * m + c, b = (i + 1) * m + c; idx.push(a, c + 1 + i * m, b, b, c + 1 + i * m, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    // make sure the front (-z) faces outward whatever the outline winding
    const nz = g.attributes.normal.getZ(m * 2 + 3); if (nz > 0) { const I = g.index.array; for (let q = 0; q < I.length; q += 3) { const t = I[q]; I[q] = I[q + 1]; I[q + 1] = t; } g.computeVertexNormals(); }
    return g;
  });
}
// straight extrusion (boots)
function extr(key, outline, depth, bev = .004) {
  return cache(key, () => { const sh = new THREE.Shape(); outline.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 4 }); g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g; });
}
// loft of rounded cross-sections along z: slices [[z, width, top, bottom], ...] (boots)
function loft(key, sl, p = .55, n = 18) {
  return cache(key, () => {
    const pos = [], idx = [], ring = [];
    const pw = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
    for (const [z, w, top, bot] of sl) { const mid = (top + bot) / 2, hh = (top - bot) / 2, r = [];
      for (let i = 0; i < n; i++) { const a = i / n * TAU, e = Math.sin(a) < 0 ? p * .6 : p; r.push([w / 2 * pw(Math.cos(a), e), mid + hh * pw(Math.sin(a), e), z]); } ring.push(r); }
    for (const r of ring) for (const q of r) pos.push(...q);
    const m = ring.length;
    for (let k = 0; k < m - 1; k++) for (let i = 0; i < n; i++) { const a = k * n + i, b = k * n + (i + 1) % n, c = a + n, d = b + n; idx.push(a, b, c, b, d, c); }
    const c0 = pos.length / 3, c1 = c0 + 1; const cen = r => r.reduce((s, q) => [s[0] + q[0] / n, s[1] + q[1] / n, s[2] + q[2] / n], [0, 0, 0]);
    pos.push(...cen(ring[0]), ...cen(ring[m - 1]));
    for (let i = 0; i < n; i++) { idx.push(c0, (i + 1) % n, i); idx.push(c1, (m - 1) * n + i, (m - 1) * n + (i + 1) % n); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const uv = []; for (let i = 0; i < pos.length / 3; i++) uv.push(pos[i * 3] * 8, pos[i * 3 + 2] * 8); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    // outward check: a vertex on the top of a middle ring should have +y normal
    const t = Math.floor(m / 2) * n + Math.round(n / 4); if (g.attributes.normal.getY(t) < 0) { const I = g.index.array; for (let q = 0; q < I.length; q += 3) { const x = I[q]; I[q] = I[q + 1]; I[q + 1] = x; } g.computeVertexNormals(); }
    return g;
  });
}
// SAPI "shooter's cut" plate outline (w × h, top corners chamfered)
function sapi(w, h, c = .055, r = .02) {
  const W = w / 2, H = h / 2, pts = [];
  for (let i = 0; i <= 4; i++) { const a = PI + i / 4 * PI / 2; pts.push([-W + r + Math.cos(a) * r, -H + r + Math.sin(a) * r]); }
  for (let i = 0; i <= 4; i++) { const a = -PI / 2 + i / 4 * PI / 2; pts.push([W - r + Math.cos(a) * r, -H + r + Math.sin(a) * r]); }
  pts.push([W, H - c * 1.3], [W - c, H], [-W + c, H], [-W, H - c * 1.3]);
  return pts;
}
const rrect = (w, h, r = .015) => { const W = w / 2, H = h / 2, p = []; for (const [cx, cy, a0] of [[W - r, H - r, 0], [-W + r, H - r, PI / 2], [-W + r, -H + r, PI], [W - r, -H + r, PI * 1.5]]) for (let i = 0; i <= 3; i++) { const a = a0 + i / 3 * PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; };
// temporary group → bake its children into the parent (keeps the soldier's per-bone mesh merge working)
function flatten(g, parent) { g.updateMatrix(); for (const o of [...g.children]) { if (o.isGroup) { flatten(o, g); } } g.updateMatrix(); for (const o of [...g.children]) { o.applyMatrix4(g.matrix); parent.add(o); } if (g.parent) g.parent.remove(g); }
function grp(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, rz); return g; }
const A = (geo, m, x, y, z, p, rx = 0, ry = 0, rz = 0) => { const o = add(geo, m, x, y, z, p); o.rotation.set(rx, ry, rz); return o; };

// ================================================================= HELMETS
// shell spec: R (half-width), k (depth/width), ry (crown height above the rim datum), cy/cz (origin in the head frame),
// edge (lower edge height by angle from the front), flare (outward kick near the edge), fz (flare zone height), th (shell thickness)
const SH = {
  stahl16: { R: .128, k: 1.1, ry: .112, edge: [[0, .036], [.78, .036], [1.02, -.042], [1.5, -.08], [2.2, -.096], [PI, -.1]], flare: [[0, .032], [.78, .032], [1.02, .03], [1.5, .034], [PI, .046]], fz: .045 },
  m35: { R: .126, k: 1.1, ry: .11, edge: [[0, .03], [.8, .03], [1.05, -.036], [1.5, -.066], [PI, -.086]], flare: [[0, .02], [.9, .02], [1.5, .022], [PI, .03]], fz: .035 },
  ssh40: { R: .128, k: 1.08, ry: .118, edge: [[0, .022], [.9, .012], [1.5, -.03], [2.3, -.045], [PI, -.05]], flare: .007, fz: .015 },
  ssh68: { R: .13, k: 1.08, ry: .126, p: .8, edge: [[0, .024], [.9, .012], [1.5, -.036], [PI, -.056]], flare: [[0, .008], [1.5, .014], [PI, .022]], fz: .03 },
  m1: { R: .13, k: 1.09, ry: .112, edge: [[0, .016], [1.1, -.012], [1.6, -.03], [2.4, -.036], [PI, -.034]] },
  pasgt: { R: .136, k: 1.08, ry: .122, cz: .01, edge: [[0, .014], [.45, .012], [.8, -.02], [1.2, -.066], [1.7, -.078], [2.4, -.086], [PI, -.088]], flare: [[0, .012], [.4, .01], [.8, .004], [1.4, .008], [PI, .014]], fz: .024 },
  mk6: { R: .136, k: 1.08, ry: .13, cz: .006, edge: [[0, .02], [.6, .01], [1.1, -.05], [1.6, -.066], [PI, -.076]], flare: [[0, .004], [PI, .01]], fz: .02 },
  type88: { R: .135, k: 1.08, ry: .122, cz: .008, edge: [[0, .015], [.5, .012], [.85, -.02], [1.25, -.064], [1.8, -.076], [PI, -.084]], flare: [[0, .009], [.8, .004], [PI, .012]], fz: .022 },
  gallet: { R: .134, k: 1.08, ry: .126, cz: .006, edge: [[0, .02], [.7, .008], [1.2, -.052], [1.7, -.066], [PI, -.078]], flare: .01, fz: .016 },
  qgf03: { R: .135, k: 1.08, ry: .122, cz: .008, edge: [[0, .016], [.5, .012], [.9, -.02], [1.3, -.058], [PI, -.078]], flare: [[0, .016], [.6, .01], [1.2, .006], [PI, .012]], fz: .024 },
  ach: { R: .132, k: 1.08, ry: .118, cz: .006, edge: [[0, .016], [.7, .006], [1.15, -.024], [1.5, -.014], [1.9, -.036], [2.4, -.064], [PI, -.07]] },
  mk7: { R: .132, k: 1.08, ry: .114, cz: .006, edge: [[0, .018], [.8, .008], [1.2, -.03], [1.55, -.028], [2.0, -.055], [PI, -.078]] },
  fast: { R: .13, k: 1.08, ry: .11, cz: .006, edge: [[0, .02], [.7, .014], [1.05, .034], [1.35, .046], [1.85, .042], [2.2, 0], [2.6, -.04], [PI, -.05]] },
  airframe: { R: .13, k: 1.08, ry: .112, cz: .006, edge: [[0, .02], [.7, .014], [1.05, .036], [1.35, .05], [1.85, .046], [2.2, .004], [2.6, -.036], [PI, -.046]] },
  ihps: { R: .134, k: 1.08, ry: .116, cz: .006, edge: [[0, .018], [.7, .012], [1.05, .028], [1.35, .04], [1.85, .036], [2.2, -.006], [2.6, -.045], [PI, -.056]] },
  rf1: { R: .134, k: 1.08, ry: .114, cz: .006, th: .013, edge: [[0, .022], [.7, .016], [1.05, .034], [1.35, .046], [1.85, .042], [2.2, 0], [2.6, -.042], [PI, -.052]], flare: [[0, .006], [.6, 0]], fz: .02 },
  '6b47': { R: .134, k: 1.08, ry: .12, cz: .006, edge: [[0, .02], [.6, .012], [1.1, -.045], [1.6, -.068], [PI, -.08]], flare: .006, fz: .015 },
  altyn: { R: .14, k: 1.07, ry: .13, cz: .008, edge: [[0, .052], [.82, .052], [1.0, -.09], [1.6, -.1], [PI, -.1]], th: .012 },
  lshz: { R: .138, k: 1.07, ry: .125, cz: .008, edge: [[0, .048], [.8, .048], [1.0, -.07], [1.6, -.08], [PI, -.09]] },
  visor: { R: .136, k: 1.08, ry: .12, cz: .006, edge: [[0, .044], [.85, .044], [1.02, -.07], [PI, -.082]] },
};
for (const k in SH) { const s = SH[k]; s.e = curve(s.edge); s.f = s.flare ? curve(s.flare) : () => 0; s.fz = s.fz || .02; s.th = s.th || .009; s.cy = s.cy === undefined ? .035 : s.cy; s.cz = s.cz || 0; }
// outer surface radius of a shell at height y, angle a (from the front)
function surf(s, a, y) {
  let r = y >= 0 ? s.R * Math.pow(Math.sqrt(Math.max(0, 1 - (y / s.ry) ** 2)), s.p || 1) : s.R;
  const d = y - s.e(a); if (d < s.fz) r += s.f(a) * (1 - Math.max(0, d) / s.fz) ** 2;
  return r;
}
function shellProf(s, th = s.th, nv = 13) {
  return t => { const a = t, e = s.e(a), out = [], inn = [];
    for (let v = 0; v <= nv; v++) { const u = v / nv; let y;
      if (e >= 0) { const pe = Math.acos(clamp(e / s.ry, -1, .999)); y = s.ry * Math.cos(u * pe); }
      else { const tq = .78; y = u <= tq ? s.ry * Math.cos(u / tq * PI / 2) : e * (u - tq) / (1 - tq); }
      if (v === nv) y = e;
      const r = surf(s, a, y); out.push([r, y]);
      const nr = y > 0 ? r / (s.R * s.R) : 1, ny = y > 0 ? y / (s.ry * s.ry) : 0, nl = Math.hypot(nr, ny) || 1;
      inn.push([Math.max(0, r - th * nr / nl), v === nv ? e : y - th * ny / nl]);
    }
    return loop(out, [out[nv], inn[nv]], inn.slice().reverse());
  };
}
const shellGeo = (id, s) => sweep('sh' + id, { n: 44, k: s.k, cz: s.cz }, shellProf(s));
// conformal patch on a shell (velcro, shrouds, bands, rails, trim): angle range, height range, offset, thickness
function patch(key, s, t0, t1, y0, y1, off, th, n = 10) {
  return sweep(key, { n, t0, t1, k: s.k, cz: s.cz, su: 1 }, t => { const out = [], inn = [];
    for (let v = 0; v <= 4; v++) { const y = y1 + (y0 - y1) * v / 4; const r = surf(s, t, y); out.push([r + off + th, y]); inn.push([r + off, y]); }
    return loop(out, [out[4], inn[4]], inn.reverse(), [[surf(s, t, y1) + off + th, y1]]); });
}
// patch that follows the edge: from edge+lo to edge+hi
function edgePatch(key, s, t0, t1, lo, hi, off, th, n = 16) {
  return sweep(key, { n, t0, t1, k: s.k, cz: s.cz, su: 1 }, t => { const e = s.e(t), y0 = e + lo, y1 = e + hi, r0 = surf(s, t, y0) + off, r1 = surf(s, t, y1) + off;
    return loop([[r1 + th, y1], [r0 + th, y0]], [[r0 + th, y0], [r0, y0]], [[r0, y0], [r1, y1]], [[r1 + th, y1]]); });
}
// rubber edge trim around the whole rim
const trimGeo = (id, s, w = .005) => sweep('trim' + id, { n: 48, k: s.k, cz: s.cz, su: 1 }, t => { const e = s.e(t), r = surf(s, t, e); return loop([[r + w * .7, e + w]], [[r + w * .7, e - w * .6]], [[r - s.th - w * .5, e - w * .6]], [[r - s.th - w * .5, e + w], [r + w * .7, e + w]]); });
// a point on the shell surface
function onShell(s, t, y, off = 0) { const r = surf(s, t, y) + off; return [r * Math.sin(t), y + s.cy, -r * Math.cos(t) * s.k + s.cz]; }

function chin2(HD, m, id, low = -.1) { // simple two-point chin strap
  add(ribbon('chin2' + id, [[.1, .02, .01], [.094, -.04, -.012], [.06, low + .01, -.045], [0, low, -.058], [-.06, low + .01, -.045], [-.094, -.04, -.012], [-.1, .02, .01]], .013, .003), m, 0, 0, 0, HD);
}
function chin4(HD, m, id, cup = true) { // four-point harness (ACH/MICH, ECH, Mk7, FAST) with chin cup
  for (const sx of [-1, 1]) {
    add(ribbon('c4a' + id + sx, [[sx * .104, .02, -.05], [sx * .098, -.02, -.035], [sx * .088, -.052, -.012]], .012, .003), m, 0, 0, 0, HD);
    add(ribbon('c4b' + id + sx, [[sx * .1, .0, .07], [sx * .098, -.03, .03], [sx * .088, -.052, -.008]], .012, .003), m, 0, 0, 0, HD);
    add(gRBox(.006, .018, .022, .003), M.dark, sx * .09, -.052, -.01, HD);
  }
  add(ribbon('c4c' + id, [[.086, -.058, -.012], [.06, -.09, -.045], [0, -.1, -.062], [-.06, -.09, -.045], [-.086, -.058, -.012]], .013, .003), m, 0, 0, 0, HD);
  if (cup) A(gRBox(.05, .022, .03, .01), M.dark, 0, -.098, -.066, HD, -.5);
}
const railsOn = { fast: 1, airframe: 1, ihps: 1, rf1: 1, lshz: 1, visor: 1 };
const shroudOn = { fast: 1, airframe: 1, ihps: 1, rf1: 1, ach: 1, ech: 1, mk7: 1, '6b47': 1, lshz: 1, visor: 1, qgf03: 1 };

function helmet(HD, id, model, H) {
  const hm = M.helm, dark = M.dark, web = fab('#3a3a30'), sk = model === 'm1cover' ? 'm1' : model, s = SH[sk];
  const shell = s ? add(shellGeo(sk, s), hm, 0, s.cy, 0, HD) : null;
  const trim = (m = dark) => add(trimGeo(sk, s), m, 0, s.cy, 0, HD);
  const vel = fab('#3c3c34'), velT = M.helm.map ? M.helm : fab('#4a4a3e');
  switch (model) {
    case 'brodie': { // shallow manganese bowl, wide flat brim with a rolled edge, crown rivet, leather chin strap
      const g = sweep('brodie', { n: 44, k: 1.08 }, () => { const o = [], i = []; for (let v = 0; v <= 8; v++) { const p = v / 8 * PI / 2; o.push([.122 * Math.sin(p), .024 + .09 * Math.cos(p)]); i.push([.116 * Math.sin(p), .02 + .086 * Math.cos(p)]); }
        return loop(o, [[.13, .024], [.186, .016], [.193, .013], [.195, .008], [.19, .005], [.186, .008], [.13, .018]], i.reverse()); });
      add(g, hm, 0, .035, .004, HD); add(gSph(.008, 8), hm, 0, .148, .004, HD);
      chin2(HD, M.leather, 'b', -.09); break; }
    case 'adrian': { // four-piece French helmet: bowl, peaked front and rear brim, crest, grenade badge
      add(sweep('adb', { n: 40, k: 1.1 }, () => { const o = [], i = []; for (let v = 0; v <= 9; v++) { const p = v / 9 * PI / 2; o.push([.118 * Math.sin(p), .03 + .1 * Math.cos(p)]); i.push([.112 * Math.sin(p), .03 + .094 * Math.cos(p)]); } return loop(o, [[.112, .03]], i.reverse()); }), hm, 0, .035, .004, HD);
      const w = curve([[0, .064], [.8, .036], [1.57, .02], [2.3, .036], [PI, .072]]);
      add(sweep('adbrim', { n: 48, k: 1.1 }, t => { const W = w(t), yo = .03 - W * .5; return loop([[.112, .036], [.118 + W, yo + .004], [.121 + W, yo], [.118 + W, yo - .004], [.112, .028]]); }), hm, 0, .035, .004, HD);
      const crest = []; for (let i = 0; i <= 10; i++) { const p = -1.15 + i / 10 * 2.3; crest.push([0, .065 + .1 * Math.cos(p) + .012, .004 + Math.sin(p) * .13]); }
      add(ribbon('adcrest', crest, .024, .007, [0, 1, 0]), hm, 0, 0, 0, HD);
      add(gSph(.012, 10), M.brass, 0, .085, -.12, HD); A(gRBox(.012, .016, .004, .002), M.brass, 0, .1, -.117, HD, -.3);
      chin2(HD, M.leather, 'ad', -.09); break; }
    case 'stahl16': case 'm35': {
      trim(hm);
      if (model === 'stahl16') for (const sx of [-1, 1]) { const p = onShell(s, sx * 1.52, .02, 0); A(gCylX(.014, .014, .026, 12), hm, p[0] + sx * .006, p[1], p[2], HD); }
      else { for (const sx of [-1, 1]) { const p = onShell(s, sx * 1.5, .03, .001); A(gCylX(.006, .006, .006, 8), M.metal, p[0], p[1], p[2], HD); }
        const p = onShell(s, -1.35, .045, .001); A(gRBox(.004, .024, .02, .002), mat('#c8c8c0', .6), p[0], p[1], p[2], HD, 0, -1.35); } // side vent + decal
      chin2(HD, M.leather, model, -.095); break; }
    case 'ssh40': case 'ssh68': {
      trim(hm); for (const t of [-1.55, 1.55, PI]) { const p = onShell(s, t, .045, .001); add(gSph(.006, 6), hm, p[0], p[1], p[2], HD); }
      chin2(HD, fab('#6a5a3e'), model, -.095); break; }
    case 'm1': case 'm1cover': {
      if (model === 'm1cover') { const cv = HM.patternMat(G.GEARID.u_us_erdl); shell.material = cv;
        add(patch('m1band', s, 0, TAU, .01, .03, .002, .006, 44), dark, 0, s.cy, 0, HD);
        const p = onShell(s, -.35, .03, .01); A(gRBox(.03, .05, .012, .004), mat('#c9c0a8', .9), p[0], p[1], p[2], HD, 0, .35); } // band + insect repellent / cigarette pack
      else trim(mat('#6a6a5e', .5, .6)); // stainless steel rim
      for (const sx of [-1, 1]) add(ribbon('m1st' + sx, [[sx * .108, .02, .012], [sx * .104, -.03, .004], [sx * .1, -.08, -.002], [sx * .09, -.1, -.004]], .016, .003), fab('#6a6040'), 0, 0, 0, HD); // loose chin straps
      A(gRBox(.018, .022, .004, .002), M.brass, .09, -.1, -.004, HD); break; }
    case 'pasgt': case 'mk6': case 'type88': case 'gallet': case 'qgf03': {
      trim(model === 'gallet' ? hm : dark);
      if (model !== 'gallet') { const b = add(patch('band' + model, s, 0, TAU, .032, .048, .002, .004, 44), fab('#3e3e30'), 0, s.cy, 0, HD); // helmet band
        for (const sx of [-1, 1]) { const p = onShell(s, PI + sx * .25, .04, .008); A(gBox(.014, .01, .003), mat('#9adf8a', .4), p[0], p[1], p[2], HD, 0, sx * .25); } } // cat eyes
      if (model === 'mk6') for (let i = 0; i < 10; i++) { const t = i / 10 * TAU; const p = onShell(s, t, .06, .006); A(gBox(.004, .03, .012), hm, p[0], p[1], p[2], HD, 0, -t); } // scrim loops
      if (model === 'pasgt' || model === 'type88') chin2(HD, web, model, -.1); else chin4(HD, web, model, model !== 'gallet');
      if (model === 'qgf03') { const p = onShell(s, 0, .06, .002); A(gRBox(.03, .02, .006, .003), M.metal, p[0], p[1], p[2], HD); }
      break; }
    case 'ach': case 'mk7': case '6b47': {
      trim(); chin4(HD, model === 'mk7' ? fab('#1e1e1c') : web, model);
      add(patch('achvb' + model, s, PI - .5, PI + .5, .0, .04, .0, .004, 8), vel, 0, s.cy, 0, HD); // rear velcro / name tape
      if (model === '6b47') add(patch('6bband', s, 0, TAU, .02, .036, .002, .005, 44), dark, 0, s.cy, 0, HD);
      break; }
    case 'fast': case 'airframe': case 'ihps': case 'rf1': case 'lshz': case 'visor': {
      trim();
      if (model !== 'lshz' && model !== 'visor') {
        add(patch('vtop' + model, s, -.55, .55, .055, .1, .001, .003, 10), vel, 0, s.cy, 0, HD); // loop velcro fields
        add(patch('vback' + model, s, PI - .5, PI + .5, .005, .06, .001, .003, 10), vel, 0, s.cy, 0, HD);
        for (const sx of [-1, 1]) { const t0 = sx > 0 ? 1.2 : -1.9; add(patch('vside' + model + sx, s, t0, t0 + .7, s.e(1.5) + .03, s.e(1.5) + .06, .001, .003, 8), vel, 0, s.cy, 0, HD); }
        for (const sx of [-1, 1]) add(cable('bung' + model + sx, [onShell(s, sx * 2.0, .02, .004), onShell(s, sx * 2.6, .06, .004), onShell(s, PI + sx * .15, .085, .004)], .0022), dark, 0, 0, 0, HD); // shock-cord bungees
        if (model === 'airframe') { for (const t of [-.35, 0, .35]) add(patch('vent' + t, s, t - .08, t + .08, .075, .1, .0015, .003, 3), dark, 0, s.cy, 0, HD); add(patch('afrib', s, -.06, .06, -.05, .11, .0, .006, 3), hm, 0, s.cy, 0, HD); }
        // dial retention at the back of the head, straps
        A(gCylY(.018, .018, .012, 14), dark, 0, -.045, .098, HD, PI / 2); chin4(HD, dark, model);
      } else chin4(HD, web, model);
      if (model === 'lshz' || model === 'visor') { // hinged face visor (clear on the LShZ, smoked armoured glass on the Aegis)
        const vm = model === 'lshz' ? clear('#a8c0c8', .16) : cache('aegv', () => G.mat({ color: '#101820', roughness: .05, metalness: .9, transparent: true, opacity: .9, side: THREE.DoubleSide }));
        add(sweep('fv' + model, { n: 24, t0: -1.1, t1: 1.1, k: s.k, cz: s.cz, su: 1 }, t => { const o = [], i = []; for (let v = 0; v <= 7; v++) { const y = s.e(0) + .004 - v / 7 * .16, r = surf(s, t, Math.max(y, s.e(0))) + .012 - Math.max(0, -.07 - y) * .25; o.push([r + .006, y]); i.push([r, y]); } return loop(o, [o[7], i[7]], i.reverse(), [o[0]]); }), vm, 0, s.cy, 0, HD);
        for (const sx of [-1, 1]) { const p = onShell(s, sx * 1.15, s.e(0) - .01, .01); A(gCylX(.016, .016, .014, 12), dark, p[0], p[1], p[2], HD); }
        if (model === 'visor') { const p = onShell(s, PI - .4, .07, .004); A(gRBox(.03, .02, .03, .006), cache('iffs', () => G.mat({ color: '#ff3020', emissive: '#ff2010', emissiveIntensity: 2 })), p[0], p[1], p[2], HD); }
      }
      break; }
    case 'altyn': { // titanium shell, armoured glass visor in a steel frame, big side hinges
      trim(hm);
      const V = { R: .15, k: 1.06, ry: .13, cy: s.cy, cz: s.cz, e: () => -.095, f: () => 0, fz: .01, th: .014 };
      add(sweep('altv', { n: 24, t0: -1.05, t1: 1.05, k: V.k, cz: V.cz, su: 1 }, t => { const o = [], i = []; for (let v = 0; v <= 6; v++) { const y = .058 - v / 6 * .15; o.push([.152 - (y < 0 ? 0 : y * y * 1.2), y]); i.push([.138 - (y < 0 ? 0 : y * y * 1.2), y]); } return loop(o, [o[6], i[6]], i.reverse(), [o[0]]); }), glass('#39443a', .05), 0, s.cy, 0, HD);
      add(sweep('altvf', { n: 24, t0: -1.07, t1: 1.07, k: 1.06, cz: s.cz, su: 1 }, () => loop([[.158, .07], [.158, .05]], [[.158, .05], [.14, .05]], [[.14, .05], [.14, .07], [.158, .07]])), hm, 0, s.cy, 0, HD);
      for (const sx of [-1, 1]) { const p = onShell(s, sx * 1.12, .03, .004); A(gCylX(.02, .02, .018, 14), hm, p[0], p[1], p[2], HD); A(gCylX(.008, .008, .024, 8), M.metal, p[0], p[1], p[2], HD); }
      chin2(HD, web, 'alt', -.1); break; }
    case 'cap': { // patrol cap: flat oval crown, stiff curved bill
      add(sweep('pcap', { n: 36, k: 1.1 }, () => loop([[0, .135], [.09, .135], [.096, .132]], [[.096, .132], [.108, .05]], [[.108, .05], [.102, .05]], [[.102, .05], [.09, .128], [0, .128]])), hm, 0, 0, 0, HD);
      add(sweep('pbill', { n: 16, t0: -.95, t1: .95, k: 1.1, su: 1 }, () => loop([[.104, .054], [.14, .05], [.176, .036]], [[.176, .036], [.176, .031]], [[.176, .031], [.14, .045], [.104, .049]])), hm, 0, 0, 0, HD); break; }
    case 'boonie': { // boonie hat: soft crown, stitched brim, foliage band
      add(sweep('bcrown', { n: 36, k: 1.08 }, () => loop([[0, .128], [.07, .126], [.1, .11], [.108, .06]], [[.108, .06], [.1, .06]], [[.1, .06], [.092, .106], [0, .12]])), hm, 0, 0, 0, HD);
      add(sweep('bbrim', { n: 48, k: 1.08 }, t => { const d = .008 * Math.sin(t * 3); return loop([[.104, .062], [.15, .05 + d], [.182, .036 + d]], [[.182, .036 + d], [.182, .031 + d]], [[.182, .031 + d], [.15, .045 + d], [.104, .057]]); }), hm, 0, 0, 0, HD);
      add(sweep('bband', { n: 36, k: 1.08, su: 1 }, () => loop([[.11, .09], [.111, .064]], [[.111, .064], [.105, .064]], [[.105, .064], [.105, .09], [.11, .09]])), hm, 0, 0, 0, HD);
      for (let i = 0; i < 12; i++) { const t = i / 12 * TAU; A(gBox(.012, .026, .004), hm, Math.sin(t) * .112, .077, -Math.cos(t) * .121, HD, 0, -t); } break; }
    case 'beret': { // soft beret pulled down to the right, badge over the left eye, leather headband
      add(sweep('bband2', { n: 36, k: 1.1, su: 1 }, () => loop([[.106, .075], [.108, .06]], [[.108, .06], [.1, .06]], [[.1, .06], [.1, .075], [.106, .075]])), M.leather, 0, 0, 0, HD);
      const b = add(gSph(.118, 20), hm, .018, .095, .01, HD); b.scale.set(1.08, .36, 1.02); b.rotation.z = -.28;
      A(gRBox(.022, .028, .006, .004), M.brass, -.045, .088, -.105, HD, .2); break; }
    case 'gasmask': case 'shemagh': HM.legacyHelmet(model, HD, M); break;
    default: if (!s) HM.legacyHelmet(model, HD, M);
  }
  // modern accessories: ARC rails, NVG shroud
  if (s && railsOn[model]) for (const sx of [-1, 1]) {
    const t0 = sx > 0 ? .95 : -2.25, t1 = sx > 0 ? 2.25 : -.95;
    add(edgePatch('rail' + model + sx, s, t0, t1, .004, .024, .0, .008), dark, 0, s.cy, 0, HD);
    add(edgePatch('railr' + model + sx, s, t0, t1, .009, .019, .008, .003), dark, 0, s.cy, 0, HD); // rail lip
  }
  if (s && shroudOn[model]) {
    if (railsOn[model] || model === '6b47') { // skeletonised shroud: a plate with two lightening holes
      add(patch('shr' + model, s, -.28, .28, s.e(0) + .012, s.e(0) + .058, .001, .006, 8), dark, 0, s.cy, 0, HD);
      for (const sx of [-1, 1]) { const p = onShell(s, sx * .12, s.e(0) + .036, .008); A(gRBox(.022, .018, .003, .006), hm, p[0], p[1], p[2], HD, 0, -sx * .12); }
    } else { // three-hole front bracket (Norotos)
      add(patch('nrt' + model, s, -.2, .2, s.e(0) + .01, s.e(0) + .05, .001, .004, 6), dark, 0, s.cy, 0, HD);
      for (const x of [-.02, 0, .02]) { const p = onShell(s, x * 6, s.e(0) + .03, .006); add(gCylY(.004, .004, .004, 8), M.metal, p[0], p[1], p[2], HD).rotation.x = PI / 2; }
    }
  }
  return s;
}

// ================================================================= FACE
function face(HD, F, s) {
  const dark = M.dark, blk = mat('#121212', .6);
  switch (F.model) {
    case 'glasses': { // single-shield wraparound lens, thin arms back to the ears
      add(sweep('olens', { n: 20, t0: -1.12, t1: 1.12, k: 1.03, su: 1 }, t => { const top = .046 - Math.abs(t) * .006, bot = Math.abs(t) < .16 ? .016 : .006 + Math.abs(t) * .004; return loop([[.107, top], [.108, bot]], [[.108, bot], [.104, bot]], [[.104, bot], [.103, top], [.107, top]]); }), glass('#262a30', .04), 0, 0, 0, HD);
      add(sweep('oframe', { n: 20, t0: -1.12, t1: 1.12, k: 1.03, su: 1 }, t => { const top = .046 - Math.abs(t) * .006; return loop([[.108, top + .005], [.108, top]], [[.108, top], [.103, top]], [[.103, top], [.103, top + .005], [.108, top + .005]]); }), blk, 0, 0, 0, HD);
      for (const sx of [-1, 1]) add(ribbon('oarm' + sx, [[sx * .098, .036, -.048], [sx * .104, .036, -.01], [sx * .104, .03, .03], [sx * .098, .01, .045]], .008, .003, [0, 1, 0]), blk, 0, 0, 0, HD);
      break; }
    case 'goggles': { // foam-sealed frame, single lens, wide elastic strap
      add(sweep('gfr', { n: 22, t0: -1.2, t1: 1.2, k: 1.02, su: 1 }, t => { const h = .026 - Math.abs(t) * .004; return loop([[.118, .031 + h], [.118, .031 - h]], [[.118, .031 - h], [.098, .031 - h]], [[.098, .031 - h], [.098, .031 + h], [.118, .031 + h]]); }), blk, 0, 0, 0, HD);
      add(sweep('glens', { n: 22, t0: -1.1, t1: 1.1, k: 1.02, su: 1 }, t => { const h = .02 - Math.abs(t) * .004; return loop([[.121, .031 + h], [.121, .031 - h]], [[.121, .031 - h], [.118, .031 - h]], [[.118, .031 - h], [.118, .031 + h], [.121, .031 + h]]); }), glass('#3a4652', .03), 0, 0, 0, HD);
      add(sweep('gstrap', { n: 30, t0: 1.15, t1: TAU - 1.15, k: 1.04, su: 4 }, () => loop([[.112, .046], [.112, .018]], [[.112, .018], [.107, .018]], [[.107, .018], [.107, .046], [.112, .046]])), fab('#3a3a30'), 0, 0, 0, HD);
      break; }
    case 'balaclava': { // knitted hood with an eye slot
      const b = fab('#1a1a1a');
      add(sweep('balu', { n: 40, k: 1.05 }, t => { const a = Math.abs(t) > PI ? TAU - Math.abs(t) : Math.abs(t), lo = a < 1.0 ? .044 : a < 1.4 ? .044 - (a - 1) * .3 : -.08; const o = [], i = []; for (let v = 0; v <= 8; v++) { const y = .148 - (.148 - lo) * v / 8; const r = y > .04 ? .104 * Math.sqrt(Math.max(0, 1 - ((y - .04) / .11) ** 2)) : .104; o.push([Math.max(r, 0), y]); i.push([Math.max(r - .004, 0), y]); } return loop(o, [o[8], i[8]], i.reverse()); }), b, 0, 0, .004, HD);
      add(sweep('bald', { n: 20, t0: -1.3, t1: 1.3, k: 1.04, su: 1 }, t => { const n = Math.max(0, 1 - Math.abs(t) / .5) * .014; return loop([[.112 + n, .01], [.118 + n, -.02], [.114, -.05], [.1, -.1], [.07, -.12]], [[.07, -.12], [.065, -.114]], [[.065, -.114], [.094, -.096], [.108, -.05], [.112 + n, -.02], [.107 + n, .01], [.112 + n, .01]]); }), b, 0, 0, .004, HD);
      break; }
    case 'shemagh': { // cotton scarf wrapped over the lower face and around the neck, tails behind
      const sm = shemMat();
      add(sweep('shw', { n: 36, k: 1.08, su: 2 }, t => { const a = Math.abs(t) > PI ? TAU - Math.abs(t) : Math.abs(t), top = a < 1.2 ? .008 : -.06, n = Math.max(0, 1 - a / .5) * .016; return loop([[.116 + n, top], [.124 + n * .6, top - .04], [.122, -.1], [.104, -.14]], [[.104, -.14], [.09, -.14]], [[.09, -.14], [.104, top - .04], [.106 + n, top], [.116 + n, top]]); }), sm, 0, 0, -.004, HD);
      A(gRBox(.06, .12, .02, .01), sm, .03, -.14, .1, HD, .3, 0, .2); break; }
    case 'skull': { // printed half-mask over nose and jaw
      add(sweep('skm', { n: 22, t0: -1.4, t1: 1.4, k: 1.04, su: 1 }, t => { const n = Math.max(0, 1 - Math.abs(t) / .5) * .016; return loop([[.11 + n, .006], [.118 + n * .5, -.03], [.112, -.06], [.1, -.096], [.072, -.118]], [[.072, -.118], [.068, -.112]], [[.068, -.112], [.094, -.092], [.108, -.06], [.114 + n * .5, -.03], [.106 + n, .006], [.11 + n, .006]]); }), skullMat(), 0, 0, .004, HD);
      break; }
    case 'mandible': { // Ops-Core mandible: rigid jaw guard on arms from the rails
      const m = M.helm;
      add(sweep('mand', { n: 22, t0: -1.2, t1: 1.2, k: 1.05, su: 1 }, t => { const a = Math.abs(t), r = .124 - a * .01, top = -.03 - Math.max(0, .5 - a) * .03; return loop([[r, top], [r + .004, -.065], [r - .014, -.1]], [[r - .014, -.1], [r - .02, -.095]], [[r - .02, -.095], [r - .008, -.065], [r - .008, top], [r, top]]); }), m, 0, 0, .004, HD);
      for (const sx of [-1, 1]) add(ribbon('mda' + sx, [[sx * .118, -.03, -.035], [sx * .13, .0, .0], [sx * .134, .034, .012]], .02, .008, [0, 0, 1]), dark, 0, 0, 0, HD);
      break; }
    case 'bvisor': { // full-face polycarbonate visor hinged on the rails
      add(sweep('bvis', { n: 26, t0: -1.3, t1: 1.3, k: 1.06, su: 1 }, t => { const o = [], i = []; for (let v = 0; v <= 8; v++) { const y = .07 - v / 8 * .19, r = .145 - Math.max(0, y - .02) * .5 + Math.max(0, -.06 - y) * .2; o.push([r, y]); i.push([r - .005, y]); } return loop(o, [o[8], i[8]], i.reverse(), [o[0]]); }), clear('#a8c0c8', .16), 0, 0, .006, HD);
      add(sweep('bvisr', { n: 26, t0: -1.3, t1: 1.3, k: 1.06, su: 1 }, () => loop([[.148, .082], [.146, .066]], [[.146, .066], [.138, .066]], [[.138, .066], [.14, .082], [.148, .082]])), dark, 0, 0, .006, HD);
      for (const sx of [-1, 1]) { A(gCylX(.014, .014, .012, 12), dark, sx * .138, .045, -.03, HD); }
      break; }
    case 'gp5': { // Soviet GP-5: rubber hood over the whole head, round eyepieces, chin canister
      const rub = mat('#40463e', .75);
      add(sweep('gp5h', { n: 40, k: 1.05 }, t => { const o = [], i = []; for (let v = 0; v <= 10; v++) { const y = .152 - v / 10 * .27, r = y > .04 ? .108 * Math.sqrt(Math.max(0, 1 - ((y - .04) / .115) ** 2)) : .108 - (.04 - y) * .15; o.push([Math.max(0, r), y]); i.push([Math.max(0, r - .005), y]); } return loop(o, [o[10], i[10]], i.reverse()); }), rub, 0, 0, .004, HD);
      for (const sx of [-1, 1]) { A(gCyl(.024, .024, .016, 18), M.metal, sx * .037, .028, -.114, HD); A(gCyl(.019, .019, .004, 18), glass('#4a5a60', .03), sx * .037, .028, -.123, HD); }
      A(gCyl(.024, .02, .03, 14), rub, 0, -.05, -.1, HD, -.5); A(gCyl(.02, .02, .012, 14), M.metal, 0, -.062, -.118, HD, -.5);
      A(gCyl(.04, .04, .07, 18), mat('#4a4e40', .6, .3), 0, -.1, -.14, HD, -.9); A(gCyl(.042, .042, .006, 18), mat('#3a3e32', .6, .3), 0, -.08, -.117, HD, -.9); A(gCyl(.042, .042, .006, 18), mat('#3a3e32', .6, .3), 0, -.12, -.163, HD, -.9);
      break; }
    case 'm50': case 's10': { // M50: one wide lens, twin cheek filters; S10: two eyepieces, single left filter, speech module
      const rub = mat('#161616', .7);
      add(sweep('m50f' + F.model, { n: 26, t0: -1.4, t1: 1.4, k: 1.04, su: 1 }, t => loop([[.104, .07], [.114, .03], [.116, -.03], [.1, -.09], [.066, -.118]], [[.066, -.118], [.06, -.11]], [[.06, -.11], [.094, -.085], [.106, -.03], [.104, .03], [.098, .066], [.104, .07]])), rub, 0, 0, .004, HD);
      if (F.model === 'm50') { add(sweep('m50l', { n: 22, t0: -1.02, t1: 1.02, k: 1.04, su: 1 }, t => { const top = .058 - Math.abs(t) * .01, bot = Math.abs(t) < .25 ? .0 : -.014 + Math.abs(t) * .01; return loop([[.121, top], [.123, bot]], [[.123, bot], [.116, bot]], [[.116, bot], [.115, top], [.121, top]]); }), glass('#3a4a52', .03), 0, 0, .004, HD);
        for (const sx of [-1, 1]) { A(gCyl(.03, .03, .03, 18), mat('#26282a', .6), sx * .088, -.05, -.07, HD, 0, -sx * .9); A(gCyl(.026, .026, .006, 18), mat('#3a3c3e', .6), sx * .1, -.05, -.084, HD, 0, -sx * .9); } }
      else { for (const sx of [-1, 1]) { A(gRBox(.052, .044, .014, .014), rub, sx * .038, .028, -.112, HD, 0, -sx * .25); A(gRBox(.044, .036, .004, .012), glass('#3a4a52', .03), sx * .04, .028, -.12, HD, 0, -sx * .25); }
        A(gCyl(.034, .036, .03, 18), mat('#1e1e1e', .6), -.075, -.055, -.082, HD, 0, .8); }
      A(gCyl(.02, .024, .028, 14), rub, 0, -.06, -.122, HD); A(gRBox(.03, .02, .01, .006), mat('#2e2e2e', .6), 0, -.086, -.12, HD);
      for (const sx of [-1, 1]) add(ribbon('mstrap' + sx, [[sx * .1, .05, -.03], [sx * .106, .07, .04], [0, .08, .104]].map((p, i) => i === 2 ? [sx * .02, .08, .104] : p), .016, .003, [0, 1, 0]), rub, 0, 0, 0, HD);
      break; }
  }
}
let _shem, _skull;
function shemMat() { if (_shem) return _shem; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#cfc5ad'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#3a3026'; for (let i = 0; i < 64; i += 4) for (let j = 0; j < 64; j += 4) if ((i + j) % 8 === 0) { x.fillRect(i, j, 2, 2); x.fillRect(i + 2, j + 2, 1, 1); } for (const k of [14, 16, 46, 48]) { x.fillRect(0, k, 64, 1); x.fillRect(k, 0, 1, 64); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.encoding = THREE.sRGBEncoding; return (_shem = G.mat({ map: t, roughness: .95 })); }
function skullMat() { if (_skull) return _skull; const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#141414'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#e0dccf';
  x.beginPath(); x.ellipse(64, 20, 34, 18, 0, 0, PI * 2); x.fill(); x.fillStyle = '#141414'; x.beginPath(); x.moveTo(64, 10); x.lineTo(58, 24); x.lineTo(70, 24); x.fill(); x.fillStyle = '#e0dccf';
  for (let i = 0; i < 8; i++) { x.fillRect(38 + i * 7, 34, 5, 12); x.fillRect(40 + i * 6.3, 48, 4, 9); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.repeat.set(1 / 2.2, 1 / .9); t.offset.set(.05, -.05); return (_skull = G.mat({ map: t, roughness: .7 })); }

// ================================================================= NIGHT VISION
function nvg(HD, N, H, s) {
  const dark = mat('#1b1c1a', .55, .2), gls = glass('#16122a', .06), eye = mat('#0c0c0c', .8);
  const ey = .026, ez = -.106; // eyepiece position (in front of the eyes)
  let top; // mount point
  if (s && (shroudOn[H.model])) top = onShell(s, 0, s.e(0) + .034, .012);
  else if (s) { top = onShell(s, 0, s.e(0) + .03, .01); A(gRBox(.05, .04, .012, .006), dark, top[0], top[1], top[2] + .004, HD); } // bracket strapped to the helmet
  else { // skull-crusher head mount
    add(sweep('scr', { n: 36, k: 1.08, su: 3 }, () => loop([[.106, .07], [.108, .05]], [[.108, .05], [.1, .05]], [[.1, .05], [.1, .07], [.106, .07]])), dark, 0, 0, .004, HD);
    add(ribbon('scrt', [[0, .065, -.1], [0, .145, -.02], [0, .14, .06], [0, .07, .112]], .024, .004, [1, 0, 0]), dark, 0, 0, 0, HD);
    top = [0, .07, -.118]; A(gRBox(.06, .05, .016, .008), dark, 0, .07, -.108, HD);
  }
  // mount body (L4G24-type) and the arm down to the device
  A(gRBox(.044, .032, .03, .006), dark, top[0], top[1], top[2] - .012, HD);
  A(gRBox(.012, .02, .014, .004), mat('#2a2c2e', .5, .6), top[0] + .026, top[1], top[2] - .014, HD);
  const armZ = top[2] - .03, devZ = ez - .03;
  add(ribbon('nva' + N.model, [[0, top[1] - .01, top[2] - .02], [0, (top[1] + ey) / 2 + .01, (armZ + devZ) / 2 - .01], [0, ey + .03, devZ]], .03, .012, [1, 0, 0]), dark, 0, 0, 0, HD);
  const pod = (x, len, r, key, yaw = 0) => { // one image-intensifier tube: eyecup, body, objective housing, lens
    const cy = ey, g = grp(x, cy, ez, yaw); HD.add(g);
    A(gCyl(r * .92, r * .92, .018, 16), eye, 0, 0, -.009, g);
    A(gCyl(r, r, len, 16), dark, 0, 0, -.018 - len / 2, g);
    A(gCyl(r * 1.12, r * 1.08, .03, 18), dark, 0, 0, -.018 - len - .014, g);
    for (let i = 0; i < 3; i++) A(gCyl(r * 1.15, r * 1.15, .003, 18), eye, 0, 0, -.018 - len - .006 - i * .008, g);
    A(gCyl(r * .95, r * .95, .002, 18), gls, 0, 0, -.018 - len - .03, g);
    flatten(g, HD);
  };
  switch (N.model) {
    case 'mono': { // PVS-14 (or 1PN138) in front of the right eye on a J-arm
      const x = .033;
      if (N.id === 'n_1pn138') { A(gRBox(.05, .046, .08, .012), dark, x, ey, ez - .06, HD); A(gCyl(.024, .024, .03, 16), dark, x, ey, ez - .115, HD); A(gCyl(.022, .022, .002, 16), gls, x, ey, ez - .131, HD); A(gCyl(.018, .018, .02, 14), eye, x, ey, ez - .01, HD); }
      else { pod(x, .065, .021, 'p14'); A(gCylX(.012, .012, .03, 12), dark, x - .024, ey + .006, ez - .05, HD); A(gCylX(.013, .013, .006, 12), mat('#2c2c2c', .5), x - .04, ey + .006, ez - .05, HD); } // side battery cap
      add(ribbon('jarm', [[0, ey + .03, devZ], [x * .6, ey + .03, devZ - .02], [x, ey + .022, devZ - .03]], .02, .01, [0, 1, 0]), dark, 0, 0, 0, HD);
      break; }
    case 'pvs7': { // single objective, bi-ocular housing, twin eyepieces
      A(gRBox(.13, .06, .05, .018), dark, 0, ey + .004, ez - .03, HD);
      for (const sx of [-1, 1]) A(gCyl(.016, .016, .02, 14), eye, sx * .033, ey, ez - .002, HD);
      A(gCyl(.026, .026, .05, 18), dark, 0, ey + .008, ez - .078, HD); A(gCyl(.024, .024, .002, 18), gls, 0, ey + .008, ez - .104, HD);
      A(gCylX(.012, .012, .03, 12), dark, -.07, ey + .02, ez - .03, HD); A(gRBox(.012, .012, .004, .003), mat('#6a2020', .5), .042, ey + .02, ez - .056, HD); // battery, IR window
      break; }
    case 'bino': { // PVS-31 / ENVG-B: twin pods on a bridge
      for (const sx of [-1, 1]) pod(sx * .033, .045, .019, 'p31');
      A(gRBox(.046, .028, .05, .008), dark, 0, ey + .012, ez - .035, HD); A(gCylY(.008, .008, .01, 10), mat('#2c2c2c', .5), 0, ey + .03, ez - .03, HD);
      if (N.nv && N.nv.thermal) { A(gRBox(.04, .03, .05, .008), dark, 0, ey + .04, ez - .045, HD); A(gCyl(.012, .012, .01, 14), glass('#3a3a40', .1), 0, ey + .04, ez - .074, HD); }
      break; }
    case 'quad': { // GPNVG-18: two forward tubes, two outboard tubes angled out, big housing
      A(gRBox(.13, .05, .05, .014), dark, 0, ey + .004, ez - .03, HD);
      for (const sx of [-1, 1]) { A(gCyl(.016, .016, .02, 14), eye, sx * .033, ey, ez - .002, HD);
        const gi = grp(sx * .022, ey, ez - .055); HD.add(gi); A(gCyl(.017, .017, .045, 16), dark, 0, 0, -.02, gi); A(gCyl(.016, .016, .002, 16), gls, 0, 0, -.043, gi); flatten(gi, HD);
        const go = grp(sx * .064, ey, ez - .05, -sx * .5); HD.add(go); A(gCyl(.015, .015, .04, 16), dark, 0, 0, -.018, go); A(gCyl(.014, .014, .002, 16), gls, 0, 0, -.039, go); flatten(go, HD); }
      break; }
  }
  // rear battery pack / counterweight and the power cable over the helmet
  if (s) { const p = onShell(s, PI, s.e(PI) + .04, .016); A(gRBox(.07, .045, .028, .01), dark, p[0], p[1], p[2], HD);
    if (N.model === 'bino' || N.model === 'quad') add(cable('nvc' + H.model, [[.03, p[1] + .01, p[2] - .01], onShell(s, 2.3, .09, .01).map((v, i) => i === 0 ? .06 : v), onShell(s, .6, .1, .01).map((v, i) => i === 0 ? .06 : v), [.03, top[1], top[2] - .01]], .003), mat('#101010', .6), 0, 0, 0, HD); }
}

// ================================================================= HEADSETS
function comms(HD, C, H, s) {
  if (!C.model) return;
  const cupM = mat(C.col || '#3a3d32', .6), pad = mat('#141414', .8), blk = mat('#161616', .6);
  const hasRails = s && railsOn[H.model];
  for (const sx of [-1, 1]) {
    if (C.model === 'prr' && sx < 0) continue; // PRR: single earpiece on the right
    const w = C.model === 'sordin' ? .026 : C.model === 'liberator' ? .03 : .036, hgt = C.model === 'sordin' ? .075 : C.model === 'liberator' ? .066 : .084;
    const g = grp(sx * (.1 + w / 2), .01, .004, 0, 0, 0); HD.add(g);
    const cup = A(gCylX(.036, .036, w, 22), cupM, 0, 0, 0, g); cup.scale.set(1, hgt / .072, .9);
    A(gCylX(.036, .036, .01, 22), pad, -sx * (w / 2), 0, 0, g).scale.set(1, hgt / .072 * .95, .88);
    if (C.model === 'comtac') { A(gRBox(.006, .026, .016, .004), blk, sx * w / 2, .02, .012, g); A(gCylX(.006, .006, .01, 8), blk, sx * (w / 2 + .004), -.015, .014, g); }
    flatten(g, HD);
    if (hasRails) { const p = onShell(s, sx * 1.6, s.e(1.6) + .012, .008); add(ribbon('crail' + sx + H.model, [[sx * (.1 + w / 2), .01 + hgt / 2 - .01, .004], [sx * (.12 + w / 2), (p[1] + .01 + hgt / 2) / 2, p[2] * .5], [p[0] + sx * .006, p[1], p[2]]], .014, .006, [0, 0, 1]), blk, 0, 0, 0, HD); }
  }
  if (!hasRails) { // headband over the head (no helmet) or neckband behind the neck (under a helmet)
    if (!s) add(ribbon('chb' + C.model, [[-.13, .04, .004], [-.09, .13, .004], [0, .158, .004], [.09, .13, .004], [.13, .04, .004]], .03, .006, [0, 0, 1]), blk, 0, 0, 0, HD);
    else add(ribbon('cnb' + C.model, [[-.125, -.02, .02], [-.08, -.08, .09], [0, -.1, .1], [.08, -.08, .09], [.125, -.02, .02]], .012, .006, [0, 1, 0]), blk, 0, 0, 0, HD);
  }
  if (C.boom) { const sx = C.model === 'prr' ? 1 : -1; // boom microphone to the mouth
    add(cable('boom' + C.model, [[sx * .13, -.01, -.02], [sx * .118, -.04, -.07], [sx * .07, -.058, -.11], [sx * .026, -.058, -.118]], .0028), blk, 0, 0, 0, HD);
    A(gSph(.011, 10), mat('#101010', .95), sx * .022, -.058, -.12, HD).scale.set(1.3, 1, 1); }
}

// ================================================================= BODY: torso fitting
const CH = [[-.08, .172], [0, .19], [.08, .2], [.13, .196], [.18, .165], [.205, .1]], AB = [[-.36, .156], [-.31, .156], [-.21, .148], [-.12, .152], [-.02, .172]];
const lin = (T, y) => { if (y <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (y <= T[i][0]) { const [a, p] = T[i - 1], [b, q] = T[i]; return p + (q - p) * (y - a) / (b - a); } return T[T.length - 1][1]; };
// torso half-width / half-depth at chest-frame height y
function torso(y) { let a = 0, b = 0; if (y >= -.08) { const r = lin(CH, y); a = r * 1.07; b = r * .64; } if (y <= -.02) { const r = lin(AB, y); a = Math.max(a, r); b = Math.max(b, r * .68); } return [a, b]; }
const ell = (a, b, t) => 1 / Math.sqrt((Math.sin(t) / a) ** 2 + (Math.cos(t) / b) ** 2);
const angA = t => { t = Math.abs(t) % TAU; return t > PI ? TAU - t : t; };
// body-conforming band: heights by angle, gap off the body, thickness
function band(key, t0, t1, top, bot, gap, th, n = 40, extra) {
  const T = curve(top), B = curve(bot);
  return sweep(key, { n, t0, t1, su: 2 }, t => { const a = angA(t), y1 = T(a), y0 = B(a), o = [], i = [];
    for (let v = 0; v <= 6; v++) { const y = y1 + (y0 - y1) * v / 6, [ea, eb] = torso(Math.min(.17, y)), g = gap + (extra ? extra(a, y) : 0), r = ell(ea + g, eb + g, t); o.push([r + th, y]); i.push([r, y]); }
    return loop(o, [o[6], i[6]], i.reverse(), [o[0]]); });
}

// ================================================================= POUCHES (back face at z = 0, front toward -z)
function pouch(kind, parent, x, y, z, m, yaw = 0) {
  const g = grp(x, y, z, yaw); parent.add(g); const dark = M.dark, pm = mat('#1c1c1a', .55);
  switch (kind) {
    case 'mag': A(gRBox(.078, .112, .036, .01), m, 0, 0, -.018, g); A(gRBox(.07, .036, .024, .008), pm, 0, .07, -.018, g, 0, 0, 0); A(gRBox(.066, .004, .03, .002), dark, 0, .04, -.018, g); add(ribbon('ptab', [[-.012, .088, -.018], [0, .1, -.018], [.012, .088, -.018]], .006, .003, [0, 0, 1]), dark, 0, 0, 0, g); break; // open-top M4 pouch, PMAG + bungee pull tab
    case 'magflap': A(gRBox(.078, .122, .042, .01), m, 0, 0, -.021, g); A(gRBox(.082, .034, .046, .01), m, 0, .052, -.024, g); A(gRBox(.026, .05, .004, .003), m, 0, .026, -.046, g); break; // flapped mag pouch
    case 'ak': A(gRBox(.098, .15, .05, .012), m, 0, 0, -.025, g); A(gRBox(.102, .04, .054, .012), m, 0, .064, -.028, g); A(gRBox(.03, .02, .004, .003), dark, 0, .05, -.056, g); break; // AK double pouch
    case 'pmag': A(gRBox(.036, .085, .026, .008), m, 0, 0, -.013, g); A(gRBox(.03, .024, .016, .005), pm, 0, .05, -.013, g); break;
    case 'frag': A(gRBox(.07, .075, .06, .02), m, 0, 0, -.03, g); A(gRBox(.072, .03, .064, .01), m, 0, .03, -.032, g); break;
    case 'smoke': A(gRBox(.068, .09, .06, .014), m, 0, 0, -.03, g); A(gCylY(.028, .028, .03, 14), mat('#556048', .6, .3), 0, .055, -.03, g); A(gRBox(.01, .03, .004, .002), M.metal, .02, .055, -.058, g); break;
    case 'ifak': A(gRBox(.13, .1, .06, .02), m, 0, 0, -.03, g); A(gRBox(.04, .03, .008, .004), mat('#b02020', .7), 0, .055, -.05, g); A(gRBox(.004, .086, .004, .002), dark, 0, 0, -.061, g); break;
    case 'tq': A(gRBox(.03, .09, .03, .01), mat('#161616', .8), 0, 0, -.015, g); A(gRBox(.03, .012, .03, .004), mat('#b01818', .6), 0, -.045, -.015, g); break;
    case 'radio': A(gRBox(.074, .16, .05, .014), m, 0, 0, -.025, g); A(gRBox(.064, .05, .04, .01), mat('#1e1e1c', .6), 0, .1, -.025, g); A(gCylY(.004, .003, .28, 6), mat('#101010', .7), .02, .26, -.025, g); A(gCylY(.008, .008, .014, 10), mat('#2c2c2c', .5), -.016, .13, -.025, g); break;
    case 'admin': A(gRBox(.16, .1, .026, .012), m, 0, 0, -.013, g); A(gRBox(.08, .05, .003, .004), fab('#3c3c34'), -.02, .012, -.027, g); A(gRBox(.05, .03, .003, .002), flagMat(), .045, .02, -.028, g); break;
    case 'gp': A(gRBox(.12, .12, .07, .025), m, 0, 0, -.035, g); A(gBox(.1, .004, .004), dark, 0, .058, -.06, g); break;
    case 'canteen': A(gRBox(.1, .15, .07, .03), m, 0, 0, -.035, g); A(gRBox(.104, .04, .074, .014), m, 0, .064, -.037, g); break;
    case 'dump': A(gRBox(.14, .1, .05, .025), m, 0, 0, -.025, g); break;
    case 'holster': A(gRBox(.034, .13, .05, .01), mat('#161616', .5, .1), 0, -.05, -.025, g); A(gRBox(.028, .055, .032, .008), mat('#1e1e1e', .5, .2), 0, .045, -.03, g, .3); A(gRBox(.04, .02, .05, .006), mat('#161616', .5, .1), 0, .02, -.025, g); break; // Kydex + pistol grip
    case 'kanga': A(gRBox(.26, .11, .03, .014), m, 0, 0, -.015, g); break;
    case 'grenade3': for (let i = -1; i <= 1; i++) { A(gRBox(.05, .12, .04, .012), m, i * .055, 0, -.02, g); A(gRBox(.052, .03, .044, .008), m, i * .055, .05, -.022, g); } break;
    case 'clip': A(gRBox(.05, .07, .035, .01), m, 0, 0, -.018, g); A(gRBox(.052, .02, .038, .006), m, 0, .035, -.02, g); A(gSph(.005, 6), M.brass, 0, .03, -.04, g); break;
  }
  flatten(g, parent);
}
let _flag; function flagMat() { if (_flag) return _flag; const c = document.createElement('canvas'); c.width = 30; c.height = 18; const x = c.getContext('2d'); x.fillStyle = '#4a4a3e'; x.fillRect(0, 0, 30, 18); x.fillStyle = '#26261e'; for (let i = 0; i < 7; i++) x.fillRect(12, i * 2.6, 18, 1.3); x.fillRect(0, 0, 12, 9); x.fillStyle = '#6a6a5a'; for (let i = 0; i < 6; i++) x.fillRect(1 + (i % 3) * 4, 1 + Math.floor(i / 3) * 4, 1.5, 1.5);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return (_flag = G.mat({ map: t, roughness: .9 })); }

// row of pouches across a front panel (z0 front surface, bend b) — kinds listed left (wearer's right? no: -x is the wearer's left) to right
function row(parent, kinds, y, z0, b, m, sp = .085) {
  const n = kinds.length; kinds.forEach((k, i) => { const x = (i - (n - 1) / 2) * sp; pouch(k, parent, x, y, z0 + b * x * x, m, -Math.atan(2 * b * x)); });
}
function molle(parent, key, w, rows, y0, z0, b, m) { for (let r = 0; r < rows; r++) add(slab('ml' + key + w + b, rrect(w, .014, .003), .004, b, 0, 0, 0), m, 0, y0 - r * .025, z0 - .003, parent); }

// ================================================================= BODY ARMOUR SPECS
// base: carrier | vest | steel | rig | ww | belt; see builder for the options
const AS = {
  a_none: { base: 'belt' },
  a_m1928: { base: 'ww', style: 'us' }, a_y_straps: { base: 'ww', style: 'de' },
  a_type56: { base: 'rig', style: 'type56' }, a_ephod: { base: 'rig', style: 'ephod' },
  a_sappenpanzer: { base: 'steel', style: 'sappen' }, a_brewster: { base: 'steel', style: 'brewster' }, a_sn42: { base: 'steel', style: 'sn42' }, a_psy_scrap: { base: 'steel', style: 'scrap' },
  a_m1flak: { base: 'vest', quilt: true, apron: true, front: 'flak', belt: 'ww' },
  a_m69: { base: 'vest', ribs: true, collar: 'low', pockets: true, front: 'zip', belt: 'alice' },
  a_pasgt: { base: 'vest', collar: 'high', pockets: true, front: 'velcro', laces: true, belt: 'alice' },
  a_6b3: { base: 'vest', front: 'zip', load: ['ak', 'ak', 'ak', 'ak'], loadY: -.06, pads: true, belt: 'soviet', bulk: .012 },
  a_6b23: { base: 'vest', collar: 'high', front: 'zip', load: ['ak', 'ak', 'frag', 'ak'], loadY: -.07, belt: 'soviet' },
  a_otv: { base: 'vest', collar: 'otv', groin: true, molle: 6, front: 'overlap', load: ['magflap', 'magflap', 'magflap'], loadY: -.07, side: ['frag', 'ifak'], belt: 'war' },
  a_iotv: { base: 'vest', collar: 'iotv', groin: true, lbp: true, delt: true, molle: 6, qr: true, sides: true, load: ['magflap', 'magflap', 'ifak'], loadY: -.07, admin: true, side: ['frag', 'smoke'], belt: 'war' },
  a_osprey: { base: 'vest', collar: 'low', ext: true, molle: 5, load: ['magflap', 'magflap', 'magflap'], loadY: -.1, side: ['ifak', 'frag'], belt: 'war' },
  a_felin: { base: 'vest', collar: 'high', delt: true, molle: 5, load: ['magflap', 'magflap', 'grenade3'], loadY: -.07, back: 'felin', belt: 'war' },
  a_6b43: { base: 'vest', collar: 'heavy', throat: true, groin: true, delt: true, sides: true, molle: 5, load: ['ak', 'ak', 'ak', 'frag'], loadY: -.07, belt: 'war', bulk: .012 },
  a_idz: { base: 'vest', collar: 'high', molle: 5, load: ['magflap', 'magflap', 'magflap', 'frag'], loadY: -.07, admin: true, belt: 'war' },
  a_6b45: { base: 'vest', collar: 'high', groin: true, sides: true, molle: 5, load: ['ak', 'ak', 'ak'], loadY: -.07, side: ['frag', 'radio'], belt: 'war' },
  a_type19: { base: 'vest', collar: 'high', molle: 5, load: ['ak', 'ak', 'ak', 'ak'], loadY: -.07, admin: true, side: ['radio', 'frag'], belt: 'war' },
  a_msv: { base: 'carrier', panel: [.27, .33], cum: 'full', shoulders: 'pad', collar: 'low', groin: true, sides: true, qr: true, molle: 6, load: ['magflap', 'magflap', 'magflap'], admin: true, side: ['ifak', 'frag'], back: 'molle', belt: 'war' },
  a_6094: { base: 'carrier', panel: [.28, .34], cum: 'full', shoulders: 'pad', molle: 6, load: ['mag', 'mag', 'mag'], admin: true, side: ['radio', 'frag'], back: 'molle', handle: true, belt: 'war' },
  a_spc: { base: 'carrier', panel: [.28, .33], cum: 'full', shoulders: 'pad', sides: true, molle: 5, load: ['magflap', 'magflap', 'magflap'], admin: true, side: ['ifak'], back: 'molle', handle: true, belt: 'war' },
  a_cpc: { base: 'carrier', panel: [.26, .32], cum: 'cage', shoulders: 'thin', kanga: true, load: ['mag', 'mag', 'mag'], admin: true, side: ['radio', 'tq'], back: 'zip', handle: true, belt: 'war' },
  a_jpc: { base: 'carrier', panel: [.25, .31], cum: 'elastic', shoulders: 'thin', kanga: true, load: ['mag', 'mag', 'mag'], back: 'zip', handle: true, belt: 'war' },
  a_avs: { base: 'carrier', panel: [.27, .33], cum: 'full', shoulders: 'pad', sides: true, placard: true, load: ['mag', 'mag', 'mag', 'radio'], side: ['ifak', 'frag'], back: 'molle', handle: true, belt: 'war' },
  a_virtus: { base: 'carrier', panel: [.27, .33], cum: 'full', shoulders: 'pad', sides: true, molle: 5, load: ['magflap', 'magflap', 'magflap'], side: ['ifak', 'frag'], back: 'virtus', belt: 'war' },
  a_psy_black: { base: 'carrier', panel: [.28, .34], cum: 'full', shoulders: 'hard', collar: 'low', groin: true, sides: true, molle: 4, load: ['mag', 'mag', 'mag'], back: 'molle', iff: true, belt: 'war' },
};

// returns the back surface z (for packs)
function armour(S, kit, AR, P) {
  const spec = AS[AR.id] || { base: AR.model === 'pc' || AR.model === 'pcslick' ? 'carrier' : AR.model === 'iotv' || AR.model === 'vest' || AR.model === 'flak' ? 'vest' : AR.model === 'steel' ? 'steel' : AR.model === 'rig' ? 'rig' : 'belt' };
  const C = S.chest, SP = S.spine, HP = S.hips, g = M.gear, dark = M.dark;
  const plates = AR.plates && P.rating > 0;
  let backZ = .14;
  if (spec.base === 'carrier') {
    const [w, h] = spec.panel, th = plates ? .036 : .018, zf = -(.128 + th / 2 + .004), b = .9, yc = .015;
    const pnl = slab('pnl' + w + h + th, sapi(w, h), th, b, .005, -.25);
    add(pnl, g, 0, yc, zf, C).rotation.x = .07;
    const bp = add(pnl, g, 0, yc + .01, -zf + .004, C); bp.rotation.set(-.05, PI, 0);
    backZ = -zf + th / 2 + .01;
    // shoulder straps
    const sw = spec.shoulders === 'thin' ? .035 : .06, st = spec.shoulders === 'thin' ? .006 : .016;
    for (const sx of [-1, 1]) add(ribbon('shs' + sw + sx, [[sx * .085, yc + h / 2 - .02, zf - .002], [sx * .1, .215, -.07], [sx * .1, .235, 0], [sx * .1, .215, .07], [sx * .085, yc + h / 2 - .01, -zf + .006]], sw, st, [1, 0, 0]), spec.shoulders === 'hard' ? mat('#2a2d32', .5, .4) : g, 0, 0, 0, C);
    if (spec.shoulders === 'hard') for (const sx of [-1, 1]) A(gRBox(.13, .07, .15, .03), mat('#2a2d32', .5, .4), sx * .2, .16, 0, C, 0, 0, sx * .45);
    // cummerbund
    const cy0 = -.17, cy1 = -.03;
    if (spec.cum === 'full') add(band('cumF', w / 2 / .19 * .9, TAU - w / 2 / .19 * .9, [[0, cy1]], [[0, cy0]], .012, .012, 36), g, 0, 0, 0, C);
    else if (spec.cum === 'cage') { for (const [a, b2] of [[cy1, cy1 - .035], [cy0 + .035, cy0]]) add(band('cumC' + a, .72, TAU - .72, [[0, a]], [[0, b2]], .012, .006, 36), g, 0, 0, 0, C); for (let i = 0; i < 10; i++) { const t = .8 + i / 9 * (TAU - 1.6), [ea, eb] = torso(-.1), r = ell(ea + .015, eb + .015, t); A(gBox(.012, .07, .006), g, Math.sin(t) * r, -.1, -Math.cos(t) * r, C, 0, -t); } }
    else if (spec.cum === 'elastic') for (const a of [-.055, -.13]) add(band('cumE' + a, .7, TAU - .7, [[0, a + .014]], [[0, a - .014]], .01, .004, 36), dark, 0, 0, 0, C);
    if (spec.sides && plates) for (const sx of [-1, 1]) { const [ea] = torso(-.1); A(slab('sidep', rrect(.13, .15, .02), .026, 1.4, .004), g, sx * (ea + .03), -.095, 0, C, 0, sx * PI / 2); }
    // front load
    if (spec.kanga) { pouch('kanga', C, 0, -.1, zf - th / 2, g); row(C, spec.load, -.035, zf - th / 2 - .03, b, g); }
    else if (spec.placard) { add(slab('plac', rrect(.28, .12, .02), .018, b, .004), g, 0, -.1, zf - th / 2 - .012, C); row(C, spec.load.slice(0, 3), -.06, zf - th / 2 - .02, b, g); pouch('radio', C, .19, -.02, -.12, g, -.9); }
    else { if (spec.molle) molle(C, 'f' + w, w - .04, spec.molle, yc + .08, zf - th / 2, b, g); row(C, spec.load, -.07, zf - th / 2 - .006, b, g); }
    if (spec.admin) pouch('admin', C, 0, .075, zf - th / 2 - .006, g);
    if (spec.qr) { add(ribbon('qrh', [[-.03, .14, zf - .02], [0, .16, zf - .03], [.03, .14, zf - .02]], .012, .008, [0, 0, 1]), mat('#8a1a1a', .6), 0, 0, 0, C); }
    if (spec.handle) add(ribbon('drag', [[-.035, .14, backZ - .004], [0, .17, backZ + .008], [.035, .14, backZ - .004]], .025, .01, [0, 0, 1]), dark, 0, 0, 0, C);
    if (spec.iff) A(gRBox(.12, .03, .01, .005), cache('iffm', () => G.mat({ color: '#30d0ff', emissive: '#10a0ff', emissiveIntensity: 1.5 })), 0, .12, zf - th / 2 - .008, C);
    backLoad(C, spec, backZ, g, w);
    sideLoad(C, spec, g);
    collar(C, spec, g);
    if (spec.groin) groin(HP, g);
  } else if (spec.base === 'vest') {
    const bulk = spec.bulk || 0, gap = .012 + bulk, th = .022 + (plates ? .012 : 0);
    const top = [[0, .165], [.7, .15], [1.15, .07], [1.57, .045], [2.0, .07], [2.45, .16], [PI, .175]], bot = [[0, spec.apron ? -.3 : -.26], [PI, -.25]];
    add(band('vst' + AR.id, 0, TAU, top, bot, gap, th, 48, (a, y) => plates && (a < .75 || a > 2.4) && y > -.2 && y < .17 ? .012 : 0), g, 0, 0, 0, C);
    for (const sx of [-1, 1]) add(ribbon('vsh' + sx + AR.id, [[sx * .1, .155, -.15 - bulk], [sx * .11, .215, -.075], [sx * .11, .235, 0], [sx * .11, .215, .075], [sx * .1, .16, .15 + bulk]], .095, .024, [1, 0, 0]), g, 0, 0, 0, C);
    const [fa, fb] = torso(0), zf = -(fb + gap + th + (plates ? .012 : 0));
    backZ = torso(0)[1] + gap + th + .012;
    if (spec.front === 'zip') add(gBox(.008, .36, .006), dark, .01, -.05, zf - .001, C);
    if (spec.front === 'velcro' || spec.front === 'overlap') { add(gBox(.012, .38, .008), g, .045, -.05, zf - .004, C); }
    if (spec.front === 'flak') { A(gRBox(.05, .03, .01, .004), mat('#9a2020', .7), .06, -.05, zf - .004, C); }
    if (spec.quilt) for (let i = -2; i <= 2; i++) for (let r = 0; r < 4; r++) A(gBox(.004, .08, .004), dark, i * .06, .1 - r * .1, zf - .001 + Math.abs(i) * .012, C, 0, -i * .2);
    if (spec.ribs) for (let r = 0; r < 7; r++) add(band('rib' + r, 0, TAU, [[0, .12 - r * .055 + .004], [1.57, Math.min(.03, .12 - r * .055 + .004)], [PI, .12 - r * .055 + .004]], [[0, .12 - r * .055 - .004], [1.57, Math.min(.022, .12 - r * .055 - .004)], [PI, .12 - r * .055 - .004]], gap + th, .004, 40), g, 0, 0, 0, C);
    if (spec.pockets) for (const sx of [-1, 1]) { A(gRBox(.1, .09, .026, .01), g, sx * .1, -.17, zf + .01, C, 0, -sx * .25); A(gRBox(.104, .03, .03, .008), g, sx * .1, -.13, zf + .008, C, 0, -sx * .25); }
    if (spec.laces) for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const [ea] = torso(-.1); A(gBox(.004, .006, .03), dark, sx * (ea + gap + th), -.02 - i * .045, 0, C); }
    if (spec.ext) { const pp = slab('ospp', rrect(.27, .3, .03), .04, .8, .006); add(pp, g, 0, .0, zf - .02, C).rotation.x = .05; const bpp = add(pp, g, 0, .0, backZ + .02, C); bpp.rotation.y = PI; backZ += .04; }
    const lz = zf - (spec.ext ? .04 : 0);
    if (spec.molle) molle(C, 'v' + AR.id, .28, spec.molle, .1, lz, 1.2, g);
    if (spec.load) row(C, spec.load, spec.loadY || -.07, lz - .004, 1.2, g, spec.load.length > 3 ? .08 : .092);
    if (spec.admin) pouch('admin', C, 0, .08, lz - .004, g);
    if (spec.qr) add(ribbon('qrh', [[-.03, .15, zf - .012], [0, .17, zf - .024], [.03, .15, zf - .012]], .012, .008, [0, 0, 1]), mat('#8a1a1a', .6), 0, 0, 0, C);
    if (spec.pads) for (const sx of [-1, 1]) A(gRBox(.1, .04, .14, .02), g, sx * .19, .15, 0, C, 0, 0, sx * .5);
    if (spec.apron) A(slab('apron', rrect(.26, .16, .03), .02, 1.1, .004), g, 0, -.37, -.14, C, -.08);
    sideLoad(C, spec, g); collar(C, spec, g); backLoad(C, spec, backZ, g, .28);
    if (spec.groin) groin(HP, g);
  } else if (spec.base === 'steel') steel(S, spec, AR);
  else if (spec.base === 'rig') rig(S, spec);
  else if (spec.base === 'ww') { wwWebbing(S, spec); return .14; }
  if (spec.lbp) A(slab('lbp', rrect(.24, .1, .02), .016, 1.1, .004), g, 0, -.1, torso(-.3)[1] + .03, SP, .05, PI);
  if (spec.delt) for (const sx of [-1, 1]) { const d = add(sweep('delt', { n: 12, t0: -1.1, t1: 1.1, k: 1, su: 1 }, t => loop([[.075, .03], [.078, -.04], [.07, -.1]], [[.07, -.1], [.06, -.1]], [[.06, -.1], [.066, -.04], [.064, .03], [.075, .03]])), g, sx * .2, .15, 0, C); d.rotation.y = sx * PI / 2; d.rotation.z = sx * .15; }
  belt(S, spec.belt || (spec.base === 'belt' ? 'plain' : spec.base === 'rig' ? 'plain' : 'war'));
  return backZ;
}
function collar(C, spec, g) {
  if (!spec.collar) return;
  const h = spec.collar === 'heavy' ? .1 : spec.collar === 'high' || spec.collar === 'iotv' || spec.collar === 'otv' ? .075 : .045, open = spec.collar === 'low' ? .7 : .45;
  add(sweep('col' + spec.collar, { n: 30, t0: open, t1: TAU - open, su: 2 }, t => { const a = angA(t), hh = h * (.7 + .3 * a / PI); return loop([[.112, .18], [.106, .18 + hh], [.1, .18 + hh]], [[.1, .18 + hh], [.086, .18 + hh]], [[.086, .18 + hh], [.094, .18], [.112, .18]]); }), g, 0, 0, .004, C);
  if (spec.collar === 'iotv' || spec.collar === 'otv' || spec.throat) A(slab('throat', rrect(.11, .075, .025), .02, 2, .004), g, 0, .205, -.105, C, -.35);
}
function groin(HP, g) { A(slab('groin', sapi(.16, .17, .03).map(([x, y]) => [x, -y]), .018, 1.4, .004), g, 0, -.05, -.13, HP, -.12); }
function sideLoad(C, spec, g) { (spec.side || []).forEach((k, i) => { const sx = i ? 1 : -1, t = sx * 1.25, [ea, eb] = torso(-.08), r = ell(ea + .03, eb + .03, t); pouch(k, C, Math.sin(t) * r, -.1, -Math.cos(t) * r, g, -t); }); }
function backLoad(C, spec, z, g, w) {
  switch (spec.back) {
    case 'molle': for (let r = 0; r < 5; r++) A(slab('mlb' + w, rrect(w - .04, .014, .003), .004, .9, 0, 0, 0), g, 0, .1 - r * .025, z + .003, C, 0, PI); break;
    case 'zip': for (const sx of [-1, 1]) A(gBox(.006, .26, .004), M.dark, sx * .1, .01, z + .002, C); break;
    case 'felin': A(gRBox(.16, .1, .04, .012), mat('#2a2c26', .6), 0, .02, z + .02, C); for (const sx of [-1, 1]) add(cable('felc' + sx, [[sx * .06, .06, z + .03], [sx * .1, .19, .1], [sx * .11, .24, 0], [sx * .1, .18, -.12]], .005), M.dark, 0, 0, 0, C); break;
    case 'virtus': A(gRBox(.05, .24, .03, .012), mat('#26261e', .7), 0, -.2, z + .01, C); break;
  }
}
function belt(S, type) {
  const HP = S.hips, g = M.gear, dark = M.dark, bg = (key, h, th, m, y = .065, gap = .006) => add(sweep(key, { n: 40, su: 3 }, t => { const r = ell(.158 + gap, .112 + gap, t); return loop([[r + th, y + h / 2], [r + th, y - h / 2]], [[r + th, y - h / 2], [r, y - h / 2]], [[r, y - h / 2], [r, y + h / 2], [r + th, y + h / 2]]); }), m, 0, 0, 0, HP);
  const at = (t, off = .02) => { const r = ell(.158 + off, .112 + off, t); return [Math.sin(t) * r, -Math.cos(t) * r]; };
  if (type === 'plain') { bg('bpl', .036, .004, mat('#2a2018', .6)); A(gRBox(.05, .038, .01, .004), M.metal, 0, .065, -.122, HP); return; }
  if (type === 'soviet') { bg('bsov', .04, .005, mat('#5a4028', .6)); A(gRBox(.06, .045, .008, .004), M.brass, 0, .065, -.123, HP); return; }
  if (type === 'alice') { // LC-2 pistol belt, M16 ammo pouches, canteens, suspenders
    bg('bal', .056, .006, fab('#4b5638')); A(gRBox(.06, .05, .014, .006), mat('#5a5a4a', .5, .5), 0, .065, -.126, HP);
    for (const sx of [-1, 1]) { const [x, z] = at(sx * .6); pouch('magflap', HP, x, .03, z, fab('#4b5638'), -sx * .6); const [x2, z2] = at(sx * 2.3, .02); pouch('canteen', HP, x2, .0, z2, fab('#4b5638'), -sx * 2.3 + PI - PI); }
    for (const sx of [-1, 1]) add(ribbon('alsus' + sx, [[sx * .07, .3, -.12], [sx * .1, .5, -.14], [sx * .11, .6, -.02], [sx * .08, .5, .15], [sx * .05, .3, .13]], .03, .004, [1, 0, 0]), fab('#4b5638'), 0, 0, 0, HP);
    return; }
  // modern padded war belt: holster, pistol mags, IFAK, dump pouch, tourniquet
  bg('bwar', .052, .012, g, .065, .008); bg('bwari', .036, .004, dark, .065, .02);
  A(gRBox(.05, .04, .016, .006), mat('#26262a', .5, .6), 0, .065, -.138, HP);
  const [hx, hz] = at(1.75, .012); pouch('holster', HP, hx, .0, hz, g, -1.75);
  for (const i of [0, 1]) { const [x, z] = at(-.55 - i * .26, .03); pouch('pmag', HP, x, .05, z, g, .55 + i * .26); }
  { const [x, z] = at(-2.3, .03); pouch('ifak', HP, x, .03, z, g, 2.3); }
  { const [x, z] = at(2.5, .03); pouch('dump', HP, x, .02, z, g, -2.5); }
  { const [x, z] = at(-1.4, .03); pouch('tq', HP, x, .06, z, g, 1.4); }
}
function steel(S, spec, AR) {
  const C = S.chest, SP = S.spine, m = mat(spec.style === 'scrap' ? '#6a3a22' : AR.col || '#55594c', .55, .45), strap = M.leather;
  switch (spec.style) {
    case 'sappen': { // breastplate with shoulder hooks plus three overlapping lower plates
      const bp = slab('sapB', [[-.15, -.07], [.15, -.07], [.155, .06], [.12, .1], [.06, .115], [.035, .09], [-.035, .09], [-.06, .115], [-.12, .1], [-.155, .06]], .012, 1.3, .003, -.3, 0);
      add(bp, m, 0, .09, -.16, C).rotation.x = .1;
      for (let i = 0; i < 3; i++) { const w = .29 - i * .02; A(slab('sapL' + i, rrect(w, .1, .012), .012, 1.3, .003, 0, 0), m, 0, -.03 - i * .085, -.162 - i * .004 + (i === 2 ? .01 : 0), C, .08 + i * .02); for (const sx of [-1, 1]) add(gSph(.006, 6), M.metal, sx * (w / 2 - .02), -.005 - i * .085, -.172, C); }
      for (const sx of [-1, 1]) add(ribbon('saph' + sx, [[sx * .1, .19, -.15], [sx * .11, .235, -.05], [sx * .11, .23, .05], [sx * .1, .17, .13]], .05, .006, [1, 0, 0]), strap, 0, 0, 0, C);
      break; }
    case 'brewster': { // one-piece chrome-nickel cuirass with shoulder wings and a centre ridge
      const bp = slab('brew', [[-.14, -.24], [.14, -.24], [.17, -.05], [.2, .1], [.17, .16], [.07, .14], [0, .12], [-.07, .14], [-.17, .16], [-.2, .1], [-.17, -.05]], .014, 1.6, .004, -.3, 0);
      add(bp, m, 0, .02, -.17, C).rotation.x = .06; A(gRBox(.02, .3, .012, .006), m, 0, .0, -.185, C, .06);
      for (const sx of [-1, 1]) add(ribbon('brst' + sx, [[sx * .12, .15, -.15], [sx * .12, .23, -.04], [sx * .12, .22, .06], [sx * .1, .15, .13]], .04, .006, [1, 0, 0]), strap, 0, 0, 0, C);
      break; }
    case 'sn42': { // two pressed plates: chest (neck cut-out) and abdomen, canvas straps
      add(slab('sn42a', [[-.15, -.08], [.15, -.08], [.155, .06], [.13, .1], [.06, .11], [0, .08], [-.06, .11], [-.13, .1], [-.155, .06]], .01, 1.2, .004, -.4, 0), m, 0, .08, -.155, C).rotation.x = .08;
      add(slab('sn42b', [[-.13, -.09], [.13, -.09], [.14, .07], [-.14, .07]], .01, 1.2, .004, 0, 0), m, 0, -.1, -.16, C).rotation.x = -.05;
      for (const sx of [-1, 1]) add(ribbon('sn42s' + sx, [[sx * .09, .17, -.15], [sx * .1, .225, -.05], [sx * .1, .22, .06], [sx * .09, .15, .13]], .03, .004, [1, 0, 0]), fab('#5a5a42'), 0, 0, 0, C);
      add(band('sn42w', 0, TAU, [[0, -.1]], [[0, -.13]], .012, .004, 36), fab('#5a5a42'), 0, 0, 0, C);
      break; }
    case 'scrap': { // Rust Syndicate: riveted scrap plates, bandolier, spiked pauldron
      add(slab('scr1', rrect(.3, .24, .03), .02, 1.2, .004), m, 0, .05, -.155, C); add(slab('scr2', rrect(.28, .12, .02), .018, 1.2, .004), m, .01, -.13, -.15, C).rotation.z = .06;
      for (let i = 0; i < 6; i++) add(gSph(.008, 6), M.metal, (i % 3 - 1) * .11, .15 - Math.floor(i / 3) * .2, -.172, C);
      add(slab('scr3', rrect(.28, .3, .03), .02, 1.2, .004), m, 0, .0, .15, C).rotation.y = PI;
      const band = add(gBox(.05, .5, .03), M.leather, 0, .05, -.18, C); band.rotation.z = .6;
      for (let i = 0; i < 7; i++) A(gCyl(.009, .009, .045, 8), mat('#b02a1a', .5), -.12 + i * .04, -.08 + i * .045, -.195, C, 0, 0, .6);
      const pa = add(gSph(.09, 12), m, -.21, .16, 0, C); pa.scale.set(1, .6, 1);
      for (let i = 0; i < 3; i++) A(gCyl(.001, .012, .05, 6), M.metal, -.23, .21, -.04 + i * .04, C, 0, 0, .4);
      break; }
  }
  belt(S, 'plain');
}
function rig(S, spec) {
  const C = S.chest, g = M.gear, dark = M.dark;
  if (spec.style === 'type56') { // Chinese chest rig: three tall AK pouches, stripper-clip and grenade pouches, X-back
    const zf = -(torso(-.1)[1] + .012);
    add(slab('t56p', rrect(.36, .17, .02), .012, 1.4, .003), g, 0, -.1, zf, C);
    for (let i = -1; i <= 1; i++) { A(gRBox(.07, .18, .046, .012), g, i * .075, -.09, zf - .03 + Math.abs(i) * .008, C, 0, -i * .15); A(gRBox(.074, .04, .05, .012), g, i * .075, .005, zf - .032 + Math.abs(i) * .008, C, 0, -i * .15); A(gCylX(.006, .006, .012, 6), M.leather, i * .075, -.02, zf - .058 + Math.abs(i) * .008, C); }
    for (const sx of [-1, 1]) { pouch('clip', C, sx * .155, -.12, zf + .02, g, -sx * .5); }
    for (const sx of [-1, 1]) { add(ribbon('t56s' + sx, [[sx * .14, -.04, zf], [sx * .1, .19, -.1], [sx * .08, .23, 0], [0, .1, .145], [-sx * .12, -.06, .13]], .03, .004, [1, 0, 0]), g, 0, 0, 0, C); }
    add(band('t56w', .9, TAU - .9, [[0, -.1]], [[0, -.125]], .008, .004, 30), g, 0, 0, 0, C);
  } else { // IDF Ephod: vest-style harness with pouches all round the waist
    for (const sx of [-1, 1]) add(ribbon('eps' + sx, [[sx * .1, -.12, -.15], [sx * .11, .12, -.14], [sx * .11, .235, 0], [sx * .11, .12, .14], [sx * .1, -.12, .15]], .07, .01, [1, 0, 0]), g, 0, 0, 0, C);
    add(band('epw', 0, TAU, [[0, -.08]], [[0, -.22]], .012, .01, 40), g, 0, 0, 0, C);
    const [ea, eb] = torso(-.15);
    [['magflap', -.55], ['magflap', -.28], ['magflap', .28], ['magflap', .55], ['frag', -1.1], ['frag', 1.1], ['canteen', -2.3], ['canteen', 2.3]].forEach(([k, t]) => { const r = ell(ea + .022, eb + .022, t); pouch(k, C, Math.sin(t) * r, -.15, -Math.cos(t) * r, g, -t); });
  }
  belt(S, 'plain');
}
function wwWebbing(S, spec) {
  const C = S.chest, HP = S.hips, g = M.gear, dark = M.dark;
  const at = (t, off = .02) => { const r = ell(.158 + off, .112 + off, t); return [Math.sin(t) * r, -Math.cos(t) * r]; };
  if (spec.style === 'us') { // M1923 ten-pocket cartridge belt, M1936 suspenders, canteen, first-aid pouch
    const kh = fab('#8b8058');
    add(sweep('m23b', { n: 40, su: 3 }, t => { const r = ell(.166, .12, t); return loop([[r + .006, .09], [r + .006, .04]], [[r + .006, .04], [r, .04]], [[r, .04], [r, .09], [r + .006, .09]]); }), kh, 0, 0, 0, HP);
    for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) { const t = sx * (.35 + i * .3), [x, z] = at(t, .014); const g2 = grp(x, .062, z, -t); HP.add(g2); A(gRBox(.05, .06, .024, .008), kh, 0, 0, -.012, g2); A(gSph(.004, 6), M.brass, 0, .012, -.026, g2); flatten(g2, HP); }
    A(gRBox(.05, .045, .012, .004), mat('#7a7a6a', .5, .5), 0, .065, -.126, HP);
    { const [x, z] = at(2.2, .03); pouch('canteen', HP, x, .0, z, kh, -2.2); }
    for (const sx of [-1, 1]) add(ribbon('m36s' + sx, [[sx * .09, .08, -.12], [sx * .1, .35, -.15], [sx * .11, .6, -.02], [-sx * .02, .45, .15], [-sx * .07, .1, .13]], .03, .004, [1, 0, 0]), kh, 0, 0, 0, HP);
  } else { // German: black leather belt, Koppelschloss, 3-pocket pouches, Y-straps, bread bag, canteen, shovel, gas-mask can
    const lea = mat('#1a1614', .55);
    add(sweep('debelt', { n: 40, su: 3 }, t => { const r = ell(.164, .118, t); return loop([[r + .005, .082], [r + .005, .046]], [[r + .005, .046], [r, .046]], [[r, .046], [r, .082], [r + .005, .082]]); }), lea, 0, 0, 0, HP);
    A(gRBox(.05, .038, .008, .004), mat('#8a8a80', .4, .6), 0, .064, -.127, HP); A(gCyl(.013, .013, .003, 14), mat('#6a6a60', .4, .6), 0, .064, -.132, HP);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const t = sx * (.42 + i * .2), [x, z] = at(t, .016); const g2 = grp(x, .045, z, -t); HP.add(g2); A(gRBox(.042, .07, .034, .01), lea, 0, 0, -.017, g2); A(gRBox(.044, .024, .036, .006), lea, 0, .03, -.018, g2); flatten(g2, HP); }
    for (const sx of [-1, 1]) add(ribbon('ys' + sx, [[sx * .09, .1, -.12], [sx * .1, .36, -.15], [sx * .1, .58, -.04], [sx * .03, .52, .14]], .026, .004, [1, 0, 0]), lea, 0, 0, 0, HP);
    add(ribbon('ysb', [[0, .52, .15], [0, .3, .15], [0, .09, .13]], .026, .004, [1, 0, 0]), lea, 0, 0, 0, HP);
    { const [x, z] = at(2.0, .03); pouch('gp', HP, x, -.03, z, fab('#6a6650'), -2.0); A(gCylY(.035, .035, .1, 12), mat('#4a4e3e', .6), x + .02, -.02, z + .05, HP); }
    { const [x, z] = at(-2.1, .03); A(gRBox(.1, .17, .02, .03), mat('#3a3a32', .6, .3), x, -.05, z + .01, HP, 0, 2.1); }
    A(gCylY(.05, .05, .26, 16), mat('#5d6254', .6, .3), .02, .14, .19, HP, 0, .2, PI / 2 - .3); for (let i = 0; i < 5; i++) A(gCylY(.052, .052, .008, 16), mat('#4a4f42', .6, .3), -.08 + i * .045, .14 + (i - 2) * .045 * .3, .19 + (i - 2) * .01, HP, 0, .2, PI / 2 - .3);
  }
}

// ================================================================= PACKS
function pack(S, K, backZ) {
  if (!K.model) return;
  const C = S.chest, m = M.kitCol(K.col) || M.gear, dark = M.dark, z = backZ + .005;
  const straps = (w = .05, lo = -.12, key = '') => { for (const sx of [-1, 1]) add(ribbon('pks' + key + sx + backZ.toFixed(2), [[sx * .09, .16, z + .02], [sx * .105, .245, .02], [sx * .11, .22, -.1], [sx * .13, .08, -.16], [sx * .15, lo, -.1]], w, .012, [1, 0, 0]), m, 0, 0, 0, C); };
  const bag = (w, h, d, y, r = .04) => A(slab('pk' + w + h + d, rrect(w, h, r), d, -.8, .012), m, 0, y, z + d / 2 - .004, C);
  switch (K.model) {
    case 'haversack': {
      if (K.id === 'k_tornister') { // calfskin pack with hair-on flap, greatcoat roll in a horseshoe, mess tin
        bag(.3, .3, .1, .02); A(slab('tflap', rrect(.3, .2, .03), .012, -.8, .006), furMat(), 0, .07, z + .125, C);
        add(ribbon('troll', [[-.16, -.1, z + .06], [-.18, .12, z + .06], [0, .22, z + .07], [.18, .12, z + .06], [.16, -.1, z + .06]], .055, .055, [0, 0, 1]), mat('#5a5e52', .95), 0, 0, 0, C);
        A(gCyl(.06, .06, .05, 14), mat('#6a6a5a', .5, .5), 0, -.05, z + .2, C); straps(.035, -.1, 't');
      } else { // M1928 haversack: long narrow pack, flap, meat-can pouch, strap system
        bag(.22, .4, .08, -.02); A(slab('hvf', rrect(.22, .16, .02), .012, -.8, .004), m, 0, .12, z + .1, C); A(gRBox(.18, .14, .05, .02), m, 0, .02, z + .12, C); straps(.03, -.1, 'h');
      }
      break; }
    case 'assault': {
      if (K.id === 'k_rd54') { bag(.28, .32, .08, -.02); A(gRBox(.22, .14, .04, .02), m, 0, -.06, z + .11, C); A(gRBox(.26, .08, .09, .02), m, 0, .14, z + .06, C); straps(.035, -.12, 'r'); }
      else { // 3-day assault pack: zippered shell, MOLLE front, compression straps, grab handle
        bag(.3, .45, .17, .02); for (let r = 0; r < 5; r++) A(slab('pkml', rrect(.22, .014, .003), .004, -.8, 0, 0, 0), m, 0, .12 - r * .03, z + .2, C);
        A(gRBox(.22, .14, .04, .02), m, 0, -.1, z + .2, C); for (const sx of [-1, 1]) A(gBox(.02, .3, .006), dark, sx * .13, .02, z + .19, C, 0, sx * .5);
        A(gRBox(.08, .015, .02, .006), dark, 0, .25, z + .08, C); straps(.06, -.12, 'a');
      }
      break; }
    case 'alice': { // ALICE medium: main bag, three outer pockets, cinched top flap, frame, kidney pad
      bag(.32, .34, .2, -.02); for (const [x, w] of [[-.12, .09], [0, .11], [.12, .09]]) A(gRBox(w, .12, .06, .025), m, x, -.1, z + .25, C);
      A(slab('alflap', rrect(.33, .2, .03), .02, -.8, .006), m, 0, .09, z + .22, C).rotation.x = .2;
      for (const sx of [-1, 1]) A(gBox(.014, .5, .014), mat('#3a3a32', .5, .6), sx * .14, -.06, z + .01, C);
      A(gRBox(.3, .06, .03, .01), m, 0, -.3, z + .02, C); straps(.05, -.12, 'al');
      break; }
    case 'ruck': { // MOLLE II large ruck: frame, main bag, sustainment pouches, sleep system carrier, lid, hip belt
      bag(.36, .5, .26, .08); A(slab('rlid', rrect(.34, .12, .04), .06, -.8, .01), m, 0, .36, z + .15, C);
      for (const sx of [-1, 1]) A(gRBox(.08, .22, .1, .03), m, sx * .22, .04, z + .16, C);
      A(gRBox(.34, .14, .2, .06), m, 0, -.24, z + .14, C); A(gCylX(.05, .05, .34, 12), fab('#3a3a2e'), 0, -.33, z + .2, C);
      add(band('rhip', 1.0, TAU - 1.0, [[0, -.26]], [[0, -.33]], .04, .02, 30), m, 0, 0, 0, C); straps(.07, -.12, 'mo');
      break; }
    case 'radio': { // AN/PRC-117G in a pack, whip antenna, handset on the shoulder
      bag(.24, .3, .14, .0); A(gRBox(.19, .1, .06, .01), mat('#2c2e28', .6), 0, .12, z + .12, C);
      for (let i = 0; i < 3; i++) A(gCylY(.012, .012, .014, 10), mat('#1a1a1a', .5), -.06 + i * .04, .18, z + .12, C);
      A(gCylY(.004, .003, .8, 6), mat('#101010', .7), .07, .6, z + .1, C).rotation.z = -.12;
      A(gRBox(.03, .09, .03, .01), mat('#161616', .6), .12, .16, -.13, C, .4); add(cable('hscord', [[.07, .1, z + .1], [.14, .2, .1], [.13, .18, -.1]], .004), mat('#101010', .7), 0, 0, 0, C);
      straps(.05, -.12, 'ra');
      break; }
    case 'hydro': { // hydration carrier with the drinking tube over the right shoulder
      bag(.22, .34, .06, .02); A(cable('hydt', [[.07, .19, z + .04], [.1, .25, .04], [.11, .22, -.1], [.1, .1, -.17]], .006), mat('#161616', .7), 0, 0, 0, C);
      A(gCylY(.008, .008, .03, 8), mat('#2a2a2a', .6), .1, .09, -.175, C);
      straps(.04, -.08, 'hy');
      break; }
  }
}
let _fur; function furMat() { if (_fur) return _fur; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#6a4a30'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#e8e0d0'; x.beginPath(); x.ellipse(40, 26, 16, 12, .4, 0, PI * 2); x.fill(); x.beginPath(); x.ellipse(12, 50, 10, 8, 0, 0, PI * 2); x.fill();
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * .2})`; x.fillRect(Math.random() * 64, Math.random() * 64, 1, 3); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return (_fur = G.mat({ map: t, roughness: 1 })); }

// ================================================================= UNIFORM DETAILS
function uniformDetails(S, U) {
  const C = S.chest, HD = S.head;
  switch (U.id) {
    case 'u_civ_suit': { A(slab('lapel', [[-.02, -.12], [.02, -.12], [.07, .17], [.03, .19]], .006, 0, .002), M.tunic, .03, .0, -.132, C); A(slab('lapel2', [[.02, -.12], [-.02, -.12], [-.07, .17], [-.03, .19]], .006, 0, .002), M.tunic, -.03, .0, -.132, C);
      A(slab('shirt', [[-.03, -.1], [.03, -.1], [.045, .2], [-.045, .2]], .004, 0, .001), mat('#e8e8ea', .8), 0, 0, -.128, C); A(gBox(.022, .22, .005), mat('#6a1a22', .6), 0, .05, -.134, C); A(gRBox(.03, .02, .01, .004), mat('#6a1a22', .6), 0, .175, -.13, C); break; }
    case 'u_civ_hoodie': { const h = add(gSph(.1, 14), M.tunic, 0, .19, .1, C); h.scale.set(1.25, .55, .8); for (const sx of [-1, 1]) A(gCylY(.003, .003, .12, 5), mat('#e0e0e0', .8), sx * .03, .12, -.14, C); break; }
    case 'u_civ_crew': for (const y of [.02, -.12]) add(band('hivis' + y, 0, TAU, [[0, y + .012]], [[0, y - .012]], .002, .002, 40), mat('#d8dad0', .3, .4), 0, 0, 0, C); break;
    case 'u_civ_track': for (const sx of [-1, 1]) A(gBox(.006, .3, .004), mat('#e8e8e8', .8), sx * .06, .02, -.13, C); break;
    case 'u_ru_gorka': { const h = add(gSph(.1, 14), M.tunic, 0, .2, .1, C); h.scale.set(1.2, .5, .8); for (const sx of [-1, 1]) A(gRBox(.1, .06, .14, .03), mat('#5a4632', .9), sx * .19, .16, 0, C, 0, 0, sx * .5); break; }
  }
}

// ================================================================= BOOTS & GLOVES
const BOOT = {
  puttee: { shaft: .05, up: '#3a2616', sole: '#1e140e', lace: 1 }, jack: { tall: 1, up: '#1a1614', sole: '#100c0a' }, legging: { shaft: .04, up: '#3a2a1c', sole: '#1e140e', lace: 1 },
  b_kirza: { tall: 1, up: '#241c16', sole: '#141010', top: '#2a221a' }, b_jungle: { shaft: .11, up: '#161412', panel: '#3e4632', sole: '#121210', lace: 1, toe: '#101010' },
  b_combat: { shaft: .12, up: '#121212', sole: '#0c0c0c', lace: 1, toe: '#0a0a0a' }, b_desert: { shaft: .11, up: '#a08a64', sole: '#6a5a44', lace: 1, suede: 1 },
  b_salomon: { shaft: .06, up: '#7a6a4c', trim: '#3a3228', sole: '#1a1a1a', mid: '#5a5a58', lace: 1 },
};
G.kitBoot = function (knee, ankle, kit, MM, addFn) {
  add = addFn; M = MM; HM = HM || G.HM;
  const B = G.GEARID[kit.boots] || {}, spec = BOOT[B.id] || BOOT[B.model] || BOOT.b_combat;
  const up = spec.suede ? fab(spec.up, .95) : mat(spec.up, .55), sole = mat(spec.sole, .9);
  // boot upper: lofted from heel to toe (narrow heel, wide ball, rounded toe box), then the sole and heel block
  const foot = loft('bootU', [[.086, .03, -.05, -.082], [.082, .066, .0, -.082], [.07, .08, .025, -.082], [.04, .086, .032, -.082], [0, .09, .03, -.082], [-.04, .094, .012, -.082], [-.08, .1, -.01, -.082], [-.12, .104, -.026, -.082], [-.155, .1, -.033, -.082], [-.18, .088, -.038, -.08], [-.197, .066, -.046, -.078], [-.206, .03, -.056, -.074]]);
  add(foot, up, 0, 0, 0, ankle);
  add(loft('bootS', [[.09, .06, -.08, -.1], [.08, .084, -.08, -.1], [.02, .092, -.08, -.1], [-.03, .09, -.08, -.097], [-.08, .104, -.08, -.1], [-.14, .11, -.08, -.1], [-.18, .098, -.078, -.098], [-.2, .074, -.074, -.092], [-.212, .036, -.068, -.084]], .35, 14), sole, 0, 0, 0, ankle);
  if (spec.toe) add(loft('bootT', [[-.14, .104, -.028, -.082], [-.17, .096, -.034, -.082], [-.195, .07, -.044, -.08], [-.208, .032, -.056, -.076]]), mat(spec.toe, .5), 0, 0, 0, ankle);
  if (spec.mid) add(gRBox(.106, .006, .26, .004), mat(spec.mid, .8), 0, -.078, -.055, ankle);
  if (spec.tall) { add(HM.gLathe('jboot2', [[0, -.43], [.052, -.43], [.052, -.2], [.062, -.08], [.066, -.01], [.064, 0], [0, 0]], 16), up, 0, 0, 0, knee); if (spec.top) add(HM.gTorus(.064, .006), mat(spec.top, .6), 0, -.012, 0, knee).rotation.x = PI / 2; }
  else { const h = spec.shaft; add(HM.gLathe('bsh' + h, [[0, -.05], [.05, -.05], [.051, h * .5], [.049, h], [0, h]], 14), spec.panel ? mat(spec.panel, .8) : up, 0, 0, 0, ankle);
    if (spec.panel) add(HM.gLathe('bshl', [[0, -.05], [.052, -.05], [.052, .02], [0, .02]], 14), up, 0, 0, 0, ankle);
    if (spec.trim) add(HM.gTorus(.05, .006), mat(spec.trim, .7), 0, h - .004, 0, ankle).rotation.x = PI / 2;
    if (spec.lace) { const lc = mat('#1a1a18', .8), n = Math.max(3, Math.round((h + .03) / .025)); for (let i = 0; i < n; i++) { const y = -.03 + i * .025; A(gBox(.036, .004, .004), lc, 0, y, -.052, ankle, 0, 0, .5); A(gBox(.036, .004, .004), lc, 0, y + .006, -.052, ankle, 0, 0, -.5); for (const sx of [-1, 1]) add(gSph(.003, 5), M.metal, sx * .02, y, -.05, ankle); }
      for (let i = 0; i < 3; i++) A(gBox(.034, .004, .004), lc, 0, .012 - i * .012, -.05 - i * .024, ankle, .45); }
    A(gBox(.014, .02, .004), mat('#1a1a18', .8), 0, h + .005, .05, ankle); } // heel pull loop
};
G.kitHand = function (hand, kit, MM, addFn, side) {
  add = addFn; M = MM; HM = HM || G.HM;
  const Gl = G.GEARID[kit.gloves] || {}; if (!Gl.col) return;
  const gm = M.glove, dk = mat('#141414', .7);
  switch (Gl.id) {
    case 'g_mechanix': A(gRBox(.07, .016, .014, .005), dk, 0, .098, .026, hand); A(gRBox(.05, .03, .006, .003), dk, 0, .05, .023, hand); A(gRBox(.076, .018, .046, .006), dk, 0, -.012, 0, hand); break; // TPR knuckles, back pad, velcro cuff
    case 'g_oakley': A(gRBox(.072, .03, .018, .008), mat('#1e1c18', .45, .2), 0, .092, .026, hand); A(gRBox(.078, .03, .05, .01), gm, 0, -.03, 0, hand); break; // carbon knuckle shell, gauntlet cuff
    case 'g_nomex': add(HM.gLathe('nmx', [[0, -.07], [.044, -.07], [.042, -.005], [0, -.005]], 10), gm, 0, 0, 0, hand); break; // long flight-glove cuff
    case 'g_leather': add(HM.gLathe('lgc', [[0, -.07], [.05, -.07], [.042, -.005], [0, -.005]], 10), gm, 0, 0, 0, hand); break;
    case 'g_wool': for (let i = 0; i < 3; i++) add(HM.gTorus(.041, .004), gm, 0, -.01 - i * .008, 0, hand).rotation.x = PI / 2; break;
    case 'g_black': A(gRBox(.076, .018, .046, .006), dk, 0, -.012, 0, hand); break;
  }
};

// ================================================================= ENTRY POINTS
G.kitHead = function (S, kit, MM, addFn) {
  add = addFn; M = MM; HM = HM || G.HM;
  const GI = G.GEARID, H = GI[kit.helmet] || {}, F = GI[kit.face] || {}, N = GI[kit.nvg] || {}, Cm = GI[kit.comms] || {};
  const HD = S.head;
  const s = H.model ? helmet(HD, H.id, H.model, H) : null;
  const shell = s || null;
  face(HD, F, shell);
  comms(HD, Cm, H, shell);
  if (N.model) nvg(HD, N, H, shell);
};
G.kitBody = function (S, kit, MM, addFn) {
  add = addFn; M = MM; HM = HM || G.HM;
  const GI = G.GEARID, AR = GI[kit.armor] || { id: 'a_none' }, P = GI[kit.plates] || {}, K = GI[kit.pack] || {}, U = GI[kit.uniform] || {};
  uniformDetails(S, U);
  const backZ = armour(S, kit, AR, P);
  pack(S, K, backZ);
};
})();
