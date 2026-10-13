'use strict';
/* Crumble — particles: tumbling voxel chips, flames, smoke, sparks; flash lights and camera shake. */

const FX = {
  CHIPS: 1800, chipN: 0,
  init(scene) {
    this.scene = scene;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.chipMesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), this.CHIPS);
    this.chipMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.chipMesh.setColorAt(0, new THREE.Color());
    this.chipMesh.castShadow = false; this.chipMesh.frustumCulled = false; this.chipMesh.count = 0;
    scene.add(this.chipMesh);
    const N = this.CHIPS;
    this.cp = new Float32Array(N * 3); this.cv = new Float32Array(N * 3); this.cr = new Float32Array(N * 3); this.cw = new Float32Array(N * 3);
    this.cl = new Float32Array(N); this.cs = new Float32Array(N); this.cc = new Float32Array(N * 3);
    this.fire = this.makePoints(2600, THREE.AdditiveBlending);
    this.smk = this.makePoints(1600, THREE.NormalBlending);
    this.flashes = [];
    for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffb060, 0, 90, 1.5); scene.add(l); this.flashes.push({ l, t: 0, d: 1, i0: 0 }); }
    this.shake = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._c = new THREE.Color();
  },
  makePoints(cap, blending) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(cap * 3), rgba = new Float32Array(cap * 4), size = new Float32Array(cap);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rgba', new THREE.BufferAttribute(rgba, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 600 } }, transparent: true, depthWrite: false, blending,
      vertexShader: 'attribute float size; attribute vec4 rgba; uniform float scale; varying vec4 vC; void main(){ vC=rgba; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=min(400.0,size*scale/max(0.5,-mv.z)); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying vec4 vC; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d)*4.0; if(r>1.0) discard; gl_FragColor=vec4(vC.rgb, vC.a*(1.0-r)*(1.0-r)); }'
    });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; this.scene.add(pts);
    return { pts, g, pos, rgba, size, cap, n: 0, vel: new Float32Array(cap * 3), life: new Float32Array(cap), max: new Float32Array(cap), s0: new Float32Array(cap), kind: new Uint8Array(cap), a0: new Float32Array(cap) };
  },
  setScale(px) { this.fire.pts.material.uniforms.scale.value = px; this.smk.pts.material.uniforms.scale.value = px; },

  chip(x, y, z, r, g, b, vx, vy, vz, size) {
    if (this.chipN >= this.CHIPS) return;
    const i = this.chipN++;
    this.cp[i * 3] = x; this.cp[i * 3 + 1] = y; this.cp[i * 3 + 2] = z;
    this.cv[i * 3] = vx; this.cv[i * 3 + 1] = vy; this.cv[i * 3 + 2] = vz;
    this.cr[i * 3] = Math.random() * 6; this.cr[i * 3 + 1] = Math.random() * 6; this.cr[i * 3 + 2] = Math.random() * 6;
    this.cw[i * 3] = (Math.random() - 0.5) * 14; this.cw[i * 3 + 1] = (Math.random() - 0.5) * 14; this.cw[i * 3 + 2] = (Math.random() - 0.5) * 14;
    this.cl[i] = 1.5 + Math.random() * 2; this.cs[i] = size || (0.25 + Math.random() * 0.45);
    this.cc[i * 3] = r; this.cc[i * 3 + 1] = g; this.cc[i * 3 + 2] = b;
  },
  // Chips flying out of a carve result's samples.
  burst(samples, cx, cy, cz, speed) {
    const tmp = [0, 0, 0];
    for (let k = 0; k < samples.length; k += 5) {
      const x = samples[k], y = samples[k + 1], z = samples[k + 2];
      voxRGB(samples[k + 3], x, y, z, samples[k + 4], tmp);
      let dx = x + 0.5 - cx, dy = y + 0.5 - cy, dz = z + 0.5 - cz; const l = Math.hypot(dx, dy, dz) || 1;
      dx /= l; dy /= l; dz /= l;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.chip(x + 0.5, y + 0.5, z + 0.5, tmp[0], tmp[1], tmp[2], dx * s + (Math.random() - 0.5) * 4, dy * s + 4 + Math.random() * 6, dz * s + (Math.random() - 0.5) * 4);
      if (MATS[samples[k + 3]].hard >= 2 && Math.random() < 0.3) this.dust(x + 0.5, y + 0.5, z + 0.5);
    }
  },
  addP(P, x, y, z, vx, vy, vz, life, size, kind, a) {
    if (P.n >= P.cap) return;
    const i = P.n++;
    P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z;
    P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz;
    P.life[i] = life; P.max[i] = life; P.s0[i] = size; P.kind[i] = kind; P.a0[i] = a;
  },
  flame(x, y, z, s) { this.addP(this.fire, x, y, z, (Math.random() - 0.5) * 1.5, 5 + Math.random() * 4, (Math.random() - 0.5) * 1.5, 0.35 + Math.random() * 0.4, s, 0, 1); },
  spark(x, y, z, vx, vy, vz) { this.addP(this.fire, x, y, z, vx, vy, vz, 0.3 + Math.random() * 0.5, 0.35, 1, 1); },
  fireball(x, y, z, r) {
    for (let k = 0; k < 70; k++) {
      const a = Math.random() * 6.283, b = Math.acos(Math.random() * 2 - 1), s = r * (0.6 + Math.random() * 1.6);
      this.addP(this.fire, x, y, z, Math.sin(b) * Math.cos(a) * s * 2.2, Math.cos(b) * s * 2.2 + 3, Math.sin(b) * Math.sin(a) * s * 2.2, 0.3 + Math.random() * 0.45, r * (0.5 + Math.random() * 0.7), 2, 1);
    }
    for (let k = 0; k < 40; k++) this.spark(x, y, z, (Math.random() - 0.5) * 60, Math.random() * 50, (Math.random() - 0.5) * 60);
  },
  smoke(x, y, z, s, a) { this.addP(this.smk, x, y, z, (Math.random() - 0.5) * 2, 2 + Math.random() * 3, (Math.random() - 0.5) * 2, 3 + Math.random() * 3, s, 0, a == null ? 0.5 : a); },
  dust(x, y, z) { this.addP(this.smk, x, y, z, (Math.random() - 0.5) * 6, Math.random() * 3, (Math.random() - 0.5) * 6, 1.5 + Math.random() * 2, 2 + Math.random() * 3, 1, 0.35); },
  steam(x, y, z) { this.addP(this.smk, x, y, z, (Math.random() - 0.5) * 6, 1 + Math.random() * 3, (Math.random() - 0.5) * 6, 1 + Math.random(), 2 + Math.random() * 2, 2, 0.45); },
  flash(x, y, z, intensity, dur) {
    const f = this.flashes.reduce((a, b) => (a.t < b.t ? a : b));
    f.l.position.set(x, y, z); f.t = dur; f.d = dur; f.i0 = intensity;
  },
  update(dt, world) {
    // Chips: gravity, bounce on voxels, fade by shrinking.
    let n = this.chipN;
    for (let i = 0; i < n; i++) {
      this.cl[i] -= dt;
      if (this.cl[i] <= 0) {
        n--;
        if (i !== n) {
          for (let a = 0; a < 3; a++) { this.cp[i * 3 + a] = this.cp[n * 3 + a]; this.cv[i * 3 + a] = this.cv[n * 3 + a]; this.cr[i * 3 + a] = this.cr[n * 3 + a]; this.cw[i * 3 + a] = this.cw[n * 3 + a]; this.cc[i * 3 + a] = this.cc[n * 3 + a]; }
          this.cl[i] = this.cl[n]; this.cs[i] = this.cs[n];
        }
        i--; continue;
      }
      const j = i * 3;
      this.cv[j + 1] -= G * dt;
      const nx = this.cp[j] + this.cv[j] * dt, ny = this.cp[j + 1] + this.cv[j + 1] * dt, nz = this.cp[j + 2] + this.cv[j + 2] * dt;
      if (SOLID[world.getf(nx, ny, nz)]) {
        if (SOLID[world.getf(this.cp[j], ny, this.cp[j + 2])]) { this.cv[j + 1] *= -0.3; this.cv[j] *= 0.6; this.cv[j + 2] *= 0.6; this.cw[j] *= 0.5; this.cw[j + 2] *= 0.5; }
        else { this.cv[j] *= -0.4; this.cv[j + 2] *= -0.4; }
      } else { this.cp[j] = nx; this.cp[j + 1] = ny; this.cp[j + 2] = nz; for (let a = 0; a < 3; a++) this.cr[j + a] += this.cw[j + a] * dt; }
    }
    this.chipN = n;
    const cm = this.chipMesh;
    for (let i = 0; i < n; i++) {
      const j = i * 3, s = this.cs[i] * Math.min(1, this.cl[i] * 2);
      this._e.set(this.cr[j], this.cr[j + 1], this.cr[j + 2]); this._q.setFromEuler(this._e);
      this._p.set(this.cp[j], this.cp[j + 1], this.cp[j + 2]); this._s.set(s, s, s);
      this._m.compose(this._p, this._q, this._s); cm.setMatrixAt(i, this._m);
      this._c.setRGB(this.cc[j], this.cc[j + 1], this.cc[j + 2]); cm.setColorAt(i, this._c);
    }
    cm.count = n; cm.instanceMatrix.needsUpdate = true; if (cm.instanceColor) cm.instanceColor.needsUpdate = true;

    this.updPoints(this.fire, dt, true);
    this.updPoints(this.smk, dt, false);
    for (const f of this.flashes) { if (f.t > 0) { f.t -= dt; f.l.intensity = f.i0 * Math.max(0, f.t / f.d); } else f.l.intensity = 0; }
    this.shake = Math.max(0, this.shake - dt * 2.5);
  },
  updPoints(P, dt, isFire) {
    let n = P.n;
    for (let i = 0; i < n; i++) {
      P.life[i] -= dt;
      if (P.life[i] <= 0) {
        n--;
        if (i !== n) {
          for (let a = 0; a < 3; a++) { P.pos[i * 3 + a] = P.pos[n * 3 + a]; P.vel[i * 3 + a] = P.vel[n * 3 + a]; }
          P.life[i] = P.life[n]; P.max[i] = P.max[n]; P.s0[i] = P.s0[n]; P.kind[i] = P.kind[n]; P.a0[i] = P.a0[n];
        }
        i--; continue;
      }
      const j = i * 3, k = P.kind[i], t = 1 - P.life[i] / P.max[i];
      if (isFire && k === 1) P.vel[j + 1] -= G * dt;
      else if (isFire) { P.vel[j] *= 1 - 2 * dt; P.vel[j + 1] = P.vel[j + 1] * (1 - 2 * dt) + 6 * dt; P.vel[j + 2] *= 1 - 2 * dt; }
      else { P.vel[j] *= 1 - 0.8 * dt; P.vel[j + 1] *= 1 - 0.5 * dt; P.vel[j + 2] *= 1 - 0.8 * dt; }
      P.pos[j] += P.vel[j] * dt; P.pos[j + 1] += P.vel[j + 1] * dt; P.pos[j + 2] += P.vel[j + 2] * dt;
      const c = i * 4;
      if (isFire) {
        if (k === 1) { P.rgba[c] = 1; P.rgba[c + 1] = 0.75; P.rgba[c + 2] = 0.3; P.rgba[c + 3] = 1 - t; P.size[i] = P.s0[i]; }
        else { P.rgba[c] = 1; P.rgba[c + 1] = 0.75 - t * 0.5; P.rgba[c + 2] = 0.35 - t * 0.33; P.rgba[c + 3] = (1 - t) * 0.85; P.size[i] = P.s0[i] * (1 - t * 0.5); }
      } else {
        const g = k === 2 ? 0.92 : k === 1 ? 0.62 : 0.32 - t * 0.1;
        P.rgba[c] = g; P.rgba[c + 1] = g * (k === 1 ? 0.95 : 1); P.rgba[c + 2] = g * (k === 1 ? 0.88 : 1);
        P.rgba[c + 3] = P.a0[i] * Math.min(1, t * 6) * (1 - t); P.size[i] = P.s0[i] * (1 + t * 2.2);
      }
    }
    P.n = n; P.g.setDrawRange(0, n);
    P.g.attributes.position.needsUpdate = true; P.g.attributes.rgba.needsUpdate = true; P.g.attributes.size.needsUpdate = true;
  },
  clear() { this.chipN = 0; this.fire.n = 0; this.smk.n = 0; this.shake = 0; for (const f of this.flashes) f.t = 0; }
};
