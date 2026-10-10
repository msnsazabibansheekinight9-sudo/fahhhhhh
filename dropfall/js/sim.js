// Dropfall — simulation core: mission state, divers, weapons, damage, explosions.
'use strict';
(function () {
  const U = DF.U, A = DF.Audio, W = DF.WORLD;
  const S = DF.Sim = {};
  let G = null;
  S.get = () => G;
  const tmp = [], tmp2 = [];

  // ---------------------------------------------------------------- setup
  S.start = function (opts) {
    const M = opts.M || DF.World.generate(opts);
    if (!M.groundTile) DF.World.buildGround(M);
    const save = opts.save || {};
    const mods = new Set(save.modules || []);
    const booster = opts.loadout.booster;
    G = DF.G = {
      M, opts, t: 0, timeLeft: 25 * 60, mods, booster,
      divers: [], enemies: [], projs: [], parts: [], flashes: [], areas: [], throws: [], beacons: [], pods: [],
      sentries: [], mines: [], vehicles: [], items: [], colonists: [], events: [], msgs: [], calls: [], lasers: [],
      flyovers: [], beams: [], tornadoes: [], telegraphs: [], dropships: [], novas: [],
      ehash: new U.Hash(80), cs: {}, code: '', menu: false, ready: null, codeTask: null,
      stats: { kills: 0, killsByTier: [0, 0, 0, 0], shots: 0, hits: 0, deaths: 0, tk: 0, samples: { c: 0, r: 0, s: 0 }, shards: 0, medals: 0, credits: 0, outposts: 0, side: 0, callins: 0, biggest: null },
      lives: 0, shake: 0, cam: { x: 0, y: 0, z: 1 }, vis: 1, storm: 0, ion: false, ended: false, result: null,
      patrolT: 40, waveT: 0, callCd: 0, hitMark: 0, hitKind: '', dmgFlash: 0, revealed: false, nextId: 1, respawnT: 0, pendingRespawn: false,
      focus: null, lastNoise: 0
    };
    G.lives = 6 + (opts.bots || 0) * 2 + (mods.has('c1') ? 1 : 0) + (booster === 'b_reinf' ? 3 : 0);
    // call-in state
    const ids = [...opts.loadout.callins.filter(Boolean), ...DF.MISSION_CALLINS];
    for (const id of ids) {
      const d = DF.CALLINS[id];
      let uses = d.uses || Infinity;
      if (d.cat === 'air' && mods.has('h2')) uses += 1;
      G.cs[id] = { id, d, cd: id === 'nova' ? 0 : 0, uses, maxUses: uses, rearm: 0 };
    }
    // drop position
    const drop = opts.drop || { x: U.rand(600, W - 600), y: U.rand(600, W - 600) };
    const dp = S.freeSpot(drop.x, drop.y, 20);
    // player
    const lo = opts.loadout;
    const P = S.makeDiver(dp.x, dp.y, { name: save.name || 'You', isPlayer: true, armor: lo.armor, cape: lo.cape, primary: lo.primary, secondary: lo.secondary, grenade: lo.grenade });
    G.player = P; G.divers.push(P);
    const botNames = ['Kestrel', 'Morrow', 'Vasquez', 'Ito', 'Okafor', 'Lindqvist'];
    const botArmors = ['a_recruit', 'a_bulwark', 'a_lifeline', 'a_sapper', 'a_scout', 'a_longarm'];
    const botPrimaries = ['ar7', 'br23', 'sg4', 'ar61', 'mr2', 'smg12', 'ar7p'];
    const capes = Object.keys(DF.CAPES).filter(c => c !== 'c_none');
    for (let i = 0; i < (opts.bots || 0); i++) {
      const p = S.freeSpot(dp.x + U.rand(-60, 60), dp.y + U.rand(-60, 60), 20);
      const b = S.makeDiver(p.x, p.y, { name: botNames[i], bot: true, armor: botArmors[i % botArmors.length], cape: U.pick(capes), primary: U.pick(botPrimaries), secondary: 'p2', grenade: 'g_frag' });
      b.slot = i; G.divers.push(b);
    }
    // everyone arrives by drop pod
    for (const d of G.divers) { d.alive = false; d.arriving = true; S.pod(d.x, d.y, { kind: 'diver', diver: d }, 2.2 + Math.random() * 0.6, true); }
    // starting enemy population
    S.populate();
    // hazards
    if (M.hazard === 'firestorm') for (let i = 0; i < 3; i++) G.tornadoes.push({ x: U.rand(400, W - 400), y: U.rand(400, W - 400), a: Math.random() * 6.28, t: 0 });
    if (booster === 'b_radar') S.reveal();
    S.msg('Drop pods away. ' + DF.World.missionName(opts.type, M.faction) + ' on ' + M.planet.name + '.', '#e8e2c8', 5);
    return G;
  };

  S.freeSpot = function (x, y, r) {
    for (let i = 0; i < 60; i++) {
      const px = U.clamp(x + (i ? U.rand(-i * 8, i * 8) : 0), 60, W - 60), py = U.clamp(y + (i ? U.rand(-i * 8, i * 8) : 0), 60, W - 60);
      const near = G.M.grid.query(px - r, py - r, px + r, py + r, tmp);
      let ok = true;
      for (const o of near) if (o.block && U.pointInObs(px, py, o, r)) { ok = false; break; }
      if (ok) return { x: px, y: py };
    }
    return { x, y };
  };

  S.makeWeapon = function (id, extraMags) {
    if (!id) return null;
    const d = DF.WEAPONS[id];
    return { id, d, mag: d.mag || 1, spare: (d.mags || 0) + (extraMags || 0), reloadT: 0, cd: 0, heat: 0, over: false, charge: 0, cool: 0, bloom: 0 };
  };

  S.makeDiver = function (x, y, cfg) {
    const arm = DF.ARMORS[cfg.armor] || DF.ARMORS.a_recruit, cls = DF.ARMOR_CLASS[arm.cls], passive = arm.passive;
    const mods = G.mods, bo = G.booster;
    const gdef = DF.GRENADES[cfg.grenade] || DF.GRENADES.g_frag;
    const extra = passive === 'siege' ? 1 : 0;
    const d = {
      id: G.nextId++, kind: 'diver', name: cfg.name, isPlayer: !!cfg.isPlayer, bot: !!cfg.bot, x, y, vx: 0, vy: 0, ang: 0, r: 11,
      armorId: cfg.armor, arm, cls, passive, capeId: cfg.cape, loadout: cfg,
      maxhp: 150, hp: 150, alive: true, stam: 100, maxStam: 100 * cls.stamina * (passive === 'athlete' ? 1.5 : 1) * (mods.has('c2') ? 1.2 : 1) * (bo === 'b_stamina' ? 1.3 : 1),
      stamDelay: 0, weapons: [], cur: 0, gdef, gid: cfg.grenade, maxNades: gdef.count + (passive === 'padded' || passive === 'engineer' ? 2 : 0),
      maxStims: 4 + (passive === 'padded' ? 2 : 0) + (passive === 'medic' ? 2 : 0) + (mods.has('e3') ? 1 : 0),
      stimT: 0, stunT: 0, slowT: 0, burnT: 0, diveT: 0, proneT: 0, invuln: 0, resolveCd: 0, pack: null, carrying: null, veh: null,
      walk: 0, capeSwing: 0, flash: 0, throwCd: 0, nadeCd: 0, slot: 0, ai: { t: 0, target: null, strafe: Math.random() < 0.5 ? 1 : -1, nadeT: 5 }
    };
    d.weapons = [S.makeWeapon(cfg.primary, extra + (mods.has('e2') ? 1 : 0)), S.makeWeapon(cfg.secondary, extra), null];
    d.nades = d.maxNades; d.stims = d.maxStims + (bo === 'b_stims' ? 2 : 0);
    return d;
  };

  S.msg = function (text, col, dur) { G.msgs.push({ text, col: col || '#e8e2c8', t: dur || 3.5, T: dur || 3.5 }); if (G.msgs.length > 5) G.msgs.shift(); };
  S.at = function (delay, fn) { G.events.push({ t: G.t + delay, fn }); };

  S.reveal = function () { G.revealed = true; for (const p of G.M.pois) p.found = true; };

  // ---------------------------------------------------------------- particles & fx
  S.part = function (x, y, vx, vy, life, size, col, opt) {
    if (G.parts.length > 1400) return;
    G.parts.push({ x, y, vx, vy, life, T: life, size, col, drag: opt && opt.drag != null ? opt.drag : 2, grow: opt && opt.grow || 0, glow: opt && opt.glow, z: opt && opt.z || 0, kind: opt && opt.kind });
  };
  S.burst = function (x, y, n, col, speed, life, size, opt) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = speed * (0.3 + Math.random() * 0.7); S.part(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), col, opt); }
  };
  S.decal = function (x, y, r, col, a) {
    const c = G.M.decalCtx; c.globalAlpha = a == null ? 0.5 : a; c.fillStyle = col;
    c.beginPath(); c.arc(x / 4, y / 4, Math.max(1, r / 4), 0, 6.283); c.fill(); c.globalAlpha = 1;
  };
  S.shakeAt = function (x, y, amt) {
    const P = G.player, d = Math.hypot(P.x - x, P.y - y);
    G.shake = Math.min(18, G.shake + amt * Math.max(0, 1 - d / 900));
  };
  S.noise = function (x, y, r) {
    // alert enemies within earshot
    const near = G.ehash.query(x, y, r, tmp2);
    for (const e of near) if (!e.dead && e.state !== 'hunt' && U.dist2(e.x, e.y, x, y) < r * r) { e.state = 'hunt'; e.lastKnown = { x, y }; e.alertT = 0; if (e.outpost) e.outpost.alert = true; }
    for (const op of G.M.outposts) if (!op.cleared && U.dist2(op.x, op.y, x, y) < (r + op.r) ** 2) op.alert = true;
  };

  // ---------------------------------------------------------------- explosions
  // o: { closes, fire, stun, acid, big, col, src, noDecal, friendly }
  S.boom = function (x, y, r, dmg, pen, o) {
    o = o || {};
    const big = r >= 90 || o.big;
    G.flashes.push({ x, y, r: r * 1.6, t: 0.25, T: 0.25, col: o.col || '#ffd27a' });
    S.burst(x, y, Math.min(40, 8 + r / 3), o.acid ? '#b6ef4a' : o.col || '#ffb347', r * 3, 0.35, r / 6, { glow: true });
    S.burst(x, y, Math.min(30, 6 + r / 4), 'rgba(60,55,50,0.6)', r * 1.6, 1.4, r / 4, { grow: r / 3, drag: 3, kind: 'smoke' });
    if (!o.noDecal) S.decal(x, y, r * 0.7, o.acid ? '#5c7a1c' : '#1e1a17', 0.35);
    A.play(big ? 'bigboom' : 'boom', Math.hypot(G.player.x - x, G.player.y - y));
    S.shakeAt(x, y, big ? 14 : 6 + r / 15);
    S.noise(x, y, Math.max(450, r * 6));
    const near = G.ehash.query(x, y, r + 60, tmp);
    for (const e of near) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y) - e.r * 0.6;
      if (d > r) continue;
      const f = d < r * 0.35 ? 1 : 1 - (d - r * 0.35) / (r * 0.65) * 0.7;
      if (dmg > 0) S.dmgEnemy(e, dmg * f, pen, null, { explosive: true, src: o.src });
      if (o.stun) e.stunT = Math.max(e.stunT, o.stun);
      if (dmg > 0 && e.def.tier <= 1 && !e.dead) { const a = Math.atan2(e.y - y, e.x - x); e.kx = (e.kx || 0) + Math.cos(a) * 240 * f; e.ky = (e.ky || 0) + Math.sin(a) * 240 * f; }
    }
    if (dmg > 0) {
      for (const d of G.divers) {
        if (!d.alive || d.veh) continue;
        const dd = Math.hypot(d.x - x, d.y - y);
        if (dd > r + d.r) continue;
        const f = dd < r * 0.35 ? 1 : 1 - (dd - r * 0.35) / (r * 0.65) * 0.75;
        S.dmgDiver(d, dmg * f * 0.5, 'explosive', o.src);
        if (d.alive) { const a = Math.atan2(d.y - y, d.x - x); d.vx += Math.cos(a) * 280 * f; d.vy += Math.sin(a) * 280 * f; if (f > 0.6) d.proneT = 0.5; }
      }
      for (const v of G.vehicles) if (v.alive && Math.hypot(v.x - x, v.y - y) < r + v.r) S.dmgVehicle(v, dmg * 0.6, pen, 'explosive');
      for (const s of G.sentries) if (s.alive && Math.hypot(s.x - x, s.y - y) < r + 14) S.dmgSentry(s, dmg * 0.5);
      for (const c of G.colonists) if (c.alive && Math.hypot(c.x - x, c.y - y) < r) S.dmgColonist(c, dmg * 0.5);
      for (const st of G.M.structs) {
        if (!st.alive) continue;
        const dd = Math.hypot(st.x - x, st.y - y);
        if (st.type === 'spawner' && o.closes !== false && pen >= 3 && dd < r * 0.65 + st.r) S.closeSpawner(st);
        else if (st.hp != null && dd < r + st.r) S.dmgStruct(st, dmg, pen);
      }
      for (const m of G.mines) if (m.alive && m.armed && Math.hypot(m.x - x, m.y - y) < r * 0.6) S.at(0.08 + Math.random() * 0.12, () => S.mineGo(m));
    }
    if (o.fire) S.area('fire', x, y, o.fire.r || r, o.fire.t || 8);
  };

  S.area = function (kind, x, y, r, t, extra) {
    const a = Object.assign({ kind, x, y, r, t, T: t, tick: 0 }, extra || {});
    G.areas.push(a); return a;
  };

  // ---------------------------------------------------------------- damage
  // returns 'kill' | 'hit' | 'glance' | 'bounce' | 'shield'
  S.dmgEnemy = function (e, amt, pen, dir, o) {
    if (e.dead) return null;
    o = o || {};
    const d = e.def;
    if (e.shield > 0 && !o.ignoreShield) {
      const mult = o.energy ? 2 : 1;
      e.shield -= amt * mult; e.shieldDelay = 3; e.shieldHit = 0.15;
      A.play('shieldHit', Math.hypot(G.player.x - e.x, G.player.y - e.y));
      if (e.shield > 0) return 'shield';
      amt = -e.shield / mult; e.shield = 0;
      S.burst(e.x, e.y, 14, '#c9bfff', 220, 0.4, 3, { glow: true });
    }
    let armor = d.armor;
    if (d.back != null && dir) {
      const fx = Math.cos(e.ang), fy = Math.sin(e.ang);
      if (fx * dir.x + fy * dir.y > 0.35) armor = d.back; // projectile travels the way the enemy faces: it hits the back
    } else if (d.back != null && o.explosive) armor = Math.max(d.back, armor - 1);
    let mult = 1, res = 'hit';
    if (!o.ignoreArmor) {
      if (pen >= armor) mult = 1;
      else if (pen === armor - 1) { mult = 0.35; res = 'glance'; }
      else { mult = o.explosive ? 0.05 : 0; res = 'bounce'; }
    }
    if (mult <= 0) return 'bounce';
    e.hp -= amt * mult; e.flash = 0.08;
    if (o.stagger && d.tier <= 1) e.stunT = Math.max(e.stunT, 0.25 * o.stagger);
    if (e.state !== 'hunt') { e.state = 'hunt'; e.alertT = 0; if (o.src && o.src.x != null) e.lastKnown = { x: o.src.x, y: o.src.y }; if (e.outpost) e.outpost.alert = true; }
    if (o.src && o.src.kind === 'diver' && o.src.alive) e.target = o.src;
    if (e.hp <= 0) { S.killEnemy(e, o.src); return 'kill'; }
    return res;
  };

  S.killEnemy = function (e, src) {
    e.dead = true;
    const d = e.def, f = DF.FACTIONS[d.f];
    G.stats.kills++; G.stats.killsByTier[d.tier]++;
    if (!G.stats.biggest || d.tier > DF.ENEMIES[G.stats.biggest].tier) G.stats.biggest = e.type;
    S.burst(e.x, e.y, 10 + e.r, f.blood, 160 + e.r * 3, 0.5, 2 + e.r / 6);
    S.decal(e.x, e.y, e.r * 1.1, f.blood, 0.45);
    if (d.f === 'foundry') { S.burst(e.x, e.y, 6 + e.r / 2, '#ff8a3a', 200, 0.3, 2, { glow: true }); if (d.tier >= 1) S.burst(e.x, e.y, 8, 'rgba(50,50,50,0.6)', 80, 1.2, 8, { grow: 14, kind: 'smoke' }); }
    if (d.f === 'veil') S.burst(e.x, e.y, 10, '#d9ccff', 120, 0.6, 2, { glow: true });
    G.corpses = G.corpses || [];
    G.corpses.push({ x: e.x, y: e.y, ang: e.ang, def: d, type: e.type, t: 25, r: e.r });
    if (G.corpses.length > 160) G.corpses.shift();
    if (d.sac) S.at(0.05, () => S.boom(e.x, e.y, 30 + e.r * 1.2, 120 + e.r * 3, 3, { acid: true, col: '#b6ef4a', closes: false }));
    if (d.f === 'foundry' && d.tier >= 2) S.at(0.3, () => S.boom(e.x, e.y, e.r * 2.2, 300, 3, { closes: false }));
    if (d.tier === 3) S.shakeAt(e.x, e.y, 12);
    if (src && src.isPlayer && d.tier >= 2) S.msg(d.name + ' destroyed', '#ffd27a', 2.5);
  };

  S.armorMult = function (dv, kind) {
    let m = 1 - dv.cls.dr;
    if (G.booster === 'b_vital') m *= 0.85;
    if (kind === 'explosive' && dv.passive === 'fortified') m *= 0.5;
    if (kind === 'fire' && dv.passive === 'ember') m *= 0.25;
    if (kind === 'arc' && dv.passive === 'ground') m *= 0.1;
    return m;
  };

  S.dmgDiver = function (dv, amt, kind, src) {
    if (!dv.alive || dv.invuln > 0 || G.ended) return;
    if (dv.veh) { if (dv.veh.vt === 'buggy' || kind !== 'fire') { S.dmgVehicle(dv.veh, amt, kind === 'explosive' ? 4 : 3, kind); return; } }
    if (dv.pack && dv.pack.type === 'shield' && dv.pack.hp > 0 && kind !== 'fire' && kind !== 'gas') {
      dv.pack.hp -= amt; dv.pack.delay = 2.2; dv.pack.hit = 0.15;
      if (dv.pack.hp >= 0) return;
      amt = -dv.pack.hp; dv.pack.hp = 0;
    }
    amt *= S.armorMult(dv, kind);
    dv.hp -= amt; dv.flash = 0.1;
    if (dv.isPlayer) { G.dmgFlash = Math.min(1, G.dmgFlash + amt / 60); A.play('hurt'); G.lastHitDir = src && src.x != null ? Math.atan2(src.y - dv.y, src.x - dv.x) : null; G.lastHitT = 0.8; }
    if (dv.hp <= 0) {
      if (dv.passive === 'resolve' && dv.resolveCd <= 0 && Math.random() < 0.5) { dv.hp = 1; dv.resolveCd = 2.5; if (dv.isPlayer) S.msg('Last Stand held', '#ffd27a', 2); return; }
      S.killDiver(dv, kind, src);
    }
  };

  S.killDiver = function (dv, kind, src) {
    dv.alive = false; dv.hp = 0; dv.deadT = 0;
    G.stats.deaths++;
    if (src && src.kind === 'diver') G.stats.tk++;
    S.burst(dv.x, dv.y, 20, '#9b1c1c', 180, 0.6, 3);
    S.decal(dv.x, dv.y, 14, '#5a1010', 0.6);
    // drop support weapon, backpack, and anything carried
    if (dv.weapons[2]) { S.item('weapon', dv.x + 10, dv.y, { w: dv.weapons[2] }); dv.weapons[2] = null; }
    if (dv.pack) { S.item('pack', dv.x - 10, dv.y, { pack: dv.pack }); dv.pack = null; }
    if (dv.carrying) { S.item('blackbox', dv.x, dv.y + 10, {}); dv.carrying = null; }
    if (dv.veh) S.exitVehicle(dv, true);
    G.corpses = G.corpses || [];
    G.corpses.push({ x: dv.x, y: dv.y, ang: dv.ang, diver: true, armor: dv.arm, t: 60, r: 11 });
    if (dv.isPlayer) {
      S.msg('You were killed' + (kind === 'explosive' && src && src.kind === 'diver' ? ' by friendly fire' : '') + '. ' + (G.lives > 0 ? 'Reinforcing…' : 'No reinforcements left.'), '#ff6b5a', 4);
      G.respawnT = G.mods.has('c1') ? 4.5 : 6.5; G.pendingRespawn = true;
      if (G.codeTask) G.codeTask = null;
      G.menu = false; G.code = ''; G.ready = null;
    } else S.msg(dv.name + ' is down', '#ff9a8a', 3);
  };

  S.respawnDiver = function (dv, x, y) {
    const cfg = dv.loadout;
    const fresh = S.makeDiver(x, y, cfg);
    Object.assign(dv, fresh, { id: dv.id, slot: dv.slot });
    dv.alive = false; dv.arriving = true;
    S.pod(x, y, { kind: 'diver', diver: dv }, 3, true);
    G.lives--;
  };

  S.dmgVehicle = function (v, amt, pen, kind) {
    if (!v.alive) return;
    const armor = DF.VEHICLES[v.vt].armor;
    let m = pen >= armor ? 1 : pen === armor - 1 ? 0.35 : kind === 'explosive' ? 0.1 : 0.04;
    v.hp -= amt * m; v.flash = 0.08;
    if (v.driver && v.driver.isPlayer) G.dmgFlash = Math.min(1, G.dmgFlash + amt * m / 200);
    if (v.hp <= 0) {
      v.alive = false;
      S.msg(DF.VEHICLES[v.vt].name + ' destroyed', '#ff9a8a', 3);
      const occ = [v.driver, ...v.passengers].filter(Boolean);
      for (const d of occ) S.exitVehicle(d, true);
      S.boom(v.x, v.y, 80, 400, 4, { big: true, closes: false });
    }
  };
  S.dmgSentry = function (s, amt) { if (!s.alive) return; s.hp -= amt; s.flash = 0.08; if (s.hp <= 0) { s.alive = false; S.boom(s.x, s.y, 40, 150, 3, { closes: false }); } };
  S.dmgColonist = function (c, amt) {
    if (!c.alive) return; c.hp -= amt; c.flash = 0.1;
    if (c.hp <= 0) { c.alive = false; c.obj.dead++; S.burst(c.x, c.y, 10, '#9b1c1c', 120, 0.5, 2); S.decal(c.x, c.y, 8, '#5a1010', 0.5); }
  };
  S.dmgStruct = function (st, amt, pen) {
    if (!st.alive) return;
    const m = pen >= st.armor ? 1 : pen === st.armor - 1 ? 0.35 : 0;
    if (!m) return;
    st.hp -= amt * m; st.flash = 0.1;
    if (st.hp <= 0) {
      st.alive = false; G.stats.side++;
      const names = { jammer: 'Signal jammer destroyed. Call-ins restored nearby.', aa: 'Anti-air battery destroyed. Raptors cleared to fly.', artillery: 'Enemy artillery destroyed.' };
      S.msg(names[st.type] || 'Target destroyed', '#9fe07a', 4); A.play('objective');
      S.at(0.1, () => S.boom(st.x, st.y, 90, 300, 3, { big: true, closes: false }));
    }
  };

  S.closeSpawner = function (sp) {
    if (!sp.alive) return;
    sp.alive = false;
    S.burst(sp.x, sp.y, 30, sp.faction === 'brood' ? '#a6d83a' : sp.faction === 'veil' ? '#c9bfff' : '#ff8a3a', 200, 0.7, 4, { glow: true });
    const op = sp.outpost;
    if (op && !op.cleared && op.spawners.every(s => !s.alive)) {
      op.cleared = true; G.stats.outposts++;
      const nm = { brood: 'Hive cluster purged', foundry: 'Fabricator yard razed', veil: 'Rift field collapsed' }[G.M.faction];
      S.msg(nm, '#9fe07a', 4); A.play('objective');
    }
  };

  S.item = function (kind, x, y, extra) { const it = Object.assign({ kind, x, y, t: 0, alive: true }, extra || {}); G.items.push(it); return it; };

  // ---------------------------------------------------------------- drop pods
  S.pod = function (x, y, payload, eta, quiet) {
    const p = { x, y, payload, t: eta, T: eta, landed: false };
    G.pods.push(p);
    if (!quiet) A.play('pod');
    return p;
  };
  S.podLand = function (p) {
    const pl = p.payload, crush = 32 * (G.mods.has('e1') ? 1.5 : 1) * (pl.kind === 'vehicle' ? 1.5 : 1);
    S.burst(p.x, p.y, 24, 'rgba(90,80,70,0.7)', 260, 0.9, 6, { grow: 10, kind: 'smoke' });
    S.decal(p.x, p.y, 26, '#1e1a17', 0.45);
    S.shakeAt(p.x, p.y, 6); A.play('boom', Math.hypot(G.player.x - p.x, G.player.y - p.y));
    // a pod lands hard on anything below it
    for (const e of G.ehash.query(p.x, p.y, crush + 60, tmp)) if (!e.dead && !e.def.flying && Math.hypot(e.x - p.x, e.y - p.y) < crush + e.r * 0.5) S.dmgEnemy(e, 3000, 6, null, { explosive: true });
    for (const d of G.divers) if (d.alive && !d.veh && pl.diver !== d && Math.hypot(d.x - p.x, d.y - p.y) < crush) S.dmgDiver(d, 999, 'explosive');
    switch (pl.kind) {
      case 'diver': {
        const d = pl.diver; d.x = p.x; d.y = p.y; d.alive = true; d.arriving = false; d.invuln = 1; d.vx = d.vy = 0;
        const fp = S.freeSpot(d.x, d.y + 14, 12); d.x = fp.x; d.y = fp.y;
        break;
      }
      case 'supply': S.item('supply', p.x, p.y, { charges: 4 }); break;
      case 'weapon': {
        const w = S.makeWeapon(pl.wid);
        if (pl.wid === 'os1') { w.spare = 1; }
        S.item('weapon', p.x + 12, p.y, { w });
        if (pl.pack) S.item('pack', p.x - 12, p.y, { pack: S.makePack(pl.pack) });
        break;
      }
      case 'pack': S.item('pack', p.x, p.y + 10, { pack: S.makePack(pl.pack) }); break;
      case 'sentry': S.makeSentry(pl.st, p.x, p.y); break;
      case 'vehicle': S.makeVehicle(pl.vt, p.x, p.y); break;
      case 'nova': G.novas.push({ x: p.x, y: p.y, state: 'idle', t: 0, alive: true }); S.msg('Nova Bomb down. Arm it at the bomb (E).', '#ffd27a', 4); break;
    }
  };

  S.makePack = function (type) {
    const d = DF.BACKPACKS[type];
    const p = { type, name: d.name };
    if (type === 'shield') { p.hp = p.max = d.hp; p.delay = 0; }
    if (type === 'jump') p.cd = 0;
    if (type === 'supply') p.charges = d.charges;
    if (type === 'dog') { p.ammo = d.ammo; p.cd = 0; p.ang = 0; }
    if (d.ammoFor) { p.ammoFor = d.ammoFor; p.refill = d.refill; }
    return p;
  };

  S.makeSentry = function (st, x, y) {
    const d = DF.SENTRIES[st], m = G.mods;
    const s = { kind: 'sentry', st, d, x, y, ang: -Math.PI / 2, hp: d.hp * (m.has('r1') ? 1.5 : 1), maxhp: d.hp * (m.has('r1') ? 1.5 : 1), ammo: Math.round(d.ammo * (m.has('r2') ? 1.5 : 1)), cd: 1, alive: true, r: st === 'dome' ? d.r : 14, life: d.life || 0, spin: 0 };
    s.maxAmmo = s.ammo;
    G.sentries.push(s); return s;
  };

  S.makeVehicle = function (vt, x, y) {
    const d = DF.VEHICLES[vt], hp = d.hp * (G.mods.has('r3') ? 1.3 : 1);
    const v = { kind: 'vehicle', vt, d, x, y, ang: -Math.PI / 2, aim: -Math.PI / 2, hp, maxhp: hp, alive: true, driver: null, passengers: [], r: d.r, vx: 0, vy: 0, speed: 0, cds: [0, 0], walk: 0, turret: -Math.PI / 2, tcd: 0 };
    v.ammo = d.weapons ? d.weapons.map(w => w.ammo) : [];
    G.vehicles.push(v); return v;
  };

  S.enterVehicle = function (dv, v) {
    if (v.driver || !v.alive) return;
    v.driver = dv; dv.veh = v; dv.x = v.x; dv.y = v.y;
    if (v.vt === 'buggy') {
      for (const b of G.divers) if (b !== dv && b.alive && b.bot && !b.veh && v.passengers.length < 3 && Math.hypot(b.x - v.x, b.y - v.y) < 300) { v.passengers.push(b); b.veh = v; }
    }
    A.play('servo');
  };
  S.exitVehicle = function (dv, eject) {
    const v = dv.veh; if (!v) return;
    dv.veh = null;
    if (v.driver === dv) {
      v.driver = null;
      for (const b of v.passengers.slice()) { if (b !== dv) S.exitVehicle(b, eject); }
    }
    v.passengers = v.passengers.filter(b => b !== dv);
    const a = Math.random() * 6.283, p = S.freeSpot(v.x + Math.cos(a) * (v.r + 16), v.y + Math.sin(a) * (v.r + 16), 12);
    dv.x = p.x; dv.y = p.y;
    if (eject && dv.alive) { dv.proneT = 0.6; S.dmgDiver(dv, 40, 'explosive'); }
  };

  // ---------------------------------------------------------------- collisions
  S.collide = function (u, r) {
    const M = G.M, near = M.grid.query(u.x - r - 2, u.y - r - 2, u.x + r + 2, u.y + r + 2, tmp2);
    for (const o of near) {
      if (!o.block) continue;
      if (o.shape === 'r') {
        const cx = U.clamp(u.x, o.x, o.x + o.w), cy = U.clamp(u.y, o.y, o.y + o.h);
        const dx = u.x - cx, dy = u.y - cy, d2 = dx * dx + dy * dy;
        if (d2 < r * r) {
          if (d2 > 1e-6) { const d = Math.sqrt(d2), push = r - d; u.x += dx / d * push; u.y += dy / d * push; }
          else { // inside: push out the nearest side
            const l = u.x - o.x, rr = o.x + o.w - u.x, t = u.y - o.y, b = o.y + o.h - u.y, m = Math.min(l, rr, t, b);
            if (m === l) u.x = o.x - r; else if (m === rr) u.x = o.x + o.w + r; else if (m === t) u.y = o.y - r; else u.y = o.y + o.h + r;
          }
          u._hitWall = true;
        }
      } else {
        const dx = u.x - o.x, dy = u.y - o.y, d2 = dx * dx + dy * dy, rr = r + o.r;
        if (d2 < rr * rr) { const d = Math.sqrt(d2) || 1e-3; u.x = o.x + dx / d * rr; u.y = o.y + dy / d * rr; u._hitWall = true; }
      }
    }
    u.x = U.clamp(u.x, M.edge + r, W - M.edge - r); u.y = U.clamp(u.y, M.edge + r, W - M.edge - r);
  };

  S.solidAt = function (x, y) {
    if (x < 0 || y < 0 || x > W || y > W) return true;
    const near = G.M.grid.query(x - 1, y - 1, x + 1, y + 1, tmp2);
    for (const o of near) if (o.block && U.pointInObs(x, y, o)) return true;
    return false;
  };

  S.los = function (x1, y1, x2, y2, smoke) {
    const near = G.M.grid.query(x1, y1, x2, y2, tmp2);
    for (const o of near) {
      if (!o.block) continue;
      if (o.shape === 'r' ? U.segRect(x1, y1, x2, y2, o.x, o.y, o.w, o.h) : U.segCircle(x1, y1, x2, y2, o.x, o.y, o.r * 0.85)) return false;
    }
    if (smoke) for (const a of G.areas) if (a.kind === 'smoke' && U.segCircle(x1, y1, x2, y2, a.x, a.y, a.r * 0.8)) return false;
    return true;
  };

  // terrain modifiers at a point
  S.terrainAt = function (x, y) {
    const res = { slow: 1, cover: false, lava: false };
    const b = G.M.biome;
    if (b.slow && G.booster !== 'b_muscle') res.slow = b.slow === 'mud' ? 0.88 : b.slow === 'snow' ? 0.92 : 0.95;
    const near = G.M.grid.query(x - 1, y - 1, x + 1, y + 1, tmp2);
    for (const o of near) {
      if (o.block || !U.pointInObs(x, y, o)) continue;
      if (o.slowZone && G.booster !== 'b_muscle') res.slow *= o.slowZone;
      if (o.cover) res.cover = true;
      if (o.hazard === 'lava') res.lava = true;
    }
    return res;
  };
})();
