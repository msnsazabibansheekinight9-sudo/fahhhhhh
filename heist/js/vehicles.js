'use strict';
// Vehicles: lane-following traffic on the road grid, arcade driving with
// world collisions and damage, carjacking, police pursuit and the radio.

H.cars = [];
const _c1 = new THREE.Vector3(), _c2 = new THREE.Vector3();
H.Car = class {
  constructor(type, x, z, yaw, opts = {}) {
    this.type = type; this.g = H.buildCar(type, opts.color); this.T = this.g.userData.T;
    this.pos = new THREE.Vector3(x, 0, z); this.yaw = yaw; this.speed = 0; this.steer = 0; this.hp = type === 'armored' ? 3000 : 900;
    this.ai = !!opts.ai; this.police = type === 'police' || type === 'swatvan'; this.parked = !!opts.parked; this.wheelRot = 0;
    this.g.position.copy(this.pos); this.g.rotation.y = yaw; H.scene.add(this.g);
    this.radius = this.T.W / 2 + 0.1; this.siren = !!opts.siren; this.flashT = 0;
    this.static = !!opts.static;
    H.cars.push(this);
  }
  remove() { H.scene.remove(this.g); const i = H.cars.indexOf(this); if (i >= 0) H.cars.splice(i, 1); }
  fwd(out) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  // AI: drive lane to lane between intersections
  pickNext() {
    const C = H.city, P = C.P, N = C.N, off = C.laneOffset;
    const xi = Math.round(this.node.x / P), zi = Math.round(this.node.z / P);
    const opts = [];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (dx === -this.dir[0] && dz === -this.dir[1]) continue; // no U-turns
      const nx = xi + dx, nz = zi + dz; if (nx < 0 || nz < 0 || nx > N || nz > N) continue;
      opts.push([dx, dz]);
    }
    let d = opts.length ? H.pick(opts) : [-this.dir[0], -this.dir[1]];
    if (this.pursue) { // police: choose the move that closes on the target
      const tp = this.pursue; let best = Infinity;
      for (const o of opts) { const dd = Math.abs((xi + o[0]) * P - tp.x) + Math.abs((zi + o[1]) * P - tp.z); if (dd < best) { best = dd; d = o; } }
    }
    this.dir = d;
    this.node = { x: (xi + d[0]) * P, z: (zi + d[1]) * P };
    // lane offset: right-hand traffic
    this.wp = { x: this.node.x + (d[1] ? -off * d[1] : 0), z: this.node.z + (d[0] ? off * d[0] : 0) };
  }
  updateAI(dt) {
    if (!this.wp) return;
    const toX = this.wp.x - this.pos.x, toZ = this.wp.z - this.pos.z, dist = Math.hypot(toX, toZ);
    if (dist < 5) this.pickNext();
    const want = Math.atan2(-toX, -toZ);
    let da = want - this.yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    this.steer = H.clamp(da * 2, -1, 1);
    // brake for anything ahead
    let target = this.police && this.pursue ? 22 : 11;
    if (Math.abs(da) > 0.4) target = Math.min(target, 6);
    const f = this.fwd(_c1);
    for (const o of H.cars) { if (o === this) continue; _c2.subVectors(o.pos, this.pos); const ahead = _c2.dot(f); if (ahead > 0 && ahead < 10 && Math.abs(_c2.x * f.z - _c2.z * f.x) < 2.2) target = Math.min(target, (ahead - 5) * 1.2); }
    const P = H.P; _c2.subVectors(P.pos, this.pos); const pa = _c2.dot(f);
    if (!P.inCar && pa > 0 && pa < 9 && Math.abs(_c2.x * f.z - _c2.z * f.x) < 1.8) target = Math.min(target, 0);
    for (const n of H.npcs) { if (n.dead) continue; _c2.subVectors(n.pos, this.pos); const a = _c2.dot(f); if (a > 0 && a < 7 && Math.abs(_c2.x * f.z - _c2.z * f.x) < 1.6) { target = Math.min(target, 0); break; } }
    this.speed = H.damp(this.speed, Math.max(0, target), target < this.speed ? 4 : 1.2, dt);
    if (this.pursue && this.pos.distanceTo(this.pursue) < 30) this.speed = H.damp(this.speed, 0, 3, dt);
  }
  update(dt) {
    if (this.static) return;
    if (this.driver === 'ai' && this.wp) this.updateAI(dt);
    if (this.driver === 'player') this.updatePlayer(dt);
    if (!this.driver) { this.speed = H.damp(this.speed, 0, 1.5, dt); }
    if (Math.abs(this.speed) > 0.01) {
      this.yaw += this.steer * this.speed * dt * 0.09 * (this.drift ? 1.6 : 1) * (this.driver === 'ai' ? 1.6 : 1);
      const f = this.fwd(_c1);
      this.pos.addScaledVector(f, this.speed * dt);
      if (this.driver === 'player' || this.police) this.collide(dt);
    }
    this.g.position.copy(this.pos); this.g.rotation.y = this.yaw;
    // wheels
    this.wheelRot += this.speed * dt / 0.38;
    const ws = this.g.userData.wheels;
    for (let i = 0; i < ws.length; i++) { ws[i].rotation.x = -this.wheelRot; if (i % 2 === 0) ws[i].rotation.y = -this.steer * 0.45; }
    if (this.g.userData.lights && this.siren) { this.flashT += dt; const on = Math.floor(this.flashT * 6) % 2; this.g.userData.lights[0].visible = !!on; this.g.userData.lights[1].visible = !on; }
    // lean and pitch for weight transfer
    this.g.rotation.z = H.damp(this.g.rotation.z, this.steer * Math.min(1, Math.abs(this.speed) / 20) * 0.05, 6, dt);
  }
  collide(dt) {
    const f = this.fwd(_c1), L = this.T.L / 2 - this.radius * 0.6;
    let hit = 0;
    for (const s of [-1, 0, 1]) {
      const p = _c2.copy(this.pos).addScaledVector(f, s * L); const px = p.x, pz = p.z;
      const q = { x: px, y: 0.2, z: pz }; H.world.move(q, this.radius, 1.2, 0.6);
      const dx = q.x - px, dz = q.z - pz;
      if (dx || dz) { this.pos.x += dx; this.pos.z += dz; hit = Math.max(hit, Math.hypot(dx, dz)); }
    }
    if (hit > 0.02) {
      const impact = Math.abs(this.speed);
      if (impact > 8) { this.hp -= impact * 6; H.audio.noise(0.3, 200, 0.6, Math.min(1, impact / 20), this.pos, 'lowpass'); if (this.driver === 'player') { H.game.shake = Math.min(2, impact / 10); H.P.hp -= 0; } H.fx.sparks(this.pos.clone().setY(0.6), 8); }
      this.speed *= 0.55;
    }
    // other cars
    for (const o of H.cars) {
      if (o === this) continue;
      _c2.subVectors(this.pos, o.pos); _c2.y = 0; const d = _c2.length(), min = this.radius + o.radius + 0.8;
      if (d < min && d > 0.01) { _c2.multiplyScalar((min - d) / d * 0.5); this.pos.add(_c2); if (!o.static) o.pos.sub(_c2); if (Math.abs(this.speed) > 6) { o.hp -= Math.abs(this.speed) * 4; if (o.driver === 'ai') { o.speed = 0; } } this.speed *= 0.7; }
    }
    // run over pedestrians and enemies
    if (Math.abs(this.speed) > 3) for (const n of H.npcs) {
      if (n.dead || n.kind === 'bot') continue;
      _c2.subVectors(n.pos, this.pos); _c2.y = 0;
      const along = _c2.dot(f), side = Math.abs(_c2.x * f.z - _c2.z * f.x);
      if (Math.abs(along) < this.T.L / 2 + 0.3 && side < this.T.W / 2 + 0.3) {
        n.damage(Math.abs(this.speed) * 30, this.driver === 'player' ? 'player' : 'car', { vehicle: true });
        n.pos.addScaledVector(f, 1.5);
        this.speed *= 0.85;
      }
    }
  }
  updatePlayer(dt) {
    const k = H.keys, T = this.T;
    const thr = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
    const st = (k.KeyA ? 1 : 0) - (k.KeyD ? 1 : 0);
    this.drift = !!k.Space;
    const top = T.speed * (this.hp < 200 ? 0.5 : 1);
    if (thr > 0) this.speed = Math.min(top, this.speed + T.accel * dt * (this.speed < 0 ? 2.5 : 1));
    else if (thr < 0) this.speed = Math.max(-top * 0.35, this.speed - T.accel * 1.6 * dt);
    else this.speed = H.damp(this.speed, 0, 0.6, dt);
    if (this.drift) this.speed = H.damp(this.speed, 0, 1.4, dt);
    this.steer = H.damp(this.steer, st * (1 - Math.min(0.55, Math.abs(this.speed) / T.speed * 0.6)) * Math.sign(this.speed || 1), 6, dt);
    H.audio.engine(true, H.clamp(Math.abs(this.speed) / T.speed, 0, 1));
    if (this.hp <= 0 && !this.burning) { this.burning = true; H.fx.fire(this.pos.clone(), 12, 1.5); setTimeout(() => { if (H.P.inCar === this) H.game.exitCar(); H.game.explode(this.pos.clone().setY(1), 6, 1500, 'car'); this.speed = 0; this.dead = true; }, 3500); }
  }
};

/* ---------------- traffic management ---------------- */
H.traffic = {
  target: 26, timer: 0,
  spawnOne(near, opts = {}) {
    const C = H.city, P = C.P, N = C.N, off = C.laneOffset;
    // choose a road node at a moderate distance from the player
    for (let tries = 0; tries < 20; tries++) {
      const xi = H.randi(0, N), zi = H.randi(0, N);
      const x = xi * P, z = zi * P;
      const d = Math.hypot(x - near.x, z - near.z);
      if (d < (opts.minD || 60) || d > (opts.maxD || 260)) continue;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => xi + dx >= 0 && xi + dx <= N && zi + dz >= 0 && zi + dz <= N);
      const dir = H.pick(dirs);
      const yaw = Math.atan2(-dir[0], -dir[1]);
      const lx = x + (dir[1] ? -off * dir[1] : 0) + dir[0] * 10, lz = z + (dir[0] ? off * dir[0] : 0) + dir[1] * 10;
      const type = opts.type || H.pick(['sedan', 'sedan', 'sports', 'muscle', 'suv', 'van', 'taxi', 'taxi', 'convertible']);
      const car = new H.Car(type, lx, lz, yaw, { ai: true, siren: opts.siren });
      car.driver = 'ai'; car.dir = dir; car.node = { x, z }; car.pickNextFrom = true;
      car.node = { x: x, z: z }; car.dir = dir; car.pickNext();
      car.speed = 8;
      if (opts.pursue) car.pursue = opts.pursue;
      return car;
    }
    return null;
  },
  update(dt) {
    const P = H.P, near = P.inCar ? P.inCar.pos : P.pos;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.5;
      const live = H.cars.filter(c => c.driver === 'ai' && !c.police);
      if (live.length < this.target) this.spawnOne(near);
      // despawn far traffic
      for (const c of H.cars.slice()) { if (c.driver !== 'player' && !c.keep && c.pos.distanceTo(near) > 320) c.remove(); }
    }
    for (const c of H.cars) c.update(dt);
  },
  parkCars() {
    for (const s of (H.city.parkSpots || [])) { const c = new H.Car(H.pick(['sedan', 'sports', 'muscle', 'suv', 'convertible', 'van']), s.x, s.z, s.ry, { parked: true }); c.keep = true; }
  },
};

/* ---------------- radio ---------------- */
H.RADIO = ['Off', 'Flash 86 — synthwave', 'Wave 104 — late night', 'Rush FM — chase beats'];
H.radioIdx = 1;
