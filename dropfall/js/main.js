// Dropfall — boot, main loop, first-person input and camera.
'use strict';
(function () {
  const S = DF.Sim, R = DF.Render, A = DF.Audio, U = DF.U;
  const Main = DF.Main = {};
  const keys = new Set();
  const mouse = { down: false, right: false, pressed: false, released: false };
  const once = { dive: false, reload: false, nade: false, stim: false, interact: false, pack: false, swap: null, cycle: false, drop: false };
  const cam = { x: 0, y: 0, z: 0, yaw: 0, pitch: -0.1, roll: 0, fov: 75 };
  const look = { dx: 0, dy: 0 };
  let running = false, paused = false, showMap = false, last = 0, acc = 0, locked = false, gl, overlay, ended = false;
  let deathT = 0, camBob = 0;
  const DIR = { KeyW: 'U', KeyS: 'D', KeyA: 'L', KeyD: 'R', ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' };
  const $ = s => document.querySelector(s);

  Main.startMission = function (opts) {
    A.init(); A.setVol(DF.Hub.get().settings.vol);
    S.start(opts);
    $('#hub').hidden = true; $('#drop').hidden = true; $('#results').hidden = true; $('#game').hidden = false; $('#pause').hidden = true;
    running = true; paused = false; showMap = false; acc = 0; ended = false; keys.clear(); mouse.down = mouse.right = false;
    const P = DF.G.player;
    // face the nearest objective on landing
    const o = DF.G.M.objectives[0];
    const a = Math.atan2(o.y - P.y, o.x - P.x);
    cam.yaw = -a - Math.PI / 2; cam.pitch = -0.08; deathT = 0;
    DF.View.setArmor(P.arm);
    DF.Gfx.build(DF.G);
    R.fps = true;
    requestLock();
  };
  Main.isRunning = () => running;
  Main.cam = cam;

  function requestLock() { try { const p = gl.requestPointerLock && gl.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }

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
      if (g.codeTask && DIR[c]) { S.taskInput(DIR[c]); return; }
      if (c === 'KeyQ' || c === 'ControlLeft' || c === 'ControlRight') { if (!e.repeat) openMenu(c === 'KeyQ'); return; }
      if (g.menu && DIR[c] && (g.menuByQ || c.startsWith('Arrow') || e.ctrlKey)) { S.callInput(DIR[c]); return; }
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
      if (c === 'KeyQ' || c === 'ControlLeft' || c === 'ControlRight') closeMenu();
    }
  }

  function togglePause() {
    paused = !paused; $('#pause').hidden = !paused;
    if (paused) { const g = DF.G; $('#pauseInfo').textContent = g.M.planet.name + ' · ' + DF.World.missionName(g.opts.type, g.M.faction) + ' · ' + DF.DIFFS[g.M.diff - 1].name; try { document.exitPointerLock && document.exitPointerLock(); } catch (e) { } }
    else requestLock();
  }
  Main.togglePause = togglePause;

  // forward direction on the ground, in sim coordinates
  function fwd() { return { x: -Math.sin(cam.yaw), y: -Math.cos(cam.yaw) }; }

  function input() {
    const g = DF.G, P = g.player;
    const f = fwd(), r = { x: Math.cos(cam.yaw), y: -Math.sin(cam.yaw) };
    let fi = 0, si = 0;
    const wasdFree = !(g.menu && g.menuByQ) && !g.codeTask;
    if (wasdFree) { if (keys.has('KeyW')) fi += 1; if (keys.has('KeyS')) fi -= 1; if (keys.has('KeyA')) si -= 1; if (keys.has('KeyD')) si += 1; }
    let mx = f.x * fi + r.x * si, my = f.y * fi + r.y * si;
    if (P.veh && P.veh.vt === 'buggy') { mx = si; my = -fi; }
    // aim point: where the view ray meets the ground, never closer than 60 units
    const eyeH = cam.y - DF.Gfx.h(P.x, P.y);
    let dist = cam.pitch < -0.02 ? eyeH / Math.tan(-cam.pitch) : 2000;
    dist = U.clamp(dist, 60, 2000);
    const ax = P.x + f.x * dist, ay = P.y + f.y * dist;
    P.firing = mouse.down;
    const inp = {
      mx, my, aimX: ax, aimY: ay, fire: mouse.down, firePressed: mouse.pressed, fireReleased: mouse.released, aimDown: mouse.right,
      sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'), dive: once.dive, reload: once.reload, nade: once.nade, stim: once.stim,
      interact: once.interact, pack: once.pack, swap: once.swap, cycle: once.cycle, drop: once.drop, menuByQ: g.menuByQ
    };
    for (const k in once) once[k] = k === 'swap' ? null : false;
    mouse.pressed = false; mouse.released = false;
    return inp;
  }

  // ---------------------------------------------------------------- camera
  function updateCamera(g, dt) {
    const P = g.player, X = DF.Gfx, set = DF.Hub.get().settings;
    let x = P.x, z = P.y, y, roll = 0;
    const baseFov = set.fov || 75;
    let fov = baseFov;
    const w = P.weapons[P.cur];
    if (P.alive && !P.veh) {
      deathT = 0;
      const sp = Math.hypot(P.vx, P.vy);
      camBob += sp * dt * 0.06;
      const low = (P.proneT > 0 || P.diveT > 0) ? 1 : 0;
      cam.low = (cam.low || 0) + (low - (cam.low || 0)) * Math.min(1, dt * 10);
      y = X.h(x, z) + X.EYE - cam.low * 20 + Math.sin(camBob * 2) * 0.8 * Math.min(1, sp / 150);
      if (P.jumping > 0) y += Math.sin(Math.min(1, (0.5 - P.jumping) / 0.5) * Math.PI) * 60;
      roll = -Math.sin(camBob) * 0.006 * Math.min(1, sp / 150) + (P.diveT > 0 ? 0.08 : 0);
      if (P.aimDown && w && !P.sprinting) fov = /Marksman|Anti-Materiel|Railgun/.test(w.d.cls) || w.id === 'mr2' ? 28 : baseFov * 0.72;
      if (P.sprinting) fov += 6;
    } else if (P.alive && P.veh) {
      const v = P.veh;
      if (v.vt === 'buggy') {
        const f = fwd();
        x = v.x - f.x * 140; z = v.y - f.y * 140; y = X.h(v.x, v.y) + 70 - cam.pitch * 60;
      } else { x = v.x + Math.cos(v.aim) * 6; z = v.y + Math.sin(v.aim) * 6; y = X.h(v.x, v.y) + 66; if (P.aimDown) fov = baseFov * 0.8; }
    } else if (P.arriving) {
      const pod = g.pods.find(p => p.payload.diver === P);
      if (pod) { const k = pod.t / pod.T, h = k * k * 1400; x = pod.x + h * 0.25; z = pod.y; y = X.h(pod.x, pod.y) + h + 30; fov = baseFov + 15 * k; cam.pitch = U.lerp(cam.pitch, -0.6 * k - 0.08, Math.min(1, dt * 3)); }
      else y = X.h(x, z) + X.EYE;
    } else {
      // killed: sink to the ground and tip over
      deathT += dt;
      const k = Math.min(1, deathT / 0.8);
      y = X.h(x, z) + X.EYE * (1 - k) + 5 * k; roll = k * 0.7; cam.pitch = U.lerp(cam.pitch, -0.25, Math.min(1, dt * 2));
    }
    // shake
    const sh = Math.min(14, g.shake);
    if (sh > 0.3) { x += U.rand(-1, 1) * sh * 0.35; y += U.rand(-1, 1) * sh * 0.35; z += U.rand(-1, 1) * sh * 0.35; }
    cam.x = x; cam.y = y; cam.z = z; cam.roll = roll;
    cam.fov = U.lerp(cam.fov, fov, Math.min(1, dt * 12));
    R.facing = Math.atan2(fwd().y, fwd().x);
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
    }
    updateCamera(g, paused ? 0 : dt);
    DF.Gfx.frame(g, cam, paused ? 0 : dt);
    DF.View.render(DF.Gfx.renderer, g, look, paused ? 0 : dt);
    look.dx *= 0.5; look.dy *= 0.5;
    R.drawOverlay(g, showMap, locked || paused);
    if (g.ended && !ended) {
      ended = true;
      const res = g.result;
      setTimeout(() => { running = false; try { document.exitPointerLock(); } catch (e) { } DF.Hub.results(res); }, 1500);
    }
  }

  // test hook: advance the simulation without waiting for real frames, then draw once
  Main.debugStep = function (sec, inpFn) {
    const g = DF.G, n = Math.round(sec * 60);
    for (let i = 0; i < n && !g.ended; i++) { const inp = input(); if (inpFn) Object.assign(inp, inpFn(i, inp)); S.step(1 / 60, inp); updateCamera(g, 1 / 60); }
    DF.Gfx.frame(g, cam, 1 / 60); DF.View.render(DF.Gfx.renderer, g, look, Math.min(0.4, sec)); R.drawOverlay(g, showMap, true);
  };
  Main.setPaused = v => { if (v !== paused) togglePause(); document.querySelector('#pause').hidden = true; };

  Main.abandon = function () { if (!DF.G) return; paused = false; $('#pause').hidden = true; S.end(false, 0); };

  Main.boot = function () {
    gl = $('#gl'); overlay = $('#cv');
    R.init(overlay);
    try { DF.Gfx.init(gl); DF.View.init(); } catch (e) { $('#noGL').hidden = false; console.error(e); }
    window.addEventListener('resize', () => R.resize());
    window.addEventListener('keydown', e => onKey(e, true));
    window.addEventListener('keyup', e => onKey(e, false));
    window.addEventListener('blur', () => { keys.clear(); mouse.down = mouse.right = false; if (running) closeMenu(); });
    const game = $('#game');
    game.addEventListener('mousedown', e => {
      if (!running) return;
      A.init();
      if (paused) return;
      if (!locked) requestLock();
      if (e.button === 0) { mouse.down = true; mouse.pressed = true; }
      if (e.button === 2) mouse.right = true;
    });
    window.addEventListener('mouseup', e => { if (e.button === 0) { if (mouse.down) mouse.released = true; mouse.down = false; } if (e.button === 2) mouse.right = false; });
    window.addEventListener('mousemove', e => {
      if (!running || paused) return;
      const sens = 0.0022 * (DF.Hub.get().settings.sens || 1) * (cam.fov / 75);
      const dx = e.movementX || 0, dy = e.movementY || 0;
      if (Math.abs(dx) > 300 || Math.abs(dy) > 300) return; // ignore pointer-lock jump spikes
      cam.yaw -= dx * sens; cam.pitch = U.clamp(cam.pitch - dy * sens, -1.45, 1.2);
      look.dx += dx; look.dy += dy;
    });
    document.addEventListener('pointerlockchange', () => {
      const was = locked; locked = document.pointerLockElement === gl;
      if (was && !locked && running && !paused && !ended) togglePause();
    });
    game.addEventListener('contextmenu', e => e.preventDefault());
    game.addEventListener('wheel', e => { if (running) { once.cycle = true; e.preventDefault(); } }, { passive: false });
    $('#resume').onclick = () => { togglePause(); };
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
