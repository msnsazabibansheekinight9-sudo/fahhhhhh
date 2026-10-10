// Kestrel — particles (sparks, smoke, fire, blood, steam), decals and light flashes.
(function () {
  const K = window.K;
  class Pool {
    constructor(scene, n, additive, soft) {
      this.n = n; this.i = 0;
      const g = this.g = new THREE.BufferGeometry();
      this.p = new Float32Array(n * 3); this.c = new Float32Array(n * 3); this.s = new Float32Array(n); this.a = new Float32Array(n);
      this.v = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grav = new Float32Array(n); this.drag = new Float32Array(n); this.grow = new Float32Array(n); this.s0 = new Float32Array(n);
      g.setAttribute('position', new THREE.BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.c, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(this.s, 1)); g.setAttribute('aAlpha', new THREE.BufferAttribute(this.a, 1));
      for (let k = 0; k < n; k++) this.p[k * 3 + 1] = -999;
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, vertexColors: true,
        uniforms: { scale: { value: 600 }, soft: { value: soft ? 1 : 0 } },
        vertexShader: 'uniform float scale; attribute float aSize; attribute float aAlpha; varying vec3 vC; varying float vA; void main(){ vC=color; vA=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(aSize*scale/max(.05,-mv.z),0.0,256.0); }',
        fragmentShader: 'uniform float soft; varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-.5; float r=length(d)*2.0; if(r>1.0) discard; float a = soft>0.5 ? (1.0-r)*(1.0-r)*(0.75+0.25*sin(d.x*19.0+d.y*13.0)) : pow(1.0-r,1.5); gl_FragColor=vec4(vC, a*vA); }',
      });
      this.pts = new THREE.Points(g, m); this.pts.frustumCulled = false; this.pts.renderOrder = 5; scene.add(this.pts);
    }
    spawn(x, y, z, vx, vy, vz, life, size, r, g, b, grav = 0, drag = 0, grow = 0) {
      const k = this.i; this.i = (this.i + 1) % this.n;
      this.p[k * 3] = x; this.p[k * 3 + 1] = y; this.p[k * 3 + 2] = z; this.v[k * 3] = vx; this.v[k * 3 + 1] = vy; this.v[k * 3 + 2] = vz;
      this.c[k * 3] = r; this.c[k * 3 + 1] = g; this.c[k * 3 + 2] = b; this.life[k] = life; this.max[k] = life; this.s[k] = size; this.s0[k] = size; this.grav[k] = grav; this.drag[k] = drag; this.grow[k] = grow; this.a[k] = 1;
    }
    update(dt, collide) {
      const p = this.p, v = this.v;
      for (let k = 0; k < this.n; k++) {
        if (this.life[k] <= 0) continue;
        this.life[k] -= dt;
        if (this.life[k] <= 0) { p[k * 3 + 1] = -999; this.a[k] = 0; continue; }
        const dr = Math.exp(-this.drag[k] * dt);
        v[k * 3] *= dr; v[k * 3 + 1] = v[k * 3 + 1] * dr - this.grav[k] * dt; v[k * 3 + 2] *= dr;
        p[k * 3] += v[k * 3] * dt; p[k * 3 + 1] += v[k * 3 + 1] * dt; p[k * 3 + 2] += v[k * 3 + 2] * dt;
        if (p[k * 3 + 1] < .01) { p[k * 3 + 1] = .01; v[k * 3 + 1] *= -.3; v[k * 3] *= .6; v[k * 3 + 2] *= .6; }
        const t = 1 - this.life[k] / this.max[k];
        this.s[k] = this.s0[k] * (1 + this.grow[k] * t);
        this.a[k] = t < .1 ? t * 10 : 1 - Math.pow(t, 1.6);
      }
      this.g.attributes.position.needsUpdate = true; this.g.attributes.aSize.needsUpdate = true; this.g.attributes.aAlpha.needsUpdate = true; this.g.attributes.color.needsUpdate = true;
    }
  }
  function holeTex(kind) {
    const c = K.canvas(64), x = c.getContext('2d');
    if (kind === 'hole') { const g = x.createRadialGradient(32, 32, 1, 32, 32, 30); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.18, 'rgba(10,8,6,.95)'); g.addColorStop(.3, 'rgba(60,55,50,.6)'); g.addColorStop(1, 'rgba(20,18,16,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
    else if (kind === 'acid') { const r = K.rng(4); for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(${120 + r() * 40},${170 + r() * 50},30,${.6 + r() * .4})`; x.beginPath(); x.arc(32 + (r() - .5) * 40, 32 + (r() - .5) * 40, 2 + r() * 8, 0, K.TAU); x.fill(); } }
    else { const r = K.rng(8); for (let i = 0; i < 22; i++) { x.fillStyle = `rgba(${70 + r() * 30},4,3,${.7 + r() * .3})`; x.beginPath(); x.arc(32 + (r() - .5) * 44, 32 + (r() - .5) * 44, 1.5 + r() * 9, 0, K.TAU); x.fill(); } }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  class FX {
    constructor(scene, G) {
      this.G = G; this.scene = scene;
      this.spark = new Pool(scene, 700, true, false);
      this.fire = new Pool(scene, 700, true, true);
      this.smoke = new Pool(scene, 500, false, true);
      this.blood = new Pool(scene, 500, false, false);
      this.decals = []; this.di = 0;
      const mats = { hole: holeTex('hole'), blood: holeTex('blood'), acid: holeTex('acid') };
      this.decalMats = {};
      for (const k in mats) this.decalMats[k] = new THREE.MeshStandardMaterial({ map: mats[k], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: .6 });
      const pg = new THREE.PlaneGeometry(1, 1);
      for (let k = 0; k < 120; k++) { const m = new THREE.Mesh(pg, this.decalMats.hole); m.visible = false; scene.add(m); this.decals.push(m); }
      // flash lights pool
      this.flashes = [];
      for (let k = 0; k < 3; k++) { const l = new THREE.PointLight(0xffaa55, 0, 10, 2); scene.add(l); this.flashes.push({ l, t: 0, max: 0, i: 0 }); }
    }
    flash(x, y, z, color, intensity, dur, dist = 10) {
      const f = this.flashes.reduce((a, b) => a.t < b.t ? a : b); f.l.position.set(x, y, z); f.l.color.set(color); f.l.distance = dist; f.t = dur; f.max = dur; f.i = intensity;
    }
    decal(x, y, z, nx, ny, nz, kind = 'hole', size = .12) {
      const m = this.decals[this.di]; this.di = (this.di + 1) % this.decals.length;
      m.material = this.decalMats[kind]; m.visible = true; m.scale.setScalar(size * (kind === 'hole' ? 1 : 3 + Math.random() * 3));
      m.position.set(x + nx * .01, y + ny * .01, z + nz * .01);
      m.lookAt(x + nx, y + ny, z + nz); m.rotateZ(Math.random() * 6);
    }
    sparks(x, y, z, nx, ny, nz, n = 10, hot = 1) {
      for (let k = 0; k < n; k++) {
        const s = 1.5 + Math.random() * 4;
        this.spark.spawn(x, y, z, (nx + (Math.random() - .5) * 1.4) * s, (ny + Math.random() * .8) * s, (nz + (Math.random() - .5) * 1.4) * s, .15 + Math.random() * .4, .02 + Math.random() * .02, 1, .65 * hot + .2, .25 * hot, 9.8, 1.5);
      }
      this.smoke.spawn(x, y, z, nx * .3, .2, nz * .3, 1.2, .12, .25, .24, .22, -.1, 1.5, 4);
    }
    bloodHit(x, y, z, dx, dz, kind = 'red', n = 14) {
      const [r, g, b] = kind === 'acid' ? [.35, .5, .08] : kind === 'pale' ? [.4, .38, .3] : [.25, .015, .01];
      for (let k = 0; k < n; k++) { const s = .8 + Math.random() * 2.5; this.blood.spawn(x, y, z, (dx + (Math.random() - .5)) * s, (Math.random() * 1.2) * s, (dz + (Math.random() - .5)) * s, .4 + Math.random() * .5, .03 + Math.random() * .04, r, g, b, 9.8, .5); }
    }
    gore(p, scale = 1) { this.bloodHit(p.x, p.y, p.z, 0, 0, 'red', Math.floor(30 * scale)); for (let k = 0; k < 6 * scale; k++) this.smoke.spawn(p.x, p.y, p.z, (Math.random() - .5), Math.random() * .5, (Math.random() - .5), 1, .15, .18, .02, .01, 0, 2, 3); }
    flame(x, y, z, dx, dy, dz, vel) {
      for (let k = 0; k < 4; k++) {
        const s = vel * (.85 + Math.random() * .3), j = .12;
        this.fire.spawn(x, y, z, (dx + (Math.random() - .5) * j) * s, (dy + (Math.random() - .5) * j) * s + .3, (dz + (Math.random() - .5) * j) * s, .45 + Math.random() * .25, .07, 1, .45 + Math.random() * .2, .12, -1.5, 1.6, 9);
      }
      if (Math.random() < .5) this.smoke.spawn(x + dx * 3, y + dy * 3 + .3, z + dz * 3, dx * 2, 1, dz * 2, 1.4, .3, .08, .07, .06, -.5, 1, 4);
    }
    explosion(x, y, z) {
      for (let k = 0; k < 90; k++) { const a = Math.random() * K.TAU, e = Math.random() * 1.2 - .2, s = 2 + Math.random() * 6; this.fire.spawn(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + 1, Math.sin(a) * Math.cos(e) * s, .5 + Math.random() * .5, .25, 1, .5, .15, -1, 3, 5); }
      for (let k = 0; k < 40; k++) this.smoke.spawn(x, y + .5, z, (Math.random() - .5) * 3, Math.random() * 2, (Math.random() - .5) * 3, 2.5 + Math.random() * 2, .5, .1, .09, .08, -.3, 1, 5);
      this.sparks(x, y, z, 0, 1, 0, 40, 1);
      this.flash(x, y + .5, z, 0xff8833, 18, .6, 18);
    }
    steam(x, y, z, k = 1) { for (let i = 0; i < 2 * k; i++) this.smoke.spawn(x, y, z, (Math.random() - .5) * .4, -.4 - Math.random() * .6, (Math.random() - .5) * .4, 1.8, .25, .55, .57, .6, -.15, 1.2, 6); }
    dust(x, y, z) { this.smoke.spawn(x, y, z, (Math.random() - .5) * .1, (Math.random() - .5) * .05, (Math.random() - .5) * .1, 6, .015, .5, .48, .44, 0, 0, 0); }
    update(dt) {
      this.spark.update(dt); this.fire.update(dt); this.smoke.update(dt); this.blood.update(dt);
      for (const f of this.flashes) { f.t = Math.max(0, f.t - dt); f.l.intensity = f.max ? f.i * (f.t / f.max) : 0; }
    }
  }
  K.FX = FX;
})();
