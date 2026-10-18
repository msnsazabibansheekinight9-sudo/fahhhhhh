/* Rock & Stone — cave dressing and mineral seams, drawn with instanced meshes
   so four hundred crystals and two hundred ore lumps cost about a dozen draw
   calls. Anything you blast away is zeroed out of its instance buffer. */
(function (RS) {
  'use strict';

  var CELL = 8;   // spatial hash cell for ore lookups

  RS.Decor = function (game) {
    this.g = game;
    this.scene = game.scene;
    this.groups = [];          // {mesh, items:[{ref, matrix}], free:[]}
    this.oreGroups = [];
    this.hash = {};            // ore spatial hash
    this.propHash = {};
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._up = new THREE.Vector3(0, 1, 0);
    this._v = new THREE.Vector3();
    this.zero = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001);
    this.litMat = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 5, specular: 0x181818 });
    this.glowMat = RS.makeGlowMaterial(0.42, true);     // flora and crystal
    this.oreMat = RS.makeGlowMaterial(0.70, true);      // mineral seams, a touch hotter
  };
  var D = RS.Decor.prototype;

  D.hkey = function (x, y, z) {
    return ((x / CELL) | 0) + ',' + ((y / CELL) | 0) + ',' + ((z / CELL) | 0);
  };

  // Orient +Y along a surface normal, with a stable random spin around it.
  D.orient = function (nx, ny, nz, spin) {
    this._v.set(nx, ny, nz);
    if (this._v.lengthSq() < 1e-6) this._v.set(0, 1, 0);
    this._v.normalize();
    this._q.setFromUnitVectors(this._up, this._v);
    var spinQ = new THREE.Quaternion().setFromAxisAngle(this._v, spin);
    this._q.premultiply(spinQ);
    return this._q;
  };

  // ------------------------------------------------------------------ props
  D.buildProps = function (world, biome) {
    var buckets = {};
    var i, p;
    for (i = 0; i < world.props.length; i++) {
      p = world.props[i];
      var variant = p.seed % 4;
      var key = p.type + '|' + variant;
      (buckets[key] || (buckets[key] = [])).push(p);
    }
    for (var key2 in buckets) {
      var list = buckets[key2];
      var parts = key2.split('|');
      var geo = RS.makeProp(parts[0], biome, parseInt(parts[1], 10));
      var glowing = geo.userData.glowing;
      var mesh = new THREE.InstancedMesh(geo, glowing ? this.glowMat : this.litMat, list.length);
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      var grp = { mesh: mesh, items: [], glowing: glowing };
      for (i = 0; i < list.length; i++) {
        p = list[i];
        var q = this.orient(p.nx, p.ny, p.nz, (p.seed % 628) / 100);
        this._m.compose(
          new THREE.Vector3(p.x + p.nx * -0.15, p.y + p.ny * -0.15, p.z + p.nz * -0.15),
          q, new THREE.Vector3(p.scale, p.scale, p.scale));
        mesh.setMatrixAt(i, this._m);
        p.inst = i; p.group = grp; p.alive = true;
        grp.items.push(p);
        var hk = this.hkey(p.x, p.y, p.z);
        (this.propHash[hk] || (this.propHash[hk] = [])).push(p);
      }
      mesh.instanceMatrix.needsUpdate = true;
      this.scene.add(mesh);
      this.groups.push(grp);
    }
  };

  // ------------------------------------------------------------------- ore
  D.buildOre = function (world) {
    var buckets = {};
    var i, n;
    for (i = 0; i < world.oreNodes.length; i++) {
      n = world.oreNodes[i];
      var key = n.mat + '|' + (n.seed % 5);
      (buckets[key] || (buckets[key] = [])).push(n);
    }
    for (var key2 in buckets) {
      var list = buckets[key2];
      var parts = key2.split('|');
      var matId = parseInt(parts[0], 10);
      var geo = RS.makeOreLump(matId, parseInt(parts[1], 10));
      // Ore reads as self-lit so a seam is visible from across a cavern,
      // the way a nitra patch glows at you in the dark.
      var mesh = new THREE.InstancedMesh(geo, this.oreMat, list.length);
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      var grp = { mesh: mesh, items: [], ore: true };
      for (i = 0; i < list.length; i++) {
        n = list[i];
        var q = this.orient(n.nx, n.ny, n.nz, (n.seed % 628) / 100);
        this._m.compose(
          new THREE.Vector3(n.x + n.nx * 0.1, n.y + n.ny * 0.1, n.z + n.nz * 0.1),
          q, new THREE.Vector3(n.scale * 1.25, n.scale * 1.4, n.scale * 1.25));
        mesh.setMatrixAt(i, this._m);
        n.inst = i; n.group = grp;
        grp.items.push(n);
        var hk = this.hkey(n.x, n.y, n.z);
        (this.hash[hk] || (this.hash[hk] = [])).push(n);
      }
      mesh.instanceMatrix.needsUpdate = true;
      this.scene.add(mesh);
      this.oreGroups.push(grp);
    }
  };

  D.hideInstance = function (item) {
    if (!item.group) return;
    item.group.mesh.setMatrixAt(item.inst, this.zero);
    item.group.mesh.instanceMatrix.needsUpdate = true;
  };

  // Every ore lump whose centre falls inside a sphere — one carve, one call.
  D.oreInSphere = function (x, y, z, r, out) {
    out = out || [];
    var r2 = r * r;
    var cx0 = ((x - r) / CELL) | 0, cx1 = ((x + r) / CELL) | 0;
    var cy0 = ((y - r) / CELL) | 0, cy1 = ((y + r) / CELL) | 0;
    var cz0 = ((z - r) / CELL) | 0, cz1 = ((z + r) / CELL) | 0;
    for (var cz = cz0; cz <= cz1; cz++) for (var cy = cy0; cy <= cy1; cy++) for (var cx = cx0; cx <= cx1; cx++) {
      var list = this.hash[cx + ',' + cy + ',' + cz];
      if (!list) continue;
      for (var i = 0; i < list.length; i++) {
        var n = list[i];
        if (!n.alive) continue;
        var dx = n.x - x, dy = n.y - y, dz = n.z - z;
        if (dx * dx + dy * dy + dz * dz <= r2) out.push(n);
      }
    }
    return out;
  };

  // Props left hanging in mid-air after a blast look wrong, so drop them.
  D.cullPropsNear = function (x, y, z, r) {
    var r2 = r * r;
    var cx0 = ((x - r) / CELL) | 0, cx1 = ((x + r) / CELL) | 0;
    var cy0 = ((y - r) / CELL) | 0, cy1 = ((y + r) / CELL) | 0;
    var cz0 = ((z - r) / CELL) | 0, cz1 = ((z + r) / CELL) | 0;
    var t = this.g.terrain;
    for (var cz = cz0; cz <= cz1; cz++) for (var cy = cy0; cy <= cy1; cy++) for (var cx = cx0; cx <= cx1; cx++) {
      var list = this.propHash[cx + ',' + cy + ',' + cz];
      if (!list) continue;
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p.alive) continue;
        var dx = p.x - x, dy = p.y - y, dz = p.z - z;
        if (dx * dx + dy * dy + dz * dz > r2) continue;
        // still rooted in rock? sample just inside the face
        if (t.sample(p.x - p.nx * 0.9, p.y - p.ny * 0.9, p.z - p.nz * 0.9) > 0.1) continue;
        p.alive = false;
        this.hideInstance(p);
        this.g.fx.rubble(p.x, p.y, p.z, RS.MAT.ROCK, 4);
      }
    }
  };

  D.dispose = function () {
    var all = this.groups.concat(this.oreGroups);
    for (var i = 0; i < all.length; i++) {
      this.scene.remove(all[i].mesh);
      all[i].mesh.dispose && all[i].mesh.dispose();
    }
    this.groups = []; this.oreGroups = []; this.hash = {}; this.propHash = {};
    this.litMat.dispose(); this.glowMat.dispose(); this.oreMat.dispose();
  };
})(window.RS);
