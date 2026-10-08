// Site NADIR: the four-level black site under Camp Greaves. Each level is built on first visit in its own
// space east of the county map and reached by elevator. Rooms sit on a 2 m grid; walls, doors and the
// enemy flow field all come from that grid.
var NF = window.NF || (window.NF = {});
NF.bunker = (function () {
  var B = { active: false, level: -1, X0: 12000, CELL: 2, levels: [] };
  var C = 2, PI = Math.PI, V3, scene, W, std;
  function LZ(i) { return i * 400; }
  B.LZ = LZ;
  B.DANGER = [5, 6, 6, 6];
  // ------------------------------------------------------------------ the levels
  // rooms: key: [name, gx, gz, w, d, opts] in cells. links: [a, b, width, opts] open a doorway in the shared wall.
  var LEVELS = [
    { id: 'b1', name: 'B1 · Security & Barracks', short: 'B1', depth: 40, style: 'mil',
      rooms: {
        lobby: ['Elevator Lobby', 36, 2, 10, 8, { h: 5, kind: 'lobby' }],
        spine: ['Central Corridor', 39, 10, 4, 40, { kind: 'corridor' }],
        check: ['Security Checkpoint', 30, 10, 9, 8, { kind: 'checkpoint' }],
        barA: ['Barracks A', 22, 18, 17, 12, { kind: 'barracks' }],
        wash: ['Washroom', 30, 30, 9, 8, { kind: 'wash' }],
        mess: ['Mess Hall', 20, 38, 19, 12, { h: 5, kind: 'mess' }],
        armory: ['Armory', 43, 10, 10, 8, { kind: 'armory' }],
        barB: ['Barracks B', 43, 18, 15, 12, { kind: 'barracks' }],
        infirm: ['Infirmary', 43, 30, 11, 10, { kind: 'infirmary' }],
        qm: ['Quartermaster\'s Office', 43, 40, 8, 8, { kind: 'safe', safe: true }],
        east: ['East Passage', 54, 30, 4, 10, { kind: 'corridor' }],
        motor: ['Motor Pool', 58, 18, 20, 22, { h: 7, kind: 'motor' }],
        ramp: ['Vehicle Ramp', 66, 40, 6, 10, { h: 6, kind: 'corridor' }],
        south: ['South Corridor', 16, 50, 54, 4, { kind: 'corridor' }],
        command: ['Command Center', 28, 54, 22, 14, { h: 5, kind: 'command' }],
        comms: ['Signals Room', 52, 54, 8, 8, { kind: 'office' }],
        cells: ['Holding Cells', 4, 44, 12, 22, { kind: 'cells' }],
        gen: ['Generator Hall', 60, 54, 18, 14, { h: 7, kind: 'generator' }]
      },
      links: [['lobby', 'spine', 2], ['spine', 'check', 1], ['check', 'barA', 1], ['spine', 'barA', 1], ['spine', 'wash', 1], ['wash', 'mess', 1], ['spine', 'mess', 2],
        ['spine', 'armory', 1, { lock: 'b1key', msg: 'ARMORY — authorised personnel. The reader wants an armory key card.' }], ['spine', 'barB', 1], ['spine', 'infirm', 1], ['spine', 'qm', 1],
        ['infirm', 'east', 1], ['east', 'motor', 1], ['motor', 'ramp', 2], ['ramp', 'south', 2], ['spine', 'south', 2], ['mess', 'south', 2], ['south', 'command', 2],
        ['south', 'comms', 1], ['south', 'gen', 2], ['south', 'cells', 2]] },
    { id: 'b2', name: 'B2 · Research Wing', short: 'B2', depth: 75, style: 'lab',
      rooms: {
        lobby: ['Elevator Lobby', 36, 2, 10, 8, { h: 5, kind: 'lobby' }],
        nh: ['North Hall', 14, 10, 54, 4, { kind: 'corridor' }],
        wh: ['West Hall', 14, 14, 4, 44, { kind: 'corridor' }],
        eh: ['East Hall', 64, 14, 4, 44, { kind: 'corridor' }],
        sh: ['South Hall', 14, 58, 54, 4, { kind: 'corridor' }],
        gen: ['Genetics Lab', 18, 14, 16, 14, { kind: 'lab' }],
        off: ['Office Block', 34, 14, 14, 14, { kind: 'office' }],
        vir: ['Virology Lab', 48, 14, 16, 14, { kind: 'lab' }],
        atr: ['Central Atrium', 26, 28, 30, 16, { h: 9, kind: 'atrium' }],
        cryo: ['Cryo Storage', 18, 28, 8, 16, { kind: 'cryo' }],
        serv: ['Server Room', 56, 28, 8, 16, { kind: 'server' }],
        surg: ['Surgery', 18, 44, 16, 14, { kind: 'surgery' }],
        rec: ['Records', 34, 44, 10, 14, { kind: 'office' }],
        sup: ['Supply Closet', 44, 44, 8, 8, { kind: 'safe', safe: true }],
        decon: ['Decontamination', 44, 52, 8, 6, { kind: 'wash' }],
        spec: ['Specimen Lab', 52, 44, 12, 14, { h: 6, kind: 'tanks' }],
        reac: ['Reactor Control', 68, 26, 16, 20, { h: 9, kind: 'reactor' }],
        pens: ['Animal Pens', 0, 20, 14, 20, { kind: 'pens' }],
        inc: ['Incinerator', 30, 62, 20, 10, { h: 6, kind: 'incinerator' }]
      },
      links: [['lobby', 'nh', 2], ['nh', 'wh', 2], ['nh', 'eh', 2], ['wh', 'sh', 2], ['eh', 'sh', 2], ['nh', 'gen', 1], ['nh', 'off', 1], ['nh', 'vir', 1], ['wh', 'gen', 1],
        ['wh', 'cryo', 1], ['wh', 'surg', 1], ['eh', 'vir', 1], ['eh', 'serv', 1], ['eh', 'spec', 1], ['sh', 'surg', 1], ['sh', 'rec', 1], ['sh', 'decon', 1], ['sh', 'spec', 1],
        ['gen', 'atr', 1], ['off', 'atr', 2], ['vir', 'atr', 1], ['cryo', 'atr', 1], ['serv', 'atr', 1], ['rec', 'atr', 1], ['sup', 'atr', 1], ['spec', 'atr', 1], ['sup', 'decon', 1],
        ['eh', 'reac', 2, { lock: 'b2key', msg: 'REACTOR CONTROL — Level 3 access. The reader wants a reactor access card.' }], ['wh', 'pens', 1], ['sh', 'inc', 2]] },
    { id: 'b3', name: 'B3 · Containment', short: 'B3', depth: 110, style: 'dark',
      rooms: {
        lobby: ['Elevator Lobby', 36, 2, 10, 8, { h: 5, kind: 'lobby' }],
        spine: ['Containment Spine', 38, 10, 6, 50, { h: 5, kind: 'corridor' }],
        ca: ['Cell Block A', 20, 12, 18, 14, { kind: 'cells' }],
        cb: ['Cell Block B', 44, 12, 18, 14, { kind: 'cells' }],
        cc: ['Cell Block C', 20, 30, 18, 14, { kind: 'cells' }],
        cd: ['Cell Block D', 44, 30, 18, 14, { kind: 'cells' }],
        guard: ['Guard Post', 44, 44, 8, 8, { kind: 'safe', safe: true }],
        obs: ['Observation Deck', 26, 44, 12, 8, { kind: 'office' }],
        tank: ['Tank Hall', 8, 44, 18, 20, { h: 8, kind: 'tanks' }],
        waste: ['Bio-Waste', 26, 52, 12, 12, { kind: 'incinerator' }],
        arena: ['Holding Arena', 44, 52, 30, 24, { h: 11, kind: 'arena' }],
        pens: ['Stalker Pens', 62, 12, 14, 32, { h: 6, kind: 'pens' }]
      },
      links: [['lobby', 'spine', 2], ['spine', 'ca', 2], ['spine', 'cb', 2], ['spine', 'cc', 2], ['spine', 'cd', 2], ['spine', 'guard', 1], ['spine', 'obs', 1], ['obs', 'tank', 1],
        ['tank', 'waste', 1], ['spine', 'waste', 1], ['spine', 'arena', 3, { lock: 'arena', event: true, msg: 'HOLDING ARENA — SUBJECT G-7. Override the containment seal?' }],
        ['cb', 'pens', 1, { lock: 'b3key', msg: 'PEN ACCESS — the reader wants a handler\'s key card.' }], ['cd', 'pens', 1, { lock: 'b3key', msg: 'PEN ACCESS — the reader wants a handler\'s key card.' }]] },
    { id: 'b4', name: 'B4 · The Core', short: 'B4', depth: 160, style: 'core',
      rooms: {
        lobby: ['Elevator Lobby', 36, 2, 10, 8, { h: 5, kind: 'lobby' }],
        tunnel: ['Descent Tunnel', 39, 10, 4, 20, { h: 5, kind: 'tunnel' }],
        maint: ['Maintenance Bay', 43, 14, 8, 8, { kind: 'safe', safe: true }],
        ante: ['Core Antechamber', 30, 30, 22, 10, { h: 7, kind: 'hall' }],
        cool: ['Cooling Gallery', 8, 30, 22, 10, { h: 6, kind: 'cooling' }],
        vault: ['Prototype Vault', 52, 30, 14, 10, { kind: 'vault' }],
        core: ['The Core', 20, 40, 42, 36, { h: 18, kind: 'core' }]
      },
      links: [['lobby', 'tunnel', 2], ['tunnel', 'maint', 1], ['tunnel', 'ante', 2], ['ante', 'cool', 1],
        ['ante', 'vault', 2, { lock: 'flag:nadirDead', msg: 'PROTOTYPE VAULT — sealed while the Core is in lockdown.' }],
        ['ante', 'core', 4, { lock: 'core', event: true, msg: 'THE CORE — biological hazard beyond. Open the blast door?' }]] }
  ];
  B.LEVEL_DEFS = LEVELS;
  // ------------------------------------------------------------------ grid
  var PX = 1, NX = 2, PZ = 4, NZ = 8;
  function prepare(i) {
    var def = LEVELS[i], L = { i: i, def: def, rooms: [], byKey: {}, openings: [], doors: [], errors: [] };
    var Wc = 0, Dc = 0;
    Object.keys(def.rooms).forEach(function (k, n) {
      var a = def.rooms[k], o = a[5] || {};
      var r = { key: k, n: n, name: a[0], gx: a[1], gz: a[2], w: a[3], d: a[4], h: o.h || 4, kind: o.kind || 'room', safe: !!o.safe };
      L.rooms.push(r); L.byKey[k] = r; Wc = Math.max(Wc, r.gx + r.w); Dc = Math.max(Dc, r.gz + r.d);
    });
    L.W = Wc + 1; L.D = Dc + 1;
    L.cell = new Int16Array(L.W * L.D).fill(-1); L.edge = new Uint8Array(L.W * L.D);
    L.rooms.forEach(function (r) {
      for (var z = r.gz; z < r.gz + r.d; z++) for (var x = r.gx; x < r.gx + r.w; x++) { var c = z * L.W + x; if (L.cell[c] >= 0) L.errors.push('overlap ' + r.key + ' with ' + L.rooms[L.cell[c]].key + ' at ' + x + ',' + z); L.cell[c] = r.n; }
    });
    // edges inside a room are open
    for (var z = 0; z < L.D; z++) for (var x = 0; x < L.W; x++) {
      var c = z * L.W + x, rr = L.cell[c]; if (rr < 0) continue;
      if (x + 1 < L.W && L.cell[c + 1] === rr) { L.edge[c] |= PX; L.edge[c + 1] |= NX; }
      if (z + 1 < L.D && L.cell[c + L.W] === rr) { L.edge[c] |= PZ; L.edge[c + L.W] |= NZ; }
    }
    def.links.forEach(function (lk) {
      var A = L.byKey[lk[0]], Bb = L.byKey[lk[1]], w = lk[2] || 1, o = lk[3] || {};
      if (!A || !Bb) { L.errors.push('bad link ' + lk[0] + '-' + lk[1]); return; }
      var cand = [];
      for (var z = A.gz; z < A.gz + A.d; z++) for (var x = A.gx; x < A.gx + A.w; x++) {
        [[1, 0, PX, NX], [-1, 0, NX, PX], [0, 1, PZ, NZ], [0, -1, NZ, PZ]].forEach(function (dd) {
          var nx = x + dd[0], nz = z + dd[1]; if (nx < 0 || nz < 0 || nx >= L.W || nz >= L.D) return;
          if (L.cell[nz * L.W + nx] === Bb.n) cand.push({ x: x, z: z, nx: nx, nz: nz, a: dd[2], b: dd[3], axis: dd[0] ? 'z' : 'x' });
        });
      }
      if (!cand.length) { L.errors.push('rooms not adjacent ' + lk[0] + '-' + lk[1]); return; }
      cand.sort(function (p, q) { return p.axis === 'z' ? p.z - q.z : p.x - q.x; });
      w = Math.min(w, cand.length); var s = Math.floor(o.at !== undefined ? (cand.length - w) * o.at : (cand.length - w) / 2);
      var edges = cand.slice(s, s + w);
      var e0 = edges[0], e1 = edges[edges.length - 1];
      // the doorway line in world space: axis 'x' means the wall runs along x at constant z
      var op = { a: A, b: Bb, edges: edges, w: w, lock: o.lock || null, msg: o.msg, event: !!o.event, id: def.id + '_' + lk[0] + '_' + lk[1] };
      if (e0.axis === 'x') { op.axis = 'x'; op.line = Math.max(e0.z, e0.nz); op.from = e0.x; op.to = e1.x + 1; }
      else { op.axis = 'z'; op.line = Math.max(e0.x, e0.nx); op.from = e0.z; op.to = e1.z + 1; }
      op.h = Math.max(A.h, Bb.h); op.dh = w >= 3 ? Math.min(op.h - 0.5, 6) : w === 2 ? 3.4 : 3.0;
      if (op.lock) L.doors.push(op); else { L.openings.push(op); setOpen(L, op, true); }
    });
    return L;
  }
  function setOpen(L, op, on) {
    op.edges.forEach(function (e) {
      var c1 = e.z * L.W + e.x, c2 = e.nz * L.W + e.nx;
      if (on) { L.edge[c1] |= e.a; L.edge[c2] |= e.b; } else { L.edge[c1] &= ~e.a; L.edge[c2] &= ~e.b; }
    });
  }
  B.prepare = prepare;
  // ------------------------------------------------------------------ materials
  var mats = null;
  function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; }
  function concrete(base, seed, panels, stain) {
    return canvasTex(256, 256, function (g, w, h) {
      var r = NF.tex.rnd(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 2600; i++) { g.fillStyle = (r() < 0.5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + (r() * 0.08).toFixed(3) + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
      for (var s = 0; s < (stain || 5); s++) { var x = r() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(20,14,8,0)'); gr.addColorStop(0.4 + r() * 0.4, 'rgba(30,18,10,' + (0.08 + r() * 0.12) + ')'); gr.addColorStop(1, 'rgba(20,14,8,0)'); g.fillStyle = gr; g.fillRect(x, 0, 4 + r() * 14, h); }
      if (panels) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(0, h / 2, w, 1); g.fillStyle = 'rgba(0,0,0,0.5)'; [[8, 8], [w - 8, 8], [8, h - 8], [w - 8, h - 8], [8, h / 2 - 6], [w - 8, h / 2 - 6]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 2.5, 0, 7); g.fill(); }); }
    });
  }
  function floorTex(kind) {
    return canvasTex(256, 256, function (g, w, h) {
      var r = NF.tex.rnd(kind === 'tile' ? 4 : kind === 'grate' ? 9 : 2);
      if (kind === 'grate') { g.fillStyle = '#1a1c1e'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a4e52'; for (var y = 0; y < h; y += 16) for (var x = 0; x < w; x += 16) { g.fillRect(x, y, 16, 3); g.fillRect(x, y, 3, 16); } g.fillStyle = 'rgba(120,60,20,0.25)'; for (var k = 0; k < 40; k++) g.fillRect(r() * w, r() * h, 6, 6); return; }
      g.fillStyle = kind === 'tile' ? '#b8bcb8' : '#5a5a56'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 2200; i++) { g.fillStyle = 'rgba(0,0,0,' + (r() * 0.08).toFixed(3) + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
      g.strokeStyle = kind === 'tile' ? 'rgba(60,70,70,0.6)' : 'rgba(0,0,0,0.4)'; g.lineWidth = kind === 'tile' ? 2 : 3;
      var step = kind === 'tile' ? 64 : 128; for (var p = 0; p <= w; p += step) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
      for (var d = 0; d < 6; d++) { var gr = g.createRadialGradient(r() * w, r() * h, 2, r() * w, r() * h, 40 + r() * 60); gr.addColorStop(0, 'rgba(30,20,10,0.22)'); gr.addColorStop(1, 'rgba(30,20,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    });
  }
  function hazardTex() { return canvasTex(128, 32, function (g, w, h) { g.fillStyle = '#d8a820'; g.fillRect(0, 0, w, h); g.fillStyle = '#141414'; for (var x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.closePath(); g.fill(); } }); }
  function initMats() {
    if (mats) return mats;
    var T = NF.tex;
    mats = {
      wall_mil: std({ map: concrete('#7a7a70', 3, true, 7), roughness: 0.92 }),
      wall_lab: std({ map: T.labwall(), roughness: 0.6, metalness: 0.05 }),
      wall_dark: std({ map: concrete('#4c4f52', 7, true, 9), roughness: 0.85, metalness: 0.15 }),
      wall_core: std({ map: concrete('#3e3a38', 11, false, 14), roughness: 0.95 }),
      floor_mil: std({ map: floorTex('concrete'), roughness: 0.85 }),
      floor_lab: std({ map: floorTex('tile'), roughness: 0.35 }),
      floor_dark: std({ map: floorTex('grate'), roughness: 0.6, metalness: 0.5 }),
      floor_core: std({ map: floorTex('concrete'), roughness: 0.9, color: '#8a7a70' }),
      ceil: std({ color: '#1c1e20', roughness: 1 }),
      metal: std({ map: T.metal(), metalness: 0.75, roughness: 0.4, color: '#8a9090' }),
      dark: std({ color: '#2a2c2e', metalness: 0.6, roughness: 0.5 }),
      olive: std({ color: '#4a5238', roughness: 0.8 }),
      wood: std({ map: T.wood(), color: '#8a6a4a', roughness: 0.7 }),
      cloth: std({ color: '#5e6052', roughness: 1 }),
      white: std({ color: '#d0d2cc', roughness: 0.45 }),
      rust: std({ color: '#6a3a22', roughness: 0.8, metalness: 0.4 }),
      teal: std({ color: '#2a6a5a', roughness: 0.5 }),
      hazard: std({ map: hazardTex(), roughness: 0.6 }),
      flesh: std({ map: T.flesh(), roughness: 0.4, color: '#c08070', emissive: '#200404' }),
      bone: std({ color: '#d8ccb0', roughness: 0.4 }),
      emit: new THREE.MeshBasicMaterial({ color: '#e8f2ff' }),
      red: new THREE.MeshBasicMaterial({ color: '#ff2a1a' }),
      green: new THREE.MeshBasicMaterial({ color: '#40ff80' }),
      amber: new THREE.MeshBasicMaterial({ color: '#ffb030' }),
      screen: std({ map: T.screen(2), emissive: '#ffffff', emissiveMap: T.screen(2), emissiveIntensity: 0.75 }),
      screen2: std({ map: T.screen(5), emissive: '#ffffff', emissiveMap: T.screen(5), emissiveIntensity: 0.75 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#99ccbb', transparent: true, opacity: 0.16, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }),
      liquid: std({ color: '#2a8a5a', emissive: '#0a6a3a', emissiveIntensity: 0.9, transparent: true, opacity: 0.5, depthWrite: false }),
      coolant: std({ color: '#2a6aa0', emissive: '#0a3a8a', emissiveIntensity: 1.1, transparent: true, opacity: 0.6, depthWrite: false }),
      blood: new THREE.MeshStandardMaterial({ map: T.bloodDecal(3), transparent: true, roughness: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
    };
    return mats;
  }
  // ------------------------------------------------------------------ merged geometry
  var _m4, _q, _e, _s, _p, _v, _n, _nm, unitBox, cylCache = {}, sphGeo;
  function Acc() { this.p = []; this.n = []; this.u = []; this.i = []; this.vc = 0; }
  Acc.prototype.add = function (geo, m4, us) {
    var pa = geo.attributes.position, na = geo.attributes.normal, idx = geo.index; us = us || 4;
    _nm.getNormalMatrix(m4);
    for (var k = 0; k < pa.count; k++) {
      _v.fromBufferAttribute(pa, k).applyMatrix4(m4); _n.fromBufferAttribute(na, k).applyMatrix3(_nm).normalize();
      this.p.push(_v.x, _v.y, _v.z); this.n.push(_n.x, _n.y, _n.z);
      var ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
      if (ay >= ax && ay >= az) this.u.push(_v.x / us, _v.z / us); else if (ax >= az) this.u.push(_v.z / us, _v.y / us); else this.u.push(_v.x / us, _v.y / us);
    }
    if (idx) for (var j = 0; j < idx.count; j++) this.i.push(idx.getX(j) + this.vc); else for (var j2 = 0; j2 < pa.count; j2++) this.i.push(j2 + this.vc);
    this.vc += pa.count;
  };
  Acc.prototype.mesh = function (mat) {
    if (!this.vc) return null;
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setIndex(this.vc > 65000 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere();
    var m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = false; m.matrixAutoUpdate = false;
    return m;
  };
  function cylGeo(seg, taper) { var k = seg + ':' + taper; return cylCache[k] || (cylCache[k] = new THREE.CylinderGeometry(taper, 1, 1, seg)); }
  // ------------------------------------------------------------------ build a level
  function api(L) {
    var accs = {}, group = L.group, rng = NF.tex.rnd(1000 + L.i * 77);
    var X = function (gx) { return B.X0 + gx * C; }, Z = function (gz) { return LZ(L.i) + gz * C; };
    function acc(m) { return accs[m] || (accs[m] = new Acc()); }
    function box(m, x, y, z, w, h, d, ry, col, us) {
      _e.set(0, ry || 0, 0); _q.setFromEuler(_e); _s.set(w, h, d); _p.set(x, y + h / 2, z); _m4.compose(_p, _q, _s); acc(m).add(unitBox, _m4, us);
      if (col) { var c = Math.abs(Math.cos(ry || 0)), s = Math.abs(Math.sin(ry || 0)), hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2; W.collider(x - hw, x + hw, z - hd, z + hd, y, y + h, 'prop'); }
    }
    function cyl(m, x, y, z, r, h, axis, seg, col, taper, ry) {
      _e.set(axis === 'z' ? PI / 2 : 0, ry || 0, axis === 'x' ? PI / 2 : 0); _q.setFromEuler(_e); _s.set(r, h, r);
      _p.set(x, axis === 'y' || !axis ? y + h / 2 : y, z); _m4.compose(_p, _q, _s); acc(m).add(cylGeo(seg || 12, taper === undefined ? 1 : taper), _m4);
      if (col) W.collider(x - r, x + r, z - r, z + r, y, y + (axis === 'y' || !axis ? h : 2 * r), 'prop');
    }
    function sph(m, x, y, z, r, sx, sy, sz) { _q.identity(); _s.set(r * (sx || 1), r * (sy || 1), r * (sz || 1)); _p.set(x, y, z); _m4.compose(_p, _q, _s); acc(m).add(sphGeo, _m4); }
    function plane(m, x, y, z, w, d, down) { _e.set(down ? PI / 2 : -PI / 2, 0, 0); _q.setFromEuler(_e); _s.set(w, d, 1); _p.set(x, y, z); _m4.compose(_p, _q, _s); acc(m).add(planeGeo, _m4); }
    function mesh(geo, mat, x, y, z, rx, ry, rz) { var mm = new THREE.Mesh(geo, mat); mm.position.set(x, y, z); mm.rotation.set(rx || 0, ry || 0, rz || 0); group.add(mm); return mm; }
    function light(x, y, z, c, i, d, kind) { L.lights.push({ x: x, y: y, z: z, c: c || '#d8e8ff', i: i || 1.4, d: d || 16, kind: kind || null, seed: rng() * 100 }); }
    function item(type, x, y, z, o) { o = o || {}; var id = o.id || ('nx' + L.i + '_' + (L.itemN++)); L.itemDefs.push({ id: id, type: type, x: x, y: y || 0, z: z, amount: o.amount, file: o.file, name: o.name, value: o.value }); return id; }
    function spawn(type, x, z, o) { o = o || {}; var id = o.id || ('nxe' + L.i + '_' + (L.spawnN++)); L.spawnDefs.push({ type: type, id: id, x: x, z: z, o: o }); return id; }
    function spot(id, x, z, r, prompt, fn, y) { var s = W.spot(id, x, z, r, prompt, fn, y); L.spots.push(s); return s; }
    function finish() {
      Object.keys(accs).forEach(function (k) { var m = accs[k].mesh(mats[k]); if (m) { m.updateMatrix(); group.add(m); } });
    }
    return { X: X, Z: Z, box: box, cyl: cyl, sph: sph, plane: plane, mesh: mesh, light: light, item: item, spawn: spawn, spot: spot, rng: rng, finish: finish, L: L };
  }
  var planeGeo;
  function build(i) {
    var L = B.levels[i]; if (L && L.built) return L;
    if (!L) L = B.levels[i] = prepare(i);
    initMats();
    L.group = new THREE.Group(); L.group.visible = false; scene.add(L.group);
    L.lights = []; L.itemDefs = []; L.spawnDefs = []; L.spots = []; L.itemN = 0; L.spawnN = 0; L.anims = []; L.corpses = [];
    var a = api(L), style = L.def.style, wallM = 'wall_' + style, floorM = 'floor_' + style;
    L.extra = L.rooms.map(function (r) { return { id: 'nx' + i + '_' + r.key, name: r.name, x0: a.X(r.gx), x1: a.X(r.gx + r.w), z0: a.Z(r.gz), z1: a.Z(r.gz + r.d), y: 0, h: r.h, safe: r.safe, under: true, level: i, key: r.key, floor: 'tile' }; });
    // floors and ceilings
    L.rooms.forEach(function (r) {
      var x0 = a.X(r.gx), z0 = a.Z(r.gz), w = r.w * C, d = r.d * C, cx = x0 + w / 2, cz = z0 + d / 2;
      a.plane(r.kind === 'tunnel' || r.kind === 'pens' ? 'floor_dark' : r.kind === 'safe' ? 'floor_mil' : floorM, cx, 0, cz, w, d);
      a.plane('ceil', cx, r.h, cz, w, d, true);
    });
    // walls along every grid edge that separates different rooms (or a room from rock)
    function hOf(c) { return c < 0 ? 0 : L.rooms[c].h; }
    function wallRun(axis, line, from, to, h) {
      if (h <= 0 || to <= from) return;
      var len = (to - from) * C;
      if (axis === 'z') { var x = a.X(line), zc = a.Z(from) + len / 2; a.box(wallM, x, 0, zc, 0.3, h, len + 0.3, 0, false); a.box('dark', x, 0, zc, 0.36, 0.14, len + 0.3); a.box(style === 'lab' ? 'teal' : 'hazard', x, 0.95, zc, 0.34, 0.08, len + 0.3); W.collider(x - 0.15, x + 0.15, a.Z(from) - 0.15, a.Z(to) + 0.15, 0, h, 'wall'); }
      else { var z = a.Z(line), xc = a.X(from) + len / 2; a.box(wallM, xc, 0, z, len + 0.3, h, 0.3, 0, false); a.box('dark', xc, 0, z, len + 0.3, 0.14, 0.36); a.box(style === 'lab' ? 'teal' : 'hazard', xc, 0.95, z, len + 0.3, 0.08, 0.34); W.collider(a.X(from) - 0.15, a.X(to) + 0.15, z - 0.15, z + 0.15, 0, h, 'wall'); }
    }
    var gapEdge = {}; L.doors.forEach(function (d) { d.edges.forEach(function (e) { gapEdge[Math.min(e.z * L.W + e.x, e.nz * L.W + e.nx) + ':' + (e.axis)] = true; }); });
    // vertical lines (walls running along z)
    for (var gx = 0; gx <= L.W; gx++) {
      var runStart = -1, runH = 0;
      for (var gz = 0; gz <= L.D; gz++) {
        var need = 0;
        if (gz < L.D) {
          var ca = gx - 1 >= 0 ? L.cell[gz * L.W + gx - 1] : -1, cb = gx < L.W ? L.cell[gz * L.W + gx] : -1;
          var open = gx - 1 >= 0 && (L.edge[gz * L.W + gx - 1] & PX), door = gx - 1 >= 0 && gapEdge[(gz * L.W + gx - 1) + ':z'];
          if (ca !== cb && (ca >= 0 || cb >= 0) && !open && !door) need = Math.max(hOf(ca), hOf(cb));
        }
        if (need !== runH) { if (runH > 0) wallRun('z', gx, runStart, gz, runH); runStart = gz; runH = need; }
      }
    }
    for (var gz2 = 0; gz2 <= L.D; gz2++) {
      var rs = -1, rh = 0;
      for (var gx2 = 0; gx2 <= L.W; gx2++) {
        var need2 = 0;
        if (gx2 < L.W) {
          var ca2 = gz2 - 1 >= 0 ? L.cell[(gz2 - 1) * L.W + gx2] : -1, cb2 = gz2 < L.D ? L.cell[gz2 * L.W + gx2] : -1;
          var open2 = gz2 - 1 >= 0 && (L.edge[(gz2 - 1) * L.W + gx2] & PZ), door2 = gz2 - 1 >= 0 && gapEdge[((gz2 - 1) * L.W + gx2) + ':x'];
          if (ca2 !== cb2 && (ca2 >= 0 || cb2 >= 0) && !open2 && !door2) need2 = Math.max(hOf(ca2), hOf(cb2));
        }
        if (need2 !== rh) { if (rh > 0) wallRun('x', gz2, rs, gx2, rh); rs = gx2; rh = need2; }
      }
    }
    // doorway frames and the wall above them
    function frame(op) {
      var len = (op.to - op.from) * C, mid = (op.to + op.from) / 2;
      if (op.axis === 'z') {
        var x = a.X(op.line), z0 = a.Z(op.from), z1 = a.Z(op.to), zc = a.Z(mid);
        if (op.h > op.dh) { a.box(wallM, x, op.dh, zc, 0.3, op.h - op.dh, len); W.collider(x - 0.15, x + 0.15, z0, z1, op.dh, op.h, 'lintel'); }
        a.box('dark', x, 0, z0 + 0.12, 0.5, op.dh, 0.24, 0, true); a.box('dark', x, 0, z1 - 0.12, 0.5, op.dh, 0.24, 0, true); a.box('hazard', x, op.dh - 0.2, zc, 0.52, 0.2, len - 0.4);
        a.box('dark', x, 0, zc, 0.5, 0.03, len);
      } else {
        var z = a.Z(op.line), x0 = a.X(op.from), x1 = a.X(op.to), xc = a.X(mid);
        if (op.h > op.dh) { a.box(wallM, xc, op.dh, z, len, op.h - op.dh, 0.3); W.collider(x0, x1, z - 0.15, z + 0.15, op.dh, op.h, 'lintel'); }
        a.box('dark', x0 + 0.12, 0, z, 0.24, op.dh, 0.5, 0, true); a.box('dark', x1 - 0.12, 0, z, 0.24, op.dh, 0.5, 0, true); a.box('hazard', xc, op.dh - 0.2, z, len - 0.4, 0.2, 0.52);
        a.box('dark', xc, 0, z, len, 0.03, 0.5);
      }
      op.cx = op.axis === 'z' ? a.X(op.line) : a.X(mid); op.cz = op.axis === 'z' ? a.Z(mid) : a.Z(op.line); op.len = len;
    }
    L.openings.forEach(frame);
    L.doors.forEach(function (d) { frame(d); makeDoor(L, a, d); });
    // furnish every room, then the level's own script
    L.rooms.forEach(function (r) { furnish(L, a, r); });
    if (SCRIPTS[L.def.id]) SCRIPTS[L.def.id](L, a);
    corpseMeshes(L);
    a.finish();
    L.built = true;
    return L;
  }
  // ------------------------------------------------------------------ security doors
  function makeDoor(L, a, d) {
    var g = new THREE.Group(), h = d.dh, len = d.len, thick = 0.22;
    var dm = std({ map: NF.tex.metal(), color: d.event ? '#6a6a60' : '#5a6068', metalness: 0.75, roughness: 0.4 });
    var p1 = new THREE.Mesh(new THREE.BoxGeometry(d.axis === 'x' ? len / 2 : thick, h, d.axis === 'x' ? thick : len / 2), dm);
    var p2 = p1.clone();
    var st = new THREE.Mesh(new THREE.BoxGeometry(d.axis === 'x' ? len / 2 - 0.05 : thick + 0.02, 0.3, d.axis === 'x' ? thick + 0.02 : len / 2 - 0.05), mats.hazard);
    [p1, p2].forEach(function (p, k) { var s = st.clone(); s.position.y = -h / 2 + 0.5; p.add(s); var s2 = st.clone(); s2.position.y = h / 2 - 0.4; p.add(s2); p.position.y = h / 2; g.add(p); });
    var off = len / 4;
    if (d.axis === 'x') { p1.position.x = -off; p2.position.x = off; } else { p1.position.z = -off; p2.position.z = off; }
    g.position.set(d.cx, 0, d.cz); L.group.add(g);
    var lm1 = new THREE.MeshBasicMaterial({ color: '#ff2a1a' });
    [-1, 1].forEach(function (s) { var lt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), lm1); lt.position.set(d.axis === 'x' ? len / 2 + 0.35 : s * 0.3, 1.6, d.axis === 'x' ? s * 0.3 : len / 2 + 0.35); g.add(lt); });
    d.mesh = g; d.p1 = p1; d.p2 = p2; d.lampMat = lm1; d.t = 0; d.open = false;
    d.box = d.axis === 'x' ? W.collider(d.cx - len / 2, d.cx + len / 2, d.cz - 0.25, d.cz + 0.25, 0, h, 'door') : W.collider(d.cx - 0.25, d.cx + 0.25, d.cz - len / 2, d.cz + len / 2, 0, h, 'door');
    a.spot('nxd_' + d.id, d.cx, d.cz, Math.max(2.4, len / 2 + 0.8), d.event ? 'Override the seal' : 'Security door', function () { NF.game.event('nadirDoor', d); }, 1.2);
  }
  B.openDoor = function (d, instant) {
    if (d.open) return; d.open = true; d.box.on = false; setOpen(B.levels[d.lvl !== undefined ? d.lvl : B.level], d, true);
    d.lampMat.color.set('#40ff80'); if (instant) d.t = 1; else NF.audio.door(new V3(d.cx, 1.5, d.cz));
    flowCell = -1;
  };
  function updateDoors(L, dt) {
    L.doors.forEach(function (d) {
      if (!d.open || d.t >= 1) { if (d.open && d.t >= 1 && !d.done) { d.done = true; slide(d, 1); } return; }
      d.t = Math.min(1, d.t + dt * 0.8); slide(d, 1 - Math.pow(1 - d.t, 2));
    });
  }
  function slide(d, e) { var off = d.len / 4 + e * d.len / 2 * 0.92; if (d.axis === 'x') { d.p1.position.x = -off; d.p2.position.x = off; } else { d.p1.position.z = -off; d.p2.position.z = off; } }
  // ------------------------------------------------------------------ props, room by room
  function doorsOf(L, r) { var out = []; L.openings.concat(L.doors).forEach(function (o) { if (o.a === r || o.b === r) out.push(o); }); return out; }
  function nearDoor(ds, x, z, m) { for (var i = 0; i < ds.length; i++) if (Math.abs(ds[i].cx - x) < ds[i].len / 2 + (m || 1.6) && Math.abs(ds[i].cz - z) < ds[i].len / 2 + (m || 1.6)) return true; return false; }
  // positions along the inside of each wall, facing into the room
  function wallSpots(L, a, r, step, inset) {
    var out = [], x0 = a.X(r.gx), x1 = a.X(r.gx + r.w), z0 = a.Z(r.gz), z1 = a.Z(r.gz + r.d), ds = doorsOf(L, r);
    for (var x = x0 + step / 2; x < x1 - 0.5; x += step) { if (!nearDoor(ds, x, z0)) out.push({ x: x, z: z0 + inset, ry: 0 }); if (!nearDoor(ds, x, z1)) out.push({ x: x, z: z1 - inset, ry: PI }); }
    for (var z = z0 + step / 2; z < z1 - 0.5; z += step) { if (!nearDoor(ds, x0, z)) out.push({ x: x0 + inset, z: z, ry: PI / 2 }); if (!nearDoor(ds, x1, z)) out.push({ x: x1 - inset, z: z, ry: -PI / 2 }); }
    return out;
  }
  function interior(L, a, r, n, margin, clear) {
    var out = [], x0 = a.X(r.gx) + margin, x1 = a.X(r.gx + r.w) - margin, z0 = a.Z(r.gz) + margin, z1 = a.Z(r.gz + r.d) - margin, ds = doorsOf(L, r), rnd = a.rng;
    for (var t = 0; t < n * 6 && out.length < n; t++) {
      var x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (x1 < x0 || z1 < z0) break;
      if (nearDoor(ds, x, z, 2.4)) continue;
      var ok = true; for (var k = 0; k < out.length; k++) if (Math.hypot(out[k].x - x, out[k].z - z) < (clear || 2.2)) { ok = false; break; }
      if (ok) out.push({ x: x, z: z });
    }
    return out;
  }
  function ceilingLights(L, a, r, col, kind) {
    var x0 = a.X(r.gx), z0 = a.Z(r.gz), w = r.w * C, d = r.d * C, along = w > d, n = Math.max(1, Math.round((along ? w : d) / 9));
    for (var k = 0; k < n; k++) {
      var f = (k + 0.5) / n, x = along ? x0 + w * f : x0 + w / 2, z = along ? z0 + d / 2 : z0 + d * f;
      a.box('dark', x, r.h - 0.12, z, along ? 0.5 : 2.6, 0.1, along ? 2.6 : 0.5);
      var broken = a.rng() < 0.25;
      a.box(broken ? 'dark' : 'emit', x, r.h - 0.16, z, along ? 0.3 : 2.4, 0.04, along ? 2.4 : 0.3);
      if (k % 2 === 0 || n < 3) a.light(x, r.h - 0.6, z, col || '#d8e8ff', broken ? 0.9 : 1.35, Math.max(12, r.h * 3), broken ? 'broken' : kind);
    }
  }
  var CORPSE_COLS = { soldier: ['#4a5238', '#3a4030', '#2e3426'], sci: ['#d0cdc4', '#c8c4b8', '#b8b4a8'], tech: ['#5a6a8a', '#4a5a7a', '#3a4a5a'], guard: ['#2b3a58', '#1c2232', '#2a2a2a'], flesh: ['#9a6050', '#7a4a3a', '#8a5a48'] };
  function corpse(L, x, z, ry, kind, pose) { L.corpses.push({ x: x, z: z, ry: ry, kind: kind || 'soldier', pose: pose || 'lie', seed: L.corpses.length * 7.3 + L.i }); }
  function bodies(L, a, r, n, kinds) {
    interior(L, a, r, n, 0.8, 1.3).forEach(function (p) { corpse(L, p.x, p.z, a.rng() * 6.28, kinds[(a.rng() * kinds.length) | 0], a.rng() < 0.15 ? 'curl' : 'lie'); });
    if (a.rng() < 0.8) wallSpots(L, a, r, 5, 0.55).forEach(function (s) { if (a.rng() < 0.12) corpse(L, s.x, s.z, s.ry, kinds[(a.rng() * kinds.length) | 0], 'sit'); });
  }
  function bloodTrail(L, a, x0, z0, x1, z1) { var n = Math.max(2, Math.hypot(x1 - x0, z1 - z0) / 1.2 | 0); for (var k = 0; k < n; k++) L.corpses.push({ x: x0 + (x1 - x0) * k / n + (a.rng() - .5) * 0.4, z: z0 + (z1 - z0) * k / n + (a.rng() - .5) * 0.4, ry: a.rng() * 6, kind: 'blood', pose: 'blood', seed: k }); }
  function crate(a, x, z, s, ry) { a.box('wood', x, 0, z, s, s * 0.8, s, ry, true); a.box('dark', x, s * 0.8, z, s + 0.04, 0.04, s + 0.04, ry); }
  function loot(L, a, x, y, z, table) {
    var t = table[(a.rng() * table.length) | 0];
    if (t === 'none') return;
    var amt = { hg_ammo: 15, sg_ammo: 6, smg_ammo: 40, rifle_ammo: 6, mag_ammo: 4, gl_ammo: 3, rpg_ammo: 1, grenade: 1, money: 500 + ((a.rng() * 8) | 0) * 250, powder: 1, rail_ammo: 2 }[t];
    a.item(t, x, y, z, { amount: amt });
  }
  var LOOT = {
    b1: ['hg_ammo', 'hg_ammo', 'sg_ammo', 'smg_ammo', 'smg_ammo', 'rifle_ammo', 'grenade', 'herb', 'herb', 'red_herb', 'money', 'powder', 'none'],
    b2: ['hg_ammo', 'sg_ammo', 'smg_ammo', 'mag_ammo', 'herb', 'blue_herb', 'red_herb', 'spray', 'money', 'money', 'powder', 'none'],
    b3: ['sg_ammo', 'smg_ammo', 'mag_ammo', 'rifle_ammo', 'gl_ammo', 'grenade', 'herb', 'red_herb', 'spray', 'money', 'rail_ammo', 'none'],
    b4: ['mag_ammo', 'rifle_ammo', 'gl_ammo', 'rpg_ammo', 'grenade', 'spray', 'red_herb', 'rail_ammo', 'money', 'none']
  };
  function furnish(L, a, r) {
    var x0 = a.X(r.gx), x1 = a.X(r.gx + r.w), z0 = a.Z(r.gz), z1 = a.Z(r.gz + r.d), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, rnd = a.rng;
    var lt = L.def.id, red = lt === 'b1' || lt === 'b3', LT = LOOT[lt];
    var people = lt === 'b1' ? ['soldier', 'soldier', 'soldier', 'guard', 'tech'] : lt === 'b2' ? ['sci', 'sci', 'sci', 'tech', 'soldier'] : lt === 'b3' ? ['soldier', 'guard', 'sci', 'flesh'] : ['tech', 'soldier', 'flesh', 'flesh'];
    var k = r.kind;
    if (k !== 'core' && k !== 'arena') ceilingLights(L, a, r, red && k === 'corridor' ? '#ff4030' : k === 'safe' ? '#ffd090' : null, red && k === 'corridor' ? 'pulse' : 'fluoro');
    // overhead pipes along corridors
    if (k === 'corridor' || k === 'tunnel') {
      var along = w > d;
      for (var p = 0; p < 3; p++) a.cyl(p === 1 ? 'rust' : 'metal', along ? cx : x0 + 0.5 + p * 0.35, r.h - 0.5 - p * 0.05, along ? z0 + 0.5 + p * 0.35 : cz, 0.1 + p * 0.03, along ? w : d, along ? 'x' : 'z', 8);
      wallSpots(L, a, r, 7, 0.45).forEach(function (s) { var q = rnd(); if (q < 0.25) crate(a, s.x, s.z, 0.9, s.ry); else if (q < 0.35) a.cyl('olive', s.x, 0, s.z, 0.32, 0.9, 'y', 10, true); else if (q < 0.42 && lt === 'b1') { a.box('olive', s.x, 0, s.z, 1.6, 0.5, 0.6, s.ry, true); a.box('olive', s.x, 0.5, s.z, 1.4, 0.4, 0.55, s.ry, true); } });
      if (k === 'tunnel') { for (var rb = z0 + 3; rb < z1; rb += 4) { a.box('rust', x0 + 0.3, 0, rb, 0.3, r.h, 0.3); a.box('rust', x1 - 0.3, 0, rb, 0.3, r.h, 0.3); a.box('rust', cx, r.h - 0.35, rb, w, 0.3, 0.3); } }
      bodies(L, a, r, Math.round(w * d / 70), people);
      if (rnd() < 0.6) bloodTrail(L, a, cx + (rnd() - .5) * 2, z0 + 2, cx + (rnd() - .5) * 3, Math.min(z1 - 1, z0 + 12));
      if (rnd() < 0.5) loot(L, a, cx + (rnd() - .5) * (w - 2), 0, cz + (rnd() - .5) * (d - 2), LT);
      return;
    }
    if (k === 'lobby') {
      // the elevator in the north wall
      a.box('dark', cx, 0, z0 + 0.25, 4.4, 4.2, 0.5); a.box('metal', cx - 0.85, 0, z0 + 0.52, 1.6, 3.4, 0.08); a.box('metal', cx + 0.85, 0, z0 + 0.52, 1.6, 3.4, 0.08);
      a.box('hazard', cx, 0, z0 + 1.6, 4, 0.02, 1.4); a.box('amber', cx, 3.6, z0 + 0.56, 1.2, 0.3, 0.04);
      a.box('dark', cx + 2.6, 0, z0 + 0.4, 0.5, 1.4, 0.3); a.box('green', cx + 2.6, 1.15, z0 + 0.56, 0.2, 0.2, 0.02);
      var sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), std({ map: NF.terrain.signTex('SITE NADIR · LEVEL ' + L.def.short, '#14161a', '#e0c060'), emissive: '#ffffff', emissiveMap: NF.terrain.signTex('SITE NADIR · LEVEL ' + L.def.short, '#14161a', '#e0c060'), emissiveIntensity: 0.35 }));
      sign.position.set(cx, 4.4, z0 + 0.52); L.group.add(sign);
      a.spot('nx_lift_' + L.i, cx + 2.2, z0 + 1.4, 2.2, 'Use the elevator', function () { NF.game.event('nadirLift'); }, 1.2);
      L.arrive = { x: cx, z: z0 + 4.2 };
      a.light(cx, 4.2, z0 + 2, '#ffd8a0', 1.4, 14);
      bodies(L, a, r, 2, people);
      return;
    }
    if (k === 'safe') {
      a.box('wood', cx + w / 2 - 1.2, 0, cz - d / 2 + 1.1, 1.6, 0.8, 0.8, 0, true);
      a.box('dark', cx + w / 2 - 1.2, 0.8, cz - d / 2 + 1.1, 0.42, 0.15, 0.3); a.box('green', cx + w / 2 - 1.0, 0.95, cz - d / 2 + 1.0, 0.06, 0.06, 0.06);
      a.spot('tw_nx' + L.i, cx + w / 2 - 1.2, cz - d / 2 + 1.9, 1.6, 'Use typewriter (save)', function () { NF.game.save(); }, 0.9);
      a.box('rust', cx - w / 2 + 1.0, 0, cz - d / 2 + 1.0, 1.0, 0.7, 0.7, 0, true);
      a.spot('box_nx' + L.i, cx - w / 2 + 1.0, cz - d / 2 + 1.8, 1.5, 'Open item box', function () { NF.game.openStash(); }, 0.8);
      var pd = NF.models.peddler(); pd.root.position.set(cx - w / 2 + 1.5, 0, cz + d / 2 - 1.6); pd.root.rotation.y = PI * 0.75; L.group.add(pd.root);
      L.anims.push(function (t) { var pp = NF.anim.idle(t, 2); pp.shR = [-0.6, 0, 0.3]; pp.elR = [-1.2, 0, 0]; pp.head = [0.05, 0.2 * Math.sin(t * 0.5), 0]; NF.anim.apply(pd, pp, 0.2); });
      a.spot('trade_nx' + L.i, cx - w / 2 + 2.2, cz + d / 2 - 2.4, 1.8, 'Trade with the Peddler', function () { NF.game.openShop(); }, 1.2);
      a.box('olive', cx + w / 2 - 0.5, 0, cz + 1, 0.8, 1.9, 2.4, 0, true);
      a.light(cx, 2.6, cz, '#ffc070', 1.5, 12);
      return;
    }
    if (k === 'checkpoint') {
      a.box('metal', cx, 0, cz - 1, w - 4, 1.1, 0.8, 0, true); a.box('dark', cx, 1.1, cz - 1, w - 4, 0.06, 0.9);
      for (var m = 0; m < 3; m++) { a.box('dark', cx - 3 + m * 3, 1.15, cz - 1.1, 0.7, 0.5, 0.1); a.box(m % 2 ? 'screen' : 'screen2', cx - 3 + m * 3, 1.2, cz - 1.04, 0.6, 0.4, 0.02); }
      a.box('dark', cx + w / 2 - 2, 0, cz + 2, 0.3, 2.4, 2.4, 0, true); a.box('dark', cx + w / 2 - 4, 0, cz + 2, 0.3, 2.4, 2.4, 0, true); a.box('dark', cx + w / 2 - 3, 2.3, cz + 2, 2.3, 0.3, 2.4);
      bodies(L, a, r, 4, people); loot(L, a, cx + 2, 1.15, cz - 1, LT); loot(L, a, cx - 2, 1.15, cz - 1, LT);
      return;
    }
    if (k === 'barracks') {
      wallSpots(L, a, r, 2.6, 1.1).forEach(function (s, n) {
        if (n % 5 === 4) { a.box('olive', s.x, 0, s.z, 1.0, 1.9, 0.5, s.ry, true); return; }
        for (var lv = 0; lv < 2; lv++) { a.box('metal', s.x, 0.35 + lv * 1.1, s.z, 1.0, 0.08, 2.0, s.ry, false); a.box('cloth', s.x, 0.43 + lv * 1.1, s.z, 0.9, 0.14, 1.9, s.ry); }
        W.collider(s.x - 0.6, s.x + 0.6, s.z - 0.6, s.z + 0.6, 0, 2.0, 'prop');
        a.box('metal', s.x, 0, s.z, 1.04, 2.1, 0.06, s.ry);
      });
      bodies(L, a, r, Math.round(w * d / 45), people); for (var lb = 0; lb < 3; lb++) loot(L, a, cx + (rnd() - .5) * (w - 4), 0, cz + (rnd() - .5) * (d - 4), LT);
      return;
    }
    if (k === 'wash') {
      wallSpots(L, a, r, 1.6, 0.4).forEach(function (s, n) { if (n % 2) return; a.box('white', s.x, 0, s.z, 0.7, 0.85, 0.5, s.ry, true); a.box('metal', s.x, 1.5, s.z, 0.6, 0.6, 0.04, s.ry); });
      bodies(L, a, r, 3, people); loot(L, a, cx, 0, cz, LT);
      return;
    }
    if (k === 'mess') {
      for (var tz = z0 + 3; tz < z1 - 2; tz += 3.4) for (var tx = x0 + 4; tx < x1 - 3; tx += 7) {
        var ry = rnd() < 0.15 ? (rnd() - .5) * 1.2 : 0; a.box('metal', tx, 0.72, tz, 5, 0.06, 1.0, ry, false); W.collider(tx - 2.5, tx + 2.5, tz - 0.5, tz + 0.5, 0, 0.8, 'prop');
        a.box('dark', tx, 0, tz, 4.6, 0.72, 0.1, ry); a.box('metal', tx, 0.42, tz - 0.9, 4.6, 0.06, 0.4, ry); a.box('metal', tx, 0.42, tz + 0.9, 4.6, 0.06, 0.4, ry);
        if (rnd() < 0.3) loot(L, a, tx + (rnd() - .5) * 3, 0.78, tz, LT);
      }
      a.box('metal', x0 + 1, 0, cz, 1.2, 1.0, d - 4, 0, true);
      bodies(L, a, r, 9, people); bloodTrail(L, a, x0 + 3, z0 + 3, x1 - 4, z1 - 3);
      return;
    }
    if (k === 'armory') {
      wallSpots(L, a, r, 2, 0.45).forEach(function (s) { a.box('dark', s.x, 0, s.z, 1.8, 2.2, 0.5, s.ry, true); for (var g = 0; g < 4; g++) a.box('olive', s.x - 0.6 + g * 0.4, 0.6, s.z, 0.06, 1.2, 0.06, s.ry); });
      a.box('metal', cx, 0, cz, 3, 0.9, 1.2, 0, true);
      ['smg_ammo', 'rifle_ammo', 'sg_ammo', 'grenade', 'gl_ammo', 'hg_ammo', 'mag_ammo'].forEach(function (t, n) { a.item(t, cx - 1.2 + (n % 4) * 0.8, 0.9, cz - 0.3 + (n / 4 | 0) * 0.6, { amount: { smg_ammo: 80, rifle_ammo: 12, sg_ammo: 14, grenade: 3, gl_ammo: 4, hg_ammo: 40, mag_ammo: 6 }[t] }); });
      bodies(L, a, r, 2, ['soldier']);
      return;
    }
    if (k === 'infirmary' || k === 'surgery') {
      interior(L, a, r, k === 'surgery' ? 3 : 5, 2, 3.2).forEach(function (s) { a.box('metal', s.x, 0, s.z, 0.9, 0.8, 2.0, 0, true); a.box(k === 'surgery' ? 'white' : 'cloth', s.x, 0.8, s.z, 0.85, 0.12, 1.9); if (k === 'surgery') { a.cyl('metal', s.x, 0, s.z + 1.6, 0.04, 2.4, 'y', 6); a.sph('emit', s.x, 2.4, s.z + 1.2, 0.25, 1, 0.4, 1); corpse(L, s.x, s.z, 0, 'flesh', 'table'); } else if (rnd() < 0.5) corpse(L, s.x, s.z, 0, people[0], 'bed'); });
      wallSpots(L, a, r, 3, 0.35).forEach(function (s, n) { if (n % 2) a.box('white', s.x, 0, s.z, 1.2, 1.8, 0.45, s.ry, true); });
      bodies(L, a, r, 3, people); loot(L, a, cx, 0, cz, ['herb', 'spray', 'red_herb', 'blue_herb']); loot(L, a, cx + 2, 0, cz - 2, LT);
      return;
    }
    if (k === 'motor') {
      [[-5, -5, 0.1], [4, -6, -0.2], [-5, 4, 2.9], [5, 5, 3.3]].forEach(function (v) { var vx = cx + v[0], vz = cz + v[1]; a.box('olive', vx, 0.5, vz, 2.3, 1.1, 4.6, v[2], true); a.box('olive', vx, 1.6, vz, 2.1, 0.9, 2.4, v[2]); [[-1.1, 1.5], [1.1, 1.5], [-1.1, -1.5], [1.1, -1.5]].forEach(function (wq) { var c2 = Math.cos(v[2]), s2 = Math.sin(v[2]); a.cyl('dark', vx + wq[0] * c2 + wq[1] * s2, 0.45, vz - wq[0] * s2 + wq[1] * c2, 0.45, 0.35, 'x', 10, false, 1, v[2]); }); });
      for (var dr = 0; dr < 8; dr++) a.cyl(dr % 3 ? 'rust' : 'olive', x1 - 1.2, 0, z0 + 2 + dr * 1.0, 0.35, 1.0, 'y', 10, true);
      a.box('dark', x0 + 1, 0, cz, 1.0, 1.0, 6, 0, true);
      bodies(L, a, r, 6, people); loot(L, a, x0 + 1, 1.0, cz, LT); loot(L, a, x0 + 1, 1.0, cz + 2, LT);
      return;
    }
    if (k === 'command') {
      a.box('dark', cx, 0, z1 - 0.4, w - 2, 3.4, 0.3); for (var sc = 0; sc < 5; sc++) a.box(sc % 2 ? 'screen' : 'screen2', cx - (w - 6) / 2 + sc * (w - 6) / 4, 1.2, z1 - 0.58, 2.8, 1.8, 0.04);
      for (var row = 0; row < 3; row++) for (var cs = -2; cs <= 2; cs++) { var px = cx + cs * 3.6, pz = z0 + 6 + row * 4.2; a.box('dark', px, 0, pz, 3, 0.95, 0.9, 0, true); a.box('screen2', px, 0.95, pz + 0.2, 0.9, 0.5, 0.05); }
      a.box('metal', cx, 0, z0 + 3.2, 4, 0.9, 2.2, 0, true); a.box('screen', cx, 0.92, z0 + 3.2, 3.8, 0.02, 2.0);
      bodies(L, a, r, 10, people); loot(L, a, cx - 1.5, 0.95, z0 + 6, LT); loot(L, a, cx + 5, 0.95, z0 + 10.2, LT);
      return;
    }
    if (k === 'office' || k === 'vault') {
      interior(L, a, r, Math.round(w * d / 22), 1.6, 2.8).forEach(function (s) { var ry2 = (rnd() < 0.3 ? rnd() * 0.6 : 0); a.box('wood', s.x, 0, s.z, 1.6, 0.76, 0.8, ry2, true); a.box('dark', s.x, 0.76, s.z - 0.1, 0.5, 0.4, 0.06, ry2); a.box(rnd() < 0.5 ? 'screen' : 'screen2', s.x, 0.8, s.z - 0.06, 0.42, 0.3, 0.02, ry2); if (rnd() < 0.35) loot(L, a, s.x + 0.4, 0.78, s.z + 0.15, LT); });
      wallSpots(L, a, r, 2.5, 0.4).forEach(function (s, n) { if (n % 3 === 0) a.box('dark', s.x, 0, s.z, 0.6, 1.4, 0.55, s.ry, true); });
      bodies(L, a, r, Math.round(w * d / 50) + 1, people);
      return;
    }
    if (k === 'cells' || k === 'pens') {
      // a row of barred cells along the two long walls
      var long = w > d, n2 = Math.floor((long ? w : d) / 3);
      for (var side = 0; side < 2; side++) for (var ci = 0; ci < n2; ci++) {
        var u = (ci + 0.5) * (long ? w : d) / n2, depth = 2.6;
        var bx = long ? x0 + u : side ? x1 - depth : x0 + depth, bz = long ? (side ? z1 - depth : z0 + depth) : z0 + u, spanLen = (long ? w : d) / n2;
        if (nearDoor(doorsOf(L, r), bx, bz, 1.2)) continue;
        var broke = rnd() < (k === 'pens' ? 0.6 : 0.35);
        for (var bb = -spanLen / 2 + 0.15; bb < spanLen / 2; bb += 0.22) { if (broke && Math.abs(bb) < 0.6) continue; a.cyl('metal', long ? bx + bb : bx, 0, long ? bz : bz + bb, 0.03, 2.8, 'y', 5); }
        a.box('metal', long ? bx : bx, 2.75, long ? bz : bz, long ? spanLen : 0.1, 0.12, long ? 0.1 : spanLen);
        if (long) { if (!broke) W.collider(bx - spanLen / 2, bx + spanLen / 2, bz - 0.06, bz + 0.06, 0, 2.8, 'bars'); a.box('metal', bx - spanLen / 2, 0, (side ? (bz + z1) / 2 : (z0 + bz) / 2), 0.12, 2.8, depth, 0, true); }
        else { if (!broke) W.collider(bx - 0.06, bx + 0.06, bz - spanLen / 2, bz + spanLen / 2, 0, 2.8, 'bars'); a.box('metal', (side ? (bx + x1) / 2 : (x0 + bx) / 2), 0, bz - spanLen / 2, depth, 2.8, 0.12, 0, true); }
        var inX = long ? bx : (side ? (bx + x1) / 2 : (x0 + bx) / 2), inZ = long ? (side ? (bz + z1) / 2 : (z0 + bz) / 2) : bz;
        if (rnd() < 0.5) corpse(L, inX + (rnd() - .5), inZ + (rnd() - .5), rnd() * 6, k === 'pens' ? 'flesh' : people[(rnd() * people.length) | 0], rnd() < 0.5 ? 'curl' : 'lie');
        if (rnd() < 0.15) loot(L, a, inX, 0, inZ, LT);
        if (broke && rnd() < 0.5) L.corpses.push({ x: inX, z: inZ, ry: rnd() * 6, kind: 'blood', pose: 'blood', seed: ci });
      }
      bodies(L, a, r, 3, people);
      return;
    }
    if (k === 'generator' || k === 'reactor') {
      if (k === 'reactor') {
        a.cyl('dark', cx, 0, cz, 3.2, 1.0, 'y', 24, true); a.cyl('metal', cx, 1.0, cz, 2.2, r.h - 2, 'y', 24, true, 1);
        var ring = []; for (var rg = 0; rg < 3; rg++) { var rm = a.mesh(new THREE.TorusGeometry(2.6, 0.12, 8, 32), new THREE.MeshBasicMaterial({ color: '#40c0ff' }), cx, 2.4 + rg * 2.2, cz, PI / 2, 0, 0); ring.push(rm); }
        L.reactorRings = ring; L.anims.push(function (t) { ring.forEach(function (m, n) { m.rotation.z = t * (0.4 + n * 0.3) * (L.powered ? 3 : 0.3); m.material.color.set(L.powered ? '#80e0ff' : '#203040'); }); });
        for (var cs2 = -1; cs2 <= 1; cs2++) { a.box('dark', cx + cs2 * 3.2, 0, z1 - 1.4, 2.6, 1.0, 1.0, 0, true); a.box('screen', cx + cs2 * 3.2, 1.0, z1 - 1.6, 1.0, 0.6, 0.05); }
        L.reactorSpot = { x: cx, z: z1 - 2.8 };
        a.spot('nx_reactor', cx, z1 - 2.6, 2.4, 'Start the reactor', function () { NF.game.event('nadirReactor'); }, 1.1);
        a.light(cx, r.h - 1, cz, '#60c0ff', 1.6, 26, 'pulse');
      } else {
        for (var gn = 0; gn < 3; gn++) { var gx3 = x0 + 4 + gn * 5.5; a.cyl('olive', gx3, 1.4, cz - 2, 1.3, 4.0, 'x', 16, true); a.box('dark', gx3, 0, cz - 2, 3.0, 0.4, 4.6, 0, true); a.cyl('rust', gx3, 2.6, cz - 2, 0.25, r.h - 2.6, 'y', 8); }
        a.box('dark', cx, 0, z1 - 1, 4, 1.6, 0.8, 0, true); a.box('red', cx - 1, 1.3, z1 - 1.42, 0.2, 0.2, 0.04);
      }
      bodies(L, a, r, 4, people); loot(L, a, x0 + 2, 0, z1 - 2, LT); loot(L, a, x1 - 2, 0, z0 + 2, LT);
      return;
    }
    if (k === 'lab') {
      for (var bz2 = z0 + 3.5; bz2 < z1 - 2.5; bz2 += 4) for (var bx2 = x0 + 3.5; bx2 < x1 - 2.5; bx2 += 5.5) {
        a.box('white', bx2, 0, bz2, 3.2, 0.9, 1.2, 0, true); a.box('dark', bx2, 0.9, bz2, 3.3, 0.05, 1.3);
        for (var jr = 0; jr < 3; jr++) a.cyl(jr % 2 ? 'green' : 'amber', bx2 - 1 + jr * 0.8, 0.95, bz2 + (rnd() - .5) * 0.5, 0.06, 0.2 + rnd() * 0.15, 'y', 8);
        if (rnd() < 0.4) loot(L, a, bx2 + 1.2, 0.95, bz2, LT);
      }
      wallSpots(L, a, r, 3.2, 0.5).forEach(function (s, n) { if (n % 3 === 0) { a.box('metal', s.x, 0, s.z, 1.6, 2.2, 0.8, s.ry, true); a.box('emit', s.x, 1.1, s.z, 1.4, 0.04, 0.6, s.ry); } });
      bodies(L, a, r, Math.round(w * d / 40), people);
      return;
    }
    if (k === 'atrium') {
      a.cyl('dark', cx, 0, cz, 2.6, 0.6, 'y', 24, true);
      var big = a.mesh(new THREE.CylinderGeometry(2.2, 2.2, r.h - 1.2, 28, 1, true), mats.glass, cx, (r.h - 1.2) / 2 + 0.6, cz); var liq = a.mesh(new THREE.CylinderGeometry(2.15, 2.15, r.h - 1.6, 28, 1, true), mats.liquid, cx, (r.h - 1.6) / 2 + 0.6, cz);
      var spec = NF.models.specimen(4040); spec.root.scale.setScalar(2.2); spec.root.position.set(cx, 1.2, cz); L.group.add(spec.root);
      var sp0 = NF.anim.base(); sp0.head = [0.6, 0, 0.2]; sp0.shL = [0.3, 0, 0.6]; sp0.shR = [0.2, 0, -0.6]; NF.anim.apply(spec, sp0, 1);
      L.anims.push(function (t) { spec.root.position.y = 1.2 + Math.sin(t * 0.5) * 0.2; spec.root.rotation.y = t * 0.05; });
      W.collider(cx - 2.6, cx + 2.6, cz - 2.6, cz + 2.6, 0, r.h, 'tank');
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { a.box('dark', cx + q[0] * (w / 2 - 4), 0, cz + q[1] * (d / 2 - 3), 1.2, r.h, 1.2, 0, true); });
      for (var pl = 0; pl < 6; pl++) { var pa = pl / 6 * PI * 2; a.box('wood', cx + Math.cos(pa) * 7, 0, cz + Math.sin(pa) * 5, 1.4, 0.6, 1.4, pa, true); a.sph('rust', cx + Math.cos(pa) * 7, 0.7, cz + Math.sin(pa) * 5, 0.5, 1, 0.4, 1); }
      a.light(cx, r.h - 1, cz, '#30ff90', 1.4, 24, 'pulse'); ceilingLights(L, a, r);
      bodies(L, a, r, 12, people); bloodTrail(L, a, x0 + 3, cz, cx - 3, cz + 1);
      for (var lo = 0; lo < 3; lo++) loot(L, a, cx + (rnd() - .5) * (w - 6), 0, cz + (rnd() - .5) * (d - 6), LT);
      return;
    }
    if (k === 'cryo') {
      wallSpots(L, a, r, 2.4, 0.7).forEach(function (s) { a.cyl('metal', s.x, 0, s.z, 0.6, 0.3, 'y', 16, true); a.mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.0, 16, 1, true), mats.glass, s.x, 1.3, s.z); a.cyl('metal', s.x, 2.3, s.z, 0.6, 0.25, 'y', 16); a.box('amber', s.x, 2.5, s.z, 0.15, 0.08, 0.15); if (rnd() < 0.5) corpse(L, s.x, s.z, s.ry, 'flesh', 'stand'); });
      a.light(cx, r.h - 0.6, cz, '#a0d0ff', 1.2, 14);
      bodies(L, a, r, 2, people); loot(L, a, cx, 0, cz, LT);
      return;
    }
    if (k === 'server') {
      for (var sx = x0 + 2; sx < x1 - 1.5; sx += 2.6) for (var sz = z0 + 2.5; sz < z1 - 2; sz += 1.4) { a.box('dark', sx, 0, sz, 0.9, 2.2, 0.9, 0, true); for (var led = 0; led < 4; led++) a.box(rnd() < 0.6 ? 'green' : rnd() < 0.5 ? 'amber' : 'red', sx + 0.46, 0.4 + led * 0.45, sz + (rnd() - .5) * 0.6, 0.02, 0.04, 0.04); }
      bodies(L, a, r, 3, people); loot(L, a, cx, 0, z0 + 1.2, LT);
      return;
    }
    if (k === 'tanks') {
      var tks = interior(L, a, r, Math.min(8, Math.round(w * d / 30)), 2.4, 3.6);
      tks.forEach(function (s, n) {
        var tr = 0.9 + rnd() * 0.4, th = Math.min(r.h - 1.2, 3.4);
        a.cyl('metal', s.x, 0, s.z, tr + 0.15, 0.4, 'y', 20, true); a.cyl('metal', s.x, th + 0.4, s.z, tr + 0.15, 0.4, 'y', 20);
        var broken = rnd() < 0.35;
        if (!broken) { a.mesh(new THREE.CylinderGeometry(tr, tr, th, 22, 1, true), mats.glass, s.x, 0.4 + th / 2, s.z); a.mesh(new THREE.CylinderGeometry(tr - 0.03, tr - 0.03, th - 0.1, 22, 1, true), mats.liquid, s.x, 0.4 + th / 2, s.z); var sp = NF.models.specimen(300 + n + L.i * 20); sp.root.position.set(s.x, 0.6, s.z); sp.root.rotation.y = rnd() * 6; L.group.add(sp.root); var ps = NF.anim.base(); ps.head = [0.5, 0, 0.3]; ps.shL = [0.2, 0, 0.5]; ps.knL = [0.6, 0, 0]; NF.anim.apply(sp, ps, 1); L.anims.push(function (t) { sp.root.position.y = 0.6 + Math.sin(t * 0.6 + n) * 0.08; }); }
        else { L.corpses.push({ x: s.x + 1.2, z: s.z, ry: 0, kind: 'blood', pose: 'blood', seed: n }); for (var sh = 0; sh < 4; sh++) a.box('emit', s.x + (rnd() - .5) * 2, 0, s.z + (rnd() - .5) * 2, 0.3, 0.02, 0.2, rnd() * 3); }
      });
      a.light(cx, r.h - 0.8, cz, '#30ff90', 1.3, 18, 'pulse');
      bodies(L, a, r, 4, people); loot(L, a, x0 + 1.5, 0, z0 + 1.5, LT); loot(L, a, x1 - 1.5, 0, z1 - 1.5, LT);
      return;
    }
    if (k === 'incinerator') {
      a.box('dark', cx, 0, z0 + 1.2, Math.min(w - 2, 8), 3.2, 2.0, 0, true); a.box('amber', cx, 0.6, z0 + 2.22, 3, 1.2, 0.04);
      a.light(cx, 1.2, z0 + 3, '#ff7020', 1.8, 14, 'fire');
      for (var bg = 0; bg < 14; bg++) { var bx3 = cx + (rnd() - .5) * (w - 4), bz3 = cz + rnd() * (d / 2 - 2); L.corpses.push({ x: bx3, z: bz3, ry: rnd() * 6, kind: 'bag', pose: 'bag', seed: bg }); }
      for (var ct = 0; ct < 3; ct++) a.box('metal', x0 + 2 + ct * 2.4, 0, z1 - 1.6, 1.0, 0.9, 2.0, 0, true);
      bodies(L, a, r, 4, ['flesh', 'sci']); loot(L, a, x1 - 1.5, 0, z1 - 1.5, LT);
      return;
    }
    if (k === 'arena') {
      for (var pc = 0; pc < 6; pc++) { var ax = x0 + 8 + (pc % 3) * ((w - 16) / 2), az = z0 + 8 + (pc / 3 | 0) * (d - 16); a.box('wall_dark', ax, 0, az, 2.2, r.h, 2.2, 0, true); a.box('hazard', ax, 0, az, 2.3, 1.0, 2.3); }
      a.box('metal', cx, 0, z1 - 3, 10, 6, 0.4); for (var cb = -4.5; cb <= 4.5; cb += 0.5) a.cyl('metal', cx + cb, 0, z1 - 4.2, 0.06, 6, 'y', 5);
      for (var dl = 0; dl < 8; dl++) a.box('dark', cx + (rnd() - .5) * (w - 8), 0, cz + (rnd() - .5) * (d - 8), 1 + rnd() * 1.5, 0.4 + rnd() * 0.8, 1 + rnd() * 1.5, rnd() * 3, true);
      for (var la = 0; la < 6; la++) a.light(x0 + 5 + (la % 3) * ((w - 10) / 2), r.h - 1, z0 + 6 + (la / 3 | 0) * (d - 12), la % 2 ? '#ff5030' : '#ffd8a0', 1.5, 26, la % 2 ? 'pulse' : null);
      for (var bl = 0; bl < 10; bl++) L.corpses.push({ x: cx + (rnd() - .5) * (w - 6), z: cz + (rnd() - .5) * (d - 6), ry: rnd() * 6, kind: 'blood', pose: 'blood', seed: bl });
      bodies(L, a, r, 14, ['soldier', 'soldier', 'flesh']);
      L.arena = { x: cx, z: z1 - 7 };
      return;
    }
    if (k === 'hall' || k === 'cooling') {
      if (k === 'cooling') { for (var pp2 = 0; pp2 < 4; pp2++) a.cyl('metal', x0 + 1, 1 + pp2 * 1.1, cz, 0.35, w - 2, 'x', 12); a.box('dark', cx, 0, cz + d / 2 - 2.5, w - 3, 0.4, 3, 0, false); var pool = a.mesh(new THREE.PlaneGeometry(w - 4, 2.4), mats.coolant, cx, 0.42, cz + d / 2 - 2.5, -PI / 2, 0, 0); a.light(cx, 2.5, cz + 2, '#4090ff', 1.4, 20, 'pulse'); }
      else { for (var hc = -1; hc <= 1; hc += 2) a.box('dark', cx + hc * (w / 2 - 2), 0, cz, 1.4, r.h, 1.4, 0, true); a.light(cx, r.h - 1, cz, '#ff4030', 1.4, 22, 'pulse'); }
      bodies(L, a, r, 8, people); loot(L, a, x0 + 2, 0, z0 + 1.5, LT); loot(L, a, x1 - 2, 0, z0 + 1.5, LT);
      return;
    }
    if (k === 'core') {
      // the chamber is overgrown: flesh roots across the walls and floor, veins up the pillars
      for (var fr = 0; fr < 26; fr++) { var fx = x0 + 2 + rnd() * (w - 4), fz = z0 + 2 + rnd() * (d - 4); if (Math.hypot(fx - cx, fz - (z1 - 12)) < 9) continue; a.cyl('flesh', fx, 0.15, fz, 0.25 + rnd() * 0.35, 4 + rnd() * 8, rnd() < 0.5 ? 'x' : 'z', 8, false, 0.6, rnd() * 3); }
      for (var pi2 = 0; pi2 < 8; pi2++) { var pa2 = (pi2 + 0.5) / 8 * PI * 2, px2 = cx + Math.cos(pa2) * (w / 2 - 5), pz2 = cz + Math.sin(pa2) * (d / 2 - 5); a.box('wall_core', px2, 0, pz2, 2.4, r.h, 2.4, 0, true); a.cyl('flesh', px2 + 1.1, 0, pz2, 0.3, r.h * 0.7, 'y', 8, false, 0.3); }
      for (var wv = 0; wv < 14; wv++) a.sph('flesh', x0 + 1 + rnd() * (w - 2), rnd() * 6, rnd() < 0.5 ? z0 + 0.6 : z1 - 0.6, 0.8 + rnd() * 1.4, 1, 1.4, 0.6);
      for (var lc = 0; lc < 6; lc++) a.light(x0 + 6 + (lc % 3) * ((w - 12) / 2), 10, z0 + 8 + (lc / 3 | 0) * (d - 16), lc % 2 ? '#ff3020' : '#ff9060', 1.6, 34, 'pulse');
      L.corePos = { x: cx, z: z1 - 12 };
      bodies(L, a, r, 18, ['flesh', 'flesh', 'soldier', 'tech']);
      for (var bt = 0; bt < 16; bt++) L.corpses.push({ x: cx + (rnd() - .5) * (w - 6), z: cz + (rnd() - .5) * (d - 6), ry: rnd() * 6, kind: 'blood', pose: 'blood', seed: bt });
      return;
    }
    // anything else: a few crates and the dead
    wallSpots(L, a, r, 4, 0.6).forEach(function (s) { if (rnd() < 0.4) crate(a, s.x, s.z, 1, s.ry); });
    bodies(L, a, r, 3, people);
  }
  // ------------------------------------------------------------------ level scripts: keys, files, bosses, enemies
  function cellPos(a, gx, gz) { return { x: a.X(gx) + C / 2, z: a.Z(gz) + C / 2 }; }
  function rp(L, a, key, fx, fz) { var r = L.byKey[key]; return { x: a.X(r.gx) + r.w * C * fx, z: a.Z(r.gz) + r.d * C * fz }; }
  function horde(L, a, key, n, types, o) {
    var r = L.byKey[key];
    interior(L, a, r, n, 1.4, 1.6).forEach(function (p) { var t = types[(a.rng() * types.length) | 0]; var oo = {}; for (var kk in o) oo[kk] = o[kk]; if (t === 'feign') { t = 'zombie'; oo.feign = true; } a.spawn(t, p.x, p.z, oo); });
  }
  var SCRIPTS = {
    b1: function (L, a) {
      var p = rp(L, a, 'wash', 0.3, 0.6); corpse(L, p.x, p.z, 1.2, 'soldier', 'sit'); a.item('b1key', p.x + 0.5, 0, p.z + 0.3, { id: 'nx_b1key' });
      p = rp(L, a, 'check', 0.7, 0.75); a.item('file', p.x, 0, p.z, { id: 'nx_f1', file: 'nadir1' });
      p = rp(L, a, 'barB', 0.5, 0.5); a.item('file', p.x, 0, p.z, { id: 'nx_f2', file: 'nadir2' });
      p = rp(L, a, 'command', 0.5, 0.82); a.spawn('trooper', p.x, p.z, { id: 'nx_captain', captain: true });
      horde(L, a, 'spine', 6, ['zombie', 'feign', 'feign', 'trooper'], { variant: 3, hpMul: 1.4 });
      horde(L, a, 'barA', 5, ['zombie', 'feign', 'trooper'], { variant: 3, hpMul: 1.4 });
      horde(L, a, 'barB', 5, ['zombie', 'feign', 'zombie'], { variant: 3, hpMul: 1.4 });
      horde(L, a, 'mess', 8, ['zombie', 'zombie', 'feign', 'trooper'], { variant: 6, hpMul: 1.4 });
      horde(L, a, 'motor', 3, ['dog'], {}); horde(L, a, 'motor', 3, ['trooper', 'zombie'], { variant: 3, hpMul: 1.4 });
      horde(L, a, 'south', 5, ['trooper', 'zombie', 'feign'], { variant: 3, hpMul: 1.4 });
      horde(L, a, 'command', 5, ['trooper', 'trooper', 'feign'], { variant: 3, hpMul: 1.4 });
      horde(L, a, 'cells', 3, ['lasher', 'zombie'], { variant: 4, hpMul: 1.4 });
      horde(L, a, 'gen', 4, ['trooper', 'zombie', 'lasher'], { variant: 3, hpMul: 1.4 });
      horde(L, a, 'infirm', 3, ['feign', 'zombie'], { variant: 2, hpMul: 1.4 });
      horde(L, a, 'check', 2, ['trooper', 'feign'], { variant: 3, hpMul: 1.4 });
      horde(L, a, 'comms', 2, ['zombie', 'feign'], { variant: 3, hpMul: 1.4 });
    },
    b2: function (L, a) {
      var p = rp(L, a, 'gen', 0.2, 0.3); corpse(L, p.x, p.z, 0.4, 'sci', 'lie'); a.item('b2key', p.x + 0.6, 0, p.z, { id: 'nx_b2key' });
      p = rp(L, a, 'off', 0.5, 0.5); a.item('file', p.x, 0.78, p.z, { id: 'nx_f3', file: 'nadir3' });
      p = rp(L, a, 'surg', 0.8, 0.2); a.item('file', p.x, 0, p.z, { id: 'nx_f4', file: 'nadir4' });
      p = rp(L, a, 'serv', 0.5, 0.9); a.item('sample', p.x, 0, p.z, { id: 'nx_s1' });
      L.reactorSpotDef = true;
      horde(L, a, 'nh', 6, ['zombie', 'feign', 'lasher'], { variant: 2, hpMul: 1.6 });
      horde(L, a, 'wh', 4, ['zombie', 'feign', 'spider'], { variant: 2, hpMul: 1.6 });
      horde(L, a, 'eh', 4, ['zombie', 'lasher', 'feign'], { variant: 2, hpMul: 1.6 });
      horde(L, a, 'sh', 5, ['zombie', 'bloater', 'feign'], { variant: 2, hpMul: 1.6 });
      horde(L, a, 'gen', 4, ['zombie', 'lasher'], { variant: 2, hpMul: 1.6 }); horde(L, a, 'vir', 4, ['bloater', 'zombie', 'feign'], { variant: 2, hpMul: 1.6 });
      horde(L, a, 'atr', 9, ['zombie', 'zombie', 'lasher', 'skinner', 'feign'], { variant: 2, hpMul: 1.6 });
      horde(L, a, 'cryo', 2, ['feign', 'lasher'], { variant: 2, hpMul: 1.6 }); horde(L, a, 'serv', 2, ['zombie', 'feign'], { variant: 2, hpMul: 1.6 });
      horde(L, a, 'surg', 4, ['zombie', 'skinner', 'feign'], { variant: 2, hpMul: 1.6 }); horde(L, a, 'spec', 3, ['lasher', 'spider'], { hpMul: 1.6 });
      horde(L, a, 'pens', 5, ['dog', 'dog', 'spider', 'spider'], { hpMul: 1.6 }); horde(L, a, 'inc', 5, ['zombie', 'feign', 'bloater'], { variant: 6, hpMul: 1.6 });
      horde(L, a, 'reac', 3, ['lasher', 'trooper'], { variant: 3, hpMul: 1.6 });
    },
    b3: function (L, a) {
      var p = rp(L, a, 'obs', 0.75, 0.5); corpse(L, p.x, p.z, 2, 'guard', 'sit'); a.item('b3key', p.x - 0.6, 0, p.z, { id: 'nx_b3key' });
      p = rp(L, a, 'obs', 0.3, 0.4); a.item('file', p.x, 0.78, p.z, { id: 'nx_f5', file: 'nadir5' });
      p = rp(L, a, 'pens', 0.5, 0.5); a.item('rail_ammo', p.x, 0, p.z, { id: 'nx_ra1', amount: 4 }); a.item('money', p.x + 1, 0, p.z + 2, { id: 'nx_m1', amount: 8000 }); a.item('sample', p.x - 1, 0, p.z - 3, { id: 'nx_s2' });
      p = rp(L, a, 'arena', 0.5, 0.82); a.spawn('goliath', p.x, p.z, { id: 'nx_goliath', yaw: PI });
      horde(L, a, 'spine', 6, ['zombie', 'stalker', 'lasher', 'feign'], { variant: 3, hpMul: 1.8 });
      horde(L, a, 'ca', 4, ['lasher', 'zombie', 'feign'], { variant: 4, hpMul: 1.8 }); horde(L, a, 'cb', 4, ['stalker', 'zombie', 'feign'], { variant: 3, hpMul: 1.8 });
      horde(L, a, 'cc', 4, ['lasher', 'spider', 'feign'], { hpMul: 1.8 }); horde(L, a, 'cd', 4, ['reaper', 'zombie', 'feign'], { variant: 3, hpMul: 1.8 });
      horde(L, a, 'tank', 5, ['bloater', 'lasher', 'feign', 'spider'], { variant: 2, hpMul: 1.8 }); horde(L, a, 'waste', 4, ['zombie', 'bloater', 'feign'], { variant: 6, hpMul: 1.8 });
      horde(L, a, 'pens', 4, ['stalker', 'stalker', 'reaper'], { hpMul: 1.4 }); horde(L, a, 'obs', 2, ['trooper', 'feign'], { variant: 3, hpMul: 1.8 });
    },
    b4: function (L, a) {
      var p = rp(L, a, 'vault', 0.5, 0.45); a.box('dark', p.x, 0, p.z, 1.6, 1.0, 1.0, 0, true); a.box('emit', p.x, 1.0, p.z, 1.5, 0.02, 0.9);
      a.item('rail', p.x, 1.02, p.z, { id: 'nx_rail', name: 'XR-9 Railgun' }); a.item('rail_ammo', p.x - 3, 0, p.z + 2, { id: 'nx_ra2', amount: 8 }); a.item('money', p.x + 3, 0, p.z + 2, { id: 'nx_m2', amount: 20000 }); a.item('file', p.x + 2, 0, p.z - 2, { id: 'nx_f6', file: 'nadir6' });
      p = rp(L, a, 'cool', 0.5, 0.3); a.item('sample', p.x, 0, p.z, { id: 'nx_s3' });
      a.spawn('nadir', L.corePos.x, L.corePos.z, { id: 'nx_nadir', yaw: PI });
      horde(L, a, 'tunnel', 5, ['spawnling', 'spawnling', 'stalker'], { hpMul: 1 }); horde(L, a, 'ante', 6, ['lasher', 'stalker', 'spawnling', 'feign'], { variant: 2, hpMul: 2 });
      horde(L, a, 'cool', 6, ['spawnling', 'lasher', 'bloater', 'feign'], { variant: 2, hpMul: 2 });
    }
  };
  // ------------------------------------------------------------------ the dead: instanced bodies, bags and blood
  function corpseMeshes(L) {
    var list = L.corpses; if (!list.length) return;
    var parts = { torso: [], pelvis: [], head: [], limb: [], bag: [], blood: [] }, col = new THREE.Color(), M = new THREE.Matrix4(), base = new THREE.Matrix4(), loc = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new V3(), s = new V3();
    function put(kind, lx, ly, lz, rx, ry, rz, sx, sy, sz, c) { e.set(rx, ry, rz); q.setFromEuler(e); p.set(lx, ly, lz); s.set(sx, sy, sz); loc.compose(p, q, s); M.multiplyMatrices(base, loc); parts[kind].push({ m: M.clone(), c: c }); }
    list.forEach(function (o) {
      var r = NF.tex.rnd((o.seed * 1000 + o.x * 13 + o.z * 7) | 0);
      e.set(0, o.ry, 0); q.setFromEuler(e); p.set(o.x, 0, o.z); s.set(1, 1, 1); base.compose(p, q, s);
      if (o.pose === 'blood') { put('blood', 0, 0.012, 0, -PI / 2, 0, r() * 6, 1 + r() * 1.6, 1 + r() * 1.6, 1, '#ffffff'); return; }
      if (o.pose === 'bag') { put('bag', 0, 0.18, 0, 0, r() * 0.4, 0, 0.55, 0.32, 1.8, r() < 0.5 ? '#1a1c18' : '#2a3020'); return; }
      var cs = CORPSE_COLS[o.kind] || CORPSE_COLS.soldier, cloth = cs[(r() * cs.length) | 0], pants = cs[2], skin = o.kind === 'flesh' ? '#9a5a4a' : ['#8a8a78', '#9a8a7a', '#7a7a6a'][(r() * 3) | 0];
      var helmet = o.kind === 'soldier' && r() < 0.6;
      if (o.pose === 'sit') {
        // slumped against the wall, legs out
        put('pelvis', 0, 0.16, 0.25, 0, 0, 0, 0.34, 0.2, 0.26, pants);
        put('torso', 0, 0.48, 0.12, -0.35, 0, (r() - .5) * 0.4, 0.4, 0.55, 0.24, cloth);
        put('head', (r() - .5) * 0.15, 0.82, 0.24, 0, 0, 0, 0.12, 0.14, 0.13, helmet ? '#3a4030' : skin);
        [-1, 1].forEach(function (sd) { put('limb', sd * 0.1, 0.1, 0.62, PI / 2, 0, sd * 0.1, 0.075, 0.42, 0.075, pants); put('limb', sd * 0.12, 0.08, 1.02, PI / 2, 0, 0, 0.06, 0.4, 0.06, pants); put('limb', sd * 0.24, 0.32, 0.25, 0.3, 0, sd * 0.25, 0.055, 0.5, 0.055, cloth); });
        return;
      }
      if (o.pose === 'stand') { put('torso', 0, 1.2, 0, 0.3, 0, 0, 0.38, 0.55, 0.22, skin); put('head', 0, 1.62, 0.1, 0, 0, 0, 0.11, 0.13, 0.12, skin); put('pelvis', 0, 0.85, 0, 0, 0, 0, 0.3, 0.2, 0.2, skin); [-1, 1].forEach(function (sd) { put('limb', sd * 0.1, 0.45, 0, 0, 0, 0, 0.07, 0.8, 0.07, skin); put('limb', sd * 0.25, 1.1, 0, 0, 0, sd * 0.2, 0.05, 0.6, 0.05, skin); }); return; }
      var y0 = o.pose === 'table' ? 0.95 : o.pose === 'bed' ? 0.95 : 0;
      var curl = o.pose === 'curl';
      put('torso', 0, y0 + 0.13, 0.15, PI / 2, 0, (r() - .5) * 0.3, 0.4, 0.55, 0.22, cloth);
      put('pelvis', 0, y0 + 0.12, -0.25, PI / 2, 0, 0, 0.32, 0.22, 0.2, pants);
      if (r() < 0.9) put('head', (r() - .5) * 0.2, y0 + 0.12, 0.6, 0, r() * 2, 0, 0.12, 0.13, 0.14, helmet ? '#3a4030' : skin);
      [-1, 1].forEach(function (sd) {
        var a1 = curl ? 0.9 : 0.2 + r() * 1.3, a2 = curl ? 1.4 : r() * 1.2;
        if (r() < 0.92) { put('limb', sd * (0.25 + Math.sin(a1) * 0.12), y0 + 0.08, 0.25 - Math.cos(a1) * 0.05, PI / 2, 0, sd * a1, 0.055, 0.32, 0.055, cloth); put('limb', sd * (0.3 + Math.sin(a1) * 0.3 + Math.sin(a2) * 0.1), y0 + 0.07, 0.0 + Math.cos(a1) * 0.1, PI / 2, 0, sd * (a1 + a2 * 0.5), 0.045, 0.3, 0.045, skin); }
        var l1 = curl ? 1.0 : (r() - .2) * 0.5, l2 = curl ? 1.6 : r() * 0.6;
        if (r() < 0.93) { put('limb', sd * (0.1 + Math.sin(l1) * 0.2), y0 + 0.08, -0.55 + (curl ? 0.25 : 0), PI / 2, 0, -sd * l1 * 0.4, 0.075, 0.44, 0.075, pants); put('limb', sd * (0.12 + Math.sin(l1) * 0.4), y0 + 0.07, -0.95 + (curl ? 0.5 : 0), PI / 2, 0, -sd * (l1 * 0.4 - l2 * 0.3), 0.06, 0.42, 0.06, pants); }
      });
      if (o.pose === 'lie' || o.pose === 'curl') put('blood', 0, 0.012, 0.1, -PI / 2, 0, r() * 6, 1.2 + r(), 1.2 + r(), 1, '#ffffff');
    });
    var geos = { torso: new THREE.BoxGeometry(1, 1, 1), pelvis: new THREE.BoxGeometry(1, 1, 1), head: new THREE.SphereGeometry(1, 10, 8), limb: new THREE.CylinderGeometry(1, 0.85, 1, 7), bag: new THREE.SphereGeometry(0.5, 10, 8), blood: new THREE.PlaneGeometry(1, 1) };
    Object.keys(parts).forEach(function (k) {
      var arr = parts[k]; if (!arr.length) return;
      var mat = k === 'blood' ? mats.blood : std({ color: '#ffffff', roughness: k === 'bag' ? 0.35 : 0.85, map: k === 'torso' || k === 'pelvis' || k === 'limb' ? NF.tex.cloth('#ffffff', true, 5) : null });
      var im = new THREE.InstancedMesh(geos[k], mat, arr.length);
      arr.forEach(function (it, n) { im.setMatrixAt(n, it.m); if (im.setColorAt) im.setColorAt(n, col.set(it.c)); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.receiveShadow = k !== 'blood'; im.castShadow = false; im.frustumCulled = false; L.group.add(im);
    });
  }
  // ------------------------------------------------------------------ navigation: a flow field over the grid
  var flow = null, flowCell = -1, flowT = 0, Q = null;
  function cellOf(L, x, z) { var gx = Math.floor((x - B.X0) / C), gz = Math.floor((z - LZ(L.i)) / C); if (gx < 0 || gz < 0 || gx >= L.W || gz >= L.D) return -1; var c = gz * L.W + gx; return L.cell[c] >= 0 ? c : -1; }
  function bfs(L, start) {
    var n = L.W * L.D; if (!flow || flow.length !== n) { flow = new Int32Array(n); Q = new Int32Array(n); }
    flow.fill(-1); var h = 0, t = 0; flow[start] = 0; Q[t++] = start;
    while (h < t) { var c = Q[h++], e = L.edge[c], dd = flow[c] + 1;
      if ((e & PX) && flow[c + 1] < 0) { flow[c + 1] = dd; Q[t++] = c + 1; }
      if ((e & NX) && flow[c - 1] < 0) { flow[c - 1] = dd; Q[t++] = c - 1; }
      if ((e & PZ) && flow[c + L.W] < 0) { flow[c + L.W] = dd; Q[t++] = c + L.W; }
      if ((e & NZ) && flow[c - L.W] < 0) { flow[c - L.W] = dd; Q[t++] = c - L.W; } }
    flowCell = start;
  }
  // can we walk a straight line from cell a to cell b without crossing a wall?
  function los(L, a, b) {
    var ax = a % L.W + 0.5, az = (a / L.W | 0) + 0.5, bx = b % L.W + 0.5, bz = (b / L.W | 0) + 0.5;
    var x = Math.floor(ax), z = Math.floor(az), dx = bx - ax, dz = bz - az, sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    var tdx = dx ? Math.abs(1 / dx) : 1e9, tdz = dz ? Math.abs(1 / dz) : 1e9, tmx = dx ? 0.5 * tdx : 1e9, tmz = dz ? 0.5 * tdz : 1e9, guard = 0;
    while ((x !== b % L.W || z !== (b / L.W | 0)) && guard++ < 200) {
      var c = z * L.W + x;
      if (Math.abs(tmx - tmz) < 1e-6) { // through a corner: both routes must be open
        var c1 = c + sx, c2 = c + sz * L.W;
        if (!(L.edge[c] & (sx > 0 ? PX : NX)) || !(L.edge[c] & (sz > 0 ? PZ : NZ)) || !(L.edge[c1] & (sz > 0 ? PZ : NZ)) || !(L.edge[c2] & (sx > 0 ? PX : NX))) return false;
        x += sx; z += sz; tmx += tdx; tmz += tdz;
      } else if (tmx < tmz) { if (!(L.edge[c] & (sx > 0 ? PX : NX))) return false; x += sx; tmx += tdx; }
      else { if (!(L.edge[c] & (sz > 0 ? PZ : NZ))) return false; z += sz; tmz += tdz; }
    }
    return true;
  }
  B.steer = function (epos, ppos) {
    var L = B.levels[B.level]; if (!L) return ppos;
    var pc = cellOf(L, ppos.x, ppos.z), ec = cellOf(L, epos.x, epos.z);
    if (pc < 0 || ec < 0) return ppos;
    if (pc !== flowCell || flowT <= 0) { bfs(L, pc); flowT = 0.35; }
    if (ec === pc || los(L, ec, pc)) return ppos;
    if (flow[ec] < 0) return null;
    var cur = ec, best = ec;
    for (var k = 0; k < 10; k++) {
      var e = L.edge[cur], dd = flow[cur] - 1, nx = -1;
      if ((e & PX) && flow[cur + 1] === dd) nx = cur + 1; else if ((e & NX) && flow[cur - 1] === dd) nx = cur - 1; else if ((e & PZ) && flow[cur + L.W] === dd) nx = cur + L.W; else if ((e & NZ) && flow[cur - L.W] === dd) nx = cur - L.W;
      if (nx < 0) break;
      if (k > 0 && !los(L, ec, nx)) break;
      best = nx; cur = nx; if (cur === pc) return ppos;
    }
    return new V3(B.X0 + (best % L.W) * C + C / 2, 0, LZ(L.i) + (best / L.W | 0) * C + C / 2);
  };
  // a walkable spot some distance from the player along the flow field (for waves)
  B.spawnPoint = function (ppos, minC, maxC) {
    var L = B.levels[B.level]; if (!L) return null; var pc = cellOf(L, ppos.x, ppos.z); if (pc < 0) return null;
    bfs(L, pc); var cand = [];
    for (var c = 0; c < flow.length; c++) if (flow[c] >= minC && flow[c] <= maxC && !L.rooms[L.cell[c]].safe) cand.push(c);
    if (!cand.length) return null; var cc = cand[(Math.random() * cand.length) | 0];
    return { x: B.X0 + (cc % L.W) * C + C / 2 + (Math.random() - .5), z: LZ(L.i) + (cc / L.W | 0) * C + C / 2 + (Math.random() - .5) };
  };
  // ------------------------------------------------------------------ entering and leaving
  var pool = [];
  B.init = function (sc) {
    scene = sc; W = NF.world; std = NF.models.std; V3 = THREE.Vector3;
    _m4 = new THREE.Matrix4(); _q = new THREE.Quaternion(); _e = new THREE.Euler(); _s = new V3(); _p = new V3(); _v = new V3(); _n = new V3(); _nm = new THREE.Matrix3();
    unitBox = new THREE.BoxGeometry(1, 1, 1); sphGeo = new THREE.SphereGeometry(1, 12, 9); planeGeo = new THREE.PlaneGeometry(1, 1);
    for (var k = 0; k < 7; k++) { var l = new THREE.PointLight('#ffffff', 0, 16, 2); l.visible = false; scene.add(l); pool.push(l); }
  };
  B.levelAt = function (x, z) { if (x < 9000) return -1; var i = Math.round(z / 400); return i >= 0 && i < LEVELS.length ? i : -1; };
  B.enter = function (i, flags) {
    if (B.active && B.level !== i) leaveLevel();
    var L = build(i); B.active = true; B.level = i; L.group.visible = true; flowCell = -1;
    L.extra.forEach(function (r) { if (W.extraRooms.indexOf(r) < 0) W.extraRooms.push(r); });
    var taken = flags.taken || {}, killed = flags.killed || {}, nd = flags.ndoors || {};
    L.doors.forEach(function (d) { d.lvl = i; if (nd[d.id] || (d.lock && d.lock.indexOf('flag:') === 0 && flags[d.lock.slice(5)])) B.openDoor(d, true); });
    L.items = [];
    L.itemDefs.forEach(function (o) { if (taken[o.id]) return; L.items.push(W.item(o.id, o.type, o.x, o.y, o.z, { amount: o.amount || NF.terrain.defaultAmount(o.type), file: o.file, name: o.name, value: o.value })); });
    var drops = flags.ndrop || {}; Object.keys(drops).forEach(function (id) { var o = drops[id]; if (taken[id] || B.levelAt(o.x, o.z) !== i) return; L.items.push(W.item(id, o.t, o.x, 0, o.z, {})); });
    L.enemies = [];
    L.spawnDefs.forEach(function (s) {
      if (killed[s.id]) return;
      if (s.type === 'goliath' && flags.goliathDead) return; if (s.type === 'nadir' && flags.nadirDead) return;
      var o = {}; for (var kk in s.o) o[kk] = s.o[kk]; o.yaw = o.yaw !== undefined ? o.yaw : Math.random() * 6.28; o.seed = (s.x * 7 + s.z * 13) | 0;
      if (o.feign) { o.state = 'feign'; }
      var e = NF.enemies.spawn(s.type, s.id, s.x, s.z, o);
      if (o.hpMul) { e.hp *= o.hpMul; e.maxHp = e.hp; e.dmgMul = 1 + (o.hpMul - 1) * 0.5; }
      e.far = true; e.bunker = i; e.noDrop = Math.random() < 0.4; L.enemies.push(e);
    });
    if (i === 1 && flags.nadirPower) L.powered = true;
    pool.forEach(function (l) { l.visible = true; l.intensity = 0; l.userData.src = null; });
    W.lights.forEach(function (l) { l.visible = false; });
    return L;
  };
  B.addItem = function (id, type, x, z, amount) { var L = B.levels[B.level]; var it = W.item(id, type, x, 0, z, { amount: amount }); if (L) L.items.push(it); return it; };
  function leaveLevel() {
    var L = B.levels[B.level]; if (!L) return;
    L.group.visible = false;
    L.extra.forEach(function (r) { var k = W.extraRooms.indexOf(r); if (k >= 0) W.extraRooms.splice(k, 1); });
    (L.items || []).forEach(function (it) { if (!it.taken) W.removeItem(it); });
    NF.enemies.list.slice().forEach(function (e) { if (e.bunker === L.i) NF.enemies.remove(e); });
    pool.forEach(function (l) { l.visible = false; l.intensity = 0; });
  }
  B.leave = function () { if (!B.active) return; leaveLevel(); B.active = false; B.level = -1; W.lights.forEach(function (l) { l.visible = true; }); };
  B.arrival = function (i) { var L = B.levels[i] || build(i); return L.arrive; };
  B.current = function () { return B.levels[B.level]; };
  // ------------------------------------------------------------------ per frame
  var frameN = 0;
  B.update = function (dt, t, P) {
    if (!B.active) return; var L = B.levels[B.level]; if (!L) return;
    frameN++; flowT -= dt;
    updateDoors(L, dt);
    for (var k = 0; k < L.anims.length; k++) L.anims[k](t, dt);
    if (frameN % 12 === 0) {
      var cand = L.lights.filter(function (l) { return Math.abs(l.x - P.pos.x) < 36 && Math.abs(l.z - P.pos.z) < 36; }).sort(function (a, b) { return Math.hypot(a.x - P.pos.x, a.z - P.pos.z) - Math.hypot(b.x - P.pos.x, b.z - P.pos.z); });
      pool.forEach(function (l, n) { var c = cand[n]; l.userData.src = c || null; if (!c) { l.intensity = 0; return; } l.position.set(c.x, c.y, c.z); l.color.set(c.c); l.distance = c.d; });
    }
    pool.forEach(function (l) {
      var c = l.userData.src; if (!c) { l.intensity = 0; return; } var b = c.i;
      if (c.kind === 'fluoro') l.intensity = Math.sin(t * 1.3 + c.seed) > 0.92 && Math.sin(t * 40) > 0 ? 0.08 : b;
      else if (c.kind === 'broken') l.intensity = Math.sin(t * 31 + c.seed) > 0.5 || Math.sin(t * 0.7 + c.seed) > 0.3 ? b : b * 0.08;
      else if (c.kind === 'pulse') l.intensity = b * (0.45 + 0.55 * Math.abs(Math.sin(t * 1.6 + c.seed)));
      else if (c.kind === 'fire') l.intensity = b * (0.75 + 0.25 * Math.sin(t * 9 + c.seed));
      else l.intensity = b;
    });
    // hide the far dead and living so draw calls stay sane
    if (frameN % 10 === 0) NF.enemies.list.forEach(function (e) { if (e.bunker !== L.i || e.state === 'dormant' || e.type === 'nadir') return; var d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z); e.rig.root.visible = d < (e.alert ? 60 : 46); });
    var c = cellOf(L, P.pos.x, P.pos.z); if (c >= 0) B.cellRoom = L.rooms[L.cell[c]];
  };
  // ------------------------------------------------------------------ maps
  function planCanvas(L) {
    if (L.plan) return L.plan;
    var s = 6, cv = document.createElement('canvas'); cv.width = L.W * s; cv.height = L.D * s; var g = cv.getContext('2d');
    L.rooms.forEach(function (r) { g.fillStyle = r.safe ? '#21402c' : r.kind === 'corridor' || r.kind === 'tunnel' ? '#2c3236' : '#283038'; g.fillRect(r.gx * s, r.gz * s, r.w * s, r.d * s); });
    g.strokeStyle = '#c8d4dc'; g.lineWidth = 2; g.beginPath();
    for (var z = 0; z < L.D; z++) for (var x = 0; x < L.W; x++) { var c = z * L.W + x; if (L.cell[c] < 0) continue; var e = L.edge[c];
      if (!(e & PX)) { g.moveTo((x + 1) * s, z * s); g.lineTo((x + 1) * s, (z + 1) * s); } if (!(e & NX)) { g.moveTo(x * s, z * s); g.lineTo(x * s, (z + 1) * s); }
      if (!(e & PZ)) { g.moveTo(x * s, (z + 1) * s); g.lineTo((x + 1) * s, (z + 1) * s); } if (!(e & NZ)) { g.moveTo(x * s, z * s); g.lineTo((x + 1) * s, z * s); } }
    g.stroke(); L.plan = cv; L.planS = s; return cv;
  }
  // full-screen plan for the map screen. Screen right is world -x, like the manor plan.
  B.drawPlan = function (g, Wd, Hh, dpr, P, flags, zoom, hasKey) {
    var L = B.levels[B.level]; if (!L) return;
    g.fillStyle = '#0b0e10'; g.fillRect(0, 0, Wd, Hh);
    g.strokeStyle = 'rgba(120,160,190,.07)'; g.lineWidth = 1; for (var gx = 0; gx < Wd; gx += 24 * dpr) { g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, Hh); g.stroke(); } for (var gy = 0; gy < Hh; gy += 24 * dpr) { g.beginPath(); g.moveTo(0, gy); g.lineTo(Wd, gy); g.stroke(); }
    var s = Math.min(Wd / (L.W * C), (Hh - 140 * dpr) / (L.D * C)) * 0.92 * Math.max(1, zoom * 0.7), ox = Wd / 2, oz = Hh / 2 + 20 * dpr;
    var mx = B.X0 + L.W * C / 2, mz = LZ(L.i) + L.D * C / 2;
    function SX(x) { return ox - (x - mx) * s; } function SZ(z) { return oz - (z - mz) * s; }
    var vis = flags.visited || {};
    L.rooms.forEach(function (r, n) {
      var ex = L.extra[n], seen = vis[ex.id], a = SX(ex.x1), b = SZ(ex.z1), w = SX(ex.x0) - a, h = SZ(ex.z0) - b;
      g.fillStyle = W.roomAt(P.pos.x, P.pos.z) === ex ? 'rgba(201,162,74,.32)' : seen ? (r.safe ? 'rgba(60,150,90,.3)' : 'rgba(70,110,160,.2)') : 'rgba(255,255,255,.035)';
      g.fillRect(a, b, w, h); g.strokeStyle = seen ? '#d8ccb4' : 'rgba(255,255,255,.16)'; g.lineWidth = 2 * dpr; g.strokeRect(a, b, w, h);
      if (Math.min(w, h) > 30 * dpr) { g.fillStyle = seen ? '#e8dcc8' : 'rgba(255,255,255,.28)'; var fs = 13 * dpr; g.font = '600 ' + fs + 'px Cinzel, serif'; var tw = g.measureText(seen ? r.name.toUpperCase() : '?').width; if (tw > w - 8 * dpr) fs = Math.max(7 * dpr, fs * (w - 8 * dpr) / tw); g.font = '600 ' + fs + 'px Cinzel, serif'; g.textAlign = 'center'; g.fillText(seen ? r.name.toUpperCase() : '?', a + w / 2, b + h / 2 + 4 * dpr); if (r.safe && seen) { g.fillStyle = '#5ac87a'; g.font = (10 * dpr) + 'px Inter, sans-serif'; g.fillText('SAFE ROOM', a + w / 2, b + h / 2 + 18 * dpr); } }
    });
    L.openings.concat(L.doors).forEach(function (d) {
      var locked = d.lock && !d.open, col = locked ? '#ff3a3a' : '#5aa0ff', len = d.len * s, q = [SX(d.cx), SZ(d.cz)];
      g.fillStyle = col; if (d.axis === 'x') g.fillRect(q[0] - len / 2, q[1] - 3 * dpr, len, 6 * dpr); else g.fillRect(q[0] - 3 * dpr, q[1] - len / 2, 6 * dpr, len);
      if (locked) { g.font = (12 * dpr) + 'px sans-serif'; g.textAlign = 'center'; g.fillText('🔒', q[0], q[1] - 8 * dpr); }
    });
    if (L.arrive) { g.font = (16 * dpr) + 'px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffd25a'; g.fillText('⇅', SX(L.arrive.x), SZ(L.arrive.z - 3)); }
    (L.items || []).forEach(function (it) { if (it.taken) return; var rr = W.roomAt(it.x, it.z); if (rr && vis[rr.id]) { g.fillStyle = it.type === 'file' ? '#9ad0ff' : /key|pass|omega|rail$/.test(it.type) ? '#ff7ad0' : '#ffd25a'; g.beginPath(); g.arc(SX(it.x), SZ(it.z), 3.5 * dpr, 0, 7); g.fill(); } });
    g.save(); g.translate(SX(P.pos.x), SZ(P.pos.z)); g.rotate(-P.yaw); g.fillStyle = '#ff4a3a'; g.strokeStyle = '#fff'; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(0, -11 * dpr); g.lineTo(8 * dpr, 9 * dpr); g.lineTo(0, 4 * dpr); g.lineTo(-8 * dpr, 9 * dpr); g.closePath(); g.fill(); g.stroke(); g.restore();
  };
  // HUD minimap: a rotating window onto the level plan
  B.drawMini = function (mg, size, P, heading) {
    var L = B.levels[B.level]; if (!L) return; var cv = planCanvas(L), ps = L.planS, R = size / 2, k = size / (60 / C * ps);
    mg.save(); mg.clearRect(0, 0, size, size); mg.beginPath(); mg.arc(R, R, R - 2, 0, 7); mg.clip(); mg.fillStyle = '#07090a'; mg.fillRect(0, 0, size, size);
    mg.translate(R, R); mg.rotate(heading); mg.scale(-k, -k);
    var px = (P.pos.x - B.X0) / C * ps, pz = (P.pos.z - LZ(L.i)) / C * ps; mg.drawImage(cv, -px, -pz);
    mg.restore();
    mg.fillStyle = '#ff4a3a'; mg.strokeStyle = '#fff'; mg.lineWidth = 3; mg.beginPath(); mg.moveTo(R, R - 16); mg.lineTo(R + 11, R + 12); mg.lineTo(R, R + 5); mg.lineTo(R - 11, R + 12); mg.closePath(); mg.fill(); mg.stroke();
    mg.fillStyle = '#c9a24a'; mg.font = '700 22px Cinzel, serif'; mg.textAlign = 'center'; mg.fillText(L.def.short, R, size - 18);
    mg.strokeStyle = 'rgba(201,162,74,.6)'; mg.lineWidth = 4; mg.beginPath(); mg.arc(R, R, R - 3, 0, 7); mg.stroke();
  };
  // where the compass points down here: the next thing that needs doing
  B.goal = function (flags, P) {
    var L = B.levels[B.level]; if (!L) return null;
    var id = L.def.id, hasIt = function (k) { return P.inv[k] > 0 || flags['used_' + k]; };
    function item(id2) { var d = L.itemDefs.filter(function (o) { return o.id === id2; })[0]; return d && !(flags.taken || {})[id2] ? d : null; }
    function lift() { return L.arrive; }
    if (id === 'b1') { if (hasIt('pass_b2')) return lift(); var cpt = NF.enemies.byId('nx_captain'); return cpt && !cpt.dead ? cpt.pos : (flags.ndrop && flags.ndrop.nx_pass_b2) || lift(); }
    if (id === 'b2') { if (flags.nadirPower) return lift(); if (!hasIt('b2key')) return item('nx_b2key') || lift(); var rc = L.byKey.reac; return { x: B.X0 + (rc.gx + rc.w / 2) * C, z: LZ(L.i) + (rc.gz + rc.d - 2) * C }; }
    if (id === 'b3') { if (hasIt('omega')) return lift(); return L.arena || lift(); }
    if (id === 'b4') { if (!flags.nadirDead) return L.corePos; var rail = item('nx_rail'); return rail || lift(); }
    return null;
  };
  return B;
})();
