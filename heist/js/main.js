'use strict';
// Boot and the frame loop.

H.booted = false;
H.boot = function () {
  if (H.booted) { H.lock(); return; }
  H.booted = true;
  H.audio.init(); H.music.start();
  H.game.init();
  H.lock();
  setTimeout(() => H.ui.toast('Welcome to ' + H.CITY_NAME, 'Your safehouse is behind you. Press P for contracts, or walk up to a green marker.'), 600);
};

H.init = function () {
  H.initRenderer();
  H.makeTextures();
  H.fx.init();
  H.buildCity();
  H.buildSites();
  H.nav.build(H.city.SIZE + 220, -50);
  H.loadSave();
  H.makePlayer(); H.calcMods(); H.P.detect = 30;
  H.ui.init();
  document.getElementById('loading').hidden = true;
  H.ui.openTitle();
  H.renderer.domElement.addEventListener('click', () => { if (!H.ui.menuOpen && H.game.state === 'city') H.lock(); });
  let last = performance.now();
  const frame = now => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; H.dt = dt;
    if (H.game.state === 'city' && !H.ui.menuOpen) {
      H.game.update(dt);
    } else if (H.game.state === 'title') {
      // slow flyover of the city behind the title screen
      H.t += dt; H.updateSky(dt * 0.3);
      const a = H.t * 0.03, C = H.city;
      H.camera.position.set(C.SIZE / 2 + Math.cos(a) * 320, 120, C.SIZE / 2 + Math.sin(a) * 320);
      H.camera.lookAt(C.SIZE / 2 + 80, 10, C.SIZE / 2);
      for (const c of H.cars) c.update(dt);
    }
    H.music.update();
    if (H.game.state === 'city') H.ui.updateHUD();
    const r = H.renderer;
    if (H.game.state === 'city' && H.P && !H.P.inCar && !H.ui.menuOpen) H.renderScope();
    r.clear(); r.render(H.scene, H.camera);
    if (H.game.state === 'city' && H.P && !H.P.inCar && !H.ui.menuOpen) { r.clearDepth(); r.render(H.vmScene, H.vmCamera); }
    H.endFrameInput();
  };
  requestAnimationFrame(frame);
};

// radio stations reuse the score's modes
const setMusic = H.music.set.bind(H.music);
H.music.set = function (m) {
  if (m === 'radio') { const st = ['off', 'city', 'stealth', 'assault'][H.radioIdx]; this.radio = true; return setMusic(st); }
  this.radio = false; return setMusic(m);
};
const playMusic = H.music.play.bind(H.music);
H.music.play = function (s, t) { if (this.mode === 'off') return; return playMusic(s, t); };

addEventListener('load', () => {
  try { H.init(); }
  catch (e) { console.error(e); const l = document.getElementById('loading'); l.hidden = false; l.textContent = 'Could not start: ' + e.message; }
});
