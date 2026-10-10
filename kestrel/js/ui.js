// Kestrel — HUD, menus, inventory/crafting, deck map, log reader, death/ending screens, touch controls.
(function () {
  const K = window.K;
  const $ = id => document.getElementById(id);
  const UI = K.UI = { modal: null, msgs: [] };
  let G;

  const ICON = {
    medkit: '<rect x="4" y="7" width="16" height="11" rx="1"/><path d="M12 9.5v6M9 12.5h6" stroke-width="2"/>',
    gel: '<rect x="9" y="5" width="6" height="14" rx="2"/><path d="M10 9h4"/>',
    cloth: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    scrap: '<path d="M4 15l5-6 4 3 3-5 4 8z"/>',
    chem: '<path d="M9 4h6M10 4v5l-4 9h12l-4-9V4"/>',
    battery: '<rect x="6" y="7" width="12" height="11" rx="1"/><path d="M10 5h4M10 12h4"/>',
    flare: '<path d="M7 17l10-10M15 5l4 4"/><circle cx="18" cy="6" r="1.5"/>',
    noise: '<rect x="6" y="9" width="12" height="7" rx="1"/><path d="M9 6c2-2 4-2 6 0"/>',
    bomb: '<rect x="5" y="9" width="14" height="6" rx="2"/><path d="M19 12h2"/>',
    rounds: '<path d="M8 18V9l1.5-3L11 9v9zM13 18V9l1.5-3L16 9v9z"/>',
    shells: '<rect x="6" y="6" width="5" height="12" rx="1"/><rect x="13" y="6" width="5" height="12" rx="1"/>',
    fuel: '<path d="M7 6h8l2 3v10H7z"/><path d="M10 12h4"/>',
    cells: '<rect x="8" y="5" width="8" height="14" rx="1"/><path d="M10 9h4M10 13h4"/>',
    key: '<rect x="4" y="7" width="16" height="10" rx="1"/><path d="M7 14h5"/>',
    log: '<rect x="5" y="5" width="14" height="14" rx="1"/><path d="M8 9h8M8 12h8M8 15h5"/>',
    tracker: '<rect x="5" y="5" width="14" height="10" rx="1"/><path d="M8 13a4 4 0 0 1 8 0M12 15v5"/>',
  };
  const svg = k => `<svg viewBox="0 0 24 24" class="ic">${ICON[k] || ICON.scrap}</svg>`;

  UI.init = function (g) {
    G = g;
    $('btnNew').onclick = () => { G.audio.init(); UI.closeAll(); G.newGame(); UI.requestLock(); };
    $('btnCont').onclick = () => { G.audio.init(); UI.closeAll(); if (!G.loadSave()) UI.msg('No saved game found.', 3); else UI.requestLock(); };
    $('btnResume').onclick = () => { UI.pause(false); UI.requestLock(); };
    $('btnQuit').onclick = () => { UI.pause(false); G.started = false; G.paused = true; G.unloadMap(); UI.show('menu'); UI.refreshMenu(); };
    $('btnRetry').onclick = () => { $('death').hidden = true; G.audio.init(); if (!G.loadSave()) G.newGame(); UI.requestLock(); };
    $('btnDeathNew').onclick = () => { $('death').hidden = true; G.newGame(); UI.requestLock(); };
    $('btnEndMenu').onclick = () => { $('ending').hidden = true; G.started = false; G.unloadMap(); UI.show('menu'); UI.refreshMenu(); };
    $('logClose').onclick = () => UI.closeLog();
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => UI.closeModal());
    document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => UI.openModal(b.dataset.tab));
    // settings
    const bind = (id, key, fn) => { const el = $(id); el.value = G.settings[key]; el.oninput = () => { G.settings[key] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value; if (el.type === 'checkbox') el.checked = G.settings[key]; G.saveSettings(); fn && fn(); }; if (el.type === 'checkbox') el.checked = !!G.settings[key]; };
    bind('setSens', 'sens'); bind('setVol', 'vol', () => G.audio.setVolume(G.settings.vol)); bind('setFov', 'fov'); bind('setQuality', 'quality', () => G.applyQuality()); bind('setInvert', 'invert'); bind('setBob', 'bob');
    G.audio.setVolume(G.settings.vol);
    UI.ecg = $('ecg').getContext('2d'); UI.ecgT = 0; UI.ecgPts = [];
    UI.refreshMenu();
    UI.setupTouch();
    UI.menuBg();
  };
  UI.requestLock = () => { if (!G.touch) setTimeout(() => G.lock(), 50); };
  UI.show = id => { for (const s of ['menu', 'hud']) $(s).hidden = s !== id && !(id === 'hud' && s === 'hud'); $(id).hidden = false; if (id === 'menu') $('hud').hidden = true; };
  UI.closeAll = () => { $('menu').hidden = true; $('death').hidden = true; $('ending').hidden = true; };
  UI.refreshMenu = function () {
    const s = G.getSave();
    $('btnCont').hidden = !s;
    if (s) $('contInfo').textContent = `${K.MAPINFO[s.map].title}${s.area ? ' · ' + s.area : ''} · ${fmtTime(s.stats.time)}`;
    else $('contInfo').textContent = '';
  };
  const fmtTime = t => { t = Math.floor(t); return `${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  UI.loading = function (on, text) { $('loading').hidden = !on; if (text) $('loadText').textContent = text; if (!on) { $('menu').hidden = true; $('hud').hidden = false; } };
  UI.pause = function (on) {
    if (!G.started) return;
    if (on && G.player.dead) return;
    G.paused = on; $('pause').hidden = !on;
    if (on) { UI.modal = null; $('inv').hidden = true; $('map').hidden = true; G.vm && G.vm.setFlame(false); if (document.pointerLockElement) document.exitPointerLock(); }
  };
  UI.onKey = function (e) {
    const c = e.code;
    if ($('logView').hidden === false) { if (c === 'Escape' || c === 'KeyE' || c === 'Enter' || c === 'Space') { UI.closeLog(); return true; } return true; }
    if (UI.modal) {
      if (c === 'Escape' || (c === 'Tab' || c === 'KeyI') && UI.modal === 'inv' || c === 'KeyM' && UI.modal === 'map') { UI.closeModal(); return true; }
      if (c === 'KeyM') { UI.openModal('map'); return true; } if (c === 'KeyI' || c === 'Tab') { UI.openModal('inv'); return true; }
      return true;
    }
    if (!G.started || G.player.dead) return false;
    if (c === 'Escape' && !G.paused) { UI.pause(true); return true; }
    if (G.paused) { if (c === 'Escape') { UI.pause(false); UI.requestLock(); } return true; }
    if (c === 'KeyI' || (c === 'Tab' && !G.inv.tracker)) { UI.openModal('inv'); return true; }
    if (c === 'KeyM') { UI.openModal('map'); return true; }
    return false;
  };
  UI.openModal = function (which) {
    UI.modal = which; G.paused = true; G.noLockPause = true; if (document.pointerLockElement) document.exitPointerLock();
    setTimeout(() => G.noLockPause = false, 200);
    $('inv').hidden = which !== 'inv'; $('map').hidden = which !== 'map';
    if (which === 'inv') UI.renderInv(); else UI.renderMap();
  };
  UI.closeModal = function () { UI.modal = null; $('inv').hidden = true; $('map').hidden = true; G.paused = false; UI.requestLock(); };

  // ------------------------------------------------------------------ messages
  UI.msg = function (text, secs = 3) {
    const box = $('msgs'), el = document.createElement('div'); el.className = 'msg'; el.textContent = text; box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 800); }, secs * 1000);
  };
  UI.title = function (t, sub) { const el = $('titleCard'); el.innerHTML = `<b>${t}</b><span>${sub}</span>`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); };
  UI.objective = function (flash) {
    if (!G.info) return;
    let t = G.info.obj[Math.min(G.progress, 3)];
    if (G.flags.launch) t = 'GET TO THE SHUTTLE BAY';
    const target = UI.objTarget();
    const sec = target ? (G.L.sectorNames[G.L.areas[target.id].sector % G.L.sectorNames.length]) : '';
    $('objective').innerHTML = `<i>OBJECTIVE</i>${t}${sec ? `<small>${sec} SECTOR</small>` : ''}`;
    if (flash) { $('objective').classList.remove('flash'); void $('objective').offsetWidth; $('objective').classList.add('flash'); }
  };
  UI.objTarget = function () {
    const L = G.L; if (!L) return null;
    if (G.flags.launch) return L.shuttleRoom;
    if (G.progress >= 3) return L.goalRoom;
    return L.keyRooms[G.progress + 1];
  };
  UI.hitmark = function (kill) { const h = $('hitmark'); h.className = kill ? 'kill' : ''; h.style.opacity = 1; clearTimeout(UI.hmT); UI.hmT = setTimeout(() => h.style.opacity = 0, 120); };
  UI.flashRed = function (strong) { G.post.mat.uniforms.red.value = strong ? 1.5 : .8; };
  UI.hurtDir = function (a) {
    if (a == null) return; const el = $('hurtArc'); const rel = K.angDiff(G.player.yaw + Math.PI, a);
    el.style.transform = `translate(-50%,-50%) rotate(${-rel}rad)`; el.style.opacity = 1; clearTimeout(UI.haT); UI.haT = setTimeout(() => el.style.opacity = 0, 600);
  };
  UI.fade = function (to, secs, cb) { const el = $('fade'); el.style.transition = `opacity ${secs}s`; el.style.opacity = to; if (cb) setTimeout(cb, secs * 1000 + 50); };
  UI.showLog = function (log) { $('logTitle').textContent = log[0]; $('logBody').textContent = log[1]; $('logView').hidden = false; G.paused = true; G.noLockPause = true; if (document.pointerLockElement) document.exitPointerLock(); setTimeout(() => G.noLockPause = false, 200); };
  UI.closeLog = function () { $('logView').hidden = true; if (!UI.modal) { G.paused = false; UI.requestLock(); } };
  UI.death = function () {
    const d = $('death'); d.hidden = false; if (document.pointerLockElement) document.exitPointerLock();
    const lines = { stalker: 'It found you.', locker: 'It knew where you were hiding.', wounds: 'You bled out on the deck plating.', blast: 'Nothing left to recover.' };
    $('deathWhy').textContent = lines[G.deathKind] || '';
    $('btnRetry').textContent = G.getSave() ? 'Continue from last record' : 'Try again';
  };
  UI.ending = function () {
    const e = $('ending'); e.hidden = false; $('hud').hidden = true; if (document.pointerLockElement) document.exitPointerLock();
    $('endStats').innerHTML = `<div><b>${fmtTime(G.stats.time)}</b>time aboard</div><div><b>${G.stats.kills}</b>infected put down</div><div><b>${G.stats.deaths}</b>deaths</div><div><b>${G.stats.saves}</b>records saved</div>`;
    UI.fade(0, 2);
  };

  // ------------------------------------------------------------------ per-frame HUD
  UI.update = function (dt) {
    if (!G.started || !G.inv) return;
    const P = G.player, inv = G.inv, vm = G.vm;
    // prompt
    if (!G.paused && !P.dead) {
      const ia = G.findInteract();
      const pr = $('prompt');
      if (ia) { pr.innerHTML = `<kbd>${G.touch ? 'USE' : 'E'}</kbd>${ia.label}`; pr.hidden = false; pr.classList.toggle('warn', ia.kind === 'door'); } else pr.hidden = true;
    }
    // weapon/ammo
    const d = K.WEAPONS[vm.cur];
    $('wName').textContent = d.name;
    if (d.ammo) { $('wMag').textContent = Math.ceil(inv.mag[vm.cur]); $('wRes').textContent = inv.ammo[d.ammo]; $('ammoBox').classList.toggle('empty', inv.mag[vm.cur] <= 0); $('wRes').parentElement.hidden = false; }
    else { $('wMag').textContent = '—'; $('wRes').parentElement.hidden = true; }
    const ts = P.throwSel; $('throwBox').innerHTML = `${svg(ts)}<span>${K.ITEMS[ts].name}</span><b>${inv.items[ts] || 0}</b>`;
    $('medBox').innerHTML = `${svg('medkit')}<b>${inv.items.medkit}</b>`;
    // lamp + stamina + breath
    $('lampBar').style.width = (P.battery * 100) + '%'; $('lampBox').classList.toggle('off', !P.flashOn);
    $('stamBar').style.width = (P.stamina * 100) + '%'; $('stamBox').style.opacity = P.stamina < .98 ? 1 : 0; $('stamBox').classList.toggle('ex', P.exhausted);
    $('breath').hidden = !P.locker; $('breathBar').style.width = (P.breath * 100) + '%'; $('breath').classList.toggle('hold', P.holdingBreath); $('breath').classList.toggle('threat', G.lockerThreat > .7);
    $('cross').style.opacity = P.locker || vm.adsA > .7 || vm.cur === 'jack' ? 0 : .6;
    // health ECG (RE style)
    UI.drawECG(dt);
    // destruct timer
    const dz = $('destruct'); if (G.flags.launch) { dz.hidden = false; const t = Math.max(0, G.flags.destructT); dz.textContent = `SELF-DESTRUCT  ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${String(Math.floor(t * 10 % 10))}`; } else dz.hidden = true;
    // awareness eye (subtle)
    $('aware').style.opacity = K.clamp((G.stalkerAware || 0) * 1.2, 0, 1) * (G.stalker && G.stalker.state !== 'vent' ? 1 : 0);
    $('aware').classList.toggle('hunt', G.stalker && G.stalker.state === 'hunt');
  };
  UI.drawECG = function (dt) {
    const c = UI.ecg, P = G.player, w = 220, h = 54;
    const st = P.hp > 60 ? 'FINE' : P.hp > 25 ? 'CAUTION' : 'DANGER';
    const col = st === 'FINE' ? '#59ff9a' : st === 'CAUTION' ? '#ffcc33' : '#ff3a2a';
    const bpm = st === 'FINE' ? 70 : st === 'CAUTION' ? 95 : 130;
    UI.ecgT += dt;
    const period = 60 / bpm, ph = (UI.ecgT % period) / period;
    let y = 0; if (ph < .04) y = -.25; else if (ph < .08) y = 1; else if (ph < .11) y = -.5; else if (ph > .3 && ph < .4) y = .2 * Math.sin((ph - .3) / .1 * Math.PI);
    if (st === 'DANGER') y += (Math.random() - .5) * .15;
    UI.ecgPts.push(y); while (UI.ecgPts.length > 110) UI.ecgPts.shift();
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = 1; for (let x = 0; x < w; x += 11) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    c.strokeStyle = col; c.lineWidth = 2; c.shadowColor = col; c.shadowBlur = 6; c.beginPath();
    UI.ecgPts.forEach((v, i) => { const x = i * 2, yy = h / 2 - v * h * .38; i ? c.lineTo(x, yy) : c.moveTo(x, yy); }); c.stroke(); c.shadowBlur = 0;
    $('hpState').textContent = st; $('hpState').style.color = col;
  };

  // ------------------------------------------------------------------ inventory
  UI.renderInv = function () {
    const inv = G.inv, P = G.player, root = $('invBody');
    const items = Object.entries(inv.items).filter(([k, n]) => n > 0);
    const ammo = Object.entries(inv.ammo).filter(([k, n]) => n > 0);
    const keys = Object.keys(inv.keys).filter(k => inv.keys[k]).map(k => G.info.cards[k].name);
    root.innerHTML = `
      <section class="col"><h3>Status</h3>
        <div class="stat"><span>Condition</span><b style="color:${P.hp > 60 ? '#59ff9a' : P.hp > 25 ? '#ffcc33' : '#ff3a2a'}">${P.hp > 60 ? 'FINE' : P.hp > 25 ? 'CAUTION' : 'DANGER'}</b></div>
        <div class="stat"><span>Shoulder lamp</span><b>${Math.round(P.battery * 100)}%</b></div>
        <div class="stat"><span>Location</span><b>${G.curArea && G.curArea.isRoom ? (K.ROOMDEF[G.curArea.room.type] || {}).name : 'Corridor'}</b></div>
        <div class="stat"><span>Sector</span><b>${G.curArea ? G.L.sectorNames[G.curArea.sector % G.L.sectorNames.length] : ''}</b></div>
        <h3>Weapons</h3><div class="wlist">${inv.weapons.map((w, i) => `<button class="wbtn ${G.vm.cur === w ? 'on' : ''}" data-w="${w}"><kbd>${['jack', 'revolver', 'shotgun', 'flamer', 'pulse'].indexOf(w) + 1}</kbd>${K.WEAPONS[w].name}${K.WEAPONS[w].ammo ? `<small>${Math.ceil(inv.mag[w])} / ${inv.ammo[K.WEAPONS[w].ammo]}</small>` : ''}</button>`).join('')}</div>
        <h3>Key items</h3><ul class="keys">${inv.tracker ? '<li>Motion Tracker</li>' : ''}${keys.map(k => `<li>${k}</li>`).join('') || (!inv.tracker ? '<li class="dim">None</li>' : '')}</ul>
      </section>
      <section class="col"><h3>Supplies</h3>
        <div class="grid">${items.concat(ammo).map(([k, n]) => `<button class="cell" data-item="${k}" title="${K.ITEMS[k].desc}">${svg(k)}<span>${K.ITEMS[k].name}</span><b>${n}</b></button>`).join('') || '<p class="dim">Empty.</p>'}</div>
        <p class="desc" id="itemDesc">Select an item.</p>
        <h3>Workbench</h3>
        <div class="recipes">${K.RECIPES.map((r, i) => { const ok = Object.entries(r.need).every(([k, n]) => (inv.items[k] || 0) >= n); return `<div class="rec ${ok ? '' : 'no'}"><span>${svg(r.out)} ${r.n > 1 ? r.n + '× ' : ''}${K.ITEMS[r.out].name}</span><small>${Object.entries(r.need).map(([k, n]) => `${n} ${K.ITEMS[k].name}`).join(' + ')}</small><button data-rec="${i}" ${ok ? '' : 'disabled'}>Craft</button></div>`; }).join('')}</div>
      </section>
      <section class="col"><h3>Data logs (${inv.logs.length})</h3>
        <div class="logs">${inv.logs.map((l, i) => `<button data-log="${i}">${l[0]}</button>`).join('') || '<p class="dim">No logs recovered yet.</p>'}</div>
      </section>`;
    root.querySelectorAll('[data-item]').forEach(b => b.onclick = () => {
      const k = b.dataset.item; $('itemDesc').innerHTML = `<b>${K.ITEMS[k].name}</b> — ${K.ITEMS[k].desc}` + (k === 'medkit' || k === 'battery' ? ` <button id="useBtn">Use</button>` : K.ITEMS[k].cat === 'throw' ? ` <button id="selBtn">Ready for throwing</button>` : '');
      const u = $('useBtn'); if (u) u.onclick = () => { G.useItem(k); UI.renderInv(); };
      const s = $('selBtn'); if (s) s.onclick = () => { G.player.throwSel = k; UI.renderInv(); };
    });
    root.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => { if (G.craft(K.RECIPES[+b.dataset.rec])) UI.renderInv(); });
    root.querySelectorAll('[data-log]').forEach(b => b.onclick = () => UI.showLog(inv.logs[+b.dataset.log]));
    root.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { G.vm.select(b.dataset.w); UI.renderInv(); });
  };

  // ------------------------------------------------------------------ map
  UI.renderMap = function () {
    const L = G.L, cv = $('mapCanvas'), box = cv.parentElement.getBoundingClientRect();
    const scale = Math.max(2, Math.floor(Math.min((box.width - 10) / L.W, (box.height - 10) / L.H)));
    cv.width = L.W * scale; cv.height = L.H * scale;
    const x = cv.getContext('2d');
    x.fillStyle = '#060807'; x.fillRect(0, 0, cv.width, cv.height);
    const target = UI.objTarget();
    for (let j = 0; j < L.H; j++) for (let i = 0; i < L.W; i++) {
      const c = j * L.W + i, e = G.explored[c]; if (!L.kind[c] || !e) continue;
      const a = L.areas[L.area[c]];
      let col = L.kind[c] === 2 ? '#1d3a2a' : '#25503a';
      if (G.safeAreas.has(a.id)) col = '#2f7a4a'; if (a.room && a.room.nest) col = '#3a1d1d';
      if (target && a.id === target.id) col = '#7a5a1a';
      if (e === 2) col = L.kind[c] === 2 ? '#14261c' : '#1a3326';
      x.fillStyle = col; x.fillRect(i * scale, j * scale, scale, scale);
      x.fillStyle = '#7dffb0';
      if (L.eE[c] === 1 || L.eE[c] === 2) x.fillRect((i + 1) * scale - 1, j * scale, 1, scale);
      if (L.eS[c] === 1 || L.eS[c] === 2) x.fillRect(i * scale, (j + 1) * scale - 1, scale, 1);
      if (i > 0 && (L.eE[c - 1] === 1 || L.eE[c - 1] === 2) && !L.kind[c - 1]) x.fillRect(i * scale, j * scale, 1, scale);
      if (j > 0 && (L.eS[c - L.W] === 1 || L.eS[c - L.W] === 2) && !L.kind[c - L.W]) x.fillRect(i * scale, j * scale, scale, 1);
    }
    for (const d of L.doors) {
      if (!G.explored[d.c1] && !G.explored[d.c2]) continue;
      x.fillStyle = d.locked ? (d.req === 1 ? '#ffaa22' : d.req === 2 ? '#3a8bff' : d.req === 3 ? '#ff3a2a' : '#ff3a2a') : '#c8ffd8';
      if (d.ori === 'E') x.fillRect((d.i + 1) * scale - 2, d.j * scale + scale * .25, 3, scale * .5); else x.fillRect(d.i * scale + scale * .25, (d.j + 1) * scale - 2, scale * .5, 3);
    }
    x.font = `${Math.max(9, scale * 1.4)}px "Chakra Petch", sans-serif`; x.textAlign = 'center'; x.fillStyle = '#b8ffd0';
    for (const rm of L.rooms) { if (!G.explored[L.idx(Math.floor(rm.cx), Math.floor(rm.cy))]) continue; if (rm.w * scale < 30) continue; x.fillText(((K.ROOMDEF[rm.type] || {}).name || '').toUpperCase(), rm.cx * scale, rm.cy * scale + 4); }
    const P = G.player, px = P.x / K.S * scale, pz = P.z / K.S * scale;
    x.save(); x.translate(px, pz); x.rotate(-P.yaw); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(0, -scale * 1.6); x.lineTo(scale, scale); x.lineTo(-scale, scale); x.fill(); x.restore();
    if (target) { x.strokeStyle = '#ffcc33'; x.lineWidth = 2; x.setLineDash([4, 3]); x.strokeRect(target.x * scale, target.y * scale, target.w * scale, target.h * scale); x.setLineDash([]); }
    $('mapTitle').textContent = `${G.info.title} — DECK PLAN`;
    $('mapLegend').innerHTML = `<span class="lg you">You</span><span class="lg obj">Objective</span><span class="lg safe">Shelter (save)</span><span class="lg nest">Infestation</span><span class="lg d1">${G.info.keyNames[1]}</span><span class="lg d2">${G.info.keyNames[2]}</span><span class="lg d3">${G.info.keyNames[3]}</span>`;
  };

  // ------------------------------------------------------------------ title backdrop
  UI.menuBg = function () {
    const cv = $('menuBg'), x = cv.getContext('2d'); let t = 0;
    const draw = () => {
      if ($('menu').hidden) { requestAnimationFrame(draw); return; }
      cv.width = innerWidth / 2; cv.height = innerHeight / 2; t += .016;
      const w = cv.width, h = cv.height;
      x.fillStyle = '#030303'; x.fillRect(0, 0, w, h);
      // slow sweeping lamp over corridor ribs
      for (let i = 0; i < 14; i++) { const z = ((i + t * .3) % 14) / 14, s = 1 - z; x.strokeStyle = `rgba(255,179,71,${.05 * s * s})`; x.lineWidth = 2 * s; const ww = w * (.2 + s * .9), hh = h * (.2 + s * .9); x.strokeRect(w / 2 - ww / 2, h / 2 - hh / 2, ww, hh); }
      const g = x.createRadialGradient(w * (.5 + Math.sin(t * .4) * .2), h * .55, 0, w * .5, h * .55, w * .5); g.addColorStop(0, 'rgba(255,200,140,.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      const id = x.getImageData(0, 0, w, h), dd = id.data; for (let i = 0; i < dd.length; i += 16) { const n = Math.random() * 18; dd[i] += n; dd[i + 1] += n; dd[i + 2] += n; } x.putImageData(id, 0, 0);
      requestAnimationFrame(draw);
    };
    draw();
  };

  // ------------------------------------------------------------------ touch controls
  UI.setupTouch = function () {
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (!isTouch) return;
    G.touch = true; document.body.classList.add('touch');
    const stick = $('tStick'), knob = $('tKnob'); let sid = null, sx = 0, sy = 0, lid = null, lx = 0, ly = 0;
    const view = $('view');
    view.addEventListener('touchstart', e => { for (const t of e.changedTouches) { if (t.clientX < innerWidth * .4 && sid === null) { sid = t.identifier; sx = t.clientX; sy = t.clientY; stick.style.left = sx + 'px'; stick.style.top = sy + 'px'; stick.hidden = false; } else if (lid === null) { lid = t.identifier; lx = t.clientX; ly = t.clientY; } } e.preventDefault(); }, { passive: false });
    view.addEventListener('touchmove', e => { for (const t of e.changedTouches) { if (t.identifier === sid) { const dx = K.clamp((t.clientX - sx) / 50, -1, 1), dy = K.clamp((t.clientY - sy) / 50, -1, 1); G.touchMove = [dx, dy]; G.touchSprint = dy < -.95; knob.style.transform = `translate(${dx * 40}px,${dy * 40}px)`; } else if (t.identifier === lid) { G.mouse.dx += (t.clientX - lx) * 1.6; G.mouse.dy += (t.clientY - ly) * 1.6; lx = t.clientX; ly = t.clientY; } } e.preventDefault(); }, { passive: false });
    const end = e => { for (const t of e.changedTouches) { if (t.identifier === sid) { sid = null; G.touchMove = null; G.touchSprint = false; stick.hidden = true; knob.style.transform = ''; } if (t.identifier === lid) lid = null; } };
    view.addEventListener('touchend', end); view.addEventListener('touchcancel', end);
    const btn = (id, down, up) => { const b = $(id); b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); G.audio.init(); down(); b.classList.add('on'); }, { passive: false }); b.addEventListener('touchend', e => { e.preventDefault(); up && up(); b.classList.remove('on'); }, { passive: false }); };
    btn('tFire', () => { G.touchFire = true; G.touchFireP = true; }, () => G.touchFire = false);
    btn('tAim', () => G.touchAds = !G.touchAds);
    btn('tUse', () => G.interact());
    btn('tReload', () => G.vm.reload());
    btn('tCrouch', () => G.player.crouch = !G.player.crouch);
    btn('tLamp', () => G.player.flashOn = !G.player.flashOn);
    btn('tTrack', () => G.touchTracker = true, () => G.touchTracker = false);
    btn('tBreath', () => G.touchBreath = true, () => G.touchBreath = false);
    btn('tThrow', () => G.throwItem());
    btn('tWeap', () => G.cycleWeapon(1));
    btn('tInv', () => UI.openModal('inv'));
    btn('tMap', () => UI.openModal('map'));
    btn('tMenu', () => UI.pause(true));
  };
})();
