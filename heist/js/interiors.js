'use strict';
// Enterable buildings: every ordinary building in the city gets a seeded,
// multi-floor interior that is built when you walk up to it and torn down
// when you leave. Lobbies, apartments, offices and shops, connected by a
// switchback staircase, furnished and full of things to steal.

H.LOOT.electronics = { name: 'Electronics', value: 6500, weight: 0.8, color: 0x2a2a3a };
H.LOOT.painting = { name: 'Painting', value: 11000, weight: 0.7, color: 0x8a5a2a };

H.interiors = {
  list: [], active: [], taken: new Set(), t: 0,
  register(b) { b.id = this.list.length; this.list.push(b); },
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 0.4;
    const P = H.P; if (!P || P.inCar || H.run) { for (const b of this.active.slice()) if (!this.inside(b, P.pos, 2)) this.deactivate(b); return; }
    // activate the nearest few buildings around the player
    const near = this.list.map(b => ({ b, d: Math.hypot(b.door.x - P.pos.x, b.door.z - P.pos.z) })).filter(o => o.d < 32 || this.inside(o.b, P.pos, 1)).sort((a, b) => a.d - b.d).slice(0, 3);
    for (const { b } of near) if (!b.active) this.activate(b);
    for (const b of this.active.slice()) if (!near.some(o => o.b === b) && !this.inside(b, P.pos, 2)) this.deactivate(b);
  },
  inside(b, p, m = 0) { return Math.abs(p.x - b.x) < b.w / 2 + m && Math.abs(p.z - b.z) < b.d / 2 + m; },
  floorOf(b, y) { return H.clamp(Math.floor((y + 0.5) / b.fh), 0, b.floors - 1); },

  activate(b) {
    b.active = true; this.active.push(b);
    H.world.remove(b.box); H.nav.stamp(b.box, 0);
    const I = b.I = { boxes: [], group: new THREE.Group(), ias: [], npcs: [] };
    H.city.root.add(I.group);
    const mat = (tex, rough = 0.8, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: tex, roughness: rough, vertexColors: true, emissive: 0x141414, emissiveMap: tex }, extra));
    const B = I.B = {
      wall: new H.BoxBatch(mat(H.tex.plaster), 4), wood: new H.BoxBatch(mat(H.tex.wood, 0.6), 2), tile: new H.BoxBatch(mat(H.tex.floorTile), 3),
      carpet: new H.BoxBatch(mat(H.tex.carpet, 1), 3), marble: new H.BoxBatch(mat(H.tex.marble, 0.3), 4), plain: new H.BoxBatch(new THREE.MeshStandardMaterial({ roughness: 0.6, vertexColors: true, emissive: 0x121212 }), 4),
      metal: new H.BoxBatch(mat(H.tex.metal, 0.35, { metalness: 0.6 }), 2), conc: new H.BoxBatch(mat(H.tex.concrete), 4),
    };
    const R = H.seeded(b.id * 7349 + 11);
    const wc = [0xd8c8b0, 0xc8d0c0, 0xd0c0c8, 0xc0c8d4, 0xe0d0b8, 0xb8c4c0][Math.floor(R() * 6)];
    // local helpers: x,z are world coordinates; y is the box centre
    const solid = (batch, x, y, z, sx, sy, sz, col = 0xffffff, nav = false) => { batch.add(x, y, z, sx, sy, sz, col); const bx = H.world.addBox(x, y, z, sx, sy, sz, { interior: b.id, nonav: !nav }); I.boxes.push(bx); if (nav) H.nav.stamp(bx, 1); return bx; };
    const deco = (batch, x, y, z, sx, sy, sz, col = 0xffffff) => batch.add(x, y, z, sx, sy, sz, col);
    const X0 = b.x - b.w / 2 + 0.25, X1 = b.x + b.w / 2 - 0.25, Z0 = b.z - b.d / 2 + 0.25, Z1 = b.z + b.d / 2 - 0.25;
    const fh = b.fh, H0 = b.floors * fh, front = b.face; // face: +1 door on +z side, -1 on -z
    const doorX = b.door.x;
    // exterior shell (inner skin), door gap on the street side
    const t = 0.25;
    const wallX = (z, x0, x1, gaps, y0, h, nav) => { let s = x0; for (const [c, w] of gaps.sort((a, c2) => a[0] - c2[0])) { if (c - w / 2 > s) solid(B.wall, (s + c - w / 2) / 2, y0 + h / 2, z, c - w / 2 - s, h, t, wc, nav); solid(B.wall, c, y0 + (2.4 + h) / 2, z, w, h - 2.4, t, wc); s = c + w / 2; } if (x1 > s) solid(B.wall, (s + x1) / 2, y0 + h / 2, z, x1 - s, h, t, wc, nav); };
    const wallZ = (x, z0, z1, gaps, y0, h, nav) => { let s = z0; for (const [c, w] of gaps.sort((a, c2) => a[0] - c2[0])) { if (c - w / 2 > s) solid(B.wall, x, y0 + h / 2, (s + c - w / 2) / 2, t, h, c - w / 2 - s, wc, nav); solid(B.wall, x, y0 + (2.4 + h) / 2, c, t, h - 2.4, w, wc); s = c + w / 2; } if (z1 > s) solid(B.wall, x, y0 + h / 2, (s + z1) / 2, t, h, z1 - s, wc, nav); };
    const zf = front > 0 ? Z1 : Z0, zb = front > 0 ? Z0 : Z1;
    wallX(zf, X0, X1, [[doorX, 2]], 0, H0, true);
    wallX(zb, X0, X1, [], 0, H0, true);
    wallZ(X0, Z0, Z1, [], 0, H0, true); wallZ(X1, Z0, Z1, [], 0, H0, true);
    // stairs: two lanes along the left wall at the back, switching back each floor
    const laneW = 1.25, run = 20, rise = fh / run, depth = 0.28, runLen = run * depth;
    const sx0 = X0 + 0.15, laneX = [sx0 + laneW / 2, sx0 + laneW * 1.5];
    const sb = zb, dir = front > 0 ? 1 : -1; // stairs climb from the back wall toward the front
    const stairZoneZ = [Math.min(sb, sb + dir * (runLen + 1.6)), Math.max(sb, sb + dir * (runLen + 1.6))];
    for (let f = 0; f < b.floors - 1; f++) {
      const lane = f % 2, y0 = f * fh, up = lane === 0 ? 1 : -1; // lane 0 climbs toward the front, lane 1 back
      const start = lane === 0 ? sb + dir * 0.8 : sb + dir * (0.8 + runLen);
      for (let k = 0; k < run; k++) {
        const zc = start + dir * up * (k + 0.5) * depth;
        solid(B.wood, laneX[lane], y0 + (k + 1) * rise / 2 + 0.1, zc, laneW, (k + 1) * rise, depth, 0xffffff);
      }
      // railing between the lanes
      deco(B.metal, sx0 + laneW, y0 + fh / 2 + 0.6, sb + dir * (0.8 + runLen / 2), 0.05, 0.05, runLen);
    }
    // floor slabs with the stairwell hole over the run that reaches them
    for (let f = 0; f < b.floors; f++) {
      const y = f * fh;
      const kind = f === 0 ? (b.kind === 'office' ? 'marble' : b.kind === 'shop' ? 'tile' : 'tile') : (b.kind === 'office' ? 'carpet' : 'wood');
      const fc = { tile: 0xb8b0a4, marble: 0xd8d4cc, wood: 0xd0b8a0, carpet: 0xb0b8c8 }[kind]; const slab = (x0, x1, z0, z1) => { if (x1 - x0 < 0.05 || z1 - z0 < 0.05) return; solid(B[kind], (x0 + x1) / 2, y + 0.05, (z0 + z1) / 2, x1 - x0, 0.3, z1 - z0, fc); deco(B.plain, (x0 + x1) / 2, y - 0.12, (z0 + z1) / 2, x1 - x0, 0.02, z1 - z0, 0xf0ece4); };
      if (f === 0) slab(X0, X1, Z0, Z1);
      else {
        const lane = (f - 1) % 2, hx0 = laneX[lane] - laneW / 2, hx1 = laneX[lane] + laneW / 2;
        const hz0 = Math.min(sb + dir * 0.6, sb + dir * (1.0 + runLen)), hz1 = Math.max(sb + dir * 0.6, sb + dir * (1.0 + runLen));
        slab(X0, hx0, Z0, Z1); slab(hx1, X1, Z0, Z1); slab(hx0, hx1, Z0, hz0); slab(hx0, hx1, hz1, Z1);
        // guard rail around the hole
        deco(B.metal, hx1 + 0.03, y + 1.0, (hz0 + hz1) / 2, 0.05, 0.05, hz1 - hz0);
      }
      // ceiling lights
      for (let x = X0 + 4; x < X1 - 2; x += 6) for (let z = Z0 + 3; z < Z1 - 2; z += 6) deco(B.plain, x, y + fh - 0.18, z, 1.4, 0.04, 0.4, 0xfff6dc);
    }
    // roof cap under the facade roof
    solid(B.plain, b.x, H0 + 0.05, b.z, b.w - 0.3, 0.2, b.d - 0.3, 0xd8d4cc);
    // floor plans
    const L = { X0: sx0 + laneW * 2 + 0.4, X1, Z0, Z1, zf, zb, dir, doorX, stairZ: stairZoneZ };
    for (let f = 0; f < b.floors; f++) this.floorPlan(b, f, L, { solid, deco, B, wallX, wallZ, R, I });
    for (const k in B) if (B[k].pos.length) I.group.add(B[k].build(false));
    // light the stairwell and the lobby
  },
  // one storey: a corridor down the middle, units on both sides
  floorPlan(b, f, L, K) {
    const { solid, deco, B, wallX, R, I } = K;
    const y = f * b.fh + 0.2, h = b.fh - 0.2;
    const zc = (L.Z0 + L.Z1) / 2, cw = 2.2;
    const kind = f === 0 ? (b.kind === 'apartment' ? 'lobby' : b.kind === 'shop' ? 'shop' : b.kind === 'office' ? 'lobby' : 'lobby') : (b.kind === 'office' ? 'office' : 'apartment');
    // corridor walls with unit doors (left strip next to the stairs stays open as the hall)
    const span = L.X1 - L.X0; if (span < 6) return;
    const units = Math.max(1, Math.round(span / 7.5)), uw = span / units;
    const doorsF = [], doorsB = [];
    for (let u = 0; u < units; u++) { const cx = L.X0 + uw * (u + 0.5); doorsF.push([cx - uw * 0.3, 1.1]); doorsB.push([cx + uw * 0.3, 1.1]); }
    if (kind === 'lobby' || kind === 'shop') {
      // ground floor: open lobby on the street side, back rooms behind a wall
      const backWallZ = zc - L.dir * cw / 2;
      wallX(backWallZ, L.X0, L.X1, doorsB.map(d => d.slice()), y - 0.2, h + 0.2, f === 0);
      if (kind === 'shop') this.furnishShop(b, f, L, K, zc); else this.furnishLobby(b, f, L, K, zc);
      for (let u = 0; u < units; u++) this.furnishUnit(b, f, u, { x0: L.X0 + uw * u, x1: L.X0 + uw * (u + 1), z0: Math.min(L.zb, backWallZ), z1: Math.max(L.zb, backWallZ) }, kind === 'shop' ? 'storage' : 'office', K, L);
      for (let u = 1; u < units; u++) K.wallZ(L.X0 + uw * u, Math.min(L.zb, backWallZ), Math.max(L.zb, backWallZ), [], y - 0.2, h + 0.2, f === 0);
      return;
    }
    wallX(zc + cw / 2, L.X0, L.X1, doorsF.map(d => d.slice()), y - 0.2, h + 0.2);
    wallX(zc - cw / 2, L.X0, L.X1, doorsB.map(d => d.slice()), y - 0.2, h + 0.2);
    for (let u = 1; u < units; u++) { K.wallZ(L.X0 + uw * u, L.Z0, zc - cw / 2, [], y - 0.2, h + 0.2); K.wallZ(L.X0 + uw * u, zc + cw / 2, L.Z1, [], y - 0.2, h + 0.2); }
    // hall runner and unit numbers
    deco(B.carpet, (L.X0 + L.X1) / 2, y + 0.01, zc, span, 0.02, 1.2, 0x8a3a3a);
    for (let u = 0; u < units; u++) {
      const kindU = kind === 'office' ? (u === units - 1 ? 'manager' : R() < 0.3 ? 'meeting' : 'office') : 'apartment';
      this.furnishUnit(b, f, u * 2, { x0: L.X0 + uw * u, x1: L.X0 + uw * (u + 1), z0: Math.min(L.Z0, zc - cw / 2), z1: Math.max(L.Z0, zc - cw / 2) }, kindU, K, L);
      this.furnishUnit(b, f, u * 2 + 1, { x0: L.X0 + uw * u, x1: L.X0 + uw * (u + 1), z0: zc + cw / 2, z1: L.Z1 }, kindU === 'manager' ? 'office' : kindU, K, L);
    }
  },
  furnishLobby(b, f, L, K, zc) {
    const { solid, deco, B } = K, y = 0.2;
    const zl = (zc + L.zf) / 2;
    solid(B.wood, L.doorX + 3, y + 0.55, zl, 3, 1.1, 0.8, 0xffffff); // reception desk
    deco(B.plain, L.doorX + 3, y + 1.15, zl, 0.5, 0.35, 0.05, 0x101010);
    for (const s of [-1, 1]) { solid(B.plain, L.doorX + s * 5.5, y + 0.25, L.zf - L.dir * 2.2, 2.2, 0.5, 0.9, 0x2a3a5a); this.plant(b, L.doorX + s * 2.2, L.zf - L.dir * 1.2, y); }
    // mailboxes
    deco(B.metal, L.X1 - 0.3, y + 1.2, zl, 0.3, 1.2, 2.4, 0xc0c4c8);
    for (let i = 0; i < 6; i++) this.addLoot(b, f, 'mail' + i, L.X1 - 0.5, y + 0.9 + (i % 3) * 0.35, zl - 0.8 + Math.floor(i / 3) * 0.8, 'mail', 80 + Math.floor(K.R() * 400), K);
    // elevator doors (decor)
    deco(B.metal, L.X0 + 1.5, y + 1.2, L.zf - L.dir * 0.2, 2, 2.4, 0.1, 0xb0b4b8);
    for (let x = L.X0 + 3; x < L.X1 - 2; x += 6) { const zz = (zc + L.zf) / 2; if (Math.abs(x - L.doorX) < 2.5) continue; solid(B.marble, x, y + 1.6, zz, 0.6, 3.2, 0.6, 0xe8e4dc); deco(B.wood, x, y + 3.15, zz, 0.8, 0.1, 0.8); }
    deco(B.carpet, L.doorX, y + 0.01, (zc + L.zf) / 2, 5, 0.02, Math.abs(zc - L.zf) - 3, 0x8a2a3a);
    for (let x = L.X0 + 2; x < L.X1 - 2; x += 5) { if (Math.abs(x - L.doorX) < 4) continue; solid(B.wood, x, y + 0.25, zc + L.dir * 1.8, 1.8, 0.45, 0.5); this.plant(b, x + 2.4, zc + L.dir * 1.8, y); }
    this.addLoot(b, f, 'lobbyart', L.doorX - 4, y + 1.8, zc + L.dir * 1.25, 'painting', 0, K);
    if (K.R() < 0.7) this.addResident(b, f, L.doorX + 3, zl - L.dir * 1.2, y, 'clerk', K);
  },
  furnishShop(b, f, L, K, zc) {
    const { solid, deco, B, R } = K, y = 0.2;
    for (let i = 0; i < 3; i++) { const x = L.X0 + 3 + i * 3; solid(B.metal, x, y + 1, (zc + L.zf) / 2, 0.6, 2, Math.abs(L.zf - zc) - 3, 0xd8d8d8); for (let k = 0; k < 4; k++) deco(B.plain, x, y + 0.35 + k * 0.45, (zc + L.zf) / 2, 0.7, 0.3, Math.abs(L.zf - zc) - 3.4, H.pick([0xe86a8a, 0x4ac0d0, 0xf0c040, 0x7ad070])); }
    solid(B.wood, L.X1 - 2.5, y + 0.55, L.zf - L.dir * 2.5, 3, 1.1, 0.8, 0xffffff);
    this.addLoot(b, f, 'register', L.X1 - 2.5, y + 1.2, L.zf - L.dir * 2.5, 'register', 1500 + Math.floor(R() * 2500), K);
    this.addResident(b, f, L.X1 - 2.5, L.zf - L.dir * 3.5, y, 'clerk', K);
  },
  plant(b, x, z, y) { const p = H.buildPalm(1.8, Math.random()); p.scale.setScalar(0.45); p.position.set(x, y + 0.5, z); b.I.group.add(p); b.I.B.plain.add(x, y + 0.25, z, 0.5, 0.5, 0.5, 0x6a4a3a); },
  // a single room or apartment
  furnishUnit(b, f, u, r, kind, K, L) {
    const { solid, deco, B, R } = K, y = f * b.fh + 0.2;
    const w = r.x1 - r.x0, d = r.z1 - r.z0, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    if (w < 3 || d < 3) return;
    const inStairs = (x, z) => x < L.X0 + 0.2 && z > L.stairZ[0] && z < L.stairZ[1];
    const key = f + '_' + u;
    const wallSide = Math.abs(r.z0 - L.zb) < 0.5 || Math.abs(r.z1 - L.zb) < 0.5 ? (Math.abs(r.z0 - L.zb) < 0.5 ? r.z0 : r.z1) : (Math.abs(r.z0 - L.zf) < 0.5 ? r.z0 : r.z1);
    const away = wallSide === r.z0 ? 1 : -1; // direction from the outer wall into the room
    const wz = wallSide + away * 0.55;
    if (kind === 'apartment') {
      const col = H.pick([0xe8e0d0, 0x6a2a3a, 0x2a4a6a, 0x3a5a3a, 0xd8c8a0]);
      // living area: sofa, rug, TV, coffee table
      deco(B.carpet, cx, y + 0.01, cz, w * 0.5, 0.02, d * 0.4, H.pick([0xffffff, 0x8a8aa0, 0xc0a080]));
      solid(B.plain, cx, y + 0.3, cz + away * d * 0.18, w * 0.4, 0.6, 0.9, col); deco(B.plain, cx, y + 0.75, cz + away * (d * 0.18 + 0.38), w * 0.4, 0.5, 0.18, col);
      solid(B.wood, cx, y + 0.22, cz - away * 0.2, 1.2, 0.44, 0.6);
      solid(B.wood, cx, y + 0.3, wz, 1.6, 0.6, 0.45); deco(B.plain, cx, y + 0.95, wz, 1.3, 0.75, 0.06, 0x101014);
      this.addLoot(b, f, key + 'tv', cx, y + 1.0, wz + away * 0.2, 'tv', 0, K);
      // bedroom corner: bed, nightstand, wardrobe
      const bx = r.x0 + 1.3, bz = cz;
      solid(B.wood, bx, y + 0.25, bz, 1.6, 0.5, 2.1, 0xffffff); deco(B.plain, bx, y + 0.55, bz, 1.5, 0.12, 2.0, H.pick([0xf0f0f0, 0xd8e8f8, 0xf0d8e0])); deco(B.plain, bx, y + 0.65, bz - away * 0.85, 1.3, 0.12, 0.35, 0xffffff);
      solid(B.wood, bx + 1.1, y + 0.3, bz - away * 0.9, 0.45, 0.6, 0.45);
      this.addLoot(b, f, key + 'jewel', bx + 1.1, y + 0.66, bz - away * 0.9, 'jewel', 600 + Math.floor(R() * 2400), K);
      solid(B.wood, r.x1 - 0.4, y + 1.0, cz, 0.6, 2.0, 1.6);
      this.addLoot(b, f, key + 'stash', r.x1 - 0.75, y + 1.1, cz, 'cash', 300 + Math.floor(R() * 1800), K);
      // kitchenette and fridge
      solid(B.wood, r.x1 - 0.4, y + 0.45, cz + away * (d * 0.32), 0.6, 0.9, Math.min(2.4, d * 0.3), 0xffffff); deco(B.marble, r.x1 - 0.4, y + 0.92, cz + away * (d * 0.32), 0.62, 0.04, Math.min(2.4, d * 0.3));
      solid(B.metal, r.x1 - 0.4, y + 0.9, cz - away * (d * 0.32), 0.7, 1.8, 0.7, 0xe8e8e8);
      if (R() < 0.6) this.addLoot(b, f, key + 'laptop', cx, y + 0.48, cz - away * 0.2, 'laptop', 900, K);
      if (R() < 0.5) this.addLoot(b, f, key + 'paint', cx + w * 0.3, y + 1.6, wallSide + away * 0.05, 'painting', 0, K);
      if (R() < 0.18) this.addLoot(b, f, key + 'safe', r.x0 + 0.5, y + 0.4, cz + away * d * 0.3, 'safe', 3000 + Math.floor(R() * 7000), K);
      if (R() < 0.45 && !inStairs(cx, cz)) this.addResident(b, f, cx + 0.5, cz - away * 0.8, y, 'resident', K);
    } else if (kind === 'office' || kind === 'manager' || kind === 'storage') {
      if (kind === 'storage') {
        for (let i = 0; i < 2; i++) solid(B.metal, cx - w * 0.25 + i * w * 0.5, y + 1.1, wz + away * 0.1, w * 0.4, 2.2, 0.6, 0x8a8a90);
        for (let i = 0; i < 3; i++) solid(B.wood, cx - 1 + i * 1.2, y + 0.5, cz, 1, 1, 1);
        this.addLoot(b, f, key + 'safe', cx, y + 0.4, cz - away * (d * 0.3), 'safe', 4000 + Math.floor(R() * 6000), K);
        return;
      }
      const n = kind === 'manager' ? 1 : Math.max(1, Math.floor(w / 2.6));
      for (let i = 0; i < n; i++) {
        const dx = kind === 'manager' ? cx : r.x0 + w * (i + 0.5) / n;
        solid(B.wood, dx, y + 0.38, cz, kind === 'manager' ? 2 : 1.5, 0.76, 0.8);
        deco(B.plain, dx, y + 1.0, cz - away * 0.2, 0.55, 0.36, 0.04, 0x101418);
        deco(B.plain, dx, y + 0.45, cz + away * 0.7, 0.5, 0.08, 0.5, 0x222222);
        if (R() < 0.55) this.addLoot(b, f, key + 'lap' + i, dx + 0.3, y + 0.8, cz, 'laptop', 900, K);
        if (R() < 0.3) this.addLoot(b, f, key + 'cash' + i, dx - 0.4, y + 0.8, cz, 'cash', 150 + Math.floor(R() * 600), K);
      }
      solid(B.metal, r.x1 - 0.35, y + 0.7, wz + away * 0.2, 0.5, 1.4, 0.6, 0x9a9aa0);
      this.addLoot(b, f, key + 'file', r.x1 - 0.65, y + 1.0, wz + away * 0.2, 'cash', 200 + Math.floor(R() * 900), K);
      if (kind === 'manager') { this.addLoot(b, f, key + 'safe', r.x0 + 0.6, y + 0.4, wz + away * 0.1, 'safe', 6000 + Math.floor(R() * 12000), K); this.addLoot(b, f, key + 'paint', cx, y + 1.7, wallSide + away * 0.05, 'painting', 0, K); this.plant(b, r.x1 - 0.5, r.z0 + (away > 0 ? d - 0.6 : 0.6), y); }
      if (R() < 0.5) this.addResident(b, f, cx, cz + away * 0.9, y, 'worker', K);
    } else if (kind === 'meeting') {
      solid(B.wood, cx, y + 0.38, cz, w * 0.6, 0.76, 1.4);
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) deco(B.plain, cx - w * 0.22 + i * w * 0.15, y + 0.45, cz + s * 1.0, 0.45, 0.08, 0.45, 0x2a2a2a);
      deco(B.plain, cx, y + 1.5, wallSide + away * 0.06, 2.2, 1.2, 0.04, 0x101418);
      this.addLoot(b, f, key + 'proj', cx, y + 0.86, cz, 'laptop', 1400, K);
    }
  },
  // loot kinds: cash/jewel/mail/register small loot, laptop small, tv/painting bags, safe cracks
  addLoot(b, f, key, x, y, z, kind, value, K) {
    const id = b.id + ':' + key; if (this.taken.has(id)) return;
    const I = b.I, g = new THREE.Group(); g.position.set(x, y, z); I.group.add(g);
    const P = (sx, sy, sz, c, px = 0, py = 0, pz = 0, m) => { const o = new THREE.Mesh(H.geo.box(sx, sy, sz), m || H.mat(c, 0.5, 0.2)); o.position.set(px, py, pz); o.castShadow = true; g.add(o); return o; };
    let label = 'Take', time = 0.8, bag = null;
    if (kind === 'cash') { for (let i = 0; i < 3; i++) P(0.15, 0.03, 0.07, 0x3a6a2a, (i - 1) * 0.05, i * 0.03, 0); label = 'Grab cash'; }
    if (kind === 'jewel') { P(0.18, 0.08, 0.12, 0x5a1a2a); P(0.05, 0.05, 0.05, 0xd8b04a, 0, 0.06, 0, H.mat(0xd8b04a, 0.2, 1)); label = 'Take jewelry box'; }
    if (kind === 'mail') { P(0.2, 0.25, 0.04, 0x9aa0a6); label = 'Rifle through mail'; time = 1.2; }
    if (kind === 'register') { P(0.4, 0.16, 0.35, 0x2a2a2a); label = 'Empty register'; time = 1.5; }
    if (kind === 'laptop') { P(0.34, 0.02, 0.24, 0x2a2a30); const s = P(0.34, 0.22, 0.01, 0x2a2a30, 0, 0.11, -0.12); s.rotation.x = -0.2; label = 'Take laptop'; }
    if (kind === 'tv') { label = 'Bag the TV'; time = 2; bag = 'electronics'; }
    if (kind === 'painting') { const art = H.canvasTex(64, 48, (c, w, h) => { const hu = Math.random() * 360; c.fillStyle = `hsl(${hu},45%,45%)`; c.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { c.fillStyle = `hsla(${hu + Math.random() * 140},60%,${30 + Math.random() * 50}%,.8)`; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 12, 0, 7); c.fill(); } }, false); P(1.1, 0.8, 0.04, 0xb08a3a, 0, 0, 0, H.mat(0xb08a3a, 0.3, 0.8)); P(0.95, 0.65, 0.01, 0, 0, 0, 0.025, new THREE.MeshStandardMaterial({ map: art })); label = 'Cut painting'; time = 2.5; bag = 'painting'; }
    if (kind === 'safe') { P(0.6, 0.7, 0.5, 0, 0, 0, 0, new THREE.MeshStandardMaterial({ map: H.tex.metal, color: 0x5a6068, metalness: 0.8, roughness: 0.35 })); P(0.08, 0.08, 0.03, 0xc0c0c0, 0, 0.1, 0.26); label = 'Crack safe'; time = H.mod('nimbleAce') ? 6 : 14; }
    const ia = H.game.addInteract({ pos: new THREE.Vector3(x, y + 0.2, z), r: 1.9, label, time, interior: b.id,
      cond: () => !(bag && H.P.bag),
      done: () => {
        this.taken.add(id); I.group.remove(g); H.game.removeInteract(ia);
        if (bag) H.P.bag = bag;
        else if (kind === 'laptop') H.game.addSmall(value + Math.floor(Math.random() * 400));
        else if (kind === 'safe') { H.game.addSmall(value); if (Math.random() < 0.5) { H.P.bag ? H.game.dropBag('jewelry', new THREE.Vector3(x, y + 0.3, z + 0.6)) : (H.P.bag = 'jewelry'); H.ui.toast('Safe cracked', 'Cash and a bag of jewelry.'); } }
        else H.game.addSmall(value);
        this.witness(b, new THREE.Vector3(x, y, z));
      } });
    I.ias.push(ia);
  },
  addResident(b, f, x, z, y, role, K) {
    const n = new H.Npc('civ', x, z, { role }); n.pos.y = y; n.resident = b.id; n.home = n.pos.clone(); n.yaw = K.R() * 6.28;
    n.h.root.position.copy(n.pos); b.I.npcs.push(n);
  },
  // anyone who sees you stealing panics and calls the cops
  witness(b, at) {
    const P = H.P;
    for (const n of b.I.npcs) {
      if (n.dead || n.state === 'down' || n.state === 'tied' || n.state === 'cower') continue;
      if (Math.abs(n.pos.y - P.pos.y) > 2) continue;
      if (n.pos.distanceTo(P.pos) < 14 && n.canSee(H.camera.position, 14, 0.2)) { n.state = 'flee'; n.fleeT = 3; H.audio.shout(); }
    }
  },
  deactivate(b) {
    const I = b.I; if (!I) return;
    for (const bx of I.boxes) { H.world.remove(bx); if (!bx.nonav) H.nav.stamp(bx, 0); }
    for (const ia of I.ias) H.game.removeInteract(ia);
    for (const n of I.npcs) n.remove();
    H.city.root.remove(I.group);
    I.group.traverse(o => { if (o.geometry && o.geometry !== H.geo) { if (o.geometry.attributes && o.geometry.attributes.color) o.geometry.dispose(); } });
    b.box.dead = false; H.world.add(b.box); H.nav.stamp(b.box, 1);
    b.I = null; b.active = false; this.active.splice(this.active.indexOf(b), 1);
  },
  newDay() { this.taken.clear(); },
};
