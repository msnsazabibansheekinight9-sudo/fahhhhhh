// ============================================================================
// World: map construction kit, AABB collision, ballistic raycasts, nav grid
// with A* pathfinding, lighting presets and the long-distance range.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const { gBox, gCyl, gCylY, gSph, gRBox, gProf } = G.geo;
const PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// shared surface materials
const SM = {};
function surf(kind, rep) {
  const k = kind + (rep || '');
  if (SM[k]) return SM[k];
  let m;
  const T = (tex, r) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(r || 1, r || 1); return t; };
  switch (kind) {
    case 'brick': m = G.mat({ map: T(G.texSurface('brick'), rep), roughness: .9 }); break;
    case 'redbrick': m = G.mat({ map: T(G.texSurface('redbrick'), rep), roughness: .9 }); break;
    case 'plaster': m = G.mat({ map: T(G.texSurface('plaster'), rep), roughness: .95 }); break;
    case 'adobe': m = G.mat({ map: T(G.texSurface('plaster'), rep), color: '#e8c9a0', roughness: .95 }); break;
    case 'stone': m = G.mat({ map: T(G.texSurface('stone'), rep), roughness: .9 }); break;
    case 'planks': m = G.mat({ map: T(G.texSurface('planks'), rep), roughness: .85 }); break;
    case 'sandbag': m = G.mat({ map: T(G.texSurface('sandbag'), rep), roughness: 1 }); break;
    case 'concrete': m = G.mat({ map: T(G.texSurface('concrete_wall'), rep), roughness: .92 }); break;
    case 'corrugated': m = G.mat({ map: T(G.texSurface('corrugated'), rep), roughness: .6, metalness: .5 }); break;
    case 'container_r': case 'container_b': case 'container_g': m = G.mat({ map: T(G.texSurface(kind), rep), roughness: .6, metalness: .4 }); break;
    case 'crate': m = G.mat({ map: T(G.texSurface('crate'), 1), roughness: .85 }); break;
    case 'metal': m = G.mat({ map: T(G.texSurface('metal_panel'), rep), roughness: .5, metalness: .6 }); break;
    case 'thatch': m = G.mat({ map: T(G.texSurface('thatch'), rep), roughness: 1 }); break;
    case 'bamboo': m = G.mat({ map: T(G.texSurface('bamboo'), rep), roughness: .85 }); break;
    case 'rust': m = G.mat({ color: '#5a3c2a', roughness: .8, metalness: .5 }); break;
    case 'darkmetal': m = G.mat({ color: '#2d3034', roughness: .5, metalness: .7 }); break;
    case 'olive': m = G.mat({ color: '#4c5236', roughness: .7, metalness: .3 }); break;
    case 'grey': m = G.mat({ color: '#8b8a86', roughness: .9 }); break;
    case 'white': m = G.mat({ color: '#d8dade', roughness: .6, metalness: .2 }); break;
    case 'glass': m = G.mat({ color: '#223038', roughness: .05, metalness: .8, transparent: true, opacity: .5 }); break;
    case 'bark': m = G.mat({ color: '#3b2e22', roughness: 1 }); break;
    case 'birch': m = G.mat({ color: '#cfcac0', roughness: .9 }); break;
    case 'leaf': m = G.mat({ color: '#3a5226', roughness: .9, flatShading: true }); break;
    case 'leaf2': m = G.mat({ color: '#2a4020', roughness: .9, flatShading: true }); break;
    case 'jleaf': m = G.mat({ color: '#2f5a24', roughness: .8, flatShading: true }); break;
    case 'palm': m = G.mat({ color: '#56702e', roughness: .8, flatShading: true, side: THREE.DoubleSide }); break;
    case 'pine': m = G.mat({ color: '#223a26', roughness: .9, flatShading: true }); break;
    case 'snowleaf': m = G.mat({ color: '#e9eef3', roughness: .9, flatShading: true }); break;
    case 'hedge': m = G.mat({ color: '#34481f', roughness: 1, flatShading: true }); break;
    case 'mud': m = G.mat({ map: T(G.texGround('mud'), rep || 2), roughness: 1 }); break;
    case 'dirt': m = G.mat({ map: T(G.texGround('dirt'), rep || 2), roughness: 1 }); break;
    case 'rubble': m = G.mat({ map: T(G.texGround('rubble'), rep || 1), roughness: 1, flatShading: true }); break;
    case 'snow': m = G.mat({ map: T(G.texGround('snow'), rep || 2), roughness: .9 }); break;
    case 'sand': m = G.mat({ map: T(G.texGround('sand'), rep || 2), roughness: 1 }); break;
    case 'wire': m = new THREE.MeshBasicMaterial({ map: G.texSprite('wire'), transparent: true, alphaTest: .4, side: THREE.DoubleSide }); break;
    case 'red': m = G.mat({ color: '#8a2a1e', roughness: .7 }); break;
    case 'yellow': m = G.mat({ color: '#c9a032', roughness: .6, metalness: .3 }); break;
    case 'car1': m = G.mat({ color: '#6e7a82', roughness: .4, metalness: .6 }); break;
    case 'car2': m = G.mat({ color: '#9b3a2e', roughness: .4, metalness: .6 }); break;
    case 'car3': m = G.mat({ color: '#d6d1bf', roughness: .4, metalness: .5 }); break;
    case 'tire': m = G.mat({ color: '#161616', roughness: .95 }); break;
    case 'burnt': m = G.mat({ color: '#221e1a', roughness: .9, metalness: .3 }); break;
    case 'target': m = G.mat({ color: '#e9e2d0', roughness: .9 }); break;
    default: m = G.mat({ color: '#888', roughness: .9 });
  }
  return (SM[k] = m);
}
G.surf = surf;

// ------------------------------------------------------------------ World
class World {
  constructor(scene) { this.scene = scene; this.group = null; this.colliders = []; this.dynamic = []; this.zones = []; }
  reset() {
    if (this.group) { this.scene.remove(this.group); this.group.traverse(o => { if (o.geometry && !o.geometry.parameters) o.geometry.dispose(); }); }
    this.group = new THREE.Group(); this.scene.add(this.group);
    this.static = new THREE.Group(); this.group.add(this.static);
    this.colliders = []; this.zones = []; this.dynamic = [];
    this.spawns = [[], []]; this.hot = []; this.bounds = 46; this.baseHeight = 0; this.groundMat = 'dirt';
  }
  // collider: min/max Vector3, surface material, flags
  addCol(min, max, mat, o = {}) {
    const c = { min, max, mat, pen: o.pen ?? PENRES[mat] ?? 3, soft: !!o.soft, noMove: !!o.noMove, noShoot: !!o.noShoot, see: !!o.see, obj: o.obj || null, target: o.target || null };
    this.colliders.push(c); return c;
  }
  // ---------------------------------------------------------- kit
  box(x, y, z, w, h, d, m, mat, o = {}) {
    const mesh = new THREE.Mesh(o.geo || gBox(w, h, d), m); mesh.position.set(x, y + h / 2, z);
    if (o.ry) mesh.rotation.y = o.ry;
    mesh.castShadow = o.shadow !== false; mesh.receiveShadow = true;
    (o.parent || this.static).add(mesh);
    if (!o.noCol) { const sw = o.ry && Math.abs(Math.sin(o.ry)) > .7; const cw = sw ? d : w, cd = sw ? w : d; this.addCol(V3(x - cw / 2, y, z - cd / 2), V3(x + cw / 2, y + h, z + cd / 2), mat, o); }
    return mesh;
  }
  // axis-aligned wall with openings: opens = [{t: 0..1 center, w, y0, y1}]
  wall(x1, z1, x2, z2, h, th, m, mat, opens = [], y = 0) {
    const horiz = Math.abs(z2 - z1) < .01, len = horiz ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    const sx = Math.min(x1, x2), sz = Math.min(z1, z2);
    const seg = (a, b, y0, y1) => { if (b - a < .05 || y1 - y0 < .05) return; const c = (a + b) / 2, l = b - a;
      if (horiz) this.box(sx + c, y + y0, z1, l, y1 - y0, th, m, mat); else this.box(x1, y + y0, sz + c, th, y1 - y0, l, m, mat); };
    const os = opens.map(o => ({ a: o.t * len - o.w / 2, b: o.t * len + o.w / 2, y0: o.y0 || 0, y1: o.y1 ?? 2.2 })).sort((p, q) => p.a - q.a);
    let cur = 0;
    for (const o of os) { seg(cur, o.a, 0, h); seg(o.a, o.b, 0, o.y0); seg(o.a, o.b, o.y1, h); cur = o.b; }
    seg(cur, len, 0, h);
  }
  house(x, z, w, d, h, o = {}) {
    const m = surf(o.mat || 'plaster', o.rep || 2), mat = o.surf || 'stone', th = o.th || .3;
    const door = { t: .5, w: 1.3, y0: 0, y1: 2.2 };
    const win = (t) => ({ t, w: 1.1, y0: 1, y1: 2 });
    const sides = o.doors || ['s', 'n'];
    const mk = (s) => { const L = []; if (sides.includes(s)) L.push({ ...door, t: o.doorT || .5 }); if (o.windows !== false) { if (s === 'e' || s === 'w' || !sides.includes(s)) L.push(win(.3), win(.7)); else { if ((s === 'n' ? w : w) > 5) { L.push(win(.18)); L.push(win(.82)); } } } return L; };
    const hh = o.ruined ? h * (.5 + Math.random() * .4) : h;
    this.wall(x - w / 2, z - d / 2, x + w / 2, z - d / 2, hh, th, m, mat, mk('n'));
    this.wall(x - w / 2, z + d / 2, x + w / 2, z + d / 2, o.ruined ? h * .6 : h, th, m, mat, mk('s'));
    this.wall(x - w / 2, z - d / 2, x - w / 2, z + d / 2, h, th, m, mat, mk('w'));
    this.wall(x + w / 2, z - d / 2, x + w / 2, z + d / 2, o.ruined ? h * .45 : h, th, m, mat, mk('e'));
    if (!o.ruined && o.roof !== 'none') {
      if (o.roof === 'gable') {
        const rm = surf(o.roofMat || 'planks', 2);
        for (const s of [-1, 1]) { const r = this.box(x + s * w / 4, h, z, w / 2 + .5, .15, d + .6, rm, 'wood', { noCol: true }); r.rotation.z = -s * .5; r.position.y = h + .65; }
        this.addCol(V3(x - w / 2, h, z - d / 2), V3(x + w / 2, h + 1.4, z + d / 2), 'wood', { noMove: true });
      } else this.box(x, h, z, w + .3, .25, d + .3, surf(o.roofMat || 'concrete', 2), 'concrete');
    }
    if (o.ruined) { for (let i = 0; i < 4; i++) this.rubble(x + (Math.random() - .5) * w * .8, z + (Math.random() - .5) * d * .8, .8 + Math.random()); }
    if (o.floor2 && !o.ruined) { // interior stairs are not simulated; floor slab gives a sniper roof
      this.box(x, h - .2, z, w - .2, .2, d - .2, surf('planks', 3), 'wood', { noMove: true });
    }
  }
  sandbags(x, z, len, h = 1.1, axis = 'x', o = {}) {
    const m = surf('sandbag', 1), n = Math.max(1, Math.round(len / .55)), rows = Math.round(h / .22);
    const g = new THREE.Group(); g.position.set(x, 0, z); this.static.add(g);
    for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
      const off = (r % 2) * .27, p = -len / 2 + .27 + i * (len / n) + off;
      if (p > len / 2) continue;
      const b = new THREE.Mesh(gRBox(.32, .2, .55, .08), m);
      b.castShadow = b.receiveShadow = true; b.scale.set(1, 1, 1 + Math.random() * .08);
      if (axis === 'x') { b.position.set(p, .1 + r * .21, 0); b.rotation.y = PI / 2; }
      else b.position.set(0, .1 + r * .21, p);
      b.rotation.z = (Math.random() - .5) * .08;
      g.add(b);
    }
    const hw = axis === 'x' ? len / 2 : .2, hd = axis === 'x' ? .2 : len / 2;
    this.addCol(V3(x - hw, 0, z - hd), V3(x + hw, rows * .21, z + hd), 'sandbag', o);
  }
  crate(x, z, s = 1, y = 0, ry = 0) { return this.box(x, y, z, s, s, s, surf('crate'), 'wood', { ry }); }
  barrel(x, z, y = 0) { const m = new THREE.Mesh(gCylY(.3, .3, .9, 14), surf(Math.random() < .5 ? 'rust' : 'olive')); m.position.set(x, y + .45, z); m.castShadow = true; this.static.add(m); this.addCol(V3(x - .3, y, z - .3), V3(x + .3, y + .9, z + .3), 'metal'); }
  rubble(x, z, s = 1) {
    const m = surf('rubble', 1);
    for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(.25 * s + Math.random() * .3 * s, 0), m); r.position.set(x + (Math.random() - .5) * s * 1.5, .1, z + (Math.random() - .5) * s * 1.5); r.scale.y = .5; r.rotation.set(Math.random() * 3, Math.random() * 3, 0); r.castShadow = r.receiveShadow = true; this.static.add(r); }
    this.addCol(V3(x - s * .6, 0, z - s * .6), V3(x + s * .6, .35 * s, z + s * .6), 'stone');
  }
  tree(x, z, h = 7, kind = 'oak') {
    const g = new THREE.Group(); g.position.set(x, 0, z); this.static.add(g);
    const barkM = surf(kind === 'birch' ? 'birch' : 'bark');
    const tr = kind === 'palm' ? .16 : kind === 'dead' ? .2 : kind === 'jungle' ? .32 : .25;
    const trunk = new THREE.Mesh(gCylY(tr * .6, tr, h * (kind === 'palm' ? 1 : .6), 8), barkM); trunk.position.y = h * (kind === 'palm' ? .5 : .3); trunk.castShadow = true; g.add(trunk);
    if (kind === 'palm') { trunk.rotation.z = (Math.random() - .5) * .2; for (let i = 0; i < 8; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(.8, 3.2), surf('palm')); f.position.set(Math.cos(i) * 1.3, h - .2, Math.sin(i) * 1.3); f.rotation.set(-1.1, i * .785, 0); f.lookAt(x + Math.cos(i * .785) * 5, h - 1.5, z + Math.sin(i * .785) * 5); f.position.set(Math.cos(i * .785) * 1.3, h - .3, Math.sin(i * .785) * 1.3); f.castShadow = true; g.add(f); } }
    else if (kind === 'dead') { for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(gCylY(.04, .08, 2, 5), barkM); b.position.set(0, h * .5 + i * .6, 0); b.rotation.set((Math.random() - .5) * 1.8, 0, (Math.random() - .5) * 1.8); b.translateY(.8); b.castShadow = true; g.add(b); } }
    else if (kind === 'pine' || kind === 'snowpine') {
      for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(2.2 - i * .45, 2.2, 8), surf(kind === 'snowpine' && i % 2 ? 'snowleaf' : 'pine')); c.position.y = h * .3 + i * 1.3 + 1; c.castShadow = true; g.add(c); }
    } else {
      const lm = surf(kind === 'jungle' ? 'jleaf' : Math.random() < .5 ? 'leaf' : 'leaf2');
      for (let i = 0; i < (kind === 'jungle' ? 7 : 5); i++) { const r = (kind === 'jungle' ? 2.2 : 1.8) + Math.random(); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), lm); c.position.set((Math.random() - .5) * 2.4, h * .7 + Math.random() * 1.8, (Math.random() - .5) * 2.4); c.scale.y = .75; c.rotation.set(Math.random(), Math.random(), 0); c.castShadow = true; g.add(c); }
    }
    this.addCol(V3(x - tr, 0, z - tr), V3(x + tr, h * .75, z + tr), 'wood');
  }
  bush(x, z, s = 1, m = 'leaf2') { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.8 * s, 0), surf(m)); b.position.set(x, .45 * s, z); b.scale.y = .7; b.rotation.y = Math.random() * 3; b.castShadow = true; this.static.add(b); this.addCol(V3(x - .7 * s, 0, z - .7 * s), V3(x + .7 * s, 1.1 * s, z + .7 * s), 'foliage', { soft: true, noMove: true }); }
  hedge(x, z, len, axis = 'x', h = 2.6) {
    const w = axis === 'x' ? len : 1.4, d = axis === 'x' ? 1.4 : len;
    const n = Math.ceil(len / 1.6);
    for (let i = 0; i < n; i++) { const t = -len / 2 + (i + .5) * len / n; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), surf('hedge')); b.position.set(x + (axis === 'x' ? t : (Math.random() - .5) * .3), h * .5 + (Math.random() - .5) * .3, z + (axis === 'x' ? (Math.random() - .5) * .3 : t)); b.scale.set(axis === 'x' ? 1.1 : .75, h / 2.2, axis === 'x' ? .75 : 1.1); b.castShadow = true; b.receiveShadow = true; this.static.add(b); }
    this.box(x, 0, z, w * .9, .6, d * .7, surf('dirt', 2), 'dirt', { noCol: false }); // earthen bank
    this.addCol(V3(x - w / 2, .6, z - d / 2), V3(x + w / 2, h, z + d / 2), 'foliage', { soft: true });
  }
  wire(x, z, len, axis = 'x') {
    const m = surf('wire');
    const n = Math.ceil(len / 2);
    for (let i = 0; i <= n; i++) { const t = -len / 2 + i * len / n; const p = new THREE.Mesh(gCylY(.03, .03, 1.2, 5), surf('bark')); p.position.set(x + (axis === 'x' ? t : 0), .6, z + (axis === 'x' ? 0 : t)); p.rotation.z = (Math.random() - .5) * .3; this.static.add(p); }
    for (let k = 0; k < 2; k++) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.1), m); pl.position.set(x + (axis === 'x' ? 0 : (k - .5) * .5), .55, z + (axis === 'x' ? (k - .5) * .5 : 0)); if (axis !== 'x') pl.rotation.y = PI / 2; this.group.add(pl); }
    const hw = axis === 'x' ? len / 2 : .6, hd = axis === 'x' ? .6 : len / 2;
    this.zones.push({ min: V3(x - hw, 0, z - hd), max: V3(x + hw, 1.2, z + hd), slow: .4 });
  }
  crater(x, z, r = 3) {
    const m = surf('mud', 1);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * .22, 6, 16), m); ring.rotation.x = -PI / 2; ring.scale.z = .5; ring.position.set(x, .05, z); ring.receiveShadow = ring.castShadow = true; this.static.add(ring);
    const pit = new THREE.Mesh(new THREE.CircleGeometry(r * .95, 16), G.mat({ color: '#241c14', roughness: 1 })); pit.rotation.x = -PI / 2; pit.position.set(x, .012, z); this.static.add(pit);
    for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; this.addCol(V3(x + Math.cos(a) * r - .5, 0, z + Math.sin(a) * r - .5), V3(x + Math.cos(a) * r + .5, .32, z + Math.sin(a) * r + .5), 'mud'); }
  }
  vehicle(x, z, ry = 0, kind = 'truck') {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; this.static.add(g);
    const b = (px, py, pz, w, h, d, m) => { const o = new THREE.Mesh(gRBox(w, h, d, Math.min(w, h) * .08), m); o.position.set(px, py + h / 2, pz); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    const wheel = (px, pz, r = .45, w = .3) => { const o = new THREE.Mesh(G.geo.gCylX(r, r, w, 14), surf('tire')); o.position.set(px, r, pz); o.castShadow = true; g.add(o); };
    let W = 2.4, L = 6, H = 2.6;
    if (kind === 'truck' || kind === 'wwtruck') {
      const bm = surf(kind === 'wwtruck' ? 'olive' : 'car1');
      b(0, .7, -2, 2.3, 1.5, 1.8, bm); b(0, .6, -3, 2.1, .9, .9, bm); b(0, .8, 1, 2.4, .25, 4.2, bm);
      b(1.15, 1.05, 1, .08, .8, 4.2, surf('planks')); b(-1.15, 1.05, 1, .08, .8, 4.2, surf('planks')); b(0, 1.05, 3.05, 2.4, .8, .08, surf('planks'));
      if (kind === 'wwtruck') { const c = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 4.2, 12, 1, true, 0, PI), surf('olive')); c.rotation.z = PI / 2; c.rotation.y = PI / 2; c.position.set(0, 1.9, 1); g.add(c); }
      for (const s of [-1, 1]) { wheel(s * 1.05, -2.6); wheel(s * 1.05, 1.9); wheel(s * 1.05, .9); }
    } else if (kind === 'car' || kind === 'trabant' || kind === 'burnt') {
      const bm = kind === 'burnt' ? surf('burnt') : surf(['car1', 'car2', 'car3'][Math.floor(Math.random() * 3)]);
      W = 1.7; L = kind === 'trabant' ? 3.5 : 4.4; H = 1.45;
      b(0, .3, 0, W, .7, L, bm); b(0, 1, .2, W * .92, .5, L * .5, bm);
      b(0, 1.02, .2, W * .94, .44, L * .48, surf('glass'));
      for (const s of [-1, 1]) for (const q of [-1, 1]) wheel(s * W * .45, q * L * .32, .32, .22);
    } else if (kind === 'tank' || kind === 'tank_ww2' || kind === 'tank_mod' || kind === 'apc' || kind === 'humvee') {
      const bm = surf(kind === 'tank_mod' ? 'car3' : kind === 'humvee' ? 'car3' : 'olive');
      if (kind === 'humvee') { W = 2.2; L = 4.6; H = 1.8; b(0, .4, 0, W, .9, L, bm); b(0, 1.3, .4, W * .9, .5, L * .45, bm); for (const s of [-1, 1]) for (const q of [-1, 1]) wheel(s * 1, q * 1.5, .45, .35); }
      else if (kind === 'apc') { W = 2.9; L = 6.5; H = 2.2; b(0, .5, 0, W, 1.5, L, bm); b(0, 2, -.5, 1.2, .5, 1.6, bm); for (const s of [-1, 1]) for (let q = -1; q <= 1; q++) wheel(s * 1.35, q * 2.1, .55, .4); }
      else {
        W = 3.3; L = kind === 'tank_ww2' ? 5.9 : 7.5; H = 2.5;
        b(0, .35, 0, W * .7, 1.2, L, bm); for (const s of [-1, 1]) b(s * W * .38, .1, 0, .6, 1, L, surf('darkmetal'));
        const t = b(0, 1.55, kind === 'tank_ww2' ? .3 : .6, W * .6, .75, L * .38, bm);
        const gun = new THREE.Mesh(gCyl(.08, .1, kind === 'tank_ww2' ? 2.6 : 4.5, 10), surf('darkmetal')); gun.position.set(0, 1.9, kind === 'tank_ww2' ? -2 : -2.8); g.add(gun);
      }
    } else if (kind === 'cart') {
      W = 1.6; L = 2.8; H = 1.2; b(0, .5, 0, W, .15, L, surf('planks')); for (const s of [-1, 1]) b(s * .75, .65, 0, .08, .5, L, surf('planks'));
      for (const s of [-1, 1]) { const o = new THREE.Mesh(G.geo.gCylX(.6, .6, .08, 12), surf('bark')); o.position.set(s * .9, .6, .3); g.add(o); }
    } else if (kind === 'forklift') { W = 1.3; L = 2.8; H = 2.2; b(0, .3, 0, W, 1, L * .7, surf('yellow')); b(0, 0, -1.5, 1, 2.3, .15, surf('darkmetal')); b(0, 1.3, .4, W, .1, 1.2, surf('darkmetal')); for (const s of [-1, 1]) for (const q of [-1, 1]) wheel(s * .6, q * .7, .3, .2); }
    const c = Math.abs(Math.cos(ry)), s2 = Math.abs(Math.sin(ry));
    const hw = (W * c + L * s2) / 2, hd = (W * s2 + L * c) / 2;
    this.addCol(V3(x - hw, 0, z - hd), V3(x + hw, H, z + hd), 'metal');
  }
  container(x, z, ry = 0, color = 'container_r', y = 0) {
    const w = 2.44, h = 2.59, d = 6.06;
    const sw = Math.abs(Math.sin(ry)) > .7;
    const mesh = new THREE.Mesh(gBox(w, h, d), surf(color, 1)); mesh.position.set(x, y + h / 2, z); mesh.rotation.y = ry; mesh.castShadow = mesh.receiveShadow = true; this.static.add(mesh);
    const cw = sw ? d : w, cd = sw ? w : d;
    this.addCol(V3(x - cw / 2, y, z - cd / 2), V3(x + cw / 2, y + h, z + cd / 2), 'metal', { pen: 2 });
  }
  barrier(x, z, len = 3, axis = 'x') { // jersey barrier
    const pts = [[-.3, 0], [.3, 0], [.15, .25], [.1, .81], [-.1, .81], [-.15, .25]];
    const n = Math.round(len / 3);
    for (let i = 0; i < n; i++) {
      const t = -len / 2 + (i + .5) * len / n;
      const m = new THREE.Mesh(gProf(pts.map(p => [p[0], p[1]]), 2.9, .02), surf('concrete', 1));
      m.rotation.y = axis === 'x' ? PI / 2 : 0; m.position.set(x + (axis === 'x' ? t : 0), 0, z + (axis === 'x' ? 0 : t)); m.castShadow = m.receiveShadow = true; this.static.add(m);
    }
    const hw = axis === 'x' ? len / 2 : .3, hd = axis === 'x' ? .3 : len / 2;
    this.addCol(V3(x - hw, 0, z - hd), V3(x + hw, .81, z + hd), 'concrete', { pen: 9 });
  }
  hedgehog(x, z) {
    const m = surf('rust');
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(gBox(.15, 2, .15), m); b.position.set(x, .6, z); b.rotation.set(i === 0 ? .9 : 0, i * PI / 3, i === 1 ? .9 : i === 2 ? -.9 : 0); b.castShadow = true; this.static.add(b); }
    this.addCol(V3(x - .6, 0, z - .6), V3(x + .6, 1.2, z + .6), 'metal', { see: true, pen: 1, soft: true });
  }
  tower(x, z, h = 6, m = 'planks') { // watch tower
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(x + sx * 1.2, 0, z + sz * 1.2, .2, h, .2, surf('bark'), 'wood');
    this.box(x, h, z, 3, .2, 3, surf(m, 1), 'wood');
    this.sandbagsRaw(x, z, h);
  }
  sandbagsRaw(x, z, y) { const m = surf('sandbag', 1); for (const [dx, dz, w, d] of [[0, -1.4, 3, .3], [0, 1.4, 3, .3], [-1.4, 0, .3, 3], [1.4, 0, .3, 3]]) this.box(x + dx, y + .2, z + dz, w, .7, d, m, 'sandbag'); }
  pole(x, z, h = 7) { const p = new THREE.Mesh(gCylY(.08, .12, h, 6), surf('bark')); p.position.set(x, h / 2, z); p.castShadow = true; this.static.add(p); this.addCol(V3(x - .12, 0, z - .12), V3(x + .12, h, z + .12), 'wood'); }
  border(h = 3, kind = 'invisible') { const B = this.bounds + .5; for (const [x, z, w, d] of [[0, -B, B * 2 + 2, 1], [0, B, B * 2 + 2, 1], [-B, 0, 1, B * 2 + 2], [B, 0, 1, B * 2 + 2]]) this.addCol(V3(x - w / 2, 0, z - d / 2), V3(x + w / 2, 30, z + d / 2), 'dirt', { noShoot: true }); }
  // decorate the map edge
  ring(fn, n = 40, r) { r = r || this.bounds + 3; for (let i = 0; i < n; i++) { const a = i / n * PI * 2; fn(Math.cos(a) * r * (1 + Math.random() * .15), Math.sin(a) * r * (1 + Math.random() * .15), a); } }
  edgeRow(fn, step = 6) { const B = this.bounds + 2; for (let t = -B; t <= B; t += step) { fn(t, -B - 1); fn(t, B + 1); fn(-B - 1, t); fn(B + 1, t); } }

  // ---------------------------------------------------------- queries
  groundAt(x, z, fromY = 100, r = 0) {
    let g = this.baseHeight || 0;
    for (const c of this.colliders) {
      if (c.noMove || c.soft) continue;
      if (x + r < c.min.x || x - r > c.max.x || z + r < c.min.z || z - r > c.max.z) continue;
      if (c.max.y <= fromY + .02 && c.max.y > g) g = c.max.y;
    }
    return g;
  }
  // circle-vs-box movement; pos = feet. returns true if moved freely
  move(pos, dx, dz, r, h, step = .45) {
    const feet = pos.y;
    const blocks = c => !c.noMove && c.max.y > feet + step && c.min.y < feet + h;
    const resolve = () => {
      for (const c of this.colliders) {
        if (!blocks(c)) continue;
        const cx = Math.max(c.min.x, Math.min(pos.x, c.max.x)), cz = Math.max(c.min.z, Math.min(pos.z, c.max.z));
        let ddx = pos.x - cx, ddz = pos.z - cz; const d2 = ddx * ddx + ddz * ddz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) { const d = Math.sqrt(d2), p = r - d; pos.x += ddx / d * p; pos.z += ddz / d * p; }
        else { // inside: push along smallest axis
          const px1 = pos.x - c.min.x, px2 = c.max.x - pos.x, pz1 = pos.z - c.min.z, pz2 = c.max.z - pos.z, m = Math.min(px1, px2, pz1, pz2);
          if (m === px1) pos.x = c.min.x - r; else if (m === px2) pos.x = c.max.x + r; else if (m === pz1) pos.z = c.min.z - r; else pos.z = c.max.z + r;
        }
      }
    };
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (r * .5)));
    for (let i = 0; i < n; i++) { pos.x += dx / n; pos.z += dz / n; resolve(); }
  }
  slowAt(p) { for (const z of this.zones) if (p.x > z.min.x && p.x < z.max.x && p.z > z.min.z && p.z < z.max.z && p.y < z.max.y) return z.slow; return 1; }
  // ray vs all colliders (+ ground). returns nearest hit {t, p, n, c}
  raycast(ro, rd, maxT, o = {}) {
    let best = null, bt = maxT;
    const inv = V3(1 / rd.x, 1 / rd.y, 1 / rd.z);
    for (const c of this.colliders) {
      if (o.skip && o.skip(c)) continue;
      if (c.noShoot && !o.all) continue;
      let t1 = (c.min.x - ro.x) * inv.x, t2 = (c.max.x - ro.x) * inv.x;
      let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2), ax = 0;
      t1 = (c.min.y - ro.y) * inv.y; t2 = (c.max.y - ro.y) * inv.y;
      let a = Math.min(t1, t2), b = Math.max(t1, t2);
      if (a > tmin) { tmin = a; ax = 1; } tmax = Math.min(tmax, b);
      t1 = (c.min.z - ro.z) * inv.z; t2 = (c.max.z - ro.z) * inv.z;
      a = Math.min(t1, t2); b = Math.max(t1, t2);
      if (a > tmin) { tmin = a; ax = 2; } tmax = Math.min(tmax, b);
      if (tmax < Math.max(0, tmin) || tmin > bt) continue;
      if (tmin < 0) continue; // origin inside
      bt = tmin; best = { t: tmin, c, ax };
    }
    // ground plane
    if (rd.y < 0) { const tg = (this.baseHeight - ro.y) / rd.y; if (tg > 0 && tg < bt) { bt = tg; best = { t: tg, c: null, ax: 1, ground: true }; } }
    if (!best) return null;
    const p = ro.clone().addScaledVector(rd, best.t);
    const n = V3(0, 0, 0); n.setComponent(best.ax, -Math.sign(rd.getComponent(best.ax)) || 1);
    best.p = p; best.n = n; best.mat = best.c ? best.c.mat : this.groundMat;
    return best;
  }
  los(a, b, seeThroughSoft = false) {
    const d = b.clone().sub(a), L = d.length(); d.divideScalar(L);
    const h = this.raycast(a, d, L, { skip: c => (c.see) || (seeThroughSoft && c.soft) });
    return !h;
  }

  // ---------------------------------------------------------- nav grid + A*
  buildNav() {
    const B = this.bounds, cs = 1, N = Math.ceil(B * 2 / cs);
    this.nav = { N, cs, B, grid: new Uint8Array(N * N) };
    const r = .4;
    for (const c of this.colliders) {
      if (c.noMove || c.max.y < .5) continue;
      const i0 = Math.max(0, Math.floor((c.min.x - r + B) / cs)), i1 = Math.min(N - 1, Math.floor((c.max.x + r + B) / cs));
      const j0 = Math.max(0, Math.floor((c.min.z - r + B) / cs)), j1 = Math.min(N - 1, Math.floor((c.max.z + r + B) / cs));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.nav.grid[j * N + i] = 1;
    }
    // hotspots: random free cells
    const R = G.rng(77); this.hot = [];
    for (let k = 0; k < 400 && this.hot.length < 40; k++) { const i = Math.floor(R() * N), j = Math.floor(R() * N); if (!this.nav.grid[j * N + i] && Math.abs(-B + (j + .5) * cs) < B - 4) this.hot.push(V3(-B + (i + .5) * cs, 0, -B + (j + .5) * cs)); }
  }
  cell(p) { const { N, cs, B } = this.nav; return [Math.max(0, Math.min(N - 1, Math.floor((p.x + B) / cs))), Math.max(0, Math.min(N - 1, Math.floor((p.z + B) / cs)))]; }
  free(i, j) { const { N, grid } = this.nav; return i >= 0 && j >= 0 && i < N && j < N && !grid[j * N + i]; }
  nearestFree(i, j) { if (this.free(i, j)) return [i, j]; for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (this.free(i + di, j + dj)) return [i + di, j + dj]; return [i, j]; }
  findPath(from, to) {
    const { N, cs, B } = this.nav;
    let [si, sj] = this.nearestFree(...this.cell(from)), [ti, tj] = this.nearestFree(...this.cell(to));
    const start = sj * N + si, goal = tj * N + ti;
    const gS = new Float32Array(N * N).fill(1e9), came = new Int32Array(N * N).fill(-1), closed = new Uint8Array(N * N);
    const open = [start]; gS[start] = 0; const fS = new Float32Array(N * N).fill(1e9); fS[start] = Math.hypot(ti - si, tj - sj);
    let iter = 0;
    while (open.length && iter++ < 6000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (fS[open[k]] < fS[open[bi]]) bi = k;
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (cur === goal) break;
      closed[cur] = 1;
      const ci = cur % N, cj = (cur / N) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const ni = ci + di, nj = cj + dj;
        if (!this.free(ni, nj)) continue;
        if (di && dj && (!this.free(ci + di, cj) || !this.free(ci, cj + dj))) continue;
        const nk = nj * N + ni; if (closed[nk]) continue;
        const g2 = gS[cur] + (di && dj ? 1.414 : 1);
        if (g2 < gS[nk]) { gS[nk] = g2; came[nk] = cur; fS[nk] = g2 + Math.hypot(ti - ni, tj - nj); if (!open.includes(nk)) open.push(nk); }
      }
    }
    if (came[goal] < 0 && goal !== start) return [to.clone()];
    const path = []; let k = goal;
    while (k !== start && k >= 0) { path.push(V3(-B + (k % N + .5) * cs, 0, -B + (((k / N) | 0) + .5) * cs)); k = came[k]; }
    path.reverse();
    // string pulling
    const out = []; let anchor = from.clone();
    for (let i = 0; i < path.length; i++) {
      const nxt = path[i + 1];
      if (!nxt || !this.walkLine(anchor, nxt)) { out.push(path[i]); anchor = path[i]; }
    }
    return out.length ? out : [to.clone()];
  }
  walkLine(a, b) { const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / .5); for (let s = 1; s <= n; s++) { const t = s / n; const [i, j] = this.cell(V3(a.x + (b.x - a.x) * t, 0, a.z + (b.z - a.z) * t)); if (!this.free(i, j)) return false; } return true; }
}
G.World = World;

// bullet resistance: minimum calibre penetration class needed to pass through
const PENRES = { foliage: 0, paper: 0, glass: 0, wood: 2, planks: 2, sandbag: 5, dirt: 9, mud: 9, stone: 5, brick: 5, concrete: 6, metal: 4, steel: 9, snow: 3, sand: 9, gel: 0, flesh: 0 };
G.PENRES = PENRES;

// ============================================================ LIGHTING PRESETS

const ENV = {
  overcast: { sky: ['#6d737a', '#9aa0a2', '#6b6558'], fog: ['#8d9090', 25, 140], sun: [.3, .7, .4, '#d9d6cf', 1.1], hemi: ['#b8bcc0', '#4d4538', .75], exp: 1.0 },
  sunny: { sky: ['#3f7fc4', '#bcd6ea', '#8a9a78'], fog: ['#bfd2de', 60, 260], sun: [.5, .9, .3, '#fff1d8', 2.8], hemi: ['#cfe3f2', '#5a5236', .65], exp: 1.05 },
  winter: { sky: ['#7e8894', '#c5ccd4', '#c8ccd0'], fog: ['#c3c8cf', 20, 120], sun: [-.4, .5, .6, '#dfe6f0', 1.0], hemi: ['#d8e0ea', '#9ea4ab', .9], exp: 1.0 },
  jungle: { sky: ['#6f8f8a', '#a9bfb0', '#4e5a3a'], fog: ['#8a9d88', 12, 90], sun: [.4, .9, -.2, '#fff3cc', 1.8], hemi: ['#c8dac2', '#2f3a22', .7], exp: 1.0 },
  desert: { sky: ['#4a86c8', '#e6dcc4', '#c9b183'], fog: ['#e2d6bc', 60, 240], sun: [.6, 1, .2, '#fff0d4', 3.2], hemi: ['#e6eef5', '#8d7650', .7], exp: 1.0 },
  dusk: { sky: ['#2b3350', '#c88a5a', '#4d4540'], fog: ['#7a6a60', 30, 170], sun: [-.9, .25, .3, '#ffb070', 1.8], hemi: ['#8a8aa8', '#403830', .7], exp: 1.05 },
  night: { sky: ['#0a1224', '#243452', '#2a3240'], fog: ['#1e2838', 18, 110], sun: [.3, .8, .5, '#9fb6e0', .7], hemi: ['#5b6f95', '#2a2f38', .55], exp: 1.2 },
  grey: { sky: ['#5e666e', '#8c9296', '#5c5a54'], fog: ['#7d8286', 30, 160], sun: [.4, .6, .5, '#dcdcd6', 1.3], hemi: ['#aeb4b8', '#4a4640', .75], exp: 1.0 },
  range: { sky: ['#3d7cc2', '#c4dbeb', '#98a680'], fog: ['#c5d6e0', 300, 2600], sun: [.35, .9, .45, '#fff3dc', 2.7], hemi: ['#cfe3f2', '#5d5a3a', .7], exp: 1.05 },
};
G.ENV = ENV;

// ----------------------------------------------------------------- RANGE
G.RANGE_MAP = { id: 'range', era: null, name: 'Long Range', env: 'range', ground: 'grass', weather: null, amb: null, reverb: 'range',
  build(W) {
    W.bounds = 1200;
    // firing line: concrete pad + roof + benches
    W.box(0, -.02, 1, 34, .04, 8, surf('concrete', 4), 'concrete', { noCol: true });
    for (const x of [-17, -11, -5.5, 5.5, 11, 17]) for (const z of [-3.5, 5]) W.box(x, 0, z, .22, 3.3, .22, surf('darkmetal'), 'metal');
    W.box(0, 3.3, .75, 36, .15, 9.5, surf('corrugated', 6), 'metal');
    for (let x = -12; x <= 12; x += 6) { // shooting benches: top + legs + sandbag rest
      W.box(x, .8, -1.1, 1.5, .06, .75, surf('planks', 1), 'wood', { noMove: true });
      for (const sx of [-.65, .65]) for (const sz of [-1.4, -.8]) W.box(x + sx, 0, sz, .07, .8, .07, surf('planks', 1), 'wood', { noCol: true });
      W.box(x, .86, -1.3, .45, .14, .25, surf('sandbag', 1), 'sandbag', { noMove: true });
      if (x !== 0) W.box(x, 0, .6, .5, .45, .4, surf('crate'), 'wood');
    }
    // side berms for the first 100 m
    for (const s of [-1, 1]) W.box(s * 22, 0, -52, 4, 3.5, 104, surf('dirt', 12), 'dirt');
    // back berm
    W.box(0, 0, -1060, 200, 14, 20, surf('dirt', 20), 'dirt');
    // distance markers
    for (const d of G.RANGE_DISTS) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
      x.fillStyle = '#e9e4d4'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#1b1b1b'; x.font = 'bold 72px monospace'; x.textAlign = 'center'; x.fillText(d + 'm', 128, 90);
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
      const s = d > 300 ? d / 150 : 1;
      for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4 * s, .7 * s), new THREE.MeshBasicMaterial({ map: t })); m.position.set(sx * (d > 100 ? 12 + d * .02 : 19), 2.2 * s, -d); W.static.add(m); W.box(sx * (d > 100 ? 12 + d * .02 : 19), 0, -d - .05, .1, 1.9 * s, .1, surf('bark'), 'wood', { noCol: true }); }
    }
    // wind flags every 100 m
    W.flags = [];
    for (let d = 50; d <= 1000; d += 100) {
      const x = d > 100 ? -10 - d * .02 : -18;
      W.box(x, 0, -d, .06, 5, .06, surf('darkmetal'), 'metal', { noCol: true });
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .6, 6, 1), G.mat({ color: '#d7432e', side: THREE.DoubleSide, roughness: .8 }));
      f.position.set(x, 4.6, -d); W.group.add(f); W.flags.push(f);
    }
    // trees in the distance
    const R = G.rng(5);
    for (let i = 0; i < 60; i++) { const s = R() < .5 ? -1 : 1; W.tree(s * (30 + R() * 80), -R() * 1000, 8 + R() * 6, R() < .4 ? 'pine' : 'oak'); }
    W.spawns[0].push(V3(0, 0, 2)); W.spawns[1].push(V3(0, 0, -20));
  } };
})();
