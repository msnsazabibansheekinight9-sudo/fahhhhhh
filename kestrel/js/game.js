// Kestrel — core: renderer + post, player, collision, doors, lockers, interaction, combat, physics props,
// throwables, power, saving, death and map transitions.
(function () {
  const K = window.K, S = K.S, WT = K.WT;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const tv = [V(), V(), V(), V()];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const G = K.G = {
    time: 0, paused: true, started: false, mapName: null, keys: {}, mouse: { dx: 0, dy: 0, l: false, r: false, lp: false }, noises: [], creatures: [], items: [], projectiles: [], casings: [],
    settings: { sens: 1, vol: .8, quality: 'high', fov: 74, invert: false, bob: true },
    stats: { kills: 0, saves: 0, deaths: 0, time: 0 },
    aggro: 1, safeAreas: new Set(), playerInSafe: false, lockerThreat: 0, stalkerAware: 0, flags: {},
  };
  try { const s = JSON.parse(localStorage.getItem('kestrel.settings') || 'null'); if (s) Object.assign(G.settings, s); } catch (e) { }
  G.saveSettings = () => { try { localStorage.setItem('kestrel.settings', JSON.stringify(G.settings)); } catch (e) { } };

  // ======================================================================= setup
  G.init = function () {
    const R = G.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    R.setPixelRatio(1); R.autoClear = false;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('view').appendChild(R.domElement);
    G.scene = new THREE.Scene(); G.scene.background = new THREE.Color(0);
    G.scene.fog = new THREE.FogExp2(0x010203, .058);
    G.cam = new THREE.PerspectiveCamera(G.settings.fov, 1, .04, 1500); G.cam.rotation.order = 'YXZ';
    G.scene.add(G.cam);
    G.makeEnv(); G.makeSky(); G.makePost();
    // flashlight on the shoulder
    const fl = G.flash = new THREE.SpotLight(0xfff0d8, 0, 30, .5, .55, 1.4);
    fl.castShadow = true; fl.shadow.mapSize.set(1024, 1024); fl.shadow.camera.near = .2; fl.shadow.camera.far = 30; fl.shadow.bias = -.0004; fl.shadow.normalBias = .02;
    G.scene.add(fl); G.scene.add(fl.target);
    // dynamic fixture lights (flicker + specular) and throwable lights
    G.pool = []; for (let k = 0; k < 3; k++) { const l = new THREE.PointLight(0xffffff, 0, 8, 2); G.scene.add(l); G.pool.push(l); }
    G.flareLights = []; for (let k = 0; k < 2; k++) { const l = new THREE.PointLight(0xff3020, 0, 14, 1.6); G.scene.add(l); G.flareLights.push(l); }
    G.amb = new THREE.HemisphereLight(0x8090a0, 0x201810, .02); G.scene.add(G.amb);
    G.audio = new K.Audio(); G.audio.occlude = (x, z) => G.L ? !G.L.los(G.player.x, G.player.z, x, z) : false;
    G.fx = new K.FX(G.scene, G);
    G.vm = new K.ViewModel(G); K.__previewVM = G.vm;
    G.player = G.makePlayer();
    G.bindInput();
    K.UI.init(G);
    window.addEventListener('resize', G.resize); G.resize();
    G.applyQuality();
    requestAnimationFrame(G.loop);
  };
  G.applyQuality = function () {
    const q = G.settings.quality;
    G.pixelScale = q === 'low' ? .6 : q === 'medium' ? .8 : 1;
    G.flash.castShadow = q !== 'low';
    G.renderer.shadowMap.enabled = q !== 'low';
    G.resize();
  };
  G.resize = function () {
    const w = innerWidth, h = innerHeight, pr = Math.min(devicePixelRatio || 1, 1.5) * (G.pixelScale || 1);
    G.renderer.setSize(w, h); G.renderer.setPixelRatio(pr);
    G.cam.aspect = w / h; G.cam.updateProjectionMatrix();
    const rw = Math.floor(w * pr), rh = Math.floor(h * pr);
    if (G.rt) G.rt.setSize(rw, rh);
    if (G.post) G.post.mat.uniforms.res.value.set(rw, rh);
    if (G.W && G.W.haloMat) G.W.haloMat.uniforms.scale.value = rh * .9;
    for (const p of [G.fx.spark, G.fx.fire, G.fx.smoke, G.fx.blood]) p.pts.material.uniforms.scale.value = rh * 1.1;
  };
  G.makeEnv = function () {
    // reflection probe: dim industrial room with bright strips
    const es = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 10), new THREE.MeshBasicMaterial({ color: 0x0d0e10, side: THREE.BackSide })); es.add(room);
    for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(.3, .1, 6), new THREE.MeshBasicMaterial({ color: k % 2 ? 0x8899aa : 0xffe8c8 })); s.position.set(-3 + k * 2, 2.4, 0); es.add(s); }
    const red = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), new THREE.MeshBasicMaterial({ color: 0xff2010 })); red.position.set(4.8, 1.5, 2); es.add(red);
    const pm = new THREE.PMREMGenerator(G.renderer);
    G.envMap = pm.fromScene(es, .04).texture; pm.dispose();
  };
  G.makeSky = function () {
    const sky = G.sky = new THREE.Group(); G.scene.add(sky);
    const c = K.canvas(2048, 1024), x = c.getContext('2d'), r = K.rng(99);
    x.fillStyle = '#000002'; x.fillRect(0, 0, 2048, 1024);
    // milky band + nebula
    for (let i = 0; i < 300; i++) { const px = r() * 2048, py = 512 + Math.sin(px / 2048 * K.TAU) * 220 + (r() - .5) * 200; const g = x.createRadialGradient(px, py, 0, px, py, 30 + r() * 80); g.addColorStop(0, `rgba(${60 + r() * 60},${50 + r() * 40},${90 + r() * 80},.05)`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - 120, py - 120, 240, 240); }
    for (let i = 0; i < 9000; i++) { const b = Math.pow(r(), 6); x.fillStyle = `rgba(${200 + r() * 55},${200 + r() * 55},${220 + r() * 35},${.2 + b * .8})`; const s = b > .6 ? 2 : 1; x.fillRect(r() * 2048, r() * 1024, s, s); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    const stars = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.add(stars);
    // gas giant Tethys IV with banding, storms and a hard terminator
    const pc = K.canvas(1024, 512), px = pc.getContext('2d');
    for (let y = 0; y < 512; y++) { const v = Math.sin(y * .05) * .5 + Math.sin(y * .13 + 2) * .3 + Math.sin(y * .31) * .2; const cr = 150 + v * 50, cg = 120 + v * 40, cb = 90 + v * 30; px.fillStyle = `rgb(${cr | 0},${cg | 0},${cb | 0})`; px.fillRect(0, y, 1024, 1); }
    for (let i = 0; i < 400; i++) { px.fillStyle = `rgba(${r() > .5 ? '230,200,160' : '80,50,30'},.08)`; px.beginPath(); px.ellipse(r() * 1024, r() * 512, 20 + r() * 120, 2 + r() * 6, 0, 0, K.TAU); px.fill(); }
    px.fillStyle = 'rgba(160,70,40,.7)'; px.beginPath(); px.ellipse(620, 300, 60, 26, 0, 0, K.TAU); px.fill();
    const pt = new THREE.CanvasTexture(pc); pt.encoding = THREE.sRGBEncoding;
    const pmat = new THREE.ShaderMaterial({
      uniforms: { map: { value: pt }, sun: { value: V(-.6, .3, .5).normalize() } }, fog: false,
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: 'uniform sampler2D map; uniform vec3 sun; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vec3 c=texture2D(map,vUv).rgb; c=pow(c,vec3(2.2)); float d=max(dot(vN,sun),0.0); float rim=pow(1.0-max(dot(vN,vV),0.0),3.0); vec3 col=c*d*1.6 + vec3(.9,.6,.35)*rim*d*1.2 + c*0.005; gl_FragColor=vec4(col,1.0); }',
    });
    const planet = new THREE.Mesh(new THREE.SphereGeometry(320, 64, 32), pmat); planet.position.set(380, -260, -560); planet.rotation.z = .3; sky.add(planet);
    const ring = new THREE.Mesh(new THREE.RingGeometry(380, 560, 96), new THREE.MeshBasicMaterial({ color: 0x6a5a48, transparent: true, opacity: .25, side: THREE.DoubleSide, fog: false, depthWrite: false }));
    ring.position.copy(planet.position); ring.rotation.set(1.2, .2, .3); sky.add(ring);
    const sunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.glowTex(), color: 0xfff0d0, fog: false, blending: THREE.AdditiveBlending, depthWrite: false })); sunS.position.set(-540, 270, 450); sunS.scale.setScalar(120); sky.add(sunS);
    sky.traverse(o => { o.renderOrder = -1; });
  };
  G.makePost = function () {
    const isW2 = G.renderer.capabilities.isWebGL2;
    G.rt = new THREE.WebGLRenderTarget(4, 4, { type: isW2 ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true });
    const mat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: G.rt.texture }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) }, hurt: { value: 0 }, low: { value: 0 }, black: { value: 0 }, white: { value: 0 }, exposure: { value: .82 }, ab: { value: .0015 }, grain: { value: .07 }, fear: { value: 0 }, red: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float time, hurt, low, black, white, exposure, ab, grain, fear, red; uniform vec2 res; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
        void main(){
          vec2 uv = vUv; vec2 cc = uv - .5; float r2 = dot(cc,cc);
          uv = .5 + cc * (1.0 - .035 * r2);                       // slight lens barrel
          float a = ab * (1.0 + r2 * 8.0 + fear * 3.0 + hurt * 4.0);
          vec3 col; col.r = texture2D(tDiffuse, uv + cc * a).r; col.g = texture2D(tDiffuse, uv).g; col.b = texture2D(tDiffuse, uv - cc * a).b;
          col *= exposure;
          col = aces(col);
          col = pow(col, vec3(1.0/2.2));
          float lum = dot(col, vec3(.299,.587,.114));
          col = mix(col, vec3(lum), low * .7);                   // drained colour at low health
          col = mix(col, col * vec3(1.15, .92, .82), .25);        // warm retro grade
          col.r += red * .35 * (1.0 - r2);
          float vig = smoothstep(.85, .2, r2 * (1.0 + fear * .8 + hurt));
          col *= mix(.25, 1.0, vig);
          col = mix(col, vec3(.35,0,0), hurt * (1.0 - vig) * .9);
          float n = h(uv * res + fract(time * 13.7)) - .5;
          col += n * grain * (1.0 + low);
          col *= .97 + .03 * sin(uv.y * res.y * 1.5 + time * 30.0);   // faint scanlines
          col = mix(col, vec3(1.0), white); col *= 1.0 - black;
          gl_FragColor = vec4(col, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    G.post = { scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mat };
    G.post.scene.add(q);
  };

  // ======================================================================= player
  G.makePlayer = () => ({ x: 0, z: 0, y: 1.62, yaw: 0, pitch: 0, vx: 0, vz: 0, speed: 0, crouch: false, crouchA: 0, sprinting: false, moving: false, stamina: 1, exhausted: false, hp: 100, flashOn: true, battery: 1,
    locker: null, lockerT: 0, lockerExit: false, holdingBreath: false, breath: 1, dead: false, stepT: 0, hurtT: 0, holding: null, throwSel: 'flare', bobT: 0, shake: 0 });
  G.inv0 = () => ({ weapons: ['jack'], mag: { revolver: 0, shotgun: 0, flamer: 0, pulse: 0 }, ammo: { rounds: 0, shells: 0, fuel: 0, cells: 0 }, items: { medkit: 0, gel: 0, cloth: 0, scrap: 0, chem: 0, battery: 0, flare: 1, noise: 0, bomb: 0 }, tracker: false, keys: {}, logs: [] });
  G.ammo = t => G.inv.ammo[t] || 0;
  G.useAmmo = (t, n) => { const got = Math.min(n, G.inv.ammo[t] || 0); G.inv.ammo[t] -= got; return got; };

  // ======================================================================= input
  G.bindInput = function () {
    const cv = G.renderer.domElement;
    addEventListener('keydown', e => {
      if (e.repeat && !['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) { if (e.code === 'Tab') e.preventDefault(); return; }
      G.keys[e.code] = true;
      if (e.code === 'Tab') e.preventDefault();
      if (!G.started) return;
      if (K.UI.onKey(e)) return;
      if (G.paused || G.player.dead) return;
      G.onPress(e.code);
    });
    addEventListener('keyup', e => { G.keys[e.code] = false; if (e.code === 'KeyF' && G.vm) { } });
    cv.addEventListener('mousedown', e => {
      G.audio.init();
      if (!G.started || G.paused) return;
      if (!G.locked && !G.touch) { G.lock(); G.dragging = true; }
      if (e.button === 0) { G.mouse.l = true; G.mouse.lp = true; }
      if (e.button === 2) G.mouse.r = true;
      if (e.button === 1) { G.keys.Mid = true; e.preventDefault(); }
    });
    addEventListener('mouseup', e => { G.dragging = false; if (e.button === 0) G.mouse.l = false; if (e.button === 2) G.mouse.r = false; if (e.button === 1) G.keys.Mid = false; });
    addEventListener('mousemove', e => {
      if (!G.started || G.paused) return;
      const mx = e.movementX || 0, my = e.movementY || 0;
      if (Math.abs(mx) > 400 || Math.abs(my) > 400) return; // pointer-lock spikes
      if (G.locked || (G.dragging && e.buttons)) { G.mouse.dx += mx; G.mouse.dy += my; }
    });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('wheel', e => { if (G.started && !G.paused) G.cycleWeapon(Math.sign(e.deltaY)); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      G.locked = document.pointerLockElement === cv;
      if (!G.locked && G.started && !G.paused && !G.player.dead && !K.UI.modal && !G.touch && !G.noLockPause) K.UI.pause(true);
    });
    G.dragLook = true;
  };
  G.lock = function () { try { const p = G.renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } };
  G.onPress = function (code) {
    const P = G.player;
    if (code === 'KeyE') G.interact();
    else if (code === 'KeyR') G.vm.reload();
    else if (code === 'KeyF') { if (!P.locker) { P.flashOn = !P.flashOn; G.audio.click(); } }
    else if (code === 'KeyC') P.crouch = !P.crouch;
    else if (code === 'KeyG') G.throwItem();
    else if (code === 'KeyZ') G.cycleThrowable();
    else if (code === 'KeyQ') G.useItem('medkit');
    else if (code === 'KeyV') G.vm.inspect();
    else if (code === 'KeyX') G.useItem('battery');
    else if (/^Digit[1-5]$/.test(code)) { const w = ['jack', 'revolver', 'shotgun', 'flamer', 'pulse'][+code.slice(5) - 1]; if (G.inv.weapons.includes(w)) G.vm.select(w); }
  };
  G.cycleWeapon = function (d) { const ws = ['jack', 'revolver', 'shotgun', 'flamer', 'pulse'].filter(w => G.inv.weapons.includes(w)); const i = ws.indexOf(G.vm.next && G.vm.state === 'holster' ? G.vm.next : G.vm.cur); G.vm.select(ws[(i + d + ws.length) % ws.length]); };
  G.cycleThrowable = function () { const t = ['flare', 'noise', 'bomb']; const P = G.player; for (let k = 1; k <= 3; k++) { const n = t[(t.indexOf(P.throwSel) + k) % 3]; if (G.inv.items[n] > 0 || k === 3) { P.throwSel = n; break; } } G.audio.beep(660, .03); };

  // ======================================================================= map loading
  G.newGame = function () {
    const seed = (Date.now() % 100000) | 0;
    G.run = { seed, deaths: 0 }; G.inv = G.inv0(); G.stats = { kills: 0, saves: 0, deaths: 0, time: 0 }; G.flags = {};
    G.player = G.makePlayer();
    G.loadMap('station', seed, null);
  };
  G.loadMap = function (name, seed, state, done) {
    K.UI.loading(true, 'GENERATING ' + K.MAPINFO[name].title);
    G.paused = true;
    const steps = [
      ['Laying out decks', () => { G.unloadMap(); G.mapName = name; G.mapSeed = seed; G.L = K.genLevel(K.levelConfigs[name](seed)); }],
      ['Fabricating surfaces', () => { if (!G.T) G.T = K.makeTextures(); G.M = K.makeMaterials(G.T, G.L.theme, G.envMap); K.initPropMats(G.M, G.T); }],
      ['Building interiors', () => { G.W = K.buildWorld(G.L, G.M); G.scene.add(G.W.root); }],
      ['Spawning', () => { G.setupMap(name, state); }],
      ['Baking light', () => { G.W.bakeAll(); G.resize(); }],
    ];
    let i = 0;
    const next = () => {
      if (i >= steps.length) { K.UI.loading(false); G.started = true; G.paused = false; K.UI.pause(false); G.onArrive(state); if (done) done(); return; }
      const [label, fn] = steps[i++]; K.UI.loading(true, label.toUpperCase() + '…');
      setTimeout(() => { try { fn(); } catch (e) { console.error(e); K.UI.loading(true, 'ERROR: ' + e.message); return; } next(); }, 30);
    };
    next();
  };
  G.unloadMap = function () {
    if (!G.W) return;
    G.scene.remove(G.W.root);
    G.W.root.traverse(o => { if (o.geometry && o.geometry !== K.prim.box && !o.geometry.__shared) o.geometry.dispose(); });
    for (const c of G.creatures) G.scene.remove(c.root);
    for (const it of G.items) if (it.mesh) G.scene.remove(it.mesh);
    for (const p of G.projectiles) G.scene.remove(p.obj);
    G.creatures = []; G.items = []; G.projectiles = []; G.W = null; G.L = null;
  };
  G.setupMap = function (name, state) {
    const L = G.L, W = G.W, info = K.MAPINFO[name];
    G.info = info;
    G.safeAreas = new Set(L.saveRooms.map(r => r.id));
    G.explored = new Uint8Array(L.W * L.H);
    G.progress = 0; G.flags.launch = false; G.flags.destructT = 0;
    if (state && state.map === name) { G.progress = state.progress; G.flags = Object.assign({}, state.flags); if (state.explored) { const b = atob(state.explored); for (let k = 0; k < b.length && k < G.explored.length; k++) G.explored[k] = b.charCodeAt(k); } }
    W.poweredLevel = name === 'cruiser' ? (G.progress >= 1 ? 3 : -1) : (G.progress >= 1 ? 3 : 0);
    // population
    const pop = K.populate(G, L, W, name);
    const taken = new Set(state && state.map === name ? state.taken : []), killed = new Set(state && state.map === name ? state.killed : []);
    for (const it of pop.items) {
      if (taken.has(it.id)) continue;
      const m = K.itemModel(it.type, G.envMap, info); m.position.set(it.x, it.y, it.z); m.rotation.y = Math.random() * 6;
      const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.glowTex(), color: it.type.startsWith('key') ? 0x88aaff : 0xfff2c8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .6 }));
      glint.scale.setScalar(.25); glint.position.y = .12; m.add(glint); it.glint = glint;
      it.mesh = m; G.scene.add(m); G.items.push(it);
    }
    for (const e of pop.enemies) {
      if (killed.has(e.id)) continue;
      const c = e.kind === 'husk' ? new K.Husk(G, e.x, e.z, e.seed) : new K.Crawler(G, e.x, e.z, e.seed);
      c.id = e.id; c.h = Math.random() * 6; G.scene.add(c.root); G.creatures.push(c);
    }
    G.stalker = new K.Stalker(G, L.vents[0].x, L.vents[0].z); G.stalker.id = 'stalker'; G.scene.add(G.stalker.root); G.creatures.push(G.stalker);
    G.stalker.timer = G.progress >= 1 ? 40 : 1e9; // dormant until the player restores power (or wanders long enough)
    // key objects: lever, goal console, shuttle, airlock vents
    G.levers = [];
    const kr = L.keyRooms[1];
    G.makeLever(kr.cx * S + 2.6, kr.cy * S, name === 'station' ? 'Pull the main breaker (restore power)' : 'Engage reactor restart');
    const gr = L.goalRoom;
    G.makeConsole(gr.cx * S, gr.cy * S, name === 'station' ? 'dock' : 'bridge');
    if (L.shuttleRoom) G.makeShuttle(L.shuttleRoom);
    for (const rm of L.rooms) if (rm.type === 'airlock') G.makeAirlock(rm);
    // player start
    const P = G.player;
    if (state && state.map === name && state.pos) { P.x = state.pos[0]; P.z = state.pos[1]; P.yaw = state.pos[2]; P.hp = state.hp; }
    else { const st = L.startRoom, sp = G.freeSpot(st); P.x = sp[0]; P.z = sp[1]; P.yaw = Math.atan2(-(st.cx * S - P.x), -(st.cy * S - P.z)) || 0; }
    P.pitch = 0; P.dead = false; P.locker = null; P.vx = P.vz = 0; P.holding = null;
    for (const d of L.doors) { d.locked = !G.canOpen(d); d.open = 0; d.target = 0; }
    G.updateDoorVisuals(true);
    G.vm.select(G.inv.weapons.includes(G.vm.cur) ? G.vm.cur : 'jack', true);
  };
  G.onArrive = function (state) {
    const L = G.L;
    if (!state || state.fresh) {
      K.UI.title(G.info.title, G.info.sub);
      if (G.mapName === 'station') K.UI.msg('You wake on a gurney. The station is silent. Something is breathing in the ceiling.', 7);
      else K.UI.msg('The umbilical seals behind you. The Calliope is dark and cold, and you are not alone aboard.', 7);
      G.autosave();
    }
    K.UI.objective();
  };
  // a clear spot inside a room (no props within 0.6m), nearest the centre
  G.freeSpot = function (rm) {
    let best = null, bd = 1e9;
    for (let j = rm.y; j < rm.y + rm.h; j++) for (let i = rm.x; i < rm.x + rm.w; i++) for (const [ox, oz] of [[.5, .5], [.25, .25], [.75, .25], [.25, .75], [.75, .75]]) {
      const x = (i + ox) * S, z = (j + oz) * S, r = G.collide(x, z, .6, true);
      if (Math.hypot(r[0] - x, r[1] - z) > .01) continue;
      const d = Math.hypot(x - rm.cx * S, z - rm.cy * S); if (d < bd) { bd = d; best = [x, z]; }
    }
    return best || [rm.cx * S, rm.cy * S];
  };
  G.canOpen = d => d.req === 0 || (d.req === 4 ? G.flags.launch : G.progress >= d.req);

  // ======================================================================= interactive set pieces
  G.makeLever = function (x, z, label) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const m = G.M;
    const add = (geo, mat, px, py, pz, sx, sy, sz) => { const o = new THREE.Mesh(geo, mat); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.castShadow = o.receiveShadow = true; g.add(o); G.W.bakeTargets.push(o); return o; };
    add(K.prim.box, m.dark, 0, .55, 0, .9, 1.1, .6); add(K.prim.box, m.hazard, 0, 1.12, 0, .95, .06, .65); add(K.prim.box, m.plastic, 0, .7, .31, .7, .5, .02);
    const piv = new THREE.Group(); piv.position.set(0, 1.15, 0); g.add(piv);
    const arm = new THREE.Mesh(K.prim.cyl, m.metal); arm.scale.set(.06, .7, .06); arm.position.y = .35; piv.add(arm); G.W.bakeTargets.push(arm);
    const knob = new THREE.Mesh(K.prim.sph, m.red); knob.scale.setScalar(.14); knob.position.y = .72; piv.add(knob); G.W.bakeTargets.push(knob);
    piv.rotation.x = G.progress >= 1 ? 1 : -.9;
    const lamp = new THREE.Mesh(K.prim.box, new THREE.MeshBasicMaterial({ color: G.progress >= 1 ? 0x33ff66 : 0xff3322 })); lamp.scale.set(.1, .1, .02); lamp.position.set(.3, .9, .32); g.add(lamp);
    G.scene.add(g); G.W.root.add(g);
    G.W.ctx.addCollider(x - .45, z - .3, x + .45, z + .3, 1.1);
    const lv = { g, piv, lamp, pulled: G.progress >= 1, t: 0 };
    G.levers.push(lv);
    G.W.interacts.push({ x, y: 1.3, z, kind: 'lever', lever: lv, label, cond: () => !lv.pulled });
  };
  G.makeConsole = function (x, z, kind) {
    const g = new THREE.Group(); g.position.set(x, 0, z); const m = G.M;
    const add = (geo, mat, px, py, pz, sx, sy, sz, rx = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.x = rx; o.castShadow = o.receiveShadow = true; g.add(o); if (mat.onBeforeCompile) G.W.bakeTargets.push(o); return o; };
    add(K.prim.box, m.dark, 0, .5, 0, 1.6, 1, .9); add(K.prim.box, m.plastic, 0, 1.05, .1, 1.6, .08, .8, -.4);
    const scr = new THREE.MeshBasicMaterial({ map: K.screenTex(kind === 'dock' ? ['DOCKING UMBILICAL C', 'VESSEL: ISV CALLIOPE', 'SEAL ......... OK', 'PRESSURE ..... OK', '', '> BOARD VESSEL'] : kind === 'bridge' ? ['ISV CALLIOPE COMMAND', 'AUTH: CAPT. RUIZ', '', 'SELF DESTRUCT: SAFE', 'SHUTTLE: LOCKED', '> ARM / RELEASE'] : ['SHUTTLE LAUNCH', 'BAY DOORS ... READY', 'FUEL ........ 92%', '', '', '> LAUNCH'], 'amber', 5) });
    add(K.prim.plane, scr, 0, 1.11, .16, 1.1, .5, 1, -1.97);
    G.W.root.add(g);
    G.W.ctx.addCollider(x - .8, z - .45, x + .8, z + .45, 1.2);
    const labels = { dock: 'Board the ISV Calliope', bridge: 'Arm self-destruct and release the shuttle bay' };
    G.W.interacts.push({ x, y: 1.2, z: z + .5, kind: 'goal', goal: kind, label: labels[kind], cond: () => kind !== 'bridge' || !G.flags.launch });
  };
  G.makeShuttle = function (rm) {
    const x = rm.cx * S, z = rm.cy * S, m = G.M, g = new THREE.Group(); g.position.set(x, 0, z);
    const add = (geo, mat, px, py, pz, sx, sy, sz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; g.add(o); if (mat.onBeforeCompile) G.W.bakeTargets.push(o); return o; };
    add(K.prim.box, m.white, 0, 1.4, 0, 2.6, 1.8, 5.4); add(K.prim.box, m.white, 0, 1.2, -3.1, 2.2, 1.4, 1.2, .3); add(K.prim.box, m.glass, 0, 1.6, -3.3, 2.0, .6, .9, .5);
    add(K.prim.box, m.dark, 0, .25, 0, 2.8, .3, 5); for (const s of [-1, 1]) { add(K.prim.box, m.white, s * 2.2, 1.1, .8, 2, .15, 2.4, 0, 0, s * .1); add(K.prim.cyl, m.dark, s * .8, 1.3, 2.9, .8, .6, .8, Math.PI / 2); }
    add(K.prim.box, m.hazard, 0, 2.35, 0, 2.62, .1, 5.42); add(K.prim.box, m.orange, 1.31, 1.4, .5, .02, 1.6, 1.2);
    for (const s of [-1, 1]) for (const zz of [-1.8, 1.8]) add(K.prim.cyl, m.metal, s * 1.1, .2, zz, .12, .4, .12);
    G.W.root.add(g);
    G.W.ctx.addCollider(x - 1.4, z - 3.8, x + 1.4, z + 3, 2.4);
    G.W.interacts.push({ x: x + 1.5, y: 1.3, z: z + .5, kind: 'shuttle', label: 'Launch the shuttle', cond: () => true });
  };
  G.makeAirlock = function (rm) {
    // emergency vent console just inside the door
    const ds = G.L.doors.filter(d => d.a1 === rm.id || d.a2 === rm.id); if (!ds.length) return;
    const d = ds[0], inside = G.L.area[d.c1] === rm.id ? d.c1 : d.c2, [x, z] = G.L.cellCenter(inside);
    const al = { rm, door: d, t: -1, x, z };
    G.W.interacts.push({ x, y: 1.3, z, kind: 'airlock', airlock: al, label: 'EMERGENCY VENT (4 s delay — get out!)', cond: () => al.t < 0 });
    (G.airlocks || (G.airlocks = [])).push(al);
  };

  // ======================================================================= main loop
  let last = performance.now();
  G.loop = function (now) {
    requestAnimationFrame(G.loop);
    let dt = Math.min(.05, (now - last) / 1000); last = now;
    if (G.manual) return; // test harness drives frames itself
    if (G.fixedDt) dt = G.fixedDt;
    G.frame(dt);
  };
  G.frame = function (dt) {
    if (!G.started || !G.W) { G.render(); return; }
    if (!G.paused) {
      G.time += dt; G.stats.time += dt;
      G.updatePlayer(dt);
      G.updateDoors(dt);
      G.updateCreatures(dt);
      G.updateProps(dt);
      G.updateWorldFX(dt);
      G.updatePower(dt);
      G.updateEvents(dt);
      G.fx.update(dt);
      G.noises = G.noises.filter(n => (n.t += dt) < .25);
    }
    G.updateCamera(dt);
    K.UI.update(dt);
    G.render();
    G.mouse.dx = 0; G.mouse.dy = 0; G.mouse.lp = false;
  };
  G.render = function () {
    const R = G.renderer;
    if (!G.started) { R.setRenderTarget(null); R.setClearColor(0); R.clear(); return; }
    R.setRenderTarget(G.rt); R.setClearColor(0); R.clear();
    R.render(G.scene, G.cam);
    R.clearDepth();
    if (!G.player.dead || G.deathKind !== 'stalker') G.vm.render(R, G.cam.aspect);
    R.setRenderTarget(null); R.clear();
    const u = G.post.mat.uniforms; u.time.value = G.time;
    R.render(G.post.scene, G.post.cam);
  };

  // ======================================================================= player update
  G.noise = (x, z, r, src) => G.noises.push({ x, z, r, src, t: 0 });
  G.updatePlayer = function (dt) {
    const P = G.player, k = G.keys, L = G.L;
    if (P.dead) { G.updateDeath(dt); return; }
    const sens = .0022 * G.settings.sens;
    P.yaw -= G.mouse.dx * sens; P.pitch -= G.mouse.dy * sens * (G.settings.invert ? -1 : 1);
    P.pitch = K.clamp(P.pitch, -1.45, 1.45);
    if (P.locker) { G.updateLocker(dt); return; }
    // movement
    let fx = 0, fz = 0;
    if (k.KeyW || k.ArrowUp) fz -= 1; if (k.KeyS || k.ArrowDown) fz += 1; if (k.KeyA || k.ArrowLeft) fx -= 1; if (k.KeyD || k.ArrowRight) fx += 1;
    if (G.touchMove) { fx += G.touchMove[0]; fz += G.touchMove[1]; }
    const len = Math.hypot(fx, fz); if (len > 1) { fx /= len; fz /= len; }
    const crouchHeld = k.ControlLeft || k.ControlRight;
    const crouch = P.crouch || crouchHeld;
    const wantSprint = (k.ShiftLeft || k.ShiftRight || G.touchSprint) && fz < 0 && !crouch && !P.exhausted && G.vm.adsA < .3;
    P.sprinting = wantSprint && len > .1;
    if (P.sprinting) { P.stamina -= dt / 6.5; if (P.stamina <= 0) { P.stamina = 0; P.exhausted = true; G.audio.breath('gasp'); } }
    else { P.stamina = Math.min(1, P.stamina + dt / (P.moving ? 9 : 5)); if (P.exhausted && P.stamina > .35) P.exhausted = false; }
    const hurtSlow = P.hp < 25 ? .82 : 1;
    const maxS = (P.sprinting ? 5.0 : crouch ? 1.35 : 2.55) * hurtSlow * (P.holding ? .8 : 1) * (1 - G.vm.adsA * .35);
    const c = Math.cos(P.yaw), s = Math.sin(P.yaw);
    const wx = fx * c + fz * s, wz = -fx * s + fz * c;
    const acc = len > .1 ? 10 : 12;
    P.vx = K.damp(P.vx, wx * maxS, acc, dt); P.vz = K.damp(P.vz, wz * maxS, acc, dt);
    const nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
    const r = G.collide(nx, nz, .3, false);
    P.vx = (r[0] - P.x) / dt; P.vz = (r[1] - P.z) / dt;
    P.x = r[0]; P.z = r[1];
    P.speed = Math.hypot(P.vx, P.vz); P.moving = P.speed > .3;
    P.crouchA = K.damp(P.crouchA, crouch ? 1 : 0, 10, dt);
    // footsteps -> sound + noise
    if (P.moving) {
      P.stepT += dt * (P.sprinting ? 2.6 : crouch ? 1.2 : 1.9);
      if (P.stepT >= 1) { P.stepT -= 1; const loud = P.sprinting ? 1 : crouch ? .25 : .55; G.audio.step(P.x, P.z, loud, 'player'); if (!crouch) G.noise(P.x, P.z, P.sprinting ? 13 : 5, 'player'); }
    }
    P.bobT += dt * (P.moving ? (P.sprinting ? 13 : crouch ? 6 : 9.5) : 0);
    // flashlight battery
    if (P.flashOn) { P.battery = Math.max(0, P.battery - dt / 420); if (P.battery <= 0) P.flashOn = false; }
    P.hurtT = Math.max(0, P.hurtT - dt);
    if (P.hp < 100 && P.hp > 0 && G.time - (P.lastHit || -99) > 6 && P.hp < 30) P.hp = Math.min(30, P.hp + dt * .4); // slow recovery to "caution"
    // weapons
    const ads = G.mouse.r || G.touchAds;
    const trackerHeld = (k.KeyT || k.Tab || k.Mid || G.touchTracker) && G.inv.tracker;
    G.trackerOn = trackerHeld;
    if (P.holding) { G.updateHolding(dt); G.vm.update(dt, { ads: false, tracker: trackerHeld, dx: G.mouse.dx, dy: G.mouse.dy }); }
    else {
      G.vm.update(dt, { ads, tracker: trackerHeld, dx: G.mouse.dx, dy: G.mouse.dy });
      G.vm.trigger(G.mouse.l || G.touchFire, G.mouse.lp || G.touchFireP);
    }
    G.touchFireP = false;
    // exploration & safe-room state
    const cell = L.cellOf(P.x, P.z);
    if (cell >= 0) {
      const a = L.area[cell], area = L.areas[a];
      G.curArea = area;
      G.playerInSafe = G.safeAreas.has(a);
      if (area.isRoom) { if (!G.explored[cell]) for (const cc of area.cells) G.explored[cc] = 1; }
      else { const ci = cell % L.W, cj = (cell / L.W) | 0; for (let j = cj - 2; j <= cj + 2; j++) for (let i = ci - 2; i <= ci + 2; i++) { const c2 = j * L.W + i; if (c2 >= 0 && c2 < G.explored.length && L.kind[c2]) G.explored[c2] = 1; } }
    }
  };
  G.updateLocker = function (dt) {
    const P = G.player, lk = P.locker;
    P.lockerT += dt;
    const k = G.keys;
    // enter / exit animations drive door + camera
    if (P.lockerExit) {
      const t = P.lockerT;
      lk.target = t < .5 ? 1.4 : 0;
      const e = K.ease.inOut(K.clamp((t - .1) / .5, 0, 1));
      P.x = K.lerp(lk.x, lk.frontX, e * .7); P.z = K.lerp(lk.z, lk.frontZ, e * .7);
      if (t > .7) { P.locker = null; P.lockerExit = false; P.x = K.lerp(lk.x, lk.frontX, .7); P.z = K.lerp(lk.z, lk.frontZ, .7); lk.target = 0; }
    } else {
      const t = P.lockerT;
      lk.target = t < .45 ? 1.4 : 0;
      const e = K.ease.inOut(K.clamp(t / .5, 0, 1));
      P.x = K.lerp(P.ex, lk.x, e); P.z = K.lerp(P.ez, lk.z, e);
      P.yaw = P.yawEnter + K.angDiff(P.yawEnter, lk.yaw) * e + (t > .5 ? K.clamp(K.angDiff(lk.yaw, P.yaw), -.6, .6) * 0 : 0);
      if (t > .5) { // look limits through the slats
        const d = K.angDiff(lk.yaw, P.yaw); P.yaw = lk.yaw + K.clamp(d, -.55, .55); P.pitch = K.clamp(P.pitch, -.45, .3);
      }
      // hold breath
      const want = (k.Space || G.mouse.r || G.touchBreath) && P.breath > 0;
      if (want && !P.holdingBreath) G.audio.breath('hold');
      if (!want && P.holdingBreath) G.audio.breath(P.breath < .15 ? 'gasp' : 'out');
      P.holdingBreath = want;
      if (want) { P.breath -= dt / 6; if (P.breath <= 0) { P.breath = 0; P.holdingBreath = false; G.audio.breath('gasp'); G.noise(P.x, P.z, 6, 'player'); } }
      else P.breath = Math.min(1, P.breath + dt / 5);
    }
    G.vm.update(dt, { ads: false, tracker: false, dx: G.mouse.dx, dy: G.mouse.dy });
    G.lockerThreat = Math.max(0, G.lockerThreat - dt * .5);
  };

  // ======================================================================= collision
  G.collide = function (x, z, r, creature) {
    const L = G.L;
    for (let it = 0; it < 3; it++) {
      const ci = Math.floor(x / S), cj = Math.floor(z / S);
      for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
        if (i < 0 || j < 0 || i >= L.W || j >= L.H) continue;
        const c = j * L.W + i;
        // east and south edges of this cell
        for (let o = 0; o < 2; o++) {
          const e = o === 0 ? L.eE[c] : L.eS[c]; if (!e) continue;
          if (o === 0) { const ex = (i + 1) * S; if (e >= 3 && L.doors[e - 3].open > .85) { [x, z] = pushBox(x, z, r, ex - WT, j * S - WT, ex + WT, j * S + (S - K.DW) / 2); [x, z] = pushBox(x, z, r, ex - WT, j * S + (S + K.DW) / 2, ex + WT, (j + 1) * S + WT); } else[x, z] = pushBox(x, z, r, ex - WT, j * S - WT, ex + WT, (j + 1) * S + WT); }
          else { const ez = (j + 1) * S; if (e >= 3 && L.doors[e - 3].open > .85) { [x, z] = pushBox(x, z, r, i * S - WT, ez - WT, i * S + (S - K.DW) / 2, ez + WT); [x, z] = pushBox(x, z, r, i * S + (S + K.DW) / 2, ez - WT, (i + 1) * S + WT, ez + WT); } else[x, z] = pushBox(x, z, r, i * S - WT, ez - WT, (i + 1) * S + WT, ez + WT); }
        }
        const cols = G.W.colliders.get(c);
        if (cols) for (const b of cols) [x, z] = pushBox(x, z, r, b.x0, b.z0, b.x1, b.z1);
      }
    }
    if (!creature) for (const cr of G.creatures) { if (!cr.alive || !cr.root.visible || cr.state === 'vent') continue; const dx = x - cr.x, dz = z - cr.z, d = Math.hypot(dx, dz), m = r + cr.radius; if (d < m && d > 1e-4) { x = cr.x + dx / d * m; z = cr.z + dz / d * m; } }
    return [x, z];
  };
  function pushBox(x, z, r, x0, z0, x1, z1) {
    const cx = K.clamp(x, x0, x1), cz = K.clamp(z, z0, z1), dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return [x, z];
    if (d2 < 1e-9) { // centre inside: push out along the shallowest axis
      const l = x - x0, rr = x1 - x, t = z - z0, b = z1 - z, m = Math.min(l, rr, t, b);
      if (m === l) return [x0 - r, z]; if (m === rr) return [x1 + r, z]; if (m === t) return [x, z0 - r]; return [x, z1 + r];
    }
    const d = Math.sqrt(d2); return [cx + dx / d * r, cz + dz / d * r];
  }

  // ======================================================================= doors
  G.updateDoors = function (dt) {
    const P = G.player, L = G.L;
    for (const d of L.doors) {
      const dpx = d.x - P.x, dpz = d.z - P.z; if (dpx * dpx + dpz * dpz > 900) { const st = G.stalker, nearS = st && st.state !== 'vent' && !d.locked && Math.hypot(d.x - st.x, d.z - st.z) < 2.2; d.open = d.target = nearS ? 1 : 0; continue; }
      if (d.locked && G.canOpen(d)) { d.locked = false; G.updateDoorVisual(d); }
      let want = 0;
      if (!d.locked) {
        if (dpx * dpx + dpz * dpz < 2.4 * 2.4 && !P.dead) want = 1;
        else for (const c of G.creatures) { if (!c.alive || c.state === 'vent' || !c.root.visible) continue; const a = d.x - c.x, b = d.z - c.z; if (a * a + b * b < 2.2 * 2.2) { want = 1; break; } }
      }
      if (want !== d.target) { d.target = want; G.audio.door(d.x, d.z, want, d.bulk); if (want) G.noise(d.x, d.z, 4, 'door'); }
      const sp = d.bulk ? 1.4 : 2.4;
      d.open = K.clamp(d.open + Math.sign(d.target - d.open) * dt * sp, 0, 1);
      const o = K.ease.inOut(d.open) * (K.DW / 2 - .02);
      d.panels[0].position.x = -(K.DW / 4 + .005) - o; d.panels[1].position.x = (K.DW / 4 + .005) + o;
    }
    for (const lk of G.W.lockers) { lk.open = K.damp(lk.open, lk.target, 12, dt); lk.pivot.rotation.y = lk.rot - lk.open; }
  };
  G.updateDoorVisual = function (d) {
    const col = d.locked ? (d.req === 1 ? 0xffaa22 : d.req === 2 ? (G.mapName === 'station' ? 0x3a7bd5 : 0xd0a030) : d.req === 3 ? (G.mapName === 'station' ? 0xff2a1a : 0xf0f0ff) : 0xff2a1a) : 0x33ff66;
    for (const m of d.lights) m.color.setHex(col);
  };
  G.updateDoorVisuals = function () { for (const d of G.L.doors) G.updateDoorVisual(d); };

  // ======================================================================= interaction
  G.findInteract = function () {
    const P = G.player; if (P.dead) return null;
    if (P.locker) return { label: 'Leave locker', kind: 'leaveLocker' };
    if (P.holding) return { label: 'Drop', kind: 'drop' };
    const eye = tv[0].set(P.x, P.y, P.z), fwd = G.camFwd;
    let best = null, bs = 1e9;
    const consider = (o, x, y, z, range, label) => {
      const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z, d = Math.hypot(dx, dy, dz);
      if (d > range) return;
      const dot = (dx * fwd.x + dy * fwd.y + dz * fwd.z) / d;
      if (dot < (d < .9 ? .3 : .82)) return;
      const score = d * (2 - dot);
      if (score < bs && G.L.los(P.x, P.z, x, z, false)) { bs = score; best = Object.assign({ label }, o); }
    };
    for (const it of G.items) if (!it.taken) consider({ kind: 'item', item: it }, it.x, it.y + .05, it.z, 2.1, G.itemLabel(it));
    for (const ia of G.W.interacts) if (!ia.cond || ia.cond()) consider(ia, ia.x, ia.y, ia.z, 2.2, ia.label);
    for (const p of G.W.phys) if (p.def.mass <= 6 && !p.broken) consider({ kind: 'phys', phys: p }, p.obj.position.x, p.obj.position.y + p.def.h / 2, p.obj.position.z, 1.8, 'Pick up');
    if (!best) {
      // locked door message
      for (const d of G.L.doors) if (d.locked) { const dist = Math.hypot(d.x - P.x, d.z - P.z); if (dist < 2) { const dot = ((d.x - P.x) * fwd.x + (d.z - P.z) * fwd.z) / dist; if (dot > .5) return { kind: 'door', door: d, label: G.info.lockMsg[d.req] }; } }
    }
    return best;
  };
  G.itemLabel = it => { const def = K.ITEMS[it.type]; if (it.type.startsWith('key')) return 'Take ' + G.info.cards[+it.type[3]].name; if (it.type === 'log') return 'Read: ' + it.log[0]; return 'Take ' + def.name + (it.count > 1 ? ' (' + it.count + ')' : ''); };
  G.interact = function () {
    const ia = G.findInteract(); const P = G.player; if (!ia) return;
    switch (ia.kind) {
      case 'item': G.pickup(ia.item); break;
      case 'locker': G.enterLocker(ia.locker); break;
      case 'leaveLocker': if (!P.lockerExit && P.lockerT > .6) { P.lockerExit = true; P.lockerT = 0; P.holdingBreath = false; G.audio.mech('open'); } break;
      case 'save': G.save(true); break;
      case 'lever': G.pullLever(ia.lever); break;
      case 'goal': G.goal(ia.goal); break;
      case 'shuttle': if (G.flags.launch) G.ending(); break;
      case 'airlock': G.ventAirlock(ia.airlock); break;
      case 'phys': P.holding = ia.phys; ia.phys.rest = false; ia.phys.held = true; G.audio.clank(P.x, 1, P.z, .3); break;
      case 'drop': G.dropHeld(0); break;
      case 'door': G.audio.denied(ia.door.x, ia.door.z); K.UI.msg(G.info.lockMsg[ia.door.req], 3); break;
    }
  };
  G.pickup = function (it) {
    const inv = G.inv, t = it.type, def = K.ITEMS[t];
    if (def.cat === 'weapon') { if (!inv.weapons.includes(t)) { inv.weapons.push(t); const d = K.WEAPONS[t]; inv.mag[t] = d.mag ? Math.min(d.mag, t === 'flamer' ? 60 : d.mag) : 0; G.vm.select(t); } else inv.ammo[K.WEAPONS[t].ammo] += Math.ceil(K.WEAPONS[t].mag / 2); K.UI.msg('Acquired: ' + def.name + '  —  ' + def.desc, 5); G.audio.stinger('key'); }
    else if (def.cat === 'ammo') { inv.ammo[t] = Math.min(def.stack, inv.ammo[t] + it.count); K.UI.msg(`+${it.count} ${def.name}`, 2); G.audio.stinger('item'); }
    else if (t === 'tracker') { inv.tracker = true; K.UI.msg('Motion tracker acquired. Hold T (or Tab / middle mouse) to raise it. It beeps — things can hear it.', 7); G.audio.stinger('key'); }
    else if (t.startsWith('key')) { const lv = +t[3]; inv.keys[lv] = true; G.setProgress(Math.max(G.progress, lv)); K.UI.msg('Acquired: ' + G.info.cards[lv].name, 4); G.audio.stinger('key'); }
    else if (t === 'log') { inv.logs.push(it.log); K.UI.showLog(it.log); G.audio.beep(1200, .04); }
    else { if ((inv.items[t] || 0) >= def.stack) { K.UI.msg('Can\'t carry more ' + def.name, 2); return; } inv.items[t] = (inv.items[t] || 0) + it.count; K.UI.msg(`+${it.count} ${def.name}`, 2); G.audio.stinger('item'); }
    it.taken = true; G.scene.remove(it.mesh);
    G.takenIds = G.takenIds || []; G.takenIds.push(it.id);
  };
  G.enterLocker = function (lk) {
    const P = G.player;
    if (G.vm.flame) G.vm.setFlame(false);
    P.locker = lk; P.lockerT = 0; P.lockerExit = false; P.ex = P.x; P.ez = P.z; P.yawEnter = P.yaw; P.breath = Math.max(P.breath, .3);
    G.audio.mech('open'); G.audio.thud(lk.x, 1, lk.z, .25);
    if (G.trackerOn) G.noise(P.x, P.z, 4, 'player');
  };
  G.pullLever = function (lv) {
    if (lv.pulled) return; lv.pulled = true; lv.t = 0;
    G.audio.thud(lv.g.position.x, 1, lv.g.position.z, 1); G.audio.stinger('power');
    G.setProgress(Math.max(G.progress, 1));
    G.startPowerUp(lv.g.position.x, lv.g.position.z);
    lv.lamp.material.color.setHex(0x33ff66);
    K.UI.msg(G.mapName === 'station' ? 'Breakers engage across the rings. Lights flood the corridors… and something in the vents starts moving.' : 'The reactor roars to life. Every light on the ship comes on at once. Everything aboard knows where you are.', 7);
    G.noise(lv.g.position.x, lv.g.position.z, 40, 'alarm');
    G.audio.alarm(lv.g.position.x, lv.g.position.z, 8);
    // the hunt begins
    G.stalker.timer = Math.min(G.stalker.timer, 14);
  };
  G.setProgress = function (p) {
    if (p <= G.progress) return;
    G.progress = p; G.aggro = 1 + p * .2;
    for (const d of G.L.doors) if (d.locked && G.canOpen(d)) { d.locked = false; G.updateDoorVisual(d); }
    K.UI.objective(true); G.audio.stinger('objective');
  };
  G.goal = function (kind) {
    if (kind === 'dock') {
      K.UI.msg('Umbilical cycling…', 3);
      G.audio.alarm(G.player.x, G.player.z, 3);
      G.transition('cruiser');
    } else if (kind === 'bridge') {
      G.flags.launch = true; G.flags.destructT = 300; G.aggro = 2.5;
      for (const d of G.L.doors) if (d.locked && G.canOpen(d)) { d.locked = false; G.updateDoorVisual(d); }
      G.audio.alarm(G.player.x, G.player.z, 14); G.audio.stinger('spotted');
      K.UI.msg('SELF-DESTRUCT ARMED. Shuttle bay released. Five minutes. RUN.', 7); K.UI.objective(true);
      G.stalker.timer = Math.min(G.stalker.timer, 6);
      if (G.stalker.state !== 'vent' && G.stalker.state !== 'hunt') { G.stalker.state = 'hunt'; G.stalker.lastSeen = [G.player.x, G.player.z]; }
    }
  };
  G.transition = function (name) {
    G.paused = true;
    K.UI.fade(1, 1.2, () => {
      const seed = G.run.seed + 1;
      const keepW = G.inv;
      G.inv.keys = {};
      G.loadMap(name, seed, { fresh: true }, () => { K.UI.fade(0, 1.5); });
    });
  };
  G.ventAirlock = function (al) {
    al.t = 0;
    G.audio.alarm(al.x, al.z, 9); G.noise(al.x, al.z, 30, 'alarm');
    K.UI.msg('Emergency vent in 4 seconds. Get clear of the airlock!', 3);
  };

  // ======================================================================= combat
  const hs = { o: V(), d: V() };
  G.camFwd = V(0, 0, -1); G.camRight = V(1, 0, 0);
  G.hitscan = function (o, d, maxD) {
    const L = G.L; let t = maxD, type = 'none', obj = null, part = null, n = [0, 1, 0];
    const h = Math.hypot(d.x, d.z);
    if (h > 1e-4) { const tw = L.rayWall(o.x, o.z, d.x, d.z, maxD); if (tw < t) { t = Math.max(0, tw - WT / Math.max(.05, Math.abs(L.rayN[0] ? d.x : d.z))); type = 'wall'; n = [L.rayN[0], 0, L.rayN[1]]; obj = L.rayHit; } }
    const a = L.areaAt(o.x, o.z), ceil = a >= 0 ? L.areas[a].height : 3;
    if (d.y < -1e-4) { const tf = -o.y / d.y; if (tf < t) { t = tf; type = 'floor'; n = [0, 1, 0]; } }
    if (d.y > 1e-4) { const tc = (ceil - o.y) / d.y; if (tc < t) { t = tc; type = 'ceil'; n = [0, -1, 0]; } }
    const ray = (x, y, z, r) => { const ox = o.x - x, oy = o.y - y, oz = o.z - z, b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - c; if (disc < 0) return -1; const tt = -b - Math.sqrt(disc); return tt > 0 ? tt : -1; };
    for (const c of G.creatures) {
      if (!c.alive || !c.root.visible || Math.hypot(c.x - o.x, c.z - o.z) > t + 2) continue;
      for (const s of c.hitSpheres()) { const tt = ray(s.x, s.y, s.z, s.r); if (tt > 0 && tt < t) { t = tt; type = 'creature'; obj = c; part = s.part; } }
    }
    for (const p of G.W.phys) { if (p.held || p.broken) continue; const pp = p.obj.position; if (Math.abs(pp.x - o.x) > t + 1 || Math.abs(pp.z - o.z) > t + 1) continue; const tt = ray(pp.x, pp.y + p.def.h / 2, pp.z, Math.max(.12, p.def.r)); if (tt > 0 && tt < t) { t = tt; type = 'phys'; obj = p; } }
    // light fixtures can be shot out
    const list = G.W.fixHash.get(L.cellOf(o.x + d.x * Math.min(t, 6), o.z + d.z * Math.min(t, 6)));
    if (list) for (const id of list) { const f = G.W.fixtures[id]; if (f.broken || (f.kind !== 'main' && f.kind !== 'emerg')) continue; const tt = ray(f.x, f.y, f.z, .32); if (tt > 0 && tt < t) { t = tt; type = 'light'; obj = f; } }
    return { t, type, obj, part, n, x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t };
  };
  G.fireWeapon = function (id, def, ads) {
    const P = G.player, o = tv[1].set(P.x, P.y, P.z);
    G.noise(P.x, P.z, def.noise, 'player');
    G.fx.flash(P.x + G.camFwd.x * .8, P.y, P.z + G.camFwd.z * .8, 0xffb060, id === 'shotgun' ? 10 : 6, .06, 9);
    const n = def.pellets || 1;
    const spread = def.spread * (ads > .5 ? (id === 'shotgun' ? .7 : .2) : 1) * (P.moving ? 1.6 : 1) * (P.crouch ? .8 : 1);
    for (let k = 0; k < n; k++) {
      const d = tv[2].copy(G.camFwd);
      const a = Math.random() * K.TAU, m = Math.sqrt(Math.random()) * spread;
      d.addScaledVector(G.camRight, Math.cos(a) * m).addScaledVector(G.camUp, Math.sin(a) * m).normalize();
      const h = G.hitscan(o, d, 80);
      G.applyHit(h, d, def.dmg, id);
    }
    P.pitch += (def.recoil ? def.recoil[1] : 0) * .06 * (ads > .5 ? .6 : 1); P.yaw += (Math.random() - .5) * .01;
    P.shake = Math.min(1, P.shake + (id === 'shotgun' ? .5 : .25));
  };
  G.applyHit = function (h, d, dmg, src) {
    const fx = G.fx;
    if (h.type === 'creature') {
      const c = h.obj, kind = c.kind === 'stalker' ? 'acid' : c.kind === 'crawler' ? 'pale' : 'red';
      c.hurt(dmg, 'bullet', h.x, h.z, h.part);
      fx.bloodHit(h.x, h.y, h.z, d.x, d.z, kind, 12);
      G.audio.impact(h.x, h.y, h.z, 'flesh');
      // spatter on the wall behind
      const h2 = G.hitscan(tv[3].set(h.x, h.y, h.z), d, 2.5); if (h2.type === 'wall' || h2.type === 'floor') fx.decal(h2.x, h2.y, h2.z, h2.n[0], h2.n[1], h2.n[2], kind === 'acid' ? 'acid' : 'blood', .15);
      K.UI.hitmark(c.alive === false);
    } else if (h.type === 'phys') {
      const p = h.obj; p.vx += d.x * 4 / p.def.mass * 3; p.vy += 2 / p.def.mass * 3; p.vz += d.z * 4 / p.def.mass * 3; p.rest = false; p.spin = 10;
      fx.sparks(h.x, h.y, h.z, -d.x, .3, -d.z, 6); G.audio.clank(h.x, h.y, h.z, .8);
      if (p.def.explosive) { p.hp -= dmg; if (p.hp <= 0) G.explode(p); }
      if (p.def.breaks) G.breakProp(p);
    } else if (h.type === 'light') {
      G.breakLight(h.obj);
    } else if (h.type !== 'none') {
      fx.sparks(h.x, h.y, h.z, h.n[0], h.n[1], h.n[2], 8); fx.decal(h.x, h.y, h.z, h.n[0], h.n[1], h.n[2], 'hole', .09);
      G.audio.impact(h.x, h.y, h.z, 'metal');
    }
  };
  G.melee = function (dmg) {
    const P = G.player, o = tv[1].set(P.x, P.y - .1, P.z);
    let best = null, bd = 2.0;
    for (const c of G.creatures) { if (!c.alive || !c.root.visible) continue; const dx = c.x - P.x, dz = c.z - P.z, d = Math.hypot(dx, dz); if (d < bd && (dx * G.camFwd.x + dz * G.camFwd.z) / d > .5) { bd = d; best = c; } }
    if (best) { best.hurt(dmg, 'melee', P.x, P.z, 'body'); if (best.kind === 'husk') best.stagger = 1; G.audio.gun('meleeHit'); G.fx.bloodHit(best.x, 1.2, best.z, G.camFwd.x, G.camFwd.z, best.kind === 'stalker' ? 'acid' : 'red', 10); P.shake = .4; G.noise(P.x, P.z, 5, 'player'); K.UI.hitmark(!best.alive); return; }
    const h = G.hitscan(o, G.camFwd, 1.9);
    if (h.type === 'phys') { const p = h.obj; p.vx += G.camFwd.x * 6 / p.def.mass * 2; p.vz += G.camFwd.z * 6 / p.def.mass * 2; p.vy += 2; p.rest = false; G.audio.clank(h.x, h.y, h.z, 1); G.noise(P.x, P.z, 8, 'player'); if (p.def.breaks) G.breakProp(p); }
    else if (h.type === 'light') G.breakLight(h.obj);
    else if (h.t < 1.9) { G.fx.sparks(h.x, h.y, h.z, h.n[0], h.n[1], h.n[2], 10); G.audio.clank(h.x, h.y, h.z, 1.2); G.noise(P.x, P.z, 9, 'player'); P.shake = .25; }
  };
  G.fireFlame = function (dt) {
    const P = G.player;
    G.inv.mag.flamer = Math.max(0, G.inv.mag.flamer - dt * 9);
    const o = tv[1].set(P.x, P.y - .12, P.z).addScaledVector(G.camRight, .14).addScaledVector(G.camFwd, .55);
    const d = G.camFwd;
    for (let k = 0; k < 2; k++) G.fx.flame(o.x, o.y, o.z, d.x, d.y, d.z, 9);
    G.fx.flash(o.x + d.x * 2, o.y, o.z + d.z * 2, 0xff7a30, 4, .1, 9);
    G.flameNoiseT = (G.flameNoiseT || 0) - dt; if (G.flameNoiseT <= 0) { G.flameNoiseT = .5; G.noise(P.x, P.z, 14, 'player'); }
    const range = G.L.rayWall(P.x, P.z, d.x, d.z, 6);
    for (const c of G.creatures) {
      if (!c.alive || !c.root.visible) continue;
      const dx = c.x - P.x, dz = c.z - P.z, dist = Math.hypot(dx, dz); if (dist > Math.min(6, range + .5)) continue;
      if ((dx * d.x + dz * d.z) / dist < .88 && dist > 1) continue;
      c.hurt(c.kind === 'stalker' ? dt * 1.3 : 40 * dt, 'fire', P.x, P.z, 'body');
      c.burning = 2.5;
    }
  };
  // shells, casings, magazines tumbling in the world
  G.ejectShell = function (model, type) {
    const P = G.player; const m = type === 'shell' ? (G._shellGeo || (G._shellGeo = (() => { const g = new THREE.Group(); const a = new THREE.Mesh(K.prim.cyl, new THREE.MeshStandardMaterial({ color: 0x9b1c1a, roughness: .4 })); a.scale.set(.019, .055, .019); g.add(a); const b = new THREE.Mesh(K.prim.cyl, new THREE.MeshStandardMaterial({ color: 0xb8913f, metalness: 1, roughness: .3 })); b.scale.set(.02, .012, .02); b.position.y = -.025; g.add(b); return g; })())).clone() : new THREE.Mesh(K.prim.cyl, G._brass || (G._brass = new THREE.MeshStandardMaterial({ color: 0xb8913f, metalness: 1, roughness: .3, emissive: 0x221a08 })));
    if (type !== 'shell') m.scale.set(.01, .03, .01);
    const o = V(P.x, P.y - .12, P.z).addScaledVector(G.camRight, .12).addScaledVector(G.camFwd, .3);
    m.position.copy(o); G.scene.add(m);
    const side = type === 'casing' ? -.4 : 1;
    G.casings.push({ m, vx: G.camRight.x * 1.8 * side + (Math.random() - .5), vy: 1.6 + Math.random(), vz: G.camRight.z * 1.8 * side + (Math.random() - .5), t: 0, bounces: 0 });
    if (G.casings.length > 24) { const c = G.casings.shift(); G.scene.remove(c.m); }
  };
  G.dropMag = function () {
    const P = G.player; const m = new THREE.Mesh(K.prim.box, new THREE.MeshStandardMaterial({ color: 0x2b2c2a, roughness: .6 })); m.scale.set(.03, .1, .04);
    m.position.set(P.x, P.y - .3, P.z).addScaledVector(G.camFwd, .3); G.scene.add(m);
    G.casings.push({ m, vx: 0, vy: -.5, vz: 0, t: 0, bounces: 0, heavy: true });
  };

  // ======================================================================= physics props & throwables
  G.updateProps = function (dt) {
    const P = G.player;
    for (const p of G.W.phys) {
      if (p.broken) continue;
      const o = p.obj.position;
      // player pushes / kicks props
      if (!p.held) {
        const dx = o.x - P.x, dz = o.z - P.z, d = Math.hypot(dx, dz), m = p.def.r + .3;
        if (d < m && d > 1e-3 && !P.locker) {
          const push = (m - d); o.x += dx / d * push; o.z += dz / d * push;
          if (P.speed > 1 && p.def.mass < 20) { p.vx += dx / d * P.speed * 1.2 / Math.sqrt(p.def.mass); p.vz += dz / d * P.speed * 1.2 / Math.sqrt(p.def.mass); p.rest = false; p.spin = P.speed * 2; if (P.speed > 3) { G.audio.clank(o.x, .3, o.z, .7); G.noise(o.x, o.z, 9, 'prop'); } }
        }
      }
      if (p.rest || p.held) continue;
      p.vy -= 9.8 * dt;
      let nx = o.x + p.vx * dt, nz = o.z + p.vz * dt; o.y += p.vy * dt;
      const r = G.collide(nx, nz, Math.max(.08, p.def.r * .8), true);
      if (Math.abs(r[0] - nx) > 1e-4) p.vx *= -.4; if (Math.abs(r[1] - nz) > 1e-4) p.vz *= -.4;
      o.x = r[0]; o.z = r[1];
      if (o.y <= 0) {
        o.y = 0;
        const impact = Math.abs(p.vy);
        if (impact > 2.5) { G.audio[p.def.breaks ? 'glass' : (p.def.mass > 4 ? 'thud' : 'clank')](o.x, .2, o.z, Math.min(1, impact / 6)); G.noise(o.x, o.z, Math.min(16, 4 + impact * 2), 'prop'); if (p.def.breaks && p.thrown) { G.breakProp(p); continue; } if (p.def.explosive && impact > 6) G.explode(p); }
        p.vy = impact > 1 ? impact * .3 : 0; p.vx *= .7; p.vz *= .7; p.spin *= .6;
        if (Math.hypot(p.vx, p.vz) < .1 && impact < .5) { p.rest = true; p.thrown = false; p.obj.rotation.x = 0; p.obj.rotation.z = p.type === 'chair' && Math.random() < .5 ? Math.PI / 2 : 0; if (p.obj.rotation.z) o.y = .25; G.rebakeObj(p.obj); }
      }
      p.obj.rotation.x += p.spin * dt * .7; p.obj.rotation.z += p.spin * dt * .4;
    }
    // casings
    for (const c of G.casings) {
      if (c.done) continue;
      c.t += dt; c.vy -= 9.8 * dt; c.m.position.x += c.vx * dt; c.m.position.y += c.vy * dt; c.m.position.z += c.vz * dt; c.m.rotation.x += dt * 12; c.m.rotation.z += dt * 7;
      if (c.m.position.y < .01) { c.m.position.y = .01; c.vy = -c.vy * .35; c.vx *= .5; c.vz *= .5; if (c.bounces++ < 3) G.audio.clank(c.m.position.x, 0, c.m.position.z, c.heavy ? .5 : .15); if (c.bounces > 4) { c.done = true; c.m.rotation.x = Math.PI / 2; } }
    }
    // projectiles
    for (const p of G.projectiles) {
      if (p.dead) continue;
      p.t += dt;
      if (!p.landed) {
        p.vy -= 9.8 * dt; const o = p.obj.position;
        const r = G.collide(o.x + p.vx * dt, o.z + p.vz * dt, .06, true);
        if (Math.abs(r[0] - (o.x + p.vx * dt)) > 1e-4) p.vx *= -.35; if (Math.abs(r[1] - (o.z + p.vz * dt)) > 1e-4) p.vz *= -.35;
        o.x = r[0]; o.z = r[1]; o.y += p.vy * dt; p.obj.rotation.x += dt * 9;
        if (o.y < .03) { o.y = .03; if (Math.abs(p.vy) > 1.5) { G.audio.clank(o.x, 0, o.z, .4); G.noise(o.x, o.z, 8, 'prop'); } p.vy *= -.3; p.vx *= .6; p.vz *= .6; if (Math.abs(p.vy) < .6 && Math.hypot(p.vx, p.vz) < .3) { p.landed = true; p.landT = p.t; } }
      }
      const o = p.obj.position;
      if (p.kind === 'flare') {
        if (p.t < 28) { if (Math.random() < .6) G.fx.spark.spawn(o.x, o.y + .05, o.z, (Math.random() - .5) * .8, 1 + Math.random(), (Math.random() - .5) * .8, .3, .025, 1, .25, .15, 4, 1); if (Math.random() < .15) G.fx.smoke.spawn(o.x, o.y + .1, o.z, 0, .5, 0, 2, .15, .3, .08, .06, -.2, .5, 4); p.light = true; G.flareNoise = (G.flareNoise || 0) - dt; if (G.flareNoise <= 0) { G.flareNoise = 1; G.noise(o.x, o.z, 7, 'flare'); } }
        else { p.dead = true; p.light = false; }
      } else if (p.kind === 'noise' && p.landed) {
        const lt = p.t - p.landT;
        if (lt > 1 && lt < 7) { p.beepT = (p.beepT || 0) - dt; if (p.beepT <= 0) { p.beepT = lt > 4 ? .15 : .5; G.audio.tracker(lt > 4 ? 0 : 20); G.noise(o.x, o.z, 24, 'noise'); } }
        if (lt > 7) { p.dead = true; G.scene.remove(p.obj); }
      } else if (p.kind === 'bomb') {
        if (p.t > 2.4) { p.dead = true; G.scene.remove(p.obj); G.explode({ obj: p.obj, def: {} }, true); }
        else if (Math.random() < .5) G.fx.spark.spawn(o.x, o.y + .05, o.z, (Math.random() - .5), 1, (Math.random() - .5), .2, .02, 1, .6, .2, 4, 1);
      }
    }
    // flare lights
    const fls = G.projectiles.filter(p => p.light && !p.dead).slice(-2);
    G.flareLights.forEach((l, i) => { const p = fls[i]; if (p) { l.position.copy(p.obj.position).y += .3; l.intensity = 5 + Math.random() * 2.5; } else l.intensity = 0; });
  };
  G.updateHolding = function (dt) {
    const P = G.player, p = P.holding, o = p.obj.position;
    const tgt = V(P.x, P.y - .25, P.z).addScaledVector(G.camFwd, .9);
    o.lerp(tgt, 1 - Math.exp(-dt * 18)); o.y = Math.max(0, o.y - p.def.h / 2);
    p.obj.rotation.y = P.yaw;
    if (G.mouse.lp || G.touchFireP) G.dropHeld(9);
  };
  G.dropHeld = function (speed) {
    const P = G.player, p = P.holding; if (!p) return;
    P.holding = null; p.held = false; p.rest = false; p.thrown = speed > 0;
    p.vx = G.camFwd.x * speed + P.vx * .5; p.vz = G.camFwd.z * speed + P.vz * .5; p.vy = G.camFwd.y * speed + (speed ? 2 : 0); p.spin = speed;
    if (speed) G.audio.swish();
  };
  G.throwItem = function () {
    const P = G.player, k = P.throwSel;
    if (P.locker || P.holding) return;
    if (!(G.inv.items[k] > 0)) { K.UI.msg('No ' + K.ITEMS[k].name + 's. (Z cycles throwables)', 2); return; }
    G.inv.items[k]--;
    const m = K.buildThrowable(k === 'noise' ? 'noise' : k, G.envMap);
    m.position.set(P.x, P.y - .1, P.z).addScaledVector(G.camFwd, .4).addScaledVector(G.camRight, -.15);
    G.scene.add(m);
    G.projectiles.push({ kind: k, obj: m, vx: G.camFwd.x * 10 + P.vx * .5, vy: G.camFwd.y * 10 + 2.5, vz: G.camFwd.z * 10 + P.vz * .5, t: 0 });
    G.audio.swish(); G.vm.recoil.rv -= 1;
  };
  G.breakProp = function (p) {
    p.broken = true; G.scene.remove(p.obj); if (p.obj.parent) p.obj.parent.remove(p.obj);
    const o = p.obj.position; G.audio.glass(o.x, .3, o.z); G.noise(o.x, o.z, 12, 'prop');
    for (let k = 0; k < 14; k++) G.fx.spark.spawn(o.x, o.y + .1, o.z, (Math.random() - .5) * 3, Math.random() * 2, (Math.random() - .5) * 3, .6, .015, .5, .8, .7, 9, .5);
  };
  G.explode = function (p, isBomb) {
    if (p.exploded) return; p.exploded = true;
    const o = p.obj.position.clone(); o.y += .4;
    if (!isBomb) { p.broken = true; if (p.obj.parent) p.obj.parent.remove(p.obj); }
    G.fx.explosion(o.x, o.y, o.z); G.audio.explosion(o.x, o.y, o.z); G.noise(o.x, o.z, 38, 'blast');
    const P = G.player, dp = Math.hypot(P.x - o.x, P.z - o.z);
    if (dp < 5) G.damagePlayer(Math.round(75 * (1 - dp / 5)), null, true);
    P.shake = Math.min(1.5, P.shake + 2 / (1 + dp * .3));
    for (const c of G.creatures) { const d = Math.hypot(c.x - o.x, c.z - o.z); if (d < 5.5 && c.alive && G.L.los(o.x, o.z, c.x, c.z)) c.hurt(c.kind === 'stalker' ? 2 : 170 * (1 - d / 6), c.kind === 'stalker' ? 'blast' : 'blast', o.x, o.z, 'body'); }
    for (const q of G.W.phys) { if (q === p || q.broken) continue; const qo = q.obj.position, d = Math.hypot(qo.x - o.x, qo.z - o.z); if (d < 5) { const f = (5 - d) * 2.5 / Math.sqrt(q.def.mass); q.vx += (qo.x - o.x) / (d + .1) * f; q.vz += (qo.z - o.z) / (d + .1) * f; q.vy += f * .8; q.rest = false; q.spin = 12; if (q.def.explosive) setTimeout(() => G.explode(q), 150 + Math.random() * 200); } }
    for (const f of G.W.fixtures) if (!f.broken && f.kind !== 'screen' && Math.hypot(f.x - o.x, f.z - o.z) < 4.5 && Math.random() < .7) G.breakLight(f, true);
    G.rebakeAround(o.x, o.z, 12);
  };
  G.breakLight = function (f, quiet) {
    if (f.broken) return; f.broken = true; f.flicker = false;
    G.fx.sparks(f.x, f.y - .05, f.z, 0, -1, 0, 18); G.audio.glass(f.x, f.y, f.z); G.audio.spark(f.x, f.y, f.z);
    G.noise(f.x, f.z, 10, 'prop'); G.W.setHalo(f, 0);
    if (!quiet) G.rebakeAround(f.x, f.z, f.range + 1);
  };
  G.rebakeAround = function (x, z, r) {
    G.W.computeFill();
    for (const c of G.W.chunks.values()) if (Math.abs(c.cx - x) < r + 13 && Math.abs(c.cz - z) < r + 13) G.W.bakeChunk(c);
    for (const m of G.W.bakeTargets) { const p = m.getWorldPosition(tv[0]); if (Math.abs(p.x - x) < r && Math.abs(p.z - z) < r) G.W.bakeMesh(m); }
  };
  G.rebakeObj = function (obj) { obj.updateMatrixWorld(true); obj.traverse(m => { if (m.isMesh && m.geometry.attributes.bake) G.W.bakeMesh(m); }); };

  // ======================================================================= power-up wave
  G.startPowerUp = function (x, z) {
    const W = G.W; W.poweredLevel = 3; W.computeFill();
    G.powerQueue = [...W.chunks.values()].sort((a, b) => Math.hypot(a.cx - x, a.cz - z) - Math.hypot(b.cx - x, b.cz - z));
    G.powerT = 0;
  };
  G.updatePower = function (dt) {
    if (!G.powerQueue) return;
    G.powerT += dt;
    const n = G.powerT < 1.2 ? 0 : 2;
    for (let k = 0; k < n && G.powerQueue.length; k++) {
      const c = G.powerQueue.shift(); G.W.bakeChunk(c);
      if (c.halo) { const col = c.halo.pts.geometry.attributes.color; c.halo.list.forEach((f, i) => { const on = G.W.fixOn(f), s = on ? (f.kind === 'emerg' ? .5 : .32) : 0; col.setXYZ(i, f.c[0] * s, f.c[1] * s, f.c[2] * s); }); col.needsUpdate = true; }
      if (Math.hypot(c.cx - G.player.x, c.cz - G.player.z) < 30) G.audio.thud(c.cx, 3, c.cz, .5);
    }
    if (!G.powerQueue.length) { G.powerQueue = null; for (const m of G.W.bakeTargets) G.W.bakeMesh(m); for (const it of G.items) { } }
  };

  // ======================================================================= creatures
  G.updateCreatures = function (dt) {
    const P = G.player;
    // stalker wakes once power is restored, or after a long time wandering
    if (G.stalker.timer > 1e8 && (G.time > 240 || G.progress >= 1)) G.stalker.timer = 30;
    for (const c of G.creatures) {
      const d = Math.hypot(c.x - P.x, c.z - P.z);
      const active = c === G.stalker || d < 40 || (c.state === 'chase');
      c.root.visible = c === G.stalker ? c.root.visible : d < 45;
      if (!active) continue;
      if (c.burning > 0) { c.burning -= dt; if (c.alive && c.kind !== 'stalker') { c.hurt(14 * dt, 'fire', c.x, c.z, 'body'); if (Math.random() < .5) G.fx.flame(c.x + (Math.random() - .5) * .4, .4 + Math.random() * 1.3, c.z + (Math.random() - .5) * .4, 0, 1, 0, .8); } }
      if (c !== G.stalker && d > 28 && c.state !== 'chase') { c.t += dt; continue; }
      c.update(dt);
    }
    G.creatures = G.creatures.filter(c => { if (!c.alive && c.deadT > 30 && Math.hypot(c.x - P.x, c.z - P.z) > 20) { G.scene.remove(c.root); return false; } return true; });
    // tension for the score
    const s = G.stalker, ds = Math.hypot(s.x - P.x, s.z - P.z);
    const near = s.state === 'vent' ? 0 : K.clamp(1 - ds / 22, 0, 1);
    const hunt = s.state === 'hunt' ? 1 : 0;
    const husks = G.creatures.some(c => c.kind !== 'stalker' && c.alive && (c.state === 'chase' || c.state === 'attack') && Math.hypot(c.x - P.x, c.z - P.z) < 12) ? .5 : 0;
    G.tension = K.damp(G.tension || 0, Math.max(near * .7, hunt, husks, G.lockerThreat), 1.5, dt);
    G.danger = K.damp(G.danger || 0, Math.max(hunt * (1 - ds / 30), near * .6, G.lockerThreat), 3, dt);
    G.audio.tick(dt, G.tension, G.danger);
  };
  G.onKill = c => { G.stats.kills++; G.killedIds = G.killedIds || []; G.killedIds.push(c.id); };
  G.onStalkerSpot = () => { G.audio.stinger('spotted'); K.UI.flashRed(); };
  G.onStalkerFlee = () => K.UI.msg('It shrieks and retreats into the vents.', 3);
  G.canKill = () => !(G.vm.cur === 'flamer' && G.vm.flame);
  G.damagePlayer = function (dmg, src, blast) {
    const P = G.player; if (P.dead || G.god) return;
    P.hp -= dmg; P.hurtT = 1; P.lastHit = G.time; P.shake = Math.min(1.5, P.shake + dmg / 30);
    G.audio.hurt(); K.UI.hurtDir(src ? Math.atan2(src.x - P.x, src.z - P.z) : null);
    if (src) { P.vx += (P.x - src.x) * 2; P.vz += (P.z - src.z) * 2; }
    if (P.hp <= 0) { P.hp = 0; G.startDeath(blast ? 'blast' : 'wounds', src); }
  };
  G.playerLightRGB = function () {
    const P = G.player, t = G.time;
    if (G._plT === t) return G._pl; G._plT = t;
    G._pl = G.W ? G.W.light(P.x, 1.3, P.z, 0, 1, 0, [0, 0, 0]) : [0, 0, 0];
    for (const l of G.flareLights) if (l.intensity > 0) { const d = l.position.distanceTo(tv[0].set(P.x, 1.3, P.z)); if (d < 8) { const k = (1 - d / 8) * .3; G._pl[0] += k; G._pl[1] += k * .2; G._pl[2] += k * .1; } }
    return G._pl;
  };
  G.playerLight = () => { const c = G.playerLightRGB(); return c[0] * .3 + c[1] * .59 + c[2] * .11; };

  // ======================================================================= death
  G.startDeath = function (kind, src, locker) {
    const P = G.player; if (P.dead) return;
    P.dead = true; G.deathKind = kind; G.deathT = 0; G.deathSrc = src; P.holdingBreath = false;
    G.vm.setFlame(false); G.stats.deaths++;
    G.audio.stinger('death');
    if (kind === 'stalker' || kind === 'locker') G.audio.screech(src.x, 1.8, src.z, 1.4);
    if (locker) { locker.target = 2.2; }
  };
  G.updateDeath = function (dt) {
    const P = G.player; G.deathT += dt; const t = G.deathT, s = G.deathSrc;
    if (G.deathKind === 'stalker' || G.deathKind === 'locker') {
      // locked to the creature's head as it closes in
      s.head.updateMatrixWorld(true); const hp = s.head.getWorldPosition(tv[0]);
      const want = Math.atan2(-(hp.x - P.x), -(hp.z - P.z)), wp = Math.atan2(hp.y - P.y, Math.hypot(hp.x - P.x, hp.z - P.z));
      P.yaw += K.angDiff(P.yaw, want) * Math.min(1, dt * 8); P.pitch += (wp - P.pitch) * Math.min(1, dt * 8);
      P.shake = Math.max(P.shake, t > 1.25 && t < 1.6 ? 1.6 : .2);
      if (t > 1.3 && !G.deathHit) { G.deathHit = true; G.audio.impact(P.x, P.y, P.z, 'flesh'); G.audio.thud(P.x, P.y, P.z, 1); K.UI.flashRed(true); }
      G.post.mat.uniforms.black.value = K.clamp((t - 1.45) * 3, 0, 1);
      if (P.locker && t < .3) { } // door already ripped open
    } else {
      P.pitch = K.lerp(P.pitch, .3, dt * 2); G.camRoll = K.lerp(G.camRoll || 0, .6, dt * 2); P.y = K.lerp(P.y, .35, dt * 2.5);
      G.post.mat.uniforms.black.value = K.clamp((t - 1.2) * 1.2, 0, 1);
    }
    if (t > 2.4 && !G.deathShown) { G.deathShown = true; K.UI.death(); }
    G.vm.update(dt, { ads: false, tracker: false, dx: 0, dy: 0 });
    G.updateCreatures(dt);
  };

  // ======================================================================= camera & world fx
  G.updateCamera = function (dt) {
    const P = G.player, cam = G.cam;
    const crouchY = 1.62 - P.crouchA * .55;
    if (!P.dead) P.y = P.locker ? 1.55 : crouchY;
    const bob = G.settings.bob && P.moving && !P.locker ? 1 : 0;
    const by = Math.abs(Math.sin(P.bobT)) * .045 * bob * (P.sprinting ? 1.5 : 1), bx = Math.cos(P.bobT) * .025 * bob;
    P.shake = Math.max(0, P.shake - dt * 2.2);
    const sh = P.shake * P.shake * .04;
    cam.position.set(P.x + bx * Math.cos(P.yaw), P.y + by + (Math.random() - .5) * sh, P.z - bx * Math.sin(P.yaw));
    cam.rotation.set(P.pitch + (Math.random() - .5) * sh, P.yaw + (Math.random() - .5) * sh, (G.camRoll || 0) + Math.sin(P.bobT * .5) * .006 * bob - (G.vm ? G.vm.sway.x * .3 : 0));
    const fovT = G.settings.fov - (G.vm ? G.vm.adsA * (G.vm.cur === 'pulse' ? 18 : 12) : 0) + (P.sprinting ? 4 : 0);
    if (Math.abs(cam.fov - fovT) > .05) { cam.fov = K.lerp(cam.fov, fovT, Math.min(1, dt * 10)); cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
    G.camFwd.set(0, 0, -1).applyQuaternion(cam.quaternion); G.camRight = (G.camRight || V()).set(1, 0, 0).applyQuaternion(cam.quaternion); G.camUp = (G.camUp || V()).set(0, 1, 0).applyQuaternion(cam.quaternion);
    G.sky.position.copy(cam.position);
    // flashlight
    const fl = G.flash;
    fl.position.copy(cam.position).addScaledVector(G.camRight, .22).addScaledVector(G.camUp, -.12);
    fl.target.position.copy(cam.position).addScaledVector(G.camFwd, 6);
    let fi = P.flashOn ? 4.6 : 0;
    if (P.flashOn && P.battery < .2) fi *= Math.random() < .05 ? .1 : .8 + Math.sin(G.time * 31) * .1;
    if (P.locker) fi *= .25;
    fl.intensity = fi;
    G.audio.setListener(P.x, P.y, P.z, P.yaw);
    // post uniforms
    const u = G.post.mat.uniforms;
    u.hurt.value = K.damp(u.hurt.value, Math.max(P.hurtT * .8, P.hp < 30 ? .25 + Math.sin(G.time * 4) * .08 : 0), 6, dt);
    u.low.value = K.damp(u.low.value, P.hp < 30 ? 1 - P.hp / 30 : 0, 2, dt);
    u.fear.value = K.damp(u.fear.value, G.danger || 0, 3, dt);
    u.red.value = K.damp(u.red.value, 0, 3, dt);
    if (!P.dead) u.black.value = K.damp(u.black.value, G.fadeTo || 0, 4, dt);
  };
  G.updateWorldFX = function (dt) {
    const P = G.player, W = G.W;
    // chunk visibility
    G.visT = (G.visT || 0) - dt;
    if (G.visT <= 0) {
      G.visT = .2;
      for (const c of W.chunks.values()) { const v = Math.hypot(c.cx - P.x, c.cz - P.z) < 50; if (v !== c.visible) { c.visible = v; c.group.visible = v; for (const o of c.objs) o.visible = v; } }
      for (const it of G.items) if (!it.taken) it.mesh.visible = Math.hypot(it.x - P.x, it.z - P.z) < 30;
      // nearest flickering/lit fixtures drive the dynamic light pool
      const near = []; const list = W.fixHash.get(G.L.cellOf(P.x, P.z)) || [];
      for (const id of list) { const f = W.fixtures[id]; if (!W.fixOn(f) || f.kind === 'screen') continue; const d = Math.hypot(f.x - P.x, f.z - P.z); if (d < 11 && G.L.los(P.x, P.z, f.x, f.z)) near.push([d - (f.flicker ? 4 : 0), f]); }
      near.sort((a, b) => a[0] - b[0]); G.poolF = near.slice(0, 3).map(n => n[1]);
    }
    G.pool.forEach((l, i) => {
      const f = G.poolF && G.poolF[i];
      if (!f) { l.intensity = 0; return; }
      l.position.set(f.x, f.y - .2, f.z); l.color.setRGB(f.c[0], f.c[1], f.c[2]); l.distance = f.range * .9;
      let k = f.kind === 'emerg' ? .45 : .38;
      if (f.flicker) { const n = Math.sin(G.time * 23 + f.id) + Math.sin(G.time * 7.3 + f.id * 3); k *= n > 1.2 ? .1 : n < -1.5 ? 0 : 1; W.setHalo(f, k * .6); if (k < .2 && Math.random() < .02) G.audio.spark(f.x, f.y, f.z); }
      l.intensity = f.int * k;
    });
    // dust motes in the flashlight
    if (P.flashOn && Math.random() < .5) G.fx.dust(P.x + G.camFwd.x * 2.5 + (Math.random() - .5) * 3, P.y + (Math.random() - .5) * 1.5, P.z + G.camFwd.z * 2.5 + (Math.random() - .5) * 3);
    // sparking panels, steam leaks, drips
    for (const s of W.sparkers) { const d = Math.abs(s.x - P.x) + Math.abs(s.z - P.z); if (d > 22) continue; s.t -= dt; if (s.t <= 0) { s.t = .4 + Math.random() * 3.5; G.fx.sparks(s.x, s.y, s.z, (Math.random() - .5) * .5, -.2, (Math.random() - .5) * .5, 6 + Math.random() * 10); G.audio.spark(s.x, s.y, s.z); if (Math.random() < .4) G.fx.flash(s.x, s.y, s.z, 0x88aaff, 2.5, .08, 5); } }
    for (const s of W.steamers) { const d = Math.abs(s.x - P.x) + Math.abs(s.z - P.z); if (d > 20) continue; s.t -= dt; if (s.t <= 0) { s.t = s.period; s.burst = 1.6; G.audio.steam(s.x, s.y, s.z); } if (s.burst > 0) { s.burst -= dt; G.fx.steam(s.x, s.y, s.z, 2); if (Math.hypot(s.x - P.x, s.z - P.z) < .8 && s.burst > .5 && Math.random() < dt * 4) G.damagePlayer(4, null); } }
    G.dripT = (G.dripT || 0) - dt; if (G.dripT <= 0) { G.dripT = .7 + Math.random() * 2; let best = null, bd = 14; for (const dd of W.drips) { const d = Math.hypot(dd[0] - P.x, dd[1] - P.z); if (d < bd) { bd = d; best = dd; } } if (best) G.audio.drip(best[0], 2.6, best[1]); }
    // item glints pulse
    for (const it of G.items) if (!it.taken && it.mesh.visible) { it.glint.material.opacity = .25 + .35 * Math.max(0, Math.sin(G.time * 2.4 + it.id)); }
  };
  G.updateEvents = function (dt) {
    // airlock venting
    for (const al of G.airlocks || []) {
      if (al.t < 0) continue; al.t += dt;
      if (al.t > 4 && !al.fired) {
        al.fired = true; G.audio.explosion(al.x, 1.5, al.z); G.fx.steam(al.x, 2, al.z, 30);
        const rm = al.rm, inRoom = (x, z) => x > rm.x * S && x < (rm.x + rm.w) * S && z > rm.y * S && z < (rm.y + rm.h) * S;
        for (const c of G.creatures) if (c.alive && inRoom(c.x, c.z)) { if (c === G.stalker) { c.state = 'vent'; c.timer = 120; c.root.visible = false; K.UI.msg('The vent tears it out into the void. It will be a long time before it finds its way back in.', 6); } else c.hurt(999, 'blast'); }
        if (inRoom(G.player.x, G.player.z)) G.startDeath('blast');
        for (const p of G.W.phys) if (inRoom(p.obj.position.x, p.obj.position.z)) { p.broken = true; if (p.obj.parent) p.obj.parent.remove(p.obj); }
      }
      if (al.t > 30) { al.t = -1; al.fired = false; }
    }
    // tracker beeps can be heard by the creature when close
    if (G.trackerOn) { G.trackBeepNoise = (G.trackBeepNoise || 0) - dt; if (G.trackBeepNoise <= 0) { G.trackBeepNoise = 1.2; G.noise(G.player.x, G.player.z, 4.5, 'player'); } }
    // self-destruct
    if (G.flags.launch && !G.player.dead) {
      G.flags.destructT -= dt;
      G.alarmT = (G.alarmT || 0) - dt; if (G.alarmT <= 0) { G.alarmT = 6; G.audio.alarm(G.player.x + 8, G.player.z, 4); G.player.shake += .2; }
      if (G.flags.destructT <= 0) { G.post.mat.uniforms.white.value = 1; G.startDeath('blast'); }
    }
    // lever animation
    for (const lv of G.levers) if (lv.pulled) lv.piv.rotation.x = K.damp(lv.piv.rotation.x, 1, 6, dt);
  };

  // ======================================================================= save / load
  G.snapshot = function () {
    let ex = ''; for (let k = 0; k < G.explored.length; k++) ex += String.fromCharCode(G.explored[k]);
    return { v: 1, map: G.mapName, seed: G.mapSeed, run: G.run, progress: G.progress, flags: G.flags, inv: G.inv, hp: G.player.hp, pos: [G.player.x, G.player.z, G.player.yaw], taken: G.takenIds || [], killed: G.killedIds || [], explored: btoa(ex), stats: G.stats, weapon: G.vm.cur, when: Date.now(), area: G.curArea && G.curArea.isRoom ? (K.ROOMDEF[G.curArea.room.type] || {}).name : '' };
  };
  G.save = function (manual) {
    const s = G.snapshot(); G.memSave = s;
    try { localStorage.setItem('kestrel.save', JSON.stringify(s)); } catch (e) { }
    if (manual) { G.stats.saves++; G.audio.stinger('save'); K.UI.msg('Progress recorded.', 3); G.revealSector(); }
  };
  G.autosave = function () { G.takenIds = G.takenIds || []; G.killedIds = G.killedIds || []; G.save(false); };
  G.getSave = function () { try { const s = localStorage.getItem('kestrel.save'); if (s) return JSON.parse(s); } catch (e) { } return G.memSave || null; };
  G.loadSave = function () {
    const s = G.getSave(); if (!s) return false;
    G.run = s.run; G.inv = JSON.parse(JSON.stringify(s.inv)); G.stats = s.stats; G.takenIds = s.taken.slice(); G.killedIds = s.killed.slice();
    G.player = G.makePlayer(); G.fadeTo = 0; G.deathShown = false; G.deathHit = false; G.camRoll = 0;
    G.post.mat.uniforms.black.value = 0; G.post.mat.uniforms.white.value = 0;
    G.vm.cur = s.weapon && G.inv.weapons.includes(s.weapon) ? s.weapon : 'jack';
    G.loadMap(s.map, s.seed, s);
    return true;
  };
  G.revealSector = function () { const L = G.L, a = G.curArea; if (!a) return; const lv = a.level; for (const ar of L.areas) if (ar.level <= lv) for (const c of ar.cells) if (G.explored[c] === 0) G.explored[c] = 2; K.UI.msg('Progress recorded. Shelter terminal downloaded the local deck plan.', 4); };

  G.useItem = function (t) {
    const P = G.player, inv = G.inv;
    if (t === 'medkit') { if (inv.items.medkit > 0 && P.hp < 100) { inv.items.medkit--; P.hp = Math.min(100, P.hp + 60); G.audio.mech('insert'); K.UI.msg('Used a Trauma Kit.', 2); } else if (!inv.items.medkit) K.UI.msg('No Trauma Kits. Craft one from gel and a bandage.', 2); }
    else if (t === 'battery') { if (inv.items.battery > 0 && P.battery < .95) { inv.items.battery--; P.battery = 1; G.audio.mech('mag'); K.UI.msg('Lamp recharged.', 2); } }
  };
  G.craft = function (rec) {
    const it = G.inv.items; for (const k in rec.need) if ((it[k] || 0) < rec.need[k]) return false;
    for (const k in rec.need) it[k] -= rec.need[k];
    it[rec.out] = (it[rec.out] || 0) + rec.n; G.audio.mech('cock'); return true;
  };
  G.ending = function () {
    G.paused = true; G.flags.launch = false;
    G.audio.explosion(G.player.x, 0, G.player.z);
    K.UI.fade(1, 2, () => K.UI.ending());
  };
  // ======================================================================= motion tracker screen
  G.drawTracker = function (scr) {
    const now = G.time; if (scr.last && now - scr.last < .05) return; scr.last = now;
    const x = scr.ctx, P = G.player, W = 256, ox = 128, oy = 232, R = 30, sc = 205 / R;
    if (!scr.ping || now - scr.ping > 1.15) {
      scr.ping = now; scr.blips = [];
      let nearest = 1e9;
      for (const c of G.creatures) {
        if (!c.alive) continue;
        let cx = c.x, cz = c.z, moving = Math.abs(c.speed) > .25 || c.state === 'drop' || c.state === 'leap';
        if (c === G.stalker && c.state === 'vent') { if (!c.ghost) continue; cx = c.ghost[0]; cz = c.ghost[1]; moving = Math.random() < .6; }
        if (!moving) continue;
        const dx = cx - P.x, dz = cz - P.z, f = -dx * Math.sin(P.yaw) - dz * Math.cos(P.yaw), r = dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw), d = Math.hypot(dx, dz);
        if (d > R || f < -2) continue;
        scr.blips.push([r, f, c === G.stalker ? 1.4 : 1]); nearest = Math.min(nearest, d);
      }
      scr.nearest = nearest;
      if (nearest < 1e8) G.audio.tracker(nearest); else G.audio.trackerPing();
    }
    const age = now - scr.ping;
    x.fillStyle = '#020a05'; x.fillRect(0, 0, W, W);
    const g = x.createRadialGradient(ox, oy, 0, ox, oy, 220); g.addColorStop(0, 'rgba(60,255,140,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, W);
    x.strokeStyle = 'rgba(90,255,160,.35)'; x.lineWidth = 1.5;
    for (let k = 1; k <= 3; k++) { x.beginPath(); x.arc(ox, oy, k * 68, Math.PI * 1.08, Math.PI * 1.92); x.stroke(); }
    x.beginPath(); x.moveTo(ox, oy); x.lineTo(ox + Math.cos(Math.PI * 1.08) * 210, oy + Math.sin(Math.PI * 1.08) * 210); x.moveTo(ox, oy); x.lineTo(ox + Math.cos(Math.PI * 1.92) * 210, oy + Math.sin(Math.PI * 1.92) * 210); x.moveTo(ox, oy); x.lineTo(ox, oy - 210); x.stroke();
    // expanding ping wave
    x.strokeStyle = `rgba(120,255,180,${Math.max(0, .8 - age)})`; x.lineWidth = 3; x.beginPath(); x.arc(ox, oy, age * 220, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
    for (const [r, f, s] of scr.blips) {
      const bx = ox + r * sc, by = oy - f * sc, a = Math.max(.15, 1 - age * .8);
      const bg = x.createRadialGradient(bx, by, 0, bx, by, 14 * s); bg.addColorStop(0, `rgba(200,255,220,${a})`); bg.addColorStop(.4, `rgba(80,255,150,${a * .6})`); bg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = bg; x.fillRect(bx - 16 * s, by - 16 * s, 32 * s, 32 * s);
    }
    // objective direction
    const tgt = K.UI.objTarget();
    if (tgt) { const tx = tgt.cx * K.S - P.x, tz = tgt.cy * K.S - P.z, f = -tx * Math.sin(P.yaw) - tz * Math.cos(P.yaw), r = tx * Math.cos(P.yaw) - tz * Math.sin(P.yaw), a = Math.atan2(r, f), d = Math.hypot(tx, tz);
      x.save(); x.translate(ox, oy); x.rotate(a); x.fillStyle = 'rgba(255,200,80,.9)'; x.beginPath(); x.moveTo(0, -222); x.lineTo(-8, -206); x.lineTo(8, -206); x.fill(); x.restore();
      x.fillStyle = 'rgba(255,200,80,.9)'; x.font = '16px monospace'; x.textAlign = 'right'; x.fillText('OBJ ' + Math.round(d) + 'M', 246, 22); }
    x.fillStyle = 'rgba(120,255,180,.9)'; x.font = 'bold 22px monospace'; x.textAlign = 'left';
    x.fillText(scr.nearest < 1e8 ? String(Math.round(scr.nearest)).padStart(2, '0') + 'm' : '--', 12, 28);
    x.font = '12px monospace'; x.fillText('MOTION', 12, 44);
    x.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < W; y += 3) x.fillRect(0, y, W, 1);
    scr.tex.needsUpdate = true;
  };
})();
