/* Rock & Stone — voxel density field, procedural cave generation and mesher.
   Everything underground is a signed field: d > 0 is solid rock, d < 0 is air,
   the cave surface is d == 0. Mining just writes to the field and re-meshes. */
(function (RS) {
  'use strict';

  var MAT = RS.MAT = {
    ROCK: 0, DIRT: 1, NITRA: 2, MORKITE: 3, GOLD: 4, CRYSTAL: 5, HARD: 6, MUD: 7, ICE: 8
  };
  // Hardness multiplies pickaxe time. HARD rock cannot be mined at all.
  RS.MAT_HARDNESS = [1, 0.75, 1.1, 1.0, 1.15, 1.3, Infinity, 0.6, 0.9];

  var CS = RS.CHUNK = 16;        // cubes per chunk axis
  var AIR = -4.0, SOLID = 4.0;   // clamped field range

  // ------------------------------------------------------------------ field
  function Terrain(nx, ny, nz) {
    this.nx = nx; this.ny = ny; this.nz = nz;          // cube counts
    this.sx = nx + 1; this.sy = ny + 1; this.sz = nz + 1; // sample counts
    this.strideY = this.sx;
    this.strideZ = this.sx * this.sy;
    this.d = new Float32Array(this.sx * this.sy * this.sz).fill(SOLID);
    this.mat = new Uint8Array(this.sx * this.sy * this.sz);
    this.cnx = Math.ceil(nx / CS); this.cny = Math.ceil(ny / CS); this.cnz = Math.ceil(nz / CS);
    this.dirty = {};             // chunkKey -> true
    this.dirtyList = [];
  }
  RS.Terrain = Terrain;

  Terrain.prototype.idx = function (x, y, z) {
    return x + y * this.strideY + z * this.strideZ;
  };
  Terrain.prototype.inside = function (x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz;
  };
  Terrain.prototype.get = function (x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x >= this.sx || y >= this.sy || z >= this.sz) return SOLID;
    return this.d[x + y * this.strideY + z * this.strideZ];
  };
  Terrain.prototype.getMat = function (x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x >= this.sx || y >= this.sy || z >= this.sz) return MAT.ROCK;
    return this.mat[x + y * this.strideY + z * this.strideZ];
  };

  // Trilinear sample in world space (1 unit == 1 voxel).
  Terrain.prototype.sample = function (x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    if (xi < 0 || yi < 0 || zi < 0 || xi >= this.nx || yi >= this.ny || zi >= this.nz) {
      // Outside the block: solid walls, but open sky well above the ceiling so
      // falling bodies don't get stuck in phantom rock.
      if (y >= this.ny) return AIR;
      return SOLID;
    }
    var fx = x - xi, fy = y - yi, fz = z - zi;
    var i = xi + yi * this.strideY + zi * this.strideZ;
    var d = this.d, sY = this.strideY, sZ = this.strideZ;
    var c000 = d[i], c100 = d[i + 1], c010 = d[i + sY], c110 = d[i + 1 + sY];
    var c001 = d[i + sZ], c101 = d[i + 1 + sZ], c011 = d[i + sY + sZ], c111 = d[i + 1 + sY + sZ];
    var x00 = c000 + (c100 - c000) * fx, x10 = c010 + (c110 - c010) * fx;
    var x01 = c001 + (c101 - c001) * fx, x11 = c011 + (c111 - c011) * fx;
    var y0 = x00 + (x10 - x00) * fy, y1 = x01 + (x11 - x01) * fy;
    return y0 + (y1 - y0) * fz;
  };
  Terrain.prototype.solidAt = function (x, y, z) { return this.sample(x, y, z) > 0; };

  // Outward (away from rock) unit normal from the field gradient.
  Terrain.prototype.normalAt = function (x, y, z, out) {
    var e = 0.6;
    var gx = this.sample(x + e, y, z) - this.sample(x - e, y, z);
    var gy = this.sample(x, y + e, z) - this.sample(x, y - e, z);
    var gz = this.sample(x, y, z + e) - this.sample(x, y, z - e);
    var l = Math.sqrt(gx * gx + gy * gy + gz * gz);
    if (l < 1e-6) { out.set(0, 1, 0); return out; }
    out.set(-gx / l, -gy / l, -gz / l); // gradient points into rock, so negate
    return out;
  };

  Terrain.prototype.markDirtyBox = function (x0, y0, z0, x1, y1, z1) {
    var cx0 = Math.max(0, Math.floor((x0 - 1) / CS)), cx1 = Math.min(this.cnx - 1, Math.floor((x1 + 1) / CS));
    var cy0 = Math.max(0, Math.floor((y0 - 1) / CS)), cy1 = Math.min(this.cny - 1, Math.floor((y1 + 1) / CS));
    var cz0 = Math.max(0, Math.floor((z0 - 1) / CS)), cz1 = Math.min(this.cnz - 1, Math.floor((z1 + 1) / CS));
    for (var cz = cz0; cz <= cz1; cz++) for (var cy = cy0; cy <= cy1; cy++) for (var cx = cx0; cx <= cx1; cx++) {
      var k = cx + cy * this.cnx + cz * this.cnx * this.cny;
      if (!this.dirty[k]) { this.dirty[k] = true; this.dirtyList.push(k); }
    }
  };

  // ------------------------------------------------------------------ carving
  // Signed distance of p to a capsule a..b of radius r.
  function capsuleSD(px, py, pz, ax, ay, az, bx, by, bz, r) {
    var pax = px - ax, pay = py - ay, paz = pz - az;
    var bax = bx - ax, bay = by - ay, baz = bz - az;
    var dot = bax * bax + bay * bay + baz * baz;
    var h = dot > 1e-9 ? RS.clamp((pax * bax + pay * bay + paz * baz) / dot, 0, 1) : 0;
    var dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
  }

  /* Carve a lumpy capsule out of the rock. `warp` scales how much value noise
     wobbles the radius, which is what stops tunnels looking like pipes. */
  Terrain.prototype.carveTube = function (ax, ay, az, bx, by, bz, r, warp, blend, paint) {
    warp = warp === undefined ? 0.26 : warp;
    blend = blend || 1.6;
    var pad = r * (1 + warp) + 2.5;
    var x0 = Math.max(0, Math.floor(Math.min(ax, bx) - pad)), x1 = Math.min(this.sx - 1, Math.ceil(Math.max(ax, bx) + pad));
    var y0 = Math.max(0, Math.floor(Math.min(ay, by) - pad)), y1 = Math.min(this.sy - 1, Math.ceil(Math.max(ay, by) + pad));
    var z0 = Math.max(0, Math.floor(Math.min(az, bz) - pad)), z1 = Math.min(this.sz - 1, Math.ceil(Math.max(az, bz) + pad));
    var d = this.d, m = this.mat;
    for (var z = z0; z <= z1; z++) for (var y = y0; y <= y1; y++) {
      var base = y * this.strideY + z * this.strideZ;
      for (var x = x0; x <= x1; x++) {
        var w = warp > 0 ? (RS.noise3(x * 0.11, y * 0.13, z * 0.11) - 0.5) * 2 * warp
          + (RS.noise3(x * 0.33, y * 0.37, z * 0.33) - 0.5) * warp * 0.5 : 0;
        var sd = capsuleSD(x, y, z, ax, ay, az, bx, by, bz, r * (1 + w));
        var i = base + x;
        var nv = RS.smin(d[i], sd, blend);
        if (nv < d[i]) { d[i] = nv < AIR ? AIR : nv; if (paint !== undefined && nv < 0.9) m[i] = paint; }
      }
    }
    this.markDirtyBox(x0, y0, z0, x1, y1, z1);
  };

  /* A cavern with a flat-ish floor: a lumpy cylinder clipped by two planes.
     Flat floors are what make the big rooms actually fightable in. */
  Terrain.prototype.carveRoom = function (cx, cy, cz, r, h, warp, blend, paint) {
    warp = warp === undefined ? 0.3 : warp;
    blend = blend || 2.2;
    var pad = r * (1 + warp) + 3;
    var x0 = Math.max(0, Math.floor(cx - pad)), x1 = Math.min(this.sx - 1, Math.ceil(cx + pad));
    var y0 = Math.max(0, Math.floor(cy - 3)), y1 = Math.min(this.sy - 1, Math.ceil(cy + h + pad * 0.5));
    var z0 = Math.max(0, Math.floor(cz - pad)), z1 = Math.min(this.sz - 1, Math.ceil(cz + pad));
    var d = this.d, m = this.mat;
    for (var z = z0; z <= z1; z++) for (var y = y0; y <= y1; y++) {
      var base = y * this.strideY + z * this.strideZ;
      for (var x = x0; x <= x1; x++) {
        var w = (RS.noise3(x * 0.075, y * 0.1, z * 0.075) - 0.5) * 2 * warp
          + (RS.noise3(x * 0.24, y * 0.3, z * 0.24) - 0.5) * warp * 0.55;
        var dx = x - cx, dz = z - cz;
        var rad = Math.sqrt(dx * dx + dz * dz) - r * (1 + w);
        // Dome the ceiling so rooms don't read as drums.
        var top = (y - (cy + h * (0.55 + 0.45 * Math.max(0, 1 - (Math.sqrt(dx * dx + dz * dz) / r) * (Math.sqrt(dx * dx + dz * dz) / r)))));
        // uneven floor: broad swells plus smaller lumps, so caverns are not slabs
        var bot = (cy - y)
          + (RS.noise3(x * 0.065, 7.3, z * 0.065) - 0.5) * 3.4
          + (RS.noise3(x * 0.19, 2.1, z * 0.19) - 0.5) * 1.5;
        var sd = Math.max(rad, Math.max(top, bot));
        var i = base + x;
        var nv = RS.smin(d[i], sd, blend);
        if (nv < d[i]) { d[i] = nv < AIR ? AIR : nv; if (paint !== undefined && nv < 0.9) m[i] = paint; }
      }
    }
    this.markDirtyBox(x0, y0, z0, x1, y1, z1);
  };

  // Rounded blob, used for pockets, ore alcoves and explosion craters.
  Terrain.prototype.carveSphere = function (cx, cy, cz, r, warp, paint, blend) {
    warp = warp === undefined ? 0.22 : warp;
    blend = blend === undefined ? 1.1 : blend;
    var pad = r * (1 + warp) + 2;
    var x0 = Math.max(0, Math.floor(cx - pad)), x1 = Math.min(this.sx - 1, Math.ceil(cx + pad));
    var y0 = Math.max(0, Math.floor(cy - pad)), y1 = Math.min(this.sy - 1, Math.ceil(cy + pad));
    var z0 = Math.max(0, Math.floor(cz - pad)), z1 = Math.min(this.sz - 1, Math.ceil(cz + pad));
    var d = this.d, m = this.mat, changed = false;
    for (var z = z0; z <= z1; z++) for (var y = y0; y <= y1; y++) {
      var base = y * this.strideY + z * this.strideZ;
      for (var x = x0; x <= x1; x++) {
        var i = base + x;
        if (m[i] === MAT.HARD) continue;           // unbreakable rock stays put
        var w = warp > 0 ? (RS.noise3(x * 0.3 + 11, y * 0.3, z * 0.3 - 5) - 0.5) * 2 * warp : 0;
        var dx = x - cx, dy = y - cy, dz = z - cz;
        var sd = Math.sqrt(dx * dx + dy * dy + dz * dz) - r * (1 + w);
        var nv = blend > 0.01 ? RS.smin(d[i], sd, blend) : Math.min(d[i], sd);
        if (nv < d[i]) {
          d[i] = nv < AIR ? AIR : nv; changed = true;
          if (paint !== undefined && nv < 0.9) m[i] = paint;
        }
      }
    }
    if (changed) this.markDirtyBox(x0, y0, z0, x1, y1, z1);
    return changed;
  };

  // Paint material without changing the shape (ore seams inside rock).
  Terrain.prototype.paintSphere = function (cx, cy, cz, r, paint) {
    var x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(this.sx - 1, Math.ceil(cx + r));
    var y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(this.sy - 1, Math.ceil(cy + r));
    var z0 = Math.max(0, Math.floor(cz - r)), z1 = Math.min(this.sz - 1, Math.ceil(cz + r));
    var r2 = r * r;
    for (var z = z0; z <= z1; z++) for (var y = y0; y <= y1; y++) {
      var base = y * this.strideY + z * this.strideZ;
      for (var x = x0; x <= x1; x++) {
        var dx = x - cx, dy = y - cy, dz = z - cz;
        if (dx * dx + dy * dy + dz * dz <= r2) {
          var i = base + x;
          if (this.mat[i] !== MAT.HARD) this.mat[i] = paint;
        }
      }
    }
    this.markDirtyBox(x0, y0, z0, x1, y1, z1);
  };

  // Add rock back (engineer platforms are separate; this is for terrain fills).
  Terrain.prototype.fillSphere = function (cx, cy, cz, r, paint) {
    var pad = r + 2;
    var x0 = Math.max(0, Math.floor(cx - pad)), x1 = Math.min(this.sx - 1, Math.ceil(cx + pad));
    var y0 = Math.max(0, Math.floor(cy - pad)), y1 = Math.min(this.sy - 1, Math.ceil(cy + pad));
    var z0 = Math.max(0, Math.floor(cz - pad)), z1 = Math.min(this.sz - 1, Math.ceil(cz + pad));
    for (var z = z0; z <= z1; z++) for (var y = y0; y <= y1; y++) {
      var base = y * this.strideY + z * this.strideZ;
      for (var x = x0; x <= x1; x++) {
        var dx = x - cx, dy = y - cy, dz = z - cz;
        var sd = r - Math.sqrt(dx * dx + dy * dy + dz * dz);
        var i = base + x;
        if (sd > this.d[i]) { this.d[i] = sd > SOLID ? SOLID : sd; if (paint !== undefined) this.mat[i] = paint; }
      }
    }
    this.markDirtyBox(x0, y0, z0, x1, y1, z1);
  };

  // ------------------------------------------------------------------ queries
  /* March a ray through the field. Returns {hit, x,y,z, dist, mat, nx,ny,nz}.
     Step size adapts to the field value, so long sight-lines stay cheap. */
  var _n = { set: function (a, b, c) { this.x = a; this.y = b; this.z = c; }, x: 0, y: 0, z: 0 };
  Terrain.prototype.raycast = function (ox, oy, oz, dx, dy, dz, maxDist, step) {
    var t = 0, minStep = step || 0.22;
    var prev = this.sample(ox, oy, oz);
    if (prev > 0) return { hit: true, x: ox, y: oy, z: oz, dist: 0, mat: this.getMat(Math.round(ox), Math.round(oy), Math.round(oz)), nx: -dx, ny: -dy, nz: -dz, inside: true };
    while (t < maxDist) {
      var adv = Math.max(minStep, Math.min(1.4, Math.abs(prev) * 0.75));
      t += adv;
      if (t > maxDist) t = maxDist;
      var x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
      var v = this.sample(x, y, z);
      if (v > 0) {
        // Bisect back to the crossing for a clean impact point.
        var lo = t - adv, hi = t;
        for (var k = 0; k < 6; k++) {
          var mid = (lo + hi) * 0.5;
          if (this.sample(ox + dx * mid, oy + dy * mid, oz + dz * mid) > 0) hi = mid; else lo = mid;
        }
        var hx = ox + dx * lo, hy = oy + dy * lo, hz = oz + dz * lo;
        this.normalAt(hx, hy, hz, _n);
        return {
          hit: true, x: hx, y: hy, z: hz, dist: lo,
          mat: this.getMat(Math.round(hx), Math.round(hy), Math.round(hz)),
          nx: _n.x, ny: _n.y, nz: _n.z
        };
      }
      if (t >= maxDist) break;
      prev = v;
    }
    return { hit: false, dist: maxDist, x: ox + dx * maxDist, y: oy + dy * maxDist, z: oz + dz * maxDist };
  };

  // Walk from an interior point until rock is hit — used to find wall spots for
  // ore seams, eggs, props and enemy burrow points.
  Terrain.prototype.findSurface = function (ox, oy, oz, dx, dy, dz, maxDist) {
    var r = this.raycast(ox, oy, oz, dx, dy, dz, maxDist || 40);
    return r.hit && !r.inside ? r : null;
  };

  // Is there room for a body of radius r centred here?
  Terrain.prototype.clearSpace = function (x, y, z, r) {
    if (this.sample(x, y, z) > -r * 0.5) return false;
    var o = r * 0.72;
    return this.sample(x + o, y, z) < 0 && this.sample(x - o, y, z) < 0 &&
      this.sample(x, y, z + o) < 0 && this.sample(x, y, z - o) < 0 &&
      this.sample(x, y + o, z) < 0;
  };

  // Drop a point onto the nearest floor below it. Returns y or null.
  Terrain.prototype.floorBelow = function (x, y, z, maxDrop) {
    var r = this.raycast(x, y, z, 0, -1, 0, maxDrop || 30);
    return r.hit && !r.inside ? r.y : null;
  };

  // ------------------------------------------------------------------ mesher
  /* Naive surface nets. One vertex per cube that straddles the surface, placed
     at the mean of its edge crossings, then quads across sign-changing edges.
     Both lookup tables are derived at load time, so there is no hand-copied
     256-entry triangle table to get subtly wrong. */
  var cubeEdges = new Int32Array(24), edgeTable = new Int32Array(256);
  (function initTables() {
    var k = 0;
    for (var i = 0; i < 8; i++) {
      for (var j = 1; j <= 4; j <<= 1) {
        var p = i ^ j;
        if (i <= p) { cubeEdges[k++] = i; cubeEdges[k++] = p; }
      }
    }
    for (var m = 0; m < 256; m++) {
      var em = 0;
      for (var e = 0; e < 24; e += 2) {
        var a = !!(m & (1 << cubeEdges[e])), b = !!(m & (1 << cubeEdges[e + 1]));
        em |= a !== b ? (1 << (e >> 1)) : 0;
      }
      edgeTable[m] = em;
    }
  })();
  RS._cubeEdges = cubeEdges; RS._edgeTable = edgeTable;

  var grid = new Float32Array(8);

  /* Mesh one chunk. Cubes [x0..x0+n-1] are *owned* by this chunk; the mesher
     reads one cube beyond on the low side so border quads join seamlessly
     (identical field data -> identical vertex positions, so no cracks). */
  Terrain.prototype.meshChunk = function (cx, cy, cz, out) {
    var CSx = CS;
    var x0 = cx * CSx, y0 = cy * CSx, z0 = cz * CSx;
    var x1 = Math.min(x0 + CSx, this.nx), y1 = Math.min(y0 + CSx, this.ny), z1 = Math.min(z0 + CSx, this.nz);
    var lx0 = Math.max(0, x0 - 1), ly0 = Math.max(0, y0 - 1), lz0 = Math.max(0, z0 - 1);
    var W = x1 - lx0 + 1, H = y1 - ly0 + 1;    // local cube grid dims (+1 slack)
    var positions = out.positions, normals = out.normals, colors = out.colors, indices = out.indices;
    positions.length = 0; normals.length = 0; colors.length = 0; indices.length = 0;
    var vIdx = out.vbuf;
    var need = W * H * (z1 - lz0 + 1);
    if (!vIdx || vIdx.length < need) vIdx = out.vbuf = new Int32Array(Math.max(need, 4096));
    vIdx.fill(-1, 0, need);
    var nVert = 0;
    var d = this.d, sY = this.strideY, sZ = this.strideZ;
    var pal = out.palette;  // [matId*3] rgb floats

    for (var z = lz0; z < z1; z++) {
      for (var y = ly0; y < y1; y++) {
        var rowBase = lx0 + y * sY + z * sZ;
        for (var x = lx0; x < x1; x++, rowBase++) {
          // Gather the 8 corners. Corner bit order matches cubeEdges: bit0=+x, bit1=+y, bit2=+z.
          var i000 = rowBase;
          grid[0] = d[i000];
          grid[1] = d[i000 + 1];
          grid[2] = d[i000 + sY];
          grid[3] = d[i000 + 1 + sY];
          grid[4] = d[i000 + sZ];
          grid[5] = d[i000 + 1 + sZ];
          grid[6] = d[i000 + sY + sZ];
          grid[7] = d[i000 + 1 + sY + sZ];
          var mask = 0;
          if (grid[0] > 0) mask |= 1; if (grid[1] > 0) mask |= 2;
          if (grid[2] > 0) mask |= 4; if (grid[3] > 0) mask |= 8;
          if (grid[4] > 0) mask |= 16; if (grid[5] > 0) mask |= 32;
          if (grid[6] > 0) mask |= 64; if (grid[7] > 0) mask |= 128;
          if (mask === 0 || mask === 255) continue;

          var em = edgeTable[mask], vx = 0, vy = 0, vz = 0, ecount = 0;
          for (var e = 0; e < 12; e++) {
            if (!(em & (1 << e))) continue;
            var a = cubeEdges[e * 2], b = cubeEdges[e * 2 + 1];
            var va = grid[a], vb = grid[b];
            var t = va / (va - vb);
            var ax = a & 1, ay = (a >> 1) & 1, az = (a >> 2) & 1;
            var bx = b & 1, by = (b >> 1) & 1, bz = (b >> 2) & 1;
            vx += ax + (bx - ax) * t; vy += ay + (by - ay) * t; vz += az + (bz - az) * t;
            ecount++;
          }
          var inv = 1 / ecount;
          var wx = x + vx * inv, wy = y + vy * inv, wz = z + vz * inv;
          var li = (x - lx0) + (y - ly0) * W + (z - lz0) * W * H;
          vIdx[li] = nVert++;
          positions.push(wx, wy, wz);

          // Normal from the field gradient at the vertex — smooth across chunks.
          var ex = 0.75;
          var gx = this.sample(wx + ex, wy, wz) - this.sample(wx - ex, wy, wz);
          var gy = this.sample(wx, wy + ex, wz) - this.sample(wx, wy - ex, wz);
          var gz = this.sample(wx, wy, wz + ex) - this.sample(wx, wy, wz - ex);
          var gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
          normals.push(-gx / gl, -gy / gl, -gz / gl);

          // Vertex colour: material palette, grain noise, and a cheap crevice
          // darkening from how buried the vertex is.
          var mId = this.mat[i000] | 0;
          if (mId === MAT.ROCK) {
            // bias toward whichever corner material dominates
            var m2 = this.mat[i000 + 1 + sY + sZ] | 0;
            if (m2 !== MAT.ROCK) mId = m2;
          }
          var p3 = mId * 3;
          var grain = 0.70 + 0.52 * RS.noise3(wx * 0.5, wy * 0.5, wz * 0.5)
            + 0.22 * RS.noise3(wx * 1.7, wy * 1.7, wz * 1.7)
            + 0.10 * RS.noise3(wx * 3.3, wy * 3.3, wz * 3.3);
          var strat = 0.86 + 0.3 * RS.noise3(wx * 0.07, wy * 0.38, wz * 0.07);
          // crevices: vertices that sit deep in the field go darker
          var cav = 1 - 0.3 * RS.clamp01((this.sample(wx + nrmX(gx, gl), wy + nrmX(gy, gl), wz + nrmX(gz, gl)) + 1.4) * 0.6);
          var f = Math.min(1.08, grain * strat * cav);
          colors.push(pal[p3] * f, pal[p3 + 1] * f, pal[p3 + 2] * f);
        }
      }
    }

    // Quads: for each owned cube, close the ring around each sign-changing
    // low-side edge using the four cube vertices that share it.
    for (var qz = z0; qz < z1; qz++) {
      for (var qy = y0; qy < y1; qy++) {
        var qBase = x0 + qy * sY + qz * sZ;
        for (var qx = x0; qx < x1; qx++, qBase++) {
          var g0 = d[qBase] > 0;
          var liC = (qx - lx0) + (qy - ly0) * W + (qz - lz0) * W * H;
          if (vIdx[liC] < 0) continue;
          for (var dir = 0; dir < 3; dir++) {
            var du, dv, ngBit;
            // The three low-side edges of the cube's 000 corner.
            if (dir === 0) { if (qy === ly0 || qz === lz0) continue; ngBit = d[qBase + 1] > 0; du = W; dv = W * H; }
            else if (dir === 1) { if (qx === lx0 || qz === lz0) continue; ngBit = d[qBase + sY] > 0; du = W * H; dv = 1; }
            else { if (qx === lx0 || qy === ly0) continue; ngBit = d[qBase + sZ] > 0; du = 1; dv = W; }
            if (ngBit === g0) continue;
            var a0 = vIdx[liC], a1 = vIdx[liC - du], a2 = vIdx[liC - du - dv], a3 = vIdx[liC - dv];
            if (a0 < 0 || a1 < 0 || a2 < 0 || a3 < 0) continue;
            if (g0) indices.push(a0, a1, a2, a0, a2, a3);
            else indices.push(a0, a3, a2, a0, a2, a1);
          }
        }
      }
    }
    out.count = nVert;
    return out;
  };

  function nrmX(g, l) { return -(g / l) * 1.6; }

  Terrain.prototype.newMeshOut = function (palette) {
    return { positions: [], normals: [], colors: [], indices: [], vbuf: null, count: 0, palette: palette };
  };
})(window.RS);
