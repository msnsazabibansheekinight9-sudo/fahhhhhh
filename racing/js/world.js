// World building: sky, lighting, terrain, road surface, kerbs, barriers, grandstands and themed scenery.
var RX = window.RX || (window.RX = {});

(function () {
  var V3 = THREE.Vector3;

  RX.THEMES = {
    grass: { ground: '#4f7a34', ground2: '#3f6a2a', sky: ['#5d93d6', '#bcd7f0'], fog: '#c4d6e6', hills: 25, trees: 'mixed', density: 1 },
    forest: { ground: '#3d6428', ground2: '#2e5220', sky: ['#5a88c4', '#c2d6ea'], fog: '#b9cbd6', hills: 40, trees: 'pine', density: 2.2 },
    desert: { ground: '#c9a46a', ground2: '#b88f55', sky: ['#4f8fd8', '#f1dcb0'], fog: '#e8d7b4', hills: 30, trees: 'cactus', density: 0.6 },
    coast: { ground: '#6c8f3c', ground2: '#d8c38c', sky: ['#3f8fe0', '#cfe6f6'], fog: '#cfe2ee', hills: 15, trees: 'palm', density: 0.9, water: true },
    city: { ground: '#6c7a5a', ground2: '#5c6650', sky: ['#6f95c4', '#d3dce6'], fog: '#c9d0d8', hills: 5, trees: 'mixed', density: 0.5, buildings: true },
    nightcity: { ground: '#3c4438', ground2: '#2f352c', sky: ['#04060f', '#1c2440'], fog: '#141a2a', hills: 5, trees: 'mixed', density: 0.4, buildings: true, night: true },
    mountain: { ground: '#5d7a45', ground2: '#7d7a70', sky: ['#4c86d0', '#c8dbef'], fog: '#c3d2e2', hills: 120, trees: 'pine', density: 1.4, rocks: true },
    snow: { ground: '#eef2f6', ground2: '#d6e0ea', sky: ['#7da4d0', '#e6eef6'], fog: '#e2e9f0', hills: 50, trees: 'snowpine', density: 1.6 },
    savanna: { ground: '#a99a52', ground2: '#8e8a46', sky: ['#4a8ad8', '#f0e2b8'], fog: '#e6dcb8', hills: 20, trees: 'acacia', density: 0.4 },
    salt: { ground: '#eceae2', ground2: '#dedbd0', sky: ['#3d86e6', '#dbe8f4'], fog: '#e0e8ee', hills: 60, trees: 'none', density: 0 }
  };

  function noiseCanvas(base, var2, size, speck, opts) {
    opts = opts || {};
    var c = RX.canvas(size, size), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    var R = RX.rng(size * 7 + base.length);
    for (var i = 0; i < size * size * 0.08; i++) {
      g.fillStyle = Math.random() < 0.5 ? var2 : 'rgba(0,0,0,' + (0.03 + R() * 0.08) + ')';
      g.globalAlpha = 0.2 + R() * 0.5;
      var s = speck * (0.5 + R());
      g.fillRect(R() * size, R() * size, s, s);
    }
    g.globalAlpha = 1;
    if (opts.blades) {
      for (var b = 0; b < size * 4; b++) { g.strokeStyle = 'rgba(30,60,20,0.25)'; g.beginPath(); var x = R() * size, y = R() * size; g.moveTo(x, y); g.lineTo(x + R() * 2 - 1, y - 3 - R() * 4); g.stroke(); }
    }
    return c;
  }

  function roadTexture(surf, style, track) {
    var c = RX.canvas(512, 512), g = c.getContext('2d');
    var base = { asphalt: '#3b3c40', gravel: '#9a8566', dirt: '#7b5735', mud: '#4c3925', snow: '#e9eef4', sand: '#d2b072', salt: '#e8e5dc' }[surf] || '#3b3c40';
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    var R = RX.rng(surf.length * 99);
    var dots = surf === 'asphalt' ? 30000 : 16000;
    for (var i = 0; i < dots; i++) {
      var l = R();
      g.fillStyle = surf === 'asphalt' ? (l < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)') : (l < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.16)');
      var sz = surf === 'asphalt' ? 1 + R() * 1.5 : 1 + R() * 4;
      g.fillRect(R() * 512, R() * 512, sz, sz);
    }
    // racing groove / ruts
    if (surf === 'asphalt') {
      var gr = g.createLinearGradient(0, 0, 512, 0);
      gr.addColorStop(0.0, 'rgba(0,0,0,0)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.12)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.18)'); gr.addColorStop(0.65, 'rgba(0,0,0,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      // patches / sealing lines
      g.strokeStyle = 'rgba(10,10,10,0.35)'; g.lineWidth = 2;
      for (var k = 0; k < 6; k++) { g.beginPath(); var x0 = R() * 512; g.moveTo(x0, 0); for (var y = 0; y < 512; y += 32) g.lineTo(x0 + Math.sin(y * 0.05 + k) * 12, y); g.stroke(); }
    } else {
      // tyre ruts
      g.fillStyle = 'rgba(0,0,0,0.12)';
      [0.32, 0.42, 0.58, 0.68].forEach(function (u) { g.fillRect(u * 512 - 10, 0, 20, 512); });
    }
    // edge lines
    if (surf === 'asphalt' && style !== 'stage' && style !== 'hill') {
      g.fillStyle = '#f2f2ee'; g.fillRect(6, 0, 10, 512); g.fillRect(496, 0, 10, 512);
    }
    if (surf === 'asphalt' && (style === 'stage' || style === 'hill')) {
      g.fillStyle = '#f2f2ee'; for (var d = 0; d < 512; d += 128) g.fillRect(250, d, 12, 64);
      g.fillRect(4, 0, 6, 512); g.fillRect(502, 0, 6, 512);
    }
    if (style === 'drag') { g.fillStyle = '#f2f2ee'; g.fillRect(252, 0, 8, 512); }
    if (style === 'oval') { g.fillStyle = 'rgba(255,255,255,0.0)'; }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.encoding = THREE.sRGBEncoding;
    return t;
  }

  // Sky dome with vertex-colour gradient
  function buildSky(scene, theme, tod) {
    var geo = new THREE.SphereGeometry(4000, 32, 16);
    var cols = [], pos = geo.attributes.position;
    var top = new THREE.Color(theme.sky[0]), hor = new THREE.Color(theme.sky[1]);
    var night = tod.night, dusk = tod.dusk;
    if (night) { top.set('#02040c'); hor.set('#18203a'); }
    else if (dusk) { top.lerp(new THREE.Color('#2a3c78'), 0.5); hor.set('#f0a060'); }
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i) / 4000, c = hor.clone().lerp(top, Math.pow(Math.max(0, y), 0.6));
      if (y < 0) c = hor.clone().multiplyScalar(0.8);
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    var sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -10;
    scene.add(sky);
    if (night) {
      var sg = new THREE.BufferGeometry(), sp = [];
      for (var s = 0; s < 1500; s++) { var a = Math.random() * Math.PI * 2, e = Math.random() * 1.4 + 0.05; sp.push(Math.cos(a) * Math.cos(e) * 3800, Math.sin(e) * 3800, Math.sin(a) * Math.cos(e) * 3800); }
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, fog: false })));
    }
    return sky;
  }

  // Heightfield value away from the track
  function terrainNoise(x, z, amp) {
    return (Math.sin(x * 0.0021) * Math.cos(z * 0.0017) * 0.6 + Math.sin(x * 0.0053 + 1.3) * Math.sin(z * 0.0047 + 0.7) * 0.3 + Math.sin(x * 0.013) * Math.sin(z * 0.011) * 0.1) * amp;
  }

  RX.buildWorld = function (scene, track, opts) {
    opts = opts || {};
    var theme = RX.THEMES[track.theme] || RX.THEMES.grass;
    var tod = opts.tod || { night: track.night || theme.night, dusk: false };
    var W = { theme: theme, tod: tod, objects: [], lights: {} };
    var R = RX.rng(track.def.seed * 3 + 1);
    var P = track.pts, N = track.N;
    // ---------- sky & lights ----------
    W.sky = buildSky(scene, theme, tod);
    var fogCol = new THREE.Color(tod.night ? '#0b1020' : tod.dusk ? '#c08a68' : theme.fog);
    scene.fog = new THREE.Fog(fogCol, 250, opts.rain ? 900 : tod.night ? 1100 : 3200);
    if (opts.fog) scene.fog.far = 500;
    scene.background = fogCol;
    var hemi = new THREE.HemisphereLight(tod.night ? 0x334466 : 0xc8daf4, tod.night ? 0x111111 : 0x4a4436, tod.night ? 0.5 : 0.62);
    scene.add(hemi); W.lights.hemi = hemi;
    var sun = new THREE.DirectionalLight(tod.night ? 0x8899cc : tod.dusk ? 0xffb070 : 0xfff1dc, tod.night ? 0.35 : 1.7);
    sun.position.set(300, tod.dusk ? 120 : 500, 200);
    sun.castShadow = !opts.lowQuality;
    sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 10; sc.far = 1500;
    sun.shadow.bias = -0.0005;
    scene.add(sun); scene.add(sun.target); W.lights.sun = sun;
    // ---------- terrain ----------
    var b = track.bounds, margin = track.style === 'drag' ? 500 : 700;
    var minx = b.minx - margin, maxx = b.maxx + margin, minz = b.minz - margin, maxz = b.maxz + margin;
    var span = Math.max(maxx - minx, maxz - minz);
    var res = Math.min(260, Math.max(120, Math.round(span / 12)));
    var gw = res, gh = res;
    var tg = new THREE.PlaneGeometry(maxx - minx, maxz - minz, gw, gh);
    tg.rotateX(-Math.PI / 2);
    tg.translate((minx + maxx) / 2, 0, (minz + maxz) / 2);
    var tp = tg.attributes.position;
    var coarse = []; for (var i = 0; i < N; i += 6) coarse.push(i);
    var avgY = 0; P.forEach(function (p) { avgY += p.y; }); avgY /= N;
    var hillAmp = theme.hills * (track.style === 'oval' ? 0.3 : 1);
    var tcol = [];
    var cG = new THREE.Color(theme.ground), cG2 = new THREE.Color(theme.ground2);
    var heightAt = function (x, z) {
      var near = RX.nearestIdx(track, x, z, 2), idx = near.idx, d2 = near.d2;
      if (idx < 0) { var bd = 1e18; for (var k = 0; k < coarse.length; k++) { var pp = P[coarse[k]], dd = (pp.x - x) * (pp.x - x) + (pp.z - z) * (pp.z - z); if (dd < bd) { bd = dd; idx = coarse[k]; } } d2 = bd; }
      var d = Math.sqrt(d2), p = P[idx];
      var lat = (x - p.x) * p.nx + (z - p.z) * p.nz;
      var roadY = RX.roadHeight(p, lat) - 0.25;
      var far = terrainNoise(x, z, hillAmp) + p.y * 0.7 + avgY * 0.3;
      var edge = Math.min(x - minx, maxx - x, z - minz, maxz - z);
      if (edge < 350) far += (350 - edge) / 350 * (theme.hills * 2.2 + 30);
      var fBlend = Math.min(1, Math.max(0, (d - p.w - 14) / 140));
      fBlend = fBlend * fBlend * (3 - 2 * fBlend);
      var y = roadY + (far - roadY) * fBlend;
      if (track.style === 'hill' || track.style === 'stage') y += Math.min(3, Math.max(0, d - p.w - 4) * 0.15) * (1 - fBlend);
      return y;
    };
    W.heightAt = heightAt;
    for (i = 0; i < tp.count; i++) {
      var x = tp.getX(i), z = tp.getZ(i);
      var y = heightAt(x, z);
      tp.setY(i, y);
      var c = cG.clone().lerp(cG2, Math.max(0, Math.min(1, 0.5 + terrainNoise(x * 7, z * 7, 1))));
      tcol.push(c.r, c.g, c.b);
    }
    tg.setAttribute('color', new THREE.Float32BufferAttribute(tcol, 3));
    tg.computeVertexNormals();
    var groundTex = new THREE.CanvasTexture(noiseCanvas('#9a9a9a', '#bdbdbd', 256, 2, { blades: track.theme !== 'desert' && track.theme !== 'salt' && track.theme !== 'snow' }));
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.repeat.set(span / 12, span / 12); groundTex.anisotropy = 4; groundTex.encoding = THREE.sRGBEncoding;
    var terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: groundTex, vertexColors: true, roughness: 0.95 }));
    terrain.receiveShadow = true; scene.add(terrain); W.terrain = terrain;
    if (theme.water) {
      var water = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ color: 0x1f5f8a, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.92 }));
      water.rotation.x = -Math.PI / 2; water.position.set(maxx + 600, Math.min.apply(null, P.map(function (p) { return p.y; })) - 3, (minz + maxz) / 2); scene.add(water);
    }
    // ---------- road ----------
    // contiguous runs of the same surface, each a list of sample indices (closed tracks wrap around)
    var runs = [], cur = null;
    for (i = 0; i < N; i++) {
      if (!cur || cur.surf !== P[i].surf) { cur = { surf: P[i].surf, idx: [] }; runs.push(cur); }
      cur.idx.push(i);
    }
    if (track.closed) {
      if (runs.length > 1 && runs[0].surf === runs[runs.length - 1].surf) { var last = runs.pop(); runs[0].idx = last.idx.concat(runs[0].idx); }
      runs.forEach(function (r) { r.idx.push((r.idx[r.idx.length - 1] + 1) % N); });
    } else {
      runs.forEach(function (r, ri) { if (ri < runs.length - 1) r.idx.push(r.idx[r.idx.length - 1] + 1); });
    }
    var texCache = {};
    runs.forEach(function (run) {
      var tex = texCache[run.surf] || (texCache[run.surf] = roadTexture(run.surf, track.style, track));
      var pos = [], uv = [], idx2 = [], count = 0;
      var steps = run.idx;
      if (steps.length < 2) return;
      steps.forEach(function (k, si) {
        var p = P[k], w = p.w + (run.surf === 'asphalt' ? 0.4 : 1.2);
        var yl = RX.roadHeight(p, w) + 0.02, yr = RX.roadHeight(p, -w) + 0.02;
        var cy = RX.roadHeight(p, 0) + 0.02;
        pos.push(p.x + p.nx * w, yl, p.z + p.nz * w, p.x, cy, p.z, p.x - p.nx * w, yr, p.z - p.nz * w);
        var v = p.s / 12;
        uv.push(0, v, 0.5, v, 1, v);
        if (si > 0) { var a = (si - 1) * 3, bb = si * 3; idx2.push(a, a + 1, bb, a + 1, bb + 1, bb, a + 1, a + 2, bb + 1, a + 2, bb + 2, bb + 1); }
      });
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx2); g.computeVertexNormals();
      var mat = new THREE.MeshStandardMaterial({ map: tex, roughness: run.surf === 'asphalt' ? (opts.rain ? 0.25 : 0.88) : 0.98, metalness: opts.rain && run.surf === 'asphalt' ? 0.25 : 0 });
      var m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m);
    });
    // ---------- kerbs ----------
    var kerbTex = (function () { var c = RX.canvas(64, 64), g = c.getContext('2d'); g.fillStyle = '#d41f1f'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#f4f4f4'; g.fillRect(0, 32, 64, 32); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
    var kpos = [], kuv = [], kidx = [], kc = 0;
    [1, -1].forEach(function (side) {
      var inRun = false;
      for (var k = 0; k < N; k++) {
        var p = P[k];
        if (!p.kerb || p.surf !== 'asphalt') { inRun = false; continue; }
        var w0 = p.w + 0.4, w1 = p.w + 1.5;
        var y0 = RX.roadHeight(p, side * w0) + 0.03, y1 = RX.roadHeight(p, side * w1) + 0.08;
        kpos.push(p.x + p.nx * side * w0, y0, p.z + p.nz * side * w0, p.x + p.nx * side * w1, y1, p.z + p.nz * side * w1);
        kuv.push(0, p.s / 3, 1, p.s / 3);
        if (inRun) { var a = kc - 2, bb = kc; if (side > 0) kidx.push(a, bb, a + 1, a + 1, bb, bb + 1); else kidx.push(a, a + 1, bb, a + 1, bb + 1, bb); }
        kc += 2; inRun = true;
      }
    });
    if (kidx.length) {
      var kg = new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.Float32BufferAttribute(kpos, 3)); kg.setAttribute('uv', new THREE.Float32BufferAttribute(kuv, 2)); kg.setIndex(kidx); kg.computeVertexNormals();
      var km = new THREE.Mesh(kg, new THREE.MeshStandardMaterial({ map: kerbTex, roughness: 0.6, side: THREE.DoubleSide })); km.receiveShadow = true; scene.add(km);
    }
    // ---------- barriers ----------
    var wallType = track.style === 'oval' ? 'safer' : track.style === 'street' ? 'concrete' : track.style === 'kart' ? 'tyres' : track.style === 'drag' ? 'concrete' : (track.style === 'stage' || track.style === 'hill') ? 'none' : 'armco';
    if (track.style === 'rx') wallType = 'tyres';
    if (wallType !== 'none') {
      var wcol = { safer: 0xe8e8e8, concrete: 0xcfcfc8, tyres: 0x1a1a1a, armco: 0xb8bcc2 }[wallType];
      var wh = wallType === 'tyres' ? 0.7 : wallType === 'armco' ? 0.75 : 1.1;
      var wtex = (function () {
        var c = RX.canvas(128, 64), g = c.getContext('2d');
        g.fillStyle = '#' + wcol.toString(16).padStart(6, '0'); g.fillRect(0, 0, 128, 64);
        if (wallType === 'concrete' || wallType === 'safer') {
          var sp = RX.SPONSORS[(track.def.seed % 5)];
          g.fillStyle = ['#c8102e', '#0a2a6b', '#111111', '#ff8000'][track.def.seed % 4]; g.fillRect(0, 18, 128, 28);
          g.fillStyle = '#fff'; g.font = 'bold 20px Arial'; g.fillText(sp[(track.def.seed >> 2) % 4] || 'APEX', 6, 40);
        } else if (wallType === 'tyres') { for (var t = 0; t < 4; t++) { g.fillStyle = t % 2 ? '#222' : '#cc2222'; g.fillRect(t * 32, 0, 32, 64); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(t * 32 + 10, 0, 12, 64); } }
        else { g.fillStyle = '#8b9096'; g.fillRect(0, 20, 128, 6); g.fillRect(0, 40, 128, 6); }
        var tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.encoding = THREE.sRGBEncoding; return tx;
      })();
      [1, -1].forEach(function (side) {
        var pos = [], uv = [], ix = [], cnt = 0;
        var step = 2;
        for (var k = 0; k <= N; k += step) {
          var kk = k % N; if (!track.closed && k >= N) break;
          var p = P[kk], off = p.w + track.wallOff + (track.style === 'drag' ? -track.wallOff + 2 : 0);
          var y = RX.roadHeight(p, side * Math.min(off, p.w)) - (track.style === 'oval' ? 0 : 0.2);
          if (track.style === 'oval' && side < 0 === (p.bank > 0)) y = RX.roadHeight(p, side * p.w) + 0.1;
          var x = p.x + p.nx * side * off, z = p.z + p.nz * side * off;
          pos.push(x, y, z, x, y + wh + (wallType === 'safer' ? 0.2 : 0), z);
          uv.push(p.s / 8, 0, p.s / 8, 1);
          if (cnt > 0) { var a = (cnt - 1) * 2; ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
          cnt++;
        }
        var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals();
        var m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: wtex, side: THREE.DoubleSide, roughness: 0.7, metalness: wallType === 'armco' ? 0.6 : 0 }));
        m.castShadow = true; m.receiveShadow = true; scene.add(m);
        // catch fence on ovals and street circuits
        if (wallType === 'safer' || wallType === 'concrete') {
          var fpos = [], fix = [], fc = 0;
          for (var k2 = 0; k2 <= N; k2 += 3) {
            var k3 = k2 % N; if (!track.closed && k2 >= N) break;
            var p2 = P[k3], off2 = p2.w + track.wallOff + (track.style === 'drag' ? -track.wallOff + 2 : 0);
            var y2 = RX.roadHeight(p2, side * Math.min(off2, p2.w)) + wh;
            if (track.style === 'oval' && side < 0 === (p2.bank > 0)) continue;
            var x2 = p2.x + p2.nx * side * (off2 + 0.1), z2 = p2.z + p2.nz * side * (off2 + 0.1);
            fpos.push(x2, y2, z2, x2, y2 + 3.2, z2);
            if (fc > 0) { var a2 = (fc - 1) * 2; fix.push(a2, a2 + 2, a2 + 1, a2 + 1, a2 + 2, a2 + 3); }
            fc++;
          }
          if (fix.length && (track.style === 'oval' || R() < 0.6)) {
            var fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3)); fg.setIndex(fix); fg.computeVertexNormals();
            scene.add(new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0x777777, wireframe: true, transparent: true, opacity: 0.35 })));
          }
        }
      });
    }
    // ---------- start line, gantry, grandstands ----------
    var p0 = P[track.startIdx];
    var checker = (function () { var c = RX.canvas(64, 16), g = c.getContext('2d'); for (var x = 0; x < 16; x++) for (var y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 4, y * 4, 4, 4); } var t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t; })();
    var line = new THREE.Mesh(new THREE.PlaneGeometry(p0.w * 2, 1.6), new THREE.MeshStandardMaterial({ map: checker, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
    line.rotation.x = -Math.PI / 2; line.rotation.z = Math.atan2(p0.tx, p0.tz);
    line.position.set(p0.x, RX.roadHeight(p0, 0) + 0.04, p0.z); scene.add(line);
    // finish line on point-to-point stages
    if (!track.closed) {
      var pf = RX.trackAt(track, track.finishS, 0);
      var fl = line.clone(); fl.rotation.z = Math.atan2(pf.tx, pf.tz); fl.position.set(pf.x, pf.y + 0.05, pf.z); fl.scale.x = pf.w / p0.w; scene.add(fl);
      buildArch(scene, pf, 'FINISH');
      buildArch(scene, p0, track.style === 'drag' ? null : 'START');
    }
    W.startLights = buildGantry(scene, p0, track);
    if (track.style === 'circuit' || track.style === 'oval' || track.style === 'street' || track.style === 'kart' || track.style === 'drag' || track.style === 'rx') {
      buildGrandstands(scene, track, R, tod);
    }
    if (track.style === 'circuit' || track.style === 'street') buildPits(scene, track, tod);
    if (track.style === 'drag') W.tree = buildChristmasTree(scene, track);
    if (track.style === 'oval' && tod.night || (track.style === 'oval' && R() < 0.4)) buildLightTowers(scene, track);
    // ---------- scenery ----------
    buildScenery(scene, track, theme, R, tod, opts, heightAt);
    // corner boards & pace-note cones on stages
    if (track.style === 'circuit' || track.style === 'street') buildBrakeBoards(scene, track);
    // Formula E attack zone, RX joker
    if (opts.attackZone) {
      var az = RX.trackAt(track, track.attackS, P[0].w * 0.75);
      var pad = new THREE.Mesh(new THREE.PlaneGeometry(3, 18), new THREE.MeshBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: 0.55 }));
      pad.rotation.x = -Math.PI / 2; pad.rotation.z = Math.atan2(az.tx, az.tz); pad.position.set(az.x, az.y + 0.06, az.z); scene.add(pad);
      W.attackPad = pad;
    }
    if (opts.joker) {
      var jz = RX.trackAt(track, track.jokerS, -P[0].w * 0.6);
      var jp = new THREE.Mesh(new THREE.PlaneGeometry(4, 30), new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.45 }));
      jp.rotation.x = -Math.PI / 2; jp.rotation.z = Math.atan2(jz.tx, jz.tz); jp.position.set(jz.x, jz.y + 0.06, jz.z); scene.add(jp);
      addSign(scene, RX.trackAt(track, track.jokerS - 25, -P[0].w - 3), 'JOKER', '#ffcc00');
    }
    if (opts.checkpoints) {
      W.checkpointMeshes = opts.checkpoints.map(function (s) { var p = RX.trackAt(track, s, 0); return buildArch(scene, p, 'CHECKPOINT', 0x22cc66); });
    }
    W.sunFollow = function (pos) {
      sun.position.set(pos.x + 300, pos.y + (tod.dusk ? 120 : 500), pos.z + 200);
      sun.target.position.copy(pos);
    };
    return W;
  };

  function addSign(scene, p, text, col) {
    var c = RX.canvas(256, 64), g = c.getContext('2d'); g.fillStyle = col || '#ffffff'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#111'; g.font = 'bold 44px Arial'; g.textAlign = 'center'; g.fillText(text, 128, 48);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide }));
    m.position.set(p.x, p.y + 2, p.z); m.rotation.y = Math.atan2(p.tx, p.tz) + Math.PI; scene.add(m);
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2), RX.mats().steel); post.position.set(p.x, p.y + 1, p.z); scene.add(post);
  }

  function buildArch(scene, p, text, col) {
    var g = new THREE.Group(), M = RX.mats();
    var w = p.w + 2.5;
    var mat = new THREE.MeshStandardMaterial({ color: col || 0xd41f1f, roughness: 0.6 });
    [-1, 1].forEach(function (s) { var pole = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.6), mat); pole.position.set(s * w, 3, 0); g.add(pole); });
    var beam = new THREE.Mesh(new THREE.BoxGeometry(w * 2 + 0.6, 1.4, 0.6), mat); beam.position.y = 6.2; g.add(beam);
    if (text) {
      var c = RX.canvas(512, 96), cx = c.getContext('2d'); cx.fillStyle = '#' + (col || 0xd41f1f).toString(16).padStart(6, '0'); cx.fillRect(0, 0, 512, 96); cx.fillStyle = '#fff'; cx.font = 'bold 64px Arial'; cx.textAlign = 'center'; cx.fillText(text, 256, 72);
      var lab = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.6, 1.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide })); lab.position.set(0, 6.2, 0.32); g.add(lab);
    }
    g.position.set(p.x, p.y, p.z); g.rotation.y = Math.atan2(p.tx, p.tz);
    scene.add(g); return g;
  }

  function buildGantry(scene, p, track) {
    var g = new THREE.Group(), M = RX.mats();
    var w = p.w + 1.5;
    if (track.style === 'stage' || track.style === 'hill') {
      // small start light box on a pole
      var pole = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 0.2), M.steel); pole.position.set(w, 1.2, 0); g.add(pole);
      var bx = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.2), M.black); bx.position.set(w - 0.3, 2.4, 0); g.add(bx);
    } else {
      [-1, 1].forEach(function (s) { var pole = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 0.4), M.steel); pole.position.set(s * w, 3.5, 0); g.add(pole); });
      var beam = new THREE.Mesh(new THREE.BoxGeometry(w * 2, 0.8, 0.8), M.steel); beam.position.y = 7; g.add(beam);
    }
    var lights = [];
    var n = track.style === 'drag' ? 0 : 5;
    for (var i = 0; i < n; i++) {
      var housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.3), M.black);
      var lx = track.style === 'stage' || track.style === 'hill' ? w - 0.6 + i * 0.15 : (i - 2) * 0.8;
      var ly = track.style === 'stage' || track.style === 'hill' ? 2.4 : 6.2;
      housing.position.set(lx, ly, -0.45); if (track.style !== 'stage' && track.style !== 'hill') g.add(housing);
      var lm = new THREE.MeshBasicMaterial({ color: 0x220000 });
      var bulb = new THREE.Mesh(new THREE.CircleGeometry(track.style === 'stage' || track.style === 'hill' ? 0.06 : 0.18, 12), lm);
      bulb.position.set(lx, ly - (track.style === 'stage' || track.style === 'hill' ? 0 : 0.25), -0.61); bulb.rotation.y = Math.PI; g.add(bulb);
      lights.push(lm);
    }
    g.position.set(p.x, RX.roadHeight(p, 0), p.z); g.rotation.y = Math.atan2(p.tx, p.tz);
    // move gantry slightly ahead of the grid
    g.position.x += p.tx * 4; g.position.z += p.tz * 4;
    scene.add(g);
    return lights;
  }

  function buildChristmasTree(scene, track) {
    var p = RX.trackAt(track, track.startS + 6, 0), M = RX.mats();
    var g = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.2, 0.25), M.steel); pole.position.y = 1.6; g.add(pole);
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.25), M.black); body.position.y = 2.5; g.add(body);
    var mats = [];
    // rows: pre-stage, stage, amber x3, green, red; two columns (lanes)
    var rows = [['#ffe9a0', 3.45], ['#ffe9a0', 3.25], ['#ffaa00', 2.95], ['#ffaa00', 2.7], ['#ffaa00', 2.45], ['#00ff44', 2.1], ['#ff0000', 1.75]];
    rows.forEach(function (r, i) {
      var row = [];
      [-1, 1].forEach(function (s) {
        var m = new THREE.MeshBasicMaterial({ color: new THREE.Color(r[0]).multiplyScalar(0.12) });
        m.userData.on = new THREE.Color(r[0]); m.userData.off = new THREE.Color(r[0]).multiplyScalar(0.12);
        var bulb = new THREE.Mesh(new THREE.CircleGeometry(i < 2 ? 0.07 : 0.12, 12), m); bulb.position.set(s * 0.22, r[1] - 0.95, -0.13); bulb.rotation.y = Math.PI; g.add(bulb);
        if (i < 2) { var b2 = bulb.clone(); b2.position.x += s * 0.1; g.add(b2); }
        row.push(m);
      });
      mats.push(row);
    });
    g.position.set(p.x, p.y, p.z); g.rotation.y = Math.atan2(p.tx, p.tz);
    scene.add(g);
    // timing boards at the finish
    var pf = RX.trackAt(track, track.finishS, 0);
    var boards = [];
    [-1, 1].forEach(function (s) {
      var c = RX.canvas(256, 128), t = new THREE.CanvasTexture(c);
      var bd = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
      bd.position.set(pf.x + pf.tz * s * (pf.w + 4), pf.y + 4, pf.z - pf.tx * s * (pf.w + 4)); bd.rotation.y = Math.atan2(pf.tx, pf.tz) + Math.PI; scene.add(bd);
      boards.push({ canvas: c, tex: t });
    });
    return { mats: mats, boards: boards };
  }
  RX.drawBoard = function (b, et, mph) {
    var g = b.canvas.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#ffcc00'; g.font = 'bold 48px monospace'; g.textAlign = 'center'; g.fillText(et, 128, 56); g.fillStyle = '#ff3333'; g.fillText(mph, 128, 112); b.tex.needsUpdate = true;
  };

  function buildGrandstands(scene, track, R, tod) {
    var P = track.pts, N = track.N, M = RX.mats();
    var crowdTex = (function () {
      var c = RX.canvas(256, 64), g = c.getContext('2d'); g.fillStyle = '#333'; g.fillRect(0, 0, 256, 64);
      for (var i = 0; i < 900; i++) { g.fillStyle = 'hsl(' + Math.floor(Math.random() * 360) + ',60%,' + (35 + Math.random() * 40) + '%)'; g.fillRect(Math.random() * 256, Math.random() * 64, 3, 4); }
      var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    })();
    var standMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.8 });
    var roofMat = new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.5, metalness: 0.3 });
    var crowdMat = new THREE.MeshStandardMaterial({ map: crowdTex, roughness: 1 });
    var count = track.style === 'kart' ? 2 : track.style === 'oval' ? 6 : 4;
    for (var i = 0; i < count; i++) {
      var s = (i === 0 ? 0.0 : i / count + R() * 0.1) * track.length;
      if (track.style === 'drag') s = track.startS + 80 + i * 90;
      var p = RX.trackAt(track, s, 0);
      var side = track.style === 'oval' ? (p.bank >= 0 ? -1 : 1) : (i % 2 ? 1 : -1);
      if (track.style === 'oval') side = -Math.sign(track.pts[0].curv || 1) || 1;
      var off = p.w + (track.style === 'drag' ? 6 : track.wallOff) + 6;
      var len = track.style === 'kart' ? 30 : track.style === 'drag' ? 80 : 90;
      var g = new THREE.Group();
      var rows = track.style === 'oval' ? 14 : 9;
      for (var r = 0; r < rows; r++) {
        var step = new THREE.Mesh(new THREE.BoxGeometry(len, 0.6, 1.2), standMat); step.position.set(0, r * 0.6 + 0.3, r * 1.1); g.add(step);
        var crowd = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.7), crowdMat); crowd.position.set(0, r * 0.6 + 0.95, r * 1.1 - 0.3); crowd.rotation.y = Math.PI; g.add(crowd);
        crowd.material.map.repeat.set(len / 30, 1);
      }
      var back = new THREE.Mesh(new THREE.BoxGeometry(len, rows * 0.6 + 4, 0.4), standMat); back.position.set(0, (rows * 0.6 + 4) / 2, rows * 1.1 + 0.3); g.add(back);
      if (track.style !== 'oval') { var roof = new THREE.Mesh(new THREE.BoxGeometry(len + 2, 0.3, rows * 1.1 + 3), roofMat); roof.position.set(0, rows * 0.6 + 4, rows * 0.55); roof.rotation.x = -0.08; g.add(roof); }
      var x = p.x + p.tz * side * off, z = p.z - p.tx * side * off;
      g.position.set(x, RX.roadHeight(p.p, 0) - 0.2, z);
      g.rotation.y = Math.atan2(p.tx, p.tz) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(g);
    }
  }

  function buildPits(scene, track, tod) {
    var p = RX.trackAt(track, track.length - 60, 0), M = RX.mats();
    var side = 1, off = p.w + track.wallOff + 14;
    var g = new THREE.Group();
    var bld = new THREE.Mesh(new THREE.BoxGeometry(120, 7, 14), new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.6 })); bld.position.set(0, 3.5, 7); g.add(bld);
    var glass = new THREE.Mesh(new THREE.BoxGeometry(120, 2.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.1, metalness: 0.6, emissive: tod.night ? 0x334455 : 0 })); glass.position.set(0, 5.6, -0.05); g.add(glass);
    for (var i = 0; i < 12; i++) {
      var door = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ color: tod.night ? 0xfff2cc : 0x2b2e33, emissive: tod.night ? 0x886644 : 0 })); door.position.set(-55 + i * 10, 2, -0.02); door.rotation.y = Math.PI; g.add(door);
    }
    var pitlane = new THREE.Mesh(new THREE.PlaneGeometry(130, 12), new THREE.MeshStandardMaterial({ color: 0x45474b, roughness: 0.9 })); pitlane.rotation.x = -Math.PI / 2; pitlane.position.set(0, 0.03, -7); g.add(pitlane);
    g.position.set(p.x + p.tz * side * off, RX.roadHeight(p.p, 0) - 0.15, p.z - p.tx * side * off);
    g.rotation.y = Math.atan2(p.tx, p.tz) - Math.PI / 2;
    g.traverse(function (o) { if (o.isMesh) o.receiveShadow = true; });
    scene.add(g);
    // pit entry board
    addSign(scene, RX.trackAt(track, track.pitStart - 30, p.w + 3), 'PIT  IN', '#ffffff');
  }

  function buildLightTowers(scene, track) {
    var M = RX.mats();
    for (var i = 0; i < 10; i++) {
      var p = RX.trackAt(track, i / 10 * track.length, 0);
      var off = p.w + track.wallOff + 25, side = -1;
      var x = p.x + p.tz * side * off, z = p.z - p.tx * side * off;
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 35, 8), M.steel); pole.position.set(x, p.y + 17.5, z); scene.add(pole);
      var lamp = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 1), new THREE.MeshBasicMaterial({ color: 0xfffbe8 })); lamp.position.set(x, p.y + 35, z); lamp.lookAt(p.x, p.y, p.z); scene.add(lamp);
    }
  }

  function buildBrakeBoards(scene, track) {
    var P = track.pts, N = track.N, boardTex = {};
    function tex(n) {
      return boardTex[n] || (boardTex[n] = (function () { var c = RX.canvas(64, 64), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#111'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.fillText(n, 32, 45); return new THREE.CanvasTexture(c); })());
    }
    var last = -1e9;
    for (var i = 0; i < N; i++) {
      if (Math.abs(P[i].curv) > 0.02 && P[i].s - last > 300) {
        last = P[i].s;
        [150, 100, 50].forEach(function (d) {
          var p = RX.trackAt(track, P[i].s - d - 20, 0);
          var side = P[i].curv > 0 ? 1 : -1; // outside of the corner
          var off = p.w + 2.5;
          var m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex(String(d)), side: THREE.DoubleSide }));
          m.position.set(p.x + p.tz * side * off, p.y + 1.2, p.z - p.tx * side * off); m.rotation.y = Math.atan2(p.tx, p.tz) + Math.PI; scene.add(m);
        });
      }
    }
  }

  // ---------- trees, rocks, buildings, spectators ----------
  function buildScenery(scene, track, theme, R, tod, opts, heightAt) {
    var P = track.pts, N = track.N, M = RX.mats();
    var kind = theme.trees;
    var count = Math.round(Math.min(5000, track.length * 0.9 * theme.density));
    if (opts.lowQuality) count = Math.round(count * 0.4);
    var spots = [];
    var minOff = track.style === 'stage' || track.style === 'hill' ? 7 : track.wallOff + 6;
    for (var i = 0; i < count; i++) {
      var k = Math.floor(R() * N), p = P[k];
      var side = R() < 0.5 ? 1 : -1;
      var off = p.w + minOff + Math.pow(R(), 1.6) * 260;
      var x = p.x + p.nx * side * off, z = p.z + p.nz * side * off;
      // reject if close to any other part of the track
      var nr = RX.nearestIdx(track, x, z, 1);
      if (nr.idx >= 0 && Math.sqrt(nr.d2) < P[nr.idx].w + minOff - 1) continue;
      var y = heightAt(x, z) - 0.2;
      spots.push([x, y, z, 0.7 + R() * 0.8, R() * 6.28]);
    }
    if (kind !== 'none' && spots.length) {
      var dummy = new THREE.Object3D();
      var parts = [];
      var trunk = new THREE.MeshStandardMaterial({ color: 0x5a3f28, roughness: 0.9 });
      if (kind === 'pine' || kind === 'snowpine' || kind === 'mixed') {
        var leaf = new THREE.MeshStandardMaterial({ color: kind === 'snowpine' ? 0x2d4a36 : 0x24502a, roughness: 0.9, flatShading: true });
        parts.push({ g: new THREE.CylinderGeometry(0.25, 0.35, 3, 6), m: trunk, y: 1.5, s: 1 });
        parts.push({ g: new THREE.ConeGeometry(2.6, 6, 7), m: leaf, y: 5, s: 1 });
        parts.push({ g: new THREE.ConeGeometry(2.0, 4.5, 7), m: leaf, y: 7.6, s: 1 });
        if (kind === 'snowpine') parts.push({ g: new THREE.ConeGeometry(1.4, 2.2, 7), m: new THREE.MeshStandardMaterial({ color: 0xf4f8fc, roughness: 0.8 }), y: 9.4, s: 1 });
      }
      if (kind === 'mixed') {
        var leaf2 = new THREE.MeshStandardMaterial({ color: 0x3f6f2a, roughness: 0.9, flatShading: true });
        parts.push({ g: new THREE.IcosahedronGeometry(3.2, 0), m: leaf2, y: 5.5, s: 1, alt: true });
      }
      if (kind === 'palm') {
        var pleaf = new THREE.MeshStandardMaterial({ color: 0x3f7a2a, roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
        parts.push({ g: new THREE.CylinderGeometry(0.2, 0.32, 8, 6), m: trunk, y: 4, s: 1 });
        for (var f = 0; f < 6; f++) { var fg = new THREE.ConeGeometry(0.6, 4.5, 3); fg.rotateX(Math.PI / 2 + 0.5); fg.translate(0, 0, 2); fg.rotateY(f / 6 * Math.PI * 2); parts.push({ g: fg, m: pleaf, y: 8, s: 1 }); }
      }
      if (kind === 'cactus') {
        var cm = new THREE.MeshStandardMaterial({ color: 0x4f7a3a, roughness: 0.8 });
        parts.push({ g: new THREE.CylinderGeometry(0.35, 0.4, 4, 8), m: cm, y: 2, s: 1 });
        var arm = new THREE.CylinderGeometry(0.25, 0.25, 1.6, 8); arm.translate(0.8, 2.6, 0); parts.push({ g: arm, m: cm, y: 0, s: 1 });
        var arm2 = new THREE.CylinderGeometry(0.22, 0.22, 1.2, 8); arm2.translate(-0.7, 2.0, 0); parts.push({ g: arm2, m: cm, y: 0, s: 1 });
        parts.push({ g: new THREE.DodecahedronGeometry(1.2, 0), m: new THREE.MeshStandardMaterial({ color: 0x9b7a55, roughness: 1, flatShading: true }), y: 0.3, s: 1, alt: true });
      }
      if (kind === 'acacia') {
        var am = new THREE.MeshStandardMaterial({ color: 0x5a7a2a, roughness: 0.9, flatShading: true });
        parts.push({ g: new THREE.CylinderGeometry(0.25, 0.4, 5, 6), m: trunk, y: 2.5, s: 1 });
        var top = new THREE.CylinderGeometry(4, 3, 1.2, 9); parts.push({ g: top, m: am, y: 5.4, s: 1 });
      }
      var groups = {};
      parts.forEach(function (pt) {
        var key = pt.alt ? 'alt' : 'main';
        (groups[key] || (groups[key] = [])).push(pt);
      });
      Object.keys(groups).forEach(function (key) {
        var list = spots.filter(function (s, i) { return groups.alt ? (key === 'alt' ? i % 3 === 0 : i % 3 !== 0) : true; });
        groups[key].forEach(function (pt) {
          var im = new THREE.InstancedMesh(pt.g, pt.m, list.length);
          list.forEach(function (s, i) {
            dummy.position.set(s[0], s[1] + pt.y * s[3], s[2]); dummy.rotation.set(0, s[4], 0); dummy.scale.setScalar(s[3]); dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
          });
          im.castShadow = true; im.receiveShadow = true;
          scene.add(im);
        });
      });
    }
    // rocks for mountains / deserts
    if (theme.rocks || track.theme === 'desert' || track.theme === 'savanna') {
      var rg = new THREE.DodecahedronGeometry(1.5, 0), rm = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1, flatShading: true });
      var rc = 300, rim = new THREE.InstancedMesh(rg, rm, rc), dmy = new THREE.Object3D();
      for (var r = 0; r < rc; r++) {
        var p = P[Math.floor(R() * N)], sd = R() < 0.5 ? 1 : -1, off2 = p.w + minOff + R() * 120;
        var rxp = p.x + p.nx * sd * off2, rzp = p.z + p.nz * sd * off2; dmy.position.set(rxp, heightAt(rxp, rzp) - 0.4, rzp); dmy.scale.set(0.6 + R() * 2, 0.4 + R() * 1.5, 0.6 + R() * 2); dmy.rotation.set(R(), R() * 6, R()); dmy.updateMatrix();
        rim.setMatrixAt(r, dmy.matrix);
      }
      rim.receiveShadow = true; scene.add(rim);
    }
    // buildings for city tracks
    if (theme.buildings) {
      var winTex = (function () {
        var c = RX.canvas(64, 128), g = c.getContext('2d'); g.fillStyle = '#6b7078'; g.fillRect(0, 0, 64, 128);
        for (var y = 4; y < 128; y += 12) for (var x = 4; x < 64; x += 12) { g.fillStyle = tod.night ? (Math.random() < 0.55 ? '#ffd890' : '#1b1e24') : (Math.random() < 0.5 ? '#9fb4c8' : '#3a4450'); g.fillRect(x, y, 7, 8); }
        var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
      })();
      var bm = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.6, emissive: tod.night ? 0xffffff : 0x000000, emissiveMap: tod.night ? winTex : null, emissiveIntensity: tod.night ? 0.8 : 0 });
      var bgeo = new THREE.BoxGeometry(1, 1, 1); bgeo.translate(0, 0.5, 0);
      var bc = Math.round(track.length / 12), bim = new THREE.InstancedMesh(bgeo, bm, bc), d2 = new THREE.Object3D(), placed = 0;
      for (var q = 0; q < bc * 3 && placed < bc; q++) {
        var pk = P[Math.floor(R() * N)], sd2 = R() < 0.5 ? 1 : -1, w = 14 + R() * 20, dpt = 14 + R() * 20, h = 10 + R() * (tod.night ? 70 : 45);
        var off3 = pk.w + track.wallOff + 10 + Math.max(w, dpt) / 2 + R() * 40;
        var bx = pk.x + pk.nx * sd2 * off3, bz = pk.z + pk.nz * sd2 * off3;
        var nr2 = RX.nearestIdx(track, bx, bz, 2);
        if (nr2.idx >= 0 && Math.sqrt(nr2.d2) < P[nr2.idx].w + track.wallOff + 6 + Math.max(w, dpt) * 0.75) continue;
        d2.position.set(bx, heightAt(bx, bz) - 0.5, bz); d2.rotation.set(0, Math.atan2(pk.tx, pk.tz), 0); d2.scale.set(w, h, dpt); d2.updateMatrix();
        bim.setMatrixAt(placed++, d2.matrix);
      }
      bim.count = placed; bim.castShadow = true; bim.receiveShadow = true; scene.add(bim);
    }
    // rally / hillclimb spectators and tape
    if (track.style === 'stage' || track.style === 'hill') {
      var pg = new THREE.CylinderGeometry(0.22, 0.25, 1.7, 6); pg.translate(0, 0.85, 0);
      var pmat = new THREE.MeshStandardMaterial({ vertexColors: false, color: 0xffffff, roughness: 0.8 });
      var pc = Math.round(track.length / 6), pim = new THREE.InstancedMesh(pg, pmat, pc), dd = new THREE.Object3D(), col = new THREE.Color();
      for (var s = 0; s < pc; s++) {
        var cluster = P[Math.floor(R() * N)], sd3 = R() < 0.5 ? 1 : -1, off4 = cluster.w + 5 + R() * 6;
        dd.position.set(cluster.x + cluster.nx * sd3 * off4 + (R() - 0.5) * 3, cluster.y - 0.2, cluster.z + cluster.nz * sd3 * off4 + (R() - 0.5) * 3); dd.scale.setScalar(0.9 + R() * 0.25); dd.updateMatrix();
        pim.setMatrixAt(s, dd.matrix); pim.setColorAt(s, col.setHSL(R(), 0.6, 0.45));
      }
      pim.castShadow = true; scene.add(pim);
      // snow banks
      if (track.surface === 'snow') {
        [1, -1].forEach(function (side) {
          var pos = [], ix = [], cnt = 0;
          for (var k = 0; k < N; k += 2) {
            var p = P[k], o1 = p.w + 0.8, o2 = p.w + 2.5;
            pos.push(p.x + p.nx * side * o1, p.y, p.z + p.nz * side * o1, p.x + p.nx * side * o2, p.y + 1.1, p.z + p.nz * side * o2);
            if (cnt) { var a = (cnt - 1) * 2; if (side > 0) ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
            cnt++;
          }
          var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ix); g.computeVertexNormals();
          var m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xf6f9fc, roughness: 0.8 })); m.receiveShadow = true; scene.add(m);
        });
      }
    }
  }

  // ---------- particles ----------
  RX.Particles = function (scene, max) {
    this.max = max || 600;
    var c = RX.canvas(64, 64), g = c.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    this.tex = new THREE.CanvasTexture(c);
    this.pool = []; this.scene = scene; this.live = [];
    for (var i = 0; i < this.max; i++) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false; scene.add(s); this.pool.push(s);
    }
    this.idx = 0;
  };
  RX.Particles.prototype.emit = function (pos, vel, color, size, life, additive, grow) {
    var s = this.pool[this.idx = (this.idx + 1) % this.max];
    s.visible = true; s.position.copy(pos);
    s.material.color.set(color); s.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    s.userData = { v: vel.clone(), life: life, max: life, size: size, grow: grow == null ? 3 : grow, a0: additive ? 1 : 0.55 };
    s.scale.setScalar(size);
    s.material.opacity = s.userData.a0;
  };
  RX.Particles.prototype.update = function (dt) {
    for (var i = 0; i < this.max; i++) {
      var s = this.pool[i]; if (!s.visible) continue;
      var u = s.userData; u.life -= dt;
      if (u.life <= 0) { s.visible = false; continue; }
      s.position.addScaledVector(u.v, dt); u.v.multiplyScalar(1 - dt * 1.5); u.v.y += dt * 0.6;
      var f = u.life / u.max;
      s.material.opacity = u.a0 * f;
      s.scale.setScalar(u.size * (1 + (1 - f) * u.grow));
    }
  };

  // Rain streaks that follow the camera
  RX.Rain = function (scene) {
    var n = 4000, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 6);
    for (var i = 0; i < n; i++) { var x = (Math.random() - 0.5) * 80, y = Math.random() * 40, z = (Math.random() - 0.5) * 80; pos.set([x, y, z, x + 0.05, y - 0.7, z], i * 6); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.35 }));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh); this.pos = pos; this.n = n;
  };
  RX.Rain.prototype.update = function (dt, cam) {
    this.mesh.position.set(cam.position.x, cam.position.y - 15, cam.position.z);
    var p = this.pos;
    for (var i = 0; i < this.n; i++) {
      var o = i * 6; p[o + 1] -= dt * 30; p[o + 4] -= dt * 30;
      if (p[o + 1] < 0) { p[o + 1] += 40; p[o + 4] += 40; }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  };
})();
