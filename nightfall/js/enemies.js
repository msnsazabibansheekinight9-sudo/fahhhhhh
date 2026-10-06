// The infected: zombies, hounds, the blind Skinner, the Warden and Crane's final form.
var NF = window.NF || (window.NF = {});
NF.enemies = (function () {
  var E = { list: [], noises: [] }, scene, V3 = THREE.Vector3;
  var Mo = NF.models, A = NF.anim, PI = Math.PI;
  E.init = function (sc) { scene = sc; };
  var STATS = {
    zombie: { hp: 60, speed: 0.7, rad: 0.32, turn: 2.2 },
    dog: { hp: 32, speed: 5.4, rad: 0.35, turn: 6 },
    skinner: { hp: 140, speed: 3.6, rad: 0.4, turn: 5 },
    warden: { hp: 450, speed: 1.75, rad: 0.5, turn: 2.5 },
    boss: { hp: 1300, speed: 1.15, rad: 1.0, turn: 1.6 }
  };
  E.spawn = function (type, id, x, z, o) {
    o = o || {};
    var rig = type === 'zombie' ? Mo.zombie(o.variant, o.seed || (Math.random() * 1e5 | 0)) : type === 'dog' ? Mo.dog(o.seed || 3) : type === 'skinner' ? Mo.skinner() : type === 'warden' ? Mo.warden() : Mo.abomination();
    rig.root.rotation.order = 'YXZ';
    scene.add(rig.root);
    var st = STATS[type];
    var e = { id: id, type: type, rig: rig, pos: new V3(x, 0, z), yaw: o.yaw || 0, hp: (o.hp || st.hp) * (type === 'zombie' ? 0.85 + Math.random() * 0.35 : 1), speed: st.speed * (o.speedMul || 1) * (type === 'zombie' ? 0.8 + Math.random() * 0.45 : 1), rad: st.rad, turn: st.turn,
      state: o.state || 'idle', t: 0, ph: Math.random() * 6, v: Math.random(), alert: !!o.alert, atkCd: 0, flinch: 0, flinchDir: 1, dead: false, fall: 0, fallDir: 1, legHp: 35, groanT: 2 + Math.random() * 5, stepT: 0, lastHeard: null, extra: {} };
    e.maxHp = e.hp;
    if (type === 'boss') { e.eyes = rig.eyes.map(function (g) { return { g: g, hp: 45, alive: true }; }); e.phase = 1; }
    if (o.hidden) { rig.root.visible = false; e.state = 'dormant'; }
    E.list.push(e); syncRig(e);
    return e;
  };
  E.byId = function (id) { for (var i = 0; i < E.list.length; i++) if (E.list[i].id === id) return E.list[i]; return null; };
  E.noise = function (pos, radius) { E.noises.push({ p: pos.clone(), r: radius, t: 0 }); };
  function syncRig(e) { e.rig.root.position.copy(e.pos); e.rig.root.rotation.y = e.yaw; }
  function angTo(e, p) { return Math.atan2(p.x - e.pos.x, p.z - e.pos.z); }
  function wrap(a) { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; }
  function turnTo(e, target, dt, rate) { var d = wrap(target - e.yaw); var m = (rate || e.turn) * dt; e.yaw += Math.max(-m, Math.min(m, d)); return Math.abs(d); }
  function eye(e) { return new V3(e.pos.x, e.type === 'dog' ? 0.6 : e.type === 'skinner' ? 0.5 : 1.6 * e.rig.scale, e.pos.z); }
  // pick where to walk: the player directly, or the next door toward them
  function steerTarget(e, P, canOpen) {
    var W = NF.world, ra = W.roomAt(e.pos.x, e.pos.z), rb = W.roomAt(P.pos.x, P.pos.z);
    if (rb && rb.safe) return null;
    if (!ra || !rb || ra === rb) return P.pos;
    var d = W.nextWaypoint(e.pos, P.pos, canOpen);
    if (!d) return null;
    var c = new V3(d.x, 0, d.z), n = d.axis === 'x' ? new V3(0, 0, 1) : new V3(1, 0, 0);
    var side = d.axis === 'x' ? Math.sign(e.pos.z - d.z) : Math.sign(e.pos.x - d.x);
    var dist = Math.hypot(e.pos.x - c.x, e.pos.z - c.z);
    if (!d.open && canOpen && dist < 2.0) W.openDoor(d);
    if (dist < 1.3) return c.clone().addScaledVector(n, -side * 2.0);
    return c.clone().addScaledVector(n, side * 0.6);
  }
  function move(e, target, speed, dt) {
    var ox = e.pos.x, oz = e.pos.z;
    var a = angTo(e, target); var off = turnTo(e, a, dt);
    var k = off > 1.2 ? 0.2 : 1;
    e.pos.x += Math.sin(e.yaw) * speed * k * dt; e.pos.z += Math.cos(e.yaw) * speed * k * dt;
    // separation
    E.list.forEach(function (o) { if (o === e || o.dead || o.state === 'dormant') return; var dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z, d2 = dx * dx + dz * dz, m = e.rad + o.rad; if (d2 < m * m && d2 > 1e-6) { var d = Math.sqrt(d2), p = (m - d) * 0.5; e.pos.x += dx / d * p; e.pos.z += dz / d * p; } });
    NF.world.collide(e.pos, e.rad, e.type === 'dog' ? 0.2 : 0.3);
    var r = NF.world.roomAt(e.pos.x, e.pos.z); if (r && r.safe) { e.pos.x = ox; e.pos.z = oz; return 0; }
    return speed * k;
  }
  function perceive(e, P, dt) {
    var d = e.pos.distanceTo(P.pos);
    if (e.alert) return d;
    for (var i = 0; i < E.noises.length; i++) { var n = E.noises[i]; if (n.p.distanceTo(e.pos) < n.r) { e.alert = true; e.lastHeard = n.p.clone(); } }
    if (e.type === 'skinner') { if (d < 2.4) e.alert = true; }
    else if (d < 2.5 || (d < (e.type === 'dog' ? 15 : 11) && NF.world.lineClear(eye(e), P.chest()))) e.alert = true;
    if (e.alert) { if (e.type === 'zombie') NF.audio.groan(eye(e), 1, 1.6); else if (e.type === 'dog') NF.audio.bark(eye(e)); }
    return d;
  }
  E.damage = function (e, dmg, part, point, dir, weapon) {
    if (e.dead || e.state === 'dormant') return;
    var mul = 1;
    if (part === 'head') mul = e.type === 'zombie' ? 2.6 : e.type === 'dog' ? 1.8 : e.type === 'warden' ? 1.4 : 1.5;
    else if (part === 'leg' || part === 'arm') mul = 0.6;
    else if (part === 'heart') mul = 2.2;
    else if (part === 'eye') mul = 1.2;
    if (e.type === 'boss' && part === 'eye') {
      e.eyes.forEach(function (ey) { if (ey.alive && point.distanceTo(ey.g.getWorldPosition(new V3())) < 0.15) { ey.hp -= dmg; if (ey.hp <= 0) { ey.alive = false; ey.g.scale.setScalar(0.01); NF.fx.blood(point, dir.clone().negate(), 25); NF.audio.roar(point); e.state = 'hurt'; e.t = 0; } } });
    }
    if (e.type === 'boss' && e.eyes) mul *= 1 + 0.12 * e.eyes.filter(function (x) { return !x.alive; }).length;
    var amount = dmg * mul;
    e.hp -= amount;
    e.flinch = Math.min(1.2, e.flinch + (weapon === 'shotgun' || weapon === 'magnum' ? 1 : 0.55)); e.flinchDir = Math.random() < 0.5 ? -1 : 1;
    NF.fx.blood(point, dir.clone().negate().add(new V3(0, 0.3, 0)), part === 'head' ? 16 : 9);
    NF.audio.impact(point, true);
    e.alert = true;
    if (e.type === 'zombie' && part === 'leg') { e.legHp -= dmg; }
    if (e.hp <= 0) {
      if (e.type === 'warden') { e.state = 'stunned'; e.t = 0; e.hp = 0; NF.audio.roar(eye(e)); return; }
      kill(e, part, dir, weapon);
      return;
    }
    if (e.type === 'zombie') {
      var close = NF.game.player.pos.distanceTo(e.pos) < 2.5;
      if ((weapon === 'shotgun' && close) || weapon === 'magnum' || e.legHp <= 0) { if (e.state !== 'down') { e.state = 'down'; e.t = 0; e.fallDir = e.legHp <= 0 ? -1 : 1; e.legHp = 30; } }
      else if (e.state !== 'attack' && e.state !== 'down' && (weapon === 'shotgun' || part === 'head' || Math.random() < 0.3)) { e.state = 'stagger'; e.t = 0; }
    } else if (e.type === 'dog' && e.state !== 'leap') { e.state = 'recover'; e.t = 0.2; e.pos.addScaledVector(dir, 0.4); }
    else if (e.type === 'skinner' && weapon !== 'handgun' && e.state !== 'pounce') { e.state = 'recover'; e.t = 0; }
    else if (e.type === 'boss' && e.phase === 1 && e.hp < e.maxHp * 0.5) { e.phase = 2; e.state = 'roar'; e.t = 0; e.speed *= 1.5; NF.game.event('bossPhase2'); }
  };
  function kill(e, part, dir, weapon) {
    e.dead = true; e.state = 'dying'; e.t = 0; e.hp = 0;
    var fwd = new V3(Math.sin(e.yaw), 0, Math.cos(e.yaw));
    e.fallDir = dir && fwd.dot(dir) > 0 ? -1 : 1; // shot from behind → fall forward
    if (e.type === 'zombie' && part === 'head' && (weapon === 'magnum' || weapon === 'shotgun' || Math.random() < 0.35)) {
      e.rig.J.headMesh.visible = false; e.extra.headless = 1.2;
      NF.fx.blood(e.rig.J.head.getWorldPosition(new V3()), new V3(0, 1, 0), 30);
    }
    if (e.type === 'zombie' || e.type === 'skinner') NF.audio.groan(eye(e), 0.7, 0.8);
    if (e.type === 'dog') NF.audio.growl(eye(e));
    if (e.type === 'boss') { NF.audio.roar(eye(e)); NF.game.event('bossDead'); }
    NF.game.onKill(e);
  }
  // ray against every live enemy hit sphere
  E.raycast = function (o, d, max) {
    var best = null, bestT = max, c = new V3(), oc = new V3();
    E.list.forEach(function (e) {
      if (e.dead || e.state === 'dormant' || !e.rig.root.visible) return;
      // cheap reject
      oc.subVectors(e.pos, o); var along = oc.dot(d); if (along < -2 || along > bestT + 2) return;
      e.rig.root.updateMatrixWorld(true);
      var sc = e.rig.scale * e.rig.root.scale.x;
      e.rig.hits.forEach(function (h) {
        if (h.part === 'head' && e.extra.headless) return;
        if (h.obj && h.obj.scale.x < 0.1) return;
        c.copy(h.off); h.j.localToWorld(c);
        var r = h.r * sc;
        oc.subVectors(c, o); var tca = oc.dot(d); var d2 = oc.lengthSq() - tca * tca;
        if (d2 > r * r) return;
        var thc = Math.sqrt(r * r - d2), t = tca - thc; if (t < 0) t = tca + thc;
        // prefer weak points when spheres overlap
        var pri = h.part === 'eye' || h.part === 'heart' || h.part === 'head' ? -0.12 : 0;
        if (t > 0 && t + pri < bestT) { bestT = t + pri; best = { e: e, part: h.part, t: t, point: o.clone().addScaledVector(d, t) }; }
      });
    });
    return best;
  };
  var tmp = new V3();
  E.update = function (t, dt, P) {
    E.noises.forEach(function (n) { n.t += dt; }); E.noises = E.noises.filter(function (n) { return n.t < 0.3; });
    for (var i = 0; i < E.list.length; i++) {
      var e = E.list[i];
      if (e.state === 'dormant') continue;
      e.t += dt; e.atkCd -= dt; e.flinch = Math.max(0, e.flinch - dt * 3);
      var fn = UPDATE[e.type]; fn(e, t, dt, P);
      syncRig(e);
      if (e.extra.headless > 0) { e.extra.headless -= dt; if (Math.random() < 0.5) NF.fx.blood(e.rig.J.neck.getWorldPosition(tmp), new V3(0, 1.4, 0), 2); }
    }
  };
  function k(dt, s) { return 1 - Math.exp(-dt * (s || 12)); }
  function fallAnim(e, dt, pose, lieY) {
    var f = Math.min(1, Math.max(0, (e.t - 0.25) / 0.5)); var ease = f * f;
    e.rig.root.rotation.x = -e.fallDir * PI / 2 * ease;
    e.rig.root.position.y = (lieY || 0.14) * ease;
    if (f > 0.5) e.rig.root.position.y += Math.sin(Math.min(1, (f - 0.5) * 4) * PI) * 0.04 * (1 - f);
    if (e.t < 0.3) A.dying(pose, Math.min(1, e.t / 0.3)); else A.dead(pose);
  }
  var UPDATE = {
    zombie: function (e, t, dt, P) {
      var pose;
      if (e.state === 'dying' || e.state === 'dead') {
        pose = A.base(); fallAnim(e, dt, pose); if (e.t > 1.2 && e.state === 'dying') { e.state = 'dead'; NF.fx.blood(e.pos.clone().setY(0.2), new V3(0, 0.5, 0), 6); }
        A.apply(e.rig, pose, k(dt, 10)); e.rig.root.position.x = e.pos.x; e.rig.root.position.z = e.pos.z; return;
      }
      var d = perceive(e, P, dt);
      e.groanT -= dt; if (e.groanT < 0 && d < 18) { NF.audio.groan(eye(e), 0.9 + e.v * 0.3); e.groanT = 4 + Math.random() * 6; }
      if (e.state === 'eat') { pose = A.zEat(t, e.v); if (e.alert && e.t > 0.5) { e.state = 'rise'; e.t = 0; } }
      else if (e.state === 'rise') { pose = A.zEat(t, e.v); var kk = Math.min(1, e.t / 1.2); pose.hipsY *= 1 - kk; pose.hipL[0] *= 1 - kk; pose.hipR[0] *= 1 - kk; pose.knL[0] *= 1 - kk; pose.knR[0] *= 1 - kk; pose.spine[0] *= 1 - kk; turnTo(e, angTo(e, P.pos), dt, 1.5); if (e.t > 1.2) { e.state = 'chase'; e.t = 0; } }
      else if (e.state === 'down') {
        pose = A.base(); var lying = Math.min(1, e.t / 0.5), rising = e.t > 3.2 ? Math.min(1, (e.t - 3.2) / 1.0) : 0;
        var tilt = lying * (1 - rising);
        e.rig.root.rotation.x = -e.fallDir * PI / 2 * tilt * tilt; e.rig.root.position.y = 0.14 * tilt;
        if (tilt > 0.5) { A.dead(pose); pose.shL[0] -= 0.4 * Math.sin(t * 3); pose.head = [0.3, 0.5 * Math.sin(t * 2), 0]; } else A.dying(pose, 1 - rising * rising);
        if (e.t > 4.2) { e.state = 'chase'; e.t = 0; e.rig.root.rotation.x = 0; }
      }
      else if (e.state === 'stagger') { pose = A.shamble(e.ph, 0, t, e.v); A.stagger(pose, Math.sin(Math.min(1, e.t / 0.6) * PI), e.flinchDir); e.pos.addScaledVector(new V3(-Math.sin(e.yaw), 0, -Math.cos(e.yaw)), dt * 0.6); NF.world.collide(e.pos, e.rad); if (e.t > 0.6) { e.state = 'chase'; e.t = 0; } }
      else if (e.state === 'attack') {
        pose = A.zAttack(Math.min(1, e.t / 0.7), e.v); turnTo(e, angTo(e, P.pos), dt, 3);
        if (!e.extra.hitDone && e.t > 0.55) { e.extra.hitDone = true; if (d < 1.5 && P.alive) P.hurt(18 + Math.random() * 6, e, 'grab'); }
        if (e.t > 1.0) { e.state = 'chase'; e.t = 0; e.atkCd = 1.4; }
      }
      else if (e.alert && P.alive) {
        e.state = 'chase';
        var tgt = steerTarget(e, P) || e.lastHeard;
        var sp = !tgt || d < 1.15 ? 0 : move(e, tgt, e.speed, dt);
        e.ph += dt * (sp * 3.2 + 0.4);
        pose = A.shamble(e.ph, Math.min(1, sp / 0.5 + 0.3), t, e.v);
        if (d < 1.25 && e.atkCd <= 0 && !P.grabbedBy && P.invuln <= 0) { e.state = 'attack'; e.t = 0; e.extra.hitDone = false; }
        e.stepT -= dt; if (e.stepT < 0 && sp > 0.1) { NF.audio.step(eye(e).setY(0), 'wood', 0.12); e.stepT = 0.8; }
      } else pose = A.shamble(e.ph, 0, t, e.v);
      if (e.flinch > 0 && e.state !== 'down') A.stagger(pose, e.flinch * 0.5, e.flinchDir);
      A.apply(e.rig, pose, k(dt, 10));
    },
    dog: function (e, t, dt, P) {
      var pose;
      if (e.dead) {
        var f = Math.min(1, e.t / 0.4); e.rig.root.rotation.z = PI / 2 * f * e.fallDir; e.rig.root.position.y = 0.1 * f;
        A.apply(e.rig, A.dogDead(), k(dt, 8)); return;
      }
      var d = perceive(e, P, dt);
      if (e.state === 'leap') {
        var kk = Math.min(1, e.t / 0.55);
        e.pos.lerpVectors(e.extra.from, e.extra.to, kk); NF.world.collide(e.pos, e.rad, 0.2);
        e.rig.root.position.y = Math.sin(kk * PI) * 0.7;
        pose = A.dogLeap(kk);
        if (!e.extra.hitDone && kk > 0.6 && e.pos.distanceTo(P.pos) < 1.0) { e.extra.hitDone = true; if (P.alive) P.hurt(14, e, 'bite'); }
        if (kk >= 1) { e.state = 'recover'; e.t = 0; e.rig.root.position.y = 0; }
        A.apply(e.rig, pose, k(dt, 16)); e.rig.root.position.x = e.pos.x; e.rig.root.position.z = e.pos.z;
        return;
      }
      if (e.state === 'recover') { pose = A.dogGrowl(t); turnTo(e, angTo(e, P.pos), dt); if (e.t > 0.7) { e.state = 'chase'; e.t = 0; } }
      else if (e.alert && P.alive) {
        e.state = 'chase';
        var tgt = steerTarget(e, P);
        if (!tgt) tgt = e.pos;
        else if (tgt === P.pos && d > 4) { // circle a little before committing
          tgt = P.pos.clone().add(new V3(Math.sin(t * 0.8 + e.v * 6) * 2.2, 0, Math.cos(t * 0.8 + e.v * 6) * 2.2));
        }
        var sp = move(e, tgt, d < 3.5 ? 2.5 : e.speed, dt); e.ph += dt * (6 + sp * 1.6);
        pose = A.dogRun(e.ph, Math.min(1, sp / 3 + 0.2), t);
        if (d < 3.2 && e.atkCd <= 0 && NF.world.lineClear(eye(e), P.chest())) { e.state = 'leap'; e.t = 0; e.atkCd = 1.6; e.extra.hitDone = false; e.extra.from = e.pos.clone(); e.extra.to = P.pos.clone().add(new V3(Math.sin(e.yaw), 0, Math.cos(e.yaw)).multiplyScalar(0.6)); NF.audio.bark(eye(e)); }
        if (Math.random() < dt * 0.4) NF.audio.growl(eye(e));
      } else pose = A.dogGrowl(t);
      A.apply(e.rig, pose, k(dt, 14));
    },
    skinner: function (e, t, dt, P) {
      var pose, J = e.rig.J;
      if (e.dead) {
        pose = A.crawl(0, 0, 0); pose.hipsY = -0.5; var f = Math.min(1, e.t / 0.5);
        e.rig.root.rotation.z = f * 1.4 * e.fallDir; e.rig.root.position.y = 0.1 * f;
        A.apply(e.rig, pose, k(dt, 6)); J.tongue.scale.z = 0.05; return;
      }
      var d = e.pos.distanceTo(P.pos);
      // blind: hears gunshots and running, feels anything close
      E.noises.forEach(function (n) { if (n.p.distanceTo(e.pos) < n.r) { e.lastHeard = n.p.clone(); if (!e.alert) { e.alert = true; NF.audio.screech(eye(e)); } } });
      if (d < 2.6 && P.alive) { e.lastHeard = P.pos.clone(); e.alert = true; }
      var tongue = 0.05;
      if (e.state === 'pounce') {
        var kk = Math.min(1, e.t / 0.5);
        e.pos.lerpVectors(e.extra.from, e.extra.to, kk); NF.world.collide(e.pos, e.rad);
        e.rig.root.position.y = Math.sin(kk * PI) * 0.8;
        pose = A.pounce(kk);
        if (!e.extra.hitDone && kk > 0.55 && e.pos.distanceTo(P.pos) < 1.3) { e.extra.hitDone = true; if (P.alive) P.hurt(26, e, 'claw'); }
        if (kk >= 1) { e.state = 'recover'; e.t = 0; e.rig.root.position.y = 0; }
        A.apply(e.rig, pose, k(dt, 16)); e.rig.root.position.x = e.pos.x; e.rig.root.position.z = e.pos.z; J.tongue.scale.z = 0.05; return;
      }
      if (e.state === 'lash') {
        var kl = e.t / 0.6; pose = A.crawl(e.ph, 0, t); pose.neck = [-0.9, 0, 0]; pose.head = [-0.2, 0, 0]; pose.jaw = [0.8, 0, 0];
        tongue = Math.sin(Math.min(1, kl) * PI) * 1.0; turnTo(e, angTo(e, P.pos), dt, 6);
        if (!e.extra.hitDone && kl > 0.45) { e.extra.hitDone = true; if (d < 3.4 && P.alive) P.hurt(10, e, 'lash'); }
        if (kl >= 1) { e.state = 'stalk'; e.t = 0; e.atkCd = 1.5; }
      }
      else if (e.state === 'recover') { pose = A.crawl(e.ph, 0, t); if (e.t > 0.6) { e.state = 'stalk'; e.t = 0; } }
      else if (e.alert && e.lastHeard) {
        e.state = 'stalk';
        var tgt = d < 2.6 ? P.pos : e.lastHeard;
        var near = e.pos.distanceTo(tgt) < 1.0;
        var sp = near ? 0 : move(e, steerTarget(e, { pos: tgt }) || tgt, e.speed * (d < 6 ? 1 : 0.7), dt);
        if (near && d > 2.6) { e.lastHeard = null; }
        e.ph += dt * (sp * 2.4 + 0.5);
        pose = A.crawl(e.ph, Math.min(1, sp / 2 + 0.2), t);
        if (P.alive && e.atkCd <= 0 && d < 5.5 && d > 2.2 && NF.world.lineClear(eye(e), P.chest()) && e.lastHeard && e.lastHeard.distanceTo(P.pos) < 2.5) { e.state = 'pounce'; e.t = 0; e.atkCd = 2.0; e.extra.hitDone = false; e.extra.from = e.pos.clone(); e.extra.to = P.pos.clone(); NF.audio.screech(eye(e)); }
        else if (P.alive && e.atkCd <= 0 && d < 3.2) { e.state = 'lash'; e.t = 0; e.extra.hitDone = false; }
      } else { pose = A.crawl(e.ph, 0, t); e.alert = e.alert && !!e.lastHeard; }
      if (e.flinch > 0) A.add(pose, 'spine', -0.3 * e.flinch, 0, 0);
      J.tongue.scale.z += (tongue - J.tongue.scale.z) * k(dt, 18);
      J.tongueSegs.forEach(function (s, i) { s.rotation.x = Math.sin(t * 6 + i * 0.7) * 0.15; s.rotation.y = Math.sin(t * 4 + i) * 0.12; });
      A.apply(e.rig, pose, k(dt, 12));
    },
    warden: function (e, t, dt, P) {
      var pose, d = e.pos.distanceTo(P.pos);
      if (e.state === 'stunned') {
        pose = A.base(); A.dying(pose, Math.min(1, e.t / 0.6)); pose.hipsY = -0.35 * Math.min(1, e.t / 0.6); pose.head = [0.7, 0, 0];
        if (e.t > 11) { pose = A.base(); }
        if (e.t > 12) { e.state = 'walk'; e.t = 0; e.hp = e.maxHp; NF.audio.roar(eye(e)); }
        A.apply(e.rig, pose, k(dt, 6)); return;
      }
      if (e.state === 'cleave') {
        pose = A.cleave(Math.min(1, e.t / 1.3)); if (e.t < 0.55) turnTo(e, angTo(e, P.pos), dt, 2);
        if (!e.extra.hitDone && e.t > 0.66) { e.extra.hitDone = true; NF.audio.thud(eye(e).setY(0.5), 1.2); NF.game.shake(0.5); var fwd = new V3(Math.sin(e.yaw), 0, Math.cos(e.yaw)); var to = P.pos.clone().sub(e.pos); if (d < 2.3 && fwd.dot(to.normalize()) > 0.4 && P.alive) P.hurt(38, e, 'cleave'); }
        if (e.t > 1.6) { e.state = 'walk'; e.t = 0; e.atkCd = 0.6; }
      } else if (P.alive) {
        e.state = 'walk';
        var tgt = steerTarget(e, P, true);
        var sp = !tgt || d < 1.6 ? 0 : move(e, tgt, e.speed, dt);
        var prev = e.ph; e.ph += dt * (sp * 2.2 + 0.2);
        if (Math.floor(prev / PI) !== Math.floor(e.ph / PI) && sp > 0.1) { NF.audio.thud(eye(e).setY(0), 0.9); NF.game.shake(Math.max(0, 0.35 - d * 0.025)); }
        pose = A.heavyWalk(e.ph, Math.min(1, sp / 1.2 + 0.1), t);
        if (d < 2.1 && e.atkCd <= 0) { e.state = 'cleave'; e.t = 0; e.extra.hitDone = false; }
      } else pose = A.idle(t, 0);
      if (e.flinch > 0) A.add(pose, 'spine', -0.15 * e.flinch, 0.1 * e.flinchDir * e.flinch, 0);
      A.apply(e.rig, pose, k(dt, 9));
    },
    boss: function (e, t, dt, P) {
      var pose, d = e.pos.distanceTo(P.pos), b = e.rig;
      var hs = 1 + 0.12 * Math.max(0, Math.sin(t * (e.phase === 2 ? 9 : 5)));
      b.heart.scale.setScalar(hs);
      b.eyes.forEach(function (g, i) { g.rotation.y = Math.sin(t * 2 + i) * 0.4 + Math.atan2(P.pos.x - e.pos.x, P.pos.z - e.pos.z) * 0.1; });
      if (e.state === 'dying' || e.state === 'dead') {
        pose = A.boss('hurt', 0, t); var f = Math.min(1, e.t / 2.2);
        pose.hipsY = -0.5 * f; pose.knL = [1.5 * f, 0, 0]; pose.knR = [1.5 * f, 0, 0]; pose.hipL = [-0.8 * f, 0, 0]; pose.hipR = [-0.8 * f, 0, 0];
        if (e.t > 1.4) { var g = Math.min(1, (e.t - 1.4) / 0.8); b.root.rotation.x = PI / 2 * g * g; b.root.position.y = 0.3 * g; }
        if (e.state === 'dying' && e.t > 2.4) { e.state = 'dead'; NF.audio.thud(e.pos, 2); NF.game.shake(1); NF.fx.debris(e.pos.clone(), 10, 0.4); }
        A.apply(b, pose, k(dt, 4)); return;
      }
      if (e.state === 'emerge') { pose = A.boss('roar', Math.min(1, e.t / 2.5), t); A.apply(b, pose, k(dt, 4)); return; }
      if (e.state === 'roar') { pose = A.boss('roar', e.t / 2.0, t); if (e.t > 2) { e.state = 'walk'; e.t = 0; } if (e.t < dt * 2) NF.audio.roar(eye(e)); A.apply(b, pose, k(dt, 6)); return; }
      if (e.state === 'hurt') { pose = A.boss('hurt', 0, t); if (e.t > 1.3) { e.state = 'walk'; e.t = 0; } A.apply(b, pose, k(dt, 8)); return; }
      var fwd = new V3(Math.sin(e.yaw), 0, Math.cos(e.yaw));
      if (e.state === 'slam') {
        var dur = e.phase === 2 ? 1.3 : 1.6, ph = e.t / dur;
        pose = A.boss('slam', ph, t); if (ph < 0.45) turnTo(e, angTo(e, P.pos), dt, 1.5);
        if (!e.extra.hitDone && ph > 0.58) {
          e.extra.hitDone = true; var imp = e.pos.clone().addScaledVector(fwd, 2.6); NF.fx.shock(imp); NF.audio.thud(imp, 2); NF.game.shake(0.9);
          if (P.pos.distanceTo(imp) < 2.6 && P.alive) P.hurt(40, e, 'slam');
        }
        if (ph > 1.25) { e.state = 'walk'; e.t = 0; e.atkCd = e.phase === 2 ? 0.6 : 1.2; }
      } else if (e.state === 'sweep') {
        var dur2 = e.phase === 2 ? 1.1 : 1.4, ph2 = e.t / dur2;
        pose = A.boss('sweep', ph2, t);
        if (!e.extra.hitDone && ph2 > 0.5) { e.extra.hitDone = true; NF.audio.knife(); var to = P.pos.clone().sub(e.pos).normalize(); if (d < 4.0 && fwd.dot(to) > -0.1 && P.alive) P.hurt(30, e, 'sweep'); }
        if (ph2 > 1.2) { e.state = 'walk'; e.t = 0; e.atkCd = e.phase === 2 ? 0.5 : 1.0; }
      } else if (P.alive) {
        e.state = 'walk';
        var sp = d < 3 ? 0 : move(e, P.pos, e.speed, dt); if (d < 3) turnTo(e, angTo(e, P.pos), dt);
        var prev = e.ph; e.ph += dt * (sp * 2 + 0.3);
        if (Math.floor(prev / PI) !== Math.floor(e.ph / PI) && sp > 0.1) { NF.audio.thud(e.pos, 1.3); NF.game.shake(0.15); }
        pose = A.boss(sp > 0.1 ? 'walk' : 'idle', e.ph, t);
        if (d < 4.2 && e.atkCd <= 0) { e.state = Math.random() < 0.55 ? 'slam' : 'sweep'; e.t = 0; e.extra.hitDone = false; NF.audio.groan(eye(e), 0.5, 1); }
      } else pose = A.boss('idle', 0, t);
      if (e.flinch > 0) A.add(pose, 'spine', -0.12 * e.flinch, 0, 0);
      A.apply(b, pose, k(dt, 8));
    }
  };
  E.clear = function () { E.list.forEach(function (e) { scene.remove(e.rig.root); }); E.list = []; };
  return E;
})();
