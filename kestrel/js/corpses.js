// Kestrel — articulated corpses. A jointed human skeleton (pelvis, spine, chest, neck, skull, two-segment
// arms and legs, hands with fingers, boots) is posed into a death pose, snapped to the floor, and baked
// into the chunk geometry. Textured coveralls and skin, open jaws, injuries, gore and dismemberment.
(function () {
  const K = window.K, P = K.prim;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // ---------------------------------------------------------------- shared geometry (built once)
  let GEO = null;
  function geos() {
    if (GEO) return GEO;
    const down = (len, r0, r1, sides = 10, sx = 1, sz = 1) => { const g = K.segGeo(len, r0, r1, sides, sx, sz); g.rotateX(Math.PI); return g; }; // hangs along -Y
    GEO = {
      thigh: down(.44, .088, .064, 12, 1.05, .95), shin: down(.43, .064, .048, 12), uarm: down(.29, .056, .045, 10), farm: down(.27, .045, .034, 10),
      torso: K.lathe([[.13, 0], [.16, .06], [.185, .16], [.2, .26], [.205, .31], [.17, .36], [.08, .4]], 12),
      skull: K.lathe([[0, 0], [.07, .01], [.1, .06], [.112, .13], [.105, .2], [.08, .25], [.03, .275], [0, .28]], 12),
      finger: down(.075, .0095, .006, 6), thumb: down(.055, .011, .007, 6),
      sph: new THREE.SphereGeometry(.5, 9, 6), sphL: new THREE.SphereGeometry(.5, 6, 4), box: P.box, cyl: P.cyl, cone: new THREE.ConeGeometry(.5, 1, 6),
      rib: new THREE.TorusGeometry(.13, .012, 4, 10, Math.PI * .9),
    };
    return GEO;
  }

  // ---------------------------------------------------------------- materials (bake-lit, textured)
  K.initCorpseMats = function (M) {
    if (M.cSkin) return;
    const T = K.ctex ? K.ctex() : null;
    const env = M.wall.envMap;
    const suitCols = [0x8a5a30, 0x3a4a5c, 0x5a5c55, 0x7a3e2c, 0x45534a, 0x6e6858];
    suitCols.forEach((c, i) => M['cSuit' + i] = K.bakeMat({ color: c, map: T && T.suit.map, bumpMap: T && T.suit.bump, bumpScale: .02, roughness: .9 }));
    M.cSkin = K.bakeMat({ color: 0x77726a, map: T && T.skin.map, bumpMap: T && T.skin.bump, bumpScale: .025, roughness: .5, envMap: env, envMapIntensity: .25 });
    M.cSkinDead = K.bakeMat({ color: 0x5f675d, map: T && T.skin.map, bumpMap: T && T.skin.bump, bumpScale: .03, roughness: .45, envMap: env, envMapIntensity: .3 });
    M.cGore = K.bakeMat({ color: 0x5a0f0b, map: T && T.flesh.map, bumpMap: T && T.flesh.bump, bumpScale: .04, roughness: .16, metalness: .1, envMap: env, envMapIntensity: .9 });
    M.cBone = K.bakeMat({ color: 0x9c8e74, roughness: .45 });
    M.cRib = K.bakeMat({ color: 0x7a5a48, roughness: .3, envMap: env, envMapIntensity: .5 });
    M.cBoot = K.bakeMat({ color: 0x1c1b1a, roughness: .7, envMap: env, envMapIntensity: .2 });
    M.cSole = K.bakeMat({ color: 0x0c0c0c, roughness: .95 });
    M.cHair = K.bakeMat({ color: 0x1d1610, roughness: .9 });
    M.cVoid = K.bakeMat({ color: 0x060404, roughness: 1 });
    M.cTeeth = K.bakeMat({ color: 0xbdb38f, roughness: .35 });
    M.cMetal = K.bakeMat({ color: 0x8a8a80, roughness: .3, metalness: .9, envMap: env });
    M.cResin = M.resinWet || K.bakeMat({ color: 0x0d0f12, roughness: .12, metalness: .55, envMap: env, envMapIntensity: 1.2 });
  };

  // ---------------------------------------------------------------- skeleton
  // Bind pose: standing, facing +Z, pelvis at origin. Each node is an Object3D; parts are {geo,key,matrix}.
  function skeleton(r, o) {
    const G = geos();
    const suit = 'cSuit' + r.int(0, 5), skin = o.decayed ? 'cSkinDead' : 'cSkin';
    const parts = [];
    const node = (parent, x, y, z) => { const n = new THREE.Object3D(); n.position.set(x, y, z); parent.add(n); return n; };
    const part = (parent, geo, key, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Object3D(); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); parent.add(m);
      parts.push({ o: m, geo, key }); return m;
    };
    const root = new THREE.Object3D();
    const S = {};
    S.pelvis = node(root, 0, 0, 0);
    part(S.pelvis, G.sph, suit, 0, 0, 0, .34, .22, .23);
    part(S.pelvis, G.cyl, 'cBoot', 0, .06, 0, .36, .05, .25); part(S.pelvis, G.box, 'cMetal', 0, .06, .125, .06, .04, .012);
    for (const sx of [-1, 1]) part(S.pelvis, G.box, 'cBoot', sx * .14, .02, .09, .07, .08, .04, 0, sx * .3, 0);
    S.spine = node(S.pelvis, 0, .12, 0);
    part(S.spine, G.sph, suit, 0, .09, 0, .31, .27, .21);
    S.chest = node(S.spine, 0, .14, 0);
    part(S.chest, G.torso, suit, 0, 0, 0, 1.18, 1, .74);
    for (const sx of [-1, 1]) part(S.chest, G.sph, suit, sx * .19, .32, 0, .14, .12, .14);
    part(S.chest, G.box, suit, 0, .2, .148, .2, .3, .012); // zip placket
    part(S.chest, G.box, 'cBone', .09, .3, .15, .07, .022, .004); // name tape
    if (o.chestOpen) { // burst ribcage: cavity, splayed ribs, sternum torn away
      part(S.chest, G.sph, 'cGore', 0, .2, .12, .19, .22, .08); part(S.chest, G.sph, 'cGore', .05, .3, .14, .1, .06, .05);
      part(S.chest, G.sph, 'cVoid', 0, .2, .135, .11, .13, .04);
      for (let k = 0; k < 5; k++) for (const sx of [-1, 1]) part(S.chest, G.rib, 'cRib', sx * .05, .1 + k * .045, .13, 1, .8, 1.2, Math.PI / 2 + .3, 0, sx > 0 ? -.25 : Math.PI + .25);
      for (let k = 0; k < 4; k++) part(S.chest, G.cyl, 'cGore', r.range(-.08, .08), .22 + r.range(-.05, .05), .17, .025, r.range(.1, .2), .025, r.range(-1, 1), 0, r.range(-1, 1));
    }
    if (o.resin) for (let k = 0; k < 5; k++) part(S.chest, G.sphL, 'cResin', r.range(-.2, .2), r.range(.05, .38), r.range(-.15, .12), r.range(.08, .16), r.range(.08, .16), r.range(.08, .16));
    S.neck = node(S.chest, 0, .36, .02);
    part(S.neck, G.cyl, skin, 0, .05, 0, .085, .13, .085);
    if (o.throat) part(S.neck, G.sph, 'cGore', 0, .05, .035, .08, .05, .04);
    S.head = node(S.neck, 0, .1, .02);
    if (!o.headless) {
      part(S.head, G.skull, skin, 0, 0, 0, 1, 1, 1.12);
      for (const sx of [-1, 1]) { part(S.head, G.sph, skin, sx * .062, .1, .085, .045, .03, .03); part(S.head, G.sph, 'cVoid', sx * .042, .145, .1, .034, .026, .02); part(S.head, G.box, skin, sx * .04, .175, .1, .05, .012, .02, 0, 0, sx * .2); part(S.head, G.sph, skin, sx * .108, .13, -.01, .025, .045, .035); }
      part(S.head, G.cone, skin, 0, .12, .115, .022, .05, .02, -.3, 0, 0);
      for (let k = 0; k < 7; k++) if (r.chance(.85)) part(S.head, G.box, 'cTeeth', -.03 + k * .01, .068, .103 - Math.abs(k - 3) * .004, .007, .014, .006);
      S.jaw = node(S.head, 0, .07, .02); S.jaw.rotation.x = o.jaw ?? .5;
      part(S.jaw, G.sph, skin, 0, -.035, .045, .12, .065, .12); part(S.jaw, G.sph, 'cVoid', 0, -.012, .072, .07, .03, .04);
      for (let k = 0; k < 6; k++) if (r.chance(.8)) part(S.jaw, G.box, 'cTeeth', -.025 + k * .01, -.006, .085 - Math.abs(k - 2.5) * .004, .007, .012, .006);
      if (r.chance(.75)) { part(S.head, G.sph, 'cHair', 0, .2, -.015, .225, .12, .245); for (let k = 0; k < 8; k++) part(S.head, G.cyl, 'cHair', r.range(-.08, .08), .26, r.range(-.1, .02), .006, r.range(.04, .08), .006, r.range(-.8, .8), 0, r.range(-.8, .8)); }
      if (o.headWound) { part(S.head, G.sph, 'cGore', r.range(-.06, .06), .22, .02, .08, .05, .08); part(S.head, G.sph, 'cBone', r.range(-.04, .04), .245, .0, .04, .015, .04); }
    } else { // stump
      part(S.neck, G.sph, 'cGore', 0, .11, 0, .1, .05, .1); part(S.neck, G.cyl, 'cBone', 0, .12, -.01, .02, .05, .02);
    }
    // arms
    S.arm = [];
    for (const side of [-1, 1]) {
      const A = {};
      A.sh = node(S.chest, side * .2, .32, 0);
      A.lost = o.lostArm === side;
      if (A.lost) { part(A.sh, G.sph, 'cGore', 0, -.02, 0, .1, .08, .1); part(A.sh, G.cyl, 'cBone', 0, -.06, 0, .025, .06, .025); S.arm.push(A); continue; }
      part(A.sh, G.uarm, suit, 0, 0, 0); part(A.sh, G.cyl, suit, 0, -.27, 0, .1, .05, .1);
      A.el = node(A.sh, 0, -.29, 0);
      part(A.el, G.farm, r.chance(.5) ? skin : suit, 0, 0, 0); part(A.el, G.sphL, skin, 0, 0, -.02, .065, .065, .065);
      A.wr = node(A.el, 0, -.27, 0);
      part(A.wr, G.sph, skin, 0, -.05, 0, .07, .1, .035);
      for (let f = 0; f < 4; f++) { const b = node(A.wr, side * (-.025 + f * .017), -.095, 0); b.rotation.x = (o.curl ?? .7) * (.8 + f * .1); part(b, G.finger, skin, 0, 0, 0); }
      const t = node(A.wr, side * .035, -.04, .015); t.rotation.set(-.4, 0, side * .6); part(t, G.thumb, skin, 0, 0, 0);
      S.arm.push(A);
    }
    // legs
    S.leg = [];
    for (const side of [-1, 1]) {
      const Lg = {};
      Lg.hip = node(S.pelvis, side * .1, -.05, 0);
      Lg.lost = o.lostLeg === side;
      part(Lg.hip, G.thigh, suit, 0, 0, 0, 1, Lg.lost ? .55 : 1, 1); part(Lg.hip, G.box, suit, side * .075, -.2, .02, .04, .12, .09);
      if (Lg.lost) { part(Lg.hip, G.sph, 'cGore', 0, -.24, 0, .13, .06, .12); part(Lg.hip, G.cyl, 'cBone', 0, -.27, 0, .03, .08, .03); S.leg.push(Lg); continue; }
      Lg.kn = node(Lg.hip, 0, -.44, 0);
      part(Lg.kn, G.shin, suit, 0, 0, 0); part(Lg.kn, G.sph, suit, 0, 0, .03, .085, .075, .085); part(Lg.kn, G.cyl, 'cBoot', 0, -.36, 0, .115, .12, .115);
      Lg.an = node(Lg.kn, 0, -.43, 0);
      part(Lg.an, G.box, 'cBoot', 0, -.03, .06, .11, .1, .27); part(Lg.an, G.box, 'cSole', 0, -.075, .06, .12, .025, .29);
      S.leg.push(Lg);
    }
    return { root, S, parts };
  }

  // ---------------------------------------------------------------- death poses
  // Joint rotations on top of the bind pose. Angles in radians, x = pitch (forward +), z = sideways.
  const POSES = {
    slumped(S, r) { // sitting against the wall, head lolled, legs out, one knee up, hands in the lap / on the floor
      S.root.position.set(0, .15, .26); S.root.rotation.set(0, 0, 0);
      S.spine.rotation.set(-.32 + r.range(-.05, .05), 0, r.range(-.12, .12)); S.chest.rotation.set(-.1, r.range(-.2, .2), r.range(-.15, .15));
      S.neck.rotation.set(.75 + r.range(0, .3), r.range(-.4, .4), r.range(-.6, .6));
      const up = r.int(0, 1);
      S.leg.forEach((L, i) => { if (L.lost) return; const bend = i === up && r.chance(.6); L.hip.rotation.set(-(bend ? 2.1 : 1.5), 0, (i ? 1 : -1) * r.range(.1, .3)); L.kn.rotation.set(bend ? 2.0 : r.range(.05, .2), 0, 0); L.an.rotation.set(bend ? -.2 : .1, 0, (i ? 1 : -1) * .25); });
      S.arm.forEach((A, i) => { if (A.lost) return; const lap = r.chance(.5); A.sh.rotation.set(lap ? -.6 : -.2, 0, (i ? 1 : -1) * (lap ? .1 : .35)); A.el.rotation.set(lap ? -.9 : -.3, 0, 0); A.wr.rotation.set(-.3, 0, 0); });
      return 'sit';
    },
    prone(S, r) { // face down, one arm reaching ahead, head turned
      S.root.rotation.set(Math.PI / 2, r.range(-.3, .3), r.range(-.1, .1));
      S.spine.rotation.set(r.range(-.05, .1), 0, r.range(-.2, .2)); S.chest.rotation.set(0, 0, r.range(-.15, .15));
      S.neck.rotation.set(-.2, (r.chance(.5) ? 1 : -1) * r.range(.9, 1.3), 0);
      const reach = r.int(0, 1);
      S.arm.forEach((A, i) => { if (A.lost) return; const s = i ? 1 : -1; if (i === reach) { A.sh.rotation.set(-2.8, 0, s * .25); A.el.rotation.set(-.3, 0, 0); } else { A.sh.rotation.set(-.15, 0, s * .35); A.el.rotation.set(-.6, 0, 0); } A.wr.rotation.set(0, 0, 0); });
      S.leg.forEach((L, i) => { if (L.lost) return; const s = i ? 1 : -1; const bent = r.chance(.4); L.hip.rotation.set(bent ? -.6 : .05, 0, s * r.range(.05, .3)); L.kn.rotation.set(bent ? 1.1 : r.range(0, .3), 0, 0); L.an.rotation.set(1.2, 0, 0); });
      return 'lie';
    },
    supine(S, r) { // on the back, arms flung out, head tipped back, mouth wide
      S.root.rotation.set(-Math.PI / 2, r.range(-.3, .3), 0);
      S.spine.rotation.set(-.05, 0, r.range(-.1, .1)); S.chest.rotation.set(-.05, 0, 0);
      S.neck.rotation.set(-.5, r.range(-.6, .6), r.range(-.3, .3));
      S.arm.forEach((A, i) => { if (A.lost) return; const s = i ? 1 : -1; A.sh.rotation.set(r.range(-.4, .2), 0, s * r.range(.9, 1.6)); A.el.rotation.set(-r.range(.2, 1.2), 0, 0); });
      S.leg.forEach((L, i) => { if (L.lost) return; const s = i ? 1 : -1; L.hip.rotation.set(-r.range(0, .3), 0, s * r.range(.1, .35)); L.kn.rotation.set(r.range(.1, .6), 0, 0); L.an.rotation.set(-.6, 0, s * .4); });
      return 'lie';
    },
    fetal(S, r) { // curled on one side
      S.root.rotation.set(0, r.range(0, 6), Math.PI / 2 * (r.chance(.5) ? 1 : -1));
      S.spine.rotation.set(.45, 0, 0); S.chest.rotation.set(.35, 0, 0); S.neck.rotation.set(.7, 0, r.range(-.2, .2));
      S.arm.forEach((A, i) => { if (A.lost) return; A.sh.rotation.set(-1.2, 0, (i ? 1 : -1) * .2); A.el.rotation.set(-1.9, 0, 0); });
      S.leg.forEach((L, i) => { if (L.lost) return; L.hip.rotation.set(-1.7 + i * .25, 0, 0); L.kn.rotation.set(2.1, 0, 0); L.an.rotation.set(-.2, 0, 0); });
      return 'lie';
    },
    crawling(S, r) { // died dragging itself, legs trailing, fingers clawed into the deck
      S.root.rotation.set(Math.PI / 2 - .12, r.range(-.3, .3), 0);
      S.spine.rotation.set(-.2, 0, .1); S.chest.rotation.set(-.15, 0, -.08); S.neck.rotation.set(-.55, r.range(-.3, .3), 0);
      S.arm.forEach((A, i) => { if (A.lost) return; const s = i ? 1 : -1; A.sh.rotation.set(-2.2 - i * .4, 0, s * .45); A.el.rotation.set(-.9 + i * .4, 0, 0); });
      S.leg.forEach((L, i) => { if (L.lost) return; L.hip.rotation.set(.1, 0, (i ? 1 : -1) * .12); L.kn.rotation.set(.15 + i * .5, 0, 0); L.an.rotation.set(1.3, 0, 0); });
      return 'lie';
    },
  };

  // ---------------------------------------------------------------- emit one corpse into a builder via a Put
  K.buildCorpse = function (p, r, opts = {}) {
    const wall = !opts.floor;
    const kind = opts.pose || (wall ? (r.chance(.7) ? 'slumped' : r.pick(['prone', 'supine', 'crawling'])) : r.pick(['prone', 'supine', 'fetal', 'crawling', 'prone']));
    const injuries = {
      chestOpen: r.chance(.35), headWound: r.chance(.25), throat: r.chance(.2), resin: r.chance(.2), decayed: r.chance(.5),
      lostArm: r.chance(.14) ? r.pick([-1, 1]) : 0, lostLeg: r.chance(.1) ? r.pick([-1, 1]) : 0, headless: r.chance(.06), jaw: r.range(.25, .7), curl: r.range(.4, 1),
    };
    const sk = skeleton(r, injuries);
    const S = Object.assign({ root: sk.root }, sk.S);
    const holder = new THREE.Object3D(); holder.add(sk.root);
    const mode = POSES[kind](S, r);
    if (mode === 'lie') { S.root.position.set(0, 0, 0); holder.rotation.y = wall ? (r.chance(.5) ? 1 : -1) * Math.PI / 2 + r.range(-.25, .25) : r.range(0, K.TAU); holder.position.set(r.range(-.3, .3), 0, wall ? .62 : 0); }
    holder.updateMatrixWorld(true);
    // snap to the floor using each part's real bounds: the lowest surface touches the deck
    const box = new THREE.Box3(), minY = () => { let mn = 1e9; for (const pt of sk.parts) { if (!pt.geo.boundingBox) pt.geo.computeBoundingBox(); box.copy(pt.geo.boundingBox).applyMatrix4(pt.o.matrixWorld); mn = Math.min(mn, box.min.y); } return mn; };
    const my = minY();
    if (mode === 'lie' || my < 0) { holder.position.y -= my - .004; holder.updateMatrixWorld(true); }
    if (wall) { // keep everything in front of the wall plane
      let mz = 1e9; for (const pt of sk.parts) { box.copy(pt.geo.boundingBox).applyMatrix4(pt.o.matrixWorld); mz = Math.min(mz, box.min.z); }
      if (mz < .02) { holder.position.z += .02 - mz; holder.updateMatrixWorld(true); }
    }
    // pools and smears
    const pelvisW = S.pelvis.getWorldPosition(V()), headW = S.head.getWorldPosition(V());
    p.geo(P.plane, 'blood', (pelvisW.x + headW.x) / 2, .011, (pelvisW.z + headW.z) / 2, -Math.PI / 2, 0, r.range(0, 6), r.range(1.6, 2.6), r.range(1.6, 2.6));
    if (wall && mode === 'sit') p.geo(P.plane, 'blood', r.range(-.2, .2), 1.05, .02, 0, 0, r.range(-.3, .3), 1.2, 1.6); // smear down the wall
    if (injuries.lostArm || injuries.lostLeg) { // the missing piece lies nearby
      const a = r.range(0, 6), d = r.range(.8, 1.4), q = new K.Put(p.ctx, ...p.w(Math.cos(a) * d + pelvisW.x, Math.sin(a) * d + pelvisW.z), p.rot + r.range(0, 6));
      const g = geos(); const sx = injuries.lostArm ? 1 : 1.2;
      q.geo(injuries.lostArm ? g.uarm : g.shin, 'cSuit0', 0, .06, 0, Math.PI / 2, 0, 0, sx, 1, sx).sph('cGore', 0, .06, 0, .1, .1, .1).geo(P.plane, 'blood', 0, .012, -.15, -Math.PI / 2, 0, 0, .8, .8);
    }
    // emit
    const m = new THREE.Matrix4();
    for (const pt of sk.parts) { m.multiplyMatrices(p.base, pt.o.matrixWorld); p.B.addGeom(pt.geo, pt.key, m); }
    // a corpse half-blocks movement
    p.col(pelvisW.x, pelvisW.z, .5, .5, .3);
  };
})();
