// ============================================================================
// Effects: GPU point-particle systems, muzzle flashes, tracers, decals,
// ejected casings, impact effects, explosions.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const FX = G.FX = {};
const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

// --------------------------------------------------------------- particles
const VS = `
attribute float size; attribute vec4 rgba; attribute float rot;
varying vec4 vC; varying float vR; varying float vFog;
uniform float scale; uniform float fogNear; uniform float fogFar;
void main(){ vC = rgba; vR = rot; vec4 mv = modelViewMatrix * vec4(position,1.0);
 gl_PointSize = size * scale / max(.05, -mv.z); gl_Position = projectionMatrix * mv;
 vFog = smoothstep(fogNear, fogFar, -mv.z); }`;
const FS = `
uniform sampler2D map; uniform vec3 fogColor; uniform float additive;
varying vec4 vC; varying float vR; varying float vFog;
void main(){ vec2 p = gl_PointCoord - .5; float c = cos(vR), s = sin(vR);
 p = vec2(c*p.x - s*p.y, s*p.x + c*p.y) + .5; vec4 t = texture2D(map, p);
 vec4 col = t * vC; if (col.a < .004) discard;
 if (additive < .5) col.rgb = mix(col.rgb, fogColor, vFog); else col.a *= (1.0 - vFog);
 gl_FragColor = col; }`;

class PSystem {
  constructor(scene, tex, max, additive) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.size = new Float32Array(max); this.rgba = new Float32Array(max * 4); this.rot = new Float32Array(max);
    this.p = []; // particle state
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rgba', new THREE.BufferAttribute(this.rgba, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 500 }, fogColor: { value: new THREE.Color('#888') }, fogNear: { value: 50 }, fogFar: { value: 400 }, additive: { value: additive ? 1 : 0 } },
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 3 : 2;
    scene.add(this.pts); this.geo = g;
  }
  spawn(o) {
    if (this.p.length >= this.max) this.p.shift();
    this.p.push({ x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: o.life || 1, age: 0, s0: o.s0 || .2, s1: o.s1 === undefined ? (o.s0 || .2) * 2 : o.s1,
      r: o.r ?? 1, g: o.g ?? 1, b: o.b ?? 1, a: o.a ?? 1, grav: o.grav || 0, drag: o.drag ?? 1, rot: o.rot ?? Math.random() * 6.28, vr: o.vr ?? (Math.random() - .5), fadeIn: o.fadeIn || 0, bounce: o.bounce || 0 });
  }
  update(dt) {
    const P = this.p; let w = 0;
    for (let i = 0; i < P.length; i++) {
      const q = P[i]; q.age += dt; if (q.age >= q.life) continue;
      q.vy -= q.grav * dt; const dr = Math.pow(q.drag, dt); q.vx *= dr; q.vy *= dr; q.vz *= dr;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.rot += q.vr * dt;
      if (q.bounce && q.y < (q.floor ?? 0)) { q.y = q.floor ?? 0; q.vy *= -q.bounce; q.vx *= .5; q.vz *= .5; }
      P[w++] = q;
    }
    P.length = w;
    for (let i = 0; i < w; i++) {
      const q = P[i], t = q.age / q.life;
      this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z;
      this.size[i] = q.s0 + (q.s1 - q.s0) * t;
      const fade = q.fadeIn ? Math.min(1, t / q.fadeIn) : 1;
      this.rgba[i * 4] = q.r; this.rgba[i * 4 + 1] = q.g; this.rgba[i * 4 + 2] = q.b; this.rgba[i * 4 + 3] = q.a * (1 - t) * fade;
      this.rot[i] = q.rot;
    }
    this.geo.setDrawRange(0, w);
    for (const k of ['position', 'size', 'rgba', 'rot']) this.geo.attributes[k].needsUpdate = true;
  }
  clear() { this.p.length = 0; this.geo.setDrawRange(0, 0); }
}

FX.init = function (scene, renderer) {
  FX.scene = scene;
  FX.smoke = new PSystem(scene, G.texSprite('smoke'), 700, false);
  FX.dust = new PSystem(scene, G.texSprite('dust'), 500, false);
  FX.debris = new PSystem(scene, G.texSprite('debris'), 600, false);
  FX.spark = new PSystem(scene, G.texSprite('glow'), 600, true);
  FX.fire = new PSystem(scene, G.texSprite('fire'), 300, true);
  FX.blood = new PSystem(scene, G.texSprite('blood'), 200, false);
  FX.weather = new PSystem(scene, G.texSprite('glow'), 2500, false);
  FX.systems = [FX.smoke, FX.dust, FX.debris, FX.spark, FX.fire, FX.blood, FX.weather];
  // decals (instanced)
  const decal = (tex, n) => {
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), m, n); im.count = 0; im.frustumCulled = false; im.renderOrder = 1; scene.add(im);
    return { im, n, i: 0, used: 0 };
  };
  FX.decals = { hole: decal(G.texSprite('hole'), 400), metal: decal(G.texSprite('holemetal'), 150), paper: decal(G.texSprite('holepaper'), 300), scorch: decal(G.texSprite('hole'), 30) };
  // tracer pool
  FX.tracers = [];
  const tg = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true); tg.rotateX(Math.PI / 2);
  FX.tracerMat = new THREE.MeshBasicMaterial({ color: G.col('#ffb35a'), transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false });
  FX.tracerMatG = new THREE.MeshBasicMaterial({ color: G.col('#7aff6a'), transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false });
  FX.streakMat = new THREE.MeshBasicMaterial({ color: G.col('#fff3d8'), transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 80; i++) { const m = new THREE.Mesh(tg, FX.tracerMat); m.visible = false; m.renderOrder = 4; scene.add(m); FX.tracers.push(m); }
  FX.tracerI = 0;
  // flash lights (fixed count: avoid shader recompiles)
  FX.lights = [];
  for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(G.col('#ffb060'), 0, 14, 2); scene.add(l); FX.lights.push({ l, t: 0 }); }
  // world muzzle flash sprites (for bots)
  FX.flashes = [];
  const fm = new THREE.SpriteMaterial({ map: G.texSprite('flash'), color: '#ffd9a0', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(fm); s.visible = false; s.renderOrder = 5; scene.add(s); FX.flashes.push({ s, t: 0 }); }
  FX.casings = [];
  FX.misc = []; // generic timed objects {obj, t, life, update}
};
FX.setFog = function (color, near, far) { for (const s of FX.systems) { s.mat.uniforms.fogColor.value.copy(color); s.mat.uniforms.fogNear.value = near; s.mat.uniforms.fogFar.value = far; } };
FX.setScale = function (h, fovDeg) { const sc = h / (2 * Math.tan(fovDeg * Math.PI / 360)); for (const s of FX.systems) s.mat.uniforms.scale.value = sc; };
FX.clear = function () {
  for (const s of FX.systems) s.clear();
  for (const k in FX.decals) { FX.decals[k].im.count = 0; FX.decals[k].i = 0; FX.decals[k].used = 0; }
  for (const t of FX.tracers) t.visible = false;
  for (const c of FX.casings) FX.scene.remove(c.m); FX.casings.length = 0;
  for (const m of FX.misc) if (m.obj) m.obj.parent && m.obj.parent.remove(m.obj); FX.misc.length = 0;
};

FX.addDecal = function (kind, pos, normal, size) {
  const D = FX.decals[kind] || FX.decals.hole;
  const m = new THREE.Matrix4();
  tmpQ.setFromUnitVectors(Z, normal);
  const rq = new THREE.Quaternion().setFromAxisAngle(Z, Math.random() * 6.28); tmpQ.multiply(rq);
  tmpV.copy(pos).addScaledVector(normal, .004);
  m.compose(tmpV, tmpQ, new THREE.Vector3(size, size, size));
  D.im.setMatrixAt(D.i, m); D.i = (D.i + 1) % D.n; D.used = Math.min(D.n, D.used + 1); D.im.count = D.used;
  D.im.instanceMatrix.needsUpdate = true;
};

// muzzle smoke/flash light at a world position, dir = barrel direction
FX.muzzle = function (pos, dir, o = {}) {
  const k = o.scale || 1, sup = o.sup;
  if (!sup) {
    const L = FX.lights.reduce((a, b) => a.t < b.t ? a : b);
    L.l.position.copy(pos).addScaledVector(dir, .3); L.l.intensity = 3.2 * Math.min(2, k) * (o.flash ?? 1); L.t = .05; L.l.distance = 10 + k * 6;
    if (o.world) { const F = FX.flashes.find(f => f.t <= 0) || FX.flashes[0]; F.s.position.copy(pos).addScaledVector(dir, .08 * k); F.s.scale.setScalar(.35 * k * Math.max(.25, o.flash ?? 1)); F.s.material.rotation = Math.random() * 6; F.s.visible = true; F.t = .045; }
    for (let i = 0; i < 3; i++) FX.spark.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: dir.x * 18 + (Math.random() - .5) * 4, vy: dir.y * 18 + (Math.random() - .5) * 4, vz: dir.z * 18 + (Math.random() - .5) * 4, life: .06 + Math.random() * .08, s0: .05, s1: .01, r: 1, g: .75, b: .4, drag: .01 });
  }
  const n = sup ? 2 : 3 + Math.floor(k * 2);
  for (let i = 0; i < n; i++) {
    const sp = .6 + Math.random() * 2.5 * (sup ? .3 : 1);
    FX.smoke.spawn({ x: pos.x + dir.x * .05, y: pos.y, z: pos.z + dir.z * .05, vx: dir.x * sp + (Math.random() - .5) * .4, vy: dir.y * sp + .25 + Math.random() * .3, vz: dir.z * sp + (Math.random() - .5) * .4,
      life: .7 + Math.random() * 1.2, s0: .06 * k, s1: .5 * k + Math.random() * .3, r: .82, g: .8, b: .78, a: sup ? .12 : .22, drag: .15, fadeIn: .05 });
  }
};
// barrel smoke wisps after sustained fire
FX.wisp = function (pos, heat) {
  FX.smoke.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: (Math.random() - .5) * .08, vy: .25 + Math.random() * .2, vz: (Math.random() - .5) * .08, life: 1.8, s0: .02, s1: .18, r: .85, g: .85, b: .85, a: .08 * Math.min(1, heat), drag: .6 });
};

FX.tracer = function (from, to, green, streak) {
  const T = FX.tracers[FX.tracerI]; FX.tracerI = (FX.tracerI + 1) % FX.tracers.length;
  const len = from.distanceTo(to); if (len < .01) return;
  T.visible = true; T.material = streak ? FX.streakMat : green ? FX.tracerMatG : FX.tracerMat;
  T.position.copy(from).add(to).multiplyScalar(.5);
  T.scale.set(streak ? .006 : .02, streak ? .006 : .02, len);
  T.lookAt(to);
  T.userData.t = streak ? .03 : .06;
};

// Ejected casing with physics; groundFn(x,z) returns floor height
FX.casing = function (cal, pos, vel, groundFn) {
  const m = G.makeCasing(cal); m.position.copy(pos); m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
  FX.scene.add(m);
  FX.casings.push({ m, v: vel.clone(), w: new THREE.Vector3((Math.random() - .5) * 30, (Math.random() - .5) * 30, (Math.random() - .5) * 30), life: 8, bounces: 0, ground: groundFn, shell: !!(G.CAL[cal] || {}).shell });
  if (FX.casings.length > 70) { const c = FX.casings.shift(); FX.scene.remove(c.m); }
};

// Impact effects by material. n = surface normal; dir = bullet direction; power ~ energy scale
const MATFX = {
  dirt:  { dust: [.42, .34, .24], deb: [.25, .2, .14], decal: 'hole', sparks: 0 },
  mud:   { dust: [.3, .24, .17], deb: [.2, .15, .1], decal: 'hole', sparks: 0 },
  grass: { dust: [.36, .33, .22], deb: [.2, .25, .1], decal: 'hole', sparks: 0 },
  sand:  { dust: [.8, .7, .52], deb: [.7, .6, .4], decal: 'hole', sparks: 0 },
  snow:  { dust: [.95, .96, 1], deb: [.9, .92, .96], decal: 'hole', sparks: 0 },
  stone: { dust: [.6, .58, .54], deb: [.45, .42, .38], decal: 'hole', sparks: 2 },
  concrete: { dust: [.7, .69, .66], deb: [.5, .5, .48], decal: 'hole', sparks: 2 },
  brick: { dust: [.6, .4, .32], deb: [.5, .3, .22], decal: 'hole', sparks: 1 },
  wood:  { dust: [.55, .45, .32], deb: [.6, .46, .28], decal: 'hole', sparks: 0 },
  sandbag: { dust: [.62, .55, .4], deb: [.5, .44, .3], decal: 'hole', sparks: 0 },
  metal: { dust: [.5, .5, .5], deb: [.3, .3, .3], decal: 'metal', sparks: 10 },
  steel: { dust: [.6, .6, .6], deb: [.3, .3, .3], decal: 'metal', sparks: 14 },
  paper: { dust: [.9, .88, .8], deb: [.9, .88, .8], decal: 'paper', sparks: 0 },
  flesh: { blood: 1 },
  gel:   { dust: [.95, .8, .5], deb: [.9, .7, .4], decal: null, sparks: 0 },
  foliage: { dust: [.3, .4, .2], deb: [.25, .45, .15], decal: null, sparks: 0 },
  glass: { dust: [.8, .9, .9], deb: [.8, .95, 1], decal: null, sparks: 0 },
  water: { dust: [.8, .85, .9], deb: [.8, .85, .9], decal: null, sparks: 0 },
};
FX.impact = function (p, n, dir, mat, power = 1, o = {}) {
  const M = MATFX[mat] || MATFX.dirt;
  const k = Math.min(3, .5 + power);
  if (M.blood) {
    for (let i = 0; i < 6; i++) FX.blood.spawn({ x: p.x, y: p.y, z: p.z, vx: dir.x * 2 + (Math.random() - .5) * 1.5, vy: (Math.random()) * 1.2, vz: dir.z * 2 + (Math.random() - .5) * 1.5, life: .35 + Math.random() * .3, s0: .06, s1: .28, r: .55, g: .06, b: .05, a: .8, grav: 4, drag: .2 });
    return;
  }
  // reflect-ish direction
  const r = dir.clone().reflect(n).normalize();
  const nb = mat === 'water' ? 0 : 4 + Math.floor(k * 3);
  for (let i = 0; i < 3 + k * 2; i++) {
    const s = .6 + Math.random() * 1.8 * k;
    FX.dust.spawn({ x: p.x + n.x * .03, y: p.y + n.y * .03, z: p.z + n.z * .03, vx: n.x * s + (Math.random() - .5) * .9, vy: n.y * s + (Math.random() - .2) * .9, vz: n.z * s + (Math.random() - .5) * .9, life: .6 + Math.random() * 1.1 * k, s0: .08 * k, s1: .6 * k + Math.random() * .4, r: M.dust[0], g: M.dust[1], b: M.dust[2], a: .55, drag: .08, grav: -.1 });
  }
  if (mat === 'snow' || mat === 'sand' || mat === 'dirt' || mat === 'mud' || mat === 'water') { // plume
    for (let i = 0; i < 4 * k; i++) FX.dust.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - .5) * .8, vy: 2 + Math.random() * 3 * k, vz: (Math.random() - .5) * .8, life: .8 + Math.random() * .6, s0: .06, s1: .45 * k, r: M.dust[0], g: M.dust[1], b: M.dust[2], a: .5, grav: 5, drag: .3 });
  }
  for (let i = 0; i < nb; i++) {
    const s = 1 + Math.random() * 4 * k;
    FX.debris.spawn({ x: p.x, y: p.y, z: p.z, vx: (n.x + r.x) * .5 * s + (Math.random() - .5) * 2, vy: (n.y + r.y) * .5 * s + Math.random() * 2, vz: (n.z + r.z) * .5 * s + (Math.random() - .5) * 2, life: .5 + Math.random() * .8, s0: .03, s1: .025, r: M.deb[0], g: M.deb[1], b: M.deb[2], a: 1, grav: 9.8, drag: .6, vr: 10, bounce: .3, floor: o.floor ?? -100 });
  }
  const ns = M.sparks * (o.inc ? 3 : 1) + (o.inc ? 8 : 0);
  for (let i = 0; i < ns; i++) {
    const s = 3 + Math.random() * 8;
    FX.spark.spawn({ x: p.x, y: p.y, z: p.z, vx: (r.x + (Math.random() - .5) * .9) * s, vy: (r.y + Math.random() * .6) * s, vz: (r.z + (Math.random() - .5) * .9) * s, life: .15 + Math.random() * .35, s0: .03, s1: .01, r: 1, g: .7 + Math.random() * .2, b: .35, grav: 9.8, drag: .4 });
  }
  if (o.inc) FX.fire.spawn({ x: p.x, y: p.y, z: p.z, life: .25, s0: .2, s1: .5, r: 1, g: .7, b: .4 });
  if (M.decal && o.decal !== false) FX.addDecal(M.decal, p, n, (M.decal === 'paper' ? .012 : .035) * (o.hole || 1));
};

FX.explosion = function (p, radius = 6) {
  for (let i = 0; i < 26; i++) FX.fire.spawn({ x: p.x, y: p.y + .3, z: p.z, vx: (Math.random() - .5) * 8, vy: Math.random() * 6, vz: (Math.random() - .5) * 8, life: .35 + Math.random() * .4, s0: 1, s1: 2.8, r: 1, g: .6 + Math.random() * .3, b: .3, drag: .05 });
  for (let i = 0; i < 30; i++) FX.smoke.spawn({ x: p.x, y: p.y + .5, z: p.z, vx: (Math.random() - .5) * 5, vy: 1 + Math.random() * 5, vz: (Math.random() - .5) * 5, life: 3 + Math.random() * 3, s0: 1.2, s1: 5, r: .25, g: .23, b: .21, a: .7, drag: .3, fadeIn: .05 });
  for (let i = 0; i < 50; i++) FX.debris.spawn({ x: p.x, y: p.y + .2, z: p.z, vx: (Math.random() - .5) * 18, vy: 4 + Math.random() * 12, vz: (Math.random() - .5) * 18, life: 1.5 + Math.random(), s0: .08, s1: .06, r: .25, g: .2, b: .15, grav: 9.8, drag: .7, vr: 10, bounce: .3, floor: p.y });
  for (let i = 0; i < 40; i++) FX.spark.spawn({ x: p.x, y: p.y + .3, z: p.z, vx: (Math.random() - .5) * 30, vy: Math.random() * 20, vz: (Math.random() - .5) * 30, life: .4 + Math.random() * .6, s0: .08, s1: .02, r: 1, g: .8, b: .4, grav: 9.8, drag: .5 });
  const L = FX.lights[0]; L.l.position.copy(p).y += 1; L.l.intensity = 40; L.l.distance = 40; L.t = .18;
  FX.addDecal('scorch', p.clone().setY(p.y + .02), UP, radius * .8);
};

FX.update = function (dt) {
  for (const s of FX.systems) s.update(dt);
  for (const L of FX.lights) { if (L.t > 0) { L.t -= dt; if (L.t <= 0) L.l.intensity = 0; else L.l.intensity *= .7; } }
  for (const F of FX.flashes) { if (F.t > 0) { F.t -= dt; if (F.t <= 0) F.s.visible = false; } }
  for (const T of FX.tracers) if (T.visible) { T.userData.t -= dt; if (T.userData.t <= 0) T.visible = false; }
  for (let i = FX.casings.length - 1; i >= 0; i--) {
    const c = FX.casings[i]; c.life -= dt;
    if (c.life <= 0) { FX.scene.remove(c.m); FX.casings.splice(i, 1); continue; }
    if (c.rest) continue;
    c.v.y -= 9.8 * dt; c.m.position.addScaledVector(c.v, dt);
    c.m.rotation.x += c.w.x * dt; c.m.rotation.y += c.w.y * dt; c.m.rotation.z += c.w.z * dt;
    const gy = c.ground ? c.ground(c.m.position.x, c.m.position.z, c.m.position.y + .3) : 0;
    if (c.m.position.y < gy + .006) {
      c.m.position.y = gy + .006;
      if (Math.abs(c.v.y) > .6 && c.bounces < 4) { G.Audio.casing(c.m.position, c.shell); c.bounces++; }
      c.v.y = Math.abs(c.v.y) * .35; c.v.x *= .5; c.v.z *= .5; c.w.multiplyScalar(.5);
      if (c.v.lengthSq() < .05) { c.rest = true; c.m.rotation.x = Math.PI / 2; c.m.rotation.z = 0; }
    }
  }
  for (let i = FX.misc.length - 1; i >= 0; i--) { const m = FX.misc[i]; m.t += dt; if (m.update) m.update(m, dt); if (m.t >= m.life) { if (m.obj && m.obj.parent) m.obj.parent.remove(m.obj); FX.misc.splice(i, 1); } }
};

// ------------------------------------------------ viewmodel muzzle flash
FX.makeVMFlash = function () {
  const g = new THREE.Group();
  const mk = (tex, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: G.texSprite(tex), color: G.col('#ffdcaa'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide })); m.renderOrder = 20; return m; };
  const front = mk('flash', .16, .16); g.add(front);
  const s1 = mk('flashside', .22, .09); s1.rotation.y = Math.PI / 2; s1.position.z = -.1; g.add(s1);
  const s2 = mk('flashside', .22, .09); s2.rotation.set(0, Math.PI / 2, Math.PI / 2); s2.position.z = -.1; g.add(s2);
  s1.material.map = s2.material.map; // share
  g.visible = false;
  g.userData = { front, s1, s2 };
  return g;
};
})();
