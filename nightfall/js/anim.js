// Procedural animation: every rig is driven by poses that blend toward targets each frame.
var NF = window.NF || (window.NF = {});
NF.anim = (function () {
  var A = {};
  var S = Math.sin, C = Math.cos, PI = Math.PI;
  var HUMAN = ['hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'shL', 'elL', 'wrL', 'shR', 'elR', 'wrR', 'hipL', 'knL', 'anL', 'hipR', 'knR', 'anR', 'skirt', 'apron', 'pony'];
  var DOG = ['torso', 'neck', 'head', 'jaw', 'hipFL', 'knFL', 'hipFR', 'knFR', 'hipBL', 'knBL', 'hipBR', 'knBR', 'tail'];
  function base() { return { shL: [0, 0, 0.1], shR: [0, 0, -0.1], elL: [-0.15, 0, 0], elR: [-0.15, 0, 0], hipsY: 0, hipsZ: 0 }; }
  A.base = base;
  function add(p, j, x, y, z) { var a = p[j] || (p[j] = [0, 0, 0]); a[0] += x || 0; a[1] += y || 0; a[2] += z || 0; return p; }
  A.add = add;
  A.apply = function (rig, pose, k) {
    var J = rig.J, list = rig.kind === 'dog' ? DOG : HUMAN;
    for (var i = 0; i < list.length; i++) {
      var j = J[list[i]]; if (!j) continue;
      var t = pose[list[i]] || [0, 0, 0];
      j.rotation.x += (t[0] - j.rotation.x) * k;
      j.rotation.y += (t[1] - j.rotation.y) * k;
      j.rotation.z += (t[2] - j.rotation.z) * k;
    }
    if (rig.kind === 'dog') { J.torso.position.y += ((0.6 + (pose.bodyY || 0)) - J.torso.position.y) * k; }
    else {
      J.hips.position.y += ((0.94 + (pose.hipsY || 0)) - J.hips.position.y) * k;
      J.hips.position.z += ((pose.hipsZ || 0) - J.hips.position.z) * k;
    }
  };
  A.idle = function (t, v) {
    v = v || 0;
    var p = base();
    add(p, 'chest', 0.025 * S(t * 1.7), 0, 0);
    add(p, 'spine', 0.01 * S(t * 1.7 + 1), 0, 0);
    add(p, 'head', 0.04 * S(t * 0.4 + v), 0.25 * S(t * 0.23 + v * 3), 0);
    add(p, 'shL', 0.03 * S(t * 1.7), 0, 0.03 * S(t * 1.7));
    add(p, 'shR', 0.03 * S(t * 1.7), 0, -0.03 * S(t * 1.7));
    add(p, 'hipL', 0, 0.1, 0.03); add(p, 'hipR', 0, -0.1, -0.03);
    add(p, 'pony', 0.1 * S(t * 1.3), 0, 0.05 * S(t * 0.9));
    p.hipsY = -0.01 + 0.005 * S(t * 1.7);
    return p;
  };
  // walk / run cycle: ph = phase radians, a = amplitude 0..1, run 0..1
  A.walk = function (ph, a, run, p) {
    p = p || base();
    var amp = 0.48 + run * 0.32;
    var sL = S(ph), cL = C(ph);
    add(p, 'hipL', -sL * amp * a, 0, 0); add(p, 'hipR', sL * amp * a, 0, 0);
    add(p, 'knL', (Math.max(0, cL) * (0.9 + run * 0.8) + 0.08) * a, 0, 0);
    add(p, 'knR', (Math.max(0, -cL) * (0.9 + run * 0.8) + 0.08) * a, 0, 0);
    add(p, 'anL', (sL * 0.25 - Math.max(0, cL) * 0.2) * a, 0, 0); add(p, 'anR', (-sL * 0.25 - Math.max(0, -cL) * 0.2) * a, 0, 0);
    add(p, 'shL', sL * (0.38 + run * 0.35) * a, 0, 0); add(p, 'shR', -sL * (0.38 + run * 0.35) * a, 0, 0);
    add(p, 'elL', (-0.2 - run * 1.1) * a, 0, 0); add(p, 'elR', (-0.2 - run * 1.1) * a, 0, 0);
    add(p, 'spine', run * 0.2 * a, sL * 0.07 * a, 0);
    add(p, 'chest', 0, -sL * 0.12 * a, 0);
    add(p, 'head', -run * 0.12 * a, sL * 0.05 * a, 0);
    add(p, 'pony', -0.3 * run + 0.15 * S(ph * 2), 0, 0.12 * sL);
    add(p, 'skirt', 0, 0, 0.04 * sL); add(p, 'apron', -0.15 * Math.abs(sL) * a, 0, 0);
    p.hipsY = (p.hipsY || 0) - (0.02 + run * 0.04) * a + (0.025 + run * 0.03) * a * C(ph * 2);
    return p;
  };
  // player gun poses. pitch: + up. rec: recoil 0..1
  A.aimPistol = function (p, pitch, rec, t) {
    var sw = 0.006 * S(t * 1.3);
    p.shR = [-PI / 2 - pitch * 0.9 - rec * 0.35 + sw, 0, 0.24];
    p.elR = [-0.06 - rec * 0.25, 0, 0];
    p.wrR = [0.06 + rec * 0.2 + pitch * 0.1, 0, 0];
    p.shL = [-PI / 2 - pitch * 0.9 - rec * 0.3 + sw, 0, -0.44];
    p.elL = [-0.32, 0, 0]; p.wrL = [0.15, 0, -0.2];
    p.chest = [-pitch * 0.15 + 0.02, 0.06, 0]; p.spine = [-pitch * 0.1, 0.06, 0];
    p.head = [-pitch * 0.55, -0.1, 0];
    return p;
  };
  A.aimLong = function (p, pitch, rec, t) {
    p.shR = [-1.15 - pitch * 0.9 - rec * 0.2, 0, 0.45];
    p.elR = [-1.5 - rec * 0.1, 0, 0]; p.wrR = [0.2, 0, 0];
    p.shL = [-1.35 - pitch * 0.9 - rec * 0.2, 0, -0.55];
    p.elL = [-0.45, 0, 0];
    p.chest = [-pitch * 0.15, 0.2, 0]; p.spine = [-pitch * 0.1, 0.12, 0];
    p.head = [-pitch * 0.5, -0.25, 0.1];
    return p;
  };
  A.holdLong = function (p) { // shotgun at the low ready
    p.shR = [-0.25, 0, 0.12]; p.elR = [-1.15, 0, 0]; p.wrR = [0.3, 0, 0];
    p.shL = [-0.75, 0, -0.45]; p.elL = [-0.7, 0, 0];
    return p;
  };
  A.holdPistol = function (p) { add(p, 'shR', -0.25, 0, 0.05); add(p, 'elR', -0.7, 0, 0); add(p, 'wrR', 0.6, 0, 0); return p; };
  A.knife = function (p, ph) { // slash ph 0..1
    var k = ph < 0.35 ? ph / 0.35 : 1 - (ph - 0.35) / 0.65;
    p.shR = [-1.2 - 0.6 * (1 - k), 0, -0.9 + k * 1.6];
    p.elR = [-0.6 + k * 0.4, 0, 0];
    p.chest = [0.1, 0.5 - k * 0.9, 0]; p.spine = [0.1, 0.2 - k * 0.3, 0];
    return p;
  };
  A.reload = function (p, ph) {
    p.shR = [-0.9, 0, 0.35]; p.elR = [-1.0, 0, 0];
    var k = S(ph * PI);
    p.shL = [-0.6 - k * 0.4, 0, -0.2 + k * 0.4]; p.elL = [-1.4 + k * 0.4, 0, 0];
    p.head = [0.35, 0, 0];
    return p;
  };
  A.heal = function (p, ph) { p.shL = [-1.0, 0, -0.4]; p.elL = [-1.7, 0, 0]; p.head = [0.4, 0.1, 0]; p.shR = [-0.5, 0, 0.3]; p.elR = [-1.4, 0, 0]; return p; };
  A.flinch = function (p, k) { add(p, 'spine', -0.35 * k, 0.2 * k, 0); add(p, 'head', -0.4 * k, 0, 0.2 * k); add(p, 'shL', -0.4 * k, 0, 0.4 * k); add(p, 'shR', -0.4 * k, 0, -0.4 * k); return p; };
  A.grabbed = function (p, t) { // being bitten
    p.shL = [-1.4, 0, -0.3 + 0.1 * S(t * 18)]; p.shR = [-1.4, 0, 0.3 - 0.1 * S(t * 17)];
    p.elL = [-1.2, 0, 0]; p.elR = [-1.2, 0, 0];
    p.spine = [-0.25, 0.1 * S(t * 9), 0]; p.head = [-0.3, 0.4, 0.2];
    return p;
  };
  A.dying = function (p, k) { // knees buckle
    add(p, 'hipL', -0.9 * k, 0, 0.1); add(p, 'hipR', -0.7 * k, 0, -0.1);
    add(p, 'knL', 1.6 * k, 0, 0); add(p, 'knR', 1.4 * k, 0, 0);
    add(p, 'spine', 0.4 * k, 0, 0); add(p, 'head', 0.5 * k, 0, 0.3 * k);
    add(p, 'shL', 0.1, 0, 0.3 * k); add(p, 'shR', 0.1, 0, -0.3 * k);
    p.hipsY = -0.42 * k;
    return p;
  };
  A.dead = function (p) { p.shL = [-0.3, 0.3, 0.9]; p.shR = [-0.2, -0.2, -1.1]; p.elL = [-0.5, 0, 0]; p.hipL = [0, 0, 0.2]; p.knR = [0.4, 0, 0]; p.hipR = [-0.3, 0, -0.1]; p.head = [0, 0.8, 0]; return p; };

  // ------------------------------------------------------------- zombies
  A.shamble = function (ph, a, t, v) {
    var p = base();
    var reach = v < 0.65;
    var sL = S(ph);
    if (reach) {
      p.shL = [-1.25 + 0.15 * S(t * 1.3 + v * 9), 0, 0.18 + 0.05 * S(t * 0.7)];
      p.shR = [-1.05 + 0.18 * S(t * 1.1 + v * 5), 0, -0.2];
      p.elL = [-0.25, 0, 0]; p.elR = [-0.45, 0, 0];
      p.wrL = [0.45, 0, 0]; p.wrR = [0.5, 0, 0.2];
    } else {
      p.shL = [sL * 0.25 * a, 0, 0.12]; p.shR = [-sL * 0.15 * a + 0.1, 0, -0.18];
      p.elL = [-0.1, 0, 0]; p.elR = [-0.3, 0, 0]; p.wrR = [0.3, 0, 0];
    }
    p.hipL = [-sL * 0.42 * a, 0, 0.03]; p.hipR = [sL * 0.2 * a - 0.05, 0.2, -0.04];
    p.knL = [Math.max(0, C(ph)) * 0.8 * a + 0.12, 0, 0]; p.knR = [0.15 + Math.max(0, -C(ph)) * 0.25 * a, 0, 0];
    p.anR = [0.2, 0, 0.15];
    p.spine = [0.28 + 0.05 * S(t * 0.9), 0.08 * sL, 0.08 * S(ph)];
    p.chest = [0.1, -0.1 * sL, 0.05];
    p.head = [0.3 + 0.1 * S(t * 0.8 + v), 0.2 * S(t * 0.5 + v * 7), (v - 0.5) * 0.9 + 0.1 * S(t * 0.6)];
    p.jaw = [0.2 + 0.2 * Math.max(0, S(t * 2.3 + v * 4)), 0, 0];
    p.hips = [0, 0, 0.07 * S(ph)];
    p.hipsY = -0.05 - 0.04 * Math.abs(sL) * a;
    p.skirt = [0, 0, 0.05 * sL];
    return p;
  };
  A.zAttack = function (ph, v) {
    var p = A.shamble(0, 0, ph * 3, v);
    var k = ph < 0.5 ? ph / 0.5 : 1;
    p.shL = [-1.5 + k * 0.1, 0, 0.6 - k * 0.8]; p.shR = [-1.5 + k * 0.1, 0, -0.6 + k * 0.8];
    p.elL = [-0.15 - k * 0.8, 0, 0]; p.elR = [-0.15 - k * 0.8, 0, 0];
    p.spine = [0.3 + k * 0.25, 0, 0]; p.head = [0.2 + k * 0.4, 0, 0.3]; p.jaw = [0.25 + k * 0.4, 0, 0];
    p.hipsZ = k * 0.12;
    return p;
  };
  A.zEat = function (t, v) {
    var p = base();
    p.hipL = [-1.5, 0, 0.2]; p.hipR = [-1.3, 0, -0.2]; p.knL = [2.4, 0, 0]; p.knR = [2.3, 0, 0];
    p.anL = [0.6, 0, 0]; p.anR = [0.6, 0, 0];
    p.hipsY = -0.52; p.hipsZ = -0.05;
    p.spine = [0.7 + 0.1 * S(t * 3 + v), 0, 0]; p.chest = [0.3, 0, 0];
    p.head = [0.5 + 0.25 * Math.max(0, S(t * 4 + v)), 0.2 * S(t * 2), 0.3];
    p.jaw = [0.3 + 0.3 * Math.abs(S(t * 8)), 0, 0];
    p.shL = [-0.9, 0, 0.3]; p.shR = [-1.0 + 0.2 * S(t * 4), 0, -0.3]; p.elL = [-1.0, 0, 0]; p.elR = [-1.3, 0, 0];
    return p;
  };
  A.stagger = function (p, k, dir) {
    add(p, 'spine', -0.5 * k, 0.3 * k * dir, 0.2 * k * dir); add(p, 'head', -0.6 * k, 0, 0.3 * k);
    add(p, 'shL', 0.6 * k, 0, 0.5 * k); add(p, 'shR', 0.6 * k, 0, -0.5 * k);
    add(p, 'knL', 0.3 * k, 0, 0); add(p, 'knR', 0.5 * k, 0, 0);
    return p;
  };
  // crawling on all fours (Skinner)
  A.crawl = function (ph, a, t) {
    var p = base(), lean = 1.25;
    var s = S(ph), c = C(ph);
    p.hips = [lean, 0, 0.06 * s];
    p.hipsY = -0.44 + 0.03 * C(ph * 2);
    p.hipL = [-lean - 0.3 - s * 0.45 * a, 0, 0.25]; p.hipR = [-lean - 0.3 + s * 0.45 * a, 0, -0.25];
    p.knL = [1.4 + Math.max(0, c) * 0.6 * a, 0, 0]; p.knR = [1.4 + Math.max(0, -c) * 0.6 * a, 0, 0];
    p.anL = [0.4, 0, 0]; p.anR = [0.4, 0, 0];
    p.spine = [0.0, 0.1 * s, 0]; p.chest = [-0.1, -0.12 * s, 0];
    p.shL = [-lean + 0.1 + s * 0.5 * a, 0, 0.35]; p.shR = [-lean + 0.1 - s * 0.5 * a, 0, -0.35];
    p.elL = [-0.3 - Math.max(0, -c) * 0.7 * a, 0, 0]; p.elR = [-0.3 - Math.max(0, c) * 0.7 * a, 0, 0];
    p.wrL = [0.9, 0, 0]; p.wrR = [0.9, 0, 0];
    p.neck = [-0.6, 0, 0]; p.head = [-0.65 + 0.1 * S(t * 3), 0.3 * S(t * 1.1), 0.1 * S(t * 2)];
    p.jaw = [0.25 + 0.2 * Math.abs(S(t * 3)), 0, 0];
    return p;
  };
  A.pounce = function (k) {
    var p = A.crawl(0, 0, 0);
    p.hips = [1.0 - k * 0.3, 0, 0];
    p.shL = [-2.6, 0, 0.5]; p.shR = [-2.6, 0, -0.5]; p.elL = [-0.2, 0, 0]; p.elR = [-0.2, 0, 0];
    p.hipL = [-0.6, 0, 0.3]; p.hipR = [-0.6, 0, -0.3]; p.knL = [0.3, 0, 0]; p.knR = [0.3, 0, 0];
    p.jaw = [0.7, 0, 0]; p.hipsY = -0.3;
    return p;
  };
  // the Warden
  A.heavyWalk = function (ph, a, t) {
    var p = A.walk(ph, a * 0.85, 0);
    add(p, 'spine', 0.12, 0, 0.05 * S(ph)); add(p, 'chest', 0.05, 0, 0);
    p.shR = [-0.15 - S(ph) * 0.15 * a, 0, -0.15]; p.elR = [-0.4, 0, 0];
    add(p, 'head', 0.15, 0, 0);
    p.hipsY -= 0.02 * Math.abs(S(ph));
    return p;
  };
  A.cleave = function (ph) {
    var p = base();
    var wind = Math.min(1, ph / 0.45), strike = ph < 0.45 ? 0 : Math.min(1, (ph - 0.45) / 0.12);
    p.shR = [-0.2 - 2.7 * wind + 2.4 * strike, 0, -0.3 + 0.3 * strike];
    p.elR = [-1.2 * wind + 1.0 * strike, 0, 0];
    p.spine = [-0.2 * wind + 0.55 * strike, 0.3 * wind - 0.2 * strike, 0];
    p.chest = [0, 0.2 * wind - 0.3 * strike, 0];
    p.shL = [-0.6 * wind, 0, 0.5]; p.elL = [-0.5, 0, 0];
    p.hipL = [-0.5 * strike, 0, 0]; p.knL = [0.4 * strike, 0, 0]; p.knR = [0.2, 0, 0];
    p.hipsY = -0.08 * strike;
    p.head = [0.2 * strike, 0, 0];
    return p;
  };
  // the final form
  A.boss = function (mode, ph, t) {
    var p = A.idle(t, 0);
    p.hipL = [0.1, 0.3, 0.12]; p.hipR = [0.1, -0.3, -0.12]; p.knL = [0.3, 0, 0]; p.knR = [0.3, 0, 0]; p.hipsY = -0.07;
    p.spine = [0.25 + 0.05 * S(t * 1.2), 0, 0.1]; p.chest = [0.1, 0, 0.08];
    p.shR = [-0.3 + 0.1 * S(t), 0, -0.25]; p.elR = [-0.3, 0, 0];
    p.shL = [-0.4, 0, 0.3]; p.elL = [-0.9, 0, 0];
    p.head = [0.1, 0.3 * S(t * 0.6), 0.25 * S(t * 0.8)]; p.jaw = [0.3 + 0.15 * S(t * 2), 0, 0];
    if (mode === 'walk') { var w = A.walk(ph, 0.8, 0); ['hipL', 'hipR', 'knL', 'knR'].forEach(function (k) { p[k] = w[k]; }); p.hipsY = w.hipsY - 0.07; }
    if (mode === 'slam') {
      var up = Math.min(1, ph / 0.5), dn = ph < 0.5 ? 0 : Math.min(1, (ph - 0.5) / 0.12);
      p.shR = [-0.3 - 2.6 * up + 2.4 * dn, 0, -0.2]; p.elR = [-0.6 * up + 0.5 * dn, 0, 0];
      p.spine = [0.25 - 0.4 * up + 0.9 * dn, 0, 0]; p.hipsY = -0.07 - 0.2 * dn;
      p.jaw = [0.8 * up, 0, 0]; p.head = [-0.5 * up + 0.6 * dn, 0, 0];
    }
    if (mode === 'sweep') {
      var k = Math.min(1, ph / 0.4), sw = ph < 0.4 ? 0 : Math.min(1, (ph - 0.4) / 0.25);
      p.shR = [-1.3, 0, -1.3 * k + 2.4 * sw]; p.elR = [-0.2, 0, 0];
      p.chest = [0.1, -0.5 * k + 1.0 * sw, 0]; p.spine = [0.3, -0.3 * k + 0.5 * sw, 0];
    }
    if (mode === 'roar') {
      var r = S(Math.min(1, ph) * PI);
      p.head = [-0.9 * r, 0, 0]; p.jaw = [1.0 * r, 0, 0]; p.spine = [0.25 - 0.5 * r, 0, 0];
      p.shL = [-0.4, 0, 0.3 + 1.0 * r]; p.shR = [-0.3, 0, -0.25 - 0.9 * r];
    }
    if (mode === 'hurt') { p.spine = [-0.3, 0.3, 0]; p.head = [-0.5, 0, 0.4]; p.jaw = [0.9, 0, 0]; }
    return p;
  };

  // ---------------------------------------------------------------- dogs
  A.dogRun = function (ph, a, t) {
    var p = {}, s = S(ph), s2 = S(ph + 0.5);
    p.hipFL = [s * 0.7 * a, 0, 0]; p.hipFR = [s2 * 0.7 * a, 0, 0];
    p.hipBL = [-S(ph + 2.6) * 0.7 * a, 0, 0]; p.hipBR = [-S(ph + 3.1) * 0.7 * a, 0, 0];
    p.knFL = [-Math.max(0, C(ph)) * 0.9 * a, 0, 0]; p.knFR = [-Math.max(0, C(ph + 0.5)) * 0.9 * a, 0, 0];
    p.knBL = [Math.max(0, C(ph + 2.6)) * 0.9 * a + 0.2, 0, 0]; p.knBR = [Math.max(0, C(ph + 3.1)) * 0.9 * a + 0.2, 0, 0];
    p.torso = [S(ph) * 0.1 * a, 0, 0];
    p.neck = [-0.1 + C(ph) * 0.1 * a, 0, 0]; p.head = [0.25, 0.1 * S(t * 0.7), 0];
    p.jaw = [0.25 + 0.3 * a * Math.abs(S(ph)), 0, 0];
    p.tail = [0.3 * S(ph), 0.4 * S(t * 3), 0];
    p.bodyY = 0.04 * a * C(ph * 2) - 0.03 * a;
    return p;
  };
  A.dogGrowl = function (t) {
    var p = A.dogRun(0, 0, t);
    p.neck = [0.35, 0, 0]; p.head = [0.4, 0.15 * S(t), 0]; p.jaw = [0.25 + 0.2 * Math.abs(S(t * 9)), 0, 0];
    p.hipFL = [-0.25, 0, 0]; p.hipFR = [-0.25, 0, 0]; p.knFL = [0, 0, 0]; p.knFR = [0, 0, 0];
    p.hipBL = [0.4, 0, 0]; p.hipBR = [0.4, 0, 0]; p.knBL = [0.7, 0, 0]; p.knBR = [0.7, 0, 0];
    p.bodyY = -0.1; p.torso = [-0.15, 0, 0]; p.tail = [-0.4, 0, 0];
    return p;
  };
  A.dogLeap = function (k) {
    return { hipFL: [-1.1, 0, 0], hipFR: [-1.0, 0, 0], hipBL: [1.0, 0, 0], hipBR: [1.1, 0, 0], knFL: [-0.2, 0, 0], knFR: [-0.2, 0, 0], knBL: [0.1, 0, 0], knBR: [0.1, 0, 0], neck: [-0.2, 0, 0], head: [0.1, 0, 0], jaw: [0.9, 0, 0], torso: [-0.25 + 0.5 * k, 0, 0], tail: [0.8, 0, 0], bodyY: 0 };
  };
  A.dogDead = function () { return { hipFL: [-0.6, 0, 0.3], hipFR: [-0.4, 0, -0.2], hipBL: [0.6, 0, 0.3], hipBR: [0.5, 0, -0.1], neck: [0.4, 0.3, 0], jaw: [0.6, 0, 0], tail: [0.1, 0.5, 0], bodyY: -0.42 }; };
  return A;
})();
