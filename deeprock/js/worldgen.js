/* Rock & Stone — cave generation. Builds a connected network of flat-floored
   caverns, winding tunnels, vertical shafts and dead-end ore pockets, then
   seeds it with mineral seams, wall props, objective sites and burrow points.
   Pure field maths: no renderer involved, so it can be tested headless. */
(function (RS) {
  'use strict';
  var MAT = RS.MAT;

  function v3(x, y, z) { return { x: x, y: y, z: z }; }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); }

  /* ------------------------------------------------------------ main entry */
  RS.generateCave = function (terrain, biome, seed, opts) {
    opts = opts || {};
    var rng = RS.Rng(seed);
    var nx = terrain.nx, ny = terrain.ny, nz = terrain.nz;
    var margin = 16;
    var roomCount = opts.rooms || 9;
    var complexity = opts.complexity === undefined ? 1 : opts.complexity;

    var world = {
      biome: biome, seed: seed,
      rooms: [], tunnels: [], shafts: [],
      oreNodes: [], props: [], spawnPts: [], objectiveSpots: [],
      start: null, extraction: null, interiorPts: []
    };

    // ---- 1. unbreakable shell so nobody digs out of the map ---------------
    paintShell(terrain, 5);

    // ---- 2. lay out caverns with a drifting random walk -------------------
    var cur = v3(
      rng.range(margin + 18, nx - margin - 18),
      rng.range(ny * 0.34, ny * 0.56),
      rng.range(margin + 18, margin + 34)
    );
    var dir = { x: rng.range(-0.5, 0.5), z: 1 };
    var dl = Math.hypot(dir.x, dir.z); dir.x /= dl; dir.z /= dl;

    for (var i = 0; i < roomCount; i++) {
      var big = (i === 0) || (i === roomCount - 1) || rng.chance(0.25);
      var r = big ? rng.range(12, 17) : rng.range(8.5, 12.5);
      var h = big ? rng.range(10, 14) : rng.range(7.5, 11);
      var room = {
        x: RS.clamp(cur.x, margin + r, nx - margin - r),
        y: RS.clamp(cur.y, 10, ny - h - 12),
        z: RS.clamp(cur.z, margin + r, nz - margin - r),
        r: r, h: h, big: big, index: i
      };
      world.rooms.push(room);

      // drift the heading, step on, and wander up or down a little
      var turn = rng.range(-0.95, 0.95) * (0.6 + complexity * 0.5);
      var cs = Math.cos(turn), sn = Math.sin(turn);
      var ndx = dir.x * cs - dir.z * sn, ndz = dir.x * sn + dir.z * cs;
      dir.x = ndx; dir.z = ndz;
      var step = rng.range(26, 40);
      cur = v3(cur.x + dir.x * step, cur.y + rng.range(-9, 9), cur.z + dir.z * step);
      // bounce off the shell instead of piling rooms in a corner
      if (cur.x < margin + 20 || cur.x > nx - margin - 20) { dir.x = -dir.x; cur.x = RS.clamp(cur.x, margin + 20, nx - margin - 20); }
      if (cur.z < margin + 20 || cur.z > nz - margin - 20) { dir.z = -dir.z; cur.z = RS.clamp(cur.z, margin + 20, nz - margin - 20); }
      cur.y = RS.clamp(cur.y, 12, ny - 22);
    }

    // ---- 3. carve the caverns --------------------------------------------
    for (i = 0; i < world.rooms.length; i++) {
      var rm = world.rooms[i];
      terrain.carveRoom(rm.x, rm.y, rm.z, rm.r, rm.h, 0.3, 2.4, MAT.ROCK);
      // break the silhouette with a couple of alcoves
      var alcoves = rng.int(2, 4);
      for (var a = 0; a < alcoves; a++) {
        var ang = rng.range(0, Math.PI * 2), ar = rm.r * rng.range(0.75, 1.05);
        terrain.carveSphere(rm.x + Math.cos(ang) * ar, rm.y + rng.range(1.5, rm.h * 0.7),
          rm.z + Math.sin(ang) * ar, rng.range(3.5, 6.5), 0.3, MAT.ROCK, 2.0);
      }
    }

    // ---- 4. connect them, plus a few loops -------------------------------
    for (i = 0; i < world.rooms.length - 1; i++) connect(terrain, rng, world, world.rooms[i], world.rooms[i + 1]);
    var loops = Math.round(1 + complexity * 2.5);
    for (var l = 0; l < loops; l++) {
      var ia = rng.int(0, world.rooms.length - 1), ib = rng.int(0, world.rooms.length - 1);
      if (Math.abs(ia - ib) < 2) continue;
      if (dist(world.rooms[ia], world.rooms[ib]) > 95) continue;
      connect(terrain, rng, world, world.rooms[ia], world.rooms[ib], true);
    }

    // ---- 5. dead-end pockets: where the good ore lives -------------------
    var pockets = Math.round(7 + complexity * 7);
    for (var p = 0; p < pockets; p++) {
      var src = rng.pick(world.rooms);
      var ang2 = rng.range(0, Math.PI * 2);
      var len = rng.range(16, 34);
      var ax = src.x + Math.cos(ang2) * src.r * 0.8;
      var az = src.z + Math.sin(ang2) * src.r * 0.8;
      var ay = src.y + rng.range(1.5, src.h * 0.55);
      var bx = RS.clamp(ax + Math.cos(ang2) * len, 12, nx - 12);
      var bz = RS.clamp(az + Math.sin(ang2) * len, 12, nz - 12);
      var by = RS.clamp(ay + rng.range(-10, 10), 10, ny - 14);
      var rad = rng.range(2.3, 3.4);
      carvePath(terrain, rng, v3(ax, ay, az), v3(bx, by, bz), rad, rng.int(2, 4), 0.85);
      var pr = rng.range(5, 8.5);
      terrain.carveSphere(bx, by, bz, pr, 0.33, MAT.ROCK, 2.0);
      world.tunnels.push({ a: v3(ax, ay, az), b: v3(bx, by, bz), r: rad, pocket: true });
      world.rooms.push({ x: bx, y: by - pr * 0.55, z: bz, r: pr, h: pr * 1.5, pocket: true, index: -1 });
    }

    // ---- 6. vertical shafts, for grapple hooks and platform guns ---------
    var shafts = rng.int(2, 3 + Math.round(complexity));
    for (var s = 0; s < shafts; s++) {
      var base = rng.pick(world.rooms.slice(0, roomCount));
      var up = rng.range(16, 30);
      var topY = Math.min(ny - 10, base.y + base.h + up);
      var sx = base.x + rng.range(-base.r * 0.5, base.r * 0.5);
      var sz = base.z + rng.range(-base.r * 0.5, base.r * 0.5);
      terrain.carveTube(sx, base.y + 2, sz, sx + rng.range(-5, 5), topY, sz + rng.range(-5, 5), rng.range(3.2, 4.6), 0.3, 2.0, MAT.ROCK);
      var cr = rng.range(7, 11);
      terrain.carveRoom(sx, topY, sz, cr, rng.range(6, 9), 0.3, 2.2, MAT.ROCK);
      world.shafts.push({ x: sx, y: base.y, z: sz, top: topY });
      world.rooms.push({ x: sx, y: topY, z: sz, r: cr, h: 7, ledge: true, index: -1 });
    }

    // ---- 7. sample points we can build the rest of the mission on --------
    buildInteriorPoints(world, rng);

    // start: first room; extraction: the farthest big room from it
    var first = world.rooms[0];
    world.start = v3(first.x, first.y + 1.2, first.z);
    var bestD = -1, exRoom = world.rooms[roomCount - 1];
    for (i = 1; i < roomCount; i++) {
      var d = dist(world.rooms[i], first);
      if (d > bestD && world.rooms[i].r > 10) { bestD = d; exRoom = world.rooms[i]; }
    }
    world.extraction = v3(exRoom.x, exRoom.y + 1.2, exRoom.z);
    world.extractionRoom = exRoom;

    // ---- 8. mineral seams, props, burrow points --------------------------
    seedMinerals(terrain, world, rng, opts);
    seedProps(terrain, world, rng, biome);
    seedSpawnPoints(terrain, world, rng);
    seedObjectiveSpots(terrain, world, rng, opts);

    return world;
  };

  /* ---------------------------------------------------- shell & connectors */
  function paintShell(t, thick) {
    var sx = t.sx, sy = t.sy, sz = t.sz, mat = t.mat;
    for (var z = 0; z < sz; z++) for (var y = 0; y < sy; y++) {
      var edgeZ = z < thick || z >= sz - thick, edgeY = y < thick || y >= sy - thick;
      var base = y * t.strideY + z * t.strideZ;
      for (var x = 0; x < sx; x++) {
        if (edgeZ || edgeY || x < thick || x >= sx - thick) mat[base + x] = MAT.HARD;
      }
    }
  }

  // A winding tunnel of several segments, radius wobbling along its length.
  function carvePath(terrain, rng, a, b, r, segs, slopeLimit) {
    segs = segs || 4;
    var pts = [a];
    for (var i = 1; i < segs; i++) {
      var t = i / segs;
      var px = RS.lerp(a.x, b.x, t), py = RS.lerp(a.y, b.y, t), pz = RS.lerp(a.z, b.z, t);
      var perp = { x: -(b.z - a.z), z: (b.x - a.x) };
      var pl = Math.hypot(perp.x, perp.z) || 1;
      var off = rng.range(-1, 1) * Math.min(14, dist(a, b) * 0.22);
      px += perp.x / pl * off; pz += perp.z / pl * off;
      py += rng.range(-3.5, 3.5);
      pts.push(v3(px, py, pz));
    }
    pts.push(b);
    // keep slopes climbable
    if (slopeLimit) {
      for (i = 1; i < pts.length; i++) {
        var run = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
        var maxRise = run * slopeLimit + 2;
        var rise = pts[i].y - pts[i - 1].y;
        if (Math.abs(rise) > maxRise) pts[i].y = pts[i - 1].y + Math.sign(rise) * maxRise;
      }
    }
    for (i = 0; i < pts.length - 1; i++) {
      var rr = r * rng.range(0.85, 1.2);
      terrain.carveTube(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z, rr, 0.27, 1.7, MAT.ROCK);
      if (rng.chance(0.35)) { // a bulge, so corridors breathe
        var mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2, mz = (pts[i].z + pts[i + 1].z) / 2;
        terrain.carveSphere(mx, my + rng.range(0, 2), mz, rr * rng.range(1.3, 2.0), 0.3, MAT.ROCK, 1.8);
      }
    }
    return pts;
  }

  function connect(terrain, rng, world, A, B, isLoop) {
    var ay = A.y + rng.range(1.6, Math.max(2.2, A.h * 0.4));
    var by = B.y + rng.range(1.6, Math.max(2.2, B.h * 0.4));
    var r = isLoop ? rng.range(2.6, 3.6) : rng.range(3.1, 4.3);
    var pts = carvePath(terrain, rng, v3(A.x, ay, A.z), v3(B.x, by, B.z), r, rng.int(3, 6), 0.8);
    world.tunnels.push({ a: pts[0], b: pts[pts.length - 1], r: r, pts: pts });
  }

  /* ------------------------------------------------- interior sample points */
  function buildInteriorPoints(world, rng) {
    var pts = world.interiorPts;
    for (var i = 0; i < world.rooms.length; i++) {
      var rm = world.rooms[i];
      var n = Math.max(4, Math.round(rm.r * 1.1));
      for (var k = 0; k < n; k++) {
        var ang = rng.range(0, Math.PI * 2), rr = Math.sqrt(rng()) * rm.r * 0.8;
        pts.push({
          x: rm.x + Math.cos(ang) * rr,
          y: rm.y + rng.range(1.2, Math.max(2, (rm.h || 8) * 0.75)),
          z: rm.z + Math.sin(ang) * rr,
          room: rm
        });
      }
    }
    for (i = 0; i < world.tunnels.length; i++) {
      var tn = world.tunnels[i];
      var steps = 4;
      for (var s = 1; s < steps; s++) {
        var t = s / steps;
        pts.push({
          x: RS.lerp(tn.a.x, tn.b.x, t), y: RS.lerp(tn.a.y, tn.b.y, t),
          z: RS.lerp(tn.a.z, tn.b.z, t), tunnel: tn
        });
      }
    }
    rng.shuffle(pts);
  }

  // Find a rock face near an interior point: walk outward until the field flips.
  function wallSpot(terrain, rng, from, maxDist) {
    for (var tries = 0; tries < 10; tries++) {
      var th = rng.range(0, Math.PI * 2), ph = Math.acos(rng.range(-0.85, 0.95));
      var dx = Math.sin(ph) * Math.cos(th), dy = Math.cos(ph), dz = Math.sin(ph) * Math.sin(th);
      var hit = terrain.findSurface(from.x, from.y, from.z, dx, dy, dz, maxDist || 22);
      if (hit && hit.dist > 1.6 && hit.mat !== MAT.HARD) return hit;
    }
    return null;
  }
  RS.wallSpot = wallSpot;

  /* -------------------------------------------------------------- minerals */
  /* A seam is a painted patch of ore plus a handful of individually minable
     lumps poking out of it. Each lump pops a pickup when it is broken. */
  function placeSeam(terrain, world, rng, spot, matId, lumpCount, perLump) {
    var n = spot, px = spot.x + n.nx * 0.35, py = spot.y + n.ny * 0.35, pz = spot.z + n.nz * 0.35;
    terrain.paintSphere(px - n.nx * 0.8, py - n.ny * 0.8, pz - n.nz * 0.8, rng.range(2.2, 3.6), matId);
    // build a local tangent frame to spread the lumps across the face
    var up = Math.abs(n.ny) > 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    var tx = up.y * n.nz - up.z * n.ny, ty = up.z * n.nx - up.x * n.nz, tz = up.x * n.ny - up.y * n.nx;
    var tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    var bx = n.ny * tz - n.nz * ty, by = n.nz * tx - n.nx * tz, bz = n.nx * ty - n.ny * tx;
    var seam = { mat: matId, x: px, y: py, z: pz, nodes: [], total: 0 };
    for (var i = 0; i < lumpCount; i++) {
      var u = rng.range(-2.4, 2.4), v = rng.range(-2.0, 2.0);
      var lx = px + tx * u + bx * v, ly = py + ty * u + by * v, lz = pz + tz * u + bz * v;
      // pull the lump back onto the actual rock face
      var h = terrain.findSurface(lx - n.nx * 2.5, ly - n.ny * 2.5, lz - n.nz * 2.5, n.nx === 0 && n.ny === 0 && n.nz === 0 ? 0 : -n.nx, -n.ny, -n.nz, 6);
      if (h) { lx = h.x; ly = h.y; lz = h.z; }
      var node = {
        x: lx, y: ly, z: lz, nx: n.nx, ny: n.ny, nz: n.nz,
        mat: matId, yield: perLump, alive: true, seam: seam,
        scale: rng.range(0.75, 1.3), seed: (rng() * 1e6) | 0
      };
      seam.nodes.push(node); seam.total += perLump;
      world.oreNodes.push(node);
    }
    return seam;
  }

  function seedMinerals(terrain, world, rng, opts) {
    var budget = opts.ore || {};
    var want = {
      nitra: budget.nitra || 360,
      morkite: budget.morkite || 0,
      gold: budget.gold || 140,
      crystal: budget.crystal || 24
    };
    var pts = world.interiorPts, pi = 0;
    function nextSpot(maxDist) {
      for (var guard = 0; guard < pts.length; guard++) {
        var p = pts[(pi++) % pts.length];
        var sp = wallSpot(terrain, rng, p, maxDist);
        if (sp) return sp;
      }
      return null;
    }
    function fill(matId, total, perLump, lumpsMin, lumpsMax) {
      var placed = 0, guard = 0;
      while (placed < total && guard++ < 400) {
        var sp = nextSpot(20);
        if (!sp) break;
        var lumps = rng.int(lumpsMin, lumpsMax);
        var seam = placeSeam(terrain, world, rng, sp, matId, lumps, perLump);
        placed += seam.total;
      }
      return placed;
    }
    world.oreTotals = {
      nitra: fill(MAT.NITRA, want.nitra, 5, 3, 7),
      morkite: want.morkite > 0 ? fill(MAT.MORKITE, want.morkite, 3, 5, 10) : 0,
      gold: fill(MAT.GOLD, want.gold, 6, 3, 6),
      crystal: fill(MAT.CRYSTAL, want.crystal, 4, 1, 3)
    };
  }

  /* ----------------------------------------------------------------- props */
  function seedProps(terrain, world, rng, biome) {
    var pts = world.interiorPts;
    var count = Math.round(pts.length * 1.5 * (biome.propDensity || 1));
    for (var i = 0; i < count; i++) {
      var p = pts[i % pts.length];
      var sp = wallSpot(terrain, rng, p, 20);
      if (!sp) continue;
      var type = rng.pick(biome.props);
      // stalagmites want floors, stalactites want ceilings
      if (type === 'stalag' && sp.ny < 0.55 && sp.ny > -0.55) type = 'shard';
      if (sp.ny < -0.6 && type === 'stalag') type = 'stalac';
      // loose rock gathers on anything flat enough to gather on
      if (sp.ny > 0.74 && rng.chance(0.45)) type = 'rubble';
      // lava only pools on floors; cracks hanging off a ceiling look absurd
      if (type === 'lavacrack' && sp.ny < 0.72) type = rng.chance(0.5) ? 'shard' : 'stalac';
      if (type === 'rubble' && sp.ny < 0.6) type = 'shard';
      if (type === 'saltpillar' && sp.ny < 0.3) type = 'shard';
      world.props.push({
        type: type, x: sp.x, y: sp.y, z: sp.z,
        nx: sp.nx, ny: sp.ny, nz: sp.nz,
        scale: rng.range(0.7, 1.6), seed: (rng() * 1e6) | 0,
        glow: rng.chance(0.4)
      });
    }
  }

  /* --------------------------------------------------------- spawns & sites */
  function seedSpawnPoints(terrain, world, rng) {
    // Burrow points: open floor spots spread through the cave, away from start.
    var pts = world.interiorPts;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (dist(p, world.start) < 18) continue;
      var fy = terrain.floorBelow(p.x, p.y + 1, p.z, 16);
      if (fy === null) continue;
      if (!terrain.clearSpace(p.x, fy + 1.4, p.z, 1.1)) continue;
      world.spawnPts.push({ x: p.x, y: fy + 0.6, z: p.z });
    }
    if (!world.spawnPts.length) world.spawnPts.push({ x: world.start.x + 8, y: world.start.y, z: world.start.z });
  }

  function seedObjectiveSpots(terrain, world, rng, opts) {
    // Spots for eggs / aquarqs / mules: on a wall or floor, reachable, spread out.
    var pts = world.interiorPts.slice();
    rng.shuffle(pts);
    var chosen = [];
    for (var i = 0; i < pts.length && chosen.length < 24; i++) {
      var p = pts[i];
      if (dist(p, world.start) < 22) continue;
      var ok = true;
      for (var j = 0; j < chosen.length; j++) if (dist(p, chosen[j]) < 20) { ok = false; break; }
      if (!ok) continue;
      var sp = wallSpot(terrain, rng, p, 18);
      var fy = terrain.floorBelow(p.x, p.y + 1, p.z, 16);
      chosen.push({
        x: p.x, y: p.y, z: p.z,
        floorY: fy === null ? p.y : fy,
        wall: sp ? { x: sp.x, y: sp.y, z: sp.z, nx: sp.nx, ny: sp.ny, nz: sp.nz } : null
      });
    }
    world.objectiveSpots = chosen;
  }

  /* ---------------------------------------------------------- connectivity */
  /* Flood fill through air from the drop site. Used by the generator tests to
     prove every cavern, seam and objective site can actually be reached. */
  RS.floodFill = function (terrain, from) {
    var sx = terrain.sx, sy = terrain.sy, sz = terrain.sz;
    var seen = new Uint8Array(sx * sy * sz);
    var stack = new Int32Array(1 << 20);
    var sp = 0, filled = 0;
    var s0 = Math.round(from.x) + Math.round(from.y) * terrain.strideY + Math.round(from.z) * terrain.strideZ;
    if (terrain.d[s0] > 0) {
      // nudge upward to find air
      for (var up = 1; up < 8; up++) {
        var c = s0 + up * terrain.strideY;
        if (c < terrain.d.length && terrain.d[c] <= 0) { s0 = c; break; }
      }
    }
    if (terrain.d[s0] > 0) return { seen: seen, filled: 0 };
    stack[sp++] = s0; seen[s0] = 1;
    var sY = terrain.strideY, sZ = terrain.strideZ;
    while (sp > 0) {
      var i = stack[--sp]; filled++;
      var x = i % sx, y = ((i / sY) | 0) % sy;
      var nb = [i - 1, i + 1, i - sY, i + sY, i - sZ, i + sZ];
      for (var k = 0; k < 6; k++) {
        var j = nb[k];
        if (j < 0 || j >= seen.length || seen[j]) continue;
        if (k === 0 && x === 0) continue;
        if (k === 1 && x === sx - 1) continue;
        if (k === 2 && y === 0) continue;
        if (k === 3 && y === sy - 1) continue;
        if (terrain.d[j] > 0) continue;
        seen[j] = 1;
        if (sp < stack.length) stack[sp++] = j;
      }
    }
    return { seen: seen, filled: filled };
  };

  RS.reachable = function (terrain, fill, p) {
    var x = Math.round(p.x), y = Math.round(p.y), z = Math.round(p.z);
    for (var dy = 0; dy <= 4; dy++) for (var r = 0; r <= 2; r++) {
      for (var dx = -r; dx <= r; dx++) for (var dz = -r; dz <= r; dz++) {
        if (!terrain.inside(x + dx, y + dy, z + dz)) continue;
        if (fill.seen[terrain.idx(x + dx, y + dy, z + dz)]) return true;
      }
    }
    return false;
  };
})(window.RS);
