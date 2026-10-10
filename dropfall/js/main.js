// Dropfall — boot, main loop, input.
'use strict';
(function () {
  const S = DF.Sim, R = DF.Render, A = DF.Audio;
  const Main = DF.Main = {};
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, right: false, pressed: false, released: false };
  const once = { dive: false, reload: false, nade: false, stim: false, interact: false, pack: false, swap: null, cycle: false, drop: false };
  let running = false, paused = false, showMap = false, last = 0, acc = 0, qHeld = false;
  const DIR = { KeyW: 'U', KeyS: 'D', KeyA: 'L', KeyD: 'R', ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' };
  const $ = s => document.querySelector(s);

  Main.startMission = function (opts) {
    A.init(); A.setVol(DF.Hub.get().settings.vol);
    S.start(opts);
    $('#hub').hidden = true; $('#drop').hidden = true; $('#results').hidden = true; $('#game').hidden = false; $('#pause').hidden = true;
    running = true; paused = false; showMap = false; acc = 0; keys.clear(); mouse.down = mouse.right = false;
    const P = DF.G.player; DF.G.cam.x = P.x; DF.G.cam.y = P.y; DF.G.cam.z = 0;
  };
  Main.isRunning = () => running;

  function openMenu(byQ) { const g = DF.G; if (!g || !g.player.alive || g.codeTask || g.player.veh) return; if (!g.menu) { g.menu = true; g.code = ''; g.menuByQ = byQ; } }
  function closeMenu() { const g = DF.G; if (g) { g.menu = false; g.code = ''; } }

  function onKey(e, down) {
    if (!running) return;
    const c = e.code, g = DF.G;
    if (down && (c === 'Tab' || c.startsWith('Arrow') || c === 'Space' || (e.ctrlKey && DIR[c]))) e.preventDefault();
    if (down && c === 'Escape') {
      if (g.codeTask) { g.codeTask = null; return; }
      if (g.menu) { closeMenu(); return; }
      if (showMap) { showMap = false; return; }
      togglePause(); return;
    }
    if (paused) return;
    if (down) {
      if (e.repeat && c !== 'KeyQ') return;
      keys.add(c);
      // code entry for terminals
      if (g.codeTask && DIR[c]) { S.taskInput(DIR[c]); return; }
      if (c === 'KeyQ' || c === 'ControlLeft' || c === 'ControlRight') { if (!e.repeat) { qHeld = true; openMenu(c === 'KeyQ'); } return; }
      if (g.menu && DIR[c] && (g.menuByQ || c.startsWith('Arrow') || e.ctrlKey)) { S.callInput(DIR[c]); return; }
      if (g.menu && c.startsWith('Arrow')) { S.callInput(DIR[c]); return; }
      switch (c) {
        case 'Space': once.dive = true; break;
        case 'KeyR': once.reload = true; break;
        case 'KeyG': if (g.player.carrying) once.drop = true; else once.nade = true; break;
        case 'KeyF': once.stim = true; break;
        case 'KeyE': once.interact = true; break;
        case 'KeyB': once.pack = true; break;
        case 'Digit1': once.swap = 0; break;
        case 'Digit2': once.swap = 1; break;
        case 'Digit3': once.swap = 2; break;
        case 'KeyM': case 'Tab': showMap = !showMap; break;
      }
    } else {
      keys.delete(c);
      if (c === 'KeyQ' || c === 'ControlLeft' || c === 'ControlRight') { qHeld = false; closeMenu(); }
    }
  }

  function togglePause() {
    paused = !paused; $('#pause').hidden = !paused;
    if (paused) { const g = DF.G; $('#pauseInfo').textContent = g.M.planet.name + ' · ' + DF.World.missionName(g.opts.type, g.M.faction) + ' · ' + DF.DIFFS[g.M.diff - 1].name; }
  }
  Main.togglePause = togglePause;

  function input() {
    const g = DF.G, P = g.player;
    let mx = 0, my = 0;
    const wasdFree = !(g.menu && g.menuByQ) && !g.codeTask;
    if (wasdFree) { if (keys.has('KeyW')) my -= 1; if (keys.has('KeyS')) my += 1; if (keys.has('KeyA')) mx -= 1; if (keys.has('KeyD')) mx += 1; }
    const w = R.screenToWorld(mouse.x, mouse.y);
    const inp = {
      mx, my, aimX: w.x, aimY: w.y, fire: mouse.down, firePressed: mouse.pressed, fireReleased: mouse.released, aimDown: mouse.right,
      sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'), dive: once.dive, reload: once.reload, nade: once.nade, stim: once.stim,
      interact: once.interact, pack: once.pack, swap: once.swap, cycle: once.cycle, drop: once.drop, menuByQ: g.menuByQ
    };
    for (const k in once) once[k] = k === 'swap' ? null : false;
    mouse.pressed = false; mouse.released = false;
    return inp;
  }

  function frame(t) {
    requestAnimationFrame(frame);
    if (!running) { last = t; return; }
    let dt = Math.min(0.1, (t - last) / 1000); last = t;
    const g = DF.G;
    if (!paused) {
      acc += dt;
      const step = 1 / 60;
      let n = 0;
      while (acc >= step && n < 5) { const inp = input(); S.step(step, inp); acc -= step; n++; if (g.ended) break; }
      if (n === 5) acc = 0;
      R.updateCamera(dt, mouse);
    }
    R.draw(mouse, showMap);
    if (g.ended && running) {
      running = false;
      const res = g.result;
      setTimeout(() => DF.Hub.results(res), 1200);
    }
  }

  Main.abandon = function () { if (!DF.G) return; paused = false; $('#pause').hidden = true; S.end(false, 0); };

  Main.boot = function () {
    const cv = $('#cv');
    R.init(cv);
    window.addEventListener('resize', () => R.resize());
    window.addEventListener('keydown', e => onKey(e, true));
    window.addEventListener('keyup', e => onKey(e, false));
    window.addEventListener('blur', () => { keys.clear(); mouse.down = mouse.right = false; if (running) closeMenu(); });
    cv.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    cv.addEventListener('mousedown', e => { A.init(); mouse.x = e.clientX; mouse.y = e.clientY; if (e.button === 0) { mouse.down = true; mouse.pressed = true; } if (e.button === 2) mouse.right = true; });
    window.addEventListener('mouseup', e => { if (e.button === 0) { if (mouse.down) mouse.released = true; mouse.down = false; } if (e.button === 2) mouse.right = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { if (running) { once.cycle = true; e.preventDefault(); } }, { passive: false });
    $('#resume').onclick = togglePause;
    $('#abandon').onclick = () => Main.abandon();
    DF.Hub.load();
    A.vol = DF.Hub.get().settings.vol;
    const s = DF.Hub.get();
    $('#tStart').textContent = s.stats.missions ? 'Return to the ship' : 'Enlist';
    $('#tStart').onclick = () => { A.init(); A.play('ui'); DF.Hub.show('war'); };
    if ('ontouchstart' in window && window.innerWidth < 900) $('#touchNote').hidden = false;
    if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ save: DF.Hub.get() }));
    requestAnimationFrame(t => { last = t; frame(t); });
  };

  const start = () => Main.boot();
  if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start); else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
