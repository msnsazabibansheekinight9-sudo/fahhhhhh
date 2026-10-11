// Visual effects: blaster bolt meshes, GPU particle systems, explosions, lightning beams, shield bubbles and weather.
var SF = window.SF || (window.SF = {});

(function () {
  var FX = SF.FX = {};
  var scene;

  // ------------------------------------------------------------------ particle system (single draw call)
  function Particles(max, additive) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.grow = new Float32Array(max); this.size0 = new Float32Array(max);
    var g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3); this.aPos.setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 3); this.aCol.setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1); this.aSize.setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.BufferAttribute(this.alpha, 1); this.aAlpha.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('color', this.aCol); g.setAttribute('size', this.aSize); g.setAttribute('alpha', this.aAlpha);
    g.setDrawRange(0, 0);
    var mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 600 } },
      vertexShader: 'attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;' +
        'void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*scale/max(0.5,-mv.z); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d)*4.0; if(r>1.0) discard; float a=vA*(1.0-r)' + (additive ? '' : '*(1.0-r*0.4)') + '; gl_FragColor=vec4(vC,a); }',
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 5 : 4;
    this.geo = g;
  }
  Particles.prototype.emit = function (x, y, z, vx, vy, vz, color, size, life, grav, drag, grow) {
    var i;
    if (this.n < this.max) i = this.n++;
    else i = (Math.random() * this.max) | 0;
    var i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    var c = typeof color === 'number' ? color : 0xffffff;
    this.col[i3] = ((c >> 16) & 255) / 255; this.col[i3 + 1] = ((c >> 8) & 255) / 255; this.col[i3 + 2] = (c & 255) / 255;
    this.size[i] = size; this.size0[i] = size; this.life[i] = life; this.maxLife[i] = life; this.grav[i] = grav || 0; this.drag[i] = drag || 0; this.grow[i] = grow || 0; this.alpha[i] = 1;
  };
  Particles.prototype.update = function (dt) {
    var n = this.n;
    for (var i = 0; i < n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        n--;
        if (i !== n) this.copy(n, i);
        i--; continue;
      }
      var i3 = i * 3, dr = 1 - this.drag[i] * dt;
      this.vel[i3] *= dr; this.vel[i3 + 1] = this.vel[i3 + 1] * dr - this.grav[i] * dt; this.vel[i3 + 2] *= dr;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      var t = this.life[i] / this.maxLife[i];
      this.alpha[i] = Math.min(1, t * 2.2);
      this.size[i] = this.size0[i] * (1 + this.grow[i] * (1 - t));
    }
    this.n = n;
    this.geo.setDrawRange(0, n);
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSize.needsUpdate = true; this.aAlpha.needsUpdate = true;
  };
  Particles.prototype.copy = function (from, to) {
    var f3 = from * 3, t3 = to * 3;
    for (var k = 0; k < 3; k++) { this.pos[t3 + k] = this.pos[f3 + k]; this.vel[t3 + k] = this.vel[f3 + k]; this.col[t3 + k] = this.col[f3 + k]; }
    this.size[to] = this.size[from]; this.size0[to] = this.size0[from]; this.alpha[to] = this.alpha[from]; this.life[to] = this.life[from]; this.maxLife[to] = this.maxLife[from];
    this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from]; this.grow[to] = this.grow[from];
  };
  Particles.prototype.clear = function () { this.n = 0; this.geo.setDrawRange(0, 0); };

  // ------------------------------------------------------------------ bolt meshes
  var boltGeo = new THREE.BoxGeometry(0.07, 0.07, 1);
  var glowGeo = new THREE.BoxGeometry(0.22, 0.22, 1.15);
  var boltMats = {}, glowMats = {};
  function boltMat(color) {
    if (!boltMats[color]) {
      boltMats[color] = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
      glowMats[color] = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    }
    return boltMats[color];
  }
  var pool = [];
  FX.boltMesh = function (color, len, thick) {
    var m = pool.pop();
    boltMat(color);
    if (!m) {
      m = new THREE.Group();
      var core = new THREE.Mesh(boltGeo, boltMats[color]); var gl = new THREE.Mesh(glowGeo, glowMats[color]);
      m.add(core); m.add(gl); m.userData.core = core; m.userData.glow = gl;
    } else {
      m.userData.core.material = boltMats[color]; m.userData.glow.material = glowMats[color];
    }
    m.scale.set(thick || 1, thick || 1, len || 2.2);
    m.visible = true;
    scene.add(m);
    return m;
  };
  FX.freeBolt = function (m) { scene.remove(m); pool.push(m); };

  // generic mesh-based projectiles (rocket, grenade)
  var rocketGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6); rocketGeo.rotateX(Math.PI / 2);
  var grenGeo = new THREE.SphereGeometry(0.12, 8, 6);
  FX.rocketMesh = function () { var m = new THREE.Mesh(rocketGeo, SF.Models.mat(0x555a62, 0.5, 0.5)); scene.add(m); return m; };
  FX.grenadeMesh = function (color) { var m = new THREE.Mesh(grenGeo, SF.Models.mat(color || 0x3a3e44, 0.4, 0.6)); scene.add(m); return m; };
  FX.removeMesh = function (m) { if (m) scene.remove(m); };

  FX.init = function (sc) {
    scene = sc;
    FX.add = new Particles(5000, true);
    FX.smoke = new Particles(2500, false);
    scene.add(FX.add.points); scene.add(FX.smoke.points);
    FX.flashes = [];
    FX.beams = [];
    FX.rings = [];
    pool.length = 0;
  };
  FX.setScale = function (h) { FX.add.points.material.uniforms.scale.value = h * 0.9; FX.smoke.points.material.uniforms.scale.value = h * 0.9; };

  function rnd(a) { return (Math.random() - 0.5) * 2 * a; }
  FX.muzzle = function (p, color) {
    FX.add.emit(p.x, p.y, p.z, 0, 0, 0, color, 0.45, 0.06, 0, 0, 0);
    FX.add.emit(p.x, p.y, p.z, rnd(1), rnd(1), rnd(1), 0xffffff, 0.2, 0.05, 0, 0, 0);
  };
  FX.sparks = function (p, color, n, speed) {
    n = n || 8;
    for (var i = 0; i < n; i++) FX.add.emit(p.x, p.y, p.z, rnd(speed || 5), rnd(speed || 5) + 2, rnd(speed || 5), color || 0xffcc66, 0.12 + Math.random() * 0.1, 0.25 + Math.random() * 0.3, 9, 1.5, 0);
    FX.add.emit(p.x, p.y, p.z, 0, 0, 0, color || 0xffcc66, 0.7, 0.08, 0, 0, 0);
  };
  FX.dust = function (p, color, n) {
    for (var i = 0; i < (n || 4); i++) FX.smoke.emit(p.x + rnd(0.3), p.y + 0.2, p.z + rnd(0.3), rnd(1), Math.random() * 1.2, rnd(1), color || 0x9a8a70, 0.6 + Math.random() * 0.5, 0.6 + Math.random() * 0.5, -0.3, 1.5, 2);
  };
  FX.blood = function (p, droid) {
    for (var i = 0; i < 5; i++) FX.add.emit(p.x, p.y, p.z, rnd(2), rnd(2) + 1, rnd(2), droid ? 0xffaa44 : 0xff6633, 0.12, 0.2, 6, 1, 0);
  };
  FX.explosion = function (p, radius, color) {
    radius = radius || 4;
    var big = radius > 7;
    for (var i = 0; i < 26 + radius * 4; i++) {
      var sp = radius * (0.8 + Math.random() * 1.6);
      FX.add.emit(p.x, p.y + 0.3, p.z, rnd(sp), rnd(sp) * 0.7 + sp * 0.4, rnd(sp), Math.random() < 0.5 ? (color || 0xffa040) : 0xffe08a, radius * (0.25 + Math.random() * 0.3), 0.35 + Math.random() * 0.4, 2, 3, 1.5);
    }
    for (i = 0; i < 16 + radius * 2; i++) FX.add.emit(p.x, p.y + 0.3, p.z, rnd(radius * 4), rnd(radius * 3) + radius * 2, rnd(radius * 4), 0xffcc66, 0.12, 0.6 + Math.random() * 0.6, 14, 0.6, 0);
    for (i = 0; i < 14 + radius * 2; i++) FX.smoke.emit(p.x + rnd(radius * 0.4), p.y + 0.5 + Math.random() * radius * 0.4, p.z + rnd(radius * 0.4), rnd(radius * 0.6), radius * (0.3 + Math.random() * 0.5), rnd(radius * 0.6), Math.random() < 0.5 ? 0x3a3632 : 0x5a5650, radius * (0.5 + Math.random() * 0.5), 1.4 + Math.random() * 1.4, -0.4, 1.2, 2.5);
    FX.flash(p, radius * 2.4, color || 0xffb060, 0.25);
    SF.Audio.explosion(p, big);
  };
  // expanding glow sphere
  var flashGeo = new THREE.SphereGeometry(1, 14, 10);
  FX.flash = function (p, size, color, life) {
    var m = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(p); m.scale.setScalar(size * 0.3);
    scene.add(m);
    FX.flashes.push({ m: m, t: 0, life: life || 0.3, size: size });
  };
  FX.ring = function (p, radius, color, life) {
    var m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.copy(p); m.position.y += 0.3;
    scene.add(m);
    FX.rings.push({ m: m, t: 0, life: life || 0.5, r: radius });
  };
  // jagged lightning between points, lasts a few frames
  FX.lightning = function (a, b, color) {
    var pts = [], n = 8;
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t + (i && i < n ? rnd(0.5) : 0), a.y + (b.y - a.y) * t + (i && i < n ? rnd(0.5) : 0), a.z + (b.z - a.z) * t + (i && i < n ? rnd(0.5) : 0)));
    }
    var g = new THREE.BufferGeometry().setFromPoints(pts);
    var l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: color || 0x9ab8ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }));
    scene.add(l);
    FX.beams.push({ m: l, t: 0, life: 0.08 });
    FX.add.emit(b.x, b.y, b.z, 0, 0, 0, color || 0x9ab8ff, 0.5, 0.08, 0, 0, 0);
  };
  FX.beam = function (a, b, color, width, life) {
    var d = new THREE.Vector3().subVectors(b, a), len = d.length();
    var m = new THREE.Mesh(boltGeo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(a).addScaledVector(d, 0.5); m.lookAt(b); m.scale.set(width || 3, width || 3, len);
    scene.add(m);
    FX.beams.push({ m: m, t: 0, life: life || 0.1, fade: true });
  };
  FX.flame = function (p, dir, range, spread) {
    for (var i = 0; i < 4; i++) {
      var s = range * (2.2 + Math.random());
      FX.add.emit(p.x, p.y, p.z, dir.x * s + rnd(spread), dir.y * s + rnd(spread) + 1, dir.z * s + rnd(spread), Math.random() < 0.5 ? 0xff8a20 : 0xffd040, 0.35, 0.35 + Math.random() * 0.15, -2, 0.5, 3);
    }
    if (Math.random() < 0.3) FX.smoke.emit(p.x + dir.x * range * 0.7, p.y + 1, p.z + dir.z * range * 0.7, rnd(1), 2, rnd(1), 0x2a2622, 1.2, 1, -0.5, 1, 2);
  };
  FX.jet = function (p) { FX.add.emit(p.x, p.y, p.z, rnd(0.5), -6 - Math.random() * 4, rnd(0.5), Math.random() < 0.5 ? 0xff9a3a : 0x9ac8ff, 0.3, 0.18, 0, 0, 1); FX.smoke.emit(p.x, p.y - 0.4, p.z, rnd(0.5), -2, rnd(0.5), 0x8a8682, 0.4, 0.5, 0, 1, 2); };
  FX.engine = function (p, color, size) { FX.add.emit(p.x, p.y, p.z, rnd(0.3), rnd(0.3), rnd(0.3), color || 0xff8a40, size || 0.6, 0.12, 0, 0, -0.5); };
  FX.hitWall = function (p, color) { FX.sparks(p, color, 6, 3); FX.smoke.emit(p.x, p.y, p.z, rnd(0.4), 0.5, rnd(0.4), 0x6a6460, 0.4, 0.6, 0, 1, 2); };
  FX.healAura = function (p, color) { for (var i = 0; i < 18; i++) { var a = i / 18 * Math.PI * 2; FX.add.emit(p.x + Math.cos(a) * 2, p.y + 0.4, p.z + Math.sin(a) * 2, Math.cos(a) * 3, 2, Math.sin(a) * 3, color || 0x5aff8a, 0.3, 0.6, 0, 1, 0); } };

  FX.update = function (dt, camPos) {
    FX.add.update(dt); FX.smoke.update(dt);
    for (var i = FX.flashes.length - 1; i >= 0; i--) {
      var f = FX.flashes[i]; f.t += dt;
      var k = f.t / f.life;
      if (k >= 1) { scene.remove(f.m); f.m.material.dispose(); FX.flashes.splice(i, 1); continue; }
      f.m.scale.setScalar(f.size * (0.3 + k * 0.7)); f.m.material.opacity = 0.8 * (1 - k);
    }
    for (i = FX.rings.length - 1; i >= 0; i--) {
      var r = FX.rings[i]; r.t += dt; var kk = r.t / r.life;
      if (kk >= 1) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); FX.rings.splice(i, 1); continue; }
      r.m.scale.setScalar(r.r * (0.2 + kk * 0.8)); r.m.material.opacity = 0.8 * (1 - kk);
    }
    for (i = FX.beams.length - 1; i >= 0; i--) {
      var b = FX.beams[i]; b.t += dt;
      if (b.t >= b.life) { scene.remove(b.m); if (b.m.geometry !== boltGeo) b.m.geometry.dispose(); b.m.material.dispose(); FX.beams.splice(i, 1); continue; }
      if (b.fade) b.m.material.opacity = 0.9 * (1 - b.t / b.life);
    }
    if (FX.weather) FX.weather.update(dt, camPos);
  };

  // ------------------------------------------------------------------ weather: snow / rain / embers / ash around the camera
  FX.setWeather = function (kind, density) {
    if (FX.weather) { scene.remove(FX.weather.points); FX.weather = null; }
    if (!kind) return;
    var n = Math.round(1500 * (density || 1));
    var g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), v = new Float32Array(n);
    for (var i = 0; i < n; i++) { p[i * 3] = rnd(40); p[i * 3 + 1] = Math.random() * 30; p[i * 3 + 2] = rnd(40); v[i] = 0.6 + Math.random() * 0.8; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    var color = kind === 'snow' ? 0xffffff : kind === 'rain' ? 0x9ab0c8 : 0xff8a3a;
    var mat = new THREE.PointsMaterial({ color: color, size: kind === 'rain' ? 0.06 : kind === 'snow' ? 0.14 : 0.1, transparent: true, opacity: kind === 'rain' ? 0.55 : 0.9, depthWrite: false, blending: kind === 'embers' ? THREE.AdditiveBlending : THREE.NormalBlending });
    var pts = new THREE.Points(g, mat); pts.frustumCulled = false;
    scene.add(pts);
    var center = new THREE.Vector3();
    FX.weather = {
      points: pts,
      update: function (dt, cam) {
        if (!cam) return;
        var a = g.attributes.position.array, fall = kind === 'rain' ? 22 : kind === 'snow' ? 2.2 : -1.2, drift = kind === 'snow' ? 1 : 0.3;
        var t = performance.now() * 0.001;
        for (var i = 0; i < n; i++) {
          a[i * 3 + 1] -= fall * v[i] * dt;
          a[i * 3] += Math.sin(t + i) * drift * dt;
          var dx = a[i * 3] - cam.x, dz = a[i * 3 + 2] - cam.z, dy = a[i * 3 + 1] - cam.y;
          if (dy < -12 || dy > 22) a[i * 3 + 1] = cam.y + (fall > 0 ? 18 : -10) + Math.random() * 3;
          if (dx > 40) a[i * 3] -= 80; if (dx < -40) a[i * 3] += 80;
          if (dz > 40) a[i * 3 + 2] -= 80; if (dz < -40) a[i * 3 + 2] += 80;
        }
        g.attributes.position.needsUpdate = true;
      }
    };
  };
})();
