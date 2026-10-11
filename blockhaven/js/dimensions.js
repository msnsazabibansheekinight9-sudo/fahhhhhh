// The Cinderdeep (fiery underworld) and the Hollow (void islands) generators.
(function () {
  'use strict';
  const CS = BH.CS, CH = BH.CH, idx = BH.chunkIdx;
  const finish = b => { b.grassTint = BH.biomeRatio(b.grass); b.foliageTint = BH.biomeRatio(b.foliage); return b; };
  const CB = {
    wastes: finish(BH.biomeDef('cinder_wastes', 'Cinder Wastes', { dim: 'cinder', water: [1, 1, 1] })),
    forest: finish(BH.biomeDef('ember_forest', 'Ember Forest', { dim: 'cinder', water: [1, 1, 1] })),
    gloom: finish(BH.biomeDef('gloom_valley', 'Gloom Valley', { dim: 'cinder', water: [1, 1, 1] })),
    basin: finish(BH.biomeDef('ash_basin', 'Ash Basin', { dim: 'cinder', water: [1, 1, 1] })),
    hollow: finish(BH.biomeDef('hollow_isles', 'Hollow Isles', { dim: 'hollow', water: [1, 1, 1] })),
    hollow_outer: finish(BH.biomeDef('outer_hollow', 'Outer Hollow', { dim: 'hollow', water: [1, 1, 1] })),
  };
  BH.DIM_BIOMES = CB;
  const LAVA_SEA = 31, ROOF = 127;

  function CinderGen(seed) {
    this.seed = seed;
    this.n1 = new BH.Simplex(seed + 7001);
    this.n2 = new BH.Simplex(seed + 7002);
    this.n3 = new BH.Simplex(seed + 7003);
  }
  CinderGen.prototype.biomeAt = function (x, z) {
    const a = this.n3.noise2(x / 260, z / 260), b = this.n3.noise2(x / 260 + 400, z / 260);
    if (a > 0.3) return CB.forest; if (a < -0.35) return CB.gloom; if (b > 0.4) return CB.basin; return CB.wastes;
  };
  CinderGen.prototype.column = function (x, z) { return { h: 64, b: this.biomeAt(x, z).id, mtn: 0 }; };
  CinderGen.prototype.isCave = () => false;
  CinderGen.prototype.density = function (x, y, z) {
    const n = this.n1.noise3(x / 70, y / 38, z / 70) + this.n2.noise3(x / 24, y / 16, z / 24) * 0.35;
    // solid floor near 0 and roof near 127, open caverns between
    const fy = y / ROOF;
    const bias = Math.max(0, (0.22 - fy) * 7) + Math.max(0, (fy - 0.78) * 7) - 0.15;
    return n + bias;
  };
  CinderGen.prototype.generate = function (cx, cz) {
    const ch = new BH.Chunk(cx, cz), d = ch.data, ID = BH.ID;
    const x0 = cx * CS, z0 = cz * CS;
    const rnd = BH.mulberry32((cx * 92837111) ^ (cz * 689287499) ^ this.seed);
    // coarse density grid, trilinear interpolation
    const SX = 4, SY = 8, GX = CS / SX + 1, GY = 128 / SY + 1;
    const grid = new Float32Array(GX * GY * GX);
    for (let gz = 0; gz < GX; gz++) for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++)
      grid[(gy * GX + gz) * GX + gx] = this.density(x0 + gx * SX, gy * SY, z0 + gz * SX);
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const bio = this.biomeAt(x0 + x, z0 + z);
      ch.biome[z * CS + x] = bio.id;
      const gx = x / SX | 0, gz = z / SX | 0, fx = (x % SX) / SX, fz = (z % SX) / SX;
      for (let y = 0; y <= ROOF; y++) {
        let id = 0;
        if (y === 0 || y === ROOF || (y < 4 && rnd() < 0.5) || (y > ROOF - 4 && rnd() < 0.5)) id = ID.bedrock;
        else {
          const gy = y / SY | 0, fy = (y % SY) / SY;
          const g = (a, b, c) => grid[((gy + b) * GX + gz + c) * GX + gx + a];
          const l = (a, b, t) => a + (b - a) * t;
          const v = l(l(l(g(0, 0, 0), g(1, 0, 0), fx), l(g(0, 0, 1), g(1, 0, 1), fx), fz), l(l(g(0, 1, 0), g(1, 1, 0), fx), l(g(0, 1, 1), g(1, 1, 1), fx), fz), fy);
          if (v > 0) id = ID.ashrock;
          else if (y <= LAVA_SEA) id = ID.lava;
        }
        d[idx(x, y, z)] = id;
      }
      // surface dressing: floors are solid blocks with air above
      for (let y = ROOF - 1; y > 1; y--) {
        const i = idx(x, y, z);
        if (d[i] !== ID.ashrock) continue;
        const above = d[idx(x, y + 1, z)], below = d[idx(x, y - 1, z)];
        if (above === 0) {
          if (bio === CB.forest) { d[i] = ID.ash_soil; }
          else if (bio === CB.gloom) { d[i] = this.n2.noise2((x0 + x) / 12, (z0 + z) / 12) > 0 ? ID.gloomsand : ID.basalt; if (rnd() < 0.3) d[idx(x, y - 1, z)] = ID.gloomsand; }
          else if (bio === CB.basin) { d[i] = rnd() < 0.12 ? ID.scorch_block : ID.basalt; }
          else if (y < LAVA_SEA + 4 && rnd() < 0.4) d[i] = ID.gloomsand;
        }
        if (below === 0 && y > 60 && rnd() < 0.02) {
          // sunstone stalactite clusters on the roof
          const len = 1 + (rnd() * 4 | 0);
          for (let k = 0; k < len && y - k > 40; k++) if (!d[idx(x, y - k - 1, z)]) d[idx(x, y - k - 1, z)] = ID.sunstone;
        }
      }
    }
    // ores
    const ORES = [['ember_ore', 16, 7, 10, 118], ['cinder_gold_ore', 10, 5, 10, 118], ['duskiron_ore', 1.2, 2, 8, 24], ['scorch_block', 4, 6, 25, 40]];
    ORES.forEach(([k, tries, size, ymin, ymax]) => {
      const n = Math.floor(tries + rnd());
      for (let t = 0; t < n; t++) {
        let x = rnd() * CS | 0, y = ymin + (rnd() * (ymax - ymin) | 0), z = rnd() * CS | 0;
        for (let s = 0; s < size; s++) {
          if (x >= 0 && x < CS && z >= 0 && z < CS && y > 0 && y < ROOF) { const i = idx(x, y, z); if (d[i] === ID.ashrock) d[i] = ID[k]; }
          const r = rnd(); if (r < 0.33) x += rnd() < 0.5 ? -1 : 1; else if (r < 0.66) y += rnd() < 0.5 ? -1 : 1; else z += rnd() < 0.5 ? -1 : 1;
        }
      }
    });
    // flora
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const bio = CB[['wastes', 'forest', 'gloom', 'basin'].find(k => CB[k].id === ch.biome[z * CS + x])];
      for (let y = 34; y < ROOF - 8; y++) {
        const g = d[idx(x, y, z)];
        if (!g || d[idx(x, y + 1, z)] || !BH.BLOCKS[g].solid) continue;
        const r = rnd();
        if (bio === CB.forest && r < 0.025 && x > 2 && x < 13 && z > 2 && z < 13) this.emberTree(d, x, y + 1, z, rnd);
        else if (bio === CB.forest && r < 0.12) d[idx(x, y + 1, z)] = ID.glowshroom;
        else if (bio === CB.gloom && r < 0.03) d[idx(x, y + 1, z)] = ID.glowshroom;
        else if (bio === CB.basin && r < 0.006 && x > 1 && x < 14 && z > 1 && z < 14) { const h = 3 + (rnd() * 8 | 0); for (let k = 1; k <= h; k++) if (!d[idx(x, y + k, z)]) d[idx(x, y + k, z)] = ID.basalt; }
        else if (bio === CB.wastes && r < 0.004) d[idx(x, y + 1, z)] = rnd() < 0.5 ? ID.red_mushroom : ID.brown_mushroom;
      }
    }
    if (BH.Structures) BH.Structures.apply(this, ch, 'cinder');
    ch.recalc();
    return ch;
  };
  CinderGen.prototype.emberTree = function (d, x, y, z, rnd) {
    const ID = BH.ID, h = 4 + (rnd() * 4 | 0);
    for (let k = 0; k < h; k++) if (y + k < ROOF) d[idx(x, y + k, z)] = ID.emberwood_stem;
    for (let dy = -2; dy <= 0; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
      const r = dy === 0 ? 1 : 2;
      if (Math.abs(dx) > r || Math.abs(dz) > r) continue;
      const yy = y + h + dy; if (yy >= ROOF) continue;
      const i = idx(x + dx, yy, z + dz);
      if (!d[i]) d[i] = (rnd() < 0.08 && dy < 0) ? ID.sunstone : ID.ember_cap;
    }
    if (y + h < ROOF) d[idx(x, y + h, z)] = ID.ember_cap;
  };
  CinderGen.prototype.spawnPoint = function (world, x, z) {
    for (let r = 0; r < 64; r += 4) for (let a = 0; a < 8; a++) {
      const xx = Math.floor(x + Math.cos(a) * r), zz = Math.floor(z + Math.sin(a) * r);
      for (let y = LAVA_SEA + 2; y < 110; y++) {
        const b = world.getBlock(xx, y - 1, zz);
        if (b && BH.BLOCKS[b].solid && !world.getBlock(xx, y, zz) && !world.getBlock(xx, y + 1, zz) && !world.getBlock(xx, y + 2, zz)) return { x: xx, y, z: zz };
      }
    }
    return null;
  };

  // ---------- the Hollow
  function HollowGen(seed) {
    this.seed = seed;
    this.n1 = new BH.Simplex(seed + 9001);
    this.n2 = new BH.Simplex(seed + 9002);
    this.pillars = [];
    const r = BH.mulberry32(seed + 9003);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      this.pillars.push({ x: Math.round(Math.cos(a) * 42), z: Math.round(Math.sin(a) * 42), r: 2 + (r() * 3 | 0), h: 76 + (r() * 10 | 0) * 3, caged: r() < 0.25 });
    }
  }
  HollowGen.prototype.column = function (x, z) {
    return { h: 64, b: (x * x + z * z > 300 * 300 ? CB.hollow_outer : CB.hollow).id, mtn: 0 };
  };
  HollowGen.prototype.isCave = () => false;
  HollowGen.prototype.generate = function (cx, cz) {
    const ch = new BH.Chunk(cx, cz), d = ch.data, ID = BH.ID;
    const x0 = cx * CS, z0 = cz * CS;
    const rnd = BH.mulberry32((cx * 11939) ^ (cz * 71993) ^ this.seed);
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const wx = x0 + x, wz = z0 + z, r = Math.sqrt(wx * wx + wz * wz);
      const outer = r > 300;
      ch.biome[z * CS + x] = (outer ? CB.hollow_outer : CB.hollow).id;
      let top = -1, bottom = 0;
      if (!outer) {
        const edge = 78 + this.n1.noise2(wx / 30, wz / 30) * 10;
        if (r < edge) { top = 62 + Math.round(this.n1.noise2(wx / 20, wz / 20) * 1.5); bottom = Math.round(62 - (edge - r) * 0.55 - this.n2.noise2(wx / 12, wz / 12) * 4); }
      } else if (r > 420) {
        const n = this.n1.noise2(wx / 90, wz / 90) * 0.7 + this.n2.noise2(wx / 30, wz / 30) * 0.3;
        if (n > 0.18) { top = 60 + Math.round((n - 0.18) * 30); bottom = top - Math.round((n - 0.18) * 60) - 2; }
      }
      for (let y = Math.max(1, bottom); y <= top; y++) d[idx(x, y, z)] = ID.voidstone;
      if (outer && top > 0 && rnd() < 0.012 && x > 1 && x < 14 && z > 1 && z < 14) {
        const h = 2 + (rnd() * 5 | 0);
        for (let k = 1; k <= h; k++) d[idx(x, top + k, z)] = ID.drift_bloom;
      }
    }
    // obsidian pillars
    this.pillars.forEach(p => {
      for (let y = 40; y <= p.h; y++) for (let dz = -p.r; dz <= p.r; dz++) for (let dx = -p.r; dx <= p.r; dx++) {
        if (dx * dx + dz * dz > p.r * p.r + 1) continue;
        const lx = p.x + dx - x0, lz = p.z + dz - z0;
        if (lx < 0 || lz < 0 || lx >= CS || lz >= CS) continue;
        d[idx(lx, y, lz)] = ID.obsidian;
      }
      const lx = p.x - x0, lz = p.z - z0;
      if (lx >= 0 && lz >= 0 && lx < CS && lz < CS) d[idx(lx, p.h + 1, lz)] = ID.bedrock;
    });
    // arrival platform
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const lx = 100 + dx - x0, lz = dz - z0;
      if (lx < 0 || lz < 0 || lx >= CS || lz >= CS) continue;
      d[idx(lx, 58, lz)] = ID.obsidian;
      for (let y = 59; y < 62; y++) d[idx(lx, y, lz)] = 0;
    }
    if (BH.Structures) BH.Structures.apply(this, ch, 'hollow');
    ch.recalc();
    return ch;
  };

  BH.CinderGen = CinderGen;
  BH.HollowGen = HollowGen;
  BH.LAVA_SEA = LAVA_SEA;
})();
