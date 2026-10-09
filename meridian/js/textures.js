'use strict';
// Procedural canvas textures: camo / skin patterns, tracks, windows, sprites.
(function () {
  const T = THREE;
  const css = n => '#' + ('000000' + (n >>> 0).toString(16)).slice(-6);
  const mix = (a, b, t) => {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
  };
  const shade = (c, f) => f >= 0 ? mix(c, 0xffffff, f) : mix(c, 0x000000, -f);
  SM.css = css; SM.mixColor = mix; SM.shade = shade;

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // draws a shape at the 9 wrap offsets so the texture tiles seamlessly
  function wrapDraw(S, fn) { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) fn(dx * S, dy * S); }
  function blob(ctx, S, r, x, y, rad, col, lobes) {
    ctx.fillStyle = col;
    const n = lobes || 9, offs = [];
    for (let i = 0; i < n; i++) offs.push(0.55 + r() * 0.7);
    wrapDraw(S, (ox, oy) => {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = (i % n) / n * Math.PI * 2, rr = rad * offs[i % n];
        const px = x + ox + Math.cos(a) * rr, py = y + oy + Math.sin(a) * rr * 0.75;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    });
  }
  function noise(ctx, S, r, amt) {
    const img = ctx.getImageData(0, 0, S, S), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    ctx.putImageData(img, 0, 0);
  }
  function panelLines(ctx, S, r, col, a) {
    ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const y = Math.floor(r() * S) + 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke();
      const x = Math.floor(r() * S) + 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 30 + r() * 60); ctx.stroke();
    }
    ctx.fillStyle = col;
    for (let i = 0; i < 40; i++) { ctx.fillRect(Math.floor(r() * S), Math.floor(r() * S), 2, 2); }
    ctx.globalAlpha = 1;
  }

  const PAT = {
    factory(ctx, S, r, p) { ctx.fillStyle = css(p.base); ctx.fillRect(0, 0, S, S); for (let i = 0; i < 10; i++) blob(ctx, S, r, r() * S, r() * S, 30 + r() * 40, css(shade(p.base, (r() - 0.5) * 0.08))); panelLines(ctx, S, r, css(p.dark), 0.35); },
    woodland(ctx, S, r) { ctx.fillStyle = '#5b6a3c'; ctx.fillRect(0, 0, S, S); ['#3e4a2a', '#6e5636', '#1f231a', '#7d8250'].forEach((c, k) => { for (let i = 0; i < 7; i++) blob(ctx, S, r, r() * S, r() * S, 22 + r() * 30 - k * 3, c, 11); }); },
    desert(ctx, S, r) { ctx.fillStyle = '#c9a86e'; ctx.fillRect(0, 0, S, S); ['#a98552', '#e0c895', '#8a6a42'].forEach(c => { for (let i = 0; i < 7; i++) blob(ctx, S, r, r() * S, r() * S, 22 + r() * 34, c, 10); }); },
    arctic(ctx, S, r) { ctx.fillStyle = '#e6ebee'; ctx.fillRect(0, 0, S, S); ['#b4bec6', '#8a959e', '#ffffff'].forEach(c => { for (let i = 0; i < 6; i++) blob(ctx, S, r, r() * S, r() * S, 20 + r() * 30, c, 7); }); },
    digital(ctx, S, r) {
      ctx.fillStyle = '#8d9396'; ctx.fillRect(0, 0, S, S);
      const cols = ['#5f6467', '#b6babb', '#3d4043', '#a0a6a8']; const px = 8;
      for (let k = 0; k < 4; k++) for (let i = 0; i < 26; i++) { const cx = Math.floor(r() * S / px) * px, cy = Math.floor(r() * S / px) * px; ctx.fillStyle = cols[k]; const w = 1 + Math.floor(r() * 4), h = 1 + Math.floor(r() * 3); for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) if (r() < 0.75) ctx.fillRect((cx + a * px) % S, (cy + b * px) % S, px, px); }
    },
    tiger(ctx, S, r) {
      ctx.fillStyle = '#6b6b3a'; ctx.fillRect(0, 0, S, S);
      ['#2a2a1a', '#8c6b3a', '#141410'].forEach(c => { ctx.fillStyle = c; for (let i = 0; i < 10; i++) { const y = r() * S, h = 4 + r() * 8; wrapDraw(S, (ox, oy) => { ctx.beginPath(); ctx.moveTo(ox - 10, oy + y); for (let x = 0; x <= S + 20; x += 16) ctx.lineTo(ox + x, oy + y + Math.sin(x * 0.05 + i) * 10 + (r() - 0.5) * 6); for (let x = S + 20; x >= -10; x -= 16) ctx.lineTo(ox + x, oy + y + h + Math.sin(x * 0.05 + i) * 10); ctx.fill(); }); } });
    },
    splinter(ctx, S, r) {
      ctx.fillStyle = '#7e8a6a'; ctx.fillRect(0, 0, S, S);
      ['#4d5a3f', '#a4a587', '#5b4a35'].forEach(c => { ctx.fillStyle = c; for (let i = 0; i < 9; i++) { const x = r() * S, y = r() * S; const pts = []; for (let k = 0; k < 4; k++) pts.push([x + (r() - 0.5) * 120, y + (r() - 0.5) * 60]); wrapDraw(S, (ox, oy) => { ctx.beginPath(); pts.forEach((q, j) => j ? ctx.lineTo(q[0] + ox, q[1] + oy) : ctx.moveTo(q[0] + ox, q[1] + oy)); ctx.fill(); }); } });
    },
    hex(ctx, S, r, p) {
      ctx.fillStyle = css(shade(p.base, -0.2)); ctx.fillRect(0, 0, S, S);
      const s = 16, h = s * Math.sqrt(3) / 2;
      for (let row = -1; row < S / h + 1; row++) for (let col = -1; col < S / (s * 1.5) + 1; col++) {
        const cx = col * s * 1.5, cy = row * h * 2 + (col % 2 ? h : 0);
        ctx.fillStyle = css(shade(p.base, (r() - 0.5) * 0.4)); ctx.beginPath();
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.lineTo(cx + Math.cos(a) * (s - 1.5), cy + Math.sin(a) * (s - 1.5)); }
        ctx.fill();
      }
    },
    navy(ctx, S, r) { ctx.fillStyle = '#4c5d6e'; ctx.fillRect(0, 0, S, S); ['#33424f', '#6c7f91', '#26313b'].forEach(c => { for (let i = 0; i < 6; i++) blob(ctx, S, r, r() * S, r() * S, 26 + r() * 30, c, 6); }); },
    jungle(ctx, S, r) {
      ctx.fillStyle = '#3f5a2c'; ctx.fillRect(0, 0, S, S);
      ['#2a3d1d', '#5f7d3b', '#1b2614', '#6a5a33'].forEach(c => { ctx.fillStyle = c; for (let i = 0; i < 26; i++) { const x = r() * S, y = r() * S, a = r() * Math.PI, l = 14 + r() * 18; wrapDraw(S, (ox, oy) => { ctx.save(); ctx.translate(x + ox, y + oy); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, l, l * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }); } });
    },
    nightops(ctx, S, r) { ctx.fillStyle = '#1d2024'; ctx.fillRect(0, 0, S, S); ['#2b2f35', '#121417'].forEach(c => { for (let i = 0; i < 7; i++) blob(ctx, S, r, r() * S, r() * S, 24 + r() * 30, c, 6); }); panelLines(ctx, S, r, '#3a3f47', 0.5); },
    crimson(ctx, S, r) {
      ctx.fillStyle = '#5a1515'; ctx.fillRect(0, 0, S, S); ctx.fillStyle = '#141010';
      for (let i = 0; i < 12; i++) { const x = r() * S, y = r() * S, w = 20 + r() * 30; wrapDraw(S, (ox, oy) => { ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + w, y + oy + w * 0.3); ctx.lineTo(x + ox + w * 0.2, y + oy + w * 0.9); ctx.fill(); }); }
      panelLines(ctx, S, r, '#a32a2a', 0.5);
    },
    dazzle(ctx, S, r) {
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#1a1a1a' : '#5d6b7a'; const x = r() * S, y = r() * S, a = r() * Math.PI; wrapDraw(S, (ox, oy) => { ctx.save(); ctx.translate(x + ox, y + oy); ctx.rotate(a); ctx.fillRect(-90, -8 - r() * 8, 180, 16 + r() * 10); ctx.restore(); }); }
    },
    toxic(ctx, S, r) {
      ctx.fillStyle = '#2b2d22'; ctx.fillRect(0, 0, S, S);
      ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(-Math.PI / 4); ctx.fillStyle = '#d6c021';
      for (let i = -S; i < S; i += 40) ctx.fillRect(i, -S, 18, S * 2);
      ctx.restore();
      ['#7ad02a', '#3a6a12'].forEach(c => { for (let i = 0; i < 5; i++) blob(ctx, S, r, r() * S, r() * S, 16 + r() * 22, c, 12); });
    },
    sakura(ctx, S, r) {
      ctx.fillStyle = '#d9d4d6'; ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 40; i++) { const x = r() * S, y = r() * S, s = 4 + r() * 7; ctx.fillStyle = r() < 0.5 ? '#f2a6c0' : '#d96a92'; wrapDraw(S, (ox, oy) => { for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; ctx.beginPath(); ctx.ellipse(x + ox + Math.cos(a) * s, y + oy + Math.sin(a) * s, s * 0.8, s * 0.45, a, 0, Math.PI * 2); ctx.fill(); } }); }
      panelLines(ctx, S, r, '#7a6a72', 0.3);
    },
    bone(ctx, S, r) { ctx.fillStyle = '#d8d0bc'; ctx.fillRect(0, 0, S, S); ctx.strokeStyle = '#6e6656'; ctx.lineWidth = 1.5; for (let i = 0; i < 26; i++) { let x = r() * S, y = r() * S; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; ctx.lineTo(x, y); } ctx.stroke(); } },
    circuit(ctx, S, r, p) {
      ctx.fillStyle = '#0d1016'; ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = css(p.glow); ctx.lineWidth = 2; ctx.fillStyle = css(p.glow);
      for (let i = 0; i < 34; i++) { let x = Math.floor(r() * 16) * 16, y = Math.floor(r() * 16) * 16; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * 32; else y += (r() < 0.5 ? -1 : 1) * 32; ctx.lineTo(x, y); } ctx.stroke(); ctx.fillRect(x - 3, y - 3, 6, 6); }
    },
    carbon(ctx, S) { for (let y = 0; y < S; y += 8) for (let x = 0; x < S; x += 8) { const g = ((x + y) / 8) % 2 ? 0x22 : 0x34; ctx.fillStyle = 'rgb(' + g + ',' + g + ',' + (g + 4) + ')'; ctx.fillRect(x, y, 8, 8); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, y, 8, 2); } },
    lava(ctx, S, r) {
      ctx.fillStyle = '#1a1210'; ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = '#ff6a1a'; ctx.shadowColor = '#ffb040'; ctx.shadowBlur = 6; ctx.lineWidth = 2.5;
      for (let i = 0; i < 18; i++) { let x = r() * S, y = r() * S; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; ctx.lineTo(x, y); } ctx.stroke(); }
      ctx.shadowBlur = 0;
    },
    glacier(ctx, S, r) {
      ctx.fillStyle = '#bfe3f2'; ctx.fillRect(0, 0, S, S);
      ['#e9f8ff', '#7cbcd9', '#a6d6ea', '#ffffff'].forEach(c => { ctx.fillStyle = c; for (let i = 0; i < 10; i++) { const x = r() * S, y = r() * S; wrapDraw(S, (ox, oy) => { ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + 30 + r() * 30, y + oy + (r() - 0.5) * 30); ctx.lineTo(x + ox + 10, y + oy + 30 + r() * 30); ctx.fill(); }); } });
    },
    obsidian(ctx, S, r) { const g = ctx.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#0b0b10'); g.addColorStop(0.5, '#241a36'); g.addColorStop(1, '#0b0b10'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); panelLines(ctx, S, r, '#6a4aa0', 0.5); },
    chrome(ctx, S) { const g = ctx.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#f4f6f8'); g.addColorStop(0.45, '#9aa2aa'); g.addColorStop(0.55, '#e8ecef'); g.addColorStop(1, '#7a828a'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); },
    gold(ctx, S, r) { const g = ctx.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#f7d572'); g.addColorStop(0.5, '#c8902a'); g.addColorStop(1, '#f2c454'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); panelLines(ctx, S, r, '#8a5a12', 0.35); },
    galaxy(ctx, S, r) {
      const g = ctx.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#0a0620'); g.addColorStop(0.5, '#2a0f4a'); g.addColorStop(1, '#081a3a'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 6; i++) blob(ctx, S, r, r() * S, r() * S, 30 + r() * 30, 'rgba(160,80,255,0.18)', 10);
      for (let i = 0; i < 160; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + r() * 0.6) + ')'; const s = r() < 0.1 ? 2 : 1; ctx.fillRect(r() * S, r() * S, s, s); }
    },
    holo(ctx, S) { const g = ctx.createLinearGradient(0, 0, S, S); ['#ff5ab4', '#ffd25a', '#5affb4', '#5ab4ff', '#b45aff', '#ff5ab4'].forEach((c, i) => g.addColorStop(i / 5, c)); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff'; for (let y = 0; y < S; y += 6) ctx.fillRect(0, y, S, 1); ctx.globalAlpha = 1; },
  };
  SM.SKIN_LOOK = {
    chrome: { metal: 1, rough: 0.12 }, gold: { metal: 1, rough: 0.22 }, obsidian: { metal: 0.6, rough: 0.18 },
    carbon: { metal: 0.3, rough: 0.35 }, circuit: { emissive: 1.4 }, lava: { emissive: 1.6 }, galaxy: { emissive: 0.9 }, holo: { metal: 0.6, rough: 0.2, emissive: 0.35 },
    glacier: { metal: 0.2, rough: 0.25 },
  };

  const texCache = {};
  SM.camoTexture = function (pattern, palette, size) {
    const S = size || 256;
    const key = pattern + ':' + palette.base + ':' + S;
    if (texCache[key]) return texCache[key];
    const c = canvas(S, S), ctx = c.getContext('2d');
    const r = SM.rng(SM.hash(key));
    (PAT[pattern] || PAT.factory)(ctx, S, r, palette);
    if (pattern !== 'chrome' && pattern !== 'holo' && pattern !== 'gold') noise(ctx, S, r, 14);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    texCache[key] = t;
    return t;
  };
  SM.skinSwatch = function (pattern, fac) {
    const c = canvas(64, 64), ctx = c.getContext('2d');
    const p = SM.FACTION[fac || 'coalition'].palette;
    (PAT[pattern] || PAT.factory)(ctx, 64, SM.rng(SM.hash(pattern)), p);
    return c.toDataURL();
  };

  SM.trackTexture = function () {
    if (texCache.track) return texCache.track;
    const c = canvas(64, 128), ctx = c.getContext('2d');
    ctx.fillStyle = '#1c1c1c'; ctx.fillRect(0, 0, 64, 128);
    for (let y = 0; y < 128; y += 16) { ctx.fillStyle = '#383838'; ctx.fillRect(0, y, 64, 9); ctx.fillStyle = '#4a4a4a'; ctx.fillRect(4, y + 2, 56, 3); ctx.fillStyle = '#121212'; ctx.fillRect(28, y, 8, 16); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding;
    texCache.track = t; return t;
  };

  SM.windowTexture = function (night) {
    const k = 'win' + (night ? 1 : 0);
    if (texCache[k]) return texCache[k];
    const c = canvas(128, 128), ctx = c.getContext('2d'), r = SM.rng(77);
    ctx.fillStyle = '#4a4c4e'; ctx.fillRect(0, 0, 128, 128);
    for (let y = 4; y < 128; y += 16) for (let x = 4; x < 128; x += 12) {
      const lit = r() < (night ? 0.22 : 0.05);
      ctx.fillStyle = lit ? (r() < 0.5 ? '#ffd890' : '#bfe4ff') : (r() < 0.3 ? '#15181b' : '#26292c');
      ctx.fillRect(x, y, 7, 10);
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding;
    texCache[k] = t; return t;
  };

  SM.spriteTexture = function () {
    if (texCache.sprite) return texCache.sprite;
    const c = canvas(64, 64), ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.65)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    const t = new T.CanvasTexture(c); texCache.sprite = t; return t;
  };
  SM.smokeTexture = function () {
    if (texCache.smoke) return texCache.smoke;
    const c = canvas(64, 64), ctx = c.getContext('2d'), r = SM.rng(5);
    for (let i = 0; i < 14; i++) {
      const x = 20 + r() * 24, y = 20 + r() * 24, rad = 10 + r() * 14;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    }
    const t = new T.CanvasTexture(c); texCache.smoke = t; return t;
  };
  SM.labelTexture = function (text, color) {
    const c = canvas(64, 64), ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(10,14,20,0.75)'; ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 32, 34);
    const t = new T.CanvasTexture(c); return t;
  };
  SM.detailTexture = function () {
    if (texCache.detail) return texCache.detail;
    const S = 256, c = canvas(S, S), ctx = c.getContext('2d'), r = SM.rng(99);
    ctx.fillStyle = '#dedede'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) { const v = 175 + Math.floor(r() * 80); ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.6)'; ctx.fillRect(r() * S, r() * S, 1 + r() * 3, 1 + r() * 3); }
    noise(ctx, S, r, 26);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8;
    texCache.detail = t; return t;
  };
})();
