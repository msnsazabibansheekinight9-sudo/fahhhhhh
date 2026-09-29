// ============================================================================
// Solo counter-terror missions: clear every hostile from a structure without
// hitting the hostages. Five multi-level sites (cargo ship, oil platform,
// embassy compound, dockside warehouse, night train) at four times of day.
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

// ------------------------------------------------------------------ missions
// guards: [x, y(floor), z, yaw, crouch?]; hostages: [x, y, z, yaw]
G.MISSIONS = [
  { id: 'ship', name: 'MV Ardent Star', loc: 'Cargo ship, Gulf of Aden', blurb: 'Pirates-turned-terrorists hold a container ship and its crew. Board at the bow, fight aft through the container stacks and take the bridge.',
    ground: 'mud', sea: true, weather: { night: 'rain' }, amb: 'wind', reverb: 'industrial',
    player: { pos: [0, 8, -42], yaw: PI },
    build(W) {
      W.bounds = 62; H.water(W);
      const hull = surf('red', 1), deckM = surf('metal', 12), white = surf('white', 2);
      W.box(0, 0, 0, 18, 5.7, 90, hull, 'metal'); H.slab(W, 0, 6, 0, 18, 90, deckM);
      W.box(0, 0, -47.5, 12, 7.7, 5, hull, 'metal'); W.box(0, 0, 47, 16, 5.7, 4, hull, 'metal'); // bow block, stern
      for (const s of [-1, 1]) H.rail(W, s * 8.95, -44, s * 8.95, 44, 6, 'white');
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
    player: { pos: [-13, 24.2, -13], yaw: -PI * .75 },
    build(W) {
      W.bounds = 40; H.water(W);
      for (const x of [-16, 16]) for (const z of [-16, 16]) { const l = new THREE.Mesh(gCylY(1.3, 1.6, 30, 12), surf('yellow')); l.position.set(x, 0, z); l.castShadow = true; W.static.add(l); W.addCol(V3(x - 1.4, -15, z - 1.4), V3(x + 1.4, 14, z + 1.4), 'metal'); }
      const deck = surf('metal', 10);
      H.slab(W, 0, 14, 0, 40, 40, deck); // main deck
      H.rail(W, -19.9, -19.9, 19.9, -19.9, 14); H.rail(W, -19.9, 19.9, 19.9, 19.9, 14); H.rail(W, -19.9, -19.9, -19.9, 19.9, 14); H.rail(W, 19.9, -19.9, 19.9, 19.9, 14);
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
    player: { pos: [0, 0, 36], yaw: 0 },
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
    player: { pos: [0, 0, 38], yaw: 0 },
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
    player: { pos: [5, 1.1, 44], yaw: 0 },
    build(W) {
      W.bounds = 50;
      H.slab(W, 2.05, 1.1, 0, 5.9, 96, surf('concrete', 12)); // platform (flush with the coach doors)
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
];
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
