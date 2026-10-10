// Kestrel — turns generated level data into chunked, light-baked geometry plus interactive objects.
(function () {
  const K = window.K, S = K.S, WT = K.WT;
  const DW = 1.5, DH = 2.3, CH = 10; // door width/height, chunk size in cells
  K.DW = DW; K.DH = DH;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  K.buildWorld = function (L, M) {
    const r = K.rng(L.seed ^ 0x5eed);
    { const rb = K.rng(L.seed ^ 0xb1ac);
      for (const a of L.areas) {
        const keep = a.isRoom && (a.room === L.startRoom || a.room.type === 'save' || a.room.hub);
        a.dark = !keep && rb.chance(a.isRoom ? .28 : .33);
      }
    }
    const st = L.theme === 'station';
    const root = new THREE.Group();
    const chunks = new Map();
    const chunkKey = (x, z) => Math.floor(x / (S * CH)) + ',' + Math.floor(z / (S * CH));
    function chunkAt(x, z) {
      const k = chunkKey(x, z);
      let c = chunks.get(k);
      if (!c) { const [ci, cj] = k.split(',').map(Number); c = { key: k, B: new K.Builder(), meshes: [], objs: [], cx: (ci + .5) * S * CH, cz: (cj + .5) * S * CH, visible: true }; chunks.set(k, c); }
      return c;
    }
    const W = {
      L, M, root, chunks, fixtures: [], colliders: new Map(), interacts: [], lockers: [], phys: [], bakeTargets: [], spotsByRoom: [], saveStations: [], levers: [], signs: [],
      poweredLevel: 0, // fixtures in areas with level <= poweredLevel have power
    };
    const ctx = {
      L, r, M, spots: [],
      B: (x, z) => chunkAt(x, z).B,
      addFixture(x, y, z, color, int, range, o = {}) {
        const c = L.cellOf(x, z);
        const f = { id: W.fixtures.length, x, y, z, c: color, int, range, kind: o.kind || 'main', area: c >= 0 ? L.area[c] : -1, level: 0, broken: false, flicker: false, grow: o.grow, reactor: o.reactor, chunk: chunkKey(x, z) };
        f.level = f.area >= 0 ? L.areas[f.area].level : 0;
        if (f.kind === 'main' && !o.reactor && !o.grow) { const dark = f.area >= 0 && L.areas[f.area].dark; f.broken = dark ? r.chance(.92) : r.chance(.18); f.flicker = !f.broken && r.chance(dark ? .6 : .12); }
        W.fixtures.push(f); return f.id;
      },
      addCollider(x0, z0, x1, z1, h) {
        const b = { x0, z0, x1, z1, h };
        for (let j = Math.floor(z0 / S); j <= Math.floor(z1 / S); j++) for (let i = Math.floor(x0 / S); i <= Math.floor(x1 / S); i++) {
          const c = j * L.W + i; let a = W.colliders.get(c); if (!a) W.colliders.set(c, a = []); a.push(b);
        }
      },
      lockerRow(slot, n) { if (!slot) return; for (let k = 0; k < n; k++) makeLocker(slot, (k - (n - 1) / 2) * .64); },
      saveStation(slot) { if (slot) makeSave(slot); },
      addPhys(type, x, z, rot) { makePhys(type, x, z, rot); },
    };
    W.ctx = ctx;

    // ------------------------------------------------ surfaces
    function face(B, key, cx, cz, nx, nz, w, y0, y1, vMap) {
      const rx = nz, rz = -nx;
      const ax = cx - rx * w / 2, az = cz - rz * w / 2, bx = cx + rx * w / 2, bz = cz + rz * w / 2;
      const ua = (ax * rx + az * rz) / S, ub = (bx * rx + bz * rz) / S;
      const v0 = vMap ? vMap[0] : y0 / S, v1 = vMap ? vMap[1] : y1 / S;
      B.quad(key, [ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], [nx, 0, nz], [ua, v0], [ub, v0], [ub, v1], [ua, v1]);
    }
    // tall wall: lower 2.5m uses the full panel texture, above that repeat the upper panel band
    function wallStack(B, key, cx, cz, nx, nz, w, y0, y1) {
      // split lower part horizontally for better light resolution
      const lo = Math.min(y1, S);
      if (lo > y0) {
        const rx = nz, rz = -nx;
        for (const s of [-.25, .25]) face(B, key, cx + rx * w * s, cz + rz * w * s, nx, nz, w / 2, y0, lo, [y0 / S, lo / S]);
      }
      for (let y = S; y < y1 - .01; y += .9) face(B, key, cx, cz, nx, nz, w, y, Math.min(y1, y + .9), [.47, .47 + (Math.min(y1, y + .9) - y) / S]);
    }
    function hquad(B, key, x0, z0, x1, z1, y, up, uvScale = S) {
      if (up) B.quad(key, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], [x0 / uvScale, z1 / uvScale], [x1 / uvScale, z1 / uvScale], [x1 / uvScale, z0 / uvScale], [x0 / uvScale, z0 / uvScale]);
      else B.quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, -1, 0], [x0 / uvScale, z0 / uvScale], [x1 / uvScale, z0 / uvScale], [x1 / uvScale, z1 / uvScale], [x0 / uvScale, z1 / uvScale]);
    }
    const boxM = (x, y, z, w, h, d, ry = 0) => K.mat4(x, y, z, 0, ry, 0, w, h, d);
    const areaH = c => L.areas[L.area[c]].height;

    const { W: GW, H: GH } = L;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const c = j * GW + i; if (!L.kind[c]) continue;
      const x0 = i * S, z0 = j * S, cx = x0 + S / 2, cz = z0 + S / 2;
      const ch = chunkAt(cx, cz), B = ch.B;
      const a = L.areas[L.area[c]], h = a.height, corr = !a.isRoom;
      const fkey = corr || !st ? 'grate' : 'floor';
      for (const [sx, sz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) hquad(B, fkey, x0 + sx * S / 2, z0 + sz * S / 2, x0 + (sx + 1) * S / 2, z0 + (sz + 1) * S / 2, 0, true);
      hquad(B, 'ceil', x0, z0, x0 + S, z0 + S, h, false);
      // walls on each side
      for (const [dx, dz] of DIRS) {
        const e = L.edge(i, j, dx, dz); if (e === 0) continue;
        const nx = -dx, nz = -dz; // inward normal
        const fx = cx + dx * (S / 2 - WT), fz = cz + dz * (S / 2 - WT);
        const rx = nz, rz = -nx;
        const ni = i + dx, nj = j + dz, nc = nj * GW + ni, ext = L.ext[nc];
        if (e === 1) {
          wallStack(B, 'wall', fx, fz, nx, nz, S, 0, h);
          face(B, 'trim', fx + nx * .03, fz + nz * .03, nx, nz, S, 0, .14); // kick strip
          B.addGeom(K.prim.box, 'trim', boxM(fx + nx * .02, h - .1, fz + nz * .02, Math.abs(rx) * S + Math.abs(nx) * .06, .12, Math.abs(rz) * S + Math.abs(nz) * .06));
        } else if (e === 2) {
          const wy0 = .9, wy1 = Math.min(2.6, h - .35);
          wallStack(B, 'wall', fx, fz, nx, nz, S, 0, wy0); face(B, 'wall', fx, fz, nx, nz, S, wy1, h, [.47, .47 + (h - wy1) / S]);
          const ex = cx + dx * S / 2, ez = cz + dz * S / 2; // edge line
          const sill = Math.abs(rx) > .5 ? [ex - S / 2, ez - WT, ex + S / 2, ez + WT] : [ex - WT, ez - S / 2, ex + WT, ez + S / 2];
          hquad(B, 'trim', sill[0], sill[1], sill[2], sill[3], wy0, true); hquad(B, 'trim', sill[0], sill[1], sill[2], sill[3], wy1, false);
          // glass + mullions (only from the interior side)
          if (ext) {
            face(B, 'glass', ex, ez, nx, nz, S, wy0, wy1);
            for (const s of [-.5, 0, .5]) B.addGeom(K.prim.box, 'trim', boxM(ex + rx * s * S, (wy0 + wy1) / 2, ez + rz * s * S, Math.abs(rx) * .08 + Math.abs(nx) * .12, wy1 - wy0, Math.abs(rz) * .08 + Math.abs(nz) * .12));
            B.addGeom(K.prim.box, 'trim', boxM(ex, (wy0 + wy1) / 2, ez, Math.abs(rx) * S + Math.abs(nx) * .05, .05, Math.abs(rz) * S + Math.abs(nz) * .05));
          }
        } else { // door opening
          const side = (S - DW) / 2;
          for (const s of [-1, 1]) {
            const off = s * (DW / 2 + side / 2);
            wallStack(B, 'wall', fx + rx * off, fz + rz * off, nx, nz, side, 0, Math.min(h, DH));
            // reveal (jamb) face across half the wall thickness
            const jx = fx + rx * s * DW / 2 - nx * WT / 2, jz = fz + rz * s * DW / 2 - nz * WT / 2;
            face(B, 'trim', jx, jz, -s * rx, -s * rz, WT, 0, DH);
          }
          wallStack(B, 'wall', fx, fz, nx, nz, S, DH, h);
          const ex = cx + dx * S / 2, ez = cz + dz * S / 2;
          const lint = Math.abs(rx) > .5 ? [ex - DW / 2, Math.min(ez, fz), ex + DW / 2, Math.max(ez, fz)] : [Math.min(ex, fx), ez - DW / 2, Math.max(ex, fx), ez + DW / 2];
          hquad(B, 'trim', lint[0], lint[1], lint[2], lint[3], DH, false);
          // frame
          const d = L.doors[e - 3], fm = d.bulk ? 'hazard' : 'trim';
          for (const s of [-1, 1]) B.addGeom(K.prim.box, fm, boxM(fx + rx * s * (DW / 2 + .07) + nx * .04, DH / 2, fz + rz * s * (DW / 2 + .07) + nz * .04, Math.abs(rx) * .14 + Math.abs(nx) * .08, DH, Math.abs(rz) * .14 + Math.abs(nz) * .08));
          B.addGeom(K.prim.box, fm, boxM(fx + nx * .04, DH + .08, fz + nz * .04, Math.abs(rx) * (DW + .28) + Math.abs(nx) * .08, .16, Math.abs(rz) * (DW + .28) + Math.abs(nz) * .08));
          if (d.bulk) hquad(B, 'hazard', Math.min(ex, fx + nx * .6) - (Math.abs(rx) > .5 ? DW / 2 : 0), Math.min(ez, fz + nz * .6) - (Math.abs(rz) > .5 ? DW / 2 : 0), Math.max(ex, fx + nx * .6) + (Math.abs(rx) > .5 ? DW / 2 : 0), Math.max(ez, fz + nz * .6) + (Math.abs(rz) > .5 ? DW / 2 : 0), .006, true, 1);
          // signage above doors on the corridor side
          if (corr && d) {
            const other = L.areas[L.area[nc]];
            if (other && other.isRoom) addSign(B, (K.ROOMDEF[other.room.type] || {}).name || other.room.type, fx + nx * .01, fz + nz * .01, nx, nz, Math.min(h - .25, DH + .55));
            else if (d.bulk && other) addSign(B, L.sectorNames[other.sector % L.sectorNames.length], fx + nx * .01, fz + nz * .01, nx, nz, Math.min(h - .25, DH + .55), true);
          }
        }
        // exterior hull skin seen from other windows
        if (ext) face(B, 'hull', cx + dx * (S / 2 + WT), cz + dz * (S / 2 + WT), dx, dz, S, -.4, h + .5);
      }
      // corridor dressing: ribs/beams/pipes and strip lights
      if (corr) {
        const eE = L.edge(i, j, 1, 0), eW = L.edge(i, j, -1, 0), eN = L.edge(i, j, 0, -1), eS = L.edge(i, j, 0, 1);
        const ns = eE !== 0 && eW !== 0, ew = eN !== 0 && eS !== 0;
        const lit = (i + j) % 2 === 0;
        if (lit) {
          const fid = ctx.addFixture(cx, h - .08, cz, st ? [1, .9, .74] : [.72, .85, 1], st ? 1.05 : .9, 6);
          const along = ns ? 0 : Math.PI / 2;
          B.addGeom(K.prim.box, 'trim', K.mat4(cx, h - .05, cz, 0, along, 0, .3, .08, 1.9));
          B.addGeom(K.prim.box, 'lamp', K.mat4(cx, h - .1, cz, 0, along, 0, .18, .03, 1.75), fid);
        } else if (ns || ew) {
          const along = ns ? Math.PI / 2 : 0; // beam spans across the corridor
          B.addGeom(K.prim.box, 'trim', K.mat4(cx, h - .14, cz, 0, along, 0, .32, .28, S));
          for (const s of [-1, 1]) {
            const [px, pz] = ns ? [cx + s * (S / 2 - WT - .06), cz] : [cx, cz + s * (S / 2 - WT - .06)];
            B.addGeom(K.prim.box, 'trim', K.mat4(px, h / 2, pz, 0, along, 0, .32, h, .12));
          }
        }
        // pipes along one wall
        const pipeSide = (L.sector[c] % 2) ? 1 : -1;
        if (ns && L.edge(i, j, pipeSide, 0) === 1) for (const [y, rad, m] of [[h - .42, .07, 'copper'], [h - .62, .05, 'metal'], [.35, .06, 'dark']]) B.addGeom(K.prim.cyl8, m, K.mat4(cx + pipeSide * (S / 2 - WT - .12), y, cz, Math.PI / 2, 0, 0, rad * 2, S, rad * 2));
        if (ew && L.edge(i, j, 0, pipeSide) === 1) for (const [y, rad, m] of [[h - .42, .07, 'copper'], [h - .62, .05, 'metal'], [.35, .06, 'dark']]) B.addGeom(K.prim.cyl8, m, K.mat4(cx, y, cz + pipeSide * (S / 2 - WT - .12), 0, 0, Math.PI / 2, rad * 2, S, rad * 2));
        // red emergency lamp
        if ((i * 7 + j * 3) % 6 === 0) {
          for (const [dx, dz] of DIRS) if (L.edge(i, j, dx, dz) === 1) {
            const lx = cx + dx * (S / 2 - WT - .05), lz = cz + dz * (S / 2 - WT - .05);
            const fid = ctx.addFixture(lx - dx * .2, h - .5, lz - dz * .2, [1, .09, .04], .6, 4.5, { kind: 'emerg' });
            B.addGeom(K.prim.box, 'lamp', boxM(lx, h - .5, lz, .14, .2, .14), fid);
            B.addGeom(K.prim.box, 'dark', boxM(lx + dx * .04, h - .38, lz + dz * .04, .2, .05, .2));
            break;
          }
        }
        if (r.chance(.12)) ctx.addFixture(cx, h - .3, cz, [1, .5, .2], 0, 0, { kind: 'none' });
      }
    }
    // corner pillars at grid vertices where walls meet
    for (let j = 1; j < GH; j++) for (let i = 1; i < GW; i++) {
      const cs = [(j - 1) * GW + i - 1, (j - 1) * GW + i, j * GW + i - 1, j * GW + i];
      let hmax = 0; for (const c of cs) if (L.kind[c]) hmax = Math.max(hmax, areaH(c));
      if (!hmax) continue;
      const e1 = L.eS[cs[0]], e2 = L.eS[cs[1]], e3 = L.eE[cs[0]], e4 = L.eE[cs[2]];
      if (!(e1 || e2 || e3 || e4)) continue;
      const corner = ((e1 || e2) && (e3 || e4));
      const sz = corner ? .38 : .34;
      chunkAt(i * S, j * S).B.addGeom(K.prim.box, 'trim', boxM(i * S, hmax / 2, j * S, sz, hmax, sz));
    }
    // room ceiling lights + special lighting + emergency lamp
    for (const room of L.rooms) {
      const a = L.areas[room.id], h = a.height;
      const tint = room.type === 'save' ? [.55, 1, .65] : room.type === 'lab' ? [.75, .95, 1] : room.type === 'reactor' || room.type === 'engineering' ? [1, .75, .5] : room.type === 'bridge' ? [.6, .8, 1] : st ? [1, .9, .76] : [.75, .86, 1];
      for (let li = 0; li < room.w; li++) for (let lj = 0; lj < room.h; lj++) {
        const ok = (room.w <= 2 ? li === 0 : li % 2 === 1) && (room.h <= 2 ? lj === 0 : lj % 2 === 1);
        if (!ok || room.hub) continue;
        const x = (room.x + li + (room.w <= 2 ? room.w / 2 : .5)) * S, z = (room.y + lj + (room.h <= 2 ? room.h / 2 : .5)) * S;
        const B = chunkAt(x, z).B;
        if (h > 5) { // hanging industrial lamps
          const y = Math.min(h - 1.2, 4.2);
          const fid = ctx.addFixture(x, y - .2, z, tint, 1.7, 8.5);
          B.addGeom(K.prim.cyl8, 'dark', K.mat4(x, (y + h) / 2, z, 0, 0, 0, .03, h - y, .03));
          B.addGeom(K.shadeGeo || (K.shadeGeo = K.lathe([[.05, .3], [.2, .25], [.45, 0], [.47, -.03]], 14)), 'dark', K.mat4(x, y, z, 0, 0, 0, 1, 1, 1));
          B.addGeom(K.prim.sph, 'lamp', K.mat4(x, y - .02, z, 0, 0, 0, .35, .12, .35), fid);
        } else {
          const fid = ctx.addFixture(x, h - .12, z, tint, room.type === 'save' ? 1.5 : 1.3, Math.max(6, h * 1.8));
          B.addGeom(K.prim.box, 'trim', boxM(x, h - .05, z, 1.4, .1, .72));
          B.addGeom(K.prim.box, 'lamp', boxM(x, h - .11, z, 1.28, .025, .6), fid);
        }
      }
      // emergency light near a door
      const ds = L.doors.filter(d => d.a1 === room.id || d.a2 === room.id);
      if (ds.length) {
        const d = ds[0], inside = L.area[d.c1] === room.id ? d.c1 : d.c2;
        const [x, z] = L.cellCenter(inside);
        ctx.addFixture(x, h - .4, z, [1, .1, .05], .5, 4, { kind: 'emerg' });
      }
      W.spotsByRoom[room.id] = [];
    }
    // ceiling vents (stalker access points)
    for (const v of L.vents) {
      const [x, z] = L.cellCenter(v.c), h = L.areas[v.area].height, B = chunkAt(x, z).B;
      v.x = x; v.z = z; v.y = h;
      B.addGeom(K.prim.box, 'dark', boxM(x, h - .03, z, 1.0, .06, 1.0));
      for (let k = 0; k < 6; k++) B.addGeom(K.prim.box, 'trim', boxM(x - .38 + k * .152, h - .07, z, .04, .05, .9));
    }
    // ------------------------------------------------ signs
    function addSign(B, text, x, z, nx, nz, y, sector) {
      const key = 'sign:' + text;
      if (!M[key]) { const t = K.signTex(text.toUpperCase(), null, sector ? '#e8b540' : '#e9e3d0', sector ? 'rgba(20,16,8,.85)' : 'rgba(18,20,22,.9)'); M[key] = K.bakeMat({ map: t, roughness: .5, transparent: true }); }
      face(B, key, x, z, nx, nz, 1.6, y - .2, y + .2, [0, 1]);
      // fix UVs for this sign quad (face() maps u from world coords) -> remap to 0..1
      const G = B.groups[key], n = G.u.length;
      const us = [0, 1, 1, 0, 1, 0]; // a,b,c,a,c,d -> u
      for (let k = 0; k < 6; k++) G.u[n - 12 + k * 2] = [0, 1, 1, 0, 1, 0][k];
    }

    // ------------------------------------------------ doors (separate animated objects)
    const panelGeo = new THREE.BoxGeometry(DW / 2 + .02, DH, .1);
    const doorBuilt = {};
    for (const d of L.doors) {
      const g = new THREE.Group(); g.position.set(d.x, 0, d.z); g.rotation.y = d.ori === 'E' ? Math.PI / 2 : 0;
      const mat = d.bulk ? M.hazard : M.doorM;
      d.panels = [];
      for (const s of [-1, 1]) {
        const m = new THREE.Mesh(panelGeo.clone(), mat); m.position.set(s * (DW / 4 + .005), DH / 2, 0); m.castShadow = m.receiveShadow = true;
        g.add(m); d.panels.push(m); W.bakeTargets.push(m);
        // window slit + grip detail
        const det = new THREE.Mesh(K.prim.box, M.dark); det.scale.set(.06, .9, .13); det.position.set(-s * (DW / 4 - .06), 0, 0); m.add(det);
      }
      d.lights = [];
      for (const s of [-1, 1]) {
        const lm = new THREE.MeshBasicMaterial({ color: 0x33ff66 });
        const l = new THREE.Mesh(K.prim.box, lm); l.scale.set(.22, .07, .03); l.position.set(DW / 2 + .26, 1.35, s * (WT + .015)); g.add(l); d.lights.push(lm);
        const pad = new THREE.Mesh(K.prim.box, M.dark); pad.scale.set(.18, .3, .03); pad.position.set(DW / 2 + .26, 1.15, s * (WT + .012)); g.add(pad);
      }
      d.group = g; d.open = 0; d.target = 0;
      chunkAt(d.x, d.z).objs.push(g);
      root.add(g);
    }

    // ------------------------------------------------ lockers
    let lockerDoorGeos = null;
    function makeLocker(slot, offset) {
      const rx = Math.cos(slot.rot), rz = -Math.sin(slot.rot);
      const x = slot.x + rx * offset, z = slot.z + rz * offset;
      const p = new K.Put(ctx, x, z, slot.rot);
      K.props.lockerBody(p);
      if (!lockerDoorGeos) lockerDoorGeos = K.lockerDoorGeo().build(M);
      const pivot = new THREE.Group();
      const [hx, hz] = p.w(-.3, .5); pivot.position.set(hx, 0, hz); pivot.rotation.y = slot.rot;
      for (const m0 of lockerDoorGeos) { const m = new THREE.Mesh(m0.geometry.clone(), m0.material); m.castShadow = true; m.receiveShadow = true; pivot.add(m); W.bakeTargets.push(m); }
      root.add(pivot); chunkAt(x, z).objs.push(pivot);
      const [ix, iz] = p.w(0, .24);
      const lk = { x: ix, z: iz, yaw: slot.rot + Math.PI, rot: slot.rot, pivot, open: 0, target: 0, frontX: p.w(0, 1.0)[0], frontZ: p.w(0, 1.0)[1] };
      W.lockers.push(lk);
      const [px, pz] = p.w(0, .55);
      W.interacts.push({ x: px, y: 1.2, z: pz, kind: 'locker', locker: lk, label: 'Hide in locker' });
    }
    function makeSave(slot) {
      const p = new K.Put(ctx, slot.x, slot.z, slot.rot);
      p.box('plastic', 0, 1.25, .12, .9, 1.1, .24).box('dark', 0, 1.3, .245, .7, .5, .01);
      if (!M.scrSave) M.scrSave = new THREE.MeshBasicMaterial({ map: K.screenTex(['EMERGENCY SHELTER', 'BEACON LOG v2.3', '', '> RECORD STATUS', '  [E] TO SAVE', ''], 'green', 99) });
      p.geo(K.prim.plane, 'scrSave', 0, 1.3, .252, 0, 0, 0, .66, .46);
      p.box('ledG', -.3, .9, .245, .06, .06, .01).box('ledG', -.18, .9, .245, .06, .06, .01);
      p.light(0, 1.3, .6, [.3, 1, .45], .7, 3.5, { kind: 'screen' });
      const [x, z] = p.w(0, .5);
      const s = { x, z, label: 'Record progress' };
      W.saveStations.push(s);
      W.interacts.push({ x, y: 1.3, z, kind: 'save', label: 'Record progress (save)' });
    }
    // ------------------------------------------------ physics props
    const physDefs = {
      crate: { r: .26, h: .5, mass: 6, build: p => { K.props.crate(p, r, .5, 'orange'); } },
      canister: { r: .14, h: .55, mass: 3, build: p => { p.cyl('metal', 0, .27, 0, .13, .5).cyl('red', 0, .35, 0, .135, .08).cyl('dark', 0, .55, 0, .05, .06); } },
      bottle: { r: .05, h: .3, mass: .4, breaks: true, build: p => { p.cyl('glassP', 0, .11, 0, .045, .22).cyl('glassP', 0, .26, 0, .018, .09); } },
      toolbox: { r: .22, h: .22, mass: 3, build: p => { p.box('red', 0, .1, 0, .45, .2, .2).box('dark', 0, .23, 0, .25, .04, .03); } },
      can: { r: .05, h: .13, mass: .3, build: p => { p.cyl('red', 0, .06, 0, .035, .12); } },
      chair: { r: .3, h: 1.0, mass: 5, build: p => K.props.chair(p, r) },
      helmet: { r: .16, h: .25, mass: 1, build: p => { p.sph('white', 0, .14, 0, .3, .28, .32).box('glassP', 0, .14, .13, .22, .12, .06); } },
      redcan: { r: .27, h: .9, mass: 30, explosive: true, build: p => { p.cyl('red', 0, .45, 0, .26, .9).cyl('hazard', 0, .6, 0, .265, .14).cyl('dark', 0, .92, 0, .08, .06); } },
    };
    K.physDefs = physDefs;
    function makePhys(type, x, z, rot) {
      const def = physDefs[type];
      const B = new K.Builder();
      const fake = { B: () => B, addCollider() { }, spots: [], addFixture() { return -1; } };
      def.build(new K.Put(fake, 0, 0, 0));
      const g = new THREE.Group();
      for (const m of B.build(M)) { m.matrixAutoUpdate = true; g.add(m); W.bakeTargets.push(m); }
      g.position.set(x, 0, z); g.rotation.y = rot;
      root.add(g); chunkAt(x, z).objs.push(g);
      W.phys.push({ type, def, obj: g, x, y: 0, z, vx: 0, vy: 0, vz: 0, spin: 0, rest: true, hp: def.explosive ? 20 : 1 });
    }

    // ------------------------------------------------ furnishing
    for (const room of L.rooms) {
      ctx.spots = W.spotsByRoom[room.id];
      room.furn = K.furnish(room, ctx);
    }
    ctx.spots = [];
    if (K.detailPass) K.detailPass(W, ctx);
    if (K.horrorDress) K.horrorDress(W, ctx);

    // ------------------------------------------------ build meshes
    for (const c of chunks.values()) {
      c.meshes = c.B.build(M);
      c.group = new THREE.Group(); root.add(c.group);
      for (const m of c.meshes) { m.updateMatrix(); c.group.add(m); }
      c.B = null;
    }

    // ------------------------------------------------ lighting bake
    const fixHash = new Map();
    for (const f of W.fixtures) {
      if (!f.range) continue;
      const rc = Math.ceil(f.range / S);
      const fi = Math.floor(f.x / S), fj = Math.floor(f.z / S);
      for (let j = fj - rc; j <= fj + rc; j++) for (let i = fi - rc; i <= fi + rc; i++) {
        if (i < 0 || j < 0 || i >= GW || j >= GH) continue; const c = j * GW + i; if (!L.kind[c]) continue;
        let a = fixHash.get(c); if (!a) fixHash.set(c, a = []); a.push(f.id);
      }
    }
    W.fixHash = fixHash;
    const losCache = new Map();
    function visible(f, c) {
      const key = f.id * 16384 + c; let v = losCache.get(key);
      if (v === undefined) { const [x, z] = L.cellCenter(c); v = L.los(f.x, f.z, x, z, true) ? 1 : 0; losCache.set(key, v); }
      return v;
    }
    W.fixOn = f => {
      if (f.broken || f.kind === 'none') return false;
      if (f.kind === 'emerg' || f.kind === 'screen') return true;
      return f.level <= W.poweredLevel;
    };
    const areaFill = new Float32Array(L.areas.length * 3);
    W.computeFill = () => {
      areaFill.fill(0);
      for (const f of W.fixtures) if (W.fixOn(f) && f.area >= 0 && f.kind !== 'screen') { const k = f.area * 3, n = Math.sqrt(L.areas[f.area].cells.length) + 1, s = f.int * .022 / n; areaFill[k] += f.c[0] * s; areaFill[k + 1] += f.c[1] * s; areaFill[k + 2] += f.c[2] * s; }
    };
    const amb = st ? [.0035, .0034, .004] : [.0026, .003, .0042];
    W.light = function (px, py, pz, nx, ny, nz, out) {
      const c = L.cellOf(px + nx * .2, pz + nz * .2);
      out[0] = amb[0]; out[1] = amb[1]; out[2] = amb[2];
      if (c < 0 || !L.kind[c]) return out;
      const ar = L.area[c];
      out[0] += areaFill[ar * 3]; out[1] += areaFill[ar * 3 + 1]; out[2] += areaFill[ar * 3 + 2];
      const list = fixHash.get(c); if (!list) return out;
      for (const id of list) {
        const f = W.fixtures[id]; if (!W.fixOn(f)) continue;
        const dx = f.x - px, dy = f.y - py, dz = f.z - pz, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > f.range * f.range) continue;
        if (f.area !== ar && !visible(f, c)) continue;
        const d = Math.sqrt(d2) + 1e-4, ndl = (dx * nx + dy * ny + dz * nz) / d;
        if (ndl < -.3) continue;
        const w = Math.max(0, ndl * .8 + .2), at = (1 - d / f.range) ** 2 * w * f.int;
        out[0] += f.c[0] * at; out[1] += f.c[1] * at; out[2] += f.c[2] * at;
      }
      return out;
    };
    const tmp = [0, 0, 0];
    function bakeGeo(geo, matrix) {
      const P = geo.attributes.position.array, N = geo.attributes.normal.array, Bk = geo.attributes.bake.array, fid = geo.userData.fid;
      const lamp = geo.userData.key === 'lamp';
      const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = matrix ? new THREE.Matrix3().getNormalMatrix(matrix) : null;
      for (let i = 0, k = 0; i < P.length; i += 3, k++) {
        if (lamp && fid && fid[k] >= 0) {
          const f = W.fixtures[fid[k]], on = W.fixOn(f), s = on ? (f.kind === 'emerg' ? 5 : 4) : .015;
          Bk[i] = f.c[0] * s; Bk[i + 1] = f.c[1] * s; Bk[i + 2] = f.c[2] * s; continue;
        }
        v.set(P[i], P[i + 1], P[i + 2]); n.set(N[i], N[i + 1], N[i + 2]);
        if (matrix) { v.applyMatrix4(matrix); n.applyMatrix3(nm).normalize(); }
        W.light(v.x, v.y, v.z, n.x, n.y, n.z, tmp);
        Bk[i] = tmp[0]; Bk[i + 1] = tmp[1]; Bk[i + 2] = tmp[2];
      }
      geo.attributes.bake.needsUpdate = true;
    }
    W.bakeMesh = function (m) {
      const g = m.geometry;
      if (!g.attributes.bake) g.setAttribute('bake', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
      m.updateWorldMatrix(true, false);
      bakeGeo(g, m.matrixWorld);
    };
    W.bakeChunk = function (c) { for (const m of c.meshes) if (m.geometry.attributes.bake) bakeGeo(m.geometry, null); };
    W.bakeAll = function () {
      W.computeFill();
      for (const c of chunks.values()) W.bakeChunk(c);
      root.updateMatrixWorld(true);
      for (const m of W.bakeTargets) W.bakeMesh(m);
      W.updateHalos();
    };

    // ------------------------------------------------ light halos (fake bloom)
    const haloMat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 500 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: 'uniform float scale; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(scale * 0.9 / -mv.z, 0.0, 90.0); vC *= clamp(-mv.z / 3.0, 0.0, 1.0) * exp(-0.035 * -mv.z); }',
      fragmentShader: 'varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard; float a = pow(1.0 - r, 2.2); gl_FragColor = vec4(vC * a, 1.0); }',
    });
    W.haloMat = haloMat;
    const haloByChunk = new Map();
    for (const f of W.fixtures) if (f.kind === 'main' || f.kind === 'emerg') { let a = haloByChunk.get(f.chunk); if (!a) haloByChunk.set(f.chunk, a = []); a.push(f); }
    for (const [k, list] of haloByChunk) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(list.flatMap(f => [f.x, f.y - .12, f.z]), 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(list.length * 3), 3));
      const pts = new THREE.Points(g, haloMat); pts.frustumCulled = true; g.computeBoundingSphere();
      const c = chunks.get(k); if (c) { c.group.add(pts); c.halo = { pts, list }; list.forEach((f, i) => { f.halo = c.halo; f.hi = i; }); }
    }
    W.updateHalos = function () {
      for (const c of chunks.values()) if (c.halo) {
        const col = c.halo.pts.geometry.attributes.color;
        c.halo.list.forEach((f, i) => { const on = W.fixOn(f), s = on ? (f.kind === 'emerg' ? .5 : .32) : 0; col.setXYZ(i, f.c[0] * s, f.c[1] * s, f.c[2] * s); });
        col.needsUpdate = true;
      }
    };
    W.setHalo = function (f, s) { if (!f.halo) return; const col = f.halo.pts.geometry.attributes.color; col.setXYZ(f.hi, f.c[0] * s, f.c[1] * s, f.c[2] * s); col.needsUpdate = true; };
    return W;
  };
})();
