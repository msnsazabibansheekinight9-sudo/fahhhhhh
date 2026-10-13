'use strict';
/* Crumble — Gull Point, a small harbour town built voxel by voxel. Deterministic, so every job starts the same. */

const WORLD_X = 768, WORLD_Y = 112, WORLD_Z = 768;
const TILE = 256;         // a district is one 256 × 256 tile
const GY = 16;            // first air voxel above flat ground: 4 m of ground below
const WATER_Y = GY - 1.4; // sea, harbour and canal surface
const STOREY = 12;


// Building kit shared by every map. All maps are deterministic so each job starts the same.
// (ox, oz) shifts everything so a district can be placed anywhere in a city; L is shared by the whole map.
function Kit(w, seed, L, ox, oz) {
    seed = seed || 1337; ox = ox || 0; oz = oz || 0;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
    const S = (x, y, z, m, p) => w.setRaw(x + ox, y, z + oz, m, p);
    const box = (x0, y0, z0, x1, y1, z1, m, p) => { for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) S(x, y, z, m, p); };
    const shell = (x0, y0, z0, x1, y1, z1, t, m, p) => {
      box(x0, y0, z0, x1, y1, z0 + t, m, p); box(x0, y0, z1 - t, x1, y1, z1, m, p);
      box(x0, y0, z0, x0 + t, y1, z1, m, p); box(x1 - t, y0, z0, x1, y1, z1, m, p);
    };
    L = L || { buildings: {}, targets: [], props: [], vehicles: [], floors: [] };
    // A storey-by-storey house: slabs, walls with windows, a front door, stairs and a roof.
    // A straight flight up one storey along +z from (sx, sz). Storeys alternate between two side-by-side positions so a flight
    // never sits under the next one; a 3-row landing must be free before sz and after the top.
    // Returns the hole to cut in the slab above (cut after all slabs are laid).
    const flight = (sx, sz, fy, mat) => {
      for (let s = 0; s < STOREY; s++) box(sx, fy + 1, sz + s, sx + 4, fy + 2 + s, sz + s + 1, mat);
      return [sx, fy + STOREY, sz + 3, sx + 4, fy + STOREY + 1, sz + STOREY];
    };
    // Ladder fallback for buildings too shallow for a flight: a 3-wide ladder against the wall and a 4×5 hatch.
    const ladderUp = (lx, lz, fy) => { box(lx, fy + 1, lz, lx + 3, fy + STOREY + 1, lz + 1, M.LADDER); return [lx, fy + STOREY, lz, lx + 4, fy + STOREY + 1, lz + 5]; };
    const cut = (h) => box(h[0], h[1], h[2], h[3], h[4], h[5], M.AIR);
    // A storey-by-storey house: slabs, walls with windows, a front door, stairs (or a ladder) to every floor and a roof.
    const house = (o) => {
      const { x, z, wdt, dep, floors, wall, t = 1, floor = M.PLANK, roof = 'gable', winGap = 8, door = 'south', paint = 0 } = o;
      const x1 = x + wdt, z1 = z + dep, top = GY + floors * STOREY;
      const sx = x1 - t - 5, sz = z + t + 3, fits = dep >= 2 * t + 18, holes = [];
      const stepMat = floor === M.CONCRETE ? M.CONCRETE : M.PLANK;
      for (let f = 0; f < floors; f++) {
        const fy = GY + f * STOREY;
        box(x, fy, z, x1, fy + 1, z1, f === 0 ? M.CONCRETE : floor);
        box(x + t, fy + 1, z + t, x1 - t, fy + STOREY, z1 - t, M.AIR);
        shell(x, fy + 1, z, x1, fy + STOREY, z1, t, wall, paint);
        for (let k = x + 4; k + 4 <= x1 - 3; k += winGap) { box(k, fy + 4, z, k + 4, fy + 9, z + t, M.GLASS); box(k, fy + 4, z1 - t, k + 4, fy + 9, z1, M.GLASS); }
        for (let k = z + 4; k + 4 <= z1 - 3; k += winGap) { box(x, fy + 4, k, x + t, fy + 9, k + 4, M.GLASS); box(x1 - t, fy + 4, k, x1, fy + 9, k + 4, M.GLASS); }
        // Interior partition, set back from both end walls so the hallways stay open, with a doorway in the middle.
        const mx = x + (wdt * 0.4 | 0);
        if (wdt >= 18 && dep >= 16 && mx < sx - 4) {
          box(mx, fy + 1, z + t + 4, mx + 1, fy + STOREY, z1 - t - 4, f === 0 && wall === M.BRICK ? M.PLASTER : wall === M.WOOD ? M.WOOD : M.PLASTER);
          box(mx, fy + 1, z + (dep / 2 | 0) - 2, mx + 1, fy + 9, z + (dep / 2 | 0) + 2, M.AIR);
        }
        if (f < floors - 1 || roof === 'flat') holes.push(fits ? flight(f % 2 ? sx - 4 : sx, sz, fy, stepMat) : ladderUp(f % 2 ? x1 - t - 8 : x1 - t - 4, z + t, fy));
      }
      const dx = x + (wdt / 2 | 0) - 2, dz = z + (dep / 2 | 0) - 2;
      if (door === 'south') box(dx, GY + 1, z1 - t, dx + 4, GY + 9, z1, M.AIR);
      else if (door === 'north') box(dx, GY + 1, z, dx + 4, GY + 9, z + t, M.AIR);
      else if (door === 'east') box(x1 - t, GY + 1, dz, x1, GY + 9, dz + 4, M.AIR);
      else box(x, GY + 1, dz, x + t, GY + 9, dz + 4, M.AIR);
      for (let f = 0; f < floors; f++) L.floors.push({ x: x + ox, z: z + oz, x1: x1 + ox, z1: z1 + oz, y: GY + f * STOREY + 1, name: o.name || 'house' });
      if (roof === 'flat') {
        box(x, top, z, x1, top + 1, z1, M.CONCRETE); shell(x, top + 1, z, x1, top + 3, z1, 1, wall, paint);
        const h = holes[holes.length - 1];
        box(h[0] - 1, top + 1, h[2], h[0], top + 3, h[5], M.STEEL);                     // rail along the open side of the stairwell
        L.floors.push({ x: x + ox, z: z + oz, x1: x1 + ox, z1: z1 + oz, y: top + 1, name: (o.name || 'house') + ' roof' });
      } else {
        box(x, top, z, x1, top + 1, z1, floor);
        for (let k = 0; ; k++) {
          const za = z - 1 + k, zb = z1 - k, y = top + k;
          if (za > zb) break;
          box(x - 1, y, za, x1 + 1, y + 1, za + 1, M.ROOF); box(x - 1, y, zb, x1 + 1, y + 1, zb + 1, M.ROOF);
          if (zb - za > 1) { box(x, y, za + 1, x + 1, y + 1, zb, wall, paint); box(x1 - 1, y, za + 1, x1, y + 1, zb, wall, paint); }
        }
      }
      for (const h of holes) cut(h);
      return [x - 1, GY, z - 1, x1, top + (roof === 'flat' ? 3 : (dep / 2 | 0) + 2), z1];
    };
    const tree = (x, z, h) => {
      box(x, GY, z, x + 2, GY + h, z + 2, M.WOOD);
      const cy = GY + h, r = 4 + (rnd() * 2 | 0);
      for (let y = -r; y <= r; y++) for (let zz = -r; zz <= r; zz++) for (let xx = -r; xx <= r; xx++) {
        const d = Math.hypot(xx, y * 1.2, zz);
        if (d <= r && rnd() > 0.12 && w.get(x + 1 + xx, cy + y, z + 1 + zz) === 0) S(x + 1 + xx, cy + y, z + 1 + zz, M.LEAVES);
      }
    };
    const fence = (x0, z0, x1, z1) => {
      const len = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0)), dx = Math.sign(x1 - x0), dz = Math.sign(z1 - z0);
      for (let k = 0; k <= len; k++) {
        const x = x0 + dx * k, z = z0 + dz * k;
        if (k % 4 === 0) box(x, GY, z, x + 1, GY + 4, z + 1, M.WOOD); else { S(x, GY + 1, z, M.PLANK); S(x, GY + 3, z, M.PLANK); }
      }
    };
    // Parked drivable car in the footprint the old prop cars used.
    const car = (x, z, along, paint, type) => {
      const pool = ['sedan', 'hatch', 'wagon', 'vintage', 'suv', 'micro', 'coupe', 'cruiser', 'muscle', 'classic', 'offroad', 'pickup', 'supercar', 'sports'];
      const t = type || pool[(rnd() * pool.length) | 0], T = VTYPES[t];
      vehicle(t, x + (along ? 8.5 : 4), z + (along ? 4 : 8.5), along ? (rnd() < 0.5 ? -Math.PI / 2 : Math.PI / 2) : (rnd() < 0.5 ? 0 : Math.PI), paint ? { color: [0, 0x2a2a2c, 0xb8261c, 0xd8a21c, 0x2f6aa8, 0x3e8a4a, 0xe8e6de, 0xa83c8c, 0x1c1c20][paint] } : {});
    };
    const container = (x, z, along, paint, y) => {
      y = y || GY;
      const bx = along ? 24 : 10, bz = along ? 10 : 24;
      shell(x, y, z, x + bx, y + 10, z + bz, 1, M.METAL, paint);
      box(x, y + 9, z, x + bx, y + 10, z + bz, M.METAL, paint); box(x, y, z, x + bx, y + 1, z + bz, M.METAL, paint);
      if (along) box(x + bx - 1, y + 1, z + 2, x + bx, y + 9, z + bz - 2, M.AIR); else box(x + 2, y + 1, z + bz - 1, x + bx - 2, y + 9, z + bz, M.AIR);
    };
    const target = (name, x, y, z, alarm, required, locked) => L.targets.push({ name, x: x + ox, y, z: z + oz, alarm, required, locked: !!locked });
    const barrel = (x, z, y) => { y = y || GY; for (let yy = 0; yy < 4; yy++) for (let dz = 0; dz < 3; dz++) for (let dx = 0; dx < 3; dx++) if (!((dx === 0 || dx === 2) && (dz === 0 || dz === 2))) S(x + dx, y + yy, z + dz, M.BARREL); };
    const crate = (x, z, s, y) => { y = y || GY; box(x, y, z, x + s, y + s, z + s, M.PLANK); box(x + 1, y + 1, z, x + s - 1, y + s - 1, z + s, M.WOOD); box(x, y + 1, z + 1, x + s, y + s - 1, z + s - 1, M.WOOD); };
    const cyl = (cx, cz, r, y0, y1, m, hollow, p) => { for (let y = y0; y < y1; y++) for (let z = Math.floor(cz - r - 1); z <= cz + r; z++) for (let x = Math.floor(cx - r - 1); x <= cx + r; x++) { const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz); if (d <= r && (!hollow || d > r - hollow)) S(x, y, z, m, p); } };
    const line = (x0, y0, z0, x1, y1, z1, m, t) => { t = t || 1; const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)) * 2) + 1; for (let k = 0; k <= n; k++) { const f = k / n; box(Math.floor(x0 + (x1 - x0) * f), Math.floor(y0 + (y1 - y0) * f), Math.floor(z0 + (z1 - z0) * f), Math.floor(x0 + (x1 - x0) * f) + t, Math.floor(y0 + (y1 - y0) * f) + t, Math.floor(z0 + (z1 - z0) * f) + t, m); } };
    const ground = (fn, sx, sz) => { for (let z = 0; z < (sz || TILE); z++) for (let x = 0; x < (sx || TILE); x++) { const [top, m] = fn(x, z); for (let y = 0; y < top; y++) S(x, y, z, y === 0 ? M.BEDROCK : y === top - 1 ? m : (m === M.STONE || m === M.GRAVEL ? M.STONE : M.DIRT)); } };
    const vehicle = (type, x, z, yaw, opts) => L.vehicles.push(Object.assign({ type, x: x + ox, z: z + oz, yaw }, opts || {}));
    const bld = (name, b) => { L.buildings[name] = [b[0] + ox, b[1], b[2] + oz, b[3] + ox, b[4], b[5] + oz]; return L.buildings[name]; };
    const spawn = (x, z, yaw) => { L.spawns = L.spawns || {}; L.spawn = L.spawn || { x: x + ox, y: GY, z: z + oz, yaw }; return { x: x + ox, y: GY, z: z + oz, yaw }; };
    const escape = (x, y, z, r) => { L.escape = L.escape || { x: x + ox, y, z: z + oz, r }; return { x: x + ox, y, z: z + oz, r }; };
    return { rnd, S, box, shell, house, flight, ladderUp, cut, tree, fence, car, container, target, barrel, crate, cyl, line, ground, vehicle, bld, spawn, escape, ox, oz, w, L };
}

const DISTRICTS = {};
DISTRICTS.gullpoint = {
  build(K) {
    const { rnd, S, box, shell, house, tree, fence, car, container, target, barrel, crate, vehicle, L, w, ox, oz } = K;

    // Terrain: flat town ground, a beach falling into the harbour on the south side.
    for (let z = 0; z < TILE; z++) for (let x = 0; x < TILE; x++) {
      let top = GY;
      if (z >= 200) top = Math.max(1, Math.round(GY - (z - 200) * 0.22));
      for (let y = 0; y < top; y++) {
        let m = y === 0 ? M.BEDROCK : M.DIRT;
        if (y === top - 1) m = z >= 194 ? M.SAND : M.GRASS;
        S(x, y, z, m);
      }
    }
    // Roads and sidewalks.
    box(0, GY - 1, 96, TILE, GY, 110, M.ASPHALT);
    box(118, GY - 1, 0, 132, GY, 196, M.ASPHALT);
    box(0, GY - 1, 94, TILE, GY, 96, M.CONCRETE); box(0, GY - 1, 110, TILE, GY, 112, M.CONCRETE);
    box(116, GY - 1, 0, 118, GY, 196, M.CONCRETE); box(132, GY - 1, 0, 134, GY, 196, M.CONCRETE);
    // Turn the sidewalk concrete into anchoring ground so it never falls as debris.
    for (let z = 0; z < TILE; z++) for (let x = 0; x < TILE; x++) { const i = w.idx(x + ox, GY - 1, z + oz); if (w.data[i] === M.CONCRETE) w.data[i] = M.ASPHALT, w.paint[i] = 6; }


    // --- Halloway house (brick, two storeys): the Clean Slate demolition job.
    K.bld('house', house({ x: 22, z: 28, wdt: 34, dep: 26, floors: 2, wall: M.BRICK, t: 2, door: 'south' }));
    fence(16, 22, 64, 22); fence(16, 22, 16, 86); fence(64, 22, 64, 86);
    tree(10, 70, 12); tree(68, 64, 14); tree(40, 74, 11);
    // --- Townhouse row on the north side of the main road.
    house({ x: 22, z: 122, wdt: 20, dep: 22, floors: 3, wall: M.PLASTER, roof: 'flat', door: 'north', paint: 0 });
    house({ x: 44, z: 122, wdt: 20, dep: 22, floors: 3, wall: M.PLASTER, roof: 'flat', door: 'north', paint: 5 });
    house({ x: 66, z: 122, wdt: 20, dep: 22, floors: 3, wall: M.BRICK, t: 1, roof: 'flat', door: 'north' });
    target('Oil painting', 72, GY + 2 * STOREY + 1, 140, false, false);

    // --- Pruitt barn (all timber): the Kindling job.
    {
      const x = 30, z = 166, x1 = 64, z1 = 190;
      box(x, GY, z, x1, GY + 1, z1, M.PLANK);
      shell(x, GY + 1, z, x1, GY + 16, z1, 1, M.WOOD, 2);
      box(x + 13, GY + 1, z, x + 21, GY + 13, z + 1, M.AIR);
      box(x + 1, GY + 9, z + 1, x + 10, GY + 10, z1 - 1, M.PLANK);
      for (let k = 0; ; k++) {
        const za = z - 1 + k, zb = z1 - k, y = GY + 16 + k; if (za > zb) break;
        box(x - 1, y, za, x1 + 1, y + 1, za + 1, M.ROOF); box(x - 1, y, zb, x1 + 1, y + 1, zb + 1, M.ROOF);
        if (zb - za > 1) { box(x, y, za + 1, x + 1, y + 1, zb, M.WOOD, 2); box(x1 - 1, y, za + 1, x1, y + 1, zb, M.WOOD, 2); }
      }
      for (let i = 0; i < 9; i++) { const hx = x + 3 + (i % 3) * 4, hz = z + 3 + ((i / 3) | 0) * 6; box(hx, GY + 1, hz, hx + 3, GY + 4, hz + 4, M.HAY); }
      for (let i = 0; i < 5; i++) box(x + 24 + (i % 2) * 4, GY + 1, z + 4 + i * 4, x + 27 + (i % 2) * 4, GY + 3, z + 7 + i * 4, M.HAY);
      K.bld('barn', [x - 1, GY, z - 1, x1, GY + 30, z1]);
      fence(26, 160, 26, 196); fence(26, 160, 70, 160);
      tree(72, 172, 13); tree(74, 186, 12);
    }

    // --- Water tower: steel legs, cross-bracing, a ladder and a timber tank.
    {
      const cx = 92, cz = 56, half = 7, legTop = GY + 34;
      const legs = [[cx - half, cz - half], [cx + half - 2, cz - half], [cx - half, cz + half - 2], [cx + half - 2, cz + half - 2]];
      for (const [lx, lz] of legs) box(lx, GY, lz, lx + 2, legTop, lz + 2, M.STEEL);
      for (const by of [GY + 12, GY + 24]) {
        box(cx - half, by, cz - half, cx + half, by + 1, cz - half + 1, M.STEEL); box(cx - half, by, cz + half - 1, cx + half, by + 1, cz + half, M.STEEL);
        box(cx - half, by, cz - half, cx - half + 1, by + 1, cz + half, M.STEEL); box(cx + half - 1, by, cz - half, cx + half, by + 1, cz + half, M.STEEL);
      }
      const r = 9, ty0 = legTop, ty1 = legTop + 12;
      for (let y = ty0; y < ty1 + 6; y++) for (let z = cz - r - 1; z <= cz + r; z++) for (let x = cx - r - 1; x <= cx + r; x++) {
        const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
        if (y === ty0 && d <= r) S(x, y, z, M.PLANK);
        else if (y < ty1 && d <= r && d > r - 1.2) S(x, y, z, M.WOOD, 0);
        else if (y >= ty1 && d <= r + 1 - (y - ty1) * 1.8 && d > r - 1 - (y - ty1) * 1.8) S(x, y, z, M.ROOF);
      }
      box(cx - 2, ty0 + 1, cz + r - 2, cx + 2, ty0 + 9, cz + r + 1, M.AIR);
      box(cx - 3, ty0, cz + r - 2, cx + 3, ty0 + 1, cz + r + 2, M.PLANK);
      box(cx - 1, GY, cz + r + 2, cx + 2, ty0 + 1, cz + r + 3, M.LADDER);
      K.bld('tower', [cx - r - 2, GY, cz - r - 2, cx + r + 2, ty1 + 6, cz + r + 2]);
      target('Strongbox', cx, ty0 + 1, cz, true, true);
    }

    // --- Warehouse: steel frame, corrugated metal skin, shelving and containers.
    {
      const x = 148, z = 14, x1 = 212, z1 = 60, h = 26;
      box(x, GY, z, x1, GY + 1, z1, M.CONCRETE);
      shell(x, GY + 1, z, x1, GY + h, z1, 1, M.METAL, 0);
      for (let k = x; k < x1; k += 10) { box(k, GY + 1, z, k + 2, GY + h, z + 2, M.STEEL); box(k, GY + 1, z1 - 2, k + 2, GY + h, z1, M.STEEL); }
      box(x1 - 2, GY + 1, z, x1, GY + h, z + 2, M.STEEL); box(x1 - 2, GY + 1, z1 - 2, x1, GY + h, z1, M.STEEL);
      box(x, GY + h, z, x1, GY + h + 1, z1, M.METAL);
      for (let k = x; k < x1; k += 10) box(k, GY + h - 1, z, k + 2, GY + h, z1, M.STEEL);
      box(x + 20, GY + 1, z1 - 1, x + 36, GY + 19, z1, M.AIR);            // roller door
      box(x1 - 1, GY + 1, z + 20, x1, GY + 9, z + 24, M.AIR);             // side door
      for (let k = x + 6; k + 4 < x1 - 6; k += 9) box(k, GY + h - 6, z, k + 4, GY + h - 3, z + 1, M.GLASS);
      for (let row = 0; row < 3; row++) {
        const sz = z + 8 + row * 10;
        for (let lvl = 0; lvl < 3; lvl++) box(x + 6, GY + 1 + lvl * 6, sz, x + 34, GY + 2 + lvl * 6, sz + 4, M.PLANK);
        for (let k = x + 6; k <= x + 33; k += 9) box(k, GY + 1, sz, k + 1, GY + 18, sz + 4, M.WOOD);
      }
      container(x + 40, z + 6, false, 2); container(x + 52, z + 6, false, 4); container(x + 40, z + 6, false, 5, GY + 10);
      // Mezzanine office.
      box(x + 40, GY + 1, z + 34, x + 62, GY + 12, z + 35, M.PLASTER);
      box(x + 40, GY + 12, z + 34, x + 62, GY + 13, z1 - 1, M.CONCRETE);
      box(x + 50, GY + 1, z + 34, x + 54, GY + 9, z + 35, M.AIR);
      for (let s = 0; s < 12; s++) box(x + 36, GY + 1, z + 22 + s, x + 40, GY + 2 + s, z + 23 + s, M.STEEL);
      box(x + 38, GY + 12, z + 33, x + 40, GY + 13, z + 35, M.STEEL);
      K.bld('warehouse', [x, GY, z, x1, GY + h + 1, z1]);
      target('Keycase', x + 20, GY + 14, z + 19, true, true, true);
    }
    container(150, 72, true, 7); container(176, 72, true, 3); container(150, 72, true, 4, GY + 10);

    // --- Bank with a steel-doored concrete vault.
    {
      const x = 156, z = 124, x1 = 190, z1 = 160;
      box(x, GY, z, x1, GY + 1, z1, M.TILE);
      shell(x, GY + 1, z, x1, GY + 16, z1, 3, M.CONCRETE);
      box(x, GY + 16, z, x1, GY + 18, z1, M.CONCRETE);
      for (let k = x + 5; k + 5 <= x1 - 5; k += 8) box(k, GY + 5, z, k + 5, GY + 12, z + 3, M.GLASS);
      box(x + 14, GY + 1, z, x + 20, GY + 11, z + 3, M.AIR);
      box(x + 4, GY + 1, z + 10, x + 30, GY + 5, z + 12, M.WOOD);          // teller counter
      const vx = x + 18, vz = z + 20;
      shell(vx, GY + 1, vz, vx + 13, GY + 15, vz + 13, 3, M.CONCRETE);
      box(vx, GY + 15, vz, vx + 13, GY + 16, vz + 13, M.CONCRETE);
      box(vx + 4, GY + 1, vz, vx + 9, GY + 10, vz + 3, M.STEEL);
      K.bld('bank', [x, GY, z, x1, GY + 18, z1]);
      target('Ledger', vx + 6, GY + 1, vz + 7, true, true, true);
    }

    // --- Five-storey office block: concrete frame with glass curtain walls.
    {
      const x = 204, z = 116, x1 = 236, z1 = 148, floors = 5, holes = [];
      for (let f = 0; f < floors; f++) {
        const fy = GY + f * STOREY;
        box(x, fy, z, x1, fy + 1, z1, M.CONCRETE);
        shell(x, fy + 1, z, x1, fy + STOREY, z1, 1, M.GLASS);
        box(x, fy + 1, z, x1, fy + 3, z1, M.CONCRETE); box(x + 1, fy + 1, z + 1, x1 - 1, fy + 3, z1 - 1, M.AIR);
        for (let k = x; k < x1; k += 8) for (let q = z; q < z1; q += 8) {
          if (k === x || q === z || k + 8 >= x1 || q + 8 >= z1) box(Math.min(k, x1 - 2), fy + 1, Math.min(q, z1 - 2), Math.min(k, x1 - 2) + 2, fy + STOREY, Math.min(q, z1 - 2) + 2, M.CONCRETE);
        }
        box(x + 2, fy + 1, z + 16, x + 20, fy + STOREY, z + 17, M.PLASTER); box(x + 8, fy + 1, z + 16, x + 12, fy + 9, z + 17, M.AIR);
        for (let d = 0; d < 3; d++) box(x + 4 + d * 6, fy + 1, z + 4, x + 8 + d * 6, fy + 3, z + 7, M.WOOD);
        if (f < floors - 1) holes.push(K.flight(f % 2 ? x1 - 11 : x1 - 7, z + 4, fy, M.CONCRETE));
      }
      const top = GY + floors * STOREY;
      box(x, top, z, x1, top + 1, z1, M.CONCRETE); shell(x, top + 1, z, x1, top + 3, z1, 1, M.CONCRETE);
      for (const h of holes) K.cut(h);
      for (let f = 0; f < floors; f++) L.floors.push({ x: x + ox, z: z + oz, x1: x1 + ox, z1: z1 + oz, y: GY + f * STOREY + 1, name: 'office block' });
      box(x + 14, GY + 1, z, x + 20, GY + 10, z + 3, M.AIR);
      K.bld('office', [x, GY, z, x1, top + 3, z1]);
      target('Hard drive', x + 8, GY + 4 * STOREY + 1, z + 26, true, true);
    }

    // --- Harbour: timber pier on piles, a boathouse and a few parked cars.
    box(96, GY - 1, 196, 116, GY, 250, M.PLANK);
    for (let z = 198; z < 250; z += 6) { box(96, 0, z, 98, GY - 1, z + 2, M.WOOD); box(114, 0, z, 116, GY - 1, z + 2, M.WOOD); }
    box(96, GY, 196, 97, GY + 3, 250, M.WOOD); box(115, GY, 196, 116, GY + 3, 250, M.WOOD);
    box(96, GY, 249, 116, GY + 3, 250, M.WOOD);
    box(102, GY, 196, 110, GY + 3, 197, M.AIR);
    house({ x: 140, z: 198, wdt: 22, dep: 18, floors: 1, wall: M.WOOD, floor: M.PLANK, roof: 'gable', door: 'north', paint: 4 });
    car(60, 99, true, 2); car(140, 99, true, 4); car(200, 102, true, 6); car(122, 140, false, 3); car(84, 164, false, 8);
    tree(100, 30, 14); tree(104, 160, 12); tree(140, 120, 13); tree(4, 140, 12); tree(240, 70, 14); tree(236, 20, 12); tree(200, 176, 13); tree(10, 10, 12);
    for (let i = 0; i < 6; i++) { const lx = 20 + i * 40; box(lx, GY, 112, lx + 1, GY + 18, 113, M.STEEL); box(lx, GY + 17, 110, lx + 1, GY + 18, 113, M.STEEL); }

    K.spawn(106, 214, 0);
    vehicle('loader', 106, 84, Math.PI); vehicle('pickup', 196, 84, Math.PI / 2); vehicle('sedan', 40, 116, -Math.PI / 2, { color: 0x6b2a2a });
    vehicle('sports', 64, 60, Math.PI); vehicle('truck', 222, 84, Math.PI / 2); vehicle('boat', 128, 232, Math.PI / 2);
    vehicle('wrecker', 26, 100, -Math.PI / 2); vehicle('fire', 148, 100, Math.PI / 2); vehicle('forklift', 200, 68, 0);
    vehicle('excavator', 80, 84, Math.PI); vehicle('heli', 224, 180, 0); vehicle('tank', 160, 180, Math.PI);
    // Fuel barrels: they go up when hit hard, shot or burned.
    for (const [bx, bz] of [[214, 66], [218, 66], [214, 70], [196, 120], [200, 120], [90, 170], [138, 214], [142, 214]]) barrel(bx, bz);
    K.escape(106, GY, 240, 8);
  }
};

