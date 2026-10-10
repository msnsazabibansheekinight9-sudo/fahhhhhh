// Dropfall — 3D world: renderer, terrain, sky, lighting, scenery, entity sync, effects.
'use strict';
(function () {
  const T = THREE, U = DF.U, MD = DF.Models, W = DF.WORLD;
  const X = DF.Gfx = {};
  let renderer, scene, camera, sun, hemi, flash, fog, world, dyn, skyMesh, stars;
  let built = null; // the mission the scene was built for
  const TAU = Math.PI * 2;
  X.EYE = 34;

  // terrain height: gentle rolling ground, rising into hills past the map edge
  X.h = function (x, z) {
    let h = 5 * Math.sin(x * 0.0021 + 1.3) * Math.cos(z * 0.0017 + 0.4) + 3 * Math.sin(x * 0.0063 + z * 0.0041) + 1.4 * Math.sin(z * 0.011 + x * 0.003);
    const out = Math.max(0, -x, x - W, -z, z - W);
    if (out > 0) h += out * 0.45 + Math.sin(x * 0.02) * Math.cos(z * 0.017) * out * 0.08;
    return h;
  };

  X.init = function (canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.NoToneMapping;
    renderer.autoClear = false;
    camera = new T.PerspectiveCamera(72, 1, 1, 6000);
    camera.rotation.order = 'YXZ';
    X.camera = camera; X.renderer = renderer;
    X.resize();
    window.addEventListener('resize', X.resize);
  };
  X.resize = function () {
    if (!renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (DF.View) DF.View.resize(w, h);
    pointScale = h / 2 / Math.tan(camera.fov * Math.PI / 360);
  };
  let pointScale = 400;

  // ---------------------------------------------------------------- biome lighting
  const LOOK = {
    dunes:    { skyTop: '#5f8fc4', skyBot: '#e8cfa0', fog: '#d8bf94', sun: '#fff1d0', sunI: 2.4, amb: 0.75, ground: '#a68048' },
    tundra:   { skyTop: '#7f9fbf', skyBot: '#e0e8ee', fog: '#d6e0e8', sun: '#f4f8ff', sunI: 1.9, amb: 0.95, ground: '#b4c2ca' },
    jungle:   { skyTop: '#4f7aa0', skyBot: '#b8c8a8', fog: '#8fa88a', sun: '#fff4d8', sunI: 2.0, amb: 0.7, ground: '#33502a' },
    volcanic: { skyTop: '#2a1a1a', skyBot: '#8a4a30', fog: '#5a3a2e', sun: '#ffb27a', sunI: 1.6, amb: 0.55, ground: '#2e2624' },
    marsh:    { skyTop: '#5a6a5a', skyBot: '#a8b098', fog: '#8a9680', sun: '#f0f0d0', sunI: 1.4, amb: 0.75, ground: '#3f4a30' },
    moon:     { skyTop: '#05060c', skyBot: '#30323a', fog: '#2a2c34', sun: '#ffffff', sunI: 2.6, amb: 0.45, ground: '#6d6c68', stars: true },
    ashland:  { skyTop: '#4a4848', skyBot: '#9a8f84', fog: '#7a726a', sun: '#ffe0c0', sunI: 1.5, amb: 0.7, ground: '#524e49' },
    crystal:  { skyTop: '#2a1e5a', skyBot: '#8a7ab8', fog: '#6a5a98', sun: '#e8dcff', sunI: 1.8, amb: 0.7, ground: '#3e3954', stars: true },
    colony:   { skyTop: '#4a5a72', skyBot: '#a8b0b8', fog: '#8a929a', sun: '#fff0dc', sunI: 1.9, amb: 0.75, ground: '#4b4d50' }
  };
  function look(M) {
    const L = Object.assign({}, LOOK[M.biomeId]);
    if (M.hazard === 'night') Object.assign(L, { skyTop: '#03040a', skyBot: '#141826', fog: '#0a0c14', sun: '#9fb4ff', sunI: 0.35, amb: 0.16, stars: true, night: true });
    if (M.hazard === 'sandstorm') L.fog = '#c8a070';
    if (M.hazard === 'fog') L.fog = shadeHex(L.fog, 0.05);
    return L;
  }
  function shadeHex(c, f) { return MD.shade(c, f); }

  // ---------------------------------------------------------------- build the scene for a mission
  X.build = function (g) {
    const M = g.M;
    if (scene) dispose();
    scene = new T.Scene(); world = new T.Group(); dyn = new T.Group(); scene.add(world, dyn);
    const L = look(M); X.look = L;
    scene.background = new T.Color(L.fog);
    fog = new T.Fog(L.fog, 200, 1600); scene.fog = fog;
    hemi = new T.HemisphereLight(L.skyTop, L.ground, L.amb); scene.add(hemi);
    sun = new T.DirectionalLight(L.sun, L.sunI * 0.55);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -420; sc.right = 420; sc.top = 420; sc.bottom = -420; sc.near = 10; sc.far = 2000;
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.6;
    scene.add(sun, sun.target);
    // player lamp
    flash = new T.SpotLight('#fff2dc', L.night ? 2.2 : 0, 900, 0.5, 0.45, 1.2); flash.castShadow = false; scene.add(flash, flash.target);
    buildSky(L);
    // image-based lighting from the sky so metal and armor pick up the planet's colors
    try {
      const pm = new T.PMREMGenerator(renderer), envScene = new T.Scene();
      const sk = skyMesh.clone(); sk.children.length = 0; envScene.add(sk);
      const gnd = new T.Mesh(new T.CircleGeometry(4000, 16), new T.MeshBasicMaterial({ color: L.ground })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -200; envScene.add(gnd);
      if (X.envRT) X.envRT.dispose();
      X.envRT = pm.fromScene(envScene, 0.04); X.env = X.envRT.texture; scene.environment = X.env; pm.dispose();
    } catch (e) { X.env = null; }
    hemi.intensity = L.amb * 0.7;
    buildGround(M, L);
    buildObstacles(M);
    buildStructures(g);
    buildFxPools();
    built = M;
    X.models = { enemies: new Map(), divers: new Map(), veh: new Map(), sent: new Map(), items: new Map(), cols: new Map(), struct: new Map(), novas: new Map() };
    X.dead = [];
    X.props = [];
  };

  function dispose() {
    scene.traverse(o => { if (o.geometry && !Object.values(MD.GEO).includes(o.geometry)) o.geometry.dispose(); });
    if (built && built._groundTex) built._groundTex.dispose();
    scene = null;
  }

  function buildSky(L) {
    const g = new T.SphereGeometry(4800, 24, 16);
    const m = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color(L.skyTop) }, bot: { value: new T.Color(L.skyBot) }, fogc: { value: new T.Color(L.fog) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform vec3 fogc; varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(bot, top, smoothstep(-0.02, 0.6, h)); c = mix(c, fogc, smoothstep(0.12, -0.05, h)); gl_FragColor = vec4(c,1.0); }'
    });
    skyMesh = new T.Mesh(g, m); scene.add(skyMesh);
    // a large planet hangs in the sky
    const pl = new T.Mesh(new T.SphereGeometry(520, 32, 20), new T.MeshBasicMaterial({ color: L.night ? '#3a4a7a' : '#c8a878', fog: false, transparent: true, opacity: L.night || L.stars ? 0.95 : 0.35 }));
    pl.position.set(-2200, 1900, -3000); skyMesh.add(pl);
    const ring = new T.Mesh(new T.RingGeometry(620, 900, 64), new T.MeshBasicMaterial({ color: '#d8c8a8', side: T.DoubleSide, fog: false, transparent: true, opacity: L.night || L.stars ? 0.35 : 0.15 }));
    ring.position.copy(pl.position); ring.rotation.set(1.2, 0.3, 0.2); skyMesh.add(ring);
    if (L.stars) {
      const pts = []; for (let i = 0; i < 1600; i++) { const u = Math.random() * 2 - 1, th = Math.random() * TAU, rr = Math.sqrt(1 - u * u); const v = new T.Vector3(rr * Math.cos(th), u, rr * Math.sin(th)); if (v.y < 0.05) v.y = Math.abs(v.y) + 0.05; v.normalize().multiplyScalar(4500); pts.push(v.x, v.y, v.z); }
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      stars = new T.Points(sg, new T.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
      skyMesh.add(stars);
    }
    // sun disc
    const sd = new T.Mesh(new T.CircleGeometry(160, 32), new T.MeshBasicMaterial({ color: L.sun, fog: false, transparent: true, opacity: L.night ? 0.6 : 0.9 }));
    sd.position.set(2600, 2400, 2000); sd.lookAt(0, 0, 0); skyMesh.add(sd); X.sunDir = sd.position.clone().normalize();
  }

  function buildGround(M, L) {
    const size = W + 3000, seg = 200;
    const geo = new T.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2); geo.translate(W / 2, 0, W / 2);
    const p = geo.attributes.position, cols = [];
    const mc = M.macro.getContext('2d').getImageData(0, 0, 96, 96).data;
    const g1 = new T.Color(M.biome.g1), g2 = new T.Color(M.biome.g2), g3 = new T.Color(M.biome.g3), c = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, X.h(x, z));
      const mx = Math.max(0, Math.min(95, Math.floor(x / W * 96))), mz = Math.max(0, Math.min(95, Math.floor(z / W * 96)));
      const a = mc[(mz * 96 + mx) * 4 + 3] / 255;
      const n = 0.5 + 0.5 * Math.sin(x * 0.013 + z * 0.007) * Math.cos(z * 0.011 - x * 0.004);
      c.copy(g1).lerp(n > 0.5 ? g3 : g2, Math.abs(n - 0.5) * 0.9).lerp(g2, a * 0.5);
      const out = Math.max(0, -x, x - W, -z, z - W); if (out > 0) c.multiplyScalar(Math.max(0.55, 1 - out / 900));
      c.multiplyScalar(1.25); // tile texture multiplies on top
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const tex = new T.CanvasTexture(M.groundTile); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(size / 260, size / 260); tex.anisotropy = 8;
    M._groundTex = tex;
    const dtex = new T.CanvasTexture(M.decal); X.decalTex = dtex;
    const mat = new T.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.95, metalness: 0 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.decalMap = { value: dtex };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWXZ = (modelMatrix * vec4(position,1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D decalMap; varying vec2 vWXZ;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n vec2 duv = vec2(vWXZ.x / ' + W.toFixed(1) + ', 1.0 - vWXZ.y / ' + W.toFixed(1) + ');\n if (duv.x > 0.0 && duv.x < 1.0 && duv.y > 0.0 && duv.y < 1.0) { vec4 dc = texture2D(decalMap, duv); diffuseColor.rgb = mix(diffuseColor.rgb, dc.rgb * 0.7, dc.a); }');
    };
    const ground = new T.Mesh(geo, mat); ground.receiveShadow = true; world.add(ground);
    X.ground = ground;
  }

  // ---------------------------------------------------------------- instanced scenery
  function rockGeo(seed, detail) {
    const g = new T.IcosahedronGeometry(1, detail || 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 1 + 0.22 * Math.sin(x * 5.1 + seed) * Math.cos(y * 4.3 + seed * 2) + 0.12 * Math.sin(z * 7 + seed * 3);
      p.setXYZ(i, x * n, Math.max(-0.35, y) * n, z * n);
    }
    g.computeVertexNormals(); return g;
  }
  function instanced(geo, material, list, shadow) {
    if (!list.length) return;
    const im = new T.InstancedMesh(geo, material, list.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3(), c = new T.Color();
    list.forEach((it, i) => {
      e.set(it.rx || 0, it.ry || 0, it.rz || 0); q.setFromEuler(e); v.set(it.x, it.y, it.z); s.set(it.sx, it.sy, it.sz);
      m4.compose(v, q, s); im.setMatrixAt(i, m4);
      if (it.c) { c.set(it.c); im.setColorAt(i, c); }
    });
    im.castShadow = shadow !== false; im.receiveShadow = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    world.add(im); return im;
  }

  function buildObstacles(M) {
    const b = M.biome, rockCol = { rock: MD.shade(b.g2, -0.22), icerock: '#a9bcc8', basalt: '#2b2524', mesa: MD.shade(b.g2, -0.12) };
    const rockG = [rockGeo(1.3), rockGeo(4.7), rockGeo(8.1)];
    const lists = { rock: [[], [], []], trunk: [], canopy: [], cone: [], branch: [], bush: [], lava: [], pool: [], crater: [], bone: [], box: [], crystal: [], hex: [] };
    const jitter = (c, f) => MD.shade(c, (Math.random() - 0.5) * f);
    for (const o of M.obs) {
      const h = X.h(o.shape === 'r' ? o.x + o.w / 2 : o.x, o.shape === 'r' ? o.y + o.h / 2 : o.y);
      switch (o.kind) {
        case 'rock': case 'icerock': case 'mesa': {
          const tall = o.kind === 'mesa' ? 0.9 : 0.75;
          lists.rock[Math.floor(o.seed * 3)].push({ x: o.x, y: h - 3, z: o.y, sx: o.r * 1.05, sy: o.r * tall * (o.kind === 'mesa' ? 1.1 : 1), sz: o.r * 1.05, ry: o.seed * 9, c: jitter(rockCol[o.kind], 0.08) });
          break;
        }
        case 'basalt': for (let i = 0; i < 3; i++) { const a = o.seed * 9 + i * 2.1, d = i ? o.r * 0.45 : 0; lists.hex.push({ x: o.x + Math.cos(a) * d, y: h, z: o.y + Math.sin(a) * d, sx: o.r * (i ? 0.5 : 0.65), sy: o.r * (1.6 + i * 0.5), sz: o.r * (i ? 0.5 : 0.65), ry: a, c: jitter('#2b2524', 0.06) }); } break;
        case 'crystal': for (let i = 0; i < 4; i++) { const a = o.seed * 9 + i * 1.7, d = i ? o.r * 0.5 : 0; lists.crystal.push({ x: o.x + Math.cos(a) * d, y: h, z: o.y + Math.sin(a) * d, sx: o.r * (i ? 0.3 : 0.45), sy: o.r * (i ? 1.8 : 3), sz: o.r * (i ? 0.3 : 0.45), rx: i ? Math.sin(a) * 0.35 : 0, rz: i ? Math.cos(a) * 0.35 : 0, ry: a, c: jitter('#8a6ae0', 0.1) }); } break;
        case 'tree': {
          const th = 60 + o.seed * 50;
          lists.trunk.push({ x: o.x, y: h + th / 2, z: o.y, sx: o.r * 0.6, sy: th, sz: o.r * 0.6, c: '#4a3424' });
          for (let i = 0; i < 4; i++) { const a = o.seed * 9 + i * 1.6, d = i ? o.canopy * 0.35 : 0; lists.canopy.push({ x: o.x + Math.cos(a) * d, y: h + th + (i ? -6 : 8), z: o.y + Math.sin(a) * d, sx: o.canopy * 0.6, sy: o.canopy * 0.45, sz: o.canopy * 0.6, ry: a, c: jitter(M.biomeId === 'jungle' ? '#2e5224' : '#3e6030', 0.1) }); }
          break;
        }
        case 'pine': {
          const th = 30;
          lists.trunk.push({ x: o.x, y: h + th / 2, z: o.y, sx: o.r * 0.5, sy: th, sz: o.r * 0.5, c: '#3a2a1c' });
          for (let i = 0; i < 3; i++) lists.cone.push({ x: o.x, y: h + th + i * 26, z: o.y, sx: o.canopy * (1 - i * 0.27), sy: 55, sz: o.canopy * (1 - i * 0.27), c: M.biomeId === 'tundra' && i === 2 ? '#e4ecf0' : jitter('#2f4a3c', 0.08) });
          break;
        }
        case 'deadtree': {
          lists.trunk.push({ x: o.x, y: h + 30, z: o.y, sx: o.r * 0.55, sy: 60, sz: o.r * 0.55, c: '#3a3029' });
          for (let i = 0; i < 4; i++) { const a = o.seed * 7 + i * 1.6; lists.branch.push({ x: o.x + Math.cos(a) * 10, y: h + 40 + i * 6, z: o.y + Math.sin(a) * 10, sx: 2.2, sy: 30, sz: 2.2, rx: Math.sin(a) * 0.9, rz: -Math.cos(a) * 0.9, c: '#3a3029' }); }
          break;
        }
        case 'bush': for (let i = 0; i < 4; i++) { const a = o.seed * 9 + i * 1.6, d = i ? o.r * 0.45 : 0; lists.bush.push({ x: o.x + Math.cos(a) * d, y: h + 6, z: o.y + Math.sin(a) * d, sx: o.r * 0.55, sy: o.r * 0.38, sz: o.r * 0.55, c: jitter('#3a5a2c', 0.1) }); } break;
        case 'lava': lists.lava.push({ x: o.x, y: h + 0.6, z: o.y, sx: o.r, sy: 1, sz: o.r * 0.8, ry: o.seed * 3 }); break;
        case 'pool': lists.pool.push({ x: o.x, y: h + 0.7, z: o.y, sx: o.r, sy: 1, sz: o.r * 0.75, ry: o.seed * 3 }); break;
        case 'crater': lists.crater.push({ x: o.x, y: h, z: o.y, sx: o.r, sy: o.r * 0.6, sz: o.r, rx: -Math.PI / 2, c: MD.shade(b.g2, -0.08) }); break;
        case 'bones': for (let i = -2; i <= 2; i++) lists.bone.push({ x: o.x + i * o.r * 0.35, y: h + 4, z: o.y, sx: o.r * 0.6, sy: o.r * 0.6, sz: o.r * 0.6, ry: Math.PI / 2, c: '#d8ccb0' }); break;
        case 'building': { const bh = 70 + o.seed * 90; lists.box.push({ x: o.x + o.w / 2, y: h + bh / 2 - 4, z: o.y + o.h / 2, sx: o.w, sy: bh, sz: o.h, c: jitter('#5d6168', 0.08) }); lists.box.push({ x: o.x + o.w / 2, y: h + bh, z: o.y + o.h / 2, sx: o.w + 6, sy: 5, sz: o.h + 6, c: '#3e4248' }); break; }
        case 'ruin': { const bh = 24 + o.seed * 30; lists.box.push({ x: o.x + o.w / 2, y: h + bh / 2 - 3, z: o.y + o.h / 2, sx: o.w, sy: bh, sz: o.h, c: jitter('#6c6e70', 0.08) }); break; }
        case 'wreck': { lists.box.push({ x: o.x + o.w / 2, y: h + 10, z: o.y + o.h / 2, sx: o.w, sy: 22, sz: o.h, rz: (o.seed - 0.5) * 0.3, c: jitter('#4b4a46', 0.1) }); break; }
      }
    }
    // border: a wall of large boulders and cliffs just outside the map
    for (let i = 0; i < 4 * 34; i++) {
      const side = Math.floor(i / 34), k = (i % 34) / 33 * (W + 400) - 200, off = -90 - Math.random() * 60;
      const x = side === 0 ? k : side === 1 ? k : side === 2 ? off : W - off, z = side === 0 ? off : side === 1 ? W - off : k;
      lists.rock[i % 3].push({ x, y: X.h(x, z) - 10, z, sx: 120 + Math.random() * 60, sy: 120 + Math.random() * 80, sz: 120 + Math.random() * 60, ry: Math.random() * 6, c: MD.shade(rockCol.mesa || b.g2, -0.1) });
    }
    const flat = c => new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0.02, flatShading: true });
    lists.rock.forEach((l, i) => instanced(rockG[i], flat(), l));
    instanced(new T.CylinderGeometry(0.7, 1, 1, 7), new T.MeshStandardMaterial({ color: '#fff', roughness: 1 }), lists.trunk);
    instanced(new T.IcosahedronGeometry(1, 1), new T.MeshStandardMaterial({ color: '#fff', roughness: 0.85, flatShading: true }), lists.canopy);
    { const cg = new T.ConeGeometry(1, 1, 8); cg.translate(0, 0.5, 0); instanced(cg, new T.MeshStandardMaterial({ color: '#fff', roughness: 0.9, flatShading: true }), lists.cone); }
    instanced(new T.CylinderGeometry(0.4, 1, 1, 5), new T.MeshStandardMaterial({ color: '#fff', roughness: 1 }), lists.branch);
    instanced(new T.IcosahedronGeometry(1, 1), new T.MeshStandardMaterial({ color: '#fff', roughness: 0.9, flatShading: true }), lists.bush);
    instanced(new T.CylinderGeometry(1, 1, 1, 24), new T.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff4a10', emissiveIntensity: 1.6, roughness: 0.6 }), lists.lava, false);
    instanced(new T.CylinderGeometry(1, 1, 1, 24), new T.MeshStandardMaterial({ color: M.biomeId === 'marsh' ? '#3a4a24' : '#2a4a5a', roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.85 }), lists.pool, false);
    instanced(new T.TorusGeometry(1, 0.18, 6, 24), new T.MeshStandardMaterial({ color: '#fff', roughness: 1, flatShading: true }), lists.crater, false);
    instanced(new T.TorusGeometry(1, 0.06, 5, 16, Math.PI), new T.MeshStandardMaterial({ color: '#fff', roughness: 0.7 }), lists.bone);
    instanced(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ color: '#fff', roughness: 0.85, metalness: 0.1 }), lists.box);
    instanced(new T.CylinderGeometry(0.85, 1, 1, 6).translate(0, 0.5, 0), new T.MeshStandardMaterial({ color: '#fff', roughness: 0.8, flatShading: true }), lists.hex);
    { const og = new T.OctahedronGeometry(1, 0); og.scale(1, 0.5, 1); og.translate(0, 0.45, 0); instanced(og, new T.MeshStandardMaterial({ color: '#fff', emissive: '#4a2aa0', emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.88 }), lists.crystal); }
  }

  function buildStructures(g) {
    X.structModels = [];
    for (const st of g.M.structs) {
      const m = MD.structure(st, st.faction || g.M.faction, g.M);
      m.root.position.set(st.x, X.h(st.x, st.y), st.y);
      world.add(m.root); X.structModels.push({ st, m });
    }
  }

  // ---------------------------------------------------------------- effects pools
  let parts, glowPts, tracerPool, beamPool, orbPool, ringPool, lightPool, spritePool, weather, softTex;
  function makeSoftTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
  }
  function pointsSystem(n, additive) {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('size', new T.Float32BufferAttribute(new Float32Array(n), 1));
    geo.setAttribute('col', new T.Float32BufferAttribute(new Float32Array(n * 4), 4));
    const mat = new T.ShaderMaterial({
      uniforms: { scale: { value: 400 }, map: { value: softTex } }, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
      vertexShader: 'attribute float size; attribute vec4 col; varying vec4 vC; uniform float scale; void main(){ vC = col; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a * t.a); }'
    });
    const pts = new T.Points(geo, mat); pts.frustumCulled = false; pts.userData.n = n; dyn.add(pts); return pts;
  }
  function buildFxPools() {
    softTex = softTex || makeSoftTex();
    parts = pointsSystem(2400, false); glowPts = pointsSystem(2400, true);
    const add = (col) => new T.MeshBasicMaterial({ color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
    tracerPool = []; for (let i = 0; i < 260; i++) { const m = new T.Mesh(MD.GEO.box, add('#ffe9a8')); m.visible = false; dyn.add(m); tracerPool.push(m); }
    beamPool = []; for (let i = 0; i < 90; i++) { const m = new T.Mesh(MD.GEO.cylXc, add('#ff5a4a')); m.visible = false; dyn.add(m); beamPool.push(m); }
    orbPool = []; for (let i = 0; i < 90; i++) { const m = new T.Mesh(MD.GEO.sphLo, add('#ffd27a')); m.visible = false; dyn.add(m); orbPool.push(m); }
    ringPool = []; for (let i = 0; i < 40; i++) { const m = new T.Mesh(new T.RingGeometry(0.85, 1, 40), new T.MeshBasicMaterial({ color: '#ff5a3a', transparent: true, opacity: 0.4, side: T.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; dyn.add(m); ringPool.push(m); }
    lightPool = []; for (let i = 0; i < 6; i++) { const l = new T.PointLight('#ffb070', 0, 400, 2); scene.add(l); lightPool.push(l); }
    spritePool = []; for (let i = 0; i < 70; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: softTex, color: '#cccccc', transparent: true, depthWrite: false })); s.visible = false; dyn.add(s); spritePool.push(s); }
    // weather particles live in a box around the camera
    weather = null;
    const M = DF.G.M, hz = M.hazard;
    let kind = hz === 'rain' ? 'rain' : hz === 'blizzard' || M.biomeId === 'tundra' ? 'snow' : hz === 'sandstorm' ? 'sand' : M.biomeId === 'ashland' || M.biomeId === 'volcanic' ? 'ash' : M.biomeId === 'crystal' ? 'motes' : null;
    if (kind) {
      const n = kind === 'rain' ? 2500 : 1800, geo = new T.BufferGeometry(), arr = new Float32Array(n * (kind === 'rain' ? 6 : 3));
      geo.setAttribute('position', new T.Float32BufferAttribute(arr, 3));
      const seeds = []; for (let i = 0; i < n; i++) seeds.push([Math.random() * 800 - 400, Math.random() * 300, Math.random() * 800 - 400, Math.random()]);
      const col = { rain: '#a8b8d0', snow: '#ffffff', sand: '#d8b078', ash: '#4a4440', motes: '#c9b8ff' }[kind];
      const obj = kind === 'rain' ? new T.LineSegments(geo, new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.45 })) : new T.Points(geo, new T.PointsMaterial({ color: col, map: softTex, size: kind === 'snow' ? 1.6 : 1.1, sizeAttenuation: true, transparent: true, opacity: kind === 'ash' ? 0.7 : 0.8, depthWrite: false }));
      obj.frustumCulled = false; dyn.add(obj);
      weather = { kind, obj, seeds, n };
    }
  }

  const colCache = new Map();
  function parseCol(s) {
    let c = colCache.get(s); if (c) return c;
    if (s[0] === '#') { const t = new T.Color(s); c = [t.r, t.g, t.b, 1]; }
    else { const m = s.match(/[\d.]+/g).map(Number); c = [m[0] / 255, m[1] / 255, m[2] / 255, m[3] ?? 1]; }
    colCache.set(s, c); return c;
  }

  // ---------------------------------------------------------------- per-frame sync
  const V = new T.Vector3(), V2 = new T.Vector3();
  let decalT = 0;
  X.frame = function (g, cam, dt) {
    const t = g.t;
    if (built !== g.M) X.build(g);
    const P = g.player;
    // camera
    camera.position.set(cam.x, cam.y, cam.z); camera.rotation.set(cam.pitch, cam.yaw, cam.roll || 0);
    camera.fov = cam.fov; camera.updateProjectionMatrix();
    pointScale = renderer.domElement.clientHeight / 2 / Math.tan(camera.fov * Math.PI / 360);
    parts.material.uniforms.scale.value = glowPts.material.uniforms.scale.value = pointScale;
    skyMesh.position.copy(camera.position);
    // sun & shadows follow the player
    sun.position.set(cam.x + X.sunDir.x * 900, cam.y + X.sunDir.y * 900, cam.z + X.sunDir.z * 900);
    sun.target.position.set(cam.x + Math.sin(-cam.yaw) * -150, 0, cam.z - Math.cos(cam.yaw) * 150);
    // lamp
    flash.position.copy(camera.position); camera.getWorldDirection(V); flash.target.position.copy(camera.position).addScaledVector(V, 100);
    // fog and visibility
    const v = g.vis, nearF = X.look.night ? 60 : 220;
    fog.near = nearF * v; fog.far = (X.look.night ? 900 : 1700) * v * (g.M.hazard === 'fog' ? 0.75 : 1);
    if (g.ion) { hemi.intensity = X.look.amb * 0.7 * (0.8 + Math.random() * 0.4); } else hemi.intensity = X.look.amb * 0.7;
    // decals refresh twice a second
    decalT -= dt; if (decalT <= 0) { decalT = 0.5; X.decalTex.needsUpdate = true; }

    syncEnemies(g, dt, t, cam);
    syncDivers(g, dt, t, cam);
    syncMap(X.models.veh, g.vehicles.filter(v2 => v2.alive), v2 => MD.vehicle(v2.vt), (m, v2) => { m.root.position.set(v2.x, X.h(v2.x, v2.y), v2.y); m.root.rotation.y = -v2.ang; m.update(v2, dt, t); m.setFlash(v2.flash > 0); m.root.visible = !(v2.driver && v2.driver.isPlayer && v2.vt !== 'buggy'); }, deadVehicle);
    syncMap(X.models.sent, g.sentries.filter(s => s.alive), s => MD.sentry(s.st), (m, s) => { m.root.position.set(s.x, X.h(s.x, s.y), s.y); m.update(s, dt, t); m.setFlash(s.flash > 0); if (s.cd > 60 / (s.d.rpm || 60) - 0.03 && s.target) m.recoil = 1; });
    syncMap(X.models.items, g.items.filter(i => i.alive), it => MD.item(it), (m, it) => { m.root.position.set(it.x, X.h(it.x, it.y), it.y); m.update(it, dt, t); });
    syncMap(X.models.cols, g.colonists.filter(c => c.alive), () => MD.colonist(), (m, c) => { m.root.position.set(c.x, X.h(c.x, c.y), c.y); m.root.rotation.y = -Math.atan2(c.vy, c.vx); m.update(c, dt, t, { near: false }); m.setFlash(c.flash > 0); });
    syncMap(X.models.novas, g.novas.filter(n => n.alive), () => novaModel(), (m, n) => { m.root.position.set(n.x, X.h(n.x, n.y), n.y); m.light.material.color.set(n.state === 'armed' ? (Math.floor(t * 4) % 2 ? '#ff3a2a' : '#3a0a08') : '#ffd27a'); });
    for (const { st, m } of X.structModels) m.update(st, dt, t, g);
    // dead models finish their animations
    for (let i = X.dead.length - 1; i >= 0; i--) {
      const d = X.dead[i]; d.m.dead = (d.m.dead || 0.001); d.m.update(d.state, dt, t, { h: d.h }); d.life -= dt;
      if (d.life <= 0) { dyn.remove(d.m.root); X.dead.splice(i, 1); }
    }
    // props: landed pods
    for (let i = X.props.length - 1; i >= 0; i--) { const p = X.props[i]; p.life -= dt; if (p.life <= 0) { dyn.remove(p.m.root); X.props.splice(i, 1); } else if (p.life < 2) p.m.root.position.y -= dt * 20; }
    syncPods(g, t);
    syncAir(g, t);
    drawFx(g, dt, t, cam);
    if (weather) updateWeather(g, dt, cam);
    renderer.setClearColor(scene.background);
    renderer.clear();
    renderer.render(scene, camera);
  };
  X.scene = () => scene;

  function syncMap(map, list, make, upd, onGone) {
    const seen = new Set();
    for (const o of list) {
      let m = map.get(o);
      if (!m) { m = make(o); map.set(o, m); dyn.add(m.root); }
      seen.add(o); upd(m, o);
    }
    for (const [o, m] of map) if (!seen.has(o)) { map.delete(o); if (onGone) onGone(o, m); else dyn.remove(m.root); }
  }
  function deadVehicle(v, m) { m.dead = 0.001; X.dead.push({ m: { root: m.root, update: (s, dt) => { m.root.rotation.z += dt * 0.5 * (m.root.rotation.z < 0.4); m.root.position.y -= dt * (m.root.position.y > -40 ? 4 : 0); }, dead: 1 }, state: v, life: 10 }); }

  function novaModel() {
    const root = new T.Group(), m = { root };
    MD.part(root, 'sph', '#d8d2c0', 12, 22, 12, 0, 22, 0, { m: 0.6, r: 0.3 });
    MD.part(root, 'cyl', '#2a2a2a', 12.5, 6, 12.5, 0, 22, 0, { m: 0.6 });
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; MD.part(root, 'box', '#3a3a3a', 2, 14, 8, Math.cos(a) * 10, 6, Math.sin(a) * 10).rotation.y = -a; }
    m.light = MD.part(root, 'sphLo', '#ffd27a', 2.5, 2.5, 2.5, 0, 45, 0, { add: true, o: 1 });
    return m;
  }

  function enemyBase(e) {
    const d = e.def;
    return d.flying ? 0 : X.h(e.x, e.y);
  }
  function syncEnemies(g, dt, t, cam) {
    const map = X.models.enemies, seen = new Set();
    // only the nearest enemies get full models; the rest are hidden by fog anyway
    const list = g.enemies.filter(e => !e.dead).map(e => ({ e, d: Math.hypot(e.x - cam.x, e.y - cam.z) })).filter(o => o.d < 1900).sort((a, b) => a.d - b.d).slice(0, 70);
    for (const { e, d } of list) {
      let m = map.get(e.id);
      if (!m) { m = MD.enemy(e.type); map.set(e.id, m); dyn.add(m.root); m.ref = e; }
      seen.add(e.id);
      const h = enemyBase(e); m.h = h;
      m.root.position.set(e.x, h, e.y);
      m.root.rotation.y = -e.ang;
      if (e.cd > (m.lastCd ?? 0) + 0.2) { m.recoil = 1; e.atkAnim = Math.max(e.atkAnim || 0, 0.18); if (e.def.atk === 'artillery') e.cdFired = 1; }
      m.lastCd = e.cd; if (e.cdFired) e.cdFired = Math.max(0, e.cdFired - dt * 2);
      if (e.burstLeft !== m.lastBurst) { if (e.burstLeft < (m.lastBurst || 0)) m.recoil = 1; m.lastBurst = e.burstLeft; }
      m.update(e, dt, t);
      m.setFlash(e.flash > 0.045);
      m.setShadow(d < 450);
      // shield bubble
      if (e.maxShield) {
        if (!m.shield) { m.shield = new T.Mesh(MD.GEO.sph, new T.MeshBasicMaterial({ color: '#b8a8ff', transparent: true, opacity: 0.2, blending: T.AdditiveBlending, depthWrite: false })); dyn.add(m.shield); }
        const k = e.shield / e.maxShield;
        m.shield.visible = e.shield > 1;
        const r = e.def.draw === 'tripod' ? e.r * 2.6 : e.r * 1.9;
        const by = e.def.draw === 'tripod' ? 95 * (e.r / 40) : (e.def.flying ? 34 + e.r : e.r * 1.5);
        m.shield.position.set(e.x, h + by, e.y); m.shield.scale.setScalar(r);
        m.shield.material.opacity = 0.06 + k * 0.12 + (e.shieldHit > 0 ? 0.25 : 0);
      }
    }
    for (const [id, m] of map) if (!seen.has(id)) {
      map.delete(id);
      if (m.shield) { dyn.remove(m.shield); }
      if (m.ref && m.ref.dead && !m.ref._despawned) { m.dead = 0.001; X.dead.push({ m, state: m.ref, life: m.ref.def.tier >= 2 ? 9 : 6, h: m.h }); }
      else dyn.remove(m.root);
    }
  }

  function syncDivers(g, dt, t, cam) {
    const map = X.models.divers;
    for (const d of g.divers) {
      let m = map.get(d.id);
      const show = d.alive && !d.veh && !d.isPlayer;
      if (m && (m.armId !== d.armorId)) { dyn.remove(m.root); map.delete(d.id); m = null; }
      if (!m && (show || (!d.alive && d.isPlayer === false && false))) { m = MD.diver(d.arm, d.capeId, { gunCls: d.weapons[0] && d.weapons[0].d.cls }); m.armId = d.armorId; map.set(d.id, m); dyn.add(m.root); }
      if (!m) continue;
      if (!d.alive && m.wasAlive && !d.arriving) { m.wasAlive = false; m.dead = 0.001; X.dead.push({ m, state: d, life: 20, h: X.h(d.x, d.y) }); map.delete(d.id); continue; }
      m.root.visible = show;
      if (!show) continue;
      m.wasAlive = true;
      m.root.position.set(d.x, X.h(d.x, d.y) + (d.jumping > 0 ? Math.sin(Math.min(1, (0.5 - d.jumping) / 0.5) * Math.PI) * 60 : 0), d.y);
      m.root.rotation.y = -d.ang;
      const w = d.weapons[d.cur];
      if (w && w.cd > (m.lastCd ?? 0) + 0.01) m.recoil = 1; m.lastCd = w ? w.cd : 0;
      m.update(d, dt, t, { near: Math.hypot(d.x - cam.x, d.y - cam.z) < 500 });
      m.setFlash(d.flash > 0);
    }
    for (const d of g.divers) if (d.jumping > 0) d.jumping -= dt;
  }

  // drop pods in flight; they stay as props after landing
  const podModels = new Map();
  function syncPods(g, t) {
    const seen = new Set();
    for (const p of g.pods) {
      let m = podModels.get(p);
      if (!m) { m = MD.pod(p.payload.kind); podModels.set(p, m); dyn.add(m.root); }
      seen.add(p);
      const k = p.t / p.T, h = k * k * 1400;
      m.root.position.set(p.x + h * 0.25, X.h(p.x, p.y) + h, p.y);
      m.root.rotation.z = -0.2 * k;
      m.flame.scale.y = 30 + Math.random() * 20;
      if (p.payload.kind === 'diver' && p.payload.diver.isPlayer) m.root.visible = false; else m.root.visible = true;
    }
    for (const [p, m] of podModels) if (!seen.has(p)) {
      podModels.delete(p);
      if (p.payload.kind === 'vehicle' || p.payload.kind === 'sentry' || (p.payload.diver && p.payload.diver.isPlayer)) { dyn.remove(m.root); continue; }
      m.flame.visible = false; m.root.position.set(p.x, X.h(p.x, p.y) - 6, p.y); m.root.rotation.z = 0; m.root.visible = true;
      X.props.push({ m, life: 40 });
    }
  }

  // raptors, enemy dropships, extraction ship
  let raptors = [], enemyShips = new Map(), exShip = null, beaconMeshes = [], laserMeshes = [], tornadoMeshes = [], riftMeshes = [], throwMeshes = [], mineMeshes = [];
  function syncAir(g, t) {
    while (raptors.length < g.flyovers.length) { const m = MD.raptor(); dyn.add(m.root); raptors.push(m); }
    raptors.forEach((m, i) => { const f = g.flyovers[i]; m.root.visible = !!f; if (f) { m.root.position.set(f.x, 150, f.y); m.root.rotation.set(0, -Math.atan2(f.vy, f.vx), 0); } });
    const seen = new Set();
    for (const s of g.dropships) { let m = enemyShips.get(s); if (!m) { m = MD.dropship(true); enemyShips.set(s, m); dyn.add(m.root); } seen.add(s); m.root.position.set(s.x, 130 + Math.max(0, s.t - 5) * 40, s.y); m.root.rotation.y = 0; }
    for (const [s, m] of enemyShips) if (!seen.has(s)) { dyn.remove(m.root); enemyShips.delete(s); }
    const ex = g.M.extract;
    if (ex.state === 'landing' || ex.state === 'boarding' || ex.state === 'leaving') {
      if (!exShip) { exShip = MD.dropship(false); dyn.add(exShip.root); }
      let h = 30, ox = 0;
      if (ex.state === 'landing') { h = 30 + (ex.t / 5) ** 2 * 700; ox = -ex.t / 5 * 700; }
      if (ex.state === 'leaving') { h = 30 + ((3 - ex.t) / 3) ** 2 * 800; ox = (3 - ex.t) * 120; }
      exShip.root.position.set(ex.x + ox, X.h(ex.x, ex.y) + h, ex.y); exShip.root.visible = true;
    } else if (exShip) exShip.root.visible = false;
  }

  function takeLight(x, y, z, col, intensity, dist) {
    let best = lightPool[0];
    for (const l of lightPool) if (l.intensity < best.intensity) best = l;
    best.position.set(x, y, z); best.color.set(col); best.intensity = intensity; best.distance = dist; best.userData.decay = intensity;
    return best;
  }

  // ---------------------------------------------------------------- projectiles, particles, beams, explosions
  const seenFlash = new WeakSet(), seenProj = new WeakMap();
  const fireballs = [];
  function drawFx(g, dt, t, cam) {
    // fade dynamic lights
    for (const l of lightPool) { l.intensity = Math.max(0, l.intensity - dt * (l.userData.decay || 1) * 5); }
    // flashes become fireballs and lights
    for (const f of g.flashes) {
      if (seenFlash.has(f)) continue; seenFlash.add(f);
      const h = X.h(f.x, f.y);
      if (f.r > 40) {
        takeLight(f.x, h + 25, f.y, f.col, Math.min(6, f.r / 25), f.r * 4);
        fireballs.push({ x: f.x, y: h, z: f.y, r: Math.min(70, f.r * 0.32), t: 0, T: 0.45 + f.r / 600, col: f.col, ring: f.r > 90 });
      } else if (Math.hypot(f.x - cam.x, f.y - cam.z) > 40) takeLight(f.x, h + 20, f.y, '#ffd8a0', 1.2, 120);
    }
    // fireballs use the sprite pool
    let si = 0;
    for (let i = fireballs.length - 1; i >= 0; i--) {
      const fb = fireballs[i]; fb.t += dt; const k = fb.t / fb.T;
      if (k >= 1) { fireballs.splice(i, 1); continue; }
      for (let j = 0; j < 3 && si < spritePool.length; j++) {
        const s = spritePool[si++]; s.visible = true; s.material.blending = T.AdditiveBlending;
        s.material.color.set(j === 0 ? '#ffd890' : j === 1 ? '#ff8a30' : '#c04a10'); s.material.opacity = (1 - k) * (1 - k) * (j === 0 ? 0.9 : 0.6);
        const sz = fb.r * (0.6 + k * 1.2) * (j === 0 ? 0.7 : 1 + j * 0.25);
        s.scale.set(sz * 2, sz * 2, 1); s.position.set(fb.x + (j - 1) * fb.r * 0.3, fb.y + fb.r * 0.8 + k * fb.r * 0.8, fb.z);
      }
    }
    // smoke and gas areas
    for (const a of g.areas) {
      if (a.kind === 'fire') continue;
      const k = Math.min(1, a.t / 1.5), n = a.kind === 'smoke' ? 5 : 4;
      for (let j = 0; j < n && si < spritePool.length; j++) {
        const s = spritePool[si++]; s.visible = true; s.material.blending = T.NormalBlending;
        s.material.color.set(a.kind === 'smoke' ? '#c8c8c4' : '#a8c050'); s.material.opacity = (a.kind === 'smoke' ? 0.55 : 0.32) * k;
        const ang = j / n * TAU + t * 0.1 + a.x, rr = a.r * 0.45;
        s.position.set(a.x + Math.cos(ang) * rr, X.h(a.x, a.y) + 30 + (j % 2) * 25, a.y + Math.sin(ang) * rr);
        s.scale.set(a.r * 1.6, a.r * 1.1, 1);
      }
    }
    for (; si < spritePool.length; si++) spritePool[si].visible = false;

    // particles from the simulation
    const pa = parts.geometry.attributes, ga = glowPts.geometry.attributes;
    let pn = 0, gn = 0;
    for (const p of g.parts) {
      if (p.h == null) { p.h = p.kind === 'smoke' ? 4 + Math.random() * 10 : p.kind === 'flame' ? 3 + Math.random() * 8 : 6 + Math.random() * 18; p.h0 = X.h(p.x, p.y); }
      const age = p.T - p.life, k = p.life / p.T;
      let y = p.h0 + p.h;
      if (p.kind === 'smoke') y += age * 28; else if (p.kind === 'flame') y += age * 45; else if (!p.glow) y = Math.max(p.h0, y + age * 40 - age * age * 160);
      else y += age * 10;
      const c = parseCol(p.col);
      if (p.glow || p.kind === 'flame') {
        if (gn >= glowPts.userData.n) continue;
        ga.position.array[gn * 3] = p.x; ga.position.array[gn * 3 + 1] = y; ga.position.array[gn * 3 + 2] = p.y;
        ga.size.array[gn] = Math.max(1.5, p.size) * (p.kind === 'flame' ? 3.2 : 2.6);
        ga.col.array.set([c[0], c[1], c[2], c[3] * k], gn * 4); gn++;
      } else {
        if (pn >= parts.userData.n) continue;
        pa.position.array[pn * 3] = p.x; pa.position.array[pn * 3 + 1] = y; pa.position.array[pn * 3 + 2] = p.y;
        pa.size.array[pn] = Math.max(1, p.size) * (p.kind === 'smoke' ? 3.2 : 1.6);
        pa.col.array.set([c[0], c[1], c[2], c[3] * (p.kind === 'smoke' ? k * 0.85 : Math.min(1, k * 1.5))], pn * 4); pn++;
      }
    }
    for (const [geo, n] of [[parts.geometry, pn], [glowPts.geometry, gn]]) { geo.setDrawRange(0, n); for (const k2 of ['position', 'size', 'col']) geo.attributes[k2].needsUpdate = true; }

    // projectiles
    let ti = 0, oi = 0;
    const P = g.player;
    for (const p of g.projs) {
      let info = seenProj.get(p);
      if (!info) {
        info = { h0: 26, slope: 0 };
        const o = p.owner;
        if (o && o.isPlayer) { info.h0 = cam.y - 6; info.slope = Math.tan(cam.pitch); if (P.veh && P.veh.vt === 'buggy') { info.h0 = X.h(p.x, p.y) + 30; info.slope = 0; } }
        else if (o && o.kind === 'diver') info.h0 = X.h(o.x, o.y) + 28;
        else if (o && o.kind === 'sentry') info.h0 = X.h(o.x, o.y) + 16;
        else if (o && o.kind === 'enemy') {
          const m = X.models.enemies.get(o.id);
          info.h0 = (o.def.flying ? (m && m.body ? m.body.position.y : 60) : o.r * 1.4) + X.h(o.x, o.y);
          if (o.def.draw === 'tripod') info.h0 = 100 * o.r / 40;
          const tg = o.target && (o.target.veh || o.target); info.dist = tg ? Math.hypot(tg.x - o.x, tg.y - o.y) : 400;
          if (m) m.recoil = 1;
        } else if (o && o.hp != null) info.h0 = 40;
        seenProj.set(p, info);
      }
      const ground = X.h(p.x, p.y);
      let y;
      if (p.lob) { const k = p.t / p.T; y = U.lerp(info.h0, ground, k) + Math.sin(k * Math.PI) * (100 + Math.hypot(p.tx - p.sx, p.ty - p.sy) * 0.25); }
      else if (p.team === 'e') y = U.lerp(info.h0, ground + 24, Math.min(1, p.traveled / Math.max(60, info.dist || 400)));
      else y = U.clamp(info.h0 + p.traveled * info.slope, ground + 2, ground + 220);
      if (p.kind === 'bullet' && ti < tracerPool.length) {
        const m = tracerPool[ti++]; m.visible = true;
        const a = Math.atan2(p.vy, p.vx), L = p.rail ? 120 : p.team === 'e' ? 26 : 40;
        m.position.set(p.x - Math.cos(a) * L / 2, y, p.y - Math.sin(a) * L / 2);
        m.rotation.set(0, -a, Math.atan(info.slope) * (p.team === 'd' ? 1 : 0));
        m.scale.set(L, p.rail ? 2.4 : 1.1, p.rail ? 2.4 : 1.1);
        m.material.color.set(p.col || '#ffe9a8');
      } else if (oi < orbPool.length) {
        const m = orbPool[oi++]; m.visible = true;
        const r = p.lob ? 5 : p.kind === 'rocket' ? (p.big ? 7 : 3.5) : 4.5;
        m.position.set(p.x, y, p.y); m.scale.setScalar(r);
        m.material.color.set(p.acid ? '#b6ef4a' : p.col || '#ffb07a');
        if (p.kind === 'rocket' && Math.random() < 0.7) g.parts.length < 1400 && g.parts.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.5, T: 0.5, size: 3, col: 'rgba(200,190,180,0.45)', drag: 2, grow: 6, kind: 'smoke', h: y - X.h(p.x, p.y), h0: X.h(p.x, p.y) });
      }
    }
    // thrown objects
    while (throwMeshes.length < g.throws.length) { const m = new T.Mesh(MD.GEO.sphLo, MD.mat('#4a5240', { m: 0.5 })); m.castShadow = true; dyn.add(m); throwMeshes.push(m); }
    throwMeshes.forEach((m, i) => { const o = g.throws[i]; m.visible = !!o; if (!o) return; m.position.set(o.x, X.h(o.x, o.y) + 3 + (o.z || 0) * 2.2, o.y); m.scale.set(o.kind === 'beacon' ? 2 : 2.4, o.kind === 'beacon' ? 6 : 2.4, o.kind === 'beacon' ? 2 : 2.4); m.material = o.kind === 'beacon' ? MD.mat(Math.floor(t * 8) % 2 ? '#ff5a3a' : '#5ab4ff', { e: '#ff2a1a', ei: 1 }) : MD.mat(o.def.thermite ? '#cfcfcf' : o.def.fire ? '#c85a2a' : o.def.stun ? '#6fb6ff' : o.def.smoke ? '#9a9a9a' : o.def.gas ? '#a8c84a' : '#4a5240', { m: 0.5 }); });
    // beams
    let bi = 0;
    const beam = (x1, y1, z1, x2, y2, z2, col, w) => {
      if (bi >= beamPool.length) return;
      const m = beamPool[bi++]; m.visible = true;
      V.set(x1, y1, z1); V2.set(x2, y2, z2); const len = V.distanceTo(V2);
      m.position.copy(V).lerp(V2, 0.5); m.scale.set(len, w, w);
      m.lookAt(V2); m.rotateY(-Math.PI / 2);
      m.material.color.set(col);
    };
    const eyeMuzzle = () => { camera.getWorldDirection(V); const r = new T.Vector3().crossVectors(V, camera.up).normalize(); return [cam.x + V.x * 45 + r.x * 6, cam.y - 6 + V.y * 45, cam.z + V.z * 45 + r.z * 6]; };
    for (const b of g.beams) {
      const vertical = Math.abs(b.x1 - b.x2) <= 320 && (b.y2 - b.y1) >= 800;
      const col = b.col && b.col.startsWith('rgba') ? '#d3c8ff' : (b.col || '#ffffff');
      if (vertical) { const gh = X.h(b.x2, b.y2); beam(b.x2, gh + 1200, b.y2, b.x2, gh, b.y2, col, b.w * 2.2); continue; }
      const fromPlayer = Math.hypot(b.x1 - P.x, b.y1 - P.y) < 30 && P.alive && !P.veh;
      const h1 = fromPlayer ? null : X.h(b.x1, b.y1) + (b.arc ? 22 : 24), h2 = X.h(b.x2, b.y2) + 18;
      let s = fromPlayer ? eyeMuzzle() : [b.x1, h1, b.y1];
      // enemy beams (tripods) start at the core
      const src = g.enemies.find(e => e.beamT > 0 && Math.hypot(e.x - b.x1, e.y - b.y1) < 5);
      if (src) s = [b.x1, 95 * src.r / 40 + X.h(b.x1, b.y1), b.y1];
      if (b.arc) {
        let px = s[0], py = s[1], pz = s[2];
        for (let k = 1; k <= 5; k++) { const f = k / 5; const nx = U.lerp(s[0], b.x2, f) + (k < 5 ? U.rand(-8, 8) : 0), ny = U.lerp(s[1], h2, f) + (k < 5 ? U.rand(-8, 8) : 0), nz = U.lerp(s[2], b.y2, f) + (k < 5 ? U.rand(-8, 8) : 0); beam(px, py, pz, nx, ny, nz, '#bff0ff', 1.4); px = nx; py = ny; pz = nz; }
      } else beam(s[0], s[1], s[2], b.x2, fromPlayer ? Math.max(h2, s[1] + Math.tan(cam.pitch) * Math.hypot(b.x2 - s[0], b.y2 - s[2])) : h2, b.y2, col, fromPlayer ? 0.7 * b.w : Math.max(1, b.w * 0.8));
    }
    // orbital lasers
    for (const L of g.lasers) { const gh = X.h(L.x, L.y); beam(L.x, gh + 1500, L.y, L.x, gh, L.y, '#ff5a40', 14); beam(L.x, gh + 1500, L.y, L.x, gh, L.y, '#fff0e0', 4); if (oi < orbPool.length) { const m = orbPool[oi++]; m.visible = true; m.position.set(L.x, gh + 6, L.y); m.scale.setScalar(26 + Math.random() * 8); m.material.color.set('#ff8a5a'); } takeLight(L.x, gh + 30, L.y, '#ff6a4a', 4, 400); }
    // beacons: tall columns of light
    for (const b of g.beacons) { const gh = X.h(b.x, b.y); beam(b.x, gh, b.y, b.x, gh + 700, b.y, b.col, 3); if (oi < orbPool.length) { const m = orbPool[oi++]; m.visible = true; m.position.set(b.x, gh + 3, b.y); m.scale.setScalar(4 + Math.sin(t * 12) * 1.5); m.material.color.set(b.col); } }
    // fire tornadoes
    for (const tn of g.tornadoes) { const gh = X.h(tn.x, tn.y); for (let k = 0; k < 5; k++) beam(tn.x + Math.cos(t * 6 + k) * (8 + k * 6), gh, tn.y + Math.sin(t * 6 + k) * (8 + k * 6), tn.x + Math.cos(t * 6 + k + 2) * (20 + k * 10), gh + 160 + k * 30, tn.y + Math.sin(t * 6 + k + 2) * (20 + k * 10), k % 2 ? '#ff7a2a' : '#ffcf5a', 6); takeLight(tn.x, gh + 60, tn.y, '#ff7a2a', 3, 300); }
    // rifts
    if (g.rifts) for (const r of g.rifts) { const gh = X.h(r.x, r.y); if (oi < orbPool.length) { const m = orbPool[oi++]; m.visible = true; m.position.set(r.x, gh + 40, r.y); m.scale.set(50 * Math.min(1, r.t), 60 * Math.min(1, r.t), 6); m.material.color.set('#a890ff'); } takeLight(r.x, gh + 40, r.y, '#a890ff', 2.5, 300); }
    // spikes from burrowers
    if (g.spikes) for (const s of g.spikes) { const gh = X.h(s.x, s.y); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; beam(s.x, gh, s.y, s.x + Math.cos(a) * 14, gh + 40 * s.t / 0.6, s.y + Math.sin(a) * 14, '#8a4a5a', 3); } }
    // fire areas glow
    for (const a of g.areas) if (a.kind === 'fire' && oi < orbPool.length) { const m = orbPool[oi++]; m.visible = true; m.position.set(a.x, X.h(a.x, a.y) + 2, a.y); m.scale.set(a.r, 3, a.r); m.material.color.set('#ff6a20'); }
    // fireball shockwave rings and telegraphs
    let ri = 0;
    for (const tg of g.telegraphs) if (ri < ringPool.length) { const m = ringPool[ri++]; m.visible = true; m.position.set(tg.x, X.h(tg.x, tg.y) + 1.5, tg.y); m.scale.setScalar(tg.r); m.material.color.set(tg.col.indexOf('170,230') > 0 ? '#aae646' : tg.col.indexOf('150,210') > 0 ? '#96d2ff' : '#ff5a3a'); m.material.opacity = 0.35 + Math.sin(t * 10) * 0.15; }
    for (const fb of fireballs) if (fb.ring && ri < ringPool.length) { const m = ringPool[ri++]; m.visible = true; const k = fb.t / fb.T; m.position.set(fb.x, fb.y + 2, fb.z); m.scale.setScalar(fb.r * (1 + k * 5)); m.material.color.set('#ffe0b0'); m.material.opacity = 0.6 * (1 - k); }
    // mines
    while (mineMeshes.length < g.mines.length) { const m = new T.Mesh(MD.GEO.disc, MD.mat('#4a4a3c', { m: 0.5 })); dyn.add(m); mineMeshes.push(m); }
    mineMeshes.forEach((m, i) => { const mi = g.mines[i]; m.visible = !!(mi && mi.alive); if (!m.visible) return; m.position.set(mi.x, X.h(mi.x, mi.y) + 0.8, mi.y); m.scale.set(mi.type === 'at' ? 6 : 4, 8, mi.type === 'at' ? 6 : 4); if (oi < orbPool.length && mi.armed && Math.sin(t * 8 + mi.x) > 0) { const o = orbPool[oi++]; o.visible = true; o.position.set(mi.x, m.position.y + 1.5, mi.y); o.scale.setScalar(1.2); o.material.color.set('#ff3a2a'); } });
    for (; ti < tracerPool.length; ti++) tracerPool[ti].visible = false;
    for (; oi < orbPool.length; oi++) orbPool[oi].visible = false;
    for (; bi < beamPool.length; bi++) beamPool[bi].visible = false;
    for (; ri < ringPool.length; ri++) ringPool[ri].visible = false;
  }

  function updateWeather(g, dt, cam) {
    const w = weather, a = w.obj.geometry.attributes.position.array;
    const storm = g.storm || 0, wind = w.kind === 'sand' ? 500 * storm + 60 : w.kind === 'snow' ? 40 + 400 * storm : 30;
    const fall = w.kind === 'rain' ? 900 : w.kind === 'snow' ? 70 : w.kind === 'sand' ? 30 : 25;
    const active = w.kind === 'sand' ? storm > 0.05 : true;
    w.obj.visible = active;
    for (let i = 0; i < w.n; i++) {
      const s = w.seeds[i];
      s[0] += wind * dt * (0.6 + s[3] * 0.8); s[1] -= fall * dt * (0.7 + s[3] * 0.6); s[2] += (w.kind === 'motes' ? Math.sin(g.t + i) * 10 : wind * 0.3) * dt;
      if (s[1] < -40) s[1] += 300; if (s[0] > 400) s[0] -= 800; if (s[0] < -400) s[0] += 800; if (s[2] > 400) s[2] -= 800; if (s[2] < -400) s[2] += 800;
      const x = cam.x + s[0], y = cam.y + s[1] - 60, z = cam.z + s[2];
      if (w.kind === 'rain') { a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = z; a[i * 6 + 3] = x - 2; a[i * 6 + 4] = y + 16; a[i * 6 + 5] = z; }
      else { a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z; }
    }
    w.obj.geometry.attributes.position.needsUpdate = true;
  }

  // world -> screen for the HUD
  X.project = function (x, y, z) {
    V.set(x, y, z).project(camera);
    const w = window.innerWidth, h = window.innerHeight;
    return { x: (V.x + 1) / 2 * w, y: (1 - V.y) / 2 * h, behind: V.z > 1 };
  };

  // ---------------------------------------------------------------- thumbnails and previews for the hub
  let thumbR = null, thumbScene = null, thumbCam = null;
  function thumbSetup() {
    if (thumbR) return;
    const c = document.createElement('canvas');
    thumbR = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
    
    thumbScene = new T.Scene();
    thumbScene.add(new T.HemisphereLight('#dfe8ff', '#3a3226', 0.7));
    const d = new T.DirectionalLight('#fff2dc', 1.2); d.position.set(80, 140, 120); thumbScene.add(d);
    const r = new T.DirectionalLight('#8fb0ff', 0.8); r.position.set(-120, 60, -80); thumbScene.add(r);
    thumbCam = new T.PerspectiveCamera(30, 1, 1, 5000);
  }
  function frameModel(root, yaw) {
    root.rotation.y = yaw; root.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(root), size = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
    const r = Math.max(size.x, size.y, size.z) * 0.95;
    thumbCam.position.set(ctr.x + r * 1.1, ctr.y + r * 1.05, ctr.z + r * 1.4); thumbCam.lookAt(ctr);
  }
  X.thumb = function (root, w, h, yaw) {
    thumbSetup(); thumbR.setSize(w, h, false); thumbCam.aspect = w / h; thumbCam.updateProjectionMatrix();
    thumbScene.add(root); frameModel(root, yaw ?? -2.4); thumbR.render(thumbScene, thumbCam); thumbScene.remove(root);
    return thumbR.domElement.toDataURL('image/png');
  };
  // a live turntable on a given 2D canvas
  X.turntable = function (canvas, makeModel) {
    thumbSetup();
    const m = makeModel(); let alive = true, a = -2.2;
    const ctx = canvas.getContext('2d');
    const loop = () => {
      if (!alive || !canvas.isConnected) return;
      thumbR.setSize(canvas.width, canvas.height, false); thumbCam.aspect = canvas.width / canvas.height; thumbCam.updateProjectionMatrix();
      a += 0.01; thumbScene.add(m.root);
      if (m.update) m.update({ vx: 0, vy: 0, proneT: 0, diveT: 0, pack: null }, 1 / 60, performance.now() / 1000, { near: true });
      frameModel(m.root, a); m.root.rotation.y = a;
      thumbR.render(thumbScene, thumbCam); thumbScene.remove(m.root);
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(thumbR.domElement, 0, 0);
      requestAnimationFrame(loop);
    };
    loop();
    return () => { alive = false; };
  };
})();
