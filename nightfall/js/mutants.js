// The things that live under Camp Greaves and nowhere else: Hollow Troopers, Lashers, Stalkers,
// spawnlings, GOLIATH (Subject G-7) and NADIR itself.
var NF = window.NF || (window.NF = {});
NF.mutants = (function () {
  var M = {}, V3 = THREE.Vector3, PI = Math.PI;
  var Mo = NF.models, A = NF.anim, E = NF.enemies, AU = NF.audio, C = NF.creatures;
  var std = Mo.std, mesh = Mo.mesh, grp = Mo.grp, limb = Mo.limb, sphere = Mo.sphere, box = Mo.box;
  var H = function () { return E.h; };
  var ZAX = new V3(0, 0, 1), YAX = new V3(0, 1, 0);
  function k(dt, s) { return 1 - Math.exp(-dt * (s || 12)); }
  function fwdOf(e) { return new V3(Math.sin(e.yaw), 0, Math.cos(e.yaw)); }
  function facing(e, P) { var to = P.pos.clone().sub(e.pos); to.y = 0; to.normalize(); return fwdOf(e).dot(to); }
  function scene() { return NF.world.scene(); }
  // a quick bright line that fades out: tracer rounds, the rail beam
  M.tracer = function (from, to, color, life, width) {
    var g = new THREE.BufferGeometry().setFromPoints([from, to]);
    var l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: color || '#ffd890', transparent: true, opacity: 0.9, depthWrite: false, linewidth: width || 1 }));
    l.frustumCulled = false; scene().add(l);
    var t0 = performance.now(), L = life || 70;
    (function fade() { var k2 = (performance.now() - t0) / L; if (k2 >= 1) { scene().remove(l); g.dispose(); return; } l.material.opacity = 0.9 * (1 - k2); requestAnimationFrame(fade); })();
  };
  // re-route damage through E.damage at a different strength (armour, glancing hits) without recursion
  function redirect(e, amount, part, point, dir, weapon) { e._redir = true; E.damage(e, amount, part, point, dir, weapon); e._redir = false; }
  function sparks(point, dir) { NF.fx.sparks(point, dir.clone().negate()); AU.impact(point, false); }

  // ============================================================ HOLLOW TROOPER
  // Infected soldiers who still remember their drills: they keep their distance, paint you with a laser and fire bursts.
  E.register('trooper', {
    stats: { hp: 150, speed: 2.2, rad: 0.34, turn: 5 },
    build: function (o) {
      var r = NF.tex.rnd(o.seed || 77);
      var rig = Mo.human({ skin: ['#8a9078', '#9a9480', '#7f8a74'][(r() * 3) | 0], top: o.captain ? '#2e3426' : '#3a4030', bottom: '#2e3426', vest: o.captain ? '#22261c' : '#4a5038', gloves: '#1a1a14', bootsHigh: true, belt: '#111', zombie: true, seed: o.seed || 77, wounds: 3, h: o.captain ? 1.08 : 0.98 + r() * 0.06, teeth: true });
      var hm = rig.J.headMesh, olive = std({ color: o.captain ? '#262a1e' : '#3a4030', roughness: 0.7 });
      rig.helmet = grp(hm, 0, 0, 0);
      mesh(rig.helmet, new THREE.SphereGeometry(0.125, 16, 10, 0, PI * 2, 0, PI * 0.5), olive, 0, 0.13, -0.005, 1.02, 1, 1.08);
      mesh(rig.helmet, new THREE.CylinderGeometry(0.135, 0.14, 0.02, 16), olive, 0, 0.13, -0.005, 1, 1, 1.06);
      mesh(hm, box(0.13, 0.08, 0.06), std({ color: '#151515', roughness: 0.6 }), 0, 0.07, 0.1);
      var lens = std({ color: '#300000', emissive: '#ff2010', emissiveIntensity: 1.2 });
      mesh(hm, new THREE.CylinderGeometry(0.022, 0.022, 0.01, 10), lens, 0.035, 0.122, 0.098, 1, 1, 1, PI / 2); mesh(hm, new THREE.CylinderGeometry(0.022, 0.022, 0.01, 10), lens, -0.035, 0.122, 0.098, 1, 1, 1, PI / 2);
      mesh(hm, new THREE.CylinderGeometry(0.03, 0.035, 0.05, 10), std({ color: '#222' }), 0, 0.045, 0.13, 1, 1, 1, PI / 2);
      if (o.captain) { mesh(rig.J.shL, box(0.12, 0.03, 0.12), std({ color: '#c8a040', metalness: 0.8 }), 0, 0.04, 0); mesh(rig.J.shR, box(0.12, 0.03, 0.12), std({ color: '#c8a040', metalness: 0.8 }), 0, 0.04, 0); }
      rig.gun = Mo.weapon(o.captain ? 'smg' : 'rifle'); rig.J.chest.add(rig.gun);
      var lg = new THREE.BufferGeometry().setFromPoints([new V3(), new V3(0, 0, 1)]);
      rig.laser = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#ff1a10', transparent: true, opacity: 0.75, depthWrite: false })); rig.laser.frustumCulled = false; rig.laser.visible = false;
      return rig;
    },
    init: function (e, o) {
      e.eyeH = 1.6; e.helmet = o.captain ? 180 : 60; e.fireCd = 1 + Math.random() * 2; e.captain = !!o.captain; e.burstN = o.captain ? 7 : 3;
      if (o.captain) { e.hp = e.maxHp = 900; e.speed *= 0.9; e.boss = true; }
      scene().add(e.rig.laser); e.onRemove = function () { scene().remove(e.rig.laser); };
    },
    damage: function (e, dmg, part, point, dir, weapon) {
      if (e._redir) return;
      if (part === 'head' && e.helmet > 0 && weapon !== 'magnum' && weapon !== 'rifle' && weapon !== 'rail' && weapon !== 'explosive') {
        e.helmet -= dmg; sparks(point, dir); e.alert = true; e.flinch = Math.min(1.2, e.flinch + 0.6);
        if (e.helmet <= 0) { e.rig.helmet.visible = false; NF.fx.debris(point, 4, 0.2); }
        return false;
      }
      if (part === 'body' && weapon !== 'explosive' && weapon !== 'rail' && Math.random() < 0.5) { sparks(point, dir); redirect(e, dmg * 0.6, 'armor', point, dir, weapon); return false; }
    },
    kill: function (e) { e.rig.laser.visible = false; AU.groan(H().eye(e), 0.8, 0.8); if (e.captain) NF.game.event('captainDead', e); },
    update: function (e, t, dt, P) {
      var pose, rig = e.rig, d = e.pos.distanceTo(P.pos), gun = rig.gun;
      if (e.dead) { pose = A.base(); H().fallAnim(e, dt, pose); A.apply(rig, pose, k(dt, 10)); gun.position.set(-0.1, -0.02, 0.2); return; }
      if (!e.alert) { H().perceive(e, P, dt); if (d < 22 && P.alive && NF.world.lineClear(H().eye(e), P.chest())) e.alert = true; }
      e.fireCd -= dt;
      var see = d < 30 && NF.world.lineClear(H().eye(e), P.chest());
      var aimP = Math.atan2(P.chest().y - H().eye(e).y, Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z));
      rig.laser.visible = false;
      function muzzle() { rig.root.updateMatrixWorld(true); return gun.localToWorld(gun.userData.muzzle.clone()); }
      if (e.state === 'aim') {
        pose = A.aimLong(A.base(), aimP, 0, t); H().turnTo(e, H().angTo(e, P.pos), dt, 6);
        gun.position.set(-0.1, 0.16, 0.18); gun.rotation.set(-aimP * 0.75, 0.03, 0);
        var mz = muzzle(), tgt = P.chest(); rig.laser.visible = true; var lp = rig.laser.geometry.attributes.position; lp.setXYZ(0, mz.x, mz.y, mz.z); lp.setXYZ(1, tgt.x, tgt.y, tgt.z); lp.needsUpdate = true;
        if (e.t > (e.captain ? 0.55 : 0.75)) { e.state = 'fire'; e.t = 0; e.extra.n = 0; e.extra.next = 0; }
        if (!see && e.t > 0.3) { e.state = 'chase'; e.t = 0; }
      } else if (e.state === 'fire') {
        pose = A.aimLong(A.base(), aimP, Math.max(0, 1 - (e.t - e.extra.next + 0.12) * 8), t); H().turnTo(e, H().angTo(e, P.pos), dt, 4);
        gun.position.set(-0.1, 0.16, 0.18); gun.rotation.set(-aimP * 0.75, 0.03, 0);
        if (e.t >= e.extra.next && e.extra.n < e.burstN) {
          e.extra.n++; e.extra.next = e.t + (e.captain ? 0.09 : 0.13);
          var from = muzzle(), to = P.chest(), miss = 0.85 - d * 0.022 - (P.speed > 3.5 ? 0.28 : P.speed > 0.5 ? 0.12 : 0) - (P.inVeh ? 0.2 : 0);
          var hit = see && Math.random() < Math.max(0.12, miss);
          if (!hit) to.add(new V3((Math.random() - .5) * 1.6, (Math.random() - .3) * 1.2, (Math.random() - .5) * 1.6));
          NF.fx.muzzle(from, to.clone().sub(from).normalize(), true); M.tracer(from, to, '#ffe0a0', 60);
          AU.gun(e.captain ? 'handgun' : 'shotgun'); NF.enemies.noise(e.pos, 25);
          if (hit && P.alive) P.hurt(e.captain ? 10 : 9, e, 'shot'); else NF.fx.sparks(to, new V3(0, 1, 0));
        }
        if (e.extra.n >= e.burstN && e.t > e.extra.next + 0.2) { e.state = 'chase'; e.t = 0; e.fireCd = (e.captain ? 1.4 : 2.0) + Math.random() * 1.2; e.extra.strafe = Math.random() < 0.5 ? -1 : 1; }
      } else if (e.state === 'bash') {
        pose = A.cleave(Math.min(1, e.t / 0.7)); H().turnTo(e, H().angTo(e, P.pos), dt, 5); gun.position.set(-0.1, -0.02, 0.2); gun.rotation.set(0.6, 0.38, 0.1);
        if (!e.extra.hit && e.t > 0.4) { e.extra.hit = true; AU.knife(); if (d < 1.9 && facing(e, P) > 0.3 && P.alive) P.hurt(14, e, 'hit'); }
        if (e.t > 0.9) { e.state = 'chase'; e.t = 0; e.atkCd = 1.2; }
      } else if (e.alert && P.alive) {
        e.state = 'chase';
        var sp = 0, tgt2;
        if (d < 1.7 && e.atkCd <= 0) { e.state = 'bash'; e.t = 0; e.extra.hit = false; }
        else if (see && d < 24 && e.fireCd <= 0) { e.state = 'aim'; e.t = 0; }
        else {
          if (!see || d > 15) tgt2 = H().steerTarget(e, P) || P.pos;
          else if (d < 6) tgt2 = e.pos.clone().add(e.pos.clone().sub(P.pos).setY(0).normalize().multiplyScalar(3));
          else { var side = new V3(Math.cos(e.yaw), 0, -Math.sin(e.yaw)).multiplyScalar(e.extra.strafe || 1); tgt2 = e.pos.clone().addScaledVector(side, 3); }
          sp = H().move(e, tgt2, e.speed * (d > 15 ? 1.3 : 0.8), dt);
        }
        e.ph += dt * (sp * 2.6 + 0.3); pose = A.walk(e.ph, Math.min(1, sp / 2.2), sp > 2.5 ? 0.5 : 0); A.holdLong(pose);
        gun.position.set(-0.1, -0.02, 0.2); gun.rotation.set(0.6, 0.38, 0.1);
      } else { pose = A.idle(t, 1); A.holdLong(pose); gun.position.set(-0.1, -0.02, 0.2); gun.rotation.set(0.6, 0.38, 0.1); }
      if (e.flinch > 0) A.stagger(pose, e.flinch * 0.5, e.flinchDir);
      A.apply(rig, pose, k(dt, 12));
    }
  });

  // ============================================================ LASHER
  // Blind. Four bone whips grow from its back. Walk and it may never hear you; run and it will.
  E.register('lasher', {
    stats: { hp: 260, speed: 2.7, rad: 0.38, turn: 5 },
    build: function (o) {
      var mm = std({ map: NF.tex.muscle(), color: '#c0a0a0', roughness: 0.35, metalness: 0.05 });
      var rig = Mo.human({ skinMat: mm, topMat: mm, botMat: mm, shoes: '#5a2a28', hair: 'bald', claws: true, teeth: true, zombie: true, seed: o.seed || 515, h: 1.1 });
      rig.J.headMesh.children.forEach(function (c) { if (c.geometry && c.geometry.type === 'SphereGeometry' && c.geometry.parameters.radius < 0.02) c.visible = false; });
      mesh(rig.J.headMesh, box(0.09, 0.02, 0.02), std({ color: '#3a0a0a' }), 0, 0.122, 0.095);
      var bm = std({ color: '#e0d4b8', roughness: 0.3 }), tm = std({ map: NF.tex.flesh(), color: '#b07068', roughness: 0.35, emissive: '#180404' });
      rig.whips = [];
      [[-0.07, 0.25, 0.5], [0.07, 0.25, -0.5], [-0.09, 0.12, 1.1], [0.09, 0.12, -1.1]].forEach(function (wq) {
        var segs = [], par = grp(rig.J.chest, wq[0], wq[1], -0.12); par.rotation.set(-2.2, wq[2] * 0.6, wq[2]);
        var prev = par;
        for (var s = 0; s < 9; s++) { var sg = grp(prev, 0, s ? 0.16 : 0, 0); mesh(sg, limb(0.03 - s * 0.0025, 0.026 - s * 0.0025, 0.17), tm, 0, 0.08, 0, 1, 1, 1); segs.push(sg); prev = sg; }
        mesh(prev, new THREE.ConeGeometry(0.03, 0.22, 6), bm, 0, 0.26, 0); rig.whips.push({ base: par, segs: segs, side: wq[2] });
      });
      rig.sac = mesh(rig.J.chest, sphere(0.09, 14, 10), std({ color: '#c0d040', emissive: '#80a010', emissiveIntensity: 1.2, roughness: 0.2 }), 0, 0.18, -0.15, 1.2, 1, 0.8);
      rig.hits.push({ j: rig.J.chest, off: new V3(0, 0.18, -0.16), r: 0.1, part: 'heart' });
      rig.root.traverse(function (c) { if (c.isMesh) c.castShadow = true; });
      return rig;
    },
    init: function (e) { e.eyeH = 1.6; e.whipCd = 1; },
    kill: function (e) { AU.screech(H().eye(e)); NF.fx.splat(e.pos.clone().setY(1.2), '#c0d040'); },
    update: function (e, t, dt, P) {
      var pose, rig = e.rig, d = e.pos.distanceTo(P.pos);
      function whips(reach) {
        rig.whips.forEach(function (w, n) {
          w.segs.forEach(function (sg, i) {
            var wav = Math.sin(t * 3 + i * 0.7 + n * 1.3) * 0.22 * (1 - reach);
            sg.rotation.set(reach > 0 ? -0.15 * reach + wav : 0.28 + wav, 0, w.side * 0.04 * (1 - reach));
            sg.scale.y = 1 + reach * 0.9;
          });
          w.base.rotation.x = -2.2 + reach * 1.0; w.base.rotation.z = w.side * (1 - reach * 0.8);
        });
      }
      if (e.dead) { pose = A.base(); H().fallAnim(e, dt, pose); whips(0); A.apply(rig, pose, k(dt, 10)); return; }
      // blind: hears gunfire (noises), running and anything right next to it
      if (!e.alert) { H().perceive(e, P, dt); if (d < 3 || (d < 13 && P.speed > 4.2)) e.alert = true; }
      e.whipCd -= dt;
      if (e.state === 'whip') {
        var ph = Math.min(1, e.t / 0.75), reach = ph < 0.45 ? ph / 0.45 : 1 - (ph - 0.45) / 0.55;
        pose = A.base(); A.add(pose, 'spine', 0.4, 0, 0); A.add(pose, 'chest', 0.3, 0, 0); A.add(pose, 'head', -0.3, 0, 0); H().turnTo(e, H().angTo(e, P.pos), dt, 4);
        whips(Math.max(0, reach));
        if (!e.extra.hit && ph > 0.42) { e.extra.hit = true; AU.knife(); if (d < 4.4 && facing(e, P) > 0.55 && P.alive) { P.hurt(20, e, 'claw'); if (Math.random() < 0.3) NF.game.poison(6); } }
        if (e.t > 0.8) { e.state = 'chase'; e.t = 0; e.whipCd = 1.4 + Math.random(); }
        A.apply(rig, pose, k(dt, 14)); return;
      }
      if (e.state === 'swipe') {
        pose = A.zAttack(Math.min(1, e.t / 0.6), 0.5); whips(0.2);
        if (!e.extra.hit && e.t > 0.4) { e.extra.hit = true; AU.knife(); if (d < 1.9 && P.alive) P.hurt(16, e, 'claw'); }
        if (e.t > 0.8) { e.state = 'chase'; e.t = 0; e.atkCd = 1; }
        A.apply(rig, pose, k(dt, 14)); return;
      }
      if (e.alert && P.alive) {
        e.state = 'chase';
        var tgt = H().steerTarget(e, P) || e.lastHeard || P.pos, sp = d < 1.5 ? 0 : H().move(e, tgt, e.speed * (d > 10 ? 1.3 : 1), dt);
        if (d < 1.5) H().turnTo(e, H().angTo(e, P.pos), dt);
        e.ph += dt * (sp * 2.4 + 0.3); pose = A.walk(e.ph, Math.min(1, sp / 2.6), Math.min(1, sp / 3.5)); A.add(pose, 'spine', 0.3, 0, 0); A.add(pose, 'head', 0.2, Math.sin(t * 5) * 0.3, 0);
        pose.shL = [-0.4 + Math.sin(e.ph) * 0.4, 0, 0.4]; pose.shR = [-0.4 - Math.sin(e.ph) * 0.4, 0, -0.4];
        whips(0);
        if (d < 1.7 && e.atkCd <= 0) { e.state = 'swipe'; e.t = 0; e.extra.hit = false; }
        else if (d < 4.2 && d > 1.4 && e.whipCd <= 0 && facing(e, P) > 0.6) { e.state = 'whip'; e.t = 0; e.extra.hit = false; AU.screech(H().eye(e)); }
        if (Math.random() < dt * 0.4) AU.hiss(H().eye(e));
      } else { pose = A.idle(t, 1); A.add(pose, 'head', 0.2, Math.sin(t * 0.8) * 0.6, 0); whips(0); }
      if (e.flinch > 0) A.stagger(pose, e.flinch * 0.4, e.flinchDir);
      A.apply(rig, pose, k(dt, 12));
    }
  });

  // ============================================================ STALKER
  // Tall, thin and nearly invisible. You see its eyes, a ripple in the air, and then it is on you.
  E.register('stalker', {
    stats: { hp: 320, speed: 3.6, rad: 0.36, turn: 7 },
    build: function (o) {
      var mm = std({ map: NF.tex.muscle(), color: '#6a7a8a', roughness: 0.25, metalness: 0.3 });
      var rig = Mo.human({ skinMat: mm, topMat: mm, botMat: mm, shoes: '#2a3038', hair: 'bald', claws: true, teeth: true, zombie: true, seed: o.seed || 616, h: 1.28 });
      rig.J.shL.scale.set(1, 1.25, 1); rig.J.shR.scale.set(1, 1.25, 1); rig.J.headMesh.scale.set(0.85, 1.1, 1.3);
      [rig.J.wrL, rig.J.wrR].forEach(function (w) { for (var c = -1; c <= 1; c++) mesh(w, limb(0.012, 0.002, 0.34), std({ color: '#d8e0e8', roughness: 0.2, metalness: 0.4 }), c * 0.018, -0.16, 0.02, 1, 1, 1, -0.2); });
      var eyeM = new THREE.MeshBasicMaterial({ color: '#a0f0ff' });
      rig.eyesG = [mesh(rig.J.headMesh, sphere(0.014, 8, 6), eyeM, 0.035, 0.125, 0.105), mesh(rig.J.headMesh, sphere(0.014, 8, 6), eyeM, -0.035, 0.125, 0.105)];
      rig.cloakMats = [];
      rig.root.traverse(function (c) { if (c.isMesh && c.material !== eyeM) { c.material = c.material.clone(); c.material.transparent = true; c.material.opacity = 0.1; c.material.depthWrite = false; rig.cloakMats.push(c.material); c.castShadow = false; } });
      return rig;
    },
    init: function (e) { e.eyeH = 2.0; e.vis = 0.1; e.reveal = 0; e.circle = Math.random() < 0.5 ? 1 : -1; },
    hurt: function (e) { e.reveal = 2.5; if (e.state === 'stalk' || e.state === 'retreat') { e.state = 'chase'; e.t = 0; } },
    kill: function (e) { e.reveal = 99; AU.screech(H().eye(e)); },
    update: function (e, t, dt, P) {
      var pose, rig = e.rig, d = e.pos.distanceTo(P.pos);
      e.reveal -= dt;
      var want = e.dead || e.reveal > 0 ? 1 : e.state === 'slash' || e.state === 'lunge' ? 0.75 : 0.06 + 0.05 * Math.abs(Math.sin(t * 2.3));
      e.vis += (want - e.vis) * k(dt, 5);
      rig.cloakMats.forEach(function (m) { m.opacity = e.vis; m.depthWrite = e.vis > 0.6; });
      if (e.dead) { pose = A.base(); H().fallAnim(e, dt, pose); A.apply(rig, pose, k(dt, 10)); return; }
      if (!e.alert) { H().perceive(e, P, dt); if (d < 18 && NF.world.lineClear(H().eye(e), P.chest())) e.alert = true; }
      if (e.alert && Math.random() < dt * 0.5 && d < 25) AU.whisper(H().eye(e));
      if (e.state === 'lunge') {
        var kk = Math.min(1, e.t / 0.45); e.pos.lerpVectors(e.extra.from, e.extra.to, kk); NF.world.collide(e.pos, e.rad, 0.4); e.lift = Math.sin(kk * PI) * 0.6;
        pose = A.pounce(kk);
        if (kk >= 1) { e.state = 'slash'; e.t = 0; e.extra.hit = false; }
        A.apply(rig, pose, k(dt, 16)); return;
      }
      if (e.state === 'slash') {
        var ph = e.t / 0.6, sw = Math.sin(Math.min(1, ph) * PI); pose = A.base(); A.add(pose, 'spine', 0.4, 0, 0);
        pose.shR = [-1.4 + sw * 0.5, 0, -0.9 + sw * 1.8]; pose.shL = [-1.4 + sw * 0.5, 0, 0.9 - sw * 1.8]; H().turnTo(e, H().angTo(e, P.pos), dt, 6);
        if (!e.extra.hit && ph > 0.45) { e.extra.hit = true; AU.knife(); if (d < 2.3 && P.alive) P.hurt(28, e, 'claw'); }
        if (ph > 1.1) { e.state = 'retreat'; e.t = 0; e.atkCd = 2.5 + Math.random() * 2; }
        A.apply(rig, pose, k(dt, 16)); return;
      }
      if (e.state === 'retreat') {
        var away = e.pos.clone().add(e.pos.clone().sub(P.pos).setY(0).normalize().multiplyScalar(4));
        var sp0 = H().move(e, away, e.speed * 1.2, dt); e.ph += dt * (sp0 * 2.2 + 0.3); pose = A.walk(e.ph, 1, 1); A.add(pose, 'spine', 0.5, 0, 0);
        if (e.t > 1.4) { e.state = 'stalk'; e.t = 0; }
        A.apply(rig, pose, k(dt, 12)); return;
      }
      if (e.alert && P.alive) {
        var see = NF.world.lineClear(H().eye(e), P.chest()), tgt, sp;
        if (e.state !== 'stalk') e.state = 'chase';
        if (e.state === 'stalk' && see && d < 14) { // circle at a distance until the claws are ready
          var to = P.pos.clone().sub(e.pos).setY(0).normalize(), side = new V3(to.z, 0, -to.x).multiplyScalar(e.circle);
          tgt = e.pos.clone().addScaledVector(side, 3).addScaledVector(to, d > 8 ? 1.5 : -0.5); sp = H().move(e, tgt, e.speed * 0.8, dt);
          if (e.atkCd <= 0) e.state = 'chase';
        } else { tgt = H().steerTarget(e, P) || P.pos; sp = d < 1.8 ? 0 : H().move(e, tgt, e.speed * (d > 12 ? 1.4 : 1), dt); }
        e.ph += dt * (sp * 2.0 + 0.3); pose = A.walk(e.ph, Math.min(1, sp / 3), Math.min(1, sp / 4)); A.add(pose, 'spine', 0.35, 0, 0); A.add(pose, 'neck', -0.3, 0, 0);
        pose.shL = [-0.2 + Math.sin(e.ph) * 0.3, 0, 0.25]; pose.shR = [-0.2 - Math.sin(e.ph) * 0.3, 0, -0.25];
        if (e.atkCd <= 0 && see && d > 2.5 && d < 8) { e.state = 'lunge'; e.t = 0; e.extra.from = e.pos.clone(); e.extra.to = P.pos.clone().add(e.pos.clone().sub(P.pos).setY(0).normalize().multiplyScalar(1.2)); AU.screech(H().eye(e)); }
        else if (e.atkCd <= 0 && d <= 2.5) { e.state = 'slash'; e.t = 0; e.extra.hit = false; }
      } else pose = A.idle(t, 1);
      if (e.flinch > 0) A.stagger(pose, e.flinch * 0.4, e.flinchDir);
      A.apply(rig, pose, k(dt, 12));
    }
  });

  // ============================================================ SPAWNLING
  // NADIR's young: dog-sized, six-legged and fast.
  E.register('spawnling', {
    stats: { hp: 45, speed: 5.2, rad: 0.32, turn: 8 },
    build: function (o) {
      var root = new THREE.Group(), body = grp(root, 0, 0.35, 0), fm = std({ map: NF.tex.flesh(), color: '#b07060', roughness: 0.35, emissive: '#100202' });
      mesh(body, sphere(0.28, 14, 10), fm, 0, 0, -0.1, 0.9, 0.7, 1.3);
      var head = grp(body, 0, 0.02, 0.3); mesh(head, sphere(0.16, 12, 9), fm, 0, 0, 0, 1, 0.8, 1.1);
      var bone = std({ color: '#e0d4b8', roughness: 0.3 });
      mesh(head, new THREE.ConeGeometry(0.025, 0.16, 5), bone, 0.06, -0.04, 0.14, 1, 1, 1, PI / 2, 0, 0.4); mesh(head, new THREE.ConeGeometry(0.025, 0.16, 5), bone, -0.06, -0.04, 0.14, 1, 1, 1, PI / 2, 0, -0.4);
      var eyeM = new THREE.MeshBasicMaterial({ color: '#ffb020' }); for (var ey = 0; ey < 4; ey++) mesh(head, sphere(0.018, 6, 5), eyeM, (ey % 2 ? 1 : -1) * 0.05, 0.05 + (ey / 2 | 0) * 0.04, 0.13);
      var legs = [];
      for (var i = 0; i < 6; i++) { var side = i % 2 ? 1 : -1, z = -0.2 + (i / 2 | 0) * 0.2; var hip = grp(body, side * 0.18, 0, z); var up = grp(hip); mesh(up, limb(0.03, 0.022, 0.3), fm, 0, 0.15, 0, 1, 1, 1); up.rotation.z = side * -1.9; var kn = grp(up, 0, 0.3, 0); mesh(kn, limb(0.022, 0.008, 0.38), bone, 0, 0.19, 0); kn.rotation.z = side * 2.2; legs.push({ up: up, kn: kn, side: side, ph: i * 1.05 }); }
      root.traverse(function (c) { if (c.isMesh) c.castShadow = true; });
      return { root: root, body: body, J: { head: head, body: body }, hits: [{ j: body, off: new V3(0, 0, -0.05), r: 0.3, part: 'body' }, { j: head, off: new V3(), r: 0.17, part: 'head' }], scale: 1, kind: 'bug', legs: legs };
    },
    init: function (e) { e.eyeH = 0.4; },
    kill: function (e) { AU.splatter(e.pos); NF.fx.splat(e.pos.clone().setY(0.4), '#a05040'); },
    update: function (e, t, dt, P) {
      var rig = e.rig, d = e.pos.distanceTo(P.pos);
      if (e.dead) { rig.body.rotation.z += (PI - rig.body.rotation.z) * k(dt, 6); rig.body.position.y += (0.15 - rig.body.position.y) * k(dt, 6); rig.legs.forEach(function (l) { l.kn.rotation.z = l.side * 0.6; }); return; }
      if (!e.alert) { H().perceive(e, P, dt); if (d < 12) e.alert = true; }
      var sp = 0;
      if (e.state === 'leap') {
        var kk = Math.min(1, e.t / 0.4); e.pos.lerpVectors(e.extra.from, e.extra.to, kk); NF.world.collide(e.pos, e.rad, 0.2); e.lift = Math.sin(kk * PI) * 0.7;
        if (!e.extra.hit && kk > 0.6 && e.pos.distanceTo(P.pos) < 1.0) { e.extra.hit = true; if (P.alive) { P.hurt(9, e, 'bite'); if (Math.random() < 0.25) NF.game.poison(4); } }
        if (kk >= 1) { e.state = 'chase'; e.t = 0; e.atkCd = 0.9; }
        sp = 6;
      } else if (e.alert && P.alive) {
        e.state = 'chase';
        var tgt = H().steerTarget(e, P) || P.pos; sp = d < 1 ? 0 : H().move(e, tgt, e.speed, dt);
        if (d < 4 && d > 1.2 && e.atkCd <= 0) { e.state = 'leap'; e.t = 0; e.extra.hit = false; e.extra.from = e.pos.clone(); e.extra.to = P.pos.clone(); AU.hiss(e.pos); }
        else if (d <= 1.1 && e.atkCd <= 0) { P.hurt(7, e, 'bite'); e.atkCd = 0.8; }
      }
      e.ph += dt * (sp * 3 + 1);
      rig.legs.forEach(function (l) { var s = Math.sin(e.ph + l.ph); l.up.rotation.x = s * 0.5 * Math.min(1, sp / 3 + 0.1); l.up.rotation.z = l.side * (-1.9 + Math.max(0, Math.cos(e.ph + l.ph)) * 0.3); });
      rig.body.position.y = 0.35 + Math.abs(Math.sin(e.ph * 2)) * 0.03; rig.J.head.rotation.x = Math.sin(t * 7) * 0.1;
    }
  });

  // ============================================================ GOLIATH (Subject G-7)
  // Three and a half metres of armour and muscle. Plates turn bullets from the front; the heart on its back does not.
  // When it charges into a wall it is stunned and the armour stops mattering.
  E.register('goliath', {
    stats: { hp: 3400, speed: 1.7, rad: 0.8, turn: 2.2 },
    build: function () {
      var sk = std({ map: NF.tex.flesh(), color: '#9a8a84', roughness: 0.55 });
      var rig = Mo.human({ h: 1.95, skinMat: sk, topMat: sk, botMat: std({ map: NF.tex.cloth('#2a2a28', true, 9), roughness: 0.9 }), shoes: '#141414', bootsHigh: true, hair: 'bald', zombie: true, teeth: true, wounds: 6, seed: 4711 });
      var J = rig.J, plate = std({ map: NF.tex.metal(), color: '#5a5e62', metalness: 0.85, roughness: 0.35 }), dark = std({ color: '#1a1a1c', metalness: 0.7, roughness: 0.4 });
      rig.plates = [];
      rig.plates.push(mesh(J.chest, box(0.38, 0.26, 0.06), plate, 0, 0.17, 0.13, 1, 1, 1, -0.1));
      rig.plates.push(mesh(J.spine, box(0.3, 0.14, 0.05), plate, 0, 0.06, 0.12));
      rig.plates.push(mesh(J.shL, sphere(0.09, 12, 8), plate, 0, 0.0, 0, 1.2, 0.9, 1.2));
      rig.plates.push(mesh(J.elL, box(0.1, 0.2, 0.1), plate, 0, -0.12, 0.01));
      rig.plates.push(mesh(J.knL, box(0.1, 0.24, 0.06), plate, 0, -0.14, 0.05)); rig.plates.push(mesh(J.knR, box(0.1, 0.24, 0.06), plate, 0, -0.14, 0.05));
      mesh(J.headMesh, box(0.2, 0.11, 0.06), plate, 0, 0.13, 0.09); mesh(J.headMesh, box(0.14, 0.012, 0.01), new THREE.MeshBasicMaterial({ color: '#ff3010' }), 0, 0.125, 0.122);
      for (var b = 0; b < 4; b++) mesh(J.chest, box(0.4, 0.025, 0.02), dark, 0, 0.05 + b * 0.07, 0.165);
      // the arm
      var fm = std({ map: NF.tex.flesh(), roughness: 0.4, emissive: '#100000' });
      J.shR.scale.set(1.9, 1.5, 1.9); [J.shR, J.elR, J.wrR].forEach(function (j) { j.children.forEach(function (c) { if (c.isMesh) c.material = fm; }); });
      var bone = std({ color: '#e8dcc0', roughness: 0.35 });
      for (var s = 0; s < 5; s++) mesh(J.elR, new THREE.ConeGeometry(0.02, 0.14, 6), bone, 0.04, -0.05 - s * 0.04, -0.03, 1, 1, 1, -1.4);
      for (var c2 = -1; c2 <= 1; c2++) mesh(J.wrR, limb(0.016, 0.003, 0.2), bone, c2 * 0.022, -0.12, 0.02, 1, 1, 1, -0.3);
      rig.heart = mesh(J.chest, sphere(0.075, 14, 12), std({ color: '#ff5020', emissive: '#ff3000', emissiveIntensity: 1.6, roughness: 0.2 }), 0, 0.15, -0.14);
      for (var t2 = 0; t2 < 6; t2++) mesh(J.chest, limb(0.012, 0.012, 0.16), fm, -0.08 + t2 * 0.032, 0.15, -0.13, 1, 1, 1, 0.4 * (t2 % 2 ? 1 : -1), 0, PI / 2);
      rig.hits.push({ j: J.chest, off: new V3(0, 0.15, -0.15), r: 0.09, part: 'heart' });
      rig.hits.push({ j: J.elR, off: new V3(0, -0.12, 0), r: 0.09, part: 'arm' });
      rig.root.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      return rig;
    },
    init: function (e) { e.eyeH = 3.2; e.state = 'sleep'; e.boss = true; e.throwCd = 6; e.chargeCd = 5; e.phase = 1; },
    damage: function (e, dmg, part, point, dir, weapon) {
      if (e._redir) return;
      if (e.state === 'sleep') { e.state = 'roar'; e.t = 0; NF.game.event('goliathWake', e); }
      var front = fwdOf(e).dot(dir) < -0.15;
      if (part === 'heart' || weapon === 'explosive' || weapon === 'rail' || e.state === 'stunned' || !front) return;
      // armour from the front
      sparks(point, dir); redirect(e, dmg * (part === 'head' ? 0.5 : 0.22), 'armor', point, dir, weapon); return false;
    },
    hurt: function (e) {
      if (e.phase === 1 && e.hp < e.maxHp * 0.5) { e.phase = 2; e.speed *= 1.35; e.rig.plates.slice(0, 3).forEach(function (p) { p.visible = false; }); NF.fx.debris(H().eye(e), 10, 0.5); AU.roar(H().eye(e)); NF.game.toastMsg('GOLIATH sheds its armour'); }
    },
    kill: function (e) { AU.roar(H().eye(e)); NF.game.shake(1); NF.game.event('goliathDead', e); },
    update: function (e, t, dt, P) {
      var pose, rig = e.rig, d = e.pos.distanceTo(P.pos);
      rig.heart.scale.setScalar(1 + 0.15 * Math.sin(t * 6));
      if (e.dead) { pose = A.base(); H().fallAnim(e, dt, pose, 0.3); A.apply(rig, pose, k(dt, 6)); return; }
      e.throwCd -= dt; e.chargeCd -= dt;
      if (e.state === 'sleep') { pose = A.idle(t, 0); A.add(pose, 'spine', 0.4, 0, 0); A.add(pose, 'head', 0.6, 0, 0); pose.shR = [0.1, 0, -0.2]; pose.shL = [0.1, 0, 0.2]; A.apply(rig, pose, k(dt, 4)); return; }
      if (e.state === 'roar') {
        pose = A.boss('roar', 0, t); H().turnTo(e, H().angTo(e, P.pos), dt, 2);
        if (e.t < 0.1) { AU.roar(H().eye(e)); NF.game.shake(0.8); }
        if (e.t > 1.8) { e.state = 'chase'; e.t = 0; e.alert = true; }
        A.apply(rig, pose, k(dt, 8)); return;
      }
      if (e.state === 'stunned') {
        pose = A.base(); A.dying(pose, 0.6); A.add(pose, 'head', 0.5, Math.sin(t * 3) * 0.3, 0);
        if (e.t > 2.8) { e.state = 'roar'; e.t = 0.6; }
        A.apply(rig, pose, k(dt, 8)); return;
      }
      if (e.state === 'windup') {
        pose = A.boss('roar', 0, t); H().turnTo(e, H().angTo(e, P.pos), dt, 4);
        if (e.t > 0.8) { e.state = 'charge'; e.t = 0; e.extra.dir = P.pos.clone().sub(e.pos).setY(0).normalize(); e.extra.hit = false; }
        A.apply(rig, pose, k(dt, 10)); return;
      }
      if (e.state === 'charge') {
        var before = e.pos.clone(), v = e.extra.dir.clone().multiplyScalar(8.5 * dt);
        e.pos.add(v); NF.world.collide(e.pos, e.rad, 0.4);
        var moved = e.pos.distanceTo(before);
        e.ph += dt * 9; pose = A.walk(e.ph, 1, 1); A.add(pose, 'spine', 0.5, 0, 0); pose.shR = [-1.2, 0, -0.4];
        if (Math.random() < 0.4) NF.game.shake(0.15);
        if (!e.extra.hit && d < 2.2 && P.alive) { e.extra.hit = true; P.hurt(46, e, 'slam'); }
        if (moved < v.length() * 0.35 && e.t > 0.2) { e.state = 'stunned'; e.t = 0; AU.thud(e.pos, 1); NF.fx.debris(H().eye(e), 14, 0.6); NF.game.shake(1.2); NF.game.toastMsg('It\'s stunned — hit it now'); }
        else if (e.t > 2.4 || (e.extra.hit && e.t > 0.6)) { e.state = 'chase'; e.t = 0; e.chargeCd = 6 + Math.random() * 3; }
        A.apply(rig, pose, k(dt, 12)); return;
      }
      if (e.state === 'swing') {
        pose = A.cleave(Math.min(1, e.t / 1.1)); H().turnTo(e, H().angTo(e, P.pos), dt, 2.5);
        if (!e.extra.hit && e.t > 0.6) { e.extra.hit = true; AU.knife(); NF.game.shake(0.5); if (d < 3.6 && facing(e, P) > 0.2 && P.alive) P.hurt(36, e, 'slam'); }
        if (e.t > 1.4) { e.state = 'chase'; e.t = 0; e.atkCd = 1.4; }
        A.apply(rig, pose, k(dt, 10)); return;
      }
      if (e.state === 'slam') {
        var ph = Math.min(1, e.t / 1.3); pose = A.base(); var up = ph < 0.55 ? ph / 0.55 : 1 - (ph - 0.55) / 0.2;
        pose.shL = [-2.6 * Math.max(0, up), 0, 0.2]; pose.shR = [-2.6 * Math.max(0, up), 0, -0.2]; A.add(pose, 'spine', ph > 0.55 ? 0.6 : -0.2, 0, 0); A.add(pose, 'knL', ph > 0.55 ? 0.6 : 0, 0, 0); A.add(pose, 'knR', ph > 0.55 ? 0.6 : 0, 0, 0);
        if (!e.extra.hit && ph > 0.62) {
          e.extra.hit = true; var at = e.pos.clone().addScaledVector(fwdOf(e), 2); NF.fx.shock(at); AU.boom(at, 3); NF.game.shake(1.3); NF.fx.debris(at.clone().setY(0.3), 16, 0.8);
          var pd = Math.hypot(P.pos.x - at.x, P.pos.z - at.z); if (pd < 7 && P.alive && P.pos.y - e.pos.y < 0.6) P.hurt((14 + 26 * (1 - pd / 7)), e, 'slam');
        }
        if (e.t > 1.6) { e.state = 'chase'; e.t = 0; e.atkCd = 1.6; }
        A.apply(rig, pose, k(dt, 12)); return;
      }
      if (e.state === 'throw') {
        pose = A.cleave(Math.min(0.55, e.t / 1.4)); H().turnTo(e, H().angTo(e, P.pos), dt, 4);
        if (!e.extra.hit && e.t > 0.75) {
          e.extra.hit = true; var from = H().eye(e).add(new V3(0, 0.2, 0)), to = P.chest(), fl = to.clone().sub(from), dist = fl.length(), vel = fl.divideScalar(dist).multiplyScalar(19); vel.y += dist * 0.25;
          var rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), std({ map: NF.tex.stone(), color: '#8a8a84', roughness: 0.9 }));
          C.shoot({ pos: from, vel: vel, g: 9.8, dmg: 30, hostile: true, mesh: rock, spin: 6, owner: e, kind: 'slam' }); AU.thud(from, 0.6);
        }
        if (e.t > 1.3) { e.state = 'chase'; e.t = 0; e.throwCd = 7 + Math.random() * 3; }
        A.apply(rig, pose, k(dt, 10)); return;
      }
      if (P.alive) {
        e.state = 'chase';
        var see = NF.world.lineClear(H().eye(e), P.chest());
        var tgt = H().steerTarget(e, P) || P.pos, sp = d < 2.6 ? 0 : H().move(e, tgt, e.speed, dt);
        if (d < 2.6) H().turnTo(e, H().angTo(e, P.pos), dt);
        e.ph += dt * (sp * 1.6 + 0.3); pose = A.heavyWalk(e.ph, Math.min(1, sp / 1.6), t); pose.shR = [-0.4 + Math.sin(e.ph) * 0.3, 0, -0.5];
        e.stepT -= dt; if (e.stepT < 0 && sp > 0.2) { AU.thud(e.pos, 0.5); NF.game.shake(Math.max(0, 0.35 - d * 0.015)); e.stepT = 0.55; }
        if (d < 3.2 && e.atkCd <= 0) { e.state = Math.random() < 0.55 ? 'swing' : 'slam'; e.t = 0; e.extra.hit = false; }
        else if (see && d > 9 && d < 28 && e.chargeCd <= 0) { e.state = 'windup'; e.t = 0; AU.roar(H().eye(e)); }
        else if (see && d > 8 && e.throwCd <= 0) { e.state = 'throw'; e.t = 0; e.extra.hit = false; }
      } else pose = A.idle(t, 1);
      if (e.flinch > 0) A.stagger(pose, e.flinch * 0.15, e.flinchDir);
      A.apply(rig, pose, k(dt, 10));
    }
  });

  // ============================================================ NADIR
  // What the program was for. Rooted in the Core, twelve metres of flesh, three eyes, six arms, and a heart in a cage of ribs.
  E.register('nadir', {
    stats: { hp: 7000, speed: 0, rad: 4.5, turn: 0.6 },
    build: function () {
      var root = new THREE.Group(), body = grp(root), fm = std({ map: NF.tex.flesh(), color: '#b07068', roughness: 0.4, emissive: '#3a0a08', emissiveIntensity: 0.6 }), dm = std({ map: NF.tex.flesh(), color: '#6a3a38', roughness: 0.5 });
      var r = NF.tex.rnd(4242), hits = [];
      mesh(body, sphere(1, 28, 22), fm, 0, 4.2, -0.5, 4.6, 4.2, 4.0);
      for (var i = 0; i < 22; i++) { var a = r() * PI * 2, h = r() * 7; mesh(body, sphere(0.8 + r() * 1.6, 14, 10), r() < 0.5 ? fm : dm, Math.cos(a) * (3.4 + r()), h, Math.sin(a) * (3.2 + r()) - 0.5); }
      for (var v = 0; v < 18; v++) mesh(body, limb(0.12, 0.08, 4 + r() * 3), std({ color: '#5a1018', emissive: '#300008', roughness: 0.3 }), (r() - .5) * 8, r() * 3, 2.6 + r() * 1.2, 1, 1, 1, (r() - .5) * 2, 0, (r() - .5) * 2);
      // the caged heart
      var core = grp(body, 0, 3.6, 3.0), heartM = std({ color: '#ff4030', emissive: '#ff2010', emissiveIntensity: 1.8, roughness: 0.2 });
      var heart = mesh(core, sphere(1.1, 20, 16), heartM, 0, 0, 0);
      var ribs = [], bone = std({ color: '#e8dcc0', roughness: 0.35 });
      for (var rb = 0; rb < 8; rb++) { var side = rb % 2 ? 1 : -1, row = rb / 2 | 0; var piv = grp(core, side * 0.4, -1.2 + row * 0.8, -0.6); var rib = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.11, 6, 14, PI * 0.8), bone); rib.rotation.set(0, side > 0 ? -PI * 0.1 : PI * 1.1, 0); piv.add(rib); ribs.push({ piv: piv, side: side }); }
      // eyes
      var eyeM = std({ color: '#e8d070', emissive: '#a05000', emissiveIntensity: 1.2, roughness: 0.15 }), pup = std({ color: '#050000' }), lid = std({ map: NF.tex.flesh(), color: '#8a5048' });
      var eyes = [];
      [[-2.4, 6.6, 2.4], [2.5, 6.3, 2.5], [0, 8.4, 1.6]].forEach(function (p) { var eg = grp(body, p[0], p[1], p[2]); mesh(eg, sphere(0.75, 18, 14), eyeM); mesh(eg, sphere(0.28, 10, 8), pup, 0, 0, 0.6, 0.5, 1.3, 0.5); mesh(eg, new THREE.TorusGeometry(0.75, 0.22, 8, 18), lid, 0, 0, 0.2); eyes.push({ g: eg, hp: 900, alive: true }); hits.push({ j: eg, off: new V3(), r: 0.8, part: 'eye', obj: eg }); });
      hits.push({ j: core, off: new V3(), r: 1.15, part: 'heart' });
      hits.push({ j: body, off: new V3(0, 4.2, 1.5), r: 3.6, part: 'body' });
      hits.push({ j: body, off: new V3(0, 7.5, 0.5), r: 2.6, part: 'body' });
      // tentacles: segments are placed along a curve every frame
      var tents = [];
      for (var t = 0; t < 6; t++) {
        var ang = -1.25 + t * 0.5, anc = new V3(Math.sin(ang) * 3.6, 1.2 + (t % 2) * 1.6, Math.cos(ang) * 3.0), segs = [];
        for (var s = 0; s < 16; s++) { var rr = 0.55 - s * 0.03; var sg = mesh(root, sphere(rr, 10, 8), fm, 0, 0, 0, 1, 1, 1.5); segs.push(sg); if (s % 3 === 2) hits.push({ j: sg, off: new V3(), r: rr * 1.1, part: 'tentacle' }); }
        var tip = mesh(root, new THREE.ConeGeometry(0.12, 0.8, 6), bone, 0, 0, 0); tents.push({ anc: anc, segs: segs, tip: tip, ang: ang, mode: 'idle', t: 0, targetW: new V3(), seed: t * 1.7 });
      }
      root.traverse(function (o) { if (o.isMesh) o.castShadow = false; });
      return { root: root, body: body, J: { core: core }, hits: hits, scale: 1, kind: 'nadir', eyes: eyes, ribs: ribs, heart: heart, tents: tents };
    },
    init: function (e) {
      e.flying = true; e.eyeH = 6; e.state = 'sleep'; e.boss = true; e.phase = 1; e.slamCd = 3; e.spitCd = 6; e.broodCd = 12; e.gasCd = 8; e.markers = [];
      var p = e.pos; e.box = NF.world.collider(p.x - 4.2, p.x + 4.2, p.z - 4.5, p.z + 3.6, 0, 12, 'boss'); e.onRemove = function () { NF.world.removeCollider(e.box); };
    },
    damage: function (e, dmg, part, point, dir, weapon) {
      if (e._redir) return;
      if (e.state === 'sleep') { NF.game.event('nadirWake', e); }
      if (part === 'eye') {
        var hitEye = null; e.rig.eyes.forEach(function (ey) { if (ey.alive && point.distanceTo(ey.g.getWorldPosition(new V3())) < 1.0) hitEye = ey; });
        if (hitEye) { hitEye.hp -= dmg; NF.fx.blood(point, dir.clone().negate(), 14); if (hitEye.hp <= 0) { hitEye.alive = false; hitEye.g.scale.setScalar(0.01); NF.fx.blood(point, new V3(0, 1, 0), 40); AU.roar(point); NF.game.shake(0.8); e.state = 'hurt'; e.t = 0; } redirect(e, dmg, 'eye', point, dir, weapon); return false; }
      }
      if (part === 'heart') { if (e.phase < 2) { sparks(point, dir); NF.game.toastMsg('The ribs protect the heart — destroy the eyes'); return false; } redirect(e, dmg * 2.4, 'core', point, dir, weapon); return false; }
      redirect(e, dmg * (weapon === 'explosive' ? 0.45 : 0.1), 'mass', point, dir, weapon); return false;
    },
    hurt: function (e) {
      if (e.phase === 1 && (e.rig.eyes.every(function (y) { return !y.alive; }) || e.hp < e.maxHp * 0.45)) { e.phase = 2; e.state = 'hurt'; e.t = 0; NF.game.event('nadirPhase2', e); }
    },
    kill: function (e) { e.box.on = false; e.markers.forEach(function (m) { scene().remove(m); }); e.markers = []; NF.game.shake(1.5); AU.roar(e.pos.clone().setY(5)); NF.game.event('nadirDead', e); },
    update: function (e, t, dt, P) {
      var rig = e.rig, base = e.pos, fw = new V3(Math.sin(e.yaw), 0, Math.cos(e.yaw));
      var pulse = 1 + 0.04 * Math.sin(t * (e.phase > 1 ? 4 : 1.6)); rig.body.scale.set(pulse, 1 / pulse, pulse);
      rig.heart.scale.setScalar(1 + 0.12 * Math.sin(t * (e.phase > 1 ? 7 : 3)));
      rig.ribs.forEach(function (rb) { var open = e.phase > 1 ? 1 : 0; rb.piv.rotation.y += ((rb.side * open * 1.1) - rb.piv.rotation.y) * k(dt, 2); });
      rig.eyes.forEach(function (ey) { if (ey.alive) ey.g.lookAt(P.chest()); });
      // tentacles live in the root's local space; targets are converted from world space
      rig.root.updateMatrixWorld(true);
      function place(tn, A0, B0, lift) {
        var n = tn.segs.length, ctrl = A0.clone().lerp(B0, 0.5), prev = null, p = new V3(), dir = new V3(); ctrl.y += lift;
        for (var i = 0; i <= n; i++) {
          var u = i / n; p.copy(A0).lerp(ctrl, u).lerp(ctrl.clone().lerp(B0, u), u);
          if (i < n) tn.segs[i].position.copy(p);
          if (prev) { dir.subVectors(p, prev); if (dir.lengthSq() > 1e-6) { dir.normalize(); tn.segs[i - 1].quaternion.setFromUnitVectors(ZAX, dir); if (i === n) { tn.tip.position.copy(p); tn.tip.quaternion.setFromUnitVectors(YAX, dir); } } }
          prev = (prev || new V3()).copy(p);
        }
      }
      var awake = e.state !== 'sleep' && !e.dead;
      rig.tents.forEach(function (tn, n) {
        var anc = tn.anc; tn.t += dt;
        if (e.dead) { place(tn, anc, anc.clone().add(new V3(Math.sin(tn.ang) * 6, -1, Math.cos(tn.ang) * 6 + 1)), 1); return; }
        if (tn.mode === 'raise' || tn.mode === 'strike' || tn.mode === 'rest') {
          var tl = rig.root.worldToLocal(tn.targetW.clone()), hi = tl.clone().lerp(anc, 0.35); hi.y = 9;
          if (tn.mode === 'raise') { var k1 = Math.min(1, tn.t / (e.phase > 1 ? 0.75 : 1.0)); place(tn, anc, anc.clone().lerp(hi, k1), 3); if (k1 >= 1) { tn.mode = 'strike'; tn.t = 0; } return; }
          if (tn.mode === 'strike') {
            var k2 = Math.min(1, tn.t / 0.22); place(tn, anc, hi.clone().lerp(tl, k2), 3 * (1 - k2) + 0.5);
            if (k2 >= 1) {
              tn.mode = 'rest'; tn.t = 0; var tw = tn.targetW; NF.fx.shock(tw); AU.thud(tw, 1); NF.fx.debris(tw.clone().setY(0.3), 10, 0.5); NF.game.shake(Math.max(0.2, 1 - P.pos.distanceTo(tw) * 0.05));
              if (tn.marker) { scene().remove(tn.marker); e.markers.splice(e.markers.indexOf(tn.marker), 1); tn.marker = null; }
              if (P.alive && Math.hypot(P.pos.x - tw.x, P.pos.z - tw.z) < 2.4) P.hurt(40, e, 'slam');
            }
            return;
          }
          place(tn, anc, tl, 0.5); if (tn.t > (e.phase > 1 ? 0.6 : 1.1)) { tn.mode = 'idle'; tn.t = 0; } return;
        }
        var out = anc.clone().add(new V3(Math.sin(tn.ang) * 5 + Math.sin(t * 0.7 + tn.seed) * 2, 7 + Math.sin(t * 0.9 + tn.seed) * 1.5, Math.cos(tn.ang) * 5 + Math.cos(t * 0.6 + tn.seed) * 2));
        if (!awake) out.y = 1.5 + Math.sin(t * 0.5 + tn.seed) * 0.3;
        place(tn, anc, out, awake ? 2 : 0.5);
      });
      if (e.dead) { rig.body.position.y += (-2.5 - rig.body.position.y) * k(dt, 0.6); return; }
      if (e.state === 'sleep') return;
      if (e.state === 'hurt') { rig.body.rotation.x = Math.sin(e.t * 18) * 0.04 * Math.max(0, 1 - e.t); if (e.t > 1.2) { e.state = 'fight'; e.t = 0; rig.body.rotation.x = 0; } return; }
      e.state = 'fight';
      H().turnTo(e, H().angTo(e, P.pos), dt, 0.4);
      e.slamCd -= dt; e.spitCd -= dt; e.broodCd -= dt; e.gasCd -= dt;
      var d = Math.hypot(P.pos.x - base.x, P.pos.z - base.z);
      if (e.slamCd <= 0 && P.alive) {
        var idle = rig.tents.filter(function (tn) { return tn.mode === 'idle'; });
        var nSlam = e.phase > 1 ? 2 : 1;
        for (var s = 0; s < nSlam && idle.length; s++) {
          var tn = idle.splice((Math.random() * idle.length) | 0, 1)[0]; tn.mode = 'raise'; tn.t = 0;
          var lead = P.vel ? P.vel.clone().multiplyScalar(0.5) : new V3(); tn.targetW.set(P.pos.x + lead.x + (s ? (Math.random() - .5) * 6 : 0), 0.05, P.pos.z + lead.z + (s ? (Math.random() - .5) * 6 : 0));
          var mk = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.4, 28), new THREE.MeshBasicMaterial({ color: '#ff2010', transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide })); mk.rotation.x = -PI / 2; mk.position.copy(tn.targetW).setY(0.06); scene().add(mk); tn.marker = mk; e.markers.push(mk);
        }
        e.slamCd = (e.phase > 1 ? 1.8 : 2.8) + Math.random();
        AU.roar(base.clone().setY(6));
      }
      e.markers.forEach(function (mk) { mk.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(t * 10)); });
      if (e.spitCd <= 0 && P.alive) {
        for (var sp = 0; sp < (e.phase > 1 ? 7 : 4); sp++) {
          var from = base.clone().add(new V3(0, 7, 0)).addScaledVector(fw, 3), to = P.chest().add(new V3((Math.random() - .5) * 5, 0, (Math.random() - .5) * 5)), vv = to.clone().sub(from), dist = vv.length();
          vv.divideScalar(dist).multiplyScalar(17); vv.y += dist * 0.28;
          C.shoot({ pos: from, vel: vv, g: 9.8, dmg: 12, poison: 6, hostile: true, mesh: new THREE.Mesh(sphere(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: '#a0d020' })), owner: e, trail: '#8ab020' });
        }
        AU.hiss(base.clone().setY(6)); e.spitCd = (e.phase > 1 ? 5 : 8) + Math.random() * 2;
      }
      if (e.broodCd <= 0) {
        var alive = E.list.filter(function (x) { return x.type === 'spawnling' && !x.dead; }).length;
        if (alive < 8) for (var b = 0; b < 3; b++) { var a = e.yaw + (Math.random() - .5) * 2.5, sx = base.x + Math.sin(a) * 6, sz = base.z + Math.cos(a) * 6; var sl = E.spawn('spawnling', 'nxbrood' + (M.broodN = (M.broodN || 0) + 1), sx, sz, { alert: true }); sl.alert = true; sl.far = true; sl.bunker = NF.bunker.level; sl.noDrop = Math.random() < 0.7; NF.fx.splat(new V3(sx, 0.4, sz), '#a05040'); }
        e.broodCd = (e.phase > 1 ? 14 : 20) + Math.random() * 4; AU.screech(base.clone().setY(3));
      }
      if (e.phase > 1 && e.gasCd <= 0) { var ga = Math.random() * PI * 2, gr = 6 + Math.random() * 14; C.gas(new V3(base.x + Math.sin(ga) * gr, 0.2, base.z + Math.cos(ga) * gr), 3.2, 8); e.gasCd = 7 + Math.random() * 4; }
      if (d < 6 && P.alive && e.atkCd <= 0) { P.hurt(18, e, 'slam'); e.atkCd = 1.5; }
    }
  });
  return M;
})();
