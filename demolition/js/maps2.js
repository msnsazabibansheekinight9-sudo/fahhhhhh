'use strict';
/* Crumble — three more maps: Redcut Quarry, Ashgrove Estate and Tollbridge Old Town. */

// Lattice column: four steel corner posts with alternating diagonal braces.
function latticeMast(K, x, z, s, y0, y1) {
  const { box, line } = K;
  for (const [a, b] of [[0, 0], [s - 1, 0], [0, s - 1], [s - 1, s - 1]]) box(x + a, y0, z + b, x + a + 1, y1, z + b + 1, M.STEEL);
  for (let y = y0; y < y1 - 4; y += 4) {
    const up = ((y - y0) / 4) % 2 === 0;
    line(x, y + (up ? 0 : 4), z, x + s - 1, y + (up ? 4 : 0), z, M.STEEL); line(x, y + (up ? 4 : 0), z + s - 1, x + s - 1, y + (up ? 0 : 4), z + s - 1, M.STEEL);
    line(x, y + (up ? 0 : 4), z, x, y + (up ? 4 : 0), z + s - 1, M.STEEL); line(x + s - 1, y + (up ? 4 : 0), z, x + s - 1, y + (up ? 0 : 4), z + s - 1, M.STEEL);
  }
}

MAPS.quarry = {
  name: 'Redcut Quarry', where: 'Working quarry', blurb: 'A terraced rock pit with a tower crane, a crusher plant, site cabins, an explosives bunker and a fuel depot.',
  build(w) {
    const K = Kit(w, 4242);
    const { rnd, S, box, shell, tree, container, target, barrel, crate, cyl, line, ground, vehicle, L } = K;
    // Rock massif to the south with a terraced pit cut into it and a haul ramp on the west side.
    const massif = z => z < 140 ? GY : Math.min(30, GY + Math.round((z - 140) * 2.6));
    ground((x, z) => {
      let top = massif(z), m = z < 140 ? M.GRASS : M.STONE;
      if (z >= 140) {
        const d = Math.max(0, 80 - x, x - 172, z - 214);
        top = Math.min(top, GY + 8 * Math.ceil(d / 8));
        if (d === 0) m = M.GRAVEL;
        if (x >= 62 && x < 80 && z < 222) { top = Math.min(massif(z), GY + Math.max(0, Math.floor((z - 146) / 3))); m = M.GRAVEL; }
      }
      if (x >= 204 && x < 244 && z >= 16 && z < 56) { top = 1; m = M.DIRT; }       // settling pond
      if (z < 140 && ((x >= 118 && x < 134) || (z >= 108 && z < 122))) m = M.GRAVEL;  // haul roads
      return [top, m];
    });
    for (const [x, z, r, h] of [[140, 24, 9, 9], [100, 30, 7, 7], [60, 120, 8, 8]]) for (let y = 0; y < h; y++) cyl(x, z, r * (1 - y / h), GY + y, GY + y + 1, M.GRAVEL);

    // Tower crane: footing, lattice mast with a ladder, slewing deck, cab, jib, counter-jib and a hanging load.
    {
      const x = 108, z = 98, top = GY + 56;
      box(x - 3, GY, z - 3, x + 7, GY + 2, z + 7, M.CONCRETE);
      latticeMast(K, x, z, 4, GY + 2, top);
      box(x + 1, GY + 2, z + 1, x + 3, top, z + 2, M.LADDER);
      box(x - 1, top, z - 1, x + 5, top + 1, z + 5, M.STEEL);
      box(x - 1, top + 1, z + 5, x + 5, top + 6, z + 10, M.METAL, 3); box(x, top + 2, z + 9, x + 4, top + 5, z + 10, M.GLASS); box(x, top + 1, z + 5, x + 4, top + 2, z + 9, M.PLANK);
      box(x + 1, top + 1, z + 5, x + 3, top + 4, z + 6, M.AIR);
      for (let k = 0; k < 52; k += 4) { line(x + 4 + k, top + 1, z, x + 8 + k, top + 4, z + 2, M.STEEL); line(x + 4 + k, top + 1, z + 3, x + 8 + k, top + 4, z + 2, M.STEEL); }
      box(x + 4, top + 1, z, x + 56, top + 2, z + 1, M.STEEL); box(x + 4, top + 1, z + 3, x + 56, top + 2, z + 4, M.STEEL); box(x + 4, top + 4, z + 2, x + 56, top + 5, z + 3, M.STEEL);
      box(x - 18, top + 1, z, x, top + 2, z + 4, M.STEEL);
      box(x - 16, top + 2, z, x - 10, top + 6, z + 4, M.CONCRETE);
      line(x + 2, top + 1, z + 2, x + 2, top + 10, z + 2, M.STEEL); line(x + 2, top + 10, z + 2, x + 50, top + 4, z + 2, M.STEEL); line(x + 2, top + 10, z + 2, x - 14, top + 6, z + 2, M.STEEL);
      box(x + 38, top - 1, z, x + 42, top + 1, z + 4, M.STEEL);
      box(x + 40, top - 26, z + 2, x + 41, top - 1, z + 3, M.STEEL);
      box(x + 37, top - 32, z - 1, x + 44, top - 26, z + 6, M.CONCRETE);
      L.buildings.crane = [x - 18, GY + 2, z - 3, x + 57, top + 11, z + 11];
      target('Wage box', x + 2, top + 1, z + 7, true, true);
    }
    // Crusher plant with a hopper and a conveyor down to the stockpile.
    {
      const x = 150, z = 36, x1 = 186, z1 = 66, h = 22;
      box(x, GY, z, x1, GY + 1, z1, M.CONCRETE);
      shell(x, GY + 1, z, x1, GY + h, z1, 1, M.METAL, 0);
      for (let k = x; k < x1; k += 8) { box(k, GY + 1, z, k + 2, GY + h, z + 2, M.STEEL); box(k, GY + 1, z1 - 2, k + 2, GY + h, z1, M.STEEL); }
      box(x, GY + h, z, x1, GY + h + 1, z1, M.METAL);
      box(x + 12, GY + 1, z1 - 1, x + 24, GY + 14, z1, M.AIR);
      for (let k = 0; k < 8; k++) box(x + 10 + k, GY + h + 1 + k, z + 8 + k, x1 - 10 - k, GY + h + 2 + k, z1 - 8 - k, M.METAL);
      box(x + 4, GY + 12, z + 4, x + 16, GY + 13, z + 20, M.CONCRETE); shell(x + 4, GY + 13, z + 4, x + 16, GY + 20, z + 20, 1, M.PLASTER);
      box(x + 6, GY + 15, z + 4, x + 14, GY + 18, z + 5, M.GLASS); box(x + 8, GY + 13, z + 19, x + 11, GY + 19, z + 20, M.AIR);
      for (let s = 0; s < 12; s++) box(x + 18, GY + 1 + s, z + 20 - s, x + 21, GY + 2 + s, z + 21 - s, M.STEEL);
      box(x + 16, GY + 12, z + 8, x + 21, GY + 13, z + 10, M.STEEL);
      line(x, GY + h - 2, z + 14, x - 36, GY + 10, z - 10, M.STEEL, 2); line(x, GY + h - 4, z + 18, x - 36, GY + 8, z - 6, M.STEEL, 2);
      for (let k = 0; k < 4; k++) { const fx = x - 6 - k * 9, fz = z + 10 - k * 6; box(fx, GY, fz, fx + 1, GY + h - 4 - k * 3, fz + 1, M.STEEL); box(fx, GY, fz + 4, fx + 1, GY + h - 4 - k * 3, fz + 5, M.STEEL); }
      L.buildings.crusher = [x, GY, z, x1, GY + h + 10, z1];
      target('Shift ledger', x + 10, GY + 13, z + 12, true, true);
    }
    // Site cabins stacked two high with an outside stair.
    {
      const cab = (x, y, z) => { shell(x, y, z, x + 24, y + 10, z + 10, 1, M.METAL, 6); box(x, y, z, x + 24, y + 1, z + 10, M.PLANK); box(x, y + 9, z, x + 24, y + 10, z + 10, M.METAL, 6); for (let k = x + 3; k < x + 21; k += 6) box(k, y + 4, z + 9, k + 3, y + 7, z + 10, M.GLASS); box(x + 20, y + 1, z, x + 23, y + 8, z + 1, M.AIR); };
      cab(30, GY, 20); cab(30, GY + 10, 20);
      for (let s = 0; s < 10; s++) box(54 + s, GY + s, 14, 55 + s, GY + s + 1, 18, M.PLANK);
      box(48, GY + 9, 14, 64, GY + 10, 20, M.PLANK);
      box(50, GY + 11, 19, 53, GY + 18, 20, M.AIR);
      target('Cash tin', 36, GY + 11, 24, true, true);
    }
    // Explosives bunker with a steel door.
    {
      const x = 200, z = 160, y = massif(160) > GY ? GY : GY;
      shell(x, y, z, x + 14, y + 10, z + 12, 2, M.CONCRETE); box(x, y + 10, z, x + 14, y + 12, z + 12, M.CONCRETE);
      box(x + 5, y, z, x + 9, y + 8, z + 2, M.STEEL);
      for (let k = 0; k < 3; k++) crate(x + 3 + k * 3, z + 7, 2, y);
      target('Detonator case', x + 8, y, z + 6, true, true);
    }
    // Weighbridge hut at the gate, fuel depot, cabins' clutter.
    shell(112, GY, 10, 124, GY + 10, 20, 1, M.BRICK); box(112, GY + 10, 10, 124, GY + 11, 20, M.CONCRETE); box(116, GY + 1, 19, 120, GY + 8, 20, M.AIR); box(113, GY + 4, 10, 116, GY + 7, 11, M.GLASS);
    box(126, GY - 1, 6, 150, GY, 22, M.STEEL);
    cyl(234, 96, 6, GY, GY + 12, M.METAL, 1); box(228, GY + 12, 90, 240, GY + 13, 102, M.METAL);
    for (let k = 0; k < 6; k++) barrel(214 + (k % 3) * 4, 86 + ((k / 3) | 0) * 4);
    for (let k = 0; k < 4; k++) barrel(206 + k * 4, 176);
    for (let k = 0; k < 5; k++) crate(70 + k * 4, 40, 3);
    container(180, 104, true, 2); container(180, 104, true, 4, GY + 10); container(150, 120, false, 5);
    box(206, GY - 1, 110, 238, GY, 140, M.CONCRETE);
    for (let k = 0; k < 7; k++) tree(10 + k * 30, 70 + (k % 2) * 10, 11 + (k % 3));
    vehicle('dump', 124, 176, Math.PI); vehicle('dozer', 96, 196, Math.PI / 2); vehicle('excavator', 150, 200, Math.PI); vehicle('loader', 140, 124, Math.PI / 2);
    vehicle('pickup', 40, 56, Math.PI / 2, { color: 0xb8b2a2 }); vehicle('forklift', 66, 50, 0); vehicle('wrecker', 196, 128, 0); vehicle('heli', 222, 125, Math.PI / 2, { color: 0xd88a1e });
    vehicle('truck', 86, 112, -Math.PI / 2);
    L.spawn = { x: 126, y: GY, z: 40, yaw: Math.PI };
    L.escape = { x: 128, y: GY, z: 12, r: 9 };
    return L;
  }
};

MAPS.estate = {
  name: 'Ashgrove Estate', where: 'Country estate', blurb: 'A walled country house with two wings, a portico, a greenhouse, a pool, a garage and a hedge maze.',
  build(w) {
    const K = Kit(w, 9001);
    const { rnd, S, box, shell, house, tree, fence, target, barrel, crate, cyl, line, ground, vehicle, L } = K;
    ground((x, z) => [GY, M.GRASS]);
    // Boundary wall with a north gate, gravel drive.
    shell(6, GY, 6, 250, GY + 8, 250, 2, M.BRICK); box(118, GY, 6, 138, GY + 8, 8, M.AIR);
    for (const x of [116, 138]) box(x, GY, 4, x + 2, GY + 12, 10, M.MARBLE);
    box(120, GY - 1, 6, 136, GY, 44, M.GRAVEL); box(40, GY - 1, 104, 216, GY, 112, M.GRAVEL); box(40, GY - 1, 112, 48, GY, 132, M.GRAVEL);
    // Fountain on the drive.
    cyl(128, 26, 7, GY, GY + 2, M.MARBLE, 1.2); cyl(128, 26, 6, GY - 1, GY, M.TILE); cyl(128, 26, 6, GY, GY + 1, M.POOL); cyl(128, 26, 1.5, GY, GY + 7, M.MARBLE); cyl(128, 26, 3, GY + 6, GY + 7, M.MARBLE);
    // Main house, wings and portico.
    L.buildings.main = house({ x: 82, z: 50, wdt: 94, dep: 36, floors: 3, wall: M.BRICK, t: 2, door: 'north', winGap: 10 });
    house({ x: 52, z: 56, wdt: 30, dep: 42, floors: 2, wall: M.PLASTER, t: 1, door: 'north', paint: 0 });
    L.buildings.eastwing = house({ x: 176, z: 56, wdt: 30, dep: 42, floors: 2, wall: M.PLASTER, t: 1, door: 'north', paint: 0 });
    box(96, GY, 40, 162, GY + 1, 50, M.MARBLE);
    for (let x = 98; x <= 158; x += 10) cyl(x + 1, 43, 1.3, GY + 1, GY + 24, M.MARBLE);
    box(94, GY + 24, 38, 164, GY + 26, 50, M.MARBLE);
    for (let k = 0; k < 6; k++) box(98 + k * 5, GY + 26 + k, 38, 160 - k * 5, GY + 27 + k, 39, M.MARBLE);
    target('Portrait', 100, GY + 2 * STOREY + 1, 70, true, true);
    target('Estate ledger', 60, GY + STOREY + 1, 90, true, true);
    // Greenhouse: steel ribs, glass skin and planting tables.
    {
      const x = 196, z = 140, x1 = 238, z1 = 166, h = 12;
      box(x, GY - 1, z, x1, GY, z1, M.TILE);
      shell(x, GY, z, x1, GY + h, z1, 1, M.GLASS);
      for (let k = x; k < x1; k += 6) { box(k, GY, z, k + 1, GY + h, z + 1, M.STEEL); box(k, GY, z1 - 1, k + 1, GY + h, z1, M.STEEL); }
      for (let k = 0; k <= 13; k++) { box(x, GY + h + k, z + k, x1, GY + h + k + 1, z + k + 1, M.GLASS); box(x, GY + h + k, z1 - 1 - k, x1, GY + h + k + 1, z1 - k, M.GLASS); }
      for (let k = x; k < x1; k += 6) for (let q = 0; q <= 13; q++) { S(k, GY + h + q, z + q, M.STEEL); S(k, GY + h + q, z1 - 1 - q, M.STEEL); }
      box(x + 18, GY, z, x + 23, GY + 9, z + 1, M.AIR);
      for (const tz of [z + 5, z + 17]) { box(x + 4, GY, tz, x1 - 4, GY + 3, tz + 4, M.PLANK); for (let k = x + 5; k < x1 - 4; k += 3) box(k, GY + 3, tz + 1, k + 2, GY + 5 + (k % 2), tz + 3, M.LEAVES); }
      L.buildings.greenhouse = [x, GY, z, x1, GY + h + 14, z1];
      target('Ghost orchid', x + 26, GY + 3, z + 18, true, true);
    }
    // Garage with a steel safe.
    {
      const x = 26, z = 132, x1 = 66, z1 = 158;
      box(x, GY - 1, z, x1, GY, z1, M.CONCRETE); shell(x, GY, z, x1, GY + 12, z1, 2, M.BRICK); box(x, GY + 12, z, x1, GY + 13, z1, M.CONCRETE);
      box(x + 4, GY, z, x + 36, GY + 9, z + 2, M.AIR);
      shell(x1 - 9, GY, z1 - 9, x1 - 2, GY + 6, z1 - 2, 1, M.STEEL); box(x1 - 9, GY + 6, z1 - 9, x1 - 2, GY + 7, z1 - 2, M.STEEL);
      target('Safe deposit', x1 - 6, GY, z1 - 6, true, true);
      for (let k = 0; k < 3; k++) barrel(x + 6 + k * 4, z1 - 6);
    }
    // Pool with a tiled surround and loungers.
    {
      const x = 90, z = 120, x1 = 142, z1 = 138;
      box(x - 3, GY - 1, z - 3, x1 + 3, GY, z1 + 3, M.TILE);
      box(x, 1, z, x1, GY, z1, M.TILE); box(x + 1, 2, z + 1, x1 - 1, GY, z1 - 1, M.POOL);
      for (let k = 0; k < 5; k++) box(x + 4 + k * 8, GY, z1 + 4, x + 8 + k * 8, GY + 1, z1 + 10, M.PLANK, 6);
      box(x1 - 6, GY, z - 3, x1 - 3, GY + 6, z - 2, M.STEEL); box(x1 - 6, GY + 6, z - 3, x1 - 3, GY + 7, z + 3, M.PLANK);
    }
    // Hedge maze generated by a depth-first walk, gazebo at its heart.
    {
      const ox = 150, oz = 186, C = 13, R = 8, cs = 6;
      box(ox, GY, oz, ox + C * cs + 1, GY + 6, oz + R * cs + 1, M.LEAVES);
      const seen = new Uint8Array(C * R), st = [[0, 0]]; seen[0] = 1;
      const open = (c, r) => box(ox + 1 + c * cs, GY, oz + 1 + r * cs, ox + c * cs + cs, GY + 6, oz + r * cs + cs, M.AIR);
      open(0, 0);
      while (st.length) {
        const [c, r] = st[st.length - 1];
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [c + a, r + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < C && b < R && !seen[b * C + a]);
        if (!nb.length) { st.pop(); continue; }
        const [nc, nr] = nb[(rnd() * nb.length) | 0];
        seen[nr * C + nc] = 1; open(nc, nr);
        box(ox + 1 + Math.min(c, nc) * cs + (nc !== c ? cs - 1 : 0), GY, oz + 1 + Math.min(r, nr) * cs + (nr !== r ? cs - 1 : 0), ox + 1 + Math.min(c, nc) * cs + (nc !== c ? cs : cs - 1), GY + 6, oz + 1 + Math.min(r, nr) * cs + (nr !== r ? cs : cs - 1), M.AIR);
        st.push([nc, nr]);
      }
      box(ox + 1, GY, oz, ox + cs, GY + 6, oz + 1, M.AIR);
      const gx = ox + 5 * cs, gz = oz + 3 * cs;
      box(gx + 1, GY, gz + 1, gx + 3 * cs, GY + 6, gz + 2 * cs, M.AIR);
      box(gx + 4, GY, gz + 3, gx + 15, GY + 1, gz + 10, M.PLANK);
      for (const [a, b] of [[4, 3], [14, 3], [4, 9], [14, 9]]) box(gx + a, GY + 1, gz + b, gx + a + 1, GY + 8, gz + b + 1, M.WOOD, 6);
      for (let k = 0; k < 4; k++) box(gx + 3 + k, GY + 8 + k, gz + 2 + k, gx + 16 - k, GY + 9 + k, gz + 11 - k, M.ROOF);
      target('Bronze statuette', gx + 9, GY + 1, gz + 6, false, false);
    }
    for (let k = 0; k < 4; k++) { tree(108, 12 + k * 8, 12); tree(146, 12 + k * 8, 12); }
    for (const [tx, tz] of [[20, 30], [30, 60], [226, 30], [236, 70], [20, 220], [80, 200], [120, 220], [236, 110], [200, 120], [70, 170]]) tree(tx, tz, 11 + ((tx + tz) % 4));
    box(24, GY - 1, 186, 56, GY, 218, M.CONCRETE);
    for (let k = 0; k < 16; k++) { S(28 + k * 2, GY, 190, M.MARBLE, 6); S(28 + k * 2, GY, 214, M.MARBLE, 6); }
    vehicle('sports', 34, 146, 0, { color: 0x1a1a1c }); vehicle('sedan', 50, 146, 0, { color: 0x8c6a3a }); vehicle('heli', 40, 202, Math.PI / 2, { color: 0x1d2a3a });
    vehicle('pickup', 80, 170, 0, { color: 0x3f5a3a }); vehicle('wrecker', 214, 30, Math.PI / 2); vehicle('dozer', 226, 118, Math.PI); vehicle('forklift', 182, 130, 0);
    L.spawn = { x: 128, y: GY, z: 14, yaw: Math.PI };
    L.escape = { x: 128, y: GY, z: 12, r: 9 };
    return L;
  }
};

MAPS.oldtown = {
  name: 'Tollbridge Old Town', where: 'Canal town', blurb: 'Crooked rows of brick and timber houses along a canal, two bridges, a church bell tower, a market square and a town hall.',
  build(w) {
    const K = Kit(w, 777);
    const { rnd, S, box, shell, house, tree, target, barrel, crate, cyl, line, ground, vehicle, L } = K;
    ground((x, z) => {
      if (z >= 118 && z < 138) return [1, M.STONE];
      if (z === 116 || z === 117 || z === 138 || z === 139) return [GY, M.STONE];
      if (x >= 96 && x < 164 && z >= 30 && z < 96) return [GY, M.STONE];
      if ((x >= 60 && x < 74) || (x >= 170 && x < 184) || (z >= 160 && z < 174)) return [GY, M.ASPHALT];
      return [GY, M.GRASS];
    });
    // Brick bridges with parapets and arched undersides.
    for (const bx of [60, 170]) {
      box(bx, GY - 1, 114, bx + 14, GY, 142, M.BRICK);
      for (let z = 118; z < 138; z++) { const d = Math.abs(z - 127.5), h = Math.max(0, Math.round(2 - (10 - d) * 0.25)); if (h) box(bx, GY - 1 - h, z, bx + 14, GY - 1, z + 1, M.BRICK); }
      box(bx, GY, 114, bx + 1, GY + 3, 142, M.BRICK); box(bx + 13, GY, 114, bx + 14, GY + 3, 142, M.BRICK);
    }
    // Church nave and the bell tower.
    house({ x: 18, z: 50, wdt: 60, dep: 26, floors: 2, wall: M.BRICK, t: 2, door: 'north', winGap: 7 });
    {
      const x = 80, z = 56, s = 14, top = GY + 56;
      for (let f = 0; f < 5; f++) { const fy = GY + f * 12; box(x, fy, z, x + s, fy + 1, z + s, f ? M.WOOD : M.STONE); shell(x, fy + 1, z, x + s, fy + 12, z + s, 2, M.BRICK); box(x + 5, fy + 5, z, x + 9, fy + 9, z + 2, M.GLASS); }
      for (let f = 1; f < 5; f++) box(x + 3, GY + f * 12, z + 3, x + 5, GY + f * 12 + 1, z + 5, M.AIR);
      box(x + 3, GY, z + 2, x + 5, top - 11, z + 3, M.LADDER);
      box(x + 5, GY + 1, z + s - 2, x + 9, GY + 9, z + s, M.AIR);
      for (const [a, b, c, d] of [[x + 4, z, x + 10, z + 2], [x + 4, z + s - 2, x + 10, z + s], [x, z + 4, x + 2, z + 10], [x + s - 2, z + 4, x + s, z + 10]]) box(a, top - 9, b, c, top - 2, d, M.AIR);
      box(x + 5, top - 8, z + 5, x + 9, top - 4, z + 9, M.METAL, 3); box(x + 6, top - 4, z + 6, x + 8, top - 1, z + 8, M.WOOD);
      for (let k = 0; k < 8; k++) box(x - 1 + k, top + k * 2, z - 1 + k, x + s + 1 - k, top + k * 2 + 2, z + s + 1 - k, M.ROOF, 4);
      L.buildings.tower = [x - 1, GY, z - 1, x + s + 1, top + 17, z + s + 1];
      target('Reliquary', x + 10, GY + 36 + 1, z + 9, true, true);
    }
    // Market square: stalls with striped canvas, crates and a fountain.
    for (let k = 0; k < 8; k++) {
      const sx = 104 + (k % 4) * 15, sz = 40 + ((k / 4) | 0) * 28;
      for (const [a, b] of [[0, 0], [9, 0], [0, 7], [9, 7]]) box(sx + a, GY, sz + b, sx + a + 1, GY + 9, sz + b + 1, M.WOOD);
      box(sx, GY, sz, sx + 10, GY + 3, sz + 2, M.PLANK);
      for (let q = 0; q < 3; q++) box(sx - 1, GY + 9 + q, sz - 1 + q * 3, sx + 11, GY + 10 + q, sz + 2 + q * 3, M.CLOTH);
      crate(sx + 2, sz + 4, 2);
    }
    target('Cash box', 106, GY + 3, 69, true, true);
    cyl(130, 82, 6, GY, GY + 2, M.MARBLE, 1.2); cyl(130, 82, 5, GY, GY + 1, M.POOL); cyl(130, 82, 1.2, GY, GY + 8, M.STONE);
    // Town hall with a clock tower.
    {
      const x = 184, z = 30, x1 = 236, z1 = 80;
      for (let f = 0; f < 3; f++) { const fy = GY + f * STOREY; box(x, fy, z, x1, fy + 1, z1, M.CONCRETE); shell(x, fy + 1, z, x1, fy + STOREY, z1, 2, M.MARBLE); for (let k = x + 4; k + 4 < x1 - 2; k += 8) box(k, fy + 4, z, k + 4, fy + 10, z + 2, M.GLASS); if (f < 2) { for (let s = 0; s < STOREY; s++) box(x1 - 8, fy + 1, z + 4 + s, x1 - 4, fy + 2 + s, z + 5 + s, M.CONCRETE); box(x1 - 8, fy + STOREY, z + 5, x1 - 4, fy + STOREY + 1, z + 4 + STOREY - 1, M.AIR); } }
      box(x, GY + 36, z, x1, GY + 37, z1, M.CONCRETE);
      box(x + 22, GY + 1, z, x + 30, GY + 11, z + 2, M.AIR);
      const cx = x + 20; shell(cx, GY + 37, z, cx + 12, GY + 54, z + 12, 1, M.MARBLE); box(cx, GY + 54, z, cx + 12, GY + 55, z + 12, M.STONE);
      cyl(cx + 6, z + 0.5, 3.5, GY + 42, GY + 49, M.PLASTER, 0, 6); box(cx + 5, GY + 44, z - 1, cx + 6, GY + 48, z, M.STEEL); box(cx + 6, GY + 45, z - 1, cx + 9, GY + 46, z, M.STEEL);
      for (let k = 0; k < 6; k++) box(cx + k, GY + 55 + k, z + k, cx + 12 - k, GY + 56 + k, z + 12 - k, M.ROOF, 4);
      L.buildings.townhall = [x, GY, z, x1, GY + 62, z1];
      target('Archive box', x + 10, GY + 2 * STOREY + 1, z + 30, true, true);
    }
    // Row houses along both banks; a timber-framed row on the south bank.
    const colors = [0, 2, 3, 4, 5, 6, 7];
    for (let k = 0, x = 100; x + 14 <= 250; x += 14, k++) {
      if (x < 184 && x + 14 > 170) continue;
      house({ x, z: 98, wdt: 14, dep: 16, floors: 3 + (k % 2), wall: k % 3 ? M.PLASTER : M.BRICK, t: 1, door: 'north', paint: k % 3 ? colors[k % colors.length] : 0, winGap: 6 });
    }
    for (let k = 0, x = 8; x + 14 <= 250; x += 14, k++) {
      if ((x < 74 && x + 14 > 60) || (x < 184 && x + 14 > 170)) continue;
      const timber = x >= 88 && x < 162;
      house({ x, z: 142, wdt: 14, dep: 16, floors: timber ? 3 : 2 + (k % 2), wall: timber ? M.WOOD : k % 2 ? M.BRICK : M.PLASTER, t: 1, door: 'south', paint: timber ? 6 : k % 2 ? 0 : colors[(k + 3) % colors.length], winGap: 6 });
      if (timber) for (let y = GY + 2; y < GY + 36; y += 4) { box(x, y, 142, x + 14, y + 1, 143, M.WOOD, 8); box(x, y, 157, x + 14, y + 1, 158, M.WOOD, 8); }
    }
    L.buildings.timber = [88, GY, 141, 162, GY + 46, 159];
    target('Pocket watch', 120, GY + 2 * STOREY + 1, 150, false, false);
    target('Miniature', 116, GY + 2 * STOREY + 1, 106, true, true);
    // Quayside clutter and trees.
    for (let k = 0; k < 6; k++) barrel(20 + k * 6, 110);
    for (let k = 0; k < 4; k++) crate(200 + k * 5, 110, 3);
    for (const [tx, tz] of [[10, 20], [40, 14], [70, 20], [150, 14], [240, 20], [10, 200], [60, 210], [140, 220], [220, 200], [244, 230]]) tree(tx, tz, 11 + ((tx + tz) % 3));
    vehicle('truck', 130, 20, -Math.PI / 2); vehicle('sedan', 150, 190, Math.PI / 2, { color: 0x4a6d2c }); vehicle('pickup', 40, 200, 0); vehicle('boat', 220, 128, Math.PI / 2);
    vehicle('fire', 110, 180, -Math.PI / 2); vehicle('wrecker', 34, 104, -Math.PI / 2); vehicle('excavator', 230, 214, Math.PI); vehicle('sports', 20, 180, 0, { color: 0xf2b33d });
    L.spawn = { x: 66, y: GY, z: 168, yaw: 0 };
    L.escape = { x: 246, y: 0, z: 128, r: 9 };
    return L;
  }
};
