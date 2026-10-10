// Dropfall — math helpers, spatial grids, line of sight.
'use strict';
(function () {
  const U = DF.U = {};
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  U.chance = p => Math.random() < p;
  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  U.dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  U.angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  U.angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  U.turn = (cur, target, maxStep) => { const d = U.angDiff(cur, target); return cur + U.clamp(d, -maxStep, maxStep); };
  U.fmtTime = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  U.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Uniform grid for dynamic units, rebuilt every frame.
  class Hash {
    constructor(cell) { this.cell = cell; this.map = new Map(); }
    clear() { this.map.clear(); }
    key(cx, cy) { return cx * 73856093 ^ cy * 19349663; }
    insert(o) {
      const cx = Math.floor(o.x / this.cell), cy = Math.floor(o.y / this.cell), k = this.key(cx, cy);
      let b = this.map.get(k); if (!b) { b = []; this.map.set(k, b); } b.push(o);
    }
    query(x, y, r, out) {
      out = out || []; out.length = 0;
      const c = this.cell, x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
      for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
        const b = this.map.get(this.key(cx, cy)); if (b) for (let i = 0; i < b.length; i++) out.push(b[i]);
      }
      return out;
    }
  }
  U.Hash = Hash;

  // Static grid for obstacles: each obstacle is stored in every cell it touches.
  class StaticGrid {
    constructor(size, cell) { this.cell = cell; this.n = Math.ceil(size / cell); this.cells = Array.from({ length: this.n * this.n }, () => []); this.stamp = 0; }
    bounds(o) {
      if (o.shape === 'r') return [o.x, o.y, o.x + o.w, o.y + o.h];
      return [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r];
    }
    add(o) {
      const [ax, ay, bx, by] = this.bounds(o), c = this.cell, n = this.n;
      for (let cx = Math.max(0, Math.floor(ax / c)); cx <= Math.min(n - 1, Math.floor(bx / c)); cx++)
        for (let cy = Math.max(0, Math.floor(ay / c)); cy <= Math.min(n - 1, Math.floor(by / c)); cy++) this.cells[cy * n + cx].push(o);
    }
    query(x0, y0, x1, y1, out) {
      out = out || []; out.length = 0; this.stamp++;
      const c = this.cell, n = this.n;
      const ax = Math.max(0, Math.floor(Math.min(x0, x1) / c)), bx = Math.min(n - 1, Math.floor(Math.max(x0, x1) / c));
      const ay = Math.max(0, Math.floor(Math.min(y0, y1) / c)), by = Math.min(n - 1, Math.floor(Math.max(y0, y1) / c));
      for (let cx = ax; cx <= bx; cx++) for (let cy = ay; cy <= by; cy++) {
        const b = this.cells[cy * n + cx];
        for (let i = 0; i < b.length; i++) { const o = b[i]; if (o._s !== this.stamp) { o._s = this.stamp; out.push(o); } }
      }
      return out;
    }
  }
  U.StaticGrid = StaticGrid;

  // Segment vs circle
  U.segCircle = (x1, y1, x2, y2, cx, cy, r) => {
    const dx = x2 - x1, dy = y2 - y1, fx = x1 - cx, fy = y1 - cy;
    const a = dx * dx + dy * dy || 1e-6, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r;
    if (c <= 0) return true;
    let disc = b * b - 4 * a * c; if (disc < 0) return false; disc = Math.sqrt(disc);
    const t1 = (-b - disc) / (2 * a), t2 = (-b + disc) / (2 * a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
  };
  // Segment vs axis-aligned rect (Liang-Barsky)
  U.segRect = (x1, y1, x2, y2, rx, ry, rw, rh) => {
    let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
    const p = [-dx, dx, -dy, dy], q = [x1 - rx, rx + rw - x1, y1 - ry, ry + rh - y1];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return false; }
      else { const t = q[i] / p[i]; if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
    }
    return true;
  };
  U.pointInObs = (x, y, o, pad) => {
    pad = pad || 0;
    if (o.shape === 'r') return x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.h + pad;
    return U.dist2(x, y, o.x, o.y) < (o.r + pad) * (o.r + pad);
  };
})();
