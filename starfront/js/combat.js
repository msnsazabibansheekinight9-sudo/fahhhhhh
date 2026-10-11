// Projectiles, hit detection, deflection, explosions, melee, deployables, and every ability implementation.
var SF = window.SF || (window.SF = {});

(function () {
  var V3 = THREE.Vector3;
  var C = SF.Combat = {};
  var A = SF.Abilities = {};
  var G = function () { return SF.G; };
  var tmp = new V3(), tmp2 = new V3(), tmp3 = new V3();

  C.reset = function () { var g = G(); g.proj = []; g.deploy = []; };

  // closest approach of segment p->p+d (t in [0,1]) to segment a->b ; returns {t, dist2}
  function segSeg(px, py, pz, dx, dy, dz, ax, ay, az, bx, by, bz) {
    var ex = bx - ax, ey = by - ay, ez = bz - az;
    var rx = px - ax, ry = py - ay, rz = pz - az;
    var a = dx * dx + dy * dy + dz * dz, e = ex * ex + ey * ey + ez * ez, f = ex * rx + ey * ry + ez * rz;
    var c = dx * rx + dy * ry + dz * rz, b = dx * ex + dy * ey + dz * ez;
    var s, t, den = a * e - b * b;
    if (den > 1e-9) s = Math.max(0, Math.min(1, (b * f - c * e) / den)); else s = 0;
    t = (b * s + f) / (e || 1e-9);
    if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / (a || 1e-9))); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / (a || 1e-9))); }
    var qx = px + dx * s - (ax + ex * t), qy = py + dy * s - (ay + ey * t), qz = pz + dz * s - (az + ez * t);
    return { t: s, d2: qx * qx + qy * qy + qz * qz };
  }
  function segSphere(px, py, pz, dx, dy, dz, cx, cy, cz, r) {
    var fx = px - cx, fy = py - cy, fz = pz - cz;
    var a = dx * dx + dy * dy + dz * dz, b = 2 * (fx * dx + fy * dy + fz * dz), c = fx * fx + fy * fy + fz * fz - r * r;
    if (c < 0) return 0;
    var disc = b * b - 4 * a * c; if (disc < 0 || a < 1e-9) return 2;
    var t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : 2;
  }
  C.segSphere = segSphere;

  // ------------------------------------------------------------------ firing
  C.fire = function (owner, origin, dir, w, o) {
    o = o || {};
    var g = G();
    var color = o.color || (owner.boltColor ? owner.boltColor() : 0xff3322);
    var p = { kind: 'bolt', owner: owner, team: owner.team, pos: origin.clone(), vel: dir.clone().multiplyScalar(w.speed || 220), dmg: w.dmg * (o.dmgK || 1), life: Math.max(0.6, (w.range * 3.2) / (w.speed || 220)), color: color, antiv: w.antiv || 1, radius: 0, w: w };
    if (w.kind === 'launcher' || o.rocket) {
      p.kind = 'rocket'; p.radius = w.radius || 5; p.mesh = SF.FX.rocketMesh(); p.life = 4;
      if (w.homing || o.homing) p.homing = o.target || C.lockTarget(owner, origin, dir, 120, 0.94);
    } else if (w.kind === 'ion' && w.radius) { p.kind = 'ionball'; p.radius = w.radius; p.mesh = SF.FX.boltMesh(0x6ab0ff, 0.6, 3); }
    else if (w.arc) { p.kind = 'arrow'; p.mesh = SF.FX.grenadeMesh(0x6a4a2a); p.grav = 9; }
    else p.mesh = SF.FX.boltMesh(color, w.kind === 'sniper' ? 4 : w.kind === 'repeater' ? 1.8 : 2.4, w.kind === 'sniper' ? 1.3 : (w.kind === 'hpistol' ? 1.25 : 1));
    if (o.explosive) { p.explosive = true; p.radius = 2.5; }
    if (o.stun) p.stun = o.stun;
    if (w.disintegrate) p.disint = true;
    if (o.vehicle) { p.fromVehicle = o.vehicle; p.mesh.scale.set(2, 2, 5); }
    orient(p);
    g.proj.push(p);
    return p;
  };
  function orient(p) { if (p.mesh) { p.mesh.position.copy(p.pos); tmp.copy(p.pos).add(p.vel); p.mesh.lookAt(tmp); } }

  C.throwGrenade = function (owner, opts) {
    var g = G();
    var dir = owner.aimDir(new V3());
    var range = owner.has && owner.has('longGren') ? 1.4 : 1;
    var origin = owner.eye(new V3()).addScaledVector(dir, 0.6);
    var v = dir.multiplyScalar((opts.speed || 17) * range); v.y += opts.lob == null ? 4.5 : opts.lob;
    var p = { kind: 'grenade', owner: owner, team: owner.team, pos: origin, vel: v, life: opts.fuse || 2.0, fuse: true, radius: opts.radius || 5, dmg: opts.dmg || 120, antiv: opts.antiv || 1, stun: opts.stun, cluster: opts.cluster, sticky: opts.sticky, mesh: SF.FX.grenadeMesh(opts.color), grav: 18 };
    g.proj.push(p);
    owner.anim.throwT = 0.35;
    return p;
  };

  // best target in a cone (for homing)
  C.lockTarget = function (owner, origin, dir, range, minDot) {
    var g = G(), best = null, bd = minDot || 0.9;
    var list = C.targets(owner.team);
    for (var i = 0; i < list.length; i++) {
      var t = list[i], tp = t.chest ? t.chest(tmp) : (t.center ? t.center(tmp) : tmp.copy(t.pos));
      tmp2.subVectors(tp, origin); var d = tmp2.length(); if (d > range || d < 2) continue;
      var dot = tmp2.dot(dir) / d;
      if (dot > bd) { bd = dot; best = t; }
    }
    return best;
  };
  // all enemy damageable things
  C.targets = function (team, wantUnits, wantVeh) {
    var g = G(), out = [];
    if (wantUnits !== false) for (var i = 0; i < g.units.length; i++) { var u = g.units[i]; if (u.alive && u.team !== team && !u.vehicle) out.push(u); }
    if (wantVeh !== false) for (i = 0; i < g.vehicles.length; i++) { var v = g.vehicles[i]; if (v.alive && v.team !== team) out.push(v); }
    return out;
  };

  // ------------------------------------------------------------------ projectile update
  C.update = function (dt) {
    var g = G(), w = g.world;
    for (var i = g.proj.length - 1; i >= 0; i--) {
      var p = g.proj[i];
      p.life -= dt;
      if (p.kind === 'grenade') { if (updateGrenade(p, dt)) { kill(i); } continue; }
      if (p.homing && p.homing.alive) {
        var tp = p.homing.center ? p.homing.center(tmp) : p.homing.chest(tmp);
        tmp2.subVectors(tp, p.pos).normalize().multiplyScalar(p.vel.length());
        p.vel.lerp(tmp2, Math.min(1, dt * (p.fromVehicle ? 2.2 : 3)));
      }
      if (p.grav) p.vel.y -= p.grav * dt;
      if (p.life <= 0) { if (p.radius && p.kind !== 'bolt') C.explode(p.pos, p.radius, p.dmg, p.owner, { antiv: p.antiv, team: p.team }); kill(i); continue; }
      var dx = p.vel.x * dt, dy = p.vel.y * dt, dz = p.vel.z * dt;
      var px = p.pos.x, py = p.pos.y, pz = p.pos.z;
      // world
      var tw = w.raycast(px, py, pz, px + dx, py + dy, pz + dz);
      var hit = null, th = tw;
      // units
      for (var u = 0; u < g.units.length; u++) {
        var un = g.units[u];
        if (!un.alive || un.team === p.team || un.vehicle || un === p.owner) continue;
        var ddx = un.pos.x - px, ddz = un.pos.z - pz;
        if (ddx * ddx + ddz * ddz > (dx * dx + dz * dz) + 30) continue;
        var rr = un.radius + (un.isHero ? 0.25 : 0.12);
        var h = un.height * (un.input.crouch ? 0.7 : 1);
        if (un.buffs.lifted > 0) h += 0;
        var r = segSeg(px, py, pz, dx, dy, dz, un.pos.x, un.pos.y + 0.25, un.pos.z, un.pos.x, un.pos.y + h - 0.2, un.pos.z);
        if (r.d2 < rr * rr && r.t < th) { th = r.t; hit = un; }
      }
      // vehicles
      for (var v = 0; v < g.vehicles.length; v++) {
        var ve = g.vehicles[v];
        if (!ve.alive || ve.team === p.team || ve === p.fromVehicle) continue;
        var spheres = ve.hitSpheres();
        for (var s = 0; s < spheres.length; s++) {
          var sp = spheres[s];
          var ts = segSphere(px, py, pz, dx, dy, dz, sp.x, sp.y, sp.z, sp.r);
          if (ts < th) { th = ts; hit = ve; }
        }
      }
      // capital ship subsystems / deployables
      if (g.capitals) for (var c = 0; c < g.capitals.length; c++) {
        var cap = g.capitals[c]; if (cap.team === p.team) continue;
        for (var k = 0; k < cap.subs.length; k++) {
          var sb = cap.subs[k]; if (sb.hp <= 0) continue;
          var tsb = segSphere(px, py, pz, dx, dy, dz, sb.wpos.x, sb.wpos.y, sb.wpos.z, sb.r);
          if (tsb < th) { th = tsb; hit = sb; }
        }
      }
      for (var d = 0; d < g.deploy.length; d++) {
        var dep = g.deploy[d];
        if (dep.team === p.team || !dep.hittable) continue;
        var td = dep.kind === 'shield' ? shieldHit(dep, px, py, pz, dx, dy, dz) : segSphere(px, py, pz, dx, dy, dz, dep.pos.x, dep.pos.y + (dep.hy || 0.6), dep.pos.z, dep.r || 0.8);
        if (td < th) { th = td; hit = dep; }
      }
      if (hit || tw < 1) {
        var hp = new V3(px + dx * th, py + dy * th, pz + dz * th);
        if (hit && hit.type === 'unit' && (hit.blocking || hit.buffs.deflect > 0) && p.kind === 'bolt' && deflects(hit, p)) {
          // reflect
          SF.Audio.deflect(hp); SF.FX.sparks(hp, p.color, 6, 4);
          hit.blockEnergy -= hit.buffs.deflect > 0 ? 0 : 7; hit.anim.deflectT = 0.15;
          var back = p.owner && p.owner.alive && p.owner.chest ? tmp.subVectors(p.owner.chest(tmp3), hp).normalize() : p.vel.clone().negate().normalize();
          var accurate = hit.isPlayer ? 0.35 : 0.5;
          back.x += (Math.random() - 0.5) * accurate; back.y += (Math.random() - 0.5) * accurate * 0.5; back.z += (Math.random() - 0.5) * accurate; back.normalize();
          p.vel.copy(back).multiplyScalar(p.vel.length()); p.pos.copy(hp).addScaledVector(back, 0.6);
          p.owner = hit; p.team = hit.team; p.life = 2;
          orient(p);
          continue;
        }
        impact(p, hp, hit);
        kill(i);
        continue;
      }
      p.pos.x += dx; p.pos.y += dy; p.pos.z += dz;
      if (p.mesh) orient(p);
      if (p.kind === 'rocket' && Math.random() < 0.7) SF.FX.smoke.emit(p.pos.x, p.pos.y, p.pos.z, 0, 0.3, 0, 0x8a8682, 0.35, 0.7, 0, 1, 2);
      if (p.kind === 'saber') {/* handled by deploy */ }
    }
    function kill(idx) {
      var pp = g.proj[idx];
      if (pp.mesh) { if (pp.kind === 'bolt' || pp.kind === 'ionball') SF.FX.freeBolt(pp.mesh); else SF.FX.removeMesh(pp.mesh); }
      g.proj[idx] = g.proj[g.proj.length - 1]; g.proj.pop();
    }
  };
  function deflects(u, p) {
    if (u.buffs.deflect > 0) return true;
    if (u.blockEnergy <= 0) return false;
    var f = u.forward(tmp2);
    var dot = -(p.vel.x * f.x + p.vel.z * f.z) / (Math.hypot(p.vel.x, p.vel.z) || 1);
    return dot > 0.15;
  }
  function shieldHit(dep, px, py, pz, dx, dy, dz) {
    var n = dep.normal, denom = n.x * dx + n.z * dz;
    if (Math.abs(denom) < 1e-6) return 2;
    var t = ((dep.pos.x - px) * n.x + (dep.pos.z - pz) * n.z) / denom;
    if (t < 0 || t > 1) return 2;
    var hx = px + dx * t - dep.pos.x, hy = py + dy * t - dep.pos.y, hz = pz + dz * t - dep.pos.z;
    var lat = Math.abs(hx * n.z - hz * n.x);
    if (lat > dep.w / 2 || hy < 0 || hy > dep.h) return 2;
    return t;
  }
  function impact(p, hp, hit) {
    var g = G();
    if (p.radius && (p.kind !== 'bolt' || p.explosive)) {
      if (hit && hit.damage && p.kind === 'rocket') hit.damage(p.dmg * 0.5 * (hit.type === 'vehicle' ? p.antiv : 1), p.owner, 'explosive', hp);
      C.explode(hp, p.radius, p.kind === 'bolt' ? 30 : p.dmg * (p.kind === 'rocket' ? 0.6 : 1), p.owner, { antiv: p.antiv, team: p.team, small: p.kind === 'bolt' });
      if (p.kind === 'bolt' && hit && hit.damage) hit.damage(p.dmg, p.owner, 'bolt', hp);
      return;
    }
    if (hit && hit.damage) {
      var dmg = p.dmg;
      if (hit.type === 'unit') {
        // falloff past effective range
        var dist = p.owner && p.owner.pos ? p.owner.pos.distanceTo(hp) : 0;
        if (p.w && dist > p.w.range) dmg *= Math.max(0.55, 1 - (dist - p.w.range) / (p.w.range * 3));
        // headshot
        if (hp.y > hit.pos.y + hit.height * 0.82 && !hit.isHero) dmg *= p.w && p.w.kind === 'sniper' ? 2 : 1.25;
        if (p.stun) { hit.buffs.stun = p.stun; }
      } else if (hit.type === 'vehicle') {
        dmg *= (hit.armored ? 0.3 : 1) * (p.antiv || 1) * (p.owner && p.owner.has && p.owner.has('antiArmor') ? 1.4 : 1);
      }
      hit.damage(dmg, p.owner, 'bolt', hp);
      if (p.disint && hit.type === 'unit' && !hit.alive) hit.disintegrated = true;
      if (hit.type === 'vehicle' || hit.sub || hit.kind === 'shield' || hit.kind === 'turret') SF.FX.sparks(hp, p.color, 8, 4);
    } else {
      SF.FX.hitWall(hp, p.color);
    }
  }

  function updateGrenade(p, dt) {
    var g = G(), w = g.world;
    p.vel.y -= p.grav * dt;
    var nx = p.pos.x + p.vel.x * dt, ny = p.pos.y + p.vel.y * dt, nz = p.pos.z + p.vel.z * dt;
    if (!p.stuck) {
      // stick to vehicles for detpacks
      if (p.sticky) for (var v = 0; v < g.vehicles.length; v++) {
        var ve = g.vehicles[v]; if (!ve.alive || ve.team === p.team) continue;
        if (ve.pos.distanceTo(tmp.set(nx, ny, nz)) < ve.radius + 0.5) { p.stuck = ve; p.stuckOff = new V3(nx, ny, nz).sub(ve.pos); }
      }
      var t = w.raycast(p.pos.x, p.pos.y, p.pos.z, nx, ny, nz);
      if (t < 1) {
        p.pos.set(p.pos.x + (nx - p.pos.x) * t * 0.9, p.pos.y + (ny - p.pos.y) * t * 0.9, p.pos.z + (nz - p.pos.z) * t * 0.9);
        var gy = w.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.5);
        if (Math.abs(p.pos.y - gy) < 0.6) { p.vel.y = Math.abs(p.vel.y) * 0.3; p.vel.x *= 0.5; p.vel.z *= 0.5; p.pos.y = gy + 0.12; }
        else { p.vel.x *= -0.4; p.vel.z *= -0.4; }
        if (p.sticky) p.vel.set(0, 0, 0);
      } else p.pos.set(nx, ny, nz);
    } else if (p.stuck.alive) p.pos.copy(p.stuck.pos).add(p.stuckOff);
    if (p.mesh) p.mesh.position.copy(p.pos);
    if (Math.random() < 0.25) SF.FX.add.emit(p.pos.x, p.pos.y + 0.15, p.pos.z, 0, 0, 0, p.stun ? 0x6ab0ff : 0xff3322, 0.15, 0.1, 0, 0, 0);
    if (p.life <= 0) {
      C.explode(p.pos, p.radius, p.dmg, p.owner, { antiv: p.antiv, team: p.team, stun: p.stun, color: p.stun ? 0x6ab0ff : null });
      if (p.cluster) for (var k = 0; k < 4; k++) {
        var cp = { kind: 'grenade', owner: p.owner, team: p.team, pos: p.pos.clone().add(new V3(0, 0.5, 0)), vel: new V3((Math.random() - 0.5) * 10, 6, (Math.random() - 0.5) * 10), life: 0.8 + Math.random() * 0.4, radius: 3, dmg: 50, antiv: 1, mesh: SF.FX.grenadeMesh(), grav: 18 };
        g.proj.push(cp);
      }
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ explosions
  C.explode = function (pos, radius, dmg, owner, o) {
    o = o || {};
    var g = G();
    var team = o.team != null ? o.team : owner ? owner.team : -1;
    SF.FX.explosion(pos, o.small ? radius * 0.6 : radius, o.color);
    if (g.camPos) { var dc = g.camPos.distanceTo(pos); if (dc < radius * 8) g.shake = Math.max(g.shake || 0, (1 - dc / (radius * 8)) * (radius > 6 ? 1.2 : 0.6)); }
    for (var i = 0; i < g.units.length; i++) {
      var u = g.units[i];
      if (!u.alive || u.vehicle) continue;
      if (u.team === team && u !== owner) continue;
      var d = u.chest(tmp).distanceTo(pos);
      if (d > radius) continue;
      var k = 1 - d / radius;
      var amt = dmg * (0.25 + 0.75 * k) * (u === owner ? 0.5 : 1);
      u.damage(amt, owner, 'explosive', u.chest(tmp2));
      if (u.alive && k > 0.3 && !u.isHero) { tmp.subVectors(u.pos, pos).setY(0).normalize(); u.vel.x += tmp.x * 7 * k; u.vel.z += tmp.z * 7 * k; u.vel.y += 4 * k; u.onGround = false; }
      if (o.stun && u.alive) { u.buffs.stun = o.stun * (u.isHero ? 0.5 : 1); u.buffs.slow = o.stun + 2; }
    }
    for (i = 0; i < g.vehicles.length; i++) {
      var v = g.vehicles[i];
      if (!v.alive || v.team === team) continue;
      var dv = v.center(tmp).distanceTo(pos) - v.radius * 0.6;
      if (dv > radius) continue;
      var kv = Math.max(0, 1 - dv / radius);
      v.damage(dmg * (0.3 + 0.7 * kv) * (o.antiv || 1) * (owner && owner.has && owner.has('antiArmor') ? 1.4 : 1), owner, 'explosive', pos);
    }
    if (g.capitals) g.capitals.forEach(function (cap) {
      if (cap.team === team) return;
      cap.subs.forEach(function (sb) { if (sb.hp > 0 && sb.wpos.distanceTo(pos) < sb.r + radius) sb.damage(dmg * (o.antiv || 1), owner, 'explosive', pos); });
    });
    for (i = 0; i < g.deploy.length; i++) { var dp = g.deploy[i]; if (dp.team !== team && dp.hittable && dp.pos.distanceTo(pos) < radius + 1) dp.damage(dmg, owner); }
  };

  // ------------------------------------------------------------------ melee & cones
  C.meleeSwing = function (u, dmg, range, arcDot) {
    var g = G(), f = u.forward(tmp3), hits = 0;
    var c = u.chest(new V3());
    for (var i = 0; i < g.units.length; i++) {
      var e = g.units[i];
      if (!e.alive || e.team === u.team || e.vehicle) continue;
      tmp.subVectors(e.pos, u.pos); var dy = tmp.y; tmp.y = 0;
      var d = tmp.length();
      if (d > range + e.radius || Math.abs(dy) > 2.2) continue;
      if (d > 0.3 && tmp.dot(f) / d < arcDot) continue;
      // blade vs blade clash
      if (e.blocking && e.melee) { var ef = e.forward(tmp2); if (ef.dot(f) < -0.2) { SF.Audio.clash(e.chest(tmp2)); SF.FX.sparks(tmp2, 0xffffff, 12, 4); e.blockEnergy -= 20; if (e.blockEnergy > 0) continue; } }
      e.damage(dmg * (e.isHero ? 0.8 : 1), u, 'melee', e.chest(tmp2));
      if (!e.isHero && e.alive) { e.vel.x += f.x * 4; e.vel.z += f.z * 4; }
      hits++;
    }
    for (i = 0; i < g.vehicles.length; i++) {
      var v = g.vehicles[i];
      if (!v.alive || v.team === u.team) continue;
      if (v.center(tmp).distanceTo(c) < v.radius + range) { v.damage(dmg * 0.8, u, 'melee', c); hits++; }
    }
    for (i = 0; i < g.deploy.length; i++) { var dp = g.deploy[i]; if (dp.team !== u.team && dp.hittable && dp.pos.distanceTo(u.pos) < range + 1) dp.damage(dmg * 2, u); }
    if (hits && u.buffs.fury > 0) u.heal(10 * hits);
    return hits;
  };
  // targets inside a cone in front of u
  C.cone = function (u, range, dot, includeVeh) {
    var g = G(), out = [], f = u.aimDir(tmp3); f.y = 0; f.normalize();
    for (var i = 0; i < g.units.length; i++) {
      var e = g.units[i];
      if (!e.alive || e.team === u.team || e.vehicle) continue;
      tmp.subVectors(e.pos, u.pos); var dy = tmp.y; tmp.y = 0; var d = tmp.length();
      if (d > range || Math.abs(dy) > 6) continue;
      if (d > 0.5 && tmp.dot(f) / d < dot) continue;
      if (!G().world.los(u.chest(tmp2), e.chest(new V3()))) continue;
      out.push(e);
    }
    if (includeVeh) for (i = 0; i < g.vehicles.length; i++) {
      var v = g.vehicles[i]; if (!v.alive || v.team === u.team) continue;
      tmp.subVectors(v.pos, u.pos); tmp.y = 0; var dv = tmp.length();
      if (dv - v.radius < range && (dv < 1 || tmp.dot(f) / dv > dot)) out.push(v);
    }
    return out;
  };
  C.near = function (pos, r, team, sameTeam) {
    var g = G(), out = [];
    for (var i = 0; i < g.units.length; i++) {
      var e = g.units[i]; if (!e.alive || e.vehicle) continue;
      if (sameTeam ? e.team !== team : e.team === team) continue;
      if (e.pos.distanceTo(pos) <= r) out.push(e);
    }
    return out;
  };
  C.flameCone = function (u, origin, dir, range, dmgPerTick, tickT) {
    SF.FX.flame(origin, dir, range / 4, 1.5);
    u._flameAcc = (u._flameAcc || 0) + 1;
    if (u._flameAcc % 3) return;
    var list = C.cone(u, range, 0.75, true);
    list.forEach(function (e) {
      if (e.type === 'vehicle') e.damage(dmgPerTick * 2, u, 'fire'); else { e.damage(dmgPerTick * 3, u, 'fire', e.chest(tmp)); e.buffs.burning = 2; }
    });
  };

  // ------------------------------------------------------------------ deployables
  function aimPoint(u, maxD) {
    var g = G();
    if (u.isPlayer && g.aimPoint) { var d = g.aimPoint.distanceTo(u.pos); if (d <= maxD) return g.aimPoint.clone(); }
    if (!u.isPlayer && u.aimTarget) return u.aimTarget.clone();
    var e = u.eye(new V3()), f = u.aimDir(new V3());
    var end = e.clone().addScaledVector(f, maxD);
    var t = g.world.raycast(e.x, e.y, e.z, end.x, end.y, end.z);
    return e.addScaledVector(f, maxD * t);
  }
  C.aimPoint = aimPoint;
  function addDeploy(d) { G().deploy.push(d); return d; }
  C.updateDeploy = function (dt) {
    var g = G();
    for (var i = g.deploy.length - 1; i >= 0; i--) {
      var d = g.deploy[i];
      d.t = (d.t || 0) + dt;
      if (d.update(dt) === false || d.dead) { if (d.mesh) g.scene.remove(d.mesh); g.deploy.splice(i, 1); }
    }
  };
  function hpDeploy(d, hp) {
    d.hp = hp; d.hittable = true;
    d.damage = function (amt, src) { d.hp -= amt; if (d.hp <= 0 && !d.dead) { d.dead = true; SF.FX.explosion(d.pos.clone().setY(d.pos.y + 0.5), 2.5); if (src && src.isPlayer) { G().addBp(src, 50, 'Destroyed ' + d.label); } } };
  }

  C.shieldWall = function (u, w, h, life) {
    var g = G(), f = u.forward(new V3());
    var pos = u.pos.clone().addScaledVector(f, 2.2);
    pos.y = g.world.groundAt(pos.x, pos.z, u.pos.y + 1);
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x6ab8ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    mesh.position.set(pos.x, pos.y + h / 2, pos.z); mesh.rotation.y = u.yaw;
    g.scene.add(mesh);
    var d = { kind: 'shield', label: 'shield', team: u.team, pos: pos, normal: f, w: w, h: h, mesh: mesh, life: life, owner: u };
    hpDeploy(d, 900);
    d.update = function (dt) { d.life -= dt; mesh.material.opacity = 0.2 + Math.sin(d.t * 8) * 0.05 + (d.hp < 300 ? Math.random() * 0.2 : 0); return d.life > 0; };
    return addDeploy(d);
  };
  C.turret = function (u) {
    var g = G(), f = u.forward(new V3());
    var pos = u.pos.clone().addScaledVector(f, 1.6); pos.y = g.world.groundAt(pos.x, pos.z, u.pos.y + 1);
    var grp = new THREE.Group(), M = SF.Models;
    M.mesh('cyl', M.mat(0x4a4e54, 0.5, 0.5), grp, 0, 0.4, 0, 0.6, 0.8, 0.6);
    var head = M.grp(grp, 0, 0.95, 0);
    M.mesh('box', M.mat(0x6a6e74, 0.5, 0.5), head, 0, 0, 0, 0.5, 0.35, 0.6);
    M.mesh('cyl', M.mat(0x222428, 0.5, 0.5), head, 0, 0, -0.5, 0.08, 0.6, 0.08, Math.PI / 2, 0, 0);
    grp.position.copy(pos); g.scene.add(grp);
    var w = { dmg: 14, rpm: 400, speed: 220, range: 45, kind: 'carbine' };
    var d = { kind: 'turret', label: 'turret', team: u.team, pos: pos, mesh: grp, owner: u, life: 30, r: 0.7, hy: 0.8, fireT: 0 };
    hpDeploy(d, 220);
    d.update = function (dt) {
      d.life -= dt; if (d.life <= 0) return false;
      d.fireT -= dt;
      var best = null, bd = 45;
      var list = C.targets(d.team, true, true);
      var mz = new V3(pos.x, pos.y + 0.95, pos.z);
      for (var i = 0; i < list.length; i++) { var t = list[i]; if (t.cloaked && t.cloaked()) continue; var dd = t.pos.distanceTo(pos); if (dd < bd && g.world.los(mz, t.chest ? t.chest(tmp) : t.center(tmp))) { bd = dd; best = t; } }
      if (best) {
        var tp = best.chest ? best.chest(new V3()) : best.center(new V3());
        head.rotation.y = Math.atan2(-(tp.x - pos.x), -(tp.z - pos.z));
        if (d.fireT <= 0) {
          d.fireT = 0.15;
          var dir = tp.sub(mz).normalize(); dir.x += (Math.random() - 0.5) * 0.06; dir.y += (Math.random() - 0.5) * 0.06; dir.z += (Math.random() - 0.5) * 0.06; dir.normalize();
          C.fire(d.owner, mz.clone().addScaledVector(dir, 0.6), dir, w, { color: d.owner.boltColor() });
          SF.Audio.shot('carbine', mz);
        }
      }
      return true;
    };
    return addDeploy(d);
  };
  C.mine = function (u) {
    var g = G();
    var pos = u.pos.clone(); pos.y = g.world.groundAt(pos.x, pos.z, u.pos.y + 0.5);
    var M = SF.Models, m = M.mesh('cyl', M.mat(0x3a3e44, 0.5, 0.5), g.scene, pos.x, pos.y + 0.05, pos.z, 0.5, 0.1, 0.5);
    var light = M.mesh('sph', M.mat(0xff2222, 0, 0, 'glow'), g.scene, pos.x, pos.y + 0.12, pos.z, 0.08, 0.08, 0.08);
    var d = { kind: 'mine', label: 'mine', team: u.team, pos: pos, mesh: m, owner: u, life: 60, r: 0.4, hy: 0 };
    hpDeploy(d, 30);
    d.update = function (dt) {
      d.life -= dt;
      light.visible = (d.t % 1) < 0.5;
      if (d.life <= 0 || d.dead) { g.scene.remove(light); if (d.dead) C.explode(pos, 4.5, 170, d.owner, { team: d.team, antiv: 2 }); return false; }
      var list = C.targets(d.team, true, true);
      for (var i = 0; i < list.length; i++) if (list[i].pos.distanceTo(pos) < 2.8 + (list[i].radius || 0)) { g.scene.remove(light); C.explode(pos, 4.5, 170, d.owner, { team: d.team, antiv: 2 }); return false; }
      return true;
    };
    return addDeploy(d);
  };
  C.drone = function (u) {
    var g = G(), M = SF.Models;
    var grp = new THREE.Group();
    M.mesh('sph', M.mat(0x2a2c30, 0.4, 0.7), grp, 0, 0, 0, 0.45, 0.45, 0.45);
    M.mesh('sph', M.mat(0xff3322, 0, 0, 'glow'), grp, 0, 0, -0.2, 0.12, 0.12, 0.1);
    M.mesh('box', M.mat(0x4a4e54, 0.5, 0.5), grp, 0, 0, 0, 1.0, 0.05, 0.15);
    g.scene.add(grp);
    var d = { kind: 'drone', label: 'drone', team: u.team, pos: u.pos.clone(), mesh: grp, owner: u, life: 12, r: 0.35, hy: 0, zapT: 0 };
    hpDeploy(d, 120);
    d.update = function (dt) {
      d.life -= dt; if (d.life <= 0 || !u.alive) return false;
      var a = d.t * 2;
      d.pos.set(u.pos.x + Math.cos(a) * 1.6, u.pos.y + u.height + 0.6 + Math.sin(d.t * 3) * 0.2, u.pos.z + Math.sin(a) * 1.6);
      grp.position.copy(d.pos); grp.rotation.y = a;
      d.zapT -= dt;
      if (d.zapT <= 0) {
        var best = null, bd = 22;
        C.targets(d.team, true, false).forEach(function (t) { var dd = t.pos.distanceTo(d.pos); if (dd < bd && g.world.los(d.pos, t.chest(tmp))) { bd = dd; best = t; } });
        if (best) { d.zapT = 0.5; var c = best.chest(new V3()); SF.FX.lightning(d.pos, c, 0xff5544); best.damage(22, u, 'ability', c); SF.Audio.lightning(d.pos); }
      }
      return true;
    };
    return addDeploy(d);
  };
  C.bladeThrow = function (u) {
    var g = G();
    var R = u.rig, bo = R.bladeObjs[0];
    var thrown = SF.Models.blade(u.blade.blade, u.blade.style === 'dual' ? 'single' : u.blade.style, bo ? bo.len : 1);
    thrown.group.rotation.x = Math.PI / 2;
    var holder = new THREE.Group(); holder.add(thrown.group); g.scene.add(holder);
    if (bo) bo.group.visible = false;
    var dir = u.aimDir(new V3()); if (dir.y < -0.2) dir.y = -0.2; dir.normalize();
    var pos = u.chest(new V3()).addScaledVector(dir, 1);
    var hitOut = {}, hitBack = {};
    var d = { kind: 'saber', team: u.team, pos: pos, mesh: holder, owner: u, phase: 0, dist: 0 };
    d.update = function (dt) {
      holder.rotation.y += dt * 20;
      if (d.phase === 0) {
        var step = 26 * dt;
        var t = g.world.raycast(pos.x, pos.y, pos.z, pos.x + dir.x * step, pos.y + dir.y * step, pos.z + dir.z * step);
        pos.addScaledVector(dir, step * Math.min(1, t)); d.dist += step;
        if (d.dist > 20 || t < 1) d.phase = 1;
      } else {
        if (!u.alive) { if (bo) bo.group.visible = true; return false; }
        var c = u.chest(tmp);
        tmp2.subVectors(c, pos); var L = tmp2.length();
        if (L < 1.2) { if (bo) bo.group.visible = true; return false; }
        pos.addScaledVector(tmp2.normalize(), Math.min(L, 30 * dt));
      }
      holder.position.copy(pos);
      var set = d.phase ? hitBack : hitOut;
      C.targets(u.team, true, true).forEach(function (t) {
        if (set[t.id]) return;
        var tc = t.chest ? t.chest(tmp3) : t.center(tmp3);
        if (tc.distanceTo(pos) < 1.6 + (t.radius || 0) * (t.type === 'vehicle' ? 1 : 0)) { set[t.id] = 1; t.damage(t.type === 'vehicle' ? 120 : 85, u, 'melee', tc); SF.FX.sparks(tc, 0xffffff, 8, 4); }
      });
      if (!u.blade) { if (bo) bo.group.visible = true; return false; }
      if (Math.random() < 0.8) SF.FX.add.emit(pos.x, pos.y, pos.z, 0, 0, 0, u.blade.blade, 0.4, 0.15, 0, 0, 0);
      return true;
    };
    addDeploy(d);
  };
  C.barrage = function (u, point, n, radius, dmg) {
    var g = G();
    var marker = SF.Models.mesh('cyl', SF.Models.mat(0xff3322, 0, 0, 'add'), g.scene, point.x, point.y + 0.1, point.z, radius * 2, 0.1, radius * 2);
    marker.castShadow = false;
    var d = { kind: 'barrage', team: u.team, pos: point, mesh: marker, owner: u, fired: 0, nextT: 1.4 };
    d.update = function (dt) {
      marker.material.opacity = 0.3 + Math.sin(d.t * 12) * 0.15;
      if (d.t >= d.nextT) {
        d.nextT += 0.4; d.fired++;
        var p = point.clone(); p.x += (Math.random() - 0.5) * radius * 1.6; p.z += (Math.random() - 0.5) * radius * 1.6;
        p.y = g.world.groundAt(p.x, p.z, p.y + 20);
        SF.FX.beam(new V3(p.x, p.y + 80, p.z), p, 0xff6a3a, 2.5, 0.15);
        C.explode(p, 4, dmg, u, { team: u.team, antiv: 1.5 });
      }
      return d.fired < n;
    };
    addDeploy(d);
  };

  // ------------------------------------------------------------------ abilities
  function cast(u, kind, t) { u.anim.castT = t || 0.4; u.anim.castKind = kind || 'one'; }
  A.thermal = function (u) { C.throwGrenade(u, { dmg: 130, radius: 5, fuse: 1.8 }); };
  A.grenadeHero = function (u) { C.throwGrenade(u, { dmg: 140, radius: 5, fuse: 1.5, cluster: true }); };
  A.stunGrenade = function (u) { C.throwGrenade(u, { dmg: 25, radius: 6, fuse: 1.5, stun: 2.2, color: 0x2a4a8a }); };
  A.detpack = function (u) { C.throwGrenade(u, { dmg: 320, radius: 5.5, fuse: 1.6, antiv: 3, sticky: true, speed: 12, lob: 3, color: 0x8a6a2a }); };
  A.scanDart = function (u) {
    var p = aimPoint(u, 80);
    C.targets(u.team, true, true).forEach(function (t) { if (t.pos.distanceTo(p) < 30) { t.buffs && (t.buffs.revealed = 8); if (t.type === 'vehicle') t.revealed = 8; } });
    SF.FX.ring(p, 30, 0xffd84a, 0.8); u.anim.throwT = 0.3;
  };
  A.scatterBurst = function (u) {
    var w = { dmg: 18, rpm: 60, speed: 180, range: 12, pellets: 1, kind: 'shotgun', spread: 6 };
    var origin = u.muzzle(new V3()), dir = (u.isPlayer && G().aimPoint ? tmp2.subVectors(G().aimPoint, origin).normalize() : u.aimDir(tmp2));
    for (var s = 0; s < 2; s++) for (var i = 0; i < 9; i++) {
      var d = dir.clone(); d.x += (Math.random() - 0.5) * 0.14; d.y += (Math.random() - 0.5) * 0.1; d.z += (Math.random() - 0.5) * 0.14; d.normalize();
      C.fire(u, origin, d, w);
    }
    SF.Audio.shot('shotgun', origin); SF.FX.muzzle(origin, 0xffaa55);
  };
  A.shieldWall = function (u) { C.shieldWall(u, 4.2, 2.4, 12); };
  A.barrage = function (u) { var p = aimPoint(u, 120); C.barrage(u, p, 7, 7, 110); u.anim.castT = 0.4; };
  A.rocketShot = function (u) {
    var lo = SF.D.loadouts[u.faction]; var lw = SF.D.weapons[(lo && lo.launcher) || 'rp6'];
    var origin = u.muzzle(new V3()), dir = u.isPlayer && G().aimPoint ? tmp2.subVectors(G().aimPoint, origin).normalize() : (u.aimTarget ? tmp2.subVectors(u.aimTarget, origin).normalize() : u.aimDir(tmp2));
    C.fire(u, origin, dir, lw, { homing: lw.homing });
    SF.Audio.shot('launcher', origin);
  };
  A.rocketHero = function (u) {
    var origin = u.chest(new V3()).add(new V3(0, 0.3, 0)), dir = u.isPlayer && G().aimPoint ? tmp2.subVectors(G().aimPoint, origin).normalize() : (u.aimTarget ? tmp2.subVectors(u.aimTarget, origin).normalize() : u.aimDir(tmp2));
    C.fire(u, origin, dir, { dmg: 190, speed: 80, range: 200, kind: 'launcher', radius: 4.5, antiv: 2.5 }, {});
    SF.Audio.shot('launcher', origin);
  };
  A.tripmine = function (u) { C.mine(u); };
  A.cloak = function (u) { u.buffs.cloak = 6; u.setCloak(true); };
  A.cloakHero = function (u) { u.buffs.cloak = 6; u.buffs.cloakSpeed = 6; u.setCloak(true); };
  A.explosiveShot = function (u) { u.buffs.explosiveShots = 12; u.expLeft = 3; };
  A.rally = function (u) {
    C.near(u.pos, 12, u.team, true).forEach(function (a) { a.heal(60); a.buffs.rallied = 8; });
    SF.FX.healAura(u.pos, 0x5aff8a); SF.FX.ring(u.pos, 12, 0x5aff8a, 0.6); cast(u, 'both', 0.5);
  };
  A.heroRally = function (u) {
    C.near(u.pos, 15, u.team, true).forEach(function (a) { a.heal(a.isHero ? 150 : 100); a.buffs.shielded = 6; a.buffs.rallied = 8; });
    SF.FX.healAura(u.pos, 0x7ad8ff); SF.FX.ring(u.pos, 15, 0x7ad8ff, 0.7); cast(u, 'both', 0.5);
  };
  A.turret = function (u) { C.turret(u); };
  A.repair = function (u) {
    var g = G(), n = 0;
    g.vehicles.forEach(function (v) { if (v.alive && v.team === u.team && v.pos.distanceTo(u.pos) < 14 + v.radius) { v.hp = Math.min(v.maxHp, v.hp + v.maxHp * 0.25); n++; } });
    C.near(u.pos, 10, u.team, true).forEach(function (a) { a.heal(50); });
    SF.FX.ring(u.pos, 12, 0xffaa3a, 0.6); cast(u, 'one');
    if (n && u.isPlayer) G().addBp(u, 60 * n, 'Repair');
  };
  A.medDrone = function (u) { u.heal(u.maxHp); SF.FX.healAura(u.pos, 0x5aff8a); };
  A.dash = function (u) {
    var f = u.input.fwd || u.input.strafe ? new V3(-Math.sin(u.yaw) * u.input.fwd + Math.cos(u.yaw) * u.input.strafe, 0, -Math.cos(u.yaw) * u.input.fwd - Math.sin(u.yaw) * u.input.strafe).normalize() : u.forward(new V3());
    u.dashV = f.multiplyScalar(17); u.buffs.dashT = 0.24; u.dashHit = null;
    SF.FX.dust(u.pos, 0x9a9488, 6);
  };
  A.shoulder = function (u) {
    var f = u.forward(new V3()); u.dashV = f.multiplyScalar(19); u.buffs.dashT = 0.4;
    var hit = {};
    u.dashHit = function () {
      C.near(u.pos, 2.2, u.team, false).forEach(function (e) { if (hit[e.id]) return; hit[e.id] = 1; e.damage(70, u, 'melee', e.chest(tmp)); if (!e.isHero) { e.anim.knockT = 0.9; e.vel.addScaledVector(f, 0.5); e.vel.y = 5; e.onGround = false; } });
    };
  };
  A.overcharge = function (u) { u.buffs.overcharge = 6; u.heat = 0; u.overT = 0; };
  A.jetBoost = function (u) { u.vel.y = 13; u.onGround = false; u.jetFuel = 100; SF.Audio.jet(u.pos); };
  A.jetHero = function (u) { u.vel.y = 15; u.onGround = false; u.jetFuel = 100; SF.Audio.jet(u.pos); };
  A.hover = function (u) { if (u.onGround) { u.vel.y = 8; u.onGround = false; } u.buffs.hover = 4; };
  A.jumpPack = function (u) { var f = u.forward(new V3()); u.vel.set(f.x * 15, 11, f.z * 15); u.onGround = false; SF.Audio.jet(u.pos); };
  A.flame = function (u) { u.buffs.flaming = 2.2; };
  A.flameHero = function (u) { u.buffs.flaming = 1.8; };
  A.flameTick = function (u, dt) {
    var o = u.muzzle(new V3()), f = u.aimDir(new V3());
    C.flameCone(u, o, f, 11, 9, dt);
    SF.Audio.shot('flamer', o);
  };
  // Aether powers
  A.push = function (u) {
    cast(u, 'one', 0.45); SF.Audio.push(u.pos);
    var f = u.forward(new V3()), c = u.chest(new V3());
    SF.FX.ring(c.clone().addScaledVector(f, 3), 6, 0x9ad8ff, 0.4);
    for (var i = 0; i < 20; i++) SF.FX.add.emit(c.x, c.y, c.z, f.x * 25 + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4, f.z * 25 + (Math.random() - 0.5) * 8, 0x9ad8ff, 0.3, 0.35, 0, 2, 2);
    C.cone(u, 11, 0.5, false).forEach(function (e) {
      e.damage(e.isHero ? 40 : 75, u, 'ability', e.chest(tmp));
      var k = e.isHero ? 6 : 16; e.vel.x += f.x * k; e.vel.z += f.z * k; e.vel.y = e.isHero ? 3 : 7; e.onGround = false;
      if (!e.isHero) e.anim.knockT = 1.1;
    });
    // knock back projectiles
    G().proj.forEach(function (p) { if (p.team !== u.team && p.pos.distanceTo(c) < 10) { p.vel.negate(); p.team = u.team; p.owner = u; } });
  };
  A.pull = function (u) {
    var list = C.cone(u, 16, 0.75, false);
    if (!list.length) return false;
    var e = list[0], f = u.forward(new V3());
    e.pos.set(u.pos.x + f.x * 2, e.pos.y, u.pos.z + f.z * 2); e.buffs.stun = e.isHero ? 0.4 : 1.0;
    cast(u, 'one'); SF.Audio.push(u.pos);
  };
  A.saberThrow = function (u) { if (!u.blade) return false; C.bladeThrow(u); u.anim.throwT = 0.35; SF.Audio.swing(u.pos, 0.8); };
  A.leap = function (u) {
    var f = u.forward(new V3());
    var tgt = u.isPlayer ? null : u.aiTarget;
    var dist = 14;
    if (tgt) { dist = Math.min(18, Math.max(4, tgt.pos.distanceTo(u.pos))); f.subVectors(tgt.pos, u.pos).setY(0).normalize(); u.yaw = Math.atan2(-f.x, -f.z); }
    u.vel.set(f.x * dist * 0.95, 10.5, f.z * dist * 0.95); u.onGround = false;
    u.leapLand = function () {
      SF.FX.ring(u.pos, 5, 0x9ad8ff, 0.5); SF.FX.dust(u.pos, 0x9a9488, 10); SF.Audio.push(u.pos);
      C.near(u.pos, 4.5, u.team, false).forEach(function (e) { e.damage(e.isHero ? 50 : 90, u, 'ability', e.chest(tmp)); if (!e.isHero) e.anim.knockT = 0.9; });
    };
  };
  A.choke = function (u) {
    var list = C.cone(u, 15, 0.8, false);
    if (!list.length) return false;
    var e = list[0];
    cast(u, 'one', 2.0);
    e.buffs.lifted = e.isHero ? 1.0 : 2.0; e.liftY = e.pos.y + 1.4; e.onGround = false;
    var total = 0, dur = e.buffs.lifted;
    addDeploy({ kind: 'choke', team: u.team, pos: e.pos, update: function (dt) {
      if (!e.alive || !u.alive) { e.buffs.lifted = 0; return false; }
      var dd = Math.min(dt, dur - total); total += dt;
      e.damage((e.isHero ? 60 : 85) * dd, u, 'ability', null);
      return total < dur;
    } });
  };
  A.lightning = function (u) { u.buffs.channel = 'lightning'; u.buffs.channelT = 2.2; cast(u, 'both', 2.2); };
  A.lightningTick = function (u, dt) {
    var c = u.chest(new V3()).addScaledVector(u.forward(tmp2), 0.5);
    u.anim.castT = 0.2; u.anim.castKind = 'both';
    var list = C.cone(u, 13, 0.55, false);
    if (!list.length) { var tip = c.clone().addScaledVector(u.aimDir(tmp2), 8); if (Math.random() < 0.6) SF.FX.lightning(c, tip, 0x9ab8ff); }
    list.forEach(function (e) {
      if (Math.random() < 0.7) SF.FX.lightning(c, e.chest(tmp), 0x9ab8ff);
      e.damage((e.isHero ? 45 : 70) * dt, u, 'ability', null);
      e.buffs.stun = 0.2; e.buffs.slow = 0.5;
    });
    SF.Audio.lightning(c);
  };
  A.spin = function (u) {
    var n = 0;
    u.anim.swingT = 0; u.anim.swingIdx = 1; SF.Audio.swing(u.pos, 1.3);
    addDeploy({ kind: 'spin', team: u.team, pos: u.pos, update: function (dt) {
      u.yaw += dt * 22;
      if (this.t > n * 0.2) { n++; C.near(u.pos, 4, u.team, false).forEach(function (e) { e.damage(e.isHero ? 30 : 45, u, 'melee', e.chest(tmp)); }); }
      return this.t < 0.6;
    } });
  };
  A.mindTrick = function (u) {
    C.near(u.pos, 14, u.team, false).forEach(function (e) { if (!e.isHero) { e.buffs.confused = 4.5; } });
    SF.FX.ring(u.pos, 14, 0xd8d8ff, 0.8); cast(u, 'one', 0.6);
  };
  A.block = function () { return false; };
  A.fury = function (u) { u.buffs.fury = 8; SF.FX.ring(u.pos, 3, 0xff4a2a, 0.5); };
  A.sharpshot = function (u) { u.buffs.sharpshot = 8; u.sharpLeft = 5; };
  A.homing = function (u) {
    var c = u.chest(new V3()).add(new V3(0, 0.5, 0));
    var list = C.targets(u.team, true, true).filter(function (t) { return t.pos.distanceTo(u.pos) < 45 && G().world.los(c, t.chest ? t.chest(tmp) : t.center(tmp)); });
    list.sort(function (a, b) { return a.pos.distanceTo(u.pos) - b.pos.distanceTo(u.pos); });
    list = list.slice(0, 6);
    if (!list.length) return false;
    list.forEach(function (t, i) {
      var dir = new V3((Math.random() - 0.5), 1.2, (Math.random() - 0.5)).normalize();
      var p = C.fire(u, c, dir, { dmg: 80, speed: 45, range: 200, kind: 'launcher', radius: 2.5, antiv: 1.5 }, { target: t, homing: true });
      p.homing = t;
    });
    SF.Audio.shot('launcher', c);
  };
  A.roar = function (u) {
    C.near(u.pos, 9, u.team, false).forEach(function (e) { e.buffs.stun = e.isHero ? 0.8 : 2.0; });
    u.heal(150); SF.FX.ring(u.pos, 9, 0xffcc66, 0.6); SF.Audio.push(u.pos); cast(u, 'both', 0.6);
  };
  A.shieldHero = function (u) { u.buffs.invuln = 4; SF.FX.ring(u.pos, 2, 0x8ad8ff, 0.6); };
  A.deflectHero = function (u) { u.buffs.deflect = 4; SF.FX.ring(u.pos, 2, 0xd8d8ff, 0.6); };
  A.stunHero = function (u) {
    var origin = u.muzzle(new V3()), dir = u.isPlayer && G().aimPoint ? tmp2.subVectors(G().aimPoint, origin).normalize() : (u.aimTarget ? tmp2.subVectors(u.aimTarget, origin).normalize() : u.aimDir(tmp2));
    C.fire(u, origin, dir, { dmg: 45, speed: 160, range: 60, kind: 'ion' }, { stun: 2.2, color: 0x6ab0ff });
    SF.Audio.shot('ion', origin);
  };
  A.droneHero = function (u) { C.drone(u); };
  A.darkSaber = function (u) { u.heavySwing = true; u.anim.swingT = 0; u.anim.swingIdx = 2; u.swingHitDone = false; SF.Audio.swing(u.pos, 0.7); };
  A.snipeMark = function (u) {
    C.targets(u.team, true, false).forEach(function (t) { if (t.pos.distanceTo(u.pos) < 60) { t.buffs.marked = 8; t.buffs.revealed = 8; } });
    SF.FX.ring(u.pos, 20, 0xff4444, 0.8);
  };
  A.dualFire = function (u) { u.buffs.dualFire = 0.9; };
})();
