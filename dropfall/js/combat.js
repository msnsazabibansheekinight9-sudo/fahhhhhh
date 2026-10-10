// Dropfall — weapons, projectiles, divers, squad bots, call-ins.
'use strict';
(function () {
  const U = DF.U, A = DF.Audio, S = DF.Sim, W = DF.WORLD;
  const tmp = [], tmp3 = [];
  const G = () => DF.G;

  // ---------------------------------------------------------------- projectiles
  S.proj = function (o) {
    const g = G();
    const p = Object.assign({ team: 'd', life: 1, pierce: 0, rad: 2, hit: null, traveled: 0 }, o);
    p.vx = Math.cos(o.ang) * o.speed; p.vy = Math.sin(o.ang) * o.speed;
    p.life = (o.range || 800) / o.speed;
    g.projs.push(p); return p;
  };

  function spreadAngle(dv, w, base) {
    const moving = Math.hypot(dv.vx, dv.vy) > 30;
    let s = base;
    if (moving) s *= dv.sprinting ? 2.4 : 1.5;
    if (dv.aimDown) s *= 0.55;
    if (dv.proneT > 0 || dv.diveT > 0) s *= (dv.passive === 'fortified' || dv.passive === 'engineer') ? 0.35 : 0.5;
    s += w.bloom;
    return s * Math.PI / 180;
  }

  function weaponSound(d) {
    const cls = d.cls;
    if (d.kind === 'pellet' || d.id === 'sg8') return 'shotgun';
    if (cls === 'Pistol' || cls === 'Revolver' || cls === 'Machine Pistol') return 'pistol';
    if (d.dmg >= 150 || cls === 'Heavy MG' || cls === 'Machine Gun') return 'shotHeavy';
    return 'shot';
  }

  S.fireWeapon = function (dv, w, trig, released, tx, ty, dt) {
    const g = G(), d = w.d;
    w.cd -= dt; w.bloom = Math.max(0, w.bloom - dt * 6);
    if (w.reloadT > 0) { w.reloadT -= dt; if (w.reloadT <= 0) S.finishReload(dv, w); return; }
    const ang = Math.atan2(ty - dv.y, tx - dv.x);
    const mx = dv.x + Math.cos(ang) * 18, my = dv.y + Math.sin(ang) * 18;
    const pd = Math.hypot(G().player.x - dv.x, G().player.y - dv.y);
    // one-handed weapons only while carrying cargo
    if (dv.carrying && !d.onehand && d.slot !== 'secondary') return;
    switch (d.kind) {
      case 'bullet': case 'pellet': case 'rocket': {
        if (!trig || w.cd > 0) return;
        if (w.mag <= 0) { if (dv.isPlayer && w._clickT !== Math.floor(g.t * 3)) { w._clickT = Math.floor(g.t * 3); A.play('empty'); } if (w.spare > 0) S.reload(dv, w); return; }
        w.mag--; w.cd = 60 / d.rpm;
        const n = d.pellets || 1, sp = spreadAngle(dv, w, d.spread || 1);
        let homTarget = null;
        if (d.homing) homTarget = S.findLock(tx, ty, 300);
        for (let i = 0; i < n; i++) {
          const a = ang + (Math.random() - 0.5) * sp * (n > 1 ? 1 : 1.2);
          S.proj({ x: mx, y: my, ang: a, speed: d.speed * (n > 1 ? U.rand(0.85, 1.1) : 1), dmg: d.dmg, pen: d.pen, range: d.range, owner: dv, kind: d.kind === 'rocket' ? 'rocket' : 'bullet', blast: d.blast, closes: d.closes, pierce: d.pierce || 0, stagger: d.stagger, energy: d.energy, homing: homTarget, col: d.energy ? '#9fe8ff' : d.kind === 'rocket' ? '#ffcf7a' : '#ffe9a8', wid: w.id });
        }
        w.bloom = Math.min(8, w.bloom + (d.dmg > 200 ? 2.5 : d.kind === 'pellet' ? 3 : 0.8) * (dv.passive === 'engineer' && (dv.proneT > 0) ? 0.7 : 1));
        g.stats.shots++;
        S.flashMuzzle(mx, my, ang, d.kind === 'rocket' ? 1.4 : 1);
        if (d.kind === 'rocket') A.play(d.energy ? 'plasma' : 'rocket', pd); else A.play(weaponSound(d), pd);
        if (dv.isPlayer && (d.dmg > 400 || d.kind === 'pellet')) g.shake = Math.min(10, g.shake + (d.dmg > 1000 ? 6 : 2));
        S.noise(dv.x, dv.y, 420);
        if (w.mag <= 0 && w.spare > 0 && (dv.bot || d.mag === 1)) S.reload(dv, w);
        return;
      }
      case 'beam': {
        if (w.over) { w.heat -= dt * 0.25; if (w.heat <= 0) { w.heat = 0; w.over = false; } return; }
        if (!trig) { w.heat = Math.max(0, w.heat - dt * 0.35); return; }
        w.heat += d.heatRate * dt;
        S.beamCast(dv, mx, my, ang, d.range, d.dps * dt, d.pen, { energy: true, col: dv.isPlayer ? '#ff5a4a' : '#ff8a6a', width: d.dps > 400 ? 4 : 2 });
        A.play('laser', pd); S.noise(dv.x, dv.y, 300);
        if (w.heat >= 1) { if (w.spare > 0) { w.spare--; w.reloadT = d.reload; w.heat = 0; A.play('reload'); } else { w.over = true; } }
        return;
      }
      case 'flame': {
        if (!trig) return;
        if (w.mag <= 0) { if (w.spare > 0) S.reload(dv, w); return; }
        w.mag -= dt * 20;
        S.flameCone(dv, mx, my, ang, d.range, d.dps * dt, d.pen, 0.32);
        A.play('flame', pd); S.noise(dv.x, dv.y, 300);
        return;
      }
      case 'arc': {
        if (!trig || w.cd > 0) return;
        w.cd = 60 / d.rpm;
        S.arcChain(mx, my, ang, d.range, d.dmg, d.pen, d.chains, dv);
        A.play('arc', pd); S.noise(dv.x, dv.y, 350);
        return;
      }
      case 'charge': {
        if (w.cool > 0) { w.cool -= dt; return; }
        if (trig) {
          w.charge += dt;
          if (w.charge >= d.charge) {
            w.charge = 0; w.cool = d.cool;
            S.proj({ x: mx, y: my, ang, speed: d.speed, dmg: d.dmg, pen: d.pen, range: d.range, owner: dv, kind: 'rocket', blast: d.blast, closes: true, energy: true, col: '#7fe3ff', big: true });
            S.flashMuzzle(mx, my, ang, 2); A.play('plasma', pd); A.play('rocket', pd); S.noise(dv.x, dv.y, 500);
          }
        } else w.charge = Math.max(0, w.charge - dt * 2);
        return;
      }
      case 'rail': {
        if (w.mag <= 0) { if (w.spare > 0 && !trig) S.reload(dv, w); return; }
        if (trig) {
          w.charge += dt;
          if (w.charge > d.charge + 1.4) { // held too long: it blows up in your hands
            w.charge = 0; w.mag--; S.boom(dv.x, dv.y, 45, 500, 4, { src: dv, closes: false }); if (dv.isPlayer) S.msg('Railgun overcharged', '#ff6b5a', 2);
          }
        } else if (released && w.charge > 0.12) {
          const pct = Math.min(1, w.charge / d.charge);
          w.charge = 0; w.mag--;
          S.proj({ x: mx, y: my, ang, speed: d.speed, dmg: d.dmg * (0.35 + 0.65 * pct), pen: pct >= 0.98 ? 6 : pct > 0.5 ? 5 : 4, range: d.range, owner: dv, kind: 'bullet', pierce: d.pierce, energy: true, col: '#bfe9ff', rail: true });
          S.flashMuzzle(mx, my, ang, 1.6); A.play('shotHeavy', pd); A.play('arc', pd); S.noise(dv.x, dv.y, 500);
          if (dv.isPlayer) g.shake = Math.min(10, g.shake + 4);
          if (w.spare > 0) S.reload(dv, w);
        } else if (!trig) w.charge = 0;
        return;
      }
    }
  };

  S.flashMuzzle = function (x, y, a, s) {
    const g = G();
    g.flashes.push({ x, y, r: 26 * s, t: 0.05, T: 0.05, col: '#ffe4a0' });
    S.part(x, y, Math.cos(a) * 80, Math.sin(a) * 80, 0.06, 4 * s, '#fff2c0', { glow: true });
  };

  S.reload = function (dv, w) {
    const d = w.d;
    if (!w || w.reloadT > 0 || d.infinite || d.kind === 'charge') return;
    if (d.kind === 'beam') { if (w.heat > 0.05 && w.spare > 0) { w.spare--; w.reloadT = d.reload; w.heat = 0; w.over = false; if (dv.isPlayer) A.play('reload'); } return; }
    if (w.mag >= d.mag || w.spare <= 0) return;
    w.reloadT = d.reload * (d.slot === 'support' && dv.passive === 'siege' ? 0.7 : 1);
    if (dv.isPlayer) A.play('reload');
  };
  S.finishReload = function (dv, w) {
    if (w.d.kind === 'beam') return;
    w.mag = w.d.mag; w.spare--; w.reloadT = 0;
  };

  S.findLock = function (x, y, r) {
    const g = G(); let best = null, bs = -1;
    for (const e of g.ehash.query(x, y, r, tmp)) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y); if (d > r) continue;
      const score = e.def.hp - d * 2; if (score > bs) { bs = score; best = e; }
    }
    return best;
  };

  // continuous hitscan beam (lasers)
  S.beamCast = function (src, x, y, ang, range, dmg, pen, o) {
    const g = G(), cx = Math.cos(ang), cy = Math.sin(ang);
    let ex = x + cx * range, ey = y + cy * range;
    // stop at obstacles
    for (let s = 0; s < range; s += 10) { const px = x + cx * s, py = y + cy * s; if (S.solidAt(px, py)) { ex = px; ey = py; break; } }
    // first enemy along the line
    let best = null, bt = 1e9;
    const len = Math.hypot(ex - x, ey - y);
    for (const e of g.ehash.query((x + ex) / 2, (y + ey) / 2, len / 2 + 40, tmp)) {
      if (e.dead) continue;
      const t = (e.x - x) * cx + (e.y - y) * cy; if (t < 0 || t > len) continue;
      const px = x + cx * t, py = y + cy * t;
      if (Math.hypot(e.x - px, e.y - py) < e.r && t < bt) { bt = t; best = e; }
    }
    let hitStruct = null;
    for (const st of g.M.structs) if (st.alive && st.hp != null) { const t = (st.x - x) * cx + (st.y - y) * cy; if (t > 0 && t < Math.min(bt, len) && Math.hypot(st.x - (x + cx * t), st.y - (y + cy * t)) < st.r) { bt = t; best = null; hitStruct = st; } }
    if (best) { ex = x + cx * bt; ey = y + cy * bt; const r = S.dmgEnemy(best, dmg, pen, { x: cx, y: cy }, { energy: o.energy, src }); if (src.isPlayer && r) { g.hitMark = 0.08; g.hitKind = r; } }
    if (hitStruct) { ex = x + cx * bt; ey = y + cy * bt; S.dmgStruct(hitStruct, dmg, pen); }
    g.beams.push({ x1: x, y1: y, x2: ex, y2: ey, t: 0.03, col: o.col, w: o.width || 2 });
    if (Math.random() < 0.3) S.part(ex, ey, U.rand(-60, 60), U.rand(-60, 60), 0.2, 2, '#ffb0a0', { glow: true });
    return { x: ex, y: ey };
  };

  S.flameCone = function (src, x, y, ang, range, dmg, pen, half, team) {
    const g = G();
    for (let i = 0; i < 3; i++) {
      const a = ang + (Math.random() - 0.5) * half * 1.6, sp = range * U.rand(2.2, 3.2);
      S.part(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.32, 5, i ? '#ff9a3a' : '#ffd36a', { glow: true, grow: 14, drag: 3, kind: 'flame' });
    }
    if (team === 'e') {
      for (const d of g.divers) {
        if (!d.alive) continue;
        const dd = Math.hypot(d.x - x, d.y - y); if (dd > range + d.r) continue;
        if (Math.abs(U.angDiff(ang, Math.atan2(d.y - y, d.x - x))) > half) continue;
        if (!S.los(x, y, d.x, d.y)) continue;
        S.dmgDiver(d, dmg, 'fire', src); d.burnT = Math.max(d.burnT, 2);
      }
      for (const s of g.sentries) if (s.alive && Math.hypot(s.x - x, s.y - y) < range && Math.abs(U.angDiff(ang, Math.atan2(s.y - y, s.x - x))) < half) S.dmgSentry(s, dmg * 2);
      return;
    }
    for (const e of g.ehash.query(x, y, range + 30, tmp)) {
      if (e.dead) continue;
      const dd = Math.hypot(e.x - x, e.y - y); if (dd > range + e.r) continue;
      if (Math.abs(U.angDiff(ang, Math.atan2(e.y - y, e.x - x))) > half + e.r / Math.max(dd, 1)) continue;
      if (!S.los(x, y, e.x, e.y)) continue;
      const r = S.dmgEnemy(e, dmg, pen, null, { src, fire: true }); e.burnT = Math.max(e.burnT, 3);
      if (src.isPlayer && r) { g.hitMark = 0.08; g.hitKind = r; }
    }
    // flames can catch friends standing in front of you
    for (const d of g.divers) if (d !== src && d.alive && !d.veh && Math.hypot(d.x - x, d.y - y) < range * 0.8 && Math.abs(U.angDiff(ang, Math.atan2(d.y - y, d.x - x))) < half * 0.7) { S.dmgDiver(d, dmg * 0.3, 'fire', src); d.burnT = Math.max(d.burnT, 1); }
    src._flameT = (src._flameT || 0) + 1;
    if (src._flameT % 20 === 0) { const ex = x + Math.cos(ang) * range * 0.8, ey = y + Math.sin(ang) * range * 0.8; if (!S.solidAt(ex, ey)) S.area('fire', ex, ey, 34, 5); }
  };

  S.arcChain = function (x, y, ang, range, dmg, pen, chains, src) {
    const g = G();
    let best = null, bd = 1e9;
    for (const e of g.ehash.query(x, y, range, tmp)) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y); if (d > range) continue;
      if (Math.abs(U.angDiff(ang, Math.atan2(e.y - y, e.x - x))) > 0.5) continue;
      if (!S.los(x, y, e.x, e.y)) continue;
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) {
      const ex = x + Math.cos(ang) * range * 0.6, ey = y + Math.sin(ang) * range * 0.6;
      g.beams.push({ x1: x, y1: y, x2: ex, y2: ey, t: 0.1, col: '#9fe8ff', w: 2, arc: true });
      return;
    }
    let cur = { x, y }, target = best;
    const hit = new Set();
    for (let i = 0; i <= chains && target; i++) {
      hit.add(target);
      g.beams.push({ x1: cur.x, y1: cur.y, x2: target.x, y2: target.y, t: 0.12, col: '#bff0ff', w: 2.5, arc: true });
      if (target.kind === 'diver') { S.dmgDiver(target, dmg * 0.4, 'arc', src); }
      else { const r = S.dmgEnemy(target, dmg * (i === 0 ? 1 : 0.7), pen, null, { energy: true, src }); target.stunT = Math.max(target.stunT, 0.2); if (src && src.isPlayer && r) { g.hitMark = 0.08; g.hitKind = r; } }
      cur = target; target = null;
      let nd = 140;
      for (const e of g.ehash.query(cur.x, cur.y, 140, tmp)) { if (e.dead || hit.has(e)) continue; const d = Math.hypot(e.x - cur.x, e.y - cur.y); if (d < nd) { nd = d; target = e; } }
      // arcs jump to nearby divers when there is nothing else close
      if (!target) for (const d of g.divers) if (d !== src && d.alive && !d.veh && !hit.has(d) && Math.hypot(d.x - cur.x, d.y - cur.y) < 70 && Math.random() < 0.35) { target = d; break; }
    }
  };

  S.updateProjs = function (dt) {
    const g = G(), P = g.player;
    for (let i = g.projs.length - 1; i >= 0; i--) {
      const p = g.projs[i];
      p.life -= dt;
      if (p.lob) { // artillery arc
        p.t += dt;
        p.x = U.lerp(p.sx, p.tx, p.t / p.T); p.y = U.lerp(p.sy, p.ty, p.t / p.T);
        if (p.t >= p.T) { g.projs.splice(i, 1); S.projImpact(p, p.x, p.y, null); }
        continue;
      }
      if (p.homing && !p.homing.dead) {
        const ta = Math.atan2(p.homing.y - p.y, p.homing.x - p.x), ca = Math.atan2(p.vy, p.vx), na = U.turn(ca, ta, 3.5 * dt), sp = Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; p.life = Math.max(p.life, 0.3);
        if (Math.random() < 0.6) S.part(p.x, p.y, 0, 0, 0.5, 3, 'rgba(200,200,200,0.5)', { grow: 6, kind: 'smoke' });
      } else if (p.kind === 'rocket' && Math.random() < 0.5) S.part(p.x, p.y, 0, 0, 0.35, 2.5, 'rgba(200,190,180,0.45)', { grow: 5, kind: 'smoke' });
      const sp = Math.hypot(p.vx, p.vy) * dt, steps = Math.max(1, Math.ceil(sp / 12));
      let dead = false;
      for (let s = 0; s < steps && !dead; s++) {
        const ox = p.x, oy = p.y;
        p.x += p.vx * dt / steps; p.y += p.vy * dt / steps; p.traveled += sp / steps;
        if (!p.flyHigh && S.solidAt(p.x, p.y)) {
          if (p.kind === 'bullet' && !p.blast) { S.part(p.x, p.y, -p.vx * 0.05 + U.rand(-40, 40), -p.vy * 0.05 + U.rand(-40, 40), 0.15, 1.5, '#d8c8a8'); }
          S.projImpact(p, ox, oy, null); dead = true; break;
        }
        if (p.team === 'd') {
          // vs enemies
          for (const e of g.ehash.query(p.x, p.y, 60, tmp)) {
            if (e.dead || (p.hit && p.hit.has(e))) continue;
            if (U.dist2(e.x, e.y, p.x, p.y) > (e.r + p.rad) ** 2) continue;
            if (p.blast) { S.projImpact(p, p.x, p.y, e); dead = true; break; }
            const n = Math.hypot(p.vx, p.vy);
            const r = S.dmgEnemy(e, p.dmg, p.pen, { x: p.vx / n, y: p.vy / n }, { energy: p.energy, stagger: p.stagger, src: p.owner });
            if (p.owner && p.owner.isPlayer && r) { g.hitMark = 0.1; g.hitKind = r; g.stats.hits++; }
            S.part(p.x, p.y, U.rand(-80, 80), U.rand(-80, 80), 0.2, 2, r === 'bounce' ? '#fff3c4' : r === 'shield' ? '#c9bfff' : DF.FACTIONS[e.def.f].blood);
            if (r === 'bounce') { A.play('ricochet', Math.hypot(P.x - p.x, P.y - p.y)); dead = true; break; }
            if (r !== 'shield' && p.pierce > 0) { p.pierce--; (p.hit = p.hit || new Set()).add(e); continue; }
            dead = true; break;
          }
          if (dead) break;
          for (const st of g.M.structs) {
            if (!st.alive || st.hp == null) continue;
            if (U.dist2(st.x, st.y, p.x, p.y) < st.r * st.r) { if (p.blast) S.projImpact(p, p.x, p.y, null); else S.dmgStruct(st, p.dmg, p.pen); dead = true; break; }
          }
        } else {
          // enemy fire: shield domes block it
          for (const sn of g.sentries) if (sn.alive && sn.st === 'dome' && U.dist2(sn.x, sn.y, p.x, p.y) < sn.r * sn.r && U.dist2(sn.x, sn.y, ox, oy) >= sn.r * sn.r) { sn.hp -= p.dmg; sn.flash = 0.1; S.part(p.x, p.y, 0, 0, 0.2, 4, '#9fd8ff', { glow: true }); dead = true; break; }
          if (dead) break;
          for (const d of g.divers) {
            if (!d.alive || (d.veh && d.veh.driver !== d)) continue;
            const t = d.veh || d, rr = (d.veh ? d.veh.r : d.r) + p.rad;
            if (U.dist2(t.x, t.y, p.x, p.y) < rr * rr) {
              if (p.blast) S.projImpact(p, p.x, p.y, null);
              else { S.dmgDiver(d, p.dmg, p.dkind || 'bullet', p.owner); if (p.slow) d.slowT = Math.max(d.slowT, p.slow); }
              dead = true; break;
            }
          }
          if (dead) break;
          for (const v of g.vehicles) if (v.alive && !v.driver && U.dist2(v.x, v.y, p.x, p.y) < v.r * v.r) { if (p.blast) S.projImpact(p, p.x, p.y, null); else S.dmgVehicle(v, p.dmg, 2, 'bullet'); dead = true; break; }
          if (dead) break;
          for (const sn of g.sentries) if (sn.alive && sn.st !== 'dome' && U.dist2(sn.x, sn.y, p.x, p.y) < 15 * 15) { if (p.blast) S.projImpact(p, p.x, p.y, null); else S.dmgSentry(sn, p.dmg); dead = true; break; }
          if (dead) break;
          for (const c of g.colonists) if (c.alive && U.dist2(c.x, c.y, p.x, p.y) < 100) { S.dmgColonist(c, p.dmg); dead = true; break; }
        }
      }
      if (dead) { g.projs.splice(i, 1); continue; }
      if (p.life <= 0) { g.projs.splice(i, 1); if (p.blast && p.kind === 'rocket') S.projImpact(p, p.x, p.y, null); }
    }
  };

  S.projImpact = function (p, x, y, e) {
    if (p.blast) {
      if (e && p.dmg) { const n = Math.hypot(p.vx, p.vy) || 1; const r = S.dmgEnemy(e, p.dmg, p.pen, { x: p.vx / n, y: p.vy / n }, { energy: p.energy, src: p.owner }); if (p.owner && p.owner.isPlayer && r) { G().hitMark = 0.12; G().hitKind = r; } }
      S.boom(x, y, p.blast.r, p.blast.dmg, p.blast.pen, { closes: p.closes, src: p.owner, acid: p.acid, col: p.acid ? '#b6ef4a' : p.energy ? '#9fe8ff' : null, stun: p.stun, noDecal: p.blast.r < 30 });
      if (p.fire) S.area('fire', x, y, p.fire, 6);
    } else if (p.stunArea) {
      S.boom(x, y, p.stunArea.r, 0, 0, { stun: p.stunArea.t, col: '#9fd8ff' });
    }
  };

  // ---------------------------------------------------------------- throwing
  S.throwObj = function (dv, kind, tx, ty, extra) {
    const g = G();
    const maxD = 270 * (dv.passive === 'servo' ? 1.5 : 1);
    let dx = tx - dv.x, dy = ty - dv.y, d = Math.hypot(dx, dy);
    if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
    // stop short of walls
    let ex = dv.x + dx, ey = dv.y + dy;
    for (let s = 0; s < d; s += 8) { const px = dv.x + dx * s / d, py = dv.y + dy * s / d; if (S.solidAt(px, py)) { ex = dv.x + dx * Math.max(0, s - 10) / d; ey = dv.y + dy * Math.max(0, s - 10) / d; break; } }
    const o = Object.assign({ kind, sx: dv.x, sy: dv.y, x: dv.x, y: dv.y, tx: ex, ty: ey, t: 0, T: 0.35 + d / 700, owner: dv, ang: Math.atan2(dy, dx), spin: 0 }, extra || {});
    g.throws.push(o); return o;
  };

  S.updateThrows = function (dt) {
    const g = G();
    for (let i = g.throws.length - 1; i >= 0; i--) {
      const o = g.throws[i];
      if (o.stuckTo) { if (o.stuckTo.dead) o.stuckTo = null; else { o.x = o.stuckTo.x + o.ox; o.y = o.stuckTo.y + o.oy; } }
      if (!o.landed) {
        o.t += dt; const k = Math.min(1, o.t / o.T);
        o.x = U.lerp(o.sx, o.tx, k); o.y = U.lerp(o.sy, o.ty, k); o.z = Math.sin(k * Math.PI) * 30; o.spin += dt * 12;
        if (o.fuse != null) o.fuse -= dt;
        if (k >= 1) {
          o.landed = true; o.z = 0;
          if (o.kind === 'beacon') {
            g.throws.splice(i, 1);
            S.beaconLand(o);
            continue;
          }
          if (o.def.thermite) {
            let best = null, bd = 50;
            for (const e of g.ehash.query(o.x, o.y, 60, tmp)) { const d = Math.hypot(e.x - o.x, e.y - o.y) - e.r; if (!e.dead && d < bd) { bd = d; best = e; } }
            if (best) { o.stuckTo = best; o.ox = o.x - best.x; o.oy = o.y - best.y; }
            o.fuse = 2.5;
          } else if (o.def.impact) o.fuse = 0;
        }
      } else if (o.fuse != null) o.fuse -= dt;
      if (o.kind === 'nade' && o.fuse != null && o.fuse <= 0) {
        g.throws.splice(i, 1);
        S.nadeGo(o);
      }
    }
  };

  S.nadeGo = function (o) {
    const d = o.def, x = o.x, y = o.y;
    if (d.thermite) {
      if (o.stuckTo && !o.stuckTo.dead) S.dmgEnemy(o.stuckTo, d.blast.dmg, d.blast.pen, null, { explosive: true, src: o.owner });
      S.boom(x, y, d.blast.r, 300, 4, { src: o.owner, col: '#ffffff' });
      S.burst(x, y, 30, '#fff6d0', 200, 0.6, 3, { glow: true });
      return;
    }
    if (d.blast) S.boom(x, y, d.blast.r, d.blast.dmg, d.blast.pen, { src: o.owner });
    if (d.fire) S.area('fire', x, y, d.fire.r, d.fire.t);
    if (d.stun) S.boom(x, y, d.stun.r, 0, 0, { stun: d.stun.t, col: '#a8e0ff', src: o.owner });
    if (d.smoke) S.area('smoke', x, y, d.smoke.r, d.smoke.t);
    if (d.gas) S.area('gas', x, y, d.gas.r, d.gas.t);
  };

  // ---------------------------------------------------------------- call-ins
  S.callinsBlocked = function (id, x, y) {
    const g = G(), d = DF.CALLINS[id];
    if (g.timeLeft <= 0) return 'Mission timer expired. Call-ins offline.';
    if (g.ion) return 'Ion storm. Call-ins offline.';
    for (const st of g.M.side) if (st.alive && st.type === 'jammer' && Math.hypot(st.x - x, st.y - y) < 520) return 'Signal jammed. Destroy the jammer.';
    if (d.cat === 'air') for (const st of g.M.side) if (st.alive && st.type === 'aa') return 'Anti-air active. Raptors grounded.';
    return null;
  };
  S.callAvail = function (id) {
    const c = G().cs[id];
    if (!c) return false;
    if (c.cd > 0) return false;
    if (c.uses <= 0) return false;
    if (id === 'nova') { const o = G().M.objectives.find(o => o.type === 'nova' && !o.done); if (!o || G().novas.some(n => n.alive)) return false; }
    if (id === 'reinforce') return G().lives > 0 && G().divers.some(d => !d.alive && !d.arriving && !d.isPlayer);
    return true;
  };

  S.callInput = function (dir) {
    const g = G(), P = g.player;
    if (!P.alive || g.ready) return;
    g.code += dir;
    const ids = Object.keys(g.cs);
    const cand = ids.filter(id => g.cs[id].d.code.startsWith(g.code));
    if (!cand.length) { A.play('keyBad'); g.code = ''; g.codeErr = 0.3; return; }
    A.play('key');
    const exact = cand.find(id => g.cs[id].d.code === g.code);
    if (exact) {
      g.code = '';
      if (!S.callAvail(exact)) { A.play('keyBad'); S.msg(DF.CALLINS[exact].name + (exact === 'reinforce' ? ': no one to reinforce' : exact === 'nova' ? ': not available' : ' is not ready'), '#ff9a8a', 2); return; }
      const why = S.callinsBlocked(exact, P.x, P.y);
      if (why) { A.play('keyBad'); S.msg(why, '#ff9a8a', 2.5); return; }
      g.ready = exact; g.menu = false; A.play('callReady');
    }
  };

  S.throwBeacon = function (tx, ty) {
    const g = G(), P = g.player, id = g.ready;
    if (!id) return;
    g.ready = null;
    S.throwObj(P, 'beacon', tx, ty, { cid: id });
    const c = g.cs[id];
    c.cd = 0.01; // reserved until the beacon lands
  };

  S.cdFor = function (id) {
    const g = G(), d = DF.CALLINS[id];
    let cd = d.cd;
    if (d.cat === 'orbital' && g.mods.has('oc1')) cd *= 0.9;
    if (g.mods.has('b1')) cd *= 0.95;
    if (g.booster === 'b_flex') cd *= 0.9;
    if (id === 'resupply' && g.mods.has('b3')) cd *= 0.75;
    return cd;
  };
  S.etaFor = function (id) {
    const g = G(), d = DF.CALLINS[id];
    let e = d.eta;
    if (d.cat === 'orbital' && g.mods.has('oc3')) e -= 1;
    if (g.mods.has('b2')) e -= 0.5;
    return Math.max(1, e);
  };

  S.beaconLand = function (o) {
    const g = G(), id = o.cid, c = g.cs[id], d = c.d;
    const why = S.callinsBlocked(id, o.x, o.y);
    if (why) { c.cd = 0; S.msg(why, '#ff9a8a', 2.5); return; }
    c.cd = S.cdFor(id);
    if (c.uses !== Infinity) { c.uses--; if (c.uses <= 0 && d.rearm) c.rearm = d.rearm * (g.mods.has('h1') ? 0.8 : 1); }
    g.stats.callins++;
    const b = { x: o.x, y: o.y, cid: id, t: S.etaFor(id), T: S.etaFor(id), ang: o.ang, col: d.cat === 'orbital' || d.cat === 'air' ? '#ff5a3a' : d.cat === 'mission' ? '#ffd27a' : '#5ab4ff' };
    g.beacons.push(b);
    A.play('beacon');
    // pods start falling as soon as the beacon lands
    const podKinds = { support: 1, backpack: 1, sentry: 1, vehicle: 1 };
    if (podKinds[d.cat] || id === 'resupply' || id === 'nova') {
      let pl;
      if (d.cat === 'support') pl = { kind: 'weapon', wid: d.give, pack: d.pack };
      else if (d.cat === 'backpack') pl = { kind: 'pack', pack: d.pack };
      else if (d.cat === 'sentry') pl = { kind: 'sentry', st: d.sentry };
      else if (d.cat === 'vehicle') pl = { kind: 'vehicle', vt: d.vehicle };
      else if (id === 'resupply') pl = { kind: 'supply' };
      else pl = { kind: 'nova' };
      S.pod(o.x, o.y, pl, b.t);
      b.pod = true;
    }
    if (id === 'reinforce') {
      let n = 0;
      for (const dv of g.divers) if (!dv.alive && !dv.arriving && !dv.isPlayer && g.lives > 0) { const p = S.freeSpot(o.x + U.rand(-40, 40), o.y + U.rand(-40, 40), 14); S.respawnDiver(dv, p.x, p.y); n++; }
      b.pod = true;
      S.msg(n ? 'Reinforcing ' + n + ' diver' + (n > 1 ? 's' : '') : 'No one to reinforce', '#9fe07a', 2.5);
    }
  };

  S.beaconFire = function (b) {
    const g = G(), id = b.cid, d = DF.CALLINS[id];
    const orb = g.mods.has('oc2') ? 1.15 : 1, air = g.mods.has('h3') ? 1.15 : 1;
    const x = b.x, y = b.y, fx = Math.cos(b.ang), fy = Math.sin(b.ang), px = -fy, py = fx;
    const rnd = r => { const a = Math.random() * 6.283, d2 = Math.sqrt(Math.random()) * r; return [x + Math.cos(a) * d2, y + Math.sin(a) * d2]; };
    const shell = (delay, sx, sy, r, dmg, pen, o) => { g.telegraphs.push({ x: sx, y: sy, r, t: delay + 0.25, col: 'rgba(255,90,58,0.25)' }); S.at(delay + 0.25, () => { g.beams.push({ x1: sx + 40, y1: sy - 900, x2: sx, y2: sy, t: 0.08, col: '#ffe0b0', w: 3 }); S.boom(sx, sy, r, dmg, pen, Object.assign({ src: g.player }, o || {})); }); };
    const fly = (ang) => { g.flyovers.push({ x: x - Math.cos(ang) * 1400, y: y - Math.sin(ang) * 1400, vx: Math.cos(ang) * 1400, vy: Math.sin(ang) * 1400, t: 2 }); A.play('jet'); };
    switch (id) {
      case 'o_precision': shell(0, x, y, 80 * orb, 1800, 7, { big: true }); break;
      case 'o_gatling': for (let i = 0; i < 44; i++) { const [sx, sy] = rnd(150 * orb); shell(i * 0.09, sx, sy, 36, 260, 3); } break;
      case 'o_120': for (let i = 0; i < 18; i++) { const [sx, sy] = rnd(190 * orb); shell(i * 0.45, sx, sy, 50 * orb, 420, 5); } break;
      case 'o_380': for (let i = 0; i < 26; i++) { const [sx, sy] = rnd(290 * orb); shell(i * 0.5, sx, sy, 88 * orb, 1100, 6, { big: true }); } break;
      case 'o_walking': for (let row = 0; row < 7; row++) for (let k = 0; k < 4; k++) shell(row * 1.1 + k * 0.12, x + fx * row * 80 + px * (k - 1.5) * 55, y + fy * row * 80 + py * (k - 1.5) * 55, 55 * orb, 520, 5); break;
      case 'o_laser': g.lasers.push({ x, y, t: 12, target: null }); A.play('arc'); break;
      case 'o_rail': {
        let best = null, bh = 0;
        for (const e of g.ehash.query(x, y, 300, tmp)) if (!e.dead && e.def.hp > bh && Math.hypot(e.x - x, e.y - y) < 300) { bh = e.def.hp; best = e; }
        const tx = best ? best.x : x, ty = best ? best.y : y;
        S.at(0.3, () => { g.beams.push({ x1: tx + 60, y1: ty - 1200, x2: tx, y2: ty, t: 0.3, col: '#d0f4ff', w: 8 }); if (best && !best.dead) S.dmgEnemy(best, 5000, 7, null, { src: g.player, ignoreShield: true }); S.boom(tx, ty, 40, 300, 5, { src: g.player, col: '#d0f4ff' }); });
        break;
      }
      case 'o_gas': S.boom(x, y, 40, 60, 3, { src: g.player, col: '#c8e070' }); S.area('gas', x, y, 150 * orb, 12); break;
      case 'o_ems': S.boom(x, y, 180 * orb, 0, 0, { stun: 8, col: '#9fd8ff', noDecal: true }); g.flashes.push({ x, y, r: 260, t: 0.5, T: 0.5, col: '#9fd8ff' }); break;
      case 'o_smoke': for (let k = -2; k <= 2; k++) { const sx = x + px * k * 70, sy = y + py * k * 70; S.at(0.1 * (k + 2), () => { S.boom(sx, sy, 20, 0, 0, { col: '#cccccc', noDecal: true }); S.area('smoke', sx, sy, 95, 25); }); } break;
      case 'o_napalm': for (let i = 0; i < 14; i++) { const [sx, sy] = rnd(200 * orb); shell(i * 0.5, sx, sy, 42, 220, 4, { fire: { r: 70, t: 10 }, col: '#ff7a2a' }); } break;
      case 'a_strafe': fly(b.ang); for (let i = 0; i < 26; i++) { const k = i / 25 - 0.5; const sx = x + fx * k * 460, sy = y + fy * k * 460; S.at(0.6 + i * 0.025, () => { for (let j = 0; j < 2; j++) { const ox = sx + px * U.rand(-22, 22), oy = sy + py * U.rand(-22, 22); S.part(ox, oy, 0, 0, 0.2, 5, '#ffe0a0', { glow: true }); for (const e of g.ehash.query(ox, oy, 40, tmp)) if (!e.dead && Math.hypot(e.x - ox, e.y - oy) < 22 + e.r) S.dmgEnemy(e, 240, 3, null, { src: g.player }); for (const dv of g.divers) if (dv.alive && Math.hypot(dv.x - ox, dv.y - oy) < 18) S.dmgDiver(dv, 60, 'bullet'); } A.play('shot'); }); } break;
      case 'a_bombs': fly(Math.atan2(py, px)); for (let k = -2; k <= 2; k++) shell(0.7 + (k + 2) * 0.12, x + px * k * 62, y + py * k * 62, 78 * air, 1000, 5, { big: true }); break;
      case 'a_cluster': fly(Math.atan2(py, px)); for (let i = 0; i < 20; i++) { const k = U.rand(-1, 1); shell(0.6 + i * 0.05, x + px * k * 150 + fx * U.rand(-50, 50), y + py * k * 150 + fy * U.rand(-50, 50), 38 * air, 320, 3); } break;
      case 'a_napalm': fly(Math.atan2(py, px)); for (let k = -2; k <= 2; k++) shell(0.6 + (k + 2) * 0.1, x + px * k * 60, y + py * k * 60, 50 * air, 160, 3, { fire: { r: 80, t: 10 }, col: '#ff7a2a' }); break;
      case 'a_rockets': {
        fly(b.ang);
        const list = g.ehash.query(x, y, 260, tmp).filter(e => !e.dead && Math.hypot(e.x - x, e.y - y) < 260).sort((a, c) => c.def.hp - a.def.hp).slice(0, 4);
        for (let i = 0; i < 4; i++) { const t = list[i]; S.at(0.7 + i * 0.15, () => { const tx = t && !t.dead ? t.x : x + U.rand(-40, 40), ty = t && !t.dead ? t.y : y + U.rand(-40, 40); if (t && !t.dead) S.dmgEnemy(t, 1600, 6, null, { src: g.player, explosive: true }); S.boom(tx, ty, 45 * air, 260, 4, { src: g.player }); }); }
        break;
      }
      case 'a_heavy': fly(b.ang); shell(0.9, x, y, 150 * air, 4500, 7, { big: true }); break;
      case 'a_smoke': fly(Math.atan2(py, px)); for (let k = -3; k <= 3; k++) { const sx = x + px * k * 55, sy = y + py * k * 55; S.at(0.6 + 0.06 * (k + 3), () => S.area('smoke', sx, sy, 80, 22)); } break;
      case 'm_ap': case 'm_inc': case 'm_at': {
        const n = id === 'm_at' ? 10 : 16;
        for (let i = 0; i < n; i++) { const [mx, my] = rnd(130); if (S.solidAt(mx, my)) continue; G().mines.push({ x: mx, y: my, type: d.mines, armed: false, armT: 1.5 + Math.random(), alive: true }); S.part(mx, my, 0, 0, 0.4, 4, '#ffd27a', { glow: true }); }
        A.play('pod');
        break;
      }
    }
  };

  S.mineGo = function (m) {
    if (!m.alive) return; m.alive = false;
    if (m.type === 'ap') S.boom(m.x, m.y, 55, 380, 3, { src: G().player, closes: false });
    else if (m.type === 'inc') { S.boom(m.x, m.y, 40, 120, 3, { src: G().player, col: '#ff7a2a', closes: false }); S.area('fire', m.x, m.y, 70, 8); }
    else S.boom(m.x, m.y, 48, 2200, 6, { src: G().player, closes: false });
  };
})();
