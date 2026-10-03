// ============================================================================
// Solo counter-terror missions: clear every hostile from a structure without
// hitting the hostages. Eight multi-level sites (cargo ship, oil platform, embassy,
// dockside warehouse, night train, hotel, hijacked airliner, desert compound) at four times of day.
// Hostiles are sentries that hold their posts, scan their sector, react to
// gunfire and never respawn.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const surf = (k, r) => G.surf(k, r);
const { gCylY, gBox } = G.geo;

G.TOD = {
  dawn: { n: 'Dawn', env: 'dawn', d: 'Low pink light, long shadows.' },
  day: { n: 'Midday', env: 'sunny', d: 'Full daylight.' },
  dusk: { n: 'Dusk', env: 'dusk', d: 'Orange sun, deep shade.' },
  night: { n: 'Night', env: 'night', d: 'Dark — bring night vision and an IR laser.' },
};
G.ENV.dawn = { sky: ['#34466a', '#e6a08a', '#6a5a52'], fog: ['#b89484', 40, 220], sun: [.9, .16, -.35, '#ffb088', 1.5], hemi: ['#b4a4bc', '#4a4038', .6], exp: 1.05 };

// ------------------------------------------------------------------ building helpers
const H = {
  // floor slab whose top surface is at y
  slab(W, x, y, z, w, d, m = 'metal', th = .3) { return W.box(x, y - th, z, w, th, d, typeof m === 'string' ? surf(m, Math.max(1, Math.round(Math.max(w, d) / 4))) : m, 'metal'); },
  // straight flight of stairs along z (dir = +1 / -1) or x; returns the far end coordinate
  stairs(W, x, z, y0, y1, dir = 1, width = 1.2, axis = 'z', m = 'darkmetal') {
    const n = Math.ceil((y1 - y0) / .28), rise = (y1 - y0) / n, run = .62, mm = surf(m, 1);
    for (let i = 0; i < n; i++) { const c = (i + .5) * run * dir; const top = y0 + rise * (i + 1);
      if (axis === 'z') W.box(x, top - .2, z + c, width, .2, run, mm, 'metal'); else W.box(x + c, top - .2, z, run, .2, width, mm, 'metal');
      if (axis === 'z') W.addCol(V3(x - width / 2, y0, z + c - run / 2), V3(x + width / 2, top, z + c + run / 2), 'metal', { noShoot: true }); else W.addCol(V3(x + c - run / 2, y0, z - width / 2), V3(x + c + run / 2, top, z + width / 2), 'metal', { noShoot: true });
    }
    return (axis === 'z' ? z : x) + n * run * dir;
  },
  // guard rail: thin visible rail + a taller invisible collider so nobody walks off the edge
  rail(W, x1, z1, x2, z2, y, m = 'yellow') {
    const horiz = Math.abs(z2 - z1) < .01, len = horiz ? Math.abs(x2 - x1) : Math.abs(z2 - z1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, mm = surf(m, 1);
    const w = horiz ? len : .06, d = horiz ? .06 : len;
    W.box(cx, y + 1, cz, w, .06, d, mm, 'metal', { noCol: true }); W.box(cx, y + .5, cz, w, .05, d, mm, 'metal', { noCol: true });
    for (let t = 0; t <= len; t += 2) W.box(horiz ? Math.min(x1, x2) + t : x1, y, horiz ? z1 : Math.min(z1, z2) + t, .06, 1, .06, mm, 'metal', { noCol: true });
    W.addCol(V3(cx - w / 2 - .05, y, cz - d / 2 - .05), V3(cx + w / 2 + .05, y + 1.05, cz + d / 2 + .05), 'metal', { see: true, soft: true });
  },
  // room with walls, door/window openings (o.doors = {n:[t..], s, e, w}), roof slab
  room(W, x, z, w, d, h, y, o = {}) {
    const m = surf(o.mat || 'white', 2), mat = o.surf || 'metal', th = o.th || .2;
    const op = s => [...(o.doors && o.doors[s] || []).map(t => ({ t, w: 1.2, y0: 0, y1: 2.2 })), ...(o.win && o.win[s] || []).map(t => ({ t, w: 1.3, y0: 1.05, y1: 2.05 }))];
    W.wall(x - w / 2, z - d / 2, x + w / 2, z - d / 2, h, th, m, mat, op('n'), y);
    W.wall(x - w / 2, z + d / 2, x + w / 2, z + d / 2, h, th, m, mat, op('s'), y);
    W.wall(x - w / 2, z - d / 2, x - w / 2, z + d / 2, h, th, m, mat, op('w'), y);
    W.wall(x + w / 2, z - d / 2, x + w / 2, z + d / 2, h, th, m, mat, op('e'), y);
    if (o.roof !== false) H.slab(W, x, y + h + .25, z, w + .3, d + .3, o.roofMat || 'metal', .25);
  },
  light(W, x, y, z, col = '#ffd8a0', i = 1.4, r = 22) { const l = new THREE.PointLight(G.col(col), i, r, 2); l.position.set(x, y, z); W.group.add(l); const b = new THREE.Mesh(gBox(.3, .12, .3), G.mat({ color: col, emissive: col, emissiveIntensity: 2 })); b.position.set(x, y + .1, z); W.static.add(b); },
  water(W, y = 0) { // open sea: dark wind-rippled water to the horizon (no land hills)
    if (!G._seaTex) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#16323c'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,20,30'},${Math.random() * .08})`; x.fillRect(Math.random() * 128, Math.random() * 128, 6 + Math.random() * 10, 1); } G._seaTex = new THREE.CanvasTexture(c); G._seaTex.wrapS = G._seaTex.wrapT = THREE.RepeatWrapping; G._seaTex.repeat.set(120, 120); G._seaTex.encoding = THREE.sRGBEncoding; }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), G.mat({ map: G._seaTex, color: '#ffffff', roughness: .38, metalness: .05 })); m.rotation.x = -PI / 2; m.position.y = y + .02; m.receiveShadow = true; W.group.add(m);
    if (G.E.hills) G.E.hills.visible = false; if (G.E.ground) G.E.ground.visible = false;
  },
};
G.MissionHelpers = H;

// ------------------------------------------------------------------ outskirts: the wider area around each structure
// Themed clusters of cover on a grid of cells around the core, each possibly manned by a sentry. Posts are only kept
// where there is real floor and no geometry at body height. o: { style, base, bounds, regions, avoid, start, max, seed }
function freeSpot(W, x, y, z, r = .45) {
  const gy = W.groundAt(x, z, y + .45, .15); if (Math.abs(gy - y) > .15) return false;
  for (const c of W.near(x - r - 1, z - r - 1, x + r + 1, z + r + 1)) { if (c.soft || c.noMove) continue; if (c.max.x > x - r && c.min.x < x + r && c.max.z > z - r && c.min.z < z + r && c.max.y > y + .2 && c.min.y < y + 1.7) return false; }
  return true;
}
const CLUSTERS = {
  dock: ['containers', 'containers', 'shed', 'crates', 'crane', 'nest', 'forklift'],
  urban: ['building', 'building', 'cars', 'barricade', 'kiosk', 'nest', 'dumpsters'],
  desert: ['adobe', 'adobe', 'wall', 'technical', 'nest', 'palms', 'rocks'],
  airport: ['hangarette', 'carts', 'containers', 'fuel', 'nest', 'crates'],
  yard: ['wagons', 'wagons', 'hut', 'containers', 'crates', 'nest'],
  rig: ['module', 'tanks', 'piperack', 'crates', 'module'],
};
H.outskirts = function (W, M, o) {
  const R = G.rng(o.seed || M.id.length * 131 + 7), b = o.base || 0, posts = [], cell = o.cell || 13;
  if (o.bounds) W.bounds = o.bounds;
  const inside = (x, z, r, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
  const st = o.start || M.player.pos.filter((v, i) => i !== 1);
  const face = (x, z) => Math.atan2(-(st[0] - x), -(st[1] - z)) + (R() - .5) * 1.2;
  const add = (x, z, crouch) => { if (freeSpot(W, x, b, z)) { posts.push([+x.toFixed(2), b, +z.toFixed(2), face(x, z), crouch ? 1 : 0]); return true; } return false; };
  const ground = b === 0;
  const box = (x, z, w, h, d, m, mat = 'metal', y = 0, opt = {}) => W.box(x, b + y, z, w, h, d, surf(m, Math.max(1, Math.round(Math.max(w, d) / 4))), mat, opt);
  const nest = (x, z, ry) => { const c = Math.cos(ry), sn = Math.sin(ry); box(x - sn * 1.3, z - c * 1.3, Math.abs(c) * 2.6 + .7, 1.1, Math.abs(sn) * 2.6 + .7, 'sandbag', 'sandbag'); return [[x, z, 1]]; };
  const kinds = {
    containers: (x, z, ry) => { const n = 1 + Math.floor(R() * 3), cols = ['container_r', 'container_b', 'container_g']; for (let i = 0; i < n; i++) W.container(x, z, ry, cols[Math.floor(R() * 3)], b + i * 2.59); if (R() < .6) W.container(x + (ry ? 0 : 3.2), z + (ry ? 3.2 : 0), ry, cols[Math.floor(R() * 3)], b); return [[x + (ry ? 4.6 : 0), z + (ry ? 0 : 4.6)], [x - (ry ? 4.6 : 0), z - (ry ? 0 : 4.6)]]; },
    shed: (x, z, ry) => { H.room(W, x, z, 7, 5, 3, b, { mat: 'corrugated', doors: { s: [.5] }, win: { n: [.5] } }); return [[x, z], [x + 2, z + 4]]; },
    crates: (x, z) => { for (let i = 0; i < 4; i++) W.crate(x + (i % 2) * 1.3 - .6, z + Math.floor(i / 2) * 1.3 - .6, 1.2, b); if (R() < .5) W.crate(x, z, 1.2, b + 1.2); return [[x + 2.4, z], [x, z + 2.4]]; },
    crane: (x, z) => { box(x - 3, z, 1, 14, 1, 'yellow'); box(x + 3, z, 1, 14, 1, 'yellow'); box(x, z, 8, 1, 1.4, 'yellow', 'metal', 13.5, { noCol: true }); return [[x, z + 2]]; },
    nest: (x, z, ry) => nest(x, z, ry),
    forklift: (x, z, ry) => { if (ground) W.vehicle(x, z, ry, 'forklift'); else W.crate(x, z, 1.2, b); return [[x + 2.5, z + 1]]; },
    building: (x, z, ry) => { const w = 9 + Math.floor(R() * 4), d = 7 + Math.floor(R() * 3), m = ['brick', 'plaster', 'redbrick', 'concrete'][Math.floor(R() * 4)]; H.room(W, x, z, w, d, 3.4, b, { mat: m, doors: { s: [.3], n: [.7] }, win: { s: [.75], e: [.5], w: [.5], n: [.25] } }); return [[x, z], [x - w / 4, z + d / 2 + 1.6]]; },
    cars: (x, z, ry) => { W.vehicle(x, z, ry + (R() - .5) * .4, R() < .3 ? 'burnt' : 'car'); W.vehicle(x + 4, z + 2, ry + 1.4, R() < .5 ? 'car' : 'trabant'); return [[x - 2, z + 3.2], [x + 6.5, z]]; },
    barricade: (x, z, ry) => { box(x, z, ry ? 1 : 7, 1.1, ry ? 7 : 1, 'concrete', 'concrete'); W.barrel(x + 2, z + 2, b); return [[x + (ry ? -1.3 : 0), z + (ry ? 0 : -1.3), 1]]; },
    kiosk: (x, z) => { H.room(W, x, z, 4, 4, 2.8, b, { mat: 'white', doors: { s: [.5] }, win: { e: [.5], w: [.5] } }); return [[x, z]]; },
    dumpsters: (x, z) => { box(x, z, 2, 1.4, 1.2, 'olive'); box(x + 2.6, z, 2, 1.4, 1.2, 'rust'); return [[x + 1.3, z + 1.8, 1]]; },
    adobe: (x, z) => { const w = 7 + Math.floor(R() * 3), d = 6 + Math.floor(R() * 3); H.room(W, x, z, w, d, 3, b, { mat: 'adobe', doors: { s: [.5], e: [.5] }, win: { n: [.5], w: [.5] } }); return [[x, z], [x + w / 2 + 1.6, z]]; },
    wall: (x, z, ry) => { box(x, z, ry ? .5 : 9, 2.2, ry ? 9 : .5, 'adobe', 'stone'); return [[x + (ry ? 1.2 : 0), z + (ry ? 0 : 1.2)], [x - (ry ? 1.2 : 0), z - (ry ? 0 : 1.2)]]; },
    technical: (x, z, ry) => { if (ground) W.vehicle(x, z, ry, 'truck'); return [[x + 3, z + 1]]; },
    palms: (x, z) => { if (ground) { W.tree(x, z, 7, 'palm'); W.tree(x + 3, z + 2, 6, 'palm'); } box(x + 1.5, z - 2, 4, .9, .8, 'sandbag', 'sandbag'); return [[x + 1.5, z - 3.2, 1]]; },
    rocks: (x, z) => { box(x, z, 3, 1.6, 2.4, 'stone', 'stone'); box(x + 2.4, z + 1, 2, 1.1, 2, 'stone', 'stone'); return [[x - 2.2, z, 1]]; },
    hangarette: (x, z) => { H.room(W, x, z, 12, 9, 5, b, { mat: 'corrugated', doors: { s: [.3, .7] }, win: { n: [.5] } }); W.crate(x - 3, z - 2, 1.2, b); return [[x, z], [x + 3, z + 6]]; },
    carts: (x, z) => { for (let i = 0; i < 4; i++) box(x + i * 2.6 - 4, z, 2, 1.1, 1.4, 'car2'); return [[x, z + 2]]; },
    fuel: (x, z, ry) => { if (ground) W.vehicle(x, z, ry, 'truck'); box(x + 4, z, 2.2, 2.2, 2.2, 'white'); return [[x + 4, z + 2.6]]; },
    wagons: (x, z) => { for (const dx of [-1.6, 1.6]) { box(x + dx, z, 2.9, 3.2, 12.5, R() < .5 ? 'rust' : 'container_b', 'metal', .9); box(x + dx, z, 2.5, .9, 11, 'darkmetal', 'metal', 0, { noCol: true }); } return [[x + 3.8, z - 3], [x - 3.8, z + 3]]; },
    hut: (x, z) => { H.room(W, x, z, 4, 4, 3, b, { mat: 'redbrick', doors: { s: [.5] }, win: { e: [.5], n: [.5] } }); return [[x, z]]; },
    module: (x, z) => { H.room(W, x, z, 8, 6, 3.2, b, { mat: 'white', doors: { w: [.5], e: [.5] }, win: { n: [.5] } }); return [[x, z], [x, z + 4.2]]; },
    tanks: (x, z) => { box(x, z, 3, 4, 3, 'white'); box(x + 3.6, z, 3, 4, 3, 'white'); return [[x + 1.8, z + 2.6]]; },
    piperack: (x, z, ry) => { box(x, z, ry ? 1.4 : 9, 1.6, ry ? 9 : 1.4, 'darkmetal'); return [[x + (ry ? 1.4 : 0), z + (ry ? 0 : 1.4), 1]]; },
  };
  const list = CLUSTERS[o.style] || CLUSTERS.urban, cand = [];
  for (const reg of o.regions) for (let x = reg[0] + cell / 2; x < reg[2]; x += cell) for (let z = reg[1] + cell / 2; z < reg[3]; z += cell) {
    if ((o.avoid || []).some(a => inside(x, z, a, 5))) continue;
    if (Math.hypot(x - st[0], z - st[1]) < 10) continue;
    cand.push([x + (R() - .5) * cell * .35, z + (R() - .5) * cell * .35]);
  }
  let manned = 0, lit = 0;
  for (const [x, z] of cand) {
    const fall = o.falloff ? Math.max(.28, Math.min(1, o.falloff / Math.max(1, Math.hypot(x, z)))) : 1; // sparser far from the structure
    if (R() > (o.density || .72) * fall) continue;
    const kind = list[Math.floor(R() * list.length)], ry = R() < .5 ? 0 : PI / 2;
    const spots = kinds[kind](x, z, ry) || [];
    if (manned < (o.max || 10) && R() < (o.guardP || .5)) for (const sp of spots.sort(() => R() - .5)) if (add(sp[0], sp[1], sp[2])) { manned++; break; }
    if (lit++ % 2 === 0) { const lm = new THREE.Mesh(gBox(.25, .12, .25), G.mat({ color: '#ffd9a0', emissive: '#ffd9a0', emissiveIntensity: 2 })); lm.position.set(x, b + 3.4, z); W.static.add(lm); W.box(x, b, z, .12, 3.4, .12, surf('darkmetal', 1), 'metal', { noCol: true }); } // lamp post (emissive only: no extra light cost)
  }
  return posts;
};

// ------------------------------------------------------------------ missions
// guards: [x, y(floor), z, yaw, crouch?]; hostages: [x, y, z, yaw]
G.MISSIONS = [
  { id: 'ship', name: 'MV Ardent Star', loc: 'Cargo ship, Gulf of Aden', blurb: 'Pirates-turned-terrorists hold a container ship and its crew. Board at the bow, fight aft through the container stacks and take the bridge.',
    ground: 'mud', sea: true, weather: { night: 'rain' }, amb: 'wind', reverb: 'industrial',
    out: { style: 'dock', base: 2.3, bounds: 80, regions: [[13, -74, 76, 74]], avoid: [[12, -5, 27, 5]], start: [66, 66], max: 11 },
    player: { pos: [66, 2.3, 66], yaw: PI / 4 },
    build(W) {
      W.bounds = 62; H.water(W);
      const hull = surf('red', 1), deckM = surf('metal', 12), white = surf('white', 2);
      W.box(0, 0, 0, 18, 5.7, 90, hull, 'metal'); H.slab(W, 0, 6, 0, 18, 90, deckM);
      W.box(0, 0, -47.5, 12, 7.7, 5, hull, 'metal'); W.box(0, 0, 47, 16, 5.7, 4, hull, 'metal'); // bow block, stern
      H.rail(W, -8.95, -44, -8.95, 44, 6, 'white'); H.rail(W, 8.95, -44, 8.95, -1, 6, 'white'); H.rail(W, 8.95, 1, 8.95, 44, 6, 'white');
      // the quay alongside, a gangway up to the main deck
      W.box(45, 0, 0, 68, 2.3, 152, surf('concrete', 20), 'concrete'); H.slab(W, 9.5, 6, 0, 1.6, 1.6, surf('darkmetal', 1)); H.stairs(W, 18.7, 0, 2.3, 6, -1, 1.4, 'x', 'darkmetal');
      H.rail(W, 10.2, -.75, 18.7, -.75, 2.3 + 1.9, 'white'); H.rail(W, 10.2, .75, 18.7, .75, 2.3 + 1.9, 'white');
      for (let z = -70; z <= 70; z += 10) W.box(11.6, 2.3, z, .5, .6, .5, surf('darkmetal', 1), 'metal');
      H.rail(W, -8.9, 44.9, 8.9, 44.9, 6, 'white');
      // forecastle with stairs down to the main deck
      H.slab(W, 0, 8, -41.5, 18, 7, deckM); W.box(0, 6, -38.2, 18, 2, .3, hull, 'metal');
      for (const s of [-1, 1]) H.stairs(W, s * 6.5, -33, 6, 8, -1, 1.4);
      H.rail(W, -8.9, -38.05, -7.3, -38.05, 8, 'white'); H.rail(W, -5.7, -38.05, 5.7, -38.05, 8, 'white'); H.rail(W, 7.3, -38.05, 8.9, -38.05, 8, 'white');
      W.box(0, 8, -43, 1.6, 1, 2, surf('darkmetal'), 'metal'); W.box(-3, 8, -40, 1.2, .8, 1.2, surf('darkmetal'), 'metal'); W.box(3, 8, -40, 1.2, .8, 1.2, surf('darkmetal'), 'metal'); // winches
      // container bays: centre aisle and side walkways stay open
      const cols = ['container_r', 'container_b', 'container_g'], R = G.rng(77);
      for (let z = -26; z <= 17; z += 6.6) for (const x of [-5.3, -2.7, 2.7, 5.3]) { const sniper = (x === 5.3 && Math.abs(z + 6.2) < .1) || (x === -5.3 && Math.abs(z - 7) < .1); const n = sniper ? 2 : 1 + (R() < .6 ? 1 : 0) + (R() < .2 ? 1 : 0); for (let k = 0; k < n; k++) W.container(x, z, 0, cols[Math.floor(R() * 3)], 6 + k * 2.59); }
      // deck crane
      W.box(-7.5, 6, -3.5, 1, 12, 1, surf('yellow'), 'metal'); W.box(-3, 17.4, -3.5, 10, .6, .6, surf('yellow'), 'metal', { noCol: true });
      // superstructure: level A (deck), walkway B (y 9), bridge (y 12)
      H.room(W, 0, 35, 12, 10, 3, 6, { mat: 'white', doors: { n: [.3, .7], s: [.5] }, win: { e: [.3, .7], w: [.3, .7] }, roof: false });
      H.slab(W, 0, 9.2, 35, 17, 12, deckM); // roof of A = walkway around B
      H.stairs(W, -7.6, 21.5, 6, 9.2, 1, 1.2);
      for (const s of [-1, 1]) H.rail(W, s * 8.45, 29.1, s * 8.45, 40.9, 9.2, 'white');
      H.rail(W, -6.9, 29.05, 8.45, 29.05, 9.2, 'white'); H.rail(W, -8.45, 40.95, 8.45, 40.95, 9.2, 'white');
      H.room(W, 0, 36, 10, 6, 2.9, 9.2, { mat: 'white', doors: { n: [.5], e: [.5] }, win: { w: [.5], s: [.3, .7] }, roof: false });
      H.slab(W, 0, 12.35, 36.5, 12, 7, deckM); H.slab(W, 6.6, 12.35, 33.25, 4, 4.5, deckM); // roof of B + landing
      H.stairs(W, 7.6, 40.2, 9.2, 12.35, -1, 1.1);
      H.room(W, 0, 36.5, 11, 5, 2.8, 12.35, { mat: 'white', doors: { e: [.3] }, win: { n: [.2, .4, .6, .8], w: [.5], s: [.5] } }); // bridge
      H.rail(W, -5.95, 33.9, -5.95, 39.1, 12.35, 'white'); H.rail(W, 5.95, 36.6, 5.95, 39.1, 12.35, 'white');
      W.box(0, 12.35, 34.8, 6, 1.1, .8, surf('darkmetal'), 'metal'); // bridge console
      W.box(0, 15.5, 38, 1.4, 5, 1.4, surf('red'), 'metal', { noCol: true }); // funnel
      for (const [x, y, z] of [[0, 11, -20], [0, 11, 5], [0, 8.8, 30], [0, 14.8, 36.5], [0, 10.5, -41]]) H.light(W, x, y, z);
    },
    guards: [[-7.5, 6, -30, PI], [0, 6, -24, PI], [7.5, 6, -15, PI], [0, 6, -4, PI, true], [-7.4, 6, 8, PI], [0, 6, 14, PI, true], [5.3, 11.18, -6.2, PI], [-5.3, 11.18, 7, PI],
      [-3, 6, 32, PI], [3.5, 6, 37, PI], [-7, 9.2, 30.5, PI], [6.5, 9.2, 40, -PI / 2], [-2, 12.35, 37.5, PI], [3.5, 12.35, 38, PI]],
    hostages: [[-3.5, 12.35, 38.3, 0], [2, 6, 38.5, 0], [4, 9.2, 37.5, PI / 2]] },

  { id: 'rig', name: 'Kestrel Alpha', loc: 'Oil platform, North Sea', blurb: 'Insurgents have seized a production platform and wired it for a spill. Fast-rope onto the helideck and clear the rig from top to bottom.',
    ground: 'mud', sea: true, weather: { dawn: 'rain', night: 'rain' }, amb: 'wind', reverb: 'industrial',
    out: { style: 'rig', base: 14, bounds: 92, regions: [[55, -14, 84, 14]], avoid: [[52, -4, 58, 4]], start: [-13, -13], max: 8, cell: 7.5, density: .95, guardP: .85 },
    player: { pos: [-13, 24.2, -13], yaw: -PI * .75 },
    build(W) {
      W.bounds = 40; H.water(W);
      for (const x of [-16, 16]) for (const z of [-16, 16]) { const l = new THREE.Mesh(gCylY(1.3, 1.6, 30, 12), surf('yellow')); l.position.set(x, 0, z); l.castShadow = true; W.static.add(l); W.addCol(V3(x - 1.4, -15, z - 1.4), V3(x + 1.4, 14, z + 1.4), 'metal'); }
      const deck = surf('metal', 10);
      H.slab(W, 0, 14, 0, 40, 40, deck); // main deck
      H.rail(W, -19.9, -19.9, 19.9, -19.9, 14); H.rail(W, -19.9, 19.9, 19.9, 19.9, 14); H.rail(W, -19.9, -19.9, -19.9, 19.9, 14); H.rail(W, 19.9, -19.9, 19.9, -1.4, 14); H.rail(W, 19.9, 1.4, 19.9, 19.9, 14);
      // bridge to the wellhead platform (x 54..84)
      H.slab(W, 37, 14, 0, 34, 2.4, surf('darkmetal', 6)); H.rail(W, 20, -1.2, 54, -1.2, 14); H.rail(W, 20, 1.2, 54, 1.2, 14);
      for (const x of [56, 82]) for (const z of [-14, 14]) { const l = new THREE.Mesh(gCylY(1.1, 1.4, 30, 12), surf('yellow')); l.position.set(x, 0, z); W.static.add(l); W.addCol(V3(x - 1.2, -15, z - 1.2), V3(x + 1.2, 14, z + 1.2), 'metal'); }
      H.slab(W, 69, 14, 0, 30, 30, surf('metal', 8)); H.rail(W, 54.1, -15, 54.1, -1.4, 14); H.rail(W, 54.1, 1.4, 54.1, 15, 14); H.rail(W, 83.9, -15, 83.9, 15, 14); H.rail(W, 54, -14.9, 84, -14.9, 14); H.rail(W, 54, 14.9, 84, 14.9, 14);
      W.box(80, 14, 10, 1.2, 9, 1.2, surf('yellow'), 'metal'); W.box(74, 22.5, 10, 12, .8, .8, surf('yellow'), 'metal', { noCol: true });
      // derrick
      for (const x of [3, 9]) for (const z of [3, 9]) W.box(x, 14, z, .5, 18, .5, surf('red'), 'metal');
      for (let y = 17; y < 32; y += 4) { W.box(6, y, 3, 6.5, .3, .3, surf('red'), 'metal', { noCol: true }); W.box(6, y, 9, 6.5, .3, .3, surf('red'), 'metal', { noCol: true }); }
      H.slab(W, 6, 15.4, 6, 7, 7, 'darkmetal'); // drill floor
      // tanks, pipe racks, compressor modules
      for (const [x, z] of [[12, -8], [15, -13], [12, -15]]) { const t = new THREE.Mesh(gCylY(2, 2, 5, 16), surf('white')); t.position.set(x, 16.5, z); t.castShadow = true; W.static.add(t); W.addCol(V3(x - 2, 14, z - 2), V3(x + 2, 19, z + 2), 'metal'); }
      for (let x = -4; x <= 16; x += 5) W.box(x, 14, 15, .4, 3, .4, surf('darkmetal'), 'metal'); W.box(6, 17, 15, 21, .5, 1.6, surf('darkmetal'), 'metal', { noCol: true });
      for (let i = 0; i < 6; i++) W.box(-6 + i * 3.5, 14, 17.5, 1.5, 1.2, 3, surf('darkmetal'), 'metal');
      H.room(W, 10, 0, 7, 5, 3, 14, { mat: 'white', doors: { w: [.5], s: [.5] }, win: { n: [.5] } }); // compressor module
      // accommodation block (upper deck at y 20 on its roof, helideck at y 24)
      H.room(W, -10, -10, 18, 18, 5.6, 14, { mat: 'white', doors: { e: [.25, .75], s: [.5] }, win: { e: [.5], s: [.2, .8] }, roof: false });
      W.wall(-10, -19, -10, -1, 5.6, .2, surf('white', 2), 'metal', [{ t: .5, w: 1.2, y0: 0, y1: 2.2 }], 14); // internal corridor wall
      H.slab(W, -10, 20, -10, 18.4, 18.4, deck); // upper deck
      H.stairs(W, 0.2, 12, 14, 20, -1, 1.3); // main → upper deck (along the east face)
      H.rail(W, -19, -19.1, -.8, -19.1, 20); H.rail(W, -19.1, -19, -19.1, -.8, 20); H.rail(W, -19, -.8, -.8, -.8, 20);
      // helideck on pillars above the upper deck's north-west corner, with stairs down
      for (const [x, z] of [[-18, -18], [-8, -18], [-18, -8], [-8, -8]]) W.box(x, 20, z, .4, 4, .4, surf('darkmetal'), 'metal');
      H.slab(W, -13, 24.2, -13, 12, 12, surf('darkmetal', 3));
      W.box(-13, 24.2, -13, 5, .02, .6, surf('white'), 'metal', { noCol: true }); W.box(-15, 24.2, -13, .6, .02, 4, surf('white'), 'metal', { noCol: true }); W.box(-11, 24.2, -13, .6, .02, 4, surf('white'), 'metal', { noCol: true });
      H.stairs(W, -6.2, -9, 20, 24.2, -1, 1.2);
      H.rail(W, -19, -19, -7.05, -19, 24.2); H.rail(W, -19, -7.05, -7.05, -7.05, 24.2); H.rail(W, -19, -19, -19, -7.05, 24.2);
      for (const [x, y, z] of [[0, 17, 0], [-10, 19, -10], [10, 17.5, 10], [-13, 26, -13], [15, 17, -5]]) H.light(W, x, y, z, '#ffe0b0');
    },
    guards: [[-6, 20, -4, PI / 2], [-16, 20, -3, 0], [-3, 20, -16, -PI / 2], [-14, 14, -14, PI / 4], [-5, 14, -5, -PI / 4, true], [-14, 14, -3, 0],
      [6, 15.4, 6, -PI / 2], [12, 14, -3, -PI / 2], [15, 14, 5, PI], [3, 14, 12, PI / 2], [10, 14, 0, PI / 2], [-5, 14, 16, PI, true], [13, 14, 17, -PI * .75], [-16, 14, 12, 0]],
    hostages: [[-14, 14, -16, PI / 4], [-6, 14, -16, -PI / 4], [11, 14, 1, PI]] },

  { id: 'embassy', name: 'Consulate Siege', loc: 'Diplomatic compound, capital city', blurb: 'A cell has stormed a consulate and taken its staff hostage. Breach the gate, clear the courtyard, then both floors and the roof.',
    ground: 'asphalt', weather: {}, amb: 'war', reverb: 'urban',
    out: { style: 'urban', bounds: 88, regions: [[-84, -84, 84, 84]], avoid: [[-44, -44, 44, 44]], start: [0, 80], max: 12 },
    player: { pos: [0, 0, 80], yaw: 0 },
    build(W) {
      W.bounds = 44;
      const wallM = surf('plaster', 6);
      // perimeter wall with the gate on the south side
      W.wall(-26, -24, 26, -24, 3, .5, wallM, 'brick'); W.wall(-26, -24, -26, 26, 3, .5, wallM, 'brick'); W.wall(26, -24, 26, 26, 3, .5, wallM, 'brick');
      W.wall(-26, 26, 26, 26, 3, .5, wallM, 'brick', [{ t: .5, w: 6, y0: 0, y1: 3 }]);
      H.room(W, 7, 23, 4, 4, 2.8, 0, { mat: 'plaster', surf: 'brick', doors: { w: [.5] }, win: { s: [.5], n: [.5] } }); // guardhouse
      // courtyard: fountain, parked cars, planters
      const f = new THREE.Mesh(gCylY(2.5, 2.7, .8, 20), surf('stone')); f.position.set(0, .4, 10); W.static.add(f); W.addCol(V3(-2.5, 0, 7.5), V3(2.5, .8, 12.5), 'stone');
      W.vehicle(-14, 14, 0, 'car'); W.vehicle(14, 12, .3, 'car'); W.vehicle(-17, 2, 1.57, 'humvee');
      for (const x of [-20, -8, 8, 20]) W.box(x, 0, 3, 3, .9, 1.2, surf('stone'), 'stone');
      // main building: two floors + roof with parapet
      const bm = surf('plaster', 4);
      const fl = (y, doorsS) => {
        W.wall(-14, -16, 14, -16, 3.6, .3, bm, 'brick', [{ t: .2, w: 1.4, y0: 1, y1: 2.2 }, { t: .5, w: 1.4, y0: 1, y1: 2.2 }, { t: .8, w: 1.4, y0: 1, y1: 2.2 }], y);
        W.wall(-14, 0, 14, 0, 3.6, .3, bm, 'brick', doorsS, y);
        W.wall(-14, -16, -14, 0, 3.6, .3, bm, 'brick', [{ t: .5, w: 1.3, y0: 1, y1: 2.2 }], y); W.wall(14, -16, 14, 0, 3.6, .3, bm, 'brick', [{ t: .5, w: 1.3, y0: 1, y1: 2.2 }], y);
        // interior: central hall with offices either side
        W.wall(-5, -16, -5, 0, 3.6, .2, surf('white', 2), 'wood', [{ t: .3, w: 1.1, y0: 0, y1: 2.2 }, { t: .75, w: 1.1, y0: 0, y1: 2.2 }], y);
        W.wall(5, -16, 5, 0, 3.6, .2, surf('white', 2), 'wood', [{ t: .3, w: 1.1, y0: 0, y1: 2.2 }, { t: .75, w: 1.1, y0: 0, y1: 2.2 }], y);
        W.wall(-14, -8, -5, -8, 3.6, .2, surf('white', 2), 'wood', [{ t: .5, w: 1.1, y0: 0, y1: 2.2 }], y); W.wall(5, -8, 14, -8, 3.6, .2, surf('white', 2), 'wood', [{ t: .5, w: 1.1, y0: 0, y1: 2.2 }], y);
        for (const [x, z] of [[-10, -4], [-10, -12], [10, -4], [10, -12]]) W.box(x, y, z, 2, .75, 1, surf('planks'), 'wood'); // desks
      };
      fl(0, [{ t: .5, w: 2.2, y0: 0, y1: 2.6 }, { t: .15, w: 1.4, y0: 1, y1: 2.2 }, { t: .85, w: 1.4, y0: 1, y1: 2.2 }]);
      H.slab(W, -9.5, 3.9, -8, 9, 16, surf('planks', 3)); H.slab(W, 9.5, 3.9, -8, 9, 16, surf('planks', 3)); H.slab(W, 0, 3.9, -12.5, 10, 7, surf('planks', 3)); // first floor (stairwell open)
      H.stairs(W, 2.8, -1.2, 0, 3.9, -1, 1.6); // hall stairs up to the first-floor landing
      fl(3.9, [{ t: .15, w: 1.4, y0: 1, y1: 2.2 }, { t: .5, w: 1.4, y0: 1, y1: 2.2 }, { t: .85, w: 1.4, y0: 1, y1: 2.2 }]);
      H.rail(W, -4.8, -9, 1.9, -9, 3.9, 'darkmetal');
      const rf = surf('concrete', 4); H.slab(W, -9.05, 7.8, -8, 10.5, 16.6, rf); H.slab(W, 6.05, 7.8, -8, 16.5, 16.6, rf); H.slab(W, -3, 7.8, -13.4, 1.6, 5.8, rf); H.slab(W, -3, 7.8, -2.45, 1.6, 5.5, rf); // roof with a stair hatch
      H.stairs(W, -3, -14.5, 3.9, 7.8, 1, 1.4); // roof access (opening in the roof slab left above it)
      W.wall(-14.3, -16.3, 14.3, -16.3, 1, .2, bm, 'brick', [], 7.8); W.wall(-14.3, .3, 14.3, .3, 1, .2, bm, 'brick', [], 7.8); W.wall(-14.3, -16.3, -14.3, .3, 1, .2, bm, 'brick', [], 7.8); W.wall(14.3, -16.3, 14.3, .3, 1, .2, bm, 'brick', [], 7.8); // parapet
      W.box(8, 7.8, -12, 3, 1.6, 2, surf('darkmetal'), 'metal'); // AC units
      for (let i = 0; i < 8; i++) W.tree(-22 + (i % 2) * 44, -20 + (i >> 1) * 12, 7, 'palm');
      for (const [x, y, z] of [[0, 3.2, -8], [-9, 3.2, -4], [9, 3.2, -12], [0, 7, -8], [-9, 7, -12], [9, 7, -4], [0, 4, 18], [-20, 4, 20]]) H.light(W, x, y, z, '#fff0d0', 1.1, 18);
    },
    guards: [[7, 0, 23, PI], [-2, 0, 22, 0], [-14, 0, 12, PI / 2, true], [15, 0, 6, -PI / 2], [0, 0, -3, 0], [-9, 0, -12, PI / 2], [9, 0, -4, -PI / 2], [-2, 0, -14, PI],
      [-9, 3.9, -4, PI / 2], [9, 3.9, -12, -PI / 2], [0, 3.9, -14, 0], [10, 3.9, -3, PI], [-10, 7.8, -2, 0, true], [10, 7.8, -14, 0], [0, 7.8, -6, 0]],
    hostages: [[-11, 3.9, -13, PI / 2], [11, 3.9, -5, -PI / 2], [-11, 0, -5, PI / 2]] },

  { id: 'warehouse', name: 'Pier 9', loc: 'Dockside warehouse, Rotterdam', blurb: 'An arms-smuggling ring is holed up in a bonded warehouse with two hostages. Push in from the quay, clear the racks, the mezzanine and the office.',
    ground: 'concrete', weather: { night: 'rain', dawn: 'rain' }, amb: 'wind', reverb: 'industrial',
    out: { style: 'dock', bounds: 88, regions: [[-84, -84, 84, 84]], avoid: [[-44, -44, 44, 46]], start: [0, 80], max: 12 },
    player: { pos: [0, 0, 80], yaw: 0 },
    build(W) {
      W.bounds = 44;
      const wm = surf('corrugated', 6);
      W.wall(-20, -14, 20, -14, 10, .3, wm, 'metal', [{ t: .8, w: 3, y0: 0, y1: 3 }]);
      W.wall(-20, 14, 20, 14, 10, .3, wm, 'metal', [{ t: .5, w: 6, y0: 0, y1: 5 }, { t: .15, w: 1.2, y0: 0, y1: 2.2 }]);
      W.wall(-20, -14, -20, 14, 10, .3, wm, 'metal', [{ t: .5, w: 1.2, y0: 0, y1: 2.2 }]); W.wall(20, -14, 20, 14, 10, .3, wm, 'metal', [{ t: .3, w: 4, y0: 0, y1: 4 }]);
      H.slab(W, 0, 10.3, 0, 40.6, 28.6, surf('corrugated', 6));
      // pallet racking aisles
      for (const x of [-12, -6, 0, 6]) for (const z of [-8, 2]) { W.box(x, 0, z, 1.2, 4.2, 7, surf('darkmetal'), 'metal', { pen: 2 }); for (const y of [.2, 1.6, 3]) W.box(x, y, z, 1.3, 1, 6.6, surf('crate'), 'wood', { noCol: true }); }
      // mezzanine along the north wall with an office, stairs from the floor
      H.slab(W, 0, 4.2, -11, 40, 6, surf('metal', 8));
      H.rail(W, -19.8, -7.95, 11, -7.95, 4.2, 'yellow'); H.rail(W, 13.2, -7.95, 19.8, -7.95, 4.2, 'yellow');
      H.stairs(W, 12.1, -1.4, 0, 4.2, -1, 1.6);
      H.room(W, -12, -11, 8, 5.4, 2.8, 4.2, { mat: 'white', doors: { s: [.7] }, win: { s: [.3] } });
      for (let i = 0; i < 6; i++) W.crate(-4 + i * 2.4, -12.5, 1.1, 4.2);
      // quay outside: containers, truck, forklift, bollards, crane
      const cols = ['container_r', 'container_b', 'container_g'];
      for (const [x, z, ry, k] of [[-14, 20, 0, 2], [-8, 24, PI / 2, 1], [12, 20, 0, 1], [16, 26, 0, 2], [-16, 30, PI / 2, 1]]) for (let i = 0; i < k; i++) W.container(x, z, ry, cols[(i + Math.abs(x)) % 3], i * 2.59);
      W.vehicle(4, 22, PI / 2, 'truck'); W.vehicle(-4, 6, 0, 'forklift'); W.vehicle(14, 5, 1.2, 'forklift');
      for (let x = -18; x <= 18; x += 6) W.box(x, 0, 42, .5, .7, .5, surf('darkmetal'), 'metal');
      for (const x of [-10, 10]) W.box(x, 0, 34, 1, 18, 1, surf('yellow'), 'metal'); W.box(0, 17.5, 34, 22, 1, 1, surf('yellow'), 'metal', { noCol: true });
      for (const [x, y, z] of [[-10, 9.5, 0], [10, 9.5, 0], [0, 9.5, -8], [-12, 6.8, -11], [0, 6, 20], [-14, 6, 30]]) H.light(W, x, y, z, '#fff2cc', 1.3, 24);
    },
    guards: [[0, 0, 16, 0], [-14, 5.18, 20, 0], [12, 0, 25, PI], [-3, 0, 8, 0, true], [3, 0, -3, PI], [-9, 0, -3, 0], [9, 0, 7, -PI / 2], [-16, 0, 10, 0, true], [16, 0, -8, PI],
      [-5, 4.2, -9, PI], [5, 4.2, -9.5, PI], [16, 4.2, -10, PI / 2], [-12, 4.2, -11, 0]],
    hostages: [[-14, 4.2, -12, PI / 2], [-3, 0, -12, 0]] },

  { id: 'train', name: 'Night Express', loc: 'Stalled passenger train, rail yard', blurb: 'Gunmen have stopped an express and moved its passengers into the rear coaches. Clear the platform, then work through the train carriage by carriage.',
    ground: 'gravel', weather: { night: 'snow', dawn: 'snow' }, amb: 'wind', reverb: 'urban',
    out: { style: 'yard', bounds: 92, regions: [[-88, -88, 88, 88]], avoid: [[-14, -52, 10, 54]], start: [5, 84], max: 12 },
    player: { pos: [5, 0, 84], yaw: 0 },
    build(W) {
      W.bounds = 50;
      H.slab(W, 2.05, 1.1, 0, 5.9, 96, surf('concrete', 12)); // platform (flush with the coach doors)
      H.stairs(W, 2.05, 50.5, 0, 1.1, -1, 3, 'z', 'concrete'); // steps up from the yard
      for (let z = -44; z <= 44; z += 8) { W.box(3, 1.1, z, .15, 3.5, .15, surf('darkmetal'), 'metal'); }
      W.box(4.2, 4.6, 0, 3, .15, 90, surf('corrugated', 10), 'metal', { noCol: true }); // canopy
      for (const x of [-2.5, -7.5]) { W.box(x - .7, 0, 0, .15, .2, 100, surf('darkmetal', 12), 'metal', { noCol: true }); W.box(x + .7, 0, 0, .15, .2, 100, surf('darkmetal', 12), 'metal', { noCol: true }); }
      // five coaches on the near track: hollow bodies with an aisle, seats, end doors and side doors to the platform
      const coachM = surf('car1', 1);
      for (let i = 0; i < 5; i++) {
        const cz = -36 + i * 18, L = 16.5, y = 1.2;
        W.box(-2.5, 0, cz, 2.6, 1, L, surf('darkmetal'), 'metal'); // underframe
        H.slab(W, -2.5, y, cz, 3, L, surf('planks', 3), .2);
        W.wall(-4, cz - L / 2, -4, cz + L / 2, 2.4, .12, coachM, 'metal', [0.15, .3, .45, .6, .75, .9].map(t => ({ t, w: 1.3, y0: .9, y1: 1.8 })), y);
        W.wall(-1, cz - L / 2, -1, cz + L / 2, 2.4, .12, coachM, 'metal', [{ t: .12, w: 1.1, y0: 0, y1: 2.1 }, { t: .88, w: 1.1, y0: 0, y1: 2.1 }, ...[.3, .45, .6, .75].map(t => ({ t, w: 1.3, y0: .9, y1: 1.8 }))], y);
        W.wall(-4, cz - L / 2, -1, cz - L / 2, 2.4, .12, coachM, 'metal', [{ t: .5, w: .9, y0: 0, y1: 2.1 }], y); W.wall(-4, cz + L / 2, -1, cz + L / 2, 2.4, .12, coachM, 'metal', [{ t: .5, w: .9, y0: 0, y1: 2.1 }], y);
        H.slab(W, -2.5, y + 2.6, cz, 3.2, L + .2, surf('car1', 1), .2);
        for (let k = -3; k <= 3; k++) { if (k === 0) continue; for (const x of [-3.5, -1.5]) W.box(x, y, cz + k * 2.1, .7, .9, .6, surf('red'), 'wood', { pen: 1 }); }
        if (i < 4) { W.box(-2.5, y, cz + 9, .9, .1, 1.5, surf('darkmetal'), 'metal'); } // gangway between coaches
      }
      W.box(-2.5, 0, -48, 2.8, 4, 6, surf('yellow'), 'metal'); // locomotive nose
      // wagons on the far track for cover
      for (let z = -40; z <= 40; z += 14) W.box(-7.5, 0, z, 2.8, 3.2, 12, surf('rust'), 'metal', { pen: 2 });
      for (let i = 0; i < 6; i++) W.crate(9, -40 + i * 15, 1.1);
      for (let z = -40; z <= 40; z += 16) H.light(W, 4.2, 4.3, z, '#cfe0ff', 1.1, 18);
      for (let z = -36; z <= 36; z += 18) H.light(W, -2.5, 3.5, z, '#fff0d0', .7, 10);
    },
    guards: [[3, 1.1, 30, PI], [4, 1.1, 12, PI, true], [2, 1.1, -8, PI], [3.5, 1.1, -28, PI], [-7.5, 3.2, 4, PI], [-2.5, 1.2, 36, PI], [-2.5, 1.2, 20, PI], [-2.5, 1.2, 2, PI, true],
      [-2.5, 1.2, -14, PI], [-2.5, 1.2, -30, PI], [-5.2, 0, -19, PI / 2], [-2.5, 1.2, -40, 0]],
    hostages: [[-2.8, 1.2, -17, -PI / 2], [-2.2, 1.2, -33, PI / 2], [-2.8, 1.2, -38.6, -PI / 2]] },

  { id: 'hotel', name: 'Hotel Meridian', loc: 'Business hotel, city centre', blurb: 'A cell has taken the Meridian during a conference. Storm the lobby, clear the ballroom floor and finish them on the roof terrace.',
    ground: 'concrete', weather: { night: 'rain' }, amb: 'wind', reverb: 'urban',
    out: { style: 'urban', bounds: 88, regions: [[-84, -84, 84, 84]], avoid: [[-19, -14, 19, 35]], start: [0, 80], max: 12 },
    player: { pos: [0, 0, 80], yaw: 0 },
    build(W) {
      W.bounds = 42;
      const ext = surf('plaster', 3), glass = surf('glass', 1), wood = surf('planks', 2), floorM = surf('concrete', 6), dark = surf('darkmetal', 1), white = surf('white', 2);
      // ground floor (lobby): glass entrance on the street side, service door at the back
      W.wall(-15, 10, 15, 10, 3.7, .3, ext, 'concrete', [{ t: .5, w: 3.2, y0: 0, y1: 2.8 }, { t: .2, w: 4, y0: .9, y1: 2.8 }, { t: .8, w: 4, y0: .9, y1: 2.8 }]);
      W.wall(-15, -10, 15, -10, 3.7, .3, ext, 'concrete', [{ t: .25, w: 1.2, y0: 0, y1: 2.2 }]);
      for (const x of [-15, 15]) W.wall(x, -10, x, 10, 3.7, .3, ext, 'concrete', [{ t: .3, w: 2, y0: 1, y1: 2.6 }, { t: .7, w: 2, y0: 1, y1: 2.6 }]);
      W.box(-8, 0, -4, 6, 1.1, 1.2, wood, 'wood'); W.box(-8, 0, -6.2, 6, 2.4, .3, wood, 'wood', { noCol: true }); // reception desk and back panel
      for (const [x, z] of [[-10, 2], [10, 2], [10, -5], [0, -3]]) W.box(x, 0, z, .7, 3.7, .7, white, 'concrete');
      for (const [x, z, ry] of [[6, 3, 0], [6, 6.5, 0], [-12, 6, PI / 2]]) W.box(x, 0, z, 2.4, .7, .9, surf('red', 1), 'wood', { ry });
      W.box(13.3, 0, -8.3, 3, 3.7, 3, dark, 'metal'); // lift shaft
      // first floor slab with the lobby staircase opening (x -6.2..3.6, z 6.6..8.4)
      H.slab(W, 0, 4, -1.7, 30, 16.6, floorM); H.slab(W, -10.6, 4, 8.3, 8.8, 3.4, floorM); H.slab(W, 9.3, 4, 8.3, 11.4, 3.4, floorM); H.slab(W, -1.3, 4, 9.2, 9.8, 1.6, floorM);
      H.stairs(W, -6, 7.5, 0, 4, 1, 1.6, 'x', 'concrete');
      H.rail(W, -6.2, 6.6, 3.6, 6.6, 4, 'darkmetal'); H.rail(W, -6.2, 8.4, 3.6, 8.4, 4, 'darkmetal'); H.rail(W, -6.2, 6.6, -6.2, 8.4, 4, 'darkmetal');
      // first floor: ballroom with side meeting rooms, banquet tables
      W.wall(-15, 10, 15, 10, 3.7, .3, ext, 'concrete', [{ t: .15, w: 3, y0: .9, y1: 2.8 }, { t: .5, w: 3, y0: .9, y1: 2.8 }, { t: .85, w: 3, y0: .9, y1: 2.8 }], 4);
      W.wall(-15, -10, 15, -10, 3.7, .3, ext, 'concrete', [{ t: .5, w: 3, y0: .9, y1: 2.8 }], 4);
      for (const x of [-15, 15]) W.wall(x, -10, x, 10, 3.7, .3, ext, 'concrete', [{ t: .5, w: 3, y0: .9, y1: 2.8 }], 4);
      H.room(W, -11, -6, 7, 7, 3.6, 4, { mat: 'white', doors: { s: [.5] }, roof: false });
      H.room(W, 11, -5, 7, 9, 3.6, 4, { mat: 'white', doors: { w: [.75] }, roof: false });
      for (const [x, z] of [[-3, 1], [2, -1], [-7, 2.5], [6, 3]]) { W.box(x, 4, z, 1.6, .75, 1.6, white, 'wood'); }
      // roof slab with the opening for the second staircase (x -3.6..6.2, z -8.4..-6.6)
      H.slab(W, 0, 8, 1.7, 30, 16.6, floorM); H.slab(W, -9.3, 8, -8.3, 11.4, 3.4, floorM); H.slab(W, 10.6, 8, -8.3, 8.8, 3.4, floorM); H.slab(W, 1.3, 8, -9.2, 9.8, 1.6, floorM);
      H.stairs(W, 6, -7.5, 4, 8, -1, 1.6, 'x', 'concrete');
      H.rail(W, -3.6, -8.4, 6.2, -8.4, 8, 'darkmetal'); H.rail(W, -3.6, -6.6, 6.2, -6.6, 8, 'darkmetal'); H.rail(W, 6.2, -8.4, 6.2, -6.6, 8, 'darkmetal');
      // roof terrace: parapet, plant, water tank, sign
      for (const [x1, z1, x2, z2] of [[-15, -10, 15, -10], [-15, 10, 15, 10], [-15, -10, -15, 10], [15, -10, 15, 10]]) W.wall(x1, z1, x2, z2, 1.1, .3, ext, 'concrete', [], 8);
      for (const [x, z] of [[-9, 2], [-4, 5], [9, 0]]) W.box(x, 8, z, 2.4, 1.4, 1.6, surf('grey', 1), 'metal');
      W.box(10, 8, 6, 3, 2.6, 3, surf('rust', 1), 'metal');
      W.box(0, 9.1, 10.2, 12, 1.4, .2, surf('red', 1), 'metal', { noCol: true });
      // street: parked cars, a burnt-out car, lamps
      W.vehicle(-9, 17, PI / 2, 'car'); W.vehicle(8, 18, PI / 2 + .1, 'car'); W.vehicle(-2, 31, 1.2, 'burnt'); W.vehicle(13, 30, 0, 'humvee');
      for (const [x, y, z] of [[-8, 3.2, 0], [8, 3.2, 0], [0, 3.2, 6], [-10, 7.2, -5], [0, 7.2, 0], [10, 7.2, -4], [-12, 5, 16], [12, 5, 16]]) H.light(W, x, y, z, '#ffe2b0', 1.1, 18);
    },
    guards: [[0, 0, 4, PI], [-10, 0, 0, PI, true], [9, 0, -2, PI], [-3, 0, -7, PI / 2], [6, 0, 8.5, PI], [12, 0, 5, PI, true],
      [0, 4, -2, PI], [-11, 4, -4, 0], [11, 4, -3, -PI / 2], [-10, 4, 8.5, PI], [8, 4, 2, PI], [-12, 8, 0, PI, true], [10, 8, 2, PI], [2, 8, 4, PI], [-11, 8, -8, PI / 2]],
    hostages: [[-8, 0, -5.4, 0], [-12, 4, -7, PI / 2], [12, 4, -7, -PI / 2]] },

  { id: 'airliner', name: 'Flight 417', loc: 'Hijacked airliner, regional airport', blurb: 'An airliner has been hijacked on the apron, with a support team in the maintenance hangar behind it. Cross the apron, clear the cabin from both doors, then take the hangar and its office.',
    ground: 'concrete', weather: { night: 'rain', dawn: 'rain' }, amb: 'wind', reverb: 'industrial',
    out: { style: 'airport', bounds: 96, regions: [[-92, -92, 92, 92]], avoid: [[-25, -52, 25, 42]], start: [0, 88], max: 12 },
    player: { pos: [0, 0, 88], yaw: 0 },
    build(W) {
      W.bounds = 62;
      const white = surf('white', 2), grey = surf('grey', 1), wm = surf('corrugated', 8), seatM = surf('red', 1), dark = surf('darkmetal', 1);
      // maintenance hangar (x -22..22, z -48..-18) with an open front, back-wall office on a mezzanine
      W.wall(-22, -48, 22, -48, 14, .4, wm, 'metal', [{ t: .7, w: 1.2, y0: 0, y1: 2.2 }]);
      W.wall(-22, -48, -22, -18, 14, .4, wm, 'metal', [{ t: .6, w: 1.2, y0: 0, y1: 2.2 }]); W.wall(22, -48, 22, -18, 14, .4, wm, 'metal', [{ t: .5, w: 4, y0: 0, y1: 4 }]);
      W.wall(-22, -18, -16, -18, 14, .4, wm, 'metal'); W.wall(16, -18, 22, -18, 14, .4, wm, 'metal'); W.box(0, 9, -18, 32, 5, .4, wm, 'metal');
      H.slab(W, 0, 14.3, -33, 44.6, 30.6, wm);
      H.slab(W, 0, 4, -44.5, 44, 7, surf('metal', 8));
      H.rail(W, -21.8, -41, 15.1, -41, 4, 'yellow'); H.rail(W, 16.9, -41, 21.8, -41, 4, 'yellow');
      H.stairs(W, 16, -32, 0, 4, -1, 1.6);
      H.room(W, -12, -44.5, 10, 6, 3, 4, { mat: 'white', doors: { s: [.5] }, win: { s: [.2, .8] } });
      for (const [x, z] of [[-14, -30], [-8, -36], [10, -28], [6, -38]]) W.crate(x, z, 1.2);
      for (let i = 0; i < 3; i++) W.container(-17, -26 - i * 7, PI / 2, ['container_r', 'container_b', 'container_g'][i]);
      W.vehicle(8, -24, .4, 'forklift'); W.vehicle(-4, -30, PI / 2, 'truck');
      for (const x of [-18, -10, 4, 12]) W.box(x, 0, -46.8, 3, 2.4, 1, dark, 'metal'); // tool racks
      // the airliner: hollow cabin (x -1.9..1.9, z -12..24, floor 2.6), wings, engines, gear, air stairs at two doors
      W.box(0, 1.2, 6, 3.8, 1.1, 40, white, 'metal'); H.slab(W, 0, 2.6, 6, 3.8, 40, surf('planks', 6));
      const win = []; for (let z = -11; z <= 23; z += 1.2) if (Math.abs(z + 9) > 1 && Math.abs(z - 20) > 1) win.push({ t: (z + 12) / 36, w: .32, y0: .95, y1: 1.4 });
      W.wall(-1.9, -12, -1.9, 24, 2.2, .15, white, 'metal', [...win, { t: 3 / 36, w: 1, y0: 0, y1: 1.9 }, { t: 32 / 36, w: 1, y0: 0, y1: 1.9 }], 2.6);
      W.wall(1.9, -12, 1.9, 24, 2.2, .15, white, 'metal', win, 2.6);
      W.wall(-1.9, -12, 1.9, -12, 2.2, .15, white, 'metal', [], 2.6); W.wall(-1.9, 24, 1.9, 24, 2.2, .15, white, 'metal', [], 2.6);
      H.slab(W, 0, 5.1, 6, 4.1, 36.4, white, .3);
      W.box(0, 1.2, -13.2, 3.4, 3.6, 2.4, white, 'metal'); W.box(0, 3.4, -14.6, 2.6, 1, .6, surf('glass', 1), 'glass', { noCol: true }); // nose and cockpit glazing
      W.box(0, 2, 26, 3, 2.8, 4, white, 'metal'); W.box(0, 4.8, 27.4, .3, 3.6, 2.6, white, 'metal', { noCol: true }); W.box(0, 6.6, 27.6, .32, .5, 2.2, surf('red', 1), 'metal', { noCol: true }); W.box(0, 4.6, 27, 8, .25, 2, white, 'metal', { noCol: true });
      for (const sx of [-1, 1]) { W.box(sx * 10, 2.3, 8, 16, .35, 5, white, 'metal'); W.box(sx * 7, 1.1, 6.5, 1.6, 1.2, 3.4, grey, 'metal'); W.box(sx * 1.2, 0, 8, .5, 1.2, .8, dark, 'metal'); }
      W.box(0, 0, -10.5, .4, 1.2, .4, dark, 'metal');
      for (let z = -10; z <= 22; z += .95) { if (Math.abs(z + 9) < 1.1 || Math.abs(z - 20) < 1.1) continue; for (const sx of [-1, 1]) { W.box(sx * 1.15, 2.6, z, 1.25, .45, .5, seatM, 'wood'); W.box(sx * 1.15, 3.05, z + .23, 1.25, .6, .08, seatM, 'wood', { noCol: true }); } }
      for (const z of [-9, 20]) { H.stairs(W, -8.1, z, 0, 2.6, 1, 1.2, 'x', 'grey'); H.rail(W, -8.1, z - .65, -2, z - .65, 1.4, 'white'); H.rail(W, -8.1, z + .65, -2, z + .65, 1.4, 'white'); }
      // apron: baggage carts, fuel truck, cones and lights
      for (let i = 0; i < 4; i++) W.box(8 + i * 2.6, 0, 22, 2, 1.1, 1.4, surf('car2', 1), 'metal');
      W.vehicle(-12, 22, .2, 'truck'); W.vehicle(10, 36, PI / 2, 'humvee');
      for (const [x, y, z] of [[-14, 12, -30], [14, 12, -30], [0, 12, -40], [-12, 6.6, -44], [0, 4.4, -2], [0, 4.4, 14], [-14, 7, 30], [14, 7, 30]]) H.light(W, x, y, z, '#fff2cc', 1.2, 24);
    },
    guards: [[0, 2.6, -6, PI], [0, 2.6, 7, 0], [0, 2.6, 17, PI], [-5, 0, -11.5, PI], [6, 0, 3, PI, true], [-10, 0, 15, PI], [-12, 2.65, 8, PI, true],
      [0, 0, -22, PI], [-12, 0, -31, PI], [12, 0, -33, 0], [17, 0, -24, PI], [0, 4, -43, PI], [-12, 4, -45, PI / 2], [10, 4, -43, PI]],
    hostages: [[0, 2.6, 2, PI], [0, 2.6, 13, 0], [-14, 4, -46, PI / 2]] },

  { id: 'compound', name: 'Al-Rashid Compound', loc: 'Walled desert compound', blurb: 'A cell leader holds a walled family compound with a two-storey house, a garage and a watchtower. Breach the gate, clear the courtyard and the house up to the roof.',
    ground: 'sand', weather: {}, amb: 'wind', reverb: 'urban',
    out: { style: 'desert', bounds: 88, regions: [[-84, -84, 84, 84]], avoid: [[-27, -27, 27, 37]], start: [0, 80], max: 12 },
    player: { pos: [0, 0, 80], yaw: 0 },
    build(W) {
      W.bounds = 56;
      const adobe = surf('adobe', 3), plaster = surf('plaster', 2), floorM = surf('concrete', 5);
      // perimeter wall with the main gate (south) and a side door (west)
      W.wall(-24, 24, 24, 24, 3, .5, adobe, 'stone', [{ t: .5, w: 4, y0: 0, y1: 3 }]); W.wall(-24, -24, 24, -24, 3, .5, adobe, 'stone');
      W.wall(-24, -24, -24, 24, 3, .5, adobe, 'stone', [{ t: .65, w: 1.2, y0: 0, y1: 2.2 }]); W.wall(24, -24, 24, 24, 3, .5, adobe, 'stone');
      // main house (x -10..10, z -16..-2), ground floor
      W.wall(-10, -2, 10, -2, 3.3, .3, plaster, 'stone', [{ t: .5, w: 1.4, y0: 0, y1: 2.3 }, { t: .2, w: 1.4, y0: 1, y1: 2.2 }, { t: .8, w: 1.4, y0: 1, y1: 2.2 }]);
      W.wall(-10, -16, 10, -16, 3.3, .3, plaster, 'stone', [{ t: .5, w: 1.4, y0: 1, y1: 2.2 }]);
      W.wall(-10, -16, -10, -2, 3.3, .3, plaster, 'stone', [{ t: .5, w: 1.4, y0: 1, y1: 2.2 }]); W.wall(10, -16, 10, -2, 3.3, .3, plaster, 'stone', [{ t: .5, w: 1.2, y0: 0, y1: 2.2 }]);
      W.wall(0, -16, 0, -2, 3.3, .2, plaster, 'stone', [{ t: .35, w: 1.2, y0: 0, y1: 2.2 }, { t: .8, w: 1.2, y0: 0, y1: 2.2 }]);
      W.box(-5, 0, -6, 2.2, .75, 1.2, surf('planks', 1), 'wood'); W.box(6, 0, -9, 1, .8, 3, surf('planks', 1), 'wood');
      // first floor (y 3.6) with the stair opening (x -9.2..-0.6, z -15.6..-13.4)
      H.slab(W, 0, 3.6, -7.7, 20, 11.4, floorM); H.slab(W, 4.7, 3.6, -14.7, 10.6, 2.6, floorM); H.slab(W, -9.6, 3.6, -14.7, .8, 2.6, floorM);
      H.stairs(W, -9, -14.5, 0, 3.6, 1, 1.4, 'x', 'concrete');
      H.rail(W, -9.2, -13.4, -.6, -13.4, 3.6, 'darkmetal'); H.rail(W, -9.2, -15.6, -9.2, -13.4, 3.6, 'darkmetal');
      W.wall(-10, -2, 10, -2, 3.3, .3, plaster, 'stone', [{ t: .25, w: 1.4, y0: 1, y1: 2.2 }, { t: .75, w: 1.4, y0: 1, y1: 2.2 }], 3.6);
      W.wall(-10, -16, 10, -16, 3.3, .3, plaster, 'stone', [{ t: .7, w: 1.4, y0: 1, y1: 2.2 }], 3.6);
      for (const x of [-10, 10]) W.wall(x, -16, x, -2, 3.3, .3, plaster, 'stone', [{ t: .5, w: 1.4, y0: 1, y1: 2.2 }], 3.6);
      W.wall(0, -16, 0, -2, 3.3, .2, plaster, 'stone', [{ t: .5, w: 1.2, y0: 0, y1: 2.2 }], 3.6);
      W.box(-6, 3.6, -8, 2, .5, 1, surf('red', 1), 'wood'); W.box(6, 3.6, -11, 2, .75, 1, surf('planks', 1), 'wood');
      // flat roof (y 7.2) with the second stair opening (x 0.6..9.2, z -4.6..-2.4) and a parapet
      H.slab(W, 0, 7.2, -10.3, 20, 11.4, floorM); H.slab(W, -4.7, 7.2, -3.3, 10.6, 2.6, floorM); H.slab(W, 9.6, 7.2, -3.3, .8, 2.6, floorM);
      H.stairs(W, 9, -3.5, 3.6, 7.2, -1, 1.4, 'x', 'concrete');
      H.rail(W, .6, -4.6, 9.2, -4.6, 7.2, 'darkmetal'); H.rail(W, 9.2, -4.6, 9.2, -2.4, 7.2, 'darkmetal');
      for (const [x1, z1, x2, z2] of [[-10, -16, 10, -16], [-10, -2, 10, -2], [-10, -16, -10, -2], [10, -16, 10, -2]]) W.wall(x1, z1, x2, z2, 1, .3, plaster, 'stone', [], 7.2);
      W.box(-6, 7.2, -12, 1.4, 1.2, 1.4, surf('rust', 1), 'metal'); W.box(4, 7.2, -13, 2, .9, 1, surf('grey', 1), 'metal');
      // watchtower (inaccessible platform, a marksman's perch), garage, courtyard cover
      for (const [x, z] of [[16.6, -19.4], [19.4, -19.4], [16.6, -16.6], [19.4, -16.6]]) W.box(x, 0, z, .3, 5, .3, surf('planks', 1), 'wood');
      H.slab(W, 18, 5, -18, 3.6, 3.6, surf('planks', 2)); W.sandbags(18, -19.6, 3.4, .9, 'x'); W.sandbags(18, -16.4, 3.4, .9, 'x'); W.box(18, 7.2, -18, 4, .15, 4, surf('thatch', 1), 'wood', { noCol: true });
      H.room(W, 15, 8, 8, 7, 3, 0, { mat: 'adobe', doors: { w: [.5] }, win: { s: [.5] } });
      W.vehicle(-12, 10, .4, 'truck'); W.vehicle(4, 12, -.3, 'car'); W.vehicle(-4, 33, PI / 2, 'humvee');
      W.sandbags(0, 18, 5, 1.1, 'x'); W.sandbags(-16, -2, 4, 1.1, 'z'); W.sandbags(14, 0, 4, 1.1, 'x');
      for (const [x, z] of [[-18, 16], [18, 18], [-19, -18], [-6, 4]]) W.tree(x, z, 7, 'palm');
      for (const [x, z] of [[-14, -8], [-15, -6]]) W.barrel(x, z);
      for (const [x, y, z] of [[-5, 3, -9], [5, 3, -9], [-5, 6.6, -9], [5, 6.6, -9], [0, 4, 6], [15, 2.8, 8], [0, 4, 22]]) H.light(W, x, y, z, '#ffd7a0', 1.1, 18);
    },
    guards: [[0, 0, 20, PI], [-6, 0, 19, PI, true], [8, 0, 4, PI], [-14, 0, 6, PI], [-17, 0, -10, PI / 2], [4, 0, -5, PI], [-6, 0, -4, PI],
      [-5, 3.6, -6, PI], [6, 3.6, -13, 0], [-6, 7.2, -8, PI, true], [5, 7.2, -12, PI], [18, 5, -18, 3 * PI / 4, true], [17, 0, 6, PI / 2]],
    hostages: [[-5, 0, -9, 0], [5, 3.6, -9, PI], [13, 0, 9, PI / 2]] },
];
// every land mission now spreads over roughly 480 m: the structure in the middle, a wide outlying district around it
const BIG = 240;
for (const M of G.MISSIONS) {
  if (!M.out || M.id === 'rig') continue;
  if (M.id === 'ship') { // the quay grows into a whole container port
    const b0 = M.build;
    M.build = W => { b0(W); const c = G.surf('concrete', 30); W.box(45, 0, -153, 68, 2.3, 154, c, 'concrete'); W.box(45, 0, 153, 68, 2.3, 154, c, 'concrete'); W.box(160, 0, 0, 162, 2.3, 460, c, 'concrete'); };
    Object.assign(M.out, { bounds: BIG, regions: [[13, -228, 236, 228]], max: (M.out.max || 10) + 14, falloff: 120, cell: 15 });
    continue;
  }
  Object.assign(M.out, { bounds: BIG, regions: [[-BIG + 6, -BIG + 6, BIG - 6, BIG - 6]], max: (M.out.max || 10) + 14, falloff: 110, cell: 15 });
}
G.MISSION = Object.fromEntries(G.MISSIONS.map(m => [m.id, m]));

// hostile loadouts: militant kit and the weapons such cells actually use
G.TERROR_KITS = [
  { uniform: 'u_civ_jeans', helmet: 'h_none', face: 'f_balaclava', nvg: 'n_none', armor: 'a_type56', plates: 'p_none', gloves: 'g_none', boots: 'b_combat', pack: 'k_none' },
  { uniform: 'u_civ_hoodie', helmet: 'h_none', face: 'f_shemagh', nvg: 'n_none', armor: 'a_type56', plates: 'p_none', gloves: 'g_black', boots: 'b_desert', pack: 'k_none' },
  { uniform: 'u_black', helmet: 'h_cap', face: 'f_skull', nvg: 'n_none', armor: 'a_6094', plates: 'p_steel', gloves: 'g_black', boots: 'b_combat', pack: 'k_none' },
  { uniform: 'u_civ_track', helmet: 'h_none', face: 'f_balaclava', nvg: 'n_none', armor: 'a_none', plates: 'p_none', gloves: 'g_none', boots: 'b_combat', pack: 'k_none' },
  { uniform: 'u_us_m81', helmet: 'h_none', face: 'f_shemagh', nvg: 'n_none', armor: 'a_ephod', plates: 'p_none', gloves: 'g_none', boots: 'b_desert', pack: 'k_hydro' },
];
// hostile roles: each has its own kit, weapons, armour and behaviour
//   hpK: toughness, speedK: movement, rush: leaves its post to close in (leash metres), high: prefers elevated posts,
//   crouch: fights from a crouch, burstK: longer bursts, tierUp: one tier better than the cell
const K = (o) => Object.assign({ uniform: 'u_civ_jeans', helmet: 'h_none', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_none', plates: 'p_none', gloves: 'g_none', boots: 'b_combat', pack: 'k_none' }, o);
G.HOSTILE_ROLES = [
  { id: 'rifleman', n: 'Rifleman', w: 38, d: 'Militia with an assault rifle and a chest rig. Holds its post.',
    weapons: ['akm', 'ak74', 'ak47', 'type56', 'vz58', 'galil', 'g3', 'm16a1', 'fal', 'sks'],
    kits: [K({ uniform: 'u_civ_jeans', face: 'f_balaclava', armor: 'a_type56' }), K({ uniform: 'u_civ_hoodie', face: 'f_shemagh', armor: 'a_type56', gloves: 'g_black', boots: 'b_desert' }),
      K({ uniform: 'u_us_m81', face: 'f_shemagh', armor: 'a_ephod', boots: 'b_desert', pack: 'k_hydro' }), K({ uniform: 'u_civ_track', face: 'f_balaclava' }), K({ uniform: 'u_ru_flora', helmet: 'h_cap', armor: 'a_type56' })] },
  { id: 'gunner', n: 'Machine gunner', w: 14, d: 'Belt-fed or drum-fed LMG, long bursts from a crouch, steel helmet.', crouch: true, burstK: 2, speedK: .8,
    weapons: ['pkm', 'rpk', 'rpd', 'm60', 'mg3', 'm249', 'negev'],
    kits: [K({ uniform: 'u_ru_gorka', helmet: 'h_ssh68', armor: 'a_type56', gloves: 'g_black' }), K({ uniform: 'u_us_m81', helmet: 'h_pasgt', face: 'f_balaclava', armor: 'a_ephod' })] },
  { id: 'marksman', n: 'Marksman', w: 12, d: 'Designated marksman rifle from a high or distant post. Sees you first.', high: true, crouch: true, sight: 1.4,
    weapons: ['svd', 'g3sg1', 'm21', 'svch', 'm24', 'sv98'],
    kits: [K({ uniform: 'u_ru_flora', helmet: 'h_boonie', face: 'f_shemagh', armor: 'a_type56', boots: 'b_desert' }), K({ uniform: 'u_civ_hoodie', face: 'f_shemagh', gloves: 'g_black' })] },
  { id: 'breacher', n: 'Breacher', w: 18, d: 'Shotgun or SMG. Leaves its post and rushes you once it hears you.', rush: 14, speedK: 1.15,
    weapons: ['r870', 'saiga12', 'spas12', 'uzi', 'mac10', 'skorpion', 'mp5', 'aks74u', 'vityaz'],
    kits: [K({ uniform: 'u_civ_track', face: 'f_skull', gloves: 'g_black' }), K({ uniform: 'u_black', face: 'f_balaclava', armor: 'a_none', gloves: 'g_black' }), K({ uniform: 'u_civ_hoodie', face: 'f_balaclava' })] },
  { id: 'heavy', n: 'Juggernaut', w: 7, max: 2, d: 'Russian heavy armour with Granit plates and an Altyn visor. Rifle rounds bounce off the front.', hpK: 1.2, speedK: .7, crouch: false, burstK: 1.5,
    weapons: ['pkm', 'rpk', 'akm', 'saiga12'],
    kits: [K({ uniform: 'u_black', helmet: 'h_altyn', armor: 'a_6b43', plates: 'p_granit', gloves: 'g_black', boots: 'b_combat' }), K({ uniform: 'u_ru_gorka', helmet: 'h_lshz', armor: 'a_6b45', plates: 'p_granit', gloves: 'g_black' })] },
  { id: 'leader', n: 'Cell leader', w: 0, d: 'One per cell: ex-military, plate carrier, rifle plates, better trained.', tierUp: true,
    weapons: ['ak74m', 'ak12', 'm4a1', 'hk416', 'scarl', 'scarh', 'ak103'],
    kits: [K({ uniform: 'u_multicam', helmet: 'h_fast', face: 'f_glasses', comms: 'c_comtac', armor: 'a_jpc', plates: 'p_rf2', gloves: 'g_mechanix', boots: 'b_salomon' }),
      K({ uniform: 'u_ru_emr', helmet: 'h_6b47', comms: 'c_gssh', armor: 'a_6b45', plates: 'p_granit', gloves: 'g_black' })] },
];
G.HOSTILE_ROLE = Object.fromEntries(G.HOSTILE_ROLES.map(r => [r.id, r]));
// deal roles for a mission's posts: one leader, marksmen on the highest posts, the rest weighted at random
G.dealRoles = function (M, R) {
  const n = M.guards.length, out = new Array(n).fill(null), cnt = {};
  const order = M.guards.map((g, i) => i).sort((a, b) => M.guards[b][1] - M.guards[a][1] || Math.hypot(M.guards[b][0] - M.player.pos[0], M.guards[b][2] - M.player.pos[2]) - Math.hypot(M.guards[a][0] - M.player.pos[0], M.guards[a][2] - M.player.pos[2]));
  const nm = Math.max(1, Math.round(n * .14)); for (let k = 0; k < nm; k++) out[order[k]] = 'marksman';
  const free = () => out.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  const f = free(); out[f[Math.floor(R() * f.length)]] = 'leader';
  const pool = G.HOSTILE_ROLES.filter(r => r.w > 0 && r.id !== 'marksman'), tw = pool.reduce((s, r) => s + r.w, 0);
  for (const i of free()) { let x = R() * tw, r = pool[0]; for (const q of pool) { x -= q.w; if (x <= 0) { r = q; break; } } if (r.max && (cnt[r.id] || 0) >= r.max) r = G.HOSTILE_ROLE.rifleman; cnt[r.id] = (cnt[r.id] || 0) + 1; out[i] = r.id; }
  return out.map(id => G.HOSTILE_ROLE[id]);
};
G.TERROR_WEAPONS = ['akm', 'ak74', 'ak47', 'type56', 'aks74u', 'rpk', 'pkm', 'uzi', 'mac10', 'r870', 'svd', 'vz58', 'galil', 'g3', 'mp5', 'm16a1', 'skorpion'];
G.TERROR_NAMES = ['Viper', 'Jackal', 'Ghoul', 'Scorpion', 'Raven', 'Hyena', 'Cobra', 'Wolf', 'Crow', 'Mamba', 'Fox', 'Kestrel', 'Shade', 'Hound', 'Spider', 'Rat'];
})();
