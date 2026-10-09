'use strict';
// Particles, tracers, beams, explosions, scorch decals, flash lights and the weather system.
(function () {
  const T = THREE, PI = Math.PI;

  const PVS = `
    attribute float aSize; attribute vec4 aCol; varying vec4 vCol; varying float vDist; uniform float uScale;
    void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vDist = -mv.z; vCol = aCol; gl_PointSize = aSize * uScale / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }`;
  const PFS = `
    uniform sampler2D uTex; uniform vec3 uFogCol; uniform float uFogD; uniform float uFogAmt; varying vec4 vCol; varying float vDist;
    void main(){ vec4 t = texture2D(uTex, gl_PointCoord); float f = 1.0 - exp(-uFogD*uFogD*vDist*vDist); vec3 c = mix(vCol.rgb, uFogCol, clamp(f*uFogAmt,0.0,1.0)); gl_FragColor = vec4(c, t.a * vCol.a); if (gl_FragColor.a < 0.01) discard; }`;

  class Particles {
    constructor(scene, cap, opts) {
      this.cap = cap; this.n = 0;
      this.pos = new Float32Array(cap * 3); this.vel = new Float32Array(cap * 3);
      this.life = new Float32Array(cap); this.max = new Float32Array(cap);
      this.s0 = new Float32Array(cap); this.s1 = new Float32Array(cap);
      this.col = new Float32Array(cap * 3); this.a0 = new Float32Array(cap);
      this.drag = new Float32Array(cap); this.grav = new Float32Array(cap);
      this.size = new Float32Array(cap); this.rgba = new Float32Array(cap * 4);
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
      g.setAttribute('aSize', new T.BufferAttribute(this.size, 1).setUsage(T.DynamicDrawUsage));
      g.setAttribute('aCol', new T.BufferAttribute(this.rgba, 4).setUsage(T.DynamicDrawUsage));
      g.setDrawRange(0, 0);
      this.mat = new T.ShaderMaterial({
        uniforms: { uTex: { value: opts.tex }, uScale: { value: 400 }, uFogCol: { value: new T.Color() }, uFogD: { value: 0 }, uFogAmt: { value: opts.additive ? 0.6 : 1 } },
        vertexShader: PVS, fragmentShader: PFS, transparent: true, depthWrite: false,
        blending: opts.additive ? T.AdditiveBlending : T.NormalBlending,
      });
      this.pts = new T.Points(g, this.mat);
      this.pts.frustumCulled = false;
      this.pts.renderOrder = opts.additive ? 5 : 4;
      this.geo = g;
      scene.add(this.pts);
    }
    spawn(x, y, z, vx, vy, vz, life, s0, s1, col, a0, drag, grav) {
      let i = this.n;
      if (i >= this.cap) i = Math.floor(Math.random() * this.cap); else this.n++;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      this.life[i] = 0; this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1;
      this.col[i * 3] = ((col >> 16) & 255) / 255; this.col[i * 3 + 1] = ((col >> 8) & 255) / 255; this.col[i * 3 + 2] = (col & 255) / 255;
      this.a0[i] = a0; this.drag[i] = drag || 0; this.grav[i] = grav || 0;
    }
    update(dt) {
      let n = this.n;
      for (let i = 0; i < n; i++) {
        this.life[i] += dt;
        if (this.life[i] >= this.max[i]) { // swap-remove
          n--;
          if (i !== n) {
            for (let k = 0; k < 3; k++) { this.pos[i * 3 + k] = this.pos[n * 3 + k]; this.vel[i * 3 + k] = this.vel[n * 3 + k]; this.col[i * 3 + k] = this.col[n * 3 + k]; }
            this.life[i] = this.life[n]; this.max[i] = this.max[n]; this.s0[i] = this.s0[n]; this.s1[i] = this.s1[n]; this.a0[i] = this.a0[n]; this.drag[i] = this.drag[n]; this.grav[i] = this.grav[n];
            i--;
          }
          continue;
        }
        const d = Math.max(0, 1 - this.drag[i] * dt);
        this.vel[i * 3] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt; this.vel[i * 3 + 2] *= d;
        this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
        const t = this.life[i] / this.max[i];
        this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
        this.rgba[i * 4] = this.col[i * 3]; this.rgba[i * 4 + 1] = this.col[i * 3 + 1]; this.rgba[i * 4 + 2] = this.col[i * 3 + 2];
        this.rgba[i * 4 + 3] = this.a0[i] * (t < 0.1 ? t * 10 : 1 - (t - 0.1) / 0.9);
      }
      this.n = n;
      this.geo.setDrawRange(0, n);
      if (n) { this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aSize.needsUpdate = true; this.geo.attributes.aCol.needsUpdate = true; }
    }
    clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
  }

  // line segments with per-vertex colour that fade out (tracers, beams, lightning)
  class Lines {
    constructor(scene, cap) {
      this.cap = cap; this.n = 0;
      this.pos = new Float32Array(cap * 6); this.col = new Float32Array(cap * 6);
      this.base = new Float32Array(cap * 3); this.life = new Float32Array(cap); this.max = new Float32Array(cap);
      this.vel = new Float32Array(cap * 3);
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
      g.setAttribute('color', new T.BufferAttribute(this.col, 3).setUsage(T.DynamicDrawUsage));
      g.setDrawRange(0, 0);
      this.geo = g;
      this.mesh = new T.LineSegments(g, new T.LineBasicMaterial({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      this.mesh.frustumCulled = false; this.mesh.renderOrder = 6;
      scene.add(this.mesh);
    }
    add(ax, ay, az, bx, by, bz, col, life, vx, vy, vz) {
      let i = this.n; if (i >= this.cap) i = Math.floor(Math.random() * this.cap); else this.n++;
      this.pos.set([ax, ay, az, bx, by, bz], i * 6);
      this.base[i * 3] = ((col >> 16) & 255) / 255; this.base[i * 3 + 1] = ((col >> 8) & 255) / 255; this.base[i * 3 + 2] = (col & 255) / 255;
      this.life[i] = 0; this.max[i] = life;
      this.vel[i * 3] = vx || 0; this.vel[i * 3 + 1] = vy || 0; this.vel[i * 3 + 2] = vz || 0;
    }
    update(dt) {
      let n = this.n;
      for (let i = 0; i < n; i++) {
        this.life[i] += dt;
        if (this.life[i] >= this.max[i]) {
          n--;
          if (i !== n) { for (let k = 0; k < 6; k++) this.pos[i * 6 + k] = this.pos[n * 6 + k]; for (let k = 0; k < 3; k++) { this.base[i * 3 + k] = this.base[n * 3 + k]; this.vel[i * 3 + k] = this.vel[n * 3 + k]; } this.life[i] = this.life[n]; this.max[i] = this.max[n]; i--; }
          continue;
        }
        for (let k = 0; k < 2; k++) { this.pos[i * 6 + k * 3] += this.vel[i * 3] * dt; this.pos[i * 6 + k * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 6 + k * 3 + 2] += this.vel[i * 3 + 2] * dt; }
        const f = 1 - this.life[i] / this.max[i];
        for (let k = 0; k < 2; k++) { const ff = k ? f : f * 0.4; this.col[i * 6 + k * 3] = this.base[i * 3] * ff * 2; this.col[i * 6 + k * 3 + 1] = this.base[i * 3 + 1] * ff * 2; this.col[i * 6 + k * 3 + 2] = this.base[i * 3 + 2] * ff * 2; }
      }
      this.n = n; this.geo.setDrawRange(0, n * 2);
      if (n) { this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true; }
    }
  }

  SM.FX = class {
    constructor(scene, quality) {
      this.scene = scene;
      const q = quality === 'low' ? 0.5 : quality === 'high' ? 1.4 : 1;
      this.q = q;
      this.smoke = new Particles(scene, Math.round(3500 * q), { tex: SM.smokeTexture() });
      this.fire = new Particles(scene, Math.round(3000 * q), { tex: SM.spriteTexture(), additive: true });
      this.lines = new Lines(scene, 900);
      this.lights = [];
      for (let i = 0; i < 4; i++) { const l = new T.PointLight(0xffaa55, 0, 60, 2); l.position.set(0, -100, 0); scene.add(l); this.lights.push({ l, t: 0, max: 0, i0: 0 }); }
      this.decals = [];
      const dc = document.createElement('canvas'); dc.width = dc.height = 64; const dx = dc.getContext('2d');
      const gr = dx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(10,8,6,0.85)'); gr.addColorStop(0.6, 'rgba(20,16,12,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      dx.fillStyle = gr; dx.fillRect(0, 0, 64, 64);
      this.decalTex = new T.CanvasTexture(dc);
      this.decalGeo = new T.PlaneGeometry(1, 1); this.decalGeo.rotateX(-PI / 2);
      this.emitters = []; // persistent smoke / fire sources
      this.time = 0;
    }
    setFog(col, d) { for (const p of [this.smoke, this.fire]) { p.mat.uniforms.uFogCol.value.copy(col); p.mat.uniforms.uFogD.value = d; } }
    setScale(h) { this.smoke.mat.uniforms.uScale.value = h * 0.55; this.fire.mat.uniforms.uScale.value = h * 0.55; }
    flash(x, y, z, col, intensity, dur) {
      let best = this.lights[0];
      for (const L of this.lights) if (L.t >= L.max) { best = L; break; } else if (L.max - L.t < best.max - best.t) best = L;
      best.l.position.set(x, y + 3, z); best.l.color.setHex(col); best.i0 = intensity; best.t = 0; best.max = dur; best.l.intensity = intensity;
    }
    muzzle(x, y, z, dx, dz, size, col) {
      const s = size || 1;
      this.fire.spawn(x, y, z, dx * 6 * s, 0.5, dz * 6 * s, 0.08, 2.4 * s, 4 * s, col || 0xffc070, 1, 0, 0);
      for (let i = 0; i < 3 * this.q; i++) this.smoke.spawn(x + dx * s, y, z + dz * s, dx * (2 + Math.random() * 3) * s + (Math.random() - 0.5), 0.6 + Math.random(), dz * (2 + Math.random() * 3) * s + (Math.random() - 0.5), 0.8 + Math.random() * 0.6, 1.2 * s, 4 * s, 0xb0aaa0, 0.35, 1.2, -0.3);
    }
    tracer(ax, ay, az, bx, by, bz, col) {
      const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz) || 1;
      const seg = Math.min(L * 0.35, 9), sp = 340, t = L / sp;
      const ux = dx / L, uy = dy / L, uz = dz / L;
      this.lines.add(ax, ay, az, ax + ux * seg, ay + uy * seg, az + uz * seg, col || 0xffd27a, t, ux * sp, uy * sp, uz * sp);
    }
    beam(ax, ay, az, bx, by, bz, col, life) {
      this.lines.add(ax, ay, az, bx, by, bz, col, life || 0.25);
      this.lines.add(ax, ay + 0.15, az, bx, by + 0.15, bz, col, (life || 0.25) * 0.7);
      for (let i = 0; i < 6 * this.q; i++) { const t = Math.random(); this.fire.spawn(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t, (Math.random() - 0.5), Math.random(), (Math.random() - 0.5), 0.35, 1.2, 0.2, col, 0.8, 0, 0); }
    }
    explosion(x, y, z, size, kind) {
      const s = size || 1, q = this.q;
      const col = kind === 'plasma' ? 0x9af0ff : kind === 'laser' ? 0xff7ad0 : kind === 'emp' ? 0x7ab0ff : 0xffa040;
      this.fire.spawn(x, y + 0.5 * s, z, 0, 2, 0, 0.18, 6 * s, 16 * s, 0xfff0d0, 1, 0, 0);
      for (let i = 0; i < 14 * q * Math.min(2, s); i++) {
        const a = Math.random() * PI * 2, v = (4 + Math.random() * 10) * s;
        this.fire.spawn(x, y + 0.6 * s, z, Math.cos(a) * v, (3 + Math.random() * 8) * s, Math.sin(a) * v, 0.35 + Math.random() * 0.4, 3 * s, 7 * s, col, 0.9, 2.5, 4);
      }
      for (let i = 0; i < 18 * q * Math.min(2, s); i++) {
        const a = Math.random() * PI * 2, v = (2 + Math.random() * 7) * s;
        this.fire.spawn(x, y + 0.5, z, Math.cos(a) * v * 2.5, (6 + Math.random() * 14) * s, Math.sin(a) * v * 2.5, 0.6 + Math.random() * 0.8, 0.6, 0.2, 0xffd28a, 1, 0.5, 22);
      }
      for (let i = 0; i < 12 * q * Math.min(2.5, s); i++) {
        const a = Math.random() * PI * 2, v = (1 + Math.random() * 4) * s;
        this.smoke.spawn(x + Math.cos(a) * s, y + 1 * s, z + Math.sin(a) * s, Math.cos(a) * v, (2 + Math.random() * 4) * s, Math.sin(a) * v, 2 + Math.random() * 2.5, 4 * s, 13 * s, i % 3 ? 0x4a4642 : 0x2a2826, 0.75, 0.9, -0.5);
      }
      this.flash(x, y, z, col, 6 * Math.min(3, s), 0.25 + 0.1 * s);
      if (s >= 0.8) this.decal(x, z, y, 5 * s);
    }
    dust(x, y, z, size, col) {
      const s = size || 1;
      for (let i = 0; i < 6 * this.q; i++) { const a = Math.random() * PI * 2, v = 2 + Math.random() * 3; this.smoke.spawn(x, y + 0.3, z, Math.cos(a) * v * s, (1 + Math.random() * 3) * s, Math.sin(a) * v * s, 0.9 + Math.random() * 0.8, 1.5 * s, 5 * s, col || 0xa89a80, 0.6, 1.5, 0.5); }
    }
    splash(x, y, z, size) {
      const s = size || 1;
      for (let i = 0; i < 16 * this.q; i++) { const a = Math.random() * PI * 2, v = Math.random() * 3; this.smoke.spawn(x + Math.cos(a), y, z + Math.sin(a), Math.cos(a) * v * s, (6 + Math.random() * 10) * s, Math.sin(a) * v * s, 1.0 + Math.random() * 0.6, 1.4 * s, 3.5 * s, 0xe8f2f6, 0.85, 0.2, 18); }
    }
    sparks(x, y, z, col) {
      for (let i = 0; i < 7 * this.q; i++) { const a = Math.random() * PI * 2, v = 3 + Math.random() * 6; this.fire.spawn(x, y, z, Math.cos(a) * v, 2 + Math.random() * 6, Math.sin(a) * v, 0.3 + Math.random() * 0.3, 0.5, 0.1, col || 0xffd080, 1, 1, 15); }
      this.fire.spawn(x, y, z, 0, 0, 0, 0.1, 3, 4, col || 0xffe0a0, 1, 0, 0);
    }
    trail(x, y, z, col, big) {
      this.smoke.spawn(x, y, z, (Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6, big ? 2.2 : 1.2, big ? 1.4 : 0.8, big ? 5 : 3, col || 0xcfcac2, big ? 0.5 : 0.4, 0.6, -0.2);
    }
    glowAt(x, y, z, col, size) { this.fire.spawn(x, y, z, 0, 0, 0, 0.05, size, size, col, 1, 0, 0); }
    decal(x, z, y, size) {
      let d;
      if (this.decals.length < 70) {
        d = new T.Mesh(this.decalGeo, new T.MeshBasicMaterial({ map: this.decalTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
        d.renderOrder = 1; this.scene.add(d); this.decals.push(d);
      } else { d = this.decals.shift(); this.decals.push(d); }
      d.position.set(x, y + 0.08, z); d.scale.set(size, 1, size); d.rotation.y = Math.random() * PI; d.material.opacity = 1; d.userData.age = 0;
    }
    emitter(obj, kind, dur, offY) { this.emitters.push({ obj, kind, t: 0, dur, offY: offY || 2 }); }
    update(dt, wind) {
      this.time += dt;
      this.smoke.update(dt); this.fire.update(dt); this.lines.update(dt);
      for (const L of this.lights) { if (L.t < L.max) { L.t += dt; L.l.intensity = L.i0 * Math.max(0, 1 - L.t / L.max); } else L.l.intensity = 0; }
      for (const d of this.decals) { d.userData.age += dt; if (d.userData.age > 40) d.material.opacity = Math.max(0, 1 - (d.userData.age - 40) / 20); }
      const wx = wind || 0;
      for (let i = this.emitters.length - 1; i >= 0; i--) {
        const e = this.emitters[i];
        e.t += dt;
        if (e.t > e.dur || !e.obj) { this.emitters.splice(i, 1); continue; }
        const p = e.obj.position || e.obj;
        const fade = 1 - e.t / e.dur;
        if (Math.random() < dt * 14 * this.q * fade) this.smoke.spawn(p.x + (Math.random() - 0.5) * 2, p.y + e.offY, p.z + (Math.random() - 0.5) * 2, wx * 0.3 + (Math.random() - 0.5), 2.5 + Math.random() * 2, (Math.random() - 0.5), 4 + Math.random() * 3, 3, 12, e.kind === 'fire' ? 0x2a2624 : 0x5a5650, 0.55, 0.3, -0.4);
        if (e.kind === 'fire' && Math.random() < dt * 20 * this.q * fade) this.fire.spawn(p.x + (Math.random() - 0.5) * 2.5, p.y + e.offY * 0.6, p.z + (Math.random() - 0.5) * 2.5, 0, 2 + Math.random() * 2, 0, 0.5 + Math.random() * 0.4, 2.5, 0.5, 0xff8a30, 0.9, 0.5, -1);
      }
    }
    dispose() {
      for (const p of [this.smoke, this.fire]) { this.scene.remove(p.pts); p.geo.dispose(); p.mat.dispose(); }
      this.scene.remove(this.lines.mesh); this.lines.geo.dispose();
      for (const L of this.lights) this.scene.remove(L.l);
      for (const d of this.decals) { this.scene.remove(d); d.material.dispose(); }
    }
  };

  // ------------------------------------------------------------ weather
  SM.Weather = class {
    constructor(scene, M, list, quality, cb) {
      this.scene = scene; this.M = M; this.list = list; this.cb = cb || (() => { });
      this.q = quality === 'low' ? 0.45 : quality === 'high' ? 1.2 : 0.8;
      this.cur = list[0]; this.from = list[0]; this.blend = 1; this.timer = 70 + Math.random() * 60;
      this.time = 0; this.flash = 0; this.nextBolt = 6;
      const cap = Math.round(6000 * this.q);
      this.cap = cap;
      // rain streaks
      this.rPos = new Float32Array(cap * 6); this.rSeed = new Float32Array(cap * 3);
      const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(this.rPos, 3).setUsage(T.DynamicDrawUsage)); rg.setDrawRange(0, 0);
      this.rainMat = new T.LineBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.35, depthWrite: false });
      this.rain = new T.LineSegments(rg, this.rainMat); this.rain.frustumCulled = false; this.rain.renderOrder = 7; scene.add(this.rain);
      // flakes / sand / ash
      this.fPos = new Float32Array(cap * 3); this.fSize = new Float32Array(cap); this.fCol = new Float32Array(cap * 4);
      const fg = new T.BufferGeometry();
      fg.setAttribute('position', new T.BufferAttribute(this.fPos, 3).setUsage(T.DynamicDrawUsage));
      fg.setAttribute('aSize', new T.BufferAttribute(this.fSize, 1).setUsage(T.DynamicDrawUsage));
      fg.setAttribute('aCol', new T.BufferAttribute(this.fCol, 4).setUsage(T.DynamicDrawUsage));
      fg.setDrawRange(0, 0);
      this.flakeMat = new T.ShaderMaterial({ uniforms: { uTex: { value: SM.spriteTexture() }, uScale: { value: 400 }, uFogCol: { value: new T.Color() }, uFogD: { value: 0 }, uFogAmt: { value: 0.4 } }, vertexShader: PVS, fragmentShader: PFS, transparent: true, depthWrite: false });
      this.flakes = new T.Points(fg, this.flakeMat); this.flakes.frustumCulled = false; this.flakes.renderOrder = 7; scene.add(this.flakes);
      for (let i = 0; i < cap; i++) { this.rSeed[i * 3] = (Math.random() - 0.5) * 220; this.rSeed[i * 3 + 1] = Math.random() * 90; this.rSeed[i * 3 + 2] = (Math.random() - 0.5) * 220; }
      this.boltLines = null;
    }
    def(id) { return SM.WEATHER[id || this.cur]; }
    mods() {
      const a = SM.WEATHER[this.from], b = SM.WEATHER[this.cur], t = this.blend;
      const L = k => (a[k] === undefined ? (k === 'burnInf' || k === 'corrode' ? 0 : 1) : a[k]) * (1 - t) + (b[k] === undefined ? (k === 'burnInf' || k === 'corrode' ? 0 : 1) : b[k]) * t;
      return { sight: L('sight'), acc: L('acc'), speed: L('speed'), air: L('air'), burnInf: L('burnInf'), corrode: L('corrode'), energy: L('energy'), navalSlow: L('navalSlow'), light: L('light') };
    }
    set(id, instant) {
      if (id === this.cur) return;
      this.from = this.blend >= 1 ? this.cur : this.cur;
      this.cur = id; this.blend = instant ? 1 : 0;
      this.cb(id);
    }
    lerpVal(k, def) { const a = SM.WEATHER[this.from][k], b = SM.WEATHER[this.cur][k]; const va = a === undefined ? def : a, vb = b === undefined ? def : b; return va * (1 - this.blend) + vb * this.blend; }
    update(dt, center, env) {
      this.time += dt;
      if (this.blend < 1) this.blend = Math.min(1, this.blend + dt / 10);
      this.timer -= dt;
      if (this.timer <= 0 && this.list.length > 1) {
        this.timer = 80 + Math.random() * 80;
        const opts = this.list.filter(w => w !== this.cur);
        this.set(opts[Math.floor(Math.random() * opts.length)]);
      }
      const A = SM.WEATHER[this.from], B = SM.WEATHER[this.cur], t = this.blend;
      // particle amounts: fade old type out, new type in
      const wind = this.lerpVal('wind', 3);
      const rainN = Math.round(((A.p === 'rain' ? A.n * (1 - t) : 0) + (B.p === 'rain' ? B.n * t : 0)) * this.q);
      const pt = B.p && B.p !== 'rain' ? B.p : (A.p && A.p !== 'rain' ? A.p : null);
      const flakeN = Math.round(((A.p && A.p !== 'rain' ? A.n * (1 - t) : 0) + (B.p && B.p !== 'rain' ? B.n * t : 0)) * this.q);
      const cx = center.x, cz = center.z, cy = center.y;
      const nR = Math.min(this.cap, rainN);
      const rc = B.rainColor || A.rainColor || 0xaabbcc;
      this.rainMat.color.setHex(rc); this.rainMat.opacity = (B.rainColor ? 0.5 : 0.32) * (0.6 + 0.4 * (env ? env.light : 1));
      for (let i = 0; i < nR; i++) {
        let y = this.rSeed[i * 3 + 1] - (this.time * 70 + i * 3.7) % 90;
        if (y < 0) y += 90;
        let x = ((this.rSeed[i * 3] + this.time * wind * 0.6) % 220 + 330) % 220 - 110 + cx;
        const z = this.rSeed[i * 3 + 2] + cz;
        const yy = cy - 10 + y;
        this.rPos.set([x, yy, z, x + wind * 0.03, yy + 2.2, z], i * 6);
      }
      this.rain.geometry.setDrawRange(0, nR * 2); if (nR) this.rain.geometry.attributes.position.needsUpdate = true;
      const nF = Math.min(this.cap, flakeN);
      if (pt) {
        const P = { snow: [0xffffff, 0.9, 9, 0.85, 1.2], sand: [0xd8b07a, 0.7, 2, 0.5, 4], ash: [0x6a6460, 0.8, 4, 0.7, 0.8], ember: [0xff8a3a, 1.0, -3, 1, 0.6], spark: [0xb08aff, 1.0, 1, 1, 1.5], haze: [0xffe8c0, 0.1, -1, 0.15, 20], mist: [0xe0e6ea, 0.12, 0.3, 0.2, 26] }[pt] || [0xffffff, 0.8, 6, 0.8, 1];
        const col = pt === 'sand' && B.fogColor ? B.fogColor : P[0];
        const r = ((col >> 16) & 255) / 255, g = ((col >> 8) & 255) / 255, bb = (col & 255) / 255;
        this.flakeMat.blending = pt === 'ember' || pt === 'spark' ? T.AdditiveBlending : T.NormalBlending;
        for (let i = 0; i < nF; i++) {
          const fall = P[2];
          let y = this.rSeed[i * 3 + 1] - ((this.time * fall + i * 1.3) % 90 + 90) % 90;
          if (y < 0) y += 90;
          if (pt === 'sand' || pt === 'mist' || pt === 'haze') y = (this.rSeed[i * 3 + 1] * 0.35) % 30;
          const sway = Math.sin(this.time * 0.8 + i) * 2;
          const x = ((this.rSeed[i * 3] + this.time * wind * (pt === 'sand' ? 1.6 : 0.5) + sway) % 220 + 330) % 220 - 110 + cx;
          const z = this.rSeed[i * 3 + 2] + cz + Math.cos(this.time * 0.6 + i) * 1.5;
          this.fPos[i * 3] = x; this.fPos[i * 3 + 1] = cy - 10 + y; this.fPos[i * 3 + 2] = z;
          this.fSize[i] = P[4] * (0.6 + (i % 7) * 0.12);
          this.fCol[i * 4] = r; this.fCol[i * 4 + 1] = g; this.fCol[i * 4 + 2] = bb;
          this.fCol[i * 4 + 3] = P[1] * (pt === 'spark' || pt === 'ember' ? 0.5 + 0.5 * Math.sin(this.time * 6 + i) : 1);
        }
      }
      this.flakes.geometry.setDrawRange(0, pt ? nF : 0);
      if (nF && pt) { const a = this.flakes.geometry.attributes; a.position.needsUpdate = true; a.aSize.needsUpdate = true; a.aCol.needsUpdate = true; }
      // lightning
      this.flash = SM.clamp(this.flash - dt * 4, 0, 1);
      const lt = this.lerpVal('lightning', 0);
      let strike = null;
      if (lt > 0.05) {
        this.nextBolt -= dt * lt;
        if (this.nextBolt <= 0) {
          this.nextBolt = 4 + Math.random() * 9;
          const bx = cx + (Math.random() - 0.5) * 260, bz = cz + (Math.random() - 0.5) * 200;
          strike = { x: bx, z: bz, col: B.boltColor || 0xddeeff };
          this.flash = 1;
        }
      }
      return { wind, strike };
    }
    dispose() { this.scene.remove(this.rain); this.scene.remove(this.flakes); this.rain.geometry.dispose(); this.flakes.geometry.dispose(); }
  };
})();
