// Particles and transient effects: blood, sparks, muzzle flash, casings, debris, glass.
var NF = window.NF || (window.NF = {});
NF.fx = (function () {
  var F = { parts: [] }, scene, flashLight, flashT = 0, shellMat, bloodMat, sparkMat, smokeMat, debrisMat, glassMat;
  var geoDrop = new THREE.SphereGeometry(0.018, 5, 4), geoShell = new THREE.CylinderGeometry(0.006, 0.006, 0.022, 6), geoChunk = new THREE.BoxGeometry(0.12, 0.08, 0.1), geoShard = new THREE.PlaneGeometry(0.06, 0.09);
  F.init = function (sc) {
    scene = sc;
    flashLight = new THREE.PointLight('#ffc070', 0, 9, 2); scene.add(flashLight);
    shellMat = new THREE.MeshStandardMaterial({ color: '#c8a040', metalness: 0.9, roughness: 0.3 });
    bloodMat = new THREE.MeshBasicMaterial({ color: '#4a0000' }); bloodMat.color.convertSRGBToLinear();
    sparkMat = new THREE.SpriteMaterial({ map: NF.tex.spark(), color: '#ffd090', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    smokeMat = new THREE.SpriteMaterial({ map: NF.tex.smoke(), color: '#aaa', transparent: true, depthWrite: false, opacity: 0.4 });
    debrisMat = new THREE.MeshStandardMaterial({ color: '#6a5a4a', roughness: 1 });
    glassMat = new THREE.MeshBasicMaterial({ color: '#a8c8ff', transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  };
  function add(obj, vel, life, opts) {
    opts = opts || {};
    scene.add(obj);
    F.parts.push({ o: obj, v: vel, life: life, max: life, g: opts.g === undefined ? 9.8 : opts.g, spin: opts.spin, fade: opts.fade, grow: opts.grow, stick: opts.stick, bounce: opts.bounce, decal: opts.decal });
  }
  F.muzzle = function (pos, dir, big) {
    flashLight.position.copy(pos); flashLight.intensity = big ? 6 : 3.5; flashT = 0.06;
    var s = new THREE.Sprite(sparkMat.clone()); s.position.copy(pos); s.scale.setScalar(big ? 0.7 : 0.45); s.material.color.set('#ffcf7a');
    add(s, dir.clone().multiplyScalar(2), 0.05, { g: 0, fade: true });
    for (var i = 0; i < 3; i++) { var sm = new THREE.Sprite(smokeMat.clone()); sm.position.copy(pos); sm.scale.setScalar(0.15); add(sm, dir.clone().multiplyScalar(0.6).add(new THREE.Vector3((Math.random() - .5) * 0.3, 0.3, (Math.random() - .5) * 0.3)), 0.9, { g: -0.2, fade: true, grow: 0.8 }); }
  };
  F.shell = function (pos, right, shotgun) {
    var m = new THREE.Mesh(geoShell, shotgun ? new THREE.MeshStandardMaterial({ color: '#a01a10' }) : shellMat); m.position.copy(pos); if (shotgun) m.scale.set(2.2, 2.4, 2.2);
    add(m, right.clone().multiplyScalar(1.6 + Math.random()).add(new THREE.Vector3(0, 2 + Math.random(), 0)), 2.5, { spin: 20, bounce: true });
  };
  F.blood = function (pos, dir, n) {
    n = n || 10;
    for (var i = 0; i < n; i++) {
      var m = new THREE.Mesh(geoDrop, bloodMat); m.position.copy(pos); m.scale.setScalar(0.6 + Math.random() * 1.4);
      var v = dir.clone().multiplyScalar(1 + Math.random() * 2.5).add(new THREE.Vector3((Math.random() - .5) * 2, Math.random() * 2, (Math.random() - .5) * 2));
      add(m, v, 1.2, { decal: i < 2 });
    }
    var mist = new THREE.Sprite(smokeMat.clone()); mist.material.color.set('#7a0000'); mist.material.opacity = 0.7; mist.position.copy(pos); mist.scale.setScalar(0.2);
    add(mist, dir.clone().multiplyScalar(0.8), 0.35, { g: 0, fade: true, grow: 2 });
  };
  F.sparks = function (pos, normal) {
    for (var i = 0; i < 6; i++) { var s = new THREE.Sprite(sparkMat); s.position.copy(pos); s.scale.setScalar(0.05); add(s, normal.clone().multiplyScalar(2).add(new THREE.Vector3((Math.random() - .5) * 3, Math.random() * 2, (Math.random() - .5) * 3)), 0.25 + Math.random() * 0.2, {}); }
    var d = new THREE.Sprite(smokeMat.clone()); d.material.color.set('#8a7a6a'); d.position.copy(pos); d.scale.setScalar(0.1); add(d, normal.clone().multiplyScalar(0.4), 0.7, { g: 0, fade: true, grow: 0.8 });
  };
  F.debris = function (pos, n, spread) {
    for (var i = 0; i < n; i++) { var m = new THREE.Mesh(geoChunk, debrisMat); m.position.copy(pos).add(new THREE.Vector3(0, Math.random() * 2.5, (Math.random() - .5) * 2)); m.scale.setScalar(0.5 + Math.random() * 2); m.castShadow = true; add(m, new THREE.Vector3(2 + Math.random() * 5, Math.random() * 3, (Math.random() - .5) * 5).multiplyScalar(spread || 1), 5, { spin: 8, bounce: true }); }
    for (var k = 0; k < 8; k++) { var s = new THREE.Sprite(smokeMat.clone()); s.material.color.set('#7a6a5a'); s.position.copy(pos).add(new THREE.Vector3(0.5, Math.random() * 3, (Math.random() - .5) * 2)); s.scale.setScalar(0.6); add(s, new THREE.Vector3(1 + Math.random() * 2, 0.2, (Math.random() - .5)), 2.2, { g: 0, fade: true, grow: 1.4 }); }
  };
  F.glass = function (pos, dir) {
    for (var i = 0; i < 30; i++) { var m = new THREE.Mesh(geoShard, glassMat); m.position.copy(pos).add(new THREE.Vector3(0, (Math.random() - .5) * 1.6, (Math.random() - .5) * 1.2)); add(m, dir.clone().multiplyScalar(2 + Math.random() * 4).add(new THREE.Vector3(0, Math.random() * 2, (Math.random() - .5) * 3)), 2, { spin: 14, bounce: true }); }
  };
  F.shock = function (pos) {
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.5, 32), new THREE.MeshBasicMaterial({ color: '#d8c8a8', transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.copy(pos); ring.position.y = 0.05;
    add(ring, new THREE.Vector3(), 0.6, { g: 0, fade: true, grow: 9 });
    F.debris(pos, 6, 0.4);
  };
  var fireMat;
  F.explosion = function (pos, r) {
    flashLight.position.copy(pos); flashLight.intensity = 12; flashLight.distance = r * 6; flashT = 0.18;
    if (!fireMat) fireMat = new THREE.SpriteMaterial({ map: NF.tex.smoke(), color: '#ffa040', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    for (var i = 0; i < 16; i++) { var s = new THREE.Sprite(fireMat.clone()); s.material.color.set(i % 3 ? '#ff8a20' : '#ffd060'); s.position.copy(pos).add(new THREE.Vector3((Math.random() - .5) * r * 0.5, Math.random() * r * 0.3, (Math.random() - .5) * r * 0.5)); s.scale.setScalar(r * 0.4); add(s, new THREE.Vector3((Math.random() - .5) * 4, 2 + Math.random() * 3, (Math.random() - .5) * 4), 0.6 + Math.random() * 0.3, { g: 0, fade: true, grow: r * 1.2 }); }
    for (var k = 0; k < 10; k++) { var sm = new THREE.Sprite(smokeMat.clone()); sm.material.color.set('#2a2622'); sm.material.opacity = 0.7; sm.position.copy(pos); sm.scale.setScalar(r * 0.5); add(sm, new THREE.Vector3((Math.random() - .5) * 3, 1.5 + Math.random() * 2, (Math.random() - .5) * 3), 3 + Math.random() * 2, { g: -0.1, fade: true, grow: r * 0.6 }); }
    F.debris(pos, 8, 0.6); F.shock(pos);
  };
  F.puff = function (pos, col) { var s = new THREE.Sprite(smokeMat.clone()); s.material.color.set(col || '#888'); s.material.opacity = 0.5; s.position.copy(pos); s.scale.setScalar(0.15); add(s, new THREE.Vector3(0, 0.2, 0), 0.5, { g: 0, fade: true, grow: 0.6 }); };
  F.splat = function (pos, col) { for (var i = 0; i < 8; i++) { var m = new THREE.Mesh(geoDrop, new THREE.MeshBasicMaterial({ color: col })); m.position.copy(pos); add(m, new THREE.Vector3((Math.random() - .5) * 3, Math.random() * 2, (Math.random() - .5) * 3), 0.8, {}); } };
  F.feathers = function (pos) { for (var i = 0; i < 8; i++) { var m = new THREE.Mesh(geoShard, new THREE.MeshBasicMaterial({ color: '#111', side: THREE.DoubleSide })); m.scale.setScalar(0.6); m.position.copy(pos); add(m, new THREE.Vector3((Math.random() - .5) * 2, Math.random() * 1.5, (Math.random() - .5) * 2), 2, { g: 1.2, spin: 6 }); } };
  F.dirt = function (pos) { var s = new THREE.Sprite(smokeMat.clone()); s.material.color.set('#5a4a38'); s.material.opacity = 0.6; s.position.copy(pos); s.scale.setScalar(0.5); add(s, new THREE.Vector3((Math.random() - .5), 1 + Math.random(), (Math.random() - .5)), 1.2, { g: 0.5, fade: true, grow: 1.2 }); };
  F.flare = function (pos) { var s = new THREE.Sprite(sparkMat.clone()); s.material.color.set('#ff3020'); s.position.copy(pos); s.scale.setScalar(1.5); add(s, new THREE.Vector3(0, 22, 0), 2.5, { g: 4, fade: true }); flashLight.position.copy(pos); flashLight.color.set('#ff4030'); flashLight.intensity = 5; flashT = 1.2; setTimeout(function () { flashLight.color.set('#ffc070'); }, 1300); };
  F.update = function (dt) {
    if (flashT > 0) { flashT -= dt; if (flashT <= 0) { flashLight.intensity = 0; flashLight.distance = 9; } }
    for (var i = F.parts.length - 1; i >= 0; i--) {
      var p = F.parts[i]; p.life -= dt;
      if (p.life <= 0) { scene.remove(p.o); if (p.o.material && p.o.material !== bloodMat && p.o.material !== shellMat && p.o.material !== sparkMat && p.o.material !== debrisMat && p.o.material !== glassMat) p.o.material.dispose(); F.parts.splice(i, 1); continue; }
      if (!p.rest) {
        p.v.y -= p.g * dt; p.o.position.addScaledVector(p.v, dt);
        if (p.spin) { p.o.rotation.x += p.spin * dt; p.o.rotation.z += p.spin * 0.7 * dt; }
        if (p.o.position.y < 0.01 && p.g > 0) {
          p.o.position.y = 0.01;
          if (p.bounce && Math.abs(p.v.y) > 0.8) { p.v.y *= -0.35; p.v.x *= 0.5; p.v.z *= 0.5; if (p.spin) p.spin *= 0.5; }
          else { p.rest = true; if (p.decal) { NF.world.decals.push(NF.world.decal(p.o.position.x, p.o.position.z, 0.25 + Math.random() * 0.3, (Math.random() * 30 | 0) + 60)); p.life = 0; } }
        }
      }
      var k = p.life / p.max;
      if (p.fade && p.o.material) p.o.material.opacity = (p.o.material.userData.o0 || (p.o.material.userData.o0 = p.o.material.opacity)) * k;
      if (p.grow) { var s = p.o.scale.x + p.grow * dt; p.o.scale.set(s, s, s); }
    }
    // cap decal count
    while (NF.world.decals.length > 120) scene.remove(NF.world.decals.shift());
  };
  return F;
})();
