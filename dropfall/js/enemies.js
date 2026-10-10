// Dropfall — enemy spawning, AI and attacks.
'use strict';
(function () {
  const U = DF.U, A = DF.Audio, S = DF.Sim, W = DF.WORLD;
  const tmp = [], tmp4 = [];
  const G = () => DF.G;

  S.spawnEnemy = function (type, x, y, o) {
    const g = G(), d = DF.ENEMIES[type];
    if (!d) return null;
    const p = d.flying ? { x, y } : S.freeSpot(x, y, d.r);
    const e = {
      id: g.nextId++, kind: 'enemy', type, def: d, x: p.x, y: p.y, vx: 0, vy: 0, kx: 0, ky: 0, ang: Math.random() * 6.283, r: d.r,
      hp: d.hp * (1 + (g.M.diff - 1) * 0.04), shield: d.shield || 0, maxShield: d.shield || 0, shieldDelay: 0,
      state: 'idle', home: { x: p.x, y: p.y }, wander: null, target: null, lastKnown: null, cd: U.rand(0.5, 2), think: Math.random() * 0.3,
      stunT: 0, burnT: 0, gasT: 0, callT: 0, alertT: 0, flash: 0, walk: Math.random() * 10, burstLeft: 0, burstT: 0, dead: false, lostT: 0,
      stuckT: 0, side: Math.random() < 0.5 ? 1 : -1, sideT: 0
    };
    e.maxhp = e.hp;
    if (o) Object.assign(e, o);
    g.enemies.push(e);
    return e;
  };

  // build a squad for this faction scaled by difficulty
  S.squad = function (size, heavyChance, allowBoss) {
    const g = G(), R = DF.ROSTER[g.M.faction], diff = g.M.diff, out = [];
    for (let i = 0; i < size; i++) {
      const r = Math.random();
      if (allowBoss && diff >= 7 && r < 0.015 * (diff - 6)) out.push(U.pick(R.t3));
      else if (r < heavyChance) out.push(U.pick(R.t2));
      else if (r < heavyChance + 0.12 + diff * 0.03) out.push(U.pick(R.t1));
      else out.push(U.pick(R.t0));
    }
    if (Math.random() < 0.5 + diff * 0.04) out.push(R.caller);
    return out;
  };
  S.heavyChance = () => { const d = G().M.diff; return d <= 2 ? 0 : Math.min(0.32, (d - 2) * 0.04); };

  S.spawnGroup = function (x, y, types, o) {
    const res = [];
    for (const t of types) { const a = Math.random() * 6.283, d = U.rand(0, 40 + types.length * 6); const e = S.spawnEnemy(t, x + Math.cos(a) * d, y + Math.sin(a) * d, o ? Object.assign({}, o) : null); if (e) res.push(e); }
    return res;
  };

  S.populate = function () {
    const g = G(), M = g.M, diff = M.diff, R = DF.ROSTER[M.faction];
    // outposts get guards
    for (const op of M.outposts) {
      const n = (op.size === 'small' ? 4 : op.size === 'medium' ? 7 : 10) + Math.floor(diff * 0.8);
      const types = S.squad(n, S.heavyChance() * (op.size === 'large' ? 1.6 : 1), false);
      for (const e of S.spawnGroup(op.x, op.y, types)) { e.outpost = op; e.home = { x: op.x, y: op.y }; e.leash = op.r; }
    }
    // objective guards
    for (const ob of M.objectives) {
      const n = 4 + diff;
      const types = S.squad(n, S.heavyChance(), false);
      for (const e of S.spawnGroup(ob.x + U.rand(-120, 120), ob.y + U.rand(-120, 120), types)) { e.home = { x: ob.x, y: ob.y }; e.leash = 220; }
      if (ob.type === 'eliminate') {
        const bossType = diff >= 4 ? R.t3[0] : U.pick(R.t2);
        const boss = S.spawnEnemy(bossType, ob.x, ob.y, { leash: 200 });
        boss.hp *= 1.25; boss.maxhp = boss.hp; boss.isTarget = true;
        ob.boss = boss;
        S.spawnGroup(ob.x, ob.y, [U.pick(R.t1), U.pick(R.t1), U.pick(R.t0), U.pick(R.t0)]).forEach(e => { e.home = { x: ob.x, y: ob.y }; e.leash = 200; });
      }
      if (ob.type === 'nova') S.spawnGroup(ob.x, ob.y, [U.pick(R.t2), U.pick(R.t1), U.pick(R.t1)]).forEach(e => { e.home = { x: ob.x, y: ob.y }; e.leash = 180; });
    }
    for (const st of M.side) if (st.hp != null) S.spawnGroup(st.x + 60, st.y + 60, S.squad(3 + Math.floor(diff / 2), S.heavyChance() * 0.5, false)).forEach(e => { e.home = { x: st.x, y: st.y }; e.leash = 160; });
    // roaming patrols
    const nPat = 5 + diff;
    for (let i = 0; i < nPat; i++) {
      const x = U.rand(300, W - 300), y = U.rand(300, W - 300);
      if (g.opts.drop && Math.hypot(x - g.opts.drop.x, y - g.opts.drop.y) < 700) continue;
      S.spawnGroup(x, y, S.squad(3 + Math.floor(diff / 2), S.heavyChance() * 0.6, false)).forEach(e => { e.patrol = true; e.leash = 9999; });
    }
  };

  // ---------------------------------------------------------------- targets
  // everything enemies can attack
  S.targets = function () {
    const g = G(), out = tmp4; out.length = 0;
    for (const d of g.divers) if (d.alive && !(d.veh && d.veh.driver !== d)) out.push(d);
    for (const v of g.vehicles) if (v.alive && !v.driver) out.push(v);
    for (const s of g.sentries) if (s.alive && s.st !== 'dome') out.push(s);
    for (const c of g.colonists) if (c.alive) out.push(c);
    return out;
  };
  function tPos(t) { return t.veh || t; }
  S.hitTarget = function (t, amt, kind, src) {
    if (t.kind === 'diver') S.dmgDiver(t, amt, kind, src);
    else if (t.kind === 'vehicle') S.dmgVehicle(t, amt, kind === 'explosive' ? 4 : 3, kind);
    else if (t.kind === 'sentry') S.dmgSentry(t, amt);
    else if (t.kind === 'colonist') S.dmgColonist(t, amt);
  };

  function detectRange(e, t) {
    const g = G(), d = e.def;
    let r = (300 + d.tier * 50) * g.vis * (d.flying ? 1.25 : 1);
    if (t.kind === 'diver') {
      if (t.passive === 'scout') r *= 0.7;
      if (t.proneT > 0 || t.diveT > 0) r *= 0.65;
      if (t.inCover) r *= 0.55;
      if (t.sprinting) r *= 1.15;
      if (t.veh) r *= 1.4;
    }
    return r;
  }

  // ---------------------------------------------------------------- AI
  S.updateEnemies = function (dt) {
    const g = G(), targets = S.targets();
    g.callCd -= dt;
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      if (e.dead) { g.enemies.splice(i, 1); continue; }
      updateEnemy(e, dt, targets);
    }
  };

  // flyers see over terrain; smoke still blinds everyone
  function seeLos(e, p) {
    if (!e.def.flying) return S.los(e.x, e.y, p.x, p.y, true);
    for (const a of G().areas) if (a.kind === 'smoke' && U.segCircle(e.x, e.y, p.x, p.y, a.x, a.y, a.r * 0.8)) return false;
    return true;
  }

  function updateEnemy(e, dt, targets) {
    const g = G(), d = e.def;
    e.flash -= dt; e.shieldHit = Math.max(0, (e.shieldHit || 0) - dt);
    // status effects
    if (e.burnT > 0) { e.burnT -= dt; S.dmgEnemy(e, 35 * dt, 9, null, { ignoreShield: false, fire: true }); if (Math.random() < 0.3) S.part(e.x + U.rand(-e.r, e.r) * 0.6, e.y + U.rand(-e.r, e.r) * 0.6, 0, -20, 0.4, 3, '#ff9a3a', { glow: true, grow: 4 }); if (e.dead) return; }
    if (e.maxShield) { e.shieldDelay -= dt; if (e.shieldDelay <= 0 && e.shield < e.maxShield) e.shield = Math.min(e.maxShield, e.shield + e.maxShield * (d.tier >= 3 ? 0.08 : 0.25) * dt); }
    // knockback
    if (e.kx || e.ky) { e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= Math.pow(0.02, dt); e.ky *= Math.pow(0.02, dt); if (Math.abs(e.kx) + Math.abs(e.ky) < 5) e.kx = e.ky = 0; }
    if (e.stunT > 0) { e.stunT -= dt; e.vx = e.vy = 0; e.chargeT = 0; e.beamT = 0; if (!d.flying) S.collide(e, e.r); return; }

    // perception, a few times per second
    e.think -= dt;
    if (e.think <= 0) {
      e.think = 0.25 + Math.random() * 0.1;
      let best = null, bd = 1e9;
      for (const t of targets) {
        const p = tPos(t), dist = Math.hypot(p.x - e.x, p.y - e.y);
        const dr = t.kind === 'diver' ? detectRange(e, t) : 260;
        const known = e.state === 'hunt' && (t === e.target || dist < dr * 2.2);
        if (dist < dr || known) {
          if (dist < bd && (known || seeLos(e, p))) { bd = dist; best = t; }
        }
      }
      if (g.focus && g.focus.active && Math.hypot(g.focus.x - e.x, g.focus.y - e.y) < 900 && e.state === 'hunt' && !best) e.lastKnown = { x: g.focus.x, y: g.focus.y };
      if (best) {
        if (e.state !== 'hunt') { e.state = 'hunt'; e.alertT = 0; if (e.outpost) e.outpost.alert = true; if (d.f === 'brood' && Math.random() < 0.3) A.play('screech', bd); }
        e.target = best; const p = tPos(best); e.lastKnown = { x: p.x, y: p.y }; e.lostT = 0;
        e.hasLos = seeLos(e, p);
        // alert neighbours
        for (const o of g.ehash.query(e.x, e.y, 160, tmp)) if (o.state !== 'hunt') { o.state = 'hunt'; o.lastKnown = e.lastKnown; o.alertT = 0; }
      } else {
        e.hasLos = false;
        if (e.target && (!e.target.alive || e.target.dead)) e.target = null;
        if (e.state === 'hunt') { e.lostT += 0.3; if (e.lostT > 12) { e.state = 'idle'; e.target = null; e.home = { x: e.x, y: e.y }; e.leash = Math.min(e.leash || 300, 300); } }
      }
    }
    if (e.target && (e.target.dead || e.target.alive === false || (e.target.kind === 'diver' && e.target.veh && e.target.veh.driver !== e.target))) { e.target = null; e.hasLos = false; }

    // reinforcement callers
    if (d.caller && e.state === 'hunt' && e.target && e.hasLos) {
      e.callT += dt;
      if (e.callT > 3.2 && g.callCd <= 0 && g.calls.length < 2 + Math.floor(g.M.diff / 4)) { S.startCall(e); e.callT = -25; }
    }

    // movement goal
    let gx = null, gy = null, speed = d.speed, want = 0;
    const tgt = e.target ? tPos(e.target) : null;
    const dist = tgt ? Math.hypot(tgt.x - e.x, tgt.y - e.y) : 1e9;
    if (e.state === 'hunt') {
      e.alertT += dt;
      if (tgt) { gx = tgt.x; gy = tgt.y; }
      else if (e.lastKnown) { gx = e.lastKnown.x; gy = e.lastKnown.y; if (Math.hypot(gx - e.x, gy - e.y) < 30) e.lastKnown = null; }
    } else {
      // wander around home or walk a patrol route
      if (!e.wander || Math.hypot(e.wander.x - e.x, e.wander.y - e.y) < 20 || Math.random() < 0.002) {
        if (e.patrol) {
          const P = g.player;
          const near = Math.random() < 0.6 && P.alive ? { x: P.x + U.rand(-600, 600), y: P.y + U.rand(-600, 600) } : { x: U.rand(200, W - 200), y: U.rand(200, W - 200) };
          e.wander = { x: U.clamp(near.x, 100, W - 100), y: U.clamp(near.y, 100, W - 100) };
        } else { const a = Math.random() * 6.283, r = Math.random() * (e.leash || 200); e.wander = { x: e.home.x + Math.cos(a) * r, y: e.home.y + Math.sin(a) * r }; }
      }
      gx = e.wander.x; gy = e.wander.y; speed *= e.patrol ? 0.55 : 0.35;
    }

    // attacks
    if (tgt && e.state === 'hunt') attack(e, tgt, dist, dt);
    if (e.leapT > 0 || e.chargeT > 0) { moveSpecial(e, dt); return; }
    if (e.windT > 0) { e.windT -= dt; if (e.windT <= 0) beginCharge(e); return; }
    if (e.beamT > 0) speed *= 0.2;
    if (e.flaming) speed *= 0.5;

    if (gx != null) {
      let dx = gx - e.x, dy = gy - e.y; const dd = Math.hypot(dx, dy) || 1;
      dx /= dd; dy /= dd;
      const ranged = d.range > 60 && d.atk !== 'charge' && d.atk !== 'leap';
      if (tgt && ranged && e.state === 'hunt') {
        if (dist < d.range * 0.75 && e.hasLos) {
          // hold position and strafe
          e.sideT -= dt; if (e.sideT <= 0) { e.side = -e.side; e.sideT = U.rand(1.5, 3); }
          const keep = dist < d.range * 0.35 ? -0.6 : 0;
          const ux = dx, uy = dy;
          dx = ux * keep - uy * e.side * 0.5; dy = uy * keep + ux * e.side * 0.5;
          speed *= 0.5;
        }
      } else if (tgt && d.atk === 'none') { if (dist < 240) { dx = -dx; dy = -dy; speed *= 0.4; } }
      else if (tgt && dist < e.r + 12 + (tgt.r || 10)) { dx = 0; dy = 0; }
      if (d.atk === 'tentacle') speed *= 0.3;
      // separation
      let sx = 0, sy = 0;
      for (const o of g.ehash.query(e.x, e.y, e.r + 30, tmp)) {
        if (o === e || o.def.flying !== d.flying) continue;
        const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy), min = e.r + o.r + 2;
        if (od < min && od > 0.01) { sx += ox / od * (min - od) / min; sy += oy / od * (min - od) / min; }
      }
      dx += sx * 1.5; dy += sy * 1.5;
      // look ahead for walls and steer around them
      if (!d.flying) {
        const la = e.r + 26, ax = e.x + dx * la, ay = e.y + dy * la;
        if (S.solidAt(ax, ay) || e.stuckT > 0.6) {
          const base = Math.atan2(dy, dx);
          let found = false;
          for (const off of [0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
            const a = base + off * e.side;
            if (!S.solidAt(e.x + Math.cos(a) * la, e.y + Math.sin(a) * la)) { dx = Math.cos(a); dy = Math.sin(a); found = true; break; }
          }
          if (!found) { dx = -dx; dy = -dy; }
          if (e.stuckT > 1.5) { e.side = -e.side; e.stuckT = 0; }
        }
      }
      const m = Math.hypot(dx, dy);
      if (m > 0.01) {
        const terr = d.flying ? 1 : S.terrainAt(e.x, e.y);
        const sp = speed * (terr.slow || 1) * (e.gasT > 0 ? 0.6 : 1);
        e.vx = U.lerp(e.vx, dx / Math.max(1, m) * sp, Math.min(1, dt * 6)); e.vy = U.lerp(e.vy, dy / Math.max(1, m) * sp, Math.min(1, dt * 6));
        if (!d.flying && terr.lava) { e.burnT = Math.max(e.burnT, 1); }
      } else { e.vx *= 0.8; e.vy *= 0.8; }
    } else { e.vx *= 0.85; e.vy *= 0.85; }

    const ox = e.x, oy = e.y;
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (!d.flying) S.collide(e, e.r); else { e.x = U.clamp(e.x, 40, W - 40); e.y = U.clamp(e.y, 40, W - 40); }
    const moved = Math.hypot(e.x - ox, e.y - oy), intended = Math.hypot(e.vx, e.vy) * dt;
    if (intended > 0.5 && moved < intended * 0.3) e.stuckT += dt; else e.stuckT = Math.max(0, e.stuckT - dt);
    e.walk += moved * 0.12;
    // facing
    const face = tgt && e.state === 'hunt' && (e.hasLos || dist < 200) ? Math.atan2(tgt.y - e.y, tgt.x - e.x) : Math.hypot(e.vx, e.vy) > 5 ? Math.atan2(e.vy, e.vx) : e.ang;
    const turnRate = d.tier >= 2 ? 1.6 : 6;
    e.ang = U.turn(e.ang, face, turnRate * dt * (e.beamT > 0 ? 0.35 : 1));
    // special: boss walkers drop troops, behemoths stomp
    if (d.spawns && e.state === 'hunt') { e.spawnT = (e.spawnT || 8) - dt; if (e.spawnT <= 0) { e.spawnT = 12; S.spawnGroup(e.x, e.y, [d.spawns, d.spawns, d.spawns], { state: 'hunt', lastKnown: tgt ? { x: tgt.x, y: tgt.y } : null }); } }
    if (d.stomp && tgt && dist < e.r + 50) { e.stompT = (e.stompT || 0) - dt; if (e.stompT <= 0) { e.stompT = 3; S.boom(e.x + Math.cos(e.ang) * e.r * 0.6, e.y + Math.sin(e.ang) * e.r * 0.6, 70, 140, 2, { closes: false, col: '#c9a46a', noDecal: true }); } }
  }

  function attack(e, tgt, dist, dt) {
    const g = G(), d = e.def, t = e.target;
    e.cd -= dt;
    e.flaming = false;
    const angTo = Math.atan2(tgt.y - e.y, tgt.x - e.x);
    const facing = Math.abs(U.angDiff(e.ang, angTo)) < 0.5;
    const pd = Math.hypot(g.player.x - e.x, g.player.y - e.y);
    switch (d.atk) {
      case 'melee': case 'leap': {
        const reach = e.r + (t.r || 11) + d.range;
        if (dist < reach && e.cd <= 0) { e.cd = d.cd; e.atkAnim = 0.2; S.hitTarget(t, d.dmg * dmgScale(), 'melee', e); if (d.saw) S.burst(tgt.x, tgt.y, 4, '#ffcf7a', 120, 0.2, 1.5, { glow: true }); }
        if (d.atk === 'leap' && dist < 170 && dist > 50 && e.cd <= 0 && e.hasLos) { e.cd = d.cd; e.leapT = 0.35; e.leapA = angTo; e.leapHit = false; }
        break;
      }
      case 'spit': if (dist < d.range && e.hasLos && e.cd <= 0) { e.cd = d.cd * U.rand(0.8, 1.2); S.proj({ x: e.x, y: e.y, ang: angTo + U.rand(-0.08, 0.08), speed: 380, dmg: d.dmg * dmgScale(), range: d.range * 1.1, team: 'e', owner: e, kind: 'spit', slow: 1.5, rad: 5, col: '#b6ef4a', dkind: 'acid' }); } break;
      case 'shoot': {
        if (e.burstLeft > 0) {
          e.burstT -= dt;
          if (e.burstT <= 0) { e.burstLeft--; e.burstT = 0.09; const sp = 0.12 - Math.min(0.06, g.M.diff * 0.005); S.proj({ x: e.x + Math.cos(e.ang) * e.r, y: e.y + Math.sin(e.ang) * e.r, ang: e.ang + U.rand(-sp, sp), speed: 950, dmg: d.dmg * dmgScale(), range: d.range * 1.2, team: 'e', owner: e, kind: 'bullet', col: d.f === 'veil' ? '#bfb4ff' : '#ff5a3a', rad: 2 }); A.play('enemyShot', pd); }
        } else if (dist < d.range && e.hasLos && facing && e.cd <= 0) { e.cd = d.cd * U.rand(0.8, 1.3); e.burstLeft = d.burst || 1; e.burstT = 0; }
        break;
      }
      case 'rocket': if (dist < d.range && e.hasLos && facing && e.cd <= 0) { e.cd = d.cd * U.rand(0.8, 1.2); S.proj({ x: e.x, y: e.y, ang: angTo + U.rand(-0.06, 0.06), speed: 480, dmg: 0, range: d.range * 1.2, team: 'e', owner: e, kind: 'rocket', blast: { r: 42, dmg: d.dmg * dmgScale() * 2, pen: 3 }, closes: false, rad: 4, col: '#ffb07a' }); A.play('rocket', pd); } break;
      case 'bolt': if (dist < d.range && e.hasLos && e.cd <= 0) { e.cd = d.cd * U.rand(0.8, 1.2); S.proj({ x: e.x, y: e.y, ang: angTo + U.rand(-0.05, 0.05), speed: 620, dmg: d.dmg * dmgScale(), range: d.range * 1.2, team: 'e', owner: e, kind: 'bolt', rad: 5, col: '#c9a8ff', dkind: 'arc' }); A.play('plasma', pd); } break;
      case 'artillery': if (dist < d.range && e.cd <= 0) {
        e.cd = d.cd * U.rand(0.8, 1.3);
        const lead = 0.8, tx = tgt.x + (tgt.vx || 0) * lead + U.rand(-50, 50), ty = tgt.y + (tgt.vy || 0) * lead + U.rand(-50, 50), T = 1.3 + dist / 800, r = d.tier >= 3 ? 75 : 58;
        g.projs.push({ lob: true, sx: e.x, sy: e.y, tx, ty, x: e.x, y: e.y, t: 0, T, team: 'e', owner: e, blast: { r, dmg: d.dmg * dmgScale() * 2, pen: 3 }, acid: d.f === 'brood', closes: false, kind: 'lob', vx: 0, vy: 0, life: 99 });
        g.telegraphs.push({ x: tx, y: ty, r, t: T, col: d.f === 'brood' ? 'rgba(170,230,70,0.25)' : 'rgba(255,90,58,0.25)' });
        if (d.f === 'brood') A.play('screech', pd);
      } break;
      case 'charge': if (dist < d.range && dist > 60 && e.hasLos && e.cd <= 0 && facing) { e.cd = d.cd; e.windT = 0.7; e.chargeA = angTo; e.vx = e.vy = 0; } else if (dist < e.r + 20 && e.cd2 <= 0 || (dist < e.r + 20 && e.cd2 == null)) { e.cd2 = 1.4; S.hitTarget(t, d.dmg * 0.5 * dmgScale(), 'melee', e); } if (e.cd2 > 0) e.cd2 -= dt; break;
      case 'flame': if (dist < d.range + 20 && e.hasLos) { e.flaming = true; S.flameCone(e, e.x + Math.cos(e.ang) * e.r, e.y + Math.sin(e.ang) * e.r, e.ang, d.range, d.dmg * dt * dmgScale(), 4, 0.35, 'e'); A.play('flame', pd); } break;
      case 'cannon': {
        if (e.aimT > 0) { e.aimT -= dt; if (e.aimT <= 0) { S.proj({ x: e.x + Math.cos(e.ang) * e.r, y: e.y + Math.sin(e.ang) * e.r, ang: e.ang, speed: 1100, dmg: 0, range: d.range * 1.3, team: 'e', owner: e, kind: 'rocket', blast: { r: 62, dmg: d.dmg * dmgScale() * 2.2, pen: 5 }, closes: false, rad: 6, col: '#ffcf7a' }); S.flashMuzzle(e.x + Math.cos(e.ang) * e.r, e.y + Math.sin(e.ang) * e.r, e.ang, 2.5); A.play('shotHeavy', pd); A.play('boom', pd); } }
        else if (dist < d.range && e.hasLos && facing && e.cd <= 0) { e.cd = d.cd * U.rand(0.8, 1.2); e.aimT = 0.75; }
        break;
      }
      case 'beam': {
        if (e.beamT > 0) {
          e.beamT -= dt;
          if (e.beamT < 1.6) {
            const r = S.enemyBeam(e, e.ang, d.range, d.dmg * dt * dmgScale());
            g.beams.push({ x1: e.x, y1: e.y, x2: r.x, y2: r.y, t: 0.03, col: '#d3c8ff', w: 6 });
          } else g.beams.push({ x1: e.x, y1: e.y, x2: e.x + Math.cos(e.ang) * d.range, y2: e.y + Math.sin(e.ang) * d.range, t: 0.03, col: 'rgba(211,200,255,0.35)', w: 1 });
        } else if (dist < d.range && e.hasLos && e.cd <= 0) { e.cd = d.cd; e.beamT = 2.8; A.play('warp', pd); }
        break;
      }
      case 'strafe': {
        // fly straight through the target and back
        if (!e.run || e.run.done) { e.run = { a: angTo, t: 0, done: false }; }
        e.run.t += dt;
        e.ang = e.run.a; e.vx = Math.cos(e.run.a) * d.speed; e.vy = Math.sin(e.run.a) * d.speed;
        if (dist < 300 && e.cd <= 0 && Math.abs(U.angDiff(e.ang, angTo)) < 0.6) { e.cd = 0.14; S.proj({ x: e.x, y: e.y, ang: e.ang + U.rand(-0.1, 0.1), speed: 700, dmg: d.dmg * dmgScale(), range: 400, team: 'e', owner: e, kind: 'bolt', rad: 5, col: '#c9a8ff', flyHigh: false, dkind: 'arc' }); }
        if (e.run.t > 3.2) e.run.done = true;
        break;
      }
      case 'tentacle': if (dist < d.range && e.cd <= 0) {
        e.cd = d.cd; const tx = tgt.x + (tgt.vx || 0) * 0.5, ty = tgt.y + (tgt.vy || 0) * 0.5;
        g.telegraphs.push({ x: tx, y: ty, r: 34, t: 0.8, col: 'rgba(160,80,110,0.35)' });
        S.at(0.8, () => { S.burst(tx, ty, 14, '#8a4a5a', 160, 0.5, 4); for (const tt of S.targets()) { const p = tPos(tt); if (Math.hypot(p.x - tx, p.y - ty) < 34 + (tt.r || 10)) S.hitTarget(tt, d.dmg * dmgScale(), 'melee', e); } g.spikes = g.spikes || []; g.spikes.push({ x: tx, y: ty, t: 0.6 }); });
      } break;
    }
  }

  function dmgScale() { return 0.85 + G().M.diff * 0.035; }

  function beginCharge(e) { e.chargeT = 1.3; e.chargeHit = new Set(); }
  function moveSpecial(e, dt) {
    const g = G(), d = e.def;
    if (e.leapT > 0) {
      e.leapT -= dt;
      e.x += Math.cos(e.leapA) * 520 * dt; e.y += Math.sin(e.leapA) * 520 * dt; e.ang = e.leapA;
      S.collide(e, e.r);
      if (!e.leapHit) for (const t of S.targets()) { const p = tPos(t); if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + (t.r || 11) + 4) { e.leapHit = true; S.hitTarget(t, d.dmg * dmgScale(), 'melee', e); if (t.kind === 'diver') t.slowT = Math.max(t.slowT, 1.2); break; } }
      return;
    }
    e.chargeT -= dt;
    const sp = 430;
    e.ang = U.turn(e.ang, e.target ? Math.atan2(tPos(e.target).y - e.y, tPos(e.target).x - e.x) : e.ang, 0.5 * dt);
    e.x += Math.cos(e.ang) * sp * dt; e.y += Math.sin(e.ang) * sp * dt;
    e._hitWall = false; S.collide(e, e.r);
    if (Math.random() < 0.5) S.part(e.x - Math.cos(e.ang) * e.r, e.y - Math.sin(e.ang) * e.r, U.rand(-30, 30), U.rand(-30, 30), 0.6, 6, 'rgba(120,100,80,0.5)', { grow: 8, kind: 'smoke' });
    for (const t of S.targets()) {
      if (e.chargeHit.has(t)) continue;
      const p = tPos(t);
      if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + (t.r || 11)) { e.chargeHit.add(t); S.hitTarget(t, d.dmg * dmgScale(), 'melee', e); if (t.kind === 'diver' && t.alive) { t.vx += Math.cos(e.ang) * 500; t.vy += Math.sin(e.ang) * 500; t.proneT = 0.8; } }
    }
    for (const o of G().ehash.query(e.x, e.y, e.r + 20, tmp)) if (o !== e && o.def.tier === 0 && Math.hypot(o.x - e.x, o.y - e.y) < e.r + o.r) S.dmgEnemy(o, 200, 9, null, {});
    if (e._hitWall) { e.chargeT = 0; e.stunT = 1.6; S.shakeAt(e.x, e.y, 5); S.burst(e.x, e.y, 10, '#c9b38a', 140, 0.5, 4); }
    if (e.chargeT <= 0) { e.vx = e.vy = 0; }
  }

  S.enemyBeam = function (e, ang, range, dmg) {
    const g = G(), cx = Math.cos(ang), cy = Math.sin(ang);
    let len = range;
    for (let s = 0; s < range; s += 12) if (S.solidAt(e.x + cx * s, e.y + cy * s)) { len = s; break; }
    for (const t of S.targets()) {
      const p = tPos(t), k = (p.x - e.x) * cx + (p.y - e.y) * cy;
      if (k < 0 || k > len) continue;
      if (Math.hypot(p.x - (e.x + cx * k), p.y - (e.y + cy * k)) < (t.r || 11) + 6) S.hitTarget(t, t.kind === 'sentry' ? dmg * 4 : dmg, 'fire', e);
    }
    if (Math.random() < 0.4) S.area('fire', e.x + cx * len, e.y + cy * len, 22, 3);
    return { x: e.x + cx * len, y: e.y + cy * len };
  };

  // ---------------------------------------------------------------- reinforcement calls
  S.startCall = function (caller) {
    const g = G(), f = g.M.faction;
    g.callCd = Math.max(14, 32 - g.M.diff * 2);
    const call = { x: caller.x, y: caller.y, f, t: f === 'foundry' ? 7 : 5, phase: 'flare' };
    g.calls.push(call);
    const col = f === 'brood' ? '#ff9a3a' : f === 'foundry' ? '#ff3b2f' : '#b39cff';
    for (let i = 0; i < 26; i++) S.part(caller.x + U.rand(-6, 6), caller.y + U.rand(-6, 6), U.rand(-12, 12), U.rand(-60, -20), U.rand(1.5, 3), U.rand(6, 12), col, { grow: 14, drag: 0.6, kind: 'smoke' });
    const nm = f === 'brood' ? 'Bug breach incoming' : f === 'foundry' ? 'Enemy dropship inbound' : 'Rift opening';
    S.msg(nm, '#ff9a6a', 3); A.play('alarm');
  };

  S.updateCalls = function (dt) {
    const g = G();
    for (let i = g.calls.length - 1; i >= 0; i--) {
      const c = g.calls[i];
      c.t -= dt;
      if (c.phase === 'flare' && c.f === 'foundry' && c.t < 3.5 && !c.ship) { c.ship = { x: c.x - 1400, y: c.y - 600, tx: c.x, ty: c.y, t: 0 }; g.dropships.push(c.ship); A.play('jet', Math.hypot(g.player.x - c.x, g.player.y - c.y)); }
      if (c.t <= 0 && c.phase === 'flare') {
        c.phase = 'spawn'; c.t = 0;
        const n = 6 + Math.floor(g.M.diff * 1.2);
        c.queue = S.squad(n, S.heavyChance() * 1.3, true).filter(t => t !== DF.ROSTER[c.f].caller);
        c.gap = c.f === 'foundry' ? 0.15 : 0.35;
        if (c.f === 'brood') { S.decal(c.x, c.y, 50, '#2b2014', 0.7); S.burst(c.x, c.y, 30, 'rgba(110,90,60,0.7)', 200, 1, 8, { grow: 12, kind: 'smoke' }); S.shakeAt(c.x, c.y, 6); }
        if (c.f === 'veil') { g.rifts = g.rifts || []; g.rifts.push({ x: c.x, y: c.y, t: c.queue.length * c.gap + 2 }); A.play('warp'); }
      }
      if (c.phase === 'spawn') {
        c.t -= dt;
        if (c.t <= 0 && c.queue.length) {
          c.t = c.gap;
          const type = c.queue.shift(), a = Math.random() * 6.283, d = U.rand(0, 50);
          const e = S.spawnEnemy(type, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, { state: 'hunt', lastKnown: { x: g.player.x, y: g.player.y }, patrol: true, leash: 9999 });
          if (e && c.f === 'brood') S.burst(e.x, e.y, 6, 'rgba(110,90,60,0.7)', 100, 0.6, 5, { grow: 6, kind: 'smoke' });
        }
        if (!c.queue.length) g.calls.splice(i, 1);
      }
    }
    for (let i = g.dropships.length - 1; i >= 0; i--) { const s = g.dropships[i]; s.t += dt; const k = Math.min(1, s.t / 3.5); s.x = U.lerp(s.tx - 1400, s.tx + (s.t > 5 ? (s.t - 5) * 600 : 0), k < 1 ? k : 1); s.y = U.lerp(s.ty - 600, s.ty, k); if (s.t > 5) { s.x = s.tx + (s.t - 5) * 700; s.y = s.ty - (s.t - 5) * 300; } if (s.t > 8) g.dropships.splice(i, 1); }
  };
})();
