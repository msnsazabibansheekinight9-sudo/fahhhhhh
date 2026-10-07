// The new infected of Ashgrove County, plus hostile projectiles and explosions.
var NF = window.NF || (window.NF = {});
NF.creatures = (function () {
  var C = {}, V3 = THREE.Vector3, PI = Math.PI;
  var Mo = NF.models, A = NF.anim, E = NF.enemies, AU = NF.audio;
  var std = Mo.std, mesh = Mo.mesh, grp = Mo.grp, limb = Mo.limb, sphere = Mo.sphere, box = Mo.box;
  var H = function () { return E.h; };
  function k(dt, s) { return 1 - Math.exp(-dt * (s || 12)); }
  function fwdOf(e) { return new V3(Math.sin(e.yaw), 0, Math.cos(e.yaw)); }
  function facing(e, P) { var to = P.pos.clone().sub(e.pos); to.y = 0; to.normalize(); return fwdOf(e).dot(to); }
  function tint(rig, col) { rig.root.traverse(function (o) { if (o.isMesh && o.material && o.material.map && o.material === rig.skinMat) { } }); if (rig.skinMat) rig.skinMat.color.set(col).convertSRGBToLinear(); }
  var scales;
  function scaleTex() {
    if (scales) return scales;
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'); var r = NF.tex.rnd(5);
    g.fillStyle = '#3a4a2a'; g.fillRect(0, 0, 128, 128);
    for (var y = 0; y < 128; y += 8) for (var x = (y / 8 % 2) * 4; x < 128; x += 8) { var b = 40 + r() * 40; g.fillStyle = 'rgb(' + (b | 0) + ',' + (b + 20 | 0) + ',' + (b - 10 | 0) + ')'; g.beginPath(); g.ellipse(x + 4, y + 4, 4, 3.5, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.stroke(); }
    scales = new THREE.CanvasTexture(c); scales.wrapS = scales.wrapT = THREE.RepeatWrapping; scales.encoding = THREE.sRGBEncoding; return scales;
  }
  // ------------------------------------------------------------ projectiles
  var proj = [], scene;
  C.init = function (sc) { scene = sc; };
  C.shoot = function (o) { // {pos, vel, g, dmg, poison, hostile, explode:{r,dmg}, mesh, life, spin}
    var m = o.mesh; m.position.copy(o.pos); scene.add(m); o.life = o.life || 6; proj.push(o); return o;
  };
  C.explode = function (pos, r, dmg, fromPlayer) {
    NF.fx.explosion(pos, r); AU.boom(pos, r); NF.game.shake(Math.max(0.2, 1.6 - NF.game.player.pos.distanceTo(pos) * 0.08));
    E.list.slice().forEach(function (e) {
      if (e.dead || e.state === 'dormant') return;
      var c = e.pos.clone(); c.y += 0.9; var d = c.distanceTo(pos); if (d > r) return;
      var f = 1 - d / r; var dir = c.clone().sub(pos).normalize();
      E.damage(e, dmg * (0.35 + 0.65 * f), 'body', c, dir, 'explosive');
      if (e.type === 'zombie' && !e.dead) { e.state = 'down'; e.t = 0; e.fallDir = 1; }
    });
    var P = NF.game.player, pd = P.chest().distanceTo(pos);
    if (pd < r) P.hurt(dmg * (fromPlayer ? 0.5 : 1) * (1 - pd / r) + 5, { pos: pos.clone() }, 'blast');
    NF.enemies.noise(pos, 60);
  };
  C.gas = function (pos, r, dur) { // poison cloud
    var g = { pos: pos.clone(), r: r, t: dur, sprites: [] };
    var mat = new THREE.SpriteMaterial({ map: NF.tex.smoke(), color: '#9ab040', transparent: true, opacity: 0.45, depthWrite: false });
    for (var i = 0; i < 18; i++) { var s = new THREE.Sprite(mat); s.position.copy(pos).add(new V3((Math.random() - .5) * r * 1.4, Math.random() * 1.8, (Math.random() - .5) * r * 1.4)); s.scale.setScalar(1.5 + Math.random() * 2); scene.add(s); g.sprites.push(s); }
    gases.push(g); AU.hiss(pos);
  };
  var gases = [];
  C.update = function (dt) {
    var P = NF.game.player;
    for (var i = proj.length - 1; i >= 0; i--) {
      var p = proj[i]; p.life -= dt;
      p.vel.y -= (p.g === undefined ? 9.8 : p.g) * dt;
      var step = p.vel.clone().multiplyScalar(dt), len = step.length(), dir = step.clone().divideScalar(len || 1);
      var wd = NF.world.ray(p.pos, dir, len + 0.05);
      var hitE = !p.hostile ? E.raycast(p.pos, dir, Math.min(wd, len + 0.3)) : null;
      var hitP = p.hostile && P.alive && p.pos.clone().addScaledVector(dir, len * 0.5).distanceTo(P.chest()) < 0.6;
      if (p.spin) p.mesh.rotation.x += dt * p.spin;
      p.pos.add(step); p.mesh.position.copy(p.pos);
      if (p.trail && Math.random() < 0.7) NF.fx.puff(p.pos, p.trail);
      if (hitE || hitP || wd < len + 0.05 || p.life <= 0) {
        if (p.explode) C.explode(p.pos.clone().addScaledVector(dir, -0.2), p.explode.r, p.explode.dmg, !p.hostile);
        else if (hitP) { P.hurt(p.dmg, p.owner, p.kind || 'spit'); if (p.poison) NF.game.poison(p.poison); }
        else if (hitE) E.damage(hitE.e, p.dmg, hitE.part, hitE.point, dir, p.weapon || 'thrown');
        else if (p.poison) NF.fx.splat(p.pos, '#7a9a20');
        scene.remove(p.mesh); proj.splice(i, 1);
      }
    }
    for (var j = gases.length - 1; j >= 0; j--) {
      var g = gases[j]; g.t -= dt;
      g.sprites.forEach(function (s, n) { s.position.y += dt * 0.2; s.material.opacity = Math.min(0.45, g.t * 0.2); s.material.rotation += dt * 0.2 * (n % 2 ? 1 : -1); });
      if (P.alive && P.pos.distanceTo(g.pos) < g.r) { NF.game.poison(6); P.hp -= dt * 4; if (P.hp <= 0) P.hurt(5, null, 'gas'); }
      if (g.t <= 0) { g.sprites.forEach(function (s) { scene.remove(s); }); gases.splice(j, 1); }
    }
  };
  // ------------------------------------------------------------ weapons for villagers
  function villagerWeapon(rig, kind) {
    var w = grp(rig.J.wrR, 0, -0.07, 0.0); w.rotation.x = PI / 2;
    var wood = std({ color: '#5a3a22', roughness: 0.8 }), iron = std({ color: '#5a5654', metalness: 0.85, roughness: 0.45, map: NF.tex.metal() });
    if (kind === 'axe') { mesh(w, box(0.035, 0.035, 0.7), wood, 0, 0, 0.2); mesh(w, box(0.02, 0.18, 0.14), iron, 0, 0.07, 0.5); }
    else if (kind === 'pitchfork') { mesh(w, box(0.03, 0.03, 1.6), wood, 0, 0, 0.4); for (var i = -1; i <= 1; i++) mesh(w, box(0.012, 0.012, 0.3), iron, i * 0.05, 0, 1.3); mesh(w, box(0.14, 0.015, 0.015), iron, 0, 0, 1.16); }
    else if (kind === 'sickle') { mesh(w, box(0.03, 0.03, 0.3), wood, 0, 0, 0.05); var bl = mesh(w, new THREE.TorusGeometry(0.16, 0.012, 4, 12, PI * 1.2), iron, 0, 0.12, 0.24); bl.rotation.y = PI / 2; }
    else if (kind === 'torch') { mesh(w, box(0.035, 0.035, 0.6), wood, 0, 0, 0.15); var fl = mesh(w, new THREE.ConeGeometry(0.06, 0.22, 6), new THREE.MeshBasicMaterial({ color: '#ffa030' }), 0, 0, 0.55, 1, 1, 1, PI / 2); rig.flame = fl; }
    else if (kind === 'chainsaw') { mesh(w, box(0.16, 0.18, 0.32), std({ color: '#a83a1a', roughness: 0.5 }), 0, 0.02, 0.08); mesh(w, box(0.03, 0.09, 0.62), iron, 0, 0.02, 0.5); rig.saw = w; }
    w.traverse(function (c) { if (c.isMesh) c.castShadow = true; });
    return w;
  }
  function hood(rig, col) {
    var cm = std({ map: NF.tex.cloth(col, true, 7), roughness: 1, side: THREE.DoubleSide });
    mesh(rig.J.headMesh, new THREE.SphereGeometry(0.135, 16, 12, 0, PI * 2, 0, PI * 0.62), cm, 0, 0.12, -0.02, 0.95, 1.12, 1.05, -0.35);
    var eye = std({ color: '#ff3010', emissive: '#ff2000', emissiveIntensity: 1.5 });
    mesh(rig.J.headMesh, sphere(0.01, 6, 5), eye, 0.034, 0.123, 0.094); mesh(rig.J.headMesh, sphere(0.01, 6, 5), eye, -0.034, 0.123, 0.094);
  }
  // ============================================================ HOLLOW (villagers)
  E.register('hollow', {
    stats: { hp: 80, speed: 2.1, rad: 0.33, turn: 4.5 },
    build: function (o) {
      var r = NF.tex.rnd(o.seed || 9), cols = ['#4a3e30', '#3a3a2a', '#5a4a3a', '#2a2a28'];
      var rig = Mo.human({ skin: ['#a8988a', '#9a8a7a', '#b0a090'][(r() * 3) | 0], top: cols[(r() * 4) | 0], bottom: '#2e2820', coat: cols[(r() * 4) | 0], coatLen: 0.45, hair: r() < 0.5 ? 'short' : 'long', hairColor: '#3a2a1a', female: r() < 0.3, dirty: true, seed: o.seed, h: 0.95 + r() * 0.12, teeth: true });
      hood(rig, '#3a3024');
      rig.weaponKind = o.weapon === 'shield' ? 'axe' : (o.weapon || 'axe');
      villagerWeapon(rig, rig.weaponKind);
      if (o.weapon === 'shield') { var sg = grp(rig.J.elL, 0, -0.14, 0.07); mesh(sg, box(0.5, 0.75, 0.04), std({ map: NF.tex.wood(), color: '#6a4a30', roughness: 0.8 }), 0, 0, 0.0); rig.shield = sg; }
      return rig;
    },
    init: function (e, o) { e.home = e.pos.clone(); e.shield = o.weapon === 'shield' ? 80 : 0; e.throwCd = 3 + Math.random() * 4; e.eyeH = 1.55; },
    damage: function (e, dmg, part, point, dir) {
      if (e.shield > 0 && (part === 'body' || part === 'arm') && fwdOf(e).dot(dir) < -0.3) {
        e.shield -= dmg; NF.fx.sparks(point, dir.clone().negate()); AU.impact(point, false);
        if (e.shield <= 0) { e.rig.shield.visible = false; NF.fx.debris(point, 4, 0.2); }
        return false;
      }
    },
    kill: function (e, part, dir) { e.fallDir = dir && fwdOf(e).dot(dir) > 0 ? -1 : 1; AU.groan(H().eye(e), 1.3, 0.7); },
    update: function (e, t, dt, P) {
      var pose, d = e.pos.distanceTo(P.pos);
      if (e.rig.flame) e.rig.flame.scale.set(1, 0.7 + 0.5 * Math.abs(Math.sin(t * 11)), 1);
      if (e.dead) { pose = A.base(); H().fallAnim(e, dt, pose); A.apply(e.rig, pose, k(dt, 10)); return; }
      H().perceive(e, P, dt);
      if (Math.random() < dt * 0.15 && d < 25) AU.whisper(H().eye(e));
      if (e.state === 'swing') {
        pose = A.cleave(Math.min(1, e.t / 0.95)); H().turnTo(e, H().angTo(e, P.pos), dt, 4);
        if (!e.extra.hit && e.t > 0.5) { e.extra.hit = true; AU.knife(); if (d < 2.0 && facing(e, P) > 0.3 && P.alive) P.hurt(e.rig.weaponKind === 'pitchfork' ? 20 : 16, e, 'hit'); }
        if (e.t > 1.15) { e.state = 'chase'; e.t = 0; e.atkCd = 0.9; }
      } else if (e.state === 'throw') {
        pose = A.cleave(Math.min(0.5, e.t / 1.2)); H().turnTo(e, H().angTo(e, P.pos), dt, 5);
        if (!e.extra.hit && e.t > 0.6) {
          e.extra.hit = true; var from = H().eye(e); var to = P.chest(); var fl = to.clone().sub(from), dist = fl.length();
          var v = fl.divideScalar(dist).multiplyScalar(16); v.y += dist * 0.3;
          var m = new THREE.Group(); mesh(m, box(0.03, 0.03, 0.5), std({ color: '#5a3a22' }), 0, 0, 0); mesh(m, box(0.02, 0.15, 0.12), std({ color: '#666', metalness: 0.8 }), 0, 0.06, 0.2);
          C.shoot({ pos: from, vel: v, g: 9.8, dmg: 14, hostile: true, mesh: m, spin: 14, owner: e, kind: 'hit' });
        }
        if (e.t > 1.0) { e.state = 'chase'; e.t = 0; e.throwCd = 5 + Math.random() * 4; }
      } else if (e.state === 'stagger') { pose = A.walk(0, 0, 0); A.stagger(pose, Math.sin(Math.min(1, e.t / 0.5) * PI), e.flinchDir); if (e.t > 0.5) { e.state = 'chase'; e.t = 0; } }
      else if (e.alert && P.alive) {
        e.state = 'chase';
        var tgt = H().steerTarget(e, P) || P.pos;
        var sp = d < 1.6 ? 0 : H().move(e, tgt, e.speed * (d > 12 ? 1.25 : 1), dt);
        if (d < 1.6) H().turnTo(e, H().angTo(e, P.pos), dt);
        e.ph += dt * (sp * 2.6 + 0.3);
        pose = A.walk(e.ph, Math.min(1, sp / 2), sp > 2.4 ? 0.6 : 0);
        A.add(pose, 'spine', 0.15, 0, 0); pose.shR = [-0.5 + Math.sin(e.ph) * 0.2, 0, -0.1]; pose.elR = [-0.6, 0, 0];
        if (e.shield > 0) { pose.shL = [-1.2, 0, -0.3]; pose.elL = [-1.4, 0, 0]; }
        e.throwCd -= dt;
        if (d < 1.9 && e.atkCd <= 0) { e.state = 'swing'; e.t = 0; e.extra.hit = false; }
        else if (e.rig.weaponKind === 'axe' && e.throwCd <= 0 && d > 6 && d < 16 && NF.world.lineClear(H().eye(e), P.chest())) { e.state = 'throw'; e.t = 0; e.extra.hit = false; }
      } else {
        // wander near home
        if (!e.extra.wp || e.pos.distanceTo(e.extra.wp) < 1) e.extra.wp = e.home.clone().add(new V3((Math.random() - .5) * 14, 0, (Math.random() - .5) * 14));
        var sp2 = H().move(e, e.extra.wp, 0.7, dt); e.ph += dt * (sp2 * 3); pose = A.walk(e.ph, 0.4, 0); A.add(pose, 'head', 0.25, 0, 0.1);
      }
      if (e.flinch > 0) A.stagger(pose, e.flinch * 0.4, e.flinchDir);
      A.apply(e.rig, pose, k(dt, 12));
    }
  });
  // ============================================================ BUTCHER (chainsaw)
  E.register('butcher', {
    stats: { hp: 750, speed: 2.5, rad: 0.5, turn: 3 },
    build: function () {
      var rig = Mo.human({ h: 1.32, skin: '#9a8070', top: '#3a2a20', bottom: '#2a2018', apron: '#5a4a38', gloves: '#1a1410', hair: 'bald', seed: 66, dirty: true, wounds: 3 });
      var sack = std({ map: NF.tex.cloth('#a89068', true, 4), roughness: 1 });
      mesh(rig.J.headMesh, sphere(0.125, 16, 12), sack, 0, 0.11, 0.005, 0.95, 1.15, 1.05);
      var x = std({ color: '#1a0a05' }); mesh(rig.J.headMesh, box(0.03, 0.006, 0.01), x, 0.04, 0.12, 0.125, 1, 1, 1, 0, 0, 0.7); mesh(rig.J.headMesh, box(0.03, 0.006, 0.01), x, 0.04, 0.12, 0.125, 1, 1, 1, 0, 0, -0.7);
      mesh(rig.J.headMesh, sphere(0.012, 6, 5), std({ color: '#ff2a00', emissive: '#ff2000', emissiveIntensity: 2 }), -0.04, 0.12, 0.122);
      villagerWeapon(rig, 'chainsaw');
      return rig;
    },
    init: function (e) { e.eyeH = 2.1; e.alert = false; },
    kill: function (e) { AU.roar(H().eye(e)); NF.game.event('butcherDead'); },
    update: function (e, t, dt, P) {
      var pose, d = e.pos.distanceTo(P.pos);
      if (e.rig.saw) e.rig.saw.position.x = Math.sin(t * 60) * 0.004;
      if (e.dead) { pose = A.base(); H().fallAnim(e, dt, pose); A.apply(e.rig, pose, k(dt, 8)); return; }
      H().perceive(e, P, dt);
      if (e.alert && Math.random() < dt * 3 && d < 40) AU.chainsaw(H().eye(e), e.state === 'saw');
      if (e.state === 'saw') {
        var ph = Math.min(1, e.t / 1.5); pose = A.base(); pose.shR = [-1.4 + Math.sin(ph * PI) * 0.6, 0, 0.5 - ph]; pose.elR = [-0.6, 0, 0]; pose.shL = [-1.3, 0, -0.3]; pose.elL = [-0.8, 0, 0]; pose.spine = [0.3, 0.6 - ph * 1.2, 0];
        if (ph < 0.4) H().turnTo(e, H().angTo(e, P.pos), dt, 3);
        if (!e.extra.hit && ph > 0.5) { e.extra.hit = true; if (d < 2.3 && facing(e, P) > 0.3 && P.alive) { P.hurt(P.hp <= 60 ? 999 : 55, e, 'saw'); NF.fx.blood(P.chest(), new V3(0, 1, 0), 40); } }
        if (e.t > 1.8) { e.state = 'chase'; e.t = 0; e.atkCd = 0.6; }
      } else if (e.alert && P.alive) {
        e.state = 'chase';
        var sp = d < 1.8 ? 0 : H().move(e, H().steerTarget(e, P) || P.pos, e.speed, dt);
        e.ph += dt * (sp * 2 + 0.2); pose = A.heavyWalk(e.ph, Math.min(1, sp / 2), t); pose.shR = [-0.9, 0, 0.2]; pose.elR = [-0.8, 0, 0]; pose.shL = [-0.9, 0, -0.2]; pose.elL = [-0.9, 0, 0];
        if (d < 2.2 && e.atkCd <= 0) { e.state = 'saw'; e.t = 0; e.extra.hit = false; }
      } else pose = A.idle(t, 1);
      if (e.flinch > 0) A.add(pose, 'spine', -0.12 * e.flinch, 0, 0);
      A.apply(e.rig, pose, k(dt, 10));
    }
  });
  // ============================================================ BLOATER
  E.register('bloater', {
    stats: { hp: 95, speed: 0.55, rad: 0.5, turn: 1.6 },
    build: function (o) {
      var rig = Mo.zombie(6, o.seed || 31);
      rig.skinMat.color.set('#b8d090').convertSRGBToLinear();
      rig.J.spine.scale.set(1.7, 1.15, 1.8); rig.J.chest.scale.set(1.25, 1.0, 1.3);
      var pm = std({ color: '#c8d050', emissive: '#4a5a00', emissiveIntensity: 0.8, roughness: 0.3 });
      for (var i = 0; i < 12; i++) mesh(i % 2 ? rig.J.spine : rig.J.chest, sphere(0.03 + Math.random() * 0.03, 8, 6), pm, (Math.random() - .5) * 0.24, Math.random() * 0.2, 0.08 + Math.random() * 0.05);
      return rig;
    },
    init: function (e) { e.eyeH = 1.55; },
    kill: function (e) { var at = e.pos.clone(); at.y += 1; NF.fx.blood(at, new V3(0, 1, 0), 30); C.gas(at, 4.5, 7); AU.splatter(at); e.rig.root.visible = false; NF.game.noDrop(e); },
    update: function (e, t, dt, P) {
      var d = e.pos.distanceTo(P.pos), pose;
      if (e.dead) return;
      H().perceive(e, P, dt);
      if (e.alert && P.alive) { var sp = d < 1.2 ? 0 : H().move(e, H().steerTarget(e, P) || P.pos, e.speed, dt); e.ph += dt * (sp * 3 + 0.3); pose = A.shamble(e.ph, 0.7, t, 0.3); if (d < 1.5) { E.damage(e, 999, 'body', e.pos.clone().setY(e.pos.y + 1), new V3(0, 0, 1), 'self'); return; } }
      else pose = A.shamble(e.ph, 0, t, 0.8);
      e.rig.J.spine.scale.y = 1.15 + Math.sin(t * 3) * 0.04;
      if (Math.random() < dt * 0.3) AU.groan(H().eye(e), 0.6, 1.4);
      A.apply(e.rig, pose, k(dt, 8));
    }
  });
  // ============================================================ CROWS
  function birdMesh(mat) {
    var b = new THREE.Group(); mesh(b, sphere(0.07, 8, 6), mat, 0, 0, 0, 0.8, 0.7, 1.6);
    mesh(b, sphere(0.045, 8, 6), mat, 0, 0.03, 0.1); mesh(b, new THREE.ConeGeometry(0.015, 0.05, 4), std({ color: '#2a2a20' }), 0, 0.03, 0.155, 1, 1, 1, PI / 2);
    var wl = grp(b, 0.03, 0.02, 0), wr = grp(b, -0.03, 0.02, 0);
    mesh(wl, box(0.22, 0.01, 0.1), mat, 0.11, 0, 0); mesh(wr, box(0.22, 0.01, 0.1), mat, -0.11, 0, 0);
    b.wl = wl; b.wr = wr; return b;
  }
  E.register('crows', {
    stats: { hp: 999, speed: 6, rad: 0.2, turn: 6 },
    build: function () {
      var root = new THREE.Group(), body = grp(root), mat = std({ color: '#121214', roughness: 0.6, metalness: 0.2 });
      var birds = [], hits = [];
      for (var i = 0; i < 9; i++) { var b = birdMesh(mat); body.add(b); b.hp = 1; b.off = new V3((Math.random() - .5) * 3, 0, (Math.random() - .5) * 3); b.ph = Math.random() * 6; birds.push(b); hits.push({ j: b, off: new V3(), r: 0.22, part: 'bird', obj: b }); }
      return { root: root, body: body, J: {}, hits: hits, scale: 1, kind: 'crows', birds: birds };
    },
    init: function (e) { e.flying = true; e.pos.y = NF.world.ground(e.pos.x, e.pos.z); e.home = e.pos.clone(); e.peckT = 0; },
    damage: function (e, dmg, part, point, dir, weapon) {
      if (weapon === 'explosive' || weapon === 'vehicle') e.rig.birds.forEach(function (b) { if (b.hp > 0 && b.getWorldPosition(new V3()).distanceTo(point) < 6) { b.hp = 0; b.visible = false; b.scale.setScalar(0.001); } });
      if (part === 'bird') e.rig.birds.forEach(function (b) { if (b.hp > 0 && b.getWorldPosition(new V3()).distanceTo(point) < 0.3) { b.hp = 0; b.visible = false; b.scale.setScalar(0.001); NF.fx.feathers(point); } });
      var alive = e.rig.birds.filter(function (b) { return b.hp > 0; }).length;
      e.alert = true;
      if (alive) return false;
      e.hp = 0.01;
    },
    kill: function (e) { NF.game.noDrop(e); },
    update: function (e, t, dt, P) {
      var d = e.pos.distanceTo(P.pos), birds = e.rig.birds;
      if (e.dead) { e.rig.root.visible = false; return; }
      var gy = NF.world.ground(e.pos.x, e.pos.z);
      if (!e.alert && d < 13) { e.alert = true; AU.caw(e.pos); }
      if (e.alert && P.alive && d < 60) {
        var tgt = P.pos.clone(); var dx = tgt.x - e.pos.x, dz = tgt.z - e.pos.z, dl = Math.hypot(dx, dz) || 1;
        e.pos.x += dx / dl * Math.min(dl, 7 * dt); e.pos.z += dz / dl * Math.min(dl, 7 * dt);
        e.pos.y += ((gy + (d < 3 ? 1.5 : 3.5)) - e.pos.y) * k(dt, 3);
        e.peckT -= dt; if (d < 1.8 && e.peckT <= 0) { var n = birds.filter(function (b) { return b.hp > 0; }).length; P.hurt(1.5 + n * 0.5, e, 'peck'); e.peckT = 0.8; if (Math.random() < 0.4) AU.caw(e.pos); }
        if (Math.random() < dt * 0.3) AU.caw(e.pos);
      } else { e.pos.y += (gy + 0.05 - e.pos.y) * k(dt, 2); if (d > 70) { e.alert = false; } }
      var flying = e.pos.y > gy + 0.4;
      birds.forEach(function (b, i) {
        b.ph += dt * (flying ? 18 : 2);
        if (flying) { var a = t * 1.6 + i * 0.7; b.position.set(Math.cos(a) * (1.2 + (i % 3) * 0.5) + b.off.x * 0.3, Math.sin(t * 2 + i) * 0.5, Math.sin(a) * (1.2 + (i % 3) * 0.5) + b.off.z * 0.3); b.rotation.set(0, a + PI, Math.sin(t * 3 + i) * 0.3); b.wl.rotation.z = Math.sin(b.ph) * 0.9; b.wr.rotation.z = -Math.sin(b.ph) * 0.9; }
        else { b.position.set(b.off.x, 0.04, b.off.z); b.rotation.set(Math.max(0, Math.sin(b.ph + i)) * 0.6, i, 0); b.wl.rotation.z = 0.1; b.wr.rotation.z = -0.1; }
      });
    }
  });
  // ============================================================ SPIDER
  E.register('spider', {
    stats: { hp: 120, speed: 3.4, rad: 0.8, turn: 4 },
    build: function (o) {
      var root = new THREE.Group(), body = grp(root), J = {};
      var shell = std({ map: NF.tex.flesh(), color: '#3a2a26', roughness: 0.4, metalness: 0.1 }), leg = std({ color: '#2a1e1a', roughness: 0.5 });
      var torso = grp(body, 0, 0.62, 0); J.torso = torso;
      mesh(torso, sphere(0.34, 16, 12), shell, 0, 0, 0.15, 1, 0.75, 1.1);
      var abd = grp(torso, 0, 0.12, -0.35); J.abd = abd; mesh(abd, sphere(0.55, 18, 14), shell, 0, 0, -0.35, 1, 0.85, 1.25);
      mesh(abd, box(0.12, 0.3, 0.02), std({ color: '#a01010', emissive: '#400000' }), 0, 0.42, -0.4, 1, 1, 1, -0.9);
      var eye = std({ color: '#ff2010', emissive: '#ff1000', emissiveIntensity: 1.6 });
      for (var i = 0; i < 6; i++) mesh(torso, sphere(0.035, 8, 6), eye, (i % 3 - 1) * 0.08, 0.1 + (i / 3 | 0) * 0.06, 0.45);
      var fang = std({ color: '#d8c8a8' }); J.fangL = grp(torso, 0.07, -0.05, 0.45); J.fangR = grp(torso, -0.07, -0.05, 0.45);
      mesh(J.fangL, new THREE.ConeGeometry(0.03, 0.18, 6), fang, 0, -0.08, 0, 1, 1, 1, PI); mesh(J.fangR, new THREE.ConeGeometry(0.03, 0.18, 6), fang, 0, -0.08, 0, 1, 1, 1, PI);
      J.legs = [];
      for (var l = 0; l < 8; l++) {
        var side = l < 4 ? 1 : -1, n = l % 4, a = side * (0.6 + n * 0.55) - (side < 0 ? 0 : 0);
        var lr = grp(torso, side * 0.18, 0, 0.25 - n * 0.16); lr.rotation.y = side > 0 ? PI / 2 - (0.9 - n * 0.55) : -PI / 2 + (0.9 - n * 0.55);
        var hip = grp(lr); hip.rotation.z = 0; var up = grp(hip); up.rotation.x = 0;
        // leg extends along +z of lr: build with limbs rotated
        var seg1 = grp(lr); seg1.rotation.x = -(PI / 2 + 0.55); mesh(seg1, limb(0.045, 0.035, 0.8), leg, 0, 0, 0);
        var kn = grp(seg1, 0, -0.8, 0); kn.rotation.x = 1.75; mesh(kn, limb(0.035, 0.012, 1.0), leg, 0, 0, 0);
        J.legs.push({ root: lr, s1: seg1, kn: kn, grp: (l + (side > 0 ? 0 : 1)) % 2, base: lr.rotation.y });
      }
      root.traverse(function (c) { if (c.isMesh) c.castShadow = true; });
      return { root: root, body: body, J: J, hits: [{ j: torso, off: new V3(0, 0.05, 0.25), r: 0.35, part: 'head' }, { j: abd, off: new V3(0, 0, -0.35), r: 0.55, part: 'body' }], scale: 1, kind: 'spider' };
    },
    init: function (e) { e.eyeH = 0.7; e.spitCd = 2; },
    kill: function (e) { AU.screech(H().eye(e)); },
    update: function (e, t, dt, P) {
      var J = e.rig.J, d = e.pos.distanceTo(P.pos), gait = 0;
      if (e.dead) { var f = Math.min(1, e.t / 0.6); J.legs.forEach(function (L) { L.kn.rotation.x = 1.75 + f * 1.2; L.s1.rotation.x = -(PI / 2 + 0.55) + f * 0.8; }); e.lift = -0.35 * f; return; }
      H().perceive(e, P, dt); e.spitCd -= dt;
      if (e.state === 'bite') {
        H().turnTo(e, H().angTo(e, P.pos), dt, 6); J.torso.rotation.x = Math.sin(Math.min(1, e.t / 0.5) * PI) * 0.35;
        J.fangL.rotation.z = J.fangR.rotation.z = Math.sin(e.t * 20) * 0.3;
        if (!e.extra.hit && e.t > 0.3) { e.extra.hit = true; if (d < 2.0 && P.alive) { P.hurt(14, e, 'bite'); NF.game.poison(10); } }
        if (e.t > 0.7) { e.state = 'chase'; e.t = 0; e.atkCd = 1.0; J.torso.rotation.x = 0; }
      } else if (e.state === 'spit') {
        H().turnTo(e, H().angTo(e, P.pos), dt, 6); J.abd.rotation.x = -Math.sin(Math.min(1, e.t / 0.6) * PI) * 0.4;
        if (!e.extra.hit && e.t > 0.45) {
          e.extra.hit = true; var from = H().eye(e).add(fwdOf(e).multiplyScalar(0.5)), to = P.chest(), v = to.clone().sub(from); var dist = v.length(); v.divideScalar(dist).multiplyScalar(14); v.y += dist * 0.35;
          var m = new THREE.Mesh(sphere(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#9ac020' }));
          C.shoot({ pos: from, vel: v, g: 9.8, dmg: 8, poison: 12, hostile: true, mesh: m, owner: e, trail: '#8ab020' }); AU.hiss(from);
        }
        if (e.t > 0.8) { e.state = 'chase'; e.t = 0; e.spitCd = 3 + Math.random() * 2; J.abd.rotation.x = 0; }
      } else if (e.alert && P.alive) {
        e.state = 'chase';
        var sp = d < 1.6 ? 0 : H().move(e, H().steerTarget(e, P) || P.pos, e.speed * (d < 10 ? 1.2 : 0.9), dt);
        gait = sp; if (d < 1.7 && e.atkCd <= 0) { e.state = 'bite'; e.t = 0; e.extra.hit = false; }
        else if (d > 4 && d < 13 && e.spitCd <= 0 && NF.world.lineClear(H().eye(e), P.chest())) { e.state = 'spit'; e.t = 0; e.extra.hit = false; }
      }
      e.ph += dt * (gait * 4.5 + 0.5);
      J.legs.forEach(function (L) { var s = Math.sin(e.ph + L.grp * PI); L.root.rotation.y = L.base + s * 0.28 * Math.min(1, gait); L.s1.rotation.x = -(PI / 2 + 0.55) - Math.max(0, Math.cos(e.ph + L.grp * PI)) * 0.3 * Math.min(1, gait); });
      e.lift = Math.abs(Math.sin(e.ph * 2)) * 0.03 * Math.min(1, gait);
      J.abd.rotation.y = Math.sin(t * 2) * 0.08;
    }
  });
  // ============================================================ REAPER (hunter)
  E.register('reaper', {
    stats: { hp: 180, speed: 4.3, rad: 0.42, turn: 6 },
    build: function () {
      var sm = std({ map: scaleTex(), roughness: 0.45, metalness: 0.1 });
      var rig = Mo.human({ skinMat: sm, topMat: sm, botMat: sm, shoes: '#2a3020', hair: 'bald', claws: true, teeth: true, zombie: true, seed: 88, h: 1.12 });
      var hm = rig.J.headMesh; hm.scale.set(0.95, 0.9, 1.35);
      var ey = std({ color: '#ffd020', emissive: '#ffb000', emissiveIntensity: 1.6 });
      mesh(hm, sphere(0.018, 8, 6), ey, 0.04, 0.125, 0.09); mesh(hm, sphere(0.018, 8, 6), ey, -0.04, 0.125, 0.09);
      [rig.J.wrL, rig.J.wrR].forEach(function (w) { for (var c = -1; c <= 1; c++) mesh(w, limb(0.012, 0.002, 0.22), std({ color: '#e0d8c0', roughness: 0.3 }), c * 0.016, -0.1, 0.02, 1, 1, 1, -0.4); });
      for (var s = 0; s < 6; s++) mesh(rig.J.spine, new THREE.ConeGeometry(0.025, 0.12, 5), std({ color: '#2a3a1a' }), 0, s * 0.06, -0.12, 1, 1, 1, -1.9);
      return rig;
    },
    init: function (e) { e.eyeH = 1.4; },
    kill: function (e) { AU.screech(H().eye(e)); },
    update: function (e, t, dt, P) {
      var pose, d = e.pos.distanceTo(P.pos);
      if (e.dead) { pose = A.base(); H().fallAnim(e, dt, pose); A.apply(e.rig, pose, k(dt, 10)); return; }
      H().perceive(e, P, dt);
      function hunch(p) { A.add(p, 'spine', 0.55, 0, 0); A.add(p, 'chest', 0.2, 0, 0); A.add(p, 'neck', -0.5, 0, 0); A.add(p, 'head', -0.3, 0, 0); A.add(p, 'knL', 0.5, 0, 0); A.add(p, 'knR', 0.5, 0, 0); A.add(p, 'hipL', -0.4, 0, 0); A.add(p, 'hipR', -0.4, 0, 0); p.hipsY = (p.hipsY || 0) - 0.15; return p; }
      if (e.state === 'leap') {
        var kk = Math.min(1, e.t / 0.6); e.pos.lerpVectors(e.extra.from, e.extra.to, kk); NF.world.collide(e.pos, e.rad); e.lift = Math.sin(kk * PI) * 1.4;
        pose = A.pounce(kk); pose.hips = [0.5, 0, 0];
        if (!e.extra.hit && kk > 0.6 && e.pos.distanceTo(P.pos) < 1.4) { e.extra.hit = true; if (P.alive) P.hurt(26, e, 'claw'); }
        if (kk >= 1) { e.state = 'recover'; e.t = 0; }
      } else if (e.state === 'slash') {
        var ph = e.t / 0.8; pose = hunch(A.base()); var sw = Math.sin(Math.min(1, ph) * PI);
        pose.shR = [-1.5 + sw * 0.4, 0, -0.9 + sw * 1.8]; pose.chest = [0.2, 0.5 - sw, 0]; H().turnTo(e, H().angTo(e, P.pos), dt, 5);
        if (!e.extra.hit && ph > 0.45) { e.extra.hit = true; AU.knife(); if (d < 2.1 && facing(e, P) > 0.2 && P.alive) { if (P.hp <= 30 && Math.random() < 0.35) { NF.game.toastMsg('DECAPITATED'); P.hurt(999, e, 'claw'); } else P.hurt(24, e, 'claw'); } }
        if (ph > 1.1) { e.state = 'chase'; e.t = 0; e.atkCd = 0.7; }
      } else if (e.state === 'recover') { pose = hunch(A.idle(t, 2)); if (e.t > 0.6) { e.state = 'chase'; e.t = 0; } }
      else if (e.alert && P.alive) {
        e.state = 'chase';
        var sp = d < 1.8 ? 0 : H().move(e, H().steerTarget(e, P) || P.pos, e.speed, dt); if (d < 1.8) H().turnTo(e, H().angTo(e, P.pos), dt);
        e.ph += dt * (sp * 2.3 + 0.3); pose = hunch(A.walk(e.ph, Math.min(1, sp / 3), Math.min(1, sp / 4)));
        pose.shL = [-0.3 + Math.sin(e.ph) * 0.4, 0, 0.3]; pose.shR = [-0.3 - Math.sin(e.ph) * 0.4, 0, -0.3];
        if (d < 2 && e.atkCd <= 0) { e.state = 'slash'; e.t = 0; e.extra.hit = false; }
        else if (d > 4 && d < 9 && e.atkCd <= 0 && Math.random() < dt * 2 && NF.world.lineClear(H().eye(e), P.chest())) { e.state = 'leap'; e.t = 0; e.extra.hit = false; e.extra.from = e.pos.clone(); e.extra.to = P.pos.clone(); e.atkCd = 2; AU.screech(H().eye(e)); }
      } else pose = hunch(A.idle(t, 1));
      if (e.flinch > 0) A.stagger(pose, e.flinch * 0.4, e.flinchDir);
      A.apply(e.rig, pose, k(dt, 14));
    }
  });
  // ============================================================ BURROWER (giant worm)
  E.register('burrower', {
    stats: { hp: 650, speed: 6, rad: 1.0, turn: 3 },
    build: function (o) {
      var root = new THREE.Group(), body = grp(root), fm = std({ map: NF.tex.flesh(), color: '#9a8070', roughness: 0.55 }), segs = [], hits = [];
      for (var i = 0; i < 18; i++) { var s = grp(body); var r = 1.1 - i * 0.03; mesh(s, sphere(r, 16, 12), fm, 0, 0, 0, 1, 1, 0.8); segs.push(s); hits.push({ j: s, off: new V3(), r: r * 0.95, part: i === 0 ? 'head' : 'body' }); }
      var teeth = std({ color: '#e8dcc0', roughness: 0.3 });
      for (var t = 0; t < 14; t++) { var a = t / 14 * PI * 2; mesh(segs[0], new THREE.ConeGeometry(0.08, 0.5, 5), teeth, Math.cos(a) * 0.75, Math.sin(a) * 0.75, 0.75, 1, 1, 1, PI / 2 + 0.3 * Math.sin(a), 0, -0.3 * Math.cos(a)); }
      mesh(segs[0], new THREE.CircleGeometry(0.7, 20), std({ color: '#3a0505', emissive: '#200000' }), 0, 0, 0.85);
      root.traverse(function (c) { if (c.isMesh) c.castShadow = true; });
      return { root: root, body: body, J: {}, hits: hits, scale: 1, kind: 'worm', segs: segs };
    },
    damage: function (e) { if (e.state === 'under' || e.state === 'warn') return false; },
    init: function (e, o) { e.flying = true; e.state = 'under'; e.home = e.pos.clone(); e.rig.root.visible = false; if (o.boss) { e.hp = e.maxHp = 1100; } e.eyeH = 0.5; },
    kill: function (e) { AU.roar(e.pos); NF.game.event('wormDead'); },
    update: function (e, t, dt, P) {
      var segs = e.rig.segs, d = Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z), gy = NF.world.ground(e.pos.x, e.pos.z);
      e.pos.y = gy;
      function arc(u, h) { // position segment along an arc from the hole
        var dir = new V3(Math.sin(e.yaw), 0, Math.cos(e.yaw));
        segs.forEach(function (s, i) { var tt = u - i * 0.055; var y = Math.sin(Math.max(0, Math.min(1, tt)) * PI) * h - (tt < 0 || tt > 1 ? 2 : 0); s.position.set(0, y, (tt - 0.5) * h * 0.9); });
        e.rig.root.updateMatrixWorld(true); segs[0].lookAt(NF.game.player.chest());
      }
      if (e.dead) { var f = Math.min(1, e.t / 2); segs.forEach(function (s, i) { s.position.y = Math.max(-3, s.position.y - dt * 3); }); return; }
      var dist0 = e.pos.distanceTo(e.home);
      if (e.state === 'under') {
        e.rig.root.visible = false;
        if (!e.alert && d < 30) e.alert = true;
        if (e.alert && P.alive && d < 70) {
          var to = P.pos.clone().sub(e.pos); to.y = 0; var l = to.length();
          if (l > 0.5) { e.pos.x += to.x / l * Math.min(l, 7 * dt); e.pos.z += to.z / l * Math.min(l, 7 * dt); }
          if (Math.random() < dt * 12) NF.fx.dirt(new V3(e.pos.x, gy, e.pos.z));
          if (Math.random() < dt * 2) { AU.rumble(e.pos); NF.game.shake(Math.max(0, 0.4 - d * 0.02)); }
          if (l < 2 && e.atkCd <= 0) { e.state = 'warn'; e.t = 0; }
        }
      } else if (e.state === 'warn') { NF.game.shake(0.05); if (Math.random() < dt * 30) NF.fx.dirt(new V3(e.pos.x + (Math.random() - .5) * 2, gy, e.pos.z + (Math.random() - .5) * 2)); if (e.t > 0.9) { e.state = 'erupt'; e.t = 0; e.yaw = Math.random() * 6.28; e.rig.root.visible = true; AU.roar(e.pos); NF.fx.debris(new V3(e.pos.x, gy, e.pos.z), 14, 0.6); e.extra.hit = false; } }
      else if (e.state === 'erupt') { var u = Math.min(1, e.t / 1.6); arc(u * 0.55, 7); if (!e.extra.hit && e.t > 0.3) { e.extra.hit = true; if (P.alive && Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z) < 3) P.hurt(40, { pos: e.pos }, 'slam'); } if (e.t > 1.6) { e.state = 'exposed'; e.t = 0; } }
      else if (e.state === 'exposed') {
        segs.forEach(function (s, i) { var lean = Math.max(0, 1 - i / 9); s.position.set(Math.sin(t * 1.5 + i * 0.4) * 0.5 * lean, Math.max(-2, 5 - i * 0.62), 0); });
        e.rig.root.updateMatrixWorld(true); segs[0].lookAt(P.chest());
        if (!e.extra.bite && P.alive && d < 3.6 && e.t > 1) { e.extra.bite = true; P.hurt(25, e, 'bite'); }
        if (e.t > 4.5) { e.state = 'dive'; e.t = 0; }
      } else if (e.state === 'dive') { arc(0.55 + Math.min(0.6, e.t / 1.2 * 0.6), 7); if (e.t > 1.3) { e.state = 'under'; e.t = 0; e.atkCd = 3; e.extra.bite = false; NF.fx.debris(new V3(e.pos.x, gy, e.pos.z), 8, 0.4); } }
    }
  });
  // ============================================================ BLOOM (plant)
  E.register('bloom', {
    stats: { hp: 150, speed: 0, rad: 0.8, turn: 2 },
    build: function () {
      var root = new THREE.Group(), body = grp(root), J = {};
      var fm = std({ map: NF.tex.flesh(), color: '#b8d8a0', roughness: 0.45, emissive: '#0a1a05' }), pet = std({ color: '#6a2a4a', roughness: 0.5, side: THREE.DoubleSide, emissive: '#200010' });
      var bulb = grp(body, 0, 0.9, 0); J.bulb = bulb; mesh(bulb, sphere(0.55, 16, 12), fm, 0, 0, 0, 1, 1.1, 1);
      J.petals = []; for (var p = 0; p < 5; p++) { var pg = grp(bulb, 0, 0.35, 0); pg.rotation.y = p / 5 * PI * 2; var pm = mesh(pg, sphere(0.5, 12, 8, 0), pet, 0, 0.35, 0.2, 0.6, 1, 0.12); J.petals.push(pg); }
      mesh(bulb, sphere(0.2, 10, 8), std({ color: '#ffd040', emissive: '#a06000', emissiveIntensity: 1 }), 0, 0.42, 0);
      J.vines = [];
      for (var v = 0; v < 4; v++) { var prev = grp(body, Math.cos(v * 1.57) * 0.5, 0.3, Math.sin(v * 1.57) * 0.5), chain = []; for (var s = 0; s < 8; s++) { var sg = grp(prev, 0, s ? 0.35 : 0, 0); mesh(sg, limb(0.07 - s * 0.007, 0.06 - s * 0.007, 0.38), fm, 0, 0.36, 0, 1, -1, 1); chain.push(sg); prev = sg; } J.vines.push(chain); }
      mesh(body, sphere(0.9, 14, 8, 0, PI * 2, 0, PI / 2), std({ color: '#2a2a1a', roughness: 1 }), 0, -0.1, 0, 1.2, 0.3, 1.2);
      root.traverse(function (c) { if (c.isMesh) c.castShadow = true; });
      return { root: root, body: body, J: J, hits: [{ j: bulb, off: new V3(0, 0.3, 0), r: 0.5, part: 'head' }, { j: bulb, off: new V3(0, -0.4, 0), r: 0.5, part: 'body' }], scale: 1, kind: 'plant' };
    },
    init: function (e) { e.eyeH = 1.2; },
    kill: function (e) { NF.fx.blood(e.pos.clone().setY(e.pos.y + 1), new V3(0, 1, 0), 20); },
    update: function (e, t, dt, P) {
      var J = e.rig.J, d = e.pos.distanceTo(P.pos);
      if (e.dead) { var f = Math.min(1, e.t); J.bulb.scale.setScalar(1 - f * 0.6); J.bulb.position.y = 0.9 - f * 0.7; return; }
      var open = d < 8 ? 1 : 0.2; J.petals.forEach(function (p) { p.rotation.x += ((open ? 1.0 : 0.15) - p.rotation.x) * k(dt, 4); });
      e.yaw = H().angTo(e, P.pos);
      var whip = 0;
      if (d < 5.5 && P.alive) { if (e.atkCd <= 0) { e.state = 'whip'; e.t = 0; e.extra.hit = false; e.atkCd = 1.6; } }
      if (e.state === 'whip') { whip = Math.sin(Math.min(1, e.t / 0.7) * PI); if (!e.extra.hit && e.t > 0.35) { e.extra.hit = true; AU.knife(); if (d < 5.5) { P.hurt(14, e, 'hit'); NF.game.poison(6); } } if (e.t > 0.8) e.state = 'idle'; }
      J.vines.forEach(function (ch, vi) { ch.forEach(function (s, i) { s.rotation.x = Math.sin(t * 2 + vi + i * 0.5) * 0.18 + (vi === 0 ? whip * 0.35 : 0); s.rotation.z = Math.cos(t * 1.7 + vi * 2 + i * 0.4) * 0.15; }); });
      J.bulb.rotation.z = Math.sin(t) * 0.05;
    }
  });
  // ============================================================ TEO, turned (boss)
  E.register('teo', {
    stats: { hp: 1300, speed: 2.8, rad: 0.55, turn: 4 },
    build: function () {
      var rig = Mo.human({ skin: '#8a7a6a', top: '#2b3a58', bottom: '#1c2232', hair: 'short', hairColor: '#120c08', badge: true, belt: '#111', dirty: true, zombie: true, wounds: 9, ribs: true, seed: 501, teeth: true, h: 1.12 });
      var fm = std({ map: NF.tex.flesh(), color: '#a08070', roughness: 0.4 });
      rig.J.shR.scale.set(1.7, 1.45, 1.7); [rig.J.shR, rig.J.elR, rig.J.wrR].forEach(function (j) { j.children.forEach(function (c) { if (c.isMesh) c.material = fm; }); });
      for (var c = -1; c <= 1; c++) mesh(rig.J.wrR, limb(0.014, 0.002, 0.24), std({ color: '#e0d6b8' }), c * 0.02, -0.09, 0.02, 1, 1, 1, -0.3);
      var ey = std({ color: '#ffd23a', emissive: '#ffa000', emissiveIntensity: 2 });
      mesh(rig.J.headMesh, sphere(0.017, 8, 6), ey, 0.034, 0.122, 0.09); mesh(rig.J.headMesh, sphere(0.017, 8, 6), ey, -0.034, 0.122, 0.09);
      for (var s = 0; s < 8; s++) mesh(rig.J.chest, sphere(0.04 + Math.random() * 0.04, 10, 8), fm, 0.12 + Math.random() * 0.08, 0.2 + Math.random() * 0.12, (Math.random() - .5) * 0.2);
      return rig;
    },
    init: function (e) { e.eyeH = 1.75; e.phase = 1; },
    hurt: function (e) { if (e.phase === 1 && e.hp < e.maxHp * 0.5) { e.phase = 2; e.speed *= 1.35; e.state = 'roar'; e.t = 0; NF.game.event('teoPhase2'); } },
    kill: function (e) { AU.roar(H().eye(e)); NF.game.event('teoDead'); NF.game.noDrop(e); },
    update: function (e, t, dt, P) {
      var pose, d = e.pos.distanceTo(P.pos);
      if (e.dead) { pose = A.base(); H().fallAnim(e, dt, pose); A.apply(e.rig, pose, k(dt, 6)); return; }
      if (e.state === 'dormant2') { pose = A.zEat(t, 0.4); A.apply(e.rig, pose, k(dt, 6)); return; }
      e.alert = true;
      if (e.state === 'roar') { pose = A.boss('roar', e.t / 1.6, t); if (e.t < dt * 2) AU.roar(H().eye(e)); if (e.t > 1.6) { e.state = 'chase'; e.t = 0; } A.apply(e.rig, pose, k(dt, 8)); return; }
      if (e.state === 'lunge') {
        var kk = Math.min(1, e.t / 0.5); e.pos.lerpVectors(e.extra.from, e.extra.to, kk); NF.world.collide(e.pos, e.rad);
        pose = A.zAttack(kk, 0.5); pose.shR = [-1.8, 0, 0.4];
        if (!e.extra.hit && kk > 0.5 && e.pos.distanceTo(P.pos) < 1.8) { e.extra.hit = true; P.hurt(30, e, 'claw'); }
        if (kk >= 1) { e.state = 'recover'; e.t = 0; }
      } else if (e.state === 'slash') {
        var ph = e.t / 1.2, two = ph > 0.5 ? 1 : 0, pp = (ph % 0.5) / 0.5;
        pose = A.base(); var sw = Math.sin(pp * PI); pose.shR = [-1.4 - 0.4 * (1 - sw), 0, two ? -0.8 + sw * 1.8 : 1.0 - sw * 1.8]; pose.chest = [0.2, (two ? 1 : -1) * (0.5 - sw), 0];
        H().turnTo(e, H().angTo(e, P.pos), dt, 4);
        if (pp > 0.5 && !e.extra['h' + two]) { e.extra['h' + two] = true; AU.knife(); if (d < 2.4 && facing(e, P) > 0.2) P.hurt(20, e, 'claw'); }
        if (ph > 1.15) { e.state = 'chase'; e.t = 0; e.atkCd = e.phase === 2 ? 0.4 : 0.8; }
      } else if (e.state === 'recover') { pose = A.idle(t, 1); A.add(pose, 'spine', 0.4, 0, 0); if (e.t > (e.phase === 2 ? 0.4 : 0.8)) { e.state = 'chase'; e.t = 0; } }
      else if (P.alive) {
        e.state = 'chase';
        var sp = d < 2 ? 0 : H().move(e, H().steerTarget(e, P, true) || P.pos, e.speed, dt); if (d < 2) H().turnTo(e, H().angTo(e, P.pos), dt);
        e.ph += dt * (sp * 2.4 + 0.3); pose = A.walk(e.ph, Math.min(1, sp / 2.5), 0.5); A.add(pose, 'spine', 0.3, 0, 0); pose.shR = [-0.4, 0, -0.3]; pose.elR = [-0.5, 0, 0];
        if (d < 2.3 && e.atkCd <= 0) { e.state = 'slash'; e.t = 0; e.extra = {}; }
        else if (d > 4 && d < 9 && e.atkCd <= 0 && Math.random() < dt * 1.5) { e.state = 'lunge'; e.t = 0; e.extra = { from: e.pos.clone(), to: P.pos.clone() }; e.atkCd = 1.2; AU.groan(H().eye(e), 0.8, 0.6); }
      } else pose = A.idle(t, 0);
      if (e.flinch > 0) A.add(pose, 'spine', -0.2 * e.flinch, 0, 0);
      A.apply(e.rig, pose, k(dt, 12));
    }
  });
  // ============================================================ WARDEN UNBOUND (final boss)
  E.register('unbound', {
    stats: { hp: 3200, speed: 2.4, rad: 0.8, turn: 2.6 },
    build: function () {
      var w = Mo.warden(); w.root.scale.setScalar(1.25);
      var fm = std({ map: NF.tex.flesh(), color: '#b08070', roughness: 0.4, emissive: '#150000' });
      w.J.shL.children.forEach(function (c) { if (c.isMesh) c.visible = false; }); w.J.elL.visible = false;
      var prev = grp(w.J.shL, 0, -0.05, 0), chain = [];
      for (var i = 0; i < 14; i++) { var s = grp(prev, 0, i ? -0.16 : 0, 0); mesh(s, limb(0.07 - i * 0.004, 0.065 - i * 0.004, 0.18), fm, 0, 0, 0); chain.push(s); prev = s; }
      for (var sp = 0; sp < 4; sp++) mesh(prev, new THREE.ConeGeometry(0.03, 0.25, 5), std({ color: '#e0d6b8' }), (sp - 1.5) * 0.03, -0.12, 0, 1, 1, 1, PI);
      w.tentacle = chain;
      var heart = mesh(w.J.chest, sphere(0.09, 14, 10), std({ color: '#ff3040', emissive: '#ff1020', emissiveIntensity: 1.8 }), -0.05, 0.14, 0.13);
      w.heart = heart;
      w.hits.push({ j: w.J.chest, off: new V3(-0.05, 0.14, 0.14), r: 0.1, part: 'heart' });
      w.scale = 1.42 * 1.25;
      return w;
    },
    init: function (e) { e.eyeH = 3.2; e.phase = 1; e.alert = true; },
    hurt: function (e) {
      if (e.phase === 1 && e.hp < e.maxHp * 0.66) { e.phase = 2; e.speed *= 1.25; e.state = 'roar'; e.t = 0; NF.game.event('unboundPhase'); }
      else if (e.phase === 2 && e.hp < e.maxHp * 0.33) { e.phase = 3; e.speed *= 1.25; e.state = 'roar'; e.t = 0; NF.game.event('unboundPhase'); }
    },
    kill: function (e) { AU.roar(H().eye(e)); NF.game.event('unboundDead'); NF.game.noDrop(e); },
    update: function (e, t, dt, P) {
      var pose, d = e.pos.distanceTo(P.pos), rig = e.rig, fwd = fwdOf(e);
      rig.heart.scale.setScalar(1 + 0.15 * Math.max(0, Math.sin(t * (4 + e.phase * 2))));
      var whip = 0;
      if (e.dead) { pose = A.base(); A.dying(pose, Math.min(1, e.t / 1.5)); if (e.t > 1.5) { var g = Math.min(1, (e.t - 1.5) / 0.8); rig.root.rotation.x = PI / 2 * g * g; e.lift = 0.3 * g; } A.apply(rig, pose, k(dt, 5)); return; }
      if (e.state === 'roar') { pose = A.boss('roar', e.t / 2, t); if (e.t < dt * 2) { AU.roar(H().eye(e)); NF.game.shake(1); } if (e.t > 2) { e.state = 'walk'; e.t = 0; } }
      else if (e.state === 'cleave') {
        pose = A.cleave(Math.min(1, e.t / 1.1)); if (e.t < 0.45) H().turnTo(e, H().angTo(e, P.pos), dt, 2.5);
        if (!e.extra.hit && e.t > 0.56) { e.extra.hit = true; NF.fx.shock(e.pos.clone().addScaledVector(fwd, 2.4)); AU.thud(e.pos, 2); NF.game.shake(0.9); var to = P.pos.clone().sub(e.pos).normalize(); if (d < 3.2 && fwd.dot(to) > 0.3) P.hurt(42, e, 'cleave'); }
        if (e.t > 1.4) { e.state = 'walk'; e.t = 0; e.atkCd = 0.8 / e.phase; }
      } else if (e.state === 'whip') {
        pose = A.heavyWalk(0, 0, t); whip = Math.sin(Math.min(1, e.t / 0.8) * PI); H().turnTo(e, H().angTo(e, P.pos), dt, 3);
        if (!e.extra.hit && e.t > 0.45) { e.extra.hit = true; AU.knife(); var to2 = P.pos.clone().sub(e.pos).normalize(); if (d < 6.5 && fwd.dot(to2) > 0.5) { P.hurt(28, e, 'claw'); P.knock = to2.multiplyScalar(4); } }
        if (e.t > 0.9) { e.state = 'walk'; e.t = 0; e.atkCd = 0.6; }
      } else if (e.state === 'charge') {
        pose = A.walk(e.ph += dt * 12, 1, 1); A.add(pose, 'spine', 0.4, 0, 0);
        if (e.t < 0.5) { H().turnTo(e, H().angTo(e, P.pos), dt, 4); pose = A.cleave(0.2); }
        else { var ox = e.pos.x, oz = e.pos.z; e.pos.addScaledVector(fwd, 10 * dt); NF.world.collide(e.pos, e.rad); var blocked = Math.hypot(e.pos.x - ox, e.pos.z - oz) < 10 * dt * 0.5; if (!e.extra.hit && d < 2.2) { e.extra.hit = true; P.hurt(45, e, 'slam'); } if (Math.random() < dt * 8) NF.fx.dirt(e.pos.clone()); if (blocked || e.t > 1.8) { e.state = 'walk'; e.t = 0; e.atkCd = 1; if (blocked) { NF.game.shake(0.8); AU.thud(e.pos, 2); } } }
      } else if (P.alive) {
        e.state = 'walk';
        var sp = d < 2.6 ? 0 : H().move(e, P.pos, e.speed, dt); if (d < 2.6) H().turnTo(e, H().angTo(e, P.pos), dt);
        var prev = e.ph; e.ph += dt * (sp * 2 + 0.2); if (Math.floor(prev / PI) !== Math.floor(e.ph / PI) && sp > 0.1) { AU.thud(e.pos, 1.4); NF.game.shake(Math.max(0, 0.4 - d * 0.02)); }
        pose = A.heavyWalk(e.ph, Math.min(1, sp / 2), t);
        if (e.atkCd <= 0) {
          if (d < 3) { e.state = 'cleave'; e.t = 0; e.extra = {}; }
          else if (d < 6.5) { e.state = 'whip'; e.t = 0; e.extra = {}; }
          else if (d > 9 && d < 30 && Math.random() < dt * (0.4 * e.phase)) { e.state = 'charge'; e.t = 0; e.extra = {}; AU.roar(H().eye(e)); }
        }
      } else pose = A.idle(t, 0);
      rig.tentacle.forEach(function (s, i) { s.rotation.x = Math.sin(t * 3 + i * 0.5) * 0.12 - whip * (i < 3 ? 0.55 : 0.08); s.rotation.z = Math.cos(t * 2.3 + i * 0.4) * 0.12; });
      if (e.flinch > 0) A.add(pose, 'spine', -0.1 * e.flinch, 0, 0);
      A.apply(rig, pose, k(dt, 9));
    }
  });
  return C;
})();
