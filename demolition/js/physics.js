'use strict';
/* Crumble — debris rigid bodies (falling chunks of building) and spreading fire. */

const G = 36; // gravity, voxels/s²

// A loose piece of the world. Shares its source record with any pieces it splits into;
// `idx` lists which of the record's voxels this piece still owns.
class Body {
  constructor(rec, scene, mat, idx) {
    this.rec = rec; this.scene = scene; this.mat = mat;
    if (!idx) { idx = new Int32Array(rec.n); for (let k = 0; k < rec.n; k++) idx[k] = k; }
    this.pos = new THREE.Vector3(); this.q = new THREE.Quaternion();
    this.v = new THREE.Vector3(); this.w = new THREE.Vector3();
    this.rest = 0; this.age = 0; this.hitCd = 0; this.dead = false; this.chips = [];
    this.setVoxels(idx);
    this.pos.copy(this.com);
  }
  // Recompute centre of mass, inertia, occupancy grid, contact points and mesh for the owned voxels.
  setVoxels(idx) {
    const rec = this.rec, n = idx.length;
    this.idx = idx; this.n = n;
    let cx = 0, cy = 0, cz = 0, x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let a = 0; a < n; a++) {
      const k = idx[a], x = rec.xs[k], y = rec.ys[k], z = rec.zs[k];
      cx += x + 0.5; cy += y + 0.5; cz += z + 0.5;
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (z < z0) z0 = z; if (x > x1) x1 = x; if (y > y1) y1 = y; if (z > z1) z1 = z;
    }
    cx /= n; cy /= n; cz /= n;
    this.com = new THREE.Vector3(cx, cy, cz);
    this.box = [x0, y0, z0, x1, y1, z1];
    const W = x1 - x0 + 1, H = y1 - y0 + 1, D = z1 - z0 + 1;
    this.dims = [W, H, D];
    this.radius = 0.5 * Math.sqrt(W * W + H * H + D * D);
    this.mass = n; this.invM = 1 / n;
    this.invI = 1 / (n * (W * W + H * H + D * D) / 18 * 1.4 + 1);
    const grid = new Int32Array(W * H * D).fill(-1);
    for (let a = 0; a < n; a++) { const k = idx[a]; grid[((rec.ys[k] - y0) * D + (rec.zs[k] - z0)) * W + (rec.xs[k] - x0)] = a; }
    this.grid = grid;
    this.lx = new Float32Array(n); this.ly = new Float32Array(n); this.lz = new Float32Array(n);
    for (let a = 0; a < n; a++) { const k = idx[a]; this.lx[a] = rec.xs[k] + 0.5 - cx; this.ly[a] = rec.ys[k] + 0.5 - cy; this.lz[a] = rec.zs[k] + 0.5 - cz; }
    this.buildMesh();
  }
  occ(x, y, z) {
    const b = this.box;
    if (x < b[0] || x > b[3] || y < b[1] || y > b[4] || z < b[2] || z > b[5]) return -1;
    return this.grid[((y - b[1]) * this.dims[2] + (z - b[2])) * this.dims[0] + (x - b[0])];
  }
  buildMesh() {
    const rec = this.rec, c = this.com, pos = [], nor = [], col = [], ind = [], pts = [];
    for (let a = 0; a < this.n; a++) {
      const k = this.idx[a], x = rec.xs[k], y = rec.ys[k], z = rec.zs[k];
      let ex = 0, ey = 0, ez = 0, exposed = false;
      for (let f = 0; f < 6; f++) {
        const F = FACES[f], N = F.n;
        if (this.occ(x + N[0], y + N[1], z + N[2]) >= 0) continue;
        exposed = true; ex += N[0]; ey += N[1]; ez += N[2];
        const b = pos.length / 3;
        for (let q = 0; q < 4; q++) { const C = F.c[q]; pos.push(x + C[0] - c.x, y + C[1] - c.y, z + C[2] - c.z); nor.push(N[0], N[1], N[2]); col.push(rec.col[k * 3], rec.col[k * 3 + 1], rec.col[k * 3 + 2]); }
        ind.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
      }
      if (exposed) pts.push(this.lx[a] + 0.46 * Math.sign(ex), this.ly[a] + 0.46 * Math.sign(ey), this.lz[a] + 0.46 * Math.sign(ez));
    }
    const np = pts.length / 3, stride = Math.max(1, Math.ceil(np / 420));
    this.pts = [];
    for (let i = 0; i < np; i += stride) this.pts.push(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(ind, 1) : new THREE.Uint16BufferAttribute(ind, 1));
    g.computeBoundingSphere();
    if (this.mesh) { this.mesh.geometry.dispose(); this.mesh.geometry = g; }
    else { this.mesh = new THREE.Mesh(g, this.mat); this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.scene.add(this.mesh); }
    this.mesh.position.copy(this.pos); this.mesh.quaternion.copy(this.q);
  }
  rot() { return new THREE.Matrix4().makeRotationFromQuaternion(this.q).elements; }
  toWorld(lx, ly, lz, e) { e = e || this.rot(); return new THREE.Vector3(this.pos.x + e[0] * lx + e[4] * ly + e[8] * lz, this.pos.y + e[1] * lx + e[5] * ly + e[9] * lz, this.pos.z + e[2] * lx + e[6] * ly + e[10] * lz); }
  toLocal(p) { const e = this.rot(), dx = p.x - this.pos.x, dy = p.y - this.pos.y, dz = p.z - this.pos.z; return new THREE.Vector3(e[0] * dx + e[1] * dy + e[2] * dz, e[4] * dx + e[5] * dy + e[6] * dz, e[8] * dx + e[9] * dy + e[10] * dz); }
  // March a ray through the piece's voxels. Returns {t, point} or null.
  raycast(o, d, maxT) {
    const oc = o.clone().sub(this.pos), b = oc.dot(d), cc = oc.lengthSq() - this.radius * this.radius, disc = b * b - cc;
    if (disc < 0) return null;
    const s = Math.sqrt(disc); let t = Math.max(0, -b - s); const tEnd = Math.min(maxT, -b + s);
    for (; t <= tEnd; t += 0.35) {
      const p = o.clone().addScaledVector(d, t), l = this.toLocal(p);
      if (this.occ(Math.floor(l.x + this.com.x), Math.floor(l.y + this.com.y), Math.floor(l.z + this.com.z)) >= 0) return { t, point: p };
    }
    return null;
  }
  // Knock voxels out around a world point; the piece may crack into several.
  chip(p, r) {
    if (this.dead) return 0;
    const l = this.toLocal(p), keep = [], samples = [], e = this.rot();
    for (let a = 0; a < this.n; a++) {
      const dx = this.lx[a] - l.x, dy = this.ly[a] - l.y, dz = this.lz[a] - l.z, k = this.idx[a];
      const hard = HARD[this.rec.ms[k]];
      const rr = r * (hard >= 4 ? 0.35 : hard === 3 ? 0.7 : 1);
      if (dx * dx + dy * dy + dz * dz < rr * rr + (hash3(k, a, 7) - 0.5) * 2) {
        if (samples.length < 150) { const wp = this.toWorld(this.lx[a], this.ly[a], this.lz[a], e); samples.push(Math.floor(wp.x), Math.floor(wp.y), Math.floor(wp.z), this.rec.ms[k], this.rec.ps[k]); }
        if (this.rec.ms[k] === M.BARREL) { const wp = this.toWorld(this.lx[a], this.ly[a], this.lz[a], e); Game.world.blasts.push(wp.x, wp.y, wp.z); }
      } else keep.push(k);
    }
    const removed = this.n - keep.length;
    if (!removed) return 0;
    FX.burst(samples, p.x, p.y, p.z, 7);
    if (keep.length < 8) { this.remove(); return removed; }
    this.resplit(keep);
    return removed;
  }
  // Split the kept voxels into connected pieces; this body keeps the biggest.
  resplit(keep) {
    const rec = this.rec, set = new Map();
    for (let a = 0; a < keep.length; a++) set.set(rec.xs[keep[a]] + ',' + rec.ys[keep[a]] + ',' + rec.zs[keep[a]], keep[a]);
    const seen = new Set(), comps = [];
    for (const k0 of keep) {
      if (seen.has(k0)) continue;
      const comp = [k0], q = [k0]; seen.add(k0);
      while (q.length) {
        const k = q.pop();
        for (const d of NEIGH6) {
          const nk = set.get((rec.xs[k] + d[0]) + ',' + (rec.ys[k] + d[1]) + ',' + (rec.zs[k] + d[2]));
          if (nk !== undefined && !seen.has(nk)) { seen.add(nk); comp.push(nk); q.push(nk); }
        }
      }
      comps.push(comp);
    }
    comps.sort((a, b) => b.length - a.length);
    const e = this.rot(), oldCom = this.com.clone();
    for (let i = 1; i < comps.length; i++) {
      const c = comps[i];
      if (c.length < 8) {
        const s = []; for (const k of c) { const wp = this.toWorld(rec.xs[k] + 0.5 - oldCom.x, rec.ys[k] + 0.5 - oldCom.y, rec.zs[k] + 0.5 - oldCom.z, e); s.push(Math.floor(wp.x), Math.floor(wp.y), Math.floor(wp.z), rec.ms[k], rec.ps[k]); }
        FX.burst(s, this.pos.x, this.pos.y, this.pos.z, 4); continue;
      }
      const nb = new Body(rec, this.scene, this.mat, Int32Array.from(c));
      const off = nb.com.clone().sub(oldCom);
      nb.pos.copy(this.toWorld(off.x, off.y, off.z, e)); nb.q.copy(this.q);
      const r = nb.pos.clone().sub(this.pos);
      nb.v.copy(this.v).add(new THREE.Vector3().crossVectors(this.w, r)); nb.w.copy(this.w);
      nb.mesh.position.copy(nb.pos); nb.mesh.quaternion.copy(nb.q);
      Bodies.list.push(nb); Game.stats.pieces++;
    }
    this.setVoxels(Int32Array.from(comps[0]));
    const off = this.com.clone().sub(oldCom);
    this.pos.copy(this.toWorld(off.x, off.y, off.z, e));
    this.mesh.position.copy(this.pos);
  }

  step(dt, world, hooks) {
    this.age += dt; if (this.hitCd > 0) this.hitCd -= dt;
    this.v.y -= G * dt;
    this.pos.addScaledVector(this.v, dt);
    const w = this.w, q = this.q;
    const hx = w.x * dt * 0.5, hy = w.y * dt * 0.5, hz = w.z * dt * 0.5;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    q.set(qx + hx * qw + hy * qz - hz * qy, qy + hy * qw + hz * qx - hx * qz, qz + hz * qw + hx * qy - hy * qx, qw - hx * qx - hy * qy - hz * qz).normalize();
    const x2 = q.x + q.x, y2 = q.y + q.y, z2 = q.z + q.z;
    const xx = q.x * x2, xy = q.x * y2, xz = q.x * z2, yy = q.y * y2, yz = q.y * z2, zz = q.z * z2, wx = q.w * x2, wy = q.w * y2, wz = q.w * z2;
    const m00 = 1 - (yy + zz), m01 = xy - wz, m02 = xz + wy, m10 = xy + wz, m11 = 1 - (xx + zz), m12 = yz - wx, m20 = xz - wy, m21 = yz + wx, m22 = 1 - (xx + yy);

    let pen = 0, cx = 0, cy = 0, cz = 0, contacts = 0, hardest = 0, hp = null;
    const P = this.pts, invM = this.invM, invI = this.invI;
    for (let k = 0; k < P.length; k += 3) {
      const lx = P[k], ly = P[k + 1], lz = P[k + 2];
      const rx = m00 * lx + m01 * ly + m02 * lz, ry = m10 * lx + m11 * ly + m12 * lz, rz = m20 * lx + m21 * ly + m22 * lz;
      const px = this.pos.x + rx, py = this.pos.y + ry, pz = this.pos.z + rz;
      const vx0 = Math.floor(px), vy0 = Math.floor(py), vz0 = Math.floor(pz);
      const m = world.get(vx0, vy0, vz0);
      if (!m || !SOLID[m]) continue;
      contacts++;
      let nx = 0, ny = 0, nz = 0;
      for (let f = 0; f < 6; f++) { const d = NEIGH6[f]; if (!SOLID[world.get(vx0 + d[0], vy0 + d[1], vz0 + d[2])]) { nx += d[0]; ny += d[1]; nz += d[2]; } }
      if (!nx && !ny && !nz) ny = 1;
      const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      let depth = 0;
      if (nx) depth += ((nx > 0 ? vx0 + 1 : vx0) - px) * nx;
      if (ny) depth += ((ny > 0 ? vy0 + 1 : vy0) - py) * ny;
      if (nz) depth += ((nz > 0 ? vz0 + 1 : vz0) - pz) * nz;
      depth = Math.min(1, Math.max(0, depth));
      const vpx = this.v.x + w.y * rz - w.z * ry, vpy = this.v.y + w.z * rx - w.x * rz, vpz = this.v.z + w.x * ry - w.y * rx;
      const vn = vpx * nx + vpy * ny + vpz * nz;
      if (vn < 0) {
        if (-vn > hardest) { hardest = -vn; hp = [px, py, pz]; }
        const e = vn < -8 ? 0.12 : 0;
        const rnx = ry * nz - rz * ny, rny = rz * nx - rx * nz, rnz = rx * ny - ry * nx;
        const kn = invM + invI * (rnx * rnx + rny * rny + rnz * rnz);
        const j = -(1 + e) * vn / kn;
        this.v.x += nx * j * invM; this.v.y += ny * j * invM; this.v.z += nz * j * invM;
        w.x += rnx * j * invI; w.y += rny * j * invI; w.z += rnz * j * invI;
        let tx = vpx - nx * vn, ty = vpy - ny * vn, tz = vpz - nz * vn;
        const tl = Math.hypot(tx, ty, tz);
        if (tl > 1e-4) {
          tx /= tl; ty /= tl; tz /= tl;
          const rtx = ry * tz - rz * ty, rty = rz * tx - rx * tz, rtz = rx * ty - ry * tx;
          const kt = invM + invI * (rtx * rtx + rty * rty + rtz * rtz);
          const jt = Math.min(tl / kt, 0.7 * j);
          this.v.x -= tx * jt * invM; this.v.y -= ty * jt * invM; this.v.z -= tz * jt * invM;
          w.x -= rtx * jt * invI; w.y -= rty * jt * invI; w.z -= rtz * jt * invI;
        }
      }
      cx += nx * depth; cy += ny * depth; cz += nz * depth; pen++;
    }
    // The hardest contact this step damages both the ground and the piece itself.
    const thresh = this.mass > 1500 ? 7 : 12;
    if (hp && hardest > thresh && this.mass >= 30 && this.hitCd <= 0 && hooks) {
      this.hitCd = this.mass > 1500 ? 0.05 : 0.12;
      hooks.impact(hp[0], hp[1], hp[2], this.mass, hardest);
      this.chips.push([hp[0], hp[1], hp[2], Math.min(3.5, 1.2 + hardest / 14)]);
    }
    if (pen) { const s = 0.8 / pen; this.pos.x += cx * s; this.pos.y += cy * s; this.pos.z += cz * s; }
    const damp = contacts ? Math.max(0, 1 - 3 * dt) : 1 - 0.2 * dt;
    w.multiplyScalar(damp);
    if (contacts) this.v.multiplyScalar(1 - 0.6 * dt);
    if (contacts && this.v.lengthSq() < 1.6 && w.lengthSq() < 0.12) this.rest += dt; else this.rest = 0;
    this.mesh.position.copy(this.pos); this.mesh.quaternion.copy(q);
    if (this.pos.y < -30) this.dead = true;
  }

  settle(world) {
    const e = this.rot();
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9, placed = 0;
    for (let a = 0; a < this.n; a++) {
      const lx = this.lx[a], ly = this.ly[a], lz = this.lz[a], k = this.idx[a];
      const x = Math.floor(this.pos.x + e[0] * lx + e[4] * ly + e[8] * lz);
      const y = Math.floor(this.pos.y + e[1] * lx + e[5] * ly + e[9] * lz);
      const z = Math.floor(this.pos.z + e[2] * lx + e[6] * ly + e[10] * lz);
      if (!world.inb(x, y, z) || world.data[world.idx(x, y, z)]) continue;
      world.setRaw(x, y, z, this.rec.ms[k], this.rec.ps[k]); placed++;
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (z < z0) z0 = z; if (x > x1) x1 = x; if (y > y1) y1 = y; if (z > z1) z1 = z;
    }
    if (placed) world.markRegion(x0, y0, z0, x1, y1, z1);
    this.remove();
    return placed ? [x0, y0, z0, x1, y1, z1] : null;
  }
  remove() { if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); } this.dead = true; }
}

const Bodies = {
  list: [], mat: null,
  init(scene) { this.scene = scene; this.mat = new THREE.MeshLambertMaterial({ vertexColors: true }); },
  add(rec) {
    const b = new Body(rec, this.scene, this.mat);
    this.list.push(b);
    if (this.list.length > 44) { const old = this.list.shift(); const box = old.settle(Game.world); if (box) Game.queueCheck(box); }
    return b;
  },
  update(dt, world) {
    const sub = 2, h = dt / sub;
    for (let s = 0; s < sub; s++) {
      for (const b of this.list) if (!b.dead) b.step(h, world, Game.bodyHooks);
      this.collidePairs();
    }
    for (const b of this.list.slice()) {
      if (b.dead) continue;
      // Fracture where it hit hardest.
      if (b.chips.length) { const c = b.chips.pop(); b.chips.length = 0; if (b.n > 30) b.chip(new THREE.Vector3(c[0], c[1], c[2]), c[3]); }
      if (!b.dead && (b.rest > 0.4 || b.age > 18)) { const box = b.settle(world); if (box) Game.queueCheck(box); }
    }
    for (const b of this.list) if (b.dead && b.mesh && b.mesh.parent) b.remove();
    this.list = this.list.filter(b => !b.dead);
  },
  // Pieces push each other apart (bounding spheres shrunk to the solid core).
  collidePairs() {
    const L = this.list;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j];
      const ra = Math.min(a.radius * 0.55, Math.min(...a.dims) * 0.6 + 1), rb = Math.min(b.radius * 0.55, Math.min(...b.dims) * 0.6 + 1);
      const d = a.pos.distanceTo(b.pos);
      if (d >= ra + rb || d < 1e-3) continue;
      const n = b.pos.clone().sub(a.pos).divideScalar(d), pen = ra + rb - d, ta = b.mass / (a.mass + b.mass), tb = 1 - ta;
      a.pos.addScaledVector(n, -pen * ta); b.pos.addScaledVector(n, pen * tb);
      const rel = a.v.clone().sub(b.v).dot(n);
      if (rel > 0) { const j = rel * 1.1; a.v.addScaledVector(n, -j * ta); b.v.addScaledVector(n, j * tb); a.rest = b.rest = 0; }
    }
  },
  // Shove nearby pieces outward from a point and crack the ones close to it.
  blast(p, r, strength) {
    for (const b of this.list.slice()) {
      if (b.dead) continue;
      const d = b.pos.distanceTo(p);
      if (d > r + b.radius) continue;
      const k = strength * (1 - Math.min(1, Math.max(0, d - b.radius) / r)) / Math.sqrt(b.mass);
      const dir = b.pos.clone().sub(p).normalize(); dir.y += 0.4;
      b.v.addScaledVector(dir, k * 6);
      b.w.x += (Math.random() - 0.5) * k * 0.6; b.w.z += (Math.random() - 0.5) * k * 0.6;
      b.rest = 0;
      if (d < r * 0.5 + b.radius * 0.5) b.chip(p, r * 0.6);
    }
  },
  raycast(o, d, maxT) {
    let best = null;
    for (const b of this.list) { const h = b.raycast(o, d, best ? best.t : maxT); if (h && (!best || h.t < best.t)) best = { t: h.t, point: h.point, body: b }; }
    return best;
  },
  clear() { for (const b of this.list) b.remove(); this.list = []; }
};

const Fire = {
  map: new Map(), keys: [], acc: 0, light: null,
  init(scene) {
    this.light = new THREE.PointLight(0xff8a3a, 0, 60, 1.6); scene.add(this.light);
  },
  ignite(world, x, y, z) {
    if (!world.inb(x, y, z)) return false;
    const i = world.idx(x, y, z), m = world.data[i];
    if (!m || !FLAM[m] || this.map.has(i) || this.map.size > 2400) return false;
    if (m === M.BARREL) { world.blasts.push(x + 0.5, y + 0.5, z + 0.5); return true; }
    this.map.set(i, 3 + Math.random() * 5); return true;
  },
  igniteSphere(world, cx, cy, cz, r, chance) {
    let n = 0;
    for (let k = 0; k < 40; k++) {
      const x = Math.floor(cx + (Math.random() * 2 - 1) * r), y = Math.floor(cy + (Math.random() * 2 - 1) * r), z = Math.floor(cz + (Math.random() * 2 - 1) * r);
      if (Math.random() < chance && this.ignite(world, x, y, z)) n++;
    }
    return n;
  },
  extinguish(world, cx, cy, cz, r) {
    let n = 0; const r2 = r * r, sx = world.sx, sz = world.sz;
    for (const i of this.map.keys()) {
      const x = i % sx, t = (i / sx) | 0, z = t % sz, y = (t / sz) | 0;
      const dx = x - cx, dy = y - cy, dz = z - cz;
      if (dx * dx + dy * dy + dz * dz < r2) { this.map.delete(i); n++; }
    }
    return n;
  },
  update(dt, world) {
    this.acc += dt;
    const sx = world.sx, sz = world.sz;
    while (this.acc >= 0.15) {
      this.acc -= 0.15;
      let bx0 = 1e9, by0 = 1e9, bz0 = 1e9, bx1 = -1, by1 = -1, bz1 = -1, burned = 0;
      for (const [i, life0] of this.map) {
        const m = world.data[i];
        if (!m) { this.map.delete(i); continue; }
        const x = i % sx, t = (i / sx) | 0, z = t % sz, y = (t / sz) | 0;
        const life = life0 - 0.15;
        if (Math.random() < 0.22 * FLAM[m]) {
          const dy = [-1, 0, 1, 1, 1][Math.random() * 5 | 0];
          this.ignite(world, x + (Math.random() * 3 | 0) - 1, y + dy, z + (Math.random() * 3 | 0) - 1);
        }
        if (life < 1.6 && world.paint[i] !== 1) world.setPaint(x, y, z, 1);
        if (life <= 0) {
          this.map.delete(i); world.data[i] = 0; world.paint[i] = 0; burned++;
          if (x < bx0) bx0 = x; if (y < by0) by0 = y; if (z < bz0) bz0 = z; if (x > bx1) bx1 = x; if (y > by1) by1 = y; if (z > bz1) bz1 = z;
          for (const d of NEIGH6) { const nm = world.get(x + d[0], y + d[1], z + d[2]); if (nm && !ANCHOR[nm]) world.paint[world.idx(x + d[0], y + d[1], z + d[2])] = 1; }
          if (Math.random() < 0.3) FX.smoke(x + 0.5, y + 0.5, z + 0.5, 3 + Math.random() * 3, 0.5);
        } else this.map.set(i, life);
      }
      if (burned) { world.markRegion(bx0, by0, bz0, bx1, by1, bz1); Game.queueCheck([bx0, by0, bz0, bx1, by1, bz1]); }
      this.keys = Array.from(this.map.keys());
    }
    // Flames, embers and one light at the fire's centre.
    const K = this.keys, nk = K.length;
    if (nk) {
      let lx = 0, ly = 0, lz = 0;
      const spawn = Math.min(nk, 70);
      for (let s = 0; s < spawn; s++) {
        const i = K[(Math.random() * nk) | 0];
        const x = i % sx, t = (i / sx) | 0, z = t % sz, y = (t / sz) | 0;
        lx += x; ly += y; lz += z;
        FX.flame(x + Math.random(), y + 0.6 + Math.random() * 0.6, z + Math.random(), 1.2 + Math.random() * 1.6);
        if (Math.random() < 0.06) FX.smoke(x + 0.5, y + 1.5, z + 0.5, 4 + Math.random() * 5, 0.35);
      }
      this.light.position.set(lx / spawn, ly / spawn + 2, lz / spawn);
      this.light.intensity = Math.min(3.5, 0.6 + nk / 120) * (0.85 + Math.random() * 0.3);
    } else this.light.intensity = 0;
  },
  clear() { this.map.clear(); this.keys = []; if (this.light) this.light.intensity = 0; }
};
