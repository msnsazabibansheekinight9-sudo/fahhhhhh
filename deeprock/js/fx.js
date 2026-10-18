/* Rock & Stone — particles, tracers, explosions and the small amount of
   screen feedback that sells a pickaxe hit. One Points cloud and one
   LineSegments batch carry everything, so effects cost two draw calls. */
(function (RS) {
  'use strict';
  var MAXP = 2400, MAXT = 160;

  RS.Fx = function (game) {
    this.g = game;
    var scene = game.scene;

    // ---- particle cloud ------------------------------------------------
    this.n = MAXP;
    this.px = new Float32Array(MAXP * 3);
    this.vx = new Float32Array(MAXP * 3);
    this.life = new Float32Array(MAXP);
    this.maxLife = new Float32Array(MAXP);
    this.grav = new Float32Array(MAXP);
    this.drag = new Float32Array(MAXP);
    this.kind = new Uint8Array(MAXP);     // 0 dust 1 spark 2 blood 3 smoke 4 ember
    this.bcol = new Float32Array(MAXP * 3);  // colour at birth; drawn colour is this * fade
    this.bsize = new Float32Array(MAXP);
    this.head = 0;
    var pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(MAXP * 3), 3));
    pgeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(MAXP * 3), 3));
    pgeo.setAttribute('psize', new THREE.Float32BufferAttribute(new Float32Array(MAXP), 1));
    this.pgeo = pgeo;
    this.pcol = pgeo.attributes.color.array;
    this.psz = pgeo.attributes.psize.array;
    this.ppos = pgeo.attributes.position.array;

    // Points shader: round soft sprites, additive for sparks, sized in world units.
    var pmat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } },
      vertexShader:
        'attribute float psize; varying vec3 vCol;' +
        'uniform float uScale;' +
        'void main(){ vCol = color; vec4 mv = modelViewMatrix * vec4(position,1.0);' +
        'gl_PointSize = clamp(psize * uScale / max(0.6,-mv.z), 1.0, 110.0); gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'varying vec3 vCol;' +
        'void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d);' +
        'if(r > 0.25) discard; float a = 1.0 - r*4.0;' +
        'gl_FragColor = vec4(vCol, a); }',
      transparent: true, depthWrite: false, vertexColors: true,
      blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(pgeo, pmat);
    this.points.frustumCulled = false;
    pgeo.setDrawRange(0, MAXP);
    scene.add(this.points);

    // ---- tracers -------------------------------------------------------
    var tgeo = new THREE.BufferGeometry();
    tgeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(MAXT * 6), 3));
    tgeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(MAXT * 6), 3));
    this.tgeo = tgeo;
    this.tpos = tgeo.attributes.position.array;
    this.tcol = tgeo.attributes.color.array;
    this.tlife = new Float32Array(MAXT);
    this.thead = 0;
    this.tracers = new THREE.LineSegments(tgeo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.tracers.frustumCulled = false;
    scene.add(this.tracers);

    // ---- blast spheres -------------------------------------------------
    RS.initPrims();
    this.blasts = [];
    var bmat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    for (var i = 0; i < 8; i++) {
      var m = new THREE.Mesh(RS.PRIM.sphere, bmat.clone());
      m.visible = false; m.frustumCulled = false;
      scene.add(m);
      this.blasts.push({ mesh: m, t: 0, dur: 0, r: 1 });
    }

    // ---- pooled lights (fixed count, so shaders never recompile) -------
    this.fxLights = [];
    for (i = 0; i < 3; i++) {
      var L = new THREE.PointLight(0xffaa55, 0, 22, 1.8);
      L.visible = true;
      scene.add(L);
      this.fxLights.push({ light: L, t: 0, dur: 0, peak: 0 });
    }
    this.flashAmt = 0;
  };

  var F = RS.Fx.prototype;

  F.emit = function (x, y, z, vx, vy, vz, life, size, color, kind, grav, drag) {
    var i = this.head; this.head = (this.head + 1) % MAXP;
    this.px[i * 3] = x; this.px[i * 3 + 1] = y; this.px[i * 3 + 2] = z;
    this.vx[i * 3] = vx; this.vx[i * 3 + 1] = vy; this.vx[i * 3 + 2] = vz;
    this.life[i] = life; this.maxLife[i] = life;
    this.grav[i] = grav === undefined ? 1 : grav;
    this.drag[i] = drag === undefined ? 0.8 : drag;
    this.kind[i] = kind || 0;
    this.bsize[i] = size; this.psz[i] = size;
    var cr = ((color >> 16) & 255) / 255, cg = ((color >> 8) & 255) / 255, cb = (color & 255) / 255;
    this.bcol[i * 3] = cr; this.bcol[i * 3 + 1] = cg; this.bcol[i * 3 + 2] = cb;
    this.pcol[i * 3] = cr; this.pcol[i * 3 + 1] = cg; this.pcol[i * 3 + 2] = cb;
    this.ppos[i * 3] = x; this.ppos[i * 3 + 1] = y; this.ppos[i * 3 + 2] = z;
  };

  var ORE_COL = null;
  F.matColor = function (mat) {
    if (!ORE_COL) {
      var b = this.g.biome;
      ORE_COL = [b.rock2, b.dirt, RS.ORE.NITRA, RS.ORE.MORKITE, RS.ORE.GOLD, RS.ORE.CRYSTAL, b.hard, b.mud, b.ice];
    }
    return ORE_COL[mat] === undefined ? 0x888888 : ORE_COL[mat];
  };
  F.resetBiome = function () { ORE_COL = null; };

  F.rubble = function (x, y, z, mat, count) {
    var c = this.matColor(mat);
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2, e = Math.random() * 1.4;
      var sp = 2 + Math.random() * 7;
      this.emit(x + (Math.random() - 0.5), y + (Math.random() - 0.5), z + (Math.random() - 0.5),
        Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 1.5, Math.sin(a) * Math.cos(e) * sp,
        0.5 + Math.random() * 0.8, 0.05 + Math.random() * 0.07,
        RS.shade(c, 0.6 + Math.random() * 0.8), 0, 1, 0.5);
    }
    // a puff of dust left hanging
    for (i = 0; i < Math.max(1, count >> 2); i++) {
      this.emit(x + (Math.random() - 0.5) * 1.5, y + (Math.random() - 0.5) * 1.5, z + (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.6, Math.random() * 1.2, (Math.random() - 0.5) * 1.6,
        0.8 + Math.random() * 0.9, 0.22 + Math.random() * 0.3, RS.shade(c, 0.3), 3, -0.05, 1.6);
    }
  };

  F.sparks = function (hit, count, color) {
    for (var i = 0; i < count; i++) {
      var sp = 4 + Math.random() * 10;
      this.emit(hit.x, hit.y, hit.z,
        hit.nx * sp + (Math.random() - 0.5) * 6, hit.ny * sp + (Math.random() - 0.5) * 6 + 2, hit.nz * sp + (Math.random() - 0.5) * 6,
        0.18 + Math.random() * 0.3, 0.035, color || 0xffd890, 1, 1.4, 1.2);
    }
  };

  F.blood = function (x, y, z, count, color) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2, e = Math.random() * 1.2;
      var sp = 2 + Math.random() * 6;
      this.emit(x, y, z, Math.cos(a) * sp, Math.sin(e) * sp, Math.sin(a) * sp,
        0.3 + Math.random() * 0.5, 0.07 + Math.random() * 0.1, color || 0x8fd43a, 2, 1.1, 1.0);
    }
  };

  F.dust = function (x, y, z, count, color, spread) {
    spread = spread || 1;
    for (var i = 0; i < count; i++) {
      this.emit(x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread, z + (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * 2 * spread, Math.random() * 1.5, (Math.random() - 0.5) * 2 * spread,
        0.7 + Math.random(), 0.25 + Math.random() * 0.35, color || 0x555555, 3, -0.06, 1.5);
    }
  };

  F.fire = function (x, y, z, vx, vy, vz, size, life) {
    this.emit(x, y, z, vx, vy, vz, life || 0.45, size || 0.35,
      Math.random() < 0.4 ? 0xffe070 : (Math.random() < 0.6 ? 0xff7a1e : 0xd83a10), 4, -0.35, 1.4);
  };

  F.explosion = function (x, y, z, radius, color) {
    color = color || 0xffa040;
    var b = null;
    for (var i = 0; i < this.blasts.length; i++) if (this.blasts[i].t <= 0) { b = this.blasts[i]; break; }
    if (!b) b = this.blasts[0];
    b.t = 0.0001; b.dur = 0.34; b.r = radius;
    b.mesh.material.color.setHex(color);
    b.mesh.position.set(x, y, z);
    b.mesh.visible = true;

    for (i = 0; i < 46; i++) {
      var a = Math.random() * Math.PI * 2, e = Math.acos(Math.random() * 2 - 1);
      var sp = (5 + Math.random() * 18) * (radius / 4);
      this.emit(x, y, z,
        Math.sin(e) * Math.cos(a) * sp, Math.cos(e) * sp, Math.sin(e) * Math.sin(a) * sp,
        0.3 + Math.random() * 0.6, 0.12 + Math.random() * 0.22,
        Math.random() < 0.5 ? color : 0xfff0c0, 4, 0.4, 1.5);
    }
    this.dust(x, y, z, 12, 0x403830, radius * 0.8);
    this.flash(x, y, z, 3.2, color, 0.3);
  };

  F.flash = function (x, y, z, peak, color, dur) {
    var best = null;
    for (var i = 0; i < this.fxLights.length; i++) {
      var f = this.fxLights[i];
      if (f.t <= 0) { best = f; break; }
      if (!best || f.peak < best.peak) best = f;
    }
    if (!best) return;
    best.light.position.set(x, y, z);
    best.light.color.setHex(color || 0xffc080);
    best.peak = peak; best.t = 0.0001; best.dur = dur || 0.1;
  };

  F.tracer = function (ax, ay, az, bx, by, bz, color) {
    var i = this.thead; this.thead = (this.thead + 1) % MAXT;
    var o = i * 6;
    this.tpos[o] = ax; this.tpos[o + 1] = ay; this.tpos[o + 2] = az;
    this.tpos[o + 3] = bx; this.tpos[o + 4] = by; this.tpos[o + 5] = bz;
    var r = ((color >> 16) & 255) / 255, g = ((color >> 8) & 255) / 255, b = (color & 255) / 255;
    for (var k = 0; k < 2; k++) {
      this.tcol[o + k * 3] = r; this.tcol[o + k * 3 + 1] = g; this.tcol[o + k * 3 + 2] = b;
    }
    this.tlife[i] = 0.06;
  };

  F.damageFlash = function (amt) {
    this.flashAmt = Math.min(1, this.flashAmt + amt * 1.6);
    RS.bus.emit('hud-flash', this.flashAmt);
  };

  F.update = function (dt) {
    var px = this.px, vx = this.vx, life = this.life, ppos = this.ppos, psz = this.psz;
    var pcol = this.pcol, bcol = this.bcol, bsize = this.bsize;
    for (var i = 0; i < MAXP; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      var i3 = i * 3;
      if (life[i] <= 0) { psz[i] = 0; pcol[i3] = pcol[i3 + 1] = pcol[i3 + 2] = 0; continue; }
      var dr = Math.max(0, 1 - this.drag[i] * dt);
      vx[i3] *= dr; vx[i3 + 1] *= dr; vx[i3 + 2] *= dr;
      vx[i3 + 1] -= 18 * this.grav[i] * dt;
      px[i3] += vx[i3] * dt; px[i3 + 1] += vx[i3 + 1] * dt; px[i3 + 2] += vx[i3 + 2] * dt;
      ppos[i3] = px[i3]; ppos[i3 + 1] = px[i3 + 1]; ppos[i3 + 2] = px[i3 + 2];

      var f = life[i] / this.maxLife[i];          // 1 at birth -> 0 at death
      var k = this.kind[i];
      var bright, grow;
      if (k === 1) { bright = f * f; grow = 1; }                 // sparks: snap out
      else if (k === 4) { bright = f * f * 1.1; grow = 1 + (1 - f) * 0.5; } // embers
      else if (k === 3) { bright = Math.min(1, f * 1.6) * 0.07; grow = 1 + (1 - f) * 1.5; } // smoke: haze, never a wall
      else { bright = Math.min(1, f * 2.0); grow = 1; }          // rubble / gore
      psz[i] = bsize[i] * grow;
      pcol[i3] = bcol[i3] * bright;
      pcol[i3 + 1] = bcol[i3 + 1] * bright;
      pcol[i3 + 2] = bcol[i3 + 2] * bright;
    }
    this.pgeo.attributes.position.needsUpdate = true;
    this.pgeo.attributes.psize.needsUpdate = true;
    this.pgeo.attributes.color.needsUpdate = true;

    for (i = 0; i < MAXT; i++) {
      if (this.tlife[i] > 0) {
        this.tlife[i] -= dt;
        if (this.tlife[i] <= 0) {
          var o = i * 6;
          for (var k2 = 0; k2 < 6; k2++) this.tpos[o + k2] = 0;
        }
      }
    }
    this.tgeo.attributes.position.needsUpdate = true;
    this.tgeo.attributes.color.needsUpdate = true;

    for (i = 0; i < this.blasts.length; i++) {
      var b = this.blasts[i];
      if (b.t <= 0) continue;
      b.t += dt;
      var tt = b.t / b.dur;
      if (tt >= 1) { b.t = 0; b.mesh.visible = false; continue; }
      var s = b.r * (0.35 + tt * 1.5) * 2;
      b.mesh.scale.set(s, s, s);
      b.mesh.material.opacity = 0.75 * (1 - tt) * (1 - tt);
    }

    for (i = 0; i < this.fxLights.length; i++) {
      var f2 = this.fxLights[i];
      if (f2.t <= 0) { if (f2.light.intensity !== 0) f2.light.intensity = 0; continue; }
      f2.t += dt;
      var ft = f2.t / f2.dur;
      if (ft >= 1) { f2.t = 0; f2.light.intensity = 0; continue; }
      f2.light.intensity = f2.peak * (1 - ft);
    }

    if (this.flashAmt > 0) {
      this.flashAmt = Math.max(0, this.flashAmt - dt * 2.2);
      RS.bus.emit('hud-flash', this.flashAmt);
    }
  };
})(window.RS);
