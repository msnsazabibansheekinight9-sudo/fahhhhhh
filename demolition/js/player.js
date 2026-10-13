'use strict';
/* Crumble — first-person walker with voxel collision, step-up, ladders and swimming; and the wheel loader. */

const Player = {
  pos: new THREE.Vector3(), vel: new THREE.Vector3(),
  yaw: 0, pitch: 0, hw: 1.1, h: 7, onGround: false, health: 100, stepSmooth: 0, bob: 0, crouch: false,
  climbing: false, swimming: false, vehicle: null, hurtT: 0,
  reset(x, y, z, yaw) {
    this.pos.set(x, y, z); this.vel.set(0, 0, 0); this.yaw = yaw; this.pitch = 0;
    this.health = 100; this.vehicle = null; this.stepSmooth = 0; this.crouch = false; this.h = 7;
  },
  collides(w, px, py, pz, h) {
    const hw = this.hw;
    const x0 = Math.floor(px - hw), x1 = Math.floor(px + hw - 1e-6);
    const y0 = Math.floor(py), y1 = Math.floor(py + (h || this.h) - 1e-6);
    const z0 = Math.floor(pz - hw), z1 = Math.floor(pz + hw - 1e-6);
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (SOLID[w.get(x, y, z)]) return true;
    return false;
  },
  touches(w, mat) {
    const hw = this.hw + 0.3, p = this.pos;
    for (let y = Math.floor(p.y); y <= Math.floor(p.y + this.h - 1); y++)
      for (let z = Math.floor(p.z - hw); z <= Math.floor(p.z + hw); z++)
        for (let x = Math.floor(p.x - hw); x <= Math.floor(p.x + hw); x++) if (w.get(x, y, z) === mat) return true;
    return false;
  },
  move(w, dx, dy, dz) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 0.4));
    dx /= steps; dy /= steps; dz /= steps;
    this.onGround = false;
    const p = this.pos, hw = this.hw;
    for (let s = 0; s < steps; s++) {
      if (dy) {
        p.y += dy;
        if (this.collides(w, p.x, p.y, p.z)) {
          if (dy < 0) { p.y = Math.floor(p.y) + 1; this.onGround = true; } else p.y = Math.floor(p.y + this.h) - this.h - 0.001;
          this.vel.y = 0; dy = 0;
        }
      }
      if (dx) {
        p.x += dx;
        if (this.collides(w, p.x, p.y, p.z)) {
          if ((this.onGround || this.vel.y <= 0.01) && !this.collides(w, p.x, p.y + 1.05, p.z)) { p.y += 1.05; this.stepSmooth += 1.05; }
          else { p.x = dx > 0 ? Math.floor(p.x + hw) - hw - 0.001 : Math.floor(p.x - hw) + 1 + hw + 0.001; this.vel.x = 0; dx = 0; }
        }
      }
      if (dz) {
        p.z += dz;
        if (this.collides(w, p.x, p.y, p.z)) {
          if ((this.onGround || this.vel.y <= 0.01) && !this.collides(w, p.x, p.y + 1.05, p.z)) { p.y += 1.05; this.stepSmooth += 1.05; }
          else { p.z = dz > 0 ? Math.floor(p.z + hw) - hw - 0.001 : Math.floor(p.z - hw) + 1 + hw + 0.001; this.vel.z = 0; dz = 0; }
        }
      }
    }
    if (!this.onGround && this.vel.y <= 0 && this.collides(w, p.x, p.y - 0.05, p.z)) this.onGround = true;
  },
  update(dt, w, inp) {
    const p = this.pos;
    // Squeezed by debris that settled on us: climb out.
    for (let k = 0; k < 8 && this.collides(w, p.x, p.y, p.z); k++) p.y += 1;
    const wantCrouch = inp.key('ControlLeft') || inp.key('KeyC');
    if (wantCrouch) this.h = 4.6; else if (this.h < 7 && !this.collides(w, p.x, p.y, p.z, 7)) this.h = 7;
    this.crouch = this.h < 7;

    const f = (inp.key('KeyW') ? 1 : 0) - (inp.key('KeyS') ? 1 : 0), r = (inp.key('KeyD') ? 1 : 0) - (inp.key('KeyA') ? 1 : 0);
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let wx = -sy * f + cy * r, wz = -cy * f - sy * r;
    const wl = Math.hypot(wx, wz); if (wl > 0) { wx /= wl; wz /= wl; }
    this.swimming = p.y + 2 < WATER_Y;
    this.climbing = this.touches(w, M.LADDER) && f !== 0;
    let speed = this.crouch ? 8 : inp.key('ShiftLeft') ? 26 : 16;
    if (this.swimming) speed = 9;
    const acc = this.onGround ? 14 : 3.5;
    this.vel.x += (wx * speed - this.vel.x) * Math.min(1, acc * dt);
    this.vel.z += (wz * speed - this.vel.z) * Math.min(1, acc * dt);
    if (this.climbing) { this.vel.y = f > 0 ? 11 : -11; }
    else if (this.swimming) { this.vel.y += (inp.key('Space') ? 12 : -3 - this.vel.y) * dt * 3; }
    else {
      this.vel.y -= G * dt;
      if (inp.key('Space') && this.onGround) { this.vel.y = 18.5; this.onGround = false; }
    }
    if (this.vel.y < -80) this.vel.y = -80;
    const vy0 = this.vel.y;
    this.move(w, this.vel.x * dt, this.vel.y * dt, this.vel.z * dt);
    if (this.onGround && vy0 < -34) this.damage((-vy0 - 34) * 3.2, 'fall');
    p.x = Math.max(1.5, Math.min(WORLD_X - 1.5, p.x)); p.z = Math.max(1.5, Math.min(WORLD_Z - 1.5, p.z));
    if (p.y < -10) { p.y = GY + 20; this.damage(25, 'fall'); }
    this.stepSmooth = Math.max(0, this.stepSmooth - dt * 10);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hs > 1) this.bob += dt * hs * 0.55; else this.bob *= 0.9;
    if (this.hurtT > 0) this.hurtT -= dt;
  },
  eye(out) {
    return out.set(this.pos.x, this.pos.y + this.h - 0.55 - this.stepSmooth + Math.sin(this.bob * 2) * 0.12, this.pos.z);
  },
  dir(out) {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  },
  damage(n, why) {
    if (n <= 0 || this.health <= 0 || Game.state !== 'play') return;
    this.health -= n; this.hurtT = 0.4; SFX.hurt();
    if (this.health <= 0) { this.health = 0; Game.fail(why === 'fall' ? 'You fell too far.' : why === 'blast' ? 'Caught in your own blast.' : 'Crushed by falling debris.'); }
  }
};

// Wheel loader: drive it through walls. Breaks what its bucket is strong enough for, stops on the rest.
class Loader {
  constructor(scene, x, z, yaw) {
    this.pos = new THREE.Vector3(x, GY, z); this.yaw = yaw; this.speed = 0; this.vy = 0;
    this.L = 16; this.W = 10;
    const g = new THREE.Group();
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const add = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
    const yel = mat(0xe0a526), dark = mat(0x2a2a2c), steel = mat(0x6b7178), glass = new THREE.MeshLambertMaterial({ color: 0x9fc4d4, transparent: true, opacity: 0.5 });
    add(9, 3.5, 13, 0, 3.6, 1, yel);
    add(7, 5, 6, 0, 7.6, 1.5, glass); add(7.4, 0.6, 6.4, 0, 10.4, 1.5, yel);
    add(9, 2.5, 4, 0, 6.6, 5.5, yel);
    for (const [wx, wz] of [[-5, -4], [5, -4], [-5, 5], [5, 5]]) { const wh = add(1.6, 4.4, 4.4, wx, 2.2, wz, dark); wh.geometry = new THREE.CylinderGeometry(2.2, 2.2, 1.6, 14); wh.rotation.z = Math.PI / 2; }
    add(11, 4.5, 1, 0, 2.6, -8.2, steel); add(11, 1, 3, 0, 0.6, -7.2, steel);
    add(1, 1, 5, -3.5, 3.5, -5.5, dark); add(1, 1, 5, 3.5, 3.5, -5.5, dark);
    add(0.6, 3, 0.6, -3, 11.5, 4.5, dark);
    this.mesh = g; scene.add(g); this.scene = scene;
    this.sync();
  }
  sync() { this.mesh.position.copy(this.pos); this.mesh.rotation.y = this.yaw; }
  fwd() { return [-Math.sin(this.yaw), -Math.cos(this.yaw)]; }
  groundAt(w, x, z) {
    const fx = Math.floor(x), fz = Math.floor(z);
    for (let y = Math.floor(this.pos.y) + 3; y > Math.floor(this.pos.y) - 8; y--) if (SOLID[w.get(fx, y, fz)]) return y + 1;
    return Math.floor(this.pos.y) - 8;
  }
  update(dt, w, inp, driving) {
    const thr = driving ? (inp.key('KeyW') ? 1 : 0) - (inp.key('KeyS') ? 1 : 0) : 0;
    const steer = driving ? (inp.key('KeyA') ? 1 : 0) - (inp.key('KeyD') ? 1 : 0) : 0;
    if (thr) this.speed += thr * 16 * dt; else this.speed *= Math.max(0, 1 - 2.5 * dt);
    if (driving && inp.key('Space')) this.speed *= Math.max(0, 1 - 6 * dt);
    this.speed = Math.max(-9, Math.min(17, this.speed));
    this.yaw += steer * 0.9 * dt * Math.max(-1, Math.min(1, this.speed / 4));
    const [fx, fz] = this.fwd(), rx = -fz, rz = fx;

    // Bucket sweep: everything above the tyres in front of the machine.
    const dirn = Math.sign(this.speed);
    if (Math.abs(this.speed) > 0.2) {
      const reach = dirn > 0 ? this.L / 2 + 1 : -this.L / 2 - 0.5;
      const power = dirn > 0 ? (Math.abs(this.speed) > 10 ? 3 : 2) : -1;
      let blocked = false, removed = 0, bx0 = 1e9, by0 = 1e9, bz0 = 1e9, bx1 = -1, by1 = -1, bz1 = -1;
      const samples = [];
      for (let d = 0; d < 2; d++) for (let s = -5.5; s <= 5.5; s += 0.5) for (let hy = 2; hy < 11; hy++) {
        const x = Math.floor(this.pos.x + fx * (reach + dirn * d) + rx * s), z = Math.floor(this.pos.z + fz * (reach + dirn * d) + rz * s), y = Math.floor(this.pos.y) + hy;
        const m = w.get(x, y, z);
        if (!SOLID[m]) continue;
        if (HARD[m] <= power && !ANCHOR[m]) {
          const i = w.idx(x, y, z);
          if (samples.length < 100) samples.push(x, y, z, m, w.paint[i]);
          w.data[i] = 0; w.paint[i] = 0; removed++;
          if (x < bx0) bx0 = x; if (y < by0) by0 = y; if (z < bz0) bz0 = z; if (x > bx1) bx1 = x; if (y > by1) by1 = y; if (z > bz1) bz1 = z;
        } else if (d === 0) blocked = true;
      }
      if (removed) {
        w.markRegion(bx0, by0, bz0, bx1, by1, bz1); Game.queueCheck([bx0, by0, bz0, bx1, by1, bz1]);
        FX.burst(samples, this.pos.x + fx * reach, this.pos.y + 4, this.pos.z + fz * reach, 8);
        SFX.breakMat(samples[3], removed, this.pos);
        this.speed *= Math.max(0.6, 1 - removed * 0.004);
        FX.shake = Math.max(FX.shake, Math.min(0.6, removed / 200));
      }
      if (blocked) { if (Math.abs(this.speed) > 6) SFX.thump(this.pos, 0.8); this.speed = -this.speed * 0.2; }
    }
    this.pos.x += fx * this.speed * dt; this.pos.z += fz * this.speed * dt;
    this.pos.x = Math.max(8, Math.min(WORLD_X - 8, this.pos.x)); this.pos.z = Math.max(8, Math.min(WORLD_Z - 8, this.pos.z));
    // Ride on the highest wheel contact; fall if nothing is under it.
    let gy = -1e9;
    for (const [a, b] of [[-4, -5], [4, -5], [-4, 5], [4, 5], [0, 0]]) {
      const g2 = this.groundAt(w, this.pos.x + rx * a + fx * b, this.pos.z + rz * a + fz * b);
      if (g2 <= this.pos.y + 2.5) gy = Math.max(gy, g2);
    }
    if (this.pos.y > gy + 0.05) { this.vy -= G * dt; this.pos.y = Math.max(gy, this.pos.y + this.vy * dt); if (this.pos.y === gy) this.vy = 0; }
    else { this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 12); this.vy = 0; }
    // Shove loose debris out of the way.
    for (const b of Bodies.list) {
      const dx = b.pos.x - this.pos.x, dz = b.pos.z - this.pos.z;
      if (Math.hypot(dx, dz) < this.L * 0.6 + b.radius * 0.6 && b.pos.y < this.pos.y + 12 && Math.abs(this.speed) > 1) {
        b.v.x += fx * this.speed * 0.15; b.v.z += fz * this.speed * 0.15; b.v.y += 0.6; b.rest = 0;
      }
    }
    this.sync();
  }
  // Keep a walking player from standing inside the machine.
  pushOut(p) {
    const [fx, fz] = this.fwd();
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const lf = dx * fx + dz * fz, lr = dx * -fz + dz * fx;
    if (Math.abs(lf) < this.L / 2 + p.hw && Math.abs(lr) < this.W / 2 + p.hw && p.pos.y < this.pos.y + 10 && p.pos.y + p.h > this.pos.y) {
      const pf = this.L / 2 + p.hw - Math.abs(lf), pr = this.W / 2 + p.hw - Math.abs(lr);
      if (pf < pr) { p.pos.x += fx * Math.sign(lf) * pf; p.pos.z += fz * Math.sign(lf) * pf; }
      else { p.pos.x += -fz * Math.sign(lr) * pr; p.pos.z += fx * Math.sign(lr) * pr; }
    }
  }
  dispose() { this.scene.remove(this.mesh); }
}
