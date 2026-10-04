// ============================================================================
// UI: main menu, armory (live 3D showroom + attachment slots), solo missions,
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
UI.loadoutFor = wp => { const L = Object.assign(G.defaultLoadout(wp), UI.loadouts[wp.id] || {}); for (const s in L) if (!G.ATT[L[s]] || (G.ATT[L[s]].slot === s && !G.attachOK(wp, G.ATT[L[s]]) && !(G.DEFAULT_IDS || []).includes(L[s]))) L[s] = G.defaultLoadout(wp)[s]; return L; };
UI.saveLoadout = (wp, L) => { UI.loadouts[wp.id] = L; store.set('loadouts', UI.loadouts); };
UI.sel = store.get('sel', { era: 'ww2', wp: 'garand', cls: null });

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
  c.addEventListener('wheel', e => { if (G.Game.mode !== 'menu') return; SR.dist = Math.max(.25, Math.min(6, SR.dist * (1 + Math.sign(e.deltaY) * .1))); }, { passive: true });
}
SR.show = function (wp, L, st) {
  if (SR.rig) { SR.turn.remove(SR.rig.root); }
  if (SR.kitS) { SR.turn.remove(SR.kitS.root); SR.kitS = null; }
  const rig = SR.rig = G.buildGun(wp, L, { st });
  if (rig.magPivot) { const k = rig.S.alt && rig.S.alt.k; rig.magPivot.rotation.z = (k === 'mag' ? st && st.alt : k === 'flip' ? !(st && st.alt) : true) ? 0 : -PI / 2; }
  rig.root.rotation.y = -PI / 2; rig.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(rig.root); const size = box.getSize(V3()), ctr = box.getCenter(V3());
  rig.root.position.sub(ctr); rig.root.position.y += .02;
  rig.root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  SR.turn.add(rig.root);
  SR.fit = Math.max(size.x, size.y * 1.6) * 1.25 + .2;
  SR.dist = SR.fit;
  SR.wp = wp;
};
SR.showKit = function (kit, wp) {
  if (SR.rig) { SR.turn.remove(SR.rig.root); SR.rig = null; }
  if (SR.kitS) SR.turn.remove(SR.kitS.root);
  const S = SR.kitS = G.buildSoldier({ era: 'now', team: 0, tier: 'elite', weapon: wp || null, loadout: wp ? UI.loadoutFor(wp) : null, kit, skin: '#c99a78', hair: '#3a2a1e' });
  S.root.position.y = -.35; S.root.rotation.y = PI; SR.turn.add(S.root);
  G.animateSoldier(S, { dt: 1, speed: 0, aimPitch: 0, aim: false });
  S.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  SR.target = V3(0, .55, 0); SR.fit = SR.dist = 3.2;
};
SR.render = function (dt) {
  const R = G.E.renderer, w = G.E.W, h = G.E.H;
  if (SR.auto) { SR.t = (SR.t || 0) + dt; SR.yaw = .35 + Math.sin(SR.t * .35) * .6; }
  // frame the gun inside the visible gap between side panels
  const mode = UI.screen;
  let off = 0;
  if ((mode === 'armory' || mode === 'kit' || mode === 'workshop' || mode === 'bench') && w > 900) off = (Math.min(300, w * .22) - Math.min(380, w * .28)) / 2 / w;
  if (mode === 'menu') off = w > 700 ? .18 : 0;
  SR.cam.aspect = w / h; SR.cam.setViewOffset(w, h, -off * w, (mode === 'armory' || mode === 'workshop' || mode === 'bench') && w <= 900 ? -h * .15 : 0, w, h); SR.cam.updateProjectionMatrix();
  const d = SR.dist;
  const tg = UI.screen === 'kit' && SR.kitS ? SR.target : UI.screen === 'bench' && SR.benchTgt ? SR.benchTgt : V3(0, 0, 0);
  SR.cam.position.set(tg.x + Math.sin(SR.yaw) * Math.cos(SR.pitch) * d, tg.y + Math.sin(SR.pitch) * d, tg.z + Math.cos(SR.yaw) * Math.cos(SR.pitch) * d);
  SR.cam.lookAt(tg);
  R.toneMappingExposure = 1.05;
  R.clear(); R.render(SR.scene, SR.cam);
};

// ============================================================ SCREENS
// "Open in Chrome": opens this page on its own, full-window, in Chrome (Android intent / iOS scheme / new tab on desktop)
// "Open in Chrome". Inside claude.ai the game runs in a sandboxed frame that may not open new windows,
// so the button builds a single self-contained copy of the game (every script inlined, three.js from
// its CDN) and offers it as a download: open that file in Chrome and it runs full-window with real
// mouse capture. Outside claude.ai it hands the page to Chrome directly.
UI.buildStandalone = async function () {
  const styles = Array.from(document.querySelectorAll('style')).map(x => x.outerHTML).join('\n');
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"]')).map(x => x.outerHTML).join('\n');
  const scripts = Array.from(document.querySelectorAll('script[src]')).filter(x => /\/js\/[\w-]+\.js(\?|$)|cdnjs\.cloudflare\.com/.test(x.src));
  let out = '';
  for (const sc of scripts) {
    if (/cdnjs\.cloudflare\.com/.test(sc.src)) { out += `<script src="${sc.src}"></script>\n`; continue; }
    const r = await fetch(sc.src, { cache: 'no-store' }); if (!r.ok) throw new Error('Could not read ' + sc.src);
    out += '<script>\n' + (await r.text()).replace(/<\/script/gi, '<\\/script') + '\n</script>\n';
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Ironsight Armory</title>\n${links}\n${styles}</head><body>\n<canvas id="c" aria-label="3D view"></canvas><div id="ui"></div><div id="hud" hidden></div><div id="loading">Loading armory…</div>\n${out}</body></html>`;
};
// The published page on claude.ai: a link that opens the game in any browser tab, nothing to download
const ARTIFACT_URL = 'https://claude.ai/artifact/98Ay2afhvBxVPgfMGSfiHh';
UI.openChrome = async function () {
  const u = location.href, ua = navigator.userAgent || '', bare = u.replace(/^https?:\/\//, '');
  const framed = (() => { try { return window.top !== window; } catch (e) { return true; } })();
  const tryOpen = url => { try { return window.open(url, '_blank'); } catch (e) { return null; } };
  if (!framed) {
    if (/^file:/.test(u)) { UI.toast('Open this file from Chrome: drag it into a Chrome window, or File → Open', 4); return; }
    if (/Android/i.test(ua)) { location.href = `intent://${bare}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(u)};end`; return; }
    if (/iPhone|iPad|iPod/i.test(ua)) { location.href = 'googlechromes://' + bare; return; }
    if (!tryOpen(u)) location.href = u; return;
  }
  // inside claude.ai: open the game on its own in a new tab — no download
  const w = /Android/i.test(ua) ? tryOpen(`intent://${ARTIFACT_URL.replace(/^https:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(ARTIFACT_URL)};end`) || tryOpen(ARTIFACT_URL)
    : tryOpen(ARTIFACT_URL);
  if (w) return;
  // the host blocked new windows: hand over the link
  const o = overlay(`<div class="dialog" style="width:min(560px,100%)"><div class="eyebrow">Open in Chrome</div><h2>Open the game in its own tab</h2>
    <p class="muted">This frame isn't allowed to open new tabs, so use the link: click it, or copy it into Chrome's address bar. Nothing to download.</p>
    <p><a id="oc-a" href="${ARTIFACT_URL}" target="_blank" rel="noopener" style="color:var(--brass2);font:600 15px var(--f-mono);word-break:break-all">${ARTIFACT_URL}</a></p>
    <input id="oc-in" class="wsq" readonly value="${ARTIFACT_URL}" style="width:100%;user-select:text;-webkit-user-select:text">
    <div class="btns"><button class="btn primary" id="oc-copy">Copy link</button><button class="btn" id="oc-file" title="A single self-contained file you can open in Chrome offline">Save as a file instead</button><button class="btn" id="oc-x">Close</button></div></div>`);
  const inp = o.querySelector('#oc-in'); inp.onclick = () => inp.select();
  o.querySelector('#oc-copy').onclick = async () => { inp.select(); let ok = false; try { await navigator.clipboard.writeText(ARTIFACT_URL); ok = true; } catch (e) { try { ok = document.execCommand('copy'); } catch (e2) {} } o.querySelector('#oc-copy').textContent = ok ? 'Copied — paste it into Chrome' : 'Select the link and copy it'; };
  o.querySelector('#oc-x').onclick = () => UI.closeOverlay();
  o.querySelector('#oc-file').onclick = () => { UI.closeOverlay(); UI.saveStandalone(); };
};
// fallback: one self-contained HTML file (needs the downloads capability inside claude.ai)
UI.saveStandalone = async function () {
  const b = document.getElementById('openchrome');
  const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
  try {
    if (b) b.textContent = 'Preparing…';
    const html = await UI.buildStandalone();
    if (dl) await dl.save({ filename: 'ironsight-armory.html', data: new Blob([html], { type: 'text/html' }) });
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = 'ironsight-armory.html'; document.body.appendChild(a); a.click(); a.remove(); }
    overlay(`<div class="dialog" style="width:min(520px,100%)"><div class="eyebrow">Saved</div><h2>ironsight-armory.html</h2><p class="muted">Open that file in Chrome (double-click it, or drag it into a Chrome window). The whole game is in the one file.</p><div class="btns"><button class="btn primary" id="oc-ok">OK</button></div></div>`);
    $('#oc-ok').onclick = () => UI.closeOverlay();
  } catch (e) {
    if (!(e && e.code === 'declined')) UI.toast('Could not save the file' + (e && e.message ? ': ' + e.message : ''), 3);
  } finally { if (b) b.textContent = 'Open in Chrome ↗'; }
};
// already running full-window in Chrome: no need for the button
const IN_CHROME = window.top === window && /Chrome\//.test(navigator.userAgent) && !/Edg\/|OPR\/|SamsungBrowser/.test(navigator.userAgent);
function chromeBar(show) {
  let b = document.getElementById('openchrome');
  if (!b) { b = document.createElement('button'); b.id = 'openchrome'; b.textContent = 'Open in Chrome ↗'; b.title = 'Open the game full-window in Chrome (best for mouse capture and performance)';
    b.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:50;padding:6px 14px;font:600 13px var(--f-ui,sans-serif);letter-spacing:.04em;color:#111;background:#e6c572;border:0;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.5);cursor:pointer';
    b.onclick = () => UI.openChrome(); document.body.appendChild(b); }
  b.style.display = show && !IN_CHROME ? 'block' : 'none';
}
UI.chromeBar = chromeBar;
UI.show = function (name) {
  UI.screen = name; chromeBar(true);
  const root = $('#ui');
  root.innerHTML = '';
  G.Input.unlock();
  if (name === 'menu') renderMenu(root);
  if (name === 'armory') renderArmory(root);
  if (name === 'kit') renderKit(root);
  if (name === 'missions') renderMissions(root);
  if (name === 'extraction') G.Raid.render(root);
  if (name === 'battle') G.Battle.render(root);
  if (name === 'workshop') G.Workshop.render(root);
  if (name === 'bench') G.Bench.render(root);
  $('#hud').hidden = true;
};
function renderMenu(root) {
  G.Game.mode = 'menu';
  const pool = G.WEAPONS.filter(w => w.c !== 'PST');
  const wp = G.WEAPON[UI.sel.wp] || pool[0];
  const nOrig = G.WEAPONS.filter(w => !w.custom).length;
  SR.show(wp, UI.loadoutFor(wp)); SR.auto = true; SR.pitch = .1;
  root.innerHTML = `<section class="screen" id="menu"><div class="left">
    <div class="eyebrow">Small-arms simulator · 1914 → today</div>
    <div class="logo">Ironsight<span>Armory</span></div>
    <p class="tag">${nOrig} weapons across five eras, each with its own period-correct attachments. Test them on a 1,000 m ballistic range, then take them on solo counter-terror missions.</p>
    <nav class="menu-list">
      <button class="menu-item" data-go="armory"><span class="n">01</span><b>Armory</b><i>Inspect and customise every weapon — or tick several and merge them</i></button>
      <button class="menu-item" data-go="workshop"><span class="n">02</span><b>Weapon workshop</b><i>Merge real guns or build your own from scratch, part by part</i></button>
      <button class="menu-item" data-go="bench"><span class="n">03</span><b>Handling bench</b><i>Load, rack and fire any gun by hand with the mouse</i></button>
      <button class="menu-item" data-go="range"><span class="n">04</span><b>Firing range</b><i>Paper, steel, gel, armour plates and mannequins out to 1,000 m</i></button>
      <button class="menu-item" data-go="missions"><span class="n">05</span><b>Solo missions</b><i>Clear terrorists from ships, rigs, embassies and trains — dawn to night</i></button>
      <button class="menu-item" data-go="battle"><span class="n">06</span><b>Mass battlefield</b><i>20 v 20 conquest across a 600 m map — artillery, jets, total chaos</i></button>
      <button class="menu-item" data-go="extraction"><span class="n">07</span><b>Extraction</b><i>Hardcore loot-and-extract raids with your own guns and kit — lose it all if you die</i></button>
      <button class="menu-item" data-go="kit"><span class="n">08</span><b>Kit locker</b><i>Helmets, armour, plates, camo and night vision from armies worldwide</i></button>
      <button class="menu-item" data-go="settings"><span class="n">09</span><b>Settings</b><i>Sensitivity, field of view, audio, graphics</i></button>
    </nav>
    <div class="menu-foot">Click the view to capture the mouse · F1 in game for controls<br>Headphones recommended</div>
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
  if (!G.WEAPONS.some(w => w.e === UI.sel.era)) UI.sel.era = 'ww2';
  const era = UI.sel.era;
  let wp = G.WEAPON[UI.sel.wp];
  if (!wp || wp.e !== era) { wp = G.WEAPONS.find(w => w.e === era); UI.sel.wp = wp.id; }
  const L = UI.loadoutFor(wp);
  root.innerHTML = `<section class="screen" id="armory">
    <div class="col left"><div class="colhead"><div class="eyebrow">Era</div><div class="eras">${G.ERAS.map(e => `<button class="chip ${e.id === era ? 'on' : ''}" data-era="${e.id}" title="${e.span}">${esc(e.name)}</button>`).join('')}</div><div class="muted" style="font:12px var(--f-mono)">${G.ERA[era].span} · ${G.WEAPONS.filter(w => w.e === era).length} weapons</div>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">${UI.mergeSel ? `<button class="btn small primary" id="domerge" ${UI.mergeSel.length < 2 ? 'disabled' : ''}>Merge ${UI.mergeSel.length} guns →</button><button class="btn small" id="mergeoff">Cancel</button>` : `<button class="btn small" id="mergeon" title="Tick two or more guns from any era and fuse their best features into a new weapon">Merge mode</button><button class="btn small" id="toworkshop">Workshop</button>`}</div>
      ${UI.mergeSel ? `<div class="muted" style="font:12px var(--f-mono);margin-top:6px">Tick guns from any era. The first one ticked gives the receiver.${UI.mergeSel.length ? '<br>' + UI.mergeSel.map((id, i) => `${i + 1}. ${esc((G.WEAPON[id] || {}).n || id)}`).join('<br>') : ''}</div>` : ''}</div>
      <div class="scroll" id="wlist"></div></div>
    <div class="stage"><div class="top"><div><div class="eyebrow" id="wera"></div><h2 id="wname"></h2><div class="sub" id="wsub"></div></div><button class="btn small" id="back">Main menu</button></div>
      <div><div class="actions"><button class="btn primary" id="torange">Take to the range</button><button class="btn" id="tomis">Test in a mission</button><button class="btn" id="rnd">Random build</button><button class="btn" id="rst">Factory</button><button class="btn" id="tobench">Handling bench</button>${wp.custom ? '<button class="btn" id="toedit">Edit design</button>' : ''}</div><p class="hint">Drag to rotate · scroll to zoom</p></div></div>
    <div class="col right"><div class="scroll" id="specs"></div></div>
  </section>`;
  const list = $('#wlist');
  const groups = {};
  for (const w of G.WEAPONS.filter(w => w.e === era)) { const k = w.psy ? 'PSY_' + w.psy : w.proto ? 'PROTO' : w.c; (groups[k] = groups[k] || []).push(w); }
  const order = ['PSY_feasible', 'PSY_overkill', 'AR', 'BR', 'CAR', 'RIF', 'SMG', 'LMG', 'DMR', 'SR', 'SG', 'PST', ...(G.CLASS_ORDER_EXTRA || []), 'PROTO'];
  list.innerHTML = order.filter(c => groups[c]).map(c => `<div class="wgroup">${c === 'PROTO' ? 'Prototype & experimental' : c.startsWith('PSY_') ? G.PSY_TIERS[c.slice(4)] : G.CLASS_NAMES[c]}</div>` + groups[c].map(w => `<button class="witem ${w.id === wp.id ? 'on' : ''}" data-wp="${w.id}"><b>${UI.mergeSel ? `<span style="display:inline-block;width:15px;height:15px;margin-right:7px;vertical-align:-2px;border:1px solid var(--brass);border-radius:2px;background:${UI.mergeSel.includes(w.id) ? 'var(--brass)' : 'transparent'};color:#16140c;font:700 11px/15px var(--f-mono);text-align:center">${UI.mergeSel.includes(w.id) ? UI.mergeSel.indexOf(w.id) + 1 : ''}</span>` : ''}${esc(w.n)}</b><em>${w.y}</em><span>${w.proto || w.psy ? G.CLASS_NAMES[w.c] + ' · ' : ''}${esc(w.co)} · ${esc(w.cal)}</span></button>`).join('')).join('');
  list.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => { const id = b.dataset.wp; if (UI.mergeSel) { const i = UI.mergeSel.indexOf(id); if (i >= 0) UI.mergeSel.splice(i, 1); else UI.mergeSel.push(id); } UI.sel.wp = id; store.set('sel', UI.sel); G.Audio.ui(); const sc = list.scrollTop; renderArmory(root); $('#wlist').scrollTop = sc; });
  root.querySelectorAll('[data-era]').forEach(b => b.onclick = () => { const e = b.dataset.era; if (!G.WEAPONS.some(w => w.e === e)) { G.Audio.ui(); UI.show('workshop'); return; } UI.sel.era = e; UI.sel.wp = null; store.set('sel', UI.sel); G.Audio.ui(); renderArmory(root); });
  { const q = id => root.querySelector(id); if (q('#mergeon')) q('#mergeon').onclick = () => { UI.mergeSel = [wp.id]; G.Audio.ui(); renderArmory(root); }; if (q('#mergeoff')) q('#mergeoff').onclick = () => { UI.mergeSel = null; G.Audio.ui(); renderArmory(root); }; if (q('#toworkshop')) q('#toworkshop').onclick = () => UI.show('workshop');
    if (q('#domerge')) q('#domerge').onclick = () => { const ids = UI.mergeSel.slice(); UI.mergeSel = null; G.Workshop.openMerge(ids); }; }
  const on = list.querySelector('.on'); if (on && !UI.mergeSel) on.scrollIntoView({ block: 'center' });
  $('#back').onclick = () => UI.show('menu');
  $('#torange').onclick = () => UI.startRange();
  $('#tomis').onclick = () => UI.missionPicker(wp);
  $('#tobench').onclick = () => G.Bench.open(wp.id);
  if ($('#toedit')) $('#toedit').onclick = () => G.Workshop.openBuild(wp);
  $('#rnd').onclick = () => { const L2 = {}; for (const [s] of G.SLOTS) { const o = G.attachFor(wp, s); L2[s] = o[Math.floor(Math.random() * o.length)].id; } UI.saveLoadout(wp, L2); G.Audio.ui('attach'); refresh(); };
  $('#rst').onclick = () => { UI.saveLoadout(wp, G.defaultLoadout(wp)); refresh(); };
  let open = null; const fst = { fold: false, coll: false, supOff: false, alt: false };
  function refresh() {
    const L = UI.loadoutFor(wp), S = G.resolveStats(wp, L), S0 = G.resolveStats(wp, G.defaultLoadout(wp));
    SR.show(wp, L, fst);
    $('#wera').textContent = `${G.ERA[wp.e].name} · ${G.CLASS_NAMES[wp.c]}${wp.proto ? ' · Prototype' : ''}${wp.psy ? (wp.psy === 'feasible' ? ' · Feasible' : ' · Overkill') : ''}`;
    $('#wname').textContent = wp.n;
    $('#wsub').textContent = `${wp.co} · adopted ${wp.y} · ${wp.cal} · ${{ bolt: 'bolt action', semi: 'semi-automatic', auto: 'selective fire', auto_ob: 'open bolt', pump: 'pump action', lever: 'lever action', rev: 'revolver', muzzle: (wp.m.lock ? { flint: 'flintlock', match: 'matchlock', wheel: 'wheellock', cap: 'percussion' }[wp.m.lock] + ' ' : '') + 'muzzle-loader', break: 'break-action', single: 'single-shot breechloader', cannon: 'muzzle-loading cannon', breech: 'breech-loading', mortar: 'drop-fire mortar', crank: 'hand-cranked' }[wp.act] || wp.act}`;
    const b = statBars(wp, S), b0 = statBars(wp, S0);
    const blen = Math.round((wp.m.B ? wp.m.B[0] : (wp.m.L || 0)) * S.blen * 1000);
    const spec = [['Rate of fire', S.modes.includes('bolt') ? `~${wp.rpm} rpm (aimed)` : `${S.rpm} rpm`], ['Capacity', `${S.mag} rds`], ['Muzzle velocity', `${Math.round(S.v)} m/s`], ['Weight (empty)', `${S.wt.toFixed(2)} kg${Math.abs(S.wt - wp.wt) > .005 ? ` (base ${wp.wt.toFixed(2)})` : ''}`], ['Barrel', `${blen} mm`], ['Fire modes', S.modes.map(m => ({ semi: 'Semi', auto: 'Auto', burst3: '3-rd', burst2: '2-rd', bolt: 'Bolt', pump: 'Pump', lever: 'Lever' }[m])).join(' / ')], ['Dispersion', `${S.acc.toFixed(1)} MOA`], ['Energy @ muzzle', `${Math.round(.5 * ((G.MASS || {})[wp.cal] || massOf(wp.cal)) / 1000 * S.v * S.v)} J`]];
    if (G.handlingRows) spec.push(...G.handlingRows(S));
    { const sp = []; if (S.he) sp.push(`explosive rounds (${S.he.r} m blast)`); if (S.homing) sp.push('seeker rounds'); if (wp.spin) sp.push(`rotary, ${wp.spin}s spin-up`); if (wp.charge) sp.push(`hold to charge (${wp.charge}s)`); if (wp.salvo) sp.push(`${wp.salvo}-barrel salvo`); if (wp.gyro) sp.push('rocket-propelled'); if (wp.caseless) sp.push('caseless'); if (wp.duplex) sp.push('duplex rounds'); if (wp.intSup) sp.push('integral suppressor'); if (S.inc) sp.push('incendiary'); if (sp.length) spec.push(['Special', sp.join(' · ')]); }
    $('#specs').innerHTML = `${wp.blurb ? `<p class="blurb">${esc(wp.blurb)}</p>` : ''}<dl class="spec">${spec.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <div class="bars" id="wbars">${barsHTML(b, b0)}</div>
      ${perksHTML(S, L)}
      ${G.SLOTS.map(([s, name]) => { const opts = G.attachFor(wp, s); const cur = G.ATT[L[s]]; return `<div class="slot"><button data-slot="${s}"><span class="sn">${name}</span><span class="sv">${esc(cur ? cur.n : '—')}</span><span class="sc">${opts.length}</span></button>${open === s ? `<div class="opts">${opts.map(o => `<button class="opt ${o.id === L[s] ? 'on' : ''}" data-att="${o.id}"><b>${esc(o.n)}</b>${o.d ? `<span>${esc(o.d)}</span>` : ''}${chipsHTML(o)}</button>`).join('')}</div>` : ''}</div>`; }).join('')}`;
    // hovering a part previews its effect on the stat bars
    $('#specs').querySelectorAll('[data-att]').forEach(bt => { bt.onmouseenter = () => { const L2 = Object.assign({}, L, { [open]: bt.dataset.att }); const el = $('#wbars'); if (el) el.innerHTML = barsHTML(statBars(wp, G.resolveStats(wp, L2)), b, true); }; bt.onmouseleave = () => { const el = $('#wbars'); if (el) el.innerHTML = barsHTML(b, b0); }; });
    // try the field controls on the showroom model
    $('#specs').querySelectorAll('[data-fst]').forEach(bt => bt.onclick = () => { const k = bt.dataset.fst; fst[k] = !fst[k]; G.Audio.ui('attach'); refresh(); });
    $('#specs').querySelectorAll('[data-slot]').forEach(bt => bt.onclick = () => { open = open === bt.dataset.slot ? null : bt.dataset.slot; G.Audio.ui(); refresh(); });
    $('#specs').querySelectorAll('[data-att]').forEach(bt => bt.onclick = () => { const L2 = UI.loadoutFor(wp); L2[open] = bt.dataset.att; UI.saveLoadout(wp, L2); G.Audio.ui('attach'); refresh(); });
  }
  refresh();
}
function barsHTML(b, b0, prev) { return Object.keys(b).map(k => { const d = b[k] - b0[k]; return `<div class="bar">${k}<i class="${d > 1 ? 'up' : d < -1 ? 'down' : ''}" style="--v:${Math.max(2, b[k]).toFixed(0)}%"></i><s>${Math.round(b[k])}${prev && Math.abs(d) >= 1 ? ` <em style="color:${d > 0 ? '#8fd16a' : '#e46a5a'};font-style:normal">${d > 0 ? '+' : ''}${Math.round(d)}</em>` : ''}</s></div>`; }).join(''); }
function chipsHTML(o) { const l = G.attStatList ? G.attStatList(o) : []; if (!l.length) return ''; return `<span style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px">${l.map(([t, g]) => `<em style="font-style:normal;font-size:10.5px;padding:1px 5px;border-radius:3px;background:${g === true ? 'rgba(120,190,90,.18)' : g === false ? 'rgba(220,90,70,.18)' : 'rgba(230,197,114,.18)'};color:${g === true ? '#a6d98a' : g === false ? '#ec8a7a' : '#e6c572'}">${esc(t)}</em>`).join('')}</span>`; }
function perksHTML(S, L) {
  const P = G.weaponPerks ? G.weaponPerks(S, L) : []; if (!P.length) return '';
  const tg = [];
  if (S.fold) tg.push(['fold', 'Fold stock (O)']); else if (S.coll) tg.push(['coll', 'Collapse stock (O)']);
  if (S.sup && S.qd) tg.push(['supOff', 'Remove suppressor (U)']);
  if (S.alt) tg.push(['alt', 'Switch sight (H)']);
  return `<div class="slot" style="padding:8px 10px"><span class="lbl">Perks</span><div style="display:flex;flex-direction:column;gap:3px;margin-top:4px">${P.map(p => `<div style="font-size:12.5px"><b style="color:${p.k === 'warn' ? '#ec8a7a' : '#e6c572'}">${esc(p.n)}</b>${p.d ? ` <span class="muted">— ${esc(p.d)}</span>` : ''}</div>`).join('')}</div>${tg.length ? `<div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap">${tg.map(([k, n]) => `<button class="chip" data-fst="${k}">${n}</button>`).join('')}<span class="muted" style="font-size:11px">try it on the model</span></div>` : ''}</div>`;
}
function gearChips(o) { const P = G.gearProps ? G.gearProps(o).perks : []; if (!P.length) return ''; return `<span style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px">${P.map(([n, , good]) => `<em style="font-style:normal;font-size:10.5px;padding:1px 5px;border-radius:3px;background:${good ? 'rgba(120,190,90,.18)' : 'rgba(220,90,70,.18)'};color:${good ? '#a6d98a' : '#ec8a7a'}">${esc(n)}</em>`).join('')}</span>`; }
function massOf(cal) { const M = { '12 gauge': 32 }; return M[cal] || ((G.CAL[cal].cs[0] * G.CAL[cal].cs[1] * G.CAL[cal].cs[1]) * 7.9e6 * .9); }

// ------------------------------------------------------------ KIT LOCKER
const REF_ROUNDS = [['9×19mm', 360, false, '9 mm'], ['7.62×39mm', 715, false, '7.62×39'], ['5.56×45mm', 940, false, '5.56'], ['7.62×51mm', 850, false, '7.62×51'], ['.30-06', 850, true, '.30-06 AP'], ['.50 BMG', 880, false, '.50 BMG']];
function protSummary(kit) {
  const reg = [['Head (crown)', 'head', { x: 0, y: .09, z: 0 }], ['Face', 'head', { x: 0, y: .01, z: -.1 }], ['Chest, front', 'chest', { x: 0, y: 0, z: -.15 }], ['Back', 'chest', { x: 0, y: 0, z: .15 }], ['Sides', 'chest', { x: .2, y: -.05, z: 0 }], ['Neck', 'chest', { x: 0, y: .21, z: -.08 }], ['Groin', 'stomach', { x: 0, y: -.4, z: -.12 }]];
  return reg.map(([n, zone, loc]) => { let best = null, by = ''; for (const [cal, v, ap, lab] of REF_ROUNDS) { const r = G.armorHit(kit, zone, loc, { cal, v0: v, ap }, v, G.newArmorState()); if (r.stopped) { best = lab; by = r.by; } } return [n, best, by]; });
}
function renderKit(root) {
  G.Game.mode = 'menu';
  const kit = G.Kit.current;
  const wp = G.WEAPON[UI.sel.wp];
  let open = UI.kitOpen || null;
  root.innerHTML = `<section class="screen" id="armory">
    <div class="col left"><div class="colhead"><div class="eyebrow">Kit locker</div><div class="muted" style="font:12px var(--f-mono)">Everything you wear, from WW1 to today</div></div><div class="scroll" id="kslots"></div></div>
    <div class="stage"><div class="top"><div><div class="eyebrow">Personal equipment</div><h2 id="kname">Your kit</h2><div class="sub" id="ksub"></div></div><button class="btn small" id="back">Main menu</button></div>
      <div><div class="actions"><button class="btn primary" id="ktest">Test it on a mannequin</button><button class="btn" id="kmis">Solo missions</button><button class="btn" id="krnd">Random kit</button></div><p class="hint">Drag to rotate · scroll to zoom · your kit protects you in battles and missions</p></div></div>
    <div class="col right"><div class="scroll" id="kinfo"></div></div>
  </section>`;
  const refresh = () => {
    SR.showKit(kit, wp && wp.c !== 'PST' ? wp : null); SR.auto = true;
    const kg = G.kitWeight(kit), mob = Math.round(Math.max(.72, Math.min(1.04, 1.04 - Math.max(0, kg - 5) * .012)) * 100);
    $('#ksub').textContent = `${kg.toFixed(1)} kg carried · movement ${mob}%`;
    const cat = UI.kitCat || 'all', inCat = o => cat === 'all' || (cat === 'mil' ? !o.cat : o.cat === cat) || /_none$|^g_none$/.test(o.id);
    $('#kslots').innerHTML = `<div class="eras" style="padding:8px 12px;display:flex;gap:6px;flex-wrap:wrap">${(G.KIT_CATS || []).map(([k, n]) => `<button class="chip ${cat === k ? 'on' : ''}" data-kcat="${k}">${n}</button>`).join('')}</div>` + G.GEAR_SLOTS.map(([slot, name]) => { const cur = G.GEARID[kit[slot]]; const opts = G.gearFor(slot).filter(inCat).sort((a, b) => a.y - b.y);
      return `<div class="slot"><button data-kslot="${slot}"><span class="sn">${name}</span><span class="sv">${esc(cur ? cur.n : '—')}</span><span class="sc">${opts.length}</span></button>${open === slot ? `<div class="opts">${opts.map(o => `<button class="opt ${o.id === kit[slot] ? 'on' : ''}" data-kid="${o.id}"><b>${esc(o.n)}</b><span>${esc(o.co || '')}${o.y > 1900 ? ' · ' + o.y : ''}${o.wt ? ' · ' + o.wt + ' kg' : ''}${o.rating ? ' · rating ' + o.rating : ''}${o.soft ? ' · soft ' + o.soft : ''}</span>${gearChips(o)}</button>`).join('')}</div>` : ''}</div>`; }).join('');
    const prot = protSummary(kit);
    const A = G.GEARID[kit.armor], P = G.GEARID[kit.plates];
    $('#kinfo').innerHTML = `<p class="blurb">Pick a preset or change any single piece. Every item has its real protection level: rounds are checked against the plate, soft armour, side plate, collar, groin protector, helmet or visor they actually hit, and plates crack with each hit.</p>
      <div class="lbl" style="margin:8px 0 4px">Stops at the muzzle (first hit)</div>
      <dl class="spec">${prot.map(([n, best, by]) => `<div><dt>${n}</dt><dd>${best ? esc(best) : '<span style="opacity:.55">nothing</span>'}</dd></div>`).join('')}</dl>
      ${A && A.plates && (!P || !P.rating) ? '<p class="muted">This carrier has empty plate pockets — pick plates.</p>' : ''}${A && !A.plates && P && P.rating ? '<p class="muted">This vest has no plate pockets, so the plates slot is ignored.</p>' : ''}
      <div class="lbl" style="margin:12px 0 4px">Real-world presets</div>
      <div class="opts" style="display:grid;gap:4px">${G.KIT_PRESETS.map(p => `<button class="opt" data-preset="${p.id}"><b>${esc(p.n)}</b></button>`).join('')}</div>
      ${open ? `<div class="lbl" style="margin:12px 0 4px">About</div><p class="muted">${esc(G.GEARID[kit[open]].d || G.GEARID[kit[open]].n)}</p>` : ''}
      <div class="lbl" style="margin:12px 0 4px">Kit perks</div>${G.GEAR_SLOTS.map(([sl]) => G.GEARID[kit[sl]]).filter(g => g && G.gearProps(g).perks.length).map(g => `<div style="font-size:12.5px;margin-bottom:6px"><b style="color:#e6c572">${esc(g.n)}</b><br>${G.gearProps(g).perks.map(([n, d, good]) => `<span style="color:${good ? '#a6d98a' : '#ec8a7a'}">${esc(n)}</span> <span class="muted">${esc(d)}</span>`).join('<br>')}</div>`).join('')}`;
    root.querySelectorAll('[data-kcat]').forEach(b => b.onclick = () => { UI.kitCat = b.dataset.kcat; G.Audio.ui(); refresh(); });
    root.querySelectorAll('[data-kslot]').forEach(b => b.onclick = () => { open = UI.kitOpen = open === b.dataset.kslot ? null : b.dataset.kslot; G.Audio.ui(); refresh(); });
    root.querySelectorAll('[data-kid]').forEach(b => b.onclick = () => { kit[open] = b.dataset.kid; G.Kit.save(kit); G.Audio.ui('attach'); refresh(); });
    root.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { Object.assign(kit, G.KIT_PRESETS.find(p => p.id === b.dataset.preset).kit); G.Kit.save(kit); G.Audio.ui('attach'); refresh(); });
  };
  refresh();
  $('#back').onclick = () => UI.show('menu');
  $('#kmis').onclick = () => UI.show('missions');
  $('#krnd').onclick = () => { for (const [slot] of G.GEAR_SLOTS) { const o = G.gearFor(slot); kit[slot] = o[Math.floor(Math.random() * o.length)].id; } G.Kit.save(kit); refresh(); };
  $('#ktest').onclick = () => { UI.startRange({ kitTest: true }); };
}

// ------------------------------------------------------------ SOLO MISSIONS
UI.mis = store.get('mis', { mission: 'ship', tod: 'night', tier: 'regular', primary: 'm4a1', secondary: 'glock19' });
function renderMissions(root) {
  G.Game.mode = 'menu';
  const C = UI.mis;
  if (!G.MISSION[C.mission]) C.mission = G.MISSIONS[0].id;
  if (!G.WEAPON[C.primary] || G.WEAPON[C.primary].c === 'PST') C.primary = 'm4a1';
  if (!G.WEAPON[C.secondary] || G.WEAPON[C.secondary].c !== 'PST') C.secondary = 'glock19';
  store.set('mis', C);
  const kit = G.Kit.current, nv = G.GEARID[kit.nvg];
  const opts = (filter, cur) => G.ERAS.map(e => `<optgroup label="${esc(e.name)}">${G.WEAPONS.filter(w => w.e === e.id && filter(w)).map(w => `<option value="${w.id}" ${w.id === cur ? 'selected' : ''}>${esc(w.n)}</option>`).join('')}</optgroup>`).join('');
  const L = UI.loadoutFor(G.WEAPON[C.primary]);
  root.innerHTML = `<section class="screen" id="battle"><div class="setup">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><div class="eyebrow">Counter-terror · solo</div><h1>Missions</h1></div><button class="btn small" id="back">Main menu</button></div>
    <div><span class="lbl">Structure</span><div class="row">${G.MISSIONS.map(m => `<button class="card ${m.id === C.mission ? 'on' : ''}" data-mis="${m.id}"><small>${esc(m.loc)} · ${m.out ? Math.round(m.out.bounds * 2) + ' m area · ' : ''}${m.guards.length} in the structure + up to ${m.out ? m.out.max : 0} around · ${m.hostages.length} hostages</small><b>${esc(m.name)}</b><span>${esc(m.blurb)}</span></button>`).join('')}</div></div>
    <div><span class="lbl">Hostiles</span><div class="row">${G.HOSTILE_ROLES.map(r => `<div class="card" style="cursor:default"><small>${r.id === 'leader' ? 'One per cell' : r.max ? 'Up to ' + r.max : 'Common'}</small><b>${esc(r.n)}</b><span>${esc(r.d)}</span></div>`).join('')}</div></div>
    <div><span class="lbl">Time of day</span><div class="row">${Object.entries(G.TOD).map(([k, t]) => `<button class="card ${k === C.tod ? 'on' : ''}" data-tod="${k}"><b>${t.n}</b><span>${t.d}</span></button>`).join('')}</div></div>
    <div><span class="lbl">Hostile tier</span><div class="row">${G.TIERS.map(t => `<button class="card ${C.tier === t.id ? 'on' : ''}" data-tier="${t.id}"><small style="color:${t.color}">Tier ${G.TIERS.indexOf(t) + 1}</small><b>${t.n}</b><span>${t.d}</span></button>`).join('')}<button class="card ${C.tier === 'mixed' ? 'on' : ''}" data-tier="mixed"><small>All tiers</small><b>Mixed cell</b><span>A mix of recruits and hardened fighters.</span></button></div></div>
    <div><span class="lbl">Explosives pouch (pick up to 4)</span><div class="row">${G.EXPLOSIVES.map(e => `<button class="card ${(C.ex || ['m67', 'm84', 'm18', 'c4']).includes(e.id) ? 'on' : ''}" data-ex="${e.id}"><small>${esc(e.co)} · ${e.y}</small><b>${esc(e.n)}</b><span>${esc(e.d || ({ frag: 'Timed fragmentation grenade.', impact: 'Bursts on impact.', stun: 'Stun grenade.', smoke: 'Smoke screen.', fire: 'Incendiary.', charge: 'Placed charge, remote detonation.', mine: 'Directional mine.' })[e.kind])}</span></button>`).join('')}</div></div>
    <div class="loadrow">
      <div><span class="lbl">Primary (any era)</span><div class="pick"><select id="mprim">${opts(w => w.c !== 'PST', C.primary)}</select><button class="btn small" data-cust="prim">Customise</button></div></div>
      <div><span class="lbl">Sidearm</span><div class="pick"><select id="msec">${opts(w => w.c === 'PST', C.secondary)}</select><button class="btn small" data-cust="sec">Customise</button></div></div>
      <div><span class="lbl">Your kit</span><div class="pick"><span class="muted" style="font-size:13px">${esc(G.GEARID[kit.helmet].n)} · ${esc(G.GEARID[kit.armor].n)}${G.GEARID[kit.armor].plates ? ' + ' + esc(G.GEARID[kit.plates].n) : ''} · NVG: ${esc(nv.n)}</span><button class="btn small" id="mkit">Kit locker</button></div></div>
    </div>
    <div class="deploy"><span class="muted" style="max-width:62ch">No respawns — the dead stay down. Don't hit the hostages. Dead hostiles drop their weapons: T takes one, K drops yours. Hostiles hold their posts and react to gunfire (breachers come for you) — a suppressor keeps them unaware longer.${C.tod === 'night' ? ` Night: ${nv.nv ? 'press J (or N) for night vision' : 'your kit has no night vision — pick some in the Kit locker'}${L.side === 'laser' || L.side === 'dbal' || L.side === 'peq2' ? ', L cycles your laser' : ''}.` : ''}</span><div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end"><div style="display:flex;gap:10px;align-items:center"><label class="muted" style="font-size:13px;display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="mrndeach" ${C.rnd ? 'checked' : ''}>Re-roll every deploy</label><button class="btn" id="mrnd">🎲 Random loadout</button></div><button class="btn primary" id="mgo" style="font-size:20px;padding:14px 36px">Infiltrate</button></div></div>
  </div></section>`;
  const re = () => { store.set('mis', C); renderMissions(root); };
  root.querySelectorAll('[data-mis]').forEach(b => b.onclick = () => { C.mission = b.dataset.mis; G.Audio.ui(); re(); });
  root.querySelectorAll('[data-tod]').forEach(b => b.onclick = () => { C.tod = b.dataset.tod; G.Audio.ui(); re(); });
  root.querySelectorAll('[data-tier]').forEach(b => b.onclick = () => { C.tier = b.dataset.tier; G.Audio.ui(); re(); });
  root.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => { const l = (C.ex || ['m67', 'm84', 'm18', 'c4']).slice(), i = l.indexOf(b.dataset.ex); if (i >= 0) l.splice(i, 1); else { if (l.length >= 4) l.shift(); l.push(b.dataset.ex); } C.ex = l; G.Audio.ui(); re(); });
  $('#mprim').onchange = e => { C.primary = e.target.value; store.set('mis', C); };
  $('#msec').onchange = e => { C.secondary = e.target.value; store.set('mis', C); };
  root.querySelectorAll('[data-cust]').forEach(b => b.onclick = () => { const id = b.dataset.cust === 'prim' ? C.primary : C.secondary; UI.sel.era = G.WEAPON[id].e; UI.sel.wp = id; store.set('sel', UI.sel); UI.show('armory'); });
  $('#mkit').onclick = () => UI.show('kit');
  $('#back').onclick = () => UI.show('menu');
  $('#mgo').onclick = () => { G.Audio.init(); UI.deployMission(); };
  $('#mrnd').onclick = () => { const t = UI.randomLoadout(C); G.Audio.ui('attach'); re(); UI.toast && UI.toast(t, 3); };
  $('#mrndeach').onchange = e => { C.rnd = e.target.checked; store.set('mis', C); };
}
// random build: any primary and sidearm from any era with random attachments, a random kit in every slot, four random explosives
UI.randomLoadout = function (C) {
  const pick = l => l[Math.floor(Math.random() * l.length)];
  const p = pick(G.WEAPONS.filter(w => w.c !== 'PST')), s = pick(G.WEAPONS.filter(w => w.c === 'PST'));
  for (const wp of [p, s]) { const L = {}; for (const [sl] of G.SLOTS) { const o = G.attachFor(wp, sl); if (o.length) L[sl] = pick(o).id; } UI.saveLoadout(wp, L); }
  C.primary = p.id; C.secondary = s.id;
  const kit = G.Kit.current; for (const [sl] of G.GEAR_SLOTS) kit[sl] = pick(G.gearFor(sl)).id; G.Kit.save(kit);
  const ex = G.EXPLOSIVES.map(e => e.id).sort(() => Math.random() - .5); C.ex = ex.slice(0, 4);
  store.set('mis', C);
  return `${p.n} + ${s.n} · ${G.GEARID[kit.helmet].n}, ${G.GEARID[kit.armor].n}`;
};
// Armory → "Test in a mission": pick the mission map, time of day and difficulty, then deploy with this gun
UI.missionPicker = function (wp) {
  const C = UI.mis; if (!G.MISSION[C.mission]) C.mission = G.MISSIONS[0].id;
  const draw = () => {
    const o = overlay(`<div class="dialog" style="width:min(1060px,100%);max-height:92vh;overflow:auto"><div class="eyebrow">Test in a mission · ${esc(wp.n)}</div><h2>Choose the operation</h2>
      <span class="lbl">Mission map</span><div class="row" style="margin-bottom:10px">${G.MISSIONS.map(m => `<button class="card ${m.id === C.mission ? 'on' : ''}" data-pm="${m.id}"><small>${esc(m.loc)}${m.out ? ' · ' + Math.round(m.out.bounds * 2) + ' m' : ''}</small><b>${esc(m.name)}</b><span>${esc(m.blurb)}</span></button>`).join('')}</div>
      <span class="lbl">Difficulty</span><div class="row" style="margin-bottom:10px">${G.TIERS.map((t, i) => `<button class="card ${C.tier === t.id ? 'on' : ''}" data-pt="${t.id}"><small style="color:${t.color}">Tier ${i + 1}</small><b>${t.n}</b><span>${t.d}</span></button>`).join('')}<button class="card ${C.tier === 'mixed' ? 'on' : ''}" data-pt="mixed"><small>All tiers</small><b>Mixed cell</b><span>Recruits and hardened fighters together.</span></button></div>
      <span class="lbl">Time of day</span><div class="row" style="margin-bottom:14px">${Object.entries(G.TOD).map(([k, t]) => `<button class="card ${k === C.tod ? 'on' : ''}" data-pd="${k}"><b>${t.n}</b><span>${t.d}</span></button>`).join('')}</div>
      <div class="btns"><button class="btn primary" id="pm-go" style="font-size:18px;padding:12px 30px">Deploy with the ${esc(wp.n)}</button><button class="btn" id="pm-cancel">Cancel</button></div></div>`);
    o.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => { C.mission = b.dataset.pm; G.Audio.ui(); draw(); });
    o.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { C.tier = b.dataset.pt; G.Audio.ui(); draw(); });
    o.querySelectorAll('[data-pd]').forEach(b => b.onclick = () => { C.tod = b.dataset.pd; G.Audio.ui(); draw(); });
    $('#pm-cancel').onclick = () => UI.closeOverlay();
    $('#pm-go').onclick = () => { UI.closeOverlay(); if (wp.c === 'PST') C.secondary = wp.id; else C.primary = wp.id; if (!G.WEAPON[C.primary] || G.WEAPON[C.primary].c === 'PST') C.primary = 'm4a1'; const rnd = C.rnd; C.rnd = false; store.set('mis', C); G.Audio.init(); UI.deployMission(); C.rnd = rnd; store.set('mis', C); };
  };
  draw();
};
UI.deployMission = function () {
  if (UI.mis.rnd) UI.randomLoadout(UI.mis);
  const C = UI.mis, p = G.WEAPON[C.primary], s = G.WEAPON[C.secondary];
  const cfg = { mission: C.mission, tod: C.tod, tier: C.tier, explosives: (C.ex || ['m67', 'm84', 'm18', 'c4']).slice(), primary: { wp: p, L: UI.loadoutFor(p) }, secondary: s ? { wp: s, L: UI.loadoutFor(s) } : null };
  UI.lastMission = cfg;
  loading('Inserting…', () => G.Game.startMission(cfg));
};
UI.showMissionResults = function () {
  const Gm = G.Game, Ms = Gm.mission; G.Input.unlock();
  const acc = Gm.stats && Gm.stats.shots ? Math.round(Gm.stats.hits / Gm.stats.shots * 100) : 0;
  const tm = Math.round(Ms.t), mm = `${(tm / 60) | 0}:${String(tm % 60).padStart(2, '0')}`;
  const stars = !Ms.ok ? 0 : 1 + (Ms.dmgTaken < 60 ? 1 : 0) + (acc >= 45 ? 1 : 0);
  const P0 = Gm.player, wn = P0 && P0.weapons ? P0.weapons.map(w => w.wp.n).join(' + ') : '';
  overlay(`<div class="dialog" style="width:min(560px,100%)"><div class="eyebrow">${esc(Ms.M.name)} · ${esc(G.TOD[Ms.cfg.tod].n)}</div><h2>${Ms.ok ? 'Mission complete' : 'Mission failed'}</h2>
    <p class="muted">${esc(Ms.reason || '')}</p>
    <p class="muted">${esc(wn)}</p>${Ms.ok ? `<div style="font:700 34px var(--f-ui);color:var(--accent,#c9a24b)">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>` : ''}
    <dl class="spec">${([['Time', mm], ['Structure hostiles', `${Ms.killed} / ${Ms.total}`], ['Outlying hostiles', `${Ms.outKilled || 0} / ${Ms.outTotal || 0}`], ['Headshots', Ms.heads], ['Accuracy', `${acc}% (${Gm.stats ? Gm.stats.hits : 0}/${Gm.stats ? Gm.stats.shots : 0})`], ['Damage taken', Math.round(Ms.dmgTaken)], ['Hostages safe', `${Ms.hostages - Ms.hostagesLost} / ${Ms.hostages}`]]).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl>
    <div class="btns"><button class="btn primary" id="x-again">Retry</button><button class="btn" id="x-setup">Change mission</button><button class="btn" id="x-arm">Armory</button><button class="btn" id="x-kit">Kit locker</button><button class="btn" id="x-menu">Main menu</button></div></div>`);
  $('#x-again').onclick = () => { UI.closeOverlay(); if (UI.mis.rnd) { Gm.cleanup(); Gm.player = null; UI.deployMission(); } else loading('Inserting…', () => G.Game.startMission(UI.lastMission)); };
  $('#x-setup').onclick = () => { UI.closeOverlay(); Gm.cleanup(); Gm.player = null; UI.show('missions'); };
  if ($('#x-arm')) $('#x-arm').onclick = () => { UI.closeOverlay(); Gm.cleanup(); Gm.player = null; UI.show('armory'); };
  $('#x-kit').onclick = () => { UI.closeOverlay(); Gm.cleanup(); Gm.player = null; UI.show('kit'); };
  $('#x-menu').onclick = () => { UI.closeOverlay(); Gm.cleanup(); Gm.player = null; UI.show('menu'); };
};

// ------------------------------------------------------------ BATTLE SETUP
UI.startRange = function (o = {}) {
  const wp = G.WEAPON[UI.sel.wp] || G.WEAPONS[0];
  const list = [{ wp, L: UI.loadoutFor(wp) }];
  const side = G.WEAPONS.find(w => w.e === wp.e && w.c === 'PST' && w.id !== wp.id);
  if (side && wp.c !== 'PST') list.push({ wp: side, L: UI.loadoutFor(side) });
  G.Audio.init();
  loading('Walking to the firing line…', () => { G.Game.startRange(list); if (o.kitTest) { G.Game.clearTargets(); G.Game.addTarget('kitdummy', 10, { orient: 'front' }); G.Game.addTarget('kitdummy', 25, { orient: 'rear' }); UI.rangeSel = Object.assign({ era: wp.e, tier: 'regular', veh: 'sedan' }, UI.rangeSel || {}, { type: 'kitdummy', dist: 10, orient: 'front' }); G.Game.toast('Your kit is on the mannequins — front at 10 m, back at 25 m. T for more targets.', 5); } });
};
UI.esc = esc; UI.store = store; UI.statBars = statBars; UI.barsHTML = barsHTML; UI.massOf = massOf; UI.overlay = html => overlay(html); UI.loading = (m, f) => loading(m, f);
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
  chromeBar(!!on);
  const Gm = G.Game;
  if (Gm.mode === 'menu') return;
  if (on) {
    Gm.state = Gm.state === 'end' ? 'end' : 'pause'; G.Input.unlock(); G.Input.clear();
    const o = overlay(`<div class="dialog"><div class="eyebrow">${Gm.mode === 'range' ? 'Firing range' : esc(Gm.map ? Gm.map.name : '')}</div><h2>Paused</h2><div class="btns">
      <button class="btn primary" id="p-res">Resume</button>
      ${Gm.mode === 'range' ? '<button class="btn" id="p-tgt">Targets & wind (T)</button><button class="btn" id="p-arm">Change weapon</button>' : '<button class="btn" id="p-rs">Restart mission</button>'}
      <button class="btn" id="p-help">Controls</button><button class="btn" id="p-set">Settings</button><button class="btn" id="p-quit">Quit to main menu</button></div></div>`);
    $('#p-res').onclick = () => UI.resume();
    $('#p-set').onclick = () => UI.settings(() => UI.pause(true));
    $('#p-help').onclick = () => { UI.closeOverlay(); Gm.state = 'pause'; UI.toggleHelp(true, () => UI.pause(true)); };
    $('#p-quit').onclick = () => { UI.closeOverlay(); Gm.cleanup(); Gm.state = 'menu'; Gm.player = null; UI.show('menu'); };
    if ($('#p-tgt')) $('#p-tgt').onclick = () => { UI.closeOverlay(); UI.toggleRangeMenu(true); };
    if ($('#p-arm')) $('#p-arm').onclick = () => { UI.closeOverlay(); Gm.cleanup(); Gm.state = 'menu'; Gm.player = null; UI.show('armory'); };
    if ($('#p-rs')) $('#p-rs').onclick = () => { UI.closeOverlay(); loading('Inserting…', () => G.Game.startMission(UI.lastMission)); };
  } else UI.resume();
};
UI.resume = function () { chromeBar(false); UI.closeOverlay(); const h = $('#helpov'); if (h) h.remove(); if (G.Game.state === 'pause') G.Game.state = 'play'; if (!G.Input.touch) G.Input.lock(); };
UI.onEscape = function () {
  if (G.Game.lootOpen && G.Raid) { G.Raid.closePanel(); return; }
  const Gm = G.Game;
  if ($('#rmenu')) { UI.toggleRangeMenu(false); return; }
  if (Gm.mode === 'menu') { if ($('#ov')) UI.closeOverlay(); return; }
  if (Gm.state === 'play') UI.pause(true); else if (Gm.state === 'pause') UI.resume();
};
const KEYS = [['W A S D', 'Move'], ['Mouse', 'Look'], ['Left click', 'Fire'], ['Right click', 'Aim down sights'], ['Shift', 'Sprint · hold breath when scoped'], ['Space', 'Jump'], ['C', 'Crouch'], ['Z', 'Prone (auto bipod)'], ['Q / E', 'Lean'], ['R', 'Reload'], ['B', 'Fire mode'], ['1 / 2 · wheel', 'Switch weapon'], ['[ / ]', 'Zeroing distance'], ['X', 'Bipod'], ['V', 'Melee / bayonet'], ['G', 'Underbarrel launcher'], ['F', 'Loot / search containers and bodies (inspect your weapon when none near)'], ['T', 'Take / swap a weapon lying on the ground'], ['K', 'Drop weapon in hand'], ['3', 'Throw / place explosive (again: detonate charges)'], ['4', 'Next explosive type'], ['L', 'Laser / light / strobe modes'], ['Wheel (scoped)', 'Zoom a variable-power optic'], ['H', 'Switch sight: magnifier, offset / piggyback dot, power lever'], ['O', 'Fold or collapse the stock'], ['U', 'Take the suppressor off / put it on'], ['I', 'Gear check: weapon and kit perks'], ['M', 'Minimap on / off (Shift+M: whole map)'], ['J', 'Night vision'], ['T', 'Range: targets & wind'], ['N', 'Range: fly mode'], ['Y', 'Range: reset targets'], ['Tab', 'Extraction: inventory, exfils, timer'], ['5', 'Extraction: bandage / heal'], ['F1', 'Show these controls'], ['Esc', 'Pause']];
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
  const st = UI.rangeSel = UI.rangeSel || { type: 'paper', dist: 25, era: G.Game.player ? (G.Game.player.W.wp.home || G.Game.player.W.wp.e) : 'ww2', tier: 'regular', veh: 'sedan', orient: 'side' };
  m = document.createElement('div'); m.id = 'rmenu';
  const draw = () => {
    m.innerHTML = `<div class="dialog"><div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px"><div><div class="eyebrow">Range control</div><h2>Targets</h2></div><span class="muted" style="font:12px var(--f-mono)">${G.Game.targets.length} / 9 placed</span></div>
      <div class="grid">${G.TARGETS.map(t => `<button class="card ${st.type === t.id ? 'on' : ''}" data-ty="${t.id}"><b>${t.n}</b><span>${t.d}</span></button>`).join('')}</div>
      ${st.type === 'vehicle' ? `<div><span class="lbl">Vehicle</span><div class="grid">${G.VEHICLES.map(v => `<button class="card ${st.veh === v.id ? 'on' : ''}" data-veh="${v.id}"><small>${G.ERA[v.era].name}</small><b>${esc(v.n)}</b><span>${esc(v.d)}</span></button>`).join('')}</div></div>
      <div><span class="lbl">Facing you</span><div class="eras">${[['side', 'Side'], ['front', 'Front'], ['rear', 'Rear'], ['quarter', '45° quarter']].map(([k, n]) => `<button class="chip ${st.orient === k ? 'on' : ''}" data-or="${k}">${n}</button>`).join('')}</div></div>` : ''}
      ${st.type === 'kitdummy' ? `<div><span class="lbl">Facing you</span><div class="eras">${[['front', 'Front'], ['rear', 'Back'], ['side', 'Side'], ['quarter', '45° quarter']].map(([k, n]) => `<button class="chip ${st.orient === k ? 'on' : ''}" data-or="${k}">${n}</button>`).join('')}</div><p class="muted" style="margin:6px 0 0">Wearing: ${esc(G.GEAR_SLOTS.map(([sl]) => G.GEARID[G.Kit.current[sl]]).filter(g => g && !/^(None|No plates|Bare hands)/.test(g.n)).map(g => g.n).join(' · '))}</p></div>` : ''}
      ${st.type === 'dummy' || st.type === 'walker' ? `<div class="loadrow"><div><span class="lbl">Mannequin era</span><select id="r-era">${G.ERAS.filter(e => !e.custom && !e.noWar).map(e => `<option value="${e.id}" ${st.era === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}</select></div><div><span class="lbl">Enemy tier</span><select id="r-tier">${G.TIERS.map(t => `<option value="${t.id}" ${st.tier === t.id ? 'selected' : ''}>${t.n}${t.armor < 1 ? ' (armoured from 1990)' : ''}</option>`).join('')}</select></div></div>` : ''}
      <div><span class="lbl">Distance</span><div class="eras">${G.RANGE_DISTS.map(d => `<button class="chip ${st.dist === d ? 'on' : ''}" data-d="${d}">${d} m</button>`).join('')}</div></div>
      <label class="field">Crosswind<input type="range" id="r-wind" min="-10" max="10" step=".5" value="${G.rangeWind || 0}"><output>${(G.rangeWind || 0).toFixed(1)} m/s</output></label>
      <div class="deploy"><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" id="r-clear">Clear all</button><button class="btn" id="r-reset">Reset targets</button></div><div style="display:flex;gap:6px"><button class="btn" id="r-close">Close</button><button class="btn primary" id="r-add">Place target</button></div></div></div>`;
    m.querySelectorAll('[data-ty]').forEach(b => b.onclick = () => { st.type = b.dataset.ty; draw(); });
    m.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { st.dist = +b.dataset.d; draw(); });
    m.querySelectorAll('[data-veh]').forEach(b => b.onclick = () => { st.veh = b.dataset.veh; draw(); });
    m.querySelectorAll('[data-or]').forEach(b => b.onclick = () => { st.orient = b.dataset.or; draw(); });
    if ($('#r-era', m)) { $('#r-era', m).onchange = e => st.era = e.target.value; $('#r-tier', m).onchange = e => st.tier = e.target.value; }
    $('#r-wind', m).oninput = e => { G.rangeWind = +e.target.value; G.Ballistics.wind.set(G.rangeWind, 0, 0); m.querySelector('output').textContent = G.rangeWind.toFixed(1) + ' m/s'; };
    $('#r-clear', m).onclick = () => { G.Game.clearTargets(); G.FX.clear(); draw(); };
    $('#r-reset', m).onclick = () => { for (const T of G.Game.targets) T.reset && T.reset(); G.FX.clear(); };
    $('#r-close', m).onclick = () => UI.toggleRangeMenu(false);
    $('#r-add', m).onclick = () => { G.Game.addTarget(st.type, st.dist, { era: st.era, tier: st.tier, veh: st.veh, orient: st.orient }); G.Audio.ui('attach'); UI.toggleRangeMenu(false); };
  };
  draw();
  document.body.appendChild(m);
};
// ============================================================ HUD
UI.showHUD = function (mode) {
  chromeBar(false);
  UI.screen = 'game';
  $('#ui').innerHTML = ''; UI.closeOverlay();
  const h = $('#hud'); h.hidden = false;
  h.innerHTML = `<canvas id="scope"></canvas><div id="supp"></div><div id="vign"></div>
    <div id="xhair"><i class="t"></i><i class="b"></i><i class="l"></i><i class="r"></i><i class="d"></i></div>
    <div id="hit"><i></i><i></i><i></i><i></i></div><div id="dmgdir"></div>
    <div class="hudbox" id="ammo"><div class="wn"></div><div id="rounds"></div><div class="mag"></div><div class="md"></div></div>
    <div class="hudbox" id="hp"><div class="v">100</div><div class="b"><i></i></div><div class="st"></div></div>
    ${mode === 'mission' ? '<div class="hudbox" id="score"><span class="a">0</span><span class="t">0:00</span><span class="e">0</span></div><div class="hudbox" id="feed"></div>' : ''}${mode === 'range' ? '<div class="hudbox" id="tcam" hidden><b></b></div><div class="hudbox" id="rstats"></div><div class="hudbox" id="rhint">T targets & wind · N fly · Y reset · [ ] zero · H controls</div>' : ''}
    <div class="hudbox" id="compass"><div class="strip"></div></div>
    <div class="hudbox" id="toast"></div><div id="flashfx" style="position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none"></div><div id="pips" style="position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none"></div><div id="kitinfo" style="position:absolute;right:24px;top:170px;max-width:430px;max-height:70vh;overflow:auto;font:12.5px/1.45 var(--f-ui,sans-serif);color:#e8e2cc;background:rgba(10,12,10,.82);border:1px solid rgba(230,197,114,.35);border-radius:6px;padding:10px 14px;pointer-events:none;display:none"></div><div id="expl" style="position:absolute;right:24px;bottom:150px;font:600 13px var(--f-mono,monospace);color:#e8e2cc;text-align:right;text-shadow:0 1px 2px #000;pointer-events:none"></div><div id="pick" style="position:absolute;left:50%;top:62%;transform:translateX(-50%);font:600 15px var(--f-ui,sans-serif);color:#fff;background:rgba(0,0,0,.55);padding:6px 12px;border-radius:4px;pointer-events:none;display:none"></div><div class="hudbox" id="center"></div><div class="hudbox" id="board" hidden></div>`;
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
  // mission objective
  updatePips(P, Gm); updateKitInfo(P);
  { const fx = $('#flashfx'); if (fx) fx.style.opacity = Math.min(1, (Gm.flashT || 0) / 2.5).toFixed(3); const ex = $('#expl'), X = P.expl; if (ex && X && X.list.length && (UI.dirty || Gm.frame % 10 === 0)) { const E = G.EXPLOSIVE[X.list[X.sel]]; ex.textContent = `${E.n} ×${X.counts[E.id] > 90 ? '∞' : X.counts[E.id]}  [3] use · [4] next`; } }
  { const pk = $('#pick'), np = Gm.nearPick; if (pk) { if (np) { const cur = P.weapons.find(w => (w.wp.c === 'PST') === (np.wp.c === 'PST')); pk.textContent = `T — ${cur ? 'swap ' + cur.wp.n + ' for' : 'pick up'} ${np.wp.n} (${np.mag} + ${np.reserve})`; pk.style.display = 'block'; } else pk.style.display = 'none'; } }
  if (Gm.mode === 'mission' && Gm.mission) {
    const Ms = Gm.mission, sc = $('#score'), t = Ms.t | 0, tm = `${(t / 60) | 0}:${String(t % 60).padStart(2, '0')}`;
    if (sc) { sc.children[0].textContent = Ms.killed; sc.children[2].textContent = Ms.total - Ms.killed; sc.children[1].textContent = `${tm} · hostiles left · hostages ${Ms.hostages - Ms.hostagesLost}`; }
    if (UI.dirty) { const f = $('#feed'); if (f) f.innerHTML = Gm.killfeed.map(k => `<div><span class="${k.kt === 0 ? 'a' : 'e'}">${esc(k.k)}</span><span class="w">${esc(k.w)}${k.head ? ' ⌖' : ''}</span><span class="${k.vt === 0 ? 'a' : 'e'}">${esc(k.v)}</span></div>`).join(''); UI.dirty = false; }
  }
  if (Gm.mode === 'range' && (UI.dirty || Gm.frame % 10 === 0)) {
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

// ------------------------------------------------------------ HEARING CUES & GEAR CHECK
// active hearing protection: footsteps of nearby moving hostiles show as cues around the sights;
// a radio marks hostiles who call out a contact
function updatePips(P, Gm) {
  const el = $('#pips'); if (!el || Gm.frame % 3) return;
  const km = P.km || {}; if (!P.alive || (!km.hear && !km.radio)) { if (el.innerHTML) el.innerHTML = ''; return; }
  const now = performance.now(); let h = '';
  for (const b of Gm.bots || []) {
    if (!b.alive || b.team === P.team) continue;
    const dx = b.pos.x - P.pos.x, dz = b.pos.z - P.pos.z, d = Math.hypot(dx, dz), sp = b.vel ? Math.hypot(b.vel.x, b.vel.z) : 0;
    const radio = km.radio && b.radioT > now && d < 170, heard = km.hear && d < 32 && sp > (b.crouch ? 2.5 : .6);
    if (!radio && !heard) continue;
    const rel = Math.atan2(-dx, -dz) - P.yaw, R = 120 + Math.min(60, d * .8);
    const x = -Math.sin(rel) * R, y = -Math.cos(rel) * R, a = radio ? .95 : Math.max(.25, 1 - d / 32);
    h += `<i style="position:absolute;left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;width:${radio ? 12 : 9}px;height:${radio ? 12 : 9}px;margin:-5px;border-radius:${radio ? '2px' : '50%'};transform:rotate(${(-rel * 180 / Math.PI).toFixed(0)}deg);background:${radio ? '#ff5a40' : '#e6c572'};opacity:${a.toFixed(2)};box-shadow:0 0 6px ${radio ? '#ff5a40' : '#e6c572'}"></i>`;
  }
  el.innerHTML = h;
}
function updateKitInfo(P) {
  const el = $('#kitinfo'); if (!el) return;
  if (!P.showInfo || !P.W) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
  const w = P.W, key = w.wp.id + JSON.stringify(w.st) + JSON.stringify(w.L) + (P.km ? P.km.camo.toFixed(2) : '');
  el.style.display = 'block'; if (el.dataset.k === key) return; el.dataset.k = key;
  const perks = G.weaponPerks(w.S, w.L), km = P.km || G.kitMods(P.kit, G.kitEnv());
  const kitRows = G.GEAR_SLOTS.map(([sl]) => G.GEARID[P.kit[sl]]).filter(g => g && G.gearProps(g).perks.length).map(g => `<div><b style="color:#e6c572">${esc(g.n)}</b><br>${G.gearProps(g).perks.map(([n, d, good]) => `<span style="color:${good ? '#a6d98a' : '#ec8a7a'}">${esc(n)}</span> <span style="opacity:.7">${esc(d)}</span>`).join('<br>')}</div>`).join('');
  const camo = km.envMatch < .9 ? 'good' : km.envMatch > 1.05 ? 'poor' : 'fair';
  el.innerHTML = `<div style="font-weight:700;letter-spacing:.06em;margin-bottom:4px">GEAR CHECK <span style="opacity:.6;font-weight:400">· I to close</span></div>
    <div style="margin-bottom:6px"><b>${esc(w.wp.n)}</b> · ${w.S.wt.toFixed(2)} kg · ${w.S.mag} rds · ${Math.round(w.S.rpm)} rpm${w.st.supOff ? ' · suppressor OFF' : ''}${w.st.fold ? ' · stock folded' : ''}${w.st.coll ? ' · stock collapsed' : ''}<br>${G.SLOTS.map(([s]) => G.ATT[w.L[s]]).filter(a => a && !(G.DEFAULT_IDS || []).includes(a.id)).map(a => esc(a.n)).join(' · ') || 'Factory configuration'}</div>
    ${perks.map(p => `<div><span style="color:${p.k === 'warn' ? '#ec8a7a' : '#e6c572'}">${esc(p.n)}</span> <span style="opacity:.7">${esc(p.d)}</span></div>`).join('')}
    <div style="margin:8px 0 4px;font-weight:700;letter-spacing:.06em">KIT · ${P.kitKg.toFixed(1)} kg · camouflage ${camo} here</div>
    <div style="display:flex;flex-direction:column;gap:5px">${kitRows}</div>`;
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
  const night = (G.E.map && ['night', 'dusk', 'dawn'].includes(G.E.map.env)) || P.nvgOn || w.S.nv || w.S.thermal;
  const ink = w.S.illum && night ? '#ff3b24' : w.S.thermal ? '#101010' : '#0b0b0b'; // illuminated reticles glow in the dark
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
      break; }
    case 'dot': dot(cx, cy, 2.6, '#ff3b24'); break;
    case 'irons': dot(cx, cy, 2, ink); break;
    default: line(cx - R, cy, cx + R, cy, 1); line(cx, cy - R, cx, cy + R, 1);
  }
  if (w.S.lrf || w.S.bc || ret === 'xm157') { // laser rangefinder readout, ballistic computer hold point
    const red = '#ff3b24';
    const cam = G.E.camera, d = V3(0, 0, -1).applyQuaternion(cam.quaternion);
    const hit = G.E.world.raycast(cam.position, d, 1500);
    let rng = hit ? hit.t : null;
    if (G.Game.targets) for (const T of G.Game.targets) { const tt = T.rayTest(cam.position, d, 1500, {}); if (tt >= 0 && (rng == null || tt < rng)) rng = tt; }
    for (const a of G.Game.agents) if (a !== P && a.alive) for (const hb of a.hitboxes()) { const tt = G.rayCapsule(cam.position, d, hb.a, hb.b, hb.r); if (tt >= 0 && (rng == null || tt < rng)) rng = tt; }
    x.fillStyle = red; x.font = '600 14px monospace';
    if (rng) {
      x.fillText(`RNG ${rng.toFixed(0)} M`, cx + R * .35, cy + R * .45);
      if (w.S.bc || ret === 'xm157') { const drop = computeHold(w, rng); x.fillText(`HOLD ${drop >= 0 ? '▼' : '▲'} ${Math.abs(drop).toFixed(1)} MIL`, cx + R * .35, cy + R * .45 + 18); dot(cx, cy + drop * ppm, 2.5, '#ffd02a'); }
    } else x.fillText('RNG ---', cx + R * .35, cy + R * .45);
  }
  x.restore();
  // lens tint & scope rim
  x.strokeStyle = 'rgba(20,20,20,1)'; x.lineWidth = 6; x.beginPath(); x.arc(ex, ey, R, 0, 7); x.stroke();
  x.fillStyle = 'rgba(140,170,200,.04)'; x.beginPath(); x.arc(ex, ey, R, 0, 7); x.fill();
  x.fillStyle = 'rgba(230,197,114,.9)'; x.font = '12px monospace';
  x.fillText(`${zoom}×${w.S.zmin && !w.st.alt ? ` (${w.S.zmin}–${w.S.zmax}× · wheel)` : ''}${w.S.alt ? ' · H: switch sight' : ''}${w.S.nv ? ' · NIGHT' : ''}${w.S.thermal ? ' · THERMAL' : ''} · ZERO ${w.zero} M${G.Game.mode === 'range' && G.rangeWind ? ` · WIND ${G.rangeWind.toFixed(1)} M/S` : ''}${P.holding ? ' · BREATH HELD' : P.breath < .3 ? ' · OUT OF BREATH' : ''}`, 18, H - 18);
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

// ------------------------------------------------------------ TARGET CAMERA (range)
const TCAM = { cam: new THREE.PerspectiveCamera(28, 300 / 180, .05, 200) };
function renderTargetCam(R, Gm) {
  const el = $('#tcam');
  const T = Gm.mode === 'range' && Gm.camTarget && Gm.targets.includes(Gm.camTarget) ? Gm.camTarget : null;
  if (el) el.hidden = !T;
  if (!T || !el) return;
  const W = 300, H = 180, x = 20, y = window.innerWidth < 900 ? 90 : 118;
  const f = T.focus, d = Math.max(1.8, (T.w || .5) * 2.8);
  TCAM.cam.position.set(f.x + .15, f.y + .08, f.z + d); TCAM.cam.lookAt(f.x, f.y, f.z);
  R.setScissorTest(true); R.setScissor(x, y, W, H); R.setViewport(x, y, W, H);
  R.clear(); R.render(G.E.scene, TCAM.cam);
  R.setScissorTest(false); R.setViewport(0, 0, G.E.W, G.E.H);
  el.style.left = x + 'px'; el.style.bottom = y + 'px';
  const lab = el.querySelector('b'); const txt = `TARGET CAM · ${T.dist} M · ${T.type.toUpperCase()}`; if (lab.textContent !== txt) lab.textContent = txt;
}

// ============================================================ NIGHT VISION
// phosphor tint on the 3D canvas, tube mask (mono / binocular / panoramic quad) and scintillation noise
// thermal optics: living people glow white-hot through the scope
UI.thermalGlow = function (on) {
  if (on === !!UI._thermal) return; UI._thermal = on;
  for (const b of (G.Game.bots || [])) { const root = b.model && b.model.root; if (!root) continue;
    root.traverse(o => { if (!o.isMesh || !o.material || !o.material.emissive) return;
      if (on && b.alive) { if (!o.userData.th) { o.userData.th = o.material; o.material = o.material.clone(); } o.material.emissive.set('#ffffff'); o.material.emissiveIntensity = .9; }
      else if (o.userData.th) { o.material.dispose(); o.material = o.userData.th; o.userData.th = null; } }); }
};
UI.nvgFx = function (nv) {
  const key = nv ? nv.view + (nv.white ? 'w' : 'g') + (nv.thermal ? 't' : '') + G.E.W + 'x' + G.E.H : '';
  let ov = document.getElementById('nvgov');
  if (!ov) { ov = document.createElement('canvas'); ov.id = 'nvgov'; ov.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3'; document.body.appendChild(ov); UI.nvNoise = document.createElement('canvas'); UI.nvNoise.width = 160; UI.nvNoise.height = 90; UI.nvNoise.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;mix-blend-mode:screen;opacity:.16;image-rendering:pixelated'; document.body.appendChild(UI.nvNoise); }
  const c = G.E.renderer.domElement;
  if (key !== UI.nvKey) {
    UI.nvKey = key;
    c.style.filter = !nv ? '' : nv.white ? `grayscale(1) sepia(.3) hue-rotate(150deg) saturate(.9) contrast(${nv.thermal ? 1.45 : 1.15})` : 'sepia(1) saturate(4.5) hue-rotate(52deg) contrast(1.12)';
    ov.hidden = UI.nvNoise.hidden = !nv;
    if (nv) {
      const W = ov.width = Math.round(G.E.W / 2), H = ov.height = Math.round(G.E.H / 2), x = ov.getContext('2d');
      x.fillStyle = 'rgba(0,0,0,.97)'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'destination-out';
      const r = H * .5, holes = nv.view === 'scope' ? [[.5, H * 2]] : nv.view === 'mono' ? [[.5, r * .98]] : nv.view === 'quad' ? [[.32, r * .92], [.44, r * .96], [.56, r * .96], [.68, r * .92]] : [[.42, r * .95], [.58, r * .95]];
      for (const [fx, rr] of holes) { const g = x.createRadialGradient(W * fx, H / 2, rr * .82, W * fx, H / 2, rr); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(W * fx, H / 2, rr, 0, 7); x.fill(); }
      x.globalCompositeOperation = 'source-over';
    }
  }
  if (nv && G.Game.frame % 2 === 0) { const n = UI.nvNoise.getContext('2d'), im = n.createImageData(160, 90), q = (1 - nv.q) * 180 + 40; for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * q; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } n.putImageData(im, 0, 0); }
};

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
    if (G.Game.mode === 'menu' || !G.Game.player) { if (UI.nvKey) UI.nvgFx(null); SR.render(dt); return; }
    const Gm = G.Game;
    if (Gm.state === 'play' || Gm.state === 'end') Gm.update(dt, now / 1000);
    else if (Gm.state === 'pause') { G.Input.frame(); }
    const P0 = Gm.player, SW = P0 && P0.W && P0.W.S, scopeNV = P0 && P0.scoped && SW && (SW.thermal ? { view: 'scope', white: true, thermal: true, q: .9 } : SW.nv ? { view: 'scope', q: .8 } : null);
    const nv = scopeNV || (P0 && P0.nvgOn && P0.alive ? (G.GEARID[P0.kit.nvg] || {}).nv : null);
    UI.thermalGlow(!!(scopeNV && scopeNV.thermal));
    let ex = (G.ENV[G.E.map.env] || {}).exp || 1;
    if (nv) ex *= ({ night: 4.2, dusk: 2.4, dawn: 2.4 }[G.E.map.env] || 1.6) * (.8 + nv.q * .3); // image intensifier gain
    R.toneMappingExposure = ex; UI.nvgFx(nv);
    R.clear();
    R.render(G.E.scene, G.E.camera);
    if (Gm.player && Gm.player.vm.pivot.visible) { R.clearDepth(); R.render(G.E.vmScene, G.E.vmCam); }
    renderTargetCam(R, Gm);
  }
  requestAnimationFrame(loop);
  window.G_READY = true;
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
