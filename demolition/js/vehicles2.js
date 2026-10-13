'use strict';
/* Crumble — work vehicles (crane, excavator, fire engine, armoured vehicle, forklift, helicopter),
   the shared Vehicle class with damage and part loss, and flying wreckage. */

VModel.build2 = function (v, type) {
  const T = VTYPES[type], M = v.M, g = v.mesh, W = T.W, L = T.L;
  const B = this.box.bind(this), C = this.cyl.bind(this);
  const pivotGroup = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  const truckCab = (h0, color) => {
    B(g, W, 1.2, L - 2, 0, h0, 0, M.dark);
    B(g, W, 5.2, 6.4, 0, h0 + 3.2, -L / 2 + 3.4, color || M.paint);
    B(g, W - 0.4, 2.2, 0.3, 0, h0 + 4.4, -L / 2 + 0.15, M.glass);
    for (const s of [-1, 1]) { B(g, 0.3, 2, 3, s * (W / 2 + 0.01), h0 + 4.4, -L / 2 + 2.8, M.glass); this.mirror(g, M, s * (W / 2), h0 + 4.4, -L / 2 + 1.2, s); B(g, 0.8, 0.2, 2.4, s * (W / 2 - 0.3), h0 + 0.9, -L / 2 + 3.4, M.steel); }
    B(g, W * 0.7, 1.4, 0.3, 0, h0 + 1.6, -L / 2 + 0.1, M.black);
    for (let k = 0; k < 4; k++) B(g, W * 0.7, 0.12, 0.35, 0, h0 + 1.1 + k * 0.35, -L / 2 + 0.05, M.chrome);
    B(g, W + 0.2, 1, 0.8, 0, h0 + 0.3, -L / 2 - 0.2, M.trim);
    this.lights(g, M, W, h0 + 1.6, -L / 2 - 0.05, L / 2 + 0.1, { ty: h0 + 1.2 });
    this.seats(g, M, W, h0 + 2.3, [-L / 2 + 4.2]);
    this.steering(g, M, -W * 0.22, h0 + 3.6, -L / 2 + 2.2);
  };
  if (type === 'wrecker') {
    const h0 = 3;
    truckCab(h0);
    B(g, W, 2.2, L - 8, 0, h0 + 1.6, 3.6, M.paint2);
    for (const s of [-1, 1]) for (const z of [-2, L / 2 - 2]) { B(g, 0.7, 0.7, 4.5, s * (W / 2 + 1.6), h0 + 0.6, z, M.yellow, 0, s * 0.3); B(g, 1.6, 0.5, 1.6, s * (W / 2 + 3.5), 0.3, z + (s > 0 ? -0.3 : 0.3), M.steel); }
    const turret = pivotGroup(g, 0, h0 + 2.8, 4);
    B(turret, 8, 3.4, 9, 0, 1.7, 0.5, M.paint);
    B(turret, 3.6, 3.2, 3.6, -2.4, 4.6, -2.6, M.glass); B(turret, 3.8, 0.4, 3.8, -2.4, 6.3, -2.6, M.paint);
    B(turret, 6, 2.6, 2.6, 0, 1.6, 5.2, M.steel);
    for (let k = 0; k < 4; k++) B(turret, 0.1, 2.0, 1.4, 4.05, 1.8, -2 + k * 1.6, M.black);
    const boom = pivotGroup(turret, 1.2, 3.6, -1);
    // Lattice boom: four chords and zig-zag lacing.
    const BL = 40;
    for (const a of [-1, 1]) for (const b of [-1, 1]) B(boom, 0.35, 0.35, BL, a * 1.1, b * 1.1, -BL / 2, M.yellow);
    for (let k = 0; k < 20; k++) for (const a of [-1, 1]) { const d = B(boom, 0.2, 2.6, 0.2, a * 1.1, 0, -1 - k * 2, M.yellow); d.rotation.x = k % 2 ? 0.6 : -0.6; const e = B(boom, 2.6, 0.2, 0.2, 0, a * 1.1, -1 - k * 2, M.yellow); e.rotation.y = k % 2 ? 0.6 : -0.6; }
    C(boom, 0.9, 0.9, 2.8, 0, -0.2, -BL, M.steel, 'x');
    const tip = pivotGroup(boom, 0, -0.8, -BL);
    boom.rotation.x = 0.85;
    v.turret = turret; v.boom = boom; v.tip = tip; v.boomA = 0.85;
    v.ball = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), rope: 24, init: false };
    const ball = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 12), M.steel); ball.castShadow = true;
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 6), M.dark); chain.position.y = 2.4; ball.add(chain);
    v.ballMesh = ball;
    v.ropeLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x1a1a1a }));
    v.ropeLine.frustumCulled = false;
    for (const s of [-1, 1]) for (const z of [-L / 2 + 4, L / 2 - 6, L / 2 - 2.5]) this.wheel(v, M, s * (W / 2 - 0.9), z, 2.3, 1.8, z < 0, { spokes: 8 });
  } else if (type === 'excavator') {
    const h0 = 3.4;
    for (const s of [-1, 1]) {
      const tx = s * (W / 2 - 1.4);
      B(g, 2.8, 2.2, L - 5, tx, 1.8, 0, M.dark);
      C(g, 1.5, 1.5, 2.6, tx, 1.6, -L / 2 + 3, M.steel, 'x'); C(g, 1.6, 1.6, 2.6, tx, 1.7, L / 2 - 3, M.steel, 'x');
      const shoes = new THREE.Group(); shoes.position.x = tx; g.add(shoes);
      for (let k = 0; k < 22; k++) { const z = -L / 2 + 2 + k * ((L - 4) / 22); B(shoes, 3, 0.35, 0.6, 0, 0.2, z, M.black); B(shoes, 3, 0.35, 0.6, 0, 3.4, z, M.black); }
      v.tracks = v.tracks || []; v.tracks.push(shoes);
    }
    C(g, 3, 3, 1.2, 0, h0, 0, M.dark, 'y', 20);
    const turret = pivotGroup(g, 0, h0 + 0.6, 0);
    B(turret, W - 1, 3.4, 12, 0, 1.7, 1.6, M.paint);
    B(turret, W - 1.2, 2.6, 3, 0, 1.5, 7.8, M.dark);                                 // counterweight
    B(turret, 4.2, 4.6, 5, -W / 2 + 2.6, 5.4, -2.4, M.glass); B(turret, 4.4, 0.4, 5.2, -W / 2 + 2.6, 7.8, -2.4, M.paint);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(turret, 0.3, 4.6, 0.3, -W / 2 + 2.6 + sx * 2.1, 5.4, -2.4 + sz * 2.5, M.black);
    C(turret, 0.35, 0.35, 3, W / 2 - 2, 5, 4, M.black);
    for (let k = 0; k < 6; k++) B(turret, 0.1, 1.8, 0.35, W / 2 - 0.45, 2.2, 1 + k * 1, M.black);
    const boom = pivotGroup(turret, 1.6, 3.2, -3.5);
    B(boom, 1.4, 1.8, 14, 0, 0, -7, M.paint);
    C(boom, 0.4, 0.4, 7, 0, -1.6, -3, M.chrome, 'z').rotation.x = Math.PI / 2 + 0.2;
    const stick = pivotGroup(boom, 0, 0, -14);
    B(stick, 1.1, 1.4, 9, 0, 0, -4.5, M.paint);
    const bucket = pivotGroup(stick, 0, 0, -9);
    B(bucket, 3.6, 0.4, 2.6, 0, -0.6, -0.8, M.steel); B(bucket, 3.6, 2.4, 0.4, 0, 0.4, -2, M.steel);
    for (const s of [-1, 1]) B(bucket, 0.3, 2.4, 2.6, s * 1.8, 0.4, -0.8, M.steel);
    for (let k = 0; k < 5; k++) B(bucket, 0.4, 0.4, 0.9, -1.4 + k * 0.7, -0.8, -2.4, M.chrome);
    const tip = pivotGroup(bucket, 0, -0.4, -2.2);
    boom.rotation.x = 0.35; stick.rotation.x = -1.5; bucket.rotation.x = -0.4;
    v.turret = turret; v.boom = boom; v.stick = stick; v.tip = tip; v.boomA = 0.35;
    this.lights(g, M, 6, h0 + 7.2, -2.6, L / 2 + 0.1, { hw: 0.7, hh: 0.5, ty: h0 + 2 });
  } else if (type === 'fire') {
    const h0 = 3;
    truckCab(h0);
    B(g, W, 6, L - 8, 0, h0 + 3.6, 3.6, M.paint);
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { B(g, 0.08, 4.6, 3.6, s * (W / 2 + 0.05), h0 + 3.4, -4.6 + k * 4.2, M.chrome); B(g, 0.06, 0.25, 3.4, s * (W / 2 + 0.06), h0 + 3.4, -4.6 + k * 4.2, M.dark); }
    for (const s of [-1, 1]) B(g, 0.1, 0.8, L - 9, s * (W / 2 + 0.07), h0 + 6, 3.6, M.plate);
    B(g, W - 2, 0.3, 20, 0, h0 + 7.4, 3, M.chrome);
    for (const s of [-1, 1]) { B(g, 0.25, 0.25, 22, s * 2.6, h0 + 7.9, 3, M.chrome); for (let k = 0; k < 11; k++) B(g, 5.2, 0.15, 0.2, 0, h0 + 7.9, -7 + k * 2, M.chrome); }
    for (const s of [-1, 1]) B(g, 1.2, 0.5, 0.5, s * 3, h0 + 6.2, -L / 2 + 3.4, s > 0 ? M.tail : M.amber);
    B(g, W - 2, 0.5, 0.5, 0, h0 + 6.2, -L / 2 + 3.4, M.chrome);
    for (let k = 0; k < 3; k++) C(g, 0.9, 0.9, 1.6, -2 + k * 2, h0 + 2.4, L / 2 + 0.2, M.chrome, 'z', 10);
    const turret = pivotGroup(g, 0, h0 + 7.6, -3);
    C(turret, 1, 1.2, 1.2, 0, 0.6, 0, M.chrome);
    const barrel = pivotGroup(turret, 0, 1.4, 0);
    C(barrel, 0.4, 0.55, 4, 0, 0, -2, M.chrome, 'z'); C(barrel, 0.6, 0.6, 0.6, 0, 0, -4, M.dark, 'z');
    const tip = pivotGroup(barrel, 0, 0, -4.4);
    v.turret = turret; v.barrel = barrel; v.tip = tip;
    v.beacon = C(g, 0.5, 0.5, 0.5, 0, h0 + 6.4, -L / 2 + 3.4, M.amber);
    for (const s of [-1, 1]) for (const z of [-L / 2 + 4, L / 2 - 6, L / 2 - 2.5]) this.wheel(v, M, s * (W / 2 - 0.9), z, 2.3, 1.8, z < 0, { spokes: 8 });
  } else if (type === 'tank') {
    const h0 = 3.4;
    for (const s of [-1, 1]) {
      const tx = s * (W / 2 - 1.5);
      B(g, 3, 2.4, L - 4, tx, 1.9, 0, M.dark);
      for (let k = 0; k < 6; k++) C(g, 1.3, 1.3, 2.8, tx, 1.5, -L / 2 + 3.6 + k * 3.4, M.paint2, 'x', 12);
      C(g, 1.2, 1.2, 3, tx, 2.8, -L / 2 + 1.6, M.steel, 'x'); C(g, 1.4, 1.4, 3, tx, 2.8, L / 2 - 1.6, M.steel, 'x');
      const shoes = new THREE.Group(); shoes.position.x = tx; g.add(shoes);
      for (let k = 0; k < 28; k++) { const z = -L / 2 + 1 + k * ((L - 2) / 28); B(shoes, 3.2, 0.4, 0.55, 0, 0.2, z, M.black); B(shoes, 3.2, 0.4, 0.55, 0, 4.1, z, M.black); }
      v.tracks = v.tracks || []; v.tracks.push(shoes);
      B(g, 3.4, 0.4, L - 1, tx, 4.5, 0, M.paint);                                  // track skirts
      for (let k = 0; k < 4; k++) B(g, 0.6, 0.6, 0.6, s * (W / 2 - 0.3), 5.1, -6 + k * 4, M.trim);
    }
    B(g, W - 6, 3.4, L - 2, 0, h0 + 1, 0, M.paint);
    B(g, W - 0.2, 1, L - 3, 0, h0 + 2.9, 0.5, M.paint);
    B(g, W - 6, 2, 3, 0, h0 + 1.6, -L / 2 + 0.6, M.paint, 0.7);                       // glacis
    for (let k = 0; k < 6; k++) B(g, 0.1, 1.6, 0.4, -2 + k * 0.8, h0 + 3.5, L / 2 - 3, M.black);
    for (const s of [-1, 1]) B(g, 0.9, 0.5, 0.3, s * (W / 2 - 2.4), h0 + 2.4, -L / 2 + 0.2, M.head);
    const turret = pivotGroup(g, 0, h0 + 3.4, 1);
    B(turret, 8.4, 2.8, 9.5, 0, 1.4, 0.4, M.paint); B(turret, 7, 0.4, 7, 0, 2.95, 0.6, M.paint2);
    C(turret, 1.3, 1.3, 0.8, -2, 3.4, 2, M.paint2); C(turret, 1.0, 1.0, 0.6, 2, 3.3, 2.4, M.paint2);
    B(turret, 0.3, 0.3, 2.4, 2, 4.4, 1.5, M.black);                                // MG
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) C(turret, 0.35, 0.35, 1.4, s * 4.4, 2.0 + k * 0.5, -1.5, M.dark, 'z', 6);
    B(turret, 8.6, 1.8, 2, 0, 1.6, 5.8, M.trim);                                   // bustle rack
    const barrel = pivotGroup(turret, 0, 1.4, -4.4);
    B(barrel, 2.2, 1.8, 1.8, 0, 0, -0.6, M.paint2);
    C(barrel, 0.45, 0.45, 13, 0, 0, -7.5, M.paint, 'z'); C(barrel, 0.75, 0.75, 2.4, 0, 0, -6, M.paint2, 'z'); C(barrel, 0.6, 0.6, 1.2, 0, 0, -14, M.dark, 'z');
    const tip = pivotGroup(barrel, 0, 0, -14.8);
    v.turret = turret; v.barrel = barrel; v.tip = tip;
  } else if (type === 'forklift') {
    const h0 = 2.2;
    B(g, W, 3.2, 8, 0, h0 + 1.2, 1.5, M.paint);
    B(g, W - 0.4, 3.8, 3.6, 0, h0 + 2.2, 4.4, M.dark);                              // counterweight
    B(g, W - 1, 0.4, 5, 0, h0 + 2.9, 1, M.dark);
    this.seats(g, M, W - 1, h0 + 3.1, [1.6]);
    this.steering(g, M, 0, h0 + 4.4, -0.6);
    for (const sx of [-1, 1]) for (const sz of [-1.6, 3.2]) B(g, 0.4, 6, 0.4, sx * (W / 2 - 0.5), h0 + 6, sz, M.black);
    B(g, W, 0.4, 5.6, 0, h0 + 9, 0.8, M.black);
    for (let k = 0; k < 6; k++) B(g, W - 0.6, 0.15, 0.2, 0, h0 + 9.1, -1.6 + k * 0.95, M.black);
    // Mast rails, carriage and forks.
    for (const s of [-1, 1]) B(g, 0.6, 12, 0.6, s * 2, h0 + 4.8, -3.2, M.trim);
    B(g, 4.6, 0.5, 0.5, 0, h0 + 10.7, -3.2, M.trim);
    const car = pivotGroup(g, 0, 1, -3.8);
    B(car, 5.2, 2.4, 0.4, 0, 1.2, 0, M.dark); for (let k = 0; k < 4; k++) B(car, 0.15, 2.4, 0.2, -1.8 + k * 1.2, 1.2, -0.2, M.black);
    for (const s of [-1, 1]) { B(car, 0.6, 2.6, 0.4, s * 1.6, 1.2, -0.4, M.steel); B(car, 0.6, 0.35, 6, s * 1.6, 0, -3.2, M.steel); }
    const tip = pivotGroup(car, 0, 0.4, -4);
    v.forks = car; v.tip = tip; v.forkH = 0;
    v.beacon = C(g, 0.4, 0.4, 0.5, 0, h0 + 9.5, 2, M.amber);
    this.lights(g, M, W, h0 + 2, -2.6, 6.3, { hw: 0.8, hh: 0.5 });
    for (const s of [-1, 1]) { this.wheel(v, M, s * (W / 2 - 0.3), -1.8, 1.9, 1.6, false, { rim: 0.55, rimMat: M.yellow }); this.wheel(v, M, s * (W / 2 - 0.5), 4.6, 1.5, 1.2, true, { rim: 0.55, rimMat: M.yellow }); }
  } else if (type === 'heli') {
    const h0 = 2.6;
    // Fuselage: rounded cabin, tail boom, fin and skids.
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), M.paint); body.scale.set(3, 3.2, 5.6); body.position.set(0, h0 + 3.4, -2); body.castShadow = true; g.add(body);
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.glass); bubble.scale.set(2.7, 2.8, 3.4); bubble.rotation.x = -Math.PI / 2 - 0.3; bubble.position.set(0, h0 + 3.6, -4.6); g.add(bubble);
    B(g, 4, 0.2, 2, 0, h0 + 1.6, -2.2, M.dark);
    C(g, 1.1, 0.5, 14, 0, h0 + 4.4, 9, M.paint, 'z');
    B(g, 0.3, 4.2, 2.4, 0, h0 + 6.6, 15.6, M.paint, -0.3); B(g, 4, 0.25, 1.6, 0, h0 + 4.6, 14, M.paint);
    for (const s of [-1, 1]) B(g, 0.12, 0.6, 9, s * 2.75, h0 + 3.6, -1.6, M.stripe);
    for (const s of [-1, 1]) { C(g, 0.3, 0.3, 11, s * 2.6, 0.3, -2, M.trim, 'z'); for (const z of [-5, 1]) B(g, 0.3, 2.4, 0.3, s * 2.3, 1.4, z, M.trim, 0, 0, s * 0.3); }
    C(g, 0.6, 0.8, 1.4, 0, h0 + 6.6, -2, M.dark);
    B(g, 2.2, 1.2, 4, 0, h0 + 6, -0.6, M.paint2);
    const rotor = pivotGroup(g, 0, h0 + 7.5, -2);
    for (let k = 0; k < 4; k++) { const bl = B(rotor, 0.9, 0.12, 15, 0, 0, 0, M.black); bl.rotation.y = k * Math.PI / 2; bl.geometry.translate(0, 0, 7.5); }
    C(rotor, 0.5, 0.5, 0.6, 0, 0.2, 0, M.chrome);
    const trot = pivotGroup(g, 0.5, h0 + 6.4, 16.2);
    for (let k = 0; k < 2; k++) { const b2 = B(trot, 0.12, 4.2, 0.4, 0, 0, 0, M.black); b2.rotation.x = k * Math.PI / 2; }
    v.rotor = rotor; v.trot = trot;
    this.seats(g, M, 4, h0 + 1.9, [-3.5, 0.4]);
    B(g, 0.5, 0.3, 0.3, -2.9, h0 + 3, -1, M.tail); B(g, 0.5, 0.3, 0.3, 2.9, h0 + 3, -1, M.head);
    const tip = pivotGroup(g, 0, 0, -1);
    v.tip = tip; v.vel = new THREE.Vector3(); v.rotorSpin = 0;
    v.ropeLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x1a1a1a }));
    v.ropeLine.frustumCulled = false; v.ropeLine.visible = false;
  }
};

// Flying vehicle parts and wreckage: simple tumbling meshes that bounce on voxels.
const Shards = {
  list: [],
  add(mesh, vel, spin) {
    mesh.updateMatrixWorld(true);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    mesh.matrixWorld.decompose(p, q, s);
    if (mesh.parent) mesh.parent.remove(mesh);
    mesh.position.copy(p); mesh.quaternion.copy(q); mesh.scale.copy(s);
    Game.scene.add(mesh);
    this.list.push({ mesh, v: vel, w: spin || new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10), rest: 0 });
    if (this.list.length > 220) { const o = this.list.shift(); Game.scene.remove(o.mesh); }
  },
  update(dt, w) {
    for (const s of this.list) {
      if (s.rest > 1) continue;
      s.v.y -= G * dt;
      const p = s.mesh.position, nx = p.x + s.v.x * dt, ny = p.y + s.v.y * dt, nz = p.z + s.v.z * dt;
      if (SOLID[w.getf(nx, ny - 0.3, nz)]) {
        if (SOLID[w.getf(p.x, ny - 0.3, p.z)]) { s.v.y *= -0.3; s.v.x *= 0.6; s.v.z *= 0.6; s.w.multiplyScalar(0.6); }
        else { s.v.x *= -0.4; s.v.z *= -0.4; }
        if (s.v.lengthSq() < 2) s.rest += dt * 4;
      } else { p.set(nx, ny, nz); s.mesh.rotation.x += s.w.x * dt; s.mesh.rotation.y += s.w.y * dt; s.mesh.rotation.z += s.w.z * dt; }
      if (p.y < -20) s.rest = 99;
    }
  },
  blast(c, r, k) {
    for (const s of this.list) { const d = s.mesh.position.distanceTo(c); if (d < r) { const dir = s.mesh.position.clone().sub(c).normalize(); dir.y += 0.5; s.v.addScaledVector(dir, k * (1 - d / r)); s.rest = 0; } }
  },
  clear() { for (const s of this.list) Game.scene.remove(s.mesh); this.list = []; }
};

class Vehicle {
  constructor(scene, type, x, z, yaw, opts) {
    opts = opts || {};
    this.type = type; this.T = VTYPES[type]; this.L = this.T.L; this.W = this.T.W;
    this.pos = new THREE.Vector3(x, this.T.water ? WATER_Y - 1.6 : (opts.y != null ? opts.y : GY), z); this.yaw = yaw;
    this.speed = 0; this.vy = 0; this.steer = 0; this.hp = this.T.hp; this.dead = false; this.pitchV = 0; this.rollV = 0;
    this.push = new THREE.Vector2(); this.yawRate = 0; this.cd = 0; this.cd2 = 0; this.held = null;
    this.wheels = []; this.M = VModel.mats(opts.color || this.T.color);
    this.root = new THREE.Group(); this.mesh = new THREE.Group(); this.root.add(this.mesh);
    VModel.build(this, type); VModel.build2(this, type);
    // Everything that is not a pivot holder can be knocked off.
    this.parts = [];
    this.mesh.traverse(o => { if (o.isMesh && o.parent === this.mesh) this.parts.push(o); });
    this.lossMarks = [0.8, 0.6, 0.4, 0.2];
    scene.add(this.root); this.scene = scene; this.smokeT = 0;
    if (this.ballMesh) { scene.add(this.ballMesh); scene.add(this.ropeLine); }
    if (this.T.air) scene.add(this.ropeLine);
    this.sync();
  }
  get name() { return this.T.name; }
  sync() { this.root.position.copy(this.pos); this.root.rotation.set(0, this.yaw, 0); this.mesh.rotation.set(this.pitchV, 0, this.rollV); }
  fwd() { return [-Math.sin(this.yaw), -Math.cos(this.yaw)]; }
  toLocal(p) { const dx = p.x - this.pos.x, dz = p.z - this.pos.z, c = Math.cos(this.yaw), s = Math.sin(this.yaw); return new THREE.Vector3(dx * c - dz * s, p.y - this.pos.y, dx * s + dz * c); }
  groundAt(w, x, z) {
    const fx = Math.floor(x), fz = Math.floor(z);
    for (let y = Math.floor(this.pos.y) + 3; y > Math.floor(this.pos.y) - 12; y--) if (SOLID[w.get(fx, y, fz)]) return y + 1;
    return Math.floor(this.pos.y) - 12;
  }
  // Ray vs the vehicle's local box (slab test). Returns distance or null.
  hitTest(o, d, maxT) {
    const lo = this.toLocal(o), c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    const ld = new THREE.Vector3(d.x * c - d.z * s, d.y, d.x * s + d.z * c);
    const mn = [-this.W / 2, 0, -this.L / 2], mx = [this.W / 2, this.T.H, this.L / 2], O = [lo.x, lo.y, lo.z], D = [ld.x, ld.y, ld.z];
    let t0 = 0, t1 = maxT;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(D[a]) < 1e-6) { if (O[a] < mn[a] || O[a] > mx[a]) return null; continue; }
      let ta = (mn[a] - O[a]) / D[a], tb = (mx[a] - O[a]) / D[a]; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return null;
    }
    return t0;
  }
  knockPart(dir) {
    const cand = this.parts.filter(p => p.parent === this.mesh);
    if (cand.length < 4) return;
    const p = cand[(Math.random() * cand.length) | 0];
    const v = new THREE.Vector3((Math.random() - 0.5) * 14, 8 + Math.random() * 10, (Math.random() - 0.5) * 14);
    if (dir) v.addScaledVector(dir, 10);
    Shards.add(p, v);
  }
  damage(n, dir) {
    if (this.dead || n <= 0) return;
    this.hp -= n;
    const f = this.hp / this.T.hp;
    while (this.lossMarks.length && f < this.lossMarks[0]) { this.lossMarks.shift(); for (let k = 0; k < 3; k++) this.knockPart(dir); }
    if (n > 8 && Math.random() < n / 80) this.knockPart(dir);
    if (this.hp <= 0) this.wreck();
  }
  wreck() {
    this.dead = true; this.speed = 0;
    for (const k in this.M) { const m = this.M[k]; if (m.color) m.color.multiplyScalar(0.16); if (m.emissive) m.emissive.setHex(0); }
    if (Player.vehicle === this) Game.exitVehicle();
    if (this.held) this.held = null;
    // Burst apart: wheels and a good share of panels fly.
    for (const wh of this.wheels) if (Math.random() < 0.6) { const m = wh.spin; Shards.add(m, new THREE.Vector3((Math.random() - 0.5) * 20, 14 + Math.random() * 10, (Math.random() - 0.5) * 20)); }
    const n = Math.floor(this.parts.length * 0.35); for (let k = 0; k < n; k++) this.knockPart();
    this.vy = 14; this.yawRate += (Math.random() - 0.5) * 3;
    Tools.explode(Game.world, this.pos.clone().add(new THREE.Vector3(0, 3, 0)), 5, 2);
    Fire.igniteSphere(Game.world, this.pos.x, this.pos.y + 1, this.pos.z, 6, 0.4);
    Game.toast(this.name + ' destroyed.');
  }
  // Explosion or heavy blow: shove, lift and spin.
  impulse(from, strength) {
    const dx = this.pos.x - from.x, dz = this.pos.z - from.z, d = Math.hypot(dx, dz) || 1;
    const mass = this.T.hp / 150;
    this.push.x += dx / d * strength / mass; this.push.y += dz / d * strength / mass;
    this.vy += strength * 0.6 / mass; this.yawRate += (Math.random() - 0.5) * strength * 0.15 / mass;
  }

  update(dt, w, inp, driving) {
    const T = this.T;
    if (this.dead) driving = false;
    this.cd -= dt; this.cd2 -= dt;
    if (T.air) return this.updateAir(dt, w, inp, driving);
    const thr = driving ? (inp.key('KeyW') ? 1 : 0) - (inp.key('KeyS') ? 1 : 0) : 0;
    const steerIn = driving ? (inp.key('KeyA') ? 1 : 0) - (inp.key('KeyD') ? 1 : 0) : 0;
    const airborne = this.pos.y > this.groundAt(w, this.pos.x, this.pos.z) + 0.6 && !T.water;
    this.steer += (steerIn - this.steer) * Math.min(1, dt * 6);
    if (!airborne) {
      if (thr) this.speed += thr * T.acc * dt * (Math.sign(thr) !== Math.sign(this.speed) && Math.abs(this.speed) > 1 ? 1.6 : 1);
      else this.speed *= Math.max(0, 1 - (T.water ? 0.8 : 1.6) * dt);
      if (driving && inp.key('Space')) this.speed *= Math.max(0, 1 - 6 * dt);
    }
    this.speed = Math.max(-T.maxR, Math.min(T.maxF, this.speed));
    const turnScale = T.tracked ? 1 : Math.max(-1, Math.min(1, this.speed / 5));
    if (!airborne) this.yaw += this.steer * T.turn * dt * turnScale * (Math.abs(this.speed) > 25 ? 25 / Math.abs(this.speed) : 1);
    this.yaw += this.yawRate * dt; this.yawRate *= Math.max(0, 1 - 2.5 * dt);
    const [fx, fz] = this.fwd(), rx = -fz, rz = fx;
    const dirn = Math.sign(this.speed);
    const pushSp = this.push.length();

    if (Math.abs(this.speed) > 0.2 || pushSp > 3) {
      // Sweep the volume we're moving into: break what we can, stop on the rest.
      let mx = fx * this.speed + this.push.x, mz = fz * this.speed + this.push.y;
      const ms = Math.hypot(mx, mz) || 1; mx /= ms; mz /= ms;
      const along = mx * fx + mz * fz;
      const ext = Math.abs(along) > 0.7 ? this.L / 2 : this.W / 2;
      const sx = Math.abs(along) > 0.7 ? rx : fx, sz = Math.abs(along) > 0.7 ? rz : fz, half = Math.abs(along) > 0.7 ? this.W / 2 + 0.5 : this.L / 2;
      const power = Math.max(0, T.power(ms) - (along < -0.7 ? 1 : 0));
      let blocked = false, removed = 0, bx0 = 1e9, by0 = 1e9, bz0 = 1e9, bx1 = -1, by1 = -1, bz1 = -1;
      const samples = [], y0 = Math.floor(this.pos.y) + 2;
      for (let d = 0; d < 2; d++) for (let s = -half; s <= half; s += 0.5) for (let hy = 0; hy < T.H; hy++) {
        const x = Math.floor(this.pos.x + mx * (ext + 1 + d) + sx * s), z = Math.floor(this.pos.z + mz * (ext + 1 + d) + sz * s), y = y0 + hy;
        const m = w.get(x, y, z);
        if (!SOLID[m]) continue;
        if (HARD[m] <= power && !ANCHOR[m]) {
          const i = w.idx(x, y, z);
          if (samples.length < 100) samples.push(x, y, z, m, w.paint[i]);
          w.data[i] = 0; w.paint[i] = 0; removed++;
          if (m === M.BARREL) w.blasts.push(x + 0.5, y + 0.5, z + 0.5);
          if (x < bx0) bx0 = x; if (y < by0) by0 = y; if (z < bz0) bz0 = z; if (x > bx1) bx1 = x; if (y > by1) by1 = y; if (z > bz1) bz1 = z;
        } else if (d === 0) blocked = true;
      }
      if (T.water && this.groundAt(w, this.pos.x + mx * (ext + 1), this.pos.z + mz * (ext + 1)) > WATER_Y - 0.6) blocked = true;
      if (removed) {
        w.markRegion(bx0, by0, bz0, bx1, by1, bz1); Game.queueCheck([bx0, by0, bz0, bx1, by1, bz1]);
        FX.burst(samples, this.pos.x + mx * ext, this.pos.y + 4, this.pos.z + mz * ext, 8);
        SFX.breakMat(samples[3], removed, this.pos);
        this.speed *= Math.max(0.55, 1 - removed * (power >= 3 ? 0.003 : 0.008));
        this.damage(removed * (T.hp > 400 ? 0.02 : 0.12));
        FX.shake = Math.max(FX.shake, Math.min(0.6, removed / 200) * (driving ? 1 : 0.3));
      }
      if (blocked) {
        const sp = Math.max(Math.abs(this.speed), pushSp);
        if (sp > 6) { SFX.thump(this.pos, 0.8); this.damage(sp * (T.hp > 400 ? 0.4 : 1.4)); }
        this.speed = -this.speed * 0.2; this.push.multiplyScalar(-0.2);
      }
    }
    this.pos.x += (fx * this.speed + this.push.x) * dt; this.pos.z += (fz * this.speed + this.push.y) * dt;
    this.push.multiplyScalar(Math.max(0, 1 - (airborne ? 0.3 : 3) * dt));
    this.pos.x = Math.max(8, Math.min(WORLD_X - 8, this.pos.x)); this.pos.z = Math.max(8, Math.min(WORLD_Z - 8, this.pos.z));

    if (T.water) {
      const gy = this.groundAt(w, this.pos.x, this.pos.z);
      const target = Math.max(gy, WATER_Y - 1.6 + Math.sin(performance.now() / 600 + this.pos.x) * 0.15);
      if (this.vy > 0 || this.pos.y > target + 0.5) { this.vy -= G * dt; this.pos.y += this.vy * dt; if (this.pos.y < target) { this.pos.y = target; this.vy = 0; } }
      else this.pos.y += (target - this.pos.y) * Math.min(1, dt * 4);
      this.pitchV += ((-this.speed / T.maxF) * 0.08 - this.pitchV) * Math.min(1, dt * 3);
      this.rollV += (this.steer * this.speed / T.maxF * 0.12 - this.rollV) * Math.min(1, dt * 3);
      if (Math.abs(this.speed) > 4 && Math.random() < 0.6) FX.steam(this.pos.x - fx * this.L / 2 + (Math.random() - 0.5) * 4, WATER_Y + 0.3, this.pos.z - fz * this.L / 2);
      if (this.prop) this.prop.rotation.z += this.speed * dt * 2;
    } else {
      const hl = this.L * 0.32, hwid = this.W * 0.4;
      const ga = (a, b) => this.groundAt(w, this.pos.x + fx * a + rx * b, this.pos.z + fz * a + rz * b);
      const gFL = ga(hl, hwid), gFR = ga(hl, -hwid), gBL = ga(-hl, hwid), gBR = ga(-hl, -hwid);
      const gF = Math.max(gFL, gFR), gB = Math.max(gBL, gBR), gL = Math.max(gFL, gBL), gR = Math.max(gFR, gBR);
      let gy = -1e9;
      for (const g2 of [gF, gB, this.groundAt(w, this.pos.x, this.pos.z)]) if (g2 <= this.pos.y + 2.5) gy = Math.max(gy, g2);
      if (this.pos.y > gy + 0.05 || this.vy > 0) {
        this.vy -= G * dt; this.pos.y += this.vy * dt;
        if (this.pos.y <= gy) { this.pos.y = gy; if (this.vy < -22) { this.damage((-this.vy - 22) * 3); SFX.thump(this.pos, 1); FX.shake = Math.max(FX.shake, driving ? 0.5 : 0.1); } this.vy = 0; }
      } else { this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 12); this.vy = 0; }
      const cl = (v) => Math.max(-0.4, Math.min(0.4, v));
      const air = this.pos.y > gy + 0.6;
      const tp = air ? this.pitchV + this.vy * 0.0015 : cl(Math.atan2(gF - gB, hl * 2));
      const tr = air ? this.rollV : cl(Math.atan2(gL - gR, hwid * 2)) + this.steer * this.speed / T.maxF * 0.05;
      this.pitchV += (tp - this.pitchV) * Math.min(1, dt * 8); this.rollV += (tr - this.rollV) * Math.min(1, dt * 8);
      for (const wh of this.wheels) { wh.spin.rotation.x -= this.speed * dt / wh.r; if (wh.front) wh.pivot.rotation.y = this.steer * 0.45; }
      if (this.tracks) for (const t of this.tracks) t.position.z = ((t.position.z - this.speed * dt * 0.3) % 0.7 + 0.7) % 0.7 - 0.35;
    }
    if (driving) this.work(dt, w, inp);
    this.updateGear(dt, w);
    this.common(dt, driving, fx, fz);
  }

  updateAir(dt, w, inp, driving) {
    const v = this.vel, T = this.T;
    const ground = this.groundAt(w, this.pos.x, this.pos.z);
    const onGround = this.pos.y <= ground + 0.05;
    const powered = driving && !this.dead;
    this.rotorSpin = Math.min(1, Math.max(0, this.rotorSpin + (powered ? dt * 0.5 : -dt * 0.3)));
    const lift = this.rotorSpin;
    if (powered) {
      const f = (inp.key('KeyW') ? 1 : 0) - (inp.key('KeyS') ? 1 : 0), up = (inp.key('Space') ? 1 : 0) - (inp.key('KeyC') || inp.key('ControlLeft') ? 1 : 0);
      const turn = (inp.key('KeyA') ? 1 : 0) - (inp.key('KeyD') ? 1 : 0);
      this.yaw += turn * T.turn * dt * lift;
      const [fx, fz] = this.fwd();
      v.x += fx * f * T.acc * dt * lift; v.z += fz * f * T.acc * dt * lift;
      v.y += (up * 18 - v.y) * dt * 2 * lift;
      this.pitchV += (-f * 0.22 * lift - this.pitchV) * dt * 3; this.rollV += (turn * 0.15 * lift - this.rollV) * dt * 3;
      this.work(dt, w, inp);
    } else { this.pitchV *= 1 - dt * 2; this.rollV *= 1 - dt * 2; }
    v.y -= G * (1 - lift * (powered ? 1 : 0.6)) * dt;
    v.x *= 1 - 0.8 * dt; v.z *= 1 - 0.8 * dt;
    const hs = Math.hypot(v.x, v.z); if (hs > T.maxF) { v.x *= T.maxF / hs; v.z *= T.maxF / hs; }
    v.x += this.push.x * dt * 3; v.z += this.push.y * dt * 3; this.push.multiplyScalar(1 - dt * 3);
    if (this.vy) { v.y += this.vy; this.vy = 0; }
    const np = this.pos.clone().addScaledVector(v, dt);
    // Hull and rotor-disc probes: leaves and glass shred, anything else is a crash.
    let hit = false;
    const [fx, fz] = this.fwd(), rx = -fz, rz = fx;
    for (const [a, b, h] of [[-6, 0, 1], [6, 0, 1], [0, 2.5, 3], [0, -2.5, 3], [-8, 0, 6], [8, 0, 6], [0, 8, 10], [0, -8, 10], [14, 0, 6], [-4, 0, 10]]) {
      const x = np.x + fx * -a + rx * b, z = np.z + fz * -a + rz * b, y = np.y + h;
      const m = w.getf(x, y, z);
      if (!SOLID[m]) continue;
      if (h === 10 && HARD[m] <= 0) { const r = w.carve(x, y, z, 1.8, 0, false); if (r.n) { FX.burst(r.samples, x, y, z, 10); Game.queueCheck([r.x0, r.y0, r.z0, r.x1, r.y1, r.z1]); } continue; }
      hit = true;
    }
    if (np.y < ground) { np.y = ground; if (v.y < -16) { this.damage((-v.y - 16) * 6); SFX.thump(this.pos, 1); } v.y = 0; v.x *= 0.5; v.z *= 0.5; }
    if (hit) { const sp = v.length(); if (sp > 8) { this.damage(sp * 2); SFX.thump(this.pos, 1); FX.shake = Math.max(FX.shake, 0.4); } v.multiplyScalar(-0.35); }
    else this.pos.copy(np);
    this.pos.x = Math.max(8, Math.min(WORLD_X - 8, this.pos.x)); this.pos.z = Math.max(8, Math.min(WORLD_Z - 8, this.pos.z)); this.pos.y = Math.min(WORLD_Y + 30, this.pos.y);
    this.speed = Math.hypot(v.x, v.z);
    this.rotor.rotation.y += lift * dt * 30; this.trot.rotation.x += lift * dt * 50;
    if (lift > 0.5 && this.pos.y - ground < 18) for (let k = 0; k < 2; k++) FX.dust(this.pos.x + (Math.random() - 0.5) * 16, ground + 0.5, this.pos.z + (Math.random() - 0.5) * 16);
    this.updateGear(dt, w);
    this.common(dt, driving, fx, fz);
  }

  common(dt, driving, fx, fz) {
    if (this.beacon) this.beacon.material.emissiveIntensity = driving ? 0.4 + (Math.sin(performance.now() / 120) > 0 ? 0.8 : 0) : 0.2;
    if (this.hp < this.T.hp * 0.35 || this.dead) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) { this.smokeT = this.dead ? 0.08 : 0.2; FX.smoke(this.pos.x + fx * this.L * 0.3, this.pos.y + this.T.H * 0.6, this.pos.z + fz * this.L * 0.3, 3, this.dead ? 0.6 : 0.35); if (this.dead && Math.random() < 0.4) FX.flame(this.pos.x, this.pos.y + 3, this.pos.z, 2.5); }
    }
    for (const b of Bodies.list) {
      const dx = b.pos.x - this.pos.x, dz = b.pos.z - this.pos.z, dh = Math.hypot(dx, dz);
      if (dh < this.L * 0.6 + b.radius * 0.6 && b.pos.y < this.pos.y + this.T.H + 2 && b.pos.y > this.pos.y - 4) {
        // Falling debris crushes us; we shove debris we drive into.
        if (b.v.y < -8 && b.pos.y > this.pos.y + this.T.H * 0.5) { this.damage(Math.min(200, b.mass * -b.v.y / 400)); b.v.y *= -0.2; }
        if (Math.abs(this.speed) > 1) { const k = Math.min(1, 600 / b.mass); b.v.x += fx * this.speed * 0.15 * k; b.v.z += fz * this.speed * 0.15 * k; b.v.y += 0.6 * k; b.rest = 0; }
      }
    }
    this.sync();
  }

  // Driver-controlled work equipment.
  work(dt, w, inp) {
    const t = this.type, aimYaw = Player.yaw - this.yaw, aimPitch = Player.pitch;
    const raise = (inp.key('KeyR') ? 1 : 0) - (inp.key('KeyF') ? 1 : 0);
    const slew = (obj, rate) => { let d = aimYaw - obj.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); obj.rotation.y += Math.max(-rate * dt, Math.min(rate * dt, d)); return d; };
    const tipPos = () => { this.root.updateMatrixWorld(true); return this.tip.getWorldPosition(new THREE.Vector3()); };
    if (t === 'wrecker') {
      slew(this.turret, 0.9);
      this.ball.rope = Math.max(8, Math.min(34, this.ball.rope - raise * 10 * dt));
    } else if (t === 'excavator') {
      const d = slew(this.turret, 0.8);
      this.boomA = Math.max(-0.5, Math.min(0.9, this.boomA + raise * 0.6 * dt)); this.boom.rotation.x = this.boomA;
      this.stick.rotation.x = -1.5 + Math.max(0, -aimPitch) * 0.8;
      const tp = tipPos();
      const dig = inp.mouse[0] && this.cd <= 0, sweep = Math.abs(d) > 0.05 && SOLID[w.getf(tp.x, tp.y, tp.z)];
      if (dig || sweep) {
        this.cd = 0.18;
        const r = w.carve(tp.x, tp.y, tp.z, dig ? 2.6 : 1.6, dig ? 3 : 2, true, i => Fire.map.delete(i));
        if (r.n) { FX.burst(r.samples, tp.x, tp.y, tp.z, 6); SFX.breakMat(r.samples[3], r.n, tp); Game.queueCheck([r.x0, r.y0, r.z0, r.x1, r.y1, r.z1]); this.bucketLoad = Math.min(1, (this.bucketLoad || 0) + r.n / 80); }
        if (dig) this.stick.rotation.x -= 0.25;
      }
      if (inp.mouse[2] && this.bucketLoad > 0.2 && this.cd2 <= 0) {
        this.cd2 = 0.4; const s = []; for (let k = 0; k < 20; k++) s.push(Math.floor(tp.x), Math.floor(tp.y), Math.floor(tp.z), M.DIRT, 0);
        FX.burst(s, tp.x, tp.y + 1, tp.z, 3); this.bucketLoad = 0;
      }
    } else if (t === 'fire') {
      slew(this.turret, 1.6); this.barrel.rotation.x = Math.max(-0.4, Math.min(0.8, aimPitch + 0.1));
      if (inp.mouse[0]) {
        const tp = tipPos(), dir = new THREE.Vector3(); this.tip.getWorldDirection(dir); dir.negate();
        const h = w.raycast(tp.x, tp.y, tp.z, dir.x, dir.y, dir.z, 70, false), len = h ? h.t : 70;
        for (let k = 0; k < 4; k++) { const s = Math.random() * len; FX.steam(tp.x + dir.x * s, tp.y + dir.y * s - s * s * 0.002, tp.z + dir.z * s); }
        SFX.setLoop('ext', 0.3); this.spraying = true;
        if (h) {
          Fire.extinguish(w, h.px, h.py, h.pz, 7);
          if (this.cd <= 0) { this.cd = 0.12; const r = w.carve(h.px, h.py, h.pz, 1.4, 0, false); if (r.n) { FX.burst(r.samples, h.px, h.py, h.pz, 4); Game.queueCheck([r.x0, r.y0, r.z0, r.x1, r.y1, r.z1]); } }
          const hp = new THREE.Vector3(h.px, h.py, h.pz);
          for (const b of Bodies.list) if (b.pos.distanceTo(hp) < b.radius + 4) { b.v.addScaledVector(dir, 120 / Math.sqrt(b.mass)); b.rest = 0; }
          for (const o of Game.vehicles) if (o !== this && o.pos.distanceTo(hp) < o.L * 0.6) o.push.add(new THREE.Vector2(dir.x, dir.z).multiplyScalar(40 / (o.T.hp / 150)));
          Shards.blast(hp, 5, 6);
        }
      } else if (this.spraying) { SFX.setLoop('ext', 0); this.spraying = false; }
    } else if (t === 'tank') {
      slew(this.turret, 0.9); this.barrel.rotation.x = Math.max(-0.12, Math.min(0.45, aimPitch + 0.08));
      const tp = tipPos(), dir = new THREE.Vector3(); this.tip.getWorldDirection(dir); dir.negate();
      if (inp.mouse[0] && this.cd <= 0) {
        this.cd = 2.2; SFX.boom(tp, false); FX.fireball(tp.x, tp.y, tp.z, 1.5); FX.flash(tp.x, tp.y, tp.z, 5, 0.15); FX.shake = Math.max(FX.shake, 0.5);
        Tools.launch('shell', tp.clone().addScaledVector(dir, 1), dir.clone().multiplyScalar(150), { r: 6, power: 4 });
        this.push.x -= dir.x * 4; this.push.y -= dir.z * 4;
      }
      if (inp.mouse[2] && this.cd2 <= 0) {
        this.cd2 = 0.09; SFX.burst(0.12, 1600, 0.6, 0.5, 'lowpass');
        const sx = dir.x + (Math.random() - 0.5) * 0.03, sy = dir.y + (Math.random() - 0.5) * 0.03, sz = dir.z + (Math.random() - 0.5) * 0.03;
        Tools.bullet(w, tp, new THREE.Vector3(sx, sy, sz).normalize(), 0.8, 1, 18, this);
      }
    } else if (t === 'forklift') {
      this.forkH = Math.max(0, Math.min(9, this.forkH + raise * 5 * dt)); this.forks.position.y = 1 + this.forkH;
      const tp = tipPos();
      if (inp.mouse[0] && !this.held) {
        let best = null, bd = 9;
        for (const b of Bodies.list) { const d = b.pos.distanceTo(tp); if (d < bd + b.radius * 0.5 && b.mass < 4000) { bd = d; best = b; } }
        if (best) { this.held = best; SFX.click(); } else if (this.cd <= 0) { this.cd = 0.5; Game.toast('Nothing loose to lift. Knock something over first.'); }
      }
      if (inp.mouse[2] && this.held) this.held = null;
    } else if (t === 'heli') {
      const tp = this.pos.clone();
      if (inp.mouse[0] && !this.held) {
        let best = null, bd = 1e9;
        for (const b of Bodies.list) { const dx = b.pos.x - tp.x, dz = b.pos.z - tp.z, dy = tp.y - b.pos.y; if (dy > 0 && dy < 40 && Math.hypot(dx, dz) < 10 + b.radius * 0.5 && b.mass < 9000 && dy < bd) { bd = dy; best = b; } }
        if (best) { this.held = best; SFX.pickup(); } else if (this.cd <= 0) { this.cd = 0.5; Game.toast('Hover over loose debris to hook it.'); }
      }
      if (inp.mouse[2] && this.held) this.held = null;
    }
  }

  // Equipment that runs whether or not anyone is driving: the wrecking ball and carried loads.
  updateGear(dt, w) {
    if (this.ball) {
      const b = this.ball, tip = (this.root.updateMatrixWorld(true), this.tip.getWorldPosition(new THREE.Vector3()));
      if (!b.init) { b.pos.copy(tip).add(new THREE.Vector3(0, -b.rope, 0)); b.init = true; }
      const sub = 3, h = dt / sub;
      for (let s = 0; s < sub; s++) {
        b.vel.y -= G * h; b.vel.multiplyScalar(1 - 0.05 * h);
        const prev = b.pos.clone(); b.pos.addScaledVector(b.vel, h);
        const d = b.pos.clone().sub(tip), dl = d.length();
        if (dl > b.rope) { d.divideScalar(dl); b.pos.copy(tip).addScaledVector(d, b.rope); const out = b.vel.dot(d); if (out > 0) b.vel.addScaledVector(d, -out); }
        // Smash what the ball touches.
        let touch = SOLID[w.getf(b.pos.x, b.pos.y, b.pos.z)];
        for (const o of NEIGH6) if (!touch && SOLID[w.getf(b.pos.x + o[0] * 2, b.pos.y + o[1] * 2, b.pos.z + o[2] * 2)]) touch = true;
        if (touch) {
          const sp = b.vel.length();
          if (sp > 5) {
            const r = w.carve(b.pos.x, b.pos.y, b.pos.z, 2.8, sp > 15 ? 3 : 2, sp > 15, i => Fire.map.delete(i));
            if (r.n) { FX.burst(r.samples, b.pos.x, b.pos.y, b.pos.z, sp * 0.6); SFX.breakMat(r.samples[3], r.n, b.pos); Game.queueCheck([r.x0, r.y0, r.z0, r.x1, r.y1, r.z1]); FX.shake = Math.max(FX.shake, Math.min(0.5, 30 / (b.pos.distanceTo(Player.pos) + 20))); b.vel.multiplyScalar(r.n > 20 ? 0.75 : 0.4); }
            else { b.pos.copy(prev); b.vel.multiplyScalar(-0.3); SFX.thump(b.pos, 0.7); }
          } else { b.pos.copy(prev); b.vel.multiplyScalar(0.3); }
        }
      }
      for (const o of Game.vehicles) if (o !== this && !o.dead && o.toLocal(b.pos).length() < o.L * 0.55) { const sp = b.vel.length(); if (sp > 6) { o.damage(sp * 4, b.vel.clone().normalize()); o.impulse(b.pos.clone().sub(b.vel), sp * 1.5); b.vel.multiplyScalar(-0.4); } }
      for (const bd of Bodies.list) if (bd.pos.distanceTo(b.pos) < bd.radius * 0.6 + 2) { bd.v.addScaledVector(b.vel, Math.min(1, 300 / bd.mass)); bd.rest = 0; }
      this.ballMesh.position.copy(b.pos);
      const pa = this.ropeLine.geometry.attributes.position; pa.setXYZ(0, tip.x, tip.y, tip.z); pa.setXYZ(1, b.pos.x, b.pos.y + 2, b.pos.z); pa.needsUpdate = true;
    }
    if (this.held) {
      const b = this.held;
      if (b.dead || !Bodies.list.includes(b)) { this.held = null; if (this.ropeLine && this.T.air) this.ropeLine.visible = false; return; }
      const target = this.T.air ? this.pos.clone().add(new THREE.Vector3(0, -4 - b.radius, 0)) : (this.root.updateMatrixWorld(true), this.tip.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, b.radius * 0.4, 0)));
      b.v.copy(target.sub(b.pos).multiplyScalar(8)); b.w.multiplyScalar(0.85); b.rest = 0; b.age = 0;
      if (this.ropeLine && this.T.air) { this.ropeLine.visible = true; const pa = this.ropeLine.geometry.attributes.position; pa.setXYZ(0, this.pos.x, this.pos.y + 1, this.pos.z); pa.setXYZ(1, b.pos.x, b.pos.y, b.pos.z); pa.needsUpdate = true; }
    } else if (this.ropeLine && this.T.air) this.ropeLine.visible = false;
  }

  pushOut(p) {
    const lo = this.toLocal(p.pos);
    if (Math.abs(lo.z) < this.L / 2 + p.hw && Math.abs(lo.x) < this.W / 2 + p.hw && p.pos.y < this.pos.y + this.T.H && p.pos.y + p.h > this.pos.y) {
      const [fx, fz] = this.fwd();
      const pf = this.L / 2 + p.hw - Math.abs(lo.z), pr = this.W / 2 + p.hw - Math.abs(lo.x);
      if (pf < pr) { const s = -Math.sign(lo.z); p.pos.x += fx * s * pf; p.pos.z += fz * s * pf; }
      else { const s = Math.sign(lo.x); p.pos.x += -fz * -s * pr; p.pos.z += fx * -s * pr; }
      // Being hit by a moving vehicle hurts.
      if (Math.abs(this.speed) > 10 && Player.vehicle !== this) Player.damage(Math.abs(this.speed) * 0.08, 'crush');
    }
  }
  dispose() { this.scene.remove(this.root); if (this.ballMesh) { this.scene.remove(this.ballMesh); this.scene.remove(this.ropeLine); } if (this.T.air) this.scene.remove(this.ropeLine); }
}

// Vehicles bump into each other.
function collideVehicles(list) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.T.air || b.T.air) continue;
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz);
    const ra = (a.L + a.W) * 0.27, rb = (b.L + b.W) * 0.27;
    if (d >= ra + rb || d < 0.01 || Math.abs(a.pos.y - b.pos.y) > 6) continue;
    const nx = dx / d, nz = dz / d, pen = ra + rb - d;
    const ma = a.T.hp, mb = b.T.hp, ta = mb / (ma + mb), tb = ma / (ma + mb);
    a.pos.x -= nx * pen * ta; a.pos.z -= nz * pen * ta; b.pos.x += nx * pen * tb; b.pos.z += nz * pen * tb;
    const [afx, afz] = a.fwd(), [bfx, bfz] = b.fwd();
    const va = (afx * nx + afz * nz) * a.speed + a.push.x * nx + a.push.y * nz, vb = (bfx * nx + bfz * nz) * b.speed + b.push.x * nx + b.push.y * nz;
    const rel = va - vb;
    if (rel > 0) {
      const dmg = rel * rel * 0.08;
      a.damage(dmg * ta * 2); b.damage(dmg * tb * 2);
      b.push.x += nx * rel * ta * 1.2; b.push.y += nz * rel * ta * 1.2; a.push.x -= nx * rel * tb * 0.6; a.push.y -= nz * rel * tb * 0.6;
      a.speed *= 0.5; b.speed *= 0.8; b.yawRate += (Math.random() - 0.5) * rel * 0.05;
      if (rel > 6) SFX.thump(a.pos, Math.min(1, rel / 20));
    }
  }
}
