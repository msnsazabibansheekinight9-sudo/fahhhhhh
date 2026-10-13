'use strict';
/* Crumble — the tool belt: what each tool does to the world, projectiles, explosions and first-person models. */

const TOOL_DEFS = [
  { id: 'hammer', name: 'Sledgehammer', hint: 'Breaks glass, timber, plaster and brick', hold: false, cd: 0.42 },
  { id: 'torch', name: 'Blowtorch', hint: 'Cuts anything, slowly. Lights timber', hold: true, cd: 0.07, unit: 's' },
  { id: 'ext', name: 'Extinguisher', hint: 'Puts out fires', hold: true, cd: 0.05, unit: 's' },
  { id: 'spray', name: 'Spray can', hint: 'Mark your route. Right-click: colour', hold: true, cd: 0.03 },
  { id: 'pistol', name: 'Pistol', hint: 'Punches through glass, timber and plaster', hold: false, cd: 0.22 },
  { id: 'shotgun', name: 'Shotgun', hint: 'Blows holes in soft walls', hold: false, cd: 0.9 },
  { id: 'rifle', name: 'Hunting rifle', hint: 'Long range, goes through soft walls', hold: false, cd: 1.1 },
  { id: 'planks', name: 'Planks', hint: 'Click two points to bridge them', hold: false, cd: 0.25 },
  { id: 'bomb', name: 'Pipe bomb', hint: '3 s fuse. Concrete and brick', hold: false, cd: 0.6 },
  { id: 'charge', name: 'Remote charge', hint: 'Click to stick one on · right-click sets them all off', hold: false, cd: 0.35 },
  { id: 'rocket', name: 'Rocket launcher', hint: 'Detonates on impact. Cuts steel', hold: false, cd: 1.3 }
];
const TOOL_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus'];

const Tools = {
  cur: 0, ammo: {}, cdT: 0, plankA: null, proj: [], swing: 0, recoil: 0, sprayIdx: 0, firing: false,
  init(scene, vmScene) {
    this.scene = scene; this.vmScene = vmScene;
    this.marker = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshBasicMaterial({ color: 0xffd34a, wireframe: true }));
    this.marker.visible = false; scene.add(this.marker);
    this.vm = {}; for (const d of TOOL_DEFS) { this.vm[d.id] = this.buildVM(d.id); this.vm[d.id].visible = false; vmScene.add(this.vm[d.id]); }
    this.projMatBomb = new THREE.MeshLambertMaterial({ color: 0x5a5e62 });
    this.projMatRocket = new THREE.MeshLambertMaterial({ color: 0x4d5a3a });
  },
  buildVM(id) {
    const g = new THREE.Group();
    const L = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e || 0 });
    const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
    const cyl = (r, h, x, y, z, m, rx) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), m); b.position.set(x, y, z); if (rx) b.rotation.x = rx; g.add(b); return b; };
    const wood = L(0x8a5a32), steel = L(0x50565c), dark = L(0x222326);
    if (id === 'hammer') { box(0.05, 0.05, 0.85, 0, 0, -0.2, wood); box(0.13, 0.13, 0.32, 0, 0.06, -0.62, steel).rotation.y = Math.PI / 2; }
    if (id === 'torch') { cyl(0.07, 0.34, 0, -0.05, 0, L(0x2e6bb8), 0); box(0.03, 0.03, 0.4, 0, 0.1, -0.22, steel); this.flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 8), new THREE.MeshBasicMaterial({ color: 0x8fd0ff })); this.flame.rotation.x = -Math.PI / 2; this.flame.position.set(0, 0.1, -0.5); this.flame.visible = false; g.add(this.flame); }
    if (id === 'ext') { cyl(0.09, 0.42, 0, -0.08, 0, L(0xc02a22), 0); box(0.04, 0.04, 0.3, 0.02, 0.16, -0.16, dark); }
    if (id === 'spray') { this.sprayBody = cyl(0.045, 0.2, 0, 0, -0.05, L(0xd63a2e), 0); cyl(0.02, 0.04, 0, 0.12, -0.05, L(0xdddddd), 0); }
    if (id === 'shotgun') { cyl(0.025, 0.7, 0, 0.02, -0.35, steel, Math.PI / 2); cyl(0.022, 0.6, 0, -0.03, -0.3, steel, Math.PI / 2); box(0.06, 0.12, 0.3, 0, -0.04, 0.05, wood); box(0.07, 0.07, 0.18, 0, -0.04, -0.28, wood); }
    if (id === 'pistol') { box(0.05, 0.08, 0.26, 0, 0.03, -0.12, dark); box(0.045, 0.14, 0.07, 0, -0.06, 0, dark); box(0.03, 0.02, 0.05, 0, 0.08, -0.22, steel); }
    if (id === 'rifle') { cyl(0.02, 0.85, 0, 0.03, -0.45, steel, Math.PI / 2); box(0.06, 0.1, 0.5, 0, -0.01, -0.05, wood); box(0.05, 0.14, 0.26, 0, -0.05, 0.28, wood); cyl(0.03, 0.32, 0, 0.1, -0.15, dark, Math.PI / 2); box(0.03, 0.03, 0.06, 0.04, 0.04, 0.0, steel); }
    if (id === 'charge') { box(0.18, 0.1, 0.24, 0, 0, -0.1, L(0x8c7a52)); box(0.06, 0.03, 0.06, 0.04, 0.065, -0.14, L(0xff2a1a, 0xaa0000)); box(0.14, 0.02, 0.02, 0, 0.06, -0.02, dark); }
    if (id === 'planks') { box(0.3, 0.04, 0.7, 0, 0, -0.25, L(0xb48a58)); box(0.3, 0.04, 0.7, 0.02, 0.05, -0.22, L(0xa67c4c)); }
    if (id === 'bomb') { cyl(0.05, 0.26, 0, 0, -0.1, steel, Math.PI / 2); cyl(0.058, 0.04, 0, 0, -0.24, dark, Math.PI / 2); cyl(0.058, 0.04, 0, 0, 0.04, dark, Math.PI / 2); }
    if (id === 'rocket') { cyl(0.07, 0.9, 0, 0.04, -0.2, L(0x4d5a3a), Math.PI / 2); box(0.04, 0.14, 0.06, 0, -0.08, -0.05, dark); box(0.05, 0.06, 0.12, -0.08, 0.1, -0.1, dark); }
    g.position.set(0.32, -0.3, -0.55);
    return g;
  },
  setLoadout(lo) {
    this.ammo = {}; for (const d of TOOL_DEFS) this.ammo[d.id] = lo[d.id] == null ? 0 : lo[d.id];
    this.cur = 0; this.plankA = null; this.marker.visible = false; this.select(0);
    for (const p of this.proj) this.scene.remove(p.mesh); this.proj = [];
    for (const c of this.charges || []) this.scene.remove(c.mesh); this.charges = [];
  },
  available() { return TOOL_DEFS.map((d, i) => i).filter(i => this.ammo[TOOL_DEFS[i].id] > 0); },
  select(i) {
    if (!TOOL_DEFS[i] || !(this.ammo[TOOL_DEFS[i].id] > 0)) return;
    this.cur = i; for (const d of TOOL_DEFS) this.vm[d.id].visible = false;
    this.vm[TOOL_DEFS[i].id].visible = true; this.swing = 0; this.recoil = 0.6;
    if (TOOL_DEFS[i].id !== 'planks') { this.plankA = null; this.marker.visible = false; }
    Game.hud.tools = true; SFX.click();
  },
  cycle(dir) { const av = this.available(); if (!av.length) return; const k = av.indexOf(this.cur); this.select(av[(k + dir + av.length) % av.length]); },
  def() { return TOOL_DEFS[this.cur]; },
  hideVM(h) { for (const d of TOOL_DEFS) this.vm[d.id].visible = !h && d.id === this.def().id; },

  update(dt, inp, w, eye, dir) {
    this.cdT -= dt;
    const d = this.def(), id = d.id;
    const down = inp.mouse[0];
    this.firing = false;
    if (d.hold ? down : inp.pressed0) {
      if (this.cdT <= 0 && this.ammo[id] > 0) { this.cdT = d.cd; this.use(id, w, eye, dir, d.hold ? d.cd : 0); }
      else if (!d.hold && this.ammo[id] <= 0) SFX.empty();
    }
    if (inp.pressed2) {
      if (id === 'spray') { this.sprayIdx = (this.sprayIdx + 1) % SPRAY_COLORS.length; const c = PAINTS[SPRAY_COLORS[this.sprayIdx]]; this.sprayBody.material.color.setRGB(c[0] / 255, c[1] / 255, c[2] / 255); SFX.click(); }
      if (id === 'planks' && this.plankA) { this.plankA = null; this.marker.visible = false; SFX.click(); }
      if (id === 'charge') this.detonate(w);
    }
    SFX.setLoop('torch', id === 'torch' && this.firing ? 0.18 : 0);
    SFX.setLoop('spray', id === 'spray' && this.firing ? 0.07 : 0);
    SFX.setLoop('ext', id === 'ext' && this.firing ? 0.25 : 0);
    if (this.flame) this.flame.visible = id === 'torch' && this.firing;
    this.updateProj(dt, w); this.updateCharges(dt);
    // Viewmodel motion.
    this.swing = Math.max(0, this.swing - dt * 3.2);
    this.recoil = Math.max(0, this.recoil - dt * 5);
    const g = this.vm[id], b = Player.bob;
    g.position.set(0.32 + Math.sin(b) * 0.012, -0.3 + Math.abs(Math.cos(b)) * 0.012 - this.recoil * 0.12, -0.55 + this.recoil * 0.08);
    g.rotation.set(id === 'hammer' ? Math.sin(Math.min(1, this.swing) * Math.PI) * 1.2 : this.recoil * 0.35, 0, 0);
  },

  use(id, w, eye, dir, held) {
    const hit = (range) => w.raycast(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, range, false);
    if (id === 'hammer') {
      this.swing = 1; SFX.whoosh();
      if (this.strikeOther(eye, dir, 12, 2.3, 18, 1)) return;
      const h = hit(12);
      if (!h) return;
      const cx = h.px + dir.x * 0.6, cy = h.py + dir.y * 0.6, cz = h.pz + dir.z * 0.6;
      const res = w.carve(cx, cy, cz, 2.3, 2, false, i => Fire.map.delete(i));
      const pos = new THREE.Vector3(cx, cy, cz);
      if (res.n) { FX.burst(res.samples, cx, cy, cz, 6); SFX.breakMat(h.m, res.n, pos); Game.queueCheck([res.x0, res.y0, res.z0, res.x1, res.y1, res.z1]); FX.shake = Math.max(FX.shake, 0.15); }
      else { SFX.hammer(pos); for (let k = 0; k < 6; k++) FX.spark(h.px, h.py, h.pz, h.nx * 8 + (Math.random() - 0.5) * 10, 6 + Math.random() * 8, h.nz * 8 + (Math.random() - 0.5) * 10); }
    } else if (id === 'torch') {
      this.firing = true; this.ammo.torch = Math.max(0, this.ammo.torch - held);
      const h = hit(9); if (!h) return;
      for (let k = 0; k < 2; k++) FX.spark(h.px, h.py, h.pz, h.nx * 6 + (Math.random() - 0.5) * 12, 4 + Math.random() * 10, h.nz * 6 + (Math.random() - 0.5) * 12);
      if (Math.random() < 0.55) {
        const res = w.carve(h.px + dir.x * 0.4, h.py + dir.y * 0.4, h.pz + dir.z * 0.4, 1.15, 4, false, i => Fire.map.delete(i));
        if (res.n) { Game.queueCheck([res.x0, res.y0, res.z0, res.x1, res.y1, res.z1]); if (Math.random() < 0.3) FX.burst(res.samples.slice(0, 5), h.px, h.py, h.pz, 2); }
      }
      if (FLAM[h.m] && Math.random() < 0.12) Fire.ignite(w, h.x, h.y, h.z);
    } else if (id === 'ext') {
      this.firing = true; this.ammo.ext = Math.max(0, this.ammo.ext - held);
      const h = hit(30); const t = h ? h.t : 30;
      const px = eye.x + dir.x * t, py = eye.y + dir.y * t, pz = eye.z + dir.z * t;
      Fire.extinguish(w, px, py, pz, 5);
      for (let k = 0; k < 3; k++) { const s = Math.random() * t; FX.steam(eye.x + dir.x * s, eye.y + dir.y * s - 0.6, eye.z + dir.z * s); }
    } else if (id === 'spray') {
      this.firing = true;
      const h = hit(30); if (!h) return;
      const col = SPRAY_COLORS[this.sprayIdx], r = 1.7;
      for (let y = Math.floor(h.py - r); y <= h.py + r; y++) for (let z = Math.floor(h.pz - r); z <= h.pz + r; z++) for (let x = Math.floor(h.px - r); x <= h.px + r; x++) {
        if (Math.hypot(x + 0.5 - h.px, y + 0.5 - h.py, z + 0.5 - h.pz) > r || Math.random() < 0.25) continue;
        if (w.get(x, y, z) && !w.get(x + h.nx, y + h.ny, z + h.nz)) w.setPaint(x, y, z, col);
      }
    } else if (id === 'pistol') {
      this.ammo.pistol--; this.recoil = 0.5; Player.pitch = Math.min(1.5, Player.pitch + 0.015);
      SFX.burst(0.18, 2200, 0.6, 0.6, 'lowpass', null, 0.3); FX.flash(eye.x + dir.x * 2, eye.y + dir.y * 2, eye.z + dir.z * 2, 1.5, 0.05);
      this.bullet(w, eye, dir, 0.75, 1, 10);
    } else if (id === 'rifle') {
      this.ammo.rifle--; this.recoil = 1.1; Player.pitch = Math.min(1.5, Player.pitch + 0.07);
      SFX.shot(); SFX.burst(0.6, 900, 0.5, 0.5, 'lowpass', null, 0.2); FX.flash(eye.x + dir.x * 2, eye.y + dir.y * 2, eye.z + dir.z * 2, 3, 0.08);
      // Up to three soft surfaces punched through.
      let o = eye.clone();
      for (let k = 0; k < 3; k++) {
        const r = this.bullet(w, o, dir, 0.9, 2, 40);
        if (!r || r.stop) break;
        o = r.point.clone().addScaledVector(dir, 1.2);
      }
    } else if (id === 'charge') {
      const h = hit(14); if (!h) { SFX.empty(); return; }
      this.ammo.charge--; SFX.click();
      const mesh = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshLambertMaterial({ color: 0x8c7a52 })); mesh.add(body);
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xff2a1a })); led.position.set(0, 0.8, 0); mesh.add(led);
      mesh.position.set(h.px + h.nx * 0.7, h.py + h.ny * 0.7, h.pz + h.nz * 0.7); this.scene.add(mesh);
      this.charges.push({ mesh, led, cell: [h.x, h.y, h.z], t: 0 });
      Game.toast(this.charges.length + ' charge' + (this.charges.length > 1 ? 's' : '') + ' set. Right-click to detonate.');
    } else if (id === 'shotgun') {
      this.ammo.shotgun--; this.recoil = 1; Player.pitch = Math.min(1.5, Player.pitch + 0.05); SFX.shot();
      FX.flash(eye.x + dir.x * 2, eye.y + dir.y * 2, eye.z + dir.z * 2, 3, 0.08);
      let bx0 = 1e9, by0 = 1e9, bz0 = 1e9, bx1 = -1, by1 = -1, bz1 = -1, broke = 0, lastM = 0;
      for (let k = 0; k < 12; k++) {
        const sx = dir.x + (Math.random() - 0.5) * 0.12, sy = dir.y + (Math.random() - 0.5) * 0.12, sz = dir.z + (Math.random() - 0.5) * 0.12, l = Math.hypot(sx, sy, sz);
        const pd = new THREE.Vector3(sx / l, sy / l, sz / l);
        if (this.strikeOther(eye, pd, 140, 1.1, 6, 1)) continue;
        const h = w.raycast(eye.x, eye.y, eye.z, sx / l, sy / l, sz / l, 140, false); if (!h) continue;
        const res = w.carve(h.px + sx / l * 0.4, h.py + sy / l * 0.4, h.pz + sz / l * 0.4, 1.05, 2, false, i => Fire.map.delete(i));
        if (res.n) { broke += res.n; lastM = h.m; FX.burst(res.samples, h.px, h.py, h.pz, 5); bx0 = Math.min(bx0, res.x0); by0 = Math.min(by0, res.y0); bz0 = Math.min(bz0, res.z0); bx1 = Math.max(bx1, res.x1); by1 = Math.max(by1, res.y1); bz1 = Math.max(bz1, res.z1); }
        else FX.spark(h.px, h.py, h.pz, h.nx * 10, 6, h.nz * 10);
      }
      if (broke) { Game.queueCheck([bx0, by0, bz0, bx1, by1, bz1]); SFX.breakMat(lastM, broke, new THREE.Vector3(bx0, by0, bz0)); }
    } else if (id === 'planks') {
      const h = hit(26); if (!h) { SFX.empty(); return; }
      const p = new THREE.Vector3(h.x + 0.5 + h.nx, h.y + 0.5 + h.ny, h.z + 0.5 + h.nz);
      if (!this.plankA) { this.plankA = p; this.marker.position.copy(p); this.marker.visible = true; SFX.click(); return; }
      const a = this.plankA, d = p.clone().sub(a), len = d.length();
      if (len > 52 || len < 2) { Game.toast(len < 2 ? 'Too short for a plank.' : 'Too far apart. Planks reach 13 m.'); return; }
      d.divideScalar(len);
      let perp = new THREE.Vector3(-d.z, 0, d.x); if (perp.lengthSq() < 0.01) perp.set(1, 0, 0); perp.normalize();
      let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1, y1 = -1, z1 = -1;
      for (let t = 0; t <= len; t += 0.4) for (let s = -1.2; s <= 1.2; s += 0.6) {
        const x = Math.floor(a.x + d.x * t + perp.x * s), y = Math.floor(a.y + d.y * t), z = Math.floor(a.z + d.z * t + perp.z * s);
        if (!w.inb(x, y, z) || w.data[w.idx(x, y, z)]) continue;
        w.setRaw(x, y, z, M.PLANK); x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z); x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z);
      }
      if (x1 >= 0) { w.markRegion(x0, y0, z0, x1, y1, z1); Game.queueCheck([x0, y0, z0, x1, y1, z1]); }
      this.ammo.planks--; this.plankA = null; this.marker.visible = false; SFX.plank();
    } else if (id === 'bomb') {
      this.ammo.bomb--; SFX.whoosh(); this.recoil = 0.8;
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6, 8), this.projMatBomb); mesh.castShadow = true; this.scene.add(mesh);
      const v = dir.clone().multiplyScalar(26).add(new THREE.Vector3(0, 7, 0)).add(Player.vel.clone().multiplyScalar(0.5));
      this.proj.push({ kind: 'bomb', pos: eye.clone().addScaledVector(dir, 2), vel: v, t: 3, mesh, spin: Math.random() * 10 });
    } else if (id === 'rocket') {
      this.ammo.rocket--; this.recoil = 1.2; SFX.rocket();
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 8), this.projMatRocket); mesh.rotation.order = 'YXZ'; this.scene.add(mesh);
      this.proj.push({ kind: 'rocket', pos: eye.clone().addScaledVector(dir, 2.5).add(new THREE.Vector3(0, -0.4, 0)), vel: dir.clone().multiplyScalar(90), t: 4, mesh });
    }
  },

  updateProj(dt, w) {
    for (const p of this.proj) {
      p.t -= dt;
      if (p.kind === 'bomb') {
        p.vel.y -= G * dt;
        for (const ax of ['x', 'y', 'z']) {
          const old = p.pos[ax]; p.pos[ax] += p.vel[ax] * dt;
          if (SOLID[w.getf(p.pos.x, p.pos.y, p.pos.z)]) { p.pos[ax] = old; p.vel[ax] *= -0.35; if (ax === 'y') { p.vel.x *= 0.7; p.vel.z *= 0.7; } }
        }
        p.spin += dt * Math.hypot(p.vel.x, p.vel.z);
        p.mesh.position.copy(p.pos); p.mesh.rotation.set(p.spin, 0, Math.PI / 2);
        if (Math.random() < 0.5) FX.spark(p.pos.x, p.pos.y + 0.6, p.pos.z, (Math.random() - 0.5) * 4, 4, (Math.random() - 0.5) * 4);
        if (p.t <= 0) { this.explode(w, p.pos, 6.5, 3); p.dead = true; }
      } else {
        const sp = p.vel.length(), d = p.vel.clone().divideScalar(sp);
        const h = w.raycast(p.pos.x, p.pos.y, p.pos.z, d.x, d.y, d.z, sp * dt, false);
        const vh = this.otherHit(p.pos, d, sp * dt);
        if (vh && (!h || vh.t < h.t)) { this.explode(w, p.pos.clone().addScaledVector(d, vh.t), p.r || 5.5, p.power || 4); p.dead = true; }
        else if (h) { this.explode(w, new THREE.Vector3(h.px, h.py, h.pz), p.r || 5.5, p.power || 4); p.dead = true; }
        else {
          p.pos.addScaledVector(p.vel, dt);
          p.mesh.position.copy(p.pos); p.mesh.lookAt(p.pos.clone().add(d)); p.mesh.rotateX(Math.PI / 2);
          FX.smoke(p.pos.x - d.x * 1.5, p.pos.y - d.y * 1.5, p.pos.z - d.z * 1.5, 1.5, 0.45);
          FX.flame(p.pos.x - d.x * 1.4, p.pos.y - d.y * 1.4, p.pos.z - d.z * 1.4, 1);
          if (p.t <= 0 || p.pos.y < -5) { this.explode(w, p.pos, p.r || 5.5, p.power || 4); p.dead = true; }
        }
      }
      if (p.dead) this.scene.remove(p.mesh);
    }
    this.proj = this.proj.filter(p => !p.dead);
  },

  explode(w, p, r, power) {
    const res = w.carve(p.x, p.y, p.z, r, power, true, i => Fire.map.delete(i));
    FX.burst(res.samples, p.x, p.y, p.z, 22);
    FX.fireball(p.x, p.y, p.z, r * 0.7);
    for (let k = 0; k < 16; k++) FX.smoke(p.x + (Math.random() - 0.5) * r, p.y + Math.random() * r * 0.6, p.z + (Math.random() - 0.5) * r, r * 1.2, 0.6);
    FX.flash(p.x, p.y + 2, p.z, 7, 0.5);
    Fire.igniteSphere(w, p.x, p.y, p.z, r + 1.5, 0.6);
    Bodies.blast(p, r * 2.6, 34);
    if (res.n) Game.queueCheck([res.x0, res.y0, res.z0, res.x1, res.y1, res.z1]);
    const pc = Player.pos.clone(); pc.y += 3.5;
    const d = pc.distanceTo(p);
    FX.shake = Math.max(FX.shake, Math.min(1.2, 26 / (d + 6)));
    if (d < r * 1.9) Player.damage((1 - d / (r * 1.9)) * 95, 'blast');
    for (const v of Game.vehicles) {
      const c = v.pos.clone(); c.y += v.T.H * 0.4;
      const dv = Math.max(0, c.distanceTo(p) - Math.min(v.L, v.W) * 0.4);
      if (dv < r * 2.4) { const k = 1 - dv / (r * 2.4); v.damage(k * k * 160 * (power >= 4 ? 1.6 : 1), c.clone().sub(p).normalize()); v.impulse(p, k * 40 * (power >= 4 ? 1.4 : 1)); }
    }
    Shards.blast(p, r * 3, 30);
    if (d < r * 2.5 && !Player.vehicle) { const kd = Player.pos.clone().sub(p); kd.y = Math.max(kd.y, 2); kd.normalize(); Player.vel.addScaledVector(kd, (1 - d / (r * 2.5)) * 40); }
    SFX.boom(p, power >= 4);
    Game.stats.explosions++;
  },

  // Shared hit for loose pieces and vehicles. Returns true if something other than the world was nearer.
  otherHit(o, d, maxT) {
    const hw = Game.world.raycast(o.x, o.y, o.z, d.x, d.y, d.z, maxT, false), lim = hw ? hw.t : maxT;
    let best = null;
    const hb = Bodies.raycast(o, d, lim); if (hb) best = { t: hb.t, body: hb.body, point: hb.point };
    for (const v of Game.vehicles) {
      if (v === Player.vehicle) continue;
      const t = v.hitTest(o, d, best ? best.t : lim);
      if (t != null && (!best || t < best.t)) best = { t, veh: v, point: o.clone().addScaledVector(d, t) };
    }
    return best;
  },
  strikeOther(o, d, maxT, r, vdmg, push) {
    const h = this.otherHit(o, d, maxT); if (!h) return false;
    if (h.body) { const n = h.body.chip(h.point, r); h.body.v.addScaledVector(d, push * 60 / Math.sqrt(h.body.mass)); h.body.rest = 0; if (n) SFX.breakMat(M.BRICK, n, h.point); else SFX.hammer(h.point); }
    else { h.veh.damage(vdmg, d); h.veh.push.x += d.x * push * 2; h.veh.push.y += d.z * push * 2; SFX.burst(0.15, 2600, 4, 0.5, 'bandpass', h.point); for (let k = 0; k < 6; k++) FX.spark(h.point.x, h.point.y, h.point.z, (Math.random() - 0.5) * 16, Math.random() * 12, (Math.random() - 0.5) * 16); }
    return true;
  },
  // One bullet. Returns where it stopped and whether it should stop.
  bullet(w, o, dir, r, power, vdmg) {
    const oh = this.otherHit(o, dir, 180);
    if (oh) { this.strikeOther(o, dir, 180, r, vdmg, 0.5); return { point: oh.point, stop: true }; }
    const h = w.raycast(o.x, o.y, o.z, dir.x, dir.y, dir.z, 180, false); if (!h) return null;
    const res = w.carve(h.px + dir.x * 0.4, h.py + dir.y * 0.4, h.pz + dir.z * 0.4, r, power, false, i => Fire.map.delete(i));
    const pt = new THREE.Vector3(h.px, h.py, h.pz);
    if (res.n) { FX.burst(res.samples, h.px, h.py, h.pz, 5); Game.queueCheck([res.x0, res.y0, res.z0, res.x1, res.y1, res.z1]); SFX.breakMat(h.m, res.n, pt); }
    else { FX.spark(h.px, h.py, h.pz, h.nx * 10, 6, h.nz * 10); FX.dust(h.px, h.py, h.pz); }
    return { point: pt, stop: !res.n || HARD[h.m] > 1 };
  },
  launch(kind, pos, vel, opts) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.6, 8), this.projMatRocket); this.scene.add(mesh);
    this.proj.push(Object.assign({ kind: 'rocket', pos: pos.clone(), vel: vel.clone(), t: 4, mesh }, opts || {}));
  },
  detonate(w) {
    if (!this.charges.length) { SFX.empty(); return; }
    const list = this.charges; this.charges = [];
    list.forEach((c, i) => setTimeout(() => { this.scene.remove(c.mesh); if (Game.state === 'play') this.explode(w, c.mesh.position.clone(), 7, 3); }, i * 110));
  },
  updateCharges(dt) {
    for (const c of this.charges) { c.t += dt; c.led.visible = (c.t % 0.8) < 0.15; }
  }
};
