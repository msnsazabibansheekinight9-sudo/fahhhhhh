'use strict';
/* Crumble — debris rigid bodies (falling chunks of building) and spreading fire. */

const G = 36; // gravity, voxels/s²

class Body {
  constructor(rec, scene, mat) {
    const n = rec.n;
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < n; k++) { cx += rec.xs[k] + 0.5; cy += rec.ys[k] + 0.5; cz += rec.zs[k] + 0.5; }
    cx /= n; cy /= n; cz /= n;
    this.n = n; this.rec = rec;
    this.lx = new Float32Array(n); this.ly = new Float32Array(n); this.lz = new Float32Array(n);
    for (let k = 0; k < n; k++) { this.lx[k] = rec.xs[k] + 0.5 - cx; this.ly[k] = rec.ys[k] + 0.5 - cy; this.lz[k] = rec.zs[k] + 0.5 - cz; }
    const W = rec.x1 - rec.x0 + 1, H = rec.y1 - rec.y0 + 1, D = rec.z1 - rec.z0 + 1;
    this.radius = 0.5 * Math.sqrt(W * W + H * H + D * D);
    this.mass = n; this.invM = 1 / n;
    this.invI = 1 / (n * (W * W + H * H + D * D) / 18 * 1.4 + 1);
    this.pos = new THREE.Vector3(cx, cy, cz);
    this.q = new THREE.Quaternion();
    this.v = new THREE.Vector3(); this.w = new THREE.Vector3();
    this.rest = 0; this.age = 0; this.hitCd = 0; this.dead = false;

    // Local occupancy grid for face culling and contact points.
    const grid = new Uint8Array(W * H * D);
    const gi = (x, y, z) => ((y - rec.y0) * D + (z - rec.z0)) * W + (x - rec.x0);
    for (let k = 0; k < n; k++) grid[gi(rec.xs[k], rec.ys[k], rec.zs[k])] = 1;
    const occ = (x, y, z) => x >= rec.x0 && x <= rec.x1 && y >= rec.y0 && y <= rec.y1 && z >= rec.z0 && z <= rec.z1 && grid[gi(x, y, z)];

    const pos = [], nor = [], col = [], idx = [];
    const pts = [];
    for (let k = 0; k < n; k++) {
      const x = rec.xs[k], y = rec.ys[k], z = rec.zs[k];
      let ex = 0, ey = 0, ez = 0, exposed = false;
      for (let f = 0; f < 6; f++) {
        const F = FACES[f], N = F.n;
        if (occ(x + N[0], y + N[1], z + N[2])) continue;
        exposed = true; ex += N[0]; ey += N[1]; ez += N[2];
        const b = pos.length / 3;
        for (let c = 0; c < 4; c++) {
          const C = F.c[c];
          pos.push(x + C[0] - cx, y + C[1] - cy, z + C[2] - cz);
          nor.push(N[0], N[1], N[2]);
          col.push(rec.col[k * 3], rec.col[k * 3 + 1], rec.col[k * 3 + 2]);
        }
        idx.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
      }
      if (exposed) pts.push(this.lx[k] + 0.46 * Math.sign(ex), this.ly[k] + 0.46 * Math.sign(ey), this.lz[k] + 0.46 * Math.sign(ez));
    }
    // Keep contact sampling bounded on huge pieces.
    const np = pts.length / 3, stride = Math.max(1, Math.ceil(np / 420));
    this.pts = [];
    for (let i = 0; i < np; i += stride) this.pts.push(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx.length > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh); this.scene = scene;
  }

  step(dt, world, hooks) {
    this.age += dt; if (this.hitCd > 0) this.hitCd -= dt;
    this.v.y -= G * dt;
    this.pos.addScaledVector(this.v, dt);
    const w = this.w, q = this.q;
    const hx = w.x * dt * 0.5, hy = w.y * dt * 0.5, hz = w.z * dt * 0.5;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    q.set(qx + hx * qw + hy * qz - hz * qy, qy + hy * qw + hz * qx - hx * qz, qz + hz * qw + hx * qy - hy * qx, qw - hx * qx - hy * qy - hz * qz).normalize();

    // Rotation matrix terms.
    const x2 = q.x + q.x, y2 = q.y + q.y, z2 = q.z + q.z;
    const xx = q.x * x2, xy = q.x * y2, xz = q.x * z2, yy = q.y * y2, yz = q.y * z2, zz = q.z * z2, wx = q.w * x2, wy = q.w * y2, wz = q.w * z2;
    const m00 = 1 - (yy + zz), m01 = xy - wz, m02 = xz + wy, m10 = xy + wz, m11 = 1 - (xx + zz), m12 = yz - wx, m20 = xz - wy, m21 = yz + wx, m22 = 1 - (xx + yy);

    let pen = 0, cx = 0, cy = 0, cz = 0, contacts = 0;
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
      for (let f = 0; f < 6; f++) { const d = NEIGH6[f]; if (!world.get(vx0 + d[0], vy0 + d[1], vz0 + d[2])) { nx += d[0]; ny += d[1]; nz += d[2]; } }
      if (!nx && !ny && !nz) ny = 1;
      const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      let depth = 0;
      if (nx) depth += ((nx > 0 ? vx0 + 1 : vx0) - px) * nx;
      if (ny) depth += ((ny > 0 ? vy0 + 1 : vy0) - py) * ny;
      if (nz) depth += ((nz > 0 ? vz0 + 1 : vz0) - pz) * nz;
      depth = Math.min(1, Math.max(0, depth));
      // Contact point velocity v + w×r.
      const vpx = this.v.x + w.y * rz - w.z * ry, vpy = this.v.y + w.z * rx - w.x * rz, vpz = this.v.z + w.x * ry - w.y * rx;
      const vn = vpx * nx + vpy * ny + vpz * nz;
      if (vn < 0) {
        if (vn < (this.mass > 1500 ? -7 : -14) && this.mass >= 30 && this.hitCd <= 0 && hooks) { this.hitCd = this.mass > 1500 ? 0.02 : 0.12; hooks.impact(px, py, pz, this.mass, -vn); }
        const e = vn < -8 ? 0.12 : 0;
        const rnx = ry * nz - rz * ny, rny = rz * nx - rx * nz, rnz = rx * ny - ry * nx;
        const kn = invM + invI * (rnx * rnx + rny * rny + rnz * rnz);
        const j = -(1 + e) * vn / kn;
        this.v.x += nx * j * invM; this.v.y += ny * j * invM; this.v.z += nz * j * invM;
        w.x += rnx * j * invI; w.y += rny * j * invI; w.z += rnz * j * invI;
        // Coulomb friction along the sliding direction.
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
    if (pen) { const s = 0.5 / pen; this.pos.x += cx * s * 1.6; this.pos.y += cy * s * 1.6; this.pos.z += cz * s * 1.6; }
    const damp = contacts ? Math.max(0, 1 - 3 * dt) : 1 - 0.2 * dt;
    w.multiplyScalar(damp);
    if (contacts) this.v.multiplyScalar(1 - 0.6 * dt);
    if (contacts && this.v.lengthSq() < 1.6 && w.lengthSq() < 0.12) this.rest += dt; else this.rest = 0;
    this.mesh.position.copy(this.pos); this.mesh.quaternion.copy(q);
    if (this.pos.y < -30) this.dead = true;
  }

  // Put the voxels back into the world grid where they came to rest.
  settle(world) {
    const R = new THREE.Matrix4().makeRotationFromQuaternion(this.q), e = R.elements;
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9, placed = 0;
    for (let k = 0; k < this.n; k++) {
      const lx = this.lx[k], ly = this.ly[k], lz = this.lz[k];
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
  remove() { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.dead = true; }
}

const Bodies = {
  list: [], mat: null,
  init(scene) { this.scene = scene; this.mat = new THREE.MeshLambertMaterial({ vertexColors: true }); },
  add(rec) {
    const b = new Body(rec, this.scene, this.mat);
    this.list.push(b);
    if (this.list.length > 36) { const old = this.list.shift(); const box = old.settle(Game.world); if (box) Game.queueCheck(box); }
    return b;
  },
  update(dt, world) {
    const sub = 2, h = dt / sub;
    for (const b of this.list) {
      for (let s = 0; s < sub; s++) b.step(h, world, Game.bodyHooks);
      if (!b.dead && (b.rest > 0.4 || b.age > 18)) { const box = b.settle(world); if (box) Game.queueCheck(box); }
      else if (b.dead && b.mesh.parent) b.remove();
    }
    this.list = this.list.filter(b => !b.dead);
  },
  // Shove nearby pieces outward from a point.
  blast(p, r, strength) {
    for (const b of this.list) {
      const d = b.pos.distanceTo(p);
      if (d > r + b.radius) continue;
      const k = strength * (1 - Math.min(1, Math.max(0, d - b.radius) / r)) / Math.sqrt(b.mass);
      const dir = b.pos.clone().sub(p).normalize(); dir.y += 0.4;
      b.v.addScaledVector(dir, k * 6);
      b.w.x += (Math.random() - 0.5) * k * 0.6; b.w.z += (Math.random() - 0.5) * k * 0.6;
      b.rest = 0;
    }
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
