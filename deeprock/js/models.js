/* Rock & Stone — procedural geometry. Nothing here is an imported asset: every
   crystal, mushroom, ore lump and machine is lathed, boxed and merged at run
   time so the whole game is a handful of text files. */
(function (RS) {
  'use strict';

  // ------------------------------------------------------------- merge utils
  /* Flatten a list of {geo, matrix} into one BufferGeometry with baked colour.
     Fewer draw calls matters a lot once forty glyphids are on screen. */
  RS.mergeGeos = function (parts) {
    var total = 0, idxTotal = 0, i, p;
    for (i = 0; i < parts.length; i++) {
      var g = parts[i].geo;
      if (!g.attributes.position) continue;
      total += g.attributes.position.count;
      idxTotal += g.index ? g.index.count : g.attributes.position.count;
    }
    var pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), col = new Float32Array(total * 3);
    var idx = total > 65535 ? new Uint32Array(idxTotal) : new Uint16Array(idxTotal);
    var vo = 0, io = 0;
    var nm = new THREE.Matrix3();
    var v = new THREE.Vector3(), n = new THREE.Vector3();
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var geo = p.geo;
      if (!geo.attributes.position) continue;
      var m = p.matrix || new THREE.Matrix4();
      nm.getNormalMatrix(m);
      var pa = geo.attributes.position.array, na = geo.attributes.normal ? geo.attributes.normal.array : null;
      var cnt = geo.attributes.position.count;
      var c = p.color !== undefined ? p.color : 0xffffff;
      var cr = ((c >> 16) & 255) / 255, cg = ((c >> 8) & 255) / 255, cb = (c & 255) / 255;
      for (var k = 0; k < cnt; k++) {
        v.set(pa[k * 3], pa[k * 3 + 1], pa[k * 3 + 2]).applyMatrix4(m);
        pos[(vo + k) * 3] = v.x; pos[(vo + k) * 3 + 1] = v.y; pos[(vo + k) * 3 + 2] = v.z;
        if (na) {
          n.set(na[k * 3], na[k * 3 + 1], na[k * 3 + 2]).applyMatrix3(nm).normalize();
          nrm[(vo + k) * 3] = n.x; nrm[(vo + k) * 3 + 1] = n.y; nrm[(vo + k) * 3 + 2] = n.z;
        }
        col[(vo + k) * 3] = cr; col[(vo + k) * 3 + 1] = cg; col[(vo + k) * 3 + 2] = cb;
      }
      if (geo.index) {
        var ia = geo.index.array;
        for (var j = 0; j < ia.length; j++) idx[io + j] = ia[j] + vo;
        io += ia.length;
      } else {
        for (var j2 = 0; j2 < cnt; j2++) idx[io + j2] = vo + j2;
        io += cnt;
      }
      vo += cnt;
    }
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  };

  // Shared primitive geometries — built once, reused by every model.
  var P = RS.PRIM = {};
  RS.initPrims = function () {
    if (P.box) return;
    P.box = new THREE.BoxGeometry(1, 1, 1);
    P.sphere = new THREE.SphereGeometry(0.5, 10, 7);
    P.sphereLo = new THREE.SphereGeometry(0.5, 7, 5);
    P.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 1);
    P.cylLo = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1);
    P.cone = new THREE.ConeGeometry(0.5, 1, 8, 1);
    P.coneLo = new THREE.ConeGeometry(0.5, 1, 5, 1);
    P.tube = new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, true);
    P.tetra = new THREE.TetrahedronGeometry(0.6, 0);
    P.octa = new THREE.OctahedronGeometry(0.5, 0);
    P.icosa = new THREE.IcosahedronGeometry(0.5, 0);
    P.torus = new THREE.TorusGeometry(0.5, 0.14, 6, 12);
    P.disc = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16, 1);
    P.plane = new THREE.PlaneGeometry(1, 1);
  };

  // Transform helper: part(geo, color, x,y,z, sx,sy,sz, rx,ry,rz)
  var _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  RS.part = function (geo, color, x, y, z, sx, sy, sz, rx, ry, rz) {
    var m = new THREE.Matrix4();
    _e.set(rx || 0, ry || 0, rz || 0);
    _q.setFromEuler(_e);
    m.compose(new THREE.Vector3(x || 0, y || 0, z || 0), _q,
      new THREE.Vector3(sx === undefined ? 1 : sx, sy === undefined ? (sx === undefined ? 1 : sx) : sy, sz === undefined ? (sx === undefined ? 1 : sx) : sz));
    return { geo: geo, color: color, matrix: m };
  };
  var part = RS.part;

  /* Place a tapered cylinder spanning two points — the basis of every leg,
     limb and strut in the game. */
  var _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
  var _up = new THREE.Vector3(0, 1, 0), _qq = new THREE.Quaternion();
  RS.limb = function (geo, color, ax, ay, az, bx, by, bz, r) {
    _a.set(ax, ay, az); _b.set(bx, by, bz);
    _d.subVectors(_b, _a);
    var len = _d.length() || 0.001;
    _d.divideScalar(len);
    _qq.setFromUnitVectors(_up, _d);
    var m = new THREE.Matrix4();
    m.compose(new THREE.Vector3((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), _qq,
      new THREE.Vector3(r * 2, len, r * 2));
    return { geo: geo, color: color, matrix: m };
  };

  // ------------------------------------------------------------- materials
  /* Glowing rock: lit like everything else, but its own vertex colour is also
     emitted, so a crystal seam reads as a light source without actually being
     one. The patch swaps the material's flat emissive for a per-vertex one. */
  RS.makeGlowMaterial = function (strength, flat) {
    var m = new THREE.MeshPhongMaterial({
      vertexColors: true, shininess: 6, specular: 0x1a1a1a, flatShading: !!flat
    });
    m.emissive = new THREE.Color(strength, strength, strength);
    m.onBeforeCompile = function (shader) {
      shader.fragmentShader = shader.fragmentShader.replace(
        'vec3 totalEmissiveRadiance = emissive;',
        'vec3 totalEmissiveRadiance = emissive * vColor;');
    };
    m.customProgramCacheKey = function () { return 'vcol-emissive'; };
    return m;
  };

  RS.makeMats = function () {
    var M = {};
    // Per-pixel Phong rather than Gouraud Lambert: the headlamp is a spotlight,
    // and vertex lighting on metre-wide triangles bands horribly.
    M.solid = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 8, specular: 0x222222 });
    M.flat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 4, specular: 0x151515, flatShading: true });
    M.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
    M.glowAdd = new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.85, depthWrite: false });
    M.metal = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 42, specular: 0x6a6a72 });
    return M;
  };

  // ------------------------------------------------------------ cave props
  /* Each prop builder returns a geometry already oriented so +Y points out of
     the rock face; the caller just aims +Y down the surface normal. */
  var propCache = {};
  RS.makeProp = function (type, biome, variant) {
    RS.initPrims();
    var key = type + '|' + biome.id + '|' + (variant % 4);
    if (propCache[key]) return propCache[key];
    var rng = RS.Rng(variant * 7919 + type.length * 131);
    var parts = [], glowCol = biome.glow, rockCol = biome.rock2;
    var i, n, ang, h, r;

    switch (type) {
      case 'crystal':
      case 'radcrystal': {
        n = rng.int(3, 7);
        for (i = 0; i < n; i++) {
          ang = rng.range(0, Math.PI * 2);
          h = rng.range(0.5, 1.5); r = rng.range(0.07, 0.19);
          var tilt = rng.range(0.05, 0.5);
          parts.push(part(P.coneLo, RS.shade(RS.hexLerp(glowCol, 0xffffff, rng.range(0, 0.22)), rng.range(0.55, 0.85)),
            Math.cos(ang) * rng.range(0, 0.5), h * 0.45, Math.sin(ang) * rng.range(0, 0.5),
            r * 2, h, r * 2, Math.cos(ang) * tilt, 0, -Math.sin(ang) * tilt));
        }
        parts.push(part(P.sphereLo, RS.shade(rockCol, 0.55), 0, 0.02, 0, 1.15, 0.55, 1.15));
        break;
      }
      case 'shard': {
        n = rng.int(2, 4);
        for (i = 0; i < n; i++) {
          ang = rng.range(0, Math.PI * 2);
          parts.push(part(P.octa, RS.shade(rockCol, rng.range(0.7, 1.05)),
            Math.cos(ang) * rng.range(0, 0.4), rng.range(0.15, 0.6), Math.sin(ang) * rng.range(0, 0.4),
            rng.range(0.3, 0.75), rng.range(0.5, 1.3), rng.range(0.3, 0.75),
            rng.range(-0.5, 0.5), rng.range(0, 3), rng.range(-0.5, 0.5)));
        }
        break;
      }
      case 'stalag':
      case 'stalac': {
        n = rng.int(1, 3);
        for (i = 0; i < n; i++) {
          h = rng.range(1.1, 3.6);
          parts.push(part(P.coneLo, RS.shade(rockCol, rng.range(0.65, 1.0)),
            rng.range(-0.5, 0.5), h * 0.48, rng.range(-0.5, 0.5),
            rng.range(0.35, 0.78), h, rng.range(0.35, 0.78),
            rng.range(-0.12, 0.12), 0, rng.range(-0.12, 0.12)));
        }
        break;
      }
      case 'mushroom': {
        n = rng.int(2, 5);
        for (i = 0; i < n; i++) {
          ang = rng.range(0, Math.PI * 2);
          var sx = Math.cos(ang) * rng.range(0, 0.7), sz = Math.sin(ang) * rng.range(0, 0.7);
          h = rng.range(0.5, 1.5);
          parts.push(part(P.cylLo, 0xd8d2b4, sx, h * 0.5, sz, 0.14, h, 0.14));
          parts.push(part(P.sphereLo, glowCol, sx, h, sz, rng.range(0.4, 0.95), rng.range(0.3, 0.55), rng.range(0.4, 0.95)));
        }
        break;
      }
      case 'saltpillar': {
        h = rng.range(1.6, 4.2);
        for (i = 0; i < 3; i++) {
          parts.push(part(P.box, RS.shade(biome.hard, rng.range(0.8, 1.1)),
            rng.range(-0.3, 0.3), h * rng.range(0.25, 0.6), rng.range(-0.3, 0.3),
            rng.range(0.3, 0.7), h * rng.range(0.5, 1), rng.range(0.3, 0.7),
            0, rng.range(0, 3), rng.range(-0.1, 0.1)));
        }
        break;
      }
      case 'icespike': {
        n = rng.int(2, 5);
        for (i = 0; i < n; i++) {
          ang = rng.range(0, Math.PI * 2);
          h = rng.range(1.2, 3.4);
          parts.push(part(P.coneLo, RS.hexLerp(biome.ice, 0xffffff, rng.range(0, 0.5)),
            Math.cos(ang) * rng.range(0, 0.6), h * 0.46, Math.sin(ang) * rng.range(0, 0.6),
            rng.range(0.18, 0.44), h, rng.range(0.18, 0.44),
            rng.range(-0.3, 0.3), 0, rng.range(-0.3, 0.3)));
        }
        break;
      }
      case 'lavacrack': {
        for (i = 0; i < 4; i++) {
          parts.push(part(P.box, i % 2 ? 0xff6a1e : 0xffc14a,
            rng.range(-1.2, 1.2), 0.06, rng.range(-1.2, 1.2),
            rng.range(0.25, 1.4), 0.1, rng.range(0.15, 0.5), 0, rng.range(0, 3), 0));
        }
        parts.push(part(P.sphereLo, RS.shade(biome.rock, 0.6), 0, -0.1, 0, 2.4, 0.3, 2.4));
        break;
      }
      case 'plant': {
        n = rng.int(3, 7);
        for (i = 0; i < n; i++) {
          ang = Math.PI * 2 * i / n + rng.range(-0.3, 0.3);
          h = rng.range(0.7, 2.2);
          var lean = rng.range(0.25, 0.8);
          parts.push(part(P.coneLo, i % 2 ? 0x3f7a34 : 0x58a046,
            Math.cos(ang) * h * lean * 0.4, h * 0.45, Math.sin(ang) * h * lean * 0.4,
            rng.range(0.1, 0.2), h, rng.range(0.1, 0.2),
            Math.sin(ang) * lean, 0, -Math.cos(ang) * lean));
          if (rng.chance(0.5)) {
            parts.push(part(P.sphereLo, glowCol,
              Math.cos(ang) * h * lean * 0.8, h * 0.9, Math.sin(ang) * h * lean * 0.8,
              rng.range(0.15, 0.3)));
          }
        }
        break;
      }
      case 'vine': {
        var px = 0, py = 0, pz = 0;
        for (i = 0; i < 7; i++) {
          var nx2 = px + rng.range(-0.4, 0.4), ny2 = py + rng.range(0.25, 0.55), nz2 = pz + rng.range(-0.4, 0.4);
          var len = Math.hypot(nx2 - px, ny2 - py, nz2 - pz);
          parts.push(part(P.cylLo, 0x4a5e2a, (px + nx2) / 2, (py + ny2) / 2, (pz + nz2) / 2,
            0.09, len, 0.09, rng.range(-0.5, 0.5), 0, rng.range(-0.5, 0.5)));
          px = nx2; py = ny2; pz = nz2;
        }
        parts.push(part(P.sphereLo, glowCol, px, py, pz, 0.26));
        break;
      }
      case 'root':
      case 'thorn': {
        n = rng.int(3, 6);
        for (i = 0; i < n; i++) {
          ang = Math.PI * 2 * i / n;
          h = rng.range(1.0, 2.8);
          parts.push(part(P.coneLo, type === 'thorn' ? 0x8a2a30 : 0x5a4028,
            Math.cos(ang) * 0.35, h * 0.45, Math.sin(ang) * 0.35,
            type === 'thorn' ? 0.16 : 0.3, h, type === 'thorn' ? 0.16 : 0.3,
            Math.sin(ang) * 0.35, 0, -Math.cos(ang) * 0.35));
        }
        break;
      }
      case 'rubble': {
        n = rng.int(3, 7);
        for (i = 0; i < n; i++) {
          ang = rng.range(0, Math.PI * 2);
          parts.push(part(P.icosa, RS.shade(rockCol, rng.range(0.45, 0.85)),
            Math.cos(ang) * rng.range(0.2, 1.3), rng.range(-0.05, 0.3), Math.sin(ang) * rng.range(0.2, 1.3),
            rng.range(0.25, 0.8), rng.range(0.2, 0.6), rng.range(0.25, 0.8),
            rng.range(0, 3), rng.range(0, 3), rng.range(0, 3)));
        }
        break;
      }
      default:
        parts.push(part(P.sphereLo, rockCol, 0, 0.2, 0, 0.7, 0.4, 0.7));
    }
    var g = RS.mergeGeos(parts);
    g.userData.glowing = (type === 'crystal' || type === 'radcrystal' || type === 'mushroom' ||
      type === 'lavacrack' || type === 'plant' || type === 'vine');
    propCache[key] = g;
    return g;
  };
  RS.clearPropCache = function () { propCache = {}; };

  // ------------------------------------------------------------- ore lumps
  var oreCache = {};
  RS.makeOreLump = function (matId, variant) {
    RS.initPrims();
    var key = matId + '|' + (variant % 5);
    if (oreCache[key]) return oreCache[key];
    var rng = RS.Rng(variant * 613 + matId * 97);
    var col = [0x6b6b6b, 0x5a4a38, RS.ORE.NITRA, RS.ORE.MORKITE, RS.ORE.GOLD, RS.ORE.CRYSTAL][matId] || 0x888888;
    var parts = [];
    var n = rng.int(3, 6);
    for (var i = 0; i < n; i++) {
      var ang = rng.range(0, Math.PI * 2);
      parts.push(part(matId === RS.MAT.GOLD ? P.icosa : P.octa,
        RS.hexLerp(col, 0xffffff, rng.range(0, 0.35)),
        Math.cos(ang) * rng.range(0, 0.34), rng.range(0.02, 0.4), Math.sin(ang) * rng.range(0, 0.34),
        rng.range(0.34, 0.68), rng.range(0.45, 0.95), rng.range(0.34, 0.68),
        rng.range(0, 3), rng.range(0, 3), rng.range(0, 3)));
    }
    var g = RS.mergeGeos(parts);
    oreCache[key] = g;
    return g;
  };

  // Small tumbling pickup, flies out of the rock when a lump is broken.
  var pickupCache = {};
  RS.makePickup = function (matId) {
    RS.initPrims();
    if (pickupCache[matId]) return pickupCache[matId];
    var col = [0x6b6b6b, 0x5a4a38, RS.ORE.NITRA, RS.ORE.MORKITE, RS.ORE.GOLD, RS.ORE.CRYSTAL][matId] || 0x888888;
    var parts = [
      part(P.octa, col, 0, 0, 0, 0.42, 0.52, 0.42),
      part(P.octa, RS.hexLerp(col, 0xffffff, 0.4), 0.12, 0.1, -0.08, 0.2, 0.28, 0.2, 0.6, 0.4, 0.2)
    ];
    pickupCache[matId] = RS.mergeGeos(parts);
    return pickupCache[matId];
  };
})(window.RS);
