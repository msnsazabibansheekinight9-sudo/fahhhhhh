// ============================================================================
// More range targets: balloons, army pop-ups, shoot/no-shoot turners, a steel
// spinner, a pendulum swinger, a flying drone, a laminated glass panel and a
// binary exploding target. Each follows the range-target contract:
// { type, g, focus, rayTest(ro, rd, maxT), onHit(b, p, dir, energy, speed), update(dt), reset() }
// ============================================================================
'use strict';
(function () {
const G = window.G, TGT = G.TGT, PI = Math.PI;
const { gBox, gCyl, gCylY, gSph } = G.geo;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const planeHit = (ro, rd, z, maxT) => { if (Math.abs(rd.z) < 1e-6) return -1; const t = (z - ro.z) / rd.z; return t > 0 && t < maxT ? t : -1; };
const steelM = () => G.mat({ color: '#e8e3d4', roughness: .6, metalness: .3 });
const sphereHit = (ro, rd, c, r, maxT) => { const oc = ro.clone().sub(c), b = oc.dot(rd), q = oc.lengthSq() - r * r, h = b * b - q; if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 && t < maxT ? t : -1; };

// ---------------------------------------------------------------- balloons: pop, then a fresh bunch
TGT.balloons = function (x, z, dist) {
  const s = clamp(dist / 80, 1, 3), g = new THREE.Group(); g.position.set(x, 0, z);
  const board = new THREE.Mesh(gBox(1.4 * s, 1.2 * s, .03), G.surf('planks')); board.position.set(0, .9 + .6 * s, -.08); g.add(board);
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(gBox(.05, .9 + 1.2 * s, .05), G.surf('bark')); p.position.set(sx * .7 * s, (.9 + 1.2 * s) / 2, -.1); g.add(p); }
  const cols = ['#d83a2e', '#2e7ad8', '#e8c23a', '#3ab45a', '#c84ad8', '#f08a2e'], B = [];
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(gSph(.11 * s, 14), G.mat({ color: cols[i % 6], roughness: .25, metalness: .05 })); m.scale.set(1, 1.2, 1); const bx = ((i % 3) - 1) * .4 * s, by = .9 + (.3 + Math.floor(i / 3) * .35) * s; m.position.set(bx, by, 0); g.add(m); B.push({ m, bx, by, up: true }); }
  let left = 9, t = 0;
  return { type: 'balloons', g, focus: V3(x, .9 + .6 * s, z),
    rayTest(ro, rd, maxT) { let best = -1; this._b = null; for (const b of B) if (b.up) { const tt = sphereHit(ro, rd, V3(x + b.bx, b.by + Math.sin(t * 2 + b.bx * 9) * .02, z), .12 * s, maxT); if (tt > 0 && (best < 0 || tt < best)) { best = tt; this._b = b; } } return best; },
    onHit(b, p, dir) { const q = this._b; q.up = false; q.m.visible = false; left--; G.FX.impact(p, V3(0, 0, 1), dir, 'glass', .4, { decal: false }); if (G.Audio.pop) G.Audio.pop(p); else G.Audio.impact(p, 'glass', false); return { pass: true, v: 1, info: left ? `Pop! ${left} left` : 'All balloons popped' }; },
    update(dt) { t += dt; for (const b of B) if (b.up) b.m.position.y = b.by + Math.sin(t * 2 + b.bx * 9) * .02; if (!left) { this.rt = (this.rt || 0) + dt; if (this.rt > 2) this.reset(); } },
    reset() { left = 9; this.rt = 0; for (const b of B) { b.up = true; b.m.visible = true; } } };
};

// ---------------------------------------------------------------- army pop-up silhouettes: rise at random, drop when hit
TGT.popup = function (x, z, dist) {
  const s = clamp(dist / 150, 1, 4), g = new THREE.Group(); g.position.set(x, 0, z);
  const berm = new THREE.Mesh(gBox(4.2 * s, .5, 1), G.surf('dirt')); berm.position.set(0, .25, .7); g.add(berm);
  const P = []; const tex = G.texTarget ? G.texTarget('ipsc') : null;
  for (let i = 0; i < 3; i++) {
    const piv = new THREE.Group(); piv.position.set((i - 1) * 1.4 * s, .02, 0); g.add(piv);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(.5 * s, .95 * s), G.mat({ color: '#6a6a3e', map: tex, transparent: !!tex, alphaTest: .5, side: THREE.DoubleSide, roughness: 1 })); card.position.y = .48 * s; piv.add(card);
    P.push({ piv, up: 0, want: 0, timer: 1 + Math.random() * 3, cx: x + (i - 1) * 1.4 * s });
  }
  let hits = 0, shown = 0;
  return { type: 'popup', g, focus: V3(x, .6 * s, z),
    rayTest(ro, rd, maxT) { const t = planeHit(ro, rd, z, maxT); if (t < 0) return -1; const p = ro.clone().addScaledVector(rd, t); for (const q of P) if (q.up > .85 && Math.abs(p.x - q.cx) < .22 * s && p.y > .1 * s && p.y < .95 * s) { this._q = q; return t; } return -1; },
    onHit(b, p, dir) { const q = this._q; q.want = 0; q.timer = 1.5 + Math.random() * 3; hits++; G.Audio.impact(p, 'wood', false); return { pass: true, v: .97, info: `Target down · ${hits} hit of ${shown} exposed` }; },
    update(dt) { for (const q of P) { q.timer -= dt; if (q.timer <= 0) { if (q.want) { q.want = 0; q.timer = 1 + Math.random() * 3; } else { q.want = 1; q.timer = 2 + Math.random() * 2.5; shown++; } } q.up += (q.want - q.up) * Math.min(1, dt * 8); q.piv.rotation.x = -(1 - q.up) * PI / 2; } },
    reset() { hits = shown = 0; for (const q of P) { q.want = 0; q.up = 0; q.timer = 1 + Math.random() * 3; } } };
};

// ---------------------------------------------------------------- shoot / no-shoot turners: face you as a threat (red) or a civilian (blue)
TGT.turner = function (x, z, dist) {
  const s = clamp(dist / 150, 1, 4), g = new THREE.Group(); g.position.set(x, 0, z);
  const mk = col => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const k = c.getContext('2d'); k.fillStyle = '#d8d0b8'; k.fillRect(0, 0, 64, 128); k.fillStyle = col; k.beginPath(); k.arc(32, 22, 15, 0, 7); k.fill(); k.fillRect(10, 40, 44, 80);
    if (col === '#b82a22') { k.fillStyle = '#222'; k.fillRect(40, 62, 22, 8); } else { k.fillStyle = '#fff'; k.font = 'bold 18px sans-serif'; k.fillText('NO', 18, 86); } const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return G.mat({ map: t, roughness: 1, side: THREE.DoubleSide }); };
  const mThreat = mk('#b82a22'), mCiv = mk('#2a5ab8'), Q = [];
  for (let i = 0; i < 3; i++) { const piv = new THREE.Group(); piv.position.set((i - 1) * 1.1 * s, 0, 0); g.add(piv);
    const post = new THREE.Mesh(gBox(.04, .9, .04), G.surf('darkmetal')); post.position.y = .45; piv.add(post);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(.45 * s, .9 * s), mThreat); card.position.y = .9 + .45 * s; piv.add(card);
    Q.push({ piv, card, face: 0, want: 0, threat: true, timer: 1 + Math.random() * 2, cx: x + (i - 1) * 1.1 * s, hit: false }); }
  let score = 0, fouls = 0;
  return { type: 'turner', g, focus: V3(x, .9 + .45 * s, z),
    rayTest(ro, rd, maxT) { const t = planeHit(ro, rd, z, maxT); if (t < 0) return -1; const p = ro.clone().addScaledVector(rd, t); for (const q of Q) if (q.face > .8 && Math.abs(p.x - q.cx) < .22 * s && p.y > .9 && p.y < .9 + .9 * s) { this._q = q; return t; } return -1; },
    onHit(b, p) { const q = this._q; if (q.hit) return { pass: true, v: .98, info: 'Already hit' }; q.hit = true; if (q.threat) score++; else fouls++; G.Audio.impact(p, 'wood', false); return { pass: true, v: .98, info: q.threat ? `Threat hit · ${score} threats, ${fouls} no-shoots` : `NO-SHOOT! Civilian hit · ${fouls} penalties` }; },
    update(dt) { for (const q of Q) { q.timer -= dt; if (q.timer <= 0) { if (q.want) { q.want = 0; q.timer = .8 + Math.random() * 2; } else { q.want = 1; q.threat = Math.random() < .65; q.card.material = q.threat ? mThreat : mCiv; q.hit = false; q.timer = 1.4 + Math.random() * 1.6; } } q.face += (q.want - q.face) * Math.min(1, dt * 10); q.piv.rotation.y = (1 - q.face) * PI / 2; } },
    reset() { score = fouls = 0; for (const q of Q) { q.want = 0; q.face = 0; q.timer = 1 + Math.random() * 2; } } };
};

// ---------------------------------------------------------------- steel spinner: two paddles on an axle, flips over when hit
TGT.spinner = function (x, z, dist) {
  const s = clamp(dist / 100, 1, 3), g = new THREE.Group(); g.position.set(x, 0, z);
  for (const sx of [-1, 1]) { const l = new THREE.Mesh(gBox(.06, .8 * s, .06), G.surf('darkmetal')); l.position.set(sx * .3 * s, .4 * s, 0); g.add(l); }
  const ax = new THREE.Group(); ax.position.set(0, .8 * s, 0); g.add(ax);
  const shaft = new THREE.Mesh(G.geo.gCylX(.015, .015, .62 * s, 8), G.surf('darkmetal')); ax.add(shaft);
  const big = new THREE.Mesh(gCyl(.12 * s, .12 * s, .012, 28), steelM()); big.position.y = .2 * s; ax.add(big);
  const sm = new THREE.Mesh(gCyl(.08 * s, .08 * s, .012, 24), steelM()); sm.position.y = -.17 * s; ax.add(sm);
  let ang = 0, av = 0, spins = 0;
  return { type: 'spinner', g, focus: V3(x, 1 * s, z),
    rayTest(ro, rd, maxT) { const t = planeHit(ro, rd, z, maxT); if (t < 0) return -1; const p = ro.clone().addScaledVector(rd, t); const c = Math.cos(ang), up = V3(0, c, 0);
      const by = .8 * s + .2 * s * c, sy = .8 * s - .17 * s * c; if (Math.hypot(p.x - x, p.y - by) < .12 * s * Math.max(.2, Math.abs(c))) { this._k = 1; return t; } if (Math.hypot(p.x - x, p.y - sy) < .08 * s * Math.max(.2, Math.abs(c))) { this._k = -1; return t; } return -1; },
    onHit(b, p, dir, e, speed) { av += (this._k > 0 ? 1 : -1) * clamp(speed / 120, 2, 14); G.Audio.ding(p, 0); G.FX.impact(p, V3(0, 0, 1), dir, 'steel', .8, { decal: false }); return { pass: false, info: `Spinner hit · ${this._k > 0 ? 'big paddle' : 'small paddle'}` }; },
    update(dt) { const pa = ang; av -= Math.sin(ang) * 6 * dt; av *= Math.pow(.35, dt); ang += av * dt; if (Math.floor(pa / (2 * PI)) !== Math.floor(ang / (2 * PI))) spins++; ax.rotation.x = ang; },
    reset() { ang = av = 0; spins = 0; } };
};

// ---------------------------------------------------------------- swinger: a silhouette on a pendulum, a moving-target drill
TGT.swinger = function (x, z, dist) {
  const s = clamp(dist / 150, 1, 4), g = new THREE.Group(), L = 1.6 * s; g.position.set(x, 0, z);
  const frameH = .6 + L + .5 * s;
  for (const sx of [-1, 1]) { const l = new THREE.Mesh(gBox(.07, frameH, .07), G.surf('darkmetal')); l.position.set(sx * 1.2 * s, frameH / 2, 0); g.add(l); }
  const top = new THREE.Mesh(gBox(2.4 * s + .07, .07, .07), G.surf('darkmetal')); top.position.set(0, frameH, 0); g.add(top);
  const piv = new THREE.Group(); piv.position.set(0, frameH, 0); g.add(piv);
  const rod = new THREE.Mesh(gBox(.03, L, .03), G.surf('darkmetal')); rod.position.y = -L / 2; piv.add(rod);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(.45 * s, .7 * s), G.mat({ map: G.texTarget ? G.texTarget('ipsc') : null, transparent: true, alphaTest: .5, side: THREE.DoubleSide, roughness: 1 })); card.position.y = -L - .2 * s; piv.add(card);
  let t = 0, hits = 0;
  return { type: 'swinger', g, focus: V3(x, frameH - L, z),
    rayTest(ro, rd, maxT) { const tt = planeHit(ro, rd, z, maxT); if (tt < 0) return -1; const p = ro.clone().addScaledVector(rd, tt); const a = piv.rotation.z, cx = x + Math.sin(a) * (L + .2 * s), cy = frameH - Math.cos(a) * (L + .2 * s); return Math.abs(p.x - cx) < .2 * s && Math.abs(p.y - cy) < .33 * s ? tt : -1; },
    onHit(b, p) { hits++; G.Audio.impact(p, 'wood', false); return { pass: true, v: .97, info: `Swinger hit · ${hits}` }; },
    update(dt) { t += dt; const a = piv.rotation.z = Math.sin(t * 1.6) * .65; this.focus.set(x + Math.sin(a) * (L + .2 * s), frameH - Math.cos(a) * (L + .2 * s), z); },
    reset() { hits = 0; } };
};

// ---------------------------------------------------------------- quadcopter drone: flies a figure-eight, falls when hit
TGT.drone = function (x, z, dist) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const d = new THREE.Group(); g.add(d); const dark = G.mat({ color: '#1e1f22', roughness: .5, metalness: .3 });
  const body = new THREE.Mesh(gBox(.22, .07, .22), dark); d.add(body);
  for (const [ax, az] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const arm = new THREE.Mesh(gBox(.03, .02, .22), dark); arm.position.set(ax * .1, 0, az * .1); arm.rotation.y = Math.atan2(ax, az); d.add(arm);
    const rot = new THREE.Mesh(gCylY(.1, .1, .005, 16), G.mat({ color: '#9aa0a8', transparent: true, opacity: .35, depthWrite: false })); rot.position.set(ax * .17, .045, az * .17); d.add(rot); }
  const led = new THREE.Mesh(gSph(.02, 8), G.mat({ color: '#ff3020', emissive: '#ff2010', emissiveIntensity: 2 })); led.position.set(0, -.04, .11); d.add(led);
  let t = Math.random() * 6, down = false, vy = 0, rt = 0; const R = clamp(dist / 12, 2, 18), H = 4 + dist / 60;
  return { type: 'drone', g, focus: V3(x, H, z),
    rayTest(ro, rd, maxT) { if (down) return -1; const c = d.getWorldPosition(V3()); return sphereHit(ro, rd, c, .2, maxT); },
    onHit(b, p, dir) { down = true; vy = 0; G.FX.impact(p, dir.clone().negate(), dir, 'metal', 1, { decal: false }); G.Audio.impact(p, 'metal', true); return { pass: false, info: 'Drone down!' }; },
    update(dt) { if (!down) { t += dt * .55; d.position.set(Math.sin(t) * R, H + Math.sin(t * 2.3) * .6, Math.sin(t * 2) * R * .25); d.rotation.set(.15 * Math.cos(t), t, .15 * Math.sin(t * 2)); }
      else { vy -= 9.81 * dt; d.position.y = Math.max(.05, d.position.y + vy * dt); d.rotation.x += dt * 5; if (d.position.y <= .05) { rt += dt; if (rt > 3) this.reset(); } } this.focus.set(x + d.position.x, d.position.y, z + d.position.z); },
    reset() { down = false; rt = 0; vy = 0; d.rotation.set(0, 0, 0); } };
};

// ---------------------------------------------------------------- laminated glass panel: spider-web cracks; thick glass stops pistol rounds
TGT.glass = function (x, z, dist) {
  const g = new THREE.Group(), w = 1.2, h = 1.4, cy = 1.4; g.position.set(x, 0, z);
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(gBox(.08, cy + h / 2 + .05, .1), G.surf('darkmetal')); p.position.set(sx * (w / 2 + .04), (cy + h / 2) / 2, 0); g.add(p); }
  const pane = new THREE.Mesh(gBox(w, h, .03), G.mat({ color: '#b8d0d8', roughness: .05, metalness: .1, transparent: true, opacity: .35 })); pane.position.y = cy; g.add(pane);
  const cracks = new THREE.Group(); g.add(cracks); const cm = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .85 });
  let n = 0;
  return { type: 'glass', g, focus: V3(x, cy, z),
    rayTest(ro, rd, maxT) { const t = planeHit(ro, rd, z, maxT); if (t < 0) return -1; const p = ro.clone().addScaledVector(rd, t); return Math.abs(p.x - x) < w / 2 && Math.abs(p.y - cy) < h / 2 ? t : -1; },
    onHit(b, p, dir, e, speed) { n++;
      const pts = [], lx = p.x - x, ly = p.y; for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2 + Math.random() * .4, r = .06 + Math.random() * .16; pts.push(V3(lx, ly, .02), V3(lx + Math.cos(a) * r, ly + Math.sin(a) * r, .02)); }
      for (let k = 1; k <= 2; k++) { const r = .03 * k + Math.random() * .02; for (let i = 0; i < 9; i++) { const a0 = i / 9 * PI * 2, a1 = (i + 1) / 9 * PI * 2; pts.push(V3(lx + Math.cos(a0) * r, ly + Math.sin(a0) * r, .02), V3(lx + Math.cos(a1) * r, ly + Math.sin(a1) * r, .02)); } }
      cracks.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), cm));
      const cap = G.penCapability ? G.penCapability(b, speed || b.v0 || 1) : 5, stop = cap < 3.8 && n < 6; G.Audio.impact(p, 'glass', false);
      return { pass: !stop, v: .7, info: stop ? `Laminated glass stopped it (${n} hits)` : `Through the glass · ${Math.round(speed || 0)} m/s` }; },
    reset() { n = 0; cracks.clear(); } };
};

// ---------------------------------------------------------------- binary exploding target: needs a rifle-velocity hit (> 600 m/s)
TGT.boom = function (x, z, dist) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const stand = new THREE.Mesh(gBox(.5, .9, .5), G.surf('crate')); stand.position.y = .45; g.add(stand);
  const jar = new THREE.Mesh(gCylY(.09, .09, .2, 16), G.mat({ color: '#dfe4ea', roughness: .5 })); jar.position.y = 1.0; g.add(jar);
  const lab = new THREE.Mesh(gCylY(.092, .092, .08, 16), G.mat({ color: '#e04020', roughness: .6 })); lab.position.y = 1.0; g.add(lab);
  let gone = false, rt = 0;
  return { type: 'boom', g, focus: V3(x, 1, z),
    rayTest(ro, rd, maxT) { if (gone) return -1; const t = planeHit(ro, rd, z, maxT); if (t < 0) return -1; const p = ro.clone().addScaledVector(rd, t); return Math.abs(p.x - x) < .1 && Math.abs(p.y - 1) < .11 ? t : -1; },
    onHit(b, p, dir, e, speed) {
      if ((speed || 0) < 600) { G.Audio.impact(p, 'metal', false); return { pass: false, info: `Fizzle — ${Math.round(speed || 0)} m/s is too slow to set it off (needs a rifle round)` }; }
      gone = true; jar.visible = lab.visible = false; const c = V3(x, 1, z);
      if (G.FX.explosion) G.FX.explosion(c, 1.2); else G.FX.impact(c, V3(0, 1, 0), dir, 'dirt', 4, { decal: false });
      G.Audio.explosion ? G.Audio.explosion(c) : G.Audio.impact(c, 'metal', true);
      return { pass: false, info: 'BOOM!' }; },
    update(dt) { if (gone) { rt += dt; if (rt > 3) this.reset(); } },
    reset() { gone = false; rt = 0; jar.visible = lab.visible = true; } };
};

G.TARGETS.push(
  { id: 'balloons', n: 'Balloon board', d: 'Nine balloons that pop. A fresh bunch appears when they are all gone.' },
  { id: 'popup', n: 'Army pop-up silhouettes', d: 'Three targets rise at random and drop when hit. Counts exposures vs hits.' },
  { id: 'turner', n: 'Shoot / no-shoot turners', d: 'Turn to face you as a threat (red, armed) or a civilian (blue). Penalises no-shoot hits.' },
  { id: 'spinner', n: 'Steel spinner', d: 'Two paddles on an axle — the hit spins it over.' },
  { id: 'swinger', n: 'Pendulum swinger', d: 'A silhouette on a swinging arm for moving-target practice.' },
  { id: 'drone', n: 'Quadcopter drone', d: 'Flies a figure-eight at range-dependent height and falls when hit.' },
  { id: 'glass', n: 'Laminated glass panel', d: 'Shows spider-web cracks; stops most pistol rounds for a few hits, rifles go straight through.' },
  { id: 'boom', n: 'Exploding target', d: 'Binary reactive target that only goes off from a rifle-velocity hit (over 600 m/s).' },
);
})();
