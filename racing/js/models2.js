// Procedural car modelling, part 2: body builders for every discipline and the animation rig.
var RX = window.RX || (window.RX = {});

(function () {
  var V3 = THREE.Vector3;
  var box = function () { return RX.box.apply(null, arguments); };

  // Body tables: [t (rear->front), half-width fraction, belt y, roof/fender x-fraction, y5 (roof edge / fender), y6 (centre top)]
  var T = {
    sedan: [[0, .78, .62, .70, .78, .80], [.02, .92, .80, .78, .92, .94], [.08, .98, .88, .80, .98, 1.0], [.22, 1, .90, .80, 1.0, 1.02], [.30, 1, .91, .76, 1.22, 1.26],
      [.38, 1, .91, .74, 1.38, 1.42], [.58, 1, .91, .74, 1.38, 1.42], [.68, 1, .90, .78, 1.12, 1.15], [.74, 1, .89, .82, .96, .99], [.90, .98, .84, .82, .88, .90], [.97, .92, .70, .78, .74, .76], [1, .80, .50, .70, .55, .56]],
    hatch: [[0, .86, .80, .78, .95, .98], [.03, .95, .88, .76, 1.25, 1.28], [.08, .97, .90, .74, 1.38, 1.42], [.55, 1, .90, .74, 1.40, 1.44], [.66, 1, .89, .78, 1.12, 1.15],
      [.73, 1, .88, .82, .95, .98], [.90, .98, .82, .82, .86, .88], [.97, .92, .68, .78, .72, .74], [1, .80, .48, .70, .52, .53]],
    wagon: [[0, .86, .80, .78, .95, .98], [.02, .95, .88, .76, 1.30, 1.33], [.05, .97, .90, .74, 1.40, 1.44], [.58, 1, .90, .74, 1.40, 1.44], [.68, 1, .89, .78, 1.12, 1.15],
      [.74, 1, .88, .82, .95, .98], [.90, .98, .82, .82, .86, .88], [.97, .92, .68, .78, .72, .74], [1, .80, .48, .70, .52, .53]],
    coupe: [[0, .80, .62, .72, .75, .77], [.03, .94, .80, .78, .90, .92], [.12, .98, .86, .80, .95, .97], [.20, 1, .88, .78, 1.0, 1.02], [.30, 1, .89, .72, 1.2, 1.24],
      [.40, 1, .89, .70, 1.30, 1.34], [.55, 1, .89, .70, 1.30, 1.34], [.66, 1, .88, .76, 1.04, 1.07], [.72, 1, .86, .82, .90, .92], [.90, .98, .78, .82, .80, .82], [.97, .92, .64, .78, .66, .67], [1, .80, .45, .70, .48, .48]],
    gt: [[0, .85, .60, .70, .78, .76], [.03, .97, .80, .78, .92, .90], [.15, 1, .84, .80, .96, .95], [.25, 1, .85, .66, 1.06, 1.10], [.38, 1, .85, .60, 1.18, 1.22],
      [.52, 1, .85, .62, 1.18, 1.22], [.62, 1, .84, .72, .95, .98], [.68, .98, .82, .80, .82, .80], [.80, 1, .80, .82, .80, .74], [.92, .96, .70, .82, .70, .64], [.98, .88, .50, .78, .52, .50], [1, .75, .38, .70, .40, .40]],
    stock: [[0, .92, .82, .80, .92, .93], [.03, .99, .90, .82, .98, .99], [.20, 1, .93, .82, 1.0, 1.01], [.30, 1, .93, .70, 1.18, 1.22], [.40, 1, .93, .66, 1.28, 1.32],
      [.58, 1, .93, .66, 1.28, 1.32], [.68, 1, .92, .74, 1.02, 1.05], [.74, 1, .90, .82, .92, .94], [.92, .99, .84, .84, .86, .87], [.98, .94, .66, .80, .68, .69], [1, .86, .40, .70, .42, .42]],
    proto: [[0, .92, .70, .80, .95, .90], [.06, 1, .72, .82, .98, .92], [.24, 1, .74, .82, .98, .88], [.36, .96, .72, .52, 1.02, 1.06], [.46, .94, .70, .50, 1.08, 1.10],
      [.58, .94, .70, .50, 1.06, 1.08], [.66, .96, .66, .56, .86, .88], [.74, 1, .62, .82, .72, .58], [.88, 1, .56, .82, .66, .46], [.96, .96, .40, .80, .46, .34], [1, .85, .22, .70, .26, .22]],
    lmpopen: [[0, .92, .70, .80, .92, .88], [.25, 1, .74, .82, .96, .86], [.36, .96, .72, .55, .86, .84], [.45, .9, .66, .5, .70, .64], [.60, .92, .64, .55, .70, .66],
      [.74, 1, .62, .82, .72, .58], [.88, 1, .56, .82, .66, .46], [.96, .96, .40, .80, .46, .34], [1, .85, .22, .70, .26, .22]],
    roadster: [[0, .80, .55, .80, .70, .66], [.06, .95, .60, .82, .80, .74], [.25, 1, .64, .84, .86, .76], [.38, .92, .66, .6, .80, .78], [.50, .88, .64, .6, .70, .66],
      [.60, .92, .64, .7, .74, .72], [.72, 1, .60, .84, .78, .66], [.90, .96, .52, .82, .66, .56], [.98, .85, .38, .76, .48, .42], [1, .70, .28, .7, .32, .30]],
    canam: [[0, .9, .62, .8, .80, .72], [.2, 1, .66, .84, .84, .70], [.36, .92, .62, .55, .74, .70], [.46, .86, .58, .5, .62, .56], [.60, .9, .56, .6, .62, .58],
      [.74, 1, .54, .84, .66, .50], [.9, 1, .46, .84, .58, .40], [.97, .94, .32, .8, .40, .30], [1, .82, .2, .7, .24, .2]],
    pickup: [[0, .95, 1.10, .9, 1.18, 1.18], [.05, 1, 1.12, .92, 1.2, 1.2], [.40, 1, 1.12, .92, 1.2, 1.2], [.43, 1, 1.12, .82, 1.6, 1.62], [.62, 1, 1.12, .80, 1.66, 1.70],
      [.70, 1, 1.10, .82, 1.28, 1.30], [.76, 1, 1.08, .9, 1.16, 1.14], [.94, .98, 1.02, .9, 1.10, 1.08], [1, .92, .80, .85, .92, .92]],
    suv: [[0, .95, 1.0, .88, 1.10, 1.12], [.03, 1, 1.05, .85, 1.70, 1.74], [.60, 1, 1.05, .84, 1.76, 1.80], [.70, 1, 1.03, .88, 1.32, 1.35], [.76, 1, 1.02, .9, 1.15, 1.15],
      [.95, .98, .98, .9, 1.08, 1.08], [1, .92, .80, .85, .90, .90]],
    funny: [[0, .9, .62, .78, .80, .80], [.04, 1, .70, .8, .86, .86], [.14, 1, .74, .7, 1.02, 1.06], [.26, 1, .76, .62, 1.12, 1.16], [.36, 1, .74, .7, .98, 1.0],
      [.44, 1, .72, .8, .82, .84], [.70, .98, .62, .82, .70, .72], [.92, .92, .46, .8, .52, .52], [.99, .80, .26, .75, .30, .30], [1, .7, .2, .7, .22, .22]],
    streamliner: [[0, .25, .45, .8, .55, .55], [.10, .7, .6, .8, .8, .8], [.30, 1, .7, .8, .95, 1.0], [.50, 1, .7, .5, 1.05, 1.12], [.58, 1, .7, .5, 1.05, 1.1],
      [.68, 1, .68, .8, .9, .92], [.88, .85, .55, .8, .7, .7], [1, .15, .4, .7, .44, .44]],
    latemodel: [[0, .98, .95, .9, 1.02, 1.02], [.25, 1, .95, .88, 1.05, 1.05], [.32, 1, .95, .7, 1.22, 1.25], [.40, .98, .95, .62, 1.30, 1.34], [.56, .98, .95, .62, 1.30, 1.34],
      [.66, 1, .9, .8, .95, .96], [.94, 1, .7, .9, .76, .76], [1, .95, .45, .85, .5, .5]],
    tub: null
  };
  T.hyper = T.proto; T.groupc = T.proto; T.prostock = T.coupe; T.gasser = T.coupe; T.legends = T.coupe; T.roadsterc = T.coupe; T.van = T.suv; T.buggy = T.proto; T.modified = T.stock;

  var SPEC = {
    sedan: { L: 4.6, W: 1.82, rF: .32, rR: .32, twF: .24, twR: .24, tR: .2, tF: .79, clear: .1, cabin: 'closed' },
    hatch: { L: 4.0, W: 1.78, rF: .31, rR: .31, twF: .23, twR: .23, tR: .14, tF: .8, clear: .1, cabin: 'closed' },
    wagon: { L: 4.7, W: 1.8, rF: .32, rR: .32, twF: .23, twR: .23, tR: .17, tF: .8, clear: .1, cabin: 'closed' },
    coupe: { L: 4.4, W: 1.85, rF: .33, rR: .33, twF: .25, twR: .27, tR: .17, tF: .79, clear: .1, cabin: 'closed' },
    roadsterc: { L: 3.95, W: 1.7, rF: .3, rR: .3, twF: .22, twR: .23, tR: .17, tF: .79, clear: .1, cabin: 'closed' },
    gt: { L: 4.6, W: 2.02, rF: .34, rR: .35, twF: .30, twR: .32, tR: .17, tF: .78, clear: .08, cabin: 'closed' },
    stock: { L: 5.0, W: 1.96, rF: .34, rR: .34, twF: .30, twR: .30, tR: .2, tF: .78, clear: .1, cabin: 'closed' },
    modified: { L: 4.6, W: 1.9, rF: .4, rR: .42, twF: .3, twR: .36, tR: .18, tF: .8, clear: .14, cabin: 'closed' },
    proto: { L: 4.8, W: 2.0, rF: .34, rR: .35, twF: .30, twR: .35, tR: .17, tF: .8, clear: .07, cabin: 'closed', seatX: .28 },
    hyper: { L: 5.0, W: 2.0, rF: .36, rR: .36, twF: .32, twR: .36, tR: .16, tF: .8, clear: .07, cabin: 'closed', seatX: .28 },
    groupc: { L: 4.8, W: 2.0, rF: .33, rR: .35, twF: .3, twR: .35, tR: .17, tF: .8, clear: .06, cabin: 'closed', seatX: .28 },
    lmpopen: { L: 4.65, W: 2.0, rF: .34, rR: .35, twF: .30, twR: .35, tR: .17, tF: .8, clear: .07, cabin: 'open', seatX: .28 },
    roadster: { L: 3.9, W: 1.66, rF: .36, rR: .36, twF: .17, twR: .18, tR: .16, tF: .78, clear: .1, cabin: 'open', seatX: .3 },
    canam: { L: 4.1, W: 1.98, rF: .33, rR: .36, twF: .32, twR: .42, tR: .16, tF: .78, clear: .07, cabin: 'open', seatX: .25 },
    pickup: { L: 5.4, W: 2.1, rF: .45, rR: .45, twF: .33, twR: .33, tR: .18, tF: .8, clear: .45, cabin: 'closed' },
    suv: { L: 4.5, W: 1.98, rF: .42, rR: .42, twF: .3, twR: .3, tR: .17, tF: .8, clear: .35, cabin: 'closed' },
    van: { L: 5.0, W: 2.1, rF: .38, rR: .38, twF: .32, twR: .32, tR: .16, tF: .82, clear: .15, cabin: 'closed' },
    buggy: { L: 4.3, W: 2.25, rF: .45, rR: .45, twF: .32, twR: .32, tR: .17, tF: .8, clear: .38, cabin: 'closed', yScale: 1.25 },
    funny: { L: 5.3, W: 1.95, rF: .33, rR: .62, twF: .18, twR: .45, tR: .07, tF: .83, clear: .07, cabin: 'closed' },
    prostock: { L: 4.8, W: 1.9, rF: .3, rR: .45, twF: .2, twR: .42, tR: .18, tF: .8, clear: .08, cabin: 'closed' },
    gasser: { L: 4.0, W: 1.75, rF: .32, rR: .46, twF: .2, twR: .4, tR: .17, tF: .82, clear: .25, cabin: 'closed' },
    latemodel: { L: 5.0, W: 1.95, rF: .4, rR: .42, twF: .3, twR: .36, tR: .18, tF: .8, clear: .12, cabin: 'closed' },
    legends: { L: 3.1, W: 1.5, rF: .29, rR: .3, twF: .2, twR: .22, tR: .18, tF: .8, clear: .1, cabin: 'closed' },
    streamliner: { L: 8, W: 1.8, rF: .42, rR: .42, twF: .2, twR: .24, tR: .25, tF: .7, clear: .1, cabin: 'closed' }
  };

  function smoothstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  RX.gearTypeFor = function (car, cus) {
    if (cus.leverStyle && cus.leverStyle !== 'auto') return cus.leverStyle;
    var y = car.year, sp = car.sport, b = car.body;
    if (car.engine === 'E' || car.engine === 'T' || b === 'dragster' || b === 'funny' || b === 'sprint' || b === 'midget' || b === 'streamliner') return 'none';
    if (b === 'prewar') return 'external';
    if (b === 'kart') return /KZ|Shifter|Superkart|100cc/.test(car.name) ? 'seq' : 'none';
    if (b === 'openwheel') return y >= 1989 ? 'paddle' : 'H';
    if ((sp === 'gt' || sp === 'endurance' || sp === 'hill') && y >= 2000) return 'paddle';
    if (sp === 'touring' && y >= 2012) return 'paddle';
    if (sp === 'nascar') return y >= 2022 ? 'seq' : 'H';
    if ((sp === 'rally' || sp === 'rx' || sp === 'touring' || sp === 'gt' || sp === 'endurance' || sp === 'drift' || sp === 'offroad') && y >= 1995) return 'seq';
    return 'H';
  };

  // ========== CLOSED / SPORTS BODIES ==========
  function buildBodied(car, cus, rig) {
    var M = RX.mats(), type = car.body;
    var sp = Object.assign({}, SPEC[type] || SPEC.coupe);
    var table = T[type] || T.coupe;
    var yS = sp.yScale || 1;
    if (type === 'pickup' && car.sport === 'nascar') { sp.rF = sp.rR = .34; sp.clear = .12; yS = 0.8; sp.twF = sp.twR = .3; }
    if (type === 'streamliner') {
      sp.L = Math.min(11, 5 + car.top / 150); sp.W = 1.3 + Math.min(1, car.kg / 6000);
      if (car.year < 1925) { sp.L = 4.2; sp.W = 1.2; }
    }
    if (car.sport === 'hill' && type === 'lmpopen') { sp.L = 5.0; sp.W = 2.2; }
    if (type === 'suv' && car.kg < 1500) { sp.rF = sp.rR = .36; sp.clear = .2; }
    var wide = cus.widebody ? 1.06 : 1;
    var L = sp.L, W = sp.W * wide, hw0 = W / 2;
    var prof = RX.profile(table);
    var tF = sp.tF, tR = sp.tR, rF = sp.rF, rR = sp.rR;
    var maxRoof = 0; table.forEach(function (r) { maxRoof = Math.max(maxRoof, r[4]); });
    var beltRef = table[Math.floor(table.length / 2)][2];
    var lowStance = type === 'funny' || type === 'prostock';
    var P = function (t) {
      var r = prof(t);
      var hw = r[0] * hw0, belt = r[1] * yS, y5 = r[3] * yS, y6 = r[4] * yS;
      // flared fenders over the wheels
      var fl = 0;
      [[tF, rF], [tR, rR]].forEach(function (a) { var dx = (t - a[0]) * L; fl = Math.max(fl, Math.exp(-dx * dx / (a[1] * a[1] * 1.6))); });
      if (cus.widebody) hw += fl * 0.05;
      if (type === 'modified' && t > 0.66) hw *= 0.72;
      var yb = sp.clear;
      [[tF, rF], [tR, rR]].forEach(function (a) {
        var dx = (t - a[0]) * L, R = a[1] * 1.12;
        if (Math.abs(dx) < R) yb = Math.max(yb, Math.min(a[1] + Math.sqrt(R * R - dx * dx) + 0.01, belt - 0.07));
      });
      if (type === 'groupc' && Math.abs(t - tR) * L < rR * 1.2) yb = Math.max(sp.clear, yb - 0.2 * (1 - Math.abs(t - tR) * L / (rR * 1.2))); // rear spats
      return { hw: hw, yb: yb, belt: belt, x5: r[2], y5: y5, y6: y6 };
    };
    var lo = RX.loft(L, P, { stations: 80 });
    rig.bodyGeo = lo.geo;
    var kv = lo.keyV;
    // glass regions
    var hasRoof = sp.cabin === 'closed';
    var glass = hasRoof ? function (u, v) {
      var p = P(u), c = (p.y5 - p.belt - 0.12 * yS) / Math.max(0.05, maxRoof * yS - p.belt - 0.12 * yS);
      var side = (v > kv[5] + 0.012 && v < kv[6] - 0.004) || (v > 1 - kv[6] + 0.004 && v < 1 - kv[5] - 0.012);
      var top = v > kv[6] && v < 1 - kv[6];
      if (type === 'pickup' && u < 0.42) return false;
      // B-pillar
      var mid = (u > 0.47 && u < 0.495);
      if (side && c > 0.55 && !mid) return true;
      var p2 = P(Math.min(1, u + 0.01)), slope = Math.abs(p2.y5 - p.y5) / 0.01;
      if (top && c > 0.08 && c < 0.96 && slope > 0.4) return true;
      return false;
    } : null;
    var roofT0 = 1, roofT1 = 0; table.forEach(function (r) { if (r[4] >= maxRoof - 0.001) { roofT0 = Math.min(roofT0, r[0]); roofT1 = Math.max(roofT1, r[0]); } });
    var liv = RX.drawLivery(cus, glass, { doors: hasRoof ? [0.42, 0.62] : null, roofU: hasRoof ? [roofT0, roofT1] : null, hoodU: [Math.min(0.95, roofT1 + 0.16), 0.985], wsU: hasRoof ? [roofT1, Math.min(0.97, roofT1 + 0.11)] : null, nameU: hasRoof ? (roofT0 + roofT1) / 2 : null });
    rig.livery = liv;
    var paint = RX.paintMaterial(cus, liv.tex);
    var body = new THREE.Mesh(lo.geo, paint);
    body.castShadow = true; rig.body.add(body);
    // interior shell for cockpit view (window cut-outs via alpha mask)
    if (hasRoof) {
      var ig = lo.geo.clone(), ip = ig.attributes.position, inn = ig.attributes.normal;
      for (var q = 0; q < ip.count; q++) ip.setXYZ(q, ip.getX(q) - inn.getX(q) * 0.025, ip.getY(q) - inn.getY(q) * 0.025, ip.getZ(q) - inn.getZ(q) * 0.025);
      var inner = new THREE.Mesh(ig, new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.95, side: THREE.BackSide, alphaMap: liv.mask, alphaTest: 0.5 }));
      inner.userData.dyn = true; inner.userData.interior = true; inner.castShadow = false;
      rig.body.add(inner); rig.interior.push(inner);
    }
    var dims = { L: L, W: W, wb: (tF - tR) * L, zF: (tF - 0.5) * L, zR: (tR - 0.5) * L, rF: rF, rR: rR, twF: sp.twF, twR: sp.twR };
    dims.trackF = hw0 * 2 - sp.twF - 0.03; dims.trackR = hw0 * 2 - sp.twR - 0.03;
    if (cus.widebody) { dims.trackF += 0.08; dims.trackR += 0.08; }
    if (type === 'modified') dims.trackF = W + 0.25;
    var zt = function (t) { return (t - 0.5) * L; };
    // underbody tray
    box(W * 0.8, 0.03, L * 0.8, M.black, 0, sp.clear + 0.02, 0, rig.body);
    // lights
    var front = 0.985, ph = P(front);
    var hy = (ph.belt + ph.y5) / 2 - 0.02;
    var headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(cus.headColor), emissiveIntensity: 0.4, roughness: 0.05, metalness: 0.3 });
    rig.headMat = headMat;
    var tailMat = new THREE.MeshStandardMaterial({ color: 0x440000, emissive: 0xff1111, emissiveIntensity: 0.35, roughness: 0.3 });
    rig.tailMat = tailMat;
    // mirrors
    var cabinT = 0.5;
    table.forEach(function (r) { if (r[4] >= maxRoof - 0.001) cabinT = Math.max(0, r[0]); });
    var wsT = Math.min(0.95, cabinT + 0.1), pm = P(wsT);
    RX.decorateBody(rig, { P: P, zt: zt, type: type, car: car, cus: cus, headMat: headMat, tailMat: tailMat, clear: sp.clear, W: W, hasRoof: hasRoof, cabinT: cabinT, sport: car.sport });
    if (cus.mirrors && type !== 'streamliner') {
      [-1, 1].forEach(function (s) {
        var mg = new THREE.Group();
        box(0.12, 0.08, 0.06, cus.mirrorColor && cus.mirrorColor !== 'body' ? (cus.mirrorColor === 'carbon' ? M.carbon : new THREE.MeshStandardMaterial({ color: cus.mirrorColor, roughness: 0.3 })) : paint, 0, 0, 0, mg);
        box(0.1, 0.06, 0.005, M.chrome, 0, 0, -0.031, mg);
        box(0.08, 0.02, 0.03, M.black, -s * 0.06, -0.02, 0, mg);
        mg.position.set(s * (pm.hw + 0.06), pm.belt + 0.08, zt(wsT) - 0.05); rig.body.add(mg);
      });
    }
    // number decals on doors / sides
    if (cus.numStyle !== 'none') {
      var dt = hasRoof ? 0.52 : 0.4, pd = P(dt);
      var nsz = Math.min(0.42, (pd.belt - pd.yb) * 0.95);
      [-1, 1].forEach(function (s) {
        var d = RX.numberDecal(cus, nsz, nsz);
        d.position.set(s * (pd.hw + 0.004), (pd.belt + pd.yb) / 2 + 0.02, zt(dt)); d.rotation.y = s * Math.PI / 2; rig.body.add(d);
      });
      var roofNum = cus.roofNumber === 1 || (cus.roofNumber === -1 && (car.sport === 'nascar' || car.sport === 'dirt' || type === 'stock'));
      if (roofNum && hasRoof) {
        var rp = P(cabinT - 0.08), d2 = RX.numberDecal(cus, 0.55, 0.55);
        d2.position.set(0, rp.y6 + 0.012, zt(cabinT - 0.08)); d2.rotation.x = -Math.PI / 2; d2.rotation.z = Math.PI / 2; rig.body.add(d2);
      }
      // nose number for prototypes
      if (/proto|hyper|groupc|lmpopen|canam|roadster/.test(type)) {
        var pn = P(0.86), d3 = RX.numberDecal(cus, 0.32, 0.32);
        [-1, 1].forEach(function (s) { var dd = d3.clone(); dd.position.set(s * pn.hw * 0.55, pn.y5 + 0.02, zt(0.86)); dd.rotation.x = -Math.PI / 2; dd.rotation.z = s * 0.25; rig.body.add(dd); });
      }
    }
    // ---------- aero / accessories ----------
    var era = car.year, sport = car.sport;
    var wingLvl = cus.wing >= 0 ? cus.wing : (
      sport === 'gt' && era >= 1995 ? 3 : sport === 'gt' && era >= 1976 ? 2 : sport === 'touring' && era >= 1987 ? 2 : sport === 'rally' && era >= 1983 ? 2 :
      sport === 'rx' && era >= 1985 ? 2 : sport === 'drift' && era >= 2005 ? 3 : sport === 'nascar' && era >= 1969 ? 1 : (type === 'hyper' || type === 'proto' && era >= 1970 || type === 'groupc' || type === 'lmpopen') ? 2 :
      sport === 'hill' && era > 1985 ? 4 : sport === 'canam' && era >= 1968 ? 2 : type === 'prostock' ? 1 : type === 'funny' ? 2 : sport === 'dirt' && type === 'latemodel' ? 1 : 0);
    rig.aeroBase = wingLvl;
    if (/Daytona|Superbird/.test(car.name)) wingLvl = 5;
    if (wingLvl === 1) { // lip spoiler
      var pl = P(0.03);
      var spl = box(W * 0.85, 0.12, 0.03, type === 'stock' ? M.clearGlass : paint, 0, pl.y6 + 0.05, zt(0.03), rig.body); spl.rotation.x = -0.4;
    } else if (wingLvl >= 2) {
      var wt = type === 'funny' ? 0.0 : 0.035, pw = P(wt + 0.02);
      var wy = pw.y6 + (wingLvl >= 4 ? 0.45 : wingLvl === 3 ? 0.28 : 0.18) + (wingLvl === 5 ? 0.15 : 0);
      var span = Math.min(W * (wingLvl >= 3 ? 0.98 : 0.85), 2.0);
      var wg = new THREE.Group(); wg.position.set(0, wy, zt(wt) - (type === 'funny' ? 0.15 : 0)); rig.body.add(wg);
      var chord = wingLvl >= 3 ? 0.32 : 0.24;
      var wingM = cus.wingColor === 'carbon' ? M.carbon : cus.wingColor && cus.wingColor !== 'body' ? new THREE.MeshStandardMaterial({ color: cus.wingColor, roughness: 0.35, metalness: 0.2 }) : (wingLvl >= 3 ? M.carbon : paint);
      var m1 = box(span, 0.025, chord, wingM, 0, 0, 0, wg); m1.rotation.x = -0.12;
      if (wingLvl >= 3) { var m2 = box(span, 0.02, chord * 0.5, wingM, 0, 0.06, -chord * 0.55, wg); m2.rotation.x = -0.5; box(span, 0.03, 0.006, M.black, 0, 0.085, -chord * 0.8, wg); }
      [-1, 1].forEach(function (s) {
        box(0.015, 0.22, chord * 1.4, wingM, s * span / 2, 0.02, -0.04, wg);
        var post = box(0.03, wy - pw.y6 + 0.05, 0.08, wingM, s * span * 0.3, -(wy - pw.y6) / 2, 0.02, wg);
      });
      rig.rearWing = wg;
      if (wingLvl === 5) { wg.position.z = zt(0.05); }
    }
    var splitLvl = cus.splitter >= 0 ? cus.splitter : ((sport === 'gt' && era > 1990) || (sport === 'touring' && era > 1990) || type === 'hyper' || sport === 'drift' && era > 2005 ? 1 : 0);
    if (splitLvl > 0) {
      var pf = P(0.99);
      box(W * 0.92, 0.02, 0.18 + splitLvl * 0.06, M.carbon, 0, sp.clear + 0.03, zt(0.99) + 0.05, rig.body);
    }
    if (cus.skirts) [-1, 1].forEach(function (s) { box(0.06, 0.08, (tF - tR) * L - rF - rR - 0.3, M.carbon, s * (hw0 - 0.02), sp.clear + 0.05, (zt(tF) + zt(tR)) / 2, rig.body); });
    if (cus.diffuser || (sport === 'gt' && era > 2000) || type === 'hyper') {
      for (var df = -2; df <= 2; df++) { var fin = box(0.015, 0.16, 0.4, M.carbon, df * W * 0.14, sp.clear + 0.08, zt(0.03), rig.body); fin.rotation.x = 0.35; }
    }
    if (cus.canards) [-1, 1].forEach(function (s) { [0, 1].forEach(function (k) { var c = box(0.18, 0.012, 0.12, M.carbon, s * (hw0 - 0.05), ph.belt - 0.08 - k * 0.09, zt(0.965), rig.body); c.rotation.z = s * 0.2; }); });
    var scoop = cus.scoop >= 0 ? cus.scoop : (sport === 'rally' && era >= 1995 ? 1 : type === 'prostock' || type === 'gasser' ? 2 : type === 'latemodel' ? 0 : 0);
    if (scoop === 1 && hasRoof) {
      var pr2 = P(cabinT - 0.05); var sc = box(0.3, 0.07, 0.3, paint, 0, pr2.y6 + 0.035, zt(cabinT - 0.05), rig.body);
      box(0.24, 0.05, 0.01, M.mesh, 0, pr2.y6 + 0.04, zt(cabinT - 0.05) + 0.151, rig.body);
    }
    if (scoop === 2 || type === 'gasser' || type === 'funny') { // hood scoop / blower
      var ph2 = P(0.82);
      if (type === 'gasser' || type === 'funny') {
        var bl = box(0.36, 0.22, 0.5, M.alu, 0, ph2.y6 + 0.1, zt(0.82), rig.body);
        var hat = box(0.32, 0.2, 0.35, type === 'funny' ? M.alu : M.chrome, 0, ph2.y6 + 0.3, zt(0.82) + 0.05, rig.body);
        for (var bb = 0; bb < 4; bb++) box(0.05, 0.02, 0.45, M.steel, -0.12 + bb * 0.08, ph2.y6 + 0.22, zt(0.82), rig.body);
      } else {
        var hs = box(0.6, 0.14, 0.9, paint, 0, ph2.y6 + 0.06, zt(0.8), rig.body);
        box(0.5, 0.09, 0.01, M.mesh, 0, ph2.y6 + 0.08, zt(0.8) + 0.451, rig.body);
      }
    }
    if (cus.roofVent && hasRoof) { var prv = P(roofT1 - 0.02); box(0.3, 0.035, 0.18, M.black, 0, prv.y6 + 0.015, zt(roofT1 - 0.02), rig.body); }
    if (cus.louvres && hasRoof) { for (var lv = 0; lv < 6; lv++) { var tl = roofT0 - 0.02 - lv * 0.015, plv = P(Math.max(0.02, tl)); box(plv.hw * 1.1 * 0.7, 0.012, 0.03, M.black, 0, plv.y5 + 0.025, zt(Math.max(0.02, tl)), rig.body); } }
    var flaps = cus.mudflaps >= 0 ? cus.mudflaps : (sport === 'rally' || sport === 'rx' || sport === 'offroad' ? 1 : 0);
    if (flaps) [[tF, rF], [tR, rR]].forEach(function (a) { [-1, 1].forEach(function (s) { box(0.3, 0.3, 0.01, new THREE.MeshStandardMaterial({ color: cus.paint2, roughness: 0.8 }), s * (hw0 - 0.18), a[1] * 0.75 + sp.clear * 0.5, zt(a[0]) - a[1] - 0.12, rig.body); }); });
    if (cus.lightpod || (sport === 'rally' && rig.night)) {
      var lp = P(0.97);
      for (var l = 0; l < 4; l++) {
        var lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 14), headMat);
        lamp.rotation.x = Math.PI / 2; lamp.position.set(-0.36 + l * 0.24, lp.y6 + 0.1, zt(0.97) + 0.04); rig.body.add(lamp);
        var rimL = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 14), M.black); rimL.position.copy(lamp.position); rimL.position.z += 0.04; rig.body.add(rimL);
      }
      box(0.95, 0.04, 0.1, M.black, 0, lp.y6 + 0.04, zt(0.97), rig.body);
    }
    if (type === 'pickup' && sport !== 'nascar' || type === 'suv' && sport === 'offroad' || type === 'buggy') {
      // light bar, spare wheel, snorkel, cage
      var pt = P(cabinT), lb = box(1.2, 0.08, 0.1, M.black, 0, pt.y6 + 0.09, zt(cabinT) + 0.05, rig.body);
      for (var lb2 = 0; lb2 < 6; lb2++) box(0.16, 0.05, 0.02, headMat, -0.5 + lb2 * 0.2, pt.y6 + 0.09, zt(cabinT) + 0.105, rig.body);
      var spare = RX.buildWheel(rR * 0.95, 0.3, 'beadlock', cus, { noBrake: true, side: 1, knobby: true });
      spare.pivot.rotation.z = Math.PI / 2; spare.pivot.position.set(0, type === 'pickup' ? P(0.2).y6 + 0.2 : P(0.15).y6 + 0.15, zt(0.22)); rig.body.add(spare.pivot);
      if (type === 'pickup') {
        // bed tub + cage tubes
        var pb = P(0.2);
        box(W * 0.86, 0.04, L * 0.34, M.black, 0, pb.y6 - 0.25, zt(0.22), rig.body);
        [-1, 1].forEach(function (s) {
          RX.rod(new V3(s * 0.6, pt.y6, zt(0.43)), new V3(s * 0.5, pb.y6 + 0.15, zt(0.05)), 0.03, M.cage, rig.body);
        });
      }
      var sn = RX.cyl(0.06, 0.06, 0.7, M.black, 10, rig.body); sn.position.set(hw0 * 0.9, P(0.7).y6 + 0.2, zt(0.7));
    }
    if (type === 'hyper' || (type === 'proto' && era >= 2011)) {
      // shark fin
      var pf2 = P(0.25), fin2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.36, 1.2), paint);
      fin2.position.set(0, pf2.y6 + 0.12, zt(0.22)); rig.body.add(fin2);
    }
    if (type === 'roadster' && /D-Type/.test(car.name)) {
      var fin3 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.8), paint); fin3.position.set(sp.seatX * hw0, P(0.3).y5 + 0.1, zt(0.24)); rig.body.add(fin3);
    }
    if (type === 'streamliner' && car.year > 1925) {
      var fin4 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.7, 1.4), paint); fin4.position.set(0, P(0.1).y6 + 0.3, zt(0.08)); rig.body.add(fin4);
    }
    // exhausts
    var tip = cus.exhaustTip !== 'auto' ? cus.exhaustTip : (type === 'stock' || type === 'latemodel' ? 'side' : sport === 'drift' ? 'single' : (type === 'gt' || type === 'hyper' || type === 'proto') ? 'quad' : type === 'pickup' && sport !== 'nascar' ? 'side' : 'dual');
    var ex = [];
    if (tip === 'single') ex = [[0.4, 0]]; else if (tip === 'dual') ex = [[0.35, 0], [-0.35, 0]]; else if (tip === 'quad') ex = [[0.22, 0], [0.32, 0], [-0.22, 0], [-0.32, 0]]; else if (tip === 'center') ex = [[0.05, 0], [-0.05, 0]];
    rig.exhausts = [];
    ex.forEach(function (e) {
      var pp = new V3(e[0] * W * 0.9 / 2 * 2 * 0.5, sp.clear + 0.12, zt(0) - 0.02);
      var pipe = RX.cyl(0.045, 0.045, 0.16, M.exhaust, 12, rig.body); pipe.rotation.x = Math.PI / 2; pipe.position.copy(pp);
      rig.exhausts.push(new V3(pp.x, pp.y, pp.z - 0.08));
    });
    if (tip === 'side') {
      [1].forEach(function (s) { var pz = zt(0.6); var pipe = RX.cyl(0.05, 0.05, 0.25, M.exhaust, 12, rig.body); pipe.rotation.z = Math.PI / 2; pipe.position.set(s * (hw0 + 0.05), sp.clear + 0.12, pz); rig.exhausts.push(new V3(s * (hw0 + 0.18), sp.clear + 0.12, pz)); });
    }
    if (type === 'funny' || type === 'gasser') {
      // zoomie headers out the sides
      rig.exhausts = [];
      [-1, 1].forEach(function (s) {
        for (var h = 0; h < 4; h++) {
          var z = zt(0.76) + h * 0.12, pipe = RX.cyl(0.035, 0.04, 0.35, M.chrome, 8, rig.body);
          pipe.position.set(s * (hw0 + 0.04), P(0.78).belt + 0.1, z); pipe.rotation.z = -s * 0.9; pipe.rotation.x = -0.4;
          rig.exhausts.push(new V3(s * (hw0 + 0.18), P(0.78).belt + 0.22, z - 0.1));
        }
      });
    }
    // ---------- cockpit ----------
    var seatT = hasRoof ? Math.max(tR + 0.18, cabinT - (type === 'pickup' ? 0.12 : 0.06)) : (type === 'roadster' ? 0.45 : 0.5);
    if (type === 'funny') seatT = 0.26;
    if (type === 'streamliner') seatT = 0.52;
    var ps = P(seatT);
    var seatX = (sp.seatX || 0.42) * ps.hw;
    if (type === 'streamliner' || type === 'funny') seatX = 0;
    if (sport === 'nascar' || type === 'latemodel') seatX = 0.3 * ps.hw;
    var floorY = sp.clear + 0.06;
    var roofAtSeat = ps.y5;
    // eye just above the beltline (closed cars) so the windscreen frames the road
    var eyeY = hasRoof ? Math.min(roofAtSeat - 0.11, ps.belt + 0.3) : Math.max(ps.y6 + 0.25, floorY + 0.8);
    var seatY = Math.max(floorY, eyeY - 0.74);
    var drv = RX.buildDriver(cus, { recline: hasRoof ? 0.25 : 0.35 });
    drv.position.set(seatX, seatY, zt(seatT)); rig.body.add(drv); rig.driver = drv;
    var seat = box(0.48, 0.65, 0.12, M.seat, seatX, seatY + 0.3, zt(seatT) - 0.22, rig.body); seat.rotation.x = -0.25;
    box(0.48, 0.08, 0.5, M.seat, seatX, seatY + 0.02, zt(seatT) + 0.02, rig.body);
    if (eyeY - seatY < 0.66) { drv.scale.setScalar(Math.max(0.75, (eyeY - seatY) / 0.74)); }
    var dashZ = zt(seatT) + 0.62;
    // windscreen base for wipers and the interior mirror position
    var wsBase = cabinT;
    for (var tq = cabinT; tq < 0.99; tq += 0.005) { var pq = P(tq); if (pq.y5 < pq.belt + 0.12 * yS) { wsBase = tq; break; } }
    var pTop = P(cabinT), pBase = P(wsBase);
    var noWipers = type === 'streamliner' || !hasRoof || car.year < 1925;
    RX.buildCockpit(rig, car, cus, {
      kind: hasRoof ? 'closed' : 'open', seatX: seatX, seatY: seatY, seatZ: zt(seatT), eyeY: eyeY, dashZ: dashZ, hw: ps.hw, floorY: floorY,
      roofY: roofAtSeat, beltY: ps.belt, red: RX.carSpec(car, cus).red, wheelY: eyeY - 0.25, wheelZ: zt(seatT) + 0.48, wheelTilt: -0.3,
      gearType: RX.gearTypeFor(car, cus), leverX: seatX - Math.sign(seatX || 1) * 0.3, leverY: floorY + 0.33, leverZ: zt(seatT) + 0.3,
      handbrake: /rally|rx|drift|offroad/.test(car.sport), pedalZ: zt(seatT) + 0.95, mirrorZ: zt(cabinT) + 0.02,
      wipers: !noWipers, wiperY: pBase.y6 + 0.03, wiperZ: zt(wsBase) - 0.06, wiperSlope: -Math.atan2(Math.max(0.05, zt(wsBase) - zt(cabinT)), Math.max(0.05, pTop.y5 - pBase.y6))
    });
    // roll cage for race cars
    var cage = cus.cage >= 0 ? cus.cage : (hasRoof && car.year > 1965 && type !== 'streamliner' ? 1 : 0);
    if (cage && hasRoof) {
      var hz = zt(seatT) - 0.3, fz = zt(Math.min(0.95, cabinT + 0.05)), w2 = ps.hw * 0.86;
      var roofAt = function (z) { var pz = P(z / L + 0.5); return pz.belt + (pz.y5 - pz.belt) * 0.9; };
      var ry = Math.min(roofAtSeat, roofAt(hz)) - 0.08;
      var fry = Math.min(ry - 0.05, roofAt(fz) - 0.08);
      [-1, 1].forEach(function (s) {
        RX.rod(new V3(s * w2, floorY, hz), new V3(s * w2 * 0.92, ry, hz), 0.022, M.cage, rig.body);
        RX.rod(new V3(s * w2 * 0.92, ry, hz), new V3(s * w2 * 0.85, fry, fz), 0.022, M.cage, rig.body);
        RX.rod(new V3(s * w2 * 0.85, fry, fz), new V3(s * w2 * 0.95, floorY + 0.3, fz + 0.25), 0.022, M.cage, rig.body);
        RX.rod(new V3(s * w2, floorY + 0.25, hz), new V3(s * w2, floorY + 0.3, fz + 0.15), 0.02, M.cage, rig.body);
      });
      RX.rod(new V3(-w2 * 0.92, ry, hz), new V3(w2 * 0.92, ry, hz), 0.022, M.cage, rig.body);
      RX.rod(new V3(-w2, floorY + 0.1, hz), new V3(w2 * 0.92, ry, hz), 0.02, M.cage, rig.body);
    }
    var net = cus.windowNet >= 0 ? cus.windowNet : (sport === 'nascar' || type === 'latemodel' ? 1 : 0);
    if (net && hasRoof) {
      var nm = new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true });
      var npl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.35, 6, 4), nm);
      var s2 = Math.sign(seatX) || 1;
      npl.position.set(s2 * (ps.hw - 0.04), eyeY - 0.05, zt(seatT) + 0.15); npl.rotation.y = Math.PI / 2; rig.body.add(npl);
    }
    if (!hasRoof) {
      // windscreen / aeroscreen
      if (type === 'roadster' || type === 'canam' || type === 'lmpopen') {
        var wsc = new THREE.Mesh(new THREE.PlaneGeometry(type === 'lmpopen' ? 0.9 : 0.55, 0.18), M.clearGlass);
        wsc.position.set(type === 'lmpopen' ? 0 : seatX, P(seatT + 0.1).y6 + 0.08, zt(seatT + 0.12)); wsc.rotation.x = -0.6; rig.body.add(wsc);
        // roll hoop
        var hoop = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 12, Math.PI), M.cage);
        hoop.position.set(seatX, P(seatT - 0.08).y6, zt(seatT) - 0.28); rig.body.add(hoop);
      }
    }
    rig.eye = new V3(seatX, eyeY, zt(seatT) - 0.08); rig.lookPitch = 0.07;
    rig.hood = new V3(0, P(0.8).y6 + 0.35, zt(0.62));
    rig.bumper = new V3(0, sp.clear + 0.35, zt(1) + 0.05);
    rig.P = P; rig.zt = zt;
    // wheels
    var rim = cus.rimStyle !== 'auto' ? cus.rimStyle : (car.year < 1940 ? 'wire' : car.year < 1965 ? (type === 'stock' ? 'steelie' : 'wire') : type === 'stock' || type === 'latemodel' ? 'steelie' :
      sport === 'offroad' ? 'beadlock' : sport === 'rally' && car.year < 1990 ? 'mesh' : sport === 'drift' ? 'spokeY' : type === 'hyper' || type === 'proto' && car.year > 2000 ? 'monoblock' :
      car.year < 1985 ? 'split' : 'spoke5');
    var knob = sport === 'offroad' || (sport === 'rally' && car.sport !== 'tarmac');
    addWheels(rig, dims, cus, rim, { knobby: sport === 'offroad', profile: type === 'pickup' || type === 'suv' || type === 'buggy' ? 0.5 : car.year < 1975 ? 0.5 : type === 'funny' || type === 'prostock' ? 0.55 : 0.36 });
    if (type === 'funny') { // wheelie bars
      [-1, 1].forEach(function (s) { RX.rod(new V3(s * 0.25, 0.25, zt(0.05)), new V3(s * 0.2, 0.12, zt(0) - 1.6), 0.02, M.chrome, rig.body); });
      var wb = RX.buildWheel(0.07, 0.04, 'kart', cus, { noBrake: true }); wb.pivot.position.set(0, 0.07, zt(0) - 1.6); wb.pivot.scale.set(6, 1, 1); rig.root.add(wb.pivot);
      addChute(rig, zt(0) - 0.1, P(0.05).y6);
    }
    return dims;
  }

  function addChute(rig, z, y) {
    var M = RX.mats();
    var pack = box(0.25, 0.25, 0.3, new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8 }), 0, y, z, rig.body);
    var chute = new THREE.Group(); chute.visible = false; chute.userData.dyn = true;
    var canopy = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.8 }));
    canopy.rotation.x = Math.PI / 2; canopy.position.z = -5; chute.add(canopy);
    var stripe = new THREE.Mesh(new THREE.SphereGeometry(0.91, 12, 2, 0, Math.PI * 2, 0.6, 0.3), new THREE.MeshStandardMaterial({ color: 0xdd1111, side: THREE.DoubleSide }));
    stripe.rotation.x = Math.PI / 2; stripe.position.z = -5; chute.add(stripe);
    for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2; RX.rod(new V3(0, 0, 0), new V3(Math.cos(a) * 0.85, Math.sin(a) * 0.85, -5), 0.004, M.black, chute); }
    chute.position.set(0, y, z - 0.15); rig.body.add(chute); rig.chute = chute;
  }

  function addWheels(rig, dims, cus, rimStyle, o) {
    o = o || {};
    var rs = 1 + (cus.rimSize || 0) * 0.04;
    var defs = [
      { front: 1, side: 1, z: dims.zF, r: dims.rF, w: dims.twF, x: dims.trackF / 2 },
      { front: 1, side: -1, z: dims.zF, r: dims.rF, w: dims.twF, x: dims.trackF / 2 },
      { front: 0, side: 1, z: dims.zR, r: dims.rR, w: dims.twR, x: dims.trackR / 2 },
      { front: 0, side: -1, z: dims.zR, r: dims.rR, w: dims.twR, x: dims.trackR / 2 }
    ];
    if (o.extraFront) o.extraFront.forEach(function (z) { defs.push({ front: 1, side: 1, z: z, r: dims.rF, w: dims.twF, x: dims.trackF / 2 }, { front: 1, side: -1, z: z, r: dims.rF, w: dims.twF, x: dims.trackF / 2 }); });
    rig.wheels = [];
    if (!o.tread) o.tread = cus.compound && cus.compound !== 'auto' ? cus.compound : (rig.carRef && RX.autoCompound ? RX.autoCompound(rig.carRef, { surface: rig.carRef.sport === 'rally' ? 'gravel' : 'asphalt' }) : 'medium');
    defs.forEach(function (d) {
      var prof = Math.max(0.15, Math.min(0.7, (o.profile || 0.36) / rs));
      var wh = RX.buildWheel(d.r, d.w, rimStyle, cus, { side: d.side, profile: prof, knobby: o.knobby, knockoff: rimStyle === 'wire', tread: o.tread });
      var stagger = (o.stagger && d.side === -1 && !d.front) ? 1.08 : 1;
      wh.pivot.scale.setScalar(stagger);
      wh.pivot.position.set(d.side * d.x, d.r * stagger, d.z);
      wh.pivot.userData.dyn = true;
      rig.root.add(wh.pivot);
      wh.pivot.traverse(function (m) { if (m.isMesh) { m.castShadow = true; } });
      rig.wheels.push({ pivot: wh.pivot, spin: wh.spin, front: d.front, side: d.side, r: d.r * stagger, x: d.side * d.x, z: d.z, baseY: d.r * stagger, cam: 0 });
    });
  }

  // ========== OPEN-WHEEL SINGLE SEATERS ==========
  function buildOpenWheel(car, cus, rig) {
    var M = RX.mats(), y = car.year, sport = car.sport;
    var fe = sport === 'fe', indy = sport === 'indy';
    var frontEngine = (sport === 'f1' && y < 1959) || (indy && y < 1964);
    var e = {}; // era parameters
    if (frontEngine) e = { L: 4.0, wb: 2.35, track: 1.28, rF: .38, rR: .4, twF: .16, twR: .2, noseY: .55, wings: 0, pods: 0, airbox: 0, halo: 0, tubW: .42, cockpitZ: -0.35, engine: 'front' };
    else if (y < 1968) e = { L: 3.8, wb: 2.35, track: 1.36, rF: .30, rR: .33, twF: .2, twR: .27, noseY: .32, wings: 0, pods: 0, airbox: 0, halo: 0, tubW: .34, cockpitZ: 0.2, engine: 'open' };
    else if (y < 1971) e = { L: 4.0, wb: 2.45, track: 1.45, rF: .31, rR: .34, twF: .25, twR: .38, noseY: .3, wings: y < 1970 ? 3 : 1, pods: 0, airbox: 0, halo: 0, tubW: .36, cockpitZ: 0.2, engine: 'open' };
    else if (y < 1983) e = { L: 4.35, wb: 2.7, track: 1.5, rF: .32, rR: .35, twF: .28, twR: .46, noseY: .28, wings: 1, pods: y >= 1977 ? 2 : 1, airbox: y < 1980 ? 1 : 0, halo: 0, tubW: .36, cockpitZ: 0.25, engine: 'cover' };
    else if (y < 1990) e = { L: 4.4, wb: 2.85, track: 1.62, rF: .32, rR: .34, twF: .3, twR: .42, noseY: .26, wings: 1, pods: 1, airbox: y > 1985 ? 1 : 0, halo: 0, tubW: .34, cockpitZ: 0.25, engine: 'cover' };
    else if (y < 1998) e = { L: 4.5, wb: 2.95, track: 1.62, rF: .32, rR: .33, twF: .3, twR: .38, noseY: .4, wings: 1, pods: 1, airbox: 1, halo: 0, tubW: .32, cockpitZ: 0.3, engine: 'cover', raised: 1 };
    else if (y < 2009) e = { L: 4.6, wb: 3.05, track: 1.45, rF: .33, rR: .33, twF: .27, twR: .34, noseY: .48, wings: 1, pods: 1, airbox: 1, halo: 0, tubW: .3, cockpitZ: 0.35, engine: 'cover', raised: 1, winglets: y > 2004 };
    else if (y < 2017) e = { L: 5.0, wb: 3.3, track: 1.45, rF: .33, rR: .33, twF: .27, twR: .33, noseY: .5, wings: 2, pods: 1, airbox: 1, halo: 0, tubW: .3, cockpitZ: 0.4, engine: 'cover', raised: 1 };
    else if (y < 2022) e = { L: 5.5, wb: 3.6, track: 1.6, rF: .33, rR: .33, twF: .3, twR: .4, noseY: .45, wings: 3, pods: 1, airbox: 1, halo: y >= 2018 ? 1 : 0, tubW: .3, cockpitZ: 0.45, engine: 'cover', raised: 1 };
    else e = { L: 5.6, wb: 3.6, track: 1.6, rF: .36, rR: .36, twF: .3, twR: .4, noseY: .32, wings: 4, pods: 3, airbox: 1, halo: 1, tubW: .3, cockpitZ: 0.45, engine: 'cover', raised: 0, profile: 0.22 };
    if (indy && !frontEngine) {
      if (y >= 2012) Object.assign(e, { L: 5.1, wb: 3.05, track: 1.6, rF: .33, rR: .35, twF: .3, twR: .38, wings: 2, pods: 1, halo: y >= 2020 ? 2 : 0, raised: 1, noseY: .35, pods2: 1 });
      else if (y >= 1980) Object.assign(e, { L: 4.9, wb: 3.0, track: 1.65, rF: .33, rR: .35, twF: .3, twR: .38, wings: 1, pods: 1, halo: 0, raised: y > 1999 ? 1 : 0, noseY: .3 });
    }
    if (fe) {
      if (y < 2018) Object.assign(e, { L: 5.0, wb: 3.1, track: 1.55, rF: .33, rR: .34, twF: .27, twR: .33, wings: 2, pods: 1, halo: 0, raised: 1, noseY: .4, fend: 0 });
      else if (y < 2023) Object.assign(e, { L: 5.2, wb: 3.1, track: 1.6, rF: .34, rR: .34, twF: .27, twR: .33, wings: 5, pods: 1, halo: 1, raised: 0, noseY: .3, fend: 1 });
      else Object.assign(e, { L: 5.0, wb: 2.97, track: 1.6, rF: .33, rR: .33, twF: .25, twR: .3, wings: 6, pods: 1, halo: 1, raised: 0, noseY: .25, fend: 2 });
    }
    var six = /P34/.test(car.name), fan = /BT46B/.test(car.name), turbine = car.engine === 'T';
    var L = e.L, wb = e.wb, zF = wb / 2, zR = -wb / 2;
    var noseTip = zF + (L - wb) * 0.62, tail = zR - (L - wb) * 0.38;
    var tw = e.tubW;
    var cz = e.cockpitZ; // cockpit centre z
    var liv = RX.drawLivery(cus, null, { noSponsors: false, sponsorU: 0.42, sponsorU2: 0.62, sponsorA: 0.5 });
    var paint = RX.paintMaterial(cus, liv.tex);
    rig.livery = liv;
    // ---- tub / nose / engine cover loft (custom profile in absolute z) ----
    var zs = [], rows = [];
    function row(z, hw, yb, belt, x5, y5, y6) { rows.push([z, hw, yb, belt, x5, y5, y6]); }
    if (frontEngine) {
      row(tail, .12, .3, .38, .7, .45, .48);
      row(zR - 0.1, .3, .22, .42, .7, .62, .68);
      row(cz - 0.45, .38, .18, .45, .6, .74, .82); // headrest fairing
      row(cz - 0.15, .4, .17, .45, .7, .62, .58); // cockpit opening
      row(cz + 0.3, .42, .17, .46, .7, .66, .62);
      row(cz + 0.6, .42, .17, .48, .7, .80, .86); // scuttle + windscreen base
      row(zF - 0.1, .36, .2, .48, .7, .76, .8);
      row(noseTip - 0.05, .27, .22, .42, .7, .58, .6);
      row(noseTip, .22, .25, .38, .7, .48, .5);
    } else {
      var engH = e.engine === 'open' ? .5 : .62, coverTop = e.airbox ? .95 : .78;
      if (y >= 2009) coverTop = .9;
      row(tail, .12, .2, .3, .7, .36, .38);
      row(zR + 0.1, .22, .12, .34, .7, .5, .52);
      row(cz - 0.9, tw * 1.05, .08, .4, .6, engH, engH + 0.06);
      row(cz - 0.5, tw * 1.1, .06, .42, .55, coverTop * 0.9, coverTop); // airbox / roll hoop
      row(cz - 0.32, tw * 1.08, .06, .42, .6, .66, .6);
      row(cz - 0.05, tw * 1.05, .06, .44, .62, .6, .46); // cockpit opening (low centre)
      row(cz + 0.3, tw, .06, .46, .66, .63, .48);
      row(cz + 0.62, tw * 0.9, .08, .48, .7, .64, .68); // dash bulkhead
      var nb = e.raised ? e.noseY - 0.12 : .1;
      row(zF - 0.15, tw * 0.62, Math.max(.1, nb * 0.7), .48, .7, Math.max(.52, e.noseY + .1), Math.max(.56, e.noseY + .14));
      row(zF + 0.25, tw * 0.45, nb, nb + 0.18, .75, e.noseY + 0.08, e.noseY + 0.1);
      row(noseTip - 0.08, tw * 0.3, nb + 0.02, nb + 0.12, .8, e.noseY, e.noseY + 0.02);
      row(noseTip, tw * 0.16, nb + 0.05, nb + 0.1, .8, e.noseY - 0.04, e.noseY - 0.03);
      if (y < 1968) { rows.forEach(function (r) { if (r[0] < cz - 0.4) { r[5] = Math.min(r[5], .5); r[6] = Math.min(r[6], .52); } }); }
    }
    var zMin = rows[0][0], zMax = rows[rows.length - 1][0], Lz = zMax - zMin;
    var tab = rows.map(function (r) { return [(r[0] - zMin) / Lz, r[1], r[2], r[3], r[4], r[5], r[6]]; });
    var prof = RX.profile(tab);
    var Pt = function (t) { var r = prof(t); return { hw: r[0], yb: r[1], belt: r[2], x5: r[3], y5: r[4], y6: r[5] }; };
    var lo = RX.loft(Lz, Pt, { stations: 70 });
    var tub = new THREE.Mesh(lo.geo, paint); tub.position.z = (zMin + zMax) / 2; rig.body.add(tub);
    var Pz = function (z) { return Pt((z - zMin) / Lz); };
    // ---- sidepods ----
    if (e.pods) {
      var podLen = e.pods === 2 ? wb * 0.62 : e.pods === 3 ? wb * 0.6 : wb * 0.45;
      var podZ0 = zR + 0.45, podZ1 = podZ0 + podLen;
      var podH = e.pods === 3 ? 0.62 : e.pods === 2 ? 0.5 : 0.55;
      var podW = (e.track / 2 - e.twF / 2 - tw) * (e.pods === 2 ? 0.95 : 0.8);
      if (y >= 1998 && y < 2017) podW *= 0.85;
      var ptab = [[0, .45, .08, .2, .7, .28, .28], [0.25, .9, .06, podH * 0.6, .7, podH * 0.8, podH * 0.82], [0.7, 1, .05, podH * 0.75, .75, podH, podH * 0.98], [0.92, 1, .06, podH * 0.7, .8, podH * 0.94, podH * 0.9], [1, .9, .08, podH * 0.6, .8, podH * 0.8, podH * 0.75]];
      if (e.pods === 3) ptab[2][2] = 0.18; // undercut
      var pprof = RX.profile(ptab);
      var Pp = function (t) { var r = pprof(t); return { hw: r[0] * podW / 2, yb: r[1], belt: r[2], x5: r[3], y5: r[4], y6: r[5] }; };
      var plo = RX.loft(podLen, Pp, { stations: 30 });
      [-1, 1].forEach(function (s) {
        var pod = new THREE.Mesh(plo.geo, paint); pod.position.set(s * (tw + podW / 2 - 0.04), 0, (podZ0 + podZ1) / 2); rig.body.add(pod);
        // radiator inlet
        box(podW * 0.8, podH * 0.55, 0.02, M.mesh, s * (tw + podW / 2 - 0.04), podH * 0.55, podZ1 + 0.005, rig.body);
      });
      // floor
      box(e.track * 0.82, 0.02, podLen + 0.4, M.carbon, 0, 0.045, (podZ0 + podZ1) / 2 - 0.1, rig.body);
    } else {
      box(tw * 2, 0.02, wb * 0.8, M.black, 0, 0.05, 0, rig.body);
    }
    // ---- front engine details ----
    if (frontEngine) {
      var grille = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), M.mesh); grille.position.set(0, 0.42, noseTip + 0.005); grille.scale.set(1, 0.7, 1); rig.body.add(grille);
      [-1, 1].forEach(function (s) { for (var p = 0; p < 4; p++) { RX.rod(new V3(s * 0.38, 0.45, zF - 0.3 - p * 0.12), new V3(s * 0.46, 0.3, zR + 0.3 - p * 0.05), 0.025, M.exhaust, rig.body); } });
      var ws = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), M.clearGlass); ws.position.set(0, .9, cz + 0.6); ws.rotation.x = -0.4; rig.body.add(ws);
    }
    // ---- exposed engine (1960s) ----
    if (e.engine === 'open') {
      var eng = box(0.42, 0.28, 0.6, M.engine, 0, 0.42, zR + 0.45, rig.body);
      [-1, 1].forEach(function (s) {
        for (var p = 0; p < 4; p++) {
          var pipe = RX.cyl(0.022, 0.03, 0.55, M.exhaust, 8, rig.body); pipe.position.set(s * 0.18, 0.62, zR + 0.25 + p * 0.12); pipe.rotation.x = 0.25;
        }
        RX.rod(new V3(s * 0.25, 0.4, zR + 0.4), new V3(s * 0.2, 0.32, tail - 0.25), 0.03, M.exhaust, rig.body);
      });
      rig.exhausts = [new V3(0.2, 0.32, tail - 0.25), new V3(-0.2, 0.32, tail - 0.25)];
    }
    // ---- wings ----
    var wingMat = e.wings >= 2 ? M.carbon : paint;
    if (e.wings === 3 && y < 1970) {
      // 1968-69 high strut wings
      var hw2 = new THREE.Group(); hw2.position.set(0, 1.35, zR + 0.05); rig.body.add(hw2);
      box(1.1, 0.025, 0.35, paint, 0, 0, 0, hw2).rotation.x = -0.2;
      [-1, 1].forEach(function (s) { RX.rod(new V3(s * 0.35, -1.0, 0), new V3(s * 0.3, 0, 0), 0.02, M.steel, hw2); });
      rig.rearWing = hw2;
    } else if (e.wings) {
      var rwSpan = y < 1983 ? 1.05 : y < 1998 ? 1.0 : y < 2009 ? 0.98 : y < 2017 ? 0.75 : 0.95;
      if (indy) rwSpan = 0.95; if (fe && y >= 2018) rwSpan = 1.15;
      var rwY = y < 1983 ? 0.92 : (y < 2009 ? 0.86 : 0.92), rwZ = tail + (y < 1983 ? 0.2 : 0.15);
      if (fe && y >= 2018) { rwY = 0.72; rwZ = tail + 0.35; }
      var rw = new THREE.Group(); rw.position.set(0, rwY, rwZ); rig.body.add(rw);
      var main = box(rwSpan, 0.03, 0.34, wingMat, 0, 0, 0, rw); main.rotation.x = -0.15;
      var flapPivot = new THREE.Group(); flapPivot.position.set(0, 0.07, 0.1); rw.add(flapPivot);
      var flap = box(rwSpan, 0.02, 0.2, wingMat, 0, 0, -0.1, flapPivot); flap.rotation.x = -0.6;
      flapPivot.userData.dyn = true; rig.drs = flapPivot;
      if (y >= 2022) { main.position.y = -0.04; }
      [-1, 1].forEach(function (s) {
        var ep = box(0.015, 0.42, 0.6, wingMat, s * rwSpan / 2, -0.06, 0, rw);
        var bm = box(0.02, 0.1, 0.25, M.carbon, s * rwSpan * 0.3, -0.35, 0.05, rw);
      });
      // central pylon
      box(0.03, rwY - 0.3, 0.12, M.carbon, 0, -(rwY - 0.3) / 2, 0.1, rw);
      if (y >= 2017 && y < 2022 && sport === 'f1') { var tw2 = box(0.5, 0.015, 0.1, M.carbon, 0, -0.18, 0.4, rw); }
      // front wing
      var fwSpan = y < 1983 ? 1.25 : y < 1998 ? 1.45 : y < 2009 ? 1.35 : 1.75;
      if (indy) fwSpan = 1.5;
      if (y >= 2017) fwSpan = 1.9;
      var fw = new THREE.Group(); fw.position.set(0, 0.11, noseTip - 0.15); rig.body.add(fw);
      if (y < 1983 && !indy) {
        // nose-mounted fins either side
        [-1, 1].forEach(function (s) { var fin = box(0.4, 0.02, 0.3, paint, s * 0.35, 0.12, 0, fw); fin.rotation.z = s * 0.08; });
      } else {
        var els = y >= 2009 ? 4 : 2;
        for (var k = 0; k < els; k++) { var el = box(fwSpan * (1 - k * 0.06), 0.015, 0.22 - k * 0.03, wingMat, 0, k * 0.035, -k * 0.12, fw); el.rotation.x = -0.1 - k * 0.15; }
        [-1, 1].forEach(function (s) { box(0.015, 0.22, 0.5, wingMat, s * fwSpan / 2, 0.06, -0.12, fw); });
        if (e.raised) [-1, 1].forEach(function (s) { box(0.015, e.noseY - 0.12, 0.2, M.carbon, s * 0.12, (e.noseY - 0.12) / 2, 0.05, fw); });
      }
      if (e.winglets) [-1, 1].forEach(function (s) { box(0.25, 0.015, 0.15, M.carbon, s * 0.55, 0.62, zR + 0.9, rig.body); box(0.015, 0.4, 0.5, M.carbon, s * 0.48, 0.35, zF - 0.55, rig.body); });
    }
    // FE fenders / wheel fairings
    if (e.fend) {
      [-1, 1].forEach(function (s) {
        var fender = new THREE.Mesh(new THREE.CylinderGeometry(e.rF + 0.06, e.rF + 0.06, e.twF + 0.04, 18, 1, true, -Math.PI * 0.2, Math.PI * 0.9), paint);
        fender.rotation.z = Math.PI / 2; fender.position.set(s * e.track / 2, e.rF, zF); rig.body.add(fender);
        if (e.fend === 1) { var rf = new THREE.Mesh(new THREE.CylinderGeometry(e.rR + 0.07, e.rR + 0.07, e.twR + 0.06, 18, 1, true, Math.PI * 0.6, Math.PI * 0.9), paint); rf.rotation.z = Math.PI / 2; rf.position.set(s * e.track / 2, e.rR, zR); rig.body.add(rf); }
      });
    }
    // Indy rear wheel guards
    if (e.pods2) [-1, 1].forEach(function (s) { box(0.35, 0.3, 0.25, paint, s * e.track / 2, 0.25, zR - e.rR - 0.15, rig.body); });
    // halo / aeroscreen
    if (e.halo) {
      var hy = 0.86;
      var halo = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.022, 8, 24, Math.PI), M.carbon);
      halo.rotation.x = -Math.PI / 2 + 0.12; halo.position.set(0, hy, cz - 0.05); halo.rotation.z = 0; rig.body.add(halo);
      halo.rotation.set(-Math.PI / 2 + 0.1, 0, Math.PI);
      halo.position.set(0, hy - 0.04, cz - 0.08);
      RX.rod(new V3(0, hy - 0.02, cz + 0.27), new V3(0, 0.62, cz + 0.6), 0.022, M.carbon, rig.body);
      [-1, 1].forEach(function (s) { RX.rod(new V3(s * 0.34, hy - 0.06, cz - 0.08), new V3(s * 0.3, 0.55, cz - 0.35), 0.02, M.carbon, rig.body); });
      if (e.halo === 2) {
        var scr = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.32, 20, 1, true, -Math.PI * 0.6, Math.PI * 1.2), M.clearGlass);
        scr.position.set(0, hy + 0.02, cz - 0.05); rig.body.add(scr);
      }
    }
    // roll hoop / airbox inlet
    if (e.airbox && !frontEngine) {
      var inlet = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), M.black); inlet.position.set(0, (y >= 2009 ? .9 : .95) * 0.93, cz - 0.42); inlet.scale.set(1, 0.9, 1); rig.body.add(inlet);
      if (y >= 1971 && y < 1980) { var ab = box(0.32, 0.3, 0.55, paint, 0, 1.0, cz - 0.6, rig.body); }
    }
    // mirrors
    [-1, 1].forEach(function (s) {
      var mg = new THREE.Group(); mg.position.set(s * (tw + 0.18), 0.68, cz + 0.4); rig.body.add(mg);
      box(0.13, 0.06, 0.04, paint, 0, 0, 0, mg);
      var mface = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.05), rig.sideMirrorMat || (rig.sideMirrorMat = new THREE.MeshBasicMaterial({ color: 0x8090a0 }))); mface.position.z = -0.0215; mface.rotation.y = Math.PI; mg.add(mface);
      RX.rod(new V3(0, -0.02, 0.02), new V3(-s * 0.15, -0.12, 0.1), 0.01, M.carbon, mg);
    });
    // number decal on nose & engine cover
    if (cus.numStyle !== 'none') {
      var nz = frontEngine ? noseTip - 0.6 : zF - 0.1, pn = Pz(nz);
      var d = RX.numberDecal(cus, 0.26, 0.26); d.position.set(0, pn.y6 + 0.01, nz); d.rotation.x = -Math.PI / 2; rig.body.add(d);
      var ez = cz - 0.75, pe = Pz(ez);
      [-1, 1].forEach(function (s) { var d2 = RX.numberDecal(cus, 0.25, 0.25); d2.position.set(s * (pe.hw + 0.005), (pe.belt + pe.y5) / 2, ez); d2.rotation.y = s * Math.PI / 2; rig.body.add(d2); });
    }
    // rain light & tail lights
    var tailMat = new THREE.MeshStandardMaterial({ color: 0x440000, emissive: 0xff1111, emissiveIntensity: 0.35 });
    rig.tailMat = tailMat;
    box(0.08, 0.06, 0.02, tailMat, 0, 0.32, tail - 0.01, rig.body);
    rig.headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.0 });
    // exhausts
    if (!rig.exhausts) {
      rig.exhausts = y >= 2014 && !fe ? [new V3(0, 0.42, tail - 0.05)] : fe ? [] : [new V3(0.16, 0.35, tail - 0.02), new V3(-0.16, 0.35, tail - 0.02)];
      rig.exhausts.forEach(function (p) { var pipe = RX.cyl(0.045, 0.05, 0.18, M.exhaust, 10, rig.body); pipe.rotation.x = Math.PI / 2 - 0.15; pipe.position.copy(p); });
    }
    // fan car
    if (fan) {
      var fanG = new THREE.Group(); fanG.position.set(0, 0.42, tail + 0.05); fanG.userData.dyn = true; rig.body.add(fanG);
      var fd = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 20), M.fan); fd.rotation.x = Math.PI / 2; fanG.add(fd);
      for (var bl = 0; bl < 6; bl++) { var bld = box(0.05, 0.25, 0.02, M.alu, 0, 0, -0.03, fanG); bld.rotation.z = bl / 6 * Math.PI * 2; bld.translateY(0.12); }
      rig.fan = fanG;
    }
    if (turbine) { var tb = box(0.5, 0.35, 0.9, M.alu, 0.0, 0.55, zR + 0.5, rig.body); }
    // ---- driver ----
    var drv = RX.buildDriver(cus, { recline: frontEngine || y < 1968 ? 0.25 : y < 1990 ? 0.6 : 0.85, vintage: y < 1955 });
    var seatY = frontEngine ? 0.3 : 0.08;
    drv.position.set(0, seatY, cz - 0.15); rig.body.add(drv); rig.driver = drv;
    var swY = frontEngine ? 0.85 : y < 1990 ? 0.56 : 0.5;
    var headY = seatY + drv.userData.head.position.y;
    RX.buildCockpit(rig, car, cus, {
      kind: frontEngine || y < 1968 ? 'open' : 'formula', seatX: 0, seatY: seatY, seatZ: cz - 0.15, eyeY: headY + 0.1, dashZ: cz + 0.5, hw: tw, floorY: 0.06,
      red: RX.carSpec(car, cus).red, wheelY: swY, wheelZ: cz + (frontEngine ? 0.35 : 0.42), wheelTilt: frontEngine ? -0.5 : -0.25, colLen: 0.25,
      gearType: RX.gearTypeFor(car, cus), leverX: -0.24, leverY: frontEngine ? 0.45 : 0.3, leverZ: cz + 0.05, pedals: false
    });
    rig.eye = new V3(0, headY + 0.06, cz - 0.15 + drv.userData.head.position.z + 0.0); rig.lookPitch = frontEngine || y < 1968 ? 0.14 : 0.3;
    rig.hood = new V3(0, 1.15, cz - 0.6);
    rig.bumper = new V3(0, 0.45, noseTip - 0.4);
    // ---- wheels + suspension arms ----
    var dims = { L: L, W: e.track + e.twR, wb: wb, zF: zF, zR: zR, rF: e.rF, rR: e.rR, twF: e.twF, twR: e.twR, trackF: e.track, trackR: e.track - (y < 1983 ? 0 : 0.04) };
    var rim = cus.rimStyle !== 'auto' ? cus.rimStyle : (frontEngine || y < 1960 ? 'wire' : y < 1968 ? 'spoke7' : y < 1983 ? 'split' : y < 2022 ? 'monoblock' : 'aero');
    var extra = six ? [zF - 0.42] : null;
    if (six) { dims.rF = 0.22; dims.twF = 0.2; dims.zF = zF + 0.1; }
    addWheels(rig, dims, cus, rim, { profile: e.profile || (y < 1968 ? 0.55 : 0.42), extraFront: extra });
    if (six) rig.wheels.forEach(function (w) { if (w.front) { w.r = 0.22; } });
    rig.arms = [];
    rig.wheels.forEach(function (w) {
      var inZ = w.z, ax = Math.sign(w.x) * (tw * 0.9);
      [[0.18, -0.25], [0.18, 0.25], [0.42, -0.2], [0.42, 0.15]].forEach(function (a, i) {
        var mesh = RX.cyl(0.012, 0.012, 1, M.carbon, 5); mesh.userData.dyn = true; rig.root.add(mesh);
        rig.arms.push({ mesh: mesh, w: w, anchor: new V3(ax, a[0], inZ + a[1]), hubY: i < 2 ? -0.35 : 0.35 });
      });
    });
    rig.isOpen = true;
    return dims;
  }

  // ========== KART ==========
  function buildKart(car, cus, rig) {
    var M = RX.mats(), superk = car.hp > 60;
    var liv = RX.drawLivery(cus, null, { noSponsors: true });
    var paint = RX.paintMaterial(cus, liv.tex); rig.livery = liv;
    var wb = superk ? 1.15 : 1.05, track = superk ? 1.2 : 1.1;
    var frame = M.chrome;
    [-1, 1].forEach(function (s) {
      RX.rod(new V3(s * 0.25, 0.08, wb / 2 + 0.1), new V3(s * 0.32, 0.08, -wb / 2 - 0.1), 0.016, frame, rig.body);
      RX.rod(new V3(s * 0.25, 0.08, wb / 2 + 0.1), new V3(s * 0.45, 0.08, wb / 2), 0.016, frame, rig.body);
    });
    RX.rod(new V3(-0.25, 0.08, wb / 2 + 0.1), new V3(0.25, 0.08, wb / 2 + 0.1), 0.016, frame, rig.body);
    RX.rod(new V3(-0.6, 0.12, -wb / 2), new V3(0.6, 0.12, -wb / 2), 0.02, M.steel, rig.body); // rear axle
    box(0.6, 0.01, 0.9, M.alu, 0, 0.06, 0.05, rig.body); // floor tray
    // nose cone & front panel
    var nose = box(0.9, 0.1, 0.3, paint, 0, 0.12, wb / 2 + 0.35, rig.body);
    var panel = box(0.3, 0.32, 0.03, paint, 0, 0.28, wb / 2 - 0.05, rig.body); panel.rotation.x = -0.25;
    [-1, 1].forEach(function (s) {
      var pod = box(0.2, 0.12, 0.65, paint, s * 0.52, 0.14, -0.05, rig.body);
      box(0.18, 0.06, 0.5, paint, s * 0.52, 0.22, -0.05, rig.body);
    });
    var rear = box(1.25, 0.12, 0.12, paint, 0, 0.16, -wb / 2 - 0.3, rig.body);
    if (superk) { box(1.1, 0.25, 1.3, paint, 0, 0.25, -0.05, rig.body).scale.set(1, 0.6, 1); box(0.7, 0.02, 0.25, M.carbon, 0, 0.5, -wb / 2 - 0.25, rig.body); }
    // seat, engine
    var seat = box(0.38, 0.4, 0.38, M.seat, 0, 0.3, -0.25, rig.body); seat.rotation.x = -0.3;
    var eng = box(0.22, 0.28, 0.25, M.engine, 0.38, 0.28, -0.3, rig.body);
    var cyl = RX.cyl(0.08, 0.08, 0.15, M.alu, 10, rig.body); cyl.position.set(0.38, 0.48, -0.3);
    var exh = RX.cyl(0.04, 0.05, 0.5, M.exhaust, 8, rig.body); exh.rotation.x = Math.PI / 2; exh.position.set(0.3, 0.3, -0.6);
    rig.exhausts = [new V3(0.3, 0.3, -0.86)];
    if (car.engine !== 'E') { var air = RX.cyl(0.06, 0.06, 0.2, M.plastic, 10, rig.body); air.position.set(0.1, 0.3, -0.05); air.rotation.z = Math.PI / 2; }
    var num = RX.numberDecal(cus, 0.2, 0.2); num.position.set(0, 0.32, wb / 2 - 0.03); num.rotation.x = -0.25; rig.body.add(num);
    // driver sits up
    var drv = RX.buildDriver(cus, { recline: 0.15, legs: true });
    drv.position.set(0, 0.16, -0.25); rig.body.add(drv); rig.driver = drv;
    RX.buildCockpit(rig, car, cus, { kind: 'kart', seatX: 0, seatY: 0.16, seatZ: -0.25, eyeY: 0.95, dashZ: 0.3, hw: 0.4, floorY: 0.06, red: RX.carSpec(car, cus).red,
      wheelY: 0.52, wheelZ: 0.18, wheelTilt: -0.9, colLen: 0.1, gearType: RX.gearTypeFor(car, cus), leverX: -0.22, leverY: 0.2, leverZ: 0.0, pedals: false });
    RX.rod(new V3(0, 0.1, 0.45), new V3(0, 0.5, 0.17), 0.012, M.steel, rig.body);
    rig.eye = new V3(0, 0.95, -0.2); rig.lookPitch = 0.22; rig.hood = new V3(0, 1.3, -0.6); rig.bumper = new V3(0, 0.3, wb / 2 + 0.4);

    var dims = { L: 1.85, W: 1.4, wb: wb, zF: wb / 2, zR: -wb / 2, rF: 0.13, rR: 0.14, twF: 0.13, twR: 0.2, trackF: track, trackR: track + 0.1 };
    addWheels(rig, dims, cus, cus.rimStyle !== 'auto' ? cus.rimStyle : 'kart', { profile: 0.45 });
    rig.tailMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff0000, emissiveIntensity: 0 });
    rig.headMat = rig.tailMat;
    return dims;
  }

  // ========== SPRINT CAR / MIDGET ==========
  function buildSprint(car, cus, rig) {
    var M = RX.mats(), winged = car.body === 'sprint' && !/Non-Wing|Micro/.test(car.name) || /Micro/.test(car.name);
    var midget = car.body === 'midget';
    var liv = RX.drawLivery(cus, null, { noSponsors: false, sponsorU: 0.3, sponsorU2: 0.7, sponsorA: 0.55 });
    var paint = RX.paintMaterial(cus, liv.tex); rig.livery = liv;
    var wb = midget ? 2.0 : 2.15, track = midget ? 1.45 : 1.55;
    // body: hood + cockpit + tail tank
    var tab = [[0, .3, .3, .4, .7, .55, .6], [0.12, .4, .28, .45, .7, .66, .7], [0.3, .42, .26, .45, .7, .66, .7], [0.42, .4, .26, .48, .6, .6, .55], [0.62, .36, .26, .48, .7, .62, .66], [0.9, .28, .3, .46, .7, .56, .58], [1, .22, .32, .42, .7, .48, .5]];
    var prof = RX.profile(tab), L = 3.0;
    var lo = RX.loft(L, function (t) { var r = prof(t); return { hw: r[0], yb: r[1], belt: r[2], x5: r[3], y5: r[4], y6: r[5] }; }, { stations: 40 });
    var b = new THREE.Mesh(lo.geo, paint); b.position.z = -0.1; rig.body.add(b);
    // nerf bars, cage
    [-1, 1].forEach(function (s) {
      RX.rod(new V3(s * 0.45, 0.3, wb / 2 - 0.3), new V3(s * 0.55, 0.3, -wb / 2 + 0.3), 0.022, M.chrome, rig.body);
      RX.rod(new V3(s * 0.28, 0.45, -0.25), new V3(s * 0.26, 1.05, -0.2), 0.024, M.cage, rig.body);
      RX.rod(new V3(s * 0.28, 0.45, 0.45), new V3(s * 0.24, 1.0, 0.25), 0.024, M.cage, rig.body);
      RX.rod(new V3(s * 0.26, 1.05, -0.2), new V3(s * 0.24, 1.0, 0.25), 0.024, M.cage, rig.body);
    });
    RX.rod(new V3(-0.26, 1.05, -0.2), new V3(0.26, 1.05, -0.2), 0.024, M.cage, rig.body);
    // front torsion tube + axle
    RX.rod(new V3(-track / 2, 0.38, wb / 2), new V3(track / 2, 0.38, wb / 2), 0.03, M.chrome, rig.body);
    RX.rod(new V3(-track / 2, 0.4, -wb / 2), new V3(track / 2, 0.4, -wb / 2), 0.035, M.steel, rig.body);
    // headers
    for (var h = 0; h < 4; h++) { var p = RX.cyl(0.03, 0.035, 0.6, M.chrome, 8, rig.body); p.position.set(-0.32, 0.4, 0.9 - h * 0.12); p.rotation.z = 1.2; }
    rig.exhausts = [new V3(-0.6, 0.3, 0.6)];
    if (winged) {
      var tw = new THREE.Group(); tw.position.set(0, 1.35, -0.05); rig.body.add(tw);
      box(1.25, 0.02, 1.55, paint, 0, 0, 0, tw).rotation.x = -0.12;
      [-1, 1].forEach(function (s) {
        var side = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.9, 1.7), new THREE.MeshStandardMaterial({ map: liv.tex, roughness: 0.4 }));
        side.position.set(s * 0.63, 0.1, -0.05); tw.add(side);
        RX.rod(new V3(s * 0.3, -0.3, 0.4), new V3(s * 0.2, -0.95, 0.4), 0.02, M.cage, tw);
      });
      rig.rearWing = tw;
      var fwg = box(0.75, 0.02, 0.45, paint, 0, 0.75, wb / 2 + 0.25, rig.body); fwg.rotation.x = -0.08;
      [-1, 1].forEach(function (s) { box(0.02, 0.18, 0.5, paint, s * 0.37, 0.7, wb / 2 + 0.25, rig.body); });
    }
    if (cus.numStyle !== 'none') {
      var num = RX.numberDecal(cus, 0.6, 0.6);
      if (winged) { [-1, 1].forEach(function (s) { var n = num.clone(); n.position.set(s * 0.645, 1.4, -0.05); n.rotation.y = s * Math.PI / 2; rig.body.add(n); }); }
      else [-1, 1].forEach(function (s) { var n = num.clone(); n.scale.setScalar(0.5); n.position.set(s * 0.43, 0.42, -0.9); n.rotation.y = s * Math.PI / 2; rig.body.add(n); });
    }
    var drv = RX.buildDriver(cus, { recline: 0.1 }); drv.position.set(0, 0.32, -0.05); rig.body.add(drv); rig.driver = drv;
    RX.buildCockpit(rig, car, cus, { kind: 'sprint', seatX: 0, seatY: 0.32, seatZ: -0.05, eyeY: 1.02, dashZ: 0.5, hw: 0.35, floorY: 0.28, red: RX.carSpec(car, cus).red,
      wheelY: 0.8, wheelZ: 0.35, wheelTilt: -0.3, colLen: 0.3, gearType: 'none', pedals: false });
    rig.eye = new V3(0, 0.88, -0.08); rig.lookPitch = 0.1; rig.hood = new V3(0, 1.4, -0.5); rig.bumper = new V3(0, 0.6, wb / 2 + 0.6);
    var dims = { L: 3.6, W: track + 0.45, wb: wb, zF: wb / 2, zR: -wb / 2, rF: 0.33, rR: 0.42, twF: 0.22, twR: 0.4, trackF: track, trackR: track + 0.12 };
    addWheels(rig, dims, cus, cus.rimStyle !== 'auto' ? cus.rimStyle : 'beadlock', { profile: 0.5, stagger: true });
    rig.tailMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff0000, emissiveIntensity: 0 }); rig.headMat = rig.tailMat;
    return dims;
  }

  // ========== DRAGSTER ==========
  function buildDragster(car, cus, rig) {
    var M = RX.mats(), front = car.year < 1971;
    var liv = RX.drawLivery(cus, null, { noSponsors: false, sponsorU: 0.3, sponsorU2: 0.55, sponsorA: 0.5 });
    var paint = RX.paintMaterial(cus, liv.tex); rig.livery = liv;
    var wb = front ? 4.0 : 7.6, zF = wb / 2, zR = -wb / 2;
    // chassis rails + skin
    [-1, 1].forEach(function (s) { RX.rod(new V3(s * 0.2, 0.18, zF), new V3(s * 0.35, 0.3, zR + 0.2), 0.025, M.chrome, rig.body); });
    var tab = [[0, .32, .2, .45, .7, .55, .6], [0.1, .3, .18, .4, .7, .5, .52], [0.5, .18, .14, .28, .7, .34, .36], [0.9, .12, .12, .2, .7, .24, .25], [1, .06, .12, .16, .7, .18, .18]];
    var prof = RX.profile(tab);
    var lo = RX.loft(wb + 0.6, function (t) { var r = prof(t); return { hw: r[0], yb: r[1], belt: r[2], x5: r[3], y5: r[4], y6: r[5] }; }, { stations: 50 });
    var sk = new THREE.Mesh(lo.geo, paint); sk.position.z = 0.3; rig.body.add(sk);
    // engine + blower + injector scoop
    var ez = front ? zF - 0.9 : zR + 0.9;
    box(0.45, 0.35, 0.8, M.engine, 0, 0.45, ez, rig.body);
    box(0.32, 0.2, 0.55, M.alu, 0, 0.72, ez, rig.body);
    var hat = box(0.3, 0.28, 0.3, M.chrome, 0, 0.95, ez + 0.1, rig.body); hat.rotation.x = 0.1;
    var butterfly = box(0.24, 0.16, 0.01, M.black, 0, 1.0, ez + 0.26, rig.body);
    rig.exhausts = [];
    [-1, 1].forEach(function (s) {
      for (var h = 0; h < 8; h++) {
        var zz = ez - 0.32 + h * 0.09, pipe = RX.cyl(0.03, 0.04, 0.4, M.chrome, 8, rig.body);
        pipe.position.set(s * 0.32, 0.6, zz); pipe.rotation.z = -s * 1.0; pipe.rotation.x = -0.6;
        if (h % 2 === 0) rig.exhausts.push(new V3(s * 0.48, 0.75, zz - 0.15));
      }
    });
    // cockpit cage
    var cz = front ? zR - 0.2 : ez + 1.2;
    var cage = new THREE.Group(); cage.position.z = cz; rig.body.add(cage);
    [-1, 1].forEach(function (s) { RX.rod(new V3(s * 0.25, 0.3, -0.3), new V3(s * 0.2, 1.0, -0.2), 0.02, M.cage, cage); RX.rod(new V3(s * 0.25, 0.3, 0.4), new V3(s * 0.2, 1.0, -0.2), 0.02, M.cage, cage); });
    if (!front && car.year > 2000) { var canopy = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.glass); canopy.scale.set(1, 0.9, 1.6); canopy.position.set(0, 0.52, 0.1); cage.add(canopy); }
    // rear wing on struts
    var rw = new THREE.Group(); rw.position.set(0, front ? 1.0 : 2.1, zR - (front ? 0.2 : 0.5)); rig.body.add(rw);
    var plane = box(front ? 0.8 : 1.5, 0.03, front ? 0.3 : 0.7, front ? paint : M.carbon, 0, 0, 0, rw); plane.rotation.x = -0.35;
    if (!front) {
      box(1.5, 0.03, 0.4, M.carbon, 0, 0.25, -0.2, rw).rotation.x = -0.6;
      [-1, 1].forEach(function (s) { box(0.02, 0.7, 1.0, paint, s * 0.75, 0.1, -0.1, rw); RX.rod(new V3(s * 0.4, -0.05, 0.1), new V3(s * 0.35, -1.6, 0.5), 0.025, M.steel, rw); });
      var fwg = box(0.8, 0.02, 0.25, M.carbon, 0, 0.3, zF + 0.3, rig.body); fwg.rotation.x = -0.15;
    }
    rig.rearWing = rw;
    // wheelie bar
    RX.rod(new V3(0, 0.3, zR - 0.4), new V3(0, 0.12, zR - 2.2), 0.025, M.chrome, rig.body);
    if (cus.numStyle !== 'none') [-1, 1].forEach(function (s) { var n = RX.numberDecal(cus, 0.3, 0.3); n.position.set(s * 0.33, 0.45, zF - 1.5); n.rotation.y = s * Math.PI / 2; rig.body.add(n); });
    addChute(rig, zR - 0.6, front ? 0.7 : 1.1);
    var drv = RX.buildDriver(cus, { recline: front ? 0.3 : 0.55 }); drv.position.set(0, 0.2, cz); rig.body.add(drv); rig.driver = drv;
    RX.buildCockpit(rig, car, cus, { kind: 'dragster', seatX: 0, seatY: 0.2, seatZ: cz, eyeY: 0.88, dashZ: cz + 0.6, hw: 0.3, floorY: 0.15, red: RX.carSpec(car, cus).red,
      wheelY: 0.62, wheelZ: cz + 0.42, wheelTilt: -0.4, colLen: 0.3, gearType: 'none', pedals: false });
    rig.eye = new V3(0, 0.88, cz + 0.08); rig.hood = new V3(0, 1.6, cz - 1.0); rig.bumper = new V3(0, 0.3, zF + 0.4);

    var dims = { L: wb + 1.6, W: 1.6, wb: wb, zF: zF, zR: zR, rF: front ? 0.3 : 0.23, rR: front ? 0.55 : 0.62, twF: 0.09, twR: 0.45, trackF: 0.9, trackR: 1.1 };
    addWheels(rig, dims, cus, cus.rimStyle !== 'auto' ? cus.rimStyle : 'dish', { profile: 0.55 });
    rig.wheels.forEach(function (w) { if (w.front) w.pivot.children[0].children.forEach(function () { }); });
    rig.tailMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff0000, emissiveIntensity: 0 }); rig.headMat = rig.tailMat;
    rig.isOpen = true;
    return dims;
  }

  // ========== PRE-WAR GRAND PRIX ==========
  function buildPrewar(car, cus, rig) {
    var M = RX.mats();
    var heavy = car.kg > 1150, midEngine = /Auto Union/.test(car.name), streamline = /Streamliner|57G|Bimotore/.test(car.name);
    var liv = RX.drawLivery(cus, null, { noSponsors: true });
    var paint = RX.paintMaterial(cus, liv.tex); rig.livery = liv;
    var L = heavy ? 4.4 : midEngine ? 4.0 : 3.8, wb = heavy ? 3.2 : 2.7;
    var hw = heavy ? 0.6 : 0.42;
    var tab = midEngine ?
      [[0, .2, .3, .45, .7, .55, .56], [.2, .8, .24, .55, .7, .78, .8], [.42, 1, .22, .55, .7, .86, .9], [.52, 1, .22, .56, .7, .72, .68], [.62, 1, .22, .58, .7, .74, .76], [.85, .85, .25, .52, .7, .62, .64], [1, .55, .3, .45, .7, .5, .5]] :
      [[0, .2, .35, .55, .7, .65, .66], [.15, .7, .3, .6, .7, .78, .8], [.3, .95, .27, .62, .7, .85, .9], [.38, 1, .26, .63, .7, .78, .75], [.48, 1, .26, .63, .7, .8, .82], [.56, 1, .26, .64, .7, .9, .95], [.9, .85, .28, .64, .7, .9, .95], [.99, .78, .3, .6, .7, .85, .9], [1, .7, .3, .55, .7, .8, .82]];
    var prof = RX.profile(tab);
    var lo = RX.loft(L, function (t) { var r = prof(t); return { hw: r[0] * hw, yb: r[1], belt: r[2], x5: r[3], y5: r[4], y6: r[5] }; }, { stations: 50 });
    var b = new THREE.Mesh(lo.geo, paint); rig.body.add(b);
    if (streamline) b.scale.set(1.5, 1.0, 1.05);
    var zt = function (t) { return (t - 0.5) * L; };
    if (!midEngine) {
      // upright radiator grille
      var g = box(hw * 1.4, 0.5, 0.04, M.chrome, 0, 0.62, zt(1) + 0.01, rig.body);
      box(hw * 1.2, 0.42, 0.01, M.mesh, 0, 0.62, zt(1) + 0.035, rig.body);
      // louvres + strap
      for (var lv = 0; lv < 8; lv++) [-1, 1].forEach(function (s) { box(0.005, 0.15, 0.03, M.black, s * hw * 0.98, 0.65, zt(0.72) + lv * 0.06, rig.body); });
      box(hw * 2.05, 0.02, 0.04, M.leather, 0, 0.92, zt(0.8), rig.body);
      // external exhaust
      RX.rod(new V3(hw * 0.95, 0.55, zt(0.75)), new V3(hw * 1.05, 0.4, zt(0.05)), 0.04, M.exhaust, rig.body);
      rig.exhausts = [new V3(hw * 1.05, 0.4, zt(0.05))];
    } else {
      rig.exhausts = [new V3(0.2, 0.55, zt(0.08)), new V3(-0.2, 0.55, zt(0.08))];
      for (var ex = 0; ex < 8; ex++) { var p = RX.cyl(0.025, 0.025, 0.2, M.exhaust, 6, rig.body); p.position.set((ex % 2 ? 1 : -1) * 0.3, 0.65, zt(0.2) + Math.floor(ex / 2) * 0.1); p.rotation.z = (ex % 2 ? -1 : 1) * 0.6; }
    }
    if (heavy) {
      // cycle wings / mudguards, running boards, headlamps, windscreen, spare
      [[wb / 2, .4], [-wb / 2, .42]].forEach(function (a) {
        [-1, 1].forEach(function (s) {
          var mg = new THREE.Mesh(new THREE.CylinderGeometry(a[1] + 0.06, a[1] + 0.06, 0.2, 16, 1, true, Math.PI * 0.95, Math.PI * 1.1), paint);
          mg.rotation.z = Math.PI / 2; mg.position.set(s * 0.72, a[1], a[0]); rig.body.add(mg);
        });
      });
      [-1, 1].forEach(function (s) {
        var lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.18, 14), M.chrome); lamp.rotation.x = Math.PI / 2; lamp.position.set(s * 0.38, 0.95, zt(0.98)); rig.body.add(lamp);
        var lens = new THREE.Mesh(new THREE.CircleGeometry(0.11, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2cc, emissiveIntensity: 0.4 })); lens.position.set(s * 0.38, 0.95, zt(0.98) + 0.091); rig.body.add(lens);
        box(0.25, 0.02, wb * 0.55, M.black, s * 0.62, 0.32, 0, rig.body);
      });
      var ws = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25), M.clearGlass); ws.position.set(0, 1.05, zt(0.5)); ws.rotation.x = -0.15; rig.body.add(ws);
    } else {
      var aero = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.1), M.clearGlass); aero.position.set(0, (midEngine ? 0.8 : 0.98), zt(midEngine ? 0.66 : 0.52)); aero.rotation.x = -0.5; rig.body.add(aero);
    }
    if (cus.numStyle !== 'none') [-1, 1].forEach(function (s) { var n = RX.numberDecal(Object.assign({}, cus, { numStyle: 'roundel' }), 0.32, 0.32); n.position.set(s * (hw * 0.98 + 0.01), 0.6, zt(midEngine ? 0.3 : 0.25)); n.rotation.y = s * Math.PI / 2; rig.body.add(n); });
    var seatZ = zt(midEngine ? 0.57 : heavy ? 0.42 : 0.43);
    var drv = RX.buildDriver(cus, { recline: 0.05, vintage: true }); drv.position.set(heavy ? 0.25 : 0, 0.3, seatZ); rig.body.add(drv); rig.driver = drv;
    RX.buildCockpit(rig, car, cus, { kind: 'prewar', seatX: heavy ? 0.25 : 0, seatY: 0.3, seatZ: seatZ, eyeY: 1.05, dashZ: seatZ + 0.62, hw: hw, floorY: 0.25, red: RX.carSpec(car, cus).red,
      wheelY: 0.82, wheelZ: seatZ + 0.42, wheelTilt: -0.6, colLen: 0.5, gearType: 'external', leverX: (heavy ? 0.25 : 0) - (hw + 0.06), leverY: 0.55, leverZ: seatZ + 0.15, pedals: false });
    rig.eye = new V3(heavy ? 0.25 : 0, 1.12, seatZ - 0.04); rig.lookPitch = 0.16; rig.hood = new V3(0, 1.4, seatZ - 0.5); rig.bumper = new V3(0, 0.6, zt(1) + 0.2);
    var r = heavy ? 0.42 : 0.4;
    var dims = { L: L, W: 1.6, wb: wb, zF: wb / 2, zR: -wb / 2, rF: r, rR: r + 0.02, twF: 0.14, twR: 0.16, trackF: heavy ? 1.42 : 1.32, trackR: heavy ? 1.42 : 1.32 };
    addWheels(rig, dims, cus, cus.rimStyle !== 'auto' ? cus.rimStyle : 'wire', { profile: 0.3 });
    rig.tailMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff0000, emissiveIntensity: 0 });
    rig.headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2cc, emissiveIntensity: 0.3 });
    rig.isOpen = true;
    return dims;
  }

  // ========== RALLY-RAID LORRY ==========
  function buildLorry(car, cus, rig) {
    var M = RX.mats();
    var liv = RX.drawLivery(cus, null, { noSponsors: false });
    var paint = RX.paintMaterial(cus, liv.tex); rig.livery = liv;
    var cab = box(2.4, 1.6, 1.9, paint, 0, 2.15, 2.0, rig.body);
    var ws = box(2.2, 0.75, 0.02, M.clearGlass, 0, 2.5, 2.96, rig.body); ws.rotation.x = -0.12;
    [-1, 1].forEach(function (s) { box(0.04, 0.6, 0.9, M.glass, s * 1.205, 2.5, 2.3, rig.body); });
    box(2.3, 0.35, 0.1, M.mesh, 0, 1.55, 2.98, rig.body);
    var hm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(cus.headColor), emissiveIntensity: 0.4 }); rig.headMat = hm;
    [-1, 1].forEach(function (s) { box(0.3, 0.15, 0.05, hm, s * 0.85, 1.35, 2.98, rig.body); });
    for (var l = 0; l < 6; l++) box(0.25, 0.12, 0.06, hm, -0.75 + l * 0.3, 3.0, 2.9, rig.body);
    box(2.5, 1.5, 3.6, M.plastic, 0, 2.05, -1.0, rig.body); // cargo box
    box(2.55, 0.15, 3.65, paint, 0, 2.85, -1.0, rig.body);
    box(1.0, 0.25, 6.4, M.black, 0, 1.1, 0.2, rig.body); // chassis
    var spare = RX.buildWheel(0.62, 0.45, 'steelie', cus, { noBrake: true, knobby: true }); spare.pivot.rotation.z = Math.PI / 2; spare.pivot.position.set(0, 3.05, -0.6); rig.body.add(spare.pivot);
    var stack = RX.cyl(0.08, 0.08, 1.4, M.chrome, 10, rig.body); stack.position.set(1.1, 2.8, 0.9);
    rig.exhausts = [new V3(1.1, 3.55, 0.9)];
    if (cus.numStyle !== 'none') [-1, 1].forEach(function (s) { var n = RX.numberDecal(cus, 0.6, 0.6); n.position.set(s * 1.21, 2.0, 1.9); n.rotation.y = s * Math.PI / 2; rig.body.add(n); });
    var drv = RX.buildDriver(cus, { recline: 0.05 }); drv.position.set(0.55, 1.75, 2.1); rig.body.add(drv); rig.driver = drv;
    RX.buildCockpit(rig, car, cus, { kind: 'lorry', seatX: 0.55, seatY: 1.75, seatZ: 2.1, eyeY: 2.55, dashZ: 2.75, hw: 1.15, floorY: 1.7, red: RX.carSpec(car, cus).red,
      wheelY: 2.2, wheelZ: 2.6, wheelTilt: -0.9, colLen: 0.3, gearType: 'seq', leverX: 0.2, leverY: 1.95, leverZ: 2.35, pedalZ: 2.9 });
    rig.eye = new V3(0.55, 2.55, 2.25); rig.hood = new V3(0, 3.4, 2.0); rig.bumper = new V3(0, 1.4, 3.1);

    var dims = { L: 7.0, W: 2.55, wb: 4.2, zF: 2.1, zR: -2.1, rF: 0.68, rR: 0.68, twF: 0.48, twR: 0.48, trackF: 2.05, trackR: 2.05 };
    addWheels(rig, dims, cus, 'steelie', { profile: 0.5, knobby: true });
    rig.tailMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff0000, emissiveIntensity: 0.3 });
    return dims;
  }

  // ========== top-level ==========
  RX.buildCar = function (car, cus, opts) {
    opts = opts || {};
    var rig = { root: new THREE.Group(), body: new THREE.Group(), interior: [], wheels: [], exhausts: null, night: opts.night, carRef: car };
    rig.root.add(rig.body);
    var b = car.body, dims;
    if (b === 'openwheel') dims = buildOpenWheel(car, cus, rig);
    else if (b === 'kart') dims = buildKart(car, cus, rig);
    else if (b === 'sprint' || b === 'midget') dims = buildSprint(car, cus, rig);
    else if (b === 'dragster') dims = buildDragster(car, cus, rig);
    else if (b === 'prewar') dims = buildPrewar(car, cus, rig);
    else if (b === 'lorry') dims = buildLorry(car, cus, rig);
    else dims = buildBodied(car, cus, rig);
    rig.dims = dims;
    rig.exhausts = rig.exhausts || [];
    if (rig.eye) { rig.eye.y += (cus.seatHeight || 0) * 0.01; rig.eye.z += (cus.seatFore || 0) * 0.01; }
    // stance: ride height and static camber are visible on the car
    rig.rideOffset = (cus.rideHeight || 0) * 0.01;
    rig.camF = (cus.camberF == null ? -2.5 : cus.camberF) * Math.PI / 180 * 0.8;
    rig.camR = (cus.camberR == null ? -1.5 : cus.camberR) * Math.PI / 180 * 0.8;
    // exhaust flame sprites
    var M = RX.mats();
    rig.flames = rig.exhausts.map(function (p) {
      var fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(cus.flameColor || '#66aaff'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      var f = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 8, 1, true), fm);
      f.rotation.x = -Math.PI / 2; f.position.copy(p); f.position.z -= 0.2; f.userData.dyn = true; rig.body.add(f);
      return f;
    });
    // underglow
    if (cus.underglow && cus.underglow !== 'none') {
      var ug = new THREE.Mesh(new THREE.PlaneGeometry(dims.W * 0.9, dims.L * 0.8), new THREE.MeshBasicMaterial({ color: cus.underglow, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      ug.rotation.x = -Math.PI / 2; ug.position.y = 0.03; ug.userData.dyn = true; rig.root.add(ug);
    }
    // dashboard display canvas
    var dc = RX.canvas(256, 128), dtx = new THREE.CanvasTexture(dc);
    rig.dash = { canvas: dc, ctx: dc.getContext('2d'), tex: dtx, last: 0 };
    var dmat = new THREE.MeshBasicMaterial({ map: dtx });
    if (rig.formulaScreen) { rig.formulaScreen.material = dmat; }
    else if (rig.dashPos) {
      var dp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), dmat); dp.position.copy(rig.dashPos); dp.rotation.set(0.35, Math.PI, 0); dp.userData.dyn = true; rig.body.add(dp);
    }
    // per-car brake disc material for glow
    rig.discMat = RX.mats().disc.clone();
    rig.wheels.forEach(function (w) { w.pivot.traverse(function (m) { if (m.isMesh && m.material === RX.mats().disc) m.material = rig.discMat; }); });
    rig.driverHead = rig.driver ? rig.driver.userData.head : null;
    if (rig.driver) {
      rig.driver.userData.dyn = true;
      // merge the static parts of the driver (torso, legs) and of the helmet; arms stay animated
      rig.driver.userData.arms.forEach(function (a) { a.up.userData.dyn = a.lo.userData.dyn = a.hand.userData.dyn = true; });
      rig.driverHead.userData.dyn = true;
      if (!opts.noMerge) { RX.mergeStatic(rig.driver); RX.mergeStatic(rig.driverHead); }
    }
    // merge static parts for performance (body and each wheel's spinning assembly)
    if (!opts.noMerge) {
      RX.mergeStatic(rig.body);
      rig.wheels.forEach(function (w) { RX.mergeStatic(w.spin); });
    }
    rig.body.traverse(function (m) { if (m.isMesh && !m.material.transparent) m.castShadow = true; });
    if (RX.carEnv) rig.root.traverse(function (m) { if (m.isMesh && m.material && m.material.isMeshStandardMaterial && m.material.envMap !== RX.carEnv) { m.material.envMap = RX.carEnv; m.material.needsUpdate = true; } });
    rig.root.userData.rig = rig;
    return rig;
  };

  // ---------- per-frame animation ----------
  var tmp = new V3(), tmp2 = new V3();
  RX.animateRig = function (rig, st, dt) {
    // st: speed (m/s, signed), steer (rad road-wheel), swAngle (rad steering wheel), pitch, roll, heave, brake, throttle, rpm01, flame, drs, lights, susp[]
    var d = rig.dims;
    rig.body.rotation.set(st.pitch || 0, 0, st.roll || 0);
    rig.body.position.y = (st.heave || 0) + (rig.rideOffset || 0);
    rig.wheels.forEach(function (w, i) {
      var r = w.r;
      w.spin.rotation.x += (st.wheelSpeed != null ? (w.front ? st.wheelSpeedF : st.wheelSpeed) : st.speed) / r * dt;
      if (w.front) w.pivot.rotation.y = st.steer * (w.z > 0 ? 1 : 0.6);
      var s = st.susp ? st.susp[i % 4] : 0;
      w.pivot.position.y = w.baseY + (s || 0);
      w.pivot.rotation.z = -(w.front ? rig.camF : rig.camR) * Math.sign(w.x);
    });
    if (rig.steer) rig.steer.rotation.z = -st.swAngle;
    // hands on the wheel
    if (rig.driver && rig.steer) {
      var dr = rig.driver, R = rig.handsRadius * 0.95;
      var hands = [];
      rig.steer.updateMatrixWorld(true);
      dr.updateMatrixWorld(true);
      [-1, 1].forEach(function (s) {
        var a = s > 0 ? -0.15 : Math.PI + 0.15;
        tmp.set(Math.cos(a) * R, Math.sin(a) * R, -0.02);
        rig.steer.localToWorld(tmp); dr.worldToLocal(tmp);
        hands.push(tmp.clone());
      });
      // hands[0] = right hand (driver's right is the -x side); the cockpit may take it to the lever
      hands = RX.animateCockpit(rig, st, dt, hands);
      RX.poseArms(dr, hands);
      if (rig.driverHead) {
        rig.driverHead.rotation.y = -st.steer * 0.6;
        rig.driverHead.rotation.z = -(st.latG || 0) * 0.05;
      }
    }
    if (rig.drs) rig.drs.rotation.x = st.drs ? 0.5 : 0;
    if (rig.fan) rig.fan.rotation.z += (st.rpm01 || 0) * 60 * dt;
    if (rig.tailMat) rig.tailMat.emissiveIntensity = st.brake > 0.1 ? 2.4 : (st.lights ? 0.9 : 0.25);
    if (rig.headMat) rig.headMat.emissiveIntensity = st.lights ? 2.0 : 0.25;
    if (rig.discMat) rig.discMat.emissiveIntensity = Math.max(0, Math.min(1.5, (st.brakeHeat || 0)));
    rig.flames.forEach(function (f, i) {
      var on = st.flame > 0 && ((i + Math.floor(performance.now() / 40)) % 3 !== 0);
      f.material.opacity = on ? Math.min(1, st.flame) : 0;
      f.scale.set(1, on ? 0.6 + Math.random() * 0.9 : 1, 1);
    });
    if (rig.chute) {
      rig.chute.visible = !!st.chute;
      if (st.chute) { rig.chute.scale.setScalar(Math.min(1, rig.chute.scale.x + dt * 2)); rig.chute.rotation.z = Math.sin(performance.now() / 150) * 0.05; }
      else rig.chute.scale.setScalar(0.05);
    }
    if (rig.arms) {
      rig.body.updateMatrix();
      rig.arms.forEach(function (a) {
        tmp.copy(a.anchor).applyMatrix4(rig.body.matrix);
        tmp2.set(a.w.x * 0.92, a.w.pivot.position.y + a.hubY * a.w.r * 0.6, a.w.z);
        RX.placeLimb(a.mesh, tmp, tmp2);
      });
    }
  };

  // Dashboard / steering-wheel screen
  RX.drawDash = function (rig, info) {
    var D = rig.dash; if (!D) return;
    var g = D.ctx, W = 256, H = 128;
    g.fillStyle = '#05070a'; g.fillRect(0, 0, W, H);
    // shift lights
    var n = 15, lit = Math.round(info.rpm01 * n * 1.1 - 3);
    for (var i = 0; i < n; i++) {
      g.fillStyle = i < lit ? (i < 5 ? '#19e04a' : i < 10 ? '#ff2a2a' : '#3a6bff') : '#1a1d22';
      if (info.rpm01 > 0.97 && Math.floor(performance.now() / 80) % 2) g.fillStyle = '#3a6bff';
      g.beginPath(); g.arc(16 + i * 15.7, 12, 6, 0, 7); g.fill();
    }
    g.fillStyle = '#ffffff'; g.font = 'bold 64px Arial'; g.textAlign = 'center';
    g.fillText(info.gear, 128, 88);
    g.font = 'bold 26px Arial'; g.textAlign = 'left'; g.fillText(Math.round(info.kmh), 10, 70);
    g.font = '13px Arial'; g.fillStyle = '#8fa3b8'; g.fillText(info.units || 'km/h', 10, 88);
    g.textAlign = 'right'; g.fillStyle = '#ffffff'; g.font = 'bold 18px Arial'; g.fillText(info.lap || '', 248, 60);
    g.fillStyle = info.deltaCol || '#19e04a'; g.fillText(info.delta || '', 248, 84);
    g.fillStyle = '#8fa3b8'; g.font = '12px Arial'; g.fillText(info.extra || '', 248, 110);
    g.textAlign = 'left'; g.fillText(info.extra2 || '', 10, 110);
    D.tex.needsUpdate = true;
  };
})();
