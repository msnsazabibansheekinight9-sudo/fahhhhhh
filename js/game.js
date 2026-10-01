// ============================================================================
// Game: range targets & statistics, solo-mission manager, grenades, melee,
// HUD, minimap, scope overlay and the main update loop.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const { gBox, gCylY, gCyl, gSph, gRBox, gProf } = G.geo;
// projectile mass in grams (for energy readouts)
const MASS = { '.303 British': 11.3, '7.92×57mm': 12.8, '.30-06': 9.7, '7.62×54mmR': 9.6, '8mm Lebel': 12.8, '6.5×52mm': 10.5, '6.5×50mmSR': 9, '7.7×58mm': 11.8, '.30-40 Krag': 14, '.30 Carbine': 7.1, '7.92×33mm Kurz': 8.1, '7.62×39mm': 7.9, '7.62×51mm': 9.5, '5.56×45mm': 4, '5.45×39mm': 3.4, '5.8×42mm': 4.2, '6.8×51mm': 8.8, '.300 BLK': 8.1, '.338 Lapua': 16.2, '.300 Win Mag': 12.3, '.50 BMG': 42, '9×19mm': 8, '.45 ACP': 14.9, '7.63×25mm': 5.5, '7.62×25mm': 5.5, '9×18mm': 6.1, '.455 Webley': 17, '.357 Magnum': 10.2, '.44 Magnum': 15.6, '.50 AE': 19.4, '8×22mm Nambu': 6.6, '.45 Colt': 16.2, '4.6×30mm': 2, '5.7×28mm': 2, '.40 S&W': 11.7, '12 gauge': 3.5 };

G.MASS = Object.assign(MASS, G.MASS || {}); // keep the calibres added by the later data files
const Game = G.Game = { mode: 'menu', state: 'menu', agents: [], bots: [], targets: [], grenades: [], autoReload: true, killfeed: [], time: 0 };

// ======================================================= RANGE TARGETS
function standPosts(g, w, h, mat) {
  for (const s of [-1, 1]) { const p = new THREE.Mesh(gBox(.05, h, .05), mat); p.position.set(s * (w / 2 + .03), h / 2, .03); p.castShadow = true; g.add(p); }
}
function planeHit(ro, rd, z, maxT) { if (Math.abs(rd.z) < 1e-6) return -1; const t = (z - ro.z) / rd.z; return t > 0 && t < maxT ? t : -1; }
function boxHit(ro, rd, min, max, maxT) {
  let t0 = 0, t1 = maxT;
  for (const a of ['x', 'y', 'z']) { const inv = 1 / rd[a]; let tn = (min[a] - ro[a]) * inv, tf = (max[a] - ro[a]) * inv; if (tn > tf) [tn, tf] = [tf, tn]; t0 = Math.max(t0, tn); t1 = Math.min(t1, tf); if (t0 > t1) return -1; }
  return t0;
}
function sphereHit(ro, rd, c, r, maxT) { const oc = ro.clone().sub(c); const b = oc.dot(rd), cc = oc.dot(oc) - r * r, h = b * b - cc; if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 && t < maxT ? t : -1; }
function labelTex(txt, bg = '#e9e4d4', fg = '#1b1b1b') { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 256, 128); x.fillStyle = fg; x.font = 'bold 64px monospace'; x.textAlign = 'center'; x.fillText(txt, 128, 86); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }

const TGT = {};
// bullet hole that belongs to the target (moves with it, cleared on reset)
const HOLE_MAT = {};
function holeMark(parent, x, y, z, r, col = '#0b0907') {
  const m = HOLE_MAT[col] || (HOLE_MAT[col] = new THREE.MeshBasicMaterial({ color: G.col(col), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const h = new THREE.Mesh(new THREE.CircleGeometry(r, 10), m); h.position.set(x, y, z); parent.add(h); return h;
}
function calDia(cal) { const c = G.CAL[cal]; return c ? c.cs[1] * 2 : .009; }
TGT.paper = function (x, z, dist) {
  const s = clamp(dist / 150, 1, 4), w = .55 * s;
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const cy = Math.max(1.45, .95 + w / 2);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, w), G.mat({ map: G.texTarget('paper'), roughness: .95 })); face.position.set(0, cy, 0); g.add(face);
  const board = new THREE.Mesh(gBox(w * 1.15, w * 1.2, .015), G.surf('planks')); board.position.set(0, cy, -.012); board.castShadow = true; g.add(board);
  standPosts(g, w * 1.15, cy + w * .6, G.surf('bark'));
  const holes = new THREE.Group(); g.add(holes);
  const T = { type: 'paper', g, hits: [], w, scale: s, focus: V3(x, cy, z),
    rayTest(ro, rd, maxT) { const t = planeHit(ro, rd, z, maxT); if (t < 0) return -1; const p = ro.clone().addScaledVector(rd, t); return Math.abs(p.x - x) < w * .58 && Math.abs(p.y - cy) < w * .6 ? t : -1; },
    onHit(b, p, dir) {
      const dx = p.x - x, dy = p.y - cy, r = Math.hypot(dx, dy);
      if (Math.abs(dx) > w / 2 || Math.abs(dy) > w / 2) { holeMark(holes, dx, cy + dy, .0, calDia(b.cal) * .6); G.FX.impact(p, V3(0, 0, 1), dir, 'wood', .5, { decal: false }); return { pass: true, v: .9, info: 'Hit the backer board' }; }
      holeMark(holes, dx, cy + dy, .002, calDia(b.cal) * .55);
      const ring = r < w / 2 ? Math.max(0, 10 - Math.floor(r / (w / 2) * 10)) : 0;
      this.hits.push([dx, dy]); if (this.hits.length > 10) this.hits.shift();
      return { pass: true, v: .98, info: ring ? `${ring}-ring · ${(dx * 100).toFixed(1)} cm ${dx >= 0 ? 'right' : 'left'}, ${(Math.abs(dy) * 100).toFixed(1)} cm ${dy >= 0 ? 'high' : 'low'}` : 'Outside the rings', ring };
    },
    group() { const H = this.hits.slice(-5); if (H.length < 2) return 0; let m = 0; for (const a of H) for (const c of H) m = Math.max(m, Math.hypot(a[0] - c[0], a[1] - c[1])); return m; },
    reset() { this.hits = []; holes.clear(); },
  };
  return T;
};
TGT.ipsc = function (x, z, dist, o = {}) {
  const s = clamp(dist / 150, 1, 4), w = .46 * s, h = .76 * s, cy = .9 + h / 2;
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const card = new THREE.Group(); g.add(card);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.113, h * 1.113 * .96), G.mat({ map: G.texTarget('ipsc'), transparent: true, alphaTest: .5, roughness: 1, side: THREE.DoubleSide }));
  face.position.set(0, cy, 0); face.castShadow = true; card.add(face);
  const stick = new THREE.Mesh(gBox(.04, .9, .02), G.surf('planks')); stick.position.set(0, .45, -.01); card.add(stick);
  const holes = new THREE.Group(); card.add(holes);
  const T = { type: 'ipsc', g, card, cx: 0, focus: V3(x, cy, z),
    rayTest(ro, rd, maxT) { const t = planeHit(ro, rd, z, maxT); if (t < 0) return -1; const p = ro.clone().addScaledVector(rd, t); const lx = (p.x - x - this.cx) / w, ly = (p.y - cy) / h;
      const inHead = Math.abs(lx) < .22 && ly > .28 && ly < .5, inBody = Math.abs(lx) < .5 && ly < .28 && ly > -.5; return inHead || inBody ? t : -1; },
    onHit(b, p) { const dx = p.x - x - this.cx, lx = dx / w, ly = (p.y - cy) / h;
      holeMark(holes, dx, p.y, .002, calDia(b.cal) * .55);
      const zone = ly > .28 ? (Math.abs(lx) < .13 && ly < .44 ? 'A (head)' : 'B (head)') : Math.abs(lx) < .11 && ly > -.2 && ly < .22 ? 'A' : Math.abs(lx) < .2 && ly > -.45 ? 'C' : 'D';
      return { pass: true, v: .98, info: `Zone ${zone} · ${{ A: 5, C: 3, D: 1 }[zone[0]] || 4} pts (major)` }; },
    reset() { holes.clear(); } };
  return T;
};
TGT.steel = function (x, z, dist) {
  const r = clamp(.15 * dist / 100, .1, .5);
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const top = 1.6 + r * 2;
  const mat = G.surf('darkmetal');
  for (const s of [-1, 1]) { const p = new THREE.Mesh(gBox(.06, top, .06), mat); p.position.set(s * (r + .3), top / 2, 0); p.castShadow = true; g.add(p); const f = new THREE.Mesh(gBox(.06, .06, .6), mat); f.position.set(s * (r + .3), .03, 0); g.add(f); }
  const bar = new THREE.Mesh(gBox(r * 2 + .7, .06, .06), mat); bar.position.set(0, top, 0); g.add(bar);
  const piv = new THREE.Group(); piv.position.set(0, top, 0); g.add(piv);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(gBox(.01, r * .8, .01), mat); c.position.set(s * r * .5, -r * .4, 0); piv.add(c); }
  const plate = new THREE.Mesh(gCyl(r, r, .012, 40), G.mat({ color: '#e8e3d4', roughness: .6, metalness: .3 }));
  plate.position.set(0, -r * .8 - r, 0); plate.castShadow = true; piv.add(plate);
  const T = { type: 'steel', g, ang: 0, av: 0, focus: V3(x, top - r * 1.8, z),
    rayTest(ro, rd, maxT) { const cy = top - r * 1.8; const t = planeHit(ro, rd, z, maxT); if (t < 0) return -1; const p = ro.clone().addScaledVector(rd, t); return Math.hypot(p.x - x, p.y - cy) < r ? t : -1; },
    onHit(b, p, dir, energy, speed) {
      const m = (MASS[b.cal] || 8) / 1000; const J = .5 * m * speed * speed;
      this.av += Math.min(6, J / 900) * (b.pellet ? .3 : 1);
      G.Audio.ding(p, 0); G.FX.impact(p, V3(0, 0, 1), dir, 'steel', 1.2, { decal: false });
      const local = plate.worldToLocal(p.clone());
      holeMark(plate, local.x, local.y, .0065, .014 + Math.min(.05, J / 80000), '#8f8f8a'); // lead splash on the paint
      const pass = b.pen >= 5;
      if (pass) holeMark(plate, local.x, local.y, .0068, calDia(b.cal) * .6);
      return { pass, v: .6, info: pass ? 'Penetrated the AR500 plate' : `Ding · ${Math.round(J)} J on steel` };
    },
    update(dt) { this.av -= this.ang * 30 * dt; this.av *= Math.pow(.25, dt); this.ang += this.av * dt; piv.rotation.x = -this.ang; },
    reset() { plate.clear(); this.ang = this.av = 0; },
  };
  return T;
};
TGT.popper = function (x, z, dist) {
  const s = clamp(dist / 120, 1, 4);
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const piv = new THREE.Group(); piv.position.set(0, .15, 0); g.add(piv);
  const pts = [[-.1, 0], [.1, 0], [.07, .7], [.15, .78], [.15, .95], [-.15, .95], [-.15, .78], [-.07, .7]].map(p => [p[0] * s, p[1] * s]);
  const shape = new THREE.Shape(); shape.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => shape.lineTo(p[0], p[1]));
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .012, bevelEnabled: false }), G.mat({ color: '#d9d4c4', roughness: .6, metalness: .3 })); m.castShadow = true; piv.add(m);
  const base = new THREE.Mesh(gBox(.4 * s, .15, .3), G.surf('darkmetal')); base.position.y = .075; g.add(base);
  const marks = new THREE.Group(); piv.add(marks);
  const T = { type: 'popper', g, down: 0, t: 0, focus: V3(x, .15 + .6 * s, z),
    rayTest(ro, rd, maxT) { if (this.down > .3) return -1; const t = planeHit(ro, rd, z + .012, maxT); if (t < 0) return -1; const p = ro.clone().addScaledVector(rd, t); const lx = p.x - x, ly = p.y - .15; if (ly < 0 || ly > .95 * s) return -1; const hw = ly > .7 * s ? .15 * s : .1 * s - ly / (.7 * s) * .03 * s; return Math.abs(lx) < hw ? t : -1; },
    onHit(b, p, dir, energy, speed) {
      const J = .5 * (MASS[b.cal] || 8) / 1000 * speed * speed;
      G.Audio.ding(p, 0); G.FX.impact(p, V3(0, 0, 1), dir, 'steel', 1, { decal: false });
      holeMark(marks, p.x - x, p.y - .15, .0135, .012 + Math.min(.03, J / 100000), '#8f8f8a');
      // IPSC calibration: a popper must fall to a major-power hit on the head; lighter hits may not topple it
      if (J > 300 * (b.pellet ? .25 : 1) || (p.y - .15 > .7 * s && J > 180)) { this.fall = true; this.t = 0; return { pass: false, info: `Down · ${Math.round(J)} J` }; }
      return { pass: false, info: `Stayed up · ${Math.round(J)} J (hit higher or use more power)` };
    },
    update(dt) { if (this.fall) { this.down = Math.min(1, this.down + dt * (2 + this.down * 8)); this.t += dt; if (this.t > 2.5) { this.fall = false; } } else if (this.down > 0) { this.down = Math.max(0, this.down - dt * 1.5); if (this.down === 0) marks.clear(); } piv.rotation.x = -this.down * 1.45; },
    reset() { this.fall = false; this.down = 0; marks.clear(); } };
  return T;
};
TGT.mover = function (x, z, dist) {
  const T = TGT.ipsc(0, z, dist); T.type = 'mover'; T.dir = 1; T.speed = 3;
  const rail = new THREE.Mesh(gBox(14, .08, .1), G.surf('darkmetal')); rail.position.set(0, .05, .2); T.g.add(rail);
  const cart = new THREE.Mesh(gBox(.5, .2, .3), G.surf('darkmetal')); cart.position.set(0, .15, .05); T.card.add(cart);
  T.baseHit = T.onHit;
  T.onHit = function (b, p) { const r = this.baseHit(b, p); r.info += ` · moving ${this.speed} m/s`; return r; };
  T.update = function (dt) { this.cx += this.dir * this.speed * dt; if (Math.abs(this.cx) > 6) { this.cx = Math.sign(this.cx) * 6; this.dir *= -1; } this.card.position.x = this.cx; this.focus.x = this.cx; };
  return T;
};
// clay pigeons: a trap house throws a clay every few seconds (made for shotguns)
TGT.clay = function (x, z, dist) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const house = new THREE.Mesh(gBox(1.4, .8, 1.2), G.surf('planks')); house.position.set(0, .4, 0); house.castShadow = true; g.add(house);
  const arm = new THREE.Mesh(gBox(.6, .05, .08), G.surf('darkmetal')); arm.position.set(0, .82, 0); g.add(arm);
  const cm = G.mat({ color: '#e46a1e', roughness: .7 });
  const clay = new THREE.Mesh(gCylY(.055, .045, .025, 16), cm); clay.visible = false; g.add(clay);
  const T = { type: 'clay', g, t: 1, v: V3(), p: V3(), live: false, focus: V3(x, 2.5, z - 4),
    throwClay() { this.p.set(x, .9, z); const side = (Math.random() - .5) * 8; this.v.set(side, 9 + Math.random() * 2, -10 - Math.random() * 6); this.live = true; clay.visible = true; G.Audio.mech('bipod', this.p); },
    rayTest(ro, rd, maxT) { if (!this.live) return -1; return sphereHit(ro, rd, this.p, .07, maxT); },
    onHit(b) { this.live = false; clay.visible = false; const p = this.p;
      for (let i = 0; i < 28; i++) G.FX.debris.spawn({ x: p.x, y: p.y, z: p.z, vx: this.v.x * .3 + (Math.random() - .5) * 6, vy: this.v.y * .2 + Math.random() * 3, vz: this.v.z * .3 + (Math.random() - .5) * 6, life: 1.6, s0: .04, s1: .03, r: .9, g: .42, b: .12, grav: 9.8, drag: .7, bounce: .2, floor: 0 });
      for (let i = 0; i < 8; i++) G.FX.dust.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2, vz: (Math.random() - .5) * 2, life: 1, s0: .1, s1: .6, r: .8, g: .5, b: .3, a: .5, drag: .3 });
      G.Audio.impact(p, 'glass', true); this.t = 0; return { pass: false, info: `Clay broken at ${Math.round(p.distanceTo(G.E.camera.position))} m` }; },
    update(dt) { this.t += dt; if (!this.live && this.t > 3) { this.t = 0; this.throwClay(); }
      if (this.live) { this.v.y -= 9.81 * dt; this.v.multiplyScalar(Math.pow(.85, dt)); this.p.addScaledVector(this.v, dt); clay.position.copy(this.p).sub(g.position); clay.rotation.x += dt * 20; this.focus.copy(this.p); if (this.p.y < 0) { this.live = false; clay.visible = false; this.t = 0; } } },
    reset() { this.live = false; clay.visible = false; this.t = 1; } };
  return T;
};
function gelDepth(b, speed) {
  const cal = G.CAL[b.cal] || { pen: 2 }; const base = { 1: .52, 2: .42, 3: .68, 4: .9, 5: 1.6 }[b.pen] || .5;
  let d = base * Math.pow(speed / b.v0, .8);
  if (b.pellet) d = .3; if (b.hp) d *= .6;
  if (b.weapon && b.weapon.c === 'SG' && !b.pellet) d = .48;
  return d * (.9 + Math.random() * .2);
}
TGT.gel = function (x, z, dist) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const table = new THREE.Mesh(gBox(.6, .9, .6), G.surf('planks')); table.position.y = .45; table.castShadow = true; g.add(table);
  const W = .15, H = .15, D = .4;
  const mat = new THREE.MeshStandardMaterial({ color: G.col('#e7a24a'), transparent: true, opacity: .55, roughness: .15, metalness: 0, depthWrite: false });
  const blk = new THREE.Mesh(gBox(W, H, D), mat); blk.position.set(0, .9 + H / 2, 0); g.add(blk);
  const tracks = new THREE.Group(); g.add(tracks);
  const T = { type: 'gel', g, jig: 0, cav: [],
    rayTest(ro, rd, maxT) { return boxHit(ro, rd, V3(x - W / 2, .9, z - D / 2), V3(x + W / 2, .9 + H, z + D / 2), maxT); },
    onHit(b, p, dir, energy, speed) {
      const depth = gelDepth(b, speed), inside = Math.min(depth, D);
      const a = g.worldToLocal(p.clone()), e = a.clone().addScaledVector(dir, inside);
      const trk = new THREE.Mesh(gCylY(.0025, .002, 1, 6), G.mat({ color: '#5a1a10', roughness: .6 }));
      trk.position.copy(a).lerp(e, .5); trk.scale.y = inside; trk.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize()); tracks.add(trk);
      // temporary stretch cavity
      const cavR = Math.min(.07, .012 + (b.dmg / 100) * .05 * Math.pow(speed / b.v0, 2));
      const cav = new THREE.Mesh(gSph(1, 12), new THREE.MeshBasicMaterial({ color: G.col('#ffd9a0'), transparent: true, opacity: .45, depthWrite: false }));
      cav.position.copy(a).addScaledVector(dir, inside * .35); cav.scale.set(cavR, cavR, inside * .4); cav.quaternion.setFromUnitVectors(V3(0, 0, 1), dir.clone().normalize()); g.add(cav); this.cav.push({ m: cav, t: 0 });
      if (depth < D) { const slug = new THREE.Mesh(gSph(.004, 8), G.mat({ color: '#b98e3c', metalness: 1, roughness: .3 })); slug.position.copy(e); tracks.add(slug); }
      this.jig = 1;
      G.FX.impact(p, V3(0, 0, 1), dir, 'gel', .6, { decal: false });
      const cm = (depth * 100).toFixed(1);
      return depth > D ? { pass: true, v: .35, depth: D + .01, info: `Over-penetrated (>${(D * 100).toFixed(0)} cm) · est. ${cm} cm` } : { pass: false, info: `Penetration ${cm} cm · cavity ${(cavR * 200).toFixed(1)} cm`, gel: depth };
    },
    update(dt) { this.jig = Math.max(0, this.jig - dt * 3); const s = 1 + Math.sin(performance.now() * .05) * .06 * this.jig; blk.scale.set(s, 2 - s, s); for (let i = this.cav.length - 1; i >= 0; i--) { const c = this.cav[i]; c.t += dt; c.m.material.opacity = .45 * Math.max(0, 1 - c.t / .25); if (c.t > .3) { g.remove(c.m); this.cav.splice(i, 1); } } },
    reset() { tracks.clear(); },
  };
  return T;
};
TGT.geldummy = function (x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const gel = new THREE.MeshStandardMaterial({ color: G.col('#f0b26a'), transparent: true, opacity: .4, roughness: .12, depthWrite: false });
  const bone = G.mat({ color: '#efe6d2', roughness: .7 });
  const post = new THREE.Mesh(gCylY(.03, .03, 1.1, 8), G.surf('darkmetal')); post.position.y = .55; g.add(post);
  const torso = new THREE.Mesh(gRBox(.36, .55, .22, .08), gel); torso.position.y = 1.35; g.add(torso);
  const head = new THREE.Mesh(gSph(.1, 16), gel); head.position.y = 1.77; g.add(head);
  const neck = new THREE.Mesh(gCylY(.05, .05, .1, 10), gel); neck.position.y = 1.66; g.add(neck);
  // skeleton
  const skull = new THREE.Mesh(gSph(.075, 12), bone); skull.position.y = 1.78; g.add(skull);
  const spine = new THREE.Mesh(gCylY(.018, .018, .6, 8), bone); spine.position.set(0, 1.4, .06); g.add(spine);
  for (let i = 0; i < 6; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(.13 - Math.abs(i - 2) * .008, .006, 5, 18, PI * 1.6), bone); rib.rotation.set(PI / 2, 0, PI / 2 + .6); rib.position.set(0, 1.52 - i * .045, .0); g.add(rib); }
  const sternum = new THREE.Mesh(gBox(.02, .18, .01), bone); sternum.position.set(0, 1.45, -.1); g.add(sternum);
  const heart = new THREE.Mesh(gSph(.04, 10), G.mat({ color: '#9a2a22', roughness: .6 })); heart.position.set(.03, 1.44, -.02); g.add(heart);
  const tracks = new THREE.Group(); g.add(tracks);
  return { type: 'geldummy', g,
    rayTest(ro, rd, maxT) { const t1 = sphereHit(ro, rd, V3(x, 1.77, z), .1, maxT); const t2 = boxHit(ro, rd, V3(x - .18, 1.07, z - .11), V3(x + .18, 1.63, z + .11), maxT); return t1 >= 0 && (t2 < 0 || t1 < t2) ? t1 : t2; },
    onHit(b, p, dir, energy, speed) {
      const lp = g.worldToLocal(p.clone()); const head = lp.y > 1.66;
      const depth = gelDepth(b, speed), thick = head ? .2 : .22, inside = Math.min(depth, thick + .05);
      const e = lp.clone().addScaledVector(dir, inside);
      const trk = new THREE.Mesh(gCylY(.004, .003, 1, 6), G.mat({ color: '#7a1a10', roughness: .6 })); trk.position.copy(lp).lerp(e, .5); trk.scale.y = inside; trk.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize()); tracks.add(trk);
      const heartHit = V3(.03, 1.44, -.02).distanceTo(lp.clone().addScaledVector(dir, Math.min(inside, .12))) < .06;
      const zone = head ? 'Head — skull' : heartHit ? 'Chest — heart' : lp.y > 1.3 ? 'Upper chest — lungs' : 'Abdomen';
      G.FX.impact(p, V3(0, 0, 1), dir, 'gel', .6, { decal: false });
      return depth > thick ? { pass: true, v: .5, depth: thick + .05, info: `${zone} · through-and-through` } : { pass: false, info: `${zone} · ${(depth * 100).toFixed(0)} cm track` };
    },
    reset() { tracks.clear(); } };
};
TGT.armor = function (x, z, dist) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const plates = [];
  const levels = [['IIIA', 1, 'Soft armour'], ['III', 3, 'Steel/ceramic'], ['IV', 4, 'Ceramic (AP rated)']];
  levels.forEach(([lvl, rating], i) => {
    const px = (i - 1) * .45;
    const pm = new THREE.Mesh(gRBox(.25, .32, .025, .04), G.mat({ color: i === 0 ? '#3b3f35' : i === 1 ? '#555a50' : '#6a6558', roughness: .7 })); pm.position.set(px, 1.4, 0); pm.castShadow = true; g.add(pm);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(.25, .12), new THREE.MeshBasicMaterial({ map: labelTex('NIJ ' + lvl) })); lab.position.set(px, 1.12, .01); g.add(lab);
    const st = new THREE.Mesh(gBox(.04, 1.25, .04), G.surf('darkmetal')); st.position.set(px, .62, -.03); g.add(st);
    plates.push({ lvl, rating, x: x + px, mesh: pm });
  });
  const marks = new THREE.Group(); g.add(marks);
  return { type: 'armor', g,
    rayTest(ro, rd, maxT) { const t = planeHit(ro, rd, z + .013, maxT); if (t < 0) return -1; const p = ro.clone().addScaledVector(rd, t); for (const P of plates) if (Math.abs(p.x - P.x) < .125 && Math.abs(p.y - 1.4) < .16) return t; return -1; },
    onHit(b, p, dir, energy, speed) {
      const P = plates.find(q => Math.abs(p.x - q.x) < .13);
      const ap = b.pen > G.CAL[b.cal].pen;
      let stop;
      if (P.lvl === 'IIIA') stop = b.pen <= 1 || b.pellet;
      else if (P.lvl === 'III') stop = b.pen <= 2 || (b.pen === 3 && !ap) || b.pellet;
      else stop = b.pen <= 4 || b.pellet;
      if (speed < b.v0 * .45 && b.pen <= 4) stop = true;
      const lp = g.worldToLocal(p.clone());
      const m = new THREE.Mesh(new THREE.CircleGeometry(stop ? .016 : .008, 10), G.mat({ color: stop ? '#c9c2b0' : '#050505', roughness: .9 })); m.position.set(lp.x, lp.y, .03); marks.add(m);
      G.FX.impact(p, V3(0, 0, 1), dir, 'metal', .8, { decal: false });
      G.Audio.impact(p, 'metal', true);
      return stop ? { pass: false, info: `NIJ ${P.lvl}: STOPPED` } : { pass: true, v: .55, info: `NIJ ${P.lvl}: DEFEATED` };
    },
    reset() { marks.clear(); } };
};
TGT.bottles = function (x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const table = new THREE.Mesh(gBox(1.6, .9, .5), G.surf('planks')); table.position.y = .45; table.castShadow = true; g.add(table);
  const items = [];
  const cols = ['#2f5a2a', '#6a3a14', '#2f5a2a', '#a7c7c9', '#6a3a14'];
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(gCylY(.035, .038, .24, 12), G.mat({ color: cols[i], roughness: .05, metalness: .2, transparent: true, opacity: .8 })); m.position.set(-.7 + i * .2, 1.02, 0); g.add(m); const n = new THREE.Mesh(gCylY(.012, .03, .08, 10), m.material); n.position.y = .15; m.add(n); items.push({ m, kind: 'glass', c: V3(x - .7 + i * .2, 1.04, z), r: .045 }); }
  for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(gSph(.12, 16), G.mat({ color: '#2f5a24', roughness: .5 })); m.scale.set(1, .85, 1.25); m.position.set(.35 + i * .3, 1.0, 0); m.castShadow = true; g.add(m); items.push({ m, kind: 'melon', c: V3(x + .35 + i * .3, 1.0, z), r: .12 }); }
  return { type: 'bottles', g, items, focus: V3(x, 1.04, z),
    rayTest(ro, rd, maxT) { let best = -1; for (const it of items) { if (!it.m.visible) continue; const t = sphereHit(ro, rd, it.c, it.r, maxT); if (t >= 0 && (best < 0 || t < best)) { best = t; this._hit = it; } } return best; },
    onHit(b, p, dir) {
      const it = this._hit; it.m.visible = false;
      const glass = it.kind === 'glass';
      for (let i = 0; i < (glass ? 30 : 40); i++) G.FX.debris.spawn({ x: it.c.x, y: it.c.y, z: it.c.z, vx: dir.x * 3 + (Math.random() - .5) * 4, vy: Math.random() * 4, vz: dir.z * 3 + (Math.random() - .5) * 4, life: 1.2, s0: glass ? .025 : .05, s1: .02, r: glass ? .6 : .9, g: glass ? .8 : .25, b: glass ? .7 : .3, grav: 9.8, drag: .6, bounce: .3, floor: .9 });
      G.Audio.impact(p, glass ? 'glass' : 'flesh', true);
      setTimeout(() => { it.m.visible = true; }, 5000);
      return { pass: true, v: .85, info: glass ? 'Bottle shattered' : 'Melon burst' };
    },
    reset() { for (const it of items) it.m.visible = true; } };
};
TGT.dummy = function (x, z, dist, o) {
  const era = o.era || 'ww2', tier = o.tier || 'regular';
  const S = G.buildSoldier({ era, team: 1, tier, weapon: G.eraWeapons(era, ['RIF', 'AR'])[0], loadout: null });
  S.root.position.set(x, 0, z); S.root.rotation.y = 0;
  const band = new THREE.Mesh(G.geo.gCylY(.052, .052, .05, 10), G.mat({ color: G.TIER[tier].color, roughness: .7 })); S.arms[0].upper.add(band); band.position.y = .1;
  G.animateSoldier(S, { dt: 1, speed: 0, aimPitch: 0 });
  const T = { type: 'dummy', g: S.root, S, hp: G.TIER[tier].hp, tier: G.TIER[tier], era,
    rayTest(ro, rd, maxT) { if (S.dead > 0) return -1; let best = -1; for (const hb of G.soldierHitboxes(S)) { const t = G.rayCapsule(ro, rd, hb.a, hb.b, hb.r); if (t >= 0 && t < maxT && (best < 0 || t < best)) { best = t; this._zone = hb.zone; } } return best; },
    onHit(b, p, dir, energy) {
      let d = b.dmg * energy * (G.ZONE_MUL[this._zone] || 1);
      let armor = '';
      if ((this._zone === 'chest' || this._zone === 'stomach') && this.tier.armor < 1 && G.ERA[era].ord >= 3) { const m = b.pen >= 4 ? .95 : b.pen >= 3 ? this.tier.armor + .15 : this.tier.armor; d *= m; armor = ' (armour)'; }
      this.hp -= d; G.FX.impact(p, dir.clone().negate(), dir, 'flesh', 1);
      S.flinch = Math.min(1.2, S.flinch + .8); S.flinchDir = Math.sign(Math.random() - .5);
      const dead = this.hp <= 0;
      if (dead) { S.dead = .0001; S.deathKind = null; S.headshot = this._zone === 'head'; S.deathDir.set(0, 0, -1); this.t = 0; }
      return { pass: false, info: `${this._zone.toUpperCase()} · ${Math.round(d)} dmg${armor}${dead ? ' · LETHAL' : ` · ${Math.max(0, Math.round(this.hp))} HP left`}` };
    },
    update(dt) { if (S.dead > 0) { G.animateSoldier(S, { dt, dead: true }); this.t += dt; if (this.t > 3) this.reset(); } else G.animateSoldier(S, { dt, speed: 0, aimPitch: 0 }); },
    reset() { this.hp = this.tier.hp; G.resetSoldier(S); S.root.rotation.set(0, 0, 0); G.animateSoldier(S, { dt: 1, speed: 0 }); },
  };
  return T;
};

// ======================================================= GAME FLOW
Game.clearTargets = function () { for (const T of Game.targets) G.E.world.group.remove(T.g); Game.targets = []; };
Game.addTarget = function (type, dist, o = {}) {
  const n = Game.targets.length;
  const lanes = [0, -3, 3, -6, 6, -9, 9, -12, 12];
  let x = lanes[n % lanes.length] * (dist > 200 ? 1 + dist / 400 : 1);
  if (type === 'vehicle' || type === 'barrier') { const big = Game.targets.filter(t => t.type === 'vehicle' || t.type === 'barrier').length; x = [0, -10, 10, -20, 20, -30, 30][big % 7]; }
  const T = TGT[type](x, -dist, dist, o);
  T.dist = dist; T.x = x;
  if (!T.focus) T.focus = V3(x, T.type === 'gel' || T.type === 'bottles' ? 1 : 1.35, -dist);
  G.E.world.group.add(T.g);
  Game.targets.push(T);
  if (Game.targets.length > 9) { const old = Game.targets.shift(); G.E.world.group.remove(old.g); }
  return T;
};

Game.startRange = function (sel) {
  Game.mode = 'range'; Game.state = 'play';
  Game.cleanup();
  G.E.loadMap(G.RANGE_MAP);
  const P = Game.player = new G.Player();
  P.pos.set(0, 0, 2); P.yaw = 0; P.god = true;
  P.setupWeapons(sel);
  for (const w of P.weapons) w.reserve = 9999;
  Game.agents = [P]; Game.bots = [];
  Game.stats = { shots: 0, hits: 0, last: null };
  G.Ballistics.wind.set(G.rangeWind || 0, 0, 0);
  if (!Game.targets.length) { Game.addTarget('paper', 25); Game.addTarget('steel', 100); Game.addTarget('gel', 15); Game.addTarget('dummy', 50, { era: sel[0].wp.e, tier: 'regular' }); }
  else { const keep = Game.targets.map(t => [t.type, t.dist, { era: t.era, tier: t.tier && t.tier.id }]); Game.targets = []; for (const k of keep) Game.addTarget(...k); }
  G.UI.showHUD('range');
};
// ======================================================= SOLO MISSIONS
// cfg: { mission, tod, tier, primary, secondary }
Game.startMission = function (cfg) {
  Game.mode = 'mission'; Game.state = 'play';
  Game.cleanup(true);
  const M = G.MISSION[cfg.mission], tod = G.TOD[cfg.tod] || G.TOD.day;
  const map = { id: 'm_' + M.id, era: 'mod', name: M.name, env: tod.env, ground: M.ground, weather: (M.weather || {})[cfg.tod] || null, amb: M.amb, reverb: M.reverb, build: W => { M.build(W); M._extra = M.out ? G.MissionHelpers.outskirts(W, M, M.out) : []; } };
  G.E.loadMap(map);
  const P = Game.player = new G.Player();
  P.setupWeapons([cfg.primary, cfg.secondary].filter(Boolean));
  P.pos.set(...M.player.pos); P.yaw = M.player.yaw; P.pitch = 0; P.hp = 100; P.alive = true; P.armorState = G.newArmorState();
  Game.bots = [];
  const R = G.rng(cfg.mission.length * 97 + (cfg.seed || Date.now() % 1000));
  const posts = M.guards.concat(M._extra || []);
  const roles = G.dealRoles({ guards: posts, player: M.player }, R), pick = l => l[Math.floor(R() * l.length)];
  posts.forEach((g, i) => {
    const role = roles[i];
    let ti = cfg.tier === 'mixed' ? Math.min(3, Math.floor(R() * 4)) : Math.max(0, G.TIERS.findIndex(t => t.id === cfg.tier));
    if (role.tierUp) ti = Math.min(3, ti + 1);
    const wl = role.weapons.filter(id => G.WEAPON[id]), wp = G.WEAPON[pick(wl.length ? wl : G.TERROR_WEAPONS)] || G.WEAPON.akm;
    let kit = pick(role.kits);
    if (role.id === 'leader' && cfg.tod === 'night') kit = Object.assign({}, kit, { nvg: kit.helmet === 'h_fast' ? 'n_pvs31' : 'n_1pn138' });
    const L = G.botLoadout(wp, role.id, ti, cfg.tod === 'night', R);
    const b = new G.Bot(Game, 1, G.TIERS[ti].id, 'mod', i, { wp, L, kit, look: 'mod', name: G.TERROR_NAMES[i % G.TERROR_NAMES.length] });
    b.role = role; b.kit = kit; b.armorState = G.newArmorState();
    b.guard = { pos: V3(g[0], g[1], g[2]), yaw: g[3], crouch: !!g[4] || !!role.crouch, leash: role.rush || 0 };
    b.spawn(V3(g[0], g[1] + .05, g[2])); b.yaw = g[3]; b.spawnProt = 0;
    Game.bots.push(b);
  });
  Game.agents = [P, ...Game.bots];
  // hostages: civilians kneeling with their hands behind their heads — hitting one fails the mission
  const civ = ['u_civ_suit', 'u_civ_crew', 'u_civ_jeans', 'u_civ_hoodie'];
  M.hostages.forEach((h, i) => {
    const kit = Object.assign({}, G.KIT_DEFAULT, { uniform: M.id === 'ship' ? 'u_civ_crew' : civ[i % civ.length], helmet: 'h_none', face: 'f_none', nvg: 'n_none', armor: 'a_none', plates: 'p_none', gloves: 'g_none', boots: 'b_combat', pack: 'k_none' });
    const S = G.buildSoldier({ era: 'mod', team: 0, tier: 'regular', weapon: null, kit });
    S.root.position.set(h[0], h[1], h[2]); S.root.rotation.y = h[3]; G.animateSoldier(S, { dt: 1, speed: 0 }); G.poseHostage(S);
    const T = { type: 'hostage_m', g: S.root, S, focus: V3(h[0], h[1] + .9, h[2]), alive: true,
      rayTest(ro, rd, maxT) { if (!this.alive) return -1; let best = -1; for (const hb of G.soldierHitboxes(S)) { const t = G.rayCapsule(ro, rd, hb.a, hb.b, hb.r); if (t >= 0 && t < maxT && (best < 0 || t < best)) best = t; } return best; },
      onHit(b, p, dir) { if (!this.alive) return { pass: false }; this.alive = false; G.FX.impact(p, dir.clone().negate(), dir, 'flesh', 1); S.dead = .0001; S.deathKind = 'limp'; S.deathDir.set(0, 0, 1);
        Game.mission.hostagesLost++; if (b.owner === Game.player || !b.owner) Game.endMission(false, 'You hit a hostage.'); else Game.endMission(false, 'A hostage was killed.'); return { pass: false }; },
      update(dt) { if (S.dead > 0) G.animateSoldier(S, { dt, dead: true }); },
    };
    G.E.world.group.add(S.root); Game.targets.push(T);
  });
  Game.mission = { cfg, M, total: Game.bots.length, killed: 0, heads: 0, t: 0, dmgTaken: 0, hostages: M.hostages.length, hostagesLost: 0, done: false,
    roles: roles.reduce((o, r) => (o[r.n] = (o[r.n] || 0) + 1, o), {}) };
  Game.stats = { shots: 0, hits: 0 };
  Game.cfg = cfg; Game.map = map; Game.killfeed = [];
  // pre-compile shaders and upload textures now, so the first firefight doesn't hitch
  try { const R = G.E.renderer; R.compile(G.E.scene, G.E.camera); if (R.initTexture) G.E.scene.traverse(o => { const m = o.material; if (m && m.map) R.initTexture(m.map); }); } catch (e) {}
  G.UI.showHUD('mission');
  const PL = { Rifleman: 'riflemen', Marksman: 'marksmen' }, mix = Object.entries(Game.mission.roles).map(([n, c]) => `${c} ${c > 1 ? (PL[n] || n.toLowerCase() + 's') : n.toLowerCase()}`).join(', ');
  Game.toast(`${M.name} · ${tod.n} — ${mix}; ${M.hostages.length} hostages. Clear the structure.`, 6);
};
Game.endMission = function (ok, reason) {
  const Ms = Game.mission; if (!Ms || Ms.done) return; Ms.done = true; Ms.ok = ok; Ms.reason = reason;
  Game.state = 'end'; setTimeout(() => G.UI.showMissionResults(), ok ? 1500 : 1100);
};
Game.spawnPoint = function (team) {
  const W = G.E.world; const list = W.spawns[team];
  let best = list[0], bd = -1;
  for (const s of list) { let d = 1e9; for (const a of Game.agents) if (a.alive && a.team !== team) d = Math.min(d, a.pos.distanceTo(s)); if (d > bd) { bd = d; best = s; } }
  const p = best.clone(); p.x += (Math.random() - .5) * 3; p.z += (Math.random() - .5) * 3; return p;
};
Game.cleanup = function (clearTargets) {
  if (Game.player) { G.E.vmScene.remove(Game.player.vm.pivot); for (const a of Game.player.vm.arms) { G.E.vmScene.remove(a.upper); G.E.vmScene.remove(a.fore); G.E.vmScene.remove(a.hand); G.E.vmScene.remove(a.cuff); } }
  for (const b of Game.bots) b.remove();
  Game.bots = []; Game.agents = []; G.Ballistics.list = []; Game.grenades = []; for (const f of Game.frags || []) G.E.scene.remove(f.m); Game.frags = [];
  Game.killfeed = []; G.E.vmLight.intensity = 0;
  for (const p of Game.pickups || []) if (p.own && p.obj.parent) p.obj.parent.remove(p.obj);
  Game.pickups = []; Game.nearPick = null;
  if (clearTargets) Game.targets = [];
};
// ======================================================= WEAPON PICKUPS
// p: { wp, L, mag, reserve, obj (Object3D lying in the world), own (we built the mesh), vel (while tumbling) }
Game.pickups = [];
Game.addPickup = function (p) { Game.pickups.push(p); return p; };
// throw a weapon from the player's hands onto the ground
Game.tossWeapon = function (w, P) {
  const rig = G.buildGun(w.wp, w.L, { lod: 1 }), obj = G.mergeByMaterial(rig.root);
  const fwd = new THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
  obj.position.set(P.pos.x + fwd.x * .5, P.pos.y + 1.2, P.pos.z + fwd.z * .5); obj.rotation.set(0, P.yaw, 0);
  obj.traverse(o => { if (o.isMesh) o.castShadow = true; });
  G.E.world.group.add(obj);
  return Game.addPickup({ wp: w.wp, L: w.L, mag: w.mag, reserve: w.reserve, obj, own: true, vel: fwd.multiplyScalar(2.2).setY(1.6), spin: (Math.random() - .5) * 8 });
};
Game.updatePickups = function (dt, P, input) {
  const W = G.E.world, tp = new THREE.Vector3();
  for (const p of Game.pickups) if (p.vel) { // tumble and settle flat
    p.vel.y -= 9.81 * dt; p.obj.position.addScaledVector(p.vel, dt); p.obj.rotation.x += p.spin * dt;
    const gy = W.groundAt(p.obj.position.x, p.obj.position.z, p.obj.position.y + .3, .05);
    if (p.obj.position.y <= gy + .04) { p.obj.position.y = gy + .04; p.obj.rotation.set(0, p.obj.rotation.y, Math.random() < .5 ? Math.PI / 2 : -Math.PI / 2); p.vel = null; }
  }
  Game.nearPick = null;
  if (!P || !P.alive) return;
  const eye = P.eye || P.pos, look = new THREE.Vector3(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch));
  let best = null, bs = -1e9;
  for (const p of Game.pickups) {
    if (!p.obj.parent || p.vel) continue;
    p.obj.getWorldPosition(tp);
    const dh = Math.hypot(tp.x - P.pos.x, tp.z - P.pos.z), dy = tp.y - P.pos.y; if (dh > 2 || dy < -.8 || dy > 1.4) continue;
    const to = tp.clone().sub(eye).normalize(), sc = to.dot(look) * 2 - dh;
    if (sc > bs) { bs = sc; best = p; }
  }
  Game.nearPick = best;
  if (best && input.inspect) { input.inspect = false; Game.pickUp(best, P); }
  if (input.drop) { const w = P.dropCurrent(); if (w) { Game.tossWeapon(w, P); Game.toast('Dropped ' + w.wp.n, 1.2); } else Game.toast("Can't drop your last weapon", 1.2); }
};
Game.pickUp = function (p, P) {
  if (p.obj.parent) p.obj.parent.remove(p.obj);
  Game.pickups = Game.pickups.filter(q => q !== p);
  const old = P.takeWeapon(p.wp, p.L, p.mag, p.reserve);
  if (old) { const q = Game.tossWeapon(old, P); q.vel.multiplyScalar(.4); }
  Game.toast(`Picked up ${p.wp.n} · ${p.mag} + ${p.reserve}`, 1.6); P.hudDirty = true;
};
Game.onKill = function (killer, victim, weapon, head) {
  if (Game.mode === 'mission') {
    const Ms = Game.mission;
    Game.killfeed.unshift({ k: killer ? killer.name : '—', kt: killer ? killer.team : -1, v: victim.name, vt: victim.team, w: weapon ? weapon.n : '', head, t: 5 }); if (Game.killfeed.length > 6) Game.killfeed.pop();
    if (victim === Game.player) {
      Game.endMission(false, `Killed by ${killer ? killer.name : 'enemy fire'}.`); return; }
    Ms.killed++; if (head) Ms.heads++;
    const rn = victim.role ? victim.role.n : 'Hostile';
    if (killer === Game.player) { G.UI.hitmarker(true, head); G.Audio.hit(head, true); Game.toast(`${head ? 'Headshot' : rn + ' down'} · ${Ms.total - Ms.killed} left`, 1.4); }
    G.UI.dirty = true;
    if (Ms.killed >= Ms.total) Game.endMission(true, 'Structure clear. All hostiles neutralised.');
    return;
  }
};
Game.onPlayerHurt = function (d, dir, b) { G.UI.damage(d, dir); Game.player.shake = Math.min(1, Game.player.shake + .3); if (Game.mission) Game.mission.dmgTaken += d; };
Game.onPlayerShot = function (w) {
  if (Game.stats) Game.stats.shots++;
  if (Game.player) Game.player.lastShotT = Game.now;
  if (Game.mode === 'mission' && w) { const r = w.S.sup ? 14 : 45, P = Game.player; for (const b of Game.bots) if (b.alive && b.alert === 'calm' && b.pos.distanceTo(P.pos) < r) { b.alert = 'search'; b.alertT = 30; b.sus = Math.max(b.sus, .45); b.suspect = P.pos.clone(); } }
  if (Game.mode === 'mission' && w) { const r = w.S.sup ? 14 : 45, P = Game.player; for (const b of Game.bots) if (b.alive && b.pos.distanceTo(P.pos) < r) b.lastHeard = P.pos.clone(); }
};
Game.toast = function (msg, t = 1.6) { G.UI.toast(msg, t); };
Game.melee = function (P, eye, d, reach, dmg) {
  for (const b of Game.bots) {
    if (!b.alive || b.team === P.team) continue;
    const to = b.pos.clone().setY(b.pos.y + 1.1).sub(eye); const dist = to.length();
    if (dist < reach && to.normalize().dot(d) > .6) { b.damage({ dmg, pen: 1, owner: P, weapon: { n: 'Melee' } }, 'chest', 1, d, b.pos); G.UI.hitmarker(!b.alive, false); G.Audio.impact(b.pos, 'flesh', true); return; }
  }
  for (const T of Game.targets) { const t = T.rayTest(eye, d, reach); if (t >= 0) { T.onHit({ dmg, pen: 1, v0: 1, cal: '9×19mm' }, eye.clone().addScaledVector(d, t), d, 1, 1); return; } }
  const h = G.E.world.raycast(eye, d, reach); if (h) { G.FX.impact(h.p, h.n, d, h.mat, .5); G.Audio.impact(h.p, h.mat); }
};
// hand grenades: bounce and roll, 3.2 s fuse, the player gets a warning when one lands close
Game.frags = [];
Game.throwFrag = function (p, v, owner) {
  const m = new THREE.Mesh(gSph(.045, 10), G.mat({ color: '#3e4630', roughness: .7, metalness: .2 })); m.position.copy(p); m.castShadow = true; G.E.scene.add(m);
  Game.frags.push({ m, v: v.clone(), owner, t: 0, warned: false }); if (G.Audio.mech) G.Audio.mech('ping', p);
};
Game.updateFrags = function (dt) {
  const W = G.E.world, P = Game.player;
  for (let i = Game.frags.length - 1; i >= 0; i--) {
    const f = Game.frags[i]; f.t += dt; const a = f.m.position.clone();
    f.v.y -= 9.81 * dt; const step = f.v.clone().multiplyScalar(dt), L = step.length();
    if (L > 1e-5) { const h = W.raycast(a, step.clone().normalize(), L + .05);
      if (h) { const n = h.n; const vn = n.clone().multiplyScalar(f.v.dot(n)); f.v.sub(vn.multiplyScalar(1.45)).multiplyScalar(.55); f.m.position.copy(h.p).addScaledVector(n, .05); }
      else f.m.position.add(step); }
    const gy = W.groundAt(f.m.position.x, f.m.position.z, f.m.position.y + .3, .05);
    if (f.m.position.y < gy + .045) { f.m.position.y = gy + .045; if (f.v.y < 0) f.v.y = -f.v.y * .3; f.v.x *= Math.pow(.05, dt); f.v.z *= Math.pow(.05, dt); }
    f.m.rotation.x += f.v.z * dt * 8; f.m.rotation.z -= f.v.x * dt * 8;
    if (P && P.alive && !f.warned && f.t > .5 && f.m.position.distanceTo(P.pos) < 9) { f.warned = true; Game.toast('⚠ GRENADE!', 1.6); }
    if (f.t > 3.2) { G.E.scene.remove(f.m); Game.frags.splice(i, 1); Game.explode(f.m.position.clone().setY(f.m.position.y + .1), f.owner, { r: 8, dmg: 150, name: 'Frag grenade' }); }
  }
};
Game.launchGrenade = function (p, v, owner) {
  const m = new THREE.Mesh(gCyl(.02, .02, .1, 10), G.mat({ color: '#5a5a3a', metalness: .5, roughness: .5 }));
  m.position.copy(p); G.E.scene.add(m);
  Game.grenades.push({ m, v, owner, t: 0 });
};
function explode(p, owner) { Game.explode(p, owner, { r: 9, dmg: 180, name: '40 mm HE' }); }
// blast with radius r (m) and peak damage dmg; teammates of the shooter are spared, the shooter is not
Game.explode = function (p, owner, o = {}) {
  const R = o.r || 9, D = o.dmg || 180;
  G.FX.explosion(p, Math.max(1.2, R * .45)); G.Audio.explosion(p);
  const P = Game.player; if (P) { const dP = P.pos.distanceTo(p); if (dP < R * 3) P.shake = Math.min(1, P.shake + (1 - dP / (R * 3)) * Math.min(1, R / 5)); }
  const team = owner ? owner.team : -1;
  for (const a of Game.agents) {
    if (!a.alive || (a.team === team && a !== owner)) continue; const d = a.pos.distanceTo(p); if (d > R) continue;
    if (!G.E.world.los(p.clone().setY(p.y + .5), a.eye)) continue;
    if (a === P && P.god) continue;
    a.damage({ dmg: D * Math.pow(1 - d / R, 1.5), pen: 1, owner, weapon: { n: o.name || 'HE' }, team }, 'chest', 1, a.pos.clone().sub(p).normalize(), a.pos);
  }
  for (const T of Game.targets) if ((T.type === 'dummy' || T.type === 'walker' || T.type === 'kitdummy' || T.type === 'hostage_m') && T.S && !(T.S.dead > 0)) { const q = T.g.position, d = Math.hypot(q.x - p.x, q.z - p.z); if (d < R) { T._zone = 'chest'; T.onHit({ dmg: D * Math.pow(1 - d / R, 1.5), pen: 1 }, q.clone().setY(q.y + 1), V3(0, 0, -1), 1); } }
};

// ======================================================= UPDATE
Game.update = function (dt, now) {
  Game.now = now;
  const P = Game.player; if (!P) return;
  Game.time = now;
  const input = G.Input.frame();
  if (Game.state === 'play') {
    // range-only toggles
    if (Game.mode === 'range') {
      if (input.fly) { P.fly = !P.fly; Game.toast(P.fly ? 'Fly mode on (Space/C up/down, Shift fast)' : 'Fly mode off'); if (!P.fly) P.pos.y = G.E.world.groundAt(P.pos.x, P.pos.z, P.pos.y); }
      if (input.menu) G.UI.toggleRangeMenu();
      if (input.reset) { for (const T of Game.targets) T.reset && T.reset(); G.FX.clear(); Game.toast('Targets reset'); }
    }
    Game.updatePickups(dt, P, input);
    if (Game.playerExplosives) Game.playerExplosives(P, input);
    if (P.alive) P.update(dt, input, now);
    else {
      P.hideVM = true;
      Game.respawnT -= dt;
      const cam = G.E.camera; cam.position.y = Math.max(P.pos.y + .3, cam.position.y - dt * 2); cam.rotation.z += dt * .3;
      if (Game.respawnT <= 0 && Game.state === 'play' && Game.mode !== 'mission') { const s = Game.spawnPoint(0); P.pos.copy(s); P.hp = 100; P.alive = true; P.armorState = G.newArmorState(); P.hideVM = false; P.yaw = 0; P.pitch = 0; P.stance = 0; for (const w of P.weapons) { w.mag = w.S.mag; w.reserve = w.S.mag * 6; } P.hudDirty = true; }
      G.Input.lastDx = 0;
    }
    for (const b of Game.bots) b.update(dt, now);
    if (Game.mode === 'mission' && Game.mission && !Game.mission.done) Game.mission.t += dt;
  } else if (Game.state === 'end') { for (const b of Game.bots) b.update(dt * .3, now); }
  // bullets
  G.Ballistics.update(dt, {
    soldiers: Game.agents, targets: Game.mode === 'range' || Game.mode === 'mission' ? Game.targets : null,
    listener: G.E.camera.position, listenerTeam: 0,
    onNearMiss: (d) => { P.suppress = Math.min(1.5, P.suppress + (3 - d) / 3); G.UI.suppress(P.suppress); },
    onSoldierHit: (b, S, zone, res) => { if (b.owner === P) { G.UI.hitmarker(res.killed, zone === 'head'); if (!res.killed) G.Audio.hit(zone === 'head', false); if (Game.stats) Game.stats.hits++; } },
    onTargetHit: (b, T, p, speed, r) => { if (b.owner === P && Game.mode === 'range') rangeStat(b, T, p, speed, r); },
  });
  Game.updateFrags(dt); if (Game.updateOrdnance) Game.updateOrdnance(dt);
  // grenades
  for (let i = Game.grenades.length - 1; i >= 0; i--) {
    const g = Game.grenades[i]; g.t += dt; const a = g.m.position.clone();
    g.v.y -= 9.81 * dt; g.m.position.addScaledVector(g.v, dt); g.m.lookAt(g.m.position.clone().add(g.v));
    const d = g.m.position.clone().sub(a); const L = d.length();
    const h = G.E.world.raycast(a, d.normalize(), L);
    let hitBot = null; for (const b of Game.agents) if (b !== g.owner && b.alive && b.pos.clone().setY(b.pos.y + 1).distanceTo(g.m.position) < .6) hitBot = b;
    let hitT = null; for (const T of Game.targets) if (T.rayTest(a, d, L) >= 0) hitT = T;
    if (h || hitBot || hitT || g.t > 8) { const p = h ? h.p : g.m.position.clone(); if (g.t > .12) explode(p, g.owner); else G.FX.impact(p, V3(0, 1, 0), d, 'metal', .5); G.E.scene.remove(g.m); Game.grenades.splice(i, 1); }
  }
  for (const T of Game.targets) T.update && T.update(dt);
  // wind flags
  const W = G.E.world;
  if (W.flags) { const w = G.Ballistics.wind.x; for (const f of W.flags) { f.rotation.y = w >= 0 ? 0 : PI; const pos = f.geometry.attributes.position; const droop = 1 - Math.min(1, Math.abs(w) / 6); for (let i = 0; i < pos.count; i++) { const x0 = (i % 7) / 6; pos.setZ(i, Math.sin(now * (3 + Math.abs(w)) + x0 * 5) * .08 * x0); pos.setY(i, (i < 7 ? .3 : -.3) - droop * x0 * .5); pos.setX(i, -.7 + x0 * 1.4 * (1 - droop * .3)); } pos.needsUpdate = true; f.position.x = -18 + .0; } }
  G.FX.update(dt);
  G.E.updateWeather(dt, G.E.camera);
  // shadow camera follows the player
  const sun = G.E.sun, sd = G.E.sunDir || V3(.3, 1, .3);
  const c = G.E.camera.position;
  const snap = V3(Math.round(c.x / 4) * 4, 0, Math.round(c.z / 4) * 4);
  if (Game.mode === 'range') { sun.shadow.camera.left = -40; sun.shadow.camera.right = 40; sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40; sun.shadow.camera.updateProjectionMatrix(); }
  else { const s = 58; if (sun.shadow.camera.right !== s) { sun.shadow.camera.left = -s; sun.shadow.camera.right = s; sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s; sun.shadow.camera.updateProjectionMatrix(); } snap.set(0, 0, 0); }
  sun.position.copy(snap).addScaledVector(sd, 120); sun.target.position.copy(snap);
  // viewmodel sun matches world sun in camera space
  const inv = G.E.camera.quaternion.clone().invert();
  G.E.vmSun.position.copy(sd).applyQuaternion(inv).multiplyScalar(5); G.E.vmSun.target.position.set(0, 0, 0);
  G.E.vmFill.intensity = .25 + (G.E.vmLight.intensity > 0 ? .4 : 0);
  G.Audio.listener(G.E.camera);
  G.UI.updateHUD(dt);
};
function rangeStat(b, T, p, speed, r) {
  const S = Game.stats; S.hits++;
  const eye = b.aim.eye, dir = b.aim.dir;
  const dist = Math.hypot(p.x - eye.x, p.z - eye.z);
  // aim point on the plane perpendicular to the line of fire at the impact distance
  const tAim = (p.z - eye.z) / dir.z; const aimP = eye.clone().addScaledVector(dir, tAim);
  const drop = aimP.y - p.y, wind = p.x - aimP.x;
  const m = (MASS[b.cal] || 8) / 1000;
  Game.camTarget = T; Game.camT = 6;
  if (r && r.info) Game.toast(r.info, 1.4);
  G.UI.hitmarker(false, false); G.Audio.hit(false, false);
  S.last = { target: T.type, dist, tof: b.t, v: speed, v0: b.v0, J: .5 * m * speed * speed, J0: .5 * m * b.v0 * b.v0, drop, wind, info: r ? r.info : '', group: T.group ? T.group() : 0 };
  G.UI.dirty = true;
}
// Kit test mannequin: wears YOUR current kit (Kit locker). Every hit is resolved against the exact
// piece of equipment it strikes, leaves a mark on it, and plates crack as they take hits.
TGT.kitdummy = function (x, z, dist, o = {}) {
  const kit = Object.assign({}, o.kit || G.Kit.current);
  const S = G.buildSoldier({ era: 'now', team: 0, tier: 'elite', weapon: null, kit, skin: '#c99a78' });
  const face = { rear: 0, side: PI / 2, quarter: PI * .75 }[o.orient] ?? PI;
  S.root.position.set(x, 0, z); S.root.rotation.y = face;
  const marks = [];
  G.animateSoldier(S, { dt: 1, speed: 0, aimPitch: 0 });
  const mm = { stop: G.mat({ color: '#9a9a90', metalness: .6, roughness: .5 }), pen: G.mat({ color: '#1a0806', roughness: .9 }) };
  const T = { type: 'kitdummy', g: S.root, S, kit, hp: 100, st: G.newArmorState(), focus: V3(x, 1.3, z),
    rayTest(ro, rd, maxT) { if (S.dead > 0) return -1; let best = -1; for (const hb of G.soldierHitboxes(S)) { const t = G.rayCapsule(ro, rd, hb.a, hb.b, hb.r); if (t >= 0 && t < maxT && (best < 0 || t < best)) { best = t; this._zone = hb.zone; } } return best; },
    onHit(b, p, dir, energy, speed) {
      const zone = this._zone || 'chest';
      const boneFor = zone === 'head' ? S.head : zone === 'chest' || zone === 'stomach' ? S.chest : null;
      const loc = boneFor ? boneFor.worldToLocal(p.clone()) : { x: 0, y: 0, z: -1 };
      const r = G.armorHit(kit, zone, loc, b, speed || b.v0, this.st);
      const d = b.dmg * energy * (G.ZONE_MUL[zone] || 1) * r.mult;
      this.hp -= d;
      // leave a mark on the kit: a grey splash where the armour stopped it, a dark hole where it went through
      if (boneFor) { const m = new THREE.Mesh(G.geo.gSph(r.stopped ? .012 : .007, 8), r.stopped ? mm.stop : mm.pen); m.position.copy(loc).multiplyScalar(1.02); boneFor.add(m); marks.push(m); }
      G.FX.impact(p, dir.clone().negate(), dir, r.stopped ? 'metal' : 'flesh', r.stopped ? .8 : 1);
      if (!r.stopped) { S.flinch = Math.min(1.2, S.flinch + .8); S.flinchDir = Math.sign(Math.random() - .5); }
      const dead = this.hp <= 0;
      if (dead) { S.dead = .0001; S.deathKind = null; S.headshot = zone === 'head'; S.deathDir.set(0, 0, 1); this.t = 0; }
      const plates = `plates F${this.st.f} B${this.st.b}${this.st.sl + this.st.sr ? ` S${this.st.sl + this.st.sr}` : ''}${this.st.helm ? ` · helmet ${this.st.helm}` : ''}`;
      return { pass: false, info: `${zone.toUpperCase()} · ${r.info || 'no armour here'} · ${Math.round(d)} dmg${dead ? ' · LETHAL' : ` · ${Math.max(0, Math.round(this.hp))} HP`} · ${plates}` };
    },
    update(dt) { if (S.dead > 0) { G.animateSoldier(S, { dt, dead: true }); this.t += dt; if (this.t > 3.5) this.reset(); } else G.animateSoldier(S, { dt, speed: 0, aimPitch: 0 }); },
    reset() { this.hp = 100; this.st = G.newArmorState(); for (const m of marks) m.parent && m.parent.remove(m); marks.length = 0; G.resetSoldier(S); S.root.rotation.set(0, face, 0); G.animateSoldier(S, { dt: 1, speed: 0 }); },
  };
  return T;
};
G.TARGETS.push({ id: 'kitdummy', n: 'Your kit on a mannequin', d: 'Wears everything from your Kit locker. Shows which plate, vest, helmet or visor stopped each round.' });
G.TGT = TGT;
})();
