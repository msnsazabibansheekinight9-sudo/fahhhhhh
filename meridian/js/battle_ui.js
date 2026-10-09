'use strict';
// Battle presentation: camera, input, HUD, minimap, overlay and per-frame visual sync.
(function () {
  const T = THREE, PI = Math.PI;
  const P = SM.Battle.prototype;
  const V = new T.Vector3();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  P.initUI = function () {
    const root = this.o.root;
    this.selection = [];
    this.groups = {};
    this.mode = null; // {type:'ability', id, slot} | {type:'amove'} | {type:'rally'}
    this.keys = {};
    this.mouse = { x: 0, y: 0, inside: false };
    this.drag = null;
    this.frameN = 0;
    root.innerHTML = `
      <div class="b-top">
        <div class="b-res"><span class="b-cp" title="Command Points pay for deployments. Income grows with captured points."><b id="bCp">0</b><i>CP</i><em id="bInc"></em></span><span class="b-pop" title="Population used / cap"><b id="bPop">0</b><i>/ 40 POP</i></span></div>
        <div class="b-tickets"><div class="tk tk0"><b id="bT0">800</b><div class="tkbar"><span id="bTB0"></span></div></div><div class="b-pts" id="bPts"></div><div class="tk tk1"><div class="tkbar"><span id="bTB1"></span></div><b id="bT1">800</b></div></div>
        <div class="b-right"><span class="b-weather" id="bWeather"></span><span class="b-clock" id="bClock">00:00</span>
          <button class="b-btn" id="bSpeed" title="Game speed">1×</button><button class="b-btn" id="bPause" title="Pause menu (Esc)">❚❚</button></div>
      </div>
      <div class="b-feed" id="bFeed"></div>
      <div class="b-msg" id="bMsg"></div>
      <div class="b-bottom">
        <div class="b-mini"><canvas id="bMini" width="200" height="200"></canvas></div>
        <div class="b-center">
          <div class="b-sel" id="bSel"></div>
          <div class="b-deploy" id="bDeploy"></div>
        </div>
      </div>
      <div class="b-tip" id="bTip" hidden></div>
      <div class="b-pausemenu" id="bPauseMenu" hidden>
        <div class="pm-box"><h2>Paused</h2>
          <button class="pm-b" data-pm="resume">Resume</button>
          <button class="pm-b" data-pm="help">Controls</button>
          <button class="pm-b danger" data-pm="surrender">Surrender</button>
          <div class="pm-help" id="bHelp" hidden>
            <p><b>Select</b> left-click or drag a box. Shift adds. Double-click selects all of that type on screen.</p>
            <p><b>Move / attack</b> right-click ground or an enemy. <b>F</b> then left-click: attack-move.</p>
            <p><b>Camera</b> WASD or arrow keys or screen edges to pan, Q/E or middle-drag to rotate, wheel to zoom. Space centres on the selection.</p>
            <p><b>Abilities</b> Z X C V or click the buttons. Point abilities wait for a left-click target.</p>
            <p><b>Groups</b> Ctrl+1–9 to assign, 1–9 to recall (twice to jump). <b>H</b> halt. <b>R</b> then click: set rally point.</p>
            <p><b>Deploy</b> click a card in the bottom bar. Aircraft fly in from your map edge and leave when their loiter time runs out.</p>
          </div>
          <div class="pm-confirm" id="bConfirm" hidden><p>Surrender this battle? It counts as a defeat.</p><button class="pm-b danger" data-pm="yes">Surrender</button><button class="pm-b" data-pm="no">Keep fighting</button></div>
        </div>
      </div>`;
    const cv = this.renderer.domElement;
    cv.classList.add('b-canvas');
    root.prepend(cv);
    this.overlay = document.createElement('canvas'); this.overlay.className = 'b-overlay';
    root.insertBefore(this.overlay, cv.nextSibling);
    this.octx = this.overlay.getContext('2d');
    const $ = id => root.querySelector('#' + id);
    this.el = { cp: $('bCp'), inc: $('bInc'), pop: $('bPop'), t0: $('bT0'), t1: $('bT1'), tb0: $('bTB0'), tb1: $('bTB1'), pts: $('bPts'), weather: $('bWeather'), clock: $('bClock'), feed: $('bFeed'), msg: $('bMsg'), mini: $('bMini'), sel: $('bSel'), deploy: $('bDeploy'), tip: $('bTip'), pm: $('bPauseMenu'), help: $('bHelp'), confirm: $('bConfirm'), speed: $('bSpeed') };
    this.hud = true;
    // points chips
    this.el.pts.innerHTML = this.points.map((p, i) => `<div class="pt" data-i="${i}"><span>${p.letter}</span><i></i></div>`).join('');
    this.el.pts.querySelectorAll('.pt').forEach(e => e.addEventListener('click', () => { const p = this.points[+e.dataset.i]; this.cam.tx = p.x; this.cam.tz = p.z + 30; }));
    // deploy cards
    const tm = this.teams[0];
    this.el.deploy.innerHTML = tm.cards.map((c, i) => {
      const cls = SM.CLASSES[c.def.cls];
      return `<button class="dc" data-i="${i}" title="">
        <img alt="" data-portrait="${i}"><span class="dc-rank">${SM.ROMAN[c.def.rank]}</span>
        <span class="dc-name">${esc(c.def.name)}</span><span class="dc-cost">${c.def.cp}</span><span class="dc-pop">${cls.pop}</span><span class="dc-cd"></span></button>`;
    }).join('');
    this.el.deploy.querySelectorAll('.dc').forEach(b => {
      const i = +b.dataset.i;
      b.addEventListener('click', () => { SM.Audio.init(); const why = this.canDeploy(0, tm.cards[i]); if (why) { this.flashMsg(why === 'cp' ? 'Not enough Command Points' : why === 'pop' ? 'Population cap reached' : why === 'nowater' ? 'No naval dock on this map' : 'Deployment cooling down'); return; } this.deploy(0, i); });
      b.addEventListener('mouseenter', () => this.showTip(b, this.cardTip(tm.cards[i])));
      b.addEventListener('mouseleave', () => this.hideTip());
    });
    tm.cards.forEach((c, i) => { if (SM.portrait) SM.portrait(c.def, c.mods, c.skin, url => { const img = this.el.deploy.querySelector('[data-portrait="' + i + '"]'); if (img) img.src = url; }); });
    $('bPause').addEventListener('click', () => this.togglePause());
    this.el.speed.addEventListener('click', () => { this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1; this.el.speed.textContent = this.speed + '×'; });
    this.el.pm.addEventListener('click', e => {
      const a = e.target.dataset && e.target.dataset.pm; if (!a) return;
      if (a === 'resume') this.togglePause(false);
      if (a === 'help') this.el.help.hidden = !this.el.help.hidden;
      if (a === 'surrender') this.el.confirm.hidden = false;
      if (a === 'no') this.el.confirm.hidden = true;
      if (a === 'yes') { this.togglePause(false); this.finish(1, 'Surrendered'); }
    });
    // minimap background
    this.miniBg = SM.miniBackground(this.M, 200);
    // input
    const h = this.handlers = {
      down: e => this.onDown(e), move: e => this.onMove(e), up: e => this.onUp(e), wheel: e => this.onWheel(e),
      key: e => this.onKey(e, true), keyup: e => this.onKey(e, false), ctx: e => e.preventDefault(), dbl: e => this.onDbl(e),
      leave: () => { }, enter: () => { }, docOut: e => { if (!e.relatedTarget) this.mouse.inside = false; },
      miniDown: e => this.onMini(e), blur: () => { this.keys = {}; },
    };
    cv.addEventListener('mousedown', h.down); window.addEventListener('mousemove', h.move); window.addEventListener('mouseup', h.up);
    cv.addEventListener('wheel', h.wheel, { passive: false }); cv.addEventListener('contextmenu', h.ctx); cv.addEventListener('dblclick', h.dbl);
    cv.addEventListener('mouseleave', h.leave); cv.addEventListener('mouseenter', h.enter);
    window.addEventListener('keydown', h.key); window.addEventListener('keyup', h.keyup); window.addEventListener('blur', h.blur); document.addEventListener('mouseout', h.docOut);
    this.el.mini.addEventListener('mousedown', h.miniDown); this.el.mini.addEventListener('contextmenu', h.ctx);
    // touch: one finger pans, two fingers zoom, tap selects / orders
    const touch = this.touch = { pts: {}, start: null };
    h.tstart = e => { e.preventDefault(); for (const t of e.changedTouches) touch.pts[t.identifier] = { x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY }; touch.t0 = performance.now(); touch.moved = false; };
    h.tmove = e => {
      e.preventDefault();
      const ids = Object.keys(touch.pts);
      if (ids.length === 1) { const t = e.changedTouches[0], p = touch.pts[t.identifier]; if (!p) return; const dx = t.clientX - p.x, dy = t.clientY - p.y; p.x = t.clientX; p.y = t.clientY; if (Math.hypot(t.clientX - p.x0, t.clientY - p.y0) > 8) touch.moved = true; const k = this.cam.dist / 500; const s = Math.sin(this.cam.yaw), c = Math.cos(this.cam.yaw); this.cam.tx -= (dx * c + dy * s) * k; this.cam.tz -= (-dx * s + dy * c) * k; }
      else if (ids.length >= 2) { const a = touch.pts[ids[0]], b = touch.pts[ids[1]]; const d0 = Math.hypot(a.x - b.x, a.y - b.y); for (const t of e.changedTouches) if (touch.pts[t.identifier]) { touch.pts[t.identifier].x = t.clientX; touch.pts[t.identifier].y = t.clientY; } const d1 = Math.hypot(a.x - b.x, a.y - b.y); this.cam.tdist = SM.clamp(this.cam.tdist * d0 / Math.max(1, d1), 40, 320); touch.moved = true; }
    };
    h.tend = e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const p = touch.pts[t.identifier]; delete touch.pts[t.identifier];
        if (p && !touch.moved && performance.now() - touch.t0 < 400) this.tapAt(t.clientX, t.clientY);
      }
    };
    cv.addEventListener('touchstart', h.tstart, { passive: false }); cv.addEventListener('touchmove', h.tmove, { passive: false }); cv.addEventListener('touchend', h.tend, { passive: false });
    this.raycaster = new T.Raycaster();
    this.resize();
    this.hudWeather();
  };

  P.disposeUI = function () {
    const h = this.handlers, cv = this.renderer.domElement;
    cv.removeEventListener('mousedown', h.down); window.removeEventListener('mousemove', h.move); window.removeEventListener('mouseup', h.up);
    cv.removeEventListener('wheel', h.wheel); cv.removeEventListener('contextmenu', h.ctx); cv.removeEventListener('dblclick', h.dbl);
    cv.removeEventListener('mouseleave', h.leave); cv.removeEventListener('mouseenter', h.enter);
    cv.removeEventListener('touchstart', h.tstart); cv.removeEventListener('touchmove', h.tmove); cv.removeEventListener('touchend', h.tend);
    window.removeEventListener('keydown', h.key); window.removeEventListener('keyup', h.keyup); window.removeEventListener('blur', h.blur); document.removeEventListener('mouseout', h.docOut);
    if (SM.Audio.stopBeds) try { SM.Audio.stopBeds(); } catch (e) { }
  };

  P.resize = function () {
    const r = this.o.root.getBoundingClientRect();
    const w = Math.max(320, r.width), hgt = Math.max(240, r.height);
    const pr = Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : 1.5) * (this.o.resScale || 1);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, hgt, false);
    this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = hgt + 'px';
    this.camera.aspect = w / hgt; this.camera.updateProjectionMatrix();
    this.overlay.width = w; this.overlay.height = hgt;
    this.vw = w; this.vh = hgt;
    this.fx.setScale(hgt * pr);
    this.weather.flakeMat.uniforms.uScale.value = hgt * pr * 0.55;
  };

  P.togglePause = function (v) {
    this.paused = v === undefined ? !this.paused : v;
    this.el.pm.hidden = !this.paused; this.el.help.hidden = true; this.el.confirm.hidden = true;
  };

  P.flashMsg = function (t) { this.el.msg.textContent = t; this.el.msg.classList.remove('show'); void this.el.msg.offsetWidth; this.el.msg.classList.add('show'); };

  // ---------------------------------------------------------------- input
  P.screenOf = function (p, yOff) { V.set(p.x, p.y + (yOff || 0), p.z).project(this.camera); return { x: (V.x + 1) / 2 * this.vw, y: (1 - V.y) / 2 * this.vh, z: V.z }; };
  P.groundAt = function (sx, sy) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new T.Vector2((sx - r.left) / r.width * 2 - 1, -((sy - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.terrainMesh, false)[0];
    if (hit) return hit.point;
    const t = -this.raycaster.ray.origin.y / this.raycaster.ray.direction.y;
    if (t > 0) return this.raycaster.ray.origin.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(t));
    return null;
  };
  P.pickUnit = function (sx, sy, enemy) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const mx = sx - r.left, my = sy - r.top;
    let best = null, bd = 1e9;
    for (const u of this.units) {
      if (!u.alive) continue;
      if (enemy === true && u.team === 0) continue;
      if (enemy === false && u.team !== 0) continue;
      if (u.team !== 0 && !u.vis[0]) continue;
      const s = this.screenOf(u.pos, u.isHQ ? 6 : Math.min(3, u.radius * 0.4));
      if (s.z > 1) continue;
      const d = Math.hypot(s.x - mx, s.y - my);
      const lim = Math.max(18, (u.isHQ ? 26 : u.radius) * 900 / this.cam.dist * 0.18);
      if (d < lim && d < bd) { bd = d; best = u; }
    }
    return best;
  };
  P.onDown = function (e) {
    SM.Audio.init();
    this.mouse.x = e.clientX; this.mouse.y = e.clientY;
    if (e.button === 1) { e.preventDefault(); this.rot = { x: e.clientX, yaw: this.cam.tyaw }; return; }
    if (e.button === 2) {
      if (this.mode) { this.mode = null; this.cursorRing.visible = false; return; }
      this.rightClick(e.clientX, e.clientY, e.shiftKey);
      return;
    }
    if (e.button === 0) {
      if (this.mode) { this.modeClick(e.clientX, e.clientY); return; }
      this.drag = { x: e.clientX, y: e.clientY, x1: e.clientX, y1: e.clientY, shift: e.shiftKey };
    }
  };
  P.modeClick = function (sx, sy) {
    const g = this.groundAt(sx, sy);
    if (!g) return;
    const m = this.mode;
    if (m.type === 'amove') { this.groupOrder(this.selection.filter(u => u.team === 0), 'amove', g.x, g.z); this.marker(g.x, g.z, 0xffb24a); }
    else if (m.type === 'rally') { this.teams[0].rally = { x: g.x, z: g.z }; this.marker(g.x, g.z, 0x7affd8); this.flashMsg('Rally point set'); }
    else if (m.type === 'ability') {
      let used = 0;
      for (const u of this.selection) { const i = u.abil.findIndex(a => a.id === m.id && a.cd <= 0); if (i >= 0 && this.useAbility(u, i, g.x, g.z)) { used++; if (m.single) break; } }
      if (used) this.marker(g.x, g.z, 0xffd36a);
    }
    if (!(m.type === 'ability' && this.keys.shift)) { this.mode = null; this.cursorRing.visible = false; }
  };
  P.rightClick = function (sx, sy) {
    const sel = this.selection.filter(u => u.team === 0 && u.alive);
    if (!sel.length) return;
    const t = this.pickUnit(sx, sy, true);
    if (t) { sel.forEach(u => this.order(u, { type: 'attack', target: t })); this.marker(t.pos.x, t.pos.z, 0xff5040); SM.Audio.click(); return; }
    const g = this.groundAt(sx, sy);
    if (!g) return;
    this.groupOrder(sel, 'move', g.x, g.z);
    this.marker(g.x, g.z, 0x7ad0ff);
    SM.Audio.click();
  };
  P.tapAt = function (sx, sy) {
    SM.Audio.init();
    if (this.mode) { this.modeClick(sx, sy); return; }
    const own = this.pickUnit(sx, sy, false);
    if (own && !own.isHQ) { this.select([own], false); return; }
    if (this.selection.length) this.rightClick(sx, sy);
  };
  P.onMove = function (e) {
    this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.moved = true;
    this.mouse.inside = e.clientX > 0 && e.clientY > 0 && e.clientX < window.innerWidth - 1 && e.clientY < window.innerHeight - 1;
    if (this.rot) { this.cam.tyaw = this.rot.yaw - (e.clientX - this.rot.x) * 0.006; return; }
    if (this.drag) { this.drag.x1 = e.clientX; this.drag.y1 = e.clientY; }
  };
  P.onUp = function (e) {
    if (e.button === 1) { this.rot = null; return; }
    if (e.button !== 0 || !this.drag) return;
    const d = this.drag; this.drag = null;
    const r = this.renderer.domElement.getBoundingClientRect();
    if (Math.abs(d.x1 - d.x) < 6 && Math.abs(d.y1 - d.y) < 6) {
      const u = this.pickUnit(d.x, d.y);
      if (u && u.team === 0 && !u.isHQ) this.select([u], d.shift, true);
      else if (u && u.team !== 0) { this.inspect = u; if (!d.shift) this.select([], false); }
      else if (!d.shift) this.select([], false);
      return;
    }
    const x0 = Math.min(d.x, d.x1) - r.left, x1 = Math.max(d.x, d.x1) - r.left, y0 = Math.min(d.y, d.y1) - r.top, y1 = Math.max(d.y, d.y1) - r.top;
    const list = this.units.filter(u => u.team === 0 && u.alive && !u.isHQ && !u.isDecoy).filter(u => { const s = this.screenOf(u.pos, 1); return s.z < 1 && s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1; });
    this.select(list, d.shift);
  };
  P.onDbl = function (e) {
    const u = this.pickUnit(e.clientX, e.clientY, false);
    if (!u || u.isHQ) return;
    const list = this.units.filter(o => o.team === 0 && o.alive && o.def.id === u.def.id).filter(o => { const s = this.screenOf(o.pos, 1); return s.z < 1 && s.x >= 0 && s.x <= this.vw && s.y >= 0 && s.y <= this.vh; });
    this.select(list, false);
  };
  P.select = function (list, add, toggle) {
    if (add) {
      for (const u of list) { const i = this.selection.indexOf(u); if (i >= 0 && toggle) this.selection.splice(i, 1); else if (i < 0) this.selection.push(u); }
    } else this.selection = list.slice();
    this.inspect = null;
    this.selDirty = true;
    if (this.selection.length) SM.Audio.click();
  };
  P.onWheel = function (e) { e.preventDefault(); this.cam.tdist = SM.clamp(this.cam.tdist * (e.deltaY > 0 ? 1.12 : 0.89), 40, 320); };
  P.onKey = function (e, down) {
    if (this.over) return;
    const k = e.key.toLowerCase();
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    this.keys[k] = down; this.keys.shift = e.shiftKey; this.keys.ctrl = e.ctrlKey || e.metaKey;
    if (!down) return;
    if (k === 'escape') { if (this.mode) { this.mode = null; this.cursorRing.visible = false; } else this.togglePause(); e.preventDefault(); return; }
    if (this.paused) return;
    if (/^[1-9]$/.test(k)) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) { this.groups[k] = this.selection.slice(); this.flashMsg('Group ' + k + ' set'); }
      else if (this.groups[k]) {
        const g = this.groups[k].filter(u => u.alive);
        const now = performance.now();
        if (this.lastGroup === k && now - this.lastGroupT < 400 && g.length) this.focusSelection(g);
        this.lastGroup = k; this.lastGroupT = now;
        this.select(g, false);
      }
      return;
    }
    if (k === ' ') { e.preventDefault(); if (this.selection.length) this.focusSelection(this.selection); else { const hq = this.M.hq[0]; this.cam.tx = hq.x; this.cam.tz = hq.z - 40; } return; }
    if (k === 'h') { this.selection.forEach(u => { this.order(u, { type: 'idle' }); u.anchor = { x: u.pos.x, z: u.pos.z }; }); return; }
    if (k === 'f') { if (this.selection.length) this.mode = { type: 'amove' }; return; }
    if (k === 'r') { this.mode = { type: 'rally' }; return; }
    if (k === 'tab') { e.preventDefault(); return; }
    const slot = ['z', 'x', 'c', 'v'].indexOf(k);
    if (slot >= 0) { this.triggerAbility(slot); return; }
  };
  P.focusSelection = function (list) { let x = 0, z = 0; list.forEach(u => { x += u.pos.x; z += u.pos.z; }); this.cam.tx = x / list.length; this.cam.tz = z / list.length; };
  P.primary = function () {
    const sel = this.selection.filter(u => u.alive);
    if (!sel.length) return null;
    const counts = {}; let best = sel[0], bc = 0;
    sel.forEach(u => { counts[u.def.id] = (counts[u.def.id] || 0) + 1; if (counts[u.def.id] > bc) { bc = counts[u.def.id]; best = u; } });
    return best;
  };
  P.triggerAbility = function (slot) {
    const p = this.primary(); if (!p) return;
    const a = p.abil[slot]; if (!a) return;
    const A = SM.ABILITIES[a.id];
    const ready = this.selection.filter(u => u.alive && u.abil.some(x => x.id === a.id && (x.cd <= 0 || (A.toggle && u.buffs.siege))));
    if (!ready.length) { this.flashMsg(A.name + ' is recharging'); return; }
    if (A.target === 'point') { this.mode = { type: 'ability', id: a.id, range: A.range, single: a.id === 'orbital' || a.id === 'carpet' }; return; }
    ready.forEach(u => { const i = u.abil.findIndex(x => x.id === a.id); this.useAbility(u, i); });
    this.selDirty = true;
  };
  P.onMini = function (e) {
    e.preventDefault();
    const r = this.el.mini.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * this.M.S, z = ((e.clientY - r.top) / r.height - 0.5) * this.M.S;
    if (e.button === 2) { const sel = this.selection.filter(u => u.team === 0); if (sel.length) { this.groupOrder(sel, 'move', x, z); this.marker(x, z, 0x7ad0ff); } return; }
    this.cam.tx = x; this.cam.tz = z;
    const mv = ev => { const xx = ((ev.clientX - r.left) / r.width - 0.5) * this.M.S, zz = ((ev.clientY - r.top) / r.height - 0.5) * this.M.S; this.cam.tx = SM.clamp(xx, -300, 300); this.cam.tz = SM.clamp(zz, -300, 300); };
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  };
  P.marker = function (x, z, col) { this.markers.push({ x, z, col, t: 0 }); };

  // ---------------------------------------------------------------- camera
  P.updateCamera = function (dt) {
    const c = this.cam, k = this.keys;
    const sp = c.dist * 1.1 * dt;
    let mx = 0, mz = 0;
    if (k.w || k.arrowup) mz -= 1; if (k.s || k.arrowdown) mz += 1; if (k.a || k.arrowleft) mx -= 1; if (k.d || k.arrowright) mx += 1;
    if (this.o.edgePan !== false && this.mouse.inside && this.mouse.moved && document.hasFocus() && !this.drag && !this.rot && !this.paused) {
      const r = this.renderer.domElement.getBoundingClientRect(), m = 8;
      if (this.mouse.x < r.left + m) mx -= 1; if (this.mouse.x > r.right - m) mx += 1; if (this.mouse.y < r.top + m) mz -= 1; if (this.mouse.y > r.bottom - m) mz += 1;
    }
    if (k.q) c.tyaw += dt * 1.6; if (k.e) c.tyaw -= dt * 1.6;
    const s = Math.sin(c.yaw), co = Math.cos(c.yaw);
    c.tx += (mx * co + mz * s) * sp; c.tz += (-mx * s + mz * co) * sp;
    c.tx = SM.clamp(c.tx, -300, 300); c.tz = SM.clamp(c.tz, -300, 300);
    const f = Math.min(1, dt * 9);
    c.x += (c.tx - c.x) * f; c.z += (c.tz - c.z) * f; c.dist += (c.tdist - c.dist) * f; c.yaw += (c.tyaw - c.yaw) * f;
    const pitch = 0.6 + 0.42 * SM.clamp((c.dist - 40) / 260, 0, 1);
    const gy = Math.max(this.M.groundAt(c.x, c.z), this.M.water !== null ? this.M.water : -99);
    const h = c.dist * Math.cos(pitch), y = c.dist * Math.sin(pitch);
    let px = c.x + Math.sin(c.yaw) * h, pz = c.z + Math.cos(c.yaw) * h, py = gy + y;
    py = Math.max(py, this.M.groundAt(px, pz) + 8);
    if (this.cameraShake > 0) { this.cameraShake = Math.max(0, this.cameraShake - dt * 1.5); const a = this.cameraShake * 1.5; px += (Math.random() - 0.5) * a; py += (Math.random() - 0.5) * a; pz += (Math.random() - 0.5) * a; }
    this.camera.position.set(px, py, pz);
    this.camera.lookAt(c.x, gy + 2, c.z);
    // shadow frustum follows the camera target
    const sd = this.sunDir, sz = SM.clamp(c.dist * 0.9, 90, 220);
    const sc = this.sunLight.shadow.camera;
    if (sc.right !== sz) { sc.left = -sz; sc.right = sz; sc.top = sz; sc.bottom = -sz; sc.updateProjectionMatrix(); }
    this.sunLight.position.set(c.x + sd.x * 300, gy + sd.y * 300, c.z + sd.z * 300);
    this.sunLight.target.position.set(c.x, gy, c.z);
  };

  // ---------------------------------------------------------------- per-frame
  P.frame = function (dtReal) {
    if (!this.scene) return;
    dtReal = SM.clamp(dtReal || 0, 0, 0.1);
    this.frameN++;
    this.update(dtReal);
    const dt = this.paused || this.over ? 0 : dtReal * this.speed;
    this.updateCamera(dtReal);
    this.syncVisuals(dt);
    // weather + atmosphere
    const center = new T.Vector3(this.cam.x, Math.max(this.M.groundAt(this.cam.x, this.cam.z), this.M.water || -99), this.cam.z);
    const wm = this.wm || this.weather.mods();
    const wres = this.weather.update(dt, center, { light: wm.light });
    const W = this.weather;
    const fogD = W.lerpVal('fog', 0.0012) * (this.def.time === 'night' ? 1.1 : 1);
    const fcB = SM.WEATHER[W.cur].fogColor, fcA = SM.WEATHER[W.from].fogColor;
    const fogCol = this.fogBase.clone();
    const night = this.def.time === 'night' ? 0.3 : this.def.time === 'dusk' ? 0.75 : 1;
    if (fcA) fogCol.lerp(new T.Color(fcA).multiplyScalar(night), 1 - W.blend);
    if (fcB) fogCol.lerp(new T.Color(fcB).multiplyScalar(night), W.blend);
    fogCol.multiplyScalar(0.75 + 0.25 * wm.light);
    this.scene.fog.color.copy(fogCol).convertSRGBToLinear(); this.scene.fog.density = fogD;
    this.fx.setFog(fogCol, fogD);
    this.weather.flakeMat.uniforms.uFogCol.value.copy(fogCol); this.weather.flakeMat.uniforms.uFogD.value = fogD;
    const flash = W.flash;
    this.sunLight.intensity = this.tm.sunI * wm.light;
    this.hemi.intensity = this.tm.hemiI * (0.65 + 0.35 * wm.light) + flash * 2.2;
    const su = this.sky.material.uniforms;
    su.uCloud.value = W.lerpVal('clouds', 0.3); su.uTime.value += dt; su.uFlash.value = flash * 0.6; su.uAurora.value = W.lerpVal('aurora', 0) + (this.def.id === 'pipeline' ? 0.35 : 0);
    su.uFogCol.value.copy(fogCol); su.uFogMix.value = SM.clamp(fogD * 120, 0, 0.95); su.uLight.value = wm.light;
    this.sky.position.copy(this.camera.position);
    if (this.water) { const u = this.water.material.uniforms; u.uTime.value += dt; u.uFogCol.value.copy(fogCol); u.uFogD.value = fogD; u.uLight.value = (0.55 + 0.45 * wm.light) * (this.def.time === 'night' ? 0.45 : 1); u.uSky.value.copy(fogCol).lerp(new T.Color(this.tm.horizon), 0.5); }
    if (this.M.turbines) for (const r of this.M.turbines) r.rotation.z += dt * 0.8;
    if (wres.strike) this.lightning(wres.strike);
    // audio beds
    if (this.frameN % 20 === 0 && SM.Audio.ctx) {
      const cur = SM.WEATHER[W.cur];
      SM.Audio.bed('rain', cur.sound === 'rain' ? 0.35 * W.blend : cur.sound === 'rainLight' ? 0.12 : 0);
      SM.Audio.bed('wind', cur.sound === 'wind' ? 0.5 * W.blend : 0.06);
      SM.Audio.bed('rumble', 0.12);
    }
    this.fx.update(dt, wres.wind);
    // capture point visuals
    for (const p of this.points) {
      const col = p.owner === 0 ? 0x46b2ff : p.owner === 1 ? 0xff5b4a : 0xd8d8d8;
      p.ring.material.color.setHex(p.contested ? (Math.floor(this.time * 4) % 2 ? 0xffd36a : col) : col);
      p.fill.material.color.setHex(col); p.fill.material.opacity = 0.05 + Math.abs(p.prog) / 100 * 0.1;
      p.flag.material.color.setHex(col);
      p.flag.position.y = 2.2 + 6.4 * Math.abs(p.prog) / 100;
      p.flag.rotation.y = Math.sin(this.time * 2 + p.x) * 0.25;
    }
    for (const tm of this.teams) { const f = tm.hq.obj.getObjectByName('flag'); if (f) f.rotation.y = Math.sin(this.time * 1.7) * 0.2; }
    this.renderer.render(this.scene, this.camera);
    this.drawOverlay(dtReal);
    if (this.frameN % 6 === 0) this.updateHUD();
    if (this.frameN % 4 === 0) this.drawMini();
  };

  P.lightning = function (s) {
    const g = this.M.groundAt(s.x, s.z);
    let x = s.x, y = g + 260, z = s.z;
    for (let i = 0; i < 12; i++) { const nx = x + (Math.random() - 0.5) * 22, ny = y - 260 / 12, nz = z + (Math.random() - 0.5) * 22; this.fx.lines.add(x, y, z, i === 11 ? s.x : nx, i === 11 ? g : ny, i === 11 ? s.z : nz, s.col, 0.35); x = nx; y = ny; z = nz; }
    this.fx.flash(s.x, g + 10, s.z, s.col, 12, 0.35);
    SM.Audio.thunder(Math.hypot(s.x - this.cam.x, s.z - this.cam.z) / 340);
    if (SM.WEATHER[this.weather.cur].id === 'drylight' || this.weather.cur === 'drylight' || this.weather.cur === 'ion') {
      this.near(s.x, s.z, 9, o => { if (o.alive && !o.isHQ) this.damage(o, 120, 80, null, { aoe: true }); });
      this.fx.explosion(s.x, g, s.z, 0.8, 'emp');
    }
  };

  P.syncVisuals = function (dt) {
    const time = this.time;
    const list = this.units.concat(this.dying);
    for (const u of list) {
      if (u.isHQ) continue;
      const o = u.obj, rig = u.rig, cls = u.cls;
      o.position.copy(u.pos);
      o.rotation.set(u.pitch || 0, u.yaw, u.roll || 0);
      if (!u.alive && u.dieMode !== 'wreck' && u.dieMode !== 'inf') { o.rotation.x += u.dieMode === 'sink' ? u.pitch : 0; }
      const vis = u.team === 0 || u.vis[0] || !u.alive;
      let show = vis;
      if (u.alive && u.team === 0 && u.buffs.cloak > 0) show = this.frameN % 3 !== 0;
      o.visible = show;
      if (u.ring) {
        const sel = this.selection.indexOf(u) >= 0;
        u.ring.visible = vis && (sel || u.team !== 0 || this.cam.dist < 200);
        u.ring.material = sel ? this.ringMat[2] : this.ringMat[u.team];
        u.ring.position.set(u.pos.x, (SM.isAir(cls) ? Math.max(this.M.groundAt(u.pos.x, u.pos.z), this.M.water !== null ? this.M.water : -99) : u.pos.y) + 0.35, u.pos.z);
      }
      if (!show && u.alive) continue;
      if (rig.turrets.length && cls.move !== 'heli' && cls.move !== 'plane') {
        for (let i = 0; i < rig.turrets.length; i++) {
          const t = rig.turrets[i];
          let want = u.turretYaw;
          if (t.userData.rearFacing && !u.target) want = PI;
          t.rotation.y += SM.angDiff(want, t.rotation.y) * Math.min(1, dt * 8 + (u.alive ? 0 : 0));
        }
      }
      if (rig.guns.length && cls.move !== 'plane') {
        const g = rig.guns[0];
        if (g.userData.base === undefined) g.userData.base = g.rotation.x;
        const pitch = SM.clamp(u.aimPitch || 0, -0.15, cls.move === 'heli' ? 0.1 : 0.35);
        g.rotation.x = g.userData.base - (u.def.wt === 'arty' ? 0.25 : pitch);
      }
      if (rig.torso) rig.torso.rotation.y = u.torsoYaw || 0;
      if (cls.move === 'mech') u.phase += u.speed * dt * (u.def.cls === 'titan' ? 0.3 : u.def.cls === 'lmech' ? 0.75 : 0.5);
      if (u.squad) {
        const s = Math.sin(u.yaw), c = Math.cos(u.yaw);
        for (const sd of rig.soldiers) {
          const wx = u.pos.x + sd.off[0] * c + sd.off[1] * s, wz = u.pos.z - sd.off[0] * s + sd.off[1] * c;
          sd.gy = u.jump ? 0 : this.M.groundAt(wx, wz) - u.pos.y;
        }
      }
      SM.animateUnit(rig, cls, { speed: u.alive ? u.speed : 0, recoil: u.recoil, aimPitch: u.aimPitch, firing: u.firing, phase: u.phase, boost: u.buffs.speedT > 0 }, dt, time);
      if (rig.blurs.length) for (const b of rig.blurs) b.visible = u.alive;
      // status effects
      if (u.alive && dt > 0) {
        if (u.buffs.shield > 0) {
          if (!u.shieldMesh) { u.shieldMesh = new T.Mesh(this.shieldGeo || (this.shieldGeo = new T.SphereGeometry(1, 20, 14)), this.shieldMat || (this.shieldMat = new T.MeshBasicMaterial({ color: 0x6ad8ff, transparent: true, opacity: 0.18, blending: T.AdditiveBlending, depthWrite: false }))); this.scene.add(u.shieldMesh); }
          u.shieldMesh.visible = show; u.shieldMesh.position.set(u.pos.x, u.pos.y + u.radius * 0.4, u.pos.z); u.shieldMesh.scale.setScalar(u.radius * 1.25 + Math.sin(time * 6) * 0.1);
        } else if (u.shieldMesh) { this.scene.remove(u.shieldMesh); u.shieldMesh = null; }
        if (u.buffs.stun > 0 && Math.random() < dt * 10) this.fx.sparks(u.pos.x + (Math.random() - 0.5) * u.radius, u.pos.y + 2, u.pos.z + (Math.random() - 0.5) * u.radius, 0x7ab0ff);
        if ((u.buffs.repairT > 0 || u.buffs.healT > 0 || u.repairFx > 0) && Math.random() < dt * 8) this.fx.fire.spawn(u.pos.x + (Math.random() - 0.5) * u.radius, u.pos.y + 1, u.pos.z + (Math.random() - 0.5) * u.radius, 0, 3, 0, 0.6, 1.2, 0.3, 0x7aff9a, 0.9, 0, 0);
        if (u.repairFx > 0) u.repairFx -= dt;
        if (!u.squad && u.hp < u.maxHp * 0.35 && show && Math.random() < dt * 6) this.fx.trail(u.pos.x, u.pos.y + Math.min(4, u.radius * 0.5), u.pos.z, 0x3a3634, true);
        if ((cls.move === 'wheel' || cls.move === 'track') && u.speed > 4 && show && Math.random() < dt * 5 && this.M.biome && /desert|canyon|salt|savanna|glass|steppe/.test(this.def.biome)) this.fx.dust(u.pos.x - Math.sin(u.yaw) * u.radius, u.pos.y, u.pos.z - Math.cos(u.yaw) * u.radius, 0.7, this.M.biome.low);
        if ((cls.move === 'naval' || cls.move === 'amphib' || cls.move === 'hover') && u.speed > 2 && show && Math.random() < dt * 10 && this.M.water !== null && this.M.heightAt(u.pos.x, u.pos.z) < this.M.water) this.fx.smoke.spawn(u.pos.x - Math.sin(u.yaw) * u.radius * 0.9 + (Math.random() - 0.5) * 2, this.M.water + 0.2, u.pos.z - Math.cos(u.yaw) * u.radius * 0.9 + (Math.random() - 0.5) * 2, 0, 0.3, 0, 2.5, 2, 6, 0xf2f6f8, 0.7, 0.5, 0);
        if (cls.move === 'heli' && show && u.alt > 4 && u.pos.y - this.M.groundAt(u.pos.x, u.pos.z) < 30 && Math.random() < dt * 4) this.fx.dust(u.pos.x, this.M.groundAt(u.pos.x, u.pos.z), u.pos.z, 1.4, this.M.biome.low);
      }
      if (u.isDecoy && u.alive) o.visible = this.frameN % 2 === 0 || u.team !== 0;
    }
    for (const tm of this.teams) { const h = tm.hq; for (const tr of h.turrets) { } }
    // move markers
    for (let i = this.markers.length - 1; i >= 0; i--) { this.markers[i].t += dt || 0.016; if (this.markers[i].t > 0.8) this.markers.splice(i, 1); }
  };

  // ---------------------------------------------------------------- overlay (health bars, selection box)
  P.drawOverlay = function () {
    const c = this.octx, w = this.vw, h = this.vh;
    c.clearRect(0, 0, w, h);
    const r = this.renderer.domElement.getBoundingClientRect();
    const showAll = this.cam.dist < 230;
    for (const u of this.units) {
      if (!u.alive || u.isDecoy && u.team !== 0) { if (!u.isDecoy) continue; }
      if (u.team !== 0 && !u.vis[0]) continue;
      const sel = this.selection.indexOf(u) >= 0;
      const dmg = u.hp < u.maxHp;
      if (!sel && !dmg && !u.isHQ && !(showAll && this.cam.dist < 120)) continue;
      const top = u.isHQ ? 22 : SM.isAir(u.cls) ? 3 : u.squad ? 3.2 : Math.max(3, u.radius * 0.9);
      const s = this.screenOf(u.pos, top);
      if (s.z > 1 || s.x < -50 || s.x > w + 50 || s.y < -20 || s.y > h + 20) continue;
      const bw = u.isHQ ? 90 : SM.clamp(u.radius * 900 / this.cam.dist * 0.5, 22, 70), bh = u.isHQ ? 7 : 4;
      const f = Math.max(0, u.hp / u.maxHp);
      c.fillStyle = 'rgba(8,10,14,0.75)'; c.fillRect(s.x - bw / 2 - 1, s.y - 1, bw + 2, bh + 2);
      c.fillStyle = u.team === 0 ? (f > 0.5 ? '#5ad1ff' : f > 0.25 ? '#ffd24a' : '#ff6a4a') : '#ff5b4a';
      c.fillRect(s.x - bw / 2, s.y, bw * f, bh);
      if (u.buffs && u.buffs.shield > 0) { c.fillStyle = '#9ff0ff'; c.fillRect(s.x - bw / 2, s.y - 3, bw * Math.min(1, u.buffs.shield / (u.maxHp * 0.3)), 2); }
      if (u.squad) { const n = this.aliveSoldiers(u); c.fillStyle = '#e8eef4'; for (let i = 0; i < n; i++) c.fillRect(s.x - bw / 2 + i * 5, s.y + bh + 2, 3, 3); }
      if (u.buffs && u.buffs.siege) { c.fillStyle = '#ffd36a'; c.font = '600 10px ' + SM.FONT_MONO; c.fillText('SIEGE', s.x - bw / 2, s.y - 4); }
      if (u.loiter !== undefined && u.team === 0) { c.fillStyle = '#cfe3f2'; c.font = '600 10px ' + SM.FONT_MONO; c.fillText(Math.max(0, Math.ceil(u.loiter)) + 's', s.x + bw / 2 + 4, s.y + 5); }
    }
    // markers
    for (const m of this.markers) {
      const s = this.screenOf({ x: m.x, y: this.M.groundAt(m.x, m.z), z: m.z }, 0.5);
      if (s.z > 1) continue;
      const k = m.t / 0.8;
      c.strokeStyle = '#' + ('00000' + m.col.toString(16)).slice(-6); c.globalAlpha = 1 - k; c.lineWidth = 2;
      c.beginPath(); c.ellipse(s.x, s.y, 6 + k * 18, (6 + k * 18) * 0.5, 0, 0, PI * 2); c.stroke(); c.globalAlpha = 1;
    }
    // drag box
    if (this.drag && (Math.abs(this.drag.x1 - this.drag.x) > 5 || Math.abs(this.drag.y1 - this.drag.y) > 5)) {
      const x0 = Math.min(this.drag.x, this.drag.x1) - r.left, y0 = Math.min(this.drag.y, this.drag.y1) - r.top;
      c.strokeStyle = '#8fd8ff'; c.fillStyle = 'rgba(120,200,255,0.1)'; c.lineWidth = 1;
      c.fillRect(x0, y0, Math.abs(this.drag.x1 - this.drag.x), Math.abs(this.drag.y1 - this.drag.y));
      c.strokeRect(x0 + 0.5, y0 + 0.5, Math.abs(this.drag.x1 - this.drag.x), Math.abs(this.drag.y1 - this.drag.y));
    }
    // targeting mode
    if (this.mode && this.mouse.inside) {
      const g = this.groundAt(this.mouse.x, this.mouse.y);
      if (g && this.mode.type === 'ability') {
        const rad = { smoke: 18, barrage: 20, orbital: 18, napalm: 16, carpet: 30, grenade: 6, mines: 9, torpedo: 10, jumpjets: 4, decoy: 4 }[this.mode.id] || 8;
        this.cursorRing.visible = true; this.cursorRing.position.set(g.x, g.y + 0.5, g.z); this.cursorRing.scale.setScalar(rad);
      } else this.cursorRing.visible = false;
      c.fillStyle = '#ffd36a'; c.font = '600 12px ' + SM.FONT_MONO;
      const label = this.mode.type === 'amove' ? 'ATTACK-MOVE: click a destination' : this.mode.type === 'rally' ? 'RALLY: click a point' : SM.ABILITIES[this.mode.id].name.toUpperCase() + ': click a target';
      c.fillText(label, this.mouse.x - r.left + 16, this.mouse.y - r.top + 26);
    } else this.cursorRing.visible = false;
    // hover label
    if (!this.drag && this.mouse.inside && this.frameN % 2 === 0) this.hover = this.pickUnit(this.mouse.x, this.mouse.y);
    if (this.hover && this.hover.alive && !this.drag) {
      const u = this.hover;
      c.font = '600 12px ' + SM.FONT_BODY; c.fillStyle = u.team === 0 ? '#bfe6ff' : '#ffb4aa';
      c.fillText((u.isHQ ? (u.team ? 'Enemy ' : '') + 'Headquarters' : u.def.name) + '  ' + Math.ceil(u.hp) + '/' + u.maxHp, this.mouse.x - r.left + 14, this.mouse.y - r.top - 8);
    }
  };

  // ---------------------------------------------------------------- HUD
  P.updateHUD = function () {
    const e = this.el, t0 = this.teams[0], t1 = this.teams[1];
    e.cp.textContent = Math.floor(t0.cp);
    const own = this.points.filter(p => p.owner === 0).length;
    e.inc.textContent = '+' + (8 + 3 * own).toFixed(1) + '/s';
    e.pop.textContent = t0.pop;
    e.t0.textContent = Math.max(0, Math.ceil(t0.tickets)); e.t1.textContent = Math.max(0, Math.ceil(t1.tickets));
    e.tb0.style.width = (t0.tickets / 8) + '%'; e.tb1.style.width = (t1.tickets / 8) + '%';
    const m = Math.floor(this.time / 60), s = Math.floor(this.time % 60);
    e.clock.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    this.el.pts.querySelectorAll('.pt').forEach((el, i) => {
      const p = this.points[i];
      el.className = 'pt' + (p.owner === 0 ? ' own' : p.owner === 1 ? ' foe' : '') + (p.contested ? ' contested' : '');
      el.querySelector('i').style.width = Math.abs(p.prog) + '%';
      el.querySelector('i').style.background = p.prog >= 0 ? '#46b2ff' : '#ff5b4a';
    });
    // deploy cards
    const cards = e.deploy.children;
    t0.cards.forEach((c, i) => {
      const el = cards[i]; if (!el) return;
      const why = this.canDeploy(0, c);
      el.classList.toggle('off', !!why);
      el.classList.toggle('nowater', why === 'nowater');
      const cd = el.querySelector('.dc-cd');
      cd.style.height = c.cd > 0 ? (c.cd / (8 + c.def.rank * 2) * 100) + '%' : '0';
    });
    if (this.feedDirty) {
      this.feedDirty = false;
      e.feed.innerHTML = this.feed.map(f => `<div style="color:${f.col}">${esc(f.text)}</div>`).join('');
    }
    this.renderSel();
  };
  P.hudWeather = function () {
    if (!this.el) return;
    const w = SM.WEATHER[this.weather.cur];
    this.el.weather.textContent = w.name;
    this.el.weather.title = w.desc;
  };
  P.renderSel = function () {
    const sel = this.selection.filter(u => u.alive);
    if (sel.length !== this.selection.length) { this.selection = sel; this.selDirty = true; }
    const e = this.el.sel;
    const insp = !sel.length && this.inspect && this.inspect.alive ? this.inspect : null;
    if (!sel.length && !insp) { if (e.innerHTML) e.innerHTML = ''; e.hidden = true; return; }
    e.hidden = false;
    const p = insp || this.primary();
    const key = (insp ? 'i' : '') + sel.map(u => u.id).join(',') + '|' + p.abil.map(a => (a.cd > 0 ? Math.ceil(a.cd) : 'r') + (a.id === 'entrench' && p.buffs.siege ? 's' : '')).join(',') + '|' + Math.ceil(p.hp / p.maxHp * 40);
    if (key === this.selKey && !this.selDirty) return;
    this.selKey = key; this.selDirty = false;
    const cls = p.cls;
    const ab = insp ? '' : p.abil.map((a, i) => {
      const A = SM.ABILITIES[a.id];
      const on = a.id === 'entrench' && p.buffs.siege;
      return `<button class="ab${a.cd > 0 && !on ? ' cd' : ''}${on ? ' on' : ''}" data-slot="${i}" title="${esc(A.name + ' — ' + A.desc)}"><b>${A.icon}</b><i>${'ZXCV'[i]}</i>${a.cd > 0 && !on ? '<em>' + Math.ceil(a.cd) + '</em>' : ''}</button>`;
    }).join('');
    const counts = {};
    sel.forEach(u => counts[u.def.name] = (counts[u.def.name] || 0) + 1);
    const multi = sel.length > 1 ? `<div class="sel-multi">${Object.keys(counts).map(n => `<span>${counts[n]}× ${esc(n)}</span>`).join('')}</div>` : '';
    e.innerHTML = `<div class="sel-info"><div class="sel-name">${insp ? '<span class="foe">ENEMY</span> ' : ''}${esc(p.def.name)} <small>${esc(cls.name)} · Rank ${SM.ROMAN[p.def.rank]}</small></div>
      <div class="sel-hp"><span style="width:${p.hp / p.maxHp * 100}%"></span><b>${Math.ceil(p.hp)} / ${p.maxHp}</b></div>
      <div class="sel-stats"><span>DMG ${Math.round(p.dmg)}</span><span>PEN ${Math.round(p.pen)}</span><span>ARM ${Math.round(p.armor)}</span><span>RNG ${Math.round(p.range)}</span><span>SPD ${p.maxSpeed.toFixed(1)}</span>${p.kills ? '<span>KILLS ' + p.kills + '</span>' : ''}</div>${multi}</div>
      <div class="sel-ab">${ab}</div>`;
    e.querySelectorAll('.ab').forEach(b => b.addEventListener('click', () => this.triggerAbility(+b.dataset.slot)));
  };
  P.cardTip = function (c) {
    const d = c.def, cls = SM.CLASSES[d.cls];
    const ab = SM.unitAbilities(d, c.mods).map(a => SM.ABILITIES[a].name).join(', ');
    return `<b>${esc(d.name)}</b><span>${esc(cls.name)} · Rank ${SM.ROMAN[d.rank]} · ${d.cp} CP · ${cls.pop} pop</span><p>${esc(cls.role)}</p><span>HP ${d.hp} · DMG ${d.dmg} · PEN ${d.pen} · RNG ${d.range}</span><span>Abilities: ${esc(ab)}</span>`;
  };
  P.showTip = function (el, html) {
    const t = this.el.tip; t.innerHTML = html; t.hidden = false;
    const r = el.getBoundingClientRect(), rr = this.o.root.getBoundingClientRect();
    t.style.left = Math.min(rr.width - 270, Math.max(8, r.left - rr.left)) + 'px';
    t.style.bottom = (rr.bottom - r.top + 8) + 'px';
  };
  P.hideTip = function () { this.el.tip.hidden = true; };

  SM.miniBackground = function (M, size) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'), img = ctx.createImageData(size, size), col = new T.Color(), wc = new T.Color(M.biome.water);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = Math.floor(x / size * M.V), j = Math.floor(y / size * M.V);
      SM.terrainColor(M, i, j, col);
      let r = col.r, g = col.g, b = col.b;
      const h = M.H[j * M.V + i];
      if (M.water !== null && h < M.water && !M.ice) { const t = M.lava ? 1 : SM.clamp((M.water - h) / 6, 0.45, 0.9); r = r * (1 - t) + wc.r * t; g = g * (1 - t) + wc.g * t; b = b * (1 - t) + wc.b * t; }
      const hl = M.H[j * M.V + Math.max(0, i - 1)], hu = M.H[Math.max(0, j - 1) * M.V + i];
      const sh = SM.clamp(1 + (h - hl + h - hu) * 0.06, 0.55, 1.35);
      const cell = SM.cellOf(M, -M.half + (x + 0.5) / size * M.S, -M.half + (y + 0.5) / size * M.S);
      const blk = M.blocked[cell] ? 0.55 : 1;
      const k = (y * size + x) * 4;
      img.data[k] = Math.min(255, r * 255 * sh * blk); img.data[k + 1] = Math.min(255, g * 255 * sh * blk); img.data[k + 2] = Math.min(255, b * 255 * sh * blk); img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  };

  P.drawMini = function () {
    const c = this.el.mini.getContext('2d'), S = 200, M = this.M;
    const toPx = (x, z) => [(x + M.half) / M.S * S, (z + M.half) / M.S * S];
    c.drawImage(this.miniBg, 0, 0);
    for (const p of this.points) {
      const q = toPx(p.x, p.z);
      c.beginPath(); c.arc(q[0], q[1], 7, 0, PI * 2);
      c.fillStyle = p.owner === 0 ? 'rgba(70,178,255,0.55)' : p.owner === 1 ? 'rgba(255,91,74,0.55)' : 'rgba(220,220,220,0.4)'; c.fill();
      c.strokeStyle = p.contested ? '#ffd36a' : '#fff'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#fff'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.letter, q[0], q[1] + 0.5);
    }
    for (const u of this.units) {
      if (!u.alive) continue;
      if (u.team !== 0 && !u.vis[0]) continue;
      const q = toPx(u.pos.x, u.pos.z);
      if (u.isHQ) { c.fillStyle = u.team ? '#ff5b4a' : '#46b2ff'; c.fillRect(q[0] - 5, q[1] - 5, 10, 10); c.strokeStyle = '#fff'; c.strokeRect(q[0] - 5, q[1] - 5, 10, 10); continue; }
      const sel = this.selection.indexOf(u) >= 0;
      c.fillStyle = sel ? '#ffffff' : u.team ? '#ff5b4a' : '#46b2ff';
      const sz = SM.clamp(u.radius * 0.5, 2, 5);
      if (SM.isAir(u.cls)) { c.beginPath(); c.moveTo(q[0], q[1] - sz); c.lineTo(q[0] + sz, q[1] + sz); c.lineTo(q[0] - sz, q[1] + sz); c.fill(); }
      else c.fillRect(q[0] - sz / 2, q[1] - sz / 2, sz, sz);
    }
    if (this.teams[0].rally) { const q = toPx(this.teams[0].rally.x, this.teams[0].rally.z); c.strokeStyle = '#7affd8'; c.beginPath(); c.arc(q[0], q[1], 4, 0, PI * 2); c.stroke(); }
    // camera footprint
    const corners = [[0, 0], [this.vw, 0], [this.vw, this.vh], [0, this.vh]].map(([x, y]) => {
      const ndc = new T.Vector2(x / this.vw * 2 - 1, -(y / this.vh) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      const ry = this.raycaster.ray; const gy = this.M.groundAt(this.cam.x, this.cam.z);
      let t = (gy - ry.origin.y) / ry.direction.y; if (!(t > 0)) t = 900; t = Math.min(t, 900);
      return toPx(ry.origin.x + ry.direction.x * t, ry.origin.z + ry.direction.z * t);
    });
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1; c.beginPath(); corners.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); c.stroke();
  };
})();
