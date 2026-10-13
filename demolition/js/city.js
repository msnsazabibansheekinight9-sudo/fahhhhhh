'use strict';
/* Crumble — city generator: street grids, building types for each district style, special zones
   (airport, military base, marina, golf course, construction site, lumber yard) and the four maps. */

const CITY = {
  // Flat ground for the whole map, 16 voxels deep, optional shaping function.
  terrain(w, fn) {
    const sx = w.sx, sz = w.sz, d = w.data;
    for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
      const [top, m] = fn ? fn(x, z) : [GY, M.GRASS];
      for (let y = 0; y < top; y++) d[(y * sz + z) * sx + x] = y === 0 ? M.BEDROCK : y === top - 1 ? m : y > top - 4 && m !== M.STONE && m !== M.SAND ? M.DIRT : M.STONE;
    }
  },
  // Road along x (axis 'x') or z: asphalt, flush sidewalks, centre dashes, lamps.
  road(K, axis, a0, a1, c, rw) {
    const { box, S } = K; rw = rw || 14;
    const sw = 3, w = rw + sw * 2;
    if (axis === 'x') {
      box(a0, GY - 1, c, a1, GY, c + w, M.ASPHALT, 6);
      box(a0, GY - 1, c + sw, a1, GY, c + sw + rw, M.ASPHALT);
      for (let x = a0; x < a1; x++) if (x % 10 < 5) { S(x, GY - 1, c + sw + (rw >> 1) - 1, M.ASPHALT, 3); }
      for (let x = a0 + 6; x < a1; x += 40) this.lamp(K, x, c + 1, 1);
    } else {
      box(c, GY - 1, a0, c + w, GY, a1, M.ASPHALT, 6);
      box(c + sw, GY - 1, a0, c + sw + rw, GY, a1, M.ASPHALT);
      for (let z = a0; z < a1; z++) if (z % 10 < 5) { S(c + sw + (rw >> 1) - 1, GY - 1, z, M.ASPHALT, 3); }
      for (let z = a0 + 26; z < a1; z += 40) this.lamp(K, c + 1, z, 0);
    }
  },
  lamp(K, x, z, ax) {
    const { box, S } = K;
    box(x, GY, z, x + 1, GY + 18, z + 1, M.STEEL);
    if (ax) { box(x, GY + 17, z, x + 1, GY + 18, z + 3, M.STEEL); S(x, GY + 16, z + 2, M.GLASS); }
    else { box(x, GY + 17, z, x + 3, GY + 18, z + 1, M.STEEL); S(x + 2, GY + 16, z, M.GLASS); }
  },
  crosswalk(K, x, z, axis) {
    for (let k = 0; k < 14; k += 2) for (let q = 0; q < 4; q++) axis === 'x' ? K.S(x + q, GY - 1, z + 3 + k, M.ASPHALT, 6) : K.S(x + 3 + k, GY - 1, z + q, M.ASPHALT, 6);
  },
  // A street grid over a rectangle; returns the blocks between the roads.
  grid(K, x0, z0, x1, z1, step, opts) {
    opts = opts || {};
    const rw = 14, W = rw + 6, xs = [], zs = [];
    for (let x = x0; x + W <= x1; x += step) xs.push(x);
    for (let z = z0; z + W <= z1; z += step) zs.push(z);
    for (const z of zs) this.road(K, 'x', x0, x1, z, rw);
    for (const x of xs) this.road(K, 'z', z0, z1, x, rw);
    for (const x of xs) for (const z of zs) { K.box(x, GY - 1, z, x + W, GY, z + W, M.ASPHALT); this.crosswalk(K, x - 4, z, 'x'); this.crosswalk(K, x, z - 4, 'z'); }
    const blocks = [];
    const bx = xs.map(x => x + W).concat([]), bz = zs.map(z => z + W);
    for (let i = 0; i < xs.length; i++) for (let j = 0; j < zs.length; j++) {
      // Blocks on the outer edge stop short of it, so buildings facing outward still have a verge in front.
      const a = bx[i], b = bz[j], c = i + 1 < xs.length ? xs[i + 1] : Math.min(x1, WORLD_X - 24), d = j + 1 < zs.length ? zs[j + 1] : Math.min(z1, WORLD_Z - 24);
      if (c - a >= 30 && d - b >= 30) blocks.push([a, b, c, d]);
    }
    // Cars parked along the kerbs.
    if (opts.parking !== false) for (const z of zs) for (let x = x0 + 8; x < x1 - 20; x += 26 + ((K.rnd() * 20) | 0)) if (K.rnd() < 0.55 && !xs.some(rx => x + 18 > rx - 4 && x < rx + W + 4)) K.car(x, z + 3, true, 0, opts.carPool ? opts.carPool[(K.rnd() * opts.carPool.length) | 0] : null);
    return blocks;
  },

  // ---------- building types (all walkable: door to the street, stairs to every floor and to flat roofs)
  office(K, x, z, wdt, dep, floors, door, name) {
    const { box, shell, L } = K, x1 = x + wdt, z1 = z + dep, holes = [];
    for (let f = 0; f < floors; f++) {
      const fy = GY + f * STOREY;
      box(x, fy, z, x1, fy + 1, z1, M.CONCRETE);
      shell(x, fy + 1, z, x1, fy + STOREY, z1, 1, M.GLASS);
      box(x, fy + 1, z, x1, fy + 3, z1, M.CONCRETE); box(x + 1, fy + 1, z + 1, x1 - 1, fy + 3, z1 - 1, M.AIR);
      for (let k = x; k < x1; k += 8) for (const q of [z, z1 - 2]) box(Math.min(k, x1 - 2), fy + 1, q, Math.min(k, x1 - 2) + 2, fy + STOREY, q + 2, M.CONCRETE);
      for (let q = z; q < z1; q += 8) for (const k of [x, x1 - 2]) box(k, fy + 1, Math.min(q, z1 - 2), k + 2, fy + STOREY, Math.min(q, z1 - 2) + 2, M.CONCRETE);
      // Open stairs along the east side, desks along the back, a glass meeting room in the front-west corner.
      for (let d = 0; d + 7 < wdt - 14; d += 7) box(x + 4 + d, fy + 1, z1 - 7, x + 8 + d, fy + 3, z1 - 4, M.WOOD);
      box(x + 12, fy + 1, z + 2, x + 13, fy + STOREY, z + 12, M.GLASS); box(x + 12, fy + 1, z + 5, x + 13, fy + 9, z + 9, M.AIR);
      holes.push(K.flight(f % 2 ? x1 - 11 : x1 - 7, z + 4, fy, M.CONCRETE));
      L.floors.push({ x: x + K.ox, z: z + K.oz, x1: x1 + K.ox, z1: z1 + K.oz, y: fy + 1, name: name || 'office' });
    }
    const top = GY + floors * STOREY;
    box(x, top, z, x1, top + 1, z1, M.CONCRETE); shell(x, top + 1, z, x1, top + 3, z1, 1, M.CONCRETE);
    box(x + 4, top + 1, z1 - 10, x + 12, top + 5, z1 - 4, M.METAL);                  // plant room
    for (const h of holes) K.cut(h);
    { const h = holes[holes.length - 1]; box(h[0] - 1, top + 1, h[2], h[0], top + 3, h[5], M.STEEL); }
    L.floors.push({ x: x + K.ox, z: z + K.oz, x1: x1 + K.ox, z1: z1 + K.oz, y: top + 1, name: (name || 'office') + ' roof' });
    this.door(K, x, z, x1, z1, door, 1, 6);
    return [x, GY, z, x1, top + 5, z1];
  },
  door(K, x, z, x1, z1, side, t, wd) {
    wd = wd || 4; const mx = x + ((x1 - x - wd) >> 1), mz = z + ((z1 - z - wd) >> 1);
    if (side === 'north') K.box(mx, GY + 1, z, mx + wd, GY + 9, z + t, M.AIR);
    else if (side === 'south') K.box(mx, GY + 1, z1 - t, mx + wd, GY + 9, z1, M.AIR);
    else if (side === 'west') K.box(x, GY + 1, mz, x + t, GY + 9, mz + wd, M.AIR);
    else K.box(x1 - t, GY + 1, mz, x1, GY + 9, mz + wd, M.AIR);
  },
  apartment(K, x, z, wdt, dep, floors, door, name) {
    const wall = K.rnd() < 0.5 ? M.BRICK : M.PLASTER, paint = wall === M.PLASTER ? [0, 3, 4, 5, 6, 7][(K.rnd() * 6) | 0] : 0;
    const b = K.house({ x, z, wdt, dep, floors, wall, t: 1, floor: M.CONCRETE, roof: 'flat', door, paint, winGap: 6, name: name || 'apartments' });
    // Balconies on the street side.
    for (let f = 1; f < floors; f++) for (let k = x + 4; k + 6 < x + wdt - 6; k += 12) {
      const y = GY + f * STOREY;
      if (door === 'north') { K.box(k, y, z - 3, k + 6, y + 1, z, M.CONCRETE); K.box(k, y + 1, z - 3, k + 6, y + 3, z - 2, M.STEEL); }
      else if (door === 'south') { K.box(k, y, z + dep, k + 6, y + 1, z + dep + 3, M.CONCRETE); K.box(k, y + 1, z + dep + 2, k + 6, y + 3, z + dep + 3, M.STEEL); }
    }
    return b;
  },
  shop(K, x, z, wdt, dep, door) {
    const paint = [2, 3, 4, 5, 7][(K.rnd() * 5) | 0];
    const b = K.house({ x, z, wdt, dep, floors: 2, wall: M.PLASTER, t: 1, floor: M.CONCRETE, roof: 'flat', door, paint: 6, winGap: 6, name: 'shop' });
    // Shop front: a glass ground floor with an awning on the street side, shelves inside.
    const front = door === 'north' ? [x + 2, z, x + wdt - 2, z + 1, 0, -3] : door === 'south' ? [x + 2, z + dep - 1, x + wdt - 2, z + dep, 0, 3] : null;
    if (front) {
      K.box(front[0], GY + 1, front[1], front[2], GY + 10, front[3], M.GLASS);
      this.door(K, x, z, x + wdt, z + dep, door, 1, 4);
      const az = front[5] < 0 ? z - 4 : z + dep;
      for (let q = 0; q < 4; q++) K.box(x, GY + 11 - (front[5] < 0 ? 3 - q : q) * 0, az + q, x + wdt, GY + 12, az + q + 1, M.CLOTH);
      for (let q = 0; q < 4; q++) K.box(x, GY + 11, az + q, x + wdt, GY + 12, az + q + 1, M.CLOTH, paint);
    }
    for (let k = x + 4; k < x + wdt * 0.4; k += 5) K.box(k, GY + 1, z + 6, k + 2, GY + 6, z + dep - 6, M.PLANK);
    K.box(x + wdt - 14, GY + 1, z + dep - 8, x + wdt - 9, GY + 4, z + dep - 6, M.WOOD);
    return b;
  },
  // Multi-storey car park: open decks on columns, a ramp up each level, cars inside.
  garage(K, x, z, wdt, dep, levels) {
    const { box, L } = K, x1 = x + wdt, z1 = z + dep, holes = [];
    const rx = x1 - 13, rz = z + 4;
    for (let f = 0; f <= levels; f++) {
      const fy = GY - 1 + f * 10;
      if (f) box(x, fy, z, x1, fy + 1, z1, M.CONCRETE);
      if (f) { box(x, fy + 1, z, x1, fy + 3, z + 1, M.CONCRETE); box(x, fy + 1, z1 - 1, x1, fy + 3, z1, M.CONCRETE); box(x, fy + 1, z, x + 1, fy + 3, z1, M.CONCRETE); box(x1 - 1, fy + 1, z, x1, fy + 3, z1, M.CONCRETE); }
      if (f < levels) {
        for (let k = x; k < x1; k += 12) for (let q = z; q < z1; q += 14) { const cx = Math.min(k, x1 - 2), cz = Math.min(q, z1 - 2); if (cx + 2 > rx - 2 && cz < rz + 34) continue; box(cx, fy + 1, cz, cx + 2, fy + 10, cz + 2, M.CONCRETE); }
        // Ramp along the east side: 10 up over 30; the deck above is opened over it once every deck is laid.
        for (let s = 0; s < 30; s++) box(rx, fy + 1 + Math.floor(s / 3), rz + s, rx + 11, fy + 2 + Math.floor(s / 3), rz + s + 1, M.CONCRETE);
        holes.push([rx, fy + 10, rz, rx + 11, fy + 11, rz + 27]);
        box(rx - 1, fy + 1, rz, rx, fy + 4, rz + 30, M.CONCRETE);
        L.floors.push({ x: x + K.ox, z: z + K.oz, x1: x1 + K.ox, z1: z1 + K.oz, y: fy + 1, name: 'car park' });
        for (let k = x + 4; k + 9 < rx - 2; k += 11) if (K.rnd() < 0.6) K.vehicle(['sedan', 'hatch', 'wagon', 'suv', 'micro', 'coupe'][(K.rnd() * 6) | 0], k + 4.5, z1 - 12, 0, { y: fy + 1 });
      }
    }
    for (const h of holes) K.cut(h);
    L.floors.push({ x: x + K.ox, z: z + K.oz, x1: x1 + K.ox, z1: z1 + K.oz, y: GY + levels * 10, name: 'car park roof' });
    box(x + 2, GY, z, x + 12, GY + 4, z + 1, M.AIR);
    return [x, GY, z, x1, GY + levels * 10 + 3, z1];
  },
  warehouse(K, x, z, wdt, dep, door) {
    const { box, shell, L } = K, x1 = x + wdt, z1 = z + dep, h = 22;
    box(x, GY - 1, z, x1, GY, z1, M.CONCRETE);
    shell(x, GY, z, x1, GY + h, z1, 1, M.METAL, [0, 4, 5, 6][(K.rnd() * 4) | 0]);
    for (let k = x; k < x1; k += 10) { box(Math.min(k, x1 - 2), GY, z, Math.min(k, x1 - 2) + 2, GY + h, z + 2, M.STEEL); box(Math.min(k, x1 - 2), GY, z1 - 2, Math.min(k, x1 - 2) + 2, GY + h, z1, M.STEEL); }
    box(x, GY + h, z, x1, GY + h + 1, z1, M.METAL);
    for (let k = x; k < x1; k += 10) box(Math.min(k, x1 - 2), GY + h - 1, z, Math.min(k, x1 - 2) + 2, GY + h, z1, M.STEEL);
    const dw = Math.min(16, wdt - 8), dx = x + ((wdt - dw) >> 1);
    if (door === 'north') box(dx, GY, z, dx + dw, GY + 15, z + 1, M.AIR); else if (door === 'south') box(dx, GY, z1 - 1, dx + dw, GY + 15, z1, M.AIR);
    else if (door === 'west') box(x, GY, z + 6, x + 1, GY + 15, z + 6 + dw, M.AIR); else box(x1 - 1, GY, z + 6, x1, GY + 15, z + 6 + dw, M.AIR);
    for (let r = 0; r < 2; r++) { const sz = z + 6 + r * 12; if (sz + 4 > z1 - 6) break; for (let l = 0; l < 3; l++) box(x + 4, GY + l * 6, sz, x + Math.min(30, wdt - 6), GY + 1 + l * 6, sz + 4, M.PLANK); for (let k = x + 4; k < x + Math.min(30, wdt - 6); k += 9) box(k, GY, sz, k + 1, GY + 17, sz + 4, M.WOOD); }
    for (let k = 0; k < 4; k++) K.crate(x1 - 12 + (k % 2) * 4, z1 - 12 + ((k / 2) | 0) * 4, 3);
    L.floors.push({ x: x + K.ox, z: z + K.oz, x1: x1 + K.ox, z1: z1 + K.oz, y: GY, name: 'warehouse' });
    return [x, GY, z, x1, GY + h + 1, z1];
  },
  factory(K, x, z, wdt, dep, door) {
    const { box, shell, cyl, L } = K, x1 = x + wdt, z1 = z + dep, h = 20;
    box(x, GY - 1, z, x1, GY, z1, M.CONCRETE);
    shell(x, GY, z, x1, GY + h, z1, 2, M.BRICK);
    for (let k = x + 4; k + 5 < x1 - 2; k += 9) { box(k, GY + 6, z, k + 5, GY + 14, z + 2, M.GLASS); box(k, GY + 6, z1 - 2, k + 5, GY + 14, z1, M.GLASS); }
    // Saw-tooth roof with north lights.
    for (let k = x; k + 12 <= x1; k += 12) for (let q = 0; q < 6; q++) { box(k + q * 2, GY + h + q, z, k + q * 2 + 2, GY + h + q + 1, z1, M.ROOF); box(k + 11, GY + h, z, k + 12, GY + h + 6, z1, M.GLASS); }
    box(x, GY + h - 1, z, x1, GY + h, z1, M.STEEL); box(x + 2, GY + h - 1, z + 2, x1 - 2, GY + h, z1 - 2, M.AIR);
    for (let k = x + 10; k < x1 - 6; k += 12) box(k, GY + h - 2, z + 2, k + 1, GY + h - 1, z1 - 2, M.STEEL);
    this.door(K, x, z, x1, z1, door, 2, 12);
    for (let k = 0; k < 3; k++) { box(x + 8 + k * 14, GY, z + 8, x + 16 + k * 14, GY + 6, z + 14, M.METAL, 3); box(x + 10 + k * 14, GY + 6, z + 9, x + 14 + k * 14, GY + 8, z + 13, M.STEEL); }
    cyl(x1 - 8, z1 - 8, 4, GY, GY + h + 26, M.BRICK, 1.2);
    for (const [bx, bz] of [[x + 6, z1 - 8], [x + 10, z1 - 8]]) K.barrel(bx, bz);
    L.floors.push({ x: x + K.ox, z: z + K.oz, x1: x1 + K.ox, z1: z1 + K.oz, y: GY, name: 'factory' });
    return [x, GY, z, x1, GY + h + 26, z1];
  },
  gasStation(K, x, z, wdt, dep) {
    const { box, L } = K;
    box(x, GY - 1, z, x + wdt, GY, z + dep, M.CONCRETE);
    for (const [a, b] of [[x + 6, z + 3], [x + wdt - 8, z + 3], [x + 6, z + 10], [x + wdt - 8, z + 10]]) box(a, GY, b, a + 2, GY + 14, b + 2, M.STEEL);
    box(x + 2, GY + 14, z + 1, x + wdt - 2, GY + 16, z + 13, M.METAL, 2);
    for (let k = 0; k < 3; k++) { const px = x + 12 + k * 10; box(px, GY, z + 5, px + 3, GY + 6, z + 8, M.METAL, 6); box(px + 1, GY + 1, z + 6, px + 2, GY + 4, z + 7, M.BARREL); }
    K.house({ x: x + 4, z: z + dep - 22, wdt: Math.min(30, wdt - 8), dep: 20, floors: 1, wall: M.PLASTER, roof: 'flat', door: 'north', paint: 6, name: 'gas station shop' });
    return [x, GY, z, x + wdt, GY + 16, z + dep];
  },
  park(K, x, z, wdt, dep) {
    const { box, cyl, tree } = K;
    box(x + (wdt >> 1) - 2, GY - 1, z, x + (wdt >> 1) + 2, GY, z + dep, M.GRAVEL);
    box(x, GY - 1, z + (dep >> 1) - 2, x + wdt, GY, z + (dep >> 1) + 2, M.GRAVEL);
    cyl(x + (wdt >> 1), z + (dep >> 1), 6, GY, GY + 2, M.MARBLE, 1.2); cyl(x + (wdt >> 1), z + (dep >> 1), 5, GY, GY + 1, M.POOL); cyl(x + (wdt >> 1), z + (dep >> 1), 1.2, GY, GY + 6, M.MARBLE);
    for (let k = 0; k < 6; k++) { const tx = x + 4 + ((K.rnd() * (wdt - 10)) | 0), tz = z + 4 + ((K.rnd() * (dep - 10)) | 0); if (Math.abs(tx - x - wdt / 2) > 6 && Math.abs(tz - z - dep / 2) > 6) tree(tx, tz, 10 + ((K.rnd() * 4) | 0)); }
    for (let k = 0; k < 4; k++) { const bx = x + 8 + k * 9; box(bx, GY, z + (dep >> 1) + 4, bx + 4, GY + 1, z + (dep >> 1) + 5, M.PLANK); }
  },
  suburbanLot(K, x, z, wdt, dep, facing) {
    const fl = 1 + (K.rnd() < 0.7 ? 1 : 0), hw = Math.min(26, wdt - 8), hd = 20;
    const hx = x + ((wdt - hw) >> 1), hz = facing === 'north' ? z + 8 : z + dep - 8 - hd;
    const wall = [M.BRICK, M.PLASTER, M.WOOD][(K.rnd() * 3) | 0];
    if (K.rnd() < 0.7) K.tree(x + 3, facing === 'north' ? z + dep - 10 : z + 6, 10 + ((K.rnd() * 3) | 0));
    K.house({ x: hx, z: hz, wdt: hw, dep: hd, floors: fl, wall, t: 1, door: facing, paint: wall === M.BRICK ? 0 : [0, 3, 4, 5, 6][(K.rnd() * 5) | 0], winGap: 6, name: 'house' });
    const fz = facing === 'north' ? z + dep - 1 : z;
    K.fence(x, fz, x + wdt - 1, fz);
    const dz = facing === 'north' ? z : z + dep - 8;
    K.box(x + wdt - 12, GY - 1, dz, x + wdt - 3, GY, dz + 8, M.CONCRETE);
    if (K.rnd() < 0.55) K.car(x + wdt - 12, facing === 'north' ? z - 4 : z + dep - 14, false, 0);
  },
  rowhouses(K, x0, z0, x1, z1, opts) {
    // Narrow houses around the perimeter of a block, all facing the street; courtyard in the middle.
    const w = 14, d = 20, colors = [0, 2, 3, 4, 5, 6, 7];
    if (z1 - z0 > 2 * d + 10) { for (let k = 0; k < 3; k++) K.tree(x0 + 8 + ((K.rnd() * (x1 - x0 - 16)) | 0), z0 + d + 4 + ((K.rnd() * (z1 - z0 - 2 * d - 10)) | 0), 10); }
    for (let x = x0; x + w <= x1; x += w) {
      for (const [z, door] of z1 - z0 >= 2 * d + 4 ? [[z0, 'north'], [z1 - d, 'south']] : [[z0, 'north']]) {
        const timber = opts && opts.timber && K.rnd() < 0.4, wall = timber ? M.WOOD : K.rnd() < 0.45 ? M.BRICK : M.PLASTER;
        K.house({ x, z, wdt: w, dep: d, floors: 2 + ((K.rnd() * 3) | 0), wall, t: 1, door, paint: timber ? 6 : wall === M.PLASTER ? colors[(K.rnd() * colors.length) | 0] : 0, winGap: 6, name: 'row house' });
      }
    }
  },

  // Fill one city block in a given style.
  fillBlock(K, b, style) {
    const [x0, z0, x1, z1] = b, W = x1 - x0, D = z1 - z0, r = K.rnd();
    const halves = (fn) => { const hz = z0 + (D >> 1); fn(x0 + 2, z0 + 2, x1 - 2, hz - 2, 'north'); fn(x0 + 2, hz + 2, x1 - 2, z1 - 2, 'south'); };
    if (style === 'downtown') {
      halves((a, b2, c, d, door) => {
        const bw = c - a, bd = d - b2;
        if (bd < 20) return;
        const kind = K.rnd();
        if (kind < 0.35 && bw >= 30) this.office(K, a, b2, Math.min(bw, 56), Math.max(22, bd), 4 + ((K.rnd() * 4) | 0), door);
        else if (kind < 0.6) this.apartment(K, a, b2, Math.min(bw, 50), Math.max(20, bd), 3 + ((K.rnd() * 4) | 0), door);
        else if (kind < 0.8) { for (let k = a; k + 22 <= c; k += 24) this.shop(K, k, b2, 22, Math.max(20, bd), door); }
        else if (bw >= 40 && bd >= 36) this.garage(K, a, b2, Math.min(bw, 48), bd, 3);
        else this.park(K, a, b2, bw, bd);
      });
    } else if (style === 'residential') {
      const lw = 30;
      halves((a, b2, c, d, door) => { for (let k = a; k + lw <= c + 2; k += lw) if (d - b2 >= 30) this.suburbanLot(K, k, b2, lw, d - b2, door); });
      if (r < 0.15) { K.box(x0 + 2, GY - 1, z0 + 2, x1 - 2, GY, z1 - 2, M.GRASS); }
    } else if (style === 'industrial') {
      if (r < 0.4) this.warehouse(K, x0 + 4, z0 + 4, Math.min(W - 8, 70), Math.min(D - 8, 50), 'south');
      else if (r < 0.75) this.factory(K, x0 + 4, z0 + 4, Math.min(W - 8, 72), Math.min(D - 8, 48), 'south');
      else { for (let k = 0; k < 6; k++) K.container(x0 + 6 + (k % 3) * 26, z0 + 8 + ((k / 3) | 0) * 14, true, [2, 3, 4, 5, 7][k % 5], k > 2 && K.rnd() < 0.4 ? GY + 10 : GY); }
      if (W > 90 && D > 70) this.gasStation(K, x1 - 44, z1 - 40, 40, 36);
    } else if (style === 'oldtown') {
      this.rowhouses(K, x0 + 2, z0 + 2, x1 - 2, z1 - 2, { timber: true });
    }
  },

  // ---------- special zones
  airport(K, x0, z0, x1, z1) {
    const { box, S, house, L } = K;
    const rx = x0 + 70, rw = 34;
    box(x0, GY - 1, z0, x1, GY, z1, M.GRASS);
    box(rx, GY - 1, z0 + 10, rx + rw, GY, z1 - 10, M.ASPHALT);
    for (let z = z0 + 30; z < z1 - 30; z += 24) box(rx + (rw >> 1) - 1, GY - 1, z, rx + (rw >> 1) + 1, GY, z + 12, M.ASPHALT, 6);
    for (const zz of [z0 + 14, z1 - 26]) for (let k = 0; k < 8; k++) box(rx + 3 + k * 4, GY - 1, zz, rx + 5 + k * 4, GY, zz + 12, M.ASPHALT, 6);
    for (let z = z0 + 10; z < z1 - 10; z++) { S(rx, GY - 1, z, M.ASPHALT, 6); S(rx + rw - 1, GY - 1, z, M.ASPHALT, 6); }
    for (let z = z0 + 20; z < z1 - 20; z += 30) { S(rx - 2, GY, z, M.GLASS); S(rx + rw + 1, GY, z, M.GLASS); }
    // Taxiway and apron.
    const ax = rx + rw + 16;
    box(ax, GY - 1, z0 + 40, ax + 16, GY, z1 - 40, M.ASPHALT);
    for (let z = z0 + 40; z < z1 - 40; z++) S(ax + 7, GY - 1, z, M.ASPHALT, 3);
    for (const zz of [z0 + 60, (z0 + z1) >> 1, z1 - 80]) box(rx + rw, GY - 1, zz, ax, GY, zz + 14, M.ASPHALT);
    box(ax + 16, GY - 1, z0 + 120, x1 - 10, GY, z1 - 120, M.CONCRETE);
    // Terminal, control tower and hangars along the far side.
    const tx = x1 - 54;
    const tb = house({ x: tx, z: z0 + 250, wdt: 44, dep: 120, floors: 2, wall: M.GLASS, t: 1, floor: M.CONCRETE, roof: 'flat', door: 'west', winGap: 6, name: 'terminal' });
    for (let z = z0 + 256; z < z0 + 366; z += 18) { box(tx + 10, GY + 1, z, tx + 34, GY + 3, z + 2, M.PLANK, 8); }
    house({ x: tx + 4, z: z0 + 194, wdt: 20, dep: 20, floors: 6, wall: M.CONCRETE, t: 1, floor: M.CONCRETE, roof: 'flat', door: 'west', winGap: 6, name: 'control tower' });
    box(tx + 5, GY + 6 * STOREY + 3, z0 + 195, tx + 25, GY + 6 * STOREY + 9, z0 + 215, M.GLASS); box(tx + 6, GY + 6 * STOREY + 3, z0 + 196, tx + 24, GY + 6 * STOREY + 9, z0 + 214, M.AIR);
    box(tx + 5, GY + 6 * STOREY + 9, z0 + 195, tx + 25, GY + 6 * STOREY + 10, z0 + 215, M.CONCRETE);
    for (const hz of [z0 + 450, z0 + 540]) {
      const hx = ax + 26, hw2 = x1 - hx - 8, hd = 70;
      box(hx, GY - 1, hz, hx + hw2, GY, hz + hd, M.CONCRETE);
      K.shell(hx, GY, hz, hx + hw2, GY + 26, hz + hd, 1, M.METAL, 6);
      for (let k = 0; k < 10; k++) box(hx, GY + 26 + k, hz + k * 2, hx + hw2, GY + 27 + k, hz + hd - k * 2, M.METAL, 6);
      box(hx, GY, hz + 4, hx + 1, GY + 24, hz + hd - 4, M.AIR);
      L.floors.push({ x: hx + K.ox, z: hz + K.oz, x1: hx + hw2 + K.ox, z1: hz + hd + K.oz, y: GY, name: 'hangar' });
    }
    K.vehicle('airliner', ax + 60, z0 + 300, Math.PI / 2); K.vehicle('cargo', ax + 60, z0 + 400, Math.PI / 2);
    K.vehicle('bizjet', ax + 60, z0 + 490, Math.PI / 2); K.vehicle('plane', ax + 50, z0 + 570, Math.PI / 2); K.vehicle('plane', ax + 50, z0 + 596, Math.PI / 2, { color: 0x2f6aa8 });
    K.vehicle('plane', rx + rw / 2, z1 - 60, 0, { color: 0xd8a21c });
    K.vehicle('truck', ax + 34, z0 + 220, Math.PI, { color: 0xe8e6de }); K.vehicle('pickup', ax + 30, z0 + 160, Math.PI, { color: 0xd8a21c });
    K.vehicle('fire', ax + 40, z0 + 140, Math.PI); K.vehicle('ifork', ax + 40, z0 + 520, 0); K.vehicle('heli', x1 - 30, z0 + 160, 0, { color: 0xe8e6de });
    for (let k = 0; k < 6; k++) K.barrel(x1 - 20 + (k % 2) * 4, z0 + 620 + ((k / 2) | 0) * 4);
  },
  militaryBase(K, x0, z0, x1, z1) {
    const { box, shell, house, L } = K;
    box(x0, GY - 1, z0, x1, GY, z1, M.GRAVEL);
    // Perimeter fence: steel posts, two rails and a top strand; gate with a guard hut.
    const fence = (a0, b0, a1, b1) => { const n = Math.max(Math.abs(a1 - a0), Math.abs(b1 - b0)), sa = Math.sign(a1 - a0), sb = Math.sign(b1 - b0); for (let k = 0; k <= n; k++) { const a = a0 + sa * k, b = b0 + sb * k; if (k % 6 === 0) box(a, GY, b, a + 1, GY + 12, b + 1, M.STEEL); else { K.S(a, GY + 3, b, M.METAL, 8); K.S(a, GY + 7, b, M.METAL, 8); K.S(a, GY + 11, b, M.STEEL); } } };
    fence(x0, z0, x1 - 1, z0); fence(x0, z1 - 1, x1 - 1, z1 - 1); fence(x0, z0, x0, z1 - 1); fence(x1 - 1, z0, x1 - 1, z1 - 1);
    const gz = z0 + 40; box(x0, GY, gz, x0 + 1, GY + 13, gz + 20, M.AIR);
    box(x0 + 4, GY - 1, gz, x1 - 40, GY, gz + 20, M.ASPHALT);
    house({ x: x0 + 4, z: gz - 22, wdt: 18, dep: 20, floors: 1, wall: M.CONCRETE, roof: 'flat', door: 'south', name: 'guard hut' });
    box(x0 + 4, GY + 6, gz + 2, x0 + 5, GY + 7, gz + 18, M.STEEL, 2);
    // Barracks, HQ, motor pool sheds, hangars, watchtowers, bunkers and an ammo dump.
    for (let k = 0; k < 3; k++) house({ x: x0 + 30 + k * 40, z: gz + 34, wdt: 34, dep: 20, floors: 2, wall: M.CONCRETE, roof: 'flat', door: 'north', paint: 5, winGap: 6, name: 'barracks' });
    const hq = house({ x: x0 + 150, z: gz + 30, wdt: 46, dep: 26, floors: 3, wall: M.BRICK, t: 2, roof: 'flat', door: 'north', winGap: 7, name: 'headquarters' });
    K.bld('hq', hq);
    const mp = [x0 + 30, gz + 90, x0 + 190, gz + 150];
    box(mp[0], GY - 1, mp[1], mp[2], GY, mp[3], M.CONCRETE);
    for (let k = 0; k < 5; k++) { const sx = mp[0] + k * 32; box(sx, GY + 14, mp[1], sx + 30, GY + 15, mp[1] + 26, M.METAL, 5); for (const [a, b] of [[0, 0], [28, 0]]) box(sx + a, GY, mp[1] + b, sx + a + 2, GY + 14, mp[1] + b + 2, M.STEEL); box(sx, GY, mp[1] + 24, sx + 30, GY + 15, mp[1] + 26, M.METAL, 5); }
    const veh = ['tank', 'apc', 'mtruck', 'rocketvan', 'mvan'];
    for (let k = 0; k < 5; k++) K.vehicle(veh[k], mp[0] + 15 + k * 32, mp[1] + 12, Math.PI);
    K.vehicle('tank', mp[0] + 40, mp[1] + 46, Math.PI / 2); K.vehicle('apc', mp[0] + 80, mp[1] + 46, Math.PI / 2); K.vehicle('mtruck', mp[0] + 120, mp[1] + 46, Math.PI / 2); K.vehicle('jeep', mp[0] + 150, mp[1] + 46, Math.PI / 2, { color: 0x55613f });
    // Airstrip with fighters and helicopters.
    const ax = x1 - 70;
    box(ax, GY - 1, z0 + 20, ax + 26, GY, z1 - 20, M.ASPHALT);
    for (let z = z0 + 30; z < z1 - 30; z += 20) box(ax + 12, GY - 1, z, ax + 14, GY, z + 10, M.ASPHALT, 6);
    for (let k = 0; k < 2; k++) {
      const hx = ax - 70, hz = z0 + 260 + k * 90, hd = 60;
      box(hx, GY - 1, hz, hx + 56, GY, hz + hd, M.CONCRETE);
      for (let q = 0; q < 14; q++) box(hx, GY + q, hz + q * 1.2 | 0, hx + 56, GY + q + 1, (hz + hd - q * 1.2) | 0, M.CONCRETE);
      box(hx + 1, GY, hz + 2, hx + 55, GY + 13, hz + hd - 2, M.AIR);
      box(hx + 55, GY, hz + 6, hx + 56, GY + 12, hz + hd - 6, M.AIR);
      L.floors.push({ x: hx + K.ox, z: hz + K.oz, x1: hx + 56 + K.ox, z1: hz + hd + K.oz, y: GY, name: 'aircraft shelter' });
      K.vehicle('fighter', hx + 28, hz + 30, -Math.PI / 2);
      box(hx + 56, GY - 1, hz + 20, ax, GY, hz + 40, M.ASPHALT);
    }
    for (const [hx, hz] of [[x0 + 230, gz + 100], [x0 + 230, gz + 150]]) { K.cyl(hx, hz, 12, GY - 1, GY, M.CONCRETE); K.vehicle('attackheli', hx, hz, Math.PI / 2); }
    K.vehicle('heli', x0 + 230, gz + 200, Math.PI / 2, { color: 0x55613f });
    for (const [tx, tz] of [[x0 + 6, z0 + 6], [x1 - 14, z0 + 6], [x0 + 6, z1 - 14], [x1 - 14, z1 - 14]]) {
      for (const [a, b] of [[0, 0], [7, 0], [0, 7], [7, 7]]) box(tx + a, GY, tz + b, tx + a + 1, GY + 22, tz + b + 1, M.STEEL);
      box(tx - 1, GY + 22, tz - 1, tx + 9, GY + 23, tz + 9, M.PLANK); K.shell(tx - 1, GY + 23, tz - 1, tx + 9, GY + 26, tz + 9, 1, M.PLANK, 5);
      box(tx - 1, GY + 30, tz - 1, tx + 9, GY + 31, tz + 9, M.METAL, 5);
      for (const [a, b] of [[-1, -1], [8, -1], [-1, 8], [8, 8]]) box(tx + a, GY + 26, tz + b, tx + a + 1, GY + 30, tz + b + 1, M.STEEL);
      box(tx + 2, GY, tz, tx + 5, GY + 24, tz + 1, M.LADDER);
      box(tx + 2, GY + 22, tz, tx + 6, GY + 23, tz + 4, M.AIR);
      L.floors.push({ x: tx + K.ox, z: tz + K.oz, x1: tx + 8 + K.ox, z1: tz + 8 + K.oz, y: GY + 23, name: 'watchtower' });
    }
    const dx = x0 + 40, dz = z1 - 90;
    for (let k = 0; k < 3; k++) { const bx = dx + k * 34; shell(bx, GY, dz, bx + 24, GY + 10, dz + 20, 3, M.CONCRETE); box(bx, GY + 10, dz, bx + 24, GY + 13, dz + 20, M.CONCRETE); box(bx + 9, GY, dz, bx + 15, GY + 8, dz + 3, M.STEEL); for (let q = 0; q < 4; q++) K.barrel(bx + 4 + q * 4, dz + 12); }
    K.bld('ammo', [dx, GY, dz, dx + 92, GY + 13, dz + 20]);
    for (let k = 0; k < 12; k++) K.crate(x0 + 200 + (k % 4) * 5, z1 - 60 + ((k / 4) | 0) * 5, 4);
  },
  marina(K, x0, z0, x1, z1, waterZ) {
    const { box, house } = K;
    // Seabed falls away south of waterZ, finger piers on piles, a boathouse and a fuel dock.
    for (let z = waterZ; z < z1; z++) for (let x = x0; x < x1; x++) { const top = Math.max(4, GY - 2 - Math.round((z - waterZ) * 0.5)); for (let y = top; y < GY; y++) K.S(x, y, z, M.AIR); K.S(x, top - 1, z, M.SAND); }
    box(x0, GY - 1, waterZ - 10, x1, GY, waterZ, M.PLANK);
    const boats = ['fishing', 'cruise', 'raceboat', 'rowboat', 'boat', 'yacht', 'tug', 'rowboat', 'boat', 'raceboat'];
    let bi = 0;
    for (let px = x0 + 20; px + 6 < x1 - 10; px += 46) {
      box(px, GY - 1, waterZ, px + 6, GY, Math.min(z1 - 10, waterZ + 90), M.PLANK);
      for (let z = waterZ + 4; z < Math.min(z1 - 10, waterZ + 90); z += 8) { box(px, 2, z, px + 1, GY - 1, z + 1, M.WOOD); box(px + 5, 2, z, px + 6, GY - 1, z + 1, M.WOOD); }
      for (const [side, zz] of [[-1, waterZ + 30], [1, waterZ + 30], [-1, waterZ + 70], [1, waterZ + 70]]) {
        const t = boats[bi++ % boats.length], T = VTYPES[t];
        K.vehicle(t, side < 0 ? px - T.W / 2 - 2 : px + 6 + T.W / 2 + 2, zz, 0);
      }
    }
    house({ x: x0 + 10, z: waterZ - 46, wdt: 34, dep: 22, floors: 2, wall: M.WOOD, roof: 'gable', door: 'south', paint: 4, name: 'harbour office' });
    house({ x: x0 + 60, z: waterZ - 46, wdt: 40, dep: 24, floors: 1, wall: M.WOOD, roof: 'gable', door: 'south', paint: 6, name: 'boathouse' });
    for (let k = 0; k < 6; k++) K.barrel(x0 + 110 + (k % 3) * 4, waterZ - 8 + ((k / 3) | 0) * 0);
    K.vehicle('forklift', x0 + 130, waterZ - 20, 0); K.vehicle('semi', x0 + 170, waterZ - 30, Math.PI / 2);
  },
  golf(K, x0, z0, x1, z1) {
    const { box, cyl, house, tree } = K;
    box(x0, GY - 1, z0, x1, GY, z1, M.GRASS, 5);
    // Fairways with greens, flags, bunkers and two ponds.
    const holes = [[x0 + 40, z0 + 40, x0 + 200, z0 + 90], [x0 + 200, z0 + 120, x0 + 50, z0 + 180], [x0 + 60, z0 + 230, x0 + 210, z0 + 300], [x0 + 200, z0 + 340, x0 + 60, z0 + 420], [x0 + 50, z0 + 460, x0 + 210, z0 + 500]];
    for (const [ax, az, bx, bz] of holes) {
      const n = Math.max(Math.abs(bx - ax), Math.abs(bz - az));
      for (let k = 0; k <= n; k += 2) cyl(ax + (bx - ax) * k / n, az + (bz - az) * k / n, 9, GY - 1, GY, M.GRASS, 0, 0);
      cyl(bx, bz, 7, GY - 1, GY, M.GRASS, 0, 0); box(bx, GY, bz, bx + 1, GY + 10, bz + 1, M.STEEL); box(bx + 1, GY + 7, bz, bx + 4, GY + 10, bz + 1, M.CLOTH, 2);
      cyl(bx + 10, bz + 6, 4, GY - 1, GY, M.SAND); box(ax - 3, GY - 1, az - 3, ax + 3, GY, az + 3, M.GRASS, 5);
    }
    for (const [px, pz, r] of [[x0 + 130, z0 + 205, 18], [x0 + 140, z0 + 445, 14]]) for (let y = GY - 4; y < GY; y++) cyl(px, pz, r, y, y + 1, M.AIR);
    for (let k = 0; k < 30; k++) tree(x0 + 10 + ((K.rnd() * (x1 - x0 - 20)) | 0), z0 + 10 + ((K.rnd() * (z1 - z0 - 20)) | 0), 10 + ((K.rnd() * 5) | 0));
    house({ x: x1 - 60, z: z0 + 10, wdt: 46, dep: 26, floors: 2, wall: M.PLASTER, roof: 'gable', door: 'south', paint: 6, winGap: 6, name: 'clubhouse' });
    for (let k = 0; k < 6; k++) K.vehicle('golf', x1 - 56 + k * 7, z0 + 46, 0, { color: [0xe8e6de, 0x3e8a4a][k % 2] });
  },
  construction(K, x0, z0, x1, z1) {
    const { box, house, line, L } = K;
    box(x0, GY - 1, z0, x1, GY, z1, M.GRAVEL);
    // A half-built concrete frame with scaffolding, a tower crane, materials and plant.
    const fx = x0 + 20, fz = z0 + 20, fw = 50, fd = 34, fl = 5, holes = [];
    for (let f = 0; f < fl; f++) {
      const fy = GY + f * STOREY;
      if (f) box(fx, fy, fz, fx + fw, fy + 1, fz + fd, M.CONCRETE);
      if (f < fl - 1) for (let k = 0; k <= fw - 2; k += 8) for (let q = 0; q <= fd - 2; q += 8) { if (fz + q >= fz + 6 && fz + q < fz + 26 && (fx + k + 2 > fx + fw - 16)) continue; box(fx + k, fy + 1, fz + q, fx + k + 2, fy + STOREY, fz + q + 2, M.CONCRETE); }
      if (f < fl - 1) holes.push(K.flight(f % 2 ? fx + fw - 15 : fx + fw - 7, fz + 10, fy, M.CONCRETE));
      L.floors.push({ x: fx + K.ox, z: fz + K.oz, x1: fx + fw + K.ox, z1: fz + fd + K.oz, y: f ? fy + 1 : GY, name: 'construction frame' });
    }
    for (const h of holes) K.cut(h);
    for (let f = 0; f < fl - 1; f++) { const fy = GY + f * STOREY; box(fx - 4, fy + STOREY - 1, fz - 4, fx + fw + 4, fy + STOREY, fz - 1, M.PLANK); for (let k = 0; k <= fw + 8; k += 8) box(fx - 4 + Math.min(k, fw + 7), fy, fz - 4, fx - 3 + Math.min(k, fw + 7), fy + STOREY, fz - 3, M.STEEL); }
    latticeMast(K, x1 - 40, z0 + 30, 4, GY, GY + 60);
    box(x1 - 41, GY + 60, z0 + 29, x1 - 35, GY + 61, z0 + 35, M.STEEL); box(x1 - 90, GY + 61, z0 + 31, x1 - 36, GY + 62, z0 + 33, M.STEEL); box(x1 - 36, GY + 61, z0 + 31, x1 - 20, GY + 62, z0 + 33, M.STEEL);
    box(x1 - 26, GY + 62, z0 + 30, x1 - 20, GY + 66, z0 + 34, M.CONCRETE); box(x1 - 39, GY + 1, z0 + 31, x1 - 37, GY + 60, z0 + 32, M.LADDER);
    for (let k = 0; k < 5; k++) K.cyl(x0 + 20 + k * 7, z1 - 20, 3, GY, GY + 6, M.CONCRETE, 1);
    for (let k = 0; k < 6; k++) box(x0 + 70 + (k % 3) * 6, GY, z1 - 26 + ((k / 3) | 0) * 6, x0 + 75 + (k % 3) * 6, GY + 3, z1 - 21 + ((k / 3) | 0) * 6, M.BRICK);
    for (let k = 0; k < 3; k++) K.crate(x0 + 100 + k * 5, z1 - 24, 3);
    house({ x: x0 + 6, z: z1 - 52, wdt: 22, dep: 20, floors: 1, wall: M.METAL, roof: 'flat', door: 'north', paint: 3, name: 'site office' });
    K.vehicle('mixer', x0 + 100, z0 + 80, Math.PI / 2); K.vehicle('miniex', x0 + 140, z0 + 40, Math.PI); K.vehicle('mcrane', x0 + 110, z0 + 110, Math.PI / 2);
    K.vehicle('basket', x0 + 80, z0 + 64, 0); K.vehicle('telehandler', x0 + 140, z0 + 70, 0); K.vehicle('dump', x1 - 60, z1 - 30, Math.PI / 2); K.vehicle('utility', x0 + 160, z0 + 110, Math.PI / 2);
    return [fx, GY, fz, fx + fw, GY + fl * STOREY, fz + fd];
  },
  lumberyard(K, x0, z0, x1, z1) {
    const { box, house, tree } = K;
    box(x0, GY - 1, z0, x1, GY, z1, M.GRAVEL);
    for (let k = 0; k < 6; k++) { const lx = x0 + 10 + (k % 3) * 40, lz = z0 + 10 + ((k / 3) | 0) * 26; for (let r = 0; r < 4; r++) for (let c = 0; c < 6 - r; c++) box(lx + r, GY + r * 3, lz + c * 3 + r * 1, lx + 32 - r, GY + r * 3 + 3, lz + c * 3 + r + 3, M.WOOD, 0); }
    house({ x: x0 + 10, z: z1 - 50, wdt: 60, dep: 30, floors: 1, wall: M.WOOD, roof: 'gable', door: 'north', paint: 2, name: 'sawmill' });
    for (let k = 0; k < 10; k++) box(x0 + 80 + (k % 5) * 6, GY, z1 - 40 + ((k / 5) | 0) * 8, x0 + 85 + (k % 5) * 6, GY + 4, z1 - 34 + ((k / 5) | 0) * 8, M.PLANK);
    for (let k = 0; k < 12; k++) tree(x1 - 10 - ((K.rnd() * 60) | 0), z0 + 10 + ((K.rnd() * (z1 - z0 - 20)) | 0), 12 + ((K.rnd() * 4) | 0));
    K.vehicle('chipper', x0 + 140, z0 + 60, Math.PI / 2); K.vehicle('telehandler', x0 + 100, z0 + 80, 0); K.vehicle('wfork', x0 + 90, z1 - 60, 0); K.vehicle('semi', x0 + 60, z0 + 75, Math.PI / 2, { color: 0x3e8a4a });
  },
  depot(K, x0, z0, x1, z1) {
    const { box, house } = K;
    box(x0, GY - 1, z0, x1, GY, z1, M.ASPHALT);
    K.cyl(x1 - 24, z0 + 24, 14, GY, GY + 1, M.SAND); for (let y = 1; y < 10; y++) K.cyl(x1 - 24, z0 + 24, 14 - y * 1.4, GY + y, GY + y + 1, M.SAND);
    house({ x: x0 + 6, z: z0 + 6, wdt: 40, dep: 24, floors: 2, wall: M.BRICK, roof: 'flat', door: 'south', name: 'depot office' });
    K.vehicle('monster', x1 - 70, z0 + 50, 0); K.vehicle('plough', x0 + 30, z1 - 24, Math.PI / 2); K.vehicle('plough', x0 + 70, z1 - 24, Math.PI / 2, { color: 0xd88a1e }); K.vehicle('utility', x0 + 110, z1 - 24, Math.PI / 2); K.vehicle('icecream', x0 + 150, z1 - 24, Math.PI / 2);
  }
};

// ---------- the four maps
const MAPS = {
  gullpoint: {
    name: 'Gull Point', where: 'Harbour city', blurb: 'A harbour city: downtown towers and car parks, suburbs, the old waterfront town, a marina and an airport.',
    build(w) {
      CITY.terrain(w, (x, z) => z >= 680 ? [Math.max(4, Math.round(GY - (z - 680) * 0.3)), M.SAND] : z >= 668 ? [GY, M.SAND] : [GY, M.GRASS]);
      const K = Kit(w, 31), L = K.L; L.districts = {};
      const D = (name, tx, tz) => { L.districts[name] = [tx, tz]; DISTRICTS[name].build(Kit(w, 1337, L, tx, tz)); };
      D('gullpoint', 256, 512);
      const blocks = CITY.grid(K, 0, 0, 512, 512, 112);
      blocks.forEach((b, i) => CITY.fillBlock(K, b, b[0] >= 220 ? 'downtown' : 'residential'));
      CITY.road(K, 'z', 512, 680, 120); CITY.road(K, 'x', 0, 512, 512 - 20);
      CITY.marina(K, 0, 512, 250, 768, 680);
      CITY.airport(K, 512, 0, 768, 768);
      CITY.depot(K, 150, 540, 250, 630);
      return L;
    }
  },
  quarry: {
    name: 'Redcut', where: 'Industrial town', blurb: 'An industrial town: factories, warehouses and a container yard, a lumber yard, a construction site, Redcut quarry and a fenced military base.',
    build(w) {
      CITY.terrain(w);
      const K = Kit(w, 47), L = K.L; L.districts = {};
      const D = (name, tx, tz) => { L.districts[name] = [tx, tz]; DISTRICTS[name].build(Kit(w, 4242, L, tx, tz)); };
      D('quarry', 256, 512);
      K.vehicle('monster', 256 + 126, 512 + 196, Math.PI / 2); K.vehicle('supercar', 256 + 60, 512 + 20, 0);
      const blocks = CITY.grid(K, 0, 0, 512, 512, 128);
      blocks.forEach((b, i) => { if (i === 5) K.bld('site', CITY.construction(K, b[0], b[1], b[2], b[3])); else CITY.fillBlock(K, b, 'industrial'); });
      CITY.lumberyard(K, 0, 520, 250, 768);
      CITY.militaryBase(K, 520, 0, 768, 768);
      CITY.road(K, 'z', 512, 768, 236); CITY.road(K, 'x', 0, 520, 492);
      return L;
    }
  },
  estate: {
    name: 'Ashgrove', where: 'Suburbs', blurb: 'Leafy suburbs with Ashgrove Estate, a golf course, a park, shops, a works depot and a small airfield.',
    build(w) {
      CITY.terrain(w);
      const K = Kit(w, 53), L = K.L; L.districts = {};
      const D = (name, tx, tz) => { L.districts[name] = [tx, tz]; DISTRICTS[name].build(Kit(w, 9001, L, tx, tz)); };
      D('estate', 256, 0);
      CITY.golf(K, 0, 0, 250, 520);
      const blocks = CITY.grid(K, 256, 260, 768, 768, 112);
      blocks.forEach((b, i) => { if (i === 4) CITY.park(K, b[0], b[1], b[2] - b[0], b[3] - b[1]); else if (i === 9) CITY.fillBlock(K, b, 'downtown'); else CITY.fillBlock(K, b, 'residential'); });
      CITY.grid(K, 520, 0, 768, 236, 112).forEach(b => CITY.fillBlock(K, b, 'residential'));
      CITY.road(K, 'z', 0, 260, 520); CITY.road(K, 'x', 0, 768, 236);
      // Airfield: a single strip, hangars, light aircraft.
      const ax = 20, az = 540;
      K.box(ax, GY - 1, az, ax + 230, GY, az + 26, M.ASPHALT);
      for (let x = ax + 10; x < ax + 220; x += 20) K.box(x, GY - 1, az + 12, x + 10, GY, az + 14, M.ASPHALT, 6);
      for (let k = 0; k < 3; k++) { const hx = ax + 20 + k * 60; K.box(hx, GY - 1, az + 40, hx + 44, GY, az + 80, M.CONCRETE); K.shell(hx, GY, az + 40, hx + 44, GY + 16, az + 80, 1, M.METAL, 4); K.box(hx, GY + 16, az + 40, hx + 44, GY + 17, az + 80, M.METAL, 4); K.box(hx + 4, GY, az + 40, hx + 40, GY + 13, az + 41, M.AIR); L.floors.push({ x: hx, z: az + 40, x1: hx + 44, z1: az + 80, y: GY, name: 'hangar' }); K.vehicle(k === 1 ? 'bizjet' : 'plane', hx + 22, az + 60, 0, { color: [0xc4231c, 0xe8e6de, 0x2f6aa8][k] }); }
      K.vehicle('plane', ax + 200, az + 13, -Math.PI / 2, { color: 0xd8a21c });
      CITY.depot(K, 20, 650, 240, 760);
      return L;
    }
  },
  oldtown: {
    name: 'Tollbridge', where: 'Old canal city', blurb: 'A dense old city on a canal: timber and brick rows, a bell tower, a town hall, a busy harbour basin and a building site.',
    build(w) {
      CITY.terrain(w, (x, z) => (z >= 374 && z < 394) || (x >= 640 && z >= 300 && z < 520) ? [4, M.STONE] : [GY, M.GRASS]);
      const K = Kit(w, 59), L = K.L; L.districts = {};
      const D = (name, tx, tz) => { L.districts[name] = [tx, tz]; DISTRICTS[name].build(Kit(w, 777, L, tx, tz)); };
      D('oldtown', 256, 256);
      const north = CITY.grid(K, 0, 0, 768, 250, 96, { carPool: ['vintage', 'hatch', 'micro', 'classic', 'cruiser', 'wagon'] });
      north.forEach((b, i) => CITY.fillBlock(K, b, i % 5 === 2 ? 'downtown' : 'oldtown'));
      const south = CITY.grid(K, 0, 500, 640, 768, 96, { carPool: ['vintage', 'hatch', 'micro', 'muscle', 'suv', 'wagon'] });
      south.forEach((b, i) => { if (i === 3) K.bld('site', CITY.construction(K, b[0], b[1], b[2], b[3])); else CITY.fillBlock(K, b, i % 4 === 1 ? 'downtown' : 'oldtown'); });
      // Canal walls west and east of the old town, and the harbour basin.
      for (const [a, b] of [[0, 256], [512, 640]]) { K.box(a, 4, 372, b, GY, 374, M.STONE); K.box(a, 4, 394, b, GY, 396, M.STONE); }
      for (const [a, b] of [[0, 256], [512, 768]]) { K.box(a, GY - 1, 290, b, GY, 372, M.GRASS); K.box(a, GY - 1, 396, b, GY, 500, M.GRASS); }
      for (const [a, b] of [[0, 250], [520, 640]]) { CITY.road(K, 'x', a, b, 296); CITY.road(K, 'x', a, b, 476); }
      CITY.marina(K, 640, 300, 768, 520, 300);
      for (const bx of [120, 560]) { K.box(bx, GY - 1, 370, bx + 14, GY, 398, M.BRICK); K.box(bx, GY, 370, bx + 1, GY + 3, 398, M.BRICK); K.box(bx + 13, GY, 370, bx + 14, GY + 3, 398, M.BRICK); }
      K.vehicle('boat', 60, 384, Math.PI / 2); K.vehicle('rowboat', 600, 384, -Math.PI / 2);
      return L;
    }
  }
};

const Level = { build(w, id) { return MAPS[id || 'gullpoint'].build(w); } };
