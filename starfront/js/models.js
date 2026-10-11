// Procedural character models: a shared humanoid rig with per-faction armour styles, legends, weapons and blades.
var SF = window.SF || (window.SF = {});

(function () {
  var M = SF.Models = {};
  var G = M.geo = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
    cone: new THREE.ConeGeometry(0.5, 1, 10),
    sph: new THREE.SphereGeometry(0.5, 14, 10),
    hemi: new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    taper: new THREE.CylinderGeometry(0.42, 0.5, 1, 10),
    skirt: new THREE.CylinderGeometry(0.3, 0.55, 1, 12, 1, true),
    plane: new THREE.PlaneGeometry(1, 1, 1, 4),
    torus: new THREE.TorusGeometry(0.5, 0.12, 6, 14),
    ico: new THREE.IcosahedronGeometry(0.5, 0)
  };
  // cape plane pivot at top edge
  G.plane.translate(0, -0.5, 0);

  var matCache = {};
  M.mat = function (color, rough, metal, extra) {
    var key = color + '|' + (rough == null ? 0.6 : rough) + '|' + (metal || 0) + '|' + (extra || '');
    var m = matCache[key];
    if (m) return m;
    if (extra === 'glow') m = new THREE.MeshBasicMaterial({ color: color });
    else if (extra === 'add') m = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
    else if (extra === 'emis') m = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.9, roughness: 0.4 });
    else if (extra === 'cloth2') m = new THREE.MeshStandardMaterial({ color: color, roughness: rough == null ? 0.9 : rough, metalness: metal || 0, side: THREE.DoubleSide });
    else m = new THREE.MeshStandardMaterial({ color: color, roughness: rough == null ? 0.6 : rough, metalness: metal || 0 });
    matCache[key] = m;
    return m;
  };
  M.cloakMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, transparent: true, opacity: 0.12, roughness: 0.1, metalness: 0.9, depthWrite: false });

  function mesh(geo, mat, parent, px, py, pz, sx, sy, sz, rx, ry, rz, detail) {
    var m = new THREE.Mesh(G[geo] || geo, mat);
    m.position.set(px || 0, py || 0, pz || 0);
    m.scale.set(sx || 1, sy || 1, sz || 1);
    if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true;
    if (detail) m.userData.detail = true;
    parent.add(m);
    return m;
  }
  M.mesh = mesh;
  function grp(parent, x, y, z) { var g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }
  M.grp = grp;

  // ------------------------------------------------------------------ rig
  // Model faces -Z. Character's right is +X.
  function rig(s, opts) {
    opts = opts || {};
    var R = { s: s };
    var root = R.root = new THREE.Group();
    var body = R.body = grp(root, 0, 0, 0);
    var legL = opts.legLen || 0.45;
    var hipsY = legL * 2 * s + 0.05 * s;
    R.hipsY = hipsY;
    R.hips = grp(body, 0, hipsY, 0);
    R.spine = grp(R.hips, 0, 0, 0);
    R.chest = grp(R.spine, 0, (opts.torso || 0.22) * s, 0);
    R.neck = grp(R.chest, 0, 0.36 * s * (opts.neckK || 1), 0);
    R.head = grp(R.neck, 0, 0.1 * s, 0);
    var sw = (opts.shoulder || 0.22) * s;
    R.lSh = grp(R.chest, -sw, 0.3 * s, 0); R.rSh = grp(R.chest, sw, 0.3 * s, 0);
    R.lUA = grp(R.lSh); R.rUA = grp(R.rSh);
    var ua = (opts.arm || 0.29) * s;
    R.lEl = grp(R.lUA, 0, -ua, 0); R.rEl = grp(R.rUA, 0, -ua, 0);
    R.lHand = grp(R.lEl, 0, -ua * 0.95, 0); R.rHand = grp(R.rEl, 0, -ua * 0.95, 0);
    R.lThigh = grp(R.hips, -0.1 * s, -0.02 * s, 0); R.rThigh = grp(R.hips, 0.1 * s, -0.02 * s, 0);
    R.lKnee = grp(R.lThigh, 0, -legL * s, 0); R.rKnee = grp(R.rThigh, 0, -legL * s, 0);
    R.lFoot = grp(R.lKnee, 0, -legL * s, 0); R.rFoot = grp(R.rKnee, 0, -legL * s, 0);
    R.ua = ua; R.leg = legL * s;
    R.height = hipsY + 0.75 * s;
    return R;
  }

  // limb filling helpers
  function limbs(R, mats, k) {
    k = k || {};
    var s = R.s, ua = R.ua, lg = R.leg;
    var at = (k.armT || 0.11) * s, lt = (k.legT || 0.14) * s;
    [['l', -1], ['r', 1]].forEach(function (p) {
      var side = p[0];
      mesh(k.armGeo || 'cyl', mats.upper, R[side + 'UA'], 0, -ua * 0.5, 0, at, ua * 1.0, at);
      mesh(k.armGeo || 'cyl', mats.lower, R[side + 'El'], 0, -ua * 0.47, 0, at * 0.92, ua * 0.95, at * 0.92);
      mesh('box', mats.hand, R[side + 'Hand'], 0, -0.03 * s, 0, at * 0.85, 0.1 * s, at * 0.95);
      if (k.shoulderPad) mesh('sph', mats.pad || mats.upper, R[side + 'UA'], 0, -0.02 * s, 0, at * 1.6, at * 1.2, at * 1.6, 0, 0, 0, true);
      mesh(k.legGeo || 'cyl', mats.thigh, R[side + 'Thigh'], 0, -lg * 0.5, 0, lt * 1.1, lg * 1.02, lt * 1.15);
      mesh(k.legGeo || 'cyl', mats.shin, R[side + 'Knee'], 0, -lg * 0.48, 0, lt * 0.95, lg * 0.98, lt);
      mesh('box', mats.boot, R[side + 'Foot'], 0, -0.03 * s, -0.05 * s, lt * 0.95, 0.08 * s, lt * 1.9);
      if (k.kneePad) mesh('box', mats.pad || mats.shin, R[side + 'Knee'], 0, -0.04 * s, -lt * 0.45, lt * 0.8, 0.1 * s, 0.05 * s, 0, 0, 0, true);
    });
  }

  // ------------------------------------------------------------------ trooper styles
  // pal: [primary, secondary, accent, visor]
  var styles = {};
  styles.legion = function (pal, tint) {
    var R = rig(1);
    var white = M.mat(tint ? tint[0] : pal[0], 0.35, 0.05), mark = M.mat(tint ? tint[1] : pal[1], 0.4), dark = M.mat(pal[2], 0.8), visor = M.mat(pal[3], 0.2, 0.6);
    limbs(R, { upper: white, lower: white, hand: dark, thigh: white, shin: white, boot: white, pad: mark }, { kneePad: true, shoulderPad: false });
    // torso
    mesh('box', white, R.chest, 0, 0.13, 0, 0.42, 0.34, 0.24);
    mesh('box', mark, R.chest, 0, 0.21, -0.125, 0.26, 0.06, 0.02, 0, 0, 0, true);
    mesh('box', dark, R.spine, 0, 0.06, 0, 0.32, 0.18, 0.2);
    mesh('box', white, R.hips, 0, 0.0, 0, 0.36, 0.13, 0.22);
    mesh('box', dark, R.hips, 0, 0.04, 0, 0.38, 0.05, 0.23, 0, 0, 0, true);
    mesh('box', white, R.chest, 0, 0.1, 0.17, 0.3, 0.32, 0.1, 0, 0, 0, true); // backpack
    mesh('sph', white, R.lUA, 0, -0.02, 0, 0.17, 0.13, 0.17, 0, 0, 0, true);
    mesh('sph', mark, R.rUA, 0, -0.02, 0, 0.17, 0.13, 0.17, 0, 0, 0, true);
    // helmet: rounded dome, T-visor, crest
    mesh('sph', white, R.head, 0, 0.11, 0.0, 0.29, 0.3, 0.31);
    mesh('box', white, R.head, 0, 0.0, -0.06, 0.26, 0.14, 0.22);
    mesh('box', visor, R.head, 0, 0.11, -0.155, 0.2, 0.05, 0.02);
    mesh('box', visor, R.head, 0, 0.04, -0.155, 0.05, 0.12, 0.02);
    mesh('box', mark, R.head, 0, 0.24, -0.04, 0.05, 0.05, 0.24, 0, 0, 0, true);
    mesh('cyl', dark, R.head, 0.11, 0.0, -0.13, 0.03, 0.04, 0.03, Math.PI / 2, 0, 0, true);
    return R;
  };
  styles.synth = function (pal, tint) {
    var R = rig(1.02, { shoulder: 0.2, neckK: 1.1 });
    var tan = M.mat(tint ? tint[0] : pal[0], 0.55, 0.3), brown = M.mat(tint ? tint[1] : pal[1], 0.6, 0.3), dark = M.mat(pal[2], 0.7, 0.4), eye = M.mat(pal[3], 0.4, 0, 'emis');
    limbs(R, { upper: tan, lower: tan, hand: brown, thigh: tan, shin: tan, boot: brown }, { armT: 0.055, legT: 0.065 });
    // narrow armoured chest plate, slight backward tilt
    mesh('box', tan, R.chest, 0, 0.12, 0.02, 0.3, 0.32, 0.13, -0.12, 0, 0);
    mesh('box', brown, R.chest, 0, 0.14, 0.11, 0.22, 0.26, 0.09, -0.12, 0, 0, true);
    mesh('cyl', dark, R.spine, 0, 0.06, 0, 0.07, 0.25, 0.07);
    mesh('box', tan, R.hips, 0, 0.0, 0, 0.24, 0.1, 0.14);
    mesh('sph', tan, R.lSh, 0, 0, 0, 0.09, 0.09, 0.09); mesh('sph', tan, R.rSh, 0, 0, 0, 0.09, 0.09, 0.09);
    mesh('sph', tan, R.lKnee, 0, 0, 0, 0.08, 0.08, 0.08, 0, 0, 0, true); mesh('sph', tan, R.rKnee, 0, 0, 0, 0.08, 0.08, 0.08, 0, 0, 0, true);
    // long neck and elongated wedge head (snout points forward)
    mesh('cyl', dark, R.neck, 0, -0.02, 0, 0.04, 0.18, 0.04);
    mesh('box', tan, R.head, 0, 0.08, -0.06, 0.12, 0.11, 0.34);
    mesh('box', tan, R.head, 0, 0.12, 0.06, 0.14, 0.14, 0.12);
    mesh('box', brown, R.head, 0, 0.16, -0.02, 0.08, 0.04, 0.3, 0, 0, 0, true);
    mesh('sph', eye, R.head, 0.065, 0.1, -0.08, 0.035, 0.035, 0.035); mesh('sph', eye, R.head, -0.065, 0.1, -0.08, 0.035, 0.035, 0.035);
    mesh('box', brown, R.chest, 0, 0.15, 0.17, 0.18, 0.22, 0.08, 0, 0, 0, true);
    return R;
  };
  styles.brute = function (pal, tint) {
    var R = rig(1.12, { shoulder: 0.3 });
    var steel = M.mat(tint ? tint[0] : 0x5a6270, 0.4, 0.6), dark = M.mat(0x2a2e36, 0.5, 0.5), eye = M.mat(0xff5a1f, 0.4, 0, 'emis');
    limbs(R, { upper: steel, lower: steel, hand: dark, thigh: steel, shin: steel, boot: dark }, { armT: 0.16, legT: 0.16 });
    mesh('box', steel, R.chest, 0, 0.12, 0, 0.62, 0.42, 0.42);
    mesh('box', dark, R.chest, 0, -0.05, 0, 0.4, 0.15, 0.3);
    mesh('box', steel, R.hips, 0, 0, 0, 0.32, 0.14, 0.22);
    mesh('box', steel, R.head, 0, 0.02, -0.08, 0.16, 0.12, 0.18);
    mesh('box', eye, R.head, 0, 0.04, -0.175, 0.1, 0.025, 0.02);
    mesh('box', dark, R.rEl, 0, -0.3, -0.03, 0.2, 0.3, 0.2, 0, 0, 0, true);
    return R;
  };
  styles.dominion = function (pal, tint) {
    var R = rig(1);
    var white = M.mat(tint ? tint[0] : pal[0], 0.28, 0.05), black = M.mat(pal[1], 0.7), grey = M.mat(tint ? tint[1] : pal[2], 0.5), lens = M.mat(pal[3], 0.15, 0.7);
    limbs(R, { upper: black, lower: white, hand: black, thigh: white, shin: white, boot: white, pad: white }, { kneePad: true });
    mesh('box', white, R.chest, 0, 0.14, -0.01, 0.4, 0.3, 0.22);
    mesh('box', black, R.chest, 0, -0.02, 0, 0.34, 0.06, 0.2);
    mesh('box', black, R.spine, 0, 0.06, 0, 0.3, 0.18, 0.18);
    mesh('box', white, R.spine, 0, 0.05, -0.08, 0.26, 0.14, 0.05, 0, 0, 0, true);
    mesh('box', white, R.hips, 0, 0.0, 0, 0.36, 0.12, 0.22);
    mesh('box', grey, R.hips, 0, 0.05, 0, 0.38, 0.04, 0.23, 0, 0, 0, true);
    mesh('box', white, R.chest, 0, 0.12, 0.15, 0.28, 0.26, 0.08, 0, 0, 0, true);
    mesh('sph', white, R.lUA, 0, 0.0, 0, 0.17, 0.12, 0.17, 0, 0, 0, true); mesh('sph', white, R.rUA, 0, 0.0, 0, 0.17, 0.12, 0.17, 0, 0, 0, true);
    // helmet: taller dome, angular brow, wide dark lenses, frowning grille
    mesh('sph', white, R.head, 0, 0.12, 0.01, 0.28, 0.33, 0.31);
    mesh('box', white, R.head, 0, 0.0, -0.02, 0.27, 0.16, 0.26);
    mesh('box', white, R.head, 0, 0.03, -0.14, 0.18, 0.14, 0.06);
    mesh('box', lens, R.head, 0.065, 0.1, -0.16, 0.085, 0.055, 0.02, 0, 0, -0.15);
    mesh('box', lens, R.head, -0.065, 0.1, -0.16, 0.085, 0.055, 0.02, 0, 0, 0.15);
    mesh('box', grey, R.head, 0, 0.0, -0.175, 0.1, 0.04, 0.02, 0, 0, 0, true);
    mesh('cyl', grey, R.head, 0.08, -0.02, -0.15, 0.04, 0.03, 0.04, Math.PI / 2, 0, 0, true);
    mesh('cyl', grey, R.head, -0.08, -0.02, -0.15, 0.04, 0.03, 0.04, Math.PI / 2, 0, 0, true);
    return R;
  };
  styles.rebel = function (pal, tint) {
    var R = rig(0.98);
    var cloth = M.mat(tint ? tint[0] : pal[0], 0.95), vest = M.mat(tint ? tint[1] : pal[1], 0.9), skin = M.mat(0xd9a27c, 0.8), boot = M.mat(0x2b241c, 0.8), helm = M.mat(tint ? tint[0] : 0x8a8466, 0.6), acc = M.mat(pal[2], 0.7);
    limbs(R, { upper: cloth, lower: cloth, hand: skin, thigh: cloth, shin: cloth, boot: boot }, { armT: 0.1, legT: 0.13 });
    mesh('box', cloth, R.chest, 0, 0.12, 0, 0.38, 0.32, 0.21);
    mesh('box', vest, R.chest, 0, 0.13, 0, 0.4, 0.26, 0.23);
    mesh('box', acc, R.chest, -0.12, 0.2, -0.12, 0.06, 0.05, 0.01, 0, 0, 0, true);
    mesh('box', cloth, R.spine, 0, 0.06, 0, 0.32, 0.18, 0.19);
    mesh('box', boot, R.hips, 0, 0.04, 0, 0.36, 0.05, 0.21);
    mesh('box', cloth, R.hips, 0, -0.02, 0, 0.34, 0.12, 0.2);
    mesh('box', vest, R.chest, 0, 0.1, 0.15, 0.26, 0.28, 0.1, 0, 0, 0, true);
    mesh('sph', skin, R.head, 0, 0.08, 0, 0.2, 0.24, 0.22);
    mesh('hemi', helm, R.head, 0, 0.12, 0.01, 0.26, 0.24, 0.27);
    mesh('box', helm, R.head, 0, 0.13, -0.12, 0.24, 0.02, 0.06, 0, 0, 0, true);
    mesh('box', M.mat(0x111111, 0.3, 0.5), R.head, 0, 0.17, -0.14, 0.17, 0.04, 0.02, 0, 0, 0, true);
    return R;
  };
  styles.ranger = function (pal, tint) {
    var R = rig(1);
    var suit = M.mat(tint ? tint[0] : pal[0], 0.85), vest = M.mat(tint ? tint[1] : pal[1], 0.7), white = M.mat(pal[2], 0.4), dark = M.mat(pal[3], 0.6), visor = M.mat(0x111a22, 0.2, 0.7);
    limbs(R, { upper: suit, lower: suit, hand: dark, thigh: suit, shin: suit, boot: dark }, { armT: 0.11, legT: 0.135 });
    mesh('box', suit, R.chest, 0, 0.12, 0, 0.38, 0.32, 0.21);
    mesh('box', vest, R.chest, 0, 0.12, 0, 0.41, 0.24, 0.24);
    mesh('box', white, R.chest, 0, 0.2, -0.125, 0.2, 0.05, 0.02, 0, 0, 0, true);
    mesh('box', suit, R.spine, 0, 0.06, 0, 0.32, 0.18, 0.19);
    mesh('box', dark, R.hips, 0, 0.02, 0, 0.36, 0.12, 0.21);
    mesh('box', vest, R.chest, 0, 0.1, 0.16, 0.28, 0.28, 0.1, 0, 0, 0, true);
    mesh('sph', white, R.head, 0, 0.1, 0, 0.28, 0.29, 0.29);
    mesh('box', visor, R.head, 0, 0.08, -0.13, 0.22, 0.09, 0.04);
    mesh('box', suit, R.head, 0, 0.22, -0.02, 0.05, 0.04, 0.26, 0, 0, 0, true);
    return R;
  };
  styles.remnant = function (pal, tint) {
    var R = rig(1.04);
    var armor = M.mat(tint ? tint[0] : pal[0], 0.35, 0.3), red = M.mat(tint ? tint[1] : pal[1], 0.5), under = M.mat(pal[2], 0.8), lens = M.mat(pal[3], 0.3, 0, 'emis');
    limbs(R, { upper: under, lower: armor, hand: under, thigh: armor, shin: armor, boot: armor, pad: armor }, { kneePad: true, shoulderPad: true });
    mesh('box', armor, R.chest, 0, 0.13, 0, 0.42, 0.32, 0.24);
    mesh('box', red, R.chest, -0.14, 0.24, -0.125, 0.06, 0.03, 0.02, 0, 0, 0, true);
    mesh('box', under, R.spine, 0, 0.06, 0, 0.31, 0.18, 0.2);
    mesh('box', armor, R.hips, 0, 0.0, 0, 0.36, 0.12, 0.22);
    mesh('box', armor, R.chest, 0, 0.12, 0.16, 0.3, 0.3, 0.1, 0, 0, 0, true);
    mesh('sph', armor, R.head, 0, 0.12, 0.0, 0.28, 0.31, 0.3);
    mesh('box', armor, R.head, 0, 0.0, -0.03, 0.26, 0.16, 0.24);
    mesh('box', M.mat(0x050506, 0.2, 0.8), R.head, 0, 0.09, -0.15, 0.22, 0.07, 0.03);
    mesh('box', lens, R.head, 0.05, 0.09, -0.165, 0.04, 0.02, 0.01); mesh('box', lens, R.head, -0.05, 0.09, -0.165, 0.04, 0.02, 0.01);
    mesh('box', red, R.head, 0, 0.27, -0.05, 0.04, 0.03, 0.2, 0, 0, 0, true);
    return R;
  };
  styles.raider = function (pal, tint) {
    var R = rig(1);
    var wrap = M.mat(pal[0], 0.95), robe = M.mat(pal[1], 0.95), dark = M.mat(pal[2], 0.6, 0.4), lens = M.mat(0x111111, 0.2, 0.8);
    limbs(R, { upper: wrap, lower: wrap, hand: wrap, thigh: robe, shin: robe, boot: robe }, { armT: 0.11, legT: 0.15 });
    mesh('box', wrap, R.chest, 0, 0.12, 0, 0.38, 0.34, 0.22);
    mesh('skirt', M.mat(pal[1], 0.95, 0, 'cloth2'), R.hips, 0, -0.32, 0, 0.75, 0.7, 0.62);
    mesh('box', robe, R.chest, 0, 0.18, 0, 0.44, 0.08, 0.26, 0, 0, 0.6, true);
    mesh('sph', wrap, R.head, 0, 0.1, 0, 0.26, 0.3, 0.26);
    mesh('cyl', lens, R.head, 0.055, 0.12, -0.12, 0.06, 0.04, 0.06, Math.PI / 2, 0, 0);
    mesh('cyl', lens, R.head, -0.055, 0.12, -0.12, 0.06, 0.04, 0.06, Math.PI / 2, 0, 0);
    mesh('cone', dark, R.head, 0.04, 0.0, -0.13, 0.025, 0.12, 0.025, -Math.PI / 2, 0, 0, true);
    mesh('cone', dark, R.head, -0.04, 0.0, -0.13, 0.025, 0.12, 0.025, -Math.PI / 2, 0, 0, true);
    return R;
  };
  styles.wroshan = function (pal) {
    var R = rig(1.22, { shoulder: 0.25 });
    var fur = M.mat(pal[0], 1), fur2 = M.mat(pal[1], 1), belt = M.mat(pal[2], 0.7, 0.3), eye = M.mat(0x111111, 0.3);
    limbs(R, { upper: fur, lower: fur, hand: fur2, thigh: fur, shin: fur, boot: fur2 }, { armT: 0.14, legT: 0.17 });
    mesh('box', fur, R.chest, 0, 0.12, 0, 0.46, 0.38, 0.28);
    mesh('box', fur2, R.spine, 0, 0.06, 0, 0.4, 0.2, 0.26);
    mesh('box', fur, R.hips, 0, 0, 0, 0.42, 0.16, 0.26);
    mesh('box', belt, R.chest, 0, 0.12, 0, 0.5, 0.06, 0.3, 0, 0, 0.75, true);
    mesh('sph', fur, R.head, 0, 0.12, 0, 0.27, 0.32, 0.3);
    mesh('box', fur2, R.head, 0, 0.04, -0.12, 0.12, 0.12, 0.12);
    mesh('sph', eye, R.head, 0.06, 0.15, -0.13, 0.04, 0.03, 0.03); mesh('sph', eye, R.head, -0.06, 0.15, -0.13, 0.04, 0.03, 0.03);
    return R;
  };
  styles.tiklet = function (pal) {
    var R = rig(0.62, { shoulder: 0.26 });
    var fur = M.mat(pal[0], 1), hood = M.mat(pal[1], 0.95), eye = M.mat(0x0a0a0a, 0.2), spear = M.mat(0x6a4a2a, 0.9);
    limbs(R, { upper: fur, lower: fur, hand: fur, thigh: fur, shin: fur, boot: fur }, { armT: 0.15, legT: 0.18 });
    mesh('sph', fur, R.chest, 0, 0.1, 0, 0.5, 0.52, 0.42);
    mesh('sph', fur, R.head, 0, 0.14, 0, 0.42, 0.42, 0.42);
    mesh('hemi', hood, R.head, 0, 0.16, 0.01, 0.46, 0.4, 0.46);
    mesh('cone', hood, R.head, 0, 0.42, 0.02, 0.12, 0.16, 0.12, 0, 0, 0, true);
    mesh('sph', eye, R.head, 0.09, 0.15, -0.18, 0.08, 0.09, 0.05); mesh('sph', eye, R.head, -0.09, 0.15, -0.18, 0.08, 0.09, 0.05);
    mesh('sph', M.mat(0x2a1a0a, 1), R.head, 0, 0.07, -0.2, 0.08, 0.06, 0.06);
    return R;
  };
  styles.insect = function (pal) {
    var R = rig(1.0, { shoulder: 0.18 });
    var chit = M.mat(pal[0], 0.5, 0.2), dark = M.mat(pal[1], 0.6), wing = new THREE.MeshStandardMaterial({ color: pal[2], transparent: true, opacity: 0.45, side: THREE.DoubleSide, roughness: 0.3 }), eye = M.mat(0x1a1a1a, 0.2, 0.5);
    limbs(R, { upper: chit, lower: chit, hand: dark, thigh: chit, shin: chit, boot: dark }, { armT: 0.06, legT: 0.07 });
    mesh('sph', chit, R.chest, 0, 0.12, 0, 0.3, 0.38, 0.26);
    mesh('sph', dark, R.spine, 0, 0.05, 0.04, 0.16, 0.22, 0.16);
    mesh('sph', chit, R.hips, 0, -0.05, 0.12, 0.26, 0.3, 0.34, 0.6, 0, 0);
    mesh('sph', chit, R.head, 0, 0.08, -0.04, 0.18, 0.28, 0.24, 0.4, 0, 0);
    mesh('sph', eye, R.head, 0.07, 0.12, -0.1, 0.07, 0.1, 0.06); mesh('sph', eye, R.head, -0.07, 0.12, -0.1, 0.07, 0.1, 0.06);
    var wl = mesh('plane', wing, R.chest, -0.06, 0.28, 0.14, 0.22, 0.75, 1, 0.25, 0.3, 0.2, true); wl.castShadow = false;
    var wr = mesh('plane', wing, R.chest, 0.06, 0.28, 0.14, 0.22, 0.75, 1, 0.25, -0.3, -0.2, true); wr.castShadow = false;
    R.wings = [wl, wr];
    return R;
  };

  // ------------------------------------------------------------------ legends
  function skinHead(R, b, scale) {
    var sc = scale || 1;
    var skin = M.mat(b.skin || 0xe0b48e, 0.75);
    mesh('sph', skin, R.head, 0, 0.1 * sc, 0, 0.22 * sc, 0.27 * sc, 0.24 * sc);
    mesh('box', M.mat(0x111111, 0.4), R.head, 0.045 * sc, 0.12 * sc, -0.11 * sc, 0.03 * sc, 0.015 * sc, 0.01, 0, 0, 0, true);
    mesh('box', M.mat(0x111111, 0.4), R.head, -0.045 * sc, 0.12 * sc, -0.11 * sc, 0.03 * sc, 0.015 * sc, 0.01, 0, 0, 0, true);
    if (b.hair && !b.bald && !b.hood) mesh('hemi', M.mat(b.hair, 0.9), R.head, 0, 0.13 * sc, 0.02 * sc, 0.24 * sc, 0.2 * sc, 0.26 * sc);
    if (b.hair && b.buns) { mesh('sph', M.mat(b.hair, 0.9), R.head, 0.14, 0.1, 0.02, 0.09, 0.12, 0.08); mesh('sph', M.mat(b.hair, 0.9), R.head, -0.14, 0.1, 0.02, 0.09, 0.12, 0.08); }
    if (b.beard) mesh('box', M.mat(b.hair || 0x7a5a3a, 0.95), R.head, 0, -0.02 * sc, -0.07 * sc, 0.17 * sc, 0.1 * sc, 0.1 * sc, 0, 0, 0, true);
    if (b.hood) mesh('hemi', M.mat(b.robe, 0.95, 0, 'cloth2'), R.head, 0, 0.1, 0.04, 0.32, 0.36, 0.34, -0.15, 0, 0);
    if (b.horns) for (var i = 0; i < 7; i++) { var a = (i / 6 - 0.5) * 2.4; mesh('cone', M.mat(0xe8dcc0, 0.6), R.head, Math.sin(a) * 0.12, 0.27, Math.cos(a) * 0.05, 0.025, 0.08, 0.025); }
    if (b.horns) { mesh('box', M.mat(0x111111, 0.8), R.head, 0, 0.12, -0.115, 0.02, 0.2, 0.01, 0, 0, 0, true); mesh('box', M.mat(0x111111, 0.8), R.head, 0.07, 0.1, -0.11, 0.015, 0.16, 0.01, 0, 0, 0.3, true); mesh('box', M.mat(0x111111, 0.8), R.head, -0.07, 0.1, -0.11, 0.015, 0.16, 0.01, 0, 0, -0.3, true); }
    if (b.montral) {
      var mm = M.mat(0xf2f2f2, 0.6), st = M.mat(0x2a4aa0, 0.6);
      mesh('cone', mm, R.head, 0.12, 0.24, 0, 0.1, 0.24, 0.1, 0, 0, -0.35); mesh('cone', mm, R.head, -0.12, 0.24, 0, 0.1, 0.24, 0.1, 0, 0, 0.35);
      mesh('cyl', mm, R.head, 0.13, -0.08, 0.05, 0.08, 0.36, 0.06, 0.15, 0, 0); mesh('cyl', mm, R.head, -0.13, -0.08, 0.05, 0.08, 0.36, 0.06, 0.15, 0, 0);
      mesh('box', st, R.head, 0.13, 0.04, 0.04, 0.085, 0.04, 0.065, 0, 0, 0, true); mesh('box', st, R.head, -0.13, 0.04, 0.04, 0.085, 0.04, 0.065, 0, 0, 0, true);
    }
  }
  function cape(R, color, len) {
    var c = mesh('plane', M.mat(color, 0.95, 0, 'cloth2'), R.chest, 0, 0.32, 0.14, 0.5, len || 1.3, 1, 0.08, 0, 0);
    c.castShadow = true; R.cape = c;
  }
  var legends = {};
  legends.robed = function (b, k) {
    var R = rig(k || 1);
    var robe = M.mat(b.robe, 0.95), under = M.mat(b.under, 0.9), belt = M.mat(0x3a2a1a, 0.7), boot = M.mat(0x2a1f17, 0.8), skin = M.mat(b.skin, 0.8);
    limbs(R, { upper: robe, lower: under, hand: skin, thigh: under, shin: under, boot: boot }, { armT: 0.12, legT: 0.14 });
    mesh('box', under, R.chest, 0, 0.12, 0, 0.36, 0.34, 0.21);
    mesh('box', robe, R.chest, 0.1, 0.13, -0.02, 0.16, 0.36, 0.22, 0, 0, -0.12);
    mesh('box', robe, R.chest, -0.1, 0.13, -0.02, 0.16, 0.36, 0.22, 0, 0, 0.12);
    mesh('box', under, R.spine, 0, 0.06, 0, 0.32, 0.18, 0.2);
    mesh('box', belt, R.hips, 0, 0.05, 0, 0.36, 0.06, 0.22);
    mesh('skirt', M.mat(b.robe, 0.95, 0, 'cloth2'), R.hips, 0, -0.3, 0, 0.7, 0.62, 0.58);
    // sleeves flare
    mesh('taper', robe, R.lEl, 0, -0.18, 0, 0.17, 0.2, 0.17, 0, 0, 0, true); mesh('taper', robe, R.rEl, 0, -0.18, 0, 0.17, 0.2, 0.17, 0, 0, 0, true);
    skinHead(R, b);
    if (b.cape) cape(R, b.cape, 1.25);
    return R;
  };
  legends.agile = function (b) {
    var R = rig(0.97);
    var robe = M.mat(b.robe, 0.85), under = M.mat(b.under, 0.85), skin = M.mat(b.skin, 0.75);
    limbs(R, { upper: skin, lower: under, hand: skin, thigh: under, shin: under, boot: M.mat(0x222222, 0.7) }, { armT: 0.1, legT: 0.13 });
    mesh('box', robe, R.chest, 0, 0.12, 0, 0.36, 0.32, 0.2);
    mesh('box', under, R.spine, 0, 0.06, 0, 0.3, 0.18, 0.19);
    mesh('box', robe, R.hips, 0, 0, 0, 0.34, 0.12, 0.2);
    mesh('box', M.mat(b.robe, 0.9, 0, 'cloth2'), R.hips, 0, -0.18, -0.08, 0.26, 0.32, 0.02, 0, 0, 0, true);
    mesh('box', M.mat(b.robe, 0.9, 0, 'cloth2'), R.hips, 0, -0.18, 0.1, 0.3, 0.32, 0.02, 0, 0, 0, true);
    skinHead(R, b);
    return R;
  };
  legends.small = function (b) {
    var R = rig(0.55, { shoulder: 0.24 });
    var robe = M.mat(b.robe, 0.95), skin = M.mat(b.skin, 0.8);
    limbs(R, { upper: robe, lower: robe, hand: skin, thigh: robe, shin: robe, boot: skin }, { armT: 0.17, legT: 0.2 });
    mesh('box', robe, R.chest, 0, 0.08, 0, 0.34, 0.32, 0.24);
    mesh('skirt', M.mat(b.robe, 0.95, 0, 'cloth2'), R.hips, 0, -0.2, 0, 0.45, 0.42, 0.42);
    mesh('sph', skin, R.head, 0, 0.12, 0, 0.32, 0.27, 0.29);
    mesh('cone', skin, R.head, 0.22, 0.13, 0.02, 0.09, 0.28, 0.05, 0, 0, -1.35);
    mesh('cone', skin, R.head, -0.22, 0.13, 0.02, 0.09, 0.28, 0.05, 0, 0, 1.35);
    mesh('sph', M.mat(0x1a1a10, 0.2), R.head, 0.06, 0.14, -0.13, 0.05, 0.04, 0.03); mesh('sph', M.mat(0x1a1a10, 0.2), R.head, -0.06, 0.14, -0.13, 0.05, 0.04, 0.03);
    mesh('sph', M.mat(0xdddddd, 1), R.head, 0, 0.27, 0.02, 0.18, 0.04, 0.18, 0, 0, 0, true);
    return R;
  };
  legends.trooper = function (b) {
    var F = D().factions[b.faction];
    var pal = F.pal.slice(); pal[1] = b.mark;
    var R = styles[F.style](pal, b.dark ? [0x1a1c20, 0x111111] : null);
    mesh('box', M.mat(b.mark, 0.6), R.lUA, 0, -0.08, 0, 0.13, 0.08, 0.13, 0, 0, 0, true);
    mesh('box', M.mat(b.mark, 0.6), R.head, 0, 0.18, -0.12, 0.2, 0.04, 0.05, 0, 0, 0, true);
    return R;
  };
  legends.trooperf = function (b) {
    var R = rig(1.02);
    var armor = M.mat(b.armor, 0.6, 0.2), skin = M.mat(b.skin, 0.75), dark = M.mat(0x222428, 0.7);
    limbs(R, { upper: skin, lower: armor, hand: dark, thigh: dark, shin: armor, boot: dark, pad: armor }, { armT: 0.12, legT: 0.14, kneePad: true, shoulderPad: true });
    mesh('box', armor, R.chest, 0, 0.13, 0, 0.42, 0.32, 0.25);
    mesh('box', dark, R.spine, 0, 0.06, 0, 0.32, 0.18, 0.2);
    mesh('box', armor, R.hips, 0, 0, 0, 0.36, 0.12, 0.22);
    skinHead(R, { skin: b.skin, hair: b.hair });
    mesh('box', M.mat(b.hair, 0.9), R.head, 0, 0.14, 0.12, 0.08, 0.06, 0.12, 0, 0, 0, true);
    return R;
  };
  legends.civilian = function (b) {
    var R = rig(0.96);
    var dress = M.mat(b.robe, 0.85), under = M.mat(b.under, 0.85), skin = M.mat(b.skin, 0.75);
    limbs(R, { upper: dress, lower: dress, hand: skin, thigh: under, shin: under, boot: M.mat(0xdddddd, 0.6) }, { armT: 0.1, legT: 0.12 });
    mesh('box', dress, R.chest, 0, 0.12, 0, 0.34, 0.32, 0.2);
    mesh('box', dress, R.spine, 0, 0.06, 0, 0.28, 0.18, 0.18);
    mesh('box', M.mat(0x6a5a3a, 0.6, 0.4), R.hips, 0, 0.05, 0, 0.32, 0.04, 0.2, 0, 0, 0, true);
    mesh('box', dress, R.hips, 0, -0.02, 0, 0.32, 0.12, 0.2);
    skinHead(R, b);
    return R;
  };
  legends.smuggler = function (b) {
    var R = rig(1.0);
    var shirt = M.mat(b.shirt, 0.9), vest = M.mat(b.vest, 0.85), pants = M.mat(0x2a3448, 0.85), skin = M.mat(b.skin, 0.75), boot = M.mat(0x1a1410, 0.6);
    limbs(R, { upper: shirt, lower: shirt, hand: skin, thigh: pants, shin: pants, boot: boot }, { armT: 0.11, legT: 0.13 });
    mesh('box', shirt, R.chest, 0, 0.12, 0, 0.36, 0.32, 0.2);
    mesh('box', vest, R.chest, 0.11, 0.12, 0, 0.14, 0.33, 0.22); mesh('box', vest, R.chest, -0.11, 0.12, 0, 0.14, 0.33, 0.22);
    mesh('box', vest, R.chest, 0, 0.12, 0.05, 0.37, 0.33, 0.12);
    mesh('box', shirt, R.spine, 0, 0.06, 0, 0.3, 0.18, 0.18);
    mesh('box', pants, R.hips, 0, -0.01, 0, 0.34, 0.12, 0.2);
    mesh('box', M.mat(0x3a2a1a, 0.6), R.hips, 0, 0.04, 0, 0.36, 0.05, 0.21);
    mesh('box', M.mat(0x3a2a1a, 0.6), R.rThigh, 0.08, -0.15, 0, 0.06, 0.18, 0.1, 0, 0, 0, true); // holster
    mesh('box', M.mat(0xaa2222, 0.8), R.lThigh, -0.075, -0.25, 0, 0.01, 0.5, 0.03, 0, 0, 0, true);
    mesh('box', M.mat(0xaa2222, 0.8), R.rThigh, 0.075, -0.25, 0, 0.01, 0.5, 0.03, 0, 0, 0, true);
    skinHead(R, b);
    if (b.cape) cape(R, b.cape, 0.9);
    return R;
  };
  legends.wroshan = function (b) { return styles.wroshan([b.fur, 0x4a3420, 0x9b8c6c, 0x111111]); };
  legends.cyborg = function (b) {
    var R = rig(1.12, { shoulder: 0.24 });
    var bone = M.mat(0xe2dcc8, 0.5, 0.2), metal = M.mat(0x6a6e72, 0.4, 0.7), eye = M.mat(0xffcc33, 0.3, 0, 'emis'), org = M.mat(0x6a4a3a, 0.8);
    limbs(R, { upper: metal, lower: bone, hand: metal, thigh: metal, shin: bone, boot: metal }, { armT: 0.07, legT: 0.08 });
    mesh('box', bone, R.chest, 0, 0.12, 0, 0.34, 0.3, 0.22);
    mesh('sph', org, R.chest, 0, 0.04, -0.04, 0.16, 0.16, 0.12, 0, 0, 0, true);
    mesh('cyl', metal, R.spine, 0, 0.06, 0, 0.08, 0.25, 0.08);
    mesh('box', bone, R.hips, 0, 0, 0, 0.3, 0.1, 0.18);
    mesh('box', bone, R.head, 0, 0.12, -0.02, 0.18, 0.26, 0.24);
    mesh('box', bone, R.head, 0, 0.1, -0.15, 0.16, 0.12, 0.06);
    mesh('sph', eye, R.head, 0.05, 0.14, -0.15, 0.04, 0.025, 0.02); mesh('sph', eye, R.head, -0.05, 0.14, -0.15, 0.04, 0.025, 0.02);
    cape(R, 0x3a3a3a, 1.2);
    // second pair of arms (lower) used for quad blades
    R.lSh2 = grp(R.chest, -0.18 * 1.12, 0.12 * 1.12, 0.03); R.rSh2 = grp(R.chest, 0.18 * 1.12, 0.12 * 1.12, 0.03);
    R.lUA2 = grp(R.lSh2); R.rUA2 = grp(R.rSh2);
    R.lEl2 = grp(R.lUA2, 0, -R.ua, 0); R.rEl2 = grp(R.rUA2, 0, -R.ua, 0);
    R.lHand2 = grp(R.lEl2, 0, -R.ua * 0.95, 0); R.rHand2 = grp(R.rEl2, 0, -R.ua * 0.95, 0);
    ['l', 'r'].forEach(function (s) {
      mesh('cyl', metal, R[s + 'UA2'], 0, -R.ua * 0.5, 0, 0.06, R.ua, 0.06);
      mesh('cyl', bone, R[s + 'El2'], 0, -R.ua * 0.47, 0, 0.055, R.ua * 0.95, 0.055);
    });
    return R;
  };
  legends.ironclad = function (b) {
    var R = rig(1.0);
    var armor = M.mat(b.armor, 0.3, 0.75), trim = M.mat(b.trim, 0.6, 0.3), under = M.mat(0x2a2a2a, 0.85), visor = M.mat(0x06070a, 0.15, 0.6), soft = M.mat(b.robes || 0x5a4a3a, 0.9);
    limbs(R, { upper: under, lower: armor, hand: M.mat(0x3a2e22, 0.7), thigh: armor, shin: armor, boot: M.mat(0x3a2e22, 0.7), pad: armor }, { kneePad: true, shoulderPad: true, armT: 0.115, legT: 0.14 });
    mesh('box', armor, R.chest, 0, 0.15, -0.01, 0.4, 0.22, 0.24);
    mesh('box', under, R.chest, 0, 0.0, 0, 0.36, 0.12, 0.21);
    mesh('box', trim, R.spine, 0, 0.06, 0, 0.32, 0.18, 0.2);
    mesh('box', M.mat(0x3a2e22, 0.7), R.hips, 0, 0.04, 0, 0.37, 0.07, 0.22);
    mesh('box', under, R.hips, 0, -0.02, 0, 0.34, 0.12, 0.2);
    // T-visor helmet with flat brow and side antennae (distinct proportions from the classic design)
    mesh('cyl', armor, R.head, 0, 0.1, 0, 0.29, 0.3, 0.3);
    mesh('sph', armor, R.head, 0, 0.24, 0, 0.29, 0.14, 0.3);
    mesh('box', visor, R.head, 0, 0.14, -0.15, 0.22, 0.045, 0.02);
    mesh('box', visor, R.head, 0, 0.06, -0.15, 0.055, 0.14, 0.02);
    mesh('box', armor, R.head, 0.15, 0.02, -0.06, 0.03, 0.1, 0.12, 0, 0, 0, true); mesh('box', armor, R.head, -0.15, 0.02, -0.06, 0.03, 0.1, 0.12, 0, 0, 0, true);
    mesh('cyl', trim, R.head, -0.16, 0.22, 0.02, 0.012, 0.16, 0.012, 0, 0, 0, true);
    if (b.jetpack && !b.nojet) {
      mesh('box', trim, R.chest, 0, 0.12, 0.18, 0.26, 0.28, 0.12);
      mesh('cyl', armor, R.chest, 0.08, 0.1, 0.24, 0.1, 0.34, 0.1);
      mesh('cyl', armor, R.chest, -0.08, 0.1, 0.24, 0.1, 0.34, 0.1);
      mesh('cone', trim, R.chest, 0, 0.36, 0.24, 0.06, 0.12, 0.06, 0, 0, 0, true);
      R.jetNozzles = [new THREE.Vector3(0.08, -0.08, 0.24), new THREE.Vector3(-0.08, -0.08, 0.24)];
    }
    if (b.cape) cape(R, b.cape, 1.0);
    if (b.robes) mesh('skirt', M.mat(b.robes, 0.95, 0, 'cloth2'), R.hips, 0, -0.18, 0, 0.62, 0.34, 0.52);
    return R;
  };
  legends.gunslinger = function (b) {
    var R = rig(1.04);
    var coat = M.mat(b.coat, 0.85), skin = M.mat(b.skin, 0.7), boot = M.mat(0x1a1410, 0.6), hat = M.mat(b.hat, 0.9), eye = M.mat(0xff3322, 0.4, 0, 'emis');
    limbs(R, { upper: coat, lower: coat, hand: skin, thigh: M.mat(0x2a2620, 0.85), shin: M.mat(0x2a2620, 0.85), boot: boot }, { armT: 0.11, legT: 0.12 });
    mesh('box', coat, R.chest, 0, 0.12, 0, 0.38, 0.32, 0.22);
    mesh('box', coat, R.spine, 0, 0.06, 0, 0.32, 0.18, 0.2);
    mesh('skirt', M.mat(b.coat, 0.9, 0, 'cloth2'), R.hips, 0, -0.32, 0.02, 0.62, 0.68, 0.5);
    mesh('sph', skin, R.head, 0, 0.08, 0, 0.21, 0.25, 0.23);
    mesh('sph', eye, R.head, 0.05, 0.11, -0.105, 0.04, 0.03, 0.02); mesh('sph', eye, R.head, -0.05, 0.11, -0.105, 0.04, 0.03, 0.02);
    mesh('cyl', hat, R.head, 0, 0.21, 0, 0.62, 0.02, 0.62);
    mesh('cyl', hat, R.head, 0, 0.27, 0, 0.26, 0.12, 0.26);
    mesh('cyl', M.mat(0x777777, 0.4, 0.6), R.head, 0.09, 0.07, 0.08, 0.03, 0.1, 0.03, 0.4, 0, 0, true);
    mesh('cyl', M.mat(0x777777, 0.4, 0.6), R.head, -0.09, 0.07, 0.08, 0.03, 0.1, 0.03, 0.4, 0, 0, true);
    return R;
  };
  legends.darklord = function (b) {
    var R = rig(1.12, { shoulder: 0.25 });
    var black = M.mat(b.armor, 0.25, 0.5), dull = M.mat(0x18181b, 0.85), panel = M.mat(0x777777, 0.4, 0.6);
    limbs(R, { upper: dull, lower: black, hand: black, thigh: dull, shin: black, boot: black, pad: black }, { armT: 0.13, legT: 0.15, shoulderPad: true });
    mesh('box', dull, R.chest, 0, 0.12, 0, 0.44, 0.34, 0.26);
    mesh('box', black, R.chest, 0, 0.24, -0.02, 0.5, 0.14, 0.3);
    mesh('box', panel, R.chest, 0, 0.09, -0.14, 0.12, 0.1, 0.02);
    mesh('box', M.mat(0xff2222, 0.3, 0, 'emis'), R.chest, 0.03, 0.11, -0.152, 0.02, 0.02, 0.01, 0, 0, 0, true);
    mesh('box', M.mat(0x2266ff, 0.3, 0, 'emis'), R.chest, -0.03, 0.11, -0.152, 0.02, 0.02, 0.01, 0, 0, 0, true);
    mesh('box', black, R.hips, 0, 0.04, 0, 0.4, 0.08, 0.24);
    mesh('skirt', M.mat(0x0a0a0a, 0.9, 0, 'cloth2'), R.hips, 0, -0.35, 0, 0.68, 0.7, 0.56);
    // helmet: flared, angular face mask (redesigned)
    mesh('sph', black, R.head, 0, 0.14, 0.02, 0.3, 0.3, 0.32);
    mesh('cyl', black, R.head, 0, 0.0, 0.04, 0.36, 0.16, 0.38);
    mesh('box', black, R.head, 0, 0.06, -0.13, 0.2, 0.18, 0.08);
    mesh('box', M.mat(0x222222, 0.2, 0.9), R.head, 0.05, 0.11, -0.172, 0.07, 0.04, 0.01, 0, 0, -0.2);
    mesh('box', M.mat(0x222222, 0.2, 0.9), R.head, -0.05, 0.11, -0.172, 0.07, 0.04, 0.01, 0, 0, 0.2);
    mesh('cone', M.mat(0x333333, 0.4, 0.6), R.head, 0, 0.0, -0.17, 0.11, 0.1, 0.05, Math.PI, 0, 0, true);
    cape(R, b.cape, 1.5);
    return R;
  };
  legends.officer = function (b) {
    var R = rig(1.0);
    var uni = M.mat(b.uniform, 0.8), skin = M.mat(b.skin, 0.75), boot = M.mat(0x0a0a0a, 0.3, 0.3);
    limbs(R, { upper: uni, lower: uni, hand: M.mat(0x0a0a0a, 0.5), thigh: uni, shin: boot, boot: boot }, { armT: 0.11, legT: 0.13 });
    mesh('box', uni, R.chest, 0, 0.12, 0, 0.37, 0.33, 0.21);
    mesh('box', uni, R.spine, 0, 0.06, 0, 0.31, 0.18, 0.19);
    mesh('box', uni, R.hips, 0, -0.01, 0, 0.34, 0.12, 0.2);
    mesh('box', M.mat(0x111111, 0.4, 0.4), R.hips, 0, 0.04, 0, 0.36, 0.05, 0.21);
    mesh('box', M.mat(0xc83232, 0.5), R.chest, -0.12, 0.2, -0.11, 0.08, 0.04, 0.01, 0, 0, 0, true);
    mesh('box', M.mat(0x2a6ac8, 0.5), R.chest, -0.12, 0.17, -0.11, 0.08, 0.02, 0.01, 0, 0, 0, true);
    skinHead(R, { skin: b.skin, hair: 0x3a2a1a });
    mesh('cyl', uni, R.head, 0, 0.24, 0, 0.27, 0.07, 0.27);
    mesh('box', uni, R.head, 0, 0.21, -0.12, 0.2, 0.02, 0.08);
    if (b.cape) cape(R, b.cape, 1.3);
    return R;
  };
  legends.reptile = function (b) {
    var R = rig(1.08, { shoulder: 0.24 });
    var sk = M.mat(b.skin, 0.7), suit = M.mat(b.suit, 0.8), eye = M.mat(0xff9922, 0.3, 0, 'emis');
    limbs(R, { upper: sk, lower: sk, hand: sk, thigh: suit, shin: suit, boot: sk }, { armT: 0.13, legT: 0.15 });
    mesh('box', suit, R.chest, 0, 0.12, 0, 0.44, 0.34, 0.26);
    mesh('box', suit, R.spine, 0, 0.06, 0, 0.38, 0.18, 0.24);
    mesh('box', suit, R.hips, 0, 0, 0, 0.38, 0.14, 0.24);
    mesh('sph', sk, R.head, 0, 0.1, -0.06, 0.24, 0.24, 0.36);
    mesh('sph', eye, R.head, 0.08, 0.15, -0.14, 0.04, 0.03, 0.03); mesh('sph', eye, R.head, -0.08, 0.15, -0.14, 0.04, 0.03, 0.03);
    return R;
  };
  legends.shadowunit = function () {
    var R = rig(1.15, { shoulder: 0.26 });
    var black = M.mat(0x111216, 0.25, 0.85), dark = M.mat(0x2a2c30, 0.4, 0.7), eye = M.mat(0xff2222, 0.3, 0, 'emis');
    limbs(R, { upper: dark, lower: black, hand: black, thigh: dark, shin: black, boot: black, pad: black }, { armT: 0.12, legT: 0.13, shoulderPad: true });
    mesh('box', black, R.chest, 0, 0.12, 0, 0.46, 0.36, 0.26);
    mesh('box', dark, R.spine, 0, 0.06, 0, 0.3, 0.2, 0.18);
    mesh('box', black, R.hips, 0, 0, 0, 0.36, 0.12, 0.22);
    mesh('box', black, R.head, 0, 0.1, 0, 0.2, 0.26, 0.24);
    mesh('box', eye, R.head, 0, 0.13, -0.125, 0.15, 0.025, 0.01);
    mesh('box', dark, R.chest, 0, 0.12, 0.17, 0.3, 0.3, 0.1);
    R.jetNozzles = [new THREE.Vector3(0.08, 0, 0.22), new THREE.Vector3(-0.08, 0, 0.22)];
    return R;
  };

  function D() { return SF.D; }

  // ------------------------------------------------------------------ weapons
  // Returns a group with barrel along -Z, grip at origin, and a muzzle marker.
  M.weapon = function (w, accent) {
    var g = new THREE.Group();
    var body = M.mat(0x23252a, 0.45, 0.6), dark = M.mat(0x111215, 0.5, 0.5), acc = M.mat(accent || 0x6a6e76, 0.5, 0.5);
    var k = w.kind, L = 0.5;
    if (k === 'pistol' || k === 'hpistol') {
      mesh('box', body, g, 0, 0.06, -0.08, 0.05, 0.08, k === 'hpistol' ? 0.28 : 0.22);
      mesh('box', dark, g, 0, 0, 0.0, 0.04, 0.12, 0.05, -0.3, 0, 0);
      mesh('cyl', dark, g, 0, 0.07, -0.25, 0.035, 0.12, 0.035, Math.PI / 2, 0, 0);
      if (k === 'hpistol') mesh('cyl', acc, g, 0, 0.12, -0.1, 0.025, 0.1, 0.025, Math.PI / 2, 0, 0, true);
      L = 0.32;
    } else if (k === 'sniper') {
      mesh('box', body, g, 0, 0.05, -0.25, 0.06, 0.09, 0.8);
      mesh('cyl', dark, g, 0, 0.06, -0.8, 0.03, 0.5, 0.03, Math.PI / 2, 0, 0);
      mesh('cyl', acc, g, 0, 0.14, -0.25, 0.05, 0.3, 0.05, Math.PI / 2, 0, 0);
      mesh('box', dark, g, 0, 0.0, 0.0, 0.05, 0.14, 0.06, -0.3, 0, 0);
      mesh('box', body, g, 0, 0.03, 0.18, 0.05, 0.12, 0.22);
      L = 1.05;
    } else if (k === 'repeater') {
      mesh('box', body, g, 0, 0.05, -0.2, 0.1, 0.13, 0.62);
      mesh('cyl', dark, g, 0, 0.06, -0.62, 0.07, 0.3, 0.07, Math.PI / 2, 0, 0);
      for (var i = 0; i < 4; i++) mesh('cyl', dark, g, Math.cos(i * 1.57) * 0.035, 0.06 + Math.sin(i * 1.57) * 0.035, -0.75, 0.022, 0.2, 0.022, Math.PI / 2, 0, 0, true);
      mesh('box', acc, g, 0, -0.06, -0.15, 0.06, 0.12, 0.16, 0, 0, 0, true);
      mesh('box', dark, g, 0, 0.0, 0.0, 0.05, 0.14, 0.06, -0.3, 0, 0);
      L = 0.85;
    } else if (k === 'shotgun') {
      mesh('box', body, g, 0, 0.05, -0.18, 0.08, 0.1, 0.55);
      mesh('cyl', dark, g, 0.02, 0.07, -0.5, 0.04, 0.3, 0.04, Math.PI / 2, 0, 0);
      mesh('cyl', dark, g, -0.02, 0.07, -0.5, 0.04, 0.3, 0.04, Math.PI / 2, 0, 0);
      mesh('box', dark, g, 0, 0.0, 0.0, 0.05, 0.14, 0.06, -0.3, 0, 0);
      mesh('box', acc, g, 0, 0.02, 0.15, 0.05, 0.1, 0.2, 0, 0, 0, true);
      L = 0.65;
    } else if (k === 'launcher') {
      mesh('cyl', body, g, 0, 0.1, -0.2, 0.13, 1.0, 0.13, Math.PI / 2, 0, 0);
      mesh('cyl', acc, g, 0, 0.1, -0.7, 0.16, 0.08, 0.16, Math.PI / 2, 0, 0);
      mesh('box', dark, g, 0, 0.0, 0.0, 0.05, 0.14, 0.06, -0.3, 0, 0);
      mesh('box', dark, g, 0.08, 0.18, -0.25, 0.04, 0.06, 0.1, 0, 0, 0, true);
      L = 0.75;
    } else if (k === 'flamer') {
      mesh('box', body, g, 0, 0.05, -0.18, 0.09, 0.11, 0.5);
      mesh('cyl', dark, g, 0, 0.05, -0.5, 0.05, 0.25, 0.05, Math.PI / 2, 0, 0);
      mesh('cyl', M.mat(0x8a2a10, 0.6), g, 0, -0.06, -0.1, 0.07, 0.25, 0.07, Math.PI / 2, 0, 0);
      L = 0.62;
    } else if (k === 'melee') {
      mesh('cyl', M.mat(0xb8bcc4, 0.25, 0.9), g, 0, 0, -0.5, 0.03, 1.8, 0.03, Math.PI / 2, 0, 0);
      mesh('cone', M.mat(0xd8dce4, 0.2, 0.9), g, 0, 0, -1.48, 0.05, 0.2, 0.02, -Math.PI / 2, 0, 0);
      L = 1.5;
    } else if (k === 'ion') {
      mesh('box', body, g, 0, 0.05, -0.15, 0.08, 0.12, 0.45);
      mesh('torus', acc, g, 0, 0.06, -0.42, 0.14, 0.14, 0.14);
      mesh('box', dark, g, 0, 0.0, 0.0, 0.05, 0.14, 0.06, -0.3, 0, 0);
      L = 0.5;
    } else { // carbine / rifle
      var len = k === 'rifle' ? 0.62 : 0.48;
      mesh('box', body, g, 0, 0.05, -len * 0.3, 0.06, 0.1, len);
      mesh('cyl', dark, g, 0, 0.06, -len * 0.8, 0.028, len * 0.55, 0.028, Math.PI / 2, 0, 0);
      mesh('box', dark, g, 0, 0.0, 0.0, 0.045, 0.14, 0.055, -0.3, 0, 0);
      mesh('box', dark, g, 0, -0.04, -0.14, 0.035, 0.14, 0.06, 0.2, 0, 0, true);
      mesh('cyl', acc, g, 0, 0.13, -0.12, 0.035, 0.18, 0.035, Math.PI / 2, 0, 0, true);
      if (k === 'rifle') mesh('box', body, g, 0, 0.03, 0.14, 0.05, 0.1, 0.16);
      L = len * 1.08;
    }
    var muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.06, -L); g.add(muzzle);
    g.userData.muzzle = muzzle;
    return g;
  };

  // Blade: hilt along Z with blade extending to -Z. Returns {group, blades:[mesh], glows:[mesh]}
  M.blade = function (color, style, len) {
    len = len || (style === 'small' ? 0.65 : 1.0);
    var g = new THREE.Group(), out = { group: g, blades: [], glows: [] };
    var hilt = M.mat(style === 'crossguard' ? 0x8a6a3a : 0xb8bcc4, 0.3, 0.85), grip = M.mat(0x111111, 0.6);
    var core = M.mat(style === 'dark' ? 0x050505 : 0xffffff, 0, 0, 'glow');
    var glow = M.mat(color, 0, 0, 'add');
    function one(dir, hl) {
      var b = mesh('cyl', core, g, 0, 0, dir * (hl + len / 2), 0.026, len, 0.026, Math.PI / 2, 0, 0);
      b.castShadow = false;
      var gl = mesh('cyl', glow, g, 0, 0, dir * (hl + len / 2), 0.07, len + 0.04, 0.07, Math.PI / 2, 0, 0);
      gl.castShadow = false;
      out.blades.push(b); out.glows.push(gl);
    }
    var hl = style === 'double' ? 0.2 : 0.12;
    if (style === 'double') {
      mesh('cyl', hilt, g, 0, 0, 0, 0.04, 0.4, 0.04, Math.PI / 2, 0, 0);
      mesh('cyl', grip, g, 0, 0, 0, 0.045, 0.14, 0.045, Math.PI / 2, 0, 0);
      one(-1, hl); one(1, hl);
    } else {
      mesh('cyl', hilt, g, 0, 0, 0.0, 0.035, 0.26, 0.035, Math.PI / 2, 0, 0);
      mesh('cyl', grip, g, 0, 0, 0.05, 0.04, 0.1, 0.04, Math.PI / 2, 0, 0);
      if (style === 'crossguard') { mesh('cyl', hilt, g, 0, 0, -0.08, 0.02, 0.12, 0.02, 0, 0, Math.PI / 2); }
      one(-1, hl);
    }
    if (style === 'dark') {
      // flat black blade with a pale edge glow
      out.blades[0].scale.set(0.05, len, 0.012);
      out.glows[0].material = M.mat(0xdde6ff, 0, 0, 'add');
      out.glows[0].scale.set(0.09, len + 0.04, 0.035);
    }
    out.len = len;
    return out;
  };

  // ------------------------------------------------------------------ public builders
  // Trooper for a faction + class. Returns rig with weapon attached.
  M.trooper = function (factionId, classId, skin) {
    var F = SF.D.factions[factionId];
    var style = F.style;
    if (factionId === 'syndicate' && (classId === 'enforcer' || classId === 'heavy')) style = 'brute';
    if (classId === 'enforcer' && factionId === 'alliance') style = 'wroshan';
    var tint = skin && SF.D.skinById[skin] ? SF.D.skinById[skin].tint : null;
    var builder = styles[style] || styles.legion;
    var pal = style === 'wroshan' ? SF.D.factions.wroshan.pal : F.pal;
    var R = builder(pal, tint);
    // class markings
    var markC = { assault: null, heavy: 0x8a2a2a, specialist: 0x3a6a3a, officer: 0xc8a032, engineer: 0xc86a1a, commando: 0x222222 }[classId];
    if (markC && (style === 'legion' || style === 'dominion' || style === 'remnant' || style === 'ranger')) {
      mesh('box', M.mat(markC, 0.6), R.lUA, 0, -0.1, 0, 0.125, 0.06, 0.125, 0, 0, 0, true);
      if (classId === 'officer') mesh('box', M.mat(markC, 0.4, 0.5), R.chest, 0.12, 0.22, -0.125, 0.06, 0.04, 0.02, 0, 0, 0, true);
      if (classId === 'heavy') mesh('box', M.mat(F.pal[0], 0.4), R.chest, 0, 0.32, 0, 0.5, 0.06, 0.28, 0, 0, 0, true);
    }
    if (classId === 'jet' || classId === 'aerial') {
      mesh('box', M.mat(0x555a62, 0.4, 0.6), R.chest, 0, 0.12, 0.2, 0.26, 0.3, 0.12);
      mesh('cyl', M.mat(0x444850, 0.4, 0.6), R.chest, 0.09, 0.08, 0.26, 0.09, 0.3, 0.09);
      mesh('cyl', M.mat(0x444850, 0.4, 0.6), R.chest, -0.09, 0.08, 0.26, 0.09, 0.3, 0.09);
      R.jetNozzles = [new THREE.Vector3(0.09, -0.1, 0.26), new THREE.Vector3(-0.09, -0.1, 0.26)];
    }
    if (classId === 'enforcer' && style !== 'wroshan' && style !== 'brute') {
      mesh('cyl', M.mat(0x8a2a10, 0.6), R.chest, 0.08, 0.12, 0.22, 0.1, 0.36, 0.1);
      mesh('cyl', M.mat(0x8a2a10, 0.6), R.chest, -0.08, 0.12, 0.22, 0.1, 0.36, 0.1);
    }
    R.style = style;
    return R;
  };

  M.legend = function (h, skin) {
    var b = h.body;
    var tint = skin && SF.D.skinById[skin] ? SF.D.skinById[skin].tint : null;
    if (tint && b.kind !== 'trooper') {
      b = Object.assign({}, b);
      if (b.robe) b.robe = tint[0]; if (b.armor) b.armor = tint[0]; if (b.coat) b.coat = tint[0]; if (b.vest) b.vest = tint[1];
      if (b.uniform) b.uniform = tint[0]; if (b.fur) b.fur = tint[1]; if (b.cape) b.cape = tint[1]; if (b.trim) b.trim = tint[1];
    }
    var R = (legends[b.kind] || legends.robed)(b);
    R.style = 'legend-' + b.kind;
    return R;
  };

  M.native = function (factionId) {
    var F = SF.D.factions[factionId];
    var R = styles[F.style](F.pal);
    R.style = F.style;
    return R;
  };

  // Attach held items. For blasters: weapon in right hand. For blades: blade(s) per style.
  M.arm = function (R, weaponSpec, accent) {
    R.held = []; R.bladeObjs = [];
    if (typeof weaponSpec === 'string') {
      var w = SF.D.weapons[weaponSpec];
      var g = M.weapon(w, accent);
      g.rotation.x = -Math.PI / 2;
      g.position.set(0, -0.05, -0.02);
      R.rHand.add(g); R.held.push(g); R.gun = g;
      if (weaponSpec === 'h_twinpistols' || weaponSpec === 'h_sidearms') {
        var g2 = M.weapon(w, accent); g2.rotation.x = -Math.PI / 2; g2.position.set(0, -0.05, -0.02);
        R.lHand.add(g2); R.held.push(g2); R.gun2 = g2;
      }
      R.weaponKind = w.kind;
    } else {
      var bs = weaponSpec;
      var mk = function (hand, len) {
        var b = M.blade(bs.blade, bs.style, len);
        b.group.position.set(0, -0.06, 0);
        hand.add(b.group); R.bladeObjs.push(b); R.held.push(b.group);
        return b;
      };
      mk(R.rHand);
      if (bs.style === 'dual') mk(R.lHand, 0.85);
      if (bs.style === 'quad' && R.lHand2) { mk(R.lHand); mk(R.rHand2, 0.9); mk(R.lHand2, 0.9); }
      if (bs.style === 'double') { R.bladeObjs[0].group.position.set(0, -0.06, 0); }
      R.weaponKind = 'blade';
    }
  };

  // Mesh LOD: hide detail meshes when far away
  M.setDetail = function (R, on) {
    if (R._detail === on) return;
    R._detail = on;
    R.root.traverse(function (o) { if (o.userData.detail) o.visible = on; });
  };

  M.styles = styles;
  M.legends = legends;
})();
