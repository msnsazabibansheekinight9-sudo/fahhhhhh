// Kestrel — architectural detail pass: ducts, cable trays, conduits, junction boxes, posters, notice boards,
// clocks, alarm pulls, floor drains, hatches, guide stripes, frame stencils, cable runs.
(function () {
  const K = window.K, S = K.S, WT = K.WT, P = K.prim;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const POSTERS = {
    station: [
      ['HALDEN-VOSS', 'PROGRESS WITHOUT LIMIT', '#c8a040', '#1a2430'], ['REPORT ALL', 'BIOLOGICAL ANOMALIES', '#e8e0d0', '#7a1a14'],
      ['KESTREL STATION', '4,012 DAYS WITHOUT INCIDENT', '#e8e0d0', '#24402e', true], ['WEAR YOUR BADGE', 'AT ALL TIMES', '#1a1a1a', '#d8b030'],
      ['HYDROPONICS', 'GROW THE FUTURE', '#e8f0d8', '#2e5a2a'], ['QUARANTINE', 'IS FOR YOUR SAFETY', '#f0f0f0', '#8a2a20'],
    ],
    cruiser: [
      ['ISV CALLIOPE', 'HALDEN-VOSS FLEET SERVICES', '#d0d8e0', '#20282e'], ['LOOSE TALK', 'COSTS LIVES', '#f0e0c0', '#5a1a14'],
      ['SEAL HATCHES', 'BEHIND YOU', '#1a1a1a', '#d8b030'], ['CREW ROTATION 14', '228 DAYS TO HOME', '#e0e0e0', '#2a3a4a', true],
    ],
  };
  function posterTex(t, sub, fg, bg, defaced, seed) {
    const c = K.canvas(256, 384), x = c.getContext('2d'), r = K.rng(seed);
    x.fillStyle = bg; x.fillRect(0, 0, 256, 384);
    x.strokeStyle = fg; x.lineWidth = 3; x.strokeRect(10, 10, 236, 364);
    // simple emblem: ringed planet / station silhouette
    x.save(); x.translate(128, 150); x.strokeStyle = fg; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 54, 0, K.TAU); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.ellipse(0, 0, 92, 22, -.35, 0, K.TAU); x.stroke(); x.fillStyle = fg; x.fillRect(-6, -54, 12, 108); x.restore();
    x.fillStyle = fg; x.textAlign = 'center'; x.font = 'bold 30px "Chakra Petch", Arial Narrow, sans-serif'; x.fillText(t, 128, 266);
    x.font = 'bold 15px monospace'; wrap(x, sub, 128, 296, 210, 18);
    if (defaced) { x.strokeStyle = 'rgba(90,6,4,.9)'; x.lineWidth = 10; x.beginPath(); x.moveTo(40, 300); x.lineTo(220, 320); x.stroke(); x.fillStyle = 'rgba(90,6,4,.95)'; x.font = 'bold 54px Impact, sans-serif'; x.fillText('0', 200, 360); }
    // wear: creases, stains, torn corner
    for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(40,30,20,${r() * .25})`; x.beginPath(); x.arc(r() * 256, r() * 384, 10 + r() * 50, 0, K.TAU); x.fill(); }
    x.strokeStyle = 'rgba(0,0,0,.2)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 192); x.lineTo(256, 196); x.stroke(); x.beginPath(); x.moveTo(128, 0); x.lineTo(126, 384); x.stroke();
    if (r() < .5) { x.fillStyle = '#000'; x.beginPath(); x.moveTo(256, 384); x.lineTo(200, 384); x.lineTo(256, 320); x.fill(); }
    const tx = K.tex(c); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; return tx;
  }
  function wrap(x, s, cx, y, w, lh) { const words = s.split(' '); let line = ''; for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (x.measureText(t).width > w) { x.fillText(line, cx, y); y += lh; line = wd; } else line = t; } x.fillText(line, cx, y); }
  function boardTex(seed) {
    const c = K.canvas(256, 192), x = c.getContext('2d'), r = K.rng(seed);
    x.fillStyle = '#6a5038'; x.fillRect(0, 0, 256, 192);
    for (let i = 0; i < 9; i++) { const w = 40 + r() * 50, h = 40 + r() * 60, px = r() * (256 - w), py = r() * (192 - h); x.save(); x.translate(px + w / 2, py + h / 2); x.rotate((r() - .5) * .2); x.fillStyle = r() < .2 ? '#e8d880' : '#e8e2d0'; x.fillRect(-w / 2, -h / 2, w, h); x.fillStyle = 'rgba(30,30,30,.6)'; for (let l = 0; l < 6; l++) x.fillRect(-w / 2 + 5, -h / 2 + 8 + l * 7, w * (.4 + r() * .5), 2); x.fillStyle = '#b02020'; x.beginPath(); x.arc(0, -h / 2 + 3, 3, 0, K.TAU); x.fill(); x.restore(); }
    const tx = K.tex(c); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; return tx;
  }
  function stencilTex(text) {
    const c = K.canvas(256, 64), x = c.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, 256, 64); x.fillStyle = 'rgba(30,26,20,.85)'; x.font = 'bold 44px "Chakra Petch", monospace'; x.textBaseline = 'middle'; x.fillText(text, 8, 34);
    const tx = K.tex(c); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; return tx;
  }
  function clockTex() { const c = K.canvas(128), x = c.getContext('2d'); x.fillStyle = '#e8e4d8'; x.beginPath(); x.arc(64, 64, 62, 0, K.TAU); x.fill(); x.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = i / 12 * K.TAU; x.fillRect(64 + Math.sin(a) * 50 - 2, 64 - Math.cos(a) * 50 - 5, 4, 10); } x.strokeStyle = '#111'; x.lineWidth = 5; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + 28, 64 + 10); x.stroke(); x.lineWidth = 3; x.beginPath(); x.moveTo(64, 64); x.lineTo(54, 18); x.stroke(); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 2; x.beginPath(); x.moveTo(20, 30); x.lineTo(90, 100); x.moveTo(70, 20); x.lineTo(40, 110); x.stroke(); const t = K.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; }

  K.detailPass = function (W, ctx) {
    const L = W.L, M = W.M, r = K.rng(L.seed ^ 0xde7a11), st = L.theme === 'station';
    const decal = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: .6 };
    if (!M.poster0) {
      const list = POSTERS[L.theme];
      list.forEach((p, i) => M['poster' + i] = K.bakeMat(Object.assign({ map: posterTex(p[0], p[1], p[2], p[3], p[4], i + 5), roughness: .7 })));
      M.board = K.bakeMat({ map: boardTex(3), roughness: .9 });
      M.clock = K.bakeMat({ map: clockTex(), roughness: .3 });
      M.stripe = K.bakeMat(Object.assign({ color: st ? 0xd6a92a : 0xc8c8c0 }, decal));
      M.cable = M.cable || K.bakeMat({ color: 0x111111, roughness: .7 });
      M.nPosters = list.length;
    }
    const put = (x, z, rot, y = 0) => new K.Put(ctx, x, z, rot, y);
    const stencils = new Map();
    const stencil = (txt) => { const k = 'stn:' + txt; if (!M[k]) M[k] = K.bakeMat(Object.assign({ map: stencilTex(txt) }, decal)); return k; };

    // ---------------- rooms
    for (const room of L.rooms) {
      const a = L.areas[room.id], h = a.height, furn = room.furn || { slots: [], used: new Set() };
      const x0 = room.x * S, z0 = room.y * S, w = room.w * S, d = room.h * S, cx = x0 + w / 2, cz = z0 + d / 2;
      // ceiling duct along the long axis with hangers and flanges
      if (h >= 3.4 && !room.hub && room.cells >= 9) {
        const along = w >= d, len = (along ? w : d) - .6, off = (along ? d : w) * .28 * (r.chance(.5) ? 1 : -1);
        const dx = along ? 0 : off, dz = along ? off : 0, y = h - .45;
        const p = put(cx + dx, cz + dz, along ? Math.PI / 2 : 0);
        p.box('metal', 0, y, 0, .55, .38, len);
        for (let k = -len / 2 + .6; k < len / 2; k += 1.25) { p.box('trim', 0, y, k, .6, .43, .05); p.cyl('dark', -.2, (y + h) / 2 + .1, k, .012, h - y - .2, 0, 0, 0, true).cyl('dark', .2, (y + h) / 2 + .1, k, .012, h - y - .2, 0, 0, 0, true); }
        if (r.chance(.5)) { const k = r.range(-len / 3, len / 3); p.box('dark', 0, y - .2, k, .45, .02, .45); for (let q = 0; q < 5; q++) p.box('trim', -.16 + q * .08, y - .21, k, .02, .02, .42); } // diffuser
      }
      // cable tray hugging one wall near the ceiling
      if (room.cells >= 6 && r.chance(.7)) {
        const side = r.int(0, 3), [sx, sz] = DIRS[side], along = sx !== 0 ? 'z' : 'x', len = (along === 'z' ? d : w) - .5;
        const tx = sx ? (sx > 0 ? x0 + w - WT - .25 : x0 + WT + .25) : cx, tz = sz ? (sz > 0 ? z0 + d - WT - .25 : z0 + WT + .25) : cz;
        const p = put(tx, tz, along === 'z' ? 0 : Math.PI / 2), y = h - .28;
        p.box('dark', 0, y, 0, .32, .03, len).box('dark', -.15, y + .04, 0, .02, .08, len).box('dark', .15, y + .04, 0, .02, .08, len);
        for (let q = 0; q < 5; q++) p.cyl(q % 3 ? 'cable' : (q === 0 ? 'red' : 'blue'), -.1 + q * .05, y + .035, 0, .016, len, Math.PI / 2, 0, 0, true);
        for (let k = -len / 2 + .5; k < len / 2; k += 1.5) p.box('trim', 0, y + .12, k, .04, .2, .04);
      }
      // wall decor on free wall slots
      const free = furn.slots.filter(s => !s.win && !furn.used.has(s.c));
      r.shuffle(free);
      const nDecor = Math.min(free.length, 1 + Math.floor(room.cells / 6));
      for (let k = 0; k < nDecor; k++) {
        const s = free[k], p = put(s.x, s.z, s.rot), pick = r();
        if (pick < .28) p.geo(P.plane, 'poster' + r.int(0, M.nPosters - 1), r.range(-.5, .5), r.range(1.45, 1.7), .012, 0, 0, r.range(-.04, .04), .6, .9);
        else if (pick < .42) { p.box('wood' in M ? 'wood' : 'trim', 0, 1.55, .02, 1.25, .9, .03).geo(P.plane, 'board', 0, 1.55, .036, 0, 0, 0, 1.18, .84); }
        else if (pick < .52) { p.cyl('dark', .3, 2.25, .03, .2, .04, Math.PI / 2, 0, 0).geo(P.plane, 'clock', .3, 2.25, .052, 0, 0, 0, .36, .36); }
        else if (pick < .66) { // conduit junction box with pipes running up
          const jx = r.range(-.6, .6); p.box('plastic', jx, 1.3, .06, .35, .45, .12).box('dark', jx, 1.3, .121, .3, .4, .005).box('ledG', jx + .1, 1.45, .123, .03, .03, .004);
          p.cyl('metal', jx - .08, (1.55 + h) / 2, .05, .025, h - 1.55, 0, 0, 0, true).cyl('metal', jx + .08, (1.55 + h) / 2, .05, .025, h - 1.55, 0, 0, 0, true).cyl('metal', jx, .55, .05, .025, .9, 0, 0, 0, true);
        } else if (pick < .76) { p.box('red', 0, 1.35, .03, .14, .2, .06).box('white', 0, 1.36, .062, .08, .05, .005).box('red', .35, 2.1, .03, .1, .1, .06); } // alarm pull + bell
        else if (pick < .88) { // vent grille low on the wall
          p.box('dark', 0, .45, .015, .7, .35, .03); for (let q = 0; q < 6; q++) p.box('trim', 0, .32 + q * .052, .033, .66, .018, .012, .5, 0, 0);
        } else { p.box('plastic', 0, 1.25, .025, .1, .15, .05).box('dark', 0, 1.27, .051, .04, .05, .004); } // light switch
      }
      // floor: drain, hatch, loose cable runs
      if (room.cells >= 9) {
        const fx = x0 + r.range(.8, w - .8), fz = z0 + r.range(.8, d - .8), p = put(fx, fz, r.int(0, 3) * Math.PI / 2);
        if (r.chance(.5)) { p.box('dark', 0, .003, 0, .5, .006, .5); for (let q = 0; q < 6; q++) p.box('trim', -.2 + q * .08, .007, 0, .02, .004, .44); }
        else { p.box('trim', 0, .004, 0, 1.0, .008, 1.0).box('hazard', 0, .006, 0, .9, .006, .9).box('metal', 0, .009, 0, .76, .006, .76).box('dark', .3, .012, 0, .06, .01, .2); }
      }
      if (r.chance(.35)) { const p = put(x0 + r.range(.5, w - .5), z0 + r.range(.5, d - .5), r.range(0, 3)); for (let q = 0; q < 3; q++) p.cyl('cable', q * .05, .02, 0, .018, r.range(1.5, 3), Math.PI / 2, 0, r.range(-.15, .15), true); }
    }
    // ---------------- corridors
    for (const a of L.areas) {
      if (a.isRoom) continue;
      for (const c of a.cells) {
        const i = c % L.W, j = (c / L.W) | 0, [cx, cz] = L.cellCenter(c), h = a.height;
        const ns = L.edge(i, j, 1, 0) && L.edge(i, j, -1, 0), ew = L.edge(i, j, 0, 1) && L.edge(i, j, 0, -1);
        // painted guide stripe down the middle, broken at junctions
        if (ns !== ew && r.chance(.92)) { const p = put(cx, cz, ns ? 0 : Math.PI / 2); p.box('stripe', 0, .004, 0, .07, .003, S * .96); if ((i + j) % 4 === 0) p.box('stripe', 0, .004, 0, .5, .003, .07); }
        // frame number stencils every few cells
        if ((i * 3 + j * 5) % 9 === 0) for (const [dx, dz] of DIRS) if (L.edge(i, j, dx, dz) === 1) {
          const wx = cx + dx * (S / 2 - WT), wz = cz + dz * (S / 2 - WT);
          const code = `${L.sectorNames[a.sector % L.sectorNames.length][0]}-${String(i).padStart(2, '0')}${String(j).padStart(2, '0')}`;
          put(wx, wz, Math.atan2(-dx, -dz)).geo(P.plane, stencil(code), 0, 1.05, .013, 0, 0, 0, .9, .22); break;
        }
        // vertical conduit and junction boxes
        if (r.chance(.07)) for (const [dx, dz] of DIRS) if (L.edge(i, j, dx, dz) === 1) {
          const p = put(cx + dx * (S / 2 - WT), cz + dz * (S / 2 - WT), Math.atan2(-dx, -dz)), jx = r.range(-.7, .7);
          p.cyl('copper', jx, h / 2, .06, .04, h, 0, 0, 0, true).box('plastic', jx, 1.5, .09, .28, .36, .1).box('ledA', jx + .08, 1.62, .141, .025, .025, .004);
          break;
        }
        // hanging warning sign at junctions
        if (!ns && !ew && r.chance(.25)) { const p = put(cx, cz, r.int(0, 3) * Math.PI / 2); p.cyl('dark', -.3, h - .2, 0, .006, .4, 0, 0, 0, true).cyl('dark', .3, h - .2, 0, .006, .4, 0, 0, 0, true).box('hazard', 0, h - .5, 0, .8, .22, .02); }
      }
    }
  };
})();
