// ============================================================================
// Explosives: hand grenades (fragmentation, impact, stun, smoke, incendiary),
// thrown and placed demolition charges, and a directional mine.
//   3 – throw / place the selected explosive (press again with a charge selected to detonate placed charges)
//   4 – cycle explosive type
// Smoke clouds block line of sight for hostiles; flashbangs blind and deafen them
// (and you, if you look at the flash); fire burns anyone standing in it.
// ============================================================================
'use strict';
(function () {
const G = window.G, Game = G.Game, PI = Math.PI;
const { gBox, gCyl, gCylY, gSph, gRBox } = G.geo;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// kind: frag (timed), impact, stun, smoke, fire, charge (placed, remote), mine (placed, proximity)
G.EXPLOSIVES = [
  { id: 'm67', n: 'M67 fragmentation grenade', co: 'United States', y: 1968, kind: 'frag', fuse: 4.5, r: 9, dmg: 170, v: 15, look: 'egg', col: '#4b5234', d: 'Steel-bodied baseball grenade, 4–5 s fuse, lethal radius about 5 m and casualties out to 15 m.' },
  { id: 'mk2', n: 'Mk 2 "pineapple"', co: 'United States', y: 1918, kind: 'frag', fuse: 4.5, r: 9, dmg: 160, v: 14, look: 'pine', col: '#5a6040' },
  { id: 'f1', n: 'F1 "limonka"', co: 'Soviet Union', y: 1941, kind: 'frag', fuse: 3.6, r: 10, dmg: 175, v: 14, look: 'pine', col: '#4d563b' },
  { id: 'rgd5', n: 'RGD-5', co: 'Soviet Union', y: 1954, kind: 'frag', fuse: 3.6, r: 8, dmg: 150, v: 16, look: 'egg', col: '#4a5236' },
  { id: 'mills', n: 'Mills bomb No. 36', co: 'United Kingdom', y: 1915, kind: 'frag', fuse: 4, r: 9, dmg: 160, v: 14, look: 'pine', col: '#5b5a40' },
  { id: 'm24', n: 'Stielhandgranate M24', co: 'Germany', y: 1924, kind: 'frag', fuse: 4.5, r: 7, dmg: 145, v: 19, look: 'stick', col: '#55594c', d: 'The long handle throws farther; mostly blast rather than fragments.' },
  { id: 'rgo', n: 'RGO impact grenade', co: 'Russia', y: 1985, kind: 'impact', fuse: 4, arm: .8, r: 9, dmg: 170, v: 15, look: 'pine', col: '#3e4630', d: 'Dual fuze: bursts on impact once armed (after ~1 s), or on its timer.' },
  { id: 'm84', n: 'M84 stun grenade', co: 'United States', y: 1995, kind: 'stun', fuse: 1.6, r: 12, dmg: 6, v: 15, look: 'can', col: '#3a3d34', d: 'Flash-bang: blinds and deafens hostiles who see it for several seconds.' },
  { id: 'm18', n: 'M18 smoke grenade', co: 'United States', y: 1942, kind: 'smoke', fuse: 1.8, r: 6, life: 30, v: 14, look: 'can', col: '#556048', d: 'Thick screening smoke for about 30 s. Hostiles cannot see through it.' },
  { id: 'an_m14', n: 'AN-M14 thermite incendiary', co: 'United States', y: 1943, kind: 'fire', fuse: 2, r: 2.6, life: 9, dps: 30, v: 14, look: 'can', col: '#6a6a5a' },
  { id: 'molotov', n: 'Molotov cocktail', co: 'Various', y: 1939, kind: 'fire', impact: true, r: 3.6, life: 10, dps: 26, v: 13, look: 'bottle', col: '#3e6a3e', d: 'Bursts into flame wherever it smashes.' },
  { id: 'dynamite', n: 'Dynamite bundle', co: 'Various', y: 1915, kind: 'frag', fuse: 5, r: 10, dmg: 230, v: 12, look: 'dynamite', col: '#b0302a' },
  { id: 'rkg3', n: 'RKG-3 anti-tank grenade', co: 'Soviet Union', y: 1950, kind: 'impact', fuse: 6, arm: .5, r: 6, dmg: 300, v: 12, look: 'stick', col: '#4d563b', d: 'Shaped-charge grenade — enormous punch over a small radius, bursts on impact.' },
  { id: 'tnt', n: 'TNT demolition block', co: 'Various', y: 1914, kind: 'charge', r: 11, dmg: 260, look: 'block', col: '#c2b48a' },
  { id: 'c4', n: 'C4 (M112 block)', co: 'United States', y: 1960, kind: 'charge', r: 12, dmg: 300, look: 'block', col: '#4b5234', d: 'Place it, then press 3 again to detonate every charge you have placed.' },
  { id: 'satchel', n: 'Satchel charge', co: 'Various', y: 1942, kind: 'charge', r: 14, dmg: 320, look: 'satchel', col: '#6a6650' },
  { id: 'claymore', n: 'M18A1 Claymore', co: 'United States', y: 1960, kind: 'mine', r: 30, dmg: 260, look: 'claymore', col: '#4b5234', d: 'Directional mine: 700 steel balls in a 60° arc. Fires when a hostile walks into its front, or when you detonate it.' },
];
G.EXPLOSIVE = Object.fromEntries(G.EXPLOSIVES.map(e => [e.id, e]));

// ---------------------------------------------------------------- models
const MC = {};
const m = (c, r = .6, mt = .2) => MC[c + r + mt] || (MC[c + r + mt] = G.mat({ color: c, roughness: r, metalness: mt }));
G.explosiveMesh = function (E) {
  const g = new THREE.Group(), body = m(E.col), dk = m('#2a2a26', .5, .6), add = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  switch (E.look) {
    case 'egg': add(gSph(.032, 12), body, 0, 0, 0).scale.set(1, 1.15, 1); add(gCylY(.011, .013, .022, 10), dk, 0, .04, 0); add(gBox(.006, .05, .012), dk, .02, .02, 0).rotation.z = -.3; break;
    case 'pine': { const b = add(gSph(.03, 12), body, 0, 0, 0); b.scale.set(1, 1.35, 1); for (let i = -1; i <= 1; i++) add(gCylY(.031, .031, .004, 12), m(E.col, .8, .1), 0, i * .016, 0); add(gCylY(.01, .012, .02, 10), dk, 0, .048, 0); add(gBox(.006, .05, .012), dk, .02, .02, 0).rotation.z = -.3; break; }
    case 'stick': add(gCylY(.034, .034, .075, 14), body, 0, .1, 0); add(gCylY(.013, .013, .24, 10), m('#8a6a44', .8, 0), 0, -.05, 0); add(gCylY(.016, .016, .01, 10), dk, 0, -.17, 0); break;
    case 'can': add(gCylY(.03, .03, .11, 14), body, 0, 0, 0); add(gCylY(.012, .014, .025, 10), dk, 0, .065, 0); add(gBox(.006, .07, .012), dk, .03, .02, 0); add(gCylY(.031, .031, .012, 14), m('#c8c0a0', .8, 0), 0, .02, 0); break;
    case 'bottle': add(gCylY(.035, .035, .14, 12), new THREE.MeshStandardMaterial({ color: G.col(E.col), roughness: .1, metalness: .1, transparent: true, opacity: .75 }), 0, 0, 0); add(gCylY(.012, .03, .05, 10), m(E.col, .1, .1), 0, .09, 0); add(gBox(.025, .06, .02), m('#d8d0b8', 1, 0), 0, .13, 0).rotation.z = .3; break;
    case 'dynamite': for (let i = 0; i < 5; i++) add(gCylY(.016, .016, .2, 10), body, Math.cos(i * 1.26) * .022, 0, Math.sin(i * 1.26) * .022); add(gCylY(.04, .04, .03, 12), m('#2a2a2a', .9, 0), 0, .02, 0); add(gCylY(.002, .002, .08, 4), dk, 0, .13, 0); break;
    case 'block': add(gRBox(.05, .05, .27, .004), body, 0, 0, 0); add(gBox(.052, .01, .27), m('#8a8a7a', .9, 0), 0, .02, 0); add(gCylY(.004, .004, .04, 6), dk, 0, .04, .08); break;
    case 'satchel': add(gRBox(.24, .16, .1, .02), body, 0, 0, 0); add(gBox(.04, .3, .012), m('#4a4836', .9, 0), 0, .1, .056); break;
    case 'claymore': { const b = add(gRBox(.22, .085, .035, .006), body, 0, .1, 0); b.rotation.x = -.05; for (const s of [-1, 1]) { add(gBox(.004, .1, .004), dk, s * .08, .04, -.01).rotation.z = s * .25; add(gBox(.004, .1, .004), dk, s * .08, .04, .01).rotation.z = s * .25; } add(gBox(.12, .016, .002), m('#c8c0a0', .9, 0), 0, .13, -.019); break; }
  }
  return g;
};

// ---------------------------------------------------------------- world state
Game.ord = []; Game.smokes = []; Game.fires = []; Game.flashT = 0;
const prevCleanup = Game.cleanup;
Game.cleanup = function (...a) { for (const o of Game.ord) if (o.m.parent) o.m.parent.remove(o.m); Game.ord = []; Game.smokes = []; Game.fires = []; Game.flashT = 0; return prevCleanup.apply(this, a); };
// throw a grenade (vel) or place a charge (vel = null)
Game.throwExp = function (id, from, vel, owner, face) {
  const E = G.EXPLOSIVE[id] || G.EXPLOSIVE.m67, mesh = G.explosiveMesh(E); mesh.position.copy(from); if (face !== undefined) mesh.rotation.y = face; G.E.scene.add(mesh);
  const o = { E, m: mesh, v: vel ? vel.clone() : null, owner, t: 0, placed: !vel, warned: false, yaw: face || 0 };
  Game.ord.push(o); if (vel && G.Audio.mech) G.Audio.mech('ping', from);
  return o;
};
// hostiles throw their own grenades through the same system
Game.throwFrag = function (p, v, owner) { const ids = owner && owner.role && owner.role.id === 'leader' ? ['m67', 'f1'] : ['rgd5', 'f1', 'rgd5']; return Game.throwExp(ids[Math.floor(Math.random() * ids.length)], p, v, owner); };
Game.updateFrags = function () {}; // superseded by updateOrdnance

// segment vs smoke clouds: true if the line of sight passes through dense smoke
Game.smokeBlocks = function (a, b) {
  for (const s of Game.smokes) { if (s.t < 1.2) continue; const r = s.r * Math.min(1, (s.t - 1) / 3) * (s.t > s.life - 4 ? (s.life - s.t) / 4 : 1); if (r < .5) continue;
    const ab = b.clone().sub(a), L = ab.length(); ab.divideScalar(L); const t = Math.max(0, Math.min(L, s.p.clone().sub(a).dot(ab))); if (a.clone().addScaledVector(ab, t).distanceTo(s.p) < r) return true; }
  return false;
};

function detonate(o) {
  const E = o.E, p = o.m.position.clone().setY(o.m.position.y + .05);
  if (o.m.parent) o.m.parent.remove(o.m);
  switch (E.kind) {
    case 'frag': case 'impact': case 'charge': Game.explode(p, o.owner, { r: E.r, dmg: E.dmg, name: E.n }); break;
    case 'mine': { // directional: everything in a 60° cone in front, out to E.r metres
      G.FX.explosion(p, 2); G.Audio.explosion(p); const f = V3(-Math.sin(o.yaw), 0, -Math.cos(o.yaw)), team = o.owner ? o.owner.team : -1;
      for (const a of Game.agents) { if (!a.alive || (a.team === team && a !== o.owner)) continue; const to = a.pos.clone().sub(p); const d = to.length(); if (d > E.r) continue; to.y = 0; if (d > 1.5 && to.normalize().dot(f) < Math.cos(PI / 6)) continue; if (!G.E.world.los(p.clone().setY(p.y + .3), a.eye)) continue;
        a.damage({ dmg: E.dmg * Math.max(.15, 1 - d / E.r), pen: 2, owner: o.owner, weapon: { n: E.n }, team }, 'chest', 1, f, a.pos); }
      break; }
    case 'stun': {
      G.FX.explosion(p, .6); G.Audio.explosion(p);
      for (const b of Game.bots) { if (!b.alive) continue; const d = b.pos.distanceTo(p); if (d > E.r || !G.E.world.los(p.clone().setY(p.y + .3), b.eye)) continue; b.stunT = Math.max(b.stunT || 0, 5.5 * (1 - d / E.r) + 1.5); b.targetVisible = false; b.sus = .5; }
      const P = Game.player; if (P && P.alive) { const d = P.pos.distanceTo(p); if (d < E.r * 1.5 && G.E.world.los(p.clone().setY(p.y + .3), P.eye)) { const look = V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), to = p.clone().sub(P.pos).setY(0).normalize(); Game.flashT = Math.max(Game.flashT, (1 - d / (E.r * 1.5)) * (to.dot(look) > .2 ? 4.5 : 1.5) * ((P.km && P.km.flash) || 1)); } }
      for (const a of Game.agents) { const d = a.pos.distanceTo(p); if (a.alive && d < 2.5 && !(a === Game.player && a.god)) a.damage({ dmg: E.dmg, pen: 1, owner: o.owner, weapon: { n: E.n } }, 'chest', 1, V3(0, 0, 1), a.pos); }
      break; }
    case 'smoke': Game.smokes.push({ p: p.clone(), r: E.r, t: 0, life: E.life, col: E.col }); if (G.Audio.impact) G.Audio.impact(p, 'metal', false); break;
    case 'fire': Game.fires.push({ p: p.clone(), r: E.r, t: 0, life: E.life, dps: E.dps, owner: o.owner, n: E.n }); if (G.Audio.impact) G.Audio.impact(p, 'glass', true); break;
  }
}
Game.detonateCharges = function (owner) { let n = 0; for (const o of Game.ord.slice()) if (o.placed && o.owner === owner && (o.E.kind === 'charge' || o.E.kind === 'mine')) { Game.ord.splice(Game.ord.indexOf(o), 1); detonate(o); n++; } return n; };

Game.updateOrdnance = function (dt) {
  const W = G.E.world, P = Game.player;
  for (let i = Game.ord.length - 1; i >= 0; i--) {
    const o = Game.ord[i], E = o.E; o.t += dt;
    if (o.v) { // flight: gravity, bounce off geometry, roll to a stop
      const a = o.m.position.clone(); o.v.y -= 9.81 * dt; const step = o.v.clone().multiplyScalar(dt), L = step.length(); let hit = false;
      if (L > 1e-5) { const h = W.raycast(a, step.clone().normalize(), L + .05);
        if (h) { hit = true; const n = h.n, vn = n.clone().multiplyScalar(o.v.dot(n)); o.v.sub(vn.multiplyScalar(1.45)).multiplyScalar(.5); o.m.position.copy(h.p).addScaledVector(n, .05); } else o.m.position.add(step); }
      const gy = W.groundAt(o.m.position.x, o.m.position.z, o.m.position.y + .3, .05);
      if (o.m.position.y < gy + .04) { o.m.position.y = gy + .04; if (o.v.y < -1.5) hit = true; if (o.v.y < 0) o.v.y = -o.v.y * .3; o.v.x *= Math.pow(.04, dt); o.v.z *= Math.pow(.04, dt); }
      if (o.v.lengthSq() > .2) { o.m.rotation.x += o.v.z * dt * 6; o.m.rotation.z -= o.v.x * dt * 6; }
      if (hit && (E.impact || (E.kind === 'impact' && o.t > (E.arm || .5)))) { Game.ord.splice(i, 1); detonate(o); continue; }
    }
    if (P && P.alive && !o.warned && o.v && o.owner !== P && o.t > .4 && o.m.position.distanceTo(P.pos) < 9 && (E.kind === 'frag' || E.kind === 'impact')) { o.warned = true; Game.toast('⚠ GRENADE!', 1.6); }
    if (E.kind === 'mine' && o.placed && o.t > 2) { // proximity: a hostile in the front arc within 6 m
      const f = V3(-Math.sin(o.yaw), 0, -Math.cos(o.yaw)); for (const a of Game.agents) { if (!a.alive || (o.owner && a.team === o.owner.team)) continue; const to = a.pos.clone().sub(o.m.position); const d = to.length(); to.y = 0; if (d < 6 && to.normalize().dot(f) > Math.cos(PI / 5)) { Game.ord.splice(i, 1); detonate(o); break; } }
      continue; }
    if (!o.placed && E.fuse && o.t > E.fuse) { Game.ord.splice(i, 1); detonate(o); }
  }
  // smoke screens
  for (let i = Game.smokes.length - 1; i >= 0; i--) { const s = Game.smokes[i]; s.t += dt; if (s.t > s.life) { Game.smokes.splice(i, 1); continue; }
    const k = Math.min(1, s.t / 3) * (s.t > s.life - 4 ? (s.life - s.t) / 4 : 1);
    for (let j = 0; j < 3; j++) if (Math.random() < .9) G.FX.smoke.spawn({ x: s.p.x + (Math.random() - .5) * s.r * k, y: s.p.y + .3 + Math.random() * 1.2, z: s.p.z + (Math.random() - .5) * s.r * k, vx: (Math.random() - .5) * .6, vy: .3 + Math.random() * .4, vz: (Math.random() - .5) * .6, life: 4 + Math.random() * 3, s0: 1.2, s1: 3.6 + s.r * .3, r: .78, g: .8, b: .78, a: .55, drag: .3, fadeIn: .2 }); }
  // fires
  for (let i = Game.fires.length - 1; i >= 0; i--) { const f = Game.fires[i]; f.t += dt; if (f.t > f.life) { Game.fires.splice(i, 1); continue; }
    for (let j = 0; j < 3; j++) G.FX.fire.spawn({ x: f.p.x + (Math.random() - .5) * f.r * 1.4, y: f.p.y + .1, z: f.p.z + (Math.random() - .5) * f.r * 1.4, vx: 0, vy: 1 + Math.random() * 1.5, vz: 0, life: .5 + Math.random() * .4, s0: .5, s1: 1.2, r: 1, g: .55 + Math.random() * .25, b: .2, drag: .1 });
    if (Math.random() < .3) G.FX.smoke.spawn({ x: f.p.x, y: f.p.y + 1, z: f.p.z, vx: 0, vy: 1.2, vz: 0, life: 3, s0: .8, s1: 3, r: .2, g: .2, b: .2, a: .5, drag: .2 });
    for (const a of Game.agents) { if (!a.alive || (a === P && P.god)) continue; if (Math.hypot(a.pos.x - f.p.x, a.pos.z - f.p.z) < f.r && Math.abs(a.pos.y - f.p.y) < 1.5) a.damage({ dmg: f.dps * dt * ((a.km && a.km.burn) || 1), pen: 1, owner: f.owner, weapon: { n: f.n } }, 'stomach', 1, V3(0, 1, 0), a.pos); } }
  Game.flashT = Math.max(0, Game.flashT - dt);
};

// ---------------------------------------------------------------- the player's explosives pouch
Game.playerExplosives = function (P, input) {
  if (!P || !P.alive) return;
  const X = P.expl || (P.expl = { list: Game.mode === 'range' ? G.EXPLOSIVES.map(e => e.id) : (Game.cfg && Game.cfg.explosives) || ['m67', 'm84', 'm18', 'c4'], counts: {}, sel: 0, cd: 0 });
  if (!X.init) { X.init = true; const inf = Game.mode === 'range'; for (const id of X.list) X.counts[id] = inf ? 99 : ({ charge: 2, mine: 1, smoke: 2, stun: 2, fire: 1 }[(G.EXPLOSIVE[id] || {}).kind] || 2) + ((P.km && P.km.exp) || 0); }
  X.cd -= 1 / 60;
  if (input.expNext && X.list.length) { X.sel = (X.sel + 1) % X.list.length; const E = G.EXPLOSIVE[X.list[X.sel]]; Game.toast(`${E.n} · ${X.counts[E.id]} left`, 1.3); P.hudDirty = true; }
  if (!input.expUse || X.cd > 0 || !X.list.length) return;
  const E = G.EXPLOSIVE[X.list[X.sel]];
  if ((E.kind === 'charge' || E.kind === 'mine') && Game.ord.some(o => o.placed && o.owner === P)) { const n = Game.detonateCharges(P); if (n) Game.toast(`Detonated ${n} charge${n > 1 ? 's' : ''}`, 1.2); X.cd = .4; return; }
  if (X.counts[E.id] <= 0) { Game.toast(`No ${E.n} left`, 1.2); return; }
  X.counts[E.id]--; X.cd = .9; P.hudDirty = true;
  const eye = P.eye, look = V3(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch));
  if (E.kind === 'charge' || E.kind === 'mine') { // place on the floor in front of you
    const f = V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), at = P.pos.clone().addScaledVector(f, .8); at.y = G.E.world.groundAt(at.x, at.z, P.pos.y + .6, .05) + (E.look === 'claymore' ? 0 : .03);
    Game.throwExp(E.id, at, null, P, P.yaw); Game.toast(E.kind === 'mine' ? `${E.n} armed — fires on hostiles in front of it, or press 3 to detonate` : `${E.n} placed — press 3 again to detonate`, 2);
  } else { const v = look.clone().multiplyScalar(E.v).add(V3(0, 2.4, 0)).add(P.vel.clone().multiplyScalar(.5)); Game.throwExp(E.id, eye.clone().addScaledVector(look, .5).add(V3(0, -.1, 0)), v, P); }
  if (P.startAction && !P.action) P.anim = { px: .02, py: -.08, pz: .04, rx: -.3, ry: 0, rz: .2 };
};
})();
