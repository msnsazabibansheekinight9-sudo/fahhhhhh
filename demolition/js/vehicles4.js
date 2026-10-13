'use strict';
/* Crumble — fairground, farm and folkrace vehicles, AI traffic (buses, police, choppers), and the voxeliser that
   rebuilds every vehicle out of half-size blocks so damage chips pieces out of it. */

Object.assign(VTYPES, {
  // Misc
  bumper:    { name: 'Bumper car', cat: 'misc', L: 9, W: 6, H: 6, maxF: 12, maxR: 8, acc: 16, turn: 2.4, hp: 400, cam: 16, power: () => 0, bumper: true, color: 0xd8331c },
  tractor:   { name: 'Farm tractor', cat: 'misc', L: 16, W: 9, H: 11, maxF: 14, maxR: 7, acc: 12, turn: 1.2, hp: 420, cam: 24, power: s => s > 8 ? 2 : 1, climb: 4, color: 0x3e8a4a },
  // Folkrace: cheap cars stripped, caged and numbered for dirt racing
  rallywagon:{ name: 'Rally estate', cat: 'folk', L: 19, W: 8.2, H: 7, maxF: 36, maxR: 11, acc: 26, turn: 1.5, hp: 200, cam: 22, power: s => s > 20 ? 2 : 1, color: 0x2f4f8c, folk: 7, car: { h0: 1.8, bh: 2.6, hood: 0.28, boot: 0, cab: { z: 2.2, len: 11, h: 2.4, hatch: true }, boxy: true, wr: 1.8, tread: true, bullbar: true } },
  tuktuk:    { name: 'Auto rickshaw', cat: 'folk', L: 12, W: 6, H: 8, maxF: 22, maxR: 7, acc: 18, turn: 2, hp: 110, cam: 18, power: () => 1, color: 0xe2c02a, folk: 21 },
  buggy:     { name: 'Dune buggy', cat: 'folk', L: 14, W: 8, H: 6, maxF: 40, maxR: 12, acc: 32, turn: 1.8, hp: 140, cam: 20, power: () => 1, climb: 4, color: 0xe8781c, folk: 3 },
  rally4x4:  { name: 'Rally 4×4', cat: 'folk', L: 17, W: 8.6, H: 9, maxF: 34, maxR: 11, acc: 26, turn: 1.4, hp: 260, cam: 23, power: s => s > 18 ? 2 : 1, climb: 4, color: 0xe2c02a, folk: 44, car: { h0: 2.8, bh: 2.8, hood: 0.3, boot: 0, cab: { z: 1.6, len: 8, h: 2.6, open: true, frameOnly: true }, boxy: true, spare: true, bullbar: true, wr: 2.4, ww: 1.8, tread: true } },
  rallycoupe:{ name: 'Rally coupe', cat: 'folk', L: 17, W: 8.2, H: 6, maxF: 46, maxR: 12, acc: 34, turn: 1.7, hp: 160, cam: 21, power: s => s > 26 ? 2 : 1, color: 0x2f6aa8, folk: 12, car: { h0: 1.5, bh: 2.4, hood: 0.34, boot: 0.2, cab: { z: 1.4, len: 6.6, h: 2, fast: true }, spoiler: true, wr: 1.75, tread: true } },
  roadster:  { name: 'Little roadster', cat: 'folk', L: 14, W: 7.2, H: 5, maxF: 44, maxR: 12, acc: 34, turn: 1.9, hp: 110, cam: 19, power: () => 1, color: 0xe8e6de, folk: 9, car: { h0: 1.2, bh: 2.1, hood: 0.4, boot: 0.2, cab: { z: 1.6, len: 4.8, h: 1.6, open: true }, round: true, wr: 1.45 } },
  foodtruck: { name: 'Food truck', cat: 'folk', L: 21, W: 9, H: 12, maxF: 24, maxR: 8, acc: 13, turn: 1.0, hp: 240, cam: 28, power: s => s > 16 ? 2 : 1, color: 0xc4231c, work: 'Click rings the bell' },
  flowervan: { name: 'Flower-power van', cat: 'folk', L: 18, W: 8.4, H: 9.5, maxF: 26, maxR: 8, acc: 16, turn: 1.2, hp: 200, cam: 24, power: s => s > 18 ? 2 : 1, color: 0x6fb8d6, folk: 70 },
  campervan: { name: 'Camper van', cat: 'folk', L: 19, W: 8.6, H: 10, maxF: 24, maxR: 8, acc: 14, turn: 1.1, hp: 230, cam: 24, power: s => s > 18 ? 2 : 1, color: 0xe8e6de, folk: 33 },
  monsterbus:{ name: 'Monster school bus', cat: 'folk', L: 30, W: 13, H: 17, maxF: 26, maxR: 9, acc: 18, turn: 1.0, hp: 800, cam: 40, power: s => s > 10 ? 3 : 2, climb: 5, crush: true, color: 0xe8b81c, folk: 99 },
  couch:     { name: 'Couch kart', cat: 'folk', L: 10, W: 7, H: 6, maxF: 26, maxR: 8, acc: 22, turn: 2, hp: 90, cam: 17, power: () => 0, color: 0x7a3a5a, folk: 1 },
  bathtub:   { name: 'Bathtub racer', cat: 'folk', L: 11, W: 6.4, H: 5, maxF: 30, maxR: 8, acc: 24, turn: 1.9, hp: 100, cam: 17, power: () => 0, color: 0xf2f2f0, folk: 8 },
  trolley:   { name: 'Shopping-trolley kart', cat: 'folk', L: 9, W: 5.6, H: 7, maxF: 22, maxR: 8, acc: 22, turn: 2.2, hp: 70, cam: 16, power: () => 0, color: 0xa0a6ac, folk: 5 },
  // AI traffic and security
  bus:       { name: 'City bus', cat: 'ai', L: 46, W: 10.5, H: 13, maxF: 18, maxR: 6, acc: 7, turn: 0.7, hp: 900, cam: 46, power: s => s > 10 ? 2 : 1, color: 0xc4231c },
  police:    { name: 'Police car', cat: 'ai', L: 19, W: 8.4, H: 7.5, maxF: 40, maxR: 12, acc: 28, turn: 1.5, hp: 260, cam: 22, power: s => s > 18 ? 2 : 1, color: 0x1c2a4a, car: { h0: 1.7, bh: 2.6, hood: 0.3, boot: 0.24, cab: { z: 0.8, len: 7.4, h: 2.4 }, bullbar: true, wr: 1.75 } },
  chopper:   { name: 'Security helicopter', cat: 'ai', L: 32, W: 7, H: 10, maxF: 44, maxR: 15, acc: 30, turn: 1.4, hp: 500, cam: 38, power: () => 0, air: true, color: 0x14161a },
  minicopter:{ name: 'Small helicopter', cat: 'ai', L: 22, W: 5, H: 8, maxF: 34, maxR: 12, acc: 26, turn: 1.6, hp: 180, cam: 30, power: () => 0, air: true, color: 0xe2c02a },
  getaway:   { name: 'Getaway van', cat: 'ai', L: 20, W: 9, H: 10, maxF: 30, maxR: 9, acc: 18, turn: 1.1, hp: 300, cam: 26, power: s => s > 18 ? 2 : 1, color: 0x2a2c30 }
});

// Folkrace dressing for any body: roll cage, race number boards, a mismatched door and a mud skirt.
VModel.folk = function (v, num) {
  const M = v.M, g = v.mesh, T = v.T, W = T.W, L = T.L, B = this.box.bind(this);
  const top = (T.car ? T.car.h0 + T.car.bh : 3) , hgt = Math.min(T.H - 0.5, top + 3.2);
  const cage = new THREE.MeshLambertMaterial({ color: 0x9aa0a6 });
  for (const sx of [-1, 1]) { B(g, 0.3, hgt - top, 0.3, sx * (W / 2 - 1), (top + hgt) / 2, -1.5, cage); B(g, 0.3, hgt - top, 0.3, sx * (W / 2 - 1), (top + hgt) / 2, 2.5, cage); B(g, 0.3, 0.3, 4.2, sx * (W / 2 - 1), hgt, 0.5, cage); }
  B(g, W - 1.8, 0.3, 0.3, 0, hgt, -1.5, cage); B(g, W - 1.8, 0.3, 0.3, 0, hgt, 2.5, cage);
  const plate = new THREE.MeshLambertMaterial({ color: 0xf2f2ee }), ink = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const sx of [-1, 1]) {
    B(g, 0.12, 2, 2.6, sx * (W / 2 + 0.08), (T.car ? T.car.h0 : 1.5) + 1.4, 0.4, plate);
    const d = String(num).split('');
    d.forEach((c, i) => { B(g, 0.14, 1.4, 0.3, sx * (W / 2 + 0.1), (T.car ? T.car.h0 : 1.5) + 1.4, 0.4 + (i - (d.length - 1) / 2) * 0.9 - 0.2, ink); B(g, 0.14, 0.3, 0.7, sx * (W / 2 + 0.1), (T.car ? T.car.h0 : 1.5) + 2, 0.4 + (i - (d.length - 1) / 2) * 0.9, ink); });
  }
  const odd = new THREE.MeshLambertMaterial({ color: [0x3e8a4a, 0xe8e6de, 0xd8331c, 0x2f6aa8][num % 4] });
  B(g, 0.1, (T.car ? T.car.bh : 2) * 0.8, 3.2, (num % 2 ? 1 : -1) * (W / 2 + 0.04), (T.car ? T.car.h0 : 1) + (T.car ? T.car.bh : 2) * 0.45, -1.2, odd);
  B(g, W + 0.1, 0.8, L * 0.8, 0, (T.car ? T.car.h0 : 1) + 0.3, 0, new THREE.MeshLambertMaterial({ color: 0x5a4632 }));
};

VModel.build4 = function (v, type) {
  const T = VTYPES[type], M = v.M, g = v.mesh, W = T.W, L = T.L, B = this.box.bind(this), C = this.cyl.bind(this);
  const piv = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  const axles = (zs, r, w, opts) => { for (const s of [-1, 1]) zs.forEach((z, i) => this.wheel(v, M, s * (W / 2 - (opts && opts.inset || 0.9)), z, r, w, i === 0, opts)); };
  const van = (h0, bodyH, roofMat) => {
    B(g, W, bodyH, L - 1, 0, h0 + bodyH / 2, 0.4, M.paint);
    B(g, W - 0.6, 2, 3.4, 0, h0 + 1.2, -L / 2 + 1.8, M.paint);
    B(g, W - 0.4, bodyH * 0.36, 0.3, 0, h0 + bodyH * 0.66, -L / 2 + 3.5, M.glass, -0.25);
    for (const s of [-1, 1]) { B(g, 0.2, bodyH * 0.34, L * 0.5, s * (W / 2 + 0.02), h0 + bodyH * 0.66, 0, M.glass); this.mirror(g, M, s * W / 2, h0 + bodyH * 0.6, -L / 2 + 4.2, s); B(g, 0.06, bodyH * 0.8, 0.1, s * (W / 2 + 0.03), h0 + bodyH / 2, -2, M.dark); }
    B(g, W, 0.4, L - 1.4, 0, h0 + bodyH + 0.2, 0.4, roofMat || M.paint2);
    B(g, W, 0.9, 0.7, 0, h0 + 0.4, -L / 2 + 0.1, M.chrome); B(g, W, 0.9, 0.7, 0, h0 + 0.4, L / 2 + 0.4, M.chrome);
    this.lights(g, M, W, h0 + 1.4, -L / 2 + 0.2, L / 2 + 0.6, { round: true });
    this.seats(g, M, W, h0 + 1.6, [-L / 2 + 6]); this.steering(g, M, -W * 0.22, h0 + 2.8, -L / 2 + 4.5);
  };
  if (T.car) { this.car(v, T.car); if (T.folk) this.folk(v, T.folk); if (type === 'police') this.policeKit(v); return true; }
  if (type === 'bumper') {
    C(g, W / 2, W / 2, 1.4, 0, 1, 0, M.rubber || M.tire, 'y', 20); g.children[g.children.length - 1].scale.set(1, 1, L / W);
    B(g, W - 1.4, 1.6, L - 2.4, 0, 2.4, 0.4, M.paint); B(g, W - 2, 2.4, 2, 0, 3.6, 2.6, M.paint2);
    B(g, W - 2.4, 0.8, 3, 0, 3.4, 0.6, M.seat); this.steering(g, M, 0, 3.6, -1.6);
    B(g, 0.3, 12, 0.3, 0, 9, 3.2, M.steel); B(g, 1, 0.3, 0.3, 0, 15, 3.2, M.chrome);
    C(g, 0.9, 0.9, 0.5, 0, 2.8, -L / 2 + 1, M.head, 'z');
    axles([-L / 2 + 2.4, L / 2 - 2.4], 0.6, 0.6, { inset: 1.2, spokes: 3 });
  } else if (type === 'tractor') {
    B(g, 4.4, 3, 8, 0, 4, -3.4, M.paint); B(g, 3.6, 0.6, 7.4, 0, 5.8, -3.4, M.paint2);
    for (let k = 0; k < 5; k++) B(g, 4.5, 0.15, 0.2, 0, 3.4 + k * 0.5, -7.45, M.black);
    C(g, 0.35, 0.35, 4.4, 1.4, 8, -4, M.black); C(g, 0.5, 0.5, 0.6, 1.4, 10.4, -4, M.chrome);
    B(g, 6, 1.4, 6, 0, 4, 3, M.paint); B(g, 5.6, 0.4, 5.6, 0, 11, 3, M.paint2);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(g, 0.3, 6, 0.3, x * 2.7, 8, 3 + z * 2.6, M.black);
    B(g, 5.4, 4.2, 0.2, 0, 7.6, 0.4, M.glass); B(g, 0.2, 4.2, 5, 2.8, 7.6, 3, M.glass); B(g, 0.2, 4.2, 5, -2.8, 7.6, 3, M.glass);
    this.seats(g, M, 4, 5, [3.4]); this.steering(g, M, 0, 6.4, 1.6);
    B(g, 6.6, 0.4, 3, 0, 3, L / 2 - 0.6, M.steel); B(g, 1.2, 1.2, 1.4, 0, 2.6, L / 2 + 0.6, M.dark);
    this.lights(g, M, 4.4, 4.6, -7.6, L / 2, { hw: 0.7, hh: 0.6 });
    for (const s of [-1, 1]) { this.wheel(v, M, s * 3.2, -5, 1.9, 1.3, true, { tread: true, rim: 0.6, rimMat: M.yellow }); this.wheel(v, M, s * 4.0, 3.6, 3.6, 2.2, false, { tread: true, rim: 0.55, rimMat: M.yellow, spokes: 8 }); B(g, 2.6, 0.3, 5.6, s * 4, 7.4, 3.6, M.paint); }
  } else if (type === 'tuktuk') {
    B(g, 3, 2.2, 3, 0, 2.6, -L / 2 + 2, M.paint); B(g, W - 0.6, 1.4, 6, 0, 2.2, 2, M.paint);
    B(g, W - 0.8, 0.8, 3.6, 0, 3.2, 3, M.seat);
    for (const [x, z] of [[-1, -3], [1, -3], [-1, 4.6], [1, 4.6]]) B(g, 0.25, 5.4, 0.25, x * (W / 2 - 0.4), 5.4, z, M.black);
    B(g, W + 0.4, 0.4, 9, 0, 8.1, 0.8, new THREE.MeshLambertMaterial({ color: 0x1c1c22 })); B(g, W - 0.6, 3, 0.15, 0, 5.4, -L / 2 + 2.2, M.glass, -0.2);
    for (let k = 0; k < 6; k++) B(g, 0.6, 0.6, 0.15, -W / 2 + 0.7 + k, 7.6, -3.6, [M.tail, M.amber, M.head][k % 3]);
    this.steering(g, M, 0, 4.4, -2.6); C(g, 0.5, 0.5, 0.4, 0, 3.4, -L / 2 + 0.3, M.head, 'z');
    this.wheel(v, M, 0, -L / 2 + 2, 1.2, 1, true); for (const s of [-1, 1]) this.wheel(v, M, s * (W / 2 - 0.6), 3.6, 1.2, 1, false);
    this.folk(v, T.folk);
  } else if (type === 'buggy') {
    const tube = new THREE.MeshLambertMaterial({ color: 0x2a2c30 });
    B(g, 4, 0.8, L - 3, 0, 2.2, 0.6, M.paint); B(g, 3.6, 1.4, 4, 0, 3, -L / 2 + 2.6, M.paint, -0.2);
    const pts = [[-2, 2.6, -3], [2, 2.6, -3], [-2, 2.6, 3], [2, 2.6, 3]];
    for (const [x, y, z] of pts) B(g, 0.35, 4.6, 0.35, x, y + 2.3, z, tube);
    for (const z of [-3, 3]) B(g, 4.4, 0.35, 0.35, 0, 7.2, z, tube); for (const x of [-2, 2]) B(g, 0.35, 0.35, 6.4, x, 7.2, 0, tube);
    this.seats(g, M, 4, 2.6, [0.4]); this.steering(g, M, -0.8, 4, -1.4);
    B(g, 3, 2, 3, 0, 3.2, L / 2 - 1.6, M.dark); C(g, 0.3, 0.3, 2, 1.2, 4.4, L / 2 - 0.4, M.chrome, 'z');
    for (const s of [-1, 1]) B(g, 0.8, 0.8, 0.3, s * 1.2, 4.6, -L / 2 + 0.8, M.head);
    axles([-L / 2 + 2.6, L / 2 - 2.6], 1.9, 1.6, { tread: true, inset: 0.4, spokes: 5 });
    this.folk(v, T.folk);
  } else if (type === 'foodtruck') {
    van(2.6, 8.6);
    for (const s of [1]) { B(g, 0.15, 3.6, 9, s * (W / 2 + 0.02), 7.6, 2, M.dark); B(g, 1.8, 0.25, 9.4, s * (W / 2 + 0.9), 5.6, 2, M.chrome); B(g, 2.6, 0.2, 10, s * (W / 2 + 1.2), 10, 2, new THREE.MeshLambertMaterial({ color: 0xf2f2ee })); }
    B(g, W - 1, 2.4, 9, 0, 13.6, 1.4, new THREE.MeshLambertMaterial({ color: 0xf2c02a })); B(g, 0.1, 1.6, 7, -W / 2 + 0.44, 13.6, 1.4, new THREE.MeshLambertMaterial({ color: 0xc4231c }));
    C(g, 0.4, 0.4, 2, -2, 12, 6, M.chrome);
    axles([-L / 2 + 3.4, L / 2 - 3.6], 1.9, 1.5);
  } else if (type === 'flowervan' || type === 'campervan') {
    van(2.4, 6.2, type === 'campervan' ? M.plate : M.paint2);
    if (type === 'flowervan') { const fl = [0xe2588c, 0xf2c02a, 0xe8781c, 0x8ad62a, 0xa83c8c]; for (let k = 0; k < 14; k++) for (const s of [-1, 1]) B(g, 0.12, 1.2, 1.2, s * (W / 2 + 0.05), 3.2 + (k % 3) * 1.8, -6 + (k * 7 % 13), new THREE.MeshLambertMaterial({ color: fl[k % 5] })); }
    else { B(g, W - 0.8, 2.2, L * 0.55, 0, 10.2, 1.4, new THREE.MeshLambertMaterial({ color: 0xe8781c })); B(g, W - 1, 0.3, L * 0.6, 0, 11.3, 1.4, M.plate); B(g, 0.4, 0.4, 3, W / 2 - 0.2, 9, 4, M.black); }
    axles([-L / 2 + 3.6, L / 2 - 3.6], 1.8, 1.4, { spokes: 4, rimMat: M.plate });
    this.folk(v, T.folk);
  } else if (type === 'monsterbus') {
    const h0 = 7;
    B(g, W - 3, 7, L - 2, 0, h0 + 3.5, 0, M.paint); B(g, W - 3.4, 3, 4, 0, h0 + 1.5, -L / 2 + 1, M.paint);
    for (let k = 0; k < 7; k++) for (const s of [-1, 1]) B(g, 0.15, 2.4, 2.6, s * ((W - 3) / 2 + 0.02), h0 + 4.8, -L / 2 + 6 + k * 3.2, M.glass);
    B(g, W - 3.6, 2.6, 0.2, 0, h0 + 4.8, -L / 2 + 3.1, M.glass);
    for (const s of [-1, 1]) B(g, 0.1, 0.5, L - 4, s * ((W - 3) / 2 + 0.06), h0 + 2.6, 0, M.black);
    B(g, W - 3, 0.5, L - 2, 0, h0 + 7.2, 0, M.plate);
    for (const s of [-1, 1]) for (const z of [-L * 0.32, L * 0.32]) { C(g, 0.4, 0.4, 5, s * 3.2, h0 - 2, z, M.chrome, 'y'); }
    this.lights(g, M, W - 3, h0 + 1.4, -L / 2 - 1, L / 2);
    for (const s of [-1, 1]) for (const [z, f] of [[-L * 0.32, true], [L * 0.32, false]]) this.wheel(v, M, s * (W / 2 - 1.8), z, 4.6, 3.4, f, { tread: true, rim: 0.48, rimMat: M.chrome, spokes: 6 });
    this.folk(v, T.folk);
  } else if (type === 'couch') {
    const fab = new THREE.MeshLambertMaterial({ color: 0x7a3a5a }), fab2 = new THREE.MeshLambertMaterial({ color: 0x5c2a44 });
    B(g, 1.2, 0.5, L - 1, -2.2, 1.2, 0, M.steel); B(g, 1.2, 0.5, L - 1, 2.2, 1.2, 0, M.steel);
    B(g, W - 0.6, 1.6, 4.6, 0, 2.4, 1.4, fab); B(g, W - 0.6, 3.6, 1.4, 0, 3.6, 3.6, fab2); for (const s of [-1, 1]) B(g, 1, 2.6, 4.6, s * (W / 2 - 0.8), 3.2, 1.4, fab2);
    for (let k = 0; k < 3; k++) B(g, (W - 2.8) / 3 - 0.2, 0.6, 3.6, -((W - 2.8) / 3) + k * ((W - 2.8) / 3), 3.5, 1.1, fab);
    this.steering(g, M, 0, 4, -1.6); B(g, 0.3, 2, 0.3, 0, 3, -1.9, M.steel);
    C(g, 0.6, 0.6, 0.4, 0, 2, -L / 2 + 0.3, M.head, 'z');
    axles([-L / 2 + 1.6, L / 2 - 1.6], 1, 0.9, { inset: 0.5, spokes: 4 });
    this.folk(v, T.folk);
  } else if (type === 'bathtub') {
    const enamel = new THREE.MeshPhongMaterial({ color: 0xf2f2f0, shininess: 90 });
    B(g, W - 1, 0.6, L - 2, 0, 1.4, 0, M.steel);
    B(g, W - 0.6, 2.8, L - 1.2, 0, 3.2, 0.2, enamel); B(g, W - 1.8, 0.4, L - 2.4, 0, 4.5, 0.2, new THREE.MeshLambertMaterial({ color: 0x6fb8d6 }));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) C(g, 0.4, 0.2, 1, x * (W / 2 - 1), 1.6, z * (L / 2 - 1.6), M.chrome, 'y');
    C(g, 0.2, 0.2, 2, 0, 5.4, L / 2 - 1, M.chrome); B(g, 1.6, 0.2, 0.2, 0, 6.4, L / 2 - 1, M.chrome);
    this.steering(g, M, 0, 5, -L / 2 + 2.4);
    axles([-L / 2 + 1.8, L / 2 - 1.8], 1, 0.9, { inset: 0.4, spokes: 4 });
    this.folk(v, T.folk);
  } else if (type === 'trolley') {
    const wire = new THREE.MeshLambertMaterial({ color: 0xa0a6ac });
    for (let k = 0; k < 6; k++) { B(g, 0.15, 3.6, 6, -W / 2 + 0.6 + k * (W - 1.2) / 5, 4.4, 0.6, wire); }
    for (let k = 0; k < 5; k++) { B(g, W - 1, 0.15, 0.15, 0, 2.8 + k * 0.8, 3.6, wire); B(g, W - 1, 0.15, 0.15, 0, 2.8 + k * 0.8, -2.4, wire); B(g, 0.15, 0.15, 6, -W / 2 + 0.5, 2.8 + k * 0.8, 0.6, wire); B(g, 0.15, 0.15, 6, W / 2 - 0.5, 2.8 + k * 0.8, 0.6, wire); }
    B(g, W - 1, 0.3, 6, 0, 2.6, 0.6, wire); B(g, W, 0.5, 0.5, 0, 6.6, 4, new THREE.MeshLambertMaterial({ color: 0xc4231c }));
    B(g, W - 1, 0.6, L - 1, 0, 1.4, 0, M.dark); this.seats(g, M, 4, 3, [0.6]);
    axles([-L / 2 + 1.4, L / 2 - 1.4], 0.8, 0.7, { inset: 0.4, spokes: 3 });
    this.folk(v, T.folk);
  } else if (type === 'bus' || type === 'getaway') {
    if (type === 'getaway') { van(2.6, 6.8); for (const s of [-1, 1]) B(g, 0.1, 5, 7, s * (W / 2 + 0.04), 6, 3, M.dark); axles([-L / 2 + 3.6, L / 2 - 3.6], 1.9, 1.5); return true; }
    const h0 = 2;
    B(g, W, 10, L - 1, 0, h0 + 5.4, 0, M.paint); B(g, W + 0.05, 2.2, L - 1.2, 0, h0 + 1.4, 0, M.plate);
    for (let k = 0; k < 9; k++) for (const s of [-1, 1]) B(g, 0.15, 3.6, 3.8, s * (W / 2 + 0.03), h0 + 6.8, -L / 2 + 6 + k * 4.4, M.glass);
    B(g, W - 0.4, 5.6, 0.3, 0, h0 + 6, -L / 2 + 0.3, M.glass); B(g, W - 1, 1.2, 0.3, 0, h0 + 9.8, -L / 2 + 0.3, M.black);
    for (const z of [-L / 2 + 4, 0]) B(g, 0.1, 7.4, 3, W / 2 + 0.05, h0 + 4.6, z, M.glass);
    for (let k = 0; k < 8; k++) B(g, W - 2, 0.8, 1.4, 0, h0 + 2.6, -L / 2 + 8 + k * 4.4, M.seat);
    B(g, W, 0.6, L - 4, 0, h0 + 10.6, 0, M.plate); B(g, W - 4, 1.2, 8, 0, h0 + 11.4, L / 2 - 6, M.dark);
    for (const s of [-1, 1]) this.mirror(g, M, s * (W / 2), h0 + 8, -L / 2 + 1, s);
    this.lights(g, M, W, h0 + 1.4, -L / 2 - 0.1, L / 2 + 0.1, { ty: h0 + 2.2 });
    axles([-L / 2 + 6, L / 2 - 9, L / 2 - 4.6], 2.3, 1.7, { spokes: 8 });
  } else if (type === 'chopper' || type === 'minicopter') {
    this.build2(v, 'heli');
    if (type === 'minicopter') { v.mesh.scale.set(0.72, 0.72, 0.72); }
    else { const sp = piv(g, 0, 1.2, -6.4); C(sp, 0.8, 1, 1.2, 0, 0, 0, M.chrome, 'z'); v.searchPivot = sp; for (const s of [-1, 1]) B(g, 0.5, 0.3, 0.3, s * 3, 5.6, -1, s > 0 ? M.head : M.tail); }
  }
  return true;
};

VModel.policeKit = function (v) {
  const g = v.mesh, M = v.M, T = v.T, W = T.W, B = this.box.bind(this);
  const top = T.car.h0 + T.car.bh + T.car.cab.h + 0.6;
  const red = new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x880000 }), blue = new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x000088 });
  B(g, W - 2.4, 0.5, 1.4, 0, top, T.car.cab.z, M.black); B(g, (W - 2.6) / 2, 0.6, 1.2, -(W - 2.6) / 4, top + 0.5, T.car.cab.z, red); B(g, (W - 2.6) / 2, 0.6, 1.2, (W - 2.6) / 4, top + 0.5, T.car.cab.z, blue);
  const stripe = new THREE.MeshLambertMaterial({ color: 0xf2f2ee });
  for (const s of [-1, 1]) B(g, 0.08, 0.9, T.L * 0.8, s * (W / 2 + 0.06), T.car.h0 + T.car.bh * 0.5, 0, stripe);
  v.lightbar = [red, blue];
};

// Model hook: Vehicle's constructor calls build, build2 and build3; build3 returns for car types, so build4 runs from here.
const baseBuild3 = VModel.build3;
VModel.build3 = function (v, type) { if (VModel.build4Types.has(type)) return this.build4(v, type); return baseBuild3.call(this, v, type); };
VModel.build4Types = new Set(['bumper', 'tractor', 'rallywagon', 'tuktuk', 'buggy', 'rally4x4', 'rallycoupe', 'roadster', 'foodtruck', 'flowervan', 'campervan', 'monsterbus', 'couch', 'bathtub', 'trolley', 'bus', 'police', 'chopper', 'minicopter', 'getaway']);

// ---------- voxeliser: every rigid part (each THREE.Group) is rebuilt from blocks half a world voxel across
const VRES = 0.5;
const VoxCache = new Map();
const voxMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const voxGlass = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false });

function voxelizeVehicle(v) {
  v.root.updateMatrixWorld(true);
  const owners = new Map(), order = [];
  v.mesh.traverse(o => {
    if (!o.isMesh) return;
    let p = o.parent; while (p && p !== v.mesh && !p.isGroup) p = p.parent;
    if (!owners.has(p)) { owners.set(p, []); order.push(p); }
    owners.get(p).push(o);
  });
  const key = v.type + '|' + v.colorKey;
  const cached = VoxCache.get(key);
  v.vox = [];
  order.forEach((grp, gi) => {
    let data;
    if (cached && cached[gi]) data = cached[gi];
    else {
      const inv = new THREE.Matrix4().copy(grp.matrixWorld).invert(), cells = new Map(), tmp = new THREE.Vector3(), A = new THREE.Vector3(), Bv = new THREE.Vector3(), Cv = new THREE.Vector3();
      for (const m of owners.get(grp)) {
        const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry, pos = geo.attributes.position;
        const mat = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
        const c = m.material.color ? m.material.color : new THREE.Color(0x888888);
        const glow = m.material.emissive && m.material.emissive.getHex() ? 1 : 0, glass = m.material.transparent ? 1 : 0;
        for (let i = 0; i < pos.count; i += 3) {
          A.fromBufferAttribute(pos, i).applyMatrix4(mat); Bv.fromBufferAttribute(pos, i + 1).applyMatrix4(mat); Cv.fromBufferAttribute(pos, i + 2).applyMatrix4(mat);
          const n = Math.max(1, Math.ceil(Math.max(A.distanceTo(Bv), Bv.distanceTo(Cv), Cv.distanceTo(A)) / (VRES * 0.45)));
          for (let a = 0; a <= n; a++) for (let b = 0; b <= n - a; b++) {
            const u = a / n, w2 = b / n;
            tmp.set(A.x + (Bv.x - A.x) * u + (Cv.x - A.x) * w2, A.y + (Bv.y - A.y) * u + (Cv.y - A.y) * w2, A.z + (Bv.z - A.z) * u + (Cv.z - A.z) * w2);
            const cx = Math.floor(tmp.x / VRES), cy = Math.floor(tmp.y / VRES), cz = Math.floor(tmp.z / VRES), k = cx + ',' + cy + ',' + cz;
            const prev = cells.get(k);
            if (!prev || (prev.glass && !glass)) cells.set(k, { x: cx, y: cy, z: cz, r: c.r, g: c.g, b: c.b, glass, glow });
          }
        }
        if (geo !== m.geometry) geo.dispose();
      }
      data = { cells: [...cells.values()] };
      if (!cached) { if (!VoxCache.has(key)) VoxCache.set(key, []); VoxCache.get(key)[gi] = data; }
    }
    for (const m of owners.get(grp)) { m.parent.remove(m); }
    // Identical vehicles share one block mesh per part until the first time one of them is damaged.
    if (!data.geos) { const tmp = { grp: new THREE.Group(), cells: new Map(data.cells.map(c => [c.x + ',' + c.y + ',' + c.z, c])), meshes: [] }; buildVoxMesh(tmp); data.geos = tmp.meshes.map(m => [m.geometry, m.material]); }
    const part = { grp, cells: null, meshes: [], data };
    for (const [geo, mat] of data.geos) { const m = new THREE.Mesh(geo, mat); m.castShadow = mat === voxMat; m.receiveShadow = true; grp.add(m); part.meshes.push(m); }
    part.sharedGeo = true;
    v.vox.push(part);
  });
}

// A part's own editable copy of its blocks, made the first time it is damaged.
function ownCells(part) { if (!part.cells) part.cells = new Map(part.data.cells.map(c => [c.x + ',' + c.y + ',' + c.z, Object.assign({}, c)])); return part.cells; }
function buildVoxMesh(part) {
  for (const m of part.meshes) { part.grp.remove(m); if (!part.sharedGeo) m.geometry.dispose(); }
  part.sharedGeo = false;
  part.meshes = [];
  for (const glass of [0, 1]) {
    const pos = [], nor = [], col = [], idx = [];
    for (const c of part.cells.values()) {
      if (c.glass !== glass) continue;
      const shade = c.glow ? 1.25 : 0.88 + hash3(c.x, c.y, c.z) * 0.24 - (c.char ? 0.6 : 0);
      for (const F of FACES) {
        const n = part.cells.get((c.x + F.n[0]) + ',' + (c.y + F.n[1]) + ',' + (c.z + F.n[2]));
        if (n && (!n.glass || glass)) continue;
        const b = pos.length / 3;
        for (const q of F.c) { pos.push((c.x + q[0]) * VRES, (c.y + q[1]) * VRES, (c.z + q[2]) * VRES); nor.push(F.n[0], F.n[1], F.n[2]); col.push(c.r * shade, c.g * shade, c.b * shade); }
        idx.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
      }
    }
    if (!pos.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, glass ? voxGlass : voxMat); m.castShadow = !glass; m.receiveShadow = true;
    part.grp.add(m); part.meshes.push(m);
  }
}

// ---------- vehicle behaviour on top of the base class
const VP4 = Vehicle.prototype;
const baseUpdate4 = VP4.update, baseWork4 = VP4.work, baseDamage4 = VP4.damage, baseWreck4 = VP4.wreck;

// Knock blocks out around a world-space point; returns how many came off.
VP4.chipAt = function (p, r) {
  if (!this.vox) return 0;
  this.root.updateMatrixWorld(true);
  let removed = 0;
  for (const part of this.vox) {
    const inv = new THREE.Matrix4().copy(part.grp.matrixWorld).invert(), lp = p.clone().applyMatrix4(inv);
    const rr = r / VRES, cx = lp.x / VRES, cy = lp.y / VRES, cz = lp.z / VRES, gone = [];
    const sph = part.data.sphere || (part.data.sphere = (() => { let mx = 0; for (const c of part.data.cells) mx = Math.max(mx, Math.abs(c.x), Math.abs(c.y), Math.abs(c.z)); return (mx + 2); })());
    if (Math.abs(cx) > sph + rr && Math.abs(cy) > sph + rr && Math.abs(cz) > sph + rr) continue;
    for (const [k, c] of ownCells(part)) { const dx = c.x + 0.5 - cx, dy = c.y + 0.5 - cy, dz = c.z + 0.5 - cz; if (dx * dx + dy * dy + dz * dz < rr * rr + (hash3(c.x, c.y, c.z) - 0.5) * rr) gone.push(k); }
    if (!gone.length) continue;
    const wp = new THREE.Vector3();
    gone.forEach((k, i) => {
      const c = part.cells.get(k); part.cells.delete(k);
      if (i % 2 === 0) { wp.set((c.x + 0.5) * VRES, (c.y + 0.5) * VRES, (c.z + 0.5) * VRES).applyMatrix4(part.grp.matrixWorld); FX.chip(wp.x, wp.y, wp.z, c.r, c.g, c.b, (Math.random() - 0.5) * 14, 4 + Math.random() * 10, (Math.random() - 0.5) * 14, 0.4); }
    });
    removed += gone.length;
    buildVoxMesh(part);
  }
  return removed;
};
// Scorch everything (after a wreck or a fire).
VP4.char = function () { if (!this.vox) return; for (const part of this.vox) { for (const c of ownCells(part).values()) { c.r *= 0.22; c.g *= 0.2; c.b *= 0.19; c.glow = 0; } buildVoxMesh(part); } };
// Nearest point on the vehicle's box to p, in world space.
VP4.surfacePoint = function (p) {
  const lo = this.toLocal(p);
  lo.x = Math.max(-this.W / 2, Math.min(this.W / 2, lo.x)); lo.y = Math.max(0, Math.min(this.T.H, lo.y)); lo.z = Math.max(-this.L / 2, Math.min(this.L / 2, lo.z));
  const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
  return new THREE.Vector3(this.pos.x + lo.x * c + lo.z * s, this.pos.y + lo.y, this.pos.z - lo.x * s + lo.z * c);
};
VP4.damage = function (n, dir, at) {
  if (this.dead || n <= 0) return;
  if (this.vox) {
    const p = at || (dir ? this.pos.clone().add(new THREE.Vector3(0, this.T.H * 0.5, 0)).addScaledVector(dir, -Math.max(this.L, this.W) * 0.4) : null);
    if (p) this.chipAt(this.surfacePoint(p), Math.min(3.5, 0.4 + n / 40));
    this.hp -= n; this.wake();
    if (this.hp <= 0) this.wreck();
    return;
  }
  return baseDamage4.call(this, n, dir);
};
VP4.knockPart = function (dir) {
  // Wheels and work parts are the pieces that come off whole; panels chip instead.
  const cand = this.vox ? this.vox.filter(p => p.grp !== this.mesh && p.grp.parent && (p.cells ? p.cells.size : p.data.cells.length) > 4) : [];
  if (!cand.length) return;
  const part = cand[(Math.random() * cand.length) | 0];
  this.vox.splice(this.vox.indexOf(part), 1);
  const v = new THREE.Vector3((Math.random() - 0.5) * 14, 8 + Math.random() * 10, (Math.random() - 0.5) * 14); if (dir) v.addScaledVector(dir, 10);
  Shards.add(part.grp, v);
};
VP4.wreck = function () {
  if (this.dead) return;
  this.dead = true; this.speed = 0;
  if (Player.vehicle === this) Game.exitVehicle();
  this.held = null;
  this.char();
  for (let k = 0; k < 5; k++) this.chipAt(this.surfacePoint(this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * this.W, Math.random() * this.T.H, (Math.random() - 0.5) * this.L))), 1.4);
  const n = Math.min(4, this.wheels.length); for (let k = 0; k < n; k++) if (Math.random() < 0.6) this.knockPart();
  this.vy = 14; this.yawRate += (Math.random() - 0.5) * 3;
  Tools.explode(Game.world, this.pos.clone().add(new THREE.Vector3(0, 3, 0)), 5, 2);
  Fire.igniteSphere(Game.world, this.pos.x, this.pos.y + 1, this.pos.z, 6, 0.4);
  Game.toast(this.name + ' destroyed.');
};
VP4.lod = function (pp) {
  const d = Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z);
  this.root.visible = d < 460 + this.L;
};
VP4.detail = function () {};

VP4.update = function (dt, w, inp, driving) {
  if (driving) this.sleeping = false;
  const ai = !driving && this.ai && !this.dead;
  if (ai) this.ai.think(dt, w);
  const r = baseUpdate4.call(this, dt, w, ai ? this.ai.input : inp, driving || ai);
  // Water: anything that is not a boat floods, slows and stalls.
  if (!this.T.water && !this.T.air && !this.T.plane && this.pos.y < WATER_Y - 1.5) {
    this.speed *= Math.max(0, 1 - 2 * dt); this.push.multiplyScalar(Math.max(0, 1 - 2 * dt));
    if (this.vy < -2) this.vy = -2;
    this.drown = (this.drown || 0) + dt; if (this.drown > 3 && !this.dead) { this.hp -= dt * 30; if (this.hp <= 0) { this.dead = true; this.char(); if (Player.vehicle === this) Game.exitVehicle(); } }
    if (Math.random() < 0.2) FX.steam(this.pos.x, WATER_Y + 0.2, this.pos.z);
  }
  if (this.lightbar && (this.siren || driving)) { const on = Math.sin(performance.now() / 90) > 0; this.lightbar[0].emissive.setHex(on ? 0xff2020 : 0x220000); this.lightbar[1].emissive.setHex(on ? 0x000022 : 0x2040ff); }
  if (this.T.bumper) for (const o of Game.vehicles) if (o !== this && o.T.bumper && o.pos.distanceTo(this.pos) < 7) { const d = o.pos.clone().sub(this.pos).setY(0).normalize(); o.push.x += d.x * Math.abs(this.speed) * 0.8; o.push.y += d.z * Math.abs(this.speed) * 0.8; this.speed *= -0.5; o.wake(); if (Math.abs(this.speed) > 2) SFX.thump(this.pos, 0.4); }
  return r;
};
VP4.work = function (dt, w, inp) {
  if (this.type === 'foodtruck') { if (inp.mouse && inp.mouse[0] && this.cd <= 0) { this.cd = 1.2; SFX.tone(1320, 0.4, 0.2, 'triangle', 1, this.pos); setTimeout(() => SFX.tone(1320, 0.4, 0.2, 'triangle', 1, this.pos), 180); } return; }
  return baseWork4.call(this, dt, w, inp);
};

// ---------- AI drivers
// A road-following driver for buses and police, and a flyer for helicopters. They drive through the same physics.
class AIInput {
  constructor() { this.keys = new Set(); this.mouse = [false, false, false]; }
  key(c) { return this.keys.has(c); }
}
class RoadDriver {
  constructor(v, roads, opts) {
    this.v = v; this.roads = roads; this.input = new AIInput(); this.opts = opts || {};
    this.cruise = this.opts.cruise || v.T.maxF * 0.5; this.stuckT = 0; this.reverseT = 0; this.turnCd = 0;
    this.pickRoad();
  }
  pickRoad() {
    // Nearest road to where we are, heading the way we face.
    const p = this.v.pos; let best = null, bd = 1e9;
    for (const r of this.roads) {
      const lat = r.axis === 'x' ? p.z - (r.c + 3 + r.rw / 2) : p.x - (r.c + 3 + r.rw / 2), along = r.axis === 'x' ? p.x : p.z;
      const out = Math.max(0, r.a0 - along, along - r.a1), d = Math.abs(lat) + out;
      if (d < bd) { bd = d; best = r; }
    }
    this.road = best; if (!best) return;
    const [fx, fz] = this.v.fwd(); this.dir = best.axis === 'x' ? (fx >= 0 ? 1 : -1) : (fz >= 0 ? 1 : -1);
  }
  lane() { const r = this.road, mid = r.c + 3 + r.rw / 2, off = r.rw * 0.24; return r.axis === 'x' ? mid + this.dir * off : mid - this.dir * off; }
  target() { return this.opts.target ? this.opts.target() : null; }
  think(dt) {
    const v = this.v, I = this.input; I.keys.clear(); I.mouse[0] = false;
    if (!this.road) return;
    const r = this.road, p = v.pos, along = r.axis === 'x' ? p.x : p.z, lane = this.lane();
    const tgt = this.target();
    // Chasers leave the road once close and drive straight at the target.
    let hx, hz;
    if (tgt && Math.hypot(tgt.x - p.x, tgt.z - p.z) < 70) { hx = tgt.x - p.x; hz = tgt.z - p.z; }
    else if (r.axis === 'x') { hx = this.dir * 20; hz = (lane - p.z) * 1.2; } else { hx = (lane - p.x) * 1.2; hz = this.dir * 20; }
    const want = Math.atan2(-hx, -hz); let d = want - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    // At a junction, maybe turn (chasers turn toward the target).
    this.turnCd -= dt;
    if (this.turnCd <= 0) {
      for (const o of this.roads) {
        if (o === r || o.axis === r.axis) continue;
        const oc = o.c + 3 + o.rw / 2;
        const cross = r.axis === 'x' ? p.x : p.z, along2 = r.axis === 'x' ? p.z : p.x;
        if (Math.abs(cross - oc) < 3 && along2 >= o.a0 && along2 <= o.a1) {
          let take = Math.random() < 0.35, nd = Math.random() < 0.5 ? 1 : -1;
          if (tgt) { const delta = o.axis === 'x' ? tgt.x - p.x : tgt.z - p.z; take = Math.abs(delta) > 40; nd = Math.sign(delta) || 1; }
          if (take) { this.road = o; this.dir = nd; this.turnCd = 3; }
          break;
        }
      }
    }
    if (along > r.a1 - 10 && this.dir > 0 || along < r.a0 + 10 && this.dir < 0) { this.dir = -this.dir; this.turnCd = 1; }
    // Brake for anything ahead.
    const [fx, fz] = v.fwd(); let blocked = false;
    for (const o of Game.vehicles) if (o !== v && !o.T.air) { const dx = o.pos.x - p.x, dz = o.pos.z - p.z, ahead = dx * fx + dz * fz, side = Math.abs(dx * -fz + dz * fx); if (ahead > 0 && ahead < v.L * 0.6 + 14 && side < (v.W + o.W) * 0.5 && !(tgt && o === Player.vehicle)) blocked = true; }
    if (!Player.vehicle && !tgt) { const dx = Player.pos.x - p.x, dz = Player.pos.z - p.z, ahead = dx * fx + dz * fz; if (ahead > 0 && ahead < v.L * 0.6 + 10 && Math.abs(dx * -fz + dz * fx) < v.W) blocked = true; }
    const steer = Math.max(-1, Math.min(1, d * 2.5));
    if (this.reverseT > 0) { this.reverseT -= dt; I.keys.add('KeyS'); if (steer < 0) I.keys.add('KeyA'); else I.keys.add('KeyD'); return; }
    if (steer > 0.15) I.keys.add('KeyA'); else if (steer < -0.15) I.keys.add('KeyD');
    const cruise = tgt ? v.T.maxF * 0.85 : this.cruise * (Math.abs(d) > 0.6 ? 0.4 : 1);
    if (blocked) I.keys.add('Space'); else if (v.speed < cruise) I.keys.add('KeyW');
    if (!blocked && Math.abs(v.speed) < 1) { this.stuckT += dt; if (this.stuckT > 2.5) { this.stuckT = 0; this.reverseT = 1.5; } } else this.stuckT = 0;
  }
}
class Flyer {
  constructor(v, opts) { this.v = v; this.input = new AIInput(); this.opts = opts || {}; this.wp = null; this.t = 0; }
  think(dt) {
    const v = this.v, I = this.input; I.keys.clear(); I.mouse[0] = false;
    let tgt = this.opts.target ? this.opts.target() : null, alt = this.opts.alt || GY + 46;
    if (!tgt) { this.t -= dt; if (!this.wp || this.t <= 0 || Math.hypot(this.wp.x - v.pos.x, this.wp.z - v.pos.z) < 20) { this.wp = { x: 80 + Math.random() * (WORLD_X - 160), z: 80 + Math.random() * (WORLD_Z - 160) }; this.t = 40; } tgt = this.wp; }
    const dx = tgt.x - v.pos.x, dz = tgt.z - v.pos.z, dist = Math.hypot(dx, dz);
    const want = Math.atan2(-dx, -dz); let d = want - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    if (d > 0.1) I.keys.add('KeyA'); else if (d < -0.1) I.keys.add('KeyD');
    if (dist > (this.opts.hover || 10) && Math.abs(d) < 0.8) I.keys.add('KeyW');
    if (v.pos.y < alt - 2) I.keys.add('Space'); else if (v.pos.y > alt + 4) I.keys.add('KeyC');
    if (v.searchPivot && this.opts.target) { v.searchPivot.lookAt(new THREE.Vector3(tgt.x, GY, tgt.z)); }
  }
}

// Spawning: buses on roads, an ambient helicopter; police and the security helicopter when an alarm trips.
const Traffic = {
  setup(level) {
    this.level = level; this.chasers = [];
    const roads = (level.roads || []).filter(r => r.a1 - r.a0 > 120);
    if (!roads.length) return;
    let made = 0;
    for (let k = 0; k < 6 && made < 4; k++) {
      const r = roads[(k * 7) % roads.length], along = r.a0 + 40 + ((k * 97) % Math.max(1, r.a1 - r.a0 - 80)), mid = r.c + 3 + r.rw / 2;
      const x = r.axis === 'x' ? along : mid + r.rw * 0.24, z = r.axis === 'x' ? mid + r.rw * 0.24 : along;
      const v = new Vehicle(Game.scene, 'bus', x, z, r.axis === 'x' ? -Math.PI / 2 : Math.PI, { color: [0xc4231c, 0x2f6aa8, 0x3e8a4a][k % 3] });
      v.ai = new RoadDriver(v, roads, { cruise: 12 }); v.sleeping = false; Game.vehicles.push(v); made++;
    }
    const h = new Vehicle(Game.scene, 'minicopter', WORLD_X / 2, WORLD_Z / 2, 0, { y: GY + 40 }); h.rotorSpin = 1; h.ai = new Flyer(h, { alt: GY + 60 }); Game.vehicles.push(h);
  },
  alarm() {
    const L = this.level, roads = (L.roads || []).filter(r => r.a1 - r.a0 > 120);
    const tgt = () => Player.vehicle ? Player.vehicle.pos : Player.pos;
    if (roads.length) for (let k = 0; k < 3; k++) {
      // Police come in from the far end of a road away from the player.
      let r = roads[0], best = -1;
      for (const o of roads) { const mid = o.c + 3 + o.rw / 2, ex = o.axis === 'x' ? o.a0 + 20 : mid, ez = o.axis === 'x' ? mid : o.a0 + 20, d = Math.hypot(ex - Player.pos.x, ez - Player.pos.z); if (d > 200 && d < 500 && (best < 0 || Math.random() < 0.3)) { r = o; best = d; } }
      const mid = r.c + 3 + r.rw / 2, x = r.axis === 'x' ? r.a0 + 20 + k * 30 : mid, z = r.axis === 'x' ? mid : r.a0 + 20 + k * 30;
      const v = new Vehicle(Game.scene, 'police', x, z, r.axis === 'x' ? -Math.PI / 2 : Math.PI, {});
      v.siren = true; v.ai = new RoadDriver(v, roads, { target: tgt }); v.sleeping = false; Game.vehicles.push(v); this.chasers.push(v);
    }
    const c = new Vehicle(Game.scene, 'chopper', Player.pos.x + 300, Player.pos.z + 300, 0, { y: GY + 50 });
    c.rotorSpin = 1; c.ai = new Flyer(c, { target: tgt, alt: GY + 44, hover: 30 }); c.sleeping = false; Game.vehicles.push(c); this.chasers.push(c);
    c.spot = new THREE.SpotLight(0xfff6e0, 3, 160, 0.22, 0.5, 1); Game.scene.add(c.spot); Game.scene.add(c.spot.target);
    this.siren = true;
  },
  update(dt) {
    for (const c of this.chasers) if (c.spot) { c.spot.position.copy(c.pos).add(new THREE.Vector3(0, 1, 0)); const t = Player.vehicle ? Player.vehicle.pos : Player.pos; c.spot.target.position.copy(t); c.spot.intensity = c.dead ? 0 : 3; }
    if (this.siren && SFX.ctx) { this.sirenT = (this.sirenT || 0) - dt; if (this.sirenT <= 0) { this.sirenT = 0.8; const n = this.chasers.find(c => c.type === 'police' && !c.dead); if (n) { SFX.tone(this.hi ? 960 : 720, 0.75, 0.18, 'sawtooth', this.hi ? 0.75 : 1.33, n.pos); this.hi = !this.hi; } } }
  },
  clear() { for (const c of this.chasers || []) if (c.spot) { Game.scene.remove(c.spot); Game.scene.remove(c.spot.target); } this.chasers = []; this.siren = false; }
};
