// Bot brains: objective pathing on the nav grid, target selection, aiming with reaction delay, heat discipline,
// blade-legend duelling, ability usage, and drivers/pilots for ground vehicles and starfighters.
var SF = window.SF || (window.SF = {});

(function () {
  var V3 = THREE.Vector3;
  var G = function () { return SF.G; };
  var tmp = new V3(), tmp2 = new V3();
  var angDiff = function (a, b) { return SF.angDiff(a, b); };

  function Brain(u) {
    this.u = u; u.ai = this;
    this.targetT = Math.random() * 0.4; this.pathT = 0; this.path = null; this.pi = 0;
    this.strafeT = 0; this.strafeDir = 1; this.burst = 0; this.reaction = 0;
    this.stuckT = 0; this.lastPos = new V3(); this.goal = null; this.target = null; this.abilityT = 1 + Math.random() * 2;
    this.crouchT = 0; this.aimErr = new V3();
    this.flyMode = 'attack'; this.flyT = 0;
  }
  SF.Brain = Brain;
  var BP = Brain.prototype;

  BP.onHurt = function (src) {
    if (src && (src.type === 'unit' || src.type === 'vehicle') && src.alive && src.team !== this.u.team && (!this.target || Math.random() < 0.5)) { this.target = src; this.reaction = Math.min(this.reaction, 0.25); }
  };

  function skill() { return G().skill || 0.6; }

  BP.update = function (dt) {
    var u = this.u, g = G();
    if (!u.alive) return;
    var inp = u.input;
    inp.fire = false; inp.ab[0] = inp.ab[1] = inp.ab[2] = false; inp.jump = false; inp.vent = false;
    if (u.vehicle) { if (u.vehicle.kind === 'fighter') this.pilot(dt); else this.drive(dt); return; }
    if (u.buffs.confused > 0) { inp.fwd = 0.5; inp.strafe = Math.sin(g.time + u.id); u.yaw += dt * 0.6; return; }

    // ---------------- targets
    this.targetT -= dt;
    if (this.targetT <= 0) { this.targetT = 0.35 + Math.random() * 0.25; this.pickTarget(); }
    var t = this.target;
    if (t && (!t.alive || (t.cloaked && t.cloaked() && t.pos.distanceTo(u.pos) > 8))) { t = this.target = null; }

    // ---------------- goal & path
    this.pathT -= dt;
    var goal = g.mode.botGoal(u) || { x: u.pos.x, z: u.pos.z, r: 5 };
    if (u.melee && t && t.pos.distanceTo(u.pos) < 40) goal = { x: t.pos.x, z: t.pos.z, r: 1.5, chase: true };
    var gd = Math.hypot(goal.x - u.pos.x, goal.z - u.pos.z);
    var goalMoved = !this.goal || Math.hypot(goal.x - this.goal.x, goal.z - this.goal.z) > (goal.chase ? 3 : 8);
    if ((this.pathT <= 0 || goalMoved) && gd > (goal.r || 4)) {
      this.pathT = 2.5 + Math.random() * 2;
      this.goal = { x: goal.x, z: goal.z, r: goal.r };
      if (g.pathBudget > 0) { g.pathBudget--; this.path = SF.World.findPath(g.world, u.pos.x, u.pos.z, goal.x, goal.z, 7000); this.pi = 0; }
      else this.pathT = 0.1;
    }
    var mvx = 0, mvz = 0;
    if (gd > (goal.r || 4)) {
      var wp = null;
      if (this.path && this.path.length) {
        while (this.pi < this.path.length && Math.hypot(this.path[this.pi].x - u.pos.x, this.path[this.pi].z - u.pos.z) < 2.2) this.pi++;
        wp = this.path[Math.min(this.pi, this.path.length - 1)];
      }
      if (!wp || (this.path && this.pi >= this.path.length)) wp = goal;
      mvx = wp.x - u.pos.x; mvz = wp.z - u.pos.z;
      var ml = Math.hypot(mvx, mvz) || 1; mvx /= ml; mvz /= ml;
    } else if (!t) {
      // hold position: patrol a little around the goal
      this.idleT = (this.idleT || 0) - dt;
      if (this.idleT <= 0) { this.idleT = 2 + Math.random() * 3; var a = Math.random() * 6.28; this.wander = { x: goal.x + Math.cos(a) * (goal.r || 4) * 0.7, z: goal.z + Math.sin(a) * (goal.r || 4) * 0.7 }; }
      if (this.wander) { mvx = this.wander.x - u.pos.x; mvz = this.wander.z - u.pos.z; var wl = Math.hypot(mvx, mvz); if (wl < 1) { mvx = mvz = 0; } else { mvx /= wl; mvz /= wl; } }
    }
    // stuck detection
    this.stuckT += dt;
    if (this.stuckT > 1.5) {
      if (u.pos.distanceTo(this.lastPos) < 1.0 && (mvx || mvz)) { this.path = null; this.pathT = 0; inp.jump = true; this.unstick = 0.8; this.unstickDir = Math.random() < 0.5 ? 1 : -1; }
      this.lastPos.copy(u.pos); this.stuckT = 0;
    }
    if (this.unstick > 0) { this.unstick -= dt; var px = -mvz * this.unstickDir, pz = mvx * this.unstickDir; mvx = px; mvz = pz; }

    // ---------------- facing & aim
    var desiredYaw = u.yaw, desiredPitch = 0;
    var dist = 0;
    if (t) {
      var tc = t.chest ? t.chest(tmp) : t.center(tmp);
      var e = u.eye(tmp2);
      dist = tc.distanceTo(e);
      // reaction + aim error that shrinks while tracking
      this.reaction -= dt;
      var err = (1.25 - skill()) * (0.5 + Math.min(1, dist / 60)) * (t.isHero ? 1.2 : 1);
      if (Math.random() < dt * 2) this.aimErr.set((Math.random() - 0.5) * err, (Math.random() - 0.5) * err * 0.7, (Math.random() - 0.5) * err);
      var aim = tc.clone().add(this.aimErr);
      if (t.vel && !u.melee) aim.addScaledVector(t.vel, dist / ((u.weapon && u.weapon.speed) || 220));
      u.aimTarget = aim;
      u.aiTarget = t;
      desiredYaw = Math.atan2(-(aim.x - e.x), -(aim.z - e.z));
      desiredPitch = Math.atan2(aim.y - e.y, Math.hypot(aim.x - e.x, aim.z - e.z));
    } else {
      u.aimTarget = null; u.aiTarget = null;
      if (mvx || mvz) desiredYaw = Math.atan2(-mvx, -mvz);
    }
    var turn = (2.5 + skill() * 4) * dt * (u.melee ? 1.5 : 1);
    u.yaw += Math.max(-turn, Math.min(turn, angDiff(desiredYaw, u.yaw)));
    u.pitch += (desiredPitch - u.pitch) * Math.min(1, dt * 6);
    u.aiSpread = (1 - skill()) * 2.5;

    // convert world move into local fwd/strafe
    var fx = -Math.sin(u.yaw), fz = -Math.cos(u.yaw), rx = Math.cos(u.yaw), rz = -Math.sin(u.yaw);
    var fwd = mvx * fx + mvz * fz, str = mvx * rx + mvz * rz;
    inp.sprint = !t && gd > 15;
    inp.aim = false;
    inp.crouch = false;

    if (t) {
      if (u.melee) this.duel(dt, t, dist);
      else {
        // combat strafe & fire discipline
        this.strafeT -= dt;
        if (this.strafeT <= 0) { this.strafeT = 0.6 + Math.random() * 1.4; this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.crouchT = Math.random() < 0.25 ? 1.5 : 0; }
        str += this.strafeDir * 0.7;
        if (this.crouchT > 0) { this.crouchT -= dt; inp.crouch = true; }
        var range = u.weapon ? u.weapon.range * (u.weapon.kind === 'sniper' ? 1.4 : 2.2) : 60;
        if (u.weapon && u.weapon.kind === 'shotgun' && dist > range) { /* close the gap */ }
        else if (dist < range * 0.4 && !g.mode.rushObjective) fwd *= 0.3;
        var facing = Math.abs(angDiff(desiredYaw, u.yaw)) < 0.25;
        if (this.reaction <= 0 && facing && dist < range * 1.4) {
          if (u.heat > 78) this.cooling = true;
          if (u.heat < 25) this.cooling = false;
          if (!this.cooling) {
            this.burst -= dt;
            if (this.burst > -0.25) inp.fire = true;
            if (this.burst < -0.35 - Math.random() * 0.3) this.burst = 0.3 + Math.random() * 0.6 * skill();
          }
          if (u.weapon && u.weapon.kind === 'sniper') inp.aim = true;
        }
        if (u.overT > 0 && Math.random() < 0.3) inp.vent = false;
      }
      if (dist < 25 && Math.random() < dt * 0.4) inp.jump = u.jetpack;
    } else this.reaction = 0.25 + (1 - skill()) * 0.6;

    inp.fwd = Math.max(-1, Math.min(1, fwd));
    inp.strafe = Math.max(-1, Math.min(1, str));
    if (u.jetpack && (mvx || mvz) && this.unstick > 0) inp.jump = true;

    // ---------------- abilities
    this.abilityT -= dt;
    if (this.abilityT <= 0) { this.abilityT = 0.5 + Math.random() * 0.8; this.useAbilities(t, dist); }
  };

  BP.pickTarget = function () {
    var u = this.u, g = G();
    var e = u.eye(tmp2);
    var best = null, bs = 1e9;
    var maxD = u.melee ? 45 : (u.weapon ? Math.min(150, u.weapon.range * (u.weapon.kind === 'sniper' ? 1.6 : 2.6)) : 80);
    var list = SF.Combat.targets(u.team, true, true);
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.kind === 'fighter' && !u.vehicle && !(u.weapon && u.weapon.kind === 'launcher')) continue;
      var d = t.pos.distanceTo(u.pos);
      if (d > maxD) continue;
      if (t.cloaked && t.cloaked() && d > 8) continue;
      var score = d * (t === u.lastHitBy ? 0.4 : 1) * (t.isPlayer ? 0.85 : 1) * (t.type === 'vehicle' && !u.melee ? 1.4 : 1);
      if (score > bs) continue;
      var tc = t.chest ? t.chest(tmp) : t.center(tmp);
      if (!g.world.los(e, tc)) continue;
      bs = score; best = t;
    }
    if (best !== this.target) { this.reaction = Math.max(this.reaction, 0.15 + (1 - skill()) * 0.5); }
    this.target = best;
  };

  BP.duel = function (dt, t, dist) {
    var u = this.u, inp = u.input;
    var ranged = t.type === 'unit' && !t.melee;
    if (dist > 3.2) {
      inp.sprint = dist > 10 && !ranged;
      inp.aim = ranged && dist > 6 && u.blockEnergy > 30 && Math.random() < 0.85;
    } else {
      // in range: swing, sometimes block against other blades
      if (t.melee && t.anim && t.anim.swingT > 0.1 && Math.random() < 0.6 * skill()) inp.aim = true;
      else inp.fire = true;
      inp.fwd = 0.25;
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeT = 0.5 + Math.random(); this.strafeDir = Math.random() < 0.5 ? -1 : 1; }
      inp.strafe = this.strafeDir * 0.5;
    }
  };

  // ability heuristics by id
  var USE = {
    thermal: function (u, t, d) { return t && d > 7 && d < 28; }, grenadeHero: function (u, t, d) { return t && d > 6 && d < 26; }, stunGrenade: function (u, t, d) { return t && d > 6 && d < 22; },
    detpack: function (u, t, d) { return t && t.type === 'vehicle' && d < 18; }, scanDart: function (u, t, d) { return Math.random() < 0.2; }, scatterBurst: function (u, t, d) { return t && d < 9; },
    shieldWall: function (u, t, d) { return t && d > 15 && u.hp < u.maxHp * 0.8; }, barrage: function (u, t, d) { return t && d > 15 && d < 90; }, rocketShot: function (u, t, d) { return t && (t.type === 'vehicle' || t.isHero) && d < 120; },
    tripmine: function (u, t, d) { return !t && Math.random() < 0.15; }, cloak: function (u, t, d) { return !t && Math.random() < 0.1 || u.hp < u.maxHp * 0.4; }, explosiveShot: function (u, t, d) { return t && d < 80; },
    rally: function (u) { return SF.Combat.near(u.pos, 12, u.team, true).length >= 2 || u.hp < u.maxHp * 0.6; }, turret: function (u, t, d) { return t && d > 10; }, repair: function (u) { return G().vehicles.some(function (v) { return v.alive && v.team === u.team && v.hp < v.maxHp * 0.8 && v.pos.distanceTo(u.pos) < 14; }) || u.hp < u.maxHp * 0.5; },
    medDrone: function (u) { return u.hp < u.maxHp * 0.4; }, dash: function (u, t, d) { return t && (d > 6 && u.melee || u.hp < u.maxHp * 0.5); }, overcharge: function (u, t, d) { return t && d < 60; },
    jetBoost: function (u, t, d) { return t && Math.random() < 0.4; }, hover: function (u, t, d) { return t && d > 10; }, flame: function (u, t, d) { return t && d < 10; }, jumpPack: function (u, t, d) { return Math.random() < 0.2; },
    push: function (u, t, d) { return t && d < 9; }, pull: function (u, t, d) { return t && d > 5 && d < 15; }, saberThrow: function (u, t, d) { return t && d > 5 && d < 18; }, leap: function (u, t, d) { return t && d > 7 && d < 17; },
    choke: function (u, t, d) { return t && d < 14; }, lightning: function (u, t, d) { return t && d < 12; }, spin: function (u, t, d) { return SF.Combat.near(u.pos, 4, u.team, false).length >= 2 || (t && t.isHero && d < 3); },
    mindTrick: function (u, t, d) { return SF.Combat.near(u.pos, 12, u.team, false).length >= 2; }, fury: function (u, t, d) { return t && d < 10; }, heroRally: function (u) { return u.hp < u.maxHp * 0.7 || SF.Combat.near(u.pos, 15, u.team, true).length >= 3; },
    sharpshot: function (u, t, d) { return t && d < 70; }, shoulder: function (u, t, d) { return t && d < 9; }, rocketHero: function (u, t, d) { return t && d < 70; }, homing: function (u, t, d) { return t && d < 40; },
    flameHero: function (u, t, d) { return t && d < 9; }, jetHero: function (u, t, d) { return t && Math.random() < 0.3; }, roar: function (u, t, d) { return SF.Combat.near(u.pos, 8, u.team, false).length >= 1; },
    shieldHero: function (u) { return u.hp < u.maxHp * 0.45; }, stunHero: function (u, t, d) { return t && d < 50; }, cloakHero: function (u) { return u.hp < u.maxHp * 0.5; }, droneHero: function (u, t, d) { return !!t; },
    deflectHero: function (u, t, d) { return t && !t.melee && d < 40; }, darkSaber: function (u, t, d) { return t && d < 3.5; }, snipeMark: function (u, t, d) { return !!t; }, dualFire: function (u, t, d) { return t && d < 30; }
  };
  BP.useAbilities = function (t, d) {
    var u = this.u;
    for (var i = 0; i < u.abilities.length; i++) {
      var a = u.abilities[i];
      if (a.t > 0) continue;
      var f = USE[a.id];
      if (f && f(u, t, d) && Math.random() < 0.55 + skill() * 0.3) { u.input.ab[i] = true; return; }
    }
  };

  // ---------------------------------------------------------------- ground vehicle driver
  BP.drive = function (dt) {
    var u = this.u, v = u.vehicle, inp = u.input, g = G();
    this.targetT -= dt;
    if (this.targetT <= 0) { this.targetT = 0.5; this.pickVehicleTarget(); }
    var t = this.target;
    if (t && !t.alive) t = this.target = null;
    var goal = g.mode.botGoal(u) || { x: v.pos.x, z: v.pos.z, r: 6 };
    var gd = Math.hypot(goal.x - v.pos.x, goal.z - v.pos.z);
    this.pathT -= dt;
    if (this.pathT <= 0 && gd > 12 && g.pathBudget > 0) { g.pathBudget--; this.pathT = 4; this.path = SF.World.findPath(g.world, v.pos.x, v.pos.z, goal.x, goal.z, 7000); this.pi = 0; }
    var wp = goal;
    if (this.path && this.path.length) {
      while (this.pi < this.path.length - 1 && Math.hypot(this.path[this.pi].x - v.pos.x, this.path[this.pi].z - v.pos.z) < Math.max(4, v.radius)) this.pi++;
      wp = this.path[this.pi];
    }
    var want = Math.atan2(-(wp.x - v.pos.x), -(wp.z - v.pos.z));
    var dy = angDiff(want, v.yaw);
    var bike = /skimmer|skiff|landspeeder|strider_open/.test(v.def.model);
    var close = gd < (goal.r || 8) + 4;
    // tanks stop at range to engage
    var engage = t && t.pos.distanceTo(v.pos) < 70;
    inp.fwd = close || (engage && !bike && Math.random() < 0.6) ? 0 : (Math.abs(dy) > 1.2 && !bike ? 0.2 : 1);
    if (bike) { u.yaw = want; inp.strafe = 0; }
    else inp.strafe = Math.abs(dy) > 0.08 ? (dy > 0 ? -1 : 1) : 0;
    // stuck → reverse
    this.stuckT += dt;
    if (this.stuckT > 2) { if (v.pos.distanceTo(this.lastPos) < 1.5 && inp.fwd > 0) { this.reverseT = 1.4; this.path = null; this.pathT = 0; } this.lastPos.copy(v.pos); this.stuckT = 0; }
    if (this.reverseT > 0) { this.reverseT -= dt; inp.fwd = -0.8; inp.strafe = 1; }
    inp.fire = false; inp.aim = false;
    if (t) {
      var tc = t.chest ? t.chest(new V3()) : t.center(new V3());
      tc.x += (Math.random() - 0.5) * (1.2 - skill()) * 3; tc.y += (Math.random() - 0.5) * (1.2 - skill()) * 2;
      u.aimTarget = tc;
      if (!bike) u.yaw = Math.atan2(-(tc.x - v.pos.x), -(tc.z - v.pos.z));
      var facing = bike ? Math.abs(angDiff(Math.atan2(-(tc.x - v.pos.x), -(tc.z - v.pos.z)), v.yaw)) < 0.3 : true;
      if (facing) { inp.fire = v.weapons[0].heat < 80; if (v.weapons[1] && Math.random() < dt * 0.8) inp.aim = true; }
    } else u.aimTarget = null;
  };
  BP.pickVehicleTarget = function () {
    var u = this.u, v = u.vehicle, g = G();
    var best = null, bd = 120, c = v.center(tmp2);
    SF.Combat.targets(u.team, true, true).forEach(function (t) {
      if (t.kind === 'fighter') return;
      var d = t.pos.distanceTo(v.pos) * (t.type === 'vehicle' ? 0.7 : 1);
      if (d < bd && g.world.los(c, t.chest ? t.chest(tmp) : t.center(tmp))) { bd = d; best = t; }
    });
    this.target = best;
  };

  // ---------------------------------------------------------------- pilot
  BP.pilot = function (dt) {
    var u = this.u, v = u.vehicle, inp = u.input, g = G();
    this.targetT -= dt;
    if (this.targetT <= 0 || (this.target && !this.target.alive)) { this.targetT = 1.5 + Math.random(); this.pickAirTarget(); }
    var t = this.target;
    inp.fire = false; inp.fwd = 0;
    this.flyT -= dt;
    var tpos = t ? (t.center ? t.center(new V3()) : t.chest ? t.chest(new V3()) : t.wpos.clone()) : null;
    if (this.flyMode === 'break' && this.flyT <= 0) this.flyMode = 'attack';
    if (t && this.flyMode === 'attack') {
      var d = tpos.distanceTo(v.pos);
      var lead = tpos.clone();
      if (t.vel) lead.addScaledVector(t.vel, d / 320);
      u.flyTo = lead;
      var nose = new V3(0, 0, -1).applyQuaternion(v.quat);
      var to = lead.clone().sub(v.pos).normalize();
      var dot = nose.dot(to);
      if (dot > 0.965 - (1 - skill()) * 0.02 && d < (t.sub ? 500 : 360)) { inp.fire = true; u.aimTarget = lead; }
      if (dot > 0.96 && d < 400 && v.weapons[1] && Math.random() < dt * 0.7) { v.lockTarget = t; inp.ab[0] = true; }
      var minD = t.sub ? t.r + 40 : (t.kind === 'fighter' ? 35 : 45);
      if (d < minD || (!g.world.space && !t.sub && t.kind !== 'fighter' && d < 60 && v.pos.y - tpos.y < 25)) { this.flyMode = 'break'; this.flyT = 2.5 + Math.random() * 1.5; var side = new V3(Math.random() - 0.5, g.world.space ? Math.random() - 0.5 : 0.6, Math.random() - 0.5).normalize(); this.breakTo = v.pos.clone().addScaledVector(nose, 200).addScaledVector(side, 180); }
      inp.fwd = d > 200 ? 1 : 0;
    } else {
      if (!this.breakTo || this.flyMode !== 'break') { var a = Math.random() * 6.28; this.breakTo = new V3(Math.cos(a) * 300, g.world.space ? (Math.random() - 0.5) * 200 : 90 + Math.random() * 60, Math.sin(a) * 300); this.flyMode = 'break'; this.flyT = 4; }
      u.flyTo = this.breakTo;
      inp.fwd = 1;
    }
    if (v.boostFuel > 50 && Math.random() < dt * 0.1) inp.ab[1] = true;
  };
  BP.pickAirTarget = function () {
    var u = this.u, v = u.vehicle, g = G();
    var best = null, bs = 1e9;
    g.vehicles.forEach(function (o) {
      if (!o.alive || o.team === u.team) return;
      var d = o.pos.distanceTo(v.pos) * (o.kind === 'fighter' ? 1 : 1.6) * (o.driver && o.driver.isPlayer ? 0.8 : 1);
      if (d < bs) { bs = d; best = o; }
    });
    if (g.capitals && (Math.random() < 0.45 || !best)) g.capitals.forEach(function (cap) {
      if (cap.team === u.team) return;
      cap.subs.forEach(function (sb) { if (sb.hp > 0) { var d = sb.wpos.distanceTo(v.pos) * 0.7; if (d < bs || Math.random() < 0.3) { bs = d; best = sb; } } });
    });
    if (!g.world.space && (!best || Math.random() < 0.35)) {
      // strafing run on infantry near an objective
      var list = SF.Combat.targets(u.team, true, false);
      if (list.length) { var pick = list[(Math.random() * list.length) | 0]; if (!best || pick.pos.distanceTo(v.pos) < bs) best = pick; }
    }
    this.target = best;
  };
})();
