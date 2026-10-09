'use strict';
// Menus and screens: home, hangar (3D viewer), research trees, shop, crates, battle pass, profile, settings, battle flow.
(function () {
  const T = THREE, PI = Math.PI, G = SM.G;
  SM.FONT_BODY = '"Barlow", "Segoe UI", system-ui, sans-serif';
  SM.FONT_MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = SM.fmt;
  const UI = SM.UI = { screen: 'home', fac: 'coalition', branch: 'armor', hangarSel: null, hangarBranch: 'all', viewer: null, battle: null };

  // ---------------------------------------------------------------- environment for small renderers
  function makeEnv(renderer, top, hor, gnd) {
    const sc = new T.Scene(), g = new T.SphereGeometry(50, 24, 12), c = [];
    const a = new T.Color(top), b = new T.Color(hor), d = new T.Color(gnd);
    for (let i = 0; i < g.attributes.position.count; i++) { const y = g.attributes.position.getY(i) / 50; const col = y > 0 ? b.clone().lerp(a, Math.pow(y, 0.6)) : b.clone().lerp(d, Math.min(1, -y * 3)); c.push(col.r, col.g, col.b); }
    g.setAttribute('color', new T.Float32BufferAttribute(c, 3));
    sc.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
    const s = new T.Mesh(new T.SphereGeometry(5, 8, 6), new T.MeshBasicMaterial({ color: new T.Color(0xffffff).multiplyScalar(5) })); s.position.set(25, 30, 20); sc.add(s);
    const pm = new T.PMREMGenerator(renderer); const rt = pm.fromScene(sc, 0.02); pm.dispose();
    return rt.texture;
  }
  function frameObject(obj, cam, fit, yaw, pitch) {
    const box = new T.Box3().setFromObject(obj), sph = box.getBoundingSphere(new T.Sphere());
    const r = Math.max(1.5, sph.radius) * (fit || 1);
    const d = r / Math.sin(cam.fov * PI / 360);
    const p = pitch === undefined ? 0.32 : pitch, y = yaw === undefined ? 0.75 : yaw;
    cam.position.set(sph.center.x + Math.sin(y) * Math.cos(p) * d, sph.center.y + Math.sin(p) * d, sph.center.z + Math.cos(y) * Math.cos(p) * d);
    cam.lookAt(sph.center);
    return { center: sph.center, d, r };
  }

  // ---------------------------------------------------------------- portraits
  const P = { r: null, scene: null, cam: null, cache: {}, queue: [], busy: false };
  SM.portrait = function (u, mods, skin, cb, cust) {
    if (cust === undefined && SM.G && SM.G.s && SM.G.custEquipped) cust = SM.G.custEquipped(u.id);
    const key = u.id + '|' + (mods || []).join(',') + '|' + (skin || '') + '|' + (cust || []).join(',');
    if (P.cache[key]) { cb(P.cache[key]); return; }
    P.queue.push({ u, mods, skin, cb, key, cust });
    if (!P.busy) { P.busy = true; requestAnimationFrame(portraitPump); }
  };
  function portraitInit() {
    const cv = document.createElement('canvas'); cv.width = 240; cv.height = 150;
    P.r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
    P.r.setSize(240, 150, false); P.r.outputEncoding = T.sRGBEncoding; P.r.toneMapping = T.ACESFilmicToneMapping; P.r.toneMappingExposure = 1.05;
    P.scene = new T.Scene(); P.scene.environment = makeEnv(P.r, 0x3b5b80, 0xb8c8d8, 0x3a3630);
    P.scene.add(new T.HemisphereLight(0xdfe8ff, 0x3a3328, 0.8));
    const dl = new T.DirectionalLight(0xffffff, 2.2); dl.position.set(5, 8, 6); P.scene.add(dl);
    P.cam = new T.PerspectiveCamera(30, 240 / 150, 0.1, 500);
  }
  function portraitPump() {
    const t0 = performance.now();
    if (!P.r) { try { portraitInit(); } catch (e) { P.queue.forEach(q => q.cb('')); P.queue = []; P.busy = false; return; } }
    while (P.queue.length && performance.now() - t0 < 14) {
      const q = P.queue.shift();
      if (P.cache[q.key]) { q.cb(P.cache[q.key]); continue; }
      const inst = SM.instantiate(q.u, q.mods || [], q.skin, q.cust || []);
      P.scene.add(inst.obj);
      const cls = SM.CLASSES[q.u.cls];
      SM.animateUnit(inst.rig, cls, { speed: 0 }, 0.016, 1);
      frameObject(inst.obj, P.cam, cls.move === 'inf' ? 0.85 : 0.78, 0.8, 0.3);
      P.r.render(P.scene, P.cam);
      const url = P.r.domElement.toDataURL('image/png');
      P.scene.remove(inst.obj);
      inst.rig.tracks.forEach(t => t.dispose());
      P.cache[q.key] = url;
      q.cb(url);
    }
    if (P.queue.length) requestAnimationFrame(portraitPump); else P.busy = false;
  }

  // ---------------------------------------------------------------- hangar 3D viewer
  class Viewer {
    constructor() {
      const cv = this.canvas = document.createElement('canvas'); cv.className = 'viewer-canvas';
      this.r = new T.WebGLRenderer({ canvas: cv, antialias: true });
      this.r.outputEncoding = T.sRGBEncoding; this.r.toneMapping = T.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.0;
      this.r.shadowMap.enabled = true; this.r.shadowMap.type = T.PCFSoftShadowMap;
      const s = this.scene = new T.Scene();
      s.background = new T.Color(0x0d1218);
      s.fog = new T.Fog(0x0d1218, 60, 160);
      s.environment = makeEnv(this.r, 0x26384d, 0x8a9aaa, 0x20242a);
      s.add(new T.HemisphereLight(0xbfd2ee, 0x2a2622, 0.55));
      const key = new T.DirectionalLight(0xfff0dc, 2.4); key.position.set(18, 30, 14); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
      const sc = key.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.far = 120; key.shadow.bias = -0.0005; key.shadow.normalBias = 0.3;
      s.add(key); this.key = key;
      const rim = new T.DirectionalLight(0x7fb8ff, 1.2); rim.position.set(-20, 10, -20); s.add(rim);
      const spot = new T.SpotLight(0xffb070, 1.2, 120, 0.5, 0.6); spot.position.set(-14, 22, 18); s.add(spot);
      // turntable
      const mb = new SM.MB(0.2);
      mb.cyl('deck', 26, 27, 1.2, 0, -0.6, 0, 0, 0, 0, 64);
      mb.tor('ring', 26.1, 0.12, 0, 0.02, 0, PI / 2, 0, 0, 96);
      for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2; mb.box('ring', 0.25, 0.04, 3, Math.cos(a) * 23, 0.03, Math.sin(a) * 23, 0, -a, 0); }
      const plat = mb.build({ deck: new T.MeshStandardMaterial({ color: 0x1c2229, roughness: 0.7, metalness: 0.25 }), ring: new T.MeshBasicMaterial({ color: 0xff9a3c, toneMapped: false }) });
      plat.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = false; } });
      s.add(plat);
      const floor = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshStandardMaterial({ color: 0x14191f, roughness: 0.9 }));
      floor.rotation.x = -PI / 2; floor.position.y = -1.2; floor.receiveShadow = true; s.add(floor);
      const grid = new T.GridHelper(400, 80, 0x26303a, 0x1b222a); grid.position.y = -1.18; s.add(grid);
      this.cam = new T.PerspectiveCamera(32, 1, 0.1, 600);
      this.yaw = 0.7; this.pitch = 0.28; this.auto = true; this.zoom = 1;
      this.holder = new T.Group(); s.add(this.holder);
      this.time = 0;
      cv.addEventListener('mousedown', e => { this.drag = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch }; this.auto = false; });
      window.addEventListener('mousemove', e => { if (!this.drag) return; this.yaw = this.drag.yaw - (e.clientX - this.drag.x) * 0.008; this.pitch = SM.clamp(this.drag.pitch + (e.clientY - this.drag.y) * 0.005, 0.02, 1.2); });
      window.addEventListener('mouseup', () => { this.drag = null; });
      cv.addEventListener('wheel', e => { e.preventDefault(); this.zoom = SM.clamp(this.zoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.5, 2); }, { passive: false });
      cv.addEventListener('touchstart', e => { const t = e.touches[0]; this.drag = { x: t.clientX, y: t.clientY, yaw: this.yaw, pitch: this.pitch }; this.auto = false; }, { passive: true });
      cv.addEventListener('touchmove', e => { const t = e.touches[0]; if (!this.drag) return; this.yaw = this.drag.yaw - (t.clientX - this.drag.x) * 0.008; this.pitch = SM.clamp(this.drag.pitch + (t.clientY - this.drag.y) * 0.005, 0.02, 1.2); }, { passive: true });
      cv.addEventListener('touchend', () => { this.drag = null; });
    }
    attach(el) { if (this.canvas.parentNode !== el) el.appendChild(this.canvas); this.resize(); }
    resize() {
      const p = this.canvas.parentNode; if (!p) return;
      const w = p.clientWidth || 300, h = p.clientHeight || 200;
      this.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); this.r.setSize(w, h, false);
      this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
      this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    }
    show(u, mods, skin, cust) {
      if (this.cur) { this.holder.remove(this.cur.obj); this.cur.rig.tracks.forEach(t => t.dispose()); }
      if (cust === undefined) cust = SM.G.custEquipped(u.id);
      const inst = SM.instantiate(u, mods || [], skin, cust);
      inst.obj.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
      const cls = SM.CLASSES[u.cls];
      this.cls = cls; this.unit = u;
      const box = new T.Box3().setFromObject(inst.obj), sph = box.getBoundingSphere(new T.Sphere());
      let lift = 0;
      if (cls.move === 'naval' || cls.move === 'sub') lift = -box.min.y * 0.9;
      if (cls.move === 'plane') lift = 4 + -box.min.y;
      if (cls.move === 'heli') lift = 0.4;
      inst.obj.position.y = lift;
      this.holder.add(inst.obj);
      const scale = SM.clamp(10 / Math.max(0.5, sph.radius), 0.45, 2.4);
      this.holder.scale.setScalar(scale);
      this.cur = inst; this.radius = sph.radius * scale; this.cy = (sph.center.y + lift) * scale;
      if (cls.move === 'plane') { this.stand = this.stand || new T.Mesh(new T.CylinderGeometry(0.4, 1.2, 1, 8), new T.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.7, roughness: 0.4 })); this.stand.scale.y = lift * scale; this.stand.position.y = lift * scale / 2; this.scene.add(this.stand); }
      else if (this.stand) this.scene.remove(this.stand);
    }
    render(dt) {
      if (!this.canvas.parentNode || !this.cur) return;
      this.time += dt;
      if (this.auto) this.yaw += dt * 0.25;
      const r = Math.max(4, this.radius) * this.zoom;
      const d = r / Math.sin(this.cam.fov * PI / 360) * 1.15;
      const cy = Math.max(1.5, this.cy);
      this.cam.position.set(Math.sin(this.yaw) * Math.cos(this.pitch) * d, cy + Math.sin(this.pitch) * d, Math.cos(this.yaw) * Math.cos(this.pitch) * d);
      this.cam.lookAt(0, cy * 0.85, 0);
      const cls = this.cls;
      const st = { speed: cls.move === 'inf' || cls.move === 'mech' ? 0 : 0, aimPitch: 0.05, phase: this.time * 2, boost: false };
      SM.animateUnit(this.cur.rig, cls, st, dt, this.time);
      if (cls.move === 'heli') this.cur.obj.position.y = 0.4 + Math.sin(this.time * 1.4) * 0.15;
      this.r.render(this.scene, this.cam);
    }
  }

  // ---------------------------------------------------------------- toasts / modal
  UI.toast = function (text, kind) {
    const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = text;
    $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3200);
  };
  UI.modal = function (html, cls) {
    const m = $('#modal'); m.className = 'modal ' + (cls || ''); m.innerHTML = '<div class="modal-box">' + html + '</div>'; m.hidden = false;
    m.onclick = e => { if (e.target === m || (e.target.dataset && e.target.dataset.close !== undefined)) UI.closeModal(); };
    return m;
  };
  UI.closeModal = function () { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; if (UI.onModalClose) { const f = UI.onModalClose; UI.onModalClose = null; f(); } };

  // ---------------------------------------------------------------- wallet / nav
  UI.wallet = function () {
    const s = G.s;
    $('#wCredits').textContent = fmt(s.credits); $('#wCores').textContent = fmt(s.cores); $('#wRp').textContent = fmt(s.rp); $('#wFree').textContent = fmt(s.freeXp);
    const b = s.boosters[0];
    $('#wBoost').hidden = !b; if (b) $('#wBoost').textContent = '×' + b.mult + ' XP · ' + b.battles + ' left';
    const claimable = G.s.missions.list.some((m, i) => m.prog >= m.n && G.s.missions.claimed.indexOf(i) < 0);
    const bpc = G.bpRewards(G.s.bp.season).some(r => r.t <= G.bpTier() && (!G.s.bp.claimed[r.t + 'f'] || (G.s.bp.premium && !G.s.bp.claimed[r.t + 'p'])));
    $('[data-screen="pass"]').classList.toggle('dot', bpc || claimable);
    $('[data-screen="shop"]').classList.toggle('dot', G.s.daily !== Math.floor(Date.now() / SM.DAY));
  };
  UI.go = function (scr) {
    UI.screen = scr;
    $$('.nav button').forEach(b => b.classList.toggle('on', b.dataset.screen === scr));
    $$('.screen').forEach(s => s.hidden = s.id !== 'scr-' + scr);
    const f = UI.render[scr]; if (f) f();
    UI.wallet();
    SM.Audio.click();
  };
  UI.render = {};

  // ---------------------------------------------------------------- home
  UI.render.home = function () {
    const s = G.s, fac = SM.FACTION[s.faction];
    const lineup = G.lineup(s.faction);
    const feat = SM.getUnit(lineup.slice().sort((a, b) => (SM.getUnit(b).rank - SM.getUnit(a).rank) || (SM.getUnit(b).cp - SM.getUnit(a).cp))[0]) || SM.getUnit(lineup[0]);
    const el = $('#scr-home');
    const season = SM.SEASON_NAMES[((G.s.bp.season % SM.SEASON_NAMES.length) + SM.SEASON_NAMES.length) % SM.SEASON_NAMES.length];
    el.innerHTML = `
      <div class="home-grid">
        <div class="home-hero"><div class="hero-view" id="homeView"></div>
          <div class="hero-cap"><span class="eyebrow">${esc(fac.name)} · Featured</span><h2>${esc(feat.name)}</h2><p>${esc(SM.CLASSES[feat.cls].name)} · Rank ${SM.ROMAN[feat.rank]}</p></div>
        </div>
        <div class="home-side">
          <div class="panel deploy-panel">
            <span class="eyebrow">Deploy</span>
            <h2 class="big">Battle</h2>
            <div class="fac-pick">${SM.FACTIONS.map(f => `<button class="fac-btn${f.id === s.faction ? ' on' : ''}" data-fac="${f.id}" style="--fc:${f.hue}"><b>${f.short}</b><span>${esc(f.name)}</span></button>`).join('')}</div>
            <p class="muted small">${esc(fac.motto)} <span class="accent">${esc(fac.bonusText)}</span></p>
            <button class="btn primary huge" id="btnBattle">Choose map and deploy</button>
            <div class="lineup-mini">${lineup.map(id => { const u = SM.getUnit(id); return `<div class="lm" title="${esc(u.name)}"><img data-pid="${id}" alt=""><span>${SM.ROMAN[u.rank]}</span></div>`; }).join('')}</div>
            <button class="btn ghost" data-go="hangar">Edit lineup in Hangar</button>
          </div>
          <div class="panel">
            <span class="eyebrow">Daily orders</span>
            <div class="missions">${G.s.missions.list.map((m, i) => { const done = G.s.missions.claimed.indexOf(i) >= 0; return `<div class="mission${m.prog >= m.n ? ' ready' : ''}${done ? ' done' : ''}"><div><b>${esc(m.text)}</b><span>${m.prog}/${m.n} · +${m.xp} pass XP · +${fmt(m.cr)} cr</span><i style="width:${m.prog / m.n * 100}%"></i></div>${!done && m.prog >= m.n ? `<button class="btn small" data-claim-m="${i}">Claim</button>` : done ? '<em>Claimed</em>' : ''}</div>`; }).join('')}</div>
          </div>
          <div class="panel season-mini" data-go="pass"><span class="eyebrow">Battle Pass · ${esc(season)}</span><div class="bpbar"><i style="width:${(G.s.bp.xp % G.BP_XP) / G.BP_XP * 100}%"></i></div><span class="small">Tier ${G.bpTier()} / ${G.BP_TIERS} · ends in <span data-countdown="${SM.seasonEnds(Date.now())}"></span></span></div>
        </div>
      </div>`;
    UI.viewer.attach($('#homeView'));
    UI.viewer.show(feat, s.mods[feat.id], s.equip[feat.id]);
    $$('[data-pid]', el).forEach(img => { const u = SM.getUnit(img.dataset.pid); SM.portrait(u, s.mods[u.id], s.equip[u.id], url => img.src = url); });
    $$('.fac-btn', el).forEach(b => b.onclick = () => { s.faction = b.dataset.fac; G.save(); UI.render.home(); });
    $('#btnBattle').onclick = () => UI.battleSetup();
    $$('[data-claim-m]', el).forEach(b => b.onclick = () => { const m = G.claimMission(+b.dataset.claimM); if (m) { UI.toast('Order complete: +' + m.xp + ' pass XP, +' + fmt(m.cr) + ' credits', 'good'); SM.Audio.reward(1); } UI.render.home(); UI.wallet(); });
  };

  // ---------------------------------------------------------------- battle setup
  UI.battleSetup = function () {
    const s = G.s;
    const thumbs = SM.MAPS.map(m => `<button class="map-card${s.settings.lastMap === m.id ? ' on' : ''}" data-map="${m.id}"><canvas data-thumb="${m.id}" width="128" height="128"></canvas><b>${esc(m.name)}</b><span>${esc(SM.BIOMES[m.biome] ? m.biome : '')} · ${m.points} points${m.naval ? ' · naval' : ''}</span><em>${m.weather.map(w => SM.WEATHER[w].name).join(' · ')}</em></button>`).join('');
    const diffs = Object.keys(G.DIFF).map(k => `<button class="seg${s.settings.diff === k ? ' on' : ''}" data-diff="${k}">${G.DIFF[k].name}<small>×${G.DIFF[k].mult} rewards</small></button>`).join('');
    const enemies = SM.FACTIONS.filter(f => f.id !== s.faction);
    UI.modal(`<div class="setup"><div class="setup-head"><div><span class="eyebrow">Battle setup</span><h2>Choose a theatre</h2></div><button class="btn ghost" data-close>Close</button></div>
      <div class="map-grid"><button class="map-card${s.settings.lastMap === 'random' ? ' on' : ''}" data-map="random"><div class="rand">?</div><b>Random theatre</b><span>Any of the 32 maps</span></button>${thumbs}</div>
      <div class="setup-foot"><div><span class="eyebrow">Enemy commander</span><div class="segs">${diffs}</div></div>
      <div><span class="eyebrow">Opponent</span><div class="segs" id="oppSeg"><button class="seg on" data-opp="random">Random</button>${enemies.map(f => `<button class="seg" data-opp="${f.id}">${f.short}</button>`).join('')}</div></div>
      <div class="go"><span class="muted small" id="mapDesc"></span><button class="btn primary huge" id="btnGo">Deploy</button></div></div></div>`, 'wide');
    let map = s.settings.lastMap, opp = 'random';
    const desc = () => { const m = SM.MAP[map]; $('#mapDesc').textContent = m ? m.desc : 'A random theatre is picked when you deploy.'; };
    desc();
    $$('.map-card').forEach(b => b.onclick = () => { map = b.dataset.map; $$('.map-card').forEach(x => x.classList.toggle('on', x === b)); desc(); SM.Audio.click(); });
    $$('[data-diff]').forEach(b => b.onclick = () => { s.settings.diff = b.dataset.diff; $$('[data-diff]').forEach(x => x.classList.toggle('on', x === b)); G.save(); });
    $$('[data-opp]').forEach(b => b.onclick = () => { opp = b.dataset.opp; $$('[data-opp]').forEach(x => x.classList.toggle('on', x === b)); });
    $('#btnGo').onclick = () => { s.settings.lastMap = map; G.save(); UI.closeModal(); UI.startBattle(map === 'random' ? SM.MAPS[Math.floor(Math.random() * SM.MAPS.length)].id : map, opp); };
    // progressive thumbnails
    const list = $$('[data-thumb]'); let i = 0;
    const pump = () => { const t0 = performance.now(); while (i < list.length && performance.now() - t0 < 30) { const c = list[i++]; const src = UI.thumbCache[c.dataset.thumb] || (UI.thumbCache[c.dataset.thumb] = SM.mapThumb(SM.MAP[c.dataset.thumb], 128)); c.getContext('2d').drawImage(src, 0, 0); } if (i < list.length && !$('#modal').hidden) requestAnimationFrame(pump); };
    requestAnimationFrame(pump);
  };
  UI.thumbCache = {};

  UI.startBattle = function (mapId, opp, extra) {
    const s = G.s;
    const fac = s.faction;
    const enemy = opp && opp !== 'random' ? opp : SM.FACTIONS.filter(f => f.id !== fac)[Math.floor(Math.random() * 3)].id;
    const lineup = G.lineupEntries(fac);
    if (!lineup.length) { UI.toast('Your lineup is empty. Add units in the Hangar.', 'bad'); return; }
    const avg = lineup.reduce((a, e) => a + SM.getUnit(e.id).rank, 0) / lineup.length;
    const diff = G.DIFF[s.settings.diff] || G.DIFF.veteran;
    const map = SM.MAP[mapId];
    $('#loading').hidden = false;
    $('#loadMap').textContent = map.name; $('#loadDesc').textContent = map.desc;
    $('#loadTip').textContent = SM.TIPS[Math.floor(Math.random() * SM.TIPS.length)];
    const lc = $('#loadThumb'); lc.getContext('2d').drawImage(UI.thumbCache[mapId] || (UI.thumbCache[mapId] = SM.mapThumb(map, 128)), 0, 0, lc.width, lc.height);
    setTimeout(() => {
      try {
        if (!UI.br) {
          UI.br = new T.WebGLRenderer({ antialias: s.settings.quality !== 'low', powerPreference: 'high-performance' });
          UI.br.outputEncoding = T.sRGBEncoding; UI.br.toneMapping = T.ACESFilmicToneMapping; UI.br.toneMappingExposure = 1.0;
          UI.br.shadowMap.enabled = true; UI.br.shadowMap.type = T.PCFSoftShadowMap;
        }
        UI.br.shadowMap.enabled = s.settings.quality !== 'low';
        const root = $('#battle-root');
        root.hidden = false; $('#app').hidden = true;
        const b = new SM.Battle(Object.assign({
          renderer: UI.br, root, mapId, playerFaction: fac, enemyFaction: enemy, lineup,
          enemyLineup: G.enemyLineup(enemy, avg, diff, !!map.naval), diff, strats: G.stratEntries(), enemyStrats: G.enemyStrats(diff), quality: s.settings.quality, resScale: s.settings.res, edgePan: s.settings.edgePan,
          onEnd: res => UI.endBattle(res, lineup),
        }, extra || {}));
        b.init();
        UI.battle = b; UI.battleDiff = s.settings.diff;
        $('#loading').hidden = true;
        UI.lastT = 0;
      } catch (err) {
        console.error(err);
        $('#loading').hidden = true; $('#battle-root').hidden = true; $('#app').hidden = false;
        UI.toast('Could not start the battle: ' + err.message, 'bad');
      }
    }, 60);
  };

  UI.endBattle = function (res, lineup) {
    const b = UI.battle;
    const rw = G.computeRewards(res, lineup, UI.battleDiff);
    G.applyRewards(res, rw);
    const st = res.stats;
    const units = Object.keys(rw.unitXp).map(id => SM.getUnit(id)).filter(Boolean);
    const mm = Math.floor(res.time / 60), ss = Math.floor(res.time % 60);
    UI.modal(`<div class="result ${res.win ? 'win' : 'loss'}"><span class="eyebrow">${esc(SM.MAP[res.map].name)} · ${mm}:${ss < 10 ? '0' : ''}${ss}</span><h1>${res.win ? 'Victory' : 'Defeat'}</h1><p class="muted">${esc(res.reason)}</p>
      <div class="res-stats"><div><b>${st.kills[0]}</b><span>Enemies destroyed</span></div><div><b>${st.losses[0]}</b><span>Units lost</span></div><div><b>${st.captures[0]}</b><span>Points captured</span></div><div><b>${Math.round(st.dmg[0])}</b><span>Damage dealt</span></div></div>
      <div class="res-rew"><div><b>+${fmt(rw.rp)}</b><span>Research</span></div><div><b>+${fmt(rw.credits)}</b><span>Credits</span></div><div><b>+${rw.cores}</b><span>Cores</span></div><div><b>+${fmt(rw.bpxp)}</b><span>Pass XP</span></div><div><b>+${fmt(rw.freeXp)}</b><span>Free XP</span></div></div>
      ${rw.boost > 1 ? `<p class="accent small">XP booster ×${rw.boost} applied.</p>` : ''}
      <div class="res-units">${units.map(u => `<div><img data-pid="${u.id}" alt=""><b>${esc(u.name)}</b><span>+${fmt(rw.unitXp[u.id])} unit XP</span></div>`).join('')}</div>
      <button class="btn primary huge" data-close>Return to command</button></div>`, 'wide');
    $$('#modal [data-pid]').forEach(img => { const u = SM.getUnit(img.dataset.pid); SM.portrait(u, G.s.mods[u.id], G.s.equip[u.id], url => img.src = url); });
    SM.Audio.reward(res.win ? 3 : 0);
    UI.onModalClose = () => UI.leaveBattle();
  };
  UI.leaveBattle = function () {
    if (UI.battle) { try { UI.battle.dispose(); } catch (e) { console.warn(e); } UI.battle = null; }
    const root = $('#battle-root'); root.innerHTML = ''; root.hidden = true; $('#app').hidden = false;
    UI.go('home');
  };

  // ---------------------------------------------------------------- hangar
  UI.render.hangar = function () {
    const s = G.s, fac = s.faction;
    const owned = Object.keys(s.owned).map(SM.getUnit).filter(u => u && u.fac === fac).sort((a, b) => (SM.BRANCHES.findIndex(x => x.id === a.branch) - SM.BRANCHES.findIndex(x => x.id === b.branch)) || a.rank - b.rank);
    const list = owned.filter(u => UI.hangarBranch === 'all' || u.branch === UI.hangarBranch);
    if (!UI.hangarSel || !s.owned[UI.hangarSel] || SM.getUnit(UI.hangarSel).fac !== fac) UI.hangarSel = (list[0] || owned[0] || {}).id;
    const u = SM.getUnit(UI.hangarSel);
    const el = $('#scr-hangar');
    const L = s.lineups[fac] || [];
    el.innerHTML = `
      <div class="hangar">
        <aside class="h-list">
          <div class="fac-tabs">${SM.FACTIONS.map(f => `<button class="${f.id === fac ? 'on' : ''}" data-hfac="${f.id}" style="--fc:${f.hue}">${f.short}</button>`).join('')}</div>
          <div class="br-tabs"><button class="${UI.hangarBranch === 'all' ? 'on' : ''}" data-hbr="all">All</button>${SM.BRANCHES.map(b => `<button class="${UI.hangarBranch === b.id ? 'on' : ''}" data-hbr="${b.id}">${b.name}</button>`).join('')}</div>
          <div class="h-units">${list.map(x => `<button class="hu${x.id === UI.hangarSel ? ' on' : ''}${L.indexOf(x.id) >= 0 ? ' in' : ''}${x.exclusive ? ' ex' : ''}" data-hu="${x.id}"><img data-pid="${x.id}" alt=""><span class="r">${SM.ROMAN[x.rank]}</span><b>${esc(x.name)}</b><small>${esc(SM.CLASSES[x.cls].name)}</small></button>`).join('') || '<p class="muted">No units in this branch yet. Research them in the Research tab.</p>'}</div>
        </aside>
        <section class="h-view"><div class="viewport" id="hangarView"></div>${u ? UI.unitHeader(u) : ''}
          <div class="lineup-bar"><span class="eyebrow">Lineup · ${L.length}/10</span><div class="lb">${L.map(id => { const x = SM.getUnit(id); return `<button class="lbs" data-hu="${id}" title="${esc(x.name)}"><img data-pid="${id}" alt=""><span>${x.cp}</span></button>`; }).join('')}${'<div class="lbs empty"></div>'.repeat(Math.max(0, 10 - L.length))}</div></div>
        </section>
        <aside class="h-detail">${u ? UI.unitDetail(u) : ''}</aside>
      </div>`;
    if (u) { UI.viewer.attach($('#hangarView')); UI.viewer.show(u, s.mods[u.id], s.equip[u.id]); }
    $$('[data-pid]', el).forEach(img => { const x = SM.getUnit(img.dataset.pid); SM.portrait(x, s.mods[x.id], s.equip[x.id], url => img.src = url); });
    $$('[data-hfac]', el).forEach(b => b.onclick = () => { s.faction = b.dataset.hfac; G.save(); UI.render.hangar(); });
    $$('[data-hbr]', el).forEach(b => b.onclick = () => { UI.hangarBranch = b.dataset.hbr; UI.render.hangar(); });
    $$('[data-hu]', el).forEach(b => b.onclick = () => { UI.hangarSel = b.dataset.hu; UI.render.hangar(); SM.Audio.click(); });
    UI.bindDetail(el, u, () => UI.render.hangar());
  };
  UI.unitHeader = function (u) {
    const cls = SM.CLASSES[u.cls];
    return `<div class="unit-head"><span class="eyebrow">${esc(SM.FACTION[u.fac].name)} · ${esc(SM.BRANCHES.find(b => b.id === u.branch).name)}${u.exclusive ? ' · <span class="gold">Exclusive</span>' : ''}</span><h2>${esc(u.name)}</h2><p>${esc(cls.name)} · Rank ${SM.ROMAN[u.rank]} — ${esc(cls.role)}</p></div>`;
  };
  UI.statBars = function (u, mods, skin) {
    const fake = { teams: [{ accMul: 1 }] };
    const st = SM.Battle.prototype.calcStats.call(fake, u, mods, skin, 0);
    const rows = [['Hull', st.hp, 6000], ['Armor', st.armor, 220], ['Damage', st.dmg, 420], ['Penetration', st.pen, 280], ['Fire rate', st.rof, 5], ['Range', st.range, 220], ['Speed', st.speed, 60], ['Sight', st.sight, 170], ['Accuracy', st.acc * 100, 100]];
    return `<div class="stats">${rows.map(r => `<div class="st"><span>${r[0]}</span><i><em style="width:${Math.min(100, r[1] / r[2] * 100)}%"></em></i><b>${r[0] === 'Fire rate' ? r[1].toFixed(2) + '/s' : Math.round(r[1])}</b></div>`).join('')}</div>`;
  };
  UI.unitDetail = function (u) {
    const s = G.s, mods = s.mods[u.id] || [], skin = s.equip[u.id] || null;
    const cls = SM.CLASSES[u.cls];
    const abil = SM.unitAbilities(u, mods);
    const all = cls.abil;
    const inL = (s.lineups[u.fac] || []).indexOf(u.id) >= 0;
    const tiers = [1, 2, 3, 4, 5].map(t => `<div class="mod-tier"><span class="t">T${t}</span>${u.mods.filter(m => m.tier === t).map(m => { const stt = G.modStatus(u, m.id); return `<button class="mod ${stt}" data-mod="${m.id}" ${stt !== 'open' ? 'disabled' : ''}><b>${esc(m.name)}</b><span>${esc(m.desc)}</span><em>${stt === 'done' ? 'Installed' : fmt(m.cost) + ' XP'}</em></button>`; }).join('')}</div>`).join('');
    const owned = ['factory'].concat(s.skins[u.id] || []);
    const skins = u.finish ? `<p class="muted small">Exclusive finish: ${esc(SM.SKINS[u.finish] ? SM.SKINS[u.finish].name : u.finish)}. ${SM.skinAttrText(SM.skinAttrs(u.id, u.finish)).join(', ')}</p>` :
      `<div class="skins">${owned.map(p => { const a = SM.skinAttrText(SM.skinAttrs(u.id, p)); return `<button class="skin${(skin || 'factory') === p ? ' on' : ''}" data-skin="${p}" title="${esc(SM.SKINS[p].name + (a.length ? ' — ' + a.join(', ') : ''))}" style="--rc:${SM.RARITY[SM.SKINS[p].rarity].color}"><img src="${SM.skinSwatch(p, u.fac)}" alt=""><span>${esc(SM.SKINS[p].name)}</span>${a.length ? `<em>${esc(a.join(' · '))}</em>` : ''}</button>`; }).join('')}</div><p class="muted small">More skins come from the Shop, Crates and the Battle Pass.</p>`;
    return `<div class="detail">
      <div class="row-btns"><button class="btn ${inL ? 'ghost' : 'primary'}" data-lineup="${u.id}">${inL ? 'Remove from lineup' : 'Add to lineup'}</button></div>
      <div class="kv"><span>Deploy cost</span><b>${u.cp} CP · ${cls.pop} pop</b></div>
      <div class="kv"><span>Weapon</span><b>${esc(SM.WEAPON_NAMES[u.wt])}${cls.aa === 2 ? ' · anti-air' : cls.aa === 1 ? ' · can hit helicopters' : ''}</b></div>
      <div class="kv"><span>Unit XP</span><b>${fmt(s.unitXp[u.id] || 0)} <small class="muted">+ ${fmt(s.freeXp)} free</small></b></div>
      ${UI.statBars(u, mods, skin)}
      <h4>Abilities</h4><div class="abils">${all.map(a => `<div class="abl${abil.indexOf(a) >= 0 ? '' : ' lock'}"><b>${SM.ABILITIES[a].icon}</b><div><strong>${esc(SM.ABILITIES[a].name)}</strong><span>${esc(SM.ABILITIES[a].desc)}</span></div></div>`).join('')}</div>
      <h4>Modifications</h4><div class="mods">${tiers}</div>
      <h4>Camouflage</h4>${skins}
    </div>`;
  };
  UI.bindDetail = function (el, u, rerender) {
    if (!u) return;
    $$('[data-mod]', el).forEach(b => b.onclick = () => { const e = G.researchMod(u, b.dataset.mod); if (e) UI.toast(e, 'bad'); else { UI.toast('Modification installed', 'good'); SM.Audio.reward(0); } rerender(); UI.wallet(); });
    $$('[data-skin]', el).forEach(b => b.onclick = () => { G.s.equip[u.id] = b.dataset.skin === 'factory' ? null : b.dataset.skin; G.save(); rerender(); });
    $$('[data-lineup]', el).forEach(b => b.onclick = () => { const e = G.toggleLineup(u.id); if (e) UI.toast(e, 'bad'); rerender(); });
  };
  SM.WEAPON_NAMES = { mg: 'Machine guns', auto: 'Autocannon', cannon: 'Cannon', rocket: 'Rockets', missile: 'Guided missiles', rail: 'Railgun', laser: 'Laser', plasma: 'Plasma cannon', arty: 'Artillery', torpedo: 'Torpedoes', bomb: 'Bombs' };

  // ---------------------------------------------------------------- research tree
  UI.render.research = function () {
    const s = G.s, fac = UI.fac || s.faction, br = UI.branch;
    const lines = SM.TREE[fac][br];
    const el = $('#scr-research');
    const total = SM.UNIT_LIST.filter(u => u.fac === fac && !u.exclusive).length, have = SM.UNIT_LIST.filter(u => u.fac === fac && !u.exclusive && s.owned[u.id]).length;
    el.innerHTML = `<div class="research">
      <div class="r-head"><div class="fac-tabs big">${SM.FACTIONS.map(f => `<button class="${f.id === fac ? 'on' : ''}" data-rfac="${f.id}" style="--fc:${f.hue}">${f.short}<small>${esc(f.name)}</small></button>`).join('')}</div>
        <div class="r-info"><span>${have}/${total} units owned</span><span>RP <b>${fmt(s.rp)}</b> · Free XP <b>${fmt(s.freeXp)}</b></span></div></div>
      <div class="br-tabs big">${SM.BRANCHES.map(b => `<button class="${br === b.id ? 'on' : ''}" data-rbr="${b.id}">${b.name}</button>`).join('')}</div>
      <div class="tree-wrap"><div class="tree" style="--cols:${lines.length}">
        <div class="corner"></div>${lines.map(l => `<div class="line-name">${esc(l.line.name)}</div>`).join('')}
        ${[1, 2, 3, 4, 5, 6, 7].map(rk => `<div class="rank">${SM.ROMAN[rk]}</div>` + lines.map(l => `<div class="cell${rk === 7 ? ' last' : ''}">${l.nodes.filter(id => SM.getUnit(id).rank === rk).map(id => UI.node(id)).join('')}</div>`).join('')).join('')}
      </div></div></div>`;
    $$('[data-rfac]', el).forEach(b => b.onclick = () => { UI.fac = b.dataset.rfac; UI.render.research(); });
    $$('[data-rbr]', el).forEach(b => b.onclick = () => { UI.branch = b.dataset.rbr; UI.render.research(); });
    $$('[data-node]', el).forEach(b => b.onclick = () => UI.nodeModal(b.dataset.node));
    const imgs = $$('[data-pid]', el);
    imgs.forEach(img => { const u = SM.getUnit(img.dataset.pid); SM.portrait(u, s.mods[u.id], s.equip[u.id], url => img.src = url); });
  };
  UI.node = function (id) {
    const u = SM.getUnit(id), st = G.status(id), cls = SM.CLASSES[u.cls];
    const cost = st === 'research' || st === 'locked' ? fmt(u.rp) + ' RP' : st === 'buy' ? fmt(u.price) + ' cr' : 'Owned';
    return `<button class="node ${st}" data-node="${id}"><img data-pid="${id}" alt=""><b>${esc(u.name)}</b><small>${esc(cls.name)}</small><em>${cost}</em></button>`;
  };
  UI.nodeModal = function (id) {
    const u = SM.getUnit(id), st = G.status(id), s = G.s;
    const parent = u.parent ? SM.getUnit(u.parent) : null;
    let act = '';
    if (st === 'research') act = `<button class="btn primary" id="nAct">Research for ${fmt(u.rp)} RP</button>`;
    else if (st === 'buy') act = `<button class="btn primary" id="nAct">Purchase for ${fmt(u.price)} credits</button>`;
    else if (st === 'owned') act = `<button class="btn primary" id="nAct">Open in Hangar</button>`;
    else act = `<p class="muted">Requires ${parent ? esc(parent.name) : 'the previous unit'} to be researched.</p>`;
    UI.modal(`<div class="node-modal"><div class="nm-view" id="nmView"><img data-pid="${id}" alt=""></div><div class="nm-body">${UI.unitHeader(u)}${UI.statBars(u, [], null)}
      <div class="abils">${SM.CLASSES[u.cls].abil.map((a, i) => `<div class="abl${i ? ' lock' : ''}"><b>${SM.ABILITIES[a].icon}</b><div><strong>${esc(SM.ABILITIES[a].name)}</strong><span>${i ? 'Unlock with modifications' : esc(SM.ABILITIES[a].desc)}</span></div></div>`).join('')}</div>
      <div class="row-btns">${act}<button class="btn ghost" data-close>Close</button></div></div></div>`);
    const img = $('#modal [data-pid]'); SM.portrait(u, [], null, url => img.src = url);
    const b = $('#nAct');
    if (b) b.onclick = () => {
      if (st === 'owned') { UI.closeModal(); UI.hangarSel = id; G.s.faction = u.fac; UI.go('hangar'); return; }
      const e = st === 'research' ? G.research(id) : G.buy(id);
      if (e) UI.toast(e, 'bad'); else { UI.toast(st === 'research' ? u.name + ' researched' : u.name + ' purchased', 'good'); SM.Audio.reward(1); if (st === 'buy') { const L = s.lineups[u.fac]; if (L.length < 10) { L.push(id); G.save(); } } }
      UI.closeModal(); UI.render.research(); UI.wallet();
    };
  };

  // ---------------------------------------------------------------- shop
  UI.render.shop = function () {
    const now = Date.now(), s = G.s;
    const gw = G.giveaways(now), sk = G.skinOffers(now), fl = G.flashOffers(now);
    const el = $('#scr-shop');
    const daily = s.daily !== Math.floor(now / SM.DAY);
    el.innerHTML = `<div class="shop">
      <div class="shop-row">
        <div class="panel flash"><div class="ph"><div><span class="eyebrow hot">Flash sale</span><h3>Refreshes twice a day</h3></div><span class="timer">Next drop in <b data-countdown="${SM.flashEnds(now)}"></b></span></div>
          <div class="offers">${fl.map(o => UI.offer(o)).join('')}</div></div>
        <div class="panel daily"><span class="eyebrow">Supply drop</span><h3>Daily ration</h3><p class="muted small">15,000 credits and 60 cores, once a day.</p><button class="btn ${daily ? 'primary' : 'ghost'}" id="dailyBtn" ${daily ? '' : 'disabled'}>${daily ? 'Claim' : 'Claimed today'}</button>
          <hr><span class="eyebrow">Exchange</span><p class="muted small">Convert credits into cores at the quartermaster's rate.</p><button class="btn" id="exBtn">50,000 credits → 40 cores</button></div>
      </div>
      <div class="panel"><div class="ph"><div><span class="eyebrow gold">Limited giveaway</span><h3>One-off vehicles you will not find in any tech tree</h3></div><span class="timer">Leaves in <b data-countdown="${gw[0].ends}"></b></span></div>
        <div class="giveaways">${gw.map(g => `<div class="gw${s.owned[g.id] ? ' owned' : ''}"><div class="gw-img"><img data-pid="${g.id}" alt=""></div><div class="gw-body"><span class="eyebrow">${esc(SM.FACTION[g.unit.fac].name)} · ${esc(SM.CLASSES[g.unit.cls].name)} · Rank ${SM.ROMAN[g.unit.rank]}</span><h3>${esc(g.unit.name)}</h3><p class="muted small">Finish: ${esc(SM.SKINS[g.unit.finish].name)}. All abilities unlocked, +15% to core stats. ${esc(SM.skinAttrText(SM.skinAttrs(g.id, g.unit.finish)).join(', '))}</p>
          <div class="gw-stats"><span>HP ${g.unit.hp}</span><span>DMG ${g.unit.dmg}</span><span>PEN ${g.unit.pen}</span><span>ARM ${g.unit.armor}</span></div>
          ${s.owned[g.id] ? '<b class="owned-tag">Owned</b>' : `<button class="btn gold" data-gw="${g.id}" data-price="${g.price}">${fmt(g.price)} cores</button>`}</div></div>`).join('')}</div></div>
      <div class="panel"><div class="ph"><div><span class="eyebrow">Camouflage showcase</span><h3>Skins for specific units, with real stat bonuses</h3></div><span class="timer">Rotates in <b data-countdown="${(Math.floor(now / SM.DAY) + 1) * SM.DAY}"></b></span></div>
        <div class="offers skins-grid">${sk.map(o => UI.offer(Object.assign({ kind: 'skin' }, o))).join('')}</div></div>
      <div class="panel"><span class="eyebrow">Boosters</span><div class="offers">${SM.XP_BOOSTS.map((b, i) => UI.offer({ key: 'boost' + i, kind: 'boost', boost: b, price: [500, 650, 300][i], cur: 'cores', perm: true })).join('')}</div></div>
    </div>`;
    $$('[data-pid]', el).forEach(img => { const u = SM.getUnit(img.dataset.pid); SM.portrait(u, [], null, url => img.src = url); });
    $('#dailyBtn').onclick = () => { const r = G.claimDaily(Date.now()); if (r) { UI.toast('+15,000 credits, +60 cores', 'good'); SM.Audio.reward(1); } UI.render.shop(); UI.wallet(); };
    $('#exBtn').onclick = () => { if (!G.spend('credits', 50000)) { UI.toast('Not enough credits', 'bad'); return; } G.s.cores += 40; G.save(); UI.toast('+40 cores', 'good'); UI.wallet(); };
    $$('[data-gw]', el).forEach(b => b.onclick = () => UI.confirmBuy(`Buy ${SM.getUnit(b.dataset.gw).name} for ${fmt(+b.dataset.price)} cores?`, () => { if (!G.spend('cores', +b.dataset.price)) return 'Not enough cores. Earn them in battle, from orders, the battle pass and the daily drop.'; G.grantUnit(b.dataset.gw); const u = SM.getUnit(b.dataset.gw); const L = G.s.lineups[u.fac]; if (L.length < 10) L.push(u.id); G.save(); SM.Audio.reward(4); return null; }));
    $$('[data-offer]', el).forEach(b => b.onclick = () => UI.buyOffer(b.dataset.offer, [...fl, ...sk.map(o => Object.assign({ kind: 'skin' }, o)), ...SM.XP_BOOSTS.map((x, i) => ({ key: 'boost' + i, kind: 'boost', boost: x, price: [500, 650, 300][i], cur: 'cores', perm: true }))]));
    $$('[data-sw]', el).forEach(img => img.src = SM.skinSwatch(img.dataset.sw, img.dataset.fac));
  };
  UI.offer = function (o) {
    const s = G.s;
    let title, sub, art, owned = false;
    if (o.kind === 'skin') { const a = SM.skinAttrText(SM.skinAttrs(o.unit.id, o.pattern)); title = SM.SKINS[o.pattern].name; sub = 'for ' + o.unit.name + (a.length ? '<br><span class="accent">' + esc(a.join(' · ')) + '</span>' : ''); art = `<img data-sw="${o.pattern}" data-fac="${o.unit.fac}" alt="">`; owned = (s.skins[o.unit.id] || []).indexOf(o.pattern) >= 0; }
    else if (o.kind === 'boost') { title = o.boost.name; sub = 'Multiplies research and unit XP for ' + o.boost.battles + ' battles'; art = `<div class="art-boost">×${o.boost.mult}</div>`; }
    else if (o.kind === 'unlock') { title = 'Quick Unlock'; sub = esc(o.unit.name) + '<br><span class="muted">' + esc(SM.FACTION[o.unit.fac].short + ' · ' + SM.CLASSES[o.unit.cls].name + ' · Rank ' + SM.ROMAN[o.unit.rank]) + '</span>'; art = `<img data-pid="${o.unit.id}" alt="">`; owned = !!s.owned[o.unit.id]; }
    else if (o.kind === 'credits') { title = fmt(o.amount) + ' credits'; sub = 'War chest'; art = '<div class="art-boost">CR</div>'; }
    const bought = !o.perm && !!s.flash[o.key];
    const rar = o.kind === 'skin' ? SM.RARITY[SM.SKINS[o.pattern].rarity] : null;
    return `<div class="offer${bought || owned ? ' done' : ''}" ${rar ? `style="--rc:${rar.color}"` : ''}>${o.off ? `<span class="off">-${Math.round(o.off * 100)}%</span>` : ''}<div class="o-art">${art}</div><div class="o-body"><b>${esc(title)}</b>${rar ? `<span class="rar" style="color:${rar.color}">${rar.name}</span>` : ''}<span class="o-sub">${o.kind === 'skin' || o.kind === 'unlock' ? sub : esc(sub)}</span></div>
      <div class="o-buy">${o.base ? `<s>${fmt(o.base)}</s>` : ''}<button class="btn small ${bought || owned ? 'ghost' : 'primary'}" data-offer="${o.key}" ${bought || owned ? 'disabled' : ''}>${bought ? 'Bought' : owned ? 'Owned' : fmt(o.price) + ' ◆'}</button></div></div>`;
  };
  UI.confirmBuy = function (text, fn) {
    UI.modal(`<div class="confirm"><h3>${esc(text)}</h3><div class="row-btns"><button class="btn primary" id="cfYes">Buy</button><button class="btn ghost" data-close>Cancel</button></div></div>`);
    $('#cfYes').onclick = () => { const e = fn(); if (e) UI.toast(e, 'bad'); else UI.toast('Purchase complete', 'good'); UI.closeModal(); UI.render[UI.screen](); UI.wallet(); };
  };
  UI.buyOffer = function (key, all) {
    const o = all.find(x => x.key === key); if (!o) return;
    const label = o.kind === 'skin' ? SM.SKINS[o.pattern].name + ' for ' + o.unit.name : o.kind === 'unlock' ? 'Quick Unlock: ' + o.unit.name : o.kind === 'boost' ? o.boost.name : fmt(o.amount) + ' credits';
    UI.confirmBuy(`Buy ${label} for ${fmt(o.price)} cores?`, () => {
      if (!o.perm && G.s.flash[o.key]) return 'Already bought.';
      if (!G.spend('cores', o.price)) return 'Not enough cores.';
      if (o.kind === 'skin') { G.giveSkin(o.unit.id, o.pattern); G.s.equip[o.unit.id] = o.pattern; }
      else if (o.kind === 'boost') G.addBooster(o.boost);
      else if (o.kind === 'unlock') G.grantUnit(o.unit.id);
      else if (o.kind === 'credits') G.s.credits += o.amount;
      if (!o.perm && /^f\d/.test(o.key)) G.s.flash[o.key] = true;
      // prune old flash keys
      const idx = SM.flashIndex(Date.now());
      Object.keys(G.s.flash).forEach(k => { const m = /^f(\d+)/.exec(k); if (m && +m[1] < idx - 2) delete G.s.flash[k]; });
      G.save(); SM.Audio.reward(1); return null;
    });
  };

  // ---------------------------------------------------------------- crates
  UI.render.crates = function () {
    const s = G.s, el = $('#scr-crates');
    const free = s.freeCrates || {};
    el.innerHTML = `<div class="crates"><div class="ph"><div><span class="eyebrow">Lucky draws</span><h2>Supply crates</h2><p class="muted">Rarer crates cost more and draw from better pools. Exact odds are listed on every crate. Duplicates convert to credits.</p></div></div>
      <div class="crate-grid">${SM.CRATES.map(c => `<div class="crate" style="--cc:${c.color}"><div class="crate-art"><div class="box3d"><i></i><i></i><i></i></div></div><h3>${esc(c.name)}</h3><p class="muted small">${esc(c.desc)}</p>
        <table class="odds">${c.odds.map((o, i) => o > 0 ? `<tr><td style="color:${SM.RARITY[i].color}">${SM.RARITY[i].name}</td><td>${o}%</td></tr>` : '').join('')}</table>
        ${free[c.id] ? `<button class="btn primary" data-open="${c.id}" data-free="1">Open free (${free[c.id]})</button>` : ''}
        <button class="btn ${c.cur === 'cores' ? 'gold' : 'primary'}" data-open="${c.id}">${fmt(c.price)} ${c.cur === 'cores' ? 'cores' : 'credits'}</button></div>`).join('')}</div>
      <div class="panel"><span class="eyebrow">Crate-exclusive vehicles</span><p class="muted small">Thirty one-of-a-kind machines exist only in Legendary and Mythic drops. You own ${Array.from({ length: 30 }, (_, i) => s.owned['cr_' + i] ? 1 : 0).reduce((a, b) => a + b, 0)} of 30.</p>
        <div class="excl-row">${Array.from({ length: 30 }, (_, i) => 'cr_' + i).map(id => `<div class="ex${s.owned[id] ? ' have' : ''}" title="${esc(SM.getUnit(id).name)}"><img data-pid="${id}" alt=""></div>`).join('')}</div></div></div>`;
    $$('[data-pid]', el).forEach(img => { const u = SM.getUnit(img.dataset.pid); SM.portrait(u, [], null, url => img.src = url); });
    $$('[data-open]', el).forEach(b => b.onclick = () => UI.openCrate(b.dataset.open, !!b.dataset.free));
  };
  UI.openCrate = function (id, free) {
    const c = SM.CRATES.find(x => x.id === id), s = G.s;
    if (free) { if (!(s.freeCrates && s.freeCrates[id] > 0)) return; s.freeCrates[id]--; }
    else if (!G.spend(c.cur, c.price)) { UI.toast('Not enough ' + (c.cur === 'cores' ? 'cores' : 'credits'), 'bad'); return; }
    const item = G.crateRoll(c);
    const strip = [];
    for (let i = 0; i < 46; i++) strip.push(i === 40 ? item : G.crateItem(UI.fillerRarity(c), Math.random));
    const art = it => it.kind === 'skin' ? `<img src="${SM.skinSwatch(it.pattern, it.unit.fac)}" alt="">` : it.kind === 'unit' || it.kind === 'unlock' || it.kind === 'cust' ? `<img data-pid="${it.unit.id}" alt="">` : it.kind === 'strat' || it.kind === 'stratUp' ? `<div class="art-boost strat-art" style="--bc:${SM.STRAT_BRANCHES.find(b => b.id === SM.STRAT[it.strat].br).color}">${UI.stratIcon(SM.STRAT[it.strat])}</div>` : `<div class="art-boost">${it.kind === 'credits' ? 'CR' : it.kind === 'cores' ? '◆' : '×' + it.boost.mult}</div>`;
    UI.modal(`<div class="opening"><span class="eyebrow">${esc(c.name)}</span><div class="reel"><div class="marker"></div><div class="strip" id="strip">${strip.map(it => `<div class="ri" style="--rc:${SM.RARITY[it.rar].color}">${art(it)}<span>${esc(it.label)}</span></div>`).join('')}</div></div><div class="reveal" id="reveal" hidden></div></div>`, 'wide');
    $$('#modal [data-pid]').forEach(img => { const u = SM.getUnit(img.dataset.pid); SM.portrait(u, [], null, url => img.src = url); });
    const st = $('#strip');
    const w = 132, target = 40 * w - ($('.reel').clientWidth / 2 - w / 2) + (Math.random() - 0.5) * 60;
    st.style.transform = 'translateX(0)';
    let t0 = null; const dur = 5200;
    const step = ts => {
      if (!t0) t0 = ts;
      const k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      st.style.transform = 'translateX(' + (-target * e) + 'px)';
      if (Math.floor(target * e / w) !== UI._lastTick) { UI._lastTick = Math.floor(target * e / w); SM.Audio.tick(); }
      if (k < 1 && !$('#modal').hidden) requestAnimationFrame(step); else done();
    };
    const done = () => {
      const text = G.grant(item); G.save(); UI.wallet();
      const r = $('#reveal'); if (!r) return;
      r.hidden = false;
      r.innerHTML = `<div class="rv" style="--rc:${SM.RARITY[item.rar].color}"><span class="rar">${SM.RARITY[item.rar].name}</span><div class="rv-art">${art(item)}</div><h3>${esc(text)}</h3>${item.kind === 'skin' ? `<p class="muted small">${esc(SM.skinAttrText(SM.skinAttrs(item.unit.id, item.pattern)).join(' · '))}</p>` : ''}<div class="row-btns"><button class="btn primary" id="again">Open another</button><button class="btn ghost" data-close>Done</button></div></div>`;
      $$('#reveal [data-pid]').forEach(img => { const u = SM.getUnit(img.dataset.pid); SM.portrait(u, [], null, url => img.src = url); });
      SM.Audio.reward(item.rar);
      $('#again').onclick = () => { UI.closeModal(); UI.openCrate(id); };
      UI.onModalClose = () => UI.render.crates();
    };
    requestAnimationFrame(step);
  };
  UI.fillerRarity = function (c) { let r = Math.random() * 100; for (let i = 0; i < c.odds.length; i++) { r -= c.odds[i]; if (r <= 0) return i; } return 0; };

  // ---------------------------------------------------------------- battle pass
  UI.render.pass = function () {
    G.refreshSeason();
    const s = G.s, now = Date.now(), season = s.bp.season;
    const name = SM.SEASON_NAMES[((season % SM.SEASON_NAMES.length) + SM.SEASON_NAMES.length) % SM.SEASON_NAMES.length];
    const tier = G.bpTier(), rw = G.bpRewards(season);
    const el = $('#scr-pass');
    const cell = (r, track) => {
      const x = track === 'p' ? r.prem : r.free;
      const key = r.t + track, claimed = s.bp.claimed[key], ok = tier >= r.t && (track === 'f' || s.bp.premium);
      let art = '';
      if (x.kind === 'unit') art = `<img data-pid="${x.unitId}" alt="">`;
      else if (x.kind === 'skinPick') art = `<img src="${SM.skinSwatch(x.pattern, s.faction)}" alt="">`;
      else art = `<div class="art-boost">${x.kind === 'credits' ? 'CR' : x.kind === 'cores' ? '◆' : x.kind === 'crate' ? '▣' : x.kind === 'stratPick' ? '⌖' : x.kind === 'custPick' ? '✦' : '×' + x.boost.mult}</div>`;
      const label = x.kind === 'unit' ? SM.getUnit(x.unitId).name : x.kind === 'skinPick' ? SM.SKINS[x.pattern].name : x.kind === 'credits' ? fmt(x.amount) + ' cr' : x.kind === 'cores' ? x.amount + ' cores' : x.label;
      return `<button class="bp-c ${track}${claimed ? ' got' : ok ? ' ready' : ''}${x.kind === 'unit' ? ' veh' : ''}" data-bp="${r.t}" data-track="${track}" ${!ok || claimed ? 'disabled' : ''} title="${esc(label)}">${art}<span>${esc(label)}</span></button>`;
    };
    const vehs = [];
    rw.forEach(r => { if (r.free.kind === 'unit') vehs.push(r.free.unitId); if (r.prem.kind === 'unit') vehs.push(r.prem.unitId); });
    el.innerHTML = `<div class="pass">
      <div class="pass-head"><div><span class="eyebrow">Season ${season + 1} · new season every two weeks</span><h2>${esc(name)}</h2><p class="muted">Ends in <b data-countdown="${SM.seasonEnds(now)}"></b>. Earn pass XP from battles and daily orders.</p></div>
        <div class="pass-prog"><b>Tier ${tier}</b><div class="bpbar big"><i style="width:${tier >= G.BP_TIERS ? 100 : (s.bp.xp % G.BP_XP) / G.BP_XP * 100}%"></i></div><span>${fmt(s.bp.xp % G.BP_XP)} / ${fmt(G.BP_XP)} XP</span>
          <div class="row-btns">${s.bp.premium ? '<span class="tag gold">Premium track unlocked</span>' : '<button class="btn gold" id="bpPrem">Unlock premium · 1,200 cores</button>'}<button class="btn ghost" id="bpTier">Buy a tier · 150 cores</button><button class="btn" id="bpAll">Claim all</button></div></div></div>
      <div class="panel"><span class="eyebrow">Season vehicles</span><div class="bp-veh">${vehs.map(id => { const u = SM.getUnit(id); return `<div class="bv${s.owned[id] ? ' have' : ''}"><img data-pid="${id}" alt=""><b>${esc(u.name)}</b><span>${esc(SM.FACTION[u.fac].short)} · ${esc(SM.CLASSES[u.cls].name)} · ${esc(SM.SKINS[u.finish].name)}</span></div>`; }).join('')}</div></div>
      <div class="bp-track"><div class="bp-labels"><span>Free</span><span>Premium</span></div><div class="bp-scroll">${rw.map(r => `<div class="bp-col${tier >= r.t ? ' reached' : ''}"><span class="tn">${r.t}</span>${cell(r, 'f')}${cell(r, 'p')}</div>`).join('')}</div></div></div>`;
    $$('[data-pid]', el).forEach(img => { const u = SM.getUnit(img.dataset.pid); SM.portrait(u, [], null, url => img.src = url); });
    $$('[data-bp]', el).forEach(b => b.onclick = () => { const r = G.bpClaim(+b.dataset.bp, b.dataset.track); if (typeof r === 'string') UI.toast(r, 'bad'); else { UI.toast('Received: ' + r.text, 'good'); SM.Audio.reward(2); } UI.render.pass(); UI.wallet(); });
    const pb = $('#bpPrem'); if (pb) pb.onclick = () => UI.confirmBuy('Unlock the premium track for 1,200 cores?', () => { if (!G.spend('cores', 1200)) return 'Not enough cores.'; G.s.bp.premium = true; G.save(); return null; });
    $('#bpTier').onclick = () => UI.confirmBuy('Buy one battle pass tier for 150 cores?', () => { if (G.bpTier() >= G.BP_TIERS) return 'Already at the final tier.'; if (!G.spend('cores', 150)) return 'Not enough cores.'; G.s.bp.xp = (G.bpTier() + 1) * G.BP_XP; G.save(); return null; });
    $('#bpAll').onclick = () => { let n = 0; rw.forEach(r => { ['f', 'p'].forEach(tr => { const x = G.bpClaim(r.t, tr); if (typeof x !== 'string') n++; }); }); UI.toast(n ? 'Claimed ' + n + ' rewards' : 'Nothing to claim yet', n ? 'good' : ''); if (n) SM.Audio.reward(2); UI.render.pass(); UI.wallet(); };
    const sc = $('.bp-scroll', el); if (sc) sc.scrollLeft = Math.max(0, (tier - 3) * 112);
  };

  // ---------------------------------------------------------------- profile
  UI.render.profile = function () {
    const s = G.s, st = s.stats, el = $('#scr-profile');
    const prog = SM.FACTIONS.map(f => { const all = SM.UNIT_LIST.filter(u => u.fac === f.id && !u.exclusive); const have = all.filter(u => s.owned[u.id]).length; return { f, have, all: all.length }; });
    const excl = Object.keys(s.owned).map(SM.getUnit).filter(u => u && u.exclusive);
    const h = Math.floor(st.timePlayed / 3600), m = Math.floor(st.timePlayed % 3600 / 60);
    el.innerHTML = `<div class="profile"><div class="panel"><span class="eyebrow">Service record</span><div class="res-stats">
      <div><b>${st.battles}</b><span>Battles</span></div><div><b>${st.wins}</b><span>Victories</span></div><div><b>${st.battles ? Math.round(st.wins / st.battles * 100) : 0}%</b><span>Win rate</span></div><div><b>${fmt(st.kills)}</b><span>Enemies destroyed</span></div><div><b>${fmt(st.losses)}</b><span>Units lost</span></div><div><b>${fmt(st.captures)}</b><span>Points captured</span></div><div><b>${fmt(st.air)}</b><span>Aircraft downed</span></div><div><b>${h}h ${m}m</b><span>Time in battle</span></div></div></div>
      <div class="panel"><span class="eyebrow">Tech tree progress</span>${prog.map(p => `<div class="fprog" style="--fc:${p.f.hue}"><b>${esc(p.f.name)}</b><div class="bpbar"><i style="width:${p.have / p.all * 100}%"></i></div><span>${p.have} / ${p.all}</span></div>`).join('')}
        <p class="muted small">${SM.UNIT_LIST.filter(u => !u.exclusive).length} units across six factions, five branches and seven ranks. Each unit has its own 10-node modification tree.</p></div>
      <div class="panel"><span class="eyebrow">Exclusive collection · ${excl.length}</span><div class="excl-row">${excl.map(u => `<div class="ex have" title="${esc(u.name)}"><img data-pid="${u.id}" alt=""></div>`).join('') || '<p class="muted small">None yet. Giveaways, crates and the battle pass carry them.</p>'}</div></div></div>`;
    $$('[data-pid]', el).forEach(img => { const u = SM.getUnit(img.dataset.pid); SM.portrait(u, [], null, url => img.src = url); });
  };

  // ---------------------------------------------------------------- settings
  UI.render.settings = function () {
    const s = G.s.settings, el = $('#scr-settings');
    const vol = (k, label) => `<label class="slider"><span>${label}</span><input type="range" id="vol-${k}" min="0" max="1" step="0.05" value="${s.vol[k]}"><b>${Math.round(s.vol[k] * 100)}</b></label>`;
    el.innerHTML = `<div class="settings"><div class="panel"><span class="eyebrow">Graphics</span>
      <div class="segs" id="qSeg">${['low', 'medium', 'high'].map(q => `<button class="seg${s.quality === q ? ' on' : ''}" data-q="${q}">${q[0].toUpperCase() + q.slice(1)}</button>`).join('')}</div>
      <p class="muted small">Low turns off shadows and halves particles. High raises shadow resolution, terrain detail and scenery density.</p>
      <label class="slider"><span>Render scale</span><input type="range" id="resScale" min="0.5" max="1" step="0.05" value="${s.res}"><b>${Math.round(s.res * 100)}%</b></label>
      <label class="check"><input type="checkbox" id="edgePan" ${s.edgePan ? 'checked' : ''}> Pan the camera at screen edges</label></div>
      <div class="panel"><span class="eyebrow">Audio</span>${vol('master', 'Master')}${vol('sfx', 'Weapons and effects')}${vol('amb', 'Weather and ambience')}${vol('ui', 'Interface')}</div>
      <div class="panel"><span class="eyebrow">Data</span><p class="muted small">Progress is saved in this browser only.</p><button class="btn danger" id="resetBtn">Reset all progress</button><div id="resetConfirm" hidden><p>This wipes every unit, skin and currency. Continue?</p><button class="btn danger" id="resetYes">Wipe progress</button> <button class="btn ghost" id="resetNo">Cancel</button></div></div></div>`;
    $$('[data-q]', el).forEach(b => b.onclick = () => { s.quality = b.dataset.q; G.save(); UI.render.settings(); });
    $('#resScale').oninput = e => { s.res = +e.target.value; e.target.nextElementSibling.textContent = Math.round(s.res * 100) + '%'; G.save(); };
    $('#edgePan').onchange = e => { s.edgePan = e.target.checked; G.save(); };
    ['master', 'sfx', 'amb', 'ui'].forEach(k => { $('#vol-' + k).oninput = e => { s.vol[k] = +e.target.value; e.target.nextElementSibling.textContent = Math.round(s.vol[k] * 100); SM.Audio.vol = s.vol; SM.Audio.applyVolumes(); G.save(); }; });
    $('#resetBtn').onclick = () => { $('#resetConfirm').hidden = false; };
    $('#resetNo').onclick = () => { $('#resetConfirm').hidden = true; };
    $('#resetYes').onclick = () => { G.reset(); UI.toast('Progress reset', ''); UI.go('home'); };
  };

  SM.TIPS = [
    'Anti-armor teams and tank destroyers punch through heavy armor. Machine guns barely scratch it.',
    'Shots into the side or rear of a vehicle ignore 40% of its armor.',
    'Sandstorms, blizzards and fog shrink sight range. Recon units and sensor sweeps matter more.',
    'Heavy rain turns ground to mud and slows every vehicle.',
    'Aircraft loiter for a limited time, then fly home. Use them where the fight is.',
    'Only air-defense units, fighters, destroyers and heavy mechs can hit jets. Most infantry can still shoot at helicopters.',
    'Holding more points than the enemy drains their tickets every two seconds.',
    'Engineers repair nearby vehicles automatically.',
    'Siege Mode adds 40% range and 30% armor, but the unit cannot move.',
    'Ion storms boost laser, plasma and railgun damage by 20%.',
    'Double-click a unit to select every unit of that type on screen.',
    'Press F, then click, to attack-move: units engage anything they meet on the way.',
  ];

  // ---------------------------------------------------------------- countdowns & loop
  function tickCountdowns() {
    const now = Date.now();
    $$('[data-countdown]').forEach(e => {
      let d = Math.max(0, +e.dataset.countdown - now) / 1000;
      const dd = Math.floor(d / 86400); d -= dd * 86400; const hh = Math.floor(d / 3600); d -= hh * 3600; const mm = Math.floor(d / 60), ss = Math.floor(d % 60);
      e.textContent = (dd ? dd + 'd ' : '') + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
    });
    if (UI.screen === 'shop' && !UI.battle) { const fi = SM.flashIndex(now); if (UI._fi !== undefined && UI._fi !== fi) UI.render.shop(); UI._fi = fi; }
  }

  function loop(t) {
    requestAnimationFrame(loop);
    const dt = SM.clamp((t - (UI.lastT || t)) / 1000, 0, 0.1); UI.lastT = t;
    try {
      if (UI.battle) UI.battle.frame(dt);
      else if (UI.viewer && (UI.screen === 'home' || UI.screen === 'hangar')) UI.viewer.render(dt);
    } catch (err) { console.error(err); if (!UI._errShown) { UI._errShown = true; UI.toast('Error: ' + err.message, 'bad'); } }
  }

  UI.boot = function () {
    G.load();
    SM.Audio.vol = G.s.settings.vol;
    UI.viewer = new Viewer();
    $$('.nav button').forEach(b => b.onclick = () => UI.go(b.dataset.screen));
    document.addEventListener('click', e => { const g = e.target.closest && e.target.closest('[data-go]'); if (g) UI.go(g.dataset.go); }, true);
    document.addEventListener('pointerdown', () => SM.Audio.init(), { once: false });
    window.addEventListener('resize', () => { if (UI.battle) UI.battle.resize(); if (UI.viewer) UI.viewer.resize(); });
    $('#loading').hidden = true;
    UI.go('home');
    setInterval(tickCountdowns, 1000); tickCountdowns();
    setInterval(() => { if (!UI.battle) UI.wallet(); }, 5000);
    requestAnimationFrame(loop);
    // test / debug hooks
    window.__SM = {
      start: (map, extra) => UI.startBattle(map || 'steppe', 'random', extra),
      get battle() { return UI.battle; },
      ff: secs => { const b = UI.battle; if (!b) return; for (let t = 0; t < secs && !b.over; t += 0.05) b.step(0.05); },
    };
  };
  window.addEventListener('DOMContentLoaded', () => {
    try { UI.boot(); } catch (e) { console.error(e); document.body.insertAdjacentHTML('beforeend', '<div class="fatal">Steel Meridian could not start: ' + esc(e.message) + '. WebGL may be disabled in this browser.</div>'); }
  });
})();
