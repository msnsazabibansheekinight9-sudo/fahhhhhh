// Kestrel — props and room furnishing. Static props are merged into chunk geometry; interactive ones are separate.
(function () {
  const K = window.K, S = K.S, WT = K.WT;
  const P = K.prim;

  // Placement helper: local frame x = along wall (right), z = out of wall into the room, y = up.
  class Put {
    constructor(ctx, x, z, rot, y = 0) {
      this.ctx = ctx; this.x = x; this.z = z; this.rot = rot; this.y = y;
      this.base = new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z);
      this.B = ctx.B(x, z);
      this.c = Math.cos(rot); this.s = Math.sin(rot);
    }
    w(lx, lz) { return [this.x + lx * this.c + lz * this.s, this.z - lx * this.s + lz * this.c]; }
    m(x, y, z, rx, ry, rz, sx, sy, sz) { return this.base.clone().multiply(K.mat4(x, y, z, rx, ry, rz, sx, sy, sz)); }
    box(k, x, y, z, w, h, d, rx, ry, rz, fid) { this.B.addGeom(P.box, k, this.m(x, y, z, rx, ry, rz, w, h, d), fid); return this; }
    cyl(k, x, y, z, r, h, rx, ry, rz, lo) { this.B.addGeom(lo ? P.cyl8 : P.cyl, k, this.m(x, y, z, rx, ry, rz, r * 2, h, r * 2)); return this; }
    sph(k, x, y, z, sx, sy, sz) { this.B.addGeom(P.sph, k, this.m(x, y, z, 0, 0, 0, sx, sy, sz)); return this; }
    geo(g, k, x, y, z, rx, ry, rz, sx = 1, sy = 1, sz = 1, fid) { this.B.addGeom(g, k, this.m(x, y, z, rx, ry, rz, sx, sy, sz), fid); return this; }
    col(cx, cz, w, d, h = 2) { // local rect -> world AABB
      const [wx, wz] = this.w(cx, cz), q = Math.abs(Math.round(this.rot / (Math.PI / 2))) % 2 === 1;
      const hw = (q ? d : w) / 2, hd = (q ? w : d) / 2;
      this.ctx.addCollider(wx - hw, wz - hd, wx + hw, wz + hd, h); return this;
    }
    spot(x, y, z) { const [wx, wz] = this.w(x, z); this.ctx.spots.push([wx, this.y + y, wz]); return this; }
    light(x, y, z, color, int, range, opts) { const [wx, wz] = this.w(x, z); return this.ctx.addFixture(wx, this.y + y, wz, color, int, range, opts); }
  }
  K.Put = Put;

  // extra materials used by props
  K.initPropMats = function (M, T) {
    const led = c => new THREE.MeshBasicMaterial({ color: c });
    M.ledG = led(0x46ff8a); M.ledR = led(0xff3322); M.ledA = led(0xffaa33); M.ledB = led(0x55aaff); M.ledW = led(0x4a5560);
    for (let i = 0; i < 8; i++) {
      const hue = ['amber', 'green', 'amber', 'blue', 'amber', 'red', 'green', 'amber'][i];
      M['scr' + i] = new THREE.MeshBasicMaterial({ map: K.screenTex(null, hue, i * 13 + 1) });
    }
    M.scrG = new THREE.MeshBasicMaterial({ map: K.screenTex(['VITALS MONITOR', 'HR ---  BP ---/---', 'SpO2 --', '', 'NO SIGNAL', ''], 'green', 5) });
    // blood splatter decal
    const c = K.canvas(256), x = c.getContext('2d'), r = K.rng(77);
    for (let i = 0; i < 60; i++) { const a = r() * K.TAU, d = Math.pow(r(), 1.6) * 100, rad = (1 - d / 110) * r.range(4, 26); x.fillStyle = `rgba(${60 + r() * 30},${4 + r() * 6},${4},${.75 + r() * .25})`; x.beginPath(); x.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, rad, 0, K.TAU); x.fill(); }
    for (let i = 0; i < 14; i++) { const a = r() * K.TAU; x.strokeStyle = 'rgba(70,6,4,.8)'; x.lineWidth = r.range(1, 4); x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.cos(a) * r.range(80, 125), 128 + Math.sin(a) * r.range(80, 125)); x.stroke(); }
    const bt = K.tex(c); bt.wrapS = bt.wrapT = THREE.ClampToEdgeWrapping;
    M.blood = K.bakeMat({ map: bt, color: 0x6e4646, transparent: true, roughness: .2, metalness: .1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    // acid / alien resin
    M.resin = K.bakeMat({ color: 0x14161a, roughness: .25, metalness: .4, envMap: M.wall.envMap });
    M.liquid = new THREE.MeshStandardMaterial({ color: 0x3aff9a, emissive: 0x0c5a34, transparent: true, opacity: .35, roughness: .1, depthWrite: false });
    M.liquidS = M.liquid;
    K.initCorpseMats && K.initCorpseMats(M);
    M.hull = K.bakeMat({ color: 0x55585c, map: T.wallC.map, roughness: .6, metalness: .5 });
    M.paper = K.bakeMat({ color: 0xdcd6c4, roughness: .9, side: THREE.DoubleSide });
    // leaf texture
    const lc = K.canvas(128), lx = lc.getContext('2d');
    for (let i = 0; i < 9; i++) { lx.fillStyle = `rgb(${40 + i * 4},${90 + i * 8},${40})`; lx.beginPath(); lx.ellipse(64 + Math.sin(i * 2.1) * 30, 20 + i * 11, 26, 9, Math.sin(i) * .8, 0, K.TAU); lx.fill(); }
    const lt = K.tex(lc); M.leaf.map = lt; M.leaf.alphaTest = .5; M.leaf.transparent = false; M.leaf.needsUpdate = true;
  };

  const R = (r, a, b) => r.range(a, b);

  // ------------------------------------------------------------ prop builders
  const props = {
    shelf(p, r) {
      const w = 1.8, d = .5;
      for (const sx of [-1, 1]) for (const sz of [0, 1]) p.box('metal', sx * (w / 2 - .03), 1, .03 + sz * (d - .06), .04, 2, .04);
      for (let k = 0; k < 4; k++) {
        const y = .12 + k * .55; p.box('metal', 0, y, d / 2, w, .03, d);
        let x = -w / 2 + .1;
        while (x < w / 2 - .25) {
          const bw = R(r, .18, .45);
          if (r.chance(.75)) {
            const t = r();
            if (t < .5) p.box(r.pick(['orange', 'plastic', 'blue', 'dark', 'green']), x + bw / 2, y + .02 + bw * .35, d / 2, bw, bw * .7, d * .7, 0, R(r, -.2, .2), 0);
            else if (t < .8) for (let q = 0; q < 3; q++) p.cyl(r.pick(['red', 'metal', 'white']), x + .06 + q * .1, y + .1, d / 2 + R(r, -.1, .1), .045, .18, 0, 0, 0, true);
            else p.box('paper', x + bw / 2, y + .04, d / 2, bw, .06, .3);
          } else if (k > 0 && k < 3) p.spot(x + bw / 2, y + .03, d / 2);
          x += bw + .05;
        }
      }
      p.col(0, d / 2, w, d);
    },
    cabinet(p, r) {
      p.box('plastic', 0, 1, .25, 1, 2, .5);
      for (let k = 0; k < 4; k++) { p.box('trim', 0, .3 + k * .48, .505, .9, .015, .01); p.box('metal', 0, .45 + k * .48, .52, .2, .03, .03); }
      p.box('trim', 0, 2.01, .25, 1.02, .03, .52);
      p.spot(0, 2.03, .25); p.col(0, .25, 1, .5);
    },
    desk(p, r, ctx) {
      p.box('plastic', 0, .74, .42, 1.6, .05, .8).box('trim', 0, .71, .42, 1.62, .02, .82);
      p.box('plastic', -.55, .37, .42, .45, .7, .72);
      for (let k = 0; k < 3; k++) p.box('trim', -.55, .2 + k * .22, .785, .38, .012, .01);
      p.box('metal', .76, .37, .1, .04, .7, .04).box('metal', .76, .37, .74, .04, .7, .04);
      // CRT terminal
      const sc = 'scr' + r.int(0, 7);
      p.box('plastic', .1, .98, .22, .5, .4, .42).box('plastic', .1, .98, .02, .38, .3, .1);
      p.geo(P.plane, sc, .1, 1.0, .4325, -.05, 0, 0, .4, .3);
      p.box('dark', .1, .78, .55, .45, .03, .16);
      p.light(.1, 1.05, .6, [1, .7, .35], .25, 2.2, { kind: 'screen' });
      if (r.chance(.6)) p.box('white', .55, .8, .5, .08, .1, .08);
      if (r.chance(.5)) p.box('paper', -.4, .77, .55, .3, .01, .22, 0, R(r, -.5, .5), 0);
      p.spot(R(r, -.6, .6), .77, .62);
      // chair (pushed back, a bit askew)
      const a = R(r, -.6, .6), cz = 1.15;
      const cx = R(r, -.2, .2);
      const cp = new Put(ctx, ...p.w(cx, cz), p.rot + Math.PI + a);
      props.chair(cp, r);
      p.col(0, .42, 1.6, .8, .8);
    },
    chair(p) {
      p.box('fabric', 0, .48, 0, .48, .08, .46).box('fabric', 0, .82, -.22, .46, .5, .06, -.12, 0, 0);
      p.cyl('dark', 0, .25, 0, .03, .44);
      for (let k = 0; k < 5; k++) { const a = k / 5 * K.TAU; p.box('dark', Math.sin(a) * .18, .04, Math.cos(a) * .18, .05, .04, .36, 0, a, 0); }
    },
    medbed(p, r) {
      p.box('metal', 0, .55, 1.05, .95, .08, 2.0).box('white', 0, .66, 1.05, .9, .14, 1.94).box('white', 0, .78, .3, .6, .12, .35, -.2, 0, 0);
      for (const sx of [-.4, .4]) for (const sz of [.15, 1.95]) p.cyl('metal', sx, .27, sz, .025, .54);
      p.box('metal', -.47, .8, 1.05, .03, .2, 1.4);
      // vitals monitor on arm + IV stand
      p.cyl('metal', .62, .9, .15, .025, 1.8).box('plastic', .62, 1.7, .32, .42, .32, .2, -.2, 0, 0).geo(P.plane, 'scrG', .62, 1.72, .425, -.2, 0, 0, .34, .24);
      p.light(.62, 1.7, .5, [.3, 1, .5], .25, 2.5, { kind: 'screen' });
      p.cyl('metal', -.65, 1, 1.6, .015, 2).box('metal', -.65, 1.95, 1.6, .3, .02, .02).box('glassP', -.75, 1.75, 1.6, .12, .25, .05);
      if (r.chance(.4)) p.box('blood', 0, .74, 1.2, .7, .005, .9);
      p.spot(.2, .76, 1.7);
      p.col(0, 1.05, 1.0, 2.0, 1);
    },
    bunk(p, r) {
      for (const y of [.35, 1.45]) { p.box('metal', 0, y, 1.0, .9, .07, 1.95).box(r.chance(.5) ? 'fabric' : 'fabricR', 0, y + .1, 1.0, .85, .13, 1.9).box('white', 0, y + .2, .25, .5, .1, .3); }
      for (const sx of [-.44, .44]) for (const sz of [.05, 1.95]) p.box('metal', sx, .95, sz, .05, 1.9, .05);
      for (let k = 0; k < 4; k++) p.box('metal', .46, .5 + k * .3, 1.6, .03, .03, .35);
      p.spot(0, .5, 1.4); p.col(0, 1, 1, 2, 1.9);
    },
    console(p, r) {
      p.box('dark', 0, .45, .35, 1.8, .9, .7).box('plastic', 0, .98, .45, 1.8, .06, .55, -.45, 0, 0).box('dark', 0, 1.3, .1, 1.8, .7, .2);
      for (let k = 0; k < 3; k++) {
        const sc = 'scr' + r.int(0, 7);
        p.geo(P.plane, sc, -.6 + k * .6, 1.32, .205, 0, 0, 0, .5, .38);
      }
      for (let k = 0; k < 18; k++) p.box(r.pick(['ledG', 'ledA', 'ledR', 'dark', 'dark']), -.8 + (k % 9) * .2, 1.0 + Math.floor(k / 9) * .04, .5 + Math.floor(k / 9) * -.05, .07, .02, .05, -.45, 0, 0);
      p.light(0, 1.3, .5, [.9, .7, .4], .35, 2.5, { kind: 'screen' });
      p.col(0, .35, 1.8, .7, 1.6);
    },
    serverRack(p, r) {
      p.box('dark', 0, 1.05, .45, .8, 2.1, .9);
      for (let k = 0; k < 12; k++) {
        p.box('trim', 0, .25 + k * .15, .905, .74, .11, .01);
        for (let q = 0; q < 4; q++) if (r.chance(.6)) p.box(r.pick(['ledG', 'ledG', 'ledA', 'ledB', 'ledR']), -.3 + q * .05, .25 + k * .15, .912, .02, .02, .005);
      }
      p.light(0, 1.2, 1, [.3, 1, .5], .12, 1.8, { kind: 'screen' });
      p.col(0, .45, .8, .9, 2.1);
    },
    crate(p, r, s = R(r, .7, 1.1), mat) {
      const m = mat || r.pick(['orange', 'metal', 'green', 'plastic']);
      p.box(m, 0, s / 2, 0, s, s, s);
      for (const sy of [.02, s - .02]) { p.box('trim', 0, sy, s / 2, s + .02, .04, .04).box('trim', 0, sy, -s / 2, s + .02, .04, .04).box('trim', s / 2, sy, 0, .04, .04, s + .02).box('trim', -s / 2, sy, 0, .04, .04, s + .02); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box('trim', sx * s / 2, s / 2, sz * s / 2, .04, s, .04);
      p.col(0, 0, s, s, s); p.spot(R(r, -.2, .2), s, R(r, -.2, .2));
      return s;
    },
    container(p, r) { // cargo container 2.2 x 2.4 x 2
      const m = r.pick(['orange', 'blue', 'green', 'red', 'metal']);
      p.box(m, 0, 1.2, 0, 2.2, 2.4, 2);
      for (let k = -5; k <= 5; k++) { p.box(m, k * .2, 1.2, 1.01, .06, 2.3, .03); p.box(m, k * .2, 1.2, -1.01, .06, 2.3, .03); }
      p.box('dark', 0, 2.42, 0, 2.24, .05, 2.04).box('hazard', 1.105, 1.2, 0, .02, .3, 1.6);
      p.col(0, 0, 2.2, 2, 2.4);
    },
    barrel(p, r, m) {
      m = m || r.pick(['red', 'blue', 'metal', 'green']);
      p.cyl(m, 0, .45, 0, .3, .9); for (const y of [.2, .7]) p.cyl('trim', 0, y, 0, .305, .04, 0, 0, 0, true);
      p.cyl('dark', 0, .905, 0, .27, .01); p.col(0, 0, .6, .6, .9);
    },
    messTable(p, r) {
      p.box('plastic', 0, .74, 0, 2.2, .05, .9).cyl('metal', -.8, .37, 0, .04, .72).cyl('metal', .8, .37, 0, .04, .72);
      for (const sz of [-.75, .75]) { p.box('fabric', 0, .45, sz, 2.1, .07, .35); p.box('metal', -.8, .22, sz, .04, .44, .3).box('metal', .8, .22, sz, .04, .44, .3); }
      for (let k = 0; k < 4; k++) if (r.chance(.6)) p.box('metal', R(r, -.9, .9), .775, R(r, -.3, .3), .35, .02, .25, 0, R(r, -.3, .3), 0);
      p.spot(R(r, -.8, .8), .77, R(r, -.3, .3));
      p.col(0, 0, 2.2, .9, .8);
    },
    vending(p, r) {
      const m = r.pick(['red', 'blue', 'orange']);
      p.box(m, 0, .95, .4, .9, 1.9, .8).box('ledW', -.1, 1.15, .805, .6, 1.2, .01).box('dark', .33, 1.2, .805, .15, .5, .01).box('dark', 0, .25, .81, .7, .2, .02);
      for (let k = 0; k < 5; k++) for (let q = 0; q < 4; q++) p.box(r.pick(['red', 'orange', 'green', 'blue', 'white']), -.35 + q * .17, .7 + k * .22, .78, .1, .14, .04);
      p.light(0, 1.2, 1, [.9, .95, 1], .5, 3, { kind: 'screen' });
      p.col(0, .4, .9, .8, 1.9);
    },
    planter(p, r) {
      p.box('metal', 0, .35, 0, 2.2, .7, .7).box('soil', 0, .7, 0, 2.1, .02, .6);
      for (let k = 0; k < 7; k++) {
        const x = -.9 + k * .3, h = R(r, .3, .7), y = .7 + h / 2;
        p.geo(P.plane, 'leaf', x, y, 0, 0, R(r, 0, 3), 0, .4, h).geo(P.plane, 'leaf', x, y, 0, 0, R(r, 0, 3) + 1.57, 0, .4, h);
      }
      for (const sx of [-1, 1]) p.cyl('metal', sx * 1.05, 1.4, 0, .02, 1.4);
      p.box('dark', 0, 2.1, 0, 2.2, .06, .2);
      const fid = p.light(0, 2.0, 0, [1, .35, .9], 1.1, 4.5, { kind: 'main', grow: true });
      p.box('lamp', 0, 2.06, 0, 2.0, .02, .12, 0, 0, 0, fid);
      p.col(0, 0, 2.2, .7, .9); p.spot(R(r, -.8, .8), .71, .2);
    },
    cryoPod(p, r) {
      p.box('metal', 0, .3, 0, .9, .6, 2.1).box('dark', 0, .62, 0, .8, .04, 2);
      p.geo(K.podGeo || (K.podGeo = K.lathe([[0, 0], [.35, .05], [.42, .4], [.4, 1.6], [.3, 1.95], [0, 2.02]], 18)), 'glassP', 0, .64, -1, Math.PI / 2, 0, 0, 1, 1, .6);
      p.geo(K.podGeo, 'white', 0, .62, -1, Math.PI / 2, 0, 0, .95, 1, .25);
      if (r.chance(.5)) p.sph('dark', 0, .85, -.7, .22, .2, .25).box('dark', 0, .8, 0, .4, .2, 1.1);
      p.box('ledB', 0, .45, 1.05, .5, .06, .01).box('plastic', 0, .8, 1.15, .5, .4, .2);
      p.light(0, .9, 0, [.4, .7, 1], .4, 2.5, { kind: 'screen' });
      p.col(0, 0, .95, 2.1, 1.1);
    },
    tank(p, r) {
      p.cyl('dark', 0, .2, 0, .6, .4).cyl('dark', 0, 2.55, 0, .6, .3);
      p.cyl('liquidS', 0, 1.375, 0, .5, 2.05).cyl('glassP', 0, 1.375, 0, .55, 2.1);
      // curled specimen
      const y = 1.3;
      p.sph('flesh', 0, y, 0, .28, .22, .34).sph('flesh', 0, y + .22, .12, .16, .16, .26);
      for (let k = 0; k < 8; k++) { const a = k * .7; p.sph('flesh', Math.sin(a) * .2, y - .1 + k * .02, -.2 + Math.cos(a) * .2, .07 - k * .006, .07 - k * .006, .07 - k * .006); }
      for (let k = 0; k < 3; k++) p.cyl('metal', -.3 + k * .3, 2.9, 0, .04, .5);
      p.light(0, 1.4, 0, [.3, 1, .6], .9, 4, { kind: 'screen' });
      p.col(0, 0, 1.2, 1.2, 2.7);
    },
    pipes(p, r, h) {
      const n = r.int(2, 4);
      for (let k = 0; k < n; k++) {
        const x = -.6 + k * .4, rad = R(r, .05, .11);
        p.cyl(r.pick(['copper', 'metal', 'dark']), x, h / 2, rad + .05, rad, h);
        for (let y = .5; y < h; y += 1.2) p.box('trim', x, y, rad + .05, rad * 2.6, .06, rad * 2.6);
        if (r.chance(.4)) p.cyl('red', x, 1.3, rad * 2 + .1, .1, .03, Math.PI / 2, 0, 0);
      }
    },
    wallScreen(p, r) {
      p.box('dark', 0, 1.7, .04, 1.4, .9, .08).geo(P.plane, 'scr' + r.int(0, 7), 0, 1.7, .082, 0, 0, 0, 1.28, .78);
      p.light(0, 1.7, .4, [1, .7, .4], .25, 2.2, { kind: 'screen' });
    },
    extinguisher(p) { p.box('red', 0, 1.2, .05, .32, .6, .1).cyl('red', 0, 1.15, .14, .07, .42).box('white', 0, 1.47, .05, .32, .06, .1); },
    intercom(p) { p.box('plastic', 0, 1.4, .03, .3, .4, .06).box('dark', 0, 1.45, .065, .2, .12, .01).box('ledR', .08, 1.3, .065, .03, .03, .01); },
    corpse(p, r, ctx, opts) { K.buildCorpse(p, r, opts); },
    papers(p, r) { for (let k = 0; k < r.int(3, 8); k++) p.geo(P.plane, 'paper', R(r, -.8, .8), .006 + k * .001, R(r, .2, 1.4), -Math.PI / 2, 0, R(r, 0, 3), .21, .29); },
    bench(p) { p.box('fabric', 0, .45, .25, 1.8, .08, .5).box('metal', -.8, .22, .25, .06, .44, .4).box('metal', .8, .22, .25, .06, .44, .4).box('fabric', 0, .8, .03, 1.8, .6, .06); p.col(0, .25, 1.8, .5, .5); },
    plantPot(p, r) { p.cyl('plastic', 0, .3, 0, .3, .6).cyl('soil', 0, .6, 0, .27, .01); for (let k = 0; k < 4; k++) p.geo(P.plane, 'leaf', 0, 1.0, 0, 0, k * .8, 0, .7, .8); p.col(0, 0, .6, .6, 1); },
    workbench(p, r) {
      p.box('metal', 0, .9, .4, 2, .06, .8).box('dark', 0, .45, .4, 1.9, .9, .7).box('dark', 0, 1.6, .03, 2, 1.2, .06);
      for (let k = 0; k < 7; k++) p.box(r.pick(['metal', 'red', 'orange', 'dark']), -.8 + k * .26, 1.5 + R(r, -.2, .3), .08, .04, R(r, .2, .35), .03);
      p.box('red', -.6, 1.0, .4, .45, .16, .22).box('metal', .5, .96, .5, .3, .06, .2);
      p.col(0, .4, 2, .8, 1); p.spot(.1, .93, .55);
    },
    weaponRack(p, r) {
      p.box('dark', 0, 1.2, .05, 1.8, 1.8, .1);
      for (let k = 0; k < 5; k++) if (r.chance(.5)) { p.box('dark', -.7 + k * .35, 1.3, .14, .06, 1.0, .08).box('dark', -.7 + k * .35, 1.55, .17, .08, .2, .12); }
      p.box('metal', 0, .55, .14, 1.8, .04, .18);
    },
    railing(p, len, h) { for (let x = -len / 2; x <= len / 2 + .01; x += 1.25) p.box('metal', x, h / 2, 0, .05, h, .05); p.box('metal', 0, h, 0, len, .05, .05).box('metal', 0, h * .55, 0, len, .03, .03); },
  };
  K.props = props;
  // locker frame (static part) — 0.62w x 2.0h x 0.5d
  props.lockerBody = function (p) {
    p.box('plastic', -.3, 1, .25, .02, 2, .5).box('plastic', .3, 1, .25, .02, 2, .5).box('plastic', 0, 1.99, .25, .62, .02, .5).box('plastic', 0, .01, .25, .62, .02, .5).box('dark', 0, 1, .01, .6, 2, .02);
    p.box('trim', 0, 1.6, .2, .58, .02, .4);
    p.col(0, .25, .62, .5, 2);
  };
  // locker door geometry (pivot at hinge, local x 0..0.6) with real see-through slats
  K.lockerDoorGeo = function () {
    const B = new K.Builder(), m = (x, y, z, w, h, d) => K.mat4(x, y, z, 0, 0, 0, w, h, d);
    B.addGeom(P.box, 'plastic', m(.3, .2, 0, .6, .4, .025)); B.addGeom(P.box, 'plastic', m(.3, 1.82, 0, .6, .36, .025));
    B.addGeom(P.box, 'plastic', m(.03, 1, 0, .06, 1.24, .025)); B.addGeom(P.box, 'plastic', m(.57, 1, 0, .06, 1.24, .025));
    for (let k = 0; k < 9; k++) B.addGeom(P.box, 'plastic', m(.3, .46 + k * .13, 0, .5, .055, .02));
    B.addGeom(P.box, 'metal', m(.52, 1.05, .025, .03, .15, .03));
    return B;
  };

  // ------------------------------------------------------------ furnishing
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function wallSlots(L, room) {
    const slots = [], doorCell = new Set();
    for (let j = room.y; j < room.y + room.h; j++) for (let i = room.x; i < room.x + room.w; i++) for (const [dx, dy] of DIRS) if (L.edge(i, j, dx, dy) >= 3) doorCell.add(L.idx(i, j));
    for (let j = room.y; j < room.y + room.h; j++) for (let i = room.x; i < room.x + room.w; i++) {
      const c = L.idx(i, j); if (doorCell.has(c)) continue;
      for (const [dx, dy] of DIRS) {
        const ni = i + dx, nj = j + dy;
        if (ni >= room.x && nj >= room.y && ni < room.x + room.w && nj < room.y + room.h) continue;
        const e = L.edge(i, j, dx, dy);
        const x = (i + .5) * S + dx * (S / 2 - WT), z = (j + .5) * S + dy * (S / 2 - WT);
        slots.push({ c, i, j, dx, dy, x, z, rot: Math.atan2(-dx, -dy), win: e === 2 });
      }
    }
    return { slots, doorCell };
  }
  K.wallSlots = wallSlots;

  K.furnish = function (room, ctx) {
    const { L, r } = ctx;
    const { slots, doorCell } = wallSlots(L, room);
    r.shuffle(slots);
    const used = new Set();
    const take = (needWall = true) => { for (const s of slots) { if (used.has(s.c) || (needWall && s.win)) continue; used.add(s.c); return s; } return null; };
    const put = s => new Put(ctx, s.x, s.z, s.rot);
    const interior = [];
    for (let j = room.y + 1; j < room.y + room.h - 1; j++) for (let i = room.x + 1; i < room.x + room.w - 1; i++) interior.push(L.idx(i, j));
    r.shuffle(interior);
    const usedI = new Set();
    const takeI = () => { for (const c of interior) { if (usedI.has(c) || used.has(c)) continue; usedI.add(c); return c; } return null; };
    const cc = c => L.cellCenter(c);
    const area = L.areas[room.id], h = area.height;
    const n = room.cells;
    const fill = (fn, count) => { for (let k = 0; k < count; k++) { const s = take(); if (!s) return; fn(put(s), s); } };
    const centerRot = () => r.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);

    switch (room.type) {
      case 'medbay':
        fill(p => props.medbed(p, r), Math.min(4, Math.ceil(n / 6)));
        fill(p => props.cabinet(p, r), 2); fill(p => props.wallScreen(p, r), 1);
        fill(p => props.desk(p, r, ctx), 1);
        break;
      case 'reactor': case 'engineering': {
        const c = Math.floor(room.cx), d = Math.floor(room.cy); const [x, z] = [room.cx * S, room.cy * S];
        K.reactorCore(ctx, x, z, h, room.type === 'engineering');
        for (let j = room.y; j < room.y + room.h; j++) for (let i = room.x; i < room.x + room.w; i++) if (Math.hypot(i + .5 - room.cx, j + .5 - room.cy) < 1.6) used.add(L.idx(i, j));
        fill(p => props.console(p, r), 2); fill(p => props.pipes(p, r, h), 4); fill(p => props.workbench(p, r), 1);
        break;
      }
      case 'security': case 'armory':
        fill(p => props.weaponRack(p, r), 1); fill(p => props.desk(p, r, ctx), 2); fill(p => props.console(p, r), 1); fill(p => props.cabinet(p, r), 1);
        ctx.lockerRow(take(), 3);
        break;
      case 'admin': case 'office': case 'comms':
        fill(p => props.desk(p, r, ctx), Math.min(5, Math.ceil(n / 5))); fill(p => props.cabinet(p, r), 2); fill(p => props.wallScreen(p, r), 1);
        if (room.type === 'comms') fill(p => props.console(p, r), 2);
        break;
      case 'quarters': case 'barracks':
        fill(p => props.bunk(p, r), Math.min(4, Math.ceil(n / 6))); ctx.lockerRow(take(), 2); fill(p => props.desk(p, r, ctx), 1);
        break;
      case 'captain':
        fill(p => props.bunk(p, r), 1); fill(p => props.desk(p, r, ctx), 1); fill(p => props.cabinet(p, r), 2); fill(p => props.plantPot(p, r), 1); fill(p => props.wallScreen(p, r), 1);
        break;
      case 'mess': case 'galley':
        fill(p => props.vending(p, r), 2); fill(p => props.shelf(p, r), 1);
        for (let k = 0; k < Math.floor(n / 7); k++) { const c = takeI(); if (c == null) break; const [x, z] = cc(c); props.messTable(new Put(ctx, x, z, r.chance(.5) ? 0 : Math.PI / 2), r); }
        break;
      case 'lab':
        fill(p => props.workbench(p, r), 2); fill(p => props.desk(p, r, ctx), 1); fill(p => props.cabinet(p, r), 1);
        for (let k = 0; k < Math.max(1, Math.floor(n / 10)); k++) { const c = takeI(); if (c == null) { const s = take(); if (s) props.tank(new Put(ctx, s.x + s.dx * -.7, s.z + s.dy * -.7, s.rot), r); break; } const [x, z] = cc(c); props.tank(new Put(ctx, x, z, 0), r); }
        break;
      case 'storage': case 'cargo': case 'maint':
        fill(p => props.shelf(p, r), Math.ceil(n / 4));
        for (let k = 0; k < Math.floor(n / 5); k++) {
          const c = takeI(); if (c == null) break; const [x, z] = cc(c);
          if (room.type === 'cargo' && r.chance(.6)) props.container(new Put(ctx, x, z, centerRot()), r);
          else { const p = new Put(ctx, x + R(r, -.3, .3), z + R(r, -.3, .3), R(r, -.3, .3)); const s1 = props.crate(p, r); if (r.chance(.5)) props.crate(new Put(ctx, x, z, p.rot + R(r, -.4, .4), s1), r, R(r, .5, s1)); }
        }
        fill(p => props.barrel(p, r), 2);
        break;
      case 'hydro':
        for (const c of interior) { if (usedI.has(c)) continue; const i = c % L.W, j = (c / L.W) | 0; if ((j - room.y) % 2 === 1) { usedI.add(c); const [x, z] = cc(c); props.planter(new Put(ctx, x, z, 0), r); } }
        fill(p => props.shelf(p, r), 2); fill(p => props.pipes(p, r, h), 2);
        break;
      case 'server':
        fill(p => props.serverRack(p, r), 12);
        for (let k = 0; k < Math.floor(n / 4); k++) { const c = takeI(); if (c == null) break; const [x, z] = cc(c); props.serverRack(new Put(ctx, x - .45, z, Math.PI / 2), r); props.serverRack(new Put(ctx, x + .45, z, -Math.PI / 2), r); }
        break;
      case 'observation':
        for (const s of slots) if (s.win && !used.has(s.c) && r.chance(.6)) { used.add(s.c); props.bench(new Put(ctx, s.x - s.dx * 1.2, s.z - s.dy * 1.2, s.rot + Math.PI), r); }
        fill(p => props.plantPot(p, r), 2); fill(p => props.vending(p, r), 1);
        break;
      case 'cryo':
        fill(p => props.cryoPod(p, r), Math.min(8, Math.ceil(n / 3))); fill(p => props.console(p, r), 1);
        break;
      case 'save':
        ctx.saveStation(take()); fill(p => props.bench(p, r), 1); fill(p => props.cabinet(p, r), 1); fill(p => props.workbench(p, r), 1);
        break;
      case 'atrium': K.atrium(ctx, room, h); fill(p => props.vending(p, r), 3); fill(p => props.bench(p, r), 4); fill(p => props.plantPot(p, r), 4); break;
      case 'docking': case 'hangar': case 'dock':
        fill(p => props.container(p, r), Math.floor(n / 12)); fill(p => props.console(p, r), 1); fill(p => props.shelf(p, r), 2);
        for (let k = 0; k < Math.floor(n / 9); k++) { const c = takeI(); if (c == null) break; const [x, z] = cc(c); props.crate(new Put(ctx, x, z, R(r, 0, 3)), r); }
        break;
      case 'bridge':
        fill(p => props.console(p, r), 6);
        for (let k = 0; k < 3; k++) { const c = takeI(); if (c == null) break; const [x, z] = cc(c); props.console(new Put(ctx, x, z, centerRot()), r); }
        break;
      case 'airlock':
        fill(p => props.lockerBody(p), 0); ctx.lockerRow(take(), 2); fill(p => props.extinguisher(p), 1);
        break;
      default:
        fill(p => props.shelf(p, r), 2); fill(p => props.cabinet(p, r), 1);
    }
    // universal clutter: a hiding locker in most rooms, wall pipes, bodies, papers, debris
    if (!['save', 'atrium'].includes(room.type) && r.chance(.55)) ctx.lockerRow(take(), r.int(1, 2));
    if (r.chance(.4)) fill(p => props.pipes(p, r, h), 1);
    if (r.chance(.35)) fill(p => props.intercom(p), 1);
    if (room.type !== 'save' && r.chance(.32)) { const s = take(false); if (s) props.corpse(put(s), r, ctx); }
    if (r.chance(.6)) { const c = takeI() ?? (take(false) || {}).c; if (c != null) { const [x, z] = cc(c); props.papers(new Put(ctx, x, z, R(r, 0, 3)), r); } }
    // loose physics props
    const nPhys = Math.min(5, Math.floor(n / 6) + r.int(0, 2));
    for (let k = 0; k < nPhys; k++) {
      const c = takeI() ?? (take(false) || {}).c; if (c == null) break; const [x, z] = cc(c);
      ctx.addPhys(r.pick(['crate', 'crate', 'canister', 'bottle', 'toolbox', 'can', 'chair', 'helmet']), x + R(r, -.6, .6), z + R(r, -.6, .6), R(r, 0, 6));
    }
    if (room.type !== 'save' && r.chance(.25)) { const c = takeI(); if (c != null) { const [x, z] = cc(c); ctx.addPhys('redcan', x, z, 0); } }
    // floor spots so item placement always has somewhere
    for (let k = 0; k < 3; k++) { const c = takeI() ?? (take(false) || {}).c; if (c == null) break; const [x, z] = cc(c); ctx.spots.push([x + R(r, -.5, .5), .02, z + R(r, -.5, .5)]); }
    return { slots, used, interior };
  };

  // big set pieces
  K.reactorCore = function (ctx, x, z, h, ship) {
    const p = new Put(ctx, x, z, 0), r = ctx.r;
    if (!ship) {
      p.cyl('dark', 0, .3, 0, 1.6, .6).cyl('metal', 0, h / 2, 0, 1.0, h - .4);
      for (let y = 1; y < h - .5; y += .9) p.cyl('trim', 0, y, 0, 1.12, .12);
      const fid = p.light(0, 2.2, 0, [1, .5, .15], 2.6, 9, { kind: 'main', reactor: true });
      for (let k = 0; k < 8; k++) { const a = k / 8 * K.TAU; p.box('lamp', Math.cos(a) * 1.03, 2.2, Math.sin(a) * 1.03, .12, 1.2, .2, 0, -a, 0, fid); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * K.TAU + .4; p.cyl('copper', Math.cos(a) * 1.4, h - .7, Math.sin(a) * 1.4, .14, 1.4, 0, 0, .6 * Math.cos(a)); }
      p.cyl('dark', 0, h - .2, 0, 1.4, .4);
    } else {
      // horizontal fusion drive with magnetic rings
      for (let k = -2; k <= 2; k++) p.cyl('trim', k * .9, 1.6, 0, 1.2, .2, 0, 0, Math.PI / 2);
      p.cyl('metal', 0, 1.6, 0, .85, 4.6, 0, 0, Math.PI / 2).box('dark', 0, .4, 0, 4.6, .8, 1.6);
      const fid = p.light(0, 1.6, 0, [.4, .7, 1], 2.6, 9, { kind: 'main', reactor: true });
      for (let k = 0; k < 6; k++) p.box('lamp', -2 + k * .8, 1.6, .86, .3, .5, .02, 0, 0, 0, fid);
    }
    p.col(0, 0, ship ? 4.8 : 2.4, ship ? 2.6 : 2.4, h);
  };
  K.atrium = function (ctx, room, h) {
    const x = room.cx * S, z = room.cy * S, p = new Put(ctx, x, z, 0), r = ctx.r;
    // central column with info screens and a light crown
    p.cyl('plastic', 0, h / 2, 0, 1.1, h).cyl('trim', 0, .15, 0, 1.3, .3);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; p.geo(P.plane, 'scr' + k, Math.sin(a) * 1.12, 1.9, Math.cos(a) * 1.12, 0, a, 0, 1.1, .8); }
    const fid = p.light(0, h - .6, 0, [1, .9, .75], 2.4, 14, { kind: 'main' });
    p.cyl('lamp', 0, h - .6, 0, 1.6, .15, 0, 0, 0, false);
    // balcony ring at 4.6m with railing
    const bw = room.w * S, bd = room.h * S;
    for (const [sx, sz, w, d] of [[0, -bd / 2 + 1, bw - .4, 1.6], [0, bd / 2 - 1, bw - .4, 1.6], [-bw / 2 + 1, 0, 1.6, bd - 3.6], [bw / 2 - 1, 0, 1.6, bd - 3.6]]) {
      p.box('grate', sx, 4.6, sz, w, .12, d).box('trim', sx, 4.5, sz, w, .1, d);
    }
    for (const sz of [-1, 1]) props.railing(new Put(ctx, x, z + sz * (bd / 2 - 1.8), 0, 4.66), bw - 4, 1);
    for (const sx of [-1, 1]) props.railing(new Put(ctx, x + sx * (bw / 2 - 1.8), z, Math.PI / 2, 4.66), bd - 4, 1);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.cyl('trim', sx * (bw / 2 - 1.8), 2.3, sz * (bd / 2 - 1.8), .12, 4.6);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; props.planter(new Put(ctx, x + Math.cos(a) * 3.6, z + Math.sin(a) * 3.6, -a), r); }
    p.col(0, 0, 2.3, 2.3, h);
  };
})();
