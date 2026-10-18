/* Rock & Stone — first-person weapon and tool models. Guns are assembled from
   a small parametric spec (receiver, barrel, magazine, stock, sight) so each
   one is a handful of numbers rather than a pile of hand-placed boxes. */
(function (RS) {
  'use strict';
  var part;

  var GUN_META = 0x3a3d44, GUN_DARK = 0x24262b, GRIP = 0x2b2420, BRASS = 0xb08030;

  /* spec:
     { len, recH, recW, barLen, barR, barrels, mag:'box'|'drum'|'none', magLen,
       stock:0|1|2, grip, pump, sight:'iron'|'red'|'none', body, accent, chunky } */
  RS.buildGun = function (spec) {
    RS.initPrims();
    part = RS.part;
    var P = RS.PRIM, p = [];
    var body = spec.body === undefined ? GUN_META : spec.body;
    var accent = spec.accent === undefined ? 0xc8702a : spec.accent;
    var L = spec.len || 0.5, H = spec.recH || 0.1, W = spec.recW || 0.07;

    // receiver
    p.push(part(P.box, body, 0, 0, -L * 0.5, W, H, L));
    p.push(part(P.box, RS.shade(body, 0.75), 0, H * 0.52, -L * 0.52, W * 0.72, H * 0.22, L * 0.86));
    // ejection port / detail
    p.push(part(P.box, GUN_DARK, W * 0.52, H * 0.12, -L * 0.42, W * 0.14, H * 0.42, L * 0.22));
    p.push(part(P.box, accent, -W * 0.52, 0, -L * 0.3, W * 0.12, H * 0.5, L * 0.3));

    // barrel(s)
    var bl = spec.barLen || L * 0.8, br = spec.barR || 0.022;
    var n = spec.barrels || 1;
    if (n === 1) {
      p.push(part(P.cylLo, RS.shade(body, 0.8), 0, H * 0.06, -L - bl * 0.5, br * 2, bl, br * 2, Math.PI / 2, 0, 0));
      p.push(part(P.cylLo, GUN_DARK, 0, H * 0.06, -L - bl * 0.96, br * 2.6, bl * 0.14, br * 2.6, Math.PI / 2, 0, 0));
    } else if (n === 2) {
      for (var i = 0; i < 2; i++) {
        p.push(part(P.cylLo, RS.shade(body, 0.8), (i ? 1 : -1) * br * 2.1, H * 0.06, -L - bl * 0.5, br * 2, bl, br * 2, Math.PI / 2, 0, 0));
      }
    } else { // rotary cluster
      for (i = 0; i < n; i++) {
        var a = Math.PI * 2 * i / n;
        p.push(part(P.cylLo, RS.shade(body, 0.72), Math.cos(a) * br * 2.6, H * 0.06 + Math.sin(a) * br * 2.6,
          -L - bl * 0.5, br * 1.5, bl, br * 1.5, Math.PI / 2, 0, 0));
      }
      p.push(part(P.cylLo, RS.shade(body, 0.9), 0, H * 0.06, -L - bl * 0.08, br * 7, bl * 0.18, br * 7, Math.PI / 2, 0, 0));
    }

    // handguard / shroud
    if (spec.shroud !== false) {
      p.push(part(P.box, RS.shade(body, 0.62), 0, H * 0.04, -L - bl * 0.3, W * 0.78, H * 0.6, bl * 0.56));
      for (i = 0; i < 3; i++) {
        p.push(part(P.box, GUN_DARK, 0, H * 0.35, -L - bl * (0.12 + i * 0.18), W * 0.8, H * 0.08, bl * 0.07));
      }
    }

    // magazine
    if (spec.mag === 'drum') {
      p.push(part(P.cylLo, RS.shade(body, 0.7), 0, -H * 0.9, -L * 0.45, 0.14, 0.055, 0.14, 0, 0, Math.PI / 2));
      p.push(part(P.cylLo, accent, 0, -H * 0.9, -L * 0.45, 0.07, 0.062, 0.07, 0, 0, Math.PI / 2));
    } else if (spec.mag === 'box' || spec.mag === undefined) {
      var ml = spec.magLen || 0.17;
      p.push(part(P.box, RS.shade(body, 0.65), 0, -H * 0.4 - ml * 0.42, -L * 0.42, W * 0.82, ml, 0.055, 0.14, 0, 0));
      p.push(part(P.box, accent, 0, -H * 0.4 - ml * 0.86, -L * 0.42 + 0.018, W * 0.84, ml * 0.14, 0.06, 0.14, 0, 0));
    } else if (spec.mag === 'cyl') {   // revolver cylinder
      p.push(part(P.cylLo, RS.shade(body, 0.86), 0, -H * 0.05, -L * 0.52, 0.062, 0.085, 0.062, 0, 0, Math.PI / 2));
    } else if (spec.mag === 'tank') {  // fuel tank
      p.push(part(P.cylLo, accent, 0, -H * 0.2, -L * 0.2, 0.07, 0.3, 0.07, Math.PI / 2, 0, 0));
      p.push(part(P.cylLo, GUN_DARK, 0, -H * 0.2, -L * 0.36, 0.075, 0.03, 0.075, Math.PI / 2, 0, 0));
    }

    // grip + trigger guard
    if (spec.grip !== false) {
      p.push(part(P.box, GRIP, 0, -H * 0.95, -L * 0.14, W * 0.72, 0.17, 0.062, 0.3, 0, 0));
      p.push(part(P.box, GUN_DARK, 0, -H * 0.62, -L * 0.3, W * 0.5, 0.02, 0.08));
    }
    // stock
    if (spec.stock === 1) {
      p.push(part(P.box, RS.shade(body, 0.7), 0, -H * 0.1, 0.1, W * 0.7, H * 0.8, 0.2));
      p.push(part(P.box, GRIP, 0, -H * 0.2, 0.21, W * 0.8, H * 1.5, 0.035));
    } else if (spec.stock === 2) { // skeletal
      p.push(part(P.box, RS.shade(body, 0.6), 0, H * 0.3, 0.09, W * 0.3, 0.02, 0.2));
      p.push(part(P.box, RS.shade(body, 0.6), 0, -H * 0.5, 0.09, W * 0.3, 0.02, 0.2));
      p.push(part(P.box, GRIP, 0, -H * 0.1, 0.19, W * 0.8, H * 1.6, 0.03));
    }
    // sight
    if (spec.sight === 'red') {
      p.push(part(P.box, GUN_DARK, 0, H * 0.75, -L * 0.72, W * 0.5, H * 0.5, 0.075));
      p.push(part(P.box, 0xff3a2a, 0, H * 0.82, -L * 0.755, W * 0.26, H * 0.2, 0.004));
    } else if (spec.sight !== 'none') {
      p.push(part(P.box, GUN_DARK, 0, H * 0.72, -L * 0.9, 0.012, H * 0.42, 0.012));
      p.push(part(P.box, GUN_DARK, -0.016, H * 0.72, -L * 0.12, 0.009, H * 0.38, 0.012));
      p.push(part(P.box, GUN_DARK, 0.016, H * 0.72, -L * 0.12, 0.009, H * 0.38, 0.012));
    }
    if (spec.extra) spec.extra(p, part, P, body, accent, L, H, W);
    return RS.mergeGeos(p);
  };

  // ------------------------------------------------------------ hands
  /* Two gloved fists. They are deliberately simple: in a first-person view at
     this field of view you mostly read silhouette and motion. */
  RS.buildHand = function (mirror) {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [], s = mirror ? -1 : 1;
    var glove = 0x56493a, skin = 0xc19a6b, cuff = 0x8a5a2a;
    p.push(part(P.box, glove, 0, 0, 0, 0.085, 0.07, 0.11));
    p.push(part(P.box, glove, s * 0.045, -0.015, -0.06, 0.05, 0.055, 0.045, 0.5, 0, 0));
    p.push(part(P.box, glove, 0, -0.045, -0.015, 0.08, 0.035, 0.085));
    p.push(part(P.cylLo, cuff, 0, 0.005, 0.085, 0.095, 0.07, 0.095, Math.PI / 2, 0, 0));
    p.push(part(P.cylLo, skin, 0, 0.005, 0.145, 0.07, 0.09, 0.07, Math.PI / 2, 0, 0));
    return RS.mergeGeos(p);
  };

  // ------------------------------------------------------------ tools
  RS.buildPickaxe = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.cylLo, 0x6b4a2c, 0, 0, 0, 0.035, 0.72, 0.035, Math.PI * 0.5, 0, 0));
    p.push(part(P.cylLo, 0x40352a, 0, 0, 0.22, 0.042, 0.2, 0.042, Math.PI * 0.5, 0, 0));
    p.push(part(P.box, 0x55585f, 0, 0.03, -0.36, 0.05, 0.1, 0.1));
    // head: a long spike one side, a chisel the other
    p.push(part(P.coneLo, 0x8a8f99, 0, 0.03, -0.52, 0.055, 0.34, 0.055, -Math.PI / 2, 0, 0));
    p.push(part(P.box, 0x8a8f99, 0, 0.03, -0.26, 0.09, 0.075, 0.12, 0.25, 0, 0));
    p.push(part(P.box, 0xffb13c, 0, 0.09, -0.36, 0.055, 0.016, 0.07));
    return RS.mergeGeos(p);
  };

  RS.buildDrills = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    // housing
    p.push(part(P.box, 0x4a4036, 0, 0, 0, 0.3, 0.16, 0.26));
    p.push(part(P.box, 0x2b2622, 0, 0.09, -0.02, 0.26, 0.05, 0.22));
    p.push(part(P.box, 0xc8702a, 0, -0.04, 0.12, 0.2, 0.06, 0.05));
    return RS.mergeGeos(p);
  };
  RS.buildDrillBit = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.cylLo, 0x6a6a72, 0, 0, -0.16, 0.08, 0.3, 0.08, Math.PI / 2, 0, 0));
    p.push(part(P.coneLo, 0x9aa0aa, 0, 0, -0.4, 0.085, 0.2, 0.085, -Math.PI / 2, 0, 0));
    for (var i = 0; i < 7; i++) {
      var a = i * 1.3;
      p.push(part(P.box, 0xb0b6c0, Math.cos(a) * 0.075, Math.sin(a) * 0.075, -0.1 - i * 0.04,
        0.04, 0.04, 0.03, 0, 0, a));
    }
    return RS.mergeGeos(p);
  };

  RS.buildSentry = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.cylLo, 0x3c4149, 0, 0.06, 0, 0.42, 0.12, 0.42));
    for (var i = 0; i < 3; i++) {
      var a = Math.PI * 2 * i / 3;
      p.push(part(P.box, 0x555b64, Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3, 0.16, 0.05, 0.1, 0, -a, 0));
    }
    p.push(part(P.cylLo, 0x2b3038, 0, 0.2, 0, 0.2, 0.2, 0.2));
    return RS.mergeGeos(p);
  };
  RS.buildSentryHead = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.box, 0x4a515c, 0, 0, 0, 0.28, 0.2, 0.3));
    p.push(part(P.box, 0xc8702a, 0, 0.1, 0.02, 0.2, 0.05, 0.2));
    p.push(part(P.sphereLo, 0x50e0ff, 0, 0.02, -0.16, 0.09, 0.09, 0.09));
    p.push(part(P.cylLo, 0x6a7078, -0.07, -0.02, -0.26, 0.05, 0.3, 0.05, Math.PI / 2, 0, 0));
    p.push(part(P.cylLo, 0x6a7078, 0.07, -0.02, -0.26, 0.05, 0.3, 0.05, Math.PI / 2, 0, 0));
    return RS.mergeGeos(p);
  };

  RS.buildPlatform = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.cylLo, 0xd8d24a, 0, 0, 0, 2.0, 0.16, 2.0));
    p.push(part(P.torus, 0x8a8420, 0, 0.02, 0, 2.0, 2.0, 2.0, Math.PI / 2, 0, 0));
    for (var i = 0; i < 6; i++) {
      var a = Math.PI * 2 * i / 6;
      p.push(part(P.box, 0xb8b23a, Math.cos(a) * 0.6, 0.08, Math.sin(a) * 0.6, 0.5, 0.03, 0.12, 0, -a, 0));
    }
    return RS.mergeGeos(p);
  };

  RS.buildShieldProjector = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.cylLo, 0x3a4048, 0, 0.1, 0, 0.3, 0.2, 0.3));
    p.push(part(P.cylLo, 0x2a3038, 0, 0.26, 0, 0.16, 0.18, 0.16));
    p.push(part(P.sphereLo, 0x4ad0ff, 0, 0.4, 0, 0.16, 0.16, 0.16));
    for (var i = 0; i < 3; i++) {
      var a = Math.PI * 2 * i / 3;
      p.push(part(P.box, 0x555c66, Math.cos(a) * 0.24, 0.03, Math.sin(a) * 0.24, 0.14, 0.06, 0.1, 0, -a, 0));
    }
    return RS.mergeGeos(p);
  };

  RS.buildC4 = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.box, 0xd8d0b8, 0, 0, 0, 0.3, 0.14, 0.2));
    p.push(part(P.box, 0x2a2a2a, 0, 0.02, 0, 0.32, 0.06, 0.07));
    p.push(part(P.box, 0xc02020, 0.06, 0.09, 0, 0.07, 0.05, 0.07));
    p.push(part(P.cylLo, 0xcc3020, -0.08, 0.1, 0, 0.04, 0.05, 0.04));
    return RS.mergeGeos(p);
  };

  RS.buildGrenade = function (kind) {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    var col = kind === 'cryo' ? 0x4ac8ff : (kind === 'plasma' ? 0xc85ae0 : 0x4a5240);
    p.push(part(P.sphereLo, col, 0, 0, 0, 0.17, 0.2, 0.17));
    p.push(part(P.cylLo, 0x55585f, 0, 0.11, 0, 0.07, 0.06, 0.07));
    p.push(part(P.box, 0x8a8f99, 0.05, 0.11, 0, 0.03, 0.08, 0.03));
    for (var i = 0; i < 3; i++) {
      p.push(part(P.torus, RS.shade(col, 0.6), 0, -0.04 + i * 0.045, 0, 0.19, 0.19, 0.19, Math.PI / 2, 0, 0));
    }
    return RS.mergeGeos(p);
  };

  RS.buildAxe = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.cylLo, 0x40352a, 0, 0, 0.06, 0.028, 0.36, 0.028, Math.PI / 2, 0, 0));
    p.push(part(P.box, 0x9aa0aa, 0, 0.0, -0.17, 0.045, 0.16, 0.1));
    p.push(part(P.box, 0xc0c6d0, 0, 0.02, -0.24, 0.02, 0.2, 0.12, 0, 0, 0));
    p.push(part(P.coneLo, 0xc0c6d0, 0, -0.1, -0.2, 0.05, 0.12, 0.05, -Math.PI / 2, 0, 0));
    return RS.mergeGeos(p);
  };

  RS.buildFlareGun = function () {
    return RS.buildGun({
      len: 0.26, recH: 0.085, recW: 0.055, barLen: 0.2, barR: 0.03,
      mag: 'none', stock: 0, sight: 'iron', body: 0xb8601c, accent: 0xffc24a, shroud: false
    });
  };

  RS.buildZipGun = function () {
    return RS.buildGun({
      len: 0.4, recH: 0.13, recW: 0.1, barLen: 0.22, barR: 0.05,
      mag: 'none', stock: 1, sight: 'iron', body: 0x4a5058, accent: 0xd8a830, shroud: false,
      extra: function (p, part, P, body, accent) {
        p.push(part(P.cylLo, 0x6a6a72, 0, 0.12, -0.3, 0.1, 0.1, 0.1, 0, 0, Math.PI / 2));
        p.push(part(P.torus, accent, 0, 0.12, -0.3, 0.14, 0.14, 0.14, 0, 0, Math.PI / 2));
      }
    });
  };

  RS.buildPlatformGun = function () {
    return RS.buildGun({
      len: 0.4, recH: 0.14, recW: 0.11, barLen: 0.16, barR: 0.055,
      mag: 'none', stock: 2, sight: 'none', body: 0x44484f, accent: 0xd8d24a, shroud: false,
      extra: function (p, part, P, body, accent) {
        p.push(part(P.cylLo, accent, 0, 0.02, -0.56, 0.14, 0.06, 0.14, Math.PI / 2, 0, 0));
        p.push(part(P.cylLo, 0x2a2e34, 0, 0.02, -0.59, 0.1, 0.04, 0.1, Math.PI / 2, 0, 0));
      }
    });
  };

  RS.buildGrapple = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.box, 0x3a4048, 0, 0, 0, 0.13, 0.12, 0.2));
    p.push(part(P.cylLo, 0x6a7078, 0, 0.02, -0.16, 0.06, 0.14, 0.06, Math.PI / 2, 0, 0));
    p.push(part(P.coneLo, 0xc0c6d0, 0, 0.02, -0.26, 0.055, 0.12, 0.055, -Math.PI / 2, 0, 0));
    p.push(part(P.box, 0xd8a830, 0, -0.08, 0.02, 0.1, 0.05, 0.12));
    return RS.mergeGeos(p);
  };

  RS.buildFlare = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.cylLo, 0xb84a1a, 0, 0, 0, 0.055, 0.2, 0.055));
    p.push(part(P.sphereLo, 0xffd080, 0, 0.12, 0, 0.09, 0.09, 0.09));
    return RS.mergeGeos(p);
  };
})(window.RS);
