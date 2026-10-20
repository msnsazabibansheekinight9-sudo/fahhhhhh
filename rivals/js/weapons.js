'use strict';
// ============================================================================
// Weapons — the RIVALS arsenal, its ballistics and its projectiles.
//
// Stats follow the public community wikis for the real game (key costs,
// damage, crit damage, fire-rate cooldowns, magazine and reserve ammo). Where
// the wikis disagree — and on the Assault Rifle, Shotgun and Sniper they do —
// the figure quoted by the most sources is used and the alternative is noted
// in the comment on that weapon. Damage falls off with distance in studs and
// a hit to the head is a CRIT, which is the game's whole skill expression.
// ============================================================================

// class: primary | secondary | melee   ·  cost is in keys, the game's currency
// dmg/critDmg are per bullet. rpm drives the cooldown between shots.
// falloff: [startStuds, endStuds, minDamage] — linear between start and end.
// move: walk-speed multiplier while held, the reason the Sniper feels heavy.
R.WEAPONS = [
  {
    id: 'fists', name: 'Fists', class: 'melee', cost: 0, owned: true,
    dmg: 20, critDmg: 25, rpm: 150, mag: Infinity, reserve: Infinity, reload: 0,
    range: 7, move: 1.12, doubleJump: true, sound: 'melee',
    desc: 'Free, fast, and the only loadout slot that grants a double jump. Bare-knuckle resets are a real strategy.',
  },
  {
    id: 'rifle', name: 'Assault Rifle', class: 'primary', cost: 0, owned: true,
    // Wikis list 13 damage; one guide lists 12 falling to 3 past 200 studs.
    dmg: 13, critDmg: 15, rpm: 545, mag: 30, reserve: 120, reload: 2.1,
    spread: 0.009, spreadGrow: 0.0042, spreadMax: 0.05, recoil: 0.55, move: 1,
    falloff: [60, 200, 3], sound: 'rifle', tracer: '#ffe9a8',
    desc: 'The default and still the measuring stick. No cost, no gimmick: hold an angle, control the climb, win the fight.',
  },
  {
    id: 'bow', name: 'Bow', class: 'primary', cost: 15,
    dmg: 35, critDmg: 100, rpm: 150, mag: 1, reserve: Infinity, reload: 0,
    charge: 0.42, projectile: 'arrow', speed: 310, move: 1.08, doubleJump: true, sound: 'bow',
    desc: 'Charge for full damage. Grants a double jump, which is why bow movement is its own subculture.',
  },
  {
    id: 'shotgun', name: 'Shotgun', class: 'primary', cost: 20,
    // 8x10 pellets on one wiki, 10x6 on another; 8 pellets at 10 is the median.
    dmg: 10, critDmg: 13, pellets: 8, rpm: 70, mag: 2, reserve: 24, reload: 1.9,
    spread: 0.055, recoil: 2.4, move: 1.02, falloff: [18, 60, 1.5], sound: 'shotgun',
    desc: 'Eighty damage inside a doorway, a rude noise outside one. Rewards hard corners and slide entries.',
  },
  {
    id: 'knife', name: 'Knife', class: 'melee', cost: 20,
    dmg: 40, critDmg: 55, rpm: 130, mag: Infinity, reserve: Infinity, reload: 0,
    range: 9, move: 1.14, sound: 'melee',
    desc: 'Longer reach and double the fist damage. Backstabs are not a mechanic — closing the gap is.',
  },
  {
    id: 'burst', name: 'Burst Rifle', class: 'primary', cost: 25,
    dmg: 20, critDmg: 24, rpm: 420, burst: 3, burstDelay: 0.3, mag: 21, reserve: 84, reload: 2.0,
    spread: 0.006, recoil: 0.7, move: 1, falloff: [70, 220, 5], sound: 'burst', tracer: '#cfe6ff',
    desc: 'Three-round bursts of 20. Two clean bursts is a kill, so it punishes anyone who peeks the same spot twice.',
  },
  {
    id: 'revolver', name: 'Revolver', class: 'secondary', cost: 25,
    dmg: 35, critDmg: 70, rpm: 170, mag: 6, reserve: 36, reload: 2.2,
    spread: 0.004, recoil: 1.5, move: 1.06, falloff: [80, 240, 12], sound: 'revolver', tracer: '#ffd9a0',
    desc: 'Six shots, thirty-five each, double on a crit. The secondary that wins fights the primary started.',
  },
  {
    id: 'rpg', name: 'RPG', class: 'primary', cost: 25,
    dmg: 50, critDmg: 50, rpm: 42, mag: 1, reserve: 8, reload: 2.6,
    projectile: 'rocket', speed: 170, splash: 16, selfDmg: 0.45, selfKnock: 1.5, move: 0.96, sound: 'rocket',
    desc: 'Fifty on a direct hit plus splash. Fire it at your own feet and the self-damage buys you a rocket jump.',
  },
  {
    id: 'smg', name: 'SMG', class: 'secondary', cost: 35,
    dmg: 11, critDmg: 13, rpm: 820, mag: 25, reserve: 100, reload: 1.7,
    spread: 0.014, spreadGrow: 0.006, spreadMax: 0.062, recoil: 0.42, move: 1.07,
    falloff: [40, 130, 2], sound: 'smg', tracer: '#ffe9a8',
    desc: 'Fastest fire rate in the game and the shortest useful range. Built for slide-jumping into a room.',
  },
  {
    id: 'lmg', name: 'LMG', class: 'primary', cost: 50,
    dmg: 14, critDmg: 17, rpm: 480, mag: 60, reserve: 180, reload: 4.0,
    spread: 0.012, spreadGrow: 0.003, spreadMax: 0.045, recoil: 0.6, move: 0.9,
    falloff: [70, 240, 4], sound: 'lmg', tracer: '#ffe0a0',
    desc: 'Sixty rounds and a four-second reload. Hold the long lane, never get caught empty.',
  },
  {
    id: 'axe', name: 'Battle Axe', class: 'melee', cost: 50,
    dmg: 50, critDmg: 70, rpm: 86, mag: Infinity, reserve: Infinity, reload: 0,
    range: 10, move: 1.08, lunge: 26, sound: 'melee',
    desc: 'Fifty a swing on a 0.70s cooldown with a lunge. Two swings, one body.',
  },
  {
    id: 'sniper', name: 'Sniper', class: 'primary', cost: 75,
    // 1.5s between shots, 5 in the mag and 10 in reserve, 50 body / 150 crit.
    dmg: 50, critDmg: 150, rpm: 40, mag: 5, reserve: 10, reload: 2.8,
    spread: 0.0004, recoil: 2.2, move: 0.84, scope: 4.2, falloff: null, sound: 'sniper', tracer: '#ffffff',
    desc: 'One crit is one kill, full stop. Fifty to the body means a miss is a trade you lose.',
  },
  {
    id: 'freeze', name: 'Freeze Ray', class: 'secondary', cost: 250,
    dmg: 8, critDmg: 10, rpm: 300, mag: 40, reserve: 120, reload: 2.4,
    projectile: 'freeze', speed: 220, slow: 0.45, slowTime: 1.6, move: 1.02, sound: 'freeze', tracer: '#8ff0ff',
    desc: 'Chips health and freezes the legs. It does not kill people, it hands them to your team.',
  },
  {
    id: 'gl', name: 'Grenade Launcher', class: 'primary', cost: 425,
    // 35 on the Nosniy wiki, 40-45 elsewhere; 40 sits in the middle.
    dmg: 40, critDmg: 40, rpm: 75, mag: 4, reserve: 16, reload: 3.0,
    projectile: 'grenade', speed: 130, fuse: 1.6, splash: 14, selfDmg: 0.4, selfKnock: 1.3, move: 0.98, sound: 'grenade',
    desc: 'Four bouncing bombs. Bank them round corners, or put one under your own feet and leave the floor.',
  },
  {
    id: 'energy', name: 'Energy Rifle', class: 'primary', cost: 425,
    dmg: 20, critDmg: 26, rpm: 260, mag: 24, reserve: 72, reload: 2.5,
    projectile: 'beam', speed: 420, bounces: 3, spread: 0.003, recoil: 0.3, move: 1.02,
    sound: 'energy', tracer: '#b388ff',
    desc: 'Beams that ricochet off walls. There is no such thing as full cover against it.',
  },
];

R.weaponById = id => R.WEAPONS.find(w => w.id === id);
R.WEAPON_IDS = R.WEAPONS.map(w => w.id);

// Gun Game walks this ladder, one weapon per kill, melee last.
R.GUNGAME_LADDER = ['rifle', 'smg', 'burst', 'shotgun', 'revolver', 'lmg', 'bow', 'energy', 'gl', 'rpg', 'sniper', 'knife', 'axe', 'fists'];

/* ===================== per-holder weapon state ===================== */

R.Weapon = class Weapon {
  constructor(def, owner) {
    this.def = def;
    this.owner = owner;
    this.ammo = def.mag === Infinity ? Infinity : def.mag;
    this.reserve = def.reserve;
    this.cool = 0;
    this.reloading = 0;
    this.spread = def.spread || 0;
    this.burstLeft = 0;
    this.burstTimer = 0;
    this.chargeT = 0;
    this.scoped = false;
  }
  get interval() { return 60 / this.def.rpm; }
  get isMelee() { return this.def.class === 'melee'; }
  get empty() { return this.ammo !== Infinity && this.ammo <= 0; }
  get canReload() {
    const d = this.def;
    return d.mag !== Infinity && this.ammo < d.mag && (this.reserve === Infinity || this.reserve > 0) && !this.reloading;
  }
  reload() {
    if (!this.canReload) return false;
    this.reloading = this.def.reload;
    R.audio.reload('out', this.owner && this.owner.pos);
    return true;
  }
  refill() {
    this.ammo = this.def.mag; this.reserve = this.def.reserve; this.reloading = 0; this.burstLeft = 0;
  }
  update(dt) {
    this.cool = Math.max(0, this.cool - dt);
    if (this.reloading > 0) {
      const was = this.reloading;
      this.reloading = Math.max(0, this.reloading - dt);
      if (was > this.def.reload * 0.45 && this.reloading <= this.def.reload * 0.45) R.audio.reload('in', this.owner && this.owner.pos);
      if (this.reloading === 0) {
        const want = this.def.mag - this.ammo;
        const take = this.reserve === Infinity ? want : Math.min(want, this.reserve);
        this.ammo += take;
        if (this.reserve !== Infinity) this.reserve -= take;
      }
    }
    // Spread recovers while not firing.
    const base = this.def.spread || 0;
    this.spread = R.damp(this.spread, base, 5.5, dt);
    if (this.burstLeft > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.burstLeft--;
        this._emit();
        this.burstTimer = this.interval;
      }
    }
  }
  // Called on trigger pull. Returns true if a shot went out.
  tryFire() {
    const d = this.def;
    if (this.cool > 0 || this.reloading > 0 || this.burstLeft > 0) return false;
    if (this.empty) {
      if (this.canReload) this.reload();
      return false;
    }
    if (d.burst) {
      this.burstLeft = d.burst;
      this.burstTimer = 0;
      this.cool = d.burstDelay + this.interval * d.burst;
      return true;
    }
    this._emit();
    this.cool = this.interval;
    return true;
  }
  _emit() {
    const d = this.def;
    if (this.ammo !== Infinity) {
      if (this.ammo <= 0) return;
      this.ammo--;
    }
    R.combat.fire(this.owner, this, d);
    if (d.spreadGrow) this.spread = Math.min(d.spreadMax, this.spread + d.spreadGrow);
    if (this.ammo === 0 && this.canReload && this.owner && this.owner.isBot) this.reload();
  }
};

/* ========================== the combat bus ========================== */
// Actors (the player and every bot) register here so bullets can find them.
// Hitboxes are Roblox-shaped: a 2x1x1 head on a 2x2x1 torso over legs.

R.combat = {
  actors: [],
  register(a) { if (!this.actors.includes(a)) this.actors.push(a); },
  unregister(a) { const i = this.actors.indexOf(a); if (i >= 0) this.actors.splice(i, 1); },
  reset() { this.actors.length = 0; R.projectiles.length = 0; },

  // Head, torso and legs in world space, matching the R6 model exactly: legs
  // to 2, torso 2 to 4, head 4 to 5.25. Sliding folds all three down.
  boxesFor(a) {
    const p = a.pos, c = a.sliding ? 0.5 : 1;
    const legTop = 2 * c, torsoTop = legTop + 2 * c, headTop = torsoTop + 1.25 * c;
    return [
      { kind: 'head', min: { x: p.x - 0.75, y: p.y + torsoTop, z: p.z - 0.63 }, max: { x: p.x + 0.75, y: p.y + headTop, z: p.z + 0.63 } },
      { kind: 'body', min: { x: p.x - 1, y: p.y + legTop, z: p.z - 0.5 }, max: { x: p.x + 1, y: p.y + torsoTop, z: p.z + 0.5 } },
      { kind: 'legs', min: { x: p.x - 1, y: p.y, z: p.z - 0.5 }, max: { x: p.x + 1, y: p.y + legTop, z: p.z + 0.5 } },
    ];
  },

  // Nearest actor hit by a ray, excluding `ignore` and friendlies in team modes.
  raycastActors(origin, dir, maxDist, ignore) {
    let best = maxDist, hit = null, part = null;
    for (const a of this.actors) {
      if (a === ignore || a.dead) continue;
      if (ignore && R.modes.friendly(ignore, a)) continue;
      for (const b of this.boxesFor(a)) {
        const t = R.rayBox(origin, dir, b);
        if (t >= 0 && t < best) { best = t; hit = a; part = b.kind; }
      }
    }
    return hit ? { actor: hit, dist: best, part } : null;
  },

  // One trigger pull: hitscan, melee swing or projectile launch.
  fire(shooter, wep, d) {
    if (!shooter) return;
    const origin = shooter.eye();
    const aim = shooter.aimDir();
    R.audio.shot(d.sound, shooter.isLocal ? null : shooter.pos);
    if (shooter.isLocal) {
      R.addShake(d.recoil ? Math.min(0.5, d.recoil * 0.1) : 0.06);
      R.ui.onLocalShot(wep);
    }
    shooter.onShot && shooter.onShot(wep);

    if (d.class === 'melee') { this.melee(shooter, wep, d, origin, aim); return; }
    if (d.projectile) { this.launch(shooter, wep, d, origin, aim); return; }

    // A shotgun's first pellet rides the crosshair and the rest fill the cone,
    // so a centred shot lands most of its damage and aim still matters.
    const pellets = d.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      this.hitscan(shooter, wep, d, origin, this.spreadDir(aim, i === 0 ? wep.spread * 0.2 : wep.spread, shooter));
    }
  },

  spreadDir(aim, spread, shooter) {
    if (!spread) return aim.clone();
    // Moving and airborne shots are less accurate, as in the real game.
    let s = spread;
    if (shooter) {
      const speed = Math.hypot(shooter.vel.x, shooter.vel.z);
      s *= 1 + Math.min(1.1, speed / 40) * 0.7;
      if (!shooter.grounded) s *= 1.5;
      if (shooter.scoped) s *= 0.25;
    }
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * s;
    const up = Math.abs(aim.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(aim, up).normalize();
    const realUp = new THREE.Vector3().crossVectors(right, aim).normalize();
    return aim.clone()
      .add(right.multiplyScalar(Math.cos(a) * r))
      .add(realUp.multiplyScalar(Math.sin(a) * r))
      .normalize();
  },

  hitscan(shooter, wep, d, origin, dir, maxDist) {
    const range = maxDist || 1200;
    const w = R.raycastWorld(origin, dir, range);
    const a = this.raycastActors(origin, dir, w ? w.dist : range, shooter);
    const end = a ? origin.clone().add(dir.clone().multiplyScalar(a.dist))
      : w ? w.point : origin.clone().add(dir.clone().multiplyScalar(range));
    if (d.tracer !== false) R.tracers.add(origin, end, d.tracer || '#ffe9a8', shooter.isLocal ? 0.55 : 1, 0.07);
    if (a) {
      this.damage(shooter, a.actor, this.damageAt(d, a.dist, a.part === 'head'), a.part, dir, d);
    } else if (w) {
      this.worldImpact(w, d);
    }
    return a;
  },

  damageAt(d, dist, crit) {
    let dmg = crit ? d.critDmg : d.dmg;
    if (!crit && d.falloff) {
      const [s, e, min] = d.falloff;
      if (dist > s) {
        const u = R.clamp((dist - s) / (e - s), 0, 1);
        dmg = R.lerp(dmg, min, u);
      }
    }
    return dmg;
  },

  worldImpact(w, d) {
    const surf = w.box.mat || 'plastic';
    const col = surf === 'metal' || surf === 'grate' ? '#ffe2a0' : surf === 'concrete' || surf === 'tile' ? '#d8d2c6' : '#e8dcc0';
    R.fx.impact(w.point, w.normal, col);
    R.decals.put(w.point, w.normal, d.splash ? 3 : R.rand(0.5, 0.75), '#ffffff');
    R.audio.noise(R.audio.ctx ? R.audio.ctx.currentTime : 0, 0.05, { gain: 0.14, hp: 900, lp: 7000, pos: w.point, falloff: 160 });
  },

  melee(shooter, wep, d, origin, aim) {
    const range = d.range || 8;
    const hit = this.raycastActors(origin, aim, range, shooter);
    // A swing is a short cone, not a laser: also sweep slightly off-axis.
    let best = hit;
    if (!best) {
      for (const off of [-0.16, 0.16, -0.08, 0.08]) {
        const dir = this.spreadDir(aim, 0, shooter);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), off).normalize();
        const h = this.raycastActors(origin, dir, range, shooter);
        if (h) { best = h; break; }
      }
    }
    if (best) {
      const blocked = R.raycastWorld(origin, aim, best.dist);
      if (!blocked) this.damage(shooter, best.actor, best.part === 'head' ? d.critDmg : d.dmg, best.part, aim, d);
    }
    if (d.lunge && shooter.applyKnock) shooter.applyKnock(aim.clone().multiplyScalar(d.lunge));
  },

  launch(shooter, wep, d, origin, aim) {
    const dir = this.spreadDir(aim, wep.spread || 0, shooter);
    const charge = d.charge ? R.clamp(wep.chargeT / d.charge, 0.3, 1) : 1;
    R.projectiles.push({
      kind: d.projectile, def: d, owner: shooter, bounces: d.bounces || 0,
      pos: origin.clone().add(dir.clone().multiplyScalar(1.4)),
      vel: dir.clone().multiplyScalar(d.speed * (d.charge ? charge : 1)),
      charge, life: 0, fuse: d.fuse || 0, mesh: R.makeProjectileMesh(d),
      trailT: 0,
    });
    if (d.projectile === 'arrow') wep.chargeT = 0;
  },

  damage(shooter, target, amount, part, dir, d) {
    if (target.dead) return;
    const crit = part === 'head';
    if (part === 'legs') amount *= 0.9;              // limbs chip, as in Roblox
    if (d && d.slow && target.applySlow) target.applySlow(d.slow, d.slowTime);
    target.takeDamage(amount, shooter, crit, dir, d);
    R.fx.blood(
      { x: target.pos.x, y: target.pos.y + (crit ? 4.6 : 3), z: target.pos.z },
      dir, crit ? 10 : 6);
    R.audio.hit(crit, target.pos);
    if (shooter && shooter.isLocal) {
      R.ui.hitmarker(crit, amount);
      R.audio.hitmark(crit);
    }
  },

  // Splash from rockets and grenades, including self-damage that enables the
  // rocket jump: full knockback, 40-45% of the damage to yourself.
  explode(pos, d, owner) {
    R.audio.explosion(pos);
    R.fx.burst(pos, 44, '#ffb347', 90, 0.5, 0.55);
    R.fx.burst(pos, 18, '#ff6a1a', 50, 0.9, 0.7);
    for (let i = 0; i < 10; i++) {
      R.fx.puff(pos, { x: R.rand(-14, 14), y: R.rand(4, 20), z: R.rand(-14, 14) }, '#5a5048', R.rand(2, 4.5), 1.1);
    }
    R.addShake(R.clamp(1.2 - R.camera.position.distanceTo(pos) / 90, 0, 0.9));
    const radius = d.splash || 14;
    for (const a of R.combat.actors) {
      if (a.dead) continue;
      const centre = new THREE.Vector3(a.pos.x, a.pos.y + 2.2, a.pos.z);
      const dist = centre.distanceTo(pos);
      if (dist > radius) continue;
      const self = a === owner;
      if (!self && owner && R.modes.friendly(owner, a)) continue;
      const u = 1 - dist / radius;
      let amount = d.dmg * u;
      const dir = centre.clone().sub(pos);
      if (dir.lengthSq() < 0.01) dir.set(0, 1, 0);
      dir.normalize();
      if (self) {
        amount *= d.selfDmg != null ? d.selfDmg : 0.45;
        // The jump: vertical kick scaled by how close the blast was.
        if (a.applyKnock) a.applyKnock(dir.multiplyScalar(60 * u * (d.selfKnock || 1)).add(new THREE.Vector3(0, 34 * u * (d.selfKnock || 1), 0)));
        if (amount >= 1) a.takeDamage(amount, a, false, dir, d);
      } else {
        if (a.applyKnock) a.applyKnock(dir.clone().multiplyScalar(38 * u).add(new THREE.Vector3(0, 20 * u, 0)));
        R.combat.damage(owner, a, amount, 'body', dir, d);
      }
    }
    // Scorch the ground.
    const down = R.raycastWorld(pos, new THREE.Vector3(0, -1, 0), 10);
    if (down) R.decals.put(down.point, down.normal, R.rand(7, 10), '#2a2420');
  },
};

/* =========================== projectiles =========================== */

R.projectiles = [];

R.makeProjectileMesh = function (d) {
  let mesh;
  if (d.projectile === 'arrow') {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 2.4), R.mat('#8a6a3a', 'wood'));
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), R.mat('#d8d8d8', 'metal'));
    head.position.z = 1.4;
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.6), R.mat('#e03a3a', 'plastic'));
    fl.position.z = -1;
    g.add(shaft, head, fl);
    mesh = g;
  } else if (d.projectile === 'rocket') {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 2.2, 8), R.mat('#3a4a3a', 'metal'));
    body.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.8, 8), R.mat('#b03028', 'plastic'));
    tip.rotation.x = Math.PI / 2; tip.position.z = 1.4;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 7), R.mat('#ffb040', 'neon'));
    flame.rotation.x = -Math.PI / 2; flame.position.z = -1.8;
    g.add(body, tip, flame);
    g.userData.flame = flame;
    mesh = g;
  } else if (d.projectile === 'grenade') {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), R.mat('#2f3a2a', 'metal'));
  } else if (d.projectile === 'beam') {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), R.mat('#b388ff', 'neon'));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), R.mat('#b388ff', 'neon', { opacity: 0.3 }));
    halo.material.transparent = true; halo.material.opacity = 0.3;
    mesh.add(halo);
  } else {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), R.mat('#8ff0ff', 'neon'));
  }
  R.scene.add(mesh);
  return mesh;
};

R.updateProjectiles = function (dt) {
  for (let i = R.projectiles.length - 1; i >= 0; i--) {
    const p = R.projectiles[i];
    const d = p.def;
    p.life += dt;
    const gravity = p.kind === 'arrow' ? 60 : p.kind === 'grenade' ? R.GRAVITY * 0.85 : 0;
    if (gravity) p.vel.y -= gravity * dt;

    const step = p.vel.clone().multiplyScalar(dt);
    const len = step.length();
    const dir = len > 0.0001 ? step.clone().multiplyScalar(1 / len) : new THREE.Vector3(0, -1, 0);

    const w = len > 0.0001 ? R.raycastWorld(p.pos, dir, len) : null;
    const a = len > 0.0001 ? R.combat.raycastActors(p.pos, dir, w ? Math.min(w.dist, len) : len, p.owner) : null;

    let done = false;
    if (a) {
      // Direct hit.
      const crit = a.part === 'head';
      let dmg = crit ? d.critDmg : d.dmg;
      if (p.kind === 'arrow') dmg = Math.round(dmg * p.charge);
      p.pos.add(dir.clone().multiplyScalar(a.dist));
      if (d.splash) R.combat.explode(p.pos, d, p.owner);
      else R.combat.damage(p.owner, a.actor, dmg, a.part, dir, d);
      done = true;
    } else if (w) {
      p.pos.copy(w.point);
      if (p.kind === 'rocket') { R.combat.explode(p.pos, d, p.owner); done = true; }
      else if (p.kind === 'grenade') {
        // Bounce and keep the fuse running.
        const n = w.normal;
        const vn = p.vel.dot(n);
        p.vel.sub(n.clone().multiplyScalar(2 * vn)).multiplyScalar(0.46);
        p.pos.add(n.clone().multiplyScalar(0.3));
        R.audio.noise(R.audio.ctx ? R.audio.ctx.currentTime : 0, 0.05, { gain: 0.16, hp: 500, lp: 4000, pos: p.pos, falloff: 140 });
      } else if (p.kind === 'beam') {
        if (p.bounces > 0) {
          p.bounces--;
          const n = w.normal;
          const vn = p.vel.dot(n);
          p.vel.sub(n.clone().multiplyScalar(2 * vn));
          p.pos.add(n.clone().multiplyScalar(0.4));
          R.fx.burst(p.pos, 6, '#b388ff', 26, 0.3, 0.3);
          R.audio.tone(R.audio.ctx ? R.audio.ctx.currentTime : 0, 900, 1500, 0.08, { type: 'sine', gain: 0.08, pos: p.pos, falloff: 220 });
        } else { R.fx.burst(p.pos, 10, '#b388ff', 30, 0.35, 0.3); done = true; }
      } else if (p.kind === 'arrow') {
        R.fx.impact(p.pos, w.normal, '#e8dcc0');
        R.decals.put(p.pos, w.normal, 0.6, '#ffffff');
        done = true;
      } else { R.fx.burst(p.pos, 8, '#8ff0ff', 24, 0.3, 0.3); done = true; }
    } else {
      p.pos.add(step);
    }

    if (p.kind === 'grenade' && p.fuse > 0) {
      p.fuse -= dt;
      if (p.fuse <= 0) { R.combat.explode(p.pos, d, p.owner); done = true; }
    }
    if (p.life > 7) done = true;

    // Trails.
    p.trailT -= dt;
    if (p.trailT <= 0) {
      p.trailT = 0.016;
      if (p.kind === 'rocket') {
        R.fx.puff(p.pos, { x: R.rand(-3, 3), y: R.rand(0, 4), z: R.rand(-3, 3) }, '#8a8178', R.rand(0.8, 1.6), 0.7);
        R.fx.spark(p.pos, { x: R.rand(-6, 6), y: R.rand(-4, 6), z: R.rand(-6, 6) }, '#ffb040', 0.3, 0.15, 0, 3);
      } else if (p.kind === 'beam') {
        R.fx.spark(p.pos, { x: 0, y: 0, z: 0 }, '#b388ff', 0.45, 0.2, 0, 0);
      } else if (p.kind === 'freeze') {
        R.fx.spark(p.pos, { x: R.rand(-3, 3), y: R.rand(-3, 3), z: R.rand(-3, 3) }, '#8ff0ff', 0.3, 0.25, 0, 2);
      }
    }

    if (p.mesh) {
      p.mesh.position.copy(p.pos);
      if (p.kind === 'arrow' || p.kind === 'rocket') {
        p.mesh.lookAt(p.pos.clone().add(p.vel));
        if (p.mesh.userData.flame) p.mesh.userData.flame.scale.setScalar(R.rand(0.7, 1.3));
      } else if (p.kind === 'grenade') {
        p.mesh.rotation.x += dt * 9; p.mesh.rotation.z += dt * 6;
      }
    }

    if (done) {
      if (p.mesh) R.scene.remove(p.mesh);
      R.projectiles.splice(i, 1);
    }
  }
};

R.clearProjectiles = function () {
  for (const p of R.projectiles) if (p.mesh) R.scene.remove(p.mesh);
  R.projectiles.length = 0;
};
