'use strict';
// Enemies: types, AI, animation driving, damage, gibs, reanimation, bosses.
(function () {
  const E = G.enemies = { list: [] };
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  const FAC = {
    swarm: { blood: 0x8aa012, gibMats: () => [G.models.mats.chitin, G.models.mats.sflesh], spawn: 'burrow' },
    green: { blood: 0x6a0a06, gibMats: () => [G.models.mats.oskin, G.models.mats.rust], spawn: 'run' },
    machine: { blood: 0x36ff7a, gibMats: () => [G.models.mats.necro, G.models.mats.necroDark], spawn: 'phase', metal: true },
    chaos: { blood: 0x5a0606, gibMats: () => [G.models.mats.dskin, G.models.mats.robe, G.models.mats.cflesh], spawn: 'warp' },
  };
  E.FAC = FAC;

  const T = E.types = {
    ripper: { name: 'Ripper', fac: 'swarm', build: 'ripper', hp: 55, speed: 8.5, r: 0.45, melee: { dmg: 9, range: 1.9, rate: 0.7 }, leap: true, score: 10, voice: 'screech' },
    spitter: { name: 'Spitter', fac: 'swarm', build: 'spitter', hp: 80, speed: 5, r: 0.45, ranged: { kind: 'acid', dmg: 12, rate: 2.0, range: 32, speed: 24, burst: 1 }, keep: [12, 24], melee: { dmg: 7, range: 1.9, rate: 0.8 }, score: 15, voice: 'screech' },
    warrior: { name: 'Hive Warrior', fac: 'swarm', build: 'warrior', hp: 480, speed: 5.5, r: 0.8, scale: 1.15, melee: { dmg: 24, range: 3, rate: 1.3 }, ranged: { kind: 'acid', dmg: 13, rate: 2.2, range: 30, speed: 26, burst: 3 }, keep: [3, 14], score: 60, elite: true, voice: 'screech' },
    tyrant: { name: 'THE HIVE TYRANT', fac: 'swarm', build: 'tyrant', hp: 5200, speed: 5.5, r: 1.4, scale: 1.9, melee: { dmg: 40, range: 4.5, rate: 1.6 }, ranged: { kind: 'acid', dmg: 15, rate: 1.4, range: 45, speed: 28, burst: 5, fan: 0.25 }, keep: [6, 18], boss: { slam: true, summon: ['ripper', 'ripper', 'ripper', 'spitter'] }, score: 1000, voice: 'roar' },
    brute: { name: 'Greenskin Brute', fac: 'green', build: 'brute', hp: 150, speed: 6.2, r: 0.6, scale: 1.05, melee: { dmg: 20, range: 2.3, rate: 1.1 }, charge: true, score: 20, voice: 'grunt' },
    shoota: { name: 'Greenskin Shoota', fac: 'green', build: 'bruteR', hp: 130, speed: 5, r: 0.6, scale: 1.05, ranged: { kind: 'slug', dmg: 5, rate: 0.13, range: 40, burst: 7, pause: 2.2, spread: 0.07 }, keep: [10, 26], melee: { dmg: 14, range: 2.2, rate: 1.1 }, score: 20, voice: 'grunt' },
    warlord: { name: 'WARLORD GRUSKAR', fac: 'green', build: 'warlord', hp: 6000, speed: 5, r: 1.3, scale: 1.55, melee: { dmg: 45, range: 3.8, rate: 1.5 }, ranged: { kind: 'slug', dmg: 7, rate: 0.08, range: 45, burst: 16, pause: 2.5, spread: 0.06 }, keep: [5, 20], charge: true, boss: { slam: true, summon: ['brute', 'brute', 'shoota'] }, score: 1000, voice: 'roar' },
    husk: { name: 'Undying Husk', fac: 'machine', build: 'husk', hp: 170, armor: 0.3, speed: 3.2, r: 0.5, scale: 1.1, ranged: { kind: 'gauss', dmg: 16, rate: 2.6, range: 45, charge: 0.6 }, keep: [14, 30], melee: { dmg: 14, range: 2, rate: 1.2 }, reanimate: 0.55, score: 25, voice: 'hum' },
    stalker: { name: 'Flayed Stalker', fac: 'machine', build: 'husk', hp: 120, armor: 0.2, speed: 8, r: 0.5, scale: 1.0, melee: { dmg: 16, range: 2, rate: 0.8 }, leap: true, reanimate: 0.4, score: 20, voice: 'hum', tint: 0x5a1a10 },
    overlord: { name: 'THE OVERLORD UNBOUND', fac: 'machine', build: 'overlord', hp: 5000, armor: 0.25, speed: 3.5, r: 1.0, scale: 1.7, ranged: { kind: 'gauss', dmg: 22, rate: 1.2, range: 60, charge: 0.5, volley: 3 }, keep: [12, 30], melee: { dmg: 35, range: 3.5, rate: 1.5 }, boss: { teleport: true, summon: ['husk', 'husk', 'stalker'], raise: true, hover: 0.6 }, score: 1000, voice: 'hum' },
    cultist: { name: 'Traitor Cultist', fac: 'chaos', build: 'cultist', hp: 45, speed: 5, r: 0.4, ranged: { kind: 'las', dmg: 4, rate: 0.11, range: 40, burst: 5, pause: 1.6, spread: 0.08 }, keep: [10, 26], melee: { dmg: 6, range: 1.8, rate: 0.9 }, score: 8, voice: 'cultist' },
    fiend: { name: 'Bloodfiend', fac: 'chaos', build: 'bloodfiend', hp: 130, speed: 9.5, r: 0.5, scale: 1.1, melee: { dmg: 17, range: 2.4, rate: 0.75 }, leap: true, score: 25, voice: 'screech' },
    bloodlord: { name: 'KHARZUL THE BLOOD-CROWNED', fac: 'chaos', build: 'bloodlord', hp: 7000, speed: 6.5, r: 1.4, scale: 1.8, melee: { dmg: 50, range: 5, rate: 1.4 }, ranged: { kind: 'fire', dmg: 18, rate: 1.6, range: 45, speed: 22, burst: 4, fan: 0.3 }, keep: [3, 14], boss: { slam: true, summon: ['fiend', 'fiend', 'cultist', 'cultist'] }, score: 1500, voice: 'roar' },
  };

  function buildRig(t) {
    const B = G.models.build;
    const rig = t.build === 'bruteR' ? B.brute(true) : B[t.build]();
    if (t.tint) rig.root.traverse(o => { if (o.isMesh && o.material === G.models.mats.necro) o.material = G.mat('necroTint', { color: t.tint, rough: 0.3, metal: 0.9 }); });
    return rig;
  }

  class Enemy {
    constructor(type, pos) {
      const t = this.t = T[type];
      this.type = type;
      const diff = G.settings.difficulty;
      this.maxHp = this.hp = t.hp * (t.boss ? (0.7 + diff * 0.3) : (0.8 + diff * 0.2));
      this.rig = buildRig(t);
      this.scale = t.scale || 1;
      this.rig.root.scale.setScalar(this.scale);
      if (G.settings.quality === 'low') this.rig.root.traverse(o => { if (o.isMesh) o.castShadow = false; });
      this.pos = this.rig.root.position.copy(pos);
      this.rig.baseY = 0;
      this.vel = new THREE.Vector3();
      this.yaw = Math.atan2(-pos.x, -pos.z);
      this.atkCD = G.rand(0.5, 1.5); this.fireCD = G.rand(1, 2.5); this.burstLeft = 0;
      this.losT = 0; this.los = false; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = 0;
      this.avoid = 0; this.avoidT = 0; this.leapCD = G.rand(1, 3); this.air = false; this.vy = 0;
      this.state = 'spawn'; this.spawnT = 0; this.stun = 0; this.burn = 0; this.chargeT = 0; this.chargeCD = G.rand(3, 6);
      this.voiceT = G.rand(2, 8); this.bossT = { summon: 12, slam: 8, tele: 10 };
      this.hitBody = new THREE.Vector3(); this.hitHead = new THREE.Vector3();
      this.dead = false; this.gibbed = false; this.reanimated = false; this.gaussCharge = -1;
      this.rig.root.rotation.y = this.yaw;
      G.scene.add(this.rig.root);
      this.beginSpawn();
    }
    get isBoss() { return !!this.t.boss; }
    beginSpawn() {
      const f = FAC[this.t.fac].spawn;
      this.spawnKind = f;
      if (f === 'burrow') {
        this.rig.baseY = -2.4 * this.scale;
        G.fx.burst(G.fx.smoke, v1.copy(this.pos).setY(0.3), 18, { c0: 0x3a3020, sp: [2, 6], life: [0.6, 1.4], s0: [0.3, 0.6], s1: 1.4, a0: 0.8, grav: 8, drag: 1, up: 4 });
      } else if (f === 'phase') {
        this.rig.root.scale.setScalar(0.01);
        G.fx.burst(G.fx.add, v1.copy(this.pos).setY(1.2), 30, { c0: 0xbaffd0, c1: 0x30ff70, sp: [1, 5], life: [0.3, 0.8], s0: [0.1, 0.3], s1: 0.02, jit: 0.4 });
        G.fx.flash(v1, 0x30ff70, 8, 10, 0.6);
        G.audio.play('gaussCharge', this.pos, 0.7);
      } else if (f === 'warp') {
        this.rig.root.scale.setScalar(0.01);
        G.fx.burst(G.fx.add, v1.copy(this.pos).setY(1.2), 40, { c0: 0xffa0d0, c1: 0xff1040, sp: [2, 7], life: [0.3, 0.9], s0: [0.15, 0.4], s1: 0.02, jit: 0.6 });
        G.fx.flash(v1, 0xff2060, 10, 12, 0.7);
        G.audio.play('spawnWarp', this.pos, 0.7);
      }
      if (this.isBoss) { G.audio.play('roar', null, 1); G.shake += 0.6; }
    }
    updateHit() {
      const j = this.rig.j, s = this.scale;
      this.rig.root.updateMatrixWorld(true);
      j.torso.getWorldPosition(this.hitBody);
      this.hitBody.y += this.rig.s.torso * 0.45 * s;
      j.head.getWorldPosition(this.hitHead);
      this.hitHead.y += 0.08 * s;
      this.rBody = this.rig.hit.body * s; this.rHead = this.rig.hit.head * s;
    }
    update(dt) {
      const a = this.rig.anim, P = G.player;
      if (this.dead) {
        a.dead += dt;
        G.models.animate(this.rig, dt);
        if (this.reviveAt && a.dead > this.reviveAt) this.revive();
        if (a.dead > 7 && !this.reviveAt) this.remove();
        return;
      }
      if (this.state === 'spawn') {
        this.spawnT += dt;
        const k = Math.min(1, this.spawnT / (this.isBoss ? 1.6 : 0.9));
        if (this.spawnKind === 'burrow') this.rig.baseY = -2.4 * this.scale * (1 - G.smooth(k));
        else if (this.spawnKind === 'phase' || this.spawnKind === 'warp') this.rig.root.scale.setScalar(this.scale * Math.max(0.01, G.smooth(k)));
        this.pos.y = this.rig.baseY;
        a.move = 0;
        G.models.animate(this.rig, dt);
        this.updateHit();
        if (k >= 1) { this.state = 'fight'; this.rig.baseY = 0; this.pos.y = 0; }
        return;
      }
      if (this.burn > 0) {
        this.burn -= dt;
        this.damage(22 * dt, null, { fire: true, silent: true });
        if (Math.random() < 0.6) G.fx.burst(G.fx.add, this.hitBody, 1, { c0: 0xffd070, c1: 0xff3000, sp: [0.5, 2], life: [0.3, 0.6], s0: [0.3, 0.6], s1: 0.1, up: 2, jit: 0.3 });
        if (this.dead) return;
      }
      const t = this.t;
      const toP = v1.subVectors(P.pos, this.pos); toP.y = 0;
      const dist = toP.length();
      const dir = toP.divideScalar(dist || 1);
      this.losT -= dt;
      if (this.losT <= 0) {
        this.losT = 0.25 + Math.random() * 0.15;
        v2.copy(this.hitHead); v3.copy(P.pos); v3.y += 1.6;
        this.los = G.world.los(v2, v3);
      }
      this.atkCD -= dt; this.fireCD -= dt; this.leapCD -= dt; this.chargeCD -= dt; this.voiceT -= dt;
      if (this.voiceT <= 0) { this.voiceT = G.rand(4, 10); G.audio.play(t.voice, this.pos, 0.5); }
      if (this.stun > 0) this.stun -= dt;

      let speed = t.speed * (this.isBoss ? 1 : (0.9 + G.settings.difficulty * 0.1));
      let want = v2.set(0, 0, 0);
      let face = dir;
      const ranged = t.ranged;
      let aiming = false;
      this.navving = false;
      // stuck watchdog: no progress and no sight of the player -> relocate out of view
      this.stuckT = (this.stuckT || 0) + dt;
      if (this.stuckT > 5) {
        if (!this.isBoss && !this.los && this.lastPos && this.lastPos.distanceTo(this.pos) < 1.2) {
          const far = G.worlds.spawns.filter(s => s.distanceTo(P.pos) > 25);
          if (far.length) { this.pos.copy(G.pick(far)); this.vel.set(0, 0, 0); }
        }
        this.stuckT = 0; this.lastPos = (this.lastPos || new THREE.Vector3()).copy(this.pos);
      }

      // movement intent
      if (this.air) {
        // leaping: keep velocity
      } else if (this.stun > 0) {
        speed = 0;
      } else if (ranged && t.keep && !this.hunt && (dist > t.keep[0] || !t.melee)) {
        if (!this.los || dist > t.keep[1]) { if (!E.navDir(this.pos, want)) want.copy(dir); else this.navving = true; }
        else if (dist < t.keep[0]) want.copy(dir).multiplyScalar(-1);
        else {
          this.strafeT -= dt;
          if (this.strafeT <= 0) { this.strafeT = G.rand(1.2, 3); this.strafe *= -1; }
          want.set(-dir.z * this.strafe, 0, dir.x * this.strafe).multiplyScalar(0.6);
          speed *= 0.6;
        }
        aiming = this.los && dist < ranged.range;
      } else {
        if ((!this.los || dist > 6) && E.navDir(this.pos, want)) this.navving = true; else want.copy(dir);
        if (t.charge && dist < 16 && dist > 4 && this.chargeCD <= 0 && this.los) { this.chargeT = 1.4; this.chargeCD = G.rand(5, 8); G.audio.play(t.voice, this.pos, 1); }
        if (this.chargeT > 0) { this.chargeT -= dt; speed *= 1.7; }
        if (dist < (t.melee ? t.melee.range * 0.7 : 1)) want.set(0, 0, 0);
        if (ranged && this.los && dist < ranged.range) aiming = dist > 5;
      }
      // leap
      if (t.leap && !this.air && this.leapCD <= 0 && dist < 9 && dist > 3.5 && this.los && this.stun <= 0) {
        this.air = true; this.leapCD = G.rand(2.5, 4.5);
        this.vel.copy(dir).multiplyScalar(dist * 1.6 + 2); this.vy = 6.5;
        G.audio.play(t.voice, this.pos, 0.8);
        this.rig.anim.atk = 0; this.rig.anim.atkType = 0;
      }
      // boss abilities
      if (this.isBoss) this.bossLogic(dt, dist, dir);

      // obstacle avoidance (only when steering straight at the player)
      if (!this.air && !this.navving && want.lengthSq() > 0.01) {
        this.avoidT -= dt;
        if (this.avoidT <= 0) {
          this.avoidT = 0.3;
          v3.copy(this.pos); v3.y = 0.8;
          const look = 2.2 + this.t.r;
          if (G.world.ray(v3, want, look)) {
            let best = 0;
            for (const ang of [0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
              const c = Math.cos(ang), s = Math.sin(ang);
              const d = new THREE.Vector3(want.x * c - want.z * s, 0, want.x * s + want.z * c);
              if (!G.world.ray(v3, d, look)) { best = ang; break; }
            }
            this.avoid = best || (Math.random() < 0.5 ? 2.4 : -2.4);
            this.avoidT = 0.6;
          } else this.avoid = 0;
        }
        if (this.avoid) { const c = Math.cos(this.avoid), s = Math.sin(this.avoid); want.set(want.x * c - want.z * s, 0, want.x * s + want.z * c); }
      }
      // integrate
      const sc = G.enemyScale;
      if (this.air) {
        this.vy -= 20 * dt * sc;
        this.pos.addScaledVector(this.vel, dt * sc);
        this.pos.y += this.vy * dt * sc;
        if (this.pos.y <= 0 && this.vy < 0) {
          this.pos.y = 0; this.air = false; this.vel.multiplyScalar(0.2);
          if (dist < (t.melee.range + 1.2)) this.meleeHit(t.melee.dmg * 1.2);
          if (this.isBoss) this.slamFx();
        }
      } else {
        const tv = want.multiplyScalar(speed);
        this.vel.x = G.damp(this.vel.x, tv.x, 8, dt); this.vel.z = G.damp(this.vel.z, tv.z, 8, dt);
        this.pos.x += this.vel.x * dt * sc; this.pos.z += this.vel.z * dt * sc;
        const hover = t.boss && t.boss.hover ? t.boss.hover + Math.sin(a.idle * 1.5) * 0.15 : 0;
        this.pos.y = G.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.5) + hover;
      }
      G.world.collide(this.pos, t.r * this.scale, 2 * this.scale, 0.5);
      // separation
      for (const o of E.list) {
        if (o === this || o.dead) continue;
        const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
        const rr = (t.r * this.scale + o.t.r * o.scale) * 0.9;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), push = (rr - d) * 0.5; this.pos.x += dx / d * push; this.pos.z += dz / d * push; }
      }
      // keep off the player
      {
        const dx = this.pos.x - P.pos.x, dz = this.pos.z - P.pos.z, rr = t.r * this.scale + 0.5;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); this.pos.x += dx / d * (rr - d); this.pos.z += dz / d * (rr - d); }
      }
      const H = G.worlds.HALF - 1;
      this.pos.x = G.clamp(this.pos.x, -H, H); this.pos.z = G.clamp(this.pos.z, -H, H);
      // facing
      const hs = Math.hypot(this.vel.x, this.vel.z);
      let fyaw = Math.atan2(face.x, face.z);
      if (!aiming && hs > 1 && dist > 4 && !this.isBoss) fyaw = Math.atan2(this.vel.x, this.vel.z);
      let dy = fyaw - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, dt * (this.isBoss ? 4 : 8));
      this.rig.root.rotation.y = this.yaw;
      // animation state
      a.move = this.air ? 0.2 : hs / (t.speed * 0.8);
      const stride = (this.rig.s.thigh + this.rig.s.shin) * this.scale * 1.3;
      a.phase += dt * sc * hs / stride * Math.PI;
      a.aim = G.damp(a.aim, aiming || this.gaussCharge >= 0 ? 1 : 0, 8, dt);
      a.lean = this.chargeT > 0 ? 0.35 : 0;
      if (a.atk >= 0) { a.atk += dt * sc / (t.melee ? t.melee.rate * 0.8 : 0.6); if (a.atk >= 1) a.atk = -1; }
      // melee
      if (t.melee && !this.air && this.stun <= 0 && dist < t.melee.range && this.atkCD <= 0) {
        this.atkCD = t.melee.rate / sc; a.atk = 0; a.atkType = Math.random() < 0.5 ? 0 : 1; this.pendingHit = 0.45 * t.melee.rate * 0.8;
        G.audio.play('swing', this.pos, 0.6);
      }
      if (this.pendingHit != null) {
        this.pendingHit -= dt * sc;
        if (this.pendingHit <= 0) {
          this.pendingHit = null;
          if (dist < t.melee.range + 0.6) this.meleeHit(t.melee.dmg);
        }
      }
      // ranged
      if (ranged && this.stun <= 0) this.rangedLogic(dt, dist, aiming);
      G.models.animate(this.rig, dt * sc);
      this.updateHit();
    }
    meleeHit(dmg) {
      G.player.hurt(dmg * E.dmgMul(), this.pos, 'melee');
    }
    muzzlePos(out) {
      if (this.rig.muzzle) this.rig.muzzle.getWorldPosition(out); else out.copy(this.hitBody);
      return out;
    }
    rangedLogic(dt, dist, aiming) {
      const r = this.t.ranged, sc = G.enemyScale;
      if (r.kind === 'gauss') {
        if (this.gaussCharge >= 0) {
          this.gaussCharge += dt * sc;
          this.muzzlePos(v2);
          // telegraph: aim drifts toward the player while charging
          this.gaussAim.lerp(v3.copy(G.player.pos).setY(G.player.pos.y + 1.4), Math.min(1, dt * 2.5));
          G.fx.tracer(v2, v3.copy(v2).add(v1.subVectors(this.gaussAim, v2).normalize().multiplyScalar(40)), 0x30ff70, 0.006, 0.03);
          if (this.gaussCharge >= r.charge) {
            this.gaussCharge = -1;
            const n = r.volley || 1;
            for (let i = 0; i < n; i++) {
              const d = v1.subVectors(this.gaussAim, v2).normalize();
              if (i) { d.x += G.rand(-0.04, 0.04); d.y += G.rand(-0.02, 0.02); d.z += G.rand(-0.04, 0.04); d.normalize(); }
              G.shots.enemyHitscan(v2, d, r.dmg, 0x40ff80, 'gauss');
            }
            G.audio.play('gauss', this.pos, 0.9);
            G.fx.flash(v2, 0x40ff80, 5, 6, 0.2);
          }
          return;
        }
        if (aiming && this.fireCD <= 0) {
          this.fireCD = r.rate / (0.8 + G.settings.difficulty * 0.2);
          this.gaussCharge = 0; this.gaussAim = new THREE.Vector3().copy(G.player.pos).setY(G.player.pos.y + 1.4);
          G.audio.play('gaussCharge', this.pos, 0.6);
        }
        return;
      }
      if (this.burstLeft > 0) {
        this.burstT -= dt * sc;
        if (this.burstT <= 0) {
          this.burstT = r.kind === 'slug' || r.kind === 'las' ? r.rate : 0.12;
          this.burstLeft--;
          this.fireOne(dist);
        }
        return;
      }
      if (aiming && this.fireCD <= 0) {
        this.fireCD = (r.pause || r.rate) / (0.75 + G.settings.difficulty * 0.25);
        this.burstLeft = r.burst || 1; this.burstT = 0;
      }
    }
    fireOne(dist) {
      const r = this.t.ranged;
      const m = this.muzzlePos(v2);
      const tgt = v3.copy(G.player.pos); tgt.y += 1.3;
      // lead the target a little
      if (r.speed) tgt.addScaledVector(G.player.vel, dist / r.speed * 0.5);
      const d = v1.subVectors(tgt, m).normalize();
      const acc = r.spread || 0.02;
      const miss = acc * (1.6 - G.settings.difficulty * 0.3);
      if (r.kind === 'slug' || r.kind === 'las') {
        d.x += G.rand(-miss, miss); d.y += G.rand(-miss, miss) * 0.6; d.z += G.rand(-miss, miss); d.normalize();
        G.shots.enemyHitscan(m, d, r.dmg, r.kind === 'slug' ? 0xffc040 : 0xff4020, r.kind);
        G.audio.play(r.kind === 'slug' ? 'slug' : 'autogun', this.pos, 0.6);
        G.fx.muzzle(m, d, r.kind === 'slug' ? 0xffa030 : 0xff5020, 0.6);
      } else {
        const fan = r.fan || 0;
        const k = (r.burst || 1) - this.burstLeft - 1;
        if (fan) { const ang = (k / Math.max(1, (r.burst || 1) - 1) - 0.5) * fan * 2; const c = Math.cos(ang), s = Math.sin(ang); d.set(d.x * c - d.z * s, d.y, d.x * s + d.z * c); }
        d.y += 0.03;
        G.shots.spawnEnemy(r.kind, m, d.multiplyScalar(r.speed), r.dmg);
        G.audio.play(r.kind === 'fire' ? 'fireball' : 'acid', this.pos, 0.7);
      }
    }
    bossLogic(dt, dist, dir) {
      const b = this.t.boss, T2 = this.bossT, sc = G.enemyScale;
      T2.summon -= dt * sc; T2.slam -= dt * sc; T2.tele -= dt * sc;
      const enraged = this.hp < this.maxHp * 0.5;
      if (b.summon && T2.summon <= 0) {
        T2.summon = enraged ? 11 : 16;
        const n = enraged ? b.summon.length + 2 : b.summon.length;
        for (let i = 0; i < n; i++) {
          const ang = Math.random() * 6.28;
          const p = new THREE.Vector3(this.pos.x + Math.cos(ang) * 6, 0, this.pos.z + Math.sin(ang) * 6);
          const H = G.worlds.HALF - 4; p.x = G.clamp(p.x, -H, H); p.z = G.clamp(p.z, -H, H);
          E.spawn(b.summon[i % b.summon.length], p);
        }
        G.game.banner(this.t.name.split(' ').slice(-1)[0] + ' CALLS ITS KIN', 1.6);
      }
      if (b.raise) for (const o of E.list) if (o.dead && o.t.fac === 'machine' && !o.gibbed && !o.reviveAt && !o.isBoss && Math.random() < dt * 0.2) o.reviveAt = o.rig.anim.dead + 0.5;
      if (b.slam && T2.slam <= 0 && !this.air && dist < 22 && dist > 5) {
        T2.slam = enraged ? 6 : 9;
        this.air = true; this.vel.copy(dir).multiplyScalar(dist * 1.2); this.vy = 9;
        this.rig.anim.atk = 0; this.rig.anim.atkType = 0;
        G.audio.play('roar', this.pos, 1);
      }
      if (b.teleport && T2.tele <= 0) {
        T2.tele = enraged ? 7 : 11;
        G.fx.burst(G.fx.add, this.hitBody, 40, { c0: 0xbaffd0, c1: 0x30ff70, sp: [2, 8], life: [0.3, 0.8], s0: [0.1, 0.3], s1: 0.02, jit: 0.8 });
        const ang = Math.random() * 6.28, P = G.player.pos;
        const H = G.worlds.HALF - 6;
        this.pos.set(G.clamp(P.x + Math.cos(ang) * 16, -H, H), 0, G.clamp(P.z + Math.sin(ang) * 16, -H, H));
        this.state = 'spawn'; this.spawnT = 0; this.spawnKind = 'phase';
        G.audio.play('gaussCharge', this.pos, 1);
      }
    }
    slamFx() {
      G.fx.explosion(v1.copy(this.pos).setY(0.4), 2.2, this.t.fac === 'chaos' ? 0xff2a10 : this.t.fac === 'machine' ? 0x40ff80 : 0xc0a060, 0x2a2420);
      G.audio.play('explosion', this.pos, 1);
      const d = G.player.pos.distanceTo(this.pos);
      if (d < 7) G.player.hurt(25 * (1 - d / 7) + 10, this.pos, 'blast');
      if (this.t.fac === 'chaos') for (let i = 0; i < 12; i++) {
        const a = i / 12 * 6.28;
        G.shots.spawnEnemy('fire', v1.copy(this.pos).setY(0.6), v2.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(14), 12);
      }
    }
    damage(amount, dir, o) {
      if (this.dead || this.state === 'spawn' && this.spawnT < 0.3) return false;
      o = o || {};
      let dmg = amount;
      if (o.part === 'head') dmg *= this.isBoss ? 1.5 : 2.2;
      if (this.t.armor && !o.melta) dmg *= 1 - this.t.armor;
      if (G.player.furyT > 0) dmg *= 1.5;
      this.hp -= dmg;
      const a = this.rig.anim;
      if (dir && !o.silent) {
        const pt = o.point || this.hitBody;
        G.fx.blood(pt, dir, FAC[this.t.fac].blood, o.part === 'head' ? 14 : 8);
        if (FAC[this.t.fac].metal) G.fx.sparks(pt, v1.copy(dir).negate(), 0x60ff90, 6);
        a.flinchV += G.clamp(dmg / this.maxHp * (this.isBoss ? 6 : 20), 0.5, 4) * (o.part === 'head' ? 1.5 : 1);
        if (!this.isBoss && dmg > this.maxHp * 0.35) this.stun = 0.35;
        if (Math.random() < 0.3) G.fx.decal(this.pos, FAC[this.t.fac].blood, G.rand(0.6, 1.2), 0.8);
      }
      if (o.fire && !this.t.boss) this.burn = Math.max(this.burn, o.fire === true ? 0 : o.fire);
      if (this.hp <= 0) { this.die(dir, -this.hp, o); return true; }
      return false;
    }
    die(dir, overkill, o) {
      this.dead = true;
      this.hp = 0;
      const a = this.rig.anim;
      a.dead = 0; a.atk = -1; this.pendingHit = null; this.gaussCharge = -1; this.air = false;
      if (dir) {
        const fwd = v1.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        a.deathDir = fwd.dot(dir) < 0 ? 1 : -1;
      }
      const explode = !this.isBoss && ((o.explosive && overkill > 15) || overkill > this.maxHp * 0.9 || (o.melee && Math.random() < 0.35) || o.melta);
      if (explode) this.gib(dir || v1.set(0, 1, 0));
      if (this.isBoss) {
        for (let i = 0; i < 6; i++) setTimeout(() => { G.fx.explosion(v1.copy(this.hitBody).add(v2.set(G.rand(-1.5, 1.5), G.rand(-1, 1), G.rand(-1.5, 1.5))), 1.5, 0xff8030); G.audio.play('explosion', this.pos, 1); }, i * 250);
      }
      if (!this.gibbed && this.t.reanimate && !this.reanimated && Math.random() < this.t.reanimate) this.reviveAt = G.rand(3, 5);
      G.game.onKill(this, o);
    }
    gib(dir) {
      this.gibbed = true; this.reviveAt = null;
      const mats = FAC[this.t.fac].gibMats();
      const n = G.settings.quality === 'high' ? 10 : 6;
      for (let i = 0; i < n; i++) {
        const mat = mats[i % mats.length];
        G.fx.gib(v1.copy(this.hitBody).add(v2.set(G.rand(-0.4, 0.4), G.rand(-0.5, 0.5), G.rand(-0.4, 0.4))), mat, G.rand(0.12, 0.28) * this.scale,
          v3.copy(dir).multiplyScalar(G.rand(3, 8)).add(v2.set(G.rand(-4, 4), G.rand(3, 9), G.rand(-4, 4))));
      }
      G.fx.blood(this.hitBody, UP, FAC[this.t.fac].blood, 40);
      G.fx.decal(this.pos, FAC[this.t.fac].blood, 2.5, 0.85);
      G.audio.play('hit', this.pos, 1);
      this.remove();
    }
    revive() {
      this.dead = false; this.reviveAt = null; this.reanimated = true;
      this.hp = this.maxHp * 0.5;
      const a = this.rig.anim; a.dead = -1;
      this.rig.root.rotation.x = 0; this.rig.root.position.y = 0;
      this.state = 'spawn'; this.spawnT = 0.3; this.spawnKind = 'phase';
      G.fx.burst(G.fx.add, this.hitBody, 24, { c0: 0xbaffd0, c1: 0x30ff70, sp: [1, 4], life: [0.4, 0.9], s0: [0.1, 0.25], s1: 0.02, jit: 0.5, up: 2 });
      G.audio.play('hum', this.pos, 1);
      G.game.onRevive(this);
    }
    remove() {
      this.removed = true;
      this.rig.root.parent && this.rig.root.parent.remove(this.rig.root);
    }
  }
  E.Enemy = Enemy;

  /* ---------- flow-field navigation (BFS from the player over a 1 m grid) ---------- */
  const NAV = E.nav = { n: 0, H: 0, blocked: null, dist: null, queue: null, t: 0 };
  E.buildNav = function () {
    const H = G.worlds.HALF, n = Math.ceil(H * 2);
    NAV.n = n; NAV.H = H;
    NAV.blocked = new Uint8Array(n * n); NAV.dist = new Int32Array(n * n).fill(-1); NAV.queue = new Int32Array(n * n);
    for (const b of G.world.boxes) {
      if (b.y1 <= 0.55 || b.y0 >= 1.8) continue;
      const x0 = Math.max(0, Math.floor(b.x0 - 0.45 + H)), x1 = Math.min(n - 1, Math.floor(b.x1 + 0.45 + H));
      const z0 = Math.max(0, Math.floor(b.z0 - 0.45 + H)), z1 = Math.min(n - 1, Math.floor(b.z1 + 0.45 + H));
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) NAV.blocked[z * n + x] = 1;
    }
    NAV.t = 0;
  };
  const cellOf = (x, z) => { const n = NAV.n; const cx = G.clamp(Math.floor(x + NAV.H), 0, n - 1), cz = G.clamp(Math.floor(z + NAV.H), 0, n - 1); return cz * n + cx; };
  E.updateNav = function () {
    if (!NAV.blocked) return;
    const n = NAV.n, D = NAV.dist, B = NAV.blocked, Q = NAV.queue;
    D.fill(-1);
    let start = cellOf(G.player.pos.x, G.player.pos.z);
    let h = 0, t = 0;
    D[start] = 0; Q[t++] = start;
    while (h < t) {
      const c = Q[h++], cx = c % n, cz = (c / n) | 0, d = D[c] + 1;
      if (cx > 0 && D[c - 1] < 0 && !B[c - 1]) { D[c - 1] = d; Q[t++] = c - 1; }
      if (cx < n - 1 && D[c + 1] < 0 && !B[c + 1]) { D[c + 1] = d; Q[t++] = c + 1; }
      if (cz > 0 && D[c - n] < 0 && !B[c - n]) { D[c - n] = d; Q[t++] = c - n; }
      if (cz < n - 1 && D[c + n] < 0 && !B[c + n]) { D[c + n] = d; Q[t++] = c + n; }
    }
  };
  // direction toward the player along the field; false if no route
  E.navDir = function (pos, out) {
    if (!NAV.blocked) return false;
    const n = NAV.n, D = NAV.dist, B = NAV.blocked;
    const c = cellOf(pos.x, pos.z), cx = c % n, cz = (c / n) | 0;
    let best = -1, bd = D[c] >= 0 ? D[c] : 1e9;
    // look two cells out so paths come out smooth
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      if (!dx && !dz) continue;
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= n || z >= n) continue;
      const i = z * n + x;
      if (D[i] < 0 || B[i]) continue;
      // reject if the straight hop crosses a blocked cell
      if (Math.abs(dx) === 2 || Math.abs(dz) === 2) { const m = (cz + Math.round(dz / 2)) * n + cx + Math.round(dx / 2); if (B[m] || D[m] < 0) continue; }
      if (dx && dz && (B[cz * n + x] || B[z * n + cx])) continue;
      const score = D[i] + Math.hypot(dx, dz) * 0.01;
      if (score < bd) { bd = score; best = i; }
    }
    if (best < 0) return false;
    out.set((best % n) - NAV.H + 0.5 - pos.x, 0, ((best / n) | 0) - NAV.H + 0.5 - pos.z);
    const l = out.length(); if (l < 1e-4) return false;
    out.divideScalar(l);
    return true;
  };

  E.spawn = function (type, pos) {
    const e = new Enemy(type, pos);
    E.list.push(e);
    return e;
  };
  E.dmgMul = () => 0.45 + G.settings.difficulty * 0.3;
  E.clear = function () { E.list.forEach(e => e.remove()); E.list = []; };
  E.alive = function () { let n = 0; for (const e of E.list) if (!e.dead && !e.removed) n++; return n; };
  E.update = function (dt) {
    NAV.t -= dt;
    if (NAV.t <= 0) { NAV.t = 0.3; E.updateNav(); }
    for (const e of E.list) if (!e.removed) e.update(dt);
    E.list = E.list.filter(e => !e.removed);
  };

  // ray against enemy hit spheres: returns nearest {e, t, part, point}
  const oc = new THREE.Vector3();
  function raySphere(o, d, c, r) {
    oc.subVectors(o, c);
    const b = oc.dot(d), cc = oc.lengthSq() - r * r;
    const disc = b * b - cc;
    if (disc < 0) return -1;
    const s = Math.sqrt(disc);
    let t = -b - s; if (t < 0) t = -b + s;
    return t;
  }
  E.raycast = function (o, d, maxT, skip) {
    let best = null;
    for (const e of E.list) {
      if (e.dead || e.removed || (skip && skip.has(e))) continue;
      if (e.state === 'spawn' && e.spawnT < 0.3) continue;
      const th = raySphere(o, d, e.hitHead, e.rHead);
      if (th >= 0 && th < maxT && (!best || th < best.t)) best = { e, t: th, part: 'head' };
      const tb = raySphere(o, d, e.hitBody, e.rBody);
      if (tb >= 0 && tb < maxT && (!best || tb < best.t - 0.05)) best = { e, t: tb, part: 'body' };
      // legs: a sphere between hips and feet
      v3.copy(e.pos); v3.y += e.rig.legH * e.scale * 0.5;
      const tl = raySphere(o, d, v3, e.rBody * 0.8);
      if (tl >= 0 && tl < maxT && (!best || tl < best.t - 0.05)) best = { e, t: tl, part: 'legs' };
    }
    if (best) best.point = new THREE.Vector3().copy(o).addScaledVector(d, best.t);
    return best;
  };
  E.radius = function (center, r, dmg, o) {
    for (const e of E.list) {
      if (e.dead || e.removed) continue;
      const d = e.hitBody.distanceTo(center);
      if (d < r + e.rBody) {
        const k = 1 - Math.max(0, d - e.rBody) / r;
        e.damage(dmg * (0.35 + 0.65 * k), v1.subVectors(e.hitBody, center).normalize(), Object.assign({ explosive: true }, o));
      }
    }
  };
})();
