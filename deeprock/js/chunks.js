/* Rock & Stone — chunk renderer. Turns dirty regions of the density field into
   Three.js meshes, a few per frame, and hides chunks beyond the fog so a cave
   full of freshly dug tunnels still runs at a steady frame rate. */
(function (RS) {
  'use strict';
  var CS = RS.CHUNK;


  /* A tileable rock-grain texture, generated once. R/G hold the height
     gradient, B the height itself; the terrain shader samples it triplanar
     and bends the surface normal, which buys fine rock detail at zero
     geometry cost. One-metre voxels can only be so bumpy on their own. */
  var bumpTex = null;
  function makeRockBump(size) {
    if (bumpTex) return bumpTex;
    size = size || 256;
    var h = new Float32Array(size * size);
    function H(a, b, salt) {
      return RS.hash3(a, b, salt);
    }
    function vnoise(x, y, per, salt) {
      var xi = Math.floor(x), yi = Math.floor(y);
      var xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      function w(a) { return ((a % per) + per) % per; }
      var c00 = H(w(xi), w(yi), salt), c10 = H(w(xi + 1), w(yi), salt);
      var c01 = H(w(xi), w(yi + 1), salt), c11 = H(w(xi + 1), w(yi + 1), salt);
      return RS.lerp(RS.lerp(c00, c10, u), RS.lerp(c01, c11, u), v);
    }
    var octaves = [[8, 0.5], [16, 0.26], [32, 0.14], [64, 0.08]];
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var v = 0, norm = 0;
        for (var o = 0; o < octaves.length; o++) {
          var per = octaves[o][0], amp = octaves[o][1];
          v += amp * vnoise(x / size * per, y / size * per, per, 7 + o * 31);
          norm += amp;
        }
        // sharpen into something crystalline rather than cloudy
        var t = v / norm;
        h[y * size + x] = t * t * (3 - 2 * t);
      }
    }
    var data = new Uint8Array(size * size * 3);
    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) {
        var xm = (x + size - 1) % size, xp2 = (x + 1) % size;
        var ym = (y + size - 1) % size, yp = (y + 1) % size;
        var gx = (h[y * size + xp2] - h[y * size + xm]) * 0.5;
        var gy = (h[yp * size + x] - h[ym * size + x]) * 0.5;
        var i = (y * size + x) * 3;
        data[i] = RS.clamp(Math.round((gx * 6 * 0.5 + 0.5) * 255), 0, 255);
        data[i + 1] = RS.clamp(Math.round((gy * 6 * 0.5 + 0.5) * 255), 0, 255);
        data[i + 2] = RS.clamp(Math.round(h[y * size + x] * 255), 0, 255);
      }
    }
    bumpTex = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
    bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    bumpTex.magFilter = THREE.LinearFilter;
    bumpTex.minFilter = THREE.LinearMipMapLinearFilter;
    bumpTex.generateMipmaps = true;
    bumpTex.needsUpdate = true;
    return bumpTex;
  }
  RS.rockBumpTexture = makeRockBump;

  /* Patch a Phong material so it perturbs its normal from that texture,
     projected on all three axes and blended by the face normal. */
  RS.applyRockDetail = function (mat, scale, strength, tint) {
    var tex = makeRockBump(256);
    mat.onBeforeCompile = function (shader) {
      shader.uniforms.uBump = { value: tex };
      shader.uniforms.uBumpScale = { value: scale === undefined ? 0.26 : scale };
      shader.uniforms.uBumpPower = { value: strength === undefined ? 0.85 : strength };
      shader.uniforms.uTint = { value: tint === undefined ? 0.34 : tint };
      shader.vertexShader = 'varying vec3 vRockPos;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vRockPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader =
        'uniform sampler2D uBump;\nuniform float uBumpScale;\nuniform float uBumpPower;\nuniform float uTint;\nvarying vec3 vRockPos;\n' +
        shader.fragmentShader.replace(
          '#include <normal_fragment_begin>',
          '#include <normal_fragment_begin>\n' +
          '  vec3 rkA = abs(normal);\n' +
          '  vec3 rkW = rkA / max(1e-4, (rkA.x + rkA.y + rkA.z));\n' +
          '  vec3 rkP = vRockPos * uBumpScale;\n' +
          '  vec3 bX = texture2D(uBump, rkP.zy).rgb;\n' +
          '  vec3 bY = texture2D(uBump, rkP.xz).rgb;\n' +
          '  vec3 bZ = texture2D(uBump, rkP.xy).rgb;\n' +
          '  vec2 gX = bX.rg * 2.0 - 1.0;\n' +
          '  vec2 gY = bY.rg * 2.0 - 1.0;\n' +
          '  vec2 gZ = bZ.rg * 2.0 - 1.0;\n' +
          '  vec3 rkPert = vec3(0.0, gX.y, gX.x) * rkW.x\n' +
          '              + vec3(gY.x, 0.0, gY.y) * rkW.y\n' +
          '              + vec3(gZ.x, gZ.y, 0.0) * rkW.z;\n' +
          '  normal = normalize(normal + rkPert * uBumpPower);\n' +
          '  float rkH = bX.b * rkW.x + bY.b * rkW.y + bZ.b * rkW.z;\n' +
          '  float rkShade = 1.0 - uTint + uTint * (rkH * 1.55);\n')
          .replace('vec4 diffuseColor = vec4( diffuse, opacity );',
            'vec4 diffuseColor = vec4( diffuse, opacity );');
      // apply the grain to albedo after the colour map stage
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_phong_fragment>',
        '  diffuseColor.rgb *= rkShade;\n#include <lights_phong_fragment>');
      mat.userData.shader = shader;
    };
    mat.customProgramCacheKey = function () { return 'rockdetail' + scale + '_' + strength; };
    return mat;
  };

  RS.ChunkManager = function (terrain, scene, biome) {
    this.t = terrain; this.scene = scene;
    this.palette = RS.paletteFor(biome);
    this.out = terrain.newMeshOut(this.palette);
    this.meshes = {};
    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = false;
    scene.add(this.group);
    // Flat shading gives the surface-nets mesh a chiselled, rocky read instead
    // of the melted look smooth normals produce on an organic field.
    this.mat = RS.applyRockDetail(new THREE.MeshPhongMaterial({
      vertexColors: true, side: THREE.FrontSide, flatShading: true,
      shininess: 5, specular: 0x16181e
    }), 0.26, 0.9, 0.38);
    this.cullDist = (biome.fogFar || 70) + 26;
    this.budget = 4;          // chunks re-meshed per frame while playing
    this.pending = [];
    this._v = new THREE.Vector3();
    this.stats = { meshed: 0, visible: 0 };
  };

  RS.ChunkManager.prototype.key = function (cx, cy, cz) {
    return cx + cy * this.t.cnx + cz * this.t.cnx * this.t.cny;
  };

  RS.ChunkManager.prototype.buildChunk = function (k) {
    var t = this.t;
    var cnx = t.cnx, cny = t.cny;
    var cx = k % cnx, cy = ((k / cnx) | 0) % cny, cz = (k / (cnx * cny)) | 0;
    t.meshChunk(cx, cy, cz, this.out);
    var o = this.out, mesh = this.meshes[k];
    if (!o.indices.length) {
      if (mesh) { this.group.remove(mesh); mesh.geometry.dispose(); delete this.meshes[k]; }
      return;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(o.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(o.normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(o.colors, 3));
    geo.setIndex(o.indices.slice());
    geo.computeBoundingSphere();
    if (mesh) { mesh.geometry.dispose(); mesh.geometry = geo; }
    else {
      mesh = new THREE.Mesh(geo, this.mat);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.userData.cc = new THREE.Vector3((cx + 0.5) * CS, (cy + 0.5) * CS, (cz + 0.5) * CS);
      this.meshes[k] = mesh;
      this.group.add(mesh);
    }
    this.stats.meshed++;
  };

  // Build everything that is currently dirty (used once at mission load).
  RS.ChunkManager.prototype.buildAll = function (onProgress) {
    var list = this.t.dirtyList;
    for (var i = 0; i < list.length; i++) {
      this.buildChunk(list[i]);
      this.t.dirty[list[i]] = false;
      if (onProgress && (i % 24 === 0)) onProgress(i / list.length);
    }
    list.length = 0;
  };

  // Incremental: a handful of chunks per frame keeps mining smooth.
  RS.ChunkManager.prototype.update = function (camPos) {
    var list = this.t.dirtyList, done = 0;
    while (list.length && done < this.budget) {
      var k = list.shift();
      this.t.dirty[k] = false;
      this.buildChunk(k);
      done++;
    }
    var cull = this.cullDist, cull2 = cull * cull, vis = 0;
    for (var key in this.meshes) {
      var m = this.meshes[key];
      var cc = m.userData.cc;
      var dx = cc.x - camPos.x, dy = cc.y - camPos.y, dz = cc.z - camPos.z;
      var on = (dx * dx + dy * dy + dz * dz) < cull2;
      if (m.visible !== on) m.visible = on;
      if (on) vis++;
    }
    this.stats.visible = vis;
  };

  RS.ChunkManager.prototype.dispose = function () {
    for (var k in this.meshes) { this.meshes[k].geometry.dispose(); }
    this.scene.remove(this.group);
    this.meshes = {};
    this.mat.dispose();
  };
})(window.RS);
