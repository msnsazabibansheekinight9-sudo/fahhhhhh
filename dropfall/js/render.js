// Dropfall — renderer: terrain, units, effects, lighting, weather, HUD.
'use strict';
(function () {
  const U = DF.U, S = DF.Sim, W = DF.WORLD;
  const R = DF.Render = {};
  const TAU = Math.PI * 2;
  let cv, ctx, dark, dctx, Wd = 0, Ht = 0, dpr = 1;
  const tmp = [];
  let weather = [];

  R.init = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    dark = document.createElement('canvas'); dctx = dark.getContext('2d');
    R.resize();
  };
  R.resize = function () {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    Wd = window.innerWidth; Ht = window.innerHeight;
    cv.width = Math.round(Wd * dpr); cv.height = Math.round(Ht * dpr);
    dark.width = Math.round(Wd / 2); dark.height = Math.round(Ht / 2);
  };
  R.size = () => ({ w: Wd, h: Ht });

  R.screenToWorld = function (sx, sy) { const c = DF.G.cam; return { x: (sx - Wd / 2) / c.z + c.x, y: (sy - Ht / 2) / c.z + c.y }; };
  R.worldToScreen = function (x, y) { const c = DF.G.cam; return { x: (x - c.x) * c.z + Wd / 2, y: (y - c.y) * c.z + Ht / 2 }; };

  // ---------------------------------------------------------------- camera
  R.updateCamera = function (dt, mouse) {
    const g = DF.G, P = g.player, c = g.cam;
    let base = Math.min(Wd, Ht) / 720;
    if (P.veh) base *= 0.8;
    const w = P.weapons[P.cur];
    if (P.aimDown && w && (w.d.range >= 1000)) base *= 0.82;
    c.z = U.lerp(c.z || base, base, Math.min(1, dt * 3));
    let tx = P.x, ty = P.y;
    if (!P.alive && !P.arriving) { tx = c.x; ty = c.y; }
    if (P.arriving) { const pod = g.pods.find(p => p.payload.diver === P); if (pod) { tx = pod.x; ty = pod.y; } }
    if (P.alive && mouse) { tx += (mouse.x - Wd / 2) / c.z * 0.22; ty += (mouse.y - Ht / 2) / c.z * 0.22; }
    c.x = U.lerp(c.x || tx, tx, Math.min(1, dt * 7)); c.y = U.lerp(c.y || ty, ty, Math.min(1, dt * 7));
  };

  // ---------------------------------------------------------------- frame
  R.draw = function (mouse, showMap) {
    const g = DF.G, M = g.M, c = g.cam;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0c0e'; ctx.fillRect(0, 0, Wd, Ht);
    const sh = g.shake > 0.3 ? g.shake : 0, shx = sh ? U.rand(-sh, sh) : 0, shy = sh ? U.rand(-sh, sh) : 0;
    ctx.setTransform(dpr * c.z, 0, 0, dpr * c.z, dpr * (Wd / 2 - c.x * c.z + shx), dpr * (Ht / 2 - c.y * c.z + shy));
    const vx0 = c.x - Wd / 2 / c.z - 60, vy0 = c.y - Ht / 2 / c.z - 60, vx1 = c.x + Wd / 2 / c.z + 60, vy1 = c.y + Ht / 2 / c.z + 60;
    const view = { x0: vx0, y0: vy0, x1: vx1, y1: vy1 };
    const vis = (x, y, r) => x + r > vx0 && x - r < vx1 && y + r > vy0 && y - r < vy1;

    drawGround(M, view);
    const obs = M.grid.query(vx0, vy0, vx1, vy1, tmp).slice();
    for (const o of obs) if (!o.block) drawFlatObstacle(o, g.t);
    // areas on the ground
    for (const a of g.areas) if (vis(a.x, a.y, a.r)) drawArea(a, g.t);
    for (const t of g.telegraphs) if (vis(t.x, t.y, t.r)) { ctx.fillStyle = t.col; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.fill(); ctx.strokeStyle = t.col.replace(/[\d.]+\)$/, '0.8)'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.x, t.y, t.r * Math.max(0, Math.min(1, 1 - t.t / 3)), 0, TAU); ctx.stroke(); }
    // structures
    for (const st of M.structs) if (vis(st.x, st.y, 200)) drawStruct(st, g);
    for (const n of g.novas) if (n.alive) drawNova(n, g.t);
    if (g.corpses) for (const k of g.corpses) if (vis(k.x, k.y, k.r)) drawCorpse(k);
    for (const m of g.mines) if (m.alive && vis(m.x, m.y, 10)) { ctx.fillStyle = m.type === 'at' ? '#3d4234' : '#4a4a3c'; ctx.beginPath(); ctx.arc(m.x, m.y, m.type === 'at' ? 6 : 4, 0, TAU); ctx.fill(); ctx.fillStyle = m.armed ? (Math.sin(g.t * 8 + m.x) > 0 ? '#ff4a3a' : '#5a1a14') : '#ffd27a'; ctx.beginPath(); ctx.arc(m.x, m.y, 1.6, 0, TAU); ctx.fill(); }
    for (const it of g.items) if (it.alive && vis(it.x, it.y, 20)) drawItem(it, g.t);
    for (const s of g.sentries) if (s.alive && s.st !== 'dome' && vis(s.x, s.y, 30)) drawSentry(s);
    for (const v of g.vehicles) if (v.alive && vis(v.x, v.y, 60)) drawVehicle(v, g.t);
    for (const col of g.colonists) if (col.alive && vis(col.x, col.y, 12)) drawColonist(col);
    // units
    for (const e of g.enemies) if (!e.dead && !e.def.flying && vis(e.x, e.y, e.r * 3)) drawEnemy(e, g.t);
    for (const d of g.divers) if (d.alive && !d.veh && vis(d.x, d.y, 30)) drawDiver(d, g.t);
    // blocking terrain on top of the ground layer
    for (const o of obs) if (o.block) drawObstacle(o, M);
    for (const s of g.sentries) if (s.alive && s.st === 'dome') drawDome(s, g.t);
    // projectiles
    for (const p of g.projs) if (vis(p.x, p.y, 20)) drawProj(p);
    for (const o of g.throws) drawThrown(o, g.t);
    for (const b of g.beacons) drawBeacon(b, g.t);
    for (const L of g.lasers) drawOrbLaser(L, g.t);
    if (g.spikes) for (const s of g.spikes) drawSpike(s);
    if (g.rifts) for (const r of g.rifts) drawRift(r, g.t);
    for (const p of g.pods) drawPod(p);
    // particles
    for (const p of g.parts) if (vis(p.x, p.y, p.size)) drawPart(p);
    for (const b of g.beams) drawBeam(b);
    // tree canopies over units
    const P = g.player;
    for (const o of obs) if (o.canopy) drawCanopy(o, P, M);
    // flying things
    for (const e of g.enemies) if (!e.dead && e.def.flying && vis(e.x, e.y, e.r * 3)) drawEnemy(e, g.t);
    for (const t of g.tornadoes) if (vis(t.x, t.y, 80)) drawTornado(t, g.t);
    for (const f of g.flyovers) drawRaptor(f.x, f.y, Math.atan2(f.vy, f.vx), 1);
    for (const s of g.dropships) drawEnemyShip(s);
    drawExtractShip(g);
    // light flashes (additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const f of g.flashes) { const k = f.t / f.T; const gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r); gr.addColorStop(0, hexA(f.col, 0.55 * k)); gr.addColorStop(1, hexA(f.col, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';

    // biome tint
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (M.biome.tint) { ctx.fillStyle = M.biome.tint; ctx.fillRect(0, 0, Wd, Ht); }
    drawDarkness(g);
    drawWeather(g, 1 / 60);
    drawHUD(g, mouse);
    if (showMap) R.drawMap(g, true);
  };

  function hexA(col, a) {
    if (col[0] === '#') { const n = parseInt(col.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')'; }
    return col;
  }
  function shade(col, f) {
    const n = parseInt(col.slice(1), 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  R.shade = shade; R.hexA = hexA;

  // ---------------------------------------------------------------- ground
  function drawGround(M, v) {
    const T = 512;
    for (let tx = Math.floor(Math.max(0, v.x0) / T); tx * T < Math.min(W, v.x1); tx++)
      for (let ty = Math.floor(Math.max(0, v.y0) / T); ty * T < Math.min(W, v.y1); ty++) ctx.drawImage(M.groundTile, tx * T, ty * T, T + 1, T + 1);
    // only the visible window of the coarse layers
    const x0 = Math.max(0, v.x0), y0 = Math.max(0, v.y0), x1 = Math.min(W, v.x1), y1 = Math.min(W, v.y1);
    if (x1 > x0 && y1 > y0) {
      const mk = 96 / W, dk = M.decal.width / W;
      ctx.globalAlpha = 0.55; ctx.imageSmoothingEnabled = true;
      ctx.drawImage(M.macro, x0 * mk, y0 * mk, (x1 - x0) * mk, (y1 - y0) * mk, x0, y0, x1 - x0, y1 - y0);
      ctx.globalAlpha = 1;
      ctx.drawImage(M.decal, x0 * dk, y0 * dk, (x1 - x0) * dk, (y1 - y0) * dk, x0, y0, x1 - x0, y1 - y0);
    }
    // world edge
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-2000, -2000, W + 4000, 2000 + M.edge); ctx.fillRect(-2000, W - M.edge, W + 4000, 2000);
    ctx.fillRect(-2000, M.edge, 2000 + M.edge, W - M.edge * 2); ctx.fillRect(W - M.edge, M.edge, 2000, W - M.edge * 2);
  }

  function rockPath(o, scale) {
    ctx.beginPath();
    const n = o.pts.length;
    for (let i = 0; i <= n; i++) { const a = i / n * TAU + o.seed * 6, r = o.r * o.pts[i % n] * (scale || 1); const x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
  }

  function drawFlatObstacle(o, t) {
    switch (o.kind) {
      case 'bush': { ctx.fillStyle = 'rgba(30,50,25,0.75)'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * 1.1 + o.seed * 9, r = o.r * 0.55, cx = o.x + Math.cos(a) * r * 0.6, cy = o.y + Math.sin(a) * r * 0.6; ctx.moveTo(cx + r * 0.7, cy); ctx.arc(cx, cy, r * 0.7, 0, TAU); } ctx.fill(); ctx.fillStyle = 'rgba(70,100,50,0.5)'; ctx.beginPath(); ctx.arc(o.x - 4, o.y - 4, o.r * 0.45, 0, TAU); ctx.fill(); break; }
      case 'lava': { const gr = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r); gr.addColorStop(0, '#ffcf5a'); gr.addColorStop(0.5, '#ff6a1a'); gr.addColorStop(0.9, '#8a1e08'); gr.addColorStop(1, 'rgba(40,10,5,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r, o.r * 0.8, o.seed * 3, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,220,120,' + (0.3 + Math.sin(t * 2 + o.seed * 10) * 0.2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r * 0.5, o.r * 0.35, o.seed * 3 + t * 0.2, 0, TAU); ctx.stroke(); break; }
      case 'pool': { const isMarsh = DF.G.M.biomeId === 'marsh'; ctx.fillStyle = isMarsh ? 'rgba(60,80,40,0.8)' : 'rgba(60,90,110,0.7)'; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r, o.r * 0.75, o.seed * 3, 0, TAU); ctx.fill(); ctx.strokeStyle = isMarsh ? 'rgba(140,170,80,0.3)' : 'rgba(200,230,255,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(o.x + Math.sin(t + o.seed * 9) * 5, o.y, o.r * 0.6, o.r * 0.4, o.seed * 3, 0, TAU); ctx.stroke(); break; }
      case 'crater': { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0.1, Math.PI * 0.9); ctx.stroke(); break; }
    }
  }

  function drawObstacle(o, M) {
    const b = M.biome;
    switch (o.kind) {
      case 'rock': case 'icerock': case 'basalt': case 'mesa': case 'crystal': {
        const base = o.kind === 'icerock' ? '#a9bcc8' : o.kind === 'basalt' ? '#2b2524' : o.kind === 'crystal' ? '#7a5fd0' : o.kind === 'mesa' ? shade(b.g2, -0.25) : shade(b.g2, -0.35);
        ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.save(); ctx.translate(6, 8); rockPath(o); ctx.fill(); ctx.restore();
        ctx.fillStyle = base; rockPath(o); ctx.fill();
        ctx.fillStyle = o.kind === 'crystal' ? 'rgba(220,200,255,0.45)' : 'rgba(255,255,255,0.13)'; rockPath(o, 0.62); ctx.fill();
        if (o.kind === 'crystal') { ctx.strokeStyle = 'rgba(230,215,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(o.x - o.r * 0.4, o.y + o.r * 0.3); ctx.lineTo(o.x, o.y - o.r * 0.5); ctx.lineTo(o.x + o.r * 0.3, o.y + o.r * 0.2); ctx.stroke(); }
        if (o.kind === 'mesa') { ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 3; rockPath(o, 0.85); ctx.stroke(); }
        break;
      }
      case 'bones': { ctx.strokeStyle = '#d8ccb0'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(o.x - o.r, o.y); ctx.lineTo(o.x + o.r, o.y); ctx.stroke(); ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(o.x + i * o.r * 0.35, o.y, o.r * 0.6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); } ctx.lineCap = 'butt'; break; }
      case 'tree': case 'pine': { ctx.fillStyle = '#3b2a1c'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill(); break; }
      case 'deadtree': { ctx.strokeStyle = '#2e2620'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.3 + o.seed * 7; ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + Math.cos(a) * o.r * 2.6, o.y + Math.sin(a) * o.r * 2.6); } ctx.stroke(); ctx.fillStyle = '#3a3029'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill(); ctx.lineCap = 'butt'; break; }
      case 'building': {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(o.x + 8, o.y + 10, o.w, o.h);
        ctx.fillStyle = '#5d6168'; ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#4a4e55'; ctx.fillRect(o.x + 6, o.y + 6, o.w - 12, o.h - 12);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.x + 6, o.y + o.h / 2); ctx.lineTo(o.x + o.w - 6, o.y + o.h / 2); ctx.stroke();
        ctx.fillStyle = '#3a3d42'; ctx.fillRect(o.x + o.w * 0.2, o.y + o.h * 0.2, 14, 10); ctx.fillRect(o.x + o.w * 0.65, o.y + o.h * 0.6, 18, 12);
        if (o.seed > 0.5) { ctx.fillStyle = 'rgba(20,20,20,0.5)'; ctx.beginPath(); ctx.arc(o.x + o.w * o.seed, o.y + o.h * 0.3, 14, 0, TAU); ctx.fill(); }
        break;
      }
      case 'ruin': { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(o.x + 5, o.y + 6, o.w, o.h); ctx.fillStyle = '#6c6e70'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.fillStyle = '#7c7e80'; ctx.fillRect(o.x + 2, o.y + 2, o.w - 4, Math.min(5, o.h - 4)); break; }
      case 'wreck': { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(o.x + 5, o.y + 6, o.w, o.h); ctx.fillStyle = '#4b4a46'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.fillStyle = '#5f5d57'; ctx.fillRect(o.x + 4, o.y + 4, o.w * 0.5, o.h - 8); ctx.fillStyle = '#2a2826'; ctx.fillRect(o.x + o.w * 0.65, o.y + 5, o.w * 0.25, o.h - 10); break; }
    }
  }

  function drawCanopy(o, P, M) {
    const under = P.alive && Math.hypot(P.x - o.x, P.y - o.y) < o.canopy;
    ctx.globalAlpha = under ? 0.35 : 0.92;
    const dark = M.biomeId === 'tundra' ? '#2f4a3c' : M.biomeId === 'jungle' ? '#24401d' : '#34502a';
    const lite = M.biomeId === 'tundra' ? '#dfe8ec' : '#4a7034';
    if (o.kind === 'pine') {
      for (let k = 3; k >= 1; k--) { ctx.fillStyle = k === 1 && M.biomeId === 'tundra' ? lite : shade(dark, (3 - k) * 0.1); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + o.seed, r = o.canopy * k / 3 * (i % 2 ? 0.7 : 1); ctx.lineTo(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
    } else {
      ctx.fillStyle = dark;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + o.seed * 9, cx = o.x + Math.cos(a) * o.canopy * 0.45, cy = o.y + Math.sin(a) * o.canopy * 0.45; ctx.moveTo(cx + o.canopy * 0.55, cy); ctx.arc(cx, cy, o.canopy * 0.55, 0, TAU); }
      ctx.fill('nonzero');
      ctx.fillStyle = lite; ctx.globalAlpha *= 0.6; ctx.beginPath(); ctx.arc(o.x - o.canopy * 0.2, o.y - o.canopy * 0.2, o.canopy * 0.4, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawArea(a, t) {
    const k = Math.min(1, a.t / 1.5);
    if (a.kind === 'fire') { const gr = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r); gr.addColorStop(0, 'rgba(255,140,40,' + 0.35 * k + ')'); gr.addColorStop(1, 'rgba(120,30,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, TAU); ctx.fill(); }
    else if (a.kind === 'gas') { for (let i = 0; i < 5; i++) { const ang = i * 1.3 + t * 0.3, r = a.r * 0.4; ctx.fillStyle = 'rgba(170,200,70,' + 0.13 * k + ')'; ctx.beginPath(); ctx.arc(a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r, a.r * 0.7, 0, TAU); ctx.fill(); } }
    else if (a.kind === 'smoke') { for (let i = 0; i < 6; i++) { const ang = i * 1.1 + t * 0.15 + a.x, r = a.r * 0.35; ctx.fillStyle = 'rgba(190,190,185,' + 0.28 * k + ')'; ctx.beginPath(); ctx.arc(a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r, a.r * 0.75, 0, TAU); ctx.fill(); } }
  }

  // ---------------------------------------------------------------- structures
  function drawStruct(st, g) {
    const t = g.t;
    ctx.save(); ctx.translate(st.x, st.y);
    switch (st.type) {
      case 'spawner': {
        const f = st.faction;
        if (!st.alive) { ctx.fillStyle = 'rgba(20,18,15,0.7)'; ctx.beginPath(); ctx.arc(0, 0, st.r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(80,70,60,0.8)'; ctx.beginPath(); ctx.arc(0, 0, st.r * 0.6, 0, TAU); ctx.fill(); break; }
        if (f === 'brood') {
          ctx.fillStyle = '#5a4126'; ctx.beginPath(); ctx.arc(0, 0, st.r + 8, 0, TAU); ctx.fill();
          ctx.fillStyle = '#120c06'; ctx.beginPath(); ctx.arc(0, 0, st.r, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(166,216,58,' + (0.4 + Math.sin(t * 3 + st.x) * 0.2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, st.r - 4, 0, TAU); ctx.stroke();
          ctx.fillStyle = '#8a6a3a'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + st.x; ctx.beginPath(); ctx.ellipse(Math.cos(a) * (st.r + 6), Math.sin(a) * (st.r + 6), 6, 3, a, 0, TAU); ctx.fill(); }
        } else if (f === 'foundry') {
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-st.r + 5, -st.r + 6, st.r * 2, st.r * 2);
          ctx.fillStyle = '#4a4744'; ctx.fillRect(-st.r, -st.r, st.r * 2, st.r * 2);
          ctx.fillStyle = '#33312f'; ctx.fillRect(-st.r + 4, -st.r + 4, st.r * 2 - 8, st.r * 2 - 8);
          ctx.fillStyle = 'rgba(255,' + (60 + Math.sin(t * 4 + st.y) * 30 | 0) + ',30,0.9)'; ctx.fillRect(-st.r * 0.5, -4, st.r, 8);
          ctx.fillStyle = '#22201f'; ctx.beginPath(); ctx.arc(st.r * 0.5, -st.r * 0.5, 6, 0, TAU); ctx.fill();
          if (Math.random() < 0.08) S.part(st.x + st.r * 0.5, st.y - st.r * 0.5, U.rand(-5, 5), -30, 1.5, 5, 'rgba(60,60,60,0.5)', { grow: 10, kind: 'smoke' });
        } else {
          const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, st.r + 10); gr.addColorStop(0, 'rgba(230,220,255,0.9)'); gr.addColorStop(0.4, 'rgba(140,110,255,0.6)'); gr.addColorStop(1, 'rgba(60,30,140,0)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, st.r + 10, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(200,180,255,0.8)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, st.r * (0.4 + i * 0.25), t * (1 + i) + i, t * (1 + i) + i + 2.5); ctx.stroke(); }
        }
        break;
      }
      case 'terminal': {
        ctx.fillStyle = '#2d3238'; ctx.fillRect(-16, -12, 32, 24);
        ctx.fillStyle = st.state === 'done' ? '#3a8a4a' : st.state === 'defend' || st.state === 'launch' ? '#d8a33a' : '#3a7ab8'; ctx.fillRect(-11, -8, 22, 10);
        ctx.fillStyle = '#4a5058'; ctx.fillRect(-26, -26, 12, 52); ctx.fillRect(14, -26, 12, 52);
        if (st.state !== 'idle') { const k = st.state === 'defend' ? st.holdT / st.need : 1; ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 40, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); ctx.strokeStyle = 'rgba(255,210,122,0.25)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(0, 0, 280, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        if (st.state === 'launch' || st.state === 'done') { ctx.fillStyle = '#c8c4b8'; ctx.fillRect(-5, -60 - (st.state === 'done' ? 400 : (3 - st.launchT) * 120), 10, 30); }
        break;
      }
      case 'radar': {
        ctx.fillStyle = '#3a3f45'; ctx.fillRect(-14, -14, 28, 28);
        ctx.rotate(st.state === 'done' ? t : 0.6); ctx.strokeStyle = '#9aa4ae'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 22, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 0); ctx.stroke();
        break;
      }
      case 'jammer': case 'aa': case 'artillery': {
        if (!st.alive) { ctx.fillStyle = '#2a2724'; ctx.beginPath(); ctx.arc(0, 0, st.r, 0, TAU); ctx.fill(); ctx.fillStyle = '#4a443c'; ctx.fillRect(-12, -6, 24, 12); break; }
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(5, 6, st.r, 0, TAU); ctx.fill();
        ctx.fillStyle = st.flash > 0 ? '#ffffff' : '#45403a'; ctx.beginPath(); ctx.arc(0, 0, st.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2e2a26'; ctx.beginPath(); ctx.arc(0, 0, st.r * 0.7, 0, TAU); ctx.fill();
        if (st.type === 'jammer') { ctx.strokeStyle = 'rgba(255,80,60,' + (0.5 - ((t * 0.8) % 1) * 0.5) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, st.r + ((t * 0.8) % 1) * 160, 0, TAU); ctx.stroke(); ctx.fillStyle = '#ff4a3a'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,80,60,0.15)'; ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.arc(0, 0, 520, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        if (st.type === 'aa') { ctx.rotate(Math.sin(t * 0.5) * 1.5); ctx.fillStyle = '#5a554d'; ctx.fillRect(-4, -st.r - 14, 4, st.r + 6); ctx.fillRect(3, -st.r - 14, 4, st.r + 6); ctx.fillStyle = '#ff4a3a'; ctx.fillRect(-10, -4, 20, 8); }
        if (st.type === 'artillery') { ctx.rotate(-0.8); ctx.fillStyle = '#5a554d'; ctx.fillRect(-5, -st.r - 30, 10, st.r + 24); ctx.fillStyle = '#ff4a3a'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill(); }
        // hp bar
        ctx.setTransform(ctx.getTransform()); break;
      }
      case 'extract': {
        const ex = g.M.extract;
        ctx.strokeStyle = 'rgba(255,210,122,0.5)'; ctx.lineWidth = 3; ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.arc(0, 0, ex.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#3a3c3e'; ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#d8a33a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 36, 0, TAU); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.fillStyle = (ex.state !== 'idle' && Math.floor(t * 4 + i) % 2) ? '#ffd27a' : '#6a5a3a'; ctx.beginPath(); ctx.arc(Math.cos(a) * 50, Math.sin(a) * 50, 3, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#2d3238'; ctx.fillRect(60, -10, 20, 20); ctx.fillStyle = '#3a7ab8'; ctx.fillRect(63, -6, 14, 8);
        break;
      }
      case 'shelter': {
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-46, -36, 100, 76);
        ctx.fillStyle = '#5b5e5a'; ctx.fillRect(-50, -40, 100, 76); ctx.fillStyle = '#4a4d49'; ctx.fillRect(-42, -32, 84, 60);
        ctx.fillStyle = st.state === 'open' ? '#1a1a1a' : '#8a7a4a'; ctx.fillRect(-14, 28, 28, 10);
        ctx.fillStyle = '#d8a33a'; ctx.fillRect(-4, -4, 8, 8);
        break;
      }
      case 'shuttle': {
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(6, 8, 50, 26, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c9c4b5'; ctx.beginPath(); ctx.moveTo(-50, -20); ctx.lineTo(40, -20); ctx.lineTo(56, 0); ctx.lineTo(40, 20); ctx.lineTo(-50, 20); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2f5f7a'; ctx.fillRect(28, -10, 14, 20); ctx.fillStyle = '#8a8676'; ctx.fillRect(-46, -26, 30, 52);
        break;
      }
      case 'frigate': {
        ctx.rotate(0.4);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-90, -24, 190, 56);
        ctx.fillStyle = '#5a5c5e'; ctx.beginPath(); ctx.moveTo(-100, -26); ctx.lineTo(70, -30); ctx.lineTo(100, 0); ctx.lineTo(70, 30); ctx.lineTo(-100, 26); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3e4042'; ctx.fillRect(-80, -16, 60, 32); ctx.fillStyle = '#232425'; ctx.beginPath(); ctx.arc(30, 6, 16, 0, TAU); ctx.fill();
        if (Math.random() < 0.15) S.part(st.x + U.rand(-30, 30), st.y + U.rand(-10, 10), U.rand(-5, 5), -25, 2, 6, 'rgba(50,50,50,0.45)', { grow: 12, kind: 'smoke' });
        break;
      }
      case 'node': {
        if (!st.alive) { ctx.fillStyle = '#1e1a17'; ctx.beginPath(); ctx.arc(0, 0, st.r * 1.3, 0, TAU); ctx.fill(); break; }
        const f = g.M.faction;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(8, 10, st.r, 0, TAU); ctx.fill();
        ctx.fillStyle = f === 'brood' ? '#6a4a2a' : f === 'foundry' ? '#3a3836' : '#2e2650'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.lineTo(Math.cos(a) * st.r, Math.sin(a) * st.r); } ctx.closePath(); ctx.fill();
        ctx.fillStyle = f === 'brood' ? '#a6d83a' : f === 'foundry' ? '#ff3b2f' : '#b39cff'; ctx.globalAlpha = 0.6 + Math.sin(t * 2) * 0.3; ctx.beginPath(); ctx.arc(0, 0, st.r * 0.35, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,210,122,0.3)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 230, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        break;
      }
    }
    ctx.restore();
    if (st.hp != null && st.alive && st.hp < st.maxhp) bar(st.x, st.y - st.r - 12, 50, st.hp / st.maxhp, '#ff6b5a');
  }

  function drawNova(n, t) {
    ctx.save(); ctx.translate(n.x, n.y);
    ctx.fillStyle = '#d8d2c0'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 26, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-16, -4, 32, 8);
    ctx.fillStyle = n.state === 'armed' ? (Math.floor(t * 4) % 2 ? '#ff3a2a' : '#5a1a14') : '#ffd27a'; ctx.beginPath(); ctx.arc(0, -14, 4, 0, TAU); ctx.fill();
    if (n.state === 'armed') { ctx.strokeStyle = 'rgba(255,60,40,0.4)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(0, 0, 300, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Chakra Petch", monospace'; ctx.textAlign = 'center'; ctx.fillText(Math.ceil(n.t), 0, -36); }
    ctx.restore();
  }

  function drawCorpse(k) {
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.ang); ctx.globalAlpha = Math.min(1, k.t / 4) * 0.8;
    if (k.diver) { ctx.fillStyle = shade(k.armor.main, -0.4); ctx.beginPath(); ctx.ellipse(0, 0, 12, 9, 0, 0, TAU); ctx.fill(); }
    else { const d = k.def; ctx.fillStyle = shade(d.col, -0.5); ctx.beginPath(); ctx.ellipse(0, 0, k.r * 1.1, k.r * 0.8, 0, 0, TAU); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function bar(x, y, w, k, col) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5); ctx.fillStyle = col; ctx.fillRect(x - w / 2, y, w * U.clamp(k, 0, 1), 3); }

  // ---------------------------------------------------------------- items, sentries, vehicles
  function drawItem(it, t) {
    ctx.save(); ctx.translate(it.x, it.y);
    const bob = Math.sin(t * 3 + it.x) * 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.25 + Math.sin(t * 4) * 0.15) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.stroke();
    switch (it.kind) {
      case 'weapon': ctx.rotate(0.5); ctx.fillStyle = '#2c2e30'; ctx.fillRect(-14, -3 + bob, 28, 6); ctx.fillStyle = '#d8a33a'; ctx.fillRect(-14, -3 + bob, 6, 6); break;
      case 'pack': ctx.fillStyle = '#4a5240'; ctx.fillRect(-8, -9 + bob, 16, 18); ctx.fillStyle = it.pack.type === 'shield' ? '#76c6ff' : '#d8a33a'; ctx.fillRect(-5, -6 + bob, 10, 4); break;
      case 'supply': ctx.fillStyle = '#6a6040'; ctx.fillRect(-11, -8, 22, 16); ctx.fillStyle = '#d8a33a'; ctx.fillRect(-11, -2, 22, 4); ctx.fillStyle = '#e8e2c8'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText(it.charges, 0, -11); break;
      case 'blackbox': ctx.fillStyle = '#e07a2a'; ctx.fillRect(-9, -7 + bob, 18, 14); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-6, -3 + bob, 12, 6); break;
      case 'sample': { const c = it.tier === 'c' ? '#7fd0ff' : it.tier === 'r' ? '#ff9a3a' : '#e06bff'; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -8 + bob); ctx.lineTo(6, bob); ctx.lineTo(0, 8 + bob); ctx.lineTo(-6, bob); ctx.closePath(); ctx.fill(); break; }
      case 'shard': ctx.fillStyle = '#b39cff'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t; ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7 + bob); } ctx.closePath(); ctx.fill(); break;
      case 'medal': ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(0, bob, 7, 0, TAU); ctx.fill(); ctx.fillStyle = '#8a6a2a'; ctx.beginPath(); ctx.arc(0, bob, 3.5, 0, TAU); ctx.fill(); break;
      case 'credit': ctx.fillStyle = '#c9c2a8'; ctx.fillRect(-8, -5 + bob, 16, 10); ctx.fillStyle = '#6a6450'; ctx.fillRect(-3, -3 + bob, 6, 6); break;
    }
    ctx.restore();
  }

  function drawSentry(s) {
    const d = s.d;
    ctx.save(); ctx.translate(s.x, s.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(4, 5, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a3d38'; for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; ctx.fillRect(Math.cos(a) * 12 - 3, Math.sin(a) * 12 - 3, 6, 6); }
    ctx.fillStyle = s.flash > 0 ? '#fff' : d.col; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
    ctx.rotate(s.ang);
    ctx.fillStyle = '#2a2c2a';
    if (s.st === 'tesla') { ctx.fillStyle = '#6fb6ff'; ctx.beginPath(); ctx.arc(0, 0, 6 + Math.random() * 2, 0, TAU); ctx.fill(); }
    else if (s.st === 'mortar' || s.st === 'emsmortar') { ctx.fillRect(-4, -4, 18, 8); ctx.fillStyle = s.st === 'emsmortar' ? '#6fb6ff' : '#d8a33a'; ctx.fillRect(10, -4, 4, 8); }
    else if (s.st === 'rocket') { ctx.fillRect(0, -8, 16, 6); ctx.fillRect(0, 2, 16, 6); ctx.fillStyle = '#d8a33a'; ctx.fillRect(14, -8, 3, 16); }
    else if (s.st === 'gatling') { ctx.rotate(0); ctx.fillRect(0, -4, 22, 8); ctx.fillStyle = '#555'; ctx.fillRect(18, -4 + Math.sin(DF.G.t * 50 * s.spin) * 2, 6, 3); }
    else if (s.st === 'ac') { ctx.fillRect(0, -3, 26, 6); ctx.fillRect(-6, -7, 10, 14); }
    else if (s.st === 'flame') { ctx.fillRect(0, -3, 16, 6); ctx.fillStyle = '#ff7a2a'; ctx.fillRect(14, -2, 3, 4); }
    else { ctx.fillRect(0, -2.5, 20, 5); }
    ctx.restore();
    bar(s.x, s.y + 18, 26, s.ammo / s.maxAmmo, '#ffd27a');
    if (s.hp < s.maxhp) bar(s.x, s.y + 23, 26, s.hp / s.maxhp, '#9fe07a');
  }

  function drawDome(s, t) {
    const k = Math.min(1, s.life / 2);
    ctx.fillStyle = 'rgba(118,198,255,' + (0.08 + (s.flash > 0 ? 0.12 : 0)) * k + ')'; ctx.strokeStyle = 'rgba(160,220,255,' + 0.6 * k + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(160,220,255,' + 0.15 * k + ')'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.3 + i * 0.18), t + i, t + i + 1.5); ctx.stroke(); }
    ctx.fillStyle = '#3a4a58'; ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, TAU); ctx.fill();
  }

  function drawVehicle(v, t) {
    const d = v.d;
    ctx.save(); ctx.translate(v.x, v.y);
    if (v.vt === 'buggy') {
      ctx.rotate(v.ang);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-22, -14, 50, 32);
      ctx.fillStyle = '#1e1e1e'; for (const [x, y] of [[-16, -16], [12, -16], [-16, 12], [12, 12]]) ctx.fillRect(x, y, 12, 5);
      ctx.fillStyle = v.flash > 0 ? '#fff' : d.col; ctx.fillRect(-24, -13, 48, 26);
      ctx.fillStyle = shade(d.col, -0.3); ctx.fillRect(-18, -10, 22, 20);
      ctx.fillStyle = '#283c48'; ctx.fillRect(8, -10, 10, 20);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.strokeRect(-18, -10, 22, 20);
      ctx.rotate(v.turret - v.ang); ctx.fillStyle = '#3a3a36'; ctx.beginPath(); ctx.arc(-6, 0, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#222'; ctx.fillRect(-6, -1.5, 20, 3);
    } else {
      ctx.rotate(v.ang);
      const step = Math.sin(v.walk * 4) * 6;
      ctx.fillStyle = '#2a2c28'; ctx.fillRect(-8 + step, -20, 16, 8); ctx.fillRect(-8 - step, 12, 16, 8);
      ctx.rotate(v.aim - v.ang);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-14, -16, 32, 36);
      ctx.fillStyle = v.flash > 0 ? '#fff' : d.col; ctx.fillRect(-16, -18, 30, 36);
      ctx.fillStyle = shade(d.col, -0.25); ctx.fillRect(-12, -12, 18, 24);
      ctx.fillStyle = '#2c4a5a'; ctx.fillRect(6, -6, 6, 12);
      ctx.fillStyle = '#2e302c';
      if (v.vt === 'exo2') { ctx.fillRect(4, -22, 26, 6); ctx.fillRect(4, 16, 26, 6); }
      else { ctx.fillRect(4, -22, 22, 5); ctx.fillRect(-2, 14, 18, 10); ctx.fillStyle = '#d8a33a'; ctx.fillRect(12, 15, 4, 8); }
    }
    ctx.restore();
    bar(v.x, v.y - v.r - 10, 40, v.hp / v.maxhp, '#9fe07a');
    if (!v.driver) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '10px "Chakra Petch", monospace'; ctx.textAlign = 'center'; ctx.fillText('EMPTY', v.x, v.y + v.r + 14); }
  }

  function drawColonist(c) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(Math.atan2(c.vy, c.vx));
    const s = Math.sin(c.walk) * 3;
    ctx.fillStyle = '#d0c8b0'; ctx.fillRect(-3 + s, -6, 5, 3); ctx.fillRect(-3 - s, 3, 5, 3);
    ctx.fillStyle = c.flash > 0 ? '#fff' : '#d27a2a'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8d8b8'; ctx.beginPath(); ctx.arc(2, 0, 3.5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- divers
  function patternFill(pat, c1, c2, r) {
    ctx.fillStyle = c2;
    switch (pat) {
      case 'stripe': ctx.fillRect(-r, -2.5, r * 2, 5); break;
      case 'chevron': ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.7); ctx.lineTo(r * 0.3, 0); ctx.lineTo(-r * 0.6, r * 0.7); ctx.lineTo(-r * 0.2, 0); ctx.closePath(); ctx.fill(); break;
      case 'split': ctx.fillRect(-r, 0, r * 2, r); break;
      case 'camo': ctx.globalAlpha = 0.7; for (const [x, y, s] of [[-4, -5, 4], [3, 3, 3.5], [-2, 5, 3], [5, -4, 2.5]]) { ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; break;
      case 'hex': ctx.strokeStyle = c2; ctx.lineWidth = 1; for (const [x, y] of [[-4, -3], [3, -3], [0, 3]]) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3); } ctx.closePath(); ctx.stroke(); } break;
      case 'check': ctx.fillRect(-r, -r, r, r); ctx.fillRect(0, 0, r, r); break;
    }
  }

  function drawCape(capeId, swing) {
    const c = DF.CAPES[capeId]; if (!c || !c.c1) return;
    ctx.save(); ctx.rotate(swing);
    ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-24, -11); ctx.lineTo(-24, 11); ctx.lineTo(-4, 8); ctx.closePath();
    ctx.fillStyle = c.c1; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = c.c2;
    switch (c.pattern) {
      case 'stripe': ctx.fillRect(-26, -3, 24, 6); break;
      case 'chevron': ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-14, 0); ctx.lineTo(-6, 10); ctx.lineTo(-10, 10); ctx.lineTo(-18, 0); ctx.lineTo(-10, -10); ctx.fill(); break;
      case 'split': ctx.fillRect(-26, 0, 24, 12); break;
      case 'border': ctx.fillRect(-26, -12, 3, 24); ctx.fillRect(-26, -12, 24, 2); ctx.fillRect(-26, 10, 24, 2); break;
      case 'star': star(-15, 0, 5, 2.2); break;
      case 'bolt': ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(-16, 1); ctx.lineTo(-12, 1); ctx.lineTo(-18, 10); ctx.lineTo(-10, -1); ctx.lineTo(-14, -1); ctx.closePath(); ctx.fill(); break;
      case 'flame': ctx.beginPath(); ctx.moveTo(-24, -8); ctx.quadraticCurveTo(-14, -4, -20, 0); ctx.quadraticCurveTo(-12, 4, -24, 8); ctx.fill(); break;
      case 'hex': ctx.strokeStyle = c.c2; ctx.lineWidth = 1; for (const [x, y] of [[-10, -5], [-17, 0], [-10, 5]]) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.lineTo(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5); } ctx.closePath(); ctx.stroke(); } break;
    }
    ctx.restore(); ctx.restore();
  }
  function star(x, y, r1, r2) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? r2 : r1; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }

  function gunLen(w) {
    if (!w) return 12;
    const c = w.d.cls;
    if (/Pistol|Revolver/.test(c)) return 10;
    if (/Machine Gun|Anti-Materiel|Recoilless|Railgun|Autocannon|Laser Cannon|Guided|Disposable|Heavy/.test(c)) return 24;
    return 18;
  }

  R.drawEnemyIcon = function (cv, type) {
    const old = ctx; ctx = cv.getContext('2d');
    const d = DF.ENEMIES[type], sc = Math.min(2.2, 30 / (d.r * (d.draw === 'tripod' || d.draw === 'walker' ? 1.9 : 1.4)));
    ctx.fillStyle = '#16191c'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(cv.width / 2, cv.height / 2); ctx.scale(sc, sc);
    const e = { def: d, x: 0, y: 0, r: d.r, ang: -Math.PI / 2, walk: 1, id: 3, flash: 0, shield: d.shield || 0, maxShield: d.shield || 1, hp: 1, maxhp: 1, stunT: 0, callT: 0 };
    drawEnemy(e, 1);
    ctx.restore(); ctx = old;
  };
  R.drawDiverAt = function (c, d, x, y, ang, t, scale) { const old = ctx; ctx = c; drawDiverBody(d, x, y, ang, t, scale || 1); ctx = old; };

  function drawDiverBody(d, x, y, ang, t, scale) {
    const arm = d.arm;
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.rotate(ang);
    const moving = Math.hypot(d.vx || 0, d.vy || 0) > 20;
    const swing = Math.sin(t * 3 + (d.id || 0)) * 0.08 + (moving ? Math.sin(d.walk * 2) * 0.12 : 0);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(3, 4, 13, 11, 0, 0, TAU); ctx.fill();
    drawCape(d.capeId, swing);
    // feet
    const step = moving ? Math.sin(d.walk * 3) * 4 : 0;
    ctx.fillStyle = shade(arm.main, -0.45); ctx.fillRect(-3 + step, -9, 7, 4); ctx.fillRect(-3 - step, 5, 7, 4);
    // backpack
    if (d.pack) { ctx.fillStyle = d.pack.type === 'shield' ? '#4a5a6a' : d.pack.type === 'jump' ? '#5a4a3a' : '#4a5240'; ctx.fillRect(-13, -7, 6, 14); if (d.pack.type === 'jump') { ctx.fillStyle = '#ff9a3a'; ctx.fillRect(-15, -6, 2, 4); ctx.fillRect(-15, 2, 2, 4); } }
    // torso
    ctx.fillStyle = d.flash > 0 ? '#ffffff' : arm.main;
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 11, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 9, 11, 0, 0, TAU); ctx.clip(); patternFill(arm.pattern, arm.main, arm.trim, 11); ctx.restore();
    // shoulder pads by armor class
    const pad = arm.cls === 'heavy' ? 6 : arm.cls === 'medium' ? 4.5 : 3.2;
    ctx.fillStyle = arm.trim; ctx.beginPath(); ctx.arc(1, -10, pad, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(1, 10, pad, 0, TAU); ctx.fill();
    // weapon
    const w = d.weapons && d.weapons[d.cur];
    const L = gunLen(w);
    ctx.fillStyle = '#1c1d1e'; ctx.fillRect(4, 2, L, 3.5);
    if (w && w.d.slot === 'support') { ctx.fillStyle = '#3a3c3a'; ctx.fillRect(4, 1, L * 0.5, 5.5); }
    if (w && w.d.energy) { ctx.fillStyle = '#7fe3ff'; ctx.fillRect(4 + L - 4, 2, 3, 3.5); }
    ctx.fillStyle = shade(arm.main, -0.2); ctx.beginPath(); ctx.arc(6, 4, 3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(5, -4, 3, 0, TAU); ctx.fill();
    // carried cargo
    if (d.carrying) { ctx.fillStyle = '#e07a2a'; ctx.fillRect(-6, -14, 12, 8); }
    // helmet
    ctx.fillStyle = shade(arm.main, -0.12); ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = arm.visor; ctx.beginPath(); ctx.arc(1, 0, 6, -0.75, 0.75); ctx.lineTo(1, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(4, -2.5, 2, 1.5);
    ctx.restore();
  }

  function drawDiver(d, t) {
    drawDiverBody(d, d.x, d.y, d.ang, t, d.diveT > 0 ? 1.1 : d.proneT > 0 ? 0.92 : 1);
    if (d.pack && d.pack.type === 'shield' && d.pack.hp > 0) { ctx.strokeStyle = 'rgba(118,198,255,' + (0.25 + (d.pack.hit > 0 ? 0.5 : 0)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(d.x, d.y, 18, 0, TAU); ctx.stroke(); }
    if (d.pack && d.pack.type === 'dog' && d.pack.ammo > 0) { const x = d.x + (d.pack.ox || 0), y = d.y + (d.pack.oy || 0); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x + 4, y + 10, 5, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a6066'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.fillStyle = '#1c1c1c'; ctx.save(); ctx.translate(x, y); ctx.rotate(d.pack.ang || 0); ctx.fillRect(2, -1, 7, 2); ctx.restore(); }
    if (d.bot) { ctx.fillStyle = 'rgba(232,226,200,0.8)'; ctx.font = '9px "Chakra Petch", monospace'; ctx.textAlign = 'center'; ctx.fillText(d.name, d.x, d.y - 22); bar(d.x, d.y - 19, 24, d.hp / d.maxhp, '#9fe07a'); }
    if (d.invuln > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(d.x, d.y, 16, 0, TAU); ctx.stroke(); }
  }

  // ---------------------------------------------------------------- enemies
  function drawEnemy(e, t) {
    const d = e.def, r = e.r;
    ctx.save(); ctx.translate(e.x, e.y);
    if (d.flying) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(16, 26, r, r * 0.7, 0, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(3, 5, r * 1.1, r * 0.9, 0, 0, TAU); ctx.fill(); }
    ctx.rotate(e.ang);
    const col = e.flash > 0 ? '#ffffff' : d.col;
    if (e.windT > 0) { ctx.strokeStyle = 'rgba(255,80,40,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(r + 90, 0); ctx.stroke(); }
    switch (d.draw) {
      case 'bug': drawBug(e, d, r, col, t); break;
      case 'flyer': drawFlyer(e, d, r, col, t); break;
      case 'bot': drawBot(e, d, r, col, t); break;
      case 'walker': drawWalker(e, d, r, col, t); break;
      case 'tank': drawTank(e, d, r, col, t); break;
      case 'gunship': drawGunship(e, d, r, col, t); break;
      case 'thrall': drawThrall(e, d, r, col, t); break;
      case 'veil': drawVeil(e, d, r, col, t); break;
      case 'eye': drawEye(e, d, r, col, t); break;
      case 'mass': drawMass(e, d, r, col, t); break;
      case 'glider': drawGlider(e, d, r, col, t); break;
      case 'tripod': drawTripod(e, d, r, col, t); break;
    }
    if (e.aimT > 0) { ctx.strokeStyle = 'rgba(255,60,40,' + (0.8 - e.aimT) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(d.range, 0); ctx.stroke(); }
    ctx.restore();
    if (e.shield > 0) { const k = e.shield / e.maxShield; ctx.strokeStyle = 'rgba(190,175,255,' + (0.25 + k * 0.35 + (e.shieldHit > 0 ? 0.4 : 0)) + ')'; ctx.fillStyle = 'rgba(160,140,255,' + (0.06 + (e.shieldHit > 0 ? 0.12 : 0)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(e.x, e.y, r + 6, 0, TAU); ctx.fill(); ctx.stroke(); }
    if (e.stunT > 0) { ctx.strokeStyle = 'rgba(160,220,255,0.7)'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * r * 0.8, e.y + Math.sin(a) * r * 0.8 - r * 0.3, 2, 0, TAU); ctx.stroke(); } }
    if (d.tier >= 2 && e.hp < e.maxhp) bar(e.x, e.y - r - 10, Math.max(30, r * 1.6), e.hp / e.maxhp, '#ff6b5a');
    if (e.isTarget) { ctx.strokeStyle = 'rgba(255,210,122,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(e.x, e.y, r + 14, t, t + TAU); ctx.stroke(); ctx.setLineDash([]); }
  }

  function legs(n, r, len, phase, col, w) {
    ctx.strokeStyle = col; ctx.lineWidth = w || Math.max(1.5, r / 6); ctx.lineCap = 'round';
    const pairs = n / 2;
    ctx.beginPath();
    for (let i = 0; i < pairs; i++) {
      const bx = r * (0.5 - i / Math.max(1, pairs - 1)) * 0.9;
      for (const s of [-1, 1]) {
        const sw = Math.sin(phase + i * 1.7 + (s > 0 ? Math.PI : 0)) * 0.35;
        const a = s * (Math.PI / 2 + (i - (pairs - 1) / 2) * 0.35) + sw;
        const kx = bx + Math.cos(a) * r * 0.9, ky = Math.sin(a) * r * 0.9;
        const fx = kx + Math.cos(a + s * 0.5) * r * len, fy = ky + Math.sin(a + s * 0.5) * r * len;
        ctx.moveTo(bx, 0); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy);
      }
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function drawBug(e, d, r, col, t) {
    const dark = shade(d.col, -0.4), ph = e.walk * 2.2;
    if (d.legs) legs(d.legs, r, 0.75, ph, dark);
    // abdomen
    ctx.fillStyle = d.sac ? (e.flash > 0 ? '#fff' : '#a8d84a') : shade(d.col, -0.15);
    ctx.beginPath(); ctx.ellipse(-r * 0.75, 0, r * 0.8 * d.len * 0.65, r * 0.7, 0, 0, TAU); ctx.fill();
    if (d.sac) { ctx.fillStyle = 'rgba(220,255,140,' + (0.3 + Math.sin(t * 4 + e.id) * 0.15) + ')'; ctx.beginPath(); ctx.ellipse(-r * 0.75, 0, r * 0.45, r * 0.4, 0, 0, TAU); ctx.fill(); }
    // thorax
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.6, r * 0.62, 0, 0, TAU); ctx.fill();
    if (d.shell) { ctx.strokeStyle = shade(d.col, -0.5); ctx.lineWidth = Math.max(1.5, r / 8); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-r * 0.2 - i * r * 0.3, 0, r * 0.55, -1.1, 1.1); ctx.stroke(); } ctx.fillStyle = shade(d.col, 0.15); ctx.beginPath(); ctx.ellipse(r * 0.35, 0, r * 0.35, r * 0.7, 0, -Math.PI / 2, Math.PI / 2); ctx.fill(); }
    // head and mandibles
    ctx.fillStyle = shade(d.col, -0.25); ctx.beginPath(); ctx.ellipse(r * 0.7, 0, r * 0.35, r * 0.38, 0, 0, TAU); ctx.fill();
    const bite = e.atkAnim > 0 ? 0.6 : 0.3 + Math.sin(t * 8 + e.id) * 0.08;
    ctx.strokeStyle = shade(d.col, 0.3); ctx.lineWidth = Math.max(1.5, r / 7);
    ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.2); ctx.lineTo(r * 1.25, -r * bite); ctx.moveTo(r * 0.9, r * 0.2); ctx.lineTo(r * 1.25, r * bite); ctx.stroke();
    if (d.horn) { ctx.fillStyle = '#d8ccb0'; ctx.beginPath(); ctx.moveTo(r * 0.8, -r * 0.3); ctx.lineTo(r * 1.6, 0); ctx.lineTo(r * 0.8, r * 0.3); ctx.closePath(); ctx.fill(); }
    if (d.caller) { ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.2, 0, TAU); ctx.fill(); }
    if (d.atk === 'tentacle') { ctx.strokeStyle = '#8a4a5a'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.sin(t + i) * 0.3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a + 0.5) * r * 1.2, Math.sin(a + 0.5) * r * 1.2, Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6); ctx.stroke(); } }
    ctx.fillStyle = '#1a0e06'; ctx.beginPath(); ctx.arc(r * 0.85, -r * 0.15, Math.max(1, r / 10), 0, TAU); ctx.arc(r * 0.85, r * 0.15, Math.max(1, r / 10), 0, TAU); ctx.fill();
  }

  function drawFlyer(e, d, r, col, t) {
    const flap = Math.sin(t * 22 + e.id) * 0.5;
    ctx.fillStyle = 'rgba(200,170,120,0.55)';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-r * 0.6, s * r * (1.6 + flap)); ctx.lineTo(r * 0.4, s * r * (1.2 + flap)); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.45, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(d.col, -0.3); ctx.beginPath(); ctx.arc(r * 0.8, 0, r * 0.3, 0, TAU); ctx.fill();
  }

  function drawBot(e, d, r, col, t) {
    const step = Math.sin(e.walk * 2) * r * 0.3;
    ctx.fillStyle = '#1f1f20'; ctx.fillRect(-r * 0.3 + step, -r * 0.75, r * 0.6, r * 0.35); ctx.fillRect(-r * 0.3 - step, r * 0.4, r * 0.6, r * 0.35);
    if (d.vent) { ctx.fillStyle = 'rgba(255,' + (100 + Math.sin(t * 6) * 40 | 0) + ',30,0.95)'; ctx.fillRect(-r * 1.05, -r * 0.35, r * 0.3, r * 0.7); }
    if (d.pack) { ctx.fillStyle = '#3a2e26'; ctx.fillRect(-r * 1.0, -r * 0.5, r * 0.4, r); ctx.fillStyle = '#ffb07a'; ctx.fillRect(-r * 1.0, -r * 0.4, r * 0.15, r * 0.2); }
    ctx.fillStyle = col; ctx.fillRect(-r * 0.75, -r * 0.8, r * 1.4, r * 1.6);
    ctx.fillStyle = shade(d.col, -0.3); ctx.fillRect(-r * 0.55, -r * 0.6, r * 0.9, r * 1.2);
    // shoulders
    const sw = d.big ? 0.5 : 0.35;
    ctx.fillStyle = shade(d.col, 0.12); ctx.fillRect(-r * 0.4, -r * (0.8 + sw), r * 0.8, r * sw); ctx.fillRect(-r * 0.4, r * 0.8, r * 0.8, r * sw);
    // arms / guns
    ctx.fillStyle = '#18181a';
    if (d.saw) { const sp = t * 30; for (const s of [-1, 1]) { ctx.fillRect(r * 0.2, s * r * 1.0 - 2, r * 1.0, 4); ctx.strokeStyle = '#c8c0b0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r * 1.2, s * r * 1.0, r * 0.35, sp, sp + 4); ctx.stroke(); } }
    else if (d.atk === 'flame') { ctx.fillRect(r * 0.3, -r * 1.05, r * 1.1, r * 0.3); ctx.fillStyle = '#ff7a2a'; ctx.fillRect(r * 1.35, -r * 1.05, r * 0.12, r * 0.3); ctx.fillStyle = '#18181a'; ctx.fillRect(r * 0.2, r * 0.75, r * 0.6, r * 0.45); }
    else if (d.big) { ctx.fillRect(r * 0.3, -r * 1.1, r * 1.1, r * 0.35); ctx.fillRect(r * 0.3, r * 0.75, r * 1.1, r * 0.35); }
    else ctx.fillRect(r * 0.4, r * 0.15, r * 1.1, r * 0.28);
    // head with eye
    ctx.fillStyle = shade(d.col, -0.1); ctx.fillRect(r * 0.15, -r * 0.35, r * 0.55, r * 0.7);
    ctx.fillStyle = d.eye; ctx.fillRect(r * 0.55, -r * 0.18, r * 0.18, r * 0.36);
    if (d.antenna) { ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.4); ctx.lineTo(-r * 0.9, -r * 1.2); ctx.stroke(); ctx.fillStyle = '#ff3b2f'; ctx.beginPath(); ctx.arc(-r * 0.9, -r * 1.2, 2, 0, TAU); ctx.fill(); }
  }

  function drawWalker(e, d, r, col, t) {
    const nLegs = d.boss ? 4 : 2, ph = e.walk * 1.4;
    ctx.strokeStyle = '#25231f'; ctx.lineWidth = d.boss ? 9 : 5; ctx.lineCap = 'round';
    for (let i = 0; i < nLegs; i++) {
      const base = nLegs === 2 ? (i ? 1 : -1) * Math.PI / 2 : (i / 4) * TAU + Math.PI / 4;
      const sw = Math.sin(ph + i * Math.PI) * 0.4;
      const kx = Math.cos(base + sw) * r * 0.9, ky = Math.sin(base + sw) * r * 0.9, fx = Math.cos(base + sw * 1.5) * r * 1.6, fy = Math.sin(base + sw * 1.5) * r * 1.6;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = '#1a1916'; ctx.beginPath(); ctx.arc(fx, fy, d.boss ? 7 : 4, 0, TAU); ctx.fill();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.8, r * 0.65, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(d.col, -0.3); ctx.beginPath(); ctx.ellipse(-r * 0.1, 0, r * 0.5, r * 0.45, 0, 0, TAU); ctx.fill();
    if (!d.boss) { ctx.fillStyle = '#8a7a6a'; ctx.beginPath(); ctx.arc(-r * 0.35, 0, r * 0.22, 0, TAU); ctx.fill(); } // exposed pilot
    ctx.fillStyle = '#18181a'; ctx.fillRect(r * 0.4, -r * 0.5, r * 0.9, r * 0.2); ctx.fillRect(r * 0.4, r * 0.3, r * 0.9, r * 0.2);
    if (d.boss) { ctx.fillRect(r * 0.3, -r * 0.12, r * 1.2, r * 0.24); ctx.fillStyle = 'rgba(255,90,40,0.8)'; ctx.fillRect(-r * 0.75, -r * 0.2, r * 0.25, r * 0.4); }
    ctx.fillStyle = d.eye; ctx.beginPath(); ctx.arc(r * 0.6, 0, r * 0.12, 0, TAU); ctx.fill();
  }

  function drawTank(e, d, r, col, t) {
    ctx.fillStyle = '#1e1d1a'; ctx.fillRect(-r * 1.1, -r * 0.95, r * 2.2, r * 0.4); ctx.fillRect(-r * 1.1, r * 0.55, r * 2.2, r * 0.4);
    ctx.strokeStyle = '#33312c'; ctx.lineWidth = 2; for (let i = -5; i <= 5; i++) { const x = ((i * r * 0.2 + e.walk * 4) % (r * 2.2)) - r * 1.1; ctx.beginPath(); ctx.moveTo(x, -r * 0.95); ctx.lineTo(x, -r * 0.55); ctx.moveTo(x, r * 0.55); ctx.lineTo(x, r * 0.95); ctx.stroke(); }
    ctx.fillStyle = col; ctx.fillRect(-r, -r * 0.6, r * 2, r * 1.2);
    ctx.fillStyle = 'rgba(255,' + (90 + Math.sin(t * 5) * 40 | 0) + ',30,0.9)'; ctx.fillRect(-r * 1.02, -r * 0.35, r * 0.18, r * 0.7);
    ctx.fillStyle = shade(d.col, -0.25); ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#18181a'; ctx.fillRect(r * 0.2, -r * 0.1, r * 1.3, r * 0.2);
    ctx.fillStyle = d.eye; ctx.beginPath(); ctx.arc(r * 0.3, 0, 3, 0, TAU); ctx.fill();
  }

  function drawGunship(e, d, r, col, t) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.6, -r * 0.5); ctx.lineTo(-r * 0.8, 0); ctx.lineTo(-r * 0.6, r * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(d.col, -0.3); ctx.fillRect(-r * 0.4, -r * 1.1, r * 0.7, r * 0.5); ctx.fillRect(-r * 0.4, r * 0.6, r * 0.7, r * 0.5);
    ctx.fillStyle = 'rgba(255,120,60,' + (0.6 + Math.random() * 0.3) + ')'; ctx.beginPath(); ctx.arc(-r * 0.45, -r * 0.85, r * 0.2, 0, TAU); ctx.arc(-r * 0.45, r * 0.85, r * 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = d.eye; ctx.beginPath(); ctx.arc(r * 0.6, 0, 3, 0, TAU); ctx.fill();
  }

  function drawThrall(e, d, r, col, t) {
    const sw = Math.sin(e.walk * 2) * 0.4;
    ctx.strokeStyle = shade(d.col, -0.2); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 1.3, -r * (0.6 + sw)); ctx.moveTo(0, r * 0.6); ctx.lineTo(r * 1.3, r * (0.6 - sw)); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#a8a2b0'; ctx.beginPath(); ctx.arc(r * 0.2, 0, r * 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(190,170,255,0.8)'; ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.15, 1.5, 0, TAU); ctx.arc(r * 0.45, r * 0.15, 1.5, 0, TAU); ctx.fill();
  }

  function drawVeil(e, d, r, col, t) {
    if (d.flying) { ctx.fillStyle = 'rgba(200,180,255,0.6)'; ctx.beginPath(); ctx.arc(-r * 0.8, -r * 0.4, r * 0.25 + Math.random() * 2, 0, TAU); ctx.arc(-r * 0.8, r * 0.4, r * 0.25 + Math.random() * 2, 0, TAU); ctx.fill(); }
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(r * 0.6, 0); ctx.lineTo(-r * 0.9, -r * 0.9); ctx.quadraticCurveTo(-r * 0.6, 0, -r * 0.9, r * 0.9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(d.col, -0.35); ctx.beginPath(); ctx.ellipse(-r * 0.1, 0, r * 0.4, r * 0.55, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = d.glow; ctx.beginPath(); ctx.arc(r * 0.2, 0, r * 0.3, 0, TAU); ctx.fill();
    if (d.staff) { ctx.strokeStyle = '#d8ccff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.7); ctx.lineTo(r * 1.3, r * 0.5); ctx.stroke(); ctx.fillStyle = d.glow; ctx.beginPath(); ctx.arc(r * 1.3, r * 0.5, 3, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = '#2a2050'; ctx.fillRect(r * 0.2, r * 0.3, r * 0.9, r * 0.25); }
  }

  function drawEye(e, d, r, col, t) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = shade(d.col, 0.3); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, t * 2, t * 2 + 4); ctx.stroke();
    ctx.fillStyle = d.glow; ctx.beginPath(); ctx.arc(r * 0.35, 0, r * 0.35, 0, TAU); ctx.fill();
    if (e.callT > 0) { ctx.strokeStyle = 'rgba(200,180,255,' + Math.min(1, e.callT / 3.2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, TAU * Math.min(1, e.callT / 3.2)); ctx.stroke(); }
  }

  function drawMass(e, d, r, col, t) {
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + e.id, wob = Math.sin(t * 3 + i * 1.7) * r * 0.08; ctx.fillStyle = i % 2 ? col : shade(d.col, -0.2); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.45 + wob, 0, TAU); ctx.fill(); }
    ctx.fillStyle = shade(d.col, 0.15); ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(190,170,255,0.7)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(r * 0.3 + Math.cos(i * 1.6) * r * 0.25, Math.sin(i * 1.6) * r * 0.3, 2, 0, TAU); ctx.fill(); }
  }

  function drawGlider(e, d, r, col, t) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(r, 0); ctx.quadraticCurveTo(0, -r * 1.6, -r * 0.8, -r * 1.1); ctx.lineTo(-r * 0.4, 0); ctx.lineTo(-r * 0.8, r * 1.1); ctx.quadraticCurveTo(0, r * 1.6, r, 0); ctx.fill();
    ctx.fillStyle = d.glow; ctx.beginPath(); ctx.arc(r * 0.3, 0, r * 0.18, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,180,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * 0.4, 0); ctx.lineTo(-r * 1.6, Math.sin(t * 8) * r * 0.3); ctx.stroke();
  }

  function drawTripod(e, d, r, col, t) {
    const ph = e.walk * 1.2;
    ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + Math.PI / 3 + Math.sin(ph + i * 2.1) * 0.25; const kx = Math.cos(a) * r * 1.0, ky = Math.sin(a) * r * 1.0, fx = Math.cos(a) * r * 1.9, fy = Math.sin(a) * r * 1.9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke(); ctx.fillStyle = '#1a1438'; ctx.beginPath(); ctx.arc(fx, fy, 6, 0, TAU); ctx.fill(); }
    ctx.lineCap = 'butt';
    ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); } ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(d.col, -0.3); ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, TAU); ctx.fill();
    const charging = e.beamT > 1.6;
    ctx.fillStyle = charging ? '#ffffff' : d.glow; ctx.beginPath(); ctx.arc(r * 0.35, 0, r * (charging ? 0.28 : 0.2), 0, TAU); ctx.fill();
  }

  // ---------------------------------------------------------------- projectiles & effects
  function drawProj(p) {
    if (p.lob) {
      const k = p.t / p.T, h = Math.sin(k * Math.PI) * 120;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = p.acid ? '#b6ef4a' : p.team === 'd' ? '#ffd27a' : '#ff7a4a'; ctx.beginPath(); ctx.arc(p.x, p.y - h, 6, 0, TAU); ctx.fill();
      return;
    }
    const a = Math.atan2(p.vy, p.vx);
    if (p.kind === 'bullet') {
      const L = p.rail ? 70 : p.team === 'e' ? 16 : 22;
      ctx.strokeStyle = p.col; ctx.lineWidth = p.rail ? 3 : p.team === 'e' ? 2 : 1.6; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(a) * L, p.y - Math.sin(a) * L); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (p.kind === 'rocket') {
      ctx.fillStyle = p.col; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.fillRect(-7, -2, 10, 4); ctx.fillStyle = 'rgba(255,200,120,0.8)'; ctx.beginPath(); ctx.arc(-8, 0, 3 + Math.random() * 2, 0, TAU); ctx.fill(); ctx.restore();
      if (p.big) { ctx.fillStyle = 'rgba(127,227,255,0.5)'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, TAU); ctx.fill(); }
    } else if (p.kind === 'spit') { ctx.fillStyle = '#b6ef4a'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(182,239,74,0.3)'; ctx.beginPath(); ctx.arc(p.x - p.vx * 0.02, p.y - p.vy * 0.02, 4, 0, TAU); ctx.fill(); }
    else if (p.kind === 'bolt') { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill(); }
  }

  function drawThrown(o, t) {
    const z = o.z || 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(o.x, o.y, 3.5, 0, TAU); ctx.fill();
    if (o.kind === 'beacon') { ctx.fillStyle = '#2a2c2e'; ctx.fillRect(o.x - 2.5, o.y - z - 6, 5, 12); ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ff5a3a' : '#5ab4ff'; ctx.beginPath(); ctx.arc(o.x, o.y - z - 6, 2.5, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = o.def.thermite ? '#cfcfcf' : o.def.fire ? '#c85a2a' : o.def.stun ? '#6fb6ff' : o.def.smoke ? '#9a9a9a' : o.def.gas ? '#a8c84a' : '#4a5240'; ctx.beginPath(); ctx.arc(o.x, o.y - z, 4, 0, TAU); ctx.fill(); if (o.landed && o.fuse != null && Math.floor(o.fuse * 8) % 2) { ctx.fillStyle = '#ff3a2a'; ctx.beginPath(); ctx.arc(o.x, o.y - z, 1.5, 0, TAU); ctx.fill(); } }
  }

  function drawBeacon(b, t) {
    const k = b.t / b.T;
    const gr = ctx.createLinearGradient(b.x, b.y - 600, b.x, b.y);
    gr.addColorStop(0, hexA(b.col, 0)); gr.addColorStop(1, hexA(b.col, 0.55));
    ctx.fillStyle = gr; ctx.fillRect(b.x - 2.5, b.y - 600, 5, 600);
    ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(b.x, b.y, 4 + Math.sin(t * 12) * 1.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA(b.col, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, 10 + (1 - k) * 20, 0, TAU); ctx.stroke();
  }

  function drawPod(p) {
    const k = p.t / p.T, h = k * k * 900;
    const s = p.payload.kind === 'vehicle' ? 1.6 : 1;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.4 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 14 * s * (1 + k), 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,120,0.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 32 * (G_e1() ? 1.5 : 1) * s, 0, TAU); ctx.stroke();
    ctx.save(); ctx.translate(p.x + h * 0.3, p.y - h);
    ctx.fillStyle = 'rgba(255,170,90,0.6)'; ctx.beginPath(); ctx.moveTo(-6 * s, -10 * s); ctx.lineTo(0, -60 * s); ctx.lineTo(6 * s, -10 * s); ctx.fill();
    ctx.fillStyle = '#3e4246'; ctx.beginPath(); ctx.moveTo(-8 * s, -10 * s); ctx.lineTo(8 * s, -10 * s); ctx.lineTo(6 * s, 12 * s); ctx.lineTo(0, 16 * s); ctx.lineTo(-6 * s, 12 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8a33a'; ctx.fillRect(-8 * s, -4 * s, 16 * s, 3 * s);
    ctx.restore();
  }
  function G_e1() { return DF.G.mods.has('e1'); }

  function drawOrbLaser(L, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(L.x, L.y - 900, L.x, L.y); gr.addColorStop(0, 'rgba(255,60,40,0)'); gr.addColorStop(1, 'rgba(255,90,60,0.9)');
    ctx.fillStyle = gr; ctx.fillRect(L.x - 7, L.y - 900, 14, 900);
    ctx.fillStyle = 'rgba(255,220,200,0.9)'; ctx.fillRect(L.x - 2, L.y - 900, 4, 900);
    const g2 = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, 40); g2.addColorStop(0, 'rgba(255,240,220,0.95)'); g2.addColorStop(1, 'rgba(255,60,40,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(L.x, L.y, 40, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawSpike(s) { ctx.fillStyle = '#6d3d4a'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a) * 30 * s.t / 0.6, s.y + Math.sin(a) * 30 * s.t / 0.6 - 10); ctx.lineTo(s.x + Math.cos(a + 0.3) * 10, s.y + Math.sin(a + 0.3) * 10); ctx.fill(); } }
  function drawRift(r, t) { const k = Math.min(1, r.t); const gr = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 70 * k); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.3, 'rgba(160,130,255,0.7)'); gr.addColorStop(1, 'rgba(60,30,140,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(r.x, r.y, 70 * k, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(220,200,255,0.8)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(r.x, r.y, 30 + i * 14, t * 3 + i, t * 3 + i + 2); ctx.stroke(); } }

  function drawPart(p) {
    const k = p.life / p.T;
    if (p.kind === 'smoke') { ctx.globalAlpha = k * 0.8; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; return; }
    if (p.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; return; }
    ctx.globalAlpha = Math.min(1, k * 1.5); ctx.fillStyle = p.col; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); ctx.globalAlpha = 1;
  }

  function drawBeam(b) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = b.col; ctx.lineWidth = b.w; ctx.lineCap = 'round';
    ctx.beginPath();
    if (b.arc) { ctx.moveTo(b.x1, b.y1); const n = 6; for (let i = 1; i < n; i++) { const k = i / n; ctx.lineTo(U.lerp(b.x1, b.x2, k) + U.rand(-8, 8), U.lerp(b.y1, b.y2, k) + U.rand(-8, 8)); } ctx.lineTo(b.x2, b.y2); }
    else { ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); }
    ctx.stroke(); ctx.lineWidth = b.w * 3; ctx.globalAlpha = 0.25; ctx.stroke(); ctx.restore();
  }

  function drawTornado(tn, t) {
    const gr = ctx.createRadialGradient(tn.x, tn.y, 0, tn.x, tn.y, 70); gr.addColorStop(0, 'rgba(255,200,90,0.5)'); gr.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(tn.x, tn.y, 70, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,140,40,0.6)'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(tn.x, tn.y, 15 + i * 10, t * 6 + i, t * 6 + i + 2.2); ctx.stroke(); }
  }

  function drawRaptor(x, y, a, s) {
    ctx.save(); ctx.translate(x + 40, y + 60); ctx.rotate(a); ctx.fillStyle = 'rgba(0,0,0,0.25)'; raptorShape(s); ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#4c5258'; raptorShape(s); ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.arc(-26 * s, -6 * s, 3, 0, TAU); ctx.arc(-26 * s, 6 * s, 3, 0, TAU); ctx.fill(); ctx.restore();
  }
  function raptorShape(s) { ctx.beginPath(); ctx.moveTo(34 * s, 0); ctx.lineTo(4 * s, -6 * s); ctx.lineTo(-10 * s, -34 * s); ctx.lineTo(-20 * s, -32 * s); ctx.lineTo(-14 * s, -6 * s); ctx.lineTo(-26 * s, -10 * s); ctx.lineTo(-26 * s, 10 * s); ctx.lineTo(-14 * s, 6 * s); ctx.lineTo(-20 * s, 32 * s); ctx.lineTo(-10 * s, 34 * s); ctx.lineTo(4 * s, 6 * s); ctx.closePath(); ctx.fill(); }

  function drawEnemyShip(s) {
    ctx.save(); ctx.translate(s.x + 40, s.y + 70); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-50, -26, 100, 52); ctx.restore();
    ctx.save(); ctx.translate(s.x, s.y);
    ctx.fillStyle = '#3a3c40'; ctx.fillRect(-50, -24, 100, 48); ctx.fillStyle = '#2a2b2e'; ctx.fillRect(-30, -40, 30, 80);
    ctx.fillStyle = '#ff3b2f'; ctx.beginPath(); ctx.arc(46, 0, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,60,0.7)'; ctx.beginPath(); ctx.arc(-15, -40, 6, 0, TAU); ctx.arc(-15, 40, 6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawExtractShip(g) {
    const ex = g.M.extract;
    if (ex.state !== 'landing' && ex.state !== 'boarding' && ex.state !== 'leaving') return;
    let h = 0, ox = 0;
    if (ex.state === 'landing') { h = ex.t / 5 * 500; ox = -ex.t / 5 * 600; }
    if (ex.state === 'leaving') { h = (3 - ex.t) / 3 * 600; ox = (3 - ex.t) * 100; }
    const x = ex.x + ox, y = ex.y - h;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(ex.x + ox * 0.5 + 20, ex.y + 20, 70, 40, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#5a5f62'; ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(30, -28); ctx.lineTo(-60, -30); ctx.lineTo(-70, 0); ctx.lineTo(-60, 30); ctx.lineTo(30, 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#44484b'; ctx.fillRect(-50, -60, 30, 120); ctx.fillStyle = '#d8a33a'; ctx.fillRect(-50, -60, 30, 6); ctx.fillRect(-50, 54, 30, 6);
    ctx.fillStyle = '#2c4a5a'; ctx.fillRect(40, -10, 18, 20);
    ctx.fillStyle = 'rgba(255,180,100,0.7)'; ctx.beginPath(); ctx.arc(-35, -60, 9, 0, TAU); ctx.arc(-35, 60, 9, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- lighting & weather
  function drawDarkness(g) {
    if (g.M.hazard !== 'night') return;
    const c = g.cam, sc = 0.5;
    dctx.globalCompositeOperation = 'source-over';
    dctx.fillStyle = 'rgba(4,6,14,0.84)'; dctx.fillRect(0, 0, dark.width, dark.height);
    dctx.globalCompositeOperation = 'destination-out';
    const light = (x, y, r, a) => {
      const sx = ((x - c.x) * c.z + Wd / 2) * sc, sy = ((y - c.y) * c.z + Ht / 2) * sc, sr = r * c.z * sc;
      if (sx < -sr || sy < -sr || sx > dark.width + sr || sy > dark.height + sr) return;
      const gr = dctx.createRadialGradient(sx, sy, 0, sx, sy, sr); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = gr; dctx.beginPath(); dctx.arc(sx, sy, sr, 0, TAU); dctx.fill();
    };
    for (const d of g.divers) if (d.alive) {
      light(d.x, d.y, 110, 0.9);
      // helmet lamp cone
      const sx = ((d.x - c.x) * c.z + Wd / 2) * sc, sy = ((d.y - c.y) * c.z + Ht / 2) * sc, L = 420 * c.z * sc;
      const gr = dctx.createRadialGradient(sx, sy, 0, sx, sy, L); gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = gr; dctx.beginPath(); dctx.moveTo(sx, sy); dctx.arc(sx, sy, L, d.ang - 0.42, d.ang + 0.42); dctx.closePath(); dctx.fill();
    }
    for (const f of g.flashes) light(f.x, f.y, f.r * 1.4, Math.min(1, f.t / f.T + 0.3));
    for (const a of g.areas) if (a.kind === 'fire') light(a.x, a.y, a.r * 1.6, 0.8);
    for (const b of g.beacons) light(b.x, b.y, 90, 0.7);
    for (const L of g.lasers) light(L.x, L.y, 200, 1);
    for (const st of g.M.structs) if (st.type === 'extract' || (st.type === 'spawner' && st.alive) || st.type === 'terminal') light(st.x, st.y, 90, 0.5);
    for (const e of g.enemies) if (!e.dead && (e.def.f === 'veil' || e.def.eye)) light(e.x, e.y, e.r * 3, 0.35);
    for (const p of g.projs) light(p.x, p.y, 40, 0.5);
    for (const o of DF.G.M.obs) if (o.hazard === 'lava') light(o.x, o.y, o.r * 1.6, 0.7);
    ctx.drawImage(dark, 0, 0, dark.width, dark.height, 0, 0, Wd, Ht);
  }

  function drawWeather(g, dt) {
    const hz = g.M.hazard;
    let kind = null, n = 0, intensity = 0;
    if (hz === 'sandstorm') { kind = 'sand'; intensity = g.storm; n = 260 * g.storm; }
    if (hz === 'blizzard') { kind = 'snow'; intensity = Math.max(0.25, g.storm); n = 120 + 300 * g.storm; }
    if (hz === 'rain') { kind = 'rain'; intensity = 0.6; n = 220; }
    if (g.M.biomeId === 'tundra' && hz !== 'blizzard') { kind = 'snow'; intensity = 0.15; n = 60; }
    if (g.M.biomeId === 'ashland') { kind = 'ash'; intensity = 0.2; n = 70; }
    while (weather.length < n) weather.push({ x: Math.random() * Wd, y: Math.random() * Ht, s: Math.random() });
    if (weather.length > n) weather.length = Math.floor(n);
    if (kind) {
      if (kind === 'rain') { ctx.strokeStyle = 'rgba(180,200,230,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); }
      if (kind === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); }
      for (const p of weather) {
        if (kind === 'sand') { p.x += (600 + p.s * 400) * dt; p.y += 60 * dt; ctx.fillStyle = 'rgba(220,180,120,' + (0.3 + p.s * 0.4) + ')'; ctx.fillRect(p.x, p.y, 3 + p.s * 6, 1.5); }
        if (kind === 'snow') { p.x += (80 + intensity * 500) * dt * (0.5 + p.s); p.y += (60 + p.s * 60) * dt; ctx.moveTo(p.x + 1 + p.s * 2, p.y); ctx.arc(p.x, p.y, 1 + p.s * 2, 0, TAU); }
        if (kind === 'rain') { p.x += 120 * dt; p.y += (900 + p.s * 400) * dt; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 3, p.y - 14); }
        if (kind === 'ash') { p.x += 20 * dt; p.y += (20 + p.s * 30) * dt; ctx.fillStyle = 'rgba(60,55,50,0.6)'; ctx.fillRect(p.x, p.y, 2, 2); }
        if (p.x > Wd) p.x -= Wd; if (p.y > Ht) p.y -= Ht; if (p.x < 0) p.x += Wd;
      }
      if (kind === 'rain') ctx.stroke();
      if (kind === 'snow') ctx.fill();
    }
    // visibility haze
    const v = g.vis;
    if (v < 0.99) {
      const col = hz === 'sandstorm' ? '190,150,95' : hz === 'blizzard' ? '225,232,240' : hz === 'fog' ? '170,180,170' : hz === 'rain' ? '70,80,95' : '8,10,20';
      const gr = ctx.createRadialGradient(Wd / 2, Ht / 2, Math.min(Wd, Ht) * 0.25 * v, Wd / 2, Ht / 2, Math.max(Wd, Ht) * 0.75 * v);
      gr.addColorStop(0, 'rgba(' + col + ',0)'); gr.addColorStop(1, 'rgba(' + col + ',' + (0.85 - v * 0.65).toFixed(2) + ')');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, Wd, Ht);
    }
    if (g.ion) { ctx.fillStyle = 'rgba(120,180,255,' + (0.05 + Math.random() * 0.05) + ')'; ctx.fillRect(0, 0, Wd, Ht); if (Math.random() < 0.05) { ctx.strokeStyle = 'rgba(190,230,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); let x = Math.random() * Wd, y = 0; ctx.moveTo(x, y); while (y < Ht) { x += U.rand(-30, 30); y += U.rand(20, 50); ctx.lineTo(x, y); } ctx.stroke(); } }
  }

  // ---------------------------------------------------------------- HUD
  const FONT = '"Chakra Petch", "Barlow Condensed", system-ui, sans-serif';
  const ARROW = { U: '↑', D: '↓', L: '←', R: '→' };
  R.ARROW = ARROW;
  function txt(s, x, y, size, col, align, weight) { ctx.font = (weight || '600') + ' ' + size + 'px ' + FONT; ctx.fillStyle = col; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y); }
  function panel(x, y, w, h) { ctx.fillStyle = 'rgba(10,12,14,0.62)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(232,226,200,0.12)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }

  function drawHUD(g, mouse) {
    const P = g.player, M = g.M, small = Wd < 700;
    // damage vignette
    if (g.dmgFlash > 0) { const gr = ctx.createRadialGradient(Wd / 2, Ht / 2, Math.min(Wd, Ht) * 0.3, Wd / 2, Ht / 2, Math.max(Wd, Ht) * 0.7); gr.addColorStop(0, 'rgba(160,0,0,0)'); gr.addColorStop(1, 'rgba(160,0,0,' + (g.dmgFlash * 0.6) + ')'); ctx.fillStyle = gr; ctx.fillRect(0, 0, Wd, Ht); }
    if (P.alive && P.hp < P.maxhp * 0.3) { ctx.fillStyle = 'rgba(120,0,0,' + (0.12 + Math.sin(g.t * 5) * 0.06) + ')'; ctx.fillRect(0, 0, Wd, Ht); }
    if (g.lastHitT > 0 && g.lastHitDir != null && P.alive) { const a = R.fps ? g.lastHitDir - R.facing - Math.PI / 2 : g.lastHitDir; ctx.save(); ctx.translate(Wd / 2, Ht / 2); ctx.rotate(a); ctx.fillStyle = 'rgba(255,60,40,' + g.lastHitT * 0.7 + ')'; ctx.beginPath(); ctx.moveTo(90, -14); ctx.lineTo(110, 0); ctx.lineTo(90, 14); ctx.closePath(); ctx.fill(); ctx.restore(); }

    // objectives (top-left)
    const ox = 14, oy = 14;
    const lines = [];
    for (const o of M.objectives) {
      let extra = '';
      if (o.type === 'rescue') extra = ' ' + o.saved + '/' + o.need + (o.dead ? '  lost ' + o.dead : '');
      if (o.type === 'purge') extra = ' ' + o.outpost.spawners.filter(s => !s.alive).length + '/' + o.outpost.spawners.length;
      if (o.type === 'beacon' && o.term.state === 'defend') extra = ' ' + Math.floor(o.progress * 100) + '%';
      lines.push({ t: o.label + extra, done: o.done, failed: o.failed, main: true });
    }
    const exS = M.extract.state;
    lines.push({ t: exS === 'idle' ? 'Extract' : exS === 'calling' ? 'Hold the landing zone ' + U.fmtTime(M.extract.t) : exS === 'landing' ? 'Dropship landing' : 'Board the dropship', done: false, main: true, dim: !S.mainDone() });
    const sideLeft = M.side.filter(s => s.type !== 'radar' ? s.alive : s.state !== 'done').length;
    const outLeft = M.outposts.filter(o => !o.cleared && !o.main).length;
    lines.push({ t: 'Optional: side targets ' + (M.side.length - sideLeft) + '/' + M.side.length + ' · outposts ' + (M.outposts.filter(o => !o.main).length - outLeft) + '/' + M.outposts.filter(o => !o.main).length, side: true });
    const ow = small ? 230 : 300;
    panel(ox, oy, ow, 30 + lines.length * 19);
    txt(M.planet.name.toUpperCase() + ' · ' + DF.DIFFS[M.diff - 1].name.toUpperCase(), ox + 10, oy + 18, 11, '#d8a33a', 'left', '700');
    txt(U.fmtTime(g.timeLeft), ox + ow - 10, oy + 18, 12, g.timeLeft < 120 ? '#ff6b5a' : '#e8e2c8', 'right', '700');
    lines.forEach((l, i) => {
      const y = oy + 38 + i * 19;
      if (!l.side) { ctx.strokeStyle = l.done ? '#9fe07a' : l.failed ? '#ff6b5a' : '#e8e2c8'; ctx.lineWidth = 1.5; ctx.strokeRect(ox + 10, y - 9, 10, 10); if (l.done) { ctx.fillStyle = '#9fe07a'; ctx.fillRect(ox + 12, y - 7, 6, 6); } }
      txt(l.t, ox + (l.side ? 10 : 28), y, l.side ? 10 : 12, l.done ? '#9fe07a' : l.failed ? '#ff6b5a' : l.side ? '#a8a290' : l.dim ? '#8a8676' : '#e8e2c8', 'left', l.side ? '500' : '600');
    });
    txt('Reinforcements ' + g.lives + '   Samples ' + g.stats.samples.c + '·' + g.stats.samples.r + '·' + g.stats.samples.s, ox, oy + 30 + lines.length * 19 + 16, 11, '#c8c2ae', 'left', '600');

    // minimap (top-right)
    const mm = small ? 120 : 170;
    R.drawMinimap(g, Wd - mm - 14, 14, mm);

    // messages
    g.msgs.forEach((m, i) => { const a = Math.min(1, m.t / 0.5); ctx.globalAlpha = a; txt(m.text, Wd / 2, (R.fps ? 84 : 40) + i * 22, small ? 12 : 15, m.col, 'center', '700'); ctx.globalAlpha = 1; });

    // call-in list (left middle)
    drawCallins(g, small);

    // bottom-left: vitals
    const bx = 14, by = Ht - 92;
    panel(bx, by, small ? 200 : 260, 78);
    txt(P.name.toUpperCase(), bx + 10, by + 16, 11, '#d8a33a', 'left', '700');
    txt(P.arm.name + ' · ' + DF.PASSIVES[P.passive].name, bx + 10, by + 30, 10, '#a8a290', 'left', '500');
    const bw = (small ? 200 : 260) - 20;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bx + 10, by + 38, bw, 9);
    ctx.fillStyle = P.hp < P.maxhp * 0.3 ? '#ff5a4a' : '#e8e2c8'; ctx.fillRect(bx + 10, by + 38, bw * Math.max(0, P.hp / P.maxhp), 9);
    if (P.stimT > 0) { ctx.fillStyle = 'rgba(127,255,208,0.5)'; ctx.fillRect(bx + 10, by + 38, bw, 9); }
    if (P.pack && P.pack.type === 'shield') { ctx.fillStyle = '#76c6ff'; ctx.fillRect(bx + 10, by + 34, bw * P.pack.hp / P.pack.max, 3); }
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bx + 10, by + 50, bw, 4);
    ctx.fillStyle = '#d8a33a'; ctx.fillRect(bx + 10, by + 50, bw * P.stam / P.maxStam, 4);
    txt('STIMS ' + P.stims + '   ' + P.gdef.name.toUpperCase() + ' ' + P.nades + (P.pack ? '   ' + P.pack.name.toUpperCase() + (P.pack.charges != null ? ' ' + P.pack.charges : '') + (P.pack.type === 'jump' && P.pack.cd > 0 ? ' ' + Math.ceil(P.pack.cd) + 's' : '') : ''), bx + 10, by + 70, 10, '#e8e2c8', 'left', '600');

    // bottom-right: weapon
    const wx = Wd - (small ? 214 : 274), wy = Ht - 92;
    panel(wx, wy, small ? 200 : 260, 78);
    if (P.veh) {
      const v = P.veh, vd = v.d;
      txt(vd.name.toUpperCase(), wx + 10, wy + 18, 12, '#d8a33a', 'left', '700');
      bar2(wx + 10, wy + 26, (small ? 180 : 240), v.hp / v.maxhp, '#9fe07a');
      if (vd.weapons) vd.weapons.forEach((w, i) => txt((i ? 'RMB ' : 'LMB ') + w.name + '  ' + v.ammo[i], wx + 10, wy + 50 + i * 16, 11, '#e8e2c8', 'left', '600'));
      else txt('Turret auto-fires · LMB to aim it', wx + 10, wy + 52, 11, '#e8e2c8', 'left', '600');
    } else {
      const w = P.weapons[P.cur];
      if (w) {
        const d = w.d;
        txt(d.name.toUpperCase(), wx + 10, wy + 18, 12, '#d8a33a', 'left', '700');
        txt(d.cls + ' · pen ' + penName(d.pen), wx + 10, wy + 32, 10, '#a8a290', 'left', '500');
        if (d.kind === 'beam') { txt('HEAT', wx + 10, wy + 56, 11, '#e8e2c8'); bar2(wx + 50, wy + 48, (small ? 130 : 190) - 10, w.heat, w.over ? '#ff5a4a' : '#ffb07a'); txt('SINKS ' + w.spare, wx + 10, wy + 72, 11, '#e8e2c8'); }
        else if (d.kind === 'charge') { txt(w.cool > 0 ? 'COOLING ' + w.cool.toFixed(1) + 's' : 'HOLD TO CHARGE', wx + 10, wy + 56, 12, '#e8e2c8', 'left', '700'); bar2(wx + 10, wy + 62, (small ? 180 : 240), w.cool > 0 ? 1 - w.cool / d.cool : w.charge / d.charge, '#7fe3ff'); }
        else if (d.infinite) txt('∞', wx + 10, wy + 64, 22, '#e8e2c8', 'left', '700');
        else {
          txt(Math.floor(w.mag) + '', wx + 10, wy + 66, 26, w.mag <= d.mag * 0.25 ? '#ff6b5a' : '#e8e2c8', 'left', '700');
          txt('/ ' + d.mag + '   ×' + w.spare, wx + 14 + ctx.measureText(Math.floor(w.mag) + '').width, wy + 66, 12, '#a8a290', 'left', '600');
          if (d.kind === 'rail' && w.charge > 0) bar2(wx + 120, wy + 58, 120, w.charge / d.charge, w.charge > d.charge ? '#ff5a4a' : '#bfe9ff');
        }
        if (w.reloadT > 0) txt('RELOADING', wx + (small ? 190 : 250), wy + 66, 11, '#ffd27a', 'right', '700');
      }
      for (let i = 0; i < 3; i++) { const ww = P.weapons[i]; ctx.fillStyle = i === P.cur ? '#d8a33a' : ww ? 'rgba(232,226,200,0.35)' : 'rgba(232,226,200,0.08)'; ctx.fillRect(wx + (small ? 150 : 210) + i * 14, wy + 8, 10, 4); }
    }

    // interaction prompt
    if (P.alive && !g.codeTask) { const it = S.interactable(P); if (it) { const w = Math.max(160, it.label.length * 8 + 40); panel(Wd / 2 - w / 2, Ht * 0.68, w, 28); txt('[E] ' + it.label, Wd / 2, Ht * 0.68 + 19, 13, '#e8e2c8', 'center', '700'); } }
    if (g.ready) { const n = DF.CALLINS[g.ready].name; panel(Wd / 2 - 170, Ht * 0.74, 340, 30); txt(n + ' ready · throw with Left Click', Wd / 2, Ht * 0.74 + 20, 13, '#ffd27a', 'center', '700'); }
    if (g.codeTask) drawCodeTask(g.codeTask);
    if (P.carrying) txt('Carrying the flight recorder · G drops it · bring it to extraction', Wd / 2, Ht * 0.64, 12, '#ffb07a', 'center', '700');
    // extraction timer
    if (exS === 'calling') { txt('EXTRACTION ' + U.fmtTime(M.extract.t), Wd / 2, Ht - 40, 20, '#ffd27a', 'center', '700'); }
    // death
    if (!P.alive && !P.arriving) { panel(Wd / 2 - 170, Ht / 2 - 40, 340, 70); txt('KILLED IN ACTION', Wd / 2, Ht / 2 - 12, 20, '#ff6b5a', 'center', '700'); txt(g.lives > 0 || g.pendingRespawn ? 'Reinforcing in ' + Math.max(0, g.respawnT).toFixed(1) + 's' : 'No reinforcements left', Wd / 2, Ht / 2 + 14, 13, '#e8e2c8', 'center', '600'); }
    // offscreen markers for objectives & extraction
    const marks = [];
    for (const o of M.objectives) if (!o.done) marks.push({ x: o.x, y: o.y, col: '#ffd27a', l: '!' });
    if (S.mainDone() || exS !== 'idle') marks.push({ x: M.extract.x, y: M.extract.y, col: '#9fe07a', l: 'E' });
    for (const m of marks) edgeMarker(g, m);
    // crosshair
    if (mouse && P.alive) drawCrosshair(g, mouse);
  }
  function penName(p) { return ['', 'light', 'medium-light', 'medium', 'heavy', 'heavy+', 'anti-tank', 'orbital'][p] || p; }
  function bar2(x, y, w, k, col) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, w, 8); ctx.fillStyle = col; ctx.fillRect(x, y, w * U.clamp(k, 0, 1), 8); }

  function edgeMarker(g, m) {
    let s = R.fps ? DF.Gfx.project(m.x, DF.Gfx.h(m.x, m.y) + 60, m.y) : R.worldToScreen(m.x, m.y);
    const pad = 40;
    if (s.behind) s = { x: Wd - s.x, y: Ht + 1000 };
    const onScreen = !s.behind && s.x > pad && s.y > pad && s.x < Wd - pad && s.y < Ht - pad;
    const dist = Math.round(Math.hypot(m.x - g.player.x, m.y - g.player.y) / 10);
    let x = s.x, y = s.y;
    if (!onScreen) { const a = Math.atan2(s.y - Ht / 2, s.x - Wd / 2); const k = Math.min((Wd / 2 - pad) / Math.abs(Math.cos(a) || 1e-3), (Ht / 2 - pad) / Math.abs(Math.sin(a) || 1e-3)); x = Wd / 2 + Math.cos(a) * k; y = Ht / 2 + Math.sin(a) * k; }
    ctx.fillStyle = 'rgba(10,12,14,0.6)'; ctx.beginPath(); ctx.arc(x, y - (onScreen ? 50 : 0), 11, 0, TAU); ctx.fill();
    ctx.strokeStyle = m.col; ctx.lineWidth = 2; ctx.stroke();
    txt(m.l, x, y - (onScreen ? 50 : 0) + 4, 12, m.col, 'center', '700');
    txt(dist + 'm', x, y - (onScreen ? 50 : 0) + 24, 10, m.col, 'center', '600');
  }

  function drawCrosshair(g, m) {
    const P = g.player, w = P.weapons[P.cur];
    ctx.strokeStyle = g.ready ? '#ffd27a' : 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5;
    let gap = 6;
    if (w && !P.veh) { const d = w.d; gap = 5 + ((d.spread || 1) + w.bloom) * 2.2 * (Math.hypot(P.vx, P.vy) > 30 ? 1.5 : 1) * (P.aimDown ? 0.55 : 1); }
    ctx.beginPath();
    ctx.moveTo(m.x - gap - 7, m.y); ctx.lineTo(m.x - gap, m.y); ctx.moveTo(m.x + gap, m.y); ctx.lineTo(m.x + gap + 7, m.y);
    ctx.moveTo(m.x, m.y - gap - 7); ctx.lineTo(m.x, m.y - gap); ctx.moveTo(m.x, m.y + gap); ctx.lineTo(m.x, m.y + gap + 7); ctx.stroke();
    if (g.ready && !R.fps) { const pr = R.worldToScreen(P.x, P.y), maxD = 270 * (P.passive === 'servo' ? 1.5 : 1) * g.cam.z; ctx.strokeStyle = 'rgba(255,210,122,0.3)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(pr.x, pr.y, maxD, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    if (g.hitMark > 0) {
      ctx.strokeStyle = g.hitKind === 'kill' ? '#ff5a4a' : g.hitKind === 'bounce' ? '#9a9a9a' : g.hitKind === 'glance' ? '#ffb07a' : g.hitKind === 'shield' ? '#b39cff' : '#ffffff';
      ctx.lineWidth = 2; ctx.beginPath(); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.moveTo(m.x + a * 5, m.y + b * 5); ctx.lineTo(m.x + a * 10, m.y + b * 10); } ctx.stroke();
      if (g.hitKind === 'bounce') txt('NO PEN', m.x + 14, m.y - 10, 10, '#c8c8c8', 'left', '700');
    }
    if (w && w.reloadT > 0) { ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - w.reloadT / w.d.reload)); ctx.stroke(); }
  }

  function drawCallins(g, small) {
    const ids = Object.keys(g.cs).filter(id => id !== 'nova' || g.M.objectives.some(o => o.type === 'nova' && !o.done));
    const open = g.menu;
    const x = 14, rowH = open ? 26 : 20, w = open ? (small ? 250 : 300) : (small ? 170 : 210);
    const y0 = Math.max(170, Ht / 2 - ids.length * rowH / 2 - 10);
    panel(x, y0, w, ids.length * rowH + 26);
    txt(open ? 'CALL-INS · type the code' : 'CALL-INS [Q]', x + 10, y0 + 16, 10, '#d8a33a', 'left', '700');
    ids.forEach((id, i) => {
      const c = g.cs[id], d = c.d, y = y0 + 26 + i * rowH;
      const avail = S.callAvail(id), match = open && g.code && d.code.startsWith(g.code);
      const dim = open && g.code && !match;
      ctx.globalAlpha = dim ? 0.3 : 1;
      const cat = { orbital: '#ff7a5a', air: '#ff7a5a', mission: '#ffd27a', support: '#5ab4ff', backpack: '#5ab4ff', vehicle: '#5ab4ff', sentry: '#7fd09a', mine: '#7fd09a' }[d.cat];
      ctx.fillStyle = cat; ctx.fillRect(x + 8, y + 2, 3, rowH - 8);
      txt(d.name, x + 16, y + (open ? 10 : 13), open ? 11 : 11, avail ? '#e8e2c8' : '#7a766a', 'left', '600');
      let status = '';
      if (c.rearm > 0) status = 'rearm ' + Math.ceil(c.rearm) + 's';
      else if (c.cd > 0.01) status = Math.ceil(c.cd) + 's';
      else if (c.uses !== Infinity) status = '×' + c.uses;
      if (status) txt(status, x + w - 10, y + (open ? 10 : 13), 10, '#a8a290', 'right', '600');
      if (open) {
        let ax = x + 16;
        for (let k = 0; k < d.code.length; k++) { const done = match && k < g.code.length; txt(ARROW[d.code[k]], ax + 6, y + 23, 13, done ? '#ffd27a' : '#c8c2ae', 'center', '700'); ax += 16; }
      }
      ctx.globalAlpha = 1;
    });
  }

  function drawCodeTask(t) {
    const w = 380, h = 110, x = Wd / 2 - w / 2, y = Ht / 2 + 40;
    panel(x, y, w, h);
    txt('ENTER THE SEQUENCE  ' + (t.idx + 1) + '/' + t.seqs.length, Wd / 2, y + 22, 12, '#d8a33a', 'center', '700');
    const s = t.seqs[t.idx], cw = 34, sx = Wd / 2 - s.length * cw / 2 + cw / 2;
    for (let i = 0; i < s.length; i++) { ctx.fillStyle = i < t.pos ? 'rgba(255,210,122,0.25)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(sx + i * cw - 14, y + 38, 28, 34); txt(ARROW[s[i]], sx + i * cw, y + 63, 22, i < t.pos ? '#ffd27a' : t.err > 0 ? '#ff6b5a' : '#e8e2c8', 'center', '700'); }
    txt('Arrow keys or WASD · Esc to step away', Wd / 2, y + 96, 11, '#a8a290', 'center', '500');
    if (t.err > 0) t.err -= 1 / 60;
  }

  // ---------------------------------------------------------------- first-person overlay
  R.drawOverlay = function (g, showMap, active) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, Wd, Ht);
    if (R.fps) drawWorldTags(g);
    drawHUD(g, { x: Wd / 2, y: Ht / 2 });
    if (R.fps) drawCompass(g);
    if (showMap) R.drawMap(g, true);
    if (!active && g.player.alive) { panel(Wd / 2 - 160, Ht / 2 + 40, 320, 34); txt('Click to take control of the camera', Wd / 2, Ht / 2 + 62, 13, '#ffd27a', 'center', '700'); }
  };

  function drawWorldTags(g) {
    const X = DF.Gfx, P = g.player;
    for (const e of g.enemies) {
      if (e.dead || e.def.tier < 2) continue;
      const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 1100) continue;
      const top = e.def.draw === 'tripod' ? 150 * e.r / 40 : e.def.flying ? 110 : e.r * 3.2;
      const s = X.project(e.x, X.h(e.x, e.y) + top, e.y); if (s.behind || s.x < 0 || s.x > Wd || s.y < 0 || s.y > Ht) continue;
      const w = Math.max(40, Math.min(140, 9000 / Math.max(80, d)));
      bar(s.x, s.y, w, e.hp / e.maxhp, '#ff6b5a');
      if (e.maxShield) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(s.x - w / 2 - 1, s.y - 6, w + 2, 4); ctx.fillStyle = '#b39cff'; ctx.fillRect(s.x - w / 2, s.y - 5, w * e.shield / e.maxShield, 2); }
      if (e.isTarget) txt('TARGET', s.x, s.y - 10, 11, '#ffd27a', 'center', '700');
    }
    for (const b of g.divers) {
      if (!b.bot || !b.alive || b.veh) continue;
      const s = X.project(b.x, X.h(b.x, b.y) + 50, b.y); if (s.behind || s.x < 0 || s.x > Wd) continue;
      txt(b.name, s.x, s.y, 11, '#9fe07a', 'center', '700'); bar(s.x, s.y + 4, 34, b.hp / b.maxhp, '#9fe07a');
    }
    for (const it of g.items) {
      if (!it.alive || (it.kind !== 'weapon' && it.kind !== 'pack' && it.kind !== 'supply' && it.kind !== 'blackbox')) continue;
      const d = Math.hypot(it.x - P.x, it.y - P.y); if (d > 400) continue;
      const s = X.project(it.x, X.h(it.x, it.y) + 22, it.y); if (s.behind) continue;
      txt(it.kind === 'weapon' ? it.w.d.name : it.kind === 'pack' ? it.pack.name : it.kind === 'supply' ? 'Supplies' : 'Flight recorder', s.x, s.y, 10, '#e8e2c8', 'center', '600');
    }
  }

  function drawCompass(g) {
    const P = g.player, w = Math.min(520, Wd * 0.5), x0 = Wd / 2 - w / 2, y = 14, fov = Math.PI * 0.9;
    ctx.fillStyle = 'rgba(10,12,14,0.5)'; ctx.fillRect(x0, y, w, 22);
    const head = R.facing; // sim angle; north is -y
    const toX = a => { const d = U.angDiff(head, a); return Math.abs(d) > fov / 2 ? null : Wd / 2 + d / (fov / 2) * w / 2; };
    for (let deg = 0; deg < 360; deg += 15) {
      const a = (deg - 90) * Math.PI / 180, x = toX(a); if (x == null) continue;
      const lbl = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[deg];
      ctx.fillStyle = lbl ? '#ffd27a' : 'rgba(232,226,200,0.5)'; ctx.fillRect(x, y + (lbl ? 2 : 14), 1, lbl ? 6 : 6);
      if (lbl) txt(lbl, x, y + 19, 11, '#ffd27a', 'center', '700');
    }
    const mark = (wx, wy, col, l) => { const x = toX(Math.atan2(wy - P.y, wx - P.x)); if (x == null) return; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + 22); ctx.lineTo(x - 5, y + 30); ctx.lineTo(x + 5, y + 30); ctx.fill(); txt(l, x, y + 42, 10, col, 'center', '700'); };
    for (const o of g.M.objectives) if (!o.done) mark(o.x, o.y, '#ffd27a', '!');
    if (S.mainDone() || g.M.extract.state !== 'idle') mark(g.M.extract.x, g.M.extract.y, '#9fe07a', 'EX');
    for (const b of g.beacons) mark(b.x, b.y, b.col, '•');
  }

  // ---------------------------------------------------------------- maps
  R.drawMinimap = function (g, x, y, size) {
    const M = g.M, k = size / W;
    ctx.save();
    ctx.fillStyle = 'rgba(10,12,14,0.75)'; ctx.fillRect(x, y, size, size);
    ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
    if (!M.miniCanvas) buildMini(M);
    ctx.globalAlpha = 0.85; ctx.drawImage(M.miniCanvas, x, y, size, size); ctx.globalAlpha = 1;
    mapMarkers(g, x, y, k, size < 200 ? 1 : 1.6);
    ctx.restore();
    ctx.strokeStyle = 'rgba(232,226,200,0.25)'; ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  };

  function buildMini(M) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const m = c.getContext('2d'), k = 256 / W;
    m.fillStyle = M.biome.g2; m.fillRect(0, 0, 256, 256);
    for (const o of M.obs) {
      m.fillStyle = o.block ? 'rgba(0,0,0,0.45)' : o.hazard === 'lava' ? '#c85a1a' : o.slowZone ? 'rgba(60,90,110,0.6)' : 'rgba(0,0,0,0.12)';
      if (o.shape === 'r') m.fillRect(o.x * k, o.y * k, Math.max(1, o.w * k), Math.max(1, o.h * k)); else { m.beginPath(); m.arc(o.x * k, o.y * k, Math.max(0.8, o.r * k), 0, TAU); m.fill(); }
    }
    M.miniCanvas = c;
  }

  function mapMarkers(g, x, y, k, s) {
    const M = g.M, P = g.player;
    const dot = (wx, wy, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + wx * k, y + wy * k, r * s, 0, TAU); ctx.fill(); };
    const ring = (wx, wy, r, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + wx * k, y + wy * k, r * s, 0, TAU); ctx.stroke(); };
    for (const op of M.outposts) if (!op.cleared) { const seen = g.revealed || op.main || g.divers.some(d => d.alive && Math.hypot(d.x - op.x, d.y - op.y) < 1000) || op.alert; if (seen) { ring(op.x, op.y, 5, '#ff6b5a'); for (const sp of op.spawners) if (sp.alive) dot(sp.x, sp.y, 1.2, '#ff6b5a'); } }
    for (const st of M.side) { const done = st.type === 'radar' ? st.state === 'done' : !st.alive; ctx.fillStyle = done ? '#6a8a5a' : '#ffb07a'; const px = x + st.x * k, py = y + st.y * k; ctx.fillRect(px - 3 * s, py - 3 * s, 6 * s, 6 * s); }
    for (const p of M.pois) if (!p.looted && (p.found || (g.mods.has('c3') && (p.kind === 'samples' || p.kind === 'super')) || (P.passive === 'scout' && Math.hypot(P.x - p.x, P.y - p.y) < 700))) dot(p.x, p.y, 2, p.kind === 'samples' || p.kind === 'super' ? '#7fd0ff' : '#e8e2c8');
    for (const o of M.objectives) { ctx.fillStyle = o.done ? '#9fe07a' : '#ffd27a'; const px = x + o.x * k, py = y + o.y * k; ctx.beginPath(); ctx.moveTo(px, py - 6 * s); ctx.lineTo(px + 5 * s, py); ctx.lineTo(px, py + 6 * s); ctx.lineTo(px - 5 * s, py); ctx.closePath(); ctx.fill(); }
    ring(M.extract.x, M.extract.y, 5, '#9fe07a'); dot(M.extract.x, M.extract.y, 2, '#9fe07a');
    for (const e of g.enemies) if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 650) dot(e.x, e.y, e.def.tier >= 2 ? 1.8 : 1, '#ff4a3a');
    for (const b of g.beacons) dot(b.x, b.y, 2, b.col);
    for (const v of g.vehicles) if (v.alive) dot(v.x, v.y, 2, '#5ab4ff');
    for (const d of g.divers) if (d.alive) dot(d.x, d.y, d.isPlayer ? 2.6 : 2, d.isPlayer ? '#ffffff' : '#9fe07a');
    if (P.alive) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + P.x * k, y + P.y * k); ctx.lineTo(x + (P.x + Math.cos(P.ang) * 300) * k, y + (P.y + Math.sin(P.ang) * 300) * k); ctx.stroke(); }
  }

  R.drawMap = function (g, overlay) {
    const size = Math.min(Wd, Ht) - 80, x = (Wd - size) / 2, y = (Ht - size) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, Wd, Ht);
    R.drawMinimap(g, x, y, size);
    txt('TACTICAL MAP · M to close', x, y - 10, 13, '#d8a33a', 'left', '700');
    txt('◆ objective   ○ extraction   ■ side target   ○ red: enemy outpost   • blue: samples', x + size, y - 10, 11, '#c8c2ae', 'right', '500');
  };

  // drop-zone picker before deployment
  R.drawDropMap = function (c2, M, drop, w) {
    const k = w / W;
    if (!M.miniCanvas) buildMini(M);
    c2.drawImage(M.miniCanvas, 0, 0, w, w);
    c2.fillStyle = 'rgba(0,0,0,0.15)'; c2.fillRect(0, 0, w, w);
    for (const o of M.objectives) { c2.fillStyle = '#ffd27a'; const px = o.x * k, py = o.y * k; c2.beginPath(); c2.moveTo(px, py - 8); c2.lineTo(px + 7, py); c2.lineTo(px, py + 8); c2.lineTo(px - 7, py); c2.closePath(); c2.fill(); }
    c2.strokeStyle = '#9fe07a'; c2.lineWidth = 2; c2.beginPath(); c2.arc(M.extract.x * k, M.extract.y * k, 8, 0, TAU); c2.stroke();
    for (const st of M.side) { c2.fillStyle = '#ffb07a'; c2.fillRect(st.x * k - 4, st.y * k - 4, 8, 8); }
    if (drop) { c2.strokeStyle = '#ffffff'; c2.lineWidth = 2; c2.beginPath(); c2.arc(drop.x * k, drop.y * k, 10, 0, TAU); c2.moveTo(drop.x * k - 16, drop.y * k); c2.lineTo(drop.x * k + 16, drop.y * k); c2.moveTo(drop.x * k, drop.y * k - 16); c2.lineTo(drop.x * k, drop.y * k + 16); c2.stroke(); }
  };
})();
