'use strict';
// City: a coastal grid city — downtown towers, deco strips, docks, a beach and
// ocean — with roads, sidewalks, palms, street lights, neon, a sky with a
// day/night cycle, traffic lanes and pedestrian loops.

H.city = {
  N: 8, P: 100, ROAD: 16, SIDE: 4,
  blocks: [], heistLots: {}, roofs: [], props: [], lights: [],
  get SIZE() { return this.N * this.P; },
  lotRect(i, j) { const P = this.P, r = this.ROAD / 2; return { x0: i * P + r, x1: (i + 1) * P - r, z0: j * P + r, z1: (j + 1) * P - r, cx: (i + 0.5) * P, cz: (j + 0.5) * P }; },
  district(i, j) {
    const c = (this.N - 1) / 2, d = Math.max(Math.abs(i - c), Math.abs(j - c));
    if (i === this.N - 1) return 'beach';
    if (j >= this.N - 1 && i <= 2) return 'docks';
    if (d < 1.6) return 'downtown';
    if (i >= this.N - 3) return 'deco';
    return 'suburb';
  },
};

H.buildCity = function () {
  const C = H.city, N = C.N, P = C.P, S = C.SIZE, scene = H.scene;
  const rng = H.seeded(1984);
  H.world.clear(); C.blocks = []; C.roofs = []; C.props = []; C.lights = [];
  const root = new THREE.Group(); root.name = 'city'; scene.add(root); C.root = root;

  /* ---------- sky, fog and light ---------- */
  const skyGeo = new THREE.SphereGeometry(700, 24, 12);
  C.skyMat = new THREE.MeshBasicMaterial({ map: H.tex.sky, side: THREE.BackSide, fog: false, depthWrite: false });
  C.sky = new THREE.Mesh(skyGeo, C.skyMat); scene.add(C.sky);
  C.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: 0xffd090, fog: false }));
  scene.add(C.sunDisc);
  scene.fog = new THREE.Fog(0xf0a888, 120, 640);
  C.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x8a6a50, 0.65); scene.add(C.hemi);
  C.sun = new THREE.DirectionalLight(0xffe0b0, 1.6);
  C.sun.castShadow = true; C.sun.shadow.mapSize.set(2048, 2048);
  const sc = C.sun.shadow.camera; sc.left = sc.bottom = -70; sc.right = sc.top = 70; sc.near = 1; sc.far = 400; C.sun.shadow.bias = -0.0006;
  scene.add(C.sun); scene.add(C.sun.target);
  C.timeOfDay = 17.2; // hours; sunset by default

  /* ---------- ground ---------- */
  const groundMat = new THREE.MeshStandardMaterial({ map: H.tex.asphalt, roughness: 0.95 });
  H.tex.asphalt.repeat.set(S / 8, S / 8);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(S + 40, S + 40), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.set(S / 2, -0.01, S / 2); ground.receiveShadow = true; root.add(ground);
  // beach and ocean east of the city
  const sandMat = new THREE.MeshStandardMaterial({ map: H.tex.sand, roughness: 1 }); H.tex.sand.repeat.set(10, 80);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(140, S + 400), sandMat); sand.rotation.x = -Math.PI / 2; sand.position.set(S + 70, -0.02, S / 2); sand.receiveShadow = true; root.add(sand);
  const waterMat = new THREE.MeshStandardMaterial({ map: H.tex.water, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.92 }); H.tex.water.repeat.set(60, 60);
  C.water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 2400), waterMat); C.water.rotation.x = -Math.PI / 2; C.water.position.set(S + 840, -0.35, S / 2); root.add(C.water);
  // invisible walls at the city limits
  H.world.addBox(-30, 10, S / 2, 20, 40, S + 120, { invisible: true });
  H.world.addBox(S / 2, 10, -30, S + 120, 40, 20, { invisible: true });
  H.world.addBox(S / 2, 10, S + 30, S + 120, 40, 20, { invisible: true });
  H.world.addBox(S + 150, 10, S / 2, 20, 40, S + 120, { invisible: true });

  /* ---------- roads ---------- */
  const roadMat = new THREE.MeshStandardMaterial({ map: H.tex.road, roughness: 0.9 });
  const crossMat = new THREE.MeshStandardMaterial({ map: H.tex.crossing, roughness: 0.9 });
  const R = C.ROAD;
  const roadGeoX = new THREE.PlaneGeometry(P - R, R); // along x
  const crossGeo = new THREE.PlaneGeometry(R, R);
  for (let k = 0; k <= N; k++) for (let m = 0; m < N; m++) {
    // road segment along z at x=k*P between intersections, and along x at z=k*P
    const a = new THREE.Mesh(roadGeoX, roadMat); a.rotation.x = -Math.PI / 2; a.rotation.z = Math.PI / 2; a.position.set(k * P, 0.01, (m + 0.5) * P); a.receiveShadow = true; root.add(a);
    const b = new THREE.Mesh(roadGeoX, roadMat); b.rotation.x = -Math.PI / 2; b.position.set((m + 0.5) * P, 0.01, k * P); b.receiveShadow = true; root.add(b);
  }
  for (let k = 0; k <= N; k++) for (let m = 0; m <= N; m++) { const c = new THREE.Mesh(crossGeo, crossMat); c.rotation.x = -Math.PI / 2; c.position.set(k * P, 0.012, m * P); c.receiveShadow = true; root.add(c); }

  /* ---------- batches ---------- */
  const facadeMats = H.tex.facades.map(t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, vertexColors: true }));
  const facadeB = facadeMats.map(m => new H.BoxBatch(m, 12));
  const roofB = new H.BoxBatch(new THREE.MeshStandardMaterial({ map: H.tex.roof, roughness: 0.95, vertexColors: true }), 6);
  const walkB = new H.BoxBatch(new THREE.MeshStandardMaterial({ map: H.tex.sidewalk, roughness: 0.9, vertexColors: true }), 3);
  const grassB = new H.BoxBatch(new THREE.MeshStandardMaterial({ map: H.tex.grass, roughness: 1, vertexColors: true }), 8);
  const concB = new H.BoxBatch(new THREE.MeshStandardMaterial({ map: H.tex.concrete, roughness: 0.9, vertexColors: true }), 6);
  const plainB = new H.BoxBatch(new THREE.MeshStandardMaterial({ roughness: 0.6, vertexColors: true }), 4);
  C.batches = { facadeB, roofB, walkB, grassB, concB, plainB };

  /* ---------- lot assignment ---------- */
  // heists take whole blocks; the safehouse and a couple of parks too
  const all = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) all.push([i, j]);
  const order = all.slice().sort((a, b) => rng() - 0.5);
  const used = new Set();
  const take = (pred) => { for (const b of order) { const k = b[0] + ',' + b[1]; if (!used.has(k) && pred(b)) { used.add(k); return b; } } for (const b of order) { const k = b[0] + ',' + b[1]; if (!used.has(k)) { used.add(k); return b; } } return null; };
  const want = { reserve: 'downtown', casino: 'deco', office: 'downtown', bank: 'downtown', gallery: 'deco', club: 'deco', warehouse: 'docks', yard: 'docks', mansion: 'suburb', lab: 'suburb', mall: 'suburb', methlab: 'suburb', truck: 'any', jewelry: 'any', shop: 'any' };
  C.safehouse = take(b => b[0] === 4 && b[1] === 5) || take(() => true);
  C.parks = [take(b => C.district(...b) === 'suburb'), take(b => C.district(...b) === 'deco')];
  for (const h of H.HEISTS) {
    const d = want[h.tpl];
    const b = take(bb => C.district(...bb) === d && C.district(...bb) !== 'beach') || take(bb => C.district(...bb) !== 'beach');
    C.heistLots[h.id] = { i: b[0], j: b[1] };
  }

  /* ---------- blocks ---------- */
  for (const [i, j] of all) {
    const L = C.lotRect(i, j), dist = C.district(i, j), key = i + ',' + j;
    const blk = { i, j, L, dist, kind: 'generic' };
    C.blocks.push(blk);
    // sidewalk ring (raised 15 cm)
    const sw = C.SIDE, w = L.x1 - L.x0, d = L.z1 - L.z0;
    walkB.add(L.cx, 0.075, L.z0 + sw / 2, w, 0.15, sw, 0xffffff);
    walkB.add(L.cx, 0.075, L.z1 - sw / 2, w, 0.15, sw, 0xffffff);
    walkB.add(L.x0 + sw / 2, 0.075, L.cz, sw, 0.15, d - sw * 2, 0xffffff);
    walkB.add(L.x1 - sw / 2, 0.075, L.cz, sw, 0.15, d - sw * 2, 0xffffff);
    // inner ground
    const inner = { x0: L.x0 + sw, x1: L.x1 - sw, z0: L.z0 + sw, z1: L.z1 - sw };
    const iw = inner.x1 - inner.x0, id = inner.z1 - inner.z0;
    const heistId = Object.keys(C.heistLots).find(k => C.heistLots[k].i === i && C.heistLots[k].j === j);
    // street props on the sidewalk: lights, palms, hydrants, benches
    for (let s = 0; s < 4; s++) {
      for (let t = 0.2; t < 0.95; t += 0.33) {
        const pos = s === 0 ? [H.lerp(L.x0, L.x1, t), L.z0 + 0.8] : s === 1 ? [H.lerp(L.x0, L.x1, t), L.z1 - 0.8] : s === 2 ? [L.x0 + 0.8, H.lerp(L.z0, L.z1, t)] : [L.x1 - 0.8, H.lerp(L.z0, L.z1, t)];
        if (heistId && s === 1 && Math.abs(pos[0] - L.cx) < 14) continue; // keep heist frontage clear
        const kind = (Math.floor(t * 3) + s) % 2;
        if (kind === 0 || dist === 'docks') {
          const l = H.buildStreetLight(); l.position.set(pos[0], 0.15, pos[1]);
          l.rotation.y = s === 0 ? Math.PI : s === 1 ? 0 : s === 2 ? -Math.PI / 2 : Math.PI / 2; root.add(l);
          C.lights.push(l);
          H.world.addBox(pos[0], 3, pos[1], 0.3, 6, 0.3, { prop: true });
        } else {
          const p = H.buildPalm(7 + rng() * 5, rng()); p.position.set(pos[0], 0.15, pos[1]); root.add(p);
          H.world.addBox(pos[0], 3, pos[1], 0.45, 6, 0.45, { prop: true });
        }
      }
    }
    if (key === C.safehouse.join(',')) { blk.kind = 'safehouse'; H.buildSafehouse(blk, inner); continue; }
    if (C.parks.some(p => p && p.join(',') === key)) { blk.kind = 'park'; buildPark(inner); continue; }
    if (heistId) { blk.kind = 'heist'; blk.heist = heistId; concB.add((inner.x0 + inner.x1) / 2, 0.06, (inner.z0 + inner.z1) / 2, iw, 0.12, id, 0xd8d4cc); continue; }
    if (dist === 'beach') { buildBeachBlock(blk, inner); continue; }
    // generic: 2x2 or 3x2 buildings with alleys
    concB.add((inner.x0 + inner.x1) / 2, 0.05, (inner.z0 + inner.z1) / 2, iw, 0.1, id, 0xbab6ae);
    const cols = dist === 'downtown' ? 2 : rng() < 0.5 ? 2 : 3, rows = 2, gap = 6;
    const cw = (iw - gap * (cols - 1)) / cols, rd = (id - gap * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const bx = inner.x0 + cw / 2 + c * (cw + gap), bz = inner.z0 + rd / 2 + r * (rd + gap);
      let hgt;
      if (dist === 'downtown') hgt = 40 + rng() * 90; else if (dist === 'deco') hgt = 12 + rng() * 16; else if (dist === 'docks') hgt = 8 + rng() * 6; else hgt = 7 + rng() * 14;
      const fi = dist === 'downtown' ? H.pick([3, 4, 8, 0]) : dist === 'deco' ? H.pick([1, 2, 6]) : dist === 'docks' ? H.pick([7, 0, 5]) : H.pick([0, 5, 1, 2, 7]);
      const tint = new THREE.Color().setHSL(rng(), 0.15, 0.85 + rng() * 0.15).getHex();
      // corner shop on the ground floor of some suburban buildings
      const bw = cw - 2, bd = rd - 2;
      facadeB[fi].add(bx, hgt / 2, bz, bw, hgt, bd, tint, 0, 0b110011);
      roofB.add(bx, hgt + 0.2, bz, bw + 0.6, 0.4, bd + 0.6, 0xffffff);
      // rooftop details: AC units, water tanks, parapet
      if (hgt > 10) {
        plainB.add(bx + bw * 0.2, hgt + 0.9, bz - bd * 0.2, 2.2, 1.4, 1.6, 0x9aa0a6);
        if (rng() < 0.5) { plainB.add(bx - bw * 0.25, hgt + 1.6, bz + bd * 0.2, 2.5, 3, 2.5, 0x6a5a4a); }
      }
      if (dist === 'downtown' && hgt > 70) { // setback crown
        facadeB[fi].add(bx, hgt + 8, bz, bw * 0.6, 16, bd * 0.6, tint, 0, 0b110011); roofB.add(bx, hgt + 16.2, bz, bw * 0.6 + 0.4, 0.4, bd * 0.6 + 0.4, 0xffffff);
        plainB.add(bx, hgt + 22, bz, 0.4, 12, 0.4, 0xc0c0c0);
      }
      // awnings on deco and suburb ground floors, coloured
      if (dist === 'deco' || dist === 'suburb') {
        const awn = H.pick([0xe86a8a, 0x40c0d0, 0xf0c040, 0x7ad070, 0xa070e0]);
        if (r === rows - 1) plainB.add(bx, 3.4, bz + bd / 2 + 0.8, bw * 0.8, 0.15, 1.6, awn);
        if (r === 0) plainB.add(bx, 3.4, bz - bd / 2 - 0.8, bw * 0.8, 0.15, 1.6, awn);
      }
      const b = H.world.addBox(bx, hgt / 2, bz, bw, hgt, bd, { building: true });
      C.roofs.push({ x: bx, z: bz, y: hgt + 0.4, w: bw, d: bd });
      // every ordinary building can be entered: register it and draw its street door
      if (bw >= 10 && bd >= 10 && hgt >= 6) {
        const face = r === rows - 1 ? 1 : -1, dz = bz + face * (bd / 2 + 0.04);
        const kind = dist === 'downtown' || dist === 'docks' ? 'office' : rng() < 0.35 ? 'shop' : 'apartment';
        const floors = H.clamp(Math.floor(hgt / 3.5), 1, dist === 'downtown' ? 6 : 4);
        plainB.add(bx, 1.35, dz, 2.4, 2.7, 0.08, 0x2a2a2e); plainB.add(bx, 1.25, dz + face * 0.03, 1.9, 2.4, 0.04, kind === 'office' ? 0x30506a : 0x6a4a2a);
        plainB.add(bx, 2.95, dz + face * 0.4, 3, 0.12, 0.9, kind === 'shop' ? 0xe86a8a : 0x404448);
        H.interiors.register({ x: bx, z: bz, w: bw, d: bd, h: hgt, fh: 3.5, floors, kind, face, dist, box: b, door: { x: bx, z: dz } });
      }
      // neon signs on deco and downtown facades
      if ((dist === 'deco' || (dist === 'downtown' && rng() < 0.35)) && r === rows - 1) {
        const names = ['Ocean Grill', 'Malibu', 'Pink Flamingo', 'Neon Palms', 'Sunset Motel', 'Starfish', 'Coral Club', 'Vibe', 'Tropicana', 'Paradise', 'Hotel Riviera', 'Lucky 7'];
        const n = H.buildNeon(H.pick(names), H.pick([0xff3aa0, 0x30e0ff, 0xffd040, 0x9a5aff, 0x40ff90]));
        n.position.set(bx, Math.min(hgt - 2, 8), bz + bd / 2 + 0.06); root.add(n); C.props.push(n);
      }
    }
    // parked cars along the kerb
    if (rng() < 0.7) C.parkSpots = (C.parkSpots || []).concat([{ x: L.cx + (rng() - 0.5) * 50, z: L.z1 + 2.2, ry: Math.PI / 2 }]);
    if (rng() < 0.6) C.parkSpots = (C.parkSpots || []).concat([{ x: L.x1 + 2.2, z: L.cz + (rng() - 0.5) * 50, ry: 0 }]);
  }

  function buildPark(inner) {
    const cx = (inner.x0 + inner.x1) / 2, cz = (inner.z0 + inner.z1) / 2, w = inner.x1 - inner.x0, d = inner.z1 - inner.z0;
    grassB.add(cx, 0.08, cz, w, 0.16, d, 0xffffff);
    walkB.add(cx, 0.1, cz, 4, 0.18, d, 0xffffff); walkB.add(cx, 0.1, cz, w, 0.18, 4, 0xffffff);
    // fountain
    const f = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.4, 0.8, 24), H.mat(0xd8d0c0, 0.6)); f.position.set(cx, 0.4, cz); f.castShadow = f.receiveShadow = true; root.add(f);
    const wt = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.1, 24), new THREE.MeshStandardMaterial({ map: H.tex.water, roughness: 0.1, metalness: 0.3 })); wt.position.set(cx, 0.75, cz); root.add(wt);
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.8, 2.4, 12), H.mat(0xd8d0c0, 0.6)); sp.position.set(cx, 1.6, cz); root.add(sp);
    H.world.addBox(cx, 0.4, cz, 9.6, 0.8, 9.6, { prop: true });
    for (let k = 0; k < 14; k++) { const x = H.lerp(inner.x0 + 4, inner.x1 - 4, rng()), z = H.lerp(inner.z0 + 4, inner.z1 - 4, rng()); if (Math.abs(x - cx) < 8 || Math.abs(z - cz) < 8) continue; const p = H.buildPalm(6 + rng() * 6, rng()); p.position.set(x, 0.15, z); root.add(p); H.world.addBox(x, 3, z, 0.45, 6, 0.45, { prop: true }); }
    for (let k = 0; k < 6; k++) { const x = cx + (k % 2 ? 6 : -6), z = cz + (k - 2.5) * 8; plainB.add(x, 0.45, z, 0.6, 0.1, 2.2, 0x6a4a2a); plainB.add(x, 0.22, z, 0.5, 0.44, 0.15, 0x2a2a2a); }
  }
  function buildBeachBlock(blk, inner) {
    // beach-front hotels on the city side, open sand toward the ocean
    const cx = (inner.x0 + inner.x1) / 2;
    concB.add(cx, 0.05, (inner.z0 + inner.z1) / 2, inner.x1 - inner.x0, 0.1, inner.z1 - inner.z0, 0xe8dcc0);
    const hgt = 14 + rng() * 22, bw = 30, bd = (inner.z1 - inner.z0) - 16;
    const bx = inner.x0 + bw / 2 + 2, bz = (inner.z0 + inner.z1) / 2;
    const fi = H.pick([1, 2, 6]);
    facadeB[fi].add(bx, hgt / 2, bz, bw, hgt, bd, 0xffffff, 0, 0b110011); roofB.add(bx, hgt + 0.2, bz, bw + 0.6, 0.4, bd + 0.6, 0xffffff);
    H.world.addBox(bx, hgt / 2, bz, bw, hgt, bd, { building: true }); C.roofs.push({ x: bx, z: bz, y: hgt + 0.4, w: bw, d: bd });
    const n = H.buildNeon(H.pick(['Hotel Oceana', 'Breeze Inn', 'The Palms', 'Seaside']), H.pick([0xff3aa0, 0x30e0ff, 0x40ff90]));
    n.position.set(bx + bw / 2 + 0.06, hgt - 3, bz); n.rotation.y = Math.PI / 2; root.add(n); C.props.push(n);
    // pool
    const pool = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 8), new THREE.MeshStandardMaterial({ map: H.tex.water, color: 0x80e0ff, roughness: 0.05 }));
    pool.position.set(inner.x1 - 14, 0.12, bz); root.add(pool);
    for (let k = 0; k < 6; k++) { const p = H.buildPalm(8 + rng() * 4, rng()); const x = inner.x1 - 4 - rng() * 22, z = H.lerp(inner.z0 + 4, inner.z1 - 4, rng()); p.position.set(x, 0.1, z); root.add(p); H.world.addBox(x, 3, z, 0.45, 6, 0.45, { prop: true }); }
  }

  // beach dressing: umbrellas, palms, lifeguard tower
  for (let k = 0; k < 40; k++) {
    const x = S + 15 + rng() * 100, z = rng() * S;
    if (rng() < 0.5) { const p = H.buildPalm(7 + rng() * 6, rng()); p.position.set(x, 0, z); root.add(p); H.world.addBox(x, 3, z, 0.45, 6, 0.45, { prop: true }); }
    else {
      const u = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), H.mat(0xeeeeee)); pole.position.y = 1.2; u.add(pole);
      const top = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.5, 10), H.mat(H.pick([0xff4a8a, 0x30c0e0, 0xffd040, 0xf06a2a]), 0.8)); top.position.y = 2.4; top.castShadow = true; u.add(top);
      u.position.set(x, 0, z); root.add(u);
    }
  }
  for (let k = 0; k < 3; k++) {
    const z = S * (0.2 + k * 0.3), x = S + 90;
    plainB.add(x, 1.5, z, 0.2, 3, 0.2, 0xffffff); plainB.add(x + 2, 1.5, z, 0.2, 3, 0.2, 0xffffff); plainB.add(x, 1.5, z + 2, 0.2, 3, 0.2, 0xffffff); plainB.add(x + 2, 1.5, z + 2, 0.2, 3, 0.2, 0xffffff);
    plainB.add(x + 1, 3.1, z + 1, 3, 0.2, 3, 0xe8e0d0); plainB.add(x + 1, 4.1, z + 1, 2.6, 1.8, 2.6, 0xe84040); plainB.add(x + 1, 5.1, z + 1, 3.2, 0.2, 3.2, 0xffffff);
  }

  // a long pier into the ocean
  concB.add(S + 180, 0.5, S * 0.55, 80, 1, 8, 0xa08a6a);

  for (const b of [...facadeB, roofB, walkB, grassB, concB, plainB]) { if (b.pos.length) root.add(b.build(true)); }
  // ground-level ambience lights at night: a few point lights near neon
  C.neonLights = [];
  for (let k = 0; k < 6 && k < C.props.length; k++) {
    const n = C.props[Math.floor(rng() * C.props.length)];
    const l = new THREE.PointLight(n.material.color.getHex(), 0, 25, 2); l.position.copy(n.position).add(new THREE.Vector3(0, -1, 1.5)); root.add(l); C.neonLights.push(l);
  }
  // traffic lane network: road centre lines at k*P, lanes ±3.5
  C.laneOffset = 3.6;
};

// safehouse: a deco villa with a garage and a door you can walk into
H.buildSafehouse = function (blk, inner) {
  const C = H.city, root = C.root;
  const cx = (inner.x0 + inner.x1) / 2, cz = (inner.z0 + inner.z1) / 2;
  C.batches.grassB.add(cx, 0.06, cz, inner.x1 - inner.x0, 0.12, inner.z1 - inner.z0, 0xffffff);
  const w = 30, d = 22, h = 9, bx = cx, bz = cz - 6;
  C.batches.facadeB[1].add(bx, h / 2, bz, w, h, d, 0xffffff, 0, 0b110011);
  C.batches.roofB.add(bx, h + 0.2, bz, w + 0.8, 0.4, d + 0.8, 0xffffff);
  H.world.addBox(bx, h / 2, bz, w, h, d, { building: true });
  C.roofs.push({ x: bx, z: bz, y: h + 0.4, w, d });
  // pool and driveway
  const pool = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, 6), new THREE.MeshStandardMaterial({ map: H.tex.water, color: 0x80e0ff, roughness: 0.05 }));
  pool.position.set(cx - 8, 0.14, cz + 12); root.add(pool);
  C.batches.walkB.add(cx + 9, 0.1, cz + 12, 8, 0.18, 14, 0xffffff);
  const sign = H.buildNeon('Safehouse', 0x30e0ff); sign.position.set(bx, 7, bz + d / 2 + 0.06); root.add(sign);
  C.safePos = new THREE.Vector3(bx, 0, bz + d / 2 + 3);
  C.garagePos = new THREE.Vector3(cx + 9, 0, cz + 14);
  // door marker
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, 0.2), H.mat(0x5a3a2a, 0.6)); door.position.set(bx, 1.5, bz + d / 2 + 0.05); root.add(door);
};

/* ---------- day / night cycle ---------- */
H.updateSky = function (dt) {
  const C = H.city; if (!C.sun) return;
  C.timeOfDay = (C.timeOfDay + dt * (24 / (24 * 60))) % 24; // one in-game day per 24 real minutes
  const t = C.timeOfDay, ang = (t - 6) / 12 * Math.PI; // 6h rise, 18h set
  const elev = Math.sin(ang);
  const day = H.clamp(elev * 2.2 + 0.25, 0, 1), dusk = H.clamp(1 - Math.abs(elev) * 4, 0, 1);
  const p = H.camera.position;
  const sd = new THREE.Vector3(Math.cos(ang) * 0.6, Math.max(0.12, elev), 0.5).normalize();
  C.sun.position.copy(p).addScaledVector(sd, 200); C.sun.target.position.copy(p); C.sun.target.updateMatrixWorld();
  C.sun.intensity = 0.15 + day * 1.5; C.sun.color.setHSL(0.08, 0.6 + dusk * 0.4, 0.55 + day * 0.2);
  C.hemi.intensity = 0.25 + day * 0.5;
  C.hemi.color.setHSL(0.6 - dusk * 0.05, 0.4, 0.35 + day * 0.4);
  const skyCol = new THREE.Color().setHSL(0.62 - dusk * 0.12, 0.6, 0.08 + day * 0.55);
  C.skyMat.color.copy(skyCol).lerp(new THREE.Color(1, 1, 1), day * 0.6 + dusk * 0.3);
  H.scene.fog.color.setHSL(0.05 + (1 - dusk) * 0.5 * day, 0.5, 0.08 + day * 0.55 + dusk * 0.1);
  H.renderer.setClearColor(H.scene.fog.color);
  C.sky.position.copy(p);
  C.sunDisc.position.copy(p).addScaledVector(sd, 600); C.sunDisc.lookAt(p); C.sunDisc.visible = elev > -0.1;
  const night = 1 - day;
  for (const n of C.props) if (n.material) n.material.opacity = 0.55 + night * 0.45;
  for (const l of C.neonLights) l.intensity = night * 2.5;
  H.renderer.toneMappingExposure = 0.9 + night * 0.35;
  C.night = night;
  if (C.water) { C.water.material.map.offset.x += dt * 0.004; C.water.material.map.offset.y += dt * 0.002; }
};
H.clockString = () => { const t = H.city.timeOfDay; const h = Math.floor(t), m = Math.floor((t - h) * 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
