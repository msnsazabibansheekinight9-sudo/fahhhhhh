'use strict';
// Sites: every heist location is a real building in the city with a walkable
// interior. A Site builds its static shell once (walls, floors, furniture) and
// records a spec of the dynamic parts (doors, loot, guards, cameras, civilians,
// objective objects) that a heist run instantiates.

H.sites = {};
H.FLOOR_TEX = () => ({ tile: H.tex.floorTile, marble: H.tex.marble, wood: H.tex.wood, carpet: H.tex.carpet, concrete: H.tex.concrete, metal: H.tex.metal });

class Site {
  constructor(heist, lot) {
    const tpl = H.TEMPLATES[heist.tpl];
    this.heist = heist; this.tpl = heist.tpl;
    const L = H.city.lotRect(lot.i, lot.j);
    this.w = tpl.w; this.d = tpl.d;
    this.ox = L.cx; this.oz = L.cz - 2; // building centre; front faces +z
    this.frontZ = this.oz + this.d / 2;
    this.lot = L;
    this.rng = H.seeded(heist.id.length * 977 + heist.id.charCodeAt(0) * 31 + heist.id.charCodeAt(heist.id.length - 1));
    this.group = new THREE.Group(); H.city.root.add(this.group);
    const FT = H.FLOOR_TEX();
    this.floorB = {}; for (const k in FT) this.floorB[k] = new H.BoxBatch(new THREE.MeshStandardMaterial({ map: FT[k], roughness: k === 'marble' ? 0.25 : 0.8, vertexColors: true }), k === 'carpet' ? 3 : 4);
    this.wallB = new H.BoxBatch(new THREE.MeshStandardMaterial({ map: H.tex.plaster, roughness: 0.9, vertexColors: true }), 4);
    this.extB = new H.BoxBatch(new THREE.MeshStandardMaterial({ map: H.tex.brick, roughness: 0.9, vertexColors: true }), 4);
    this.plainB = new H.BoxBatch(new THREE.MeshStandardMaterial({ roughness: 0.55, vertexColors: true }), 4);
    this.metalB = new H.BoxBatch(new THREE.MeshStandardMaterial({ map: H.tex.metal, roughness: 0.35, metalness: 0.8, vertexColors: true }), 2);
    this.woodB = new H.BoxBatch(new THREE.MeshStandardMaterial({ map: H.tex.wood, roughness: 0.6, vertexColors: true }), 2);
    this.spec = { doors: [], loot: [], small: [], guards: [], cams: [], civs: [], points: {}, safes: [], cases: [], paintings: [], computers: [], lasers: [], crates: [], props: [], keycards: [], vaults: [], readers: [], ingredients: [], destroy: [], c4: [], glass: [] };
    this.rooms = [];
  }
  X(x) { return this.ox + x; } Z(z) { return this.oz + z; }
  floor(x, z, w, d, kind = 'tile', color = 0xffffff) { this.floorB[kind].add(this.X(x), 0.1, this.Z(z), w, 0.2, d, color); }
  solid(b, x, y, z, sx, sy, sz, color, extra) { b.add(this.X(x), y, this.Z(z), sx, sy, sz, color); return H.world.addBox(this.X(x), y, this.Z(z), sx, sy, sz, Object.assign({ site: this.heist.id }, extra || {})); }
  // wall along x at local z from x0 to x1 with gaps [[cx, width], ...]
  wallX(z, x0, x1, gaps = [], kind = 'int', h = 4, color = 0xffffff) {
    const segs = this._split(x0, x1, gaps), b = kind === 'ext' ? this.extB : this.wallB, t = kind === 'ext' ? 0.4 : 0.22;
    for (const [a, c] of segs) if (c - a > 0.02) this.solid(b, (a + c) / 2, h / 2, z, c - a, h, t, color);
    for (const [gc, gw, gh = 2.6] of gaps) if (gh < h) this.solid(b, gc, (gh + h) / 2, z, gw, h - gh, t, color);
  }
  wallZ(x, z0, z1, gaps = [], kind = 'int', h = 4, color = 0xffffff) {
    const segs = this._split(z0, z1, gaps), b = kind === 'ext' ? this.extB : this.wallB, t = kind === 'ext' ? 0.4 : 0.22;
    for (const [a, c] of segs) if (c - a > 0.02) this.solid(b, x, h / 2, (a + c) / 2, t, h, c - a, color);
    for (const [gc, gw, gh = 2.6] of gaps) if (gh < h) this.solid(b, x, (gh + h) / 2, gc, t, h - gh, gw, color);
  }
  _split(a, b, gaps) { const g = gaps.slice().sort((p, q) => p[0] - q[0]); const out = []; let s = a; for (const [c, w] of g) { out.push([s, c - w / 2]); s = c + w / 2; } out.push([s, b]); return out; }
  shell(frontGaps, h = 4.5, opts = {}) {
    const w = this.w, d = this.d, col = opts.extColor || 0xffffff;
    this.wallX(d / 2, -w / 2, w / 2, frontGaps, 'ext', h, col);
    this.wallX(-d / 2, -w / 2, w / 2, opts.backGaps || [], 'ext', h, col);
    this.wallZ(-w / 2, -d / 2, d / 2, opts.leftGaps || [], 'ext', h, col);
    this.wallZ(w / 2, -d / 2, d / 2, opts.rightGaps || [], 'ext', h, col);
    if (!opts.noRoof) {
      this.plainB.add(this.X(0), h + 0.15, this.Z(0), w + 0.6, 0.3, d + 0.6, 0xd8d4cc);
      H.world.addBox(this.X(0), h + 0.15, this.Z(0), w + 0.6, 0.3, d + 0.6, { site: this.heist.id, roof: true });
      // ceiling lights
      for (let x = -w / 2 + 5; x < w / 2; x += 9) for (let z = -d / 2 + 5; z < d / 2; z += 9) this.plainB.add(this.X(x), h - 0.05, this.Z(z), 1.6, 0.06, 0.5, 0xfff8e0);
      H.city.roofs.push({ x: this.ox, z: this.oz, y: h + 0.3, w, d });
    }
    this.h = h;
    // sign above the entrance
    if (opts.sign) { const n = H.buildNeon(opts.sign, opts.signColor || 0xffd040); n.position.set(this.X(0), h + 1.2, this.Z(d / 2) + 0.3); this.group.add(n); H.city.props.push(n); }
  }
  // furniture helpers (local coords)
  box(x, y, z, sx, sy, sz, color = 0x888888, batch = 'plain', collide = true) { const b = this[batch + 'B'] || this.plainB; if (collide) return this.solid(b, x, y, z, sx, sy, sz, color); b.add(this.X(x), y, this.Z(z), sx, sy, sz, color); return null; }
  desk(x, z, rot = 0) { const [sx, sz] = rot ? [0.8, 1.6] : [1.6, 0.8]; this.box(x, 0.75, z, sx, 0.06, sz, 0xffffff, 'wood'); this.box(x, 0.37, z, sx * 0.9, 0.74, sz * 0.9, 0x3a2a1a, 'plain'); this.box(x + (rot ? 0 : 0.3), 0.98, z + (rot ? 0.3 : 0), 0.5, 0.36, 0.04, 0x111111, 'plain', false); }
  chair(x, z) { this.box(x, 0.45, z, 0.5, 0.08, 0.5, 0x222222, 'plain', false); this.box(x, 0.75, z - 0.22, 0.5, 0.6, 0.06, 0x222222, 'plain', false); this.box(x, 0.22, z, 0.06, 0.44, 0.06, 0x555555, 'metal', false); }
  plant(x, z) { this.box(x, 0.3, z, 0.5, 0.6, 0.5, 0x6a4a3a); const p = H.buildPalm(1.6, this.rng()); p.scale.setScalar(0.5); p.position.set(this.X(x), 0.6, this.Z(z)); this.group.add(p); }
  shelf(x, z, len, rot, color = 0x6a6a70) { const [sx, sz] = rot ? [0.6, len] : [len, 0.6]; this.box(x, 1.1, z, sx, 2.2, sz, color, 'metal'); for (let y = 0.4; y < 2.2; y += 0.55) this.box(x, y, z, sx * 1.02, 0.04, sz * 1.02, 0x3a3a3a, 'plain', false); }
  crateStack(x, z, n = 2) { for (let i = 0; i < n; i++) this.box(x, 0.6 + i * 1.2, z, 1.2, 1.2, 1.2, 0xffffff, 'wood'); }
  sofa(x, z, rot = 0, color = 0x6a2a3a) { const [sx, sz] = rot ? [0.9, 2.2] : [2.2, 0.9]; this.box(x, 0.3, z, sx, 0.6, sz, color); this.box(x + (rot ? -0.35 : 0), 0.75, z + (rot ? 0 : -0.35), rot ? 0.2 : sx, 0.6, rot ? sz : 0.2, color, 'plain', false); }
  // spec registration
  door(x, z, axis, lock = 'none', w = 1.4, extra = {}) { this.spec.doors.push(Object.assign({ x: this.X(x), z: this.Z(z), axis, lock, w }, extra)); }
  loot(x, z, type, n = 1) { for (let i = 0; i < n; i++) this.spec.loot.push({ x: this.X(x + (i % 3) * 0.7 - 0.7), z: this.Z(z + Math.floor(i / 3) * 0.8), type }); }
  small(x, z, value, kind = 'cash', y = 1) { this.spec.small.push({ x: this.X(x), z: this.Z(z), y, value, kind }); }
  guard(path) { this.spec.guards.push(path.map(([x, z]) => ({ x: this.X(x), z: this.Z(z) }))); }
  cam(x, z, yaw, y = 3.6) { this.spec.cams.push({ x: this.X(x), z: this.Z(z), y, yaw }); }
  civ(x, z, role = 'civ', opts = {}) { this.spec.civs.push(Object.assign({ x: this.X(x), z: this.Z(z), role }, opts)); }
  point(name, x, z) { this.spec.points[name] = { x: this.X(x), z: this.Z(z) }; }
}
H.Site = Site;

/* ---------------- shared room kits ---------------- */
// Back-of-house strip: corridor along x at zc, rooms behind it split at the given x cuts.
function backRooms(S, zc, cuts, roomKinds, opts = {}) {
  const w = S.w, d = S.d, back = -d / 2;
  const corr = 2.6;
  S.floor(0, zc, w - 0.4, corr, 'tile', 0xd8d8d8);
  const xs = [-w / 2, ...cuts, w / 2];
  const rooms = [];
  for (let k = 0; k < xs.length - 1; k++) {
    const x0 = xs[k], x1 = xs[k + 1], cx = (x0 + x1) / 2, rz0 = back, rz1 = zc - corr / 2;
    const kind = roomKinds[k] || 'office';
    S.floor(cx, (rz0 + rz1) / 2, x1 - x0 - 0.2, rz1 - rz0 - 0.2, kind === 'vault' ? 'metal' : kind === 'security' ? 'concrete' : 'carpet', kind === 'vault' ? 0xffffff : 0xffffff);
    if (k > 0) S.wallZ(x0, rz0, rz1);
    const doorX = H.clamp(cx + (kind === 'vault' ? 0 : (x1 - x0) * 0.25), x0 + 1, x1 - 1);
    const lock = kind === 'vault' ? 'vault' : kind === 'security' ? 'pick' : opts.officeLock && S.rng() < 0.5 ? 'pick' : 'none';
    S.wallX(rz1, x0, x1, [[doorX, kind === 'vault' ? 2.4 : 1.4]], 'int', S.h || 4.5, kind === 'vault' ? 0x9aa0a8 : 0xffffff);
    S.door(doorX, rz1, 'x', lock, kind === 'vault' ? 2.4 : 1.4);
    rooms.push({ x0, x1, z0: rz0, z1: rz1, cx, cz: (rz0 + rz1) / 2, kind, doorX });
  }
  S.wallX(zc + corr / 2, -w / 2, w / 2, opts.frontGaps || [[0, 2]], 'int', S.h || 4.5);
  for (const r of rooms) furnishRoom(S, r, opts);
  return rooms;
}
function furnishRoom(S, r, opts) {
  const { cx, cz, x0, x1, z0, z1, kind } = r;
  if (kind === 'office' || kind === 'manager') {
    S.desk(cx, cz - 0.5); S.chair(cx, cz - 1.4); S.shelf(x0 + 0.5, cz, Math.min(3, z1 - z0 - 1), true, 0x6a4a3a); S.plant(x1 - 0.6, z0 + 0.6);
    if (kind === 'manager') { S.point('manager', cx, cz + 1); S.spec.keycards.push({ x: S.X(cx + 0.4), z: S.Z(cz - 0.5), y: 0.8, hidden: true }); }
    else if (S.rng() < 0.4) S.small(cx - 0.3, cz - 0.5, 1200, 'cash', 0.8);
    S.spec.safes.push({ x: S.X(x1 - 0.6), z: S.Z(z0 + 0.6), small: 4000 + Math.floor(S.rng() * 6000), optional: true });
  } else if (kind === 'security') {
    S.desk(cx, z0 + 1.2); S.chair(cx, z0 + 2.2);
    for (let i = -1; i <= 1; i++) S.box(cx + i * 0.7, 1.6, z0 + 0.4, 0.6, 0.45, 0.1, 0x101820, 'plain', false);
    S.spec.computers.push({ x: S.X(cx), z: S.Z(z0 + 1.2), kind: 'security', label: 'Security PC' });
    S.point('security', cx, cz);
  } else if (kind === 'storage') {
    S.shelf(cx, z0 + 0.5, x1 - x0 - 1, false); S.crateStack(x1 - 1.2, z1 - 1.5, 2);
  } else if (kind === 'vault') {
    S.point('vault', cx, cz);
    // deposit box walls
    for (const side of [-1, 1]) {
      const wx = side < 0 ? x0 + 0.35 : x1 - 0.35;
      S.box(wx, 1.6, cz, 0.5, 3.2, z1 - z0 - 1.6, 0xb0b4b8, 'metal');
      for (let k = 0; k < 4; k++) S.spec.small.push({ x: S.X(wx - side * 0.3), z: S.Z(cz - (z1 - z0) * 0.3 + k * (z1 - z0) * 0.2), y: 1.2, value: 2500 + Math.floor(S.rng() * 5000), kind: 'deposit' });
    }
    r.lootAt = { x: cx, z: cz };
  } else if (kind === 'server') {
    for (let k = 0; k < 3; k++) S.box(cx - 2 + k * 2, 1, cz, 0.8, 2, 1.2, 0x1a1d22, 'plain');
    S.spec.computers.push({ x: S.X(cx), z: S.Z(z1 - 1), kind: 'hack', label: 'Server terminal' });
    S.point('server', cx, cz);
  }
}
function lobbyCivs(S, n, area) { for (let i = 0; i < n; i++) S.civ(H.lerp(area.x0, area.x1, S.rng()), H.lerp(area.z0, area.z1, S.rng()), 'civ'); }
function frontVan(S, offset = 0) {
  // secure zone and getaway van at the kerb in front of the building
  const L = S.lot; S.spec.van = { x: S.X(offset + 8), z: L.z1 + 3.5, ry: Math.PI / 2 };
  S.point('entrance', 0, S.d / 2 + 2.5);
  S.point('plan', -4, S.d / 2 + 4.5);
}

/* ---------------- templates ---------------- */
const T = {};
T.bank = S => {
  const w = S.w, d = S.d;
  S.shell([[0, 3], [-12, 4, 3.4], [12, 4, 3.4]], 4.5, { sign: S.heist.name.split(' ')[0] + ' Bank', signColor: 0x40ff90 });
  for (const gx of [-12, 12]) S.spec.glass.push({ x: S.X(gx), y: 1.7, z: S.Z(d / 2), sx: 4, sy: 3.4, sz: 0.1 });
  const zc = -d / 2 + 11;
  S.floor(0, (zc + d / 2) / 2 + 0.6, w - 0.4, d / 2 - zc + 0.6, 'marble');
  // teller counter
  S.box(-w / 4, 0.55, zc + 6, w / 2 - 1, 1.1, 0.8, 0xffffff, 'wood');
  S.box(w / 4 + 1.5, 0.55, zc + 6, w / 2 - 4, 1.1, 0.8, 0xffffff, 'wood');
  S.box(0, 1.9, zc + 6, w - 2, 1.4, 0.06, 0xa0c0d0, 'plain', false);
  S.wallX(zc + 6, -w / 2, w / 2, [[w / 4 - 2, 1.4]], 'int', 1.1); // low gate gap
  S.door(w / 4 - 2, zc + 6, 'x', 'pick', 1.4, { low: true });
  for (let i = 0; i < 4; i++) { S.civ(-w / 2 + 4 + i * 5, zc + 4.5, 'teller'); S.small(-w / 2 + 4 + i * 5, zc + 6, 900, 'register', 1.15); }
  for (const s of [-1, 1]) { S.plant(s * (w / 2 - 1), d / 2 - 1.5); S.sofa(s * (w / 2 - 3), d / 2 - 5, 1); }
  S.box(0, 0.5, d / 2 - 7, 3, 1, 1.2, 0xffffff, 'wood');
  const rooms = backRooms(S, zc, [-w / 2 + 10, -w / 2 + 19, w / 2 - 16], ['manager', 'security', 'office', 'vault'], { frontGaps: [[0, 2]] });
  S.door(0, zc + 1.3, 'x', 'card', 2);
  const v = rooms[3];
  S.spec.vaults.push({ doorX: S.X(v.doorX), doorZ: S.Z(v.z1), loot: v.lootAt, timelock: 50 });
  S.loot(v.cx, v.cz - 1, Object.keys(S.heist.loot)[0] || 'money', 0);
  S.spec.vaultLoot = { x: S.X(v.cx), z: S.Z(v.cz) };
  S.spec.readers.push({ x: S.X(v.doorX + 1.6), z: S.Z(v.z1 + 0.15), y: 1.3, target: 'vault' });
  lobbyCivs(S, 6, { x0: -w / 2 + 3, x1: w / 2 - 3, z0: zc + 8, z1: d / 2 - 3 });
  S.civ(rooms[0].cx, rooms[0].cz + 1, 'manager', { keycard: true });
  S.guard([[-w / 2 + 3, d / 2 - 3], [w / 2 - 3, d / 2 - 3], [w / 2 - 3, zc + 8], [-w / 2 + 3, zc + 8]]);
  S.guard([[-w / 2 + 3, zc], [w / 2 - 3, zc]]);
  S.guard([[rooms[1].cx, rooms[1].cz]]);
  S.guard([[0, d / 2 + 4], [10, d / 2 + 4]]); // outside the door
  S.cam(-w / 2 + 0.6, d / 2 - 0.6, -Math.PI * 0.75); S.cam(w / 2 - 0.6, d / 2 - 0.6, Math.PI * 0.75);
  S.cam(0, zc - 1.1, Math.PI); S.cam(v.cx, v.z0 + 0.6, 0);
  frontVan(S);
};
T.jewelry = S => {
  const w = S.w, d = S.d;
  S.shell([[0, 2.4], [-7, 6, 3.4], [7, 6, 3.4]], 4.2, { sign: S.heist.name, signColor: 0xff7ae0 });
  for (const gx of [-7, 7]) S.spec.glass.push({ x: S.X(gx), y: 1.7, z: S.Z(d / 2), sx: 6, sy: 3.4, sz: 0.1 });
  S.floor(0, 2, w - 0.4, d - 4.4, 'marble');
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const x = s * (3 + i * 2.6) * 0.8, z = s < 0 ? 1 : 3.5;
    S.box(x, 0.45, z, 1.6, 0.9, 0.8, 0xf0f0f0, 'plain');
    S.spec.cases.push({ x: S.X(x), z: S.Z(z), y: 1.1, value: 1500 + Math.floor(S.rng() * 2500), diamond: S.heist.loot.diamonds && i === 0 && s > 0 });
  }
  const zc = -d / 2 + 4.5;
  const rooms = backRooms(S, zc, [0], ['manager', 'storage'], { frontGaps: [[-4, 1.4]] });
  S.door(-4, zc + 1.3, 'x', 'pick');
  S.spec.safes.push({ x: S.X(rooms[1].cx), z: S.Z(rooms[1].cz), small: 12000, bag: 'jewelry' });
  lobbyCivs(S, 4, { x0: -w / 2 + 2, x1: w / 2 - 2, z0: 0, z1: d / 2 - 2 });
  S.civ(0, -1, 'clerk'); S.civ(rooms[0].cx, rooms[0].cz, 'manager', { keycard: true });
  S.guard([[-w / 2 + 2, d / 2 - 2], [w / 2 - 2, d / 2 - 2]]);
  S.cam(-w / 2 + 0.6, d / 2 - 0.6, -Math.PI * 0.75); S.cam(w / 2 - 0.6, -1, Math.PI * 0.6);
  frontVan(S);
};
T.gallery = S => {
  const w = S.w, d = S.d;
  S.shell([[0, 3]], 6, { sign: S.heist.name, signColor: 0xffe080, extColor: 0xf0ece0 });
  S.floor(0, 0, w - 0.4, d - 0.4, 'wood');
  // three exhibition halls separated by walls with wide openings
  S.wallZ(-w / 6, -d / 2, d / 2 - 8, [[0, 3]], 'int', 6); S.wallZ(w / 6, -d / 2, d / 2 - 8, [[0, 3]], 'int', 6);
  S.wallX(d / 2 - 8, -w / 2, w / 2, [[-w / 3, 3], [0, 4], [w / 3, 3]], 'int', 6);
  const halls = [-w / 3, 0, w / 3];
  let pi = 0;
  for (const hx of halls) {
    for (const [px, pz, ry] of [[hx - 5, -d / 2 + 0.3, 0], [hx + 5, -d / 2 + 0.3, 0], [hx, -4, 0]]) {
      if (pz === -4) { S.box(hx, 1, -4, 3, 2, 0.4, 0xffffff, 'plain'); }
      S.spec.paintings.push({ x: S.X(px), z: S.Z(pz + (pz === -4 ? 0.25 : 0)), y: 2.2, ry, real: (pi++ % 3) !== 1 });
    }
    S.box(hx, 0.25, 4, 2.4, 0.5, 1, 0x3a3a3a); // bench
    if (S.heist.loot.diamonds && hx === 0) { S.box(0, 0.5, 2, 1.4, 1, 1.4, 0xf0f0f0); S.spec.cases.push({ x: S.X(0), z: S.Z(2), y: 1.1, value: 4000, diamond: true }); }
    S.spec.lasers.push({ x0: S.X(hx - 4), x1: S.X(hx + 4), z: S.Z(d / 2 - 8.6), h: 3 });
  }
  // lobby
  S.box(-w / 2 + 6, 0.55, d / 2 - 4, 5, 1.1, 1, 0xffffff, 'wood'); S.civ(-w / 2 + 6, d / 2 - 5, 'clerk');
  S.wallZ(-w / 2 + 9, d / 2 - 8, d / 2, [[d / 2 - 4, 1.4]], 'int', 6);
  S.door(-w / 2 + 9, d / 2 - 4, 'z', 'pick');
  S.spec.computers.push({ x: S.X(-w / 2 + 4), z: S.Z(d / 2 - 6.5), kind: 'security', label: 'Laser control' });
  lobbyCivs(S, 6, { x0: -w / 2 + 10, x1: w / 2 - 2, z0: d / 2 - 7, z1: d / 2 - 2 });
  for (const hx of halls) S.guard([[hx, d / 2 - 10], [hx, -d / 2 + 3]]);
  S.guard([[-w / 2 + 11, d / 2 - 3], [w / 2 - 3, d / 2 - 3]]);
  for (const hx of halls) S.cam(hx, -d / 2 + 0.6, 0, 5);
  S.cam(w / 2 - 0.6, d / 2 - 0.6, Math.PI * 0.75, 5);
  frontVan(S);
};
T.club = S => {
  const w = S.w, d = S.d;
  S.shell([[0, 2.4]], 6, { sign: 'Velvet', signColor: 0xff3aa0, extColor: 0x2a2a3a });
  S.floor(0, 4, w - 0.4, d - 8.4, 'tile', 0x2a2a3a);
  // dance floor of glowing tiles
  S.spec.danceFloor = { x: S.X(0), z: S.Z(4), w: 12, d: 10 };
  S.box(-w / 2 + 3, 0.55, 2, 1, 1.1, 10, 0x2a1a2a, 'wood'); // bar
  S.box(-w / 2 + 1, 1.5, 2, 0.4, 3, 10, 0x1a1a1a, 'plain'); // back bar shelves
  S.box(w / 2 - 4, 0.5, 0, 6, 1, 6, 0x1a1a1a, 'plain'); // DJ stage
  for (let i = 0; i < 4; i++) S.sofa(w / 2 - 3, d / 2 - 3 - i * 3, 1, 0x6a1a3a);
  const zc = -d / 2 + 7;
  const rooms = backRooms(S, zc, [-w / 2 + 12, w / 2 - 14], ['manager', 'storage', 'office'], { frontGaps: [[-w / 2 + 6, 1.6], [w / 2 - 7, 1.6]] });
  S.door(-w / 2 + 6, zc + 1.3, 'x', 'pick'); S.door(w / 2 - 7, zc + 1.3, 'x', 'none');
  S.spec.safes.push({ x: S.X(rooms[0].cx), z: S.Z(rooms[0].z0 + 0.6), small: 8000, bag: S.heist.loot.money ? 'money' : null, main: true });
  S.spec.lootRoom = { x: S.X(rooms[1].cx), z: S.Z(rooms[1].cz) };
  lobbyCivs(S, 12, { x0: -6, x1: 6, z0: -1, z1: 9 });
  S.civ(-w / 2 + 2.2, 2, 'clerk'); S.civ(w / 2 - 4, 0, 'dj');
  for (let i = 0; i < 3; i++) S.guard([[-w / 2 + 5 + i * 8, d / 2 - 2], [-w / 2 + 5 + i * 8, 0]]);
  S.guard([[0, zc], [w / 2 - 3, zc]]);
  S.cam(-w / 2 + 0.6, d / 2 - 0.6, -Math.PI * 0.75, 5); S.cam(0, zc - 1.2, Math.PI);
  frontVan(S);
};
T.warehouse = S => {
  const w = S.w, d = S.d, gang = S.heist.gang;
  S.shell([[0, 6, 5], [-14, 2]], 9, { extColor: 0xb0a898 });
  S.floor(0, 0, w - 0.4, d - 0.4, 'concrete');
  // rows of crates and shipping containers
  const cols = [0xc0442a, 0x2a6ac0, 0x3a8a3a, 0xd0a020];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const x = -w / 2 + 7 + c * 11, z = -d / 2 + 6 + r * 9;
    if (c % 2 === 0) { S.box(x, 1.3, z, 6, 2.6, 2.5, cols[(r + c) % 4], 'metal'); S.spec.crates.push({ x: S.X(x + 3.2), z: S.Z(z), y: 1, container: true }); }
    else { S.crateStack(x - 1, z, 2); S.crateStack(x + 0.4, z, 1); S.spec.crates.push({ x: S.X(x + 0.4), z: S.Z(z + 0.8), y: 0.8 }); S.spec.crates.push({ x: S.X(x - 1), z: S.Z(z + 0.8), y: 0.8 }); }
  }
  // office mezzanine corner
  S.wallX(d / 2 - 7, w / 2 - 10, w / 2, [[w / 2 - 6, 1.4]], 'int', 3);
  S.wallZ(w / 2 - 10, d / 2 - 7, d / 2, [], 'int', 3);
  S.door(w / 2 - 6, d / 2 - 7, 'x', 'pick');
  S.desk(w / 2 - 5, d / 2 - 3); S.spec.computers.push({ x: S.X(w / 2 - 5), z: S.Z(d / 2 - 3), kind: 'manifest', label: 'Shipping manifest' });
  S.spec.safes.push({ x: S.X(w / 2 - 1), z: S.Z(d / 2 - 1), small: 6000 });
  for (let i = 0; i < (gang ? 6 : 4); i++) S.guard([[-w / 2 + 3 + i * 8, d / 2 - 3], [-w / 2 + 3 + i * 8, -d / 2 + 3]]);
  S.guard([[-w / 2 - 3, d / 2 + 3], [w / 2 + 3, d / 2 + 3]]);
  S.cam(-w / 2 + 0.6, d / 2 - 0.6, -Math.PI * 0.75, 7); S.cam(w / 2 - 0.6, -d / 2 + 0.6, Math.PI * 0.25, 7);
  S.spec.gang = !!gang;
  frontVan(S);
};
T.mansion = S => {
  const w = S.w, d = S.d;
  S.shell([[0, 2.4], [-10, 3, 3], [10, 3, 3]], 5, { extColor: 0xf6eee0 });
  for (const gx of [-10, 10]) S.spec.glass.push({ x: S.X(gx), y: 1.9, z: S.Z(d / 2), sx: 3, sy: 3, sz: 0.1 });
  S.floor(0, 0, w - 0.4, d - 0.4, 'marble');
  // foyer, living room left, dining right, back: study, master bedroom, gallery hall
  S.wallZ(-6, -2, d / 2, [[d / 2 - 6, 2.4]], 'int', 5); S.wallZ(6, -2, d / 2, [[d / 2 - 6, 2.4]], 'int', 5);
  for (const s of [-1, 1]) { S.sofa(s * 13, 6, 1, 0xe8e0d0); S.box(s * 15, 0.3, 8, 1.2, 0.6, 2, 0xffffff, 'wood'); S.plant(s * (w / 2 - 1), d / 2 - 1); }
  S.box(13, 0.4, 2, 2, 0.8, 5, 0xffffff, 'wood'); // dining table
  S.floor(-13, 6, 12, 10, 'carpet');
  const rooms = backRooms(S, -2, [-w / 2 + 14, w / 2 - 14], ['manager', 'office', 'storage'], { frontGaps: [[0, 3]], officeLock: true });
  rooms[0].kind = 'study';
  S.spec.safes.push({ x: S.X(rooms[0].x0 + 0.8), z: S.Z(rooms[0].z0 + 0.6), small: 15000, bag: 'money', main: true });
  S.spec.paintings.push({ x: S.X(0), z: S.Z(-d / 2 + 0.3), y: 2.2, ry: 0, real: true });
  S.spec.paintings.push({ x: S.X(-w / 2 + 0.3), z: S.Z(8), y: 2.2, ry: Math.PI / 2, real: true });
  S.spec.lootRoom = { x: S.X(rooms[1].cx), z: S.Z(rooms[1].cz) };
  S.civ(0, 4, 'civ'); S.civ(-12, 6, 'civ'); S.civ(rooms[0].cx, rooms[0].cz, 'manager', { keycard: true });
  S.guard([[-w / 2 + 2, d / 2 - 2], [w / 2 - 2, d / 2 - 2], [w / 2 - 2, 0], [-w / 2 + 2, 0]]);
  S.guard([[-w / 2 + 3, -2], [w / 2 - 3, -2]]);
  S.guard([[-w / 2 - 3, d / 2 + 3], [-w / 2 - 3, -d / 2 - 3], [w / 2 + 3, -d / 2 - 3], [w / 2 + 3, d / 2 + 3]]);
  S.cam(0, d / 2 - 0.6, Math.PI, 4.6); S.cam(0, -3.2, Math.PI, 4.6);
  frontVan(S);
};
T.casino = S => {
  const w = S.w, d = S.d;
  S.shell([[0, 4], [-8, 2.4], [8, 2.4]], 7, { sign: S.heist.name, signColor: 0xffd040, extColor: 0x3a1a2a });
  S.floor(0, 4, w - 0.4, d - 8, 'carpet');
  // slot machines and tables
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) S.box(s * (w / 2 - 2), 0.8, d / 2 - 4 - i * 2.2, 0.9, 1.6, 0.9, 0xd04040, 'plain');
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { S.box(s * (6 + i * 4), 0.45, 3, 2.4, 0.9, 1.4, 0x1a6a3a, 'plain'); S.civ(s * (6 + i * 4), 4.4, 'civ'); }
  S.box(0, 0.55, -3, 10, 1.1, 1, 0xffffff, 'wood'); // cashier cage counter
  S.civ(0, -4.5, 'clerk');
  for (let i = 0; i < 4; i++) S.small(-4 + i * 2.6, -3, 1500, 'register', 1.15);
  const zc = -d / 2 + 12;
  const rooms = backRooms(S, zc, [-w / 2 + 12, -w / 2 + 22, w / 2 - 20], ['manager', 'security', 'office', 'vault'], { frontGaps: [[w / 4, 2]] });
  S.door(w / 4, zc + 1.3, 'x', 'card', 2);
  const v = rooms[3];
  S.spec.vaults.push({ doorX: S.X(v.doorX), doorZ: S.Z(v.z1), loot: v.lootAt, timelock: 70, cards: 2 });
  S.spec.vaultLoot = { x: S.X(v.cx), z: S.Z(v.cz) };
  S.spec.readers.push({ x: S.X(v.doorX - 1.6), z: S.Z(v.z1 + 0.15), y: 1.3, target: 'vault' }, { x: S.X(v.doorX + 1.6), z: S.Z(v.z1 + 0.15), y: 1.3, target: 'vault' });
  S.civ(rooms[0].cx, rooms[0].cz, 'manager', { keycard: true }); S.civ(rooms[2].cx, rooms[2].cz, 'manager', { keycard: true });
  lobbyCivs(S, 8, { x0: -w / 2 + 4, x1: w / 2 - 4, z0: 5, z1: d / 2 - 3 });
  for (let i = 0; i < 4; i++) S.guard([[-w / 2 + 5 + i * 14, d / 2 - 3], [-w / 2 + 5 + i * 14, 0]]);
  S.guard([[-w / 2 + 3, zc], [w / 2 - 3, zc]]); S.guard([[rooms[1].cx, rooms[1].cz]]);
  S.cam(-w / 2 + 0.6, d / 2 - 0.6, -Math.PI * 0.75, 6); S.cam(w / 2 - 0.6, d / 2 - 0.6, Math.PI * 0.75, 6); S.cam(0, zc - 1.2, Math.PI, 4); S.cam(v.cx, v.z0 + 0.6, 0, 4);
  frontVan(S);
};
T.lab = S => {
  const w = S.w, d = S.d;
  S.shell([[0, 2.4]], 4.5, { sign: 'Helix Labs', signColor: 0x30e0ff, extColor: 0xe8f0f4 });
  S.floor(0, 0, w - 0.4, d - 0.4, 'tile', 0xe8f0f0);
  const zc = -d / 2 + 11;
  // reception
  S.box(0, 0.55, d / 2 - 6, 6, 1.1, 1, 0xffffff, 'plain'); S.civ(0, d / 2 - 7, 'clerk');
  S.wallX(d / 2 - 9, -w / 2, w / 2, [[0, 2]], 'int', 4.5); S.door(0, d / 2 - 9, 'x', 'card', 2);
  // labs with benches
  for (let i = 0; i < 3; i++) { S.box(-w / 2 + 6 + i * 12, 0.5, 3, 6, 1, 1.4, 0xd8e0e8, 'metal'); S.civ(-w / 2 + 6 + i * 12, 4.4, 'scientist'); }
  const rooms = backRooms(S, zc, [-w / 2 + 12, 0, w / 2 - 12], ['security', 'server', 'server', 'vault'], { frontGaps: [[-w / 4, 2], [w / 4, 2]] });
  rooms[3].kind = 'rnd';
  S.spec.rnd = { x: S.X(rooms[3].cx), z: S.Z(rooms[3].cz) };
  S.spec.vaults.push({ doorX: S.X(rooms[3].doorX), doorZ: S.Z(rooms[3].z1), loot: rooms[3].lootAt, timelock: 40 });
  S.spec.readers.push({ x: S.X(rooms[3].doorX + 1.6), z: S.Z(rooms[3].z1 + 0.15), y: 1.3, target: 'vault' });
  S.civ(-w / 2 + 4, d / 2 - 4, 'manager', { keycard: true });
  S.guard([[-w / 2 + 3, 0], [w / 2 - 3, 0]]); S.guard([[-w / 2 + 3, zc], [w / 2 - 3, zc]]); S.guard([[rooms[0].cx, rooms[0].cz]]); S.guard([[-6, d / 2 - 3], [6, d / 2 - 3]]);
  S.cam(-w / 2 + 0.6, d / 2 - 9.6, -Math.PI * 0.75); S.cam(w / 2 - 0.6, 1, Math.PI * 0.6); S.cam(0, zc - 1.2, Math.PI);
  frontVan(S);
};
T.reserve = S => {
  const w = S.w, d = S.d;
  S.shell([[0, 4]], 9, { sign: 'FEDERAL RESERVE', signColor: 0xe8e8e8, extColor: 0xe8e4dc });
  S.floor(0, 0, w - 0.4, d - 0.4, 'marble');
  // colonnade and grand hall
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const c = S.box(s * 8, 4.5, d / 2 - 4 - i * 5, 1.2, 9, 1.2, 0xf0ece4, 'plain'); }
  const zc = -d / 2 + 14;
  for (let i = 0; i < 3; i++) S.desk(-w / 2 + 6, d / 2 - 6 - i * 6, 1);
  for (let i = 0; i < 3; i++) S.civ(-w / 2 + 7.5, d / 2 - 6 - i * 6, 'clerk');
  const rooms = backRooms(S, zc, [-w / 2 + 12, -w / 2 + 22, w / 2 - 24], ['manager', 'security', 'office', 'vault'], { frontGaps: [[0, 3]] });
  S.door(0, zc + 1.3, 'x', 'card', 3);
  const v = rooms[3];
  S.spec.vaults.push({ doorX: S.X(v.doorX), doorZ: S.Z(v.z1), loot: v.lootAt, timelock: 90, cards: 1 });
  S.spec.vaultLoot = { x: S.X(v.cx), z: S.Z(v.cz) };
  S.spec.readers.push({ x: S.X(v.doorX + 1.6), z: S.Z(v.z1 + 0.15), y: 1.3, target: 'vault' });
  S.civ(rooms[0].cx, rooms[0].cz, 'manager', { keycard: true });
  lobbyCivs(S, 8, { x0: -6, x1: 6, z0: 0, z1: d / 2 - 3 });
  for (let i = 0; i < 4; i++) S.guard([[-w / 2 + 4 + i * 16, d / 2 - 3], [-w / 2 + 4 + i * 16, zc + 3]]);
  S.guard([[-w / 2 + 3, zc], [w / 2 - 3, zc]]); S.guard([[rooms[1].cx, rooms[1].cz]]);
  S.guard([[-w / 2 - 3, d / 2 + 3], [w / 2 + 3, d / 2 + 3]]);
  S.cam(-w / 2 + 0.6, d / 2 - 0.6, -Math.PI * 0.75, 8); S.cam(w / 2 - 0.6, d / 2 - 0.6, Math.PI * 0.75, 8); S.cam(0, zc - 1.2, Math.PI, 4); S.cam(v.cx, v.z0 + 0.6, 0, 4);
  frontVan(S);
};
T.mall = S => {
  const w = S.w, d = S.d;
  S.shell([[0, 6], [-20, 4], [20, 4]], 8, { sign: 'Bayside Mall', signColor: 0xff7ae0, extColor: 0xf0e0e8 });
  S.floor(0, 0, w - 0.4, d - 0.4, 'tile');
  // shop fronts along both sides with breakable merchandise
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
    const x = -w / 2 + 5 + i * 10, z = s * (d / 2 - 6);
    S.wallZ(x - 5, s < 0 ? -d / 2 : d / 2 - 12, s < 0 ? -d / 2 + 12 : d / 2, [], 'int', 4);
    for (let k = 0; k < 3; k++) S.spec.destroy.push({ x: S.X(x - 2 + k * 2), z: S.Z(z), y: 0.6, value: 900 + Math.floor(S.rng() * 1800), color: H.pick([0xe86a8a, 0x4ac0d0, 0xf0c040, 0x7ad070, 0xa070e0]) });
    S.spec.glass.push({ x: S.X(x), y: 1.6, z: S.Z(s * (d / 2 - 12)), sx: 8, sy: 3.2, sz: 0.1, value: 600 });
  }
  for (let i = 0; i < 5; i++) { S.plant(-w / 2 + 8 + i * 11, 0); S.box(-w / 2 + 11 + i * 11, 0.25, 0, 2, 0.5, 0.6, 0x6a4a2a); }
  lobbyCivs(S, 16, { x0: -w / 2 + 3, x1: w / 2 - 3, z0: -4, z1: 4 });
  S.guard([[-w / 2 + 3, 0], [w / 2 - 3, 0]]);
  frontVan(S);
};
T.methlab = S => {
  const w = S.w, d = S.d;
  S.shell([[0, 1.6]], 3.6, { extColor: 0x9a8a70 });
  S.floor(0, 0, w - 0.4, d - 0.4, 'wood', 0x9a8a7a);
  S.wallX(0, -w / 2, w / 2, [[-6, 1.4], [6, 1.4]], 'int', 3.6); S.wallZ(0, -d / 2, 0, [[-5, 1.4]], 'int', 3.6);
  S.box(0, 0.5, 4, 4, 1, 1.4, 0xb0b0b0, 'metal'); // cooking station
  S.spec.cookAt = { x: S.X(0), z: S.Z(4.9) };
  const ing = ['Muriatic Acid', 'Caustic Soda', 'Hydrogen Chloride'];
  ing.forEach((n, i) => { const x = -w / 2 + 3 + i * 4, z = -d / 2 + 2; S.box(x, 0.5, z, 1.4, 1, 1, 0x5a4a3a, 'wood'); S.spec.ingredients.push({ x: S.X(x), z: S.Z(z + 0.8), name: n }); });
  for (let i = 0; i < 4; i++) S.box(w / 2 - 2, 0.4, -d / 2 + 2 + i * 2, 1.2, 0.8, 1.2, 0x3a5a3a, 'plain');
  frontVan(S);
};
T.truck = S => {
  // a street-side lot with a stalled armored truck and parked cars
  const w = S.w, d = S.d;
  S.floor(0, 0, w, d, 'concrete', 0x9a9a9a);
  S.spec.armoredTruck = { x: S.X(0), z: S.Z(0), ry: 0 };
  S.spec.c4 = [{ x: S.X(0), z: S.Z(3.6), y: 1.4 }, { x: S.X(-0.9), z: S.Z(3.6), y: 0.9 }, { x: S.X(0.9), z: S.Z(3.6), y: 0.9 }];
  S.spec.vaultLoot = { x: S.X(0), z: S.Z(0) };
  S.spec.parked = [{ x: S.X(-10), z: S.Z(-8), ry: 0 }, { x: S.X(10), z: S.Z(-6), ry: 0.3 }, { x: S.X(-12), z: S.Z(8), ry: 0 }];
  S.guard([[-3, 5], [3, 5]]); S.guard([[-3, -5], [3, -5]]);
  frontVan(S);
};
T.yard = S => {
  const w = S.w, d = S.d;
  S.floor(0, 0, w, d, 'concrete', 0x8a8478);
  // fence
  S.wallX(d / 2, -w / 2, w / 2, [[0, 6]], 'int', 2.5, 0x7a7a7a); S.wallX(-d / 2, -w / 2, w / 2, [], 'int', 2.5, 0x7a7a7a);
  S.wallZ(-w / 2, -d / 2, d / 2, [], 'int', 2.5, 0x7a7a7a); S.wallZ(w / 2, -d / 2, d / 2, [], 'int', 2.5, 0x7a7a7a);
  // rails and cargo cars
  for (let r = 0; r < 3; r++) {
    const z = -d / 2 + 8 + r * 12;
    S.box(0, 0.06, z, w - 2, 0.12, 2.2, 0x5a4a3a, 'wood', false);
    for (let c = 0; c < 3; c++) {
      const x = -w / 2 + 12 + c * 19;
      S.box(x, 2.2, z, 14, 3.4, 3, H.pick([0x8a3a2a, 0x2a4a6a, 0x4a5a3a, 0x7a6a3a]), 'metal');
      S.spec.crates.push({ x: S.X(x), z: S.Z(z + 1.7), y: 1.4, container: true });
    }
  }
  S.box(w / 2 - 6, 1.6, d / 2 - 5, 8, 3.2, 6, 0xd8d0c0, 'plain'); // yard office
  S.spec.computers.push({ x: S.X(w / 2 - 6), z: S.Z(d / 2 - 1.8), kind: 'manifest', label: 'Yard manifest' });
  for (let i = 0; i < 5; i++) S.guard([[-w / 2 + 4 + i * 13, d / 2 - 3], [-w / 2 + 4 + i * 13, -d / 2 + 3]]);
  S.cam(-w / 2 + 1, d / 2 - 1, -Math.PI * 0.75, 3); S.cam(w / 2 - 1, -d / 2 + 1, Math.PI * 0.25, 3);
  frontVan(S);
};
T.office = S => {
  const w = S.w, d = S.d;
  S.shell([[0, 3], [-12, 6, 3.4], [12, 6, 3.4]], 4.5, { sign: S.heist.id === 'servers' ? 'Campaign HQ' : 'Sterling Capital', signColor: 0x7ab0ff, extColor: 0xc8d4e0 });
  for (const gx of [-12, 12]) S.spec.glass.push({ x: S.X(gx), y: 1.7, z: S.Z(d / 2), sx: 6, sy: 3.4, sz: 0.1 });
  S.floor(0, 0, w - 0.4, d - 0.4, 'carpet', 0x8a9ab0);
  // cubicles
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { const x = -w / 2 + 5 + c * 8, z = 2 + r * 5; S.box(x, 0.65, z - 1.1, 3.4, 1.3, 0.08, 0x8a8a8a, 'plain'); S.desk(x, z); S.civ(x, z + 1, 'worker'); }
  const zc = -d / 2 + 10;
  const rooms = backRooms(S, zc, [-w / 2 + 11, -w / 2 + 20, w / 2 - 13], ['manager', 'security', 'server', 'vault'], { frontGaps: [[0, 2]], officeLock: true });
  const v = rooms[3];
  S.spec.vaults.push({ doorX: S.X(v.doorX), doorZ: S.Z(v.z1), loot: v.lootAt, timelock: 45 });
  S.spec.vaultLoot = { x: S.X(v.cx), z: S.Z(v.cz) };
  S.spec.readers.push({ x: S.X(v.doorX + 1.6), z: S.Z(v.z1 + 0.15), y: 1.3, target: 'vault' });
  S.civ(rooms[0].cx, rooms[0].cz, 'manager', { keycard: true });
  S.guard([[-w / 2 + 3, d / 2 - 3], [w / 2 - 3, d / 2 - 3], [w / 2 - 3, zc + 3], [-w / 2 + 3, zc + 3]]); S.guard([[-w / 2 + 3, zc], [w / 2 - 3, zc]]); S.guard([[rooms[1].cx, rooms[1].cz]]);
  S.cam(-w / 2 + 0.6, d / 2 - 0.6, -Math.PI * 0.75); S.cam(w / 2 - 0.6, d / 2 - 0.6, Math.PI * 0.75); S.cam(0, zc - 1.2, Math.PI);
  frontVan(S);
};
T.shop = S => {
  const w = S.w, d = S.d;
  S.shell([[0, 2], [-5, 4, 3], [5, 4, 3]], 4, { sign: S.heist.id === 'pawn' ? 'Cash 4 Gold' : '24/7', signColor: 0x40ff90 });
  for (const gx of [-5, 5]) S.spec.glass.push({ x: S.X(gx), y: 1.5, z: S.Z(d / 2), sx: 4, sy: 3, sz: 0.1 });
  S.floor(0, 0, w - 0.4, d - 0.4, 'tile');
  for (let i = 0; i < 3; i++) S.shelf(-3 + i * 3, 1, 5, true, 0xd8d8d8);
  S.box(w / 2 - 3, 0.55, d / 2 - 3, 3, 1.1, 0.8, 0xffffff, 'wood'); S.small(w / 2 - 3, d / 2 - 3, 2500, 'register', 1.15); S.civ(w / 2 - 3, d / 2 - 4.2, 'clerk');
  S.wallX(-d / 2 + 4, -w / 2, w / 2, [[w / 2 - 2, 1.2]], 'int', 4); S.door(w / 2 - 2, -d / 2 + 4, 'x', 'pick', 1.2);
  S.spec.safes.push({ x: S.X(0), z: S.Z(-d / 2 + 1), small: 6000, bag: Object.keys(S.heist.loot)[0], main: true });
  for (const c of S.heist.loot.jewelry ? [0, 1, 2] : []) { S.box(-w / 2 + 2, 0.45, -2 + c * 2.4, 0.8, 0.9, 1.6, 0xf0f0f0); S.spec.cases.push({ x: S.X(-w / 2 + 2), z: S.Z(-2 + c * 2.4), y: 1.1, value: 1200 }); }
  lobbyCivs(S, 2, { x0: -w / 2 + 2, x1: w / 2 - 2, z0: -2, z1: d / 2 - 2 });
  if (S.heist.stealth) S.guard([[-w / 2 + 2, d / 2 - 2], [w / 2 - 2, -1]]);
  S.cam(-w / 2 + 0.6, d / 2 - 0.6, -Math.PI * 0.75, 3.4);
  frontVan(S);
};

H.buildSites = function () {
  for (const h of H.HEISTS) {
    const lot = H.city.heistLots[h.id];
    const S = new Site(h, lot);
    T[h.tpl](S);
    for (const k in S.floorB) if (S.floorB[k].pos.length) S.group.add(S.floorB[k].build(false));
    for (const b of [S.wallB, S.extB, S.plainB, S.metalB, S.woodB]) if (b.pos.length) S.group.add(b.build(true));
    // dance floor gets its own emissive tile grid
    if (S.spec.danceFloor) {
      const df = S.spec.danceFloor, g = new THREE.Group();
      for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) { const m = new THREE.Mesh(H.geo.box(1.9, 0.05, 1.9), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xff2aa0, emissiveIntensity: 0.5 })); m.position.set(df.x - df.w / 2 + 1 + i * 2, 0.22, df.z - df.d / 2 + 1 + j * 2); g.add(m); }
      S.group.add(g); S.danceTiles = g.children;
    }
    // glass panes (dynamic, breakable)
    H.sites[h.id] = S;
  }
};
