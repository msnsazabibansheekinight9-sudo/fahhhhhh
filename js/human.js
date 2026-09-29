// ============================================================================
// Soldiers: procedural anatomical bodies (lathed torso and limbs, modelled
// faces, fists, boots), era uniforms with pockets/buttons/puttees/jackboots,
// helmets and load-bearing gear. Animation: phase-based gait with pelvis bob,
// sway and counter-rotating torso, strafe/backpedal, kneeling and crouch-walk,
// low-ready and tactical sprint, reload hand paths, hit reactions, and
// staged ragdoll-style deaths that drop the weapon.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const { gBox, gCylY, gSph, gRBox } = G.geo;
const PI = Math.PI;
const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tC = new THREE.Vector3(), tD = new THREE.Vector3();
const Yup = new THREE.Vector3(0, 1, 0);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const fall = t => { t = clamp(t, 0, 1); return t * t; }; // gravity-like acceleration
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (cur, tgt, k, dt) => cur + (tgt - cur) * Math.min(1, dt * k);

const SKIN = ['#e0b394', '#c99a78', '#a8765a', '#7a5238', '#5a3a26', '#eac3a6', '#d2a07c'];
const HAIR = ['#2a1d14', '#3a2a1e', '#5a4028', '#161310', '#7a5a34', '#8a6a44'];
const matCache = {};
function mat(col, rough = .9, metal = 0) {
  const k = col + rough + ':' + metal;
  if (!matCache[k]) matCache[k] = G.mat({ color: col, roughness: rough, metalness: metal });
  return matCache[k];
}
function fabric(col, rough = .95) {
  const k = 'fab' + col + rough; if (matCache[k]) return matCache[k];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = col; x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 2) { x.fillStyle = `rgba(0,0,0,${.03 + (i % 4) * .01})`; x.fillRect(0, i, 64, 1); } // weave
  for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * .12})`; x.fillRect(Math.random() * 64, Math.random() * 64, 1, 2); }
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .06})`; x.fillRect(Math.random() * 64, Math.random() * 64, 2, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.encoding = THREE.sRGBEncoding;
  return (matCache[k] = G.mat({ map: t, color: '#ffffff', roughness: rough }));
}
function camoMat(kind, tint) {
  const k = 'camo' + kind + tint; if (matCache[k]) return matCache[k];
  const t = G.texCamo(kind).clone(); t.needsUpdate = true; t.repeat.set(2, 2);
  return (matCache[k] = G.mat({ map: t, color: tint || '#ffffff', roughness: .95 }));
}
// lathed (rotationally symmetric) body parts; profile = [[radius, y], ...] bottom to top
const LC = {};
function gLathe(key, prof, n = 14) { return LC[key] || (LC[key] = (() => { const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), n); g.computeVertexNormals(); return g; })()); }
// open lathe over part of the circle (phi measured from +z = the back of the head)
function gLatheP(key, prof, n, phi0, phiL) { return LC[key] || (LC[key] = (() => { const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), n, phi0, phiL); g.computeVertexNormals(); return g; })()); }
function gHemi(r, n = 18) { const k = 'hemi' + r + n; return LC[k] || (LC[k] = new THREE.SphereGeometry(r, n, n >> 1, 0, PI * 2, 0, PI / 2)); }
// helmet skirt: covers sides and back, leaves the face open
const skirt = (key, prof) => gLatheP(key, prof, 20, PI + .95, PI * 2 - 1.9);
function gTorus(R, r, arc = PI * 2, n = 16) { const k = `tor${R},${r},${arc}`; return LC[k] || (LC[k] = new THREE.TorusGeometry(R, r, 6, n, arc)); }

// Uniform material sets per era/team
function uniformMats(era, team) {
  const U = G.UNIFORMS[era][team];
  let tunic = fabric(U.tunic), pants = fabric(U.pants);
  if (era === 'now' && team === 0) { tunic = pants = camoMat('multicam'); }
  if (era === 'now' && team === 1) { tunic = pants = camoMat('digital', '#9aa88a'); }
  if (era === 'mod' && team === 0) { tunic = pants = camoMat('desert'); }
  if (era === 'cold' && team === 0) { tunic = pants = camoMat('woodland', '#b8c0a0'); }
  return { U, tunic, pants, helm: mat(U.helm, .75, .15), gear: fabric(U.gear), boot: mat(U.boot || '#231c16', .65), sole: mat('#141210', .9), dark: mat('#1a1a18', .8), metal: G.mat({ color: '#3a3d40', metalness: .8, roughness: .4 }),
    brass: G.mat({ color: '#b08a3a', metalness: .9, roughness: .35 }), glove: mat(U.glove || '#26241f', .8), leather: mat('#4a3322', .7) };
}

// material set from a personal-kit loadout (see gear.js)
function patternMat(g) {
  if (!g || !g.pat) return fabric('#5a5a42');
  const [style, pal] = g.pat;
  if (style === 'solid') return fabric(pal[0]);
  const k = 'kpat' + g.id; if (matCache[k]) return matCache[k];
  const t = G.texPattern(g.id, style, pal).clone(); t.needsUpdate = true; t.repeat.set(2, 2);
  return (matCache[k] = G.mat({ map: t, color: '#ffffff', roughness: .95 }));
}
G.kitPatternMat = patternMat;
G.HM = { mat, fabric, camoMat, patternMat, gLathe, gLatheP, gHemi, gTorus };
function kitMats(kit, era, team) {
  const U = G.UNIFORMS[era] ? G.UNIFORMS[era][team] : G.UNIFORMS.now[0];
  const GI = G.GEARID, uni = GI[kit.uniform], H = GI[kit.helmet] || {}, Bo = GI[kit.boots] || {}, Gl = GI[kit.gloves] || {};
  const tunic = patternMat(uni);
  const col = c => !c ? null : c === 'uniform' ? tunic : fabric(c);
  return { U: Object.assign({}, U, { helmet: H.model }), tunic, pants: uni && uni.pants ? fabric(uni.pants) : tunic, helm: H.col === 'uniform' ? tunic : mat(H.col || '#4b5234', .75, .15), gear: col((GI[kit.armor] || {}).col) || fabric('#5a5a42'),
    boot: mat(Bo.col || '#231c16', .65), sole: mat('#141210', .9), dark: mat('#1a1a18', .8), metal: G.mat({ color: '#3a3d40', metalness: .8, roughness: .4 }),
    brass: G.mat({ color: '#b08a3a', metalness: .9, roughness: .35 }), glove: mat(Gl.col || '#26241f', .8), leather: mat('#4a3322', .7), kitCol: col };
}

// Build a soldier. opts: { era, team, tier, weapon, loadout, skin, hair, kit }
G.buildSoldier = function (opts) {
  const era = opts.era, team = opts.team, kit = opts.kit || null, M = kit ? kitMats(kit, era, team) : uniformMats(era, team), U = M.U;
  const KA = kit ? G.GEARID[kit.armor] || {} : null;
  const skinCol = opts.skin || SKIN[Math.floor(Math.random() * SKIN.length)];
  const skin = mat(skinCol, .72);
  const hairM = mat(opts.hair || HAIR[Math.floor(Math.random() * HAIR.length)], .95);
  const root = new THREE.Group();
  const add = (geo, m, x, y, z, p) => { const o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = false; p.add(o); o.userData.st = true; return o; };
  const bone = (x, y, z, p) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
  const S = { root, era, team };
  const gloved = kit ? !!(G.GEARID[kit.gloves] || {}).col : era === 'mod' && team === 0 || era === 'now' || era === 'psycho';
  const noVest = kit ? ['belt', 'steel', 'rig'].includes(KA.model) && (G.GEARID[kit.uniform] || {}).y < 1975 : era === 'ww1' || era === 'ww2' || era === 'cold';
  // --- skeleton
  S.hips = bone(0, .96, 0, root);
  S.spine = bone(0, .08, 0, S.hips);
  S.chest = bone(0, .26, 0, S.spine);
  S.neck = bone(0, .2, 0, S.chest);
  S.head = bone(0, .1, 0, S.neck);
  // --- torso: pelvis, abdomen, ribcage (elliptical sections)
  add(gLathe('pelvis', [[0, -.13], [.075, -.125], [.128, -.09], [.155, -.03], [.158, .03], [.15, .1], [0, .1]]), M.pants, 0, 0, 0, S.hips).scale.set(1, 1, .7);
  add(gLathe('abdo', [[0, -.05], [.156, -.045], [.148, .05], [.152, .14], [.172, .24], [0, .26]]), M.tunic, 0, 0, 0, S.spine).scale.set(1, 1, .68);
  add(gLathe('chest', [[0, -.08], [.172, -.075], [.19, .0], [.2, .08], [.196, .13], [.165, .18], [.1, .205], [0, .21]]), M.tunic, 0, 0, 0, S.chest).scale.set(1.07, 1, .64);
  add(gLathe('neck', [[0, -.05], [.06, -.045], [.053, .04], [.05, .1], [0, .11]], 10), skin, 0, -.02, 0, S.neck);
  add(gTorus(.064, .016), M.tunic, 0, .0, 0, S.neck).rotation.x = PI / 2; // collar
  // shoulders (deltoids) on the chest
  for (const s of [-1, 1]) { const d = add(gSph(.066, 12), M.tunic, s * .2, .135, 0, S.chest); d.scale.set(1.05, .9, 1); }
  // --- head: skull, jaw, cheeks, nose, brow, eyes, ears, lips, hair
  add(gSph(.098, 18), skin, 0, .04, .004, S.head).scale.set(.9, 1.03, 1.02);
  add(gRBox(.122, .07, .118, .034), skin, 0, -.034, -.014, S.head); // jaw
  add(gSph(.03, 10), skin, 0, -.066, -.072, S.head).scale.set(1.2, .9, .9); // chin
  for (const s of [-1, 1]) add(gSph(.022, 10), skin, s * .043, .0, -.066, S.head).scale.set(1, .7, .6); // cheekbones
  const nose = add(gRBox(.02, .046, .026, .009), skin, 0, .006, -.096, S.head); nose.rotation.x = .3;
  add(gSph(.011, 8), skin, 0, -.014, -.106, S.head).scale.set(1.5, .8, 1); // nose tip / nostrils
  add(gRBox(.094, .016, .03, .008), skin, 0, .046, -.084, S.head); // brow ridge
  const eyeW = mat('#e8e2d6', .4), iris = mat(['#3a2a1c', '#2d4a5e', '#3d5236', '#4a3a28'][Math.floor(Math.random() * 4)], .3);
  for (const s of [-1, 1]) {
    add(gSph(.011, 10), eyeW, s * .033, .026, -.08, S.head).scale.set(1.2, .8, 1);
    add(gSph(.0052, 8), iris, s * .033, .026, -.0905, S.head);
    add(gRBox(.028, .006, .014, .003), skin, s * .033, .0345, -.086, S.head); // upper lid
    add(gBox(.034, .007, .01), hairM, s * .034, .052, -.096, S.head); // eyebrows
    const ear = add(gRBox(.014, .052, .03, .007), skin, s * .096, .012, .004, S.head); ear.rotation.y = s * .25;
  }
  add(gRBox(.04, .005, .01, .0024), mat('#9a5a4a', .6), 0, -.038, -.094, S.head); // upper lip
  add(gRBox(.036, .006, .01, .0028), mat('#a8665a', .6), 0, -.045, -.092, S.head); // lower lip
  const hair = add(gHemi(.102, 14), hairM, 0, .04, .012, S.head); hair.scale.set(.92, .8, 1.02); hair.rotation.x = .32; // short hair, hairline above the brow
  if (Math.random() < .35 && (era === 'ww1' || era === 'mod' && team === 1 || era === 'psycho' && team === 1)) add(gRBox(.05, .01, .012, .004), hairM, 0, -.034, -.096, S.head); // moustache
  if (era === 'mod' && team === 1 || era === 'psycho' && team === 1) add(gRBox(.12, .05, .1, .03), hairM, 0, -.06, -.03, S.head); // beard
  G.HM.legacyHelmet = (type, head, MM) => helmet(type, head, MM, add, era, team);
  if (kit) G.kitHead(S, kit, M, add); else helmet(U.helmet, S.head, M, add, era, team);
  // --- uniform details (tunic eras): buttons, breast pockets, belt
  if (noVest) {
    for (const s of [-1, 1]) { add(gRBox(.085, .09, .012, .01), M.tunic, s * .085, .07, -.127, S.chest); add(gRBox(.09, .028, .016, .008), M.tunic, s * .085, .118, -.131, S.chest); add(gSph(.007, 6), era === 'ww1' || era === 'ww2' ? M.brass : M.dark, s * .085, .112, -.14, S.chest); }
    for (let i = 0; i < 4; i++) add(gSph(.0075, 6), era === 'ww1' || era === 'ww2' ? M.brass : M.dark, 0, .15 - i * .07, -.132 + (i > 2 ? .02 : 0), i < 3 ? S.chest : S.spine);
  }
  if (kit) G.kitBody(S, kit, M, add); else gear(era, team, S, M, add);
  // --- legs: thigh, knee, calf, boot
  S.legs = [];
  const pk = kit ? ((G.GEARID[kit.boots] || {}).model || 'modern') : era === 'ww2' && team === 1 ? 'jack' : era === 'ww1' ? 'puttee' : era === 'ww2' ? 'legging' : 'modern';
  const modernLegs = kit ? ['pc', 'pcslick', 'iotv'].includes(KA.model) || ((G.GEARID[kit.uniform] || {}).y >= 1995 && !/civ/.test(kit.uniform)) : era === 'mod' || era === 'now' || era === 'psycho';
  for (const s of [-1, 1]) {
    const hip = bone(s * .095, -.05, 0, S.hips);
    add(gLathe('thigh', [[0, .04], [.082, .03], [.088, -.05], [.078, -.2], [.066, -.36], [.058, -.44], [0, -.46]]), M.pants, 0, 0, 0, hip).scale.set(1, 1, .96);
    if (modernLegs) { add(gRBox(.03, .1, .09, .012), M.pants, s * .082, -.2, .0, hip); add(gRBox(.034, .026, .094, .01), M.pants, s * .084, -.15, .0, hip); } // cargo pockets
    const knee = bone(0, -.44, 0, hip);
    add(gSph(.058, 10), M.pants, 0, 0, -.005, knee);
    add(gLathe('calf', [[0, .02], [.056, .0], [.062, -.1], [.056, -.2], [.046, -.32], [.042, -.42], [0, -.43]]), M.pants, 0, 0, 0, knee).scale.set(1, 1, .95);
    if (pk === 'puttee') for (let i = 0; i < 7; i++) { const r = add(gTorus(.054 - i * .002, .012), fabric('#6d6242'), 0, -.18 - i * .033, 0, knee); r.rotation.set(PI / 2 + (i % 2 ? .18 : -.18), 0, 0); }
    if (pk === 'legging') add(gLathe('gait', [[0, -.4], [.05, -.4], [.05, -.24], [.056, -.2], [0, -.2]], 12), fabric('#a0916a'), 0, 0, 0, knee);
    if (pk === 'jack' && !kit) add(gLathe('jboot', [[0, -.43], [.052, -.43], [.052, -.2], [.062, -.08], [.064, -.02], [0, -.02]], 14), M.boot, 0, 0, 0, knee); // marching jackboots
    if (modernLegs) { add(gRBox(.1, .1, .05, .02), M.dark, 0, -.01, -.058, knee); } // knee pads
    const ankle = bone(0, -.42, 0, knee);
    if (kit) { G.kitBoot(knee, ankle, kit, M, add); S.legs.push({ hip, knee, ankle, side: s }); continue; }
    add(gLathe('bshaft', [[0, -.075], [.05, -.075], [.05, .06], [.046, .1], [0, .1]], 12), M.boot, 0, 0, 0, ankle);
    add(gRBox(.098, .07, .25, .032), M.boot, 0, -.045, -.05, ankle); // upper
    add(gRBox(.104, .022, .265, .008), M.sole, 0, -.084, -.05, ankle); // sole
    add(gRBox(.104, .03, .05, .01), M.sole, 0, -.08, .05, ankle); // heel
    if (small(era)) for (let i = 0; i < 4; i++) add(gBox(.05, .004, .006), M.dark, 0, -.008 + i * .016, -.07 - i * .004, ankle); // laces
    S.legs.push({ hip, knee, ankle, side: s });
  }
  // --- arms (IK driven, root space): lathed upper arm and forearm, elbow, gloved/bare fist
  S.arms = [];
  const handM = gloved ? M.glove : skin;
  for (const s of [-1, 1]) {
    const sh = bone(s * .2, .13, 0, S.chest);
    const upper = add(gLathe('uarm', [[0, -.5], [.058, -.46], [.064, -.3], [.06, -.08], [.05, .3], [.046, .5], [0, .52]]), M.tunic, 0, 0, 0, root);
    const fore = add(gLathe('farm', [[0, -.52], [.048, -.48], [.052, -.24], [.044, .1], [.036, .44], [0, .5]]), M.tunic, 0, 0, 0, root);
    const elbow = add(gSph(.048, 10), M.tunic, 0, 0, 0, root);
    const hand = new THREE.Group(); root.add(hand);
    add(gRBox(.072, .08, .04, .016), handM, 0, .04, 0, hand); // palm / back of hand
    add(gRBox(.074, .036, .052, .016), handM, 0, .085, -.012, hand); // curled fingers
    add(gRBox(.068, .016, .02, .006), handM, 0, .1, .01, hand); // knuckles
    const th = add(gRBox(.022, .05, .024, .01), handM, s * .036, .05, -.02, hand); th.rotation.z = -s * .45; // thumb
    if (!gloved) add(gLathe('cuff', [[0, -.02], [.042, -.02], [.042, .02], [0, .02]], 10), M.tunic, 0, -.01, 0, hand); // sleeve cuff
    else add(gLathe('gcuff', [[0, -.025], [.04, -.025], [.04, .015], [0, .015]], 10), M.glove, 0, -.005, 0, hand);
    if (kit) G.kitHand(hand, kit, M, add, s);
    S.arms.push({ sh, upper, fore, elbow, hand, side: s });
  }
  // --- weapon
  if (opts.weapon) {
    const rig = G.buildGun(opts.weapon, opts.loadout || G.defaultLoadout(opts.weapon), { lod: 1 });
    const merged = G.mergeByMaterial(rig.root);
    const pistol = opts.weapon.c === 'PST';
    const holder = bone(.13, .06, -.12, S.chest);
    holder.add(merged);
    // grip at the right hand, stock against the shoulder pocket
    const st = rig.stockEnd || new THREE.Vector3(0, -.04, .3);
    merged.position.set(-st.x, -st.y - .02, -st.z + .02);
    if (pistol) { holder.position.set(0, .1, -.42); merged.position.set(0, -rig.gripPos.y * .6, 0); }
    S.gun = { holder, rig, obj: merged, pistol, home: { pos: holder.position.clone(), rot: holder.rotation.clone() } };
    S.muzzleLocal = new THREE.Vector3(0, 0, rig.muzzleZ).add(merged.position);
    S.gripLocal = rig.gripPos.clone().add(merged.position);
    S.magLocal = (rig.magPos || rig.hgPos).clone().add(merged.position).add(new THREE.Vector3(0, -.06, 0));
    S.hgLocal = (pistol ? rig.gripPos.clone().add(new THREE.Vector3(-.01, -.02, .01)) : rig.hgPos.clone()).add(merged.position);
    S.chargeLocal = new THREE.Vector3(.045, .02, (rig.zr || .1) - .08).add(merged.position);
  }
  // bake the static meshes of each bone into one mesh per material (fewer draw calls)
  for (const b of [S.hips, S.spine, S.chest, S.neck, S.head, ...S.legs.flatMap(L => [L.hip, L.knee, L.ankle])]) mergeBone(b);
  root.traverse(o => { if (o.isMesh) o.userData.soldier = true; });
  S.walkPhase = Math.random() * 6;
  S.aimPitch = 0; S.crouch = 0; S.dead = 0; S.deathDir = new THREE.Vector3(); S.flinch = 0; S.flinchDir = 0; S.breath = Math.random() * 6;
  S.look = 0; S.lookT = 2 + Math.random() * 3; S.lookTgt = 0;
  S.g = { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 }; // smoothed gun-holder pose offsets
  return S;
};
function small(era) { return era === 'mod' || era === 'now' || era === 'psycho'; }

// merge the direct static mesh children of a bone by material
function mergeBone(bone) {
  const list = bone.children.filter(o => o.isMesh && o.userData.st);
  if (list.length < 3) return;
  const buckets = new Map();
  for (const o of list) { const k = o.material.uuid; if (!buckets.has(k)) buckets.set(k, { m: o.material, l: [] }); buckets.get(k).l.push(o); }
  const mtx = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
  for (const { m, l } of buckets.values()) {
    if (l.length < 2) continue;
    let total = 0; const geos = l.map(o => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry; total += g.attributes.position.count; return [g, o]; });
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2); let off = 0;
    for (const [g, o] of geos) {
      o.updateMatrix(); mtx.copy(o.matrix); nm.getNormalMatrix(mtx);
      const P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(mtx); pos[(off + i) * 3] = v.x; pos[(off + i) * 3 + 1] = v.y; pos[(off + i) * 3 + 2] = v.z;
        if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(off + i) * 3] = v.x; nor[(off + i) * 3 + 1] = v.y; nor[(off + i) * 3 + 2] = v.z; }
        if (UV) { uv[(off + i) * 2] = UV.getX(i); uv[(off + i) * 2 + 1] = UV.getY(i); }
      }
      off += P.count; bone.remove(o);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); bg.computeBoundingSphere();
    const mesh = new THREE.Mesh(bg, m); mesh.castShadow = true; bone.add(mesh);
  }
}

function helmet(type, head, M, add, era, team) {
  const h = M.helm;
  switch (type) {
    case 'brodie': { const d = add(gHemi(.118), h, 0, .06, 0, head); d.scale.set(1, .6, 1.08); add(gCylY(.188, .19, .01, 28), h, 0, .058, 0, head); add(gTorus(.189, .004, PI * 2, 28), M.metal, 0, .058, 0, head).rotation.x = PI / 2; add(gBox(.01, .09, .01), M.leather, .1, -.02, -.03, head); break; }
    case 'stahl16': case 'm35': {
      const d = add(gHemi(.126), h, 0, .045, .006, head); d.scale.set(1, .9, 1.08);
      const sk = add(skirt('sk' + type, [[.158, -.085], [.152, -.07], [.134, -.01], [.127, .046]]), h, 0, 0, .006, head); sk.scale.set(1, 1, 1.08);
      add(gLatheP('visor' + type, [[.14, .03], [.128, .046]], 20, PI - .95, 1.9), h, 0, 0, .006, head).scale.set(1, 1, 1.08); // front brim lip
      if (type === 'stahl16') for (const s of [-1, 1]) add(G.geo.gCylX(.013, .013, .02, 10), h, s * .128, .05, .005, head); // ventilation lugs
      else for (const s of [-1, 1]) add(G.geo.gCylX(.006, .006, .01, 8), M.metal, s * .127, .06, .01, head);
      add(gBox(.008, .1, .01), M.leather, .098, -.04, -.02, head); // chin strap
      break; }
    case 'm1': case 'm1cover': {
      const cm = type === 'm1cover' ? fabric('#4f5a36') : h;
      const d = add(gHemi(.127), cm, 0, .038, 0, head); d.scale.set(1.04, .88, 1.1);
      add(gLathe('m1rim', [[.147, .03], [.149, .034], [.134, .042], [.132, .038]], 22), h, 0, 0, 0, head).scale.set(1.04, 1, 1.1);
      add(skirt('m1sk', [[.138, .0], [.134, .02], [.132, .038]]), cm, 0, 0, 0, head).scale.set(1.04, 1, 1.1);
      if (type === 'm1cover') { add(gCylY(.132, .132, .022, 20), M.dark, 0, .075, 0, head); add(gRBox(.03, .05, .012, .004), mat('#c9c0a8', .9), .04, .09, -.125, head); } // band + field dressing
      else { for (const s of [-1, 1]) add(gBox(.01, .1, .01), fabric('#6a6040'), s * .1, -.04, -.01, head); }
      break; }
    case 'ssh68': { const d = add(gHemi(.126), h, 0, .04, 0, head); d.scale.set(1.02, .9, 1.08); add(skirt('ssk', [[.138, -.03], [.134, .0], [.128, .04]]), h, 0, 0, 0, head).scale.set(1.02, 1, 1.08); add(gLatheP('ssv', [[.135, .032], [.128, .04]], 20, PI - .95, 1.9), h, 0, 0, 0, head); add(gBox(.008, .1, .01), M.leather, .1, -.04, -.02, head); break; }
    case 'pasgt': { const tan = fabric('#b9a57d'); const d = add(gHemi(.132), tan, 0, .036, 0, head); d.scale.set(1.05, .9, 1.1); add(skirt('psk', [[.15, -.045], [.142, -.01], [.134, .036]]), tan, 0, 0, .01, head).scale.set(1.05, 1, 1.1); add(gLatheP('psv', [[.142, .03], [.134, .038]], 20, PI - .95, 1.9), tan, 0, 0, 0, head).scale.set(1.05, 1, 1.1); add(gBox(.2, .02, .02), M.dark, 0, .07, .14, head); add(gRBox(.14, .03, .05, .012), M.dark, 0, .1, -.07, head); break; } // cover band + goggles
    case 'shemagh': { const cl = fabric(Math.random() < .5 ? '#d9d2c2' : '#8a3a30'); const d = add(gHemi(.116), cl, 0, .03, .01, head); d.scale.set(1, 1.1, 1.04); add(skirt('shs', [[.13, -.12], [.122, -.04], [.116, .03]]), cl, 0, 0, .01, head); add(gRBox(.13, .07, .06, .03), cl, 0, -.06, -.07, head); add(gTorus(.108, .012), M.dark, 0, .075, 0, head).rotation.x = PI / 2; break; } // wrap + face veil
    case 'fast': case '6b47': {
      const cm = type === 'fast' ? camoMat('multicam') : camoMat('digital', '#9aa88a');
      const d = add(gHemi(.13), cm, 0, .04, 0, head); d.scale.set(1.05, .9, 1.1);
      if (type === 'fast') { for (const s of [-1, 1]) { add(gRBox(.02, .05, .12, .006), M.dark, s * .132, .05, 0, head); add(G.geo.gCylX(.034, .034, .03, 14), M.dark, s * .122, -.005, 0, head); } // ARC rails + comms headset cups
        add(gRBox(.05, .03, .03, .008), M.metal, 0, .085, -.125, head); add(gRBox(.09, .04, .06, .012), M.dark, 0, .095, -.16, head); add(gRBox(.05, .03, .05, .01), M.dark, 0, .11, .12, head); }
      else { add(skirt('6bs', [[.142, -.03], [.138, .0], [.132, .04]]), cm, 0, 0, 0, head).scale.set(1.05, 1, 1.1); add(gRBox(.16, .03, .05, .01), M.dark, 0, .1, -.07, head); }
      break; }
    case 'visor': { // Blackline PMC: ballistic helmet with full-face smoked visor
      const d = add(gHemi(.132), h, 0, .04, 0, head); d.scale.set(1.05, .9, 1.1);
      add(skirt('vsk', [[.14, -.02], [.136, .01], [.132, .04]]), h, 0, 0, 0, head).scale.set(1.05, 1, 1.1);
      const vis = add(new THREE.SphereGeometry(.124, 18, 12, PI * .65, PI * .7, PI * .28, PI * .5), G.mat({ color: '#101820', roughness: .05, metalness: .9, transparent: true, opacity: .88, side: THREE.DoubleSide }), 0, .02, -.004, head); vis.scale.set(1.02, 1, 1.05);
      for (const s of [-1, 1]) { add(G.geo.gCylX(.03, .03, .035, 14), M.dark, s * .13, -.005, 0, head); add(gRBox(.018, .05, .12, .006), M.dark, s * .137, .055, 0, head); }
      add(gRBox(.03, .02, .03, .006), G.mat({ color: '#ff3020', emissive: '#ff2010', emissiveIntensity: 2 }), .06, .1, .12, head); // IFF strobe
      break; }
    case 'gasmask': { // Rust Syndicate raider: hood, respirator with twin filters, round goggles
      const hood = fabric('#5a4636'); const d = add(gHemi(.124), hood, 0, .03, .012, head); d.scale.set(1.02, 1.1, 1.06);
      add(skirt('gsk', [[.14, -.13], [.13, -.04], [.124, .03]]), hood, 0, 0, .012, head);
      add(gRBox(.09, .075, .06, .025), mat('#20201e', .6), 0, -.035, -.1, head); // mask body
      for (const s of [-1, 1]) { const f = add(G.geo.gCyl(.024, .026, .045, 14), M.metal, s * .05, -.052, -.12, head); f.rotation.y = s * .5; add(G.geo.gCyl(.028, .028, .006, 14), mat('#7a3a1a', .6, .3), s * .058, -.052, -.14, head).rotation.y = s * .5; }
      for (const s of [-1, 1]) { add(G.geo.gCyl(.024, .024, .02, 16), M.metal, s * .036, .028, -.1, head); add(G.geo.gCyl(.02, .02, .004, 16), G.mat({ color: '#d06020', emissive: '#a03000', emissiveIntensity: .8, roughness: .1 }), s * .036, .028, -.112, head); }
      add(gRBox(.2, .02, .02, .008), M.leather, 0, .028, -.02, head); // goggle strap
      break; }
    case 'adrian': { const d = add(gHemi(.118), h, 0, .045, 0, head); d.scale.set(1, .8, 1.08); add(gLathe('adbrim', [[.17, .034], [.166, .04], [.12, .05], [.118, .046]], 24), h, 0, 0, 0, head).scale.set(1, 1, 1.12); add(gRBox(.012, .04, .2, .006), h, 0, .135, 0, head); break; } // crested French helmet
    case 'ach': { const d = add(gHemi(.13), h, 0, .036, 0, head); d.scale.set(1.04, .9, 1.1); add(skirt('achsk', [[.142, -.02], [.138, .005], [.132, .036]]), h, 0, 0, 0, head).scale.set(1.04, 1, 1.1); add(gLatheP('achv', [[.138, .03], [.132, .036]], 20, PI - .95, 1.9), h, 0, 0, 0, head); add(gRBox(.05, .03, .03, .008), M.metal, 0, .07, -.13, head); add(gRBox(.16, .03, .05, .01), M.dark, 0, .1, -.07, head); break; }
    case 'altyn': { const d = add(gHemi(.132), h, 0, .04, 0, head); d.scale.set(1.06, .95, 1.1); add(skirt('altsk', [[.15, -.09], [.146, -.03], [.138, .04]]), h, 0, 0, 0, head).scale.set(1.06, 1, 1.1);
      const v = add(new THREE.SphereGeometry(.13, 18, 10, PI * .66, PI * .68, PI * .3, PI * .42), G.mat({ color: '#3a4a48', roughness: .08, metalness: .6, transparent: true, opacity: .6, side: THREE.DoubleSide }), 0, .02, -.01, head); v.scale.set(1.05, 1, 1.08);
      add(gRBox(.18, .04, .03, .01), h, 0, .07, -.13, head); for (const sx of [-1, 1]) add(G.geo.gCylX(.018, .018, .02, 12), M.metal, sx * .14, .05, -.03, head); break; }
    case 'cap': { const d = add(gHemi(.108), h, 0, .05, .005, head); d.scale.set(1, .7, 1.05); add(gRBox(.12, .012, .07, .006), h, 0, .05, -.12, head); break; }
    case 'boonie': { const d = add(gHemi(.108), h, 0, .05, .005, head); d.scale.set(1, .85, 1.05); add(gCylY(.18, .185, .012, 22), h, 0, .052, 0, head); add(gTorus(.1, .01), M.dark, 0, .07, 0, head).rotation.x = PI / 2; break; }
    case 'beret': { const d = add(gSph(.11, 14), h, -.02, .09, .01, head); d.scale.set(1.05, .38, 1.05); d.rotation.z = .2; add(gTorus(.1, .01), M.leather, 0, .06, 0, head).rotation.x = PI / 2; add(gRBox(.02, .025, .006, .003), M.brass, .05, .09, -.09, head); break; }
    default: { const d = add(gHemi(.12), h, 0, .04, 0, head); d.scale.set(1, .85, 1.05); }
  }
}
function gear(era, team, S, M, add) {
  const g = M.gear;
  if (era === 'ww1' || era === 'ww2') {
    add(gRBox(.34, .05, .24, .02), g, 0, -.02, 0, S.spine); // belt
    add(gRBox(.05, .04, .012, .006), M.metal, 0, -.02, -.122, S.spine); // buckle
    const pouches = team === 1 ? 3 : 2;
    for (const s of [-1, 1]) for (let i = 0; i < pouches; i++) add(gRBox(.055, .065, .05, .012), g, s * (.07 + i * .045), -.02, -.125 + i * .012, S.spine); // cartridge pouches
    for (const s of [-1, 1]) { const st = add(gBox(.035, .28, .014), g, s * .09, .03, -.128, S.chest); st.rotation.z = s * .12; const bk = add(gBox(.035, .28, .014), g, s * .09, .03, .126, S.chest); bk.rotation.z = -s * .12; } // Y-straps
    if (era === 'ww1' && team === 0 || era === 'ww2' && team === 0) add(gRBox(.26, .28, .11, .04), g, 0, .02, .165, S.chest); // pack
    add(gCylY(.042, .042, .14, 12), M.metal, .17, -.08, .05, S.spine); // canteen
    add(gRBox(.05, .16, .03, .01), M.leather, -.17, -.11, .04, S.spine).rotation.z = .1; // bayonet frog
    if (team === 1) { const gm = add(G.geo.gCyl(.05, .05, .26, 16), fabric('#5d6254'), -.08, -.06, .14, S.spine); gm.rotation.z = PI / 2 - .3; gm.rotation.y = .2; add(G.geo.gCyl(.052, .052, .02, 16), M.metal, -.2, -.02, .17, S.spine).rotation.z = PI / 2 - .3; } // gas-mask canister
    add(gRBox(.12, .2, .05, .02), g, .1, -.14, .14, S.spine).rotation.x = .2; // entrenching tool
  } else if (era === 'cold') {
    add(gRBox(.34, .05, .24, .02), g, 0, -.02, 0, S.spine);
    for (const s of [-1, 1]) add(gRBox(.08, .1, .06, .015), g, s * .11, -.03, -.125, S.spine);
    add(gRBox(.28, .32, .13, .04), g, 0, 0, .175, S.chest);
    if (team === 1) { add(gRBox(.24, .17, .055, .02), g, 0, -.02, -.13, S.chest); for (let i = -1; i <= 1; i++) add(gRBox(.07, .06, .01, .006), g, i * .075, .02, -.16, S.chest); } // chest rig with mag pockets
    else { add(G.geo.gCyl(.03, .03, .14, 10), mat('#4a4e36', .6, .3), -.08, .02, -.14, S.chest).rotation.z = PI / 2; } // smoke grenade
  } else if (era === 'mod') {
    const vest = team === 0 ? fabric('#b9a57d') : g;
    add(gRBox(.44, .36, .29, .06), vest, 0, .02, 0, S.chest); // IBA vest
    for (let i = -1; i <= 1; i++) { add(gRBox(.08, .12, .05, .015), team === 0 ? fabric('#a8966f') : M.dark, i * .1, -.02, -.165, S.chest); add(gBox(.06, .005, .052), M.dark, i * .1, .035, -.166, S.chest); }
    if (team === 0) { add(gRBox(.2, .06, .08, .02), fabric('#a8966f'), 0, .16, -.16, S.chest); for (const s of [-1, 1]) add(gRBox(.12, .1, .14, .03), vest, s * .19, .11, 0, S.chest); } // collar + shoulder protectors
    else { add(gRBox(.3, .05, .06, .02), M.leather, 0, -.05, -.15, S.spine); }
  } else if (era === 'now') {
    const pc = team === 0 ? camoMat('multicam') : camoMat('digital', '#9aa88a');
    add(gRBox(.42, .32, .28, .05), pc, 0, .03, 0, S.chest); // plate carrier
    for (let r = 0; r < 3; r++) add(gBox(.36, .006, .01), M.dark, 0, -.05 + r * .05, -.143, S.chest); // MOLLE webbing
    for (let i = -1; i <= 1; i++) { add(gRBox(.082, .13, .05, .015), pc, i * .1, -.04, -.165, S.chest); add(gRBox(.084, .03, .054, .01), pc, i * .1, .026, -.166, S.chest); } // triple mag pouch with flaps
    add(gRBox(.08, .14, .06, .02), M.dark, .16, .02, .17, S.chest); // radio
    const ant = add(gCylY(.004, .004, .45, 5), M.dark, .18, .3, .18, S.chest); ant.rotation.z = -.15;
    add(gRBox(.26, .22, .08, .03), pc, 0, .0, .19, S.chest); // back panel
    add(gRBox(.4, .06, .26, .02), M.dark, 0, -.03, 0, S.spine); // battle belt
    add(gRBox(.07, .1, .05, .015), pc, -.17, -.06, -.05, S.spine); // IFAK
    add(gRBox(.03, .12, .06, .01), M.dark, .19, -.12, .0, S.spine); // drop holster
    add(G.geo.gCyl(.028, .028, .09, 10), mat('#3a4030', .6, .3), -.12, .1, -.17, S.chest); // grenade
  } else if (era === 'psycho') {
    if (team === 0) { // Blackline: slick black plate carrier, hard shoulder armour, glowing IFF panel
      const pc = fabric('#1c1e22', .8);
      add(gRBox(.44, .34, .3, .05), pc, 0, .03, 0, S.chest);
      for (const s of [-1, 1]) { const sp = add(gRBox(.14, .09, .16, .04), mat('#2a2d32', .5, .4), s * .2, .15, 0, S.chest); sp.rotation.z = s * .35; }
      for (let i = -1; i <= 1; i++) add(gRBox(.08, .13, .05, .015), pc, i * .1, -.04, -.17, S.chest);
      add(gRBox(.12, .03, .01, .005), G.mat({ color: '#30d0ff', emissive: '#10a0ff', emissiveIntensity: 1.5 }), 0, .12, -.156, S.chest);
      add(gRBox(.4, .06, .26, .02), M.dark, 0, -.03, 0, S.spine);
      add(gRBox(.24, .3, .12, .03), pc, 0, .02, .19, S.chest); // hydration/battery pack
    } else { // Rust Syndicate: scrap-plate armour, bandoliers, spiked pauldron, tyre-rubber padding
      const rust = mat('#6a3a22', .7, .5), rub = mat('#1a1a1a', .95);
      add(gRBox(.3, .24, .05, .02), rust, 0, .06, -.14, S.chest); // chest plate
      for (let i = 0; i < 4; i++) add(gSph(.008, 6), M.metal, (i % 2 ? .1 : -.1), .15 - (i >> 1) * .16, -.168, S.chest); // rivets
      const band = add(gBox(.05, .5, .03), M.leather, 0, .05, -.15, S.chest); band.rotation.z = .6; // bandolier
      for (let i = 0; i < 7; i++) { const sh = add(G.geo.gCyl(.009, .009, .045, 8), mat('#b02a1a', .5), -.12 + i * .04, -.08 + i * .045, -.17, S.chest); sh.rotation.z = .6; }
      const pa = add(gSph(.09, 12), rust, -.21, .16, 0, S.chest); pa.scale.set(1, .6, 1);
      for (let i = 0; i < 3; i++) { const sp = add(G.geo.gCyl(.001, .012, .05, 6), M.metal, -.23, .21, -.04 + i * .04, S.chest); sp.rotation.z = .4; }
      add(gRBox(.36, .06, .25, .02), rub, 0, -.03, 0, S.spine);
      add(gRBox(.2, .22, .1, .04), fabric('#5a4636'), 0, .02, .18, S.chest);
    }
  }
}

// ------------------------------------------------------------------ IK
// place a unit-length lathe/cylinder (along Y, spanning -.5..+.5) between a and b
function orient(mesh, a, b) {
  tC.subVectors(b, a); const len = tC.length();
  mesh.position.copy(a).addScaledVector(tC, .5);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(Yup, tC.divideScalar(len || 1));
}
// two-bone chain in root space; the hand is oriented along the forearm
function solveArm(arm, target, pole, root) {
  const up = .29, lo = .27;
  const s = arm.sh.getWorldPosition(tA); root.worldToLocal(s);
  tB.subVectors(target, s); let d = tB.length();
  d = Math.max(.08, Math.min(d, up + lo - .001)); tB.setLength(d);
  const t = tA.clone().add(tB);
  const a = Math.acos(clamp((up * up + d * d - lo * lo) / (2 * up * d), -1, 1));
  const dir = tB.clone().normalize();
  const side = new THREE.Vector3().crossVectors(dir, pole).normalize();
  const bendAxis = new THREE.Vector3().crossVectors(side, dir).normalize();
  const elbow = tA.clone().addScaledVector(dir, Math.cos(a) * up).addScaledVector(bendAxis, Math.sin(a) * up);
  orient(arm.upper, tA, elbow); orient(arm.fore, elbow, t);
  arm.elbow.position.copy(elbow);
  arm.hand.position.copy(t);
  tD.subVectors(t, elbow).normalize(); arm.hand.quaternion.setFromUnitVectors(Yup, tD);
}
function toRoot(S, obj, v) { obj.localToWorld(v); return S.root.worldToLocal(v); }

// ------------------------------------------------------------------ animation
// state = { dt, speed (m/s), crouch 0..1, aimPitch rad, aim (bool, default true), recoil, reload 0..1 (or <0), sprint }
G.animateSoldier = function (S, st) {
  const dt = Math.min(.1, st.dt || .016);
  if (S.dead > 0) { deathAnim(S, dt); return; }
  const R = S.root;
  // --- local movement direction from root motion (forward is -z)
  if (!S._lp) { S._lp = R.position.clone(); S._ly = R.rotation.y; }
  const dx = R.position.x - S._lp.x, dz = R.position.z - S._lp.z; S._lp.copy(R.position);
  let dyaw = R.rotation.y - S._ly; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); S._ly = R.rotation.y;
  const turn = dyaw / dt;
  const cy = Math.cos(R.rotation.y), sy = Math.sin(R.rotation.y);
  const lx = dx * cy - dz * sy, lz = dx * sy + dz * cy, md = Math.hypot(lx, lz);
  const spd = st.speed || 0;
  let fwd = 1, side = 0; if (md > 1e-4 && spd > .2) { fwd = -lz / md; side = lx / md; }
  S._fwd = approach(S._fwd === undefined ? 1 : S._fwd, fwd, 6, dt); S._side = approach(S._side || 0, side, 6, dt);
  // --- gait parameters
  S.crouch = approach(S.crouch, st.crouch || 0, 7, dt);
  const cr = S.crouch;
  const run = clamp((spd - 2.6) / 2, 0, 1);
  const turning = spd < .2 && Math.abs(turn) > 1.2;
  const freq = spd > .15 ? (.85 + spd * .3) * (cr > .5 ? .8 : 1) : turning ? 1.3 : 0;
  S.walkPhase += dt * freq * 2 * PI;
  S._amp = approach(S._amp || 0, spd > .15 ? clamp(spd / 1.4, 0, 1) : turning ? .3 : 0, 8, dt);
  S._spr = approach(S._spr || 0, st.sprint ? 1 : 0, 6, dt);
  const amp = S._amp, ph = S.walkPhase, f = turning ? 0 : S._fwd, sd = turning ? Math.sign(turn) * .6 : S._side;
  S.breath += dt * (1.5 + run * 2);
  const idle = 1 - clamp(spd / 1.2, 0, 1);
  S.flinch = Math.max(0, S.flinch - dt * 3);
  const fl = Math.sin(Math.min(1, S.flinch) * PI) * Math.min(1, S.flinch);
  // kneel (idle crouch) vs crouch-walk blend
  const kneel = cr * (1 - amp), cwalk = cr * amp;
  // --- legs
  for (const L of S.legs) {
    const p = ph + (L.side > 0 ? PI : 0);
    const sw = Math.sin(p), cw = Math.cos(p), swing = Math.max(0, cw * Math.sign(f || 1));
    const hipA = (.4 + .3 * run) * amp;
    let hip = sw * hipA * f;
    let knee = (swing * swing * (.8 + .75 * run) + .06 + Math.max(0, -sw * f) * .12 * run) * amp;
    let ank = -Math.sin(p + .6) * .2 * amp;
    let abd = -sw * .22 * amp * sd;
    // crouch-walk: deep flexion added to the gait
    hip += cwalk * .75; knee += cwalk * 1.05;
    // kneeling: left foot planted forward, right knee on the ground
    const kh = L.side < 0 ? 1.45 : -.05, kk = L.side < 0 ? 1.45 : 1.55;
    hip = lerp(hip, kh, kneel); knee = lerp(knee, kk, kneel);
    // idle weight shift: one knee relaxed
    knee += idle * (1 - cr) * (L.side > 0 ? .06 + Math.sin(S.breath * .21) * .04 : .02);
    L.hip.rotation.set(hip, 0, abd + (-L.side * .03) * idle * (1 - cr));
    L.knee.rotation.x = -knee;
    // keep the sole roughly flat; kneeling rear foot rests on its toes
    ank += (knee - hip) * .75;
    if (L.side > 0) ank = lerp(ank, 1.1, kneel);
    L.ankle.rotation.x = ank;
  }
  // --- pelvis: height, bob, sway, yaw
  const bob = (Math.cos(2 * ph) * .016 * (1 + run * 1.5) - .012 * run) * amp;
  S.hips.position.y = .96 - kneel * .4 - cwalk * .26 + bob + Math.sin(S.breath * .5) * .003 * idle;
  S.hips.position.x = Math.sin(ph) * .02 * amp * (1 - run * .5) + Math.sin(S.breath * .21) * .014 * idle;
  S.hips.position.z = fl * .05;
  S.hips.rotation.y = Math.sin(ph) * .12 * amp * f;
  S.hips.rotation.z = Math.sin(ph) * .035 * amp;
  // --- spine: lean into the run, counter-rotate against the pelvis, flinch
  const lean = -(.05 * amp + .16 * run + .12 * S._spr) + cr * .1;
  S.spine.rotation.x = lean - fl * .3;
  S.spine.rotation.y = -S.hips.rotation.y * .7 + fl * .35 * S.flinchDir;
  S.spine.rotation.z = -S.hips.rotation.z * .8 + fl * .18 * S.flinchDir;
  // --- chest: carries the weapon, so it cancels the lean/twist and follows the aim pitch
  S.aimPitch = approach(S.aimPitch, st.aimPitch || 0, 10, dt);
  const breathe = Math.sin(S.breath) * .012 * (idle + run);
  S.chest.rotation.x = S.aimPitch - S.spine.rotation.x - cr * .05 + (st.recoil || 0) * .07 + breathe;
  S.chest.rotation.y = -(S.hips.rotation.y + S.spine.rotation.y) + fl * .2 * S.flinchDir;
  S.chest.rotation.z = -(S.hips.rotation.z + S.spine.rotation.z) * .8;
  // --- head: stabilised, looks around when idle and not aiming
  const aiming = st.aim !== false;
  S.lookT -= dt; if (S.lookT <= 0) { S.lookT = 1.5 + Math.random() * 3; S.lookTgt = aiming ? 0 : (Math.random() - .5) * 1.1; }
  S.look = approach(S.look, S.lookTgt, 3, dt);
  const rl = st.reload !== undefined && st.reload >= 0 ? st.reload : -1;
  const rk = rl >= 0 ? Math.sin(Math.min(1, rl) * PI) : 0;
  S.neck.rotation.set(-S.aimPitch * .25 + fl * .35 - rk * .35 - Math.sin(ph * 2) * .02 * amp, S.look * (1 - rk) - S.chest.rotation.y * .3, 0);
  S.head.rotation.set(-rk * .15, S.look * .3, fl * .15 * S.flinchDir);
  // --- weapon holder pose: aimed / low ready / sprint / reload
  if (S.gun) {
    const H = S.gun.holder, home = S.gun.home, pst = S.gun.pistol, gp = S.g;
    let t = { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 };
    if (!aiming && rl < 0) t = pst ? { rx: -.9, ry: 0, rz: 0, px: .02, py: -.2, pz: .2 } : { rx: -.42, ry: .18, rz: .12, px: -.03, py: -.03, pz: .03 };
    if (S._spr > .01 && rl < 0) { const k = S._spr; const sp = pst ? { rx: -1.1, ry: 0, rz: 0, px: .05, py: -.26, pz: .26 } : { rx: -.8, ry: .75, rz: .45, px: -.12, py: -.07, pz: .02 }; for (const key in t) t[key] = lerp(t[key], sp[key], k); }
    if (rl >= 0) t = pst ? { rx: .35 * rk, ry: .2 * rk, rz: .5 * rk, px: -.04 * rk, py: -.03 * rk, pz: .1 * rk } : { rx: -.25 * rk, ry: -.35 * rk, rz: .6 * rk, px: -.06 * rk, py: -.05 * rk, pz: .06 * rk };
    for (const key in t) gp[key] = approach(gp[key], t[key], 9, dt);
    const rc = st.recoil || 0;
    H.rotation.set(home.rot.x + gp.rx - rc * .1, home.rot.y + gp.ry, home.rot.z + gp.rz + Math.sin(ph) * .02 * amp);
    H.position.set(home.pos.x + gp.px, home.pos.y + gp.py + bob * .5, home.pos.z + gp.pz + rc * .035);
  }
  // --- arms: IK to the weapon; the support hand runs the reload path
  R.updateMatrixWorld(true);
  if (S.gun) {
    const H = S.gun.holder;
    const grip = toRoot(S, H, S.gripLocal.clone());
    let hgL = S.hgLocal.clone();
    if (rl >= 0 && !S.gun.pistol) {
      const mag = S.magLocal, pouch = H.worldToLocal(S.chest.localToWorld(new THREE.Vector3(-.1, -.02, -.2))), ch = S.chargeLocal;
      const keys = [[0, hgL], [.14, mag], [.28, mag.clone().add(new THREE.Vector3(0, -.12, .04))], [.42, pouch], [.56, mag.clone().add(new THREE.Vector3(0, -.1, .02))], [.68, mag], [.8, ch], [.88, ch.clone().add(new THREE.Vector3(0, 0, .06))], [1, hgL]];
      for (let i = 0; i < keys.length - 1; i++) if (rl >= keys[i][0] && rl <= keys[i + 1][0]) { hgL = keys[i][1].clone().lerp(keys[i + 1][1], ease(seg(rl, keys[i][0], keys[i + 1][0]))); break; }
    } else if (rl >= 0) { // pistol: hand to the pouch and back under the grip
      const pouch = H.worldToLocal(S.chest.localToWorld(new THREE.Vector3(-.12, -.18, -.18)));
      const k = rl < .5 ? ease(seg(rl, .15, .4)) : 1 - ease(seg(rl, .55, .85)); hgL.lerp(pouch, k);
    }
    const hg = toRoot(S, H, hgL);
    solveArm(S.arms[1], grip, tD.set(.3, -1, .4).normalize(), R);
    solveArm(S.arms[0], hg, tD.set(-.6, -1, -.2).normalize(), R);
  } else {
    for (const a of S.arms) { const s = a.sh.getWorldPosition(tA); R.worldToLocal(s); const sw = Math.sin(ph + (a.side > 0 ? 0 : PI)) * .18 * amp; solveArm(a, s.clone().add(new THREE.Vector3(a.side * .06, -.52, -sw)), tD.set(0, 0, -1), R); }
  }
};

// hostage pose: kneeling, hands clasped behind the head, head bowed
G.poseHostage = function (S) {
  for (const L of S.legs) { L.hip.rotation.set(-.05, 0, -L.side * .1); L.knee.rotation.x = -1.6; L.ankle.rotation.x = 1.1; }
  S.hips.position.set(0, .56, 0); S.spine.rotation.set(-.12, 0, 0); S.chest.rotation.set(0, 0, 0); S.neck.rotation.set(.35, 0, 0);
  S.root.updateMatrixWorld(true);
  for (const A of S.arms) { const t = S.head.localToWorld(new THREE.Vector3(A.side * .07, .05, .1)); S.root.worldToLocal(t); solveArm(A, t, tD.set(A.side, .2, -.4).normalize(), S.root); }
};
// seated pose (vehicle crew)
G.poseSeated = function (S) {
  for (const L of S.legs) { L.hip.rotation.set(1.45, 0, -L.side * .08); L.knee.rotation.x = -1.4; L.ankle.rotation.x = -.05; }
  S.hips.position.y = .96;
};

// return a soldier to its standing, armed state (after death / range reset)
G.resetSoldier = function (S) {
  S.dead = 0; S.deathKind = null; S._di = null; S.flinch = 0; S.headshot = false;
  S.root.rotation.x = 0; S.root.rotation.z = 0;
  S.hips.position.set(0, .96, 0); S.hips.rotation.set(0, 0, 0);
  for (const b of [S.spine, S.chest, S.neck, S.head]) b.rotation.set(0, 0, 0);
  for (const L of S.legs) { L.hip.rotation.set(0, 0, 0); L.knee.rotation.set(0, 0, 0); L.ankle.rotation.set(0, 0, 0); }
  if (S.gun) { const H = S.gun.holder; if (H.parent !== S.chest) { if (H.parent) H.parent.remove(H); S.chest.add(H); } H.position.copy(S.gun.home.pos); H.rotation.copy(S.gun.home.rot); H.visible = true; }
  for (const k in S.g) S.g[k] = 0;
  S._lp = null;
};

// ------------------------------------------------------------------ deaths
// Staged, ragdoll-style deaths. Kinds: fall (buckle then topple along the hit direction),
// back (stagger back, arms flung, fall backwards), knees (drop to the knees, slump, pitch forward),
// limp (headshot: instant collapse), spin (twist and fall sideways). The weapon is dropped and
// tumbles to the ground; the arms go limp under gravity.
function deathAnim(S, dt) {
  const first = !S._di;
  S.dead += dt;
  if (first) {
    if (!S.deathKind) S.deathKind = S.headshot ? 'limp' : ['fall', 'fall', 'knees', 'back', 'spin'][Math.floor(Math.random() * 5)];
    const d = S.deathDir, a = Math.atan2(d.x || 0, -(d.z || -1));
    // snap the fall to a cardinal direction so the body lands cleanly
    let dirK = Math.round(a / (PI / 2)) & 3; // 0 fwd, 1 right, 2 back, 3 left
    if (S.deathKind === 'back') dirK = 2; if (S.deathKind === 'knees') dirK = 0;
    if (S.deathKind === 'spin') dirK = Math.random() < .5 ? 1 : 3;
    S._di = { dirK, hipY: S.hips.position.y, spin: (Math.random() < .5 ? -1 : 1), headTurn: (Math.random() - .5) * 1.6, arms: S.arms.map(A => A.hand.position.clone()), gunT: 0 };
    // drop the weapon into the world
    if (S.gun && S.root.parent) {
      const H = S.gun.holder; S.root.parent.attach(H);
      S._di.gv = new THREE.Vector3((Math.random() - .5) * 1.2, .8, (Math.random() - .5) * 1.2).applyQuaternion(S.root.quaternion);
      S._di.gw = new THREE.Vector3((Math.random() - .5) * 6, (Math.random() - .5) * 4, (Math.random() - .5) * 6);
      S._di.ground = S.root.position.y;
    }
  }
  const D = S._di, k = S.deathKind, t = S.dead;
  let tilt = 0, drop = 0, kneeF = 0, hipF = 0, lean = 0, twist = 0, armUp = 0, stag = 0;
  if (k === 'fall') {
    const b = ease(seg(t, 0, .35)), f = fall(seg(t, .22, .85));
    kneeF = .9 * b * (1 - f) + .25 * f; hipF = .55 * b * (1 - f) + .1 * f; drop = .24 * b * (1 - f); lean = -.35 * b; tilt = f * (PI / 2 - .04);
  } else if (k === 'back') {
    const s = ease(seg(t, 0, .3)), f = fall(seg(t, .2, .8));
    stag = .12 * s; lean = .35 * s; armUp = s * (1 - seg(t, .8, 1.2) * .6); kneeF = .5 * s * (1 - f) + .15; hipF = .3 * s * (1 - f); drop = .12 * s * (1 - f); tilt = f * (PI / 2 - .04);
  } else if (k === 'knees') {
    const kn = ease(seg(t, 0, .5)), f = fall(seg(t, .95, 1.55));
    kneeF = 1.55 * kn * (1 - f) + .3 * f; hipF = -.05 * kn * (1 - f) + .1 * f; drop = .4 * kn * (1 - f); lean = -.3 * kn; tilt = f * (PI / 2 - .04);
  } else if (k === 'limp') {
    const b = ease(seg(t, 0, .22)), f = fall(seg(t, .12, .6));
    kneeF = 1.3 * b * (1 - f) + .4 * f; hipF = .6 * b * (1 - f) + .2 * f; drop = .45 * b * (1 - f); lean = -.5 * b; tilt = f * (PI / 2 - .04);
  } else { // spin
    const s = ease(seg(t, 0, .55)), f = fall(seg(t, .25, .9));
    twist = s * 1.3 * D.spin; kneeF = .7 * s * (1 - f) + .2; hipF = .4 * s * (1 - f); drop = .2 * s * (1 - f); tilt = f * (PI / 2 - .04);
  }
  // landing bounce
  const land = { fall: .85, back: .8, knees: 1.55, limp: .6, spin: .9 }[k];
  const bounce = t > land && t < land + .35 ? Math.sin((t - land) / .35 * PI) * .05 * (1 - (t - land) / .35) : 0;
  tilt = Math.max(0, tilt - bounce);
  // root orientation: rotate about the feet toward the fall direction
  const dk = D.dirK;
  const rx = dk === 0 ? -tilt : dk === 2 ? tilt : 0, rz = dk === 1 ? -tilt : dk === 3 ? tilt : 0;
  S.root.rotation.x = rx; S.root.rotation.z = rz;
  // lift the body so it rests on its back/front instead of sinking into the ground
  const lift = (tilt / (PI / 2)) * .11;
  S.hips.position.set(dk === 1 ? -lift : dk === 3 ? lift : 0, D.hipY - drop, dk === 0 ? lift : dk === 2 ? -lift : 0);
  S.hips.position.z += stag;
  S.hips.rotation.set(0, twist, 0);
  for (const L of S.legs) {
    const sideK = L.side > 0 ? 1 : .7;
    L.hip.rotation.set(hipF * sideK + (k === 'back' ? -.1 : 0), 0, L.side * .06 * seg(t, .5, 1));
    L.knee.rotation.x = -kneeF * sideK; L.ankle.rotation.x = kneeF * .4;
  }
  S.spine.rotation.set(lean, twist * .3, 0);
  S.chest.rotation.set(lean * .5, 0, 0);
  const headLoose = ease(seg(t, .3, 1));
  S.neck.rotation.set(-lean * .6 + (k === 'limp' ? .5 : .2) * headLoose, D.headTurn * headLoose, D.headTurn * .4 * headLoose);
  S.head.rotation.set(0, 0, 0);
  // limp arms: blend from the last pose toward gravity (world down in root space), flung up for 'back'
  S.root.updateMatrixWorld(true);
  const down = S.root.worldToLocal(S.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -1, 0))).normalize();
  S.arms.forEach((A, i) => {
    const sh = A.sh.getWorldPosition(new THREE.Vector3()); S.root.worldToLocal(sh);
    const limp = sh.clone().addScaledVector(down, .5).add(new THREE.Vector3(A.side * .12, 0, (i ? -.05 : .05)));
    const flung = sh.clone().add(new THREE.Vector3(A.side * .35, .35, .1));
    const target = limp.lerp(flung, armUp * (1 - seg(t, .7, 1.1)));
    const w = ease(seg(t, 0, .35));
    solveArm(A, D.arms[i].clone().lerp(target, w), tD.set(A.side * .5, -1, .3).normalize(), S.root);
  });
  // dropped weapon: tumble and settle flat on the ground
  if (S.gun && D.gv) {
    const H = S.gun.holder;
    if (!D.gunRest) {
      D.gv.y -= 9.81 * dt; H.position.addScaledVector(D.gv, dt);
      H.rotation.x += D.gw.x * dt; H.rotation.y += D.gw.y * dt; H.rotation.z += D.gw.z * dt;
      if (H.position.y <= D.ground + .04) { H.position.y = D.ground + .04; D.gunRest = true; D.restRot = new THREE.Euler(0, H.rotation.y, Math.random() < .5 ? PI / 2 : -PI / 2); }
    } else {
      H.rotation.x = approach(H.rotation.x, 0, 10, dt); H.rotation.z = approach(H.rotation.z, D.restRot.z, 10, dt);
    }
  }
}

// ------------------------------------------------------------------ hitboxes
// Returns capsules in world space: [{a, b, r, zone}]
G.soldierHitboxes = function (S) {
  const H = S._hb || (S._hb = { head: { a: new THREE.Vector3(), b: new THREE.Vector3(), r: .12, zone: 'head' }, chest: { a: new THREE.Vector3(), b: new THREE.Vector3(), r: .2, zone: 'chest' }, gut: { a: new THREE.Vector3(), b: new THREE.Vector3(), r: .18, zone: 'stomach' }, legs: [0, 1].map(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), r: .09, zone: 'leg' })), arms: [0, 1].map(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), r: .065, zone: 'arm' })) });
  S.head.localToWorld(H.head.a.set(0, -.04, 0)); S.head.localToWorld(H.head.b.set(0, .08, 0));
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
