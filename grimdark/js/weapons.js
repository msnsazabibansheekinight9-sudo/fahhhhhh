'use strict';
// Player arsenal + projectile system.
(function () {
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3();
  const q1 = new THREE.Quaternion();

  /* ================= projectiles ================= */
  const S = G.shots = { list: [] };
  const geoBolt = new THREE.BoxGeometry(0.05, 0.05, 0.9);
  const geoBall = new THREE.SphereGeometry(1, 10, 8);
  const geoNade = new THREE.SphereGeometry(0.09, 10, 8);
  function spriteOf(color, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.texSoft(), color, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size); return s;
  }
  S.make = function (kind) {
    const g = new THREE.Group();
    if (kind === 'bolt') { g.add(new THREE.Mesh(geoBolt, G.glow('boltg', 0xffb050))); g.add(spriteOf(0xff9030, 0.5)); }
    else if (kind === 'plasma' || kind === 'plasmaBig') { const b = new THREE.Mesh(geoBall, G.glow('plg', 0xbfe8ff)); b.scale.setScalar(kind === 'plasma' ? 0.1 : 0.25); g.add(b); g.add(spriteOf(0x3a9cff, kind === 'plasma' ? 0.9 : 2.2)); }
    else if (kind === 'acid') { const b = new THREE.Mesh(geoBall, G.models.mats.acid); b.scale.setScalar(0.14); g.add(b); g.add(spriteOf(0x9aff20, 0.8)); }
    else if (kind === 'fire') { g.add(spriteOf(0xff6010, 1.2)); g.add(spriteOf(0xffd080, 0.5)); }
    else if (kind === 'nade') { g.add(new THREE.Mesh(geoNade, G.models.mats.blackMetal)); const l = spriteOf(0xff2020, 0.25); g.add(l); g.userData.blink = l; }
    return g;
  };
  S.spawnPlayer = function (kind, pos, vel, o) {
    const m = S.make(kind); m.position.copy(pos); G.scene.add(m);
    S.list.push(Object.assign({ kind, pos: m.position, vel: vel.clone(), mesh: m, life: 0, owner: 'p', grav: 0 }, o));
  };
  S.spawnEnemy = function (kind, pos, vel, dmg) {
    const m = S.make(kind); m.position.copy(pos); G.scene.add(m);
    S.list.push({ kind, pos: m.position, vel: vel.clone(), mesh: m, life: 0, owner: 'e', dmg, grav: kind === 'acid' ? 4 : 0, splash: kind === 'fire' ? 2.2 : 1.5 });
  };
  S.clear = function () { S.list.forEach(s => s.mesh.parent && s.mesh.parent.remove(s.mesh)); S.list = []; };
  S.enemyHitscan = function (o, d, dmg, color, kind) {
    const w = G.world.ray(o, d, 120);
    let end = w ? w.t : 120;
    const P = G.player;
    const c = v4.copy(P.pos); c.y += 1.1;
    const t = v3.subVectors(c, o).dot(d);
    let hitP = false;
    if (t > 0 && t < end) {
      const closest = v3.copy(o).addScaledVector(d, t);
      const off = closest.sub(c);
      if (Math.abs(off.y) < 1.0 && Math.hypot(off.x, off.z) < 0.6) { hitP = true; end = t; }
    }
    const e = v3.copy(o).addScaledVector(d, end);
    G.fx.tracer(o, e, color, kind === 'gauss' ? 0.06 : 0.025, kind === 'gauss' ? 0.18 : 0.07);
    if (hitP) P.hurt(dmg * G.enemies.dmgMul(), o, kind);
    else if (w) G.fx.sparks(e, w.normal, color, kind === 'gauss' ? 14 : 5);
    if (kind === 'gauss') G.fx.burst(G.fx.add, e, 10, { c0: 0xd0ffe0, c1: 0x30ff70, sp: [1, 4], life: [0.2, 0.5], s0: [0.1, 0.25], s1: 0.02 });
  };
  function impact(s, point, normal, hitE) {
    const k = s.kind;
    if (s.owner === 'p') {
      if (k === 'bolt') {
        if (hitE) {
          const killed = hitE.e.damage(s.dmg, v1.copy(s.vel).normalize(), { part: hitE.part, point, explosive: true });
          G.arsenal.hitmarker(hitE.part === 'head', killed);
        }
        // the bolt detonates
        G.fx.burst(G.fx.add, point, 14, { c0: 0xfff0c0, c1: 0xff6a10, sp: [1, 5], life: [0.1, 0.3], s0: [0.2, 0.5], s1: 0.05 });
        G.fx.burst(G.fx.smoke, point, 3, { c0: 0x3a3632, sp: [0.3, 1.5], life: [0.5, 1.2], s0: [0.3, 0.5], s1: 1.2, a0: 0.5, up: 0.5 });
        G.fx.sparks(point, normal || v1.set(0, 1, 0), 0xff8020, 6);
        G.fx.flash(point, 0xff8030, 4, 6, 0.12);
        G.enemies.radius(point, 1.4, s.splash, { skipMarker: true });
        G.audio.play('boltexp', point, 0.5);
        if (!hitE) G.fx.decal(point, 0x0a0806, 0.5, 0.7);
      } else if (k === 'plasma' || k === 'plasmaBig') {
        const big = k === 'plasmaBig';
        if (hitE) { const killed = hitE.e.damage(s.dmg, v1.copy(s.vel).normalize(), { part: hitE.part, point, explosive: big }); G.arsenal.hitmarker(hitE.part === 'head', killed); }
        G.fx.burst(G.fx.add, point, big ? 70 : 20, { c0: 0xffffff, c1: 0x2a80ff, sp: [1, big ? 10 : 5], life: [0.15, 0.5], s0: [0.2, big ? 0.9 : 0.4], s1: 0.03 });
        G.fx.flash(point, 0x4aa0ff, big ? 16 : 6, big ? 14 : 7, 0.25);
        G.enemies.radius(point, big ? 3.8 : 1.4, big ? 140 : 20, {});
        G.audio.play(big ? 'explosion' : 'boltexp', point, big ? 0.8 : 0.4);
        if (big) { G.shake += 0.3; G.fx.decal(point, 0x081020, 2.5, 0.8); }
      } else if (k === 'nade') {
        G.fx.explosion(point, 1.8, 0xff7020);
        G.enemies.radius(point, 6.5, 240, {});
        G.audio.play('explosion', point, 1);
        const d = G.player.pos.distanceTo(point);
        if (d < 4) G.player.hurt((4 - d) * 8, point, 'blast');
      }
    } else {
      if (k === 'acid') {
        G.fx.burst(G.fx.smoke, point, 12, { c0: 0x9acf20, c1: 0x5a7a10, sp: [1, 4], life: [0.3, 0.7], s0: [0.1, 0.25], s1: 0.4, a0: 0.9, grav: 10 });
        G.fx.decal(point, 0x5a8a10, 1.2, 0.8);
      } else {
        G.fx.burst(G.fx.add, point, 24, { c0: 0xffe0a0, c1: 0xff3000, sp: [1, 5], life: [0.2, 0.6], s0: [0.3, 0.8], s1: 0.1, up: 1.5 });
        G.fx.flash(point, 0xff5010, 6, 8, 0.25);
      }
      const d = v1.copy(G.player.pos).setY(G.player.pos.y + 1).distanceTo(point);
      if (d < s.splash) G.player.hurt(s.dmg * G.enemies.dmgMul() * (1 - d / s.splash * 0.6), point, k);
      G.audio.play(k === 'acid' ? 'acid' : 'boltexp', point, 0.4);
    }
    s.dead = true;
  }
  S.update = function (dt) {
    for (const s of S.list) {
      const sc = s.owner === 'e' ? G.enemyScale : 1;
      const step = dt * sc;
      s.life += step;
      s.vel.y -= s.grav * step;
      const len = s.vel.length() * step;
      const dir = v2.copy(s.vel).normalize();
      if (s.kind === 'nade') {
        // bouncing grenade
        s.pos.addScaledVector(s.vel, step);
        const gy = G.world.groundAt(s.pos.x, s.pos.z, s.pos.y + 0.2) + 0.09;
        if (s.pos.y < gy) { s.pos.y = gy; if (Math.abs(s.vel.y) > 2) G.audio.play('bounce', s.pos, 0.5); s.vel.y *= -0.35; s.vel.x *= 0.6; s.vel.z *= 0.6; }
        const before = v3.copy(s.pos);
        if (G.world.collide(s.pos, 0.1, 0.1, 0)) { s.vel.x *= -0.4; s.vel.z *= -0.4; }
        s.mesh.userData.blink.visible = (s.life * 6 | 0) % 2 === 0;
        const near = G.enemies.raycast(s.pos, v4.set(0, -1, 0), 0.01);
        if (s.life > 2.2) impact(s, s.pos.clone(), null, null);
        else for (const e of G.enemies.list) if (!e.dead && e.hitBody.distanceTo(s.pos) < e.rBody + 0.3 && s.life > 0.15) { impact(s, s.pos.clone(), null, null); break; }
        continue;
      }
      // swept collision
      const w = G.world.ray(s.pos, dir, len);
      let tHit = w ? w.t : Infinity, hitE = null;
      if (s.owner === 'p') {
        const h = G.enemies.raycast(s.pos, dir, len);
        if (h && h.t < tHit) { tHit = h.t; hitE = h; }
      } else {
        const c = v3.copy(G.player.pos); c.y += 1.1;
        const t = v4.subVectors(c, s.pos).dot(dir);
        if (t > -0.3 && t < len + 0.3) {
          const cl = v4.copy(s.pos).addScaledVector(dir, G.clamp(t, 0, len));
          if (cl.distanceTo(c) < 0.75) { tHit = Math.min(tHit, G.clamp(t, 0, len)); hitE = 'player'; }
        }
      }
      if (tHit !== Infinity) {
        const pt = s.pos.clone().addScaledVector(dir, tHit);
        impact(s, pt, w && !hitE ? w.normal : null, hitE === 'player' ? null : hitE);
        continue;
      }
      s.pos.addScaledVector(s.vel, step);
      s.mesh.lookAt(v3.copy(s.pos).add(dir));
      // trails
      if (s.kind === 'plasma' || s.kind === 'plasmaBig') G.fx.add.emit(s.pos.x, s.pos.y, s.pos.z, 0, 0, 0, 0.2, s.kind === 'plasma' ? 0.25 : 0.6, 0.02, CBLUE, CBLUE2, 0.8, 0, 0, 0);
      else if (s.kind === 'acid') G.fx.smoke.emit(s.pos.x, s.pos.y, s.pos.z, 0, -0.5, 0, 0.4, 0.12, 0.02, CACID, CACID, 0.8, 0, 3, 0);
      else if (s.kind === 'fire') { G.fx.add.emit(s.pos.x, s.pos.y, s.pos.z, G.rand(-0.5, 0.5), G.rand(0, 1), G.rand(-0.5, 0.5), 0.35, 0.7, 0.1, CFIRE, CFIRE2, 0.9, 0, 0, 0); }
      else if (s.kind === 'bolt') G.fx.smoke.emit(s.pos.x, s.pos.y, s.pos.z, 0, 0.2, 0, 0.5, 0.06, 0.25, CSMK, CSMK, 0.25, 0, 0, 0);
      if (s.life > 4) s.dead = true;
    }
    for (const s of S.list) if (s.dead && s.mesh.parent) s.mesh.parent.remove(s.mesh);
    S.list = S.list.filter(s => !s.dead);
  };
  const CBLUE = new THREE.Color(0x9ad0ff), CBLUE2 = new THREE.Color(0x1050ff), CACID = new THREE.Color(0x8acf20), CFIRE = new THREE.Color(0xffd080), CFIRE2 = new THREE.Color(0xff3000), CSMK = new THREE.Color(0x6a6560);

  /* ================= arsenal ================= */
  const A = G.arsenal = {};
  A.defs = {
    bolter: { name: 'Bolt Rifle', key: 1, mag: 30, reserve: 210, rate: 0.125, auto: true, dmg: 30, splash: 14, speed: 170, spread: 0.02, ads: 0.004, reload: 2.0, kick: 0.07, rise: 0.012, sound: 'bolter', flash: 0xffa040 },
    plasma: { name: 'Plasma Incinerator', key: 2, heatWeapon: true, rate: 0.22, dmg: 55, dmgBig: 230, speed: 95, spread: 0.012, ads: 0.003, kick: 0.09, rise: 0.02, flash: 0x60b0ff },
    flamer: { name: 'Purgation Flamer', key: 3, mag: 100, reserve: 300, stream: true, reload: 2.4, range: 11, flash: 0xff7020 },
    melta: { name: 'Melta Gun', key: 4, mag: 5, reserve: 20, rate: 1.0, dmg: 520, range: 24, reload: 2.6, kick: 0.2, rise: 0.06, flash: 0xffa060, windup: 0.22 },
    chainsword: { name: 'Chainsword', key: 5, melee: true, dmg: 75, range: 3.3 },
  };
  A.order = ['bolter', 'plasma', 'flamer', 'melta', 'chainsword'];
  A.init = function () {
    A.root = new THREE.Group();
    A.root.scale.setScalar(0.8);
    G.vmScene.add(A.root);
    A.vm = {}; A.st = {};
    for (const k of A.order) {
      const vm = A.vm[k] = G.models.vm[k]();
      vm.root.visible = false;
      A.root.add(vm.root);
      // right gauntlet on the grip
      const gR = G.models.gauntlet(1);
      if (k === 'chainsword') { gR.hand.position.set(0, -0.01, 0.0); gR.hand.rotation.set(Math.PI / 2, 0, Math.PI / 2); }
      else { gR.hand.position.set(0, -0.07, 0.03); gR.hand.rotation.set(0.35, 0, 0); }
      vm.root.add(gR.hand);
      vm.handR = gR.hand;
      vm.wrist = new THREE.Object3D(); vm.wrist.position.set(0, 0, 0.07); gR.hand.add(vm.wrist);
      vm.magHome = vm.mag ? vm.mag.position.clone() : null;
      vm.flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.texSoft(), color: A.defs[k].flash || 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false }));
      vm.flashSprite.visible = false;
      vm.muzzle.add(vm.flashSprite);
    }
    A.foreR = G.models.gauntlet(1).fore; G.vmScene.add(A.foreR);
    const gl = G.models.gauntlet(-1);
    A.handL = gl.hand; A.foreL = gl.fore; G.vmScene.add(A.handL, A.foreL);
    A.wristL = new THREE.Object3D(); A.wristL.position.set(0, 0, 0.07); A.handL.add(A.wristL);
    A.reset();
  };
  A.reset = function () {
    for (const k of A.order) {
      const d = A.defs[k];
      A.st[k] = { mag: d.mag || 0, reserve: d.reserve || 0, heat: 0, lock: 0 };
    }
    A.cur = 'bolter'; A.next = null;
    A.fireCD = 0; A.reloadT = -1; A.switchT = 0; A.charge = -1; A.ventT = -1;
    A.recoil = { z: 0, vz: 0, rx: 0, vrx: 0, ry: 0 };
    A.sway = { x: 0, y: 0 }; A.adsK = 0;
    A.swing = -1; A.combo = 0; A.lunge = -1; A.revv = 0; A.meltaWind = -1;
    A.grenades = 3; A.nadeT = -1;
    A.order.forEach(k => A.vm[k].root.visible = k === A.cur);
    if (A.flameLoop) A.flameLoop.stop(); A.flameLoop = null;
    if (A.chainLoop) A.chainLoop.stop(); A.chainLoop = null;
    A.flaming = false;
  };
  A.hitmarker = function (head, killed) { G.hud.hitmarker(head, killed); };

  A.select = function (k) {
    if (k === A.cur && !A.next) return;
    if (A.next === k) return;
    A.next = k; A.switchT = 0; A.reloadT = -1; A.charge = -1; A.swing = -1; A.meltaWind = -1;
    G.audio.play('magout', null, 0.4);
  };
  A.startReload = function () {
    const d = A.defs[A.cur], s = A.st[A.cur];
    if (d.melee || A.reloadT >= 0 || A.next) return;
    if (d.heatWeapon) { if (s.lock <= 0 && s.heat > 5) { A.ventT = 0; s.lock = 1.6; G.audio.play('vent', null, 0.6); } return; }
    if (s.mag >= d.mag || s.reserve <= 0) return;
    A.reloadT = 0;
  };

  function aimRay(o, d, spread) {
    G.camera.getWorldPosition(o);
    G.camera.getWorldDirection(d);
    if (spread) {
      const r1 = v4.set(G.rand(-1, 1), G.rand(-1, 1), G.rand(-1, 1)).normalize().multiplyScalar(spread * Math.random());
      d.add(r1).normalize();
    }
  }
  function muzzleWorld(out) {
    A.vm[A.cur].muzzle.getWorldPosition(out);  // camera-space (vm scene world == camera space)
    return out.applyMatrix4(G.camera.matrixWorld);
  }
  function toWorld(obj, out) { obj.getWorldPosition(out); return out.applyMatrix4(G.camera.matrixWorld); }

  function curSpread(d) {
    const P = G.player;
    let s = G.lerp(d.spread, d.ads, A.adsK);
    s *= 1 + P.moveAmt * 0.8 + (P.onGround ? 0 : 1.5);
    return s;
  }
  A.spread = function () { const d = A.defs[A.cur]; return d.melee ? 0.02 : d.stream ? 0.06 : curSpread(d); };

  function kick(d, mult) {
    const m = mult || 1;
    A.recoil.vz += d.kick * 30 * m; A.recoil.vrx += d.kick * 22 * m; A.recoil.ry = G.rand(-1, 1) * d.kick * 0.3;
    G.player.recoil += d.rise * m * (1 - A.adsK * 0.4);
    G.player.recoilYaw += G.rand(-0.4, 0.4) * d.rise * m;
  }
  function flashVM(scale) {
    const vm = A.vm[A.cur];
    vm.flashSprite.visible = true; vm.flashSprite.scale.setScalar(0.25 * (scale || 1) * G.rand(0.8, 1.3));
    vm.flashSprite.material.rotation = Math.random() * 6;
    A.flashT = 0.04;
    G.vmFlash.color.set(A.defs[A.cur].flash); G.vmFlash.intensity = 4 * (scale || 1);
  }
  function ejectCasing() {
    const vm = A.vm[A.cur];
    if (!vm.eject) return;
    toWorld(vm.eject, v1);
    const r = v2.set(1, 0, 0).applyQuaternion(G.camera.getWorldQuaternion(q1));
    G.fx.gib(v1, G.models.mats.brass, 0.035, r.multiplyScalar(G.rand(3, 5)).add(v3.set(0, G.rand(2, 4), 0)));
  }

  function fireBolter(d, s) {
    if (s.mag <= 0) { if (G.input.lmbPressed) G.audio.play('empty'); if (s.reserve > 0) A.startReload(); return; }
    s.mag--; A.fireCD = d.rate;
    aimRay(v1, v2, curSpread(d));
    const hit = G.world.ray(v1, v2, 300);
    const tgt = v3.copy(v1).addScaledVector(v2, hit ? hit.t : 300);
    const m = muzzleWorld(v4);
    // if the target is very close, fire from the eye so we never hit our own cover
    const from = v1.distanceTo(tgt) < 3 ? v1 : m;
    const dir = new THREE.Vector3().subVectors(tgt, from).normalize();
    S.spawnPlayer('bolt', from, dir.multiplyScalar(d.speed), { dmg: d.dmg, splash: d.splash });
    G.fx.muzzle(m, dir, d.flash);
    G.fx.flash(m, d.flash, 3, 6, 0.06);
    flashVM(1);
    kick(d);
    ejectCasing();
    G.audio.play('bolter', null, 0.8);
    G.player.noise = 1;
  }
  function firePlasma(d, s, big) {
    const k = big ? 2.5 : 1;
    A.fireCD = big ? 0.5 : d.rate;
    s.heat += big ? 42 : 13; s.cool = 0.45;
    aimRay(v1, v2, big ? d.ads : curSpread(d));
    const hit = G.world.ray(v1, v2, 300);
    const tgt = v3.copy(v1).addScaledVector(v2, hit ? hit.t : 300);
    const m = muzzleWorld(v4);
    const from = v1.distanceTo(tgt) < 3 ? v1 : m;
    const dir = new THREE.Vector3().subVectors(tgt, from).normalize();
    S.spawnPlayer(big ? 'plasmaBig' : 'plasma', from, dir.multiplyScalar(big ? d.speed * 0.8 : d.speed), { dmg: big ? d.dmgBig : d.dmg });
    G.fx.burst(G.fx.add, m, big ? 30 : 10, { c0: 0xffffff, c1: 0x3080ff, sp: [1, 6], dir, cone: 0.4, life: [0.05, 0.15], s0: [0.1, 0.3], s1: 0.02 });
    G.fx.flash(m, 0x4aa0ff, 4 * k, 8, 0.1);
    flashVM(k);
    kick(d, big ? 2.5 : 1);
    G.audio.play(big ? 'plasmaBig' : 'plasma', null, 0.8);
    if (s.heat >= 100) {
      s.heat = 100; s.lock = 2.6;
      G.player.hurt(18, null, 'overheat');
      G.audio.play('overheat', null, 1);
      G.hud.banner('OVERHEAT — VENTING', 1.4, '#6ab0ff');
    }
  }
  function fireMelta(d, s) {
    s.mag--; A.fireCD = d.rate;
    aimRay(v1, v2, 0.002);
    const w = G.world.ray(v1, v2, d.range);
    const maxT = w ? w.t : d.range;
    const skip = new Set();
    const dir = v2.clone();
    let hits = 0;
    for (let i = 0; i < 8; i++) {
      const h = G.enemies.raycast(v1, dir, maxT, skip);
      if (!h) break;
      skip.add(h.e);
      const fall = h.t < 14 ? 1 : 1 - (h.t - 14) / (d.range - 14) * 0.6;
      const killed = h.e.damage(d.dmg * fall, dir, { part: h.part, point: h.point, melta: true });
      A.hitmarker(h.part === 'head', killed); hits++;
      G.fx.burst(G.fx.add, h.point, 20, { c0: 0xffffff, c1: 0xff6010, sp: [1, 6], life: [0.2, 0.5], s0: [0.2, 0.5], s1: 0.05 });
    }
    const m = muzzleWorld(v4);
    const end = v3.copy(v1).addScaledVector(dir, maxT);
    G.fx.tracer(m, end, 0xffe0a0, 0.18, 0.25);
    G.fx.tracer(m, end, 0xff5010, 0.45, 0.4);
    // heat-haze line of particles
    for (let i = 0; i < 26; i++) { v1.lerpVectors(m, end, i / 26); G.fx.add.emit(v1.x, v1.y, v1.z, G.rand(-0.3, 0.3), G.rand(0, 0.6), G.rand(-0.3, 0.3), 0.5, 0.35, 0.05, CFIRE, CFIRE2, 0.7, 0, 0, 1); }
    if (w) { G.fx.explosion(end, 0.6, 0xff6010); G.fx.decal(end, 0x200800, 1.3, 0.9); }
    G.fx.flash(m, 0xff7020, 10, 14, 0.25);
    flashVM(2.5);
    kick(d);
    G.audio.play('melta', null, 1);
    G.shake += 0.25;
    G.player.noise = 1;
  }
  function flamerTick(d, s, dt) {
    s.mag = Math.max(0, s.mag - 22 * dt);
    const m = muzzleWorld(v4);
    G.camera.getWorldDirection(v2);
    const P = G.player;
    // particles of burning promethium
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
        if (e.dead || e.removed) continue;
        v3.subVectors(e.hitBody, v1);
        const dist = v3.length();
        if (dist > d.range + e.rBody) continue;
        v3.divideScalar(dist);
        if (v3.dot(v2) < Math.cos(0.32) - e.rBody / Math.max(1, dist)) continue;
        if (!G.world.los(v1, e.hitBody)) continue;
        const killed = e.damage(14, v3, { fire: 3, point: e.hitBody, silent: Math.random() < 0.7 });
        if (killed) A.hitmarker(false, true);
      }
    }
    G.player.noise = 1;
  }
  function meleeHit(dmg, range, arc, heavy) {
    G.camera.getWorldPosition(v1); G.camera.getWorldDirection(v2);
    let any = false;
    for (const e of G.enemies.list) {
      if (e.dead || e.removed) continue;
      v3.subVectors(e.hitBody, v1);
      const dist = v3.length() - e.rBody;
      if (dist > range) continue;
      v3.normalize();
      if (v3.dot(v2) < Math.cos(arc)) continue;
      const killed = e.damage(dmg, v2, { melee: true, point: e.hitBody, explosive: heavy });
      A.hitmarker(false, killed);
      any = true;
      for (let i = 0; i < 3; i++) G.fx.blood(e.hitBody, v4.copy(v2).add(v3.set(G.rand(-1, 1), G.rand(0, 1), G.rand(-1, 1))), G.enemies.FAC[e.t.fac].blood, 10);
      if (G.enemies.FAC[e.t.fac].metal) G.fx.sparks(e.hitBody, v2, 0xffd080, 20);
    }
    if (any) { G.audio.play('chainHit', null, 1); G.shake += 0.15; A.revv = 1; A.hitStop = 0.05; }
    return any;
  }

  A.update = function (dt) {
    const I = G.input, P = G.player;
    let d = A.defs[A.cur], s = A.st[A.cur], vm = A.vm[A.cur];
    // weapon selection
    for (const k of A.order) if (I.pressed['Digit' + A.defs[k].key]) A.select(k);
    if (I.wheel) { const i = A.order.indexOf(A.next || A.cur); A.select(A.order[(i + (I.wheel > 0 ? 1 : -1) + A.order.length) % A.order.length]); }
    if (I.pressed.KeyR) A.startReload();
    if (A.next) {
      A.switchT += dt / 0.45;
      if (A.switchT >= 0.5 && A.cur !== A.next) {
        vm.root.visible = false; A.cur = A.next;
        d = A.defs[A.cur]; s = A.st[A.cur]; vm = A.vm[A.cur]; vm.root.visible = true;
        G.audio.play('rack', null, 0.5);
      }
      if (A.switchT >= 1) { A.next = null; A.switchT = 0; }
    }
    A.fireCD -= dt;
    // ADS
    const canAds = !d.melee && !P.sprinting && A.reloadT < 0 && !A.next;
    A.adsK = G.damp(A.adsK, I.rmb && canAds ? 1 : 0, 14, dt);
    // heat cooling
    for (const k of A.order) {
      const st = A.st[k];
      if (A.defs[k].heatWeapon) {
        if (st.lock > 0) { st.lock -= dt; st.heat = Math.max(0, st.heat - dt * 60); }
        else if ((st.cool = (st.cool || 0) - dt) <= 0) st.heat = Math.max(0, st.heat - dt * 28);
      }
    }
    const busy = A.next || A.reloadT >= 0 || P.dead;
    // grenade
    if (I.pressed.KeyG || I.pressed.KeyQ) {
      if (A.grenades > 0 && A.nadeT < 0 && !P.dead) {
        A.grenades--; A.nadeT = 0;
        aimRay(v1, v2);
        v1.addScaledVector(v2, 0.6);
        S.spawnPlayer('nade', v1, v2.multiplyScalar(19).add(v3.set(0, 4, 0)).add(P.vel), { grav: 18 });
        G.audio.play('swing', null, 0.5);
      }
    }
    if (A.nadeT >= 0) { A.nadeT += dt / 0.5; if (A.nadeT >= 1) A.nadeT = -1; }

    // firing
    let flaming = false;
    if (!busy && P.canAct) {
      if (d.melee) {
        A.updateSword(dt, d);
      } else if (d.stream) {
        if (I.lmb && s.mag > 0 && !P.sprinting) { flaming = true; flamerTick(d, s, dt); }
        else if (I.lmbPressed && s.mag <= 0) { G.audio.play('empty'); A.startReload(); }
      } else if (d.heatWeapon) {
        if (s.lock > 0) { A.charge = -1; }
        else if (I.lmb && !P.sprinting) {
          if (A.charge < 0 && A.fireCD <= 0) { A.charge = 0; }
          else if (A.charge >= 0) { A.charge += dt; if (A.charge > 0.25 && !A.chargeSnd) { A.chargeSnd = true; G.audio.play('charge', null, 0.5); } }
        } else if (A.charge >= 0) {
          firePlasma(d, s, A.charge > 0.85);
          A.charge = -1; A.chargeSnd = false;
        }
      } else if (A.cur === 'melta') {
        if (A.meltaWind >= 0) { A.meltaWind += dt; if (A.meltaWind >= d.windup) { A.meltaWind = -1; fireMelta(d, s); } }
        else if (I.lmbPressed && A.fireCD <= 0 && !P.sprinting) {
          if (s.mag > 0) { A.meltaWind = 0; G.audio.play('charge', null, 0.4); }
          else { G.audio.play('empty'); A.startReload(); }
        }
      } else if (d.auto) {
        if (I.lmb && A.fireCD <= 0 && !P.sprinting) fireBolter(d, s);
      }
    }
    // flamer loop
    if (flaming && !A.flameLoop) A.flameLoop = G.audio.loop('flamer');
    if (A.flameLoop) A.flameLoop.set(flaming ? 1 : 0, flaming ? 0.55 : 0);
    if (!flaming && A.flameLoop && A.flaming) { A.flameLoop.stop(); A.flameLoop = null; }
    A.flaming = flaming;
    // chainsword idle loop
    const sword = A.cur === 'chainsword' && !A.next;
    if (sword && !A.chainLoop) A.chainLoop = G.audio.loop('chain');
    if (!sword && A.chainLoop) { A.chainLoop.stop(); A.chainLoop = null; }
    A.revv = G.damp(A.revv, (A.swing >= 0 || A.lunge >= 0) ? 1 : 0.15, 6, dt);
    if (A.chainLoop) A.chainLoop.set(A.revv, 0.08 + A.revv * 0.14);

    // reload timeline
    if (A.reloadT >= 0) {
      const prev = A.reloadT;
      A.reloadT += dt / d.reload;
      const cross = x => prev < x && A.reloadT >= x;
      if (cross(0.18)) G.audio.play('magout', null, 0.7);
      if (cross(0.62)) G.audio.play('magin', null, 0.8);
      if (cross(0.8)) { G.audio.play('rack', null, 0.8); A.recoil.vrx += 1.5; }
      if (A.reloadT >= 1) {
        const need = d.mag - s.mag, take = Math.min(need, s.reserve);
        s.mag += take; s.reserve -= take; A.reloadT = -1;
      }
    }
    if (A.ventT >= 0) { A.ventT += dt / 1.6; if (A.ventT >= 1) A.ventT = -1; }
    A.animate(dt);
  };

  A.updateSword = function (dt, d) {
    const I = G.input, P = G.player;
    if (A.swing >= 0) {
      const prev = A.swing;
      A.swing += dt / (A.heavy ? 0.7 : 0.42);
      const hitAt = A.heavy ? 0.5 : 0.42;
      if (prev < hitAt && A.swing >= hitAt) meleeHit(A.heavy ? d.dmg * 2.2 : d.dmg, d.range + (A.heavy ? 0.6 : 0), A.heavy ? 0.9 : 1.0, A.heavy);
      if (prev < 0.15 && A.swing >= 0.15) G.audio.play('swing', null, 0.8);
      if (A.swing >= 1) { A.swing = -1; if (I.lmb) { A.combo = (A.combo + 1) % 3; A.swing = 0; A.heavy = false; } }
    } else if (I.lmbPressed || I.lmb) { A.swing = 0; A.heavy = false; A.combo = (A.combo + 1) % 3; }
    else if (I.rmbPressed && P.onGround) {
      // lunge into a heavy overhead strike
      A.swing = 0; A.heavy = true; A.combo = 2;
      G.camera.getWorldDirection(v2); v2.y = 0; v2.normalize();
      P.vel.addScaledVector(v2, 16);
      G.audio.play('swing', null, 1);
    }
  };

  // viewmodel pose
  const base = { x: 0.3, y: -0.3, z: -0.72 };
  A.animate = function (dt) {
    const P = G.player, I = G.input, d = A.defs[A.cur], vm = A.vm[A.cur], s = A.st[A.cur];
    const R = A.recoil;
    R.vz += (-R.z * 220 - R.vz * 20) * dt; R.z += R.vz * dt;
    R.vrx += (-R.rx * 200 - R.vrx * 18) * dt; R.rx += R.vrx * dt;
    R.ry *= Math.exp(-dt * 10);
    A.sway.x = G.damp(A.sway.x, G.clamp(-I.mdx * 0.0015, -0.08, 0.08), 10, dt);
    A.sway.y = G.damp(A.sway.y, G.clamp(I.mdy * 0.0015, -0.08, 0.08), 10, dt);
    const ads = A.adsK, hip = 1 - ads;
    const bob = P.bobPhase, ba = P.moveAmt * (P.onGround ? 1 : 0.2) * (0.25 + hip * 0.75);
    const spr = P.sprintK;
    let x = base.x * hip + (vm.adsX || 0) * ads, y = base.y * hip + (vm.adsY || -0.2) * ads, z = base.z * hip - 0.42 * ads;
    let rx = 0.03 * hip, ry = 0.17 * hip, rz = 0.04 * hip;
    if (d.melee) { x = 0.26; y = -0.3; z = -0.55; rx = 0.85; ry = -0.15; rz = -0.25; }
    x += Math.sin(bob) * 0.014 * ba + A.sway.x * hip;
    y += -Math.abs(Math.cos(bob)) * 0.016 * ba + A.sway.y * hip + Math.sin(G.t * 1.6) * 0.003 * hip;
    rz += Math.sin(bob) * 0.02 * ba + A.sway.x * 1.5;
    rx += A.sway.y * 0.8;
    // sprint pose
    x += spr * 0.04; y -= spr * 0.07; rx -= spr * 0.3; ry += spr * 0.6; rz += spr * 0.15;
    // landing dip
    y -= P.landDip * 0.08; rx -= P.landDip * 0.1;
    // recoil
    z += R.z * (1 - ads * 0.5); rx += R.rx * 0.6; ry += R.ry;
    // switching
    if (A.next) { const k = Math.sin(A.switchT * Math.PI); y -= k * 0.45; rx -= k * 0.8; rz += k * 0.3; }
    // grenade throw: dip the weapon
    if (A.nadeT >= 0) { const k = Math.sin(A.nadeT * Math.PI); y -= k * 0.25; rz += k * 0.5; }
    // reload choreography
    let magOff = null, leftT = null;
    if (A.reloadT >= 0) {
      const t = A.reloadT;
      rz += G.kf(t, [[0, 0], [0.15, 0.55], [0.82, 0.55], [0.9, 0.1], [1, 0]]);
      rx += G.kf(t, [[0, 0], [0.15, 0.25], [0.6, 0.2], [0.66, 0.3], [0.8, 0.2], [0.85, 0.35], [1, 0]]);
      x -= G.kf(t, [[0, 0], [0.15, 0.06], [0.85, 0.06], [1, 0]]);
      y += G.kf(t, [[0, 0], [0.15, 0.04], [0.85, 0.04], [1, 0]]);
      if (vm.mag) {
        const my = G.kf(t, [[0, 0], [0.15, 0], [0.3, -0.45], [0.31, -0.6], [0.45, -0.3], [0.58, -0.08], [0.64, 0], [1, 0]]);
        const mx = G.kf(t, [[0, 0], [0.3, 0.0], [0.31, -0.2], [0.5, -0.05], [0.6, 0], [1, 0]]);
        magOff = v3.set(mx, my, 0);
        leftT = G.kf(t, [[0, 0], [0.12, 1], [0.72, 1], [0.85, 0]]);
      }
    }
    if (A.ventT >= 0) { const k = Math.sin(A.ventT * Math.PI); rz += k * 0.6; rx += k * 0.3; }
    // chainsword swings
    if (d.melee) {
      const sw = A.swing;
      if (sw >= 0) {
        const c = A.heavy ? 2 : A.combo;
        if (c === 0) { // right to left
          x += G.kf(sw, [[0, 0], [0.25, 0.15], [0.55, -0.45], [1, 0]]);
          y += G.kf(sw, [[0, 0], [0.25, 0.1], [0.55, -0.05], [1, 0]]);
          ry += G.kf(sw, [[0, 0], [0.25, -0.9], [0.55, 1.4], [1, 0]]);
          rz += G.kf(sw, [[0, 0], [0.25, -0.9], [0.55, 0.6], [1, 0]]);
          rx += G.kf(sw, [[0, 0], [0.25, 0.2], [0.55, -0.6], [1, 0]]);
        } else if (c === 1) { // left to right backhand
          x += G.kf(sw, [[0, 0], [0.25, -0.4], [0.55, 0.25], [1, 0]]);
          ry += G.kf(sw, [[0, 0], [0.25, 1.2], [0.55, -1.2], [1, 0]]);
          rz += G.kf(sw, [[0, 0], [0.25, 0.9], [0.55, -0.6], [1, 0]]);
          rx += G.kf(sw, [[0, 0], [0.25, 0.1], [0.55, -0.7], [1, 0]]);
        } else { // overhead
          y += G.kf(sw, [[0, 0], [0.3, 0.22], [0.55, -0.25], [1, 0]]);
          x += G.kf(sw, [[0, 0], [0.3, -0.15], [0.55, -0.2], [1, 0]]);
          rx += G.kf(sw, [[0, 0], [0.3, 0.9], [0.55, -1.3], [1, 0]]);
          rz += G.kf(sw, [[0, 0], [0.3, 0.3], [0.55, 0.1], [1, 0]]);
        }
      }
      vm.updateChain(dt, 0.4 + A.revv * 4);
      if (A.revv > 0.5 && Math.random() < 0.3) { toWorld(vm.muzzle, v1); G.fx.sparks(v1, v2.set(0, 1, 0), 0xffc060, 1); }
    }
    // plasma coil and vents
    if (A.cur === 'plasma') {
      const ch = A.charge >= 0 ? Math.min(1, A.charge / 0.85) : 0;
      vm.coilMat.emissiveIntensity = 0.8 + s.heat / 40 + ch * 3 + Math.sin(G.t * 30) * 0.1 * ch;
      vm.coilMat.emissive.setRGB(0.2 + s.heat / 120, 0.6 - s.heat / 300, 1);
      vm.rings.forEach((r, i) => { r.rotation.z += dt * (1 + ch * 12); r.scale.setScalar(1 + ch * 0.12 * Math.sin(G.t * 40 + i)); });
      const vent = s.lock > 0 ? 1 : 0;
      vm.vents.forEach(o => { o.v.position.x = G.damp(o.v.position.x, o.sd * (0.065 + vent * 0.03), 10, dt); });
      if (vent && Math.random() < 0.6) { toWorld(vm.vents[Math.random() < 0.5 ? 0 : 1].v, v1); G.fx.smoke.emit(v1.x, v1.y, v1.z, G.rand(-0.5, 0.5), 1.5, G.rand(-0.5, 0.5), 0.8, 0.05, 0.4, CSTEAM, CSTEAM, 0.4, 0, -1, 1); }
      x += (Math.random() - 0.5) * 0.004 * ch; y += (Math.random() - 0.5) * 0.004 * ch;
    }
    if (A.cur === 'melta') {
      vm.heatMat.emissiveIntensity = G.damp(vm.heatMat.emissiveIntensity, A.meltaWind >= 0 ? 3 : A.fireCD > 0 ? 1.5 : 0.25, 5, dt);
      if (A.meltaWind >= 0) { x += (Math.random() - 0.5) * 0.006; y += (Math.random() - 0.5) * 0.006; }
    }
    if (A.cur === 'flamer') {
      vm.pilot.scale.setScalar(0.05 + Math.random() * 0.025 + (A.flaming ? 0.08 : 0));
      if (A.flaming) { x += (Math.random() - 0.5) * 0.004; y += (Math.random() - 0.5) * 0.004; }
    }
    if (A.cur === 'bolter') vm.counter.material.color.setHSL(s.mag / 30 * 0.33, 1, 0.5);
    vm.root.position.set(x, y, z);
    vm.root.rotation.set(rx, ry, rz);
    // magazine + left hand
    if (vm.mag) vm.mag.position.copy(vm.magHome).add(magOff || v4.set(0, 0, 0));
    vm.root.updateMatrixWorld(true);
    // left hand: foregrip, or the magazine during a reload
    const lh = A.handL;
    lh.visible = !!vm.leftGrip;
    if (vm.leftGrip) {
      const grip = v1.copy(vm.leftGrip).applyMatrix4(vm.root.matrixWorld);
      if (leftT && vm.mag) {
        vm.mag.getWorldPosition(v2); v2.y -= 0.05;
        grip.lerp(v2, leftT);
      }
      lh.position.copy(grip);
      lh.quaternion.copy(vm.root.quaternion);
      lh.rotateZ(Math.PI / 2 * 0.8); lh.rotateY(0.2);
      lh.updateMatrixWorld(true);
      A.wristL.getWorldPosition(v2);
      G.models.span(A.foreL, v2, v3.set(-0.3, -0.5, 0.15), 0.045);
      A.foreL.visible = true;
    } else A.foreL.visible = false;
    vm.wrist.getWorldPosition(v2);
    G.models.span(A.foreR, v2, v3.set(0.34, -0.5, 0.15), 0.048);
    // muzzle flash timer
    if (A.flashT > 0) { A.flashT -= dt; if (A.flashT <= 0) vm.flashSprite.visible = false; }
    G.vmFlash.intensity = G.damp(G.vmFlash.intensity, A.flaming ? 2 + Math.random() * 2 : 0, 20, dt);
    if (A.flaming) G.vmFlash.color.set(0xff7020);
  };
  const CSTEAM = new THREE.Color(0xd0d8e0);
})();
