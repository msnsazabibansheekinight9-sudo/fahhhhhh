// Structures for all three dimensions, placed deterministically on a cell grid and clipped per chunk.
(function () {
  'use strict';
  const CS = BH.CS, CH = BH.CH, idx = BH.chunkIdx;
  const TYPES = [];
  BH.RIFT_RING = [[0, -1], [1, -1], [2, 0], [2, 1], [1, 2], [0, 2], [-1, 1], [-1, 0]];
  const S = (key, o) => TYPES.push(Object.assign({ key, dim: 'over', cell: 320, chance: 0.5, radius: 16, biomes: null, margin: 40 }, o));

  // ---------- loot tables: [item, min, max, weight]
  const LOOT = {
    dungeon: { rolls: [4, 8], e: [['bone', 1, 6, 10], ['rotten_flesh', 1, 6, 10], ['string', 1, 4, 8], ['gunpowder', 1, 4, 8], ['bread', 1, 2, 8], ['wheat', 1, 4, 8], ['iron_ingot', 1, 4, 6], ['gold_ingot', 1, 3, 4], ['bucket', 1, 1, 4], ['cinnabar', 2, 6, 5], ['name_tag', 1, 1, 3], ['golden_apple', 1, 1, 2], ['diamond', 1, 2, 1], ['iron_pickaxe', 1, 1, 2]] },
    mine: { rolls: [3, 7], e: [['bread', 1, 3, 10], ['coal', 3, 8, 10], ['raw_iron', 1, 5, 8], ['gold_ingot', 1, 3, 4], ['lapis', 4, 9, 4], ['cinnabar', 4, 9, 4], ['diamond', 1, 2, 2], ['torch', 4, 12, 8], ['seeds', 2, 4, 6], ['iron_pickaxe', 1, 1, 2], ['ladder', 4, 8, 4], ['carrot', 1, 3, 4]] },
    pyramid: { rolls: [3, 6], e: [['bone', 2, 6, 10], ['rotten_flesh', 2, 6, 10], ['gold_ingot', 2, 7, 8], ['iron_ingot', 1, 5, 6], ['emerald', 1, 3, 6], ['diamond', 1, 3, 3], ['golden_apple', 1, 1, 3], ['gunpowder', 1, 6, 6], ['sand', 1, 8, 6], ['gold_sword', 1, 1, 2]] },
    shrine: { rolls: [3, 6], e: [['bone', 2, 6, 10], ['gold_ingot', 2, 7, 8], ['emerald', 1, 3, 6], ['diamond', 1, 3, 3], ['iron_ingot', 1, 5, 6], ['arrow', 4, 12, 8], ['bow', 1, 1, 3], ['melon_slice', 2, 6, 5]] },
    village: { rolls: [3, 7], e: [['bread', 1, 4, 10], ['apple', 1, 4, 8], ['wheat', 2, 6, 8], ['seeds', 2, 6, 6], ['iron_ingot', 1, 4, 5], ['emerald', 1, 3, 5], ['torch', 2, 8, 6], ['carrot', 1, 4, 6], ['potato', 1, 4, 6], ['iron_helmet', 1, 1, 1], ['iron_sword', 1, 1, 1], ['iron_pickaxe', 1, 1, 1]] },
    smith: { rolls: [4, 8], e: [['iron_ingot', 2, 6, 10], ['bread', 1, 3, 8], ['apple', 1, 3, 6], ['iron_chestplate', 1, 1, 2], ['iron_leggings', 1, 1, 2], ['iron_helmet', 1, 1, 2], ['iron_sword', 1, 1, 3], ['iron_pickaxe', 1, 1, 3], ['obsidian', 2, 6, 4], ['diamond', 1, 3, 2], ['gold_ingot', 1, 3, 4]] },
    ship: { rolls: [3, 7], e: [['paper', 2, 8, 8], ['compass', 1, 1, 3], ['gold_ingot', 1, 5, 6], ['iron_ingot', 1, 5, 6], ['emerald', 1, 5, 5], ['coal', 2, 8, 8], ['wheat', 4, 12, 6], ['carrot', 2, 6, 6], ['potato', 2, 6, 6], ['leather_chestplate', 1, 1, 2], ['diamond', 1, 1, 1], ['cinnabar', 2, 6, 3]] },
    ocean_ruin: { rolls: [2, 5], e: [['coal', 1, 4, 10], ['gold_ingot', 1, 3, 6], ['emerald', 1, 2, 4], ['wheat', 2, 4, 6], ['rotten_flesh', 1, 4, 6], ['golden_apple', 1, 1, 1], ['stone_axe', 1, 1, 3]] },
    portal_ruin: { rolls: [4, 8], e: [['obsidian', 1, 2, 10], ['flint', 1, 4, 10], ['flint_steel', 1, 1, 6], ['fire_charge', 1, 2, 6], ['gold_ingot', 2, 8, 8], ['golden_apple', 1, 1, 3], ['gold_pickaxe', 1, 1, 3], ['gold_helmet', 1, 1, 3], ['gold_block', 1, 1, 1]] },
    igloo: { rolls: [2, 6], e: [['golden_apple', 1, 1, 1], ['coal', 1, 4, 10], ['apple', 1, 3, 10], ['wheat', 2, 4, 8], ['emerald', 1, 1, 4], ['stone_axe', 1, 1, 4], ['rotten_flesh', 1, 2, 6], ['snowball', 4, 12, 6]] },
    hut: { rolls: [2, 5], e: [['red_mushroom', 1, 3, 8], ['brown_mushroom', 1, 3, 8], ['bone', 1, 4, 8], ['string', 1, 4, 8], ['glow_dust', 1, 4, 6], ['slimeball', 1, 3, 6], ['sugar', 1, 4, 6], ['drift_pearl', 1, 1, 2]] },
    tower: { rolls: [3, 6], e: [['arrow', 4, 16, 10], ['bow', 1, 1, 4], ['iron_ingot', 1, 4, 6], ['string', 2, 6, 6], ['dark_oak_log', 2, 6, 6], ['emerald', 1, 4, 5], ['wheat', 2, 6, 6], ['carrot', 2, 6, 6]] },
    library: { rolls: [3, 6], e: [['book', 1, 4, 10], ['paper', 2, 8, 10], ['compass', 1, 1, 4], ['seeker_eye', 1, 1, 3], ['drift_pearl', 1, 2, 4], ['emerald', 1, 3, 5], ['name_tag', 1, 1, 3]] },
    archive: { rolls: [3, 7], e: [['bread', 1, 3, 8], ['apple', 1, 3, 8], ['iron_ingot', 1, 5, 8], ['gold_ingot', 1, 4, 6], ['cinnabar', 3, 8, 6], ['drift_pearl', 1, 2, 6], ['seeker_eye', 1, 1, 2], ['iron_sword', 1, 1, 3], ['iron_chestplate', 1, 1, 2], ['diamond', 1, 3, 3], ['golden_apple', 1, 1, 2]] },
    lodge: { rolls: [4, 8], e: [['diamond', 1, 3, 4], ['iron_ingot', 2, 6, 8], ['gold_ingot', 2, 6, 6], ['emerald', 1, 4, 6], ['golden_apple', 1, 1, 3], ['name_tag', 1, 1, 4], ['bread', 2, 6, 8], ['cinnabar', 4, 10, 6], ['diamond_chestplate', 1, 1, 1], ['iron_axe', 1, 1, 4]] },
    fortress: { rolls: [3, 6], e: [['gold_ingot', 2, 7, 10], ['iron_ingot', 2, 5, 8], ['diamond', 1, 3, 5], ['obsidian', 2, 4, 4], ['flint_steel', 1, 1, 4], ['ember_shard', 4, 12, 8], ['gold_chestplate', 1, 1, 3], ['gold_sword', 1, 1, 3], ['ember_rod', 1, 2, 3], ['golden_apple', 1, 1, 2]] },
    keep: { rolls: [4, 9], e: [['gold_block', 1, 2, 4], ['gold_ingot', 4, 12, 10], ['duskiron_scrap', 1, 1, 3], ['diamond', 1, 3, 5], ['gold_pickaxe', 1, 1, 4], ['gold_boots', 1, 1, 4], ['obsidian', 2, 6, 6], ['ember_shard', 6, 16, 8], ['diamond_sword', 1, 1, 2], ['golden_apple', 1, 2, 3]] },
    spire: { rolls: [4, 8], e: [['diamond', 2, 7, 8], ['emerald', 2, 6, 8], ['iron_ingot', 4, 8, 8], ['gold_ingot', 2, 7, 8], ['diamond_pickaxe', 1, 1, 3], ['diamond_chestplate', 1, 1, 2], ['drift_pearl', 2, 4, 6], ['duskiron_scrap', 1, 1, 2]] },
    spire_top: { rolls: [2, 4], e: [['diamond', 1, 4, 8], ['emerald', 2, 5, 6], ['drift_fruit', 2, 6, 6]], always: [['drift_cloak', 1]] },
  };
  function rollLoot(table, rnd) {
    const T = LOOT[table]; if (!T) return [];
    const out = new Array(27).fill(null);
    const n = T.rolls[0] + Math.floor(rnd() * (T.rolls[1] - T.rolls[0] + 1));
    const place = (key, k) => { const id = BH.ID[key]; if (id === undefined) return; for (let t = 0; t < 30; t++) { const s = Math.floor(rnd() * 27); if (!out[s]) { out[s] = { id, n: k, dur: 0 }; return; } } };
    (T.always || []).forEach(([k, c]) => place(k, c));
    const tot = T.e.reduce((a, e) => a + e[3], 0);
    for (let i = 0; i < n; i++) {
      let r = rnd() * tot, e = T.e[0];
      for (const x of T.e) { r -= x[3]; if (r <= 0) { e = x; break; } }
      const it = BH.itemByKey(e[0]);
      place(e[0], Math.min(it.stack, e[1] + Math.floor(rnd() * (e[2] - e[1] + 1))));
    }
    return out;
  }

  // ---------- placement
  function site(gen, T, gx, gz) {
    gen._sites = gen._sites || new Map();
    const k = T.key + ':' + gx + ',' + gz;
    if (gen._sites.has(k)) return gen._sites.get(k);
    let s = null;
    const h = BH.hash3(gx, T.key.length * 31 + T.key.charCodeAt(0), gz, gen.seed);
    if (h < T.chance) {
      const r2 = BH.hash3(gx, 77, gz, gen.seed + T.key.length), r3 = BH.hash3(gx, 78, gz, gen.seed + T.key.charCodeAt(1));
      const x = gx * T.cell + T.margin + Math.floor(r2 * (T.cell - T.margin * 2)), z = gz * T.cell + T.margin + Math.floor(r3 * (T.cell - T.margin * 2));
      const col = gen.column(x, z);
      const bio = BH.BIOMES[col.b];
      let ok = !T.biomes || T.biomes.includes(bio.key);
      if (ok && T.check) ok = T.check(gen, x, z, col);
      if (ok) s = { gen, x, z, h: col.h, bio, seed: (gx * 73856093) ^ (gz * 19349663) ^ gen.seed ^ T.key.length * 999 };
    }
    gen._sites.set(k, s);
    return s;
  }
  function apply(gen, ch, dim) {
    const x0 = ch.cx * CS, z0 = ch.cz * CS;
    for (const T of TYPES) {
      if (T.dim !== dim) continue;
      const ga = Math.floor((x0 - T.radius) / T.cell), gb = Math.floor((x0 + CS + T.radius) / T.cell);
      const gc = Math.floor((z0 - T.radius) / T.cell), gd = Math.floor((z0 + CS + T.radius) / T.cell);
      for (let gz = gc; gz <= gd; gz++) for (let gx = ga; gx <= gb; gx++) {
        const s = site(gen, T, gx, gz);
        if (!s) continue;
        if (s.x + T.radius < x0 || s.x - T.radius >= x0 + CS || s.z + T.radius < z0 || s.z - T.radius >= z0 + CS) continue;
        T.build(ctx(gen, ch, s), s);
      }
    }
  }
  function ctx(gen, ch, s) {
    const x0 = ch.cx * CS, z0 = ch.cz * CS, d = ch.data, ID = BH.ID;
    const c = {
      rnd: BH.mulberry32(s.seed >>> 0),
      inside: (x, z) => x >= x0 && z >= z0 && x < x0 + CS && z < z0 + CS,
      get(x, y, z) { if (!c.inside(x, z) || y < 0 || y >= CH) return -1; return d[idx(x - x0, y, z - z0)]; },
      put(x, y, z, key, meta) {
        if (y < 1 || y >= CH - 1 || !c.inside(x, z)) return;
        const i = idx(x - x0, y, z - z0);
        d[i] = typeof key === 'number' ? key : (ID[key] || 0);
        ch.meta[i] = meta || 0;
        ch.loot.delete(i); ch.cages.delete(i);
      },
      fill(xa, ya, za, xb, yb, zb, key, inner) {
        for (let y = ya; y <= yb; y++) for (let z = za; z <= zb; z++) for (let x = xa; x <= xb; x++) {
          const edge = x === xa || x === xb || y === ya || y === yb || z === za || z === zb;
          if (inner !== undefined && !edge) { if (inner !== null) c.put(x, y, z, inner); }
          else c.put(x, y, z, typeof key === 'function' ? key(x, y, z) : key);
        }
      },
      chest(x, y, z, table, facing) { c.put(x, y, z, 'chest', facing || 0); if (c.inside(x, z)) ch.loot.set(idx(x - x0, y, z - z0), table); },
      cage(x, y, z, mob) { c.put(x, y, z, 'monster_cage'); if (c.inside(x, z)) ch.cages.set(idx(x - x0, y, z - z0), mob); },
      npc(x, y, z, prof) { if (c.inside(x, z)) ch.npcs.push({ x: x + 0.5, y, z: z + 0.5, prof }); },
      ground: (x, z) => gen.column(x, z).h,
      // replace the top block of a column (paths, plazas)
      surface(x, z, key) {
        const h = gen.column(x, z).h;
        if (h < BH.SEA) return;
        c.put(x, h, z, key);
        for (let y = h + 1; y < h + 4; y++) { const v = c.get(x, y, z); if (v > 0 && BH.BLOCKS[v].cross) c.put(x, y, z, 0); }
      },
      // remove trees (logs, leaves, plants) above the ground inside a radius
      clearTrees(cx, cz, r) {
        for (let z = Math.max(z0, cz - r); z < Math.min(z0 + CS, cz + r + 1); z++) for (let x = Math.max(x0, cx - r); x < Math.min(x0 + CS, cx + r + 1); x++) {
          if ((x - cx) ** 2 + (z - cz) ** 2 > r * r) continue;
          const h = gen.column(x, z).h;
          for (let y = h + 1; y < Math.min(CH - 1, h + 32); y++) { const v = d[idx(x - x0, y, z - z0)]; if (v && (BH.BLOCKS[v].leaves || BH.BLOCKS[v].log || BH.BLOCKS[v].cross)) d[idx(x - x0, y, z - z0)] = 0; }
          const top = d[idx(x - x0, h, z - z0)];
          if (top && BH.BLOCKS[top].log) d[idx(x - x0, h, z - z0)] = ID.dirt;
        }
      },
      foundation(x, z, top, key) { for (let y = top; y > top - 8; y--) { const v = c.get(x, y, z); if (v > 0 && BH.BLOCKS[v].solid && !BH.BLOCKS[v].leaves && y < top) break; c.put(x, y, z, key); } },
      stoneMix: () => { const r = c.rnd(); return r < 0.6 ? 'stone_bricks' : r < 0.82 ? 'mossy_stone_bricks' : 'cracked_stone_bricks'; },
    };
    return c;
  }

  // ---------- overworld builders
  const WOOD = {
    plains: ['oak_log', 'oak_planks', 'cobble', 'glass'], meadow: ['oak_log', 'oak_planks', 'cobble', 'glass'], forest: ['oak_log', 'oak_planks', 'cobble', 'glass'],
    desert: ['cut_sandstone', 'sandstone', 'sandstone', 'glass'], savanna: ['acacia_log', 'acacia_planks', 'terracotta', 'glass'],
    taiga: ['spruce_log', 'spruce_planks', 'cobble', 'glass'], snowy_plains: ['spruce_log', 'spruce_planks', 'cobble', 'glass'], snowy_taiga: ['spruce_log', 'spruce_planks', 'cobble', 'glass'],
  };
  function house(c, hx, hz, w, dpt, face, mat, prof, big) {
    const [log, plank, base, glass] = mat;
    const h = c.ground(hx + (w >> 1), hz + (dpt >> 1));
    const y = h + 1, wallH = big ? 4 : 3;
    for (let x = hx; x < hx + w; x++) for (let z = hz; z < hz + dpt; z++) {
      c.foundation(x, z, h, base);
      c.put(x, h, z, base);
      for (let yy = y; yy < y + wallH + 4; yy++) c.put(x, yy, z, 0);
      const edge = x === hx || x === hx + w - 1 || z === hz || z === hz + dpt - 1;
      const corner = (x === hx || x === hx + w - 1) && (z === hz || z === hz + dpt - 1);
      for (let yy = y; yy < y + wallH; yy++) if (edge) c.put(x, yy, z, corner ? log : (yy === y + 1 && !corner && (x + z) % 2 === 0 ? glass : plank));
    }
    // roof: stepped
    for (let k = 0; k <= Math.ceil(Math.min(w, dpt) / 2); k++) for (let x = hx - 1 + k; x <= hx + w - k; x++) for (let z = hz - 1 + k; z <= hz + dpt - k; z++) {
      if (x === hx - 1 + k || x === hx + w - k || z === hz - 1 + k || z === hz + dpt - k || k === Math.ceil(Math.min(w, dpt) / 2)) c.put(x, y + wallH + k, z, k === 0 ? log : plank);
    }
    // door on the face side: 0=+z,1=-x,2=-z,3=+x
    const mx = hx + (w >> 1), mz = hz + (dpt >> 1);
    const door = [[mx, hz + dpt - 1], [hx, mz], [mx, hz], [hx + w - 1, mz]][face];
    c.put(door[0], y, door[1], 0); c.put(door[0], y + 1, door[1], 0);
    const out = [[0, 1], [-1, 0], [0, -1], [1, 0]][face];
    c.put(door[0] + out[0], y + 2, door[1] + out[1], 'torch');
    c.surface(door[0] + out[0], door[1] + out[1], 'grass_path');
    // interior
    const ix = hx + 1, iz = hz + 1;
    c.put(ix, y, iz, 'bed', face);
    c.put(hx + w - 2, y + wallH - 1, hz + dpt - 2, 'torch');
    if (prof === 'smith') { c.put(hx + w - 2, y, iz, 'furnace', face); c.chest(hx + w - 2, y, iz + 1 < hz + dpt - 1 ? iz + 1 : iz, 'smith', face); }
    else if (prof === 'librarian') { c.put(hx + w - 2, y, iz, 'bookshelf'); c.put(hx + w - 2, y + 1, iz, 'bookshelf'); c.put(ix, y, hz + dpt - 2, 'crafting_table'); }
    else if (prof === 'butcher') { c.put(hx + w - 2, y, iz, 'furnace', face); c.put(ix, y, hz + dpt - 2, 'hay_bale'); }
    else if (prof === 'mason') { c.put(hx + w - 2, y, iz, 'stone_bricks'); c.put(ix, y, hz + dpt - 2, 'furnace', face); }
    else if (prof === 'cleric') { c.put(hx + w - 2, y, iz, 'lamp'); c.chest(ix, y, hz + dpt - 2, 'village', face); }
    else { c.put(hx + w - 2, y, iz, 'crafting_table'); c.chest(ix, y, hz + dpt - 2 > iz ? hz + dpt - 2 : iz + 1, 'village', face); }
    c.npc(mx, y, mz, prof);
  }
  S('village', {
    cell: 420, chance: 0.6, radius: 44, margin: 60, biomes: ['plains', 'meadow', 'desert', 'savanna', 'taiga', 'snowy_plains'],
    check: (g, x, z, col) => col.h > BH.SEA + 1 && Math.abs(g.column(x + 20, z).h - col.h) < 6 && Math.abs(g.column(x, z + 20).h - col.h) < 6,
    build(c, s) {
      const mat = WOOD[s.bio.key] || WOOD.plains;
      const path = s.bio.key === 'desert' ? 'sandstone' : 'grass_path';
      const y = s.h;
      c.clearTrees(s.x, s.z, 42);
      // well
      c.fill(s.x - 2, y - 3, s.z - 2, s.x + 2, y, s.z + 2, mat[2]);
      c.fill(s.x - 1, y - 2, s.z - 1, s.x + 1, y, s.z + 1, 'water');
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let k = 1; k <= 3; k++) c.put(s.x + dx, y + k, s.z + dz, mat[0]);
      c.fill(s.x - 2, y + 4, s.z - 2, s.x + 2, y + 4, s.z + 2, mat[1]);
      for (let k = 1; k < 4; k++) for (const [dx, dz] of [[-2, -1], [-2, 0], [-2, 1], [2, -1], [2, 0], [2, 1], [-1, -2], [0, -2], [1, -2], [-1, 2], [0, 2], [1, 2]]) c.put(s.x + dx, y + k, s.z + dz, 0);
      c.put(s.x + 3, y + 1, s.z + 3, 'bell');
      // roads and houses
      const profs = ['farmer', 'smith', 'librarian', 'butcher', 'mason', 'cleric', 'farmer', 'smith'];
      let pi = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz], di) => {
        const len = 22 + Math.floor(c.rnd() * 14);
        for (let t = 3; t < len; t++) for (let w = -1; w <= 1; w++) c.surface(s.x + dx * t + (dz ? w : 0), s.z + dz * t + (dx ? w : 0), path);
        for (let t = 8; t < len - 4; t += 10) {
          const side = (t / 10 | 0) % 2 ? 1 : -1;
          const big = c.rnd() < 0.3;
          const w = big ? 7 : 5, dd = big ? 6 : 5;
          let hx, hz, face;
          if (dx) { hx = s.x + dx * t - (w >> 1); hz = side > 0 ? s.z + 3 : s.z - 2 - dd; face = side > 0 ? 2 : 0; }
          else { hz = s.z + dz * t - (dd >> 1); hx = side > 0 ? s.x + 3 : s.x - 2 - w; face = side > 0 ? 1 : 3; }
          if (c.rnd() < 0.25) {
            // farm plot
            const fy = c.ground(hx + 3, hz + 3);
            for (let x = hx; x < hx + 7; x++) for (let z = hz; z < hz + 6; z++) {
              const edge = x === hx || x === hx + 6 || z === hz || z === hz + 5;
              c.foundation(x, z, fy, 'dirt');
              c.put(x, fy, z, edge ? mat[0] : (x === hx + 3 ? 'water' : 'farmland'));
              c.put(x, fy + 1, z, edge || x === hx + 3 ? 0 : 'wheat_' + Math.floor(c.rnd() * 4));
              c.put(x, fy + 2, z, 0);
            }
          } else house(c, hx, hz, w, dd, face, mat, profs[pi++ % profs.length], big);
          // lamp post
          const lx = s.x + dx * (t + 4) + (dz ? 2 : 0), lz = s.z + dz * (t + 4) + (dx ? 2 : 0), ly = c.ground(lx, lz);
          if (ly >= BH.SEA) { c.put(lx, ly + 1, lz, mat[0]); c.put(lx, ly + 2, lz, mat[0]); c.put(lx, ly + 3, lz, 'torch'); }
        }
      });
    },
  });
  S('dungeon', {
    cell: 112, chance: 0.55, radius: 6, margin: 10,
    check: (g, x, z, col) => col.h > 30,
    build(c, s) {
      const y = 14 + Math.floor(c.rnd() * Math.max(4, Math.min(36, s.h - 20)));
      const w = 3 + Math.floor(c.rnd() * 2), dpt = 3 + Math.floor(c.rnd() * 2);
      c.fill(s.x - w - 1, y - 1, s.z - dpt - 1, s.x + w + 1, y + 4, s.z + dpt + 1, () => c.rnd() < 0.6 ? 'cobble' : 'mossy_cobble', 0);
      c.cage(s.x, y, s.z, ['shambler', 'shambler', 'archer', 'crawler'][Math.floor(c.rnd() * 4)]);
      c.chest(s.x - w, y, s.z, 'dungeon', 3);
      if (c.rnd() < 0.6) c.chest(s.x + w, y, s.z + 1, 'dungeon', 1);
      // openings so caves connect
      c.put(s.x, y, s.z + dpt + 1, 0); c.put(s.x, y + 1, s.z + dpt + 1, 0);
    },
  });
  S('mine', {
    cell: 340, chance: 0.55, radius: 64, margin: 70,
    build(c, s) {
      const y0 = 26 + Math.floor(c.rnd() * 14);
      const segs = [[s.x, y0, s.z, Math.floor(c.rnd() * 4)]];
      let count = 0;
      while (segs.length && count < 18) {
        const [x, y, z, dir] = segs.shift(); count++;
        const [dx, dz] = [[1, 0], [0, 1], [-1, 0], [0, -1]][dir];
        const len = 10 + Math.floor(c.rnd() * 16);
        for (let t = 0; t < len; t++) {
          const cx = x + dx * t, cz = z + dz * t;
          if (Math.abs(cx - s.x) > 60 || Math.abs(cz - s.z) > 60) break;
          for (let w = -1; w <= 1; w++) for (let h = 0; h < 3; h++) c.put(cx + (dz ? w : 0), y + h, cz + (dx ? w : 0), 0);
          if (t % 4 === 0) {
            c.put(cx + (dz ? -1 : 0), y, cz + (dx ? -1 : 0), 'oak_log'); c.put(cx + (dz ? -1 : 0), y + 1, cz + (dx ? -1 : 0), 'oak_log');
            c.put(cx + (dz ? 1 : 0), y, cz + (dx ? 1 : 0), 'oak_log'); c.put(cx + (dz ? 1 : 0), y + 1, cz + (dx ? 1 : 0), 'oak_log');
            for (let w = -1; w <= 1; w++) c.put(cx + (dz ? w : 0), y + 2, cz + (dx ? w : 0), 'oak_planks');
            if (c.rnd() < 0.3) c.put(cx, y + 1, cz, 'torch');
          }
          const r = c.rnd();
          if (r < 0.02) c.chest(cx + (dz ? 1 : 0), y, cz + (dx ? 1 : 0), 'mine', dir);
          else if (r < 0.026) c.cage(cx, y, cz, 'crawler');
          else if (r < 0.05) c.put(cx, y - 1, cz, 'oak_planks');
        }
        const ex = x + dx * len, ez = z + dz * len;
        if (c.rnd() < 0.7) segs.push([ex, y, ez, (dir + 1) % 4]);
        if (c.rnd() < 0.7) segs.push([ex, y, ez, (dir + 3) % 4]);
        if (c.rnd() < 0.5) segs.push([ex, y, ez, dir]);
        // crossing room
        if (c.rnd() < 0.3) c.fill(ex - 2, y, ez - 2, ex + 2, y + 3, ez + 2, 0);
      }
    },
  });
  S('pyramid', {
    cell: 360, chance: 0.65, radius: 12, margin: 30, biomes: ['desert'],
    build(c, s) {
      const y = s.h, R = 10;
      for (let k = 0; k <= R; k++) for (let x = -R + k; x <= R - k; x++) for (let z = -R + k; z <= R - k; z++) {
        const edge = Math.abs(x) === R - k || Math.abs(z) === R - k;
        c.put(s.x + x, y + k, s.z + z, edge ? ((k === 2 || k === 6) ? 'terracotta_orange' : k === R ? 'chiseled_sandstone' : 'sandstone') : (k < 6 && k > 0 ? 0 : 'sandstone'));
      }
      for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) c.foundation(s.x + x, s.z + z, y, 'sandstone');
      // entrance
      for (let k = 1; k <= 3; k++) for (let w = -1; w <= 1; w++) for (let t = R - 4; t <= R + 1; t++) c.put(s.x + w, y + k, s.z + t, 0);
      c.put(s.x, y + 4, s.z + R - 3, 'chiseled_sandstone');
      for (const [px, pz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) for (let k = 1; k <= 5; k++) c.put(s.x + px, y + k, s.z + pz, k % 2 ? 'chiseled_sandstone' : 'cut_sandstone');
      c.put(s.x, y, s.z, 'terracotta_orange');
      // hidden vault below
      c.fill(s.x - 3, y - 12, s.z - 3, s.x + 3, y - 7, s.z + 3, 'sandstone', 0);
      for (let k = y - 7; k <= y; k++) c.put(s.x, k, s.z, k === y ? 'terracotta_orange' : 0);
      c.put(s.x, y, s.z, 0);
      for (let k = y - 11; k < y; k++) c.put(s.x - 1, k, s.z, 'ladder', 3);
      c.chest(s.x + 2, y - 11, s.z, 'pyramid', 1); c.chest(s.x - 2, y - 11, s.z + 2, 'pyramid', 3); c.chest(s.x, y - 11, s.z - 2, 'pyramid', 0); c.chest(s.x, y - 11, s.z + 2, 'pyramid', 2);
      for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) c.put(s.x + x, y - 13, s.z + z, 'tnt');
      c.cage(s.x - 2, y - 11, s.z - 2, 'beetle');
    },
  });
  S('shrine', {
    cell: 360, chance: 0.65, radius: 9, margin: 30, biomes: ['jungle'],
    build(c, s) {
      const y = s.h;
      c.clearTrees(s.x, s.z, 11);
      const mix = () => c.rnd() < 0.55 ? 'mossy_cobble' : 'cobble';
      for (let x = -6; x <= 6; x++) for (let z = -7; z <= 7; z++) c.foundation(s.x + x, s.z + z, y, 'cobble');
      c.fill(s.x - 6, y, s.z - 7, s.x + 6, y + 5, s.z + 7, mix, 0);
      c.fill(s.x - 4, y + 5, s.z - 5, s.x + 4, y + 9, s.z + 5, mix, 0);
      c.fill(s.x - 2, y + 9, s.z - 3, s.x + 2, y + 11, s.z + 3, mix);
      c.fill(s.x - 6, y + 5, s.z - 7, s.x + 6, y + 5, s.z + 7, mix);
      for (let k = 1; k <= 3; k++) for (let w = -1; w <= 1; w++) c.put(s.x + w, y + k, s.z + 7, 0);
      for (let k = 6; k <= 8; k++) c.put(s.x, k + y, s.z + 5, 0);
      c.put(s.x, y + 5, s.z + 6, 0);
      c.put(s.x - 3, y + 3, s.z, 'torch'); c.put(s.x + 3, y + 3, s.z, 'torch');
      c.chest(s.x, y + 1, s.z - 5, 'shrine', 0);
      c.chest(s.x + 2, y + 6, s.z - 3, 'shrine', 0);
      c.cage(s.x, y + 1, s.z - 2, 'archer');
    },
  });
  S('bog_hut', {
    cell: 260, chance: 0.6, radius: 6, margin: 20, biomes: ['swamp'],
    build(c, s) {
      const y = Math.max(s.h, BH.SEA) + 3;
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let k = y - 1; k > y - 8; k--) { const v = c.get(s.x + dx, k, s.z + dz); c.put(s.x + dx, k, s.z + dz, 'oak_log'); if (v > 0 && BH.BLOCKS[v].solid && k < s.h) break; }
      c.fill(s.x - 2, y, s.z - 2, s.x + 2, y, s.z + 3, 'spruce_planks');
      c.fill(s.x - 2, y + 1, s.z - 2, s.x + 2, y + 3, s.z + 2, 'spruce_planks', 0);
      c.fill(s.x - 3, y + 4, s.z - 3, s.x + 3, y + 4, s.z + 4, 'spruce_planks');
      c.put(s.x, y + 1, s.z + 2, 0); c.put(s.x, y + 2, s.z + 2, 0);
      c.put(s.x - 2, y + 2, s.z, 'glass'); c.put(s.x + 2, y + 2, s.z, 'glass');
      c.put(s.x - 1, y + 1, s.z - 1, 'crafting_table'); c.chest(s.x + 1, y + 1, s.z - 1, 'hut', 0);
      c.put(s.x + 1, y + 1, s.z + 1, 'brown_mushroom');
    },
  });
  S('igloo', {
    cell: 300, chance: 0.5, radius: 6, margin: 20, biomes: ['snowy_plains', 'snowy_taiga'],
    build(c, s) {
      const y = s.h;
      for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) for (let dy = 0; dy <= 4; dy++) {
        const d = Math.sqrt(dx * dx + dz * dz + (dy * 1.2) ** 2);
        if (d < 4.3) c.put(s.x + dx, y + 1 + dy, s.z + dz, d > 3.3 ? 'snow_block' : 0);
      }
      c.fill(s.x - 4, y, s.z - 4, s.x + 4, y, s.z + 4, 'snow_block');
      c.put(s.x, y + 1, s.z + 4, 0); c.put(s.x, y + 2, s.z + 4, 0); c.put(s.x, y + 1, s.z + 3, 0); c.put(s.x, y + 2, s.z + 3, 0);
      c.put(s.x - 2, y + 1, s.z - 1, 'bed', 3); c.put(s.x + 2, y + 1, s.z - 2, 'furnace', 0); c.put(s.x + 2, y + 1, s.z, 'crafting_table');
      c.put(s.x, y + 3, s.z, 'torch');
      if (c.rnd() < 0.5) {
        for (let k = y - 7; k <= y; k++) { c.put(s.x - 1, k, s.z + 1, 0); c.put(s.x - 1, k, s.z + 2, 'stone_bricks'); c.put(s.x - 1, k, s.z + 1, k === y ? 0 : 'ladder', 0); }
        c.fill(s.x - 4, y - 11, s.z - 3, s.x + 3, y - 7, s.z + 3, 'stone_bricks', 0);
        c.chest(s.x + 2, y - 10, s.z - 2, 'igloo', 0);
        c.cage(s.x, y - 10, s.z - 2, 'shambler');
        c.put(s.x - 3, y - 9, s.z, 'torch');
      }
    },
  });
  S('shipwreck', {
    cell: 280, chance: 0.55, radius: 10, margin: 30, biomes: ['ocean', 'beach', 'frozen_ocean'],
    build(c, s) {
      const y = s.h + 1, ax = c.rnd() < 0.5;
      const P = (u, k, v, key) => ax ? c.put(s.x + u, y + k, s.z + v, key) : c.put(s.x + v, y + k, s.z + u, key);
      for (let u = -7; u <= 7; u++) {
        const half = u > 4 ? 7 - u : 2;
        for (let v = -half; v <= half; v++) {
          P(u, 0, v, 'spruce_planks');
          for (let k = 1; k <= 3; k++) P(u, k, v, Math.abs(v) === half || Math.abs(u) === 7 ? 'oak_planks' : (k === 3 && c.rnd() < 0.4 ? 'oak_planks' : (y + k <= BH.SEA ? 'water' : 0)));
        }
      }
      for (let k = 1; k < 9; k++) P(1, k, 0, 'oak_log');
      if (c.rnd() < 0.5) for (let k = 5; k < 9; k++) P(1, k, 0, y + k <= BH.SEA ? 'water' : 0);
      const ch1 = ax ? [s.x - 5, s.z] : [s.x, s.z - 5];
      c.chest(ch1[0], y + 1, ch1[1], 'ship', 0);
      const ch2 = ax ? [s.x + 4, s.z + 1] : [s.x + 1, s.z + 4];
      c.chest(ch2[0], y + 1, ch2[1], 'ship', 0);
    },
  });
  S('ocean_ruin', {
    cell: 200, chance: 0.45, radius: 6, margin: 20, biomes: ['ocean', 'frozen_ocean'],
    build(c, s) {
      const y = s.h + 1;
      for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
        const edge = Math.abs(x) === 3 || Math.abs(z) === 3;
        c.put(s.x + x, y - 1, s.z + z, c.stoneMix());
        if (edge) for (let k = 0; k < 1 + Math.floor(c.rnd() * 4); k++) c.put(s.x + x, y + k, s.z + z, c.stoneMix());
      }
      c.chest(s.x, y, s.z, 'ocean_ruin', 0);
      c.put(s.x + 1, y, s.z + 1, 'gravel');
    },
  });
  S('ruined_portal', {
    cell: 380, chance: 0.4, radius: 6, margin: 20, biomes: ['plains', 'forest', 'desert', 'savanna', 'taiga', 'jungle', 'birch_forest', 'meadow', 'snowy_plains', 'badlands', 'mountains'],
    build(c, s) {
      const y = s.h + 1;
      for (let x = -4; x <= 4; x++) for (let z = -3; z <= 3; z++) if (c.rnd() < 0.55) { const gy = c.ground(s.x + x, s.z + z); c.put(s.x + x, gy, s.z + z, c.rnd() < 0.15 ? 'scorch_block' : 'ashrock'); }
      for (let u = 0; u < 4; u++) for (let v = 0; v < 5; v++) {
        const edge = u === 0 || u === 3 || v === 0 || v === 4;
        if (!edge) continue;
        if (c.rnd() < 0.25) continue;
        c.put(s.x - 1 + u, y + v, s.z, c.rnd() < 0.85 ? 'obsidian' : 'ashrock');
      }
      c.chest(s.x + 3, y, s.z + 1, 'portal_ruin', 0);
    },
  });
  S('watchtower', {
    cell: 500, chance: 0.35, radius: 8, margin: 40, biomes: ['plains', 'taiga', 'savanna', 'desert', 'snowy_plains', 'meadow'],
    build(c, s) {
      const y = s.h + 1, H = 13;
      c.clearTrees(s.x, s.z, 6);
      for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) c.foundation(s.x + x, s.z + z, y - 1, 'cobble');
      c.fill(s.x - 3, y - 1, s.z - 3, s.x + 3, y - 1, s.z + 3, 'cobble');
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let k = 0; k < H; k++) c.put(s.x + dx, y + k, s.z + dz, 'dark_oak_log');
      for (const f of [5, 9, H]) c.fill(s.x - 3, y + f, s.z - 3, s.x + 3, y + f, s.z + 3, 'dark_oak_planks');
      for (let k = 0; k <= H; k++) { c.put(s.x, y + k, s.z, 0); c.put(s.x, y + k, s.z - 1, 'dark_oak_planks'); c.put(s.x, y + k, s.z, 'ladder', 0); }
      c.put(s.x, y + H + 1, s.z, 0);
      for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (Math.abs(x) === 3 || Math.abs(z) === 3) c.put(s.x + x, y + H + 1, s.z + z, 'dark_oak_planks');
      c.chest(s.x + 1, y + H + 1, s.z + 1, 'tower', 0);
      c.put(s.x - 2, y + H + 2, s.z - 2, 'torch'); c.put(s.x + 2, y + H + 2, s.z + 2, 'torch');
      c.cage(s.x + 1, y + 6, s.z + 1, 'archer');
    },
  });
  S('lodge', {
    cell: 800, chance: 0.7, radius: 16, margin: 60, biomes: ['dark_forest'],
    build(c, s) {
      const y = s.h + 1, W = 12, D = 8;
      c.clearTrees(s.x, s.z, 18);
      for (let x = -W; x <= W; x++) for (let z = -D; z <= D; z++) {
        c.foundation(s.x + x, s.z + z, y - 1, 'cobble'); c.put(s.x + x, y - 1, s.z + z, 'cobble');
        for (let k = 0; k < 14; k++) c.put(s.x + x, y + k, s.z + z, 0);
      }
      for (const fl of [0, 5]) {
        c.fill(s.x - W, y + fl, s.z - D, s.x + W, y + fl + 4, s.z + D, (x, yy, z) => {
          const corner = (Math.abs(x - s.x) === W || x - s.x === 0) && (Math.abs(z - s.z) === D);
          return corner ? 'dark_oak_log' : (yy === y + fl + 2 && (x + z) % 3 === 0 && (Math.abs(x - s.x) === W || Math.abs(z - s.z) === D) ? 'glass' : 'dark_oak_planks');
        }, 0);
        c.fill(s.x - W, y + fl, s.z - D, s.x + W, y + fl, s.z + D, fl ? 'dark_oak_planks' : 'birch_planks');
        // interior walls
        for (let z = -D; z <= D; z++) for (let k = 1; k <= 3; k++) { c.put(s.x - 4, y + fl + k, s.z + z, Math.abs(z) < 2 ? 0 : 'dark_oak_planks'); c.put(s.x + 4, y + fl + k, s.z + z, Math.abs(z) < 2 ? 0 : 'dark_oak_planks'); }
        c.put(s.x - 8, y + fl + 3, s.z, 'torch'); c.put(s.x + 8, y + fl + 3, s.z, 'torch'); c.put(s.x, y + fl + 3, s.z - 6, 'torch');
      }
      for (let k = 0; k <= Math.min(W, D); k++) c.fill(s.x - W - 1 + k, y + 10 + k, s.z - D - 1 + k, s.x + W + 1 - k, y + 10 + k, s.z + D + 1 - k, 'dark_oak_planks', null);
      for (let k = 1; k <= 3; k++) for (let w = -1; w <= 1; w++) c.put(s.x + w, y + k, s.z + D, 0);
      for (let k = 1; k <= 5; k++) c.put(s.x + 2, y + k, s.z - D + 1, 'ladder', 0);
      c.fill(s.x + 2, y + 5, s.z - D + 1, s.x + 2, y + 5, s.z - D + 1, 0);
      c.chest(s.x - 10, y + 1, s.z - 6, 'lodge', 0); c.chest(s.x + 10, y + 6, s.z + 6, 'lodge', 2); c.chest(s.x - 10, y + 6, s.z + 6, 'lodge', 2);
      c.put(s.x + 10, y + 1, s.z - 6, 'bookshelf'); c.put(s.x + 9, y + 1, s.z - 6, 'bookshelf'); c.put(s.x + 8, y + 1, s.z - 6, 'crafting_table');
      c.cage(s.x - 8, y + 6, s.z, 'shambler'); c.cage(s.x + 8, y + 1, s.z + 4, 'archer');
    },
  });
  S('desert_well', {
    cell: 160, chance: 0.18, radius: 3, margin: 10, biomes: ['desert'],
    build(c, s) {
      const y = s.h;
      c.fill(s.x - 2, y, s.z - 2, s.x + 2, y, s.z + 2, 'sandstone');
      c.fill(s.x - 1, y + 1, s.z - 1, s.x + 1, y + 1, s.z + 1, 'sandstone');
      c.put(s.x, y + 1, s.z, 'water'); c.put(s.x, y, s.z, 'water'); c.put(s.x, y - 1, s.z, 'sandstone');
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let k = 2; k <= 3; k++) c.put(s.x + dx, y + k, s.z + dz, 'sandstone');
      c.fill(s.x - 1, y + 4, s.z - 1, s.x + 1, y + 4, s.z + 1, 'cut_sandstone');
    },
  });
  // The Sealed Archive: holds the Rift Frame that opens the way to the Hollow.
  S('archive', {
    cell: 900, chance: 1, radius: 40, margin: 120,
    build(c, s) {
      const y = 22;
      const wall = () => c.stoneMix();
      // portal hall
      c.fill(s.x - 8, y - 1, s.z - 8, s.x + 8, y + 8, s.z + 8, wall, 0);
      // raised dais: a 2x2 opening over lava, ringed by the 8 Rift Frames (same ring the game checks)
      c.fill(s.x - 2, y, s.z - 2, s.x + 3, y + 1, s.z + 3, 'stone_bricks');
      c.fill(s.x, y, s.z, s.x + 1, y, s.z + 1, 'lava');
      c.fill(s.x, y + 1, s.z, s.x + 1, y + 1, s.z + 1, 0);
      BH.RIFT_RING.forEach(([dx, dz]) => c.put(s.x + dx, y + 1, s.z + dz, c.rnd() < 0.12 ? 'rift_frame_eye' : 'rift_frame'));
      c.cage(s.x, y, s.z - 6, 'crawler');
      for (const [dx, dz] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) c.put(s.x + dx, y + 3, s.z + dz, 'torch');
      // corridors to rooms
      const rooms = ['library', 'store', 'fountain', 'cells'];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz], i) => {
        const len = 12 + Math.floor(c.rnd() * 8);
        for (let t = 8; t < 8 + len; t++) {
          const cx = s.x + dx * t, cz = s.z + dz * t;
          for (let w = -2; w <= 2; w++) for (let k = -1; k <= 4; k++) {
            const edge = Math.abs(w) === 2 || k === -1 || k === 4;
            c.put(cx + (dz ? w : 0), y + k, cz + (dx ? w : 0), edge ? wall() : 0);
          }
          if (t % 6 === 0) c.put(cx + (dz ? 1 : 0), y + 2, cz + (dx ? 1 : 0), 'torch');
        }
        const rx = s.x + dx * (8 + len + 5), rz = s.z + dz * (8 + len + 5);
        c.fill(rx - 5, y - 1, rz - 5, rx + 5, y + 6, rz + 5, wall, 0);
        const ex = s.x + dx * (8 + len), ez = s.z + dz * (8 + len);
        for (let w = -1; w <= 1; w++) for (let k = 0; k < 3; k++) c.put(ex + (dz ? w : 0) + dx, y + k, ez + (dx ? w : 0) + dz, 0);
        c.put(rx, y + 4, rz, 'torch');
        const kind = rooms[i];
        if (kind === 'library') {
          for (let a = -4; a <= 4; a++) for (let k = 0; k < 4; k++) { c.put(rx + a, y + k, rz - 4, 'bookshelf'); c.put(rx - 4, y + k, rz + a, a > -2 && a < 2 && k < 3 ? 0 : 'bookshelf'); c.put(rx + 4, y + k, rz + a, 'bookshelf'); }
          c.chest(rx + 2, y, rz + 2, 'library', 0); c.chest(rx - 2, y, rz - 2, 'library', 0); c.put(rx, y, rz, 'crafting_table');
        } else if (kind === 'store') { c.chest(rx - 3, y, rz - 3, 'archive', 0); c.chest(rx + 3, y, rz + 3, 'archive', 2); c.chest(rx + 3, y, rz - 3, 'archive', 0); c.put(rx, y, rz, 'barrel'); }
        else if (kind === 'fountain') { c.fill(rx - 1, y, rz - 1, rx + 1, y, rz + 1, 'water'); c.put(rx, y + 1, rz, 'stone_bricks'); c.put(rx, y + 2, rz, 'water'); c.chest(rx + 3, y, rz, 'archive', 1); }
        else { for (let a = -4; a <= 4; a += 3) { c.put(rx + a, y, rz + 3, 'cobble'); c.put(rx + a, y + 1, rz + 3, 'cobble'); } c.cage(rx, y, rz, 'shambler'); c.chest(rx - 3, y, rz - 3, 'archive', 0); }
        // a stair-shaft up to the surface from the library
        if (kind === 'library') {
          const sx = rx + dz * 0 + 3, sz = rz + 3;
          const top = c.ground(sx, sz);
          for (let k = y; k <= top + 1; k++) { c.put(sx, k, sz, 0); c.put(sx, k, sz + 1, wall()); c.put(sx, k, sz, k > top ? 0 : 'ladder', 2); }
          c.put(sx, top + 1, sz + 1, 'stone_bricks'); c.put(sx, top + 2, sz + 1, 'torch');
        }
      });
    },
  });

  // ---------- Cinderdeep builders
  S('cinder_fortress', {
    dim: 'cinder', cell: 288, chance: 0.75, radius: 56, margin: 70,
    build(c, s) {
      const y = 62 + Math.floor(c.rnd() * 10);
      const B = 'cinder_bricks';
      const bridge = (dx, dz, len) => {
        for (let t = 0; t < len; t++) {
          const cx = s.x + dx * t, cz = s.z + dz * t;
          for (let w = -2; w <= 2; w++) {
            const px = cx + (dz ? w : 0), pz = cz + (dx ? w : 0);
            c.put(px, y, pz, B);
            for (let k = 1; k <= 4; k++) c.put(px, y + k, pz, (Math.abs(w) === 2 && k === 1) ? B : (k === 4 && t % 2 ? B : 0));
          }
          if (t % 10 === 5) for (let k = y - 1; k > BH.LAVA_SEA - 4; k--) for (let w = -1; w <= 1; w++) for (let v = -1; v <= 1; v++) c.put(cx + w, k, cz + v, B);
          if (t % 12 === 6) c.put(cx + (dz ? 1 : 0), y + 1, cz + (dx ? 1 : 0), 'glowshroom');
        }
      };
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => bridge(dx, dz, 30 + Math.floor(c.rnd() * 20)));
      // central keep
      c.fill(s.x - 7, y, s.z - 7, s.x + 7, y + 8, s.z + 7, B, 0);
      c.fill(s.x - 7, y, s.z - 7, s.x + 7, y, s.z + 7, B);
      for (let w = -1; w <= 1; w++) for (let k = 1; k <= 3; k++) { c.put(s.x + 7, y + k, s.z + w, 0); c.put(s.x - 7, y + k, s.z + w, 0); c.put(s.x + w, y + k, s.z + 7, 0); c.put(s.x + w, y + k, s.z - 7, 0); }
      // ember cap garden
      for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (Math.abs(x) > 1 || Math.abs(z) > 1) { c.put(s.x + x, y, s.z + z, 'gloomsand'); c.put(s.x + x, y + 1, s.z + z, 'glowshroom'); }
      c.cage(s.x, y + 1, s.z, 'sentinel');
      c.cage(s.x + 5, y + 1, s.z + 5, 'wraith');
      c.chest(s.x - 5, y + 1, s.z - 5, 'fortress', 0);
      c.chest(s.x + 5, y + 1, s.z - 5, 'fortress', 0);
      c.put(s.x - 5, y + 5, s.z + 5, 'sunstone'); c.put(s.x + 5, y + 5, s.z - 5, 'sunstone');
      // outer sentinel tower
      const tx = s.x + 22, tz = s.z + 6;
      c.fill(tx - 3, y, tz - 3, tx + 3, y + 7, tz + 3, B, 0);
      c.fill(tx - 3, y, tz - 3, tx + 3, y, tz + 3, B);
      for (let k = 1; k <= 3; k++) c.put(tx, y + k, tz - 3, 0);
      for (let k = 1; k <= 3; k++) c.put(tx, y + k, tz - 4, 0);
      c.cage(tx, y + 1, tz, 'sentinel');
      c.chest(tx + 2, y + 1, tz + 2, 'fortress', 2);
    },
  });
  S('ashen_keep', {
    dim: 'cinder', cell: 340, chance: 0.55, radius: 14, margin: 40,
    build(c, s) {
      const y = 36;
      c.fill(s.x - 11, y, s.z - 11, s.x + 11, y + 16, s.z + 11, (x, yy, z) => (yy % 5 === 0 ? 'cinder_bricks' : 'basalt'), 0);
      for (const f of [5, 10]) c.fill(s.x - 10, y + f, s.z - 10, s.x + 10, y + f, s.z + 10, (x, yy, z) => (Math.abs(x - s.x) < 4 && Math.abs(z - s.z) < 4) ? 0 : 'cinder_bricks');
      for (let w = -1; w <= 1; w++) for (let k = 1; k <= 3; k++) c.put(s.x + w, y + k, s.z + 11, 0);
      for (let k = 1; k <= 11; k++) c.put(s.x - 9, y + k, s.z - 9, 'ladder', 0);
      c.fill(s.x - 9, y + 5, s.z - 9, s.x - 9, y + 5, s.z - 9, 0); c.fill(s.x - 9, y + 10, s.z - 9, s.x - 9, y + 10, s.z - 9, 0);
      c.fill(s.x - 1, y + 11, s.z - 1, s.x + 1, y + 11, s.z + 1, 'gold_block');
      c.chest(s.x, y + 12, s.z, 'keep', 0);
      c.chest(s.x + 8, y + 1, s.z + 8, 'keep', 2); c.chest(s.x - 8, y + 6, s.z + 8, 'keep', 2);
      c.cage(s.x + 6, y + 6, s.z - 6, 'hound'); c.cage(s.x - 6, y + 1, s.z - 6, 'hound');
      c.put(s.x, y + 4, s.z, 'sunstone'); c.put(s.x, y + 15, s.z, 'sunstone');
    },
  });

  // ---------- Hollow builders
  S('spire', {
    dim: 'hollow', cell: 200, chance: 0.6, radius: 14, margin: 30,
    check: (g, x, z) => { const r = Math.sqrt(x * x + z * z); if (r < 480) return false; const n = g.n1.noise2(x / 90, z / 90) * 0.7 + g.n2.noise2(x / 30, z / 30) * 0.3; return n > 0.3; },
    build(c, s) {
      const n = (x, z) => s.gen.n1.noise2(x / 90, z / 90) * 0.7 + s.gen.n2.noise2(x / 30, z / 30) * 0.3;
      const y = 60 + Math.round((n(s.x, s.z) - 0.18) * 30) + 1;
      const H = 18 + Math.floor(c.rnd() * 12);
      c.fill(s.x - 3, y, s.z - 3, s.x + 3, y + H, s.z + 3, 'lumen_tile', 0);
      for (let f = 0; f < H; f += 6) { c.fill(s.x - 2, y + f, s.z - 2, s.x + 2, y + f, s.z + 2, 'lumen_tile'); c.put(s.x + 2, y + f + 1, s.z + 2, 'hollow_lantern'); c.put(s.x, y + f, s.z, 0); }
      for (let k = 0; k <= H; k++) { c.put(s.x, y + k, s.z, 'ladder', 0); c.put(s.x, y + k, s.z - 1, 'lumen_tile'); }
      for (let k = 1; k <= 2; k++) c.put(s.x, y + k, s.z + 3, 0);
      c.chest(s.x - 2, y + 1, s.z - 2, 'spire', 0);
      // rooftop with the cloak chest
      c.fill(s.x - 4, y + H, s.z - 4, s.x + 4, y + H, s.z + 4, 'lumen_tile');
      c.put(s.x, y + H, s.z, 0);
      c.chest(s.x + 2, y + H + 1, s.z + 2, 'spire_top', 2);
      for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) c.put(s.x + dx, y + H + 1, s.z + dz, 'hollow_lantern');
    },
  });

  // Seeker Eyes fly toward the nearest Sealed Archive.
  function nearest(gen, key, x, z) {
    const T = TYPES.find(t => t.key === key);
    const gx = Math.floor(x / T.cell), gz = Math.floor(z / T.cell);
    let best = null, bd = 1e18;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const s = site(gen, T, gx + a, gz + b); if (!s) continue;
      const d = (s.x - x) ** 2 + (s.z - z) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  BH.Structures = { TYPES, LOOT, rollLoot, nearest, apply };
})();
