// Cockpits: steering wheels by era, gauges with moving needles, digital dashes and shift LEDs, gear levers,
// handbrakes, pedals, bucket seats and harnesses, door cards, switch panels, interior mirror, windscreen
// glass with rain and wipers, gloves and two-bone arm IK with shifting animation.
var RX = window.RX || (window.RX = {});

(function () {
  var V3 = THREE.Vector3;
  var cache = {};
  function once(k, f) { return cache[k] || (cache[k] = f()); }
  function mat(c, r, m, extra) { var o = { color: c, roughness: r == null ? 0.6 : r, metalness: m || 0 }; for (var k in extra || {}) o[k] = extra[k]; return new THREE.MeshStandardMaterial(o); }
  function add(parent, geo, material, x, y, z) { var m = new THREE.Mesh(geo, material); m.position.set(x || 0, y || 0, z || 0); parent.add(m); return m; }

  // ---------------- gloves ----------------
  RX.buildGlove = function (material, side) {
    var g = new THREE.Group();
    var palm = add(g, new THREE.BoxGeometry(0.075, 0.09, 0.03), material, 0, 0, 0);
    var cuff = add(g, new THREE.CylinderGeometry(0.042, 0.045, 0.05, 10), material, 0, -0.07, 0);
    for (var f = 0; f < 4; f++) {
      var fg = new THREE.Group(); fg.position.set(-0.027 + f * 0.018, 0.045, 0.004); g.add(fg);
      var p1 = add(fg, new THREE.CylinderGeometry(0.009, 0.009, 0.035, 6), material, 0, 0.017, 0);
      var k = new THREE.Group(); k.position.y = 0.034; k.rotation.x = 1.1; fg.add(k);
      add(k, new THREE.CylinderGeometry(0.0085, 0.008, 0.03, 6), material, 0, 0.015, 0);
      fg.rotation.x = 0.7;
    }
    var th = new THREE.Group(); th.position.set(side * 0.04, 0.0, 0.01); th.rotation.z = -side * 0.9; th.rotation.x = 0.6; g.add(th);
    add(th, new THREE.CylinderGeometry(0.01, 0.009, 0.045, 6), material, 0, 0.022, 0);
    // knuckle panel detail
    add(g, new THREE.BoxGeometry(0.065, 0.025, 0.006), RX.mats().carbon, 0, 0.02, -0.017);
    RX.mergeStatic(g);
    return g;
  };

  // ---------------- two-bone IK ----------------
  var tA = new V3(), tB = new V3(), tC = new V3(), tD = new V3(), UP = new V3(0, 1, 0);
  function placeLimb(mesh, a, b) {
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    tD.copy(b).sub(a); var len = tD.length();
    mesh.scale.set(1, Math.max(0.01, len), 1);
    mesh.quaternion.setFromUnitVectors(UP, tD.normalize());
  }
  RX.solveArm = function (arm, hand) {
    var S = arm.shoulder, l1 = 0.29, l2 = 0.29;
    tA.copy(hand).sub(S); var d = tA.length();
    var maxD = (l1 + l2) * 0.995;
    if (d > maxD) { tA.multiplyScalar(maxD / d); hand = tB.copy(S).add(tA); d = maxD; }
    var dir = tA.clone().normalize();
    // elbow points outward and down
    var pole = new V3(arm.s * 1.0, -0.8, -0.2).normalize();
    pole.addScaledVector(dir, -pole.dot(dir)).normalize();
    var a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    var elbow = tC.copy(S).addScaledVector(dir, a).addScaledVector(pole, h);
    placeLimb(arm.up, S, elbow); placeLimb(arm.lo, elbow, hand);
    arm.hand.position.copy(hand);
    tD.copy(hand).sub(elbow).normalize();
    arm.hand.quaternion.setFromUnitVectors(UP, tD);
    arm.hand.rotateY(arm.s * 0.6);
  };
  // hands: [right, left] in driver-local space (right hand is on the -x side)
  RX.poseArms = function (driver, hands) {
    var arms = driver.userData.arms;
    arms.forEach(function (a) { RX.solveArm(a, a.s < 0 ? hands[0] : hands[1]); });
  };

  // ---------------- textures ----------------
  function dialTex(kind, max, red, light) {
    return once('dial' + kind + max + red + light, function () {
      var c = RX.canvas(256, 256), g = c.getContext('2d');
      var bg = light ? '#ece6d6' : '#0b0c0e', fg = light ? '#1a1a1a' : '#f2f2f2';
      g.fillStyle = bg; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
      var a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
      if (red) { g.strokeStyle = '#d42020'; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 104, a0 + (a1 - a0) * red, a1); g.stroke(); }
      var steps = kind === 'rpm' ? Math.round(max) : 10;
      g.strokeStyle = fg; g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (var i = 0; i <= steps * 2; i++) {
        var a = a0 + (a1 - a0) * i / (steps * 2), big = i % 2 === 0;
        g.lineWidth = big ? 4 : 2; g.beginPath();
        g.moveTo(128 + Math.cos(a) * (big ? 92 : 100), 128 + Math.sin(a) * (big ? 92 : 100)); g.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); g.stroke();
        if (big) { g.font = 'bold 22px Arial'; g.fillText(kind === 'rpm' ? String(i / 2) : String(Math.round(max * i / (steps * 2))), 128 + Math.cos(a) * 72, 128 + Math.sin(a) * 72); }
      }
      g.font = 'bold 14px Arial'; g.fillText(kind === 'rpm' ? 'x1000 RPM' : kind === 'speed' ? 'KM/H' : kind === 'temp' ? 'WATER °C' : 'OIL', 128, 175);
      if (kind === 'rpm') { g.font = 'italic bold 13px Arial'; g.fillText('APEX', 128, 92); }
      return new THREE.CanvasTexture(c);
    });
  }
  function rainTex() {
    return once('rain', function () {
      var c = RX.canvas(256, 256), g = c.getContext('2d');
      g.clearRect(0, 0, 256, 256);
      for (var i = 0; i < 220; i++) {
        var x = Math.random() * 256, y = Math.random() * 256, r = 1 + Math.random() * 3.5;
        var gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.6, 'rgba(180,200,220,0.35)'); gr.addColorStop(1, 'rgba(60,70,80,0.0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * (1 + Math.random() * 0.6), 0, 0, 7); g.fill();
      }
      var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    });
  }
  function suedeTex() {
    return once('suede', function () { var c = RX.canvas(64, 64), g = c.getContext('2d'); g.fillStyle = '#1c1c1e'; g.fillRect(0, 0, 64, 64); for (var i = 0; i < 900; i++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.06 + ')'; g.fillRect(Math.random() * 64, Math.random() * 64, 1, 1); } var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; });
  }

  // ---------------- steering wheels ----------------
  RX.wheelStyleFor = function (car, cus) {
    if (cus.wheelStyle && cus.wheelStyle !== 'auto') return cus.wheelStyle;
    var y = car.year, b = car.body, sp = car.sport;
    if (b === 'kart') return 'kart';
    if (b === 'lorry') return 'truck';
    if (b === 'dragster' || b === 'streamliner') return 'yoke';
    if (y < 1965 || b === 'prewar') return 'wood';
    if (b === 'openwheel') return y >= 1990 ? 'formula' : 'race';
    if (y >= 1998 && (sp === 'gt' || sp === 'endurance' || sp === 'touring' || sp === 'hill')) return 'gt';
    if (y < 1980 && sp !== 'rally' && sp !== 'rx') return 'classic';
    return 'race';
  };

  RX.buildSteeringWheel = function (kind, cus, lite) {
    cus = cus || {};
    var M = RX.mats(), g = new THREE.Group();
    var suede = new THREE.MeshStandardMaterial({ map: suedeTex(), roughness: 0.95 });
    var alu = M.alu, carbon = M.carbon, R;
    var mark = function (y, w) { var m = new THREE.Mesh(new THREE.BoxGeometry(w || 0.022, 0.03, 0.034), new THREE.MeshStandardMaterial({ color: cus.wheelMark || '#ffcc00', roughness: 0.5 })); m.position.y = y; g.add(m); };
    g.userData.paddles = []; g.userData.leds = [];
    if (kind === 'formula') {
      var body = add(g, new THREE.BoxGeometry(0.26, 0.13, 0.045), carbon);
      [-1, 1].forEach(function (s) {
        var grip = add(g, new THREE.CylinderGeometry(0.03, 0.028, 0.15, 12), suede, s * 0.145, -0.005, 0);
        grip.rotation.z = s * 0.12;
        var cap = add(g, new THREE.SphereGeometry(0.03, 10, 8), suede, s * 0.15, 0.075, 0);
        // paddles behind the wheel
        var pp = new THREE.Group(); pp.position.set(s * 0.09, 0.0, 0.035); pp.userData.dyn = true; g.add(pp);
        add(pp, new THREE.BoxGeometry(0.07, 0.1, 0.006), carbon, s * 0.02, 0, 0.01);
        g.userData.paddles.push(pp);
      });
      var scr = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.055), new THREE.MeshBasicMaterial({ color: 0x113322 }));
      scr.position.set(0, 0.008, -0.0235); scr.rotation.y = Math.PI; scr.userData.dyn = true; g.add(scr); g.userData.screen = scr;
      // shift LEDs across the top
      for (var l = 0; l < (lite ? 0 : 15); l++) {
        var col = l < 5 ? 0x19e04a : l < 10 ? 0xff2a2a : 0x3a6bff;
        var lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(0.12) }); lm.userData.on = new THREE.Color(col); lm.userData.off = new THREE.Color(col).multiplyScalar(0.12);
        var led = new THREE.Mesh(new THREE.CircleGeometry(0.0045, 8), lm); led.position.set(-0.07 + l * 0.01, 0.052, -0.0235); led.rotation.y = Math.PI; led.userData.dyn = true; g.add(led);
        g.userData.leds.push(lm);
      }
      // rotary knobs and buttons
      var knobM = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3, metalness: 0.8 });
      [[-0.09, -0.04], [0.09, -0.04], [-0.06, -0.045], [0.06, -0.045]].forEach(function (p, i) { var k = add(g, new THREE.CylinderGeometry(0.011, 0.011, 0.012, 12), i < 2 ? knobM : M.red, p[0], p[1], -0.026); k.rotation.x = Math.PI / 2; });
      for (var b = 0; b < 6; b++) { var bt = add(g, new THREE.CylinderGeometry(0.0075, 0.0075, 0.008, 10), [M.red, alu, new THREE.MeshStandardMaterial({ color: 0x2e7dff })][b % 3], -0.1 + (b % 3) * 0.012 + (b > 2 ? 0.176 : 0), 0.035 - Math.floor(b / 3) * 0, -0.026); bt.rotation.x = Math.PI / 2; }
      R = 0.15; g.userData.flat = true;
    } else if (kind === 'gt') {
      // flat-bottomed GT wheel with a small display, buttons and paddles
      var shape = new THREE.Shape();
      shape.moveTo(-0.17, -0.09); shape.lineTo(0.17, -0.09); shape.quadraticCurveTo(0.2, 0.05, 0.12, 0.14); shape.lineTo(-0.12, 0.14); shape.quadraticCurveTo(-0.2, 0.05, -0.17, -0.09);
      var hole = new THREE.Path(); hole.moveTo(-0.13, -0.06); hole.lineTo(0.13, -0.06); hole.quadraticCurveTo(0.16, 0.04, 0.1, 0.11); hole.lineTo(-0.1, 0.11); hole.quadraticCurveTo(-0.16, 0.04, -0.13, -0.06);
      shape.holes.push(hole);
      var rimG = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }); rimG.translate(0, 0, -0.015);
      add(g, rimG, suede);
      var hub = add(g, new THREE.BoxGeometry(0.16, 0.1, 0.04), carbon, 0, 0.0, 0.005);
      var spoke = add(g, new THREE.BoxGeometry(0.3, 0.03, 0.02), carbon, 0, 0.0, 0.0);
      var scr2 = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.04), new THREE.MeshBasicMaterial({ color: 0x113322 })); scr2.position.set(0, 0.02, -0.0155); scr2.rotation.y = Math.PI; scr2.userData.dyn = true; g.add(scr2); g.userData.screen = scr2;
      for (var b2 = 0; b2 < 8; b2++) { var bb = add(g, new THREE.CylinderGeometry(0.007, 0.007, 0.008, 10), b2 % 4 === 0 ? M.red : (b2 % 4 === 1 ? new THREE.MeshStandardMaterial({ color: 0xffcc00 }) : alu), (b2 < 4 ? -1 : 1) * (0.05 + (b2 % 2) * 0.016), -0.025 - Math.floor((b2 % 4) / 2) * 0.016, -0.0165); bb.rotation.x = Math.PI / 2; }
      [-1, 1].forEach(function (s) { var pp = new THREE.Group(); pp.position.set(s * 0.1, 0.02, 0.03); pp.userData.dyn = true; g.add(pp); add(pp, new THREE.BoxGeometry(0.06, 0.11, 0.006), alu, s * 0.025, 0, 0.01); g.userData.paddles.push(pp); });
      mark(0.14, 0.02);
      R = 0.16;
    } else if (kind === 'wood' || kind === 'classic') {
      var woody = kind === 'wood';
      R = woody ? 0.2 : 0.18;
      var rimM = woody ? M.wood : new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.7 });
      var rim = add(g, new THREE.TorusGeometry(R, 0.0135, 10, 40), rimM);
      // grip finger ridges on the inside of the rim
      if (woody) for (var r2 = 0; r2 < 36; r2++) { var a = r2 / 36 * Math.PI * 2, rr = add(g, new THREE.SphereGeometry(0.008, 5, 4), M.wood, Math.cos(a) * (R - 0.012), Math.sin(a) * (R - 0.012), 0); }
      var nsp = woody ? 4 : 3, angs = woody ? [0.35, Math.PI - 0.35, Math.PI + 0.9, -0.9] : [0, Math.PI, -Math.PI / 2];
      angs.slice(0, nsp).forEach(function (a) {
        var sp = new THREE.Group(); sp.rotation.z = a; g.add(sp);
        var bar = add(sp, new THREE.BoxGeometry(R - 0.04, 0.022, 0.006), alu, (R - 0.04) / 2 + 0.03, 0, 0.012);
        for (var h = 0; h < 3; h++) add(sp, new THREE.CylinderGeometry(0.004, 0.004, 0.008, 8), M.black, 0.06 + h * 0.035, 0, 0.012).rotation.x = Math.PI / 2;
      });
      add(g, new THREE.CylinderGeometry(0.04, 0.045, 0.04, 16), M.black, 0, 0, 0.02).rotation.x = Math.PI / 2;
      var badge = add(g, new THREE.CircleGeometry(0.028, 16), new THREE.MeshStandardMaterial({ color: cus.paint1 || '#c8102e', metalness: 0.6, roughness: 0.3 }), 0, 0, -0.001); badge.rotation.y = Math.PI;
    } else if (kind === 'kart') {
      R = 0.15;
      var shapeK = new THREE.Shape(); shapeK.absarc(0, 0, R + 0.015, 0, Math.PI * 2, false);
      var holeK = new THREE.Path(); holeK.absarc(0, 0, R - 0.015, 0, Math.PI * 2, true); shapeK.holes.push(holeK);
      var rk = new THREE.ExtrudeGeometry(shapeK, { depth: 0.02, bevelEnabled: false, curveSegments: 32 }); rk.translate(0, 0, -0.01);
      add(g, rk, new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 }));
      [Math.PI / 2 + 0.6, Math.PI / 2 - 0.6, -Math.PI / 2].forEach(function (a) { var sp = new THREE.Group(); sp.rotation.z = a; g.add(sp); add(sp, new THREE.BoxGeometry(R, 0.03, 0.008), M.alu, R / 2, 0, 0.012); });
      add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), M.alu, 0, 0, 0.015).rotation.x = Math.PI / 2;
    } else if (kind === 'yoke') {
      R = 0.12;
      add(g, new THREE.BoxGeometry(0.2, 0.05, 0.03), M.black);
      [-1, 1].forEach(function (s) { add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.09, 10), M.rubber, s * 0.11, 0.02, 0).rotation.z = s * 0.2; });
      add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), M.red, 0.05, 0.0, -0.02).rotation.x = Math.PI / 2;
    } else if (kind === 'truck') {
      R = 0.25;
      add(g, new THREE.TorusGeometry(R, 0.018, 10, 40), new THREE.MeshStandardMaterial({ map: suedeTex(), roughness: 0.9 }));
      [0, Math.PI, -Math.PI / 2].forEach(function (a) { var sp = new THREE.Group(); sp.rotation.z = a; g.add(sp); add(sp, new THREE.BoxGeometry(R, 0.04, 0.01), M.plastic, R / 2, 0, 0.015); });
      add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16), M.plastic, 0, 0, 0.02).rotation.x = Math.PI / 2;
    } else { // 'race': dished suede three-spoke
      R = 0.175;
      add(g, new THREE.TorusGeometry(R, 0.017, 10, 40), suede);
      [0, Math.PI, -Math.PI / 2].forEach(function (a) {
        var sp = new THREE.Group(); sp.rotation.z = a; g.add(sp);
        var bar = add(sp, new THREE.BoxGeometry(R - 0.03, 0.03, 0.005), M.black, (R - 0.03) / 2 + 0.03, 0, 0.03);
        bar.rotation.y = -0.25;
        for (var h = 0; h < 3; h++) add(sp, new THREE.CylinderGeometry(0.006, 0.006, 0.008, 8), M.steel, 0.06 + h * 0.03, 0, 0.031).rotation.x = Math.PI / 2;
      });
      var horn = add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), M.red, 0, 0, 0.055); horn.rotation.x = Math.PI / 2;
      add(g, new THREE.CylinderGeometry(0.045, 0.05, 0.06, 16), M.black, 0, 0, 0.075).rotation.x = Math.PI / 2;
      mark(R);
    }
    g.userData.R = R;
    RX.mergeStatic(g); // everything except LEDs, screens and paddles becomes one mesh per material
    return g;
  };

  // ---------------- gauges ----------------
  function gauge(parent, kind, max, red, r, x, y, z, light, tiltX) {
    var M = RX.mats();
    var grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.set(tiltX || 0, Math.PI, 0); parent.add(grp);
    var face = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ map: dialTex(kind, max, red, light), color: 0xdddddd }));
    grp.add(face);
    var bezel = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.08, 6, 32), M.chrome); grp.add(bezel);
    var pivot = new THREE.Group(); pivot.position.z = 0.004; grp.add(pivot);
    var needle = new THREE.Mesh(new THREE.BoxGeometry(r * 0.05, r * 0.85, 0.002), new THREE.MeshBasicMaterial({ color: 0xff3a1a }));
    needle.position.y = r * 0.35; pivot.add(needle);
    add(pivot, new THREE.CylinderGeometry(r * 0.09, r * 0.09, 0.006, 12), M.black, 0, 0, 0.002).rotation.x = Math.PI / 2;
    var glass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, clearcoat: 1 })); glass.position.z = 0.008; grp.add(glass);
    pivot.userData.dyn = true;
    return { pivot: pivot, kind: kind, max: max };
  }

  // ---------------- main builder ----------------
  // ctx: { kind: 'closed'|'formula'|'open'|'kart'|'prewar'|'dragster'|'lorry', seatX, seatY, seatZ, eyeY, dashZ, hw, floorY, roofY, beltY, rig, car, cus, mirrorTop }
  RX.buildCockpit = function (rig, car, cus, c) {
    var M = RX.mats(), body = rig.body, kind = c.kind, y = car.year;
    var interior = new THREE.MeshStandardMaterial({ color: cus.interiorColor || '#1f2024', roughness: 0.85 });
    var race = car.year > 1965 && kind !== 'prewar';
    rig.cockpit = { gauges: [], leds: [], paddles: [], pedals: [], shiftT: 0, lastGear: 1, hb: 0, wiperA: 0, wipe: 0, rainAcc: 0 };
    var cp = rig.cockpit;
    // ---- steering wheel ----
    var style = RX.wheelStyleFor(car, cus);
    var sw = RX.buildSteeringWheel(style, cus, rig.lite);
    var swPivot = new THREE.Group();
    swPivot.position.set(c.seatX, c.wheelY, c.wheelZ); swPivot.rotation.x = c.wheelTilt;
    swPivot.add(sw); body.add(swPivot); sw.userData.dyn = true;
    rig.steer = sw; rig.handsRadius = sw.userData.R; rig.formulaScreen = sw.userData.screen || null;
    cp.paddles = sw.userData.paddles; cp.leds = sw.userData.leds.slice();
    // column / quick-release hub
    var col = RX.cyl(0.024, 0.03, c.colLen || 0.35, M.black, 10, body);
    col.position.set(c.seatX, c.wheelY - Math.sin(c.wheelTilt + Math.PI / 2) * 0, c.wheelZ + (c.colLen || 0.35) / 2); col.rotation.x = Math.PI / 2 + c.wheelTilt;
    var qr = RX.cyl(0.03, 0.03, 0.05, M.alu, 12, swPivot); qr.rotation.x = Math.PI / 2; qr.position.z = 0.06;
    // ---- dashboard ----
    var analog = cus.dashStyle === 'analog' || (cus.dashStyle !== 'digital' && y < 1996);
    var lite = rig.lite; // opponents: skip animated cockpit internals nobody can see
    if (lite) { rig.dashPos = null; }
    if (kind === 'closed') {
      var w = c.hw * 1.92;
      var sh = new THREE.Shape();
      sh.moveTo(0, -0.28); sh.lineTo(0, 0.0); sh.quadraticCurveTo(0.04, 0.06, 0.14, 0.065); sh.lineTo(0.3, 0.02); sh.lineTo(0.32, -0.28); sh.lineTo(0, -0.28);
      var dg = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false, curveSegments: 8 });
      dg.translate(0, 0, -w / 2); dg.rotateY(-Math.PI / 2);
      var dashMat = race && cus.interiorTrim !== 'road' ? M.carbon : interior;
      var dash = add(body, dg, dashMat, 0, c.eyeY - 0.26, c.dashZ - 0.04);
      // instrument binnacle hood
      var hood = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.26, 16, 1, true, -Math.PI / 2, Math.PI), interior);
      hood.rotation.z = Math.PI / 2; hood.rotation.y = Math.PI / 2; hood.scale.set(1, 1, 0.5); hood.position.set(c.seatX, c.eyeY - 0.16, c.dashZ + 0.06); hood.material = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9, side: THREE.DoubleSide }); body.add(hood);
      var panel = new THREE.Group(); panel.position.set(c.seatX, c.eyeY - 0.17, c.dashZ - 0.01); body.add(panel);
      if (lite) { } else if (analog) {
        var light = y < 1975;
        var redFrac = 0.82;
        cp.gauges.push(gauge(panel, 'rpm', Math.ceil(c.red / 1000), redFrac, 0.062, 0.065, 0, 0, light, -0.2));
        cp.gauges.push(gauge(panel, 'speed', Math.ceil(car.top / 20) * 20, 0, 0.055, -0.07, -0.005, 0, light, -0.2));
        cp.gauges.push(gauge(panel, 'temp', 120, 0.85, 0.024, 0.0, 0.045, 0.004, light, -0.2));
        cp.gauges.push(gauge(panel, 'oil', 8, 0, 0.024, 0.0, -0.025, 0.004, light, -0.2));
        // warning lamps
        ['#ff2a2a', '#ffb000', '#1ee05a'].forEach(function (col2, i) { var lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(col2).multiplyScalar(0.15) }); lm.userData.on = new THREE.Color(col2); lm.userData.off = new THREE.Color(col2).multiplyScalar(0.15); var l = new THREE.Mesh(new THREE.CircleGeometry(0.006, 8), lm); l.position.set(-0.015 + i * 0.015, 0.072, -0.004); l.rotation.y = Math.PI; panel.add(l); cp.leds.push(lm); });
      } else if (!lite) {
        rig.dashPos = new V3(c.seatX, c.eyeY - 0.16, c.dashZ - 0.02);
        // LED shift bar above the display
        for (var l2 = 0; l2 < 10; l2++) {
          var colr = l2 < 4 ? 0x19e04a : l2 < 8 ? 0xffb000 : 0xff2a2a;
          var lm2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(colr).multiplyScalar(0.12) }); lm2.userData.on = new THREE.Color(colr); lm2.userData.off = new THREE.Color(colr).multiplyScalar(0.12);
          var led = new THREE.Mesh(new THREE.CircleGeometry(0.006, 8), lm2); led.position.set(c.seatX - 0.075 + l2 * 0.0167, c.eyeY - 0.095, c.dashZ - 0.03); led.rotation.y = Math.PI; body.add(led);
          cp.leds.push(lm2);
        }
      }
      // centre console & switch panel
      var cx = c.seatX * 0.1;
      var cons = add(body, new THREE.BoxGeometry(0.22, 0.32, 0.5), race ? M.carbon : interior, c.seatX - Math.sign(c.seatX || 1) * 0.36, c.floorY + 0.16, c.dashZ - 0.25);
      var sp = new THREE.Group(); sp.position.set(c.seatX - Math.sign(c.seatX || 1) * 0.36, c.eyeY - 0.32, c.dashZ - 0.08); sp.rotation.x = -0.6; body.add(sp);
      add(sp, new THREE.BoxGeometry(0.22, 0.14, 0.02), M.alu);
      for (var t = 0; t < 8; t++) {
        var tg = add(sp, new THREE.CylinderGeometry(0.004, 0.004, 0.025, 6), M.chrome, -0.08 + (t % 4) * 0.053, t < 4 ? 0.035 : -0.02, -0.02); tg.rotation.x = Math.PI / 2 + 0.4;
        var lm3 = add(sp, new THREE.CircleGeometry(0.005, 8), new THREE.MeshBasicMaterial({ color: [0x1ee05a, 0xff2a2a, 0xffb000, 0x2e7dff][t % 4] }), -0.08 + (t % 4) * 0.053, t < 4 ? 0.06 : 0.005, -0.011); lm3.rotation.y = Math.PI;
      }
      var kill = add(sp, new THREE.CylinderGeometry(0.014, 0.014, 0.012, 12), M.red, 0, -0.055, -0.016); kill.rotation.x = Math.PI / 2;
      // door cards, armrest
      [-1, 1].forEach(function (s) {
        var dc = add(body, new THREE.BoxGeometry(0.03, 0.42, 1.1), race && cus.interiorTrim !== 'road' ? M.carbon : interior, s * (c.hw - 0.07), c.beltY - 0.22, c.seatZ + 0.15);
        add(body, new THREE.BoxGeometry(0.07, 0.04, 0.4), interior, s * (c.hw - 0.11), c.beltY - 0.15, c.seatZ + 0.2);
        add(body, new THREE.BoxGeometry(0.02, 0.03, 0.09), M.chrome, s * (c.hw - 0.09), c.beltY - 0.07, c.seatZ + 0.45);
      });
      // fire extinguisher on the passenger side floor
      var ext = RX.cyl(0.055, 0.055, 0.42, M.red, 14, body); ext.rotation.x = Math.PI / 2; ext.position.set(-c.seatX * 0.9, c.floorY + 0.12, c.seatZ + 0.15);
      add(body, new THREE.BoxGeometry(0.06, 0.06, 0.08), M.black, -c.seatX * 0.9, c.floorY + 0.12, c.seatZ + 0.4);
      // interior rear-view mirror with live image
      var mm = new THREE.MeshBasicMaterial({ color: 0x8090a0 });
      var mg = new THREE.Group(); mg.position.set(0, c.roofY - 0.1, c.mirrorZ); body.add(mg);
      add(mg, new THREE.BoxGeometry(0.26, 0.075, 0.025), M.plastic);
      var mq = new THREE.Mesh(new THREE.PlaneGeometry(0.245, 0.062), mm); mq.position.z = -0.0135; mq.rotation.y = Math.PI; mg.add(mq);
      RX.rod(new V3(0, 0.03, 0.005), new V3(0, 0.1, 0.03), 0.008, M.plastic, mg);
      mg.rotation.x = 0.08;
      cp.mirrorMat = mm;
      // sun visors / headliner trim
      [-1, 1].forEach(function (s) { add(body, new THREE.BoxGeometry(0.34, 0.012, 0.16), interior, s * c.hw * 0.42, c.roofY - 0.04, c.mirrorZ - 0.05); });
    } else if (lite) {
    } else if (kind === 'prewar' || kind === 'open') {
      // scuttle-mounted gauges
      var pn = new THREE.Group(); pn.position.set(c.seatX, c.eyeY - 0.2, c.dashZ); body.add(pn);
      add(pn, new THREE.BoxGeometry(0.44, 0.14, 0.03), kind === 'prewar' ? M.wood : M.alu, 0, 0, 0.015);
      cp.gauges.push(gauge(pn, 'rpm', Math.ceil(c.red / 1000), 0.85, 0.05, 0.07, 0.0, 0, kind === 'prewar' || y < 1965, -0.1));
      cp.gauges.push(gauge(pn, 'oil', 8, 0, 0.028, -0.06, 0.02, 0, kind === 'prewar' || y < 1965, -0.1));
      cp.gauges.push(gauge(pn, 'temp', 120, 0.85, 0.028, -0.13, 0.02, 0, kind === 'prewar' || y < 1965, -0.1));
    } else if (kind === 'formula') {
      // cockpit rim padding and headrest wings
      [-1, 1].forEach(function (s) { add(body, new THREE.BoxGeometry(0.06, 0.12, 0.35), interior, s * 0.25, c.eyeY - 0.18, c.seatZ - 0.05); });
    }
    // ---- gear lever / paddles ----
    var gType = lite ? 'none' : c.gearType;
    if (gType === 'H' || gType === 'seq') {
      var base = new THREE.Group(); base.position.set(c.leverX, c.leverY, c.leverZ); body.add(base);
      add(base, new THREE.BoxGeometry(0.12, 0.03, 0.16), M.black);
      var boot = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 1 })); boot.position.y = 0.04; base.add(boot);
      var lever = new THREE.Group(); lever.userData.dyn = true; base.add(lever);
      var stickLen = gType === 'seq' ? 0.3 : 0.24;
      add(lever, new THREE.CylinderGeometry(0.009, 0.011, stickLen, 8), M.chrome, 0, stickLen / 2, 0);
      var knob = gType === 'seq' ? add(lever, new THREE.CylinderGeometry(0.022, 0.018, 0.09, 12), M.black, 0, stickLen + 0.03, 0) : add(lever, new THREE.SphereGeometry(0.028, 14, 10), cus.knobColor ? new THREE.MeshStandardMaterial({ color: cus.knobColor, roughness: 0.3 }) : M.wood, 0, stickLen + 0.01, 0);
      if (gType === 'H') { var ptn = add(lever, new THREE.CircleGeometry(0.017, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, stickLen + 0.04, 0); ptn.rotation.x = -Math.PI / 2; }
      cp.lever = lever; cp.knob = knob; cp.gType = gType;
    } else if (gType === 'external') {
      var eb = new THREE.Group(); eb.position.set(c.leverX, c.leverY, c.leverZ); body.add(eb);
      add(eb, new THREE.BoxGeometry(0.04, 0.05, 0.2), M.chrome);
      var lev2 = new THREE.Group(); lev2.userData.dyn = true; eb.add(lev2);
      add(lev2, new THREE.CylinderGeometry(0.01, 0.01, 0.4, 8), M.chrome, 0, 0.2, 0);
      cp.knob = add(lev2, new THREE.SphereGeometry(0.025, 12, 10), M.wood, 0, 0.41, 0);
      cp.lever = lev2; cp.gType = 'H';
    } else cp.gType = gType;
    // ---- hydraulic handbrake (rally / drift / rallycross / off-road) ----
    if (c.handbrake && !lite) {
      var hb = new THREE.Group(); hb.position.set(c.leverX + Math.sign(c.leverX - c.seatX) * -0.02, c.leverY, c.leverZ - 0.22); body.add(hb);
      add(hb, new THREE.BoxGeometry(0.06, 0.05, 0.08), M.alu);
      var hl = new THREE.Group(); hl.userData.dyn = true; hb.add(hl);
      add(hl, new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), M.alu, 0, 0.18, 0);
      cp.hbKnob = add(hl, new THREE.CylinderGeometry(0.02, 0.02, 0.08, 10), new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: 0.5 }), 0, 0.38, 0);
      hl.rotation.x = -0.35; cp.hb = hl;
    }
    // ---- pedals ----
    if (c.pedals !== false && !lite) {
      var pz = c.pedalZ, px = c.seatX;
      var pc = gType === 'paddle' || car.engine === 'E' ? 2 : 3;
      for (var i = 0; i < pc; i++) {
        var pv = new THREE.Group(); pv.position.set(px + (pc === 3 ? 0.11 - i * 0.11 : 0.06 - i * 0.12), c.floorY + 0.28, pz); pv.userData.dyn = true; body.add(pv);
        add(pv, new THREE.BoxGeometry(0.012, 0.22, 0.012), M.alu, 0, -0.11, 0);
        add(pv, new THREE.BoxGeometry(i === pc - 2 ? 0.07 : 0.05, 0.08, 0.012), M.alu, 0, -0.2, -0.008);
        cp.pedals.push(pv);
      }
      cp.pedalOrder = pc === 3 ? ['throttle', 'brake', 'clutch'] : ['throttle', 'brake'];
    }
    // ---- bucket seat with harness ----
    if (kind === 'closed' || kind === 'formula' || kind === 'open') {
      var seatM = new THREE.MeshStandardMaterial({ color: cus.seatColor || '#202226', roughness: 0.85 });
      var sg = new THREE.Group(); sg.position.set(c.seatX, c.seatY, c.seatZ); body.add(sg);
      var recl = kind === 'formula' ? 0.9 : 0.25;
      var back = new THREE.Group(); back.position.set(0, 0.05, -0.22); back.rotation.x = -recl; sg.add(back);
      add(back, new THREE.BoxGeometry(0.46, 0.66, 0.06), seatM, 0, 0.33, 0);
      [-1, 1].forEach(function (s) { var bol = add(back, new THREE.BoxGeometry(0.06, 0.6, 0.16), seatM, s * 0.24, 0.3, 0.06); bol.rotation.y = s * 0.3; });
      if (kind !== 'formula') { [-1, 1].forEach(function (s) { var wg = add(back, new THREE.BoxGeometry(0.05, 0.18, 0.18), seatM, s * 0.16, 0.7, 0.08); wg.rotation.y = s * 0.4; }); add(back, new THREE.BoxGeometry(0.28, 0.2, 0.06), seatM, 0, 0.72, 0); }
      add(sg, new THREE.BoxGeometry(0.46, 0.07, 0.5), seatM, 0, 0.0, 0.02);
      [-1, 1].forEach(function (s) { add(sg, new THREE.BoxGeometry(0.06, 0.12, 0.45), seatM, s * 0.24, 0.05, 0.02); });
    }
    if (rig.driver) {
      // harness straps on the driver (move with the body)
      var hm = new THREE.MeshStandardMaterial({ color: cus.harnessColor || '#c81e1e', roughness: 0.8 });
      var dr = rig.driver;
      var recl2 = dr.userData.recline || 0.25;
      [-1, 1].forEach(function (s) {
        var st2 = RX.rod(new V3(s * 0.1, 0.62, -0.13 - recl2 * 0.25), new V3(s * 0.09, 0.15, 0.12), 0.024, hm, dr); st2.scale.x = 2.2; st2.scale.z = 0.4;
        var lap = RX.rod(new V3(s * 0.2, 0.05, 0.0), new V3(0, 0.1, 0.16), 0.022, hm, dr); lap.scale.x = 2.2; lap.scale.z = 0.4;
      });
      add(dr, new THREE.CylinderGeometry(0.04, 0.04, 0.015, 12), M.alu, 0, 0.12, 0.17).rotation.x = Math.PI / 2;
    }
    // ---- windscreen glass with rain, and wipers (closed cars) ----
    if (kind === 'closed' && rig.livery && rig.livery.maskCanvas && rig.bodyGeo && !lite) {
      var inv = RX.canvas(256, 128), ig = inv.getContext('2d');
      ig.drawImage(rig.livery.maskCanvas, 0, 0); ig.globalCompositeOperation = 'difference'; ig.fillStyle = '#fff'; ig.fillRect(0, 0, 256, 128);
      var invTex = new THREE.CanvasTexture(inv);
      var rt = rainTex().clone(); rt.needsUpdate = true; rt.repeat.set(14, 6);
      var gm = new THREE.MeshPhysicalMaterial({ color: 0xc8d4e0, map: rt, alphaMap: invTex, transparent: true, opacity: 0.0, roughness: 0.05, metalness: 0, clearcoat: 1, side: THREE.BackSide, depthWrite: false });
      var gl = new THREE.Mesh(rig.bodyGeo, gm); gl.userData.dyn = true; gl.renderOrder = 2; body.add(gl);
      cp.glass = gm; cp.rainTex = rt;
      rig.interior.push(gl);
    }
    if (c.wipers) {
      cp.wipers = [];
      [0.22, -0.18].forEach(function (x0, i) {
        var wp = new THREE.Group(); wp.position.set(x0 * c.hw * 2, c.wiperY, c.wiperZ); wp.rotation.x = c.wiperSlope; body.add(wp);
        var arm = new THREE.Group(); arm.userData.dyn = true; wp.add(arm);
        add(arm, new THREE.BoxGeometry(0.012, c.hw * 0.75, 0.01), M.black, 0, c.hw * 0.37, 0.01);
        add(arm, new THREE.BoxGeometry(0.02, c.hw * 0.72, 0.016), M.rubber, 0.012, c.hw * 0.4, 0.012);
        arm.rotation.z = 1.35; cp.wipers.push(arm);
      });
    }
  };

  // ---------------- per-frame cockpit animation ----------------
  var tmpV = new V3(), tmpV2 = new V3();
  RX.animateCockpit = function (rig, st, dt, hands) {
    var cp = rig.cockpit; if (!cp) return hands;
    // gauges
    cp.gauges.forEach(function (g) {
      var f = g.kind === 'rpm' ? (st.rpm || 0) / 1000 / g.max : g.kind === 'speed' ? Math.abs(st.kmh || 0) / g.max : g.kind === 'temp' ? 0.55 + (st.rpm01 || 0) * 0.1 : 0.4 + (st.rpm01 || 0) * 0.45;
      f = Math.max(0, Math.min(1.02, f));
      g.pivot.rotation.z = -(Math.PI * 0.75 + Math.PI * 1.5 * f) + Math.PI / 2 + Math.PI;
      if (g.kind === 'rpm' && st.rpm01 > 0.98) g.pivot.rotation.z += (Math.random() - 0.5) * 0.04;
    });
    // shift LEDs
    var n = cp.leds.length, lit = Math.round(((st.rpm01 || 0) - 0.55) / 0.42 * n);
    var flash = (st.rpm01 || 0) > 0.97 && Math.floor(performance.now() / 70) % 2;
    cp.leds.forEach(function (m, i) { var on = flash ? true : i < lit; m.color.copy(on ? m.userData.on : m.userData.off); });
    // gear change detection
    if (st.gear != null && st.gear !== cp.lastGear) { cp.shiftT = cp.gType === 'paddle' || !cp.gType || cp.gType === 'none' ? 0.18 : 0.42; cp.shiftUp = st.gear > cp.lastGear; cp.fromGear = cp.lastGear; cp.lastGear = st.gear; }
    if (cp.shiftT > 0) cp.shiftT = Math.max(0, cp.shiftT - dt);
    // paddles flick
    cp.paddles.forEach(function (p, i) { var active = cp.shiftT > 0 && ((i === 1) === !!cp.shiftUp); p.rotation.x = active ? -0.35 * Math.sin(cp.shiftT / 0.18 * Math.PI) : 0; });
    // lever position
    var shiftBlend = 0, handTarget = null;
    if (cp.lever) {
      var g = st.gear || 1, gx = 0, gz = 0;
      if (cp.gType === 'H') {
        if (g === -1) { gx = 0.05; gz = -0.05; } else { var col = Math.floor((g - 1) / 2); gx = (col - 1) * 0.04; gz = ((g - 1) % 2 === 0) ? 0.06 : -0.06; }
        var tgt = new V3(gx, 0, gz);
        cp.leverPos = cp.leverPos || tgt.clone();
        var k = cp.shiftT > 0 ? Math.min(1, dt * 10) : 1;
        if (cp.shiftT > 0 && cp.shiftT < 0.3) cp.leverPos.lerp(tgt, k); else if (cp.shiftT === 0) cp.leverPos.copy(tgt);
        cp.lever.rotation.set(cp.leverPos.z * 3, 0, -cp.leverPos.x * 3);
      } else {
        var pull = cp.shiftT > 0 ? Math.sin((1 - cp.shiftT / 0.42) * Math.PI) * (cp.shiftUp ? -0.35 : 0.3) : 0;
        cp.lever.rotation.x = pull;
      }
      if (cp.shiftT > 0) { shiftBlend = Math.sin((1 - cp.shiftT / 0.42) * Math.PI); shiftBlend = Math.min(1, shiftBlend * 1.6); handTarget = cp.knob; }
    }
    // handbrake
    if (cp.hb) {
      cp.hbV = (cp.hbV || 0) + ((st.handbrake ? 1 : 0) - (cp.hbV || 0)) * Math.min(1, dt * 14);
      cp.hb.rotation.x = -0.35 + cp.hbV * 0.6;
      if (cp.hbV > 0.05 && shiftBlend < cp.hbV) { shiftBlend = cp.hbV; handTarget = cp.hbKnob; }
    }
    // right hand leaves the wheel for the lever / handbrake
    if (handTarget && shiftBlend > 0 && rig.driver) {
      handTarget.getWorldPosition(tmpV); rig.driver.worldToLocal(tmpV);
      hands[0] = hands[0].clone().lerp(tmpV, shiftBlend);
    }
    // pedals
    if (cp.pedals.length) {
      var vals = { throttle: st.throttle || 0, brake: st.brake || 0, clutch: cp.shiftT > 0 && cp.gType === 'H' ? 1 : 0 };
      cp.pedals.forEach(function (p, i) { p.rotation.x = vals[cp.pedalOrder[i]] * 0.35; });
    }
    // wipers & rain on the screen
    if (cp.wipers) {
      if (st.rain) { cp.wiperA += dt * 3.2; } else if (Math.sin(cp.wiperA) > -0.98) cp.wiperA += dt * 3.2;
      var sw = (1 - Math.cos(cp.wiperA)) / 2; // 0 rest .. 1 full sweep
      cp.wipers.forEach(function (w) { w.rotation.z = 1.35 - sw * 2.3; });
      if (cp.glass) {
        cp.rainAcc = st.rain ? Math.min(1, cp.rainAcc + dt * (0.25 + Math.abs(st.kmh || 0) * 0.002)) : Math.max(0, cp.rainAcc - dt * 0.3);
        if (sw > 0.85) cp.rainAcc = Math.min(cp.rainAcc, 0.15);
        cp.glass.opacity = 0.05 + cp.rainAcc * 0.6;
        cp.rainTex.offset.y += dt * (0.02 + Math.abs(st.kmh || 0) * 0.0006);
      }
    }
    return hands;
  };
})();
