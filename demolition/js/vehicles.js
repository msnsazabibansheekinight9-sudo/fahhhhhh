'use strict';
/* Crumble — drivable vehicles. Each type has its own detailed model, handling and ramming strength.
   Local frame: nose toward −z, +y up, units are voxels (25 cm). */

const VTYPES = {
  sedan:  { name: 'Sedan', L: 17, W: 8, H: 7, maxF: 34, maxR: 12, acc: 24, turn: 1.5, hp: 140, cam: 22, power: s => s > 22 ? 2 : 1, color: 0x2f5d8a },
  sports: { name: 'Sports car', L: 18, W: 8.5, H: 5.5, maxF: 50, maxR: 14, acc: 36, turn: 1.75, hp: 110, cam: 21, power: s => s > 30 ? 2 : 1, color: 0xc4231c },
  pickup: { name: 'Pickup truck', L: 21, W: 9, H: 8.5, maxF: 30, maxR: 11, acc: 21, turn: 1.3, hp: 200, cam: 24, power: s => s > 20 ? 2 : 1, color: 0x7a8b5c },
  truck:  { name: 'Box truck', L: 28, W: 10, H: 13, maxF: 22, maxR: 8, acc: 12, turn: 0.95, hp: 320, cam: 32, power: s => s > 14 ? 2 : 1, color: 0xe8e4da },
  dump:   { name: 'Dump truck', L: 31, W: 13, H: 15, maxF: 18, maxR: 7, acc: 10, turn: 0.8, hp: 600, cam: 38, power: s => s > 11 ? 3 : 2, color: 0xd88a1e },
  loader: { name: 'Wheel loader', L: 18, W: 10, H: 12, maxF: 17, maxR: 9, acc: 16, turn: 0.95, hp: 450, cam: 28, power: s => s > 10 ? 3 : 2, color: 0xe0a526 },
  dozer:  { name: 'Bulldozer', L: 19, W: 12, H: 11, maxF: 11, maxR: 8, acc: 11, turn: 1.0, hp: 900, cam: 28, power: () => 3, tracked: true, color: 0xe6b222 },
  boat:   { name: 'Motorboat', L: 20, W: 8, H: 6, maxF: 38, maxR: 10, acc: 20, turn: 1.3, hp: 160, cam: 24, power: s => s > 22 ? 1 : 0, water: true, color: 0xf2efe8 },
  wrecker:{ name: 'Wrecking crane', L: 30, W: 11, H: 12, maxF: 16, maxR: 7, acc: 9, turn: 0.75, hp: 650, cam: 46, power: s => s > 10 ? 2 : 1, color: 0xd9b21c, work: 'R/F rope · aim with the mouse to slew the boom' },
  excavator:{ name: 'Excavator', L: 20, W: 11, H: 10, maxF: 9, maxR: 7, acc: 9, turn: 0.9, hp: 700, cam: 32, power: () => 2, tracked: true, color: 0xe0a526, work: 'Mouse aims the arm · R/F boom · click to dig' },
  fire:   { name: 'Fire engine', L: 30, W: 10, H: 12, maxF: 26, maxR: 9, acc: 13, turn: 0.95, hp: 380, cam: 34, power: s => s > 16 ? 2 : 1, color: 0xb81f18, work: 'Click to spray the water cannon' },
  tank:   { name: 'Armoured vehicle', L: 24, W: 13, H: 9, maxF: 18, maxR: 10, acc: 13, turn: 1.0, hp: 1400, cam: 32, power: () => 3, tracked: true, color: 0x55613f, work: 'Click fires the cannon · right-click the machine gun' },
  forklift:{ name: 'Forklift', L: 14, W: 7, H: 9, maxF: 14, maxR: 10, acc: 18, turn: 1.6, hp: 200, cam: 22, power: s => s > 8 ? 1 : 0, color: 0xe68a12, work: 'R/F raise the forks · click to lift debris · right-click to drop' },
  heli:   { name: 'Helicopter', L: 30, W: 6, H: 9, maxF: 40, maxR: 15, acc: 30, turn: 1.4, hp: 260, cam: 36, power: () => 0, air: true, color: 0x2c3e5c, work: 'Space up · C down · click: magnet winch · right-click: drop' }
};

// ---------- model kit
const VModel = {
  mats(color) {
    const L = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
    const S = (c, sh) => new THREE.MeshPhongMaterial({ color: c, shininess: sh == null ? 60 : sh, specular: 0x555555 });
    return {
      paint: S(color, 80), paint2: S(new THREE.Color(color).multiplyScalar(0.72).getHex(), 60),
      dark: L(0x1d1e20), trim: L(0x2b2d31), chrome: S(0xc9ccd0, 120), rim: S(0x9ea3a8, 90), tire: L(0x161617),
      glass: new THREE.MeshPhongMaterial({ color: 0x23323c, transparent: true, opacity: 0.55, shininess: 120, specular: 0xaaaaaa }),
      head: L(0xfff6dc, { emissive: 0xfff2c8, emissiveIntensity: 0.9 }), tail: L(0xb3120c, { emissive: 0x9a0d08, emissiveIntensity: 0.8 }),
      amber: L(0xf29a18, { emissive: 0xd07a08, emissiveIntensity: 0.7 }), seat: L(0x3a3530), plate: L(0xf0ede0), steel: S(0x6e747b, 50),
      rust: L(0x6a4a34), wood: L(0x8a6040), black: L(0x0e0e0f), yellow: S(0xe6b222, 50), hull: S(0xf2efe8, 70), stripe: S(0x24507a, 60)
    };
  },
  box(g, w, h, d, x, y, z, m, rx, ry, rz) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); if (rx || ry || rz) b.rotation.set(rx || 0, ry || 0, rz || 0);
    b.castShadow = true; b.receiveShadow = true; g.add(b); return b;
  },
  cyl(g, r1, r2, h, x, y, z, m, axis, seg) {
    const geo = new THREE.CylinderGeometry(r1, r2, h, seg || 14);
    if (axis === 'x') geo.rotateZ(Math.PI / 2); else if (axis === 'z') geo.rotateX(Math.PI / 2);
    const c = new THREE.Mesh(geo, m); c.position.set(x, y, z); c.castShadow = true; g.add(c); return c;
  },
  // Wheel = steer pivot → spinning hub holding tyre, sidewall, rim, spokes and nut.
  wheel(v, M, x, z, r, w, front, opts) {
    opts = opts || {};
    const pivot = new THREE.Group(); pivot.position.set(x, r, z); v.mesh.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const side = Math.sign(x) || 1;
    this.cyl(spin, r, r, w, 0, 0, 0, M.tire, 'x', 20);
    this.cyl(spin, r * 0.94, r * 0.94, w * 1.04, 0, 0, 0, M.dark, 'x', 20).scale.set(1, 0.98, 0.98);
    const rimR = r * (opts.rim || 0.62);
    this.cyl(spin, rimR, rimR, w * 1.08, side * 0.02, 0, 0, opts.rimMat || M.rim, 'x', 16);
    const spokes = opts.spokes || 5;
    for (let k = 0; k < spokes; k++) {
      const a = k / spokes * Math.PI * 2;
      const s = this.box(spin, 0.18, rimR * 1.7, 0.3, side * (w / 2 + 0.06), 0, 0, M.trim);
      s.rotation.x = a; s.castShadow = false;
    }
    this.cyl(spin, rimR * 0.28, rimR * 0.28, 0.25, side * (w / 2 + 0.12), 0, 0, M.chrome, 'x', 8);
    if (opts.tread) for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; const t = this.box(spin, w * 0.95, 0.35, 0.5, 0, Math.cos(a) * r, Math.sin(a) * r, M.tire); t.rotation.x = -a; t.castShadow = false; }
    v.wheels.push({ pivot, spin, r, front });
    return pivot;
  },
  mirror(g, M, x, y, z, side) {
    this.box(g, 0.9, 0.18, 0.25, x + side * 0.45, y, z, M.trim);
    this.box(g, 0.25, 0.85, 1.1, x + side * 1.0, y + 0.2, z + 0.1, M.paint);
    this.box(g, 0.05, 0.7, 0.9, x + side * 0.86, y + 0.2, z + 0.1, M.chrome);
  },
  lights(g, M, W, y, zf, zr, opts) {
    opts = opts || {};
    for (const s of [-1, 1]) {
      this.box(g, opts.hw || 1.6, opts.hh || 0.7, 0.3, s * (W / 2 - (opts.inset || 1.3)), y, zf, M.head);
      this.box(g, 0.6, 0.35, 0.25, s * (W / 2 - 0.45), y - 0.55, zf + 0.05, M.amber);
      this.box(g, opts.tw || 1.4, opts.th || 0.8, 0.3, s * (W / 2 - (opts.inset || 1.1)), opts.ty || y, zr, M.tail);
    }
  },
  plate(g, M, y, z) { this.box(g, 2.2, 0.8, 0.12, 0, y, z, M.plate); this.box(g, 1.8, 0.2, 0.14, 0, y, z, M.dark); },
  seats(g, M, W, y, zs) {
    for (const z of zs) for (const s of [-1, 1]) {
      this.box(g, W * 0.3, 0.6, 2, s * W * 0.2, y, z, M.seat);
      this.box(g, W * 0.3, 2.2, 0.5, s * W * 0.2, y + 1.3, z + 1, M.seat);
    }
  },
  steering(g, M, x, y, z) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.12, 6, 16), M.black); t.position.set(x, y, z); t.rotation.x = -0.9; g.add(t);
    this.box(g, 0.15, 0.15, 1.2, x, y - 0.3, z + 0.5, M.black, -0.9);
  },

  build(v, type) {
    const T = VTYPES[type], M = v.M, g = v.mesh, W = T.W, L = T.L;
    const B = this.box.bind(this), C = this.cyl.bind(this);
    if (type === 'sedan' || type === 'sports') {
      const lo = type === 'sports', h0 = lo ? 1.3 : 1.7, bh = lo ? 2.2 : 2.6;
      // Sill, main body, side swage line.
      B(g, W, bh, L - 1, 0, h0 + bh / 2, 0, M.paint);
      B(g, W + 0.06, 0.18, L - 2, 0, h0 + bh * 0.7, 0, M.paint2);
      B(g, W - 0.4, 0.5, L - 3, 0, h0 + 0.1, 0, M.trim);
      // Hood and boot with a gentle rake.
      B(g, W - 0.3, 0.7, L * 0.3, 0, h0 + bh + 0.1, -L * 0.33, M.paint, lo ? -0.06 : -0.04);
      B(g, W - 0.3, 0.6, L * 0.18, 0, h0 + bh + 0.05, L * 0.38, M.paint, 0.05);
      // Greenhouse: glass box, roof, pillars.
      const cz = lo ? 1.2 : 0.8, cl = lo ? L * 0.36 : L * 0.42, ch = lo ? 1.9 : 2.5, cy = h0 + bh + ch / 2 + 0.2;
      B(g, W - 1.0, ch, cl, 0, cy, cz, M.glass);
      B(g, W - 1.1, 0.35, cl * 0.82, 0, cy + ch / 2 + 0.1, cz + 0.2, M.paint);
      for (const s of [-1, 1]) {
        B(g, 0.35, ch * 1.08, 0.4, s * (W / 2 - 0.55), cy, cz - cl / 2 + 0.3, M.paint, -0.45);
        B(g, 0.35, ch, 0.5, s * (W / 2 - 0.5), cy, cz + 0.6, M.paint);
        B(g, 0.35, ch * 1.08, 0.5, s * (W / 2 - 0.55), cy, cz + cl / 2 - 0.3, M.paint, 0.4);
        // Door shut lines and handles.
        B(g, 0.05, bh * 0.85, 0.08, s * (W / 2 + 0.01), h0 + bh / 2 + 0.1, -1.4, M.dark);
        B(g, 0.05, bh * 0.85, 0.08, s * (W / 2 + 0.01), h0 + bh / 2 + 0.1, 3.4, M.dark);
        B(g, 0.12, 0.18, 0.7, s * (W / 2 + 0.06), h0 + bh * 0.82, -0.6, M.chrome);
        B(g, 0.12, 0.18, 0.7, s * (W / 2 + 0.06), h0 + bh * 0.82, 4.2, M.chrome);
        // Wheel arches.
        for (const az of [-L * 0.31, L * 0.3]) B(g, 0.3, 1.0, 4.4, s * (W / 2 + 0.05), h0 + 1.6, az, M.dark);
        this.mirror(g, M, s * (W / 2 - 0.2), h0 + bh + 0.6, cz - cl / 2 + 0.6, s);
      }
      // Nose and tail.
      B(g, W - 0.2, 1.1, 0.6, 0, h0 + 0.7, -L / 2 + 0.2, M.trim);
      B(g, W * 0.45, 0.8, 0.2, 0, h0 + 1.6, -L / 2 + 0.45, M.black);
      for (let k = -2; k <= 2; k++) B(g, 0.12, 0.7, 0.22, k * 0.7, h0 + 1.6, -L / 2 + 0.4, M.chrome);
      B(g, W - 0.2, 1.1, 0.6, 0, h0 + 0.7, L / 2 - 0.4, M.trim);
      this.lights(g, M, W, h0 + 1.75, -L / 2 + 0.55, L / 2 - 0.55, { hw: lo ? 1.9 : 1.6, hh: lo ? 0.45 : 0.7 });
      this.plate(g, M, h0 + 0.9, -L / 2 - 0.1); this.plate(g, M, h0 + 1.2, L / 2 - 0.05);
      C(g, 0.22, 0.22, 1.2, W / 2 - 1.6, h0 + 0.3, L / 2 - 0.2, M.chrome, 'z', 8);
      if (lo) {
        C(g, 0.22, 0.22, 1.2, -W / 2 + 1.6, h0 + 0.3, L / 2 - 0.2, M.chrome, 'z', 8);
        B(g, W - 0.6, 0.18, 2.0, 0, h0 + bh + 1.7, L / 2 - 1.4, M.black);
        for (const s of [-1, 1]) B(g, 0.25, 1.2, 0.8, s * (W / 2 - 1), h0 + bh + 1.05, L / 2 - 1.4, M.black);
        for (const s of [-1, 1]) B(g, 0.1, 0.9, 3.2, s * (W / 2 + 0.02), h0 + bh * 0.5, -2.5, M.black);
        B(g, W * 0.3, 0.2, 3.5, 0, h0 + bh + 0.48, -L * 0.34, M.black, -0.06);
      }
      this.seats(g, M, W, h0 + bh - 0.2, lo ? [1.6] : [0.2, 3.4]);
      this.steering(g, M, -W * 0.2, h0 + bh + 1.2, cz - cl / 2 + 2);
      const wr = lo ? 1.65 : 1.75;
      for (const s of [-1, 1]) { this.wheel(v, M, s * (W / 2 - 0.55), -L * 0.31, wr, 1.2, true, { spokes: lo ? 10 : 5, rim: lo ? 0.72 : 0.6 }); this.wheel(v, M, s * (W / 2 - 0.55), L * 0.3, wr, 1.2, false, { spokes: lo ? 10 : 5, rim: lo ? 0.72 : 0.6 }); }
    } else if (type === 'pickup') {
      const h0 = 2.4;
      B(g, W, 2.4, L - 1, 0, h0 + 1.2, 0, M.paint);
      B(g, W - 0.4, 0.8, L - 2, 0, h0 - 0.2, 0, M.trim);
      B(g, W - 0.3, 0.8, 5, 0, h0 + 2.7, -L / 2 + 3, M.paint, -0.05);
      // Cab.
      B(g, W - 0.6, 3, 6, 0, h0 + 4, -1.2, M.glass);
      B(g, W - 0.5, 0.4, 5.6, 0, h0 + 5.6, -1, M.paint);
      for (const s of [-1, 1]) {
        B(g, 0.4, 3, 0.5, s * (W / 2 - 0.4), h0 + 4, -4, M.paint, -0.35);
        B(g, 0.4, 3, 0.8, s * (W / 2 - 0.4), h0 + 4, 1.5, M.paint);
        B(g, 0.05, 2.0, 0.1, s * (W / 2 + 0.01), h0 + 1.2, 1.6, M.dark);
        B(g, 0.12, 0.2, 0.8, s * (W / 2 + 0.06), h0 + 2.0, 0.4, M.chrome);
        this.mirror(g, M, s * (W / 2 - 0.2), h0 + 3.6, -3.4, s);
        for (const az of [-L * 0.3, L * 0.3]) B(g, 0.6, 0.6, 5, s * (W / 2 + 0.15), h0 + 0.9, az, M.trim);
        // Bed sides with stake pockets.
        B(g, 0.4, 1.6, 8.6, s * (W / 2 - 0.2), h0 + 3.2, 5.6, M.paint);
        for (let k = 0; k < 3; k++) B(g, 0.45, 0.3, 0.6, s * (W / 2 - 0.2), h0 + 4.0, 2.4 + k * 3.2, M.dark);
      }
      B(g, W - 0.8, 0.3, 8.6, 0, h0 + 2.5, 5.6, M.rust);
      B(g, W, 1.6, 0.4, 0, h0 + 3.2, L / 2 - 0.7, M.paint);
      B(g, W - 1.2, 0.3, 0.3, 0, h0 + 5.9, -1.6, M.amber);
      // Rack, grille, bumpers.
      for (const s of [-1, 1]) B(g, 0.25, 2.2, 0.25, s * (W / 2 - 0.6), h0 + 5, 1.6, M.black);
      B(g, W - 1, 0.25, 0.25, 0, h0 + 6.1, 1.6, M.black);
      B(g, W, 1, 0.8, 0, h0 + 0.5, -L / 2, M.chrome); B(g, W, 0.9, 0.7, 0, h0 + 0.5, L / 2 - 0.3, M.chrome);
      B(g, W * 0.6, 1.3, 0.25, 0, h0 + 1.8, -L / 2 + 0.6, M.black);
      for (let k = -1; k <= 1; k++) B(g, W * 0.6, 0.12, 0.3, 0, h0 + 1.4 + k * 0.4 + 0.4, -L / 2 + 0.55, M.chrome);
      this.lights(g, M, W, h0 + 1.9, -L / 2 + 0.5, L / 2 - 0.45, { th: 1.4, ty: h0 + 3.3, tw: 0.6, inset: 0.6 });
      this.plate(g, M, h0 + 0.5, L / 2 + 0.1);
      this.seats(g, M, W, h0 + 2.3, [-0.6]);
      this.steering(g, M, -W * 0.2, h0 + 3.4, -2.6);
      for (const s of [-1, 1]) { this.wheel(v, M, s * (W / 2 - 0.6), -L * 0.3, 2.2, 1.6, true, { tread: true }); this.wheel(v, M, s * (W / 2 - 0.6), L * 0.3, 2.2, 1.6, false, { tread: true }); }
    } else if (type === 'truck') {
      const h0 = 2.6;
      B(g, W - 2, 1, L - 2, 0, h0, 0, M.dark);                          // chassis rails
      // Cab-over.
      B(g, W, 5.4, 7, 0, h0 + 3.4, -L / 2 + 3.6, M.paint);
      B(g, W - 0.4, 2.4, 0.3, 0, h0 + 4.8, -L / 2 + 0.05, M.glass);
      for (const s of [-1, 1]) {
        B(g, 0.3, 2.2, 3.2, s * (W / 2 + 0.01), h0 + 4.8, -L / 2 + 3, M.glass);
        B(g, 0.06, 4, 0.1, s * (W / 2 + 0.01), h0 + 3.4, -L / 2 + 5.2, M.dark);
        this.mirror(g, M, s * (W / 2), h0 + 4.6, -L / 2 + 1.2, s);
        B(g, 0.2, 2.6, 0.2, s * (W / 2 + 1.1), h0 + 4.6, -L / 2 + 1.3, M.black);
        B(g, 0.8, 0.2, 2.6, s * (W / 2 - 0.3), h0 + 0.8, -L / 2 + 3.6, M.steel);       // steps
        C(g, 0.9, 0.9, 4, s * (W / 2 - 0.7), h0 + 0.8, -2, M.chrome, 'z');           // fuel tank
      }
      B(g, W, 0.5, 7.2, 0, h0 + 6.3, -L / 2 + 3.6, M.paint2);
      B(g, W - 2, 1.5, 4, 0, h0 + 7.3, -L / 2 + 4, M.paint2, 0.15);                  // fairing
      B(g, W * 0.7, 1.4, 0.3, 0, h0 + 1.6, -L / 2 + 0.05, M.black);
      for (let k = 0; k < 4; k++) B(g, W * 0.7, 0.12, 0.35, 0, h0 + 1.1 + k * 0.35, -L / 2, M.chrome);
      B(g, W + 0.2, 1, 0.8, 0, h0 + 0.3, -L / 2 - 0.2, M.trim);
      this.lights(g, M, W, h0 + 1.6, -L / 2 - 0.05, L / 2 + 0.1, { ty: h0 + 1.2 });
      for (const s of [-1, 1]) B(g, 0.8, 0.3, 0.3, s * (W / 2 - 1.2), h0 + 6.6, -L / 2 + 0.2, M.amber);
      // Cargo box with ribs and roll door.
      const bl = L - 9, bz = L / 2 - bl / 2;
      B(g, W, 9.6, bl, 0, h0 + 5.6, bz, M.paint);
      for (let k = 0; k <= 6; k++) for (const s of [-1, 1]) B(g, 0.2, 9.6, 0.3, s * (W / 2 + 0.05), h0 + 5.6, bz - bl / 2 + k * bl / 6, M.chrome);
      B(g, W + 0.1, 0.3, bl, 0, h0 + 10.4, bz, M.chrome); B(g, W + 0.1, 0.4, bl, 0, h0 + 0.9, bz, M.dark);
      for (const s of [-1, 1]) B(g, 0.1, 1.6, bl * 0.75, s * (W / 2 + 0.06), h0 + 6.6, bz, M.stripe);
      for (let k = 0; k < 9; k++) B(g, W - 0.8, 0.9, 0.08, 0, h0 + 1.6 + k * 1.0, L / 2 + 0.05, k % 2 ? M.paint : M.paint2);
      B(g, 0.6, 9, 0.4, -W / 2 + 0.3, h0 + 5.6, L / 2, M.steel); B(g, 0.6, 9, 0.4, W / 2 - 0.3, h0 + 5.6, L / 2, M.steel);
      B(g, W, 0.4, 1.2, 0, h0 - 0.2, L / 2 - 0.4, M.black);
      this.plate(g, M, h0 + 0.3, L / 2 + 0.1);
      this.seats(g, M, W, h0 + 2.5, [-L / 2 + 4.5]);
      this.steering(g, M, -W * 0.22, h0 + 3.8, -L / 2 + 2.2);
      for (const s of [-1, 1]) {
        this.wheel(v, M, s * (W / 2 - 0.9), -L / 2 + 4, 2.4, 1.8, true);
        this.wheel(v, M, s * (W / 2 - 0.9), L / 2 - 6.5, 2.4, 1.8, false, { spokes: 8 });
        this.wheel(v, M, s * (W / 2 - 2.7), L / 2 - 6.5, 2.4, 1.6, false, { spokes: 8 });
        B(g, 2.6, 0.3, 5.5, s * (W / 2 - 1.4), h0 + 2.3, L / 2 - 6.5, M.black);
      }
    } else if (type === 'dump') {
      const h0 = 4.2;
      B(g, W - 3, 1.5, L - 2, 0, h0, 0, M.dark);
      // Offset cab on the left, engine hood on the right.
      B(g, 5, 5.5, 6, -W / 2 + 2.6, h0 + 4.4, -L / 2 + 4.5, M.paint);
      B(g, 4.6, 3, 5.6, -W / 2 + 2.6, h0 + 5.4, -L / 2 + 4.5, M.glass);
      B(g, 5.2, 0.5, 6.2, -W / 2 + 2.6, h0 + 7.3, -L / 2 + 4.5, M.paint2);
      B(g, W - 5.4, 4, 7, W / 2 - (W - 5.4) / 2, h0 + 3.2, -L / 2 + 4.5, M.paint);
      for (let k = 0; k < 6; k++) B(g, W - 5.6, 0.2, 0.3, W / 2 - (W - 5.4) / 2, h0 + 1.6 + k * 0.6, -L / 2 + 0.95, M.black);
      B(g, W, 1.4, 1, 0, h0 + 0.2, -L / 2 + 0.6, M.steel);                         // bumper
      C(g, 0.5, 0.5, 6, W / 2 - 1.5, h0 + 7.6, -L / 2 + 7.6, M.black);              // exhaust stack
      B(g, W - 2, 0.6, 1.2, 0, h0 + 5.6, -L / 2 + 1.6, M.steel);                    // walkway
      for (const s of [-1, 1]) B(g, 0.2, 1.6, 0.2, s * (W / 2 - 1.2), h0 + 6.6, -L / 2 + 1.2, M.yellow);
      B(g, W - 2.2, 0.15, 0.15, 0, h0 + 7.4, -L / 2 + 1.2, M.yellow);
      for (let k = 0; k < 3; k++) B(g, 0.6, 0.6, 0.5, -W / 2 + 1 + k * 1.5, h0 + 7.8, -L / 2 + 1.6, M.head);
      this.lights(g, M, W, h0 + 1.6, -L / 2 + 0.05, L / 2 + 0.15);
      // Body: sloped floor, flared sides, canopy over the cab.
      const bz = L / 2 - 10.5;
      B(g, W, 1, 21, 0, h0 + 2.6, bz, M.paint2, -0.06);
      for (const s of [-1, 1]) { B(g, 0.6, 6, 21, s * (W / 2 - 0.3), h0 + 5.4, bz, M.paint); for (let k = 0; k < 5; k++) B(g, 0.8, 6, 0.5, s * (W / 2 - 0.1), h0 + 5.4, bz - 9 + k * 4.5, M.paint2); }
      B(g, W, 6, 0.6, 0, h0 + 5.4, bz - 10.5, M.paint);
      B(g, W, 0.5, 7, 0, h0 + 8.6, -L / 2 + 4.8, M.paint2, -0.08);
      for (const s of [-1, 1]) C(g, 0.6, 0.6, 5, s * 2.5, h0 + 2.8, L / 2 - 5, M.chrome, 'y');
      this.seats(g, M, 4.6, h0 + 2.6, [-L / 2 + 5]);
      for (const s of [-1, 1]) {
        this.wheel(v, M, s * (W / 2 - 1.2), -L / 2 + 6, 3.6, 2.4, true, { tread: true, rim: 0.5, spokes: 8 });
        this.wheel(v, M, s * (W / 2 - 1.2), L / 2 - 5, 3.6, 2.4, false, { tread: true, rim: 0.5, spokes: 8 });
        this.wheel(v, M, s * (W / 2 - 3.8), L / 2 - 5, 3.6, 2.2, false, { tread: true, rim: 0.5, spokes: 8 });
      }
    } else if (type === 'loader') {
      const h0 = 3.4;
      // Rear frame with engine, counterweight and grilles.
      B(g, W - 1.4, 3.6, 8, 0, h0 + 1.4, 3.6, M.paint);
      B(g, W - 1.6, 2.6, 4.4, 0, h0 + 4.4, 5.4, M.paint);
      for (let k = 0; k < 5; k++) B(g, 0.1, 2, 3.6, -2.4 + k * 1.2, h0 + 4.4, 5.6, M.black).position.y = h0 + 5.75;
      B(g, W - 0.8, 2.6, 1.6, 0, h0 + 1.3, L / 2 - 0.8, M.dark);
      for (let k = 0; k < 6; k++) B(g, W - 2.4, 0.18, 0.2, 0, h0 + 0.4 + k * 0.4, L / 2 + 0.02, M.chrome);
      C(g, 0.35, 0.35, 3, 2.6, h0 + 6.8, 4.4, M.black);
      const beacon = C(g, 0.45, 0.45, 0.6, 0, h0 + 10.3, 0, M.amber); v.beacon = beacon;
      // Cab with ROPS posts and glass.
      B(g, 6.2, 4.6, 5.2, 0, h0 + 5.6, 0.2, M.glass);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, 0.45, 4.8, 0.45, sx * 3, h0 + 5.6, 0.2 + sz * 2.5, M.black);
      B(g, 6.8, 0.5, 5.8, 0, h0 + 8.1, 0.2, M.paint);
      for (const s of [-1, 1]) this.mirror(g, M, s * 3.2, h0 + 7.4, -2.2, s);
      this.seats(g, M, 5, h0 + 3.6, [0.8]);
      this.steering(g, M, 0, h0 + 5, -1.2);
      // Front frame, lift arms, tilt cylinders, bucket with teeth.
      B(g, W - 3, 2.4, 6, 0, h0 + 0.8, -4.2, M.paint);
      B(g, 1.4, 1.2, 1.4, 0, h0 + 0.6, -1.2, M.black);                              // articulation joint
      for (const s of [-1, 1]) {
        B(g, 0.9, 1.1, 9, s * 3.4, h0 + 3.0, -6.0, M.paint, 0.38);
        C(g, 0.45, 0.45, 5, s * 2.4, h0 + 2.5, -4.6, M.chrome, 'z').rotation.x = Math.PI / 2 + 0.35;
      }
      B(g, 7, 0.8, 0.8, 0, h0 + 3.6, -4.8, M.paint);
      const bk = new THREE.Group(); bk.position.set(0, h0 - 1.2, -L / 2 - 0.4); g.add(bk);
      B(bk, W + 1, 0.5, 3.2, 0, 0, 0, M.steel); B(bk, W + 1, 3.6, 0.5, 0, 1.6, 1.5, M.steel); B(bk, W + 1, 0.5, 1.6, 0, 3.4, 0.8, M.steel, -0.5);
      for (const s of [-1, 1]) B(bk, 0.5, 3.6, 3.2, s * (W / 2 + 0.25), 1.6, 0, M.steel);
      for (let k = 0; k < 7; k++) B(bk, 0.6, 0.4, 1.0, -W / 2 + 0.7 + k * (W / 6), 0, -1.9, M.chrome);
      v.bucket = bk;
      for (const s of [-1, 1]) {
        this.wheel(v, M, s * (W / 2 - 0.4), -5, 3.2, 2.2, false, { tread: true, rim: 0.5, rimMat: M.yellow, spokes: 6 });
        this.wheel(v, M, s * (W / 2 - 0.4), 4.8, 3.2, 2.2, true, { tread: true, rim: 0.5, rimMat: M.yellow, spokes: 6 });
        B(g, 2.6, 0.3, 5, s * (W / 2 - 0.3), h0 + 3.4, -5, M.paint); B(g, 2.6, 0.3, 5, s * (W / 2 - 0.3), h0 + 3.4, 4.8, M.paint);
      }
      this.lights(g, M, W - 3, h0 + 7.6, -2.3, L / 2 + 0.05, { hw: 0.8, hh: 0.6, ty: h0 + 3.4 });
    } else if (type === 'dozer') {
      const h0 = 3.2;
      // Tracks: frame, idlers, sprocket, rollers and shoes.
      for (const s of [-1, 1]) {
        const tx = s * (W / 2 - 1.3);
        B(g, 2.6, 2.0, L - 6, tx, 1.8, 0.6, M.dark);
        C(g, 1.4, 1.4, 2.4, tx, 1.5, -L / 2 + 4.2, M.steel, 'x'); C(g, 1.9, 1.9, 2.4, tx, 2.2, L / 2 - 2.6, M.steel, 'x');
        for (let k = 0; k < 5; k++) C(g, 0.6, 0.6, 2.7, tx, 0.9, -L / 2 + 6 + k * 2.3, M.trim, 'x', 10);
        const shoes = new THREE.Group(); shoes.position.x = tx; g.add(shoes);
        for (let k = 0; k < 24; k++) {
          const z = -L / 2 + 3 + k * ((L - 4) / 24);
          B(shoes, 2.8, 0.35, 0.6, 0, 0.2, z, M.black); B(shoes, 2.8, 0.35, 0.6, 0, 3.9, z, M.black);
        }
        v.tracks = v.tracks || []; v.tracks.push(shoes);
      }
      // Body, engine hood, side panels, exhaust.
      B(g, W - 4.4, 3, L - 5, 0, h0 + 1.8, 1, M.paint);
      B(g, W - 5, 2.6, 7, 0, h0 + 4.4, -3, M.paint);
      for (let k = 0; k < 5; k++) for (const s of [-1, 1]) B(g, 0.1, 1.6, 0.4, s * (W / 2 - 2.5), h0 + 4.4, -5 + k * 1.2, M.black);
      C(g, 0.4, 0.4, 3.4, 1.6, h0 + 7, -4.4, M.black);
      // Cab cage.
      B(g, 6, 4.4, 5, 0, h0 + 5.4, 4, M.glass);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, 0.5, 4.8, 0.5, sx * 2.9, h0 + 5.4, 4 + sz * 2.4, M.black);
      B(g, 6.6, 0.5, 5.6, 0, h0 + 7.8, 4, M.paint);
      this.seats(g, M, 5, h0 + 3.4, [4.4]);
      // Blade with ribs, push arms and lift cylinders.
      const bl = new THREE.Group(); bl.position.set(0, 0, -L / 2 - 0.8); g.add(bl);
      B(bl, W + 2, 5, 0.7, 0, 2.8, 0, M.yellow, 0.12);
      B(bl, W + 2, 0.6, 1.2, 0, 0.4, -0.3, M.chrome);
      for (let k = -3; k <= 3; k++) B(bl, 0.3, 4.6, 0.8, k * 2, 2.8, 0.5, M.paint2, 0.12);
      for (const s of [-1, 1]) B(bl, 0.6, 5, 0.9, s * (W / 2 + 0.9), 2.8, -0.4, M.yellow, 0.12);
      v.bucket = bl;
      for (const s of [-1, 1]) {
        B(g, 0.8, 0.8, 7, s * (W / 2 - 1.3), 2.2, -L / 2 + 3, M.paint);
        C(g, 0.4, 0.4, 5, s * 2.2, h0 + 3.2, -L / 2 + 2.4, M.chrome, 'z').rotation.x = Math.PI / 2 - 0.6;
      }
      // Ripper at the rear.
      B(g, 6, 1, 1, 0, h0 + 1, L / 2 + 0.5, M.paint);
      B(g, 0.8, 4, 0.8, 0, h0 - 0.5, L / 2 + 1, M.steel, 0.3);
      this.lights(g, M, 6, h0 + 7.4, 1.4, L / 2 + 0.1, { hw: 0.8, hh: 0.6, ty: h0 + 6 });
    } else if (type === 'boat') {
      // Hull from an extruded plan outline with a pointed bow.
      const sh = new THREE.Shape();
      sh.moveTo(-W / 2, L / 2); sh.lineTo(W / 2, L / 2); sh.lineTo(W / 2, -L / 2 + 6); sh.quadraticCurveTo(W / 2 - 0.5, -L / 2 + 1, 0, -L / 2);
      sh.quadraticCurveTo(-W / 2 + 0.5, -L / 2 + 1, -W / 2, -L / 2 + 6); sh.lineTo(-W / 2, L / 2);
      const hullGeo = new THREE.ExtrudeGeometry(sh, { depth: 2.6, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.5, bevelSegments: 2 });
      hullGeo.rotateX(Math.PI / 2);
      const hull = new THREE.Mesh(hullGeo, M.hull); hull.position.y = 3.4; hull.castShadow = true; g.add(hull);
      const stripeGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false }); stripeGeo.rotateX(Math.PI / 2); stripeGeo.scale(1.02, 1, 1.01);
      const st = new THREE.Mesh(stripeGeo, M.stripe); st.position.y = 2.0; g.add(st);
      const deckGeo = new THREE.ShapeGeometry(sh); deckGeo.rotateX(Math.PI / 2); deckGeo.scale(0.9, 1, 0.94);
      const deck = new THREE.Mesh(deckGeo, M.wood); deck.position.y = 3.45; g.add(deck);
      // Console, windscreen, seats, rails, outboard.
      B(g, 4, 2.6, 2.6, 0, 4.7, 0, M.hull); B(g, 4.4, 1.8, 0.2, 0, 6.6, -1.2, M.glass, -0.4);
      this.steering(g, M, -0.8, 6.3, -0.4);
      this.seats(g, M, W - 1, 3.8, [3.6]);
      B(g, W - 1.6, 0.8, 2.4, 0, 4.0, 7.6, M.seat);
      for (const s of [-1, 1]) { B(g, 0.15, 0.15, 10, s * (W / 2 - 0.3), 5.0, -1, M.chrome); for (let k = 0; k < 4; k++) B(g, 0.12, 1.2, 0.12, s * (W / 2 - 0.3), 4.4, -5.5 + k * 3, M.chrome); }
      const ob = new THREE.Group(); ob.position.set(0, 3.2, L / 2 + 0.8); g.add(ob);
      B(ob, 1.8, 2.2, 1.8, 0, 2, 0, M.black); B(ob, 2, 0.6, 2, 0, 3.2, 0, M.paint);
      B(ob, 0.6, 4.2, 0.8, 0, -0.6, 0.2, M.black); C(ob, 0.6, 0.6, 0.3, 0, -2.4, 0.9, M.chrome, 'z', 3);
      v.prop = ob.children[ob.children.length - 1];
      for (const s of [-1, 1]) B(g, 0.4, 0.4, 0.3, s * 0.8, 4.2, -L / 2 + 1.2, s > 0 ? M.head : M.tail);
    }
  }
};

