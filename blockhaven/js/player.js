// The player: movement physics, survival stats, hazards and damage.
(function () {
  'use strict';
  function Player(game) {
    this.game = game;
    this.pos = new THREE.Vector3(0, 80, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.w = 0.6; this.h = 1.8; this.eye = 1.62; this.step = 0.6;
    this.onGround = false;
    this.hp = 20; this.food = 20; this.sat = 5; this.exhaust = 0;
    this.air = 15; this.xp = 0; this.fire = 0; this.poison = 0; this.regen = 0;
    this.fall = 0; this.hurtT = 0; this.invuln = 0;
    this.flying = false; this.sprint = false; this.sneak = false;
    this.dead = false; this.spawn = null;
    this.regenT = 0; this.starveT = 0; this.hazardT = 0;
    this.portalT = 0; this.portalCd = 0;
    this.bob = 0; this.stepT = 0;
    this.kbVel = new THREE.Vector3();
  }
  // xp: level n needs 7 + 2n points (a simple curve)
  Player.prototype.level = function () { let l = 0, x = this.xp; while (x >= 7 + 2 * l) { x -= 7 + 2 * l; l++; } return l; };
  Player.prototype.levelProgress = function () { let l = 0, x = this.xp; while (x >= 7 + 2 * l) { x -= 7 + 2 * l; l++; } return x / (7 + 2 * l); };
  Player.prototype.lookDir = function () {
    return new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  };
  Player.prototype.eyePos = function () { return new THREE.Vector3(this.pos.x, this.pos.y + this.eye, this.pos.z); };
  Player.prototype.addExhaust = function (v) { if (this.game.mode === 'survival' && this.game.difficulty !== 'peaceful') this.exhaust += v; };

  Player.prototype.damage = function (amt, cause, kb, bypassArmor) {
    const g = this.game;
    if (this.dead || g.mode !== 'survival' || this.invuln > 0) return false;
    const diff = { peaceful: 0.5, easy: 0.6, normal: 1, hard: 1.5 }[g.difficulty] || 1;
    if (cause !== 'fall' && cause !== 'void' && cause !== 'starve' && cause !== 'drown' && cause !== 'fire' && cause !== 'poison' && cause !== 'cactus' && cause !== 'suffocate' && cause !== 'lava') amt *= diff;
    if (!bypassArmor && cause !== 'fall' && cause !== 'drown' && cause !== 'starve' && cause !== 'void' && cause !== 'poison' && cause !== 'suffocate') {
      const ap = g.inv.armorPoints();
      amt *= 1 - Math.min(20, ap) * 0.04;
      g.inv.damageArmor(Math.max(1, Math.floor(amt / 4)));
    }
    if (amt <= 0) return false;
    this.hp -= amt;
    this.hurtT = 0.4; this.invuln = 0.5;
    this.addExhaust(0.1);
    if (kb) { this.vel.x += kb.x; this.vel.z += kb.z; this.vel.y = Math.max(this.vel.y, kb.y || 0); }
    g.audio.play('hurt');
    if (this.hp <= 0) { this.hp = 0; g.die(cause); }
    g.ui.refresh();
    return true;
  };
  Player.prototype.heal = function (v) { this.hp = Math.min(20, this.hp + v); this.game.ui.refresh(); };

  Player.prototype.update = function (dt, input) {
    const g = this.game, w = g.world, creative = g.mode === 'creative';
    if (this.dead) return;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.portalCd = Math.max(0, this.portalCd - dt);
    const ID = BH.ID;
    const feetBlock = w.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.1), Math.floor(this.pos.z));
    const inWater = BH.inBlock(w, this, id => id === ID.water);
    const inLava = BH.inBlock(w, this, id => id === ID.lava);
    const headId = w.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + this.eye), Math.floor(this.pos.z));
    const headWater = headId === ID.water;
    const onLadder = BH.inBlock(w, this, id => id && BH.BLOCKS[id].climb);
    const belowId = w.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.2), Math.floor(this.pos.z));
    const below = BH.BLOCKS[belowId];
    // sneak changes height
    this.sneak = input.sneak && !this.flying;
    const targetEye = this.sneak ? 1.27 : 1.62;
    this.eye += (targetEye - this.eye) * Math.min(1, dt * 14);
    this.h = this.sneak ? 1.5 : 1.8;
    // sprint
    if (input.sprint && input.f > 0 && !this.sneak && (creative || this.food > 6)) this.sprint = true;
    if (input.f <= 0 || this.sneak || (this.hitX || this.hitZ) && !this.flying) this.sprint = false;
    // movement intent in world space
    let fx = input.f, sx = input.s;
    const len = Math.hypot(fx, sx); if (len > 1) { fx /= len; sx /= len; }
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const mx = -sin * fx + cos * sx, mz = -cos * fx - sin * sx;
    let speed = this.flying ? (this.sprint ? 21 : 10.9) : this.sneak ? 1.3 : this.sprint ? 5.6 : 4.3;
    if (inWater && !this.flying) speed *= 0.5;
    if (inLava && !this.flying) speed *= 0.35;
    if (below && below.slow && this.onGround) speed *= 0.45;
    const slippery = below && below.slippery && this.onGround;
    const accel = this.flying ? 10 : this.onGround ? (slippery ? 1.5 : 14) : 2.6;
    this.vel.x += (mx * speed - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (mz * speed - this.vel.z) * Math.min(1, accel * dt);
    const cloak = g.inv.armor[1] && BH.ITEMS[g.inv.armor[1].id].slowfall;
    if (this.flying) {
      let vy = 0; if (input.jump) vy += 8; if (input.sneakRaw) vy -= 8;
      this.vel.y += (vy - this.vel.y) * Math.min(1, dt * 10);
    } else if (inWater || inLava) {
      this.vel.y -= (inLava ? 6 : 9) * dt;
      this.vel.y *= Math.pow(0.2, dt);
      if (input.jump) this.vel.y = Math.min(this.vel.y + 28 * dt, inLava ? 2 : 3.6);
      if (input.sneakRaw) this.vel.y -= 10 * dt;
      this.fall = 0;
    } else if (onLadder) {
      this.vel.y -= 32 * dt;
      if (this.vel.y < -2.4) this.vel.y = -2.4;
      if (input.jump || ((this.hitX || this.hitZ) && input.f > 0)) this.vel.y = 3;
      else if (this.sneak) this.vel.y = 0;
      this.fall = 0;
    } else {
      this.vel.y -= 32 * dt;
      if (cloak && this.vel.y < -3) this.vel.y = -3;
      if (this.vel.y < -78) this.vel.y = -78;
      if (input.jump && this.onGround && this.jumpCd <= 0) {
        this.vel.y = 9.0; this.jumpCd = 0.25;
        if (this.sprint) { this.vel.x += mx * 2.2; this.vel.z += mz * 2.2; }
        this.addExhaust(this.sprint ? 0.2 : 0.05);
      }
    }
    this.jumpCd = (this.jumpCd || 0) - dt;
    if (creative && input.flyToggle) { this.flying = !this.flying; this.vel.y = 0; }
    if (!creative) this.flying = false;
    const vyBefore = this.vel.y;
    const oy = this.pos.y;
    BH.moveEntity(w, this, this.vel.x * dt, this.vel.y * dt, this.vel.z * dt);
    if (this.flying && this.onGround) this.flying = false;
    // fall damage
    if (!this.onGround && this.vel.y < 0 && !inWater && !onLadder && !this.flying) this.fall += oy - this.pos.y;
    if (this.onGround || inWater || this.flying) {
      if (this.onGround && this.fall > 3.4 && !inWater && !cloak) {
        const dmg = Math.floor(this.fall - 3);
        if (belowId !== ID.hay_bale) this.damage(dmg, 'fall');
        else this.damage(Math.floor(dmg * 0.2), 'fall');
      }
      if (this.onGround && this.fall > 1.2) g.audio.play('step', below ? below.sound : 'stone', 1.5);
      this.fall = 0;
    }
    // horizontal movement exhaustion and footsteps
    const moved = Math.hypot(this.vel.x, this.vel.z) * dt;
    if (this.onGround) {
      this.addExhaust(moved * (this.sprint ? 0.1 : 0.0));
      this.bob += moved * 2.2;
      this.stepT += moved;
      if (this.stepT > 1.8 && !this.sneak) { this.stepT = 0; g.audio.play('step', below ? below.sound : 'stone'); }
    }
    if (inWater) this.addExhaust(moved * 0.01);
    if (inWater && !this.wasInWater && vyBefore < -6) g.audio.play('splash');
    this.wasInWater = inWater;
    this.underwater = headWater;
    this.inLava = inLava;

    // ---- survival tick
    if (creative) { this.hp = 20; this.food = 20; this.air = 15; this.fire = 0; return; }
    // fire & lava
    if (inLava) { this.fire = 8; this.hazardT += dt; if (this.hazardT > 0.5) { this.hazardT = 0; this.damage(4, 'lava'); } }
    if (inWater) this.fire = 0;
    if (this.fire > 0) {
      const fireproof = g.inv.armor.every(s => s && BH.ITEMS[s.id].key.startsWith('duskiron'));
      this.fire -= dt;
      this.fireT = (this.fireT || 0) + dt;
      if (this.fireT > 1) { this.fireT = 0; if (!fireproof) this.damage(1, 'fire', null, true); }
    }
    if (this.poison > 0) {
      this.poison -= dt; this.poisonT = (this.poisonT || 0) + dt;
      if (this.poisonT > 1.25) { this.poisonT = 0; if (this.hp > 1) this.damage(1, 'poison', null, true); }
    }
    if (this.regen > 0) { this.regen -= dt; this.regenT2 = (this.regenT2 || 0) + dt; if (this.regenT2 > 1) { this.regenT2 = 0; this.heal(1); } }
    // contact hazards
    this.contactT = (this.contactT || 0) + dt;
    if (this.contactT > 0.5) {
      this.contactT = 0;
      const hw = this.w / 2 + 0.05;
      let cactus = false;
      for (const [dx, dz] of [[hw, 0], [-hw, 0], [0, hw], [0, -hw]]) if (w.getBlock(Math.floor(this.pos.x + dx), Math.floor(this.pos.y + 0.5), Math.floor(this.pos.z + dz)) === ID.cactus) cactus = true;
      if (w.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.1), Math.floor(this.pos.z)) === ID.cactus) cactus = true;
      if (cactus) this.damage(1, 'cactus');
      if (below && below.hot && this.onGround && !this.sneak) this.damage(1, 'fire');
      if (headId && BH.BLOCKS[headId].solid && !BH.BLOCKS[headId].transparent) this.damage(1, 'suffocate');
      if (this.pos.y < -24) this.damage(4, 'void', null, true);
    }
    // air
    if (headWater) {
      this.air -= dt;
      if (this.air <= 0) { this.air = 0; this.drownT = (this.drownT || 0) + dt; if (this.drownT > 1) { this.drownT = 0; this.damage(2, 'drown'); } }
    } else this.air = Math.min(15, this.air + dt * 5);
    // hunger
    if (this.exhaust >= 4) { this.exhaust -= 4; if (this.sat > 0) this.sat = Math.max(0, this.sat - 1); else this.food = Math.max(0, this.food - 1); }
    if (g.difficulty === 'peaceful') { this.food = Math.min(20, this.food + dt * 0.2); }
    this.regenT += dt;
    if (this.food >= 18 && this.hp < 20 && this.regenT > (this.food === 20 && this.sat > 0 ? 0.5 : 4)) { this.regenT = 0; this.heal(1); this.addExhaust(6); }
    if (this.food <= 0) { this.starveT += dt; if (this.starveT > 4) { this.starveT = 0; if (this.hp > (g.difficulty === 'hard' ? 0 : g.difficulty === 'normal' ? 1 : 10)) this.damage(1, 'starve'); } }
    this.uiT = (this.uiT || 0) + dt;
    if (this.uiT > 0.25) { this.uiT = 0; g.ui.refresh(); }
  };

  BH.Player = Player;
})();
