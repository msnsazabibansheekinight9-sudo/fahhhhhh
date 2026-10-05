// ============================================================================
// MASS BATTLEFIELD — 20 v 20 (or 12 v 12 / 32 v 32) conquest on a 600 m map.
//   Five capture points (A–E) between two HQs. Stand in a point's ring to
//   take it; more soldiers capture faster. Every death costs your side a
//   ticket and the side holding fewer points bleeds tickets; first to zero
//   loses, or the most tickets when the clock runs out.
//   Both armies are bots from the chosen era's real arsenals and uniforms.
//   They pick objectives (attack the nearest point they don't own, defend
//   points under threat), fight, throw grenades and respawn at their HQ or
//   at points their side holds. You deploy where you like after each death.
//   Chaos: artillery barrages on contested points (whistle first), mortar
//   salvos from both sides, jets making bombing runs, burning wrecks and
//   smoke everywhere. Friendlies wear a blue chevron; the minimap shows
//   points, friendlies and spotted enemies.
// ============================================================================
'use strict';
(function () {
const G = window.G, Game = G.Game, PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const { gBox, gCylY } = G.geo;
const BT = G.Battle = {};
const TEAM = [{ n: 'BLUE', col: '#4a86ff' }, { n: 'RED', col: '#ff4a4a' }];
const pick = (l, R = Math.random) => l[Math.floor(R() * l.length)];
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

G.BATTLE_MAPS = [
  { id: 'ruins', n: 'Shattered City', d: 'Blocks of shelled buildings, barricades and burnt cars. Close and brutal.', style: 'urban', ground: 'concrete', B: 300 },
  { id: 'dunes', n: 'Dust Bowl', d: 'Adobe villages, walls and wadis under a hard sun. Long lanes, short cover.', style: 'desert', ground: 'sand', B: 300 },
  { id: 'harbour', n: 'Iron Harbour', d: 'Container stacks, cranes and sheds along the docks.', style: 'dock', ground: 'concrete', B: 300 },
  { id: 'airbase', n: 'Airbase Kilo', d: 'Hangars, fuel trucks and baggage carts around an open apron.', style: 'airport', ground: 'concrete', B: 320 },
  { id: 'railyard', n: 'Marshalling Yard', d: 'Rows of wagons, signal huts and sidings: corridors everywhere.', style: 'yard', ground: 'gravel', B: 300 },
  { id: 'woods', n: 'Black Forest', d: 'Dense pine forest, logging camps and cabins. Nobody sees far.', forest: true, ground: 'grass', B: 300 },
];
G.BATTLE_MAP = Object.fromEntries(G.BATTLE_MAPS.map(m => [m.id, m]));
const FLAGS = [['A', -.5, .42], ['B', .5, .38], ['C', 0, 0], ['D', -.48, -.4], ['E', .5, -.44]];

function freeAt(W, x, z, r = .5) {
  const gy = W.groundAt(x, z, 50, .2);
  for (const c of W.near(x - r - 1, z - r - 1, x + r + 1, z + r + 1)) { if (c.soft || c.noMove) continue; if (c.max.x > x - r && c.min.x < x + r && c.max.z > z - r && c.min.z < z + r && c.max.y > gy + .2 && c.min.y < gy + 1.7) return null; }
  return gy;
}
function spotNear(W, x, z, spread = 6, tries = 40) { for (let k = 0; k < tries; k++) { const xx = x + (Math.random() - .5) * spread * (1 + k / 8), zz = z + (Math.random() - .5) * spread * (1 + k / 8), y = freeAt(W, xx, zz); if (y !== null && Math.abs(xx) < W.bounds - 2 && Math.abs(zz) < W.bounds - 2) return V3(xx, y, zz); } return V3(x, 0, z); }

// ------------------------------------------------------------------ map
function build(W, Mp, R) {
  const H = G.MissionHelpers, B = Mp.B, surf = (k, r) => G.surf(k, r);
  const avoid = FLAGS.map(([, fx, fz]) => [fx * B - 9, fz * B - 9, fx * B + 9, fz * B + 9]).concat([[-22, B * .88 - 14, 22, B], [-22, -B, 22, -B * .88 + 14]]);
  if (Mp.forest) G.Raid.forest(W, { B }, R);
  else H.outskirts(W, { id: 'bt_' + Mp.id, player: { pos: [0, 0, B * .9] } }, { style: Mp.style, bounds: B, regions: [[-B + 6, -B + 6, B - 6, B - 6]], avoid, start: [0, B * .9], max: 0, cell: 17, density: .66, guardP: 0, seed: 1 + Math.floor(R() * 999) });
  // the scars of the fighting: wrecks, craters (sandbag rings) and trench lines at each point
  for (let i = 0; i < 26; i++) { const x = (R() - .5) * 2 * (B - 20), z = (R() - .5) * 1.6 * (B - 20); if (avoid.some(a => x > a[0] - 4 && x < a[2] + 4 && z > a[1] - 4 && z < a[3] + 4)) continue; W.vehicle(x, z, R() * PI, R() < .7 ? 'burnt' : 'truck'); }
  for (const [, fx, fz] of FLAGS) { const x = fx * B, z = fz * B; for (let k = 0; k < 4; k++) { const a = k * PI / 2 + R() * .6, r = 11 + R() * 3; W.box(x + Math.cos(a) * r, 0, z + Math.sin(a) * r, Math.abs(Math.sin(a)) * 4 + 1, 1.05, Math.abs(Math.cos(a)) * 4 + 1, surf('sandbag', 1), 'sandbag'); } W.crate(x + 3, z - 2, 1.2, 0); W.crate(x - 2.5, z + 3, 1.2, 0); }
  // HQs: sandbag walls, crates and trucks
  for (const t of [0, 1]) { const z = (t ? -1 : 1) * B * .88, s = t ? -1 : 1; W.box(0, 0, z - s * 9, 30, 1.2, 1, surf('sandbag', 2), 'sandbag'); for (const x of [-14, 14]) W.box(x, 0, z, 1, 1.2, 16, surf('sandbag', 2), 'sandbag'); W.vehicle(-8, z + s * 4, 0, 'truck'); W.vehicle(8, z + s * 4, 0, t ? 'truck' : 'humvee'); for (let i = 0; i < 4; i++) W.crate(-4 + i * 2.6, z + s * 7, 1.2, 0); }
  W.bounds = B;
}

// ------------------------------------------------------------------ start
// cfg: { map, era, tod, size, tier, tickets, primary, secondary }
BT.start = function (cfg) {
  Game.cleanup(true);
  Game.mode = 'battle'; Game.state = 'play';
  const Mp = G.BATTLE_MAP[cfg.map] || G.BATTLE_MAPS[0], tod = G.TOD[cfg.tod] || G.TOD.day, R = G.rng(Date.now() % 100000), era = cfg.era || 'now';
  const map = { id: 'battle_' + Mp.id, era, name: Mp.n, size: Mp.B, env: tod.env, ground: Mp.ground, weather: cfg.tod === 'night' && Mp.ground !== 'sand' ? 'rain' : null, amb: 'war', reverb: Mp.forest ? 'outdoor' : 'urban', build: W => build(W, Mp, R) };
  G.E.loadMap(map);
  const W = G.E.world, B = Mp.B;
  // capture points
  const flags = FLAGS.map(([id, fx, fz]) => {
    const p = spotNear(W, fx * B, fz * B, 3);
    const g = new THREE.Group(); g.position.copy(p); W.group.add(g);
    const pole = new THREE.Mesh(gCylY(.06, .06, 9, 8), G.mat({ color: '#9a9a9a', metalness: .8, roughness: .3 })); pole.position.y = 4.5; g.add(pole);
    const mat = G.mat({ color: '#e8e8e8', roughness: .8, side: THREE.DoubleSide, emissive: '#000000' });
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), mat); cloth.position.set(1.12, 8.2, 0); g.add(cloth);
    const ring = new THREE.Mesh(new THREE.RingGeometry(13.5, 14, 64), G.mat({ color: '#e8e8e8', emissive: '#e8e8e8', emissiveIntensity: .6, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -PI / 2; ring.position.y = .06; g.add(ring);
    return { id, pos: p, r: 14, owner: null, p: 0, g, mat, ring, cloth, n: [0, 0] };
  });
  // start: the middle and the far points are neutral; each side holds its two near points
  for (const f of flags) { if (f.pos.z > B * .2) { f.owner = 0; f.p = 1; } else if (f.pos.z < -B * .2) { f.owner = 1; f.p = -1; } }
  const hq = [V3(0, 0, B * .88), V3(0, 0, -B * .88)];
  BT.st = { cfg, Mp, flags, hq, tickets: [cfg.tickets || 400, cfg.tickets || 400], t: 0, limit: 25 * 60, bleedT: 0, artT: 14, morT: 7, jetT: 30, events: [], jets: [], fires: [], deployT: 0, dead: false, stats: { kills: 0, deaths: 0, caps: 0, assists: 0 }, spot: new Map(), done: false, chevT: 0 };
  // burning wrecks: some of the vehicles keep burning all battle
  for (const c of W.colliders) if (c.mat === 'metal' && c.max.y - c.min.y > 1.2 && c.max.y - c.min.y < 3.2 && (c.max.x - c.min.x) * (c.max.z - c.min.z) > 6 && (c.max.x - c.min.x) * (c.max.z - c.min.z) < 30 && Math.random() < .25 && BT.st.fires.length < 18) BT.st.fires.push(V3((c.min.x + c.max.x) / 2, c.max.y, (c.min.z + c.max.z) / 2));
  // player
  const P = Game.player = new G.Player();
  P.setupWeapons([cfg.primary, cfg.secondary].filter(Boolean));
  P.team = 0; P.hp = 100; P.alive = true; P.armorState = G.newArmorState();
  P.pos.copy(spotNear(W, hq[0].x, hq[0].z, 10)); P.yaw = 0; P.pitch = 0;
  // armies
  Game.bots = [];
  const n = cfg.size || 20, tiers = ['recruit', 'regular', 'veteran', 'elite'], ti = Math.max(0, tiers.indexOf(cfg.tier));
  for (const t of [0, 1]) for (let i = 0; i < (t === 0 ? n - 1 : n); i++) {
    const tier = cfg.tier === 'mixed' ? pick(tiers) : tiers[Math.max(0, Math.min(3, ti + (Math.random() < .25 ? 1 : 0) - (Math.random() < .25 ? 1 : 0)))];
    const b = new G.Bot(Game, t, tier, era, i, { look: era });
    const fw = flags.filter(f => f.owner === t), at = fw.length && i % 3 ? fw[i % fw.length].pos : hq[t]; // most start at their side's forward points
    b.spawn(spotNear(W, at.x + (Math.random() - .5) * 16, at.z + (Math.random() - .5) * 10, 8)); b.spawnProt = 3;
    b.chev = chevron(t); b.model.root.add(b.chev); b.chev.visible = t === 0;
    Game.bots.push(b);
  }
  Game.agents = [P, ...Game.bots];
  W.spawns = [[hq[0].clone()], [hq[1].clone()]];
  Game.killfeed = []; Game.stats = { shots: 0, hits: 0 }; Game.cfg = Object.assign({ explosives: (G.UI.mis.ex || ['m67', 'm84', 'm18', 'c4']).slice() }, cfg); Game.map = map; P.expl = null;
  Game.respawnT = 1e9;
  try { G.E.renderer.compile(G.E.scene, G.E.camera); } catch (e) {}
  G.UI.showHUD('mission');
  BT.hud();
  Game.toast(`${Mp.n} · ${G.ERA[era].name} · ${n} v ${n} — take and hold the points. ${BT.st.tickets[0]} tickets each.`, 6);
};
let _chevTex = null;
function chevron(t) {
  if (!_chevTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(8, 18); x.lineTo(32, 46); x.lineTo(56, 18); x.lineTo(46, 18); x.lineTo(32, 34); x.lineTo(18, 18); x.closePath(); x.fill(); _chevTex = new THREE.CanvasTexture(c); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: _chevTex, color: TEAM[t].col, depthTest: false, transparent: true, opacity: .85 }));
  s.position.y = 2.15; s.scale.set(.35, .35, 1); s.renderOrder = 20; return s;
}

// ------------------------------------------------------------------ per-frame
BT.update = function (dt) {
  const S = BT.st; if (!S || S.done) return;
  const P = Game.player, W = G.E.world;
  S.t += dt;
  // capture
  for (const f of S.flags) {
    f.n = [0, 0];
    for (const a of Game.agents) if (a.alive && Math.abs(a.pos.y - f.pos.y) < 5 && Math.hypot(a.pos.x - f.pos.x, a.pos.z - f.pos.z) < f.r) f.n[a.team]++;
    const diff = f.n[0] - f.n[1];
    if (diff) {
      const before = f.owner;
      f.p = Math.max(-1, Math.min(1, f.p + Math.sign(diff) * Math.min(3, Math.abs(diff)) * dt / 10));
      if (f.owner === 0 && f.p <= 0) f.owner = null; if (f.owner === 1 && f.p >= 0) f.owner = null;
      if (f.p >= 1) f.owner = 0; if (f.p <= -1) f.owner = 1;
      if (before !== f.owner) {
        if (f.owner !== null) { Game.toast(`${f.owner === 0 ? '🔵 We captured' : '🔴 The enemy captured'} ${f.id}`, 2); if (f.owner === 0 && P.alive && Math.hypot(P.pos.x - f.pos.x, P.pos.z - f.pos.z) < f.r) S.stats.caps++; }
        else Game.toast(`${f.id} neutralised`, 1.4);
        G.Audio.ui && G.Audio.ui(f.owner === 0 ? 'attach' : undefined);
      }
    }
    const col = f.owner === null ? '#e8e8e8' : TEAM[f.owner].col; f.mat.color.set(col); f.ring.material.color.set(col); f.ring.material.emissive.set(col);
    f.ring.material.opacity = f.n[0] && f.n[1] ? .55 + Math.sin(S.t * 8) * .3 : .5;
    f.cloth.position.y = 1.2 + Math.abs(f.p) * 7; f.cloth.rotation.y = Math.sin(S.t * 2 + f.pos.x) * .25;
  }
  // tickets bleed for the side holding fewer points
  const own = [0, 1].map(t => S.flags.filter(f => f.owner === t).length);
  S.bleedT += dt; if (S.bleedT >= 1) { S.bleedT = 0; W.spawns = [0, 1].map(t => [S.hq[t].clone(), ...S.flags.filter(f => f.owner === t && !f.n[1 - t]).map(f => f.pos.clone())]); if (own[0] !== own[1]) { const lose = own[0] > own[1] ? 1 : 0, d = Math.abs(own[0] - own[1]); S.tickets[lose] = Math.max(0, S.tickets[lose] - d * .35); } }
  // bot objectives (once a second, staggered)
  S.objT = (S.objT || 0) - dt;
  if (S.objT <= 0) { S.objT = .25; const k = Math.floor(S.t * 4) % 4; Game.bots.forEach((b, i) => { if (i % 4 === k) objective(b, S); }); }
  // spotting: enemies seen by any friendly show on the minimap for a few seconds
  for (const b of Game.bots) if (b.alive && b.team === 0 && b.targetVisible && b.target && b.target.team === 1) S.spot.set(b.target, S.t + 4);
  // friendly chevrons only within 80 m
  if ((S.chevT -= dt) <= 0) { S.chevT = .3; for (const b of Game.bots) if (b.chev) b.chev.visible = b.team === 0 && b.alive && b.pos.distanceTo(P.pos) < 80; }
  chaos(dt, S);
  // pickups pile up in a battle: keep the newest 24
  if (Game.pickups.length > 24) { for (const p of Game.pickups.splice(0, Game.pickups.length - 24)) if (p.own && p.obj.parent) p.obj.parent.remove(p.obj); }
  // death and deploy
  if (!P.alive) { if (!S.dead) { S.dead = true; S.deployT = 6; BT.deployScreen(); } S.deployT -= dt; BT.deployTick(); }
  if (S.tickets[0] <= 0 || S.tickets[1] <= 0 || S.t >= S.limit) BT.end();
  BT.hudTick();
};
function objective(b, S) {
  if (!b.alive) return;
  const t = b.team, now = S.t;
  if (b.targetVisible && b.target) return; // fighting: the combat AI has priority
  const f0 = b.objFlag;
  // stay on a point while it is not fully ours
  if (f0 && Math.hypot(b.pos.x - f0.pos.x, b.pos.z - f0.pos.z) < f0.r && (f0.owner !== t || Math.abs(f0.p) < 1 || f0.n[1 - t])) { if (!b.objT || now > b.objT) { b.objT = now + 3 + Math.random() * 4; b.roam = V3(f0.pos.x + (Math.random() - .5) * f0.r * 1.3, f0.pos.y, f0.pos.z + (Math.random() - .5) * f0.r * 1.3); b.repath = 0; } return; }
  if (f0 && f0.owner !== t && !b.reconsider) return;
  // choose: defend a threatened point we hold, otherwise attack the nearest point we don't hold
  let best = null, bs = -1e9;
  for (const f of S.flags) {
    const d = Math.hypot(b.pos.x - f.pos.x, b.pos.z - f.pos.z);
    let sc = -d * (.6 + Math.random() * .8);
    if (f.owner !== t) sc += 120; if (f.owner === null) sc += 40;
    if (f.owner === t && f.n[1 - t]) sc += 160; // under attack
    if (f.owner === t && !f.n[1 - t]) sc -= 200;
    if (sc > bs) { bs = sc; best = f; }
  }
  if (!best) return;
  if (best !== f0 || !b.roam || b.roam.distanceTo(best.pos) > best.r * 1.5) { b.objFlag = best; b.roam = V3(best.pos.x + (Math.random() - .5) * best.r, best.pos.y, best.pos.z + (Math.random() - .5) * best.r); b.repath = 0; b.lastHeard = null; }
}

// ------------------------------------------------------------------ chaos: artillery, mortars, jets, fires
function chaos(dt, S) {
  const P = Game.player;
  for (const p of S.fires) if (Math.random() < dt * 22) G.FX.fire.spawn({ x: p.x + (Math.random() - .5) * 1.4, y: p.y, z: p.z + (Math.random() - .5) * 1.4, vx: 0, vy: 1.2 + Math.random(), vz: 0, life: .5 + Math.random() * .4, s0: .6, s1: 1.4, r: 1, g: .5 + Math.random() * .3, b: .2, drag: .1 });
  for (const p of S.fires) if (Math.random() < dt * 4) G.FX.smoke.spawn({ x: p.x, y: p.y + 1.5, z: p.z, vx: .4, vy: 1.4, vz: .2, life: 5, s0: 1, s1: 5, r: .15, g: .15, b: .15, a: .55, drag: .15 });
  // scheduled impacts
  for (let i = S.events.length - 1; i >= 0; i--) { const e = S.events[i]; e.t -= dt; if (e.t <= 0) { S.events.splice(i, 1); e.fn(); } }
  const contested = S.flags.filter(f => f.n[0] && f.n[1]), front = contested.length ? contested : S.flags.filter(f => f.owner === null).concat(S.flags.filter(f => f.n[0] + f.n[1] > 0));
  // artillery barrage: whistles, then 8–10 shells over a few seconds on a contested point
  if ((S.artT -= dt) <= 0) {
    S.artT = 26 + Math.random() * 22;
    const f = pick(front.length ? front : S.flags), side = f.owner === null ? (Math.random() < .5 ? 0 : 1) : 1 - f.owner, owner = { team: side, name: (side ? 'Red' : 'Blue') + ' artillery', pos: f.pos };
    if (P.alive && P.pos.distanceTo(f.pos) < 60) Game.toast(side === 0 ? '🔵 Friendly artillery on ' + f.id : '⚠ INCOMING ARTILLERY — ' + f.id, 2.2);
    const nShells = 8 + Math.floor(Math.random() * 3);
    for (let k = 0; k < nShells; k++) { const p = V3(f.pos.x + (Math.random() - .5) * 46, 0, f.pos.z + (Math.random() - .5) * 46); p.y = G.E.world.groundAt(p.x, p.z, 60) + .2; const tt = 2.2 + k * .45 + Math.random() * .4;
      S.events.push({ t: tt - 1.5, fn: () => G.Audio.whistle && G.Audio.whistle(p) }, { t: tt, fn: () => Game.explode(p, owner, { r: 9, dmg: 170, name: owner.name }) }); }
  }
  // mortars: quick three-round salvos from both sides at clusters of the enemy
  if ((S.morT -= dt) <= 0) {
    S.morT = 9 + Math.random() * 10;
    const side = Math.random() < .5 ? 0 : 1, tg = Game.agents.filter(a => a.alive && a.team !== side);
    const v = pick(tg); if (v) { const owner = { team: side, name: (side ? 'Red' : 'Blue') + ' mortar', pos: v.pos };
      for (let k = 0; k < 3; k++) { const p = V3(v.pos.x + (Math.random() - .5) * 24, 0, v.pos.z + (Math.random() - .5) * 24); p.y = G.E.world.groundAt(p.x, p.z, 60) + .2; const tt = 1.6 + k * .7;
        S.events.push({ t: tt - 1.2, fn: () => G.Audio.whistle && G.Audio.whistle(p) }, { t: tt, fn: () => Game.explode(p, owner, { r: 6, dmg: 120, name: owner.name }) }); } }
  }
  // jets: a fast pass over a contested point, dropping a stick of bombs
  if ((S.jetT -= dt) <= 0) {
    S.jetT = 50 + Math.random() * 40;
    const f = pick(front.length ? front : S.flags), side = f.owner === null ? (Math.random() < .5 ? 0 : 1) : 1 - f.owner, B = S.Mp.B, ang = Math.random() * PI * 2;
    const dir = V3(Math.cos(ang), 0, Math.sin(ang)), start = f.pos.clone().addScaledVector(dir, -B * 1.4).setY(70);
    const m = new THREE.Group(); const body = G.mat({ color: side ? '#5a4a3a' : '#4a5260', metalness: .4, roughness: .5 });
    const fus = new THREE.Mesh(gBox(1.4, 1.2, 14), body); m.add(fus); const wing = new THREE.Mesh(gBox(11, .25, 3.4), body); wing.position.z = .5; m.add(wing); const tail = new THREE.Mesh(gBox(4.4, .2, 1.8), body); tail.position.z = 6; m.add(tail); const fin = new THREE.Mesh(gBox(.2, 2.4, 2), body); fin.position.set(0, 1.2, 6); m.add(fin);
    m.position.copy(start); m.lookAt(start.clone().add(dir)); m.rotateY(PI); G.E.scene.add(m);
    S.jets.push({ m, dir, v: 160, t: 0, side, f, dropped: false, life: B * 2.8 / 160 });
    if (P.alive) { Game.toast(side === 0 ? '✈ Friendly air strike inbound' : '✈ ENEMY JETS', 2); }
  }
  for (let i = S.jets.length - 1; i >= 0; i--) {
    const j = S.jets[i]; j.t += dt; j.m.position.addScaledVector(j.dir, j.v * dt);
    if (!j.sound && j.m.position.distanceTo(P.pos) < 260) { j.sound = true; G.Audio.jet && G.Audio.jet(j.m.position); }
    const flat = Math.hypot(j.m.position.x - j.f.pos.x, j.m.position.z - j.f.pos.z);
    if (!j.dropped && flat < 40) { j.dropped = true; const owner = { team: j.side, name: (j.side ? 'Red' : 'Blue') + ' air strike', pos: j.f.pos };
      for (let k = 0; k < 5; k++) { const p = j.m.position.clone().addScaledVector(j.dir, 14 + k * 11); p.x += (Math.random() - .5) * 6; p.z += (Math.random() - .5) * 6; p.y = G.E.world.groundAt(p.x, p.z, 60) + .2; S.events.push({ t: 1.1 + k * .18, fn: () => Game.explode(p, owner, { r: 12, dmg: 230, name: owner.name }) }); } }
    if (j.t > j.life) { G.E.scene.remove(j.m); S.jets.splice(i, 1); }
  }
}

// ------------------------------------------------------------------ kills, deploy, end
const onKill0 = Game.onKill;
Game.onKill = function (killer, victim, weapon, head) {
  const S = BT.st;
  if (Game.mode !== 'battle' || !S) return onKill0.apply(this, arguments);
  Game.killfeed.unshift({ k: killer ? killer.name : '—', kt: killer ? killer.team : -1, v: victim.name, vt: victim.team, w: weapon ? weapon.n : '', head, t: 6 }); if (Game.killfeed.length > 7) Game.killfeed.pop();
  S.tickets[victim.team] = Math.max(0, S.tickets[victim.team] - 1);
  if (killer && killer !== victim && killer.kills !== undefined) killer.kills++;
  if (victim === Game.player) { S.stats.deaths++; return; }
  if (killer === Game.player) { S.stats.kills++; G.UI.hitmarker(true, head); G.Audio.hit(head, true); Game.toast(`${head ? 'Headshot · ' : ''}${victim.name} · +100`, 1.2); }
  BT.feedDirty = true;
};
BT.deployScreen = function () {
  const S = BT.st; let el = document.getElementById('deploy');
  if (!el) { el = document.createElement('div'); el.id = 'deploy'; el.style.cssText = 'position:fixed;left:50%;bottom:16%;transform:translateX(-50%);z-index:20;background:rgba(10,12,9,.88);border:1px solid rgba(230,197,114,.45);border-radius:6px;padding:12px 16px;color:#e8e2cc;font:14px var(--f-ui,sans-serif);text-align:center;min-width:340px'; document.body.appendChild(el); }
  el.style.display = 'block'; BT.deployKey = '';
  G.Input.unlock(); Game.lootOpen = true; // keep the pause menu from popping up while the mouse is free
};
BT.deployTick = function () {
  const S = BT.st, el = document.getElementById('deploy'); if (!el) return;
  const opts = [['HQ', S.hq[0]], ...S.flags.filter(f => f.owner === 0).map(f => [f.id + (f.n[1] ? ' (under attack)' : ''), f.pos, !!f.n[1]])];
  const key = opts.map(o => o[0]).join() + '|' + Math.ceil(Math.max(0, S.deployT));
  if (key === BT.deployKey) return; BT.deployKey = key;
  const ready = S.deployT <= 0;
  el.innerHTML = `<div style="font-weight:700;letter-spacing:.08em;margin-bottom:6px">${ready ? 'DEPLOY' : 'REDEPLOY IN ' + Math.ceil(S.deployT)}</div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${opts.map(([n, , hot], i) => `<button class="btn${i === 0 ? '' : ' primary'}" data-dep="${i}" ${ready && !hot ? '' : 'disabled'}>${n}</button>`).join('')}</div><div class="muted" style="font-size:12px;margin-top:6px">Tickets ${Math.ceil(S.tickets[0])} · K ${S.stats.kills} / D ${S.stats.deaths}</div>`;
  el.querySelectorAll('[data-dep]').forEach(b => b.onclick = () => BT.deploy(opts[+b.dataset.dep][1]));
};
BT.deploy = function (at) {
  const S = BT.st, P = Game.player, W = G.E.world;
  const p = spotNear(W, at.x, at.z, at === S.hq[0] ? 12 : 10);
  P.pos.copy(p); P.vel.set(0, 0, 0); P.hp = 100; P.alive = true; P.armorState = G.newArmorState(); P.hideVM = false; P.yaw = Math.atan2(-(0 - p.x), -(-S.Mp.B - p.z)); P.pitch = 0; P.stance = 0;
  for (const w of P.weapons) { w.mag = w.S.mag; w.reserve = w.S.mag * 6; }
  if (P.expl) for (const k in P.expl.counts) P.expl.counts[k] = Math.max(P.expl.counts[k], 2);
  P.spawnProt = 2; P.hudDirty = true; S.dead = false;
  const el = document.getElementById('deploy'); if (el) el.style.display = 'none';
  Game.lootOpen = false; G.Input.lock();
};
BT.end = function () {
  const S = BT.st; if (S.done) return; S.done = true; Game.state = 'end';
  const el = document.getElementById('deploy'); if (el) el.style.display = 'none'; Game.lootOpen = false;
  const win = S.tickets[0] === S.tickets[1] ? null : S.tickets[0] > S.tickets[1] ? 0 : 1, esc = G.UI.esc;
  setTimeout(() => {
    G.Input.unlock();
    const top = t => Game.bots.filter(b => b.team === t).sort((a, b) => b.kills - a.kills).slice(0, 5);
    const P = Game.player;
    G.UI.overlay(`<div class="dialog" style="width:min(720px,100%)"><div class="eyebrow">${esc(S.Mp.n)} · ${esc(G.ERA[S.cfg.era].name)} · ${S.cfg.size} v ${S.cfg.size}</div><h2 style="color:${win === 0 ? '#a6d98a' : win === 1 ? '#ec8a7a' : '#e6c572'}">${win === 0 ? 'Victory' : win === 1 ? 'Defeat' : 'Draw'}</h2>
      <dl class="spec">${[['Tickets', `${Math.ceil(S.tickets[0])} — ${Math.ceil(S.tickets[1])}`], ['Time', mmss(S.t)], ['Your kills / deaths', `${S.stats.kills} / ${S.stats.deaths}`], ['Points captured with you', S.stats.caps], ['Accuracy', Game.stats.shots ? Math.round(Game.stats.hits / Game.stats.shots * 100) + '%' : '—'], ['Points held at the end', `${S.flags.filter(f => f.owner === 0).length} — ${S.flags.filter(f => f.owner === 1).length}`]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">${[0, 1].map(t => `<div><div class="eyebrow" style="color:${TEAM[t].col}">${TEAM[t].n} — top soldiers</div>${(t === 0 ? [{ name: 'You', kills: S.stats.kills, deaths: S.stats.deaths }] : []).concat(top(t)).sort((a, b) => b.kills - a.kills).slice(0, 5).map(b => `<div style="font-size:13px">${esc(b.name)} · ${b.kills} / ${b.deaths}</div>`).join('')}</div>`).join('')}</div>
      <div class="btns"><button class="btn primary" id="bt-again">Fight again</button><button class="btn" id="bt-setup">Battle setup</button><button class="btn" id="bt-menu">Main menu</button></div></div>`);
    const out = to => { G.UI.closeOverlay(); Game.cleanup(); BT.st = null; Game.player = null; G.UI.show(to); };
    document.getElementById('bt-again').onclick = () => { G.UI.closeOverlay(); G.UI.loading('Deploying…', () => BT.start(S.cfg)); };
    document.getElementById('bt-setup').onclick = () => out('battle');
    document.getElementById('bt-menu').onclick = () => out('menu');
  }, 1600);
};

// ------------------------------------------------------------------ HUD
BT.hud = function () {
  let el = document.getElementById('bthud');
  if (!el) { el = document.createElement('div'); el.id = 'bthud'; el.style.cssText = 'position:absolute;left:50%;top:12px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none;text-shadow:0 1px 3px #000'; document.getElementById('hud').appendChild(el); }
  const sc = document.getElementById('score'); if (sc) sc.style.display = 'none';
  let f = document.getElementById('btfeed'); if (!f) { f = document.createElement('div'); f.id = 'btfeed'; f.style.cssText = 'position:absolute;right:22px;top:18px;display:flex;flex-direction:column;gap:3px;align-items:flex-end;font:14px var(--f-ui,sans-serif);pointer-events:none'; document.getElementById('hud').appendChild(f); }
  const fd = document.getElementById('feed'); if (fd) fd.style.display = 'none';
};
BT.hudTick = function () {
  const S = BT.st, el = document.getElementById('bthud'); if (!el || Game.frame % 5) return;
  const P = Game.player, here = S.flags.find(f => P.alive && Math.hypot(P.pos.x - f.pos.x, P.pos.z - f.pos.z) < f.r);
  const fl = S.flags.map(f => { const c = f.owner === null ? '#d8d8d8' : TEAM[f.owner].col, hot = f.n[0] && f.n[1]; return `<span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border:2px solid ${c};color:${c};font:700 14px var(--f-ui,sans-serif);border-radius:3px;background:rgba(0,0,0,.45);${hot ? 'box-shadow:0 0 8px #ffd04a' : ''}">${f.id}</span>`; }).join(' ');
  el.innerHTML = `<div style="display:flex;gap:16px;align-items:center;font:700 28px var(--f-ui,sans-serif)"><span style="color:${TEAM[0].col}">${Math.ceil(S.tickets[0])}</span><span style="font:13px var(--f-mono,monospace);color:#e8e2cc;background:rgba(0,0,0,.4);padding:3px 8px">${mmss(Math.max(0, S.limit - S.t))}</span><span style="color:${TEAM[1].col}">${Math.ceil(S.tickets[1])}</span></div><div style="margin-top:28px">${fl}</div>${here ? `<div style="font:600 14px var(--f-ui,sans-serif);color:#ffe28a">${here.owner === 0 && Math.abs(here.p) >= 1 && !here.n[1] ? `Holding ${here.id}` : `${here.n[1] && here.n[0] ? 'Contesting' : 'Capturing'} ${here.id} · ${Math.round(Math.abs(here.p) * 100)}% ${here.p >= 0 ? 'blue' : 'red'} · ${here.n[0]} v ${here.n[1]}`}</div>` : ''}`;
  if (BT.feedDirty || Game.frame % 30 === 0) { BT.feedDirty = false; const f = document.getElementById('btfeed'); if (f) f.innerHTML = Game.killfeed.slice(0, 7).map(k => `<div style="background:rgba(0,0,0,.45);padding:3px 8px"><span style="color:${k.kt >= 0 ? TEAM[k.kt].col : '#ccc'}">${G.UI.esc(k.k)}</span><span style="color:#999;font:11px var(--f-mono,monospace);margin:0 6px">${G.UI.esc(k.w)}${k.head ? ' ✛' : ''}</span><span style="color:${TEAM[k.vt] ? TEAM[k.vt].col : '#ccc'}">${G.UI.esc(k.v)}</span></div>`).join(''); }
};

// ------------------------------------------------------------------ hooks
const upd0 = Game.update;
Game.update = function (dt, now) {
  const r = upd0.apply(this, arguments);
  if (Game.mode === 'battle' && BT.st && Game.state === 'play') BT.update(dt);
  if (Game.mode === 'battle' && BT.st && Game.state === 'end') for (const j of BT.st.jets) j.m.position.addScaledVector(j.dir, j.v * dt);
  return r;
};
// spawn points for respawning bots: a held point near the action (not under attack) or the HQ
const sp0 = Game.spawnPoint;
Game.spawnPoint = function (team) {
  const S = BT.st; if (Game.mode !== 'battle' || !S) return sp0.apply(this, arguments);
  const held = S.flags.filter(f => f.owner === team && !f.n[1 - team]);
  const at = held.length && Math.random() < .65 ? pick(held).pos : S.hq[team];
  return spotNear(G.E.world, at.x, at.z, at === S.hq[team] ? 16 : 12);
};
const clean0 = Game.cleanup;
Game.cleanup = function () {
  if (BT.st) { for (const j of BT.st.jets) G.E.scene.remove(j.m); }
  for (const id of ['deploy', 'bthud', 'btfeed']) { const e = document.getElementById(id); if (e) e.remove(); }
  if (Game.mode === 'battle') Game.lootOpen = false;
  return clean0.apply(this, arguments);
};

// ------------------------------------------------------------------ lobby
BT.cfg = (() => { try { return Object.assign({ map: 'ruins', era: 'now', tod: 'day', size: 20, tier: 'regular', tickets: 400 }, JSON.parse(localStorage.getItem('ironsight.battle') || '{}')); } catch (e) { return { map: 'ruins', era: 'now', tod: 'day', size: 20, tier: 'regular', tickets: 400 }; } })();
BT.render = function (root) {
  Game.mode = 'menu';
  const C = BT.cfg, esc = G.UI.esc, M = G.UI.mis;
  const opts = (filter, cur) => G.armoryTypes().map(t => { const ws = G.WEAPONS.filter(w => G.typeOf(w) === t.id && filter(w)).sort(G.byAge); return ws.length ? `<optgroup label="${esc(t.name)}">${ws.map(w => `<option value="${w.id}" ${w.id === cur ? 'selected' : ''}>${esc(w.n)} (${w.y})</option>`).join('')}</optgroup>` : ''; }).join('');
  root.innerHTML = `<section class="screen" id="battle"><div class="setup">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><div class="eyebrow">Conquest · ${C.size} v ${C.size}</div><h1>Mass battlefield</h1></div><button class="btn small" id="back">Main menu</button></div>
    <div><span class="lbl">Battlefield</span><div class="row">${G.BATTLE_MAPS.map(m => `<button class="card ${m.id === C.map ? 'on' : ''}" data-bm="${m.id}"><small>${m.B * 2} m · 5 points</small><b>${esc(m.n)}</b><span>${esc(m.d)}</span></button>`).join('')}</div></div>
    <div><span class="lbl">War (both armies use that era's real weapons and uniforms)</span><div class="row">${G.ERAS.filter(e => !e.custom && !e.noWar).map(e => `<button class="card ${e.id === C.era ? 'on' : ''}" data-be="${e.id}"><b>${esc(e.name)}</b></button>`).join('')}</div></div>
    <div><span class="lbl">Army size</span><div class="row">${[[12, 'Skirmish'], [20, 'Battle'], [32, 'Total war (heavy on slower PCs)']].map(([n, t]) => `<button class="card ${C.size === n ? 'on' : ''}" data-bs="${n}"><small>${n * 2} soldiers</small><b>${n} v ${n}</b><span>${t}</span></button>`).join('')}</div></div>
    <div><span class="lbl">Soldier quality</span><div class="row">${G.TIERS.map(t => `<button class="card ${C.tier === t.id ? 'on' : ''}" data-bt="${t.id}"><b>${t.n}</b></button>`).join('')}<button class="card ${C.tier === 'mixed' ? 'on' : ''}" data-bt="mixed"><b>Mixed</b></button></div></div>
    <div><span class="lbl">Time of day · tickets</span><div class="row">${Object.entries(G.TOD).map(([k, t]) => `<button class="card ${k === C.tod ? 'on' : ''}" data-bd="${k}"><b>${t.n}</b></button>`).join('')}${[250, 400, 700].map(n => `<button class="card ${C.tickets === n ? 'on' : ''}" data-bk="${n}"><small>Tickets</small><b>${n}</b></button>`).join('')}</div></div>
    <div class="loadrow">
      <div><span class="lbl">Primary</span><div class="pick"><select id="bprim">${opts(w => w.c !== 'PST', M.primary)}</select><button class="btn small" data-cust="prim">Customise</button></div></div>
      <div><span class="lbl">Sidearm</span><div class="pick"><select id="bsec">${opts(w => w.c === 'PST', M.secondary)}</select><button class="btn small" data-cust="sec">Customise</button></div></div>
      <div><span class="lbl">Your kit</span><div class="pick"><span class="muted" style="font-size:13px">${esc(G.GEARID[G.Kit.current.helmet].n)} · ${esc(G.GEARID[G.Kit.current.armor].n)}</span><button class="btn small" id="bkit">Kit locker</button></div></div>
    </div>
    <div class="deploy"><span class="muted" style="max-width:64ch">Stand in a point's ring to capture it — more soldiers capture faster. Deaths cost tickets, and the side holding fewer points bleeds them. Expect artillery (listen for the whistle), mortars and jets. Friendlies wear a blue chevron; M shows the points, friendlies and spotted enemies. After a death, pick where to redeploy.</span><button class="btn primary" id="bgo" style="font-size:20px;padding:14px 36px">Deploy</button></div>
  </div></section>`;
  const re = () => { try { localStorage.setItem('ironsight.battle', JSON.stringify(C)); } catch (e) {} BT.render(root); };
  const on = (sel, k, f = v => v) => root.querySelectorAll(`[${sel}]`).forEach(b => b.onclick = () => { C[k] = f(b.getAttribute(sel)); G.Audio.ui(); re(); });
  on('data-bm', 'map'); on('data-be', 'era'); on('data-bs', 'size', Number); on('data-bt', 'tier'); on('data-bd', 'tod'); on('data-bk', 'tickets', Number);
  root.querySelector('#bprim').onchange = e => { M.primary = e.target.value; G.UI.store.set('mis', M); };
  root.querySelector('#bsec').onchange = e => { M.secondary = e.target.value; G.UI.store.set('mis', M); };
  root.querySelectorAll('[data-cust]').forEach(b => b.onclick = () => { const id = b.dataset.cust === 'prim' ? M.primary : M.secondary; G.UI.sel.era = G.WEAPON[id].e; G.UI.sel.wp = id; G.UI.show('armory'); });
  root.querySelector('#bkit').onclick = () => G.UI.show('kit');
  root.querySelector('#back').onclick = () => G.UI.show('menu');
  root.querySelector('#bgo').onclick = () => {
    const p = G.WEAPON[M.primary] && G.WEAPON[M.primary].c !== 'PST' ? G.WEAPON[M.primary] : G.WEAPON.m4a1, s = G.WEAPON[M.secondary] && G.WEAPON[M.secondary].c === 'PST' ? G.WEAPON[M.secondary] : G.WEAPON.glock19;
    const cfg = Object.assign({}, C, { primary: { wp: p, L: G.UI.loadoutFor(p) }, secondary: { wp: s, L: G.UI.loadoutFor(s) } });
    G.Audio.init(); G.UI.loading('Deploying to the front…', () => BT.start(cfg));
  };
};
})();
