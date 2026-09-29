// ============================================================================
// Soldiers: procedural bodies with era uniforms, helmets, load-bearing gear,
// two-bone IK arms that hold the weapon, walk/run/crouch/death animation and
// capsule hitboxes for ballistic hit tests.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const { gBox, gCyl, gCylY, gSph, gRBox } = G.geo;
const PI = Math.PI;
const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tC = new THREE.Vector3(), tD = new THREE.Vector3();
const Yup = new THREE.Vector3(0, 1, 0);

const SKIN = ['#e0b394', '#c99a78', '#a8765a', '#7a5238', '#5a3a26', '#eac3a6'];
const matCache = {};
function mat(col, rough = .9, map) {
  const k = col + rough + (map ? map.uuid : '');
  if (!matCache[k]) matCache[k] = G.mat({ color: map ? '#ffffff' : col, roughness: rough, metalness: 0, map: map || null });
  return matCache[k];
}
function fabric(col) {
  const k = 'fab' + col; if (matCache[k]) return matCache[k];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = col; x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * .12})`; x.fillRect(Math.random() * 64, Math.random() * 64, 1, 2); }
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .06})`; x.fillRect(Math.random() * 64, Math.random() * 64, 2, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.encoding = THREE.sRGBEncoding;
  return (matCache[k] = G.mat({ map: t, color: '#ffffff', roughness: .95 }));
}
function camoMat(kind, tint) {
  const k = 'camo' + kind + tint; if (matCache[k]) return matCache[k];
  const t = G.texCamo(kind).clone(); t.needsUpdate = true; t.repeat.set(2, 2);
  return (matCache[k] = G.mat({ map: t, color: tint || '#ffffff', roughness: .95 }));
}
// Uniform material sets per era/team
function uniformMats(era, team) {
  const U = G.UNIFORMS[era][team];
  let tunic = fabric(U.tunic), pants = fabric(U.pants);
  if (era === 'now' && team === 0) { tunic = pants = camoMat('multicam'); }
  if (era === 'now' && team === 1) { tunic = pants = camoMat('digital', '#9aa88a'); }
  if (era === 'mod' && team === 0) { tunic = pants = camoMat('desert'); }
  if (era === 'cold' && team === 0) { tunic = pants = camoMat('woodland', '#b8c0a0'); }
  return { U, tunic, pants, helm: mat(U.helm, .8), gear: fabric(U.gear), boot: mat('#231c16', .7), dark: mat('#1a1a18', .8), metal: G.mat({ color: '#3a3d40', metalness: .8, roughness: .4 }) };
}

// Build a soldier. opts: { era, team, tier, weapon, loadout, color }
G.buildSoldier = function (opts) {
  const era = opts.era, team = opts.team, M = uniformMats(era, team), U = M.U;
  const skin = mat(opts.skin || SKIN[Math.floor(Math.random() * SKIN.length)], .75);
  const root = new THREE.Group();
  const add = (geo, m, x, y, z, p) => { const o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = false; p.add(o); return o; };
  const bone = (x, y, z, p) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
  const S = { root };
  // --- skeleton
  S.hips = bone(0, .96, 0, root);
  S.spine = bone(0, .08, 0, S.hips);
  S.chest = bone(0, .26, 0, S.spine);
  S.neck = bone(0, .2, 0, S.chest);
  S.head = bone(0, .1, 0, S.neck);
  // pelvis & torso
  add(gRBox(.34, .2, .2, .06), M.pants, 0, -.02, 0, S.hips);
  add(gRBox(.36, .3, .22, .07), M.tunic, 0, .12, 0, S.spine);
  add(gRBox(.42, .26, .24, .08), M.tunic, 0, .06, 0, S.chest);
  add(gCylY(.055, .06, .08, 10), skin, 0, -.02, 0, S.neck);
  // head
  const hd = add(gSph(.105, 16), skin, 0, .02, 0, S.head); hd.scale.set(.92, 1.08, 1);
  add(gBox(.03, .03, .03), skin, 0, .0, -.105, S.head); // nose
  for (const s of [-1, 1]) { add(gSph(.012, 8), M.dark, s * .035, .03, -.092, S.head); add(gSph(.022, 8), skin, s * .1, .01, 0, S.head); }
  helmet(U.helmet, S.head, M, add);
  // gear
  gear(era, team, S, M, add);
  // legs
  S.legs = [];
  for (const s of [-1, 1]) {
    const hip = bone(s * .1, -.05, 0, S.hips);
    add(gCylY(.078, .064, .44, 10), M.pants, 0, -.22, 0, hip);
    const knee = bone(0, -.44, 0, hip);
    add(gSph(.066, 10), M.pants, 0, 0, 0, knee);
    const shinLen = .42;
    add(gCylY(.062, .05, shinLen, 10), era === 'ww1' && team === 0 ? fabric('#6a5a3e') : M.pants, 0, -shinLen / 2, 0, knee);
    if (era === 'ww1' || era === 'ww2') add(gCylY(.058, .052, .18, 10), fabric(era === 'ww1' ? '#6d6242' : '#b9ad86'), 0, -.33, 0, knee); // puttees / leggings
    const ankle = bone(0, -shinLen, 0, knee);
    add(gRBox(.1, .09, .27, .03), M.boot, 0, -.035, -.05, ankle);
    S.legs.push({ hip, knee, ankle, side: s });
  }
  // arms (IK driven)
  S.arms = [];
  for (const s of [-1, 1]) {
    const sh = bone(s * .23, .12, 0, S.chest);
    const upper = add(gCylY(.056, .048, 1, 10), M.tunic, 0, 0, 0, root);
    const fore = add(gCylY(.047, .04, 1, 10), M.tunic, 0, 0, 0, root);
    const elbow = add(gSph(.05, 8), M.tunic, 0, 0, 0, root);
    const hand = add(gRBox(.07, .09, .035, .015), era === 'now' || era === 'mod' ? M.dark : skin, 0, 0, 0, root);
    add(gSph(.058, 8), M.tunic, 0, 0, 0, sh);
    S.arms.push({ sh, upper, fore, elbow, hand, side: s });
  }
  // weapon
  if (opts.weapon) {
    const rig = G.buildGun(opts.weapon, opts.loadout || G.defaultLoadout(opts.weapon), { lod: 1 });
    const merged = G.mergeByMaterial(rig.root);
    const holder = bone(.13, .06, -.12, S.chest);
    holder.add(merged);
    // put the grip roughly at the right hand position, stock against the shoulder
    const st = rig.stockEnd || new THREE.Vector3(0, -.04, .3);
    merged.position.set(-st.x, -st.y - .02, -st.z + .02);
    if (opts.weapon.c === 'PST') { holder.position.set(0, .1, -.42); merged.position.set(0, -rig.gripPos.y * .6, 0); }
    S.gun = { holder, rig, obj: merged };
    S.muzzleLocal = new THREE.Vector3(0, 0, rig.muzzleZ).add(merged.position);
    S.gripLocal = rig.gripPos.clone().add(merged.position);
    S.hgLocal = (opts.weapon.c === 'PST' ? rig.gripPos.clone().add(new THREE.Vector3(-.01, -.02, .01)) : rig.hgPos.clone()).add(merged.position);
  }
  root.traverse(o => { if (o.isMesh) o.userData.soldier = true; });
  S.walkPhase = Math.random() * 6;
  S.aimPitch = 0; S.crouch = 0; S.dead = 0; S.deathDir = new THREE.Vector3();
  return S;
};

function helmet(type, head, M, add) {
  const h = M.helm;
  switch (type) {
    case 'brodie': { const d = add(gSph(.12, 14), h, 0, .05, 0, head); d.scale.set(1, .6, 1.05); add(gCylY(.19, .19, .012, 20), h, 0, .04, 0, head); break; }
    case 'stahl16': case 'm35': {
      const d = add(gSph(.125, 16), h, 0, .045, 0, head); d.scale.set(1, .85, 1.08);
      const sk = add(gCylY(.13, .15, .08, 18), h, 0, -.02, .01, head); sk.scale.set(1, 1, 1.05);
      add(gBox(.26, .04, .05), h, 0, .0, -.12, head);
      if (type === 'stahl16') for (const s of [-1, 1]) add(gCyl(.012, .012, .03, 8), h, s * .13, .05, 0, head).rotation.y = PI / 2;
      break; }
    case 'm1': case 'm1cover': {
      const d = add(gSph(.125, 16), type === 'm1cover' ? fabric('#4f5a36') : h, 0, .045, 0, head); d.scale.set(1.05, .82, 1.1);
      add(gCylY(.14, .145, .015, 18), h, 0, .01, 0, head);
      if (type === 'm1cover') add(gCylY(.13, .13, .02, 18), M.dark, 0, .06, 0, head);
      break; }
    case 'ssh68': { const d = add(gSph(.125, 16), h, 0, .045, 0, head); d.scale.set(1.02, .85, 1.08); add(gCylY(.132, .135, .03, 18), h, 0, 0, 0, head); break; }
    case 'pasgt': { const d = add(gSph(.13, 16), fabric('#b9a57d'), 0, .04, 0, head); d.scale.set(1.05, .85, 1.1); add(gCylY(.135, .145, .07, 18), fabric('#b9a57d'), 0, -.01, .015, head); add(gBox(.2, .04, .02), M.dark, 0, .05, .13, head); break; }
    case 'shemagh': { const d = add(gSph(.118, 14), fabric('#d9d2c2'), 0, .025, .008, head); d.scale.set(1, 1, 1); add(gRBox(.2, .1, .16, .05), fabric('#d9d2c2'), 0, -.06, .01, head); add(gBox(.18, .04, .02), M.dark, 0, .03, -.11, head); break; }
    case 'fast': case '6b47': {
      const d = add(gSph(.128, 16), type === 'fast' ? camoMat('multicam') : camoMat('digital', '#9aa88a'), 0, .045, 0, head); d.scale.set(1.05, .85, 1.1);
      if (type === 'fast') { for (const s of [-1, 1]) add(gBox(.02, .05, .12), M.dark, s * .13, .02, 0, head); add(gBox(.05, .03, .03), M.metal, 0, .07, -.12, head);
        const nvg = add(gBox(.09, .04, .06), M.dark, 0, .07, -.16, head); add(gBox(.05, .03, .05), M.dark, 0, .11, .12, head); }
      else add(gCylY(.135, .14, .04, 18), camoMat('digital', '#9aa88a'), 0, 0, 0, head);
      add(gRBox(.16, .03, .04, .01), M.dark, 0, .02, -.1, head); // goggles strap
      break; }
    default: { const d = add(gSph(.12, 14), h, 0, .045, 0, head); d.scale.set(1, .8, 1.05); }
  }
}
function gear(era, team, S, M, add) {
  const g = M.gear;
  if (era === 'ww1' || era === 'ww2') {
    add(gRBox(.4, .05, .25, .02), g, 0, -.02, 0, S.spine); // belt
    for (const s of [-1, 1]) { add(gRBox(.08, .08, .06, .015), g, s * .1, -.02, -.13, S.spine); } // ammo pouches
    for (const s of [-1, 1]) { const st = add(gBox(.04, .42, .02), g, s * .1, .05, -.12, S.chest); st.rotation.z = s * .12; } // suspenders
    add(gRBox(.28, .3, .12, .04), g, 0, .02, .17, S.chest); // pack
    add(gCylY(.045, .045, .14, 10), M.metal, .19, -.08, .06, S.spine); // canteen
  } else if (era === 'cold') {
    add(gRBox(.4, .05, .25, .02), g, 0, -.02, 0, S.spine);
    for (const s of [-1, 1]) add(gRBox(.09, .1, .07, .015), g, s * .11, -.03, -.13, S.spine);
    add(gRBox(.3, .34, .14, .04), g, 0, 0, .18, S.chest);
    if (team === 1) { add(gRBox(.24, .18, .06, .02), g, 0, -.02, -.13, S.chest); } // chest rig
  } else if (era === 'mod') {
    add(gRBox(.46, .36, .3, .06), team === 0 ? fabric('#b9a57d') : g, 0, .02, 0, S.chest); // IBA vest
    for (let i = -1; i <= 1; i++) add(gRBox(.08, .12, .05, .015), team === 0 ? fabric('#a8966f') : M.dark, i * .1, -.02, -.17, S.chest);
    if (team === 0) add(gRBox(.2, .06, .08, .02), fabric('#a8966f'), 0, .16, -.16, S.chest);
  } else {
    const pc = team === 0 ? camoMat('multicam') : camoMat('digital', '#9aa88a');
    add(gRBox(.44, .34, .3, .05), pc, 0, .03, 0, S.chest); // plate carrier
    for (let i = -1; i <= 1; i++) add(gRBox(.085, .13, .05, .015), pc, i * .1, -.04, -.17, S.chest); // mag pouches
    add(gRBox(.08, .14, .06, .02), M.dark, .16, .02, .17, S.chest); // radio
    const ant = add(gCylY(.004, .004, .45, 5), M.dark, .18, .3, .18, S.chest); ant.rotation.z = -.15;
    add(gRBox(.26, .22, .08, .03), pc, 0, .0, .19, S.chest); // back panel
    add(gRBox(.42, .06, .26, .02), M.dark, 0, -.03, 0, S.spine); // battle belt
  }
}

// ------------------------------------------------------------------ IK
// place a cylinder mesh (height 1, along Y) between points a and b
function orient(mesh, a, b) {
  tC.subVectors(b, a); const len = tC.length();
  mesh.position.copy(a).addScaledVector(tC, .5);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(Yup, tC.divideScalar(len || 1));
}
// Solve a two-bone chain (root-space positions)
function solveArm(arm, target, pole, root) {
  const up = .29, lo = .27;
  const s = arm.sh.getWorldPosition(tA); root.worldToLocal(s);
  tB.subVectors(target, s); let d = tB.length();
  d = Math.min(d, up + lo - .001); tB.setLength(d);
  const t = tA.clone().add(tB);
  const a = Math.acos(Math.max(-1, Math.min(1, (up * up + d * d - lo * lo) / (2 * up * d))));
  const dir = tB.clone().normalize();
  const side = new THREE.Vector3().crossVectors(dir, pole).normalize();
  const bendAxis = new THREE.Vector3().crossVectors(side, dir).normalize();
  const elbow = tA.clone().addScaledVector(dir, Math.cos(a) * up).addScaledVector(bendAxis, Math.sin(a) * up);
  orient(arm.upper, tA, elbow); orient(arm.fore, elbow, t);
  arm.elbow.position.copy(elbow); arm.hand.position.copy(t); arm.hand.quaternion.copy(arm.fore.quaternion);
}

// Animate: state = { speed (m/s), crouch 0..1, aimPitch rad, firing, dt, dead }
G.animateSoldier = function (S, st) {
  const dt = st.dt;
  if (S.dead > 0) { deathAnim(S, dt); return; }
  S.crouch += ((st.crouch || 0) - S.crouch) * Math.min(1, dt * 8);
  const spd = st.speed || 0;
  S.walkPhase += dt * (spd > .1 ? 4 + spd * 1.6 : 0);
  const ph = S.walkPhase, amp = Math.min(1, spd / 4) * (1 - S.crouch * .5);
  const c = S.crouch;
  S.hips.position.y = .96 - c * .38 + Math.abs(Math.sin(ph)) * .04 * amp;
  for (const L of S.legs) {
    const p = ph + (L.side > 0 ? PI : 0);
    L.hip.rotation.x = Math.sin(p) * .7 * amp - c * 1.2;
    L.knee.rotation.x = Math.max(0, -Math.cos(p)) * 1.1 * amp + c * 2.0;
    L.ankle.rotation.x = -c * .8 + Math.sin(p) * .2 * amp;
  }
  S.spine.rotation.x = -.08 * amp + c * .25;
  S.spine.rotation.y = Math.sin(ph) * .06 * amp;
  // aim: pitch the chest (weapon attached to chest)
  S.aimPitch += ((st.aimPitch || 0) - S.aimPitch) * Math.min(1, dt * 10);
  S.chest.rotation.x = S.aimPitch - c * .25 + (st.recoil || 0) * .05;
  S.neck.rotation.x = -S.aimPitch * .3;
  if (st.sprint && S.gun) { S.gun.holder.rotation.set(.5, .6, .2); } else if (S.gun) S.gun.holder.rotation.set(0, 0, 0);
  // IK arms to the gun
  S.root.updateMatrixWorld(true);
  if (S.gun) {
    const grip = S.gun.holder.localToWorld(S.gripLocal.clone()); S.root.worldToLocal(grip);
    const hg = S.gun.holder.localToWorld(S.hgLocal.clone()); S.root.worldToLocal(hg);
    solveArm(S.arms[1], grip, tD.set(.3, -1, .4).normalize(), S.root);
    solveArm(S.arms[0], hg, tD.set(-.6, -1, -.2).normalize(), S.root);
  } else {
    for (const a of S.arms) { const s = a.sh.getWorldPosition(tA); S.root.worldToLocal(s); solveArm(a, s.clone().add(new THREE.Vector3(a.side * .05, -.5, 0)), tD.set(0, 0, -1), S.root); }
  }
};
function deathAnim(S, dt) {
  S.dead += dt;
  const t = Math.min(1, S.dead / .7), e = t * t * (3 - 2 * t);
  const dir = S.deathDir;
  S.root.rotation.x = e * (PI / 2 - .1) * dir.z;
  S.root.rotation.z = -e * (PI / 2 - .1) * dir.x;
  S.hips.position.y = .96 - e * .7;
  for (const L of S.legs) { L.knee.rotation.x = e * .8 * (L.side > 0 ? 1 : .4); L.hip.rotation.x = -e * .3 * L.side; }
  S.chest.rotation.x = e * .3; S.neck.rotation.x = e * .5;
  if (S.gun && S.dead < .8) { S.gun.holder.rotation.z = e * 1.2; S.gun.holder.position.y = .06 - e * .3; }
}

// ------------------------------------------------------------------ hitboxes
// Returns capsules in world space: [{a, b, r, zone}]
G.soldierHitboxes = function (S) {
  const H = S._hb || (S._hb = { head: { a: new THREE.Vector3(), b: new THREE.Vector3(), r: .12, zone: 'head' }, chest: { a: new THREE.Vector3(), b: new THREE.Vector3(), r: .2, zone: 'chest' }, gut: { a: new THREE.Vector3(), b: new THREE.Vector3(), r: .18, zone: 'stomach' }, legs: [0, 1].map(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), r: .09, zone: 'leg' })), arms: [0, 1].map(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), r: .065, zone: 'arm' })) });
  S.head.getWorldPosition(H.head.a); H.head.b.copy(H.head.a); H.head.a.y -= .04; H.head.b.y += .08;
  S.chest.localToWorld(H.chest.a.set(0, -.05, 0)); S.chest.localToWorld(H.chest.b.set(0, .2, 0));
  S.spine.localToWorld(H.gut.a.set(0, -.1, 0)); S.spine.localToWorld(H.gut.b.set(0, .2, 0));
  S.legs.forEach((L, i) => { L.hip.getWorldPosition(H.legs[i].a); L.ankle.getWorldPosition(H.legs[i].b); });
  S.arms.forEach((A, i) => { A.sh.getWorldPosition(H.arms[i].a); S.root.localToWorld(H.arms[i].b.copy(A.hand.position)); });
  return [H.head, H.chest, H.gut, H.legs[0], H.legs[1], H.arms[0], H.arms[1]];
};
// Ray vs capsule: returns distance along ray or -1
G.rayCapsule = function (ro, rd, a, b, r) {
  const ba = tA.subVectors(b, a), oa = tB.subVectors(ro, a);
  const baba = ba.dot(ba), bard = ba.dot(rd), baoa = ba.dot(oa), rdoa = rd.dot(oa), oaoa = oa.dot(oa);
  let A = baba - bard * bard, B = baba * rdoa - baoa * bard, C = baba * oaoa - baoa * baoa - r * r * baba;
  let h = B * B - A * C;
  if (h >= 0) {
    const t = (-B - Math.sqrt(h)) / A, y = baoa + t * bard;
    if (y > 0 && y < baba && t > 0) return t;
    const oc = y <= 0 ? oa : tC.subVectors(ro, b);
    B = rd.dot(oc); C = oc.dot(oc) - r * r; h = B * B - C;
    if (h > 0) { const t2 = -B - Math.sqrt(h); if (t2 > 0) return t2; }
  }
  return -1;
};
})();
