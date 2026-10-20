'use strict';
// ============================================================================
// Movement — the character controller, and the reason the game feels like it
// does. RIVALS is a movement shooter: the floor of skill is aim, the ceiling
// is slide-jumping, and everything here exists to make that chain work.
//
//   · slide        crouch while moving: a speed boost that decays
//   · slide jump   jump out of a slide and keep the boosted speed
//   · slide cancel jump in the first fraction of a slide for a forward hop
//   · double jump  granted by Fists and Bow only
//   · triple jump  swap Fists <-> Bow mid-air to refresh the air jump once
//   · rocket jump  explosive self-damage knockback (see weapons.js)
//   · air strafe   turn into the strafe key to gain speed in the air
//
// Physics constants are Roblox's: gravity 196.2 studs/s^2, jump 50 studs/s.
// ============================================================================

const MOVE = R.MOVE = {
  walk: 20,              // base ground speed in studs/s
  accel: 150,            // ground acceleration
  friction: 9.5,         // ground friction
  airAccel: 34,          // forward air acceleration
  airStrafe: 210,        // sideways air acceleration — the air-strafe budget
  airStrafeMax: 1.4,     // hard cap on strafe-gained speed, as a multiple of walk
  slideSpeed: 34,        // speed a slide starts at
  slideMin: 17,          // speed a slide decays to before it ends
  slideTime: 0.85,       // how long a slide can last
  slideCd: 0.3,          // cooldown between slides
  slideCancel: 0.18,     // jumping inside this window keeps full momentum
  slideSteer: 2.6,       // how much a slide can be steered
  stepUp: 2.2,           // Roblox auto-steps ledges this tall
  coyote: 0.1,           // grace period for a late jump
  jumpBuffer: 0.12,      // grace period for an early jump
  waterDrag: 0.55,       // speed multiplier in water
  // The body is a Roblox R6 character: 5.25 studs tall, 2 wide, 1 deep, with
  // the eyes at 4.6. The collision box is a touch shorter than the model so
  // the head does not catch on a doorway the character can walk through.
  eye: 4.6,              // eye height standing
  eyeSlide: 2.1,         // eye height sliding
  halfW: 0.95, halfD: 0.55, height: 5.1, heightSlide: 2.6,
};

/* ============================== Character ============================== */
// Shared by the player and every bot: physics, health, loadout, death.
// Subclasses only have to fill in `this.wish` each frame.

R.Character = class Character {
  constructor(opts) {
    opts = opts || {};
    this.name = opts.name || 'Player';
    this.team = opts.team || 'blue';
    this.isBot = !!opts.isBot;
    this.isLocal = !!opts.isLocal;
    this.skin = opts.skin || 'default';
    this.charm = opts.charm || 'none';

    this.pos = new THREE.Vector3(0, 10, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.grounded = false; this.groundTime = 0; this.airTime = 0;
    this.sliding = false; this.slideT = 0; this.slideCd = 0;
    this.airJumps = 0; this.airJumpUsed = 0; this.jumpHeld = false;
    this.lastJumpPress = -9; this.lastGround = -9;
    this.slowT = 0; this.slowAmt = 0;
    this.swapRefresh = false;                // armed when a double-jump weapon is swapped to in air

    this.maxHealth = 100;
    this.health = 100;
    this.dead = false;
    this.deadT = 0;
    this.kills = 0; this.deaths = 0; this.streak = 0; this.damageDealt = 0;
    this.roundKills = 0;
    this.lastHitBy = null; this.lastHitT = -99;

    this.wish = { fwd: 0, side: 0, jump: false, slide: false, fire: false, altFire: false, reload: false };
    this.swingT = 0;

    this.loadout = opts.loadout || { primary: 'rifle', secondary: 'revolver', melee: 'fists' };
    this.slots = [];
    this.slot = 0;
    this.prevSlot = 1;
    this.buildLoadout();
    this.scoped = false;

    R.combat.register(this);
  }

  buildLoadout() {
    const ids = [this.loadout.primary, this.loadout.secondary, this.loadout.melee].filter(Boolean);
    this.slots = ids.map(id => new R.Weapon(R.weaponById(id) || R.weaponById('rifle'), this));
    this.slot = Math.min(this.slot, this.slots.length - 1);
  }

  get weapon() { return this.slots[this.slot]; }
  get def() { return this.weapon ? this.weapon.def : null; }

  eye() {
    return new THREE.Vector3(this.pos.x, this.pos.y + (this.sliding ? MOVE.eyeSlide : MOVE.eye), this.pos.z);
  }
  aimDir() {
    const cp = Math.cos(this.pitch);
    return new THREE.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp).normalize();
  }
  get speed2D() { return Math.hypot(this.vel.x, this.vel.z); }

  /* --------------------------- loadout handling --------------------------- */
  selectSlot(i) {
    if (i === this.slot || i < 0 || i >= this.slots.length || this.dead) return;
    const prevDef = this.def;
    this.prevSlot = this.slot;
    this.slot = i;
    const d = this.def;
    this.scoped = false;
    if (this.weapon) this.weapon.chargeT = 0;
    // The triple jump: swapping between two double-jump weapons in the air
    // gives the air jump back, exactly once per airtime.
    if (!this.grounded && prevDef && d && prevDef.doubleJump && d.doubleJump && !this.swapRefresh) {
      this.swapRefresh = true;
      this.airJumpUsed = 0;
    }
    if (this.onSwap) this.onSwap(d);
  }
  cycleSlot(dir) {
    const n = this.slots.length;
    this.selectSlot(((this.slot + dir) % n + n) % n);
  }
  giveWeapon(id, slotName) {
    this.loadout[slotName || (R.weaponById(id).class)] = id;
    const keepSlot = this.slot;
    this.buildLoadout();
    this.slot = Math.min(keepSlot, this.slots.length - 1);
  }

  /* ------------------------------ combat ------------------------------ */
  takeDamage(amount, by, crit, dir, def) {
    if (this.dead || amount <= 0) return;
    this.health -= amount;
    this.lastHitBy = by && by !== this ? by : this.lastHitBy;
    this.lastHitT = R.t;
    if (by && by !== this) by.damageDealt += Math.min(amount, this.health + amount);
    if (this.isLocal) R.ui.onHurt(amount, by, crit);
    if (this.health <= 0) this.die(by, dir, crit, def);
  }
  applySlow(amount, time) { this.slowAmt = Math.max(this.slowAmt, amount); this.slowT = Math.max(this.slowT, time); }
  applyKnock(v) { this.vel.add(v); if (v.y > 6) { this.grounded = false; this.sliding = false; } }

  die(by, dir, crit, def) {
    if (this.dead) return;
    this.dead = true;
    this.deadT = 0;
    this.deaths++;
    this.streak = 0;
    this.scoped = false;
    this.sliding = false;
    const killer = by && by !== this ? by : null;
    if (killer) { killer.kills++; killer.roundKills++; killer.streak++; }
    R.modes.onKill(killer, this, { crit, def });
    if (this.avatar) R.explodeAvatar(this.avatar, dir || new THREE.Vector3(0, 1, 0), def && def.splash ? 1.6 : 1);
    if (this.onDie) this.onDie(killer, crit);
  }

  respawn(pos) {
    this.dead = false;
    this.deadT = 0;
    this.health = this.maxHealth;
    this.vel.set(0, 0, 0);
    this.sliding = false; this.slideT = 0; this.slideCd = 0;
    this.airJumpUsed = 0; this.swapRefresh = false;
    this.slowT = 0; this.slowAmt = 0;
    this.roundKills = this.roundKills || 0;
    this.pos.copy(pos || R.pickSpawn(this.team, R.combat.actors, this));
    for (const w of this.slots) w.refill();
    this.slot = 0;
    if (this.avatar) { R.scene.remove(this.avatar); this.avatar = null; }
    if (this.onRespawn) this.onRespawn();
  }

  /* ------------------------------ physics ------------------------------ */
  aabb(pos, sliding) {
    const h = sliding ? MOVE.heightSlide : MOVE.height;
    return {
      min: { x: pos.x - MOVE.halfW, y: pos.y, z: pos.z - MOVE.halfD },
      max: { x: pos.x + MOVE.halfW, y: pos.y + h, z: pos.z + MOVE.halfD },
    };
  }

  // Boxes overlapping a region. Two buffers, because the step-up probe runs
  // inside the loop that walks the first list.
  _solidsIn(box, buf) {
    const pad = 1;
    return R.world.query(
      { x: box.min.x - pad, y: box.min.y - pad, z: box.min.z - pad },
      { x: box.max.x + pad, y: box.max.y + pad, z: box.max.z + pad }, buf);
  }
  _firstOverlap(box, buf) {
    const list = this._solidsIn(box, buf);
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (box.max.x <= b.min.x || box.min.x >= b.max.x) continue;
      if (box.max.y <= b.min.y || box.min.y >= b.max.y) continue;
      if (box.max.z <= b.min.z || box.min.z >= b.max.z) continue;
      return b;
    }
    return null;
  }
  _overlaps(pos) {
    return !!this._firstOverlap(this.aabb(pos, this.sliding), this._qbB || (this._qbB = []));
  }

  // Resolve one axis of motion against the world. Called per substep, so the
  // move is always small enough that nothing tunnels through a wall.
  _moveAxis(axis, amount) {
    if (!amount) return false;
    this.pos[axis] += amount;
    const buf = this._qbA || (this._qbA = []);
    let hit = false;
    for (let iter = 0; iter < 4; iter++) {
      const h = this.sliding ? MOVE.heightSlide : MOVE.height;
      const b = this._firstOverlap(this.aabb(this.pos, this.sliding), buf);
      if (!b) break;
      hit = true;
      if (axis === 'y') {
        // A ceiling above or a floor below: either way vertical motion stops.
        if (amount > 0) this.pos.y = b.min.y - h - 0.001;
        else this.pos.y = b.max.y + 0.001;
        this.vel.y = 0;
        break;
      }
      // Walking into something: step over a low ledge, otherwise stop dead.
      const rise = b.max.y - this.pos.y;
      if (rise > 0.01 && rise <= MOVE.stepUp && this.vel.y <= 0.5) {
        const probe = this.pos.clone();
        probe.y = b.max.y + 0.02;
        if (!this._overlaps(probe)) { this.pos.y = probe.y; continue; }
      }
      this.pos[axis] -= amount;
      this.vel[axis] = 0;
      break;
    }
    return hit;
  }

  _groundCheck() {
    const probe = this.pos.clone();
    probe.y -= 0.12;
    const was = this.grounded;
    this.grounded = this._overlaps(probe) && this.vel.y <= 0.6;
    if (this.grounded) {
      this.lastGround = R.t;
      this.airJumpUsed = 0;
      this.swapRefresh = false;
      this.groundTime += R.dt;
      this.airTime = 0;
      if (!was && this.onLand) this.onLand(this.vel.y);
    } else {
      this.groundTime = 0;
      this.airTime += R.dt;
    }
  }

  updatePhysics(dt) {
    const w = this.wish;
    const d = this.def;
    const inWater = R.inWater(this.pos);

    // Slow debuff from the Freeze Ray.
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowAmt = 0; }
    const slowMul = 1 - this.slowAmt;

    // Desired direction in world space from the look yaw.
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wishX = -w.side * cos - w.fwd * sin;
    const wishZ = w.side * sin - w.fwd * cos;
    const wishLen = Math.hypot(wishX, wishZ);
    const wdx = wishLen > 0.001 ? wishX / wishLen : 0;
    const wdz = wishLen > 0.001 ? wishZ / wishLen : 0;

    const weaponMul = d ? (d.move || 1) : 1;
    const baseSpeed = MOVE.walk * weaponMul * slowMul * (inWater ? MOVE.waterDrag : 1);

    /* ---- slide start / maintain / end ---- */
    this.slideCd = Math.max(0, this.slideCd - dt);
    if (!this.sliding && w.slide && this.grounded && this.slideCd <= 0 && this.speed2D > baseSpeed * 0.55 && !this.dead) {
      this.sliding = true;
      this.slideT = 0;
      const sp = Math.max(MOVE.slideSpeed * weaponMul, this.speed2D * 1.08);
      const len = this.speed2D;
      const dx = len > 0.1 ? this.vel.x / len : wdx, dz = len > 0.1 ? this.vel.z / len : wdz;
      this.vel.x = dx * sp; this.vel.z = dz * sp;
      R.audio.step(this.pos, true);
      if (this.onSlide) this.onSlide();
    }
    if (this.sliding) {
      this.slideT += dt;
      // Steering: nudge the slide direction without adding speed.
      if (wishLen > 0.01) {
        const sp = this.speed2D;
        const nx = this.vel.x + wdx * MOVE.slideSteer * dt * sp;
        const nz = this.vel.z + wdz * MOVE.slideSteer * dt * sp;
        const nl = Math.hypot(nx, nz) || 1;
        this.vel.x = nx / nl * sp; this.vel.z = nz / nl * sp;
      }
      // Decay towards the slide floor, then stand up.
      const sp = this.speed2D;
      const target = MOVE.slideMin * weaponMul;
      const next = Math.max(target, sp - 26 * dt);
      if (sp > 0.01) { this.vel.x *= next / sp; this.vel.z *= next / sp; }
      // A slide ends when the key comes up, when it times out, or when the
      // player has been off the ground too long to keep it going.
      if ((!w.slide && this.slideT > MOVE.slideCancel) || this.slideT > MOVE.slideTime || (!this.grounded && this.airTime > 0.25)) {
        this.sliding = false;
        this.slideCd = MOVE.slideCd;
      }
    }

    /* ---- acceleration ---- */
    if (this.grounded && !this.sliding) {
      // Ground: accelerate towards the wish direction, with friction.
      const sp = this.speed2D;
      if (wishLen > 0.001) {
        const tx = wdx * baseSpeed, tz = wdz * baseSpeed;
        this.vel.x = R.damp(this.vel.x, tx, MOVE.accel / Math.max(6, baseSpeed), dt);
        this.vel.z = R.damp(this.vel.z, tz, MOVE.accel / Math.max(6, baseSpeed), dt);
      } else {
        const k = Math.exp(-MOVE.friction * dt);
        this.vel.x *= k; this.vel.z *= k;
      }
      // A landing with speed above walk bleeds off rather than snapping.
      if (sp > baseSpeed * 1.05 && wishLen > 0.001) {
        const bleed = Math.max(baseSpeed, sp - 18 * dt);
        this.vel.x *= bleed / sp; this.vel.z *= bleed / sp;
      }
    } else if (!this.grounded) {
      // Air: a little forward accel, and a strafe budget that can gain speed.
      // Turning the mouse while holding a strafe key is how bhop chains hold
      // their velocity across jumps.
      const sp = this.speed2D;
      const cap = baseSpeed * MOVE.airStrafeMax;
      if (wishLen > 0.001) {
        const dot = (this.vel.x * wdx + this.vel.z * wdz) / (sp || 1);
        const sideways = 1 - Math.abs(dot);
        const accel = MOVE.airAccel + MOVE.airStrafe * sideways * Math.abs(w.side);
        let nx = this.vel.x + wdx * accel * dt;
        let nz = this.vel.z + wdz * accel * dt;
        const nl = Math.hypot(nx, nz);
        if (nl > cap && nl > sp) {
          // Allowed to keep direction but not exceed the cap.
          const s = Math.max(sp, cap) / nl;
          nx *= s; nz *= s;
        }
        this.vel.x = nx; this.vel.z = nz;
      }
    }

    /* ---- jumping ---- */
    if (w.jump && !this.jumpHeld) this.lastJumpPress = R.t;
    this.jumpHeld = w.jump;
    const buffered = R.t - this.lastJumpPress <= MOVE.jumpBuffer;
    const coyote = this.grounded || (R.t - this.lastGround <= MOVE.coyote && this.vel.y < 6);
    if (buffered && !this.dead) {
      if (coyote) {
        // Slide jump: leaving a slide early keeps the boosted speed, which is
        // the whole point of the technique.
        if (this.sliding) {
          const keep = this.slideT <= MOVE.slideCancel ? 1 : 0.94;
          const sp = this.speed2D * keep;
          const l = this.speed2D || 1;
          this.vel.x = this.vel.x / l * sp; this.vel.z = this.vel.z / l * sp;
          this.sliding = false;
          this.slideCd = MOVE.slideCd * 0.5;
        }
        this.vel.y = R.JUMP_POWER * (inWater ? 0.7 : 1);
        this.grounded = false;
        this.lastJumpPress = -9;
        this.lastGround = -9;
        R.audio.jump(this.pos);
        if (this.onJump) this.onJump(false);
      } else if (d && d.doubleJump && this.airJumpUsed < 1) {
        this.airJumpUsed++;
        this.vel.y = R.JUMP_POWER * 0.92;
        this.lastJumpPress = -9;
        R.audio.jump(this.pos);
        R.fx.burst({ x: this.pos.x, y: this.pos.y + 0.4, z: this.pos.z }, 10, '#cfe8ff', 26, 0.3, 0.3);
        if (this.onJump) this.onJump(true);
      }
    }

    /* ---- gravity and integration ---- */
    this.vel.y -= R.GRAVITY * dt * (inWater ? 0.35 : 1);
    if (inWater) { this.vel.y = Math.max(this.vel.y, -22); this.vel.x *= 0.985; this.vel.z *= 0.985; }
    this.vel.y = Math.max(this.vel.y, -260);

    // Substep so no single resolve moves further than about a stud: a rocket
    // jump or a long fall is fast enough to pass through a floor otherwise.
    const reach = Math.max(Math.abs(this.vel.x), Math.abs(this.vel.y), Math.abs(this.vel.z)) * dt;
    const steps = R.clamp(Math.ceil(reach / 1.2), 1, 10);
    const sdt = dt / steps;
    for (let i = 0; i < steps; i++) {
      this._moveAxis('x', this.vel.x * sdt);
      this._moveAxis('z', this.vel.z * sdt);
      this._moveAxis('y', this.vel.y * sdt);
    }
    this._groundCheck();

    // Out of bounds, or off the edge of Bridge and Dimension.
    if (this.pos.y < R.maps.killY && !this.dead) {
      this.health = 0;
      this.die(this.lastHitBy && R.t - this.lastHitT < 6 ? this.lastHitBy : null, new THREE.Vector3(0, 1, 0), false, { void: true });
    }

    // Footsteps.
    if (this.grounded && this.speed2D > 4) {
      this._stepAcc = (this._stepAcc || 0) + this.speed2D * dt;
      const gap = this.sliding ? 14 : 7.5;
      if (this._stepAcc > gap) { this._stepAcc = 0; R.audio.step(this.pos, this.sliding); }
    }
  }

  /* ------------------------------ weapons ------------------------------ */
  updateWeapons(dt) {
    const wep = this.weapon, d = this.def;
    if (!wep) return;
    for (const w of this.slots) w.update(dt);
    this.swingT = Math.max(0, this.swingT - dt * 5);

    if (this.dead) return;

    // Bow charge: hold to draw, release to fire.
    if (d && d.charge) {
      if (this.wish.fire) {
        wep.chargeT = Math.min(d.charge * 1.4, wep.chargeT + dt);
      } else if (wep.chargeT > 0.05) {
        if (wep.cool <= 0) { wep.tryFire(); this.swingT = 1; }
        wep.chargeT = 0;
      }
      if (this.wish.reload) wep.chargeT = 0;
      return;
    }

    if (this.wish.reload) wep.reload();
    if (this.wish.fire) {
      const auto = d && (d.rpm >= 300 || d.burst) && d.class !== 'melee';
      if (auto || !this._firedThisPress) {
        if (wep.tryFire()) { this._firedThisPress = true; this.swingT = 1; }
      }
    } else {
      this._firedThisPress = false;
    }
    // Scope, for the sniper only.
    if (d && d.scope) this.scoped = !!this.wish.altFire;
    else this.scoped = false;
  }

  /* ------------------------------- avatar ------------------------------- */
  ensureAvatar() {
    if (this.dead) return;
    if (!this.avatar) {
      this.avatar = R.buildAvatar({
        team: this.team, skin: this.skin, charm: this.charm,
        tag: this.isLocal ? null : this.name, face: this.isBot ? R.pick(['smile', 'flat', 'angry']) : 'smile',
      });
      R.scene.add(this.avatar);
      this.heldId = null;
    }
    // Swap the held prop when the weapon changes.
    const id = this.def ? this.def.id : null;
    if (id !== this.heldId) {
      const parts = this.avatar.userData.parts;
      if (this.held) { parts.armR.remove(this.held); this.held = null; }
      if (id && id !== 'fists') {
        // The model's barrel runs down +z; the arm hangs down -y, so a quarter
        // turn puts the muzzle where the hand is pointing.
        this.held = R.buildWorldWeapon(id);
        this.held.position.set(0, -1.75, 0);
        this.held.rotation.set(Math.PI / 2, 0, 0);
        parts.armR.add(this.held);
      }
      this.heldId = id;
    }
  }

  updateAvatar(dt) {
    if (this.dead || (this.isLocal && !R.thirdPerson)) {
      if (this.avatar && this.isLocal) { R.scene.remove(this.avatar); this.avatar = null; this.heldId = null; }
      if (this.dead && this.avatar) { R.scene.remove(this.avatar); this.avatar = null; this.heldId = null; }
      return;
    }
    this.ensureAvatar();
    const a = this.avatar;
    a.position.copy(this.pos);
    a.rotation.y = this.yaw;
    const strafe = this.wish.side;
    R.animateAvatar(a, {
      speed: this.speed2D, grounded: this.grounded, sliding: this.sliding,
      pitch: this.pitch, strafe, holding: true, melee: this.def && this.def.class === 'melee',
      swingT: this.swingT, tagVisible: !this.isLocal,
    }, dt);
    const parts = a.userData.parts;
    if (parts.tag) R.setTagHealth(parts.tag, this.health / this.maxHealth);
  }

  update(dt) {
    if (this.dead) { this.deadT += dt; return; }
    this.updatePhysics(dt);
    this.updateWeapons(dt);
    this.updateAvatar(dt);
  }
};

/* ================================ Player ================================ */
// The local character: mouse look, keyboard input, camera, viewmodel.

R.Player = class Player extends R.Character {
  constructor(opts) {
    super(Object.assign({ isLocal: true, name: 'You' }, opts));
    this.vm = null;
    this.vmId = null;
    this.fovTarget = R.settings.fov;
    this.fovCur = R.settings.fov;
    this.recoilPitch = 0; this.recoilYaw = 0;
    this.lookDx = 0; this.lookDy = 0;
    this.hurtFlash = 0;
    this.landDip = 0;
    this.pendingFov = 0;
  }

  readInput() {
    const I = R.input, w = this.wish;
    const k = I.keys;
    w.fwd = (k.w ? 1 : 0) - (k.s ? 1 : 0);
    w.side = (k.d ? 1 : 0) - (k.a ? 1 : 0);
    w.jump = !!k.Space;
    w.slide = !!(k.ShiftLeft || k.ShiftRight || k.c || k.ControlLeft);
    w.fire = !!I.mouse[0];
    w.altFire = !!I.mouse[2];
    w.reload = !!I.down.r;

    // Slot keys, Q for last weapon, wheel to cycle.
    if (I.down['1']) this.selectSlot(0);
    if (I.down['2']) this.selectSlot(1);
    if (I.down['3']) this.selectSlot(2);
    if (I.down.q) this.selectSlot(this.prevSlot);
    if (I.wheel) this.cycleSlot(I.wheel > 0 ? 1 : -1);

    // Mouse look. Sensitivity is scaled to feel close to Roblox's slider.
    const sens = R.settings.sens * 0.0022;
    const zoom = this.scoped && this.def && this.def.scope ? 1 / Math.sqrt(this.def.scope) : 1;
    this.yaw -= I.dx * sens * zoom;
    this.pitch -= I.dy * sens * zoom;
    this.pitch = R.clamp(this.pitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
    this.lookDx = I.dx; this.lookDy = I.dy;
  }

  onShot(wep) {
    const d = wep.def;
    // Recoil kicks the camera up, then recovers.
    if (d.recoil) {
      this.recoilPitch += d.recoil * 0.012 * (this.scoped ? 0.5 : 1);
      this.recoilYaw += (Math.random() * 2 - 1) * d.recoil * 0.004;
    }
    if (this.vm) R.vmFire(this.vm, d);
  }
  onSwap() { if (this.vm) this.vm.userData.equipT = 0; }
  onLand(vy) {
    if (vy < -40) { this.landDip = R.clamp(-vy / 320, 0, 0.5); R.addShake(R.clamp(-vy / 700, 0, 0.3)); }
  }

  ensureViewmodel() {
    const id = this.def ? this.def.id : 'rifle';
    if (id === this.vmId && this.vm) return;
    if (this.vm) R.vmScene.remove(this.vm);
    this.vm = R.buildViewmodel(id, { team: this.team, skin: this.skin });
    R.vmScene.add(this.vm);
    this.vmId = id;
  }

  update(dt) {
    if (!this.dead) this.readInput();
    else { const w = this.wish; w.fwd = w.side = 0; w.jump = w.slide = w.fire = w.altFire = w.reload = false; }

    if (!this.dead) {
      this.updatePhysics(dt);
      this.updateWeapons(dt);
    } else this.deadT += dt;
    this.updateAvatar(dt);

    // Recoil recovery.
    this.recoilPitch = R.damp(this.recoilPitch, 0, 7, dt);
    this.recoilYaw = R.damp(this.recoilYaw, 0, 7, dt);
    this.landDip = R.damp(this.landDip, 0, 9, dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.2);

    this.ensureViewmodel();
    const d = this.def;
    const wep = this.weapon;
    R.animateViewmodel(this.vm, {
      speed: this.speed2D, grounded: this.grounded, sliding: this.sliding, velY: this.vel.y,
      lookDx: this.lookDx, lookDy: this.lookDy, strafe: this.wish.side,
      reloadFrac: wep && wep.reloading > 0 ? 1 - wep.reloading / d.reload : 0,
      scoped: this.scoped, chargeFrac: d && d.charge && wep ? R.clamp(wep.chargeT / d.charge, 0, 1) : 0,
    }, dt);

    this.updateCamera(dt);
  }

  updateCamera(dt) {
    const cam = R.camera;
    const eye = this.eye();
    const shake = R.shakeOffset();

    if (this.dead) {
      // Death camera: pull back and look at where you fell.
      const back = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(14);
      const target = new THREE.Vector3(this.pos.x, this.pos.y + 8, this.pos.z).add(back);
      cam.position.lerp(target, 1 - Math.exp(-4 * dt));
      cam.lookAt(this.pos.x, this.pos.y + 3, this.pos.z);
      return;
    }

    cam.position.set(eye.x, eye.y - this.landDip * 2, eye.z);
    if (R.thirdPerson) {
      const dir = this.aimDir();
      const back = dir.clone().multiplyScalar(-16);
      const want = cam.position.clone().add(back).add(new THREE.Vector3(0, 2.5, 0));
      const hit = R.raycastWorld(cam.position, back.clone().normalize(), 16);
      if (hit) want.copy(cam.position).add(back.clone().normalize().multiplyScalar(Math.max(3, hit.dist - 1)));
      cam.position.copy(want);
    }
    cam.rotation.order = 'YXZ';
    cam.rotation.y = this.yaw + this.recoilYaw + shake.x * 0.02;
    cam.rotation.x = this.pitch + this.recoilPitch + shake.y * 0.02;
    // Roll: lean into a strafe, and harder into a slide.
    const roll = -this.wish.side * 0.025 - (this.sliding ? this.wish.side * 0.05 : 0);
    cam.rotation.z = R.damp(cam.rotation.z, roll + shake.r, 8, dt);

    // FOV: wider when fast, narrow when scoped.
    const d = this.def;
    const zoom = this.scoped && d && d.scope ? d.scope : 1;
    const speedFov = R.clamp((this.speed2D - MOVE.walk) / 26, 0, 1) * 6;
    this.fovTarget = R.settings.fov / zoom + (zoom === 1 ? speedFov : 0);
    this.fovCur = R.damp(this.fovCur, this.fovTarget, 12, dt);
    if (Math.abs(cam.fov - this.fovCur) > 0.01) { cam.fov = this.fovCur; cam.updateProjectionMatrix(); }

    R.vmCamera.position.set(0, 0, 0);
    R.vmCamera.rotation.set(0, 0, cam.rotation.z * 0.5);
  }
};
