'use strict';
// ============================================================================
// Game — boot, match setup and the frame loop.
// ============================================================================

R.inMatch = false;
R.thirdPerson = false;
R.player = null;
R.bots = [];

/* ============================== match setup ============================== */

R.startMatch = function (cfg) {
  const mode = R.modeById(cfg.mode) || R.MODES[0];
  R.loadMap(cfg.map);
  R.combat.reset();
  R.bots.length = 0;
  R.player = null;

  const save = R.save.data;
  const loadout = Object.assign({ primary: 'rifle', secondary: null, melee: 'fists' }, save.loadout);
  // Never field a weapon that is not owned.
  for (const k of ['primary', 'secondary', 'melee']) {
    if (loadout[k] && !R.save.owns(loadout[k])) loadout[k] = k === 'melee' ? 'fists' : (k === 'primary' ? 'rifle' : null);
  }

  const teamMode = mode.teams;
  const perTeam = cfg.size;
  const total = teamMode ? perTeam * 2 : cfg.size;

  R.player = new R.Player({
    name: save.name || 'You',
    team: teamMode ? 'blue' : 'blue',
    loadout, skin: save.skin, charm: save.charm,
  });
  R.player.baseLoadout = Object.assign({}, loadout);

  // Bots: fill the roster, alternating teams, with distinct names.
  const names = R.BOT_NAMES.slice();
  for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
  const ffaColors = ['red', 'green', 'yellow', 'red', 'green', 'yellow'];
  for (let i = 0; i < total - 1; i++) {
    const team = teamMode
      ? (i < perTeam ? 'red' : 'blue')
      : ffaColors[i % ffaColors.length];
    const lo = Object.assign({}, R.pick(R.BOT_LOADOUTS));
    const bot = new R.Bot({
      name: names[i % names.length], team, diff: cfg.diff, loadout: lo,
      skin: Math.random() < 0.3 ? R.pick(R.SKINS).id : 'default',
      charm: Math.random() < 0.25 ? R.pick(R.CHARMS).id : 'none',
    });
    bot.baseLoadout = Object.assign({}, lo);
    R.bots.push(bot);
  }

  R.modes.start(cfg);
  R.inMatch = true;
  R.ui.cfg = Object.assign({}, cfg);
  R.ui.el.matchend.hidden = true;
  R.ui.closeMenu();
  R.thirdPerson = false;
};

/* ================================= loop ================================= */

let last = performance.now(), fpsAcc = 0, fpsN = 0, fpsShown = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;                       // a tab coming back should not teleport anyone
  if (dt <= 0) dt = 1 / 60;

  const paused = R.ui.menuOpen || R.modes.state === 'matchover';
  R.dt = paused ? 0 : dt;
  if (!paused) R.t += dt;
  R.frame++;

  if (R.inMatch && !paused) {
    R.modes.update(dt);
    const live = R.modes.state === 'live' || R.modes.state === 'roundover';
    // During the countdown the players can move but not shoot.
    if (R.player) {
      if (!live) { R.input.mouse[0] = false; }
      R.player.update(dt);
    }
    for (const b of R.bots) {
      if (!live) { b.wish.fire = false; }
      b.update(dt);
      if (!live) b.wish.fire = false;
    }
    R.updateProjectiles(dt);
  } else if (R.inMatch && R.player) {
    // Menu open: keep the camera alive so the world still reads behind it.
    R.player.updateCamera(0.0001);
  }

  R.shake = Math.max(0, R.shake - dt * 2.6);
  R.fx.update(paused ? 0.0001 : dt);
  R.decals.update();
  R.tracers.update();
  R.updateRagdolls(paused ? 0.0001 : dt);
  R.ui.update(dt);

  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.4) {
    fpsShown = Math.round(fpsN / fpsAcc);
    fpsAcc = 0; fpsN = 0;
    if (R.settings.showFps) R.ui.el.fps.textContent = fpsShown + ' fps';
  }

  R.endFrameInput();
  R.render();
}

/* ================================= boot ================================= */

R.boot = function () {
  R.save.load();
  R.initRenderer();
  R.buildTextures();
  R.fx.init();
  R.decals.init();
  R.tracers.init();
  R.initInput(R.renderer.domElement);
  R.audio.setVolume(R.settings.volume);
  R.ui.init();

  // A quiet lobby backdrop so the menu is not sitting on a black void.
  R.loadMap('arena');
  R.camera.position.set(0, 14, 110);
  R.camera.lookAt(0, 8, 0);
  R.scene.fog = new THREE.FogExp2(new THREE.Color('#9fd8f4'), 0.0024);

  const loading = document.getElementById('loading');
  if (loading) loading.hidden = true;
  R.ui.openMenu('play');

  // The lobby camera drifts, which also proves the renderer is alive.
  let lobbyT = 0;
  (function lobby() {
    if (!R.inMatch) {
      lobbyT += 0.0025;
      R.camera.position.set(Math.sin(lobbyT) * 118, 22 + Math.sin(lobbyT * 0.7) * 6, Math.cos(lobbyT) * 118);
      R.camera.lookAt(0, 6, 0);
      R.camera.rotation.z = 0;
    }
    requestAnimationFrame(lobby);
  })();

  requestAnimationFrame(frame);

  // Keep progress across a published-artifact hot update.
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) {
    hot.snapshot(() => ({ save: R.save.data, cfg: R.ui.cfg }));
    const prev = hot.data;
    if (prev && prev.save) {
      R.save.data = Object.assign(R.save.defaults(), prev.save);
      if (prev.cfg) R.ui.cfg = prev.cfg;
      R.ui.refreshMenu();
    }
  }
};

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => R.boot());
else R.boot();
