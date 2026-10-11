// Physics, mobs (models + AI), dropped items, projectiles, primed TNT and particles.
(function () {
  'use strict';
  const V3 = () => new THREE.Vector3();

  // ---------- voxel collision
  function solidAt(world, x, y, z) {
    const id = world.getBlock(x, y, z);
    return id && BH.BLOCKS[id].solid;
  }
  function boxHits(world, minx, miny, minz, maxx, maxy, maxz) {
    for (let y = Math.floor(miny); y <= Math.floor(maxy - 1e-6); y++)
      for (let z = Math.floor(minz); z <= Math.floor(maxz - 1e-6); z++)
        for (let x = Math.floor(minx); x <= Math.floor(maxx - 1e-6); x++)
          if (solidAt(world, x, y, z)) return true;
    return false;
  }
  // Moves an entity (pos at feet centre, half width e.w/2, height e.h) and resolves collisions per axis.
  function moveEntity(world, e, dx, dy, dz) {
    const hw = e.w / 2, p = e.pos;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 0.4));
    e.hitX = e.hitZ = false;
    const wasGround = e.onGround;
    e.onGround = false;
    for (let s = 0; s < steps; s++) {
      const sy = dy / steps, sx = dx / steps, sz = dz / steps;
      p.y += sy;
      if (boxHits(world, p.x - hw, p.y, p.z - hw, p.x + hw, p.y + e.h, p.z + hw)) {
        if (sy < 0) { p.y = Math.floor(p.y) + 1; e.onGround = true; } else p.y = Math.ceil(p.y + e.h) - 1 - e.h - 1e-4;
        e.vel.y = 0;
      }
      const tryAxis = (axis, d) => {
        const old = p[axis];
        p[axis] += d;
        if (boxHits(world, p.x - hw, p.y, p.z - hw, p.x + hw, p.y + e.h, p.z + hw)) {
          // step up half/full blocks when grounded
          if ((e.onGround || wasGround) && e.step && !boxHits(world, p.x - hw, p.y + e.step, p.z - hw, p.x + hw, p.y + e.h + e.step, p.z + hw)) {
            let up = 0.0;
            while (up < e.step && boxHits(world, p.x - hw, p.y + up, p.z - hw, p.x + hw, p.y + e.h + up, p.z + hw)) up += 0.125;
            p.y += up; return false;
          }
          p[axis] = old;
          return true;
        }
        if (e.sneak && (e.onGround || wasGround) && !boxHits(world, p.x - hw + 0.05, p.y - 0.6, p.z - hw + 0.05, p.x + hw - 0.05, p.y, p.z + hw - 0.05)) { p[axis] = old; return true; }
        return false;
      };
      if (tryAxis('x', sx)) { e.hitX = true; e.vel.x = 0; }
      if (tryAxis('z', sz)) { e.hitZ = true; e.vel.z = 0; }
    }
    if (!e.onGround && dy <= 0 && boxHits(world, p.x - hw, p.y - 0.02, p.z - hw, p.x + hw, p.y, p.z + hw)) e.onGround = true;
  }
  function inBlock(world, e, pred) {
    const hw = e.w / 2, p = e.pos;
    for (let y = Math.floor(p.y); y <= Math.floor(p.y + e.h * 0.9); y++)
      for (let z = Math.floor(p.z - hw); z <= Math.floor(p.z + hw); z++)
        for (let x = Math.floor(p.x - hw); x <= Math.floor(p.x + hw); x++)
          if (pred(world.getBlock(x, y, z))) return true;
    return false;
  }

  // Approximate light (0..1) at a position, for spawning and model shading.
  function lightAt(world, x, y, z, daylight) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    let sky = 1;
    for (let yy = y + 1; yy < BH.CH; yy++) { const id = world.getBlock(x, yy, z); if (id && world.lightBlock[id]) { sky = Math.max(0, 1 - (yy - y) * 0) && 0; break; } }
    if (!sky) {
      // open neighbourhood brightens cave mouths a little
      let open = 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + [3, -3, 0, 0][k], nz = z + [0, 0, 3, -3][k]; let ok = true;
        for (let yy = y + 1; yy < BH.CH; yy++) { const id = world.getBlock(nx, yy, nz); if (id && world.lightBlock[id]) { ok = false; break; } }
        if (ok) open++;
      }
      sky = open ? 0.5 : 0;
    }
    let bl = 0;
    const cx = x >> 4, cz = z >> 4;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const c = world.chunk(cx + a, cz + b); if (!c) continue;
      const L = c.lights;
      for (let i = 0; i < L.length; i += 4) {
        const d = Math.abs(L[i] - x) + Math.abs(L[i + 1] - y) + Math.abs(L[i + 2] - z);
        const v = (L[i + 3] - d) / 15; if (v > bl) bl = v;
      }
    }
    return { sky, bl, v: Math.max(sky * daylight, bl) };
  }

  // ---------- model helpers
  const noiseTexCache = {};
  function noiseTex(seed, strength) {
    const k = seed + ':' + strength;
    if (noiseTexCache[k]) return noiseTexCache[k];
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const g = c.getContext('2d'), r = BH.mulberry32(seed);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = 255 - ((r() * strength * 255) | 0); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); }
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter;
    noiseTexCache[k] = t; return t;
  }
  function faceTex(draw) {
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const g = c.getContext('2d');
    draw((x, y, col, w, h) => { g.fillStyle = col; g.fillRect(x, y, w || 1, h || 1); });
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter;
    return t;
  }
  const FACES = {};
  function initFaces() {
    if (FACES.pig) return;
    FACES.pig = faceTex(p => { p(0, 0, '#e8a0a0', 8, 8); p(1, 2, '#fff'); p(2, 2, '#222'); p(5, 2, '#222'); p(6, 2, '#fff'); });
    FACES.snout = faceTex(p => { p(0, 0, '#f0b0b0', 8, 8); p(2, 3, '#a05050', 1, 2); p(5, 3, '#a05050', 1, 2); });
    FACES.cow = faceTex(p => { p(0, 0, '#5a3a24', 8, 8); p(0, 0, '#eee', 3, 3); p(1, 3, '#111'); p(6, 3, '#111'); p(2, 5, '#d8c0b0', 4, 3); p(3, 6, '#5a3a24'); p(4, 6, '#5a3a24'); });
    FACES.sheep = faceTex(p => { p(0, 0, '#d8c8b8', 8, 8); p(1, 3, '#fff'); p(2, 3, '#222'); p(5, 3, '#222'); p(6, 3, '#fff'); p(3, 6, '#b08888', 2, 1); });
    FACES.chicken = faceTex(p => { p(0, 0, '#fafafa', 8, 8); p(1, 2, '#111'); p(6, 2, '#111'); });
    FACES.shambler = faceTex(p => { p(0, 0, '#5e6e4a', 8, 8); p(0, 0, '#3e4e2a', 8, 2); p(1, 3, '#ffe040', 2, 1); p(5, 3, '#ffe040', 2, 1); p(2, 6, '#2a2a1a', 4, 1); p(3, 5, '#7a8a5a'); });
    FACES.archer = faceTex(p => { p(0, 0, '#3a2a1e', 8, 8); p(2, 2, '#d8d4c8', 4, 5); p(2, 3, '#101010'); p(5, 3, '#101010'); p(3, 5, '#101010', 2, 1); p(3, 6, '#d8d4c8'); });
    FACES.crawler = faceTex(p => { p(0, 0, '#2e2236', 8, 8); [[1, 2], [2, 3], [5, 3], [6, 2], [2, 1], [5, 1]].forEach(([x, y]) => p(x, y, '#ff3030')); p(3, 5, '#d0c8b0', 2, 2); });
    FACES.beetle = faceTex(p => { p(0, 0, '#3a2414', 8, 8); p(1, 2, '#90ff60', 2, 2); p(5, 2, '#90ff60', 2, 2); p(2, 6, '#1a0c04', 1, 2); p(5, 6, '#1a0c04', 1, 2); });
    FACES.blob = faceTex(p => { p(0, 0, '#6ac04a', 8, 8); p(1, 2, '#1a3a10', 2, 2); p(5, 2, '#1a3a10', 2, 2); p(3, 5, '#1a3a10', 2, 1); });
    FACES.settler = faceTex(p => { p(0, 0, '#c8a080', 8, 8); p(1, 3, '#fff', 2, 2); p(5, 3, '#fff', 2, 2); p(2, 3, '#3a6a3a'); p(5, 3, '#3a6a3a'); p(3, 5, '#a07858', 2, 2); p(2, 7, '#7a5a40', 4, 1); });
    FACES.imp = faceTex(p => { p(0, 0, '#c84a2a', 8, 8); p(1, 3, '#ffe040', 2, 1); p(5, 3, '#ffe040', 2, 1); p(2, 6, '#3a0a04', 4, 1); p(3, 6, '#fff'); p(4, 6, '#fff'); });
    FACES.hound = faceTex(p => { p(0, 0, '#3a2a28', 8, 8); p(1, 2, '#ff6a10', 2, 1); p(5, 2, '#ff6a10', 2, 1); p(2, 5, '#ff9a30', 4, 2); p(3, 5, '#1a0a04', 2, 1); });
    FACES.wraith = faceTex(p => { p(0, 0, '#2a2a2e', 8, 8); p(1, 3, '#ff4020', 2, 2); p(5, 3, '#ff4020', 2, 2); p(2, 6, '#0a0a0a', 4, 1); });
    FACES.sentinel = faceTex(p => { p(0, 0, '#e8a020', 8, 8); p(0, 0, '#b86a10', 8, 2); p(1, 3, '#3a1a04', 6, 1); p(3, 3, '#fff8a0', 2, 1); p(2, 6, '#b86a10', 4, 1); });
    FACES.drifter = faceTex(p => { p(0, 0, '#5ab0c8', 8, 8); p(2, 3, '#0a2a34', 1, 2); p(5, 3, '#0a2a34', 1, 2); p(1, 1, '#a0e8f8', 3, 1); });
    FACES.warden = faceTex(p => { p(0, 0, '#3a2a5a', 8, 8); p(1, 1, '#e8e4c4', 6, 6); p(2, 2, '#2a8a6a', 4, 4); p(3, 3, '#0a1a14', 2, 2); p(2, 2, '#6ae0b0'); });
    FACES.wisp = faceTex(p => { p(0, 0, '#9a78e0', 8, 8); p(2, 3, '#fff', 1, 2); p(5, 3, '#fff', 1, 2); p(1, 1, '#c0a8ff', 2, 1); });
  }

  function makeModel(def) {
    initFaces();
    const root = new THREE.Group();
    const parts = {};
    const mats = [];
    const matCache = {};
    const getMat = (color, tex, extra) => {
      const k = color + ':' + (tex ? tex.uuid : '') + ':' + (extra ? JSON.stringify(extra) : '');
      if (matCache[k]) return matCache[k];
      const m = new THREE.MeshLambertMaterial(Object.assign({ color, map: tex || noiseTex(color & 255, 0.18) }, extra || {}));
      m.userData.base = new THREE.Color(color);
      m.userData.emissive = !!(extra && extra.emissive);
      mats.push(m); matCache[k] = m; return m;
    };
    def.parts.forEach(pd => {
      const [w, h, d] = pd.s;
      const g = new THREE.BoxGeometry(w, h, d);
      // pivot at top centre for limbs, centre otherwise
      if (pd.pivotTop) g.translate(0, -h / 2, 0);
      const base = getMat(pd.c, null, pd.extra);
      const mm = [base, base, base, base, pd.face ? getMat(0xffffff, FACES[pd.face], pd.extra) : base, base];
      const mesh = new THREE.Mesh(g, mm);
      mesh.position.set(pd.p[0], pd.p[1], pd.p[2]);
      if (pd.r) mesh.rotation.set(pd.r[0], pd.r[1], pd.r[2]);
      (pd.parent ? parts[pd.parent] : root).add(mesh);
      if (pd.n) parts[pd.n] = mesh;
    });
    return { root, parts, mats };
  }

  // Original creature designs. Scale: 1 unit = 1 block. Forward is +z.
  const leg = (n, x, z, h, c, w) => ({ n, s: [w || 0.24, h, w || 0.24], p: [x, h, z], c, pivotTop: true });
  const MOBS = {
    pig: {
      name: 'Pig', hp: 10, w: 0.9, h: 0.9, speed: 1.2, passive: true, food: 'carrot', drops: [['porkchop', 1, 3]],
      parts: [
        { n: 'body', s: [0.6, 0.5, 0.9], p: [0, 0.65, 0], c: 0xe8a0a0 },
        { n: 'head', s: [0.5, 0.5, 0.45], p: [0, 0.8, 0.6], c: 0xe8a0a0, face: 'pig' },
        { s: [0.26, 0.18, 0.08], p: [0, -0.08, 0.26], c: 0xf0b0b0, face: 'snout', parent: 'head' },
        leg('l0', -0.18, 0.3, 0.4, 0xd89090), leg('l1', 0.18, 0.3, 0.4, 0xd89090), leg('l2', -0.18, -0.3, 0.4, 0xd89090), leg('l3', 0.18, -0.3, 0.4, 0xd89090),
      ],
    },
    cow: {
      name: 'Cow', hp: 10, w: 0.9, h: 1.4, speed: 1.0, passive: true, food: 'wheat', milk: true, drops: [['beef', 1, 3], ['leather', 0, 2]],
      parts: [
        { n: 'body', s: [0.75, 0.7, 1.1], p: [0, 1.0, 0], c: 0x5a3a24 },
        { s: [0.5, 0.3, 0.5], p: [0.14, 0.15, 0.1], c: 0xeeeeee, parent: 'body' },
        { s: [0.3, 0.25, 0.4], p: [-0.25, 0.25, -0.3], c: 0xeeeeee, parent: 'body' },
        { n: 'head', s: [0.5, 0.5, 0.4], p: [0, 1.25, 0.72], c: 0x5a3a24, face: 'cow' },
        { s: [0.08, 0.18, 0.08], p: [-0.28, 0.25, 0], c: 0xd8d0b8, parent: 'head' },
        { s: [0.08, 0.18, 0.08], p: [0.28, 0.25, 0], c: 0xd8d0b8, parent: 'head' },
        leg('l0', -0.24, 0.4, 0.65, 0x4a2e1c), leg('l1', 0.24, 0.4, 0.65, 0x4a2e1c), leg('l2', -0.24, -0.4, 0.65, 0x4a2e1c), leg('l3', 0.24, -0.4, 0.65, 0x4a2e1c),
      ],
    },
    sheep: {
      name: 'Sheep', hp: 8, w: 0.9, h: 1.3, speed: 1.1, passive: true, food: 'wheat', wool: true, drops: [['mutton', 1, 2]],
      parts: [
        { n: 'body', s: [0.8, 0.7, 1.05], p: [0, 0.95, 0], c: 0xf0f0f0 },
        { n: 'head', s: [0.4, 0.42, 0.45], p: [0, 1.2, 0.65], c: 0xd8c8b8, face: 'sheep' },
        { n: 'cap', s: [0.46, 0.18, 0.4], p: [0, 0.24, -0.04], c: 0xf0f0f0, parent: 'head' },
        leg('l0', -0.22, 0.35, 0.6, 0xd8c8b8, 0.2), leg('l1', 0.22, 0.35, 0.6, 0xd8c8b8, 0.2), leg('l2', -0.22, -0.35, 0.6, 0xd8c8b8, 0.2), leg('l3', 0.22, -0.35, 0.6, 0xd8c8b8, 0.2),
      ],
    },
    chicken: {
      name: 'Chicken', hp: 4, w: 0.4, h: 0.7, speed: 1.0, passive: true, food: 'seeds', eggs: true, floaty: true, drops: [['chicken', 1, 1], ['feather', 0, 2]],
      parts: [
        { n: 'body', s: [0.36, 0.36, 0.5], p: [0, 0.42, 0], c: 0xfafafa },
        { n: 'head', s: [0.26, 0.34, 0.2], p: [0, 0.7, 0.26], c: 0xfafafa, face: 'chicken' },
        { s: [0.16, 0.08, 0.12], p: [0, 0.0, 0.14], c: 0xf0b020, parent: 'head' },
        { s: [0.08, 0.1, 0.06], p: [0, -0.1, 0.11], c: 0xd02020, parent: 'head' },
        { n: 'wl', s: [0.06, 0.24, 0.34], p: [-0.21, 0.5, 0], c: 0xe8e8e8, pivotTop: true },
        { n: 'wr', s: [0.06, 0.24, 0.34], p: [0.21, 0.5, 0], c: 0xe8e8e8, pivotTop: true },
        leg('l0', -0.08, 0, 0.24, 0xf0b020, 0.06), leg('l1', 0.08, 0, 0.24, 0xf0b020, 0.06),
      ],
    },
    shambler: {
      name: 'Shambler', hp: 20, w: 0.6, h: 1.85, speed: 1.6, hostile: true, undead: true, dmg: 3, drops: [['rotten_flesh', 0, 2]], rare: [['iron_ingot', 0.025], ['carrot', 0.025], ['potato', 0.025], ['chain_helmet', 0.01], ['chain_chestplate', 0.01]],
      parts: [
        { n: 'body', s: [0.5, 0.7, 0.3], p: [0, 1.15, 0.02], c: 0x4a5a38, r: [0.15, 0, 0] },
        { n: 'head', s: [0.48, 0.48, 0.48], p: [0, 1.72, 0.12], c: 0x5e6e4a, face: 'shambler' },
        { s: [0.54, 0.12, 0.54], p: [0, 0.22, -0.02], c: 0x3a4a22, parent: 'head' },
        { n: 'al', s: [0.2, 0.75, 0.2], p: [-0.36, 1.45, 0.06], c: 0x5e6e4a, pivotTop: true, r: [-1.35, 0, 0] },
        { n: 'ar', s: [0.2, 0.75, 0.2], p: [0.36, 1.45, 0.06], c: 0x5e6e4a, pivotTop: true, r: [-1.25, 0, 0] },
        leg('l0', -0.13, 0, 0.78, 0x3a3a2a, 0.22), leg('l1', 0.13, 0, 0.78, 0x3a3a2a, 0.22),
      ],
    },
    archer: {
      name: 'Bone Archer', hp: 20, w: 0.6, h: 1.9, speed: 1.4, hostile: true, undead: true, ranged: true, drops: [['bone', 0, 2], ['arrow', 0, 2]], rare: [['bow', 0.04]],
      parts: [
        { n: 'body', s: [0.44, 0.72, 0.22], p: [0, 1.18, 0], c: 0x4a3626 },
        { n: 'head', s: [0.44, 0.46, 0.44], p: [0, 1.78, 0], c: 0x3a2a1e, face: 'archer' },
        { s: [0.3, 0.1, 0.2], p: [0, 0.27, -0.06], c: 0x2a1e14, parent: 'head' },
        { n: 'al', s: [0.1, 0.72, 0.1], p: [-0.28, 1.5, 0], c: 0xd8d4c8, pivotTop: true, r: [-1.4, 0.3, 0] },
        { n: 'ar', s: [0.1, 0.72, 0.1], p: [0.28, 1.5, 0], c: 0xd8d4c8, pivotTop: true, r: [-1.4, -0.3, 0] },
        { s: [0.06, 0.8, 0.06], p: [0, -0.7, 0.04], c: 0x8a5a2a, parent: 'al', r: [1.5, 0, 0] },
        leg('l0', -0.11, 0, 0.82, 0xd8d4c8, 0.11), leg('l1', 0.11, 0, 0.82, 0xd8d4c8, 0.11),
      ],
    },
    crawler: {
      name: 'Cave Crawler', hp: 16, w: 1.2, h: 0.7, speed: 2.0, hostile: true, climbs: true, dmg: 2, drops: [['string', 0, 2]],
      parts: [
        { n: 'body', s: [0.8, 0.4, 0.9], p: [0, 0.45, -0.15], c: 0x2e2236 },
        { s: [0.6, 0.1, 0.7], p: [0, 0.24, 0], c: 0x4a3a56, parent: 'body' },
        { n: 'head', s: [0.5, 0.36, 0.36], p: [0, 0.45, 0.45], c: 0x2e2236, face: 'crawler' },
        ...[-1, 1].flatMap(sd => [0, 1, 2].map(i => ({ n: 'l' + (i * 2 + (sd > 0 ? 1 : 0)), s: [0.8, 0.1, 0.1], p: [sd * 0.4, 0.5, -0.45 + i * 0.3], c: 0x1e1626, r: [0, 0, sd * -0.5], pivotTop: false }))),
      ],
    },
    beetle: {
      name: 'Blast Beetle', hp: 16, w: 0.8, h: 0.9, speed: 1.5, hostile: true, exploder: true, drops: [['gunpowder', 0, 2]], rare: [['beetle_shell', 0.15]],
      parts: [
        { n: 'body', s: [0.7, 0.55, 0.9], p: [0, 0.55, -0.05], c: 0xc0581a },
        { s: [0.04, 0.56, 0.9], p: [0, 0.03, 0], c: 0x1a0c04, parent: 'body' },
        { n: 'glow', s: [0.5, 0.3, 0.3], p: [0, -0.05, -0.5], c: 0xf8e060, parent: 'body', extra: { emissive: 0x806010 } },
        { n: 'head', s: [0.4, 0.3, 0.3], p: [0, 0.5, 0.5], c: 0x3a2414, face: 'beetle' },
        ...[-1, 1].flatMap(sd => [0, 1, 2].map(i => ({ n: 'l' + (i * 2 + (sd > 0 ? 1 : 0)), s: [0.08, 0.32, 0.08], p: [sd * 0.38, 0.32, -0.3 + i * 0.28], c: 0x1a0c04, pivotTop: true, r: [0, 0, sd * 0.5] }))),
      ],
    },
    blob: {
      name: 'Bog Blob', hp: 16, w: 1.0, h: 1.0, speed: 1.4, hostile: true, hopper: true, dmg: 3, drops: [], small: [['slimeball', 0, 2]],
      parts: [
        { n: 'body', s: [1, 1, 1], p: [0, 0.5, 0], c: 0x6ac04a, face: 'blob', extra: { transparent: true, opacity: 0.8 } },
        { s: [0.5, 0.5, 0.5], p: [0, 0, 0], c: 0x3a8a2a, parent: 'body' },
      ],
    },
    wisp: {
      name: 'Gloom Wisp', hp: 12, w: 0.7, h: 0.7, speed: 2.2, hostile: true, flyer: true, ranged: true, nightOnly: true, drops: [['glow_dust', 1, 2]], rare: [['wisp_essence', 0.3]],
      parts: [
        { n: 'body', s: [0.6, 0.6, 0.6], p: [0, 0.35, 0], c: 0x9a78e0, face: 'wisp', extra: { emissive: 0x3a2070 } },
        ...[0, 1, 2, 3].map(i => ({ n: 'l' + i, s: [0.1, 0.5, 0.1], p: [(i % 2 ? 0.18 : -0.18), 0.1, (i < 2 ? 0.18 : -0.18)], c: 0x6a48b0, pivotTop: true, extra: { emissive: 0x1a1040 } })),
      ],
    },
  };

  Object.assign(MOBS, {
    settler: {
      name: 'Settler', hp: 20, w: 0.6, h: 1.9, speed: 0.9, passive: true, npc: true, drops: [],
      parts: [
        { n: 'body', s: [0.5, 0.8, 0.34], p: [0, 1.15, 0], c: 0x7a5a3a },
        { s: [0.56, 0.4, 0.4], p: [0, -0.5, 0], c: 0x6a4a2a, parent: 'body' },
        { n: 'head', s: [0.46, 0.5, 0.46], p: [0, 1.82, 0], c: 0xc8a080, face: 'settler' },
        { n: 'hat', s: [0.6, 0.1, 0.6], p: [0, 0.3, 0], c: 0xc8a840, parent: 'head' },
        { s: [0.36, 0.18, 0.36], p: [0, 0.42, 0], c: 0xc8a840, parent: 'head' },
        { n: 'arms', s: [0.66, 0.2, 0.22], p: [0, 1.32, 0.22], c: 0x7a5a3a },
        leg('l0', -0.12, 0, 0.75, 0x4a3a2a, 0.22), leg('l1', 0.12, 0, 0.75, 0x4a3a2a, 0.22),
      ],
    },
    imp: {
      name: 'Cinder Imp', hp: 14, w: 0.7, h: 1.0, speed: 2.4, hostile: true, flyer: true, ranged: true, fireproof: true, shot: 'fire', drops: [['gunpowder', 0, 2]], rare: [['ember_shard', 0.5], ['fire_charge', 0.1]],
      parts: [
        { n: 'body', s: [0.5, 0.5, 0.4], p: [0, 0.45, 0], c: 0xa83a1a },
        { n: 'head', s: [0.44, 0.4, 0.4], p: [0, 0.9, 0.02], c: 0xc84a2a, face: 'imp' },
        { s: [0.08, 0.2, 0.08], p: [-0.16, 0.26, 0], c: 0x2a1a1a, parent: 'head', r: [0, 0, 0.4] },
        { s: [0.08, 0.2, 0.08], p: [0.16, 0.26, 0], c: 0x2a1a1a, parent: 'head', r: [0, 0, -0.4] },
        { n: 'wl', s: [0.5, 0.36, 0.04], p: [-0.4, 0.62, -0.2], c: 0x5a1a10, pivotTop: true },
        { n: 'wr', s: [0.5, 0.36, 0.04], p: [0.4, 0.62, -0.2], c: 0x5a1a10, pivotTop: true },
        { n: 'l0', s: [0.06, 0.4, 0.06], p: [0, 0.25, -0.2], c: 0x5a1a10, pivotTop: true, r: [0.8, 0, 0] },
      ],
    },
    hound: {
      name: 'Magma Hound', hp: 18, w: 0.9, h: 0.9, speed: 3.0, hostile: true, fireproof: true, dmg: 4, burns: true, drops: [['ember_shard', 0, 2]], rare: [['scorch_block', 0.3]],
      parts: [
        { n: 'body', s: [0.5, 0.45, 1.0], p: [0, 0.65, 0], c: 0x3a2a28 },
        { s: [0.3, 0.06, 0.8], p: [0, 0.25, 0], c: 0xff6a10, parent: 'body', extra: { emissive: 0x802000 } },
        { n: 'head', s: [0.44, 0.4, 0.5], p: [0, 0.85, 0.62], c: 0x3a2a28, face: 'hound' },
        { s: [0.1, 0.1, 0.5], p: [0, 0.8, -0.65], c: 0xff6a10, r: [0.6, 0, 0], extra: { emissive: 0x802000 } },
        leg('l0', -0.16, 0.36, 0.45, 0x2a1a18, 0.16), leg('l1', 0.16, 0.36, 0.45, 0x2a1a18, 0.16), leg('l2', -0.16, -0.36, 0.45, 0x2a1a18, 0.16), leg('l3', 0.16, -0.36, 0.45, 0x2a1a18, 0.16),
      ],
    },
    wraith: {
      name: 'Ash Wraith', hp: 30, w: 0.7, h: 2.3, speed: 1.8, hostile: true, fireproof: true, dmg: 7, wither: true, drops: [['bone', 0, 2], ['coal', 0, 1]], rare: [['wraith_skull', 0.05]],
      parts: [
        { n: 'body', s: [0.56, 0.9, 0.3], p: [0, 1.45, 0], c: 0x2a2a2e },
        { s: [0.7, 0.6, 0.4], p: [0, -0.6, 0], c: 0x1a1a1e, parent: 'body' },
        { n: 'head', s: [0.5, 0.5, 0.5], p: [0, 2.15, 0], c: 0x2a2a2e, face: 'wraith' },
        { n: 'al', s: [0.14, 0.9, 0.14], p: [-0.38, 1.85, 0], c: 0x2a2a2e, pivotTop: true },
        { n: 'ar', s: [0.14, 0.9, 0.14], p: [0.38, 1.85, 0], c: 0x2a2a2e, pivotTop: true, r: [-0.6, 0, 0] },
        { s: [0.06, 1.0, 0.1], p: [0, -1.1, 0.04], c: 0x4a4a52, parent: 'ar' },
        leg('l0', -0.14, 0, 0.95, 0x1a1a1e, 0.16), leg('l1', 0.14, 0, 0.95, 0x1a1a1e, 0.16),
      ],
    },
    sentinel: {
      name: 'Ember Sentinel', hp: 22, w: 0.7, h: 1.8, speed: 1.6, hostile: true, flyer: true, ranged: true, fireproof: true, shot: 'fire', burst: 3, drops: [['ember_rod', 0, 1]],
      parts: [
        { n: 'head', s: [0.5, 0.5, 0.5], p: [0, 1.5, 0], c: 0xe8a020, face: 'sentinel', extra: { emissive: 0x6a3a00 } },
        ...[0, 1, 2, 3, 4, 5].map(i => ({ n: 'l' + i, s: [0.12, 0.6, 0.12], p: [Math.cos(i / 6 * 6.28) * 0.45, 0.8, Math.sin(i / 6 * 6.28) * 0.45], c: 0xffb030, pivotTop: false, extra: { emissive: 0x804000 } })),
      ],
    },
    drifter: {
      name: 'Drifter', hp: 20, w: 0.8, h: 1.2, speed: 1.2, hostile: false, neutral: true, flyer: true, teleporter: true, dmg: 5, drops: [['drift_pearl', 0, 1]],
      parts: [
        { n: 'body', s: [0.8, 0.6, 0.8], p: [0, 0.9, 0], c: 0x5ab0c8, face: 'drifter', extra: { transparent: true, opacity: 0.85, emissive: 0x0a2a34 } },
        ...[0, 1, 2, 3].map(i => ({ n: 'l' + i, s: [0.08, 0.7, 0.08], p: [(i % 2 ? 0.25 : -0.25), 0.6, (i < 2 ? 0.25 : -0.25)], c: 0x3a8aa0, pivotTop: true, extra: { transparent: true, opacity: 0.8 } })),
      ],
    },
    warden: {
      name: 'The Hollow Warden', hp: 240, w: 3, h: 3, speed: 9, hostile: true, boss: true, flyer: true, fireproof: true, drops: [],
      parts: [
        { n: 'body', s: [3, 3, 3], p: [0, 1.5, 0], c: 0x3a2a5a, face: 'warden', extra: { emissive: 0x100820 } },
        ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ n: 'p' + i, s: [0.8, 1.6, 0.3], p: [Math.cos(i / 8 * 6.28) * 2.6, 1.5, Math.sin(i / 8 * 6.28) * 2.6], c: 0xd8d4b0, r: [0, -i / 8 * 6.28 + Math.PI / 2, 0] })),
      ],
    },
    crystal: {
      name: 'Warding Crystal', hp: 1, w: 1.2, h: 2, speed: 0, hostile: false, crystal: true, flyer: true, fireproof: true, drops: [],
      parts: [
        { n: 'body', s: [0.9, 0.9, 0.9], p: [0, 1, 0], c: 0xc0a0ff, r: [0.6, 0.6, 0], extra: { emissive: 0x4a3080, transparent: true, opacity: 0.85 } },
        { n: 'core', s: [0.5, 0.5, 0.5], p: [0, 1, 0], c: 0xffffff, extra: { emissive: 0xa080ff } },
      ],
    },
  });

  // ---------- entity manager
  function Entities(game) {
    this.game = game;
    this.list = [];
    this.items = [];
    this.projectiles = [];
    this.tnts = [];
    this.spawnTimer = 0;
    this.particles = new Particles(game.scene);
    this.itemGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
  }
  Entities.prototype.spawnMob = function (type, x, y, z, opts) {
    const def = MOBS[type];
    const model = makeModel(def);
    const e = {
      kind: 'mob', type, def, pos: new THREE.Vector3(x, y, z), vel: V3(), yaw: Math.random() * 6.28, w: def.w, h: def.h, step: 0.6,
      hp: def.hp, onGround: false, model, hurt: 0, walk: 0, ai: { t: 0, tx: x, tz: z }, attackCd: 0, fuse: 0, light: 1, size: 1, love: 0, age: 0, baby: false, fire: 0, shotCd: 2,
    };
    Object.assign(e, opts || {});
    if (type === 'blob') { if (!e.size || e.size === 1 && !(opts && opts.size)) e.size = 2; e.w = e.h = 0.5 * e.size; e.hp = e.size === 2 ? 16 : 4; model.root.scale.setScalar(0.5 * e.size); }
    if (type === 'sheep') { e.color = e.color || pickSheepColor(); e.sheared = !!e.sheared; this.colorSheep(e); }
    if (e.baby) { model.root.scale.setScalar(0.55); e.w *= 0.55; e.h *= 0.55; e.age = -300; }
    this.game.scene.add(model.root);
    this.list.push(e);
    return e;
  };
  function pickSheepColor() { const r = Math.random(); return r < 0.81 ? 'white' : r < 0.86 ? 'gray' : r < 0.91 ? 'light_gray' : r < 0.96 ? 'black' : r < 0.99 ? 'brown' : 'pink'; }
  const WOOLHEX = { white: 0xf0f0f0, gray: 0x4a4e52, light_gray: 0xa0a09a, black: 0x1e1e22, brown: 0x7a5434, pink: 0xf0a0c0 };
  Entities.prototype.colorSheep = function (e) {
    ['body', 'cap'].forEach(n => {
      const m = e.model.parts[n]; if (!m) return;
      const mat = m.material[0].clone(); mat.userData = { base: new THREE.Color(e.sheared ? 0xd8c8b8 : WOOLHEX[e.color] || 0xf0f0f0) };
      m.material = [mat, mat, mat, mat, mat, mat]; e.model.mats.push(mat);
      m.scale.setScalar(e.sheared ? 0.85 : 1);
    });
  };
  Entities.prototype.removeMob = function (e) {
    if (e.beams) { this.game.scene.remove(e.beams); }
    this.game.scene.remove(e.model.root);
    e.model.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    e.dead = true;
  };

  Entities.prototype.dropItem = function (key, n, x, y, z, vel, pickupDelay) {
    if (!n) return;
    const it = typeof key === 'number' ? BH.ITEMS[key] : BH.itemByKey(key);
    if (!it) return;
    const mesh = this.game.ui.itemMesh(it.id);
    mesh.position.set(x, y, z);
    this.game.scene.add(mesh);
    const d = { id: it.id, n, pos: new THREE.Vector3(x, y, z), vel: vel || new THREE.Vector3((Math.random() - 0.5) * 3, 3, (Math.random() - 0.5) * 3), w: 0.25, h: 0.25, mesh, age: 0, delay: pickupDelay === undefined ? 0.4 : pickupDelay, onGround: false, dur: 0 };
    this.items.push(d);
    return d;
  };

  Entities.prototype.shoot = function (from, dir, speed, owner, kind) {
    let mesh;
    if (kind === 'spark' || kind === 'fire' || kind === 'void') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(kind === 'void' ? 0.5 : 0.3, kind === 'void' ? 0.5 : 0.3, kind === 'void' ? 0.5 : 0.3), new THREE.MeshBasicMaterial({ color: kind === 'fire' ? 0xff8a20 : kind === 'void' ? 0x6ae0b0 : 0xc8a8ff }));
    } else if (kind === 'pearl') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial({ color: 0x4a8aa0 }));
    } else if (kind === 'snowball' || kind === 'egg') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial({ color: kind === 'egg' ? 0xf0e4c8 : 0xf8fbff }));
    } else {
      mesh = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), new THREE.MeshLambertMaterial({ color: 0x8a6a3a }));
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.1), new THREE.MeshLambertMaterial({ color: 0x9a9a9a })); tip.position.z = 0.33;
      const fl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.14), new THREE.MeshLambertMaterial({ color: 0xf0f0f0 })); fl.position.z = -0.28;
      mesh.add(shaft, tip, fl);
    }
    mesh.position.copy(from);
    this.game.scene.add(mesh);
    this.projectiles.push({ pos: from.clone(), vel: dir.clone().multiplyScalar(speed), owner, mesh, age: 0, stuck: false, kind: kind || 'arrow', dmg: kind === 'spark' ? 4 : kind === 'fire' ? 5 : kind === 'void' ? 7 : kind === 'arrow' ? Math.max(2, speed / 6) : 0 });
  };

  Entities.prototype.primeTNT = function (x, y, z, fuse) {
    const g = this.game;
    const mesh = g.ui.blockMesh(BH.ID.tnt, 0.98);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    g.scene.add(mesh);
    this.tnts.push({ pos: new THREE.Vector3(x + 0.5, y, z + 0.5), vel: new THREE.Vector3(0, 2, 0), w: 0.98, h: 0.98, mesh, fuse: fuse === undefined ? 4 : fuse, onGround: false });
  };

  Entities.prototype.explode = function (x, y, z, power) {
    const g = this.game, w = g.world;
    g.audio.play('explode');
    const r = power;
    for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > r - Math.random() * 0.8) continue;
      const bx = Math.floor(x + dx), by = Math.floor(y + dy), bz = Math.floor(z + dz);
      const id = w.getBlock(bx, by, bz);
      if (!id) continue;
      const b = BH.BLOCKS[id];
      if (b.hardness < 0 || b.hardness >= 50) continue;
      if (id === BH.ID.tnt) { w.setBlock(bx, by, bz, 0); this.primeTNT(bx, by, bz, 0.5 + Math.random()); continue; }
      g.breakBlockAt(bx, by, bz, null, Math.random() < 0.3);
    }
    for (let i = 0; i < 40; i++) this.particles.spawn(x + (Math.random() - 0.5) * r * 2, y + (Math.random() - 0.5) * r * 2, z + (Math.random() - 0.5) * r * 2, [0.85, 0.85, 0.85], 1.5, 1.2);
    const hurt = (e, isPlayer) => {
      const c = new THREE.Vector3(e.pos.x, e.pos.y + e.h / 2, e.pos.z);
      const d = c.distanceTo(new THREE.Vector3(x, y, z));
      if (d > r * 2) return;
      const f = 1 - d / (r * 2);
      const dmg = Math.round((f * f + f) * 3.5 * r + 1);
      const kb = c.sub(new THREE.Vector3(x, y, z)).normalize().multiplyScalar(f * 14);
      if (isPlayer) g.player.damage(dmg, 'explosion', kb); else this.damageMob(e, dmg, kb, null);
    };
    this.list.forEach(e => !e.dead && hurt(e));
    hurt(g.player, true);
  };

  Entities.prototype.damageMob = function (e, dmg, kb, attacker) {
    if (e.dead || e.hurt > 0.45) return false;
    e.hp -= dmg; e.hurt = 0.5;
    if (kb) { e.vel.x += kb.x; e.vel.z += kb.z; e.vel.y = Math.max(e.vel.y, kb.y || 5); }
    if (e.def.passive) { e.ai.flee = 4; }
    if (e.def.neutral) e.ai.angry = true;
    if (e.def.crystal) { e.hp = 0; }
    if (e.def.teleporter && e.hp > 0 && Math.random() < 0.6) this.teleportMob(e);
    if (attacker) e.ai.target = attacker;
    this.game.audio.play('hurt_mob');
    if (e.hp <= 0) this.killMob(e, attacker);
    return true;
  };
  Entities.prototype.teleportMob = function (e) {
    const w = this.game.world;
    for (let t = 0; t < 16; t++) {
      const x = Math.floor(e.pos.x + (Math.random() - 0.5) * 16), z = Math.floor(e.pos.z + (Math.random() - 0.5) * 16);
      for (let y = Math.floor(e.pos.y) + 6; y > Math.floor(e.pos.y) - 8; y--) {
        if (BH.BLOCKS[w.getBlock(x, y - 1, z)].solid && !w.getBlock(x, y, z) && !w.getBlock(x, y + 1, z)) {
          for (let i = 0; i < 10; i++) this.particles.spawn(e.pos.x, e.pos.y + 0.6, e.pos.z, [0.4, 0.8, 0.9], 1, 0.5);
          e.pos.set(x + 0.5, y, z + 0.5); this.game.audio.play('teleport'); return;
        }
      }
    }
  };
  Entities.prototype.killMob = function (e, attacker) {
    const def = e.def, p = e.pos;
    if (def.crystal) { this.removeMob(e); this.explode(p.x, p.y + 1, p.z, 3); this.game.audio.play('crystal'); this.game.onCrystalDestroyed && this.game.onCrystalDestroyed(e); return; }
    if (def.boss) { this.game.onBossDefeated(e); }
    for (let i = 0; i < 12; i++) this.particles.spawn(p.x, p.y + e.h / 2, p.z, [0.9, 0.9, 0.9], 1.2, 0.6);
    if (!e.baby) {
      const dropList = e.type === 'blob' ? (e.size === 1 ? def.small : []) : def.drops;
      dropList.forEach(([k, a, b]) => {
        let key = k;
        if (e.fire > 0) key = { porkchop: 'cooked_porkchop', beef: 'steak', chicken: 'cooked_chicken', mutton: 'cooked_mutton' }[k] || k;
        const n = a + Math.floor(Math.random() * (b - a + 1));
        this.dropItem(key, n, p.x, p.y + 0.4, p.z);
      });
      (def.rare || []).forEach(([k, ch]) => { if (Math.random() < ch * (attacker ? 1 : 0.5)) this.dropItem(k, 1, p.x, p.y + 0.4, p.z); });
      if (e.type === 'sheep' && !e.sheared) this.dropItem('wool_' + e.color, 1, p.x, p.y + 0.4, p.z);
      this.game.player.xp += def.boss ? 500 : e.def.hostile ? 5 : 2;
    }
    if (e.type === 'blob' && e.size === 2) for (let i = 0; i < 2 + (Math.random() < 0.5 ? 1 : 0); i++) this.spawnMob('blob', p.x + (Math.random() - 0.5), p.y + 0.3, p.z + (Math.random() - 0.5), { size: 1 });
    this.removeMob(e);
    this.game.stats.kills++;
  };

  Entities.prototype.update = function (dt) {
    const g = this.game, w = g.world, pl = g.player;
    const daylight = g.daylight;
    // spawning
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.spawnTimer = 0.5; this.trySpawn(); this.cageT = (this.cageT || 0) + 1; if (this.cageT % 4 === 0) this.updateCages(); }
    for (const e of this.list) {
      if (e.dead) continue;
      if (!e.def.boss && !e.def.crystal && !w.loaded(Math.floor(e.pos.x), Math.floor(e.pos.z))) { if (e.pos.distanceTo(pl.pos) > 100) this.removeMob(e); continue; }
      this.updateMob(e, dt, daylight);
    }
    this.list = this.list.filter(e => !e.dead);
    // dropped items
    for (const d of this.items) {
      d.age += dt; d.delay -= dt;
      d.vel.y -= 20 * dt;
      if (inBlock(w, d, id => id && BH.BLOCKS[id].solid)) d.pos.y += 4 * dt, d.vel.y = 0;
      moveEntity(w, d, d.vel.x * dt, d.vel.y * dt, d.vel.z * dt);
      if (d.onGround) { d.vel.x *= 0.85; d.vel.z *= 0.85; }
      d.mesh.position.set(d.pos.x, d.pos.y + 0.18 + Math.sin(d.age * 3) * 0.05, d.pos.z);
      d.mesh.rotation.y = d.age * 1.6;
      const L = lightAt(w, d.pos.x, d.pos.y + 0.3, d.pos.z, daylight);
      shadeObject(d.mesh, 0.25 + 0.75 * L.v);
      // pickup
      const dx = pl.pos.x - d.pos.x, dy = (pl.pos.y + 0.8) - d.pos.y, dz = pl.pos.z - d.pos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d.delay <= 0 && !pl.dead && dist < 2.6) {
        if (dist < 1.1) {
          const left = g.inv.add(d.id, d.n, d.dur);
          if (left < d.n) g.audio.play('pop');
          d.n = left;
          if (!left) d.dead = true;
        } else d.pos.addScaledVector(new THREE.Vector3(dx, dy, dz).normalize(), dt * 8);
      }
      if (d.age > 300) d.dead = true;
    }
    // merge nearby stacks occasionally
    if (Math.random() < 0.05) for (let i = 0; i < this.items.length; i++) for (let j = i + 1; j < this.items.length; j++) {
      const a = this.items[i], b = this.items[j];
      if (a.dead || b.dead || a.id !== b.id || a.dur || b.dur || BH.ITEMS[a.id].stack === 1) continue;
      if (a.pos.distanceTo(b.pos) < 1 && a.n + b.n <= BH.ITEMS[a.id].stack) { a.n += b.n; b.dead = true; }
    }
    this.items = this.items.filter(d => { if (d.dead) { g.scene.remove(d.mesh); } return !d.dead; });
    // projectiles
    for (const p of this.projectiles) {
      p.age += dt;
      if (p.stuck) { if (p.age > 20) p.dead = true; continue; }
      if (p.kind !== 'spark' && p.kind !== 'fire' && p.kind !== 'void') p.vel.y -= 20 * dt;
      if (p.kind === 'fire' && Math.random() < 0.5) this.particles.spawn(p.pos.x, p.pos.y, p.pos.z, [1, 0.5, 0.1], 0.2, 0.3);
      const step = p.vel.clone().multiplyScalar(dt);
      const len = step.length();
      const hit = w.raycast(p.pos, step.clone().normalize(), len);
      // entity hits
      const targets = this.list.filter(e => e !== p.owner && !e.dead);
      if (p.owner !== pl) targets.push(pl);
      let hitEnt = null;
      for (const e of targets) {
        const c = e.pos;
        const np = p.pos.clone().add(step);
        if (np.x > c.x - e.w / 2 - 0.1 && np.x < c.x + e.w / 2 + 0.1 && np.z > c.z - e.w / 2 - 0.1 && np.z < c.z + e.w / 2 + 0.1 && np.y > c.y && np.y < c.y + e.h) { hitEnt = e; break; }
      }
      if (hitEnt) {
        const kb = p.vel.clone().setY(0).normalize().multiplyScalar(4); kb.y = 4;
        if (p.kind === 'egg' && Math.random() < 0.125) this.spawnMob('chicken', p.pos.x, p.pos.y, p.pos.z, { baby: true });
        if (p.kind === 'pearl') { this.pearlLand(p); p.dead = true; continue; }
        if (hitEnt === pl) { if (pl.damage(p.dmg, p.kind === 'fire' ? 'fire' : 'arrow', kb) && p.kind === 'fire') pl.fire = 5; }
        else this.damageMob(hitEnt, Math.max(p.dmg, p.kind === 'snowball' && hitEnt.type === 'wisp' ? 3 : 0), kb, p.owner);
        p.dead = true; continue;
      }
      if (hit) {
        p.pos.addScaledVector(step.normalize(), hit.dist - 0.05);
        if (p.kind === 'arrow') { p.stuck = true; p.age = 0; if (p.owner === pl && Math.random() < 0.8) { p.dead = true; this.dropItem('arrow', 1, p.pos.x, p.pos.y, p.pos.z, new THREE.Vector3(), 0.2); } }
        else if (p.kind === 'pearl') { p.pos.y += 0.1; this.pearlLand(p); p.dead = true; }
        else { if (p.kind === 'egg' && Math.random() < 0.125) this.spawnMob('chicken', p.pos.x, p.pos.y + 0.2, p.pos.z, { baby: true }); p.dead = true; for (let i = 0; i < 6; i++) this.particles.spawn(p.pos.x, p.pos.y, p.pos.z, p.kind === 'spark' ? [0.8, 0.6, 1] : [1, 1, 1], 1, 0.4); }
      } else p.pos.add(step);
      p.mesh.position.copy(p.pos);
      if (!p.stuck) p.mesh.lookAt(p.pos.clone().add(p.vel));
      if (p.age > 30) p.dead = true;
    }
    this.projectiles = this.projectiles.filter(p => { if (p.dead) g.scene.remove(p.mesh); return !p.dead; });
    // TNT
    for (const t of this.tnts) {
      t.fuse -= dt;
      t.vel.y -= 20 * dt;
      moveEntity(w, t, 0, t.vel.y * dt, 0);
      t.mesh.position.set(t.pos.x, t.pos.y + 0.49, t.pos.z);
      const flash = Math.floor(t.fuse * 4) % 2 === 0;
      shadeObject(t.mesh, flash ? 2.2 : 1);
      if (t.fuse <= 0) { t.dead = true; g.scene.remove(t.mesh); this.explode(t.pos.x, t.pos.y + 0.5, t.pos.z, 4); }
    }
    this.tnts = this.tnts.filter(t => !t.dead);
    this.particles.update(dt);
  };

  function shadeObject(obj, v) {
    obj.traverse(o => {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (!m.userData.base) m.userData.base = m.color.clone();
        m.color.copy(m.userData.base).multiplyScalar(v);
      });
    });
  }

  Entities.prototype.updateMob = function (e, dt, daylight) {
    const g = this.game, w = g.world, pl = g.player, def = e.def, ai = e.ai;
    e.hurt = Math.max(0, e.hurt - dt);
    e.attackCd -= dt; e.shotCd -= dt;
    e.age += dt;
    if (e.baby && e.age > 0) { e.baby = false; e.model.root.scale.setScalar(1); e.w = def.w; e.h = def.h; }
    const toP = new THREE.Vector3(pl.pos.x - e.pos.x, (pl.pos.y + 1) - (e.pos.y + e.h / 2), pl.pos.z - e.pos.z);
    const distP = toP.length();
    const inWater = inBlock(w, e, id => id === BH.ID.water);
    const inLava = inBlock(w, e, id => id === BH.ID.lava);
    let moveX = 0, moveZ = 0, speed = def.speed, wantJump = false;
    const survival = g.mode === 'survival' && !pl.dead;
    // light, burning
    const L = lightAt(w, e.pos.x, e.pos.y + e.h * 0.8, e.pos.z, daylight);
    e.light = 0.2 + 0.8 * Math.max(L.v, w.dim === 'cinder' ? 0.55 : w.dim === 'hollow' ? 0.6 : 0);
    if (def.undead && L.sky >= 1 && daylight > 0.6 && !inWater) e.fire = Math.max(e.fire, 3);
    if (def.nightOnly && daylight > 0.6) { e.hp -= dt * 4; if (e.hp <= 0) { this.removeMob(e); return; } }
    if (inLava && !def.fireproof) e.fire = 8;
    if (inWater || def.fireproof) e.fire = 0;
    if (def.boss) { this.updateWarden(e, dt, toP, distP); return; }
    if (def.crystal) { e.model.root.position.copy(e.pos); e.model.parts.body.rotation.y += dt * 1.5; e.model.parts.body.rotation.x += dt; e.model.root.position.y += Math.sin(e.age * 2) * 0.2; return; }
    if (e.fire > 0) {
      e.fire -= dt;
      if (Math.floor(e.fire * 2) !== Math.floor((e.fire + dt) * 2)) { e.hurt = 0; this.damageMob(e, 1, null, null); }
      if (Math.random() < 0.3) this.particles.spawn(e.pos.x + (Math.random() - 0.5) * e.w, e.pos.y + Math.random() * e.h, e.pos.z + (Math.random() - 0.5) * e.w, [1, 0.6, 0.1], 0.5, 0.4);
      if (e.dead) return;
    }
    const aggressive = def.hostile || (def.neutral && ai.angry);
    if (aggressive && survival && distP < (def.flyer ? 32 : 24)) {
      ai.target = pl;
    } else if (aggressive && (distP > 40 || !survival)) ai.target = null;
    if (aggressive && !g.peaceful && ai.target === pl && survival) {
      const flat = new THREE.Vector3(toP.x, 0, toP.z); const fd = flat.length(); flat.normalize();
      const canSee = distP < 20 && this.lineOfSight(e, pl);
      if (def.ranged && !def.flyer) {
        if (fd > 10) { moveX = flat.x; moveZ = flat.z; }
        else if (fd < 6) { moveX = -flat.x; moveZ = -flat.z; }
        else { moveX = -flat.z * Math.sin(e.age * 0.7); moveZ = flat.x * Math.sin(e.age * 0.7); speed *= 0.6; }
        if (canSee && e.shotCd <= 0) {
          e.shotCd = 2 + Math.random();
          const from = new THREE.Vector3(e.pos.x, e.pos.y + e.h * 0.8, e.pos.z);
          const tgt = new THREE.Vector3(pl.pos.x, pl.pos.y + 1.1, pl.pos.z);
          const dir = tgt.sub(from); dir.y += dir.length() * 0.06; dir.normalize();
          dir.x += (Math.random() - 0.5) * 0.08; dir.z += (Math.random() - 0.5) * 0.08;
          this.shoot(from.addScaledVector(dir, 0.6), dir.normalize(), 22, e, 'arrow');
          g.audio.play('bow');
        }
      } else if (def.flyer && def.teleporter) {
        e.vel.y += ((pl.pos.y + 1) - e.pos.y) * dt * 3;
        moveX = flat.x; moveZ = flat.z;
        if (distP < 1.8 && e.attackCd <= 0) { e.attackCd = 1.2; const kb = flat.clone().multiplyScalar(6); kb.y = 4; pl.damage(def.dmg, def.name, kb); }
      } else if (def.flyer) {
        const tgtY = pl.pos.y + (def.shot === 'fire' && e.type === 'sentinel' ? 2 : def.melee ? 1 : 3);
        e.vel.y += (tgtY - e.pos.y) * dt * 2;
        if (fd > 8) { moveX = flat.x; moveZ = flat.z; } else if (fd < 5) { moveX = -flat.x; moveZ = -flat.z; }
        if (canSee && e.shotCd <= 0) {
          if (def.burst) { e.burstLeft = (e.burstLeft || def.burst) - 1; e.shotCd = e.burstLeft > 0 ? 0.35 : 4; if (e.burstLeft <= 0) e.burstLeft = 0; }
          else e.shotCd = 3;
          const from = new THREE.Vector3(e.pos.x, e.pos.y + e.h * 0.6, e.pos.z);
          const dir = new THREE.Vector3(pl.pos.x, pl.pos.y + 1.2, pl.pos.z).sub(from).normalize();
          dir.x += (Math.random() - 0.5) * 0.06; dir.y += (Math.random() - 0.5) * 0.06; dir.normalize();
          this.shoot(from.addScaledVector(dir, 0.8), dir, def.shot === 'fire' ? 16 : 14, e, def.shot || 'spark');
          g.audio.play(def.shot === 'fire' ? 'fire' : 'spark');
        }
      } else if (def.exploder) {
        if (e.fuse > 0) {
          e.fuse += dt;
          if (distP > 6) e.fuse = 0;
          if (e.fuse > 1.6) { this.removeMob(e); this.explode(e.pos.x, e.pos.y + 0.5, e.pos.z, 3); return; }
        } else if (distP < 2.6 && canSee) { e.fuse = 0.01; g.audio.play('hiss'); }
        else { moveX = flat.x; moveZ = flat.z; }
      } else {
        moveX = flat.x; moveZ = flat.z;
        if (fd < 1 + e.w / 2 && Math.abs(toP.y) < 1.6 && e.attackCd <= 0) {
          e.attackCd = 1;
          const kb = flat.clone().multiplyScalar(5); kb.y = 4;
          if (pl.damage(def.dmg * (e.type === 'blob' ? (e.size === 2 ? 1 : 0.34) : 1), def.name, kb)) { if (def.burns) pl.fire = 4; if (def.wither) pl.poison = Math.max(pl.poison, 4); }
          if (e.model.parts.ar) e.swing = 0.3;
        }
      }
      e.yaw = Math.atan2(flat.x, flat.z);
    } else {
      // wander / flee / follow food
      ai.t -= dt;
      const held = g.inv.held();
      const lure = def.passive && def.food && held && held.key === def.food && distP < 8 && survival;
      if (ai.flee > 0) {
        ai.flee -= dt; speed *= 1.8;
        if (ai.t <= 0) { ai.t = 1; const a = Math.random() * 6.28; ai.tx = e.pos.x + Math.cos(a) * 8; ai.tz = e.pos.z + Math.sin(a) * 8; }
      } else if (lure) { ai.tx = pl.pos.x; ai.tz = pl.pos.z; ai.t = 0.5; }
      else if (e.love > 0) {
        e.love -= dt;
        const mate = this.list.find(o => o !== e && o.type === e.type && o.love > 0 && !o.baby && o.pos.distanceTo(e.pos) < 8);
        if (mate) {
          ai.tx = mate.pos.x; ai.tz = mate.pos.z;
          if (mate.pos.distanceTo(e.pos) < 1.5) { e.love = 0; mate.love = 0; this.spawnMob(e.type, e.pos.x, e.pos.y + 0.3, e.pos.z, { baby: true }); for (let i = 0; i < 8; i++) this.particles.spawn(e.pos.x, e.pos.y + 1, e.pos.z, [1, 0.4, 0.5], 1, 0.6); }
        }
      } else if (ai.t <= 0) {
        ai.t = 2 + Math.random() * 6;
        if (Math.random() < 0.6) { const a = Math.random() * 6.28, r = 2 + Math.random() * 6; ai.tx = e.pos.x + Math.cos(a) * r; ai.tz = e.pos.z + Math.sin(a) * r; }
        else { ai.tx = e.pos.x; ai.tz = e.pos.z; }
      }
      const dx = ai.tx - e.pos.x, dz = ai.tz - e.pos.z, dd = Math.hypot(dx, dz);
      if (dd > (lure ? 2 : 0.5)) { moveX = dx / dd; moveZ = dz / dd; speed *= (ai.flee > 0 || lure) ? 1 : 0.5; e.yaw = Math.atan2(moveX, moveZ); }
      if (def.flyer) e.vel.y += (Math.sin(e.age) * 0.5) * dt;
      if (def.eggs && Math.random() < dt / 300) this.dropItem('egg', 1, e.pos.x, e.pos.y + 0.3, e.pos.z);
      if (e.type === 'sheep' && e.sheared && Math.random() < dt / 60) { const below = w.getBlock(Math.floor(e.pos.x), Math.floor(e.pos.y - 0.5), Math.floor(e.pos.z)); if (below === BH.ID.grass) { w.setBlock(Math.floor(e.pos.x), Math.floor(e.pos.y - 0.5), Math.floor(e.pos.z), BH.ID.dirt); e.sheared = false; this.colorSheep(e); } }
    }
    // hopping blobs
    if (def.hopper) {
      if (e.onGround) { if ((moveX || moveZ) && Math.random() < dt * 1.2) { e.vel.y = 7; e.vel.x = moveX * 4; e.vel.z = moveZ * 4; } else { e.vel.x *= 0.5; e.vel.z *= 0.5; } }
      moveX = moveZ = 0;
    }
    // physics
    const accel = e.onGround ? 20 : 6;
    if (!def.hopper) {
      e.vel.x += (moveX * speed * (e.baby ? 1.3 : 1) - e.vel.x) * Math.min(1, accel * dt);
      e.vel.z += (moveZ * speed * (e.baby ? 1.3 : 1) - e.vel.z) * Math.min(1, accel * dt);
    }
    if (def.flyer) { e.vel.y *= 0.92; }
    else if (inWater) { e.vel.y = Math.min(e.vel.y + 18 * dt, 2); e.vel.x *= 0.9; e.vel.z *= 0.9; }
    else { e.vel.y -= (def.floaty && e.vel.y < 0 ? 8 : 26) * dt; if (def.floaty && e.vel.y < -2) e.vel.y = -2; }
    if ((e.hitX || e.hitZ) && (moveX || moveZ)) {
      if (def.climbs) e.vel.y = 3;
      else if (e.onGround) wantJump = true;
    }
    if (wantJump && e.onGround) e.vel.y = 8;
    const fallStart = e.vel.y;
    moveEntity(w, e, e.vel.x * dt, e.vel.y * dt, e.vel.z * dt);
    if (e.onGround && fallStart < -14 && !def.floaty && !def.climbs) this.damageMob(e, Math.floor((-fallStart - 12) / 2), null, null);
    if (e.dead) return;
    // despawn
    if ((def.hostile || def.neutral) && !def.boss && distP > 72) { this.removeMob(e); return; }
    if (e.pos.y < -20) { this.removeMob(e); return; }
    // animate
    const sp = Math.hypot(e.vel.x, e.vel.z);
    e.walk += sp * dt * 3;
    const r = e.model.root, P = e.model.parts;
    r.position.copy(e.pos);
    let ry = r.rotation.y, diff = e.yaw - ry;
    while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    r.rotation.y = ry + diff * Math.min(1, dt * 10);
    const sw = Math.sin(e.walk) * Math.min(1, sp) * 0.8;
    for (let i = 0; i < 6; i++) if (P['l' + i]) {
      if (e.type === 'crawler') P['l' + i].rotation.y = Math.sin(e.walk * 2 + i) * 0.3;
      else if (e.type === 'wisp') P['l' + i].rotation.x = Math.sin(e.age * 4 + i) * 0.4;
      else P['l' + i].rotation.x = (i % 2 === 0 ? 1 : -1) * (i >= 2 && i < 4 ? -1 : 1) * sw;
    }
    if (P.wl) { const f = e.onGround ? 0 : Math.sin(e.age * 30) * 0.6; P.wl.rotation.z = -f; P.wr.rotation.z = f; }
    if (P.head && !def.hopper) {
      const look = (distP < 8 && survival) ? Math.atan2(toP.x, toP.z) - r.rotation.y : 0;
      let lk = look; while (lk > Math.PI) lk -= Math.PI * 2; while (lk < -Math.PI) lk += Math.PI * 2;
      P.head.rotation.y = Math.max(-0.8, Math.min(0.8, lk));
    }
    if (e.swing > 0) { e.swing -= dt; if (P.ar) P.ar.rotation.x = -1.25 - Math.sin(e.swing * 10) * 0.6; }
    if (def.hopper) { const sq = e.onGround ? 1 : 1.15; P.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)); }
    if (def.flyer) r.position.y += Math.sin(e.age * 2) * 0.1;
    // shading: light, hurt flash, fuse flash
    const flash = e.hurt > 0.3 || (e.fuse > 0 && Math.floor(e.fuse * 8) % 2 === 0);
    e.model.mats.forEach(m => {
      if (!m.userData.base) return;
      m.color.copy(m.userData.base).multiplyScalar(m.userData.emissive ? 1 : e.light);
      if (flash) m.color.lerp(e.fuse > 0 ? new THREE.Color(0xffffff) : new THREE.Color(0xff3030), 0.6);
    });
    if (e.fuse > 0) { const s = 1 + e.fuse * 0.12; r.scale.set(s, s, s); }
  };

  Entities.prototype.pearlLand = function (p) {
    const pl = this.game.player;
    if (p.owner !== pl || pl.dead) return;
    for (let i = 0; i < 16; i++) this.particles.spawn(p.pos.x, p.pos.y, p.pos.z, [0.4, 0.8, 0.9], 1.2, 0.6);
    pl.pos.set(p.pos.x, p.pos.y, p.pos.z);
    // nudge out of blocks
    for (let k = 0; k < 4 && BH.boxHits(this.game.world, pl.pos.x - 0.3, pl.pos.y, pl.pos.z - 0.3, pl.pos.x + 0.3, pl.pos.y + 1.8, pl.pos.z + 0.3); k++) pl.pos.y += 1;
    pl.vel.set(0, 0, 0); pl.fall = 0;
    pl.damage(2, 'fall', null, true);
    this.game.audio.play('teleport');
  };
  // The Hollow Warden: orbits, fires void bolts, dives at the player; healed by Warding Crystals.
  Entities.prototype.updateWarden = function (e, dt, toP, distP) {
    const g = this.game, pl = g.player, ai = e.ai;
    ai.t = (ai.t || 0) + dt;
    ai.state = ai.state || 'circle';
    e.hurt = Math.max(0, e.hurt - dt);
    const crystals = this.list.filter(c => c.def.crystal && !c.dead);
    if (crystals.length && e.hp < e.def.hp) e.hp = Math.min(e.def.hp, e.hp + crystals.length * 0.6 * dt);
    // beams
    if (!e.beams) { e.beams = new THREE.Group(); g.scene.add(e.beams); }
    while (e.beams.children.length) { const b = e.beams.children.pop(); b.geometry.dispose(); }
    crystals.forEach(c => {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(c.pos.x, c.pos.y + 1, c.pos.z), new THREE.Vector3(e.pos.x, e.pos.y + 1.5, e.pos.z)]);
      e.beams.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xc0a0ff })));
    });
    const target = new THREE.Vector3();
    const survival = g.mode === 'survival' && !pl.dead;
    if (ai.state === 'circle') {
      const a = ai.t * 0.35 + (ai.phase || 0);
      target.set(Math.cos(a) * 34, 84 + Math.sin(ai.t) * 4, Math.sin(a) * 34);
      e.shotCd -= dt;
      if (survival && e.shotCd <= 0 && distP < 70) {
        e.shotCd = crystals.length ? 2.4 : 1.6;
        const from = new THREE.Vector3(e.pos.x, e.pos.y + 1.5, e.pos.z);
        const dir = new THREE.Vector3(pl.pos.x, pl.pos.y + 1, pl.pos.z).sub(from).normalize();
        this.shoot(from.addScaledVector(dir, 2.4), dir, 18, e, 'void');
        g.audio.play('spark');
      }
      if (ai.t > 9 && survival) { ai.state = Math.random() < 0.7 ? 'dive' : 'summon'; ai.t = 0; g.audio.play('roar'); }
    } else if (ai.state === 'dive') {
      target.set(pl.pos.x, pl.pos.y + 0.5, pl.pos.z);
      if (distP < 3 && e.attackCd <= 0) {
        e.attackCd = 1.5;
        const kb = new THREE.Vector3(toP.x, 0, toP.z).normalize().multiplyScalar(14); kb.y = 10;
        pl.damage(10, e.def.name, kb);
        ai.state = 'circle'; ai.t = 0; ai.phase = Math.random() * 6;
      }
      if (ai.t > 4) { ai.state = 'circle'; ai.t = 0; }
    } else if (ai.state === 'summon') {
      target.set(0, 80, 0);
      if (ai.t > 1.5 && !ai.summoned) {
        ai.summoned = true;
        for (let i = 0; i < 2; i++) { const d = this.spawnMob('drifter', e.pos.x + (Math.random() - 0.5) * 6, e.pos.y, e.pos.z + (Math.random() - 0.5) * 6); d.ai.angry = true; }
      }
      if (ai.t > 3) { ai.state = 'circle'; ai.t = 0; ai.summoned = false; }
    }
    e.attackCd -= dt;
    const sp = ai.state === 'dive' ? 16 : 9;
    const d = target.sub(e.pos); const dl = d.length();
    if (dl > 0.1) e.vel.copy(d.multiplyScalar(Math.min(sp, dl * 2) / dl)); else e.vel.set(0, 0, 0);
    e.pos.addScaledVector(e.vel, dt);
    const r = e.model.root;
    r.position.copy(e.pos);
    r.rotation.y = Math.atan2(toP.x, toP.z);
    for (let i = 0; i < 8; i++) { const p = e.model.parts['p' + i]; const a = i / 8 * 6.28 + e.age * 0.8; p.position.set(Math.cos(a) * 2.7, 1.5 + Math.sin(e.age * 2 + i) * 0.3, Math.sin(a) * 2.7); p.rotation.y = -a + Math.PI / 2; }
    const flash = e.hurt > 0.3;
    e.model.mats.forEach(m => { if (!m.userData.base) return; m.color.copy(m.userData.base); if (flash) m.color.lerp(new THREE.Color(0xff3030), 0.6); });
    if (Math.random() < 0.3) this.particles.spawn(e.pos.x + (Math.random() - 0.5) * 3, e.pos.y + Math.random() * 3, e.pos.z + (Math.random() - 0.5) * 3, [0.5, 0.3, 0.8], 0.3, 0.6);
  };
  // Monster Cages spawn their creature near the player.
  Entities.prototype.updateCages = function () {
    const g = this.game, w = g.world, pl = g.player;
    if (g.peaceful || g.mode !== 'survival') return;
    const pcx = Math.floor(pl.pos.x / 16), pcz = Math.floor(pl.pos.z / 16);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const ch = w.chunk(pcx + a, pcz + b); if (!ch || !ch.cages.size) continue;
      ch.cages.forEach((mob, i) => {
        const lx = i % 16, lz = ((i / 16) | 0) % 16, y = (i / 256) | 0;
        const x = ch.cx * 16 + lx, z = ch.cz * 16 + lz;
        if (w.getBlock(x, y, z) !== BH.ID.monster_cage) return;
        if (Math.hypot(x - pl.pos.x, y - pl.pos.y, z - pl.pos.z) > 16) return;
        const near = this.list.filter(e => e.type === mob && e.pos.distanceTo(new THREE.Vector3(x, y, z)) < 9).length;
        if (near >= 4 || Math.random() < 0.5) return;
        for (let t = 0; t < 6; t++) {
          const sx = x + Math.floor((Math.random() - 0.5) * 8), sz = z + Math.floor((Math.random() - 0.5) * 8), sy = y + Math.floor((Math.random() - 0.5) * 3);
          if (!w.getBlock(sx, sy, sz) && !w.getBlock(sx, sy + 1, sz) && (BH.MOBS[mob].flyer || BH.BLOCKS[w.getBlock(sx, sy - 1, sz)].solid)) {
            this.spawnMob(mob, sx + 0.5, sy, sz + 0.5);
            for (let k = 0; k < 8; k++) this.particles.spawn(x + 0.5, y + 0.5, z + 0.5, [0.9, 0.3, 0.2], 0.8, 0.5);
            break;
          }
        }
      });
    }
  };
  Entities.prototype.dimSpawn = function () {
    const g = this.game, w = g.world, pl = g.player;
    let hostile = 0; this.list.forEach(e => { if (!e.def.passive && !e.def.boss && !e.def.crystal) hostile++; });
    if (hostile >= (w.dim === 'cinder' ? 16 : 10) || g.peaceful) return;
    const a = Math.random() * 6.28, r = 20 + Math.random() * 30;
    const x = Math.floor(pl.pos.x + Math.cos(a) * r), z = Math.floor(pl.pos.z + Math.sin(a) * r);
    if (!w.loaded(x, z)) return;
    const y0 = Math.floor(pl.pos.y + (Math.random() - 0.5) * 30);
    for (let y = Math.min(120, y0 + 10); y > Math.max(2, y0 - 20); y--) {
      const b = w.getBlock(x, y - 1, z);
      if (!b || !BH.BLOCKS[b].solid || w.getBlock(x, y, z) || w.getBlock(x, y + 1, z)) continue;
      if (w.dim === 'cinder') {
        const r2 = Math.random();
        const type = r2 < 0.3 ? 'imp' : r2 < 0.75 ? 'hound' : r2 < 0.9 ? 'wraith' : 'blob';
        if (type === 'imp' && (w.getBlock(x, y + 2, z) || w.getBlock(x, y + 3, z))) return;
        this.spawnMob(type, x + 0.5, type === 'imp' ? y + 2 : y, z + 0.5);
      } else if (b === BH.ID.voidstone) this.spawnMob('drifter', x + 0.5, y, z + 0.5);
      return;
    }
  };
  Entities.prototype.lineOfSight = function (e, pl) {
    const from = new THREE.Vector3(e.pos.x, e.pos.y + e.h * 0.85, e.pos.z);
    const to = new THREE.Vector3(pl.pos.x, pl.pos.y + pl.eye, pl.pos.z);
    const dir = to.clone().sub(from); const d = dir.length(); dir.normalize();
    const hit = this.game.world.raycast(from, dir, d);
    return !hit || (hit.id && !BH.BLOCKS[hit.id].solid);
  };

  Entities.prototype.trySpawn = function () {
    const g = this.game, w = g.world, pl = g.player;
    if (g.mode !== 'survival' && g.mode !== 'creative') return;
    if (w.dim !== 'over') { this.dimSpawn(); return; }
    let passive = 0, hostile = 0;
    this.list.forEach(e => { if (e.def.hostile || e.def.neutral) hostile++; else if (!e.def.npc) passive++; });
    const a = Math.random() * 6.28, r = 24 + Math.random() * 32;
    const x = Math.floor(pl.pos.x + Math.cos(a) * r), z = Math.floor(pl.pos.z + Math.sin(a) * r);
    if (!w.loaded(x, z)) return;
    const bio = w.biomeAt(x, z);
    // pick a y: surface, or a random cave floor
    let y;
    const surf = w.surfaceY(x, z);
    const underground = Math.random() < 0.5;
    if (underground) {
      y = 5 + Math.floor(Math.random() * Math.max(1, surf - 8));
      let found = false;
      for (let k = 0; k < 16 && y > 2; k++, y--) {
        if (!w.getBlock(x, y, z) && !w.getBlock(x, y + 1, z) && BH.BLOCKS[w.getBlock(x, y - 1, z)].solid) { found = true; break; }
      }
      if (!found) return;
    } else y = surf + 1;
    if (w.getBlock(x, y, z) || w.getBlock(x, y + 1, z)) return;
    const below = w.getBlock(x, y - 1, z);
    if (!below || !BH.BLOCKS[below].solid || BH.BLOCKS[below].leaves) return;
    const L = lightAt(w, x, y, z, g.daylight);
    if (L.v < 0.35 && hostile < 18 && !g.peaceful) {
      if (L.bl > 0.45) return;
      let type;
      if (bio.key === 'mushroom_fields') return;
      const rr = Math.random();
      if (bio.key === 'swamp' && !underground && rr < 0.3) type = 'blob';
      else if (!underground && rr < 0.12 && g.daylight < 0.3) type = 'wisp';
      else if (!underground && rr < 0.17 && g.daylight < 0.3) type = 'drifter';
      else if (underground && rr < 0.08) type = 'blob';
      else type = ['shambler', 'shambler', 'archer', 'crawler', 'beetle'][Math.floor(Math.random() * 5)];
      if (type === 'crawler' && (w.getBlock(x + 1, y, z) || w.getBlock(x, y, z + 1))) return;
      this.spawnMob(type, x + 0.5, type === 'wisp' ? y + 4 : y, z + 0.5);
    } else if (!underground && L.sky >= 1 && passive < 14 && (below === BH.ID.grass || below === BH.ID.snowy_grass) && Math.random() < 0.25) {
      const opts = bio.key === 'mushroom_fields' ? ['cow'] : bio.cold ? ['sheep', 'chicken'] : ['pig', 'cow', 'sheep', 'chicken'];
      const type = opts[Math.floor(Math.random() * opts.length)];
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const xx = x + Math.floor((Math.random() - 0.5) * 4), zz = z + Math.floor((Math.random() - 0.5) * 4);
        const yy = w.surfaceY(xx, zz) + 1;
        if (Math.abs(yy - y) < 3) this.spawnMob(type, xx + 0.5, yy, zz + 0.5);
      }
    }
  };

  // Ray against mobs: returns nearest mob hit within maxD.
  Entities.prototype.rayMob = function (o, dir, maxD) {
    let best = null, bd = maxD;
    for (const e of this.list) {
      if (e.dead) continue;
      const hw = e.w / 2 + 0.05;
      const min = [e.pos.x - hw, e.pos.y, e.pos.z - hw], max = [e.pos.x + hw, e.pos.y + e.h, e.pos.z + hw];
      let t0 = 0, t1 = bd;
      const oo = [o.x, o.y, o.z], dd = [dir.x, dir.y, dir.z];
      let ok = true;
      for (let k = 0; k < 3; k++) {
        if (Math.abs(dd[k]) < 1e-8) { if (oo[k] < min[k] || oo[k] > max[k]) { ok = false; break; } continue; }
        let a = (min[k] - oo[k]) / dd[k], b = (max[k] - oo[k]) / dd[k];
        if (a > b) { const t = a; a = b; b = t; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        if (t0 > t1) { ok = false; break; }
      }
      if (ok && t0 < bd) { bd = t0; best = e; }
    }
    return best ? { mob: best, dist: bd } : null;
  };

  // ---------- particles (one Points object, CPU-updated)
  function Particles(scene) {
    this.max = 1500;
    this.pos = new Float32Array(this.max * 3);
    this.col = new Float32Array(this.max * 3);
    this.vel = new Float32Array(this.max * 3);
    this.life = new Float32Array(this.max);
    this.n = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo = g;
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.12, vertexColors: true }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  Particles.prototype.spawn = function (x, y, z, c, speed, life) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = (Math.random() - 0.5) * 4 * speed; this.vel[i * 3 + 1] = Math.random() * 4 * speed; this.vel[i * 3 + 2] = (Math.random() - 0.5) * 4 * speed;
    const v = 0.8 + Math.random() * 0.4;
    this.col[i * 3] = c[0] * v; this.col[i * 3 + 1] = c[1] * v; this.col[i * 3 + 2] = c[2] * v;
    this.life[i] = life * (0.6 + Math.random() * 0.6);
  };
  Particles.prototype.update = function (dt) {
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const j = --this.n;
        for (let k = 0; k < 3; k++) { this.pos[i * 3 + k] = this.pos[j * 3 + k]; this.vel[i * 3 + k] = this.vel[j * 3 + k]; this.col[i * 3 + k] = this.col[j * 3 + k]; }
        this.life[i] = this.life[j]; i--; continue;
      }
      this.vel[i * 3 + 1] -= 18 * dt;
      for (let k = 0; k < 3; k++) this.pos[i * 3 + k] += this.vel[i * 3 + k] * dt;
    }
    this.geo.setDrawRange(0, this.n);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  };

  BH.Entities = Entities;
  BH.MOBS = MOBS;
  BH.moveEntity = moveEntity;
  BH.inBlock = inBlock;
  BH.lightAt = lightAt;
  BH.shadeObject = shadeObject;
  BH.boxHits = boxHits;
})();
