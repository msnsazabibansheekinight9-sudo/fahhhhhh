// Kestrel — creatures: the Stalker (unkillable apex hunter that lives in the vents), Husks (infected crew)
// and Crawlers (fast leaping parasites). Procedural rigs: torso hierarchies + two-bone IK limbs with planted feet.
(function () {
  const K = window.K, S = K.S;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const tv = [V(), V(), V(), V(), V(), V()];

  function segMesh(len, r0, r1, mat, sides = 8, sx = 1, sz = 1) { const m = new THREE.Mesh(K.segGeo(len, r0, r1, sides, sx, sz), mat); m.castShadow = true; m.userData.len = len; return m; }
  function mesh(geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); m.castShadow = true; return m; }
  const G_ = { sph: new THREE.SphereGeometry(.5, 14, 10), sphL: new THREE.SphereGeometry(.5, 8, 6), cone: new THREE.ConeGeometry(.5, 1, 6), box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(.5, .5, 1, 10) };
  K.CG = G_;


  // ------------------------------------------------------------ creature textures
  let CT = null;
  function ctex() {
    if (CT) return CT;
    const mk = (size, paint, bumpPaint) => {
      const c = K.canvas(size), x = c.getContext('2d'); paint(x, size);
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping;
      let b = null; if (bumpPaint) { const cb = K.canvas(size), xb = cb.getContext('2d'); bumpPaint(xb, size); b = new THREE.CanvasTexture(cb); b.wrapS = b.wrapT = THREE.RepeatWrapping; }
      return { map: t, bump: b };
    };
    const noise = (x, s, amt, seed) => { const id = x.getImageData(0, 0, s, s), d = id.data, r = K.rng(seed); for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; } x.putImageData(id, 0, 0); };
    const veins = (x, s, seed, col, n, w) => { const r = K.rng(seed); x.strokeStyle = col; for (let k = 0; k < n; k++) { let px = r() * s, py = r() * s; x.lineWidth = w * (.5 + r()); x.beginPath(); x.moveTo(px, py); for (let q = 0; q < 8; q++) { px += (r() - .5) * 40; py += (r() - .5) * 40; x.lineTo(px, py); } x.stroke(); } };
    const blot = (x, s, seed, col, n, r0, r1) => { const r = K.rng(seed); for (let k = 0; k < n; k++) { const px = r() * s, py = r() * s, rad = r0 + r() * (r1 - r0); const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); } };
    CT = {
      skin: mk(256, (x, s) => { x.fillStyle = '#8c8a7a'; x.fillRect(0, 0, s, s); blot(x, s, 1, 'rgba(90,60,70,.45)', 30, 10, 40); blot(x, s, 2, 'rgba(60,80,60,.35)', 20, 10, 50); veins(x, s, 3, 'rgba(50,40,70,.5)', 40, 1.5); blot(x, s, 4, 'rgba(70,8,6,.7)', 10, 5, 25); noise(x, s, 26, 5); },
        (x, s) => { x.fillStyle = '#808080'; x.fillRect(0, 0, s, s); veins(x, s, 3, 'rgba(200,200,200,.6)', 40, 2); blot(x, s, 7, 'rgba(0,0,0,.35)', 40, 4, 16); noise(x, s, 30, 8); }),
      suit: mk(256, (x, s) => { x.fillStyle = '#b8b4a8'; x.fillRect(0, 0, s, s); for (let k = 0; k < s; k += 3) { x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(0, k, s, 1); x.fillRect(k, 0, 1, s); }
          x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(s * .48, 0, 4, s); x.fillRect(0, s * .3, s, 3); // seams
          x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(s * .12, s * .38, s * .22, s * .18); x.fillRect(s * .64, s * .38, s * .22, s * .18); // pockets
          x.fillStyle = '#e8e2cc'; x.fillRect(s * .62, s * .12, s * .28, s * .08); x.fillStyle = '#333'; x.font = 'bold 14px monospace'; x.fillText('H-V  0' + Math.floor(Math.random() * 900 + 100), s * .63, s * .18);
          blot(x, s, 11, 'rgba(30,24,16,.55)', 25, 10, 50); blot(x, s, 12, 'rgba(80,6,4,.85)', 14, 6, 40); noise(x, s, 20, 13); },
        (x, s) => { x.fillStyle = '#808080'; x.fillRect(0, 0, s, s); for (let k = 0; k < s; k += 3) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, k, s, 1); } x.fillStyle = '#404040'; x.fillRect(s * .48, 0, 4, s); x.fillRect(0, s * .3, s, 3); noise(x, s, 20, 14); }),
      shell: mk(256, (x, s) => { x.fillStyle = '#16181c'; x.fillRect(0, 0, s, s); for (let k = 0; k < 26; k++) { x.strokeStyle = `rgba(${40 + k % 3 * 10},${44 + k % 3 * 10},${52 + k % 3 * 12},.6)`; x.lineWidth = 2 + (k % 4); x.beginPath(); x.moveTo(0, k * 10 + 3); x.bezierCurveTo(s * .3, k * 10 - 6, s * .7, k * 10 + 12, s, k * 10 + 3); x.stroke(); } veins(x, s, 21, 'rgba(70,80,96,.35)', 30, 1.5); noise(x, s, 14, 22); },
        (x, s) => { x.fillStyle = '#707070'; x.fillRect(0, 0, s, s); for (let k = 0; k < 26; k++) { x.strokeStyle = 'rgba(220,220,220,.8)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, k * 10 + 3); x.bezierCurveTo(s * .3, k * 10 - 6, s * .7, k * 10 + 12, s, k * 10 + 3); x.stroke(); } veins(x, s, 21, 'rgba(255,255,255,.5)', 30, 2); noise(x, s, 18, 23); }),
      flesh: mk(256, (x, s) => { x.fillStyle = '#7a6a58'; x.fillRect(0, 0, s, s); blot(x, s, 31, 'rgba(120,60,50,.5)', 30, 10, 40); veins(x, s, 32, 'rgba(90,20,30,.6)', 50, 1.6); blot(x, s, 33, 'rgba(30,20,14,.5)', 20, 6, 30); noise(x, s, 24, 34); },
        (x, s) => { x.fillStyle = '#808080'; x.fillRect(0, 0, s, s); veins(x, s, 32, 'rgba(230,230,230,.7)', 50, 2.4); noise(x, s, 26, 35); }),
    };
    return CT;
  }

  // ------------------------------------------------------------ gait (planted feet)
  class Gait {
    constructor(legs) { this.legs = legs.map(l => Object.assign({ pos: V(), from: V(), to: V(), t: 1, stepping: false }, l)); this.init = false; }
    // home(i) -> world Vector3 for foot i; groups alternate
    update(dt, homeFn, speed, opts = {}) {
      const legs = this.legs;
      if (!this.init) { legs.forEach((l, i) => l.pos.copy(homeFn(i))); this.init = true; }
      const dur = opts.dur || K.clamp(.42 - speed * .05, .14, .42), lift = opts.lift || .12;
      const thr = (opts.thr || .22) + speed * (opts.thrK || .1);
      for (let i = 0; i < legs.length; i++) {
        const l = legs[i];
        if (l.stepping) {
          l.t += dt / dur;
          const e = K.ease.inOut(Math.min(1, l.t));
          l.pos.lerpVectors(l.from, l.to, e); l.pos.y = l.from.y + Math.sin(Math.min(1, l.t) * Math.PI) * lift;
          if (l.t >= 1) { l.stepping = false; l.pos.copy(l.to); l.pos.y = 0; if (this.onPlant) this.onPlant(i, l.pos); }
          continue;
        }
        const h = homeFn(i), d = Math.hypot(h.x - l.pos.x, h.z - l.pos.z);
        const blocked = legs.some(o => o !== l && o.stepping && o.group === l.group) || legs.some(o => o !== l && o.stepping && o.group !== l.group && o.t < .6 && !opts.overlap);
        if (d > thr && !blocked) {
          l.stepping = true; l.t = 0; l.from.copy(l.pos);
          l.to.copy(h); if (opts.lead) { l.to.x += opts.lead.x; l.to.z += opts.lead.z; } l.to.y = 0;
        } else if (d > thr * 3) { l.pos.copy(h); l.pos.y = 0; } // teleport recovery
      }
    }
    phase() { let s = 0; for (const l of this.legs) if (l.stepping) s += Math.sin(l.t * Math.PI); return s / this.legs.length; }
  }

  // ------------------------------------------------------------ base agent
  class Agent {
    constructor(G, x, z) {
      this.G = G; this.x = x; this.z = z; this.h = 0; this.vx = 0; this.vz = 0; this.speed = 0; this.path = null; this.pathT = 0; this.goal = null;
      this.root = new THREE.Group(); this.root.position.set(x, 0, z); this.alive = true; this.t = Math.random() * 100; this.radius = .4;
    }
    get pos() { return tv[5].set(this.x, 0, this.z); }
    toLocal(w, out) { const dx = w.x - this.x, dz = w.z - this.z, c = Math.cos(this.h), s = Math.sin(this.h); return out.set(dx * c - dz * s, w.y, dx * s + dz * c); }
    toWorld(l, out) { const c = Math.cos(this.h), s = Math.sin(this.h); return out.set(this.x + l.x * c + l.z * s, l.y, this.z - l.x * s + l.z * c); }
    // follow a path toward (gx,gz); returns distance to goal
    moveTo(gx, gz, spd, dt, opts = {}) {
      const L = this.G.L;
      this.pathT -= dt;
      if (!this.path || this.pathT <= 0 || !this.goal || Math.hypot(this.goal[0] - gx, this.goal[1] - gz) > 1.2) {
        this.path = L.path(this.x, this.z, gx, gz, opts.locked, opts.avoid); this.goal = [gx, gz]; this.pathT = opts.repath || 1.2;
        if (!this.path) { this.pathT = .6; }
      }
      let tx = gx, tz = gz;
      if (this.path && this.path.length) {
        while (this.path.length > 1 && Math.hypot(this.path[0][0] - this.x, this.path[0][1] - this.z) < .5) this.path.shift();
        tx = this.path[0][0]; tz = this.path[0][1];
      } else if (this.path === null) { this.speed = K.damp(this.speed, 0, 6, dt); return Math.hypot(gx - this.x, gz - this.z); }
      const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz), dist = Math.hypot(gx - this.x, gz - this.z);
      const want = Math.atan2(dx, dz);
      this.h += K.clamp(K.angDiff(this.h, want), -(opts.turn || 4) * dt, (opts.turn || 4) * dt);
      const face = Math.cos(K.angDiff(this.h, want));
      const target = dist < (opts.stop || .3) ? 0 : spd * K.clamp(face, .15, 1);
      this.speed = K.damp(this.speed, target, opts.accel || 5, dt);
      this.step(dt);
      return dist;
    }
    step(dt) {
      const nx = this.x + Math.sin(this.h) * this.speed * dt, nz = this.z + Math.cos(this.h) * this.speed * dt;
      const r = this.G.collide(nx, nz, this.radius, true);
      this.vx = (r[0] - this.x) / Math.max(dt, 1e-4); this.vz = (r[1] - this.z) / Math.max(dt, 1e-4);
      this.x = r[0]; this.z = r[1];
    }
    face(tx, tz, rate, dt) { this.h += K.clamp(K.angDiff(this.h, Math.atan2(tx - this.x, tz - this.z)), -rate * dt, rate * dt); }
    lightUp(mats, k = 1) { // emissive from baked light at creature position
      const out = this.G.W.light(this.x, 1.2, this.z, 0, 1, 0, this._lt || (this._lt = [0, 0, 0]));
      for (const m of mats) { const c = m.color, a = m.userData.alb * k; m.emissive.setRGB(out[0] * c.r * a, out[1] * c.g * a, out[2] * c.b * a); }
    }
    canSee(px, pz, range, fovCos, eyeH) {
      const dx = px - this.x, dz = pz - this.z, d = Math.hypot(dx, dz);
      if (d > range) return false;
      if ((dx * Math.sin(this.headYaw ?? this.h) + dz * Math.cos(this.headYaw ?? this.h)) / (d || 1) < fovCos && d > 1.5) return false;
      return this.G.L.los(this.x, this.z, px, pz);
    }
  }
  const tagMat = (m, alb) => { m.userData.alb = alb; return m; };

  // ============================================================ STALKER
  class Stalker extends Agent {
    constructor(G, x, z) {
      super(G, x, z);
      this.kind = 'stalker'; this.radius = .45;
      const env = G.envMap;
      const T = ctex(); const shell = tagMat(new THREE.MeshStandardMaterial({ color: 0x3a3f48, map: T.shell.map, bumpMap: T.shell.bump, bumpScale: .03, roughness: .14, metalness: .55, envMap: env, envMapIntensity: 1.8 }), .25);
      const inner = tagMat(new THREE.MeshStandardMaterial({ color: 0x4a505a, map: T.shell.map, bumpMap: T.shell.bump, bumpScale: .05, roughness: .3, metalness: .35, envMap: env, envMapIntensity: .9 }), .5);
      const teeth = tagMat(new THREE.MeshStandardMaterial({ color: 0xd8d2c0, roughness: .22, metalness: .15, envMap: env }), 1);
      const gum = tagMat(new THREE.MeshStandardMaterial({ color: 0x3b1418, roughness: .3, metalness: .1 }), .6);
      this.mats = [shell, inner, teeth, gum];
      const R = this.root;
      // torso hierarchy
      this.hips = new THREE.Object3D(); R.add(this.hips);
      this.spine = new THREE.Object3D(); this.spine.position.set(0, .12, .05); this.hips.add(this.spine);
      this.chest = new THREE.Object3D(); this.chest.position.set(0, .32, .06); this.spine.add(this.chest);
      this.neck = new THREE.Object3D(); this.neck.position.set(0, .36, .1); this.chest.add(this.neck);
      this.head = new THREE.Object3D(); this.head.position.set(0, .18, .08); this.neck.add(this.head);
      // pelvis + waist
      this.hips.add(mesh(G_.sph, shell, 0, 0, -.02, .34, .22, .3));
      this.hips.add(mesh(G_.sph, inner, 0, -.06, .1, .2, .14, .14));
      const waist = new THREE.Mesh(K.lathe([[.1, 0], [.07, .05], [.1, .1], [.065, .15], [.09, .2], [.06, .25], [.11, .32]], 10), inner); waist.castShadow = true; waist.position.y = .02; this.spine.add(waist);
      // ribcage
      const cage = new THREE.Mesh(K.lathe([[.12, 0], [.22, .06], [.27, .2], [.26, .34], [.2, .44], [.1, .5]], 14), shell); cage.scale.set(1, 1, .82); cage.castShadow = true; this.chest.add(cage);
      for (let k = 0; k < 5; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.26 - Math.abs(k - 2) * .02, .018, 5, 16, Math.PI * 1.1), inner); t.rotation.set(Math.PI / 2, 0, -Math.PI * .05 + Math.PI); t.position.set(0, .08 + k * .08, .02); t.scale.set(1, .85, 1); this.chest.add(t); }
      for (let k = 0; k < 6; k++) this.chest.add(mesh(G_.sphL, shell, 0, .02 + k * .08, -.2, .07, .06, .07));
      // dorsal tubes
      this.dorsal = [];
      for (let k = 0; k < 4; k++) {
        const g = new THREE.Object3D(); g.position.set((k % 2 ? 1 : -1) * (.07 + (k >> 1) * .07), .42, -.17); g.rotation.set(-2.2 + (k >> 1) * .25, 0, (k % 2 ? -1 : 1) * .25);
        const tube = segMesh(.5 - (k >> 1) * .12, .045, .025, shell, 7); g.add(tube);
        for (let q = 0; q < 4; q++) g.add(mesh(G_.cyl, inner, 0, .08 + q * .1, 0, .065, .02, .065));
        this.chest.add(g); this.dorsal.push(g);
      }
      // neck
      const neckM = new THREE.Mesh(K.lathe([[.09, 0], [.065, .05], [.085, .1], [.06, .15], [.08, .2], [.06, .24]], 10), inner); neckM.castShadow = true; this.neck.add(neckM);
      // head: long crested dome
      const dome = new THREE.Mesh(K.lathe([[.02, 0], [.09, .04], [.14, .16], [.155, .36], [.14, .56], [.1, .76], [.05, .9], [0, .95]], 18), shell);
      dome.scale.set(.8, 1, 1); dome.rotation.x = -Math.PI / 2 + .3; dome.position.set(0, .02, .3); dome.castShadow = true; this.head.add(dome);
      this.head.add(mesh(G_.sph, inner, 0, -.04, .12, .2, .14, .32));
      for (let k = 0; k < 6; k++) this.head.add(mesh(G_.box, inner, 0, .1 + k * .025, .05 - k * .1, .03, .02, .08, .3));
      for (const s of [-1, 1]) this.head.add(mesh(G_.cyl, shell, s * .08, -.02, .12, .03, .26, .03, Math.PI / 2 - .1, 0, 0));
      // upper teeth
      for (let k = 0; k < 9; k++) { const a = (k / 8 - .5) * 1.6; this.head.add(mesh(G_.cone, teeth, Math.sin(a) * .07, -.075, .27 + Math.cos(a) * .04 - .04, .018, .05, .018, Math.PI, 0, 0)); }
      // jaw
      this.jaw = new THREE.Object3D(); this.jaw.position.set(0, -.08, .04); this.head.add(this.jaw);
      this.jaw.add(mesh(G_.sph, shell, 0, -.03, .13, .15, .06, .3));
      for (let k = 0; k < 8; k++) { const a = (k / 7 - .5) * 1.5; this.jaw.add(mesh(G_.cone, teeth, Math.sin(a) * .065, .005, .23 + Math.cos(a) * .04 - .04, .016, .045, .016)); }
      this.jaw.add(mesh(G_.sph, gum, 0, .0, .12, .1, .02, .22));
      // inner jaw (strikes on kill)
      this.inner = new THREE.Object3D(); this.inner.position.set(0, -.06, .12); this.head.add(this.inner);
      this.inner.add(mesh(G_.cyl, gum, 0, 0, 0, .05, .26, .05, Math.PI / 2, 0, 0));
      for (let k = 0; k < 4; k++) this.inner.add(mesh(G_.cone, teeth, (k % 2 - .5) * .03, (k >> 1) * .02 - .01, .14, .012, .03, .012, Math.PI / 2, 0, 0));
      // limbs
      const L = (n, len, r0, r1, m) => { const a = []; for (let i = 0; i < n; i++) { const s = segMesh(len[i], r0[i], r1[i], m); R.add(s); a.push(s); } return a; };
      this.legsM = [0, 1].map(() => L(3, [.52, .55, .38], [.11, .075, .05], [.07, .045, .032], shell));
      this.armsM = [0, 1].map(() => L(2, [.44, .5], [.075, .055], [.05, .034], shell));
      // ribbed biomechanical sleeves and spurs riding on the limb segments
      for (const segs of this.legsM.concat(this.armsM)) for (const sgm of segs) {
        const len = sgm.userData.len, r0 = sgm.geometry.parameters.radiusBottom;
        for (let q = 1; q < 5; q++) { const ring = new THREE.Mesh(G_.cyl, inner); ring.scale.set(r0 * 2.15 * (1 - q * .08), .018, r0 * 2.15 * (1 - q * .08)); ring.position.y = len * q / 5; sgm.add(ring); }
        const spur = new THREE.Mesh(G_.cone, shell); spur.scale.set(.025, .12, .025); spur.position.set(0, len * .85, -r0); spur.rotation.x = -2.3; sgm.add(spur);
      }
      // back spines along the spine and hips
      for (let k = 0; k < 5; k++) { const sp = mesh(G_.cone, shell, 0, .05 + k * .05, -.12 - k * .01, .03, .14 - k * .015, .03, -2.4, 0, 0); this.spine.add(sp); }
      for (const sx of [-1, 1]) { this.chest.add(mesh(G_.sph, shell, sx * .27, .4, -.02, .16, .1, .16)); this.hips.add(mesh(G_.cone, shell, sx * .2, .05, -.12, .04, .18, .04, -2.1, 0, sx * .4)); }
      this.knobs = [];
      for (let k = 0; k < 8; k++) { const m = mesh(G_.sphL, inner, 0, 0, 0, .09, .09, .09); R.add(m); this.knobs.push(m); }
      // hands: long fingers along +y
      this.hands = [0, 1].map(() => {
        const h = new THREE.Object3D(); R.add(h);
        h.add(mesh(G_.box, shell, 0, .05, 0, .07, .1, .03));
        h.fingers = [];
        for (let f = 0; f < 4; f++) {
          const base = new THREE.Object3D(); base.position.set(-.03 + f * .02, .1, f === 3 ? .03 : 0); base.rotation.z = (f - 1.5) * .18; if (f === 3) base.rotation.set(.8, 0, -.9); h.add(base);
          const s1 = segMesh(.12, .012, .01, shell, 5); base.add(s1);
          const j = new THREE.Object3D(); j.position.y = .12; base.add(j);
          const s2 = segMesh(.11, .01, .004, teeth, 5); j.add(s2);
          h.fingers.push([base, j]);
        }
        return h;
      });
      // feet toes
      this.feet = [0, 1].map(() => {
        const f = new THREE.Object3D(); R.add(f);
        for (let t = 0; t < 3; t++) { const m = segMesh(.16, .022, .008, shell, 5); m.rotation.set(Math.PI / 2 - .1, (t - 1) * .35, 0); f.add(m); }
        const heel = segMesh(.08, .02, .006, shell, 5); heel.rotation.set(-Math.PI / 2 - .5, 0, 0); f.add(heel);
        return f;
      });
      // tail
      this.tail = [];
      for (let k = 0; k < 18; k++) { const len = .15, m = segMesh(len, .07 * (1 - k / 20) + .012, .07 * (1 - (k + 1) / 20) + .01, k % 2 ? inner : shell, 7); R.add(m); this.tail.push(m); }
      this.blade = mesh(G_.cone, shell, 0, 0, 0, .06, .28, .015); R.add(this.blade);
      this.tailPts = Array.from({ length: 20 }, () => V());

      this.gait = new Gait([{ side: -1, group: 0 }, { side: 1, group: 1 }]);
      this.gait.onPlant = (i, p) => this.G.audio && this.G.audio.stalkerStep(p, this.state === 'hunt' ? 1 : .55);
      // state
      this.state = 'vent'; this.timer = K.lerp(30, 45, Math.random()); this.awareness = 0; this.menace = 0; this.burn = 0; this.lastSeen = null; this.searchT = 0;
      this.root.visible = false; this.post = 1; this.rear = 0; this.jawOpen = 0; this.innerOut = 0; this.flinch = 0; this.headLook = 0; this.headYaw = 0; this.hiss = 0;
      this.anim = { prowl: 1, run: 0 };
      this.ventY = 0; this.lockerTarget = null;
    }

    // ---------------------------------------------- AI
    update(dt) {
      const G = this.G, P = G.player; this.t += dt;
      const L = G.L;
      const dP = Math.hypot(P.x - this.x, P.z - this.z);
      if (this.state === 'kill') { this.animKill(dt); return; }
      if (this.state === 'vent') {
        this.root.visible = false;
        this.timer -= dt * (G.aggro || 1);
        // eerie crawling in the ceiling nearby
        this.ventNoiseT = (this.ventNoiseT || 6) - dt;
        if (this.ventNoiseT <= 0) { this.ventNoiseT = K.lerp(7, 16, Math.random()); const v = this.nearVent(P.x, P.z, 4, 16); if (v) { this.ghost = [v.x, v.z]; G.audio && G.audio.ventCrawl(v.x, v.y, v.z); } }
        if (this.timer <= 0 && !G.playerInSafe) this.emerge();
        return;
      }
      this.root.visible = true;
      // senses
      const seen = this.sense(dt, dP);
      this.flinch = Math.max(0, this.flinch - dt * 2.5);
      this.hiss = Math.max(0, this.hiss - dt);
      if (this.burn > 0) this.burn = Math.max(0, this.burn - dt * .25);
      if (this.burn > 1 && this.state !== 'flee' && this.state !== 'climb') this.startFlee();
      switch (this.state) {
        case 'drop': {
          this.timer += dt; const t = this.timer;
          this.ventY = Math.max(0, this.dropFrom * (1 - K.ease.in(Math.min(1, t / .55))));
          if (t > .55 && !this.landed) { this.landed = true; G.audio && G.audio.thud(this.x, 0, this.z, 1); G.noise(this.x, this.z, 10, 'self'); }
          this.speed = 0;
          if (t > 1.5) { this.state = 'roam'; this.ventY = 0; this.pickRoam(); }
          break;
        }
        case 'roam': {
          this.menace += dt / (dP < 18 ? 45 : 120);
          const d = this.moveTo(this.goalX, this.goalZ, 1.55, dt, { avoid: G.safeAreas });
          if (d < .8 || !this.path) { this.idleT = (this.idleT || 0) + dt; this.speed = K.damp(this.speed, 0, 5, dt); if (this.idleT > 2.5) { this.idleT = 0; this.pickRoam(); } }
          if (this.menace > 1) this.startRetreat();
          break;
        }
        case 'investigate': {
          const d = this.moveTo(this.goalX, this.goalZ, this.investFast ? 3.4 : 2.1, dt, { avoid: G.safeAreas });
          if (d < 1 || !this.path) { this.state = 'search'; this.searchT = 10; }
          break;
        }
        case 'search': {
          this.searchT -= dt; this.menace += dt / 60;
          this.sniffT = (this.sniffT || 0) - dt;
          if (this.sniffT <= 0) { this.sniffT = K.lerp(2.5, 4.5, Math.random()); const a = Math.random() * K.TAU, r = 2 + Math.random() * 5; this.goalX = (this.lastSeen ? this.lastSeen[0] : this.x) + Math.cos(a) * r; this.goalZ = (this.lastSeen ? this.lastSeen[1] : this.z) + Math.sin(a) * r; }
          // check lockers near the search point
          const lk = this.nearLocker(2.4);
          if (lk && lk === P.locker && !this.lockerChecked) { this.state = 'lockerCheck'; this.lockerTarget = lk; this.timer = 0; break; }
          this.moveTo(this.goalX, this.goalZ, 1.2, dt, { avoid: G.safeAreas });
          if (this.searchT <= 0) { this.lastSeen = null; this.state = 'roam'; this.pickRoam(); }
          if (this.menace > 1.2) this.startRetreat();
          break;
        }
        case 'lockerCheck': {
          const lk = this.lockerTarget; this.timer += dt;
          this.moveTo(lk.frontX, lk.frontZ, 1.2, dt, { stop: .2 });
          if (Math.hypot(lk.frontX - this.x, lk.frontZ - this.z) < .6) {
            this.face(lk.x, lk.z, 3, dt); this.speed = 0; this.headLook = Math.sin(this.t * 2) * .3;
            G.lockerThreat = 1;
            if (this.timer > 1.4 && !G.player.holdingBreath && P.locker === lk) { this.grabFromLocker(lk); break; }
            if (this.timer > 5.5) { this.lockerChecked = true; this.state = 'search'; this.searchT = 4; G.lockerThreat = 0; }
          } else G.lockerThreat = .5;
          break;
        }
        case 'hunt': {
          this.menace = Math.max(0, this.menace - dt * .02);
          if (seen) { this.lastSeen = [P.x, P.z]; this.lostT = 0; } else this.lostT = (this.lostT || 0) + dt;
          const tgt = seen || this.lostT < 1.5 ? [P.x, P.z] : this.lastSeen;
          if (P.locker && this.sawLocker === P.locker) { // watched the player hide
            const lk = P.locker; this.moveTo(lk.frontX, lk.frontZ, 4.6, dt, { stop: .2 });
            if (Math.hypot(lk.frontX - this.x, lk.frontZ - this.z) < .7) this.grabFromLocker(lk);
            break;
          }
          const d = this.moveTo(tgt[0], tgt[1], G.playerInSafe ? 2 : 5.25, dt, { repath: .4, turn: 6, accel: 4, avoid: G.safeAreas });
          if (dP < 1.45 && seen && !P.locker && G.canKill()) { this.startKill(); break; }
          if (this.lostT > 4.5 || (G.playerInSafe && this.lostT > 1.5)) { this.state = 'search'; this.searchT = 14; this.lockerChecked = false; }
          if (d < .6 && !seen) { this.state = 'search'; this.searchT = 12; this.lockerChecked = false; }
          break;
        }
        case 'flee': case 'retreat': {
          const v = this.fleeVent;
          const d = this.moveTo(v.x, v.z, this.state === 'flee' ? 5.6 : 2.2, dt, { locked: false, turn: 7 });
          if (d < .7 || (!this.path && this.timer > 1)) { this.state = 'climb'; this.timer = 0; this.climbFrom = v; this.x = v.x; this.z = v.z; G.audio && G.audio.ventEnter(v.x, v.y, v.z); }
          this.timer += dt;
          if (this.timer > 14) { this.state = 'climb'; this.timer = 0; }
          break;
        }
        case 'climb': {
          this.timer += dt; this.speed = 0;
          const h = this.climbFrom ? this.climbFrom.y : 3;
          this.ventY = K.ease.in(K.clamp((this.timer - .3) / .6, 0, 1)) * (h + .5);
          this.rear = Math.min(1, this.timer * 2);
          if (this.timer > 1) { this.state = 'vent'; this.rear = 0; this.ventY = 0; this.timer = this.nextVentTime(); this.menace = 0; this.burn = 0; this.awareness = 0; G.onStalkerHidden && G.onStalkerHidden(); }
          break;
        }
        case 'flinch': this.timer -= dt; this.speed = K.damp(this.speed, 0, 8, dt); if (this.timer <= 0) { this.state = 'hunt'; this.lostT = 0; this.lastSeen = [P.x, P.z]; } break;
      }
      // turn the head toward what it is tracking
      const look = this.state === 'hunt' || this.state === 'lockerCheck' ? Math.atan2(P.x - this.x, P.z - this.z) : this.h + Math.sin(this.t * .7) * .6 * (this.state === 'search' ? 1.4 : .5);
      this.headYaw = this.h + K.clamp(K.angDiff(this.h, look), -1, 1);
      this.animate(dt);
    }
    nextVentTime() { return K.lerp(24, 44, Math.random()) / (this.G.aggro || 1); }
    nearVent(px, pz, minD, maxD) {
      let best = null, bd = 1e9;
      for (const v of this.G.L.vents) { const d = Math.hypot(v.x - px, v.z - pz); if (d < minD || d > maxD) continue; const s = d + Math.random() * 6; if (s < bd) { bd = s; best = v; } }
      return best;
    }
    nearLocker(r) { let b = null, bd = r; for (const lk of this.G.W.lockers) { const d = Math.hypot(lk.frontX - this.x, lk.frontZ - this.z); if (d < bd) { bd = d; b = lk; } } return b; }
    emerge() {
      const G = this.G, P = G.player;
      // choose a vent the player can reach but probably can't see right now
      const dist = G.L.bfs(G.L.cellOf(P.x, P.z), 18, false);
      const cands = G.L.vents.filter(v => { const d = dist[v.c]; return d >= 4 && d <= 14 && !G.safeAreas.has(v.area); });
      if (!cands.length) { this.timer = 8; return; }
      cands.sort((a, b) => (G.L.los(P.x, P.z, a.x, a.z) ? 1 : 0) - (G.L.los(P.x, P.z, b.x, b.z) ? 1 : 0) + (Math.random() - .5));
      const v = cands[0];
      this.x = v.x; this.z = v.z; this.h = Math.random() * K.TAU; this.state = 'drop'; this.timer = 0; this.dropFrom = v.y - .2; this.landed = false;
      this.ventY = this.dropFrom; this.gait.init = false; this.speed = 0; this.awareness = 0; this.menace = 0; this.path = null;
      G.audio && G.audio.ventExit(v.x, v.y, v.z);
      G.onStalkerEmerge && G.onStalkerEmerge(v);
    }
    pickRoam() {
      const P = this.G.player, L = this.G.L;
      // patrol somewhere near where the player probably is
      for (let k = 0; k < 12; k++) {
        const a = Math.random() * K.TAU, r = 3 + Math.random() * 11;
        const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r, c = L.cellOf(x, z);
        if (c >= 0 && L.kind[c] && !this.G.safeAreas.has(L.area[c])) { this.goalX = (c % L.W + .5) * S; this.goalZ = (((c / L.W) | 0) + .5) * S; return; }
      }
      this.goalX = this.x; this.goalZ = this.z;
    }
    startRetreat() { const v = this.nearVent(this.x, this.z, 0, 30) || this.G.L.vents[0]; this.fleeVent = v; this.state = 'retreat'; this.timer = 0; this.path = null; }
    startFlee() {
      const P = this.G.player; let best = null, bs = -1e9;
      for (const v of this.G.L.vents) { const d = Math.hypot(v.x - this.x, v.z - this.z); if (d > 25) continue; const s = Math.hypot(v.x - P.x, v.z - P.z) - d * 1.2; if (s > bs) { bs = s; best = v; } }
      this.fleeVent = best || this.G.L.vents[0]; this.state = 'flee'; this.timer = 0; this.path = null; this.hiss = 1.2;
      this.G.audio && this.G.audio.screech(this.x, 1.8, this.z, 1.2);
      this.G.onStalkerFlee && this.G.onStalkerFlee();
    }
    sense(dt, dP) {
      const G = this.G, P = G.player;
      if (['drop', 'climb', 'flee', 'retreat', 'kill'].includes(this.state)) return false;
      let seen = false;
      if (!P.locker && !P.dead) {
        const range = 26;
        if (this.canSee(P.x, P.z, range, Math.cos(1.15), 1.6)) {
          const lum = G.playerLight();
          let vis = .25 + Math.min(1.2, lum * 5) + (P.flashOn ? .55 : 0);
          vis *= P.crouch ? .5 : 1; vis *= P.sprinting ? 1.35 : 1;
          const k = vis * (1 - dP / range) * (dP < 5 ? 6 : 2.6);
          this.awareness = Math.min(1.2, this.awareness + k * dt);
          if (dP < 2.4) this.awareness = 1.2;
          if (this.awareness >= 1) seen = true;
        } else this.awareness = Math.max(0, this.awareness - dt * .25);
      } else if (P.locker) {
        // saw them climb in?
        if (P.lockerT < 1.2 && this.canSee(P.locker.x, P.locker.z, 18, Math.cos(1.2), 1.6) && this.awareness > .4) this.sawLocker = P.locker;
      }
      G.stalkerAware = this.awareness;
      if (seen && this.state !== 'hunt') {
        if (this.state !== 'flinch') { this.state = 'hunt'; this.lostT = 0; this.hiss = 1; this.G.audio && this.G.audio.screech(this.x, 1.8, this.z, .8); this.G.onStalkerSpot && this.G.onStalkerSpot(); }
      }
      // hearing
      for (const n of G.noises) {
        if (n.src === 'self' || n.heardBy?.has(this)) continue;
        const d = Math.hypot(n.x - this.x, n.z - this.z);
        if (d < n.r) {
          (n.heardBy || (n.heardBy = new Set())).add(this);
          if (this.state === 'hunt') continue;
          this.goalX = n.x; this.goalZ = n.z; this.lastSeen = [n.x, n.z];
          this.investFast = n.r > 12 || d < n.r * .4; this.state = 'investigate'; this.path = null; this.lockerChecked = false;
          if (this.investFast) this.hiss = .5;
        }
      }
      return seen;
    }
    hurt(dmg, type, hx, hz) {
      if (this.state === 'vent' || this.state === 'kill' || this.state === 'climb') return;
      if (type === 'fire' || type === 'blast') { this.burn += type === 'blast' ? 2 : dmg; this.awareness = 1.2; return; }
      if (this.state !== 'flee' && this.state !== 'retreat') { this.state = 'flinch'; this.timer = .35; this.flinch = 1; this.awareness = 1.2; this.G.audio && this.G.audio.screech(this.x, 1.8, this.z, .5); }
    }
    startKill() { this.state = 'kill'; this.killT = 0; this.speed = 0; this.G.startDeath('stalker', this); }
    grabFromLocker(lk) { this.state = 'kill'; this.killT = 0; this.speed = 0; this.x = lk.frontX; this.z = lk.frontZ; this.h = Math.atan2(lk.x - this.x, lk.z - this.z); this.G.startDeath('locker', this, lk); }
    animKill(dt) {
      this.killT += dt;
      const P = this.G.player, t = this.killT;
      // keep facing the victim, rear up and bring the head down to eye level
      this.h = Math.atan2(P.x - this.x, P.z - this.z);
      const d = Math.hypot(P.x - this.x, P.z - this.z);
      if (d > 1.05) { this.x += Math.sin(this.h) * Math.min(d - 1.05, dt * 3); this.z += Math.cos(this.h) * Math.min(d - 1.05, dt * 3); }
      this.rear = K.ease.inOut(K.seg(t, 0, .6)); this.jawOpen = K.ease.out(K.seg(t, .5, 1.0));
      this.innerOut = K.seg(t, 1.25, 1.36) * (1 - K.seg(t, 1.5, 1.8));
      this.headYaw = this.h; this.speed = 0; this.hiss = t < 1.3 ? 1 : 0;
      this.animate(dt, true);
    }

    // ---------------------------------------------- animation
    animate(dt, killing) {
      const R = this.root, sp = this.speed, run = K.clamp((sp - 2) / 3, 0, 1);
      this.anim.run = K.damp(this.anim.run, run, 5, dt);
      const ar = this.anim.run, crouch = this.state === 'search' || this.state === 'lockerCheck' ? 1 : 0;
      this.crouchA = K.damp(this.crouchA || 0, crouch, 3, dt);
      R.position.set(this.x, this.ventY, this.z); R.rotation.y = this.h;
      // feet
      const self = this, fwdLead = V(Math.sin(this.h) * sp * .16, 0, Math.cos(this.h) * sp * .16);
      this.gait.update(dt, i => { const l = V(i ? .2 : -.2, 0, .08 + ar * .12); return self.toWorld(l, V()).add(fwdLead); }, sp, { lift: .14 + ar * .12, thr: .18, thrK: .09, dur: K.clamp(.4 - sp * .045, .15, .4), overlap: ar > .5 });
      const ph = this.gait.phase();
      // torso pose: hunched prowl, lower and more horizontal at speed, rear up when screeching / killing
      const rear = Math.max(this.rear, this.hiss > .3 && this.state !== 'hunt' ? .5 : 0);
      this.rearA = K.damp(this.rearA || 0, rear, 6, dt);
      const ra = this.rearA, breathe = Math.sin(this.t * 2.2) * .02;
      const hipY = .98 - this.crouchA * .2 - ar * .06 + ra * .22 + ph * .05 + (this.state === 'drop' && this.timer > .5 && this.timer < 1.1 ? -.25 * Math.sin((this.timer - .5) / .6 * Math.PI) : 0);
      this.hips.position.set(Math.sin(this.t * 3) * .01, hipY, 0);
      this.hips.rotation.set(.45 + ar * .35 - ra * .7 + this.flinch * -.3, 0, Math.sin(this.t * 6 * (.4 + ar)) * .05 * (sp > .3 ? 1 : 0));
      this.spine.rotation.set(.35 + ar * .15 - ra * .35 + breathe, 0, 0);
      this.chest.rotation.set(.25 - ra * .25 + breathe * 2, 0, -this.hips.rotation.z * 1.5);
      this.chest.scale.set(1 + breathe, 1, 1 + breathe);
      const lookD = K.angDiff(this.h, this.headYaw);
      this.neck.rotation.set(-.55 - ar * .2 + ra * .3 + this.crouchA * .2, lookD * .5, 0);
      this.head.rotation.set(-.3 - ar * .1 + ra * .25 + Math.sin(this.t * 1.3) * .05, lookD * .5, Math.sin(this.t * .9) * .08);
      this.jawOpenA = K.damp(this.jawOpenA || 0, Math.max(this.jawOpen, this.hiss > 0 ? .8 : 0, this.state === 'hunt' ? .25 : 0), 10, dt);
      this.jaw.rotation.x = this.jawOpenA * .7;
      this.inner.position.z = .12 + this.innerOut * .32;
      this.dorsal.forEach((d, k) => { d.rotation.x = -2.2 + (k >> 1) * .25 + Math.sin(this.t * 2 + k) * .04 + ar * .2; });
      R.updateMatrixWorld(true);
      // legs
      const hip = tv[0], knee = tv[1], ankle = tv[2], foot = tv[3];
      for (let i = 0; i < 2; i++) {
        const s = i ? 1 : -1, segs = this.legsM[i];
        hip.set(s * .15, -.04, -.02); this.hips.localToWorld(hip); R.worldToLocal(hip);
        this.toLocal(this.gait.legs[i].pos, foot); foot.y -= this.ventY;
        if (this.state === 'drop' && this.timer < .55) foot.set(s * .25, hipY - .5, .3); // legs tucked while falling
        if (this.state === 'climb') foot.set(s * .2, hipY - .3 + this.ventY * .2, .1);
        ankle.copy(foot).add(V(0, .3, -.13));
        K.ik2(hip, ankle, .52, .55, V(s * .15, .1, 1), knee, ankle);
        K.placeSeg(segs[0], hip, knee, V(0, 0, 1)); K.placeSeg(segs[1], knee, ankle, V(0, 0, -1)); K.placeSeg(segs[2], ankle, foot, V(0, 0, 1));
        this.knobs[i * 2].position.copy(knee); this.knobs[i * 2 + 1].position.copy(ankle);
        this.feet[i].position.copy(foot);
        this.feet[i].rotation.set(0, s * .15, 0);
      }
      // arms: reach and paw while prowling, pump while running, grab when killing
      const sh = tv[0], el = tv[1], hand = tv[2];
      for (let i = 0; i < 2; i++) {
        const s = i ? 1 : -1, segs = this.armsM[i];
        sh.set(s * .24, .38, .02); this.chest.localToWorld(sh); R.worldToLocal(sh);
        const g = this.gait.legs[1 - i], swing = g.stepping ? Math.sin(g.t * Math.PI) : 0;
        const legZ = this.toLocal(this.gait.legs[1 - i].pos, tv[3]).z;
        if (killing || this.state === 'lockerCheck' && this.timer > 1) {
          hand.set(s * .3, sh.y + .1 + Math.sin(this.t * 9 + i) * .03, sh.z + .55);
        } else if (ar > .3) {
          hand.set(s * .28, sh.y - .45 + swing * .12, sh.z + legZ * .7 + .15);
        } else {
          hand.set(s * .3, Math.max(.06, sh.y - .62 + swing * .18 + this.crouchA * .1), sh.z + .3 + legZ * .5);
        }
        hand.lerp(V(s * .32, sh.y - .5, sh.z + .2), this.flinch * .6);
        K.ik2(sh, hand, .44, .5, V(s * .6, -.2, -1), el, hand);
        K.placeSeg(segs[0], sh, el, V(0, 0, 1)); K.placeSeg(segs[1], el, hand, V(0, 0, 1));
        this.knobs[4 + i].position.copy(el);
        const dir = tv[4].subVectors(hand, el).normalize();
        K.placeSeg(this.hands[i], hand, tv[5].copy(hand).add(dir), V(s, 0, 0));
        const curl = killing ? .9 : (ar > .3 ? .5 : .2 + swing * .3);
        this.hands[i].fingers.forEach(([b, j], f) => { if (f < 3) { b.rotation.x = curl * .6; j.rotation.x = curl; } });
      }
      // tail: travelling wave, lifted when agitated
      const base = tv[0].set(0, .02, -.25); this.hips.localToWorld(base); R.worldToLocal(base);
      let yaw = Math.sin(this.t * 1.1) * .2, pitch = -.35 + ar * .25 + (this.state === 'hunt' ? .2 : 0) + ra * -.2;
      const p = this.tailPts; p[0].copy(base);
      for (let k = 0; k < this.tail.length; k++) {
        yaw += Math.sin(this.t * (1.6 + ar * 2) - k * .45) * (.06 + k * .004) + K.angDiff(0, 0);
        pitch += k < 6 ? .04 : -.012 + Math.sin(this.t * 1.3 - k * .3) * .02;
        const dir = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
        p[k + 1].copy(p[k]).addScaledVector(dir, .15);
        if (p[k + 1].y < .03 - this.ventY) { p[k + 1].y = .03 - this.ventY; pitch = Math.max(pitch, 0); }
        K.placeSeg(this.tail[k], p[k], p[k + 1], V(0, 1, 0));
      }
      const tip = p[this.tail.length], prev = p[this.tail.length - 1];
      K.placeSeg(this.blade, tip, tv[1].subVectors(tip, prev).normalize().add(tip), V(0, 1, 0)); this.blade.translateY(.12);
      this.lightUp(this.mats, 1);
    }
    // hit volumes (world) for bullets
    hitSpheres() {
      if (!this.root.visible) return [];
      const out = [], R = this.root; R.updateMatrixWorld(true);
      const w = (o, x, y, z, r, part) => { const v = V(x, y, z); o.localToWorld(v); out.push({ x: v.x, y: v.y, z: v.z, r, part }); };
      w(this.head, 0, 0, .1, .2, 'head'); w(this.chest, 0, .25, 0, .3, 'body'); w(this.hips, 0, 0, 0, .28, 'body'); w(this.spine, 0, .15, 0, .2, 'body');
      for (const segs of this.legsM) { const s = segs[1]; out.push({ x: s.getWorldPosition(V()).x, y: s.getWorldPosition(V()).y, z: s.getWorldPosition(V()).z, r: .15, part: 'limb' }); }
      return out;
    }
  }

  // ============================================================ HUSK
  class Husk extends Agent {
    constructor(G, x, z, seed) {
      super(G, x, z);
      const r = K.rng(seed || 1);
      this.kind = 'husk'; this.radius = .35; this.hp = 110; this.r = r;
      const env = G.envMap;
      const T = ctex(); const suit = tagMat(new THREE.MeshStandardMaterial({ color: r.pick([0xc0773a, 0x5a6f84, 0x8a8c84, 0xa65840, 0x6a7a6a, 0xb0a888]), map: T.suit.map, bumpMap: T.suit.bump, bumpScale: .02, roughness: .9, metalness: 0 }), .9);
      const skin = tagMat(new THREE.MeshStandardMaterial({ color: 0xa8a49a, map: T.skin.map, bumpMap: T.skin.bump, bumpScale: .025, roughness: .42, metalness: 0, envMap: env, envMapIntensity: .35 }), .9);
      const rot = tagMat(new THREE.MeshStandardMaterial({ color: 0x3e1c18, roughness: .3, metalness: .1, envMap: env, envMapIntensity: .6 }), .7);
      const growth = tagMat(new THREE.MeshStandardMaterial({ color: 0x30343c, map: T.shell.map, bumpMap: T.shell.bump, bumpScale: .03, roughness: .14, metalness: .5, envMap: env, envMapIntensity: 1.3 }), .3);
      const boot = tagMat(new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .7 }), .6);
      const bone = tagMat(new THREE.MeshStandardMaterial({ color: 0xcfc4a8, roughness: .5 }), .8);
      const teeth = tagMat(new THREE.MeshStandardMaterial({ color: 0xbdb38f, roughness: .3 }), .8);
      this.mats = [suit, skin, rot, growth, boot, bone, teeth];
      const R = this.root;
      this.hips = new THREE.Object3D(); R.add(this.hips);
      this.spine = new THREE.Object3D(); this.spine.position.set(0, .14, 0); this.hips.add(this.spine);
      this.chest = new THREE.Object3D(); this.chest.position.set(0, .26, 0); this.spine.add(this.chest);
      this.neck = new THREE.Object3D(); this.neck.position.set(0, .34, .03); this.chest.add(this.neck);
      this.head = new THREE.Object3D(); this.head.position.set(0, .1, .03); this.neck.add(this.head);
      // pelvis, belt with pouches and a holstered torch
      this.hips.add(mesh(G_.sph, suit, 0, 0, 0, .35, .22, .23));
      this.hips.add(mesh(G_.cyl, boot, 0, .06, 0, .36, .05, .25)); this.hips.add(mesh(G_.box, K.CG_buckle || (K.CG_buckle = new THREE.MeshStandardMaterial({ color: 0x8a8a80, metalness: .9, roughness: .3 })), 0, .06, .125, .06, .04, .01));
      for (const sx of [-1, 1]) this.hips.add(mesh(G_.box, boot, sx * .14, .02, .08, .07, .08, .04, 0, sx * .3, 0));
      if (r.chance(.5)) this.hips.add(mesh(G_.cyl, boot, -.18, -.02, -.04, .035, .14, .035));
      // abdomen + torso (torn coverall, ribs showing through on some)
      this.spine.add(mesh(G_.sph, suit, 0, .09, 0, .31, .27, .21));
      const torso = new THREE.Mesh(K.lathe([[.13, 0], [.16, .06], [.185, .16], [.2, .26], [.205, .31], [.17, .36], [.08, .4]], 14), suit); torso.scale.set(1.18, 1, .74); torso.castShadow = true; this.chest.add(torso);
      for (const sx of [-1, 1]) { this.chest.add(mesh(G_.sph, suit, sx * .19, .32, 0, .14, .12, .14)); this.chest.add(mesh(G_.box, suit, sx * .17, .36, 0, .1, .02, .12)); } // shoulders + epaulettes
      this.chest.add(mesh(G_.box, suit, 0, .2, .145, .2, .3, .01)); // zip placket
      if (r.chance(.65)) { // torn open chest cavity
        this.chest.add(mesh(G_.sph, rot, r.range(-.06, .06), .19, .125, .15, .17, .06));
        for (let k = 0; k < 4; k++) this.chest.add(mesh(G_.box, bone, -.06 + k * .04, .19, .145, .016, .16, .02, 0, 0, (k - 1.5) * .3));
        this.chest.add(mesh(G_.sph, rot, 0, .07, .15, .1, .05, .05));
      }
      // torn back: exposed vertebrae and black growths bursting out
      for (let k = 0; k < 6; k++) this.chest.add(mesh(G_.sphL, bone, 0, .04 + k * .055, -.14, .05, .035, .04));
      for (let k = 0; k < r.int(3, 7); k++) { const g = mesh(G_.cone, growth, r.range(-.15, .15), r.range(.1, .36), r.range(-.17, -.1), r.range(.03, .06), r.range(.08, .22), r.range(.03, .06), -1.8 + r.range(-.4, .4), 0, r.range(-.6, .6)); this.chest.add(g); }
      for (let k = 0; k < r.int(2, 5); k++) this.chest.add(mesh(G_.sphL, growth, r.range(-.2, .2), r.range(.12, .38), r.range(-.15, .08), r.range(.06, .13), r.range(.06, .13), r.range(.06, .13)));
      // neck with distended tendons
      this.neck.add(mesh(G_.cyl, skin, 0, .05, 0, .085, .13, .085)); for (const sx of [-1, 1]) this.neck.add(mesh(G_.cyl, skin, sx * .028, .05, .02, .02, .13, .02, .2, 0, sx * .15));
      // skull: sculpted cranium, cheekbones, sunken black eye sockets with glints, hanging jaw, broken teeth
      const skull = new THREE.Mesh(K.lathe([[0, 0], [.07, .01], [.1, .06], [.112, .13], [.105, .2], [.08, .25], [.03, .275], [0, .28]], 14), skin); skull.scale.set(1, 1, 1.12); skull.position.set(0, .0, -.005); skull.castShadow = true; this.head.add(skull);
      for (const sx of [-1, 1]) {
        this.head.add(mesh(G_.sph, skin, sx * .062, .1, .085, .045, .03, .03)); // cheekbone
        this.head.add(mesh(G_.sph, K.CG_void || (K.CG_void = new THREE.MeshBasicMaterial({ color: 0x050303 })), sx * .042, .145, .1, .034, .026, .02)); // sockets
        this.head.add(mesh(G_.sph, K.CG_glint || (K.CG_glint = new THREE.MeshBasicMaterial({ color: 0x9a9a7a })), sx * .042, .145, .112, .008, .008, .004)); // milky eyes
        this.head.add(mesh(G_.box, skin, sx * .04, .175, .1, .05, .012, .02, 0, 0, sx * .2)); // brow
      }
      this.head.add(mesh(G_.cone, skin, 0, .12, .115, .022, .05, .02, -.3, 0, 0)); // nose
      for (let k = 0; k < 7; k++) if (r.chance(.8)) this.head.add(mesh(G_.box, teeth, -.03 + k * .01, .068, .103 - Math.abs(k - 3) * .004, .007, .014, .006));
      this.jaw = new THREE.Object3D(); this.jaw.position.set(0, .07, .02); this.head.add(this.jaw);
      this.jaw.add(mesh(G_.sph, skin, 0, -.035, .045, .12, .065, .12)); this.jaw.add(mesh(G_.sph, rot, 0, -.02, .07, .07, .035, .04));
      for (let k = 0; k < 6; k++) if (r.chance(.7)) this.jaw.add(mesh(G_.box, teeth, -.025 + k * .01, -.008, .085 - Math.abs(k - 2.5) * .004, .007, .012, .006));
      if (r.chance(.7)) for (let k = 0; k < r.int(2, 5); k++) this.head.add(mesh(G_.sphL, growth, r.range(-.1, .1), r.range(.12, .27), r.range(-.12, .04), r.range(.04, .1), r.range(.04, .1), r.range(.04, .1)));
      if (r.chance(.4)) for (let k = 0; k < 12; k++) this.head.add(mesh(G_.cyl, boot, r.range(-.08, .08), .22 + r.range(0, .04), r.range(-.1, .04), .006, r.range(.03, .07), .006, r.range(-.6, .6), 0, r.range(-.6, .6))); // matted hair
      if (r.chance(.35)) { this.head.add(mesh(G_.sph, suit, 0, .2, -.02, .23, .11, .24)); this.head.add(mesh(G_.box, suit, 0, .2, .1, .2, .015, .07, .3, 0, 0)); } // cap
      // limbs
      const L = (len, r0, r1, m) => { const sg = segMesh(len, r0, r1, m, 10); R.add(sg); return sg; };
      this.legsM = [0, 1].map(() => [L(.44, .09, .068, suit), L(.44, .066, .052, suit)]);
      for (const [th, sh] of this.legsM) { th.add(mesh(G_.box, suit, .07, .2, .02, .04, .12, .09)); sh.add(mesh(G_.sph, suit, 0, 0, .03, .08, .07, .08)); sh.add(mesh(G_.cyl, suit, 0, .38, 0, .115, .06, .115)); } // cargo pocket, knee, cuff
      const mutated = r.chance(.3);
      this.armsM = [0, 1].map(i => [L(.29, .058, .046, suit), L(.27, .046, .034, i === 1 && mutated ? growth : skin)]);
      for (const [ua, fa] of this.armsM) { ua.add(mesh(G_.cyl, suit, 0, .27, 0, .1, .05, .1)); fa.add(mesh(G_.sphL, skin, 0, 0, -.02, .06, .06, .06)); } // rolled sleeve, elbow
      this.bootsM = [0, 1].map(() => { const b = new THREE.Group(); b.add(mesh(G_.box, boot, 0, 0, .02, .11, .1, .27)); b.add(mesh(G_.box, K.CG_sole || (K.CG_sole = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: .9 })), 0, -.05, .02, .12, .025, .29)); b.add(mesh(G_.cyl, boot, 0, .07, -.02, .11, .1, .11)); R.add(b); return b; });
      this.handsM = [0, 1].map(i => {
        const h = new THREE.Object3D(); const m = i === 1 && mutated ? growth : skin;
        h.add(mesh(G_.sph, m, 0, .05, 0, .075, .1, .035));
        for (let f = 0; f < 4; f++) { const a = new THREE.Object3D(); a.position.set(-.027 + f * .018, .095, 0); a.rotation.x = .6 + f * .08; h.add(a); const s1 = segMesh(.045, .009, .008, m, 5); a.add(s1); const j = new THREE.Object3D(); j.position.y = .045; j.rotation.x = .7; a.add(j); const s2 = segMesh(mutated && i === 1 ? .09 : .04, .008, .003, mutated && i === 1 ? teeth : m, 5); j.add(s2); }
        const th = segMesh(.05, .01, .006, m, 5); th.position.set(.035, .04, .01); th.rotation.set(.4, 0, -.7); h.add(th);
        R.add(h); return h;
      });
      this.limp = r.range(0, .6); this.lurch = 0; this.armsUp = r.chance(.5) ? 1 : 0;
      this.gait = new Gait([{ side: -1, group: 0 }, { side: 1, group: 1 }]);
      this.gait.onPlant = (i, p) => this.G.audio && this.G.audio.step(p.x, p.z, .25, 'husk');
      this.state = r.chance(.3) ? 'feed' : 'idle'; this.timer = 0; this.atkT = 0; this.stagger = 0; this.deadT = 0; this.groanT = r.range(3, 9);
      this.home = [x, z]; this.alert = 0;
    }
    update(dt) {
      const G = this.G, P = G.player; this.t += dt;
      if (!this.alive) { this.animDeath(dt); return; }
      const dP = Math.hypot(P.x - this.x, P.z - this.z);
      this.stagger = Math.max(0, this.stagger - dt * 2);
      this.groanT -= dt;
      if (this.groanT <= 0) { this.groanT = this.state === 'chase' ? K.lerp(1.5, 4, Math.random()) : K.lerp(5, 12, Math.random()); if (dP < 25) G.audio && G.audio.groan(this.x, 1.6, this.z, this.state === 'chase' ? 1 : .5, this.r()); }
      // perception
      if (this.state !== 'chase' && this.state !== 'attack') {
        if (!P.locker && this.canSee(P.x, P.z, P.crouch ? 8 : 14, Math.cos(1.3), 1.6) && (G.playerLight() > .03 || P.flashOn || dP < 5)) this.alert += dt * (P.flashOn ? 2.5 : 1.4) * (1.2 - dP / 15);
        else this.alert = Math.max(0, this.alert - dt * .3);
        for (const n of G.noises) { if (n.heardBy?.has(this)) continue; const d = Math.hypot(n.x - this.x, n.z - this.z); if (d < n.r * .8) { (n.heardBy || (n.heardBy = new Set())).add(this); this.state = 'investigate'; this.gx = n.x; this.gz = n.z; } }
        if (this.alert > 1) { this.state = 'chase'; G.audio && G.audio.groan(this.x, 1.6, this.z, 1.3, this.r()); }
      }
      switch (this.state) {
        case 'idle': this.speed = K.damp(this.speed, 0, 4, dt); this.timer -= dt; if (this.timer <= 0) { this.timer = K.lerp(4, 12, this.r()); const a = this.r() * K.TAU; this.gx = this.home[0] + Math.cos(a) * 3; this.gz = this.home[1] + Math.sin(a) * 3; this.state = 'wander'; } break;
        case 'feed': this.speed = 0; break;
        case 'wander': { const d = this.moveTo(this.gx, this.gz, .55, dt, { turn: 1.5 }); if (d < .6 || !this.path) { this.state = 'idle'; this.timer = K.lerp(3, 8, this.r()); } break; }
        case 'investigate': { const d = this.moveTo(this.gx, this.gz, 1.1, dt, { turn: 2 }); if (d < 1 || !this.path) { this.state = 'idle'; this.timer = 6; } break; }
        case 'chase': {
          this.lurchT = (this.lurchT || 2) - dt;
          if (this.lurchT <= 0) { this.lurchT = K.lerp(2, 5, this.r()); this.lurch = .9; }
          this.lurch = Math.max(0, this.lurch - dt);
          const spd = (1.55 + (this.lurch > 0 ? 1.7 : 0)) * (1 - this.stagger * .8) * (P.locker ? .4 : 1);
          const d = this.moveTo(P.x, P.z, spd, dt, { repath: .7, turn: 3, stop: .9 });
          if (d < 1.3 && !P.locker) { this.state = 'attack'; this.timer = 0; this.hitDone = false; }
          if (dP > 30 || (P.locker && d < 1.5)) { this.state = 'idle'; this.alert = 0; this.timer = 4; }
          break;
        }
        case 'attack': {
          this.timer += dt; this.speed = K.damp(this.speed, 0, 6, dt); this.face(P.x, P.z, 5, dt);
          if (this.timer > .45 && !this.hitDone) { this.hitDone = true; if (dP < 1.7 && !P.locker) G.damagePlayer(18, this); else G.audio && G.audio.swish(); }
          if (this.timer > 1.15) this.state = dP < 1.5 ? 'attack' : 'chase', this.timer = 0, this.hitDone = false;
          break;
        }
      }
      this.animate(dt);
    }
    hurt(dmg, type, hx, hz, part) {
      if (!this.alive) return;
      const mult = part === 'head' ? 2.6 : part === 'limb' ? .6 : 1;
      this.hp -= dmg * mult; this.stagger = Math.min(1, this.stagger + dmg / 40); this.alert = 2;
      if (this.state !== 'attack') this.state = 'chase';
      if (part === 'head' && dmg * mult > 70 && !this.headless) { this.headless = true; this.head.visible = false; this.G.fx && this.G.fx.gore(this.head.getWorldPosition(V()), 1); }
      if (this.hp <= 0) { this.alive = false; this.deadT = 0; this.fallDir = Math.random() < .5 ? 1 : -1; this.G.audio && this.G.audio.groan(this.x, 1.4, this.z, .7, .9); this.G.onKill && this.G.onKill(this); }
    }
    animate(dt) {
      const R = this.root, sp = this.speed, atk = this.state === 'attack' ? this.timer : -1;
      R.position.set(this.x, 0, this.z); R.rotation.y = this.h;
      const self = this;
      this.gait.update(dt, i => { const l = V((i ? 1 : -1) * .13, 0, .05 + (i ? -this.limp * .1 : 0)); return self.toWorld(l, V()).add(V(Math.sin(this.h) * sp * .2, 0, Math.cos(this.h) * sp * .2)); }, sp, { lift: .07, thr: .14, thrK: .12, dur: K.clamp(.5 - sp * .08, .22, .5) });
      const ph = this.gait.phase();
      const feed = this.state === 'feed' ? 1 : 0;
      this.feedA = K.damp(this.feedA || 0, feed, 2, dt);
      const fa = this.feedA, lunge = atk >= 0 ? K.bump(atk, .1, .4, .6, 1.0) : 0;
      this.hips.position.set(0, .93 - fa * .5 - ph * .04 - lunge * .08 + Math.abs(Math.sin(this.t * 2)) * .01 * (1 - fa), 0);
      this.hips.rotation.set(.2 + fa * .9 + lunge * .2 - this.stagger * .4, 0, Math.sin(this.t * 3) * .04 + this.limp * .08 * (this.gait.legs[1].stepping ? 1 : -1));
      this.spine.rotation.set(.28 + fa * .4 + lunge * .25, Math.sin(this.t * .8) * .15, .07);
      this.chest.rotation.set(.22 + lunge * .2 - this.stagger * .5 + Math.sin(this.t * 1.7) * .03, -lunge * .3, -.09);
      this.neck.rotation.set(-.15 + fa * .5, Math.sin(this.t * .6) * .3, Math.sin(this.t * .45) * .35 + .25); // lolling
      this.head.rotation.set(.2 + Math.sin(this.t * 7) * .05 * fa, 0, Math.sin(this.t * .5) * .15);
      this.jaw.rotation.x = .3 + Math.sin(this.t * 3.1) * .12 + lunge * .4 + fa * Math.abs(Math.sin(this.t * 8)) * .3;
      R.updateMatrixWorld(true);
      const hip = tv[0], knee = tv[1], ankle = tv[2];
      for (let i = 0; i < 2; i++) {
        const s = i ? 1 : -1;
        hip.set(s * .12, -.06, 0); this.hips.localToWorld(hip); R.worldToLocal(hip);
        this.toLocal(this.gait.legs[i].pos, ankle); ankle.y += .08;
        if (fa > .1) ankle.lerp(V(s * .2, .08, -.2 + i * .3), fa);
        K.ik2(hip, ankle, .44, .44, V(0, 0, 1), knee, ankle);
        K.placeSeg(this.legsM[i][0], hip, knee, V(0, 0, 1)); K.placeSeg(this.legsM[i][1], knee, ankle, V(0, 0, 1));
        this.bootsM[i].position.set(ankle.x, ankle.y - .03, ankle.z + .04);
      }
      const sh = tv[0], el = tv[1], hand = tv[2];
      for (let i = 0; i < 2; i++) {
        const s = i ? 1 : -1;
        sh.set(s * .2, .3, 0); this.chest.localToWorld(sh); R.worldToLocal(sh);
        const g = this.gait.legs[1 - i], sw = g.stepping ? Math.sin(g.t * Math.PI) - .5 : 0;
        const reach = this.state === 'chase' ? Math.max(this.armsUp, .5) : 0;
        hand.set(s * .22, sh.y - .48 + reach * .45 + Math.sin(this.t * 2 + i) * .03, sh.z + .16 + sw * .12 + reach * .4);
        if (lunge > 0) hand.set(s * .18, sh.y + .05, sh.z + .55 * lunge + .1);
        if (fa > .1) hand.lerp(V(s * .15 + Math.sin(this.t * 6 + i) * .05, .15, .4), fa);
        K.ik2(sh, hand, .29, .27, V(s * .3, -.4, -1), el, hand);
        K.placeSeg(this.armsM[i][0], sh, el, V(0, 0, 1)); K.placeSeg(this.armsM[i][1], el, hand, V(0, 0, 1));
        K.placeSeg(this.handsM[i], hand, tv[3].subVectors(hand, el).normalize().add(hand), V(s, 0, 0));
      }
      this.lightUp(this.mats, 1);
    }
    animDeath(dt) {
      this.deadT += dt;
      const t = K.ease.out(K.clamp(this.deadT / .9, 0, 1));
      const R = this.root; R.position.set(this.x, 0, this.z);
      this.hips.position.y = K.lerp(.93, .14, t); this.hips.rotation.set(K.lerp(.12, 1.45, t), 0, this.fallDir * t * .3);
      this.spine.rotation.x = K.lerp(.15, .1, t); this.chest.rotation.x = K.lerp(.1, -.2, t); this.neck.rotation.z = t * .9 * this.fallDir;
      R.updateMatrixWorld(true);
      const hip = tv[0], knee = tv[1], ankle = tv[2];
      for (let i = 0; i < 2; i++) {
        const s = i ? 1 : -1;
        hip.set(s * .12, -.06, 0); this.hips.localToWorld(hip); R.worldToLocal(hip);
        ankle.set(s * (.15 + i * .1), .06, K.lerp(0, -.75 - i * .1, t));
        K.ik2(hip, ankle, .44, .44, V(0, 1, .3), knee, ankle);
        K.placeSeg(this.legsM[i][0], hip, knee, V(0, 1, 0)); K.placeSeg(this.legsM[i][1], knee, ankle, V(0, 1, 0));
        this.bootsM[i].position.copy(ankle);
        const sh = tv[3].set(s * .2, .3, 0); this.chest.localToWorld(sh); R.worldToLocal(sh);
        const hand = V(s * .5, .05, sh.z + .2 * s), el = V();
        K.ik2(sh, hand, .29, .27, V(s, 0, 0), el, hand);
        K.placeSeg(this.armsM[i][0], sh, el, V(0, 1, 0)); K.placeSeg(this.armsM[i][1], el, hand, V(0, 1, 0)); this.handsM[i].position.copy(hand);
      }
      if (this.deadT < 1.2) this.lightUp(this.mats, 1);
    }
    hitSpheres() {
      if (!this.alive) return [];
      const out = [], R = this.root; R.updateMatrixWorld(true);
      const w = (o, x, y, z, r, part) => { const v = V(x, y, z); o.localToWorld(v); out.push({ x: v.x, y: v.y, z: v.z, r, part }); };
      if (!this.headless) w(this.head, 0, .1, 0, .16, 'head');
      w(this.chest, 0, .18, 0, .24, 'body'); w(this.hips, 0, .05, 0, .24, 'body');
      for (const l of this.legsM) { const p = l[0].getWorldPosition(V()); out.push({ x: p.x, y: p.y - .2, z: p.z, r: .13, part: 'limb' }); }
      return out;
    }
  }

  // ============================================================ CRAWLER
  class Crawler extends Agent {
    constructor(G, x, z, seed) {
      super(G, x, z);
      this.kind = 'crawler'; this.radius = .3; this.hp = 30;
      const env = G.envMap;
      const T = ctex(); const skin = tagMat(new THREE.MeshStandardMaterial({ color: 0x9a8676, map: T.flesh.map, bumpMap: T.flesh.bump, bumpScale: .03, roughness: .3, metalness: .05, envMap: env, envMapIntensity: .5 }), .9);
      const dark = tagMat(new THREE.MeshStandardMaterial({ color: 0x6a5048, map: T.flesh.map, roughness: .25, envMap: env, envMapIntensity: .6 }), .7);
      this.mats = [skin, dark];
      const R = this.root;
      this.body = new THREE.Object3D(); R.add(this.body);
      this.body.add(mesh(G_.sph, skin, 0, 0, 0, .34, .14, .42)); this.body.add(mesh(G_.sph, dark, 0, .04, -.05, .26, .1, .3));
      for (let k = 0; k < 5; k++) this.body.add(mesh(G_.box, dark, 0, .07, -.15 + k * .07, .25, .02, .025));
      this.body.add(mesh(G_.sph, dark, 0, -.04, .2, .12, .06, .1)); // mouth sac
      for (let k = 0; k < 6; k++) this.body.add(mesh(G_.cone, dark, (k % 2 ? 1 : -1) * .05, .02, .3 + (k >> 1) * .02, .012, .07, .012, Math.PI / 2 + .3, 0, (k % 2 ? -1 : 1) * .4)); // mouthparts
      for (const sx of [-1, 1]) this.body.add(mesh(G_.sph, dark, sx * .16, .06, .05, .12, .07, .26)); // gill sacs
      this.legs = []; this.legM = [];
      for (let k = 0; k < 8; k++) {
        const s = k < 4 ? -1 : 1, q = k % 4;
        this.legs.push({ side: s, q, group: (q + (s > 0 ? 1 : 0)) % 2 });
        const a = segMesh(.3, .03, .022, skin, 6), b = segMesh(.34, .022, .006, skin, 6); R.add(a); R.add(b); this.legM.push([a, b]);
        a.add(mesh(G_.sphL, dark, 0, .3, 0, .055, .055, .055)); for (let q = 1; q < 4; q++) b.add(mesh(G_.cyl, dark, 0, q * .08, 0, .045 - q * .008, .012, .045 - q * .008)); b.add(mesh(G_.cone, dark, 0, .36, 0, .012, .05, .012));
      }
      this.gait = new Gait(this.legs);
      this.tail = []; for (let k = 0; k < 12; k++) { const m = segMesh(.11, .04 * (1 - k / 13) + .008, .04 * (1 - (k + 1) / 13) + .006, skin, 6); R.add(m); this.tail.push(m); }
      this.tailPts = Array.from({ length: 13 }, () => V());
      this.state = 'lurk'; this.timer = 0; this.leap = null; this.y = 0;
    }
    update(dt) {
      const G = this.G, P = G.player; this.t += dt;
      if (!this.alive) { this.root.rotation.z = K.damp(this.root.rotation.z, Math.PI, 6, dt); this.root.position.y = K.damp(this.root.position.y, .1, 6, dt); return; }
      const dP = Math.hypot(P.x - this.x, P.z - this.z);
      if (this.state === 'lurk') {
        this.speed = 0;
        if ((dP < 9 && G.L.los(this.x, this.z, P.x, P.z) && !P.locker) || G.noises.some(n => Math.hypot(n.x - this.x, n.z - this.z) < n.r * .7)) { this.state = 'chase'; G.audio && G.audio.skitter(this.x, this.z, 1); }
      } else if (this.state === 'chase') {
        const d = this.moveTo(P.x, P.z, 5.2, dt, { repath: .5, turn: 8, accel: 8, stop: .5 });
        this.skT = (this.skT || 0) - dt; if (this.skT <= 0) { this.skT = .25; G.audio && G.audio.skitter(this.x, this.z, .4); }
        if (d < 4 && d > 1.5 && G.L.los(this.x, this.z, P.x, P.z) && !P.locker) { this.state = 'leap'; this.timer = 0; this.leapFrom = [this.x, this.z]; this.leapTo = [P.x, P.z]; G.audio && G.audio.shriek(this.x, this.z); }
        if (dP > 25 || P.locker) { this.state = 'lurk'; }
      } else if (this.state === 'leap') {
        this.timer += dt; const t = Math.min(1, this.timer / .5);
        const nx = K.lerp(this.leapFrom[0], this.leapTo[0], t), nz = K.lerp(this.leapFrom[1], this.leapTo[1], t);
        const r = G.collide(nx, nz, this.radius, true); this.x = r[0]; this.z = r[1];
        this.y = Math.sin(t * Math.PI) * 1.1; this.speed = 0;
        if (t > .55 && !this.hit && Math.hypot(P.x - this.x, P.z - this.z) < 1.0 && !P.locker) { this.hit = true; G.damagePlayer(14, this); }
        if (t >= 1) { this.state = 'recover'; this.timer = 0; this.hit = false; this.y = 0; }
      } else if (this.state === 'recover') {
        this.timer += dt; this.speed = K.damp(this.speed, -1.5, 6, dt); this.step(dt);
        if (this.timer > .8) this.state = 'chase';
      }
      this.animate(dt);
    }
    hurt(dmg, type, hx, hz, part) {
      if (!this.alive) return;
      this.hp -= dmg; if (this.state === 'lurk') this.state = 'chase';
      if (this.hp <= 0) { this.alive = false; this.G.audio && this.G.audio.shriek(this.x, this.z, .6); this.G.onKill && this.G.onKill(this); this.G.fx && this.G.fx.gore(V(this.x, .2, this.z), .6); }
    }
    animate(dt) {
      const R = this.root, sp = Math.abs(this.speed);
      R.position.set(this.x, this.y, this.z); R.rotation.y = this.h;
      const self = this;
      this.gait.update(dt, i => { const l = this.legs[i]; return self.toWorld(V(l.side * .42, 0, .3 - l.q * .2), V()).add(V(Math.sin(this.h) * this.speed * .1, 0, Math.cos(this.h) * this.speed * .1)); }, sp, { lift: .1, thr: .14, thrK: .03, dur: .1, overlap: true });
      this.body.position.set(0, .26 + Math.sin(this.t * 20) * .01 * (sp > .5 ? 1 : 0) + (this.state === 'lurk' ? -.08 + Math.sin(this.t * 2) * .01 : 0), 0);
      this.body.rotation.set(this.state === 'leap' ? -.5 : .05, 0, 0);
      R.updateMatrixWorld(true);
      const hip = tv[0], knee = tv[1], foot = tv[2];
      for (let i = 0; i < 8; i++) {
        const l = this.legs[i];
        hip.set(l.side * .14, 0, .18 - l.q * .12); this.body.localToWorld(hip); R.worldToLocal(hip);
        if (this.state === 'leap') foot.set(l.side * .35, this.body.position.y - .15, .4 - l.q * .12);
        else { this.toLocal(this.gait.legs[i].pos, foot); foot.y -= this.y; }
        K.ik2(hip, foot, .3, .34, V(l.side, 1.2, 0), knee, foot);
        K.placeSeg(this.legM[i][0], hip, knee, V(0, 1, 0)); K.placeSeg(this.legM[i][1], knee, foot, V(0, 1, 0));
      }
      const p = this.tailPts; p[0].set(0, 0, -.38); this.body.localToWorld(p[0]); R.worldToLocal(p[0]);
      let yaw = 0, pitch = .3;
      for (let k = 0; k < this.tail.length; k++) {
        yaw += Math.sin(this.t * 6 - k * .6) * .12; pitch -= .05;
        p[k + 1].copy(p[k]).add(V(Math.sin(yaw) * Math.cos(pitch) * .11, Math.sin(pitch) * .11, -Math.cos(yaw) * Math.cos(pitch) * .11));
        if (p[k + 1].y < .02 - this.y) p[k + 1].y = .02 - this.y;
        K.placeSeg(this.tail[k], p[k], p[k + 1], V(0, 1, 0));
      }
      this.lightUp(this.mats, 1);
    }
    hitSpheres() { if (!this.alive) return []; const v = V(); this.body.getWorldPosition(v); return [{ x: v.x, y: v.y, z: v.z, r: .32, part: 'body' }]; }
  }

  K.ctex = ctex;
  K.Stalker = Stalker; K.Husk = Husk; K.Crawler = Crawler;
})();
