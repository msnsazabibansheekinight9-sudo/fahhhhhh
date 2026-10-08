// Exterior detailing: light clusters, grilles, ducts, handles, filler caps, tow straps, pins, aerials,
// tyre tread/sidewall textures and drilled brake discs.
var RX = window.RX || (window.RX = {});

(function () {
  var V3 = THREE.Vector3;
  var cache = {};
  function once(k, f) { return cache[k] || (cache[k] = f()); }
  function add(parent, geo, mat, x, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); parent.add(m); return m; }

  RX.honeycombTex = function () {
    return once('honey', function () {
      var c = RX.canvas(128, 128), g = c.getContext('2d');
      g.fillStyle = '#2a2b2e'; g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#050506';
      for (var y = 0; y < 9; y++) for (var x = 0; x < 9; x++) {
        var cx = x * 16 + (y % 2) * 8, cy = y * 14;
        g.beginPath(); for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2 + Math.PI / 6; g.lineTo(cx + Math.cos(a) * 6.5, cy + Math.sin(a) * 6.5); } g.closePath(); g.fill();
      }
      var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    });
  };

  // Tyre texture: sidewalls at the profile ends, tread band in the middle. u runs around the tyre.
  RX.tyreTex = function (tread, wall, wallColor) {
    return once('tyre' + tread + wall + wallColor, function () {
      var c = RX.canvas(1024, 128), g = c.getContext('2d');
      g.fillStyle = '#19191b'; g.fillRect(0, 0, 1024, 128);
      // sidewall shading
      var gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, '#222224'); gr.addColorStop(0.3, '#141415'); gr.addColorStop(0.5, '#1c1c1e'); gr.addColorStop(0.7, '#141415'); gr.addColorStop(1, '#222224');
      g.fillStyle = gr; g.fillRect(0, 0, 1024, 128);
      // tread
      g.fillStyle = '#0c0c0d';
      if (tread === 'wet' || tread === 'inter' || tread === 'treaded' || tread === 'snow') {
        for (var x = 0; x < 1024; x += 16) {
          g.beginPath(); g.moveTo(x, 40); g.lineTo(x + 10, 64); g.lineTo(x, 88); g.lineTo(x + 4, 88); g.lineTo(x + 14, 64); g.lineTo(x + 4, 40); g.fill();
        }
        g.fillRect(0, 62, 1024, 4);
        if (tread === 'snow') { g.fillStyle = '#9a9ca0'; for (var sx = 0; sx < 1024; sx += 9) g.fillRect(sx, 46 + (sx % 27), 2, 2); }
      } else if (tread === 'gravel' || tread === 'dirt' || tread === 'sand') {
        for (var bx = 0; bx < 1024; bx += 22) { g.fillRect(bx, 38, 7, 22); g.fillRect(bx + 11, 66, 7, 22); }
      } else {
        // slick: faint wear lines and marbles
        g.fillStyle = 'rgba(255,255,255,0.03)'; for (var l = 0; l < 6; l++) g.fillRect(0, 44 + l * 8, 1024, 1);
      }
      // sidewall lettering / stripes
      g.font = 'bold 14px Arial'; g.textBaseline = 'middle';
      var col = wallColor || '#f2f2f2';
      if (wall === 'letters') { g.fillStyle = col; for (var t = 0; t < 4; t++) { g.fillText('APEX RACING  SLICK', t * 256 + 20, 15); g.fillText('APEX RACING  SLICK', t * 256 + 20, 113); } }
      if (wall === 'redline') { g.fillStyle = '#c01818'; g.fillRect(0, 10, 1024, 4); g.fillRect(0, 114, 1024, 4); }
      if (wall === 'whitewall') { g.fillStyle = '#eeeeea'; g.fillRect(0, 4, 1024, 18); g.fillRect(0, 106, 1024, 18); }
      if (wall === 'stripe') { g.fillStyle = col; g.fillRect(0, 12, 1024, 3); g.fillRect(0, 113, 1024, 3); }
      // compound colour band (F1-style)
      var band = { soft: '#e3261c', medium: '#f5c400', hard: '#f2f2f2', inter: '#2fbf3a', wet: '#2a6bd8' }[tread];
      if (band) { g.fillStyle = band; g.fillRect(0, 18, 1024, 3); g.fillRect(0, 107, 1024, 3); }
      var tx = new THREE.CanvasTexture(c); tx.wrapS = THREE.RepeatWrapping; tx.anisotropy = 4; return tx;
    });
  };

  RX.discTex = function (drilled) {
    return once('disc' + drilled, function () {
      var c = RX.canvas(128, 128), g = c.getContext('2d');
      g.fillStyle = '#6a6d72'; g.fillRect(0, 0, 128, 128);
      var gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, '#3a3c40'); gr.addColorStop(0.45, '#3a3c40'); gr.addColorStop(0.5, '#8a8d92'); gr.addColorStop(1, '#5e6166');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#1a1a1c';
      for (var r = 0; r < 3; r++) for (var k = 0; k < 18; k++) {
        var a = k / 18 * Math.PI * 2 + r * 0.12, rad = 40 + r * 8;
        if (drilled) { g.beginPath(); g.arc(64 + Math.cos(a) * rad, 64 + Math.sin(a) * rad, 2, 0, 7); g.fill(); }
      }
      if (!drilled) { g.strokeStyle = '#2a2a2c'; g.lineWidth = 2; for (var s = 0; s < 12; s++) { var a2 = s / 12 * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a2) * 36, 64 + Math.sin(a2) * 36); g.lineTo(64 + Math.cos(a2 + 0.3) * 60, 64 + Math.sin(a2 + 0.3) * 60); g.stroke(); } }
      return new THREE.CanvasTexture(c);
    });
  };

  // Light clusters and body hardware for lofted bodies. o: {P, zt, type, car, cus, headMat, tailMat, clear, W, hasRoof, cabinT, sport}
  RX.decorateBody = function (rig, o) {
    var M = RX.mats(), P = o.P, zt = o.zt, car = o.car, cus = o.cus, type = o.type, y = car.year;
    var housing = new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.25, metalness: 0.4 });
    var lens = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.02, clearcoat: 1, depthWrite: false });
    var drlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4 });
    var reflG = new THREE.LatheGeometry([new THREE.Vector2(0.001, -0.02), new THREE.Vector2(0.03, -0.015), new THREE.Vector2(0.055, 0.0), new THREE.Vector2(0.065, 0.02)], 18); reflG.rotateX(Math.PI / 2);
    var front = 0.972, ph = P(front), hy = (ph.belt + ph.y5) / 2 - 0.02, fz = zt(front) + 0.03;
    var noseSlope = Math.atan2(P(0.96).y5 - P(0.99).y5, (0.03) * (zt(1) - zt(0)));
    var round = y < 1975 || type === 'roadster' || type === 'suv' || type === 'pickup' || type === 'legends' || type === 'gasser';
    var showHead = (type !== 'streamliner' && type !== 'funny' && car.sport !== 'drag') || type === 'prostock';
    if (type === 'stock' && y >= 1980) showHead = true; // decals on NASCAR, still give a cluster
    if (showHead) {
      [-1, 1].forEach(function (s) {
        var g = new THREE.Group(); g.position.set(s * ph.hw * 0.6, hy, fz); g.rotation.x = -Math.min(0.9, Math.max(0, noseSlope)) * 0.8; g.rotation.y = s * 0.25; rig.body.add(g);
        g.scale.setScalar(round ? 1.1 : 1.35);
        if (round) {
          add(g, new THREE.TorusGeometry(0.085, 0.014, 8, 24), M.chrome, 0, 0, 0.02);
          add(g, reflG, M.chrome, 0, 0, -0.005).scale.setScalar(1.3);
          add(g, new THREE.SphereGeometry(0.018, 10, 8), o.headMat, 0, 0, 0.0);
          var dome = add(g, new THREE.SphereGeometry(0.085, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), lens, 0, 0, 0.0); dome.rotation.x = Math.PI / 2;
          if (y < 1970) { var grid = add(g, new THREE.CircleGeometry(0.08, 18), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 }), 0, 0, 0.03); }
        } else {
          var w = 0.2, h = y >= 2005 ? 0.06 : 0.08;
          add(g, new THREE.BoxGeometry(w, h, 0.05), housing, 0, 0, -0.01);
          [-0.05, 0.04].forEach(function (x, i) {
            add(g, reflG, M.chrome, x, 0, 0.0).scale.setScalar(i ? 0.6 : 0.75);
            add(g, new THREE.SphereGeometry(i ? 0.012 : 0.016, 10, 8), o.headMat, x, 0, 0.004);
          });
          add(g, new THREE.BoxGeometry(w, h, 0.012), lens, 0, 0, 0.018);
          if (y >= 2008 && car.sport !== 'rally') { var drl = add(g, new THREE.BoxGeometry(w * 0.9, 0.008, 0.01), drlMat, 0, -h / 2 + 0.006, 0.02); var drl2 = add(g, new THREE.BoxGeometry(0.008, h * 0.8, 0.01), drlMat, s * w * 0.45, 0, 0.02); }
          if (o.sport === 'endurance' || o.sport === 'gt') { add(g, new THREE.BoxGeometry(0.03, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0xffd400 }), -s * w * 0.4, h / 2 - 0.01, 0.025); }
        }
      });
      // fog / driving lamps low in the bumper for rally and road-based cars
      if (car.sport === 'rally' || car.sport === 'touring' && y < 1995) {
        var pl = P(0.99);
        [-1, 1].forEach(function (s) {
          var fl = add(rig.body, new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14), o.headMat, s * pl.hw * 0.55, Math.max(o.clear + 0.12, pl.belt - 0.22), zt(0.99) + 0.02); fl.rotation.x = Math.PI / 2;
          var fr = add(rig.body, new THREE.TorusGeometry(0.045, 0.008, 6, 16), M.black, s * pl.hw * 0.55, Math.max(o.clear + 0.12, pl.belt - 0.22), zt(0.99) + 0.042);
        });
      }
    }
    // tail lights
    var pr = P(0.015), ty = (pr.belt + pr.y5) / 2 - 0.05, tz = zt(0.008) - 0.012;
    var revMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, emissive: 0xffffff, emissiveIntensity: 0.05 });
    rig.revMat = revMat;
    [-1, 1].forEach(function (s) {
      var g = new THREE.Group(); g.position.set(s * pr.hw * 0.64, ty, tz); g.rotation.y = Math.PI; rig.body.add(g);
      var wide = type === 'stock' || type === 'pickup' || type === 'latemodel' ? 0.42 : y < 1975 ? 0.12 : 0.24;
      if (y < 1975 && type !== 'stock') {
        var tl = add(g, new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), o.tailMat, 0, 0, 0); tl.rotation.x = Math.PI / 2;
        add(g, new THREE.TorusGeometry(0.045, 0.008, 6, 16), M.chrome, 0, 0, 0.016);
      } else {
        add(g, new THREE.BoxGeometry(wide, 0.075, 0.03), housing, 0, 0, -0.005);
        add(g, new THREE.BoxGeometry(wide * 0.62, 0.05, 0.02), o.tailMat, -s * wide * 0.15, 0, 0.008);
        add(g, new THREE.BoxGeometry(wide * 0.22, 0.05, 0.02), revMat, s * wide * 0.32, 0, 0.008);
        if (y >= 2000) add(g, new THREE.BoxGeometry(wide * 0.9, 0.008, 0.012), o.tailMat, 0, 0.03, 0.016);
        add(g, new THREE.BoxGeometry(wide, 0.075, 0.008), lens, 0, 0, 0.02);
      }
    });
    if (o.hasRoof && y >= 1990 && type !== 'pickup') {
      var pt = P(Math.max(0.05, o.cabinT - 0.3));
      var tb = add(rig.body, new THREE.BoxGeometry(0.3, 0.02, 0.03), o.tailMat, 0, pt.y6 + 0.012, zt(Math.max(0.05, o.cabinT - 0.3)) - 0.02);
    }
    // honeycomb grille + brake ducts
    var pg = P(0.993);
    var gm = new THREE.MeshStandardMaterial({ map: RX.honeycombTex(), roughness: 0.6, metalness: 0.3 });
    gm.map.repeat.set(3, 1);
    var gr = add(rig.body, new THREE.PlaneGeometry(pg.hw * 0.95, 0.13), gm, 0, Math.max(o.clear + 0.13, pg.belt - 0.13), zt(0.993) + 0.022);
    if (y >= 1985 && type !== 'suv' && type !== 'pickup' && type !== 'legends') {
      [-1, 1].forEach(function (s) { add(rig.body, new THREE.PlaneGeometry(0.16, 0.07), gm, s * pg.hw * 0.7, o.clear + 0.1, zt(0.993) + 0.022); });
    }
    // door handles, fuel filler, hood pins, tow straps, aerial, fender vents
    if (o.hasRoof) {
      var pd = P(0.55);
      [-1, 1].forEach(function (s) { var dh = add(rig.body, new THREE.BoxGeometry(0.012, 0.025, 0.12), M.chrome, s * (pd.hw + 0.003), pd.belt - 0.06, zt(0.55)); });
      var pf = P(Math.max(0.05, o.cabinT - 0.12));
      var fc = add(rig.body, new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), y > 1975 && o.sport !== 'drift' ? M.alu : M.chrome, pf.hw * 0.97, (pf.belt + pf.y5) / 2, zt(Math.max(0.05, o.cabinT - 0.12)));
      fc.rotation.z = Math.PI / 2;
    }
    if (car.year > 1960 && o.sport !== 'drift' && type !== 'suv' || cus.hoodPins) {
      var ph2 = P(0.93);
      [-1, 1].forEach(function (s) { add(rig.body, new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10), M.chrome, s * ph2.hw * 0.45, ph2.y6 + 0.004, zt(0.93)); });
    }
    if (cus.towHook) {
      var strap = new THREE.MeshStandardMaterial({ color: cus.towColor || '#e01e1e', roughness: 0.8 });
      var pfz = P(0.995), prz = P(0.005);
      var t1 = add(rig.body, new THREE.BoxGeometry(0.04, 0.09, 0.012), strap, -pfz.hw * 0.45, Math.max(o.clear + 0.1, pfz.belt - 0.2), zt(1) + 0.03); t1.rotation.x = 0.4;
      var t2 = add(rig.body, new THREE.BoxGeometry(0.04, 0.09, 0.012), strap, prz.hw * 0.45, Math.max(o.clear + 0.1, prz.belt - 0.2), zt(0) - 0.03); t2.rotation.x = -0.4;
    }
    if (o.hasRoof && (cus.antenna || o.sport === 'rally' || o.sport === 'offroad' || o.sport === 'endurance')) {
      var pa = P(o.cabinT - 0.05);
      var ant = add(rig.body, new THREE.CylinderGeometry(0.003, 0.004, 0.55, 5), M.black, pa.hw * 0.3, pa.y6 + 0.27, zt(o.cabinT - 0.05)); ant.rotation.x = -0.25;
    }
    if (type === 'gt' || type === 'hyper' || type === 'proto' || cus.fenderVents) {
      var pv = P(0.72);
      [-1, 1].forEach(function (s) { for (var k = 0; k < 3; k++) { var v = add(rig.body, new THREE.BoxGeometry(0.01, 0.025, 0.18), M.black, s * (pv.hw * 0.86), pv.y5 - 0.02 - k * 0.035, zt(0.72) - 0.05); v.rotation.z = s * 0.5; } });
    }
    if (o.sport === 'endurance' && y >= 1985 && o.hasRoof) {
      // LED race-number / class lights on the doors
      var pn = P(0.5);
      [-1, 1].forEach(function (s) { add(rig.body, new THREE.BoxGeometry(0.008, 0.06, 0.08), new THREE.MeshBasicMaterial({ color: cus.classLight || '#ff2a2a' }), s * (pn.hw + 0.004), pn.belt + 0.05, zt(0.5) + 0.15); });
    }
  };
})();
