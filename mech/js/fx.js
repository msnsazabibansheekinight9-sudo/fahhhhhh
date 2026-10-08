// Ironwalkers — visual effects: GPU-ish particles, beams, instanced projectiles, flashes, lightning, decals.
(function () {
'use strict';
const MW = window.MW;
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), M4 = new THREE.Matrix4(), S3 = new THREE.Vector3();

const VS = `attribute float size; attribute float alpha; attribute vec3 pcolor; varying float vA; varying vec3 vC; uniform float scale;
void main(){ vA = alpha; vC = pcolor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / max(0.1,-mv.z); gl_Position = projectionMatrix * mv; }`;
const FS = `uniform sampler2D map; varying float vA; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * t.rgb, t.a * vA); if (gl_FragColor.a < 0.004) discard; }`;

function makeSystem(n, tex, additive) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('pcolor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { map: { value: tex }, scale: { value: 600 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = additive ? 3 : 2;
  const P = { pts, n, pos, col, size, alpha, g, live: 0,
    px: new Float32Array(n * 3), v: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n), s0: new Float32Array(n), s1: new Float32Array(n),
    c0: new Float32Array(n * 3), c1: new Float32Array(n * 3), a0: new Float32Array(n), grav: new Float32Array(n), drag: new Float32Array(n), cursor: 0 };
  return P;
}
function spawn(P, x, y, z, vx, vy, vz, life, s0, s1, c0, c1, a0, grav, drag) {
  // find a free slot (ring buffer)
  let i = P.cursor; P.cursor = (P.cursor + 1) % P.n;
  P.px[i * 3] = x; P.px[i * 3 + 1] = y; P.px[i * 3 + 2] = z; P.v[i * 3] = vx; P.v[i * 3 + 1] = vy; P.v[i * 3 + 2] = vz;
  P.life[i] = life; P.max[i] = life; P.s0[i] = s0; P.s1[i] = s1; P.a0[i] = a0; P.grav[i] = grav || 0; P.drag[i] = drag || 0;
  P.c0[i * 3] = c0.r; P.c0[i * 3 + 1] = c0.g; P.c0[i * 3 + 2] = c0.b; P.c1[i * 3] = c1.r; P.c1[i * 3 + 1] = c1.g; P.c1[i * 3 + 2] = c1.b;
}
function stepSystem(P, dt) {
  for (let i = 0; i < P.n; i++) {
    if (P.life[i] <= 0) { if (P.alpha[i] !== 0) { P.alpha[i] = 0; } continue; }
    P.life[i] -= dt; const t = 1 - Math.max(0, P.life[i]) / P.max[i];
    const d = Math.max(0, 1 - P.drag[i] * dt);
    P.v[i * 3] *= d; P.v[i * 3 + 1] = P.v[i * 3 + 1] * d - P.grav[i] * dt; P.v[i * 3 + 2] *= d;
    P.px[i * 3] += P.v[i * 3] * dt; P.px[i * 3 + 1] += P.v[i * 3 + 1] * dt; P.px[i * 3 + 2] += P.v[i * 3 + 2] * dt;
    P.pos[i * 3] = P.px[i * 3]; P.pos[i * 3 + 1] = P.px[i * 3 + 1]; P.pos[i * 3 + 2] = P.px[i * 3 + 2];
    P.size[i] = P.s0[i] + (P.s1[i] - P.s0[i]) * t;
    for (let k = 0; k < 3; k++) P.col[i * 3 + k] = P.c0[i * 3 + k] + (P.c1[i * 3 + k] - P.c0[i * 3 + k]) * t;
    P.alpha[i] = P.a0[i] * (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9);
    if (P.life[i] <= 0) P.alpha[i] = 0;
  }
  P.g.attributes.position.needsUpdate = true; P.g.attributes.pcolor.needsUpdate = true; P.g.attributes.size.needsUpdate = true; P.g.attributes.alpha.needsUpdate = true;
}

const C = (h) => new THREE.Color(h);
const COL = { fire: C('#ffb347'), fire2: C('#ff4a12'), smoke: C('#3a3836'), smoke2: C('#8a8682'), white: C('#ffffff'), spark: C('#ffd27a'), dust: C('#9b8b72'), dark: C('#151312') };

const FX = MW.fx = {
  init(scene) {
    if (this.root && this.root.parent) this.root.parent.remove(this.root);
    this.scene = scene; const R = this.root = new THREE.Group(); scene.add(R);
    this.add = makeSystem(3500, MW.tex.sprite('soft'), true);
    this.norm = makeSystem(2500, MW.tex.sprite('smoke'), false);
    R.add(this.add.pts); R.add(this.norm.pts);
    // beams
    this.beams = [];
    const bg = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true); bg.translate(0, 0.5, 0);
    for (let i = 0; i < 48; i++) {
      const outer = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
      const inner = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      outer.add(inner); inner.scale.set(0.35, 1, 0.35); outer.visible = false; outer.frustumCulled = false; R.add(outer);
      this.beams.push({ mesh: outer, inner, life: 0, max: 0, w: 0.2 });
    }
    // instanced projectiles
    const mkInst = (geo, n, additive) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !additive, toneMapped: false }), n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false; m.setColorAt(0, new THREE.Color()); R.add(m); return m; };
    const tg = new THREE.BoxGeometry(1, 1, 1);
    this.tracers = mkInst(tg, 2000, true);
    const mg = new THREE.CylinderGeometry(0.12, 0.16, 1.1, 6); mg.rotateX(Math.PI / 2);
    this.missiles = new THREE.InstancedMesh(mg, new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.5, roughness: 0.4 }), 800); this.missiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.missiles.count = 0; this.missiles.frustumCulled = false; R.add(this.missiles);
    this.orbs = mkInst(new THREE.SphereGeometry(1, 10, 8), 600, true);
    // flash lights pool (fixed count to avoid shader recompiles)
    this.lights = [];
    for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffaa55, 0, 40, 2); l.position.set(0, -999, 0); R.add(l); this.lights.push({ l, life: 0, max: 1, i0: 0 }); }
    // lightning
    this.bolts = [];
    for (let i = 0; i < 16; i++) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x9fd7ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      l.visible = false; l.frustumCulled = false; R.add(l); this.bolts.push({ l, life: 0, a: null, b: null, col: null });
    }
    // shockwave rings
    this.rings = [];
    for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: MW.tex.sprite('ring'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffd0a0 })); m.rotation.x = -Math.PI / 2; m.visible = false; R.add(m); this.rings.push({ m, life: 0, max: 0, r: 0 }); }
    // scorch decals
    this.decals = []; this.decalI = 0;
    const dm = new THREE.MeshBasicMaterial({ map: MW.tex.sprite('soft'), color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dm); m.rotation.x = -Math.PI / 2; m.visible = false; R.add(m); this.decals.push(m); }
    // world-space sprites for muzzle flashes
    this.flashes = [];
    for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: MW.tex.sprite('flare'), color: 0xffcc88, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.visible = false; R.add(s); this.flashes.push({ s, life: 0, max: 0, sc: 1 }); }
    this.flashI = 0;
    this.shake = 0;
  },
  dispose() { this.scene = null; },

  // ---- primitives ----
  p(add, x, y, z, vx, vy, vz, life, s0, s1, c0, c1, a0, grav, drag) { spawn(add ? this.add : this.norm, x, y, z, vx, vy, vz, life, s0, s1, c0, c1, a0, grav, drag); },
  flash(pos, col, size, life) {
    const f = this.flashes[this.flashI = (this.flashI + 1) % this.flashes.length];
    f.s.position.copy(pos); f.s.material.color.set(col); f.sc = size; f.s.scale.setScalar(size); f.life = f.max = life || 0.06; f.s.visible = true;
  },
  light(pos, col, intensity, dist, life) {
    let best = this.lights[0]; for (const L of this.lights) if (L.life < best.life) best = L;
    best.l.position.copy(pos); best.l.color.set(col); best.l.distance = dist; best.i0 = intensity; best.life = best.max = life; best.l.intensity = intensity;
  },
  beam(a, b, col, width, life) {
    let bm = this.beams.find(x => x.life <= 0) || this.beams[0];
    bm.life = bm.max = life; bm.w = width; bm.mesh.material.color.set(col); bm.mesh.visible = true;
    this.setBeam(bm, a, b); return bm;
  },
  setBeam(bm, a, b) {
    V.subVectors(b, a); const len = V.length() || 0.01;
    bm.mesh.position.copy(a); bm.mesh.quaternion.setFromUnitVectors(UP, V.multiplyScalar(1 / len)); bm.mesh.scale.set(bm.w, len, bm.w);
  },
  bolt(a, b, col, life, jag) {
    const B = this.bolts.find(x => x.life <= 0) || this.bolts[0];
    B.life = life; B.l.visible = true; B.l.material.color.set(col);
    const arr = B.l.geometry.attributes.position.array; const n = 40; jag = jag || 2;
    for (let i = 0; i < n; i++) { const t = i / (n - 1); const j = (i === 0 || i === n - 1) ? 0 : jag; arr[i * 3] = a.x + (b.x - a.x) * t + (Math.random() - 0.5) * j; arr[i * 3 + 1] = a.y + (b.y - a.y) * t + (Math.random() - 0.5) * j; arr[i * 3 + 2] = a.z + (b.z - a.z) * t + (Math.random() - 0.5) * j; }
    B.l.geometry.attributes.position.needsUpdate = true;
  },
  ring(pos, r, col, life) { const R = this.rings.find(x => x.life <= 0) || this.rings[0]; R.m.position.copy(pos); R.m.position.y += 0.3; R.m.material.color.set(col || 0xffd0a0); R.r = r; R.life = R.max = life || 0.5; R.m.visible = true; },
  decal(x, y, z, r) { const d = this.decals[this.decalI = (this.decalI + 1) % this.decals.length]; d.position.set(x, y + 0.08, z); d.scale.setScalar(r); d.rotation.z = Math.random() * 6; d.visible = true; },

  // ---- composite effects ----
  muzzle(pos, dir, col, size) {
    this.flash(pos, col, size * 2.4, 0.05);
    for (let i = 0; i < 4; i++) this.p(true, pos.x, pos.y, pos.z, dir.x * 20 + (Math.random() - 0.5) * 6, dir.y * 20 + (Math.random() - 0.5) * 6, dir.z * 20 + (Math.random() - 0.5) * 6, 0.12, size * 1.2, size * 0.2, COL.white, C(col), 1, 0, 6);
    if (size > 0.5) for (let i = 0; i < 2; i++) this.p(false, pos.x, pos.y, pos.z, dir.x * 6 + (Math.random() - 0.5) * 2, dir.y * 6 + 1, dir.z * 6 + (Math.random() - 0.5) * 2, 0.8, size * 1.5, size * 4, COL.smoke2, COL.smoke, 0.35, -1, 2);
  },
  impact(pos, kind, col, size) {
    size = size || 1;
    if (kind === 'metal') {
      for (let i = 0; i < 6 * size; i++) this.p(true, pos.x, pos.y, pos.z, (Math.random() - 0.5) * 30, Math.random() * 18, (Math.random() - 0.5) * 30, 0.35 + Math.random() * 0.3, 0.35, 0.1, COL.spark, COL.fire2, 1, 30, 1);
      this.flash(pos, col || '#ffd27a', 1.6 * size, 0.06);
      this.p(false, pos.x, pos.y, pos.z, 0, 2, 0, 1, size, size * 3.5, COL.smoke2, COL.smoke, 0.4, -1, 1);
    } else if (kind === 'ground') {
      for (let i = 0; i < 4 * size; i++) this.p(false, pos.x, pos.y, pos.z, (Math.random() - 0.5) * 8, 4 + Math.random() * 10, (Math.random() - 0.5) * 8, 0.9 + Math.random() * 0.6, size * 0.8, size * 3, COL.dust, COL.dust, 0.55, 12, 1);
      this.flash(pos, col || '#ffd27a', size, 0.04);
    } else if (kind === 'energy') {
      for (let i = 0; i < 8 * size; i++) this.p(true, pos.x, pos.y, pos.z, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, 0.3, 0.5 * size, 0.05, COL.white, C(col || '#ff4040'), 1, 0, 3);
      this.flash(pos, col || '#ff4040', 2.2 * size, 0.08);
    }
  },
  explosion(pos, size, opts) {
    opts = opts || {};
    const s = size;
    this.flash(pos, '#ffd090', s * 6, 0.15);
    this.light(pos, '#ff9a40', 6 * s, 25 * s, 0.4 + s * 0.1);
    for (let i = 0; i < 18 * s; i++) { const a = Math.random() * 6.28, e = Math.random() * 1.2, sp = (6 + Math.random() * 10) * Math.sqrt(s); this.p(true, pos.x, pos.y, pos.z, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 2, Math.sin(a) * Math.cos(e) * sp, 0.5 + Math.random() * 0.5, s * 2.2, s * 0.6, COL.fire, COL.fire2, 1, -2, 3); }
    for (let i = 0; i < 12 * s; i++) { const a = Math.random() * 6.28, sp = (2 + Math.random() * 5) * Math.sqrt(s); this.p(false, pos.x, pos.y, pos.z, Math.cos(a) * sp, 2 + Math.random() * 5, Math.sin(a) * sp, 2 + Math.random() * 2.5, s * 2, s * 7, COL.dark, COL.smoke2, 0.6, -1.5, 1.2); }
    for (let i = 0; i < 14 * s; i++) this.p(true, pos.x, pos.y, pos.z, (Math.random() - 0.5) * 40 * Math.sqrt(s), Math.random() * 30, (Math.random() - 0.5) * 40 * Math.sqrt(s), 0.8 + Math.random() * 0.8, 0.5, 0.1, COL.spark, COL.fire2, 1, 25, 0.5);
    if (opts.ground !== false) { this.ring(pos, s * 10, '#ffc890', 0.5); this.decal(pos.x, opts.groundY != null ? opts.groundY : pos.y - 1, pos.z, s * 4); }
    this.addShake(pos, s * 0.6);
  },
  mechDeath(pos, size) {
    this.explosion(pos, size * 1.8);
    setTimeout(() => this.scene && this.explosion(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 2, (Math.random() - 0.5) * 4)), size * 1.1), 280);
    setTimeout(() => this.scene && this.explosion(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, -1, (Math.random() - 0.5) * 4)), size * 1.4), 650);
    this.ring(pos, size * 22, '#ffffff', 0.8);
    this.light(pos, '#ffffff', 14, 70, 0.6);
  },
  smoke(pos, k, dark) { this.p(false, pos.x + (Math.random() - 0.5), pos.y, pos.z + (Math.random() - 0.5), (Math.random() - 0.5) * 1.5, 3 + Math.random() * 2, (Math.random() - 0.5) * 1.5, 2.5, 1.2 * k, 5 * k, dark ? COL.dark : COL.smoke, COL.smoke2, dark ? 0.55 : 0.35, -0.6, 0.6); },
  fire(pos, k) { this.p(true, pos.x + (Math.random() - 0.5) * k, pos.y, pos.z + (Math.random() - 0.5) * k, (Math.random() - 0.5), 3 + Math.random() * 3, (Math.random() - 0.5), 0.5, 1.4 * k, 0.3, COL.fire, COL.fire2, 0.9, -2, 1); },
  sparks(pos, n) { for (let i = 0; i < n; i++) this.p(true, pos.x, pos.y, pos.z, (Math.random() - 0.5) * 14, Math.random() * 10, (Math.random() - 0.5) * 14, 0.5, 0.25, 0.05, COL.spark, COL.fire2, 1, 25, 0.5); },
  dust(pos, r, col) { const c = col ? C(col) : COL.dust; for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28; this.p(false, pos.x + Math.cos(a) * r * 0.5, pos.y + 0.3, pos.z + Math.sin(a) * r * 0.5, Math.cos(a) * r * 2.2, 0.8 + Math.random(), Math.sin(a) * r * 2.2, 1.4, r * 0.8, r * 2.5, c, c, 0.45, 0, 2.2); } },
  jetwash(pos, col) { this.p(true, pos.x, pos.y, pos.z, (Math.random() - 0.5) * 2, -10 - Math.random() * 6, (Math.random() - 0.5) * 2, 0.22, 1.2, 0.2, COL.white, C(col), 0.9, 0, 2); if (Math.random() < 0.3) this.p(false, pos.x, pos.y - 1, pos.z, (Math.random() - 0.5) * 3, -4, (Math.random() - 0.5) * 3, 1.2, 1, 4, COL.smoke2, COL.smoke2, 0.2, -1, 1); },
  trail(pos, col) { this.p(false, pos.x, pos.y, pos.z, (Math.random() - 0.5) * 0.6, 0.6, (Math.random() - 0.5) * 0.6, 1.1, 0.6, 2.2, COL.smoke2, COL.smoke2, 0.4, -0.5, 1); this.p(true, pos.x, pos.y, pos.z, 0, 0, 0, 0.08, 1.0, 0.3, COL.white, C(col || '#ffb347'), 1, 0, 0); },
  flame(pos, dir, range) { for (let i = 0; i < 3; i++) { const sp = range * 1.4 * (0.8 + Math.random() * 0.4); this.p(true, pos.x, pos.y, pos.z, dir.x * sp + (Math.random() - 0.5) * 6, dir.y * sp + (Math.random() - 0.5) * 6 + 2, dir.z * sp + (Math.random() - 0.5) * 6, 0.6, 0.6, 4.5, COL.fire, COL.fire2, 0.9, -3, 1.5); } },

  addShake(pos, amt) { if (!this.camPos) return; const d = this.camPos.distanceTo(pos); this.shake = Math.min(1.5, this.shake + amt * Math.max(0, 1 - d / 120)); },

  update(dt, camera) {
    this.camPos = camera.position;
    stepSystem(this.add, dt); stepSystem(this.norm, dt);
    const sc = window.innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360)) * 0.5;
    this.add.pts.material.uniforms.scale.value = sc; this.norm.pts.material.uniforms.scale.value = sc;
    for (const b of this.beams) if (b.life > 0) { b.life -= dt; const k = Math.max(0, b.life / b.max); b.mesh.material.opacity = 0.6 * Math.min(1, k * 3); b.inner.material.opacity = 0.95 * Math.min(1, k * 3); if (b.life <= 0) b.mesh.visible = false; }
    for (const L of this.lights) if (L.life > 0) { L.life -= dt; L.l.intensity = L.i0 * Math.max(0, L.life / L.max); if (L.life <= 0) L.l.intensity = 0; }
    for (const B of this.bolts) if (B.life > 0) { B.life -= dt; B.l.material.opacity = Math.random() * 0.6 + 0.4; if (B.life <= 0) B.l.visible = false; }
    for (const R of this.rings) if (R.life > 0) { R.life -= dt; const t = 1 - R.life / R.max; R.m.scale.setScalar(R.r * (0.2 + t)); R.m.material.opacity = 1 - t; if (R.life <= 0) R.m.visible = false; }
    for (const f of this.flashes) if (f.life > 0) { f.life -= dt; f.s.material.opacity = Math.max(0, f.life / f.max); f.s.scale.setScalar(f.sc * (0.7 + 0.3 * f.life / f.max)); if (f.life <= 0) f.s.visible = false; }
    this.shake = Math.max(0, this.shake - dt * 2.2);
  },
  // projectile rendering helpers (called by battle each frame)
  beginInstances() { this.tracers.count = 0; this.missiles.count = 0; this.orbs.count = 0; },
  tracer(pos, vel, len, w, col) {
    const m = this.tracers; if (m.count >= 2000) return; const i = m.count++;
    V.copy(vel).normalize(); Q.setFromUnitVectors(V2.set(0, 0, 1), V); S3.set(w, w, len); V2.copy(pos).addScaledVector(V, -len / 2);
    M4.compose(V2, Q, S3); m.setMatrixAt(i, M4); m.setColorAt(i, col);
  },
  missile(pos, vel) { const m = this.missiles; if (m.count >= 800) return; const i = m.count++; V.copy(vel).normalize(); Q.setFromUnitVectors(V2.set(0, 0, 1), V); S3.set(1, 1, 1); M4.compose(pos, Q, S3); m.setMatrixAt(i, M4); },
  orb(pos, r, col) { const m = this.orbs; if (m.count >= 600) return; const i = m.count++; Q.identity(); S3.set(r, r, r); M4.compose(pos, Q, S3); m.setMatrixAt(i, M4); m.setColorAt(i, col); },
  endInstances() { for (const m of [this.tracers, this.missiles, this.orbs]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } },
};

// ===================== audio =====================
const A = MW.audio = {
  ctx: null, master: null, ready: false, loops: {},
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.musicGain = c.createGain(); this.musicGain.connect(this.master);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; this.sfx.disconnect(); this.sfx.connect(comp); comp.connect(this.master);
    // noise buffer
    const len = c.sampleRate * 2; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.ready = true; this.setVolume();
  },
  setVolume() { if (!this.ready) return; const s = MW.profile.s; this.master.gain.value = s.volume; this.musicGain.gain.value = s.music * 0.5; },
  listener: null,
  // spatial gain & pan from a world position
  spatial(pos) {
    if (!pos || !this.listener) return { g: 1, pan: 0 };
    const L = this.listener; const dx = pos.x - L.pos.x, dy = pos.y - L.pos.y, dz = pos.z - L.pos.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const g = 1 / (1 + d / 28);
    const rx = L.right; const pan = MW.clamp((dx * rx.x + dz * rx.z) / Math.max(1, d), -1, 1);
    return { g, pan: pan * 0.8, d };
  },
  out(g, pan, dest) {
    const c = this.ctx; const gn = c.createGain(); gn.gain.value = g;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan || 0; gn.connect(p); p.connect(dest || this.sfx); } else gn.connect(dest || this.sfx);
    return gn;
  },
  noiseSrc(dur) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; s.loopStart = Math.random(); s.start(this.ctx.currentTime, Math.random()); s.stop(this.ctx.currentTime + dur + 0.05); return s; },
  env(gn, t, a, peak, dec) { gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(peak, t + a); gn.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); },
  // ---- sound library ----
  play(name, pos, vol) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime; const sp = this.spatial(pos); const v = (vol == null ? 1 : vol) * sp.g;
    if (v < 0.01) return;
    const o = this.out(v, sp.pan);
    const noise = (dur, f, q, type, peak, a) => { const n = this.noiseSrc(dur); const fl = c.createBiquadFilter(); fl.type = type || 'lowpass'; fl.frequency.value = f; fl.Q.value = q || 1; const g = c.createGain(); this.env(g, t, a || 0.005, peak, dur); n.connect(fl); fl.connect(g); g.connect(o); return { fl, g }; };
    const tone = (type, f0, f1, dur, peak, a) => { const os = c.createOscillator(); os.type = type; os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); const g = c.createGain(); this.env(g, t, a || 0.005, peak, dur); os.connect(g); g.connect(o); os.start(t); os.stop(t + dur + 0.1); return os; };
    switch (name) {
      case 'mg': noise(0.08, 2500, 1, 'bandpass', 0.5); tone('square', 180, 60, 0.06, 0.15); break;
      case 'ac': noise(0.25, 1400, 0.8, 'lowpass', 0.8); tone('sawtooth', 160, 40, 0.18, 0.35); break;
      case 'ac20': noise(0.6, 700, 0.7, 'lowpass', 1.0); tone('sawtooth', 90, 25, 0.5, 0.6); break;
      case 'rac': noise(0.05, 3000, 1, 'bandpass', 0.35); break;
      case 'gauss': tone('sine', 1800, 200, 0.25, 0.4); noise(0.4, 900, 1, 'lowpass', 0.8); tone('square', 60, 30, 0.3, 0.3); break;
      case 'charge': tone('sine', 200, 1600, 0.5, 0.15, 0.4); break;
      case 'laser': tone('sawtooth', 1400, 900, 0.5, 0.18); tone('sine', 700, 500, 0.5, 0.2); break;
      case 'llaser': tone('sawtooth', 900, 500, 1.0, 0.22); tone('sine', 300, 200, 1.0, 0.3); break;
      case 'plaser': tone('square', 1800, 600, 0.09, 0.15); break;
      case 'ppc': tone('sawtooth', 400, 80, 0.6, 0.4); noise(0.7, 3000, 2, 'bandpass', 0.5); break;
      case 'missile': noise(0.6, 1200, 0.6, 'bandpass', 0.35, 0.02); tone('sawtooth', 300, 120, 0.4, 0.08); break;
      case 'lrm': for (let i = 0; i < 4; i++) { const n = this.noiseSrc(0.4); const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 1000; const g = c.createGain(); this.env(g, t + i * 0.08, 0.01, 0.25, 0.35); n.connect(fl); fl.connect(g); g.connect(o); } break;
      case 'flamer': noise(0.3, 600, 0.5, 'lowpass', 0.25, 0.03); break;
      case 'plasma': tone('sine', 120, 400, 0.4, 0.4); tone('triangle', 800, 200, 0.4, 0.2); break;
      case 'rail': tone('sawtooth', 3000, 100, 0.35, 0.35); noise(0.5, 5000, 1, 'highpass', 0.4); break;
      case 'mortar': tone('sine', 120, 50, 0.3, 0.6); noise(0.35, 600, 1, 'lowpass', 0.6); break;
      case 'arc': noise(0.3, 4000, 4, 'bandpass', 0.6); tone('square', 90, 60, 0.3, 0.15); break;
      case 'explode': { const r = noise(1.2, 900, 0.7, 'lowpass', 1.0); r.fl.frequency.exponentialRampToValueAtTime(120, t + 1.2); tone('sine', 80, 25, 0.8, 0.9); break; }
      case 'bigexplode': { const r = noise(2.4, 1200, 0.6, 'lowpass', 1.0); r.fl.frequency.exponentialRampToValueAtTime(60, t + 2.4); tone('sine', 60, 18, 1.8, 1.0); noise(0.4, 4000, 1, 'highpass', 0.4); break; }
      case 'hit': noise(0.12, 2500, 3, 'bandpass', 0.6); tone('square', 900, 300, 0.08, 0.15); break;
      case 'hitme': noise(0.35, 500, 1, 'lowpass', 1.0); tone('triangle', 140, 60, 0.3, 0.6); noise(0.15, 3500, 4, 'bandpass', 0.35); break;
      case 'step': tone('sine', 70, 35, 0.25, 0.7); noise(0.15, 300, 1, 'lowpass', 0.4); tone('square', 420, 200, 0.05, 0.05); break;
      case 'land': tone('sine', 60, 25, 0.5, 1.0); noise(0.5, 400, 1, 'lowpass', 0.8); break;
      case 'alarm': tone('square', 880, 880, 0.15, 0.12); setTimeout(() => this.ready && this.play('alarm2'), 180); break;
      case 'alarm2': tone('square', 660, 660, 0.15, 0.12); break;
      case 'lock': tone('square', 1500, 1500, 0.06, 0.1); break;
      case 'locked': tone('square', 2000, 2000, 0.3, 0.1); break;
      case 'warn': tone('sawtooth', 500, 500, 0.12, 0.08); break;
      case 'ui': tone('sine', 900, 1300, 0.06, 0.12); break;
      case 'uiback': tone('sine', 900, 500, 0.08, 0.12); break;
      case 'buy': [660, 880, 1320].forEach((f, i) => { const os = c.createOscillator(); os.type = 'triangle'; os.frequency.value = f; const g = c.createGain(); this.env(g, t + i * 0.07, 0.005, 0.2, 0.25); os.connect(g); g.connect(o); os.start(t + i * 0.07); os.stop(t + i * 0.07 + 0.4); }); break;
      case 'deny': tone('square', 200, 120, 0.25, 0.15); break;
      case 'boxshake': noise(0.15, 300, 1, 'lowpass', 0.6); tone('sine', 100, 60, 0.1, 0.3); break;
      case 'boxopen': { noise(1.5, 2000, 0.5, 'highpass', 0.4, 0.3); [523, 659, 784, 1046].forEach((f, i) => { const os = c.createOscillator(); os.type = 'sine'; os.frequency.value = f; const g = c.createGain(); this.env(g, t + 0.3 + i * 0.06, 0.01, 0.2, 1.2); os.connect(g); g.connect(o); os.start(t + 0.3 + i * 0.06); os.stop(t + 2); }); break; }
      case 'reveal': tone('triangle', 600, 1200, 0.2, 0.2); break;
      case 'legendary': [523, 659, 784, 1046, 1318].forEach((f, i) => { const os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f; const fl = c.createBiquadFilter(); fl.frequency.value = 2500; const g = c.createGain(); this.env(g, t + i * 0.09, 0.01, 0.12, 1.4); os.connect(fl); fl.connect(g); g.connect(o); os.start(t + i * 0.09); os.stop(t + 2); }); break;
      case 'levelup': [440, 554, 659, 880].forEach((f, i) => { const os = c.createOscillator(); os.type = 'triangle'; os.frequency.value = f; const g = c.createGain(); this.env(g, t + i * 0.1, 0.01, 0.2, 0.5); os.connect(g); g.connect(o); os.start(t + i * 0.1); os.stop(t + i * 0.1 + 0.7); }); break;
      case 'capture': [523, 784].forEach((f, i) => { const os = c.createOscillator(); os.type = 'square'; os.frequency.value = f; const g = c.createGain(); this.env(g, t + i * 0.12, 0.01, 0.1, 0.3); os.connect(g); g.connect(o); os.start(t + i * 0.12); os.stop(t + i * 0.12 + 0.5); }); break;
      case 'thunder': { const r = noise(4, 300, 0.5, 'lowpass', 1.0, 0.05); r.fl.frequency.exponentialRampToValueAtTime(50, t + 4); break; }
      case 'shutdown': tone('sawtooth', 400, 40, 1.4, 0.4); break;
      case 'powerup': tone('sawtooth', 40, 400, 1.2, 0.3, 0.6); break;
      case 'ability': tone('sine', 300, 1200, 0.4, 0.3); tone('triangle', 600, 2400, 0.4, 0.1); break;
      case 'drop': { const r = noise(2.5, 2500, 0.5, 'lowpass', 0.6, 0.6); r.fl.frequency.exponentialRampToValueAtTime(200, t + 2.5); break; }
      case 'killconfirm': tone('triangle', 880, 880, 0.08, 0.2); setTimeout(() => this.ready && this.play('killconfirm2'), 90); break;
      case 'killconfirm2': tone('triangle', 1320, 1320, 0.15, 0.2); break;
      case 'logo': { [65, 98, 131].forEach(f => tone('sawtooth', f, f, 2.5, 0.12, 0.6)); const r = noise(2.6, 400, 1, 'lowpass', 0.5, 1.2); r.fl.frequency.exponentialRampToValueAtTime(3000, t + 2.2); tone('sine', 40, 30, 2.5, 0.6, 1.4); break; }
    }
  },
  // continuous loops (engine hum, beams, jets, flamers)
  loop(id, kind, on, gain, pos) {
    if (!this.ready) return;
    let L = this.loops[id];
    if (!L && on) {
      const c = this.ctx; const out = this.out(0, 0);
      let src, fl;
      if (kind === 'hum') { src = c.createOscillator(); src.type = 'sawtooth'; src.frequency.value = 42; fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 180; src.connect(fl); fl.connect(out); src.start(); }
      else if (kind === 'beam') { src = c.createOscillator(); src.type = 'sawtooth'; src.frequency.value = 220; fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 900; fl.Q.value = 3; src.connect(fl); fl.connect(out); src.start(); }
      else { src = c.createBufferSource(); src.buffer = this.noise; src.loop = true; fl = c.createBiquadFilter(); fl.type = kind === 'jet' ? 'bandpass' : 'lowpass'; fl.frequency.value = kind === 'jet' ? 700 : kind === 'wind' ? 400 : 500; fl.Q.value = 0.6; src.connect(fl); fl.connect(out); src.start(); }
      L = this.loops[id] = { src, fl, out, kind };
    }
    if (!L) return;
    const sp = pos ? this.spatial(pos) : { g: 1 };
    L.out.gain.setTargetAtTime(on ? (gain || 0.2) * sp.g : 0, this.ctx.currentTime, 0.05);
    return L;
  },
  stopLoops() { for (const k in this.loops) { try { this.loops[k].src.stop(); } catch (e) {} } this.loops = {}; },
  // ---- simple generative music ----
  music(kind) {
    if (!this.ready) return;
    if (this.mus && this.mus.kind === kind) return;
    if (this.mus) { this.mus.stop(); this.mus = null; }
    if (!kind) return;
    const c = this.ctx; const out = c.createGain(); out.gain.value = 0; out.connect(this.musicGain); out.gain.setTargetAtTime(1, c.currentTime, 1.5);
    const notes = kind === 'menu' ? [[36, 43, 48, 51], [32, 39, 44, 48], [34, 41, 46, 50], [31, 38, 43, 46]] : [[33, 40, 45, 48], [29, 36, 41, 45], [31, 38, 43, 46], [28, 35, 40, 43]];
    const mf = n => 440 * Math.pow(2, (n - 69) / 12);
    let step = 0; const bar = kind === 'menu' ? 4.8 : 3.2; let alive = true; const nodes = [];
    const delay = c.createDelay(); delay.delayTime.value = 0.375; const fb = c.createGain(); fb.gain.value = 0.35; delay.connect(fb); fb.connect(delay); delay.connect(out);
    const tick = () => {
      if (!alive) return;
      const t = c.currentTime + 0.05; const ch = notes[step % notes.length];
      ch.forEach((n, i) => { const os = c.createOscillator(); os.type = i === 0 ? 'sawtooth' : 'triangle'; os.frequency.value = mf(n + (i === 0 ? 0 : 12)); const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = i === 0 ? 300 : 1400; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(i === 0 ? 0.12 : 0.04, t + bar * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + bar * 1.05); os.connect(fl); fl.connect(g); g.connect(out); if (i === 3) g.connect(delay); os.start(t); os.stop(t + bar * 1.1); });
      // pulse / drums
      const beats = kind === 'menu' ? 8 : 16;
      for (let b = 0; b < beats; b++) {
        const bt = t + b * bar / beats;
        if (b % (kind === 'menu' ? 4 : 4) === 0) { const os = c.createOscillator(); os.frequency.setValueAtTime(110, bt); os.frequency.exponentialRampToValueAtTime(35, bt + 0.25); const g = c.createGain(); g.gain.setValueAtTime(0.35, bt); g.gain.exponentialRampToValueAtTime(0.0001, bt + 0.3); os.connect(g); g.connect(out); os.start(bt); os.stop(bt + 0.35); }
        if (kind !== 'menu' && b % 8 === 4) { const n = c.createBufferSource(); n.buffer = this.noise; const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 1800; const g = c.createGain(); g.gain.setValueAtTime(0.18, bt); g.gain.exponentialRampToValueAtTime(0.0001, bt + 0.18); n.connect(fl); fl.connect(g); g.connect(out); n.start(bt, Math.random()); n.stop(bt + 0.2); }
        if (b % 2 === 1) { const os = c.createOscillator(); os.type = 'square'; os.frequency.value = mf(ch[(b >> 1) % 4] + 24); const fl = c.createBiquadFilter(); fl.frequency.value = 900; const g = c.createGain(); g.gain.setValueAtTime(0.025, bt); g.gain.exponentialRampToValueAtTime(0.0001, bt + 0.12); os.connect(fl); fl.connect(g); g.connect(out); g.connect(delay); os.start(bt); os.stop(bt + 0.15); }
      }
      step++;
      this.musTimer = setTimeout(tick, bar * 1000);
    };
    tick();
    this.mus = { kind, stop: () => { alive = false; clearTimeout(this.musTimer); out.gain.setTargetAtTime(0, c.currentTime, 0.5); setTimeout(() => out.disconnect(), 2500); } };
  },
};
})();
