'use strict';
// Heist run: instantiates a site's spec — doors, loot, guards, cameras,
// civilians, drills, vaults, hacks — then runs stealth detection, pagers,
// the alarm, police assault waves, securing loot, escape and payout.

H.run = null;
const _r1 = new THREE.Vector3(), _r2 = new THREE.Vector3();

/* ---------- small models ---------- */
H.bagMesh = function (type) {
  const g = new THREE.Group(), L = H.LOOT[type];
  const body = new THREE.Mesh(H.geo.cyl(0.22, 0.22, 0.75, 12), H.mat(type === 'body' ? 0x111111 : 0x1e2226, 0.9)); body.rotation.z = Math.PI / 2; body.position.y = 0.22; g.add(body);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(H.geo.cyl(0.225, 0.225, 0.04, 12), H.mat(L.color, 0.6)); e.rotation.z = Math.PI / 2; e.position.set(s * 0.3, 0.22, 0); g.add(e); }
  const strap = new THREE.Mesh(H.geo.box(0.05, 0.25, 0.46), H.mat(0x3a3a3a, 0.8)); strap.position.set(0, 0.42, 0); g.add(strap);
  g.traverse(o => { o.castShadow = true; });
  return g;
};
H.pileMesh = function (type, n) {
  const g = new THREE.Group(), col = H.LOOT[type].color;
  const m = type === 'gold' ? H.mat(col, 0.25, 1) : type === 'diamonds' ? H.mat(col, 0.05, 0.4, { transparent: true, opacity: 0.85 }) : H.mat(col, 0.7);
  const pallet = new THREE.Mesh(H.geo.box(1.2, 0.14, 1.0), new THREE.MeshStandardMaterial({ map: H.tex.wood, roughness: 0.8 })); pallet.position.y = 0.07; g.add(pallet);
  g.userData.items = [];
  for (let i = 0; i < n; i++) {
    const stack = new THREE.Group(); stack.position.set(((i % 2) - 0.5) * 0.5, 0.14 + Math.floor(i / 2) * 0.3, 0); g.add(stack);
    for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(type === 'gold' ? H.geo.box(0.22, 0.08, 0.1) : H.geo.box(0.22, 0.1, 0.16), m); b.position.set((k % 3 - 1) * 0.16, 0.05 + Math.floor(k / 3) * 0.1, (k % 2 - 0.5) * 0.3); b.castShadow = true; stack.add(b); if (type === 'money') { const band = new THREE.Mesh(H.geo.box(0.06, 0.102, 0.162), H.mat(0xe8e0c0, 0.8)); band.position.copy(b.position); stack.add(band); } }
    g.userData.items.push(stack);
  }
  return g;
};
function propBox(x, y, z, sx, sy, sz, color, parent = H.scene, mat) { const m = new THREE.Mesh(H.geo.box(sx, sy, sz), mat || H.mat(color, 0.5, 0.3)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }

/* ---------- start ---------- */
H.startHeist = function (def, opts) {
  H.game.cleanupRun();
  const siteId = def.siteId || def.id;
  const site = H.sites[siteId], spec = site.spec;
  const run = H.run = {
    def, site, spec, diff: opts.diff || 0, assets: opts.assets || {}, crewN: opts.crew ?? 3,
    loud: false, phase: 'casing', t: 0, objs: [], doors: [], loot: [], piles: [], small: [], cams: [], lasers: [], vaults: [], drills: [], comps: [], safes: [], cases: [], paintings: [], crates: [], glass: [], destroy: [], c4: [],
    secured: {}, securedValue: 0, securedBags: 0, smallValue: 0, destroyed: 0, civKills: 0, kills: 0, pagersUsed: 0, pagerQueue: [], hostages: 0, bodies: 0,
    keycards: 0, stash: 0, cookStep: 0, cookCycle: null, mainDone: false, escapeOpen: false, alarmReason: '', policeETA: 0,
    raiseAlarm: r => H.raiseAlarm(r), assault: { phase: 'none', t: 0, wave: 0 }, spawnPts: [], group: new THREE.Group(), stealthOnly: !def.loud, loudOnly: !def.stealth, vanCars: [],
  };
  H.scene.add(run.group);
  const D = H.DIFFS[run.diff];
  const R = site.rng = H.seeded(Math.floor(Math.random() * 1e9));
  // doors
  for (const d of spec.doors) run.doors.push(makeDoor(run, d));
  // glass panes
  for (const g of spec.glass) {
    const m = new THREE.Mesh(H.geo.box(g.sx, g.sy, g.sz), H.mat(0x9ad0e0, 0.05, 0.2, { transparent: true, opacity: 0.35 })); m.position.set(g.x, g.y, g.z); run.group.add(m);
    const b = H.world.addBox(g.x, g.y, g.z, g.sx, g.sy, g.sz + 0.1, { glass: true, nonav: true });
    const o = { m, b, value: g.value || 0 }; b.glassObj = o; run.glass.push(o);
  }
  // van, secure zone
  const v = spec.van;
  const van = new H.Car('van', v.x, v.z, Math.PI / 2, { color: 0x2a2e33, static: true }); van.keep = true; van.static = true; van.runVan = true; run.vanCars.push(van);
  if (run.assets.van2) van.pos.x -= 2;
  run.secure = new THREE.Vector3(v.x + 3.2, 0, v.z);
  const zoneM = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.2, 32), new THREE.MeshBasicMaterial({ color: 0x40ff90, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  zoneM.rotation.x = -Math.PI / 2; zoneM.position.set(run.secure.x, 0.2, run.secure.z); run.group.add(zoneM); run.zoneM = zoneM;
  // police spawn points: road nodes around the site
  const C = H.city;
  for (let i = -1; i <= 2; i++) for (let j = -1; j <= 2; j++) {
    const x = (C.heistLots[siteId].i + i) * C.P, z = (C.heistLots[siteId].j + j) * C.P;
    if (x < 0 || z < 0 || x > C.SIZE || z > C.SIZE) continue;
    const d = Math.hypot(x - site.ox, z - site.oz); if (d > 50 && d < 140) run.spawnPts.push(new THREE.Vector3(x, 0, z));
  }
  // guards: scale with difficulty
  const gN = spec.guards.length ? Math.min(spec.guards.length + Math.floor(run.diff / 2), spec.guards.length + 3) : 0;
  for (let i = 0; i < gN; i++) {
    const path = spec.guards[i % spec.guards.length].map(p => ({ x: p.x + (i >= spec.guards.length ? R() * 2 - 1 : 0), z: p.z }));
    const g = new H.Npc(spec.gang ? 'thug' : 'guard', path[0].x, path[0].z, { etype: spec.gang ? 'thug' : 'guard' });
    g.patrol = path; g.pi = 1; g.state = 'patrol'; g.run = true;
  }
  if (spec.gang) run.gang = true;
  // civilians
  for (const c of spec.civs) { const n = new H.Npc('civ', c.x, c.z, { role: c.role }); n.run = true; n.keycard = c.keycard; if (c.role === 'teller' || c.role === 'clerk' || c.role === 'worker') n.yaw = Math.PI; }
  // cameras
  if (!run.assets.nocams) for (const c of spec.cams) run.cams.push(makeCam(run, c));
  // lasers
  for (const l of spec.lasers) {
    const beams = new THREE.Group();
    for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(H.geo.box(l.x1 - l.x0, 0.01, 0.01), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.7 })); b.position.set((l.x0 + l.x1) / 2, 0.3 + k * 0.55, l.z); beams.add(b); }
    run.group.add(beams); run.lasers.push({ ...l, beams, on: true });
  }
  // computers
  for (const c of spec.computers) run.comps.push(makeComputer(run, c));
  // small loot
  for (const s of spec.small) if (s.kind !== 'deposit') run.small.push(makeSmall(run, s));
  const deposit = spec.small.filter(s => s.kind === 'deposit');
  // safes
  for (const s of spec.safes) run.safes.push(makeSafe(run, s));
  // display cases
  for (const c of spec.cases) run.cases.push(makeCase(run, c));
  // paintings: mark how many are real to match the loot count
  const artN = def.loot.art || 0; let realN = 0;
  spec.paintings.forEach((p, i) => { const real = artN > 0 && realN < artN && (p.real || spec.paintings.length - i <= artN - realN); if (real) realN++; run.paintings.push(makePainting(run, p, real)); });
  // crates: put crate-sourced loot in random crates
  const crateLoot = []; for (const t of ['weapons', 'coke', 'evidence', 'gold']) if (def.loot[t] && (site.tpl === 'warehouse' || site.tpl === 'yard')) for (let i = 0; i < def.loot[t]; i++) crateLoot.push(t);
  const crates = spec.crates.map(c => makeCrate(run, c));
  crates.sort(() => R() - 0.5); crateLoot.forEach((t, i) => { if (crates[i]) crates[i].loot = t; });
  run.crates = crates;
  // vaults
  for (const v2 of spec.vaults) run.vaults.push(makeVault(run, v2, deposit));
  // keycards hidden in offices
  for (const k of spec.keycards) { if (!k.hidden || R() < 0.5) makeKeycard(run, k.x, k.z, k.y); }
  if (run.assets.inside) makeKeycard(run, site.spec.points.entrance.x - 1, site.spec.points.entrance.z, 0.9);
  // readers
  run.readers = spec.readers.map(r => makeReader(run, r));
  // destroyable props (mall)
  for (const d of spec.destroy) {
    const m = propBox(d.x, d.y, d.z, 1.4, 1.2, 0.9, d.color, run.group);
    const b = H.world.addBox(d.x, d.y, d.z, 1.4, 1.2, 0.9, { destroy: true });
    const o = { m, b, value: d.value, hp: 60 }; b.destroyObj = o; run.destroy.push(o);
  }
  // meth cook
  if (spec.cookAt) setupCook(run);
  // armored truck
  if (spec.armoredTruck) setupTruck(run);
  if (spec.parked) for (const p of spec.parked) { const c = new H.Car(H.pick(['sedan', 'suv', 'muscle']), p.x, p.z, p.ry, { static: true }); c.keep = true; run.vanCars.push(c); H.world.addBox(p.x, 0.8, p.z, 2.2, 1.6, 4.8, { carBlock: true, runTemp: true }); }
  // loot piles that exist from the start
  const lootStart = [];
  const vaultHeld = new Set(), safeHeld = new Set();
  const hasVault = run.vaults.length > 0 || !!spec.armoredTruck;
  const mainSafe = run.safes.find(s => s.main && s.bag);
  for (const t in def.loot) {
    let n = def.loot[t]; if (!n) continue;
    if (t === 'art' || t === 'server' || t === 'meth') continue;
    if ((site.tpl === 'warehouse' || site.tpl === 'yard') && ['weapons', 'coke', 'evidence', 'gold'].includes(t)) continue;
    if (site.tpl === 'jewelry' && t === 'jewelry') continue;
    if (t === 'diamonds' && run.cases.some(c => c.diamond)) continue;
    if (mainSafe && mainSafe.bag === t && !safeHeld.has(t)) { safeHeld.add(t); mainSafe.bags = n; continue; }
    if (site.tpl === 'lab' && t === 'turret') { lootStart.push({ type: t, n, at: spec.rnd, vault: true }); continue; }
    if (hasVault) { lootStart.push({ type: t, n, at: spec.vaultLoot, vault: true }); continue; }
    lootStart.push({ type: t, n, at: spec.lootRoom || spec.vaultLoot || { x: site.ox, z: site.oz } });
  }
  run.pendingVaultLoot = lootStart.filter(l => l.vault);
  let off = 0;
  for (const l of lootStart.filter(l => !l.vault)) { makePile(run, l.at.x + off, l.at.z, l.type, l.n); off += 1.5; }
  // servers via hacking
  run.serversLeft = def.loot.server || 0;
  // custom requirement
  run.needBags = Math.max(1, Math.ceil(Object.values(def.loot).reduce((a, b) => a + b, 0) * 0.3));
  if (def.destroy || def.cook) run.needBags = 0;
  // assets
  if (run.assets.ammo) H.game.placeBag('ammo', new THREE.Vector3(spec.points.entrance.x + 2, 0.2, spec.points.entrance.z + 1.5), 4);
  if (run.assets.medic) H.game.placeBag('doctor', new THREE.Vector3(spec.points.entrance.x - 2, 0.2, spec.points.entrance.z + 1.5), 2);
  if (run.assets.bags) H.P.bodyBags += 2;
  if (run.assets.pagerfix) H.P.pagers += 1;
  run.policeDelay = run.assets.delay ? 30 : 0;
  // crew bots wait at the van until things go loud
  const masks = H.save.crewMasks || [];
  for (let i = 0; i < run.crewN; i++) {
    const b = new H.Npc('bot', v.x - 2 - i * 1.2, v.z - 2.5, { mask: masks[i] || { shape: H.MASK_SHAPES[(i * 7 + 3) % H.MASK_SHAPES.length], mat: i, pat: i * 3 % 20, col: (i * 5 + 2) % 20 } });
    b.slot = i; b.name = H.CREW_NAMES[i]; b.hidden = true; b.run = true;
  }
  if (run.loudOnly) { run.phase = 'loud'; }
  run.startPos = new THREE.Vector3(spec.points.entrance.x, 0, spec.points.entrance.z + 4);
  H.nav.buildFlow(H.P.pos.x, H.P.pos.z);
  H.music.set(run.loudOnly ? 'loud' : 'stealth');
  H.ui.toast(def.name + ' — ' + D.name, 'Mask up with X when you are ready.' + (run.stealthOnly ? ' Stealth only.' : run.loudOnly ? ' Loud only.' : ''));
  return run;
};

/* ---------- doors ---------- */
function makeDoor(run, d) {
  const g = new THREE.Group(); g.position.set(d.x, 0, d.z); run.group.add(g);
  const vault = d.lock === 'vault';
  const h = d.low ? 1.1 : vault ? 2.8 : 2.5, t = vault ? 0.5 : 0.08;
  const hinge = new THREE.Group(); hinge.position.set(d.axis === 'x' ? -d.w / 2 : 0, 0, d.axis === 'z' ? -d.w / 2 : 0); g.add(hinge);
  const mat = vault ? new THREE.MeshStandardMaterial({ map: H.tex.metal, roughness: 0.25, metalness: 0.9, color: 0xc0c4c8 }) : d.lock === 'card' ? H.mat(0x8a9098, 0.4, 0.6) : new THREE.MeshStandardMaterial({ map: H.tex.wood, roughness: 0.6 });
  const leaf = new THREE.Mesh(d.axis === 'x' ? H.geo.box(d.w, h, t) : H.geo.box(t, h, d.w), mat);
  leaf.position.set(d.axis === 'x' ? d.w / 2 : 0, h / 2, d.axis === 'z' ? d.w / 2 : 0); leaf.castShadow = true; hinge.add(leaf);
  if (vault) { for (let i = 0; i < 4; i++) { const bolt = new THREE.Mesh(H.geo.cyl(0.06, 0.06, 0.3, 8), H.mat(0x707478, 0.3, 1)); bolt.rotation.x = Math.PI / 2; bolt.position.set(d.w * 0.8, 0.7 + i * 0.45, 0.3); hinge.add(bolt); } const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 20), H.mat(0x909498, 0.3, 1)); wheel.position.set(d.w / 2, 1.4, 0.3); hinge.add(wheel); }
  else { const kn = new THREE.Mesh(H.geo.sph(0.04, 6, 6), H.mat(0xd8b04a, 0.3, 1)); kn.position.set(d.axis === 'x' ? d.w - 0.12 : 0.06, 1.05, d.axis === 'z' ? d.w - 0.12 : 0.06); hinge.add(kn); }
  if (d.lock === 'card') { const pad = new THREE.Mesh(H.geo.box(0.12, 0.18, 0.05), H.mat(0x101010, 0.4, 0, { emissive: 0x300000 })); pad.position.set(d.axis === 'x' ? d.w + 0.15 : 0.15, 1.3, d.axis === 'z' ? d.w + 0.15 : 0.15); g.add(pad); }
  const box = H.world.addBox(d.x, h / 2, d.z, d.axis === 'x' ? d.w : t + 0.1, h, d.axis === 'z' ? d.w : t + 0.1, { door: true, nonav: d.lock === 'none' });
  const door = { ...d, g, hinge, box, open: false, ang: 0, h, locked: d.lock !== 'none' };
  if (door.locked) H.nav.stamp(box, 1);
  box.doorObj = door;
  if (!vault) {
    door.ia = H.game.addInteract({
      pos: new THREE.Vector3(d.x, 1.1, d.z), r: 1.8,
      label: () => door.open ? 'Close door' : door.locked ? (door.lock === 'card' ? (run.keycards > 0 ? 'Use keycard' : run.loud ? 'Place drill' : 'Needs a keycard') : (run.loud ? 'Kick door open' : 'Pick lock')) : 'Open door',
      time: () => door.open || !door.locked ? 0 : door.lock === 'card' ? (run.keycards > 0 ? 1 : 2) : (run.loud ? 2 : 4.5 * H.mod('lockpickMul') * H.mod('lockpickMul2', 1)),
      cond: () => !(door.lock === 'card' && door.locked && run.keycards <= 0 && !run.loud) && (H.P.masked || !door.locked),
      done: () => {
        if (door.locked && door.lock === 'card' && run.keycards <= 0) { makeDrill(run, new THREE.Vector3(d.x, 1.2, d.z), 30, () => openDoor(door)); return; }
        if (door.open) closeDoor(door); else openDoor(door);
      },
    });
  }
  return door;
}
function openDoor(door) {
  if (door.open) return; door.open = true; door.locked = false;
  H.world.remove(door.box); H.nav.stamp(door.box, 0);
  // re-stamp nearby walls that the door's footprint touched
  for (const b of H.world.query(door.x - 2, door.z - 2, door.x + 2, door.z + 2)) if (!b.nonav && !b.door) H.nav.stamp(b, 1);
  H.audio.tone(220, 0.15, 0.2, 'triangle', door.g.position);
}
function closeDoor(door) { if (!door.open) return; door.open = false; door.box.dead = false; H.world.add(door.box); }
H.updateDoors = function (dt) {
  const run = H.run; if (!run) return;
  for (const d of run.doors) {
    // NPCs open unlocked doors as they pass
    if (!d.open && !d.locked) for (const n of H.npcs) if (!n.dead && Math.abs(n.pos.x - d.x) < 1.4 && Math.abs(n.pos.z - d.z) < 1.4) { openDoor(d); d.autoClose = 4; break; }
    if (d.autoClose > 0) { d.autoClose -= dt; if (d.autoClose <= 0 && !H.npcs.some(n => !n.dead && Math.abs(n.pos.x - d.x) < 1.6 && Math.abs(n.pos.z - d.z) < 1.6) && Math.abs(H.P.pos.x - d.x) + Math.abs(H.P.pos.z - d.z) > 2) closeDoor(d); else if (d.autoClose <= 0) d.autoClose = 1; }
    const target = d.open ? (d.lock === 'vault' ? -1.7 : -1.45) : 0;
    d.ang = H.damp(d.ang, target, d.lock === 'vault' ? 0.8 : 6, dt);
    d.hinge.rotation.y = d.ang;
  }
};

/* ---------- interactive objects ---------- */
function makeKeycard(run, x, z, y = 0.9) {
  const m = propBox(x, y, z, 0.09, 0.01, 0.06, 0, run.group, H.mat(0xe0e0f0, 0.3, 0, { emissive: 0x202060 }));
  const ia = H.game.addInteract({ pos: new THREE.Vector3(x, y, z), r: 1.6, label: 'Take keycard', time: 0, done: () => { run.keycards++; m.visible = false; H.game.removeInteract(ia); H.ui.toast('Keycard', 'You have ' + run.keycards + ' keycard(s).'); H.audio.ui(); } });
}
function makeReader(run, r) {
  const m = propBox(r.x, r.y, r.z, 0.16, 0.24, 0.06, 0, run.group, H.mat(0x101010, 0.3, 0.2, { emissive: 0x400000 }));
  const o = { ...r, m, used: false };
  o.ia = H.game.addInteract({ pos: new THREE.Vector3(r.x, r.y, r.z), r: 1.6, label: () => run.keycards > 0 ? 'Insert keycard' : 'Needs a keycard', time: 1, cond: () => run.keycards > 0 && !o.used && H.P.masked, done: () => { o.used = true; run.keycards--; m.material = H.mat(0x101010, 0.3, 0.2, { emissive: 0x00a020 }); H.audio.beep(m.position, 1200); H.game.removeInteract(o.ia); const v = run.vaults[0]; if (v) v.cardsIn++; } });
  return o;
}
function makeSmall(run, s) {
  const g = new THREE.Group(); g.position.set(s.x, s.y, s.z); run.group.add(g);
  if (s.kind === 'register') { propBox(0, 0.08, 0, 0.4, 0.16, 0.35, 0x2a2a2a, g); propBox(0, 0.22, -0.1, 0.36, 0.12, 0.05, 0x40c060, g, H.mat(0x101010, 0.3, 0, { emissive: 0x104020 })); }
  else { for (let i = 0; i < 3; i++) propBox((i - 1) * 0.12, 0.03 + (i % 2) * 0.04, 0, 0.1, 0.04, 0.16, 0x3a6a2a, g); }
  const o = { g, value: s.value, kind: s.kind };
  o.ia = H.game.addInteract({ pos: new THREE.Vector3(s.x, s.y, s.z), r: 1.7, label: s.kind === 'register' ? 'Open register' : 'Grab cash', time: s.kind === 'register' ? 1.5 : 0.6,
    cond: () => H.P.masked || H.mod('casingLoot'),
    done: () => { H.game.addSmall(o.value); g.visible = false; H.game.removeInteract(o.ia); } });
  return o;
}
function makeSafe(run, s) {
  const g = new THREE.Group(); g.position.set(s.x, 0, s.z); run.group.add(g);
  const steel = new THREE.MeshStandardMaterial({ map: H.tex.metal, color: 0x5a6068, roughness: 0.35, metalness: 0.8 });
  propBox(0, 0.55, 0, 0.9, 1.1, 0.8, 0, g, steel);
  const dial = new THREE.Mesh(H.geo.cyl(0.08, 0.08, 0.04, 16), H.mat(0xc0c0c0, 0.2, 1)); dial.rotation.x = Math.PI / 2; dial.position.set(0, 0.7, 0.42); g.add(dial);
  const doorM = propBox(0, 0.55, 0.41, 0.8, 1.0, 0.04, 0, g, steel);
  H.world.addBox(s.x, 0.55, s.z, 0.9, 1.1, 0.8, { runTemp: true });
  const o = { ...s, g, doorM, open: false };
  const finish = () => { o.open = true; doorM.rotation.y = -1.5; doorM.position.x = -0.4; doorM.position.z = 0.8; H.game.addSmall(o.small || 3000); if (o.bag) { const n = o.bags || 1; makePile(run, s.x + 1, s.z + 1, o.bag, n); } H.game.removeInteract(o.ia); if (o.main) run.mainDone = true; };
  o.ia = H.game.addInteract({ pos: new THREE.Vector3(s.x, 0.8, s.z + 0.5), r: 1.8,
    label: () => H.mod('nimbleAce') && !run.loud ? 'Crack safe' : 'Place drill', time: () => H.mod('nimbleAce') && !run.loud ? 10 : 1.5,
    cond: () => H.P.masked && !o.drilling && !o.open,
    done: () => { if (H.mod('nimbleAce') && !run.loud) finish(); else { o.drilling = true; makeDrill(run, new THREE.Vector3(s.x, 0.8, s.z + 0.6), 55, finish); } } });
  return o;
}
function makeCase(run, c) {
  const g = new THREE.Group(); g.position.set(c.x, c.y, c.z); run.group.add(g);
  const glass = new THREE.Mesh(H.geo.box(1.5, 0.35, 0.7), H.mat(0xc0f0ff, 0.05, 0.1, { transparent: true, opacity: 0.3 })); glass.position.y = 0.0; g.add(glass);
  for (let i = 0; i < 5; i++) { const j = new THREE.Mesh(c.diamond ? new THREE.OctahedronGeometry(0.05) : H.geo.sph(0.035, 8, 6), H.mat(c.diamond ? 0xc0f0ff : H.pick([0xd8b04a, 0xe0e0e0, 0xc02a5a, 0x2a8ad0]), 0.15, 0.9)); j.position.set(-0.5 + i * 0.25, -0.12, 0); g.add(j); }
  const o = { ...c, g, glass, done: false };
  o.ia = H.game.addInteract({ pos: new THREE.Vector3(c.x, c.y, c.z + 0.4), r: 1.6, label: () => run.loud ? 'Smash case' : 'Open case', time: () => run.loud ? 0.4 : 2,
    cond: () => H.P.masked && !o.done, done: () => openCase(run, o) });
  return o;
}
function openCase(run, o) {
  if (o.done) return; o.done = true; o.glass.visible = false; H.audio.glass(o.g.position);
  o.g.children.slice(1).forEach(c => c.visible = false);
  H.game.addSmall(o.value); H.game.removeInteract(o.ia);
  if (o.diamond) makePile(run, o.x, o.z + 1, 'diamonds', run.def.loot.diamonds || 1);
  else if (run.site.tpl === 'jewelry' || run.def.loot.jewelry) {
    run.stash++;
    const target = run.def.loot.jewelry || 0, made = run.jewelBags || 0, cases = run.cases.filter(c => !c.diamond).length;
    const per = Math.max(1, Math.floor(cases / Math.max(1, target)));
    if (made < target && run.stash >= per) { run.stash = 0; run.jewelBags = made + 1; H.game.dropBag('jewelry', new THREE.Vector3(o.x, 0.3, o.z + 1)); }
  }
}
function makePainting(run, p, real) {
  const g = new THREE.Group(); g.position.set(p.x, p.y, p.z); g.rotation.y = p.ry; run.group.add(g);
  const frame = propBox(0, 0, 0, 1.6, 1.2, 0.06, 0, g, H.mat(0xb08a3a, 0.3, 0.8));
  const art = H.canvasTex(128, 96, (c, w, h) => { const hue = Math.random() * 360; c.fillStyle = `hsl(${hue},40%,40%)`; c.fillRect(0, 0, w, h); for (let i = 0; i < 30; i++) { c.fillStyle = `hsla(${hue + Math.random() * 120},60%,${30 + Math.random() * 50}%,.7)`; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 22, 0, 7); c.fill(); } }, false);
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshStandardMaterial({ map: art, roughness: 0.8 })); canvas.position.z = 0.035; g.add(canvas);
  const o = { ...p, g, canvas, real, taken: false };
  o.ia = H.game.addInteract({ pos: new THREE.Vector3(p.x + Math.sin(p.ry) * 0.6, p.y - 0.7, p.z + Math.cos(p.ry) * 0.6), r: 1.8, label: 'Cut painting', time: 3,
    cond: () => H.P.masked && !o.taken,
    done: () => { o.taken = true; canvas.visible = false; H.game.removeInteract(o.ia); if (o.real) H.game.dropBag('art', new THREE.Vector3(p.x + Math.sin(p.ry) * 1, 0.3, p.z + Math.cos(p.ry) * 1)); else H.ui.toast('Fake', 'This one is a forgery. Worthless.'); } });
  return o;
}
function makeCrate(run, c) {
  const o = { ...c, opened: false, loot: null };
  o.ia = H.game.addInteract({ pos: new THREE.Vector3(c.x, c.y, c.z), r: 1.8, label: () => o.marked ? 'Open crate (marked)' : c.container ? 'Open container' : 'Crowbar crate', time: c.container ? 3 : 2,
    cond: () => H.P.masked && !o.opened,
    done: () => { o.opened = true; H.game.removeInteract(o.ia); H.audio.noise(0.3, 400, 1, 0.5, new THREE.Vector3(c.x, 1, c.z)); if (o.loot) H.game.dropBag(o.loot, new THREE.Vector3(c.x, 0.3, c.z + 0.8)); else if (Math.random() < 0.3) H.game.addSmall(800 + Math.random() * 1500); else H.ui.toast('Empty', 'Nothing useful in here.'); if (o.mark) o.mark.visible = false; } });
  return o;
}
function makeComputer(run, c) {
  const g = new THREE.Group(); g.position.set(c.x, 0.8, c.z); run.group.add(g);
  const scr = propBox(0, 0.22, 0, 0.5, 0.34, 0.04, 0, g, H.mat(0x101820, 0.2, 0, { emissive: 0x103040 }));
  const o = { ...c, g, scr, state: 'idle', t: 0 };
  const hackTime = c.kind === 'hack' ? 70 : 0;
  o.ia = H.game.addInteract({ pos: new THREE.Vector3(c.x, 1, c.z + 0.4), r: 1.8,
    label: () => c.kind === 'security' ? (o.state === 'done' ? 'Already disabled' : c.label === 'Laser control' ? 'Disable lasers and cameras' : 'Loop cameras') : c.kind === 'manifest' ? 'Read manifest' : o.state === 'jammed' ? 'Restart hack' : o.state === 'run' ? 'Hacking…' : run.serversLeft > 0 ? 'Start hack' : 'All servers taken',
    time: () => c.kind === 'security' ? 4 : c.kind === 'manifest' ? 2 : 1.5,
    cond: () => H.P.masked && o.state !== 'done' && o.state !== 'run' && (c.kind !== 'hack' || run.serversLeft > 0),
    done: () => {
      if (c.kind === 'security') { o.state = 'done'; for (const cam of run.cams) cam.off = true; for (const l of run.lasers) { l.on = false; l.beams.visible = false; } H.ui.toast('Security', 'Cameras looped and lasers disabled.'); scr.material = H.mat(0x101820, 0.2, 0, { emissive: 0x104010 }); }
      else if (c.kind === 'manifest') { o.state = 'done'; for (const cr of run.crates) if (cr.loot && !cr.opened) { cr.marked = true; cr.mark = new THREE.Mesh(H.geo.sph(0.15, 8, 6), new THREE.MeshBasicMaterial({ color: 0x40ff90 })); cr.mark.position.set(cr.x, 3.4, cr.z); run.group.add(cr.mark); } H.ui.toast('Manifest', 'The right crates are marked.'); }
      else { o.state = 'run'; o.t = o.t || hackTime; }
    } });
  return o;
}
H.updateComputers = function (dt) {
  const run = H.run; if (!run) return;
  for (const c of run.comps) {
    if (c.kind !== 'hack' || c.state !== 'run') continue;
    c.t -= dt; c.scr.material.emissive && (c.scr.material = H.mat(0x101820, 0.2, 0, { emissive: Math.floor(H.t * 4) % 2 ? 0x2060a0 : 0x103040 }));
    if (Math.random() < dt / 22) { c.state = 'jammed'; H.ui.toast('Hack interrupted', 'Restart the hack at the ' + c.label + '.'); H.audio.beep(c.g.position, 600); }
    if (c.t <= 0) { c.state = 'idle'; c.t = 0; run.serversLeft--; const sp = run.spec.points.server || { x: c.x, z: c.z }; H.game.dropBag('server', new THREE.Vector3(sp.x + H.rand(-1, 1), 0.3, sp.z + 1)); H.ui.toast('Hack complete', 'A server is ready to carry out.'); }
  }
};
function makeCam(run, c) {
  const g = new THREE.Group(); g.position.set(c.x, c.y, c.z); run.group.add(g);
  const mount = propBox(0, 0.1, 0, 0.08, 0.2, 0.08, 0x2a2a2a, g);
  const head = new THREE.Group(); head.position.y = -0.05; g.add(head);
  propBox(0, 0, 0.12, 0.14, 0.14, 0.32, 0xd8d8d8, head);
  const lens = new THREE.Mesh(H.geo.cyl(0.04, 0.04, 0.03, 10), H.mat(0x101010, 0.1, 0.5)); lens.rotation.x = Math.PI / 2; lens.position.z = 0.29; head.add(lens);
  const led = new THREE.Mesh(H.geo.sph(0.015, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 })); led.position.set(0.05, 0.05, 0.27); head.add(led);
  const b = H.world.addBox(c.x, c.y, c.z, 0.3, 0.3, 0.3, { cam: true, nonav: true, nocollide: true });
  const o = { ...c, g, head, led, b, t: Math.random() * 6, off: false, dead: false, meter: 0 };
  b.camObj = o;
  return o;
}

/* ---------- drills ---------- */
function makeDrill(run, pos, secs, onDone) {
  const g = new THREE.Group(); g.position.copy(pos); run.group.add(g);
  propBox(0, 0, 0, 0.3, 0.3, 0.5, 0, g, H.mat(0xd8a020, 0.5));
  const bit = new THREE.Mesh(H.geo.cyl(0.02, 0.02, 0.4, 6), H.mat(0xc0c0c0, 0.2, 1)); bit.rotation.x = Math.PI / 2; bit.position.z = -0.4; g.add(bit);
  propBox(0, 0.25, 0, 0.12, 0.2, 0.12, 0x202020, g);
  const d = { g, bit, total: secs * H.mod('drillMul'), t: 0, jammed: false, onDone, pos: pos.clone(), nextJam: H.rand(14, 30) };
  d.ia = H.game.addInteract({ pos: pos.clone(), r: 1.8, label: 'Fix drill', time: () => 2.5 * H.mod('drillMul'), cond: () => d.jammed, done: () => { d.jammed = false; d.nextJam = H.rand(14, 30); } });
  run.drills.push(d);
  H.audio.beep(pos, 900);
  return d;
}
H.updateDrills = function (dt) {
  const run = H.run; if (!run) return;
  let anyRunning = null;
  for (const d of run.drills.slice()) {
    if (d.jammed) continue;
    d.t += dt; d.nextJam -= dt; d.bit.rotation.z += dt * 40; anyRunning = d;
    if (Math.random() < dt * 6) H.fx.sparks(d.pos.clone().add(new THREE.Vector3(0, 0, -0.5)), 1, 0xffcc66, 2);
    if (d.nextJam <= 0 && d.t < d.total - 3) {
      if (Math.random() < H.mod('autoRepair')) { d.nextJam = H.rand(14, 30); H.ui.toast('Drill', 'The drill fixed itself.'); }
      else { d.jammed = true; H.ui.toast('Drill jammed', 'Fix the drill.'); H.audio.beep(d.pos, 400); }
    }
    // in stealth, the noise draws nearby guards
    if (!run.loud) for (const n of H.npcs) if (n.kind === 'guard' && !n.dead && n.state === 'patrol' && n.pos.distanceTo(d.pos) < 14 && Math.random() < dt * 0.5) { n.state = 'investigate'; n.inv = { x: d.pos.x, z: d.pos.z }; n.invT = 12; }
    if (d.t >= d.total) { run.drills.splice(run.drills.indexOf(d), 1); H.game.removeInteract(d.ia); run.group.remove(d.g); H.audio.beep(d.pos, 1600); d.onDone(); }
  }
  H.audio.drill(!!anyRunning, anyRunning && anyRunning.pos);
};

/* ---------- vaults ---------- */
function makeVault(run, v, deposit) {
  const door = run.doors.find(d => d.lock === 'vault' && Math.abs(d.x - v.doorX) < 0.5 && Math.abs(d.z - v.doorZ) < 0.5);
  const o = { ...v, door, cardsNeed: v.cards || 1, cardsIn: 0, timelock: v.timelock, tlRunning: false, open: false, drilling: false, deposit };
  if (door) door.vault = o;
  o.ia = H.game.addInteract({ pos: new THREE.Vector3(v.doorX, 1.2, v.doorZ + 0.6), r: 2.2, label: 'Drill the vault door', time: 1.5,
    cond: () => run.loud && !o.open && !o.drilling && !o.tlRunning && H.P.masked,
    done: () => { o.drilling = true; makeDrill(run, new THREE.Vector3(v.doorX, 1.4, v.doorZ + 0.6), 100 + run.diff * 10, () => openVault(run, o)); } });
  return o;
}
function openVault(run, o) {
  if (o.open) return; o.open = true; o.tlRunning = false;
  if (o.door) openDoor(o.door);
  H.game.removeInteract(o.ia);
  for (const l of run.pendingVaultLoot) { const at = l.at || { x: o.doorX, z: o.doorZ - 3 }; makePile(run, at.x + (Math.random() - 0.5) * 2, at.z, l.type, l.n); }
  run.pendingVaultLoot = [];
  for (const s of o.deposit) { run.small.push(makeDeposit(run, s)); }
  H.ui.toast('Vault open', 'Bag the loot and get it to the van.');
  H.audio.tone(80, 1.5, 0.5, 'sawtooth', new THREE.Vector3(o.doorX, 1, o.doorZ), 0.5);
}
function makeDeposit(run, s) {
  const m = propBox(s.x, s.y, s.z, 0.2, 0.15, 0.1, 0, run.group, H.mat(0xc8ccd0, 0.3, 0.9));
  const o = { m, value: s.value };
  o.ia = H.game.addInteract({ pos: new THREE.Vector3(s.x, s.y, s.z), r: 1.7, label: H.mod('saw') ? 'Saw deposit box' : 'Pick deposit box', time: H.mod('saw') ? 1 / H.mod('sawSpeedMul') : 3 * H.mod('lockpickMul'), cond: () => H.P.masked,
    done: () => { H.game.addSmall(o.value); m.rotation.y = 1.2; H.game.removeInteract(o.ia); } });
  return o;
}
H.updateVaults = function (dt) {
  const run = H.run; if (!run) return;
  for (const v of run.vaults) {
    if (!v.open && !v.tlRunning && v.cardsIn >= v.cardsNeed) { v.tlRunning = true; v.tl = v.timelock; H.ui.toast('Time lock engaged', 'The vault opens in ' + v.timelock + ' seconds.'); }
    if (v.tlRunning) { v.tl -= dt; if (v.tl <= 0) openVault(run, v); }
  }
};

/* ---------- loot piles and bags ---------- */
function makePile(run, x, z, type, n) {
  const g = H.pileMesh(type, n); g.position.set(x, 0.2, z); run.group.add(g);
  const o = { g, type, n, x, z };
  o.ia = H.game.addInteract({ pos: new THREE.Vector3(x, 0.8, z), r: 1.9, label: () => 'Bag ' + H.LOOT[type].name.toLowerCase() + ' (' + o.n + ' left)', time: 2,
    cond: () => H.P.masked && !H.P.bag && o.n > 0,
    done: () => { o.n--; H.P.bag = type; const it = g.userData.items[o.n]; if (it) it.visible = false; if (o.n <= 0) H.game.removeInteract(o.ia); H.audio.noise(0.2, 900, 1, 0.3); } });
  run.piles.push(o);
  return o;
}
H.makePile = makePile;

/* ---------- meth cook ---------- */
function setupCook(run) {
  const spec = run.spec;
  run.cook = { need: null, made: 0, steps: 0, wait: 0, ready: false };
  const pick = () => { run.cook.need = H.pick(spec.ingredients).name; };
  pick();
  for (const ing of spec.ingredients) {
    const m = propBox(ing.x, 1.1, ing.z, 0.25, 0.4, 0.25, ing.name.includes('Acid') ? 0x40a0ff : ing.name.includes('Soda') ? 0xe8e8e8 : 0xf0c040, run.group);
    H.game.addInteract({ pos: new THREE.Vector3(ing.x, 1, ing.z), r: 1.6, label: 'Take ' + ing.name, time: 0.6, cond: () => H.P.masked && !H.P.holding, done: () => { H.P.holding = ing.name; } });
  }
  H.game.addInteract({ pos: new THREE.Vector3(spec.cookAt.x, 1.1, spec.cookAt.z), r: 2, label: () => H.P.holding ? 'Add ' + H.P.holding : run.cook.wait > 0 ? 'Cooking… ' + Math.ceil(run.cook.wait) + 's' : 'Needs ' + run.cook.need, time: 1,
    cond: () => !!H.P.holding && run.cook.wait <= 0,
    done: () => {
      const c = run.cook;
      if (H.P.holding === c.need) { c.steps++; H.P.holding = null; if (c.steps >= 3) { c.steps = 0; c.wait = 25; } pick(); H.audio.ui(); }
      else { H.P.holding = null; c.steps = 0; H.game.explode(new THREE.Vector3(spec.cookAt.x, 1, spec.cookAt.z), 3, 30, 'lab'); H.ui.toast('Wrong ingredient', 'The batch blew up. Start over.'); pick(); }
    } });
  if (!run.loud) H.game.alarmSoon = 40; // the neighbours call the cops
}
H.updateCook = function (dt) {
  const run = H.run; if (!run || !run.cook) return;
  const c = run.cook;
  if (c.wait > 0) { c.wait -= dt; if (Math.random() < dt * 3) H.fx.smoke(new THREE.Vector3(run.spec.cookAt.x, 1.4, run.spec.cookAt.z - 0.8), 0.6, 2, 0xc0e0ff); if (c.wait <= 0) { c.made++; H.game.dropBag('meth', new THREE.Vector3(run.spec.cookAt.x + 1.5, 0.3, run.spec.cookAt.z)); H.ui.toast('Meth ready', 'Bag ' + c.made + ' is ready.'); } }
};

/* ---------- armored truck ---------- */
function setupTruck(run) {
  const t = run.spec.armoredTruck;
  const truck = new H.Car('armored', t.x, t.z, Math.PI, { static: true }); truck.keep = true; run.vanCars.push(truck); run.truck = truck;
  H.world.addBox(t.x, 1.3, t.z, 2.6, 2.6, 6.6, { runTemp: true });
  run.c4Placed = 0;
  for (const c of run.spec.c4) {
    const o = { ...c, placed: false };
    o.ia = H.game.addInteract({ pos: new THREE.Vector3(c.x, c.y, c.z + 0.4), r: 1.6, label: 'Place C4', time: 1, cond: () => H.P.masked && !o.placed,
      done: () => { o.placed = true; run.c4Placed++; o.m = propBox(c.x, c.y, c.z + 0.02, 0.2, 0.12, 0.06, 0, run.group, H.mat(0xd8d0a0, 0.6, 0, { emissive: 0x200000 })); H.game.removeInteract(o.ia); if (run.c4Placed >= run.spec.c4.length) { run.c4Fuse = 8; H.ui.toast('C4 armed', 'Get clear! 8 seconds.'); } } });
    run.c4.push(o);
  }
}
H.updateTruck = function (dt) {
  const run = H.run; if (!run || run.c4Fuse === undefined || run.c4Fuse === null) return;
  run.c4Fuse -= dt;
  if (Math.floor(run.c4Fuse * 3) !== Math.floor((run.c4Fuse + dt) * 3)) H.audio.beep(run.truck.pos, 2000);
  if (run.c4Fuse <= 0) {
    run.c4Fuse = null;
    for (const c of run.c4) if (c.m) c.m.visible = false;
    H.game.explode(new THREE.Vector3(run.spec.c4[0].x, 1.2, run.spec.c4[0].z), 5, 200, 'c4');
    for (const l of run.pendingVaultLoot) makePile(run, run.spec.c4[0].x + H.rand(-1, 1), run.spec.c4[0].z + 2, l.type, l.n);
    run.pendingVaultLoot = []; run.mainDone = true;
    if (!run.loud) run.raiseAlarm('The explosion was heard');
  }
};

/* ---------- stealth detection ---------- */
H.updateStealth = function (dt) {
  const run = H.run, P = H.P; if (!run || run.loud) return;
  if (run.t < 1) return;
  const eye = H.camera.position;
  const site = run.site, inside = Math.abs(P.pos.x - site.ox) < site.w / 2 + 1 && Math.abs(P.pos.z - site.oz) < site.d / 2 + 1;
  const publicDepth = { bank: 0.42, jewelry: 0.6, gallery: 0.25, club: 0.6, casino: 0.55, lab: 0.25, reserve: 0.5, office: 0.45, shop: 0.6, mansion: 0, mall: 1 }[site.tpl] ?? 0;
  const restricted = inside && (P.pos.z < site.oz + site.d / 2 - site.d * publicDepth);
  const detectMul = H.lerp(0.6, 1.5, (P.detect - 3) / 72) * (P.crouching ? 0.75 : 1);
  let threat = P.masked ? 1 : restricted ? 0.4 * H.mod('casingDetectMul') : 0;
  if (P.bag && !P.masked) threat = Math.max(threat, 0.8);
  run.detectors = [];
  // guards and civilians
  for (const n of H.npcs) {
    if (!n.run || n.dead) continue;
    if (n.kind !== 'guard' && n.kind !== 'civ' && n.kind !== 'thug') continue;
    if (['tied', 'down', 'cower', 'calling', 'phone', 'flee', 'surrender', 'kneel'].includes(n.state)) { n.detect = 0; continue; }
    const d = n.pos.distanceTo(P.pos);
    let sees = false;
    if (threat > 0 && d < 26) sees = n.canSee(eye, 26, d < 3 ? -1 : 0.45);
    if (sees) {
      const rate = threat * detectMul * (d < 5 ? 2.2 : d < 12 ? 1.2 : 0.6) * (n.kind === 'civ' ? 0.9 : 1.1);
      n.detect = Math.min(1, n.detect + rate * dt);
      run.detectors.push({ pos: n.pos, v: n.detect, kind: n.kind });
      if (n.detect >= 1) {
        if (n.kind === 'guard' || n.kind === 'thug') { n.state = 'calling'; n.callT = P.masked ? 1.2 : 3; n.callReason = P.masked ? 'A guard spotted you' : 'A guard caught you trespassing'; n.face(P.pos.x, P.pos.z, 1, 1); }
        else { n.state = 'flee'; n.fleeT = H.rand(3, 6); H.audio.shout(); }
      }
    } else n.detect = Math.max(0, n.detect - dt * 0.25);
    // bodies and tied hostages
    n.bodyT = (n.bodyT || 0) - dt;
    if (n.bodyT <= 0) {
      n.bodyT = 0.4;
      for (const b of H.npcs) {
        if (b === n || !b.run) continue;
        const suspicious = (b.dead && !b.bagged) || (b.kind === 'civ' && (b.state === 'tied' || b.state === 'down') && n.kind === 'guard');
        if (!suspicious) continue;
        const bd = b.pos.distanceTo(n.pos);
        if (bd < (H.mod('cleanerAce') && n.kind === 'civ' ? 8 : 18) && n.canSee(_r1.set(b.pos.x, 0.5, b.pos.z), 18, 0.4)) {
          if (n.kind === 'guard') { n.state = 'calling'; n.callT = 2; n.callReason = b.dead ? 'A guard found a body' : 'A guard found a hostage'; }
          else { n.state = 'flee'; n.fleeT = 4; }
          break;
        }
      }
    }
  }
  // cameras
  for (const c of run.cams) {
    if (c.off || c.dead) continue;
    c.t += dt; const yaw = c.yaw + Math.sin(c.t * 0.35) * 0.65;
    c.head.rotation.y = yaw; c.head.rotation.x = 0.35;
    const ecm = H.game.ecmActive();
    if (ecm || threat <= 0) { c.meter = Math.max(0, c.meter - dt * 0.3); continue; }
    _r1.set(P.pos.x - c.x, 0, P.pos.z - c.z); const d = _r1.length();
    if (d > 20) { c.meter = Math.max(0, c.meter - dt * 0.3); continue; }
    _r1.divideScalar(d);
    const f = Math.sin(yaw) * _r1.x + Math.cos(yaw) * _r1.z;
    if (f > 0.55 && H.world.los(_r2.set(c.x, c.y - 0.2, c.z).addScaledVector(_r1, 0.4), eye)) {
      c.meter = Math.min(1, c.meter + threat * detectMul * (d < 8 ? 1.4 : 0.7) * dt);
      run.detectors.push({ pos: new THREE.Vector3(c.x, 0, c.z), v: c.meter, kind: 'cam' });
      if (c.meter >= 1) run.raiseAlarm('A camera spotted you');
    } else c.meter = Math.max(0, c.meter - dt * 0.3);
    c.led.material.color.setHex(c.meter > 0.05 ? 0xff2020 : 0x20ff40);
  }
  // lasers
  for (const l of run.lasers) {
    if (!l.on) continue;
    if (Math.abs(P.pos.z - l.z) < 0.5 && P.pos.x > l.x0 && P.pos.x < l.x1) run.raiseAlarm('You tripped a laser');
  }
  // pagers
  for (const pg of run.pagerQueue.slice()) {
    pg.t -= dt;
    if (pg.t <= 0 && !pg.answered) run.raiseAlarm('A pager went unanswered');
  }
  // timed alarm (e.g. the cook)
  if (H.game.alarmSoon > 0) { H.game.alarmSoon -= dt; if (H.game.alarmSoon <= 0) run.raiseAlarm('The neighbours called the police'); }
};

/* ---------- the alarm & police ---------- */
H.raiseAlarm = function (reason) {
  const run = H.run; if (!run || run.loud) return;
  if (run.stealthOnly) { run.loud = true; H.ui.toast('Heist failed', reason + '. This job is stealth only.'); setTimeout(() => H.game.failHeist('Alarm raised on a stealth-only job'), 2500); return; }
  run.loud = true; run.phase = 'loud'; run.alarmReason = reason;
  run.policeETA = 30 + (run.policeDelay || 0);
  H.audio.alarm(); setTimeout(() => H.audio.stopLoop('alarm'), 25000);
  H.music.set('loud');
  H.ui.toast('ALARM', reason + '. Police are on the way.');
  for (const n of H.npcs) {
    if (!n.run || n.dead) continue;
    if (n.kind === 'civ' && n.state !== 'tied' && n.state !== 'down') { n.state = 'cower'; }
    if (n.kind === 'guard') { n.state = 'combat'; n.alert = 1; }
    if (n.kind === 'bot' && n.hidden) { n.hidden = false; }
  }
  for (const pg of run.pagerQueue) pg.answered = true;
};
H.Run_raise = r => H.raiseAlarm(r);

H.updateAssault = function (dt) {
  const run = H.run; if (!run || !run.loud) return;
  const D = H.DIFFS[run.diff], A = run.assault;
  if (run.policeETA > 0) { run.policeETA -= dt; if (run.policeETA <= 0) { A.phase = 'build'; A.t = 12; } else return; }
  A.t -= dt;
  const law = H.npcs.filter(n => !n.dead && n.team === 'law' && n.kind === 'cop').length;
  const cap = Math.round((10 + run.diff * 3) * Math.min(1.6, 1 + A.wave * 0.1));
  if (A.phase === 'build' && A.t <= 0) { A.phase = 'assault'; A.wave++; A.t = 75 + A.wave * 10; A.spawnT = 0; H.music.set('assault'); H.ui.banner('POLICE ASSAULT IN PROGRESS'); H.audio.siren(true, run.spawnPts[0]); }
  if (A.phase === 'assault') {
    A.spawnT -= dt;
    if (A.spawnT <= 0 && law < cap) { A.spawnT = 4 / D.spawnMul; spawnSquad(run, A.wave); }
    if (A.t <= 0) { A.phase = 'fade'; A.t = 20; H.ui.banner(''); }
  } else if (A.phase === 'fade' && A.t <= 0) { A.phase = 'control'; A.t = 35; H.music.set('loud'); H.audio.siren(false); }
  else if (A.phase === 'control' && A.t <= 0) { A.phase = 'build'; A.t = 10; H.ui.toast('Assault incoming', 'Get ready.'); }
  // a squad trickles in during control too
  if (A.phase === 'control') { A.spawnT = (A.spawnT || 0) - dt; if (A.spawnT <= 0 && law < cap * 0.4) { A.spawnT = 12; spawnSquad(run, A.wave); } }
};
function spawnSquad(run, wave) {
  const D = H.DIFFS[run.diff], P = H.P;
  const pts = run.spawnPts.filter(p => p.distanceTo(P.pos) > 35);
  const sp = H.pick(pts.length ? pts : run.spawnPts); if (!sp) return;
  // a police cruiser or riot van parks at the spawn point
  if (!sp.car && H.cars.length < 60) { sp.car = new H.Car(wave > 2 ? 'swatvan' : 'police', sp.x + 5, sp.z + 5, Math.random() * 6, { siren: true }); sp.car.keep = true; sp.car.static = false; sp.car.parkedRun = true; run.vanCars.push(sp.car); }
  const n = H.randi(3, 5);
  const pool = wave <= 1 && run.diff < 2 ? ['cop', 'cop', 'fbi', 'swat'] : ['swat', 'swat', 'fbi', 'heavy', 'heavy', 'cop'];
  const specials = ['shield', 'taser', 'cloaker', 'medic', 'dozer'];
  for (let i = 0; i < n; i++) {
    let et = H.pick(pool);
    if (Math.random() < D.specials * (wave > 1 ? 1.3 : 0.8)) { et = H.pick(specials); if (et === 'dozer' && wave < 2 && run.diff < 3) et = 'shield'; }
    const c = new H.Npc('cop', sp.x + H.rand(-3, 3), sp.z + H.rand(-3, 3), { etype: et });
    c.run = true; c.state = 'combat';
  }
  // marksmen on nearby roofs
  if (wave >= 2 && Math.random() < 0.25 && H.npcs.filter(n => n.special === 'sniper' && !n.dead).length < 2) {
    const roofs = H.city.roofs.filter(r => Math.hypot(r.x - run.site.ox, r.z - run.site.oz) < 90 && r.y < 30 && Math.hypot(r.x - run.site.ox, r.z - run.site.oz) > 30);
    const r = H.pick(roofs);
    if (r) { const s = new H.Npc('cop', r.x, r.z, { etype: 'sniper' }); s.pos.y = r.y; s.state = 'static'; s.run = true; s.h.root.position.copy(s.pos); s.fixedY = r.y; }
  }
}

/* ---------- securing & escape ---------- */
H.updateRunLoot = function (dt) {
  const run = H.run, P = H.P; if (!run) return;
  run.t += dt;
  run.zoneM.material.opacity = 0.35 + Math.sin(H.t * 4) * 0.15;
  // carrying a bag into the zone secures it
  if (P.bag && P.pos.distanceTo(run.secure) < 2.4) { H.game.secureBag(P.bag); P.bag = null; }
  // requirement met?
  const loot = run.securedBags;
  let ready = loot >= run.needBags;
  if (run.def.destroy) ready = run.destroyed >= run.def.destroy;
  if (run.def.cook) ready = (run.secured.meth || 0) >= 1;
  if (run.def.loot && Object.keys(run.def.loot).length === 0 && !run.def.destroy) ready = run.mainDone;
  if (ready && !run.escapeOpen) { run.escapeOpen = true; H.ui.toast('Escape available', 'Secure more loot or get in the van to finish.'); }
  if (run.escapeOpen && P.pos.distanceTo(run.secure) < 2.2 && !P.downed && !P.bag) {
    run.escHold = (run.escHold || 0) + dt;
    if (run.escHold > 1.5) H.game.completeHeist();
  } else run.escHold = 0;
};
H.objectiveLines = function () {
  const run = H.run; if (!run) return [];
  const L = [], def = run.def, tpl = run.site.tpl, P = H.P;
  if (!P.masked && !run.loud) L.push(['Case the place. Press X to mask up.', false]);
  const v = run.vaults[0];
  if (v && !v.open) {
    if (v.tlRunning) L.push(['Time lock: ' + Math.ceil(v.tl) + 's', false]);
    else if (v.drilling) { const d = run.drills.find(x => Math.abs(x.pos.x - v.doorX) < 1); L.push([d ? (d.jammed ? 'The drill is jammed. Fix it!' : 'Drilling the vault: ' + Math.floor(d.t / d.total * 100) + '%') : 'Drilling', false]); }
    else if (run.loud) L.push(['Drill the vault door', false]);
    else L.push([run.keycards >= v.cardsNeed - v.cardsIn ? 'Insert the keycard' + (v.cardsNeed > 1 ? 's (' + v.cardsIn + '/' + v.cardsNeed + ')' : '') + ' at the vault' : 'Find ' + (v.cardsNeed > 1 ? v.cardsNeed - v.cardsIn - run.keycards + ' more keycards' : 'a keycard') + ' (managers carry them)', false]);
  }
  if (run.lasers.some(l => l.on)) L.push(['Disable the lasers at the laser control', false]);
  if (run.cases.length) { const left = run.cases.filter(c => !c.done).length; if (left) L.push(['Open the display cases (' + left + ' left)', false]); }
  if (run.paintings.length) { const left = run.paintings.filter(p => p.real && !p.taken).length; if (left) L.push(['Cut the real paintings (' + left + ' left)', false]); }
  const ms = run.safes.find(s => s.main && !s.open); if (ms) L.push([ms.drilling ? 'Drilling the safe…' : 'Open the safe', false]);
  if (run.crates.length && run.crates.some(c => c.loot && !c.opened)) L.push(['Search the crates for the goods' + (run.comps.some(c => c.kind === 'manifest' && c.state !== 'done') ? ' (the manifest marks them)' : ''), false]);
  if (run.serversLeft > 0) { const c = run.comps.find(c => c.kind === 'hack'); L.push([c && c.state === 'run' ? 'Hacking: ' + Math.ceil(c.t) + 's' : c && c.state === 'jammed' ? 'Restart the hack!' : 'Hack the servers (' + run.serversLeft + ' left)', false]); }
  if (run.cook) L.push([run.cook.wait > 0 ? 'Cooking… ' + Math.ceil(run.cook.wait) + 's' : (H.P.holding ? 'Add ' + H.P.holding + ' to the batch' : 'Add ' + run.cook.need), false]);
  if (run.c4.length && run.c4Placed < run.c4.length) L.push(['Place C4 on the truck doors (' + run.c4Placed + '/' + run.c4.length + ')', false]);
  if (run.c4Fuse) L.push(['Get clear: ' + Math.ceil(run.c4Fuse) + 's', false]);
  if (def.destroy) L.push(['Cause damage: ' + H.money(run.destroyed) + ' / ' + H.money(def.destroy), run.destroyed >= def.destroy]);
  const total = Object.entries(def.loot).reduce((a, [k, b]) => a + b, 0) + (def.cook ? def.cook : 0);
  if (total) L.push(['Secure loot: ' + run.securedBags + ' / ' + total + ' bags' + (run.needBags ? ' (need ' + run.needBags + ')' : ''), run.securedBags >= run.needBags]);
  if (P.bag) L.push(['Carrying ' + H.LOOT[P.bag].name + ' — G to throw', false]);
  if (run.escapeOpen) L.push(['Escape: stand in the green zone by the van', false]);
  if (run.loud && run.policeETA > 0) L.push(['Police arrive in ' + Math.ceil(run.policeETA) + 's', false]);
  return L;
};
