// ============================================================================
// Procedural weapon modeler.
// Coordinates: bore axis on y = 0, trigger at z = 0, muzzle toward -Z.
// Returns a rig: { root, bolt, slide, pump, lever, mag, trigger, hammer, cyl,
//   muzzle, eject, sightH, sightZ, eyeDist, grip, hg, magPos, lens, ... }
// ============================================================================
'use strict';
(function () {
const G = window.G;
const PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- geometry
const GC = new Map();
function cached(key, fn) { let g = GC.get(key); if (!g) { g = fn(); GC.set(key, g); } return g; }
const r4 = v => Math.round(v * 10000) / 10000;
function gBox(w, h, d) { return cached(`b${r4(w)},${r4(h)},${r4(d)}`, () => new THREE.BoxGeometry(w, h, d)); }
function gCyl(rr, rf, len, seg = 18, open = false) {
  return cached(`c${r4(rr)},${r4(rf)},${r4(len)},${seg},${open}`, () => { const g = new THREE.CylinderGeometry(rr, rf, len, seg, 1, open); g.rotateX(PI / 2); return g; });
}
function gCylY(r1, r2, len, seg = 16) { return cached(`cy${r4(r1)},${r4(r2)},${r4(len)},${seg}`, () => new THREE.CylinderGeometry(r1, r2, len, seg)); }
function gCylX(r1, r2, len, seg = 16) { return cached(`cx${r4(r1)},${r4(r2)},${r4(len)},${seg}`, () => { const g = new THREE.CylinderGeometry(r1, r2, len, seg); g.rotateZ(PI / 2); return g; }); }
function gSph(r, seg = 12) { return cached(`s${r4(r)},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1))); }
function gTor(R, r, arc = PI * 2) { return cached(`t${r4(R)},${r4(r)},${r4(arc)}`, () => new THREE.TorusGeometry(R, r, 6, 20, arc)); }
function roundRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
// rounded box, length along z
function gRBox(w, h, d, r) {
  return cached(`rb${r4(w)},${r4(h)},${r4(d)},${r4(r)}`, () => {
    const g = new THREE.ExtrudeGeometry(roundRect(w, h, r), { depth: d, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, 0, -d / 2); return g;
  });
}
// side profile [[z,y],...] extruded across x with width w
function gProf(pts, w, bev = .003, smooth = false, key) {
  const k = key || ('pf' + pts.map(p => r4(p[0]) + ':' + r4(p[1])).join('|') + w + bev + smooth);
  return cached(k, () => {
    const s = new THREE.Shape();
    if (smooth) { s.moveTo(pts[0][0], pts[0][1]); s.splineThru(pts.slice(1).concat([pts[0]]).map(p => new THREE.Vector2(p[0], p[1]))); }
    else { // every corner gets a small fillet so stocks, grips and magazines read as machined/moulded parts
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
        const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
        const r = Math.min(.005, da * .35, db * .35);
        const p1 = [p[0] + (a[0] - p[0]) / (da || 1) * r, p[1] + (a[1] - p[1]) / (da || 1) * r], p2 = [p[0] + (b[0] - p[0]) / (db || 1) * r, p[1] + (b[1] - p[1]) / (db || 1) * r];
        if (i === 0) s.moveTo(p1[0], p1[1]); else s.lineTo(p1[0], p1[1]);
        s.quadraticCurveTo(p[0], p[1], p2[0], p2[1]);
      }
      s.closePath();
    }
    bev = Math.min(bev, w * .3);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.001, w - bev * 2), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 10 });
    g.rotateY(-PI / 2); g.translate((w - bev * 2) / 2, 0, 0); g.computeVertexNormals(); return g;
  });
}
G.geo = { gBox, gCyl, gCylY, gCylX, gSph, gTor, gRBox, gProf };

// ---------------------------------------------------------------- materials
G.texHazard = function () {
  if (G._haz) return G._haz;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#e8b818'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#141414';
  for (let i = -64; i < 128; i += 22) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 11, 0); x.lineTo(i + 11 - 64, 64); x.lineTo(i - 64, 64); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.encoding = THREE.sRGBEncoding;
  return (G._haz = t);
};
G.gunMaterials = function (wp, S) {
  const m = wp.m, fin = S.fin;
  const CAMOS = ['woodland', 'desert', 'multicam', 'tiger', 'digital', 'splinter'];
  let metalCol = G.metalColors[m.mt] || G.metalColors.blued;
  const brushed = G.texBrushed(1);
  let metalRough = m.mt === 'park' ? .62 : m.mt === 'black' ? .5 : m.mt === 'stainless' ? .25 : .36, metalMet = .88;
  let metalMap = null;
  if (fin && G.metalColors[fin]) { metalCol = G.metalColors[fin]; }
  if (fin === 'gold') { metalRough = .22; metalMet = 1; }
  if (fin === 'nickel') { metalRough = .18; metalMet = 1; }
  if (fin === 'park') metalRough = .62;
  if (fin === 'fde' || fin === 'odc' || fin === 'tungsten') { metalRough = .6; metalMet = .4; }
  if (fin === 'engraved') { metalMap = G.texEngraved(); metalCol = '#ffffff'; metalRough = .35; }
  if (fin === 'whitewash') { metalRough = .9; metalMet = .1; }
  if (fin === 'chrome') { metalCol = '#d8dbe0'; metalRough = .06; metalMet = 1; }
  if (fin === 'crimson') { metalCol = '#5a0c10'; metalRough = .3; }
  if (fin === 'hazard') { metalCol = '#141414'; metalRough = .5; }
  if (fin === 'rust') { metalCol = '#6a3a22'; metalRough = .85; metalMet = .4; }
  const camo = CAMOS.includes(fin) ? G.texCamo(fin) : null;
  const metal = new THREE.MeshStandardMaterial({ color: camo ? '#ffffff' : metalCol, map: camo || metalMap, metalness: camo ? .3 : metalMet, roughness: camo ? .7 : metalRough, roughnessMap: camo ? null : brushed, bumpMap: brushed, bumpScale: .00018 });
  const steel = new THREE.MeshStandardMaterial({ color: fin === 'gold' ? '#caa040' : '#3b3f44', metalness: .92, roughness: .3, roughnessMap: brushed });
  const bright = new THREE.MeshStandardMaterial({ color: '#8d9197', metalness: 1, roughness: .22 });
  let wood;
  if (m.wd) {
    const wt = G.texWood(m.wd).clone(); wt.needsUpdate = true; wt.repeat.set(2.5, 2.5);
    wood = new THREE.MeshStandardMaterial({ color: fin === 'whitewash' ? '#e0ddd5' : '#ffffff', map: camo || (fin === 'whitewash' ? null : wt), roughness: .52, metalness: 0, bumpMap: wt, bumpScale: .00035 });
  }
  const polyCols = { bone: '#cfc6ae', crimson: '#6a1418', hazard: '#ffffff', black: '#1d1e1f', tan: '#a08c68', od: '#4f5638', plum: '#5e2a28', bakelite: '#4a2418', g36: '#2a2c2c', fde: '#8b7454', coyote: '#806a4a', ral8000: '#86704f', green: '#3d4a2e' };
  let polyCol = polyCols[m.pl] || polyCols.black;
  if (fin === 'fde') polyCol = '#8b7454'; if (fin === 'odc') polyCol = '#4f553b'; if (fin === 'tungsten') polyCol = '#4d545c';
  if (fin === 'whitewash') polyCol = '#dedad0'; if (fin === 'gold') polyCol = '#1d1e1f';
  if (fin === 'chrome') polyCol = '#1d1e1f'; if (fin === 'crimson') polyCol = '#6a1418'; if (fin === 'rust') polyCol = '#5a3a26';
  const hazardPoly = !camo && (fin === 'hazard' || (m.pl === 'hazard' && !fin));
  if (!hazardPoly && polyCol === '#ffffff') polyCol = '#1d1e1f';
  const poly = new THREE.MeshStandardMaterial({ color: camo || hazardPoly ? '#ffffff' : polyCol, map: camo || (hazardPoly ? G.texHazard() : null), roughness: m.pl === 'bakelite' ? .45 : .78, metalness: .02, bumpMap: G.texStipple(), bumpScale: .0006 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#151515', roughness: .95, metalness: 0 });
  const brass = new THREE.MeshStandardMaterial({ color: '#b98e3c', metalness: 1, roughness: .28 });
  const copper = new THREE.MeshStandardMaterial({ color: '#b26a3c', metalness: 1, roughness: .3 });
  const glass = new THREE.MeshStandardMaterial({ color: '#0e1b26', metalness: .9, roughness: .04, transparent: true, opacity: .72 });
  const lensRed = new THREE.MeshStandardMaterial({ color: '#c89a70', metalness: .6, roughness: .02, transparent: true, opacity: .1, depthWrite: false });
  const lensClear = new THREE.MeshStandardMaterial({ color: '#9fc4d8', metalness: .5, roughness: .02, transparent: true, opacity: .08, depthWrite: false });
  const inner = new THREE.MeshStandardMaterial({ color: '#0c0c0c', roughness: .9, metalness: .1, side: THREE.BackSide });
  const clearPoly = new THREE.MeshStandardMaterial({ color: '#b9a888', metalness: 0, roughness: .2, transparent: true, opacity: .45 });
  const red = new THREE.MeshStandardMaterial({ color: '#8a1a14', roughness: .6 });
  const shell = new THREE.MeshStandardMaterial({ color: '#a51e1e', roughness: .5 });
  const glow = new THREE.MeshBasicMaterial({ color: '#ff3020' });
  const tritium = new THREE.MeshBasicMaterial({ color: '#6aff7a' });
  const cloth = new THREE.MeshStandardMaterial({ color: '#6b6448', roughness: 1 });
  const glowC = new THREE.MeshStandardMaterial({ color: '#1ac8ff', emissive: '#18b8ff', emissiveIntensity: .6, roughness: .3 }); // coil / sensor glow (driven by charge)
  const heat = new THREE.MeshStandardMaterial({ color: '#2b2b2b', emissive: '#ff4a10', emissiveIntensity: 0, metalness: .8, roughness: .45 }); // barrel shroud that glows with heat
  const hazard = new THREE.MeshStandardMaterial({ map: G.texHazard(), roughness: .6 });
  const out = { metal, steel, bright, wood: wood || poly, poly, rubber, brass, copper, glass, lensRed, lensClear, inner, clearPoly, red, shell, glow, tritium, cloth, glowC, heat, hazard };
  for (const k in out) G.linMat(out[k]);
  out.hasWood = !!m.wd;
  return out;
};

// ---------------------------------------------------------------- builder
G.buildGun = function (wp, L, opt = {}) {
  L = L || G.defaultLoadout(wp);
  const S = G.resolveStats(wp, L);
  const MT = opt.mats || G.gunMaterials(wp, S);
  const m = wp.m, t = m.t, lod = opt.lod || 0;
  const root = new THREE.Group(); root.name = wp.id;
  const rig = { root, wp, S, L, mats: MT, animated: {}, parts: [] };
  let cur = root;
  const add = (geo, mat, x = 0, y = 0, z = 0, p) => {
    const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = !lod; (p || cur).add(o); return o;
  };
  const grp = (x = 0, y = 0, z = 0, p) => { const g = new THREE.Group(); g.position.set(x, y, z); (p || cur).add(g); return g; };
  const X = m.x || [];
  const has = k => X.includes(k);
  const small = !lod; // add small details only at full lod

  const RL = m.R[0], RH = m.R[1], RW = m.R[2];
  const bullpup = t === 'bullpup', pistol = t === 'pistol', rev = t === 'rev';
  let zr, zf;
  if (bullpup) { zr = RL * .62; zf = -RL * .38; }
  else if (pistol) { zr = .06; zf = .06 - RL; }
  else if (rev) { zr = .05; zf = -.075; }
  else { zr = RL * .38; zf = -RL * .62; }
  const top = RH * .32, bot = -RH * .68;
  const blen = pistol ? m.B[0] : Math.max(.02, m.B[0] * S.blen - (m.bi || 0)), br = m.B[1] * S.bthick;
  let muzzleZ = pistol ? zf - .002 : zf - blen;
  rig.zr = zr; rig.zf = zf; rig.top = top; rig.bot = bot;
  // pistol layout: slide bottom, dust-cover depth, grip height/depth/rake measured from real handguns
  // (grip hangs ~0.5x the slide length below the slide, backstrap sits just under the slide's rear)
  const PS = pistol ? (() => {
    const sB = -RH * .3, dcH = Math.min(RH * .5, .018), gH = Math.max(.072, Math.min(.105, RL * .5)), gd = Math.max(.034, Math.min(.044, RL * .2));
    const rk = m.grip === 'pst_raked' ? .62 : m.grip === 'broom' ? .2 : m.grip === 'pst_poly' ? .38 : .3;
    const bz = zr - .004, fz = zr - .006 - gd;
    return { sB, dcH, gH, gd, rk, bz, fz, yb: sB - gH, front: y => fz + (sB - dcH - y) * rk, back: y => bz + (sB - .015 - y) * rk };
  })() : null;
  rig.ps = PS;
  const woodStock = MT.hasWood;
  const furn = woodStock ? MT.wood : MT.poly;

  // ===================================================== RECEIVER
  if (['bolt', 'lever', 'semiw'].includes(t)) {
    // round receiver + action body
    add(gCyl(RW * .5, RW * .5, RL * .95, 20), MT.metal, 0, 0, (zr + zf) / 2);
    add(gRBox(RW * .92, RH * .55, RL * .7, .006), MT.metal, 0, -RH * .38, (zr + zf) / 2 + RL * .05);
    if (t === 'lever') add(gRBox(RW * 1.02, RH * 1.05, RL * .9, .008), MT.metal, 0, -RH * .2, (zr + zf) / 2);
    if (small) { add(gCyl(RW * .56, RW * .56, .025, 20), MT.metal, 0, 0, zf + .012); // receiver ring
      add(gBox(RW * .3, .004, RL * .35), MT.steel, 0, RW * .5, zr - RL * .3); } // bolt raceway opening
    if (has('dustcover')) add(gCyl(RW * .56, RW * .56, RL * .45, 16, true), MT.steel, 0, .003, zr - RL * .3);
  } else if (t === 'ak') {
    add(gRBox(RW, RH * .75, RL, .004), MT.metal, 0, -RH * .3, (zr + zf) / 2);
    // dust cover: rounded top
    const dc = add(gCyl(RW * .5, RW * .5, RL * .82, 18), has('dust_rail') ? MT.metal : MT.metal, 0, RH * .08, zr - RL * .41);
    dc.scale.set(1, .7, 1);
    add(gRBox(RW * 1.02, RH * .5, RL * .14, .003), MT.metal, 0, -RH * .1, zf + RL * .07); // front trunnion
    add(gRBox(RW * 1.02, RH * .6, .03, .003), MT.metal, 0, -RH * .15, zr - .015); // rear trunnion
    if (small) {
      for (const z of [zf + .02, zf + .05, zr - .02]) for (const s of [-1, 1]) add(gCylX(.0025, .0025, .003, 8), MT.steel, s * RW * .51, -RH * .35, z);
      // selector lever
      const sel = add(gBox(.003, .014, RL * .45), MT.steel, RW * .52, -RH * .05, zr - RL * .3); sel.rotation.x = .05;
      add(gBox(.004, .008, .02), MT.steel, RW * .53, -RH * .2, zr - RL * .07);
      add(gBox(RW * .6, .006, .02), MT.steel, 0, RH * .03, zr - .01); // rear cover button
    }
    if (has('dust_rail')) add(gBox(RW * .7, .012, RL * .7), MT.metal, 0, RH * .26, zr - RL * .38);
  } else if (t === 'ar') {
    // upper
    add(gRBox(RW, RH * .52, RL, .004), MT.metal, 0, RH * .06, (zr + zf) / 2);
    // lower
    add(gRBox(RW * .95, RH * .45, RL * .78, .004), MT.metal, 0, -RH * .42, (zr + zf) / 2 + RL * .06);
    // magwell
    add(gRBox(RW * 1.05, RH * .5, .085, .005), MT.metal, 0, -RH * .72, -.065);
    if (small) {
      add(gBox(.003, RH * .2, RL * .3), MT.steel, RW * .51, RH * .05, zr - RL * .52); // ejection port door
      add(gCyl(.006, .006, .02, 10), MT.metal, RW * .55, RH * .08, zr - RL * .14).rotation.y = -.3; // brass deflector-ish
      if (has('fa')) { const fa = add(gCyl(.0065, .0065, .03, 12), MT.metal, RW * .45, RH * .02, zr - .02); fa.rotation.y = .4; }
      add(gBox(.004, .01, .012), MT.steel, -RW * .52, -RH * .45, zr - .02); // selector
      add(gBox(.004, .008, .02), MT.steel, -RW * .52, -RH * .3, -.07); // bolt catch
      add(gCyl(.004, .004, .006, 8), MT.steel, RW * .52, -RH * .62, -.035).rotation.y = PI / 2; // mag release
      for (const z of [zf + .015, zr - .015]) add(gCylX(.0035, .0035, RW * 1.02, 10), MT.steel, 0, -RH * .3, z); // takedown & pivot pins
      add(gBox(.003, RH * .12, .04), MT.steel, -RW * .51, RH * .12, zr - .03); // brass deflector edge
    }
  } else if (t === 'pistol') {
    // frame: dust cover under the slide, running back over the grip
    const P = PS, fm = pistolFrameMat(), bh0 = m.bh;
    const tgF = P.front(P.sB - P.dcH) - .04; // front of trigger guard
    const c96 = bh0 === 'hammer_only' && has('magwell_front');
    const f0 = bh0 === 'toggle' ? zf + RL * .42 : c96 ? tgF : zf + RL * .05, f1 = zr - .008;
    add(gRBox(RW * .9, P.dcH, f1 - f0, .004), fm, 0, P.sB - P.dcH / 2 + .001, (f0 + f1) / 2);
    if (small) {
      add(gBox(.003, .004, .026), MT.steel, -RW * .47, P.sB - .005, P.fz - .004); // slide stop
      add(gCylX(.0028, .0028, RW * .93, 8), MT.steel, 0, P.sB - .006, tgF + .01); // takedown pin
      add(gRBox(.004, .007, .007, .002), MT.steel, -RW * .47, P.sB - P.dcH + .002, P.fz + .002); // mag release
    }
    if (has('railP') && small) for (let i = 0; i < 3; i++) add(gBox(RW * .9, .004, .006), fm, 0, P.sB - P.dcH - .001, zf + .03 + i * .012);
    if (bh0 === 'hammer_only' && !c96) add(gRBox(RW, RH * .8, RL, .004), MT.metal, 0, RH * .1, (zr + zf) / 2); // fixed upper (Gyrojet etc.)
    if (c96) { // Mauser C96: milled receiver, exposed barrel, fixed box magazine ahead of the trigger guard
      const r0 = zf + RL * .32;
      add(gRBox(RW, RH * .8, zr - r0, .003), MT.metal, 0, RH * .1, (zr + r0) / 2);
      add(gCyl(.0095, .0085, r0 - zf + .01, 16), MT.metal, 0, 0, (zf + r0) / 2);
      add(gRBox(RW * .95, .048, .046, .004), MT.metal, 0, P.sB - .022, tgF - .022); // magazine box
      if (small) { add(gBox(RW * 1.02, .003, .04), MT.steel, 0, P.sB - .03, tgF - .022); add(gRBox(RW * .6, .008, .04, .003), MT.metal, 0, P.sB - .05, tgF - .022); }
      if (small) for (let i = 0; i < 2; i++) add(gBox(RW * 1.02, RH * .5, .002), MT.steel, 0, RH * .05, r0 + .02 + i * .05); // milled panels
    }
    if (bh0 === 'toggle') { // Luger: exposed tapered barrel, receiver with recoiling barrel extension
      const r0 = zf + RL * .45;
      add(gCyl(.0085, .0072, r0 - zf + .01, 16), MT.metal, 0, 0, (zf + r0) / 2);
      add(gCyl(.011, .011, .014, 16), MT.metal, 0, 0, r0 - .004); // barrel shank
      add(gRBox(RW * .82, RH * .25 - P.sB, zr - r0 - .01, .003), MT.metal, 0, (RH * .25 + P.sB) / 2, (r0 + zr - .01) / 2);
      for (const sd of [-1, 1]) add(gRBox(.004, .016, .016, .002), MT.metal, sd * RW * .42, RH * .3, zr - .006); // toggle ears on frame
    }
  } else if (t === 'rev') {
    add(gRBox(RW * .75, RH * 1.1, .12, .006), MT.metal, 0, -RH * .2, -.02);
    add(gRBox(RW * .6, RH * .3, .05, .004), MT.metal, 0, RH * .45, .005); // top strap
  } else if (bullpup) {
    buildBullpupShell();
  } else {
    // box-type receivers: battle, smg, lmg, mg, pump, autosg, scar, precision, amr
    const tube = t === 'smg' && Math.abs(RH - RW) < .006;
    if (tube) {
      add(gCyl(RW * .5, RW * .5, RL, 20), MT.metal, 0, 0, (zr + zf) / 2);
      if (small) add(gBox(.003, RW * .35, RL * .5), MT.steel, RW * .45, RW * .1, zr - RL * .55); // cocking slot
    } else if (m.hg && m.hg[0] === 'vector') { // KRISS Vector: slim upper with rail, big raked lower housing for the Super V recoil block
      add(gRBox(RW * .9, RH * .38, RL, .004), MT.metal, 0, RH * .16, (zr + zf) / 2);
      add(gProf([[zr, RH * .02], [zf + .015, RH * .02], [zf, -RH * .08], [zf + .03, -RH * .3], [-.03, -RH * .6], [-.03, bot], [.03, bot], [.06, -RH * .5], [zr, -RH * .45]], RW, .01, false), MT.poly);
      if (small) add(gRBox(RW * 1.02, .004, .08, .002), MT.rubber, 0, -RH * .2, zf + .06);
    } else if (t === 'scar') {
      add(gRBox(RW, RH * .5, RL, .004), MT.metal, 0, RH * .08, (zr + zf) / 2);
      add(gRBox(RW * .92, RH * .52, RL * .5, .006), MT.poly, 0, -RH * .42, zr - RL * .32);
    } else if (t === 'pump' || t === 'autosg') {
      add(gRBox(RW, RH, RL, .008), MT.metal, 0, -RH * .2, (zr + zf) / 2);
      if (small) add(gBox(.003, RH * .35, RL * .4), MT.steel, RW * .5, -RH * .05, (zr + zf) / 2); // ejection port
    } else if (t === 'mg' || t === 'lmg') {
      add(gRBox(RW, RH, RL, .006), MT.metal, 0, -RH * .2, (zr + zf) / 2);
      if (t === 'mg' || m.mag[0].startsWith('belt')) { // feed tray cover
        rig.cover = grp(0, RH * .3, zr - .01);
        add(gRBox(RW * 1.02, .022, RL * .55, .006), MT.metal, 0, .011, -RL * .275, rig.cover);
        if (small) add(gCylX(.006, .006, RW * 1.2, 8), MT.steel, 0, 0, 0, rig.cover);
      }
    } else if (t === 'amr' || t === 'precision') {
      add(gRBox(RW, RH * .75, RL, .01), MT.metal, 0, -RH * .1, (zr + zf) / 2);
      if (t === 'amr') { add(gRBox(RW * .9, RH * .5, RL * 1.2, .01), MT.metal, 0, -RH * .55, (zr + zf) / 2 + .05); }
    } else {
      add(gRBox(RW, RH, RL, .006), MT.metal, 0, -RH * .2, (zr + zf) / 2);
      if (small) add(gBox(.003, RH * .3, RL * .35), MT.steel, RW * .5, -RH * .02, zr - RL * .45);
    }
    if (small && !tube && t !== 'pump' && t !== 'autosg') { // rivets / pins
      for (const z of [zr - .02, zf + .02]) add(gCylX(.003, .003, RW * 1.04, 8), MT.steel, 0, -RH * .5, z);
    }
  }
  function pistolFrameMat() { return (m.grip === 'pst_poly') ? MT.poly : MT.metal; }

  // ===================================================== BARREL
  if (!pistol && !rev) {
    const brlMat = MT.steel;
    const brlLen = blen;
    const bz = zf - brlLen / 2;
    add(gCyl(br * 1.25, br * .95, brlLen, 16), brlMat, 0, 0, bz);
    if (S.bthick > 1.2 && small) for (let i = 0; i < 4; i++) { const q = add(gBox(.002, .002, brlLen * .6), MT.metal, Math.cos(i * PI / 2) * br * 1.2, Math.sin(i * PI / 2) * br * 1.2, bz - brlLen * .1); }
    if (L.barrel === 'brl_fluted' && small) for (let i = 0; i < 6; i++) add(gBox(.002, .002, brlLen * .5), MT.metal, Math.cos(i * PI / 3) * br * 1.05, Math.sin(i * PI / 3) * br * 1.05, bz);
    add(gCyl(br * .45, br * .45, .004, 12), MT.rubber, 0, 0, muzzleZ - .001); // bore
  } else if (pistol) {
    add(gCyl(m.B[1] * 1.1, m.B[1] * 1.1, .02, 14), MT.steel, 0, 0, zf + .01);
  }
  rig.muzzleZ = muzzleZ;

  // ===================================================== HANDGUARD
  const hg = m.hg || ['none', 0];
  const hgT = hg[0], hgL = hg[1] || .2, hgR = hg[2];
  const hgZ = zf - hgL / 2; // center
  let hgMid = zf - Math.min(hgL, blen) * .55; // where the support hand goes
  let railsOnHG = false;
  cur = root;
  switch (hgT) {
    case 'wfull': {
      // top handguard wood + stock forend under barrel (forend built with stock)
      add(gRBox(br * 2.6, br * 1.8, hgL * .75, br * .8), MT.wood, 0, br * .9, zf - hgL * .45);
      if (has('nose')) add(gRBox(br * 3.2, br * 3.2, .04, br), MT.metal, 0, -br * .3, zf - hgL + .02);
      hgMid = zf - hgL * .45;
      break; }
    case 'wood': case 'wood_top': {
      add(gRBox(br * 3.4, br * 2.4, hgL, br), MT.wood, 0, -br * .5, hgZ);
      if (hgT === 'wood_top') add(gRBox(br * 2.4, br * 1.3, hgL * .7, br * .6), MT.wood, 0, br * 1.1, hgZ);
      break; }
    case 'ak': case 'ak_rib': case 'ak_poly': case 'svd': {
      const mat = hgT === 'ak_poly' ? MT.poly : furn;
      add(gProf([[0, -.012], [-hgL, -.01], [-hgL, .012], [0, .014]].map(p => [p[0] + zf, p[1] - .012]), RW * 1.05, .006, false), mat);
      add(gRBox(RW * .75, .018, hgL * .75, .007), mat, 0, .011, zf - hgL * .4); // upper handguard over gas tube
      if (hgT === 'ak_rib' && small) for (let i = 0; i < 4; i++) add(gBox(RW * 1.08, .003, .01), mat, 0, -.018, zf - .03 - i * .045);
      if (hgT === 'svd') for (let i = 0; i < 5; i++) add(gBox(RW * 1.12, .006, .012), MT.rubber, 0, -.004, zf - .04 - i * .04);
      break; }
    case 'ak12': {
      add(gRBox(RW * 1.15, .055, hgL, .006), MT.poly, 0, .004, hgZ);
      railsOnHG = true;
      break; }
    case 'stg': {
      add(gRBox(RW * .9, .05, hgL, .01), MT.metal, 0, -.004, hgZ);
      add(gCyl(.01, .01, hgL * 1.1, 10), MT.metal, 0, .02, hgZ);
      break; }
    case 'ar_tri': case 'ar_round': {
      const hgMesh = add(gCyl(.026, .022, hgL, hgT === 'ar_tri' ? 3 : 16), MT.poly, 0, .004, hgZ);
      if (hgT === 'ar_tri') hgMesh.scale.set(1, .95, 1);
      if (hgT === 'ar_tri') hgMesh.rotation.z = PI / 2;
      if (small) for (let i = 0; i < 6; i++) add(gBox(.046, .003, .004), MT.poly, 0, -.006, zf - .03 - i * hgL / 7); // vent holes / ribs
      add(gCyl(.027, .027, .008, 16), MT.metal, 0, .004, zf - hgL + .002); // handguard cap
      add(gCyl(.029, .029, .014, 16), MT.metal, 0, .004, zf - .006); // delta ring
      break; }
    case 'quad': case 'quad_long': case 'mlok': case 'mlok_long': case 'mlok_short': case 'ebr': case 'scar': case 'l85': case 'g36': case 'ump': case 'mp5': case 'evo': case 'vector': case 'saw': case 'm240': case 'm60': case 'ai': case 'barrett': case 'poly': case 'galil': case 'fal': case 'g3': {
      const quad = hgT.startsWith('quad') || hgT === 'ebr' || hgT === 'barrett';
      const mlok = hgT.startsWith('mlok') || hgT === 'ai';
      const w = (hgT === 'm60' || hgT === 'saw' || hgT === 'm240') ? .055 : hgT === 'barrett' ? .075 : .044;
      const h = w * (hgT === 'mp5' || hgT === 'g3' ? 1.05 : .95);
      const mat = (quad || mlok || hgT === 'scar' || hgT === 'barrett') ? MT.metal : MT.poly;
      add(gRBox(w, h, hgL, quad ? .006 : .012), mat, 0, hgT === 'scar' ? .008 : .002, hgZ);
      if (quad) { railsOnHG = true; for (const [x, y, rz] of [[0, -h / 2 - .004, 0], [w / 2 + .004, 0, PI / 2], [-w / 2 - .004, 0, PI / 2]]) railStrip(hgL * .92, x, y + .002, hgZ, rz); }
      if (mlok && small) { railsOnHG = true; for (let i = 0; i < Math.floor(hgL / .04); i++) for (const s of [-1, 1]) add(gBox(.002, .007, .022), MT.rubber, s * (w / 2 + .0005), -.004, zf - .025 - i * .04); }
      if ((hgT === 'mp5' || hgT === 'g3' || hgT === 'ump' || hgT === 'poly' || hgT === 'fal' || hgT === 'galil') && small) for (let i = 0; i < 5; i++) add(gBox(w * 1.02, .002, .006), MT.poly, 0, -h * .2, zf - .02 - i * hgL / 6);
      if (hgT === 'vector') add(gRBox(w * .7, .03, hgL * .9, .008), MT.poly, 0, -.01, hgZ);
      break; }
    case 'perf': case 'jacket': case 'water': case 'mg42': {
      const r = hgR || .025;
      const jl = hgT === 'mg42' ? blen * .9 : hgL;
      const jz = zf - jl / 2;
      if (hgT === 'jacket') { // Lewis: big aluminium shroud with cooling fins inside
        add(gCyl(r, r * .92, jl, 22), MT.metal, 0, 0, jz);
        add(gCyl(r * .62, r * .5, .06, 18), MT.metal, 0, 0, zf - jl - .03);
        if (small) for (let i = 0; i < 16; i++) add(gBox(.002, r * .1, jl * .95), MT.steel, Math.cos(i / 16 * PI * 2) * r * 1.0, Math.sin(i / 16 * PI * 2) * r * 1.0, jz);
      } else if (hgT === 'water') {
        add(gCyl(r, r, jl, 22), MT.metal, 0, 0, jz);
        if (small) { add(gCylY(.008, .008, .025, 10), MT.brass, 0, r + .01, jz + .1); add(gCylY(.008, .008, .02, 10), MT.steel, 0, -r - .01, jz - .15); }
      } else {
        const j = add(gCyl(r, r, jl, 20, true), MT.metal, 0, 0, jz);
        j.material = MT.metal;
        if (small) { // perforations as dark ovals
          const holeMat = MT.rubber;
          const n = Math.max(3, Math.floor(jl / .045));
          for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
            const a = k / 4 * PI * 2 + (hgT === 'mg42' ? PI / 4 : 0);
            const h = add(gRBox(.001 + .0005, hgT === 'mg42' ? .012 : .008, hgT === 'mg42' ? .03 : .018, .004), holeMat, Math.cos(a) * r * 1.005, Math.sin(a) * r * 1.005, zf - .03 - i * jl / n);
            h.rotation.z = a;
          }
          add(gCyl(r * 1.03, r * 1.03, .012, 20), MT.metal, 0, 0, zf - jl);
        }
      }
      if (hgT === 'mg42') { add(gCyl(r * 1.02, r * 1.02, .04, 20), MT.metal, 0, 0, zf - .02); if (small) add(gBox(.004, .012, .05), MT.steel, r * 1.05, 0, zf - .03); }
      hgMid = zf - jl * .4;
      break; }
    case 'fin': {
      if (small) for (let i = 0; i < 10; i++) add(gCyl(br * 2.2, br * 2.2, .005, 16), MT.metal, 0, 0, zf - .02 - i * .022);
      break; }
    case 'thompson': {
      add(gCyl(br * 1.3, br * 1.3, .004, 12), MT.metal, 0, 0, zf);
      if (has('fins_thompson') && small) for (let i = 0; i < 12; i++) add(gCyl(br * 1.7, br * 1.7, .004, 16), MT.metal, 0, 0, zf - .01 - i * .008);
      if (L.under !== 'thompson_vfg') add(gRBox(.034, .03, .14, .01), MT.wood, 0, -.03, zf - .1);
      hgMid = zf - .1;
      break; }
    case 'pump': case 'pump_ribbed': case 'spas': case 'pump_bp': {
      rig.pump = grp(0, 0, 0);
      const pz = zf - hgL / 2 - .06;
      const pm = hgT === 'pump' ? MT.wood : MT.poly;
      if (hgT === 'pump_bp') add(gRBox(.05, .05, hgL, .012), pm, 0, -.045, zf - hgL / 2 - .02, rig.pump);
      else add(gCyl(.024, .024, hgL, 16), pm, 0, -br * 2.4, pz, rig.pump);
      if (small && hgT !== 'pump_bp') for (let i = 0; i < 8; i++) add(gCyl(.0255, .0255, .004, 16), hgT === 'pump' ? MT.wood : MT.rubber, 0, -br * 2.4, pz - hgL / 2 + .012 + i * hgL / 8.5, rig.pump);
      hgMid = pz; rig.pumpZ = 0;
      if (small) add(gBox(.004, .005, hgL + .06), MT.steel, RW * .45, -br * 1.6, pz + .05, rig.pump); // action bar
      break; }
    case 'm60': break;
    default: break;
  }
  function railStrip(len, x, y, z, rz = 0, p) {
    const g = grp(x, y, z, p); g.rotation.z = rz;
    add(gBox(.021, .005, len), MT.metal, 0, 0, 0, g);
    if (small) { const n = Math.floor(len / .01); for (let i = 0; i < n; i += 1) add(gBox(.022, .003, .005), MT.metal, 0, .003, -len / 2 + .005 + i * .01, g); }
    return g;
  }
  rig.hgPos = V3(0, -.03, hgMid);

  // Shotgun tube magazine
  if (m.mag[0] === 'tube' || m.mag[0] === 'tube2') {
    if (!bullpup) { add(gCyl(br * 1.05, br * 1.05, Math.min(blen * .8, .45), 14), MT.metal, 0, -br * 2.4, zf - Math.min(blen * .8, .45) / 2);
      add(gCyl(br * 1.15, br * 1.15, .012, 14), MT.metal, 0, -br * 2.4, zf - Math.min(blen * .8, .45)); }
  }
  // Lebel tube magazine in forend
  if (has('tubemag')) add(gCyl(.008, .008, .5, 10), MT.metal, 0, -.022, zf - .25);

  // ===================================================== GAS SYSTEM & BANDS
  if (has('gas') && !['ak12'].includes(hgT) && !bullpup) {
    const gz = t === 'ak' ? zf - Math.min(blen * .55, .24) : zf - blen * .55;
    add(gRBox(br * 2.7, br * 3.6, .03, .004), MT.metal, 0, br * 1.2, gz);
    if (t !== 'semiw' || wp.id === 'garand' || wp.id === 'm14') add(gCyl(br * .9, br * .9, Math.abs(gz - zf), 10), MT.metal, 0, br * 2.2, (gz + zf) / 2);
    if (wp.id === 'garand' || wp.id === 'm14' || wp.id === 'm21' || wp.id === 'mk14') add(gCyl(br * .9, br * .9, blen * .4, 10), MT.metal, 0, -br * 2.2, zf - blen * .45);
  }
  if (has('bands')) {
    const nb = hgT === 'wfull' ? 2 : 1;
    for (let i = 0; i < nb; i++) { const z = zf - hgL * (i === 0 ? .55 : .95) - .01; const b = add(gRBox(br * 3.4, br * 4.2, .012, br * 1.4), MT.metal, 0, -br * .8, z); }
  }

  // ===================================================== STOCK
  cur = root;
  buildStock();
  // ===================================================== GRIP & TRIGGER
  buildGrip();
  buildTrigger();
  // ===================================================== MAGAZINE
  buildMag();
  // ===================================================== SIGHTS
  buildAction();
  // ===================================================== SIGHTS
  buildSights();
  // ===================================================== MUZZLE
  buildMuzzle();
  // ===================================================== EXTRAS
  buildExtras();
  buildExperimental();
  // ===================================================== ATTACHMENTS
  buildAttachments();

  // anchors
  rig.muzzle = new THREE.Object3D(); rig.muzzle.position.set(0, 0, rig.muzzleZ); root.add(rig.muzzle);
  rig.eject = new THREE.Object3D();
  rig.eject.position.set(bullpup ? RW * .5 : RW * .5, pistol ? .005 : RH * .08, pistol ? zf + RL * .45 : bullpup ? zr - RL * .35 : zr - RL * .45);
  if (t === 'mg' || (t === 'lmg' && wp.id !== 'bren')) rig.eject.position.set(0, -RH * .6, zr - RL * .5);
  if (wp.id === 'bren' || wp.id === 'p90') rig.eject.position.set(0, -RH * .5, zr - RL * .4);
  if (wp.id === 'm1911' || pistol) rig.eject.position.x = RW * .4;
  root.add(rig.eject);
  rig.ejectDir = (t === 'mg' || wp.id === 'p90' || wp.id === 'bren' || (t === 'lmg' && wp.id !== 'lewis')) ? V3(0, -1, .2) : bullpup && has('famas_handle') ? V3(-1, .6, .3) : V3(1, .7, .35);
  rig.gripPos = rig.gripPos || V3(0, -.07, pistol ? .035 : .045);
  root.traverse(o => { if (o.isMesh) rig.parts.push(o); });
  return rig;

  // ------------------------------------------------------------ helpers
  function buildBullpupShell() {
    const mat = MT.poly;
    const len = RL, h = RH, w = RW;
    const id = wp.id;
    if (has('g11body')) { // G11: a sealed housing, muzzle flush with the front face, carry handle with integral optic mount
      add(gRBox(w, h * 1.1, len, .014), mat, 0, -h * .18, (zr + zf) / 2);
      add(gProf([[zf, -h * .7], [zf + .05, -h * .72], [zf + .05, h * .35], [zf, h * .3]], w * 1.02, .006), mat);
      add(gRBox(w * .5, .03, len * .45, .008), mat, 0, h * .55, zr - len * .45);
      add(gRBox(.012, .02, .03, .004), mat, 0, h * .42, zr - len * .25); add(gRBox(.012, .02, .03, .004), mat, 0, h * .42, zr - len * .65);
      add(gCylX(.018, .018, w * 1.05, 16), MT.metal, 0, -h * .1, zr - .12); // cocking knob drum
      add(gRBox(w * 1.05, h * .9, .02, .006), MT.rubber, 0, -h * .22, zr + .01);
      return;
    }
    if (id === 'p90') { // FN P90: one-piece shell, thumbhole behind the trigger, support-hand loop in front, magazine on top
      const yT = top - .002, yB = -.075, gb = -.135;
      add(gProf([[zf + .01, yT], [zf, yT - .02], [zf, -.03], [zf + .03, -.05], [.1, -.035], [.1, yT - .005]], w, .014, false), mat); // front upper body
      add(gProf([[zf + .005, -.035], [zf + .05, -.04], [-.05, -.045], [-.04, gb + .01], [-.07, gb], [zf + .035, gb + .02], [zf + .005, -.06]], w * .92, .012, false), mat); // support-hand loop
      add(gProf([[-.07, gb + .014], [.02, gb + .006], [.03, gb - .008], [-.07, gb - .004]], w * .8, .006, false), mat); // loop bottom bar joining the grip
      add(gProf([[.07, yT], [zr, yT], [zr, yB + .01], [zr - .02, yB], [.1, yB], [.06, gb + .012], [.03, gb + .004], [.045, -.04], [.07, -.03]], w, .014, false), mat); // stock & rear thumbhole frame
      add(gRBox(w * 1.02, .004, .12, .002), MT.rubber, 0, yT - .026, zr - .09); // parting line
      add(gRBox(w * 1.04, h * .75, .016, .006), MT.rubber, 0, (yT + yB) / 2, zr + .005); // butt pad
      for (const sx of [-1, 1]) add(gRBox(.006, .01, .02, .003), MT.poly, sx * (w * .5 + .002), -.02, .1); // ambi charging handles
      return;
    }
    if (id === 'aug') { // Steyr AUG: rounded polymer stock tube, metal receiver on top, big hand-enclosing trigger guard
      add(gProf([[zr, .02], [zr, -.07], [zr - .025, -.082], [.14, -.075], [.13, bot], [.055, bot], [-.02, -.052], [-.09, -.034], [zf + .01, -.02], [zf, -.005], [zf, .012], [.05, .022], [zr - .02, .026]], w, .016, true), mat);
      add(gRBox(w * .82, .03, len * .72, .006), MT.metal, 0, .03, zf + len * .36); // receiver
      add(gRBox(w * .5, .01, len * .5, .003), MT.metal, 0, .048, zf + len * .3); // barrel lock/collar rail
      add(gProf([[.06, bot], [.048, bot - .105], [.03, bot - .115], [-.08, bot - .112], [-.085, bot - .1], [-.07, -.045], [-.055, -.047], [-.066, bot - .095], [.035, bot - .098], [.044, bot]], w * .7, .006, false), mat); // enclosing trigger guard
      add(gRBox(w * 1.02, h * .78, .02, .008), MT.rubber, 0, -.03, zr + .008);
      if (small) for (let i = 0; i < 4; i++) add(gBox(w * 1.03, .002, .04), MT.rubber, 0, -.06 + i * .018, zr - .05); // cheek texture
      return;
    }
    // generic bullpup: narrower front handguard stepping up into the trigger housing, magwell block behind the grip,
    // raised cheek rest and a thick recoil pad
    const hgE = zf + len * .34;
    const pts = [[zf, h * .16], [zf, -h * .3], [zf + .03, -h * .42], [hgE - .02, -h * .46], [hgE, -h * .62], [zr - .02, -h * .78], [zr, -h * .74], [zr, h * .28], [zr - .03, h * .36], [hgE + .03, h * .34], [hgE, h * .22], [zf + .02, h * .2]];
    add(gProf(pts, w, .01, false), mat);
    add(gProf([[zf + .01, h * .1], [zf + .01, -h * .25], [hgE - .01, -h * .38], [hgE - .01, h * .12]], w * 1.04, .004, false), id === 'l85' ? MT.poly : MT.rubber); // handguard panel
    if (id === 'l85') add(gRBox(w * .92, h * .5, len * .8, .004), MT.metal, 0, h * .1, zf + len * .45); // stamped steel receiver
    if (small) for (let i = 0; i < 4; i++) add(gBox(w * 1.06, .006, .004), MT.poly, 0, -h * .12, zf + .03 + i * .025); // vent slots
    add(gRBox(w * 1.05, h * .95, .022, .008), MT.rubber, 0, -h * .22, zr + .01); // butt pad
    add(gRBox(w * 1.06, h * .5, .09, .006), mat, 0, bot + h * .2, (mz0 => mz0)(m.mag && m.mag[3] !== undefined ? m.mag[3] : .1)); // magwell housing
    if (has('famas_handle')) { // carry handle spanning the top
      add(gRBox(.012, .07, .012, .003), MT.poly, 0, h * .55, zr - .05); add(gRBox(.012, .07, .012, .003), MT.poly, 0, h * .55, zf + .06);
      add(gRBox(.02, .02, len * .8, .006), MT.poly, 0, h * .9, (zr + zf) / 2);
    }
    if (id === 'qbz95') add(gRBox(.02, .05, len * .5, .006), MT.poly, 0, h * .6, (zr + zf) / 2 + .02);
    if (id === 'ksg') { for (const s of [-1, 1]) add(gCyl(.013, .013, len * .9, 12), MT.metal, s * .016, -h * .35, zf + len * .2); }
    // cheek piece
    add(gRBox(w * 1.02, .025, .12, .008), MT.poly, 0, h * .38, zr - .08);
  }

  function buildStock() {
    let st = m.stk || 'none';
    if (S.stock === 'none') st = 'none';
    else if (S.stock === 'coll') st = woodStock ? 'coll_w' : 'ar_coll';
    else if (S.stock === 'prec') st = 'precision_st';
    else if (S.stock === 'sporter') st = 'sporter';
    else if (S.stock === 'holster') st = 'holster';
    else if (S.stock === 'brace') st = 'brace';
    if (bullpup || pistol || rev) {
      if (st === 'holster') { const s = add(gRBox(.04, .05, .3, .015), MT.wood, 0, -.07, .2); s.rotation.x = .2; }
      if (st === 'brace') { add(gCyl(.012, .012, .15, 10), MT.poly, 0, -.02, .12); add(gRBox(.03, .06, .08, .01), MT.rubber, 0, -.03, .2); }
      rig.stockEnd = V3(0, -.05, zr + .02);
      return;
    }
    const z0 = zr;
    const woody = ['rifle', 'rifle_pg', 'rifle_short', 'carbine', 'garand', 'sporter', 'svd', 'stg', 'ak', 'rpk', 'thompson', 'bren', 'fg42', 'lewis', 'coll_w'];
    if (woody.includes(st) || (['rifle'].includes(st))) {
      const mat = (st === 'stg' && !woodStock) ? MT.poly : (woodStock ? MT.wood : MT.poly);
      const len = st === 'rifle_short' ? .26 : st === 'carbine' ? .30 : st === 'ak' || st === 'rpk' ? .27 : st === 'thompson' ? .30 : st === 'stg' ? .24 : .33;
      const drop = st === 'ak' || st === 'rpk' ? .06 : st === 'stg' ? .035 : st === 'sporter' ? .03 : .045;
      const heel = -drop - .01, toe = heel - (st === 'carbine' ? .105 : .125);
      const wristTop = -.006, wristBot = st === 'rifle_pg' || st === 'garand' ? -.085 : -.06;
      const w = RW * 1.05;
      const pts = st === 'ak' || st === 'rpk' || st === 'stg' || st === 'thompson' || st === 'bren' ?
        [[z0 - .005, .01], [z0 + len, heel], [z0 + len, toe], [z0 + .03, -.045]] :
        [[z0 - .01, wristTop], [z0 + len * .35, -drop * .7], [z0 + len, heel], [z0 + len + .004, heel - .02], [z0 + len, toe], [z0 + len * .45, wristBot - .012], [z0 + .07, wristBot], [z0 + .02, wristBot + .01]];
      add(gProf(pts, w, .007, false), mat);
      if (st === 'rifle_pg' || st === 'garand' || st === 'sporter') add(gProf([[z0 + .02, -.05], [z0 + .08, -.06], [z0 + .06, -.11], [z0 + .02, -.1]], w * .95, .006, true), mat);
      if (st === 'svd') { // thumbhole skeleton
        add(gProf([[z0, .01], [z0 + .3, -.02], [z0 + .3, -.14], [z0 + .12, -.06], [z0, -.04]], w, .006), mat);
        add(gBox(w * 1.05, .025, .2), mat, 0, 0, z0 + .17);
      }
      // butt plate
      const bp = add(gRBox(w * 1.02, Math.abs(toe - heel) + .006, .008, .006), (woodStock && st !== 'ak') ? MT.metal : MT.rubber, 0, (heel + toe) / 2, z0 + len + .003);
      if (st === 'bren') add(gRBox(w * .6, .02, len * .8, .006), MT.metal, 0, 0, z0 + len * .45); // top strap
      // forend (under receiver & barrel) for classic rifles
      if (['bolt', 'lever', 'semiw', 'battle'].includes(t) && ['wfull', 'wood', 'wood_top', 'perf'].includes(hgT)) {
        const fl = hgT === 'wfull' ? hgL + RL * .6 : RL * .7 + hgL * .9;
        const fz0 = z0, fz1 = zf - (hgT === 'wfull' ? hgL : hgL * .95);
        // real military stocks: forend ~35mm under the bore, swelling to a deep belly around the magazine,
        // stepping up where the metal trigger guard/floorplate hangs below, then flowing into the wrist
        const belly = -Math.max(.056, RH * 1.05), tgy = bot + .004, fmat = woodStock ? MT.wood : MT.poly;
        const fpts = [[fz0 + .005, -RH * .02], [fz1 + .01, -br * .2], [fz1, -br * 1.2], [fz1 + .03, -Math.max(br * 4.2, .032)], [zf + .02, -Math.max(RH * .8, .042)], [-.07, belly], [-.03, belly], [-.024, tgy], [fz0 - .03, tgy], [fz0 + .01, wristBot + .004]];
        if (wp.id !== 'lewis' && wp.id !== 'bar1918' && wp.id !== 'bar1918a2') {
          add(gProf(fpts, RW * 1.12, .006, false), fmat);
          add(gRBox(RW * .55, .004, .1, .002), MT.metal, 0, belly + .001, -.05 + .026); // floorplate / guard strip
          if (small) { add(gTor(.005, .0012), MT.steel, 0, -Math.max(br * 4.2, .032) + .002, zf - .01).rotation.y = PI / 2; } // front sling swivel
        }
      }
      if (st === 'coll_w') { add(gCyl(.014, .014, .22, 12), MT.metal, 0, -.012, z0 + .11); add(gRBox(.04, .1, .07, .01), MT.poly, 0, -.04, z0 + .2); }
      rig.stockEnd = V3(0, (heel + toe) / 2 + .04, z0 + len);
      rig.cheekY = -drop * .7;
      if (has('monopod') && small) add(gCylY(.004, .004, .1, 6), MT.steel, 0, -.12, z0 + .1);
      return;
    }
    const fam = {
      ar_a2: 'fixedA', ar_a1: 'fixedA', fal: 'fixedA', g3: 'fixedA', saw: 'fixedS', m240: 'fixedS', m60: 'fixedS', pkm: 'skelW', spas: 'fold_top', poly_sg: 'fixedA', mg42: 'fixedA', barrett: 'fixedS', g36: 'skel', vector: 'coll', mp7: 'coll', ai: 'prec', mrad: 'prec', precision_st: 'prec',
      ar_coll: 'coll', crane: 'coll', hk_slim: 'coll', mcx: 'skel', g28: 'coll', scar: 'coll', bren2: 'skel', apc: 'coll', evo: 'skel', ak12: 'coll', mp5_coll: 'hkcoll', ump: 'skel', m4sg: 'coll', side_fold: 'skel', ak_side: 'fixedA', under_fold: 'wire', top_fold: 'wire', wire: 'wire', wire_mac: 'wire', sten: 'sten', uzi: 'wire', fg42: 'fixedA', m24: 'prec', lewis: 'fixedA', holster: 'none', brace: 'brace', none: 'none',
    }[st] || 'fixedA';
    const mat = MT.poly;
    if (fam === 'fixedA' || fam === 'fixedS') {
      const len = st === 'ar_a1' ? .24 : st === 'mg42' ? .26 : fam === 'fixedS' ? .26 : .25;
      const drop = st === 'g3' || st === 'fal' ? .015 : st === 'mg42' ? .045 : st === 'ar_a1' || st === 'ar_a2' ? -RH * .12 : .01;
      const pts = [[z0, RH * .15], [z0 + len, -drop], [z0 + len, -drop - .12], [z0 + len * .7, -drop - .115], [z0, -RH * .6]];
      add(gProf(pts, RW * (st === 'g3' ? 1.1 : 1), .01, false), (st === 'fal' || st === 'lewis') && woodStock ? MT.wood : mat);
      add(gRBox(RW * 1.05, .125, .012, .006), MT.rubber, 0, -drop - .06, z0 + len + .006);
      if (st === 'ak_side') { add(gRBox(RW * .5, .02, .2, .005), MT.metal, 0, .0, z0 + .12); }
      rig.stockEnd = V3(0, -drop - .06, z0 + len); rig.cheekY = RH * .1 - drop;
    } else if (fam === 'coll' || fam === 'hkcoll') {
      const tube = st === 'vector' || st === 'mp7' ? .008 : .0145;
      const bt = add(gCyl(tube, tube, .2, 16), MT.metal, 0, -RH * .08, z0 + .1);
      const len = .22;
      const pts = st === 'crane' || st === 'hk_slim' || st === 'g28' ?
        [[z0 + .08, .018], [z0 + len, .02], [z0 + len + .01, -.02], [z0 + len, -.11], [z0 + len - .04, -.1], [z0 + .12, -.035], [z0 + .08, -.03]] :
        [[z0 + .1, .012], [z0 + len, .015], [z0 + len, -.105], [z0 + len - .02, -.1], [z0 + .12, -.028]];
      add(gProf(pts, st === 'crane' ? .048 : .04, .008, false), mat);
      add(gRBox(.044, .11, .012, .006), MT.rubber, 0, -.045, z0 + len + .006);
      if (small) add(gRBox(.006, .018, .02, .004), MT.steel, 0, -.03, z0 + .13); // lock lever
      if (fam === 'hkcoll') { for (const s of [-1, 1]) add(gCyl(.004, .004, .22, 8), MT.metal, s * .018, -.02, z0 + .11); add(gRBox(.05, .09, .012, .006), MT.metal, 0, -.03, z0 + .22); }
      rig.stockEnd = V3(0, -.045, z0 + len); rig.cheekY = .012;
    } else if (fam === 'skel') {
      const len = st === 'g36' ? .26 : .22;
      add(gRBox(.03, .03, len, .01), mat, 0, 0, z0 + len / 2);
      const b = add(gRBox(.03, .02, len * .9, .008), mat, 0, -.08, z0 + len * .55); b.rotation.x = -.18;
      add(gRBox(.034, .12, .02, .008), MT.rubber, 0, -.05, z0 + len);
      add(gRBox(.03, .02, .02, .006), MT.metal, 0, -.02, z0 + .01); // hinge
      rig.stockEnd = V3(0, -.05, z0 + len); rig.cheekY = .012;
    } else if (fam === 'skelW') { // PKM
      add(gProf([[z0, .01], [z0 + .27, -.02], [z0 + .27, -.13], [z0 + .2, -.13], [z0 + .06, -.055], [z0, -.06]], RW, .01), MT.poly);
      rig.stockEnd = V3(0, -.07, z0 + .27); rig.cheekY = 0;
    } else if (fam === 'prec') {
      const len = .3;
      add(gProf([[z0, .02], [z0 + len, .02], [z0 + len, -.13], [z0 + len - .05, -.13], [z0 + .12, -.06], [z0, -.06]], .05, .008), MT.poly);
      add(gRBox(.03, .02, .14, .008), MT.poly, 0, .045, z0 + .18); // cheek riser
      add(gCylY(.004, .004, .025, 8), MT.steel, 0, .03, z0 + .14); add(gCylY(.004, .004, .025, 8), MT.steel, 0, .03, z0 + .22);
      add(gRBox(.052, .15, .02, .008), MT.rubber, 0, -.055, z0 + len + .01);
      add(gCylY(.006, .006, .04, 8), MT.steel, 0, -.15, z0 + len - .04); // monopod
      rig.stockEnd = V3(0, -.05, z0 + len); rig.cheekY = .055;
    } else if (fam === 'wire') {
      const len = st === 'uzi' ? .24 : .25;
      for (const s of [-1, 1]) { const a = add(gCyl(.004, .004, len, 8), MT.metal, s * .018, -.025, z0 + len / 2); }
      add(gRBox(.045, .075, .008, .006), MT.metal, 0, -.045, z0 + len);
      if (st === 'under_fold' || st === 'top_fold') add(gRBox(.04, .012, .012, .004), MT.metal, 0, -.02, z0 + .005);
      rig.stockEnd = V3(0, -.04, z0 + len); rig.cheekY = -.01;
    } else if (fam === 'sten') {
      add(gCyl(.0055, .0055, .24, 8), MT.metal, 0, -.01, z0 + .12);
      add(gRBox(.006, .085, .01, .003), MT.metal, 0, -.05, z0 + .24);
      const d = add(gCyl(.004, .004, .1, 8), MT.metal, 0, -.045, z0 + .19); d.rotation.x = -.6;
      rig.stockEnd = V3(0, -.05, z0 + .24); rig.cheekY = -.01;
    } else if (fam === 'fold_top') {
      add(gRBox(.02, .02, .22, .006), MT.metal, 0, .02, z0 + .11); add(gRBox(.05, .06, .03, .01), MT.metal, 0, -.01, z0 + .23);
      rig.stockEnd = V3(0, -.02, z0 + .23); rig.cheekY = .01;
    } else {
      rig.stockEnd = V3(0, -.05, z0 + .03); rig.cheekY = 0;
    }
  }

  function buildGrip() {
    const g = m.grip || 'st';
    const gz = pistol ? .04 : bullpup ? -.0 : .05;
    const gy = pistol ? bot * 1.25 : bot;
    let pts;
    const mat = g.includes('wood') || g === 'thompson' || g === 'rev_wood' ? MT.wood : g === 'pg_bake' ? MT.poly : g === 'pg_metal' ? MT.metal : (g === 'pst' ? (woodStock ? MT.wood : MT.poly) : MT.poly);
    if (g === 'st' || g === 'none') { rig.gripPos = V3(0, bot * .9 - .035, zr + .07); return; }
    if (g === 'magwell') { // grip houses magazine (Uzi / MAC / MP7)
      add(gProf([[gz - .024, bot + .004], [gz + .02, bot + .004], [gz + .036, bot - .1], [gz - .014, bot - .1]], RW * 1.02, .008), MT.poly);
      rig.gripPos = V3(0, bot - .05, gz + .006); return;
    }
    if (pistol) {
      const P = PS, { sB, dcH, yb, fz, bz } = P, poly = g === 'pst_poly';
      const tang = poly ? .006 : g === 'broom' ? .0 : .011;
      pts = [[fz - .002, sB + .001], [bz, sB + .001], [bz + tang, sB - .007], [P.back(sB - .02), sB - .02], [P.back(yb) + .002, yb + .004], [P.back(yb) - .002, yb], [P.front(yb) + .002, yb], [P.front(sB - dcH), sB - dcH], [fz - .002, sB - dcH]];
      const gw = g === 'broom' ? RW * 1.2 : RW * 1.1;
      if (g === 'broom') { // round "broomhandle" wooden grip with horizontal grooves
        const bp = [[fz + .004, sB - dcH + .002], [bz, sB + .001], [P.back(yb) + .004, yb + .006], [P.back(yb) - .006, yb - .002], [P.front(yb) + .004, yb + .002]];
        add(gProf(bp, gw, .009, true), MT.wood);
        if (small) for (let i = 1; i < 12; i++) { const y = sB - dcH - i * (yb - sB + dcH) / -12; const z0 = P.front(y) + .006, z1 = P.back(y) - .004; add(gBox(gw * 1.01, .0016, Math.max(.01, z1 - z0)), MT.rubber, 0, y, (z0 + z1) / 2).rotation.x = -Math.atan(P.rk); }
      } else {
        add(gProf(pts, gw, .006, false), poly ? MT.poly : pistolFrameMat());
        // grip panels (wood/rubber) inset into the frame, or moulded stippling on polymer frames
        const y0 = sB - dcH - .003, y1 = yb + .008;
        const pp = [[P.front(y0) + .004, y0], [P.back(y0) - .004, y0], [P.back(y1) - .004, y1], [P.front(y1) + .004, y1]];
        const pm = poly ? MT.poly : mat;
        for (const s of [-1, 1]) { const pnl = add(gProf(pp, .003, .0009, false), pm); pnl.position.x = s * (gw / 2 - .0005); }
        if (small && !poly) for (const s of [-1, 1]) for (const f of [.3, .75]) { const y = y0 + (y1 - y0) * f; add(gCylX(.0025, .0025, .0012, 8), MT.steel, s * (gw / 2 + .0012), y, (P.front(y) + P.back(y)) / 2); }
        if (small && poly) for (let i = 0; i < 3; i++) { const y = sB - dcH - .01 - i * .016; add(gBox(gw * 1.01, .0025, .006), MT.poly, 0, y, P.front(y) + .002); } // finger grooves
      }
      const hy = sB - P.gH * .42;
      rig.gripPos = V3(0, hy, (P.front(hy) + P.back(hy)) / 2 + .006); return;
    }
    if (rev) {
      pts = [[.016, bot + .004], [.044, bot + .01], [.05, bot - .02], [.066, bot - .085], [.058, bot - .097], [.036, bot - .095], [.026, bot - .06], [.012, bot - .018]];
      add(gProf(pts, RW * .95, .007, true), g === 'rev_wood' ? MT.wood : (woodStock ? MT.wood : MT.poly));
      add(gProf([[.012, bot + .006], [.046, bot + .012], [.05, bot - .012], [.014, bot - .014]], RW * .75, .003, false), MT.metal); // frame grip strap
      rig.gripPos = V3(0, bot - .05, .05); return;
    }
    const rake = g === 'rake' ? .5 : g === 'thompson' || g === 'pg_wood' ? .35 : g === 'vector' ? .15 : g === 'aug' || g === 'famas' || g === 'l85' || g === 'tavor' || g === 'x95' || g === 'qbz' || g === 'p90' || g === 'ksg' ? .15 : .3;
    const gh = g === 'p90' ? .06 : .1, w = g === 'ar' || g === 'ar_poly' ? .026 : .028;
    pts = [[gz - .015, bot + .005], [gz + .02, bot + .005], [gz + .02 + gh * rake + .01, bot - gh], [gz - .02 + gh * rake, bot - gh - .004], [gz - .022, bot - .012]];
    add(gProf(pts, w, .007, g.startsWith('pg') || g === 'ak' || g === 'thompson'), mat);
    if (small && (g === 'ar' || g === 'ar_poly' || g === 'ak_poly')) for (let i = 0; i < 3; i++) add(gBox(w * .9, .002, .006), MT.poly, 0, bot - .02 - i * .025, gz - .02 + (i * .025) * rake);
    if (g === 'thompson' && small) {}
    rig.gripPos = V3(0, bot - .045, gz + .012 + .045 * rake);
  }

  function buildTrigger() {
    const tR = pistol ? .019 : .022, tz = pistol ? PS.front(PS.sB - PS.dcH) - tR : 0, ty = pistol ? PS.sB - PS.dcH + .003 : bot;
    const tg = add(gTor(tR, pistol ? .0028 : .0025, PI * 1.05), (pistol && m.grip === 'pst_poly') ? MT.poly : MT.metal, 0, ty - .002, tz - .002);
    tg.rotation.set(0, PI / 2, PI); tg.scale.set(1, .75, 1);
    if (m.grip === 'magwell' || bullpup) tg.position.z = -.005;
    rig.trigger = grp(0, ty + .004, tz + .004);
    const tr = add(gBox(.004, .018, .005), MT.steel, 0, -.009, 0, rig.trigger); tr.rotation.x = .25;
    if (has('hammer') || pistol) {
      // hammer spur sits just under the rear sight so it never intrudes on the sight picture
      rig.hammer = grp(0, pistol ? RH * .5 - .016 : rev ? RH * .6 - .02 : top * .5, pistol ? zr - .004 : zr - .01);
      add(gBox(.006, .016, .007), MT.steel, 0, .007, .004, rig.hammer);
    }
  }

  // drum magazine body (axis across the gun): rolled edge seams, domed faces, winding key, spring-tension
  // window and latch — reads as a stamped steel drum rather than a flat disc
  // drum magazine body: axis along the bore so the flat faces point to the muzzle and the stock; rolled edge
  // seams, domed faces, winding key on the front face, pressed ribs round the rim and a latch
  function drumBody(g, r, th, x, y, z, mat) {
    add(gCyl(r, r, th, 32), mat, x, y, z, g);
    for (const s of [-1, 1]) {
      add(gCyl(r * 1.035, r * 1.035, .006, 32), mat, x, y, z + s * (th / 2 - .003), g); // rolled seam
      add(gCyl(r * .82, r * .9, .006, 28), mat, x, y, z + s * (th / 2 + .002), g); // raised face
      if (small) add(gCyl(r * .28, r * .28, .008, 18), MT.steel, x, y, z + s * (th / 2 + .006), g); // centre hub
    }
    if (small) {
      const k = add(gBox(r * .5, .004, .004), MT.steel, x, y, z - th / 2 - .011, g); k.rotation.z = .6; // winding key
      add(gCyl(.004, .004, .012, 8), MT.steel, x, y, z - th / 2 - .008, g);
      for (let i = 0; i < 5; i++) { const a = -1 + i * .5; const rb = add(gBox(.012, .003, th * .7), MT.steel, x + Math.sin(a) * r * 1.005, y + Math.cos(a) * r * 1.005, z, g); rb.rotation.z = -a; } // pressed ribs
      add(gRBox(.012, .016, .01, .003), MT.steel, x + r * .7, y + r * .55, z + th / 2 + .004, g); // latch
    }
  }

  function buildMag() {
    const mg = m.mag || ['int'];
    let type = mg[0], len = mg[1] || .15, curve = mg[2] || 0, mz = mg[3] !== undefined ? mg[3] : -.06, ang = mg[4] || 0;
    // loadout overrides
    const Lm = L.mag;
    const ext = Lm === 'mag_ext' || Lm === 'smle_20' || Lm === 'glock33' || Lm === 'psy_quad' ? 1.5 : 1;
    if (Lm === 'mag_drum' || Lm === 'thompson50' || Lm === 'rpk75') type = 'drum';
    if (Lm === 'ppsh35') { type = 'curve'; len = .2; curve = .3; }
    if (Lm === 'mp18box') { type = 'sidebox_l'; len = .16; }
    if (Lm === 'lewis97') { len = .17; }
    if (Lm === 'cmag') type = 'cmag';
    if (Lm === 'belt200' || Lm === 'mg42_belt') type = 'beltbox';
    if (Lm === 'pedersen') type = 'pedersen';
    if (Lm === 'mag_fast') type = type === 'curve' || type === 'box' ? type + '_pair' : type;
    const g = rig.mag = new THREE.Group();
    const mat = m.pl === 'plum' && type.startsWith('curve') ? MT.poly : (type === 'box_clear' ? MT.clearPoly : MT.metal);
    let pos = V3(0, bot, mz);
    const depth = ['9×19mm', '.45 ACP', '7.62×25mm', '.30 Carbine', '4.6×30mm', '5.7×28mm'].includes(wp.cal) ? .032 : (G.CAL[wp.cal].cs[0] + .014);
    const mw = Math.min(RW * .85, .03);
    const sgm = (pts, w, m2) => add(gProf(pts, w, .003, false), m2 || mat, 0, 0, 0, g);
    switch (type.replace('_pair', '')) {
      case 'box': case 'box_clear': {
        const l = len * ext;
        sgm([[-depth / 2, .01], [depth / 2, .01], [depth / 2 + l * .06, -l], [-depth / 2 + l * .06, -l]], mw);
        add(gRBox(mw * 1.25, .008, depth * 1.2, .003), MT.metal, 0, -l, l * .06, g); // floorplate
        add(gCyl(Math.min(.0055, mw * .22), Math.min(.0045, mw * .18), depth * .85, 10), MT.brass, mw * .12, .012, -.002, g); // top round
        if (type === 'box_clear') for (let i = 0; i < 6; i++) add(gCyl(.004, .004, depth * .8, 8), MT.brass, (i % 2 ? .006 : -.006), -.01 - i * l / 7, 0, g);
        if (small && type === 'box' && l > .1) for (let i = 0; i < 3; i++) add(gBox(mw * 1.05, .002, depth * .8), mat, 0, -l * (.25 + i * .22), l * .02 * i, g);
        break; }
      case 'curve': {
        const l = len * ext; const c = curve;
        const pts = [];
        const N = 8;
        for (let i = 0; i <= N; i++) { const u = i / N; pts.push([-depth / 2 - u * u * l * c * .9, .01 - u * l]); }
        for (let i = N; i >= 0; i--) { const u = i / N; pts.push([depth / 2 - u * u * l * c * .9 + u * .008, .01 - u * l]); }
        sgm(pts, mw);
        add(gCyl(Math.min(.0055, mw * .22), Math.min(.0045, mw * .18), depth * .85, 10), MT.brass, -mw * .12, .013, -.002, g); // top round
        add(gRBox(mw * 1.3, .01, depth * 1.25, .003), mat === MT.clearPoly ? MT.poly : MT.metal, 0, -l, -l * c * .9 + .004, g).rotation.x = -c * .9;
        if (small && G.isAK(wp)) for (const s of [-1, 1]) add(gProf(pts.map(p => [p[0] * .4, p[1] * .92]), .002, .0005), mat, s * mw * .52, 0, 0, g);
        if (type.includes('pair')) { const g2 = sgm(pts, mw); g2.position.set(mw * 1.2, 0, .01); add(gBox(mw * 2.4, .03, .02), MT.cloth, mw * .6, -l * .5, 0, g); }
        break; }
      case 'drum': { // pressed-steel drum: short feed tower, drum top tucked right under the receiver
        const sub = ['ppsh', 'ppd40', 'suomi', 'type100', 'lanchester'].includes(wp.id) || (wp.c === 'SMG' && G.CAL[wp.cal].cs[0] < .03);
        const r = wp.id === 'ppsh' || wp.id === 'ppd40' ? .095 : wp.id === 'suomi' ? .09 : wp.id === 'thompson' || wp.id === 'thompson1928' ? .085 : wp.id === 'mg34' ? .062 : wp.c === 'LMG' ? .08 : wp.c === 'SG' ? .078 : sub ? .08 : .07;
        const th = wp.id === 'mg34' ? .075 : wp.c === 'SG' ? .085 : wp.c === 'AR' || wp.c === 'CAR' || wp.c === 'BR' || wp.c === 'LMG' ? .07 : .075;
        const tower = .026;
        add(gRBox(mw, tower + .012, depth * .9, .004), MT.metal, 0, -tower / 2, 0, g);
        drumBody(g, r, th, 0, -tower - r * .92, sub ? -.012 : 0, wp.c === 'SG' || wp.c === 'AR' || wp.c === 'CAR' ? MT.poly : MT.metal);
        break; }
      case 'cmag': {
        add(gRBox(mw, .06, depth, .004), MT.poly, 0, -.02, 0, g);
        for (const s of [-1, 1]) add(gCylX(.055, .055, .045, 22), MT.poly, s * .03, -.1, 0, g);
        break; }
      case 'pan': {
        const r = len; pos = V3(0, top + .012, mz);
        add(gCylY(r, r, .03, 30), MT.metal, 0, .015, 0, g);
        add(gCylY(r * .22, r * .22, .04, 16), MT.steel, 0, .02, 0, g);
        if (small) for (let i = 0; i < 25; i++) { const a = i / 25 * PI * 2; add(gBox(.004, .031, r * .7), MT.metal, Math.cos(a) * r * .55, .015, Math.sin(a) * r * .55, g).rotation.y = -a + PI / 2; }
        rig.panSpin = true;
        break; }
      case 'snail': {
        pos = pistol ? V3(-RW * .5, PS.yb + .02, PS.back(PS.yb) - .02) : V3(-RW * .5, bot + .01, mz);
        add(gRBox(.03, .03, .06, .004), MT.metal, -.02, 0, 0, g);
        if (pistol) drumBody(g, .05, .055, -.045, -.04, -.02, MT.metal); else drumBody(g, .07, .065, -.075, -.06, .01, MT.metal);
        break; }
      case 'sidebox_l': {
        pos = V3(-RW * .5, -.005, mz);
        const l = len * ext;
        const s = sgm([[-depth / 2, 0], [depth / 2, 0], [depth / 2 + l * curve * .3, -l], [-depth / 2 + l * curve * .3, -l]], .028); s.rotation.z = -PI / 2; s.position.x = -.01;
        break; }
      case 'top_curve': {
        pos = V3(0, top, mz);
        const l = len; const pts = [];
        for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([-depth / 2 + u * u * l * curve, u * l]); }
        for (let i = 8; i >= 0; i--) { const u = i / 8; pts.push([depth / 2 + u * u * l * curve, u * l]); }
        sgm(pts, .03);
        break; }
      case 'half_moon': {
        pos = V3(0, bot, mz);
        const pts = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * PI; pts.push([Math.cos(a) * .09, -Math.sin(a) * .13]); }
        for (let i = 12; i >= 0; i--) { const a = i / 12 * PI; pts.push([Math.cos(a) * .045, -Math.sin(a) * .07]); }
        sgm(pts, .026);
        break; }
      case 'int': case 'enbloc': case 'tube': case 'tube2': case 'cyl': {
        if (!pistol && !rev && t !== 'pump' && t !== 'autosg' && !bullpup) add(gRBox(RW * .9, .008, .09, .003), MT.metal, 0, -.005, 0, g);
        rig.magFixed = true;
        break; }
      case 'pedersen': {
        pos = V3(RW * .3, top, zr - .1);
        const s = sgm([[-.012, 0], [.012, 0], [.02, .16], [-.004, .16]], .02); s.rotation.z = -.9;
        break; }
      case 'belt': case 'beltdrum': case 'beltbox': case 'beltpouch': {
        const box = type === 'beltdrum' ? 'drum' : type === 'beltpouch' ? 'pouch' : 'box';
        pos = V3(-RW * .5 - .01, bot + .01, mz + .01);
        if (box === 'drum') { drumBody(g, .065, .07, -.035, -.068, 0, MT.metal); }
        else if (box === 'pouch') { add(gRBox(.07, .12, .1, .02), MT.cloth, -.04, -.08, 0, g); }
        else { add(gRBox(.08, .12, .16, .006), MT.metal, -.045, -.085, 0, g); if (small) add(gBox(.05, .01, .02), MT.steel, -.045, -.02, 0, g); }
        // belt: row of rounds into the feed tray
        rig.belt = new THREE.Group(); g.add(rig.belt);
        const cs = G.CAL[wp.cal].cs;
        for (let i = 0; i < 7; i++) {
          const a = i / 6;
          const q = new THREE.Group(); q.position.set(-.035 + a * .06, -.02 + a * .04 + Math.sin(a * PI) * .015, 0); rig.belt.add(q);
          add(gCylX(cs[1], cs[1], cs[0] * .9, 8), MT.brass, 0, 0, 0, q).rotation.y = PI / 2;
          add(gBox(.006, .008, .012), MT.steel, 0, cs[1], .01, q);
        }
        rig.belt.rotation.y = PI / 2; rig.belt.position.set(0, 0, 0);
        break; }
      case 'p90': {
        pos = V3(0, top + .005, -.03);
        add(gRBox(.052, .018, len, .006), MT.clearPoly, 0, .009, 0, g);
        if (small) for (let i = 0; i < 12; i++) add(gCylX(.0028, .0028, .02, 6), MT.brass, (i % 2 ? .01 : -.01), .009, -len / 2 + .01 + i * len / 13, g);
        break; }
      case 'top_long': { // G11: long horizontal magazine lying above the barrel, rounds pointing down
        pos = V3(0, top + .004, (zr + zf) / 2 - .06);
        add(gRBox(.03, .034, len, .006), MT.poly, 0, .017, 0, g);
        if (small) for (let i = 0; i < 5; i++) add(gBox(.031, .002, .004), MT.rubber, 0, .03, -len / 2 + .03 + i * len / 5.5, g);
        break; }
      case 'cassette': { // Jackhammer rotary shell cassette behind the grip
        pos = V3(0, -.015, zr - .13);
        add(gCyl(.058, .058, .1, 20), MT.poly, 0, 0, 0, g);
        if (small) for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; add(gCyl(.012, .012, .102, 10), MT.shell, Math.cos(a) * .04, Math.sin(a) * .04, 0, g); }
        break; }
      case 'helical': { // Bizon-style helical magazine under the barrel
        pos = V3(0, bot + .005, zf + .05);
        add(gCyl(.028, .028, len, 20), MT.poly, 0, -.028, -len / 2, g);
        if (small) for (let i = 0; i < 6; i++) add(gCyl(.0285, .0285, .004, 20), MT.poly, 0, -.028, -.03 - i * len / 6.5, g);
        add(gRBox(.024, .02, .03, .006), MT.poly, 0, -.005, -.01, g);
        break; }
      case 'pst': { // magazine lives inside the grip; only the base plate shows (extended mags protrude)
        const P = PS, y0 = P.sB - P.dcH * .3, rk = P.rk;
        pos = V3(0, y0, (P.front(y0) + P.back(y0)) / 2 + .002);
        const l = (y0 - P.yb + .004) * (ext > 1 ? 1.35 : 1), hw = P.gd * .3;
        sgm([[-hw, 0], [hw, 0], [hw + l * rk, -l], [-hw + l * rk, -l]], RW * .7);
        add(gRBox(RW * 1.05, .008, hw * 2 + .012, .003), MT.poly, 0, -l - .002, l * rk + .002, g);
        rig.magGrab = V3(0, -l - .012, l * rk + .004); // base plate: where the support hand pushes the mag home
        break; }
      default: break;
    }
    if (ang) g.rotation.x = ang;
    g.position.copy(pos);
    root.add(g);
    rig.magHome = { pos: g.position.clone(), rot: g.rotation.clone() };
    rig.magType = type;
    rig.magPos = pos.clone();
  }

  // highest point of already-built geometry inside a thin corridor along the bore line (z0..z1, |x - cx| < hw)
  function corridorTop(z0, z1, cx = 0, hw = .009) {
    root.updateMatrixWorld(true);
    const b = new THREE.Box3(); let top = -1;
    root.traverse(o => {
      if (!o.isMesh || o.isSprite || (o.material && o.material.transparent)) return;
      let p = o; while (p && p !== root) { if (p === rig.mag || p === rig.bipod || p === rig.skipGroup) return; p = p.parent; }
      b.setFromObject(o);
      if (b.max.x < cx - hw || b.min.x > cx + hw) return;
      if (b.max.z < Math.min(z0, z1) || b.min.z > Math.max(z0, z1)) return;
      if (b.max.y > top) top = b.max.y;
    });
    return top;
  }
  function buildSights() {
    const s = m.sgt || 'rifle';
    let sh = .02, sz = zr - .02, eye = .14;
    const fz = muzzleZ + .035;
    // front post: blade tip lies exactly on the sight line y
    const frontPost = (y, z, hood, base = br * .8) => {
      const bh = Math.max(.006, y - .012 - base);
      add(gRBox(.012, bh, .016, .003), MT.metal, 0, base + bh / 2, z);
      add(gBox(.0022, .012, .003), MT.steel, 0, y - .006, z);
      if (hood) { const hd = add(gTor(.009, .0016, PI), MT.metal, 0, y - .006, z); }
      else if (small) for (const sx of [-1, 1]) add(gBox(.0025, .012, .01), MT.metal, sx * .0075, y - .007, z); // protective ears
    };
    // rear notch: ears' tops on the sight line, notch gap between them
    const rearNotch = (y, z, base, gap = .004, wide = .024) => {
      const bh = Math.max(.004, y - .005 - base);
      add(gRBox(wide, bh, .006, .002), MT.metal, 0, base + bh / 2, z);
      const ew = (wide - gap) / 2;
      for (const sx of [-1, 1]) add(gBox(ew, .005, .006), MT.metal, sx * (gap / 2 + ew / 2), y - .0025, z);
    };
    // rear aperture (peep): ring centred on the sight line, stem below
    const rearRing = (y, z, base, r = .0038) => {
      add(gTor(r, .0012), MT.steel, 0, y, z);
      const bh = Math.max(.003, y - r - base);
      add(gRBox(.007, bh, .006, .0015), MT.metal, 0, base + bh / 2, z);
      if (small) for (const sx of [-1, 1]) add(gRBox(.0025, r * 1.6, .006, .001), MT.metal, sx * (r + .006), y - r * .5, z);
    };
    switch (s) {
      case 'rifle': case 'tall': case 'hood': case 'lewis': case 'offset_l': {
        const rh = s === 'tall' ? .03 : s === 'lewis' ? .045 : .02;
        const rz = t === 'bolt' || t === 'lever' || t === 'pump' ? zf - .05 : zr - .03;
        const ox = s === 'offset_l' ? -.055 : 0;
        const base = t === 'bolt' || t === 'lever' ? br * 1.2 : (t === 'smg' || t === 'lmg' ? RW * .5 : top);
        eye = t === 'bolt' || t === 'lever' || t === 'pump' ? .4 : .28;
        // raise the line above anything standing between the eye and the muzzle (pans, jackets, handles)
        const clear = Math.max(corridorTop(muzzleZ + .07, rz - .02, ox), corridorTop(rz + .02, rz + eye - .05, ox, .006));
        const y = Math.max(base + .008 + rh, clear + (m.mag[0] === 'pan' ? .022 : .008));
        const prev = cur; if (ox) { cur = grp(ox, 0, 0); for (const z of [rz, fz]) add(gRBox(Math.abs(ox) + .01, .01, .02, .003), MT.metal, -ox / 2, y - .02, z, root); }
        add(gRBox(.02, .008, .07, .003), MT.metal, 0, (ox ? y - .03 : base) + .004, rz + .02); // sight base
        rearNotch(y, rz - .01, ox ? y - .03 : base + .008);
        frontPost(y, fz, s === 'hood', ox ? y - .03 : br * .8);
        cur = prev;
        sh = y; sz = rz - .01; rig.sightX = ox;
        break; }
      case 'peep': case 'uzi': {
        const base = t === 'semiw' ? RW * .5 : top;
        const y = Math.max(base + .016, corridorTop(muzzleZ + .07, zr - .03) + .004);
        rearRing(y, zr - .02, base);
        frontPost(y, fz, false);
        if (wp.id === 'garand' || wp.id === 'm14' || wp.id === 'm21' || wp.id === 'm1carbine') for (const s2 of [-1, 1]) add(gRBox(.003, .016, .018, .002), MT.metal, s2 * .0085, y - .006, fz);
        sh = y; sz = zr - .02; eye = .07;
        break; }
      case 'ak': {
        const rz = zf + .03, base = RH * .22;
        add(gProf([[rz + .05, 0], [rz - .03, 0], [rz - .03, .008], [rz + .05, .006]], .02, .002), MT.metal, 0, base);
        const y = Math.max(base + .016, corridorTop(muzzleZ + .07, rz - .04) + .004, corridorTop(rz, rz + .3, 0, .006) + .004);
        rearNotch(y, rz - .025, base + .006, .0035, .02);
        frontPost(y, fz, false);
        sh = y; sz = rz - .025; eye = .36;
        break; }
      case 'handle': case 'g36_handle': case 'qbz_handle': case 'famas': case 'p90': case 'aug_scope': {
        if (s === 'handle' || s === 'famas' || s === 'qbz_handle') {
          const hTop = s === 'famas' ? RH * .9 : top + .045;
          if (s === 'handle') { // M16 carry handle: two legs + top bar with the sight window open between them
            const zA = zr - RL * .8, zB = zr - .035;
            add(gRBox(.018, .011, zB - zA + .02, .004), MT.metal, 0, hTop - .0055, (zA + zB) / 2 + .01);
            add(gProf([[zA - .022, top], [zA + .012, top], [zA + .012, hTop - .004], [zA - .004, hTop - .004]], .018, .003), MT.metal);
            add(gProf([[zB - .02, top], [zr - .004, top], [zr - .01, hTop - .004], [zB - .016, hTop - .004]], .018, .003), MT.metal);
            if (small) for (const sx of [-1, 1]) add(gCylX(.004, .004, .004, 8), MT.steel, sx * .011, top + .01, zA - .01); // mounting screws
          }
          if (s === 'qbz_handle') add(gRBox(.02, .02, RL * .45, .006), MT.poly, 0, hTop - .01, (zr + zf) / 2 + .02);
          const y = hTop + .012;
          rearRing(y, zr - .045, hTop);
          const fbase = s === 'handle' ? br : RH * .35;
          frontPost(y, s === 'handle' ? fz : zf + .02, false, fbase);
          if (s === 'handle') add(gRBox(.03, .012, .026, .006), MT.metal, 0, br * 1.6, fz);
          sh = y; sz = zr - .045; eye = .075;
        } else {
          // integral optic housings (AUG, G36, P90). The magnified optic is the default; with irons chosen
          // (or on the P90) the housing becomes an open window with a 1× reflex ring.
          const oy = s === 'aug_scope' ? RH * .8 : s === 'p90' ? top + .034 : top + .045;
          const oz = zr - RL * .45;
          const scopeOn = L.optic === 'g36_dual' || L.optic === 'aug_scope';
          if (s === 'aug_scope') { add(gRBox(.03, .05, RL * .35, .012), MT.poly, 0, oy - .045, oz); }
          else add(gRBox(.034, .016, s === 'p90' ? .09 : RL * .6, .006), MT.poly, 0, oy - .026, oz);
          if (scopeOn) {
            if (s === 'aug_scope') { add(gCyl(.018, .018, RL * .38, 20, true), MT.poly, 0, oy, oz); add(gCyl(.017, .017, .003, 20), MT.glass, 0, oy, oz + RL * .19); add(gCyl(.019, .019, .003, 20), MT.glass, 0, oy, oz - RL * .19); }
            else { add(gCyl(.016, .016, RL * .5, 20, true), MT.poly, 0, oy, oz); add(gCyl(.015, .015, .003, 16), MT.glass, 0, oy, oz + RL * .25); add(gCyl(.015, .015, .003, 16), MT.glass, 0, oy, oz - RL * .25); add(gRBox(.02, .02, .05, .006), MT.poly, 0, oy + .03, oz); }
          } else {
            const wz = oz - .03;
            for (const sx of [-1, 1]) add(gBox(.004, .034, .09), MT.poly, sx * .019, oy, oz);
            add(gBox(.042, .004, .09), MT.poly, 0, oy + .018, oz);
            const ring = new THREE.Mesh(new THREE.RingGeometry(.0045, .0052, 36), new THREE.MeshBasicMaterial({ color: '#ff5030', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })); ring.position.set(0, oy, wz); ring.renderOrder = 10; root.add(ring);
            const d = new THREE.Mesh(new THREE.CircleGeometry(.0007, 12), ring.material); d.position.set(0, oy, wz); d.renderOrder = 10; root.add(d);
          }
          sh = oy; sz = oz + (s === 'p90' ? .05 : RL * .3); eye = .1;
          rig.integralRing = true;
        }
        break; }
      case 'flat': {
        const railLen = bullpup ? RL * .75 : t === 'ak' ? RL * .6 : RL * .95;
        const railZ = bullpup ? (zr + zf) / 2 - .02 : t === 'ak' ? zr - RL * .4 : (zr + zf) / 2;
        const ry = t === 'ak' ? RH * .35 : bullpup ? RH * .38 : top + .003;
        railStrip(railLen, 0, ry, railZ);
        if (railsOnHG) railStrip(Math.min(hgL, blen) * .85, 0, ry, zf - Math.min(hgL, blen) * .45);
        // flip-up back-up iron sights (folded flat when an optic is fitted)
        const by = ry + .006, y = by + .022;
        const fzz = railsOnHG ? zf - Math.min(hgL, blen) * .85 : zf - .02;
        if (L.optic === 'irons') {
          rearRing(y, railZ + railLen / 2 - .02, by);
          frontPost(y, fzz, true, by);
        } else {
          add(gRBox(.02, .008, .03, .003), MT.poly, 0, by + .004, railZ + railLen / 2 - .02);
          add(gRBox(.02, .008, .03, .003), MT.poly, 0, by + .004, fzz);
        }
        sh = y; sz = railZ + railLen / 2 - .02; eye = .075;
        rig.railY = ry + .006; rig.railZ = railZ; rig.railLen = railLen;
        break; }
      case 'drum_hk': {
        const y = Math.max(top + .034, corridorTop(muzzleZ + .07, zr - .06) + .004);
        add(gCylX(.011, .011, .026, 14), MT.metal, 0, y - .017, zr - .035); // rotary diopter drum below the aperture
        add(gRBox(.02, y - .026 - top, .03, .004), MT.metal, 0, top + (y - .026 - top) / 2, zr - .035);
        rearRing(y, zr - .045, y - .006, .0042);
        frontPost(y, fz, true, top);
        sh = y; sz = zr - .045; eye = .075;
        break; }
      case 'mg42': {
        const y = Math.max(top + .04, corridorTop(zf - .01, zr - .08) + .004);
        rearNotch(y, zr - .06, top, .005, .03);
        frontPost(y, zf - .02, false, br * 2);
        sh = y; sz = zr - .06; eye = .22;
        break; }
      case 'pst': {
        if (rev) {
          const strap = RH * .6, y = Math.max(strap + .01, rig.sightH + .004, corridorTop(rig.muzzleZ + .03, .2, 0, .006) + .003);
          rearNotch(y, .02, strap - .002, .0035, .016);
          const by = rig.muzzleY || 0, bt = by + m.B[1] * 1.6;
          add(gProf([[rig.muzzleZ + .006, bt], [rig.muzzleZ + .03, bt], [rig.muzzleZ + .012, y], [rig.muzzleZ + .006, y]], .004, .0008), MT.metal);
          sh = y; sz = .02; eye = .42; break;
        }
        const sy = RH * .5 + .002;
        // clear anything (hammer, rails, top-mounted parts) between the eye and the front sight
        const y = Math.max(sy + .007, corridorTop(zf + .02, zr - .02, 0, .006) + .003, corridorTop(zr - .005, zr + .25, 0, .006) + .003);
        const g = rig.slide || root;
        const prev = cur; cur = g;
        rearNotch(y, zr - .012, sy, .0035, .02);
        { const base = m.bh === 'toggle' || m.bh === 'hammer_only' ? m.B[1] * 1.3 : RH * .5, fh = Math.max(.007, y - base + .001); add(gBox(.003, fh, .008), MT.steel, 0, y - fh / 2, zf + .012); }
        if (small) { add(gSph(.0011, 6), MT.tritium, 0, y - .0015, zf + .0075); for (const s2 of [-1, 1]) add(gSph(.0011, 6), MT.tritium, s2 * .0055, y - .003, zr - .0155); }
        cur = prev;
        sh = y; sz = zr - .012; eye = .42;
        break; }
      case 'bead': case 'ghost': {
        const y = Math.max(s === 'ghost' ? top + .025 : br + .014, corridorTop(muzzleZ + .03, s === 'ghost' ? zr - .04 : zr + .02) + .005);
        if (s === 'ghost') { rearRing(y, zr - .03, top, .007); eye = .12; sz = zr - .03; }
        else { eye = .3; sz = zr; }
        add(gSph(.0028, 8), s === 'bead' ? MT.brass : MT.tritium, 0, y - .0028, muzzleZ + .012);
        if (y - br > .02) add(gRBox(.006, y - .003 - br, .01, .002), MT.metal, 0, br + (y - .003 - br) / 2, muzzleZ + .012); // raised bead post
        if (s === 'bead') add(gRBox(.006, .004, blen * .9, .002), MT.metal, 0, br + .004, zf - blen * .45);
        else frontPost(y, fz, false);
        sh = y;
        break; }
      case 'none': default: {
        sh = top + .03; sz = zr - .02; eye = .12;
        if (t === 'bolt' || t === 'precision' || t === 'amr' || has('rail_bolt')) { const ry = top + (t === 'bolt' ? RW * .2 : .003); railStrip(RL * 1.05, 0, ry, (zr + zf) / 2); rig.railY = ry + .006; rig.railZ = (zr + zf) / 2; rig.railLen = RL; }
        break; }
    }
    if (has('railT') && s !== 'flat' && !bullpup && s !== 'handle') {
      const ry = t === 'ak' ? RH * .35 : top + .003;
      railStrip(RL * .9, 0, ry, (zr + zf) / 2);
      rig.railY = ry + .006; rig.railZ = (zr + zf) / 2; rig.railLen = RL * .9;
    }
    if (has('siderail') && small) add(gRBox(.006, .03, .12, .003), MT.metal, -RW * .52, -RH * .05, zr - .08);
    if (has('railTop')) { railStrip(RL * .7, 0, RH * .52, zr - RL * .5); }
    rig.sightH = sh; rig.sightZ = sz; rig.eyeDist = eye;
  }

  function buildAction() {
    const bh = m.bh || 'none';
    const RWh = RW * .5;
    switch (bh) {
      case 'bolt': case 'bolt_bent': {
        // bolt: body inside receiver (visible), handle out the right side
        const b = rig.bolt = grp(0, 0, zr - .04);
        add(gCyl(RW * .36, RW * .36, RL * .55, 14), MT.bright, 0, 0, -RL * .1, b);
        const hArm = add(gBox(.006, .006, .055), MT.bright, RWh + .026, bh === 'bolt_bent' ? -.012 : 0, .01, b);
        hArm.rotation.y = PI / 2 - .15; if (bh === 'bolt_bent') hArm.rotation.z = -.4;
        add(gSph(.009, 12), MT.bright, RWh + .052, bh === 'bolt_bent' ? -.03 : -.004, .018, b);
        if (small) add(gCyl(RW * .3, RW * .25, .03, 12), MT.steel, 0, 0, .03, b); // cocking piece
        rig.boltStroke = RL * .45; rig.boltType = 'bolt';
        break; }
      case 'side_r': case 'side_l': case 'side_both': case 'ak': case 'ak_up': case 'hk': case 'g36': case 'qbz': case 'famas': case 'crank': case 'top': case 'ar': {
        const side = bh === 'side_l' ? -1 : 1;
        let y = 0, z = zr - RL * .35;
        const b = rig.bolt = grp(0, 0, 0);
        if (bh === 'ak' || bh === 'ak_up') {
          add(gBox(RW * .5, RH * .25, RL * .45), MT.bright, RW * .12, RH * .05, zr - RL * .45, b);
          const h = add(gBox(.018, .008, .01), MT.bright, RW * .5 + .012, RH * .05, zr - RL * .62, b); h.rotation.y = .15;
          if (bh === 'ak_up') h.rotation.z = -1.2;
          rig.boltStroke = RL * .35;
        } else if (bh === 'ar') {
          add(gBox(RW * .45, RH * .2, RL * .45), MT.bright, 0, RH * .08, zr - RL * .45, b);
          // charging handle T at rear
          rig.charge = grp(0, top - .004, zr + .005);
          add(gBox(.008, .006, .08), MT.metal, 0, 0, -.03, rig.charge);
          add(gRBox(.045, .008, .012, .003), MT.metal, 0, 0, .012, rig.charge);
          rig.boltStroke = RL * .3;
        } else if (bh === 'hk') {
          rig.charge = grp(-RW * .2, top + .01, zf - .01);
          add(gCyl(.013, .013, RL * .9, 14), MT.metal, RW * .2, 0, -RL * .1, root); // cocking tube
          const hh = add(gBox(.028, .008, .012), MT.steel, -.014, 0, -.05, rig.charge); hh.rotation.y = .3;
          rig.boltStroke = RL * .3;
          add(gBox(RW * .4, RH * .2, RL * .4), MT.bright, 0, RH * .06, zr - RL * .45, b);
        } else if (bh === 'top') {
          add(gRBox(.014, .012, .02, .003), MT.metal, 0, top + .006, zr - RL * .5, b);
          rig.boltStroke = RL * .35;
        } else if (bh === 'crank') {
          add(gBox(.005, .02, .03), MT.metal, RW * .5 + .004, 0, -.02, b);
          rig.boltStroke = .0;
        } else {
          add(gBox(RW * .4, RH * .25, RL * .35), MT.bright, 0, RH * .05, zr - RL * .45, b);
          const sides = bh === 'side_both' ? [-1, 1] : [side];
          for (const sd of sides) {
            const h = add(gBox(.022, .008, .01), MT.steel, sd * (RW * .5 + .011), RH * .1, zr - RL * (t === 'lmg' || t === 'mg' ? .7 : .5), b);
            add(gCylX(.005, .005, .012, 8), MT.steel, sd * (RW * .5 + .024), RH * .1, zr - RL * (t === 'lmg' || t === 'mg' ? .7 : .5), b);
          }
          if (t === 'semiw' && (wp.id === 'garand' || wp.id === 'm14' || wp.id === 'm21' || wp.id === 'mk14')) { // op-rod
            add(gBox(.006, .01, RL * .9), MT.metal, RW * .5 + .004, -.006, zr - RL * .8, b);
          }
          rig.boltStroke = RL * .35;
        }
        rig.boltType = 'reciprocate';
        break; }
      case 'slide': case 'slide_open': case 'slide_deagle': case 'slide_comp': case 'cock_knob': case 'toggle': {
        const s = rig.slide = grp(0, 0, 0);
        const sh = RH * .8, sy = RH * .1;
        if (bh === 'toggle') { // Luger toggle-lock: breechblock + two links that break upward at the knee
          const a = .032, ty = RH * .3, pz = zr - .008;
          add(gRBox(RW * .6, .012, .03, .003), MT.bright, 0, ty - .001, pz - 2 * a - .012, s); // breechblock
          const tr = rig.toggleR = grp(0, ty, pz, root);
          add(gRBox(RW * .62, .011, a, .003), MT.bright, 0, 0, -a / 2, tr);
          for (const sd of [-1, 1]) { const k = add(gCylX(.0095, .0095, .007, 16), MT.bright, sd * RW * .47, .002, -a, tr); if (small) for (let i = 0; i < 8; i++) add(gBox(.0072, .002, .002), MT.steel, sd * RW * .47, .002 + Math.sin(i * .785) * .0095, -a + Math.cos(i * .785) * .0095, tr); }
          const tf = rig.toggleF = grp(0, 0, -a, tr);
          add(gRBox(RW * .62, .011, a, .003), MT.bright, 0, 0, -a / 2, tf);
          rig.slideStroke = .022; rig.toggle = true;
        } else {
          const sm = MT.metal;
          add(gRBox(RW, sh, RL, .004), sm, 0, sy, (zr + zf) / 2, s);
          if (bh === 'slide_open') add(gBox(RW * 1.01, sh * .5, RL * .45), MT.rubber, 0, sy + sh * .3, zf + RL * .25, s); // open-top cut
          if (small) for (let i = 0; i < 7; i++) add(gBox(RW * 1.03, sh * .6, .0016), MT.steel, 0, sy, zr - .008 - i * .0045, s); // serrations
          add(gBox(.002, sh * .45, RL * .25), MT.rubber, RW * .51, sy + sh * .12, zr - RL * .42, s); // ejection port
          if (bh === 'slide_comp' && small) for (let i = 0; i < 3; i++) add(gBox(.004, .004, .008), MT.rubber, 0, sy + sh * .5, zf + .01 + i * .012, s);
          if (bh === 'slide_deagle') add(gRBox(RW * 1.05, sh * .6, RL * .9, .004), sm, 0, sy + sh * .25, (zr + zf) / 2 - .01, root);
          if (bh === 'cock_knob') add(gCyl(.01, .01, .012, 12), MT.bright, 0, sy, zr + .005, s);
          rig.slideStroke = RL * .22;
        }
        rig.boltType = 'slide';
        break; }
      case 'lever': {
        const lv = rig.lever = grp(0, bot - .005, -.02);
        add(gTor(.024, .003, PI * 1.1), MT.metal, 0, -.02, .05, lv).rotation.set(0, PI / 2, PI * .95);
        add(gBox(.006, .006, .09), MT.metal, 0, -.004, .03, lv);
        rig.bolt = grp(0, 0, 0); add(gBox(RW * .5, RH * .18, RL * .5), MT.bright, 0, RH * .2, zr - RL * .4, rig.bolt);
        rig.boltStroke = RL * .25; rig.boltType = 'lever';
        break; }
      case 'pump': rig.boltType = 'pump'; rig.bolt = grp(0, 0, 0); add(gBox(RW * .4, RH * .2, RL * .3), MT.bright, 0, RH * .05, zr - RL * .45, rig.bolt); rig.boltStroke = .07; break;
      case 'hammer_only': rig.boltType = 'slide'; rig.slide = grp(0, 0, 0); add(gBox(RW * .6, RH * .2, .04), MT.bright, 0, RH * .3, zr - .03, rig.slide); rig.slideStroke = .02; break;
      case 'none': default: rig.boltType = rev ? 'rev' : 'none'; break;
    }
    if (rev) {
      const c = rig.cyl = grp(0, RH * .1, -.022);
      const cr = RH * .55;
      add(gCyl(cr, cr, .045, 24), MT.metal, 0, 0, 0, c);
      if (small) for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; add(gCyl(.006, .006, .046, 10), MT.rubber, Math.cos(a) * cr * .58, Math.sin(a) * cr * .58, 0, c); add(gBox(.004, .004, .032), MT.steel, Math.cos(a + PI / 6) * cr, Math.sin(a + PI / 6) * cr, 0, c); }
      // barrel
      const bl = m.B[0];
      const by = has('low_bore') ? -RH * .2 : RH * .3;
      add(gCyl(m.B[1] * 1.6, m.B[1] * 1.5, bl, 16), MT.metal, 0, by, -.05 - bl / 2);
      if (has('vent_rib')) add(gRBox(.008, .012, bl, .002), MT.metal, 0, by + m.B[1] * 1.8, -.05 - bl / 2);
      add(gRBox(.01, .015, bl * .7, .003), MT.metal, 0, by - m.B[1] * 1.8, -.05 - bl * .4); // ejector rod shroud
      rig.muzzleZ = -.05 - bl; muzzleZ = rig.muzzleZ;
      add(gRBox(.004, .01, .008, .002), MT.steel, 0, by + m.B[1] * 1.6 + .006, muzzleZ + .01);
      rig.sightH = by + m.B[1] * 1.6 + .01; rig.sightZ = .02; rig.eyeDist = .42;
      rig.muzzleY = by;
    }
  }

  function buildMuzzle() {
    const L0 = L.muzzle;
    const mzGrp = grp(0, rig.muzzleY || 0, muzzleZ);
    cur = mzGrp;
    let len = 0;
    const d = br * 2;
    if (L0 !== 'mz_std') {
      if (['sup', 'sup_mod', 'maxim', 'pbs1', 'sten_sup'].includes(L0)) {
        const r = L0 === 'maxim' ? .016 : L0 === 'pbs1' ? .018 : pistol ? .014 : ['SMG'].includes(wp.c) ? .019 : .02;
        len = L0 === 'sten_sup' ? .2 : L0 === 'maxim' ? .14 : pistol ? .13 : .17;
        add(gCyl(r, r, len, 22), L0 === 'maxim' ? MT.steel : MT.metal, 0, 0, -len / 2);
        add(gCyl(r * .96, r * .96, .01, 22), MT.steel, 0, 0, -len);
        if (small) { add(gCyl(r * 1.04, r * 1.04, .012, 22), MT.rubber, 0, 0, -len * .15); add(gCyl(br * .45, br * .45, .003, 10), MT.rubber, 0, 0, -len - .005); }
      } else if (L0 === 'comp' || L0 === 'cutts') {
        len = .05; add(gCyl(d * .75, d * .75, len, 14), MT.metal, 0, 0, -len / 2);
        if (small) for (let i = 0; i < 3; i++) add(gBox(d * .6, .003, .004), MT.rubber, 0, d * .72, -.012 - i * .012);
      } else if (L0 === 'brake') {
        len = .07; add(gRBox(d * 2.2, d * 1.4, len, .004), MT.metal, 0, 0, -len / 2);
        if (small) for (let i = 0; i < 3; i++) for (const s of [-1, 1]) add(gBox(.002, d * 1.1, .01), MT.rubber, s * d * 1.1, 0, -.015 - i * .018);
      } else if (L0 === 'psy_maw') { // four-chamber brake with big side ports
        len = .1; add(gRBox(d * 2.6, d * 2, len, .006), MT.metal, 0, 0, -len / 2);
        for (let i = 0; i < 4; i++) for (const s of [-1, 1]) add(gBox(.003, d * 1.5, .014), MT.rubber, s * d * 1.31, 0, -.015 - i * .022);
        if (small) add(gBox(d * 1.2, .003, .05), MT.rubber, 0, d * 1.01, -len * .5);
      } else if (L0 === 'flash') {
        len = .05; add(gCyl(d * .8, d * .7, len, 12), MT.metal, 0, 0, -len / 2);
        if (small) for (let i = 0; i < 4; i++) { const a = i * PI / 2; add(gBox(.002, .004, len * .6), MT.rubber, Math.cos(a) * d * .75, Math.sin(a) * d * .75, -len * .6); }
      }
    } else {
      switch (m.mz) {
        case 'bird': case 'a2': len = .045; add(gCyl(d * .85, d * .85, len, 14), MT.metal, 0, 0, -len / 2);
          if (small) for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2 + (m.mz === 'a2' ? PI : 0); if (m.mz === 'a2' && Math.sin(a) < -.3) continue; add(gBox(.002, .003, len * .55), MT.rubber, Math.cos(a) * d * .86, Math.sin(a) * d * .86, -len * .6); }
          break;
        case 'ak74': len = .08; add(gCyl(d * 1.1, d * 1.1, len, 16), MT.metal, 0, 0, -len / 2); if (small) { add(gBox(.003, d * 1.4, .01), MT.rubber, d * 1.1, 0, -len * .45); add(gBox(.003, d * 1.4, .01), MT.rubber, -d * 1.1, 0, -len * .45); } break;
        case 'slant': len = .035; add(gCyl(d * .9, d * .9, len, 14), MT.metal, 0, 0, -len / 2); break;
        case 'ak12': len = .06; add(gCyl(d * 1.05, d * 1.05, len, 16), MT.metal, 0, 0, -len / 2); break;
        case 'an94': len = .07; add(gCyl(d * 1.2, d * .9, len, 14), MT.metal, 0, 0, -len / 2); break;
        case 'svd': len = .06; add(gCyl(d * .85, d * .85, len, 14), MT.metal, 0, 0, -len / 2); if (small) for (let i = 0; i < 5; i++) add(gBox(.002, .003, len * .6), MT.rubber, Math.cos(i * 1.25) * d * .86, Math.sin(i * 1.25) * d * .86, -len * .6); break;
        case 'fal': len = .06; add(gCyl(d * .9, d * .9, len, 14), MT.metal, 0, 0, -len / 2); break;
        case 'm14': len = .05; add(gRBox(d * 1.6, d * 2.2, len, .003), MT.metal, 0, br * .5, -len / 2); break;
        case 'garand': len = .01; break;
        case 'brake': case 'barrett': len = m.mz === 'barrett' ? .12 : .07;
          add(gRBox(d * (m.mz === 'barrett' ? 3.4 : 2.2), d * 1.5, len, .006), MT.metal, 0, 0, -len / 2);
          if (m.mz === 'barrett') { add(gRBox(d * 3.8, d * 1.7, .02, .004), MT.metal, 0, 0, -len * .3); add(gRBox(d * 3.8, d * 1.7, .02, .004), MT.metal, 0, 0, -len * .8); }
          break;
        case 'brake6': len = .05; add(gCyl(d * .9, d * .9, len, 14), MT.metal, 0, 0, -len / 2); break;
        case 'cone': len = .06; add(gCyl(d * .7, d * 1.1, len, 14), MT.metal, 0, 0, -len / 2); break;
        case 'comp': len = .05; add(gCyl(d * .9, d * .9, len, 14), MT.metal, 0, 0, -len / 2); break;
        case 'mg42': len = .05; add(gCyl(d * 1.3, d * 1.6, len, 16), MT.metal, 0, 0, -len / 2); break;
        case 'lewis': len = .0; break;
        case 'ppsh': len = .04; add(gRBox(.03, .03, len, .006), MT.metal, 0, br * .5, -len / 2); break;
        case 'moderator': len = .1; add(gCyl(d * 1.05, d * 1.05, len, 16), MT.metal, 0, 0, -len / 2); break;
        case 'sup_slx': len = .15; add(gCyl(.021, .021, len, 22), MT.metal, 0, 0, -len / 2); add(gCyl(.022, .022, .012, 22), MT.rubber, 0, 0, -.02); break;
        case 'smle': len = .01; break;
        default: len = .0;
      }
    }
    if (m.mz === 'sup_slx' && L0 === 'mz_std') S.sup = 1;
    cur = root;
    rig.muzzleZ = muzzleZ - len;
  }

  function buildExtras() {
    if (has('lug') && L.side !== 'bayonet' && small) add(gBox(.006, .01, .03), MT.metal, 0, -br * 2.2, muzzleZ + .03);
    if (has('heat')) { const hs = add(gCyl(br * 1.7, br * 1.7, blen * .6, 16, true), MT.metal, 0, br * .3, zf - blen * .35); hs.scale.set(1, 1, 1); if (small) for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) add(gSph(.0035, 6), MT.rubber, Math.cos(k * .7 + .9) * br * 1.72, Math.sin(k * .7 + .9) * br * 1.72 + br * .3, zf - .04 - i * blen * .09); }
    if (has('heat_spas')) add(gRBox(.03, .02, blen * .5, .006), MT.poly, 0, br * 1.6, zf - blen * .3);
    if (has('carry_m60') || has('carry_saw') || has('carry_pk') || has('carryhandle_bren') || has('carry_barrett') || has('carry_fold') || has('carry_galil')) {
      const cy = top + .03, cz = has('carry_barrett') ? zf + .08 : zf - .03;
      add(gRBox(.012, .012, .1, .004), MT.poly, 0, cy + .02, cz);
      for (const dz of [-.045, .045]) add(gBox(.008, .03, .008), MT.metal, 0, cy + .002, cz + dz);
    }
    if (has('cocking_tube') && m.bh !== 'hk') add(gCyl(.012, .012, RL * .8, 14), MT.metal, 0, top + .012, zf - .02);
    if (has('bayo_fold')) { const b = add(gBox(.006, .01, .25), MT.bright, 0, -br * 2.5, zf - blen * .4); }
    if (has('bayo_spike')) { add(gCyl(.003, .003, .2, 6), MT.bright, br * 1.8, -br * 1.5, zf - blen * .45); }
    if (has('resthook')) add(gRBox(.012, .03, .04, .004), MT.poly, 0, -br * 2 - .012, zf - .03);
    if (has('magwell_long')) add(gRBox(RW * .95, .045, .045, .004), MT.metal, 0, bot - .015, -.07);
    if (has('frontgrip')) { // integral front grip under the front of the frame/receiver (Beretta M12, 93R fold-down grip)
      const fy = pistol ? PS.sB - PS.dcH + .002 : bot + .004, fz = pistol ? zf + .03 : zf + .045, fh = pistol ? .05 : .08;
      add(gProf([[-.012, 0], [.016, 0], [.022, -fh], [-.006, -fh - .004]], pistol ? .02 : .026, .006, true), pistol ? MT.metal : (woodStock ? MT.wood : MT.poly), 0, fy, fz);
      rig.hgPos = V3(0, fy - fh * .5, fz + .005);
    }
    if (has('uzi_body')) add(gRBox(.05, .02, RL * .9, .006), MT.poly, 0, bot - .005, (zr + zf) / 2);
    if (has('mac_strap')) add(gRBox(.006, .012, .05, .002), MT.cloth, 0, br * 2, muzzleZ + .02);
    if (has('foldgrip')) { const fz = zf + .035; add(gRBox(.026, .012, .03, .004), MT.poly, 0, bot + .002, fz); add(gProf([[-.011, 0], [.011, 0], [.014, -.075], [-.01, -.075]], .022, .005), MT.poly, 0, bot, fz); rig.hgPos = V3(0, bot - .05, fz); }
    if (has('claw') && small) { add(gBox(.02, .012, .02), MT.steel, 0, top + .01, zr - .08); add(gBox(.02, .012, .02), MT.steel, 0, top + .01, zf + .02); }
    if (has('topbreak') && small) add(gBox(.012, .006, .02), MT.steel, 0, RH * .5, .03);
    if (has('sling_oiler') && small) add(gRBox(.03, .012, .008, .004), MT.cloth, 0, bot - .02, zr + .15);
    if (has('stg_rear')) add(gRBox(RW * .7, .02, RL * .3, .005), MT.metal, 0, top + .005, zr - .06);
    if (has('tavor_guard')) add(gRBox(.03, .012, .1, .004), MT.poly, 0, bot - .09, .01);
    if (has('chassis')) { add(gRBox(RW * 1.3, RH * .9, RL * 1.2, .008), MT.metal, 0, -RH * .3, (zr + zf) / 2 + .02); }
    if (has('charge_both') && small) for (const s of [-1, 1]) add(gBox(.015, .008, .012), MT.steel, s * (RW * .5 + .008), top - .01, zr - .03);
    if (has('drumhook')) {}
    // fixed bipod (folded, or deployed in the range)
    if (S.bip) {
      const bz = t === 'mg' || t === 'lmg' ? zf - Math.min(blen, hgL || blen) * .75 : zf - Math.min(blen * .6, .25);
      const bg = rig.bipod = grp(0, -br * 2.2 - .01, bz);
      add(gRBox(.03, .014, .03, .004), MT.metal, 0, 0, 0, bg);
      rig.bipodLegs = [];
      for (const s of [-1, 1]) {
        const leg = grp(s * .012, 0, 0, bg);
        add(gCyl(.004, .004, .2, 8), MT.metal, 0, 0, -.1, leg);
        add(gSph(.007, 8), MT.rubber, 0, 0, -.2, leg);
        leg.rotation.y = s * .06;
        rig.bipodLegs.push(leg);
      }
    }
    // sling swivels
    if (small && !pistol && !rev && !bullpup) { add(gTor(.007, .0015), MT.steel, 0, bot - .02, (rig.stockEnd ? rig.stockEnd.z : zr) - .05).rotation.y = PI / 2; }
  }

  function buildExperimental() {
    const bl = Math.max(.1, blen);
    if (has('twin_over')) { add(gCyl(br * 1.1, br * .9, bl * .95, 14), MT.steel, 0, -br * 2.6, zf - bl * .48); add(gRBox(br * 3, br * 5, .02, br), MT.metal, 0, -br * 1.3, zf - bl * .95); }
    if (has('triple')) for (const [x, y] of [[-br * 2.3, -br * 1.4], [br * 2.3, -br * 1.4]]) add(gCyl(br * 1.1, br * .95, bl, 14), MT.steel, x, y, zf - bl / 2);
    if (has('triple')) add(gRBox(br * 7, br * 4, .03, br), MT.metal, 0, -br * .8, zf - bl + .015);
    if (has('twin_side')) { // Villar-Perosa: a second complete gun alongside the first
      const twin = new THREE.Group(); twin.position.x = Math.max(.052, RW * 1.2);
      const src = root.children.slice();
      for (const o of src) { if (o === rig.mag || o === rig.bipod || o.isSprite) continue; const c = o.clone(true); twin.add(c); }
      const m2 = rig.mag.clone(true); twin.add(m2);
      root.add(twin); add(gRBox(.06, .012, .04, .004), MT.metal, .026, -RH * .5, zf + .03);
      add(gRBox(.06, .012, .04, .004), MT.metal, .026, -RH * .5, zr - .03);
    }
    if (has('oicw_gl')) { // 20 mm / 40 mm launcher module riding above the carbine
      const gy = RH * .55 + .045, gl = RL * .95;
      add(gCyl(.03, .03, gl, 22), MT.poly, 0, gy, (zr + zf) / 2 - .1);
      add(gCyl(.02, .02, .04, 16), MT.metal, 0, gy, (zr + zf) / 2 - .1 - gl / 2 - .02);
      add(gRBox(.05, .05, .15, .012), MT.poly, 0, gy + .045, zr - .1);
      add(gCyl(.017, .017, .003, 16), MT.glass, 0, gy + .045, zr - .1 - .076);
    }
    // ---------------- psycho-arsenal parts
    if (has('vents') && small) for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) add(gBox(.002, RH * .35, .008), MT.rubber, sx * (RW * .5 + .001), RH * .05, zf + .03 + i * .016);
    if (has('hazard')) for (const sx of [-1, 1]) add(gRBox(.003, RH * .3, RL * .3, .001), MT.hazard, sx * (RW * .5 + .002), -RH * .15, zr - RL * .3);
    if (has('heatsink')) { // finned shroud; the fins glow orange as the barrel heats
      const hl = Math.min(bl * .6, .3), r0 = br * 2.6;
      add(gCyl(br * 1.6, br * 1.6, hl, 14), MT.metal, 0, 0, zf - hl / 2 - .01);
      for (let i = 0; i < Math.floor(hl / .016); i++) add(gCyl(r0, r0, .005, 18), MT.heat, 0, 0, zf - .015 - i * .016);
      for (const a of [0, PI]) add(gBox(.004, .004, hl), MT.metal, Math.cos(a) * r0, Math.sin(a) * r0, zf - hl / 2 - .01);
      rig.heatMat = MT.heat;
    }
    if (has('integral_sup')) { // full-length integral suppressor around the barrel
      const len = bl + .06, r = Math.max(.022, br * 2.6);
      add(gCyl(r, r, len, 24), MT.metal, 0, 0, zf - len / 2);
      add(gCyl(r * 1.04, r * 1.04, .01, 24), MT.steel, 0, 0, zf - len + .005);
      if (small) for (let i = 0; i < 8; i++) add(gCyl(r * 1.03, r * 1.03, .003, 24), MT.rubber, 0, 0, zf - .05 - i * len / 9);
      add(gCyl(br * .6, br * .6, .003, 12), MT.rubber, 0, 0, zf - len - .001);
      rig.muzzleZ = muzzleZ = zf - len - .002;
    }
    if (has('shellsaddle')) { // side-saddle shell carrier on the receiver
      add(gRBox(.01, .04, .12, .003), MT.poly, -(RW * .5 + .005), -.01, zr - RL * .45);
      for (let i = 0; i < 6; i++) { add(gCylY(.0105, .0105, .05, 10), MT.shell, -(RW * .5 + .016), -.01, zr - RL * .45 - .05 + i * .02); add(gCylY(.011, .011, .01, 10), MT.brass, -(RW * .5 + .016), -.036, zr - RL * .45 - .05 + i * .02); }
    }
    if (has('smartpod')) { // target-designator pod: laser emitter + sensor window + status screen
      const px = RW * .5 + .022, pz = zf + .05;
      add(gRBox(.03, .036, .08, .008), MT.poly, px, .0, pz);
      add(gCyl(.008, .008, .004, 14), MT.glow, px, .006, pz - .041);
      add(gRBox(.018, .012, .003, .002), MT.glowC, px, -.008, pz - .041);
      add(gRBox(.002, .018, .03, .001), MT.glowC, px + .016, .004, pz + .01);
      rig.coilMat = rig.coilMat || MT.glowC;
    }
    if (has('rotor6')) { // six rotating barrels, clamps and a drive motor
      const R6 = rig.rotor = grp(0, 0, zf);
      const rr = .018, br6 = .0062;
      for (let i = 0; i < 6; i++) { const a = i * PI / 3; add(gCyl(br6, br6 * .9, bl, 12), MT.steel, Math.cos(a) * rr, Math.sin(a) * rr, -bl / 2, R6); add(gCyl(br6 * .45, br6 * .45, .003, 8), MT.rubber, Math.cos(a) * rr, Math.sin(a) * rr, -bl - .001, R6); }
      for (const f of [.02, .45, .93]) add(gCyl(rr + .011, rr + .011, .014, 20), MT.metal, 0, 0, -bl * f, R6);
      add(gCyl(rr + .016, rr + .014, .07, 20), MT.metal, 0, 0, .03, R6); // rotor housing
      add(gRBox(.05, .05, .13, .01), MT.metal, 0, -RH * .55, zf + .1); // drive motor
      add(gCyl(.018, .018, .02, 16), MT.steel, 0, -RH * .55, zf + .03);
      if (small) for (let i = 0; i < 4; i++) add(gBox(.052, .003, .01), MT.rubber, 0, -RH * .55 + .026, zf + .06 + i * .022);
      rig.muzzleZ = muzzleZ = zf - bl - .002;
    }
    if (has('backfeed')) { // flexible feed chute running back to the backpack ammo can
      for (let i = 0; i < 9; i++) { const u = i / 8; const c = add(gRBox(.034, .02, .03, .005), MT.metal, -(RW * .5 + .02) - u * .04, -RH * .35 - u * u * .25, zr - RL * .3 + u * .22); c.rotation.x = -u * 1.1; }
    }
    if (has('coil')) { // twelve copper coil stages with glowing field rings, twin rails, capacitor banks
      const n = 12, step = Math.min(bl * .9, .72) / n;
      add(gRBox(.01, .007, bl * .95, .002), MT.steel, 0, .03, zf - bl * .48);
      add(gRBox(.01, .007, bl * .95, .002), MT.steel, 0, -.03, zf - bl * .48);
      for (let i = 0; i < n; i++) { const z = zf - .03 - i * step; add(gCyl(.024, .024, step * .6, 18), MT.copper, 0, 0, z); add(gCyl(.0262, .0262, step * .12, 18), MT.glowC, 0, 0, z - step * .38); }
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { add(gCyl(.013, .013, .15, 14), MT.metal, sx * (RW * .5 + .014), -RH * .25 + k * .028, zr - RL * .45); add(gCyl(.0132, .0132, .004, 14), MT.glowC, sx * (RW * .5 + .014), -RH * .25 + k * .028, zr - RL * .45 - .076); }
      if (small) for (let i = 0; i < 6; i++) add(gBox(RW * .9, .012, .004), MT.metal, 0, RH * .45, zr - .06 - i * .018); // cooling fins
      add(gRBox(.05, .05, .02, .01), MT.metal, 0, 0, zf - bl - .005); // muzzle crown plate
      rig.coilMat = MT.glowC;
    }
    if (has('pepper7')) { // seven-barrel cluster: centre barrel plus six around it
      const rr = br * 2.3;
      for (let i = 0; i < 6; i++) { const a = i * PI / 3; add(gCyl(br * 1.05, br * 1.05, bl, 12), MT.steel, Math.cos(a) * rr, Math.sin(a) * rr, zf - bl / 2); add(gCyl(br * .8, br * .8, .003, 10), MT.rubber, Math.cos(a) * rr, Math.sin(a) * rr, zf - bl - .001); }
      for (const f of [.05, .55, .97]) add(gCyl(rr + br * 1.6, rr + br * 1.6, .018, 20), MT.metal, 0, 0, zf - bl * f);
      add(gCyl(rr + br * 1.8, rr + br * 1.8, .05, 20), MT.metal, 0, 0, zf + .02); // breech block
    }
    if (has('bigcyl')) { // six-shot revolving cylinder for 20 mm shells
      const cr = .062, cl = .14, cz = zr - RL * .5, cy = -cr * .68;
      const C = rig.bigcyl = grp(0, cy, cz);
      add(gCyl(cr, cr, cl, 30), MT.metal, 0, 0, 0, C);
      for (let i = 0; i < 6; i++) { const a = PI / 2 + i * PI / 3, x = Math.cos(a) * cr * .68, y = Math.sin(a) * cr * .68; add(gCyl(.017, .017, cl + .002, 14), MT.rubber, x, y, 0, C); add(gCyl(.0165, .0165, .006, 14), MT.brass, x, y, cl / 2 + .002, C); if (small) add(gBox(.006, .004, cl * .8), MT.steel, Math.cos(a + PI / 6) * cr, Math.sin(a + PI / 6) * cr, 0, C); }
      add(gCyl(.012, .012, cl + .04, 12), MT.steel, 0, cy, cz); // arbor pin
      add(gRBox(RW * 1.05, .04, .04, .008), MT.metal, 0, cy - cr - .01, cz); // frame bottom strap
    }
    if (has('rocketpod')) { // twelve seeker-rocket tubes in a 3 x 4 block
      const len = .32;
      add(gRBox(.11, .11, .03, .01), MT.poly, 0, -.028, zf + .01);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const x = (c - 1) * .032, y = -.068 + r * .027; add(gCyl(.0125, .0125, len, 14, true), MT.poly, x, y, zf - len / 2); add(gCyl(.0105, .0105, .004, 14), MT.rubber, x, y, zf - .03); add(gSph(.009, 10), MT.red, x, y, zf - .04); }
      for (const f of [.2, .6, .95]) add(gRBox(.108, .11, .012, .008), MT.metal, 0, -.028, zf - len * f);
      rig.muzzleZ = muzzleZ = zf - len - .002;
    }
    if (has('dbl')) { // side-by-side double rifle: second barrel, rib and forend loop
      const dx = br * 2.2;
      add(gCyl(br * 1.25, br * .95, bl, 16), MT.steel, dx, 0, zf - bl / 2);
      add(gCyl(br * .45, br * .45, .004, 12), MT.rubber, dx, 0, zf - bl - .001);
      add(gRBox(dx * .6, .006, bl * .98, .002), MT.metal, dx / 2, br * .9, zf - bl / 2);
      add(gRBox(dx * 2.4, br * 2.4, .02, .004), MT.metal, dx / 2, 0, zf - bl + .02);
      add(gRBox(.008, .02, .04, .003), MT.bright, 0, RH * .45, zr - .01); // top lever
    }
    if (has('gyro')) for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; add(gCyl(.0016, .0016, .004, 6), MT.rubber, Math.cos(a) * .006, Math.sin(a) * .006, muzzleZ - .001); }
  }
  function buildAttachments() {
    // ---------- optic
    const O = L.optic;
    if (O !== 'irons' && G.ATT[O]) {
      const at = G.ATT[O], s = at.s;
      let ry = rig.railY || (t === 'ak' ? RH * .35 : ['bolt', 'lever', 'semiw'].includes(t) ? RW * .5 + .004 : top + .006);
      if (m.sgt === 'handle') ry = top + .05; // scopes sit on top of the carry handle
      const rz = rig.railZ !== undefined ? rig.railZ : zr - RL * .5;
      const og = grp(0, ry, rz);
      cur = og;
      let axis = .03, ocZ = .06, lensZ = -.06, ox = 0;
      const zoom = s.zoom || 1;
      const mount = (h, z, x = 0) => { add(gRBox(.022, h, .014, .003), MT.metal, x, h / 2, z); };
      // open tube: outer shell + dark inner wall, see-through when looked down
      const openTube = (rr, rf, len, y, z, x = 0) => { add(gCyl(rr, rf, len, 24, true), MT.metal, x, y, z); add(gCyl(rr * .92, rf * .92, len, 24, true), MT.inner, x, y, z); };
      const lens = (r, y, z, x = 0, mat = MT.lensClear) => { const l = add(gCyl(r, r, .002, 24), mat, x, y, z); l.castShadow = false; l.renderOrder = 2; return l; };
      // rectangular window frame (holo / reflex): bars around an open aperture
      const frame = (w, h, y, z, d, mat, x = 0) => {
        add(gBox(w + .008, .004, d), mat, x, y + h / 2 + .002, z); add(gBox(w + .008, .004, d), mat, x, y - h / 2 - .002, z);
        for (const sx of [-1, 1]) add(gBox(.004, h + .008, d), mat, x + sx * (w / 2 + .002), y, z);
      };
      if (zoom >= 1.2) {
        // ----- magnified optics: modelled in detail, viewed through the scope overlay at full ADS
        if (O === 'acog') {
          axis = .044; add(gRBox(.03, .022, .1, .006), MT.metal, 0, .011, 0);
          openTube(.018, .016, .1, axis, 0); openTube(.021, .018, .04, axis, -.07);
          lens(.019, axis, -.088, 0, MT.glass); lens(.013, axis, .05, 0, MT.glass);
          add(gRBox(.007, .006, .07, .002), MT.red, 0, axis + .021, -.01); ocZ = .058; lensZ = -.09;
        } else if (O === 'susat') {
          axis = .052; add(gProf([[-.07, 0], [.07, 0], [.07, .06], [-.07, .065]], .04, .008), MT.metal, 0, 0, 0);
          lens(.02, axis, -.072, 0, MT.glass); add(gRBox(.04, .045, .03, .01), MT.rubber, 0, axis, .085); ocZ = .1; lensZ = -.072;
        } else if (O === 'colt3x') {
          axis = .022; mount(.012, -.03); mount(.012, .03); openTube(.012, .012, .15, axis, 0); lens(.012, axis, -.075, 0, MT.glass); lens(.011, axis, .075, 0, MT.glass); ocZ = .08; lensZ = -.075;
        } else if (O === 'pso1') {
          ox = -(RW * .5 + .035); og.position.x = 0;
          add(gRBox(.012, .07, .11, .004), MT.metal, ox * .55, .01, 0);
          axis = .055; openTube(.015, .015, .26, axis, 0, ox); openTube(.021, .015, .05, axis, -.15, ox);
          lens(.019, axis, -.174, ox, MT.glass); lens(.014, axis, .13, ox, MT.glass); add(gRBox(.034, .034, .06, .012), MT.rubber, ox, axis, .16);
          add(gCylY(.008, .008, .022, 12), MT.metal, ox, axis + .02, -.02); add(gCylX(.008, .008, .022, 12), MT.metal, ox - .02, axis, -.02);
          ocZ = .19; lensZ = -.174;
        } else if (O === 'xm157') {
          axis = .052; add(gRBox(.052, .03, .19, .01), MT.poly, 0, .015, 0);
          openTube(.024, .02, .19, axis, 0); lens(.023, axis, -.096, 0, MT.glass); lens(.019, axis, .096, 0, MT.glass);
          add(gRBox(.03, .035, .08, .008), MT.poly, .032, .045, -.03); add(gCyl(.006, .006, .003, 10), MT.glass, .032, .05, -.071); ocZ = .1; lensZ = -.096;
        } else if (O === 'holo_mag') {
          axis = .038; add(gRBox(.044, .02, .1, .006), MT.poly, 0, .01, -.03); frame(.034, .026, axis, -.03, .1, MT.poly); lens(.013, axis, -.07, 0, MT.lensRed);
          openTube(.015, .015, .09, axis, .07); lens(.013, axis, .115, 0, MT.glass); ocZ = .12; lensZ = -.06;
        } else if (O === 'psy_oracle') { // digital ballistic-computer scope: armoured body, rangefinder, live side display
          axis = .046; add(gRBox(.05, .052, .2, .012), MT.poly, 0, .026, 0);
          openTube(.024, .024, .06, axis, -.12); lens(.023, axis, -.15, 0, MT.glass);
          openTube(.017, .02, .04, axis, .12); lens(.016, axis, .14, 0, MT.glass); add(gCyl(.02, .02, .02, 20, true), MT.rubber, 0, axis, .15);
          add(gRBox(.026, .02, .05, .006), MT.metal, .03, .06, -.03); add(gCyl(.007, .007, .003, 12), MT.glowC, .03, .062, -.056); // laser rangefinder
          add(gRBox(.002, .03, .08, .001), MT.glowC, .026, .03, .01); // side display
          for (const z of [-.06, .06]) add(gRBox(.03, .012, .02, .004), MT.metal, 0, .006, z);
          rig.coilMat = rig.coilMat || MT.glowC; ocZ = .16; lensZ = -.15;
        } else if (O === 'g36_dual' || O === 'aug_scope') {
          axis = rig.sightH - ry; ocZ = rig.sightZ - rz; lensZ = -.08;
        } else {
          const old = at.e1 !== undefined && at.e1 <= 2;
          const r = old ? .011 : zoom >= 12 ? .017 : .015;
          const len = old ? (O === 'unertl' || O === 'win_a5' ? .42 : .26) : zoom >= 12 ? .34 : .28;
          const bf = old ? r * 1.3 : zoom >= 12 ? .03 : .024, bR = old ? r * 1.4 : .02;
          axis = old ? .045 : .037;
          mount(axis - r, -len * .25); mount(axis - r, len * .25);
          for (const z of [-len * .25, len * .25]) add(gCyl(r * 1.25, r * 1.25, .014, 20, true), MT.metal, 0, axis, z);
          openTube(r, r, len, axis, 0); openTube(bR, r, .04, axis, len / 2 + .02); openTube(r, bf, .05, axis, -len / 2 - .025);
          lens(bf * .9, axis, -len / 2 - .049, 0, MT.glass); lens(bR * .85, axis, len / 2 + .039, 0, MT.glass);
          add(gCyl(bR * 1.05, bR * 1.05, .014, 20, true), MT.rubber, 0, axis, len / 2 + .045);
          if (!old || zoom >= 3) { add(gCylY(.009, .009, .016, 14), MT.metal, 0, axis + r + .008, 0); add(gCylX(.009, .009, .016, 14), MT.metal, r + .008, axis, 0); }
          if (zoom >= 12 && small) add(gCylX(.012, .012, .01, 16), MT.metal, -r - .006, axis, 0);
          ocZ = len / 2 + .052; lensZ = -len / 2 - .05;
        }
      } else {
        // ----- 1× optics: everything around the sight axis is open so the eye sees straight through
        const dotCol = '#ff2a1a';
        if (O === 'holo') {
          axis = .034; add(gRBox(.044, .018, .1, .005), MT.poly, 0, .009, 0);
          add(gRBox(.03, .012, .03, .004), MT.poly, 0, .018 + .006, .03); // battery / controls, below the window
          frame(.034, .027, axis, -.035, .012, MT.poly); frame(.034, .027, axis, .038, .01, MT.poly);
          for (const sx of [-1, 1]) add(gBox(.004, .03, .07), MT.poly, sx * .019, axis, 0); // hood sides
          add(gBox(.042, .004, .08), MT.metal, 0, axis + .017, 0); // hood top
          lens(.001, axis, 0); const w = add(gBox(.034, .027, .002), MT.lensRed, 0, axis, -.035); w.renderOrder = 2;
          lensZ = -.035; ocZ = .04;
        } else if (O === 'rmr') {
          axis = .016; if (pistol) og.position.set(0, RH * .5 + .002, zr - .04);
          add(gRBox(.026, .009, .04, .003), MT.poly, 0, .0045, 0);
          frame(.02, .016, axis, -.012, .012, MT.poly);
          const w = add(gBox(.02, .016, .002), MT.lensRed, 0, axis, -.012); w.renderOrder = 2;
          lensZ = -.012; ocZ = .02;
        } else if (O === 'kobra') {
          ox = -(RW * .5 + .02); add(gRBox(.012, .06, .08, .004), MT.metal, ox * .45, .005, 0);
          axis = .05; add(gRBox(.04, .012, .09, .004), MT.metal, ox, axis - .022, 0);
          frame(.032, .03, axis, -.04, .012, MT.metal, ox); frame(.032, .03, axis, .03, .008, MT.metal, ox);
          const w = add(gBox(.032, .03, .002), MT.lensRed, ox, axis, -.04); w.renderOrder = 2;
          lensZ = -.04; ocZ = .05;
        } else { // Aimpoint-style tube red dot
          axis = .031; add(gRBox(.024, .014, .05, .004), MT.metal, 0, .007, 0); add(gRBox(.014, axis - .014 - .017, .03, .003), MT.metal, 0, .014 + (axis - .031) / 2 + .0, 0);
          openTube(.018, .018, .11, axis, 0); lens(.0165, axis, -.05, 0, MT.lensRed); lens(.0165, axis, .05);
          add(gCylX(.007, .007, .012, 12), MT.metal, .022, axis, 0); add(gCylY(.007, .007, .01, 12), MT.metal, 0, axis + .021, .01);
          if (O === 'aimpoint_e') add(gRBox(.02, .02, .06, .005), MT.metal, 0, axis + .03, 0);
          lensZ = -.05; ocZ = .056;
        }
        // reticle: glowing dot projected at infinity (sits on the lens, centred on the axis)
        const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.texSprite('glow'), color: dotCol, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
        dot.scale.set(.003, .003, 1); dot.position.set(ox, axis, lensZ - .003); dot.renderOrder = 10; og.add(dot);
        if (O === 'holo') { const ring = new THREE.Mesh(new THREE.RingGeometry(.0062, .0068, 40), new THREE.MeshBasicMaterial({ color: '#ff4030', transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })); ring.position.set(0, axis, lensZ - .003); ring.renderOrder = 10; og.add(ring); rig.ring = ring; }
        if (O === 'kobra') { for (const [dx, dy, w, h] of [[0, -.0035, .0006, .004], [-.003, .002, .004, .0006], [.003, .002, .004, .0006]]) { const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#ff3020', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })); q.position.set(ox + dx, axis + dy, lensZ - .003); q.renderOrder = 10; og.add(q); } }
        rig.dot = dot;
      }
      // raise the optic on a riser if anything (iron sights, handles, pans) would sit in its field of view
      rig.skipGroup = og;
      const need = Math.max(corridorTop(rig.muzzleZ + .05, rz + lensZ, og.position.x + ox, .012), corridorTop(rz + ocZ, rz + ocZ + .12, og.position.x + ox, .01));
      rig.skipGroup = null;
      const lift = need + .008 - (og.position.y + axis);
      if (lift > 0 && O !== 'g36_dual' && O !== 'aug_scope') {
        og.position.y += lift;
        for (const z of [-.03, .03]) add(gRBox(.024, lift + .004, .03, .003), MT.metal, og.position.x, og.position.y - lift / 2, rz + z, root);
      }
      rig.sightH = og.position.y + axis; rig.sightZ = rz + ocZ; rig.eyeDist = zoom >= 1.2 ? .07 : .14;
      rig.sightX = og.position.x + ox;
      rig.optic = at; rig.lensZ = rz + lensZ;
      cur = root;
    }
    // ---------- underbarrel
    const U = L.under;
    const uz = zf - Math.min(hgL || blen * .4, blen) * .55;
    const uy = hgT === 'wfull' || hgT === 'wood' ? -br * 3 - .006 : -.027;
    if (U === 'vgrip' || U === 'thompson_vfg') {
      const mat = U === 'thompson_vfg' ? MT.wood : MT.poly;
      add(gProf([[-.014, 0], [.014, 0], [.016, -.085], [-.016, -.085]], .026, .008, U === 'thompson_vfg'), mat, 0, uy, U === 'thompson_vfg' ? zf - .09 : uz);
      rig.hgPos = V3(0, uy - .05, U === 'thompson_vfg' ? zf - .09 : uz);
    } else if (U === 'agrip') {
      add(gProf([[-.03, 0], [.02, 0], [.03, -.04], [-.005, -.03]], .024, .006), MT.poly, 0, uy, uz);
      rig.hgPos = V3(0, uy - .02, uz);
    } else if (U === 'handstop') {
      add(gProf([[-.012, 0], [.012, 0], [.016, -.022], [-.008, -.012]], .022, .005), MT.poly, 0, uy, uz - .04);
      rig.hgPos = V3(0, uy - .01, uz);
    } else if (U === 'm203' || U === 'gp25') {
      const gl = U === 'gp25' ? .2 : .3, r = .022;
      add(gCyl(r, r, gl, 18), MT.metal, 0, uy - r - .005, uz - .04);
      add(gRBox(.03, .02, gl * .6, .006), MT.metal, 0, uy - .004, uz - .02);
      add(gProf([[-.01, 0], [.02, 0], [.03, -.06], [0, -.065]], .024, .006), MT.poly, 0, uy - r * 2, uz + gl * .45);
      rig.hgPos = V3(0, uy - r * 2 - .02, uz);
      rig.gl = true;
    } else if (U === 'bipod' && !rig.bipod) {
      const bg = rig.bipod = grp(0, uy, zf - Math.min(blen * .6, .25));
      add(gRBox(.03, .016, .03, .005), MT.metal, 0, 0, 0, bg);
      rig.bipodLegs = [];
      for (const s of [-1, 1]) { const leg = grp(s * .012, 0, 0, bg); add(gCyl(.004, .004, .19, 8), MT.metal, 0, 0, -.095, leg); add(gSph(.006, 8), MT.rubber, 0, 0, -.19, leg); rig.bipodLegs.push(leg); }
    }
    // ---------- side / lug
    const Sd = L.side;
    if (Sd === 'bayonet' || Sd === 'wirecut') {
      const blade = Sd === 'wirecut' ? .06 : wp.c === 'RIF' && G.ERA[wp.e].ord <= 1 ? .4 : .17;
      const bgp = grp(0, -br * 2.2, rig.muzzleZ + .06);
      add(gRBox(.014, .02, .03, .004), MT.metal, 0, 0, 0, bgp);
      add(gTor(br * 1.2, .002), MT.steel, 0, br * 2.2, -.01, bgp);
      if (Sd === 'bayonet') { const bl = add(gProf([[0, .006], [-blade, .002], [-blade - .02, -.004], [0, -.01]], .004, .0008), MT.bright, 0, 0, -.005, bgp); }
      else { add(gBox(.02, .03, .05), MT.steel, 0, .01, -.03, bgp); }
      if (Sd === 'bayonet' && blade < .3) add(gRBox(.016, .02, .1, .006), MT.poly, 0, -.002, .06, bgp);
    }
    if (Sd === 'psy_saw') { // chainsaw bayonet: motor housing, guide bar and a chain of teeth
      const sg = grp(0, -br * 2.4 - .018, rig.muzzleZ + .12);
      add(gRBox(.03, .04, .09, .008), MT.hazard, 0, 0, .02, sg);
      add(gCyl(.012, .012, .03, 12), MT.metal, 0, -.005, -.03, sg).rotation.x = PI / 2;
      add(gProf([[0, .012], [-.2, .008], [-.215, 0], [-.2, -.008], [0, -.012]], .004, .001), MT.bright, 0, 0, -.02, sg);
      const chain = rig.saw = grp(0, 0, -.02, sg);
      for (let i = 0; i < 18; i++) { const z = -i * .0115; add(gBox(.006, .006, .006), MT.steel, 0, .014 - i * .0002, z, chain); add(gBox(.006, .006, .006), MT.steel, 0, -.014 + i * .0002, z, chain); }
    }
    if (Sd === 'laser' || Sd === 'dbal' || Sd === 'light' || Sd === 'peq2' || Sd === 'lasergrip') {
      const sz = zf - Math.min(hgL || .12, blen) * .5;
      const sx = pistol ? 0 : (hgT === 'quad' || hgT === 'quad_long' || hgT.startsWith('mlok') ? .032 : RW * .5 + .02);
      const sy = pistol ? PS.sB - PS.dcH - .012 : 0;
      if (Sd === 'light') { add(gCyl(.013, .013, .1, 16), MT.metal, sx, sy, sz); add(gCyl(.012, .012, .002, 16), MT.glass, sx, sy, sz - .05); }
      else if (Sd === 'lasergrip') { add(gRBox(.018, .016, .04, .005), MT.poly, sx, sy + .004, sz + .02); add(gCyl(.003, .003, .003, 10), MT.glow, sx, sy, sz - .001); }
      else { add(gRBox(Sd === 'peq2' ? .036 : .03, .03, Sd === 'peq2' ? .1 : .08, .006), MT.poly, sx, sy, sz); add(gCyl(.004, .004, .003, 10), MT.glow, sx - .006, sy + .006, sz - .041); if (Sd !== 'dbal') add(gCyl(.006, .006, .003, 10), MT.glass, sx + .006, sy + .006, sz - .041); }
      rig.laserPos = V3(sx - .006, sy + .006, sz - .045);
      rig.lightPos = V3(sx, sy, sz - .05);
    }
  }
};

// Casing and projectile meshes (shared)
G.makeCasing = function (cal) {
  const c = G.CAL[cal] || G.CAL['5.56×45mm'];
  const g = new THREE.Group();
  const mat = c.shell ? new THREE.MeshStandardMaterial({ color: '#9e1d1d', roughness: .5 }) : G.brassMat || (G.brassMat = new THREE.MeshStandardMaterial({ color: '#b98e3c', metalness: 1, roughness: .28 }));
  const m1 = new THREE.Mesh(gCyl(c.cs[1], c.cs[1] * (c.shell ? 1 : .82), c.cs[0], 10), mat); g.add(m1);
  if (c.shell) { const b = new THREE.Mesh(gCyl(c.cs[1] * 1.05, c.cs[1] * 1.05, .014, 12), G.brassMat || (G.brassMat = new THREE.MeshStandardMaterial({ color: '#b98e3c', metalness: 1, roughness: .28 }))); b.position.z = c.cs[0] / 2 - .007; g.add(b); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
};

// A live cartridge: case plus jacketed bullet (ogive), axis along z with the tip toward -z (down-range)
G.makeRound = function (cal) {
  const c = G.CAL[cal] || G.CAL['5.56×45mm'], g = G.makeCasing(cal);
  if (c.shell) return g;
  const r = c.cs[1] * .78, bl = c.cs[0] * (c.cs[0] > .05 ? .42 : .55);
  const cu = G.copperMat || (G.copperMat = new THREE.MeshStandardMaterial({ color: '#b5653a', metalness: 1, roughness: .32 }));
  const body = new THREE.Mesh(gCyl(r, r, bl * .45, 10), cu); body.position.z = -c.cs[0] / 2 - bl * .225; g.add(body);
  const tip = new THREE.Mesh(gCyl(r, r * .12, bl * .55, 10), cu); tip.position.z = -c.cs[0] / 2 - bl * .45 - bl * .275; g.add(tip);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
};

// Merge meshes of a group by material into as few meshes as possible (static bake)
G.mergeByMaterial = function (group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  group.traverse(o => {
    if (!o.isMesh || o.isSprite) return;
    if (o.material.transparent && o.material.blending === THREE.AdditiveBlending) return;
    const k = o.material.uuid; if (!buckets.has(k)) buckets.set(k, { mat: o.material, list: [] });
    buckets.get(k).list.push(o);
  });
  const out = new THREE.Group();
  const mtx = new THREE.Matrix4(), nm = new THREE.Matrix3();
  for (const { mat, list } of buckets.values()) {
    let total = 0; const geos = [];
    for (const o of list) { let g = o.geometry; g = g.index ? g.toNonIndexed() : g; geos.push([g, o]); total += g.attributes.position.count; }
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
    let off = 0; const v = new THREE.Vector3();
    for (const [g, o] of geos) {
      mtx.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(mtx);
      const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(mtx); pos.set([v.x, v.y, v.z], (off + i) * 3);
        if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (off + i) * 3); }
        if (U) { uv[(off + i) * 2] = U.getX(i); uv[(off + i) * 2 + 1] = U.getY(i); }
      }
      off += P.count;
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    bg.computeBoundingSphere();
    const mesh = new THREE.Mesh(bg, mat); mesh.castShadow = true; mesh.receiveShadow = true; out.add(mesh);
  }
  return out;
};
})();
