// Dropfall — procedural mission maps.
'use strict';
(function () {
  const U = DF.U, W = DF.WORLD;
  const World = DF.World = {};

  function farFrom(list, x, y, d) { for (const p of list) if (U.dist2(p.x, p.y, x, y) < (d + (p.rr || 0)) ** 2) return false; return true; }
  function site(reserved, minD, edge, rr, tries) {
    edge = edge || 350;
    for (let i = 0; i < (tries || 400); i++) {
      const x = U.rand(edge, W - edge), y = U.rand(edge, W - edge);
      if (farFrom(reserved, x, y, minD)) { const s = { x, y, rr: rr || 0 }; reserved.push(s); return s; }
      if (i > 200) minD *= 0.97;
    }
    const s = { x: U.rand(edge, W - edge), y: U.rand(edge, W - edge), rr: rr || 0 }; reserved.push(s); return s;
  }

  function rockPts(n) { const a = []; for (let i = 0; i < n; i++) a.push(0.75 + Math.random() * 0.35); return a; }

  function makeObstacle(kind, x, y) {
    const o = { kind, x, y, seed: Math.random(), block: true, shape: 'c' };
    switch (kind) {
      case 'rock': case 'icerock': case 'basalt': o.r = U.rand(16, 46); o.pts = rockPts(9); break;
      case 'mesa': o.r = U.rand(70, 130); o.pts = rockPts(14); break;
      case 'bones': o.r = U.rand(14, 26); break;
      case 'tree': o.r = U.rand(12, 18); o.canopy = o.r * U.rand(2.4, 3.4); break;
      case 'pine': o.r = U.rand(10, 15); o.canopy = o.r * U.rand(2.2, 2.8); break;
      case 'deadtree': o.r = U.rand(8, 12); break;
      case 'crystal': o.r = U.rand(14, 36); o.pts = rockPts(6); break;
      case 'bush': o.r = U.rand(26, 48); o.block = false; o.cover = true; break;
      case 'lava': o.r = U.rand(40, 90); o.block = false; o.hazard = 'lava'; break;
      case 'pool': o.r = U.rand(50, 110); o.block = false; o.slowZone = 0.55; break;
      case 'crater': o.r = U.rand(40, 90); o.block = false; break;
      case 'building': o.shape = 'r'; o.w = U.rand(80, 170); o.h = U.rand(70, 150); o.x -= o.w / 2; o.y -= o.h / 2; break;
      case 'ruin': o.shape = 'r'; if (Math.random() < 0.5) { o.w = U.rand(90, 160); o.h = 16; } else { o.w = 16; o.h = U.rand(90, 160); } o.x -= o.w / 2; o.y -= o.h / 2; break;
      case 'wreck': o.shape = 'r'; o.w = U.rand(50, 80); o.h = U.rand(26, 36); o.x -= o.w / 2; o.y -= o.h / 2; break;
    }
    return o;
  }

  World.missionName = (type, f) => { const n = DF.MISSIONS[type].name; return typeof n === 'string' ? n : n[f]; };

  World.generate = function (opts) {
    const planet = opts.planet, biome = DF.BIOMES[planet.biome], diff = opts.diff;
    const faction = opts.faction || planet.f;
    const M = {
      planet, biome, biomeId: planet.biome, hazard: planet.hazard, faction, diff, type: opts.type,
      obs: [], structs: [], pois: [], outposts: [], objectives: [], side: [],
      grid: new U.StaticGrid(W, 200)
    };
    const reserved = [];

    // extraction
    const ex = site(reserved, 900, 400, 220);
    M.extract = { x: ex.x, y: ex.y, state: 'idle', t: 0, r: 90 };
    M.structs.push({ type: 'extract', x: ex.x, y: ex.y, r: 60 });

    // main objectives (a second one from difficulty 5)
    const types = [opts.type];
    if (diff >= 5) {
      const pool = ['purge', 'beacon', 'eliminate', 'rescue'].filter(t => t !== opts.type);
      types.push(U.pick(pool));
    }
    for (const t of types) {
      const s = site(reserved, 1000, 450, 260);
      M.objectives.push(World.makeObjective(M, t, s.x, s.y));
    }

    // enemy outposts (optional purge points)
    const nOut = Math.min(7, 2 + Math.floor(diff / 2));
    for (let i = 0; i < nOut; i++) {
      const s = site(reserved, 650, 300, 200);
      const size = i < 2 ? 'small' : U.pick(['small', 'medium', 'medium', 'large']);
      M.outposts.push(World.makeOutpost(M, s.x, s.y, size));
    }

    // side objectives
    const side = ['radar'];
    if (diff >= 3) side.push('jammer');
    if (diff >= 4) side.push('aa');
    if (diff >= 6) side.push('artillery');
    for (const k of side) {
      const s = site(reserved, 700, 350, 160);
      const st = { type: k, x: s.x, y: s.y, r: k === 'radar' ? 28 : 34, alive: true, side: true };
      if (k === 'jammer' || k === 'aa' || k === 'artillery') { st.hp = st.maxhp = k === 'artillery' ? 2600 : 1800; st.armor = 4; }
      if (k === 'radar') st.state = 'idle';
      if (k === 'artillery') st.fireT = 12;
      M.structs.push(st); M.side.push(st);
    }

    // points of interest: supply caches and sample spots
    const nPoi = 12 + Math.floor(diff / 2);
    for (let i = 0; i < nPoi; i++) {
      const s = site(reserved, 380, 250, 60);
      const roll = Math.random();
      let kind = roll < 0.30 ? 'cache' : roll < 0.62 ? 'samples' : roll < 0.74 ? 'shards' : roll < 0.86 ? 'medals' : 'credits';
      M.pois.push({ kind, x: s.x, y: s.y, found: false, looted: false });
    }
    if (diff >= 6) { const s = site(reserved, 500, 400, 80); M.pois.push({ kind: 'super', x: s.x, y: s.y, found: false, looted: false }); }

    // terrain obstacles
    const count = Math.floor(330 * biome.dens);
    for (let i = 0; i < count; i++) {
      const x = U.rand(40, W - 40), y = U.rand(40, W - 40);
      let ok = true;
      for (const r of reserved) { if (U.dist2(r.x, r.y, x, y) < (r.rr + 60) ** 2) { ok = false; break; } }
      if (!ok) continue;
      const o = makeObstacle(U.pick(biome.obs), x, y);
      M.obs.push(o);
    }
    // a little cover inside every outpost and objective site so fights have shape
    for (const r of reserved) {
      if (r.rr < 150) continue;
      for (let k = 0; k < 4; k++) {
        const a = Math.random() * Math.PI * 2, d = U.rand(r.rr * 0.55, r.rr * 0.9);
        const kind = M.biomeId === 'colony' ? 'ruin' : U.pick(['rock', 'wreck']);
        M.obs.push(makeObstacle(kind, r.x + Math.cos(a) * d, r.y + Math.sin(a) * d));
      }
    }
    // map edge walls
    M.edge = 30;
    for (const o of M.obs) M.grid.add(o);
    M.blockers = M.obs.filter(o => o.block);
    return M;
  };

  World.makeOutpost = function (M, x, y, size) {
    const n = size === 'small' ? 2 : size === 'medium' ? 3 : 5;
    const op = { x, y, size, r: size === 'large' ? 210 : 160, spawners: [], cleared: false, alert: false, id: M.outposts.length };
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6, d = n === 1 ? 0 : U.rand(50, op.r * 0.75);
      const sp = { type: 'spawner', faction: M.faction, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: size === 'large' && i === 0 ? 30 : 22, alive: true, spawnT: U.rand(2, 8), outpost: op };
      op.spawners.push(sp); M.structs.push(sp);
    }
    return op;
  };

  World.makeObjective = function (M, type, x, y) {
    const o = { type, x, y, done: false, failed: false, label: World.missionName(type, M.faction), progress: 0 };
    switch (type) {
      case 'eliminate': o.label = 'Eliminate the target'; break;
      case 'purge': {
        o.outpost = World.makeOutpost(M, x, y, 'large');
        o.outpost.main = true;
        const extra = Math.min(4, Math.floor(M.diff / 3));
        for (let i = 0; i < extra; i++) {
          const a = Math.random() * Math.PI * 2, d = U.rand(60, 180);
          const sp = { type: 'spawner', faction: M.faction, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: 22, alive: true, spawnT: U.rand(2, 8), outpost: o.outpost };
          o.outpost.spawners.push(sp); M.structs.push(sp);
        }
        M.outposts.push(o.outpost);
        o.label = World.missionName('purge', M.faction);
        break;
      }
      case 'beacon': {
        o.term = { type: 'terminal', x, y, r: 18, state: 'idle', obj: o, codes: null, holdT: 0, need: 50 + M.diff * 4 };
        M.structs.push(o.term);
        break;
      }
      case 'rescue': {
        const a = Math.random() * Math.PI * 2;
        o.shelter = { type: 'shelter', x, y, r: 40, state: 'closed', obj: o };
        o.shuttle = { type: 'shuttle', x: x + Math.cos(a) * 320, y: y + Math.sin(a) * 320, r: 40, obj: o };
        o.total = 12; o.need = 7; o.saved = 0; o.dead = 0; o.released = 0;
        M.structs.push(o.shelter, o.shuttle);
        break;
      }
      case 'blackbox': {
        o.wreck = { type: 'frigate', x, y, r: 70, obj: o };
        M.structs.push(o.wreck);
        o.label = 'Recover the flight recorder';
        break;
      }
      case 'nova': {
        o.node = { type: 'node', x, y, r: 60, alive: true, obj: o };
        M.structs.push(o.node);
        o.label = 'Nova Bomb the command node';
        break;
      }
    }
    return o;
  };

  // Ground textures: a tiling detail texture and a coarse whole-map variation layer.
  World.buildGround = function (M) {
    const b = M.biome, tile = document.createElement('canvas'); tile.width = tile.height = 512;
    const c = tile.getContext('2d');
    c.fillStyle = b.g1; c.fillRect(0, 0, 512, 512);
    const blot = (col, n, rmin, rmax, a) => {
      c.fillStyle = col; c.globalAlpha = a;
      for (let i = 0; i < n; i++) {
        const x = Math.random() * 512, y = Math.random() * 512, r = U.rand(rmin, rmax);
        for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { c.beginPath(); c.ellipse(x + ox, y + oy, r, r * U.rand(0.5, 1), Math.random() * 3, 0, Math.PI * 2); c.fill(); }
      }
      c.globalAlpha = 1;
    };
    blot(b.g2, 60, 20, 70, 0.35); blot(b.g3, 60, 10, 50, 0.3); blot(b.g2, 500, 1, 4, 0.5); blot(b.g3, 400, 1, 3, 0.5);
    if (M.biomeId === 'jungle' || M.biomeId === 'marsh') { c.strokeStyle = b.g3; c.globalAlpha = 0.5; for (let i = 0; i < 700; i++) { const x = Math.random() * 512, y = Math.random() * 512; c.beginPath(); c.moveTo(x, y); c.lineTo(x + U.rand(-3, 3), y - U.rand(4, 9)); c.stroke(); } c.globalAlpha = 1; }
    if (M.biomeId === 'colony') { c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 2; for (let i = 0; i <= 512; i += 128) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 512); c.moveTo(0, i); c.lineTo(512, i); c.stroke(); } }
    if (M.biomeId === 'crystal') { c.strokeStyle = 'rgba(190,160,255,0.18)'; for (let i = 0; i < 40; i++) { c.beginPath(); let x = Math.random() * 512, y = Math.random() * 512; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += U.rand(-30, 30); y += U.rand(-30, 30); c.lineTo(x, y); } c.stroke(); } }
    if (M.biomeId === 'volcanic') { c.strokeStyle = 'rgba(255,90,30,0.25)'; c.lineWidth = 1.5; for (let i = 0; i < 25; i++) { c.beginPath(); let x = Math.random() * 512, y = Math.random() * 512; c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += U.rand(-25, 25); y += U.rand(-25, 25); c.lineTo(x, y); } c.stroke(); } }
    M.groundTile = tile;
    const macro = document.createElement('canvas'); macro.width = macro.height = 96;
    const m = macro.getContext('2d');
    m.fillStyle = 'rgba(0,0,0,0)'; m.clearRect(0, 0, 96, 96);
    for (let i = 0; i < 70; i++) {
      m.fillStyle = Math.random() < 0.5 ? b.g2 : b.g3; m.globalAlpha = U.rand(0.25, 0.6);
      m.beginPath(); m.arc(Math.random() * 96, Math.random() * 96, U.rand(3, 12), 0, Math.PI * 2); m.fill();
    }
    M.macro = macro;
    // decal layer for craters and scorch marks, at quarter resolution
    M.decal = document.createElement('canvas'); M.decal.width = M.decal.height = W / 4;
    M.decalCtx = M.decal.getContext('2d');
  };
})();
