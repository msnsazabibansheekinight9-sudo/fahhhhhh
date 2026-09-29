// ============================================================================
// UI: main menu, armory (live 3D showroom + attachment slots), battle setup,
// range target menu, pause/settings/results, HUD, scope reticles, main loop.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const UI = G.UI = { dirty: true };
const store = { get(k, d) { try { const v = localStorage.getItem('ironsight.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('ironsight.' + k, JSON.stringify(v)); } catch (e) {} } };
UI.loadouts = store.get('loadouts', {});
UI.loadoutFor = wp => { const L = Object.assign(G.defaultLoadout(wp), UI.loadouts[wp.id] || {}); for (const s in L) if (!G.ATT[L[s]] || (G.ATT[L[s]].slot === s && !G.attachOK(wp, G.ATT[L[s]]) && !['irons', 'mz_std', 'brl_std', 'ub_none', 'sd_none', 'mag_std', 'stk_std', 'am_fmj', 'am_buck', 'fin_factory'].includes(L[s]))) L[s] = G.defaultLoadout(wp)[s]; return L; };
UI.saveLoadout = (wp, L) => { UI.loadouts[wp.id] = L; store.set('loadouts', UI.loadouts); };
UI.sel = store.get('sel', { era: 'ww2', wp: 'garand', cls: null });
UI.battle = store.get('battle', { era: 'ww2', map: 'bocage', enemyTier: 'regular', allyTier: 'regular', score: 30, minutes: 10, primary: null, secondary: null });

// ============================================================ SHOWROOM
const SR = UI.showroom = {};
function initShowroom() {
  const s = SR.scene = new THREE.Scene();
  s.background = new THREE.Color('#0d0f0b');
  SR.cam = new THREE.PerspectiveCamera(30, 1, .05, 100);
  const key = new THREE.SpotLight(0xfff1d8, 3.2, 20, .6, .6, 1.2); key.position.set(2.5, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0005; s.add(key);
  const rim = new THREE.DirectionalLight(0x9fb8d8, 1.4); rim.position.set(-3, 2, -3); s.add(rim);
  s.add(new THREE.HemisphereLight(0xcfd4c8, 0x2a2620, .6));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 48), G.mat({ color: '#0c0d0a', roughness: .8, metalness: .1 })); floor.rotation.x = -PI / 2; floor.position.y = -.35; floor.receiveShadow = true; s.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.12, 96), new THREE.MeshBasicMaterial({ color: G.col('#c9a24b'), transparent: true, opacity: .35 })); ring.rotation.x = -PI / 2; ring.position.y = -.349; s.add(ring);
  // env for reflections: soft studio
  const es = new THREE.Scene(); es.background = new THREE.Color('#222'); const bx = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: '#555', side: THREE.BackSide })); es.add(bx);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), new THREE.MeshBasicMaterial({ color: '#fff' })); panel.position.set(0, 4.5, 0); panel.rotation.x = PI / 2; es.add(panel);
  const p2 = panel.clone(); p2.position.set(4.5, 1, 0); p2.rotation.set(0, -PI / 2, 0); es.add(p2);
  s.environment = G.E.pmrem.fromScene(es, .03).texture;
  SR.turn = new THREE.Group(); s.add(SR.turn);
  SR.yaw = .35; SR.pitch = .12; SR.dist = 2.2; SR.auto = true; SR.target = V3(0, 0, 0);
  const c = G.E.renderer.domElement; let drag = false, lx = 0, ly = 0;
  c.addEventListener('pointerdown', e => { if (G.Game.mode !== 'menu') return; drag = true; lx = e.clientX; ly = e.clientY; SR.auto = false; });
  window.addEventListener('pointerup', () => { drag = false; });
  window.addEventListener('pointermove', e => { if (!drag) return; SR.yaw -= (e.clientX - lx) * .008; SR.pitch = Math.max(-.6, Math.min(1.2, SR.pitch + (e.clientY - ly) * .006)); lx = e.clientX; ly = e.clientY; });
  c.addEventListener('wheel', e => { if (G.Game.mode !== 'menu') return; SR.dist = Math.max(.5, Math.min(4, SR.dist * (1 + Math.sign(e.deltaY) * .1))); }, { passive: true });
}
SR.show = function (wp, L) {
  if (SR.rig) { SR.turn.remove(SR.rig.root); }
  const rig = SR.rig = G.buildGun(wp, L);
  rig.root.rotation.y = -PI / 2; rig.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(rig.root); const size = box.getSize(V3()), ctr = box.getCenter(V3());
  rig.root.position.sub(ctr); rig.root.position.y += .02;
  rig.root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  SR.turn.add(rig.root);
  SR.fit = Math.max(size.x, size.y * 1.6) * 1.25 + .2;
  SR.dist = SR.fit;
  SR.wp = wp;
};
SR.render = function (dt) {
  const R = G.E.renderer, w = G.E.W, h = G.E.H;
  if (SR.auto) { SR.t = (SR.t || 0) + dt; SR.yaw = .35 + Math.sin(SR.t * .35) * .6; }
  // frame the gun inside the visible gap between side panels
  const mode = UI.screen;
  let off = 0;
  if (mode === 'armory' && w > 900) off = (Math.min(300, w * .22) - Math.min(380, w * .28)) / 2 / w;
  if (mode === 'menu') off = w > 700 ? .18 : 0;
  SR.cam.aspect = w / h; SR.cam.setViewOffset(w, h, -off * w, mode === 'armory' && w <= 900 ? -h * .15 : 0, w, h); SR.cam.updateProjectionMatrix();
  const d = SR.dist;
  SR.cam.position.set(Math.sin(SR.yaw) * Math.cos(SR.pitch) * d, Math.sin(SR.pitch) * d, Math.cos(SR.yaw) * Math.cos(SR.pitch) * d);
  SR.cam.lookAt(0, 0, 0);
  R.toneMappingExposure = 1.05;
  R.clear(); R.render(SR.scene, SR.cam);
};

// ============================================================ SCREENS
UI.show = function (name) {
  UI.screen = name;
  const root = $('#ui');
  root.innerHTML = '';
  G.Input.unlock();
  if (name === 'menu') renderMenu(root);
  if (name === 'armory') renderArmory(root);
  if (name === 'battle') renderBattle(root);
  $('#hud').hidden = true;
};
function renderMenu(root) {
  G.Game.mode = 'menu';
  const pool = G.WEAPONS.filter(w => w.c !== 'PST');
  const wp = G.WEAPON[UI.sel.wp] || pool[0];
  SR.show(wp, UI.loadoutFor(wp)); SR.auto = true; SR.pitch = .1;
  root.innerHTML = `<section class="screen" id="menu"><div class="left">
    <div class="eyebrow">Small-arms simulator · 1914 → today</div>
    <div class="logo">Ironsight<span>Armory</span></div>
    <p class="tag">${G.WEAPONS.length} weapons across five eras, each with its own period-correct attachments. Test them on a 1,000 m ballistic range, then take them into 5v5 era battles.</p>
    <nav class="menu-list">
      <button class="menu-item" data-go="armory"><span class="n">01</span><b>Armory</b><i>Inspect and customise every weapon</i></button>
      <button class="menu-item" data-go="range"><span class="n">02</span><b>Firing range</b><i>Paper, steel, gel, armour plates and mannequins out to 1,000 m</i></button>
      <button class="menu-item" data-go="battle"><span class="n">03</span><b>Battle 5v5</b><i>Two maps per era and four enemy tiers</i></button>
      <button class="menu-item" data-go="settings"><span class="n">04</span><b>Settings</b><i>Sensitivity, field of view, audio, graphics</i></button>
    </nav>
    <div class="menu-foot">Click the view to capture the mouse · H in game for controls<br>Headphones recommended</div>
  </div></section>
  <div id="showcard"><div class="eyebrow">${esc(G.ERA[wp.e].name)} · ${wp.y}</div><div class="nm">${esc(wp.n)}</div><div class="meta">${esc(wp.co)} · ${esc(wp.cal)} · ${wp.rpm} rpm</div></div>`;
  root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { G.Audio.init(); G.Audio.ui(); const g = b.dataset.go; if (g === 'range') UI.startRange(); else if (g === 'settings') UI.settings(); else UI.show(g); });
}

// ------------------------------------------------------------ ARMORY
function statBars(wp, S) {
  const cal = G.CAL[wp.cal];
  const fl = G.Ballistics.flight(S.v, S.k, 300); const ret = Math.pow(fl.v / S.v, 2);
  const v = {
    Damage: Math.min(100, S.dmg * (S.pellets > 1 ? S.pellets * .55 : 1) / 1.6),
    Range: Math.min(100, (S.v / 10) * ret * (S.pellets > 1 ? .35 : 1)),
    Accuracy: Math.max(3, Math.min(100, 100 - S.acc * 9)),
    Control: Math.max(3, Math.min(100, 100 - S.rv * 30 - S.rh * 25)),
    Handling: Math.max(3, Math.min(100, 120 - S.ads * 160)),
    Mobility: S.mob / 12 * 100,
    'Fire rate': Math.min(100, S.rpm / 12),
  };
  return v;
}
function renderArmory(root) {
  G.Game.mode = 'menu';
  const era = UI.sel.era;
  let wp = G.WEAPON[UI.sel.wp];
  if (!wp || wp.e !== era) { wp = G.WEAPONS.find(w => w.e === era); UI.sel.wp = wp.id; }
  const L = UI.loadoutFor(wp);
  root.innerHTML = `<section class="screen" id="armory">
    <div class="col left"><div class="colhead"><div class="eyebrow">Era</div><div class="eras">${G.ERAS.map(e => `<button class="chip ${e.id === era ? 'on' : ''}" data-era="${e.id}" title="${e.span}">${esc(e.name)}</button>`).join('')}</div><div class="muted" style="font:12px var(--f-mono)">${G.ERA[era].span} · ${G.WEAPONS.filter(w => w.e === era).length} weapons</div></div>
      <div class="scroll" id="wlist"></div></div>
    <div class="stage"><div class="top"><div><div class="eyebrow" id="wera"></div><h2 id="wname"></h2><div class="sub" id="wsub"></div></div><button class="btn small" id="back">Main menu</button></div>
      <div><div class="actions"><button class="btn primary" id="torange">Take to the range</button><button class="btn" id="tobattle">Use in battle</button><button class="btn" id="rnd">Random build</button><button class="btn" id="rst">Factory</button></div><p class="hint">Drag to rotate · scroll to zoom</p></div></div>
    <div class="col right"><div class="scroll" id="specs"></div></div>
  </section>`;
  const list = $('#wlist');
  const groups = {};
  for (const w of G.WEAPONS.filter(w => w.e === era)) (groups[w.c] = groups[w.c] || []).push(w);
  const order = ['AR', 'BR', 'CAR', 'RIF', 'SMG', 'LMG', 'DMR', 'SR', 'SG', 'PST'];
  list.innerHTML = order.filter(c => groups[c]).map(c => `<div class="wgroup">${G.CLASS_NAMES[c]}</div>` + groups[c].map(w => `<button class="witem ${w.id === wp.id ? 'on' : ''}" data-wp="${w.id}"><b>${esc(w.n)}</b><em>${w.y}</em><span>${esc(w.co)} · ${esc(w.cal)}</span></button>`).join('')).join('');
  list.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => { UI.sel.wp = b.dataset.wp; store.set('sel', UI.sel); G.Audio.ui(); renderArmory(root); });
  root.querySelectorAll('[data-era]').forEach(b => b.onclick = () => { UI.sel.era = b.dataset.era; UI.sel.wp = null; store.set('sel', UI.sel); G.Audio.ui(); renderArmory(root); });
  const on = list.querySelector('.on'); if (on) on.scrollIntoView({ block: 'center' });
  $('#back').onclick = () => UI.show('menu');
  $('#torange').onclick = () => UI.startRange();
  $('#tobattle').onclick = () => { if (wp.c === 'PST') UI.battle.secondary = wp.id; else UI.battle.primary = wp.id; UI.battle.era = wp.e; if (!G.MAPS.find(m => m.id === UI.battle.map && m.era === wp.e)) UI.battle.map = G.mapsFor(wp.e)[0].id; store.set('battle', UI.battle); UI.show('battle'); };
  $('#rnd').onclick = () => { const L2 = {}; for (const [s] of G.SLOTS) { const o = G.attachFor(wp, s); L2[s] = o[Math.floor(Math.random() * o.length)].id; } UI.saveLoadout(wp, L2); G.Audio.ui('attach'); refresh(); };
  $('#rst').onclick = () => { UI.saveLoadout(wp, G.defaultLoadout(wp)); refresh(); };
  let open = null;
  function refresh() {
    const L = UI.loadoutFor(wp), S = G.resolveStats(wp, L), S0 = G.resolveStats(wp, G.defaultLoadout(wp));
    SR.show(wp, L);
    $('#wera').textContent = `${G.ERA[wp.e].name} · ${G.CLASS_NAMES[wp.c]}`;
    $('#wname').textContent = wp.n;
    $('#wsub').textContent = `${wp.co} · adopted ${wp.y} · ${wp.cal} · ${{ bolt: 'bolt action', semi: 'semi-automatic', auto: 'selective fire', auto_ob: 'open bolt', pump: 'pump action', lever: 'lever action', rev: 'double-action revolver' }[wp.act] || wp.act}`;
    const b = statBars(wp, S), b0 = statBars(wp, S0);
    const blen = Math.round(wp.m.B[0] * S.blen * 1000);
    const spec = [['Rate of fire', S.modes.includes('bolt') ? `~${wp.rpm} rpm (aimed)` : `${S.rpm} rpm`], ['Capacity', `${S.mag} rds`], ['Muzzle velocity', `${Math.round(S.v)} m/s`], ['Weight (empty)', `${wp.wt.toFixed(2)} kg`], ['Barrel', `${blen} mm`], ['Fire modes', S.modes.map(m => ({ semi: 'Semi', auto: 'Auto', burst3: '3-rd', burst2: '2-rd', bolt: 'Bolt', pump: 'Pump', lever: 'Lever' }[m])).join(' / ')], ['Dispersion', `${S.acc.toFixed(1)} MOA`], ['Energy @ muzzle', `${Math.round(.5 * ((G.MASS || {})[wp.cal] || massOf(wp.cal)) / 1000 * S.v * S.v)} J`]];
    $('#specs').innerHTML = `<dl class="spec">${spec.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <div class="bars">${Object.keys(b).map(k => { const d = b[k] - b0[k]; return `<div class="bar">${k}<i class="${d > 1 ? 'up' : d < -1 ? 'down' : ''}" style="--v:${Math.max(2, b[k]).toFixed(0)}%"></i><s>${Math.round(b[k])}</s></div>`; }).join('')}</div>
      ${G.SLOTS.map(([s, name]) => { const opts = G.attachFor(wp, s); const cur = G.ATT[L[s]]; return `<div class="slot"><button data-slot="${s}"><span class="sn">${name}</span><span class="sv">${esc(cur ? cur.n : '—')}</span><span class="sc">${opts.length}</span></button>${open === s ? `<div class="opts">${opts.map(o => `<button class="opt ${o.id === L[s] ? 'on' : ''}" data-att="${o.id}"><b>${esc(o.n)}</b>${o.d ? `<span>${esc(o.d)}</span>` : ''}</button>`).join('')}</div>` : ''}</div>`; }).join('')}`;
    $('#specs').querySelectorAll('[data-slot]').forEach(bt => bt.onclick = () => { open = open === bt.dataset.slot ? null : bt.dataset.slot; G.Audio.ui(); refresh(); });
    $('#specs').querySelectorAll('[data-att]').forEach(bt => bt.onclick = () => { const L2 = UI.loadoutFor(wp); L2[open] = bt.dataset.att; UI.saveLoadout(wp, L2); G.Audio.ui('attach'); refresh(); });
  }
  refresh();
}
function massOf(cal) { const M = { '12 gauge': 32 }; return M[cal] || ((G.CAL[cal].cs[0] * G.CAL[cal].cs[1] * G.CAL[cal].cs[1]) * 7.9e6 * .9); }

// ------------------------------------------------------------ BATTLE SETUP
function renderBattle(root) {
  G.Game.mode = 'menu';
  const B = UI.battle;
  const eraW = G.WEAPONS.filter(w => w.e === B.era);
  if (!G.WEAPON[B.primary] || G.WEAPON[B.primary].e !== B.era || G.WEAPON[B.primary].c === 'PST') B.primary = (eraW.find(w => ['AR', 'RIF'].includes(w.c)) || eraW[0]).id;
  if (!G.WEAPON[B.secondary] || G.WEAPON[B.secondary].e !== B.era || G.WEAPON[B.secondary].c !== 'PST') B.secondary = (eraW.find(w => w.c === 'PST') || {}).id || null;
  if (!G.MAPS.find(m => m.id === B.map && m.era === B.era)) B.map = G.mapsFor(B.era)[0].id;
  store.set('battle', B);
  const tierCards = (key) => G.TIERS.map(t => `<button class="card ${B[key] === t.id ? 'on' : ''}" data-${key}="${t.id}"><small style="color:${t.color}">Tier ${G.TIERS.indexOf(t) + 1}</small><b>${t.n}</b><span>${t.d}</span></button>`).join('') + `<button class="card ${B[key] === 'mixed' ? 'on' : ''}" data-${key}="mixed"><small>All tiers</small><b>Mixed squad</b><span>One recruit up to one elite.</span></button>`;
  root.innerHTML = `<section class="screen" id="battle"><div class="setup">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><div class="eyebrow">Team deathmatch · 5 v 5</div><h1>Battle</h1></div><button class="btn small" id="back">Main menu</button></div>
    <div><span class="lbl">Era</span><div class="row">${G.ERAS.map(e => `<button class="card ${e.id === B.era ? 'on' : ''}" data-era="${e.id}"><small>${e.span}</small><b>${esc(e.name)}</b><span>${esc(G.UNIFORMS[e.id][0].name)} vs ${esc(G.UNIFORMS[e.id][1].name)}</span></button>`).join('')}</div></div>
    <div><span class="lbl">Map</span><div class="row">${G.mapsFor(B.era).map(m => `<button class="card ${m.id === B.map ? 'on' : ''}" data-map="${m.id}"><small>${m.env} · ${m.weather || 'clear'}</small><b>${esc(m.name)}</b><span>${esc(m.blurb)}</span></button>`).join('')}</div></div>
    <div><span class="lbl">Enemy tier</span><div class="row">${tierCards('enemyTier')}</div></div>
    <div class="loadrow">
      <div><span class="lbl">Primary</span><div class="pick"><select id="prim">${eraW.filter(w => w.c !== 'PST').map(w => `<option value="${w.id}" ${w.id === B.primary ? 'selected' : ''}>${esc(w.n)} — ${G.CLASS_NAMES[w.c]}</option>`).join('')}</select><button class="btn small" data-cust="prim">Customise</button></div></div>
      <div><span class="lbl">Sidearm</span><div class="pick"><select id="sec">${eraW.filter(w => w.c === 'PST').map(w => `<option value="${w.id}" ${w.id === B.secondary ? 'selected' : ''}>${esc(w.n)}</option>`).join('')}</select><button class="btn small" data-cust="sec">Customise</button></div></div>
      <div><span class="lbl">Allied tier</span><select id="ally">${G.TIERS.map(t => `<option value="${t.id}" ${B.allyTier === t.id ? 'selected' : ''}>${t.n}</option>`).join('')}<option value="mixed" ${B.allyTier === 'mixed' ? 'selected' : ''}>Mixed</option></select></div>
      <div><span class="lbl">Score limit / time</span><div class="pick" style="grid-template-columns:1fr 1fr"><select id="lim">${[15, 30, 50, 75].map(n => `<option ${B.score == n ? 'selected' : ''}>${n}</option>`).join('')}</select><select id="min">${[5, 10, 15, 20].map(n => `<option value="${n}" ${B.minutes == n ? 'selected' : ''}>${n} min</option>`).join('')}</select></div></div>
    </div>
    <div class="deploy"><span class="muted" style="max-width:60ch">Kills score for your team. Enemies wear coloured armbands by tier. Veterans and Elites in Modern and Present eras wear body armour, so armour-piercing ammo helps.</span><button class="btn primary" id="go" style="font-size:20px;padding:14px 36px">Deploy</button></div>
  </div></section>`;
  const re = () => { store.set('battle', B); renderBattle(root); };
  root.querySelectorAll('[data-era]').forEach(b => b.onclick = () => { B.era = b.dataset.era; G.Audio.ui(); re(); });
  root.querySelectorAll('[data-map]').forEach(b => b.onclick = () => { B.map = b.dataset.map; G.Audio.ui(); re(); });
  root.querySelectorAll('[data-enemyTier]').forEach(b => b.onclick = () => { B.enemyTier = b.dataset.enemytier; G.Audio.ui(); re(); });
  $('#prim').onchange = e => { B.primary = e.target.value; store.set('battle', B); };
  $('#sec') && ($('#sec').onchange = e => { B.secondary = e.target.value; store.set('battle', B); });
  $('#ally').onchange = e => { B.allyTier = e.target.value; store.set('battle', B); };
  $('#lim').onchange = e => { B.score = +e.target.value; store.set('battle', B); };
  $('#min').onchange = e => { B.minutes = +e.target.value; store.set('battle', B); };
  root.querySelectorAll('[data-cust]').forEach(b => b.onclick = () => { const id = b.dataset.cust === 'prim' ? B.primary : B.secondary; if (!id) return; UI.sel.era = B.era; UI.sel.wp = id; store.set('sel', UI.sel); UI.show('armory'); });
  $('#back').onclick = () => UI.show('menu');
  $('#go').onclick = () => { G.Audio.init(); UI.deploy(); };
}
UI.deploy = function () {
  const B = UI.battle;
  const p = G.WEAPON[B.primary], s = G.WEAPON[B.secondary];
  const cfg = { map: B.map, enemyTier: B.enemyTier, allyTier: B.allyTier, scoreLimit: B.score, minutes: B.minutes, primary: { wp: p, L: UI.loadoutFor(p) }, secondary: s ? { wp: s, L: UI.loadoutFor(s) } : null };
  loading('Deploying…', () => { G.Game.startBattle(cfg); UI.lastBattle = cfg; });
};
UI.startRange = function () {
  const wp = G.WEAPON[UI.sel.wp] || G.WEAPONS[0];
  const list = [{ wp, L: UI.loadoutFor(wp) }];
  const side = G.WEAPONS.find(w => w.e === wp.e && w.c === 'PST' && w.id !== wp.id);
  if (side && wp.c !== 'PST') list.push({ wp: side, L: UI.loadoutFor(side) });
  G.Audio.init();
  loading('Walking to the firing line…', () => G.Game.startRange(list));
};
function loading(msg, fn) { const l = $('#loading'); l.textContent = msg; l.hidden = false; setTimeout(() => { try { fn(); } catch (e) { console.error(e); } l.hidden = true; }, 40); }

// ------------------------------------------------------------ OVERLAYS
function overlay(html) { let o = $('#ov'); if (o) o.remove(); o = document.createElement('section'); o.id = 'ov'; o.className = 'screen overlay'; o.innerHTML = html; document.body.appendChild(o); return o; }
UI.closeOverlay = () => { const o = $('#ov'); if (o) o.remove(); };
UI.settings = function (back) {
  const S = G.settings;
  const o = overlay(`<div class="dialog"><div class="eyebrow">Options</div><h2>Settings</h2>
    <label class="field">Mouse sensitivity<input type="range" id="s-sens" min=".2" max="3" step=".05" value="${S.sens}"><output>${S.sens}</output></label>
    <label class="field">Field of view<input type="range" id="s-fov" min="55" max="100" step="1" value="${S.fov}"><output>${S.fov}°</output></label>
    <label class="field">Volume<input type="range" id="s-vol" min="0" max="1.5" step=".05" value="${S.vol}"><output>${Math.round(S.vol * 100)}%</output></label>
    <label class="field">Graphics<select id="s-q"><option value="high" ${S.quality === 'high' ? 'selected' : ''}>High</option><option value="med" ${S.quality === 'med' ? 'selected' : ''}>Medium</option><option value="low" ${S.quality === 'low' ? 'selected' : ''}>Low</option></select><span></span></label>
    <label class="field">Invert mouse Y<input type="checkbox" id="s-inv" ${S.invertY ? 'checked' : ''} style="justify-self:start;accent-color:var(--brass)"><span></span></label>
    <div class="btns"><button class="btn primary" id="s-done">Done</button></div></div>`);
  const upd = () => { S.sens = +$('#s-sens').value; S.fov = +$('#s-fov').value; S.vol = +$('#s-vol').value; S.quality = $('#s-q').value; S.invertY = $('#s-inv').checked; o.querySelectorAll('output')[0].textContent = S.sens; o.querySelectorAll('output')[1].textContent = S.fov + '°'; o.querySelectorAll('output')[2].textContent = Math.round(S.vol * 100) + '%'; G.Audio.setVolume(S.vol); G.saveSettings(); G.E.resize(); };
  o.querySelectorAll('input,select').forEach(i => i.oninput = upd);
  $('#s-done').onclick = () => { UI.closeOverlay(); if (back) back(); };
};
UI.pause = function (on) {
  const Gm = G.Game;
  if (Gm.mode === 'menu') return;
  if (on) {
    Gm.state = Gm.state === 'end' ? 'end' : 'pause'; G.Input.unlock(); G.Input.clear();
    const o = overlay(`<div class="dialog"><div class="eyebrow">${Gm.mode === 'range' ? 'Firing range' : esc(Gm.map ? Gm.map.name : '')}</div><h2>Paused</h2><div class="btns">
      <button class="btn primary" id="p-res">Resume</button>
      ${Gm.mode === 'range' ? '<button class="btn" id="p-tgt">Targets & wind (T)</button><button class="btn" id="p-arm">Change weapon</button>' : '<button class="btn" id="p-rs">Restart battle</button>'}
      <button class="btn" id="p-help">Controls</button><button class="btn" id="p-set">Settings</button><button class="btn" id="p-quit">Quit to main menu</button></div></div>`);
    $('#p-res').onclick = () => UI.resume();
    $('#p-set').onclick = () => UI.settings(() => UI.pause(true));
    $('#p-help').onclick = () => { UI.closeOverlay(); Gm.state = 'pause'; UI.toggleHelp(true, () => UI.pause(true)); };
    $('#p-quit').onclick = () => { UI.closeOverlay(); Gm.cleanup(); Gm.state = 'menu'; Gm.player = null; UI.show('menu'); };
    if ($('#p-tgt')) $('#p-tgt').onclick = () => { UI.closeOverlay(); UI.toggleRangeMenu(true); };
    if ($('#p-arm')) $('#p-arm').onclick = () => { UI.closeOverlay(); Gm.cleanup(); Gm.state = 'menu'; Gm.player = null; UI.show('armory'); };
    if ($('#p-rs')) $('#p-rs').onclick = () => { UI.closeOverlay(); loading('Redeploying…', () => G.Game.startBattle(UI.lastBattle)); };
  } else UI.resume();
};
UI.resume = function () { UI.closeOverlay(); const h = $('#helpov'); if (h) h.remove(); if (G.Game.state === 'pause') G.Game.state = 'play'; if (!G.Input.touch) G.Input.lock(); };
UI.onEscape = function () {
  const Gm = G.Game;
  if ($('#rmenu')) { UI.toggleRangeMenu(false); return; }
  if (Gm.mode === 'menu') { if ($('#ov')) UI.closeOverlay(); return; }
  if (Gm.state === 'play') UI.pause(true); else if (Gm.state === 'pause') UI.resume();
};
const KEYS = [['W A S D', 'Move'], ['Mouse', 'Look'], ['Left click', 'Fire'], ['Right click', 'Aim down sights'], ['Shift', 'Sprint · hold breath when scoped'], ['Space', 'Jump'], ['C', 'Crouch'], ['Z', 'Prone (auto bipod)'], ['Q / E', 'Lean'], ['R', 'Reload'], ['B', 'Fire mode'], ['1 / 2 · wheel', 'Switch weapon'], ['[ / ]', 'Zeroing distance'], ['X', 'Bipod'], ['V', 'Melee / bayonet'], ['G', 'Underbarrel launcher'], ['L', 'Weapon light'], ['F', 'Inspect'], ['T', 'Range: targets & wind'], ['N', 'Range: fly mode'], ['Y', 'Range: reset targets'], ['Tab', 'Scoreboard'], ['Esc', 'Pause']];
UI.toggleHelp = function (force, back) {
  let h = $('#helpov');
  if (h && !force) { h.remove(); return; }
  if (h) h.remove();
  h = document.createElement('section'); h.id = 'helpov'; h.className = 'screen overlay';
  h.innerHTML = `<div class="dialog" style="width:min(640px,100%)"><div class="eyebrow">Field manual</div><h2>Controls</h2><div class="keys" style="grid-template-columns:repeat(2,auto 1fr)">${KEYS.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join('')}</div><div class="btns"><button class="btn primary" id="h-ok">Close</button></div></div>`;
  document.body.appendChild(h);
  G.Input.unlock();
  if (G.Game.state === 'play') G.Game.state = 'pause';
  $('#h-ok').onclick = () => { h.remove(); if (back) back(); else UI.resume(); };
};
UI.toggleRangeMenu = function (force) {
  let m = $('#rmenu');
  if (m && force !== true) { m.remove(); if (G.Game.state === 'pause') G.Game.state = 'play'; if (!G.Input.touch) G.Input.lock(); return; }
  if (m) m.remove();
  G.Input.unlock(); G.Game.state = 'pause';
  const st = UI.rangeSel = UI.rangeSel || { type: 'paper', dist: 25, era: G.Game.player ? G.Game.player.W.wp.e : 'ww2', tier: 'regular' };
  m = document.createElement('div'); m.id = 'rmenu';
  const draw = () => {
    m.innerHTML = `<div class="dialog"><div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px"><div><div class="eyebrow">Range control</div><h2>Targets</h2></div><span class="muted" style="font:12px var(--f-mono)">${G.Game.targets.length} / 9 placed</span></div>
      <div class="grid">${G.TARGETS.map(t => `<button class="card ${st.type === t.id ? 'on' : ''}" data-ty="${t.id}"><b>${t.n}</b><span>${t.d}</span></button>`).join('')}</div>
      ${st.type === 'dummy' ? `<div class="loadrow"><div><span class="lbl">Mannequin era</span><select id="r-era">${G.ERAS.map(e => `<option value="${e.id}" ${st.era === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}</select></div><div><span class="lbl">Enemy tier</span><select id="r-tier">${G.TIERS.map(t => `<option value="${t.id}" ${st.tier === t.id ? 'selected' : ''}>${t.n}${t.armor < 1 ? ' (armoured from 1990)' : ''}</option>`).join('')}</select></div></div>` : ''}
      <div><span class="lbl">Distance</span><div class="eras">${G.RANGE_DISTS.map(d => `<button class="chip ${st.dist === d ? 'on' : ''}" data-d="${d}">${d} m</button>`).join('')}</div></div>
      <label class="field">Crosswind<input type="range" id="r-wind" min="-10" max="10" step=".5" value="${G.rangeWind || 0}"><output>${(G.rangeWind || 0).toFixed(1)} m/s</output></label>
      <div class="deploy"><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" id="r-clear">Clear all</button><button class="btn" id="r-reset">Reset targets</button></div><div style="display:flex;gap:6px"><button class="btn" id="r-close">Close</button><button class="btn primary" id="r-add">Place target</button></div></div></div>`;
    m.querySelectorAll('[data-ty]').forEach(b => b.onclick = () => { st.type = b.dataset.ty; draw(); });
    m.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { st.dist = +b.dataset.d; draw(); });
    if ($('#r-era', m)) { $('#r-era', m).onchange = e => st.era = e.target.value; $('#r-tier', m).onchange = e => st.tier = e.target.value; }
    $('#r-wind', m).oninput = e => { G.rangeWind = +e.target.value; G.Ballistics.wind.set(G.rangeWind, 0, 0); m.querySelector('output').textContent = G.rangeWind.toFixed(1) + ' m/s'; };
    $('#r-clear', m).onclick = () => { G.Game.clearTargets(); G.FX.clear(); draw(); };
    $('#r-reset', m).onclick = () => { for (const T of G.Game.targets) T.reset && T.reset(); G.FX.clear(); };
    $('#r-close', m).onclick = () => UI.toggleRangeMenu(false);
    $('#r-add', m).onclick = () => { G.Game.addTarget(st.type, st.dist, { era: st.era, tier: st.tier }); G.Audio.ui('attach'); UI.toggleRangeMenu(false); };
  };
  draw();
  document.body.appendChild(m);
};
UI.showResults = function () {
  const Gm = G.Game; G.Input.unlock();
  const won = Gm.score[0] > Gm.score[1], draw = Gm.score[0] === Gm.score[1];
  const rows = Gm.agents.slice().sort((a, b) => (b.kills || 0) - (a.kills || 0));
  const mvp = rows[0];
  overlay(`<div class="dialog" style="width:min(640px,100%)"><div class="eyebrow">${esc(Gm.map.name)}</div><h2>${draw ? 'Draw' : won ? 'Victory' : 'Defeat'}</h2>
    <div style="font:700 40px var(--f-ui)"><span style="color:var(--blue)">${Gm.score[0]}</span> <span class="muted">—</span> <span style="color:var(--red)">${Gm.score[1]}</span></div>
    <div class="muted">MVP: ${esc(mvp.name)} · ${mvp.kills || 0} kills</div>
    <div id="board" style="position:static;transform:none;width:auto;background:none;border:0;padding:0">${boardHTML()}</div>
    <div class="btns"><button class="btn primary" id="x-again">Rematch</button><button class="btn" id="x-setup">Change battle</button><button class="btn" id="x-menu">Main menu</button></div></div>`);
  $('#x-again').onclick = () => { UI.closeOverlay(); loading('Redeploying…', () => G.Game.startBattle(UI.lastBattle)); };
  $('#x-setup').onclick = () => { UI.closeOverlay(); Gm.cleanup(); Gm.player = null; UI.show('battle'); };
  $('#x-menu').onclick = () => { UI.closeOverlay(); Gm.cleanup(); Gm.player = null; UI.show('menu'); };
};
function boardHTML() {
  const Gm = G.Game;
  const tbl = team => `<table><tr><th>${esc(G.UNIFORMS[Gm.map.era][team].name)}</th><th>Tier</th><th>Weapon</th><th>K</th><th>D</th></tr>${Gm.agents.filter(a => a.team === team).sort((a, b) => (b.kills || 0) - (a.kills || 0)).map(a => `<tr class="${a === Gm.player ? 'me' : ''}"><td>${esc(a.name)}</td><td style="color:${a.tier ? a.tier.color : 'var(--brass2)'}">${a.tier ? a.tier.n : '—'}</td><td class="muted">${esc(a.wp ? a.wp.n : Gm.player.W.wp.n)}</td><td>${a.kills || 0}</td><td>${a.deaths || 0}</td></tr>`).join('')}</table>`;
  return tbl(0) + '<div style="height:10px"></div>' + tbl(1);
}

// ============================================================ HUD
UI.showHUD = function (mode) {
  UI.screen = 'game';
  $('#ui').innerHTML = ''; UI.closeOverlay();
  const h = $('#hud'); h.hidden = false;
  h.innerHTML = `<canvas id="scope"></canvas><div id="supp"></div><div id="vign"></div>
    <div id="xhair"><i class="t"></i><i class="b"></i><i class="l"></i><i class="r"></i><i class="d"></i></div>
    <div id="hit"><i></i><i></i><i></i><i></i></div><div id="dmgdir"></div>
    <div class="hudbox" id="ammo"><div class="wn"></div><div id="rounds"></div><div class="mag"></div><div class="md"></div></div>
    <div class="hudbox" id="hp"><div class="v">100</div><div class="b"><i></i></div><div class="st"></div></div>
    ${mode === 'battle' ? '<div class="hudbox" id="score"><span class="a">0</span><span class="t">10:00</span><span class="e">0</span></div><canvas class="hudbox" id="mini" width="168" height="168"></canvas><div class="hudbox" id="feed"></div>' : '<div class="hudbox" id="rstats"></div><div class="hudbox" id="rhint">T targets & wind · N fly · Y reset · [ ] zero · H controls</div>'}
    <div class="hudbox" id="compass"><div class="strip"></div></div>
    <div class="hudbox" id="toast"></div><div class="hudbox" id="center"></div><div class="hudbox" id="board" hidden></div>`;
  const strip = $('#compass .strip'); let s = '';
  for (let k = 0; k < 3; k++) for (let d = 0; d < 360; d += 15) s += `<span>${{ 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d] || (d % 45 === 0 ? d : '·')}</span>`;
  strip.innerHTML = s;
  UI.scopeCv = $('#scope'); UI.dirty = true;
  UI.hitT = 0; UI.toastT = 0; UI.dmg = [];
  if (!G.Input.touch) G.Input.lock();
  G.Game.state = 'play';
};
UI.toast = function (msg, t) { const e = $('#toast'); if (!e) return; e.textContent = msg; e.style.opacity = 1; UI.toastT = t; };
UI.hitmarker = function (kill, head) { const e = $('#hit'); if (!e) return; e.className = kill ? 'kill' : head ? 'head' : ''; e.style.opacity = 1; UI.hitT = kill ? .4 : .2; };
UI.damage = function (d, dir) {
  const root = $('#dmgdir'); if (!root) return;
  const el = document.createElement('div'); root.appendChild(el);
  const P = G.Game.player; const a = Math.atan2(-dir.x, -dir.z) - P.yaw + PI;
  el.style.transform = `rotate(${-a}rad)`; el.style.opacity = 1;
  UI.dmg.push({ el, t: 1.2 });
};
UI.suppress = function (v) { const e = $('#supp'); if (e) e.style.opacity = Math.min(.9, v * .6); };
UI.updateHUD = function (dt) {
  const Gm = G.Game, P = Gm.player; if (!P || UI.screen !== 'game') return;
  const w = P.W;
  // crosshair: spread-dependent, hidden when aiming
  const x = $('#xhair');
  if (x) {
    const hide = P.ads > .5 || !P.alive || P.sprinting;
    x.style.opacity = hide ? 0 : 1;
    const hs = Math.hypot(P.vel.x, P.vel.z);
    const sp = (6 + ({ PST: 2, SMG: 2.6, AR: 3.5, SG: 3.2, LMG: 5.2, SR: 7 }[w.wp.c] || 3.5) * 4 * (1 + hs / 5) * (P.stance ? .7 : 1) * w.S.hip) + P.kick.z * 60;
    x.children[0].style.top = (-sp - 9) + 'px'; x.children[1].style.top = sp + 'px'; x.children[2].style.left = (-sp - 9) + 'px'; x.children[3].style.left = sp + 'px';
  }
  UI.hitT -= dt; const hm = $('#hit'); if (hm && UI.hitT <= 0) hm.style.opacity = 0;
  UI.toastT -= dt; const t = $('#toast'); if (t && UI.toastT <= 0) t.style.opacity = 0;
  for (let i = UI.dmg.length - 1; i >= 0; i--) { const d = UI.dmg[i]; d.t -= dt; d.el.style.opacity = Math.max(0, d.t); if (d.t <= 0) { d.el.remove(); UI.dmg.splice(i, 1); } }
  $('#vign').style.opacity = P.alive ? Math.max(0, (70 - P.hp) / 70) : .8;
  const supp = $('#supp'); if (supp) supp.style.opacity = Math.min(.9, P.suppress * .5);
  // ammo
  if (P.hudDirty || UI.dirty || Gm.frame % 6 === 0) {
    P.hudDirty = false;
    const S = w.S;
    $('#ammo .wn').textContent = w.wp.n;
    $('#ammo .mag').innerHTML = `${w.mag}<small> / ${w.reserve > 5000 ? '∞' : w.reserve}</small>`;
    const mode = S.modes[w.mode];
    const md = { semi: 'SEMI', auto: 'AUTO', burst3: '3-RD BURST', burst2: '2-RD HYPERBURST', bolt: 'BOLT', pump: 'PUMP', lever: 'LEVER' }[mode] || mode;
    $('#ammo .md').textContent = [md, w.wp.c !== 'PST' && w.wp.c !== 'SG' ? `ZERO ${w.zero} M` : '', S.gl ? `40MM ×${w.glAmmo}` : '', P.bipod ? 'BIPOD' : '', w.cycleNeeded ? 'CYCLE' : ''].filter(Boolean).join(' · ');
    const rr = $('#rounds'); const n = Math.min(S.mag, 60);
    if (rr.childElementCount !== n) rr.innerHTML = '<i></i>'.repeat(n);
    const ratio = w.mag / S.mag;
    [...rr.children].forEach((c, i) => c.className = i < Math.round(ratio * n) ? '' : 'x');
    $('#hp .v').textContent = Math.ceil(P.hp);
    $('#hp .b i').style.width = P.hp + '%';
    $('#hp .st').textContent = [['Standing', 'Crouched', 'Prone'][P.stance], P.fly ? 'Flying' : '', P.scoped ? (P.holding ? 'Holding breath' : `${w.S.zoom}× optic`) : ''].filter(Boolean).join(' · ');
  }
  // compass
  const deg = ((-P.yaw * 180 / PI) % 360 + 360) % 360;
  const strip = $('#compass .strip'); if (strip) strip.style.transform = `translateX(${180 - 15 - (deg + 360) * 2}px)`;
  // battle
  if (Gm.mode === 'battle') {
    const sc = $('#score'); if (sc) { sc.children[0].textContent = Gm.score[0]; sc.children[2].textContent = Gm.score[1]; const s = Math.max(0, Gm.timeLeft | 0); sc.children[1].textContent = `${(s / 60) | 0}:${String(s % 60).padStart(2, '0')} · first to ${Gm.scoreLimit}`; }
    if (UI.dirty) { const f = $('#feed'); if (f) f.innerHTML = Gm.killfeed.map(k => `<div><span class="${k.kt === 0 ? 'a' : 'e'}">${esc(k.k)}</span><span class="w">${esc(k.w)}${k.head ? ' ⌖' : ''}</span><span class="${k.vt === 0 ? 'a' : 'e'}">${esc(k.v)}</span></div>`).join(''); }
    drawMini();
    const c = $('#center'); if (c) c.textContent = !P.alive && Gm.state === 'play' ? `Killed by ${Gm.deathBy ? Gm.deathBy.name : '—'} · respawn in ${Math.max(0, Gm.respawnT).toFixed(1)}` : '';
    const b = $('#board'); if (b) { const show = G.Input.keys.Tab; b.hidden = !show; if (show && Gm.frame % 15 === 0) b.innerHTML = boardHTML(); }
  } else if (UI.dirty || Gm.frame % 10 === 0) {
    const s = Gm.stats, L = s && s.last, r = $('#rstats');
    if (r) r.innerHTML = `<h4>Ballistics · last hit</h4>${L ? `
      <div class="kv"><span>Range</span><b>${L.dist.toFixed(1)} m</b></div>
      <div class="kv"><span>Time of flight</span><b>${(L.tof * 1000).toFixed(0)} ms</b></div>
      <div class="kv"><span>Impact velocity</span><b>${L.v.toFixed(0)} m/s</b></div>
      <div class="kv"><span>Energy</span><b>${L.J.toFixed(0)} J (${(L.J / L.J0 * 100).toFixed(0)}%)</b></div>
      <div class="kv"><span>Drop vs aim</span><b>${(L.drop * 100).toFixed(1)} cm · ${(L.drop / L.dist * 1000).toFixed(2)} mil</b></div>
      <div class="kv"><span>Wind drift</span><b>${(L.wind * 100).toFixed(1)} cm</b></div>
      ${L.group ? `<div class="kv"><span>Group (last 5)</span><b>${(L.group * 100).toFixed(1)} cm · ${(L.group / L.dist * 3438).toFixed(2)} MOA</b></div>` : ''}
      <div class="info">${esc(L.info)}</div>` : '<div class="muted">Shoot a target to see flight time, velocity, energy, drop and drift.</div>'}
      <h4 style="margin-top:10px">Session</h4>
      <div class="kv"><span>Shots / hits</span><b>${s ? s.shots : 0} / ${s ? s.hits : 0}</b></div>
      <div class="kv"><span>Wind</span><b>${(G.rangeWind || 0).toFixed(1)} m/s ${G.rangeWind > 0 ? '→' : G.rangeWind < 0 ? '←' : ''}</b></div>
      <div class="kv"><span>Zero</span><b>${w.zero} m</b></div>`;
  }
  UI.dirty = false;
  drawScope();
};
function drawMini() {
  const c = $('#mini'); if (!c) return; const x = c.getContext('2d'); const Gm = G.Game, P = Gm.player, W = G.E.world;
  const S = 168, sc = 1.8;
  x.clearRect(0, 0, S, S); x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 1, 0, 7); x.clip();
  x.translate(S / 2, S / 2); x.rotate(P.yaw); x.scale(sc, sc); x.translate(-P.pos.x, -P.pos.z);
  x.fillStyle = 'rgba(200,196,180,.28)';
  for (const col of W.colliders) { if (col.noShoot || col.soft || col.max.y < .8) continue; x.fillRect(col.min.x, col.min.z, col.max.x - col.min.x, col.max.z - col.min.z); }
  for (const a of Gm.agents) {
    if (!a.alive || a === P) continue;
    const friend = a.team === 0;
    const seen = friend || Gm.bots.some(b => b.team === 0 && b.alive && b.target === a && b.targetVisible) || (a.fireCD > -1 && a.pos.distanceTo(P.pos) < 40 && !(a.S && a.S.sup));
    if (!seen) continue;
    x.fillStyle = friend ? '#5aa6d6' : '#d65a3c'; x.beginPath(); x.arc(a.pos.x, a.pos.z, 1.4, 0, 7); x.fill();
  }
  x.restore();
  x.fillStyle = '#e6c572'; x.beginPath(); x.moveTo(S / 2, S / 2 - 7); x.lineTo(S / 2 + 5, S / 2 + 5); x.lineTo(S / 2 - 5, S / 2 + 5); x.fill();
}

// ------------------------------------------------------------ SCOPE RETICLES
function drawScope() {
  const cv = UI.scopeCv; if (!cv) return;
  const P = G.Game.player; const w = P.W;
  const on = P.scoped && P.alive;
  if (!on) { if (cv.width) { cv.width = 0; } cv.style.display = 'none'; return; }
  cv.style.display = 'block';
  const W = window.innerWidth, H = window.innerHeight;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const x = cv.getContext('2d');
  x.clearRect(0, 0, W, H);
  const ret = w.S.ret, zoom = w.S.zoom;
  const R = Math.min(W, H) * (zoom >= 8 ? .46 : .42);
  // eye-box: scope shadow shifts with sway / movement
  const ex = W / 2 + (P.swayL.x * 900 + P.kick.z * 40) * (1 - (P.holding ? .8 : 0)), ey = H / 2 + (-P.swayL.y * 900 + P.kick.z * 60);
  x.fillStyle = '#000';
  x.beginPath(); x.rect(0, 0, W, H); x.arc(ex, ey, R, 0, PI * 2, true); x.fill();
  const g = x.createRadialGradient(ex, ey, R * .78, ex, ey, R); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.95)');
  x.fillStyle = g; x.beginPath(); x.arc(ex, ey, R, 0, 7); x.fill();
  // mil scale: pixels per milliradian at the current FOV
  const fov = G.E.camera.fov * PI / 180; const ppm = (H / 2) / Math.tan(fov / 2) * .001;
  const cx = W / 2, cy = H / 2;
  x.save(); x.beginPath(); x.arc(ex, ey, R, 0, 7); x.clip();
  const ink = '#0b0b0b';
  const line = (x1, y1, x2, y2, wdt = 1.2, col = ink) => { x.strokeStyle = col; x.lineWidth = wdt; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); };
  const dot = (px, py, r, col = ink) => { x.fillStyle = col; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); };
  switch (ret) {
    case 'post': x.fillStyle = ink; x.beginPath(); x.moveTo(cx - 4, H); x.lineTo(cx - 4, cy + 10); x.lineTo(cx, cy); x.lineTo(cx + 4, cy + 10); x.lineTo(cx + 4, H); x.fill(); line(cx - R, cy + 1, cx - 30, cy + 1, 5); line(cx + 30, cy + 1, cx + R, cy + 1, 5); break;
    case 'german': x.fillStyle = ink; x.beginPath(); x.moveTo(cx - 5, H); x.lineTo(cx - 5, cy + 14); x.lineTo(cx, cy); x.lineTo(cx + 5, cy + 14); x.lineTo(cx + 5, H); x.fill(); x.fillRect(cx - R, cy - 3, R - 36, 6); x.fillRect(cx + 36, cy - 3, R - 36, 6); break;
    case 'cross': line(cx - R, cy, cx + R, cy, 1); line(cx, cy - R, cx, cy + R, 1); break;
    case 'crossdot': line(cx - R, cy, cx + R, cy, 1); line(cx, cy - R, cx, cy + R, 1); dot(cx, cy, 2.5); break;
    case 'duplex': line(cx - R, cy, cx - R * .3, cy, 5); line(cx + R * .3, cy, cx + R, cy, 5); line(cx, cy + R * .3, cx, cy + R, 5); line(cx, cy - R, cx, cy - R * .3, 5); line(cx - R * .3, cy, cx + R * .3, cy, 1); line(cx, cy - R * .3, cx, cy + R * .3, 1); break;
    case 'mildot': case 'p4f': case 'mil_xt': {
      line(cx - R, cy, cx + R, cy, 1); line(cx, cy - R, cx, cy + R, 1);
      line(cx - R, cy, cx - R * .55, cy, 5); line(cx + R * .55, cy, cx + R, cy, 5); line(cx, cy + R * .55, cx, cy + R, 5);
      for (let i = 1; i <= 10; i++) { const d = i * ppm; if (d > R * .55) break; for (const s of [-1, 1]) { if (ret === 'mildot') { dot(cx + s * d, cy, 2); dot(cx, cy + s * d, 2); } else { line(cx + s * d, cy - 4, cx + s * d, cy + 4, 1); line(cx - 4, cy + s * d, cx + 4, cy + s * d, 1); if (i % 2 === 0) { x.fillStyle = ink; x.font = '10px monospace'; x.fillText(i, cx + s * d - 3, cy + 16); } } } }
      if (ret === 'mil_xt') for (let r = 1; r <= 8; r++) for (let c = -r; c <= r; c++) { const px = cx + c * ppm, py = cy + r * ppm; if (Math.hypot(px - cx, py - cy) < R * .55) dot(px, py, 1); }
      break; }
    case 'pso': { // PSO-1: chevrons + BDC + stadiametric rangefinder
      x.strokeStyle = ink; x.lineWidth = 1.6;
      const chev = (py, s) => { x.beginPath(); x.moveTo(cx - s, py + s); x.lineTo(cx, py); x.lineTo(cx + s, py + s); x.stroke(); };
      chev(cy, 8); chev(cy + 2.6 * ppm, 6); chev(cy + 5 * ppm, 6); chev(cy + 7.5 * ppm, 6);
      line(cx - 10 * ppm, cy, cx - 1.5 * ppm, cy, 1.4); line(cx + 1.5 * ppm, cy, cx + 10 * ppm, cy, 1.4);
      for (let i = 1; i <= 10; i++) for (const s of [-1, 1]) line(cx + s * i * ppm, cy, cx + s * i * ppm, cy - (i % 5 ? 4 : 8), 1.2);
      x.beginPath(); for (let i = 0; i <= 20; i++) { const dd = 200 + i * 40; x.lineTo(cx - 12 * ppm + i * .6 * ppm, cy + 10 * ppm - 1.7 / (dd / 1000) * ppm); } x.stroke();
      x.fillStyle = ink; x.font = '10px monospace'; x.fillText('2  4  6  8  10', cx - 12 * ppm, cy + 11.5 * ppm);
      break; }
    case 'acog': {
      const red = '#ff3b24';
      x.fillStyle = red; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx - 9, cy + 13); x.lineTo(cx - 5, cy + 13); x.lineTo(cx, cy + 6); x.lineTo(cx + 5, cy + 13); x.lineTo(cx + 9, cy + 13); x.fill();
      line(cx, cy + 16, cx, cy + 12 * ppm, 1.2);
      const marks = [[4, 1.3, '4'], [5, 2.2, '5'], [6, 3.3, '6'], [7, 4.6, '7'], [8, 6.2, '8']];
      for (const [, m, lab] of marks) { const w2 = 20 / (+lab) * 3; line(cx - w2, cy + m * ppm, cx + w2, cy + m * ppm, 1.2); x.fillStyle = ink; x.font = '10px monospace'; x.fillText(lab, cx + w2 + 4, cy + m * ppm + 3); }
      line(cx - R, cy, cx - 12 * ppm, cy, 1.2); line(cx + 12 * ppm, cy, cx + R, cy, 1.2);
      break; }
    case 'susat': { x.fillStyle = ink; x.beginPath(); x.moveTo(cx - 6, H); x.lineTo(cx - 6, cy + 18); x.lineTo(cx, cy); x.lineTo(cx + 6, cy + 18); x.lineTo(cx + 6, H); x.fill(); dot(cx, cy + 2, 2, '#ff9030'); break; }
    case 'g36': case 'ring': case 'lpvo': case 'holo': case 'xm157': {
      const red = '#ff3b24';
      x.strokeStyle = ret === 'holo' ? red : ink; x.lineWidth = 1.8;
      x.beginPath(); x.arc(cx, cy, (ret === 'ring' ? 5 : ret === 'holo' ? 34 : 10.5) * ppm * (ret === 'holo' ? .058 : 1) * (ret === 'holo' ? 17 : 1) / (ret === 'holo' ? 17 : 1), 0, 7); x.stroke();
      dot(cx, cy, ret === 'xm157' ? 1.6 : 2, red);
      if (ret === 'g36') for (const [m, l] of [[1.8, '2'], [3.1, '3'], [4.8, '4'], [6.9, '5'], [9.6, '6']]) { line(cx - 12, cy + m * ppm, cx + 12, cy + m * ppm, 1); x.fillStyle = ink; x.font = '10px monospace'; x.fillText(l, cx + 16, cy + m * ppm + 3); }
      if (ret === 'lpvo' || ret === 'xm157') { line(cx - R, cy, cx - 12 * ppm, cy, 3); line(cx + 12 * ppm, cy, cx + R, cy, 3); line(cx, cy + 12 * ppm, cx, cy + R, 3); for (let i = 1; i <= 5; i++) line(cx - 5 - i, cy + i * 1.5 * ppm, cx + 5 + i, cy + i * 1.5 * ppm, 1); }
      if (ret === 'xm157') {
        const cam = G.E.camera, d = V3(0, 0, -1).applyQuaternion(cam.quaternion);
        const hit = G.E.world.raycast(cam.position, d, 1500);
        let rng = hit ? hit.t : null;
        if (G.Game.targets) for (const T of G.Game.targets) { const tt = T.rayTest(cam.position, d, 1500, {}); if (tt >= 0 && (rng == null || tt < rng)) rng = tt; }
        for (const a of G.Game.agents) if (a !== P && a.alive) for (const hb of a.hitboxes()) { const tt = G.rayCapsule(cam.position, d, hb.a, hb.b, hb.r); if (tt >= 0 && (rng == null || tt < rng)) rng = tt; }
        x.fillStyle = red; x.font = '600 14px monospace';
        if (rng) {
          const drop = computeHold(w, rng);
          x.fillText(`RNG ${rng.toFixed(0)} M`, cx + R * .35, cy + R * .45);
          x.fillText(`HOLD ${drop >= 0 ? '▼' : '▲'} ${Math.abs(drop).toFixed(1)} MIL`, cx + R * .35, cy + R * .45 + 18);
          dot(cx, cy + drop * ppm, 2.5, '#ffd02a');
        } else x.fillText('RNG ---', cx + R * .35, cy + R * .45);
      }
      break; }
    default: line(cx - R, cy, cx + R, cy, 1); line(cx, cy - R, cx, cy + R, 1);
  }
  x.restore();
  // lens tint & scope rim
  x.strokeStyle = 'rgba(20,20,20,1)'; x.lineWidth = 6; x.beginPath(); x.arc(ex, ey, R, 0, 7); x.stroke();
  x.fillStyle = 'rgba(140,170,200,.04)'; x.beginPath(); x.arc(ex, ey, R, 0, 7); x.fill();
  x.fillStyle = 'rgba(230,197,114,.9)'; x.font = '12px monospace';
  x.fillText(`${zoom}× · ZERO ${w.zero} M${G.Game.mode === 'range' && G.rangeWind ? ` · WIND ${G.rangeWind.toFixed(1)} M/S` : ''}${P.holding ? ' · BREATH HELD' : P.breath < .3 ? ' · OUT OF BREATH' : ''}`, 18, H - 18);
}
// holdover in mils relative to the current zero for a range (for the XM157 FCU)
function computeHold(w, d) {
  const fl = G.Ballistics.flight(w.S.v, w.S.k, d);
  const drop = .5 * 9.81 * fl.t * fl.t;
  const sightH = Math.max(.02, w.rig.sightH);
  const lineY = -sightH + Math.tan(w.zeroAng) * d; // bullet height relative to sight line ignoring gravity
  const y = lineY - drop;
  return -y / d * 1000;
}

// ============================================================ MAIN LOOP
function boot() {
  const canvas = $('#c');
  G.E.init(canvas);
  G.Input.init(canvas);
  initShowroom();
  G.MASS = G.MASS || null;
  UI.show('menu');
  $('#loading').hidden = true;
  let last = performance.now(); G.Game.frame = 0;
  document.addEventListener('keydown', () => G.Audio.init(), { once: true });
  document.addEventListener('pointerdown', () => G.Audio.init(), { once: true });
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    G.Game.frame++;
    const R = G.E.renderer;
    if (G.Game.mode === 'menu' || !G.Game.player) { SR.render(dt); return; }
    const Gm = G.Game;
    if (Gm.state === 'play' || Gm.state === 'end') Gm.update(dt, now / 1000);
    else if (Gm.state === 'pause') { G.Input.frame(); }
    R.toneMappingExposure = (G.ENV[G.E.map.env] || {}).exp || 1;
    R.clear();
    R.render(G.E.scene, G.E.camera);
    if (Gm.player && Gm.player.vm.pivot.visible) { R.clearDepth(); R.render(G.E.vmScene, G.E.vmCam); }
  }
  requestAnimationFrame(loop);
  window.G_READY = true;
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
