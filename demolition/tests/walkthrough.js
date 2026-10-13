// Crumble walk-through test: builds each map, flood-fills every spot a crouching player can stand on from the spawn
// (stepping up 1, jumping up to 4, dropping, climbing ladders), then checks that every registered building floor and
// every heist item is reachable. Items marked locked are meant to need tools and are reported separately.
//
// Usage: serve demolition/ on http://localhost:8765, then
//   node tests/walkthrough.js /path/to/three.min.js [gullpoint,quarry,estate,oldtown]
// Needs Playwright with a Chromium build. Exits 1 if any floor or unlocked item is unreachable.
const { chromium } = require('playwright');
let failed = false;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 300 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/three.min.js', r => r.fulfill({ path: process.argv[2], contentType: 'text/javascript' }));
  await p.addInitScript(() => { window.addEventListener = new Proxy(window.addEventListener, { apply(t, th, a) { if (a[0] === 'load') return; return Reflect.apply(t, th, a); } }); });
  await p.goto('http://localhost:8765/index.html');
  for (const mapId of (process.argv[3] || 'gullpoint,quarry,estate,oldtown').split(',')) {
    const r = await p.evaluate((mapId) => {
      const w = new World(WORLD_X, WORLD_Y, WORLD_Z, new THREE.Scene());
      const L = Level.build(w, mapId);
      const sx = w.sx, sy = w.sy, sz = w.sz;
      const solid = (x, y, z) => SOLID[w.get(x, y, z)]; const PH = 5; // crouching height
      const clear = (x, y, z, h) => { for (let yy = y; yy < y + h; yy++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (solid(x + dx, yy, z + dz)) return false; return true; };
      const ladderAt = (x, y, z) => { for (let yy = y; yy < y + 7; yy++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (w.get(x + dx, yy, z + dz) === M.LADDER) return true; return false; };
      const standable = (x, y, z) => { if (x < 2 || z < 2 || x >= sx - 2 || z >= sz - 2 || y < 1 || y + 7 > sy) return false; let floor = false; for (let dz = -1; dz <= 1 && !floor; dz++) for (let dx = -1; dx <= 1; dx++) if (solid(x + dx, y - 1, z + dz)) { floor = true; break; } return floor && clear(x, y, z, PH); };
      const key = (x, y, z) => (y * sz + z) * sx + x;
      const seen = new Uint8Array(w.n);
      const sp = L.spawn; let y0 = GY; while (y0 < sy - 8 && !standable(Math.floor(sp.x), y0, Math.floor(sp.z))) y0++;
      const Q = [Math.floor(sp.x), y0, Math.floor(sp.z)]; seen[key(Q[0], Q[1], Q[2])] = 1;
      const byY = new Map(); let head = 0, visited = 0;
      const push = (x, y, z) => { const k = key(x, y, z); if (seen[k]) return; seen[k] = 1; Q.push(x, y, z); };
      while (head < Q.length) {
        const x = Q[head++], y = Q[head++], z = Q[head++]; visited++;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz;
          if (standable(nx, y, nz)) push(nx, y, nz);
          else if (standable(nx, y + 1, nz) && clear(x, y + 1, z, PH)) push(nx, y + 1, nz);
          else {
            let done = false;
            // Jump: up to 4 voxels if there is headroom above the take-off spot.
            for (let k = 2; k <= 4 && !done; k++) { if (!clear(x, y, z, 7 + k)) break; if (standable(nx, y + k, nz)) { push(nx, y + k, nz); done = true; } }
            if (!done) for (let d = 1; d < 40; d++) { if (!clear(nx, y - d + 1, nz, PH)) break; if (standable(nx, y - d, nz)) { push(nx, y - d, nz); break; } }
          }
        }
        if (ladderAt(x, y, z)) { for (const d of [1, -1]) { const ny = y + d; if (clear(x, ny, z, PH)) { push(x, ny, z); } } }
        else if (!standable(x, y, z) && y > 1 && clear(x, y - 1, z, PH)) push(x, y - 1, z);
        // Off a ladder top: a ladder cell with no floor still lets you step sideways onto a ledge.
      }
      // Ladder cells are not standable (no floor), so expand: from any visited cell next to a ladder, climb.
      const reach = (fx0, fz0, fx1, fz1, fy) => { for (let z = fz0 + 1; z < fz1 - 1; z++) for (let x = fx0 + 1; x < fx1 - 1; x++) for (const yy of [fy, fy + 1]) if (seen[key(x, yy, z)]) return true; return false; };
      const bad = [];
      for (const f of L.floors) if (!reach(f.x, f.z, f.x1, f.z1, f.y)) bad.push(f.name + '@' + f.x + ',' + f.z + ' y' + (f.y - GY));
      const badT = [];
      for (const t of L.targets) { let ok = false; for (let dz = -4; dz <= 4 && !ok; dz++) for (let dx = -4; dx <= 4 && !ok; dx++) for (let dy = -5; dy <= 2; dy++) if (seen[key(t.x + dx, t.y + dy, t.z + dz)]) { ok = true; break; } if (!ok) badT.push(t.name + (t.locked ? ' (locked, needs tools)' : '')); }
      return { visited, floors: L.floors.length, unreachable: bad.length, list: bad.slice(0, 60), byName: bad.reduce((a, s) => { const n = s.split('@')[0]; a[n] = (a[n] || 0) + 1; return a; }, {}), targetsBad: badT };
    }, mapId);
    console.log(mapId + ': ' + r.floors + ' floors, ' + r.unreachable + ' unreachable' + (r.list.length ? ' ' + JSON.stringify(r.list) : '') + '; items not reachable on foot: ' + (r.targetsBad.join(', ') || 'none'));
    if (r.unreachable || r.targetsBad.some(t => !t.includes('locked'))) failed = true;
  }
  if (errs.length) { console.log('Page errors:\n' + errs.join('\n')); failed = true; }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
