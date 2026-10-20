'use strict';
// ============================================================================
// Bots — the opponents. RIVALS is PvP, so these stand in for human rivals:
// they slide-jump, strafe while shooting, peek cover, reload in safety, chase
// a wounded target and panic-swap to melee when a fight gets close.
//
// Difficulty changes reaction time, aim error, crit rate and how much movement
// tech they use — not their health, so a fight is always winnable.
// ============================================================================

R.DIFFICULTY = {
  rookie: { label: 'Rookie', react: 0.42, err: 0.055, aimK: 5, crit: 0.04, tech: 0.15, aggro: 0.5, burst: [0.18, 0.5] },
  casual: { label: 'Casual', react: 0.3, err: 0.032, aimK: 7.5, crit: 0.1, tech: 0.4, aggro: 0.7, burst: [0.3, 0.8] },
  ranked: { label: 'Ranked', react: 0.2, err: 0.018, aimK: 11, crit: 0.2, tech: 0.7, aggro: 0.85, burst: [0.5, 1.3] },
  sweaty: { label: 'Sweaty', react: 0.13, err: 0.009, aimK: 15, crit: 0.32, tech: 0.95, aggro: 1, burst: [0.8, 2] },
};

// Bot names in the style of the lobby you actually get matched into.
R.BOT_NAMES = [
  'xX_Slayer_Xx', 'Kyzo', 'nova', 'Bl1tz', 'frostbyte', 'TacoGod', 'Zeph', 'm1lk',
  'SweatLord99', 'piko', 'Vex', 'Hana', 'quickscope', 'Dust', 'orbit', 'Jinx',
  'noobmaster', 'RIVALfan', 'Kaze', 'slideking', 'Echo', 'Pyre', 'Lumi', 'crit',
  'Vanta', 'zoomies', 'Rook', 'bonk', 'Sable', 'glhf', 'Tide', 'Nyx',
];

// Loadouts bots pick from, each a coherent playstyle.
R.BOT_LOADOUTS = [
  { primary: 'rifle', secondary: 'revolver', melee: 'fists' },
  { primary: 'rifle', secondary: 'smg', melee: 'knife' },
  { primary: 'burst', secondary: 'revolver', melee: 'knife' },
  { primary: 'shotgun', secondary: 'smg', melee: 'axe' },
  { primary: 'sniper', secondary: 'revolver', melee: 'fists' },
  { primary: 'bow', secondary: 'smg', melee: 'fists' },
  { primary: 'lmg', secondary: 'revolver', melee: 'knife' },
  { primary: 'energy', secondary: 'smg', melee: 'knife' },
  { primary: 'rpg', secondary: 'revolver', melee: 'axe' },
  { primary: 'gl', secondary: 'smg', melee: 'fists' },
];

R.Bot = class Bot extends R.Character {
  constructor(opts) {
    super(Object.assign({ isBot: true }, opts));
    this.diff = R.DIFFICULTY[opts.diff || 'casual'];
    this.target = null;
    this.seenT = -99;          // when the current target was first seen
    this.lostT = -99;          // when the target was last visible
    this.lastKnown = new THREE.Vector3();
    this.state = 'seek';
    this.think = 0;
    this.aimYaw = 0; this.aimPitch = 0;
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    this.strafeT = 0;
    this.burstT = 0; this.burstOn = false;
    this.avoid = 0; this.avoidDir = 1;
    this.wander = new THREE.Vector3();
    this.wanderT = 0;
    this.slideWant = 0;
    this.jumpWant = 0;
    this.stuckT = 0; this.lastPos = new THREE.Vector3();
    this.panic = 0;
  }

  /* ---------------------------- target choice ---------------------------- */
  pickTarget() {
    let best = null, bestScore = -Infinity;
    const eye = this.eye();
    for (const a of R.combat.actors) {
      if (a === this || a.dead) continue;
      if (R.modes.friendly(this, a)) continue;
      const d = a.pos.distanceTo(this.pos);
      if (d > 420) continue;
      const vis = R.losClear(eye, a.eye());
      // Prefer whoever is visible, close, and already hurt.
      let score = (vis ? 600 : 0) - d + (1 - a.health / a.maxHealth) * 220;
      if (a === this.target) score += 120;             // stickiness
      if (a === this.lastHitBy && R.t - this.lastHitT < 4) score += 260;
      if (score > bestScore) { bestScore = score; best = a; }
    }
    if (best !== this.target) { this.target = best; this.seenT = R.t; }
    return best;
  }

  /* ------------------------------ thinking ------------------------------ */
  updateBrain(dt) {
    this.think -= dt;
    if (this.think <= 0) { this.think = 0.12 + Math.random() * 0.1; this.pickTarget(); }

    const t = this.target;
    const eye = this.eye();
    const visible = t && !t.dead && R.losClear(eye, t.eye());
    if (visible) { this.lostT = R.t; this.lastKnown.copy(t.pos); }
    const sinceSeen = R.t - this.lostT;
    const lowHealth = this.health < 35;

    // Which weapon suits the range?
    const dist = t ? this.pos.distanceTo(t.pos) : 999;
    this.chooseWeapon(dist, visible);

    if (!t) this.state = 'seek';
    else if (visible && sinceSeen < 0.2) this.state = 'fight';
    else if (sinceSeen < 3.5) this.state = 'push';
    else this.state = 'seek';

    if (lowHealth && visible && dist < 40 && Math.random() < 0.02) this.state = 'evade';
    this.panic = R.damp(this.panic, lowHealth && visible ? 1 : 0, 3, dt);

    const w = this.wish;
    w.fire = false; w.reload = false; w.jump = false; w.slide = false;
    w.fwd = 0; w.side = 0;

    const wep = this.weapon;
    // Reload when it is safe, or when dry.
    if (wep && wep.canReload && (wep.ammo === 0 || (!visible && wep.ammo < wep.def.mag * 0.55))) w.reload = true;

    if (this.state === 'fight' && t) this.fight(t, dist, dt);
    else if (this.state === 'push' && t) this.moveToward(this.lastKnown, dt, 1);
    else if (this.state === 'evade' && t) this.evade(t, dt);
    else this.seek(dt);

    // Movement tech: the better the bot, the more it slide-jumps around.
    const tech = this.diff.tech;
    this.slideWant -= dt; this.jumpWant -= dt;
    if (this.slideWant <= 0) {
      this.slideWant = R.rand(0.7, 2.4) / Math.max(0.2, tech);
      if (Math.random() < tech && this.speed2D > MOVE.walk * 0.7 && this.grounded) {
        this._slideBurst = 0.35;
        this._slideThenJump = Math.random() < tech;
      }
    }
    if (this._slideBurst > 0) {
      this._slideBurst -= dt;
      w.slide = true;
      if (this._slideThenJump && this._slideBurst < 0.2) w.jump = true;
    }
    if (this.state === 'fight' && Math.random() < tech * dt * 2.2) w.jump = true;

    // Unstick: if a bot has not moved, pick a side-step.
    if (this.pos.distanceTo(this.lastPos) < 0.6) this.stuckT += dt; else this.stuckT = 0;
    this.lastPos.copy(this.pos);
    if (this.stuckT > 0.7) {
      this.avoid = 0.6;
      this.avoidDir = Math.random() > 0.5 ? 1 : -1;
      if (Math.random() < 0.5) w.jump = true;
      this.stuckT = 0;
    }
  }

  chooseWeapon(dist, visible) {
    if (R.modes.lockLoadout) return;             // Gun Game hands out weapons
    const want = (() => {
      const ids = this.slots.map(s => s.def.id);
      if (dist < 11 && ids.includes('knife')) return ids.indexOf('knife');
      if (dist < 9 && ids.includes('axe')) return ids.indexOf('axe');
      const prim = 0, sec = 1;
      const pd = this.slots[prim] && this.slots[prim].def;
      if (pd && pd.id === 'sniper' && dist < 26) return sec;
      if (pd && pd.id === 'shotgun' && dist > 55) return sec;
      if (this.slots[prim] && this.slots[prim].ammo === 0 && this.slots[sec] && this.slots[sec].ammo > 0) return sec;
      return prim;
    })();
    if (want != null && want !== this.slot && Math.random() < 0.25) this.selectSlot(want);
  }

  /* ------------------------------- fighting ------------------------------- */
  fight(t, dist, dt) {
    const w = this.wish;
    const d = this.def;
    const ideal = d.class === 'melee' ? 4 : d.id === 'shotgun' ? 16 : d.id === 'sniper' ? 90 : d.id === 'smg' ? 24 : 42;
    const err = dist - ideal;
    w.fwd = R.clamp(err / 20, -1, 1) * (this.panic > 0.5 ? -1 : 1) * this.diff.aggro;
    if (d.class === 'melee') w.fwd = 1;

    // Strafe, flipping direction now and then so they are hard to track.
    this.strafeT -= dt;
    if (this.strafeT <= 0) { this.strafeT = R.rand(0.4, 1.3); this.strafeDir *= -1; }
    w.side = this.strafeDir * (0.7 + this.diff.tech * 0.3);
    if (this.avoid > 0) { this.avoid -= dt; w.side = this.avoidDir; w.fwd = 0.6; }

    // Trigger discipline: fire in bursts with a reaction delay on first sight.
    const reacted = R.t - this.seenT > this.diff.react;
    this.burstT -= dt;
    if (this.burstT <= 0) {
      this.burstOn = !this.burstOn;
      const [lo, hi] = this.diff.burst;
      this.burstT = this.burstOn ? R.rand(lo, hi) : R.rand(0.1, 0.45);
    }
    const inRange = d.class === 'melee' ? dist < (d.range || 8) - 1 : true;
    const aimed = this.aimError() < (d.class === 'melee' ? 0.5 : d.pellets ? 0.12 : 0.045);
    if (reacted && this.burstOn && inRange && aimed && this.weapon.ammo !== 0) w.fire = true;
    if (d.scope && dist > 45) w.altFire = true; else w.altFire = false;
    // Charge the bow before loosing.
    if (d.charge) w.fire = reacted && dist < 160 ? (this._bowT = (this._bowT || 0) + dt) < d.charge * 1.15 : false;
    if (d.charge && !w.fire) this._bowT = 0;
  }

  evade(t, dt) {
    const w = this.wish;
    w.fwd = -1; w.side = this.strafeDir * 0.8;
    if (Math.random() < dt * 3) w.jump = true;
    if (this.weapon && this.weapon.canReload) w.reload = true;
  }

  seek(dt) {
    // Head for the middle of the map, or a wander point, looking for a fight.
    this.wanderT -= dt;
    if (this.wanderT <= 0 || this.wander.lengthSq() === 0) {
      this.wanderT = R.rand(1.6, 4);
      const b = R.world.bounds;
      const r = b ? Math.min(90, Math.max(30, (b.max.x - b.min.x) * 0.3)) : 50;
      const a = Math.random() * Math.PI * 2;
      this.wander.set(Math.cos(a) * r * Math.random(), this.pos.y, Math.sin(a) * r * Math.random());
    }
    this.moveToward(this.wander, dt, 1);
  }

  moveToward(point, dt, urgency) {
    const w = this.wish;
    const to = new THREE.Vector3().subVectors(point, this.pos);
    to.y = 0;
    const dist = to.length();
    if (dist < 4) { this.wanderT = 0; w.fwd = 0; return; }
    to.multiplyScalar(1 / dist);
    // Steer the body with the look direction; the aim code owns the yaw, so
    // here we convert the world direction into local wish axes.
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const fwd = -to.x * sin - to.z * cos;
    const side = -to.x * cos + to.z * sin;
    w.fwd = R.clamp(fwd * 1.6, -1, 1) * urgency;
    w.side = R.clamp(side * 1.6, -1, 1) * urgency;

    // Obstacle avoidance: probe ahead, sidestep what is in the way.
    const eye = this.eye();
    const ahead = R.raycastWorld(new THREE.Vector3(eye.x, this.pos.y + 2, eye.z), to, 10);
    if (ahead) {
      if (this.avoid <= 0) { this.avoid = R.rand(0.35, 0.8); this.avoidDir = Math.random() > 0.5 ? 1 : -1; }
      // Something low enough to hop onto?
      if (ahead.box.max.y - this.pos.y < 7 && ahead.box.max.y - this.pos.y > 0.5) w.jump = true;
    }
    if (this.avoid > 0) { this.avoid -= dt; w.side = this.avoidDir; }
    if (dist > 26 && this.grounded && Math.random() < this.diff.tech * dt * 1.5) { this._slideBurst = 0.4; this._slideThenJump = true; }
  }

  /* --------------------------------- aim --------------------------------- */
  aimError() {
    const t = this.target;
    if (!t) return 9;
    const want = this.aimAt(t);
    const dy = Math.atan2(Math.sin(want.yaw - this.yaw), Math.cos(want.yaw - this.yaw));
    return Math.hypot(dy, want.pitch - this.pitch);
  }

  aimAt(t) {
    const d = this.def;
    const eye = this.eye();
    // Aim for the head as often as the difficulty allows, body otherwise.
    const headShot = (this._critRoll == null ? (this._critRoll = Math.random()) : this._critRoll) < this.diff.crit;
    const aimY = t.pos.y + (t.sliding ? 1.4 : headShot ? 4.6 : 3.0);
    const to = new THREE.Vector3(t.pos.x, aimY, t.pos.z);
    // Lead the target for slow projectiles.
    if (d && d.projectile && d.speed) {
      const travel = eye.distanceTo(to) / d.speed;
      to.x += t.vel.x * travel; to.z += t.vel.z * travel;
      to.y += t.vel.y * travel * 0.5 + (d.projectile === 'arrow' || d.projectile === 'grenade' ? 30 * travel * travel : 0);
    }
    const dir = to.sub(eye);
    const horiz = Math.hypot(dir.x, dir.z);
    return { yaw: Math.atan2(-dir.x, -dir.z), pitch: Math.atan2(dir.y, horiz) };
  }

  updateAim(dt) {
    const t = this.target;
    if (!t || t.dead) {
      // Look where you are going.
      const v = this.vel;
      if (Math.hypot(v.x, v.z) > 3) {
        const want = Math.atan2(-v.x, -v.z);
        this.yaw = R.damp(this.yaw, this.yaw + Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw)), 4, dt);
      }
      this.pitch = R.damp(this.pitch, 0, 3, dt);
      this._critRoll = null;
      return;
    }
    const want = this.aimAt(t);
    // Wobble: a slow drift that keeps aim human, scaled by difficulty.
    const e = this.diff.err * (this.state === 'fight' ? 1 : 1.6) * (this.sliding ? 1.5 : 1);
    this._wob = (this._wob || 0) + dt;
    const wobY = Math.sin(this._wob * 2.3 + this.strafeDir) * e;
    const wobP = Math.cos(this._wob * 1.7) * e * 0.7;
    const k = this.diff.aimK * (R.t - this.seenT < this.diff.react ? 0.35 : 1);
    const dy = Math.atan2(Math.sin(want.yaw + wobY - this.yaw), Math.cos(want.yaw + wobY - this.yaw));
    this.yaw += dy * (1 - Math.exp(-k * dt));
    this.pitch = R.damp(this.pitch, R.clamp(want.pitch + wobP, -1.4, 1.4), k, dt);
    if (Math.random() < dt * 0.6) this._critRoll = Math.random();
  }

  update(dt) {
    if (this.dead) { this.deadT += dt; return; }
    this.updateBrain(dt);
    this.updateAim(dt);
    this.updatePhysics(dt);
    this.updateWeapons(dt);
    this.updateAvatar(dt);
  }
};
