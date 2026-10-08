// The map: a hand-drawn county survey with fog of war, a manor floor plan, and the HUD minimap.
var NF = window.NF || (window.NF = {});
NF.mapui = (function () {
  var M = {}, L = 8192, BS = 2048, base = null, open = false, tab = 'county', job = null;
  var view = { x: 0, z: 0, zoom: 1 }, cv, g, drag = null, hover = null, ctxFn = null;
  var $ = function (id) { return document.getElementById(id); };
  // world <-> base-image pixels. North (+z) is up, east (-x) is right.
  function bx(x) { return (L - x) / (2 * L) * BS; }
  function bz(z) { return (L - z) / (2 * L) * BS; }
  var ICON = { safe: '⌂', obj: '★', truck: '▣', poi: '●' };
  function poiKind(id) { return { town: 'town', millbrook: 'town', manor: 'manor', airfield: 'air', church: 'church', relay: 'tower', ranger: 'tower', lake: 'water', dam: 'dam', quarry: 'quarry', mine: 'quarry', fieldlab: 'lab', camp: 'camp', gas1: 'gas', gas2: 'gas', harlan: 'farm', odell: 'farm' }[id] || 'poi'; }
  // ------------------------------------------------------------ the survey sheet
  var GN = 320;
  function startJob() { if (!job && !base) job = { row: 0, H: new Float32Array((GN + 1) * (GN + 1)) }; }
  function work(rows) {
    if (!job) return; var T = NF.terrain;
    for (var k = 0; k < rows && job.row <= GN; k++, job.row++) { var j = job.row; for (var i = 0; i <= GN; i++) job.H[j * (GN + 1) + i] = T.hExact(L - i / GN * 2 * L, L - j / GN * 2 * L); }
    if (job.row > GN) { finishBase(job.H); job = null; }
  }
  M.work = function () { if (job) work(3); };
  function buildBase() { startJob(); work(GN + 2); }
  function finishBase(H) {
    var T = NF.terrain, N = GN, small = document.createElement('canvas'); small.width = small.height = N;
    var sg = small.getContext('2d'), img = sg.createImageData(N, N), step = 2 * L / N;
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var h = H[y * (N + 1) + x], hx = H[y * (N + 1) + x + 1] - h, hy = H[(y + 1) * (N + 1) + x] - h;
      var wx = L - (x + 0.5) / N * 2 * L, wz = L - (y + 0.5) / N * 2 * L;
      // hill shading, light from the north-west
      var shade = Math.max(0.35, Math.min(1.3, 0.85 + (-hx * 0.7 - hy * 0.7) / step * 6));
      var slope = Math.sqrt(hx * hx + hy * hy) / step;
      var forest = T.fbm(wx / 500, wz / 500, 2) * 0.5 + 0.5, thick = T.fbm(wx / 140, wz / 140, 2);
      var r, gg, b;
      var lk = T.lakeAt(wx, wz, -15), water = lk && h < lk.water;
      if (water) { var dep = Math.min(1, (lk.water - h) / 8); r = lk.bayou ? 40 : 42 - dep * 14; gg = lk.bayou ? 58 : 70 - dep * 20; b = lk.bayou ? 50 : 86 - dep * 10; shade = 1; }
      else if (h > 155) { r = 218; gg = 222; b = 226; }
      else if (slope > 0.6 || h > 120) { r = 132; gg = 124; b = 108; }
      else if (thick > -0.25 && forest > 0.35) { r = 70 + forest * 6; gg = 92 + forest * 10; b = 58; }
      else { r = 150; gg = 146; b = 104; }
      var hl = Math.min(1, Math.max(0, (h + 10) / 160)); r += hl * 30; gg += hl * 24; b += hl * 20;
      // contour lines every 10 m, heavier every 50 m
      var c0 = Math.floor(h / 20), c1 = Math.floor(H[y * (N + 1) + x + 1] / 20), c2 = Math.floor(H[(y + 1) * (N + 1) + x] / 20);
      var o = (y * N + x) * 4;
      img.data[o] = r * shade; img.data[o + 1] = gg * shade; img.data[o + 2] = b * shade; img.data[o + 3] = 255;
      if (!water && (c0 !== c1 || c0 !== c2)) { var heavy = Math.floor(h / 50) !== Math.floor(H[y * (N + 1) + x + 1] / 50) || Math.floor(h / 50) !== Math.floor(H[(y + 1) * (N + 1) + x] / 50); var dk = heavy ? 0.6 : 0.82; img.data[o] *= dk; img.data[o + 1] *= dk; img.data[o + 2] *= dk; }
    }
    sg.putImageData(img, 0, 0);
    base = document.createElement('canvas'); base.width = base.height = BS; var b2 = base.getContext('2d');
    b2.imageSmoothingEnabled = true; b2.drawImage(small, 0, 0, BS, BS);
    // paper grain
    var r0 = NF.tex.rnd(17);
    for (var k = 0; k < 9000; k++) { b2.fillStyle = 'rgba(' + (r0() < 0.5 ? '0,0,0' : '255,240,210') + ',' + (r0() * 0.06) + ')'; b2.fillRect(r0() * BS, r0() * BS, 1 + r0() * 2, 1 + r0() * 2); }
    // lake shoreline
    b2.strokeStyle = 'rgba(20,34,44,.8)'; b2.lineWidth = 1.5; b2.setLineDash([]);
    // flattened sites read as cleared ground
    T.pois.forEach(function (p) { if (!p.flat || p.id === 'manor') return; b2.fillStyle = 'rgba(190,176,130,.22)'; b2.beginPath(); b2.arc(bx(p.x), bz(p.z), p.r / (2 * L) * BS, 0, 7); b2.fill(); });
    // roads: dark casing, pale fill
    function roads(w, col) { b2.strokeStyle = col; b2.lineCap = 'round'; T.roads.forEach(function (r) { b2.lineWidth = (r.w > 4.3 ? w * 0.8 : w); b2.beginPath(); b2.moveTo(bx(r.ax), bz(r.az)); b2.lineTo(bx(r.bx), bz(r.bz)); b2.stroke(); }); }
    roads(4.2, 'rgba(40,30,20,.85)'); roads(2.2, '#e6d6a8');
    // building footprints
    (T.placements || []).forEach(function (o) {
      var w = o.w, d = o.d; if (o.kind === 'gas' ) { w = 14; d = 9; } if (o.kind === 'boxcar') { w = 3; d = 13; } if (o.kind === 'wall') { b2.fillStyle = '#8a8880'; var ww = Math.max(2, o.w / (2 * L) * BS), dd = Math.max(2, o.d / (2 * L) * BS); b2.fillRect(bx(o.x) - ww / 2, bz(o.z) - dd / 2, ww, dd); return; } if (o.kind === 'turbine') { b2.fillStyle = '#e8e8e0'; b2.fillRect(bx(o.x) - 1.5, bz(o.z) - 1.5, 3, 3); return; } if (o.kind === 'church') { w = 13; d = 28; } if (o.kind === 'shack') { w = 8; d = 7; } if (o.kind === 'farm') { w = 16; d = 12; } if (o.kind === 'bunker') { w = 14; d = 10; }
      if (!w || !d) { if (o.kind === 'relay' || o.kind === 'watertower' || o.kind === 'belltower' || o.kind === 'lookout') { b2.fillStyle = '#3a2a20'; b2.fillRect(bx(o.x) - 1.5, bz(o.z) - 1.5, 3, 3); } return; }
      var sw = w / (2 * L) * BS, sd = d / (2 * L) * BS;
      b2.fillStyle = o.safe || o.kind === 'police' || o.kind === 'shack' ? '#2e6a42' : '#5a3e2c'; b2.fillRect(bx(o.x) - sw / 2, bz(o.z) - sd / 2, Math.max(1.2, sw), Math.max(1.2, sd));
    });
    // runway
    var af = T.poi('airfield'); b2.fillStyle = '#4a4a46'; var rw = 36 / (2 * L) * BS, rl = 460 / (2 * L) * BS; b2.fillRect(bx(af.x + 60) - rw / 2, bz(af.z) - rl / 2, rw, rl);
    // dam
    var dm = T.poi('dam'); b2.fillStyle = '#8a8880'; b2.fillRect(bx(dm.x) - 120 / (2 * L) * BS, bz(dm.z) - 2, 240 / (2 * L) * BS, 4);
    // sheet border
    b2.strokeStyle = 'rgba(30,20,10,.7)'; b2.lineWidth = 6; b2.strokeRect(3, 3, BS - 6, BS - 6);
  }
  // ------------------------------------------------------------ county view
  function scale() { return Math.min(cv.width, cv.height) / BS * view.zoom; }
  function toScreen(x, z) { var s = scale(); return [(bx(x) - bx(view.x)) * s + cv.width / 2, (bz(z) - bz(view.z)) * s + cv.height / 2]; }
  function toWorld(sx, sy) { var s = scale(); var px = (sx - cv.width / 2) / s + bx(view.x), py = (sy - cv.height / 2) / s + bz(view.z); return [L - px / BS * 2 * L, L - py / BS * 2 * L]; }
  function drawCounty() {
    var c = ctxFn(), P = c.P, flags = c.flags, T = NF.terrain, s = scale(), W = cv.width, Hh = cv.height, dpr = cv.dpr;
    g.fillStyle = '#0b0d0f'; g.fillRect(0, 0, W, Hh);
    var o = toScreen(L, L); g.imageSmoothingEnabled = true; g.drawImage(base, o[0], o[1], BS * s, BS * s);
    // fog of war over chunks never seen
    var seen = flags.seen || {}, CH = T.CH, cs = CH / (2 * L) * BS * s;
    g.fillStyle = 'rgba(11,13,15,.78)';
    var NC = NF.terrain.NCH; for (var cx = -NC; cx < NC; cx++) for (var cz = -NC; cz < NC; cz++) { if (seen[cx + ',' + cz]) continue; var p = toScreen(cx * CH + CH, cz * CH + CH); if (p[0] > W || p[1] > Hh || p[0] + cs < 0 || p[1] + cs < 0) continue; g.fillRect(p[0] - 0.5, p[1] - 0.5, cs + 1, cs + 1); }
    // survey grid every kilometre
    g.strokeStyle = 'rgba(30,20,10,.25)'; g.lineWidth = 1; g.font = (11 * dpr) + 'px "Special Elite", monospace'; g.fillStyle = 'rgba(232,220,200,.5)';
    for (var gx = -8000; gx <= 8000; gx += 1000) { var a = toScreen(gx, L), bb = toScreen(gx, -L); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(bb[0], bb[1]); g.stroke(); }
    for (var gz = -8000; gz <= 8000; gz += 1000) { var a2 = toScreen(L, gz), b3 = toScreen(-L, gz); g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(b3[0], b3[1]); g.stroke(); }
    // places
    var disc = flags.disc || {};
    var labelSize = Math.max(11, Math.min(16, 10 + view.zoom * 2)) * dpr;
    T.pois.forEach(function (p) {
      if (p.id === 'manor' && !flags.escaped) return;
      var known = disc[p.id] || p.id === 'town' || p.id === 'manor' || (flags.radio && p.id === 'relay') || (flags.beacon && p.id === 'church') || (flags.teoDead && p.id === 'airfield');
      var q = toScreen(p.x, p.z);
      if (view.zoom < 2.2 && p.r < 120 && p.id !== 'manor') { if (known) { g.fillStyle = '#f0e4c8'; g.beginPath(); g.arc(q[0], q[1], 3 * dpr, 0, 7); g.fill(); } return; }
      if (!known) { g.fillStyle = 'rgba(232,220,200,.35)'; g.font = (14 * dpr) + 'px Cinzel, serif'; g.textAlign = 'center'; g.fillText('?', q[0], q[1] + 5 * dpr); return; }
      var big = p.id === 'town' || p.id === 'airfield' || p.id === 'lake';
      g.font = (big ? 700 : 500) + ' ' + (big ? labelSize * 1.25 : labelSize) + 'px Cinzel, serif'; g.textAlign = 'center';
      g.lineWidth = 3 * dpr; g.strokeStyle = 'rgba(20,14,8,.85)'; g.strokeText(p.name, q[0], q[1] - 10 * dpr); g.fillStyle = p.id === 'lake' ? '#a8c8d8' : '#f0e4c8'; g.fillText(p.name, q[0], q[1] - 10 * dpr);
      if (p.id !== 'lake') { g.fillStyle = '#f0e4c8'; g.strokeStyle = '#1a120a'; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(q[0], q[1], 4 * dpr, 0, 7); g.fill(); g.stroke(); }
      if (p.danger && view.zoom >= 2.2) { var sk = '☠'.repeat(Math.min(5, p.danger)); g.font = (10 * dpr) + 'px sans-serif'; g.lineWidth = 3 * dpr; g.strokeStyle = 'rgba(10,8,6,.9)'; g.strokeText(sk, q[0], q[1] + 16 * dpr); g.fillStyle = T.DANGER_COLS[p.danger]; g.fillText(sk, q[0], q[1] + 16 * dpr); }
    });
    // safehouses
    (T.placements || []).forEach(function (o) {
      if ((o.kind !== 'shack' && o.kind !== 'police') || !safeKnown(o, c)) return;
      var q = toScreen(o.x, o.z); badge(q, '#2e8a52', '⌂', 13);
    });
    // trucks
    NF.vehicles.list.forEach(function (v) { if (v.hp <= 0) return; if (!seen[Math.floor(v.pos.x / CH) + ',' + Math.floor(v.pos.z / CH)]) return; var q = toScreen(v.pos.x, v.pos.z); badge(q, '#3a6aa8', '▣', 11); });
    // objective
    var ob = c.obj;
    if (ob) {
      var q2 = toScreen(ob.x, ob.z), me = toScreen(P.pos.x, P.pos.z);
      g.setLineDash([6 * dpr, 6 * dpr]); g.strokeStyle = 'rgba(201,162,74,.8)'; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(me[0], me[1]); g.lineTo(q2[0], q2[1]); g.stroke(); g.setLineDash([]);
      var pulse = 1 + 0.25 * Math.sin(performance.now() / 300);
      g.fillStyle = 'rgba(201,162,74,.25)'; g.beginPath(); g.arc(q2[0], q2[1], 16 * dpr * pulse, 0, 7); g.fill();
      g.font = (24 * dpr) + 'px serif'; g.textAlign = 'center'; g.fillStyle = '#ffd25a'; g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeText('★', q2[0], q2[1] + 8 * dpr); g.fillText('★', q2[0], q2[1] + 8 * dpr);
    }
    // the player, with a view cone
    var pm = toScreen(P.pos.x, P.pos.z), head = c.heading;
    g.save(); g.translate(pm[0], pm[1]); g.rotate(head);
    var grd = g.createRadialGradient(0, 0, 0, 0, 0, 60 * dpr); grd.addColorStop(0, 'rgba(255,230,180,.35)'); grd.addColorStop(1, 'rgba(255,230,180,0)');
    g.fillStyle = grd; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 60 * dpr, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); g.closePath(); g.fill();
    g.fillStyle = '#ff4a3a'; g.strokeStyle = '#fff'; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(0, -11 * dpr); g.lineTo(8 * dpr, 9 * dpr); g.lineTo(0, 4 * dpr); g.lineTo(-8 * dpr, 9 * dpr); g.closePath(); g.fill(); g.stroke(); g.restore();
    // scale bar and compass rose
    var px500 = (view.zoom > 4 ? 500 : 2000) / (2 * L) * BS * s, scaleLbl = view.zoom > 4 ? '500 m' : '2 km', sx = W - 40 * dpr - px500, sy = Hh - 70 * dpr;
    g.fillStyle = 'rgba(10,8,6,.8)'; g.fillRect(sx - 10 * dpr, sy - 22 * dpr, px500 + 20 * dpr, 34 * dpr);
    g.fillStyle = '#e8dcc8'; g.fillRect(sx, sy, px500 / 2, 5 * dpr); g.fillStyle = '#5a4a3a'; g.fillRect(sx + px500 / 2, sy, px500 / 2, 5 * dpr); g.strokeStyle = '#e8dcc8'; g.lineWidth = 1; g.strokeRect(sx, sy, px500, 5 * dpr);
    g.font = (11 * dpr) + 'px "Special Elite", monospace'; g.textAlign = 'center'; g.fillStyle = '#e8dcc8'; g.fillText('0', sx, sy - 6 * dpr); g.fillText(scaleLbl, sx + px500, sy - 6 * dpr);
    rose(W - 70 * dpr, 150 * dpr, 30 * dpr);
    tooltip(c);
  }
  function badge(q, col, ch, size) {
    var dpr = cv.dpr, r = size * dpr * 0.75;
    g.fillStyle = col; g.strokeStyle = '#0a0806'; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(q[0], q[1], r, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.font = (size * dpr) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, q[0], q[1] + 1); g.textBaseline = 'alphabetic';
  }
  function rose(x, y, r) {
    g.save(); g.translate(x, y); g.fillStyle = 'rgba(10,8,6,.7)'; g.beginPath(); g.arc(0, 0, r * 1.3, 0, 7); g.fill();
    g.fillStyle = '#c9a24a'; g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.22, 0); g.lineTo(0, r * 0.25); g.lineTo(-r * 0.22, 0); g.closePath(); g.fill();
    g.fillStyle = '#5a4a3a'; g.beginPath(); g.moveTo(0, r); g.lineTo(r * 0.22, 0); g.lineTo(-r * 0.22, 0); g.closePath(); g.fill();
    g.fillStyle = '#e8dcc8'; g.font = '700 ' + (r * 0.45) + 'px Cinzel, serif'; g.textAlign = 'center'; g.fillText('N', 0, -r * 1.05 - 2); g.restore();
  }
  function tooltip(c) {
    var tip = $('mapTip'); if (!hover) { tip.style.display = 'none'; return; }
    var w = toWorld(hover[0] * cv.dpr, hover[1] * cv.dpr), best = null, bd = 60 / scale();
    var sh = safeAt(hover[0] * cv.dpr, hover[1] * cv.dpr, c);
    if (sh) { tip.innerHTML = '<b>' + (sh.name || 'Safehouse') + '</b>' + (c.canTravel ? 'Click to travel here' : 'Fast travel works from inside a safehouse'); tip.style.display = 'block'; tip.style.left = (hover[0] + 16) + 'px'; tip.style.top = (hover[1] + 12) + 'px'; return; }
    NF.terrain.pois.forEach(function (p) { var d = Math.hypot(p.x - w[0], p.z - w[1]); if (d < Math.max(bd, p.r * 0.6) && (!best || d < best.d)) best = { p: p, d: d }; });
    var disc = c.flags.disc || {};
    if (!best || !(disc[best.p.id] || best.p.id === 'town')) { tip.style.display = 'none'; return; }
    var dist = Math.round(Math.hypot(best.p.x - c.P.pos.x, best.p.z - c.P.pos.z));
    tip.innerHTML = '<b>' + best.p.name + '</b>' + (dist > 1000 ? (dist / 1000).toFixed(1) + ' km' : dist + ' m') + ' away' + (best.p.danger ? '<br>Danger: ' + NF.game.dangerTag(best.p.danger) : '');
    tip.style.display = 'block'; tip.style.left = (hover[0] + 16) + 'px'; tip.style.top = (hover[1] + 12) + 'px';
  }
  function safeKnown(o, c) { var seen = c.flags.seen || {}, CH = NF.terrain.CH; return o.kind === 'police' || seen[Math.floor(o.x / CH) + ',' + Math.floor(o.z / CH)]; }
  function safeAt(sx, sy, c) {
    var best = null, bd = 14 * cv.dpr;
    (NF.terrain.placements || []).forEach(function (o) { if ((o.kind !== 'shack' && o.kind !== 'police') || !safeKnown(o, c)) return; var q = toScreen(o.x, o.z), d = Math.hypot(q[0] - sx, q[1] - sy); if (d < bd) { bd = d; best = o; } });
    return best;
  }
  // ------------------------------------------------------------ manor plan
  function drawManor() {
    var c = ctxFn(), P = c.P, flags = c.flags, W0 = NF.world, Wd = cv.width, Hh = cv.height, dpr = cv.dpr;
    g.fillStyle = '#0d1012'; g.fillRect(0, 0, Wd, Hh);
    // blueprint grid
    g.strokeStyle = 'rgba(120,160,190,.08)'; g.lineWidth = 1; for (var x = 0; x < Wd; x += 24 * dpr) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hh); g.stroke(); } for (var y = 0; y < Hh; y += 24 * dpr) { g.beginPath(); g.moveTo(0, y); g.lineTo(Wd, y); g.stroke(); }
    var minX = -30, maxX = 30, minZ = -2, maxZ = 74, s = Math.min(Wd / (maxX - minX), (Hh - 120 * dpr) / (maxZ - minZ)) * 0.9 * Math.max(1, view.zoom * 0.6);
    var ox = Wd / 2, oz = Hh / 2 + (maxZ + minZ) / 2 * s;
    function X(x2) { return ox - x2 * s; } function Z(z) { return oz - z * s; }
    var vis = flags.visited || {}, here = W0.roomAt(P.pos.x, P.pos.z);
    W0.rooms.forEach(function (r) {
      var seen = vis[r.id], x0 = X(r.x1), x1 = X(r.x0), z0 = Z(r.z1), z1 = Z(r.z0);
      g.fillStyle = r === here ? 'rgba(201,162,74,.32)' : seen ? (r.safe ? 'rgba(60,150,90,.28)' : 'rgba(70,110,160,.22)') : 'rgba(255,255,255,.04)';
      g.fillRect(x0, z0, x1 - x0, z1 - z0);
      g.strokeStyle = seen ? '#d8ccb4' : 'rgba(255,255,255,.18)'; g.lineWidth = 3 * dpr; g.strokeRect(x0, z0, x1 - x0, z1 - z0);
      g.fillStyle = seen ? '#e8dcc8' : 'rgba(255,255,255,.3)'; g.font = '600 ' + (13 * dpr) + 'px Cinzel, serif'; g.textAlign = 'center';
      g.fillText(seen ? r.name.toUpperCase() : 'UNEXPLORED', (x0 + x1) / 2, (z0 + z1) / 2 + 4 * dpr);
      if (r.safe && seen) { g.fillStyle = '#5ac87a'; g.font = (11 * dpr) + 'px Inter, sans-serif'; g.fillText('SAFE ROOM', (x0 + x1) / 2, (z0 + z1) / 2 + 20 * dpr); }
    });
    W0.doors.forEach(function (d) {
      if (!vis[d.a] && !vis[d.b] || d.chunk) return; if (!W0.room(d.a || 'x') && !W0.room(d.b || 'x')) return;
      var locked = d.never || d.relock || (d.lock && !c.hasKey(d));
      var col = d.open && !d.relock ? '#3cff7a' : locked ? '#ff3a3a' : '#5aa0ff';
      var w = d.w * s, q = [X(d.x), Z(d.z)];
      g.fillStyle = col; if (d.axis === 'x') g.fillRect(q[0] - w / 2, q[1] - 3 * dpr, w, 6 * dpr); else g.fillRect(q[0] - 3 * dpr, q[1] - w / 2, 6 * dpr, w);
      if (locked) { g.font = (12 * dpr) + 'px sans-serif'; g.textAlign = 'center'; g.fillText('🔒', q[0], q[1] - 8 * dpr); }
    });
    W0.items.forEach(function (it) { if (it.taken) return; var r = W0.roomAt(it.x, it.z); if (r && vis[r.id] && W0.rooms.indexOf(r) >= 0) { g.fillStyle = '#ffd25a'; g.beginPath(); g.arc(X(it.x), Z(it.z), 3.5 * dpr, 0, 7); g.fill(); } });
    W0.spots.forEach(function (sp) { if (sp.id.indexOf('tw_') === 0 && W0.roomAt(sp.x, sp.z) && W0.rooms.indexOf(W0.roomAt(sp.x, sp.z)) >= 0) badge([X(sp.x), Z(sp.z)], '#2e8a52', '⌨', 12); });
    if (here && W0.rooms.indexOf(here) >= 0) { g.save(); g.translate(X(P.pos.x), Z(P.pos.z)); g.rotate(-P.yaw); g.fillStyle = '#ff4a3a'; g.strokeStyle = '#fff'; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(0, -11 * dpr); g.lineTo(8 * dpr, 9 * dpr); g.lineTo(0, 4 * dpr); g.lineTo(-8 * dpr, 9 * dpr); g.closePath(); g.fill(); g.stroke(); g.restore(); }
    rose(Wd - 70 * dpr, 150 * dpr, 30 * dpr);
    $('mapTip').style.display = 'none';
  }
  // ------------------------------------------------------------ open / close
  function legend() {
    var rows = tab === 'county'
      ? [['<i style="color:#ff4a3a">▲</i>', 'You'], ['<i style="color:#ffd25a">★</i>', 'Objective'], ['<i style="color:#5ac87a">⌂</i>', 'Safehouse: typewriter, item box, Peddler'], ['<i style="color:#6a9ad8">▣</i>', 'Truck'], ['<i style="color:#e6d6a8">━</i>', 'Road'], ['<i style="color:#8a6a4a">■</i>', 'Building'], ['<i style="color:#5a7a4a">▓</i>', 'Forest'], ['<i style="color:#555">░</i>', 'Not yet explored']]
      : [['<i style="color:#ff4a3a">▲</i>', 'You'], ['<i style="color:#3cff7a">▬</i>', 'Open door'], ['<i style="color:#5aa0ff">▬</i>', 'Unlocked door'], ['<i style="color:#ff3a3a">▬</i>', 'Locked door'], ['<i style="color:#ffd25a">●</i>', 'Item you have seen'], ['<i style="color:#5ac87a">⌨</i>', 'Typewriter']];
    if (tab === 'county') { rows.splice(3, 0, ['<i style="color:#5ac87a">⇄</i>', 'In a safehouse, click another safehouse to fast travel']); rows.push(['<i style="color:#e03a30">☠</i>', 'Danger rating, 1 to 5 skulls']); }
    if (tab === 'nadir') rows = [['<i style="color:#ff4a3a">▲</i>', 'You'], ['<i style="color:#ffd25a">⇅</i>', 'Elevator'], ['<i style="color:#5aa0ff">▬</i>', 'Doorway'], ['<i style="color:#ff3a3a">▬</i>', 'Locked security door'], ['<i style="color:#ff7ad0">●</i>', 'Key card or weapon'], ['<i style="color:#9ad0ff">●</i>', 'File'], ['<i style="color:#ffd25a">●</i>', 'Supplies'], ['<i style="color:#5ac87a">■</i>', 'Safe room']];
    $('mapLegend').innerHTML = rows.map(function (r) { return r[0] + '<span>' + r[1] + '</span>'; }).join('');
  }
  function sizeCanvas() { var dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cv.dpr = dpr; }
  function frame() { if (!open) return; draw(); requestAnimationFrame(frame); }
  function draw() { if (tab === 'county') drawCounty(); else if (tab === 'nadir') { var c = ctxFn(); NF.bunker.drawPlan(g, cv.width, cv.height, cv.dpr, c.P, c.flags, view.zoom); $('mapTip').style.display = 'none'; } else drawManor(); }
  function setTab(t) {
    tab = t; document.querySelectorAll('[data-mtab]').forEach(function (b) { b.classList.toggle('on', b.dataset.mtab === t); });
    var c = ctxFn(); $('mapTitle').textContent = t === 'county' ? 'Ashgrove County' : t === 'nadir' ? 'Site NADIR' : 'Ashgrove Manor';
    var disc = Object.keys(c.flags.disc || {}).length, seenN = Object.keys(c.flags.seen || {}).length;
    $('mapSub').innerHTML = t === 'nadir' ? (NF.bunker.current() ? NF.bunker.current().def.name + ' · −' + NF.bunker.current().def.depth + ' m · ' + NF.game.dangerTag(NF.bunker.DANGER[NF.bunker.level]) : '') : t === 'county' ? 'Survey sheet · 16 km × 16 km · ' + (seenN / (4 * NF.terrain.NCH * NF.terrain.NCH) * 100).toFixed(1) + '% explored · ' + disc + ' places found' : 'Floor plan · ' + Object.keys(c.flags.visited || {}).filter(function (k) { return NF.world.room(k); }).length + ' of 6 rooms explored';
    legend();
  }
  M.init = function (getCtx) {
    ctxFn = getCtx; cv = $('mapC'); g = cv.getContext('2d');
    window.addEventListener('resize', function () { if (open) sizeCanvas(); });
    cv.addEventListener('mousedown', function (e) { drag = [e.clientX, e.clientY, view.x, view.z, false]; });
    window.addEventListener('mouseup', function (e) {
      if (drag && !drag[4] && tab === 'county' && open) { var c = ctxFn(), sh = safeAt(e.clientX * cv.dpr, e.clientY * cv.dpr, c); if (sh && c.canTravel) { drag = null; c.travel(sh); return; } }
      drag = null;
    });
    cv.addEventListener('mousemove', function (e) {
      hover = [e.clientX, e.clientY];
      if (drag && Math.hypot(e.clientX - drag[0], e.clientY - drag[1]) > 4) drag[4] = true;
      if (drag && tab === 'county') { var s = scale() / cv.dpr, k = 2 * L / BS / s; view.x = drag[2] + (e.clientX - drag[0]) * k; view.z = drag[3] + (e.clientY - drag[1]) * k; clampView(); }
    });
    cv.addEventListener('mouseleave', function () { hover = null; });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault(); if (tab !== 'county') { view.zoom = Math.max(1, Math.min(3, view.zoom * (e.deltaY < 0 ? 1.15 : 0.87))); return; }
      var before = toWorld(e.clientX * cv.dpr, e.clientY * cv.dpr);
      view.zoom = Math.max(0.9, Math.min(36, view.zoom * (e.deltaY < 0 ? 1.18 : 0.85)));
      var after = toWorld(e.clientX * cv.dpr, e.clientY * cv.dpr); view.x += before[0] - after[0]; view.z += before[1] - after[1]; clampView();
    }, { passive: false });
    $('mzIn').onclick = function () { view.zoom = Math.min(36, view.zoom * 1.4); };
    $('mzOut').onclick = function () { view.zoom = Math.max(0.9, view.zoom / 1.4); clampView(); };
    $('mzMe').onclick = function () { var c = ctxFn(); view.x = c.P.pos.x; view.z = c.P.pos.z; };
    document.querySelectorAll('[data-mtab]').forEach(function (b) { b.onclick = function () { setTab(b.dataset.mtab); }; });
  };
  function clampView() { view.x = Math.max(-L, Math.min(L, view.x)); view.z = Math.max(-L, Math.min(L, view.z)); }
  M.open = function () {
    var c = ctxFn(); open = true; sizeCanvas();
    if (!base) buildBase();
    var t = c.inBunker ? 'nadir' : c.flags.escaped && !c.inManor ? 'county' : 'manor';
    $('mapTabs').style.display = c.flags.escaped ? 'flex' : 'none';
    var nb = document.querySelector('[data-mtab=nadir]'); if (nb) nb.style.display = c.inBunker ? '' : 'none';
    $('mapZoom').style.display = t === 'county' ? 'flex' : 'none';
    view.x = c.P.pos.x; view.z = c.P.pos.z; view.zoom = t === 'county' ? 6 : 1;
    setTab(t); requestAnimationFrame(frame);
    document.querySelectorAll('[data-mtab]').forEach(function (b) { b.addEventListener('click', function () { $('mapZoom').style.display = tab === 'county' ? 'flex' : 'none'; }); });
  };
  M.close = function () { open = false; };
  M.screenOf = function (x, z) { var q = toScreen(x, z); return [q[0] / cv.dpr, q[1] / cv.dpr]; };
  M.prebuild = function () { if (!base && NF.terrain.ready) startJob(); };
  // ------------------------------------------------------------ exploration and the HUD minimap
  M.track = function (P, flags) {
    if (!flags.escaped) return;
    var s = flags.seen || (flags.seen = {}), CH = NF.terrain.CH, cx = Math.floor(P.pos.x / CH), cz = Math.floor(P.pos.z / CH);
    for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) s[(cx + dx) + ',' + (cz + dz)] = 1;
  };
  var mini, mg, miniT = 0;
  M.miniBunker = function (P, heading) { if (!mini) { mini = $('mini'); mg = mini.getContext('2d'); } mini.style.display = 'block'; NF.bunker.drawMini(mg, mini.width, P, heading); };
  M.mini = function (show, P, heading, obj) {
    if (!mini) { mini = $('mini'); mg = mini.getContext('2d'); }
    mini.style.display = show ? 'block' : 'none';
    if (!show) return;
    if (!base) { startJob(); return; }
    var R = mini.width / 2, s = mini.width / (650 / (2 * L) * BS);
    mg.save(); mg.clearRect(0, 0, mini.width, mini.height); mg.beginPath(); mg.arc(R, R, R - 2, 0, 7); mg.clip();
    mg.fillStyle = '#0b0d0f'; mg.fillRect(0, 0, mini.width, mini.height);
    mg.translate(R, R); mg.rotate(heading);
    mg.drawImage(base, -bx(P.pos.x) * s, -bz(P.pos.z) * s, BS * s, BS * s);
    NF.vehicles.list.forEach(function (v) { if (v.hp <= 0) return; var dx = (bx(v.pos.x) - bx(P.pos.x)) * s, dy = (bz(v.pos.z) - bz(P.pos.z)) * s; if (dx * dx + dy * dy > R * R) return; mg.fillStyle = '#5a9ad8'; mg.fillRect(dx - 6, dy - 6, 12, 12); });
    if (obj) { var ox = (bx(obj.x) - bx(P.pos.x)) * s, oy = (bz(obj.z) - bz(P.pos.z)) * s, d = Math.hypot(ox, oy), lim = R - 18; if (d > lim) { ox *= lim / d; oy *= lim / d; } mg.save(); mg.translate(ox, oy); mg.rotate(-heading); mg.font = '30px serif'; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillStyle = '#ffd25a'; mg.strokeStyle = '#000'; mg.lineWidth = 4; mg.strokeText('★', 0, 0); mg.fillText('★', 0, 0); mg.restore(); }
    mg.restore();
    // player marker always points up
    mg.fillStyle = '#ff4a3a'; mg.strokeStyle = '#fff'; mg.lineWidth = 3; mg.beginPath(); mg.moveTo(R, R - 16); mg.lineTo(R + 11, R + 12); mg.lineTo(R, R + 5); mg.lineTo(R - 11, R + 12); mg.closePath(); mg.fill(); mg.stroke();
    // north tick on the rim
    mg.save(); mg.translate(R, R); mg.rotate(heading); mg.fillStyle = '#c9a24a'; mg.font = '700 26px Cinzel, serif'; mg.textAlign = 'center'; mg.fillText('N', 0, -R + 30); mg.restore();
    mg.strokeStyle = 'rgba(201,162,74,.6)'; mg.lineWidth = 4; mg.beginPath(); mg.arc(R, R, R - 3, 0, 7); mg.stroke();
  };
  return M;
})();
