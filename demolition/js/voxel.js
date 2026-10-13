'use strict';
/* Crumble — voxel world: materials, storage, chunked meshing, raycasts, carving and structural support.
   World units are voxels; one voxel is 25 cm. */

const M = {
  AIR: 0, BEDROCK: 1, DIRT: 2, GRASS: 3, SAND: 4, ASPHALT: 5, CONCRETE: 6, BRICK: 7, PLASTER: 8, WOOD: 9,
  PLANK: 10, GLASS: 11, METAL: 12, ROOF: 13, LEAVES: 14, TILE: 15, STEEL: 16, HAY: 17, LADDER: 18, RUBBER: 19,
  STONE: 20, GRAVEL: 21, BARREL: 22, CLOTH: 23, MARBLE: 24, POOL: 25
};
const MATS = [];
function defMat(id, name, rgb, hard, o) {
  MATS[id] = Object.assign({ id, name, rgb, hard, flam: 0, anchor: false, glass: false, ladder: false, nonsolid: false, vary: 0.07, snd: 'stone' }, o || {});
}
defMat(M.AIR, 'air', [0, 0, 0], 0);
defMat(M.BEDROCK, 'bedrock', [58, 56, 54], 9, { anchor: true });
defMat(M.DIRT, 'dirt', [110, 82, 58], 3, { anchor: true, snd: 'dirt', vary: 0.1 });
defMat(M.GRASS, 'grass', [92, 126, 60], 3, { anchor: true, snd: 'dirt', vary: 0.14 });
defMat(M.SAND, 'sand', [204, 186, 140], 3, { anchor: true, snd: 'dirt', vary: 0.06 });
defMat(M.ASPHALT, 'asphalt', [62, 64, 66], 3, { anchor: true, vary: 0.08 });
defMat(M.CONCRETE, 'concrete', [158, 156, 148], 3, { vary: 0.05 });
defMat(M.BRICK, 'brick', [152, 70, 50], 2, { vary: 0.09 });
defMat(M.PLASTER, 'plaster', [216, 206, 182], 1, { vary: 0.04 });
defMat(M.WOOD, 'wood', [128, 90, 56], 1, { flam: 1, snd: 'wood' });
defMat(M.PLANK, 'plank', [178, 138, 90], 1, { flam: 1, snd: 'wood' });
defMat(M.GLASS, 'glass', [176, 214, 228], 0, { glass: true, snd: 'glass', vary: 0.02 });
defMat(M.METAL, 'sheet metal', [118, 130, 138], 4, { snd: 'metal' });
defMat(M.ROOF, 'shingle', [96, 60, 54], 1, { flam: 0.7, snd: 'wood' });
defMat(M.LEAVES, 'foliage', [68, 108, 46], 0, { flam: 0.8, vary: 0.2, snd: 'leaf' });
defMat(M.TILE, 'tile', [194, 192, 186], 2);
defMat(M.STEEL, 'steel', [76, 82, 90], 4, { snd: 'metal' });
defMat(M.HAY, 'hay', [214, 184, 92], 0, { flam: 1, vary: 0.12, snd: 'leaf' });
defMat(M.LADDER, 'ladder', [150, 108, 64], 1, { flam: 1, ladder: true, snd: 'wood' });
defMat(M.RUBBER, 'rubber', [34, 34, 36], 2, { flam: 0.3 });
defMat(M.STONE, 'rock', [128, 116, 104], 3, { anchor: true, vary: 0.12 });
defMat(M.GRAVEL, 'gravel', [146, 138, 126], 3, { anchor: true, vary: 0.22, snd: 'dirt' });
defMat(M.BARREL, 'fuel barrel', [178, 44, 36], 1, { flam: 1, snd: 'metal' });
defMat(M.CLOTH, 'canvas', [200, 196, 180], 0, { flam: 1, snd: 'leaf' });
defMat(M.MARBLE, 'stonework', [222, 218, 206], 2, { vary: 0.04 });
defMat(M.POOL, 'water', [70, 150, 190], 0, { glass: true, nonsolid: true, snd: 'leaf' });

const SOLID = new Uint8Array(256), OPAQUE = new Uint8Array(256), GLASSY = new Uint8Array(256), ANCHOR = new Uint8Array(256), HARD = new Uint8Array(256);
const FLAM = new Float32Array(256);
for (const mt of MATS) {
  if (!mt || !mt.id) continue;
  SOLID[mt.id] = mt.ladder || mt.nonsolid ? 0 : 1; OPAQUE[mt.id] = mt.glass ? 0 : 1; GLASSY[mt.id] = mt.glass ? 1 : 0;
  ANCHOR[mt.id] = mt.anchor ? 1 : 0; HARD[mt.id] = mt.hard; FLAM[mt.id] = mt.flam;
}

// Paint slot 1 is soot from fire; the rest are spray-can colours.
const PAINTS = [null, [30, 26, 24], [214, 58, 46], [238, 188, 40], [56, 150, 220], [88, 186, 92], [242, 240, 232], [226, 96, 188], [28, 28, 32]];
const SPRAY_COLORS = [2, 3, 4, 5, 6, 7, 8];
const SRGB2LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) SRGB2LIN[i] = Math.pow(i / 255, 2.2);

function hash3(x, y, z) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Linear RGB of one voxel, with the per-material surface pattern baked in.
function voxRGB(m, x, y, z, p, out) {
  const mt = MATS[m];
  let r = mt.rgb[0], g = mt.rgb[1], b = mt.rgb[2], f = 1;
  switch (m) {
    case M.BRICK: if (y % 3 === 0 || ((x + z + ((y / 3 | 0) & 1) * 3) % 6) === 0) { r = 172; g = 162; b = 150; } break;
    case M.WOOD: case M.PLANK: if ((y & 3) === 0) f = 0.84; break;
    case M.METAL: if ((x + z) & 1) f = 0.88; break;
    case M.ROOF: if (y & 1) f = 0.86; break;
    case M.TILE: if (x % 4 === 0 || z % 4 === 0 || y % 4 === 0) f = 0.86; break;
    case M.CONCRETE: if (y % 12 === 0) f = 0.9; break;
    case M.LADDER: if (y & 1) f = 0.62; break;
    case M.BARREL: if (y % 4 === 1) { r = 60; g = 60; b = 62; } break;
    case M.CLOTH: if ((x + z) % 6 < 3) { r = 186; g = 64; b = 52; } break;
    case M.STONE: if (y % 7 === 0) f = 0.88; break;
    case M.MARBLE: if (y % 6 === 0) f = 0.9; break;
  }
  f *= 1 + (hash3(x, y, z) - 0.5) * 2 * mt.vary;
  r *= f; g *= f; b *= f;
  if (p === 1) { r *= 0.26; g *= 0.24; b *= 0.23; }
  else if (p) { const c = PAINTS[p]; const k = 0.88; r = r * (1 - k) + c[0] * k * f; g = g * (1 - k) + c[1] * k * f; b = b * (1 - k) + c[2] * k * f; }
  out[0] = SRGB2LIN[r > 255 ? 255 : r | 0]; out[1] = SRGB2LIN[g > 255 ? 255 : g | 0]; out[2] = SRGB2LIN[b > 255 ? 255 : b | 0];
}

// Faces wind counter-clockwise from outside; triangles are (0,1,2)(2,1,3).
const FACES = [
  { n: [-1, 0, 0], c: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] },
  { n: [1, 0, 0], c: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] },
  { n: [0, -1, 0], c: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]] },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] }
];
for (const F of FACES) {
  const a = F.n[0] ? 0 : F.n[1] ? 1 : 2, u = (a + 1) % 3, v = (a + 2) % 3;
  F.ao = F.c.map(c => {
    const du = c[u] ? 1 : -1, dv = c[v] ? 1 : -1;
    const s1 = F.n.slice(), s2 = F.n.slice(), cc = F.n.slice();
    s1[u] += du; s2[v] += dv; cc[u] += du; cc[v] += dv;
    return [s1, s2, cc];
  });
}
const AO_CURVE = [0.48, 0.66, 0.83, 1];
const NEIGH6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const MAXV = 16 * 16 * 16 * 6 * 4 / 2;
const SCR = { pos: new Float32Array(MAXV * 3), nor: new Float32Array(MAXV * 3), col: new Float32Array(MAXV * 3), idx: new Uint32Array(MAXV * 3 / 2) };
const BFS_CAP = 90000;

class World {
  constructor(sx, sy, sz, scene) {
    this.sx = sx; this.sy = sy; this.sz = sz; this.n = sx * sy * sz;
    this.data = new Uint8Array(this.n); this.paint = new Uint8Array(this.n);
    this.built = null;
    this.ncx = sx >> 4; this.ncy = sy >> 4; this.ncz = sz >> 4;
    this.chunks = new Array(this.ncx * this.ncy * this.ncz).fill(null);
    this.built = new Uint8Array(this.chunks.length); this.viewR = 340; this.visT = 0;
    this.dirty = new Set();
    this.group = new THREE.Group(); scene.add(this.group); this.scene = scene;
    this.matOpaque = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.matGlass = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.36, depthWrite: false });
    this.Q = new Int32Array(BFS_CAP + 16);
    this.shadows = true;
    this.blasts = [];
  }
  idx(x, y, z) { return (y * this.sz + z) * this.sx + x; }
  inb(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz; }
  get(x, y, z) {
    if (x < 0 || z < 0 || x >= this.sx || z >= this.sz || y >= this.sy) return 0;
    if (y < 0) return M.BEDROCK;
    return this.data[(y * this.sz + z) * this.sx + x];
  }
  getf(x, y, z) { return this.get(Math.floor(x), Math.floor(y), Math.floor(z)); }
  setRaw(x, y, z, m, p) {
    if (!this.inb(x, y, z)) return;
    const i = (y * this.sz + z) * this.sx + x; this.data[i] = m; this.paint[i] = p || 0;
  }
  set(x, y, z, m, p) {
    if (!this.inb(x, y, z)) return;
    const i = (y * this.sz + z) * this.sx + x; this.data[i] = m; this.paint[i] = p || 0;
    this.markRegion(x, y, z, x, y, z);
  }
  setPaint(x, y, z, p) {
    if (!this.inb(x, y, z)) return;
    const i = (y * this.sz + z) * this.sx + x; if (!this.data[i] || this.paint[i] === p) return;
    this.paint[i] = p; this.markRegion(x, y, z, x, y, z);
  }
  // Mark every chunk overlapping the inclusive box (grown by one for faces and AO) for rebuild.
  markRegion(x0, y0, z0, x1, y1, z1) {
    const c0x = Math.max(0, (x0 - 1) >> 4), c1x = Math.min(this.ncx - 1, (x1 + 1) >> 4);
    const c0y = Math.max(0, (y0 - 1) >> 4), c1y = Math.min(this.ncy - 1, (y1 + 1) >> 4);
    const c0z = Math.max(0, (z0 - 1) >> 4), c1z = Math.min(this.ncz - 1, (z1 + 1) >> 4);
    for (let cy = c0y; cy <= c1y; cy++) for (let cz = c0z; cz <= c1z; cz++) for (let cx = c0x; cx <= c1x; cx++)
      this.dirty.add((cy * this.ncz + cz) * this.ncx + cx);
  }
  buildAll() { for (let i = 0; i < this.chunks.length; i++) this.buildChunk(i); this.dirty.clear(); }
  // Chunks only get meshed once someone is near; edits to unbuilt chunks wait for that first build.
  rebuildDirty() { for (const ci of this.dirty) if (this.built[ci]) this.buildChunk(ci); this.dirty.clear(); }
  chunkCenter(ci) { const cx = ci % this.ncx, t = (ci / this.ncx) | 0, cz = t % this.ncz; return [(cx << 4) + 8, (cz << 4) + 8]; }
  // Build every chunk column within r of (px,pz), nearest first.
  buildNear(px, pz, r) {
    const order = [];
    for (let ci = 0; ci < this.chunks.length; ci++) { if (this.built[ci]) continue; const [x, z] = this.chunkCenter(ci); const d = Math.hypot(x - px, z - pz); if (d < r) order.push([d, ci]); }
    order.sort((a, b) => a[0] - b[0]);
    for (const [, ci] of order) this.buildChunk(ci);
    return order.length;
  }
  // Background streaming: mesh the nearest unbuilt chunks within a time budget; hide far ones.
  stream(px, pz, ms, dt) {
    const t0 = performance.now();
    if (!this._order || this._orderT <= 0 || Math.hypot(px - this._ox, pz - this._oz) > 48) {
      this._order = []; this._ox = px; this._oz = pz; this._orderT = 2;
      for (let ci = 0; ci < this.chunks.length; ci++) if (!this.built[ci]) { const [x, z] = this.chunkCenter(ci); this._order.push([Math.hypot(x - px, z - pz), ci]); }
      this._order.sort((a, b) => b[0] - a[0]);
    }
    this._orderT -= dt || 0;
    while (this._order.length && performance.now() - t0 < ms) { const [, ci] = this._order.pop(); if (!this.built[ci]) this.buildChunk(ci); }
    this.visT -= dt || 0;
    if (this.visT <= 0) {
      this.visT = 0.4;
      const r2 = this.viewR * this.viewR;
      for (let ci = 0; ci < this.chunks.length; ci++) {
        const ch = this.chunks[ci]; if (!ch) continue;
        const [x, z] = this.chunkCenter(ci), v = (x - px) * (x - px) + (z - pz) * (z - pz) < r2;
        if (ch.mesh) ch.mesh.visible = v; if (ch.glass) ch.glass.visible = v;
      }
    }
    return this._order.length;
  }
  pendingChunks() { return this._order ? this._order.length : this.chunks.length; }
  setShadows(on) {
    this.shadows = on;
    for (const ch of this.chunks) if (ch && ch.mesh) { ch.mesh.castShadow = on; ch.mesh.receiveShadow = on; }
  }

  meshPass(x0, y0, z0, glass) {
    const S = SCR, data = this.data, paint = this.paint, sx = this.sx, sz = this.sz;
    const tmp = [0, 0, 0], ao = [0, 0, 0, 0];
    let v = 0, k = 0;
    for (let y = y0; y < y0 + 16; y++) for (let z = z0; z < z0 + 16; z++) {
      let i = (y * sz + z) * sx + x0;
      for (let x = x0; x < x0 + 16; x++, i++) {
        const m = data[i];
        if (!m || GLASSY[m] !== glass) continue;
        let colored = false;
        for (let f = 0; f < 6; f++) {
          const F = FACES[f], N = F.n;
          const nm = this.get(x + N[0], y + N[1], z + N[2]);
          if (glass ? nm !== 0 : OPAQUE[nm]) continue;
          if (!colored) { voxRGB(m, x, y, z, paint[i], tmp); colored = true; }
          for (let c = 0; c < 4; c++) {
            if (glass) { ao[c] = 3; continue; }
            const o = F.ao[c];
            const s1 = OPAQUE[this.get(x + o[0][0], y + o[0][1], z + o[0][2])];
            const s2 = OPAQUE[this.get(x + o[1][0], y + o[1][1], z + o[1][2])];
            const cc = OPAQUE[this.get(x + o[2][0], y + o[2][1], z + o[2][2])];
            ao[c] = (s1 && s2) ? 0 : 3 - (s1 + s2 + cc);
          }
          for (let c = 0; c < 4; c++) {
            const C = F.c[c], b = AO_CURVE[ao[c]], p3 = v * 3;
            S.pos[p3] = x + C[0]; S.pos[p3 + 1] = y + C[1]; S.pos[p3 + 2] = z + C[2];
            S.nor[p3] = N[0]; S.nor[p3 + 1] = N[1]; S.nor[p3 + 2] = N[2];
            S.col[p3] = tmp[0] * b; S.col[p3 + 1] = tmp[1] * b; S.col[p3 + 2] = tmp[2] * b;
            v++;
          }
          const b0 = v - 4;
          if (ao[0] + ao[3] > ao[1] + ao[2]) {
            S.idx[k++] = b0; S.idx[k++] = b0 + 1; S.idx[k++] = b0 + 3; S.idx[k++] = b0; S.idx[k++] = b0 + 3; S.idx[k++] = b0 + 2;
          } else {
            S.idx[k++] = b0; S.idx[k++] = b0 + 1; S.idx[k++] = b0 + 2; S.idx[k++] = b0 + 2; S.idx[k++] = b0 + 1; S.idx[k++] = b0 + 3;
          }
        }
      }
    }
    if (!v) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(S.pos.slice(0, v * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(S.nor.slice(0, v * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(S.col.slice(0, v * 3), 3));
    g.setIndex(new THREE.BufferAttribute(S.idx.slice(0, k), 1));
    g.computeBoundingSphere();
    return g;
  }
  buildChunk(ci) {
    const cx = ci % this.ncx, t = (ci / this.ncx) | 0, cz = t % this.ncz, cy = (t / this.ncz) | 0;
    let ch = this.chunks[ci];
    if (!ch) ch = this.chunks[ci] = { mesh: null, glass: null };
    this.built[ci] = 1;
    const go = this.meshPass(cx << 4, cy << 4, cz << 4, 0);
    const gg = this.meshPass(cx << 4, cy << 4, cz << 4, 1);
    ch.mesh = this.swap(ch.mesh, go, this.matOpaque, true);
    ch.glass = this.swap(ch.glass, gg, this.matGlass, false);
  }
  swap(mesh, geo, mat, shadow) {
    if (mesh) { mesh.geometry.dispose(); if (!geo) { this.group.remove(mesh); return null; } mesh.geometry = geo; return mesh; }
    if (!geo) return null;
    const m = new THREE.Mesh(geo, mat);
    m.matrixAutoUpdate = false;
    if (shadow) { m.castShadow = this.shadows; m.receiveShadow = this.shadows; }
    this.group.add(m); return m;
  }
  dispose() {
    for (const ch of this.chunks) if (ch) { if (ch.mesh) ch.mesh.geometry.dispose(); if (ch.glass) ch.glass.geometry.dispose(); }
    this.scene.remove(this.group);
  }

  // Amanatides–Woo voxel traversal. Ladders are skipped unless asked for; glass optionally.
  raycast(ox, oy, oz, dx, dy, dz, maxD, skipGlass) {
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const sX = dx > 0 ? 1 : -1, sY = dy > 0 ? 1 : -1, sZ = dz > 0 ? 1 : -1;
    const tdX = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdY = dy !== 0 ? Math.abs(1 / dy) : Infinity, tdZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let tX = dx !== 0 ? (dx > 0 ? x + 1 - ox : ox - x) * tdX : Infinity;
    let tY = dy !== 0 ? (dy > 0 ? y + 1 - oy : oy - y) * tdY : Infinity;
    let tZ = dz !== 0 ? (dz > 0 ? z + 1 - oz : oz - z) * tdZ : Infinity;
    let t = 0, nx = 0, ny = 0, nz = 0;
    for (let guard = 0; guard < 2000; guard++) {
      const m = this.get(x, y, z);
      if (m && m !== M.POOL && !(skipGlass && GLASSY[m])) {
        return { x, y, z, m, nx, ny, nz, t, px: ox + dx * t, py: oy + dy * t, pz: oz + dz * t };
      }
      if (tX < tY && tX < tZ) { t = tX; tX += tdX; x += sX; nx = -sX; ny = 0; nz = 0; }
      else if (tY < tZ) { t = tY; tY += tdY; y += sY; nx = 0; ny = -sY; nz = 0; }
      else { t = tZ; tZ += tdZ; z += sZ; nx = 0; ny = 0; nz = -sZ; }
      if (t > maxD) return null;
      if (y < -2 || y > this.sy + 2) return null;
    }
    return null;
  }

  // Remove voxels in a ragged sphere. Materials harder than `power` survive; `partial` lets the next
  // grade crumble near the centre. Returns counts, a sample of what broke, and the touched box.
  carve(cx, cy, cz, r, power, partial, onRemove) {
    const x0 = Math.max(0, Math.floor(cx - r - 1)), x1 = Math.min(this.sx - 1, Math.floor(cx + r + 1));
    const y0 = Math.max(0, Math.floor(cy - r - 1)), y1 = Math.min(this.sy - 1, Math.floor(cy + r + 1));
    const z0 = Math.max(0, Math.floor(cz - r - 1)), z1 = Math.min(this.sz - 1, Math.floor(cz + r + 1));
    const res = { n: 0, samples: [], mats: {}, x0, y0, z0, x1, y1, z1 };
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const i = (y * this.sz + z) * this.sx + x, m = this.data[i];
      if (!m) continue;
      const h = HARD[m];
      const reff = h <= power ? r : (partial && h === power + 1 ? r * 0.42 : 0);
      if (!reff) continue;
      const ddx = x + 0.5 - cx, ddy = y + 0.5 - cy, ddz = z + 0.5 - cz;
      const d = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz) + (hash3(x, y, z) - 0.5) * 1.1;
      if (d > reff) continue;
      if (m === M.BARREL) this.blasts.push(x + 0.5, y + 0.5, z + 0.5);
      if (res.samples.length < 240 && (res.n < 30 || Math.random() < 0.25)) res.samples.push(x, y, z, m, this.paint[i]);
      res.mats[m] = (res.mats[m] || 0) + 1;
      this.data[i] = 0; this.paint[i] = 0; res.n++;
      if (onRemove) onRemove(i);
    }
    if (res.n) this.markRegion(x0, y0, z0, x1, y1, z1);
    return res;
  }

  // Find voxel islands near a changed box that no longer connect to the ground.
  findDetached(x0, y0, z0, x1, y1, z1) {
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); z0 = Math.max(0, z0 - 2);
    x1 = Math.min(this.sx - 1, x1 + 2); y1 = Math.min(this.sy - 1, y1 + 2); z1 = Math.min(this.sz - 1, z1 + 2);
    const data = this.data, Q = this.Q, sx = this.sx, sz = this.sz, sxz = sx * sz;
    const vis = new Map(), base = 1, out = [];
    let gen = 0;
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const i = (y * sz + z) * sx + x, m = data[i];
      if (!m || ANCHOR[m] || vis.has(i) || y === 0) continue;
      const cur = ++gen;
      let head = 0, tail = 0, anchored = false;
      Q[tail++] = i; vis.set(i, cur);
      while (head < tail && !anchored) {
        const j = Q[head++];
        const jx = j % sx, jt = (j / sx) | 0, jz = jt % sz, jy = (jt / sz) | 0;
        if (jy === 0) { anchored = true; break; }
        for (let f = 0; f < 6; f++) {
          let nb;
          if (f === 0) { if (jx + 1 >= sx) continue; nb = j + 1; }
          else if (f === 1) { if (jx === 0) continue; nb = j - 1; }
          else if (f === 2) { if (jz + 1 >= sz) continue; nb = j + sx; }
          else if (f === 3) { if (jz === 0) continue; nb = j - sx; }
          else if (f === 4) { if (jy + 1 >= this.sy) continue; nb = j + sxz; }
          else { nb = j - sxz; }
          const mm = data[nb];
          if (!mm) continue;
          if (ANCHOR[mm]) { anchored = true; break; }
          const s = vis.get(nb) || 0;
          if (s === cur) continue;
          if (s >= base) { anchored = true; break; }
          if (tail >= BFS_CAP) { anchored = true; break; }
          vis.set(nb, cur); Q[tail++] = nb;
        }
      }
      if (!anchored) out.push(Q.slice(0, tail));
    }
    return out;
  }

  // Lift a set of voxels out of the world, returning what a debris body needs to rebuild them.
  extract(list) {
    const n = list.length, sx = this.sx, sz = this.sz;
    const rec = { n, xs: new Int16Array(n), ys: new Int16Array(n), zs: new Int16Array(n), ms: new Uint8Array(n), ps: new Uint8Array(n), col: new Float32Array(n * 3) };
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1, y1 = -1, z1 = -1;
    const tmp = [0, 0, 0];
    for (let k = 0; k < n; k++) {
      const i = list[k], x = i % sx, t = (i / sx) | 0, z = t % sz, y = (t / sz) | 0;
      rec.xs[k] = x; rec.ys[k] = y; rec.zs[k] = z; rec.ms[k] = this.data[i]; rec.ps[k] = this.paint[i];
      voxRGB(rec.ms[k], x, y, z, rec.ps[k], tmp);
      rec.col[k * 3] = tmp[0]; rec.col[k * 3 + 1] = tmp[1]; rec.col[k * 3 + 2] = tmp[2];
      this.data[i] = 0; this.paint[i] = 0;
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (z < z0) z0 = z;
      if (x > x1) x1 = x; if (y > y1) y1 = y; if (z > z1) z1 = z;
    }
    rec.x0 = x0; rec.y0 = y0; rec.z0 = z0; rec.x1 = x1; rec.y1 = y1; rec.z1 = z1;
    this.markRegion(x0, y0, z0, x1, y1, z1);
    return rec;
  }

  // Count solid, non-terrain voxels in a box (demolition progress).
  countBox(x0, y0, z0, x1, y1, z1) {
    let c = 0;
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      let i = (y * this.sz + z) * this.sx + x0;
      for (let x = x0; x <= x1; x++, i++) { const m = this.data[i]; if (m && !ANCHOR[m]) c++; }
    }
    return c;
  }
}
