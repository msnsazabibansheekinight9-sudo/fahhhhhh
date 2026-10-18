/* Rock & Stone — creature and machine models. Glyphids are built from one
   parametric body plan so a swarmer and a praetorian are the same animal at
   different scales, with armour plates and spines bolted on. */
(function (RS) {
  'use strict';
  var part;

  /* spec: { scale, abdoR, abdoLift, thorR, headR, legLen, legR, legs,
             mandible, armour, spikes, colour, accent, eye } */
  RS.buildGlyphidBody = function (spec) {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    var s = spec.scale || 1;
    var col = spec.colour === undefined ? 0x4a3526 : spec.colour;
    var dark = RS.shade(col, 0.6), light = spec.accent === undefined ? RS.shade(col, 1.5) : spec.accent;
    var aR = (spec.abdoR || 0.42) * s;      // abdomen radius
    var lift = (spec.abdoLift || 0.2) * s;  // how high the rear rides
    var tR = (spec.thorR || 0.34) * s;      // thorax radius
    var hR = (spec.headR || 0.26) * s;      // head radius

    // --- abdomen: big, round, raised at the back, segmented like a wasp ---
    var aZ = aR * 1.6, aY = aR * 0.95 + lift;
    p.push(part(P.sphere, spec.weakColour === undefined ? RS.shade(col, 0.88) : spec.weakColour,
      0, aY, aZ, aR * 2.3, aR * 2.1, aR * 2.7));
    for (var i = 0; i < 4; i++) {
      var t = i / 3;
      var rr = aR * (1.95 - t * 0.5);
      p.push(part(P.torus, dark, 0, aY + aR * 0.05 * (1 - t), aZ + (t - 0.4) * aR * 1.5,
        rr, rr, rr, Math.PI / 2, 0, 0));
    }
    // a tapered tail tip
    p.push(part(P.coneLo, dark, 0, aY + aR * 0.1, aZ + aR * 1.25, aR * 1.1, aR * 1.0, aR * 1.1, -Math.PI / 2, 0, 0));

    // --- waist and thorax: narrower, lower, carries the legs ---
    var tY = tR * 0.95, tZ = -tR * 0.1;
    p.push(part(P.cylLo, dark, 0, (aY + tY) * 0.5, (aZ - aR * 1.1 + tZ) * 0.5,
      aR * 0.5, aR * 1.1, aR * 0.5, Math.PI / 2, 0, 0));
    p.push(part(P.sphere, col, 0, tY, tZ, tR * 2.0, tR * 1.7, tR * 2.3));
    p.push(part(P.torus, dark, 0, tY, tZ + tR * 0.6, tR * 1.9, tR * 1.9, tR * 1.9, Math.PI / 2, 0, 0));

    // --- head: small, forward, low, with jaws ---
    var hY = tY - tR * 0.22, hZ = tZ - tR * 1.25 - hR * 0.7;
    p.push(part(P.sphere, RS.shade(col, 1.14), 0, hY, hZ, hR * 1.9, hR * 1.6, hR * 2.1));
    p.push(part(P.cylLo, dark, 0, (tY + hY) * 0.5, (tZ - tR * 0.9 + hZ) * 0.5,
      hR * 1.3, hR * 1.1, hR * 1.3, Math.PI / 2, 0, 0));
    if (spec.eye !== false) {
      for (i = 0; i < 2; i++) {
        p.push(part(P.sphereLo, spec.eyeColour === undefined ? 0xffb020 : spec.eyeColour,
          (i ? 1 : -1) * hR * 0.78, hY + hR * 0.5, hZ - hR * 0.42,
          hR * 0.46, hR * 0.4, hR * 0.46));
      }
    }
    if (spec.mandible !== false) {
      for (i = 0; i < 2; i++) {
        var sgn = i ? 1 : -1;
        // jaws sweep forward and curve inward
        p.push(RS.limb(P.cylLo, light,
          sgn * hR * 0.8, hY - hR * 0.25, hZ - hR * 0.5,
          sgn * hR * 1.25, hY - hR * 0.4, hZ - hR * 1.9, hR * 0.22 * s / s));
        p.push(RS.limb(P.coneLo, RS.shade(light, 1.25),
          sgn * hR * 1.25, hY - hR * 0.4, hZ - hR * 1.9,
          sgn * hR * 0.35, hY - hR * 0.55, hZ - hR * 2.9, hR * 0.2));
      }
      // a smaller inner pair
      p.push(part(P.coneLo, dark, 0, hY - hR * 0.55, hZ - hR * 1.5, hR * 0.5, hR * 1.1, hR * 0.5, -Math.PI / 2 + 0.3, 0, 0));
    }

    // --- armour: plates that follow the curve of the back ---
    if (spec.armour) {
      var plates = Math.round(3 + spec.armour * 3);
      for (i = 0; i < plates; i++) {
        var tt = i / (plates - 1);
        var pz = RS.lerp(tZ - tR * 0.9, aZ + aR * 0.9, tt);
        var py = RS.lerp(tY + tR * 0.85, aY + aR * 0.95, tt);
        var pw = RS.lerp(tR * 2.0, aR * 2.0, Math.sin(tt * Math.PI) * 0.5 + 0.5);
        p.push(part(P.box, spec.armourColour === undefined ? 0x6e6456 : spec.armourColour,
          0, py, pz, pw, aR * 0.26, aR * 0.62, -0.5 + tt * 0.75, 0, 0));
        p.push(part(P.box, RS.shade(spec.armourColour === undefined ? 0x6e6456 : spec.armourColour, 0.75),
          0, py + aR * 0.1, pz, pw * 0.55, aR * 0.2, aR * 0.4, -0.5 + tt * 0.75, 0, 0));
      }
      // shoulder guards over the front legs
      for (i = 0; i < 2; i++) {
        p.push(part(P.box, spec.armourColour === undefined ? 0x6e6456 : spec.armourColour,
          (i ? 1 : -1) * tR * 1.5, tY + tR * 0.3, tZ - tR * 0.4,
          tR * 0.7, tR * 1.0, tR * 1.4, 0, 0, (i ? 1 : -1) * 0.5));
      }
    }
    // --- dorsal spines ---
    if (spec.spikes) {
      for (i = 0; i < spec.spikes; i++) {
        var st = i / Math.max(1, spec.spikes - 1);
        var sz2 = RS.lerp(tZ, aZ + aR * 1.0, st);
        var sy2 = RS.lerp(tY + tR * 0.9, aY + aR * 1.0, st);
        p.push(part(P.coneLo, light, 0, sy2 + aR * 0.4, sz2,
          aR * 0.3, aR * (1.0 - st * 0.35), aR * 0.3, -0.45 + st * 0.55, 0, 0));
      }
    }
    return RS.mergeGeos(p);
  };

  /* Legs with a real knee: hip on the thorax, knee raised above the back,
     foot planted out and down. Merged per side and swung as a unit. */
  RS.buildGlyphidLegs = function (spec, side) {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    var s = spec.scale || 1;
    var base = spec.colour === undefined ? 0x4a3526 : spec.colour;
    var col = RS.shade(base, 0.72), foot = RS.shade(base, 1.2);
    var n = spec.legs || 3;
    var len = (spec.legLen || 0.5) * s, r = (spec.legR || 0.055) * s;
    var tR = (spec.thorR || 0.34) * s;
    var sgn = side ? 1 : -1;
    var groundY = -(spec.thorR || 0.34) * s * 0.72;

    for (var i = 0; i < n; i++) {
      var t = n === 1 ? 0.5 : i / (n - 1);
      var z = RS.lerp(-tR * 1.0, tR * 1.3, t);
      var splay = 0.75 + t * 0.45;              // back legs reach further back
      var hipX = sgn * tR * 0.8, hipY = tR * 0.62;
      var kneeX = sgn * (tR * 0.8 + len * 0.52), kneeY = tR * 0.68 + len * 0.42;
      var kneeZ = z + (t - 0.5) * len * 0.26;
      var footX = sgn * (tR * 0.8 + len * 0.86 * splay);
      var footZ = z + (t - 0.5) * len * 0.8;
      p.push(RS.limb(P.cylLo, col, hipX, hipY, z, kneeX, kneeY, kneeZ, r * 1.25));
      p.push(part(P.sphereLo, RS.shade(col, 1.1), kneeX, kneeY, kneeZ, r * 2.6, r * 2.6, r * 2.6));
      p.push(RS.limb(P.cylLo, col, kneeX, kneeY, kneeZ, footX, groundY, footZ, r));
      p.push(RS.limb(P.coneLo, foot, footX, groundY, footZ,
        footX + sgn * r * 1.6, groundY - r * 2.4, footZ - r * 0.6, r * 0.9));
    }
    return RS.mergeGeos(p);
  };

  RS.buildMactera = function (spec) {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    var s = spec.scale || 1;
    var col = spec.colour || 0x5a4a6a, light = spec.accent || 0xc07ad0;
    p.push(part(P.sphere, col, 0, 0, 0.1 * s, 0.7 * s, 0.62 * s, 0.9 * s));
    p.push(part(P.sphere, RS.shade(col, 1.2), 0, -0.05 * s, -0.5 * s, 0.4 * s, 0.36 * s, 0.46 * s));
    p.push(part(P.sphereLo, 0xff8030, -0.14 * s, 0.06 * s, -0.66 * s, 0.14 * s, 0.12 * s, 0.14 * s));
    p.push(part(P.sphereLo, 0xff8030, 0.14 * s, 0.06 * s, -0.66 * s, 0.14 * s, 0.12 * s, 0.14 * s));
    // abdomen sac: the weak point
    p.push(part(P.sphere, light, 0, -0.04 * s, 0.68 * s, 0.56 * s, 0.5 * s, 0.6 * s));
    // dangling legs
    for (var i = 0; i < 4; i++) {
      var sg = i < 2 ? -1 : 1, t = i % 2;
      p.push(part(P.cylLo, RS.shade(col, 0.7), sg * 0.22 * s, -0.36 * s, (t ? 0.2 : -0.1) * s,
        0.05 * s, 0.5 * s, 0.05 * s, 0.3, 0, sg * 0.35));
    }
    return RS.mergeGeos(p);
  };

  RS.buildWing = function (spec, side) {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    var s = spec.scale || 1, sg = side ? 1 : -1;
    p.push(part(P.box, spec.wingColour || 0xa0b0d0, sg * 0.5 * s, 0.1 * s, 0,
      1.0 * s, 0.02 * s, 0.5 * s, 0, 0, sg * 0.12));
    p.push(part(P.cylLo, RS.shade(spec.colour || 0x5a4a6a, 0.8), sg * 0.3 * s, 0.11 * s, 0,
      0.03 * s, 0.6 * s, 0.03 * s, 0, 0, Math.PI / 2));
    return RS.mergeGeos(p);
  };

  // --------------------------------------------------------------- machines
  /* The drop pod is a shell with a real doorway cut out of it, so riding it
     down you are looking out of an opening rather than at the inside of a
     solid cylinder. Drawn double-sided for the same reason. */
  RS.buildDropPod = function (escape) {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    var body = escape ? 0xb4532a : 0x49505a, accent = 0xe0b23a;
    var R = 2.6, H = 4.2;
    var gap = 1.15;                                  // doorway, centred on -Z
    var wall = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true, Math.PI + gap * 0.5, Math.PI * 2 - gap);
    p.push(part(wall, body, 0, H * 0.5, 0, R * 2, H, R * 2));
    var inner = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true, Math.PI + gap * 0.5, Math.PI * 2 - gap);
    p.push(part(inner, RS.shade(body, 0.52), 0, H * 0.5, 0, R * 1.84, H * 0.98, R * 1.84));
    // floor plate and roof
    p.push(part(P.cyl, RS.shade(body, 0.4), 0, 0.12, 0, R * 1.92, 0.24, R * 1.92));
    p.push(part(P.cyl, RS.shade(body, 0.62), 0, H, 0, R * 2.06, 0.3, R * 2.06));
    p.push(part(P.coneLo, RS.shade(body, 0.8), 0, H + 0.95, 0, R * 2.0, 1.7, R * 2.0));
    // door frame posts
    for (var sgnI = 0; sgnI < 2; sgnI++) {
      var a = Math.PI + (sgnI ? 1 : -1) * gap * 0.5;
      p.push(part(P.box, accent, Math.sin(a) * R, H * 0.5, Math.cos(a) * R, 0.26, H, 0.3, 0, -a, 0));
    }
    // external ribs, lamps and hazard stripes
    for (var i = 0; i < 7; i++) {
      var a2 = Math.PI + gap * 0.5 + (Math.PI * 2 - gap) * (i / 6);
      p.push(part(P.box, RS.shade(body, 0.74), Math.sin(a2) * R * 1.02, H * 0.5, Math.cos(a2) * R * 1.02,
        0.22, H * 0.96, 0.26, 0, -a2, 0));
      if (i % 2 === 0) {
        p.push(part(P.box, accent, Math.sin(a2) * R * 1.03, H * 0.76, Math.cos(a2) * R * 1.03, 0.7, 0.26, 0.1, 0, -a2, 0));
        p.push(part(P.sphereLo, escape ? 0x60ff80 : 0xffe060, Math.sin(a2) * R * 1.02, H * 0.92, Math.cos(a2) * R * 1.02, 0.22, 0.22, 0.22));
      }
    }
    // landing feet and thruster bells
    for (i = 0; i < 4; i++) {
      var a3 = Math.PI * 2 * i / 4 + 0.78;
      p.push(part(P.box, 0x33383f, Math.sin(a3) * R * 0.9, 0.16, Math.cos(a3) * R * 0.9, 1.0, 0.34, 0.6, 0, -a3, 0));
      p.push(part(P.coneLo, 0x2a2e34, Math.sin(a3) * R * 0.55, -0.2, Math.cos(a3) * R * 0.55, 0.8, 0.7, 0.8, Math.PI, 0, 0));
    }
    // interior: a grab rail and a bench, so the inside is not an empty tube
    p.push(part(P.torus, 0x8a8f99, 0, H * 0.62, 0, R * 1.5, R * 1.5, R * 1.5, Math.PI / 2, 0, 0));
    p.push(part(P.box, RS.shade(body, 0.58), 0, 0.72, R * 1.1, R * 1.5, 0.22, 0.8));
    return RS.mergeGeos(p);
  };

  RS.buildMule = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    var body = 0x4a5058, accent = 0xe0b23a;
    p.push(part(P.box, body, 0, 0.95, 0, 1.0, 0.7, 1.5));
    p.push(part(P.box, RS.shade(body, 0.8), 0, 1.4, 0.1, 0.8, 0.3, 1.2));
    // mineral hopper
    p.push(part(P.box, 0x2e3238, 0, 1.55, 0.1, 0.72, 0.25, 1.05));
    p.push(part(P.box, accent, 0, 1.0, -0.78, 1.04, 0.2, 0.1));
    // sensor head
    p.push(part(P.box, RS.shade(body, 0.9), 0, 1.55, -0.72, 0.4, 0.3, 0.25));
    p.push(part(P.sphereLo, 0x50e0ff, 0, 1.58, -0.86, 0.16, 0.16, 0.1));
    p.push(part(P.cylLo, 0x888f98, 0, 1.9, -0.5, 0.05, 0.6, 0.05));
    p.push(part(P.sphereLo, 0xff5030, 0, 2.2, -0.5, 0.1, 0.1, 0.1));
    return RS.mergeGeos(p);
  };
  RS.buildMuleLeg = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.cylLo, 0x6a7078, 0, -0.25, 0, 0.14, 0.55, 0.14));
    p.push(part(P.box, 0x33383f, 0, -0.55, 0, 0.3, 0.12, 0.42));
    return RS.mergeGeos(p);
  };

  RS.buildBosco = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    var body = 0x4a5058, accent = 0xe0b23a;
    p.push(part(P.sphere, body, 0, 0, 0, 0.62, 0.55, 0.7));
    p.push(part(P.torus, RS.shade(body, 0.7), 0, 0, 0, 0.72, 0.72, 0.72, Math.PI / 2, 0, 0));
    p.push(part(P.sphereLo, 0x50e0ff, 0, 0.04, -0.3, 0.26, 0.24, 0.18));
    p.push(part(P.box, accent, 0, 0.3, 0, 0.5, 0.08, 0.5));
    // side pods: mining laser and a little gun
    p.push(part(P.box, RS.shade(body, 0.85), -0.42, -0.05, 0.02, 0.18, 0.18, 0.5));
    p.push(part(P.box, RS.shade(body, 0.85), 0.42, -0.05, 0.02, 0.18, 0.18, 0.5));
    p.push(part(P.cylLo, 0x9aa0aa, -0.42, -0.05, -0.3, 0.07, 0.3, 0.07, Math.PI / 2, 0, 0));
    p.push(part(P.cylLo, 0x9aa0aa, 0.42, -0.05, -0.3, 0.07, 0.3, 0.07, Math.PI / 2, 0, 0));
    return RS.mergeGeos(p);
  };

  RS.buildResupplyPod = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    var body = 0x3f4752, accent = 0xe0b23a;
    p.push(part(P.box, body, 0, 0.8, 0, 1.8, 1.6, 1.8));
    p.push(part(P.box, RS.shade(body, 0.7), 0, 1.7, 0, 2.0, 0.3, 2.0));
    p.push(part(P.coneLo, RS.shade(body, 0.8), 0, 2.3, 0, 1.4, 1.0, 1.4));
    for (var i = 0; i < 2; i++) {
      p.push(part(P.box, accent, (i ? 1 : -1) * 0.92, 0.8, 0, 0.1, 1.2, 1.4));
      p.push(part(P.box, 0x20242a, 0, 0.7, (i ? 1 : -1) * 0.92, 1.2, 1.0, 0.1));
    }
    p.push(part(P.sphereLo, 0x60ff80, 0, 1.78, 0, 0.22, 0.22, 0.22));
    for (i = 0; i < 4; i++) {
      var a = Math.PI * 2 * i / 4 + 0.785;
      p.push(part(P.box, 0x33383f, Math.cos(a) * 1.1, 0.1, Math.sin(a) * 1.1, 0.7, 0.2, 0.4, 0, -a, 0));
    }
    return RS.mergeGeos(p);
  };

  RS.buildAmmoCrate = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.box, 0x4a5440, 0, 0.22, 0, 0.6, 0.44, 0.44));
    p.push(part(P.box, 0x2e3528, 0, 0.46, 0, 0.64, 0.08, 0.48));
    p.push(part(P.box, 0xe0b23a, 0, 0.22, 0.23, 0.4, 0.14, 0.04));
    return RS.mergeGeos(p);
  };

  RS.buildEgg = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.sphere, 0xc8b070, 0, 0.42, 0, 0.56, 0.9, 0.56));
    p.push(part(P.sphere, 0xe8d8a0, 0, 0.62, 0, 0.36, 0.5, 0.36));
    for (var i = 0; i < 5; i++) {
      var a = Math.PI * 2 * i / 5;
      p.push(part(P.sphereLo, 0x8a7a50, Math.cos(a) * 0.3, 0.1, Math.sin(a) * 0.3, 0.28, 0.14, 0.28));
    }
    return RS.mergeGeos(p);
  };

  RS.buildAquarq = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    p.push(part(P.octa, 0x3ad0e0, 0, 0.6, 0, 1.0, 1.5, 1.0));
    p.push(part(P.octa, 0x9af0ff, 0, 0.6, 0, 0.6, 0.9, 0.6, 0.6, 0.4, 0));
    p.push(part(P.sphereLo, 0x2a4a58, 0, 0.1, 0, 0.9, 0.3, 0.9));
    return RS.mergeGeos(p);
  };

  RS.buildMinehead = function () {
    RS.initPrims(); part = RS.part;
    var P = RS.PRIM, p = [];
    var body = 0x4a5058, accent = 0xe0b23a;
    p.push(part(P.cyl, body, 0, 0.6, 0, 2.6, 1.2, 2.6));
    p.push(part(P.cyl, RS.shade(body, 0.75), 0, 1.5, 0, 1.4, 1.0, 1.4));
    p.push(part(P.torus, accent, 0, 1.2, 0, 2.6, 2.6, 2.6, Math.PI / 2, 0, 0));
    for (var i = 0; i < 4; i++) {
      var a = Math.PI * 2 * i / 4;
      p.push(part(P.box, RS.shade(body, 0.8), Math.cos(a) * 2.0, 1.9, Math.sin(a) * 2.0, 0.3, 1.4, 0.3, 0, -a, 0));
      p.push(part(P.sphereLo, 0xffe060, Math.cos(a) * 2.0, 2.6, Math.sin(a) * 2.0, 0.22, 0.22, 0.22));
    }
    return RS.mergeGeos(p);
  };
})(window.RS);
