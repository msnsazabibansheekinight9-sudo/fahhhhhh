// Builders for every kind of structure placed in the open world.
var NF = window.NF || (window.NF = {});
NF.structures = (function () {
  var S = {}, V3 = THREE.Vector3;
  function T() { return NF.terrain; }
  function M() { return NF.terrain.mats; }
  function std(o) { return NF.models.std(o); }
  var chain;
  function chainMat() {
    if (chain) return chain;
    var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'); g.strokeStyle = 'rgba(160,160,150,0.9)'; g.lineWidth = 2;
    for (var i = -64; i < 128; i += 12) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke(); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    chain = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 });
    return chain;
  }
  function fence(c, x0, z0, x1, z1, h, gap) { // straight chain-link fence with optional gap {at,w}
    var b = T().B(c), len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    var pieces = gap ? [[0, gap.at - gap.w / 2], [gap.at + gap.w / 2, len]] : [[0, len]];
    pieces.forEach(function (p) {
      var a = p[0], e = p[1], L = e - a; if (L <= 0.1) return;
      for (var t = a; t <= e; t += 6) { var px = x0 + ux * t, pz = z0 + uz * t, y = T().hExact(px, pz); b.box(px, y - 0.5, pz, 0.12, h + 0.5, 0.12, M().rust, false); }
      for (var s2 = a; s2 < e; s2 += 12) {
        var sl = Math.min(12, e - s2), mx = x0 + ux * (s2 + sl / 2), mz = z0 + uz * (s2 + sl / 2), y2 = T().hExact(mx, mz);
        var m = new THREE.Mesh(new THREE.PlaneGeometry(sl, h), chainMat()); m.material.map.repeat.set(sl / 0.8, h / 0.8);
        m.position.set(mx, y2 + h / 2, mz); m.rotation.y = Math.atan2(-uz, ux); c.group.add(m);
      }
      var ax = x0 + ux * a, az = z0 + uz * a, ex = x0 + ux * e, ez = z0 + uz * e;
      b.col(Math.min(ax, ex) - 0.15, Math.max(ax, ex) + 0.15, Math.min(az, ez) - 0.15, Math.max(az, ez) + 0.15, -50, 400);
    });
  }
  S.fence = fence;
  function fire(c, x, y, z, s) {
    var b = T().B(c);
    for (var i = 0; i < 4; i++) { var l = b.mesh(new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 1.1 * s, 6), M().darkwood, x, y + 0.08 * s, z, 0, i * 0.8, Math.PI / 2); }
    var flames = [];
    for (var f = 0; f < 5; f++) { var fm = new THREE.Mesh(new THREE.ConeGeometry(0.25 * s, 0.9 * s, 6), new THREE.MeshBasicMaterial({ color: f % 2 ? '#ff7a20' : '#ffc040', transparent: true, opacity: 0.85 })); fm.position.set(x + (Math.random() - .5) * 0.4 * s, y + 0.4 * s, z + (Math.random() - .5) * 0.4 * s); c.group.add(fm); flames.push(fm); }
    var anim = function (t) { flames.forEach(function (fm, i) { fm.scale.set(1, 0.6 + 0.6 * Math.abs(Math.sin(t * 8 + i * 2)), 1); }); };
    NF.world.anims.push(anim); (c.extra || (c.extra = [])).push(function () { var i = NF.world.anims.indexOf(anim); if (i >= 0) NF.world.anims.splice(i, 1); });
  }
  function car(c, o) {
    var y = T().hExact(o.x, o.z), g = new THREE.Group(); g.position.set(o.x, y, o.z); g.rotation.y = o.rot || 0;
    var cols = ['#5a2a22', '#2a3a4a', '#4a4a3a', '#6a6a62', '#2a2a2a', '#3a4a2a', '#7a6a4a'];
    var paint = std({ color: o.color || cols[Math.abs(Math.round(o.x * 7 + o.z)) % cols.length], metalness: 0.4, roughness: 0.6, map: NF.tex.metal() });
    function bx(w, h, d, x, yy, z, m) { var mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mm.position.set(x, yy, z); mm.castShadow = true; mm.receiveShadow = true; g.add(mm); return mm; }
    bx(1.8, 0.6, 4.3, 0, 0.55, 0, paint); bx(1.6, 0.55, 2.0, 0, 1.12, -0.2, paint);
    bx(1.62, 0.42, 1.9, 0, 1.12, -0.2, M().window).scale.set(1.01, 0.8, 1.01);
    var wm = std({ color: '#111', roughness: 0.9 });
    [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]].forEach(function (w) { var wh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 12), wm); wh.rotation.z = Math.PI / 2; wh.position.set(w[0], 0.34, w[1]); g.add(wh); });
    c.group.add(g);
    var ca = Math.abs(Math.cos(o.rot || 0)), sa = Math.abs(Math.sin(o.rot || 0)), hw = 0.9 * ca + 2.15 * sa, hd = 0.9 * sa + 2.15 * ca;
    T().B(c).col(o.x - hw, o.x + hw, o.z - hd, o.z + hd, y, y + 1.5);
  }
  function shack(c, o) {
    var bd = T().building(c, { id: o.id, x: o.x, z: o.z, w: 8, d: 7, face: 0, h: 3, style: 'old', tint: '#6a5a48', safe: true, name: o.name, empty: true, lit: true });
    var b = T().B(c), y = bd.y;
    // typewriter desk
    b.box(o.x + 2.6, y, o.z + 2.4, 1.6, 0.8, 0.8, M().darkwood, true);
    var tw = b.box(o.x + 2.6, y + 0.8, o.z + 2.4, 0.42, 0.15, 0.3, std({ color: '#151515', metalness: 0.5 }), false);
    var glow = b.mesh(new THREE.SphereGeometry(0.05, 8, 6), std({ color: '#3cff7a', emissive: '#3cff7a', emissiveIntensity: 2 }), o.x + 2.1, y + 0.95, o.z + 2.1);
    b.spot({ id: 'tw_' + o.id, x: o.x + 2.6, z: o.z + 1.6, r: 1.6, prompt: 'Use typewriter (save)', fn: function () { NF.game.save(); }, y: 0.9 });
    // item box
    b.box(o.x + 3.2, y, o.z - 1.8, 1.0, 0.7, 0.7, NF.terrain.mats.rust, true);
    b.spot({ id: 'box_' + o.id, x: o.x + 2.5, z: o.z - 1.8, r: 1.5, prompt: 'Open item box', fn: function () { NF.game.openStash(); }, y: 0.8 });
    // the peddler
    var pd = NF.models.peddler(); pd.root.position.set(o.x - 2.4, y, o.z + 2.0); pd.root.rotation.y = Math.PI * 0.85; c.group.add(pd.root);
    var anim = function (t) { var p = NF.anim.idle(t, 2); p.shR = [-0.6, 0, 0.3]; p.elR = [-1.2, 0, 0]; p.head = [0.05, 0.2 * Math.sin(t * 0.5), 0]; NF.anim.apply(pd, p, 0.2); };
    NF.world.anims.push(anim); (c.extra || (c.extra = [])).push(function () { var i = NF.world.anims.indexOf(anim); if (i >= 0) NF.world.anims.splice(i, 1); });
    b.spot({ id: 'trade_' + o.id, x: o.x - 2.0, z: o.z + 1.2, r: 1.8, prompt: 'Trade with the Peddler', fn: function () { NF.game.openShop(); }, y: 1.2 });
    var lantern = b.mesh(new THREE.SphereGeometry(0.1, 8, 6), M().lamp, o.x - 1.8, y + 1.6, o.z + 2.4);
    NF.terrain.lamps.push({ x: o.x, y: 2.4, z: o.z, c: '#ffc070', i: 1.1, chunk: c.k });
  }
  S.build = function (c, o) {
    var t = T(), b = t.B(c), m = M(), y;
    switch (o.kind) {
      case 'house': t.building(c, o); break;
      case 'shack': shack(c, o); break;
      case 'police': {
        var bd = t.building(c, { id: 'police', x: o.x, z: o.z, w: o.w, d: o.d, face: 3, h: o.h, style: 'brick', sign: 'POLICE', doorW: 2.4, empty: true, lit: true, safe: true, name: 'Halverson Falls Police' });
        y = bd.y;
        b.box(o.x + 6, y, o.z + 6.5, 4, 0.95, 1.2, m.darkwood, true); b.box(o.x - 6, y, o.z + 7, 4, 0.95, 1.2, m.darkwood, true); b.box(o.x + 2, y, o.z + 4, 2.4, 0.95, 1.2, m.darkwood, true);
        for (var lk = 0; lk < 6; lk++) b.box(o.x + 10.4, y, o.z - 6 + lk * 0.7, 0.55, 2.0, 0.65, std({ color: '#4a5a52', metalness: 0.6, map: NF.tex.metal() }), true);
        for (var cl = 0; cl < 3; cl++) { b.box(o.x - 4 + cl * 3.5, y, o.z - 6.6, 0.1, 3, 2.6, m.rust, true); }
        var tw = b.box(o.x + 2, y + 0.95, o.z + 4, 0.42, 0.15, 0.3, std({ color: '#151515', metalness: 0.5 }), false);
        b.spot({ id: 'tw_police', x: o.x + 2, z: o.z + 3.2, r: 1.6, prompt: 'Use typewriter (save)', fn: function () { NF.game.save(); }, y: 1 });
        b.spot({ id: 'armory_police', x: o.x + 9.6, z: o.z - 4.5, r: 1.8, prompt: 'Open the armory locker', fn: function () { NF.game.event('armory'); }, y: 1 });
        b.spot({ id: 'radio_police', x: o.x + 6, z: o.z + 5.6, r: 1.6, prompt: 'Use the station radio', fn: function () { NF.game.event('policeRadio'); }, y: 1 });
        b.box(o.x + 3.5, y, o.z - 1.8, 1.0, 0.7, 0.7, m.rust, true); b.spot({ id: 'box_police', x: o.x + 2.8, z: o.z - 1.8, r: 1.5, prompt: 'Open item box', fn: function () { NF.game.openStash(); }, y: 0.8 });
        var pd = NF.models.peddler(); pd.root.position.set(o.x - 7, y, o.z + 5.5); pd.root.rotation.y = Math.PI; c.group.add(pd.root);
        b.spot({ id: 'trade_police', x: o.x - 7, z: o.z + 4.6, r: 1.8, prompt: 'Trade with the Peddler', fn: function () { NF.game.openShop(); }, y: 1.2 });
        var car1 = { x: o.x - 18, z: o.z - 4, rot: 0.1 }; car(c, car1);
        break;
      }
      case 'watertower': {
        y = t.hExact(o.x, o.z);
        [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(function (l) { b.box(o.x + l[0], y, o.z + l[1], 0.4, 16, 0.4, m.rust, true); });
        var tank = b.mesh(new THREE.CylinderGeometry(5, 5, 6, 20), m.rust, o.x, y + 19, o.z);
        b.mesh(new THREE.ConeGeometry(5.3, 2.4, 20), m.rust, o.x, y + 23.2, o.z);
        var sg = b.mesh(new THREE.PlaneGeometry(8, 1.6), std({ map: t.signTex('HALVERSON FALLS', '#6a5a4a', '#e8e0d0', 1024), roughness: 0.8 }), o.x, y + 19, o.z - 5.05, 0, Math.PI, 0);
        break;
      }
      case 'fountain': { y = t.hExact(o.x, o.z); b.mesh(new THREE.CylinderGeometry(4, 4.2, 0.8, 24), m.stone, o.x, y + 0.4, o.z); b.mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.5, 10), m.stone, o.x, y + 1.25, o.z); b.mesh(new THREE.CircleGeometry(3.8, 24), m.water, o.x, y + 0.7, o.z, -Math.PI / 2); b.col(o.x - 4, o.x + 4, o.z - 4, o.z + 4, y, y + 0.8); break; }
      case 'streetlamp': { y = t.hExact(o.x, o.z); b.box(o.x, y, o.z, 0.15, 5, 0.15, m.metal, true); b.box(o.x - 0.5, y + 4.9, o.z, 1.1, 0.12, 0.12, m.metal); b.mesh(new THREE.SphereGeometry(0.22, 10, 8), m.lamp, o.x - 1.0, y + 4.75, o.z); break; }
      case 'car': car(c, o); break;
      case 'pole': { y = t.hExact(o.x, o.z); b.box(o.x, y, o.z, 0.25, 9, 0.25, m.darkwood, true); b.box(o.x, y + 8.2, o.z, 2.4, 0.15, 0.15, m.darkwood); break; }
      case 'gas': {
        y = t.hExact(o.x, o.z);
        b.box(o.x, y + 4.6, o.z, 14, 0.5, 9, std({ color: '#c8c4b8', roughness: 0.6 }));
        b.mesh(new THREE.PlaneGeometry(13, 8), m.lamp, o.x, y + 4.58, o.z, Math.PI / 2).material = std({ color: '#e8f0ff', emissive: '#c8d8ff', emissiveIntensity: 0.5 });
        [[-5, -3], [5, -3], [-5, 3], [5, 3]].forEach(function (p) { b.box(o.x + p[0], y, o.z + p[1], 0.4, 4.6, 0.4, m.metal, true); });
        [-2.5, 2.5].forEach(function (px) { b.box(o.x + px, y, o.z, 0.8, 1.6, 0.6, std({ color: '#a82a22', roughness: 0.5 }), true); });
        t.building(c, { id: o.id + 'shop', x: o.x, z: o.z + 14, w: 12, d: 8, face: 0, h: 3.6, style: 'concrete', sign: o.id === 'gas1' ? 'ROUTE 9 DINER' : 'PIKE GAS', lit: true, flatRoof: true });
        car(c, { x: o.x + 2.5, z: o.z - 1, rot: 0.2 });
        break;
      }
      case 'relay': {
        y = t.hExact(o.x, o.z);
        for (var lv = 0; lv < 10; lv++) { var s = 3.2 - lv * 0.26, yy = y + lv * 3.4; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { b.box(o.x + q[0] * s / 2, yy, o.z + q[1] * s / 2, 0.14, 3.4, 0.14, m.rust); }); b.box(o.x, yy + 3.3, o.z, s, 0.1, 0.1, m.rust); b.box(o.x, yy + 3.3, o.z, 0.1, 0.1, s, m.rust); }
        b.col(o.x - 1.7, o.x + 1.7, o.z - 1.7, o.z + 1.7, y, y + 34);
        var beacon = b.mesh(new THREE.SphereGeometry(0.4, 12, 10), std({ color: '#400', emissive: '#300', emissiveIntensity: 1 }), o.x, y + 34.6, o.z);
        S.beacon = beacon;
        var bl = function (tt) { var on = NF.game.flag('beacon'); beacon.material.emissive.set(on && Math.sin(tt * 4) > 0 ? '#ff2020' : '#200000'); };
        NF.world.anims.push(bl); (c.extra || (c.extra = [])).push(function () { var i = NF.world.anims.indexOf(bl); if (i >= 0) NF.world.anims.splice(i, 1); });
        b.box(o.x + 8, y, o.z - 4, 3.2, 1.8, 2, std({ color: '#4a5a3a', metalness: 0.5, map: NF.tex.metal() }), true);
        b.spot({ id: 'generator', x: o.x + 8, z: o.z - 2.4, r: 2.2, prompt: 'Examine the beacon generator', fn: function () { NF.game.event('generator'); }, y: 1 });
        fence(c, o.x - 18, o.z - 18, o.x + 18, o.z - 18, 3, { at: 18, w: 5 }); fence(c, o.x - 18, o.z + 18, o.x + 18, o.z + 18, 3); fence(c, o.x - 18, o.z - 18, o.x - 18, o.z + 18, 3); fence(c, o.x + 18, o.z - 18, o.x + 18, o.z + 18, 3);
        break;
      }
      case 'church': {
        var cb = t.building(c, { id: 'church', x: o.x, z: o.z, w: 13, d: 28, face: 0, h: 8, style: 'concrete', doorW: 2.6, doorH: 3.4, empty: true, name: 'St. Agnes Church', lit: true });
        y = cb.y;
        b.box(o.x, y, o.z - 16, 5, 16, 5, m.stone, true);
        b.mesh(new THREE.ConeGeometry(3.6, 9, 4), m.shingle, o.x, y + 20.5, o.z - 16, 0, Math.PI / 4, 0);
        b.box(o.x, y + 25, o.z - 16, 0.25, 3, 0.25, m.metal); b.box(o.x, y + 26.3, o.z - 16, 1.4, 0.22, 0.22, m.metal);
        b.box(o.x, y, o.z - 13.85, 3.6, 3.6, 0.3, m.stone, false);
        // keep the tower base open as a porch: move door through it
        for (var pw = 0; pw < 7; pw++) { b.box(o.x - 3.2, y, o.z - 9 + pw * 3, 4.2, 0.9, 0.6, m.darkwood, true); b.box(o.x + 3.2, y, o.z - 9 + pw * 3, 4.2, 0.9, 0.6, m.darkwood, true); }
        b.box(o.x, y, o.z + 12, 4, 1.1, 1.6, m.stone, true);
        for (var cd = 0; cd < 6; cd++) b.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), std({ color: '#eee' }), o.x - 1.5 + cd * 0.6, y + 1.3, o.z + 12);
        var glass = std({ color: '#5a2a6a', emissive: '#6a3a20', emissiveIntensity: 0.6 });
        for (var gw = 0; gw < 4; gw++) { b.mesh(new THREE.PlaneGeometry(1.2, 3), glass, o.x - 6.63, y + 4, o.z - 8 + gw * 6, 0, -Math.PI / 2, 0); b.mesh(new THREE.PlaneGeometry(1.2, 3), glass, o.x + 6.63, y + 4, o.z - 8 + gw * 6, 0, Math.PI / 2, 0); }
        break;
      }
      case 'grave': { y = t.hExact(o.x, o.z); var gm = b.mesh(new THREE.BoxGeometry(0.6, 0.9, 0.15), m.stone, o.x, y + 0.4, o.z, 0, 0, (Math.random() - .5) * 0.2); break; }
      case 'airfield': {
        y = t.poi('airfield').h;
        b.box(o.x + 60, y - 0.4, o.z, 36, 0.45, 460, m.asphalt, false);
        for (var st = -220; st < 220; st += 20) b.box(o.x + 60, y + 0.06, o.z + st, 0.6, 0.02, 8, std({ color: '#d8d0b0', emissive: '#222' }), false);
        var hg = t.building(c, { id: 'hangar', x: o.x - 40, z: o.z + 20, w: 36, d: 28, face: 1, h: 11, style: 'concrete', doorW: 20, doorH: 9, empty: true, flatRoof: true, name: 'Hangar 2' });
        b.box(o.x - 60, y, o.z - 90, 6, 14, 6, m.concrete, true); b.box(o.x - 60, y + 14, o.z - 90, 8, 3.2, 8, std({ color: '#2a3a48', emissive: '#203040', emissiveIntensity: 0.5, metalness: 0.5 }), false);
        var pad = b.mesh(new THREE.CircleGeometry(9, 32), std({ color: '#3a3a3a', roughness: 0.8 }), o.x - 80, y + 0.05, o.z + 120, -Math.PI / 2);
        b.mesh(new THREE.PlaneGeometry(6, 8), std({ map: t.signTex('H', '#3a3a3a', '#e8e0c0', 128), transparent: false }), o.x - 80, y + 0.07, o.z + 120, -Math.PI / 2);
        for (var ft = 0; ft < 3; ft++) b.mesh(new THREE.CylinderGeometry(3, 3, 8, 16), std({ color: '#c8c4b8', metalness: 0.5, map: NF.tex.metal() }), o.x - 140 + ft * 9, y + 4, o.z - 140);
        b.col(o.x - 154, o.x - 113, o.z - 143, o.z - 137, y, y + 8);
        // plane wreck
        b.mesh(new THREE.CylinderGeometry(1.2, 0.6, 12, 12), std({ color: '#d8d8d0', metalness: 0.4, map: NF.tex.metal() }), o.x + 20, y + 1.2, o.z - 60, Math.PI / 2, 0.4, 0);
        b.box(o.x + 20, y + 1.0, o.z - 60, 16, 0.2, 2.5, std({ color: '#d8d8d0', metalness: 0.4 }), false); b.col(o.x + 12, o.x + 28, o.z - 64, o.z - 56, y, y + 2.4);
        var A = t.poi('airfield'), fx0 = A.x - 250, fx1 = A.x + 250, fz0 = A.z - 250, fz1 = A.z + 250;
        S.afFence = function (cc) { fence(cc, fx0, fz0, fx1, fz0, 3.5, { at: 2030 - fx0, w: 8 }); };
        break;
      }
      case 'belltower': { y = t.hExact(o.x, o.z); [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(function (q) { b.box(o.x + q[0], y, o.z + q[1], 0.35, 9, 0.35, m.darkwood, true); }); b.box(o.x, y + 9, o.z, 4, 0.3, 4, m.darkwood); b.mesh(new THREE.ConeGeometry(3.2, 2.5, 4), m.shingle, o.x, y + 10.6, o.z, 0, Math.PI / 4, 0); b.mesh(new THREE.CylinderGeometry(0.3, 0.6, 0.9, 12, 1, true), std({ color: '#8a7a50', metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }), o.x, y + 8.2, o.z); break; }
      case 'bonfire': y = t.hExact(o.x, o.z); fire(c, o.x, y, o.z, 2.4); b.col(o.x - 1.4, o.x + 1.4, o.z - 1.4, o.z + 1.4, y, y + 2); break;
      case 'campfire': { y = t.hExact(o.x, o.z); fire(c, o.x, y, o.z, 0.9); for (var lg = 0; lg < 3; lg++) b.mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.6, 8), m.darkwood, o.x + Math.cos(lg * 2.1) * 2.2, y + 0.2, o.z + Math.sin(lg * 2.1) * 2.2, 0, -lg * 2.1, Math.PI / 2); b.mesh(new THREE.ConeGeometry(1.6, 2, 4), m.cloth, o.x + 3.5, y + 1, o.z - 2, 0, 0.6, 0); b.col(o.x + 2.4, o.x + 4.6, o.z - 3.1, o.z - 0.9, y, y + 2); break; }
      case 'stand': { y = t.hExact(o.x, o.z); [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(function (q) { b.box(o.x + q[0], y, o.z + q[1], 0.12, 4, 0.12, m.darkwood, false); }); b.box(o.x, y + 4, o.z, 2, 0.12, 2, m.darkwood); b.box(o.x, y + 4.1, o.z - 0.95, 2, 0.9, 0.08, m.darkwood); b.col(o.x - 1, o.x + 1, o.z - 1, o.z + 1, y, y + 4); break; }
      case 'crash': { y = t.hExact(o.x, o.z); var burnt = std({ color: '#2a2622', metalness: 0.4, roughness: 0.8, map: NF.tex.metal() }); b.mesh(new THREE.CylinderGeometry(1.0, 0.5, 9, 10), burnt, o.x, y + 0.9, o.z, Math.PI / 2 - 0.15, o.rot, 0.3); b.mesh(new THREE.BoxGeometry(11, 0.15, 2), burnt, o.x, y + 0.5, o.z, 0, o.rot, 0.25); b.col(o.x - 3, o.x + 3, o.z - 3, o.z + 3, y, y + 2); fire(c, o.x + 1, y + 0.3, o.z, 0.6); break; }
      case 'ruin': { y = t.hExact(o.x, o.z); for (var rw = 0; rw < 4; rw++) { var ang = rw * Math.PI / 2, h = 1 + Math.random() * 2.6; b.box(o.x + Math.cos(ang) * 4, y - 0.3, o.z + Math.sin(ang) * 4, rw % 2 ? 0.5 : 8, h, rw % 2 ? 8 : 0.5, m.stone, true); } break; }
      case 'farm': {
        var by = t.building(c, { id: o.id + 'barn', x: o.x + 18, z: o.z, w: 16, d: 12, face: 3, h: 6, style: 'siding', tint: '#7a2a20', doorW: 4, doorH: 4, empty: true, name: 'Barn' });
        b.box(o.x + 22, by.y, o.z + 3, 3, 1.2, 2, std({ color: '#c8b060', roughness: 1 }), true); b.box(o.x + 22, by.y, o.z - 3, 3, 1.2, 2, std({ color: '#c8b060', roughness: 1 }), true);
        t.building(c, { id: o.id + 'house', x: o.x - 14, z: o.z - 6, w: 11, d: 9, face: 1, h: 3.2, style: 'siding', tint: '#d8d0c0', name: 'Farmhouse' });
        y = t.hExact(o.x + 30, o.z + 14); b.mesh(new THREE.CylinderGeometry(3, 3, 14, 18), m.rust, o.x + 30, y + 7, o.z + 14); b.mesh(new THREE.SphereGeometry(3, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.rust, o.x + 30, y + 14, o.z + 14); b.col(o.x + 27, o.x + 33, o.z + 11, o.z + 17, y, y + 14);
        for (var sc = 0; sc < 4; sc++) { var sx = o.x - 30 + sc * 14, sz = o.z + 34; y = t.hExact(sx, sz); b.box(sx, y, sz, 0.15, 2.4, 0.15, m.darkwood); b.box(sx, y + 1.9, sz, 1.6, 0.12, 0.12, m.darkwood); b.mesh(new THREE.SphereGeometry(0.22, 8, 6), std({ color: '#b8a070', roughness: 1 }), sx, y + 2.5, sz); b.mesh(new THREE.ConeGeometry(0.4, 0.4, 8), std({ color: '#3a2a1a' }), sx, y + 2.8, sz); }
        break;
      }
      case 'camp': { y = t.hExact(o.x, o.z); fire(c, o.x, y, o.z, 1); for (var tn = 0; tn < 5; tn++) { var a = tn * 1.25, tx = o.x + Math.cos(a) * 12, tz = o.z + Math.sin(a) * 12, ty = t.hExact(tx, tz); b.mesh(new THREE.ConeGeometry(1.8, 2.2, 4), std({ color: ['#3a5a3a', '#6a3a2a', '#3a4a6a'][tn % 3], roughness: 1, side: THREE.DoubleSide }), tx, ty + 1.1, tz, 0, a, 0); b.col(tx - 1.3, tx + 1.3, tz - 1.3, tz + 1.3, ty, ty + 2); } car(c, { x: o.x + 20, z: o.z - 8, rot: 1.2 }); car(c, { x: o.x - 18, z: o.z + 10, rot: 2.6 }); t.building(c, { id: 'campoffice', x: o.x - 30, z: o.z - 25, w: 8, d: 6, face: 1, h: 3, style: 'old', name: 'Camp Office' }); break; }
      case 'quarry': { y = t.hExact(o.x + 70, o.z + 70); t.building(c, { id: 'quarryoffice', x: o.x + 55, z: o.z + 75, w: 9, d: 7, face: 3, h: 3, style: 'old', tint: '#6a6050', name: 'Quarry Office' }); for (var cv = 0; cv < 6; cv++) b.box(o.x + 30 + cv * 4, t.hExact(o.x + 30 + cv * 4, o.z + 30) + cv * 1.6, o.z + 30, 4.2, 0.4, 1.2, m.rust); car(c, { x: o.x + 75, z: o.z + 50, rot: 0.6 }); break; }
      case 'bunker': { var bk = t.building(c, { id: 'fieldlab', x: o.x, z: o.z, w: 14, d: 10, face: 0, h: 3.4, style: 'concrete', flatRoof: true, empty: true, name: 'Velgen Field Station', sign: 'VELGEN' }); b.box(o.x - 4, bk.y, o.z + 3, 3, 0.9, 1.2, m.metal, true); b.box(o.x + 3, bk.y, o.z + 2, 2.2, 0.9, 1.2, m.metal, true); b.box(o.x + 3, bk.y, o.z - 2, 2.2, 0.9, 1.2, m.metal, true); b.spot({ id: 'fieldterminal', x: o.x - 4, z: o.z + 2.2, r: 1.8, prompt: 'Use the Velgen terminal', fn: function () { NF.game.event('override'); }, y: 1 }); for (var tk = 0; tk < 3; tk++) b.mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 14, 1, true), std({ color: '#2a8a5a', emissive: '#0a5a2a', transparent: true, opacity: 0.6 }), o.x - 5 + tk * 1.6, bk.y + 1.1, o.z - 3.5); fence(c, o.x - 25, o.z - 25, o.x + 25, o.z - 25, 3, { at: 25, w: 6 }); fence(c, o.x - 25, o.z + 25, o.x + 25, o.z + 25, 3); fence(c, o.x - 25, o.z - 25, o.x - 25, o.z + 25, 3); fence(c, o.x + 25, o.z - 25, o.x + 25, o.z + 25, 3); break; }
      case 'lookout': { y = t.hExact(o.x, o.z); [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(function (q) { b.box(o.x + q[0], y, o.z + q[1], 0.3, 12, 0.3, m.darkwood, true); }); b.box(o.x, y + 12, o.z, 5, 3, 5, m.wood); b.mesh(new THREE.ConeGeometry(4, 2, 4), m.shingle, o.x, y + 16, o.z, 0, Math.PI / 4, 0); break; }
      case 'mine': { y = t.hExact(o.x, o.z); b.box(o.x - 2.4, y, o.z, 0.4, 4, 0.4, m.darkwood, true); b.box(o.x + 2.4, y, o.z, 0.4, 4, 0.4, m.darkwood, true); b.box(o.x, y + 4, o.z, 5.4, 0.5, 0.5, m.darkwood); b.mesh(new THREE.PlaneGeometry(4.4, 4), std({ color: '#000', roughness: 1 }), o.x, y + 2, o.z - 0.1, 0, Math.PI, 0); b.box(o.x, y - 1, o.z - 8, 12, 9, 14, m.stone, true); for (var cart = 0; cart < 2; cart++) b.box(o.x + 3 + cart * 2, y, o.z + 4 + cart * 3, 1.2, 1, 1.8, m.rust, true); break; }
      case 'wall': {
        y = t.hExact(o.x, o.z);
        var gap = o.gap || 0;
        if (o.w > o.d) { var half = (o.w - gap) / 2; [-1, 1].forEach(function (sd) { if (!gap && sd > 0) return; var len = gap ? half : o.w, cx2 = gap ? o.x + sd * (gap / 2 + half / 2) : o.x; b.box(cx2, y - 2, o.z, len, o.h + 2, o.d, m.concrete, true); for (var k = -len / 2; k < len / 2; k += 3) b.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 4), m.rust, cx2 + k, y + o.h + 0.3, o.z, 0, 0, 0); }); }
        else b.box(o.x, y - 2, o.z, o.w, o.h + 2, o.d, m.concrete, true);
        break;
      }
      case 'fenceSeg': { fence(c, o.x0, o.z0, o.x1, o.z1, 3.2, o.gap ? { at: Math.hypot(o.x1 - o.x0, o.z1 - o.z0) / 2, w: o.gap } : null); break; }
      case 'turbine': {
        y = t.hExact(o.x, o.z);
        var white = std({ color: '#d8dad6', roughness: 0.5, metalness: 0.2 });
        b.mesh(new THREE.CylinderGeometry(1.2, 2.0, 60, 14), white, o.x, y + 30, o.z); b.col(o.x - 2, o.x + 2, o.z - 2, o.z + 2, y, y + 60);
        var hub = new THREE.Group(); hub.position.set(o.x, y + 60, o.z + 1.6); c.group.add(hub);
        var nac = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 6), white); nac.position.z = -2.2; hub.add(nac);
        var rot = new THREE.Group(); rot.position.z = 1; hub.add(rot);
        for (var bl = 0; bl < 3; bl++) { var blade = new THREE.Mesh(new THREE.BoxGeometry(1.4, 26, 0.3), white); blade.position.y = 13; var arm = new THREE.Group(); arm.rotation.z = bl * 2.094; arm.add(blade); rot.add(arm); }
        var spin = function (tt) { rot.rotation.z = tt * 0.6 + o.x; }; NF.world.anims.push(spin); (c.extra || (c.extra = [])).push(function () { var i = NF.world.anims.indexOf(spin); if (i >= 0) NF.world.anims.splice(i, 1); });
        var blink = b.mesh(new THREE.SphereGeometry(0.4, 8, 6), m.red, o.x, y + 61.6, o.z - 1);
        break;
      }
      case 'helipad': { y = t.hExact(o.x, o.z); b.mesh(new THREE.CircleGeometry(9, 32), std({ color: '#3a3a36', roughness: 0.8 }), o.x, y + 0.05, o.z, -Math.PI / 2); b.mesh(new THREE.PlaneGeometry(6, 8), std({ map: t.signTex('H', '#3a3a36', '#e8e0c0', 128) }), o.x, y + 0.07, o.z, -Math.PI / 2); break; }
      case 'boxcar': {
        y = t.hExact(o.x, o.z);
        var bcm = std({ color: ['#6a2a1a', '#3a4a5a', '#5a5a3a', '#4a3a2a'][Math.abs(Math.round(o.x + o.z)) % 4], metalness: 0.4, roughness: 0.7, map: NF.tex.metal() });
        var bc = b.mesh(new THREE.BoxGeometry(3, 3.4, 13), bcm, o.x, y + 2.6, o.z, 0, o.rot || 0, 0);
        var ca = Math.abs(Math.cos(o.rot || 0)), sa = Math.abs(Math.sin(o.rot || 0)), hx = 1.5 * ca + 6.5 * sa, hz = 1.5 * sa + 6.5 * ca;
        b.col(o.x - hx, o.x + hx, o.z - hz, o.z + hz, y, y + 4.3);
        [-4, 4].forEach(function (k) { b.mesh(new THREE.BoxGeometry(2.6, 0.8, 2.4), m.rust, o.x + Math.sin(o.rot || 0) * k, y + 0.5, o.z + Math.cos(o.rot || 0) * k, 0, o.rot || 0, 0); });
        break;
      }
      case 'observatory': {
        var ob = t.building(c, { id: 'obsbld', x: o.x, z: o.z, w: 14, d: 14, face: 0, h: 5, style: 'concrete', flatRoof: true, empty: true, name: 'Echo Ridge Observatory', lit: true });
        b.mesh(new THREE.SphereGeometry(7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: '#c8ccd0', metalness: 0.6, roughness: 0.3 }), o.x, ob.y + 5.2, o.z);
        b.mesh(new THREE.BoxGeometry(1.4, 7, 0.4), std({ color: '#111' }), o.x, ob.y + 9, o.z + 4.8, -0.6, 0, 0);
        b.mesh(new THREE.CylinderGeometry(0.5, 0.7, 5, 12), m.metal, o.x, ob.y + 2.5, o.z, 0.5, 0, 0);
        break;
      }
      case 'logpile': {
        y = t.hExact(o.x, o.z);
        for (var lg = 0; lg < 12; lg++) { var row = lg < 5 ? 0 : lg < 9 ? 1 : lg < 11 ? 2 : 3, idx = lg - [0, 5, 9, 11][row]; b.mesh(new THREE.CylinderGeometry(0.45, 0.45, 9, 10), m.darkwood, o.x - 1.8 + row * 0.45 + idx * 0.92, y + 0.45 + row * 0.8, o.z, Math.PI / 2, 0, 0); }
        b.col(o.x - 2.6, o.x + 2.6, o.z - 4.5, o.z + 4.5, y, y + 3.2);
        break;
      }
      case 'dam': {
        var L = NF.terrain.poi('lake'), top = L.water + 2;
        b.box(o.x, L.water - 30, o.z, 240, 32, 9, m.concrete, false);
        b.room({ id: 'damtop', name: 'Blackwater Dam', x0: o.x - 120, x1: o.x + 120, z0: o.z - 4.5, z1: o.z + 4.5, y: top, h: 60 });
        b.col(o.x - 120, o.x + 120, o.z - 4.7, o.z - 4.3, top, top + 1.1); b.col(o.x - 120, o.x + 120, o.z + 4.3, o.z + 4.7, top, top + 1.1);
        b.box(o.x, top, o.z - 4.5, 240, 1.1, 0.3, m.concrete, false); b.box(o.x, top, o.z + 4.5, 240, 1.1, 0.3, m.concrete, false);
        b.box(o.x, top, o.z, 1.6, 1.3, 0.8, std({ color: '#5a6a5a', metalness: 0.6, roughness: 0.4, map: NF.tex.metal() }), true);
        b.mesh(new THREE.PlaneGeometry(1.2, 0.5), std({ color: '#103010', emissive: '#30a050', emissiveIntensity: 0.8 }), o.x, top + 1.0, o.z - 0.41, 0, Math.PI, 0);
        b.spot({ id: 'dampanel', x: o.x, z: o.z - 1.2, r: 1.8, prompt: 'Start the dam turbines', fn: function () { NF.game.event('dampanel'); }, y: 1 });
        for (var dl = -100; dl <= 100; dl += 40) NF.terrain.lamps.push({ x: o.x + dl, y: 4, z: o.z, c: '#ffe0b0', i: 0.9, chunk: c.k });
        break;
      }
    }
  };
  return S;
})();
