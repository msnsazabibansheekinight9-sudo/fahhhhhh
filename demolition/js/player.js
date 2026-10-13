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
    // Loose debris is solid too: sample the box against each nearby piece's own voxel grid.
    const hh = h || this.h;
    for (const b of Bodies.list) {
      if (b.dead || Math.abs(b.pos.x - px) > b.radius + 3 || Math.abs(b.pos.z - pz) > b.radius + 3 || Math.abs(b.pos.y - py - hh / 2) > b.radius + hh) continue;
      if (Game.grab === b) continue;
      const e = b.rot();
      for (let sy = 0; sy <= hh; sy += Math.max(1, hh / 4)) for (const ox of [-hw, 0, hw]) for (const oz of [-hw, 0, hw]) {
        const dx = px + ox - b.pos.x, dy = py + Math.min(sy, hh - 0.05) - b.pos.y, dz = pz + oz - b.pos.z;
        const lx = e[0] * dx + e[1] * dy + e[2] * dz, ly = e[4] * dx + e[5] * dy + e[6] * dz, lz = e[8] * dx + e[9] * dy + e[10] * dz;
        if (b.occ(Math.floor(lx + b.com.x), Math.floor(ly + b.com.y), Math.floor(lz + b.com.z)) >= 0) return true;
      }
    }
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

