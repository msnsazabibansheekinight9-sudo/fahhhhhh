// Ironwalkers — renderer, main loop, input, environment map and the 3D thumbnail/preview renderer.
(function () {
'use strict';
const MW = window.MW;

function makeEnvScene() {
  const s = new THREE.Scene();
  const g = new THREE.BoxGeometry(1, 1, 1);
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), new THREE.MeshBasicMaterial({ color: 0x262a30, side: THREE.BackSide })); room.position.y = 8; s.add(room);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(40, 0.2, 40), new THREE.MeshBasicMaterial({ color: 0x1a1c20 })); floor.position.y = -2; s.add(floor);
  [[0, 17, 0, 18, 0.2, 6, 0xffffff, 3.2], [-18, 8, 0, 0.2, 6, 14, 0xffe8d0, 1.6], [18, 8, 0, 0.2, 6, 14, 0xd0e0ff, 1.6], [0, 8, -18, 14, 6, 0.2, 0xffffff, 1]].forEach(([x, y, z, w, h, d, c, k]) => { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) })); m.position.set(x, y, z); m.scale.set(w, h, d); s.add(m); });
  return s;
}

const core = MW.core = {
  init() {
    const canvas = document.getElementById('gl');
    const q = MW.profile.s.quality;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: q !== 'low', powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 1.75 : q === 'medium' ? 1.25 : 1));
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = q !== 'low'; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 3000);
    const pm = new THREE.PMREMGenerator(r); this.envMap = pm.fromScene(makeEnvScene(), 0.04).texture; pm.dispose();
    this.resize(); addEventListener('resize', () => this.resize());
    this.clock = new THREE.Clock();
    this.view = null;
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.1, this.clock.getDelta());
      this.fpsAcc = (this.fpsAcc || 0) * 0.95 + dt * 0.05;
      if (this.view) {
        try { this.view.update(dt); } catch (e) { console.error(e); }
        if (this.view.scene && !this.view.scene.environment) this.view.scene.environment = this.envMap;
        r.render(this.view.scene, this.view.camera);
      }
      MW.thumbs.pump();
      MW.input.endFrame();
    };
    loop();
  },
  resize() { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); },
  setView(v) { this.view = v; },
  setQuality() { /* applied on reload */ },
};

// ---------------- input ----------------
const I = MW.input = {
  keys: {}, mdx: 0, mdy: 0, mdxSmooth: 0, mdySmooth: 0, lmb: false, rmb: false, locked: false, handlers: [],
  init() {
    addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      if (!e.repeat) this.handlers.forEach(h => h(e.code, true));
      this.keys[e.code] = true;
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; this.handlers.forEach(h => h(e.code, false)); });
    addEventListener('blur', () => { this.keys = {}; this.lmb = this.rmb = false; });
    addEventListener('mousemove', e => { if (this.locked) { this.mdx += e.movementX; this.mdy += e.movementY; } });
    const canvas = document.getElementById('gl');
    addEventListener('mousedown', e => { if (!this.locked) return; if (e.button === 0) this.lmb = true; if (e.button === 2) this.rmb = true; });
    addEventListener('mouseup', e => { if (e.button === 0) this.lmb = false; if (e.button === 2) this.rmb = false; });
    addEventListener('contextmenu', e => { if (this.locked || MW.ui.inBattle) e.preventDefault(); });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; if (!this.locked) { this.lmb = this.rmb = false; } MW.ui && MW.ui.onLockChange(this.locked); });
    this.canvas = canvas;
  },
  lock() { try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} },
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
  on(fn) { this.handlers.push(fn); },
  endFrame() { this.mdxSmooth = this.mdxSmooth * 0.8 + this.mdx * 0.2; this.mdySmooth = this.mdySmooth * 0.8 + this.mdy * 0.2; if (!this.locked) { this.mdx = this.mdy = 0; } },
};

// ---------------- 3D thumbnails & live preview ----------------
const TH = MW.thumbs = {
  cache: {}, queue: [], r: null,
  init() {
    const cv = document.createElement('canvas'); cv.width = 240; cv.height = 180;
    this.cv = cv;
    this.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true, alpha: true });
    this.r.outputEncoding = THREE.sRGBEncoding; this.r.toneMapping = THREE.ACESFilmicToneMapping; this.r.setPixelRatio(1);
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(this.r); this.scene.environment = pm.fromScene(makeEnvScene(), 0.04).texture; pm.dispose();
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 4); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc8ff, 1.4); rim.position.set(-4, 2, -4); this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    this.cam = new THREE.PerspectiveCamera(30, 4 / 3, 0.05, 500);
    this.holder = new THREE.Group(); this.scene.add(this.holder);
  },
  model(item) {
    const M = MW.mechs;
    switch (item.cat) {
      case 'weapon': return M.weaponDisplay(item);
      case 'equip': return M.equipModel(item);
      case 'trinket': return M.trinketModel(item.trinket, item.color);
      case 'class': { const L = MW.profile.defaultLoadout(item.cls); const b = MW.makeBuild(item.cls, L, ''); const m = M.build(b, { noShadow: true }); M.animate(m, 0.016, { speed: 0, maxSpeed: 1, twist: -0.25, pitch: 0, t: 0 }); return m.root; }
      case 'skin': { const L = Object.assign({}, MW.profile.defaultLoadout('vanguard'), { skin: item.id, colors: item.colors.slice() }); const m = M.build(MW.makeBuild('vanguard', L, ''), { noShadow: true }); M.animate(m, 0.016, { speed: 0, maxSpeed: 1, twist: -0.3, pitch: 0, t: 0 }); return m.root; }
      case 'finish': { const L = Object.assign({}, MW.profile.defaultLoadout('wisp'), { finish: item.id, skin: 's_solid_0', colors: ['#7d868f', '#2b2f35', '#ffb52e'] }); const m = M.build(MW.makeBuild('wisp', L, ''), { noShadow: true }); M.animate(m, 0.016, { speed: 0, maxSpeed: 1, twist: -0.3, pitch: 0, t: 0 }); return m.root; }
      case 'wskin': { const mats = M.makeMats({ skin: MW.item('s_solid_0'), colors: ['#555', '#333', '#999'], finish: MW.item('f_satin'), wskin: item, cockpit: MW.item('c_0') }); const g = new THREE.Group(); const a = M.weapon('ac5', 2, mats); a.group.position.x = -0.8; g.add(a.group); const b = M.weapon('lrm', 2, mats); b.group.position.set(1.2, 0, 0.6); g.add(b.group); return g; }
      case 'emblem': { const g = new THREE.Group(); const p = new THREE.Mesh(M.geo.bbox(2.4, 2.8, 0.3, 0.08), new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.7, roughness: 0.4 })); g.add(p); const e = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshStandardMaterial({ map: MW.tex.emblem(item.shape, item.color), transparent: true, roughness: 0.4, metalness: 0.3 })); e.position.z = 0.16; g.add(e); return g; }
      case 'jet': { const g = M.equipModel({ slot: 'jets', variant: 'standard', tier: item.tier }); g.traverse(o => { if (o.isMesh && o.material.blending === THREE.AdditiveBlending) { o.material = o.material.clone(); o.material.color.set(item.color); } }); return g; }
      case 'cockpit': { const g = new THREE.Group(); const sc = new THREE.Mesh(M.geo.bbox(2.6, 2, 0.2, 0.05), new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.6 })); g.add(sc); const cv = MW.tex.canvas(256, 200), c = cv.getContext('2d'); c.fillStyle = '#04070a'; c.fillRect(0, 0, 256, 200); c.strokeStyle = item.hud; c.lineWidth = 2; for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(128, 100, i * 26, 0, 7); c.stroke(); } c.fillStyle = item.hud; c.font = 'bold 18px monospace'; c.fillText('RDR', 12, 24); c.fillStyle = item.light; c.fillRect(0, 186, 256, 14); const s = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.75), new THREE.MeshBasicMaterial({ map: MW.tex.toTex(cv), toneMapped: false })); s.position.z = 0.11; g.add(s); return g; }
      case 'box': return this.crate(item.tier);
      default: return null;
    }
  },
  crate(tier) {
    const g = new THREE.Group(); const col = MW.TIERS[tier].color; const M = MW.mechs;
    const body = new THREE.MeshStandardMaterial({ color: [0x5a5048, 0x3a4a3a, 0x2a3a4e, 0x3a2a4e, 0x4e3e1a, 0x4a1a24][tier], metalness: 0.6, roughness: 0.45, bumpMap: MW.tex.panelBump(), bumpScale: 0.02 });
    const glowM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(col), emissiveIntensity: 2.2 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.8, roughness: 0.4 });
    const base = new THREE.Group(); g.add(base);
    base.add(new THREE.Mesh(M.geo.bbox(3, 1.7, 2.2, 0.12), body));
    for (const s of [-1, 1]) { const b = new THREE.Mesh(M.geo.box(3.1, 0.12, 0.12), glowM); b.position.set(0, 0.25 * s, 1.11); base.add(b); const h = new THREE.Mesh(M.geo.box(0.2, 0.5, 0.6), edge); h.position.set(1.55 * s, 0.1, 0); base.add(h); }
    for (const x of [-1.4, 1.4]) for (const z of [-1, 1]) { const c = new THREE.Mesh(M.geo.box(0.3, 1.8, 0.3), edge); c.position.set(x, 0, z); base.add(c); }
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.45), new THREE.MeshBasicMaterial({ map: MW.tex.label(MW.TIERS[tier].roman, col, '#111', 128, 48), toneMapped: false })); lbl.position.set(0, -0.35, 1.115); base.add(lbl);
    const lid = new THREE.Group(); lid.position.y = 0.85; g.add(lid); g.userData.lid = lid;
    const lm = new THREE.Mesh(M.geo.bbox(3.1, 0.5, 2.3, 0.12), body); lm.position.y = 0.25; lid.add(lm);
    const seam = new THREE.Mesh(M.geo.box(3.12, 0.06, 2.32), glowM); seam.position.y = 0.02; lid.add(seam);
    const hz = new THREE.Mesh(M.geo.box(2.2, 0.02, 0.4), new THREE.MeshStandardMaterial({ map: (() => { const cv = MW.tex.canvas(64, 16), c = cv.getContext('2d'); c.fillStyle = '#f2c200'; c.fillRect(0, 0, 64, 16); c.fillStyle = '#111'; for (let i = -16; i < 80; i += 12) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 6, 0); c.lineTo(i - 10, 16); c.lineTo(i - 16, 16); c.fill(); } return MW.tex.toTex(cv); })() })); hz.position.y = 0.51; lid.add(hz);
    g.userData.glow = glowM;
    return g;
  },
  frame(obj, yaw, pitch) {
    const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
    obj.position.sub(c);
    const r = Math.max(size.x, size.y, size.z) * (this.tight ? 0.5 : 0.6) + 0.001; const d = r / Math.tan(this.cam.fov * Math.PI / 360) * 1.05;
    this.cam.position.set(Math.sin(yaw) * d * Math.cos(pitch), Math.sin(pitch) * d, Math.cos(yaw) * d * Math.cos(pitch)); this.cam.lookAt(0, 0, 0);
  },
  // returns a data URL (cached) or null and queues it
  get(item, cb) {
    const k = item.id; if (this.cache[k]) return this.cache[k];
    if (!this.queue.find(q => q.item.id === k)) this.queue.push({ item, cb }); else if (cb) this.queue.find(q => q.item.id === k).cbs = (this.queue.find(q => q.item.id === k).cbs || []).concat(cb);
    return null;
  },
  pump() {
    if (this.preview) { this.renderPreview(); return; }
    let n = 0;
    while (this.queue.length && n++ < 2) {
      const q = this.queue.shift(); let url = null;
      try {
        const obj = this.model(q.item);
        if (obj) {
          this.holder.add(obj); const yaw = q.item.cat === 'weapon' || q.item.cat === 'wskin' ? 2.3 : q.item.cat === 'emblem' || q.item.cat === 'cockpit' ? 0.35 : 0.6;
          this.tight = q.item.cat === 'weapon' || q.item.cat === 'wskin';
          this.frame(obj, yaw, 0.28); this.r.setSize(240, 180, false); this.r.render(this.scene, this.cam); url = this.cv.toDataURL('image/png');
          this.holder.remove(obj);
        }
      } catch (e) { console.warn('thumb', q.item.id, e); }
      this.cache[q.item.id] = url || 'none';
      if (q.cb) q.cb(url); (q.cbs || []).forEach(f => f(url));
    }
  },
  // live, rotating 3D preview inside a DOM element
  showPreview(item, el) {
    this.hidePreview();
    const obj = this.model(item); if (!obj) return false;
    this.holder.add(obj); this.frame(obj, 0.6, 0.25);
    this.preview = { obj, el, item, yaw: 0.6, drag: false };
    el.appendChild(this.cv); this.cv.className = 'previewCanvas';
    const P = this.preview;
    this.cv.onpointerdown = e => { P.drag = true; P.lx = e.clientX; this.cv.setPointerCapture(e.pointerId); };
    this.cv.onpointermove = e => { if (P.drag) { P.yaw -= (e.clientX - P.lx) * 0.01; P.lx = e.clientX; } };
    this.cv.onpointerup = () => { P.drag = false; };
    return true;
  },
  renderPreview() {
    const P = this.preview; const w = P.el.clientWidth || 400, h = P.el.clientHeight || 300;
    if (this.cv.width !== w || this.cv.height !== h) { this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
    if (!P.drag) P.yaw += 0.006;
    const d = this.cam.position.length(); this.cam.position.set(Math.sin(P.yaw) * d * 0.96, d * 0.27, Math.cos(P.yaw) * d * 0.96); this.cam.lookAt(0, 0, 0);
    this.r.render(this.scene, this.cam);
  },
  hidePreview() {
    if (!this.preview) return; this.holder.remove(this.preview.obj); if (this.cv.parentNode) this.cv.parentNode.removeChild(this.cv); this.preview = null;
    this.cam.aspect = 4 / 3; this.cam.updateProjectionMatrix(); this.r.setSize(240, 180, false);
  },
};
})();
