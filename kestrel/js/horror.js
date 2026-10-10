// Kestrel — horror dressing: blood trails, scrawled warnings, handprints, resin growth spreading from
// vents, nests with cocooned crew and egg pods, barricades, torn vents, sparking panels, steam leaks, cables.
(function () {
  const K = window.K, S = K.S, WT = K.WT, P = K.prim;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const SCRAWL = [
    ['IT HEARS YOU'], ["DON'T RUN"], ['STAY IN THE', 'LOCKERS'], ['IT USES', 'THE VENTS'], ['FIRE SCARES IT'], ['NO RESCUE', 'IS COMING'],
    ['THEY WENT', 'INTO THE WALLS'], ['FORGIVE ME'], ['HOLD YOUR', 'BREATH'], ['13 DAYS'], ['IT WAS INSIDE', 'DR. VALE'], ['KILL THE', 'LIGHTS'],
    ['DONT LET IT', 'SEE YOU'], ['GOD IS NOT', 'UP HERE'], ['QUARANTINE', 'WAS A LIE'], ['WE SEALED', 'THE DOORS', 'IT DIDNT', 'MATTER'],
  ];
  function scrawlTex(lines, seed) {
    const c = K.canvas(512, 256), x = c.getContext('2d'), r = K.rng(seed);
    x.font = 'bold 66px "Permanent Marker", "Chakra Petch", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const lh = 256 / (lines.length + .6);
    lines.forEach((l, i) => {
      const y = lh * (i + .8);
      x.save(); x.translate(256, y); x.rotate((r() - .5) * .12);
      x.fillStyle = 'rgba(84,6,4,.92)'; x.fillText(l, 0, 0);
      // drips
      for (let k = 0; k < 7; k++) { const dx = (r() - .5) * 400, len = 10 + r() * 60; const g = x.createLinearGradient(0, 20, 0, 20 + len); g.addColorStop(0, 'rgba(84,6,4,.9)'); g.addColorStop(1, 'rgba(84,6,4,0)'); x.fillStyle = g; x.fillRect(dx, 16, 3 + r() * 3, len); }
      x.restore();
    });
    const t = K.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  function handTex() {
    const c = K.canvas(256), x = c.getContext('2d'), r = K.rng(5);
    for (let k = 0; k < 3; k++) {
      x.save(); x.translate(60 + k * 70, 150 + (r() - .5) * 60); x.rotate((r() - .5) * .8); x.fillStyle = `rgba(${70 + k * 10},5,4,.85)`;
      x.beginPath(); x.ellipse(0, 0, 22, 26, 0, 0, K.TAU); x.fill();
      for (let f = 0; f < 4; f++) { x.beginPath(); x.ellipse(-15 + f * 10, -38 - (f === 1 || f === 2 ? 6 : 0), 5, 15, 0, 0, K.TAU); x.fill(); }
      x.beginPath(); x.ellipse(26, -6, 6, 13, -.8, 0, K.TAU); x.fill();
      // smear downward
      const g = x.createLinearGradient(0, 0, 0, 90); g.addColorStop(0, 'rgba(70,5,4,.7)'); g.addColorStop(1, 'rgba(70,5,4,0)'); x.fillStyle = g; x.fillRect(-18, 10, 36, 90);
      x.restore();
    }
    const t = K.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  function dragTex() {
    const c = K.canvas(128, 512), x = c.getContext('2d'), r = K.rng(9);
    for (let k = 0; k < 9; k++) { const cx = 30 + r() * 68; const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, 'rgba(70,5,3,0)'); g.addColorStop(.15, 'rgba(70,5,3,.8)'); g.addColorStop(.85, 'rgba(60,4,3,.7)'); g.addColorStop(1, 'rgba(60,4,3,0)'); x.fillStyle = g; x.fillRect(cx, 0, 4 + r() * 10, 512); }
    for (let k = 0; k < 30; k++) { x.fillStyle = 'rgba(70,5,3,.8)'; x.beginPath(); x.arc(r() * 128, r() * 512, 2 + r() * 7, 0, K.TAU); x.fill(); }
    const t = K.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  function scorchTex() {
    const c = K.canvas(256), x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, 'rgba(5,4,3,.95)'); g.addColorStop(.5, 'rgba(15,10,6,.6)'); g.addColorStop(1, 'rgba(20,14,8,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const t = K.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  function claws() {
    const c = K.canvas(256), x = c.getContext('2d');
    for (let s = 0; s < 2; s++) for (let k = 0; k < 4; k++) { x.strokeStyle = 'rgba(10,8,6,.85)'; x.lineWidth = 6 - k; x.beginPath(); x.moveTo(40 + k * 22 + s * 90, 30 + s * 30); x.quadraticCurveTo(80 + k * 22 + s * 90, 120, 60 + k * 26 + s * 90, 230 - s * 20); x.stroke(); x.strokeStyle = 'rgba(200,190,170,.3)'; x.lineWidth = 1; x.stroke(); }
    const t = K.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }

  // organic geometry
  let geos = null;
  function makeGeos() {
    const r = K.rng(321);
    const blob = (seed, det) => {
      const g = new THREE.IcosahedronGeometry(.5, det), p = g.attributes.position, rr = K.rng(seed);
      const f = [rr.range(2, 4), rr.range(2, 5), rr.range(1.5, 4)], ph = [rr() * 6, rr() * 6, rr() * 6];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const n = 1 + .22 * Math.sin(x * f[0] * 3 + ph[0]) * Math.sin(y * f[1] * 3 + ph[1]) + .14 * Math.sin(z * f[2] * 4 + ph[2]) + .08 * Math.sin((x + y + z) * 11);
        p.setXYZ(i, x * n, y * n, z * n);
      }
      g.computeVertexNormals(); return g;
    };
    const tube = (seed) => {
      const rr = K.rng(seed), pts = [];
      for (let k = 0; k < 6; k++) pts.push(new THREE.Vector3(rr.range(-.15, .15), k * .5, rr.range(-.15, .15) + Math.sin(k) * .1));
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .07, 7, false), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), s = 1 + .35 * Math.max(0, Math.sin(y * 28)); const cx = 0; p.setX(i, p.getX(i) * (1 + .0) ); }
      g.computeVertexNormals(); return g;
    };
    // ribbed tube: rings along a bent path
    const ribbed = (seed) => {
      const rr = K.rng(seed), prof = [];
      for (let k = 0; k <= 12; k++) prof.push([.06 + .03 * (k % 2) + .02 * Math.sin(k), k * .25]);
      const g = K.lathe(prof, 5), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 1.7 + seed) * .25 * y / 3); p.setZ(i, p.getZ(i) + Math.cos(y * 1.3 + seed) * .12 * y / 3); }
      g.computeVertexNormals(); return g;
    };
    const egg = K.lathe([[0, 0], [.22, .05], [.36, .25], [.4, .5], [.34, .78], [.2, .92], [.08, .96], [0, .94]], 16);
    { const p = egg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i)); const s = 1 + .05 * Math.sin(a * 6 + y * 10); p.setX(i, p.getX(i) * s); p.setZ(i, p.getZ(i) * s); } egg.computeVertexNormals(); }
    const strand = new THREE.CylinderGeometry(.012, .03, 1, 5); strand.translate(0, -.5, 0);
    geos = { blobs: [blob(1, 1), blob(2, 1), blob(3, 1), blob(4, 1)], tubes: [ribbed(1), ribbed(2.5), ribbed(4)], egg, strand, tube: tube(3) };
  }

  K.horrorDress = function (W, ctx) {
    const L = W.L, M = W.M, r = K.rng(L.seed ^ 0xdead), st = L.theme === 'station';
    if (!geos) makeGeos();
    if (!M['scrawl0']) {
      SCRAWL.forEach((l, i) => M['scrawl' + i] = K.bakeMat({ map: scrawlTex(l, i + 3), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, roughness: .3 }));
      M.hand = K.bakeMat({ map: handTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, roughness: .3 });
      M.drag = K.bakeMat({ map: dragTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: .25 });
      M.scorch = K.bakeMat({ map: scorchTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 1 });
      M.claws = K.bakeMat({ map: claws(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, roughness: .6 });
      M.resinWet = K.bakeMat({ color: 0x0d0f12, roughness: .12, metalness: .55, envMap: M.wall.envMap, envMapIntensity: 1.2 });
      M.meat = K.bakeMat({ color: 0x5a1712, roughness: .3, metalness: .1, envMap: M.wall.envMap, envMapIntensity: .5 });
      M.bone = K.bakeMat({ color: 0xcfc4a8, roughness: .5 });
      M.cable = K.bakeMat({ color: 0x111111, roughness: .7 });
    }
    W.sparkers = []; W.steamers = []; W.drips = []; W.nests = [];
    const put = (x, z, rot, y = 0) => new K.Put(ctx, x, z, rot, y);
    // collect all wall faces (full walls) keyed by cell
    const walls = [];
    for (let c = 0; c < L.W * L.H; c++) {
      if (!L.kind[c]) continue; const i = c % L.W, j = (c / L.W) | 0;
      for (const [dx, dz] of DIRS) if (L.edge(i, j, dx, dz) === 1) walls.push({ c, i, j, dx, dz, x: (i + .5) * S + dx * (S / 2 - WT), z: (j + .5) * S + dz * (S / 2 - WT), rot: Math.atan2(-dx, -dz), corr: L.kind[c] === 2 });
    }
    const corrCells = []; for (let c = 0; c < L.W * L.H; c++) if (L.kind[c] === 2) corrCells.push(c);
    const hOf = c => L.areas[L.area[c]].height;
    const startArea = L.startRoom.id;
    const nearStart = c => { const [x, z] = L.cellCenter(c); return Math.hypot(x / S - L.startRoom.cx, z / S - L.startRoom.cy) < 6; };

    // --- scrawled warnings & handprints
    r.shuffle(walls);
    let ns = 0, nh = 0, nc = 0;
    for (const w of walls) {
      if (L.area[w.c] === startArea) continue;
      if (ns < (st ? 60 : 45) && r.chance(.03)) { const p = put(w.x, w.z, w.rot); p.geo(P.plane, 'scrawl' + r.int(0, SCRAWL.length - 1), r.range(-.2, .2), r.range(1.3, 1.8), .012, 0, 0, r.range(-.08, .08), r.range(1.6, 2.2), 1); ns++; continue; }
      if (nh < 90 && r.chance(.035)) { const p = put(w.x, w.z, w.rot); p.geo(P.plane, 'hand', r.range(-.6, .6), r.range(.7, 1.5), .012, 0, 0, r.range(-.4, .4), .8, .8); nh++; continue; }
      if (nc < 70 && r.chance(.03)) { const p = put(w.x, w.z, w.rot); p.geo(P.plane, 'claws', r.range(-.5, .5), r.range(.8, 2), .012, 0, 0, r.range(-.6, .6), r.range(.9, 1.4), r.range(.9, 1.4)); nc++; continue; }
      if (r.chance(.012)) { const p = put(w.x, w.z, w.rot); p.geo(P.plane, 'scorch', r.range(-.5, .5), r.range(.5, 1.8), .011, 0, 0, r.range(0, 6), r.range(1.2, 2.4), r.range(1.2, 2.4)); }
    }
    // --- blood drag trails through corridors (something was pulled into the dark)
    for (let t = 0; t < (st ? 40 : 30); t++) {
      let c = r.pick(corrCells); if (nearStart(c)) continue;
      let dir = r.int(0, 3), len = r.int(3, 10);
      for (let k = 0; k < len; k++) {
        const [x, z] = L.cellCenter(c), [dx, dz] = DIRS[dir];
        if (!L.passable(c, dx, dz, true) || L.edge(c % L.W, (c / L.W) | 0, dx, dz) >= 3) { dir = r.int(0, 3); continue; }
        const p = put(x + dx * S / 2, z + dz * S / 2, Math.atan2(dx, dz));
        p.geo(P.plane, 'drag', r.range(-.3, .3), .008 + k * .0005, 0, -Math.PI / 2, 0, r.range(-.15, .15), r.range(.5, .8), S * 1.05);
        c = c + dx + dz * L.W;
        if (r.chance(.25)) dir = r.int(0, 3);
      }
      if (r.chance(.5)) { const [x, z] = L.cellCenter(c); const p = put(x, z, r.range(0, 6)); K.props.corpse(p, r, ctx, { floor: true }); }
    }
    // --- extra corpses in corridors
    for (let t = 0; t < (st ? 26 : 20); t++) {
      const w = r.pick(walls); if (!w.corr || nearStart(w.c)) continue;
      K.props.corpse(put(w.x, w.z, w.rot), r, ctx);
    }
    // --- torn vents: cover on the floor below, resin spill and claw marks
    for (const v of L.vents) {
      if (!r.chance(.45)) continue;
      const h = v.y, p = put(v.x, v.z, r.range(0, 6));
      p.box('dark', r.range(-.6, .6), .04, r.range(-.6, .6), 1.0, .05, 1.0, r.range(-.15, .15), r.range(0, 3), r.range(-.15, .15));
      p.geo(P.plane, 'blood', 0, .009, 0, -Math.PI / 2, 0, r.range(0, 6), 1.4, 1.4);
      // resin creeping across the ceiling around the opening
      for (let k = 0; k < r.int(3, 7); k++) { const a = r() * K.TAU, d = r.range(.5, 1.6), s = r.range(.3, .8); p.geo(r.pick(geos.blobs), 'resinWet', Math.cos(a) * d, h - .05, Math.sin(a) * d, 0, r() * 6, 0, s, s * .35, s); }
      for (let k = 0; k < r.int(2, 5); k++) p.geo(geos.strand, 'resinWet', r.range(-.7, .7), h, r.range(-.7, .7), 0, 0, 0, 1, r.range(.3, 1.4), 1);
      W.drips.push([v.x, v.z]);
    }
    // --- resin growth spreading down walls near some vents
    for (const v of L.vents) {
      if (!r.chance(.3)) continue;
      const near = walls.filter(w => Math.abs(w.x - v.x) < 4 && Math.abs(w.z - v.z) < 4);
      for (const w of near.slice(0, 4)) growWall(w, hOf(w.c), r.range(.4, .9));
    }
    function growWall(w, h, amount) {
      const p = put(w.x, w.z, w.rot);
      const n = Math.floor(amount * 8);
      for (let k = 0; k < n; k++) {
        const y = h - Math.pow(r(), .7) * h * amount * 1.1, s = r.range(.25, .7);
        p.geo(r.pick(geos.blobs), 'resinWet', r.range(-1.1, 1.1), y, .05, r() * 6, r() * 6, 0, s * 1.2, s, s * .45);
      }
      for (let k = 0; k < Math.floor(amount * 3); k++) p.geo(r.pick(geos.tubes), 'resinWet', r.range(-1, 1), h - r.range(0, h * .6), .08, Math.PI, r() * 6, r.range(-.4, .4), 1, r.range(.4, 1), 1);
    }
    // --- barricades in corridors (desperate last stands)
    for (let t = 0; t < (st ? 18 : 12); t++) {
      const c = r.pick(corrCells); if (nearStart(c)) continue;
      const [x, z] = L.cellCenter(c), i = c % L.W, j = (c / L.W) | 0;
      const ns2 = L.edge(i, j, 1, 0) && L.edge(i, j, -1, 0);
      const rot = ns2 ? 0 : Math.PI / 2;
      const p = put(x, z, rot);
      // leave a gap on one side so the route stays open
      const side = r.chance(.5) ? -1 : 1;
      p.box('plastic', side * .55, .5, 0, 1.0, .05, .9, 1.2, 0, .2).box('metal', side * .75, .3, .3, .05, .6, .05).box('metal', side * .35, .3, -.3, .05, .6, .05);
      K.props.crate(put(x + (ns2 ? side * .7 : 0), z + (ns2 ? 0 : side * .7), r.range(0, 3)), r, .6);
      p.box('dark', side * .6, 1.1, -.1, .9, .04, .5, 0, .4, .9);
      p.geo(P.plane, 'scorch', side * .5, .01, .3, -Math.PI / 2, 0, 0, 1.6, 1.6);
      for (let k = 0; k < 6; k++) p.cyl('copper', side * .5 + r.range(-.4, .4), .02, r.range(-.6, .6), .008, .03, Math.PI / 2, 0, r() * 6, true); // spent casings
    }
    // --- sparking broken wall panels and hanging cables
    for (let t = 0; t < (st ? 50 : 40); t++) {
      const w = r.pick(walls); const h = hOf(w.c);
      const p = put(w.x, w.z, w.rot);
      if (r.chance(.5)) {
        const y = r.range(1.2, Math.min(2.4, h - .4));
        p.box('dark', 0, y, .02, .7, .5, .03).box('wall', .1, y - .45, .2, .7, .5, .03, 1.1, .3, .2); // hatch hanging open
        for (let k = 0; k < 4; k++) p.cyl(r.pick(['cable', 'red', 'copper']), r.range(-.25, .25), y - .3, .1, .012, .6, r.range(-.5, .5), 0, r.range(-.5, .5), true);
        const [sx, sz] = p.w(0, .12);
        W.sparkers.push({ x: sx, y: y - .1, z: sz, t: r() * 3 });
      } else {
        for (let k = 0; k < r.int(2, 4); k++) { const len = r.range(.6, 1.8); p.cyl('cable', r.range(-.8, .8), h - len / 2, r.range(.3, 1.2), .015, len, r.range(-.15, .15), 0, r.range(-.15, .15), true); }
      }
    }
    // --- steam leaks from corridor pipes
    for (let t = 0; t < (st ? 24 : 30); t++) {
      const c = r.pick(corrCells); const [x, z] = L.cellCenter(c); const h = hOf(c);
      W.steamers.push({ x: x + r.range(-.8, .8), y: h - .5, z: z + r.range(-.8, .8), t: r() * 5, period: r.range(4, 9) });
    }
    // --- nests: rooms the creature has claimed
    const nestCands = L.rooms.filter(rm => !rm.special && rm.cells >= 16 && L.areas[rm.id].level >= 1);
    r.shuffle(nestCands);
    for (const rm of nestCands.slice(0, st ? 5 : 4)) {
      rm.nest = true; W.nests.push(rm);
      const h = L.areas[rm.id].height;
      const { slots } = K.wallSlots(L, rm);
      for (const s of slots) if (!s.win) growWall({ x: s.x, z: s.z, rot: s.rot }, h, r.range(.6, 1));
      // cocooned crew on the walls, some chests burst open
      for (const s of slots.filter(s => !s.win).slice(0, Math.min(6, Math.floor(rm.cells / 5)))) {
        const p = put(s.x, s.z, s.rot), y = r.range(1.1, 1.5);
        p.geo(r.pick(geos.blobs), 'resinWet', 0, y, .2, 0, 0, 0, .8, 1.9, .55);
        p.sph('flesh', 0, y + .82, .38, .2, .24, .2).sph('dark', -.06, y + .84, .55, .04, .03, .02).sph('dark', .06, y + .84, .55, .04, .03, .02);
        p.geo(r.pick(geos.blobs), 'resinWet', 0, y + 1.1, .25, 0, 0, 0, .7, .6, .45);
        if (r.chance(.5)) { p.sph('meat', 0, y + .25, .45, .26, .22, .12); for (let k = 0; k < 4; k++) p.box('bone', -.12 + k * .08, y + .25, .52, .025, .2, .04, 0, 0, (k - 1.5) * .4); }
        p.geo(P.plane, 'blood', 0, .01, .8, -Math.PI / 2, 0, r() * 6, 1.6, 1.6);
      }
      // egg pods across the floor, strands from the ceiling
      for (let k = 0; k < Math.floor(rm.cells / 3); k++) {
        const x = (rm.x + r.range(.6, rm.w - .6)) * S, z = (rm.y + r.range(.6, rm.h - .6)) * S;
        const p = put(x, z, r() * 6), s = r.range(.8, 1.1);
        p.geo(geos.egg, 'meat', 0, 0, 0, 0, 0, 0, s, s, s).geo(r.pick(geos.blobs), 'resinWet', 0, .05, 0, 0, r() * 6, 0, s * 1.3, s * .2, s * 1.3);
        if (r.chance(.4)) for (let q = 0; q < 4; q++) p.sph('meat', Math.cos(q * 1.57) * .12, .95 * s, Math.sin(q * 1.57) * .12, .14, .06, .1); // opened lips
        W.ctx.addCollider(x - .35, z - .35, x + .35, z + .35, 1);
      }
      for (let k = 0; k < rm.cells; k++) {
        const x = (rm.x + r.range(.3, rm.w - .3)) * S, z = (rm.y + r.range(.3, rm.h - .3)) * S;
        put(x, z, 0).geo(geos.strand, 'resinWet', 0, h, 0, r.range(-.1, .1), 0, r.range(-.1, .1), r.range(1, 2), r.range(.5, h * .7), r.range(1, 2));
        if (r.chance(.25)) put(x, z, r() * 6).geo(r.pick(geos.blobs), 'resinWet', 0, h - .1, 0, 0, 0, 0, r.range(.6, 1.4), .4, r.range(.6, 1.4));
      }
      // sickly green bioluminescence
      ctx.addFixture(rm.cx * S, 1, rm.cy * S, [.35, .9, .4], .7, Math.max(rm.w, rm.h) * S * .6, { kind: 'screen' });
    }
  };
})();
