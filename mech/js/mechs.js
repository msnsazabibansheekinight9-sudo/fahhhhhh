// Ironwalkers — procedural mech, weapon, equipment and trinket models + animation rig.
(function () {
'use strict';
const MW = window.MW;
const M = MW.mechs = {};
const GC = {}; // geometry cache

// ---------- geometry primitives ----------
function chamferShape(w, h, c) {
  const s = new THREE.Shape(); const x = w / 2, y = h / 2; c = Math.min(c, x * 0.9, y * 0.9);
  s.moveTo(-x + c, -y); s.lineTo(x - c, -y); s.lineTo(x, -y + c); s.lineTo(x, y - c); s.lineTo(x - c, y); s.lineTo(-x + c, y); s.lineTo(-x, y - c); s.lineTo(-x, -y + c); s.closePath();
  return s;
}
// Bevelled armour block: w (x), h (y), d (z)
function bbox(w, h, d, b) {
  b = b == null ? Math.min(w, h, d) * 0.12 : b;
  const key = `bb${w.toFixed(2)}|${h.toFixed(2)}|${d.toFixed(2)}|${b.toFixed(2)}`;
  if (GC[key]) return GC[key];
  const iw = Math.max(0.02, w - 2 * b), ih = Math.max(0.02, h - 2 * b), id = Math.max(0.01, d - 2 * b);
  const g = new THREE.ExtrudeGeometry(chamferShape(iw, ih, Math.min(iw, ih) * 0.18), { depth: id, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
  g.translate(0, 0, -id / 2);
  return (GC[key] = g);
}
// Tapered box (top face scaled by tx,tz; optional top shift sz)
function tbox(w, h, d, tx, tz, sz) {
  const key = `tb${w}|${h}|${d}|${tx}|${tz}|${sz || 0}`;
  if (GC[key]) return GC[key];
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * tx); p.setZ(i, p.getZ(i) * tz + (sz || 0)); }
  g.computeVertexNormals();
  return (GC[key] = g);
}
function cyl(rt, rb, h, seg, open) { const key = `cy${rt}|${rb}|${h}|${seg}|${open ? 1 : 0}`; return GC[key] || (GC[key] = new THREE.CylinderGeometry(rt, rb, h, seg || 12, 1, !!open)); }
function sph(r, ws, hs) { const key = `sp${r}|${ws}|${hs}`; return GC[key] || (GC[key] = new THREE.SphereGeometry(r, ws || 12, hs || 8)); }
function tor(r, t, rs, ts, arc) { const key = `to${r}|${t}|${rs}|${ts}|${arc || 0}`; return GC[key] || (GC[key] = new THREE.TorusGeometry(r, t, rs || 6, ts || 16, arc || Math.PI * 2)); }
function box(w, h, d) { const key = `bx${w}|${h}|${d}`; return GC[key] || (GC[key] = new THREE.BoxGeometry(w, h, d)); }
function oct(r) { const key = 'oc' + r; return GC[key] || (GC[key] = new THREE.OctahedronGeometry(r, 0)); }
M.geo = { bbox, tbox, cyl, sph, tor, box, oct };

function add(parent, geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x || 0, y || 0, z || 0);
  if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
  if (sx) m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
M.add = add;
function node(parent, x, y, z, name) { const o = new THREE.Object3D(); o.position.set(x || 0, y || 0, z || 0); if (name) o.name = name; parent.add(o); return o; }
M.node = node;

// ---------- merge static meshes per material (draw-call reduction) ----------
function mergeNode(n) {
  n.children.slice().forEach(ch => { if (!ch.isMesh || ch.userData.keep) mergeNode(ch); });
  const groups = new Map();
  n.children.forEach(ch => { if (ch.isMesh && !ch.userData.keep && !ch.isInstancedMesh) { const k = ch.material.uuid; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(ch); } });
  groups.forEach(list => {
    if (list.length < 2 && !list[0].material.userData.boxuv) return;
    const mat = list[0].material;
    const pos = [], nor = [], uv = [];
    list.forEach(ch => {
      ch.updateMatrix();
      let g = ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone();
      g.applyMatrix4(ch.matrix);
      const p = g.attributes.position, nn = g.attributes.normal, u = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        pos.push(x, y, z); nor.push(nn.getX(i), nn.getY(i), nn.getZ(i));
        if (mat.userData.boxuv) {
          const ax = Math.abs(nn.getX(i)), ay = Math.abs(nn.getY(i)), az = Math.abs(nn.getZ(i));
          const s = mat.userData.boxuv;
          if (ax >= ay && ax >= az) uv.push(z * s, y * s); else if (ay >= az) uv.push(x * s, z * s); else uv.push(x * s, y * s);
        } else if (u) uv.push(u.getX(i), u.getY(i)); else uv.push(0, 0);
      }
      g.dispose();
      n.remove(ch);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; m.userData.merged = true;
    n.add(m);
  });
}
M.mergeNode = mergeNode;

// ---------- materials ----------
const tierMats = {};
M.tierMat = t => tierMats[t] || (tierMats[t] = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(MW.TIERS[t].color), emissiveIntensity: 2.2 }));
const shared = {};
function sharedMat(k, f) { return shared[k] || (shared[k] = f()); }
M.darkMat = () => sharedMat('dark', () => new THREE.MeshStandardMaterial({ color: 0x24272c, metalness: 0.75, roughness: 0.45 }));
M.jointMat = () => sharedMat('joint', () => new THREE.MeshStandardMaterial({ color: 0xa4abb3, metalness: 1, roughness: 0.22 }));
M.blackMat = () => sharedMat('black', () => new THREE.MeshBasicMaterial({ color: 0x050505 }));
M.rubberMat = () => sharedMat('rubber', () => new THREE.MeshStandardMaterial({ color: 0x18191b, metalness: 0.1, roughness: 0.9 }));
M.gunMat = () => sharedMat('gun', () => new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.85, roughness: 0.35 }));
M.glowMat = col => sharedMat('glow' + col, () => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(col), emissiveIntensity: 2.4 }));
M.glassMat = col => sharedMat('glass' + col, () => new THREE.MeshStandardMaterial({ color: new THREE.Color(col).multiplyScalar(0.25), emissive: new THREE.Color(col), emissiveIntensity: 0.35, metalness: 0.9, roughness: 0.05 }));

function makeMats(build) {
  const fin = MW.FINISHES.find(f => f.id === (build.finish.finishBase ? build.finish.finish : build.finish.finish)) || MW.FINISHES[0];
  const cols = build.colors;
  const skin = build.skin;
  const camo = MW.tex.camo(skin.pattern, cols, fin.id, 256);
  const p = new THREE.MeshStandardMaterial({ map: camo, metalness: fin.m, roughness: fin.r, bumpMap: MW.tex.panelBump(), bumpScale: 0.015, color: fin.tint ? new THREE.Color(fin.tint) : 0xffffff });
  p.userData.boxuv = 0.16;
  if (fin.glow) { p.emissiveMap = MW.tex.glowLines(cols[2]); p.emissive = new THREE.Color(0xffffff); p.emissiveIntensity = 1.4; }
  const s = new THREE.MeshStandardMaterial({ color: new THREE.Color(cols[1]), metalness: Math.min(1, fin.m + 0.1), roughness: Math.min(1, fin.r + 0.1), bumpMap: MW.tex.panelBump(), bumpScale: 0.01 });
  s.userData.boxuv = 0.16;
  const a = new THREE.MeshStandardMaterial({ color: new THREE.Color(cols[2]), metalness: 0.45, roughness: 0.32 });
  let w = M.gunMat();
  if (build.wskin) { w = new THREE.MeshStandardMaterial({ map: MW.tex.camo(build.wskin.pattern, build.wskin.colors, 'metallic', 128), metalness: 0.7, roughness: 0.32 }); w.userData.boxuv = 0.5; }
  const visor = build.cockpit ? build.cockpit.hud : '#7fdcff';
  const vent = new THREE.MeshStandardMaterial({ color: 0x1a1414, emissive: new THREE.Color('#ff5a1a'), emissiveIntensity: 0.15 });
  const mats = { p, s, a, d: M.darkMat(), j: M.jointMat(), k: M.blackMat(), r: M.rubberMat(), w, v: M.glassMat(visor), g: M.glowMat(visor), vent, anim: !!skin.anim, fin };
  return mats;
}
M.makeMats = makeMats;

// ---------- weapon models ----------
// Built along +z, muzzle at the front. Returns {group, muzzle, spin, len}
M.weapon = function (wtype, tier, mats, sizeOverride) {
  const wt = MW.WTYPE[wtype]; const W = mats.w, D = mats.d, K = mats.k, J = mats.j;
  const g = new THREE.Group(); const kick = node(g, 0, 0, 0); // recoil node
  const sc = { S: 0.72, M: 1, L: 1.32 }[sizeOverride || wt.size];
  let spin = null, len = 2;
  const glow = M.glowMat(wt.color);
  const tm = M.tierMat(tier);
  const barrel = (r, l, z, x, y) => add(kick, cyl(r, r, l, 10), W, x || 0, y || 0, z + l / 2, Math.PI / 2);
  const bore = (r, z, x, y) => add(kick, cyl(r * 0.7, r * 0.7, 0.04, 10), K, x || 0, y || 0, z, Math.PI / 2);
  switch (wtype) {
    case 'mg':
      add(kick, bbox(0.45, 0.42, 0.9), W, 0, 0, 0.1); add(kick, box(0.12, 0.3, 0.3), D, 0.28, -0.05, 0);
      for (const x of [-0.1, 0.1]) { barrel(0.05, 1.0, 0.5, x, 0.04); bore(0.05, 1.51, x, 0.04); }
      add(kick, cyl(0.09, 0.09, 0.2, 8), D, 0, 0.04, 0.95, Math.PI / 2, 0, 0, 1.6, 1, 1); len = 1.5; break;
    case 'slas':
      add(kick, bbox(0.5, 0.5, 0.9), W, 0, 0, 0.1); for (let i = 0; i < 4; i++) add(kick, box(0.62, 0.05, 0.12), D, 0, -0.18 + i * 0.12, 0.05);
      add(kick, cyl(0.17, 0.2, 0.3, 12), D, 0, 0, 0.65, Math.PI / 2); add(kick, cyl(0.13, 0.13, 0.04, 12), glow, 0, 0, 0.81, Math.PI / 2); len = 0.82; break;
    case 'flamer':
      add(kick, cyl(0.24, 0.24, 0.8, 12), D, 0, 0, 0, Math.PI / 2); add(kick, tor(0.24, 0.04), J, 0, 0, 0.25); add(kick, tor(0.24, 0.04), J, 0, 0, -0.25);
      add(kick, cyl(0.08, 0.12, 0.7, 8), W, 0, -0.05, 0.7, Math.PI / 2); add(kick, cyl(0.07, 0.07, 0.15, 8), glow, 0, -0.05, 1.08, Math.PI / 2); len = 1.12; break;
    case 'ac5':
      add(kick, bbox(0.6, 0.62, 1.3), W, 0, 0, 0); add(kick, box(0.2, 0.36, 0.5), D, -0.38, -0.05, -0.1); add(kick, bbox(0.3, 0.2, 0.7), D, 0, 0.36, -0.1);
      barrel(0.12, 2.2, 0.6); add(kick, box(0.36, 0.26, 0.32), D, 0, 0, 2.75); bore(0.12, 2.92); len = 2.92; break;
    case 'rac': {
      add(kick, cyl(0.38, 0.42, 1.0, 14), W, 0, 0, 0, Math.PI / 2); add(kick, box(0.3, 0.5, 0.7), D, 0.4, 0, -0.1);
      spin = node(kick, 0, 0, 0.5); spin.userData.keep = true;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(spin, cyl(0.07, 0.07, 1.8, 8), W, Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.9, Math.PI / 2); }
      add(spin, cyl(0.32, 0.32, 0.12, 12), D, 0, 0, 0.5, Math.PI / 2); add(spin, cyl(0.32, 0.32, 0.12, 12), D, 0, 0, 1.6, Math.PI / 2);
      len = 2.3; break; }
    case 'plas':
      add(kick, bbox(0.7, 0.55, 1.2), W, 0, 0, 0); for (const x of [-0.2, 0, 0.2]) { add(kick, cyl(0.08, 0.08, 1.0, 8), D, x, 0, 1.0, Math.PI / 2); add(kick, cyl(0.06, 0.06, 0.04, 8), glow, x, 0, 1.51, Math.PI / 2); }
      add(kick, box(0.78, 0.08, 0.8), glow, 0, 0.3, 0.0, 0, 0, 0, 1, 0.3, 1); len = 1.52; break;
    case 'srm': {
      add(kick, bbox(1.0, 0.9, 1.0), W, 0, 0, 0);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { add(kick, cyl(0.17, 0.17, 0.05, 10), K, -0.22 + i * 0.44, -0.2 + j * 0.4, 0.51, Math.PI / 2); add(kick, tor(0.17, 0.03, 4, 10), D, -0.22 + i * 0.44, -0.2 + j * 0.4, 0.5); }
      add(kick, box(1.04, 0.12, 0.6), D, 0, 0.5, -0.1); len = 0.55; break; }
    case 'plasma':
      add(kick, bbox(0.7, 0.7, 1.0), W, 0, 0, -0.2); add(kick, sph(0.45, 14, 10), D, 0, 0, 0.4); add(kick, sph(0.3, 12, 8), glow, 0, 0, 0.42, 0, 0, 0, 1.25, 1.25, 1.25);
      for (let i = 0; i < 3; i++) add(kick, tor(0.46, 0.04, 4, 16), J, 0, 0, 0.4, 0, i * Math.PI / 3, Math.PI / 2);
      barrel(0.18, 0.8, 0.8); bore(0.18, 1.61); len = 1.6; break;
    case 'mortar':
      add(kick, bbox(1.0, 0.6, 1.0), W, 0, -0.1, 0); add(kick, cyl(0.32, 0.36, 1.4, 14), D, 0, 0.4, 0.3, Math.PI / 2 - 0.6); add(kick, tor(0.34, 0.06), J, 0, 0.82, 0.86, -0.6 + Math.PI / 2 - Math.PI / 2);
      add(kick, cyl(0.24, 0.24, 0.04, 12), K, 0, 0.93, 0.95, Math.PI / 2 - 0.6); len = 1.0; break;
    case 'arc':
      add(kick, bbox(0.7, 0.6, 1.0), W, 0, 0, 0); add(kick, cyl(0.12, 0.2, 0.9, 10), D, 0, 0, 0.9, Math.PI / 2);
      for (let i = 0; i < 4; i++) add(kick, tor(0.18 - i * 0.02, 0.035, 4, 12), J, 0, 0, 0.6 + i * 0.18);
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; add(kick, cyl(0.03, 0.03, 0.6, 5), J, Math.cos(a) * 0.22, Math.sin(a) * 0.22, 1.55, Math.PI / 2); }
      add(kick, sph(0.12, 10, 8), glow, 0, 0, 1.45); len = 1.85; break;
    case 'ac20':
      add(kick, bbox(1.0, 1.0, 1.6), W, 0, 0, 0); add(kick, bbox(0.5, 0.4, 1.0), D, 0.65, 0.1, -0.2); add(kick, cyl(0.3, 0.32, 0.4, 14), D, 0, 0, 0.95, Math.PI / 2);
      barrel(0.27, 1.9, 1.1); add(kick, bbox(0.8, 0.6, 0.5), D, 0, 0, 3.15); bore(0.27, 3.41); len = 3.4; break;
    case 'gauss':
      add(kick, bbox(0.6, 0.75, 1.4), W, 0, 0, -0.4); add(kick, box(0.16, 0.5, 3.6), D, -0.18, 0, 1.6); add(kick, box(0.16, 0.5, 3.6), D, 0.18, 0, 1.6);
      for (let i = 0; i < 6; i++) { add(kick, box(0.62, 0.66, 0.16), J, 0, 0, 0.3 + i * 0.55); add(kick, box(0.64, 0.12, 0.08), glow, 0, 0.34, 0.3 + i * 0.55); }
      len = 3.4; break;
    case 'llas':
      add(kick, bbox(0.7, 0.7, 2.2), W, 0, 0, 0.3); for (let i = 0; i < 9; i++) add(kick, box(0.95, 0.85, 0.06), D, 0, 0, -0.4 + i * 0.16);
      add(kick, cyl(0.26, 0.32, 0.4, 14), D, 0, 0, 1.55, Math.PI / 2); add(kick, cyl(0.22, 0.22, 0.04, 14), glow, 0, 0, 1.76, Math.PI / 2); add(kick, box(0.06, 0.06, 1.8), glow, 0.36, 0.2, 0.3); len = 1.78; break;
    case 'ppc':
      add(kick, bbox(0.75, 0.75, 1.6), W, 0, 0, -0.2); add(kick, cyl(0.2, 0.2, 2.4, 12), D, 0, 0, 1.6, Math.PI / 2);
      for (let i = 0; i < 5; i++) add(kick, tor(0.32, 0.07, 6, 16), J, 0, 0, 0.9 + i * 0.35);
      add(kick, cyl(0.15, 0.15, 2.2, 10), glow, 0, 0, 1.65, Math.PI / 2, 0, 0, 0.8, 1, 0.8); add(kick, sph(0.22, 10, 8), glow, 0, 0, 2.8); len = 2.85; break;
    case 'lrm': {
      add(kick, bbox(1.5, 1.1, 1.3), W, 0, 0, 0);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) add(kick, cyl(0.11, 0.11, 0.05, 8), K, -0.56 + i * 0.28, -0.3 + j * 0.3, 0.66, Math.PI / 2);
      add(kick, box(1.56, 0.1, 1.36), D, 0, 0.58, 0); add(kick, box(1.56, 0.06, 0.1), mats.a || D, 0, 0.62, 0.62); len = 0.7; break; }
    case 'rail':
      add(kick, bbox(0.6, 0.6, 1.4), W, 0, 0, -0.4); add(kick, box(0.12, 0.22, 4.4), J, 0, 0.18, 2.0); add(kick, box(0.12, 0.22, 4.4), J, 0, -0.18, 2.0);
      add(kick, box(0.04, 0.12, 4.2), glow, 0, 0, 2.0); for (let i = 0; i < 4; i++) add(kick, bbox(0.4, 0.75, 0.2), D, 0, 0, 0.6 + i * 1.0); len = 4.2; break;
  }
  // tier indicator light
  add(kick, box(0.05, 0.05, 0.4), tm, 0.32 * (wtype === 'lrm' ? 2.4 : 1), 0.22, -0.2);
  const muzzle = node(kick, 0, wtype === 'mortar' ? 0.9 : 0, len);
  g.scale.setScalar(sc);
  mergeNode(kick);
  return { group: g, kick, muzzle, spin, len: len * sc, wtype };
};

// ---------- mech class builders ----------
// Each returns the rig; design units are metres for a design height (dh) and get scaled to class height.
function legBiped(hips, side, o, mats) {
  const P = mats.p, S = mats.s, D = mats.d, J = mats.j, A = mats.a;
  const hip = node(hips, side * o.hipX, 0, 0);
  add(hip, sph(o.thick * 0.55, 12, 8), D, 0, 0, 0);
  const thigh = node(hip, 0, 0, 0);
  add(thigh, bbox(o.thick, o.thigh, o.thick * 1.15), S, 0, -o.thigh / 2, 0);
  add(thigh, tbox(o.thick * 1.1, o.thigh * 0.8, 0.25, 0.85, 1, 0), P, side * 0.02, -o.thigh * 0.45, o.thick * 0.62);
  add(thigh, bbox(o.thick * 0.3, o.thigh * 0.7, o.thick * 0.6), P, side * o.thick * 0.6, -o.thigh * 0.45, 0);
  add(thigh, cyl(0.12, 0.12, o.thigh * 0.8, 8), J, 0, -o.thigh * 0.5, -o.thick * 0.7);
  const shin = node(thigh, 0, -o.thigh, 0);
  add(shin, sph(o.thick * 0.48, 12, 8), D, 0, 0, 0);
  add(shin, bbox(o.thick * 0.85, o.thick * 0.7, 0.5), A, 0, 0.05, o.thick * 0.55);
  add(shin, bbox(o.thick * 0.9, o.shin, o.thick * 1.05), S, 0, -o.shin / 2, -0.05);
  add(shin, tbox(o.thick * 1.05, o.shin * 0.85, 0.35, 0.8, 1, 0.05), P, 0, -o.shin * 0.48, o.thick * 0.55);
  add(shin, cyl(0.1, 0.1, o.shin * 0.75, 8), J, side * o.thick * 0.35, -o.shin * 0.5, -o.thick * 0.6);
  add(shin, cyl(0.16, 0.16, o.shin * 0.3, 8), D, side * o.thick * 0.35, -o.shin * 0.25, -o.thick * 0.6);
  add(shin, box(o.thick * 0.6, 0.12, 0.12), mats.vent, 0, -o.shin * 0.75, -o.thick * 0.55);
  const foot = node(shin, 0, -o.shin, 0);
  add(foot, sph(o.thick * 0.35, 10, 6), D, 0, 0, 0);
  add(foot, bbox(o.thick * 1.35, o.footH, o.foot), S, 0, -o.footH * 0.5 - 0.1, o.foot * 0.18);
  add(foot, tbox(o.thick * 1.2, o.footH * 0.8, o.foot * 0.35, 0.8, 0.6, -0.05), P, 0, -o.footH * 0.35, o.foot * 0.62);
  add(foot, bbox(o.thick * 0.5, o.footH * 0.7, o.foot * 0.3), D, 0, -o.footH * 0.5, -o.foot * 0.32);
  add(foot, box(o.thick * 1.4, 0.08, o.foot * 0.95), mats.r, 0, -o.footH - 0.08, o.foot * 0.18);
  return { hip, thigh, shin, foot, side, type: 'biped', footH: o.footH };
}
function legDigi(hips, side, o, mats) {
  const P = mats.p, S = mats.s, D = mats.d, J = mats.j;
  const hip = node(hips, side * o.hipX, 0, 0);
  add(hip, sph(o.thick * 0.6, 12, 8), D, 0, 0, 0);
  add(hip, bbox(o.thick * 0.35, o.thick * 1.2, o.thick * 1.3), P, side * o.thick * 0.6, 0, 0);
  const thigh = node(hip, 0, 0, 0);
  add(thigh, bbox(o.thick, o.thigh, o.thick * 1.3), S, 0, -o.thigh / 2, 0);
  add(thigh, tbox(o.thick * 1.15, o.thigh * 0.85, 0.3, 0.9, 1), P, 0, -o.thigh * 0.5, o.thick * 0.7);
  add(thigh, bbox(o.thick * 0.25, o.thigh * 0.6, o.thick * 0.8), P, side * o.thick * 0.6, -o.thigh * 0.5, 0);
  const shin = node(thigh, 0, -o.thigh, 0);
  add(shin, sph(o.thick * 0.5, 12, 8), D, 0, 0, 0);
  add(shin, bbox(o.thick * 0.75, o.shin, o.thick * 0.8), S, 0, -o.shin / 2, 0);
  add(shin, bbox(o.thick * 0.85, o.shin * 0.55, 0.28), P, 0, -o.shin * 0.35, -o.thick * 0.5);
  add(shin, cyl(0.1, 0.1, o.shin * 0.9, 8), J, 0, -o.shin * 0.5, o.thick * 0.45);
  add(shin, cyl(0.17, 0.17, o.shin * 0.35, 8), D, 0, -o.shin * 0.3, o.thick * 0.45);
  const ankle = node(shin, 0, -o.shin, 0);
  add(ankle, sph(o.thick * 0.38, 10, 6), D, 0, 0, 0);
  add(ankle, bbox(o.thick * 0.6, o.meta, o.thick * 0.6), D, 0, -o.meta / 2, 0);
  add(ankle, bbox(o.thick * 0.7, o.meta * 0.6, 0.2), P, 0, -o.meta * 0.45, o.thick * 0.38);
  const foot = node(ankle, 0, -o.meta, 0);
  for (const a of [-0.45, 0, 0.45]) {
    const toe = node(foot, 0, 0, 0); toe.rotation.y = a;
    add(toe, bbox(o.thick * 0.38, o.footH, o.foot), S, 0, -o.footH / 2, o.foot * 0.45);
    add(toe, tbox(o.thick * 0.32, o.footH * 0.8, o.foot * 0.3, 0.6, 0.5), D, 0, -o.footH * 0.45, o.foot * 0.98);
  }
  add(foot, bbox(o.thick * 0.35, o.footH, o.foot * 0.5), S, 0, -o.footH / 2, -o.foot * 0.3);
  add(foot, sph(o.thick * 0.32, 10, 6), D, 0, 0, 0);
  return { hip, thigh, shin, ankle, foot, side, type: 'digi' };
}
function legQuad(body, cx, cz, o, mats) {
  const S = mats.s, D = mats.d, J = mats.j, P = mats.p;
  const hip = node(body, cx, 0, cz);
  const yaw = Math.atan2(cx, cz); hip.rotation.y = yaw; hip.userData.baseYaw = yaw;
  add(hip, cyl(o.thick * 0.7, o.thick * 0.7, o.thick * 1.1, 12), D, 0, 0, 0);
  const upper = node(hip, 0, 0, 0); upper.rotation.x = -2.2;
  add(upper, bbox(o.thick * 0.9, o.upper, o.thick * 1.1), S, 0, -o.upper / 2, 0);
  add(upper, tbox(o.thick, o.upper * 0.8, 0.3, 0.8, 1), P, 0, -o.upper / 2, -o.thick * 0.62);
  add(upper, cyl(0.12, 0.12, o.upper * 0.8, 8), J, o.thick * 0.5, -o.upper / 2, 0);
  const lower = node(upper, 0, -o.upper, 0); lower.rotation.x = 1.95;
  add(lower, sph(o.thick * 0.6, 12, 8), D, 0, 0, 0);
  add(lower, bbox(o.thick * 0.8, o.lower * 0.8, o.thick * 0.9), S, 0, -o.lower * 0.4, 0);
  add(lower, tbox(o.thick * 0.95, o.lower * 0.55, 0.35, 0.7, 1), P, 0, -o.lower * 0.35, o.thick * 0.55);
  add(lower, tbox(o.thick * 0.6, o.lower * 0.25, o.thick * 0.6, 0.5, 0.5), D, 0, -o.lower * 0.9, 0, Math.PI);
  add(lower, cyl(o.thick * 0.55, o.thick * 0.65, 0.3, 10), mats.r, 0, -o.lower, 0);
  return { hip, upper, lower, side: Math.sign(cx), front: Math.sign(cz), type: 'quad' };
}
function armBiped(torso, side, o, mats, mountName) {
  const P = mats.p, S = mats.s, D = mats.d, J = mats.j, A = mats.a;
  const sh = node(torso, side * o.x, o.y, 0);
  add(sh, sph(o.t * 0.6, 12, 8), D, 0, 0, 0);
  if (o.pad) { add(sh, bbox(o.t * 1.5, o.t * 0.9, o.t * 1.8), P, side * o.t * 0.25, o.t * 0.45, 0, 0, 0, side * -0.18); add(sh, box(o.t * 1.2, 0.1, o.t * 1.6), A, side * o.t * 0.3, o.t * 0.95, 0, 0, 0, side * -0.18); }
  const upper = node(sh, 0, 0, 0); upper.rotation.x = 0.15;
  add(upper, bbox(o.t * 0.8, o.upper, o.t * 0.85), S, side * 0.05, -o.upper / 2, 0);
  add(upper, cyl(0.09, 0.09, o.upper * 0.7, 6), J, side * o.t * 0.45, -o.upper / 2, -o.t * 0.25);
  const elbow = node(upper, 0, -o.upper, 0);
  add(elbow, sph(o.t * 0.45, 10, 8), D, 0, 0, 0);
  add(elbow, bbox(o.t * 0.9, o.t * 0.9, o.fore), P, 0, 0, o.fore * 0.45);
  add(elbow, box(o.t * 0.95, 0.08, o.fore * 0.6), A, 0, o.t * 0.48, o.fore * 0.45);
  const mount = node(elbow, side * o.t * 0.15, -o.t * 0.15, o.fore * 0.55, mountName);
  return { sh, upper, elbow, mount, side };
}
function backpackJets(torso, o, mats, n) {
  const jets = [];
  const nozzles = node(torso, 0, o.y, -o.z);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * o.spacing;
    add(nozzles, cyl(o.r * 0.8, o.r, o.r * 1.6, 12), mats.d, x, 0, 0);
    add(nozzles, cyl(o.r * 0.6, o.r * 0.6, 0.05, 12), mats.k, x, -o.r * 0.82, 0);
    const fl = node(nozzles, x, -o.r * 0.8, 0); fl.userData.keep = true; jets.push(fl);
  }
  return jets;
}

const BUILDERS = {};
// shared torso helper: core block + chest + cockpit
function coreBlock(t, o, mats) {
  const P = mats.p, S = mats.s, D = mats.d, A = mats.a;
  add(t, bbox(o.w, o.h, o.d), S, 0, o.h / 2, 0);
  add(t, tbox(o.w * 1.04, o.h * 0.7, 0.4, 0.8, 1, -0.05), P, 0, o.h * 0.5, o.d / 2 + 0.1, -0.12);
  add(t, bbox(o.w * 0.9, o.h * 0.35, o.d * 0.7), P, 0, o.h * 0.15, -0.1);
  add(t, bbox(o.w * 0.8, o.h * 0.6, 0.5), D, 0, o.h * 0.55, -o.d / 2 - 0.2);
  for (let i = 0; i < 3; i++) add(t, box(o.w * 0.6, 0.1, 0.1), mats.vent, 0, o.h * 0.4 + i * 0.25, -o.d / 2 - 0.47);
  add(t, box(o.w * 1.02, 0.12, o.d * 0.6), A, 0, o.h * 0.88, 0);
}

BUILDERS.wisp = (m, mats) => {
  const o = { hipX: 0.85, thick: 0.62, thigh: 2.4, shin: 3.0, meta: 1.4, foot: 1.2, footH: 0.35 };
  m.legRest = { thigh: -0.75, shin: 1.65, ankle: -1.05 };
  const hips = m.hips;
  add(hips, bbox(1.6, 0.8, 1.4), mats.d, 0, 0, 0);
  m.legs = [legDigi(hips, -1, o, mats), legDigi(hips, 1, o, mats)];
  const t = m.torso;
  // egg-shaped cockpit pod
  add(t, sph(1.5, 16, 12), mats.s, 0, 1.4, 0.2, 0, 0, 0, 1, 0.8, 1.25);
  add(t, sph(1.52, 16, 12, 0), mats.p, 0, 1.55, 0.3, 0, 0, 0, 1.0, 0.65, 1.15);
  add(t, bbox(1.6, 0.42, 0.5), mats.v, 0, 1.55, 1.75, -0.2);
  add(t, bbox(1.0, 0.8, 1.2), mats.d, 0, 1.0, -1.4);
  add(t, box(0.6, 0.1, 0.1), mats.vent, 0, 1.0, -2.02);
  add(t, cyl(0.03, 0.03, 2.2, 4), mats.j, 0.6, 3.0, -0.6); add(t, sph(0.08, 6, 4), mats.g, 0.6, 4.1, -0.6);
  add(t, box(2.6, 0.1, 0.3), mats.a, 0, 2.15, 0.2);
  // side gun pods as "arms"
  for (const side of [-1, 1]) {
    const sh = node(t, side * 1.75, 1.1, 0.4); add(sh, cyl(0.35, 0.35, 0.5, 10), mats.d, 0, 0, 0, 0, 0, Math.PI / 2);
    const pod = node(sh, side * 0.3, 0, 0); add(pod, bbox(0.6, 0.7, 1.4), mats.p, 0, 0, 0.3);
    const mount = node(pod, side * 0.1, -0.1, 0.9, side < 0 ? 'armL' : 'armR');
    m.arms[side < 0 ? 'armL' : 'armR'] = { sh, upper: pod, elbow: pod, mount, side, pod: true };
  }
  m.mounts.shR = node(t, 0.7, 2.3, -0.3); m.mounts.shL = node(t, -0.7, 2.3, -0.3); m.mounts.torsoC = node(t, 0, 0.7, 1.6);
  m.jets = backpackJets(t, { y: 0.8, z: 1.9, spacing: 0.8, r: 0.28 }, mats, 2);
  m.eye.position.set(0, 1.6, 1.4);
  m.hit = { coreY: 1.3, coreR: 1.9, armX: 2.1, armY: 1.1, armR: 0.9, legY: -2.5, legR: 1.7 };
};
BUILDERS.vanguard = (m, mats) => {
  const o = { hipX: 1.05, thick: 0.8, thigh: 2.5, shin: 2.6, foot: 2.0, footH: 0.45 };
  const hips = m.hips;
  add(hips, bbox(2.0, 0.9, 1.5), mats.d, 0, 0, 0); add(hips, tbox(1.4, 0.8, 0.4, 0.7, 1), mats.p, 0, -0.2, 0.8);
  m.legs = [legBiped(hips, -1, o, mats), legBiped(hips, 1, o, mats)];
  const t = m.torso;
  coreBlock(t, { w: 3.0, h: 2.6, d: 2.2 }, mats);
  // head cockpit
  add(t, bbox(1.3, 0.9, 1.3), mats.s, 0, 3.0, 0.55); add(t, tbox(1.2, 0.35, 0.3, 0.8, 1), mats.v, 0, 3.05, 1.25);
  add(t, box(0.08, 0.6, 0.08), mats.d, 0.6, 3.65, 0.2); add(t, cyl(0.25, 0.25, 0.05, 10), mats.a, -0.45, 3.5, 0.55, Math.PI / 2);
  m.arms.armL = armBiped(t, -1, { x: 1.95, y: 2.1, t: 0.85, upper: 1.6, fore: 1.8, pad: true }, mats, 'armL');
  m.arms.armR = armBiped(t, 1, { x: 1.95, y: 2.1, t: 0.85, upper: 1.6, fore: 1.8, pad: true }, mats, 'armR');
  m.mounts.shL = node(t, -1.0, 2.95, -0.3); m.mounts.shR = node(t, 1.05, 2.95, -0.3); m.mounts.torsoC = node(t, 0, 1.0, 1.4);
  m.jets = backpackJets(t, { y: 0.9, z: 1.55, spacing: 1.2, r: 0.3 }, mats, 2);
  m.eye.position.set(0, 3.1, 1.15);
  m.hit = { coreY: 1.5, coreR: 2.0, armX: 2.1, armY: 1.0, armR: 1.1, legY: -2.6, legR: 1.9 };
};
BUILDERS.bastion = (m, mats) => {
  const o = { hipX: 1.35, thick: 1.05, thigh: 2.4, shin: 2.5, foot: 2.5, footH: 0.55 };
  const hips = m.hips;
  add(hips, bbox(2.6, 1.1, 1.8), mats.d, 0, 0, 0); add(hips, bbox(2.8, 0.7, 0.6), mats.p, 0, -0.1, 0.95);
  m.legs = [legBiped(hips, -1, o, mats), legBiped(hips, 1, o, mats)];
  const t = m.torso;
  coreBlock(t, { w: 3.8, h: 2.8, d: 2.8 }, mats);
  add(t, tbox(4.2, 0.6, 3.0, 0.85, 0.85), mats.p, 0, 3.05, 0);
  add(t, bbox(1.8, 0.5, 0.4), mats.v, 0, 2.25, 1.55, -0.25);
  add(t, bbox(2.4, 0.4, 0.5), mats.p, 0, 2.6, 1.5, -0.3);
  for (const s of [-1, 1]) add(t, cyl(0.25, 0.3, 1.2, 10), mats.d, s * 1.3, 3.3, -1.1);
  m.arms.armL = armBiped(t, -1, { x: 2.5, y: 2.2, t: 1.05, upper: 1.5, fore: 2.0, pad: true }, mats, 'armL');
  m.arms.armR = armBiped(t, 1, { x: 2.5, y: 2.2, t: 1.05, upper: 1.5, fore: 2.0, pad: true }, mats, 'armR');
  m.mounts.shL = node(t, -1.4, 3.5, 0.0); m.mounts.shR = node(t, 1.4, 3.5, 0.0); m.mounts.torsoC = node(t, 0, 1.0, 1.8);
  m.jets = backpackJets(t, { y: 1.0, z: 1.9, spacing: 1.6, r: 0.36 }, mats, 2);
  m.eye.position.set(0, 2.3, 1.45);
  m.hit = { coreY: 1.5, coreR: 2.4, armX: 2.7, armY: 1.0, armR: 1.3, legY: -2.5, legR: 2.1 };
};
BUILDERS.longbow = (m, mats) => {
  const o = { hipX: 0.9, thick: 0.7, thigh: 3.0, shin: 3.6, meta: 1.6, foot: 1.4, footH: 0.4 };
  m.legRest = { thigh: -0.7, shin: 1.55, ankle: -1.0 };
  const hips = m.hips;
  add(hips, bbox(1.8, 0.9, 1.5), mats.d, 0, 0, 0);
  m.legs = [legDigi(hips, -1, o, mats), legDigi(hips, 1, o, mats)];
  const t = m.torso;
  add(t, tbox(2.4, 2.0, 2.6, 0.7, 0.8, 0.2), mats.s, 0, 1.2, 0);
  add(t, tbox(2.5, 1.0, 2.8, 0.75, 0.9, 0.1), mats.p, 0, 2.0, 0.05);
  // sensor head with big lens
  const head = node(t, 0, 2.7, 0.9);
  add(head, bbox(1.1, 0.8, 1.6), mats.s, 0, 0, 0); add(head, cyl(0.32, 0.32, 0.25, 16), mats.d, 0, 0, 0.85, Math.PI / 2); add(head, cyl(0.24, 0.24, 0.05, 16), mats.g, 0, 0, 0.98, Math.PI / 2);
  add(head, box(0.9, 0.2, 0.1), mats.v, 0, 0.18, 0.81); add(head, box(0.05, 1.2, 0.05), mats.j, 0.45, 0.8, -0.4);
  m.arms.armL = armBiped(t, -1, { x: 1.5, y: 1.9, t: 0.7, upper: 1.4, fore: 1.6, pad: false }, mats, 'armL');
  m.arms.armR = armBiped(t, 1, { x: 1.5, y: 1.9, t: 0.8, upper: 1.4, fore: 2.0, pad: true }, mats, 'armR');
  m.mounts.torsoC = node(t, 0, 0.6, 1.4); m.mounts.shL = node(t, -0.8, 2.6, -0.5); m.mounts.shR = node(t, 0.8, 2.6, -0.5);
  m.jets = backpackJets(t, { y: 0.9, z: 1.4, spacing: 1.0, r: 0.28 }, mats, 2);
  m.eye.position.set(0, 2.75, 1.5);
  m.hit = { coreY: 1.5, coreR: 1.8, armX: 1.7, armY: 0.9, armR: 0.9, legY: -3.2, legR: 1.8 };
};
BUILDERS.phantom = (m, mats) => {
  const o = { hipX: 0.85, thick: 0.62, thigh: 2.6, shin: 3.0, meta: 1.4, foot: 1.3, footH: 0.35 };
  m.legRest = { thigh: -0.72, shin: 1.6, ankle: -1.02 };
  const hips = m.hips;
  add(hips, bbox(1.7, 0.8, 1.5), mats.d, 0, 0, 0);
  m.legs = [legDigi(hips, -1, o, mats), legDigi(hips, 1, o, mats)];
  const t = m.torso;
  // faceted wedge
  add(t, tbox(2.8, 1.6, 3.4, 0.55, 0.7, 0.3), mats.p, 0, 1.2, 0);
  add(t, tbox(2.9, 0.6, 3.5, 0.9, 0.9), mats.s, 0, 0.4, 0);
  add(t, tbox(1.6, 0.18, 0.6, 0.9, 1), mats.v, 0, 1.25, 1.65, -0.45);
  for (const s of [-1, 1]) { add(t, tbox(0.15, 1.6, 1.6, 1, 0.3, -0.5), mats.p, s * 0.9, 2.3, -0.9, 0, 0, s * 0.35); add(t, box(0.05, 0.05, 1.3), mats.g, s * 1.45, 0.65, 0.4); }
  m.arms.armL = armBiped(t, -1, { x: 1.75, y: 1.1, t: 0.65, upper: 1.2, fore: 1.6, pad: false }, mats, 'armL');
  m.arms.armR = armBiped(t, 1, { x: 1.75, y: 1.1, t: 0.65, upper: 1.2, fore: 1.6, pad: false }, mats, 'armR');
  m.mounts.shL = node(t, -0.75, 1.9, -0.6); m.mounts.shR = node(t, 0.75, 1.9, -0.6); m.mounts.torsoC = node(t, 0, 0.5, 1.7);
  m.jets = backpackJets(t, { y: 0.7, z: 1.75, spacing: 0.9, r: 0.26 }, mats, 2);
  m.eye.position.set(0, 1.45, 1.35);
  m.hit = { coreY: 1.1, coreR: 1.8, armX: 1.9, armY: 0.6, armR: 0.9, legY: -2.6, legR: 1.7 };
};
BUILDERS.aegis = (m, mats) => {
  const o = { hipX: 1.4, thick: 1.1, thigh: 2.6, shin: 2.7, foot: 2.6, footH: 0.6 };
  const hips = m.hips;
  add(hips, bbox(2.8, 1.2, 2.0), mats.d, 0, 0, 0); add(hips, tbox(3.0, 1.2, 0.5, 0.8, 1), mats.p, 0, -0.3, 1.05);
  m.legs = [legBiped(hips, -1, o, mats), legBiped(hips, 1, o, mats)];
  const t = m.torso;
  coreBlock(t, { w: 4.0, h: 3.0, d: 2.8 }, mats);
  add(t, bbox(1.5, 1.1, 1.5), mats.s, 0, 3.4, 0.4); add(t, tbox(1.4, 0.4, 0.3, 0.8, 1), mats.v, 0, 3.45, 1.2);
  add(t, tbox(1.0, 0.8, 0.2, 0.2, 1), mats.a, 0, 4.2, 0.4);
  m.arms.armL = armBiped(t, -1, { x: 2.65, y: 2.4, t: 1.1, upper: 1.6, fore: 2.0, pad: true }, mats, 'armL');
  m.arms.armR = armBiped(t, 1, { x: 2.65, y: 2.4, t: 1.1, upper: 1.6, fore: 2.2, pad: true }, mats, 'armR');
  // tower shield on left forearm
  const sh = m.arms.armL.mount;
  add(sh, bbox(0.35, 5.0, 3.0), mats.p, -0.6, -0.6, 0.2); add(sh, bbox(0.4, 4.6, 0.25), mats.a, -0.62, -0.6, 1.65); add(sh, box(0.1, 3.8, 0.12), mats.g, -0.81, -0.6, 0.2);
  sh.userData.shield = true;
  m.mounts.shL = node(t, -1.5, 3.5, -0.3); m.mounts.shR = node(t, 1.5, 3.5, -0.3); m.mounts.torsoC = node(t, 0, 1.0, 1.8);
  m.jets = backpackJets(t, { y: 1.0, z: 1.9, spacing: 1.6, r: 0.38 }, mats, 2);
  m.eye.position.set(0, 3.5, 1.3);
  m.hit = { coreY: 1.6, coreR: 2.5, armX: 2.9, armY: 1.1, armR: 1.5, legY: -2.7, legR: 2.2 };
};
BUILDERS.tempest = (m, mats) => {
  const o = { hipX: 0.95, thick: 0.72, thigh: 2.5, shin: 2.6, foot: 1.8, footH: 0.4 };
  const hips = m.hips;
  add(hips, bbox(1.8, 0.8, 1.4), mats.d, 0, 0, 0);
  m.legs = [legBiped(hips, -1, o, mats), legBiped(hips, 1, o, mats)];
  const t = m.torso;
  coreBlock(t, { w: 2.6, h: 2.4, d: 2.0 }, mats);
  add(t, tbox(1.3, 0.9, 1.6, 0.6, 0.8, 0.2), mats.s, 0, 2.85, 0.4); add(t, tbox(1.2, 0.3, 0.3, 0.7, 1), mats.v, 0, 2.9, 1.2, -0.3);
  // wings with thrusters
  const jets = [];
  for (const s of [-1, 1]) {
    const wing = node(t, s * 1.0, 2.2, -1.2); wing.rotation.z = s * -0.35; wing.rotation.y = s * 0.3;
    add(wing, tbox(3.4, 0.25, 1.4, 1, 0.5, -0.3), mats.p, s * 1.8, 0, 0);
    add(wing, box(3.0, 0.08, 0.1), mats.a, s * 1.8, 0.14, 0.5);
    add(wing, cyl(0.35, 0.42, 1.2, 12), mats.d, s * 3.2, -0.3, -0.1);
    const fl = node(wing, s * 3.2, -0.9, -0.1); fl.userData.keep = true; jets.push(fl);
  }
  m.arms.armL = armBiped(t, -1, { x: 1.7, y: 1.9, t: 0.75, upper: 1.4, fore: 1.7, pad: true }, mats, 'armL');
  m.arms.armR = armBiped(t, 1, { x: 1.7, y: 1.9, t: 0.75, upper: 1.4, fore: 1.7, pad: true }, mats, 'armR');
  m.mounts.shL = node(t, -0.8, 2.75, -0.2); m.mounts.shR = node(t, 0.85, 2.75, -0.2); m.mounts.torsoC = node(t, 0, 1.0, 1.3);
  m.jets = jets.concat(backpackJets(t, { y: 0.8, z: 1.45, spacing: 0.9, r: 0.3 }, mats, 2));
  m.eye.position.set(0, 2.95, 1.2);
  m.hit = { coreY: 1.4, coreR: 1.9, armX: 1.9, armY: 0.9, armR: 1.0, legY: -2.5, legR: 1.8 };
};
BUILDERS.juggernaut = (m, mats) => {
  const o = { hipX: 1.6, thick: 1.3, thigh: 2.3, shin: 2.4, foot: 2.9, footH: 0.7 };
  const hips = m.hips;
  add(hips, bbox(3.2, 1.3, 2.2), mats.d, 0, 0, 0); add(hips, tbox(3.4, 1.3, 0.6, 0.85, 1), mats.p, 0, -0.3, 1.15);
  m.legs = [legBiped(hips, -1, o, mats), legBiped(hips, 1, o, mats)];
  const t = m.torso;
  coreBlock(t, { w: 4.8, h: 3.4, d: 3.4 }, mats);
  // bulldozer chest
  add(t, tbox(5.2, 2.2, 0.8, 0.9, 1, 0.3), mats.p, 0, 1.4, 2.0, 0.15); add(t, box(5.0, 0.2, 0.2), mats.a, 0, 0.35, 2.25);
  add(t, bbox(2.0, 0.5, 0.5), mats.v, 0, 2.95, 1.75, -0.2);
  add(t, tbox(3.4, 0.9, 2.6, 0.7, 0.8), mats.s, 0, 3.8, -0.1);
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) add(t, cyl(0.3, 0.35, 1.5, 10), mats.d, s * (1.2 + i * 0.7), 3.8, -1.6);
  m.arms.armL = armBiped(t, -1, { x: 3.05, y: 2.6, t: 1.3, upper: 1.7, fore: 2.4, pad: true }, mats, 'armL');
  m.arms.armR = armBiped(t, 1, { x: 3.05, y: 2.6, t: 1.3, upper: 1.7, fore: 2.4, pad: true }, mats, 'armR');
  m.mounts.shL = node(t, -1.5, 4.3, 0.2); m.mounts.shR = node(t, 1.5, 4.3, 0.2); m.mounts.torsoC = node(t, 0, 2.4, 2.2);
  m.jets = backpackJets(t, { y: 1.1, z: 2.2, spacing: 2.0, r: 0.42 }, mats, 2);
  m.eye.position.set(0, 2.95, 1.6);
  m.hit = { coreY: 1.8, coreR: 2.8, armX: 3.3, armY: 1.2, armR: 1.6, legY: -2.5, legR: 2.4 };
};
function quadBody(m, mats, o) {
  const hips = m.hips;
  add(hips, bbox(o.w, o.h, o.d), mats.s, 0, 0, 0);
  add(hips, tbox(o.w * 1.05, o.h * 0.5, o.d * 1.05, 0.85, 0.85), mats.p, 0, o.h * 0.5, 0);
  add(hips, bbox(o.w * 0.8, o.h * 0.4, o.d * 0.8), mats.d, 0, -o.h * 0.55, 0);
  for (const s of [-1, 1]) add(hips, box(0.1, 0.1, o.d * 0.7), mats.vent, s * o.w * 0.52, 0, 0);
  const lo = { thick: o.thick, upper: o.upper, lower: o.lower };
  m.quadLower = o.lower;
  m.legs = [legQuad(hips, -o.w * 0.45, o.d * 0.4, lo, mats), legQuad(hips, o.w * 0.45, o.d * 0.4, lo, mats), legQuad(hips, -o.w * 0.45, -o.d * 0.4, lo, mats), legQuad(hips, o.w * 0.45, -o.d * 0.4, lo, mats)];
}
BUILDERS.mortar = (m, mats) => {
  quadBody(m, mats, { w: 3.6, h: 1.6, d: 4.2, thick: 0.8, upper: 2.6, lower: 5.2 });
  const t = m.torso; t.position.y = 0.8;
  add(t, cyl(1.5, 1.7, 0.6, 16), mats.d, 0, 0.3, 0);
  add(t, bbox(2.6, 1.3, 3.0), mats.p, 0, 1.2, 0.2); add(t, tbox(1.8, 0.5, 0.4, 0.8, 1), mats.v, 0, 1.3, 1.75, -0.3);
  add(t, cyl(0.04, 0.04, 2.5, 4), mats.j, -0.9, 2.8, -1.0); add(t, cyl(0.6, 0.6, 0.06, 14), mats.d, 0.9, 2.3, -1.1, -0.4);
  m.mounts.shL = node(t, -1.6, 1.9, 0.0); m.mounts.shR = node(t, 1.6, 1.9, 0.0); m.mounts.torsoC = node(t, 0, 0.9, 1.9);
  for (const side of [-1, 1]) { const sh = node(t, side * 1.5, 0.9, 1.0); add(sh, bbox(0.6, 0.6, 0.8), mats.d, 0, 0, 0); const mount = node(sh, side * 0.2, 0, 0.4, side < 0 ? 'armL' : 'armR'); m.arms[side < 0 ? 'armL' : 'armR'] = { sh, upper: sh, elbow: sh, mount, side, pod: true }; }
  m.jets = [];
  m.eye.position.set(0, 1.5, 1.6);
  m.hit = { coreY: 1.6, coreR: 2.4, armX: 1.6, armY: 1.4, armR: 1.0, legY: -2.4, legR: 2.6 };
};
BUILDERS.colossus = (m, mats) => {
  quadBody(m, mats, { w: 5.4, h: 2.4, d: 6.0, thick: 1.2, upper: 3.4, lower: 7.2 });
  const t = m.torso; t.position.y = 1.2;
  add(t, cyl(2.6, 2.9, 0.8, 20), mats.d, 0, 0.4, 0);
  add(t, cyl(2.3, 2.6, 2.0, 8), mats.p, 0, 1.6, 0); add(t, cyl(2.0, 2.3, 0.4, 8), mats.s, 0, 2.8, 0);
  add(t, bbox(2.2, 0.9, 1.6), mats.s, 0, 2.2, 2.2); add(t, tbox(2.0, 0.4, 0.3, 0.8, 1), mats.v, 0, 2.3, 3.0, -0.3);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(t, box(0.12, 0.12, 0.9), mats.vent, Math.cos(a) * 2.45, 1.6, Math.sin(a) * 2.45, 0, -a); }
  add(t, cyl(0.05, 0.05, 3.5, 4), mats.j, -1.2, 4.4, -1.4); add(t, cyl(0.05, 0.05, 2.5, 4), mats.j, -0.8, 3.9, -1.6);
  m.mounts.shL = node(t, -1.9, 3.1, 0.2); m.mounts.shR = node(t, 1.9, 3.1, 0.2); m.mounts.torsoC = node(t, 0, 3.4, 0.6); m.mounts.back = node(t, 0, 3.0, -1.6);
  for (const side of [-1, 1]) { const sh = node(t, side * 2.75, 1.4, 1.2); add(sh, sph(0.8, 12, 8), mats.d, 0, 0, 0); const mount = node(sh, side * 0.3, 0, 0.5, side < 0 ? 'armL' : 'armR'); m.arms[side < 0 ? 'armL' : 'armR'] = { sh, upper: sh, elbow: sh, mount, side, pod: true }; }
  m.jets = [];
  m.eye.position.set(0, 2.35, 2.9);
  m.hit = { coreY: 2.2, coreR: 3.6, armX: 2.9, armY: 1.4, armR: 1.4, legY: -3.0, legR: 3.4 };
};
const DESIGN_H = { wisp: 7.8, vanguard: 10, bastion: 10.6, longbow: 11.4, mortar: 8.4, phantom: 8.8, aegis: 11.8, tempest: 10, juggernaut: 12.4, colossus: 15 };

function hipHeight(m) {
  const L = m.legs[0];
  if (L.type === 'biped') { const g = n => -n.position.y; return (g(L.shin) + g(L.foot)) * Math.cos(0.04) + L.footH + 0.22; }
  if (L.type === 'digi') {
    const r = m.legRest; const th = -L.shin.position.y, sh = -L.ankle.position.y, mt = -L.foot.position.y;
    return th * Math.cos(r.thigh) + sh * Math.cos(r.thigh + r.shin) + mt * Math.cos(r.thigh + r.shin + r.ankle) + 0.35;
  }
  const U = -L.lower.position.y, Lo = m.quadLower;
  return Lo * Math.cos(-0.25) - U * 0.588 + 0.15;
}

// Build a complete mech from a runtime build
M.build = function (build, opts) {
  opts = opts || {};
  const cls = MW.CLASS[build.cls];
  const mats = makeMats(build);
  const root = new THREE.Group();
  const scaleNode = node(root, 0, 0, 0);
  const hips = node(scaleNode, 0, 0, 0, 'hips');
  const torso = node(hips, 0, 0.3, 0, 'torso');
  const eye = node(torso, 0, 2, 1, 'eye');
  const m = { root, scaleNode, hips, torso, eye, mats, legs: [], arms: {}, mounts: {}, jets: [], cls, build, phase: 0, weapons: [] };
  BUILDERS[cls.id](m, mats);
  m.mounts.armL = m.arms.armL && m.arms.armL.mount; m.mounts.armR = m.arms.armR && m.arms.armR.mount;
  m.hipH = hipHeight(m);
  hips.position.y = m.hipH;
  const sc = cls.height / DESIGN_H[cls.id];
  scaleNode.scale.setScalar(sc); m.scale = sc;
  // emblem decal on the left shoulder / side
  if (build.emblem) {
    const em = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: MW.tex.emblem(build.emblem.shape, build.emblem.color), transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
    const host = m.arms.armL && !m.arms.armL.pod ? m.arms.armL.sh : torso;
    if (host === torso) { em.position.set(-(m.hit.coreR * 0.75), m.hit.coreY + 0.4, 0.2); em.rotation.y = -Math.PI / 2; em.scale.setScalar(1.3); }
    else { em.position.set(-0.9 * (m.arms.armL.side < 0 ? 1 : -1) - 0.02, 0.45, 0); em.rotation.y = -Math.PI / 2; em.scale.setScalar(0.95); }
    em.userData.keep = true; em.castShadow = false; host.add(em);
  }
  // weapons
  build.weapons.forEach((w, i) => {
    if (!w.item) return;
    const mountName = w.hp.mount; const mount = m.mounts[mountName] || torso;
    const wm = M.weapon(w.item.wtype, w.item.tier, mats, null);
    // mounts on shoulder: sit on top. arms: hang under/side.
    if (mountName === 'shL' || mountName === 'shR' || mountName === 'back') wm.group.position.y = 0.45;
    if (mountName === 'armL' || mountName === 'armR') { const arm = m.arms[mountName]; wm.group.position.x = arm.side * (arm.pod ? 0.25 : 0.7); wm.group.position.y = arm.pod ? 0 : -0.25; }
    wm.group.userData.keep = true;
    mount.add(wm.group);
    m.weapons.push(Object.assign(wm, { mountName, index: i }));
  });
  // jet flames
  const jetCol = new THREE.Color(build.jet ? build.jet.color : '#ff9a3a');
  m.jetMat = new THREE.MeshBasicMaterial({ color: jetCol, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  m.jetCore = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  m.rainbow = build.jet && build.jet.rainbow;
  m.jets.forEach(j => {
    const f = new THREE.Mesh(cyl(0.05, 0.32, 2.4, 10, true), m.jetMat); f.position.y = -1.2; f.userData.keep = true; j.add(f);
    const c = new THREE.Mesh(cyl(0.02, 0.15, 1.2, 8, true), m.jetCore); c.position.y = -0.6; c.userData.keep = true; j.add(c);
    j.visible = false;
  });
  // merge static meshes
  mergeNode(scaleNode);
  root.traverse(o => { if (o.isMesh) { o.castShadow = !opts.noShadow; o.receiveShadow = true; } });
  m.height = cls.height;
  m.restTorsoY = torso.position.y;
  return m;
};

// ---------- animation ----------
// st: {speed (m/s signed), maxSpeed, twist (rad), pitch (rad), turn (rad/s), jet (0..1), air, heat(0..1), t, crouch}
M.animate = function (m, dt, st) {
  const cls = m.cls; const sc = m.scale;
  const vf = Math.abs(st.speed) / Math.max(1, st.maxSpeed);
  const moving = vf > 0.03 || Math.abs(st.turn || 0) > 0.15;
  const amp = st.air ? 0.12 : MW.clamp(0.18 + vf * 0.55, 0, 0.65) * (moving ? 1 : 0);
  m.amp = MW.lerp(m.amp || 0, amp, Math.min(1, dt * 6));
  const A = m.amp;
  const legLen = (m.hipH || 5) * sc;
  const cycle = Math.max(2.2 * sc, 4 * legLen * Math.sin(Math.max(0.2, A)) * 0.95);
  const dir = st.speed < -0.1 ? -1 : 1;
  const spd = Math.max(Math.abs(st.speed), Math.abs(st.turn || 0) * 3 * sc);
  const prevPhase = m.phase;
  if (moving && !st.air) m.phase += dt * spd / cycle * Math.PI * 2;
  else if (!st.air) { // settle feet
    const tgt = Math.round(m.phase / Math.PI) * Math.PI; m.phase += (tgt - m.phase) * Math.min(1, dt * 4);
  }
  const ph = m.phase * dir;
  const steps = [];
  // footfalls happen when a leg reaches the front of its swing
  const fp = x => Math.floor((x - Math.PI / 2) / Math.PI);
  if (moving && fp(m.phase) !== fp(prevPhase)) steps.push(fp(m.phase) & 1);

  if (cls.legs === 'biped') {
    m.legs.forEach((L, i) => {
      const p = ph + (i ? Math.PI : 0);
      const th = -Math.sin(p) * A;
      const knee = 0.08 + Math.max(0, Math.cos(p)) * A * 1.5 + (st.crouch || 0);
      L.thigh.rotation.x = th - (st.crouch || 0) * 0.5;
      L.shin.rotation.x = knee;
      L.foot.rotation.x = -(L.thigh.rotation.x + knee) + (st.air ? 0.3 : 0);
      L.hip.rotation.z = L.side * 0.03;
    });
    m.hips.position.y = m.hipH - (A * A * 0.9) * Math.pow(Math.sin(ph), 2) - (st.crouch || 0) * 0.8 + Math.abs(Math.cos(ph)) * A * 0.15;
    m.hips.rotation.z = Math.sin(ph) * A * 0.08;
    m.hips.rotation.y = Math.sin(ph) * A * 0.12;
  } else if (cls.legs === 'digi') {
    const r = m.legRest;
    m.legs.forEach((L, i) => {
      const p = ph + (i ? Math.PI : 0);
      const lift = Math.max(0, Math.cos(p)) * A;
      L.thigh.rotation.x = r.thigh - Math.sin(p) * A * 0.9 - lift * 0.5 - (st.crouch || 0) * 0.3;
      L.shin.rotation.x = r.shin + lift * 0.9 + (st.crouch || 0) * 0.6;
      L.ankle.rotation.x = r.ankle - lift * 0.3 - (st.crouch || 0) * 0.3;
      L.foot.rotation.x = -(L.thigh.rotation.x + L.shin.rotation.x + L.ankle.rotation.x) + (st.air ? 0.4 : 0);
    });
    m.hips.position.y = m.hipH - (A * A * 0.8) * Math.pow(Math.sin(ph), 2) - (st.crouch || 0) * 0.9;
    m.hips.rotation.z = Math.sin(ph) * A * 0.06;
    m.hips.rotation.x = 0.04 + vf * 0.05;
  } else {
    m.legs.forEach((L, i) => {
      const diag = (L.side > 0) === (L.front > 0) ? 0 : Math.PI;
      const p = ph + diag;
      const lift = Math.max(0, Math.cos(p)) * A;
      L.hip.rotation.y = L.hip.userData.baseYaw + Math.sin(p) * A * 0.6 * L.front * (L.side);
      L.upper.rotation.x = -2.2 - lift * 0.5;
      L.lower.rotation.x = 1.95 + lift * 0.25;
    });
    m.hips.position.y = m.hipH + Math.sin(ph * 2) * A * 0.12;
    m.hips.rotation.z = Math.sin(ph) * A * 0.03;
  }
  // torso twist and pitch
  m.torso.rotation.y = st.twist || 0;
  // counter the hips' own yaw/roll so the cockpit stays stable
  m.torso.rotation.z = -m.hips.rotation.z * 0.6;
  const pitch = st.pitch || 0;
  if (cls.legs !== 'quad') m.torso.rotation.x = -pitch * 0.35;
  // arms aim
  for (const k of ['armL', 'armR']) {
    const a = m.arms[k]; if (!a || a.pod) { if (a && a.pod) a.sh.rotation.x = -pitch; continue; }
    const sw = (cls.legs === 'quad' ? 0 : Math.sin(ph + (a.side > 0 ? 0 : Math.PI)) * A * 0.15);
    a.upper.rotation.x = 0.12 + sw;
    a.elbow.rotation.x = -pitch * 0.65 - a.upper.rotation.x;
  }
  for (const k of ['shL', 'shR', 'torsoC', 'back']) if (m.mounts[k]) m.mounts[k].rotation.x = -pitch * (cls.legs === 'quad' ? 1 : 0.65);
  // jets
  const jet = st.jet || 0;
  m.jets.forEach((j, i) => { j.visible = jet > 0.02; if (j.visible) { const f = 0.6 + jet * 0.6 + Math.sin(st.t * 60 + i) * 0.12; j.scale.set(1, f, 1); } });
  if (m.rainbow && jet > 0) m.jetMat.color.setHSL((st.t * 0.5) % 1, 1, 0.55);
  // heat vents
  m.mats.vent.emissiveIntensity = 0.1 + (st.heat || 0) * 3.5;
  if (m.mats.anim && m.mats.p.map) { m.mats.p.map.offset.x += dt * 0.03; }
  // weapon recoil recovery + rotary spin
  m.weapons.forEach(w => {
    w.kick.position.z += (0 - w.kick.position.z) * Math.min(1, dt * 10);
    if (w.spin) w.spin.rotation.z += dt * (w.spinRate || 0) * 40;
  });
  return steps;
};
M.recoil = function (m, wi, amt) { const w = m.weapons[wi]; if (w) w.kick.position.z = -amt; };

// ---------- shop / garage display models ----------
const displayMats = () => makeMats({ skin: MW.item('s_solid_0'), colors: ['#5a636d', '#2b2f35', '#ffb52e'], finish: MW.item('f_metallic') || { finish: 'metallic' }, cockpit: MW.item('c_0') });
let dMats = null;
M.displayMats = () => dMats || (dMats = displayMats());
M.weaponDisplay = function (item) { const w = M.weapon(item.wtype, item.tier, M.displayMats()); w.group.scale.setScalar(1); return w.group; };

M.equipModel = function (item) {
  const g = new THREE.Group(); const mats = M.displayMats(); const tm = M.tierMat(item.tier);
  const glow = M.glowMat(MW.TIERS[item.tier].color);
  const P = mats.p, D = mats.d, J = mats.j;
  switch (item.slot) {
    case 'armor': {
      const col = { composite: '#7d868f', reactive: '#8a6a3a', ablative: '#c8d0dc', ferro: '#4f6a5a' }[item.variant] || '#7d868f';
      const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0.7, roughness: 0.35, bumpMap: MW.tex.panelBump(), bumpScale: 0.02 });
      add(g, bbox(2.4, 2.8, 0.5), mat, 0, 0, 0); add(g, bbox(2.0, 2.4, 0.3), D, 0, 0, -0.35);
      if (item.variant === 'reactive') for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) add(g, bbox(0.6, 0.7, 0.25), mat, -0.75 + i * 0.75, -0.9 + j * 0.9, 0.35);
      if (item.variant === 'ablative') add(g, bbox(2.2, 2.6, 0.12), M.glassMat('#9fe0ff'), 0, 0, 0.3);
      if (item.variant === 'ferro') for (let i = 0; i < 6; i++) add(g, box(2.3, 0.05, 0.05), J, 0, -1.2 + i * 0.48, 0.28);
      for (let k = 0; k < 4; k++) add(g, cyl(0.07, 0.07, 0.1, 8), J, k % 2 ? 0.95 : -0.95, k < 2 ? 1.15 : -1.15, 0.28, Math.PI / 2);
      add(g, box(1.6, 0.12, 0.05), tm, 0, -1.25, 0.3); break; }
    case 'reactor': {
      add(g, cyl(1.0, 1.0, 2.4, 20), D, 0, 0, 0); add(g, cyl(0.7, 0.7, 2.6, 16), glow, 0, 0, 0, 0, 0, 0, 1, 1, 1);
      for (let i = 0; i < 5; i++) add(g, tor(1.05, 0.12, 6, 24), i % 2 ? J : P, 0, -1 + i * 0.5, 0, Math.PI / 2);
      add(g, cyl(1.2, 1.2, 0.3, 20), P, 0, 1.3, 0); add(g, cyl(1.2, 1.2, 0.3, 20), P, 0, -1.3, 0);
      if (item.variant === 'cryo') for (let i = 0; i < 4; i++) add(g, cyl(0.12, 0.12, 2.4, 8), M.glowMat('#9fe0ff'), Math.cos(i * 1.57) * 1.25, 0, Math.sin(i * 1.57) * 1.25);
      if (item.variant === 'xl') add(g, bbox(0.6, 2.0, 0.6), P, 1.2, 0, 0);
      break; }
    case 'actuator': {
      add(g, cyl(0.9, 0.9, 0.5, 18), P, 0, 0.8, 0, Math.PI / 2); add(g, cyl(0.45, 0.45, 0.6, 12), D, 0, 0.8, 0, Math.PI / 2);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(g, box(0.22, 0.25, 0.5), J, Math.cos(a) * 0.98, 0.8 + Math.sin(a) * 0.98, 0, 0, 0, a); }
      add(g, cyl(0.22, 0.22, 2.2, 10), J, 0, -0.6, 0.0, 0, 0, 0.0); add(g, cyl(0.32, 0.32, 1.2, 10), D, 0, -1.2, 0);
      if (item.variant === 'myomer' || item.variant === 'tsm') for (let i = 0; i < 5; i++) add(g, cyl(0.08, 0.08, 2.0, 6), item.variant === 'tsm' ? M.glowMat('#ff4a2a') : new THREE.MeshStandardMaterial({ color: 0xb03030, roughness: 0.6 }), -0.4 + i * 0.2, -0.4, 0.45);
      add(g, box(0.5, 0.08, 0.08), tm, 0, 0.8, 0.3); break; }
    case 'jets': {
      add(g, cyl(0.6, 0.9, 1.6, 18), D, 0, 0, 0); add(g, cyl(0.9, 0.9, 0.3, 18), P, 0, 0.9, 0);
      add(g, tor(0.8, 0.08, 6, 20), J, 0, -0.6, 0, Math.PI / 2);
      const fl = new THREE.Mesh(cyl(0.1, 0.65, 2.4, 14, true), new THREE.MeshBasicMaterial({ color: item.variant === 'pulsejet' ? 0x5cc8ff : 0xff9a3a, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
      fl.position.y = -2.0; g.add(fl);
      if (item.variant === 'vectored') for (let i = 0; i < 4; i++) add(g, box(0.1, 0.8, 0.5), P, Math.cos(i * 1.57) * 0.95, -0.5, Math.sin(i * 1.57) * 0.95, 0, -i * 1.57, 0);
      break; }
    case 'targeting': {
      add(g, bbox(2.0, 1.2, 1.4), P, 0, 0, 0); add(g, cyl(0.42, 0.42, 0.3, 16), D, -0.45, 0, 0.75, Math.PI / 2); add(g, cyl(0.32, 0.32, 0.05, 16), glow, -0.45, 0, 0.92, Math.PI / 2);
      add(g, cyl(0.22, 0.22, 0.3, 12), D, 0.5, 0.2, 0.75, Math.PI / 2); add(g, cyl(0.15, 0.15, 0.05, 12), M.glowMat('#ff3333'), 0.5, 0.2, 0.92, Math.PI / 2);
      add(g, box(0.06, 1.4, 0.06), J, 0.8, 1.2, -0.4); if (item.variant === 'tacnet') add(g, cyl(0.7, 0.2, 0.2, 14), J, 0, 1.0, 0, 0.5);
      break; }
    case 'module': {
      if (item.variant === 'ams') { add(g, cyl(0.9, 1.0, 0.6, 16), D, 0, -0.5, 0); const h = node(g, 0, 0.2, 0); add(h, sph(0.7, 14, 10), P, 0, 0, 0); for (let i = 0; i < 4; i++) add(h, cyl(0.05, 0.05, 1.6, 6), J, -0.15 + (i % 2) * 0.3, -0.1 + (i >> 1) * 0.2, 0.9, Math.PI / 2); }
      if (item.variant === 'ecm') { add(g, bbox(1.4, 0.8, 1.0), P, 0, -0.8, 0); add(g, cyl(0.06, 0.06, 2.0, 6), J, 0, 0.3, 0); add(g, cyl(1.0, 0.1, 0.4, 16, true), J, 0, 1.2, 0, 0.6); add(g, sph(0.12, 8, 6), glow, 0, 1.35, 0.1); }
      if (item.variant === 'repair') { add(g, sph(0.6, 14, 10), P, 0, 0, 0); for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.78; add(g, box(1.0, 0.08, 0.15), D, Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7, 0, -a); add(g, cyl(0.35, 0.35, 0.04, 14), M.glowMat('#62f6ff'), Math.cos(a) * 1.15, 0.2, Math.sin(a) * 1.15); } add(g, box(0.5, 0.15, 0.15), M.glowMat('#4cff7a'), 0, 0.2, 0.55); add(g, box(0.15, 0.5, 0.15), M.glowMat('#4cff7a'), 0, 0.2, 0.55); }
      if (item.variant === 'shield') { add(g, cyl(0.8, 1.0, 0.8, 16), D, 0, -0.8, 0); add(g, sph(0.5, 14, 10), glow, 0, 0, 0); const bub = new THREE.Mesh(sph(1.4, 24, 16), new THREE.MeshBasicMaterial({ color: 0x62c8ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(bub); }
      break; }
  }
  mergeNode(g);
  return g;
};

M.trinketModel = function (kind, col) {
  const g = new THREE.Group();
  const c = new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: 0.5, metalness: 0.1 });
  const w = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.6 });
  const k = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffcf5a, metalness: 1, roughness: 0.25 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b894, roughness: 0.7 });
  switch (kind) {
    case 'bobble': add(g, cyl(0.25, 0.3, 0.1, 12), k, 0, 0, 0); add(g, cyl(0.12, 0.16, 0.4, 10), c, 0, 0.25, 0); const hd = node(g, 0, 0.5, 0, 'head'); hd.userData.wobble = true; add(hd, sph(0.22, 14, 10), skin, 0, 0.18, 0); add(hd, sph(0.235, 14, 10), c, 0, 0.24, -0.02, 0, 0, 0, 1, 0.75, 1); add(hd, box(0.3, 0.07, 0.04), M.glowMat('#7fdcff'), 0, 0.2, 0.2); break;
    case 'bobcat': add(g, cyl(0.25, 0.3, 0.1, 12), k, 0, 0, 0); add(g, sph(0.18, 10, 8), c, 0, 0.2, 0); const hc = node(g, 0, 0.42, 0, 'head'); hc.userData.wobble = true; add(hc, sph(0.2, 12, 10), c, 0, 0.1, 0); for (const s of [-1, 1]) { add(hc, oct(0.08), c, s * 0.12, 0.3, 0, 0, 0, 0, 1, 1.4, 0.6); add(hc, sph(0.035, 6, 4), k, s * 0.07, 0.14, 0.17); } break;
    case 'dice': for (const s of [-1, 1]) { add(g, bbox(0.32, 0.32, 0.32, 0.06), c, s * 0.2, -0.5 - s * 0.1, 0, s * 0.4, s * 0.5, 0); add(g, cyl(0.005, 0.005, 0.5 + s * 0.1, 4), w, s * 0.1, -0.2, 0, 0, 0, s * 0.35); } g.userData.hang = true; break;
    case 'hula': add(g, cyl(0.2, 0.25, 0.08, 12), k, 0, 0, 0); const hb = node(g, 0, 0.1, 0, 'head'); hb.userData.wobble = true; add(hb, bbox(0.24, 0.3, 0.16), c, 0, 0.2, 0); add(hb, cyl(0.2, 0.22, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x6abf3b }), 0, 0.05, 0); add(hb, box(0.2, 0.12, 0.14), M.glowMat('#ffb52e'), 0, 0.42, 0); break;
    case 'duck': add(g, sph(0.25, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffd60a, roughness: 0.4 }), 0, 0.2, 0, 0, 0, 0, 1.2, 0.9, 1); add(g, sph(0.16, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffd60a, roughness: 0.4 }), 0, 0.45, 0.12); add(g, tbox(0.14, 0.06, 0.14, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0xff8a1c }), 0, 0.43, 0.28); for (const s of [-1, 1]) add(g, sph(0.025, 6, 4), k, s * 0.07, 0.5, 0.25); add(g, cyl(0.06, 0.06, 0.04, 8), c, 0, 0.6, 0.1); break;
    case 'freshener': add(g, cyl(0.005, 0.005, 0.4, 4), w, 0, -0.2, 0); { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.22, -0.25); s.lineTo(0.1, -0.25); s.lineTo(0.28, -0.5); s.lineTo(0.12, -0.5); s.lineTo(0.3, -0.75); s.lineTo(-0.3, -0.75); s.lineTo(-0.12, -0.5); s.lineTo(-0.28, -0.5); s.lineTo(-0.1, -0.25); s.lineTo(-0.22, -0.25); s.closePath(); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false }), c); m.position.y = -0.4; g.add(m); } g.userData.hang = true; break;
    case 'luckycat': add(g, bbox(0.4, 0.45, 0.3), w, 0, 0.22, 0); add(g, sph(0.22, 12, 10), w, 0, 0.6, 0); for (const s of [-1, 1]) add(g, oct(0.07), w, s * 0.13, 0.8, 0, 0, 0, 0, 1, 1.3, 0.6); const paw = node(g, 0.22, 0.45, 0.05, 'head'); paw.userData.wave = true; add(paw, bbox(0.1, 0.25, 0.1), w, 0, 0.12, 0); add(g, cyl(0.08, 0.08, 0.02, 12), gold, 0, 0.25, 0.16, Math.PI / 2); add(g, box(0.42, 0.04, 0.02), c, 0, 0.42, 0.15); break;
    case 'tags': add(g, cyl(0.004, 0.004, 0.5, 4), gold, 0, -0.25, 0); add(g, bbox(0.18, 0.3, 0.02, 0.01), M.jointMat(), 0, -0.6, 0); add(g, bbox(0.18, 0.3, 0.02, 0.01), M.jointMat(), 0.05, -0.65, -0.02, 0, 0, 0.2); g.userData.hang = true; break;
    case 'crystal': add(g, cyl(0.004, 0.004, 0.4, 4), w, 0, -0.2, 0); add(g, oct(0.18), new THREE.MeshStandardMaterial({ color: col, emissive: new THREE.Color(col), emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.85 }), 0, -0.6, 0, 0, 0, 0, 1, 1.6, 1); g.userData.hang = true; break;
    case 'minimech': { const mm = M.build(MW.makeBuild('vanguard', MW.profile.defaultLoadout('vanguard'), ''), { noShadow: true }); mm.root.scale.setScalar(0.08); g.add(mm.root); add(g, cyl(0.3, 0.3, 0.05, 14), k, 0, 0, 0); break; }
    case 'cube': add(g, bbox(0.5, 0.5, 0.5, 0.12), c, 0, 0.27, 0); for (const s of [-1, 1]) add(g, sph(0.04, 6, 4), k, s * 0.1, 0.35, 0.25); add(g, box(0.12, 0.03, 0.02), k, 0, 0.22, 0.25); break;
    case 'medal': add(g, box(0.16, 0.4, 0.01), c, 0, -0.25, 0); add(g, cyl(0.15, 0.15, 0.03, 16), gold, 0, -0.55, 0, Math.PI / 2); add(g, oct(0.06), gold, 0, -0.55, 0.03); g.userData.hang = true; break;
    case 'skull': add(g, sph(0.22, 12, 10), w, 0, 0.25, 0); add(g, bbox(0.24, 0.12, 0.2), w, 0, 0.08, 0.04); for (const s of [-1, 1]) add(g, sph(0.06, 8, 6), k, s * 0.08, 0.26, 0.18); add(g, cyl(0.12, 0.14, 0.05, 10), c, 0, 0, 0); break;
    case 'photo': { const tx = MW.tex.label('♥', '#fff', col, 64, 80); add(g, box(0.36, 0.46, 0.01), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.4 }), 0, 0.25, 0, -0.15); add(g, box(0.1, 0.06, 0.05), k, 0, 0.0, 0); break; }
    case 'dreamcatcher': add(g, cyl(0.004, 0.004, 0.3, 4), w, 0, -0.15, 0); add(g, tor(0.2, 0.02, 6, 20), c, 0, -0.5, 0); for (const x of [-0.12, 0, 0.12]) add(g, oct(0.05), w, x, -0.85, 0, 0, 0, 0, 0.6, 2.4, 0.3); g.userData.hang = true; break;
    case 'rocket': add(g, cyl(0.1, 0.1, 0.5, 12), w, 0, 0.35, 0); add(g, cyl(0, 0.1, 0.2, 12), c, 0, 0.7, 0); for (let i = 0; i < 3; i++) add(g, box(0.02, 0.18, 0.14), c, Math.cos(i * 2.1) * 0.1, 0.15, Math.sin(i * 2.1) * 0.1, 0, -i * 2.1); add(g, cyl(0.12, 0.14, 0.04, 10), k, 0, 0, 0); break;
  }
  return g;
};
})();
