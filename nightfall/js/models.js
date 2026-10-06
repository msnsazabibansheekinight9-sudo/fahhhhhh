// Procedural characters and creatures: jointed rigs built from lathed, tapered limbs.
var NF = window.NF || (window.NF = {});
NF.models = (function () {
  var M = {};
  var V2 = THREE.Vector2;
  var geoCache = {};
  function lathe(prof, seg, key) {
    if (key && geoCache[key]) return geoCache[key];
    var pts = prof.map(function (p) { return new V2(Math.max(0.0005, p[0]), p[1]); });
    var g = new THREE.LatheGeometry(pts, seg || 14);
    g.computeVertexNormals();
    if (key) geoCache[key] = g;
    return g;
  }
  // Tapered capsule hanging from y=0 down to y=-len.
  function limb(rt, rb, len, seg) {
    var key = 'L' + rt + '_' + rb + '_' + len + '_' + (seg || 12);
    if (geoCache[key]) return geoCache[key];
    var p = [], i, a;
    for (i = 0; i <= 5; i++) { a = Math.PI - i / 5 * Math.PI / 2; p.push([rb * Math.sin(a), -len + rb + rb * Math.cos(a)]); }
    for (i = 0; i <= 5; i++) { a = Math.PI / 2 - i / 5 * Math.PI / 2; p.push([rt * Math.sin(a), -rt + rt * Math.cos(a)]); }
    return (geoCache[key] = lathe(p, seg || 12));
  }
  M.limb = limb; M.lathe = lathe;
  var sph = {};
  function sphere(r, w, h) { var k = r + '_' + (w || 16); return sph[k] || (sph[k] = new THREE.SphereGeometry(r, w || 16, h || 12)); }
  function box(x, y, z) { var k = 'b' + x + '_' + y + '_' + z; return geoCache[k] || (geoCache[k] = new THREE.BoxGeometry(x, y, z)); }
  M.box = box; M.sphere = sphere;
  function std(o) {
    var m = new THREE.MeshStandardMaterial(o);
    if (o && o.color !== undefined && !o.keepColor) m.color.convertSRGBToLinear();
    if (o && o.emissive !== undefined) m.emissive.convertSRGBToLinear();
    return m;
  }
  M.std = std;
  function mesh(parent, geo, mat, x, y, z, sx, sy, sz, rx, ry, rz) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (sx !== undefined) m.scale.set(sx, sy, sz);
    if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true;
    parent.add(m); return m;
  }
  M.mesh = mesh;
  function grp(parent, x, y, z) { var g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }
  M.grp = grp;

  // ---------------------------------------------------------------- humanoid
  M.human = function (o) {
    o = o || {};
    var T = NF.tex, seed = o.seed || ((Math.random() * 1e6) | 0), r = T.rnd(seed);
    var root = new THREE.Group();
    var body = grp(root); var h = o.h || 1; body.scale.setScalar(h);
    var J = {};
    function joint(name, parent, x, y, z) { var g = grp(parent, x, y, z); g.name = name; J[name] = g; return g; }
    var zombie = !!o.zombie, fem = !!o.female;
    var skinMat = o.skinMat || std({ map: T.skin(o.skin || '#c99a7c', zombie, seed % 7 + 1), roughness: zombie ? 0.75 : 0.55, metalness: 0 });
    var topMat = o.topMat || std({ map: T.cloth(o.top || '#555', zombie || o.dirty, seed % 9 + 1), roughness: 0.9 });
    var botMat = o.botMat || std({ map: T.cloth(o.bottom || '#223', zombie || o.dirty, seed % 5 + 11), roughness: 0.92 });
    var shoeMat = std({ color: o.shoes || '#141210', roughness: 0.5, metalness: 0.1 });
    var handMat = o.gloves ? std({ color: o.gloves, roughness: 0.6 }) : skinMat;
    var sleeveMat = o.shortSleeve ? skinMat : topMat;
    var sw = fem ? 0.165 : 0.19, hw = fem ? 0.1 : 0.092;
    var hips = joint('hips', body, 0, 0.94, 0);
    mesh(hips, lathe([[0, -0.13], [0.12, -0.11], [0.15, -0.03], [0.145, 0.06], [0.13, 0.1], [0, 0.11]], 16, 'pelvis'), botMat, 0, 0, 0, fem ? 1.08 : 1, 1, 0.72);
    var spine = joint('spine', hips, 0, 0.08, 0);
    mesh(spine, lathe([[0, -0.06], [0.135, -0.05], [0.125, 0.06], [0.145, 0.17], [0, 0.19]], 16, 'abdo'), topMat, 0, 0, 0, fem ? 0.9 : 1, 1, 0.66);
    var chest = joint('chest', spine, 0, 0.17, 0);
    mesh(chest, lathe([[0, -0.03], [0.145, -0.01], [0.175, 0.1], [0.195, 0.2], [0.17, 0.28], [0.07, 0.315], [0, 0.32]], 16, 'chest'), topMat, 0, 0, 0, sw / 0.19, 1, 0.64);
    if (fem) { mesh(chest, sphere(0.062), topMat, 0.06, 0.13, 0.085, 1, 0.9, 0.8); mesh(chest, sphere(0.062), topMat, -0.06, 0.13, 0.085, 1, 0.9, 0.8); }
    var neck = joint('neck', chest, 0, 0.3, 0);
    mesh(neck, limb(0.048, 0.052, 0.12), skinMat, 0, 0.11, 0);
    var head = joint('head', neck, 0, 0.08, 0.005);
    var hg = grp(head, 0, 0, 0); J.headMesh = hg;
    mesh(hg, sphere(0.1, 20, 16), skinMat, 0, 0.11, 0, fem ? 0.84 : 0.88, 1.1, 1);
    var jaw = joint('jaw', hg, 0, 0.075, 0.01);
    mesh(jaw, sphere(0.066), skinMat, 0, -0.022, 0.012, fem ? 0.9 : 0.98, 0.72, 1.0);
    mesh(hg, sphere(0.032), skinMat, 0.04, 0.09, 0.055, 1, 0.9, 0.8); mesh(hg, sphere(0.032), skinMat, -0.04, 0.09, 0.055, 1, 0.9, 0.8);
    if (zombie || o.teeth) { mesh(jaw, box(0.06, 0.012, 0.02), std({ color: '#c8b88a', roughness: 0.4 }), 0, 0.005, 0.082); mesh(hg, box(0.06, 0.012, 0.02), std({ color: '#c8b88a', roughness: 0.4 }), 0, 0.072, 0.09); }
    mesh(hg, box(0.05, 0.008, 0.02), std({ color: zombie ? '#1a0505' : '#7a3a34', roughness: 0.5 }), 0, 0.065, 0.088);
    mesh(hg, lathe([[0, 0], [0.016, 0.005], [0.012, 0.045], [0, 0.05]], 8, 'nose'), skinMat, 0, 0.085, 0.092, 1, 1, 1.2, -0.35);
    mesh(hg, box(0.085, 0.016, 0.03), skinMat, 0, 0.145, 0.078);
    var eyeW = std({ color: zombie ? '#cfd3c0' : '#eeeae0', roughness: 0.15, emissive: zombie ? '#202814' : '#000' });
    var eyeP = std({ color: o.eyes || (zombie ? '#9aa090' : '#2a1a10'), roughness: 0.1 });
    [-1, 1].forEach(function (s) {
      if (zombie) mesh(hg, sphere(0.024, 10, 8), std({ color: '#2a1414', roughness: 0.9 }), s * 0.034, 0.124, 0.07, 1, 0.8, 0.6);
      mesh(hg, sphere(0.016, 10, 8), eyeW, s * 0.034, 0.122, 0.078);
      mesh(hg, sphere(0.0085, 8, 6), eyeP, s * 0.034, 0.122, 0.092);
      mesh(hg, sphere(0.03, 8, 6), skinMat, s * 0.088, 0.11, -0.005, 0.38, 1, 0.7);
    });
    // hair
    var hairMat = std({ color: o.hairColor || '#2a1a10', roughness: 0.85 });
    var hs = o.hair || 'short';
    var capG = new THREE.SphereGeometry(0.108, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.42);
    if (hs !== 'bald') {
      if (hs === 'balding') {
        mesh(hg, new THREE.SphereGeometry(0.107, 16, 10, Math.PI * 0.6, Math.PI * 1.8, Math.PI * 0.35, Math.PI * 0.3), hairMat, 0, 0.11, 0, 0.9, 1.1, 1.03);
      } else {
        var cap = mesh(hg, capG, hairMat, 0, 0.122, -0.008, fem ? 0.88 : 0.91, 1.1, 1.06, -0.38);
        mesh(hg, sphere(0.1), hairMat, 0, 0.1, -0.035, fem ? 0.87 : 0.89, 1.04, 0.92);
      }
      if (hs === 'ponytail') {
        var pt = joint('pony', hg, 0, 0.16, -0.095);
        mesh(pt, sphere(0.03), hairMat, 0, 0, 0);
        mesh(pt, limb(0.032, 0.012, 0.26), hairMat, 0, 0, -0.01, 1, 1, 0.8, 0.35);
      } else if (hs === 'long' || hs === 'bob') {
        var len = hs === 'long' ? 0.3 : 0.16;
        mesh(hg, limb(0.1, 0.085, len + 0.1), hairMat, 0, 0.17, -0.04, 1, 1, 0.55, -0.12);
      } else if (hs === 'slick') {
        mesh(hg, sphere(0.05), hairMat, 0, 0.2, 0.0, 1.6, 0.5, 1.8);
      }
    }
    if (o.cap) { mesh(hg, capG, std({ color: o.cap, roughness: 0.7 }), 0, 0.13, 0, 0.98, 0.9, 1.08); mesh(hg, box(0.15, 0.012, 0.09), std({ color: o.cap }), 0, 0.165, 0.11, 1, 1, 1, 0.2); }
    // arms
    [['L', 1], ['R', -1]].forEach(function (a) {
      var sd = a[0], s = a[1];
      var sh = joint('sh' + sd, chest, s * sw, 0.245, 0);
      mesh(sh, sphere(0.062), o.shoulderMat || topMat, 0, -0.01, 0, 1, 1, 1);
      mesh(sh, limb(0.056, 0.046, 0.3), sleeveMat, 0, 0, 0);
      var el = joint('el' + sd, sh, 0, -0.28, 0);
      mesh(el, limb(0.046, 0.034, 0.26), o.rolled ? skinMat : sleeveMat, 0, 0.0, 0);
      mesh(el, sphere(0.047, 10, 8), o.rolled ? skinMat : sleeveMat, 0, 0, 0);
      var wr = joint('wr' + sd, el, 0, -0.245, 0);
      mesh(wr, limb(0.036, 0.03, 0.1), handMat, 0, 0.005, 0, 1, 1, 0.5);
      mesh(wr, limb(0.013, 0.011, 0.05), handMat, s * 0.03, -0.01, 0.015, 1, 1, 1, 0.3, 0, -s * 0.4);
      if (o.claws) { for (var c = -1; c <= 1; c++) mesh(wr, limb(0.008, 0.002, 0.11), std({ color: '#d8d0b0', roughness: 0.3 }), c * 0.016, -0.08, 0.01, 1, 1, 1, -0.3); }
      // legs
      var hp = joint('hip' + sd, hips, s * hw, -0.06, 0);
      mesh(hp, limb(0.078, 0.056, 0.42), botMat, 0, 0.02, 0);
      var kn = joint('kn' + sd, hp, 0, -0.41, 0);
      mesh(kn, limb(0.056, 0.04, 0.42), o.bootsHigh ? shoeMat : botMat, 0, 0.01, 0);
      mesh(kn, sphere(0.058, 10, 8), o.bootsHigh ? shoeMat : botMat, 0, 0.005, 0.005);
      var an = joint('an' + sd, kn, 0, -0.4, 0);
      mesh(an, box(0.095, 0.075, 0.25), shoeMat, 0, -0.035, 0.045);
      mesh(an, box(0.1, 0.02, 0.26), std({ color: '#0a0a0a', roughness: 0.9 }), 0, -0.07, 0.045);
    });
    // clothing extras
    if (o.vest) {
      var vm = std({ color: o.vest, roughness: 0.85, side: THREE.DoubleSide });
      mesh(chest, lathe([[0.16, -0.01], [0.188, 0.1], [0.207, 0.2], [0.185, 0.275], [0.11, 0.3]], 16, 'vest'), vm, 0, 0, 0, sw / 0.19 * 1.04, 1, 0.74);
      var pm = std({ color: o.vest, roughness: 0.9 });
      for (var pi = -1; pi <= 1; pi++) { mesh(chest, box(0.075, 0.09, 0.04), pm, pi * 0.085, 0.06, 0.135); mesh(chest, box(0.078, 0.025, 0.045), pm, pi * 0.085, 0.105, 0.137); }
      mesh(chest, box(0.11, 0.035, 0.005), std({ color: '#d8d8d8', emissive: '#111' }), 0.08, 0.205, 0.148, 1, 1, 1, -0.3);
      mesh(chest, box(0.05, 0.3, 0.02), pm, 0.1, 0.16, -0.135); mesh(chest, box(0.05, 0.3, 0.02), pm, -0.1, 0.16, -0.135);
    }
    if (o.badge) mesh(chest, box(0.035, 0.045, 0.01), std({ color: '#d4b04a', metalness: 0.9, roughness: 0.3 }), 0.08, 0.2, 0.125);
    if (o.tie) mesh(chest, box(0.035, 0.2, 0.01), std({ color: o.tie }), 0, 0.17, 0.125);
    if (o.holster) { var hm = std({ color: '#111', roughness: 0.6 }); mesh(J.hipR, box(0.06, 0.16, 0.12), hm, -0.07, -0.12, 0.02); mesh(J.hipR, box(0.05, 0.12, 0.04), std({ color: '#222', metalness: 0.6, roughness: 0.4 }), -0.075, -0.06, 0.06); }
    if (o.belt) mesh(hips, lathe([[0.152, 0.03], [0.155, 0.08]], 16, 'belt'), std({ color: o.belt, roughness: 0.5, side: THREE.DoubleSide }), 0, 0, 0, fem ? 1.08 : 1, 1, 0.74);
    if (o.coat) {
      var cm = std({ map: T.cloth(o.coat, zombie || o.dirty, seed % 3 + 21), roughness: 0.85, side: THREE.DoubleSide });
      mesh(chest, lathe([[0.17, -0.04], [0.2, 0.1], [0.215, 0.2], [0.19, 0.29], [0.08, 0.33]], 16, 'coatT'), cm, 0, 0, 0, sw / 0.19, 1, 0.7);
      var skirt = joint('skirt', hips, 0, 0.1, 0);
      var L = o.coatLen || 0.55;
      mesh(skirt, lathe([[0.2 + L * 0.12, -L], [0.175, -L * 0.4], [0.16, 0]], 18, 'coatS' + L), cm, 0, 0, 0, fem ? 1.08 : 1, 1, 0.78);
      [-1, 1].forEach(function (s) { J['sh' + (s > 0 ? 'L' : 'R')].children[1].material = cm; J['el' + (s > 0 ? 'L' : 'R')].children[0].material = cm; });
    }
    if (o.apron) {
      var am = std({ map: T.cloth(o.apron, true, seed % 4 + 31), roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide });
      mesh(chest, new THREE.CylinderGeometry(0.2, 0.17, 0.3, 14, 1, true, -1.1, 2.2), am, 0, 0.13, 0.0, sw / 0.19, 1, 0.72);
      var ap = joint('apron', hips, 0, 0.06, 0);
      mesh(ap, new THREE.CylinderGeometry(0.17, 0.22, 0.78, 16, 1, true, -1.25, 2.5), am, 0, -0.36, 0.01, fem ? 1.08 : 1, 1, 0.82);
    }
    if (o.mask) {
      var mm = std({ color: '#3a3532', metalness: 0.85, roughness: 0.45 });
      for (var b = 0; b < 5; b++) mesh(hg, box(0.012, 0.18, 0.012), mm, -0.06 + b * 0.03, 0.11, 0.115, 1, 1, 1, 0.08);
      mesh(hg, lathe([[0.112, 0], [0.112, 0.02]], 18, 'ring'), std({ color: '#2a2522', metalness: 0.9, roughness: 0.4, side: THREE.DoubleSide }), 0, 0.12, 0, 1, 1, 1.15);
      mesh(hg, lathe([[0.112, 0], [0.112, 0.02]], 18, 'ring'), mm, 0, 0.04, 0.005, 0.95, 1, 1.12);
      mesh(hg, sphere(0.015), std({ color: '#ff3300', emissive: '#ff2000', emissiveIntensity: 2 }), 0.035, 0.125, 0.09);
      mesh(hg, sphere(0.015), std({ color: '#ff3300', emissive: '#ff2000', emissiveIntensity: 2 }), -0.035, 0.125, 0.09);
    }
    if (o.chains) {
      var chm = std({ color: '#4a4440', metalness: 0.9, roughness: 0.5 });
      var tg = new THREE.TorusGeometry(0.025, 0.007, 6, 10);
      for (var k = 0; k < 18; k++) { var t = k / 18; var m = mesh(chest, tg, chm, -0.19 + t * 0.38, 0.27 - t * 0.3, 0.14 + Math.sin(t * 3.14) * 0.02, 1, 1, 1, 0, k % 2 ? 1.57 : 0, -0.7); }
    }
    if (o.brain) {
      var bm = std({ map: T.flesh(), color: '#ff9a9a', roughness: 0.35, emissive: '#200000' });
      for (var q = 0; q < 14; q++) { var aa = r() * 6.28, bb = r() * 1.2; mesh(hg, sphere(0.04 + r() * 0.02, 10, 8), bm, Math.cos(aa) * Math.sin(bb) * 0.08, 0.16 + Math.cos(bb) * 0.06, -0.02 + Math.sin(aa) * Math.sin(bb) * 0.08); }
    }
    if (o.tongue) {
      var tm = std({ color: '#8a2a3a', roughness: 0.3, emissive: '#200008' });
      var prev = joint('tongue', jaw, 0, 0.0, 0.07); J.tongueSegs = [];
      for (var ts = 0; ts < 10; ts++) { var seg = grp(prev, 0, 0, ts ? 0.09 : 0); mesh(seg, limb(0.016, 0.012, 0.1), tm, 0, 0, 0, 1, 1, 1, Math.PI / 2); J.tongueSegs.push(seg); prev = seg; }
      J.tongue.scale.set(1, 1, 0.05);
    }
    if (o.wounds) {
      var wm = std({ color: '#2a0303', roughness: 0.25 });
      var parts = [chest, spine, J.hipL, J.elR, J.shL, hg];
      for (var w = 0; w < o.wounds; w++) { var pp = parts[(r() * parts.length) | 0]; mesh(pp, sphere(0.02 + r() * 0.02, 8, 6), wm, (r() - .5) * 0.16, (r() - 0.6) * 0.2 + (pp === hg ? 0.12 : 0), 0.07 + r() * 0.05, 1 + r() * 0.6, 0.7 + r() * 0.6, 0.25); }
    }
    if (o.ribs) {
      var bone = std({ color: '#d8ccb0', roughness: 0.5 });
      for (var rb = 0; rb < 4; rb++) mesh(chest, new THREE.TorusGeometry(0.11, 0.008, 5, 12, 1.5), bone, 0.02, 0.06 + rb * 0.045, 0.06, 1, 1, 1, Math.PI / 2, 0, -0.4);
      mesh(chest, sphere(0.07), std({ color: '#4a0808', roughness: 0.3 }), 0.06, 0.12, 0.09, 1, 1.3, 0.4);
    }
    root.traverse(function (c) { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; } });
    var hits = [
      { j: J.head, off: new THREE.Vector3(0, 0.11, 0.0), r: 0.13, part: 'head' },
      { j: J.chest, off: new THREE.Vector3(0, 0.14, 0), r: 0.2, part: 'body' },
      { j: J.spine, off: new THREE.Vector3(0, 0.06, 0), r: 0.17, part: 'body' },
      { j: J.hips, off: new THREE.Vector3(0, -0.02, 0), r: 0.16, part: 'body' },
      { j: J.hipL, off: new THREE.Vector3(0, -0.2, 0), r: 0.09, part: 'leg' },
      { j: J.hipR, off: new THREE.Vector3(0, -0.2, 0), r: 0.09, part: 'leg' },
      { j: J.knL, off: new THREE.Vector3(0, -0.2, 0), r: 0.08, part: 'leg' },
      { j: J.knR, off: new THREE.Vector3(0, -0.2, 0), r: 0.08, part: 'leg' },
      { j: J.elL, off: new THREE.Vector3(0, -0.1, 0), r: 0.07, part: 'arm' },
      { j: J.elR, off: new THREE.Vector3(0, -0.1, 0), r: 0.07, part: 'arm' }
    ];
    return { root: root, body: body, J: J, hits: hits, scale: h, skinMat: skinMat, kind: 'human' };
  };

  // Presets ---------------------------------------------------------------
  M.mara = function () {
    return M.human({ female: true, skin: '#d4a587', top: '#263240', bottom: '#2b3038', shoes: '#141414', bootsHigh: true, hair: 'ponytail', hairColor: '#2e1b10', vest: '#3c4330', gloves: '#1b1b1b', holster: true, belt: '#1a1a1a', seed: 1201, eyes: '#3a5a3a' });
  };
  M.teo = function () {
    return M.human({ skin: '#a9714c', top: '#2b3a58', bottom: '#1c2232', hair: 'short', hairColor: '#120c08', badge: true, belt: '#111', holster: true, dirty: true, wounds: 3, seed: 501, tie: '#111' });
  };
  M.crane = function () {
    return M.human({ skin: '#cfae98', top: '#8a8f99', bottom: '#2a2a2a', hair: 'balding', hairColor: '#aaa49a', coat: '#d8d6cf', coatLen: 0.6, tie: '#5a1010', seed: 777 });
  };
  var ZOMBIE_LOOKS = [
    { name: 'butler', top: '#f0ece0', coat: '#141414', coatLen: 0.3, bottom: '#141414', hair: 'slick', hairColor: '#3a3a3a', tie: '#111' },
    { name: 'maid', female: true, top: '#1a1a1a', bottom: '#1a1a1a', apron: '#d8d4c8', hair: 'bob', hairColor: '#3a2412' },
    { name: 'scientist', top: '#6a7a8a', coat: '#d0cdc4', coatLen: 0.6, bottom: '#333', hair: 'balding', hairColor: '#666' },
    { name: 'guard', top: '#3a4030', bottom: '#2a2e22', hair: 'short', hairColor: '#1a1208', cap: '#2a2e22', belt: '#111', badge: true },
    { name: 'police', top: '#2b3a58', bottom: '#1c2232', hair: 'short', hairColor: '#111', badge: true, belt: '#111' },
    { name: 'guest', female: true, top: '#5a1a2a', bottom: '#2a1a1a', hair: 'long', hairColor: '#6a4a20', shortSleeve: true },
    { name: 'cook', top: '#e0e0d8', bottom: '#3a3a3a', hair: 'bald', apron: '#c8c4b8', rolled: true },
    { name: 'gardener', top: '#4a5a2a', bottom: '#3a2a1a', hair: 'short', hairColor: '#4a3020', rolled: true, cap: '#5a4a2a' }
  ];
  var ZSKIN = ['#9fa38a', '#a8a08c', '#8c947c', '#b0a898', '#7f8a74', '#9a8a7a'];
  M.zombie = function (variant, seed) {
    var r = NF.tex.rnd(seed || 99);
    var look = ZOMBIE_LOOKS[variant !== undefined ? variant % ZOMBIE_LOOKS.length : (r() * ZOMBIE_LOOKS.length) | 0];
    var o = {}; for (var k in look) o[k] = look[k];
    o.zombie = true; o.skin = ZSKIN[(r() * ZSKIN.length) | 0]; o.seed = seed; o.wounds = 2 + (r() * 5 | 0);
    o.h = 0.94 + r() * 0.12; o.teeth = true; o.ribs = r() < 0.25;
    if (r() < 0.3) o.rolled = true;
    var z = M.human(o); z.look = look.name; return z;
  };
  M.skinner = function () {
    var mm = std({ map: NF.tex.muscle(), color: '#b08080', roughness: 0.32, metalness: 0.05 });
    var z = M.human({ skinMat: mm, topMat: mm, botMat: mm, shoes: '#5a1410', hair: 'bald', claws: true, brain: true, tongue: true, teeth: true, zombie: true, seed: 4242, h: 1.08 });
    z.J.headMesh.children.forEach(function (c) { if (c.geometry && c.geometry.type === 'SphereGeometry' && c.geometry.parameters.radius < 0.02) c.visible = false; });
    return z;
  };
  M.warden = function () {
    var w = M.human({ h: 1.42, skin: '#8f8a84', top: '#2a2b2e', bottom: '#1e1f22', shoes: '#0c0c0c', bootsHigh: true, gloves: '#0e0e0e', hair: 'bald', mask: true, apron: '#4a3420', chains: true, seed: 707, wounds: 2, zombie: false, dirty: true });
    // the cleaver
    var cg = grp(w.J.wrR, 0, -0.07, 0.0); cg.rotation.x = Math.PI / 2;
    mesh(cg, box(0.03, 0.03, 0.22), std({ color: '#2a1a10', roughness: 0.8 }), 0, 0, -0.02);
    var blade = mesh(cg, box(0.012, 0.3, 0.46), std({ color: '#6e6a66', metalness: 0.9, roughness: 0.38, map: NF.tex.metal() }), 0, -0.12, 0.3);
    mesh(cg, box(0.014, 0.08, 0.3), std({ color: '#3a0000', roughness: 0.3 }), 0, -0.24, 0.32);
    w.cleaver = cg;
    return w;
  };

  M.peddler = function () {
    var p = M.human({ skin: '#a48a74', top: '#3a2e26', bottom: '#2a221c', coat: '#2a2420', coatLen: 0.75, hair: 'bald', gloves: '#2a1e18', seed: 4040, h: 1.02, belt: '#4a3420' });
    var hm = std({ map: NF.tex.cloth('#1e1a16', false, 9), roughness: 1, side: THREE.DoubleSide });
    mesh(p.J.headMesh, new THREE.SphereGeometry(0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hm, 0, 0.12, -0.02, 0.98, 1.15, 1.08, -0.3);
    mesh(p.J.headMesh, box(0.2, 0.07, 0.06), std({ color: '#3a2a22', roughness: 1 }), 0, 0.06, 0.08);
    var ey = std({ color: '#ffd080', emissive: '#a07020', emissiveIntensity: 1 }); mesh(p.J.headMesh, sphere(0.012, 6, 5), ey, 0.034, 0.122, 0.092); mesh(p.J.headMesh, sphere(0.012, 6, 5), ey, -0.034, 0.122, 0.092);
    for (var i = 0; i < 6; i++) mesh(p.J.chest, box(0.07, 0.09, 0.04), std({ color: '#4a3826' }), -0.14 + (i % 3) * 0.14, 0.05 + (i / 3 | 0) * 0.1, 0.15);
    var lan = grp(p.J.wrR, 0, -0.12, 0); mesh(lan, box(0.1, 0.14, 0.1), std({ color: '#3a3a30', metalness: 0.6 }), 0, -0.07, 0); mesh(lan, sphere(0.04, 8, 6), std({ color: '#ffd080', emissive: '#ffb040', emissiveIntensity: 2 }), 0, -0.07, 0);
    return p;
  };
  // -------------------------------------------------------------- weapons
  M.weapon = function (kind) {
    var g = new THREE.Group();
    var dark = std({ color: '#1a1b1d', metalness: 0.75, roughness: 0.4 });
    var steel = std({ color: '#5a5d60', metalness: 0.9, roughness: 0.32 });
    var wood = std({ color: '#5a3216', roughness: 0.6, map: NF.tex.wood() });
    var grip = std({ color: '#121212', roughness: 0.85 });
    if (kind === 'handgun') {
      mesh(g, box(0.03, 0.035, 0.2), dark, 0, 0.05, 0.06);
      mesh(g, box(0.028, 0.025, 0.17), steel, 0, 0.025, 0.05);
      mesh(g, box(0.028, 0.12, 0.05), grip, 0, -0.025, -0.025, 1, 1, 1, -0.25);
      mesh(g, box(0.006, 0.03, 0.04), dark, 0, 0.0, 0.03);
      g.userData.muzzle = new THREE.Vector3(0, 0.05, 0.17);
    } else if (kind === 'shotgun') {
      mesh(g, new THREE.CylinderGeometry(0.014, 0.014, 0.7, 10), steel, 0, 0.06, 0.38, 1, 1, 1, Math.PI / 2);
      mesh(g, new THREE.CylinderGeometry(0.012, 0.012, 0.55, 10), dark, 0, 0.035, 0.33, 1, 1, 1, Math.PI / 2);
      mesh(g, box(0.04, 0.05, 0.22), dark, 0, 0.045, 0.02);
      mesh(g, box(0.045, 0.045, 0.16), wood, 0, 0.03, 0.42);
      mesh(g, box(0.035, 0.09, 0.28), wood, 0, -0.01, -0.22, 1, 1, 1, 0.18);
      g.userData.muzzle = new THREE.Vector3(0, 0.06, 0.74);
    } else if (kind === 'magnum') {
      mesh(g, new THREE.CylinderGeometry(0.016, 0.016, 0.24, 10), steel, 0, 0.05, 0.16, 1, 1, 1, Math.PI / 2);
      mesh(g, new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), steel, 0, 0.04, 0.02, 1, 1, 1, Math.PI / 2);
      mesh(g, box(0.03, 0.04, 0.08), steel, 0, 0.045, -0.02);
      mesh(g, box(0.03, 0.11, 0.045), wood, 0, -0.02, -0.04, 1, 1, 1, -0.3);
      g.userData.muzzle = new THREE.Vector3(0, 0.05, 0.29);
    } else if (kind === 'smg') {
      mesh(g, box(0.04, 0.06, 0.32), dark, 0, 0.04, 0.08); mesh(g, new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), steel, 0, 0.05, 0.3, 1, 1, 1, Math.PI / 2);
      mesh(g, box(0.03, 0.16, 0.04), dark, 0, -0.07, 0.12); mesh(g, box(0.03, 0.1, 0.045), grip, 0, -0.04, -0.03, 1, 1, 1, -0.25); mesh(g, box(0.02, 0.04, 0.2), dark, 0, 0.03, -0.18);
      g.userData.muzzle = new THREE.Vector3(0, 0.05, 0.37);
    } else if (kind === 'rifle') {
      mesh(g, new THREE.CylinderGeometry(0.012, 0.014, 0.75, 10), steel, 0, 0.06, 0.48, 1, 1, 1, Math.PI / 2); mesh(g, box(0.045, 0.07, 0.9), wood, 0, 0.02, 0.15);
      mesh(g, box(0.04, 0.1, 0.3), wood, 0, -0.01, -0.36, 1, 1, 1, 0.12); mesh(g, new THREE.CylinderGeometry(0.022, 0.022, 0.3, 10), dark, 0, 0.13, 0.12, 1, 1, 1, Math.PI / 2);
      g.userData.muzzle = new THREE.Vector3(0, 0.06, 0.86);
    } else if (kind === 'gl') {
      mesh(g, new THREE.CylinderGeometry(0.035, 0.035, 0.36, 12), dark, 0, 0.06, 0.3, 1, 1, 1, Math.PI / 2); mesh(g, box(0.05, 0.06, 0.18), dark, 0, 0.04, 0.06); mesh(g, box(0.045, 0.1, 0.32), wood, 0, -0.01, -0.18, 1, 1, 1, 0.15);
      g.userData.muzzle = new THREE.Vector3(0, 0.06, 0.5);
    } else if (kind === 'rpg') {
      mesh(g, new THREE.CylinderGeometry(0.045, 0.045, 0.95, 12), std({ color: '#3a4a2a', roughness: 0.7 }), 0, 0.09, 0.1, 1, 1, 1, Math.PI / 2); mesh(g, box(0.03, 0.12, 0.05), dark, 0, -0.01, 0.05);
      g.userData.muzzle = new THREE.Vector3(0, 0.09, 0.6);
    } else if (kind === 'knife') {
      mesh(g, box(0.025, 0.025, 0.11), grip, 0, 0, -0.02);
      mesh(g, box(0.004, 0.03, 0.17), steel, 0, 0.004, 0.12);
      g.userData.muzzle = new THREE.Vector3(0, 0, 0.2);
    }
    g.traverse(function (c) { if (c.isMesh) c.castShadow = true; });
    return g;
  };

  // ---------------------------------------------------------------- dog
  M.dog = function (seed) {
    var r = NF.tex.rnd(seed || 5);
    var root = new THREE.Group(); var body = grp(root); var J = {};
    var fm = std({ map: NF.tex.flesh(), color: '#9a8070', roughness: 0.6 });
    var fur = std({ map: NF.tex.cloth('#2a2420', true, seed % 5 + 41), roughness: 0.95 });
    function j(n, p, x, y, z) { var g = grp(p, x, y, z); J[n] = g; return g; }
    var torso = j('torso', body, 0, 0.6, 0);
    mesh(torso, limb(0.17, 0.14, 0.78, 14), fur, 0, 0, 0.38, 1, 1, 0.95, Math.PI / 2);
    mesh(torso, sphere(0.12), fm, 0.11, 0.0, 0.05, 0.4, 1, 1.6);
    var bone = std({ color: '#d8ccb0', roughness: 0.5 });
    for (var k = 0; k < 4; k++) mesh(torso, new THREE.TorusGeometry(0.14, 0.008, 5, 10, 1.4), bone, 0.02, 0, 0.12 - k * 0.07, 1, 1, 1, 0, Math.PI / 2, -0.6);
    var neck = j('neck', torso, 0, 0.06, 0.34);
    mesh(neck, limb(0.09, 0.08, 0.22), fur, 0, 0, 0, 1, 1, 1, -2.2);
    var head = j('head', neck, 0, 0.13, 0.15);
    mesh(head, sphere(0.1), fur, 0, 0, 0, 0.95, 0.9, 1.1);
    mesh(head, limb(0.06, 0.045, 0.2), fur, 0, 0.0, 0.05, 1, 1, 1, -Math.PI / 2);
    var jaw = j('jaw', head, 0, -0.04, 0.04);
    mesh(jaw, limb(0.045, 0.035, 0.18), fm, 0, 0, 0, 1, 1, 0.6, -Math.PI / 2);
    var teeth = std({ color: '#e0d8b8', roughness: 0.3 });
    for (var t = 0; t < 5; t++) { mesh(head, new THREE.ConeGeometry(0.008, 0.03, 4), teeth, -0.03 + t * 0.015, -0.04, 0.17, 1, 1, 1, Math.PI); }
    var eye = std({ color: '#ff2a10', emissive: '#ff2000', emissiveIntensity: 1.6 });
    mesh(head, sphere(0.016), eye, 0.05, 0.04, 0.08); mesh(head, sphere(0.016), eye, -0.05, 0.04, 0.08);
    mesh(head, new THREE.ConeGeometry(0.035, 0.09, 6), fur, 0.06, 0.1, -0.02, 1, 1, 0.5, -0.3); mesh(head, new THREE.ConeGeometry(0.035, 0.09, 6), fur, -0.06, 0.1, -0.02, 1, 1, 0.5, -0.3);
    var legs = [['FL', 0.1, 0.3], ['FR', -0.1, 0.3], ['BL', 0.1, -0.32], ['BR', -0.1, -0.32]];
    legs.forEach(function (l) {
      var hp = j('hip' + l[0], torso, l[1], -0.05, l[2]);
      mesh(hp, limb(0.06, 0.04, 0.3), fur, 0, 0, 0);
      var kn = j('kn' + l[0], hp, 0, -0.28, 0);
      mesh(kn, limb(0.035, 0.025, 0.3), fur, 0, 0, 0);
      mesh(kn, sphere(0.035), fur, 0, -0.29, 0.03, 1, 0.6, 1.4);
    });
    var tail = j('tail', torso, 0, 0.06, -0.4);
    mesh(tail, limb(0.03, 0.01, 0.3), fur, 0, 0, 0, 1, 1, 1, 2.3);
    root.traverse(function (c) { if (c.isMesh) c.castShadow = true; });
    var hits = [{ j: J.head, off: new THREE.Vector3(0, 0, 0.05), r: 0.14, part: 'head' }, { j: J.torso, off: new THREE.Vector3(0, 0, 0.1), r: 0.22, part: 'body' }, { j: J.torso, off: new THREE.Vector3(0, 0, -0.22), r: 0.2, part: 'body' }];
    return { root: root, body: body, J: J, hits: hits, scale: 1, kind: 'dog' };
  };

  // ---------------------------------------------------------- final boss
  M.abomination = function () {
    var b = M.human({ h: 1.75, skin: '#b79a8a', top: '#b0aca0', bottom: '#2a2a2a', coat: '#c8c4b8', coatLen: 0.5, hair: 'balding', hairColor: '#888', zombie: true, seed: 999, wounds: 8, teeth: true, ribs: true, dirty: true });
    var J = b.J, fm = std({ map: NF.tex.flesh(), roughness: 0.4, emissive: '#100000' });
    // giant right arm
    J.shR.scale.set(2.1, 1.7, 2.1);
    J.shR.children.forEach(function (c) { if (c.isMesh) c.material = fm; });
    J.elR.children.forEach(function (c) { if (c.isMesh) c.material = fm; });
    J.wrR.children.forEach(function (c) { if (c.isMesh) c.material = fm; });
    for (var c = -1; c <= 1; c++) mesh(J.wrR, limb(0.012, 0.002, 0.16), std({ color: '#e0d6b8', roughness: 0.3 }), c * 0.018, -0.08, 0.01, 1, 1, 1, -0.3);
    var eyeM = std({ color: '#d8c060', emissive: '#a04000', emissiveIntensity: 1.2, roughness: 0.15 });
    var pupil = std({ color: '#050000', roughness: 0.1 });
    var lid = std({ map: NF.tex.flesh(), color: '#8a5048', roughness: 0.5 });
    var r = NF.tex.rnd(17);
    // tumorous mass on the left shoulder and back with eyes
    var mass = grp(J.chest, 0.12, 0.24, -0.06); J.mass = mass;
    for (var i = 0; i < 16; i++) { mesh(mass, sphere(0.06 + r() * 0.07, 12, 10), fm, (r() - .3) * 0.25, (r() - .2) * 0.22, (r() - .7) * 0.2); }
    b.eyes = [];
    for (var e = 0; e < 5; e++) {
      var eg = grp(mass, (r() - .2) * 0.2, 0.02 + r() * 0.2, 0.06 + r() * 0.08);
      mesh(eg, sphere(0.034, 12, 10), eyeM); mesh(eg, sphere(0.012, 8, 6), pupil, 0, 0, 0.03, 0.45, 1.4, 0.6); mesh(eg, new THREE.TorusGeometry(0.034, 0.014, 6, 14), lid, 0, 0, 0.012);
      b.eyes.push(eg);
    }
    var boneM = std({ color: '#e8dcc0', roughness: 0.35 });
    for (var s = 0; s < 6; s++) mesh(J.chest, new THREE.ConeGeometry(0.03, 0.22, 6), boneM, -0.1 + s * 0.04, 0.12 + s * 0.03, -0.14, 1, 1, 1, -1.9);
    // pulsing heart
    var heart = mesh(J.chest, sphere(0.08, 14, 12), std({ color: '#ff3040', emissive: '#ff1020', emissiveIntensity: 1.5, roughness: 0.2 }), -0.03, 0.12, 0.12);
    b.heart = heart;
    b.hits.push({ j: J.chest, off: new THREE.Vector3(-0.03, 0.12, 0.13), r: 0.09, part: 'heart' });
    b.eyes.forEach(function (eg) { b.hits.push({ j: eg, off: new THREE.Vector3(), r: 0.05, part: 'eye', obj: eg }); });
    b.root.traverse(function (c) { if (c.isMesh) c.castShadow = true; });
    return b;
  };

  // Floating lab specimen
  M.specimen = function (seed) {
    var fm = std({ map: NF.tex.flesh(), roughness: 0.5 });
    var s = M.human({ skinMat: fm, topMat: fm, botMat: fm, shoes: '#5a3a38', hair: 'bald', zombie: true, seed: seed, wounds: 4, ribs: seed % 2 === 0, h: 0.95 });
    return s;
  };
  // Suit of armour for the foyer
  M.armour = function () {
    var mm = std({ color: '#8c8a86', metalness: 0.95, roughness: 0.3, map: NF.tex.metal() });
    var a = M.human({ skinMat: mm, topMat: mm, botMat: mm, shoes: '#5a5856', hair: 'bald', seed: 3, h: 1.05 });
    mesh(a.J.headMesh, new THREE.CylinderGeometry(0.115, 0.12, 0.26, 14), mm, 0, 0.11, 0);
    mesh(a.J.headMesh, box(0.16, 0.012, 0.02), std({ color: '#050505' }), 0, 0.13, 0.115);
    var halberd = grp(a.J.wrR, 0, -0.06, 0);
    mesh(halberd, new THREE.CylinderGeometry(0.015, 0.015, 2.2, 8), std({ color: '#3a2412' }), 0, 0.2, 0);
    mesh(halberd, box(0.01, 0.2, 0.26), mm, 0, 1.2, 0.08);
    a.J.shR.rotation.set(-0.5, 0, 0); a.J.elR.rotation.set(-1.0, 0, 0); halberd.rotation.x = 1.5;
    return a;
  };
  return M;
})();
