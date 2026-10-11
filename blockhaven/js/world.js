// Terrain generation, biomes, chunk storage, meshing and the block shader.
(function () {
  'use strict';
  const CS = 16, CH = 160, SEA = 63;
  const B = () => BH.BLOCKS;
  let ID;

  const rgb = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
  const REF_GRASS = rgb(0x91bd59);
  const ratio = h => { const c = rgb(h); return c.map((v, i) => Math.min(1.5, Math.max(0.4, v / REF_GRASS[i]))); };

  // ---------- biomes
  const BIOMES = [];
  function biome(key, name, o) { const b = Object.assign({ id: BIOMES.length, key, name, top: 'grass', filler: 'dirt', grass: 0x91bd59, foliage: 0x77ab2f, water: [0.42, 0.6, 0.95], trees: [], treeChance: 0, plants: [], plantChance: 0, cold: false }, o); BIOMES.push(b); return b; }
  biome('ocean', 'Ocean', { top: 'gravel', filler: 'gravel' });
  biome('frozen_ocean', 'Frozen Ocean', { top: 'gravel', filler: 'gravel', cold: true, water: [0.4, 0.5, 0.9] });
  biome('beach', 'Beach', { top: 'sand', filler: 'sand' });
  biome('snowy_beach', 'Snowy Beach', { top: 'sand', filler: 'sand', cold: true });
  biome('plains', 'Plains', { trees: [['oak', 1]], treeChance: 0.002, plants: [['tall_grass', 30], ['dandelion', 2], ['poppy', 2], ['cornflower', 1], ['pumpkin', 0.05]], plantChance: 0.35 });
  biome('forest', 'Forest', { grass: 0x79c05a, foliage: 0x59ae30, trees: [['oak', 4], ['birch', 1], ['big_oak', 0.4]], treeChance: 0.05, plants: [['tall_grass', 20], ['poppy', 1], ['dandelion', 1], ['fern', 2], ['brown_mushroom', 0.3]], plantChance: 0.25 });
  biome('birch_forest', 'Birch Forest', { grass: 0x88bb67, foliage: 0x6ba941, trees: [['birch', 1]], treeChance: 0.05, plants: [['tall_grass', 20], ['dandelion', 2], ['poppy', 2]], plantChance: 0.25 });
  biome('dark_forest', 'Dark Forest', { grass: 0x507a32, foliage: 0x407a20, trees: [['dark_oak', 5], ['huge_mushroom', 0.3], ['oak', 1]], treeChance: 0.09, plants: [['tall_grass', 10], ['red_mushroom', 1], ['brown_mushroom', 1]], plantChance: 0.2 });
  biome('taiga', 'Taiga', { grass: 0x86b783, foliage: 0x68a464, top: 'grass', trees: [['spruce', 1]], treeChance: 0.05, plants: [['fern', 10], ['tall_grass', 8], ['brown_mushroom', 0.3]], plantChance: 0.25, podzol: true });
  biome('snowy_taiga', 'Snowy Taiga', { top: 'snowy_grass', grass: 0x80b497, foliage: 0x60a17b, cold: true, trees: [['spruce', 1]], treeChance: 0.04, plants: [['fern', 3]], plantChance: 0.1 });
  biome('snowy_plains', 'Snowy Plains', { top: 'snowy_grass', grass: 0x80b497, cold: true, trees: [['spruce', 1]], treeChance: 0.002 });
  biome('desert', 'Desert', { top: 'sand', filler: 'sand', grass: 0xbfb755, trees: [['cactus', 1]], treeChance: 0.006, plants: [['dead_bush', 1]], plantChance: 0.01 });
  biome('savanna', 'Savanna', { grass: 0xbfb755, foliage: 0xaea42a, trees: [['acacia', 3], ['oak', 0.5]], treeChance: 0.006, plants: [['tall_grass', 1]], plantChance: 0.4 });
  biome('jungle', 'Jungle', { grass: 0x59c93c, foliage: 0x30bb0b, trees: [['jungle', 2], ['jungle_bush', 3], ['big_jungle', 0.4]], treeChance: 0.12, plants: [['fern', 6], ['tall_grass', 10], ['melon', 0.2]], plantChance: 0.4 });
  biome('swamp', 'Swamp', { grass: 0x6a7039, foliage: 0x6a7039, water: [0.3, 0.38, 0.3], trees: [['swamp_oak', 1]], treeChance: 0.012, plants: [['tall_grass', 6], ['blue_orchid', 1], ['brown_mushroom', 0.5]], plantChance: 0.3 });
  biome('badlands', 'Badlands', { top: 'red_sand', filler: 'terracotta', grass: 0x90814d, trees: [['cactus', 1]], treeChance: 0.002, plants: [['dead_bush', 1]], plantChance: 0.02 });
  biome('mountains', 'Stony Peaks', { top: 'stone', filler: 'stone', grass: 0x8ab689, foliage: 0x6da36b, trees: [['spruce', 1]], treeChance: 0.004 });
  biome('mushroom_fields', 'Mushroom Fields', { top: 'mycelium', grass: 0x55c93f, trees: [['huge_mushroom', 1]], treeChance: 0.008, plants: [['red_mushroom', 1], ['brown_mushroom', 1]], plantChance: 0.04 });
  biome('river', 'River', { top: 'sand', filler: 'dirt' });
  biome('meadow', 'Meadow', { grass: 0x83bb6d, trees: [['birch', 1], ['oak', 1]], treeChance: 0.001, plants: [['tall_grass', 20], ['dandelion', 5], ['poppy', 5], ['cornflower', 5], ['blue_orchid', 1]], plantChance: 0.6 });
  biome('frozen_river', 'Frozen River', { top: 'sand', filler: 'dirt', cold: true });
  const BI = {}; BIOMES.forEach(b => BI[b.key] = b.id);
  BIOMES.forEach(b => { b.grassTint = ratio(b.grass); b.foliageTint = ratio(b.foliage); });

  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  function Generator(seed) {
    this.seed = seed;
    this.n1 = new BH.Simplex(seed);
    this.n2 = new BH.Simplex(seed + 101);
    this.n3 = new BH.Simplex(seed + 202);
    this.n4 = new BH.Simplex(seed + 303);
    this.cave = new BH.Simplex(seed + 404);
    this.cave2 = new BH.Simplex(seed + 505);
    this.rock = new BH.Simplex(seed + 606);
  }
  // Returns surface height and biome for a column.
  Generator.prototype.column = function (x, z) {
    const n1 = this.n1, n2 = this.n2, n3 = this.n3;
    const cont = n1.fbm2(x / 720, z / 720, 4) + 0.12;
    const ero = n2.fbm2(x / 420 + 100, z / 420, 3);
    const temp = n3.fbm2(x / 1100 + 500, z / 1100, 2) * 1.6;
    const humid = n3.fbm2(x / 900, z / 900 + 900, 2) * 1.6;
    const detail = n1.fbm2(x / 70 + 50, z / 70, 3);
    const ridge = 1 - Math.abs(n2.noise2(x / 260, z / 260));
    const land = smooth(-0.22, -0.08, cont);
    let landH = 66 + cont * 16 + detail * (4 + Math.max(0, -ero) * 9);
    const mtn = smooth(0.12, 0.45, cont) * smooth(-0.1, 0.3, -ero);
    landH += mtn * ridge * ridge * 62;
    const oceanH = Math.max(32, 58 - (-cont - 0.1) * 60 + detail * 3);
    let h = lerp(oceanH, landH, land);
    // badlands plateaus, swamp flats
    const bad = smooth(0.35, 0.55, temp) * smooth(0.2, 0.45, -humid) * land;
    if (bad > 0) { const p = 74 + Math.floor(n2.noise2(x / 120, z / 120) * 3) * 6; h = lerp(h, Math.max(h, p), bad * smooth(0.4, 0.6, n1.noise2(x / 90, z / 90) * 0.5 + 0.5)); }
    const sw = smooth(0.35, 0.55, humid) * smooth(-0.3, -0.1, temp) * smooth(0.3, 0.1, Math.abs(temp)) * (1 - mtn);
    if (sw > 0) h = lerp(h, 62.6 + detail * 1.5, sw * 0.85);
    // rivers
    const rv = Math.abs(n3.noise2(x / 380 + 33, z / 380 - 71));
    let river = false;
    if (land > 0.5 && mtn < 0.5) {
      const rf = smooth(0.012, 0.05, rv);
      if (rf < 1) { h = lerp(Math.min(h, 57), h, rf); if (rv < 0.03) river = true; }
    }
    h = Math.floor(h);
    // biome
    let b;
    const cold = temp < -0.45;
    if (h < SEA) {
      if (river) b = cold ? BI.frozen_river : BI.river;
      else b = cold ? BI.frozen_ocean : BI.ocean;
    } else if (h <= SEA + 1 && land < 0.98 && !(sw > 0.4)) b = cold ? BI.snowy_beach : BI.beach;
    else if (river && h <= SEA + 1) b = cold ? BI.frozen_river : BI.river;
    else if (mtn > 0.35 && h > 92) b = BI.mountains;
    else if (bad > 0.4) b = BI.badlands;
    else if (sw > 0.4) b = BI.swamp;
    else if (n4mush(this, x, z) && land > 0.9) b = BI.mushroom_fields;
    else if (cold) b = humid > 0 ? BI.snowy_taiga : BI.snowy_plains;
    else if (temp < -0.15) b = humid > -0.1 ? BI.taiga : (h > 80 ? BI.meadow : BI.plains);
    else if (temp < 0.35) {
      if (humid < -0.3) b = BI.plains;
      else if (humid < -0.05) b = h > 82 ? BI.meadow : BI.forest;
      else if (humid < 0.25) b = BI.birch_forest;
      else b = BI.dark_forest;
      if (humid > -0.3 && humid < -0.15 && temp > 0.1) b = BI.forest;
    } else {
      if (humid < -0.15) b = BI.desert;
      else if (humid < 0.25) b = BI.savanna;
      else b = BI.jungle;
    }
    return { h, b, mtn };
  };
  function n4mush(g, x, z) { return g.n4.noise2(x / 420, z / 420) > 0.72; }

  Generator.prototype.isCave = function (x, y, z, h) {
    if (y < 5 || y > h - 1) return false;
    const c = this.cave, c2 = this.cave2;
    const a = c.noise3(x / 48, y / 32, z / 48), bb = c2.noise3(x / 48, y / 32, z / 48);
    const w = 0.07 + (y < 30 ? 0.02 : 0);
    if (Math.abs(a) < w && Math.abs(bb) < w) return true;
    if (y < 48 && c.noise3(x / 90 + 300, y / 40, z / 90) > 0.62) return true;
    return false;
  };

  // ---------- chunk
  function Chunk(cx, cz) {
    this.cx = cx; this.cz = cz;
    this.data = new Uint8Array(CS * CS * CH);
    this.meta = new Uint8Array(CS * CS * CH);
    this.biome = new Uint8Array(CS * CS);
    this.maxY = 0;
    this.meshes = null;
    this.dirty = true;
    this.lights = [];
    this.loot = new Map();
    this.cages = new Map();
    this.npcs = [];
  }
  const idx = (x, y, z) => (y * CS + z) * CS + x;
  Chunk.prototype.get = function (x, y, z) { return y < 0 || y >= CH ? 0 : this.data[idx(x, y, z)]; };
  Chunk.prototype.recalc = function () {
    let my = 0; const L = [];
    const blocks = B();
    for (let i = 0; i < this.data.length; i++) {
      const id = this.data[i];
      if (!id) continue;
      const y = (i / (CS * CS)) | 0;
      if (y > my) my = y;
      const lv = blocks[id].light;
      if (lv) {
        const x = i % CS, z = ((i / CS) | 0) % CS;
        if (id === ID.lava && y + 1 < CH && this.data[i + CS * CS] === ID.lava) continue;
        L.push(this.cx * CS + x, y, this.cz * CS + z, lv);
      }
    }
    this.maxY = my; this.lights = L;
  };

  Generator.prototype.generate = function (cx, cz) {
    if (!ID) ID = BH.ID;
    const ch = new Chunk(cx, cz);
    const d = ch.data;
    const cols = [];
    const x0 = cx * CS, z0 = cz * CS;
    const rnd = BH.mulberry32((cx * 73856093) ^ (cz * 19349663) ^ this.seed);
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const wx = x0 + x, wz = z0 + z;
      const col = this.column(wx, wz);
      cols.push(col);
      const bio = BIOMES[col.b];
      ch.biome[z * CS + x] = col.b;
      const h = col.h;
      let top = bio.top, filler = bio.filler;
      if (bio.key === 'mountains' && h > 118) top = 'snow_block';
      else if (bio.key === 'mountains' && BH.hash3(wx, 0, wz, 9) < 0.3) top = 'grass';
      if (bio.podzol && this.n4.noise2(wx / 30, wz / 30) > 0.4) top = 'podzol';
      if (bio.key === 'savanna' && this.n4.noise2(wx / 25, wz / 25) > 0.55) top = 'coarse_dirt';
      if (bio.key === 'swamp' && h < SEA + 1 && BH.hash3(wx, 1, wz, 3) < 0.3) top = 'mud';
      if (h < SEA - 1 && (top === 'grass' || top === 'snowy_grass' || top === 'mycelium' || top === 'podzol')) { top = 'dirt'; }
      if (h < SEA && bio.key !== 'ocean' && bio.key !== 'frozen_ocean') { top = BH.hash3(wx, 2, wz, 7) < 0.5 ? 'sand' : (h < SEA - 3 ? 'clay' : 'sand'); filler = 'dirt'; }
      if ((bio.key === 'ocean' || bio.key === 'frozen_ocean') && this.n4.noise2(wx / 40, wz / 40) > 0.1) { top = 'sand'; filler = 'sand'; }
      const topId = ID[top], fillId = ID[filler];
      const deep = bio.key === 'badlands';
      for (let y = 0; y <= h && y < CH; y++) {
        let id;
        if (y === 0 || (y < 4 && rnd() < 0.5 - y * 0.12)) id = ID.bedrock;
        else if (y === h) id = topId;
        else if (y > h - 4) id = fillId;
        else if (deep && y > 62) {
          const band = (y + Math.floor(this.n4.noise2(wx / 60, wz / 60) * 3)) % 9;
          id = [ID.terracotta, ID.terracotta_orange, ID.terracotta_yellow, ID.terracotta, ID.terracotta_brown, ID.terracotta_white, ID.terracotta_red, ID.terracotta, ID.terracotta_orange][band];
        } else if (y < 14) id = ID.slate;
        else {
          id = ID.stone;
          const r = this.rock.noise3(wx / 24, y / 18, wz / 24);
          if (r > 0.55) { const k = this.rock.noise3(wx / 80 + 9, y / 80, wz / 80); id = k < -0.2 ? ID.granite : k < 0.2 ? ID.diorite : ID.andesite; }
          else if (r < -0.68 && y < 40) id = ID.tuff;
        }
        if (top === 'sand' && y > h - 4 && y < h - 1 && bio.key === 'desert') id = ID.sandstone;
        d[idx(x, y, z)] = id;
      }
      if (bio.key === 'badlands') for (let y = h - 3; y < h; y++) if (y > 62) d[idx(x, y, z)] = ID.terracotta_orange + ((y % 3) ? 0 : 1);
      // caves
      const caveTop = h < SEA + 2 ? h - 7 : h + 1;
      for (let y = 1; y < caveTop; y++) {
        if (this.isCave(wx, y, wz, h + 1)) d[idx(x, y, z)] = y <= 10 ? ID.lava : 0;
      }
      // water
      for (let y = h + 1; y <= SEA; y++) d[idx(x, y, z)] = (y === SEA && bio.cold) ? ID.ice : ID.water;
    }
    // ores
    const ORES = [['coal_ore', 20, 5, 10, 130], ['iron_ore', 12, 5, 5, 72], ['copper_ore', 8, 6, 30, 90], ['gold_ore', 3, 5, 5, 32], ['lapis_ore', 2, 5, 5, 30], ['cinnabar_ore', 5, 6, 3, 16], ['diamond_ore', 1.6, 4, 3, 16], ['emerald_ore', 1, 1, 60, 140]];
    ORES.forEach(([k, tries, size, ymin, ymax]) => {
      let n = Math.floor(tries + rnd());
      if (k === 'emerald_ore' && !cols.some(c => BIOMES[c.b].key === 'mountains')) n = 0;
      for (let t = 0; t < n; t++) {
        let x = (rnd() * CS) | 0, y = ymin + ((rnd() * (ymax - ymin)) | 0), z = (rnd() * CS) | 0;
        for (let s = 0; s < size; s++) {
          if (x >= 0 && x < CS && z >= 0 && z < CS && y > 0 && y < CH) {
            const i = idx(x, y, z), c = d[i];
            if (c === ID.stone || c === ID.slate || c === ID.andesite || c === ID.diorite || c === ID.granite || c === ID.tuff) d[i] = (c === ID.slate && k === 'diamond_ore') ? ID.slate_diamond_ore : ID[k];
          }
          const r = rnd(); if (r < 0.33) x += rnd() < 0.5 ? -1 : 1; else if (r < 0.66) y += rnd() < 0.5 ? -1 : 1; else z += rnd() < 0.5 ? -1 : 1;
        }
      }
    });
    // gravel / dirt pockets
    for (let t = 0; t < 4; t++) {
      const cx2 = (rnd() * CS) | 0, cy = 10 + ((rnd() * 60) | 0), cz2 = (rnd() * CS) | 0, id = rnd() < 0.5 ? ID.gravel : ID.dirt;
      for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const x = cx2 + dx, y = cy + dy, z = cz2 + dz;
        if (x < 0 || z < 0 || x >= CS || z >= CS || dx * dx + dy * dy + dz * dz > 5) continue;
        if (d[idx(x, y, z)] === ID.stone) d[idx(x, y, z)] = id;
      }
    }
    this.decorate(ch, cols);
    if (BH.Structures) BH.Structures.apply(this, ch, 'over');
    ch.recalc();
    return ch;
  };

  // ---------- trees & plants
  Generator.prototype.decorate = function (ch, cols) {
    const x0 = ch.cx * CS, z0 = ch.cz * CS, d = ch.data;
    const put = (x, y, z, id, force) => {
      x -= x0; z -= z0;
      if (x < 0 || z < 0 || x >= CS || z >= CS || y < 1 || y >= CH) return;
      const i = idx(x, y, z), c = d[i];
      if (force || c === 0 || B()[c].replaceable && c !== ID.water || (B()[c].leaves && !B()[id].leaves)) d[i] = id;
    };
    const M = 6;
    for (let wz = z0 - M; wz < z0 + CS + M; wz++) for (let wx = x0 - M; wx < x0 + CS + M; wx++) {
      const r = BH.hash3(wx, 7, wz, this.seed);
      const inside = wx >= x0 && wz >= z0 && wx < x0 + CS && wz < z0 + CS;
      const col = inside ? cols[(wz - z0) * CS + (wx - x0)] : null;
      // cheap reject before computing columns outside the chunk
      if (r > 0.13 && !inside) continue;
      const c = col || this.column(wx, wz);
      const bio = BIOMES[c.b];
      const h = c.h;
      if (h < SEA || h >= CH - 20) continue;
      const surf = bio.top;
      if (r < bio.treeChance) {
        if (this.isCave(wx, h, wz, h + 1)) continue;
        const kind = pick(bio.trees, BH.hash3(wx, 8, wz, this.seed));
        this.tree(kind, wx, h + 1, wz, put, BH.mulberry32((wx * 31 + wz * 17) ^ this.seed));
        continue;
      }
      if (!inside) continue;
      const lx = wx - x0, lz = wz - z0;
      const ground = d[idx(lx, h, lz)];
      if (d[idx(lx, h + 1, lz)] !== 0) continue;
      const gid = ground;
      const r2 = BH.hash3(wx, 9, wz, this.seed);
      // sugar cane next to water
      if ((gid === ID.sand || gid === ID.grass || gid === ID.dirt) && h === SEA && r2 < 0.08) {
        const nearW = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b2]) => { const xx = lx + a, zz = lz + b2; return xx >= 0 && zz >= 0 && xx < CS && zz < CS && d[idx(xx, h, zz)] === ID.water; });
        if (nearW) { const hh = 1 + ((r2 * 40) | 0) % 3; for (let k = 1; k <= hh; k++) d[idx(lx, h + k, lz)] = ID.sugar_cane; continue; }
      }
      if (r2 < bio.plantChance && bio.plants.length) {
        const p = pick(bio.plants, BH.hash3(wx, 10, wz, this.seed));
        const okGround = gid === ID.grass || gid === ID.podzol || gid === ID.coarse_dirt || gid === ID.mycelium || gid === ID.dirt || ((p === 'dead_bush') && (gid === ID.sand || gid === ID.red_sand || gid === ID.terracotta));
        if (okGround && ID[p] !== undefined) {
          if (p === 'pumpkin' || p === 'melon') d[idx(lx, h + 1, lz)] = ID[p];
          else d[idx(lx, h + 1, lz)] = ID[p];
        }
      }
      if (bio.cold && gid !== ID.water && gid !== ID.ice && B()[gid].solid && !B()[gid].leaves && gid !== ID.snowy_grass && gid === ID.grass) d[idx(lx, h, lz)] = ID.snowy_grass;
    }
    // snow on top of leaves in cold biomes
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const bio = BIOMES[ch.biome[z * CS + x]];
      if (!bio.cold) continue;
      for (let y = CH - 2; y > SEA; y--) { const c = d[idx(x, y, z)]; if (!c) continue; if (c === ID.grass) d[idx(x, y, z)] = ID.snowy_grass; break; }
    }
  };
  function pick(list, r) {
    let tot = 0; list.forEach(e => tot += e[1]);
    let a = r * tot;
    for (const e of list) { a -= e[1]; if (a <= 0) return e[0]; }
    return list[0][0];
  }
  Generator.prototype.tree = function (kind, x, y, z, put, rnd) {
    const blob = (cx, cy, cz, r, leaf, ry) => {
      ry = ry || r;
      for (let dy = -ry; dy <= ry; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const dd = dx * dx / (r * r + 0.5) + dy * dy / (ry * ry + 0.5) + dz * dz / (r * r + 0.5);
        if (dd <= 1 && !(dd > 0.8 && rnd() < 0.35)) put(cx + dx, cy + dy, cz + dz, leaf);
      }
    };
    const classic = (log, leaf, hgt) => {
      for (let i = 0; i < hgt; i++) put(x, y + i, z, log, true);
      for (let dy = -2; dy <= 1; dy++) {
        const r = dy >= 0 ? 1 : 2;
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && (dy === 1 || rnd() < 0.5)) continue;
          put(x + dx, y + hgt - 1 + dy, z + dz, leaf);
        }
      }
      put(x, y + hgt, z, leaf);
    };
    switch (kind) {
      case 'oak': classic(ID.oak_log, ID.oak_leaves, 4 + ((rnd() * 3) | 0)); break;
      case 'swamp_oak': classic(ID.oak_log, ID.oak_leaves, 5 + ((rnd() * 2) | 0)); break;
      case 'birch': classic(ID.birch_log, ID.birch_leaves, 5 + ((rnd() * 3) | 0)); break;
      case 'big_oak': {
        const hgt = 8 + ((rnd() * 5) | 0);
        for (let i = 0; i < hgt; i++) put(x, y + i, z, ID.oak_log, true);
        for (let b = 0; b < 4; b++) {
          const a = rnd() * 6.28, by = y + 4 + ((rnd() * (hgt - 5)) | 0), l = 2 + ((rnd() * 2) | 0);
          const ex = Math.round(x + Math.cos(a) * l), ez = Math.round(z + Math.sin(a) * l);
          for (let s = 1; s <= l; s++) put(Math.round(x + Math.cos(a) * s), by + (s >> 1), Math.round(z + Math.sin(a) * s), ID.oak_log, true);
          blob(ex, by + (l >> 1) + 1, ez, 2, ID.oak_leaves, 1);
        }
        blob(x, y + hgt, z, 3, ID.oak_leaves, 2);
        break;
      }
      case 'spruce': {
        const hgt = 7 + ((rnd() * 5) | 0);
        for (let i = 0; i < hgt; i++) put(x, y + i, z, ID.spruce_log, true);
        let r = 0;
        for (let yy = y + hgt; yy >= y + 2; yy--) {
          for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dz) <= r + (r > 1 ? 1 : 0)) put(x + dx, yy, z + dz, ID.spruce_leaves);
          r = r >= 3 || (yy - y) % 2 === 0 && r >= 2 ? (r > 1 ? r - 1 : 1) : r + 1;
          if (yy === y + hgt) r = 1;
        }
        put(x, y + hgt + 1, z, ID.spruce_leaves);
        break;
      }
      case 'jungle': {
        const hgt = 8 + ((rnd() * 7) | 0);
        for (let i = 0; i < hgt; i++) put(x, y + i, z, ID.jungle_log, true);
        blob(x, y + hgt, z, 3, ID.jungle_leaves, 2);
        break;
      }
      case 'big_jungle': {
        const hgt = 16 + ((rnd() * 10) | 0);
        for (let i = 0; i < hgt; i++) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) put(x + a, y + i, z + b, ID.jungle_log, true);
        blob(x, y + hgt, z, 5, ID.jungle_leaves, 2);
        for (let b = 0; b < 3; b++) { const by = y + hgt - 4 - b * 4, a = rnd() * 6.28; blob(Math.round(x + Math.cos(a) * 4), by, Math.round(z + Math.sin(a) * 4), 2, ID.jungle_leaves, 1); }
        break;
      }
      case 'jungle_bush': put(x, y, z, ID.jungle_log, true); blob(x, y + 1, z, 2, ID.oak_leaves, 1); break;
      case 'acacia': {
        const hgt = 4 + ((rnd() * 2) | 0);
        const dx = rnd() < 0.5 ? 1 : -1, dz = rnd() < 0.5 ? 1 : -1;
        let cx = x, cz = z;
        for (let i = 0; i < hgt + 2; i++) { if (i >= hgt - 1) { cx += dx; cz += dz; } put(cx, y + i, cz, ID.acacia_log, true); }
        const ty = y + hgt + 2;
        for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) if (Math.abs(a) + Math.abs(b) <= 4) put(cx + a, ty, cz + b, ID.acacia_leaves);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) put(cx + a, ty + 1, cz + b, ID.acacia_leaves);
        break;
      }
      case 'dark_oak': {
        const hgt = 6 + ((rnd() * 3) | 0);
        for (let i = 0; i < hgt; i++) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) put(x + a, y + i, z + b, ID.dark_oak_log, true);
        blob(x, y + hgt, z, 4, ID.dark_oak_leaves, 2);
        break;
      }
      case 'huge_mushroom': {
        const hgt = 5 + ((rnd() * 3) | 0);
        for (let i = 0; i < hgt; i++) put(x, y + i, z, ID.mushroom_stem, true);
        for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
          if (Math.abs(a) === 2 && Math.abs(b) === 2) continue;
          put(x + a, y + hgt, z + b, ID.mushroom_block);
          if (Math.abs(a) === 2 || Math.abs(b) === 2) { put(x + a, y + hgt - 1, z + b, ID.mushroom_block); put(x + a, y + hgt - 2, z + b, ID.mushroom_block); }
        }
        break;
      }
      case 'cactus': { const hgt = 1 + ((rnd() * 3) | 0); for (let i = 0; i < hgt; i++) put(x, y + i, z, ID.cactus); break; }
    }
  };

  // ---------- shader
  const VERT = `
    attribute vec3 lit; attribute vec3 tint;
    varying vec2 vUv; varying vec3 vLit; varying vec3 vTint; varying float vDist;
    void main() {
      vUv = uv; vLit = lit; vTint = tint;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vDist = length(mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`;
  const FRAG = `
    uniform sampler2D map; uniform float daylight; uniform vec3 fogColor; uniform float fogNear; uniform float fogFar; uniform float opacity; uniform float alphaTest; uniform float ambient;
    varying vec2 vUv; varying vec3 vLit; varying vec3 vTint; varying float vDist;
    void main() {
      vec4 t = texture2D(map, vUv);
      if (t.a < alphaTest) discard;
      float sky = vLit.y * daylight;
      float bl = vLit.z;
      float L = max(max(sky, bl), ambient);
      vec3 warm = mix(vec3(1.0), vec3(1.0, 0.86, 0.66), clamp(bl - sky, 0.0, 1.0));
      vec3 c = t.rgb * vTint * vLit.x * (0.035 + 0.965 * L * L * (3.0 - 2.0 * L) * 0.5 + 0.965 * L * 0.5) * warm;
      float f = smoothstep(fogNear, fogFar, vDist);
      gl_FragColor = vec4(mix(c, fogColor, f), t.a * opacity);
    }`;
  function makeMaterials() {
    const tex = new THREE.CanvasTexture(BH.atlas);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    tex.flipY = false;
    const uniforms = () => ({ map: { value: tex }, daylight: { value: 1 }, fogColor: { value: new THREE.Color(0x9cc4ff) }, fogNear: { value: 60 }, fogFar: { value: 100 }, opacity: { value: 1 }, alphaTest: { value: 0.5 }, ambient: { value: 0 } });
    const solid = new THREE.ShaderMaterial({ uniforms: uniforms(), vertexShader: VERT, fragmentShader: FRAG });
    const cutout = new THREE.ShaderMaterial({ uniforms: uniforms(), vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide });
    const water = new THREE.ShaderMaterial({ uniforms: uniforms(), vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    water.uniforms.opacity.value = 0.78; water.uniforms.alphaTest.value = 0.01;
    return { tex, solid, cutout, water, all: [solid, cutout, water] };
  }

  // ---------- mesher
  const FACES = [
    // dir, normal, corners (u,v order), shade
    { d: [1, 0, 0], c: [[1, 1, 1], [1, 0, 1], [1, 0, 0], [1, 1, 0]], s: 0.8, f: 'side' },
    { d: [-1, 0, 0], c: [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]], s: 0.8, f: 'side' },
    { d: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], s: 1.0, f: 'top' },
    { d: [0, -1, 0], c: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]], s: 0.5, f: 'bottom' },
    { d: [0, 0, 1], c: [[0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1]], s: 0.65, f: 'side' },
    { d: [0, 0, -1], c: [[1, 1, 0], [1, 0, 0], [0, 0, 0], [0, 1, 0]], s: 0.65, f: 'side' },
  ];
  // facing meta 0..3 = +z, -x, -z, +x (direction the front points)
  const FRONT_FACE = [4, 1, 5, 0];
  const UVS = [[0, 0], [0, 1], [1, 1], [1, 0]];

  function World(seed, scene, dim) {
    if (!ID) ID = BH.ID;
    this.seed = seed;
    this.dim = dim || 'over';
    this.gen = this.dim === 'cinder' ? new BH.CinderGen(seed) : this.dim === 'hollow' ? new BH.HollowGen(seed) : new Generator(seed);
    this.scene = scene;
    this.chunks = new Map();
    this.mods = new Map();
    this.mats = makeMaterials();
    this.genQueue = [];
    this.radius = 6;
    this.blockData = new Map(); // "x,y,z" -> container data (chest/furnace)
    this.opaque = new Uint8Array(256);
    this.lightBlock = new Uint8Array(256);
    B().forEach(b => { this.opaque[b.id] = (b.id && !b.transparent && !b.liquid && !b.cross) ? 1 : 0; this.lightBlock[b.id] = (b.id && !b.cross && !b.transparent && !b.liquid) ? 1 : 0; });
    this.lightBlock[ID.water] = 0;
  }
  World.prototype.key = (cx, cz) => cx + ',' + cz;
  World.prototype.chunk = function (cx, cz) { return this.chunks.get(cx + ',' + cz); };
  World.prototype.getBlock = function (x, y, z) {
    if (y < 0 || y >= CH) return 0;
    const c = this.chunks.get((x >> 4) + ',' + (z >> 4));
    return c ? c.data[idx(x & 15, y, z & 15)] : 0;
  };
  World.prototype.getMeta = function (x, y, z) {
    if (y < 0 || y >= CH) return 0;
    const c = this.chunks.get((x >> 4) + ',' + (z >> 4));
    return c ? c.meta[idx(x & 15, y, z & 15)] : 0;
  };
  World.prototype.loaded = function (x, z) { return this.chunks.has((x >> 4) + ',' + (z >> 4)); };
  World.prototype.biomeAt = function (x, z) {
    const c = this.chunks.get((x >> 4) + ',' + (z >> 4));
    return BIOMES[c ? c.biome[(z & 15) * CS + (x & 15)] : this.gen.column(x, z).b];
  };
  World.prototype.setBlock = function (x, y, z, id, meta) {
    if (y < 0 || y >= CH) return;
    const cx = x >> 4, cz = z >> 4, c = this.chunks.get(cx + ',' + cz);
    if (!c) return;
    const lx = x & 15, lz = z & 15, i = idx(lx, y, lz);
    c.data[i] = id; c.meta[i] = meta || 0;
    const k = cx + ',' + cz;
    if (!this.mods.has(k)) this.mods.set(k, new Map());
    this.mods.get(k).set(i, id | ((meta || 0) << 8));
    c.recalc();
    this.markDirty(cx, cz);
    const lightish = B()[id].light;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const near = (dx === -1 && lx === 0) || (dx === 1 && lx === 15) || dx === 0;
      const nearZ = (dz === -1 && lz === 0) || (dz === 1 && lz === 15) || dz === 0;
      if ((near && nearZ) || lightish || c.lights.length) this.markDirty(cx + dx, cz + dz);
    }
  };
  World.prototype.markDirty = function (cx, cz) { const c = this.chunks.get(cx + ',' + cz); if (c) c.dirty = true; };

  World.prototype.update = function (px, pz, budgetMs) {
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS), R = this.radius;
    const t0 = performance.now();
    // generate missing (closest first)
    const want = [];
    for (let dz = -R - 1; dz <= R + 1; dz++) for (let dx = -R - 1; dx <= R + 1; dx++) {
      if (dx * dx + dz * dz > (R + 1.5) * (R + 1.5)) continue;
      const k = (pcx + dx) + ',' + (pcz + dz);
      if (!this.chunks.has(k)) want.push([dx * dx + dz * dz, pcx + dx, pcz + dz]);
    }
    want.sort((a, b) => a[0] - b[0]);
    for (const w of want) {
      if (performance.now() - t0 > budgetMs * 0.6) break;
      const ch = this.gen.generate(w[1], w[2]);
      const m = this.mods.get(w[1] + ',' + w[2]);
      if (m) { m.forEach((v, i) => { ch.data[i] = v & 255; ch.meta[i] = v >> 8; }); ch.recalc(); }
      this.chunks.set(w[1] + ',' + w[2], ch);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) this.markDirty(w[1] + a, w[2] + b);
    }
    // mesh dirty chunks with all neighbours present, nearest first
    const dirty = [];
    this.chunks.forEach(c => {
      if (!c.dirty) return;
      const dx = c.cx - pcx, dz = c.cz - pcz;
      if (dx * dx + dz * dz > (R + 0.5) * (R + 0.5)) return;
      dirty.push([dx * dx + dz * dz, c]);
    });
    dirty.sort((a, b) => a[0] - b[0]);
    for (const [, c] of dirty) {
      if (performance.now() - t0 > budgetMs) break;
      let ok = true;
      for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1; b++) if (!this.chunks.has((c.cx + a) + ',' + (c.cz + b))) { ok = false; break; }
      if (!ok) continue;
      this.buildMesh(c);
    }
    // unload far chunks
    this.chunks.forEach((c, k) => {
      const dx = c.cx - pcx, dz = c.cz - pcz;
      if (dx * dx + dz * dz > (R + 3) * (R + 3)) { this.disposeMesh(c); this.chunks.delete(k); }
    });
    return want.length;
  };
  World.prototype.disposeMesh = function (c) {
    if (!c.meshes) return;
    c.meshes.forEach(m => { this.scene.remove(m); m.geometry.dispose(); });
    c.meshes = null;
  };

  World.prototype.buildMesh = function (c) {
    const blocks = B();
    const P = 18, PH = CH;
    // padded copy
    const pad = new Uint8Array(P * P * PH), pm = new Uint8Array(P * P * PH);
    const hm = new Int16Array(P * P), hmL = new Int16Array(P * P);
    let maxY = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const n = this.chunks.get((c.cx + a) + ',' + (c.cz + b));
      if (n.maxY > maxY) maxY = n.maxY;
    }
    const ymax = Math.min(PH - 1, maxY + 2);
    for (let pz = 0; pz < P; pz++) for (let px = 0; px < P; px++) {
      const wx = px - 1, wz = pz - 1;
      const ncx = wx < 0 ? -1 : wx > 15 ? 1 : 0, ncz = wz < 0 ? -1 : wz > 15 ? 1 : 0;
      const n = this.chunks.get((c.cx + ncx) + ',' + (c.cz + ncz));
      const lx = wx & 15, lz = wz & 15;
      let h = -1, hl = -1;
      for (let y = 0; y <= ymax; y++) {
        const v = n.data[idx(lx, y, lz)];
        const pi = (y * P + pz) * P + px;
        pad[pi] = v; pm[pi] = n.meta[idx(lx, y, lz)];
        if (this.lightBlock[v]) h = y;
        else if (v && blocks[v].leaves) hl = y;
      }
      hm[pz * P + px] = h; hmL[pz * P + px] = hl;
    }
    const G = (x, y, z) => (y < 0 || y > ymax) ? 0 : pad[(y * P + z + 1) * P + x + 1];
    const GM = (x, y, z) => (y < 0 || y > ymax) ? 0 : pm[(y * P + z + 1) * P + x + 1];
    const opaque = this.opaque;
    // lights affecting this chunk
    const lights = [];
    const ox = c.cx * CS, oz = c.cz * CS;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const L = this.chunks.get((c.cx + a) + ',' + (c.cz + b)).lights;
      for (let i = 0; i < L.length; i += 4) {
        const lx = L[i] - ox, lz = L[i + 2] - oz;
        if (lx < -14 || lz < -14 || lx > 29 || lz > 29) continue;
        lights.push(lx, L[i + 1], lz, L[i + 3]);
      }
    }
    const skyAt = (x, y, z) => {
      const h = hm[(z + 1) * P + x + 1];
      if (y > h) return y > hmL[(z + 1) * P + x + 1] ? 1 : 0.78;
      // sample neighbours so overhangs and cave mouths fade instead of cutting off
      let best = 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + (k === 0 ? 2 : k === 1 ? -2 : 0), nz = z + (k === 2 ? 2 : k === 3 ? -2 : 0);
        if (nx < -1 || nz < -1 || nx > 16 || nz > 16) continue;
        const h2 = hm[(nz + 1) * P + nx + 1];
        if (y > h2) best = Math.max(best, 0.8);
      }
      return Math.max(best * Math.max(0, 1 - (h - y) / 8), Math.max(0, 1 - (h - y) / 4) * 0.85);
    };
    const blockLightAt = (x, y, z) => {
      let best = 0;
      for (let i = 0; i < lights.length; i += 4) {
        const dx = x - lights[i], dy = y - lights[i + 1], dz = z - lights[i + 2];
        const ad = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
        const v = (lights[i + 3] - ad * 0.95) / 15;
        if (v > best) best = v;
      }
      return best > 1 ? 1 : best;
    };
    const out = { s: newBuf(), c: newBuf(), w: newBuf() };
    const atlasN = BH.ATLAS_COLS, tsz = 1 / atlasN, eps = tsz * 0.002;
    const TEX = BH.TEX;
    const one = [1, 1, 1];
    const tintFor = (b, x, z, face) => {
      const bio = BIOMES[c.biome[(z & 15) * CS + (x & 15)]];
      if (b.tint === 'foliage') return bio.foliageTint;
      if (b.tint === 'grass') return bio.grassTint;
      if (b.tint === 'water') return bio.water;
      if (b.tintTop === 'grass' && face === 'top') return bio.grassTint;
      return one;
    };
    for (let y = 0; y <= ymax; y++) for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const id = G(x, y, z);
      if (!id) continue;
      const b = blocks[id];
      if (b.cross) {
        if (b.climb) { emitLadder(out.c, x, y, z, GM(x, y, z), TEX[b.tex.side], skyAt(x, y, z), blockLightAt(x, y, z)); continue; }
        const tid = TEX[b.tex.side];
        const tint = tintFor(b, ox + x, oz + z, 'side');
        emitCross(out.c, x, y, z, tid, skyAt(x, y, z), blockLightAt(x, y, z), tint, b.torch ? 0.35 : 0.5);
        continue;
      }
      const buf = (b.liquid && id === ID.water) || b.gate ? out.w : (b.cutout || b.liquid ? out.c : out.s);
      const meta = GM(x, y, z);
      let topH = 1;
      if (b.liquid && G(x, y + 1, z) !== id) topH = 0.875;
      for (let f = 0; f < 6; f++) {
        const F = FACES[f];
        const nx = x + F.d[0], ny = y + F.d[1], nz = z + F.d[2];
        const n = G(nx, ny, nz);
        if (b.liquid) { if (n === id || (opaque[n] && !(f === 2 && topH < 1))) continue; if (f === 2 && n && n !== id && opaque[n]) continue; }
        else if (opaque[n]) continue;
        else if (n === id && (b.cutout && !b.leaves || b.transparent && !b.leaves)) continue;
        else if (n === id && b.leaves && ((x + y + z) & 1) && f !== 2) continue;
        let tn = F.f;
        if (b.orient && f !== 2 && f !== 3 && FRONT_FACE[meta & 3] === f) tn = 'front';
        const tid = TEX[b.tex[tn]];
        const u0 = (tid % atlasN) * tsz + eps, v0 = ((tid / atlasN) | 0) * tsz + eps, us = tsz - eps * 2;
        const sky = skyAt(nx, ny, nz), bl = Math.max(blockLightAt(nx, ny, nz), b.light / 15);
        const tint = tintFor(b, ox + x, oz + z, tn);
        const inset = b.cactus ? 1 / 16 : 0;
        for (let k = 0; k < 4; k++) {
          const cc = F.c[k];
          let px = x + cc[0], py = y + (cc[1] ? topH : 0), pz = z + cc[2];
          if (inset) { if (f === 0) px -= inset; if (f === 1) px += inset; if (f === 4) pz -= inset; if (f === 5) pz += inset; }
          // ambient occlusion
          let ao = 1;
          if (!b.liquid) {
            const s1 = [0, 0, 0], s2 = [0, 0, 0];
            const ax = F.d[0] !== 0 ? [1, 2] : F.d[1] !== 0 ? [0, 2] : [0, 1];
            s1[ax[0]] = cc[ax[0]] ? 1 : -1; s2[ax[1]] = cc[ax[1]] ? 1 : -1;
            const o1 = opaque[G(nx + s1[0], ny + s1[1], nz + s1[2])], o2 = opaque[G(nx + s2[0], ny + s2[1], nz + s2[2])];
            const o3 = opaque[G(nx + s1[0] + s2[0], ny + s1[1] + s2[1], nz + s1[2] + s2[2])];
            const lvl = (o1 && o2) ? 0 : 3 - (o1 + o2 + o3);
            ao = [0.5, 0.65, 0.82, 1][lvl];
          }
          buf.p.push(px, py, pz);
          let uu = UVS[k][0], vv = UVS[k][1];
          if (f !== 2 && f !== 3 && topH < 1 && cc[1]) vv = 1 - topH;
          buf.u.push(u0 + uu * us, v0 + vv * us);
          buf.l.push(F.s * ao, sky, bl);
          buf.t.push(tint[0], tint[1], tint[2]);
        }
        const base = buf.n; buf.n += 4;
        // flip the quad diagonal to avoid anisotropic AO artefacts
        const l0 = buf.l[buf.l.length - 12], l1 = buf.l[buf.l.length - 9], l2 = buf.l[buf.l.length - 6], l3 = buf.l[buf.l.length - 3];
        if (l0 + l2 < l1 + l3) buf.i.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
        else buf.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    this.disposeMesh(c);
    c.meshes = [];
    [[out.s, this.mats.solid, 0], [out.c, this.mats.cutout, 1], [out.w, this.mats.water, 2]].forEach(([buf, mat, order]) => {
      if (!buf.n) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(buf.p, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.u, 2));
      g.setAttribute('lit', new THREE.Float32BufferAttribute(buf.l, 3));
      g.setAttribute('tint', new THREE.Float32BufferAttribute(buf.t, 3));
      g.setIndex(buf.n > 65535 ? new THREE.Uint32BufferAttribute(buf.i, 1) : new THREE.Uint16BufferAttribute(buf.i, 1));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.position.set(ox, 0, oz);
      m.renderOrder = order;
      m.matrixAutoUpdate = false; m.updateMatrix();
      this.scene.add(m);
      c.meshes.push(m);
    });
    c.dirty = false;
    function emitCross(buf, x, y, z, tid, sky, bl, tint, w) {
      const u0 = (tid % atlasN) * tsz + eps, v0 = ((tid / atlasN) | 0) * tsz + eps, us = tsz - eps * 2;
      const h = w < 0.5 ? 0.7 : 1;
      const quads = [[[0.5 - w, 0.5 - w], [0.5 + w, 0.5 + w]], [[0.5 - w, 0.5 + w], [0.5 + w, 0.5 - w]]];
      if (w < 0.5) { quads.length = 0; quads.push([[0.5 - w, 0.5], [0.5 + w, 0.5]], [[0.5, 0.5 - w], [0.5, 0.5 + w]]); }
      quads.forEach(([a, b2]) => {
        const pts = [[a[0], h, a[1]], [a[0], 0, a[1]], [b2[0], 0, b2[1]], [b2[0], h, b2[1]]];
        pts.forEach((p, k) => {
          buf.p.push(x + p[0], y + p[1], z + p[2]);
          buf.u.push(u0 + UVS[k][0] * us, v0 + (UVS[k][1] * (h < 1 ? 1 : 1)) * us * (k === 0 || k === 3 ? (h < 1 ? 0.3 / 1 : 0) + 1 : 1) - (h < 1 && (k === 0 || k === 3) ? -0.3 * us : 0));
          buf.l.push(0.9, sky, bl);
          buf.t.push(tint[0], tint[1], tint[2]);
        });
        const base = buf.n; buf.n += 4;
        buf.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
      });
    }
    function emitLadder(buf, x, y, z, meta, tid, sky, bl) {
      const u0 = (tid % atlasN) * tsz + eps, v0 = ((tid / atlasN) | 0) * tsz + eps, us = tsz - eps * 2;
      const o = 0.06;
      const P4 = [
        [[0, 1, 1 - o], [0, 0, 1 - o], [1, 0, 1 - o], [1, 1, 1 - o]],
        [[o, 1, 0], [o, 0, 0], [o, 0, 1], [o, 1, 1]],
        [[1, 1, o], [1, 0, o], [0, 0, o], [0, 1, o]],
        [[1 - o, 1, 1], [1 - o, 0, 1], [1 - o, 0, 0], [1 - o, 1, 0]],
      ][meta & 3];
      P4.forEach((p, k) => { buf.p.push(x + p[0], y + p[1], z + p[2]); buf.u.push(u0 + UVS[k][0] * us, v0 + UVS[k][1] * us); buf.l.push(0.85, sky, bl); buf.t.push(1, 1, 1); });
      const base = buf.n; buf.n += 4;
      buf.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  };
  function newBuf() { return { p: [], u: [], l: [], t: [], i: [], n: 0 }; }

  // Voxel ray traversal. Returns {x,y,z,id,nx,ny,nz,dist} or null.
  World.prototype.raycast = function (o, dir, maxD, hitLiquid) {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(dir.x), sy = Math.sign(dir.y), sz = Math.sign(dir.z);
    const tdx = Math.abs(1 / dir.x), tdy = Math.abs(1 / dir.y), tdz = Math.abs(1 / dir.z);
    let tx = (sx > 0 ? x + 1 - o.x : o.x - x) * tdx, ty = (sy > 0 ? y + 1 - o.y : o.y - y) * tdy, tz = (sz > 0 ? z + 1 - o.z : o.z - z) * tdz;
    let nx = 0, ny = 0, nz = 0, t = 0;
    const blocks = B();
    for (let i = 0; i < 200 && t <= maxD; i++) {
      const id = this.getBlock(x, y, z);
      if (id && (hitLiquid ? true : !blocks[id].liquid)) {
        if (!(hitLiquid && blocks[id].liquid && this.getMeta(x, y, z))) return { x, y, z, id, nx, ny, nz, dist: t };
      }
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
    }
    return null;
  };

  World.prototype.surfaceY = function (x, z) {
    for (let y = CH - 1; y > 0; y--) { const id = this.getBlock(x, y, z); if (id && B()[id].solid) return y; }
    return 0;
  };

  BH.World = World;
  BH.Chunk = Chunk;
  BH.chunkIdx = idx;
  BH.Generator = Generator;
  BH.pickWeighted = pick;
  BH.biomeDef = biome;
  BH.biomeRatio = ratio;
  BH.smooth = smooth;
  BH.BIOMES = BIOMES;
  BH.CS = CS; BH.CH = CH; BH.SEA = SEA;
})();
