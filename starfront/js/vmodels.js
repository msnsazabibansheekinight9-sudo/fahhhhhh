// Procedural vehicle models: speeders, hover tanks, walkers, starfighters, legend ships and capital ships.
// All face -Z. Each builder returns { root, muzzles:[Vector3], radius, height, turret?, legs?, engines? }.
var SF = window.SF || (window.SF = {});

(function () {
  var M = SF.Models, mesh = M.mesh, grp = M.grp;
  var V = SF.VModels = {};
  function m(c, r, mt) { return M.mat(c, r == null ? 0.5 : r, mt == null ? 0.35 : mt); }
  function glow(c) { return M.mat(c, 0, 0, 'glow'); }
  function out(root, muzzles, radius, height, extra) {
    var o = { root: root, muzzles: muzzles, radius: radius, height: height, engines: [] };
    if (extra) for (var k in extra) o[k] = extra[k];
    root.traverse(function (x) { if (x.isMesh) { x.castShadow = true; x.receiveShadow = false; } });
    return o;
  }
  function v3(x, y, z) { return new THREE.Vector3(x, y, z); }
  function engineGlow(parent, x, y, z, r, color) {
    var e = mesh('cyl', glow(color || 0xff7a3a), parent, x, y, z, r, 0.05, r, Math.PI / 2, 0, 0);
    e.castShadow = false;
    return e;
  }

  // ---------------------------------------------------------------- hover
  V.skimmer = function (pal) {
    var r = new THREE.Group(), body = grp(r, 0, 0.9, 0);
    var a = m(pal[0], 0.35, 0.4), b = m(pal[1]), d = m(0x222428, 0.5, 0.6);
    mesh('box', a, body, 0, 0, 0.2, 0.5, 0.35, 2.0);
    mesh('box', a, body, 0, 0.05, -1.3, 0.25, 0.18, 1.6);
    mesh('box', b, body, 0, 0.18, -0.3, 0.4, 0.14, 0.6);
    mesh('box', d, body, 0.4, 0, -1.6, 0.6, 0.06, 0.22); mesh('box', d, body, -0.4, 0, -1.6, 0.6, 0.06, 0.22);
    mesh('cyl', d, body, 0, -0.05, 1.2, 0.4, 0.5, 0.4, Math.PI / 2, 0, 0);
    engineGlow(body, 0, -0.05, 1.46, 0.3);
    mesh('box', d, body, 0, 0.35, 0.3, 0.12, 0.2, 0.5);
    var seat = grp(body, 0, 0.4, 0.25);
    return out(r, [v3(0.2, 0.9, -2.2), v3(-0.2, 0.9, -2.2)], 1.6, 1.3, { seat: seat, riderPose: 'bike' });
  };
  V.skiff = function (pal) {
    var r = new THREE.Group(), body = grp(r, 0, 1.4, 0);
    var a = m(pal[0], 0.5, 0.4), d = m(0x333333, 0.5, 0.5);
    mesh('cyl', a, body, 0, -0.3, 0, 0.9, 0.2, 0.9);
    mesh('cone', a, body, 0, -0.65, 0, 0.6, 0.5, 0.6, Math.PI, 0, 0);
    mesh('cyl', d, body, 0, 0.5, 0, 0.08, 1.4, 0.08);
    mesh('box', a, body, 0, 1.0, -0.15, 0.7, 0.18, 0.3);
    mesh('cyl', d, body, 0.3, 1.0, -0.5, 0.06, 0.5, 0.06, Math.PI / 2, 0, 0); mesh('cyl', d, body, -0.3, 1.0, -0.5, 0.06, 0.5, 0.06, Math.PI / 2, 0, 0);
    engineGlow(body, 0, -0.9, 0, 0.25, 0x66aaff);
    return out(r, [v3(0.3, 2.4, -0.8), v3(-0.3, 2.4, -0.8)], 1.1, 2.6, { seat: grp(body, 0, -0.2, 0.1), riderPose: 'stand' });
  };
  V.crawler = function (pal) {
    var r = new THREE.Group(), body = grp(r, 0, 1.0, 0);
    var a = m(pal[0], 0.55, 0.3), b = m(pal[1], 0.6, 0.3), d = m(0x2a2620, 0.6, 0.5);
    mesh('box', a, body, 0, 0.3, 0.2, 4.6, 1.2, 6.2);
    mesh('box', a, body, 0, 0.1, -3.4, 3.4, 0.9, 1.4, 0.2, 0, 0);
    mesh('box', b, body, 2.4, 0.2, 0.2, 0.6, 0.9, 5.4); mesh('box', b, body, -2.4, 0.2, 0.2, 0.6, 0.9, 5.4);
    mesh('box', d, body, 0, -0.4, 0.2, 4.4, 0.3, 5.8);
    for (var i = 0; i < 3; i++) mesh('cyl', d, body, (i - 1) * 1.2, 0.15, -4.0, 0.25, 0.8, 0.25, Math.PI / 2, 0, 0);
    var tur = grp(body, 0, 1.0, 0.8);
    mesh('box', a, tur, 0, 0.35, 0, 2.2, 0.7, 2.4);
    mesh('box', b, tur, 0, 0.75, 0.3, 1.2, 0.3, 1.2);
    mesh('cyl', d, tur, 0, 0.35, -3.2, 0.2, 4.2, 0.2, Math.PI / 2, 0, 0);
    engineGlow(body, 1.4, 0.2, 3.35, 0.5, 0xffaa55); engineGlow(body, -1.4, 0.2, 3.35, 0.5, 0xffaa55);
    return out(r, [v3(0, 2.35, -5.6)], 4.2, 3.2, { turret: tur, turretMuzzle: v3(0, 0.35, -5.3) });
  };
  V.sabre = function (pal) {
    var r = new THREE.Group(), body = grp(r, 0, 1.0, 0);
    var a = m(pal[0], 0.4, 0.3), b = m(pal[1], 0.45), d = m(0x2a2c30, 0.5, 0.5), glass = m(0x2a3a4a, 0.1, 0.8);
    mesh('box', a, body, 0, 0.3, 0, 3.2, 0.9, 6.0);
    mesh('box', a, body, 0, 0.2, -3.6, 1.6, 0.6, 1.6, 0.25, 0, 0);
    mesh('box', b, body, 0, 0.8, -1.0, 1.4, 0.3, 2.0);
    mesh('box', glass, body, 0, 1.0, -1.4, 1.0, 0.25, 0.8);
    mesh('box', d, body, 1.9, 0.3, 1.2, 0.8, 0.5, 3.0); mesh('box', d, body, -1.9, 0.3, 1.2, 0.8, 0.5, 3.0);
    engineGlow(body, 1.9, 0.3, 2.72, 0.35, 0x66aaff); engineGlow(body, -1.9, 0.3, 2.72, 0.35, 0x66aaff);
    var tur = grp(body, 0, 1.1, 0.8);
    mesh('box', b, tur, 0, 0.2, 0, 1.0, 0.4, 1.2);
    mesh('cyl', d, tur, 0.3, 0.2, -1.2, 0.08, 1.4, 0.08, Math.PI / 2, 0, 0); mesh('cyl', d, tur, -0.3, 0.2, -1.2, 0.08, 1.4, 0.08, Math.PI / 2, 0, 0);
    return out(r, [v3(0.3, 2.3, -3.0), v3(-0.3, 2.3, -3.0)], 3.5, 2.6, { turret: tur, turretMuzzle: v3(0, 0.2, -1.9) });
  };
  V.landspeeder = function (pal) {
    var r = new THREE.Group(), body = grp(r, 0, 0.8, 0);
    var a = m(pal[0], 0.6, 0.2), d = m(0x2a2a2a, 0.5, 0.5), seat = m(0x6a4a2a, 0.9);
    mesh('box', a, body, 0, 0, 0, 2.0, 0.5, 4.0);
    mesh('box', a, body, 0, 0.1, -2.3, 1.6, 0.35, 0.8, 0.2, 0, 0);
    mesh('box', seat, body, 0, 0.35, 0.2, 1.4, 0.3, 1.0);
    mesh('cyl', d, body, 0.9, 0.5, 1.4, 0.3, 1.2, 0.3, Math.PI / 2, 0, 0); mesh('cyl', d, body, -0.9, 0.5, 1.4, 0.3, 1.2, 0.3, Math.PI / 2, 0, 0);
    mesh('cyl', d, body, 0, 0.9, 1.0, 0.25, 1.2, 0.25, Math.PI / 2, 0, 0);
    engineGlow(body, 0.9, 0.5, 2.03, 0.25); engineGlow(body, -0.9, 0.5, 2.03, 0.25); engineGlow(body, 0, 0.9, 1.63, 0.2);
    var tur = grp(body, 0, 0.7, 0.7);
    mesh('cyl', d, tur, 0, 0.3, -0.6, 0.06, 1.2, 0.06, Math.PI / 2, 0, 0);
    return out(r, [v3(0, 1.8, -1.3)], 2.3, 1.6, { turret: tur, turretMuzzle: v3(0, 0.3, -1.2), seat: grp(body, 0, 0.3, 0.2), riderPose: 'sit' });
  };
  V.occupier = function (pal) {
    var r = new THREE.Group(), body = grp(r, 0, 1.0, 0);
    var a = m(pal[0], 0.55, 0.25), b = m(pal[1], 0.6), d = m(0x2a2c30, 0.5, 0.5), win = m(0x1a1c20, 0.1, 0.8);
    mesh('box', a, body, 0, 0.6, 0, 4.0, 2.0, 7.0);
    mesh('box', a, body, 0, 0.5, -4.0, 3.6, 1.4, 1.2, 0.3, 0, 0);
    mesh('box', b, body, 0, -0.5, 0, 3.6, 0.4, 6.4);
    mesh('box', win, body, 0, 1.0, -4.4, 2.4, 0.3, 0.2, 0.3, 0, 0);
    mesh('box', d, body, 2.1, 0.6, 0, 0.3, 1.6, 6.2); mesh('box', d, body, -2.1, 0.6, 0, 0.3, 1.6, 6.2);
    var tur = grp(body, 0, 1.8, -1.0);
    mesh('box', b, tur, 0, 0.3, 0, 1.6, 0.6, 1.6);
    mesh('cyl', d, tur, 0, 0.3, -1.6, 0.15, 2.0, 0.15, Math.PI / 2, 0, 0);
    engineGlow(body, 1.2, 0.3, 3.55, 0.5); engineGlow(body, -1.2, 0.3, 3.55, 0.5);
    return out(r, [v3(0, 3.1, -3.6)], 4.2, 3.6, { turret: tur, turretMuzzle: v3(0, 0.3, -2.6) });
  };

  // ---------------------------------------------------------------- walkers
  // Articulated leg: hip joint → upper leg (with hydraulic piston) → knee joint → lower leg → ankle → foot.
  // o: { l1, l2, th, mat, mat2, joint, foot:'pad'|'claw'|'spike', phase, back, splay, kneeOut }
  function leg2(parent, x, y, z, o) {
    var hip = grp(parent, x, y, z);
    var th = o.th, l1 = o.l1, l2 = o.l2;
    var jm = o.joint || m(0x3a3e44, 0.5, 0.6);
    mesh('cyl', jm, hip, 0, 0, 0, th * 1.5, th * 1.25, th * 1.5, 0, 0, Math.PI / 2);
    mesh('box', o.mat, hip, 0, -l1 / 2, 0, th, l1 * 0.92, th * 1.1);
    mesh('box', o.mat2 || o.mat, hip, 0, -l1 * 0.45, -th * 0.62, th * 0.55, l1 * 0.6, th * 0.18);        // armour plate
    mesh('cyl', m(0x8a8e94, 0.25, 0.85), hip, th * 0.62, -l1 * 0.5, th * 0.25, th * 0.16, l1 * 0.75, th * 0.16); // piston
    var knee = grp(hip, 0, -l1, 0);
    mesh('cyl', jm, knee, 0, 0, 0, th * 1.3, th * 1.2, th * 1.3, 0, 0, Math.PI / 2);
    mesh('box', o.mat2 || o.mat, knee, 0, -l2 / 2, 0, th * 0.82, l2 * 0.92, th * 0.9);
    mesh('cyl', m(0x8a8e94, 0.25, 0.85), knee, -th * 0.5, -l2 * 0.45, th * 0.2, th * 0.13, l2 * 0.7, th * 0.13);
    var foot = grp(knee, 0, -l2, 0);
    mesh('sph', jm, foot, 0, 0, 0, th * 1.05, th * 1.05, th * 1.05);
    if (o.foot === 'pad') {
      mesh('cyl', o.mat2 || o.mat, foot, 0, -th * 0.55, 0, th * 2.6, th * 0.7, th * 2.6);
      mesh('cyl', jm, foot, 0, -th * 0.95, 0, th * 2.8, th * 0.2, th * 2.8);
      for (var r = 0; r < 4; r++) mesh('box', jm, foot, Math.cos(r * 1.57) * th * 1.2, -th * 0.35, Math.sin(r * 1.57) * th * 1.2, th * 0.3, th * 0.5, th * 0.3);
    } else if (o.foot === 'claw') {
      mesh('box', o.mat2 || o.mat, foot, 0, -th * 0.45, -th * 0.3, th * 1.4, th * 0.45, th * 1.6);
      for (var c = -1; c <= 1; c++) mesh('box', jm, foot, c * th * 0.55, -th * 0.6, -th * 1.4, th * 0.32, th * 0.3, th * 1.3, 0, c * 0.35, 0);
      mesh('box', jm, foot, 0, -th * 0.6, th * 0.9, th * 0.35, th * 0.3, th * 0.9);
    } else {
      mesh('cone', jm, foot, 0, -th * 0.9, 0, th * 0.9, th * 1.6, th * 0.9, Math.PI, 0, 0);
    }
    return { hip: hip, knee: knee, foot: foot, l1: l1, l2: l2, phase: o.phase || 0, back: !!o.back, spread: !!o.splay, baseZ: 0, kneeOut: o.kneeOut || 0, amp: o.amp || 0.45, lift: o.lift || 0.6 };
  }
  function greeble(parent, mat, x, y, z, w, h, d, n, R) {
    for (var i = 0; i < n; i++) mesh('box', mat, parent, x + (R() - 0.5) * w, y + (R() - 0.5) * h, z + (R() - 0.5) * d, 0.12 + R() * 0.4, 0.08 + R() * 0.2, 0.12 + R() * 0.5, 0, 0, 0);
  }
  // splayed leg: upper segment rises outward by `up`, lower drops to the ground leaning out by `out`
  function splayLeg(top, x, y, z, sd, up, out, l1, h, footH, o) {
    var l2 = (h + l1 * Math.sin(up) - footH) / Math.cos(out);
    o.l1 = l1; o.l2 = l2; o.splay = true;
    var L = leg2(top, x, y, z, o);
    L.hip.rotation.z = sd * (Math.PI / 2 + up); L.knee.rotation.z = -sd * (Math.PI / 2 + up - out); L.foot.rotation.z = -sd * out;
    L.baseKneeZ = L.knee.rotation.z; L.side = sd;
    return L;
  }
  function rng(s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

  // Scout Strider: two reverse-knee legs under a boxy, angular cockpit "head"
  V.strider = function (pal) {
    var r = new THREE.Group(), R = rng(31);
    var a = m(0x8c9096, 0.55, 0.35), b = m(0x6e7278, 0.6, 0.35), d = m(0x2a2c30, 0.5, 0.55), win = m(0x0a0c10, 0.08, 0.9);
    var hipY = 5.6;
    var top = grp(r, 0, hipY, 0);
    // hip drive block and waist joint
    mesh('box', b, top, 0, 0.0, 0.1, 1.5, 0.7, 1.3);
    mesh('cyl', d, top, 0, 0.0, 0.1, 0.5, 2.3, 0.5, 0, 0, Math.PI / 2);
    mesh('cyl', d, top, 0, 0.55, 0.0, 0.7, 0.5, 0.7);
    var cab = grp(top, 0, 1.6, 0);
    // cockpit: wide box with chamfered "brow" and "chin", tapering toward the back
    mesh('box', a, cab, 0, 0.2, 0.1, 2.5, 1.6, 2.3);
    mesh('box', a, cab, 0, 0.75, -0.9, 2.3, 0.6, 1.0, -0.45, 0, 0);        // sloped brow
    mesh('box', a, cab, 0, -0.4, -1.05, 2.2, 0.55, 0.9, 0.5, 0, 0);       // sloped chin
    mesh('box', b, cab, 0, 1.1, 0.35, 1.7, 0.25, 1.6);                     // roof hatch plate
    mesh('cyl', d, cab, 0, 1.28, 0.35, 0.6, 0.12, 0.6);                     // hatch
    mesh('box', b, cab, 0, 0.15, 1.35, 2.0, 1.2, 0.5);                     // rear
    mesh('box', win, cab, 0.55, 0.42, -1.28, 0.7, 0.16, 0.08, -0.45, 0, 0); mesh('box', win, cab, -0.55, 0.42, -1.28, 0.7, 0.16, 0.08, -0.45, 0, 0); // view slits
    mesh('box', b, cab, 1.3, 0.25, -0.1, 0.12, 1.1, 1.8); mesh('box', b, cab, -1.3, 0.25, -0.1, 0.12, 1.1, 1.8); // side armour
    // chin twin blaster cannons and side mounts
    mesh('box', d, cab, 0, -0.75, -1.1, 0.8, 0.35, 0.5);
    mesh('cyl', d, cab, 0.22, -0.78, -1.75, 0.13, 1.2, 0.13, Math.PI / 2, 0, 0); mesh('cyl', d, cab, -0.22, -0.78, -1.75, 0.13, 1.2, 0.13, Math.PI / 2, 0, 0);
    mesh('box', d, cab, 1.5, 0.0, -0.6, 0.35, 0.35, 0.8); mesh('cyl', d, cab, 1.5, 0.0, -1.4, 0.09, 1.0, 0.09, Math.PI / 2, 0, 0);
    mesh('box', d, cab, -1.5, 0.15, -0.5, 0.4, 0.45, 0.7); mesh('cyl', d, cab, -1.5, 0.15, -1.1, 0.16, 0.55, 0.16, Math.PI / 2, 0, 0);
    greeble(cab, d, 0, 0.3, 1.6, 1.6, 0.8, 0.1, 6, R);
    var legs = [
      leg2(top, 1.25, 0, 0.1, { l1: 2.9, l2: 3.0, th: 0.42, mat: b, mat2: a, foot: 'claw', phase: 0, back: true, amp: 0.4 }),
      leg2(top, -1.25, 0, 0.1, { l1: 2.9, l2: 3.0, th: 0.42, mat: b, mat2: a, foot: 'claw', phase: Math.PI, back: true, amp: 0.4 })
    ];
    return out(r, [v3(0.22, hipY + 0.82, -2.6), v3(-0.22, hipY + 0.82, -2.6)], 2.2, hipY + 3.2, { legs: legs, top: top, hipY: hipY, head: cab, gait: 'biped' });
  };
  // Recon Strider: open seat on two reverse-knee legs, single front repeater
  V.strider_open = function (pal) {
    var r = new THREE.Group();
    var a = m(pal[0], 0.5, 0.3), b = m(0x6e7278, 0.55, 0.4), d = m(0x2a2c30, 0.5, 0.55);
    var hipY = 2.7;
    var top = grp(r, 0, hipY, 0);
    mesh('box', b, top, 0, 0.0, 0.15, 0.9, 0.55, 1.0);
    mesh('cyl', d, top, 0, 0.0, 0.1, 0.32, 1.5, 0.32, 0, 0, Math.PI / 2);
    mesh('box', a, top, 0, 0.45, 0.2, 0.75, 0.25, 0.9);       // seat pan
    mesh('box', a, top, 0, 0.85, 0.62, 0.7, 0.75, 0.15, 0.2, 0, 0);  // back rest
    mesh('box', b, top, 0, 0.35, -0.7, 0.55, 0.3, 0.8, -0.15, 0, 0); // front fairing
    mesh('cyl', d, top, 0, 0.75, -0.75, 0.035, 0.6, 0.035, 0.6, 0, 0); // control stalk
    mesh('box', d, top, 0, 0.95, -0.9, 0.5, 0.06, 0.1);
    mesh('box', d, top, 0, 0.15, -1.15, 0.25, 0.25, 0.4);
    mesh('cyl', d, top, 0, 0.15, -1.75, 0.08, 1.1, 0.08, Math.PI / 2, 0, 0);
    var legs = [
      leg2(top, 0.62, 0, 0.1, { l1: 1.45, l2: 1.5, th: 0.22, mat: b, mat2: a, foot: 'claw', phase: 0, back: true, amp: 0.45 }),
      leg2(top, -0.62, 0, 0.1, { l1: 1.45, l2: 1.5, th: 0.22, mat: b, mat2: a, foot: 'claw', phase: Math.PI, back: true, amp: 0.45 })
    ];
    return out(r, [v3(0, hipY + 0.15, -2.3)], 1.4, hipY + 1.6, { legs: legs, top: top, hipY: hipY, seat: grp(top, 0, 0.6, 0.2), riderPose: 'sit', gait: 'biped' });
  };
  // Colossus: long armoured body, ribbed neck, wedge head with chin cannons, four columnar legs with round feet
  V.colossus = function (pal) {
    var r = new THREE.Group(), R = rng(7);
    var a = m(0x9aa0a8, 0.7, 0.3), b = m(0x7a8088, 0.72, 0.3), d = m(0x2e3136, 0.6, 0.5), win = m(0x0a0c10, 0.08, 0.9), red = m(0x8a2a22, 0.6, 0.2);
    var hipY = 16;
    var top = grp(r, 0, hipY, 0);
    // body: main box with bevelled upper edges, side bays and a spine
    mesh('box', a, top, 0, 3.0, 0, 7.6, 5.0, 17.0);
    mesh('box', a, top, 2.9, 5.6, 0, 2.6, 1.4, 16.2, 0, 0, -0.6); mesh('box', a, top, -2.9, 5.6, 0, 2.6, 1.4, 16.2, 0, 0, 0.6);
    mesh('box', b, top, 0, 6.05, 0, 4.4, 0.6, 15.4);
    mesh('box', a, top, 0, 3.4, -8.9, 6.6, 3.8, 1.4, 0.35, 0, 0);   // front bevel
    mesh('box', a, top, 0, 3.4, 8.9, 6.6, 3.8, 1.4, -0.35, 0, 0);   // rear bevel
    mesh('box', b, top, 0, 0.35, 0, 5.6, 0.9, 14.0);                   // belly
    for (var i = 0; i < 6; i++) { mesh('box', b, top, 3.85, 3.0, -6.5 + i * 2.6, 0.2, 3.6, 2.1); mesh('box', b, top, -3.85, 3.0, -6.5 + i * 2.6, 0.2, 3.6, 2.1); }
    mesh('box', d, top, 3.9, 1.5, -2, 0.15, 0.4, 9); mesh('box', d, top, -3.9, 1.5, -2, 0.15, 0.4, 9);
    greeble(top, d, 0, 6.4, 0, 3.6, 0.2, 13, 22, R);
    mesh('box', red, top, 3.96, 4.6, -6.0, 0.05, 0.5, 2.4); mesh('box', red, top, -3.96, 4.6, -6.0, 0.05, 0.5, 2.4); // unit markings
    // neck: ribbed cylinder sections
    var neck = grp(top, 0, 3.2, -9.0);
    for (var n = 0; n < 6; n++) mesh('cyl', n % 2 ? d : b, neck, 0, 0, -0.45 - n * 0.55, n % 2 ? 1.5 : 1.8, 0.5, n % 2 ? 1.5 : 1.8, Math.PI / 2, 0, 0);
    // head
    var head = grp(neck, 0, 0, -3.7);
    mesh('box', a, head, 0, 0.2, -1.6, 4.2, 3.2, 5.0);
    mesh('box', a, head, 0, 1.55, -2.0, 3.6, 0.9, 4.2, 0.12, 0, 0);
    mesh('box', a, head, 0, -0.25, -4.3, 3.4, 2.2, 1.8, 0.42, 0, 0);    // sloped snout
    mesh('box', a, head, 2.15, 0.2, -1.4, 0.3, 2.6, 4.2); mesh('box', a, head, -2.15, 0.2, -1.4, 0.3, 2.6, 4.2);
    mesh('box', win, head, 0.8, 0.8, -4.05, 1.0, 0.32, 0.12, 0.42, 0, 0); mesh('box', win, head, -0.8, 0.8, -4.05, 1.0, 0.32, 0.12, 0.42, 0, 0);
    mesh('box', b, head, 0, -1.25, -2.6, 2.6, 0.5, 2.4);
    mesh('cyl', d, head, 0.85, -1.45, -4.4, 0.32, 3.0, 0.32, Math.PI / 2, 0, 0); mesh('cyl', d, head, -0.85, -1.45, -4.4, 0.32, 3.0, 0.32, Math.PI / 2, 0, 0); // chin cannons
    mesh('cyl', d, head, 2.45, 0.6, -3.0, 0.22, 2.2, 0.22, Math.PI / 2, 0, 0); mesh('cyl', d, head, -2.45, 0.6, -3.0, 0.22, 2.2, 0.22, Math.PI / 2, 0, 0); // temple guns
    var legs = [];
    [[3.4, -6.0, 0], [-3.4, -6.0, Math.PI], [3.4, 6.0, Math.PI], [-3.4, 6.0, 0]].forEach(function (p) {
      var L = leg2(top, p[0] * 1.32, 1.2, p[1], { l1: 8.2, l2: 7.85, th: 1.25, mat: b, mat2: a, joint: d, foot: 'pad', phase: p[2], amp: 0.28, lift: 0.45 });
      // armoured hip shroud and knee cap
      mesh('box', a, L.hip, 0, -0.6, 0, 1.4, 2.6, 2.8);
      mesh('box', a, L.knee, 0, 0.1, -0.9, 1.6, 1.8, 0.9);
      legs.push(L);
    });
    return out(r, [v3(0.85, hipY + 1.75, -21.2), v3(-0.85, hipY + 1.75, -21.2)], 9, hipY + 6.5, { legs: legs, top: top, hipY: hipY, head: head, big: true, gait: 'quad' });
  };
  // Sixlegger: two armoured hull sections, six splayed spider legs, mass cannon on the rear deck
  V.sixlegger = function (pal) {
    var r = new THREE.Group(), R = rng(13);
    var a = m(0xd8d4c8, 0.6, 0.2), b = m(pal[1] || 0x2f63c4, 0.6, 0.25), d = m(0x3a3e44, 0.6, 0.5), win = m(0x0a0c10, 0.08, 0.9);
    var hipY = 3.2;
    var top = grp(r, 0, hipY, 0);
    // front cockpit hull with sloped nose
    mesh('box', a, top, 0, 1.0, -2.7, 3.8, 2.2, 4.4);
    mesh('box', a, top, 0, 1.0, -5.3, 3.6, 2.0, 1.4, 0, 0, 0);
    mesh('box', a, top, 0, 0.55, -6.15, 3.4, 1.2, 1.0, 0.55, 0, 0);
    mesh('box', win, top, 0, 1.55, -6.0, 2.6, 0.3, 0.1, 0.3, 0, 0);
    mesh('box', b, top, 0, 2.18, -2.7, 3.2, 0.12, 3.6);
    mesh('box', b, top, 1.92, 1.0, -2.7, 0.06, 0.6, 4.0); mesh('box', b, top, -1.92, 1.0, -2.7, 0.06, 0.6, 4.0);
    mesh('cyl', d, top, 1.0, 0.1, -6.4, 0.16, 1.2, 0.16, Math.PI / 2, 0, 0); mesh('cyl', d, top, -1.0, 0.1, -6.4, 0.16, 1.2, 0.16, Math.PI / 2, 0, 0);
    // coupling
    mesh('cyl', d, top, 0, 0.9, 0.2, 1.1, 1.4, 1.1, Math.PI / 2, 0, 0);
    // rear hull
    mesh('box', a, top, 0, 1.0, 3.0, 3.6, 2.1, 4.6);
    mesh('box', b, top, 0, 2.12, 3.0, 3.0, 0.12, 4.0);
    greeble(top, d, 0, 2.3, 3.0, 2.6, 0.1, 3.6, 10, R);
    var tur = grp(top, 0, 2.3, 3.0);
    mesh('cyl', d, tur, 0, 0.35, 0, 1.0, 0.7, 1.0);
    mesh('box', a, tur, 0, 0.9, 0.2, 1.2, 0.9, 1.8);
    mesh('cyl', d, tur, 0, 1.0, -2.6, 0.32, 5.2, 0.32, Math.PI / 2, 0, 0);
    mesh('cyl', d, tur, 0, 1.0, -5.3, 0.45, 0.4, 0.45, Math.PI / 2, 0, 0);
    var legs = [];
    [-4.6, -0.4, 3.6].forEach(function (z, i) {
      [1, -1].forEach(function (sd) {
        legs.push(splayLeg(top, sd * 1.9, 0.4, z, sd, 0.5, 0.25, 2.3, hipY + 0.4, 0.45, { th: 0.38, mat: d, mat2: a, foot: 'pad', phase: (i + (sd > 0 ? 0 : 1)) % 2 ? 0 : Math.PI, amp: 0.3 }));
      });
    });
    return out(r, [v3(1.0, hipY + 0.1, -7.0), v3(-1.0, hipY + 0.1, -7.0)], 5.5, hipY + 4, { legs: legs, top: top, hipY: hipY, turret: tur, turretMuzzle: v3(0, 1.0, -5.5), gait: 'hex' });
  };
  // Spider synth walker: round body with a big eye cannon on four high-arching legs
  V.spider = function (pal) {
    var r = new THREE.Group();
    var a = m(pal[0], 0.5, 0.45), b = m(pal[1], 0.6, 0.45), d = m(0x2a2c30, 0.5, 0.6), eye = M.mat(0xff3322, 0.3, 0, 'emis');
    var hipY = 3.4;
    var top = grp(r, 0, hipY, 0);
    mesh('sph', a, top, 0, 1.0, 0, 3.2, 2.2, 3.2);
    mesh('cyl', b, top, 0, 1.0, 0, 3.3, 0.4, 3.3);
    mesh('sph', d, top, 0, 1.0, -1.45, 1.1, 1.1, 0.7);
    mesh('sph', eye, top, 0, 1.0, -1.82, 0.55, 0.55, 0.2);
    mesh('cyl', d, top, 0, 0.55, -2.4, 0.22, 1.8, 0.22, Math.PI / 2, 0, 0);
    mesh('cyl', b, top, 0, 2.05, 0, 0.9, 0.3, 0.9);
    var legs = [];
    [[1, -1, 0], [-1, -1, Math.PI], [1, 1, Math.PI], [-1, 1, 0]].forEach(function (p) {
      var L = splayLeg(top, p[0] * 1.3, 1.1, p[1] * 1.0, p[0], 0.6, 0.35, 2.4, hipY + 1.1, 0.35, { th: 0.24, mat: b, mat2: a, joint: d, foot: 'spike', phase: p[2], amp: 0.35 });
      L.hip.rotation.y = -p[1] * p[0] * 0.32; legs.push(L);
    });
    return out(r, [v3(0, hipY + 0.55, -3.3)], 2.8, hipY + 2.2, { legs: legs, top: top, hipY: hipY, gait: 'quad' });
  };
  // Crab synth walker: low wedge body on six jointed legs
  V.crab = function (pal) {
    var r = new THREE.Group();
    var a = m(pal[0], 0.5, 0.45), b = m(pal[1], 0.6, 0.45), d = m(0x2a2c30, 0.5, 0.6), eye = M.mat(0xff3322, 0.3, 0, 'emis');
    var hipY = 2.2;
    var top = grp(r, 0, hipY, 0);
    mesh('box', a, top, 0, 0.45, 0, 2.8, 0.9, 2.4);
    mesh('box', a, top, 0, 0.55, -1.4, 2.2, 0.6, 0.8, 0.4, 0, 0);
    mesh('box', b, top, 0, 1.0, 0.1, 1.8, 0.35, 1.6);
    mesh('sph', eye, top, 0.45, 0.6, -1.7, 0.25, 0.25, 0.15); mesh('sph', eye, top, -0.45, 0.6, -1.7, 0.25, 0.25, 0.15);
    mesh('cyl', d, top, 0.45, 0.35, -2.0, 0.08, 0.8, 0.08, Math.PI / 2, 0, 0); mesh('cyl', d, top, -0.45, 0.35, -2.0, 0.08, 0.8, 0.08, Math.PI / 2, 0, 0);
    var legs = [];
    [-0.8, 0, 0.8].forEach(function (z, i) {
      [1, -1].forEach(function (sd) {
        legs.push(splayLeg(top, sd * 1.4, 0.3, z, sd, 0.4, 0.3, 1.4, hipY + 0.3, 0.25, { th: 0.16, mat: b, mat2: a, joint: d, foot: 'spike', phase: (i + (sd > 0 ? 0 : 1)) % 2 ? 0 : Math.PI, amp: 0.35 }));
      });
    });
    return out(r, [v3(0.45, hipY + 0.35, -2.4), v3(-0.45, hipY + 0.35, -2.4)], 2.3, hipY + 1.5, { legs: legs, top: top, hipY: hipY, gait: 'hex' });
  };

  // ---------------------------------------------------------------- starfighters
  V.talon = function (pal) {
    var r = new THREE.Group();
    var a = m(pal[0] === 0x6f6a52 ? 0xdcd8d0 : pal[0], 0.5, 0.2), s = m(0xb83a2a, 0.5), d = m(0x3a3c40, 0.5, 0.5), glass = m(0x1a2a3a, 0.1, 0.8);
    mesh('box', a, r, 0, 0, 0, 1.3, 1.0, 9.0);
    mesh('box', a, r, 0, -0.1, -5.4, 0.7, 0.6, 2.2);
    mesh('box', glass, r, 0, 0.6, -1.2, 0.7, 0.4, 1.4);
    mesh('box', s, r, 0, 0.52, -3.0, 0.08, 0.02, 2.4);
    var wings = [];
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (p) {
      var w = grp(r, 0, 0, 2.0);
      mesh('box', a, w, p[0] * 3.0, 0, 0, 5.2, 0.12, 2.0);
      mesh('box', s, w, p[0] * 2.2, 0.07, 0, 1.2, 0.02, 1.8);
      mesh('cyl', d, w, p[0] * 1.4, 0, 0.6, 0.45, 2.6, 0.45, Math.PI / 2, 0, 0);
      engineGlow(w, p[0] * 1.4, 0, 1.92, 0.4, 0xff5533);
      mesh('cyl', d, w, p[0] * 5.6, 0, -1.6, 0.08, 4.0, 0.08, Math.PI / 2, 0, 0);
      w.rotation.z = p[1] * p[0] * 0.22;
      wings.push(w);
    });
    var mz = [v3(5.6, 1.2, -3.6), v3(-5.6, 1.2, -3.6), v3(5.6, -1.2, -3.6), v3(-5.6, -1.2, -3.6)];
    return out(r, mz, 6, 2, { wings: wings });
  };
  V.arrowhead = function (pal) {
    var r = new THREE.Group();
    var a = m(pal[0] === 0x6f6a52 ? 0xd8d8d0 : pal[0], 0.5, 0.2), s = m(pal[1] === 0xb8a582 ? 0xb83a2a : pal[1], 0.5), d = m(0x3a3c40, 0.5, 0.5), glass = m(0x1a2a3a, 0.1, 0.8);
    var shape = new THREE.Shape(); shape.moveTo(0, -4.5); shape.lineTo(3.0, 2.5); shape.lineTo(-3.0, 2.5); shape.lineTo(0, -4.5);
    var geo = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false }); geo.rotateX(Math.PI / 2); geo.translate(0, 0.3, 0);
    var hull = new THREE.Mesh(geo, a); r.add(hull);
    mesh('box', s, r, 0, 0.32, 0.5, 2.0, 0.04, 1.0);
    mesh('box', glass, r, 0, 0.6, 0.5, 0.8, 0.5, 1.2);
    mesh('box', d, r, 2.8, 0, 2.0, 0.6, 0.8, 1.6); mesh('box', d, r, -2.8, 0, 2.0, 0.6, 0.8, 1.6);
    engineGlow(r, 2.8, 0, 2.82, 0.3, 0xff8844); engineGlow(r, -2.8, 0, 2.82, 0.3, 0xff8844);
    return out(r, [v3(2.8, 0, -1.0), v3(-2.8, 0, -1.0)], 4, 1.4);
  };
  V.yoke = function (pal) {
    var r = new THREE.Group();
    var a = m(0xd8d0b8, 0.6, 0.2), s = m(0xc89a2a, 0.6), d = m(0x4a4c50, 0.6, 0.5);
    mesh('box', a, r, 0, 0, -3.5, 1.6, 1.2, 4.0);
    mesh('box', s, r, 0, 0.62, -3.5, 1.0, 0.04, 2.6);
    mesh('box', d, r, 0, 0, 0.5, 0.8, 0.6, 4.0);
    mesh('box', d, r, 0, 0, 2.2, 6.4, 0.4, 0.8);
    [3.0, -3.0].forEach(function (x) {
      mesh('cyl', a, r, x, 0, 1.6, 0.6, 6.0, 0.6, Math.PI / 2, 0, 0);
      engineGlow(r, x, 0, 4.62, 0.5, 0xff5533);
    });
    var tur = grp(r, 0, 0.8, -2.8);
    mesh('cyl', d, tur, 0, 0, -0.5, 0.06, 1.0, 0.06, Math.PI / 2, 0, 0);
    return out(r, [v3(0.4, 0, -5.8), v3(-0.4, 0, -5.8)], 4.5, 1.4);
  };
  V.eyeball = function (pal) {
    var r = new THREE.Group();
    var a = m(0x8a8e96, 0.5, 0.5), p = m(0x23252a, 0.6, 0.5), win = m(0x1a1c22, 0.1, 0.9);
    mesh('sph', a, r, 0, 0, 0, 1.9, 1.9, 1.9);
    mesh('cyl', win, r, 0, 0, -0.9, 0.9, 0.1, 0.9, Math.PI / 2, 0, 0);
    mesh('cyl', a, r, 0, 0, 0, 0.35, 4.6, 0.35, 0, 0, Math.PI / 2);
    // panels: hexagonal flat wings (rotated hex instead of the classic)
    [2.4, -2.4].forEach(function (x) {
      var pnl = mesh('cyl6', p, r, x, 0, 0, 5.2, 0.15, 5.2, 0, Math.PI / 6, Math.PI / 2);
      mesh('cyl6', a, r, x * 1.01, 0, 0, 1.0, 0.18, 1.0, 0, 0, Math.PI / 2);
    });
    engineGlow(r, 0, 0, 0.98, 0.35, 0xff4422);
    return out(r, [v3(0.3, -0.5, -1.4), v3(-0.3, -0.5, -1.4)], 3.2, 2.6);
  };
  V.dagger = function (pal) {
    var r = new THREE.Group();
    var a = m(0x5a6070, 0.5, 0.5), p = m(0x1a1c22, 0.6, 0.5), win = m(0x1a1c22, 0.1, 0.9);
    mesh('sph', a, r, 0, 0, 0, 1.8, 1.8, 2.0);
    mesh('cyl', win, r, 0, 0, -0.95, 0.85, 0.1, 0.85, Math.PI / 2, 0, 0);
    mesh('cyl', a, r, 0, 0, 0, 0.3, 3.4, 0.3, 0, 0, Math.PI / 2);
    [1, -1].forEach(function (sx) {
      [1, -1].forEach(function (sy) {
        var w = mesh('box', p, r, sx * 1.8, sy * 1.4, 0.2, 0.15, 2.8, 3.2, 0, 0, -sx * sy * 0.35);
        mesh('box', a, r, sx * 2.0, sy * 2.7, -0.8, 0.12, 0.6, 1.4, 0, 0, -sx * sy * 0.35);
      });
    });
    engineGlow(r, 0, 0, 1.0, 0.35, 0xff4422);
    return out(r, [v3(2.0, 2.7, -1.6), v3(-2.0, 2.7, -1.6), v3(2.0, -2.7, -1.6), v3(-2.0, -2.7, -1.6)], 3, 3);
  };
  V.twinpod = function (pal) {
    var r = new THREE.Group();
    var a = m(0x8a8e96, 0.5, 0.5), p = m(0x23252a, 0.6, 0.5), win = m(0x1a1c22, 0.1, 0.9);
    mesh('sph', a, r, 0.8, 0, -0.5, 1.6, 1.6, 2.2);
    mesh('cyl', win, r, 0.8, 0, -1.55, 0.7, 0.1, 0.7, Math.PI / 2, 0, 0);
    mesh('cyl', a, r, -0.9, 0, 0, 1.4, 5.0, 1.4, Math.PI / 2, 0, 0);
    [2.6, -2.6].forEach(function (x) { mesh('box', p, r, x, 0, 0, 0.15, 4.8, 3.0, 0, 0, x > 0 ? -0.25 : 0.25); });
    engineGlow(r, -0.9, 0, 2.52, 0.6, 0xff4422);
    return out(r, [v3(0.8, -0.6, -2.0)], 3.5, 3);
  };
  V.delta = function (pal) {
    var r = new THREE.Group();
    var a = m(pal[0] === 0xe8e6df ? 0xc8a032 : 0xb83030, 0.45, 0.4), d = m(0x3a3c40, 0.5, 0.5), glass = m(0x1a2a3a, 0.1, 0.8);
    var shape = new THREE.Shape(); shape.moveTo(0, -4); shape.lineTo(2.4, 2.4); shape.lineTo(-2.4, 2.4); shape.lineTo(0, -4);
    var geo = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false }); geo.rotateX(Math.PI / 2); geo.translate(0, 0.2, 0);
    r.add(new THREE.Mesh(geo, a));
    mesh('box', d, r, 0, 0.35, 0.5, 0.9, 0.4, 2.4);
    mesh('sph', glass, r, 0, 0.5, 0.2, 0.8, 0.5, 1.2);
    mesh('sph', m(0x2244aa, 0.4), r, -1.2, 0.35, 1.2, 0.5, 0.4, 0.5);
    engineGlow(r, 0.9, 0.1, 2.42, 0.3, 0x66aaff); engineGlow(r, -0.9, 0.1, 2.42, 0.3, 0x66aaff);
    return out(r, [v3(1.0, 0, -1.6), v3(-1.0, 0, -1.6)], 3.2, 1.2);
  };
  V.arcstriker = function (pal) {
    var r = new THREE.Group();
    var a = m(0xdcd8cc, 0.5, 0.2), s = m(pal[1] === 0x2f63c4 ? 0xb83a2a : pal[1], 0.5), d = m(0x3a3c40, 0.5, 0.5), glass = m(0x1a2a3a, 0.1, 0.8);
    mesh('box', a, r, 0, 0, -1, 1.4, 1.1, 10.0);
    mesh('box', glass, r, 0, 0.7, -3.0, 0.8, 0.4, 2.4);
    [1, -1].forEach(function (x) {
      mesh('box', a, r, x * 3.2, 0, 1.4, 5.0, 0.25, 3.2);
      mesh('box', s, r, x * 3.2, 0.14, 1.4, 4.0, 0.02, 0.5);
      mesh('cyl', d, r, x * 1.6, 0, 1.8, 0.55, 4.0, 0.55, Math.PI / 2, 0, 0);
      engineGlow(r, x * 1.6, 0, 3.82, 0.5, 0xff5533);
      mesh('cyl', d, r, x * 5.4, 0, -0.6, 0.12, 3.6, 0.12, Math.PI / 2, 0, 0);
    });
    mesh('box', a, r, 0, 1.3, 3.2, 0.2, 2.0, 2.0);
    return out(r, [v3(5.4, 0, -2.6), v3(-5.4, 0, -2.6)], 6, 2.5);
  };
  V.gunship = function (pal) {
    var r = new THREE.Group();
    var a = m(0xd8d4c8, 0.6, 0.2), s = m(pal[1], 0.6), d = m(0x3a3c40, 0.5, 0.5), glass = m(0x2a5a3a, 0.2, 0.6);
    mesh('box', a, r, 0, 0, 0, 3.2, 2.8, 12.0);
    mesh('box', a, r, 0, -0.2, -7.0, 2.4, 2.0, 2.4, 0.3, 0, 0);
    mesh('box', glass, r, 0, 0.6, -7.3, 2.0, 0.6, 1.2, 0.3, 0, 0);
    mesh('box', a, r, 0, 0.9, 1.0, 14.0, 0.3, 3.2);
    mesh('box', s, r, 4.5, 1.06, 1.0, 3.0, 0.02, 2.4); mesh('box', s, r, -4.5, 1.06, 1.0, 3.0, 0.02, 2.4);
    [5.5, -5.5].forEach(function (x) { mesh('cyl', d, r, x, 0.2, 2.0, 0.5, 2.6, 0.5, Math.PI / 2, 0, 0); engineGlow(r, x, 0.2, 3.32, 0.45, 0xffaa55); });
    mesh('box', a, r, 0, 2.2, 5.0, 0.3, 2.6, 2.2);
    mesh('sph', glass, r, 1.7, 0.5, -1.0, 0.9, 0.9, 0.9); mesh('sph', glass, r, -1.7, 0.5, -1.0, 0.9, 0.9, 0.9);
    return out(r, [v3(1.0, -1.2, -8.0), v3(-1.0, -1.2, -8.0)], 7, 3);
  };
  V.vulture = function (pal) {
    var r = new THREE.Group();
    var a = m(pal[0], 0.5, 0.4), b = m(pal[1], 0.6, 0.4), eye = M.mat(0xff5522, 0.4, 0, 'emis');
    mesh('box', a, r, 0, 0, -0.6, 1.4, 0.9, 5.0);
    mesh('box', b, r, 0, 0.2, -3.6, 0.8, 0.5, 1.4);
    mesh('sph', eye, r, 0.25, 0.25, -4.25, 0.18, 0.18, 0.1); mesh('sph', eye, r, -0.25, 0.25, -4.25, 0.18, 0.18, 0.1);
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (p) {
      mesh('box', a, r, p[0] * 3.0, p[1] * 0.35, 0.4, 4.8, 0.12, 1.4, 0, 0, p[1] * p[0] * 0.06);
      mesh('box', b, r, p[0] * 5.2, p[1] * 0.4, -0.6, 0.3, 0.3, 2.6);
    });
    engineGlow(r, 0, 0, 1.92, 0.4, 0x66aaff);
    return out(r, [v3(5.2, 0.4, -2.0), v3(-5.2, 0.4, -2.0)], 5.5, 1.5);
  };
  V.triclaw = function (pal) {
    var r = new THREE.Group();
    var a = m(pal[0], 0.5, 0.4), b = m(pal[1], 0.6, 0.4), eye = M.mat(0xff3322, 0.4, 0, 'emis');
    mesh('sph', a, r, 0, 0, 0, 2.2, 2.2, 2.2);
    mesh('sph', eye, r, 0, 0, -1.1, 0.5, 0.5, 0.2);
    for (var i = 0; i < 3; i++) {
      var ang = i * Math.PI * 2 / 3 + Math.PI / 2;
      var arm = grp(r, 0, 0, 0); arm.rotation.z = ang;
      mesh('box', b, arm, 2.4, 0, 0.3, 3.0, 0.4, 0.8);
      mesh('box', a, arm, 3.8, 0, -0.6, 0.5, 0.5, 2.4);
    }
    engineGlow(r, 0, 0, 1.12, 0.6, 0x66aaff);
    return out(r, [v3(0, 3.8, -1.8), v3(3.3, -1.9, -1.8), v3(-3.3, -1.9, -1.8)], 4.2, 4);
  };
  V.airspeeder = function (pal) {
    var r = new THREE.Group();
    var a = m(0xe0dcd2, 0.5, 0.2), s = m(0xd86a1a, 0.5), d = m(0x3a3c40, 0.5, 0.5), glass = m(0x1a2a3a, 0.1, 0.8);
    var shape = new THREE.Shape(); shape.moveTo(0, -3.5); shape.lineTo(2.2, -0.5); shape.lineTo(2.2, 2.0); shape.lineTo(-2.2, 2.0); shape.lineTo(-2.2, -0.5); shape.lineTo(0, -3.5);
    var geo = new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: false }); geo.rotateX(Math.PI / 2); geo.translate(0, 0.45, 0);
    r.add(new THREE.Mesh(geo, a));
    mesh('box', glass, r, 0, 0.7, -0.6, 1.4, 0.5, 1.4);
    mesh('box', s, r, 1.4, 0.47, -0.6, 0.6, 0.03, 1.8); mesh('box', s, r, -1.4, 0.47, -0.6, 0.6, 0.03, 1.8);
    mesh('cyl', d, r, 2.5, 0, 0.8, 0.5, 2.4, 0.5, Math.PI / 2, 0, 0); mesh('cyl', d, r, -2.5, 0, 0.8, 0.5, 2.4, 0.5, Math.PI / 2, 0, 0);
    engineGlow(r, 2.5, 0, 2.02, 0.45, 0xff7733); engineGlow(r, -2.5, 0, 2.02, 0.45, 0xff7733);
    return out(r, [v3(2.5, 0, -1.0), v3(-2.5, 0, -1.0)], 3.5, 1.4);
  };
  V.freighter = function () {
    var r = new THREE.Group();
    var a = m(0xc8c6c0, 0.65, 0.2), d = m(0x5a5c60, 0.6, 0.4), glass = m(0x1a2a3a, 0.1, 0.8);
    mesh('cyl', a, r, 0, 0, 0, 16, 1.8, 16);
    mesh('cyl', d, r, 0, 1.1, 0, 5, 0.6, 5);
    mesh('box', a, r, 2.4, 0, -10.0, 2.4, 1.4, 6.0); mesh('box', a, r, -2.4, 0, -10.0, 2.4, 1.4, 6.0);
    mesh('cyl', a, r, 8.4, 0.2, -3.6, 1.3, 4.0, 1.3, Math.PI / 2, 0, 0);
    mesh('sph', glass, r, 8.4, 0.2, -5.6, 1.3, 1.3, 0.6);
    var ge = mesh('box', glow(0x66bbff), r, 0, 0, 7.6, 10, 0.6, 0.4); ge.castShadow = false;
    mesh('cyl', d, r, 0, -1.1, 0, 1.4, 0.5, 1.4);
    mesh('box', d, r, -3, 1.6, 1.0, 1.0, 1.0, 4.0, 0, 0.7, 0);
    return out(r, [v3(1.5, 0, -13.2), v3(-1.5, 0, -13.2)], 9.5, 3);
  };
  V.firebrand = function () {
    var r = new THREE.Group();
    var a = m(0x5a7a4a, 0.6, 0.3), b = m(0x8a3a2a, 0.6, 0.3), d = m(0x3a3c40, 0.5, 0.5), glass = m(0x1a1a2a, 0.1, 0.8);
    // flies "upright": broad ellipse body with a cockpit at the front edge
    mesh('sph', a, r, 0, 0, 1.0, 5.6, 2.6, 7.6);
    mesh('box', b, r, 0, 0, -3.2, 2.8, 1.6, 2.6);
    mesh('sph', glass, r, 0, 0.2, -4.4, 1.6, 1.0, 0.8);
    mesh('box', a, r, 3.6, -0.2, 2.0, 1.0, 0.6, 4.0, 0, 0, -0.3); mesh('box', a, r, -3.6, -0.2, 2.0, 1.0, 0.6, 4.0, 0, 0, 0.3);
    mesh('cyl', d, r, 1.0, -0.8, -3.8, 0.15, 1.4, 0.15, Math.PI / 2, 0, 0); mesh('cyl', d, r, -1.0, -0.8, -3.8, 0.15, 1.4, 0.15, Math.PI / 2, 0, 0);
    engineGlow(r, 1.4, 0, 4.8, 0.5, 0x66aaff); engineGlow(r, -1.4, 0, 4.8, 0.5, 0x66aaff);
    return out(r, [v3(1.0, -0.8, -4.6), v3(-1.0, -0.8, -4.6)], 5, 3);
  };
  V.courier = function () {
    var r = new THREE.Group();
    var a = m(0xa8aeb4, 0.5, 0.6), d = m(0x4a4c50, 0.6, 0.4), glass = m(0x1a2a3a, 0.1, 0.8);
    mesh('box', a, r, 0, 0, 0, 3.0, 2.0, 12.0);
    mesh('box', a, r, 0, -0.2, -7.0, 2.0, 1.4, 2.4);
    mesh('box', glass, r, 0, 0.3, -8.2, 1.4, 0.5, 0.2);
    [3.6, -3.6].forEach(function (x) { mesh('cyl', d, r, x, 0, 2.0, 1.2, 9.0, 1.2, Math.PI / 2, 0, 0); mesh('box', a, r, x / 2, 0, 2.0, 3.6, 0.4, 1.8); engineGlow(r, x, 0, 6.52, 1.0, 0x66ccff); });
    return out(r, [v3(1.0, -0.8, -8.0), v3(-1.0, -0.8, -8.0)], 6, 2.5);
  };
  V.silverline = function () {
    var r = new THREE.Group();
    var chrome = m(0xd8dce4, 0.12, 0.95), y = m(0xd8b030, 0.4, 0.3), glass = m(0x1a2a3a, 0.1, 0.8);
    mesh('sph', chrome, r, 0, 0, -2.5, 1.2, 1.0, 5.0);
    mesh('sph', glass, r, 0, 0.4, -2.0, 0.7, 0.4, 1.2);
    mesh('cyl', y, r, 0, 0, 1.5, 0.6, 5.0, 0.6, Math.PI / 2, 0, 0);
    mesh('cone', chrome, r, 0, 0, 4.6, 0.6, 1.4, 0.6, Math.PI / 2, 0, 0);
    [1, -1].forEach(function (x) { mesh('cyl', chrome, r, x * 2.4, 0, 0.5, 0.5, 4.5, 0.5, Math.PI / 2, 0, 0); mesh('box', chrome, r, x * 1.2, 0, 0.5, 2.0, 0.15, 1.2); engineGlow(r, x * 2.4, 0, 2.77, 0.45, 0x66ccff); });
    return out(r, [v3(2.4, 0, -2.0), v3(-2.4, 0, -2.0)], 3.5, 1.4);
  };
  V.fang = function () {
    var r = new THREE.Group();
    var a = m(0x6a5a3a, 0.5, 0.5), b = m(0x2a2a2a, 0.5, 0.5), eye = M.mat(0xffcc33, 0.4, 0, 'emis');
    mesh('box', a, r, 0, 0, 0, 1.6, 1.2, 7.0);
    mesh('sph', eye, r, 0, 0.3, -3.6, 0.4, 0.3, 0.2);
    [1, -1].forEach(function (x) { mesh('box', b, r, x * 3.0, 0, 0.5, 4.6, 0.15, 2.4, 0, x * 0.3, 0); mesh('box', a, r, x * 5.0, 0, -0.6, 0.4, 1.4, 3.0); });
    engineGlow(r, 0, 0, 3.52, 0.5, 0x66aaff);
    return out(r, [v3(5.0, 0, -2.2), v3(-5.0, 0, -2.2)], 5.5, 2);
  };

  // ---------------------------------------------------------------- capital ships (length ~ 300-500 m)
  // Each returns subsystems: [{name, pos:Vector3, r}]
  V.capital = function (key, side) {
    var r = new THREE.Group(), subs = [];
    var grey = m(0x8a8e94, 0.75, 0.3), dark = m(0x3a3e44, 0.8, 0.3), white = m(0xd8d4cc, 0.7, 0.2), red = m(0xa83030, 0.7, 0.2);
    var light = glow(0xffeecc);
    function windows(parent, x, y, z, w, h, n) {
      for (var i = 0; i < n; i++) { var l = mesh('box', light, parent, x + (Math.random() - 0.5) * w, y + (Math.random() - 0.5) * h, z, 1.2, 0.6, 0.3); l.castShadow = false; }
    }
    if (key === 'wedge') {
      var shape = new THREE.Shape(); shape.moveTo(0, -260); shape.lineTo(110, 160); shape.lineTo(-110, 160); shape.lineTo(0, -260);
      var geo = new THREE.ExtrudeGeometry(shape, { depth: 40, bevelEnabled: false }); geo.rotateX(Math.PI / 2); geo.translate(0, 20, 0);
      r.add(new THREE.Mesh(geo, grey));
      var g2 = new THREE.ExtrudeGeometry(shape, { depth: 20, bevelEnabled: false }); g2.rotateX(Math.PI / 2); g2.scale(0.8, 1, 0.8); g2.translate(0, 40, 20);
      r.add(new THREE.Mesh(g2, grey));
      mesh('box', grey, r, 0, 60, 110, 70, 30, 60);
      mesh('box', grey, r, 0, 85, 125, 90, 18, 26);
      mesh('sph', dark, r, 30, 100, 125, 12, 12, 12); mesh('sph', dark, r, -30, 100, 125, 12, 12, 12);
      for (var i = -2; i <= 2; i++) { var e = engineGlow(r, i * 32, 15, 161, 13, 0x88aaff); }
      windows(r, 0, 25, -60, 80, 20, 40);
      subs.push({ name: 'Shield Generators', pos: v3(0, 100, 125), r: 20 }, { name: 'Engines', pos: v3(0, 15, 160), r: 40 }, { name: 'Bridge', pos: v3(0, 85, 125), r: 25 });
    } else if (key === 'cruiserLancer') {
      var sh = new THREE.Shape(); sh.moveTo(0, -240); sh.lineTo(90, 140); sh.lineTo(-90, 140); sh.lineTo(0, -240);
      var gg = new THREE.ExtrudeGeometry(sh, { depth: 34, bevelEnabled: false }); gg.rotateX(Math.PI / 2); gg.translate(0, 17, 0);
      r.add(new THREE.Mesh(gg, white));
      mesh('box', red, r, 0, 18, -60, 30, 2, 200);
      mesh('box', red, r, 50, 18, 60, 20, 2, 140, 0, -0.2, 0); mesh('box', red, r, -50, 18, 60, 20, 2, 140, 0, 0.2, 0);
      mesh('box', white, r, 30, 50, 110, 20, 40, 30); mesh('box', white, r, -30, 50, 110, 20, 40, 30);
      for (i = -2; i <= 2; i++) engineGlow(r, i * 26, 10, 141, 11, 0x88aaff);
      windows(r, 0, 20, -40, 60, 16, 30);
      subs.push({ name: 'Shield Generators', pos: v3(0, 80, 110), r: 20 }, { name: 'Engines', pos: v3(0, 10, 140), r: 36 }, { name: 'Bridge', pos: v3(30, 70, 110), r: 22 });
    } else if (key === 'ringship') {
      var tor = mesh(new THREE.TorusGeometry(140, 36, 10, 32), m(0x8a7a5a, 0.8, 0.3), r, 0, 0, 0, 1, 1, 1, Math.PI / 2, 0, 0);
      mesh('sph', m(0x8a7a5a, 0.8, 0.3), r, 0, 0, 0, 120, 100, 120);
      mesh('box', m(0x5a4a3a, 0.8), r, 0, 0, -150, 80, 60, 60);
      windows(r, 0, 0, -181, 70, 40, 30);
      for (i = 0; i < 6; i++) engineGlow(r, Math.cos(i) * 60, Math.sin(i) * 20, 176, 10, 0xffaa66);
      subs.push({ name: 'Reactor Core', pos: v3(0, 0, 0), r: 55 }, { name: 'Hangar Bay', pos: v3(0, 0, -150), r: 40 }, { name: 'Command Sphere', pos: v3(0, 55, 0), r: 30 });
    } else if (key === 'coralCruiser') {
      var hull = mesh('sph', m(0x7a8a8a, 0.6, 0.3), r, 0, 0, 0, 120, 70, 520);
      mesh('sph', m(0x6a7878, 0.6, 0.3), r, 0, 20, 40, 90, 60, 300);
      for (i = 0; i < 4; i++) engineGlow(r, (i - 1.5) * 24, 0, 255, 12, 0x88ccff);
      windows(r, 0, 10, -200, 60, 30, 50);
      subs.push({ name: 'Shield Generators', pos: v3(0, 50, 40), r: 30 }, { name: 'Engines', pos: v3(0, 0, 250), r: 40 }, { name: 'Bridge', pos: v3(0, 30, -180), r: 30 });
    } else if (key === 'picket') {
      mesh('box', m(0xb8bcc4, 0.6, 0.3), r, 0, 0, 0, 50, 40, 300);
      mesh('box', m(0x2a5a8a, 0.6, 0.3), r, 0, 22, -40, 30, 10, 120);
      mesh('box', m(0xb8bcc4, 0.6, 0.3), r, 0, 40, 80, 40, 30, 50);
      for (i = 0; i < 3; i++) engineGlow(r, (i - 1) * 16, 0, 151, 10, 0x88ccff);
      windows(r, 0, 10, -100, 30, 20, 30);
      subs.push({ name: 'Shield Generators', pos: v3(0, 60, 80), r: 22 }, { name: 'Engines', pos: v3(0, 0, 150), r: 30 }, { name: 'Bridge', pos: v3(0, 40, 80), r: 22 });
    } else { // remcruiser
      var s2 = new THREE.Shape(); s2.moveTo(0, -180); s2.lineTo(70, 120); s2.lineTo(-70, 120); s2.lineTo(0, -180);
      var g3 = new THREE.ExtrudeGeometry(s2, { depth: 30, bevelEnabled: false }); g3.rotateX(Math.PI / 2); g3.translate(0, 15, 0);
      r.add(new THREE.Mesh(g3, m(0x3a3c42, 0.7, 0.4)));
      mesh('box', m(0x2a2c32, 0.7, 0.4), r, 0, 45, 80, 50, 30, 40);
      mesh('box', red, r, 0, 18, -40, 6, 2, 160);
      for (i = -1; i <= 1; i++) engineGlow(r, i * 30, 12, 121, 12, 0xff8866);
      windows(r, 0, 20, -40, 50, 14, 30);
      subs.push({ name: 'Shield Generators', pos: v3(0, 70, 80), r: 20 }, { name: 'Engines', pos: v3(0, 12, 120), r: 34 }, { name: 'Bridge', pos: v3(0, 45, 80), r: 22 });
    }
    r.traverse(function (x) { if (x.isMesh) { x.castShadow = false; x.receiveShadow = false; } });
    return { root: r, subsystems: subs };
  };

  V.build = function (vdef, faction) {
    var F = SF.D.factions[faction] || SF.D.factions.concord;
    var pal = [F.pal[0], F.pal[1], F.pal[2]];
    var b = V[vdef.model] || V.skimmer;
    M.rounded = false;   // hard-surface machines: crisp edges
    var o; try { o = b(pal); } finally { M.rounded = true; }
    o.def = vdef;
    return o;
  };
})();
