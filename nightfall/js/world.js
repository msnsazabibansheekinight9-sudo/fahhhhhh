// Ashgrove Manor: rooms, walls, doors, props, lights, items, collision and navigation.
var NF = window.NF || (window.NF = {});
NF.world = (function () {
  var W = { boxes: [], rooms: [], doors: [], items: [], spots: [], lights: [], flicker: [], anims: [], decals: [] };
  var T = NF.tex, Mo = NF.models, std = Mo.std;
  var scene;
  var mats = {};
  function uvScale(geo, w, h, d, s) { // world-space UVs so textures tile at a constant size
    var uv = geo.attributes.uv; s = s || 2;
    var dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (var f = 0; f < 6; f++) for (var v = 0; v < 4; v++) { var i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s); }
    uv.needsUpdate = true;
  }
  function addBox(x, y, z, w, h, d, mat, opt) { // x,z centre, y bottom
    opt = opt || {};
    var g = new THREE.BoxGeometry(w, h, d);
    if (opt.uv !== false) uvScale(g, w, h, d, opt.uvs);
    var m = new THREE.Mesh(g, mat); m.position.set(x, y + h / 2, z);
    m.castShadow = opt.cast !== false; m.receiveShadow = true;
    (opt.parent || scene).add(m);
    if (opt.collide) m.userData.box = collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + h, opt.tag);
    return m;
  }
  function collider(x0, x1, z0, z1, y0, y1, tag) { var b = { x0: x0, x1: x1, z0: z0, z1: z1, y0: y0 || 0, y1: y1 === undefined ? 10 : y1, tag: tag, on: true }; W.boxes.push(b); return b; }
  W.collider = collider; W.addBox = addBox;
  function initMats() {
    mats.wallpaper = std({ map: T.wallpaper(), roughness: 0.9 });
    mats.panel = std({ map: T.panel(), roughness: 0.7 });
    mats.stone = std({ map: T.stone(), roughness: 0.95 });
    mats.lab = std({ map: T.labwall(), roughness: 0.6, metalness: 0.1 });
    mats.books = std({ map: T.books(), roughness: 0.85 });
    mats.wood = std({ map: T.wood(), roughness: 0.6, color: '#8a6a50' });
    mats.darkwood = std({ map: T.wood(), color: '#5a3a28', roughness: 0.55 });
    mats.metal = std({ map: T.metal(), metalness: 0.8, roughness: 0.4 });
    mats.brass = std({ color: '#b08a3a', metalness: 0.9, roughness: 0.3 });
    mats.ceiling = std({ color: '#2a2420', roughness: 1 });
    mats.labCeil = std({ color: '#3a403f', roughness: 0.9 });
    mats.trim = std({ color: '#2a170a', roughness: 0.5 });
    mats.cloth = std({ color: '#d8d0c0', roughness: 0.9 });
    mats.glass = new THREE.MeshPhysicalMaterial({ color: '#99ccbb', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    mats.liquid = std({ color: '#2a8a5a', emissive: '#0a6a3a', emissiveIntensity: 0.9, transparent: true, opacity: 0.45, depthWrite: false });
    mats.window = std({ color: '#203248', emissive: '#304a70', emissiveIntensity: 0.6 });
    mats.flame = new THREE.MeshBasicMaterial({ color: '#ffb04a' });
    mats.black = std({ color: '#050403', roughness: 1 });
  }
  function floorMat(kind, w, d) {
    var t, m;
    if (kind === 'marble') { t = T.marble().clone(); t.needsUpdate = true; t.repeat.set(w / 3.5, d / 3.5); m = std({ map: t, roughness: 0.25, metalness: 0.05 }); }
    else if (kind === 'tile') { t = T.tile().clone(); t.needsUpdate = true; t.repeat.set(w / 3, d / 3); m = std({ map: t, roughness: 0.35 }); }
    else if (kind === 'carpet') { t = T.carpet().clone(); t.needsUpdate = true; t.repeat.set(1, d / 6); m = std({ map: t, roughness: 1 }); }
    else { t = T.wood().clone(); t.needsUpdate = true; t.repeat.set(w / 4, d / 4); m = std({ map: t, roughness: 0.55, color: '#9a7a60' }); }
    return m;
  }
  function wallMats(style) {
    if (style === 'lab') return [mats.lab, mats.lab];
    if (style === 'stone') return [mats.stone, mats.stone];
    if (style === 'library') return [mats.panel, mats.darkwood];
    if (style === 'panel') return [mats.panel, mats.panel];
    return [mats.panel, mats.wallpaper]; // lower wainscot, upper paper
  }
  function room(id) { for (var i = 0; i < W.rooms.length; i++) if (W.rooms[i].id === id) return W.rooms[i]; return null; }
  W.room = room;
  // Build a straight wall with door gaps. axis 'x': runs along x at z=c; 'z': runs along z at x=c.
  function wall(axis, c, from, to, neg, pos, gaps) {
    var rn = room(neg), rp = room(pos);
    var h = Math.max(rn ? rn.h : 0, rp ? rp.h : 0);
    var th = 0.3;
    gaps = (gaps || []).slice().sort(function (a, b) { return a.c - b.c; });
    var segs = [], cur = from;
    gaps.forEach(function (g) { segs.push([cur, g.c - g.w / 2]); cur = g.c + g.w / 2; });
    segs.push([cur, to]);
    var mN = wallMats(rn ? rn.wall : (rp ? rp.wall : 'mansion')), mP = wallMats(rp ? rp.wall : (rn ? rn.wall : 'mansion'));
    function piece(a, b, y0, y1, lower) {
      if (b - a < 0.01) return;
      var len = b - a, mid = (a + b) / 2, hh = y1 - y0;
      var matsArr;
      var mn = lower ? mN[0] : mN[1], mp = lower ? mP[0] : mP[1];
      // BoxGeometry faces: +x,-x,+y,-y,+z,-z
      if (axis === 'x') matsArr = [mats.trim, mats.trim, mats.trim, mats.trim, mp, mn];
      else matsArr = [mp, mn, mats.trim, mats.trim, mats.trim, mats.trim];
      var thick = lower ? th + 0.06 : th;
      var g = axis === 'x' ? new THREE.BoxGeometry(len, hh, thick) : new THREE.BoxGeometry(thick, hh, len);
      uvScale(g, axis === 'x' ? len : thick, hh, axis === 'x' ? thick : len, lower ? 2.5 : 2.2);
      var m = new THREE.Mesh(g, matsArr); m.receiveShadow = true; m.castShadow = true;
      if (axis === 'x') m.position.set(mid, y0 + hh / 2, c); else m.position.set(c, y0 + hh / 2, mid);
      scene.add(m);
      return m;
    }
    var lowerH = 1.1;
    var isLab = (rn && rn.wall === 'lab') || (rp && rp.wall === 'lab');
    segs.forEach(function (s) {
      if (isLab) piece(s[0], s[1], 0, h, false);
      else { piece(s[0], s[1], 0, lowerH, true); piece(s[0], s[1], lowerH, h, false);
        // chair rail
        var len = s[1] - s[0]; if (len > 0.05) { var mid = (s[0] + s[1]) / 2; if (axis === 'x') addBox(mid, lowerH - 0.02, c, len, 0.08, th + 0.12, mats.trim, { uv: false, cast: false }); else addBox(c, lowerH - 0.02, mid, th + 0.12, 0.08, len, mats.trim, { uv: false, cast: false }); }
      }
      if (axis === 'x') collider(s[0], s[1], c - th / 2, c + th / 2, 0, h, 'wall'); else collider(c - th / 2, c + th / 2, s[0], s[1], 0, h, 'wall');
    });
    gaps.forEach(function (g) {
      var dh = g.h || 2.7;
      if (h > dh) { var mm = piece(g.c - g.w / 2, g.c + g.w / 2, dh, h, false); }
      if (axis === 'x') collider(g.c - g.w / 2, g.c + g.w / 2, c - th / 2, c + th / 2, dh, h, 'lintel'); else collider(c - th / 2, c + th / 2, g.c - g.w / 2, g.c + g.w / 2, dh, h, 'lintel');
      // frame
      var fm = isLab ? mats.metal : mats.trim;
      if (axis === 'x') { addBox(g.c - g.w / 2 - 0.08, 0, c, 0.16, dh + 0.1, th + 0.14, fm, { uv: false }); addBox(g.c + g.w / 2 + 0.08, 0, c, 0.16, dh + 0.1, th + 0.14, fm, { uv: false }); addBox(g.c, dh, c, g.w + 0.32, 0.16, th + 0.14, fm, { uv: false }); }
      else { addBox(c, 0, g.c - g.w / 2 - 0.08, th + 0.14, dh + 0.1, 0.16, fm, { uv: false }); addBox(c, 0, g.c + g.w / 2 + 0.08, th + 0.14, dh + 0.1, 0.16, fm, { uv: false }); addBox(c, dh, g.c, th + 0.14, 0.16, g.w + 0.32, fm, { uv: false }); }
      if (g.door) makeDoor(g, axis, c, neg, pos, dh, isLab);
    });
  }
  function makeDoor(g, axis, c, neg, pos, dh, isLab) {
    var d = { id: g.door, a: neg, b: pos, axis: axis, c: c, along: g.c, w: g.w, lock: g.lock || null, msg: g.msg || null, open: false, t: 0, metal: isLab, never: !!g.never, panels: [] };
    d.x = axis === 'x' ? g.c : c; d.z = axis === 'x' ? c : g.c;
    var panelMat = isLab ? std({ map: T.metal(), color: '#8a9090', metalness: 0.7, roughness: 0.4 }) : std({ map: T.panel(), color: '#7a5038', roughness: 0.55 });
    var n = g.w > 2 ? 2 : 1, pw = g.w / n;
    for (var i = 0; i < n; i++) {
      var piv = new THREE.Group();
      var side = n === 2 ? (i === 0 ? -1 : 1) : -1;
      var hingeAlong = g.c + side * g.w / 2;
      if (axis === 'x') piv.position.set(hingeAlong, 0, c); else piv.position.set(c, 0, hingeAlong);
      var leaf = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? pw - 0.02 : 0.1, dh - 0.02, axis === 'x' ? 0.1 : pw - 0.02), panelMat);
      var off = -side * pw / 2;
      if (axis === 'x') leaf.position.set(off, dh / 2, 0); else leaf.position.set(0, dh / 2, off);
      leaf.castShadow = true; leaf.receiveShadow = true;
      piv.add(leaf);
      var knob = new THREE.Mesh(Mo.sphere(0.045, 10, 8), mats.brass);
      var ko = -side * (pw - 0.15);
      if (axis === 'x') knob.position.set(ko, 1.05, 0.08); else knob.position.set(0.08, 1.05, ko);
      piv.add(knob); var k2 = knob.clone(); if (axis === 'x') k2.position.z = -0.08; else k2.position.x = -0.08; piv.add(k2);
      scene.add(piv);
      d.panels.push({ piv: piv, side: side });
    }
    d.box = axis === 'x' ? collider(g.c - g.w / 2, g.c + g.w / 2, c - 0.12, c + 0.12, 0, dh, 'door') : collider(c - 0.12, c + 0.12, g.c - g.w / 2, g.c + g.w / 2, 0, dh, 'door');
    if (g.never) { // boards across the front door
      for (var b = 0; b < 4; b++) { var bd = addBox(g.c, 0.6 + b * 0.5, c + 0.2, g.w + 0.4, 0.18, 0.05, mats.darkwood, { uv: false }); bd.rotation.z = (b % 2 ? 1 : -1) * 0.15; }
    }
    W.doors.push(d);
    return d;
  }
  W.openDoor = function (d) {
    if (d.open) return; d.open = true; d.box.on = false; d.t = 0;
    NF.audio.door(new THREE.Vector3(d.x, 1.5, d.z));
  };
  function updateDoors(dt) {
    W.doors.forEach(function (d) {
      if (!d.open || d.t >= 1) return;
      d.t = Math.min(1, d.t + dt * 1.4); var e = 1 - Math.pow(1 - d.t, 3);
      d.panels.forEach(function (p) {
        if (d.metal) { var sl = e * (d.w / d.panels.length) * 0.95 * p.side; if (d.axis === 'x') p.piv.position.x = d.along + p.side * d.w / 2 + sl - p.side * 0; else p.piv.position.z = d.along + p.side * d.w / 2 + sl; p.piv.children[0].position[d.axis === 'x' ? 'x' : 'z'] = -p.side * (d.w / d.panels.length) / 2; }
        else p.piv.rotation.y = e * 1.75 * p.side * (d.axis === 'x' ? 1 : -1) * (d.swing || 1);
      });
    });
  }
  // ---------------------------------------------------------------- props
  function light(x, y, z, col, inten, dist, flick, roomId) {
    var l = new THREE.PointLight(col, inten, dist || 14, 2); l.position.set(x, y, z); scene.add(l);
    l.userData.base = inten; l.userData.room = roomId; W.lights.push(l); if (flick) W.flicker.push({ l: l, kind: flick, seed: Math.random() * 100 });
    return l;
  }
  function candle(x, y, z, parent) {
    var p = parent || scene;
    var c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.16, 8), mats.cloth); c.position.set(x, y + 0.08, z); p.add(c);
    var f = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.045, 6), mats.flame); f.position.set(x, y + 0.19, z); p.add(f);
    W.anims.push(function (t) { f.scale.set(1, 0.8 + 0.4 * Math.abs(Math.sin(t * 13 + x * 7)), 1); });
  }
  function candelabra(x, y, z) {
    addBox(x, y, z, 0.06, 0.35, 0.06, mats.brass, { uv: false });
    addBox(x, y + 0.33, z, 0.4, 0.03, 0.04, mats.brass, { uv: false });
    candle(x - 0.18, y + 0.36, z); candle(x, y + 0.36, z); candle(x + 0.18, y + 0.36, z);
  }
  function painting(x, y, z, rotY, w, h, seed) {
    var g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY;
    var fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.06), mats.brass); g.add(fr);
    var pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map: T.painting(seed), roughness: 0.7 })); pic.position.z = 0.032; g.add(pic);
    scene.add(g); return g;
  }
  function decal(x, z, s, seed, rot) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshStandardMaterial({ map: T.bloodDecal(seed || 1), transparent: true, roughness: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = rot || Math.random() * 6; m.position.set(x, 0.012, z); m.receiveShadow = true; scene.add(m); return m;
  }
  W.decal = decal;
  function table(x, z, w, d, h, mat, cloth) {
    addBox(x, h - 0.06, z, w, 0.06, d, mat || mats.darkwood, { collide: true });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { addBox(x + s[0] * (w / 2 - 0.08), 0, z + s[1] * (d / 2 - 0.08), 0.08, h - 0.06, 0.08, mats.darkwood, { uv: false }); });
    if (cloth) addBox(x, h, z, w - 0.2, 0.005, d + 0.1, std({ color: '#c8c0b0', roughness: 0.9, map: T.cloth('#c8c0b0', true, 3) }), { uv: false, cast: false });
  }
  function chair(x, z, rot) {
    var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    var seat = new THREE.Mesh(Mo.box(0.46, 0.06, 0.46), mats.darkwood); seat.position.y = 0.47; g.add(seat);
    var back = new THREE.Mesh(Mo.box(0.46, 0.7, 0.05), mats.darkwood); back.position.set(0, 0.85, -0.21); g.add(back);
    var cush = new THREE.Mesh(Mo.box(0.4, 0.04, 0.4), std({ color: '#5a1010', roughness: 1 })); cush.position.y = 0.52; g.add(cush);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { var l = new THREE.Mesh(Mo.box(0.05, 0.47, 0.05), mats.darkwood); l.position.set(s[0] * 0.2, 0.235, s[1] * 0.2); g.add(l); });
    g.traverse(function (c) { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(g); return g;
  }
  function shelf(x, z, w, h, d, rot, both) {
    var side = Math.abs(Math.sin(rot || 0)) > 0.5;
    var m = addBox(x, 0, z, side ? d : w, h, side ? w : d, mats.darkwood, { collide: true, uv: false });
    [rot || 0].concat(both ? [(rot || 0) + Math.PI] : []).forEach(function (rr) {
      var t2 = mats.books.map.clone(); t2.needsUpdate = true; t2.repeat.set(w / 2, h / 2.4);
      var front = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.2), std({ map: t2, roughness: 0.85 }));
      front.rotation.y = rr; front.position.set(x + Math.sin(rr) * (d / 2 + 0.005), h / 2, z + Math.cos(rr) * (d / 2 + 0.005));
      front.receiveShadow = true; scene.add(front);
    });
    return m;
  }
  function herbPot(parent) {
    var g = new THREE.Group();
    var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.16, 10), std({ color: '#8a4a2a', roughness: 0.8 })); pot.position.y = 0.08; g.add(pot);
    var lm = std({ color: '#3a8a2a', roughness: 0.6, side: THREE.DoubleSide });
    for (var i = 0; i < 9; i++) { var l = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 4), lm); l.position.set(Math.cos(i) * 0.04, 0.25, Math.sin(i) * 0.04); l.rotation.set(Math.cos(i * 2) * 0.6, 0, Math.sin(i * 2) * 0.6); g.add(l); }
    return g;
  }
  function itemModel(type) {
    var g = new THREE.Group(), m;
    if (type === 'hg_ammo') { m = new THREE.Mesh(Mo.box(0.16, 0.08, 0.1), std({ color: '#8a7a2a', roughness: 0.6 })); m.position.y = 0.04; g.add(m); var l = new THREE.Mesh(Mo.box(0.161, 0.03, 0.101), std({ color: '#222' })); l.position.y = 0.05; g.add(l); }
    else if (type === 'sg_ammo') { m = new THREE.Mesh(Mo.box(0.16, 0.09, 0.1), std({ color: '#8a1a14', roughness: 0.6 })); m.position.y = 0.045; g.add(m); }
    else if (type === 'mag_ammo') { m = new THREE.Mesh(Mo.box(0.12, 0.07, 0.08), std({ color: '#2a3a6a', roughness: 0.6 })); m.position.y = 0.035; g.add(m); }
    else if (type === 'herb') g.add(herbPot());
    else if (type === 'spray') { m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 10), std({ color: '#e8e8e8', roughness: 0.3, metalness: 0.4 })); m.position.y = 0.1; g.add(m); var cap = new THREE.Mesh(Mo.box(0.05, 0.04, 0.05), std({ color: '#2a8a3a' })); cap.position.y = 0.22; g.add(cap); }
    else if (type === 'shotgun' || type === 'magnum') { var w = Mo.weapon(type); w.rotation.set(0, 0, Math.PI / 2); w.position.y = 0.05; g.add(w); }
    else if (type === 'key_raven') { m = new THREE.Mesh(Mo.box(0.03, 0.01, 0.14), mats.brass); m.position.y = 0.02; g.add(m); var bow = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 6, 12), mats.brass); bow.rotation.x = Math.PI / 2; bow.position.set(0, 0.02, -0.09); g.add(bow); }
    else if (type === 'crest') { m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 6), std({ color: '#c0c4c8', metalness: 0.95, roughness: 0.2 })); m.position.y = 0.02; g.add(m); var gem = new THREE.Mesh(Mo.sphere(0.025), std({ color: '#c01020', emissive: '#600008' })); gem.position.y = 0.035; g.add(gem); }
    else if (type === 'keycard') { m = new THREE.Mesh(Mo.box(0.09, 0.004, 0.055), std({ color: '#e0e0e0', emissive: '#203040' })); m.position.y = 0.01; g.add(m); var s = new THREE.Mesh(Mo.box(0.091, 0.005, 0.012), std({ color: '#c02020' })); s.position.set(0, 0.011, 0.012); g.add(s); }
    else if (type === 'file') { m = new THREE.Mesh(Mo.box(0.22, 0.01, 0.3), std({ map: T.paper(), roughness: 0.9 })); m.position.y = 0.006; m.rotation.y = 0.3; g.add(m); }
    g.traverse(function (c) { if (c.isMesh) c.castShadow = true; });
    return g;
  }
  var sparkMat;
  W.item = function (id, type, x, y, z, opts) {
    opts = opts || {};
    var g = itemModel(type); g.position.set(x, y, z); scene.add(g);
    if (!sparkMat) sparkMat = new THREE.SpriteMaterial({ map: T.spark(), color: '#fff3c0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    var sp = new THREE.Sprite(sparkMat.clone()); sp.scale.set(0.25, 0.25, 0.25); sp.position.set(x, y + 0.15, z); scene.add(sp);
    var it = { id: id, type: type, x: x, y: y, z: z, mesh: g, spark: sp, taken: false, amount: opts.amount, file: opts.file, name: opts.name, onTake: opts.onTake };
    W.items.push(it); return it;
  };
  W.takeItem = function (it) { it.taken = true; scene.remove(it.mesh); scene.remove(it.spark); };
  W.spot = function (id, x, z, r, prompt, fn, y) { var s = { id: id, x: x, z: z, y: y || 1, r: r, prompt: prompt, fn: fn, on: true }; W.spots.push(s); return s; };

  // ---------------------------------------------------------------- level
  W.build = function (sc) {
    scene = sc; initMats();
    W.rooms = [
      { id: 'foyer', name: 'Main Hall', x0: -10, x1: 10, z0: 0, z1: 20, h: 8, floor: 'marble', wall: 'mansion' },
      { id: 'dining', name: 'Dining Room', x0: -28, x1: -10, z0: 2, z1: 18, h: 5, floor: 'wood', wall: 'mansion' },
      { id: 'library', name: 'Library', x0: 10, x1: 28, z0: 2, z1: 18, h: 6, floor: 'wood', wall: 'library' },
      { id: 'hall', name: 'North Corridor', x0: -3, x1: 3, z0: 20, z1: 46, h: 4, floor: 'carpet', wall: 'mansion' },
      { id: 'guard', name: 'Guard Room', x0: 3, x1: 15, z0: 30, z1: 42, h: 3.6, floor: 'wood', wall: 'panel', safe: true },
      { id: 'lab', name: 'Lazarus Laboratory', x0: -12, x1: 12, z0: 46, z1: 72, h: 6, floor: 'tile', wall: 'lab' }
    ];
    W.rooms.forEach(function (r) {
      var w = r.x1 - r.x0, d = r.z1 - r.z0;
      var f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat(r.floor, w, d)); f.rotation.x = -Math.PI / 2; f.position.set((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2); f.receiveShadow = true; scene.add(f);
      var c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), r.wall === 'lab' ? mats.labCeil : mats.ceiling); c.rotation.x = Math.PI / 2; c.position.set((r.x0 + r.x1) / 2, r.h, (r.z0 + r.z1) / 2); scene.add(c);
      // cornice
      if (r.wall !== 'lab') { addBox((r.x0 + r.x1) / 2, r.h - 0.25, r.z0 + 0.2, w, 0.25, 0.12, mats.trim, { uv: false, cast: false }); addBox((r.x0 + r.x1) / 2, r.h - 0.25, r.z1 - 0.2, w, 0.25, 0.12, mats.trim, { uv: false, cast: false }); }
    });
    var neverMsg = 'The front doors are boarded shut — from the outside. Someone made sure nobody leaves.';
    var walls = [
      ['x', 0, -10, 10, null, 'foyer', [{ c: 0, w: 2.6, door: 'front', never: true, msg: neverMsg, h: 3.4 }]],
      ['x', 20, -10, 10, 'foyer', 'hall', [{ c: 0, w: 2, door: 'd_hall', lock: 'crest', msg: 'An ornate door. A hexagonal recess sits where the handle should be.' }]],
      ['z', -10, 0, 20, 'dining', 'foyer', [{ c: 10, w: 2.4, door: 'd_dining' }]],
      ['z', 10, 0, 20, 'foyer', 'library', [{ c: 10, w: 2.4, door: 'd_library', lock: 'key_raven', msg: 'Locked. A raven is engraved on the keyhole plate.' }]],
      ['x', 2, -28, -10, null, 'dining'], ['x', 18, -28, -10, 'dining', null], ['z', -28, 2, 18, null, 'dining'],
      ['x', 2, 10, 28, null, 'library'], ['x', 18, 10, 28, 'library', null], ['z', 28, 2, 18, 'library', null],
      ['z', -3, 20, 46, null, 'hall', [{ c: 33, w: 2.4, h: 3.2 }]], ['z', 3, 20, 46, 'hall', 'guard', [{ c: 36, w: 1.8, door: 'd_guard' }]],
      ['x', 30, 3, 15, null, 'guard'], ['x', 42, 3, 15, 'guard', null], ['z', 15, 30, 42, 'guard', null],
      ['x', 46, -12, 12, 'hall', 'lab', [{ c: 0, w: 2.2, door: 'd_lab', lock: 'keycard', msg: 'A steel security door. The card reader blinks red.' }]],
      ['x', 72, -12, 12, 'lab', null, [{ c: 0, w: 2.6, door: 'd_exit', lock: 'flag:bossDead', msg: 'EMERGENCY EXIT — sealed during containment breach.' }]],
      ['z', -12, 46, 72, null, 'lab'], ['z', 12, 46, 72, 'lab', null]
    ];
    walls.forEach(function (w) { wall(w[0], w[1], w[2], w[3], w[4], w[5], w[6]); });
    // breakable section of the corridor wall (the Warden's entrance)
    W.breakWall = addBox(-3, 0, 33, 0.3, 3.2, 2.4, mats.wallpaper, { collide: true, tag: 'wall' });
    W.breakWall.userData.box.tag = 'wall';
    addBox(-5.2, 0, 33, 0.3, 3.2, 3.2, mats.stone, { collide: true }); addBox(-4.1, 0, 31.5, 2.2, 3.2, 0.3, mats.stone, { collide: true }); addBox(-4.1, 0, 34.5, 2.2, 3.2, 0.3, mats.stone, { collide: true });
    addBox(-4.1, 3.2, 33, 2.4, 0.2, 3.2, mats.stone, {});
    buildFoyer(); buildDining(); buildLibrary(); buildHall(); buildGuard(); buildLab();
    W.dust();
  };
  function buildFoyer() {
    // carpet runner
    var cm = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 19.6), floorMat('carpet', 2.6, 19.6)); cm.rotation.x = -Math.PI / 2; cm.position.set(0, 0.01, 10); cm.receiveShadow = true; scene.add(cm);
    // twin staircases up to a balcony
    var stairMat = std({ map: T.wood(), color: '#6a4a36', roughness: 0.5 });
    [-1, 1].forEach(function (s) {
      var x = s * 8.6;
      for (var i = 0; i < 14; i++) { var y = i * 0.29; addBox(x, 0, 6.5 + i * 0.75, 2.6, y + 0.29, 0.75, i % 2 ? stairMat : mats.darkwood, { uv: false }); }
      collider(x - 1.4, x + 1.4, 6.2, 17, 0, 4.2, 'stairs');
      // banister
      for (var b = 0; b < 14; b++) addBox(x - s * 1.25, b * 0.29 + 0.29, 6.6 + b * 0.75, 0.06, 0.9, 0.06, mats.darkwood, { uv: false });
      var rail = addBox(x - s * 1.25, 0, 11.75, 0.1, 0.08, 10.8, mats.trim, { uv: false }); rail.position.y = 2.5; rail.rotation.x = -Math.atan2(4.06, 10.5);
    });
    addBox(0, 3.9, 18.5, 20, 0.25, 3, mats.darkwood, { uv: false });
    collider(-10, 10, 17, 20, 3.9, 4.2, 'balcony');
    for (var i = -9; i <= 9; i += 0.5) addBox(i, 4.15, 17.05, 0.05, 0.9, 0.05, mats.darkwood, { uv: false, cast: false });
    addBox(0, 5.05, 17.05, 20, 0.08, 0.12, mats.trim, { uv: false });
    [-6, -3, 3, 6].forEach(function (x) { addBox(x, 0, 17.2, 0.5, 3.9, 0.5, mats.stone, { collide: true }); });
    // chandelier
    var ch = new THREE.Group(); ch.position.set(0, 6.3, 9);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.04, 8, 40), mats.brass); ring.rotation.x = Math.PI / 2; ch.add(ring);
    var ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 30), mats.brass); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.35; ch.add(ring2);
    var chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 6), mats.brass); chain.position.y = 0.9; ch.add(chain);
    for (var k = 0; k < 12; k++) { var a = k / 12 * Math.PI * 2; candle(Math.cos(a) * 1.0, 0.02, Math.sin(a) * 1.0, ch); }
    for (var k2 = 0; k2 < 6; k2++) { var a2 = k2 / 6 * Math.PI * 2; candle(Math.cos(a2) * 0.55, 0.37, Math.sin(a2) * 0.55, ch); }
    scene.add(ch);
    W.anims.push(function (t) { ch.rotation.z = Math.sin(t * 0.5) * 0.01; ch.rotation.x = Math.sin(t * 0.37) * 0.01; });
    light(0, 5.9, 9, '#ffb36a', 2.2, 22, 'candle', 'foyer');
    // armour and decor
    [-1, 1].forEach(function (s) { var a = Mo.armour(); a.root.position.set(s * 2.0, 0, 18.7); a.root.rotation.y = Math.PI; scene.add(a.root); collider(s * 2 - 0.35, s * 2 + 0.35, 18.3, 19.1, 0, 2.2); });
    painting(-9.83, 2.6, 4.5, Math.PI / 2, 1.2, 1.6, 1); painting(9.83, 2.6, 4.5, -Math.PI / 2, 1.2, 1.6, 2);
    painting(0, 5.6, 19.83, Math.PI, 2.2, 2.6, 7);
    // grandfather clock
    addBox(9.5, 0, 15.2, 0.6, 2.3, 0.5, mats.darkwood, { collide: true, uv: false });
    var face = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), std({ color: '#e8dcc0' })); face.rotation.y = -Math.PI / 2; face.position.set(9.19, 1.9, 15.2); scene.add(face);
    var pend = new THREE.Mesh(Mo.box(0.02, 0.6, 0.02), mats.brass); pend.geometry = new THREE.BoxGeometry(0.02, 0.6, 0.02); pend.geometry.translate(0, -0.3, 0);
    pend.position.set(9.18, 1.5, 15.2); scene.add(pend);
    var bob = new THREE.Mesh(Mo.sphere(0.06), mats.brass); bob.position.y = -0.6; pend.add(bob);
    W.anims.push(function (t) { pend.rotation.x = Math.sin(t * 2.2) * 0.25; });
    // typewriter desk
    typewriterDesk(-8.8, 2.5, Math.PI / 2, 'tw_foyer');
    decal(-4, 9.5, 1.4, 3); decal(-7, 10.2, 0.9, 4); decal(-8.9, 10, 0.7, 5);
    // blood trail to the dining room
    for (var j = 0; j < 6; j++) decal(-2.5 - j * 1.2, 9 + Math.sin(j) * 0.4, 0.5, 6 + j);
    W.item('herb_foyer', 'herb', 8.5, 0, 2.2);
  }
  function typewriterDesk(x, z, rot, id) {
    table(x, z, 1.2, 0.7, 0.78, mats.darkwood);
    var tw = new THREE.Group(); tw.position.set(x, 0.78, z); tw.rotation.y = rot;
    var body = new THREE.Mesh(Mo.box(0.42, 0.14, 0.32), std({ color: '#1a1a1a', metalness: 0.5, roughness: 0.4 })); body.position.y = 0.07; tw.add(body);
    var roll = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.46, 10), std({ color: '#111' })); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.16, -0.08); tw.add(roll);
    var paper = new THREE.Mesh(Mo.box(0.2, 0.2, 0.004), std({ color: '#eee' })); paper.position.set(0, 0.25, -0.1); paper.rotation.x = -0.2; tw.add(paper);
    for (var k = 0; k < 24; k++) { var key = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6), std({ color: '#ddd' })); key.position.set(-0.15 + (k % 8) * 0.043, 0.15, 0.05 + (k / 8 | 0) * 0.035); tw.add(key); }
    tw.traverse(function (c) { if (c.isMesh) c.castShadow = true; });
    scene.add(tw);
    var glow = new THREE.Mesh(Mo.sphere(0.05), std({ color: '#3cff7a', emissive: '#3cff7a', emissiveIntensity: 2 })); glow.position.set(x, 0.95, z + 0.3 * Math.cos(rot)); scene.add(glow);
    W.spot(id, x, z, 1.8, 'Use typewriter (save)', function () { NF.game.save(true); }, 0.9);
  }
  function buildDining() {
    table(-19, 10, 11, 1.8, 0.8, mats.darkwood, true);
    for (var i = 0; i < 7; i++) { var x = -23.7 + i * 1.55; chair(x, 8.6, 0); chair(x, 11.4, Math.PI); }
    chair(-25.3, 10, Math.PI / 2); chair(-12.7, 10, -Math.PI / 2);
    candelabra(-22, 0.8, 10); candelabra(-16, 0.8, 10);
    for (var p = 0; p < 6; p++) { var pl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.02, 14), std({ color: '#d8d4c8', roughness: 0.3 })); pl.position.set(-23.7 + p * 1.9, 0.82, 9.4 + (p % 2) * 1.2); scene.add(pl); }
    light(-22, 1.6, 10, '#ffa050', 1.0, 9, 'candle', 'dining'); light(-16, 1.6, 10, '#ffa050', 1.0, 9, 'candle', 'dining');
    // fireplace
    addBox(-27.4, 0, 10, 1.0, 2.2, 3.2, mats.stone, { collide: true });
    addBox(-26.75, 0, 10, 0.3, 1.1, 1.6, mats.black, { uv: false });
    addBox(-26.7, 2.2, 10, 1.4, 0.15, 3.6, mats.darkwood, { uv: false });
    for (var f = 0; f < 5; f++) { var fl = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), new THREE.MeshBasicMaterial({ color: f % 2 ? '#ff7a20' : '#ffc040', transparent: true, opacity: 0.85 })); fl.position.set(-26.5, 0.25, 9.5 + f * 0.25); scene.add(fl); (function (fl, f) { W.anims.push(function (t) { fl.scale.set(1, 0.7 + 0.5 * Math.abs(Math.sin(t * 9 + f * 2)), 1); }); })(fl, f); }
    light(-26.2, 0.8, 10, '#ff7a30', 2.2, 12, 'fire', 'dining');
    painting(-27.83, 3.4, 10, Math.PI / 2, 1.4, 1.1, 4);
    painting(-19, 2.7, 17.83, Math.PI, 1.6, 1.2, 5); painting(-19, 2.7, 2.17, 0, 1.6, 1.2, 6);
    // cabinet with the diary
    addBox(-12, 0, 16.9, 2.2, 1.0, 0.6, mats.darkwood, { collide: true });
    W.item('file_butler', 'file', -12.3, 1.0, 16.9, { file: 'butler' });
    W.item('key_raven', 'key_raven', -26.5, 2.28, 10.6, { name: 'Raven Key' });
    W.item('hg_ammo_d1', 'hg_ammo', -13.2, 0.82, 10.4, { amount: 12 });
    decal(-20, 6, 2.0, 21); decal(-21.5, 5.4, 1.2, 22);
    // the butler's body
    var b = Mo.zombie(0, 3001); b.root.position.set(-20.4, 0.1, 5.8); b.root.rotation.set(-Math.PI / 2, 0, 0.6); scene.add(b.root);
    NF.anim.apply(b, NF.anim.dead(NF.anim.base()), 1);
    addBox(-10.8, 0, 3.0, 1.2, 2.0, 0.5, mats.darkwood, { collide: true, uv: false });
  }
  function buildLibrary() {
    shelf(19, 17.55, 17, 4.6, 0.6, Math.PI);
    shelf(19, 2.45, 17, 4.6, 0.6, 0);
    shelf(27.55, 12.5, 9, 4.6, 0.6, -Math.PI / 2);
    // freestanding rows
    [14.5, 17.5].forEach(function (x) { shelf(x, 6.6, 4.2, 2.8, 0.5, Math.PI / 2, true); });
    [14.5, 17.5].forEach(function (x) { shelf(x, 13.4, 4.2, 2.8, 0.5, Math.PI / 2, true); });
    // desk
    table(23, 10, 2.2, 1.1, 0.8, mats.darkwood);
    var lampG = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.08, 0.4, 8), mats.brass); lampG.position.set(23.6, 1.0, 10.3); scene.add(lampG);
    var shade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.18, 12, 1, true), std({ color: '#2a5a2a', emissive: '#103010', side: THREE.DoubleSide })); shade.position.set(23.6, 1.25, 10.3); scene.add(shade);
    light(23.6, 1.2, 10.3, '#ffd090', 1.5, 9, 'lamp', 'library');
    light(19, 5, 10, '#7080a8', 0.6, 16, null, 'library');
    chair(23, 9.1, 0);
    W.item('crest', 'crest', 22.6, 0.8, 10.0, { name: 'Crest Emblem' });
    W.item('file_memo', 'file', 23.5, 0.8, 9.8, { file: 'memo' });
    // shotgun rack on east wall
    addBox(27.7, 1.2, 5.2, 0.25, 0.9, 1.6, mats.darkwood, { uv: false });
    W.item('shotgun', 'shotgun', 27.45, 1.55, 5.2, { name: 'M37 Shotgun' });
    W.item('sg_ammo_l', 'sg_ammo', 21, 0.0, 3.6, { amount: 6 });
    // globe
    var gl = new THREE.Mesh(Mo.sphere(0.3, 18, 14), std({ color: '#8a7a4a', roughness: 0.5, map: T.paper() })); gl.position.set(12, 1.0, 16.2); scene.add(gl);
    addBox(12, 0, 16.2, 0.1, 0.7, 0.1, mats.brass, { uv: false }); collider(11.6, 12.4, 15.8, 16.6, 0, 1.3);
    painting(10.17, 3.8, 5.2, Math.PI / 2, 1.0, 1.3, 8);
    decal(20, 11, 1.2, 31);
    // ladder
    var lad = new THREE.Group(); lad.position.set(25, 0, 17.0); lad.rotation.x = -0.2;
    [-0.25, 0.25].forEach(function (x) { var r = new THREE.Mesh(Mo.box(0.05, 4.2, 0.05), mats.darkwood); r.position.set(x, 2.1, 0); lad.add(r); });
    for (var i = 0; i < 12; i++) { var rung = new THREE.Mesh(Mo.box(0.5, 0.04, 0.04), mats.darkwood); rung.position.set(0, 0.3 + i * 0.33, 0); lad.add(rung); }
    scene.add(lad);
  }
  function buildHall() {
    // windows on the west wall with moonlight
    [24.5, 29, 38, 42.5].forEach(function (z, i) {
      var win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), mats.window); win.rotation.y = Math.PI / 2; win.position.set(-2.83, 2.0, z); scene.add(win);
      addBox(-2.8, 1.05, z, 0.12, 0.08, 1.4, mats.trim, { uv: false }); addBox(-2.8, 2.9, z, 0.12, 0.08, 1.4, mats.trim, { uv: false }); addBox(-2.8, 1.05, z, 0.12, 1.9, 0.06, mats.trim, { uv: false });
      var mullion = addBox(-2.8, 1.95, z, 0.1, 0.05, 1.2, mats.trim, { uv: false });
      W.windows = W.windows || []; W.windows.push({ z: z, mesh: win });
    });
    var moon = new THREE.SpotLight('#6a8ad0', 1.2, 12, 0.5, 0.6, 1.5); moon.position.set(-4.5, 4, 33); moon.target.position.set(1, 0, 33); scene.add(moon); scene.add(moon.target);
    W.lights.push(moon);
    [26, 40].forEach(function (z) {
      addBox(2.7, 2.1, z, 0.12, 0.3, 0.12, mats.brass, { uv: false });
      var gl = new THREE.Mesh(Mo.sphere(0.08), std({ color: '#ffd090', emissive: '#ffb050', emissiveIntensity: 1.5 })); gl.position.set(2.6, 2.45, z); scene.add(gl);
      light(2.3, 2.45, z, '#ffb060', 0.9, 9, z === 40 ? 'broken' : 'candle', 'hall');
    });
    painting(2.83, 2.2, 22.5, -Math.PI / 2, 0.9, 1.2, 9); painting(2.83, 2.2, 31, -Math.PI / 2, 0.9, 1.2, 10); painting(2.83, 2.2, 44, -Math.PI / 2, 0.9, 1.2, 11);
    addBox(2.5, 0, 28, 0.5, 0.9, 0.9, mats.darkwood, { collide: true, uv: false });
    var vase = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.12, 0.02], [0.16, 0.15], [0.08, 0.32], [0.11, 0.42], [0.1, 0.43]].map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 14), std({ color: '#2a4a6a', roughness: 0.2, metalness: 0.2 })); vase.position.set(2.5, 0.9, 28); vase.castShadow = true; scene.add(vase);
    decal(0.5, 34, 1.0, 41); decal(-1, 43, 1.3, 42);
    W.item('hg_ammo_h', 'hg_ammo', 2.5, 0.9, 27.7, { amount: 10 });
  }
  function buildGuard() {
    light(9, 3.2, 36, '#ffe0b0', 1.2, 12, 'lamp', 'guard');
    var bulb = new THREE.Mesh(Mo.sphere(0.07), std({ color: '#fff', emissive: '#ffe0a0', emissiveIntensity: 2 })); bulb.position.set(9, 3.3, 36); scene.add(bulb);
    typewriterDesk(14.2, 33.5, -Math.PI / 2, 'tw_guard');
    // bunk bed
    addBox(5.0, 0, 41.0, 2.0, 0.5, 0.95, mats.metal, { collide: true }); addBox(5.0, 0.5, 41.0, 1.9, 0.15, 0.9, std({ color: '#5a6a4a', roughness: 1 }), { uv: false });
    addBox(5.0, 1.5, 41.0, 2.0, 0.1, 0.95, mats.metal, { uv: false }); addBox(5.0, 1.6, 41.0, 1.9, 0.15, 0.9, std({ color: '#5a6a4a', roughness: 1 }), { uv: false });
    // lockers
    for (var i = 0; i < 4; i++) { addBox(9 + i * 0.62, 0, 41.6, 0.6, 2.0, 0.55, std({ color: '#4a5a52', metalness: 0.6, roughness: 0.5, map: T.metal() }), { collide: true, uv: false }); }
    table(10.5, 33.8, 1.8, 0.9, 0.8, mats.darkwood);
    W.item('file_guard', 'file', 10.0, 0.8, 33.8, { file: 'guard' });
    W.item('hg_ammo_g', 'hg_ammo', 11.1, 0.8, 33.6, { amount: 15 });
    W.item('herb_g', 'herb', 14.2, 0, 31.0);
    W.item('sg_ammo_g', 'sg_ammo', 12.0, 0, 41.2, { amount: 6 });
    // crates
    addBox(13.8, 0, 40.6, 1.2, 0.9, 1.2, std({ map: T.wood(), color: '#8a6a3a', roughness: 0.8 }), { collide: true });
    addBox(13.9, 0.9, 40.7, 0.8, 0.7, 0.8, std({ map: T.wood(), color: '#7a5a3a', roughness: 0.8 }), { collide: true });
    var radio = addBox(10.9, 0.8, 34.0, 0.35, 0.2, 0.22, std({ color: '#2a2a22', metalness: 0.4 }), { uv: false });
  }
  function buildLab() {
    // strip lights
    [[-6, 52], [6, 52], [-6, 64], [6, 64], [0, 58]].forEach(function (p, i) {
      var tube = new THREE.Mesh(Mo.box(0.25, 0.08, 2.4), std({ color: '#fff', emissive: '#d8f0ff', emissiveIntensity: 1.6 })); tube.position.set(p[0], 5.9, p[1]); scene.add(tube);
      if (i < 3) light(p[0], 5.3, p[1], '#b8e0ff', 1.6, 16, i === 1 ? 'fluoro' : null, 'lab');
      if (i === 1) W.flicker[W.flicker.length - 1].mesh = tube;
    });
    light(0, 1.5, 62, '#30ff90', 1.5, 12, 'pulse', 'lab');
    // pipes
    for (var k = 0; k < 4; k++) { var pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 26, 10), mats.metal); pipe.rotation.x = Math.PI / 2; pipe.position.set(-10.5 + k * 0.4, 5.3, 59); scene.add(pipe); }
    // specimen tanks along the walls
    W.specimens = [];
    [[-10.3, 51], [-10.3, 56], [10.3, 51], [10.3, 56], [-10.3, 67], [10.3, 67]].forEach(function (p, i) { tank(p[0], p[1], 0.85, 2.6, i + 50, i % 3 !== 2); });
    // central tank (boss)
    W.bossTank = tank(0, 62, 1.6, 3.6, 999, false);
    // consoles
    [[-6, 70.8], [6, 70.8], [-3, 49]].forEach(function (p, i) {
      addBox(p[0], 0, p[1], 2.2, 0.95, 0.8, mats.metal, { collide: true });
      var scr = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.55), std({ map: T.screen(i), emissive: '#ffffff', emissiveMap: T.screen(i), emissiveIntensity: 0.8 }));
      scr.position.set(p[0], 1.35, p[1] + (i === 2 ? 0.25 : -0.25)); scr.rotation.y = i === 2 ? 0 : Math.PI; scene.add(scr);
      addBox(p[0], 0.95, p[1] + (i === 2 ? 0.25 : -0.25) * 0, 0.9, 0.7, 0.08, std({ color: '#222' }), { uv: false });
    });
    // surgical table
    addBox(6, 0, 60, 2.0, 0.9, 0.8, mats.metal, { collide: true });
    var sheet = addBox(6, 0.9, 60, 1.9, 0.12, 0.75, std({ color: '#c8c8c0', map: T.cloth('#c8c8c0', true, 9), roughness: 1 }), { uv: false });
    var corpse = Mo.specimen(77); corpse.root.position.set(5.1, 1.05, 60); corpse.root.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); scene.add(corpse.root); NF.anim.apply(corpse, NF.anim.base(), 1);
    // locker with the magnum
    addBox(-11.5, 0, 59, 0.6, 2.0, 1.4, std({ color: '#3a4a5a', metalness: 0.6, roughness: 0.5 }), { collide: true });
    W.item('magnum', 'magnum', -10.9, 1.05, 59, { name: 'Bulldog .50 Magnum' });
    addBox(-10.9, 0, 59, 0.6, 1.0, 1.0, mats.metal, { collide: true });
    W.item('mag_ammo_l', 'mag_ammo', -10.9, 1.0, 58.75, { amount: 6 });
    W.item('spray_l', 'spray', 9.8, 0, 47.6);
    W.item('sg_ammo_lab', 'sg_ammo', -6.4, 0.95, 70.8, { amount: 8 });
    W.item('file_crane', 'file', 5.6, 0.95, 70.6, { file: 'crane' });
    decal(2, 60, 2.2, 51); decal(-3, 66, 1.4, 52); decal(4, 52, 1.0, 53);
    // hazard floor markings at exit
    addBox(0, 0, 71.6, 3.4, 0.01, 0.4, std({ color: '#c0a020', roughness: 0.6 }), { uv: false, cast: false });
  }
  function tank(x, z, r, h, seed, withBody) {
    var g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    var base = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.15, r + 0.2, 0.4, 20), mats.metal); base.position.y = 0.2; g.add(base);
    var top = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.15, r + 0.1, 0.4, 20), mats.metal); top.position.y = h + 0.2; g.add(top);
    var liq = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.02, r - 0.02, h - 0.1, 20, 1, true), mats.liquid); liq.position.y = 0.4 + (h - 0.1) / 2; g.add(liq);
    var glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24, 1, true), mats.glass); glass.position.y = 0.4 + h / 2; g.add(glass);
    base.castShadow = top.castShadow = true;
    var spec = null;
    if (withBody) {
      spec = Mo.specimen(seed); spec.root.position.set(0, 0.6, 0); spec.root.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2; spec.root.scale.setScalar(0.9); g.add(spec.root);
      var pose = NF.anim.base(); pose.head = [0.5, 0, 0.3]; pose.shL = [0.2, 0, 0.5]; pose.shR = [0.3, 0, -0.4]; pose.hipL = [-0.3, 0, 0]; pose.knL = [0.6, 0, 0]; pose.spine = [0.3, 0, 0];
      NF.anim.apply(spec, pose, 1);
      W.anims.push(function (t) { spec.root.position.y = 0.6 + Math.sin(t * 0.6 + seed) * 0.08; spec.root.rotation.z = Math.sin(t * 0.4 + seed) * 0.05; });
    }
    // bubbles
    var bm = new THREE.MeshBasicMaterial({ color: '#b0ffd0', transparent: true, opacity: 0.5 });
    var bubbles = [];
    for (var i = 0; i < 10; i++) { var b = new THREE.Mesh(Mo.sphere(0.02 + Math.random() * 0.03, 6, 5), bm); b.position.set((Math.random() - .5) * r, Math.random() * h, (Math.random() - .5) * r); g.add(b); bubbles.push(b); }
    W.anims.push(function (t, dt) { bubbles.forEach(function (b) { b.position.y += dt * 0.5; if (b.position.y > h) b.position.y = 0.5; }); });
    collider(x - r - 0.15, x + r + 0.15, z - r - 0.15, z + r + 0.15, 0, h + 0.4, 'tank');
    return { g: g, glass: glass, liq: liq, spec: spec, r: r, h: h, x: x, z: z, box: W.boxes[W.boxes.length - 1] };
  }
  // dust motes drifting in the light
  W.dust = function () {
    var n = 900, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { var r = W.rooms[(Math.random() * W.rooms.length) | 0]; pos[i * 3] = r.x0 + Math.random() * (r.x1 - r.x0); pos[i * 3 + 1] = Math.random() * r.h; pos[i * 3 + 2] = r.z0 + Math.random() * (r.z1 - r.z0); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#c8b8a0', size: 0.025, transparent: true, opacity: 0.5, depthWrite: false }));
    scene.add(pts);
    W.anims.push(function (t, dt) { var p = geo.attributes.position.array; for (var i = 0; i < n; i++) { p[i * 3 + 1] -= dt * 0.03; p[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.02; if (p[i * 3 + 1] < 0) p[i * 3 + 1] = 4; } geo.attributes.position.needsUpdate = true; });
  };
  // -------------------------------------------------------------- queries
  W.roomAt = function (x, z) { for (var i = 0; i < W.rooms.length; i++) { var r = W.rooms[i]; if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r; } return null; };
  W.collide = function (p, rad, y0) {
    y0 = y0 || 0.3;
    for (var i = 0; i < W.boxes.length; i++) {
      var b = W.boxes[i]; if (!b.on || b.y1 < y0 || b.y0 > 1.6) continue;
      var cx = Math.max(b.x0, Math.min(p.x, b.x1)), cz = Math.max(b.z0, Math.min(p.z, b.z1));
      var dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < rad * rad) {
        if (d2 > 1e-8) { var d = Math.sqrt(d2), push = rad - d; p.x += dx / d * push; p.z += dz / d * push; }
        else { // centre inside: push out along the shallowest axis
          var l = p.x - b.x0, r = b.x1 - p.x, n = p.z - b.z0, f = b.z1 - p.z, m = Math.min(l, r, n, f);
          if (m === l) p.x = b.x0 - rad; else if (m === r) p.x = b.x1 + rad; else if (m === n) p.z = b.z0 - rad; else p.z = b.z1 + rad;
        }
      }
    }
  };
  // ray vs boxes. returns distance or Infinity
  W.ray = function (o, d, max, skipLow) {
    var best = max || 100;
    for (var i = 0; i < W.boxes.length; i++) {
      var b = W.boxes[i]; if (!b.on) continue;
      var tmin = 0, tmax = best, ok = true;
      var mins = [b.x0, b.y0, b.z0], maxs = [b.x1, b.y1, b.z1], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
      for (var a = 0; a < 3; a++) {
        if (Math.abs(dd[a]) < 1e-9) { if (oo[a] < mins[a] || oo[a] > maxs[a]) { ok = false; break; } }
        else { var t1 = (mins[a] - oo[a]) / dd[a], t2 = (maxs[a] - oo[a]) / dd[a]; if (t1 > t2) { var tt = t1; t1 = t2; t2 = tt; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) { ok = false; break; } }
      }
      if (ok && tmin < best && tmin > 0) best = tmin;
    }
    // floor / ceiling
    if (d.y < -1e-6) { var tf = -o.y / d.y; if (tf > 0 && tf < best) best = tf; }
    var room = W.roomAt(o.x, o.z); if (room && d.y > 1e-6) { var tc = (room.h - o.y) / d.y; if (tc > 0 && tc < best) best = tc; }
    return best;
  };
  W.lineClear = function (a, b) { var d = new THREE.Vector3().subVectors(b, a), len = d.length(); d.divideScalar(len); return W.ray(a, d, len) >= len - 0.05; };
  // room graph path: returns next waypoint toward target
  W.nextWaypoint = function (from, to, canOpen) {
    var ra = W.roomAt(from.x, from.z), rb = W.roomAt(to.x, to.z);
    if (!ra || !rb || ra === rb) return null;
    var q = [ra.id], prev = {}; prev[ra.id] = null;
    while (q.length) {
      var cur = q.shift(); if (cur === rb.id) break;
      W.doors.forEach(function (d) {
        if (!d.open && !(canOpen && !d.lock && !d.never)) return;
        var other = d.a === cur ? d.b : d.b === cur ? d.a : null;
        if (other && !(other in prev)) { prev[other] = { room: cur, door: d }; q.push(other); }
      });
      if (cur === 'hall' && W.breakWall && !W.breakWall.userData.box.on) { /* hole leads nowhere */ }
    }
    if (!(rb.id in prev)) return null;
    var step = rb.id, door = null;
    while (prev[step] && prev[step].room !== ra.id) step = prev[step].room;
    door = prev[step] && prev[step].door;
    if (!door) return null;
    return door;
  };
  W.update = function (t, dt) {
    updateDoors(dt);
    for (var i = 0; i < W.anims.length; i++) W.anims[i](t, dt);
    W.flicker.forEach(function (f) {
      var l = f.l, b = l.userData.base, s = f.seed;
      if (f.kind === 'candle') l.intensity = b * (0.85 + 0.1 * Math.sin(t * 9 + s) + 0.06 * Math.sin(t * 23 + s * 2));
      else if (f.kind === 'fire') l.intensity = b * (0.75 + 0.2 * Math.sin(t * 7 + s) + 0.12 * Math.sin(t * 17));
      else if (f.kind === 'broken') l.intensity = Math.sin(t * 31 + s) > 0.6 || Math.sin(t * 0.7) > 0.4 ? b : b * 0.1;
      else if (f.kind === 'fluoro') { var on = !(Math.sin(t * 1.3 + s) > 0.85 && Math.sin(t * 40) > 0); l.intensity = on ? b : 0.05; if (f.mesh) f.mesh.material.emissiveIntensity = on ? 1.6 : 0.1; }
      else if (f.kind === 'pulse') l.intensity = b * (0.7 + 0.3 * Math.sin(t * 1.5));
      else if (f.kind === 'lamp') l.intensity = b * (0.97 + 0.03 * Math.sin(t * 50));
    });
    W.items.forEach(function (it) { if (!it.taken) { var k = 0.18 + 0.1 * Math.abs(Math.sin(t * 2.5 + it.x)); it.spark.scale.set(k, k, k); it.spark.material.rotation = t; } });
  };
  return W;
})();
