// Dropfall — per-frame update: divers, bots, vehicles, sentries, hazards, objectives, extraction.
'use strict';
(function () {
  const U = DF.U, A = DF.Audio, S = DF.Sim, W = DF.WORLD;
  const tmp = [];
  const G = () => DF.G;
  const ARROWS = ['U', 'D', 'L', 'R'];

  // ---------------------------------------------------------------- diver movement & actions
  function moveDiver(dv, mx, my, sprint, aimDown, dt) {
    const g = G();
    const terr = S.terrainAt(dv.x, dv.y);
    dv.inCover = terr.cover;
    if (terr.lava) dv.burnT = Math.max(dv.burnT, 1);
    let speed = 150 * dv.cls.speed * terr.slow;
    if (g.M.hazard === 'blizzard' && g.storm > 0.5) speed *= 0.88;
    const m = Math.hypot(mx, my);
    dv.sprinting = false;
    if (m > 0.1) {
      if (sprint && dv.stam > 1 && !aimDown && !dv.carrying) { speed *= 1.55; dv.stam -= 20 * dt; dv.stamDelay = 0.8; dv.sprinting = true; }
      if (aimDown) speed *= 0.6;
      if (dv.carrying) speed *= 0.82;
      if (dv.slowT > 0) speed *= 0.55;
      mx /= Math.max(1, m); my /= Math.max(1, m);
    } else { mx = my = 0; }
    if (dv.proneT > 0) speed *= 0.15;
    if (dv.diveT > 0) { dv.diveT -= dt; dv.x += dv.diveVx * dt; dv.y += dv.diveVy * dt; if (dv.diveT <= 0) dv.proneT = 0.35; }
    else {
      const tvx = mx * speed, tvy = my * speed, k = Math.min(1, dt * 12);
      dv.vx = U.lerp(dv.vx, tvx, k); dv.vy = U.lerp(dv.vy, tvy, k);
      dv.x += dv.vx * dt; dv.y += dv.vy * dt;
    }
    S.collide(dv, dv.r);
    dv.walk += Math.hypot(dv.vx, dv.vy) * dt * 0.08;
    // stamina
    dv.stamDelay -= dt;
    if (dv.stamDelay <= 0) dv.stam = Math.min(dv.maxStam, dv.stam + 22 * dt * (dv.passive === 'athlete' ? 1.25 : 1) * (dv.stimT > 0 ? 2 : 1));
  }

  function diverStatus(dv, dt) {
    dv.flash -= dt; dv.invuln -= dt; dv.resolveCd -= dt; dv.slowT -= dt; dv.proneT -= dt; dv.throwCd -= dt; dv.nadeCd -= dt;
    if (dv.burnT > 0) { dv.burnT -= dt; S.dmgDiver(dv, 14 * dt, 'fire'); if (Math.random() < 0.4) S.part(dv.x + U.rand(-6, 6), dv.y + U.rand(-6, 6), 0, -20, 0.4, 3, '#ff9a3a', { glow: true, grow: 4 }); }
    if (dv.stimT > 0) { dv.stimT -= dt; dv.hp = Math.min(dv.maxhp, dv.hp + dv.maxhp * (dv.passive === 'medic' ? 1.1 : 0.55) * (G().mods.has('e3') ? 1.25 : 1) * dt); }
    if (dv.pack) {
      const p = dv.pack;
      if (p.type === 'shield') { p.delay -= dt; p.hit = Math.max(0, (p.hit || 0) - dt); if (p.delay <= 0 && p.hp < p.max) p.hp = Math.min(p.max, p.hp + p.max / DF.BACKPACKS.shield.regen * dt); }
      if (p.type === 'jump') p.cd -= dt;
      if (p.type === 'dog' && p.ammo > 0) dogUpdate(dv, p, dt);
    }
  }

  function dogUpdate(dv, p, dt) {
    const g = G(), d = DF.BACKPACKS.dog;
    p.cd -= dt;
    p.ox = Math.cos(g.t * 1.3 + dv.id) * 26; p.oy = Math.sin(g.t * 1.3 + dv.id) * 26;
    const x = dv.x + p.ox, y = dv.y + p.oy;
    let best = null, bd = d.range;
    for (const e of g.ehash.query(x, y, d.range, tmp)) { if (e.dead) continue; const dd = Math.hypot(e.x - x, e.y - y); if (dd < bd && S.los(x, y, e.x, e.y)) { bd = dd; best = e; } }
    if (best) {
      p.ang = Math.atan2(best.y - y, best.x - x);
      if (p.cd <= 0) { p.cd = 60 / d.rpm; p.ammo--; S.proj({ x, y, ang: p.ang + U.rand(-0.06, 0.06), speed: 1300, dmg: d.dmg, pen: d.pen, range: d.range, owner: dv, kind: 'bullet', col: '#ffe9a8' }); A.play('pistol', Math.hypot(g.player.x - x, g.player.y - y)); }
    }
  }

  S.useStim = function (dv) {
    if (dv.stims <= 0 || dv.hp >= dv.maxhp && dv.stimT <= 0) return;
    dv.stims--; dv.stimT = dv.passive === 'medic' ? 2.5 : 2; dv.burnT = 0; dv.slowT = 0; dv.stam = dv.maxStam;
    if (dv.isPlayer) A.play('stim');
    S.part(dv.x, dv.y, 0, -30, 0.6, 6, '#7fffd0', { glow: true, grow: 10 });
  };

  S.throwNade = function (dv, tx, ty) {
    if (dv.nades <= 0 || dv.nadeCd > 0) return;
    dv.nades--; dv.nadeCd = 0.6;
    const def = dv.gdef;
    S.throwObj(dv, 'nade', tx, ty, { def, fuse: def.fuse != null && !def.impact ? def.fuse : null });
  };

  S.useBackpack = function (dv, tx, ty) {
    const p = dv.pack; if (!p) return;
    if (p.type === 'jump' && p.cd <= 0 && !dv.veh) {
      p.cd = DF.BACKPACKS.jump.cd;
      let dx = tx - dv.x, dy = ty - dv.y; const d = Math.hypot(dx, dy) || 1; const L = Math.min(260, d);
      dv.diveVx = dx / d * L / 0.5; dv.diveVy = dy / d * L / 0.5; dv.diveT = 0.5; dv.jumping = 0.5; dv.invuln = 0.3;
      S.burst(dv.x, dv.y, 14, 'rgba(200,200,200,0.6)', 120, 0.6, 5, { grow: 8, kind: 'smoke' });
      A.play('jet');
    }
    if (p.type === 'supply' && p.charges > 0) { p.charges--; S.refill(dv); }
  };

  S.refill = function (dv) {
    for (const w of dv.weapons) if (w && !w.d.infinite) { w.spare = w.d.mags + (dv.passive === 'siege' ? 1 : 0) + (w.d.slot === 'primary' && G().mods.has('e2') ? 1 : 0); if (w.d.slot === 'support' && w.id === 'os1') w.spare = 1; if (w.mag <= 0 && w.d.kind !== 'beam') w.mag = w.d.mag; }
    dv.nades = dv.maxNades; dv.stims = Math.max(dv.stims, dv.maxStims);
    if (dv.pack && dv.pack.ammoFor && dv.weapons[2] && dv.weapons[2].id === dv.pack.ammoFor) dv.weapons[2].spare += 2;
    if (dv.isPlayer) A.play('pickup');
  };

  // ---------------------------------------------------------------- interaction
  S.interactable = function (dv) {
    const g = G();
    if (!dv.alive) return null;
    if (dv.veh) return { label: 'Exit ' + DF.VEHICLES[dv.veh.vt].name, act: () => S.exitVehicle(dv) };
    let best = null, bd = 46;
    const consider = (d, label, act) => { if (d < bd) { bd = d; best = { label, act }; } };
    for (const it of g.items) {
      if (!it.alive) continue;
      const d = Math.hypot(it.x - dv.x, it.y - dv.y);
      const away = () => { const a = Math.atan2(dv.y - it.y, dv.x - it.x) || 0; return { x: dv.x + Math.cos(a) * 34, y: dv.y + Math.sin(a) * 34 }; };
      if (it.kind === 'weapon') consider(d, 'Pick up ' + it.w.d.name, () => { if (dv.weapons[2]) { const q = away(); S.item('weapon', q.x, q.y, { w: dv.weapons[2] }); } dv.weapons[2] = it.w; dv.cur = 2; it.alive = false; A.play('pickup'); });
      else if (it.kind === 'pack') consider(d, 'Equip ' + it.pack.name, () => { if (dv.pack) { const q = away(); S.item('pack', q.x, q.y, { pack: dv.pack }); } dv.pack = it.pack; it.alive = false; A.play('pickup'); });
      else if (it.kind === 'supply') consider(d, 'Take supplies (' + it.charges + ' left)', () => { S.refill(dv); it.charges--; if (it.charges <= 0) it.alive = false; });
      else if (it.kind === 'blackbox' && !dv.carrying) consider(d, 'Carry flight recorder', () => { dv.carrying = 'blackbox'; it.alive = false; A.play('pickup'); if (dv.weapons[dv.cur] && !dv.weapons[dv.cur].d.onehand) dv.cur = 1; });
    }
    for (const v of g.vehicles) if (v.alive && !v.driver) consider(Math.hypot(v.x - dv.x, v.y - dv.y) - v.r + 20, 'Enter ' + DF.VEHICLES[v.vt].name, () => S.enterVehicle(dv, v));
    for (const st of g.M.structs) {
      const d = Math.hypot(st.x - dv.x, st.y - dv.y) - st.r + 20;
      if (d > 60) continue;
      if (st.type === 'terminal' && st.state === 'idle') consider(d, 'Power up the relay beacon', () => S.startTask(st, 3, 5, () => { st.state = 'defend'; g.focus = { x: st.x, y: st.y, active: true }; S.msg('Relay powered. Hold the area until launch.', '#ffd27a', 4); A.play('objective'); }));
      if (st.type === 'radar' && st.state === 'idle') consider(d, 'Sync radar uplink', () => S.startTask(st, 1, 4, () => { st.state = 'done'; G().stats.side++; S.reveal(); S.msg('Radar synced. Points of interest marked.', '#9fe07a', 4); A.play('objective'); }));
      if (st.type === 'shelter' && st.state === 'closed') consider(d, 'Open the shelter doors', () => S.startTask(st, 1, 6, () => { st.state = 'open'; st.releaseT = 1; g.focus = { x: st.x, y: st.y, active: true }; S.msg('Shelter open. Escort the colonists to the shuttle.', '#ffd27a', 4); A.play('objective'); }));
      if (st.type === 'extract' && g.M.extract.state === 'idle') consider(d, mainDone() ? 'Call extraction' : 'Call extraction (main objectives first)', () => {
        if (!mainDone()) { S.msg('Complete the main objectives before calling extraction.', '#ff9a8a', 3); A.play('keyBad'); return; }
        S.startTask(st, 1, 4, () => { g.M.extract.state = 'calling'; g.M.extract.t = 45 + g.M.diff * 4; g.focus = { x: st.x, y: st.y, active: true }; S.msg('Dropship inbound. Hold the landing zone.', '#ffd27a', 4); A.play('alarm'); });
      });
      if (st.type === 'extract' && g.M.extract.state === 'boarding' && Math.hypot(st.x - dv.x, st.y - dv.y) < g.M.extract.r) consider(0, 'Board the dropship', () => { g.M.extract.state = 'leaving'; g.M.extract.t = 3; dv.boarded = true; S.msg('Boarding. Dust off in 3.', '#9fe07a', 3); });
    }
    for (const n of g.novas) if (n.alive && n.state === 'idle') consider(Math.hypot(n.x - dv.x, n.y - dv.y), 'Arm the Nova Bomb', () => S.startTask(n, 1, 6, () => { n.state = 'armed'; n.t = 15; S.msg('Nova Bomb armed. 15 seconds. Get clear!', '#ff6b5a', 4); A.play('alarm'); }));
    return best;
  };

  S.startTask = function (target, n, len, done) {
    const seqs = [];
    for (let i = 0; i < n; i++) { let s = ''; for (let k = 0; k < len; k++) s += U.pick(ARROWS); seqs.push(s); }
    G().codeTask = { target, seqs, idx: 0, pos: 0, done };
    G().menu = false; G().code = '';
  };
  S.taskInput = function (dir) {
    const g = G(), t = g.codeTask; if (!t) return;
    const s = t.seqs[t.idx];
    if (s[t.pos] === dir) { t.pos++; A.play('key'); if (t.pos >= s.length) { t.idx++; t.pos = 0; if (t.idx >= t.seqs.length) { g.codeTask = null; t.done(); } else A.play('callReady'); } }
    else { t.pos = 0; A.play('keyBad'); t.err = 0.3; }
  };

  function mainDone() { return G().M.objectives.every(o => o.done); }
  S.mainDone = mainDone;

  // ---------------------------------------------------------------- player
  S.updatePlayer = function (P, inp, dt) {
    const g = G();
    diverStatus(P, dt);
    if (P.veh) { S.driveVehicle(P.veh, inp, dt); P.x = P.veh.x; P.y = P.veh.y; P.ang = P.veh.aim; return; }
    if (g.codeTask) { P.vx *= 0.8; P.vy *= 0.8; if (Math.hypot(g.codeTask.target.x - P.x, g.codeTask.target.y - P.y) > 90) g.codeTask = null; return; }
    const menuWASD = g.menu && inp.menuByQ;
    moveDiver(P, menuWASD ? 0 : inp.mx, menuWASD ? 0 : inp.my, inp.sprint, inp.aimDown, dt);
    P.aimDown = inp.aimDown;
    P.ang = Math.atan2(inp.aimY - P.y, inp.aimX - P.x);
    if (inp.dive && P.diveT <= 0 && P.proneT <= 0 && P.stam > 12) {
      const m = Math.hypot(inp.mx, inp.my);
      const a = m > 0.1 ? Math.atan2(inp.my, inp.mx) : P.ang;
      P.diveVx = Math.cos(a) * 330; P.diveVy = Math.sin(a) * 330; P.diveT = 0.35; P.stam -= 12; P.stamDelay = 0.6;
    }
    if (inp.swap != null && P.weapons[inp.swap] && P.cur !== inp.swap) { const w = P.weapons[inp.swap]; if (!P.carrying || w.d.onehand || w.d.slot === 'secondary') { P.cur = inp.swap; A.play('reload'); } }
    if (inp.cycle) { for (let k = 1; k <= 3; k++) { const n = (P.cur + k) % 3; if (P.weapons[n]) { P.cur = n; A.play('reload'); break; } } }
    const w = P.weapons[P.cur] || P.weapons[0];
    if (g.ready) {
      if (inp.firePressed) { S.throwBeacon(inp.aimX, inp.aimY); inp.firePressed = false; }
      if (w) S.fireWeapon(P, w, false, false, inp.aimX, inp.aimY, dt);
    } else if (w && P.diveT <= 0) S.fireWeapon(P, w, inp.fire && !g.menu, inp.fireReleased, inp.aimX, inp.aimY, dt);
    for (const o of P.weapons) if (o && o !== w && o.reloadT > 0) { o.reloadT = 0; } // switching cancels a reload
    if (inp.reload && w) S.reload(P, w);
    if (inp.nade) S.throwNade(P, inp.aimX, inp.aimY);
    if (inp.stim) S.useStim(P);
    if (inp.pack) S.useBackpack(P, inp.aimX, inp.aimY);
    if (inp.drop && P.carrying) { S.item('blackbox', P.x, P.y + 14, {}); P.carrying = null; }
    if (inp.interact) { const it = S.interactable(P); if (it) it.act(); }
  };

  // ---------------------------------------------------------------- vehicles
  S.driveVehicle = function (v, inp, dt) {
    const g = G(), d = v.d;
    v.flash -= dt;
    if (v.vt === 'buggy') {
      const thr = -inp.my, steer = inp.mx;
      const fwd = Math.cos(v.ang) * v.vx + Math.sin(v.ang) * v.vy;
      v.speed = U.lerp(v.speed, thr * d.speed * (thr < 0 ? 0.45 : 1), dt * (thr ? 1.6 : 0.8));
      v.ang += steer * dt * 2.4 * U.clamp(Math.abs(fwd) / 120, 0, 1) * Math.sign(fwd || 1);
      const tvx = Math.cos(v.ang) * v.speed, tvy = Math.sin(v.ang) * v.speed;
      v.vx = U.lerp(v.vx, tvx, dt * 4); v.vy = U.lerp(v.vy, tvy, dt * 4);
      const terr = S.terrainAt(v.x, v.y);
      v.x += v.vx * dt * terr.slow; v.y += v.vy * dt * terr.slow;
      v._hitWall = false; S.collide(v, v.r);
      if (v._hitWall && Math.abs(v.speed) > 140) { S.dmgVehicle(v, Math.abs(v.speed) * 0.25, 9, 'crash'); v.speed *= -0.3; v.vx *= -0.3; v.vy *= -0.3; S.shakeAt(v.x, v.y, 5); }
      // ramming
      const sp = Math.hypot(v.vx, v.vy);
      if (sp > 90) for (const e of g.ehash.query(v.x, v.y, v.r + 40, tmp)) if (!e.dead && !e.def.flying && Math.hypot(e.x - v.x, e.y - v.y) < v.r + e.r) { if (e.def.tier === 0) S.dmgEnemy(e, 400, 9, null, {}); else if (e.def.tier === 1) { S.dmgEnemy(e, sp * 0.8, 9, null, {}); v.speed *= 0.5; } else { v.speed *= -0.3; S.dmgVehicle(v, 60, 9, 'crash'); } }
      v.aim = Math.atan2(inp.aimY - v.y, inp.aimX - v.x);
      if (sp > 20) A.play('engine');
      // turret: aimed by the driver when firing, otherwise the gunner picks targets
      v.tcd -= dt;
      let ta = null;
      if (inp.fire) ta = v.aim;
      else { let best = null, bd = d.turret.range; for (const e of g.ehash.query(v.x, v.y, bd, tmp)) { if (e.dead) continue; const dd = Math.hypot(e.x - v.x, e.y - v.y); if (dd < bd && S.los(v.x, v.y, e.x, e.y)) { bd = dd; best = e; } } if (best) ta = Math.atan2(best.y - v.y, best.x - v.x); }
      if (ta != null) { v.turret = U.turn(v.turret, ta, 6 * dt); if (v.tcd <= 0 && Math.abs(U.angDiff(v.turret, ta)) < 0.2) { v.tcd = 60 / d.turret.rpm; S.proj({ x: v.x + Math.cos(v.turret) * 14, y: v.y + Math.sin(v.turret) * 14, ang: v.turret + U.rand(-0.04, 0.04), speed: d.turret.speed, dmg: d.turret.dmg, pen: d.turret.pen, range: d.turret.range, owner: g.player, kind: 'bullet', col: '#ffe9a8' }); A.play('shotHeavy'); S.noise(v.x, v.y, 450); } }
      return;
    }
    // exosuit
    const m = Math.hypot(inp.mx, inp.my);
    const sp = d.speed * S.terrainAt(v.x, v.y).slow;
    v.vx = U.lerp(v.vx, m > 0.1 ? inp.mx / Math.max(1, m) * sp : 0, dt * 5); v.vy = U.lerp(v.vy, m > 0.1 ? inp.my / Math.max(1, m) * sp : 0, dt * 5);
    v.x += v.vx * dt; v.y += v.vy * dt; S.collide(v, v.r);
    v.walk += Math.hypot(v.vx, v.vy) * dt * 0.05;
    if (Math.hypot(v.vx, v.vy) > 20) { v.ang = U.turn(v.ang, Math.atan2(v.vy, v.vx), dt * 3); A.play('servo'); }
    v.aim = U.turn(v.aim, Math.atan2(inp.aimY - v.y, inp.aimX - v.x), dt * 5);
    for (const e of g.ehash.query(v.x, v.y, v.r + 20, tmp)) if (!e.dead && e.def.tier === 0 && !e.def.flying && Math.hypot(e.x - v.x, e.y - v.y) < v.r + e.r - 4) S.dmgEnemy(e, 300 * dt * 10, 9, null, {});
    const trig = [inp.fire, inp.aimDown];
    for (let i = 0; i < 2; i++) {
      v.cds[i] -= dt;
      const wd = d.weapons[i];
      if (!trig[i] || v.cds[i] > 0 || v.ammo[i] <= 0) continue;
      v.cds[i] = 60 / wd.rpm; v.ammo[i]--;
      const side = i === 0 ? -1 : 1, ox = v.x + Math.cos(v.aim + side * 1.2) * 16, oy = v.y + Math.sin(v.aim + side * 1.2) * 16;
      S.proj({ x: ox, y: oy, ang: v.aim + U.rand(-1, 1) * wd.spread * Math.PI / 360, speed: wd.speed, dmg: wd.dmg, pen: wd.pen, range: wd.range, owner: g.player, kind: wd.kind, blast: wd.blast, closes: !!wd.blast, col: wd.kind === 'rocket' ? '#ffcf7a' : '#ffe9a8' });
      S.flashMuzzle(ox, oy, v.aim, wd.kind === 'rocket' ? 1.5 : 1);
      A.play(wd.kind === 'rocket' ? 'rocket' : 'shotHeavy'); S.noise(v.x, v.y, 500);
    }
  };

  // ---------------------------------------------------------------- squad bots
  S.updateBot = function (b, dt) {
    const g = G(), P = g.player, ai = b.ai;
    diverStatus(b, dt);
    if (b.veh) { b.x = b.veh.x; b.y = b.veh.y; return; }
    ai.t -= dt;
    if (ai.t <= 0) {
      ai.t = 0.3;
      let best = null, bd = 560;
      for (const e of g.ehash.query(b.x, b.y, 560, tmp)) { if (e.dead) continue; const d = Math.hypot(e.x - b.x, e.y - b.y) - (e.def.tier >= 2 ? 120 : 0); if (d < bd && S.los(b.x, b.y, e.x, e.y)) { bd = d; best = e; } }
      ai.target = best;
    }
    if (ai.target && ai.target.dead) ai.target = null;
    // where to stand
    let gx = b.x, gy = b.y;
    const ex = g.M.extract;
    if (ex.state === 'calling' || ex.state === 'boarding' || ex.state === 'leaving' || ex.state === 'landing') { gx = ex.x + Math.cos(b.slot * 2.1) * 50; gy = ex.y + Math.sin(b.slot * 2.1) * 50; }
    else if (P.alive) {
      const a = P.ang + Math.PI + (b.slot - 1) * 0.9;
      gx = P.x + Math.cos(a) * 70; gy = P.y + Math.sin(a) * 70;
    }
    let mx = gx - b.x, my = gy - b.y; const md = Math.hypot(mx, my);
    if (md < 30) { mx = my = 0; } else { mx /= md; my /= md; }
    if (ai.target) { const dd = Math.hypot(ai.target.x - b.x, ai.target.y - b.y); if (dd < 90 && ai.target.def.atk === 'melee') { mx -= (ai.target.x - b.x) / dd; my -= (ai.target.y - b.y) / dd; } }
    // steer around rocks
    if (md > 30 && S.solidAt(b.x + mx * 26, b.y + my * 26)) { const a = Math.atan2(my, mx) + ai.strafe * 1.1; mx = Math.cos(a); my = Math.sin(a); }
    moveDiver(b, mx, my, md > 260, false, dt);
    if (b._lastX != null && Math.hypot(b.x - b._lastX, b.y - b._lastY) < 0.2 && md > 40) { ai.stuck = (ai.stuck || 0) + dt; if (ai.stuck > 1) { ai.strafe = -ai.strafe; ai.stuck = 0; } }
    b._lastX = b.x; b._lastY = b.y;
    // teleport back if hopelessly far behind
    if (P.alive && !P.veh && Math.hypot(P.x - b.x, P.y - b.y) > 1300) { const p = S.freeSpot(P.x + U.rand(-80, 80), P.y + U.rand(-80, 80), 12); b.x = p.x; b.y = p.y; }
    // shoot
    const w = b.weapons[b.cur] || b.weapons[0];
    if (ai.target) {
      const t = ai.target, lead = Math.hypot(t.x - b.x, t.y - b.y) / 1400;
      const jitter = 14;
      const tx = t.x + t.vx * lead + U.rand(-jitter, jitter), ty = t.y + t.vy * lead + U.rand(-jitter, jitter);
      b.ang = U.turn(b.ang, Math.atan2(ty - b.y, tx - b.x), dt * 8);
      // hold fire if the player is in the way
      let blocked = false;
      if (P.alive && !P.veh) { const k = (P.x - b.x) * Math.cos(b.ang) + (P.y - b.y) * Math.sin(b.ang); if (k > 0 && k < Math.hypot(t.x - b.x, t.y - b.y) && Math.hypot(P.x - (b.x + Math.cos(b.ang) * k), P.y - (b.y + Math.sin(b.ang) * k)) < 16) blocked = true; }
      if (w) S.fireWeapon(b, w, !blocked && Math.abs(U.angDiff(b.ang, Math.atan2(ty - b.y, tx - b.x))) < 0.15, false, b.x + Math.cos(b.ang) * 300, b.y + Math.sin(b.ang) * 300, dt);
      // grenade into crowds
      ai.nadeT -= dt;
      if (ai.nadeT <= 0 && b.nades > 0) {
        const d = Math.hypot(t.x - b.x, t.y - b.y);
        const crowd = g.ehash.query(t.x, t.y, 80, tmp).filter(e => !e.dead).length;
        const playerNear = P.alive && Math.hypot(P.x - t.x, P.y - t.y) < 110;
        if (d > 120 && d < 260 && (crowd >= 4 || t.def.tier >= 1) && !playerNear) { S.throwNade(b, t.x, t.y); ai.nadeT = U.rand(8, 14); }
      }
    } else {
      if (w) { S.fireWeapon(b, w, false, false, b.x, b.y, dt); if (w.mag < w.d.mag * 0.5) S.reload(b, w); }
      if (Math.hypot(b.vx, b.vy) > 10) b.ang = U.turn(b.ang, Math.atan2(b.vy, b.vx), dt * 5);
      // close nearby spawners with grenades
      ai.nadeT -= dt;
      if (ai.nadeT <= 0 && b.nades > 0) {
        for (const st of g.M.structs) if (st.type === 'spawner' && st.alive && Math.hypot(st.x - b.x, st.y - b.y) < 240 && Math.hypot(st.x - b.x, st.y - b.y) > 90 && !(P.alive && Math.hypot(P.x - st.x, P.y - st.y) < 100)) { S.throwNade(b, st.x, st.y); ai.nadeT = 6; break; }
      }
    }
    if (w && w.mag <= 0) S.reload(b, w);
    if (b.hp < b.maxhp * 0.4 && b.stims > 0 && b.stimT <= 0) S.useStim(b);
    // pick up supplies when low
    for (const it of g.items) if (it.alive && it.kind === 'supply' && Math.hypot(it.x - b.x, it.y - b.y) < 40 && w && w.spare <= 1) { S.refill(b); it.charges--; if (it.charges <= 0) it.alive = false; }
  };

  // ---------------------------------------------------------------- sentries
  S.updateSentries = function (dt) {
    const g = G();
    for (let i = g.sentries.length - 1; i >= 0; i--) {
      const s = g.sentries[i], d = s.d;
      s.flash -= dt;
      if (!s.alive) { g.sentries.splice(i, 1); continue; }
      if (s.st === 'dome') { s.life -= dt; if (s.life <= 0 || s.hp <= 0) { s.alive = false; } continue; }
      if (s.ammo <= 0) { s.alive = false; S.boom(s.x, s.y, 30, 60, 2, { closes: false }); continue; }
      s.cd -= dt;
      s.think = (s.think || 0) - dt;
      if (s.think <= 0) {
        s.think = 0.25;
        let best = null, bs = -1e9;
        for (const e of g.ehash.query(s.x, s.y, d.range, tmp)) {
          if (e.dead) continue;
          const dist = Math.hypot(e.x - s.x, e.y - s.y); if (dist > d.range) continue;
          if (!d.indirect && !S.los(s.x, s.y, e.x, e.y)) continue;
          let sc = -dist; if (d.prefHeavy) sc += e.def.tier * 400;
          if (d.indirect) sc = (g.ehash.query(e.x, e.y, 70, tmp.slice()).length) * 100 - dist * 0.1;
          if (sc > bs) { bs = sc; best = e; }
        }
        s.target = best;
      }
      const t = s.target;
      if (!t || t.dead) { s.spin = Math.max(0, s.spin - dt); continue; }
      const ta = Math.atan2(t.y - s.y, t.x - s.x);
      s.ang = U.turn(s.ang, ta, dt * (d.kind === 'rocket' ? 3 : 7));
      if (Math.abs(U.angDiff(s.ang, ta)) > 0.15) continue;
      if (s.st === 'gatling') { s.spin = Math.min(1, s.spin + dt * 1.5); if (s.spin < 0.6) continue; }
      if (d.kind === 'flame') { s.ammo -= dt * 40; S.flameCone(s, s.x, s.y, s.ang, d.range, d.dps * dt, d.pen, 0.3); A.play('flame'); continue; }
      if (s.cd > 0) continue;
      s.cd = 60 / d.rpm; s.ammo--;
      const pd = Math.hypot(g.player.x - s.x, g.player.y - s.y);
      if (d.kind === 'bullet') { S.proj({ x: s.x + Math.cos(s.ang) * 16, y: s.y + Math.sin(s.ang) * 16, ang: s.ang + U.rand(-0.04, 0.04), speed: 1500, dmg: d.dmg, pen: d.pen, range: d.range, owner: s, kind: 'bullet', col: '#ffe9a8' }); A.play('shot', pd); S.flashMuzzle(s.x + Math.cos(s.ang) * 16, s.y + Math.sin(s.ang) * 16, s.ang, 0.8); }
      else if (d.kind === 'rocket') { S.proj({ x: s.x, y: s.y, ang: s.ang, speed: s.st === 'rocket' ? 900 : 1300, dmg: d.dmg, pen: d.pen, range: d.range, owner: s, kind: 'rocket', blast: d.blast, closes: true, homing: s.st === 'rocket' ? t : null, col: '#ffcf7a' }); A.play(s.st === 'rocket' ? 'rocket' : 'shotHeavy', pd); }
      else if (d.kind === 'mortar') {
        const tx = t.x + t.vx * 1.5 + U.rand(-30, 30), ty = t.y + t.vy * 1.5 + U.rand(-30, 30), T = 1.6;
        g.projs.push({ lob: true, sx: s.x, sy: s.y, tx, ty, x: s.x, y: s.y, t: 0, T, team: 'd', owner: g.player, blast: d.blast, stunArea: d.stun, closes: true, kind: 'lob', vx: 0, vy: 0, life: 99 });
        g.telegraphs.push({ x: tx, y: ty, r: (d.blast || d.stun).r, t: T, col: d.stun ? 'rgba(150,210,255,0.2)' : 'rgba(255,200,90,0.18)' });
        A.play('shotHeavy', pd);
      } else if (d.kind === 'arc') {
        S.arcChain(s.x, s.y - 10, s.ang, d.range, d.dmg, d.pen, 3, s);
        // tesla spires do not care whose side you are on
        for (const dv of g.divers) if (dv.alive && !dv.veh && Math.hypot(dv.x - s.x, dv.y - s.y) < 70 && Math.random() < 0.5) { g.beams.push({ x1: s.x, y1: s.y - 10, x2: dv.x, y2: dv.y, t: 0.1, col: '#bff0ff', w: 2, arc: true }); S.dmgDiver(dv, 80, 'arc'); }
        A.play('arc', pd);
      }
    }
  };

  // ---------------------------------------------------------------- areas, mines, pods, beacons, lasers
  S.updateWorldFx = function (dt) {
    const g = G();
    for (let i = g.areas.length - 1; i >= 0; i--) {
      const a = g.areas[i];
      a.t -= dt; a.tick -= dt;
      if (a.t <= 0) { g.areas.splice(i, 1); continue; }
      if (a.kind === 'fire' && Math.random() < a.r / 120) S.part(a.x + U.rand(-a.r, a.r) * 0.7, a.y + U.rand(-a.r, a.r) * 0.7, 0, -30, 0.5, U.rand(3, 7), Math.random() < 0.5 ? '#ff9a3a' : '#ffd36a', { glow: true, grow: 6, kind: 'flame' });
      if (a.tick > 0) continue;
      a.tick = 0.2;
      if (a.kind === 'fire') {
        for (const e of g.ehash.query(a.x, a.y, a.r, tmp)) if (!e.dead && !e.def.flying && Math.hypot(e.x - a.x, e.y - a.y) < a.r) { S.dmgEnemy(e, 50 * 0.2, 9, null, { fire: true }); e.burnT = Math.max(e.burnT, 2); }
        for (const d of g.divers) if (d.alive && !d.veh && Math.hypot(d.x - a.x, d.y - a.y) < a.r) { d.burnT = Math.max(d.burnT, 1.5); }
      } else if (a.kind === 'gas') {
        for (const e of g.ehash.query(a.x, a.y, a.r, tmp)) if (!e.dead && Math.hypot(e.x - a.x, e.y - a.y) < a.r) { S.dmgEnemy(e, 80 * 0.2, 9, null, { ignoreArmor: true, ignoreShield: true }); e.gasT = 2; if (Math.random() < 0.3) { e.state = 'idle'; e.wander = { x: e.x + U.rand(-100, 100), y: e.y + U.rand(-100, 100) }; } }
        for (const d of g.divers) if (d.alive && !d.veh && Math.hypot(d.x - a.x, d.y - a.y) < a.r) S.dmgDiver(d, 20 * 0.2, 'gas');
      }
    }
    for (let i = g.mines.length - 1; i >= 0; i--) {
      const m = g.mines[i];
      if (!m.alive) { g.mines.splice(i, 1); continue; }
      if (!m.armed) { m.armT -= dt; if (m.armT <= 0) m.armed = true; continue; }
      const heavyOnly = m.type === 'at';
      for (const e of g.ehash.query(m.x, m.y, 40, tmp)) if (!e.dead && !e.def.flying && (!heavyOnly || e.def.tier >= 1) && Math.hypot(e.x - m.x, e.y - m.y) < e.r + 8) { S.mineGo(m); break; }
      if (m.alive && !heavyOnly) for (const d of g.divers) if (d.alive && !d.veh && d.diveT <= 0 && !d.jumping && Math.hypot(d.x - m.x, d.y - m.y) < 10) { S.mineGo(m); break; }
      if (m.alive) for (const v of g.vehicles) if (v.alive && Math.hypot(v.x - m.x, v.y - m.y) < v.r) { S.mineGo(m); break; }
    }
    for (let i = g.pods.length - 1; i >= 0; i--) { const p = g.pods[i]; p.t -= dt; if (p.t <= 0) { g.pods.splice(i, 1); S.podLand(p); } }
    for (let i = g.beacons.length - 1; i >= 0; i--) {
      const b = g.beacons[i]; b.t -= dt;
      if (b.t <= 0) { g.beacons.splice(i, 1); if (!b.pod) S.beaconFire(b); }
    }
    for (let i = g.lasers.length - 1; i >= 0; i--) {
      const L = g.lasers[i]; L.t -= dt;
      if (L.t <= 0) { g.lasers.splice(i, 1); continue; }
      if (!L.target || L.target.dead || Math.hypot(L.target.x - L.x, L.target.y - L.y) > 380) {
        L.target = null; let bd = 380;
        for (const e of g.ehash.query(L.x, L.y, 380, tmp)) { if (e.dead) continue; const d = Math.hypot(e.x - L.x, e.y - L.y) - e.def.tier * 60; if (d < bd) { bd = d; L.target = e; } }
      }
      if (L.target) { const a = Math.atan2(L.target.y - L.y, L.target.x - L.x), d = Math.hypot(L.target.x - L.x, L.target.y - L.y); const s = Math.min(d, 170 * dt); L.x += Math.cos(a) * s; L.y += Math.sin(a) * s; }
      for (const e of g.ehash.query(L.x, L.y, 60, tmp)) if (!e.dead && Math.hypot(e.x - L.x, e.y - L.y) < 26 + e.r) S.dmgEnemy(e, 1400 * dt, 7, null, { src: g.player, ignoreShield: false, energy: true });
      for (const d of g.divers) if (d.alive && Math.hypot(d.x - L.x, d.y - L.y) < 26) S.dmgDiver(d, 400 * dt, 'fire');
      if (Math.random() < 0.6) S.part(L.x + U.rand(-10, 10), L.y + U.rand(-10, 10), U.rand(-80, 80), U.rand(-80, 80), 0.3, 3, '#ffb0a0', { glow: true });
      if (Math.random() < 0.15) S.decal(L.x, L.y, 14, '#1e1a17', 0.3);
    }
    for (let i = g.flyovers.length - 1; i >= 0; i--) { const f = g.flyovers[i]; f.t -= dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.t <= 0) g.flyovers.splice(i, 1); }
    for (let i = g.telegraphs.length - 1; i >= 0; i--) { g.telegraphs[i].t -= dt; if (g.telegraphs[i].t <= 0) g.telegraphs.splice(i, 1); }
    for (let i = g.beams.length - 1; i >= 0; i--) { g.beams[i].t -= dt; if (g.beams[i].t <= 0) g.beams.splice(i, 1); }
    for (let i = g.flashes.length - 1; i >= 0; i--) { g.flashes[i].t -= dt; if (g.flashes[i].t <= 0) g.flashes.splice(i, 1); }
    if (g.spikes) for (let i = g.spikes.length - 1; i >= 0; i--) { g.spikes[i].t -= dt; if (g.spikes[i].t <= 0) g.spikes.splice(i, 1); }
    if (g.rifts) for (let i = g.rifts.length - 1; i >= 0; i--) { g.rifts[i].t -= dt; if (g.rifts[i].t <= 0) g.rifts.splice(i, 1); }
    if (g.corpses) for (let i = g.corpses.length - 1; i >= 0; i--) { g.corpses[i].t -= dt; if (g.corpses[i].t <= 0) g.corpses.splice(i, 1); }
    for (let i = g.parts.length - 1; i >= 0; i--) {
      const p = g.parts[i]; p.life -= dt;
      if (p.life <= 0) { g.parts.splice(i, 1); continue; }
      const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; p.x += p.vx * dt; p.y += p.vy * dt; p.size += p.grow * dt;
    }
    for (let i = g.items.length - 1; i >= 0; i--) {
      const it = g.items[i]; it.t += dt;
      if (!it.alive) { g.items.splice(i, 1); continue; }
      // loose pickups that are collected by walking over them
      if (it.kind === 'sample' || it.kind === 'shard' || it.kind === 'medal' || it.kind === 'credit') {
        for (const d of g.divers) if (d.alive && Math.hypot(d.x - it.x, d.y - it.y) < 26) {
          it.alive = false; A.play('pickup');
          if (it.kind === 'sample') { g.stats.samples[it.tier] += it.n; S.msg('+' + it.n + ' ' + ({ c: 'common', r: 'rare', s: 'super' })[it.tier] + ' sample' + (it.n > 1 ? 's' : ''), '#9fd8ff', 2); }
          if (it.kind === 'shard') { g.stats.shards += it.n; S.msg('+' + it.n + ' Shards', '#c9a8ff', 2); }
          if (it.kind === 'medal') { g.stats.medals += it.n; S.msg('+' + it.n + ' Medals', '#ffd27a', 2); }
          if (it.kind === 'credit') { g.stats.credits += it.n; S.msg('+' + it.n + ' Credits', '#e8e2c8', 2); }
          break;
        }
      }
    }
  };

  // ---------------------------------------------------------------- objectives, POIs, side objectives, hazards
  S.updateObjectives = function (dt) {
    const g = G(), M = g.M, P = g.player;
    for (const o of M.objectives) {
      if (o.done || o.failed) continue;
      if (o.type === 'eliminate') { if (o.boss && o.boss.dead) complete(o, 'Target eliminated'); }
      if (o.type === 'purge') { if (o.outpost.cleared) complete(o, null); }
      if (o.type === 'beacon') {
        const t = o.term;
        if (t.state === 'defend') {
          const near = g.divers.some(d => d.alive && Math.hypot(d.x - t.x, d.y - t.y) < 280);
          if (near) t.holdT += dt;
          o.progress = t.holdT / t.need;
          g.waveT -= dt;
          if (g.waveT <= 0) { g.waveT = Math.max(9, 20 - M.diff); S.wave(t.x, t.y, 4 + M.diff); }
          if (t.holdT >= t.need) { t.state = 'launch'; t.launchT = 3; A.play('rocket'); g.focus = null; }
        }
        if (t.state === 'launch') { t.launchT -= dt; S.part(t.x + U.rand(-5, 5), t.y + U.rand(-5, 5), U.rand(-40, 40), U.rand(-40, 40), 1, 8, 'rgba(220,210,200,0.6)', { grow: 16, kind: 'smoke' }); if (t.launchT <= 0) { t.state = 'done'; complete(o, 'Relay beacon launched'); } }
      }
      if (o.type === 'rescue') {
        const sh = o.shelter;
        if (sh.state === 'open' && o.released < o.total) {
          sh.releaseT -= dt;
          if (sh.releaseT <= 0) { sh.releaseT = 2.2; o.released++; g.colonists.push({ kind: 'colonist', x: sh.x + U.rand(-10, 10), y: sh.y + 30, hp: 60, r: 8, alive: true, obj: o, walk: 0, vx: 0, vy: 0 }); }
          g.waveT -= dt;
          if (g.waveT <= 0) { g.waveT = Math.max(10, 22 - M.diff); S.wave(sh.x, sh.y, 3 + M.diff); }
        }
        o.progress = o.saved / o.need;
        if (o.saved >= o.need) { complete(o, 'Colonists evacuated'); g.focus = null; }
        else if (o.dead > o.total - o.need) { o.failed = true; S.msg('Too many colonists lost. Objective failed.', '#ff6b5a', 5); A.play('fail'); }
      }
      if (o.type === 'blackbox') {
        if (!o.spawned) { o.spawned = true; S.item('blackbox', o.x + 40, o.y + 30, {}); }
        const carrier = g.divers.find(d => d.alive && d.carrying === 'blackbox');
        const box = g.items.find(i => i.alive && i.kind === 'blackbox');
        const pos = carrier || box;
        if (pos && Math.hypot(pos.x - M.extract.x, pos.y - M.extract.y) < M.extract.r + 20) {
          if (carrier) carrier.carrying = null; if (box) box.alive = false;
          complete(o, 'Flight recorder secured at extraction');
        }
      }
      if (o.type === 'nova') { if (!o.node.alive) complete(o, 'Command node destroyed'); }
    }
    // colonists walk to the shuttle
    for (let i = g.colonists.length - 1; i >= 0; i--) {
      const c = g.colonists[i];
      if (!c.alive) { g.colonists.splice(i, 1); continue; }
      c.flash = (c.flash || 0) - dt;
      const sh = c.obj.shuttle, a = Math.atan2(sh.y - c.y, sh.x - c.x);
      let ax = Math.cos(a), ay = Math.sin(a);
      if (S.solidAt(c.x + ax * 20, c.y + ay * 20)) { ax = Math.cos(a + 1); ay = Math.sin(a + 1); }
      c.vx = ax * 62; c.vy = ay * 62; c.x += c.vx * dt; c.y += c.vy * dt; c.walk += dt * 8;
      S.collide(c, c.r);
      if (Math.hypot(sh.x - c.x, sh.y - c.y) < 34) { c.alive = false; c.obj.saved++; S.msg('Colonist evacuated (' + c.obj.saved + '/' + c.obj.need + ')', '#9fe07a', 1.5); g.colonists.splice(i, 1); }
    }
    // nova bombs
    for (const n of g.novas) {
      if (!n.alive || n.state !== 'armed') continue;
      n.t -= dt;
      if (Math.floor(n.t * 2) !== Math.floor((n.t + dt) * 2)) A.play('beacon');
      if (n.t <= 0) {
        n.alive = false;
        g.flashes.push({ x: n.x, y: n.y, r: 900, t: 1.2, T: 1.2, col: '#fff6e0' });
        S.boom(n.x, n.y, 300, 9999, 7, { big: true, closes: true });
        const ob = M.objectives.find(o => o.type === 'nova' && !o.done);
        if (ob && Math.hypot(ob.node.x - n.x, ob.node.y - n.y) < 230) { ob.node.alive = false; }
        else if (ob) S.msg('The bomb was too far from the node. Call another.', '#ff9a8a', 5);
        for (const sp of M.structs) if (sp.type === 'spawner' && sp.alive && Math.hypot(sp.x - n.x, sp.y - n.y) < 300) S.closeSpawner(sp);
      }
    }
    // spawners keep spawning while their outpost is alert and divers are close
    for (const st of M.structs) {
      if (st.type !== 'spawner' || !st.alive) continue;
      const op = st.outpost;
      if (!op.alert) continue;
      const near = g.divers.some(d => d.alive && Math.hypot(d.x - st.x, d.y - st.y) < 750);
      if (!near) continue;
      st.spawnT -= dt;
      op.spawned = op.spawned || 0;
      if (st.spawnT <= 0 && op.spawned < 24 + M.diff * 3) {
        st.spawnT = U.rand(7, 11) - M.diff * 0.3;
        const R = DF.ROSTER[M.faction], n = U.randi(1, 2 + Math.floor(M.diff / 4));
        for (let k = 0; k < n; k++) { const e = S.spawnEnemy(M.diff >= 6 && Math.random() < 0.15 ? U.pick(R.t1) : U.pick(R.t0), st.x + U.rand(-10, 10), st.y + U.rand(-10, 10), { state: 'hunt', outpost: op, home: { x: op.x, y: op.y }, leash: op.r }); if (e) op.spawned++; }
        if (M.faction === 'brood') S.burst(st.x, st.y, 6, 'rgba(110,90,60,0.6)', 80, 0.5, 5, { grow: 5, kind: 'smoke' });
      }
    }
    // points of interest
    for (const p of M.pois) {
      if (p.looted) continue;
      const near = g.divers.find(d => d.alive && Math.hypot(d.x - p.x, d.y - p.y) < 170);
      if (near) p.found = true;
      if (near && Math.hypot(near.x - p.x, near.y - p.y) < 60) {
        p.looted = true;
        const diff = M.diff;
        if (p.kind === 'cache') { S.item('supply', p.x, p.y, { charges: 2 }); S.msg('Supply cache found', '#e8e2c8', 2); }
        if (p.kind === 'samples') { S.item('sample', p.x - 10, p.y, { tier: 'c', n: U.randi(2, 4) }); if (diff >= 4 && Math.random() < 0.7) S.item('sample', p.x + 12, p.y + 6, { tier: 'r', n: U.randi(1, 2 + Math.floor(diff / 4)) }); }
        if (p.kind === 'shards') S.item('shard', p.x, p.y, { n: U.pick([10, 10, 20, 20, 50, 100]) });
        if (p.kind === 'medals') S.item('medal', p.x, p.y, { n: 1 + Math.floor(diff / 3) });
        if (p.kind === 'credits') S.item('credit', p.x, p.y, { n: 40 + diff * 15 });
        if (p.kind === 'super') S.item('sample', p.x, p.y, { tier: 's', n: U.randi(2, 3) });
      }
    }
    // enemy artillery battery
    for (const st of M.side) {
      if (st.type !== 'artillery' || !st.alive) continue;
      if (Math.hypot(P.x - st.x, P.y - st.y) > 1500 || !P.alive) continue;
      st.fireT -= dt;
      if (st.fireT <= 0) {
        st.fireT = Math.max(8, 18 - M.diff);
        for (let k = 0; k < 3; k++) { const tx = P.x + U.rand(-120, 120), ty = P.y + U.rand(-120, 120), T = 2.6 + k * 0.4; g.projs.push({ lob: true, sx: st.x, sy: st.y, tx, ty, x: st.x, y: st.y, t: 0, T, team: 'e', owner: st, blast: { r: 70, dmg: 260, pen: 4 }, closes: false, kind: 'lob', vx: 0, vy: 0, life: 99 }); g.telegraphs.push({ x: tx, y: ty, r: 70, t: T, col: 'rgba(255,90,58,0.25)' }); }
        S.msg('Incoming enemy artillery!', '#ff9a6a', 2);
      }
    }
  };

  function complete(o, text) {
    o.done = true; o.progress = 1;
    S.msg((text || o.label) + '. Objective complete.', '#9fe07a', 5); A.play('objective');
    if (S.mainDone()) S.msg('All main objectives complete. Head to extraction.', '#ffd27a', 6);
  }

  S.wave = function (x, y, n) {
    const g = G();
    const a = Math.random() * 6.283, d = U.rand(500, 700);
    let sx = U.clamp(x + Math.cos(a) * d, 100, W - 100), sy = U.clamp(y + Math.sin(a) * d, 100, W - 100);
    const types = S.squad(n, S.heavyChance(), true);
    S.spawnGroup(sx, sy, types, { state: 'hunt', lastKnown: { x, y }, patrol: true, leash: 9999 });
  };

  S.updateHazards = function (dt) {
    const g = G(), M = g.M, hz = M.hazard, P = g.player;
    let vis = 1;
    if (hz === 'sandstorm' || hz === 'blizzard') { const ph = (g.t % 100) / 100; g.storm = ph > 0.6 ? Math.sin((ph - 0.6) / 0.4 * Math.PI) : 0; vis = 1 - 0.5 * g.storm; }
    if (hz === 'rain') vis = 0.8; if (hz === 'fog') vis = 0.66; if (hz === 'night') vis = 0.78;
    g.vis = vis;
    if (hz === 'ion') { const ph = g.t % 110; const was = g.ion; g.ion = ph > 80; if (g.ion && !was) { S.msg('Ion storm overhead. Call-ins offline.', '#9fd8ff', 4); g.ready = null; } if (!g.ion && was) S.msg('Ion storm passed. Call-ins online.', '#9fe07a', 3); }
    if (hz === 'meteor' && P.alive) { g.meteorT = (g.meteorT == null ? 10 : g.meteorT) - dt; if (g.meteorT <= 0) { g.meteorT = U.rand(5, 11); const tx = P.x + U.rand(-450, 450), ty = P.y + U.rand(-450, 450); g.telegraphs.push({ x: tx, y: ty, r: 70, t: 1.6, col: 'rgba(255,170,90,0.3)' }); S.at(1.6, () => { g.beams.push({ x1: tx - 300, y1: ty - 900, x2: tx, y2: ty, t: 0.25, col: '#ffb070', w: 6 }); S.boom(tx, ty, 70, 600, 5, { big: true, closes: false }); }); } }
    for (const t of g.tornadoes) {
      t.t += dt; t.a += U.rand(-0.6, 0.6) * dt;
      if (P.alive && Math.random() < 0.002) t.a = Math.atan2(P.y - t.y, P.x - t.x);
      t.x += Math.cos(t.a) * 55 * dt; t.y += Math.sin(t.a) * 55 * dt;
      if (t.x < 200 || t.x > W - 200 || t.y < 200 || t.y > W - 200) t.a += Math.PI;
      t.x = U.clamp(t.x, 150, W - 150); t.y = U.clamp(t.y, 150, W - 150);
      for (const d of g.divers) if (d.alive && Math.hypot(d.x - t.x, d.y - t.y) < 55) { d.burnT = Math.max(d.burnT, 2); d.vx += (d.x - t.x) * 2; d.vy += (d.y - t.y) * 2; }
      for (const e of g.ehash.query(t.x, t.y, 60, tmp)) if (!e.dead && Math.hypot(e.x - t.x, e.y - t.y) < 55) e.burnT = Math.max(e.burnT, 2);
      if (Math.random() < 0.02) S.area('fire', t.x, t.y, 30, 4);
      for (let k = 0; k < 2; k++) { const a = Math.random() * 6.283, r = U.rand(5, 45); S.part(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, -Math.sin(a) * 160, Math.cos(a) * 160, 0.5, U.rand(4, 9), Math.random() < 0.5 ? '#ff7a2a' : '#ffcf5a', { glow: true, grow: 6, drag: 0.5, kind: 'flame' }); }
    }
  };

  // ---------------------------------------------------------------- patrols and pressure
  S.updatePressure = function (dt) {
    const g = G(), M = g.M, P = g.player;
    g.patrolT -= dt;
    const cap = 70 + M.diff * 12;
    if (g.patrolT <= 0) {
      g.patrolT = Math.max(28, 75 - M.diff * 5) * U.rand(0.8, 1.2);
      const anchor = P.alive ? P : g.divers.find(d => d.alive);
      if (anchor && g.enemies.length < cap) {
        const a = Math.random() * 6.283, d = U.rand(950, 1250);
        const x = U.clamp(anchor.x + Math.cos(a) * d, 150, W - 150), y = U.clamp(anchor.y + Math.sin(a) * d, 150, W - 150);
        S.spawnGroup(x, y, S.squad(3 + Math.floor(M.diff * 0.7), S.heavyChance(), true), { patrol: true, leash: 9999, wander: { x: anchor.x + U.rand(-200, 200), y: anchor.y + U.rand(-200, 200) } });
        if (M.faction === 'brood' && Math.random() < 0.2) S.spawnGroup(x, y, [DF.ROSTER.brood.air, DF.ROSTER.brood.air, DF.ROSTER.brood.air], { patrol: true, leash: 9999 });
      }
    }
    // despawn far idle enemies to keep the field fresh
    if (g.enemies.length > cap) for (const e of g.enemies) if (!e.dead && e.state !== 'hunt' && !e.isTarget && !e.outpost && Math.hypot(e.x - P.x, e.y - P.y) > 1500) { e.dead = true; if (g.enemies.length <= cap) break; }
  };

  // ---------------------------------------------------------------- extraction & mission end
  S.updateExtraction = function (dt) {
    const g = G(), ex = g.M.extract;
    if (ex.state === 'calling') {
      ex.t -= dt;
      g.waveT -= dt;
      if (g.waveT <= 0) { g.waveT = Math.max(8, 16 - g.M.diff); S.wave(ex.x, ex.y, 4 + g.M.diff); }
      if (ex.t <= 0) { ex.state = 'landing'; ex.t = 5; A.play('jet'); S.msg('Dropship on final approach', '#ffd27a', 3); }
    } else if (ex.state === 'landing') { ex.t -= dt; if (ex.t <= 0) { ex.state = 'boarding'; S.msg('Dropship down. Get aboard (E).', '#9fe07a', 4); g.focus = null; } }
    else if (ex.state === 'leaving') {
      ex.t -= dt;
      if (ex.t <= 0) {
        const aboard = g.divers.filter(d => d.alive && (d.boarded || Math.hypot(d.x - ex.x, d.y - ex.y) < ex.r + 60));
        S.end(true, aboard.length);
      }
    }
  };

  S.end = function (extracted, aboard) {
    const g = G(); if (g.ended) return;
    g.ended = true;
    const M = g.M, success = M.objectives.every(o => o.done), st = g.stats, diff = M.diff;
    const kxp = st.killsByTier[0] * 2 + st.killsByTier[1] * 8 + st.killsByTier[2] * 30 + st.killsByTier[3] * 120;
    const xp = Math.round(kxp + (success ? 300 + diff * 110 : 0) + st.side * 90 + st.outposts * 70 + (extracted ? 200 : 0));
    const credits = Math.round((success ? 70 + diff * 35 : 15) + st.side * 20 + st.outposts * 15 + st.credits);
    const medals = (success ? 2 + Math.floor(diff * 0.8) : 0) + st.medals;
    const samples = extracted ? st.samples : { c: 0, r: 0, s: 0 };
    g.result = { success, extracted, aboard: aboard || 0, xp, credits, medals, shards: st.shards, samples, stats: st, time: g.t, planet: M.planet.id, diff, type: g.opts.type, failedObj: M.objectives.some(o => o.failed) };
    if (success) A.play('objective'); else A.play('fail');
  };

  // ---------------------------------------------------------------- main step
  S.step = function (dt, inp) {
    const g = G();
    if (!g || g.ended) return;
    g.t += dt;
    if (g.timeLeft > 0) { g.timeLeft -= dt; if (g.timeLeft <= 0) { S.msg('Mission time expired. Call-ins are offline. Extract now.', '#ff9a8a', 6); g.ready = null; } }
    // rebuild the enemy hash
    g.ehash.clear(); for (const e of g.enemies) if (!e.dead) g.ehash.insert(e);
    // scheduled events
    for (let i = g.events.length - 1; i >= 0; i--) if (g.events[i].t <= g.t) { const ev = g.events[i]; g.events.splice(i, 1); ev.fn(); }
    // call-in cooldowns
    for (const id in g.cs) { const c = g.cs[id]; if (c.cd > 0.01) c.cd = Math.max(0, c.cd - dt); if (c.rearm > 0) { c.rearm -= dt; if (c.rearm <= 0) { c.uses = c.maxUses; S.msg(c.d.name + ' rearmed', '#9fd8ff', 2); } } }
    const P = g.player;
    if (P.alive) S.updatePlayer(P, inp, dt);
    for (const d of g.divers) if (d.bot && d.alive) S.updateBot(d, dt);
    for (const v of g.vehicles) if (v.alive && !v.driver) { v.vx *= 0.9; v.vy *= 0.9; v.speed *= 0.9; }
    for (let i = g.vehicles.length - 1; i >= 0; i--) if (!g.vehicles[i].alive) g.vehicles.splice(i, 1);
    S.updateThrows(dt);
    S.updateEnemies(dt);
    S.updateCalls(dt);
    S.updateProjs(dt);
    S.updateSentries(dt);
    S.updateWorldFx(dt);
    S.updateObjectives(dt);
    S.updateHazards(dt);
    S.updatePressure(dt);
    S.updateExtraction(dt);
    // respawn
    if (!P.alive && !P.arriving && g.pendingRespawn) {
      g.respawnT -= dt;
      if (g.respawnT <= 0) {
        g.pendingRespawn = false;
        if (g.lives > 0) {
          const mate = g.divers.find(d => d.alive && d.bot);
          const base = mate || P;
          const p = S.freeSpot(base.x + U.rand(-80, 80), base.y + U.rand(-80, 80), 14);
          S.respawnDiver(P, p.x, p.y);
          S.msg('Reinforcements inbound (' + g.lives + ' left)', '#9fe07a', 3);
        } else { g.failT = 4; S.msg('Reinforcement budget depleted. Mission failed.', '#ff6b5a', 5); }
      }
    }
    if (g.failT != null) { g.failT -= dt; if (g.failT <= 0) S.end(false, 0); }
    if (M_failed()) { g.failT = g.failT == null ? 4 : g.failT; }
    // camera
    g.shake *= Math.pow(0.02, dt); g.dmgFlash = Math.max(0, g.dmgFlash - dt * 1.5); g.hitMark -= dt; g.lastHitT = (g.lastHitT || 0) - dt;
    for (let i = g.msgs.length - 1; i >= 0; i--) { g.msgs[i].t -= dt; if (g.msgs[i].t <= 0) g.msgs.splice(i, 1); }
    if (g.codeErr) g.codeErr = Math.max(0, g.codeErr - dt);
  };
  function M_failed() { return DF.G.M.objectives.some(o => o.failed); }
})();
