// Drivable pickup trucks: arcade handling over the terrain, headlights, ramming.
var NF = window.NF || (window.NF = {});
NF.vehicles = (function () {
  var Vh = { list: [] }, scene, V3 = THREE.Vector3;
  var SPOTS = [[8, 92, 0.2, '#6a2a22'], [432, 690, 3.1, '#2a3a4a'], [-880, 1180, 1.2, '#4a4a3a'], [1600, 470, -0.8, '#3a4a2a'], [1180, 1380, 2.2, '#5a5a52'], [-1580, -760, 0.5, '#6a5a3a'], [1300, -560, 2.6, '#2a2a2a'], [3570, 640, 1.6, '#7a6a3a'], [4800, 2985, 0, '#2a3a5a'], [6000, -1760, 1.2, '#d8d8d0'], [-1460, -4970, 0.3, '#4a5236'], [-2780, -1640, 2.8, '#5a2a22'], [-4600, 5040, 3.1, '#3a3a3a'], [1180, 6520, 0.4, '#8a2a1a'], [2600, -5850, 3.0, '#2a2a2a'], [-5550, -2880, 1.0, '#4a4030'], [-6330, 1580, -1.5, '#3a4a5a'], [-2420, 6940, 1.6, '#6a5a2a'], [5000, -4880, 0.8, '#5a5a52'], [3650, 4900, 2.4, '#2a4a3a']];
  function build(col) {
    var std = NF.models.std, g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    var paint = std({ color: col, metalness: 0.5, roughness: 0.45, map: NF.tex.metal() }), dark = std({ color: '#141414', roughness: 0.8 }), chrome = std({ color: '#aaa', metalness: 0.95, roughness: 0.2 });
    function bx(w, h, d, x, y, z, m) { var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; body.add(b); return b; }
    bx(2.0, 0.55, 5.0, 0, 0.75, 0, paint); bx(1.9, 0.75, 1.8, 0, 1.4, 0.4, paint); bx(1.85, 0.6, 1.7, 0, 1.42, 0.42, NF.terrain.mats.window).scale.set(1.03, 0.9, 1.03);
    bx(2.0, 0.5, 2.1, 0, 1.15, -1.45, paint); bx(1.8, 0.1, 2.0, 0, 0.92, -1.45, dark);
    bx(2.05, 0.18, 0.2, 0, 0.6, 2.55, chrome); bx(2.05, 0.18, 0.2, 0, 0.6, -2.55, chrome);
    var lightM = std({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 2 }), tail = std({ color: '#600', emissive: '#ff1010', emissiveIntensity: 1 });
    bx(0.3, 0.16, 0.05, 0.7, 0.85, 2.51, lightM); bx(0.3, 0.16, 0.05, -0.7, 0.85, 2.51, lightM); bx(0.25, 0.14, 0.05, 0.8, 0.9, -2.51, tail); bx(0.25, 0.14, 0.05, -0.8, 0.9, -2.51, tail);
    var wheels = [], wm = std({ color: '#111', roughness: 0.9 }), hub = std({ color: '#777', metalness: 0.8 });
    [[0.95, 1.55], [-0.95, 1.55], [0.95, -1.55], [-0.95, -1.55]].forEach(function (p) { var w = new THREE.Group(); w.position.set(p[0], 0.42, p[1]); var t = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), wm); t.rotation.z = Math.PI / 2; w.add(t); var h = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8), hub); h.rotation.z = Math.PI / 2; w.add(h); w.castShadow = true; g.add(w); wheels.push(w); });
    return { g: g, body: body, wheels: wheels };
  }
  Vh.init = function (sc) {
    scene = sc;
    SPOTS.forEach(function (s, i) { var m = build(s[3]); var v = { id: 'truck' + i, m: m, pos: new V3(s[0], 0, s[1]), yaw: s[2], speed: 0, steer: 0, hp: 300, pitch: 0, roll: 0, vy: 0 }; scene.add(m.g); Vh.list.push(v); });
    var lamp = new THREE.SpotLight('#fff4d8', 0, 45, 0.5, 0.5, 1.2); scene.add(lamp); scene.add(lamp.target); Vh.lamp = lamp;
  };
  Vh.nearest = function (p, r) { var best = null, bd = r || 3.5; Vh.list.forEach(function (v) { if (v.hp <= 0) return; var d = Math.hypot(v.pos.x - p.x, v.pos.z - p.z); if (d < bd) { bd = d; best = v; } }); return best; };
  function ground(x, z) { return NF.world.ground(x, z); }
  Vh.update = function (dt, drive, input) {
    Vh.list.forEach(function (v) {
      var driving = drive === v;
      if (driving) {
        var thr = (input.w ? 1 : 0) - (input.s ? 1 : 0), st = (input.a ? 1 : 0) - (input.d ? 1 : 0);
        var maxF = input.shift ? 26 : 19;
        if (thr > 0) v.speed += (v.speed < 0 ? 18 : 8) * dt; else if (thr < 0) v.speed -= (v.speed > 0 ? 18 : 6) * dt; else v.speed *= Math.exp(-dt * 0.6);
        if (input[' ']) v.speed *= Math.exp(-dt * 4);
        v.speed = Math.max(-8, Math.min(maxF, v.speed));
        v.steer += (st * 0.55 - v.steer) * Math.min(1, dt * 6);
        NF.audio.engine(Math.min(1, Math.abs(v.speed) / 20) + 0.15, true);
      } else { v.speed *= Math.exp(-dt * 1.5); v.steer *= 0.9; }
      if (Math.abs(v.speed) < 0.01 && !driving) return place(v);
      v.yaw += v.steer * v.speed * dt * 0.22;
      var fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
      var ox = v.pos.x, oz = v.pos.z;
      v.pos.x += fx * v.speed * dt; v.pos.z += fz * v.speed * dt;
      var before = v.pos.clone(); v.pos.y = ground(v.pos.x, v.pos.z);
      // two collision circles along the body
      [1.4, -1.4].forEach(function (o) { var c = new V3(v.pos.x + fx * o, v.pos.y, v.pos.z + fz * o); var c0 = c.clone(); NF.world.collide(c, 1.15, 0.4); v.pos.x += c.x - c0.x; v.pos.z += c.z - c0.z; });
      var push = Math.hypot(v.pos.x - before.x, v.pos.z - before.z);
      if (push > 0.02 && Math.abs(v.speed) > 6) { NF.audio.thud(v.pos, 1.2); NF.game.shake(0.4); v.hp -= Math.abs(v.speed) * 1.5; }
      if (push > 0.02) v.speed *= 0.6;
      if (NF.terrain.inWater && NF.terrain.inWater(v.pos.x, v.pos.z)) { v.speed *= Math.exp(-dt * 3); }
      // ram the infected
      if (Math.abs(v.speed) > 3) NF.enemies.list.forEach(function (e) {
        if (e.dead || e.state === 'dormant' || e.flying) return; var d = Math.hypot(e.pos.x - v.pos.x, e.pos.z - v.pos.z); if (d > 2.4) return;
        var dir = new V3(fx, 0.3, fz); NF.enemies.damage(e, Math.abs(v.speed) * (e.type === 'unbound' || e.type === 'butcher' ? 2 : 9), 'body', e.pos.clone().setY(e.pos.y + 1), dir, 'vehicle');
        if (!e.dead && e.type === 'zombie') { e.state = 'down'; e.t = 0; }
        e.pos.x += fx * 1.5; e.pos.z += fz * 1.5; v.speed *= 0.8; v.hp -= 4; NF.audio.impact(e.pos, true);
      });
      place(v);
      if (v.hp <= 0) { NF.creatures.explode(v.pos.clone().setY(v.pos.y + 1), 6, 120, true); v.m.g.visible = false; if (driving) NF.game.exitVehicle(true); }
    });
  };
  function place(v) {
    var fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), rx = Math.cos(v.yaw), rz = -Math.sin(v.yaw);
    var hf = ground(v.pos.x + fx * 1.6, v.pos.z + fz * 1.6), hb = ground(v.pos.x - fx * 1.6, v.pos.z - fz * 1.6), hl = ground(v.pos.x + rx * 0.9, v.pos.z + rz * 0.9), hr = ground(v.pos.x - rx * 0.9, v.pos.z - rz * 0.9);
    v.pos.y = (hf + hb + hl + hr) / 4;
    v.pitch += (Math.atan2(hb - hf, 3.2) - v.pitch) * 0.3; v.roll += (Math.atan2(hl - hr, 1.8) - v.roll) * 0.3;
    var g = v.m.g; g.position.copy(v.pos); g.rotation.order = 'YXZ'; g.rotation.set(v.pitch, v.yaw, v.roll);
    v.m.wheels.forEach(function (w, i) { w.children[0].rotation.x += v.speed * 0.04; if (i < 2) w.rotation.y = v.steer; });
  }
  Vh.lights = function (v, on) {
    var L = Vh.lamp; if (!on || !v) { L.intensity = 0; return; }
    var fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
    L.intensity = 3; L.position.set(v.pos.x + fx * 2.6, v.pos.y + 1.0, v.pos.z + fz * 2.6); L.target.position.set(v.pos.x + fx * 20, v.pos.y - 1, v.pos.z + fz * 20);
  };
  Vh.state = function () { return Vh.list.map(function (v) { return [v.pos.x, v.pos.z, v.yaw, v.hp]; }); };
  Vh.restore = function (s) { if (!s) return; s.forEach(function (d, i) { var v = Vh.list[i]; if (!v) return; v.pos.set(d[0], 0, d[1]); v.yaw = d[2]; v.hp = d[3]; v.m.g.visible = v.hp > 0; }); };
  return Vh;
})();
