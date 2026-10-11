'use strict';
// UI: HUD, minimap and map, phone (contracts, Herald, contacts, custom jobs),
// safehouse (loadout, black market, workshop, masks, gear, skills, perks),
// heist planner, payday cards, wasted screen, title and pause.

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
H.ui = {
  menuOpen: false, safehouseOpen: false, toasts: [], waypoint: null,
  el: {},
  init() {
    for (const id of ['hud', 'toasts', 'banner', 'prompt', 'promptBar', 'objectives', 'hpRing', 'arRing', 'hpTxt', 'ammo', 'wname', 'gear', 'cross', 'hitm', 'detect', 'dmgdir', 'money', 'clock', 'wanted', 'danger', 'crew', 'vignette', 'menu', 'minimap', 'maskbar', 'carhud', 'center', 'floaters', 'downed']) this.el[id] = $(id);
    this.mm = $('minimap').getContext('2d');
    this.buildMapCanvas();
    addEventListener('keydown', e => {
      if (H.game.state !== 'city') return;
      if (e.code === 'Escape' && this.menuOpen) { this.close(); }
      else if (e.code === 'KeyP' && !this.menuOpen) { this.openPhone('contracts'); }
      else if (e.code === 'KeyM' && !this.menuOpen) { this.openPhone('map'); }
      else if (e.code === 'Tab' && !this.menuOpen) { this.openPhone('stats'); }
      else if (e.code === 'KeyN' && !this.menuOpen) { this.openPhone('news'); }
    });
    H.onUnlock = () => { if (H.game.state === 'city' && !this.menuOpen && !this.suppressPause) this.openPause(); this.suppressPause = false; };
  },
  /* ---------- feedback ---------- */
  toast(title, body) {
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<b>${esc(title)}</b>${body ? '<span>' + esc(body) + '</span>' : ''}`;
    this.el.toasts.prepend(t);
    setTimeout(() => t.classList.add('out'), 4200); setTimeout(() => t.remove(), 4800);
    while (this.el.toasts.children.length > 5) this.el.toasts.lastChild.remove();
  },
  banner(text) { this.el.banner.textContent = text; this.el.banner.hidden = !text; },
  hitmark(kill, head) { const h = this.el.hitm; h.className = 'hitm show' + (kill ? ' kill' : '') + (head ? ' head' : ''); clearTimeout(this._hm); this._hm = setTimeout(() => h.className = 'hitm', 120); },
  dodge() { this.floatText('DODGE', 'dodge'); },
  damageDir(from) {
    const P = H.P, a = Math.atan2(from.x - P.pos.x, from.z - P.pos.z) - Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw));
    const d = document.createElement('div'); d.className = 'ddir'; d.style.transform = `rotate(${-a}rad)`;
    this.el.dmgdir.appendChild(d); setTimeout(() => d.remove(), 900);
  },
  floatMoney(v, label) { this.floatText((label ? label + ' ' : '') + '+' + H.money(v), 'cash'); },
  floatText(t, cls) { const d = document.createElement('div'); d.className = 'floater ' + cls; d.textContent = t; this.el.floaters.appendChild(d); setTimeout(() => d.remove(), 1600); },

  /* ---------- HUD ---------- */
  updateHUD() {
    const P = H.P, run = H.run, s = H.save, E = this.el;
    E.hud.hidden = this.menuOpen;
    if (this.menuOpen) return;
    const W = P.weapons[P.cur];
    // health & armour rings (stroke-dasharray on 2πr = 176)
    E.hpRing.style.strokeDashoffset = 176 * (1 - Math.max(0, P.hp) / P.hpMax);
    E.arRing.style.strokeDashoffset = 201 * (1 - Math.max(0, P.armor) / Math.max(1, P.armorMax));
    E.hpTxt.textContent = Math.max(0, Math.ceil(P.hp));
    E.ammo.innerHTML = `<b>${W.mag}</b><span>/ ${W.reserve}</span>`;
    E.wname.textContent = W.st.w.name + (P.reloading ? ' — reloading' : '');
    E.gear.innerHTML = `<span title="Throwable">${esc(P.throwable.name)} ×${P.throws}</span><span title="Deployable">${esc(P.deploy.name)} ×${P.deployUses}</span>` + (run ? `<span>Ties ×${P.ties}</span><span>Body bags ×${P.bodyBags}</span>` : '') + (run && run.keycards ? `<span>Keycards ×${run.keycards}</span>` : '') + (run && !run.loud ? `<span>Pagers ${run.pagersUsed}/${P.pagers}</span>` : '') + (run && run.hostages ? `<span>Hostages ${run.hostages}</span>` : '');
    // crosshair spread
    const spr = H.lerp(W.st.spreadHip, W.st.spreadAds, P.ads) * (1 + P.bloom * 0.3);
    E.cross.style.setProperty('--gap', (6 + spr * 5) + 'px');
    E.cross.style.opacity = P.ads > 0.6 || P.inCar ? 0 : 1;
    // objectives
    if (run) E.objectives.innerHTML = '<h4>' + esc(run.def.name) + ' <small>' + H.DIFFS[run.diff].name + '</small></h4>' + H.objectiveLines().map(([t, done]) => `<div class="obj${done ? ' done' : ''}">${esc(t)}</div>`).join('');
    else if (H.heat.wanted) E.objectives.innerHTML = '<h4>Lose the police</h4><div class="obj">Shake them, take them all out, or lie low at the safehouse.</div>' + (H.heat.pendingTake ? `<div class="obj">Take at stake: ${H.money(H.heat.pendingTake.cash + H.heat.pendingTake.offshore)}</div>` : '') + `<div class="obj">Pursuers left: ${Math.max(0, H.heat.pursuitPool - H.heat.pursuitKills)}</div>`;
    else E.objectives.innerHTML = this.waypoint ? `<h4>Waypoint</h4><div class="obj">${esc(this.waypoint.label)} — ${Math.round(Math.hypot(this.waypoint.x - P.pos.x, this.waypoint.z - P.pos.z))} m</div>` : '<h4>' + H.CITY_NAME + '</h4><div class="obj">P — phone &amp; contracts · M — map · N — the Herald</div>';
    // interaction prompt
    const ia = H.game.curIa;
    if (ia && !P.inCar) {
      const lab = typeof ia.label === 'function' ? ia.label() : ia.label; const time = typeof ia.time === 'function' ? ia.time() : ia.time;
      const can = !ia.cond || ia.cond();
      E.prompt.hidden = false; E.prompt.firstChild.textContent = (can ? (time ? 'Hold F: ' : 'F: ') : '') + lab + (!can && !P.masked && H.run && !H.run.loud ? ' (mask up first)' : '');
      E.promptBar.style.width = (H.game.iaProg * 100) + '%';
    } else E.prompt.hidden = true;
    // detection arcs
    let det = '';
    if (run && run.detectors) for (const d of run.detectors) {
      if (d.v < 0.02) continue;
      const a = Math.atan2(d.pos.x - P.pos.x, d.pos.z - P.pos.z) - Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw));
      det += `<div class="darc ${d.v > 0.99 ? 'full' : ''}" style="transform:rotate(${-a}rad)"><i style="height:${d.v * 100}%"></i></div>`;
    }
    E.detect.innerHTML = det;
    E.money.innerHTML = `<b>${H.money(s.money)}</b><span>Offshore ${H.money(s.offshore)}</span>`;
    E.clock.textContent = 'Day ' + s.day + ' · ' + H.clockString();
    E.wanted.innerHTML = H.heat.wanted ? '<span class="on">' + '★'.repeat(H.heat.wanted) + '</span><span class="off">' + '★'.repeat(5 - H.heat.wanted) + '</span>' : '';
    E.wanted.classList.toggle('flash', H.heat.wanted > 0 && H.heat.unseenT > 2);
    const dz = H.heat.danger();
    E.danger.innerHTML = 'Danger <b>' + '▮'.repeat(dz) + '<i>' + '▮'.repeat(5 - dz) + '</i></b>';
    // crew
    if (run) E.crew.innerHTML = H.npcs.filter(n => n.kind === 'bot').map(n => `<div class="cm ${n.downed ? 'down' : ''} ${n.hidden ? 'wait' : ''}"><span>${esc(n.name)}</span><i style="width:${Math.max(0, n.hp / n.hpMax * 100)}%"></i></div>`).join('');
    else E.crew.innerHTML = '';
    E.maskbar.hidden = !(P.maskHold > 0); E.maskbar.firstChild.style.width = (P.maskHold / 0.8 * 100) + '%';
    E.vignette.style.opacity = Math.max(P.hurtT * 1.5, P.hp < P.hpMax * 0.3 ? 0.5 : 0, P.tased > 0 ? 0.6 : 0);
    E.vignette.classList.toggle('tase', P.tased > 0);
    E.downed.hidden = !(P.downed || P.custody > 0);
    if (P.downed) E.downed.innerHTML = `<b>DOWNED</b><span>Bleeding out: ${Math.ceil(P.bleed)}s — your crew is coming</span>`;
    if (P.custody > 0) E.downed.innerHTML = `<b>IN CUSTODY</b><span>Released in ${Math.ceil(P.custody)}s</span>`;
    // car HUD
    if (P.inCar) { E.carhud.hidden = false; E.carhud.innerHTML = `<b>${Math.round(Math.abs(P.inCar.speed) * 3.6)}</b><span>km/h</span><em>${esc(P.inCar.T.name)} · ${esc(H.RADIO[H.radioIdx])}</em><i style="width:${Math.max(0, P.inCar.hp / 9)}%"></i>`; } else E.carhud.hidden = true;
    E.hud.classList.toggle('masked', P.masked);
    this.drawMinimap();
  },
  /* ---------- maps ---------- */
  buildMapCanvas() {
    const C = H.city, S = C.SIZE + 160, k = 0.5;
    const c = document.createElement('canvas'); c.width = S * k; c.height = C.SIZE * k + 40;
    const g = c.getContext('2d');
    g.fillStyle = '#e6d3a3'; g.fillRect(C.SIZE * k, 0, 200, c.height);
    g.fillStyle = '#1a8ab0'; g.fillRect((C.SIZE + 110) * k, 0, 400, c.height);
    for (const b of C.blocks) {
      const L = b.L;
      g.fillStyle = { downtown: '#3a3f58', deco: '#5a3a5a', suburb: '#3e4a44', docks: '#4a4238', beach: '#5a5240' }[b.dist] || '#444';
      if (b.kind === 'park') g.fillStyle = '#3a6a3a';
      if (b.kind === 'heist') g.fillStyle = '#2a5a48';
      if (b.kind === 'safehouse') g.fillStyle = '#1a6a7a';
      g.fillRect(L.x0 * k, L.z0 * k, (L.x1 - L.x0) * k, (L.z1 - L.z0) * k);
    }
    this.mapC = c; this.mapK = k;
  },
  markers() {
    const out = [], run = H.run;
    if (!run) for (const h of H.HEISTS) { const p = H.sites[h.id].spec.points.plan; out.push({ x: p.x, z: p.z, c: '#40ff90', s: 'sq', t: h.name }); }
    const sp = H.city.safePos; out.push({ x: sp.x, z: sp.z, c: '#30e0ff', s: 'house', t: 'Safehouse' });
    for (const c of (H.contactSpots || [])) out.push({ x: c.x, z: c.z, c: '#' + c.c.color.toString(16).padStart(6, '0'), s: 'dot', t: c.c.name });
    if (run) { out.push({ x: run.secure.x, z: run.secure.z, c: '#40ff90', s: 'sq', t: 'Van' }); for (const n of H.npcs) if (!n.dead && n.run && (n.kind === 'guard' || n.team === 'law') && (n.marked || run.assets.blueprint || n.pos.distanceTo(H.P.pos) < 30)) out.push({ x: n.pos.x, z: n.pos.z, c: '#ff4040', s: 'dot' }); if (run.assets.blueprint) for (const c of run.cams) if (!c.dead && !c.off) out.push({ x: c.x, z: c.z, c: '#ffd040', s: 'dot' }); }
    for (const n of H.npcs) if (!n.dead && n.team === 'law' && !n.run && n.pos.distanceTo(H.P.pos) < 120) out.push({ x: n.pos.x, z: n.pos.z, c: Math.floor(H.t * 4) % 2 ? '#ff3040' : '#3060ff', s: 'dot' });
    for (const c of H.cars) if (c.police && !c.dead && c.pos.distanceTo(H.P.pos) < 200) out.push({ x: c.pos.x, z: c.pos.z, c: Math.floor(H.t * 4) % 2 ? '#ff3040' : '#3060ff', s: 'car' });
    if (this.waypoint) out.push({ x: this.waypoint.x, z: this.waypoint.z, c: '#ffd040', s: 'way', t: this.waypoint.label });
    return out;
  },
  drawMinimap() {
    const g = this.mm, W = 190, P = H.P, k = this.mapK * 1.6;
    const px = P.inCar ? P.inCar.pos.x : P.pos.x, pz = P.inCar ? P.inCar.pos.z : P.pos.z;
    const yaw = P.inCar ? (H.game.camYaw || 0) : P.yaw;
    g.save(); g.clearRect(0, 0, W, W);
    g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 2, 0, 7); g.clip();
    g.fillStyle = '#2a2c34'; g.fillRect(0, 0, W, W);
    g.translate(W / 2, W / 2); g.rotate(yaw); g.scale(1.6, 1.6);
    g.drawImage(this.mapC, -px * this.mapK, -pz * this.mapK);
    if (H.heat.wanted && H.heat.lastSeen) { g.strokeStyle = 'rgba(255,60,80,.6)'; g.lineWidth = 2; g.beginPath(); g.arc((H.heat.lastSeen.x - px) * this.mapK, (H.heat.lastSeen.z - pz) * this.mapK, H.heat.searchR * this.mapK, 0, 7); g.stroke(); }
    for (const m of this.markers()) {
      let x = (m.x - px) * this.mapK, z = (m.z - pz) * this.mapK;
      const d = Math.hypot(x, z), R = (W / 2 - 8) / 1.6;
      if (d > R) { if (m.s !== 'way' && m.s !== 'house') continue; x *= R / d; z *= R / d; }
      g.fillStyle = m.c;
      g.save(); g.translate(x, z); g.rotate(-yaw);
      if (m.s === 'sq') g.fillRect(-3, -3, 6, 6);
      else if (m.s === 'house') { g.beginPath(); g.moveTo(0, -5); g.lineTo(5, 0); g.lineTo(3, 0); g.lineTo(3, 4); g.lineTo(-3, 4); g.lineTo(-3, 0); g.lineTo(-5, 0); g.fill(); }
      else if (m.s === 'way') { g.beginPath(); g.moveTo(0, 4); g.lineTo(-4, -4); g.lineTo(4, -4); g.fill(); }
      else if (m.s === 'car') g.fillRect(-2, -3.5, 4, 7);
      else { g.beginPath(); g.arc(0, 0, 2.2, 0, 7); g.fill(); }
      g.restore();
    }
    g.restore();
    // player arrow
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(W / 2, W / 2 - 7); g.lineTo(W / 2 + 5, W / 2 + 6); g.lineTo(W / 2, W / 2 + 3); g.lineTo(W / 2 - 5, W / 2 + 6); g.fill();
    g.strokeStyle = H.heat.wanted ? (Math.floor(H.t * 3) % 2 ? '#ff3060' : '#3060ff') : 'rgba(255,90,180,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 2, 0, 7); g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 11px "Barlow Condensed", sans-serif'; g.textAlign = 'center';
    g.fillText('N', W / 2 + Math.sin(yaw) * (W / 2 - 10), W / 2 - Math.cos(yaw) * (W / 2 - 10) + 4);
  },
  drawFullMap(canvas) {
    const g = canvas.getContext('2d'), mc = this.mapC, sc = Math.min(canvas.width / mc.width, canvas.height / mc.height);
    g.fillStyle = '#14121c'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.save(); g.scale(sc, sc); g.drawImage(mc, 0, 0);
    const k = this.mapK;
    g.font = 'bold 13px "Barlow Condensed", sans-serif';
    const placed = [];
    for (const m of this.markers()) {
      g.fillStyle = m.c; const x = m.x * k, z = m.z * k;
      if (m.s === 'sq') g.fillRect(x - 5, z - 5, 10, 10); else { g.beginPath(); g.arc(x, z, 5, 0, 7); g.fill(); }
      if (m.t) { const w = g.measureText(m.t).width, r = [x + 8, z - 9, w, 14]; if (!placed.some(q => r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3])) { placed.push(r); g.fillStyle = 'rgba(10,6,20,.6)'; g.fillRect(r[0] - 2, r[1], w + 4, 14); g.fillStyle = 'rgba(255,255,255,.95)'; g.fillText(m.t, x + 8, z + 3); } }
    }
    const P = H.P, p = P.inCar ? P.inCar.pos : P.pos;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x * k, p.z * k, 7, 0, 7); g.fill(); g.fillStyle = '#ff3aa0'; g.beginPath(); g.arc(p.x * k, p.z * k, 4, 0, 7); g.fill();
    g.restore();
    canvas.onclick = e => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (canvas.width / r.width) / sc / k, z = (e.clientY - r.top) * (canvas.height / r.height) / sc / k; this.waypoint = { x, z, label: 'Marked spot' }; this.drawFullMap(canvas); H.audio.ui(); };
  },

  /* ---------- menu shell ---------- */
  open(html, cls = '') {
    this.menuOpen = true; this.suppressPause = true;
    if (document.pointerLockElement) document.exitPointerLock();
    const m = this.el.menu; m.className = 'menu ' + cls; m.innerHTML = html; m.hidden = false;
    m.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => { H.audio.ui(); this.act(b.dataset.act, b.dataset, e); }));
    H.audio.engine(false);
  },
  close() {
    this.menuOpen = false; this.safehouseOpen = false; this.el.menu.hidden = true; this.el.menu.innerHTML = '';
    if (this.preview) { this.preview.dispose(); this.preview = null; }
    H.equipLoadoutSoft && H.equipLoadoutSoft();
    H.lock();
  },
  tabs(list, cur, prefix) { return '<nav class="tabs">' + list.map(([id, name]) => `<button class="${id === cur ? 'on' : ''}" data-act="${prefix}" data-tab="${id}">${name}</button>`).join('') + '</nav>'; },
  act(a, d, e) {
    const fn = this.actions[a]; if (fn) fn.call(this, d, e);
  },

  /* ---------- title ---------- */
  openTitle() {
    const has = (() => { try { return !!localStorage.getItem('heist_save'); } catch (e) { return false; } })();
    this.open(`<div class="title-screen">
      <div class="logo"><span>Palmetto</span><b>HEAT</b></div>
      <p class="tag">Plan the job. Wear the mask. Shake the heat.</p>
      <div class="col btns">
        <button class="big" data-act="start">${has ? 'Continue' : 'Start'}</button>
        ${has ? '<button data-act="newgame">New game</button>' : ''}
        <button data-act="settings">Settings</button>
      </div>
      ${this.controlsHTML()}
      <p class="fine">Keyboard and mouse required. Click the game to capture the mouse; Esc releases it.</p>
    </div>`, 'title');
    this.menuOpen = true;
  },
  controlsHTML() {
    return `<div class="controls"><h3>Controls</h3><dl>
      <dt>WASD / Shift / Space / C</dt><dd>Move, sprint, jump, crouch</dd>
      <dt>Mouse / RMB / R</dt><dd>Shoot, aim down sights, reload</dd>
      <dt>1 / 2 / Q / wheel</dt><dd>Primary, secondary, swap</dd>
      <dt>X (hold)</dt><dd>Put on your mask</dd>
      <dt>F (tap / hold)</dt><dd>Shout at civilians · interact · enter cars</dd>
      <dt>G</dt><dd>Throw bag or throwable</dd>
      <dt>V / E / T</dt><dd>Melee · place deployable · mark enemy</dd>
      <dt>P / M / N / Tab</dt><dd>Phone · map · newspaper · stats</dd>
      <dt>In a car</dt><dd>WASD drive, Space handbrake, R radio, mouse shoots secondary</dd>
    </dl></div>`;
  },
  openPause() {
    this.open(`<div class="panel pause"><h2>Paused</h2><div class="col btns"><button class="big" data-act="close">Resume</button><button data-act="phone" data-tab="contracts">Phone</button><button data-act="settings">Settings</button><button data-act="save">Save game</button></div>${this.controlsHTML()}</div>`);
  },
  openSettings() {
    const s = H.settings;
    this.open(`<div class="panel"><h2>Settings</h2>
      <label class="set">Mouse sensitivity <input id="setSens" type="range" min="0.2" max="3" step="0.05" value="${s.sens}"></label>
      <label class="set">Field of view <input id="setFov" type="range" min="60" max="100" step="1" value="${s.fov}"></label>
      <label class="set">Volume <input id="setVol" type="range" min="0" max="1" step="0.05" value="${s.volume}"></label>
      <label class="set">Music <input id="setMus" type="range" min="0" max="1" step="0.05" value="${s.music}"></label>
      <label class="set">Graphics <select id="setQ"><option value="high" ${s.quality === 'high' ? 'selected' : ''}>High (shadows)</option><option value="low" ${s.quality === 'low' ? 'selected' : ''}>Performance</option></select></label>
      <div class="row"><button class="big" data-act="saveSettings">Done</button></div></div>`);
  },

  /* ---------- phone ---------- */
  openPhone(tab = 'contracts') {
    const s = H.save, fx = H.newsFx();
    let body = '';
    if (tab === 'contracts') {
      const P = H.P;
      body = '<div class="list">' + H.HEISTS.map(h => {
        const p = H.sites[h.id].spec.points.plan, d = Math.round(Math.hypot(p.x - P.pos.x, p.z - P.pos.z));
        const bonus = fx.pay[h.id] ? `<em class="hot">+${Math.round((fx.pay[h.id] - 1) * 100)}% today</em>` : '';
        const g = fx.guards[h.id] ? `<em class="${fx.guards[h.id].guardsMul ? 'hot' : 'warn'}">${fx.guards[h.id].guardsMul ? 'Fewer guards' : 'Extra guards'}</em>` : '';
        const done = s.completed[h.id] !== undefined ? `<em>Best: ${H.DIFFS[s.completed[h.id]].name}</em>` : '';
        return `<div class="item"><div><b>${esc(h.name)}</b> <small>${esc(h.by)} · ${H.TEMPLATES[h.tpl].name} · ${d} m</small><p>${esc(h.desc)}</p><div class="tags">${h.stealth ? '<em>Stealth</em>' : ''}${h.loud ? '<em>Loud</em>' : ''}${bonus}${g}${done}</div></div><div class="col"><b class="pay">${H.money(h.pay)}+</b><button data-act="waypoint" data-id="${h.id}">Set waypoint</button><button data-act="taxi" data-id="${h.id}">Taxi · $250</button></div></div>`;
      }).join('') + '</div>';
    } else if (tab === 'news') body = this.newsHTML();
    else if (tab === 'contacts') body = '<div class="list">' + H.CONTACTS.map(c => `<div class="item"><div><b>${esc(c.name)}</b> <small>${esc(c.place)}</small><p>${esc(c.desc)}</p></div><div class="col">${['cop', 'informant'].includes(c.id) ? `<button data-act="contact" data-id="${c.id}">Call</button>` : ''}<button data-act="waypointContact" data-id="${c.id}">Set waypoint</button></div></div>`).join('') + '</div>';
    else if (tab === 'custom') body = this.customHTML();
    else if (tab === 'map') body = '<canvas id="fullmap" width="1100" height="840"></canvas><p class="fine">Click to set a waypoint. Green: jobs · cyan: safehouse · dots: contacts · flashing: police.</p>';
    else if (tab === 'stats') body = this.statsHTML();
    this.open(`<div class="phone"><header><b>BlackLine</b><span>${esc(H.CITY_NAME)} · Day ${s.day} · ${H.clockString()}</span><button class="x" data-act="close">✕</button></header>${this.tabs([['contracts', 'Contracts'], ['custom', 'Custom job'], ['news', 'The Herald'], ['contacts', 'Contacts'], ['map', 'Map'], ['stats', 'Career']], tab, 'phone')}<section>${body}</section></div>`, 'wide');
    if (tab === 'map') this.drawFullMap($('fullmap'));
  },
  newsHTML() {
    const n = H.save.news;
    return `<article class="paper"><header><h1>The ${esc(H.CITY_NAME)} Herald</h1><div class="mast"><span>Day ${n.day}</span><span>${esc(n.weather)}</span><span>${n.price}</span></div></header>
      <div class="cols">${n.items.map((it, i) => `<div class="story ${it.kind} ${i === 0 ? 'lead' : ''}"><h3>${esc(it.head)}</h3>${it.body ? '<p>' + esc(it.body) + '</p>' : ''}</div>`).join('')}</div></article>`;
  },
  statsHTML() {
    const s = H.save, st = s.stats;
    const rows = [['Level', s.level + (s.infamy ? ' · Infamy ' + s.infamy : '')], ['XP', s.xp + ' / ' + H.LEVEL_XP(s.level)], ['Danger level', H.heat.danger() + ' / 5'], ['Street rep', s.rep], ['Heists completed', st.heists + ` (${st.stealth} stealth, ${st.loud} loud)`], ['Total earned', H.money(st.earned)], ['Bags secured', st.bags], ['Kills', st.kills], ['Civilian casualties', st.civKills], ['Pursuits', st.chases + ' (' + st.busted + ' busted)'], ['Failed heists', st.fails], ['Detection risk', H.P.detect]];
    return `<div class="grid2"><div><h3>Career</h3><table class="kv">${rows.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table>
      ${s.level >= 100 ? '<button class="big" data-act="infamy">Go Infamous ($2,000,000 offshore)</button>' : ''}</div>
      <div><h3>Achievements ${s.achievements.length}/${H.ACHIEVEMENTS.length}</h3><div class="ach">${H.ACHIEVEMENTS.map(([id, n, d]) => `<div class="${s.achievements.includes(id) ? 'got' : ''}"><b>${n}</b><span>${d}</span></div>`).join('')}</div></div></div>`;
  },
  customHTML() {
    const c = this.custom || (this.custom = { site: H.HEISTS[0].id, loot: 'money', n: 4, diff: 0, guards: 0, cams: true });
    const site = H.sites[c.site], tpl = H.TEMPLATES[site.tpl];
    const pay = Math.round((15000 + c.n * 8000 + c.guards * 4000) * (site.tpl === 'reserve' ? 1.6 : 1));
    return `<div class="grid2"><div><h3>Build your own heist</h3>
      <label class="set">Target <select id="cSite">${H.HEISTS.map(h => `<option value="${h.id}" ${h.id === c.site ? 'selected' : ''}>${esc(H.TEMPLATES[h.tpl].name)} — ${esc(h.name)}</option>`).join('')}</select></label>
      <label class="set">Loot <select id="cLoot">${Object.keys(H.LOOT).filter(k => k !== 'body').map(k => `<option value="${k}" ${k === c.loot ? 'selected' : ''}>${H.LOOT[k].name} (${H.money(H.LOOT[k].value)}/bag)</option>`).join('')}</select></label>
      <label class="set">Bags <input id="cN" type="range" min="1" max="12" value="${c.n}"><b>${c.n}</b></label>
      <label class="set">Extra guards <input id="cG" type="range" min="0" max="6" value="${c.guards}"><b>${c.guards}</b></label>
      <label class="set"><input id="cCams" type="checkbox" ${c.cams ? 'checked' : ''}> Cameras active</label>
      <div class="row"><button data-act="customUpdate">Update</button><button class="big" data-act="customPost">Post job · go to ${esc(tpl.name)}</button></div></div>
      <div><h3>Briefing</h3><p>You pick the target, the score and the risk. The job is posted to the planning spot at the ${esc(tpl.name.toLowerCase())}; head there and plan it like any other contract.</p>
      <table class="kv"><tr><th>Location</th><td>${esc(H.HEISTS.find(h => h.id === c.site).name)}</td></tr><tr><th>Contract pay</th><td>${H.money(pay)}</td></tr><tr><th>Loot</th><td>${c.n} × ${H.LOOT[c.loot].name}</td></tr><tr><th>Approach</th><td>Stealth or loud</td></tr></table></div></div>`;
  },

  /* ---------- planner ---------- */
  openPlanner(h, sel) {
    const s = H.save, fx = H.newsFx();
    const custom = H.customJob && (H.customJob.siteId === h.id) ? H.customJob : null;
    const def = sel === 'custom' && custom ? custom : h;
    const st = this.plan || (this.plan = { diff: 0, crew: 3, assets: {} });
    const maxDiff = Math.min(6, Math.floor(s.level / 8));
    st.diff = Math.min(st.diff, maxDiff);
    const D = H.DIFFS[st.diff];
    const est = Math.round((def.pay + Object.entries(def.loot).reduce((a, [k, n]) => a + H.LOOT[k].value * n, 0) * 0.6) * D.payMul * (fx.pay[def.id] || 1));
    const assetCost = H.ASSETS.filter(a => st.assets[a.id]).reduce((a, b) => a + b.cost, 0);
    this.open(`<div class="planner"><header><small>${esc(def.by)} presents</small><h2>${esc(def.name)}</h2><p>${esc(def.desc || '')}</p></header>
      ${custom ? this.tabs([['main', 'Contract'], ['custom', 'Your custom job']], sel === 'custom' ? 'custom' : 'main', 'planSel') : ''}
      <div class="grid3"><div><h3>Difficulty</h3><div class="diffs">${H.DIFFS.map((d, i) => `<button class="${i === st.diff ? 'on' : ''}" ${i > maxDiff ? 'disabled' : ''} data-act="planDiff" data-i="${i}">${d.name}${i > maxDiff ? ' <small>Lv ' + i * 8 + '</small>' : ''}</button>`).join('')}</div>
        <h3>Crew</h3><div class="diffs">${[0, 1, 2, 3].map(n => `<button class="${n === st.crew ? 'on' : ''}" data-act="planCrew" data-n="${n}">${n ? n + ' bot' + (n > 1 ? 's' : '') : 'Solo'}</button>`).join('')}</div>
        <p class="fine">Bots wait at the van while you're in stealth and join the fight when the alarm goes off.</p></div>
      <div><h3>Assets</h3>${H.ASSETS.map(a => `<label class="asset"><input type="checkbox" data-asset="${a.id}" ${st.assets[a.id] ? 'checked' : ''}> <b>${a.name}</b> <span>${H.money(a.cost)}</span><small>${a.desc}</small></label>`).join('')}</div>
      <div><h3>Briefing</h3><table class="kv"><tr><th>Approach</th><td>${def.stealth && def.loud ? 'Stealth or loud' : def.stealth ? 'Stealth only' : 'Loud only'}</td></tr>
        <tr><th>Loot</th><td>${Object.entries(def.loot).filter(([, n]) => n).map(([k, n]) => n + ' × ' + H.LOOT[k].name).join(', ') || (def.destroy ? 'Property damage' : def.cook ? 'Meth, as much as you can cook' : '—')}</td></tr>
        <tr><th>Estimated take</th><td><b>${H.money(est)}</b></td></tr><tr><th>Assets</th><td>${H.money(assetCost)}</td></tr><tr><th>Your cash</th><td>${H.money(s.money)}</td></tr>
        <tr><th>Detection risk</th><td>${H.P.detect}</td></tr><tr><th>After the job</th><td>The police will chase you. Danger level ${H.heat.danger()}.</td></tr></table>
        ${H.heat.wanted ? '<p class="warn">Lose the police before starting a job.</p>' : ''}
        <div class="row"><button data-act="close">Not now</button><button class="big" data-act="planStart" data-sel="${sel || 'main'}" data-id="${h.id}" ${H.heat.wanted || assetCost > s.money ? 'disabled' : ''}>Start the heist</button></div></div></div></div>`, 'wide');
    this.el.menu.querySelectorAll('[data-asset]').forEach(cb => cb.addEventListener('change', () => { st.assets[cb.dataset.asset] = cb.checked; this.openPlanner(h, sel); }));
    this.planHeist = h;
  },

  /* ---------- safehouse ---------- */
  openSafehouse(tab = 'loadout', arg) {
    this.safehouseOpen = true;
    const s = H.save;
    const P = H.P;
    if (H.heat.wanted) H.heat.hideT += 0.01;
    let body = '';
    if (tab === 'loadout') body = this.loadoutHTML();
    if (tab === 'market') body = this.marketHTML(arg);
    if (tab === 'workshop') body = this.workshopHTML(arg);
    if (tab === 'masks') body = this.masksHTML(arg);
    if (tab === 'gear') body = this.gearHTML();
    if (tab === 'skills') body = this.skillsHTML(arg || 'planner');
    if (tab === 'perks') body = this.perksHTML();
    if (tab === 'rest') body = this.restHTML();
    this.open(`<div class="safehouse"><header><div><small>Safehouse</small><h2>${esc(s.crewName)}</h2></div><div class="cash"><b>${H.money(s.money)}</b><span>Offshore ${H.money(s.offshore)} · Level ${s.level}${s.infamy ? ' · Infamy ' + s.infamy : ''}</span></div><button class="x" data-act="close">✕</button></header>
      ${this.tabs([['loadout', 'Loadout'], ['market', 'Black market'], ['workshop', 'Workshop'], ['masks', 'Masks'], ['gear', 'Gear & armour'], ['skills', 'Skills'], ['perks', 'Perk decks'], ['rest', 'Rest & restock']], tab, 'safe')}
      <section>${body}</section></div>`, 'wide');
    this.safeTab = tab; this.safeArg = arg;
    if (tab === 'workshop') this.renderPreview('gun', arg);
    if (tab === 'masks') this.renderPreview('mask', arg);
  },
  loadoutHTML() {
    const s = H.save, lo = s.loadout;
    const wsel = slot => s.weapons.filter(w => H.WMAP[w.id].slot === slot).map(w => `<button class="card ${lo[slot] === w.uid ? 'on' : ''}" data-act="equipW" data-slot="${slot}" data-uid="${w.uid}"><b>${esc(H.WMAP[w.id].name)}</b><small>${H.CAT_NAMES[H.WMAP[w.id].cat]}</small></button>`).join('');
    const st = i => { const x = H.weaponStats(i); return `Damage ${Math.round(x.dmg)} · Mag ${x.mag} · Acc ${Math.round(x.acc)} · Stab ${Math.round(x.stab)} · Conceal ${x.conceal}`; };
    const pw = s.weapons.find(w => w.uid === lo.primary), sw = s.weapons.find(w => w.uid === lo.secondary);
    return `<div class="grid2"><div><h3>Primary — ${esc(H.WMAP[pw.id].name)}</h3><p class="fine">${st(pw)}</p><div class="cards">${wsel('primary')}</div>
      <h3>Secondary — ${esc(H.WMAP[sw.id].name)}</h3><p class="fine">${st(sw)}</p><div class="cards">${wsel('secondary')}</div></div>
      <div><h3>Mask</h3><div class="cards">${s.masks.map((m, i) => `<button class="card ${lo.mask === i ? 'on' : ''}" data-act="equipMask" data-i="${i}"><b>${esc(H.MASK_NAMES[m.shape])}</b><small>${H.MASK_MATERIALS[m.mat][0]} · ${H.MASK_COLORS[m.col][0]}</small></button>`).join('')}</div>
      <h3>Summary</h3><table class="kv"><tr><th>Armour</th><td>${esc((H.ARMORS.find(a => a.id === lo.armor) || {}).name)}</td></tr><tr><th>Melee</th><td>${esc((H.MELEE.find(m => m.id === lo.melee) || {}).name)}</td></tr><tr><th>Throwable</th><td>${esc((H.THROWABLES.find(t => t.id === lo.throwable) || {}).name)}</td></tr><tr><th>Deployable</th><td>${esc((H.DEPLOYABLES.find(t => t.id === lo.deployable) || {}).name)}</td></tr><tr><th>Detection risk</th><td>${H.conceal()}</td></tr><tr><th>Perk deck</th><td>${esc(H.PERK_DECKS.find(d => d.id === s.perk.deck).name)}</td></tr></table>
      <label class="set">Crew name <input id="crewName" value="${esc(s.crewName)}" maxlength="28"></label><button data-act="crewName">Rename crew</button></div></div>`;
  },
  marketHTML(cat = 'ar') {
    const s = H.save;
    const cats = Object.keys(H.CAT_NAMES);
    const list = H.WEAPONS.filter(w => w.cat === cat);
    return this.tabs(cats.map(c => [c, H.CAT_NAMES[c]]), cat, 'marketCat') + '<div class="list tight">' + list.map(w => {
      const owned = s.weapons.filter(x => x.id === w.id).length, locked = s.level < w.level;
      return `<div class="item"><div><b>${esc(w.name)}</b> <small>${w.slot} · ${w.fire === 'a' ? 'Auto' : w.fire === 'p' ? 'Pump' : w.fire === 'k' ? 'Bolt' : w.fire === 'b' ? 'Burst' : 'Semi'}</small>
        <div class="bars">${bar('Damage', Math.min(100, w.dmg / (w.cat === 'sniper' ? 30 : 3)))}${bar('Accuracy', w.acc)}${bar('Stability', w.stab)}${bar('Concealment', w.conceal / 30 * 100)}${bar('Rate', Math.min(100, w.rpm / 12))}</div>
        <small>Mag ${w.mag} · Total ${w.total} · Reload ${w.reload}s</small></div>
        <div class="col"><b class="pay">${H.money(w.price)}</b>${locked ? `<small>Level ${w.level}</small>` : `<button data-act="buyW" data-id="${w.id}" data-cat="${cat}" ${s.money < w.price ? 'disabled' : ''}>Buy${owned ? ' another' : ''}</button>`}${owned ? `<small>Owned ×${owned}</small>` : ''}</div></div>`;
    }).join('') + '</div>';
  },
  workshopHTML(uid) {
    const s = H.save; uid = +(uid || s.loadout.primary);
    const inst = s.weapons.find(w => w.uid === uid) || s.weapons[0]; const w = H.WMAP[inst.id];
    const st = H.weaponStats(inst);
    const slots = H.MOD_SLOTS.filter(sl => H.modsFor(w, sl).length > 1);
    const sel = this.wsSlot && slots.includes(this.wsSlot) ? this.wsSlot : slots[0];
    return `<div class="workshop"><div class="wlist"><h3>Your guns</h3>${s.weapons.map(x => `<button class="card ${x.uid === inst.uid ? 'on' : ''}" data-act="safe" data-tab="workshop" data-arg="${x.uid}"><b>${esc(H.WMAP[x.id].name)}</b></button>`).join('')}</div>
      <div class="wmain"><canvas id="preview" width="720" height="360"></canvas>
        <div class="bars wide">${bar('Damage', Math.min(100, st.dmg / (w.cat === 'sniper' ? 30 : 3)), Math.round(st.dmg))}${bar('Accuracy', st.acc, Math.round(st.acc))}${bar('Stability', st.stab, Math.round(st.stab))}${bar('Concealment', st.conceal / 30 * 100, st.conceal)}${bar('Magazine', Math.min(100, st.mag), st.mag)}${bar('Total ammo', Math.min(100, st.total / 6), st.total)}</div>
        <div class="tabs small">${slots.map(sl => `<button class="${sl === sel ? 'on' : ''}" data-act="wsSlot" data-slot="${sl}" data-uid="${inst.uid}">${H.MOD_SLOT_NAMES[sl]}</button>`).join('')}<button class="${sel === 'paint' ? 'on' : ''}" data-act="wsSlot" data-slot="paint" data-uid="${inst.uid}">Paint</button></div>
        <div class="mods">${sel === 'paint' || this.wsSlot === 'paint' ? H.WEAPON_PAINTS.map((p, i) => `<button class="card ${inst.paint === i ? 'on' : ''}" data-act="paint" data-i="${i}" data-uid="${inst.uid}"><i class="sw" style="background:#${p[1].toString(16).padStart(6, '0')}"></i><b>${p[0]}</b><small>${i ? H.money(2000 + i * 400) : 'Free'}</small></button>`).join('') :
          H.modsFor(w, sel).map(m => { const on = (inst.mods[sel] || H.modsFor(w, sel)[0].id) === m.id, own = !m.price || s.unlockedMods.includes(m.id); return `<button class="card ${on ? 'on' : ''}" data-act="mod" data-mod="${m.id}" data-slot="${sel}" data-uid="${inst.uid}"><b>${esc(m.name)}</b><small>${Object.entries(m.st).map(([k, v]) => (v > 0 ? '+' : '') + (Math.abs(v) < 1 && v !== 0 && k !== 'silent' && k !== 'pierce' ? Math.round(v * 100) + '%' : v) + ' ' + k).join(', ') || 'Stock'}</small><em>${own ? (on ? 'Equipped' : 'Owned') : H.money(m.price)}</em></button>`; }).join('')}</div>
        <div class="row"><button data-act="sellW" data-uid="${inst.uid}" ${s.weapons.length <= 2 ? 'disabled' : ''}>Sell for ${H.money(Math.round(w.price * 0.4))}</button></div></div></div>`;
  },
  masksHTML(i) {
    const s = H.save; i = +(i ?? s.loadout.mask); const m = s.masks[i] || s.masks[0]; const mp = s.maskParts;
    const part = this.maskPart || 'shapes';
    const costs = { shapes: 6000, mats: 4000, pats: 3000, cols: 2000 };
    const items = part === 'shapes' ? H.MASK_SHAPES.map(x => [x, H.MASK_NAMES[x]]) : part === 'mats' ? H.MASK_MATERIALS.map((x, k) => [k, x[0]]) : part === 'pats' ? H.MASK_PATTERNS.map((x, k) => [k, x]) : H.MASK_COLORS.map((x, k) => [k, x[0]]);
    const key = { shapes: 'shape', mats: 'mat', pats: 'pat', cols: 'col' }[part];
    return `<div class="workshop"><div class="wlist"><h3>Your masks</h3>${s.masks.map((x, k) => `<button class="card ${k === i ? 'on' : ''}" data-act="safe" data-tab="masks" data-arg="${k}"><b>${esc(H.MASK_NAMES[x.shape])}</b></button>`).join('')}<button data-act="newMask" ${s.money < 8000 ? 'disabled' : ''}>New mask slot · $8,000</button></div>
      <div class="wmain"><canvas id="preview" width="720" height="360"></canvas>
      ${this.tabs([['shapes', 'Shape'], ['mats', 'Material'], ['pats', 'Pattern'], ['cols', 'Colours']], part, 'maskPart')}
      <div class="mods">${items.map(([v, name]) => { const own = mp[part].includes(v); return `<button class="card ${m[key] === v ? 'on' : ''}" data-act="maskSet" data-key="${key}" data-part="${part}" data-v="${v}" data-i="${i}">${part === 'cols' ? `<i class="sw" style="background:linear-gradient(90deg,#${H.MASK_COLORS[v][1].toString(16).padStart(6, '0')} 50%,#${H.MASK_COLORS[v][2].toString(16).padStart(6, '0')} 50%)"></i>` : ''}<b>${esc(name)}</b><em>${own ? 'Owned' : H.money(costs[part])}</em></button>`; }).join('')}</div></div></div>`;
  },
  gearHTML() {
    const s = H.save, lo = s.loadout, o = s.owned;
    const sec = (title, list, ownKey, loKey, priceFn, info) => `<h3>${title}</h3><div class="cards">${list.map(x => { const own = o[ownKey].includes(x.id), price = priceFn(x), lock = x.level && s.level < x.level; return `<button class="card ${lo[loKey] === x.id ? 'on' : ''}" data-act="gear" data-kind="${ownKey}" data-lo="${loKey}" data-id="${x.id}" data-price="${price}" ${lock ? 'disabled' : ''}><b>${esc(x.name)}</b><small>${info(x)}</small><em>${lock ? 'Level ' + x.level : own ? (lo[loKey] === x.id ? 'Equipped' : 'Owned') : H.money(price)}</em></button>`; }).join('')}</div>`;
    return `<div class="grid2"><div>${sec('Armour', H.ARMORS.filter(a => a.id !== 'ictv' || H.mod('ictv') || o.armors.includes('ictv')), 'armors', 'armor', a => a.level * 4000 + 4000, a => `Armour ${a.armor} · Speed ${Math.round(a.speed * 100)}% · Conceal ${a.conceal}`)}
      ${sec('Deployables', H.DEPLOYABLES, 'deployables', 'deployable', () => 12000, d => d.desc)}</div>
      <div>${sec('Throwables', H.THROWABLES, 'throwables', 'throwable', () => 8000, t => '×' + t.count)}
      ${sec('Melee', H.MELEE, 'melee', 'melee', m => m.price, m => 'Damage ' + m.dmg)}</div></div>`;
  },
  skillsHTML(tree) {
    const s = H.save, avail = this.skillPoints();
    const T = H.SKILL_TREES.find(t => t.id === tree);
    return this.tabs(H.SKILL_TREES.map(t => [t.id, t.name]), tree, 'skillTree') + `<p class="fine">Skill points available: <b>${avail}</b> (one per level, plus 4 per infamy rank). Tiers unlock as you spend points in that column. <button data-act="respec">Respec ($${(s.level * 500).toLocaleString()})</button></p>
      <div class="skilltree">${T.subs.map((sub, si) => { const spent = this.spentIn(tree, si); return `<div class="sub"><h4>${esc(sub.name)} <small>${spent} pts</small></h4>${sub.skills.map((sk, ki) => ki).reverse().map(ki => { const sk = sub.skills[ki]; const key = tree + si + '_' + ki, lv = s.skills[key] || 0, req = H.TIER_REQ[ki], cost = H.TIER_COST[ki][lv] ; const unlocked = spent >= req; return `<button class="skill lv${lv} ${unlocked ? '' : 'locked'}" data-act="skill" data-key="${key}" data-tier="${ki}" ${!unlocked || lv >= 2 || avail < (cost || 99) ? 'disabled' : ''}><b>${esc(sk[0])}</b><span class="b">${esc(sk[1])}</span><span class="a">Aced: ${esc(sk[3])}</span><em>${lv >= 2 ? 'Aced' : lv === 1 ? 'Ace · ' + cost + ' pts' : 'Learn · ' + cost + ' pts'}${unlocked ? '' : ' · needs ' + req}</em></button>`; }).join('')}</div>`; }).join('')}</div>`;
  },
  skillPoints() { const s = H.save; let spent = 0; for (const k in s.skills) { const tier = +k.split('_')[1]; const lv = s.skills[k]; for (let i = 0; i < lv; i++) spent += H.TIER_COST[tier][i]; } return s.level + s.infamy * 4 - spent; },
  spentIn(tree, si) { const s = H.save; let n = 0; for (const k in s.skills) if (k.startsWith(tree + si + '_')) { const tier = +k.split('_')[1]; for (let i = 0; i < s.skills[k]; i++) n += H.TIER_COST[tier][i]; } return n; },
  perksHTML() {
    const s = H.save;
    s.perk.prog = s.perk.prog || {};
    return `<p class="fine">Perk points: <b>${s.perk.points}</b> — earned from XP. Each card costs 2 points. Switching decks keeps each deck's progress.</p><div class="list tight">${H.PERK_DECKS.map(d => { const n = d.id === s.perk.deck ? s.perk.cards : (s.perk.prog[d.id] || 0); return `<div class="item ${d.id === s.perk.deck ? 'on' : ''}"><div><b>${esc(d.name)}</b><div class="perkcards">${d.cards.map((c, i) => `<span class="${i < n ? 'got' : ''}">${esc(c[0])}</span>`).join('')}</div></div><div class="col">${d.id === s.perk.deck ? '<em>Active</em>' : `<button data-act="deck" data-id="${d.id}">Equip</button>`}${d.id === s.perk.deck && n < d.cards.length ? `<button data-act="perkCard" ${s.perk.points < 2 ? 'disabled' : ''}>Unlock card</button>` : ''}</div></div>`; }).join('')}</div>`;
  },
  restHTML() {
    const s = H.save;
    return `<div class="grid2"><div><h3>Rest</h3><p>Sleep until 08:00. The heat dies down a little and a new edition of the Herald comes out.</p><button class="big" data-act="sleep">Sleep</button>
      <h3>Restock</h3><p>Refill ammo, throwables, deployables, health and armour from your stash.</p><button class="big" data-act="restock">Restock (free)</button>
      <h3>Save</h3><button data-act="save">Save game</button></div>
      <div><h3>On the table</h3>${this.newsHTML()}</div></div>`;
  },
  // 3D preview for guns and masks, rendered with its own small renderer
  renderPreview(kind, arg) {
    const canvas = $('preview'); if (!canvas) return;
    if (this.preview) this.preview.dispose();
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping;
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffe0f0, 0x203050, 1.1)); const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(2, 3, 2); sc.add(dl); const rl = new THREE.DirectionalLight(0x40e0ff, 0.8); rl.position.set(-3, 1, -2); sc.add(rl);
    const cam = new THREE.PerspectiveCamera(30, canvas.width / canvas.height, 0.01, 50);
    let obj;
    if (kind === 'gun') { const s = H.save, inst = s.weapons.find(w => w.uid === +(arg || s.loadout.primary)) || s.weapons[0]; obj = H.buildGun(H.WMAP[inst.id], inst.mods, inst.paint); obj.rotation.y = Math.PI / 2; const bb = new THREE.Box3().setFromObject(obj); const c = bb.getCenter(new THREE.Vector3()); obj.position.sub(c); const L = bb.getSize(new THREE.Vector3()).length(); cam.position.set(0, L * 0.18, L * 1.25); }
    else { const s = H.save, m = s.masks[+(arg ?? s.loadout.mask)] || s.masks[0]; obj = H.buildMask(m); const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), H.mat(0x2a2a2a, 0.9)); head.scale.set(0.95, 1.12, 1.02); head.position.set(0, 0.0, -0.03); obj.add(head); cam.position.set(0, 0.05, 0.8); }
    const pivot = new THREE.Group(); pivot.add(obj); sc.add(pivot); cam.lookAt(0, 0, 0);
    let alive = true, drag = false, lx = 0, rot = 0.6;
    canvas.onpointerdown = e => { drag = true; lx = e.clientX; }; addEventListener('pointerup', () => drag = false);
    canvas.onpointermove = e => { if (drag) { rot += (e.clientX - lx) * 0.01; lx = e.clientX; } };
    const loop = () => { if (!alive) return; if (!drag) rot += 0.005; pivot.rotation.y = rot; r.render(sc, cam); requestAnimationFrame(loop); };
    loop();
    this.preview = { dispose: () => { alive = false; r.dispose(); } };
  },

  /* ---------- contacts ---------- */
  openContact(id) {
    const c = H.CONTACTS.find(x => x.id === id), s = H.save;
    let body = '';
    const stars = H.heat.wanted, dz = H.heat.danger();
    if (id === 'fence') body = `<p>"Offshore money's no good on the street, friend. I can clean it — for thirty points."</p><div class="row"><button data-act="launder" data-amt="10000" ${s.offshore < 10000 ? 'disabled' : ''}>Launder $10,000 → $7,000</button><button data-act="launder" data-amt="all" ${s.offshore < 1000 ? 'disabled' : ''}>Launder everything</button></div>`;
    if (id === 'arms') body = `<p>"Whatever you need. No serial numbers, no questions."</p><div class="row"><button data-act="safe" data-tab="market">Browse weapons</button><button data-act="ammoBuy" ${s.money < 600 ? 'disabled' : ''}>Full ammo · $600</button><button data-act="throwBuy" ${s.money < 1500 ? 'disabled' : ''}>Refill throwables · $1,500</button></div>`;
    if (id === 'informant') body = `<p>"I hear things. Things cost money."</p><div class="row"><button data-act="tip" ${s.money < 5000 ? 'disabled' : ''}>Buy a tip · $5,000</button><button data-act="card" ${s.money < 15000 ? 'disabled' : ''}>Inside man on your next job · $15,000</button></div>`;
    if (id === 'cop') { const price = 3000 * Math.max(1, stars) * (1 + dz); body = `<p>"Your face is all over the precinct. I can make some paperwork disappear."</p><div class="row"><button data-act="bribe" data-price="${price}" ${!stars || s.money < price ? 'disabled' : ''}>Call off the chase · ${H.money(price)}</button><button data-act="lowerHeat" ${s.heatPoints < 1 || s.money < 25000 ? 'disabled' : ''}>Lower danger level · $25,000</button></div><p class="fine">Danger level ${dz}/5. It rises with every job; loud jobs raise it faster.</p>`; }
    if (id === 'doc') body = `<p>"Sit down. Don't bleed on the magazines."</p><div class="row"><button data-act="heal" ${s.money < 500 ? 'disabled' : ''}>Patch up · $500</button></div>`;
    if (id === 'spray') body = `<p>"New paint, new plates. The cops won't know you."</p><div class="row"><button data-act="respray" ${s.money < 800 || !this.nearbyCar() ? 'disabled' : ''}>Respray nearby car · $800 (−1 star)</button></div><p class="fine">Park the car next to the shop first.</p>`;
    if (id === 'tailor') body = `<p>"A good mask is a second face. Make it a memorable one."</p><div class="row"><button data-act="safe" data-tab="masks">Open the mask workshop</button></div>`;
    if (id === 'dealer') { const car = this.nearbyCar(); const val = car ? { sports: 9000, muscle: 6500, convertible: 7000, suv: 4500, sedan: 3000, van: 2500, taxi: 2000, police: 12000, swatvan: 15000 }[car.type] || 2000 : 0; body = `<p>"Nice ride. Shame if someone… bought it off you."</p><div class="row"><button data-act="sellCar" data-val="${val}" ${!car || stars ? 'disabled' : ''}>Sell nearby car · ${H.money(val)}</button><button data-act="buyCar" ${s.money < 30000 ? 'disabled' : ''}>Buy a Cheetah GT for your garage · $30,000</button></div>`; }
    this.open(`<div class="panel contact"><h2>${esc(c.name)}</h2><small>${esc(c.place)}</small>${body}<div class="row"><button data-act="close">Leave</button></div></div>`);
  },
  nearbyCar() { let best = null, bd = 14; for (const c of H.cars) { if (c.static || c.dead || c.driver === 'ai') continue; const d = c.pos.distanceTo(H.P.pos); if (d < bd) { bd = d; best = c; } } return best; },

  /* ---------- payday ---------- */
  payday(take, levels) {
    const rows = [['Contract', take.contract], ['Secured loot (' + take.bags + ' bags)', take.lootV], ['Small loot', take.small]];
    if (take.civPenalty) rows.push(['Civilian casualties', -take.civPenalty]);
    this.open(`<div class="payday"><h1>PAYDAY</h1><h3>${esc(take.name)} — ${H.DIFFS[take.diff].name}</h3>
      <table class="kv">${rows.map(([a, b]) => `<tr><th>${a}</th><td class="${b < 0 ? 'neg' : ''}">${H.money(b)}</td></tr>`).join('')}<tr class="tot"><th>Spending cash</th><td>${H.money(take.cash)}</td></tr><tr><th>Offshore account</th><td>${H.money(take.offshore)}</td></tr><tr><th>Experience</th><td>+${take.xp.toLocaleString()} XP${levels ? ' · <b>' + levels + ' level' + (levels > 1 ? 's' : '') + ' up!</b>' : ''}</td></tr></table>
      <h3>Pick a card</h3><div class="pcards">${[0, 1, 2].map(i => `<button class="pcard" data-act="pickCard" data-i="${i}"><span>?</span></button>`).join('')}</div>
      <div class="row"><button class="big" data-act="close" id="paydayDone" disabled>Continue</button></div></div>`, 'wide');
  },
  wasted(title, msg) {
    this.open(`<div class="wasted"><h1>${esc(title)}</h1><p>${esc(msg)}</p><button class="big" data-act="close">Continue</button></div>`);
  },

  /* ---------- actions ---------- */
  actions: {
    close() { this.close(); },
    start() { this.close(); H.boot(); },
    newgame() { try { localStorage.removeItem('heist_save'); } catch (e) { /* ignore */ } this.close(); H.boot(); },
    settings() { this.openSettings(); },
    saveSettings() { const s = H.settings; s.sens = +$('setSens').value; s.fov = +$('setFov').value; s.volume = +$('setVol').value; s.music = +$('setMus').value; s.quality = $('setQ').value; H.saveSettings(); H.audio.setVol(); H.camera.fov = s.fov; H.camera.updateProjectionMatrix(); H.renderer.shadowMap.enabled = s.quality === 'high'; if (H.game.state === 'city') this.close(); else this.openTitle(); },
    save() { H.persist(); this.toast('Saved', 'Progress saved in this browser.'); },
    phone(d) { this.openPhone(d.tab); },
    safe(d) { this.openSafehouse(d.tab, d.arg); },
    waypoint(d) { const p = H.sites[d.id].spec.points.plan; this.waypoint = { x: p.x, z: p.z, label: H.HEISTS.find(h => h.id === d.id).name }; this.close(); },
    waypointContact(d) { const c = H.contactSpots.find(x => x.c.id === d.id); this.waypoint = { x: c.x, z: c.z, label: c.c.name }; this.close(); },
    taxi(d) {
      if (H.heat.wanted) return this.toast('No taxi', 'No driver will pick you up while the cops are after you.');
      if (H.save.money < 250) return this.toast('Not enough cash', 'A taxi costs $250.');
      H.save.money -= 250; const p = H.sites[d.id].spec.points.plan;
      if (H.P.inCar) H.game.exitCar();
      H.P.pos.set(p.x + 3, 0.2, p.z + 6); H.P.yaw = 0; this.close(); this.toast('Taxi', 'Dropped off at ' + H.HEISTS.find(h => h.id === d.id).name + '.');
    },
    contact(d) { this.openContact(d.id); },
    customUpdate() { const c = this.custom; c.site = $('cSite').value; c.loot = $('cLoot').value; c.n = +$('cN').value; c.guards = +$('cG').value; c.cams = $('cCams').checked; this.openPhone('custom'); },
    customPost() {
      this.actions.customUpdate.call(this);
      const c = this.custom, base = H.HEISTS.find(h => h.id === c.site), site = H.sites[c.site];
      H.customJob = { id: 'custom_' + c.site, siteId: c.site, name: 'Custom: ' + H.TEMPLATES[site.tpl].name, by: 'You', tpl: site.tpl, pay: Math.round(15000 + c.n * 8000 + c.guards * 4000), stealth: true, loud: true, loot: { [c.loot]: c.n }, extraGuards: c.guards, noCams: !c.cams, desc: 'Your own job, planned your way.' };
      const p = site.spec.points.plan; this.waypoint = { x: p.x, z: p.z, label: H.customJob.name };
      this.close(); this.toast('Job posted', 'Go to ' + base.name + ' to plan it.');
    },
    planSel(d) { this.openPlanner(this.planHeist, d.tab); },
    planDiff(d) { this.plan.diff = +d.i; this.openPlanner(this.planHeist, this.el.menu.querySelector('[data-act=planStart]').dataset.sel); },
    planCrew(d) { this.plan.crew = +d.n; this.openPlanner(this.planHeist, this.el.menu.querySelector('[data-act=planStart]').dataset.sel); },
    planStart(d) {
      const h = this.planHeist, def = d.sel === 'custom' && H.customJob ? H.customJob : h, st = this.plan, s = H.save;
      const cost = H.ASSETS.filter(a => st.assets[a.id]).reduce((a, b) => a + b.cost, 0);
      if (cost > s.money) return;
      s.money -= cost;
      const assets = Object.assign({}, st.assets); if (def.noCams) assets.nocams = true;
      if (s.freeInside) { assets.inside = true; s.freeInside = false; }
      this.close();
      H.equipLoadout();
      // news effects: guard numbers
      const fx = H.newsFx().guards[h.id];
      const site = H.sites[def.siteId || def.id];
      const guards0 = site.spec.guards; let guards = guards0;
      if (fx && fx.guardsMul) guards = guards0.slice(0, Math.max(1, Math.ceil(guards0.length * fx.guardsMul)));
      if ((fx && fx.guardsAdd) || def.extraGuards) { guards = guards0.slice(); for (let i = 0; i < (fx && fx.guardsAdd || 0) + (def.extraGuards || 0); i++) guards.push(guards0[i % guards0.length]); }
      site.spec.guards = guards;
      H.startHeist(def, { diff: st.diff, crew: st.crew, assets });
      site.spec.guards = guards0;
      if (def === H.customJob) H.customJob = null;
      if (!H.run.def.stealth) H.P.masked = true;
    },
    equipW(d) { H.save.loadout[d.slot] = +d.uid; H.persist(); this.openSafehouse('loadout'); },
    equipMask(d) { H.save.loadout.mask = +d.i; this.openSafehouse('loadout'); },
    crewName() { H.save.crewName = $('crewName').value.trim() || H.save.crewName; this.openSafehouse('loadout'); },
    marketCat(d) { this.openSafehouse('market', d.tab); },
    buyW(d) { const s = H.save, w = H.WMAP[d.id]; if (s.money < w.price) return; s.money -= w.price; const mods = {}; if (w.cat === 'sniper') { const sc = H.MODS.find(m => m.slot === 'sight' && m.vis === 'scope'); mods.sight = sc.id; if (!s.unlockedMods.includes(sc.id)) s.unlockedMods.push(sc.id); } s.weapons.push({ uid: s.nextUid++, id: w.id, mods, paint: 0 }); H.checkAchievements(); H.persist(); this.toast('Purchased', w.name); this.openSafehouse('market', d.cat); },
    sellW(d) { const s = H.save, i = s.weapons.findIndex(w => w.uid === +d.uid); if (i < 0 || s.weapons.length <= 2) return; const w = H.WMAP[s.weapons[i].id]; if (s.loadout.primary === +d.uid || s.loadout.secondary === +d.uid) return this.toast('Equipped', 'Unequip it first.'); s.money += Math.round(w.price * 0.4); s.weapons.splice(i, 1); this.openSafehouse('workshop'); },
    wsSlot(d) { this.wsSlot = d.slot; this.openSafehouse('workshop', d.uid); },
    mod(d) { const s = H.save, m = H.MODMAP[d.mod], inst = s.weapons.find(w => w.uid === +d.uid); if (m.price && !s.unlockedMods.includes(m.id)) { if (s.money < m.price) return this.toast('Not enough cash', H.money(m.price)); s.money -= m.price; s.unlockedMods.push(m.id); } inst.mods[d.slot] = m.id; H.persist(); this.openSafehouse('workshop', d.uid); },
    paint(d) { const s = H.save, inst = s.weapons.find(w => w.uid === +d.uid), i = +d.i, cost = i ? 2000 + i * 400 : 0; s.paints = s.paints || []; if (cost && !s.paints.includes(i)) { if (s.money < cost) return; s.money -= cost; s.paints.push(i); } inst.paint = i; this.openSafehouse('workshop', d.uid); },
    maskPart(d) { this.maskPart = d.tab; this.openSafehouse('masks', this.safeArg); },
    maskSet(d) { const s = H.save, m = s.masks[+d.i], v = d.part === 'shapes' ? d.v : +d.v, costs = { shapes: 6000, mats: 4000, pats: 3000, cols: 2000 }; if (!s.maskParts[d.part].includes(v)) { if (s.money < costs[d.part]) return this.toast('Not enough cash', H.money(costs[d.part])); s.money -= costs[d.part]; s.maskParts[d.part].push(v); } m[d.key] = v; H.persist(); this.openSafehouse('masks', d.i); },
    newMask() { const s = H.save; if (s.money < 8000) return; s.money -= 8000; s.masks.push({ shape: H.pick(s.maskParts.shapes), mat: H.pick(s.maskParts.mats), pat: H.pick(s.maskParts.pats), col: H.pick(s.maskParts.cols) }); H.checkAchievements(); this.openSafehouse('masks', s.masks.length - 1); },
    gear(d) { const s = H.save, own = s.owned[d.kind]; if (!own.includes(d.id)) { const p = +d.price; if (s.money < p) return this.toast('Not enough cash', H.money(p)); s.money -= p; own.push(d.id); } s.loadout[d.lo] = d.id; H.persist(); this.openSafehouse('gear'); },
    skillTree(d) { this.openSafehouse('skills', d.tab); },
    skill(d) { const s = H.save; s.skills[d.key] = (s.skills[d.key] || 0) + 1; H.calcMods(); H.persist(); this.openSafehouse('skills', d.key.replace(/\d+_\d+$/, '')); },
    respec() { const s = H.save, c = s.level * 500; if (s.money < c) return; s.money -= c; s.skills = {}; H.calcMods(); this.openSafehouse('skills'); },
    deck(d) { const s = H.save; s.perk.prog = s.perk.prog || {}; s.perk.prog[s.perk.deck] = s.perk.cards; s.perk.deck = d.id; s.perk.cards = s.perk.prog[d.id] || 0; H.calcMods(); this.openSafehouse('perks'); },
    perkCard() { const s = H.save; if (s.perk.points < 2) return; s.perk.points -= 2; s.perk.cards++; H.calcMods(); this.openSafehouse('perks'); },
    sleep() { const s = H.save, C = H.city; if (C.timeOfDay > 8) s.day++; C.timeOfDay = 8; H.game.lastTod = 8; s.news = H.makeNewspaper(s.day); if (H.heat.wanted) H.heat.clear('You slept it off.'); if (s.heatPoints > 0 && Math.random() < 0.3) s.heatPoints--; H.actionsRestock(); H.persist(); this.toast('Good morning', 'Day ' + s.day + '. The Herald is on the table.'); this.openSafehouse('rest'); },
    restock() { H.actionsRestock(); this.toast('Restocked', 'Ammo, gear, health and armour refilled.'); },
    infamy() { const s = H.save; if (s.level < 100 || s.offshore < 2e6) return this.toast('Not yet', 'You need level 100 and $2,000,000 offshore.'); s.offshore -= 2e6; s.level = 1; s.xp = 0; s.infamy++; s.skills = {}; s.maskParts.shapes.push(H.MASK_SHAPES[(s.infamy * 5) % H.MASK_SHAPES.length]); H.checkAchievements(); H.calcMods(); this.openPhone('stats'); },
    pickCard(d) {
      const btns = this.el.menu.querySelectorAll('.pcard'); if (this.el.menu.querySelector('.pcard.flip')) return;
      const rewards = [];
      for (let i = 0; i < 3; i++) rewards.push(H.rollCard());
      btns.forEach((b, i) => { b.classList.add('flip'); if (i !== +d.i) b.classList.add('dim'); b.innerHTML = `<b>${esc(rewards[i].title)}</b><small>${esc(rewards[i].desc)}</small>`; });
      rewards[+d.i].give(); H.persist(); $('paydayDone').disabled = false; H.audio.cash();
    },
    launder(d) { const s = H.save, a = d.amt === 'all' ? s.offshore : Math.min(+d.amt, s.offshore); s.offshore -= a; s.money += Math.round(a * 0.7); this.openContact('fence'); },
    ammoBuy() { const s = H.save; s.money -= 600; for (const W of H.P.weapons) W.reserve = W.st.total - W.mag; this.openContact('arms'); },
    throwBuy() { const s = H.save; s.money -= 1500; H.P.throws = H.P.throwable.count; this.openContact('arms'); },
    tip() {
      const s = H.save; s.money -= 5000; const h = H.pick(H.HEISTS.filter(x => x.tpl !== 'shop'));
      s.news.items.splice(1, 0, { kind: 'tip', head: `Whisper: "${h.name} is short-staffed today."`, body: 'Fewer guards there until tomorrow.', fx: { heist: h.id, guardsMul: 0.5 } });
      this.toast('Tip bought', h.name + ' is short on guards today.'); this.openContact('informant');
    },
    card() { const s = H.save; s.money -= 15000; s.freeInside = true; this.toast('Inside man', 'A keycard will be waiting at your next job.'); this.openContact('informant'); },
    bribe(d) { const s = H.save; s.money -= +d.price; H.heat.clear('Sgt. Dooley made the paperwork disappear.'); this.openContact('cop'); },
    lowerHeat() { const s = H.save; s.money -= 25000; s.heatPoints = Math.max(0, s.heatPoints - 4); this.openContact('cop'); },
    heal() { const s = H.save; s.money -= 500; H.P.hp = H.P.hpMax; H.P.armor = H.P.armorMax; this.openContact('doc'); },
    respray() { const s = H.save, c = this.nearbyCar(); if (!c) return; s.money -= 800; c.g.userData.paint.color.setHex(H.pick([0xe8e8e8, 0x101010, 0xc01a1a, 0x1a4ac0, 0xf0c020, 0xe86aa0])); if (H.heat.wanted) { H.heat.setWanted(H.heat.wanted - 1); if (!H.heat.wanted) H.heat.clear('Fresh paint. The cops lost you.'); } this.openContact('spray'); },
    sellCar(d) { const s = H.save, c = this.nearbyCar(); if (!c) return; s.money += +d.val; c.remove(); this.toast('Sold', H.money(+d.val)); this.openContact('dealer'); },
    buyCar() { const s = H.save; s.money -= 30000; s.cars.push('sports'); const g = H.city.garagePos; const c = new H.Car('sports', g.x, g.z, 0, { color: 0xff3aa0 }); c.keep = true; this.toast('Delivered', 'Your Cheetah GT is parked at the safehouse.'); this.openContact('dealer'); },
  },
};
function bar(label, v, num) { return `<div class="bar"><span>${label}</span><i><u style="width:${H.clamp(v, 0, 100)}%"></u></i>${num !== undefined ? '<b>' + num + '</b>' : ''}</div>`; }

H.actionsRestock = function () {
  const P = H.P; H.equipLoadout();
  P.hp = P.hpMax; P.armor = P.armorMax;
};
H.equipLoadoutSoft = function () { if (!H.run && H.P && H.ui.safehouseOpenWas) { H.equipLoadout(); } };

/* PAYDAY card rewards */
H.rollCard = function () {
  const s = H.save, r = Math.random();
  if (r < 0.25) { const v = Math.round(H.rand(5, 25) * 1000 * (1 + s.level / 20)); return { title: H.money(v), desc: 'Cash bonus', give: () => { s.money += v; } }; }
  if (r < 0.4) { const v = Math.round(H.rand(1000, 4000) * (1 + s.level / 30)); return { title: v.toLocaleString() + ' XP', desc: 'Experience', give: () => { s.xp += v; } }; }
  if (r < 0.65) { const m = H.pick(H.MODS.filter(m => m.price && !s.unlockedMods.includes(m.id))); if (m) return { title: m.name, desc: 'Weapon mod unlocked', give: () => s.unlockedMods.push(m.id) }; }
  if (r < 0.8) { const shape = H.pick(H.MASK_SHAPES.filter(x => !s.maskParts.shapes.includes(x))); if (shape) return { title: H.MASK_NAMES[shape], desc: 'Mask unlocked', give: () => { s.maskParts.shapes.push(shape); } }; }
  if (r < 0.9) { const k = H.randi(0, H.MASK_PATTERNS.length - 1); return { title: 'Pattern: ' + H.MASK_PATTERNS[k], desc: 'Mask pattern', give: () => { if (!s.maskParts.pats.includes(k)) s.maskParts.pats.push(k); } }; }
  const k = H.randi(0, H.MASK_COLORS.length - 1); return { title: 'Colours: ' + H.MASK_COLORS[k][0], desc: 'Mask colours', give: () => { if (!s.maskParts.cols.includes(k)) s.maskParts.cols.push(k); } };
};
