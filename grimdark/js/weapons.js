'use strict';
// Projectiles for every side, the player's arsenal (19 weapons), classes and abilities.
(function () {
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), v5 = new THREE.Vector3();
  const q1 = new THREE.Quaternion();
  const col = c => new THREE.Color(c);
  const CBLUE = col(0x9ad0ff), CBLUE2 = col(0x1050ff), CACID = col(0x8acf20), CFIRE = col(0xffd080), CFIRE2 = col(0xff3000), CSMK = col(0x6a6560), CWARP = col(0xff80ff), CWARP2 = col(0x4060ff), CSTEAM = col(0xd0d8e0);

  /* ================= projectiles ================= */
  const S = G.shots = { list: [] };
  const geoBolt = new THREE.BoxGeometry(0.05, 0.05, 0.9);
  const geoBall = new THREE.SphereGeometry(1, 10, 8);
  const geoNade = new THREE.SphereGeometry(0.09, 10, 8);
  const geoRocket = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8); geoRocket.rotateX(Math.PI / 2);
  function spriteOf(color, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.texSoft(), color, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size); return s;
  }
  S.make = function (kind) {
    const g = new THREE.Group();
    if (kind === 'bolt' || kind === 'ebolt') { g.add(new THREE.Mesh(geoBolt, G.glow('boltg', 0xffb050))); g.add(spriteOf(kind === 'ebolt' ? 0xff5030 : 0xff9030, 0.5)); }
    else if (kind === 'plasma' || kind === 'plasmaBig' || kind === 'eplasma') { const b = new THREE.Mesh(geoBall, G.glow('plg', 0xbfe8ff)); b.scale.setScalar(kind === 'plasmaBig' ? 0.25 : 0.1); g.add(b); g.add(spriteOf(0x3a9cff, kind === 'plasmaBig' ? 2.2 : 0.9)); }
    else if (kind === 'acid') { const b = new THREE.Mesh(geoBall, G.models.mats.acid); b.scale.setScalar(0.14); g.add(b); g.add(spriteOf(0x9aff20, 0.8)); }
    else if (kind === 'fire') { g.add(spriteOf(0xff6010, 1.2)); g.add(spriteOf(0xffd080, 0.5)); }
    else if (kind === 'flame') { const s = spriteOf(0xff7020, 0.5); g.add(s); g.userData.grow = s; }
    else if (kind === 'warp') { g.add(spriteOf(0xff60ff, 0.9)); g.add(spriteOf(0x6080ff, 0.4)); }
    else if (kind === 'missile' || kind === 'rocket') { g.add(new THREE.Mesh(geoRocket, G.models.mats.gunmetal)); const f = spriteOf(0xffb060, 0.7); f.position.z = -0.4; g.add(f); }
    else if (kind === 'nade') { g.add(new THREE.Mesh(geoNade, G.models.mats.blackMetal)); const l = spriteOf(0xff2020, 0.25); g.add(l); g.userData.blink = l; }
    return g;
  };
  S.spawnPlayer = function (kind, pos, vel, o) {
    const m = S.make(kind); m.position.copy(pos); G.scene.add(m);
    S.list.push(Object.assign({ kind, pos: m.position, vel: vel.clone(), mesh: m, life: 0, team: 'p', grav: 0, maxLife: 4 }, o));
  };
  // a projectile fired by a unit; team decides what it can hit
  S.spawnUnit = function (kind, pos, vel, dmg, team, homing, grav) {
    const m = S.make(kind); m.position.copy(pos); G.scene.add(m);
    const splash = { fire: 2.2, flame: 1.2, acid: 1.5, missile: 2.6, warp: 1.6, ebolt: 1.0, eplasma: 1.8 }[kind] || 1;
    S.list.push({ kind, pos: m.position, vel: vel.clone(), mesh: m, life: 0, team: team || 'foe', dmg, grav: grav || (kind === 'acid' ? 4 : kind === 'flame' ? -2 : 0), splash, homing, maxLife: kind === 'flame' ? 0.65 : 5 });
  };
  S.spawnEnemy = (kind, pos, vel, dmg) => S.spawnUnit(kind, pos, vel, dmg, 'foe');
  S.clear = function () { S.list.forEach(s => s.mesh.parent && s.mesh.parent.remove(s.mesh)); S.list = []; };

  function friendlyImpact(s, point, normal, hitE) {
    const k = s.kind, mine = s.team === 'p';
    const dir = v1.copy(s.vel).normalize();
    const mult = mine ? G.arsenal.mult() : 1;
    if (hitE) {
      const killed = hitE.e.damage(s.dmg, dir, { part: hitE.part, point, explosive: k !== 'flame', fire: k === 'flame' ? 2.5 : 0, mult });
      if (mine) G.arsenal.hitmarker(hitE.part === 'head', killed);
    }
    if (k === 'bolt') {
      const b = s.big ? 1.6 : 1;
      G.fx.burst(G.fx.add, point, 14 * b, { c0: 0xfff0c0, c1: 0xff6a10, sp: [1, 5 * b], life: [0.1, 0.3], s0: [0.2 * b, 0.5 * b], s1: 0.05 });
      G.fx.burst(G.fx.smoke, point, 3, { c0: 0x3a3632, sp: [0.3, 1.5], life: [0.5, 1.2], s0: [0.3, 0.5], s1: 1.2 * b, a0: 0.5, up: 0.5 });
      G.fx.sparks(point, normal || v2.set(0, 1, 0), 0xff8020, 6);
      G.fx.flash(point, 0xff8030, 4 * b, 6, 0.12);
      G.enemies.radius(point, 1.4 * b, s.splash, { mult });
      G.audio.play('boltexp', point, 0.5);
      if (!hitE) G.fx.decal(point, 0x0a0806, 0.5 * b, 0.7);
    } else if (k === 'plasma' || k === 'plasmaBig') {
      const big = k === 'plasmaBig';
      G.fx.burst(G.fx.add, point, big ? 70 : 20, { c0: 0xffffff, c1: 0x2a80ff, sp: [1, big ? 10 : 5], life: [0.15, 0.5], s0: [0.2, big ? 0.9 : 0.4], s1: 0.03 });
      G.fx.flash(point, 0x4aa0ff, big ? 16 : 6, big ? 14 : 7, 0.25);
      G.enemies.radius(point, big ? 3.8 : 1.4, big ? 140 : 20, { mult });
      G.audio.play(big ? 'explosion' : 'boltexp', point, big ? 0.8 : 0.4);
      if (big) { G.shake += 0.3; G.fx.decal(point, 0x081020, 2.5, 0.8); }
    } else if (k === 'rocket') {
      G.fx.explosion(point, 1.5, 0xff7020);
      G.enemies.radius(point, 4.5, s.splash, { mult });
      G.audio.play('explosion', point, 1);
      const d = G.player.pos.distanceTo(point);
      if (d < 3 && mine) G.player.hurt((3 - d) * 8, point, 'blast');
    } else if (k === 'nade') {
      G.fx.explosion(point, 1.8, 0xff7020);
      G.enemies.radius(point, 6.5, 240, { mult });
      G.audio.play('explosion', point, 1);
      const d = G.player.pos.distanceTo(point);
      if (d < 4) G.player.hurt((4 - d) * 8, point, 'blast');
    } else if (k === 'flame') {
      G.enemies.radius(point, 1.2, s.dmg * 0.5, { fire: 2.5, explosive: false });
    }
    s.dead = true;
  }
  function hostileImpact(s, point, hitT) {
    const k = s.kind;
    if (k === 'acid') {
      G.fx.burst(G.fx.smoke, point, 12, { c0: 0x9acf20, c1: 0x5a7a10, sp: [1, 4], life: [0.3, 0.7], s0: [0.1, 0.25], s1: 0.4, a0: 0.9, grav: 10 });
      G.fx.decal(point, 0x5a8a10, 1.2, 0.8);
    } else if (k === 'missile') {
      G.fx.explosion(point, 1.1, 0xff8030);
    } else if (k === 'warp') {
      G.fx.burst(G.fx.add, point, 24, { c0: 0xffc0ff, c1: 0x4060ff, sp: [1, 5], life: [0.2, 0.5], s0: [0.2, 0.5], s1: 0.05 });
      G.fx.flash(point, 0xc060ff, 5, 8, 0.25);
    } else if (k === 'flame') {
      G.fx.burst(G.fx.add, point, 3, { c0: 0xffe0a0, c1: 0xff3000, sp: [0.5, 2], life: [0.2, 0.4], s0: [0.3, 0.6], s1: 0.1, up: 1.5 });
    } else {
      G.fx.burst(G.fx.add, point, 24, { c0: 0xffe0a0, c1: k === 'eplasma' ? 0x3080ff : 0xff3000, sp: [1, 5], life: [0.2, 0.6], s0: [0.3, 0.8], s1: 0.1, up: 1.5 });
      G.fx.flash(point, 0xff5010, 6, 8, 0.25);
    }
    if (hitT) hitT.hurt(s.dmg * G.enemies.dmgMul(), s.pos, k);
    for (const h of G.enemies.hostilesOf('foe')) {
      if (h === hitT) continue;
      const c = h.hitBody || v3.copy(h.pos).setY(h.pos.y + 1);
      const d = c.distanceTo(point);
      if (d < s.splash) h.hurt(s.dmg * G.enemies.dmgMul() * (1 - d / s.splash * 0.6) * 0.7, point, k);
    }
    if (k !== 'flame' || Math.random() < 0.1) G.audio.play(k === 'acid' ? 'acid' : 'boltexp', point, 0.4);
    s.dead = true;
  }
  S.update = function (dt) {
    for (const s of S.list) {
      const step = dt * (s.team === 'foe' ? G.enemyScale : 1);
      s.life += step;
      s.vel.y -= s.grav * step;
      if (s.homing && !s.homing.dead && s.life > 0.25) {
        const aim = s.homing.hitBody ? v3.copy(s.homing.hitBody) : v3.copy(s.homing.pos).setY(s.homing.pos.y + 1.2);
        const sp = s.vel.length();
        v4.subVectors(aim, s.pos).normalize().multiplyScalar(sp);
        s.vel.lerp(v4, Math.min(1, step * 1.6)).setLength(sp);
      }
      const len = s.vel.length() * step;
      const dir = v2.copy(s.vel).normalize();
      if (s.kind === 'nade') {
        s.pos.addScaledVector(s.vel, step);
        const gy = G.world.groundAt(s.pos.x, s.pos.z, s.pos.y + 0.2) + 0.09;
        if (s.pos.y < gy) { s.pos.y = gy; if (Math.abs(s.vel.y) > 2) G.audio.play('bounce', s.pos, 0.5); s.vel.y *= -0.35; s.vel.x *= 0.6; s.vel.z *= 0.6; }
        if (G.world.collide(s.pos, 0.1, 0.1, 0)) { s.vel.x *= -0.4; s.vel.z *= -0.4; }
        s.mesh.userData.blink.visible = (s.life * 6 | 0) % 2 === 0;
        if (s.life > 2.2) friendlyImpact(s, s.pos.clone(), null, null);
        else for (const e of G.enemies.list) if (!e.dead && e.team === 'foe' && e.hitBody.distanceTo(s.pos) < e.rBody + 0.3 && s.life > 0.15) { friendlyImpact(s, s.pos.clone(), null, null); break; }
        continue;
      }
      const w = G.world.ray(s.pos, dir, len);
      let tHit = w ? w.t : Infinity, hitE = null, hitT = null;
      if (s.team !== 'foe') {
        const h = G.enemies.raycast(s.pos, dir, len + (s.kind === 'flame' ? 0.4 : 0));
        if (h && h.t < tHit) { tHit = h.t; hitE = h; }
      } else {
        const h = G.enemies.rayPlayerish(s.pos, dir, Math.min(tHit, len + 0.3));
        if (h) { tHit = h.t; hitT = h.tgt; }
      }
      if (tHit !== Infinity || s.life > s.maxLife) {
        const pt = s.pos.clone().addScaledVector(dir, tHit === Infinity ? 0 : tHit);
        if (s.team === 'foe') hostileImpact(s, pt, hitT); else friendlyImpact(s, pt, w && !hitE ? w.normal : null, hitE);
        continue;
      }
      s.pos.addScaledVector(s.vel, step);
      s.mesh.lookAt(v3.copy(s.pos).add(dir));
      const p = s.pos;
      if (s.kind === 'plasma' || s.kind === 'plasmaBig' || s.kind === 'eplasma') G.fx.add.emit(p.x, p.y, p.z, 0, 0, 0, 0.2, s.kind === 'plasmaBig' ? 0.6 : 0.25, 0.02, CBLUE, CBLUE2, 0.8, 0, 0, 0);
      else if (s.kind === 'acid') G.fx.smoke.emit(p.x, p.y, p.z, 0, -0.5, 0, 0.4, 0.12, 0.02, CACID, CACID, 0.8, 0, 3, 0);
      else if (s.kind === 'fire') G.fx.add.emit(p.x, p.y, p.z, G.rand(-0.5, 0.5), G.rand(0, 1), G.rand(-0.5, 0.5), 0.35, 0.7, 0.1, CFIRE, CFIRE2, 0.9, 0, 0, 0);
      else if (s.kind === 'flame') { s.mesh.userData.grow.scale.setScalar(0.4 + s.life * 3); if (Math.random() < 0.5) G.fx.add.emit(p.x, p.y, p.z, 0, 0.5, 0, 0.3, 0.5, 1.0, CFIRE, CFIRE2, 0.8, 0, -1, 0); }
      else if (s.kind === 'warp') G.fx.add.emit(p.x, p.y, p.z, 0, 0, 0, 0.3, 0.4, 0.05, CWARP, CWARP2, 0.8, 0, 0, 0);
      else if (s.kind === 'missile' || s.kind === 'rocket') { G.fx.smoke.emit(p.x, p.y, p.z, G.rand(-0.2, 0.2), 0.3, G.rand(-0.2, 0.2), 1.2, 0.15, 0.8, CSMK, CSMK, 0.5, 0, -0.2, 0.5); G.fx.add.emit(p.x, p.y, p.z, 0, 0, 0, 0.08, 0.3, 0.05, CFIRE, CFIRE2, 1, 0, 0, 0); }
      else if (s.kind === 'bolt' || s.kind === 'ebolt') G.fx.smoke.emit(p.x, p.y, p.z, 0, 0.2, 0, 0.5, 0.06, 0.25, CSMK, CSMK, 0.25, 0, 0, 0);
    }
    for (const s of S.list) if (s.dead && s.mesh.parent) s.mesh.parent.remove(s.mesh);
    S.list = S.list.filter(s => !s.dead);
  };

  // jagged lightning between two points
  G.fx.lightning = function (a, b, color, width) {
    const prev = v4.copy(a);
    const segs = 7;
    for (let i = 1; i <= segs; i++) {
      const p = v5.lerpVectors(a, b, i / segs);
      if (i < segs) p.add(v3.set(G.rand(-0.4, 0.4), G.rand(-0.4, 0.4), G.rand(-0.4, 0.4)));
      G.fx.tracer(prev.clone(), p.clone(), color, width || 0.04, 0.12);
      prev.copy(p);
    }
    G.fx.flash(b, color, 5, 7, 0.15);
  };

  /* ================= arsenal ================= */
  const A = G.arsenal = {};
  // type: proj | hitscan | heat | stream | beam | melee | smite
  A.defs = {
    bolter: { name: 'Bolt Rifle', type: 'proj', proj: 'bolt', mag: 30, reserve: 210, rate: 0.125, auto: true, dmg: 30, splash: 14, speed: 170, spread: 0.02, ads: 0.004, reload: 2.0, kick: 0.07, rise: 0.012, sound: 'bolter', flash: 0xffa040 },
    boltPistol: { name: 'Bolt Pistol', type: 'proj', proj: 'bolt', mag: 12, reserve: 96, rate: 0.17, auto: false, dmg: 34, splash: 14, speed: 160, spread: 0.025, ads: 0.006, reload: 1.4, kick: 0.09, rise: 0.02, sound: 'bolter', flash: 0xffa040 },
    stormBolter: { name: 'Storm Bolter', type: 'proj', proj: 'bolt', mag: 60, reserve: 360, rate: 0.075, auto: true, twin: true, dmg: 28, splash: 12, speed: 170, spread: 0.028, ads: 0.008, reload: 2.3, kick: 0.06, rise: 0.008, sound: 'bolter', flash: 0xffa040 },
    heavyBolter: { name: 'Heavy Bolter', type: 'proj', proj: 'bolt', big: true, mag: 80, reserve: 320, rate: 0.1, auto: true, dmg: 48, splash: 28, speed: 190, spread: 0.035, ads: 0.01, reload: 3.0, kick: 0.1, rise: 0.022, sound: 'bolter', flash: 0xffa040, heavy: true },
    assaultCannon: { name: 'Assault Cannon', type: 'hitscan', mag: 200, reserve: 600, rate: 0.045, auto: true, spin: true, dmg: 22, spread: 0.035, ads: 0.015, reload: 3.2, kick: 0.04, rise: 0.006, sound: 'slug', flash: 0xffc060, tracer: 0xffc040, heavy: true, boom: true },
    lasgun: { name: 'Lasgun', type: 'hitscan', mag: 40, reserve: 360, rate: 0.1, auto: true, dmg: 19, spread: 0.018, ads: 0.004, reload: 1.6, kick: 0.035, rise: 0.006, sound: 'autogun', flash: 0xff4020, tracer: 0xff3018 },
    longlas: { name: 'Long-las', type: 'hitscan', mag: 6, reserve: 48, rate: 0.9, auto: false, dmg: 170, pierce: 2, spread: 0.03, ads: 0.0, reload: 2.0, kick: 0.15, rise: 0.04, sound: 'sniper', flash: 0xff4020, tracer: 0xff3018, zoom: 0.72 },
    plasma: { name: 'Plasma Incinerator', type: 'heat', rate: 0.22, dmg: 55, dmgBig: 230, speed: 95, spread: 0.012, ads: 0.003, kick: 0.09, rise: 0.02, flash: 0x60b0ff, heat: 13, heatBig: 42 },
    plasmaPistol: { name: 'Plasma Pistol', type: 'heat', rate: 0.28, dmg: 45, dmgBig: 170, speed: 90, spread: 0.015, ads: 0.005, kick: 0.1, rise: 0.025, flash: 0x60b0ff, heat: 16, heatBig: 45 },
    flamer: { name: 'Purgation Flamer', type: 'stream', mag: 100, reserve: 300, reload: 2.4, range: 11, flash: 0xff7020 },
    melta: { name: 'Melta Gun', type: 'beam', mag: 5, reserve: 20, rate: 1.0, dmg: 520, range: 24, reload: 2.6, kick: 0.2, rise: 0.06, flash: 0xffa060, windup: 0.22, col: [0xffe0a0, 0xff5010], snd: 'melta' },
    lascannon: { name: 'Lascannon', type: 'beam', mag: 1, reserve: 16, rate: 0.5, dmg: 1100, range: 150, reload: 2.4, kick: 0.25, rise: 0.08, flash: 0xff4020, windup: 0.55, col: [0xffd0c0, 0xff2010], snd: 'sniper', heavy: true },
    missile: { name: 'Missile Launcher', type: 'proj', proj: 'rocket', mag: 1, reserve: 14, rate: 0.6, auto: false, dmg: 220, splash: 320, speed: 55, spread: 0.01, ads: 0.002, reload: 1.9, kick: 0.2, rise: 0.05, sound: 'missile', flash: 0xffa040, heavy: true },
    smite: { name: 'Smite', type: 'smite', rate: 0.35, dmg: 75, chain: 3, heat: 14, heatBig: 45, flash: 0x80b0ff, kick: 0.05, rise: 0.01 },
    chainsword: { name: 'Chainsword', type: 'melee', style: 'sword', dmg: 75, range: 3.3 },
    knife: { name: 'Combat Knife', type: 'melee', style: 'knife', dmg: 55, range: 2.5 },
    hammer: { name: 'Thunder Hammer', type: 'melee', style: 'hammer', dmg: 170, range: 3.5 },
    claws: { name: 'Lightning Claws', type: 'melee', style: 'claws', dmg: 48, range: 3.0 },
    forceStaff: { name: 'Force Staff', type: 'melee', style: 'staff', dmg: 95, range: 3.4 },
  };
  A.classes = {
    tactical: { name: 'Tactical Legionary', desc: 'Versatile line warrior. Calls down an orbital lance.', hp: 100, armor: 100, speed: 1, jump: 1, weapons: ['bolter', 'plasma', 'melta', 'chainsword'], nades: 3, ability: 'orbital', tint: 0xffffff },
    assault: { name: 'Assault Legionary', desc: 'Jump pack, pistols and close combat.', hp: 100, armor: 100, speed: 1.12, jump: 1.15, weapons: ['boltPistol', 'plasmaPistol', 'chainsword', 'hammer'], nades: 4, ability: 'jump', tint: 0xd06a5a },
    terminator: { name: 'Terminator', desc: 'Tactical dreadnought armour. Slow, immense, teleports into the fight.', hp: 150, armor: 240, speed: 0.82, jump: 0.7, weapons: ['stormBolter', 'assaultCannon', 'hammer', 'claws'], nades: 2, ability: 'teleport', tint: 0xd8c890 },
    devastator: { name: 'Devastator', desc: 'Heavy weapons. Brace to fire with no recoil and double effect.', hp: 110, armor: 120, speed: 0.92, jump: 0.9, weapons: ['heavyBolter', 'lascannon', 'missile', 'boltPistol'], nades: 3, ability: 'brace', tint: 0x9a8ad0 },
    librarian: { name: 'Librarian', desc: 'Psyker. Smite and force staff; unleash a psychic storm.', hp: 100, armor: 100, speed: 1, jump: 1, weapons: ['smite', 'forceStaff', 'boltPistol', 'plasmaPistol'], nades: 2, ability: 'storm', tint: 0x5a80e0 },
    sister: { name: 'Battle Sister', desc: 'Faith and fire. An act of faith makes her untouchable.', hp: 90, armor: 120, speed: 1.05, jump: 1, weapons: ['bolter', 'flamer', 'melta', 'chainsword'], nades: 3, ability: 'faith', tint: 0x55505a },
    guardsman: { name: 'Guardsman', desc: 'Only human. Lasgun, long-las, and a squad on call.', hp: 75, armor: 40, speed: 1.05, jump: 0.9, weapons: ['lasgun', 'longlas', 'plasmaPistol', 'knife'], nades: 6, ability: 'squad', tint: 0x8a9070 },
  };
  A.abilities = {
    orbital: { name: 'Orbital Lance', cd: 40 }, jump: { name: 'Jump Pack', cd: 7 }, teleport: { name: 'Teleport Strike', cd: 12 },
    brace: { name: 'Brace', cd: 22 }, storm: { name: 'Psychic Storm', cd: 18 }, faith: { name: 'Act of Faith', cd: 30 }, squad: { name: 'Call Squad', cd: 45 },
  };
  A.clsKey = 'tactical';
  A.order = A.classes.tactical.weapons;

  A.init = function () {
    A.root = new THREE.Group();
    A.root.scale.setScalar(0.8);
    G.vmScene.add(A.root);
    A.vm = {}; A.st = {};
    for (const k in A.defs) {
      const vm = A.vm[k] = G.models.vm[k]();
      vm.root.visible = false;
      A.root.add(vm.root);
      const gR = G.models.gauntlet(1);
      const d = A.defs[k];
      if (d.type === 'melee' && d.style !== 'claws' && d.style !== 'staff') { gR.hand.position.set(0, -0.01, 0.0); gR.hand.rotation.set(Math.PI / 2, 0, Math.PI / 2); }
      else if (k === 'claws') { gR.hand.position.set(0, -0.01, 0.0); }
      else if (k === 'forceStaff') { gR.hand.position.set(0, -0.02, 0.02); gR.hand.rotation.set(0, 0, Math.PI / 2); }
      else if (k === 'smite') { gR.hand.position.set(0, -0.04, -0.05); gR.hand.rotation.set(-0.4, 0, 0); }
      else { gR.hand.position.set(0, -0.07, 0.03); gR.hand.rotation.set(0.35, 0, 0); }
      vm.root.add(gR.hand);
      vm.handR = gR.hand;
      vm.wrist = new THREE.Object3D(); vm.wrist.position.set(0, 0, 0.07); gR.hand.add(vm.wrist);
      vm.magHome = vm.mag ? vm.mag.position.clone() : null;
      vm.flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.texSoft(), color: d.flash || 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false }));
      vm.flashSprite.visible = false;
      vm.muzzle.add(vm.flashSprite);
      if (vm.leftClaw) { G.vmScene.add(vm.leftClaw, vm.leftFore); vm.leftClaw.visible = vm.leftFore.visible = false; }
    }
    A.foreR = G.models.gauntlet(1).fore; G.vmScene.add(A.foreR);
    const gl = G.models.gauntlet(-1);
    A.handL = gl.hand; A.foreL = gl.fore; G.vmScene.add(A.handL, A.foreL);
    A.wristL = new THREE.Object3D(); A.wristL.position.set(0, 0, 0.07); A.handL.add(A.wristL);
    A.ring = G.models.beacon(0xff3010); A.ring.visible = false;
    A.reset();
  };
  A.setClass = function (k) {
    A.clsKey = k; const c = A.cls = A.classes[k];
    A.order = c.weapons;
    G.models.mats.ceramite.color.set(c.tint);
  };
  A.reset = function () {
    if (!A.cls) A.setClass(A.clsKey);
    for (const k in A.defs) {
      const d = A.defs[k];
      A.st[k] = { mag: d.mag || 0, reserve: d.reserve || 0, heat: 0, lock: 0, cool: 0 };
    }
    for (const k in A.vm) { A.vm[k].root.visible = false; if (A.vm[k].leftClaw) A.vm[k].leftClaw.visible = A.vm[k].leftFore.visible = false; }
    A.cur = A.order[0]; A.next = null;
    A.fireCD = 0; A.reloadT = -1; A.switchT = 0; A.charge = -1; A.ventT = -1; A.spin = 0; A.muzzleI = 0;
    A.recoil = { z: 0, vz: 0, rx: 0, vrx: 0, ry: 0 };
    A.sway = { x: 0, y: 0 }; A.adsK = 0;
    A.swing = -1; A.combo = 0; A.revv = 0; A.beamWind = -1; A.heavy = false;
    A.grenades = A.cls.nades; A.nadeT = -1;
    A.abilityCD = 0; A.braceT = 0; A.orbital = null;
    A.vm[A.cur].root.visible = true;
    if (A.flameLoop) A.flameLoop.stop(); A.flameLoop = null;
    if (A.chainLoop) A.chainLoop.stop(); A.chainLoop = null;
    A.flaming = false;
    if (A.ring.parent) A.ring.parent.remove(A.ring);
  };
  A.mult = () => (A.braceT > 0 ? 1.6 : 1);
  A.hitmarker = function (head, killed) { G.hud.hitmarker(head, killed); };
  A.select = function (k) {
    if ((k === A.cur && !A.next) || A.next === k) return;
    A.next = k; A.switchT = 0; A.reloadT = -1; A.charge = -1; A.swing = -1; A.beamWind = -1;
    G.audio.play('magout', null, 0.4);
  };
  A.startReload = function () {
    const d = A.defs[A.cur], s = A.st[A.cur];
    if (d.type === 'melee' || A.reloadT >= 0 || A.next) return;
    if (d.type === 'heat' || d.type === 'smite') { if (s.lock <= 0 && s.heat > 5) { A.ventT = 0; s.lock = 1.6; G.audio.play('vent', null, 0.6); } return; }
    if (s.mag >= d.mag || s.reserve <= 0) return;
    A.reloadT = 0;
  };

  function aimRay(o, d, spread) {
    G.camera.getWorldPosition(o);
    G.camera.getWorldDirection(d);
    if (spread) { d.add(v4.set(G.rand(-1, 1), G.rand(-1, 1), G.rand(-1, 1)).normalize().multiplyScalar(spread * Math.random())).normalize(); }
  }
  function toWorld(obj, out) { obj.getWorldPosition(out); return out.applyMatrix4(G.camera.matrixWorld); }
  function muzzleWorld(out) { const vm = A.vm[A.cur]; return toWorld(vm.muzzles ? vm.muzzles[A.muzzleI % 2] : vm.muzzle, out); }
  function curSpread(d) {
    const P = G.player;
    let s = G.lerp(d.spread, d.ads, A.adsK);
    s *= 1 + P.moveAmt * 0.8 + (P.onGround ? 0 : 1.5);
    if (d.heavy && A.braceT <= 0 && A.adsK < 0.5) s *= 1.3;
    if (A.braceT > 0) s *= 0.35;
    return s;
  }
  A.spread = function () { const d = A.defs[A.cur]; return d.type === 'melee' ? 0.02 : d.type === 'stream' ? 0.06 : curSpread(d || {}); };
  function kick(d, mult) {
    let m = mult || 1;
    if (A.braceT > 0) m *= 0.2;
    A.recoil.vz += d.kick * 30 * m; A.recoil.vrx += d.kick * 22 * m; A.recoil.ry = G.rand(-1, 1) * d.kick * 0.3;
    G.player.recoil += d.rise * m * (1 - A.adsK * 0.4);
    G.player.recoilYaw += G.rand(-0.4, 0.4) * d.rise * m;
  }
  function flashVM(scale) {
    const vm = A.vm[A.cur];
    const fs = vm.flashSprite;
    if (vm.muzzles) vm.muzzles[A.muzzleI % 2].add(fs);
    fs.visible = true; fs.scale.setScalar(0.25 * (scale || 1) * G.rand(0.8, 1.3));
    fs.material.rotation = Math.random() * 6;
    A.flashT = 0.04;
    G.vmFlash.color.set(A.defs[A.cur].flash || 0xffffff); G.vmFlash.intensity = 4 * (scale || 1);
  }
  function ejectCasing() {
    const vm = A.vm[A.cur];
    if (!vm.eject) return;
    toWorld(vm.eject, v1);
    const r = v2.set(1, 0, 0).applyQuaternion(G.camera.getWorldQuaternion(q1));
    G.fx.gib(v1, G.models.mats.brass, 0.035, r.multiplyScalar(G.rand(3, 5)).add(v3.set(0, G.rand(2, 4), 0)));
  }
  function emptyClick(s) { if (G.input.lmbPressed) G.audio.play('empty'); if (s.reserve > 0) A.startReload(); }

  function fireProj(d, s) {
    if (s.mag <= 0) return emptyClick(s);
    s.mag--; A.fireCD = d.rate;
    aimRay(v1, v2, curSpread(d));
    const hit = G.world.ray(v1, v2, 300);
    const tgt = v3.copy(v1).addScaledVector(v2, hit ? hit.t : 300);
    const m = muzzleWorld(v4);
    const from = v1.distanceTo(tgt) < 3 ? v1 : m;
    const dir = new THREE.Vector3().subVectors(tgt, from).normalize();
    S.spawnPlayer(d.proj, from, dir.clone().multiplyScalar(d.speed), { dmg: d.dmg, splash: d.splash, big: d.big, maxLife: 4 });
    G.fx.muzzle(m, dir, d.flash, d.big ? 1.6 : 1);
    G.fx.flash(m, d.flash, 3, 6, 0.06);
    flashVM(d.big ? 1.5 : 1);
    kick(d);
    if (d.proj === 'bolt') ejectCasing();
    if (d.proj === 'rocket') { G.fx.burst(G.fx.smoke, v5.copy(m).addScaledVector(dir, -1.6), 12, { c0: 0x8a8580, sp: [1, 4], dir: v3.copy(dir).negate(), cone: 0.5, life: [0.5, 1.5], s0: [0.3, 0.6], s1: 1.8, a0: 0.5, drag: 2 }); G.shake += 0.15; }
    G.audio.play(d.sound, null, d.heavy ? 1 : 0.8);
    if (d.twin) A.muzzleI++;
  }
  function fireHitscan(d, s) {
    if (s.mag <= 0) return emptyClick(s);
    s.mag--; A.fireCD = d.rate;
    const scoped = d.zoom && A.adsK > 0.85;
    aimRay(v1, v2, scoped ? 0 : curSpread(d));
    const w = G.world.ray(v1, v2, 300);
    const maxT = w ? w.t : 300;
    const skip = new Set();
    let end = maxT, hits = 0;
    for (let i = 0; i < (d.pierce || 1); i++) {
      const h = G.enemies.raycast(v1, v2, maxT, skip);
      if (!h) break;
      skip.add(h.e); hits++;
      const killed = h.e.damage(d.dmg, v2, { part: h.part, point: h.point, explosive: d.boom, mult: A.mult() });
      A.hitmarker(h.part === 'head', killed);
      end = h.t;
    }
    if (d.pierce && hits) end = maxT;
    const m = muzzleWorld(v4);
    const e = v3.copy(v1).addScaledVector(v2, end);
    G.fx.tracer(m, e, d.tracer, d.zoom ? 0.04 : 0.025, d.zoom ? 0.2 : 0.06);
    if (w && end >= maxT - 0.01) { G.fx.sparks(e, w.normal, d.tracer, 6); G.fx.decal(e, 0x0a0806, 0.3, 0.6); }
    if (d.boom) G.fx.burst(G.fx.add, e, 5, { c0: 0xffffff, c1: 0xff8020, sp: [1, 3], life: [0.08, 0.2], s0: [0.2, 0.35], s1: 0.03 });
    G.fx.muzzle(m, v2, d.flash, 0.8);
    flashVM(1);
    kick(d);
    G.audio.play(d.sound, null, 0.7);
  }
  function overheatCheck(s, psychic) {
    if (s.heat < 100) return;
    s.heat = 100; s.lock = 2.6;
    G.player.hurt(psychic ? 25 : 18, null, 'overheat');
    if (psychic) {
      G.camera.getWorldPosition(v1);
      G.fx.burst(G.fx.add, v1, 40, { c0: 0xffffff, c1: 0xa040ff, sp: [2, 8], life: [0.2, 0.6], s0: [0.2, 0.5], s1: 0.02 });
      G.enemies.radius(v1, 5, 80, { stun: 1 });
      G.audio.play('warpbolt', null, 1);
      G.hud.banner('PERILS OF THE WARP', 1.4, '#c080ff');
    } else {
      G.audio.play('overheat', null, 1);
      G.hud.banner('OVERHEAT — VENTING', 1.4, '#6ab0ff');
    }
  }
  function fireHeat(d, s, big) {
    const k = big ? 2.5 : 1;
    A.fireCD = big ? 0.5 : d.rate;
    s.heat += big ? d.heatBig : d.heat; s.cool = 0.45;
    aimRay(v1, v2, big ? d.ads : curSpread(d));
    const hit = G.world.ray(v1, v2, 300);
    const tgt = v3.copy(v1).addScaledVector(v2, hit ? hit.t : 300);
    const m = muzzleWorld(v4);
    const from = v1.distanceTo(tgt) < 3 ? v1 : m;
    const dir = new THREE.Vector3().subVectors(tgt, from).normalize();
    S.spawnPlayer(big ? 'plasmaBig' : 'plasma', from, dir.clone().multiplyScalar(big ? d.speed * 0.8 : d.speed), { dmg: big ? d.dmgBig : d.dmg });
    G.fx.burst(G.fx.add, m, big ? 30 : 10, { c0: 0xffffff, c1: 0x3080ff, sp: [1, 6], dir, cone: 0.4, life: [0.05, 0.15], s0: [0.1, 0.3], s1: 0.02 });
    G.fx.flash(m, 0x4aa0ff, 4 * k, 8, 0.1);
    flashVM(k);
    kick(d, big ? 2.5 : 1);
    G.audio.play(big ? 'plasmaBig' : 'plasma', null, 0.8);
    overheatCheck(s, false);
  }
  function fireSmite(d, s, big) {
    A.fireCD = big ? 0.6 : d.rate;
    s.heat += big ? d.heatBig : d.heat; s.cool = 0.45;
    G.camera.getWorldPosition(v1); G.camera.getWorldDirection(v2);
    const m = muzzleWorld(v4).clone();
    if (big) {
      for (const e of G.enemies.list) {
        if (e.dead || e.removed || e.team !== 'foe') continue;
        v3.subVectors(e.hitBody, v1); const dist = v3.length(); if (dist > 16) continue;
        if (v3.normalize().dot(v2) < 0.82) continue;
        G.fx.lightning(m, e.hitBody, 0xa0c8ff, 0.05);
        const killed = e.damage(170, v3.subVectors(e.hitBody, v1).normalize(), { explosive: true, stun: 1, mult: A.mult() }); A.hitmarker(false, killed);
      }
      for (let i = 0; i < 40; i++) { const sp = G.rand(10, 22); G.fx.add.emit(m.x, m.y, m.z, (v2.x + G.rand(-0.3, 0.3)) * sp, (v2.y + G.rand(-0.2, 0.2)) * sp, (v2.z + G.rand(-0.3, 0.3)) * sp, 0.5, 0.4, 0.05, CBLUE, CWARP2, 1, 0, 0, 2); }
      G.audio.play('plasmaBig', null, 1); kick(d, 3); G.shake += 0.3;
    } else {
      let best = null, bs = 0.96;
      for (const e of G.enemies.list) {
        if (e.dead || e.removed || e.team !== 'foe') continue;
        v3.subVectors(e.hitBody, v1); const dist = v3.length(); if (dist > 32) continue;
        const dot = v3.normalize().dot(v2);
        if (dot > bs && G.world.los(v1, e.hitBody)) { bs = dot; best = e; }
      }
      if (best) {
        const hitSet = new Set([best]);
        let from = m.clone(), cur = best, dmg = d.dmg;
        for (let i = 0; i <= d.chain && cur; i++) {
          G.fx.lightning(from, cur.hitBody, 0xa0c8ff, i ? 0.03 : 0.05);
          const killed = cur.damage(dmg, v3.subVectors(cur.hitBody, from).normalize(), { point: cur.hitBody, stun: 0.3, mult: A.mult() }); A.hitmarker(false, killed);
          from = cur.hitBody.clone(); dmg *= 0.7;
          let nxt = null, nd = 9;
          for (const e of G.enemies.list) { if (e.dead || e.removed || e.team !== 'foe' || hitSet.has(e)) continue; const dd = e.hitBody.distanceTo(from); if (dd < nd) { nd = dd; nxt = e; } }
          if (nxt) hitSet.add(nxt);
          cur = nxt;
        }
      } else {
        const w = G.world.ray(v1, v2, 30);
        G.fx.lightning(m, v3.copy(v1).addScaledVector(v2, w ? w.t : 30).clone(), 0xa0c8ff, 0.04);
      }
      G.audio.play('lightning', null, 0.8); kick(d);
    }
    flashVM(big ? 3 : 1.5);
    overheatCheck(s, true);
  }
  function fireBeam(d, s) {
    s.mag--; A.fireCD = d.rate;
    aimRay(v1, v2, 0.002);
    const w = G.world.ray(v1, v2, d.range);
    const maxT = w ? w.t : d.range;
    const skip = new Set();
    const dir = v2.clone();
    for (let i = 0; i < 8; i++) {
      const h = G.enemies.raycast(v1, dir, maxT, skip);
      if (!h) break;
      skip.add(h.e);
      const fall = d.range > 50 ? 1 : (h.t < 14 ? 1 : 1 - (h.t - 14) / (d.range - 14) * 0.6);
      const killed = h.e.damage(d.dmg * fall, dir, { part: h.part, point: h.point, melta: true, mult: A.mult() });
      A.hitmarker(h.part === 'head', killed);
      G.fx.burst(G.fx.add, h.point, 20, { c0: 0xffffff, c1: d.col[1], sp: [1, 6], life: [0.2, 0.5], s0: [0.2, 0.5], s1: 0.05 });
    }
    const m = muzzleWorld(v4).clone();
    const end = v3.copy(v1).addScaledVector(dir, maxT).clone();
    G.fx.tracer(m, end, d.col[0], 0.16, 0.25);
    G.fx.tracer(m, end, d.col[1], 0.4, 0.4);
    const n = Math.min(60, maxT | 0);
    for (let i = 0; i < n; i++) { v1.lerpVectors(m, end, i / n); G.fx.add.emit(v1.x, v1.y, v1.z, G.rand(-0.3, 0.3), G.rand(0, 0.6), G.rand(-0.3, 0.3), 0.5, 0.3, 0.05, CFIRE, CFIRE2, 0.6, 0, 0, 1); }
    if (w) { G.fx.explosion(end, 0.6, d.col[1]); G.fx.decal(end, 0x200800, 1.3, 0.9); }
    G.fx.flash(m, d.col[1], 10, 14, 0.25);
    flashVM(2.5);
    kick(d);
    G.audio.play(d.snd, null, 1);
    G.shake += 0.25;
  }
  function flamerTick(d, s, dt) {
    s.mag = Math.max(0, s.mag - 22 * dt);
    const m = muzzleWorld(v4);
    G.camera.getWorldDirection(v2);
    const P = G.player;
    for (let i = 0; i < 6; i++) {
      const sp = G.rand(13, 18);
      const dx = v2.x + G.rand(-0.09, 0.09), dy = v2.y + G.rand(-0.06, 0.08), dz = v2.z + G.rand(-0.09, 0.09);
      G.fx.add.emit(m.x, m.y, m.z, dx * sp + P.vel.x, dy * sp + 1, dz * sp + P.vel.z, G.rand(0.4, 0.7), G.rand(0.15, 0.3), G.rand(1.0, 1.8), CFIRE, CFIRE2, 0.9, 0, -2, 1.8);
    }
    if (Math.random() < 0.5) G.fx.smoke.emit(m.x + v2.x * 8, m.y + v2.y * 8 + 0.5, m.z + v2.z * 8, G.rand(-0.5, 0.5), 2, G.rand(-0.5, 0.5), 1.5, 0.8, 2.5, CSMK, CSMK, 0.35, 0, -0.5, 0.5);
    G.fx.flash(v1.copy(m).addScaledVector(v2, 3), 0xff6010, 5, 10, 0.08);
    A.flameAcc = (A.flameAcc || 0) + dt;
    if (A.flameAcc >= 0.07) {
      A.flameAcc = 0;
      G.camera.getWorldPosition(v1);
      for (const e of G.enemies.list) {
        if (e.dead || e.removed || e.team !== 'foe') continue;
        v3.subVectors(e.hitBody, v1);
        const dist = v3.length();
        if (dist > d.range + e.rBody) continue;
        v3.divideScalar(dist);
        if (v3.dot(v2) < Math.cos(0.32) - e.rBody / Math.max(1, dist)) continue;
        if (!G.world.los(v1, e.hitBody)) continue;
        const killed = e.damage(14, v3, { fire: 3, point: e.hitBody, silent: Math.random() < 0.7, mult: A.mult() });
        if (killed) A.hitmarker(false, true);
      }
    }
  }
  function meleeHit(d, dmg, range, arc, o) {
    G.camera.getWorldPosition(v1); G.camera.getWorldDirection(v2);
    let any = false;
    for (const e of G.enemies.list) {
      if (e.dead || e.removed || e.team !== 'foe') continue;
      v3.subVectors(e.hitBody, v1);
      const dist = v3.length() - e.rBody;
      if (dist > range) continue;
      v3.normalize();
      if (v3.dot(v2) < Math.cos(arc)) continue;
      const killed = e.damage(dmg, v2, Object.assign({ melee: true, point: e.hitBody, mult: A.mult() }, o));
      A.hitmarker(false, killed);
      any = true;
      for (let i = 0; i < 3; i++) G.fx.blood(e.hitBody, v4.copy(v2).add(v5.set(G.rand(-1, 1), G.rand(0, 1), G.rand(-1, 1))), G.enemies.FAC[e.t.fac].blood, 10);
      if (G.enemies.FAC[e.t.fac].metal) G.fx.sparks(e.hitBody, v2, 0xffd080, 20);
    }
    if (any) { G.audio.play(d.style === 'sword' || d.style === 'knife' ? 'chainHit' : 'armorHit', null, 1); G.shake += 0.15; A.revv = 1; }
    return any;
  }
  const STYLES = {
    sword: { dur: 0.42, heavyDur: 0.7, hit: 0.42, heavyHit: 0.5, combos: 3 },
    knife: { dur: 0.32, heavyDur: 0.5, hit: 0.4, heavyHit: 0.45, combos: 3 },
    hammer: { dur: 0.8, heavyDur: 1.0, hit: 0.5, heavyHit: 0.55, combos: 2 },
    claws: { dur: 0.26, heavyDur: 0.55, hit: 0.45, heavyHit: 0.5, combos: 2 },
    staff: { dur: 0.5, heavyDur: 0.6, hit: 0.45, heavyHit: 0.4, combos: 2 },
  };
  A.updateMelee = function (dt, d) {
    const I = G.input, P = G.player, st = STYLES[d.style];
    if (A.swing >= 0) {
      const prev = A.swing;
      A.swing += dt / (A.heavy ? st.heavyDur : st.dur);
      const hitAt = A.heavy ? st.heavyHit : st.hit;
      if (prev < hitAt && A.swing >= hitAt) {
        if (d.style === 'staff' && A.heavy) {
          G.camera.getWorldPosition(v1); G.camera.getWorldDirection(v2);
          const m = muzzleWorld(v4).clone();
          for (const e of G.enemies.list) {
            if (e.dead || e.removed || e.team !== 'foe') continue;
            v3.subVectors(e.hitBody, v1); const dist = v3.length(); if (dist > 9) continue;
            if (v3.normalize().dot(v2) < 0.6) continue;
            e.vel.addScaledVector(v3, 14);
            G.fx.lightning(m, e.hitBody, 0x80a0ff, 0.04);
            const killed = e.damage(140, v3.subVectors(e.hitBody, v1).normalize(), { stun: 1.5, explosive: true, mult: A.mult() }); A.hitmarker(false, killed);
          }
          G.fx.burst(G.fx.add, m, 50, { c0: 0xffffff, c1: 0x4080ff, sp: [4, 14], dir: v2, cone: 0.6, life: [0.2, 0.5], s0: [0.2, 0.5], s1: 0.02 });
          G.audio.play('plasmaBig', null, 0.8); G.shake += 0.2;
        } else {
          const dmg = A.heavy ? d.dmg * 2.2 : d.dmg;
          const hammer = d.style === 'hammer';
          const any = meleeHit(d, dmg, d.range + (A.heavy ? 0.6 : 0), A.heavy ? 0.9 : 1.0, { explosive: A.heavy || hammer, stun: hammer ? 1.2 : 0 });
          if (hammer && (any || A.heavy)) {
            G.camera.getWorldPosition(v1); G.camera.getWorldDirection(v2); v1.addScaledVector(v2, 2.5); v1.y = P.pos.y + 0.2;
            G.fx.explosion(v1, 0.9, 0x80b0ff, 0x30343a);
            G.fx.burst(G.fx.add, v1, 30, { c0: 0xffffff, c1: 0x6090ff, sp: [3, 10], life: [0.1, 0.3], s0: [0.05, 0.12], s1: 0.01 });
            G.enemies.radius(v1, 3.5, A.heavy ? 160 : 70, { stun: 1.5, mult: A.mult() });
            G.audio.play('explosion', null, 0.7); G.shake += 0.35;
          }
        }
      }
      if (prev < 0.15 && A.swing >= 0.15) G.audio.play('swing', null, 0.8);
      if (A.swing >= 1) { A.swing = -1; if (I.lmb) { A.combo = (A.combo + 1) % st.combos; A.swing = 0; A.heavy = false; } }
    } else if (I.lmbPressed || I.lmb) { A.swing = 0; A.heavy = false; A.combo = (A.combo + 1) % st.combos; }
    else if (I.rmbPressed && (P.onGround || d.style === 'staff')) {
      A.swing = 0; A.heavy = true;
      if (d.style !== 'staff') { G.camera.getWorldDirection(v2); v2.y = 0; v2.normalize(); P.vel.addScaledVector(v2, d.style === 'hammer' ? 12 : 16); }
      G.audio.play('swing', null, 1);
    }
  };

  /* ---------- class abilities (E) ---------- */
  A.useAbility = function () {
    const P = G.player, ab = A.cls.ability;
    if (A.abilityCD > 0 || P.dead) return;
    A.abilityCD = A.abilities[ab].cd;
    G.camera.getWorldPosition(v1); G.camera.getWorldDirection(v2);
    if (ab === 'orbital') {
      const w = G.world.ray(v1, v2, 250);
      const p = v1.clone().addScaledVector(v2, w ? w.t : 60); p.y = G.world.groundAt(p.x, p.z, p.y + 1);
      A.orbital = { p, t: 0 };
      A.ring.position.copy(p); A.ring.scale.setScalar(1); A.ring.visible = true; G.scene.add(A.ring);
      G.hud.banner('ORBITAL LANCE INBOUND', 1.4, '#ff6040'); G.audio.play('gaussCharge', p, 1);
    } else if (ab === 'jump') {
      v2.y = 0; v2.normalize();
      P.vel.addScaledVector(v2, 15); P.vel.y = 13; P.onGround = false; P.jumpSlam = true;
      G.fx.burst(G.fx.add, P.pos, 30, { c0: 0xffffff, c1: 0x60a0ff, sp: [2, 6], dir: v3.set(0, -1, 0), cone: 0.5, life: [0.2, 0.5], s0: [0.3, 0.6], s1: 0.02 });
      G.audio.play('missile', null, 1);
    } else if (ab === 'teleport') {
      v2.y = 0; v2.normalize();
      v3.copy(P.pos).setY(P.pos.y + 1);
      const w = G.world.ray(v3, v2, 18);
      const dist = w ? Math.max(0, w.t - 1.2) : 18;
      G.fx.burst(G.fx.add, v3, 40, { c0: 0xffffff, c1: 0x60a0ff, sp: [1, 6], life: [0.3, 0.7], s0: [0.1, 0.3], s1: 0.02, jit: 0.6 });
      P.pos.addScaledVector(v2, dist);
      G.world.collide(P.pos, 0.5, 2, 0.55);
      v3.copy(P.pos).setY(P.pos.y + 1);
      G.fx.burst(G.fx.add, v3, 60, { c0: 0xffffff, c1: 0x60a0ff, sp: [2, 9], life: [0.3, 0.8], s0: [0.15, 0.4], s1: 0.02, jit: 0.6 });
      G.fx.flash(v3, 0x80c0ff, 14, 14, 0.4);
      G.enemies.radius(v3, 5, 140, { stun: 1.2 });
      G.audio.play('spawnWarp', null, 1); G.shake += 0.4;
    } else if (ab === 'brace') {
      A.braceT = 8; G.hud.banner('BRACED', 1, '#c0b0ff'); G.audio.play('rack', null, 1);
    } else if (ab === 'storm') {
      v3.copy(P.pos).setY(P.pos.y + 1.2);
      const c = v3.clone();
      for (const e of G.enemies.list) {
        if (e.dead || e.removed || e.team !== 'foe') continue;
        if (e.hitBody.distanceTo(c) > 16) continue;
        G.fx.lightning(c, e.hitBody, 0xa0c0ff, 0.05);
        const killed = e.damage(160, v4.subVectors(e.hitBody, c).normalize(), { stun: 2, mult: A.mult() }); A.hitmarker(false, killed);
      }
      G.fx.burst(G.fx.add, c, 80, { c0: 0xffffff, c1: 0x5080ff, sp: [3, 12], life: [0.2, 0.6], s0: [0.1, 0.3], s1: 0.02 });
      G.audio.play('lightning', null, 1); G.audio.play('plasmaBig', null, 0.6); G.shake += 0.4;
    } else if (ab === 'faith') {
      P.invulnT = 4.5; P.armor = P.maxArmor; P.hp = Math.min(P.maxHp, P.hp + 25);
      G.hud.banner('ACT OF FAITH', 1.4, '#ffd060'); G.audio.play('bell', null, 1);
      G.fx.burst(G.fx.add, v3.copy(P.pos).setY(P.pos.y + 1), 60, { c0: 0xffffff, c1: 0xffc040, sp: [1, 6], life: [0.4, 1.0], s0: [0.1, 0.3], s1: 0.02, up: 2 });
    } else if (ab === 'squad') {
      G.game.gunshipDrop(P.pos.clone(), ['guardsman', 'guardsman', 'guardsman', 'guardsman']);
      G.hud.banner('VOX: SQUAD INBOUND', 1.4, '#c0d080');
    }
  };
  A.onLand = function () {
    const P = G.player;
    if (!P.jumpSlam) return;
    P.jumpSlam = false;
    v1.copy(P.pos).setY(P.pos.y + 0.3);
    G.fx.explosion(v1, 1.3, 0x80a0ff, 0x3a3632);
    G.enemies.radius(v1, 5.5, 180, { stun: 1.5 });
    G.audio.play('explosion', null, 1); G.shake += 0.5;
  };
  A.updateAbility = function (dt) {
    A.abilityCD = Math.max(0, A.abilityCD - dt);
    if (A.braceT > 0) A.braceT -= dt;
    const o = A.orbital;
    if (o) {
      o.t += dt;
      A.ring.scale.setScalar(1 - Math.min(0.9, o.t / 2.4) * 0.6); A.ring.rotation.y += dt * 3;
      if (Math.random() < 0.5) G.fx.add.emit(o.p.x + G.rand(-0.3, 0.3), o.p.y + G.rand(0, 40), o.p.z + G.rand(-0.3, 0.3), 0, -20, 0, 0.3, 0.3, 0.1, CFIRE, CFIRE2, 0.6, 0, 0, 0);
      if (o.t >= 2.4) {
        A.orbital = null; A.ring.visible = false; if (A.ring.parent) A.ring.parent.remove(A.ring);
        const top = o.p.clone().setY(o.p.y + 200);
        G.fx.tracer(top, o.p, 0xfff0c0, 1.2, 0.6);
        G.fx.tracer(top, o.p, 0xff6020, 3.0, 0.9);
        G.fx.explosion(v1.copy(o.p).setY(o.p.y + 0.5), 3.5, 0xff8030);
        G.fx.explosion(v1.copy(o.p).setY(o.p.y + 2), 2.5, 0xffd080);
        G.enemies.radius(o.p, 9, 900, {});
        const d = G.player.pos.distanceTo(o.p); if (d < 7) G.player.hurt((7 - d) * 10, o.p, 'blast');
        G.audio.play('explosion', o.p, 1.5); G.audio.play('plasmaBig', o.p, 1); G.shake += 1;
      }
    }
  };

  A.update = function (dt) {
    const I = G.input, P = G.player;
    let d = A.defs[A.cur], s = A.st[A.cur], vm = A.vm[A.cur];
    A.order.forEach((k, i) => { if (I.pressed['Digit' + (i + 1)]) A.select(k); });
    if (I.wheel) { const i = A.order.indexOf(A.next || A.cur); A.select(A.order[(i + (I.wheel > 0 ? 1 : -1) + A.order.length) % A.order.length]); }
    if (I.pressed.KeyR) A.startReload();
    if (I.pressed.KeyE) A.useAbility();
    A.updateAbility(dt);
    if (A.next) {
      A.switchT += dt / 0.45;
      if (A.switchT >= 0.5 && A.cur !== A.next) {
        vm.root.visible = false; if (vm.leftClaw) vm.leftClaw.visible = vm.leftFore.visible = false;
        A.cur = A.next;
        d = A.defs[A.cur]; s = A.st[A.cur]; vm = A.vm[A.cur]; vm.root.visible = true; A.spin = 0;
        G.audio.play('rack', null, 0.5);
      }
      if (A.switchT >= 1) { A.next = null; A.switchT = 0; }
    }
    A.fireCD -= dt;
    const canAds = d.type !== 'melee' && d.type !== 'smite' && !P.sprinting && A.reloadT < 0 && !A.next;
    A.adsK = G.damp(A.adsK, I.rmb && canAds ? 1 : 0, 14, dt);
    A.zoom = d.zoom || 0.28;
    for (const k of A.order) {
      const st = A.st[k], t = A.defs[k].type;
      if (t === 'heat' || t === 'smite') {
        if (st.lock > 0) { st.lock -= dt; st.heat = Math.max(0, st.heat - dt * 60); }
        else if ((st.cool -= dt) <= 0) st.heat = Math.max(0, st.heat - dt * 28);
      }
    }
    const busy = A.next || A.reloadT >= 0 || P.dead;
    if (I.pressed.KeyG || I.pressed.KeyQ) {
      if (A.grenades > 0 && A.nadeT < 0 && !P.dead) {
        A.grenades--; A.nadeT = 0;
        aimRay(v1, v2); v1.addScaledVector(v2, 0.6);
        S.spawnPlayer('nade', v1, v2.multiplyScalar(19).add(v3.set(0, 4, 0)).add(P.vel), { grav: 18 });
        G.audio.play('swing', null, 0.5);
      }
    }
    if (A.nadeT >= 0) { A.nadeT += dt / 0.5; if (A.nadeT >= 1) A.nadeT = -1; }

    let flaming = false;
    const blocked = P.sprinting && d.type !== 'melee';
    if (d.spin) A.spin = G.clamp(A.spin + (I.lmb && !busy && !blocked ? dt * 2 : -dt * 1.2), 0, 1);
    if (!busy && P.canAct) {
      if (d.type === 'melee') A.updateMelee(dt, d);
      else if (d.type === 'stream') {
        if (I.lmb && s.mag > 0 && !blocked) { flaming = true; flamerTick(d, s, dt); }
        else if (I.lmbPressed && s.mag <= 0) { G.audio.play('empty'); A.startReload(); }
      } else if (d.type === 'heat' || d.type === 'smite') {
        if (s.lock > 0) A.charge = -1;
        else if (I.lmb && !blocked) {
          if (A.charge < 0 && A.fireCD <= 0) A.charge = 0;
          else if (A.charge >= 0) { A.charge += dt; if (A.charge > 0.25 && !A.chargeSnd) { A.chargeSnd = true; G.audio.play('charge', null, 0.5); } }
        } else if (A.charge >= 0) {
          (d.type === 'smite' ? fireSmite : fireHeat)(d, s, A.charge > 0.85);
          A.charge = -1; A.chargeSnd = false;
        }
      } else if (d.type === 'beam') {
        if (A.beamWind >= 0) { A.beamWind += dt; if (A.beamWind >= d.windup) { A.beamWind = -1; fireBeam(d, s); } }
        else if (I.lmbPressed && A.fireCD <= 0 && !blocked) {
          if (s.mag > 0) { A.beamWind = 0; G.audio.play('charge', null, 0.4); }
          else { G.audio.play('empty'); A.startReload(); }
        }
        if (d.mag === 1 && s.mag === 0 && s.reserve > 0 && A.fireCD <= 0 && A.beamWind < 0) A.startReload();
      } else {
        const want = d.auto ? I.lmb : I.lmbPressed;
        if (want && A.fireCD <= 0 && !blocked && (!d.spin || A.spin > 0.65)) (d.type === 'hitscan' ? fireHitscan : fireProj)(d, s);
        if (d.mag === 1 && s.mag === 0 && s.reserve > 0 && A.fireCD <= 0) A.startReload();
      }
    }
    if (flaming && !A.flameLoop) A.flameLoop = G.audio.loop('flamer');
    if (A.flameLoop) A.flameLoop.set(flaming ? 1 : 0, flaming ? 0.55 : 0);
    if (!flaming && A.flameLoop && A.flaming) { A.flameLoop.stop(); A.flameLoop = null; }
    A.flaming = flaming;
    const sword = d.type === 'melee' && d.style === 'sword' && !A.next;
    const spinning = d.spin && A.spin > 0.05;
    if ((sword || spinning) && !A.chainLoop) A.chainLoop = G.audio.loop('chain');
    if (!(sword || spinning) && A.chainLoop) { A.chainLoop.stop(); A.chainLoop = null; }
    A.revv = G.damp(A.revv, (A.swing >= 0) ? 1 : 0.15, 6, dt);
    if (A.chainLoop) { if (spinning) A.chainLoop.set(A.spin * 1.2, A.spin * 0.12); else A.chainLoop.set(A.revv, 0.08 + A.revv * 0.14); }

    if (A.reloadT >= 0) {
      const prev = A.reloadT;
      A.reloadT += dt / d.reload;
      const cross = x => prev < x && A.reloadT >= x;
      if (cross(0.18)) G.audio.play('magout', null, 0.7);
      if (cross(0.62)) G.audio.play('magin', null, 0.8);
      if (cross(0.8)) { G.audio.play('rack', null, 0.8); A.recoil.vrx += 1.5; }
      if (A.reloadT >= 1) {
        const take = Math.min(d.mag - s.mag, s.reserve);
        s.mag += take; s.reserve -= take; A.reloadT = -1;
      }
    }
    if (A.ventT >= 0) { A.ventT += dt / 1.6; if (A.ventT >= 1) A.ventT = -1; }
    A.animate(dt);
  };

  /* ---------- viewmodel pose ---------- */
  const base = { x: 0.3, y: -0.3, z: -0.72 };
  const MELEE_POSE = {
    sword: [0.26, -0.3, -0.55, 0.85, -0.15, -0.25], knife: [0.24, -0.28, -0.5, 0.5, -0.2, -0.3],
    hammer: [0.26, -0.32, -0.55, 1.1, -0.1, -0.2], claws: [0.24, -0.3, -0.5, 0.15, 0.05, -0.1], staff: [0.2, -0.32, -0.55, 0.9, 0.25, -0.1],
  };
  function meleeAnim(style, sw, combo, heavy, p) {
    const c = heavy ? 'h' : combo;
    if (style === 'claws') {
      const right = c === 'h' || combo === 0;
      if (right) { p[0] += G.kf(sw, [[0, 0], [0.3, 0.12], [0.55, -0.4], [1, 0]]); p[4] += G.kf(sw, [[0, 0], [0.3, -0.6], [0.55, 1.0], [1, 0]]); p[1] += G.kf(sw, [[0, 0], [0.3, 0.12], [0.55, -0.1], [1, 0]]); }
      return right;
    }
    if (style === 'hammer') {
      if (c === 1) { p[0] += G.kf(sw, [[0, 0], [0.35, 0.25], [0.55, -0.45], [1, 0]]); p[4] += G.kf(sw, [[0, 0], [0.35, -1.2], [0.55, 1.3], [1, 0]]); p[3] += G.kf(sw, [[0, 0], [0.35, 0.2], [0.55, -0.5], [1, 0]]); }
      else { p[1] += G.kf(sw, [[0, 0], [0.38, 0.3], [0.52, -0.3], [0.7, -0.3], [1, 0]]); p[3] += G.kf(sw, [[0, 0], [0.38, 1.3], [0.52, -1.0], [0.7, -1.0], [1, 0]]); p[0] -= G.kf(sw, [[0, 0], [0.38, 0.12], [0.52, 0.2], [1, 0]]); }
      return true;
    }
    if (style === 'staff') {
      if (c === 'h') { p[2] += G.kf(sw, [[0, 0], [0.3, 0.12], [0.45, -0.25], [1, 0]]); p[3] += G.kf(sw, [[0, 0], [0.3, 0.3], [0.45, -0.6], [1, 0]]); p[0] -= G.kf(sw, [[0, 0], [0.45, 0.2], [1, 0]]); return true; }
      const s = c === 0 ? 1 : -1;
      p[0] += G.kf(sw, [[0, 0], [0.3, 0.2 * s], [0.55, -0.4 * s], [1, 0]]); p[4] += G.kf(sw, [[0, 0], [0.3, -0.9 * s], [0.55, 1.2 * s], [1, 0]]); p[5] += G.kf(sw, [[0, 0], [0.3, -0.6 * s], [0.55, 0.6 * s], [1, 0]]);
      return true;
    }
    if (c === 0) {
      p[0] += G.kf(sw, [[0, 0], [0.25, 0.15], [0.55, -0.45], [1, 0]]); p[1] += G.kf(sw, [[0, 0], [0.25, 0.1], [0.55, -0.05], [1, 0]]);
      p[4] += G.kf(sw, [[0, 0], [0.25, -0.9], [0.55, 1.4], [1, 0]]); p[5] += G.kf(sw, [[0, 0], [0.25, -0.9], [0.55, 0.6], [1, 0]]); p[3] += G.kf(sw, [[0, 0], [0.25, 0.2], [0.55, -0.6], [1, 0]]);
    } else if (c === 1) {
      p[0] += G.kf(sw, [[0, 0], [0.25, -0.4], [0.55, 0.25], [1, 0]]); p[4] += G.kf(sw, [[0, 0], [0.25, 1.2], [0.55, -1.2], [1, 0]]);
      p[5] += G.kf(sw, [[0, 0], [0.25, 0.9], [0.55, -0.6], [1, 0]]); p[3] += G.kf(sw, [[0, 0], [0.25, 0.1], [0.55, -0.7], [1, 0]]);
    } else {
      p[1] += G.kf(sw, [[0, 0], [0.3, 0.22], [0.55, -0.25], [1, 0]]); p[0] += G.kf(sw, [[0, 0], [0.3, -0.15], [0.55, -0.2], [1, 0]]);
      p[3] += G.kf(sw, [[0, 0], [0.3, 0.9], [0.55, -1.3], [1, 0]]); p[5] += G.kf(sw, [[0, 0], [0.3, 0.3], [0.55, 0.1], [1, 0]]);
    }
    return true;
  }
  A.animate = function (dt) {
    const P = G.player, I = G.input, d = A.defs[A.cur], vm = A.vm[A.cur], s = A.st[A.cur];
    const R = A.recoil;
    R.vz += (-R.z * 220 - R.vz * 20) * dt; R.z += R.vz * dt;
    R.vrx += (-R.rx * 200 - R.vrx * 18) * dt; R.rx += R.vrx * dt;
    R.ry *= Math.exp(-dt * 10);
    A.sway.x = G.damp(A.sway.x, G.clamp(-I.mdx * 0.0015, -0.08, 0.08), 10, dt);
    A.sway.y = G.damp(A.sway.y, G.clamp(I.mdy * 0.0015, -0.08, 0.08), 10, dt);
    const ads = A.adsK, hip = 1 - ads;
    const scoped = !!vm.scope && ads > 0.85;
    const bob = P.bobPhase, ba = P.moveAmt * (P.onGround ? 1 : 0.2) * (0.25 + hip * 0.75);
    const spr = P.sprintK;
    const melee = d.type === 'melee';
    const p = [base.x * hip + (vm.adsX || 0) * ads, base.y * hip + (vm.adsY || -0.2) * ads, base.z * hip - 0.42 * ads, 0.03 * hip, 0.17 * hip, 0.04 * hip];
    if (vm.oneHand && !melee) { p[0] = 0.22 * hip; p[1] = -0.26 * hip + (vm.adsY || -0.13) * ads; p[2] = -0.6 * hip - 0.4 * ads; }
    if (melee) { const mp = MELEE_POSE[d.style]; for (let i = 0; i < 6; i++) p[i] = mp[i]; }
    p[0] += Math.sin(bob) * 0.014 * ba + A.sway.x * hip;
    p[1] += -Math.abs(Math.cos(bob)) * 0.016 * ba + A.sway.y * hip + Math.sin(G.t * 1.6) * 0.003 * hip;
    p[5] += Math.sin(bob) * 0.02 * ba + A.sway.x * 1.5;
    p[3] += A.sway.y * 0.8;
    p[0] += spr * 0.04; p[1] -= spr * 0.07; p[3] -= spr * 0.3; p[4] += spr * 0.6; p[5] += spr * 0.15;
    p[1] -= P.landDip * 0.08; p[3] -= P.landDip * 0.1;
    p[2] += R.z * (1 - ads * 0.5); p[3] += R.rx * 0.6; p[4] += R.ry;
    if (A.next) { const k = Math.sin(A.switchT * Math.PI); p[1] -= k * 0.45; p[3] -= k * 0.8; p[5] += k * 0.3; }
    if (A.nadeT >= 0) { const k = Math.sin(A.nadeT * Math.PI); p[1] -= k * 0.25; p[5] += k * 0.5; }
    let magOff = null, leftT = null;
    if (A.reloadT >= 0) {
      const t = A.reloadT;
      p[5] += G.kf(t, [[0, 0], [0.15, 0.55], [0.82, 0.55], [0.9, 0.1], [1, 0]]);
      p[3] += G.kf(t, [[0, 0], [0.15, 0.25], [0.6, 0.2], [0.66, 0.3], [0.8, 0.2], [0.85, 0.35], [1, 0]]);
      p[0] -= G.kf(t, [[0, 0], [0.15, 0.06], [0.85, 0.06], [1, 0]]);
      p[1] += G.kf(t, [[0, 0], [0.15, 0.04], [0.85, 0.04], [1, 0]]);
      if (vm.mag) {
        const my = G.kf(t, [[0, 0], [0.15, 0], [0.3, -0.45], [0.31, -0.6], [0.45, -0.3], [0.58, -0.08], [0.64, 0], [1, 0]]);
        const mx = G.kf(t, [[0, 0], [0.3, 0.0], [0.31, -0.2], [0.5, -0.05], [0.6, 0], [1, 0]]);
        magOff = v3.set(mx, my, 0);
        leftT = G.kf(t, [[0, 0], [0.12, 1], [0.72, 1], [0.85, 0]]);
      }
    }
    if (A.ventT >= 0) { const k = Math.sin(A.ventT * Math.PI); p[5] += k * 0.6; p[3] += k * 0.3; }
    let rightSwing = true;
    if (melee && A.swing >= 0) rightSwing = meleeAnim(d.style, A.swing, A.combo, A.heavy, p);
    if (melee && d.style === 'sword') { vm.updateChain(dt, 0.4 + A.revv * 4); if (A.revv > 0.5 && Math.random() < 0.3) { toWorld(vm.muzzle, v1); G.fx.sparks(v1, v2.set(0, 1, 0), 0xffc060, 1); } }
    if (vm.arcs) vm.arcs.forEach(a => { a.rotation.set(Math.random() * 6, Math.random() * 6, 0); a.visible = Math.random() < (A.swing >= 0 || A.charge >= 0 ? 0.9 : 0.4); });
    if (vm.coilMat) {
      const ch = A.charge >= 0 ? Math.min(1, A.charge / 0.85) : 0;
      vm.coilMat.emissiveIntensity = 0.8 + s.heat / 40 + ch * 3;
      vm.coilMat.emissive.setRGB(0.2 + s.heat / 120, 0.6 - s.heat / 300, 1);
      vm.rings.forEach((r, i) => { r.rotation.z += dt * (1 + ch * 12); r.scale.setScalar(1 + ch * 0.12 * Math.sin(G.t * 40 + i)); });
      const vent = s.lock > 0 ? 1 : 0;
      vm.vents.forEach(o => { o.v.position.x = G.damp(o.v.position.x, o.sd * ((o.base || 0.065) + vent * 0.03), 10, dt); });
      if (vent && Math.random() < 0.6) { toWorld(vm.vents[Math.random() < 0.5 ? 0 : 1].v, v1); G.fx.smoke.emit(v1.x, v1.y, v1.z, G.rand(-0.5, 0.5), 1.5, G.rand(-0.5, 0.5), 0.8, 0.05, 0.4, CSTEAM, CSTEAM, 0.4, 0, -1, 1); }
      p[0] += (Math.random() - 0.5) * 0.004 * ch; p[1] += (Math.random() - 0.5) * 0.004 * ch;
    }
    if (vm.orb) {
      const ch = A.charge >= 0 ? Math.min(1, A.charge / 0.85) : 0;
      vm.orb.scale.setScalar(1 + ch * 1.5 + Math.sin(G.t * 20) * 0.1);
      if (vm.halo) vm.halo.scale.setScalar(0.2 + ch * 0.4 + s.heat / 300);
      if (vm.psychic && Math.random() < 0.3 + ch) { toWorld(vm.muzzle, v1); G.fx.add.emit(v1.x, v1.y, v1.z, G.rand(-0.3, 0.3), G.rand(0, 0.6), G.rand(-0.3, 0.3), 0.3, 0.06, 0.01, CBLUE, CWARP2, 0.9, 0, 0, 1); }
    }
    if (vm.heatMat) {
      vm.heatMat.emissiveIntensity = G.damp(vm.heatMat.emissiveIntensity, A.beamWind >= 0 ? 3 : A.fireCD > 0 ? 1.5 : 0.25, 5, dt);
      if (A.beamWind >= 0) { p[0] += (Math.random() - 0.5) * 0.006; p[1] += (Math.random() - 0.5) * 0.006; }
    }
    if (vm.spinner) { vm.spinner.rotation.z += dt * A.spin * 40; if (A.spin > 0.65 && I.lmb) { p[0] += (Math.random() - 0.5) * 0.006; p[1] += (Math.random() - 0.5) * 0.006; } }
    if (vm.pilot) { vm.pilot.scale.setScalar(0.05 + Math.random() * 0.025 + (A.flaming ? 0.08 : 0)); if (A.flaming) { p[0] += (Math.random() - 0.5) * 0.004; p[1] += (Math.random() - 0.5) * 0.004; } }
    if (vm.counter) vm.counter.material.color.setHSL(s.mag / (d.mag || 30) * 0.33, 1, 0.5);
    if (A.braceT > 0) { p[1] -= 0.03; p[2] += 0.05; }
    vm.root.position.set(p[0], p[1], p[2]);
    vm.root.rotation.set(p[3], p[4], p[5]);
    vm.root.visible = !scoped;
    if (vm.mag) vm.mag.position.copy(vm.magHome).add(magOff || v4.set(0, 0, 0));
    vm.root.updateMatrixWorld(true);
    const lh = A.handL;
    lh.visible = !!vm.leftGrip && !scoped;
    if (vm.leftGrip && !scoped) {
      const grip = v1.copy(vm.leftGrip).applyMatrix4(vm.root.matrixWorld);
      if (leftT && vm.mag) { vm.mag.getWorldPosition(v2); v2.y -= 0.05; grip.lerp(v2, leftT); }
      lh.position.copy(grip);
      lh.quaternion.copy(vm.root.quaternion);
      lh.rotateZ(Math.PI / 2 * 0.8); lh.rotateY(0.2);
      lh.updateMatrixWorld(true);
      A.wristL.getWorldPosition(v2);
      G.models.span(A.foreL, v2, v3.set(-0.3, -0.5, 0.15), 0.045);
      A.foreL.visible = true;
    } else A.foreL.visible = false;
    if (vm.leftClaw) {
      const lc = vm.leftClaw; lc.visible = vm.leftFore.visible = true;
      const q = [-0.2, -0.24, -0.4, 0.12, -0.05, 0.1];
      if (A.swing >= 0 && (!rightSwing || A.heavy)) { const sw = A.swing; q[0] += G.kf(sw, [[0, 0], [0.3, -0.12], [0.55, 0.4], [1, 0]]); q[4] += G.kf(sw, [[0, 0], [0.3, 0.6], [0.55, -1.0], [1, 0]]); q[1] += G.kf(sw, [[0, 0], [0.3, 0.12], [0.55, -0.1], [1, 0]]); }
      q[0] += Math.sin(bob) * 0.014 * ba; q[1] += -Math.abs(Math.cos(bob)) * 0.016 * ba;
      if (A.next) { const k = Math.sin(A.switchT * Math.PI); q[1] -= k * 0.45; }
      lc.position.set(q[0], q[1], q[2]); lc.rotation.set(q[3], q[4], q[5]); lc.updateMatrixWorld(true);
      lc.children[0].getWorldPosition(v2); v2.z += 0.07;
      G.models.span(vm.leftFore, v2, v3.set(-0.3, -0.5, 0.15), 0.048);
    }
    vm.wrist.getWorldPosition(v2);
    G.models.span(A.foreR, v2, v3.set(0.34, -0.5, 0.15), 0.048);
    A.foreR.visible = !scoped;
    if (A.flashT > 0) { A.flashT -= dt; if (A.flashT <= 0) vm.flashSprite.visible = false; }
    G.vmFlash.intensity = G.damp(G.vmFlash.intensity, A.flaming ? 2 + Math.random() * 2 : 0, 20, dt);
    if (A.flaming) G.vmFlash.color.set(0xff7020);
    if (A.scopedShown !== scoped) { A.scopedShown = scoped; document.body.classList.toggle('scoped', scoped); }
  };
})();
