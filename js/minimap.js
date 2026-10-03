// ============================================================================
// Minimap: M opens / closes it, Shift+M switches between the local area
// (180 m around you) and the whole map. North is up. It shows every structure
// and piece of cover from the map's own colliders (tall buildings and walls
// light, low cover darker, floors and quays faint), your position and facing,
// the extraction points in a raid (green open, amber conditional, red closed,
// with names; off-screen ones sit on the edge pointing the way) and the
// objective structure in a mission or the main structure in a raid.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const MM = G.Minimap = { on: true, full: false, layer: null, key: '' };
try { const s = JSON.parse(localStorage.getItem('ironsight.minimap') || 'null'); if (s) { MM.on = !!s.on; MM.full = !!s.full; } } catch (e) {}
const save = () => { try { localStorage.setItem('ironsight.minimap', JSON.stringify({ on: MM.on, full: MM.full })); } catch (e) {} };

window.addEventListener('keydown', e => {
  if (e.code !== 'KeyM' || e.repeat) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  const Gm = G.Game; if (!Gm || Gm.mode === 'menu' || Gm.mode === 'range' || !Gm.player) return;
  if (e.shiftKey) { MM.full = !MM.full; MM.on = true; } else MM.on = !MM.on;
  save(); G.UI.toast(MM.on ? (MM.full ? 'Map: whole area (Shift+M for local)' : 'Minimap on (Shift+M for the whole area)') : 'Minimap off', 1.2);
});

// draw the map's structures once per map into an offscreen layer
function buildLayer() {
  const W = G.E.world, B = W.bounds, S = 1024, k = S / (2 * B), base = W.baseHeight || 0;
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = 'rgba(16,18,14,.82)'; x.fillRect(0, 0, S, S);
  const items = [];
  for (const col of W.colliders) {
    if (col.noMove || col.see) continue;
    const w = col.max.x - col.min.x, d = col.max.z - col.min.z, h = col.max.y - col.min.y;
    if (w > 2 * B * .9 || d > 2 * B * .9) continue; // map borders
    if (col.max.y < base + .35 || (w < .25 && d < .25)) continue;
    const floor = w * d > 250 && h < 4 && col.max.y < base + 4.5; // quays, decks, platforms
    const tier = floor ? 0 : h > 2.2 ? 3 : h > 1.1 ? 2 : 1;
    items.push([tier, col.min.x, col.min.z, w, d]);
  }
  items.sort((a, b) => a[0] - b[0]);
  const COL = ['#34372e', '#5a5a4c', '#8a876f', '#d2cbb0'];
  for (const [t, x0, z0, w, d] of items) { x.fillStyle = COL[t]; x.fillRect((x0 + B) * k, (z0 + B) * k, Math.max(1, w * k), Math.max(1, d * k)); }
  // grid every 100 m
  x.strokeStyle = 'rgba(230,197,114,.10)'; x.lineWidth = 1;
  for (let m = -Math.floor(B / 100) * 100; m <= B; m += 100) { const p = (m + B) * k; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, S); x.moveTo(0, p); x.lineTo(S, p); x.stroke(); }
  return { c, k, B, S };
}
// the objective / main structure box, if the map has one
function coreBox() {
  const Gm = G.Game;
  const M = Gm.raid ? (Gm.raid.Mp.core && G.MISSION[Gm.raid.Mp.core]) : Gm.mission && Gm.mission.M && Gm.mission.M.guards ? Gm.mission.M : null;
  if (!M || !M.guards || !M.guards.length) return null;
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const g of M.guards) { x0 = Math.min(x0, g[0]); z0 = Math.min(z0, g[2]); x1 = Math.max(x1, g[0]); z1 = Math.max(z1, g[2]); }
  return { x0: x0 - 4, z0: z0 - 4, x1: x1 + 4, z1: z1 + 4, label: Gm.raid ? 'MAIN STRUCTURE' : 'OBJECTIVE' };
}

MM.update = function () {
  const Gm = G.Game, P = Gm.player;
  let cv = document.getElementById('mmap');
  const show = MM.on && P && G.E.world && Gm.mode !== 'menu' && Gm.mode !== 'range' && (Gm.state === 'play' || Gm.state === 'pause');
  if (!show) { if (cv) cv.style.display = 'none'; return; }
  const hud = document.getElementById('hud'); if (!hud || hud.hidden) { if (cv) cv.style.display = 'none'; return; }
  const size = MM.full ? Math.min(340, Math.round(window.innerHeight * .46)) : Math.min(210, Math.round(window.innerHeight * .28));
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'mmap'; cv.style.cssText = 'position:absolute;left:18px;top:18px;border:1px solid rgba(230,197,114,.45);border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,.5);pointer-events:none;z-index:4'; }
  if (cv.parentNode !== hud) hud.appendChild(cv);
  cv.style.display = 'block';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== size * dpr) { cv.width = cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px'; }
  if (Gm.frame % 2) return;
  const key = (G.E.map && G.E.map.id) + ':' + G.E.world.colliders.length + ':' + G.E.world.bounds;
  if (MM.key !== key || !MM.layer) { MM.layer = buildLayer(); MM.key = key; }
  const L = MM.layer, x = cv.getContext('2d'), S = size * dpr;
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, S, S);
  // view window in world metres
  const span = MM.full ? 2 * L.B : 180, cx = MM.full ? 0 : P.pos.x, cz = MM.full ? 0 : P.pos.z;
  const toPx = (wx, wz) => [((wx - cx) / span + .5) * S, ((wz - cz) / span + .5) * S];
  const sx = (cx - span / 2 + L.B) * L.k, sz = (cz - span / 2 + L.B) * L.k, sw = span * L.k;
  x.fillStyle = 'rgba(16,18,14,.82)'; x.fillRect(0, 0, S, S);
  x.imageSmoothingEnabled = true; x.drawImage(L.c, sx, sz, sw, sw, 0, 0, S, S);
  const f = dpr * (MM.full ? 1 : 1.1);
  // objective / main structure
  const cb = coreBox();
  if (cb) { const [a, b] = toPx(cb.x0, cb.z0), [c2, d2] = toPx(cb.x1, cb.z1); x.strokeStyle = '#ff6a4a'; x.lineWidth = 1.5 * dpr; x.setLineDash([5 * dpr, 3 * dpr]); x.strokeRect(a, b, c2 - a, d2 - b); x.setLineDash([]); x.fillStyle = '#ff8a6a'; x.font = `600 ${9 * f}px monospace`; const tw = x.measureText(cb.label).width, lx = Math.max(4 * dpr + tw / 2, Math.min(S - 4 * dpr - tw / 2, (a + c2) / 2)), ly = Math.max(22 * dpr, Math.min(S - 14 * dpr, b - 3 * dpr)); x.textAlign = 'center'; x.lineWidth = 3 * dpr; x.strokeStyle = 'rgba(0,0,0,.8)'; x.strokeText(cb.label, lx, ly); x.fillText(cb.label, lx, ly); }
  // extraction points
  if (Gm.raid) for (const e of Gm.raid.ex) {
    const blocked = G.Raid.exBlocked(e, P), col = !e.open ? '#ff5a4a' : blocked ? '#ffc04a' : '#5aff7a';
    let [px, py] = toPx(e.pos.x, e.pos.z); const m = 10 * dpr, out = px < m || py < m || px > S - m || py > S - m;
    if (out) { const vx = px - S / 2, vy = py - S / 2, t = Math.min((S / 2 - m) / Math.max(1e-6, Math.abs(vx)), (S / 2 - m) / Math.max(1e-6, Math.abs(vy))); px = S / 2 + vx * t; py = S / 2 + vy * t; }
    x.fillStyle = col; x.strokeStyle = '#0a0a0a'; x.lineWidth = 1.5 * dpr;
    if (out) { const a = Math.atan2(py - S / 2, px - S / 2); x.save(); x.translate(px, py); x.rotate(a); x.beginPath(); x.moveTo(6 * f, 0); x.lineTo(-4 * f, -4 * f); x.lineTo(-4 * f, 4 * f); x.closePath(); x.fill(); x.stroke(); x.restore(); }
    else { x.beginPath(); x.arc(px, py, 4.5 * f, 0, 7); x.fill(); x.stroke(); x.beginPath(); x.arc(px, py, e.r / span * S, 0, 7); x.strokeStyle = col; x.globalAlpha = .5; x.stroke(); x.globalAlpha = 1; }
    x.font = `600 ${9 * f}px sans-serif`; x.textAlign = px > S * .7 ? 'right' : px < S * .3 ? 'left' : 'center';
    const lbl = e.n + (out ? ` ${Math.round(e.pos.distanceTo(P.pos))}m` : '');
    x.lineWidth = 3 * dpr; x.strokeStyle = 'rgba(0,0,0,.8)'; x.strokeText(lbl, px, py - 7 * f); x.fillText(lbl, px, py - 7 * f);
  }
  // the player: an arrow pointing the way you face (yaw 0 = north / -z)
  const [ppx, ppy] = toPx(P.pos.x, P.pos.z), dx = -Math.sin(P.yaw), dz = -Math.cos(P.yaw), ang = Math.atan2(dz, dx);
  x.save(); x.translate(ppx, ppy); x.rotate(ang);
  x.fillStyle = 'rgba(230,197,114,.18)'; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 26 * f, -.5, .5); x.closePath(); x.fill(); // view cone
  x.fillStyle = '#ffe28a'; x.strokeStyle = '#111'; x.lineWidth = 1.5 * dpr; x.beginPath(); x.moveTo(8 * f, 0); x.lineTo(-5 * f, -5 * f); x.lineTo(-2 * f, 0); x.lineTo(-5 * f, 5 * f); x.closePath(); x.fill(); x.stroke();
  x.restore();
  // frame text: north, scale, mode
  x.fillStyle = 'rgba(232,226,204,.9)'; x.font = `700 ${10 * dpr}px monospace`; x.textAlign = 'center'; x.fillText('N', S / 2, 12 * dpr);
  x.textAlign = 'left'; x.font = `${9 * dpr}px monospace`; x.fillStyle = 'rgba(232,226,204,.75)';
  const bar = MM.full ? 100 : 25, bp = bar / span * S; x.fillRect(8 * dpr, S - 10 * dpr, bp, 2 * dpr); x.fillText(`${bar} m`, 8 * dpr + bp + 4 * dpr, S - 7 * dpr);
  x.textAlign = 'right'; x.fillText(MM.full ? 'M close · Shift+M local' : 'M close · Shift+M map', S - 6 * dpr, S - 7 * dpr);
};

// run after every game frame
const up0 = G.Game.update;
G.Game.update = function (dt, now) { const r = up0.apply(this, arguments); try { MM.update(); } catch (e) { /* never break the game loop */ } return r; };
})();
