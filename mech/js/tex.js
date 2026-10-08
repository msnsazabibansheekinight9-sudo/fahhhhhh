// Ironwalkers — procedural canvas textures (camo, emblems, panels, terrain, sprites).
(function () {
'use strict';
const MW = window.MW;
const T = MW.tex = {};
const cache = {};

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
T.canvas = canvas;
function toTex(c, repeat, srgb) {
  const t = new THREE.CanvasTexture(c);
  if (srgb !== false) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
T.toTex = toTex;

function hexA(hex, a) { const c = parseInt(hex.slice(1), 16); return `rgba(${c >> 16},${(c >> 8) & 255},${c & 255},${a})`; }
T.hexA = hexA;
function shade(hex, k) {
  const c = parseInt(hex.slice(1), 16); let r = c >> 16, g = (c >> 8) & 255, b = c & 255;
  if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
T.shade = shade;

// ---------- camo patterns ----------
// Draws `pattern` with colours [primary, secondary, accent] onto ctx of size S.
T.drawPattern = function (ctx, S, pattern, cols, seed) {
  const r = MW.rng(seed || pattern);
  const [a, b, c] = cols;
  ctx.fillStyle = a; ctx.fillRect(0, 0, S, S);
  const poly = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); };
  const blob = (x, y, rad, col, n) => {
    ctx.fillStyle = col; ctx.beginPath(); n = n || 9;
    for (let i = 0; i <= n; i++) { const an = i / n * Math.PI * 2; const rr = rad * (0.6 + r() * 0.6); const px = x + Math.cos(an) * rr, py = y + Math.sin(an) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fill();
  };
  // draw with wrap so textures tile
  const wrap = fn => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { ctx.save(); ctx.translate(ox, oy); fn(); ctx.restore(); } };
  switch (pattern) {
    case 'solid': break;
    case 'split': ctx.fillStyle = b; ctx.fillRect(0, S * 0.62, S, S * 0.38); ctx.fillStyle = c; ctx.fillRect(0, S * 0.58, S, S * 0.04); break;
    case 'stripes': for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? b : a; ctx.fillRect(0, i * S / 6, S, S / 6); } ctx.fillStyle = c; ctx.fillRect(0, S * 0.48, S, S * 0.04); break;
    case 'blotch': { const B = []; for (let i = 0; i < 14; i++) B.push([r() * S, r() * S, 14 + r() * 30, r() < 0.7 ? b : c]); wrap(() => B.forEach(q => blob(q[0], q[1], q[2], q[3]))); break; }
    case 'woodland': { const B = []; for (let i = 0; i < 40; i++) B.push([r() * S, r() * S, 8 + r() * 26, [b, c, shade(a, -0.35)][i % 3]]); wrap(() => B.forEach(q => blob(q[0], q[1], q[2], q[3], 12))); break; }
    case 'urban': { for (let i = 0; i < 30; i++) { ctx.fillStyle = [b, c, shade(a, 0.25)][i % 3]; const x = r() * S, y = r() * S; ctx.fillRect(x, y, 16 + r() * 50, 10 + r() * 30); } break; }
    case 'arctic': { ctx.fillStyle = shade(a, 0.3); ctx.fillRect(0, 0, S, S); const B = []; for (let i = 0; i < 18; i++) B.push([r() * S, r() * S, 6 + r() * 18, i % 4 === 0 ? c : b]); wrap(() => B.forEach(q => blob(q[0], q[1], q[2], q[3], 7))); break; }
    case 'splinter': { for (let i = 0; i < 28; i++) { const x = r() * S, y = r() * S, l = 30 + r() * 70, an = -0.5 + r() * 0.3, w = 6 + r() * 16; poly([[x, y], [x + Math.cos(an) * l, y + Math.sin(an) * l], [x + Math.cos(an) * l + w * 0.4, y + Math.sin(an) * l + w], [x + w, y + w * 0.6]], i % 4 === 0 ? c : b); } break; }
    case 'digital': { const q = S / 32; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const n = Math.sin(x * 0.7 + r() * 0.5) + Math.cos(y * 0.6 + x * 0.2) + r() * 1.3; if (n > 1.3) { ctx.fillStyle = b; ctx.fillRect(x * q, y * q, q, q); } else if (n < -0.6) { ctx.fillStyle = c; ctx.fillRect(x * q, y * q, q, q); } } break; }
    case 'tiger': { ctx.strokeStyle = b; ctx.lineCap = 'round'; for (let i = 0; i < 18; i++) { const y = r() * S, w = 4 + r() * 8; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(-10, y); for (let x = 0; x <= S + 10; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 10 + (r() - 0.5) * 8); ctx.stroke(); } ctx.strokeStyle = c; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const y = r() * S; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y + (r() - 0.5) * 20); ctx.stroke(); } break; }
    case 'hex': case 'honeycomb': { const R = pattern === 'hex' ? S / 10 : S / 16, h = R * Math.sqrt(3); for (let y = -1; y < S / h + 1; y++) for (let x = -1; x < S / (R * 1.5) + 1; x++) { const cx = x * R * 1.5, cy = y * h + (x % 2 ? h / 2 : 0); const pts = []; for (let k = 0; k < 6; k++) pts.push([cx + Math.cos(k * Math.PI / 3) * R * 0.9, cy + Math.sin(k * Math.PI / 3) * R * 0.9]); const z = r(); poly(pts, pattern === 'hex' ? (z < 0.25 ? b : z < 0.33 ? c : shade(a, -0.08)) : (z < 0.1 ? c : shade(b, (z - 0.5) * 0.3))); } break; }
    case 'hazard': { ctx.fillStyle = b; for (let i = -S; i < S * 2; i += S / 4) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S / 8, 0); ctx.lineTo(i + S / 8 - S, S); ctx.lineTo(i - S, S); ctx.closePath(); ctx.fill(); } break; }
    case 'carbon': { const q = S / 32; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const g = ctx.createLinearGradient(x * q, y * q, x * q + q, y * q + q); const on = (x + y) % 2; g.addColorStop(0, shade(on ? a : b, 0.15)); g.addColorStop(1, shade(on ? a : b, -0.3)); ctx.fillStyle = g; ctx.fillRect(x * q, y * q, q, q); } break; }
    case 'circuit': { ctx.fillStyle = b; ctx.fillRect(0, 0, S, S); ctx.strokeStyle = c; ctx.lineWidth = 2; for (let i = 0; i < 40; i++) { let x = Math.round(r() * 16) * S / 16, y = Math.round(r() * 16) * S / 16; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * S / 16 * (1 + (r() * 3 | 0)); else y += (r() < 0.5 ? -1 : 1) * S / 16 * (1 + (r() * 3 | 0)); ctx.lineTo(x, y); } ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); } break; }
    case 'flames': { ctx.fillStyle = b; ctx.fillRect(0, S * 0.55, S, S * 0.45); for (let i = 0; i < 9; i++) { const x = i * S / 8 + (r() - 0.5) * 10, h = S * (0.25 + r() * 0.3); const g = ctx.createLinearGradient(0, S * 0.6, 0, S * 0.6 - h); g.addColorStop(0, b); g.addColorStop(0.6, c); g.addColorStop(1, hexA(c.startsWith('#') ? c : '#ffaa00', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 20, S * 0.62); ctx.quadraticCurveTo(x - 18, S * 0.6 - h * 0.5, x + (r() - 0.5) * 20, S * 0.6 - h); ctx.quadraticCurveTo(x + 14, S * 0.6 - h * 0.4, x + 22, S * 0.62); ctx.fill(); } break; }
    case 'lightning': case 'bolts': { ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 8; for (let i = 0; i < (pattern === 'bolts' ? 12 : 5); i++) { let x = r() * S, y = 0; ctx.lineWidth = pattern === 'bolts' ? 3 : 2 + r() * 3; ctx.beginPath(); ctx.moveTo(x, y); while (y < S) { x += (r() - 0.5) * 40; y += 10 + r() * 20; ctx.lineTo(x, y); } ctx.stroke(); } ctx.shadowBlur = 0; if (pattern === 'bolts') { ctx.fillStyle = hexA('#000000', 0.15); ctx.fillRect(0, 0, S, S); } break; }
    case 'dazzle': { for (let i = 0; i < 16; i++) { const x = r() * S, y = r() * S; poly([[x, y], [x + 80 * (r() - 0.3), y + 60 * (r() - 0.5)], [x + 60 * r(), y + 90 * r()]], i % 3 === 0 ? c : i % 3 === 1 ? b : shade(a, 0.4)); } break; }
    case 'checker': { const q = S / 8; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) { ctx.fillStyle = b; ctx.fillRect(x * q, y * q, q, q); } ctx.fillStyle = c; ctx.fillRect(0, S / 2 - 2, S, 4); break; }
    case 'scales': { const R = S / 12; for (let y = -1; y < 14; y++) for (let x = -1; x < 14; x++) { const cx = x * R * 2 + (y % 2 ? R : 0), cy = y * R; const g = ctx.createRadialGradient(cx, cy - R * 0.4, 1, cx, cy, R * 1.2); g.addColorStop(0, shade(b, 0.2)); g.addColorStop(0.8, b); g.addColorStop(1, shade(b, -0.5)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, Math.PI); ctx.fill(); } ctx.globalAlpha = 0.25; ctx.fillStyle = c; ctx.fillRect(0, 0, S, S); ctx.globalAlpha = 1; break; }
    case 'tribal': { ctx.fillStyle = b; for (let i = 0; i < 6; i++) { const cx = r() * S, cy = r() * S; ctx.beginPath(); ctx.moveTo(cx, cy); for (let k = 0; k < 5; k++) { const an = r() * 6.28; ctx.quadraticCurveTo(cx + Math.cos(an) * 60, cy + Math.sin(an) * 60, cx + Math.cos(an + 0.4) * 90, cy + Math.sin(an + 0.4) * 90); ctx.lineTo(cx + Math.cos(an + 0.5) * 20, cy + Math.sin(an + 0.5) * 20); } ctx.fill(); } ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke(); break; }
    case 'starfield': { const g = ctx.createLinearGradient(0, 0, S, S); g.addColorStop(0, b); g.addColorStop(0.5, a); g.addColorStop(1, shade(b, -0.4)); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); for (let i = 0; i < 160; i++) { ctx.fillStyle = i % 9 === 0 ? c : '#ffffff'; ctx.globalAlpha = 0.3 + r() * 0.7; const s = r() < 0.92 ? 1 : 2.5; ctx.fillRect(r() * S, r() * S, s, s); } ctx.globalAlpha = 1; break; }
    case 'damascus': { for (let y = 0; y < S; y += 2) { ctx.strokeStyle = (y / 2) % 3 === 0 ? b : (y / 2) % 3 === 1 ? shade(a, 0.2) : shade(b, -0.3); ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= S; x += 4) { const yy = y + Math.sin(x * 0.04 + y * 0.03) * 12 + Math.sin(x * 0.11 - y * 0.05) * 5; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); } ctx.fillStyle = hexA('#ffffff', 0.04); ctx.fillRect(0, 0, S, S); break; }
    case 'chevron': { ctx.fillStyle = b; for (let y = -S / 4; y < S; y += S / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S / 2, y + S / 8); ctx.lineTo(S, y); ctx.lineTo(S, y + S / 10); ctx.lineTo(S / 2, y + S / 8 + S / 10); ctx.lineTo(0, y + S / 10); ctx.fill(); } ctx.fillStyle = c; ctx.fillRect(S / 2 - 2, 0, 4, S); break; }
    case 'waves': { for (let i = 0; i < 10; i++) { ctx.strokeStyle = i % 3 === 2 ? c : b; ctx.lineWidth = 6; ctx.beginPath(); for (let x = 0; x <= S; x += 4) { const y = i * S / 10 + Math.sin(x / S * Math.PI * 4) * 8; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); } break; }
    case 'glitch': { for (let i = 0; i < 50; i++) { ctx.fillStyle = [b, c, shade(a, 0.4), shade(c, -0.3)][i % 4]; ctx.globalAlpha = 0.5 + r() * 0.5; ctx.fillRect(r() * S, r() * S, 10 + r() * 90, 2 + r() * 8); } ctx.globalAlpha = 1; break; }
    case 'marble': { for (let i = 0; i < 14; i++) { ctx.strokeStyle = i % 4 === 0 ? c : hexA(b.startsWith('#') ? b : '#555555', 0.6); ctx.lineWidth = 1 + r() * 3; ctx.beginPath(); let x = r() * S, y = 0; ctx.moveTo(x, y); while (y < S) { x += (r() - 0.5) * 30; y += 8; ctx.lineTo(x, y); } ctx.stroke(); } break; }
    case 'rust': { for (let i = 0; i < 260; i++) { ctx.fillStyle = hexA(i % 5 === 0 ? c : b, 0.15 + r() * 0.35); blob(r() * S, r() * S, 2 + r() * 12, ctx.fillStyle, 6); } break; }
    case 'topo': { for (let k = 0; k < 4; k++) { const cx = r() * S, cy = r() * S; for (let rr = 8; rr < 140; rr += 10) { ctx.strokeStyle = rr % 50 < 10 ? c : b; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= 36; i++) { const an = i / 36 * 6.283; const q = rr * (1 + Math.sin(an * 3 + k) * 0.12); i ? ctx.lineTo(cx + Math.cos(an) * q, cy + Math.sin(an) * q) : ctx.moveTo(cx + Math.cos(an) * q, cy + Math.sin(an) * q); } ctx.stroke(); } } break; }
    case 'holo': { const g = ctx.createLinearGradient(0, 0, S, S); ['#ff5f6d', '#ffc371', '#47ffb0', '#3ea6ff', '#b866ff', '#ff5f6d'].forEach((col, i) => g.addColorStop(i / 5, col)); ctx.fillStyle = g; ctx.globalAlpha = 0.55; ctx.fillRect(0, 0, S, S); ctx.globalAlpha = 1; ctx.strokeStyle = hexA('#ffffff', 0.4); for (let i = 0; i < S; i += 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - S / 2, S); ctx.stroke(); } ctx.fillStyle = hexA(b.startsWith('#') ? b : '#000000', 0.25); ctx.fillRect(0, 0, S, S); break; }
    default: break;
  }
};

// Panel lines, rivets and optional wear drawn over a camo
function drawPanels(ctx, S, wear, seed) {
  const r = MW.rng(seed || 'panels');
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
  const cells = [[0, 0, S, S]];
  for (let i = 0; i < 7; i++) { const k = Math.floor(r() * cells.length); const [x, y, w, h] = cells.splice(k, 1)[0]; if (w > h) { const s = w * (0.3 + r() * 0.4); cells.push([x, y, s, h], [x + s, y, w - s, h]); } else { const s = h * (0.3 + r() * 0.4); cells.push([x, y, w, s], [x, y + s, w, h - s]); } }
  cells.forEach(([x, y, w, h]) => { ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 2, y + 2, w - 4, 2); ctx.fillStyle = 'rgba(0,0,0,0.25)'; if (w > 40 && h > 40) for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + (k % 2 ? w - 6 : 6), y + (k < 2 ? 6 : h - 6), 1.6, 0, 7); ctx.fill(); } });
  if (wear) {
    for (let i = 0; i < 90 * wear; i++) { ctx.fillStyle = `rgba(${r() < 0.5 ? '40,35,30' : '160,160,160'},${0.1 + r() * 0.25})`; ctx.beginPath(); ctx.ellipse(r() * S, r() * S, 1 + r() * 6, 1 + r() * 3, r() * 3, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(30,22,15,0.18)'; for (let i = 0; i < 12 * wear; i++) ctx.fillRect(r() * S, r() * S, 1.5, 10 + r() * 30);
  }
}

T.camo = function (pattern, cols, finishId, size) {
  const key = 'camo|' + pattern + cols.join() + finishId + size;
  if (cache[key]) return cache[key];
  const S = size || 256;
  const cv = canvas(S); const ctx = cv.getContext('2d');
  T.drawPattern(ctx, S, pattern, cols);
  const f = MW.FINISHES.find(x => x.id === finishId) || {};
  if (f.id === 'carbonf') { ctx.globalAlpha = 0.35; T.drawPattern(ctx, S, 'carbon', ['#333', '#111', '#000']); ctx.globalAlpha = 1; }
  if (f.id === 'brushed') { ctx.globalAlpha = 0.12; for (let y = 0; y < S; y++) { ctx.fillStyle = Math.random() < 0.5 ? '#fff' : '#000'; ctx.fillRect(0, y, S, 1); } ctx.globalAlpha = 1; }
  drawPanels(ctx, S, f.wear || 0, pattern + cols[0]);
  if (f.glow) { ctx.strokeStyle = cols[2]; ctx.lineWidth = 2; ctx.shadowColor = cols[2]; ctx.shadowBlur = 6; ctx.strokeRect(S * 0.1, S * 0.1, S * 0.8, S * 0.8); ctx.beginPath(); ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2); ctx.stroke(); ctx.shadowBlur = 0; }
  const t = toTex(cv, true);
  cache[key] = t; return t;
};

// Emissive map for "Neon Lines" finish
T.glowLines = function (col) {
  const key = 'glow|' + col; if (cache[key]) return cache[key];
  const S = 256, cv = canvas(S), ctx = cv.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S); ctx.strokeStyle = col; ctx.lineWidth = 2.5;
  ctx.strokeRect(S * 0.1, S * 0.1, S * 0.8, S * 0.8); ctx.beginPath(); ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2); ctx.stroke();
  return (cache[key] = toTex(cv, true));
};

// Bump map with panel seams (shared)
T.panelBump = function () {
  if (cache.bump) return cache.bump;
  const S = 256, cv = canvas(S), ctx = cv.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#303030'; ctx.lineWidth = 2;
  const r = MW.rng('bump');
  for (let i = 0; i < 9; i++) { const v = r() * S; if (i % 2) { ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(S, v); ctx.stroke(); } else { ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, S); ctx.stroke(); } }
  ctx.fillStyle = '#b0b0b0'; for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc(r() * S, r() * S, 1.5, 0, 7); ctx.fill(); }
  const t = toTex(cv, true, false); return (cache.bump = t);
};

// ---------- emblems ----------
T.drawEmblem = function (ctx, S, shape, col) {
  ctx.save(); ctx.translate(S / 2, S / 2); const s = S / 2 * 0.86;
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = s * 0.1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const P = (pts, fill = true) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s))); ctx.closePath(); fill ? ctx.fill() : ctx.stroke(); };
  const C = (x, y, rr, fill = true) => { ctx.beginPath(); ctx.arc(x * s, y * s, rr * s, 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); };
  const hole = fn => { ctx.globalCompositeOperation = 'destination-out'; fn(); ctx.globalCompositeOperation = 'source-over'; };
  switch (shape) {
    case 'skull': C(0, -0.15, 0.62); P([[-0.38, 0.2], [0.38, 0.2], [0.3, 0.75], [-0.3, 0.75]]); hole(() => { C(-0.24, -0.12, 0.17); C(0.24, -0.12, 0.17); P([[0, 0.1], [-0.08, 0.3], [0.08, 0.3]]); for (let i = -2; i <= 2; i++) ctx.fillRect(i * 0.13 * s - 2, 0.5 * s, 4, 0.25 * s); }); break;
    case 'wolf': P([[-0.7, -0.8], [-0.3, -0.35], [0.3, -0.35], [0.7, -0.8], [0.62, 0.05], [0.25, 0.4], [0, 0.85], [-0.25, 0.4], [-0.62, 0.05]]); hole(() => { P([[-0.42, -0.08], [-0.15, 0.02], [-0.38, 0.1]]); P([[0.42, -0.08], [0.15, 0.02], [0.38, 0.1]]); }); break;
    case 'star': { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.4 : 0.95; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } P(pts); break; }
    case 'bolt': P([[0.15, -0.95], [-0.5, 0.1], [-0.05, 0.1], [-0.2, 0.95], [0.5, -0.15], [0.05, -0.15]]); break;
    case 'crown': P([[-0.8, 0.5], [-0.8, -0.5], [-0.4, 0], [0, -0.7], [0.4, 0], [0.8, -0.5], [0.8, 0.5]]); ctx.fillRect(-0.8 * s, 0.6 * s, 1.6 * s, 0.2 * s); break;
    case 'eagle': P([[0, -0.4], [-0.95, -0.7], [-0.6, -0.1], [-0.8, 0.1], [-0.3, 0.2], [-0.2, 0.8], [0, 0.55], [0.2, 0.8], [0.3, 0.2], [0.8, 0.1], [0.6, -0.1], [0.95, -0.7]]); C(0, -0.45, 0.18); break;
    case 'crosshair': C(0, 0, 0.7, false); C(0, 0, 0.12); [[0, -1, 0, -0.35], [0, 1, 0, 0.35], [-1, 0, -0.35, 0], [1, 0, 0.35, 0]].forEach(l => { ctx.beginPath(); ctx.moveTo(l[0] * s, l[1] * s); ctx.lineTo(l[2] * s, l[3] * s); ctx.stroke(); }); break;
    case 'shield': P([[-0.75, -0.8], [0.75, -0.8], [0.75, 0], [0, 0.95], [-0.75, 0]]); hole(() => P([[-0.1, -0.6], [0.1, -0.6], [0.1, 0.55], [-0.1, 0.55]])); break;
    case 'sword': P([[-0.08, -0.95], [0.08, -0.95], [0.12, 0.4], [-0.12, 0.4]]); P([[-0.5, 0.4], [0.5, 0.4], [0.5, 0.52], [-0.5, 0.52]]); P([[-0.07, 0.52], [0.07, 0.52], [0.07, 0.85], [-0.07, 0.85]]); C(0, 0.9, 0.1); break;
    case 'flame': ctx.beginPath(); ctx.moveTo(0, -0.95 * s); ctx.bezierCurveTo(0.5 * s, -0.3 * s, 0.75 * s, 0.2 * s, 0.4 * s, 0.85 * s); ctx.quadraticCurveTo(0, 1 * s, -0.4 * s, 0.85 * s); ctx.bezierCurveTo(-0.8 * s, 0.3 * s, -0.4 * s, -0.1 * s, -0.15 * s, -0.4 * s); ctx.quadraticCurveTo(-0.05 * s, 0, 0, -0.95 * s); ctx.fill(); break;
    case 'atom': for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate(i * Math.PI / 3); ctx.beginPath(); ctx.ellipse(0, 0, 0.9 * s, 0.3 * s, 0, 0, 7); ctx.lineWidth = s * 0.07; ctx.stroke(); ctx.restore(); } C(0, 0, 0.15); break;
    case 'gear': { const pts = []; for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2, rr = (i % 4 < 2) ? 0.95 : 0.72; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } P(pts); hole(() => C(0, 0, 0.32)); break; }
    case 'fang': P([[-0.7, -0.8], [-0.35, 0.85], [-0.1, -0.5]]); P([[0.7, -0.8], [0.35, 0.85], [0.1, -0.5]]); break;
    case 'eye': ctx.beginPath(); ctx.moveTo(-0.95 * s, 0); ctx.quadraticCurveTo(0, -0.8 * s, 0.95 * s, 0); ctx.quadraticCurveTo(0, 0.8 * s, -0.95 * s, 0); ctx.fill(); hole(() => C(0, 0, 0.32)); C(0, 0, 0.16); break;
    case 'wing': for (let i = 0; i < 5; i++) P([[-0.8 + i * 0.12, -0.6 + i * 0.25], [0.9, -0.85 + i * 0.3], [0.9, -0.7 + i * 0.3], [-0.8 + i * 0.12, -0.45 + i * 0.25]]); break;
    case 'planet': C(0, 0, 0.55); ctx.beginPath(); ctx.ellipse(0, 0, 0.95 * s, 0.25 * s, -0.4, 0, 7); ctx.lineWidth = s * 0.08; ctx.stroke(); break;
    case 'diamond': P([[0, -0.95], [0.65, -0.2], [0, 0.95], [-0.65, -0.2]]); hole(() => P([[0, -0.6], [0.35, -0.2], [0, 0.55], [-0.35, -0.2]])); C(0, -0.1, 0.15); break;
    case 'anchor': C(0, -0.7, 0.18, false); ctx.fillRect(-0.07 * s, -0.5 * s, 0.14 * s, 1.3 * s); ctx.fillRect(-0.45 * s, -0.35 * s, 0.9 * s, 0.12 * s); ctx.beginPath(); ctx.arc(0, 0.3 * s, 0.65 * s, 0.2, Math.PI - 0.2); ctx.stroke(); break;
    case 'spade': ctx.beginPath(); ctx.moveTo(0, -0.95 * s); ctx.bezierCurveTo(0.9 * s, -0.2 * s, 0.7 * s, 0.6 * s, 0.05 * s, 0.25 * s); ctx.lineTo(0.3 * s, 0.9 * s); ctx.lineTo(-0.3 * s, 0.9 * s); ctx.lineTo(-0.05 * s, 0.25 * s); ctx.bezierCurveTo(-0.7 * s, 0.6 * s, -0.9 * s, -0.2 * s, 0, -0.95 * s); ctx.fill(); break;
    case 'heart': ctx.beginPath(); ctx.moveTo(0, 0.85 * s); ctx.bezierCurveTo(-1.1 * s, 0, -0.6 * s, -0.95 * s, 0, -0.35 * s); ctx.bezierCurveTo(0.6 * s, -0.95 * s, 1.1 * s, 0, 0, 0.85 * s); ctx.fill(); break;
    case 'phoenix': P([[0, -0.9], [0.15, -0.4], [0.9, -0.6], [0.4, 0], [0.7, 0.3], [0.15, 0.25], [0, 0.95], [-0.15, 0.25], [-0.7, 0.3], [-0.4, 0], [-0.9, -0.6], [-0.15, -0.4]]); break;
    case 'serpent': ctx.lineWidth = s * 0.2; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40; const x = Math.sin(t * Math.PI * 3) * 0.55 * s, y = (t * 1.7 - 0.85) * s; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); C(0, -0.85, 0.16); break;
    case 'hammer': ctx.fillRect(-0.08 * s, -0.4 * s, 0.16 * s, 1.3 * s); P([[-0.7, -0.85], [0.7, -0.85], [0.7, -0.3], [-0.7, -0.3]]); break;
    case 'moon': C(0, 0, 0.85); hole(() => C(0.38, -0.2, 0.7)); break;
  }
  ctx.restore();
};
T.emblem = function (shape, col, bg) {
  const key = 'emb|' + shape + col + bg; if (cache[key]) return cache[key];
  const S = 128, cv = canvas(S), ctx = cv.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, 7); ctx.fill(); }
  T.drawEmblem(ctx, S, shape, col);
  const t = toTex(cv); return (cache[key] = t);
};

// ---------- terrain & world textures ----------
T.noise = function (key, S, fn) {
  if (cache['n|' + key]) return cache['n|' + key];
  const cv = canvas(S), ctx = cv.getContext('2d'); const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const [r, g, b] = fn(x, y); const i = (y * S + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  const t = toTex(cv, true); return (cache['n|' + key] = t);
};
T.ground = function (theme) {
  // grey detail texture multiplied over vertex colours
  return T.noise('ground' + theme, 256, (() => { const r = MW.rng('g' + theme); const g = []; for (let i = 0; i < 256 * 256; i++) g.push(r()); return (x, y) => {
    const v = 150 + (g[y * 256 + x] - 0.5) * 70 + (g[((y >> 2) * 256 + (x >> 2)) % g.length] - 0.5) * 50 + (g[((y >> 4) * 256 + (x >> 4) + 7) % g.length] - 0.5) * 40;
    const c = MW.clamp(v, 0, 255); return [c, c, c];
  }; })());
};
T.windows = function (lit, col, key) {
  key = 'win|' + lit + col + (key || '');
  if (cache[key]) return cache[key];
  const S = 128, cv = canvas(S), ctx = cv.getContext('2d'); const r = MW.rng(key);
  ctx.fillStyle = '#1a1d22'; ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const on = r() < lit;
    ctx.fillStyle = on ? (r() < 0.8 ? col : '#ffffff') : '#0b0d10';
    ctx.globalAlpha = on ? 0.6 + r() * 0.4 : 1; ctx.fillRect(x * 16 + 3, y * 16 + 4, 10, 9); ctx.globalAlpha = 1;
  }
  return (cache[key] = toTex(cv, true));
};
T.sprite = function (kind) {
  if (cache['sp|' + kind]) return cache['sp|' + kind];
  const S = 64, cv = canvas(S), ctx = cv.getContext('2d');
  if (kind === 'soft') { const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); }
  if (kind === 'smoke') { const r = MW.rng('smoke'); for (let i = 0; i < 14; i++) { const x = 18 + r() * 28, y = 18 + r() * 28, rr = 8 + r() * 14; const g = ctx.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); } }
  if (kind === 'flare') { const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.1, 'rgba(255,255,255,0.9)'); g.addColorStop(0.3, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0, 31, S, 2); ctx.fillRect(31, 0, 2, S); }
  if (kind === 'ring') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; const g = ctx.createRadialGradient(32, 32, 20, 32, 32, 31); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); }
  const t = toTex(cv, false); return (cache['sp|' + kind] = t);
};
// crack overlay for the cockpit glass
T.cracks = function () {
  if (cache.cracks) return cache.cracks;
  const S = 512, cv = canvas(S), ctx = cv.getContext('2d'); const r = MW.rng('cracks');
  ctx.strokeStyle = 'rgba(220,235,255,0.75)';
  for (let k = 0; k < 5; k++) {
    const cx = S * (0.15 + r() * 0.7), cy = S * (0.15 + r() * 0.7);
    for (let i = 0; i < 9; i++) { let x = cx, y = cy, a = r() * 6.28; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 8; j++) { a += (r() - 0.5) * 0.8; x += Math.cos(a) * 16; y += Math.sin(a) * 16; ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.lineWidth = 0.8; for (let rr = 10; rr < 50; rr += 14) { ctx.beginPath(); for (let i = 0; i <= 12; i++) { const a = i / 12 * 6.28; const q = rr * (0.8 + r() * 0.4); i ? ctx.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : ctx.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } ctx.stroke(); }
  }
  const t = toTex(cv, false); return (cache.cracks = t);
};
// generic label texture (signs, stencils)
T.label = function (text, fg, bg, w, h, font) {
  const key = 'lbl|' + text + fg + bg + w + h + font; if (cache[key]) return cache[key];
  const cv = canvas(w || 256, h || 64), ctx = cv.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height); }
  ctx.fillStyle = fg; ctx.font = font || `bold ${Math.floor(cv.height * 0.6)}px Rajdhani, Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cv.width / 2, cv.height / 2 + 2);
  return (cache[key] = toTex(cv));
};
})();
