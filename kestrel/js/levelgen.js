// Kestrel — level generation (pure data, no Three.js). Grid of cells with explicit edge walls.
// Edge codes: 0 open, 1 wall, 2 window, >=3 door (index = code-3).
(function () {
  const K = (typeof window !== 'undefined' ? window : globalThis).K = (typeof window !== 'undefined' ? window : globalThis).K || {};
  const S = 2.5;

  // Room definitions: label shown on signs/map, default height
  K.ROOMDEF = {
    // station
    medbay: { name: 'Medical Bay' }, reactor: { name: 'Reactor Control', h: 6 }, security: { name: 'Security Office' },
    admin: { name: 'Administration' }, docking: { name: 'Docking Ring', h: 7 }, save: { name: 'Emergency Shelter' },
    quarters: { name: 'Crew Quarters' }, mess: { name: 'Mess Hall' }, lab: { name: 'Research Lab' }, storage: { name: 'Storage' },
    hydro: { name: 'Hydroponics', h: 5 }, server: { name: 'Data Core' }, office: { name: 'Offices' }, observation: { name: 'Observation Deck', h: 4.5 },
    cryo: { name: 'Cryo Ward' }, atrium: { name: 'Concourse', h: 9 }, airlock: { name: 'Airlock' }, maint: { name: 'Maintenance' },
    // cruiser
    dock: { name: 'Boarding Airlock' }, engineering: { name: 'Engineering', h: 6.5 }, barracks: { name: 'Officer Berths' },
    captain: { name: "Captain's Quarters" }, bridge: { name: 'Bridge', h: 4.5 }, hangar: { name: 'Shuttle Bay', h: 7 },
    armory: { name: 'Armory' }, comms: { name: 'Comms' }, cargo: { name: 'Cargo Hold', h: 6 }, galley: { name: 'Galley' },
  };

  function makeGrid(W, H) {
    const N = W * H;
    return { W, H, N, kind: new Uint8Array(N), roomOf: new Int16Array(N).fill(-1), area: new Int16Array(N).fill(-1), sector: new Int8Array(N).fill(-1), eE: new Int16Array(N), eS: new Int16Array(N), ext: new Uint8Array(N) };
  }

  // binary heap for A*
  class Heap { constructor() { this.a = []; this.p = []; }
    push(v, pr) { const a = this.a, p = this.p; a.push(v); p.push(pr); let i = a.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (p[q] <= p[i]) break; [a[q], a[i]] = [a[i], a[q]];[p[q], p[i]] = [p[i], p[q]]; i = q; } }
    pop() { const a = this.a, p = this.p, top = a[0], la = a.pop(), lp = p.pop(); if (a.length) { a[0] = la; p[0] = lp; let i = 0; for (; ;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && p[l] < p[m]) m = l; if (r < a.length && p[r] < p[m]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]];[p[m], p[i]] = [p[i], p[m]]; i = m; } } return top; }
    get size() { return this.a.length; } }
  K.Heap = Heap;

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function tryGen(cfg, seed) {
    const r = K.rng(seed), W = cfg.W, H = cfg.H, G = makeGrid(W, H);
    const idx = (i, j) => j * W + i;
    const inb = (i, j) => i > 0 && j > 0 && i < W - 1 && j < H - 1;
    const mask = (i, j) => inb(i, j) && cfg.mask(i, j);
    const rooms = [];
    const doorEdges = new Map(); // edgeId -> {c1,c2,bulk}
    const edgeId = (i, j, i2, j2) => i2 !== i ? idx(Math.min(i, i2), j) * 2 : idx(i, Math.min(j, j2)) * 2 + 1;

    function addRoom(x, y, w, h, extra) {
      const room = Object.assign({ id: rooms.length, x, y, w, h, cx: x + w / 2, cy: y + h / 2, type: null, doors: [], cells: w * h }, extra || {});
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { G.kind[idx(i, j)] = 1; G.roomOf[idx(i, j)] = room.id; }
      rooms.push(room); return room;
    }
    function carve(i, j) { if (mask(i, j) && G.kind[idx(i, j)] === 0) G.kind[idx(i, j)] = 2; }
    function canPlace(x, y, w, h) {
      for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + w; i++) {
        if (i < 0 || j < 0 || i >= W || j >= H) return false;
        const inside = i >= x && j >= y && i < x + w && j < y + h;
        const k = G.kind[idx(i, j)];
        if (inside) { if (!mask(i, j) || k !== 0) return false; }
        else if (k === 1) return false;
      }
      return true;
    }
    const ctx = { G, r, W, H, idx, mask, addRoom, carve, canPlace, rooms };
    if (cfg.precarve) cfg.precarve(ctx);

    // place rooms
    for (let t = 0; t < cfg.roomTries; t++) {
      const big = r.chance(cfg.bigChance || .08);
      const w = big ? r.int(7, 11) : r.int(3, 7), h = big ? r.int(7, 10) : r.int(3, 6);
      const ww = r.chance(.5) ? w : h, hh = ww === w ? h : w;
      const x = r.int(1, W - ww - 1), y = r.int(1, H - hh - 1);
      if (canPlace(x, y, ww, hh)) addRoom(x, y, ww, hh);
    }
    if (rooms.length < cfg.minRooms) return null;

    // ---- corridors via A* between rooms (MST + extras)
    function perimeterDoor(room, side) {
      const c = [];
      if (side === 0 || side === 1) { // E / W
        const i = side === 0 ? room.x + room.w - 1 : room.x, io = side === 0 ? i + 1 : i - 1;
        for (let j = room.y + (room.h > 2 ? 1 : 0); j < room.y + room.h - (room.h > 2 ? 1 : 0); j++) if (mask(io, j) && G.kind[idx(io, j)] !== 1) c.push([i, j, io, j]);
      } else {
        const j = side === 2 ? room.y + room.h - 1 : room.y, jo = side === 2 ? j + 1 : j - 1;
        for (let i = room.x + (room.w > 2 ? 1 : 0); i < room.x + room.w - (room.w > 2 ? 1 : 0); i++) if (mask(i, jo) && G.kind[idx(i, jo)] !== 1) c.push([i, j, i, jo]);
      }
      if (!c.length) return null;
      // prefer near the middle of the wall
      c.sort((a, b) => (Math.abs(a[0] - room.cx) + Math.abs(a[1] - room.cy)) - (Math.abs(b[0] - room.cx) + Math.abs(b[1] - room.cy)));
      return c[Math.min(c.length - 1, Math.floor(r() * Math.min(3, c.length)))];
    }
    function sidesToward(a, b) {
      const dx = b.cx - a.cx, dy = b.cy - a.cy;
      const pri = Math.abs(dx) > Math.abs(dy) ? [dx > 0 ? 0 : 1, dy > 0 ? 2 : 3] : [dy > 0 ? 2 : 3, dx > 0 ? 0 : 1];
      return pri.concat([0, 1, 2, 3].filter(s => !pri.includes(s)));
    }
    function astar(si, sj, ti, tj) {
      const start = idx(si, sj), goal = idx(ti, tj);
      const g = new Float32Array(W * H).fill(1e9), from = new Int32Array(W * H).fill(-1), dirOf = new Int8Array(W * H).fill(-1);
      const h = new Heap(); g[start] = 0; h.push(start, 0);
      while (h.size) {
        const c = h.pop(); if (c === goal) break;
        const ci = c % W, cj = (c / W) | 0;
        for (let d = 0; d < 4; d++) {
          const ni = ci + DIRS[d][0], nj = cj + DIRS[d][1];
          if (!mask(ni, nj)) continue;
          const n = idx(ni, nj), k = G.kind[n];
          if (k === 1) continue;
          let cost = k === 2 ? .35 : 1;
          if (dirOf[c] !== -1 && dirOf[c] !== d) cost += .7;
          const ng = g[c] + cost;
          if (ng < g[n]) { g[n] = ng; from[n] = c; dirOf[n] = d; h.push(n, ng + (Math.abs(ni - ti) + Math.abs(nj - tj)) * .35); }
        }
      }
      if (g[goal] >= 1e9) return null;
      const path = []; for (let c = goal; c !== -1; c = from[c]) path.push(c);
      return path;
    }
    function addDoor(room, d) { const id = edgeId(d[0], d[1], d[2], d[3]); if (!doorEdges.has(id)) { doorEdges.set(id, { c1: idx(d[0], d[1]), c2: idx(d[2], d[3]) }); room.doorCount = (room.doorCount || 0) + 1; } }
    function connect(a, b) {
      for (const sa of sidesToward(a, b).slice(0, 3)) {
        const da = perimeterDoor(a, sa); if (!da) continue;
        for (const sb of sidesToward(b, a).slice(0, 3)) {
          const db = perimeterDoor(b, sb); if (!db) continue;
          const path = astar(da[2], da[3], db[2], db[3]);
          if (!path) continue;
          for (const c of path) carve(c % W, (c / W) | 0);
          addDoor(a, da); addDoor(b, db);
          return true;
        }
      }
      return false;
    }
    // Prim MST on room centres
    const n = rooms.length, inT = new Uint8Array(n), best = new Float32Array(n).fill(1e9), par = new Int32Array(n).fill(-1);
    const dist = (a, b) => Math.hypot(a.cx - b.cx, a.cy - b.cy);
    best[0] = 0; const mst = [];
    for (let k = 0; k < n; k++) {
      let u = -1; for (let v = 0; v < n; v++) if (!inT[v] && (u < 0 || best[v] < best[u])) u = v;
      inT[u] = 1; if (par[u] >= 0) mst.push([par[u], u]);
      for (let v = 0; v < n; v++) if (!inT[v]) { const d = dist(rooms[u], rooms[v]); if (d < best[v]) { best[v] = d; par[v] = u; } }
    }
    // rooms touching pre-carved corridors get a direct door first (cheap, natural)
    for (const room of rooms) {
      if (room.noAutoDoor) continue;
      const opts = [];
      for (let s = 0; s < 4; s++) {
        for (let j = room.y; j < room.y + room.h; j++) for (let i = room.x; i < room.x + room.w; i++) {
          const onEdge = (s === 0 && i === room.x + room.w - 1) || (s === 1 && i === room.x) || (s === 2 && j === room.y + room.h - 1) || (s === 3 && j === room.y);
          if (!onEdge) continue;
          const io = i + DIRS[s][0], jo = j + DIRS[s][1];
          if (mask(io, jo) && G.kind[idx(io, jo)] === 2) opts.push([i, j, io, jo]);
        }
      }
      if (opts.length && (room.hub || r.chance(.75))) { addDoor(room, r.pick(opts)); if (room.hub) for (let k = 0; k < 3; k++) addDoor(room, r.pick(opts)); }
    }
    for (const [a, b] of mst) connect(rooms[a], rooms[b]);
    // extra loops for multiple routes (important for stalking/evasion)
    for (let k = 0; k < Math.floor(n * (cfg.loops || .3)); k++) {
      const a = r.int(0, n - 1); let bi = -1, bd = 1e9;
      for (let v = 0; v < n; v++) if (v !== a) { const d = dist(rooms[a], rooms[v]) * r.range(.8, 1.6); if (d < bd && d > 4) { bd = d; bi = v; } }
      if (bi >= 0) connect(rooms[a], rooms[bi]);
    }
    for (const room of rooms) if (!room.doorCount) return null;

    // ---- sectors (Voronoi from far-apart room seeds)
    const nonvoid = []; for (let c = 0; c < W * H; c++) if (G.kind[c]) nonvoid.push(c);
    const startRoom = rooms.slice().sort((a, b) => cfg.startScore(b, ctx) - cfg.startScore(a, ctx))[0];
    const seeds = cfg.sectorSeeds ? cfg.sectorSeeds(ctx, startRoom) : (() => {
      const s = [startRoom];
      while (s.length < cfg.sectors) {
        let bestR = null, bd = -1;
        for (const rm of rooms) { const d = Math.min(...s.map(q => dist(q, rm))); if (d > bd) { bd = d; bestR = rm; } }
        s.push(bestR);
      }
      return s.map(q => [q.cx, q.cy]);
    })();
    for (const c of nonvoid) {
      const ci = c % W + .5, cj = ((c / W) | 0) + .5; let bs = 0, bd = 1e9;
      seeds.forEach((s, k) => { const d = (s[0] - ci) ** 2 + (s[1] - cj) ** 2; if (d < bd) { bd = d; bs = k; } });
      G.sector[c] = bs;
    }
    for (const room of rooms) {
      room.sector = G.sector[idx(Math.floor(room.cx), Math.floor(room.cy))];
      for (let j = room.y; j < room.y + room.h; j++) for (let i = room.x; i < room.x + room.w; i++) G.sector[idx(i, j)] = room.sector;
    }
    // ---- areas: rooms, then corridor components per sector
    const areas = rooms.map(rm => ({ id: rm.id, isRoom: true, room: rm, sector: rm.sector, cells: [] }));
    for (let c = 0; c < W * H; c++) if (G.kind[c] === 1) { G.area[c] = G.roomOf[c]; areas[G.roomOf[c]].cells.push(c); }
    for (const c0 of nonvoid) {
      if (G.kind[c0] !== 2 || G.area[c0] >= 0) continue;
      const a = { id: areas.length, isRoom: false, sector: G.sector[c0], cells: [] }; areas.push(a);
      const st = [c0]; G.area[c0] = a.id;
      while (st.length) {
        const c = st.pop(); a.cells.push(c);
        const ci = c % W, cj = (c / W) | 0;
        for (const [dx, dy] of DIRS) { const nn = idx(ci + dx, cj + dy); if (G.kind[nn] === 2 && G.area[nn] < 0 && G.sector[nn] === a.sector) { G.area[nn] = a.id; st.push(nn); } }
      }
    }
    // ---- edges & doors
    const doors = [];
    function mkDoor(c1, c2, bulk) {
      const i1 = c1 % W, j1 = (c1 / W) | 0, i2 = c2 % W, j2 = (c2 / W) | 0;
      const ori = i1 !== i2 ? 'E' : 'S';
      const ci = Math.min(i1, i2), cj = Math.min(j1, j2);
      const d = { id: doors.length, i: ci, j: cj, ori, c1: idx(ci, cj), c2: ori === 'E' ? idx(ci + 1, cj) : idx(ci, cj + 1), bulk: !!bulk, req: 0 };
      d.a1 = G.area[d.c1]; d.a2 = G.area[d.c2];
      d.x = ori === 'E' ? (ci + 1) * S : (ci + .5) * S; d.z = ori === 'E' ? (cj + .5) * S : (cj + 1) * S;
      doors.push(d); return 3 + d.id;
    }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const c = idx(i, j);
      for (const [dx, dy, arr] of [[1, 0, G.eE], [0, 1, G.eS]]) {
        const ni = i + dx, nj = j + dy; if (ni >= W || nj >= H) continue;
        const nc = idx(ni, nj), k1 = G.kind[c], k2 = G.kind[nc];
        if (!k1 && !k2) continue;
        if (!k1 || !k2) { arr[c] = 1; continue; }
        if (G.area[c] === G.area[nc]) { arr[c] = 0; continue; }
        const eid = edgeId(i, j, ni, nj);
        if (doorEdges.has(eid)) { arr[c] = mkDoor(c, nc, false); continue; }
        if (k1 === 2 && k2 === 2) { arr[c] = mkDoor(c, nc, true); continue; }
        arr[c] = 1;
      }
    }
    // exterior void flood
    { const st = []; for (let i = 0; i < W; i++) { st.push(idx(i, 0), idx(i, H - 1)); } for (let j = 0; j < H; j++) { st.push(idx(0, j), idx(W - 1, j)); }
      while (st.length) { const c = st.pop(); if (G.kind[c] || G.ext[c]) continue; G.ext[c] = 1; const ci = c % W, cj = (c / W) | 0; for (const [dx, dy] of DIRS) { const ni = ci + dx, nj = cj + dy; if (ni >= 0 && nj >= 0 && ni < W && nj < H) st.push(idx(ni, nj)); } } }

    // ---- sector graph & levels
    const adjA = areas.map(() => []);
    for (const d of doors) { adjA[d.a1].push([d.a2, d]); adjA[d.a2].push([d.a1, d]); }
    const nS = seeds.length, adjS = Array.from({ length: nS }, () => new Set());
    for (const d of doors) { const s1 = areas[d.a1].sector, s2 = areas[d.a2].sector; if (s1 !== s2) { adjS[s1].add(s2); adjS[s2].add(s1); } }
    const depth = new Array(nS).fill(-1); depth[startRoom.sector] = 0; { const q = [startRoom.sector]; while (q.length) { const s = q.shift(); for (const t of adjS[s]) if (depth[t] < 0) { depth[t] = depth[s] + 1; q.push(t); } } }
    if (depth.some(d => d < 0)) return null;
    const maxL = cfg.levels;
    if (Math.max(...depth) < maxL) return null;
    for (const a of areas) a.level = Math.min(depth[a.sector], maxL);
    for (const d of doors) { const l1 = areas[d.a1].level, l2 = areas[d.a2].level; d.req = l1 !== l2 ? Math.max(l1, l2) : 0; }

    function reach(have, extraLock) {
      const dist = new Int32Array(areas.length).fill(-1); dist[startRoom.id] = 0; const q = [startRoom.id];
      while (q.length) { const a = q.shift(); for (const [b, d] of adjA[a]) { if (dist[b] >= 0 || d.req > have || (extraLock && extraLock(d))) continue; dist[b] = dist[a] + 1; q.push(b); } }
      return dist;
    }
    startRoom.special = 'start'; startRoom.type = cfg.startType;
    const keyRooms = {};
    for (let L = 1; L <= maxL; L++) {
      const R = reach(L - 1);
      let cand = rooms.filter(rm => R[rm.id] >= 0 && !rm.special && areas[rm.id].level === L - 1 && rm.cells >= 9);
      if (!cand.length) cand = rooms.filter(rm => R[rm.id] >= 0 && !rm.special && rm.cells >= 6);
      if (!cand.length) return null;
      cand.sort((a, b) => R[b.id] - R[a.id] + (r() - .5) * 2);
      const kr = cand[0]; kr.special = 'key' + L; kr.type = cfg.keyTypes[L - 1]; keyRooms[L] = kr;
    }
    const Rall = reach(maxL);
    if (areas.some(a => Rall[a.id] < 0)) return null;
    let goals = rooms.filter(rm => !rm.special && areas[rm.id].level === maxL && rm.cells >= (cfg.goalMin || 16));
    if (cfg.goalFilter) { const f = goals.filter(rm => cfg.goalFilter(rm, ctx)); if (f.length) goals = f; }
    if (!goals.length) return null;
    goals.sort((a, b) => Rall[b.id] - Rall[a.id]);
    const goalRoom = goals[0]; goalRoom.special = 'goal'; goalRoom.type = cfg.goalType;
    let shuttleRoom = null;
    if (cfg.shuttle) {
      const cands = rooms.filter(rm => !rm.special && rm.cells >= 20 && areas[rm.id].level >= 1).sort((a, b) => Math.hypot(b.cx - goalRoom.cx, b.cy - goalRoom.cy) - Math.hypot(a.cx - goalRoom.cx, a.cy - goalRoom.cy));
      for (const c of cands) {
        const lock = d => d.a1 === c.id || d.a2 === c.id;
        const R2 = reach(maxL, lock);
        if (areas.every(a => a.id === c.id || R2[a.id] >= 0)) { shuttleRoom = c; break; }
      }
      if (!shuttleRoom) return null;
      shuttleRoom.special = 'shuttle'; shuttleRoom.type = 'hangar';
      for (const d of doors) if (d.a1 === shuttleRoom.id || d.a2 === shuttleRoom.id) d.req = 4;
    }
    for (const d of doors) { d.locked = d.req > 0; d.open = 0; }
    // shelters: one per level, smallish rooms
    const saveRooms = [];
    for (let L = 0; L <= maxL; L++) {
      const c = rooms.filter(rm => !rm.special && areas[rm.id].level === L && rm.cells >= 9 && rm.cells <= 25);
      if (!c.length) continue;
      const s = r.pick(c); s.special = 'save'; s.type = 'save'; saveRooms.push(s);
    }
    if (saveRooms.length < 2) return null;
    // the rest
    for (const rm of rooms) {
      if (rm.type) continue;
      const ext = touchesExterior(rm);
      rm.type = cfg.pickType(rm, r, ext);
    }
    function touchesExterior(rm) {
      for (let j = rm.y; j < rm.y + rm.h; j++) for (let i = rm.x; i < rm.x + rm.w; i++) for (const [dx, dy] of DIRS) { const ni = i + dx, nj = j + dy; if (ni >= 0 && nj >= 0 && ni < W && nj < H && G.ext[idx(ni, nj)]) return true; }
      return false;
    }
    // ---- heights
    for (const a of areas) {
      if (a.isRoom) { const def = K.ROOMDEF[a.room.type] || {}; a.height = def.h || (a.room.cells <= 12 ? 3.2 : a.room.cells <= 30 ? 3.6 : 4.6); if (a.room.hub) a.height = 9; }
      else a.height = 3.0;
    }
    // ---- windows on exterior edges
    const winTypes = cfg.windowTypes;
    const winChance = new Map();
    for (const a of areas) winChance.set(a.id, a.isRoom ? (winTypes.includes(a.room.type) ? 1 : (a.room.type === 'save' ? 0 : .25)) : .3);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const c = idx(i, j);
      for (const [dx, dy, arr, own] of [[1, 0, G.eE, true], [0, 1, G.eS, true], [-1, 0, G.eE, false], [0, -1, G.eS, false]]) {
        if (!G.kind[c]) continue;
        const ni = i + dx, nj = j + dy; const nc = idx(ni, nj);
        if (!G.ext[nc]) continue;
        const ec = own ? c : nc;
        const ch = winChance.get(G.area[c]);
        const run = ((dx ? j : i) >> 1) * 7919 + G.area[c] * 31;
        const pr = K.rng(run + seed)();
        if (pr < ch && (ch >= 1 ? ((dx ? j : i) % 3 !== 1 || pr < .5) : true)) arr[ec] = 2;
      }
    }
    // ---- vents (stalker travel network)
    const vents = [];
    for (const a of areas) {
      if (a.isRoom && a.room.type === 'save') continue;
      const want = a.isRoom ? (a.room.cells >= 12 ? 1 : (r.chance(.35) ? 1 : 0)) : Math.floor(a.cells.length / 14);
      for (let k = 0; k < want; k++) { const c = r.pick(a.cells); if (!vents.some(v => v.c === c)) vents.push({ c, i: c % W, j: (c / W) | 0, area: a.id }); }
    }
    if (vents.length < 8) return null;

    return { seed, W, H, S, theme: cfg.theme, G, kind: G.kind, area: G.area, sector: G.sector, eE: G.eE, eS: G.eS, ext: G.ext,
      rooms, areas, doors, startRoom, goalRoom, keyRooms, shuttleRoom, saveRooms, vents, maxL, nSectors: nS, sectorNames: cfg.sectorNames, levelDepth: depth };
  }

  K.genLevel = function (cfg) {
    for (let k = 0; k < 60; k++) { const L = tryGen(cfg, cfg.seed + k * 7919); if (L) { L.attempts = k + 1; K.attachQueries(L); return L; } }
    throw new Error('Level generation failed for seed ' + cfg.seed);
  };

  // ---------------------------------------------------------- spatial queries
  K.attachQueries = function (L) {
    const W = L.W, H = L.H, eE = L.eE, eS = L.eS;
    L.idx = (i, j) => j * W + i;
    L.cellOf = (x, z) => { const i = Math.floor(x / S), j = Math.floor(z / S); return (i < 0 || j < 0 || i >= W || j >= H) ? -1 : j * W + i; };
    L.areaAt = (x, z) => { const c = L.cellOf(x, z); return c < 0 ? -1 : L.area[c]; };
    L.edge = (i, j, di, dj) => {
      if (di === 1) return i < W - 1 ? eE[j * W + i] : 1;
      if (di === -1) return i > 0 ? eE[j * W + i - 1] : 1;
      if (dj === 1) return j < H - 1 ? eS[j * W + i] : 1;
      return j > 0 ? eS[(j - 1) * W + i] : 1;
    };
    L.doorOf = e => e >= 3 ? L.doors[e - 3] : null;
    // sight blocking: walls; doors when mostly closed; windows are transparent
    const blocksSight = (e, doorsOpen) => e === 1 || (e >= 3 && !doorsOpen && L.doors[e - 3].open < .55);
    L.los = function (x0, z0, x1, z1, doorsOpen) {
      let i = Math.floor(x0 / S), j = Math.floor(z0 / S); const ie = Math.floor(x1 / S), je = Math.floor(z1 / S);
      const dx = x1 - x0, dz = z1 - z0, si = Math.sign(dx), sj = Math.sign(dz);
      let tX = dx ? ((si > 0 ? (i + 1) * S : i * S) - x0) / dx : Infinity, tZ = dz ? ((sj > 0 ? (j + 1) * S : j * S) - z0) / dz : Infinity;
      const dX = dx ? S / Math.abs(dx) : Infinity, dZ = dz ? S / Math.abs(dz) : Infinity;
      for (let n = 0; n < 400; n++) {
        if (i === ie && j === je) return true;
        if (i < 0 || j < 0 || i >= W || j >= H) return false;
        if (tX < tZ) { if (tX > 1) return true; const e = si > 0 ? (i < W - 1 ? eE[j * W + i] : 1) : (i > 0 ? eE[j * W + i - 1] : 1); if (blocksSight(e, doorsOpen)) return false; i += si; tX += dX; }
        else { if (tZ > 1) return true; const e = sj > 0 ? (j < H - 1 ? eS[j * W + i] : 1) : (j > 0 ? eS[(j - 1) * W + i] : 1); if (blocksSight(e, doorsOpen)) return false; j += sj; tZ += dZ; }
      }
      return true;
    };
    // distance along a ray to the first blocking edge (for hitscan); returns t in metres
    L.rayN = [0, 0];
    L.rayWall = function (x0, z0, dx, dz, maxD, passWindows) {
      L.rayHit = 0;
      let i = Math.floor(x0 / S), j = Math.floor(z0 / S);
      const si = Math.sign(dx), sj = Math.sign(dz);
      let tX = dx ? ((si > 0 ? (i + 1) * S : i * S) - x0) / dx : Infinity, tZ = dz ? ((sj > 0 ? (j + 1) * S : j * S) - z0) / dz : Infinity;
      const dX = dx ? S / Math.abs(dx) : Infinity, dZ = dz ? S / Math.abs(dz) : Infinity;
      const blocks = e => e === 1 || (e === 2 && !passWindows) || (e >= 3 && L.doors[e - 3].open < .7);
      for (let n = 0; n < 400; n++) {
        if (i < 0 || j < 0 || i >= W || j >= H) return Math.min(tX, tZ);
        if (tX < tZ) { if (tX > maxD) return maxD; const e = si > 0 ? (i < W - 1 ? eE[j * W + i] : 1) : (i > 0 ? eE[j * W + i - 1] : 1); if (blocks(e)) { L.rayN[0] = -si; L.rayN[1] = 0; L.rayHit = e; return tX; } i += si; tX += dX; }
        else { if (tZ > maxD) return maxD; const e = sj > 0 ? (j < H - 1 ? eS[j * W + i] : 1) : (j > 0 ? eS[(j - 1) * W + i] : 1); if (blocks(e)) { L.rayN[0] = 0; L.rayN[1] = -sj; L.rayHit = e; return tZ; } j += sj; tZ += dZ; }
      }
      return maxD;
    };
    // can an agent walk from cell c in direction d? (doors: unlocked ones count as passable)
    L.passable = function (c, di, dj, canUseLocked) {
      const i = c % W, j = (c / W) | 0, e = L.edge(i, j, di, dj);
      if (e === 0) return true; if (e < 3) return false;
      const d = L.doors[e - 3]; return canUseLocked || !d.locked;
    };
    L.path = function (x0, z0, x1, z1, canUseLocked, avoid) {
      const s = L.cellOf(x0, z0), g = L.cellOf(x1, z1);
      if (s < 0 || g < 0 || !L.kind[s] || !L.kind[g]) return null;
      if (s === g) return [[x1, z1]];
      const gs = new Float32Array(W * H).fill(1e9), from = new Int32Array(W * H).fill(-1), h = new K.Heap();
      gs[s] = 0; h.push(s, 0); const gi = g % W, gj = (g / W) | 0; let it = 0;
      while (h.size && it++ < 6000) {
        const c = h.pop(); if (c === g) break;
        const ci = c % W, cj = (c / W) | 0;
        for (const [dx, dy] of DIRS) {
          if (!L.passable(c, dx, dy, canUseLocked)) continue;
          const n = c + dx + dy * W, ng = gs[c] + 1;
          if (avoid && avoid.has(L.area[n]) && !avoid.has(L.area[c])) continue;
          if (ng < gs[n]) { gs[n] = ng; from[n] = c; h.push(n, ng + Math.abs(ci + dx - gi) + Math.abs(cj + dy - gj)); }
        }
      }
      if (gs[g] >= 1e9) return null;
      const cells = []; for (let c = g; c !== -1; c = from[c]) cells.push(c); cells.reverse();
      // string-pull with a widened LOS test so agents don't clip door jambs
      const pts = cells.map(c => [(c % W + .5) * S, (((c / W) | 0) + .5) * S]);
      pts[pts.length - 1] = [x1, z1];
      const out = []; let a = [x0, z0], k = 0;
      while (k < pts.length - 1) {
        let far = k;
        for (let m = pts.length - 1; m > k; m--) { if (L.wideLos(a[0], a[1], pts[m][0], pts[m][1])) { far = m; break; } }
        if (far === k) far = k + 1;
        out.push(pts[far]); a = pts[far]; k = far;
      }
      return out;
    };
    L.wideLos = function (x0, z0, x1, z1) {
      const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, px = -dz / l * .45, pz = dx / l * .45;
      return L.los(x0, z0, x1, z1, true) && L.los(x0 + px, z0 + pz, x1 + px, z1 + pz, true) && L.los(x0 - px, z0 - pz, x1 - px, z1 - pz, true) && L.losStrict(x0, z0, x1, z1);
    };
    // walls & windows block, doors ignored (they open), but path may not cross a door diagonally
    L.losStrict = function (x0, z0, x1, z1) {
      let i = Math.floor(x0 / S), j = Math.floor(z0 / S); const ie = Math.floor(x1 / S), je = Math.floor(z1 / S);
      const dx = x1 - x0, dz = z1 - z0, si = Math.sign(dx), sj = Math.sign(dz);
      let tX = dx ? ((si > 0 ? (i + 1) * S : i * S) - x0) / dx : Infinity, tZ = dz ? ((sj > 0 ? (j + 1) * S : j * S) - z0) / dz : Infinity;
      const dX = dx ? S / Math.abs(dx) : Infinity, dZ = dz ? S / Math.abs(dz) : Infinity;
      for (let n = 0; n < 400; n++) {
        if (i === ie && j === je) return true;
        if (tX < tZ) { if (tX > 1) return true; const e = si > 0 ? eE[j * W + i] : eE[j * W + i - 1]; if (e === 1 || e === 2) return false; if (e >= 3) { const d = L.doors[e - 3]; if (d.locked || Math.abs((j + .5) * S - (z0 + dz * tX)) > .55) return false; } i += si; tX += dX; }
        else { if (tZ > 1) return true; const e = sj > 0 ? eS[j * W + i] : eS[(j - 1) * W + i]; if (e === 1 || e === 2) return false; if (e >= 3) { const d = L.doors[e - 3]; if (d.locked || Math.abs((i + .5) * S - (x0 + dx * tZ)) > .55) return false; } j += sj; tZ += dZ; }
      }
      return true;
    };
    // BFS from cell c, returns distance map in cells (used for "near the player" spawning)
    L.bfs = function (c, maxD, canUseLocked) {
      const dist = new Int16Array(W * H).fill(-1); dist[c] = 0; const q = [c]; let h = 0;
      while (h < q.length) { const x = q[h++]; if (dist[x] >= maxD) continue; for (const [dx, dy] of DIRS) { if (!L.passable(x, dx, dy, canUseLocked)) continue; const n = x + dx + dy * W; if (dist[n] < 0) { dist[n] = dist[x] + 1; q.push(n); } } }
      return dist;
    };
    L.cellCenter = c => [(c % W + .5) * S, (((c / W) | 0) + .5) * S];
  };

  // ---------------------------------------------------------- map configs
  K.levelConfigs = {
    station: seed => ({
      theme: 'station', seed, W: 98, H: 98, roomTries: 3000, minRooms: 70, bigChance: .1, loops: .35, sectors: 10, levels: 3,
      mask: (i, j) => { const dx = i - 49, dy = j - 49, d = Math.hypot(dx, dy); return d < 46.5 || (Math.abs(dx) < 4 && Math.abs(dy) < 49) || (Math.abs(dy) < 4 && Math.abs(dx) < 49); },
      precarve(ctx) {
        const { addRoom, carve } = ctx;
        const hub = addRoom(44, 44, 11, 11, { hub: true, type: 'atrium', special: 'hub' });
        for (const rad of [17.5, 31.5, 43]) { // three ring corridors
          let last = null;
          for (let a = 0; a < Math.PI * 2; a += .002) {
            const i = Math.round(49.5 + Math.cos(a) * rad), j = Math.round(49.5 + Math.sin(a) * rad);
            if (last && last[0] !== i && last[1] !== j) carve(i, last[1]);
            carve(i, j); last = [i, j];
          }
        }
        // spokes from hub out to the rim, plus diagonal braces
        for (let k = 55; k < 96; k++) { carve(49, k); carve(k, 49); }
        for (let k = 2; k < 44; k++) { carve(49, k); carve(k, 49); }
        for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; for (let t = 10; t < 44; t += .3) { const i = Math.round(49.5 + Math.cos(a) * t), j = Math.round(49.5 + Math.sin(a) * t); carve(i, j); carve(i + 1, j); } }
        hub.noAutoDoor = false;
      },
      startScore: (rm) => (rm.special ? -1e9 : 0) + Math.hypot(rm.cx - 49, rm.cy - 49) - Math.abs(rm.cells - 20) * .6,
      startType: 'medbay', keyTypes: ['reactor', 'security', 'admin'], goalType: 'docking', goalMin: 14,
      goalFilter: (rm, ctx) => { // docking ring must sit on the hull
        const { G, idx, W, H } = ctx;
        for (let j = rm.y - 1; j <= rm.y + rm.h; j++) for (let i = rm.x - 1; i <= rm.x + rm.w; i++) if (i >= 0 && j >= 0 && i < W && j < H && G.ext[idx(i, j)]) return true;
        return false;
      },
      windowTypes: ['observation', 'docking', 'atrium', 'mess', 'hydro'],
      sectorNames: ['MEDICAL', 'HABITATION', 'ENGINEERING', 'SCIENCE', 'SECURITY', 'COMMERCE', 'LOGISTICS', 'HYDROPONICS', 'ARCHIVES', 'TRANSIT'],
      pickType(rm, r, ext) {
        if (ext && rm.cells >= 12 && r.chance(.45)) return 'observation';
        if (ext && rm.cells <= 9 && r.chance(.4)) return 'airlock';
        if (rm.cells <= 9) return r.pick(['storage', 'storage', 'office', 'server', 'maint', 'quarters']);
        if (rm.cells <= 24) return r.pick(['quarters', 'lab', 'office', 'cryo', 'server', 'storage', 'mess', 'maint', 'lab']);
        return r.pick(['mess', 'hydro', 'lab', 'cryo', 'storage', 'quarters']);
      },
    }),
    cruiser: seed => ({
      theme: 'cruiser', seed, W: 42, H: 182, roomTries: 2200, minRooms: 70, bigChance: .12, loops: .4, levels: 3, shuttle: true,
      mask: (i, j) => {
        const half = j < 40 ? 4 + (j / 40) * 15 : j > 160 ? 19 - Math.max(0, j - 168) * .6 : 17 + Math.sin(j * .07) * 1.5;
        return Math.abs(i + .5 - 21) < half;
      },
      precarve(ctx) { for (let j = 6; j < 176; j++) ctx.carve(21, j); for (let j = 46; j < 160; j++) { ctx.carve(10, j); ctx.carve(32, j); } for (const j of [46, 75, 104, 132, 159]) for (let i = 10; i <= 32; i++) ctx.carve(i, j); },
      startScore: (rm, ctx) => (rm.special ? -1e9 : 0) - Math.abs(rm.cy - 118) * 1.5 + (Math.abs(rm.cx - 21) > 10 ? 10 : 0) - Math.abs(rm.cells - 12),
      sectorSeeds: (ctx, sr) => [[sr.cx, sr.cy], [21, 160], [21, 90], [21, 62], [21, 34], [21, 12]],
      startType: 'dock', keyTypes: ['engineering', 'barracks', 'captain'], goalType: 'bridge', goalMin: 16,
      goalFilter: rm => rm.cy < 40,
      windowTypes: ['bridge', 'hangar', 'observation', 'galley'],
      sectorNames: ['MIDSHIPS', 'ENGINEERING', 'HABITAT DECK', 'OPERATIONS', 'COMMAND', 'FORWARD'],
      pickType(rm, r, ext) {
        if (ext && rm.cells <= 9 && r.chance(.35)) return 'airlock';
        if (rm.cells <= 9) return r.pick(['storage', 'comms', 'maint', 'armory', 'quarters']);
        if (rm.cells <= 24) return r.pick(['quarters', 'armory', 'medbay', 'galley', 'comms', 'storage', 'lab', 'maint']);
        return r.pick(['cargo', 'galley', 'cargo', 'medbay', 'quarters']);
      },
    }),
  };
})();
