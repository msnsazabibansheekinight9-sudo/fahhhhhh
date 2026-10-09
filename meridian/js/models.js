'use strict';
// Procedural 3D models. Every unit is assembled from primitives merged per material,
// with named pivot groups for animation (turret, gun, barrel, wheel, rotor, hipL ...).
(function () {
  const T = THREE, PI = Math.PI;

  // ------------------------------------------------------------ geometry merge builder
  function mergeGeos(list, uvs) {
    let n = 0;
    for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of list) {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      o += c;
    }
    for (let i = 0; i < n; i++) { // box-projected UVs so camo scale is the same on every part
      const nx = Math.abs(nor[i * 3]), ny = Math.abs(nor[i * 3 + 1]), nz = Math.abs(nor[i * 3 + 2]);
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      if (nx >= ny && nx >= nz) { uv[i * 2] = z * uvs; uv[i * 2 + 1] = y * uvs; }
      else if (ny >= nz) { uv[i * 2] = x * uvs; uv[i * 2 + 1] = z * uvs; }
      else { uv[i * 2] = x * uvs; uv[i * 2 + 1] = y * uvs; }
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3));
    out.setAttribute('normal', new T.BufferAttribute(nor, 3));
    out.setAttribute('uv', new T.BufferAttribute(uv, 2));
    out.computeBoundingSphere();
    return out;
  }
  SM.mergeGeos = mergeGeos;

  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3();
  class MB {
    constructor(uvs) { this.L = {}; this.uvs = uvs || 0.2; }
    push(mat, geo, x, y, z, rx, ry, rz, sx, sy, sz) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0));
      _m.compose(_p.set(x || 0, y || 0, z || 0), _q, _s.set(sx || 1, sy || 1, sz || 1));
      g.applyMatrix4(_m);
      (this.L[mat] || (this.L[mat] = [])).push(g);
      return this;
    }
    box(mat, w, h, d, x, y, z, rx, ry, rz) { return this.push(mat, new T.BoxGeometry(w, h, d), x, y, z, rx, ry, rz); }
    cyl(mat, rt, rb, h, x, y, z, rx, ry, rz, seg) { return this.push(mat, new T.CylinderGeometry(rt, rb, h, seg || 12), x, y, z, rx, ry, rz); }
    cylZ(mat, r, len, x, y, z, seg, r2) { return this.push(mat, new T.CylinderGeometry(r2 === undefined ? r : r2, r, len, seg || 12), x, y, z, PI / 2, 0, 0); }
    cylX(mat, r, len, x, y, z, seg) { return this.push(mat, new T.CylinderGeometry(r, r, len, seg || 12), x, y, z, 0, 0, PI / 2); }
    sph(mat, r, x, y, z, sx, sy, sz, ws, hs) { return this.push(mat, new T.SphereGeometry(r, ws || 14, hs || 10), x, y, z, 0, 0, 0, sx, sy, sz); }
    cone(mat, r, h, x, y, z, rx, ry, rz, seg) { return this.push(mat, new T.ConeGeometry(r, h, seg || 12), x, y, z, rx, ry, rz); }
    tor(mat, R, t, x, y, z, rx, ry, rz, seg) { return this.push(mat, new T.TorusGeometry(R, t, 6, seg || 18), x, y, z, rx, ry, rz); }
    shape(pts) { const s = new T.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); return s; }
    // side profile [[z,y]...] extruded across X (width)
    side(mat, pts, width, x, y, z, bevel) {
      const b = bevel || 0, d = Math.max(0.01, width - 2 * b);
      const g = new T.ExtrudeGeometry(this.shape(pts), { depth: d, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1, steps: 1 });
      g.translate(0, 0, -d / 2);
      return this.push(mat, g, x, y, z, 0, -PI / 2, 0);
    }
    // top outline [[x,z]...] extruded up by height
    top(mat, pts, h, x, y, z, bevel, ry) {
      const b = bevel || 0, d = Math.max(0.01, h - 2 * b);
      const g = new T.ExtrudeGeometry(this.shape(pts.map(p => [p[0], -p[1]])), { depth: d, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1, steps: 1 });
      g.rotateX(-PI / 2); g.translate(0, b, 0);
      return this.push(mat, g, x, y, z, 0, ry || 0, 0);
    }
    // front profile [[x,y]...] extruded along Z (length)
    front(mat, pts, len, x, y, z, bevel) {
      const b = bevel || 0, d = Math.max(0.01, len - 2 * b);
      const g = new T.ExtrudeGeometry(this.shape(pts), { depth: d, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1, steps: 1 });
      g.translate(0, 0, -d / 2);
      return this.push(mat, g, x, y, z);
    }
    lathe(mat, pts, x, y, z, rx, ry, rz, seg) {
      return this.push(mat, new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg || 16), x, y, z, rx, ry, rz);
    }
    build(mats, name) {
      const g = new T.Group();
      if (name) g.name = name;
      for (const k in this.L) {
        const mesh = new T.Mesh(mergeGeos(this.L[k], this.uvs), mats[k]);
        mesh.castShadow = k !== 'glow' && k !== 'light' && k !== 'red' && k !== 'blur';
        mesh.receiveShadow = k !== 'glow' && k !== 'blur';
        if (k === 'rubber') mesh.userData.track = true;
        g.add(mesh);
      }
      return g;
    }
  }
  SM.MB = MB;
  const grp = (name, x, y, z) => { const g = new T.Group(); if (name) g.name = name; g.position.set(x || 0, y || 0, z || 0); return g; };

  // ------------------------------------------------------------ materials
  const matCache = {};
  SM.getMats = function (fac, pattern, o) {
    o = o || {};
    const key = fac + ':' + pattern + ':' + (o.finish || '') + ':' + (o.glow || '') + ':' + (o.trim || '');
    if (matCache[key]) return matCache[key];
    const p = SM.FACTION[fac].palette;
    const look = SM.SKIN_LOOK[pattern] || {};
    const tex = SM.camoTexture(pattern, p, 256, o.finish === 'weathered');
    let metal = look.metal !== undefined ? look.metal : 0.32, rough = look.rough !== undefined ? look.rough : 0.68;
    if (o.finish === 'matte') { metal = 0.06; rough = 0.97; }
    else if (o.finish === 'gloss') { metal = 0.25; rough = 0.16; }
    else if (o.finish === 'metallic') { metal = 0.85; rough = 0.3; }
    else if (o.finish === 'weathered') { metal = 0.2; rough = 0.88; }
    else if (o.finish === 'pearl') { metal = 0.55; rough = 0.14; }
    const hull = new T.MeshStandardMaterial({ map: tex, metalness: metal, roughness: rough });
    if (o.finish === 'pearl') { hull.color = new T.Color(0xf4eeff); hull.emissive = new T.Color(0x18102a); }
    if (o.finish === 'gloss') hull.envMapIntensity = 1.5;
    if (look.emissive) { hull.emissiveMap = tex; hull.emissive = new T.Color(0xffffff); hull.emissiveIntensity = look.emissive; }
    const glowCol = o.glow ? SM.GLOW[o.glow] : pattern === 'lava' ? 0xff7a2a : pattern === 'gold' ? 0xffd27a : p.glow;
    const m = {
      hull,
      dark: new T.MeshStandardMaterial({ color: p.dark, metalness: 0.45, roughness: 0.72 }),
      metal: new T.MeshStandardMaterial({ color: 0x4a4e52, metalness: 0.85, roughness: 0.36 }),
      gun: new T.MeshStandardMaterial({ color: 0x2b2d30, metalness: 0.8, roughness: 0.42 }),
      rubber: new T.MeshStandardMaterial({ color: 0x9a9a9a, map: SM.trackTexture(), metalness: 0.2, roughness: 0.92 }),
      tire: new T.MeshStandardMaterial({ color: 0x1b1b1c, metalness: 0.05, roughness: 0.92 }),
      glass: new T.MeshStandardMaterial({ color: 0x0e1e28, metalness: 0.7, roughness: 0.08, emissive: new T.Color(p.glow).multiplyScalar(0.12) }),
      glow: new T.MeshBasicMaterial({ color: glowCol, toneMapped: false }),
      accent: new T.MeshStandardMaterial({ color: p.accent, metalness: 0.35, roughness: 0.55 }),
      light: new T.MeshBasicMaterial({ color: 0xfff1d0, toneMapped: false }),
      red: new T.MeshBasicMaterial({ color: 0xff3a24, toneMapped: false }),
      white: new T.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.7 }),
      deck: new T.MeshStandardMaterial({ color: 0x3f4344, roughness: 0.88, metalness: 0.2 }),
      skin: new T.MeshStandardMaterial({ color: 0xc89878, roughness: 0.8 }),
      cloth: new T.MeshStandardMaterial({ color: SM.shade(p.base, -0.15), map: tex, roughness: 0.9 }),
      net: new T.MeshStandardMaterial({ color: 0x4a5a32, roughness: 1 }),
      blur: new T.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.18, depthWrite: false, side: T.DoubleSide }),
      flame: new T.MeshBasicMaterial({ color: 0xffa24a, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }),
    };
    for (const k in m) { if (k !== 'hull' && m[k].color) m[k].color.convertSRGBToLinear(); if (m[k].emissive && k !== 'hull') m[k].emissive.convertSRGBToLinear(); }
    m.blur.opacity = 0.1;
    if (o.trim === 'gold' || o.trim === 'both') { m.accent = new T.MeshStandardMaterial({ color: new T.Color(0xe8b84a).convertSRGBToLinear(), metalness: 1, roughness: 0.22 }); }
    if (o.trim === 'chrome' || o.trim === 'both') { m.gun = new T.MeshStandardMaterial({ color: new T.Color(0xdfe6ec).convertSRGBToLinear(), metalness: 1, roughness: 0.07 }); m.metal = m.gun; }
    m.flameGlow = new T.MeshBasicMaterial({ color: 0x6ab0ff, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
    matCache[key] = m;
    return m;
  };

  // ------------------------------------------------------------ shared parts
  function barrel(mats, wt, len, rad, vis, r) {
    // returns a 'barrel' group pointing +Z (recoils on -Z)
    const b = new MB(0.5);
    const L = len * (vis.gun ? 1.12 : 1);
    if (wt === 'rail') {
      b.box('gun', rad * 1.2, rad * 0.7, L, rad * 1.1, 0, L / 2);
      b.box('gun', rad * 1.2, rad * 0.7, L, -rad * 1.1, 0, L / 2);
      for (let i = 0; i < 5; i++) b.box('glow', rad * 1.0, rad * 0.35, rad * 0.5, 0, 0, L * (0.2 + i * 0.16));
      b.box('dark', rad * 3.6, rad * 2.2, L * 0.22, 0, 0, L * 0.1);
      b.box('metal', rad * 3.4, rad * 0.4, rad * 0.8, 0, 0, L * 0.98);
    } else if (wt === 'plasma') {
      b.cylZ('gun', rad * 1.35, L, 0, 0, L / 2, 14);
      for (let i = 0; i < 4; i++) b.cylZ('glow', rad * 1.55, rad * 0.5, 0, 0, L * (0.3 + i * 0.17), 14);
      b.cylZ('dark', rad * 2.2, L * 0.25, 0, 0, L * 0.12, 10);
      b.cylZ('metal', rad * 1.7, rad * 2, 0, 0, L, 14);
    } else if (wt === 'flame') {
      b.cylZ('gun', rad * 0.9, L * 0.8, 0, 0, L * 0.4, 10);
      b.cylZ('dark', rad * 1.6, L * 0.25, 0, 0, L * 0.18, 10);
      b.cylZ('metal', rad * 1.25, rad * 1.6, 0, 0, L * 0.82, 10);
      b.cylZ('dark', rad * 0.5, L * 0.5, rad * 1.2, -rad * 0.9, L * 0.4, 6);
      b.sph('glow', rad * 0.45, 0, -rad * 0.9, L * 0.9);
    } else if (wt === 'laser') {
      b.cylZ('gun', rad * 0.9, L * 0.9, 0, 0, L * 0.45, 10);
      b.box('dark', rad * 2.6, rad * 2.6, L * 0.4, 0, 0, L * 0.2);
      b.cylZ('glow', rad * 0.7, rad * 0.6, 0, 0, L * 0.91, 10);
      b.tor('metal', rad * 1.2, rad * 0.3, 0, 0, L * 0.6);
    } else {
      b.cylZ('gun', rad, L, 0, 0, L / 2, 12, rad * 0.85);
      b.cylZ('dark', rad * 1.6, L * 0.14, 0, 0, L * 0.55, 12); // fume extractor
      b.cylZ('gun', rad * 1.5, L * 0.18, 0, 0, L * 0.09, 12);
      if (vis.gun || r() < 0.5) { b.box('metal', rad * 3.2, rad * 1.5, rad * 2.2, 0, 0, L - rad); b.box('dark', rad * 3.4, rad * 0.5, rad * 0.5, 0, 0, L - rad * 1.6); }
      else b.cylZ('metal', rad * 1.25, rad * 1.6, 0, 0, L - rad * 0.8, 12);
    }
    const g = b.build(mats, 'barrel');
    return g;
  }
  SM.barrel = barrel;

  const baseStyle = fac => { const s = SM.FACTION[fac].style; return s === 'scrap' ? 'heavy' : s === 'orbital' ? 'sleek' : s; };
  SM.baseStyle = baseStyle;
  function antenna(b, x, y, z, h) { b.cyl('dark', 0.02, 0.035, h, x, y + h / 2, z, 0, 0, 0, 5); b.sph('dark', 0.05, x, y + h, z); }

  // ------------------------------------------------------------ tracked vehicles
  function buildTracked(u, mats, vis, r) {
    const cls = u.cls, st = baseStyle(u.fac);
    const sz = { ltank: [6.2, 3.2, 1.05], mbt: [7.4, 3.7, 1.2], htank: [10.4, 4.7, 1.55], td: [7.8, 3.8, 1.35], arty: [7.4, 3.5, 1.15], aa: [6.8, 3.4, 1.1], laser: [7.2, 3.6, 1.15], assault: [7.4, 3.9, 1.3], amphtank: [7.6, 3.6, 1.25] }[cls] || [7, 3.5, 1.2];
    const casemate = cls === 'td' || cls === 'assault';
    const k = 1 + 0.035 * (u.rank - 1);
    const L = sz[0] * k, W = sz[1] * k, H = sz[2] * k;
    const root = grp(), body = grp('body');
    root.add(body);
    const th = 0.95 * k, tw = W * 0.21;
    const hb = new MB(0.18);
    // tracks
    for (const s of [-1, 1]) {
      const x = s * (W / 2 - tw / 2);
      hb.box('rubber', tw, th * 0.86, L * 0.84, x, th * 0.5, 0);
      hb.cylX('rubber', th * 0.43, tw, x, th * 0.5, L * 0.42, 16);
      hb.cylX('rubber', th * 0.43, tw, x, th * 0.5, -L * 0.42, 16);
      const nw = cls === 'htank' ? 8 : 6;
      for (let i = 0; i < nw; i++) { const z = -L * 0.36 + i * (L * 0.72 / (nw - 1)); hb.cylX('metal', th * 0.33, tw * 1.04, x, th * 0.4, z, 14); hb.cylX('dark', th * 0.14, tw * 1.08, x, th * 0.4, z, 8); }
      // track guide horns and link ridges on the top run
      for (let i = 0; i < 14; i++) hb.box('gun', tw * 0.22, 0.08, 0.14, x, th * 0.94, -L * 0.4 + i * L * 0.8 / 13);
      // return rollers
      for (let i = 0; i < 3; i++) hb.cylX('dark', th * 0.1, tw * 0.5, x, th * 0.85, -L * 0.25 + i * L * 0.25, 8);
      // mud flaps
      hb.box('rubber', tw * 0.95, th * 0.4, 0.06, x, th * 0.62, -L / 2 - 0.12);
      // skirts
      if (st !== 'heavy' || cls === 'htank') hb.box('hull', 0.08, th * 0.55, L * 0.9, s * (W / 2 + 0.02), th * 0.72, 0);
      hb.box('hull', tw + 0.12, 0.09, L * 0.95, x, th + 0.02, 0); // fender
      if (vis.era) for (let i = 0; i < 6; i++) hb.box('accent', 0.16, th * 0.36, L * 0.13, s * (W / 2 + 0.1), th * 0.75, -L * 0.36 + i * L * 0.145);
    }
    // hull profile
    const hw = W * 0.62, base = th * 0.4;
    let prof;
    if (st === 'heavy') prof = [[-L / 2, base], [-L / 2 - 0.1, base + H * 0.9], [-L / 2 + 0.6, th + H], [L / 2 - 1.8, th + H], [L / 2, th + H * 0.25], [L / 2 - 0.5, base]];
    else if (st === 'sleek') prof = [[-L / 2, base + 0.2], [-L / 2, th + H * 0.75], [L / 2 - 2.4, th + H * 0.85], [L / 2, th + H * 0.2], [L / 2 - 0.3, base]];
    else prof = [[-L / 2 + 0.1, base], [-L / 2, th + H * 0.82], [-L / 2 + 0.3, th + H], [L / 2 - 1.5, th + H], [L / 2, th + H * 0.38], [L / 2 - 0.45, base]];
    if (casemate) prof = [[-L / 2, base], [-L / 2, th + H * 1.5], [-L / 2 + 1.2, th + H * 1.75], [L / 2 - 2.6, th + H * 1.75], [L / 2 - 0.3, th + H * 0.45], [L / 2 - 0.5, base]];
    if (cls === 'amphtank') { hb.side('hull', [[L / 2 - 0.5, base], [L / 2 + 1.4, th + H * 0.55], [L / 2 + 0.9, th + H * 0.95], [L / 2 - 0.6, th + H * 0.95]], W * 0.92, 0, 0, 0, 0.05); hb.box('dark', W * 0.8, 0.1, 0.6, 0, th + H * 0.98, L / 2 + 0.4); }
    hb.side('hull', prof, hw, 0, 0, 0, 0.05);
    hb.box('hull', W, 0.14, L * 0.62, 0, th + H * 0.86, -L * 0.08); // deck over tracks
    // rear deck detail
    hb.box('dark', W * 0.5, 0.08, L * 0.18, 0, th + H * 0.99 + (casemate ? H * 0.75 : 0), -L * 0.36);
    for (let i = 0; i < 4; i++) hb.box('gun', W * 0.48, 0.04, 0.05, 0, th + H + 0.02 + (casemate ? H * 0.75 : 0), -L * 0.42 + i * 0.12);
    hb.box('light', 0.22, 0.12, 0.05, W * 0.36, th + H * 0.55, L / 2 - 0.25);
    hb.box('light', 0.22, 0.12, 0.05, -W * 0.36, th + H * 0.55, L / 2 - 0.25);
    hb.box('red', 0.16, 0.1, 0.05, W * 0.38, th + H * 0.6, -L / 2 - 0.02);
    hb.box('red', 0.16, 0.1, 0.05, -W * 0.38, th + H * 0.6, -L / 2 - 0.02);
    hb.box('dark', 0.5, 0.35, 0.6, W * 0.34, th + H * 1.08, -L * 0.3); // stowage
    // glacis bolts, tow hooks, driver hatch, headlight guards, tools, exhaust mufflers
    for (let i = 0; i < 7; i++) hb.cyl('metal', 0.05, 0.05, 0.06, -W * 0.27 + i * W * 0.09, th + H * 0.9, L / 2 - 1.45, PI / 2 - 0.5, 0, 0, 6);
    for (const s2 of [-1, 1]) { hb.tor('metal', 0.14, 0.04, s2 * W * 0.24, th * 0.7, L / 2 - 0.35, 0, 0, 0, 8); hb.tor('metal', 0.14, 0.04, s2 * W * 0.24, th * 0.8, -L / 2 + 0.05, 0, 0, 0, 8); }
    if (!casemate) { hb.cyl('dark', 0.32, 0.34, 0.08, -W * 0.18, th + H + 0.02, L / 2 - 1.2, 0, 0, 0, 10); hb.box('glass', 0.3, 0.06, 0.05, -W * 0.18, th + H + 0.07, L / 2 - 0.95); }
    for (const s2 of [-1, 1]) { hb.box('gun', 0.04, 0.2, 0.04, s2 * W * 0.36 + 0.12, th + H * 0.55, L / 2 - 0.16); hb.box('gun', 0.04, 0.2, 0.04, s2 * W * 0.36 - 0.12, th + H * 0.55, L / 2 - 0.16); }
    hb.box('metal', 0.08, 0.08, 1.2, W * 0.2, th + H + 0.05 + (casemate ? H * 0.75 : 0), -L * 0.2); hb.box('dark', 0.3, 0.05, 0.25, W * 0.2, th + H + 0.05 + (casemate ? H * 0.75 : 0), -L * 0.2 + 0.7);
    for (const s2 of [-1, 1]) { hb.cylZ('gun', 0.16, 0.6, s2 * W * 0.28, th + H * 0.75, -L / 2 - 0.15, 10); hb.cylZ('dark', 0.1, 0.05, s2 * W * 0.28, th + H * 0.75, -L / 2 - 0.46, 8); }
    if (vis.engine) { for (const s of [-1, 1]) { hb.cyl('gun', 0.16, 0.2, 0.7, s * W * 0.3, th + H + 0.3, -L * 0.45, 0, 0, 0, 10); hb.cyl('glow', 0.12, 0.12, 0.05, s * W * 0.3, th + H + 0.66, -L * 0.45, 0, 0, 0, 10); } }
    if (vis.era) for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) hb.box('accent', W * 0.13, 0.12, 0.42, -W * 0.28 + i * W * 0.19, th + H * 0.72 - j * 0.24, L / 2 - 0.55 - j * 0.15, 0.6);
    if (vis.elite) { hb.box('accent', 0.06, 0.06, L * 0.7, W * 0.31, th + H + 0.04, 0); hb.box('accent', 0.06, 0.06, L * 0.7, -W * 0.31, th + H + 0.04, 0); }
    body.add(hb.build(mats));
    // spinning drive sprockets and idlers
    for (const s2 of [-1, 1]) for (const zz of [L * 0.42, -L * 0.42]) {
      const sp = grp('sprocket', s2 * (W / 2 - tw / 2), th * 0.5, zz);
      const sb = new MB(0.5);
      sb.cylX('dark', th * 0.36, tw * 1.08, 0, 0, 0, 12);
      sb.cylX('metal', th * 0.16, tw * 1.14, 0, 0, 0, 8);
      if (zz > 0) for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; sb.box('gun', tw * 1.06, 0.1, 0.12, 0, Math.cos(a) * th * 0.42, Math.sin(a) * th * 0.42, a, 0, 0); }
      else for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; sb.box('gun', tw * 1.1, 0.06, th * 0.5, 0, Math.cos(a) * th * 0.16, Math.sin(a) * th * 0.16, a, 0, 0); }
      sp.add(sb.build(mats)); body.add(sp);
    }
    if (cls === 'amphtank') for (const s2 of [-1, 1]) { const pr = grp('prop', s2 * W * 0.25, th * 0.5, -L / 2 - 0.4); const pb = new MB(0.5); pb.cylZ('dark', 0.35, 0.3, 0, 0, 0, 10); for (let i = 0; i < 3; i++) pb.box('metal', 0.14, 0.6, 0.06, 0, 0.25, 0, 0, 0, 0); pr.add(pb.build(mats)); body.add(pr); }

    const topY = th + H + (casemate ? H * 0.75 : 0);
    const turretR = ({ ltank: 1.1, mbt: 1.35, htank: 1.7, arty: 1.45, aa: 1.15, td: 1, laser: 1.3, assault: 1, amphtank: 1.15 }[cls] || 1.2) * k;
    if (casemate) {
      const gun = grp('gun', 0, th + H * 1.25, L / 2 - 1.5);
      const mant = new MB(0.3); mant.box('hull', 1.2, 1, 0.8, 0, 0, 0.2); mant.sph('dark', 0.55, 0, 0, 0.5, 1, 1, 0.6);
      gun.add(mant.build(mats));
      const br = barrel(mats, u.wt, cls === 'assault' ? L * 0.42 : L * 0.72, (cls === 'assault' ? 0.27 : 0.17) * k, vis, r); br.position.z = 0.6; gun.add(br);
      const cup = new MB(0.3); cup.cyl('dark', 0.38, 0.42, 0.35, -W * 0.18, topY + 0.15, -L * 0.1); antenna(cup, W * 0.25, topY, -L * 0.25, 2.2); if (vis.elite) antenna(cup, -W * 0.28, topY, -L * 0.3, 2.8);
      body.add(cup.build(mats)); body.add(gun);
      return root;
    }
    const tur = grp('turret', 0, topY, cls === 'arty' ? -L * 0.12 : L * 0.02);
    const tb = new MB(0.18);
    const tR = turretR;
    let gunY = 0.5 * k, gunZ = tR * 1.05;
    if (cls === 'aa') {
      tb.cyl('hull', tR * 0.95, tR, 0.9 * k, 0, 0.45 * k, 0, 0, 0, 0, 8);
      tb.box('dark', tR * 1.2, 0.7, tR * 1.1, 0, 1.2 * k, -tR * 0.4);
      gunY = 0.85 * k; gunZ = tR * 0.6;
      tb.box('hull', 0.5, 1.0, 1.2, tR * 0.95, 0.85 * k, 0.2); tb.box('hull', 0.5, 1.0, 1.2, -tR * 0.95, 0.85 * k, 0.2);
    } else if (cls === 'arty') {
      tb.top('hull', [[-tR, -tR * 1.3], [tR, -tR * 1.3], [tR, tR * 0.9], [tR * 0.7, tR * 1.3], [-tR * 0.7, tR * 1.3], [-tR, tR * 0.9]], 1.5 * k, 0, 0, 0, 0.05);
      gunY = 0.85 * k; gunZ = tR * 1.3;
    } else if (st === 'heavy') {
      tb.sph('hull', tR, 0, 0.15, 0, 1.05, 0.52, 1.2, 18, 10);
      tb.box('hull', tR * 1.3, 0.55 * k, tR * 0.9, 0, 0.35 * k, -tR * 0.9);
    } else if (st === 'sleek') {
      tb.top('hull', [[-tR * 0.9, -tR * 1.4], [tR * 0.9, -tR * 1.4], [tR * 1.05, tR * 0.2], [tR * 0.35, tR * 1.25], [-tR * 0.35, tR * 1.25], [-tR * 1.05, tR * 0.2]], 0.75 * k, 0, 0, 0, 0.05);
      gunY = 0.38 * k;
    } else if (st === 'asym') {
      tb.top('hull', [[-tR * 1.0, -tR * 1.2], [tR * 0.6, -tR * 1.2], [tR * 0.85, tR * 0.4], [tR * 0.2, tR * 1.15], [-tR * 0.9, tR * 0.95]], 0.95 * k, -0.2, 0, 0, 0.05);
      tb.box('dark', tR * 0.55, 0.65, tR * 1.1, tR * 0.95, 0.4, -tR * 0.1);
      tb.box('glow', 0.05, 0.1, tR * 1.0, tR * 1.23, 0.5, -tR * 0.1);
      tb.box('glow', tR * 1.2, 0.06, 0.05, -0.2, 0.75, tR * 0.95);
    } else {
      tb.top('hull', [[-tR, -tR * 1.25], [tR, -tR * 1.25], [tR * 1.08, tR * 0.3], [tR * 0.6, tR * 1.1], [-tR * 0.6, tR * 1.1], [-tR * 1.08, tR * 0.3]], 0.95 * k, 0, 0, 0, 0.06);
      tb.box('hull', tR * 1.6, 0.7 * k, 0.9, 0, 0.45 * k, -tR * 1.5); // bustle
    }
    // turret furniture
    if (cls !== 'aa') {
      tb.cyl('dark', 0.36 * k, 0.4 * k, 0.32, -tR * 0.45, 1.05 * k, -tR * 0.3, 0, 0, 0, 10);
      tb.cyl('glass', 0.3 * k, 0.3 * k, 0.1, -tR * 0.45, 1.24 * k, -tR * 0.3, 0, 0, 0, 10);
      tb.box('gun', 0.08, 0.08, 0.8, -tR * 0.45, 1.35 * k, -tR * 0.05);
      tb.box('dark', 0.45, 0.35, 0.35, tR * 0.5, 1.05 * k, tR * 0.1); // gunner sight
      tb.box('glass', 0.38, 0.22, 0.05, tR * 0.5, 1.07 * k, tR * 0.28);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) tb.cyl('dark', 0.07, 0.07, 0.35, s * tR * 0.98, 0.65 * k + i * 0.12, tR * 0.55, -0.8, 0, s * 0.4, 6);
    }
    antenna(tb, tR * 0.7, 0.9 * k, -tR * 1.2, 2.4 * k);
    if (vis.elite) { antenna(tb, -tR * 0.75, 0.9 * k, -tR * 1.25, 3.0 * k); tb.sph('net', 0.55, 0, 1.0 * k, -tR * 1.2, 1.6, 0.5, 0.8, 8, 6); }
    if (vis.era && cls !== 'aa') for (let i = 0; i < 3; i++) { tb.box('accent', 0.45, 0.4, 0.15, tR * 0.75, 0.5 * k, tR * 0.55 - i * 0.5, 0, 0.5); tb.box('accent', 0.45, 0.4, 0.15, -tR * 0.75, 0.5 * k, tR * 0.55 - i * 0.5, 0, -0.5); }
    tur.add(tb.build(mats));

    // multiple-turret super heavy
    if (u.cls === 'htank') {
      for (const s of [-1, 1]) {
        const t2 = grp('turret2', s * W * 0.3, th + H, L * 0.3);
        const sb = new MB(0.3); sb.cyl('hull', 0.55, 0.62, 0.55, 0, 0.28, 0, 0, 0, 0, 10); sb.box('dark', 0.35, 0.3, 0.5, 0, 0.3, 0.45);
        t2.add(sb.build(mats));
        const b2 = barrel(mats, 'cannon', 2.0, 0.08, {}, r); b2.position.set(0, 0.32, 0.5); t2.add(b2);
        body.add(t2);
      }
    }

    const gun = grp('gun', 0, gunY, gunZ);
    const mb = new MB(0.3);
    if (cls === 'aa') {
      mb.box('dark', 0.9, 0.7, 0.7, 0, 0, 0);
      const bl = grp('barrel');
      const bb = new MB(0.5);
      for (const s of [-1, 1]) { bb.cylZ('gun', 0.08, 3.0, s * 0.95, 0.05, 1.5, 10); bb.cylZ('metal', 0.13, 0.4, s * 0.95, 0.05, 2.9, 10); }
      bl.add(bb.build(mats)); gun.add(bl);
      const radar = grp('radar', 0, 1.65 * k, -tR * 0.5);
      const rb = new MB(0.3); rb.box('metal', 2.2, 0.9, 0.08, 0, 0.45, 0, -0.2); rb.cyl('dark', 0.08, 0.08, 0.4, 0, 0, 0); rb.box('glow', 1.6, 0.06, 0.1, 0, 0.6, 0.06, -0.2);
      radar.add(rb.build(mats)); tur.add(radar);
    } else if (cls === 'arty' && (u.fac === 'federation' || u.fac === 'syndicate' || u.fac === 'legion')) {
      // rocket launcher pod
      mb.box('hull', 2.6 * k, 1.4 * k, 3.4 * k, 0, 0.5, 0.6);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) mb.cylZ('dark', 0.2, 0.1, -0.9 * k + i * 0.6 * k, 0.1 + j * 0.42 * k, 0.6 + 1.71 * k, 8);
      gun.rotation.x = -0.45;
      gun.add(grp('barrel'));
    } else {
      mb.box('hull', tR * 0.8, 0.65 * k, 0.6, 0, 0, 0.1);
      const blen = ({ ltank: 4.2, mbt: 5.4, htank: 6.6, arty: 6.4, laser: 4.4, amphtank: 4.4 }[cls] || 4.8) * k;
      const br = barrel(mats, u.wt, blen, (cls === 'ltank' ? 0.11 : 0.15) * k, vis, r);
      br.position.z = 0.3; gun.add(br);
      if (u.cls === 'arty') gun.rotation.x = -0.35;
    }
    gun.add(mb.build(mats));
    tur.add(gun);
    body.add(tur);
    return root;
  }

  // ------------------------------------------------------------ wheeled
  function buildWheeled(u, mats, vis, r) {
    const st = baseStyle(u.fac), k = 1 + 0.03 * (u.rank - 1), cls = u.cls;
    const root = grp(), body = grp('body');
    root.add(body);
    const scout = cls === 'scout', truck = cls === 'mlrs' || cls === 'ew';
    const D = { scout: [5.0, 2.6, 0.7, 0.6, 2], apc: [7.6, 3.2, 1.6, 0.62, 4], armcar: [6.6, 3.0, 1.25, 0.66, 3], atgm: [6.4, 2.9, 1.35, 0.62, 3], mlrs: [8.8, 3.0, 1.1, 0.68, 3], ew: [8.0, 3.0, 1.2, 0.66, 3] }[cls] || [7, 3, 1.4, 0.62, 3];
    const L = D[0] * k, W = D[1] * k, H = D[2] * k, wr = D[3] * k, axles = D[4];
    const hb = new MB(0.2);
    const base = wr * 0.9;
    if (scout) {
      hb.side('hull', [[-L / 2, base], [-L / 2 + 0.2, base + H], [L / 2 - 1.2, base + H * 0.9], [L / 2, base + 0.25], [L / 2 - 0.3, base - 0.2]], W * 0.8, 0, 0, 0, 0.04);
      const cy = base + H;
      for (const s of [-1, 1]) {
        hb.cyl('gun', 0.06, 0.06, 1.6, s * W * 0.36, cy + 0.75, 0.6, -0.35, 0, 0, 6);
        hb.cyl('gun', 0.06, 0.06, 1.5, s * W * 0.36, cy + 0.7, -0.9, 0.25, 0, 0, 6);
        hb.cyl('gun', 0.05, 0.05, 1.2, s * W * 0.36, cy + 0.2, -1.6, 0.9, 0, 0, 6);
      }
      hb.cylX('gun', 0.06, W * 0.72, 0, cy + 1.45, 0.15, 6); hb.cylX('gun', 0.06, W * 0.72, 0, cy + 1.4, -0.6, 6);
      hb.box('dark', 0.6, 0.6, 0.6, -0.45, cy + 0.25, 0.3); hb.box('dark', 0.6, 0.6, 0.6, 0.45, cy + 0.25, 0.3);
      hb.box('skin', 0.25, 0.3, 0.25, -0.45, cy + 0.75, 0.3); hb.sph('hull', 0.17, -0.45, cy + 0.95, 0.3);
      hb.box('glass', W * 0.66, 0.5, 0.05, 0, cy + 0.5, 1.15, -0.4);
      hb.box('light', 0.18, 0.18, 0.05, 0.6, cy + 1.5, 0.45); hb.box('light', 0.18, 0.18, 0.05, -0.6, cy + 1.5, 0.45);
      hb.box('dark', W * 0.7, 0.5, 0.8, 0, cy + 0.1, -L * 0.38);
      hb.cylX('tire', 0.45, 0.3, 0, cy + 0.55, -L * 0.45, 12);
      for (const s of [-1, 1]) hb.box('hull', 0.5, 0.12, 1.4, s * (W / 2 + 0.1), base + 0.55, L * 0.32);
    } else if (truck) {
      // cab
      const cabL = L * 0.26, cz = L / 2 - cabL / 2;
      hb.side('hull', [[cz - cabL / 2, base], [cz - cabL / 2, base + H * 1.9], [cz + cabL * 0.15, base + H * 1.9], [cz + cabL / 2, base + H * 1.1], [cz + cabL / 2, base]], W * 0.92, 0, 0, 0, 0.06);
      hb.box('glass', W * 0.8, H * 0.55, 0.05, 0, base + H * 1.45, cz + cabL * 0.33, -0.55);
      for (const s of [-1, 1]) { hb.box('glass', 0.05, H * 0.5, cabL * 0.4, s * W * 0.47, base + H * 1.5, cz - cabL * 0.1); hb.box('dark', 0.05, 0.3, 0.2, s * (W * 0.5 + 0.2), base + H * 1.5, cz + cabL * 0.25); }
      hb.box('dark', W * 0.7, 0.3, 0.3, 0, base + H * 0.6, L / 2 + 0.05);
      hb.box('light', 0.24, 0.16, 0.05, W * 0.35, base + H * 0.7, L / 2 + 0.02); hb.box('light', 0.24, 0.16, 0.05, -W * 0.35, base + H * 0.7, L / 2 + 0.02);
      // chassis / flatbed
      hb.box('dark', W * 0.5, 0.35, L * 0.75, 0, base + 0.1, -L * 0.1);
      hb.box('hull', W * 0.95, 0.2, L * 0.68, 0, base + H * 0.55, -L * 0.15);
      for (const s of [-1, 1]) { hb.box('hull', W * 0.06, H * 0.5, L * 0.68, s * W * 0.47, base + H * 0.75, -L * 0.15); hb.cylZ('gun', 0.22, 1.4, s * W * 0.32, base + 0.05, L * 0.1, 10); }
      hb.box('red', 0.16, 0.1, 0.05, W * 0.4, base + H * 0.7, -L / 2 - 0.02); hb.box('red', 0.16, 0.1, 0.05, -W * 0.4, base + H * 0.7, -L / 2 - 0.02);
      if (cls === 'ew') { hb.box('hull', W * 0.88, H * 1.4, L * 0.42, 0, base + H * 1.3, -L * 0.18); hb.box('dark', W * 0.3, 0.4, 0.4, W * 0.2, base + H * 2.2, -L * 0.3); for (const s of [-1, 1]) antenna(hb, s * W * 0.35, base + H * 2, -L * 0.36, 3.6 * k); hb.cyl('dark', 0.1, 0.14, 4 * k, -W * 0.25, base + H * 2 + 2 * k, -L * 0.05, 0, 0, 0, 6); }
      if (vis.era) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) hb.box('accent', 0.12, 0.6, 0.9, s * (W * 0.5 + 0.05), base + H * 1.3, cz - 0.6 + i * 0.5 - 0.6);
    } else {
      let prof = [[-L / 2, base], [-L / 2, base + H * 0.9], [-L / 2 + 0.4, base + H], [L / 2 - 1.6, base + H], [L / 2, base + H * 0.35], [L / 2 - 0.6, base - 0.1]];
      if (st === 'sleek') prof = [[-L / 2, base], [-L / 2, base + H * 0.85], [L / 2 - 2.4, base + H], [L / 2, base + H * 0.25], [L / 2 - 0.4, base - 0.1]];
      if (cls === 'armcar') prof = [[-L / 2, base], [-L / 2 + 0.2, base + H * 0.95], [L / 2 - 1.8, base + H], [L / 2 - 0.2, base + H * 0.45], [L / 2, base + 0.1]];
      hb.side('hull', prof, W * 0.86, 0, 0, 0, 0.06);
      for (const s of [-1, 1]) { hb.box('hull', 0.12, H * 0.5, L * 0.86, s * W * 0.45, base + H * 0.55, -0.1, 0, 0, s * -0.25); }
      if (cls === 'apc') { hb.box('dark', 0.05, 0.9, 0.7, W * 0.47, base + H * 0.45, -L * 0.3); hb.box('dark', W * 0.6, H * 0.8, 0.06, 0, base + H * 0.5, -L / 2 - 0.02); for (let i = 0; i < 3; i++) hb.box('dark', 0.15, 0.15, 0.15, -W * 0.3 + i * W * 0.3, base + H + 0.05, -L * 0.25); }
      for (let i = 0; i < 3; i++) hb.box('glass', 0.25, 0.12, 0.05, -0.6 + i * 0.6, base + H * 0.92, L / 2 - 1.55);
      hb.box('light', 0.2, 0.12, 0.05, W * 0.33, base + H * 0.45, L / 2 - 0.42); hb.box('light', 0.2, 0.12, 0.05, -W * 0.33, base + H * 0.45, L / 2 - 0.42);
      hb.box('red', 0.15, 0.1, 0.05, W * 0.35, base + H * 0.6, -L / 2 - 0.02); hb.box('red', 0.15, 0.1, 0.05, -W * 0.35, base + H * 0.6, -L / 2 - 0.02);
      hb.box('dark', W * 0.5, 0.25, 1.0, 0, base + H + 0.1, -L * 0.35);
      for (const s of [-1, 1]) hb.box('gun', 0.08, 0.08, 1.4, s * W * 0.3, base + H + 0.06, -L * 0.1);
      if (vis.era) for (const s of [-1, 1]) for (let i = 0; i < 5; i++) hb.box('accent', 0.12, 0.5, 0.9, s * (W * 0.48 + 0.08), base + H * 0.55, -L * 0.35 + i * 1.0 * L / 7.6);
    }
    // wheel arches / fenders
    if (!scout) for (let i = 0; i < axles; i++) {
      const z = axles === 3 ? (i === 0 ? L * 0.3 : i === 1 ? -L * 0.12 : -L * 0.3) : -L * 0.34 + i * (L * 0.66 / 3);
      for (const s of [-1, 1]) hb.box('dark', 0.55 * k, 0.08, wr * 2.3, s * (W / 2 - 0.12), wr * 2.05, z);
    }
    if (vis.engine) for (const s of [-1, 1]) hb.cyl('gun', 0.12, 0.15, 0.6, s * W * 0.32, base + H + 0.2, -L * 0.45, 0, 0, 0, 8);
    antenna(hb, W * 0.3, base + H, -L * 0.4, 2.2);
    if (vis.elite) { antenna(hb, -W * 0.3, base + H, -L * 0.4, 2.8); hb.box('accent', W * 0.88, 0.05, 0.3, 0, base + H + 0.02, L * 0.1); }
    body.add(hb.build(mats));
    // wheels (front axle steers)
    for (let i = 0; i < axles; i++) {
      const z = axles === 2 ? (i ? -L * 0.32 : L * 0.3) : axles === 3 ? (i === 0 ? L * 0.3 : i === 1 ? -L * 0.12 : -L * 0.3) : -L * 0.34 + (3 - i) * (L * 0.66 / 3);
      for (const s of [-1, 1]) {
        const steer = i === 0 || (axles === 4 && i === 1);
        const holder = grp(steer ? 'steer' : '', s * (W / 2 - 0.12), wr, z);
        const w = grp('wheel');
        const wb = new MB(0.5);
        wb.cylX('tire', wr, 0.5 * k, 0, 0, 0, 18);
        for (let t = 0; t < 12; t++) { const a = t / 12 * PI * 2; wb.box('tire', 0.52 * k, 0.08, wr * 0.3, 0, Math.cos(a) * wr, Math.sin(a) * wr, a, 0, 0); }
        wb.cylX('metal', wr * 0.55, 0.52 * k, s * 0.02, 0, 0, 8);
        for (let t = 0; t < 5; t++) { const a = t / 5 * PI * 2; wb.cylX('dark', 0.05, 0.56 * k, s * 0.03, Math.cos(a) * wr * 0.32, Math.sin(a) * wr * 0.32, 6); }
        w.add(wb.build(mats));
        holder.add(w); body.add(holder);
      }
    }
    // turret / mission module
    let tY = base + H + (scout ? 1.45 : 0), tZ = scout ? -0.2 : L * 0.05;
    if (truck) { tY = base + H * 0.65; tZ = -L * 0.2; }
    const tur = grp('turret', 0, tY, tZ);
    const tb = new MB(0.25);
    let gun;
    if (scout) { tb.cyl('dark', 0.3, 0.3, 0.3, 0, 0.15, 0); tb.box('hull', 0.5, 0.45, 0.08, 0, 0.45, 0.3); }
    else if (cls === 'mlrs') { tb.cyl('dark', 0.9, 1.0, 0.4, 0, 0.2, 0, 0, 0, 0, 12); }
    else if (cls === 'ew') { tb.cyl('dark', 0.3, 0.35, 0.3, 0, H * 1.9 + 0.15, -L * 0.05, 0, 0, 0, 8); }
    else if (cls === 'armcar') { tb.top('hull', [[-0.9, -1.1], [0.9, -1.1], [1.05, 0.3], [0.55, 1.0], [-0.55, 1.0], [-1.05, 0.3]], 0.75 * k, 0, 0, 0, 0.05); tb.box('hull', 1.4, 0.5, 0.6, 0, 0.35, -1.25); tb.cyl('dark', 0.28, 0.3, 0.25, -0.45, 0.85, -0.3, 0, 0, 0, 8); }
    else { tb.top('hull', [[-0.8, -0.9], [0.8, -0.9], [0.95, 0.4], [0.5, 0.9], [-0.5, 0.9], [-0.95, 0.4]], 0.7 * k, 0, 0, 0, 0.05); tb.box('dark', 0.35, 0.3, 0.3, 0.55, 0.85, 0); tb.box('glass', 0.3, 0.16, 0.05, 0.55, 0.87, 0.16); }
    tur.add(tb.build(mats));
    if (cls === 'mlrs') {
      gun = grp('gun', 0, 0.6, 0); gun.rotation.x = -0.5;
      const pb = new MB(0.3); pb.box('hull', 2.4 * k, 1.3 * k, 3.6 * k, 0, 0.4, 0.4);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) pb.cylZ('dark', 0.18, 0.1, -0.84 * k + i * 0.42 * k, 0.0 + j * 0.4 * k, 0.4 + 1.81 * k, 8);
      gun.add(pb.build(mats)); gun.add(grp('barrel'));
    } else if (cls === 'ew') {
      gun = grp('gun', 0, 0.4, 0.3); gun.add(barrel(mats, u.wt, 1.4, 0.06, vis, r));
      const rad = grp('radar', 0, H * 1.9 + 0.5, -L * 0.05);
      const rb = new MB(0.3); rb.cyl('metal', 1.4 * k, 0.6, 0.12, 0, 0.9, 0, PI / 2 - 0.4, 0, 0, 18); rb.cyl('dark', 0.08, 0.08, 1, 0, 0.4, 0); rb.cone('glow', 0.12, 0.6, 0, 0.9, 0.5, PI / 2 - 0.4, 0, 0, 8);
      rad.add(rb.build(mats)); body.add(rad);
    } else if (cls === 'atgm') {
      gun = grp('gun', 0, 0.75, 0.1);
      const lb = new MB(0.3); for (const s of [-1, 1]) { lb.box('hull', 0.55, 0.55, 1.8, s * 0.95, 0.1, 0.2); lb.box('dark', 0.45, 0.45, 0.05, s * 0.95, 0.1, 1.11); lb.cylZ('red', 0.12, 0.04, s * 0.95, 0.1, 1.14, 8); }
      lb.box('glass', 0.3, 0.25, 0.3, 0, 0.35, 0.4);
      gun.add(lb.build(mats)); gun.add(grp('barrel'));
    } else {
      gun = grp('gun', 0, scout ? 0.3 : 0.4, scout ? 0.2 : cls === 'armcar' ? 1.0 : 0.8);
      const gb = new MB(0.4); gb.box('dark', 0.4, 0.35, 0.6, 0, 0, 0); gun.add(gb.build(mats));
      const br = barrel(mats, u.wt, scout ? 1.5 : cls === 'armcar' ? 3.4 : 2.6, scout ? 0.06 : cls === 'armcar' ? 0.11 : 0.09, vis, r);
      br.position.z = 0.25; gun.add(br);
      if (scout && u.rank >= 3) { const atg = new MB(0.4); atg.cylZ('dark', 0.12, 1.0, 0.45, 0.2, 0.1, 8); atg.cylZ('dark', 0.12, 1.0, -0.45, 0.2, 0.1, 8); gun.add(atg.build(mats)); }
    }
    tur.add(gun);
    body.add(tur);
    return root;
  }

  // ------------------------------------------------------------ hover tank
  function buildHover(u, mats, vis, r) {
    const k = 1 + 0.03 * (u.rank - 1), st = baseStyle(u.fac);
    const root = grp(), body = grp('body', 0, 0, 0);
    root.add(body);
    const L = 7.2 * k, W = 3.9 * k, H = 1.2 * k, y0 = 1.0;
    const hb = new MB(0.2);
    hb.front('hull', [[-W / 2, 0], [W / 2, 0], [W / 2 + 0.2, H * 0.6], [W / 2 - 0.5, H], [-W / 2 + 0.5, H], [-W / 2 - 0.2, H * 0.6]], L * 0.82, 0, y0, -0.2, 0.06);
    hb.side('hull', [[L * 0.3, y0], [L * 0.3, y0 + H], [L / 2, y0 + H * 0.3], [L / 2 - 0.2, y0]], W * 0.9, 0, 0, 0, 0.04);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      hb.cyl('dark', 0.85, 1.0, 0.5, sx * W * 0.38, y0 - 0.1, sz * L * 0.3, 0, 0, 0, 14);
      hb.cyl('glow', 0.75, 0.75, 0.05, sx * W * 0.38, y0 - 0.37, sz * L * 0.3, 0, 0, 0, 14);
    }
    for (const s of [-1, 1]) { hb.box('dark', 0.5, 0.6, 2.2, s * (W / 2 + 0.05), y0 + H * 0.55, -L * 0.15); hb.box('glow', 0.06, 0.2, 1.8, s * (W / 2 + 0.31), y0 + H * 0.55, -L * 0.15); }
    hb.box('glow', W * 0.6, 0.12, 0.05, 0, y0 + H * 0.4, -L / 2 * 0.82 - 0.1);
    hb.box('light', 0.3, 0.1, 0.05, W * 0.3, y0 + H * 0.55, L / 2 - 0.15); hb.box('light', 0.3, 0.1, 0.05, -W * 0.3, y0 + H * 0.55, L / 2 - 0.15);
    if (vis.era) for (let i = 0; i < 4; i++) hb.box('accent', 0.7, 0.12, 0.6, -1.05 + i * 0.7, y0 + H + 0.06, L * 0.12);
    if (vis.engine) for (const s of [-1, 1]) hb.cylZ('glow', 0.25, 0.1, s * W * 0.25, y0 + H * 0.5, -L * 0.42, 12);
    if (vis.elite) antenna(hb, -W * 0.3, y0 + H, -L * 0.3, 2.6);
    body.add(hb.build(mats));
    const tur = grp('turret', 0, y0 + H, -0.2);
    const tb = new MB(0.25);
    const tR = 1.25 * k;
    tb.top('hull', [[-tR, -tR * 1.1], [tR, -tR * 1.1], [tR * 1.1, tR * 0.4], [0, tR * 1.3], [-tR * 1.1, tR * 0.4]], 0.7 * k, 0, 0, 0, 0.05);
    tb.box('glow', tR * 1.4, 0.06, 0.05, 0, 0.5, tR * 0.85, 0, 0, 0);
    antenna(tb, tR * 0.6, 0.7, -tR * 0.8, 2.0);
    tur.add(tb.build(mats));
    const gun = grp('gun', 0, 0.38 * k, tR * 0.9);
    const br = barrel(mats, u.wt, 4.6 * k, 0.15 * k, vis, r); gun.add(br);
    tur.add(gun); body.add(tur);
    return root;
  }

  // ------------------------------------------------------------ mechs
  function legChain(b, side, mats, a, bLen, thick, style) {
    // returns hip group with knee/ankle children
    const hip = grp('hip' + side);
    const thigh = new MB(0.3);
    thigh.box('hull', thick, a, thick * 1.2, 0, -a / 2, 0);
    thigh.sph('dark', thick * 0.62, 0, 0, 0);
    if (style === 'armored') thigh.box('accent', thick * 1.1, a * 0.6, 0.12, 0, -a * 0.45, thick * 0.65);
    hip.add(thigh.build(mats));
    const knee = grp('knee' + side, 0, -a, 0);
    const shin = new MB(0.3);
    shin.sph('dark', thick * 0.58, 0, 0, 0);
    shin.box('hull', thick * 0.9, bLen, thick * 1.05, 0, -bLen / 2, 0);
    shin.box('dark', thick * 0.7, bLen * 0.5, 0.15, 0, -bLen * 0.5, -thick * 0.55);
    shin.cyl('metal', thick * 0.12, thick * 0.12, bLen * 0.7, thick * 0.55, -bLen * 0.45, thick * 0.3, 0, 0, 0, 6);
    shin.cyl('metal', thick * 0.12, thick * 0.12, bLen * 0.7, -thick * 0.55, -bLen * 0.45, thick * 0.3, 0, 0, 0, 6);
    shin.cyl('gun', thick * 0.18, thick * 0.18, bLen * 0.35, thick * 0.55, -bLen * 0.2, thick * 0.3, 0, 0, 0, 6);
    shin.cyl('gun', thick * 0.18, thick * 0.18, bLen * 0.35, -thick * 0.55, -bLen * 0.2, thick * 0.3, 0, 0, 0, 6);
    knee.add(shin.build(mats));
    const ankle = grp('ankle' + side, 0, -bLen, 0);
    const foot = new MB(0.3);
    foot.box('dark', thick * 1.3, thick * 0.35, thick * 2.2, 0, -thick * 0.18, thick * 0.35);
    foot.box('hull', thick * 1.0, thick * 0.25, thick * 0.9, 0, -thick * 0.05, thick * 1.3, 0.3);
    for (const x of [-0.4, 0, 0.4]) foot.cone('gun', thick * 0.14, thick * 0.5, x * thick, -thick * 0.2, thick * 1.55, PI / 2, 0, 0, 5);
    foot.box('dark', thick * 0.8, thick * 0.3, thick * 0.5, 0, -thick * 0.15, -thick * 0.85);
    ankle.add(foot.build(mats));
    knee.add(ankle); hip.add(knee);
    return hip;
  }

  function buildMech(u, mats, vis, r) {
    const cls = u.cls, st = baseStyle(u.fac);
    const k = (SM.CLASSES[cls].scale || 1) * (1 + 0.03 * (u.rank - 1));
    const root = grp();
    const body = grp('body');
    root.add(body);
    if (cls === 'spider') return buildSpider(u, mats, vis, r, root, body, k);
    if (cls === 'lmech' || cls === 'scoutmech') {
      // reverse-joint walker
      const a = 2.0 * k, b = 2.2 * k, th = 0.42 * k;
      const hipY = 3.4 * k;
      const pelvis = grp('pelvis', 0, hipY, 0);
      body.add(pelvis);
      for (const s of [-1, 1]) {
        const hip = legChain(null, s < 0 ? 'L' : 'R', mats, a, b, th, st === 'heavy' ? 'armored' : '');
        hip.position.set(s * 0.95 * k, 0, 0);
        hip.userData.rest = [0.7, -1.4, 0.7]; hip.userData.reverse = true;
        pelvis.add(hip);
      }
      const torso = grp('torso', 0, 0.3 * k, 0);
      const tb = new MB(0.25);
      if (st === 'sleek' || st === 'asym') tb.side('hull', [[-1.6 * k, 0], [-1.4 * k, 1.3 * k], [0.8 * k, 1.4 * k], [2.0 * k, 0.6 * k], [1.6 * k, -0.2 * k], [-1.0 * k, -0.4 * k]], 1.9 * k, 0, 0, 0, 0.08);
      else { tb.sph('hull', 1.25 * k, 0, 0.45 * k, 0.1, 1, 0.75, 1.3, 16, 10); tb.box('hull', 1.6 * k, 0.8 * k, 1.4 * k, 0, 0.3 * k, -1.0 * k); }
      if (cls === 'scoutmech') { tb.sph('dark', 0.45 * k, 0, 1.0 * k, 1.0 * k); tb.cyl('glow', 0.28 * k, 0.28 * k, 0.05, 0, 1.0 * k, 1.42 * k, PI / 2, 0, 0, 12); antenna(tb, 0.3 * k, 1.2 * k, -0.6 * k, 2.6 * k); antenna(tb, -0.3 * k, 1.2 * k, -0.6 * k, 2.0 * k); }
      else tb.box('glass', 1.1 * k, 0.4 * k, 0.6 * k, 0, 0.85 * k, 1.1 * k, 0.5);
      tb.box('dark', 1.4 * k, 0.6 * k, 0.8 * k, 0, -0.1 * k, -0.9 * k);
      tb.cyl('glow', 0.12, 0.12, 0.05, 0.4 * k, 0.75 * k, 1.5 * k, PI / 2, 0, 0, 8);
      antenna(tb, -0.5 * k, 1.1 * k, -0.9 * k, 1.8 * k);
      if (vis.era) { tb.box('accent', 2.1 * k, 0.15, 1.6 * k, 0, 1.25 * k, -0.1); }
      if (vis.elite) { tb.box('accent', 0.08, 0.08, 2.4 * k, 0.6 * k, 1.2 * k, 0); antenna(tb, 0.5 * k, 1.1 * k, -0.9 * k, 2.4 * k); }
      if (vis.engine) for (const s of [-1, 1]) tb.cylZ('glow', 0.18, 0.1, s * 0.5 * k, 0.4 * k, -1.65 * k, 10);
      torso.add(tb.build(mats));
      const gun = grp('gun', 0, 0.2 * k, 0.6 * k);
      for (const s of [-1, 1]) {
        const pod = new MB(0.3); pod.box('dark', 0.5 * k, 0.55 * k, 1.4 * k, s * 1.35 * k, 0, 0); gun.add(pod.build(mats));
        const br = barrel(mats, u.wt, 1.8 * k, 0.09 * k, vis, r); br.position.set(s * 1.35 * k, 0, 0.6 * k); gun.add(br);
      }
      torso.add(gun);
      pelvis.add(torso);
      return root;
    }
    // humanoid: mmech / hmech / titan
    const heavy = cls === 'hmech' || cls === 'flamemech', titan = cls === 'titan', jump = cls === 'jumpmech', art = cls === 'artmech', flameM = cls === 'flamemech';
    const a = (heavy ? 1.7 : 2.0) * k, b = (heavy ? 1.8 : 2.1) * k, th = (heavy ? 0.75 : 0.55) * k;
    const hipY = (a + b) * 0.975 + th * 0.35 + 0.1 * k;
    const pelvis = grp('pelvis', 0, hipY, 0);
    body.add(pelvis);
    const pb = new MB(0.3);
    pb.box('dark', 1.6 * k, 0.6 * k, 1.1 * k, 0, 0, 0);
    if (titan) for (const s of [-1, 1]) pb.box('hull', 0.4 * k, 1.2 * k, 1.4 * k, s * 1.25 * k, -0.6 * k, 0, 0, 0, s * 0.2);
    pelvis.add(pb.build(mats));
    for (const s of [-1, 1]) {
      const hip = legChain(null, s < 0 ? 'L' : 'R', mats, a, b, th, heavy || titan ? 'armored' : '');
      hip.position.set(s * (heavy ? 1.15 : 0.95) * k, -0.1 * k, 0);
      hip.userData.rest = [-0.25, 0.45, -0.2];
      pelvis.add(hip);
    }
    const torso = grp('torso', 0, 0.35 * k, 0);
    const tb = new MB(0.25);
    const tw = (heavy ? 3.0 : 2.4) * k, tH = (heavy ? 2.0 : 2.1) * k, td = (heavy ? 2.0 : 1.6) * k;
    if (st === 'heavy' || heavy) tb.front('hull', [[-tw / 2, 0], [tw / 2, 0], [tw / 2 + 0.3, tH * 0.7], [tw / 2 - 0.2, tH], [-tw / 2 + 0.2, tH], [-tw / 2 - 0.3, tH * 0.7]], td, 0, 0, 0, 0.08);
    else if (st === 'sleek') tb.front('hull', [[-tw * 0.3, 0], [tw * 0.3, 0], [tw / 2 + 0.2, tH * 0.85], [tw * 0.3, tH], [-tw * 0.3, tH], [-tw / 2 - 0.2, tH * 0.85]], td, 0, 0, 0, 0.08);
    else tb.front('hull', [[-tw * 0.4, 0], [tw * 0.4, 0], [tw / 2, tH * 0.5], [tw / 2, tH], [-tw / 2, tH], [-tw / 2, tH * 0.5]], td, 0, 0, 0, 0.08);
    tb.box('dark', tw * 0.7, tH * 0.7, 0.9 * k, 0, tH * 0.55, -td / 2 - 0.35 * k); // backpack
    for (const s of [-1, 1]) { tb.cyl('dark', 0.25 * k, 0.35 * k, 0.5 * k, s * tw * 0.22, tH * 0.25, -td / 2 - 0.85 * k, PI / 2, 0, 0, 10); tb.cyl('glow', 0.22 * k, 0.22 * k, 0.05, s * tw * 0.22, tH * 0.25, -td / 2 - 1.12 * k, PI / 2, 0, 0, 10); }
    // head / cockpit
    if (st === 'asym') { tb.box('dark', 0.9 * k, 0.6 * k, 0.9 * k, 0.4 * k, tH + 0.3 * k, 0.2 * k); tb.box('glow', 0.7 * k, 0.12 * k, 0.05, 0.4 * k, tH + 0.35 * k, 0.66 * k); }
    else if (st === 'sleek') { tb.side('dark', [[-0.5 * k, 0], [-0.4 * k, 0.6 * k], [0.4 * k, 0.55 * k], [0.7 * k, 0.1 * k]], 0.8 * k, 0, tH, 0.1 * k, 0.04); tb.box('glow', 0.6 * k, 0.1 * k, 0.05, 0, tH + 0.35 * k, 0.65 * k, -0.4); tb.cone('accent', 0.08 * k, 0.8 * k, 0, tH + 0.9 * k, 0, 0, 0, 0, 6); }
    else { tb.box('dark', 1.0 * k, 0.7 * k, 0.9 * k, 0, tH + 0.35 * k, 0.2 * k); tb.box('glass', 0.8 * k, 0.25 * k, 0.05, 0, tH + 0.42 * k, 0.66 * k); }
    tb.box('glass', tw * 0.5, 0.35 * k, 0.05, 0, tH * 0.7, td / 2 + 0.06);
    if (heavy || titan) for (const s of [-1, 1]) { // shoulder missile racks
      tb.box('hull', 1.3 * k, 1.1 * k, 1.6 * k, s * (tw / 2 + 0.2 * k), tH + 0.3 * k, -0.1 * k);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) tb.cylZ('dark', 0.16 * k, 0.1, s * (tw / 2 + 0.2 * k) - 0.35 * k + i * 0.35 * k, tH + 0.1 * k + j * 0.42 * k, 0.72 * k, 8);
    }
    if (titan) { tb.cyl('glow', 0.5 * k, 0.5 * k, 0.1, 0, tH * 0.55, td / 2 + 0.08, PI / 2, 0, 0, 16); tb.box('accent', tw * 1.15, 0.2 * k, 0.4 * k, 0, tH * 0.98, td * 0.35); for (let i = 0; i < 4; i++) tb.box('glow', 0.12 * k, 0.6 * k, 0.05, -tw * 0.3 + i * tw * 0.2, tH * 0.55, -td / 2 - 0.82 * k); }
    if (jump) for (const s of [-1, 1]) { tb.cyl('hull', 0.45 * k, 0.55 * k, 1.8 * k, s * tw * 0.3, tH * 0.55, -td / 2 - 0.9 * k, 0, 0, 0, 12); tb.cyl('dark', 0.4 * k, 0.3 * k, 0.4 * k, s * tw * 0.3, tH * 0.55 - 1.05 * k, -td / 2 - 0.9 * k, 0, 0, 0, 12); tb.box('accent', 0.1 * k, 1.4 * k, 0.4 * k, s * (tw * 0.3 + 0.5 * k), tH * 0.6, -td / 2 - 0.9 * k); }
    if (flameM) for (const s of [-1, 1]) { tb.cyl('accent', 0.42 * k, 0.42 * k, 1.9 * k, s * tw * 0.26, tH * 0.6, -td / 2 - 0.8 * k, 0, 0, 0, 14); tb.sph('accent', 0.42 * k, s * tw * 0.26, tH * 0.6 + 0.95 * k, -td / 2 - 0.8 * k); tb.box('red', 0.3 * k, 0.12 * k, 0.05, s * tw * 0.26, tH * 0.7, -td / 2 - 1.23 * k); }
    if (art) { tb.box('dark', tw * 0.6, 0.5 * k, td * 0.8, 0, tH + 0.25 * k, -td * 0.25); }
    if (vis.era) { tb.box('accent', tw * 0.8, tH * 0.35, 0.18, 0, tH * 0.35, td / 2 + 0.1); }
    if (vis.elite) { antenna(tb, tw * 0.35, tH, -td * 0.3, 2.4 * k); tb.box('accent', 0.15, tH * 0.8, 0.05, -tw * 0.3, tH * 0.5, td / 2 + 0.12); }
    if (vis.engine) for (const s of [-1, 1]) tb.cyl('gun', 0.15 * k, 0.2 * k, 1.0 * k, s * tw * 0.3, tH * 1.05, -td / 2 - 0.4 * k, 0, 0, 0, 8);
    torso.add(tb.build(mats));
    // arms
    const armLen = (heavy ? 1.6 : 1.8) * k;
    for (const s of [-1, 1]) {
      const arm = grp(s < 0 ? 'armL' : 'armR', s * (tw / 2 + (heavy ? 0.6 : 0.45) * k), tH * 0.82, 0);
      const ab = new MB(0.3);
      ab.sph('hull', 0.65 * k, 0, 0, 0, 1.1, 1, 1.1);
      ab.box('dark', 0.55 * k, armLen, 0.55 * k, 0, -armLen / 2, 0);
      ab.box('hull', 0.7 * k, 0.9 * k, 1.1 * k, 0, -armLen, 0.3 * k);
      if (s < 0 && !heavy && !titan && !art) ab.box(st === 'heavy' ? 'hull' : 'accent', 0.2 * k, 2.4 * k, 1.6 * k, -0.45 * k, -armLen * 0.9, 0.3 * k); // shield
      arm.add(ab.build(mats));
      if (s > 0 || heavy || titan || art) {
        const gun = grp(art ? 'gunS' : s > 0 ? 'gun' : 'gunL', 0, -armLen, 0.6 * k);
        const gb = new MB(0.3); gb.box('dark', 0.6 * k, 0.6 * k, 1.2 * k, 0, 0, 0.3 * k); gun.add(gb.build(mats));
        let wt = u.wt;
        if (cls === 'hmech') wt = 'mg';
        if (art) wt = 'mg';
        const br = barrel(mats, wt, (titan ? 3.4 : heavy ? 1.9 : 2.6) * k, (titan ? 0.22 : heavy ? 0.12 : 0.13) * k, vis, r);
        if (art) br.name = 'barrelS';
        br.position.z = 0.8 * k; gun.add(br);
        if (cls === 'hmech') { const gx = new MB(0.3); for (let i = 0; i < 6; i++) { const a2 = i * PI / 3; gx.cylZ('gun', 0.06 * k, 1.9 * k, Math.cos(a2) * 0.16 * k, Math.sin(a2) * 0.16 * k, 1.75 * k, 6); } br.add(gx.build(mats)); }
        arm.add(gun);
      }
      torso.add(arm);
    }
    if (art) { // back-mounted howitzer
      const hg = grp('gun', 0, tH + 0.9 * k, -0.2 * k); hg.rotation.x = -0.45;
      const hb2 = new MB(0.3); hb2.box('hull', 1.3 * k, 1.0 * k, 2.2 * k, 0, 0, -0.3 * k); hb2.cyl('dark', 0.5 * k, 0.5 * k, 1.4 * k, 0, 0, -0.3 * k, 0, 0, PI / 2, 12);
      hg.add(hb2.build(mats));
      const hbr = barrel(mats, 'cannon', 4.6 * k, 0.22 * k, vis, r); hbr.position.z = 0.6 * k; hg.add(hbr);
      torso.add(hg);
    }
    if (jump) for (const s of [-1, 1]) { const f = new T.Mesh(new T.ConeGeometry(0.32 * k, 1.6 * k, 10, 1, true), mats.flameGlow); f.rotation.x = PI; f.position.set(s * tw * 0.3, tH * 0.55 - 1.9 * k, -td / 2 - 0.9 * k); f.name = 'jet'; f.scale.set(1, 0.3, 1); torso.add(f); }
    pelvis.add(torso);
    return root;
  }

  function buildSpider(u, mats, vis, r, root, body, k) {
    const st = baseStyle(u.fac);
    const bodyY = 3.5 * k;
    const hull = grp('pelvis', 0, bodyY, 0);
    body.add(hull);
    const hb = new MB(0.25);
    if (st === 'heavy') hb.sph('hull', 2.2 * k, 0, 0, 0, 1.15, 0.5, 1.3, 16, 10);
    else hb.top('hull', [[-1.9 * k, -2.4 * k], [1.9 * k, -2.4 * k], [2.3 * k, 0], [1.4 * k, 2.4 * k], [-1.4 * k, 2.4 * k], [-2.3 * k, 0]], 1.3 * k, 0, -0.65 * k, 0, 0.08);
    hb.box('dark', 2.6 * k, 0.5 * k, 3.6 * k, 0, -0.75 * k, 0);
    hb.box('glass', 1.6 * k, 0.3 * k, 0.06, 0, 0.1 * k, 2.42 * k);
    for (let i = 0; i < 3; i++) hb.box('glow', 0.3 * k, 0.1, 0.06, -0.6 * k + i * 0.6 * k, -0.3 * k, 2.43 * k);
    if (vis.era) for (let i = 0; i < 4; i++) hb.box('accent', 0.8 * k, 0.15, 0.9 * k, -1.2 * k + i * 0.8 * k, 0.72 * k, -0.8 * k);
    if (vis.elite) antenna(hb, -1.2 * k, 0.65 * k, -1.8 * k, 2.6 * k);
    if (vis.engine) for (const s of [-1, 1]) hb.cylZ('glow', 0.3 * k, 0.1, s * 1.0 * k, 0, -2.45 * k, 12);
    hull.add(hb.build(mats));
    const corners = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    corners.forEach((c, i) => {
      const leg = grp('leg' + i, c[0] * 1.7 * k, -0.2 * k, c[1] * 1.6 * k);
      leg.rotation.y = Math.atan2(c[0], c[1]);
      const lb = new MB(0.3);
      lb.sph('dark', 0.55 * k, 0, 0, 0);
      lb.box('hull', 0.55 * k, 0.6 * k, 2.6 * k, 0, 0.6 * k, 1.2 * k, -0.5);
      leg.add(lb.build(mats));
      const kn = grp('legk' + i, 0, 1.2 * k, 2.4 * k);
      const kb = new MB(0.3);
      kb.sph('dark', 0.45 * k, 0, 0, 0);
      kb.box('hull', 0.45 * k, 4.2 * k, 0.5 * k, 0, -2.0 * k, 0.45 * k, 0.22);
      kb.cone('dark', 0.3 * k, 0.6 * k, 0, -4.2 * k, 0.9 * k, PI, 0, 0, 8);
      kn.add(kb.build(mats));
      leg.add(kn);
      hull.add(leg);
    });
    const tur = grp('turret', 0, 0.7 * k, -0.2 * k);
    const tb = new MB(0.25);
    tb.cyl('hull', 1.2 * k, 1.4 * k, 0.9 * k, 0, 0.45 * k, 0, 0, 0, 0, st === 'heavy' ? 16 : 6);
    antenna(tb, 0.8 * k, 0.9 * k, -0.6 * k, 2.0 * k);
    tur.add(tb.build(mats));
    const gun = grp('gun', 0, 0.55 * k, 1.0 * k);
    const br = barrel(mats, u.wt, 4.2 * k, 0.2 * k, vis, r); gun.add(br);
    tur.add(gun);
    hull.add(tur);
    return root;
  }

  // ------------------------------------------------------------ helicopters
  function rotor(name, mats, R, blades, y) {
    const g = grp(name, 0, y, 0);
    const b = new MB(0.5);
    b.cyl('dark', 0.25, 0.3, 0.45, 0, 0, 0, 0, 0, 0, 10);
    for (let i = 0; i < blades; i++) { const a = i * 2 * PI / blades; b.box('gun', 0.42, 0.06, R, Math.sin(a) * R / 2, 0.15, Math.cos(a) * R / 2, 0, a, 0); }
    g.add(b.build(mats));
    const disc = new T.Mesh(new T.CircleGeometry(R, 32), mats.blur);
    disc.rotation.x = -PI / 2; disc.position.y = 0.16; disc.name = 'blur';
    g.add(disc);
    return g;
  }
  function buildVtol(u, mats, vis, r) {
    const cls = u.cls, k = 1 + 0.03 * (u.rank - 1);
    const root = grp(), body = grp('body');
    root.add(body);
    const hb = new MB(0.25);
    if (cls === 'vtol') {
      hb.side('hull', [[-4.2 * k, 1.0], [-4.4 * k, 2.4], [-1 * k, 3.0], [2.6 * k, 2.8], [4.6 * k, 1.8], [4.8 * k, 1.1], [3.6 * k, 0.6], [-3.4 * k, 0.6]], 2.4 * k, 0, 0, 0, 0.1);
      hb.side('glass', [[2.4 * k, 2.4], [2.8 * k, 3.0], [4.2 * k, 2.2], [4.5 * k, 1.6]], 1.9 * k, 0, 0, 0, 0.04);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const fx = sx * 3.2 * k, fz = sz * 2.6 * k;
        hb.tor('hull', 1.7 * k, 0.28 * k, fx, 2.2, fz, PI / 2, 0, 0, 24);
        hb.box('dark', Math.abs(fx) - 1.0 * k, 0.3, 0.5, sx * (Math.abs(fx) / 2 + 0.4 * k), 2.2, fz);
        hb.cyl('glow', 1.5 * k, 1.5 * k, 0.04, fx, 1.9, fz, 0, 0, 0, 20);
      }
      for (const s2 of [-1, 1]) { hb.box('hull', 0.9, 0.5, 2.2, s2 * 1.5 * k, 1.0, 0.6); for (let i = 0; i < 3; i++) hb.cylZ('dark', 0.16, 1.6, s2 * (1.3 + i * 0.22) * k, 0.7, 0.6, 8); }
      hb.box('hull', 0.2, 1.6, 1.4, 0, 3.4, -3.8 * k, 0.4);
    } else {
      hb.side('hull', [[-5.6 * k, 1.4], [-6.4 * k, 3.4], [-4.6 * k, 3.2], [3.2 * k, 3.2], [5.2 * k, 2.4], [5.6 * k, 1.4], [4.8 * k, 0.6], [-4.4 * k, 0.6]], 2.8 * k, 0, 0, 0, 0.1);
      hb.side('glass', [[3.4 * k, 2.3], [3.7 * k, 3.0], [5.0 * k, 2.4], [5.4 * k, 1.7]], 2.4 * k, 0, 0, 0, 0.04);
      for (const s2 of [-1, 1]) { for (let i = 0; i < 4; i++) hb.box('glass', 0.05, 0.4, 0.4, s2 * 1.42 * k, 2.5, -2.6 * k + i * 1.3); hb.side('hull', [[-6.2 * k, 3.2], [-5.4 * k, 3.2], [-6.0 * k, 5.4], [-6.8 * k, 5.4]], 0.16, s2 * 1.6 * k, 0, 0, 0); }
      hb.box('hull', 3.6 * k, 0.14, 1.0, 0, 3.3, -6.4 * k);
      hb.box('hull', 15 * k, 0.32, 2.0 * k, 0, 3.5, 0.2);
      for (const s2 of [-1, 1]) { hb.cylZ('hull', 0.7 * k, 3.0 * k, s2 * 7.5 * k, 3.8, 0.4, 14); hb.cone('hull', 0.7 * k, 1.0 * k, s2 * 7.5 * k, 3.8, 2.4 * k, PI / 2, 0, 0, 14); }
      hb.box('dark', 2.2 * k, 0.1, 2.4 * k, 0, 0.75, -5.2 * k, -0.35);
    }
    hb.box('red', 0.15, 0.1, 0.1, 1.3 * k, 1.5, 0); hb.box('glow', 0.15, 0.1, 0.1, -1.3 * k, 1.5, 0);
    if (vis.elite) antenna(hb, 0, 3.0, -2 * k, 1.6);
    if (vis.era) hb.box('accent', 1.6 * k, 0.4, 2.4 * k, 0, 0.55, 0.4);
    body.add(hb.build(mats));
    if (cls === 'vtol') { for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const ro = rotor('rotor', mats, 1.45 * k, 5, 2.25); ro.position.x = sx * 3.2 * k; ro.position.z = sz * 2.6 * k; ro.userData.dir = sx * sz; body.add(ro); } }
    else for (const s2 of [-1, 1]) { const ro = rotor('rotor', mats, 4.2 * k, 3, 4.7); ro.position.x = s2 * 7.5 * k; ro.position.z = 0.4; ro.userData.dir = s2; body.add(ro); }
    const tur = grp('turret', 0, 0.55, 4.0 * k);
    const ttb = new MB(0.3); ttb.sph('dark', 0.42, 0, 0, 0); tur.add(ttb.build(mats));
    const gun = grp('gun', 0, -0.1, 0.2);
    gun.add(barrel(mats, cls === 'vtol' ? 'auto' : 'mg', 1.6, 0.09, vis, r));
    tur.add(gun); body.add(tur);
    return root;
  }
  function buildHeli(u, mats, vis, r) {
    if (u.cls === 'vtol' || u.cls === 'tiltrotor') return buildVtol(u, mats, vis, r);
    const cls = u.cls, st = baseStyle(u.fac), k = 1 + 0.03 * (u.rank - 1);
    const root = grp(), body = grp('body');
    root.add(body);
    const hb = new MB(0.25);
    let L, R;
    if (cls === 'hscout') {
      L = 6.5 * k; R = 4.4 * k;
      hb.sph('hull', 1.2 * k, 0, 1.4, 0.6, 1, 1, 1.5, 16, 12);
      hb.sph('glass', 1.05 * k, 0, 1.55, 1.25, 0.95, 0.85, 1.0, 14, 10);
      hb.cylZ('hull', 0.22 * k, 4.2 * k, 0, 1.7, -2.4 * k, 10, 0.45 * k);
      hb.side('hull', [[-4.6 * k, 1.6], [-4.0 * k, 1.7], [-4.4 * k, 3.0], [-4.9 * k, 3.1]], 0.12, 0, 0, 0, 0);
      for (const s of [-1, 1]) { hb.cylZ('gun', 0.07, 3.2 * k, s * 0.95 * k, 0.12, 0.4, 6); hb.box('gun', 0.06, 0.7, 0.06, s * 0.9 * k, 0.45, 1.2, 0, 0, s * 0.2); hb.box('gun', 0.06, 0.7, 0.06, s * 0.9 * k, 0.45, -0.6, 0, 0, s * 0.2); }
      hb.box('dark', 0.5, 0.4, 1.0, 0.85, 1.0, 0.6);
    } else if (cls === 'hattack') {
      L = 9 * k; R = 6.2 * k;
      hb.side('hull', [[-1.6 * k, 0.6], [-1.6 * k, 2.4], [0.4 * k, 2.8], [2.6 * k, 2.2], [3.6 * k, 1.2], [3.2 * k, 0.6]], 1.25 * k, 0, 0, 0, 0.08);
      hb.side('glass', [[0.4 * k, 2.2], [0.6 * k, 3.05], [1.6 * k, 2.95], [2.7 * k, 2.25]], 1.0 * k, 0, 0, 0, 0.04);
      hb.box('glass', 0.05, 0.6, 1.4, 0, 2.7, 1.2 * k);
      hb.cylZ('hull', 0.3 * k, 5.4 * k, 0, 1.9, -4.0 * k, 10, 0.6 * k);
      hb.side('hull', [[-6.6 * k, 1.8], [-6.0 * k, 2.0], [-6.5 * k, 3.6], [-7.1 * k, 3.7]], 0.15, 0, 0, 0, 0);
      hb.box('hull', 2.2 * k, 0.1, 0.6, 0, 2.0, -5.8 * k);
      for (const s of [-1, 1]) {
        hb.box('hull', 1.8 * k, 0.16, 1.0, s * 1.4 * k, 1.4, -0.2);
        for (let i = 0; i < 2; i++) { hb.cylZ('dark', 0.22, 1.5, s * (1.2 + i * 0.8) * k, 1.05, -0.2, 10); hb.cone('dark', 0.22, 0.4, s * (1.2 + i * 0.8) * k, 1.05, 0.75, PI / 2, 0, 0, 10); }
        hb.cylZ('dark', 0.45, 1.8, s * 0.9 * k, 2.3, -0.8, 12);
        hb.cylZ('gun', 0.4, 0.1, s * 0.9 * k, 2.3, -1.72, 12);
        hb.box('gun', 0.08, 0.08, 1.6, s * 0.55 * k, 0.25, 0); hb.box('gun', 0.08, 0.5, 0.08, s * 0.55 * k, 0.45, 0.6);
      }
    } else {
      L = 13 * k; R = 7.5 * k;
      hb.side('hull', [[-5 * k, 0.6], [-5.5 * k, 2.2], [-4.8 * k, 3.4], [3.4 * k, 3.4], [5.2 * k, 2.4], [5.6 * k, 1.2], [4.8 * k, 0.6]], 2.6 * k, 0, 0, 0, 0.1);
      hb.side('glass', [[3.6 * k, 2.4], [3.8 * k, 3.2], [5.0 * k, 2.6], [5.3 * k, 1.8]], 2.2 * k, 0, 0, 0, 0.04);
      for (const s of [-1, 1]) { for (let i = 0; i < 4; i++) hb.box('glass', 0.05, 0.4, 0.45, s * 1.32 * k, 2.6, -2.5 * k + i * 1.4); hb.box('dark', 0.1, 1.4, 1.6, s * 1.32 * k, 1.8, 0.2); }
      hb.box('hull', 1.6 * k, 1.6, 2.4 * k, 0, 3.8, -4.6 * k); // rear pylon
      hb.box('hull', 1.2 * k, 1.0, 1.6 * k, 0, 3.8, 4.2 * k);
      for (const s of [-1, 1]) { hb.box('hull', 2.6 * k, 0.2, 1.4, s * 2.2 * k, 1.6, 0.2); hb.cylZ('dark', 0.35, 2.0, s * 3.3 * k, 1.3, 0.2, 10); hb.cylZ('dark', 0.6, 2.6, s * 1.6 * k, 3.4, -1.6, 12); }
    }
    if (vis.era) hb.box('accent', 1.0 * k, 0.6, 2.0 * k, 0, 0.6, 0.4);
    if (vis.elite) { hb.box('accent', 0.05, 0.25, 3.0 * k, cls === 'hgun' ? 1.33 * k : 0.64 * k, 1.6, 0); antenna(hb, 0, 2.2, -2.5 * k, 1.4); }
    if (vis.engine) for (const s of [-1, 1]) hb.cylZ('glow', 0.25, 0.08, s * 0.7 * k, 2.6, -2.2 * k, 10);
    hb.box('red', 0.15, 0.1, 0.1, 1.2 * k, 1.5, 0); hb.box('glow', 0.15, 0.1, 0.1, -1.2 * k, 1.5, 0);
    body.add(hb.build(mats));
    if (cls === 'hgun' && st !== 'sleek') {
      body.add(rotor('rotor', mats, R * 0.85, 3, 4.9 + 0.1, 0)); body.children[body.children.length - 1].position.z = -4.6 * k;
      const r2 = rotor('rotor', mats, R * 0.85, 3, 4.6); r2.position.z = 4.2 * k; r2.userData.dir = -1; body.add(r2);
    } else if (st === 'sleek' && cls !== 'hscout') {
      const r1 = rotor('rotor', mats, R, 3, (cls === 'hgun' ? 4.6 : 3.4)); body.add(r1);
      const r2 = rotor('rotor', mats, R, 3, (cls === 'hgun' ? 5.3 : 4.1)); r2.userData.dir = -1; body.add(r2);
      const mast = new MB(0.3); mast.cyl('dark', 0.18, 0.18, 1.0, 0, (cls === 'hgun' ? 4.9 : 3.7), 0); body.add(mast.build(mats));
    } else {
      body.add(rotor('rotor', mats, R, cls === 'hscout' ? 2 : 4, cls === 'hscout' ? 2.9 : 3.5));
      const tr = grp('trotor', 0.2, cls === 'hscout' ? 2.5 : 3.0, cls === 'hscout' ? -4.6 * k : -6.7 * k);
      const tb = new MB(0.5); for (let i = 0; i < 3; i++) tb.box('gun', 0.05, 1.4, 0.2, 0.1, 0, 0, i * PI / 1.5, 0, 0); tr.add(tb.build(mats));
      body.add(tr);
    }
    // chin turret
    const tur = grp('turret', 0, cls === 'hgun' ? 0.6 : 0.5, cls === 'hscout' ? 1.6 * k : cls === 'hgun' ? 4.4 * k : 3.0 * k);
    const ttb = new MB(0.3); ttb.sph('dark', 0.38, 0, 0, 0); tur.add(ttb.build(mats));
    const gun = grp('gun', 0, -0.1, 0.2);
    gun.add(barrel(mats, 'mg', 1.4, 0.07, vis, r));
    tur.add(gun);
    body.add(tur);
    return root;
  }

  // ------------------------------------------------------------ planes
  function buildPlane(u, mats, vis, r) {
    const cls = u.cls, st = baseStyle(u.fac), k = 1 + 0.03 * (u.rank - 1);
    const root = grp(), body = grp('body');
    root.add(body);
    const b = new MB(0.25);
    const flames = [];
    const ail = [];
    if (cls === 'stealth') {
      const S = 1.5 * k;
      b.top('dark', [[0, 6.5 * S], [12 * S, -3.5 * S], [10 * S, -4.5 * S], [7 * S, -2.6 * S], [4.5 * S, -4.6 * S], [1.8 * S, -2.8 * S], [0, -4.2 * S], [-1.8 * S, -2.8 * S], [-4.5 * S, -4.6 * S], [-7 * S, -2.6 * S], [-10 * S, -4.5 * S], [-12 * S, -3.5 * S]], 0.55 * S, 0, -0.3 * S, 0, 0.12);
      b.sph('dark', 2.0 * S, 0, 0.05, 1.4 * S, 1, 0.35, 2.4, 16, 10);
      b.box('glass', 1.2 * S, 0.25 * S, 0.9 * S, 0, 0.55 * S, 4.0 * S, 0.45);
      for (const s2 of [-1, 1]) { b.box('hull', 1.2 * S, 0.25 * S, 1.6 * S, s2 * 2.2 * S, 0.3 * S, 0.2 * S); flames.push([s2 * 2.2 * S, 0.1 * S, -2.6 * S, 0.3 * S]); }
      b.box('glow', 0.06, 0.04, 9 * S, 6 * S, -0.05, 1.2 * S, 0, -0.78, 0); b.box('glow', 0.06, 0.04, 9 * S, -6 * S, -0.05, 1.2 * S, 0, 0.78, 0);
    } else if (cls === 'bomber') {
      const S = 1.6 * k;
      b.top('hull', [[0, 7 * S], [3 * S, 3 * S], [12 * S, -3 * S], [11 * S, -4.2 * S], [6 * S, -3 * S], [4 * S, -4.6 * S], [2 * S, -3.4 * S], [0, -4.4 * S], [-2 * S, -3.4 * S], [-4 * S, -4.6 * S], [-6 * S, -3 * S], [-11 * S, -4.2 * S], [-12 * S, -3 * S], [-3 * S, 3 * S]], 0.7 * S, 0, -0.35 * S, 0, 0.1);
      b.sph('hull', 2.2 * S, 0, 0.1, 1.2 * S, 1, 0.42, 2.4, 16, 10);
      b.box('glass', 1.6 * S, 0.3 * S, 0.8 * S, 0, 0.75 * S, 4.4 * S, 0.5);
      for (const s of [-1, 1]) { b.box('dark', 1.4 * S, 0.5 * S, 1.6 * S, s * 2.4 * S, 0.3 * S, 0.5 * S); b.box('dark', 1.2 * S, 0.3 * S, 0.5 * S, s * 2.4 * S, 0.25 * S, -3.0 * S); flames.push([s * 2.4 * S, 0.25 * S, -3.3 * S, 0.45 * S]); }
      b.box('glow', 18 * S, 0.06, 0.08, 0, -0.1, -2.2 * S);
    } else if (cls === 'cas') {
      const S = 1.15 * k;
      b.cylZ('hull', 0.95 * S, 11 * S, 0, 0, 0, 12, 0.75 * S);
      b.cone('hull', 0.95 * S, 2.2 * S, 0, 0, 6.6 * S, PI / 2, 0, 0, 12);
      b.cylZ('gun', 0.12 * S, 1.6 * S, 0, -0.35 * S, 7.8 * S, 8);
      b.sph('glass', 0.75 * S, 0, 0.75 * S, 3.6 * S, 0.8, 0.7, 1.6);
      b.top('hull', [[-8.5 * S, 0.6 * S], [8.5 * S, 0.6 * S], [8.5 * S, -1.6 * S], [-8.5 * S, -1.6 * S]], 0.26 * S, 0, -0.3 * S, 0.8 * S, 0.06);
      for (const s of [-1, 1]) {
        b.cylZ('dark', 0.85 * S, 2.8 * S, s * 1.55 * S, 1.05 * S, -3.0 * S, 14); b.cylZ('gun', 0.6 * S, 0.2, s * 1.55 * S, 1.05 * S, -4.4 * S, 12);
        flames.push([s * 1.55 * S, 1.05 * S, -4.5 * S, 0.5 * S]);
        b.side('hull', [[-6 * S, 0], [-4.8 * S, 0], [-5.4 * S, 2.6 * S], [-6.4 * S, 2.6 * S]], 0.14, s * 3.2 * S, 0, 0, 0);
        for (let i = 0; i < 3; i++) { b.cylZ('dark', 0.22 * S, 1.8 * S, s * (2.4 + i * 1.8) * S, -0.75 * S, 0.3 * S, 8); b.cone('dark', 0.22 * S, 0.5 * S, s * (2.4 + i * 1.8) * S, -0.75 * S, 1.45 * S, PI / 2, 0, 0, 8); }
      }
      b.top('hull', [[-3.6 * S, -5.4 * S], [3.6 * S, -5.4 * S], [3.6 * S, -6.6 * S], [-3.6 * S, -6.6 * S]], 0.18, 0, 0, 0, 0.04);
    } else {
      // fighter / interceptor / drone
      const drone = cls === 'drone', icp = cls === 'interceptor';
      const S = (drone ? 0.85 : icp ? 1.05 : 1.1) * k;
      const sleek = (st === 'sleek' || st === 'asym') && !icp;
      b.cylZ('hull', 0.9 * S, 9 * S, 0, 0, -0.5 * S, 12, 0.7 * S);
      b.cone('hull', 0.9 * S, 3.4 * S, 0, 0, 5.7 * S, PI / 2, 0, 0, 12);
      if (!drone) b.sph('glass', 0.7 * S, 0, 0.72 * S, 3.0 * S, 0.8, 0.75, 2.0);
      else b.sph('dark', 0.85 * S, 0, 0.45 * S, 2.8 * S, 0.9, 0.6, 1.8);
      if (drone) b.top('hull', [[-7.5 * S, 0.4 * S], [7.5 * S, 0.4 * S], [7.5 * S, -0.6 * S], [-7.5 * S, -0.6 * S]], 0.18, 0, 0.1, 0, 0.04);
      else if (icp) { b.top('hull', [[0, 2.6 * S], [5.0 * S, -3.6 * S], [4.6 * S, -4.2 * S], [-4.6 * S, -4.2 * S], [-5.0 * S, -3.6 * S]], 0.2 * S, 0, -0.15 * S, 0, 0.05); for (const s2 of [-1, 1]) b.top('hull', [[0, 3.6 * S], [s2 * 1.9 * S, 2.2 * S], [s2 * 1.9 * S, 1.8 * S], [0, 2.2 * S]].map(p => p), 0.1, 0, 0.3 * S, 0, 0); }
      else if (sleek) b.top('hull', [[0, 3.4 * S], [6.2 * S, -3.6 * S], [5.6 * S, -4.4 * S], [0, -3.0 * S], [-5.6 * S, -4.4 * S], [-6.2 * S, -3.6 * S]], 0.22 * S, 0, -0.15 * S, 0, 0.05);
      else b.top('hull', [[-1 * S, 1.6 * S], [1 * S, 1.6 * S], [5.6 * S, -2.4 * S], [5.6 * S, -3.6 * S], [-5.6 * S, -3.6 * S], [-5.6 * S, -2.4 * S]], 0.22 * S, 0, -0.15 * S, 0, 0.05);
      // intakes
      for (const s of [-1, 1]) b.box('dark', 0.55 * S, 0.8 * S, 2.2 * S, s * 0.95 * S, -0.1 * S, 1.2 * S);
      // tails
      if (drone) for (const s of [-1, 1]) b.side('hull', [[-4.6 * S, 0], [-3.6 * S, 0], [-4.6 * S, 1.8 * S], [-5.4 * S, 1.8 * S]], 0.12, s * 0.7 * S, 0.2, 0, 0);
      else for (const s of [-1, 1]) {
        const tail = new MB(0.25); tail.side('hull', [[-5.2 * S, 0], [-3.4 * S, 0], [-4.6 * S, 2.6 * S], [-5.6 * S, 2.6 * S]], 0.14, 0, 0, 0, 0);
        for (const k2 in tail.L) for (const g of tail.L[k2]) { g.rotateZ(s * 0.22); g.translate(s * 0.75 * S, 0.4 * S, 0); (b.L[k2] || (b.L[k2] = [])).push(g); }
        b.top('hull', [[0, -3.6 * S], [s * 2.8 * S, -5.0 * S], [s * 2.8 * S, -5.8 * S], [0, -5.4 * S]].map(p => s < 0 ? [p[0], p[1]] : p), 0.14, 0, -0.1, 0, 0);
      }
      if (!drone) for (const s2 of [-1, 1]) { const a = grp(s2 < 0 ? 'aileronL' : 'aileronR', s2 * (icp ? 3.0 : 4.2) * S, -0.1 * S, -3.45 * S); const ab2 = new MB(0.25); ab2.box('hull', (icp ? 2.4 : 1.8) * S, 0.12, 0.5 * S, 0, 0, -0.25 * S); a.add(ab2.build(mats)); ail.push(a); }
      const ne = drone || icp ? 1 : 2;
      for (let i = 0; i < ne; i++) { const x = ne === 1 ? 0 : (i ? 0.55 : -0.55) * S; const er = icp ? 0.7 : 0.55; b.cylZ('gun', er * S, 0.9 * S, x, -0.05, -5.2 * S, 12, er * 0.87 * S); for (let t = 0; t < 8; t++) { const a = t / 8 * PI * 2; b.box('dark', 0.06, 0.06, 0.5 * S, x + Math.cos(a) * er * 0.9 * S, -0.05 + Math.sin(a) * er * 0.9 * S, -5.55 * S); } flames.push([x, -0.05, -5.7 * S, (icp ? 0.55 : 0.42) * S]); }
      // missiles under wings
      for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { b.cylZ('white', 0.13 * S, 2.0 * S, s * (2.2 + i * 1.6) * S, -0.45 * S, -1.2 * S, 8); b.cone('red', 0.13 * S, 0.35 * S, s * (2.2 + i * 1.6) * S, -0.45 * S, -0.03 * S, PI / 2, 0, 0, 8); }
      b.box('red', 0.12, 0.08, 0.2, 5.6 * S, -0.1, -3.0 * S); b.box('glow', 0.12, 0.08, 0.2, -5.6 * S, -0.1, -3.0 * S);
    }
    if (vis.elite) b.box('accent', 0.08, 0.08, 6, 0, 0.95, 0);
    if (vis.era) b.box('accent', 1.2, 0.1, 2.5, 0, -0.85, 1);
    body.add(b.build(mats));
    for (const a of ail) body.add(a);
    for (const f of flames) {
      const fl = new T.Mesh(new T.ConeGeometry(f[3], f[3] * 5, 10, 1, true), mats.flame);
      fl.rotation.x = -PI / 2; fl.position.set(f[0], f[1], f[2] - f[3] * 2.5); fl.name = 'flame';
      body.add(fl);
    }
    const tur = grp('turret', 0, -0.4, 2.0); const gun = grp('gun'); gun.add(grp('barrel')); tur.add(gun); body.add(tur);
    return root;
  }

  // ------------------------------------------------------------ naval
  function buildShip(u, mats, vis, r) {
    const cls = u.cls, st = baseStyle(u.fac), k = 1 + 0.03 * (u.rank - 1);
    const root = grp(), body = grp('body');
    root.add(body);
    const b = new MB(0.15);
    if (cls === 'sub') {
      const L = 22 * k, R = 1.6 * k;
      b.cylZ('hull', R, L, 0, -0.6, 0, 16);
      b.sph('hull', R, 0, -0.6, L / 2, 1, 1, 1.6, 16, 10);
      b.cone('hull', R, 4 * k, 0, -0.6, -L / 2 - 2 * k, -PI / 2, 0, 0, 16);
      b.side('hull', [[2 * k, 0], [5.5 * k, 0], [5 * k, 3.4 * k], [2.6 * k, 3.4 * k]], 1.2 * k, 0, 0.6, 0, 0.1);
      b.box('hull', 3.6 * k, 0.12, 1.0 * k, 0, 2.4 * k, 4.2 * k);
      b.box('hull', 0.12, 3.2 * k, 1.2 * k, 0, -0.6, -L / 2 - 1.2 * k); b.box('hull', 3.2 * k, 0.12, 1.2 * k, 0, -0.6, -L / 2 - 1.2 * k);
      b.cyl('dark', 0.1, 0.1, 1.6, 3.4 * k, 4.6 * k, 0, 0, 0, 0, 6); b.cyl('dark', 0.08, 0.08, 1.2, 3.9 * k, 4.4 * k, 0, 0, 0, 0, 6);
      if (vis.elite) b.box('accent', 0.1, 0.4, 3, 0.6 * k, 2.5 * k, 3.8 * k);
      body.add(b.build(mats));
      const tur = grp('turret', 0, 0, L / 2); const gun = grp('gun'); gun.add(grp('barrel')); tur.add(gun); body.add(tur);
      const prop = grp('prop', 0, -0.6, -L / 2 - 3.4 * k); const pb = new MB(0.5); for (let i = 0; i < 5; i++) pb.box('metal', 0.1, 1.6 * k, 0.3, 0, 0.6 * k, 0, 0, 0, 0); prop.add(pb.build(mats));
      body.add(prop);
      return root;
    }
    if (cls === 'hovercraft') {
      const L = 11 * k, W = 6.5 * k;
      b.tor('tire', 1, 0.6, 0, 0.6, 0, PI / 2, 0, 0, 24);
      const sk = b.L.tire.pop(); sk.scale(1, 1, 1); sk.applyMatrix4(new T.Matrix4().makeScale(W / 2.4, 1, L / 2.4)); b.L.tire.push(sk);
      b.box('hull', W * 0.8, 0.6, L * 0.85, 0, 1.3, 0);
      b.box('hull', W * 0.5, 1.6, L * 0.35, W * 0.12, 2.4, L * 0.15);
      b.box('glass', W * 0.48, 0.4, 0.05, W * 0.12, 2.9, L * 0.33);
      b.box('dark', W * 0.6, 0.15, L * 0.4, 0, 1.68, -L * 0.15);
      b.box('hull', W * 0.82, 1.4, 0.4, 0, 1.6, L * 0.42, 0.6);
      for (const s of [-1, 1]) { b.tor('hull', 1.5 * k, 0.2, s * 1.7 * k, 3.4, -L * 0.42, 0, 0, 0, 20); b.box('hull', 0.2, 2.0, 0.2, s * 1.7 * k, 2.3, -L * 0.42); b.box('hull', 0.1, 2.6, 1.4, s * 1.7 * k, 3.4, -L * 0.47); }
      antenna(b, -W * 0.15, 3.2, L * 0.05, 2.6);
      if (vis.elite) b.box('accent', W * 0.82, 0.1, 0.3, 0, 1.62, L * 0.3);
      body.add(b.build(mats));
      for (const s of [-1, 1]) { const p = grp('prop', s * 1.7 * k, 3.4, -L * 0.42); const pb = new MB(0.5); pb.cyl('dark', 0.25, 0.25, 0.4, 0, 0, 0, PI / 2, 0, 0, 8); for (let i = 0; i < 4; i++) pb.box('gun', 0.2, 1.3 * k, 0.08, 0, 0, 0, 0, 0, i * PI / 4); p.add(pb.build(mats)); p.userData.axis = 'z'; body.add(p); }
      const tur = grp('turret', -W * 0.2, 1.6, L * 0.3); const tb = new MB(0.3); tb.cyl('dark', 0.5, 0.55, 0.5, 0, 0.25, 0, 0, 0, 0, 10); tur.add(tb.build(mats));
      const gun = grp('gun', 0, 0.4, 0.3); gun.add(barrel(mats, u.wt, 2.2, 0.08, vis, r)); tur.add(gun); body.add(tur);
      return root;
    }
    const dims = { patrol: [11, 3.2, 1.2], missileboat: [13, 3.4, 1.2], corvette: [20, 4.4, 1.9], destroyer: [30, 5.8, 2.6], frigate: [34, 6.2, 2.7], cruiser: [38, 7, 3.0], battleship: [52, 9.5, 3.6], carrier: [62, 11, 4.2] }[cls];
    const small = cls === 'patrol' || cls === 'missileboat';
    const L = dims[0] * k, W = dims[1] * k, F = dims[2] * k, D = (small ? 0.8 : 2.2) * k;
    // hull outline (top view) extruded from below waterline to deck
    const hullPts = [[0, L / 2], [W * 0.32, L * 0.3], [W / 2, L * 0.08], [W / 2, -L * 0.36], [W * 0.38, -L / 2], [-W * 0.38, -L / 2], [-W / 2, -L * 0.36], [-W / 2, L * 0.08], [-W * 0.32, L * 0.3]];
    b.top('hull', hullPts, F + D, 0, -D, 0, 0.08);
    b.top('deck', hullPts.map(p => [p[0] * 0.97, p[1] * 0.98]), 0.06, 0, F, 0);
    b.top('dark', hullPts.map(p => [p[0] * 1.01, p[1] * 1.005]), 0.35, 0, -0.15, 0);
    const turrets = [];
    const nav = [];
    if (cls === 'carrier') {
      b.box('deck', W * 1.55, 0.5, L * 1.02, W * 0.18, F + 0.3, -L * 0.02);
      for (let i = 0; i < 9; i++) b.box('white', 0.3, 0.04, L * 0.06, W * 0.18, F + 0.57, -L * 0.42 + i * L * 0.1);
      b.box('white', W * 1.2, 0.04, 0.25, W * 0.25, F + 0.57, -L * 0.36);
      b.box('glow', W * 1.5, 0.05, 0.12, W * 0.18, F + 0.58, L * 0.48);
      const ix = -W * 0.42, iz = -L * 0.08, ih = 7 * k;
      b.box('hull', W * 0.32, ih, L * 0.18, ix, F + 0.5 + ih / 2, iz);
      b.box('hull', W * 0.26, ih * 0.4, L * 0.1, ix, F + 0.5 + ih * 1.2, iz + L * 0.02);
      b.box('glass', W * 0.27, 0.6, 0.05, ix, F + 0.5 + ih * 1.25, iz + L * 0.07 + 0.03);
      b.cyl('dark', 0.3 * k, 0.4 * k, 6 * k, ix, F + ih * 1.5 + 3 * k, iz, 0, 0, 0, 8);
      nav.push([ix, F + ih * 1.5 + 5.6 * k, iz]);
      // parked drones
      for (let i = 0; i < 6; i++) { const dx = W * 0.35 + (i % 2) * W * 0.45, dz = -L * 0.3 + Math.floor(i / 2) * L * 0.18; b.box('dark', 0.5 * k, 0.4 * k, 4 * k, dx, F + 0.75, dz); b.box('dark', 5 * k, 0.1, 1.0 * k, dx, F + 0.8, dz + 0.2); b.box('dark', 1.8 * k, 0.1, 0.5 * k, dx, F + 0.8, dz - 1.7 * k); }
      for (const s2 of [-1, 1]) { b.cyl('white', 0.5 * k, 0.55 * k, 1.0 * k, W * 0.18 + s2 * W * 0.7, F + 1.0, L * 0.42, 0, 0, 0, 10); b.sph('white', 0.5 * k, W * 0.18 + s2 * W * 0.7, F + 1.6, L * 0.42); }
      turrets.push([W * 0.9, F + 0.5, -L * 0.42, 0.9 * k, 'auto', 2]);
      if (vis.elite) b.box('accent', W * 1.5, 0.06, 1.6, W * 0.18, F + 0.58, L * 0.3);
    } else if (cls === 'missileboat') {
      b.box('hull', W * 0.55, 1.2, L * 0.24, 0, F + 0.6, L * 0.05);
      b.box('glass', W * 0.53, 0.32, 0.05, 0, F + 0.95, L * 0.17 + 0.03);
      antenna(b, 0, F + 1.2, 0, 2.6);
      for (const s2 of [-1, 1]) for (let i = 0; i < 2; i++) { b.box('hull', 0.6, 0.6, 3.2, s2 * W * 0.28, F + 0.55 + i * 0.62, -L * 0.25, -0.18); b.box('dark', 0.5, 0.5, 0.05, s2 * W * 0.28, F + 0.86 + i * 0.62, -L * 0.25 + 1.62, -0.18); }
      turrets.push([0, F, L * 0.33, 0.5, 'mg']);
    } else if (cls === 'patrol') {
      b.box('hull', W * 0.6, 1.4, L * 0.28, 0, F + 0.7, -L * 0.02);
      b.box('glass', W * 0.58, 0.35, 0.05, 0, F + 1.1, L * 0.12 + 0.03);
      b.box('dark', W * 0.4, 0.9, 0.9, 0, F + 1.6, -L * 0.08);
      antenna(b, 0, F + 2.0, -L * 0.1, 2.4);
      turrets.push([0, F, L * 0.3, 0.5, 'mg']);
      turrets.push([0, F, -L * 0.32, 0.4, 'mg']);
    } else {
      // superstructure
      const sL = L * (cls === 'corvette' ? 0.3 : 0.26), sW = W * 0.62, sH = (cls === 'battleship' ? 4.5 : cls === 'corvette' ? 2.4 : 3.2) * k;
      if (st === 'sleek' || st === 'asym') b.front('hull', [[-sW / 2, 0], [sW / 2, 0], [sW * 0.35, sH], [-sW * 0.35, sH]], sL, 0, F, -L * 0.02, 0.06);
      else b.box('hull', sW, sH, sL, 0, F + sH / 2, -L * 0.02);
      b.box('hull', sW * 0.8, sH * 0.6, sL * 0.55, 0, F + sH + sH * 0.3, L * 0.02);
      b.box('glass', sW * 0.78, 0.45 * k, 0.05, 0, F + sH * 1.42, L * 0.02 + sL * 0.28);
      b.box('hull', sW * 1.4, 0.2, 1.2 * k, 0, F + sH * 1.55, L * 0.02 + sL * 0.15);
      // mast
      b.cyl('dark', 0.25 * k, 0.4 * k, sH * 1.6, 0, F + sH * 2.0, -L * 0.04, 0, 0, 0, 8);
      b.box('dark', 3 * k, 0.15, 0.15, 0, F + sH * 2.4, -L * 0.04);
      nav.push([0, F + sH * 2.85, -L * 0.04]);
      // funnels
      const nf = cls === 'battleship' ? 2 : 1;
      for (let i = 0; i < nf; i++) { b.box('hull', sW * 0.45, sH * 0.9, 2.4 * k, 0, F + sH * 1.1, -L * 0.16 - i * 3.5 * k, -0.1); b.box('dark', sW * 0.38, 0.2, 2.0 * k, 0, F + sH * 1.58, -L * 0.17 - i * 3.5 * k); }
      // VLS
      if (cls === 'frigate') { b.box('white', W * 0.7, 0.03, 0.2, 0, F + 0.08, -L * 0.38); b.box('white', 0.2, 0.03, W * 0.7, 0, F + 0.08, -L * 0.38); b.box('hull', sW * 0.9, sH * 0.7, L * 0.1, 0, F + sH * 0.35, -L * 0.24); }
      if (cls === 'corvette') for (const s2 of [-1, 1]) for (let i = 0; i < 4; i++) b.cyl('dark', 0.3, 0.3, 0.6, s2 * W * 0.3, F + 0.3, -L * 0.42 + i * 0.7, PI / 2, 0, 0, 8);
      if (cls === 'cruiser' || cls === 'destroyer' || cls === 'frigate') for (let i = 0; i < 4; i++) for (let j = 0; j < (cls === 'cruiser' ? 4 : 2); j++) b.box('dark', 0.7 * k, 0.12, 0.7 * k, -1.2 * k + i * 0.8 * k, F + 0.08, L * 0.18 - j * 0.85 * k);
      // boats / details
      for (const s of [-1, 1]) { b.box('white', 0.9 * k, 0.6 * k, 3 * k, s * W * 0.38, F + 0.5 * k, -L * 0.22); b.cyl('dark', 0.08, 0.08, 0.8, s * W * 0.45, F + 0.4, L * 0.35, 0, 0, 0, 6); }
      if (vis.era) for (const s of [-1, 1]) b.box('accent', 0.2, F * 0.7, L * 0.45, s * W * 0.5, F * 0.55, 0);
      if (vis.elite) { b.box('accent', W * 0.9, 0.08, 1.4, 0, F + 0.1, L * 0.36); antenna(b, sW * 0.4, F + sH * 1.6, 0, 4 * k); }
      // turrets
      const tsz = { corvette: 1.0, destroyer: 1.2, frigate: 1.2, cruiser: 1.35, battleship: 2.4 }[cls] * k;
      if (cls === 'battleship') { turrets.push([0, F, L * 0.3, tsz, 'cannon', 3]); turrets.push([0, F + 1.6 * k, L * 0.18, tsz, 'cannon', 3]); turrets.push([0, F, -L * 0.33, tsz, 'cannon', 3]); }
      else if (cls === 'cruiser') { turrets.push([0, F, L * 0.33, tsz, 'cannon', 1]); turrets.push([0, F, -L * 0.36, tsz, 'cannon', 1]); }
      else if (cls === 'corvette') { turrets.push([0, F, L * 0.3, tsz, u.wt === 'laser' ? 'laser' : 'auto', 1]); }
      else if (cls === 'frigate') { turrets.push([0, F, L * 0.32, tsz, u.wt === 'rail' ? 'rail' : 'cannon', 1]); }
      else { turrets.push([0, F, L * 0.3, tsz, u.wt === 'rail' ? 'rail' : 'cannon', 1]); turrets.push([0, F, -L * 0.35, tsz * 0.8, 'auto', 2]); }
      // CIWS
      for (const s of [-1, 1]) { b.cyl('white', 0.45 * k, 0.5 * k, 0.9 * k, s * sW * 0.55, F + sH + 0.4, -L * 0.1, 0, 0, 0, 10); b.sph('white', 0.45 * k, s * sW * 0.55, F + sH + 1.0, -L * 0.1); }
    }
    body.add(b.build(mats));
    for (const n of nav) {
      const radar = grp('radar', n[0], n[1], n[2]);
      const rb = new MB(0.3); rb.box('metal', 3.2 * k, 0.9 * k, 0.12, 0, 0, 0, -0.15); rb.box('glow', 2.2 * k, 0.08, 0.14, 0, 0.1, 0.05, -0.15);
      radar.add(rb.build(mats)); body.add(radar);
    }
    turrets.forEach((t, i) => {
      const tur = grp(i === 0 ? 'turret' : 'turretS', t[0], t[1], t[2]);
      if (t[2] < 0) tur.rotation.y = PI;
      tur.userData.rearFacing = t[2] < 0;
      const tb = new MB(0.25);
      const R = t[3];
      if (t[4] === 'mg') { tb.cyl('dark', 0.35, 0.4, 0.4, 0, 0.2, 0, 0, 0, 0, 8); tb.box('hull', 0.6, 0.5, 0.08, 0, 0.55, 0.3); }
      else tb.top('hull', [[-R, -R], [R, -R], [R * 1.1, R * 0.5], [R * 0.5, R * 1.2], [-R * 0.5, R * 1.2], [-R * 1.1, R * 0.5]], R * 0.85, 0, 0, 0, 0.05);
      tur.add(tb.build(mats));
      const gun = grp(i === 0 ? 'gun' : 'gunS', 0, t[4] === 'mg' ? 0.45 : R * 0.45, t[4] === 'mg' ? 0.2 : R * 0.9);
      const nb = t[5] || 1;
      const bl = new T.Group(); bl.name = i === 0 ? 'barrel' : 'barrelS';
      for (let j = 0; j < nb; j++) {
        const br = barrel(mats, t[4], t[4] === 'mg' ? 1.4 : R * (cls === 'battleship' ? 3.8 : 3.2), t[4] === 'mg' ? 0.06 : R * 0.12, vis, r);
        br.name = ''; br.position.x = (j - (nb - 1) / 2) * R * 0.45; bl.add(br);
      }
      gun.add(bl); tur.add(gun); body.add(tur);
    });
    return root;
  }

  // ------------------------------------------------------------ infantry
  function buildSoldier(u, mats, vis, r, idx) {
    const cls = u.cls, st = baseStyle(u.fac);
    const exo = cls === 'exo', borg = cls === 'cyborg';
    const cu = vis.cust || {};
    const s = new T.Group(); s.name = 'soldier';
    const legH = 0.98, tor = 0.62;
    // torso & head
    const torso = grp('torso', 0, legH, 0);
    const tb = new MB(1.2);
    tb.box(exo || borg ? 'hull' : 'cloth', 0.46, tor, 0.27, 0, tor / 2, 0);
    if (borg) { tb.cyl('metal', 0.07, 0.07, tor, 0, tor / 2, -0.15, 0, 0, 0, 6); for (let i = 0; i < 4; i++) tb.box('glow', 0.3, 0.02, 0.02, 0, tor * 0.25 + i * 0.1, 0.14); }
    tb.box(exo ? 'accent' : 'hull', 0.5, 0.36, 0.14, 0, tor * 0.62, 0.13); // plate carrier
    for (let i = 0; i < 3; i++) tb.box('dark', 0.11, 0.13, 0.08, -0.15 + i * 0.15, tor * 0.3, 0.2);
    tb.box('dark', 0.5, 0.08, 0.3, 0, 0.04, 0); // belt
    tb.box('dark', 0.36, 0.42, 0.2, 0, tor * 0.55, -0.22); // pack
    if (cls === 'jump') { for (const x of [-0.12, 0.12]) { tb.cyl('metal', 0.09, 0.11, 0.5, x, tor * 0.5, -0.38, 0, 0, 0, 8); tb.cyl('glow', 0.08, 0.08, 0.03, x, tor * 0.24, -0.38, 0, 0, 0, 8); } }
    if (cls === 'flamer') { for (const x of [-0.1, 0.1]) { tb.cyl('accent', 0.1, 0.1, 0.55, x, tor * 0.5, -0.36, 0, 0, 0, 10); tb.sph('accent', 0.1, x, tor * 0.78, -0.36); } tb.box('red', 0.06, 0.06, 0.03, 0.1, tor * 0.6, -0.47); }
    if (cls === 'medic') { tb.box('white', 0.3, 0.3, 0.2, 0, tor * 0.55, -0.3); tb.box('red', 0.06, 0.2, 0.03, 0, tor * 0.55, -0.41); tb.box('red', 0.2, 0.06, 0.03, 0, tor * 0.55, -0.41); tb.box('white', 0.16, 0.1, 0.16, 0.27, tor * 0.82, 0); }
    if (cls === 'mortar') { tb.cyl('gun', 0.07, 0.07, 0.95, 0.1, tor * 0.55, -0.32, 0.35, 0, 0.2, 8); tb.cyl('dark', 0.16, 0.16, 0.04, 0.1, tor * 0.2, -0.45, 0.35, 0, 0.2, 10); }
    if (cu.backpack) { tb.box('dark', 0.42, 0.52, 0.26, 0, tor * 0.55, -0.3); tb.cylX('net', 0.09, 0.44, 0, tor * 0.88, -0.3, 8); antenna(tb, -0.14, tor * 0.8, -0.38, 0.7); }
    if (cu.shoulderpads) for (const x of [-1, 1]) tb.box('accent', 0.2, 0.12, 0.3, x * 0.3, tor * 0.95, 0, 0, 0, x * 0.3);
    if (cu.cape) tb.box('cloth', 0.5, tor * 1.4, 0.03, 0, tor * 0.25, -0.24, 0.12);
    if (cu.patch) for (const x of [-1, 1]) tb.box('accent', 0.02, 0.1, 0.1, x * 0.245, tor * 0.82, 0);
    if (cu.skull) tb.box('white', 0.12, 0.12, 0.02, -0.12, tor * 0.66, 0.21);
    if (cls === 'engineer') { antenna(tb, 0.12, tor * 0.7, -0.28, 0.9); tb.box('accent', 0.3, 0.1, 0.05, 0, tor * 0.7, 0.21); }
    if (exo) { for (const x of [-1, 1]) tb.sph('hull', 0.2, x * 0.3, tor * 0.92, 0, 1.2, 0.8, 1.1, 10, 8); tb.box('dark', 0.4, 0.3, 0.25, 0, tor * 0.6, -0.3); tb.cyl('glow', 0.06, 0.06, 0.03, 0, tor * 0.6, -0.43, PI / 2, 0, 0, 8); }
    // head
    const hy = tor + 0.2;
    if (borg) { tb.box('dark', 0.2, 0.22, 0.22, 0, hy + 0.02, 0.01); tb.box('glow', 0.18, 0.04, 0.04, 0, hy + 0.04, 0.12); tb.box('metal', 0.06, 0.12, 0.08, 0, hy + 0.16, -0.02); }
    else tb.box('skin', 0.17, 0.2, 0.18, 0, hy, 0.01);
    if (borg) { }
    else if (st === 'angular') { tb.sph('hull', 0.155, 0, hy + 0.07, 0, 1.05, 0.8, 1.1, 12, 8); tb.box('glass', 0.2, 0.06, 0.06, 0, hy + 0.04, 0.12); }
    else if (st === 'heavy') { tb.sph('hull', 0.16, 0, hy + 0.06, 0, 1, 0.9, 1.05, 12, 8); tb.box('dark', 0.19, 0.12, 0.08, 0, hy - 0.03, 0.1); tb.box('glow', 0.15, 0.03, 0.03, 0, hy + 0.04, 0.14); }
    else if (st === 'sleek') { tb.sph('hull', 0.15, 0, hy + 0.03, 0, 1, 1.1, 1.15, 12, 8); tb.box('glow', 0.2, 0.03, 0.04, 0, hy + 0.04, 0.15); }
    else { tb.box('hull', 0.24, 0.24, 0.26, 0, hy + 0.04, 0); tb.box('glow', 0.04, 0.16, 0.04, 0, hy + 0.02, 0.14); tb.box('glow', 0.18, 0.03, 0.04, 0, hy + 0.08, 0.14); }
    if (cls === 'sniper') tb.cone('net', 0.38, 0.8, 0, tor * 0.55, -0.1, 0.25, 0, 0, 7);
    if (cu.helmetnet && !borg) tb.sph('net', 0.17, 0, hy + 0.09, 0, 1.08, 0.7, 1.12, 8, 6);
    if (cu.goggles && !borg) for (let i = 0; i < 4; i++) tb.cylZ('glow', 0.025, 0.1, -0.06 + i * 0.04, hy + 0.12, 0.15, 6);
    if (vis.elite) { tb.box('accent', 0.04, 0.05, 0.24, 0, hy + 0.2, 0); antenna(tb, -0.12, tor * 0.75, -0.28, 0.6); }
    if (vis.era) { tb.box('accent', 0.52, 0.12, 0.3, 0, tor * 0.9, 0); }
    torso.add(tb.build(mats));
    // arms + weapon
    const arms = grp('arms', 0, tor * 0.85, 0);
    const ab = new MB(1.2);
    ab.box('cloth', 0.12, 0.12, 0.36, 0.24, -0.08, 0.14, 0.4, -0.2); ab.box('cloth', 0.12, 0.12, 0.36, -0.2, -0.1, 0.16, 0.35, 0.35);
    ab.box('skin', 0.08, 0.08, 0.08, 0.1, -0.15, 0.38); ab.box('skin', 0.08, 0.08, 0.08, -0.04, -0.18, 0.5);
    const gz = 0.42;
    if (cls === 'flamer') { ab.box('gun', 0.08, 0.12, 0.55, 0.02, -0.14, gz); ab.cylZ('metal', 0.04, 0.3, 0.02, -0.12, gz + 0.4, 8); ab.cylZ('dark', 0.06, 0.1, 0.02, -0.12, gz + 0.56, 8); ab.sph('glow', 0.03, 0.02, -0.17, gz + 0.6); }
    else if (cls === 'manpads') { ab.cylZ('accent', 0.11, 1.5, 0.18, 0.12, 0.25, 10); ab.cylZ('dark', 0.14, 0.2, 0.18, 0.12, 0.95, 10); ab.box('dark', 0.1, 0.16, 0.2, 0.3, 0.16, 0.25); ab.box('glass', 0.04, 0.08, 0.1, 0.3, 0.22, 0.33); }
    else if (cls === 'at') { ab.cylZ('hull', 0.1, 1.25, 0.18, 0.12, 0.2, 10); ab.cylZ('dark', 0.13, 0.25, 0.18, 0.12, 0.85, 10); ab.box('dark', 0.08, 0.16, 0.12, 0.1, 0.02, 0.32); }
    else if (cls === 'sniper') { ab.box('gun', 0.06, 0.1, 0.9, 0.02, -0.12, gz); ab.cylZ('gun', 0.025, 0.7, 0.02, -0.1, gz + 0.75, 6); ab.cylZ('dark', 0.04, 0.32, 0.02, -0.02, gz + 0.1, 8); ab.box('glow', 0.03, 0.03, 0.03, 0.02, -0.02, gz + 0.27); }
    else if (exo) { ab.box('dark', 0.16, 0.18, 0.75, 0.05, -0.15, gz + 0.1); for (let i = 0; i < 3; i++) ab.cylZ('gun', 0.035, 0.5, 0.05 + Math.cos(i * 2.1) * 0.05, -0.15 + Math.sin(i * 2.1) * 0.05, gz + 0.65, 6); ab.cylZ('glow', 0.05, 0.08, 0.05, -0.15, gz + 0.48, 8); }
    else { ab.box('gun', 0.06, 0.11, 0.6, 0.02, -0.14, gz); ab.cylZ('gun', 0.025, 0.32, 0.02, -0.12, gz + 0.45, 6); ab.box('dark', 0.05, 0.14, 0.07, 0.02, -0.25, gz + 0.05); if (vis.gun) ab.box('glow', 0.03, 0.03, 0.08, 0.02, -0.06, gz + 0.05); }
    arms.add(ab.build(mats));
    torso.add(arms);
    s.add(torso);
    // legs
    for (const sd of [-1, 1]) {
      const hip = grp(sd < 0 ? 'legL' : 'legR', sd * 0.12, legH, 0);
      const lb = new MB(1.2); lb.box(borg ? 'metal' : 'cloth', 0.16, 0.5, 0.18, 0, -0.25, 0); if (exo) lb.box('hull', 0.2, 0.3, 0.2, 0, -0.2, 0.03);
      hip.add(lb.build(mats));
      const knee = grp(sd < 0 ? 'kneeL' : 'kneeR', 0, -0.5, 0);
      const kb = new MB(1.2); kb.box(exo || borg ? 'hull' : 'cloth', 0.14, 0.42, 0.16, 0, -0.21, 0); kb.box('dark', 0.15, 0.12, 0.16, 0, -0.04, 0.06); kb.box('dark', 0.16, 0.1, 0.28, 0, -0.44, 0.05);
      knee.add(kb.build(mats));
      hip.add(knee); s.add(hip);
    }
    const sc = exo ? 1.35 : 1.18;
    s.scale.setScalar(sc);
    return s;
  }
  SM._mk = { grp, antenna, barrel, rotor, baseStyle };
  SM.squadOffsets = function (n) {
    const out = [];
    const ring = [[0, 0.6], [-1.6, -0.6], [1.6, -0.6], [-0.8, -2.0], [0.8, -2.0], [0, -3.2], [-2.4, -2.2], [2.4, -2.2]];
    for (let i = 0; i < n; i++) out.push(ring[i % ring.length]);
    return out;
  };
  function buildSquad(u, mats, vis, r) {
    const root = grp();
    const n = SM.CLASSES[u.cls].squad;
    const offs = SM.squadOffsets(n);
    const sp = u.cls === 'exo' ? 1.35 : 1;
    for (let i = 0; i < n; i++) {
      const s = buildSoldier(u, mats, vis, r, i);
      s.position.set(offs[i][0] * sp, 0, offs[i][1] * sp);
      s.userData.off = [offs[i][0] * sp, offs[i][1] * sp];
      root.add(s);
    }
    return root;
  }

  // ------------------------------------------------------------ public API
  const templates = {};
  SM.unitTemplate = function (u, mods, skin, cust) {
    const vis = SM.visFlags(u, mods);
    const pattern = u.finish || skin || 'factory';
    const cl = (cust || []).slice().sort();
    const key = u.id + '|' + Object.keys(vis).sort().join(',') + '|' + pattern + '|' + cl.join(',');
    if (templates[key]) return templates[key];
    const cu = {}; cl.forEach(c => cu[c] = true);
    vis.cust = cu;
    const finish = ['matte', 'gloss', 'metallic', 'weathered', 'pearl'].find(f => cu[f]);
    const glow = ['glowRed', 'glowGold', 'glowViolet', 'glowWhite'].find(g => cu[g]);
    const trim = cu.goldtrim && cu.chromeTrim ? 'both' : cu.goldtrim ? 'gold' : cu.chromeTrim ? 'chrome' : '';
    const mats = SM.getMats(u.fac, pattern, { finish, glow, trim });
    const r = SM.rng(u.seed);
    const cls = SM.CLASSES[u.cls];
    let obj;
    switch (cls.move) {
      case 'inf': obj = buildSquad(u, mats, vis, r); break;
      case 'track': obj = buildTracked(u, mats, vis, r); break;
      case 'wheel': obj = buildWheeled(u, mats, vis, r); break;
      case 'hover': obj = buildHover(u, mats, vis, r); break;
      case 'mech': obj = buildMech(u, mats, vis, r); break;
      case 'heli': obj = buildHeli(u, mats, vis, r); break;
      case 'plane': obj = buildPlane(u, mats, vis, r); break;
      case 'static': obj = SM.buildStatic(u, mats, vis, r); break;
      default: obj = u.cls === 'amphtank' ? buildTracked(u, mats, vis, r) : buildShip(u, mats, vis, r);
    }
    if (SM.finishTemplate) SM.finishTemplate(obj, u, mats, vis, cu);
    if (u.exclusive) { // exclusive halo trim
      const b = new MB(); b.tor('glow', (cls.r || 4) * 0.9, 0.04, 0, 0.05, 0, PI / 2, 0, 0, 40); const ring = b.build(mats); ring.name = 'exring'; obj.add(ring);
    }
    templates[key] = obj;
    return obj;
  };

  SM.collectRig = function (obj) {
    const rig = { turrets: [], guns: [], barrels: [], wheels: [], rotors: [], trotors: [], props: [], radars: [], flames: [], soldiers: [], tracks: [], legs: [], spiderLegs: [], spiderKnees: [], body: null, torso: null, pelvis: null, armL: null, armR: null, blurs: [], sprockets: [], steer: [], ailerons: [], jets: [], pennants: [], holos: [] };
    obj.traverse(o => {
      const n = o.name;
      if (o.isMesh && o.userData.track) { o.material = o.material.clone(); o.material.map = o.material.map.clone(); o.material.map.needsUpdate = true; rig.tracks.push(o.material.map); }
      if (!n) return;
      if (n === 'turret') rig.turrets.unshift(o);
      else if (n === 'turret2' || n === 'turretS') rig.turrets.push(o);
      else if (n === 'gun') rig.guns.unshift(o);
      else if (n === 'gunL' || n === 'gunS') rig.guns.push(o);
      else if (n === 'barrel') rig.barrels.unshift(o);
      else if (n === 'barrelS') rig.barrels.push(o);
      else if (n === 'wheel') rig.wheels.push(o);
      else if (n === 'sprocket') rig.sprockets.push(o);
      else if (n === 'steer') rig.steer.push(o);
      else if (n === 'aileronL' || n === 'aileronR') rig.ailerons.push(o);
      else if (n === 'jet') rig.jets.push(o);
      else if (n === 'pennant') rig.pennants.push(o);
      else if (n === 'holo') rig.holos.push(o);
      else if (n === 'rotor') rig.rotors.push(o);
      else if (n === 'trotor') rig.trotors.push(o);
      else if (n === 'prop') rig.props.push(o);
      else if (n === 'radar') rig.radars.push(o);
      else if (n === 'flame') rig.flames.push(o);
      else if (n === 'blur') rig.blurs.push(o);
      else if (n === 'soldier') rig.soldiers.push({ g: o, legL: o.getObjectByName('legL'), legR: o.getObjectByName('legR'), kneeL: o.getObjectByName('kneeL'), kneeR: o.getObjectByName('kneeR'), arms: o.getObjectByName('arms'), torso: o.getObjectByName('torso'), off: o.userData.off, alive: true, phase: Math.random() * 6, die: 0, crouch: 0, reload: Math.random() * 4, fallDir: Math.random() < 0.5 ? -1 : 1, fallSide: (Math.random() - 0.5) * 0.8 });
      else if (n === 'body') rig.body = o;
      else if (n === 'torso' && !rig.torso && o.parent && o.parent.name === 'pelvis') rig.torso = o;
      else if (n === 'pelvis') rig.pelvis = o;
      else if (n === 'armL') rig.armL = o; else if (n === 'armR') rig.armR = o;
      else if (n === 'hipL' || n === 'hipR') rig.legs.push({ hip: o, knee: o.getObjectByName('knee' + n.slice(3)), ankle: o.getObjectByName('ankle' + n.slice(3)), side: n === 'hipL' ? 0 : 1, rest: o.userData.rest || [-0.25, 0.45, -0.2], rev: !!o.userData.reverse });
      else if (/^leg\d$/.test(n)) rig.spiderLegs[+n[3]] = o;
      else if (/^legk\d$/.test(n)) rig.spiderKnees[+n[4]] = o;
    });
    rig.legs.forEach(l => { l.hip.rotation.x = l.rest[0]; l.knee.rotation.x = l.rest[1]; l.ankle.rotation.x = l.rest[2]; });
    return rig;
  };

  SM.instantiate = function (u, mods, skin, cust) {
    const t = SM.unitTemplate(u, mods, skin, cust);
    const o = t.clone(true);
    const rig = SM.collectRig(o);
    return { obj: o, rig };
  };

  // ------------------------------------------------------------ animation (shared by battle and hangar)
  SM.animateUnit = function (rig, cls, st, dt, time) {
    // st: {speed (current), moving, firing (recoil 0..1), aimYaw (turret local), aimPitch, alt, bank}
    const sp = st.speed || 0;
    for (const t of rig.tracks) t.offset.y -= sp * dt * 0.35;
    for (const w of rig.wheels) w.rotation.x += sp * dt / 0.6;
    for (const ro of rig.rotors) ro.rotation.y += dt * 28 * (ro.userData.dir || 1);
    for (const ro of rig.trotors) ro.rotation.x += dt * 40;
    for (const p of rig.props) { if (p.userData.axis === 'z') p.rotation.z += dt * 30; else p.rotation.z += dt * 20; }
    for (const rd of rig.radars) rd.rotation.y += dt * 1.6;
    for (const f of rig.flames) { const s = 0.75 + Math.random() * 0.35 + (st.boost ? 0.6 : 0); f.scale.set(1, s, 1); }
    if (rig.barrels.length) {
      const rc = st.recoil || 0;
      rig.barrels[0].position.z = (rig.barrels[0].userData.z0 === undefined ? (rig.barrels[0].userData.z0 = rig.barrels[0].position.z) : rig.barrels[0].userData.z0) - rc * 0.6;
    }
    const mv = cls.move;
    if (mv === 'inf') {
      for (const s of rig.soldiers) {
        if (!s.alive) {
          s.die += dt;
          s.g.rotation.x = -Math.min(1, s.die * 2.2) * PI / 2;
          s.g.position.y = (s.gy || 0) + (s.die > 2 ? -(s.die - 2) * 0.6 : 0.15 * Math.min(1, s.die * 2.2));
          if (s.die > 4) s.g.visible = false;
          continue;
        }
        s.g.position.y = s.gy || 0;
        s.phase += dt * (sp > 0.3 ? sp * 2.3 : 0.8);
        const a = sp > 0.3 ? Math.sin(s.phase) : 0;
        s.legL.rotation.x = a * 0.7; s.legR.rotation.x = -a * 0.7;
        s.kneeL.rotation.x = Math.max(0, -Math.sin(s.phase - 0.6)) * (sp > 0.3 ? 1.0 : 0);
        s.kneeR.rotation.x = Math.max(0, Math.sin(s.phase - 0.6)) * (sp > 0.3 ? 1.0 : 0);
        s.torso.position.y = 0.98 + (sp > 0.3 ? Math.abs(Math.cos(s.phase)) * 0.05 : Math.sin(time * 1.5 + s.phase) * 0.008);
        s.torso.rotation.x = sp > 0.3 ? 0.12 : 0;
        s.arms.rotation.x = -(st.aimPitch || 0) - (st.firing ? 0.05 + Math.random() * 0.04 : 0);
        s.arms.position.z = st.firing ? -Math.random() * 0.03 : 0;
      }
    } else if (mv === 'mech') {
      const ph = st.phase || 0;
      const moving = sp > 0.3;
      if (rig.spiderLegs.length) {
        rig.spiderLegs.forEach((l, i) => {
          if (!l.userData.ry) l.userData.ry = l.rotation.y;
          const off = (i === 0 || i === 3) ? 0 : PI;
          const sw = moving ? Math.sin(ph + off) : 0;
          l.rotation.y = l.userData.ry + sw * 0.28;
          if (rig.spiderKnees[i]) rig.spiderKnees[i].rotation.x = moving ? -Math.max(0, Math.cos(ph + off)) * 0.35 : 0;
        });
        if (rig.pelvis) rig.pelvis.position.y = (rig.pelvis.userData.y0 || (rig.pelvis.userData.y0 = rig.pelvis.position.y)) + (moving ? Math.abs(Math.sin(ph)) * 0.15 : Math.sin(time) * 0.04);
      } else {
        rig.legs.forEach(l => {
          const p = ph + (l.side ? PI : 0);
          const sw = moving ? Math.sin(p) : 0;
          const lift = moving ? Math.max(0, Math.cos(p)) : 0;
          if (l.rev) { l.hip.rotation.x = l.rest[0] - sw * 0.35 + lift * 0.15; l.knee.rotation.x = l.rest[1] - lift * 0.5; l.ankle.rotation.x = l.rest[2] + sw * 0.2 + lift * 0.3; }
          else { l.hip.rotation.x = l.rest[0] - sw * 0.42 - lift * 0.2; l.knee.rotation.x = l.rest[1] + lift * 0.75; l.ankle.rotation.x = l.rest[2] + sw * 0.3 - lift * 0.3; }
        });
        if (rig.pelvis) {
          const y0 = rig.pelvis.userData.y0 || (rig.pelvis.userData.y0 = rig.pelvis.position.y);
          rig.pelvis.position.y = y0 - (moving ? Math.abs(Math.cos(ph)) * 0.18 : 0) + Math.sin(time * 1.3) * 0.03;
          rig.pelvis.rotation.z = moving ? Math.sin(ph) * 0.04 : 0;
        }
      }
      if (rig.armL) rig.armL.rotation.x = moving && !st.firing ? Math.sin(ph) * 0.2 : -(st.aimPitch || 0) - 0.1;
      if (rig.armR) rig.armR.rotation.x = -(st.aimPitch || 0) - 0.1 - (st.recoil || 0) * 0.25;
    } else if (mv === 'hover' && rig.body) {
      rig.body.position.y = 0.25 + Math.sin(time * 2.1) * 0.12;
    }
  };

  // ------------------------------------------------------------ buildings / map objects
  SM.buildHQ = function (fac, teamColor) {
    const mats = SM.getMats(fac, 'factory');
    const root = grp();
    const b = new MB(0.12);
    // base pad
    b.cyl('deck', 26, 27, 0.8, 0, 0.4, 0, 0, 0, 0, 8);
    // command bunker
    b.front('hull', [[-9, 0], [9, 0], [7.5, 7], [-7.5, 7]], 12, 0, 0.8, -2, 0.2);
    b.front('dark', [[-6, 0], [6, 0], [5, 3.5], [-5, 3.5]], 7, 0, 7.8, -2, 0.1);
    for (let i = 0; i < 6; i++) b.box('glow', 1.2, 0.35, 0.1, -5 + i * 2, 5, 4.05);
    b.box('glass', 9, 1.0, 0.1, 0, 9.6, 1.55);
    // comms tower
    b.cyl('metal', 0.5, 0.9, 16, 6, 8.8, -6, 0, 0, 0, 6);
    for (let i = 0; i < 4; i++) b.box('dark', 2.4, 0.3, 2.4, 6, 4 + i * 3.5, -6);
    b.sph('white', 1.4, 6, 17.5, -6);
    // hangar
    b.push('hull', new T.CylinderGeometry(6, 6, 14, 16, 1, false, 0, PI), -14, 0.8, 8, 0, 0, PI / 2);
    const hg = b.L.hull[b.L.hull.length - 1]; hg.rotateY(0);
    b.box('dark', 0.2, 5.5, 11, -7, 3.5, 8);
    // helipad
    b.cyl('dark', 7, 7, 0.3, 14, 0.95, 10, 0, 0, 0, 24);
    b.box('white', 0.8, 0.05, 5, 12.4, 1.12, 10); b.box('white', 0.8, 0.05, 5, 15.6, 1.12, 10); b.box('white', 3.2, 0.05, 0.8, 14, 1.12, 10);
    for (let i = 0; i < 8; i++) { const a = i * PI / 4; b.box('light', 0.3, 0.2, 0.3, 14 + Math.cos(a) * 6.6, 1.15, 10 + Math.sin(a) * 6.6); }
    // fuel tanks
    for (let i = 0; i < 3; i++) b.cyl('white', 2, 2, 5, -16 + i * 4.6, 3.3, -14, 0, 0, 0, 14);
    // walls & sandbags
    for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; if (Math.abs(Math.sin(a)) > 0.92 && Math.cos(a) > -2) continue; b.box('hull', 8.6, 2.4, 1.2, Math.cos(a) * 25, 2, Math.sin(a) * 25, 0, -a + PI / 2, 0); }
    root.add(b.build(mats));
    // defense turrets
    for (const s of [-1, 1]) {
      const tg = grp('turret', s * 14, 0.8, 16);
      const tb = new MB(0.3); tb.cyl('dark', 2, 2.4, 2.6, 0, 1.3, 0, 0, 0, 0, 8); tb.cyl('hull', 1.6, 1.8, 1.4, 0, 3.2, 0, 0, 0, 0, 8);
      tg.add(tb.build(mats));
      const gun = grp('gun', 0, 3.4, 1.4); const bl = new T.Group(); bl.name = 'barrel';
      for (const x of [-0.5, 0.5]) { const br = SM.barrel(mats, 'cannon', 4.5, 0.18, {}, SM.rng(3)); br.name = ''; br.position.x = x; bl.add(br); }
      gun.add(bl); tg.add(gun); root.add(tg);
    }
    // radar
    const radar = grp('radar', 6, 19.2, -6);
    const rb = new MB(0.3); rb.box('metal', 5, 1.6, 0.2, 0, 0, 0, -0.2); rb.box('glow', 3.6, 0.1, 0.22, 0, 0.3, 0.05, -0.2); radar.add(rb.build(mats)); root.add(radar);
    // flag
    const fp = new MB(0.3); fp.cyl('metal', 0.12, 0.15, 14, -6, 8, 10, 0, 0, 0, 6); root.add(fp.build(mats));
    const flag = new T.Mesh(new T.PlaneGeometry(5, 3, 10, 4), new T.MeshStandardMaterial({ color: teamColor, side: T.DoubleSide, roughness: 0.8 }));
    flag.position.set(-3.5, 13.2, 10); flag.name = 'flag'; root.add(flag);
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return root;
  };

  SM.buildCapturePoint = function (letter) {
    const root = grp();
    const b = new MB(0.3);
    const mats = SM.getMats('coalition', 'factory');
    b.cyl('metal', 0.14, 0.18, 10, 0, 5, 0, 0, 0, 0, 6);
    b.cyl('deck', 1.4, 1.8, 0.6, 0, 0.3, 0, 0, 0, 0, 8);
    for (let i = 0; i < 6; i++) { const a = i * PI / 3; b.box('dark', 1.6, 0.9, 0.9, Math.cos(a) * 20.5, 0.45, Math.sin(a) * 20.5, 0, -a, 0); }
    root.add(b.build(mats));
    const flagMat = new T.MeshStandardMaterial({ color: 0xdddddd, side: T.DoubleSide, roughness: 0.8 });
    const flag = new T.Mesh(new T.PlaneGeometry(4, 2.4, 10, 3), flagMat);
    flag.position.set(2.05, 8.6, 0); flag.name = 'flag'; root.add(flag);
    const ringMat = new T.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.55, depthWrite: false });
    const ring = new T.Mesh(new T.RingGeometry(20.6, 22, 64), ringMat);
    ring.rotation.x = -PI / 2; ring.position.y = 0.35; ring.name = 'ring'; root.add(ring);
    const fill = new T.Mesh(new T.CircleGeometry(20.6, 48), new T.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.08, depthWrite: false }));
    fill.rotation.x = -PI / 2; fill.position.y = 0.3; fill.name = 'fill'; root.add(fill);
    const spr = new T.Sprite(new T.SpriteMaterial({ map: SM.labelTexture(letter, '#dddddd'), depthTest: false }));
    spr.scale.set(5, 5, 1); spr.position.y = 14; spr.name = 'label'; spr.renderOrder = 10; root.add(spr);
    root.traverse(o => { if (o.isMesh && o.name !== 'ring' && o.name !== 'fill') { o.castShadow = true; o.receiveShadow = true; } });
    return root;
  };
})();
