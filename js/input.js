// ============================================================================
// Input: keyboard, mouse with pointer lock, wheel (PC only).
// ============================================================================
'use strict';
(function () {
const G = window.G;
const I = G.Input = { keys: {}, edge: {}, mb: [false, false, false], mbEdge: [false, false, false], dx: 0, dy: 0, lastDx: 0, lastDy: 0, wheel: 0, locked: false, touch: false, tv: { f: 0, r: 0 }, tbtn: {}, tEdge: {} };
const MAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };

I.init = function (canvas) {
  I.canvas = canvas;
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (!I.keys[e.code]) I.edge[e.code] = true;
    I.keys[e.code] = true;
    if (G.Game.mode !== 'menu' && ['Space', 'Tab', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape' || e.code === 'KeyP') G.UI.onEscape(e.code);
    if (e.code === 'F1' && G.Game.mode !== 'menu') { e.preventDefault(); G.UI.toggleHelp(); }
  });
  window.addEventListener('keyup', e => { I.keys[e.code] = false; });
  window.addEventListener('blur', () => { I.keys = {}; I.mb = [false, false, false]; });
  canvas.addEventListener('mousedown', e => {
    if (G.Game.mode === 'menu' || G.Game.state !== 'play') return;
    if (!I.locked && !I.touch) { I.lock(); return; }
    I.mb[e.button] = true; I.mbEdge[e.button] = true; e.preventDefault();
  });
  window.addEventListener('mouseup', e => { I.mb[e.button] = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('mousemove', e => { if (I.locked) { I.dx += e.movementX || 0; I.dy += e.movementY || 0; } });
  window.addEventListener('wheel', e => { if (I.locked) I.wheel += Math.sign(e.deltaY); }, { passive: true });
  document.addEventListener('pointerlockchange', () => {
    const was = I.locked; I.locked = document.pointerLockElement === canvas;
    if (was && !I.locked && G.Game.mode !== 'menu' && G.Game.state === 'play' && !I.touch && !G.Game.lootOpen) G.UI.pause(true);
  });
};
I.lock = function () { try { const p = I.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
I.unlock = function () { try { document.exitPointerLock(); } catch (e) {} };
function k(c) { return !!I.keys[c]; }
function e(c) { const v = !!I.edge[c]; return v; }
// Build the per-frame input snapshot; consumes edges
I.frame = function () {
  const t = I.tv;
  const f = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0) + t.f;
  const r = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0) + t.r;
  const tb = I.tbtn, te = I.tEdge;
  const out = {
    f: Math.max(-1, Math.min(1, f)), r: Math.max(-1, Math.min(1, r)),
    dx: I.dx, dy: I.dy,
    sprint: k('ShiftLeft') || k('ShiftRight') || tb.sprint,
    jump: e('Space') || te.jump, jumpHeld: k('Space'), downHeld: k('KeyC') || k('ControlLeft'),
    crouch: e('KeyC') || e('ControlLeft') || te.crouch, prone: e('KeyZ') || te.prone,
    leanL: k('KeyQ'), leanR: k('KeyE'),
    fire: I.mb[0] || tb.fire, firePressed: I.mbEdge[0] || te.fire,
    ads: I.mb[2] || tb.ads,
    reload: e('KeyR') || te.reload, inspect: e('KeyF'), drop: e('KeyK'), expUse: e('Digit3'), expNext: e('Digit4'), melee: e('KeyV'), gl: e('KeyG'), mode: e('KeyB') || te.mode, light: e('KeyL'),
    zeroUp: e('BracketRight') || e('PageUp'), zeroDown: e('BracketLeft') || e('PageDown'), bipod: e('KeyX'),
    fly: e('KeyN'), menu: e('KeyT'), reset: e('KeyY'), nvg: e('KeyJ'),
    altSight: e('KeyH'), stockT: e('KeyO'), supT: e('KeyU'), kitInfo: e('KeyI'),
  };
  if (e('Digit1')) out.swap = 0; if (e('Digit2')) out.swap = 1;
  const PZ = G.Game.player, WZ = PZ && PZ.W;
  if (I.wheel !== 0 && PZ && PZ.scoped && WZ && WZ.S.zmin) { out.zoomStep = -Math.sign(I.wheel); I.wheel = 0; }
  if (I.wheel !== 0 && G.Game.player) { out.swap = (G.Game.player.cur + 1) % Math.max(1, G.Game.player.weapons.length); I.wheel = 0; }
  if (te.swap && G.Game.player) out.swap = (G.Game.player.cur + 1) % Math.max(1, G.Game.player.weapons.length);
  I.lastDx = I.dx; I.lastDy = I.dy;
  I.dx = 0; I.dy = 0; I.edge = {}; I.mbEdge = [false, false, false]; I.tEdge = {};
  return out;
};
I.clear = function () { I.keys = {}; I.edge = {}; I.mb = [false, false, false]; I.dx = I.dy = 0; };

})();
