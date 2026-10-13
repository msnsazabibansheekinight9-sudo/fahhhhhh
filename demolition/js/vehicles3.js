'use strict';
/* Crumble — the full fleet: civilian cars from a parametric body builder, industrial and utility machines,
   military vehicles, boats and aircraft; fixed-wing flight, lifts you can stand in, parked-vehicle merging. */

// ---------- types
Object.assign(VTYPES, {
  // Civilian
  classic:  { name: 'Finned convertible', cat: 'civ', L: 22, W: 8.6, H: 5.6, maxF: 32, maxR: 10, acc: 18, turn: 1.3, hp: 150, cam: 23, power: s => s > 22 ? 2 : 1, color: 0xe79bc0, car: { h0: 1.5, bh: 2.4, hood: 0.34, boot: 0.3, cab: { z: 1.4, len: 6, h: 1.6, open: true, soft: true }, fins: true, chrome: true, whitewall: true, round: true, wr: 1.6 } },
  vintage:  { name: 'Fifties saloon', cat: 'civ', L: 19, W: 8.2, H: 7, maxF: 28, maxR: 10, acc: 16, turn: 1.3, hp: 160, cam: 22, power: s => s > 22 ? 2 : 1, color: 0x8db48a, car: { h0: 1.7, bh: 2.8, hood: 0.32, boot: 0.24, cab: { z: 1, len: 7.4, h: 2.4, round: true }, chrome: true, whitewall: true, round: true, wr: 1.7 } },
  coupe:    { name: 'Touring coupe', cat: 'civ', L: 18, W: 8.4, H: 5.8, maxF: 46, maxR: 13, acc: 32, turn: 1.7, hp: 120, cam: 21, power: s => s > 28 ? 2 : 1, color: 0xc4231c, car: { h0: 1.3, bh: 2.3, hood: 0.36, boot: 0.2, cab: { z: 1.6, len: 6.4, h: 1.9, fast: true }, livery: 6, spoiler: true, wr: 1.65, rim: 0.72, spokes: 10 } },
  hatch:    { name: 'Boxy hatchback', cat: 'civ', L: 15, W: 7.6, H: 6.6, maxF: 30, maxR: 10, acc: 22, turn: 1.6, hp: 120, cam: 20, power: s => s > 22 ? 2 : 1, color: 0xb8261c, car: { h0: 1.5, bh: 2.5, hood: 0.26, boot: 0, cab: { z: 1.8, len: 8.6, h: 2.6, hatch: true }, boxy: true, wr: 1.5 } },
  offroad:  { name: 'Utility 4×4', cat: 'civ', L: 18, W: 8.4, H: 9, maxF: 28, maxR: 10, acc: 20, turn: 1.3, hp: 220, cam: 23, power: s => s > 18 ? 2 : 1, climb: 3.5, color: 0x7d9488, car: { h0: 2.6, bh: 2.8, hood: 0.3, boot: 0, cab: { z: 2, len: 10, h: 3.2, hatch: true }, boxy: true, spare: true, rack: true, snorkel: true, bullbar: true, wr: 2.2, ww: 1.7, tread: true } },
  supercar: { name: 'Wedge supercar', cat: 'civ', L: 19, W: 9, H: 5, maxF: 56, maxR: 14, acc: 40, turn: 1.8, hp: 110, cam: 22, power: s => s > 32 ? 2 : 1, color: 0x8ad62a, car: { h0: 1.1, bh: 2.0, hood: 0.42, boot: 0.22, cab: { z: 1.2, len: 6, h: 1.6, fast: true }, wedge: true, spoiler: true, intakes: true, wr: 1.6, rim: 0.74, spokes: 10 } },
  cruiser:  { name: 'Chrome cruiser', cat: 'civ', L: 21, W: 8.6, H: 6.4, maxF: 32, maxR: 10, acc: 18, turn: 1.25, hp: 160, cam: 23, power: s => s > 22 ? 2 : 1, color: 0x1f4f9c, car: { h0: 1.6, bh: 2.5, hood: 0.33, boot: 0.28, cab: { z: 0.8, len: 7, h: 2.1, roofPaint: 6 }, fins: true, chrome: true, whitewall: true, round: true, wr: 1.65 } },
  suv:      { name: 'Big SUV', cat: 'civ', L: 20, W: 9, H: 9, maxF: 32, maxR: 10, acc: 22, turn: 1.3, hp: 240, cam: 24, power: s => s > 18 ? 2 : 1, climb: 3, color: 0xe8e6de, car: { h0: 2.4, bh: 3, hood: 0.28, boot: 0, cab: { z: 1.4, len: 11, h: 3, hatch: true }, livery: 8, boxy: true, rack: true, wr: 2.1, tread: true } },
  wagon:    { name: 'Estate wagon', cat: 'civ', L: 19, W: 8.2, H: 6.8, maxF: 34, maxR: 11, acc: 24, turn: 1.45, hp: 150, cam: 22, power: s => s > 22 ? 2 : 1, color: 0xe2c02a, car: { h0: 1.6, bh: 2.6, hood: 0.28, boot: 0, cab: { z: 2.2, len: 11, h: 2.4, hatch: true }, rack: true, wr: 1.7 } },
  micro:    { name: 'Microcar', cat: 'civ', L: 11, W: 6.2, H: 6.6, maxF: 24, maxR: 8, acc: 20, turn: 2, hp: 80, cam: 17, power: () => 1, color: 0x2f5fb8, car: { h0: 1.3, bh: 2.4, hood: 0.18, boot: 0, cab: { z: 1, len: 7.6, h: 2.8, hatch: true }, round: true, wr: 1.3 } },
  muscle:   { name: 'Muscle car', cat: 'civ', L: 19, W: 8.8, H: 6, maxF: 48, maxR: 12, acc: 34, turn: 1.5, hp: 150, cam: 22, power: s => s > 26 ? 2 : 1, color: 0xf0eee8, car: { h0: 1.5, bh: 2.5, hood: 0.38, boot: 0.22, cab: { z: 1.4, len: 6.6, h: 2, fast: true }, stripes: true, scoop: true, spoiler: true, wr: 1.8, rim: 0.66, spokes: 6 } },
  golf:     { name: 'Golf cart', cat: 'civ', L: 10, W: 5.4, H: 7.4, maxF: 16, maxR: 8, acc: 14, turn: 2, hp: 60, cam: 16, power: () => 0, color: 0xe8e6de },
  icecream: { name: 'Ice cream van', cat: 'civ', L: 22, W: 9, H: 12, maxF: 24, maxR: 8, acc: 13, turn: 1.0, hp: 220, cam: 28, power: s => s > 16 ? 2 : 1, color: 0x9fd6e8, work: 'Click plays the chimes' },
  monster:  { name: 'Monster truck', cat: 'civ', L: 22, W: 13, H: 13, maxF: 34, maxR: 12, acc: 26, turn: 1.3, hp: 500, cam: 30, power: s => s > 14 ? 2 : 1, climb: 5, crush: true, color: 0xe8781c },
  semi:     { name: 'Articulated lorry', cat: 'civ', L: 58, W: 10, H: 15, maxF: 24, maxR: 7, acc: 9, turn: 0.6, hp: 700, cam: 52, power: s => s > 12 ? 3 : 2, color: 0xa81c1c },
  // Industrial
  mixer:    { name: 'Cement mixer', cat: 'ind', L: 28, W: 10, H: 13, maxF: 20, maxR: 7, acc: 10, turn: 0.85, hp: 500, cam: 34, power: s => s > 12 ? 2 : 1, color: 0xe8e6de, work: 'Click pours concrete from the chute' },
  miniex:   { name: 'Mini excavator', cat: 'ind', L: 13, W: 7, H: 7, maxF: 8, maxR: 6, acc: 9, turn: 1.1, hp: 300, cam: 22, power: () => 1, tracked: true, color: 0xe0a526, scale: 0.62, work: 'Mouse aims the arm · R/F boom · click to dig' },
  utility:  { name: 'Bucket truck', cat: 'ind', L: 26, W: 9.5, H: 12, maxF: 26, maxR: 8, acc: 13, turn: 0.95, hp: 320, cam: 34, power: s => s > 16 ? 2 : 1, color: 0xe8e6de, work: 'R/F raise the bucket · mouse slews · get out to stand in it' },
  plough:   { name: 'Snow plough', cat: 'ind', L: 28, W: 11, H: 12, maxF: 22, maxR: 8, acc: 12, turn: 0.95, hp: 520, cam: 34, power: s => s > 8 ? 2 : 1, color: 0x2f6aa8, plough: true },
  // Military
  rocketvan:{ name: 'Rocket launcher van', cat: 'mil', L: 22, W: 9.5, H: 11, maxF: 26, maxR: 9, acc: 15, turn: 1.0, hp: 700, cam: 30, power: s => s > 16 ? 2 : 1, color: 0x4f5a3c, work: 'Click fires a four-rocket salvo' },
  mtruck:   { name: 'Army truck', cat: 'mil', L: 30, W: 10.5, H: 13, maxF: 24, maxR: 8, acc: 11, turn: 0.85, hp: 650, cam: 34, power: s => s > 12 ? 2 : 1, climb: 3, color: 0x55613f },
  apc:      { name: 'Tracked carrier', cat: 'mil', L: 24, W: 11, H: 9, maxF: 22, maxR: 10, acc: 14, turn: 1.1, hp: 1100, cam: 30, power: () => 3, tracked: true, color: 0x5d6648, work: 'Click fires the turret gun' },
  mvan:     { name: 'Army van', cat: 'mil', L: 20, W: 9, H: 10, maxF: 28, maxR: 9, acc: 16, turn: 1.1, hp: 420, cam: 26, power: s => s > 16 ? 2 : 1, color: 0x6a7258 },
  jeep:     { name: 'Field jeep', cat: 'mil', L: 14, W: 7.4, H: 7, maxF: 30, maxR: 10, acc: 22, turn: 1.6, hp: 160, cam: 20, power: s => s > 20 ? 2 : 1, climb: 3, color: 0x6b7a4c, car: { h0: 2.0, bh: 2.3, hood: 0.34, boot: 0, cab: { z: 1.6, len: 7, h: 2.4, open: true, frameOnly: true }, boxy: true, spare: true, wr: 1.8, ww: 1.4, tread: true } },
  // Utility
  basket:   { name: 'Boom lift', cat: 'util', L: 16, W: 8, H: 6, maxF: 8, maxR: 6, acc: 8, turn: 1.2, hp: 260, cam: 28, power: () => 0, color: 0x2fae4a, work: 'R/F raise the basket · mouse slews · get out to stand in it' },
  ifork:    { name: 'Heavy forklift', cat: 'util', L: 20, W: 10, H: 13, maxF: 12, maxR: 9, acc: 14, turn: 1.3, hp: 380, cam: 28, power: s => s > 8 ? 2 : 1, scale: 1.45, color: 0xe2c02a, work: 'R/F raise the forks · click to lift debris · right-click to drop' },
  wfork:    { name: 'Warehouse forklift', cat: 'util', L: 11, W: 5.6, H: 7, maxF: 12, maxR: 9, acc: 16, turn: 1.8, hp: 140, cam: 18, power: () => 0, scale: 0.8, color: 0x7bbf3a, work: 'R/F raise the forks · click to lift debris · right-click to drop' },
  mcrane:   { name: 'Mobile crane', cat: 'util', L: 32, W: 11, H: 12, maxF: 18, maxR: 7, acc: 9, turn: 0.8, hp: 620, cam: 50, power: s => s > 10 ? 2 : 1, color: 0xd8331c, work: 'R/F boom · mouse slews · click hooks debris · right-click drops' },
  telehandler:{ name: 'Telehandler', cat: 'util', L: 18, W: 9, H: 9, maxF: 16, maxR: 9, acc: 14, turn: 1.3, hp: 320, cam: 26, power: s => s > 10 ? 1 : 0, color: 0x2f5fb8, work: 'R/F raise the boom · click to lift debris · right-click to drop' },
  chipper:  { name: 'Wood chipper', cat: 'util', L: 18, W: 9, H: 9, maxF: 8, maxR: 6, acc: 8, turn: 1.0, hp: 400, cam: 26, power: () => 1, tracked: true, color: 0xe8781c, work: 'Drive into timber, hay, leaves or loose debris to shred it' },
  // Nautical
  fishing:  { name: 'Trawler', cat: 'sea', L: 36, W: 12, H: 14, maxF: 18, maxR: 6, acc: 7, turn: 0.6, hp: 500, cam: 44, power: s => s > 10 ? 1 : 0, water: true, color: 0x2f5fb8 },
  cruise:   { name: 'River cruiser', cat: 'sea', L: 46, W: 13, H: 14, maxF: 16, maxR: 6, acc: 6, turn: 0.5, hp: 700, cam: 52, power: () => 0, water: true, color: 0xe8e6de },
  raceboat: { name: 'Mahogany runabout', cat: 'sea', L: 22, W: 7.5, H: 5, maxF: 36, maxR: 9, acc: 18, turn: 1.25, hp: 140, cam: 24, power: () => 0, water: true, color: 0x8a4a28 },
  rowboat:  { name: 'Rowing boat', cat: 'sea', L: 12, W: 5, H: 3, maxF: 8, maxR: 5, acc: 6, turn: 1.4, hp: 70, cam: 18, power: () => 0, water: true, color: 0x7d9488 },
  yacht:    { name: 'Motor yacht', cat: 'sea', L: 52, W: 14, H: 16, maxF: 26, maxR: 7, acc: 8, turn: 0.5, hp: 900, cam: 60, power: () => 0, water: true, color: 0xf2f2f0 },
  tug:      { name: 'Harbour tug', cat: 'sea', L: 28, W: 11, H: 14, maxF: 16, maxR: 9, acc: 9, turn: 0.9, hp: 900, cam: 36, power: s => s > 6 ? 2 : 1, water: true, color: 0x1f2a36 },
  // Aircraft
  plane:    { name: 'Light aircraft', cat: 'air', L: 26, W: 36, H: 9, maxF: 70, stall: 30, maxR: 4, acc: 18, turn: 0.9, hp: 160, cam: 40, power: () => 0, plane: true, color: 0xe8e6de, work: 'W/S throttle · Space/C pitch · A/D bank' },
  bizjet:   { name: 'Business jet', cat: 'air', L: 52, W: 46, H: 14, maxF: 110, stall: 46, maxR: 4, acc: 22, turn: 0.7, hp: 300, cam: 70, power: () => 0, plane: true, color: 0xf2f2f0, work: 'W/S throttle · Space/C pitch · A/D bank' },
  airliner: { name: 'Airliner', cat: 'air', L: 120, W: 112, H: 34, maxF: 120, stall: 56, maxR: 3, acc: 12, turn: 0.4, hp: 1200, cam: 160, power: () => 0, plane: true, color: 0xf2f2f0, work: 'W/S throttle · Space/C pitch · A/D bank' },
  cargo:    { name: 'Cargo plane', cat: 'air', L: 100, W: 120, H: 34, maxF: 90, stall: 44, maxR: 3, acc: 10, turn: 0.4, hp: 1100, cam: 150, power: () => 0, plane: true, color: 0x6a7258, work: 'W/S throttle · Space/C pitch · A/D bank' },
  fighter:  { name: 'Jet fighter', cat: 'air', L: 50, W: 36, H: 14, maxF: 160, stall: 50, maxR: 4, acc: 40, turn: 1.1, hp: 500, cam: 64, power: () => 0, plane: true, color: 0x6e7a84, work: 'W/S throttle · Space/C pitch · A/D bank · click fires rockets' },
  attackheli:{ name: 'Attack helicopter', cat: 'air', L: 34, W: 8, H: 10, maxF: 46, maxR: 15, acc: 32, turn: 1.5, hp: 600, cam: 40, power: () => 0, air: true, color: 0x4f5a3c, work: 'Space up · C down · click fires rockets' }
});
VTYPES.boat.name = 'Speedboat'; VTYPES.boat.cat = 'sea'; VTYPES.tank.name = 'Battle tank'; VTYPES.tank.cat = 'mil';
VTYPES.dozer.cat = VTYPES.dump.cat = VTYPES.loader.cat = VTYPES.excavator.cat = 'ind';
VTYPES.wrecker.cat = VTYPES.forklift.cat = 'util'; VTYPES.fire.cat = 'ind'; VTYPES.heli.cat = 'air';
for (const k of ['sedan', 'sports', 'pickup', 'truck']) VTYPES[k].cat = 'civ';

// ---------- parametric car body
VModel.car = function (v, s) {
  const M = v.M, g = v.mesh, T = v.T, W = T.W, L = T.L, B = this.box.bind(this), C = this.cyl.bind(this);
  const h0 = s.h0, bh = s.bh, top = h0 + bh, cab = s.cab, hl = L * s.hood, bl = L * s.boot;
  const trim = s.chrome ? M.chrome : M.trim;
  // Lower body, sills, swage and wheel arches.
  B(g, W, bh, L - 1, 0, h0 + bh / 2, 0, M.paint);
  B(g, W - 0.5, 0.5, L - 3, 0, h0 + 0.05, 0, M.trim);
  B(g, W + 0.05, 0.16, L - 2.4, 0, h0 + bh * 0.68, 0, s.chrome ? M.chrome : M.paint2);
  // Hood (wedge cars slope hard), boot, roof.
  if (s.wedge) { B(g, W - 0.3, 0.5, hl, 0, top - 0.2, -L / 2 + hl / 2 + 0.4, M.paint, -0.14); }
  else B(g, W - 0.3, 0.6, hl, 0, top + 0.15, -L / 2 + hl / 2 + 0.5, M.paint, s.boxy ? 0 : -0.04);
  if (s.scoop) { B(g, 2.4, 0.7, 2.6, 0, top + 0.7, -L / 2 + hl * 0.55, M.black, -0.1); }
  if (bl > 0) B(g, W - 0.3, 0.55, bl, 0, top + 0.1, L / 2 - bl / 2 - 0.5, M.paint, s.boxy ? 0 : 0.05);
  const cz = cab.z, cl = cab.len, ch = cab.h, cy = top + ch / 2 + 0.25;
  if (cab.open) {
    // Windscreen frame only; open tub with seats; folded hood behind.
    B(g, W - 1.0, ch * 0.9, 0.25, 0, cy, cz - cl / 2, M.glass, -0.35);
    B(g, W - 0.8, 0.25, 0.3, 0, cy + ch * 0.45, cz - cl / 2 + 0.15, trim, -0.35);
    for (const sx of [-1, 1]) B(g, 0.25, ch * 0.95, 0.3, sx * (W / 2 - 0.5), cy, cz - cl / 2, trim, -0.35);
    if (cab.soft) B(g, W - 1.2, 0.9, 2.2, 0, top + 0.6, cz + cl / 2, M.black);
    if (cab.frameOnly) { for (const sx of [-1, 1]) { B(g, 0.2, 3, 0.2, sx * (W / 2 - 0.5), top + 1.5, cz + cl / 2 - 0.5, M.black); } B(g, W - 1, 0.2, 0.2, 0, top + 3, cz + cl / 2 - 0.5, M.black); }
    B(g, W - 0.6, 0.3, cl, 0, top - 0.2, cz, M.seat);
  } else {
    const gl = new THREE.Mesh(new THREE.BoxGeometry(W - 1.0, ch, cl), M.glass);
    gl.position.set(0, cy, cz); g.add(gl);
    const roofM = cab.roofPaint ? new THREE.MeshPhongMaterial({ color: PAINT_HEX(cab.roofPaint), shininess: 70 }) : M.paint;
    const rl = cab.fast ? cl * 0.6 : cab.hatch ? cl * 0.94 : cl * 0.78;
    B(g, W - 1.0, 0.35, rl, 0, cy + ch / 2 + 0.12, cz + (cab.fast ? 0.3 : 0.1), roofM);
    for (const sx of [-1, 1]) {
      B(g, 0.32, ch * 1.06, 0.4, sx * (W / 2 - 0.55), cy, cz - cl / 2 + 0.3, M.paint, cab.fast ? -0.6 : s.boxy ? -0.18 : -0.42);
      B(g, 0.32, ch, 0.45, sx * (W / 2 - 0.5), cy, cz + 0.2, M.paint);
      B(g, 0.32, ch * 1.04, cab.hatch ? 0.6 : 0.5, sx * (W / 2 - 0.55), cy, cz + cl / 2 - 0.3, M.paint, cab.fast ? 0.6 : cab.hatch ? 0.05 : 0.4);
    }
    if (cab.round) { const r = new THREE.Mesh(new THREE.CylinderGeometry(cl * 0.45, cl * 0.45, W - 1.1, 14, 1, false, 0, Math.PI), roofM); r.rotation.z = Math.PI / 2; r.rotation.y = Math.PI / 2; r.scale.set(1, 1, 0.28); r.position.set(0, cy + ch / 2, cz); g.add(r); }
  }
  // Side detail: door shuts, handles, mirrors, side intakes.
  for (const sx of [-1, 1]) {
    B(g, 0.05, bh * 0.85, 0.08, sx * (W / 2 + 0.01), h0 + bh / 2 + 0.1, cz - cl * 0.3, M.dark);
    if (cl > 7) B(g, 0.05, bh * 0.85, 0.08, sx * (W / 2 + 0.01), h0 + bh / 2 + 0.1, cz + cl * 0.2, M.dark);
    B(g, 0.12, 0.18, 0.7, sx * (W / 2 + 0.06), h0 + bh * 0.82, cz - cl * 0.15, M.chrome);
    for (const az of [-L * 0.31, L * 0.3]) B(g, 0.3, 1.0, (s.wr || 1.7) * 2.6, sx * (W / 2 + 0.05), h0 + bh * 0.55, az, M.dark);
    if (!cab.open) this.mirror(g, M, sx * (W / 2 - 0.2), top + 0.6, cz - cl / 2 + 0.6, sx);
    if (s.intakes) B(g, 0.1, 1.0, 3.2, sx * (W / 2 + 0.02), h0 + bh * 0.5, L * 0.12, M.black);
    if (s.fins) { B(g, 0.35, 1.6, 4.2, sx * (W / 2 - 0.4), top + 0.6, L / 2 - 2.4, M.paint, 0.25); B(g, 0.4, 0.5, 0.5, sx * (W / 2 - 0.4), top + 0.8, L / 2 - 0.4, M.tail); }
    if (s.livery) B(g, 0.06, 0.8, L * 0.7, sx * (W / 2 + 0.04), h0 + bh * 0.4, 0, new THREE.MeshPhongMaterial({ color: PAINT_HEX(s.livery) }));
  }
  if (s.stripes || s.livery === 8) { const sm = new THREE.MeshPhongMaterial({ color: s.livery === 8 ? 0x111114 : 0xc01c1c }); for (const sx of [-0.8, 0.8]) B(g, 0.9, 0.06, L - 1.4, sx, top + (cab.open ? 0.45 : 0.5), 0, sm).position.y = top + 0.5; for (const sx of [-0.8, 0.8]) B(g, 0.9, 0.06, cl * 0.7, sx, cy + ch / 2 + 0.32, cz, sm); }
  // Nose and tail: bumpers, grille, lights, plates, exhausts.
  B(g, W - 0.2, 0.9, 0.6, 0, h0 + 0.5, -L / 2 + 0.2, trim); B(g, W - 0.2, 0.9, 0.6, 0, h0 + 0.5, L / 2 - 0.3, trim);
  B(g, W * (s.chrome ? 0.7 : 0.5), 0.8, 0.2, 0, h0 + bh * 0.6, -L / 2 + 0.4, s.chrome ? M.chrome : M.black);
  if (!s.chrome) for (let k = -2; k <= 2; k++) B(g, 0.1, 0.6, 0.22, k * 0.7, h0 + bh * 0.6, -L / 2 + 0.38, M.chrome);
  for (const sx of [-1, 1]) {
    if (s.round) C(g, 0.6, 0.6, 0.3, sx * (W / 2 - 1.2), h0 + bh * 0.62, -L / 2 + 0.4, M.head, 'z', 12);
    else B(g, s.wedge ? 2.2 : 1.6, s.wedge ? 0.35 : 0.65, 0.3, sx * (W / 2 - 1.3), h0 + bh * (s.wedge ? 0.9 : 0.66), -L / 2 + 0.5, M.head);
    B(g, 0.6, 0.3, 0.25, sx * (W / 2 - 0.4), h0 + bh * 0.4, -L / 2 + 0.45, M.amber);
    B(g, s.fins ? 0.5 : 1.4, s.fins ? 1 : 0.7, 0.3, sx * (W / 2 - (s.fins ? 0.4 : 1.1)), h0 + bh * 0.7, L / 2 - 0.4, M.tail);
  }
  this.plate(g, M, h0 + 0.9, -L / 2 - 0.15); this.plate(g, M, h0 + 1.2, L / 2 - 0.05);
  C(g, 0.2, 0.2, 1.2, W / 2 - 1.6, h0 + 0.2, L / 2 - 0.2, M.chrome, 'z', 8);
  if (s.spoiler) { B(g, W - 0.6, 0.18, 1.8, 0, top + 1.6, L / 2 - 1.2, M.black); for (const sx of [-1, 1]) B(g, 0.25, 1.1, 0.7, sx * (W / 2 - 1.2), top + 1.0, L / 2 - 1.2, M.black); }
  if (s.bullbar) { B(g, W - 1, 0.25, 0.25, 0, h0 + bh + 0.4, -L / 2 - 0.6, M.black); for (const sx of [-1, 0, 1]) B(g, 0.25, bh + 0.6, 0.25, sx * (W / 2 - 1.5), h0 + bh / 2 + 0.2, -L / 2 - 0.6, M.black); }
  if (s.spare) C(g, 1.5, 1.5, 0.8, 0, top - 0.4, L / 2 + 0.2, M.tire, 'z', 14);
  if (s.rack) { for (const sx of [-1, 1]) B(g, 0.2, 0.2, cl * 0.9, sx * (W / 2 - 0.8), cy + ch / 2 + 0.6, cz, M.black); for (let k = 0; k < 4; k++) B(g, W - 1.4, 0.15, 0.2, 0, cy + ch / 2 + 0.6, cz - cl * 0.4 + k * cl * 0.27, M.black); }
  if (s.snorkel) { B(g, 0.45, ch + 1.2, 0.45, W / 2 - 0.3, top + ch / 2 + 0.2, cz - cl / 2 - 0.4, M.black); B(g, 0.6, 0.6, 0.9, W / 2 - 0.3, top + ch + 0.8, cz - cl / 2 - 0.6, M.black); }
  this.seats(g, M, W, top - 0.3, cl > 8 ? [cz - 1, cz + 2] : [cz]);
  this.steering(g, M, -W * 0.2, top + 1.1, cz - cl / 2 + 1.8);
  const wr = s.wr || 1.7, ww = s.ww || 1.2;
  for (const sx of [-1, 1]) for (const [z, f] of [[-L * 0.31, true], [L * 0.3, false]]) {
    this.wheel(v, M, sx * (W / 2 - 0.55), z, wr, ww, f, { spokes: s.spokes || 5, rim: s.rim || 0.6, tread: s.tread, rimMat: s.chrome ? M.chrome : null });
    if (s.whitewall) this.cyl(v.wheels[v.wheels.length - 1].spin, wr * 0.82, wr * 0.82, ww * 1.06, 0, 0, 0, M.plate, 'x', 18).scale.set(1, 0.99, 0.99);
  }
};
function PAINT_HEX(p) { const c = PAINTS[p]; return (c[0] << 16) | (c[1] << 8) | c[2]; }

// ---------- special models
VModel.build3 = function (v, type) {
  const T = VTYPES[type], M = v.M, g = v.mesh, W = T.W, L = T.L;
  const B = this.box.bind(this), C = this.cyl.bind(this);
  const piv = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  if (T.car) return this.car(v, T.car);
  const cabOver = (h0, len, h, mat) => {
    B(g, W, h, len, 0, h0 + h / 2, -L / 2 + len / 2 + 0.4, mat || M.paint);
    B(g, W - 0.4, h * 0.42, 0.3, 0, h0 + h * 0.66, -L / 2 + 0.3, M.glass);
    for (const s of [-1, 1]) { B(g, 0.3, h * 0.4, len * 0.45, s * (W / 2 + 0.01), h0 + h * 0.66, -L / 2 + len * 0.4, M.glass); this.mirror(g, M, s * W / 2, h0 + h * 0.62, -L / 2 + 1.2, s); B(g, 0.8, 0.2, 2.4, s * (W / 2 - 0.3), h0 + 0.8, -L / 2 + len / 2, M.steel); }
    B(g, W * 0.7, h * 0.22, 0.3, 0, h0 + h * 0.25, -L / 2 + 0.3, M.black);
    for (let k = 0; k < 4; k++) B(g, W * 0.7, 0.12, 0.35, 0, h0 + h * 0.15 + k * 0.32, -L / 2 + 0.25, M.chrome);
    B(g, W + 0.2, 1, 0.8, 0, h0 + 0.2, -L / 2, M.trim);
    this.lights(g, M, W, h0 + h * 0.28, -L / 2 + 0.1, L / 2 + 0.1, { ty: h0 + 1.2 });
    this.seats(g, M, W, h0 + 1.6, [-L / 2 + len - 1.6]);
    this.steering(g, M, -W * 0.22, h0 + h * 0.5, -L / 2 + 2.2);
  };
  const axles = (zs, r, w, opts) => { for (const s of [-1, 1]) zs.forEach((z, i) => this.wheel(v, M, s * (W / 2 - (opts && opts.inset || 0.9)), z, r, w, i === 0, opts)); };
  if (type === 'golf') {
    B(g, W, 1.2, L - 1, 0, 1.6, 0, M.paint); B(g, W - 0.6, 0.6, 3, 0, 2.6, -L / 2 + 1.6, M.paint, -0.2);
    B(g, W - 1, 0.8, 3, 0, 2.9, 0.8, M.seat); B(g, W - 1, 2.2, 0.6, 0, 3.8, 2.5, M.seat);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(g, 0.25, 4.6, 0.25, x * (W / 2 - 0.4), 4.6, z * (L / 2 - 1.6), M.trim);
    B(g, W + 0.2, 0.3, L - 1.4, 0, 7.0, 0, M.paint); B(g, W - 0.4, 2.6, 0.1, 0, 5.4, -L / 2 + 1.6, M.glass, -0.1);
    C(g, 0.7, 0.7, 2.6, 0, 3.2, L / 2 - 0.4, M.dark, 'y'); for (let k = 0; k < 4; k++) B(g, 0.15, 1.2, 0.15, -0.3 + (k % 2) * 0.6, 4.6, L / 2 - 0.4 + (k > 1 ? 0.3 : -0.3), M.chrome);
    this.steering(g, M, -1.2, 3.8, -1.4);
    this.lights(g, M, W, 1.8, -L / 2 + 0.2, L / 2, { hw: 0.8, hh: 0.4 });
    axles([-L / 2 + 2, L / 2 - 2], 1.0, 0.9, { inset: 0.45, spokes: 4 });
  } else if (type === 'icecream') {
    cabOver(2.6, 6.5, 6.4);
    const bz = 3.4, bl = L - 7.2;
    B(g, W, 9, bl, 0, 2.6 + 4.6, bz, M.paint); B(g, W + 0.1, 0.5, bl, 0, 2.6 + 9.3, bz, M.plate);
    for (const sx of [-1, 1]) { B(g, 0.1, 1.4, bl * 0.9, sx * (W / 2 + 0.06), 2.6 + 1.2, bz, new THREE.MeshPhongMaterial({ color: 0xf2a6c8 })); }
    B(g, 0.15, 3.2, 7, W / 2 + 0.02, 2.6 + 6, bz - 1, M.glass); B(g, 1.6, 0.25, 7.4, W / 2 + 0.8, 2.6 + 4.2, bz - 1, M.chrome);
    B(g, 0.3, 0.3, 7.6, W / 2 + 1.2, 2.6 + 8.2, bz - 1, new THREE.MeshPhongMaterial({ color: 0xf2a6c8 }));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4, 12), new THREE.MeshLambertMaterial({ color: 0xd8a462 })); cone.rotation.x = Math.PI; cone.position.set(0, 2.6 + 11.6, bz - 2); g.add(cone);
    const sc = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), new THREE.MeshLambertMaterial({ color: 0xf6d6e4 })); sc.position.set(0, 2.6 + 14, bz - 2); g.add(sc);
    axles([-L / 2 + 3.6, L / 2 - 4], 1.9, 1.5);
  } else if (type === 'monster') {
    const h0 = 6.4;
    B(g, W - 3, 2.6, L - 5, 0, h0 + 1.3, 0, M.paint);
    B(g, W - 3.2, 0.7, 5, 0, h0 + 2.9, -L / 2 + 5, M.paint, -0.05); B(g, 2.2, 0.9, 2.6, 0, h0 + 3.5, -L / 2 + 5, M.black);
    B(g, W - 3.6, 3, 6, 0, h0 + 4.3, -0.6, M.glass); B(g, W - 3.4, 0.4, 5.6, 0, h0 + 6, -0.4, M.paint);
    for (const s of [-1, 1]) { B(g, 0.4, 1.6, 7.4, s * ((W - 3) / 2 - 0.2), h0 + 3.4, 5.6, M.paint); for (const z of [-L * 0.3, L * 0.3]) { C(g, 0.35, 0.35, 5, s * 2.6, h0 - 1.6, z, M.chrome, 'y'); C(g, 0.7, 0.7, 2.6, s * 2.6, h0 - 0.4, z, M.yellow, 'y'); } }
    B(g, W - 4, 0.3, 7, 0, h0 + 2.4, 5.6, M.rust);
    for (let k = 0; k < 4; k++) B(g, 0.6, 0.6, 0.5, -1.8 + k * 1.2, h0 + 6.5, -2.6, M.head);
    B(g, W - 2.6, 0.9, 0.7, 0, h0 + 0.5, -L / 2 + 1.4, M.chrome); B(g, 2, 2.4, 1.4, 0, h0 - 1, 0, M.dark);
    for (const s of [-1, 1]) this.mirror(g, M, s * ((W - 3) / 2), h0 + 3.6, -3, s);
    this.lights(g, M, W - 3, h0 + 1.8, -L / 2 + 2.4, L / 2 - 2.4);
    this.seats(g, M, W - 3, h0 + 2.6, [0]);
    for (const s of [-1, 1]) for (const [z, f] of [[-L * 0.3, true], [L * 0.3, false]]) this.wheel(v, M, s * (W / 2 - 1.6), z, 4.4, 3.2, f, { tread: true, rim: 0.48, spokes: 6, rimMat: M.chrome });
  } else if (type === 'semi') {
    // Conventional tractor with a long bonnet, sleeper, stacks and tanks; box trailer behind.
    const h0 = 3.2, tl = 14;
    B(g, W - 2, 1.2, L - 2, 0, h0, 0, M.dark);
    B(g, W - 1.2, 3.4, 6, 0, h0 + 2.3, -L / 2 + 3.4, M.paint);
    for (let k = 0; k < 8; k++) B(g, W * 0.6, 0.18, 0.2, 0, h0 + 1.2 + k * 0.4, -L / 2 + 0.35, M.chrome);
    B(g, W, 6.4, 6, 0, h0 + 4, -L / 2 + 9, M.paint); B(g, W - 0.4, 2.4, 0.3, 0, h0 + 5.6, -L / 2 + 5.9, M.glass, -0.15);
    B(g, W, 7.4, 3.6, 0, h0 + 4.6, -L / 2 + 13.6, M.paint2); B(g, W - 1, 2, 2, 0, h0 + 9.2, -L / 2 + 11.4, M.paint2, 0.4);
    for (const s of [-1, 1]) { C(g, 0.45, 0.45, 9, s * (W / 2 - 0.3), h0 + 6.5, -L / 2 + 11.8, M.chrome); C(g, 1, 1, 4, s * (W / 2 - 0.8), h0 + 0.6, -L / 2 + 13, M.chrome, 'z'); this.mirror(g, M, s * (W / 2 + 0.2), h0 + 5.6, -L / 2 + 6.6, s); B(g, 0.3, 2.2, 3, s * (W / 2 + 0.01), h0 + 5.6, -L / 2 + 8.4, M.glass); }
    B(g, W + 0.4, 1.1, 0.9, 0, h0 + 0.3, -L / 2 - 0.1, M.chrome);
    this.lights(g, M, W, h0 + 1.8, -L / 2 + 0.2, L / 2 + 0.1, { ty: h0 + 0.8 });
    this.seats(g, M, W, h0 + 2.6, [-L / 2 + 10]); this.steering(g, M, -W * 0.22, h0 + 4, -L / 2 + 7.4);
    B(g, 5, 0.6, 4, 0, h0 + 1.2, -L / 2 + tl + 4, M.black);
    const tz = -L / 2 + tl + 2, tlen = L - tl - 2;
    B(g, W, 11, tlen, 0, h0 + 7.2, tz + tlen / 2, M.plate);
    for (let k = 0; k <= 10; k++) for (const s of [-1, 1]) B(g, 0.15, 11, 0.3, s * (W / 2 + 0.05), h0 + 7.2, tz + k * tlen / 10, M.chrome);
    for (const s of [-1, 1]) B(g, 0.1, 2.2, tlen * 0.7, s * (W / 2 + 0.07), h0 + 8.6, tz + tlen / 2, new THREE.MeshPhongMaterial({ color: 0x1f4f9c }));
    B(g, W - 1, 1.2, 0.3, 0, h0 + 0.4, L / 2 - 0.2, M.black);
    for (const s of [-1, 1]) { this.wheel(v, M, s * (W / 2 - 0.9), -L / 2 + 4, 2.3, 1.6, true); for (const z of [-L / 2 + tl, -L / 2 + tl + 4.6, L / 2 - 8, L / 2 - 3.4]) { this.wheel(v, M, s * (W / 2 - 0.9), z, 2.3, 1.6, false, { spokes: 8 }); this.wheel(v, M, s * (W / 2 - 2.6), z, 2.3, 1.4, false, { spokes: 8 }); } }
  } else if (type === 'mixer') {
    cabOver(2.8, 6.4, 6);
    B(g, W - 2, 1.2, L - 6, 0, 3.2, 3, M.dark);
    const drum = piv(g, 0, 8.6, 4.4); drum.rotation.x = -0.22;
    const dg = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 4.4, 15, 16), M.paint); dg.rotation.x = Math.PI / 2; dg.castShadow = true; drum.add(dg);
    const dc = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3, 16), M.paint); dc.rotation.x = -Math.PI / 2; dc.position.z = -9; drum.add(dc);
    for (let k = 0; k < 6; k++) { const f = this.box(drum, 0.35, 8.6, 0.35, Math.cos(k) * 3.8, Math.sin(k) * 3.8, 0, M.yellow); f.rotation.set(Math.PI / 2, 0, k); }
    v.drum = drum;
    B(g, 1.6, 0.4, 5, 0, 6, L / 2 + 1.5, M.steel, 0.4); B(g, 2.4, 3, 2.4, 0, 9, L / 2 - 1.4, M.steel);
    const tip = piv(g, 0, 4.6, L / 2 + 3.8); v.tip = tip;
    C(g, 0.9, 0.9, 6, W / 2 - 1, 8, -2, M.chrome, 'z');
    axles([-L / 2 + 4, L / 2 - 8, L / 2 - 3.6], 2.2, 1.7, { spokes: 8 });
  } else if (type === 'utility' || type === 'basket') {
    let h0 = 2.6;
    if (type === 'utility') {
      cabOver(h0, 6.4, 6.2);
      B(g, W, 3, L - 8, 0, h0 + 2, 3.6, M.paint);
      for (let k = 0; k < 4; k++) for (const s of [-1, 1]) B(g, 0.1, 2.4, 3.6, s * (W / 2 + 0.05), h0 + 2, -2.2 + k * 4, M.chrome);
      for (const s of [-1, 1]) B(g, 1.2, 0.3, 0.4, s * 2.6, h0 + 6.4, -L / 2 + 1, M.amber);
      axles([-L / 2 + 4, L / 2 - 4], 2.2, 1.6);
    } else {
      B(g, W, 2.4, L - 2, 0, 2.6, 0, M.paint); B(g, W - 2, 1.6, 5, 0, 4.4, 3, M.dark);
      for (let k = 0; k < 4; k++) B(g, 0.1, 1.2, 4, W / 2 - 1.05, 4.4, 1 + k, M.black);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { B(g, 2.6, 0.5, 0.5, x * (W / 2 + 1.2), 1.4, z * (L / 2 - 1.6), M.yellow); B(g, 1.4, 0.4, 1.4, x * (W / 2 + 2.4), 0.2, z * (L / 2 - 1.6), M.steel); }
      axles([-L / 2 + 3, L / 2 - 3], 1.6, 1.5, { tread: true, inset: 0.4 });
      h0 = 0.4;
    }
    const turret = piv(g, 0, h0 + (type === 'utility' ? 3.6 : 4.4), type === 'utility' ? 6 : -1);
    C(turret, 1.6, 1.6, 1.2, 0, 0.6, 0, M.steel);
    B(turret, 1.6, 2, 2, 0, 1.6, 0, M.steel);
    const boom = piv(turret, 0, 2.4, 0);
    B(boom, 1.2, 1.2, 14, 0, 0, -7, type === 'utility' ? M.paint : M.yellow); B(boom, 0.9, 0.9, 12, 0, 0, -13, M.steel);
    const bucket = piv(boom, 0, 0, -19);
    B(bucket, 3.6, 0.3, 3.6, 0, -1.8, -1.2, M.steel);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(bucket, 0.15, 3, 0.15, x * 1.75, -0.4, -1.2 + z * 1.75, M.yellow);
    B(bucket, 3.6, 0.2, 0.15, 0, 1.1, -3, M.yellow); B(bucket, 3.6, 0.2, 0.15, 0, 1.1, 0.6, M.yellow); for (const s of [-1, 1]) B(bucket, 0.15, 0.2, 3.6, s * 1.8, 1.1, -1.2, M.yellow);
    B(bucket, 3.4, 1.4, 0.1, 0, -1, -2.95, M.paint);
    v.turret = turret; v.boom = boom; v.bucketG = bucket; v.boomA = 0.25; boom.rotation.x = 0.25;
    v.basketFloor = piv(bucket, 0, -1.6, -1.2);
  } else if (type === 'plough') {
    cabOver(2.8, 6.6, 6.4);
    B(g, W - 2, 1.2, L - 6, 0, 3.2, 2, M.dark);
    B(g, W, 6, L - 9, 0, 6.4, 4.2, M.steel); for (let k = 0; k < 6; k++) B(g, W + 0.1, 0.2, 0.2, 0, 3.6 + k, 4.2 + 0, M.dark).scale.set(1, 1, (L - 9) * 5);
    B(g, W - 2, 1.4, 2, 0, 3.4, L / 2 - 0.4, M.black);
    const blade = piv(g, 0, 0, -L / 2 - 2.2); blade.rotation.y = 0.35;
    B(blade, W + 4, 5, 0.6, 0, 2.6, 0, new THREE.MeshPhongMaterial({ color: 0xe8781c }), 0.25); B(blade, W + 4, 0.6, 1.2, 0, 0.3, -0.2, M.chrome);
    for (let k = -3; k <= 3; k++) B(blade, 0.3, 4.6, 0.8, k * 2, 2.6, 0.5, M.dark, 0.25);
    v.bucket = blade;
    for (const s of [-1, 1]) B(g, 1.2, 0.4, 0.4, s * 2.6, 9.8, -L / 2 + 1, M.amber);
    axles([-L / 2 + 4.4, L / 2 - 7, L / 2 - 3], 2.2, 1.7, { tread: true, spokes: 8 });
  } else if (type === 'rocketvan' || type === 'mvan') {
    const h0 = 2.6;
    B(g, W, 5, L - 1, 0, h0 + 2.6, 0, M.paint); B(g, W - 0.4, 2.4, 0.2, 0, h0 + 4.2, -L / 2 + 0.4, M.glass, -0.2);
    B(g, W - 0.6, 1.2, 0.3, 0, h0 + 4.2, -L / 2 + 0.3, M.dark).position.y = h0 + 3.0;
    for (const s of [-1, 1]) { B(g, 0.2, 1.8, 3, s * (W / 2 + 0.01), h0 + 4, -L / 2 + 3, M.glass); this.mirror(g, M, s * W / 2, h0 + 4, -L / 2 + 1.2, s); for (let k = 0; k < 5; k++) B(g, 0.12, 4, 0.2, s * (W / 2 + 0.05), h0 + 2.6, -L / 2 + 6 + k * 3, M.paint2); B(g, 0.15, 0.6, L - 8, s * (W / 2 + 0.07), h0 + 0.6, 1, M.black); }
    B(g, W, 0.8, 1, 0, h0, -L / 2 - 0.2, M.black); B(g, W - 2, 1.6, 0.4, 0, h0 + 1.4, -L / 2 - 0.4, M.black);
    for (let k = 0; k < 4; k++) B(g, W - 2.4, 0.15, 0.6, 0, h0 + 0.8 + k * 0.4, -L / 2 - 0.6, M.black);
    B(g, W - 1, 0.3, L - 3, 0, h0 + 5.2, 0.6, M.paint2);
    this.lights(g, M, W, h0 + 1.4, -L / 2 + 0.25, L / 2 + 0.05, { hw: 0.8, hh: 0.6 });
    if (type === 'rocketvan') {
      const turret = piv(g, 0, h0 + 5.4, 2.6);
      C(turret, 1.8, 1.8, 0.8, 0, 0.4, 0, M.dark);
      const pod = piv(turret, 0, 2.2, 0);
      B(pod, 5.4, 3, 7, 0, 0, 0, M.paint2);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) C(pod, 0.5, 0.5, 0.4, -1.8 + c * 1.2, -0.6 + r * 1.2, -3.55, M.black, 'z', 8);
      v.turret = turret; v.barrel = pod; v.tip = piv(pod, 0, 0, -4);
    } else { B(g, W - 3, 1.2, 4, 0, h0 + 5.8, 3, M.paint2); B(g, 1.4, 0.4, 0.4, 0, h0 + 5.6, -L / 2 + 1, M.amber); }
    axles([-L / 2 + 3.6, L / 2 - 3.6], 2.2, 1.7, { tread: true, spokes: 6, rimMat: M.paint2 });
  } else if (type === 'mtruck') {
    cabOver(3.2, 6.6, 6.2);
    B(g, W - 2, 1.2, L - 6, 0, 3.6, 2, M.dark);
    B(g, W, 1, L - 8, 0, 5, 3.6, M.paint2);
    for (const s of [-1, 1]) B(g, 0.4, 2, L - 8, s * (W / 2 - 0.2), 6.4, 3.6, M.paint);
    const canvas = new THREE.MeshLambertMaterial({ color: 0x6e7650 });
    for (let k = 0; k < 6; k++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2, (L - 8) / 6 + 0.05, 14, 1, true, -Math.PI / 2, Math.PI), canvas); a.rotation.x = Math.PI / 2; a.rotation.y = 0; a.rotation.z = 0; a.position.set(0, 7.4, 3.6 - (L - 8) / 2 + (k + 0.5) * (L - 8) / 6); a.material.side = THREE.DoubleSide; a.castShadow = true; g.add(a); }
    B(g, W, 2.2, 0.2, 0, 8.4, L / 2 - 0.4, canvas);
    axles([-L / 2 + 4.4, L / 2 - 8, L / 2 - 3.4], 2.4, 1.8, { tread: true, spokes: 6, rimMat: M.paint2 });
  } else if (type === 'apc') {
    for (const s of [-1, 1]) {
      const tx = s * (W / 2 - 1.4);
      B(g, 2.8, 2.2, L - 4, tx, 1.9, 0, M.dark);
      for (let k = 0; k < 5; k++) C(g, 1.2, 1.2, 2.6, tx, 1.4, -L / 2 + 3.6 + k * 4, M.paint2, 'x', 12);
      const shoes = new THREE.Group(); shoes.position.x = tx; g.add(shoes);
      for (let k = 0; k < 26; k++) { const z = -L / 2 + 1 + k * ((L - 2) / 26); B(shoes, 3, 0.4, 0.55, 0, 0.2, z, M.black); B(shoes, 3, 0.4, 0.55, 0, 3.8, z, M.black); }
      v.tracks = v.tracks || []; v.tracks.push(shoes);
    }
    B(g, W, 4.4, L - 2, 0, 5.4, 0.5, M.paint); B(g, W, 2.4, 3, 0, 4.4, -L / 2 + 0.4, M.paint, 0.7);
    for (let k = 0; k < 6; k++) B(g, 0.1, 1.2, 0.3, -2 + k * 0.8, 7.7, L / 2 - 3, M.black);
    B(g, 4, 3.6, 0.2, 0, 5.4, L / 2 - 0.4, M.paint2); for (const s of [-1, 1]) B(g, 0.6, 0.6, 0.6, s * 3, 7.8, -L / 2 + 2, M.trim);
    const turret = piv(g, 0, 7.6, -2);
    C(turret, 2.2, 2.4, 1.6, 0, 0.8, 0, M.paint2);
    const barrel = piv(turret, 0, 1.2, -1.6);
    C(barrel, 0.25, 0.25, 6, 0, 0, -3, M.black, 'z');
    v.turret = turret; v.barrel = barrel; v.tip = piv(barrel, 0, 0, -6.2);
    this.lights(g, M, W - 2, 6.4, -L / 2 + 1.4, L / 2, { hw: 0.6, hh: 0.4 });
  } else if (type === 'ifork' || type === 'wfork') {
    const sc = T.scale; v.mesh.scale.set(sc, sc, sc);
    const save = VTYPES.forklift; v.T = Object.assign({}, save, { L: L / sc, W: W / sc });
    this.build2(v, 'forklift'); v.T = T;
  } else if (type === 'miniex') {
    v.mesh.scale.set(T.scale, T.scale, T.scale);
    const save = v.T; v.T = Object.assign({}, VTYPES.excavator); this.build2(v, 'excavator'); v.T = save;
  } else if (type === 'mcrane' || type === 'telehandler') {
    const tele = type === 'telehandler';
    if (tele) {
      B(g, W - 1, 3.2, L - 4, 0, 3.2, 0, M.paint); B(g, 3.6, 4.6, 5.4, -W / 2 + 2.4, 6.6, 1.6, M.glass); B(g, 3.8, 0.4, 5.6, -W / 2 + 2.4, 9, 1.6, M.paint);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(g, 0.3, 4.6, 0.3, -W / 2 + 2.4 + x * 1.75, 6.6, 1.6 + z * 2.6, M.black);
      axles([-L / 2 + 3.4, L / 2 - 3.4], 2.3, 1.8, { tread: true, inset: 0.6, rimMat: M.yellow });
    } else {
      cabOver(3, 6.2, 5.6, M.paint);
      B(g, W, 2.6, L - 7, 0, 4.4, 3, M.paint2);
      for (const s of [-1, 1]) for (const z of [-4, L / 2 - 3]) { B(g, 2.6, 0.5, 0.5, s * (W / 2 + 1.2), 3, z, M.yellow); B(g, 1.4, 0.4, 1.4, s * (W / 2 + 2.4), 0.2, z, M.steel); }
      axles([-L / 2 + 4, -L / 2 + 8.4, L / 2 - 7, L / 2 - 3], 2.3, 1.7, { spokes: 8 });
    }
    const turret = piv(g, tele ? 1.4 : 0, tele ? 4.6 : 5.8, tele ? 5 : 6);
    if (!tele) { B(turret, 7, 2.6, 7, 0, 1.3, 0.5, M.paint); B(turret, 3, 3, 3, -2.4, 4, -2, M.glass); B(turret, 3.2, 0.4, 3.2, -2.4, 5.6, -2, M.paint); B(turret, 6, 2.4, 2.2, 0, 1.4, 4.6, M.steel); }
    const boom = piv(turret, 0, tele ? 1 : 3, 0);
    const len = tele ? 16 : 30;
    B(boom, 1.8, 1.8, len * 0.55, 0, 0, -len * 0.275, tele ? M.paint : M.yellow); B(boom, 1.4, 1.4, len * 0.5, 0, 0, -len * 0.7, tele ? M.paint2 : M.yellow); B(boom, 1, 1, len * 0.3, 0, 0, -len * 0.95, M.steel);
    C(boom, 0.4, 0.4, len * 0.4, 0, -1.4, -len * 0.2, M.chrome, 'z').rotation.x = Math.PI / 2 + 0.15;
    const tip = piv(boom, 0, -0.4, -len * 1.1);
    if (tele) { B(tip, 4.6, 2.2, 0.4, 0, 0.6, 0.6, M.dark); for (const s of [-1, 1]) B(tip, 0.5, 0.35, 5, s * 1.4, -0.4, -2.2, M.steel); }
    else { C(tip, 0.6, 0.6, 1, 0, 0, 0, M.steel, 'x'); }
    v.turret = turret; v.boom = boom; v.tip = tip; v.boomA = tele ? 0.1 : 0.5; boom.rotation.x = v.boomA;
    if (!tele) {
      v.hook = new THREE.Group(); const hk = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.3, 6, 12, Math.PI * 1.4), M.steel); hk.position.y = -0.8; v.hook.add(hk); C(v.hook, 1.1, 1.1, 1.4, 0, 0.6, 0, M.yellow);
      v.hookLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x1a1a1a })); v.hookLine.frustumCulled = false;
      v.hookLen = 12;
    }
  } else if (type === 'chipper') {
    for (const s of [-1, 1]) {
      const tx = s * (W / 2 - 1.2);
      B(g, 2.4, 2, L - 4, tx, 1.6, 0, M.dark);
      const shoes = new THREE.Group(); shoes.position.x = tx; g.add(shoes);
      for (let k = 0; k < 20; k++) { const z = -L / 2 + 2 + k * ((L - 4) / 20); B(shoes, 2.6, 0.35, 0.6, 0, 0.2, z, M.black); B(shoes, 2.6, 0.35, 0.6, 0, 3.2, z, M.black); }
      v.tracks = v.tracks || []; v.tracks.push(shoes);
    }
    B(g, W - 1, 3.6, L - 6, 0, 5.2, 1.6, M.paint);
    B(g, W - 1.4, 3.6, 4, 0, 5.4, -L / 2 + 1.6, M.paint2, -0.3);
    B(g, W - 2.4, 2.6, 0.3, 0, 5.8, -L / 2 - 0.3, M.black);
    for (let k = 0; k < 6; k++) B(g, W - 2.6, 0.15, 0.4, 0, 4.8 + k * 0.4, -L / 2 - 0.4, M.chrome);
    const chute = piv(g, 0, 7.2, L / 2 - 4); B(chute, 1.4, 1.4, 8, 0, 3, 2, M.paint2, -0.7); v.chute = piv(chute, 0, 6, 5);
    C(g, 0.4, 0.4, 3, -2, 8, 3, M.black); for (let k = 0; k < 4; k++) B(g, 0.1, 1.8, 0.4, W / 2 - 0.45, 5.4, 2 + k, M.black);
    B(g, 3, 2.6, 3, 2, 8, 6, M.glass);
  } else if (T.water) {
    const hull = (len, wid, dep, mat, y) => {
      const sh = new THREE.Shape();
      sh.moveTo(-wid / 2, len / 2); sh.lineTo(wid / 2, len / 2); sh.lineTo(wid / 2, -len / 2 + len * 0.3); sh.quadraticCurveTo(wid / 2 - 0.5, -len / 2 + 1, 0, -len / 2);
      sh.quadraticCurveTo(-wid / 2 + 0.5, -len / 2 + 1, -wid / 2, -len / 2 + len * 0.3); sh.lineTo(-wid / 2, len / 2);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.5, bevelSegments: 2 }); geo.rotateX(Math.PI / 2);
      const m = new THREE.Mesh(geo, mat); m.position.y = y + dep; m.castShadow = true; g.add(m);
      const dg = new THREE.ShapeGeometry(sh); dg.rotateX(Math.PI / 2); dg.scale(0.92, 1, 0.95);
      const d = new THREE.Mesh(dg, M.wood); d.position.y = y + dep + 0.05; g.add(d);
      return y + dep;
    };
    const rails = (y, len, wid, z0) => { for (const s of [-1, 1]) { B(g, 0.15, 0.15, len, s * (wid / 2 - 0.3), y + 1.2, z0, M.chrome); for (let k = 0; k <= len; k += 3) B(g, 0.12, 1.2, 0.12, s * (wid / 2 - 0.3), y + 0.6, z0 - len / 2 + k, M.chrome); } };
    if (type === 'rowboat') {
      const d = hull(L, W, 2, M.paint, 0.4);
      for (let k = 0; k < 3; k++) B(g, W - 0.8, 0.3, 1, 0, d + 0.4, -2.5 + k * 3, M.wood);
      for (const s of [-1, 1]) { const o = B(g, 0.25, 0.25, 9, s * (W / 2 + 1.5), d + 0.8, 0.5, M.wood); o.rotation.y = s * 0.35; B(g, 0.15, 0.9, 2.2, s * (W / 2 + 3), d + 0.6, 4.3, M.wood); }
    } else if (type === 'raceboat') {
      const d = hull(L, W, 2.4, M.paint, 0.6);
      for (let k = -2; k <= 2; k++) B(g, 0.12, 0.1, L - 4, k * 1.3, d + 0.12, 0, M.plate);
      B(g, W - 1, 1.6, 0.15, 0, d + 1, -2, M.glass, -0.4); B(g, W - 0.8, 0.2, 0.3, 0, d + 1.8, -2.2, M.chrome);
      this.seats(g, M, W - 1, d + 0.3, [0, 3.4]); this.steering(g, M, -1.2, d + 1.4, -1.2);
      C(g, 0.3, 0.3, 1.6, 0, d + 0.6, L / 2 - 1.6, M.chrome, 'y');
      B(g, 0.3, 0.3, L * 0.5, W / 2 - 0.2, d + 0.4, -L / 4, M.chrome); B(g, 0.3, 0.3, L * 0.5, -W / 2 + 0.2, d + 0.4, -L / 4, M.chrome);
    } else if (type === 'fishing' || type === 'tug') {
      const tug = type === 'tug';
      const d = hull(L, W, 4.4, M.paint, 0.2);
      B(g, W - 0.6, 1.4, L - 4, 0, d + 0.7, 2, M.paint2);
      const wx = tug ? 0 : 0, wz = tug ? -2 : -L / 2 + 10;
      B(g, W - 3, 5.4, 9, wx, d + 3, wz, M.plate); B(g, W - 2.6, 2, 9.4, wx, d + 4.6, wz, M.glass); B(g, W - 2.4, 0.5, 10, wx, d + 5.9, wz, M.paint2);
      C(g, 0.9, 1.1, tug ? 6 : 4, 0, d + 8, wz + 3, tug ? M.tail : M.black);
      if (tug) { for (let k = 0; k < 10; k++) for (const s of [-1, 1]) C(g, 1, 1, 0.8, s * (W / 2 + 0.3), d - 1, -L / 2 + 4 + k * 2.4, M.tire, 'x', 10); B(g, 2, 2, 2, 0, d + 1.4, L / 2 - 4, M.steel); }
      else {
        C(g, 0.3, 0.3, 14, 0, d + 7, L / 2 - 10, M.wood);
        for (const s of [-1, 1]) { const o = B(g, 0.25, 0.25, 14, s * 4, d + 9, L / 2 - 10, M.wood); o.rotation.z = s * 1.1; }
        B(g, W - 2, 2.4, 6, 0, d + 1.6, L / 2 - 4, new THREE.MeshLambertMaterial({ color: 0x3c5a3c }));
        for (let k = 0; k < 4; k++) B(g, 2, 1, 1.4, -3 + k * 2, d + 0.5, L / 2 - 8, M.amber);
      }
      rails(d, L - 8, W, 2);
    } else if (type === 'boat') {
      return; // the speedboat keeps its original model from build()
    } else {
      // Cruise boat and yacht: long hulls with tiered superstructures.
      const yacht = type === 'yacht';
      const d = hull(L, W, yacht ? 5 : 4, M.paint, 0.2);
      const st = new THREE.MeshPhongMaterial({ color: yacht ? 0xf8f8f6 : 0xe8e6de, shininess: 80 });
      const tint = new THREE.MeshPhongMaterial({ color: 0x14202a, shininess: 120, specular: 0x666666 });
      const tiers = yacht ? [[W - 1.5, L * 0.62, 3.6, -2], [W - 3.5, L * 0.42, 3.2, -1], [W - 5.5, L * 0.22, 2.6, 0]] : [[W - 1, L * 0.7, 4, 1], [W - 1.6, L * 0.5, 3.6, 2]];
      let y = d;
      for (const [tw, tl, th, tz] of tiers) {
        B(g, tw, th, tl, 0, y + th / 2, tz, st);
        for (const s of [-1, 1]) B(g, 0.1, th * 0.5, tl * 0.9, s * (tw / 2 + 0.02), y + th * 0.55, tz, tint);
        B(g, tw * 0.9, th * 0.5, 0.12, 0, y + th * 0.55, tz - tl / 2 - 0.02, tint);
        rails(y + th, tl * 0.9, tw, tz);
        y += th;
      }
      if (yacht) { B(g, 0.3, 4, 0.3, 0, y + 2, 1, M.chrome); B(g, 3, 0.3, 0.3, 0, y + 3.6, 1, M.chrome); C(g, 1, 1, 1, 0, y + 0.5, 3, M.plate); }
      else { C(g, 1.2, 1.4, 4, 0, y + 2, 6, M.tail); B(g, 0.15, 0.6, L * 0.6, W / 2 + 0.05, d - 1.2, 0, M.stripe); B(g, 0.15, 0.6, L * 0.6, -W / 2 - 0.05, d - 1.2, 0, M.stripe); }
      rails(d, L - 6, W, 0);
    }
    for (const s of [-1, 1]) B(g, 0.4, 0.4, 0.3, s * (W / 2 - 1), 4, -L / 2 + 3, s > 0 ? M.head : M.tail);
  } else if (T.plane) {
    this.plane(v, type);
  } else if (type === 'attackheli') {
    VTYPES.heli && this.build2(v, 'heli');
    for (const s of [-1, 1]) { B(g, 5, 0.4, 2, s * 4.4, 4.6, -1.6, M.paint); for (let k = 0; k < 2; k++) C(g, 0.6, 0.6, 3.4, s * (3.4 + k * 2), 4, -2, M.dark, 'z', 10); }
    C(g, 0.25, 0.25, 3, 0, 1.6, -8.4, M.black, 'z'); B(g, 1.2, 1.2, 1.2, 0, 1.8, -7, M.dark);
    v.tip = new THREE.Group(); v.tip.position.set(0, 3.6, -6); g.add(v.tip);
  }
};

// Fixed-wing aircraft: fuselage, wings, tailplane, fin, engines or propeller, landing gear.
VModel.plane = function (v, type) {
  const T = VTYPES[type], M = v.M, g = v.mesh, L = T.L, span = T.W, B = this.box.bind(this), C = this.cyl.bind(this);
  const big = type === 'airliner' || type === 'cargo', jet = type !== 'plane' && type !== 'cargo';
  const fr = type === 'plane' ? 2.2 : type === 'bizjet' ? 3.4 : type === 'fighter' ? 3 : 7;
  const fy = type === 'plane' ? 4.4 : type === 'fighter' ? 6 : big ? 10 : 6;
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(fr, fr * 0.55, L * 0.62, 18), M.paint); fus.rotation.x = Math.PI / 2; fus.position.set(0, fy, L * 0.05); fus.castShadow = true; g.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(fr, 18, 12), M.paint); nose.scale.set(1, 1, type === 'fighter' ? 3.4 : 1.8); nose.position.set(0, fy, -L * 0.26); g.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(fr * 0.55, L * 0.28, 16), M.paint); tail.rotation.x = Math.PI / 2; tail.position.set(0, fy + fr * 0.15, L * 0.5 - L * 0.08); g.add(tail);
  // Cockpit glazing and cabin windows.
  const cg = new THREE.Mesh(new THREE.SphereGeometry(fr * 0.9, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), M.glass);
  cg.scale.set(type === 'fighter' ? 0.6 : 0.9, 0.7, type === 'fighter' ? 2.4 : 1.2); cg.position.set(0, fy + fr * (type === 'fighter' ? 0.75 : 0.3), -L * (type === 'fighter' ? 0.16 : 0.22)); g.add(cg);
  if (type !== 'fighter' && type !== 'plane') for (let k = 0; k < (big ? 22 : 8); k++) for (const s of [-1, 1]) B(g, 0.1, fr * 0.22, fr * 0.22, s * (fr * 0.98), fy + fr * 0.25, -L * 0.15 + k * (big ? 3.4 : 2.8), M.black);
  if (type === 'plane') for (const s of [-1, 1]) B(g, 0.1, 1.4, 4, s * fr * 0.98, fy + 0.4, -L * 0.1, M.glass);
  for (const s of [-1, 1]) B(g, 0.12, 0.4, L * 0.55, s * fr * 0.99, fy - fr * 0.2, 0, M.stripe);
  // Wings: tapered slabs; high wing for the light aircraft and the cargo plane.
  const wy = type === 'plane' || type === 'cargo' ? fy + fr * 0.9 : fy - fr * 0.5, wz = type === 'fighter' ? L * 0.08 : -L * 0.02;
  const chord = type === 'fighter' ? L * 0.42 : big ? L * 0.16 : L * 0.2;
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(span / 2, big ? 1.2 : 0.6, chord), M.paint); wing.castShadow = true;
    wing.geometry.translate(s * span / 4, 0, 0);
    const pos = wing.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const x = Math.abs(pos.getX(i)) / (span / 2); pos.setZ(i, pos.getZ(i) * (1 - x * (type === 'fighter' ? 0.85 : 0.45)) + x * chord * (jet ? 0.35 : 0.05)); pos.setY(i, pos.getY(i) + (type === 'plane' || type === 'cargo' ? 0 : x * 1.2)); }
    pos.needsUpdate = true; wing.geometry.computeVertexNormals();
    wing.position.set(0, wy, wz); g.add(wing);
    B(g, 0.6, 0.4, 0.8, s * (span / 2 - 0.4), wy + (jet ? 1.2 : 0), wz + chord * (jet ? 0.35 : 0.05), s > 0 ? new THREE.MeshLambertMaterial({ color: 0x10c040, emissive: 0x0a8a20 }) : M.tail);
    if (type === 'plane') { const st = B(g, 0.3, fr * 1.6, 0.3, s * fr * 1.6, fy + 0.2, wz, M.trim); st.rotation.z = s * 0.6; }
    // Engines.
    const eng = (x, y, z, r, len) => { C(g, r, r * 0.85, len, x, y, z, M.trim, 'z'); C(g, r * 0.8, r * 0.8, 0.3, x, y, z - len / 2 - 0.1, M.black, 'z'); };
    if (type === 'airliner') eng(s * span * 0.2, wy - 2.6, wz - 3, 2.6, 10);
    if (type === 'cargo') for (const k of [0.18, 0.34]) { const ex = s * span * k; C(g, 1.6, 1.4, 8, ex, wy - 0.6, wz - 3, M.paint, 'z'); const pr = new THREE.Group(); pr.position.set(ex, wy - 0.6, wz - 7.4); g.add(pr); for (let q = 0; q < 4; q++) { const b = B(pr, 0.7, 7, 0.2, 0, 0, 0, M.black); b.rotation.z = q * Math.PI / 2; } v.props = (v.props || []).concat(pr); }
  }
  if (type === 'bizjet') for (const s of [-1, 1]) { C(g, 1.5, 1.3, 7, s * (fr + 1.4), fy + 1, L * 0.24, M.trim, 'z'); B(g, 1.6, 0.4, 2, s * (fr + 0.7), fy + 1, L * 0.24, M.paint); }
  if (type === 'fighter') { C(g, 1.6, 1.8, 3, 0, fy, L * 0.46, M.black, 'z'); for (const s of [-1, 1]) B(g, 1.4, 2.6, 8, s * (fr + 0.6), fy - 0.4, -L * 0.05, M.paint2); for (const s of [-1, 1]) for (let k = 0; k < 2; k++) C(g, 0.35, 0.35, 4, s * (span * 0.22 + k * 3), wy - 0.7, wz + 2, M.dark, 'z', 8); }
  // Tail surfaces: fin and tailplane (T-tail on the business jet).
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, big ? 16 : type === 'plane' ? 6 : 9, L * 0.14), M.paint); fin.position.set(0, fy + (big ? 9 : type === 'plane' ? 3.4 : 5), L * 0.43); fin.rotation.x = -0.35; fin.castShadow = true; g.add(fin);
  if (type === 'fighter') { for (const s of [-1, 1]) { const f2 = B(g, 0.4, 7, L * 0.14, s * 2.4, fy + 4, L * 0.42, M.paint, -0.35, 0, s * 0.3); } }
  const tpY = type === 'bizjet' ? fy + 8.6 : fy + (big ? 2 : 0.6);
  B(g, span * (type === 'fighter' ? 0.45 : 0.36), 0.4, L * 0.1, 0, tpY, L * 0.45, M.paint);
  B(g, 0.6, 3, 1.2, 0, fy + (big ? 16 : 7), L * 0.47, M.stripe);
  // Propeller for the light aircraft.
  if (type === 'plane') { const pr = new THREE.Group(); pr.position.set(0, fy, -L * 0.37); g.add(pr); C(pr, 0.5, 0.2, 1.2, 0, 0, -0.4, M.chrome, 'z'); for (let q = 0; q < 2; q++) { const b = B(pr, 0.5, 7, 0.2, 0, 0, 0, M.black); b.rotation.z = q * Math.PI / 2; } v.props = [pr]; }
  // Landing gear.
  const gear = (x, z, h, r) => { B(g, 0.4, h, 0.4, x, h / 2 + r, z, M.trim); C(g, r, r, r * 0.9, x, r, z, M.tire, 'x', 12); };
  const gh = fy - fr - 0.6;
  gear(0, -L * 0.3, Math.max(0.6, gh), big ? 1.4 : 0.8);
  for (const s of [-1, 1]) gear(s * (type === 'plane' ? 3.4 : big ? 6 : 3), L * 0.04, Math.max(0.6, gh), big ? 1.6 : 0.9);
  v.tip = new THREE.Group(); v.tip.position.set(0, fy, -L * 0.42); g.add(v.tip);
  v.flight = { pitch: 0, bank: 0, throttle: 0, vy: 0 };
};

// ---------- behaviour added to Vehicle
const VP = Vehicle.prototype;
const baseWork = VP.work, baseUpdate = VP.update, baseGear = VP.updateGear;

VP.update = function (dt, w, inp, driving) {
  this.cd -= 0; // cooldowns tick in the base update / plane update
  if (this.T.plane) return this.updatePlane(dt, w, inp, driving && !this.dead);
  if (this.sleeping && !driving) { this.sleepT -= dt; if (this.sleepT > 0) return; this.sleepT = 0.4; if (!this.shouldWake(w)) return; this.sleeping = false; }
  baseUpdate.call(this, dt, w, inp, driving);
  if (this.drum) this.drum.rotation.z += dt * 1.2;
  if (this.T.crush && Math.abs(this.speed) > 3) for (const o of Game.vehicles) if (o !== this && !o.dead && !o.T.air && !o.T.plane) { const lo = o.toLocal(this.pos); if (Math.abs(lo.x) < o.W / 2 + 3 && Math.abs(lo.z) < o.L / 2 + 3 && o.T.hp < 700) { o.damage(dt * 80); this.vy = Math.max(this.vy, 3); if (o.mesh.scale.y > 0.5) o.mesh.scale.y -= dt * 0.6; } }
  // Settle into sleep when parked and still.
  if (!driving && Math.abs(this.speed) < 0.05 && this.push.lengthSq() < 0.01 && Math.abs(this.vy) < 0.01 && !this.held && !(this.ball && this.ball.vel.lengthSq() > 0.5) && !this.T.air) {
    this.stillT = (this.stillT || 0) + dt; if (this.stillT > 1.5) { this.sleeping = true; this.sleepT = 0.4; }
  } else this.stillT = 0;
};
VP.wake = function () { this.sleeping = false; this.stillT = 0; };
VP.shouldWake = function (w) {
  if (this.push.lengthSq() > 0.01 || this.vy > 0.01) return true;
  if (this.groundAt(w, this.pos.x, this.pos.z) < this.pos.y - 0.6 && !this.T.water) return true;
  for (const b of Bodies.list) if (Math.abs(b.pos.x - this.pos.x) < this.L && Math.abs(b.pos.z - this.pos.z) < this.L) return true;
  return false;
};
const baseDamage = VP.damage, baseImpulse = VP.impulse;
VP.damage = function (n, dir) { this.wake(); this.detail(true); return baseDamage.call(this, n, dir); };
VP.impulse = function (from, s) { this.wake(); return baseImpulse.call(this, from, s); };

// Parked vehicles render as a few merged meshes; any damage, driving or a close player swaps the parts back.
VP.detail = function (on) {
  if (on) { if (this.mergedG) { this.mergedG.visible = false; } this.mesh.visible = true; this.permDetail = this.permDetail || this.dead || this.hp < this.T.hp; return; }
  if (this.permDetail || this.hp < this.T.hp) return;
  if (!this.mergedG) this.mergedG = this.buildMerged();
  this.mergedG.visible = true; this.mesh.visible = false;
};
VP.buildMerged = function () {
  this.root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(this.mesh.matrixWorld).invert(), groups = new Map();
  this.mesh.traverse(o => {
    if (!o.isMesh || !o.visible) return;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(m);
    const key = o.material.uuid; if (!groups.has(key)) groups.set(key, { mat: o.material, geos: [] });
    groups.get(key).geos.push(geo);
  });
  const G2 = new THREE.Group();
  for (const { mat, geos } of groups.values()) {
    let n = 0; for (const gg of geos) n += gg.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    for (const gg of geos) { pos.set(gg.attributes.position.array, o * 3); if (gg.attributes.normal) nor.set(gg.attributes.normal.array, o * 3); o += gg.attributes.position.count; gg.dispose(); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    const mm = new THREE.Mesh(bg, mat); mm.castShadow = true; mm.receiveShadow = true; G2.add(mm);
  }
  G2.rotation.copy(this.mesh.rotation); G2.scale.copy(this.mesh.scale); G2.position.copy(this.mesh.position);
  this.root.add(G2);
  return G2;
};
VP.lod = function (pp, active) {
  const d = Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z);
  this.root.visible = d < 420 + this.L;
  this.detail(active || d < 50 + this.L * 0.5 || !this.sleeping);
};

// Where a player can stand on a lift basket, in world space.
VP.platform = function () {
  if (!this.basketFloor) return null;
  this.root.updateMatrixWorld(true);
  return this.basketFloor.getWorldPosition(new THREE.Vector3());
};

VP.work = function (dt, w, inp) {
  const t = this.type, aimYaw = Player.yaw - this.yaw, aimPitch = Player.pitch;
  const raise = (inp.key('KeyR') ? 1 : 0) - (inp.key('KeyF') ? 1 : 0);
  const slew = (obj, rate) => { let d = aimYaw - obj.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); obj.rotation.y += Math.max(-rate * dt, Math.min(rate * dt, d)); return d; };
  const tipPos = () => { this.root.updateMatrixWorld(true); return this.tip.getWorldPosition(new THREE.Vector3()); };
  const tipDir = () => { const d = new THREE.Vector3(); this.tip.getWorldDirection(d); return d.negate(); };
  if (t === 'miniex') return baseWork.call(Object.assign(this, { type: 'excavator' }), dt, w, inp), (this.type = 'miniex');
  if (t === 'ifork' || t === 'wfork') { this.type = 'forklift'; baseWork.call(this, dt, w, inp); this.type = t; return; }
  if (t === 'icecream') { if (inp.mouse[0] && this.cd <= 0) { this.cd = 3.4; [784, 988, 1175, 988, 880, 784, 659, 784].forEach((f, i) => setTimeout(() => SFX.tone(f, 0.3, 0.18, 'triangle', 1, this.pos), i * 260)); } return; }
  if (t === 'mixer') {
    if (inp.mouse[0] && this.cd <= 0) {
      this.cd = 0.12;
      const tp = tipPos(), x = Math.floor(tp.x), z = Math.floor(tp.z);
      let y = Math.floor(tp.y); while (y > 0 && !SOLID[w.get(x, y - 1, z)]) y--;
      let placed = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { let yy = y; while (yy > 0 && !SOLID[w.get(x + dx, yy - 1, z + dz)]) yy--; if (yy < tp.y - 1 && !w.get(x + dx, yy, z + dz)) { w.set(x + dx, yy, z + dz, M.CONCRETE); placed++; } }
      if (placed) { FX.dust(tp.x, tp.y - 2, tp.z); SFX.burst(0.2, 300, 0.7, 0.3, 'lowpass', tp); }
    }
    return;
  }
  if (t === 'utility' || t === 'basket') {
    slew(this.turret, 0.7);
    this.boomA = Math.max(-0.2, Math.min(1.3, this.boomA + raise * 0.5 * dt)); this.boom.rotation.x = this.boomA;
    this.bucketG.rotation.x = -this.boomA;
    return;
  }
  if (t === 'mcrane' || t === 'telehandler') {
    slew(this.turret, t === 'mcrane' ? 0.6 : 0);
    this.boomA = Math.max(-0.1, Math.min(1.2, this.boomA + raise * 0.45 * dt)); this.boom.rotation.x = this.boomA;
    if (t === 'telehandler') this.tip.rotation.x = -this.boomA;
    const tp = tipPos(), hookP = this.hook ? tp.clone().add(new THREE.Vector3(0, -this.hookLen, 0)) : tp;
    if (inp.mouse[0] && !this.held) {
      let best = null, bd = this.hook ? 10 : 8;
      for (const b of Bodies.list) { const d = b.pos.distanceTo(hookP) - b.radius * 0.4; if (d < bd && b.mass < (this.hook ? 12000 : 3000)) { bd = d; best = b; } }
      if (best) { this.held = best; SFX.click(); } else if (this.cd <= 0) { this.cd = 0.6; Game.toast('Nothing loose in reach. Knock something over first.'); }
    }
    if (inp.mouse[2] && this.held) this.held = null;
    return;
  }
  if (t === 'rocketvan' || t === 'fighter' || t === 'attackheli') {
    if (this.turret) { slew(this.turret, 0.9); this.barrel.rotation.x = Math.max(0, Math.min(0.9, aimPitch + 0.3)); }
    if (inp.mouse[0] && this.cd <= 0) {
      this.cd = t === 'rocketvan' ? 4 : 0.6;
      const n = t === 'rocketvan' ? 4 : 2;
      for (let k = 0; k < n; k++) setTimeout(() => {
        if (this.dead) return;
        const tp = tipPos(), dir = t === 'rocketvan' ? tipDir() : (() => { const d = new THREE.Vector3(); this.mesh.getWorldDirection(d); return d.negate(); })();
        if (t !== 'rocketvan') { dir.set(-Math.sin(this.yaw) * Math.cos(this.flight ? this.flight.pitch : 0), Math.sin(this.flight ? this.flight.pitch : -0.12), -Math.cos(this.yaw) * Math.cos(this.flight ? this.flight.pitch : 0)); }
        const off = new THREE.Vector3((k % 2 ? 1 : -1) * 1.2, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        SFX.rocket(); Tools.launch('rocket', tp.clone().add(off).addScaledVector(dir, 2), dir.clone().multiplyScalar(110).add(this.vel ? this.vel : new THREE.Vector3()), { r: 5, power: 4 });
      }, k * 150);
    }
    return;
  }
  if (t === 'apc') {
    slew(this.turret, 1.2); this.barrel.rotation.x = Math.max(-0.15, Math.min(0.6, aimPitch + 0.1));
    if (inp.mouse[0] && this.cd <= 0) { this.cd = 0.25; const tp = tipPos(), d = tipDir(); SFX.burst(0.2, 1200, 0.6, 0.6, 'lowpass'); FX.flash(tp.x, tp.y, tp.z, 2, 0.05); Tools.bullet(w, tp, d, 1.3, 2, 30); }
    return;
  }
  if (t === 'chipper') return;
  return baseWork.call(this, dt, w, inp);
};

VP.updateGear = function (dt, w) {
  baseGear.call(this, dt, w);
  if (this.hook) {
    this.root.updateMatrixWorld(true);
    const tp = this.tip.getWorldPosition(new THREE.Vector3()), hp = tp.clone().add(new THREE.Vector3(0, -this.hookLen, 0));
    if (!this.hook.parent) { Game.scene.add(this.hook); Game.scene.add(this.hookLine); }
    this.hook.position.copy(hp);
    const pa = this.hookLine.geometry.attributes.position; pa.setXYZ(0, tp.x, tp.y, tp.z); pa.setXYZ(1, hp.x, hp.y + 1.2, hp.z); pa.needsUpdate = true;
    if (this.held) { this.held.v.copy(hp.clone().add(new THREE.Vector3(0, -this.held.radius * 0.6, 0)).sub(this.held.pos).multiplyScalar(6)); this.held.w.multiplyScalar(0.85); this.held.rest = 0; this.held.age = 0; }
  }
  if (this.type === 'chipper' && Math.abs(this.speed) > 0.5) {
    // Feed timber and soft stuff into the hopper; spit chips out of the chute.
    const [fx, fz] = this.fwd(), rx = -fz, rz = fx;
    let eaten = 0;
    for (let s = -4; s <= 4; s += 0.6) for (let h = 1; h < 8; h++) for (let d = 0; d < 2; d++) {
      const x = Math.floor(this.pos.x + fx * (this.L / 2 + 1 + d) + rx * s), z = Math.floor(this.pos.z + fz * (this.L / 2 + 1 + d) + rz * s), y = Math.floor(this.pos.y) + h;
      const m = w.get(x, y, z);
      if (m === M.WOOD || m === M.PLANK || m === M.LEAVES || m === M.HAY || m === M.CLOTH || m === M.ROOF || m === M.LADDER) { w.data[w.idx(x, y, z)] = 0; eaten++; w.markRegion(x, y, z, x, y, z); }
    }
    for (const b of Bodies.list) if (!b.dead && Math.hypot(b.pos.x - (this.pos.x + fx * this.L / 2), b.pos.z - (this.pos.z + fz * this.L / 2)) < 5 + b.radius * 0.4 && b.mass < 800) { eaten += b.n; b.remove(); }
    if (eaten) {
      this.root.updateMatrixWorld(true);
      const cp = this.chute.getWorldPosition(new THREE.Vector3());
      for (let k = 0; k < Math.min(30, eaten); k++) FX.chip(cp.x, cp.y, cp.z, 0.4, 0.28, 0.14, -fx * 14 + (Math.random() - 0.5) * 6, 10 + Math.random() * 6, -fz * 14 + (Math.random() - 0.5) * 6, 0.3);
      SFX.burst(0.25, 900, 0.8, 0.5, 'bandpass', this.pos);
      Game.queueCheck([Math.floor(this.pos.x - 14), Math.floor(this.pos.y), Math.floor(this.pos.z - 14), Math.floor(this.pos.x + 14), Math.floor(this.pos.y + 10), Math.floor(this.pos.z + 14)]);
    }
  }
};

// Arcade flight: throttle, pitch and bank; lift grows with speed past the stall speed.
VP.updatePlane = function (dt, w, inp, driving) {
  const T = this.T, F = this.flight, [fx, fz] = this.fwd();
  this.cd -= dt; this.cd2 -= dt;
  const ground = this.groundAt(w, this.pos.x, this.pos.z);
  const onGround = this.pos.y <= ground + 0.05;
  if (driving) {
    F.throttle = Math.max(0, Math.min(1, F.throttle + ((inp.key('KeyW') ? 1 : 0) - (inp.key('KeyS') ? 1 : 0)) * dt * 0.5));
    const pitchIn = (inp.key('Space') ? 1 : 0) - (inp.key('KeyC') || inp.key('ControlLeft') ? 1 : 0);
    const bankIn = (inp.key('KeyA') ? 1 : 0) - (inp.key('KeyD') ? 1 : 0);
    const authority = Math.min(1, this.speed / T.stall);
    F.pitch += pitchIn * dt * 0.8 * authority;
    F.bank += (bankIn * 0.9 - F.bank) * dt * 2 * (onGround ? 0 : 1);
    if (onGround) this.yaw += bankIn * dt * 0.6 * Math.min(1, this.speed / 8);
    this.work(dt, w, inp);
  } else F.throttle = Math.max(0, F.throttle - dt * 0.3);
  if (this.dead) F.throttle = 0;
  // Speed toward throttle target; drag and brakes on the ground.
  const target = F.throttle * T.maxF;
  this.speed += (target - this.speed) * dt * (T.acc / T.maxF) * 2;
  if (onGround && driving && inp.key('KeyS') && F.throttle === 0) this.speed *= 1 - dt * 1.2;
  if (onGround && !driving) this.speed *= 1 - dt * 0.8;
  const lift = Math.max(0, Math.min(1.25, (this.speed - T.stall * 0.6) / (T.stall * 0.5)));
  if (onGround) { F.pitch = Math.max(0, Math.min(F.pitch, lift > 0.6 ? 0.25 : 0)); }
  F.pitch = Math.max(-0.7, Math.min(0.7, F.pitch));
  if (!onGround) { this.yaw += F.bank * dt * T.turn * Math.min(1, this.speed / T.stall); F.pitch -= (1 - Math.min(1, lift)) * dt * 0.3; }
  F.vy -= G * dt * Math.max(0, 1 - lift);
  if (lift >= 1) F.vy += (0 - F.vy) * dt * 3;
  const cp = Math.cos(F.pitch);
  let nx = this.pos.x + fx * cp * this.speed * dt, nz = this.pos.z + fz * cp * this.speed * dt, ny = this.pos.y + (Math.sin(F.pitch) * this.speed + F.vy) * dt;
  // Probes: nose, wingtips, tail, belly. Leaves and glass shred; anything else is a crash.
  let hit = 0;
  const rx = -fz, rz = fx;
  for (const [a, b, h] of [[this.L * 0.45, 0, 4], [0, this.W * 0.45, 4], [0, -this.W * 0.45, 4], [-this.L * 0.45, 0, 6], [0, 0, 2]]) {
    const x = nx + fx * a + rx * b, z = nz + fz * a + rz * b, y = ny + h, m = w.getf(x, y, z);
    if (!SOLID[m]) continue;
    if (HARD[m] <= 0 || (this.speed > 30 && HARD[m] <= 1)) { const r = w.carve(x, y, z, 2.2, this.speed > 30 ? 1 : 0, false); if (r.n) { FX.burst(r.samples, x, y, z, 10); Game.queueCheck([r.x0, r.y0, r.z0, r.x1, r.y1, r.z1]); this.damage(r.n * 0.3); } continue; }
    hit++;
  }
  if (ny < ground) { ny = ground; if (F.vy + Math.sin(F.pitch) * this.speed < -14) { this.damage((-(F.vy + Math.sin(F.pitch) * this.speed) - 14) * 12); SFX.thump(this.pos, 1); } F.vy = 0; F.pitch = Math.max(0, F.pitch); }
  if (hit) {
    const sp = this.speed;
    this.damage(sp * sp * 0.05 + 20); SFX.thump(this.pos, 1); FX.shake = Math.max(FX.shake, 0.6);
    if (sp > 25) { const c = new THREE.Vector3(nx, ny + 3, nz); const r = w.carve(c.x + fx * this.L * 0.4, c.y, c.z + fz * this.L * 0.4, 4, 2, true); if (r.n) { FX.burst(r.samples, c.x, c.y, c.z, 20); Game.queueCheck([r.x0, r.y0, r.z0, r.x1, r.y1, r.z1]); } }
    this.speed *= -0.15; F.vy = 0;
  } else { this.pos.set(nx, ny, nz); }
  this.pos.x = Math.max(8, Math.min(WORLD_X - 8, this.pos.x)); this.pos.z = Math.max(8, Math.min(WORLD_Z - 8, this.pos.z)); this.pos.y = Math.min(WORLD_Y + 160, this.pos.y);
  this.pitchV = F.pitch; this.rollV = F.bank * 0.9;
  if (this.props) for (const p of this.props) p.rotation.z += F.throttle * dt * 60;
  if (this.vy) { F.vy += this.vy; this.vy = 0; }
  this.common(dt, driving, fx, fz);
};
