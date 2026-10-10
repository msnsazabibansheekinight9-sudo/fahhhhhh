// Kestrel — shared utilities: math, RNG, procedural textures, baked-light materials, geometry builder, IK.
(function () {
  const K = window.K = window.K || {};
  K.S = 2.5;               // grid cell size in metres
  K.WT = 0.15;             // half wall thickness
  K.TAU = Math.PI * 2;
  K.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  K.lerp = (a, b, t) => a + (b - a) * t;
  K.smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  K.seg = (t, a, b) => K.clamp((t - a) / (b - a), 0, 1);
  K.ease = {
    inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    back: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    sin: t => Math.sin(t * Math.PI),
  };
  // eased bump: rises over [a,b], holds, falls over [c,d]
  K.bump = (t, a, b, c, d) => K.ease.inOut(K.seg(t, a, b)) * (1 - K.ease.inOut(K.seg(t, c, d)));
  K.angDiff = (a, b) => { let d = (b - a) % K.TAU; if (d > Math.PI) d -= K.TAU; if (d < -Math.PI) d += K.TAU; return d; };
  K.damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);

  K.rng = function (seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    r.int = (a, b) => a + Math.floor(r() * (b - a + 1));
    r.pick = a => a[Math.floor(r() * a.length)];
    r.range = (a, b) => a + r() * (b - a);
    r.chance = p => r() < p;
    r.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return r;
  };

  // ---------------------------------------------------------------- textures
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
  K.canvas = cv;
  function noise(ctx, w, h, amt, seed, mono = true) {
    const id = ctx.getImageData(0, 0, w, h), d = id.data, r = K.rng(seed);
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - .5) * amt;
      d[i] += n; d[i + 1] += mono ? n : (r() - .5) * amt; d[i + 2] += mono ? n : (r() - .5) * amt;
    }
    ctx.putImageData(id, 0, 0);
  }
  function blotches(ctx, w, h, seed, n, alpha, rgb, rmin, rmax) {
    const r = K.rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h, rad = r.range(rmin, rmax);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(${rgb},${alpha * r()})`); g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  function streaks(ctx, w, h, seed, n, alpha) { // vertical grime runs
    const r = K.rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h * .6, len = r.range(30, 200);
      const g = ctx.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, `rgba(30,24,16,${alpha})`); g.addColorStop(1, 'rgba(30,24,16,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, r.range(1, 5), len);
    }
  }
  function tex(c, srgb = true) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  K.tex = tex;
  // paints colour + height from the same painter: col(css, h) returns css in colour pass, grey(h) in bump pass
  function surface(size, painter, post) {
    const out = {};
    for (const pass of ['map', 'bump']) {
      const c = cv(size), ctx = c.getContext('2d');
      const col = pass === 'map' ? (css) => css : (css, h) => { const v = Math.round(K.clamp(h, 0, 1) * 255); return `rgb(${v},${v},${v})`; };
      painter(ctx, size, col, pass === 'bump');
      if (post) post(ctx, size, pass === 'bump');
      out[pass] = tex(c, pass === 'map');
    }
    return out;
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  K.rrect = rrect;
  function bevelPanel(ctx, x, y, w, h, r, col, base, hb, lip) {
    ctx.fillStyle = col('rgba(0,0,0,.45)', .15); rrect(ctx, x - lip, y - lip, w + lip * 2, h + lip * 2, r + lip); ctx.fill();
    ctx.fillStyle = col(base, hb); rrect(ctx, x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = col('rgba(255,255,255,.18)', hb + .15); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + r, y + 1); ctx.lineTo(x + w - r, y + 1); ctx.stroke();
  }
  function rivets(ctx, pts, col, rad) {
    for (const [x, y] of pts) {
      ctx.fillStyle = col('rgba(0,0,0,.5)', .3); ctx.beginPath(); ctx.arc(x + 1, y + 1, rad, 0, K.TAU); ctx.fill();
      ctx.fillStyle = col('#a39d90', .95); ctx.beginPath(); ctx.arc(x, y, rad, 0, K.TAU); ctx.fill();
    }
  }

  K.makeTextures = function () {
    const T = {};
    // Station wall: 70s retro-future cream plastic panels over steel, grimy
    T.wallS = surface(512, (c, s, col, b) => {
      c.fillStyle = col('#a9a596', .5); c.fillRect(0, 0, s, s);
      // steel kick band
      c.fillStyle = col('#4f4d48', .35); c.fillRect(0, s * .86, s, s * .14);
      for (let x = 0; x < s; x += 16) { c.fillStyle = col('rgba(0,0,0,.25)', .25); c.fillRect(x, s * .88, 6, s * .1); }
      // two tall panels
      for (let k = 0; k < 2; k++) {
        const x = k * s / 2 + 10, w = s / 2 - 20;
        bevelPanel(c, x, 18, w, s * .38, 14, col, '#c4bfae', .72, 3);
        bevelPanel(c, x, s * .47, w, s * .36, 14, col, '#bdb8a7', .7, 3);
        // vent slots on lower panel
        for (let i = 0; i < 6; i++) { c.fillStyle = col('#2a2824', .1); rrect(c, x + 26, s * .62 + i * 12, w - 52, 5, 2); c.fill(); }
        // inset label plate
        c.fillStyle = col('#7b766a', .55); c.fillRect(x + 20, 40, 70, 18);
        c.fillStyle = col('#e0dccd', .6); c.font = 'bold 12px monospace'; c.fillText(k ? 'HV-07' : 'KS-12', x + 26, 54);
        rivets(c, [[x + 8, 30], [x + w - 8, 30], [x + 8, s * .82], [x + w - 8, s * .82]], col, 3);
      }
      // mid service strip with indicator lamps
      c.fillStyle = col('#3d3b36', .3); c.fillRect(0, s * .425, s, s * .035);
      for (let x = 30; x < s; x += 128) { c.fillStyle = col('#7a2a18', .5); c.fillRect(x, s * .43, 10, 8); c.fillStyle = col('#c9a64a', .5); c.fillRect(x + 16, s * .43, 10, 8); }
      c.fillStyle = col('#2b2925', .05); c.fillRect(s / 2 - 2, 0, 4, s); c.fillRect(0, 0, s, 3);
    }, (c, s, b) => {
      noise(c, s, s, b ? 18 : 22, 11);
      if (!b) { blotches(c, s, s, 3, 26, .25, '40,32,20', 20, 90); streaks(c, s, s, 5, 30, .35); blotches(c, s, s, 9, 8, .3, '20,16,10', 40, 140); }
    });
    // Cruiser wall: dark military steel ribbed plating
    T.wallC = surface(512, (c, s, col) => {
      c.fillStyle = col('#3b4045', .5); c.fillRect(0, 0, s, s);
      for (let k = 0; k < 4; k++) {
        const y = k * s / 4;
        bevelPanel(c, 8, y + 8, s - 16, s / 4 - 16, 4, col, k === 3 ? '#2b2f33' : '#454b51', .62, 2);
        for (let x = 24; x < s - 16; x += 40) { c.fillStyle = col('rgba(0,0,0,.35)', .35); c.fillRect(x, y + 20, 4, s / 4 - 40); }
      }
      // hazard band near floor
      c.save(); c.beginPath(); c.rect(0, s * .93, s, s * .05); c.clip();
      c.fillStyle = col('#c69a1a', .55); c.fillRect(0, s * .93, s, s * .05);
      c.fillStyle = col('#141414', .4);
      for (let x = -40; x < s + 40; x += 40) { c.beginPath(); c.moveTo(x, s * .98); c.lineTo(x + 20, s * .93); c.lineTo(x + 40, s * .93); c.lineTo(x + 20, s * .98); c.fill(); }
      c.restore();
      c.fillStyle = col('#b8bec4', .6); c.font = 'bold 18px monospace'; c.fillText('DECK 3 · FR 114', 30, s * .3 + 6);
      rivets(c, [[16, 16], [s - 16, 16], [16, s / 2], [s - 16, s / 2]], col, 3);
    }, (c, s, b) => { noise(c, s, s, b ? 14 : 18, 21); if (!b) { blotches(c, s, s, 13, 20, .35, '10,8,6', 30, 120); streaks(c, s, s, 6, 20, .3); } });
    // Station floor: rubberised tiles
    T.floorS = surface(512, (c, s, col) => {
      c.fillStyle = col('#3a3936', .5); c.fillRect(0, 0, s, s);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        bevelPanel(c, i * s / 2 + 4, j * s / 2 + 4, s / 2 - 8, s / 2 - 8, 6, col, '#4a4843', .55, 2);
        for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) {
          c.fillStyle = col('#57554f', .7); c.beginPath(); c.arc(i * s / 2 + 22 + a * 35, j * s / 2 + 22 + b * 35, 6, 0, K.TAU); c.fill();
        }
      }
    }, (c, s, b) => { noise(c, s, s, 16, 31); if (!b) blotches(c, s, s, 17, 30, .4, '15,12,8', 20, 100); });
    // grating
    T.grate = surface(256, (c, s, col) => {
      c.fillStyle = col('#141414', .05); c.fillRect(0, 0, s, s);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = col('#55575a', .8); c.fillRect(i * 32 + 3, j * 32 + 3, 26, 26); c.fillStyle = col('#0c0c0c', .02); c.fillRect(i * 32 + 8, j * 32 + 8, 16, 16); }
      c.fillStyle = col('#3b3d40', .6); c.fillRect(0, 0, s, 6); c.fillRect(0, s - 6, s, 6);
    }, (c, s, b) => { noise(c, s, s, 14, 41); if (!b) blotches(c, s, s, 19, 16, .5, '50,30,10', 10, 50); });
    // ceiling
    T.ceil = surface(256, (c, s, col) => {
      c.fillStyle = col('#2d2c29', .4); c.fillRect(0, 0, s, s);
      bevelPanel(c, 6, 6, s - 12, s - 12, 4, col, '#4a4842', .6, 2);
      for (let i = 0; i < 10; i++) { c.fillStyle = col('#2a2926', .3); c.fillRect(30 + i * 20, 30, 8, s - 60); }
    }, (c, s, b) => { noise(c, s, s, 12, 51); if (!b) blotches(c, s, s, 23, 10, .4, '0,0,0', 20, 80); });
    // generic metal
    T.metal = surface(256, (c, s, col) => {
      c.fillStyle = col('#8a8d90', .5); c.fillRect(0, 0, s, s);
      const r = K.rng(7);
      for (let i = 0; i < 400; i++) { c.fillStyle = col(`rgba(${r() > .5 ? '255,255,255' : '0,0,0'},.05)`, .5 + (r() - .5) * .1); c.fillRect(0, r() * s, s, 1); }
    }, (c, s, b) => { noise(c, s, s, 10, 61); if (!b) blotches(c, s, s, 29, 12, .35, '30,20,10', 10, 60); });
    T.plastic = surface(128, (c, s, col) => { c.fillStyle = col('#c9c4b4', .5); c.fillRect(0, 0, s, s); },
      (c, s, b) => { noise(c, s, s, 8, 71); if (!b) blotches(c, s, s, 31, 6, .25, '40,30,20', 10, 40); });
    T.hazard = surface(256, (c, s, col) => {
      c.fillStyle = col('#d4a516', .6); c.fillRect(0, 0, s, s);
      c.fillStyle = col('#151515', .4);
      for (let x = -s; x < s * 2; x += 64) { c.beginPath(); c.moveTo(x, s); c.lineTo(x + 32, s); c.lineTo(x + 32 + s, 0); c.lineTo(x + s, 0); c.fill(); }
    }, (c, s, b) => { noise(c, s, s, 16, 81); if (!b) blotches(c, s, s, 37, 14, .5, '30,20,10', 10, 60); });
    T.door = surface(256, (c, s, col) => {
      c.fillStyle = col('#77746b', .5); c.fillRect(0, 0, s, s);
      bevelPanel(c, 12, 12, s - 24, s - 24, 8, col, '#8c887d', .6, 3);
      c.fillStyle = col('#c9a12a', .6);
      for (let y = 0; y < 4; y++) c.fillRect(20, s * .45 + y * 9, s - 40, 4);
      c.fillStyle = col('#2a2825', .2); c.fillRect(s - 8, 0, 8, s);
    }, (c, s, b) => { noise(c, s, s, 14, 91); if (!b) blotches(c, s, s, 41, 10, .35, '30,22,12', 10, 70); });
    T.fabric = surface(128, (c, s, col) => {
      c.fillStyle = col('#3d4a57', .5); c.fillRect(0, 0, s, s);
      for (let i = 0; i < s; i += 4) { c.fillStyle = col('rgba(0,0,0,.15)', .4); c.fillRect(i, 0, 2, s); c.fillRect(0, i, s, 1); }
    }, (c, s, b) => noise(c, s, s, 12, 95));
    return T;
  };

  // CRT screen texture (emissive), amber/green retro text
  K.screenTex = function (lines, hue = 'amber', seed = 1) {
    const c = cv(256, 192), x = c.getContext('2d');
    const fg = hue === 'green' ? '#59ff9a' : hue === 'blue' ? '#7ac8ff' : hue === 'red' ? '#ff5a3a' : '#ffb347';
    x.fillStyle = '#050403'; x.fillRect(0, 0, 256, 192);
    x.fillStyle = fg; x.font = '14px monospace'; x.shadowColor = fg; x.shadowBlur = 6;
    const r = K.rng(seed);
    const L = lines || ['HALDEN-VOSS SYS 4.1', '> STATUS ..... ERR', '> LIFE SUPP .. 31%', '> HULL ........ OK', '> COMMS ... OFFLINE', '> ' + Math.floor(r() * 99999)];
    L.forEach((l, i) => x.fillText(l, 12, 24 + i * 19));
    x.shadowBlur = 0; x.fillStyle = 'rgba(0,0,0,.35)';
    for (let y = 0; y < 192; y += 3) x.fillRect(0, y, 256, 1);
    const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  };
  // big painted sign text (sector names etc.)
  K.signTex = function (text, sub, color = '#d9d2bf', bg = 'rgba(0,0,0,0)') {
    const c = cv(512, 128), x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 512, 128);
    x.fillStyle = color; x.font = 'bold 64px "Chakra Petch", Arial Narrow, sans-serif'; x.textBaseline = 'middle';
    x.fillText(text, 16, sub ? 50 : 64);
    if (sub) { x.font = 'bold 24px monospace'; x.fillText(sub, 18, 104); }
    const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  };

  // ----------------------------------------------------- baked-light material
  // Every static surface carries a per-vertex `bake` colour (light from fixtures). It is added as
  // emissive (bake * albedo) so lit areas glow correctly while the dynamic flashlight still shades on top.
  K.bakeMat = function (params) {
    const m = new THREE.MeshStandardMaterial(params);
    m.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute vec3 bake;\nvarying vec3 vBake;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBake = bake;');
      sh.fragmentShader = 'varying vec3 vBake;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vBake * diffuseColor.rgb;');
    };
    m.customProgramCacheKey = () => 'bake';
    return m;
  };

  K.makeMaterials = function (T, theme, envMap) {
    const st = theme === 'station';
    const B = (o) => K.bakeMat(Object.assign({ envMap, envMapIntensity: .35 }, o));
    const rep = (t, x, y) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(x, y); return c; };
    const M = {
      wall: B({ color: st ? 0xb4afa4 : 0xc0c4c8, map: st ? T.wallS.map : T.wallC.map, bumpMap: st ? T.wallS.bump : T.wallC.bump, bumpScale: .035, roughness: st ? .62 : .48, metalness: st ? .08 : .45 }),
      floor: B({ map: T.floorS.map, bumpMap: T.floorS.bump, bumpScale: .03, roughness: .8, metalness: .1 }),
      grate: B({ map: T.grate.map, bumpMap: T.grate.bump, bumpScale: .05, roughness: .5, metalness: .7, color: st ? 0xffffff : 0xb9c2cc }),
      ceil: B({ map: T.ceil.map, bumpMap: T.ceil.bump, bumpScale: .03, roughness: .8, metalness: .2 }),
      trim: B({ color: st ? 0x5a5852 : 0x23272b, roughness: .5, metalness: .6, map: T.metal.map }),
      metal: B({ map: T.metal.map, bumpMap: T.metal.bump, bumpScale: .01, roughness: .38, metalness: .8 }),
      dark: B({ color: 0x2a2c2f, map: T.metal.map, roughness: .45, metalness: .7 }),
      plastic: B({ map: T.plastic.map, color: st ? 0xe8e2cf : 0xa9b0b6, roughness: .5, metalness: .05 }),
      white: B({ map: T.plastic.map, color: 0xf3f1ea, roughness: .35, metalness: .05 }),
      rubber: B({ color: 0x18181a, roughness: .9, metalness: 0 }),
      fabric: B({ map: T.fabric.map, roughness: .95, metalness: 0 }),
      fabricR: B({ map: T.fabric.map, color: 0xb76a5a, roughness: .95, metalness: 0 }),
      hazard: B({ map: T.hazard.map, bumpMap: T.hazard.bump, bumpScale: .02, roughness: .6, metalness: .3 }),
      orange: B({ color: 0xc8641e, map: T.plastic.map, roughness: .5, metalness: .1 }),
      green: B({ color: 0x4d7a5a, map: T.plastic.map, roughness: .55, metalness: .1 }),
      red: B({ color: 0xa3241a, map: T.metal.map, roughness: .4, metalness: .5 }),
      blue: B({ color: 0x2f5c8a, map: T.plastic.map, roughness: .5, metalness: .2 }),
      copper: B({ color: 0xb87333, map: T.metal.map, roughness: .35, metalness: .9 }),
      doorM: B({ map: T.door.map, bumpMap: T.door.bump, bumpScale: .03, roughness: .5, metalness: .4, color: st ? 0xffffff : 0x9aa3ab }),
      soil: B({ color: 0x2b1e14, roughness: 1 }),
      leaf: B({ color: 0x3f6b32, roughness: .8, side: THREE.DoubleSide }),
      flesh: B({ color: 0x6b2a22, roughness: .4, metalness: .1 }),
      // lamp surfaces: bake channel is driven by fixture state (on = glowing)
      lamp: K.bakeMat({ color: 0xffffff, roughness: .3, metalness: 0 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x9fb7c4, transparent: true, opacity: .14, roughness: .05, metalness: .9, envMap, envMapIntensity: 1.4, depthWrite: false }),
      glassP: new THREE.MeshStandardMaterial({ color: 0x6fd0c0, transparent: true, opacity: .3, roughness: .1, metalness: .3, envMap, depthWrite: false }),
      screen: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    };
    M.grate.map = rep(T.grate.map, 1, 1);
    return M;
  };

  // ---------------------------------------------------------- geometry builder
  // Collects triangles per material key, later turned into merged BufferGeometries with a bake attribute.
  const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
  const niCache = new WeakMap();
  K.Builder = class {
    constructor() { this.groups = {}; }
    g(key) { return this.groups[key] || (this.groups[key] = { p: [], n: [], u: [], f: [] }); }
    addGeom(geom, key, m, fid = -1) {
      let g = niCache.get(geom);
      if (!g) { g = geom.index ? geom.toNonIndexed() : geom; niCache.set(geom, g); }
      const P = g.attributes.position.array, N = g.attributes.normal.array, U = g.attributes.uv ? g.attributes.uv.array : null;
      const G = this.g(key);
      _nm.getNormalMatrix(m);
      for (let i = 0, k = 0; i < P.length; i += 3, k += 2) {
        _v.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(m); G.p.push(_v.x, _v.y, _v.z);
        _n.set(N[i], N[i + 1], N[i + 2]).applyMatrix3(_nm).normalize(); G.n.push(_n.x, _n.y, _n.z);
        if (U) G.u.push(U[k], U[k + 1]); else G.u.push(0, 0);
        G.f.push(fid);
      }
    }
    // quad a-b-c-d counter-clockwise when viewed from the normal side
    quad(key, a, b, c, d, n, ua, ub, uc, ud, fid = -1) {
      const G = this.g(key);
      for (const [p, u] of [[a, ua], [b, ub], [c, uc], [a, ua], [c, uc], [d, ud]]) {
        G.p.push(p[0], p[1], p[2]); G.n.push(n[0], n[1], n[2]); G.u.push(u[0], u[1]); G.f.push(fid);
      }
    }
    build(materials, bakeFn) {
      const meshes = [];
      for (const key in this.groups) {
        const G = this.groups[key]; if (!G.p.length) continue;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(G.p, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(G.n, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(G.u, 2));
        geo.setAttribute('bake', new THREE.Float32BufferAttribute(new Float32Array(G.p.length), 3));
        geo.userData.fid = G.f; geo.userData.key = key;
        geo.computeBoundingSphere();
        const mat = materials[key] || materials.metal;
        const mesh = new THREE.Mesh(geo, mat);
        mesh.matrixAutoUpdate = false;
        mesh.receiveShadow = true; mesh.castShadow = !mat.transparent && !['wall', 'floor', 'ceil', 'grate', 'hull', 'glass', 'lamp'].includes(key) && !key.startsWith('sign');
        meshes.push(mesh);
      }
      return meshes;
    }
  };

  // Shared unit primitives for prop building
  K.prim = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(.5, .5, 1, 10),
    cyl8: new THREE.CylinderGeometry(.5, .5, 1, 6),
    sph: new THREE.SphereGeometry(.5, 9, 6),
    plane: new THREE.PlaneGeometry(1, 1),
  };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  K.mat4 = (x, y, z, rx, ry, rz, sx, sy, sz) => {
    _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
    return new THREE.Matrix4().compose(_p, _q, _s);
  };

  // ---------------------------------------------------------------- IK helpers
  const _d = new THREE.Vector3(), _pp = new THREE.Vector3();
  // two-bone IK: writes elbow into `out`; returns clamped end position into `end` (if given)
  K.ik2 = function (a, t, l1, l2, pole, out, end) {
    _d.subVectors(t, a);
    let d = _d.length();
    const maxd = (l1 + l2) * .999, mind = Math.abs(l1 - l2) * 1.001 + 1e-4;
    d = K.clamp(d, mind, maxd);
    _d.normalize();
    const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    _pp.copy(pole).addScaledVector(_d, -pole.dot(_d));
    if (_pp.lengthSq() < 1e-8) _pp.set(0, 1, 0).addScaledVector(_d, -_d.y);
    _pp.normalize();
    out.copy(a).addScaledVector(_d, x).addScaledVector(_pp, h);
    if (end) end.copy(a).addScaledVector(_d, d);
    return out;
  };
  // orient a segment mesh (modelled along +Y from origin) from a to b, roll so local +Z faces `up`
  const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _mb = new THREE.Matrix4();
  K.placeSeg = function (obj, a, b, up) {
    _y.subVectors(b, a); const len = _y.length(); if (len < 1e-6) return;
    _y.divideScalar(len);
    _x.crossVectors(_y, up); if (_x.lengthSq() < 1e-8) _x.set(1, 0, 0); _x.normalize();
    _z.crossVectors(_x, _y);
    _mb.makeBasis(_x, _y, _z);
    obj.quaternion.setFromRotationMatrix(_mb);
    obj.position.copy(a);
  };
  // segment geometry along +Y with taper: radius r0 at base, r1 at tip, length len
  K.segGeo = function (len, r0, r1, sides = 10, sx = 1, sz = 1) {
    const g = new THREE.CylinderGeometry(r1, r0, len, sides, 3);
    g.translate(0, len / 2, 0);
    if (sx !== 1 || sz !== 1) g.scale(sx, 1, sz);
    return g;
  };
  // lathe from profile [[r,y],...] around Y
  K.lathe = function (profile, seg = 16) { return new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(p[0], p[1])), seg); };

  // soft radial sprite texture
  K.glowTex = (function () { let t; return () => { if (t) return t; const c = cv(64), x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); t = new THREE.CanvasTexture(c); return t; }; })();
})();
