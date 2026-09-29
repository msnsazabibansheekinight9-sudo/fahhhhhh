// ============================================================================
// Engine: renderer, scenes, sky, environment lighting, map loading, weather,
// and the projectile ballistics simulation (gravity, drag, wind, penetration).
// ============================================================================
'use strict';
(function () {
const G = window.G;
const E = G.E = {};
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
G.settings = { sens: 1, fov: 72, vol: .8, quality: 'high', invertY: false, showFps: false };
try { Object.assign(G.settings, JSON.parse(localStorage.getItem('ironsight.settings') || '{}')); } catch (e) {}
G.saveSettings = () => { try { localStorage.setItem('ironsight.settings', JSON.stringify(G.settings)); } catch (e) {} };

E.init = function (canvas) {
  const R = E.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.autoClear = false;
  R.physicallyCorrectLights = false;
  G.maxAniso = R.capabilities.getMaxAnisotropy();
  E.scene = new THREE.Scene();
  E.camera = new THREE.PerspectiveCamera(G.settings.fov, 1, .05, 4000);
  E.scene.add(E.camera);
  // viewmodel scene
  E.vmScene = new THREE.Scene();
  E.vmCam = new THREE.PerspectiveCamera(52, 1, .008, 20);
  E.vmHemi = new THREE.HemisphereLight(0xffffff, 0x444444, .8); E.vmScene.add(E.vmHemi);
  E.vmSun = new THREE.DirectionalLight(0xffffff, 1.5); E.vmScene.add(E.vmSun); E.vmScene.add(E.vmSun.target);
  E.vmFill = new THREE.DirectionalLight(0xffffff, .25); E.vmFill.position.set(-1, .3, 1); E.vmScene.add(E.vmFill);
  E.vmFlash = new THREE.PointLight(G.col('#ffb060'), 0, 3, 2); E.vmFlash.position.set(0, 0, -.6); E.vmScene.add(E.vmFlash);
  E.vmLight = new THREE.SpotLight(0xffffff, 0, 60, .35, .5, 1.5); E.scene.add(E.vmLight); E.scene.add(E.vmLight.target);
  // lights
  E.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, .7); E.scene.add(E.hemi);
  E.sun = new THREE.DirectionalLight(0xffffff, 2); E.sun.castShadow = true;
  E.sun.shadow.mapSize.set(2048, 2048); E.sun.shadow.bias = -.0004; E.sun.shadow.normalBias = .03;
  const sc = E.sun.shadow.camera; sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 1; sc.far = 260;
  E.scene.add(E.sun); E.scene.add(E.sun.target);
  E.pmrem = new THREE.PMREMGenerator(R);
  buildSky();
  G.FX.init(E.scene, R);
  E.world = new G.World(E.scene);
  E.resize(); window.addEventListener('resize', E.resize);
  E.clock = new THREE.Clock();
};
E.resize = function () {
  const R = E.renderer, c = R.domElement, w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
  const scale = G.settings.quality === 'low' ? .6 : G.settings.quality === 'med' ? .8 : Math.min(1.5, window.devicePixelRatio || 1);
  R.setPixelRatio(scale); R.setSize(w, h, false);
  E.camera.aspect = w / h; E.camera.updateProjectionMatrix();
  E.vmCam.aspect = w / h; E.vmCam.updateProjectionMatrix();
  E.W = w; E.H = h;
  G.FX.setScale && G.FX.setScale(h * scale, E.camera.fov);
};

// ------------------------------------------------------------------ sky
function buildSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: V3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, clouds: { value: .5 }, night: { value: 0 }, time: { value: 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 top, mid, bot, sunCol, sunDir; uniform float clouds, night, time; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
      void main(){ vec3 d = normalize(vD); float y = d.y;
        vec3 c = y > 0. ? mix(mid, top, pow(clamp(y,0.,1.), .55)) : mix(mid, bot, clamp(-y*6.,0.,1.));
        float sd = max(0., dot(d, normalize(sunDir)));
        c += sunCol * (pow(sd, 900.) * 6. + pow(sd, 12.) * .25);
        if (y > 0.) { vec2 uv = d.xz / (y + .12) * 1.6 + vec2(time * .004, 0.);
          float cl = smoothstep(.5 - clouds * .25, .95, fbm(uv)); vec3 cc = mix(mid * 1.05, vec3(1.) * (1. - night * .85), .6) + sunCol * pow(sd, 4.) * .3;
          c = mix(c, cc, cl * smoothstep(0., .25, y) * .85);
          if (night > .5) { float st = step(.9985, h(floor(d.xz / (y+.02) * 320.))); c += st * .9 * (1. - cl); } }
        gl_FragColor = vec4(c, 1.); }`,
  });
  E.sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), mat); E.sky.renderOrder = -10; E.sky.frustumCulled = false;
  E.scene.add(E.sky);
  // environment-map source: a vertex-coloured dome (cheap, NaN-free) rebuilt per map
  E.skyScene = new THREE.Scene();
  const dg = new THREE.SphereGeometry(40, 32, 16); dg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(dg.attributes.position.count * 3), 3));
  E.skyEnv = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  E.skyScene.add(E.skyEnv);
}

// ------------------------------------------------------------------ environment
E.setEnv = function (key, groundKind, weather) {
  const P = G.ENV[key] || G.ENV.sunny;
  const u = E.sky.material.uniforms;
  u.top.value.set(P.sky[0]).convertSRGBToLinear(); u.mid.value.set(P.sky[1]).convertSRGBToLinear(); u.bot.value.set(P.sky[2]).convertSRGBToLinear();
  const sd = V3(P.sun[0], P.sun[1], P.sun[2]).normalize(); u.sunDir.value.copy(sd); u.sunCol.value.set(P.sun[3]).convertSRGBToLinear();
  u.clouds.value = key === 'overcast' || key === 'grey' ? 1 : key === 'winter' ? .9 : key === 'desert' ? .15 : .5;
  u.night.value = key === 'night' ? 1 : 0;
  const fogC = new THREE.Color(P.fog[0]).convertSRGBToLinear();
  E.scene.fog = new THREE.Fog(fogC, P.fog[1], P.fog[2]);
  E.sun.color.set(P.sun[3]).convertSRGBToLinear(); E.sun.intensity = P.sun[4];
  E.sunDir = sd; E.hemi.color.set(P.hemi[0]).convertSRGBToLinear(); E.hemi.groundColor.set(P.hemi[1]).convertSRGBToLinear(); E.hemi.intensity = P.hemi[2];
  E.vmHemi.color.copy(E.hemi.color); E.vmHemi.groundColor.copy(E.hemi.groundColor); E.vmHemi.intensity = P.hemi[2] * 1.1;
  E.vmSun.color.copy(E.sun.color); E.vmSun.intensity = Math.min(2.2, P.sun[4] * .8);
  E.renderer.toneMappingExposure = P.exp;
  // environment map from the sky
  if (E.envRT) E.envRT.dispose();
  { // paint the env dome: sky gradient, bright sun lobe, ground bounce
    const pos = E.skyEnv.geometry.attributes.position, col = E.skyEnv.geometry.attributes.color, v = new THREE.Vector3();
    const top = u.top.value, mid = u.mid.value, bot = new THREE.Color(P.hemi[1]).convertSRGBToLinear(), sc = u.sunCol.value, c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      if (v.y >= 0) c.copy(mid).lerp(top, Math.pow(v.y, .55)); else c.copy(mid).lerp(bot, Math.min(1, -v.y * 4)).multiplyScalar(.6);
      const sdot = Math.max(0, v.dot(sd)); c.r += sc.r * Math.pow(sdot, 24) * 3; c.g += sc.g * Math.pow(sdot, 24) * 3; c.b += sc.b * Math.pow(sdot, 24) * 3;
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }
  E.envRT = E.pmrem.fromScene(E.skyScene, .04);
  E.scene.environment = E.envRT.texture; E.vmScene.environment = E.envRT.texture;
  G.FX.setFog(fogC, P.fog[1], P.fog[2]);
  // ground
  if (E.ground) E.scene.remove(E.ground);
  const big = key === 'range';
  const gt = G.texGround(groundKind || 'dirt').clone(); gt.needsUpdate = true; const size = big ? 5000 : 600; gt.repeat.set(size / 6, size / 6);
  E.ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), G.mat({ map: gt, roughness: groundKind === 'snow' ? .8 : 1, metalness: 0 }));
  E.ground.rotation.x = -Math.PI / 2; E.ground.receiveShadow = true; E.scene.add(E.ground);
  if (E.hills) E.scene.remove(E.hills);
  E.hills = new THREE.Group();
  const hc = new THREE.Color(P.fog[0]).lerp(new THREE.Color(P.hemi[1]), .45);
  const hm = G.mat({ color: '#' + hc.getHexString(), roughness: 1, flatShading: true });
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = big ? 1500 : 220 + Math.random() * 60; const h = new THREE.Mesh(new THREE.ConeGeometry(40 + Math.random() * 60, 20 + Math.random() * 40, 6), hm); h.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); E.hills.add(h); }
  E.scene.add(E.hills);
  E.weather = weather; E.weatherT = 0;
  E.groundKind = groundKind;
};

// ------------------------------------------------------------------ map loading
E.loadMap = function (def) {
  const W = E.world; W.reset();
  G.FX.clear();
  W.groundMat = { mud: 'mud', grass: 'grass', jungle: 'dirt', sand: 'sand', snow: 'snow', concrete: 'concrete', asphalt: 'concrete', dirt: 'dirt', rubble: 'dirt', gravel: 'dirt' }[def.ground] || 'dirt';
  E.setEnv(def.env, def.ground, def.weather);
  def.build(W);
  if (def.id !== 'range') W.border();
  // bake static geometry per material
  const merged = G.mergeByMaterial(W.static);
  W.group.remove(W.static); W.static = merged; W.group.add(merged);
  if (def.id !== 'range') W.buildNav();
  E.map = def;
  G.Audio.setEnv(def.reverb || 'open');
  G.Audio.ambience(def.amb || null);
  return W;
};

// ------------------------------------------------------------------ weather
E.updateWeather = function (dt, cam) {
  const w = E.weather; if (!w) return;
  const P = G.FX.weather; const p = cam.position;
  E.weatherT += dt;
  const rate = { rain: 700, snow: 220, dust: 40, ash: 90 }[w];
  const n = Math.floor(rate * dt + Math.random());
  for (let i = 0; i < n; i++) {
    const x = p.x + (Math.random() - .5) * 40, z = p.z + (Math.random() - .5) * 40, y = p.y + 6 + Math.random() * 8;
    if (w === 'rain') P.spawn({ x, y, z, vy: -14, vx: .6, life: 1.1, s0: .035, s1: .035, r: .7, g: .75, b: .8, a: .45 });
    else if (w === 'snow') P.spawn({ x, y, z, vy: -1.2, vx: (Math.random() - .5), vz: (Math.random() - .5) * .5, life: 8, s0: .05, s1: .05, r: 1, g: 1, b: 1, a: .9, vr: 2 });
    else if (w === 'dust') P.spawn({ x, y: p.y + Math.random() * 3, z, vx: 2 + Math.random(), vy: (Math.random() - .5) * .3, life: 5, s0: .5, s1: 1.4, r: .85, g: .75, b: .58, a: .12 });
    else if (w === 'ash') P.spawn({ x, y, z, vy: -.8, vx: .3, life: 9, s0: .04, s1: .04, r: .4, g: .38, b: .36, a: .8, vr: 3 });
  }
};

// ============================================================ BALLISTICS
const B = G.Ballistics = { list: [], wind: V3(0, 0, 0), targets: [] };
const GRAV = 9.81;
// o: { pos, dir, v, k, dmg, pen, team, owner, tracer, streak, cal, weapon, pellets..., aim (for range stats) }
B.fire = function (o) {
  const b = { p: o.pos.clone(), v: o.dir.clone().multiplyScalar(o.v), v0: o.v, k: o.k, dmg: o.dmg, pen: o.pen, team: o.team, owner: o.owner, t: 0, dist: 0,
    gyro: o.gyro || null, ap: !!o.ap, tracer: o.tracer || (o.gyro ? 'red' : null), streak: o.streak, cal: o.cal, weapon: o.weapon, start: o.pos.clone(), vis: o.vis ? o.vis.clone() : null, aim: o.aim, snapped: false, inc: o.inc, ammo: o.ammo, hp: o.hp, player: o.player, alive: true, hits: 0, pellet: o.pellet, pierced: 0, he: o.he || null, homing: o.homing || 0 };
  B.list.push(b);
  return b;
};
const tmpA = V3(), tmpB = V3(), tmpD = V3(), rel = V3(), hA = V3(), hB = V3();
// explosive projectiles detonate once where they stop
function boom(b, p) { if (b.he && !b.boomed) { b.boomed = true; G.Game && G.Game.explode && G.Game.explode(p.clone(), b.owner, { r: b.he.r, dmg: b.he.dmg, name: b.weapon ? b.weapon.n : 'HE' }); } }
// seeker rounds: steer toward the nearest enemy (or range target) inside a ~35° cone ahead
function steer(b, h, ctx) {
  const sp = b.v.length(); if (sp < 1) return;
  hA.copy(b.v).divideScalar(sp);
  let best = null, bd = 1e9;
  const test = (x, y, z) => { hB.set(x, y, z).sub(b.p); const d = hB.length(); if (d < .5 || d > 150) return; if (hB.dot(hA) / d < .82) return; if (d < bd) { bd = d; best = hB.clone().divideScalar(d); } };
  if (ctx.soldiers) for (const S of ctx.soldiers) if (S.alive && S !== b.owner && S.team !== b.team) test(S.pos.x, S.pos.y + 1.25, S.pos.z);
  if (ctx.targets) for (const T of ctx.targets) { if (T.S && T.S.dead > 0) continue; const f = T.focus || (T.g && T.g.position); if (f && (T.type === 'dummy' || T.type === 'walker' || T.type === 'vehicle')) test(f.x, (T.focus ? f.y : f.y + 1.2), f.z); }
  if (!best) return;
  hA.lerp(best, Math.min(1, b.homing * h)).normalize(); b.v.copy(hA).multiplyScalar(sp);
}
B.update = function (dt, ctx) {
  const sub = 3, h = dt / sub;
  for (let s = 0; s < sub; s++) {
    for (const b of B.list) {
      if (!b.alive) continue;
      tmpA.copy(b.p);
      // drag relative to wind; dv/dt = -k |v_rel| v_rel
      rel.copy(b.v).sub(B.wind); const sp = rel.length();
      b.v.addScaledVector(rel, -b.k * sp * h);
      b.v.y -= GRAV * h;
      if (b.homing && b.t > .04) steer(b, h, ctx);
      if (b.gyro && b.t < b.gyro.burn) { // rocket motor still burning: accelerate along the flight path
        const sp2 = b.v.length(); b.v.multiplyScalar((sp2 + (b.gyro.v - b.v0) / b.gyro.burn * h) / (sp2 || 1));
        if (Math.random() < .5) G.FX.smoke.spawn({ x: b.p.x, y: b.p.y, z: b.p.z, life: .8, s0: .03, s1: .25, r: .9, g: .88, b: .85, a: .35, drag: .3 });
      }
      b.p.addScaledVector(b.v, h); b.t += h;
      const segLen = tmpA.distanceTo(b.p); b.dist += segLen;
      trace(b, tmpA, b.p, segLen, ctx);
      if (b.t > 4 || b.p.y < -5) b.alive = false;
    }
  }
  // tracers
  for (const b of B.list) {
    if (!b.alive) continue;
    if (b.tracer || b.streak) {
      const back = b.p.clone().addScaledVector(b.v, -Math.min(.035, b.t));
      if (b.vis && b.t < .05) back.lerp(b.vis, 1 - b.t / .05);
      G.FX.tracer(back, b.p, b.tracer === 'green', !b.tracer);
    }
  }
  B.list = B.list.filter(b => b.alive);
};
function trace(b, a, c, len, ctx) {
  if (len < 1e-5) return;
  const dir = tmpD.subVectors(c, a).divideScalar(len);
  let best = null, bt = len;
  // world
  const W = E.world;
  const wh = W.raycast(a, dir, bt, { skip: col => b.skipCol && b.skipCol.has(col) });
  if (wh) { best = { kind: 'world', t: wh.t, hit: wh }; bt = wh.t; }
  // soldiers (bots + player)
  if (ctx.soldiers) for (const S of ctx.soldiers) {
    if (!S.alive || S === b.owner || (S.team === b.team && !ctx.friendlyFire) || (b.skipS && b.skipS.has(S))) continue;
    if (S.pos.distanceToSquared(a) > (len + 3) * (len + 3)) continue;
    const boxes = S.hitboxes();
    for (const hb of boxes) {
      const t = G.rayCapsule(a, dir, hb.a, hb.b, hb.r);
      if (t >= 0 && t < bt) { bt = t; best = { kind: 'soldier', t, S, zone: hb.zone }; }
    }
  }
  // range targets
  if (ctx.targets) for (const T of ctx.targets) {
    if (b.skipT && b.skipT.has(T)) continue;
    const t = T.rayTest(a, dir, bt, b);
    if (t >= 0 && t < bt) { bt = t; best = { kind: 'target', t, T }; }
  }
  // near-miss snap for the listener
  if (ctx.listener && !b.snapped && b.team !== ctx.listenerTeam) {
    const L = ctx.listener; tmpB.subVectors(L, a); const proj = tmpB.dot(dir);
    if (proj > 0 && proj < len) { const dd = tmpB.addScaledVector(dir, -proj).length(); if (dd < 3) { b.snapped = true; G.Audio.snap(a.clone().addScaledVector(dir, proj), b.v.length() > 343); ctx.onNearMiss && ctx.onNearMiss(dd); } }
  }
  if (!best) return;
  const p = a.clone().addScaledVector(dir, best.t);
  const speed = b.v.length();
  const energy = Math.pow(speed / b.v0, 1.5);
  if (best.kind === 'world') {
    const hit = best.hit, mat = hit.mat;
    const col = hit.c;
    const pass = col && (col.soft || col.pen < b.pen);
    G.FX.impact(p, hit.n, dir, mat, Math.min(2, b.dmg / 60 * energy), { inc: b.inc, floor: hit.ground ? 0 : undefined, hole: b.pellet ? .5 : 1 });
    if (!b.pellet || Math.random() < .3) G.Audio.impact(p, mat, b.dmg > 60);
    if (pass && b.pierced < 3) {
      b.pierced++; (b.skipCol || (b.skipCol = new Set())).add(col);
      b.v.multiplyScalar(col.soft ? .92 : .6); b.p.copy(p).addScaledVector(dir, .02);
      // exit effect on the far side
      if (!col.soft) { const exit = G.E.world.raycast(p.clone().addScaledVector(dir, 3), dir.clone().negate(), 3, { skip: cc => cc !== col }); if (exit) G.FX.impact(exit.p, exit.n, dir, mat, .6, { decal: true }); }
      return;
    }
    // ricochet off steel/concrete at shallow angles
    const cosI = -dir.dot(hit.n);
    if (cosI < .18 && (mat === 'metal' || mat === 'concrete' || mat === 'stone') && Math.random() < .6) {
      b.v.reflect(hit.n).multiplyScalar(.45); b.p.copy(p).addScaledVector(hit.n, .02); b.dmg *= .4;
      return;
    }
    b.alive = false; b.p.copy(p); boom(b, p);
    ctx.onWorldHit && ctx.onWorldHit(b, p, hit);
  } else if (best.kind === 'soldier') {
    const S = best.S;
    const res = S.damage(b, best.zone, energy, dir, p);
    G.FX.impact(p, dir.clone().negate(), dir, 'flesh', 1);
    G.Audio.impact(p, 'flesh', true);
    ctx.onSoldierHit && ctx.onSoldierHit(b, S, best.zone, res, p);
    if (b.he) { b.alive = false; b.p.copy(p); boom(b, p); return; }
    if (b.pen >= 3 && best.zone !== 'head' && b.pierced < 1 && !res.armorStop) { b.pierced++; (b.skipS || (b.skipS = new Set())).add(S); b.v.multiplyScalar(.5); b.dmg *= .5; b.p.copy(p).addScaledVector(dir, .5); return; }
    b.alive = false; b.p.copy(p);
  } else if (best.kind === 'target') {
    const r = best.T.onHit(b, p, dir, energy, speed);
    ctx.onTargetHit && ctx.onTargetHit(b, best.T, p, speed, r);
    if (r && r.pass) {
      b.p.copy(p).addScaledVector(dir, r.depth || .02); if (r.v) b.v.multiplyScalar(r.v);
      if (r.dir) b.v.copy(r.dir).multiplyScalar(b.v.length()); // deflection (e.g. through glass)
      if (!r.keep) (b.skipT || (b.skipT = new Set())).add(best.T); // multi-part targets track their own parts
      return;
    }
    b.alive = false; b.p.copy(p); boom(b, p);
  }
}
// quick flat-fire simulation to find the elevation that zeros the sight at distance d
B.zeroAngle = function (v, k, sightH, d) {
  let ang = 0;
  for (let it = 0; it < 6; it++) {
    let x = 0, y = -sightH, vx = v * Math.cos(ang), vy = v * Math.sin(ang), t = 0;
    const h = .002;
    while (x < d && t < 4) { const sp = Math.hypot(vx, vy); vx -= k * sp * vx * h; vy -= (k * sp * vy + GRAV) * h; x += vx * h; y += vy * h; t += h; }
    ang += -y / d;
  }
  return ang;
};
// flight time / impact velocity estimate at distance d (for HUD readouts)
B.flight = function (v, k, d) { let x = 0, vx = v, t = 0; const h = .002; while (x < d && t < 6) { vx -= k * vx * vx * h; x += vx * h; t += h; } return { t, v: vx }; };
})();
