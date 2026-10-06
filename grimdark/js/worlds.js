'use strict';
// Worlds: sky, light, fog, ground and a seeded procedural layout per planet.
(function () {
  const W = G.worlds = {};
  const h = () => G.models.h;
  let R = Math.random;
  const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rr = (a, b) => a + R() * (b - a);
  const rp = a => a[Math.floor(R() * a.length)];
  W.HALF = 68;

  /* ---------- merge static meshes per material (big draw-call saver) ---------- */
  function mergeStatic(root, scene) {
    root.updateMatrixWorld(true);
    const byMat = new Map();
    const remove = [];
    const isDyn = o => { for (let p = o; p; p = p.parent) if (p.userData.dynamic) return true; return false; };
    root.traverse(o => {
      if (!o.isMesh || isDyn(o)) return;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      const k = o.material.uuid;
      if (!byMat.has(k)) byMat.set(k, { mat: o.material, geos: [], cast: o.castShadow });
      byMat.get(k).geos.push(g);
      remove.push(o);
    });
    remove.forEach(o => o.parent.remove(o));
    for (const { mat, geos, cast } of byMat.values()) {
      let n = 0; geos.forEach(g => n += g.attributes.position.count);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let o = 0;
      for (const g of geos) {
        pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2);
        o += g.attributes.position.count; g.dispose();
      }
      const mg = new THREE.BufferGeometry();
      mg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      mg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      mg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      mg.computeBoundingSphere();
      const m = new THREE.Mesh(mg, mat);
      m.castShadow = cast; m.receiveShadow = true;
      scene.add(m);
    }
  }

  /* ---------- sky ---------- */
  function makeSky(o) {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(o.top) }, hor: { value: new THREE.Color(o.hor) }, bot: { value: new THREE.Color(o.bot) },
        sunDir: { value: new THREE.Vector3().copy(o.sunDir).normalize() }, sunCol: { value: new THREE.Color(o.sunCol) },
        time: { value: 0 }, warp: { value: o.warp || 0 }, stars: { value: o.stars || 0 }, clouds: { value: o.clouds == null ? 0.5 : o.clouds }, cloudCol: { value: new THREE.Color(o.cloudCol || o.hor) }
      },
      vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }',
      fragmentShader: `
        uniform vec3 top,hor,bot,sunCol,sunDir,cloudCol; uniform float time,warp,clouds,stars; varying vec3 vD;
        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
        float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
        void main(){
          vec3 d=normalize(vD); float hgt=d.y;
          vec3 c = hgt>0. ? mix(hor,top,pow(hgt,.55)) : mix(hor,bot,pow(-hgt,.35));
          float s=max(dot(d,sunDir),0.);
          c += sunCol*(pow(s,600.)*6. + pow(s,12.)*.35 + pow(s,3.)*.12);
          if(hgt>0.){
            vec2 uv=d.xz/(hgt+.15)*1.4 + vec2(time*.01,time*.004);
            float cl=smoothstep(.45,.85,fbm(uv))*clouds*smoothstep(0.,.25,hgt);
            c=mix(c, cloudCol*(.6+.6*pow(s,4.)), cl);
          }
          if(stars>0.){
            vec3 q=floor(d*420.);
            float st=hash(q.xy+q.z*7.3);
            c += vec3(.9,.95,1.)*step(.997,st)*stars*smoothstep(-.1,.3,hgt);
            float neb=fbm(d.xz*3.+d.y*2.);
            c += vec3(.25,.1,.4)*pow(neb,3.)*stars*.8;
          }
          if(warp>0.){
            float a=atan(d.z,d.x); float r=acos(clamp(d.y,-1.,1.));
            float sw=fbm(vec2(a*3.+r*4.-time*.15, r*6.+time*.1));
            float e=smoothstep(.55,.8,sw)*smoothstep(1.6,.2,r);
            c += vec3(1.,.2,.6)*e*warp*1.2 + vec3(.4,.1,1.)*pow(sw,4.)*warp*.6;
            float eye=pow(max(dot(d,normalize(vec3(.3,.7,-.6))),0.),300.);
            c += vec3(1.,.8,.2)*eye*3.*warp;
          }
          gl_FragColor=vec4(c,1.);
        }`
    });
    const m = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), mat);
    m.frustumCulled = false; m.renderOrder = -1;
    return m;
  }

  /* ---------- prop helpers (all colliders axis-aligned) ---------- */
  let root, P;
  function solid(w, hgt, d, mat, x, y, z, noCol) {
    const m = h().box(w, hgt, d, mat, root, x, y + hgt / 2, z);
    if (!noCol) G.world.addCentered(x, y, z, w, hgt, d);
    return m;
  }
  function gothicWall(x, z, len, axis, hmin, hmax, mat, trimMat, doorAt) {
    const n = Math.max(1, Math.round(len / 2));
    const seg = len / n;
    for (let i = 0; i < n; i++) {
      if (doorAt != null && Math.abs(i - doorAt) < 1) continue;
      if (R() < 0.12) continue;
      const hgt = rr(hmin, hmax);
      const off = -len / 2 + seg * (i + 0.5);
      const px = axis === 'x' ? x + off : x, pz = axis === 'x' ? z : z + off;
      const w = axis === 'x' ? seg : 0.8, d = axis === 'x' ? 0.8 : seg;
      solid(w, hgt, d, mat, px, 0, pz);
      // buttress / pilaster every other segment
      if (i % 2 === 0) {
        const bw = axis === 'x' ? 0.5 : 1.3, bd = axis === 'x' ? 1.3 : 0.5;
        solid(bw, hgt + 0.6, bd, trimMat || mat, px + (axis === 'x' ? -seg / 2 : 0), 0, pz + (axis === 'x' ? 0 : -seg / 2));
        h().cone(0.4, 1.4, trimMat || mat, root, px + (axis === 'x' ? -seg / 2 : 0), hgt + 1.3, pz + (axis === 'x' ? 0 : -seg / 2), 4);
      }
      // arched window insets on taller pieces
      if (hgt > 4) {
        const ww = axis === 'x' ? seg * 0.45 : 0.84, wd = axis === 'x' ? 0.84 : seg * 0.45;
        h().box(ww, 1.8, wd, P.dark, root, px, hgt - 1.9, pz);
        const arch = h().cyl(seg * 0.225, seg * 0.225, 0.84, P.dark, root, px, hgt - 1.0, pz, 10);
        arch.rotation[axis === 'x' ? 'x' : 'z'] = Math.PI / 2;
      }
      // rubble at the base
      if (R() < 0.5) for (let k = 0; k < 3; k++) { const rb = h().box(rr(0.3, 0.8), rr(0.2, 0.5), rr(0.3, 0.8), mat, root, px + rr(-1.5, 1.5), 0.15, pz + rr(-1.5, 1.5)); rb.rotation.set(R(), R() * 3, R()); }
    }
  }
  function ruinBlock(cx, cz, w, d) {
    const door = Math.floor(rr(1, 3));
    gothicWall(cx, cz - d / 2, w, 'x', 2.5, 8, P.wall, P.trim, R() < 0.5 ? door : null);
    gothicWall(cx, cz + d / 2, w, 'x', 2.5, 8, P.wall, P.trim, door);
    gothicWall(cx - w / 2, cz, d, 'z', 2.5, 8, P.wall, P.trim, R() < 0.5 ? door : null);
    gothicWall(cx + w / 2, cz, d, 'z', 2.5, 8, P.wall, P.trim, R() < 0.6 ? door + 1 : null);
    // broken upper floor reachable by stairs
    if (R() < 0.6) {
      const pw = w / 2 - 0.5;
      solid(pw, 0.4, d * 0.6, P.trim, cx + pw / 2, 2.6, cz);
      for (let s = 0; s < 7; s++) solid(0.45, (s + 1) * 0.42, 1.4, P.trim, cx - (7 - s) * 0.45 + 0.225, 0, cz);
    }
  }
  function statue(x, z) {
    solid(3, 1.6, 3, P.trim, x, 0, z);
    solid(2.4, 0.5, 2.4, P.wall, x, 1.6, z);
    const stone = G.mat('statueStone', { color: 0xffffff, map: G.texNoise('tstone', 0x6a6660, { v: 0.1, cracks: 30 }), rough: 0.85 });
    const s = { thigh: 1.1, shin: 1.1, hipW: 0.35, torso: 1.4, shW: 0.75, upper: 0.9, fore: 0.9, legR: 0.28, armR: 0.22, legMat: stone, armMat: stone };
    const rig = G.models.biped(s);
    rig.root.position.set(x, 2.1, z); rig.root.rotation.y = rr(0, 6.28);
    const j = rig.j;
    h().box(1.4, 1.2, 0.9, stone, j.torso, 0, 0.8, 0);
    for (const sd of [-1, 1]) { const p = h().sph(0.55, stone, j.torso, sd * 0.85, 1.25, 0); p.scale.set(1, 0.75, 1); }
    h().sph(0.35, stone, j.head, 0, 0.25, 0);
    j.hipL.rotation.x = -0.2; j.kneeL.rotation.x = 0.3;
    j.shR.rotation.x = -0.5; j.elR.rotation.x = -1.2;
    j.shL.rotation.set(-0.3, 0, -0.3); j.elL.rotation.x = -0.6;
    h().box(0.12, 3.2, 0.4, stone, j.handR, 0, -1.4, 0);
    h().box(1.0, 0.15, 0.25, stone, j.handR, 0, 0.1, 0);
    root.add(rig.root);
    G.world.addCentered(x, 2.1, z, 2, 5, 2);
  }
  function crate(x, z, s) {
    const m = solid(s, s, s, P.crate || G.models.mats.rust, x, 0, z);
  }
  function barricade(x, z, axis) {
    const len = rr(3, 6);
    solid(axis === 'x' ? len : 0.7, 1.1, axis === 'x' ? 0.7 : len, P.cover || P.wall, x, 0, z);
    for (let i = 0; i < 3; i++) { const t = h().box(0.15, 1.6, 0.15, G.models.mats.gunmetal, root, x + (axis === 'x' ? rr(-len / 2, len / 2) : 0), 0.8, z + (axis === 'x' ? 0 : rr(-len / 2, len / 2))); t.rotation.set(rr(-0.6, 0.6), 0, rr(-0.6, 0.6)); }
  }
  function tankWreck(x, z) {
    const m = G.mat('wreck', { color: 0xffffff, map: G.texPanels('twreck', 0x3a3a2a, { rust: 80, grid: 3 }), rough: 0.7, metal: 0.5 });
    solid(7, 2.2, 4, m, x, 0, z);
    solid(3, 1.3, 2.6, m, x - 0.5, 2.2, z);
    const b = h().cyl(0.18, 0.2, 4, G.models.mats.gunmetal, root, x + 2.6, 2.9, z, 8); b.rotation.z = Math.PI / 2 - 0.2;
    for (const sd of [-1, 1]) h().box(7.4, 1.2, 0.8, G.models.mats.gunmetal, root, x, 0.6, z + sd * 2.1);
    root.userData.smokers = root.userData.smokers || [];
    root.userData.smokers.push(new THREE.Vector3(x - 0.5, 3.6, z));
  }

  /* ---------- per-world prop sets ---------- */
  const SETS = {
    hive(x, z) {
      const t = R();
      if (t < 0.55) ruinBlock(x, z, rr(7, 11), rr(7, 11));
      else if (t < 0.7) tankWreck(x, z);
      else if (t < 0.8) statue(x, z);
      else { barricade(x, z, rp(['x', 'z'])); crate(x + 2, z + 2, 1.2); crate(x - 2, z - 1, 1); }
    },
    ice(x, z) {
      const t = R();
      const ice = G.mat('ice', { color: 0x9fd4ff, rough: 0.1, metal: 0.1, transparent: true, opacity: 0.85, emissive: 0x103050, ei: 0.4 });
      if (t < 0.45) {
        for (let i = 0; i < 6; i++) {
          const hgt = rr(2, 9), r = rr(0.6, 1.8);
          const px = x + rr(-4, 4), pz = z + rr(-4, 4);
          const c = h().cone(r, hgt, ice, root, px, hgt / 2, pz, 5); c.rotation.set(rr(-0.25, 0.25), R() * 3, rr(-0.25, 0.25));
          G.world.addCentered(px, 0, pz, r * 1.1, hgt * 0.7, r * 1.1);
        }
      } else if (t < 0.75) ruinBlock(x, z, rr(7, 10), rr(7, 10));
      else if (t < 0.9) tankWreck(x, z);
      else { const rk = solid(rr(4, 8), rr(1.5, 4), rr(4, 8), P.wall, x, 0, z); }
      const mound = h().sph(rr(1.5, 3), G.mat('snowm', { color: 0xdde6ee, rough: 0.9 }), root, x + rr(-5, 5), -0.6, z + rr(-5, 5)); mound.scale.y = 0.4;
    },
    jungle(x, z) {
      const t = R();
      const bark = G.mat('bark', { color: 0xffffff, map: G.texNoise('tbark', 0x3a2a1a, { bands: 40, v: 0.15, r: 2 }), rough: 0.9 });
      const leaf = G.mat('leaf', { color: 0x1d3a14, rough: 0.8, flat: true });
      const leaf2 = G.mat('leaf2', { color: 0x3a2a40, rough: 0.8, flat: true });
      if (t < 0.6) {
        const n = 1 + (R() * 2 | 0);
        for (let i = 0; i < n; i++) {
          const px = x + rr(-3, 3), pz = z + rr(-3, 3), r = rr(0.6, 1.3), hgt = rr(10, 20);
          h().cyl(r * 0.7, r, hgt, bark, root, px, hgt / 2, pz, 8);
          for (let k = 0; k < 5; k++) { const a = k * 1.25 + R(); const rt = h().cone(r * 0.5, 3, bark, root, px + Math.cos(a) * r * 1.4, 1, pz + Math.sin(a) * r * 1.4, 5); rt.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); }
          for (let k = 0; k < 4; k++) { const c = h().sph(rr(2.5, 4.5), R() < 0.3 ? leaf2 : leaf, root, px + rr(-3, 3), hgt + rr(-2, 1), pz + rr(-3, 3), 7); c.scale.y = 0.55; c.castShadow = true; }
          G.world.addCentered(px, 0, pz, r * 2, hgt, r * 2);
        }
      } else if (t < 0.8) {
        // glowing fungus cluster
        const fm = G.mat('fung', { color: 0x30204a, emissive: 0x7a30ff, ei: 0.5, rough: 0.5 });
        for (let i = 0; i < 4; i++) { const px = x + rr(-3, 3), pz = z + rr(-3, 3), hh = rr(1.5, 4); h().cyl(0.15, 0.25, hh, G.models.mats.sflesh, root, px, hh / 2, pz, 6); const cap = h().sph(rr(0.8, 1.6), fm, root, px, hh, pz, 10); cap.scale.y = 0.45; G.world.addCentered(px, 0, pz, 0.5, hh, 0.5); }
      } else ruinBlock(x, z, rr(7, 10), rr(7, 10));
      for (let i = 0; i < 5; i++) { const f = h().cone(rr(0.3, 0.7), rr(0.8, 1.8), leaf, root, x + rr(-6, 6), 0.4, z + rr(-6, 6), 4); f.rotation.z = rr(-0.5, 0.5); }
    },
    tomb(x, z) {
      const t = R();
      const blk = G.mat('tombStone', { color: 0xffffff, map: G.texPanels('ttomb', 0x1a1c1e, { grid: 4 }), rough: 0.35, metal: 0.6 });
      const gl = G.models.mats.ngreen;
      if (t < 0.35) {
        // stepped pyramid
        const s = rr(7, 10);
        for (let i = 0; i < 4; i++) solid(s - i * 1.8, 1.2, s - i * 1.8, blk, x, i * 1.2, z);
        const top = h().cone(1.2, 3, blk, root, x, 4 * 1.2 + 1.5, z, 4); top.rotation.y = Math.PI / 4;
        h().box(s + 0.02, 0.06, 0.1, gl, root, x, 1.15, z + s / 2);
      } else if (t < 0.65) {
        // monolith pylon with floating ring
        solid(1.6, rr(6, 10), 1.6, blk, x, 0, z);
        for (const sd of [-1, 1]) h().box(0.05, 5, 0.1, gl, root, x + sd * 0.81, 3, z);
        const ring = h().tor(1.8, 0.12, G.models.mats.ngold, root, x, 7, z); ring.rotation.x = Math.PI / 2; ring.userData.dynamic = true; ring.userData.spin = 0.6;
        root.userData.spinners = root.userData.spinners || []; root.userData.spinners.push(ring);
      } else if (t < 0.85) {
        for (let i = 0; i < 3; i++) { const w = rr(2, 5); solid(w, rr(1.2, 3), 1, blk, x + rr(-4, 4), 0, z + rr(-4, 4)); }
      } else ruinBlock(x, z, 8, 8);
      const dune = h().sph(rr(2, 4), G.mat('sandm', { color: 0x6a6048, rough: 1 }), root, x + rr(-5, 5), -1, z + rr(-5, 5)); dune.scale.y = 0.35;
    },
    forge(x, z) {
      const t = R();
      const ind = G.mat('ind', { color: 0xffffff, map: G.texPanels('tind', 0x3a3530, { rust: 40, grid: 3, stripes: true }), rough: 0.55, metal: 0.6 });
      if (t < 0.35) {
        // chimney stack
        const hh = rr(14, 26);
        h().cyl(1.2, 1.6, hh, ind, root, x, hh / 2, z, 12);
        for (let i = 1; i < 4; i++) h().tor(1.5, 0.12, G.models.mats.gunmetal, root, x, hh * i / 4, z).rotation.x = Math.PI / 2;
        G.world.addCentered(x, 0, z, 3, hh, 3);
        root.userData.smokers = root.userData.smokers || []; root.userData.smokers.push(new THREE.Vector3(x, hh, z));
        solid(4, 2, 4, ind, x + 3, 0, z);
      } else if (t < 0.55) {
        // lava channel with grates
        const lava = G.mat('lava', { color: 0x200500, emissive: 0xff4a08, ei: 1.4, rough: 0.6 });
        const len = rr(8, 12);
        h().box(2, 0.1, len, lava, root, x, 0.05, z);
        for (const sd of [-1, 1]) solid(0.6, 0.8, len, ind, x + sd * 1.3, 0, z);
      } else if (t < 0.8) ruinBlock(x, z, rr(7, 10), rr(7, 10));
      else {
        // pipe rack
        for (let i = 0; i < 3; i++) { const p = h().cyl(0.35, 0.35, 9, G.models.mats.gunmetal, root, x, 0.5 + i * 0.75, z + (i - 1) * 0.3, 10); p.rotation.x = Math.PI / 2; }
        G.world.addCentered(x, 0, z, 1.2, 2.3, 9);
        for (const sd of [-1, 1]) solid(0.3, 2.6, 0.3, ind, x, 0, z + sd * 4);
      }
    },
    warp(x, z) {
      const t = R();
      const obs = G.mat('obsid', { color: 0x120a14, rough: 0.15, metal: 0.4 });
      const glowR = G.mat('warpglow', { color: 0x300010, emissive: 0xff2060, ei: 1.0 });
      if (t < 0.45) {
        for (let i = 0; i < 5; i++) {
          const hh = rr(3, 11), r = rr(0.6, 1.6), px = x + rr(-4, 4), pz = z + rr(-4, 4);
          const sp = h().cone(r, hh, obs, root, px, hh / 2, pz, 5); sp.rotation.set(rr(-0.3, 0.3), R() * 3, rr(-0.3, 0.3));
          G.world.addCentered(px, 0, pz, r, hh * 0.7, r);
        }
        h().sph(0.4, glowR, root, x, 0.2, z, 8);
      } else if (t < 0.65) {
        // brass altar with skull pile
        solid(4, 1, 4, G.models.mats.brass, x, 0, z);
        for (let i = 0; i < 18; i++) h().sph(0.18, G.mat('bone', { color: 0xc8bc9a, rough: 0.6 }), root, x + rr(-1, 1) * (1 - i / 22), 1.1 + i * 0.07, z + rr(-1, 1) * (1 - i / 22), 7);
        for (const sx of [-1.7, 1.7]) for (const sz of [-1.7, 1.7]) { solid(0.4, 3, 0.4, obs, x + sx, 1, z + sz); h().sph(0.25, glowR, root, x + sx, 4.2, z + sz, 8); }
      } else if (t < 0.85) ruinBlock(x, z, rr(7, 10), rr(7, 10));
      else {
        // floating rocks
        for (let i = 0; i < 3; i++) { const fr = h().sph(rr(0.8, 2), obs, root, x + rr(-3, 3), rr(5, 12), z + rr(-3, 3), 5); fr.userData.dynamic = true; fr.userData.bob = R() * 6; root.userData.floaters = root.userData.floaters || []; root.userData.floaters.push(fr); }
        solid(3, 1.4, 3, obs, x, 0, z);
      }
    }
  };

  function brazier(x, z) {
    solid(0.8, 1.4, 0.8, G.models.mats.brass, x, 0, z);
    h().cyl(0.6, 0.35, 0.4, G.models.mats.brass, root, x, 1.6, z, 10);
    root.userData.fires = root.userData.fires || []; root.userData.fires.push(new THREE.Vector3(x, 1.9, z));
  }
  function pillar(x, z, hh, mat, cap) {
    solid(1.6, hh, 1.6, mat, x, 0, z);
    h().box(2.2, 0.6, 2.2, cap || mat, root, x, 0.3, z);
    h().box(2.2, 0.8, 2.2, cap || mat, root, x, hh - 0.4, z);
  }
  function hut(x, z) {
    const sm = G.models.mats.scrap;
    const w = rr(4, 7), d = rr(4, 6), hh = rr(2.6, 3.6);
    // three walls and a slanted corrugated roof
    solid(w, hh, 0.3, sm, x, 0, z - d / 2); solid(0.3, hh, d, sm, x - w / 2, 0, z); solid(0.3, hh, d, sm, x + w / 2, 0, z);
    solid(w * 0.35, hh, 0.3, sm, x - w * 0.32, 0, z + d / 2);
    const roof = h().box(w + 0.8, 0.12, d + 0.8, sm, root, x, hh + 0.3, z); roof.rotation.x = 0.18;
    G.world.addCentered(x, hh, z, w + 0.8, 0.5, d + 0.8);
    if (R() < 0.6) { const t = h().box(0.15, rr(3, 6), 0.15, G.models.mats.rust, root, x + w / 2 + 0.4, 2, z); const g = h().box(0.9, 1.2, 0.05, G.models.mats.ored, root, x + w / 2 + 0.4, 3.6, z + 0.5); }
  }
  function drums(x, z) { for (let i = 0; i < 4; i++) { const px = x + rr(-1.5, 1.5), pz = z + rr(-1.5, 1.5); h().cyl(0.4, 0.4, 1.1, G.mat('drum', { color: 0x6a2a1a, rough: 0.5, metal: 0.6 }), root, px, 0.55, pz, 10); G.world.addCentered(px, 0, pz, 0.8, 1.1, 0.8); } }
  Object.assign(SETS, {
    shrine(x, z) {
      const t = R();
      if (t < 0.3) { pillar(x - 3, z - 3, rr(9, 14), P.wall, P.trim); pillar(x + 3, z + 3, rr(9, 14), P.wall, P.trim); brazier(x + 3, z - 3); }
      else if (t < 0.55) ruinBlock(x, z, rr(8, 11), rr(8, 11));
      else if (t < 0.75) statue(x, z);
      else { brazier(x, z); for (let i = 0; i < 3; i++) { const px = x + rr(-4, 4), pz = z + rr(-4, 4); solid(0.5, 1.1, 2.4, G.mat('pew', { color: 0x3a2214, rough: 0.7 }), px, 0, pz); } }
      // candles
      for (let i = 0; i < 6; i++) { const c = h().cyl(0.06, 0.06, rr(0.3, 0.8), G.mat('candle', { color: 0xe8e0c8, rough: 0.6 }), root, x + rr(-5, 5), 0.3, z + rr(-5, 5), 6); }
    },
    ash(x, z) {
      const t = R();
      const rk = G.mat('ashrock', { color: 0xffffff, map: G.texNoise('tashrock', 0x5a5048, { v: 0.12, cracks: 20 }), rough: 0.95 });
      if (t < 0.3) { const hh = rr(3, 8); solid(rr(5, 9), hh, rr(5, 9), rk, x, 0, z); }
      else if (t < 0.55) {
        // pipeline on stilts
        const len = rr(10, 14), ax = R() < 0.5;
        const pp = h().cyl(0.8, 0.8, len, G.models.mats.rust, root, x, 2.2, z, 12); if (ax) pp.rotation.z = Math.PI / 2; else pp.rotation.x = Math.PI / 2;
        G.world.addCentered(x, 1.4, z, ax ? len : 1.6, 1.6, ax ? 1.6 : len);
        for (const o of [-len / 2 + 1, len / 2 - 1]) solid(0.4, 1.6, 0.4, G.models.mats.rust, x + (ax ? o : 0), 0, z + (ax ? 0 : o));
      } else if (t < 0.75) tankWreck(x, z);
      else ruinBlock(x, z, rr(7, 10), rr(7, 10));
      const dune = h().sph(rr(2, 4), G.mat('ashdune', { color: 0x4a443e, rough: 1 }), root, x + rr(-5, 5), -1, z + rr(-5, 5)); dune.scale.y = 0.3;
    },
    scrap(x, z) {
      const t = R();
      if (t < 0.45) hut(x, z);
      else if (t < 0.65) { for (let i = 0; i < 6; i++) { const b = h().box(rr(1, 3), rr(0.5, 2), rr(1, 3), G.models.mats.scrap, root, x + rr(-3, 3), rr(0.3, 1.5), z + rr(-3, 3)); b.rotation.set(rr(-0.4, 0.4), R() * 3, rr(-0.4, 0.4)); } G.world.addCentered(x, 0, z, 5, 2, 5); }
      else if (t < 0.8) { tankWreck(x, z); }
      else drums(x, z);
    },
    craftworld(x, z) {
      const t = R();
      const wb = G.models.mats.wraithbone, ss = G.models.mats.soulstone;
      if (t < 0.4) {
        const hh = rr(10, 22);
        h().cyl(0.8, 1.6, hh, wb, root, x, hh / 2, z, 12); h().cone(1.0, hh * 0.4, wb, root, x, hh + hh * 0.2, z, 12);
        h().sph(0.5, ss, root, x, hh * 0.6, z + 1.0, 10);
        G.world.addCentered(x, 0, z, 2.6, hh, 2.6);
      } else if (t < 0.65) {
        const arch = h().tor(4, 0.5, wb, root, x, 0, z, Math.PI); arch.rotation.y = R() < 0.5 ? 0 : Math.PI / 2;
        const ax = arch.rotation.y === 0;
        G.world.addCentered(x + (ax ? -4 : 0), 0, z + (ax ? 0 : -4), 1.2, 4, 1.2); G.world.addCentered(x + (ax ? 4 : 0), 0, z + (ax ? 0 : 4), 1.2, 4, 1.2);
      } else if (t < 0.85) {
        // crystal tree
        h().cyl(0.25, 0.4, 5, wb, root, x, 2.5, z, 8);
        for (let i = 0; i < 7; i++) { const c = h().cone(rr(0.4, 0.8), rr(2, 4), G.mat('cryst', { color: 0x60b0ff, emissive: 0x2060c0, ei: 0.6, rough: 0.1, transparent: true, opacity: 0.85 }), root, x + rr(-2, 2), rr(4, 7), z + rr(-2, 2), 5); c.rotation.set(rr(-0.8, 0.8), 0, rr(-0.8, 0.8)); }
        G.world.addCentered(x, 0, z, 0.8, 5, 0.8);
      } else { solid(rr(5, 8), 1.0, rr(5, 8), wb, x, 0, z); h().sph(0.6, ss, root, x, 1.4, z, 10); }
    },
    sept(x, z) {
      const t = R();
      const wht = G.mat('septWall', { color: 0xffffff, map: G.texPanels('tsept', 0xd8ccb0, { grid: 2 }), rough: 0.4, metal: 0.2 });
      if (t < 0.35) { const r2 = rr(3, 5); const dm = h().sph(r2, wht, root, x, 0, z, 20); dm.scale.y = 0.75; G.world.addCentered(x, 0, z, r2 * 1.4, r2 * 0.7, r2 * 1.4); h().box(1.4, 2.2, 0.2, G.models.mats.tauDark, root, x, 1.1, z + r2 * 0.95); }
      else if (t < 0.6) { const hh = rr(5, 10); solid(rr(5, 8), hh, rr(5, 8), wht, x, 0, z); h().box(0.6, 3, 0.6, G.models.mats.tauDark, root, x, hh + 1.5, z); h().sph(0.25, G.models.mats.lensR, root, x, hh + 3.1, z, 8); }
      else if (t < 0.8) { solid(8, 0.4, 8, G.models.mats.tauDark, x, 0, z); for (const sx of [-1, 1]) h().box(0.2, 0.05, 7, G.models.mats.lensB, root, x + sx * 3.5, 0.43, z); }
      else { for (let i = 0; i < 3; i++) solid(rr(2, 4), 1.2, 0.6, wht, x + rr(-3, 3), 0, z + rr(-3, 3)); }
    },
    agri(x, z) {
      const t = R();
      const wood = G.mat('barnwood', { color: 0xffffff, map: G.texNoise('tbarn', 0x6a3a22, { bands: 20, v: 0.12 }), rough: 0.8 });
      if (t < 0.3) {
        const w = rr(6, 9), d = rr(5, 7), hh = 4;
        solid(w, hh, 0.3, wood, x, 0, z - d / 2); solid(0.3, hh, d, wood, x - w / 2, 0, z); solid(0.3, hh, d, wood, x + w / 2, 0, z); solid(w * 0.3, hh, 0.3, wood, x - w * 0.35, 0, z + d / 2);
        for (const sd of [-1, 1]) { const rf = h().box(w + 0.6, 0.15, d * 0.62, G.models.mats.rust, root, x, hh + 0.9, z + sd * d * 0.27); rf.rotation.x = sd * 0.6; }
        G.world.addCentered(x, hh, z, w, 0.4, d);
      } else if (t < 0.5) { const hh = rr(8, 13); h().cyl(1.8, 1.8, hh, G.models.mats.gunmetal, root, x, hh / 2, z, 14); h().cone(2, 2, G.models.mats.gunmetal, root, x, hh + 1, z, 14); G.world.addCentered(x, 0, z, 3.6, hh, 3.6); }
      else if (t < 0.65) {
        // windmill pump
        h().cyl(0.25, 0.4, 10, G.models.mats.rust, root, x, 5, z, 6); G.world.addCentered(x, 0, z, 0.8, 10, 0.8);
        const hub = h().grp(root, x, 10, z + 0.5); hub.userData.dynamic = true; hub.userData.spinZ = 1.2;
        for (let i = 0; i < 6; i++) { const b = h().box(0.5, 3.4, 0.05, G.models.mats.rust, hub, 0, 1.7, 0); b.position.set(Math.sin(i) * 1.7, Math.cos(i) * 1.7, 0); b.rotation.z = -i; }
        root.userData.spinners = root.userData.spinners || []; root.userData.spinners.push(hub);
      } else { for (let i = 0; i < 4; i++) { const px = x + rr(-4, 4), pz = z + rr(-4, 4); const hb = h().cyl(1.0, 1.0, 1.4, G.mat('hay', { color: 0xc8a050, rough: 1 }), root, px, 1.0, pz, 12); hb.rotation.z = Math.PI / 2; G.world.addCentered(px, 0, pz, 1.6, 2, 2); } }
      for (let i = 0; i < 8; i++) { const wh = h().cone(0.25, rr(0.8, 1.3), G.mat('wheat', { color: 0xc8a040, rough: 1, flat: true }), root, x + rr(-6, 6), 0.5, z + rr(-6, 6), 4); }
    },
    hulk(x, z) {
      const t = R();
      const bh = 7;
      if (t < 0.55) {
        const w = rr(6, 10), d = rr(6, 10);
        solid(w, bh, d, P.wall, x, 0, z);
        for (let i = 0; i < 3; i++) { const pp = h().cyl(0.25, 0.25, d + 0.4, G.models.mats.rust, root, x + w / 2 + 0.3, 1 + i * 1.6, z, 8); pp.rotation.x = Math.PI / 2; }
        h().box(w + 0.1, 0.3, 0.3, G.mat('hazard', { color: 0xffffff, map: G.texPanels('thaz', 0x3a3a30, { grid: 1, stripes: true }), rough: 0.6 }), root, x, 0.15, z + d / 2 + 0.05);
      } else if (t < 0.75) { for (let i = 0; i < 3; i++) { const s2 = rr(1.4, 2.4); solid(s2, s2, s2, G.models.mats.scrap, x + rr(-3, 3), 0, z + rr(-3, 3)); } }
      else if (t < 0.88) { solid(1.2, bh, 1.2, P.trim, x, 0, z); }
      else ruinBlock(x, z, 8, 8);
    }
  });

  /* ---------- definitions ---------- */
  W.defs = {
    hive: {
      name: 'Hive Spire Tertius', sky: { top: 0x1a1210, hor: 0x8a4a22, bot: 0x1a120e, sunCol: 0xffa050, sunDir: [0.4, 0.25, -0.6], clouds: 0.8, cloudCol: 0x4a2a18 },
      fog: [0x6a3a1e, 0.012], sun: [0xffb070, 2.2], hemi: [0xffa070, 0x2a1a10, 0.6], ground: ['hive', 0x3a3028], amb: 'ash', set: 'hive', wallC: 0x5a5048, trimC: 0x3a3430, seed: 11,
      spires: 0x0a0806, windows: 0xffa040
    },
    ice: {
      name: 'Frostgrave', sky: { top: 0x2a4a6a, hor: 0xa8c0d4, bot: 0x8a9aa8, sunCol: 0xe0f0ff, sunDir: [-0.5, 0.35, -0.4], clouds: 0.6, cloudCol: 0xc0d0e0 },
      fog: [0x8aa0b4, 0.016], sun: [0xe8f4ff, 1.7], hemi: [0xbad4f0, 0x4a5a6a, 0.55], ground: ['snow', 0xaab6c0], amb: 'snow', set: 'ice', wallC: 0x6a7480, trimC: 0x4a5460, seed: 23
    },
    jungle: {
      name: 'Verdant Maw', sky: { top: 0x1a3020, hor: 0x5a7a3a, bot: 0x101a10, sunCol: 0xd0ff90, sunDir: [0.2, 0.5, 0.5], clouds: 0.7, cloudCol: 0x3a5a2a },
      fog: [0x3a5a2a, 0.022], sun: [0xd8ffa0, 1.8], hemi: [0x9ac070, 0x1a2a10, 0.7], ground: ['moss', 0x2a3a1a], amb: 'spores', set: 'jungle', wallC: 0x4a4a3a, trimC: 0x3a3a2a, seed: 37
    },
    tomb: {
      name: 'Necropolis Kher', sky: { top: 0x020604, hor: 0x1a3a24, bot: 0x050805, sunCol: 0x60ff90, sunDir: [-0.3, 0.3, 0.6], clouds: 0.3, cloudCol: 0x0a1a10 },
      fog: [0x14301c, 0.016], sun: [0x9affc0, 1.9], hemi: [0x7ad090, 0x1a2a1a, 0.9], ground: ['sand', 0x3a3626], amb: 'dust', set: 'tomb', wallC: 0x2a2c2e, trimC: 0x1a1c1e, seed: 41,
      moons: true
    },
    forge: {
      name: 'Forge Anvilheim', sky: { top: 0x100806, hor: 0x6a2a10, bot: 0x0a0604, sunCol: 0xff6a20, sunDir: [0.5, 0.2, 0.4], clouds: 0.9, cloudCol: 0x2a1410 },
      fog: [0x3a1a0e, 0.016], sun: [0xff9050, 2.0], hemi: [0xff8a50, 0x1a0a06, 0.55], ground: ['metal', 0x2e2a26], amb: 'embers', set: 'forge', wallC: 0x4a4440, trimC: 0x2a2624, seed: 53,
      spires: 0x060404, windows: 0xff5a10
    },
    warp: {
      name: 'The Screaming Rift', sky: { top: 0x1a0420, hor: 0x8a1040, bot: 0x0a0208, sunCol: 0xff60a0, sunDir: [0, 0.6, -0.5], clouds: 0.5, cloudCol: 0x4a0a3a, warp: 1 },
      fog: [0x3a0a2a, 0.017], sun: [0xff80b0, 1.6], hemi: [0xff5090, 0x200510, 0.6], ground: ['flesh', 0x2a1418], amb: 'warp', set: 'warp', wallC: 0x3a2a2e, trimC: 0x2a1a20, seed: 66
    }
  };

  Object.assign(W.defs, {
    shrine: {
      name: 'Sanctum Ecclesiarch', sky: { top: 0x20140a, hor: 0xc8902a, bot: 0x1a120a, sunCol: 0xffe0a0, sunDir: [-0.2, 0.35, -0.7], clouds: 0.7, cloudCol: 0x6a4a28 },
      fog: [0x7a5a32, 0.012], sun: [0xffe0b0, 2.2], hemi: [0xffd090, 0x2a1a0a, 0.65], ground: ['hive', 0x6a6050], amb: 'ash', set: 'shrine', wallC: 0x8a7a68, trimC: 0x5a4a3a, seed: 71,
      spires: 0x120c08, windows: 0xffc060, titans: true, flyby: true
    },
    ash: {
      name: 'Ash Wastes of Gorgonne', sky: { top: 0x2a2622, hor: 0x8a7a68, bot: 0x2a2622, sunCol: 0xffe8c0, sunDir: [0.6, 0.3, 0.2], clouds: 0.9, cloudCol: 0x5a5048 },
      fog: [0x6a6056, 0.02], sun: [0xfff0d0, 1.8], hemi: [0xc0b0a0, 0x3a3028, 0.7], ground: ['sand', 0x5a5248], amb: 'ash', set: 'ash', wallC: 0x5a5450, trimC: 0x3a3632, seed: 83,
      titans: true, flyby: true
    },
    scrap: {
      name: 'Scrap-Town Gorkaz', sky: { top: 0x3a3020, hor: 0xc0a060, bot: 0x2a2010, sunCol: 0xfff0b0, sunDir: [0.4, 0.5, -0.3], clouds: 0.4, cloudCol: 0x9a8050 },
      fog: [0x8a7448, 0.014], sun: [0xfff0c0, 2.2], hemi: [0xe0c890, 0x3a2a18, 0.7], ground: ['sand', 0x6a5a3a], amb: 'dust', set: 'scrap', wallC: 0x6a5a48, trimC: 0x4a3a2a, seed: 97
    },
    craftworld: {
      name: 'Craftworld Ilanthe', sky: { top: 0x020208, hor: 0x101838, bot: 0x02020a, sunCol: 0x80c0ff, sunDir: [0.3, 0.6, -0.4], clouds: 0, stars: 1 },
      fog: [0x0a1020, 0.012], sun: [0xb0d0ff, 1.9], hemi: [0x7090d0, 0x101020, 0.75], ground: ['metal', 0x3a4050], amb: 'spores', set: 'craftworld', wallC: 0xc8c0b0, trimC: 0x8a8478, seed: 109
    },
    sept: {
      name: "Sept Vash'ya", sky: { top: 0x3a6a9a, hor: 0xe8c890, bot: 0x6a5a40, sunCol: 0xfff0d0, sunDir: [-0.4, 0.55, 0.3], clouds: 0.35, cloudCol: 0xf0e0c0 },
      fog: [0xc0aa88, 0.011], sun: [0xfff4e0, 2.4], hemi: [0xd0e0f0, 0x6a5a40, 0.75], ground: ['sand', 0x8a7a5a], amb: 'dust', set: 'sept', wallC: 0xd8ccb0, trimC: 0x9a8a70, seed: 131, flyby: true
    },
    agri: {
      name: 'Agri-World Messor', sky: { top: 0x3a6aa8, hor: 0xd8e0c0, bot: 0x6a7a40, sunCol: 0xfff8e0, sunDir: [0.5, 0.45, 0.4], clouds: 0.5, cloudCol: 0xffffff },
      fog: [0xb0b890, 0.012], sun: [0xfff8e8, 2.3], hemi: [0xd0e0ff, 0x5a6a30, 0.75], ground: ['wheat', 0x8a7a3a], amb: 'spores', set: 'agri', wallC: 0x8a8070, trimC: 0x5a5040, seed: 149, flyby: true
    },
    hulk: {
      name: 'Space Hulk "Sin of Damnation"', sky: { top: 0x000000, hor: 0x000000, bot: 0x000000, sunCol: 0x000000, sunDir: [0, 1, 0], clouds: 0 },
      fog: [0x0a0606, 0.035], sun: [0xff8060, 0.35], hemi: [0x7a5048, 0x100808, 0.5], ground: ['metal', 0x2a2624], amb: 'ash', set: 'hulk', wallC: 0x3a3632, trimC: 0x2a2624, seed: 163,
      interior: true
    },
  });

  function groundTex(kind, c) {
    const opts = { hive: { v: 0.12, cracks: 30, r: 5 }, snow: { v: 0.05, r: 10 }, moss: { v: 0.15, r: 6 }, sand: { v: 0.08, r: 3, cracks: 10 }, metal: null, flesh: { v: 0.15, cracks: 50, r: 6 }, wheat: { v: 0.18, r: 2, bands: 60 } }[kind];
    if (kind === 'metal') return G.texPanels('gmetal', c, { grid: 2, rust: 30, rep: 1 });
    return G.texNoise('g' + kind, c, Object.assign({ size: 512, n: 9000 }, opts));
  }

  W.current = null;
  W.build = function (key) {
    const d = W.defs[key];
    W.current = d; W.key = key;
    R = seeded(d.seed);
    const scene = G.scene;
    while (scene.children.length) scene.remove(scene.children[0]);
    G.world.clear();
    root = new THREE.Group(); scene.add(root);
    P = {
      wall: G.mat('wall_' + key, { color: 0xffffff, map: G.texBricks('tw_' + key, d.wallC, { grime: true, rep: 1 }), bump: G.texBricks('tw_' + key, d.wallC), rough: 0.85, bs: 0.03 }),
      trim: G.mat('trim_' + key, { color: 0xffffff, map: G.texNoise('tt_' + key, d.trimC, { v: 0.1, cracks: 20 }), rough: 0.8 }),
      dark: G.mat('dark_' + key, { color: 0x050505, rough: 1 }),
    };
    P.cover = P.trim;
    // sky, fog, light
    const sky = makeSky(Object.assign({}, d.sky, { sunDir: new THREE.Vector3(...d.sky.sunDir) }));
    scene.add(sky); W.sky = sky;
    scene.fog = new THREE.FogExp2(d.fog[0], d.fog[1]);
    scene.background = new THREE.Color(d.fog[0]);
    const hemi = new THREE.HemisphereLight(d.hemi[0], d.hemi[1], d.hemi[2]); scene.add(hemi);
    const sun = new THREE.DirectionalLight(d.sun[0], d.sun[1]);
    sun.position.set(...d.sky.sunDir).multiplyScalar(60);
    sun.castShadow = true;
    const sm = G.settings.quality === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera; sc.left = sc.bottom = -45; sc.right = sc.top = 45; sc.near = 1; sc.far = 200;
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    scene.add(sun); scene.add(sun.target);
    W.sun = sun; W.sunOff = new THREE.Vector3(...d.sky.sunDir).normalize().multiplyScalar(80);
    scene.environment = G.makeEnv(d.sky.top, d.sky.hor, d.hemi[1], d.sun[0]);
    G.vmScene.environment = scene.environment;
    G.vmSun.color.set(d.sun[0]); G.vmAmb.color.set(d.hemi[0]); G.vmAmb.groundColor.set(d.hemi[1]);
    // ground
    const gt = groundTex(d.ground[0], d.ground[1]);
    gt.repeat.set(36, 36);
    const gmat = new THREE.MeshStandardMaterial({ map: gt, bumpMap: gt, bumpScale: 0.04, roughness: d.ground[0] === 'snow' ? 0.8 : 0.9, metalness: d.ground[0] === 'metal' ? 0.5 : 0 });
    const gplane = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), gmat);
    gplane.rotation.x = -Math.PI / 2; gplane.receiveShadow = true;
    scene.add(gplane);
    // perimeter: tall boundary with visuals
    const H = W.HALF;
    for (const [x, z, w, dd] of [[0, -H - 2, 2 * H + 8, 4], [0, H + 2, 2 * H + 8, 4], [-H - 2, 0, 4, 2 * H + 8], [H + 2, 0, 4, 2 * H + 8]]) {
      G.world.addCentered(x, 0, z, w, 30, dd);
    }
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, rad = H + rr(4, 14);
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      const hh = rr(8, 26);
      const m = h().box(rr(6, 14), hh, rr(6, 14), P.wall, root, G.clamp(x, -H - 12, H + 12), hh / 2, G.clamp(z, -H - 12, H + 12));
      m.rotation.y = R() * 3;
    }
    // distant hive spires / mountains
    if (d.spires) {
      const sm2 = G.mat('spire' + key, { color: d.spires, rough: 1 });
      const wm = G.glow('win' + key, d.windows, 0.8);
      for (let i = 0; i < 26; i++) {
        const a = rr(0, 6.28), rad = rr(170, 300), hh = rr(80, 260), w = rr(14, 40);
        const sp = h().box(w, hh, w, sm2, root, Math.cos(a) * rad, hh / 2 - 5, Math.sin(a) * rad); sp.castShadow = false;
        h().cone(w * 0.6, hh * 0.4, sm2, root, Math.cos(a) * rad, hh + hh * 0.2 - 5, Math.sin(a) * rad, 4).castShadow = false;
        for (let k = 0; k < 14; k++) { const wn = h().box(1.5, 1.5, w + 0.2, wm, root, Math.cos(a) * rad + rr(-w / 2, w / 2) * 0.9, rr(10, hh - 5), Math.sin(a) * rad); wn.castShadow = false; wn.rotation.y = R() < 0.5 ? 0 : Math.PI / 2; }
      }
    } else {
      const mm = G.mat('mtn' + key, { color: d.fog[0], rough: 1, flat: true });
      for (let i = 0; i < 22; i++) {
        const a = i / 22 * 6.28 + rr(-0.1, 0.1), rad = rr(180, 280), hh = rr(50, 140);
        const mt = h().cone(rr(50, 90), hh, mm, root, Math.cos(a) * rad, hh / 2 - 4, Math.sin(a) * rad, 6); mt.castShadow = false;
      }
    }
    if (d.moons) {
      const moon = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 16), new THREE.MeshBasicMaterial({ color: 0x2a5a3a, fog: false }));
      moon.position.set(-150, 160, -320); root.add(moon); moon.userData.dynamic = true;
      const moon2 = new THREE.Mesh(new THREE.SphereGeometry(16, 16, 12), new THREE.MeshBasicMaterial({ color: 0x5a7a6a, fog: false }));
      moon2.position.set(120, 110, -330); root.add(moon2); moon2.userData.dynamic = true;
    }
    // layout: jittered grid, central plaza clear
    const cell = 15;
    for (let gx = -4; gx <= 4; gx++) for (let gz = -4; gz <= 4; gz++) {
      const cx = gx * cell + rr(-3, 3), cz = gz * cell + rr(-3, 3);
      if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
        if (gx === 0 && gz === 0) continue;
        if (R() < 0.5) { barricade(cx, cz, rp(['x', 'z'])); continue; }
      }
      if (Math.abs(cx) > H - 6 || Math.abs(cz) > H - 6) continue;
      if (R() < 0.18) continue;
      SETS[d.set](cx, cz);
    }
    // centre monument
    if (d.set === 'hive' || d.set === 'forge' || d.set === 'shrine') statue(0, -6);
    if (d.interior) {
      sun.castShadow = false;
      const ceil = h().box(2 * H + 8, 1, 2 * H + 8, G.mat('ceil', { color: 0xffffff, map: G.texPanels('tceil', 0x2a2624, { grid: 4, rust: 20 }), rough: 0.7, metal: 0.5 }), root, 0, 7.5, 0);
      G.world.add(-H - 4, 7, -H - 4, H + 4, 8, H + 4);
      for (let i = 0; i < 6; i++) {
        const l = new THREE.PointLight(i % 2 ? 0xff3010 : 0xffa060, 2.2, 26, 2);
        l.position.set(rr(-45, 45), 6, rr(-45, 45)); scene.add(l);
        h().box(1.2, 0.2, 0.4, G.glow('hulkl' + (i % 2), i % 2 ? 0xff3010 : 0xffa060), root, l.position.x, 6.9, l.position.z);
      }
    }
    // a few static coloured lights for mood
    for (let i = 0; i < (d.interior ? 0 : 3); i++) {
      const l = new THREE.PointLight(d.windows || d.sun[0], 1.5, 20, 2);
      l.position.set(rr(-40, 40), 3, rr(-40, 40)); scene.add(l);
    }
    // merge the static props
    const dyn = [];
    root.traverse(o => { if (o.userData.dynamic) dyn.push(o); });
    mergeStatic(root, scene);
    W.spinners = root.userData.spinners || [];
    W.floaters = root.userData.floaters || [];
    W.smokers = root.userData.smokers || [];
    W.fires = root.userData.fires || [];
    // the wider war: titans striding on the horizon, gunships overhead
    W.titans = [];
    if (d.titans) for (let i = 0; i < 2; i++) {
      const t = G.models.titan(); t.root.scale.setScalar(22 + i * 6);
      const a = i * 2.4 + 0.5; t.ang = a; t.rad = 200 + i * 40; t.dir = i ? -1 : 1;
      scene.add(t.root); W.titans.push(t); t.fireT = G.rand(2, 6);
    }
    W.flyby = d.flyby ? { t: G.rand(6, 14), ship: null } : null;
    G.fx.attach(scene);
    // spawn points around the edges
    W.spawns = [];
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      const p = new THREE.Vector3(Math.cos(a) * (H - 5), 0, Math.sin(a) * (H - 5));
      p.x = G.clamp(p.x, -H + 4, H - 4); p.z = G.clamp(p.z, -H + 4, H - 4);
      W.spawns.push(p);
    }
    W.playerStart = new THREE.Vector3(0, 0, 6);
    // ambient audio
    if (W.wind) W.wind.stop();
    W.wind = G.audio.loop('wind'); W.wind.set(0.3, 0.12);
    if (W.drone) W.drone.stop();
    W.drone = G.audio.loop('drone'); W.drone.set(0, key === 'warp' || key === 'tomb' ? 0.06 : 0.03);
  };

  // per-frame world animation: sky, shadow follow, ambient particles
  const AMB = {
    ash: { c: 0x8a8078, add: false, vy: -0.6, n: 3, s: 0.06, a: 0.6 },
    snow: { c: 0xffffff, add: false, vy: -1.8, n: 8, s: 0.06, a: 0.9, wind: 1.5 },
    spores: { c: 0x9aff5a, add: true, vy: 0.15, n: 2, s: 0.08, a: 0.7 },
    dust: { c: 0x60ff90, add: true, vy: 0.1, n: 2, s: 0.05, a: 0.6 },
    embers: { c: 0xff7020, add: true, vy: 1.2, n: 4, s: 0.06, a: 0.9 },
    warp: { c: 0xff40c0, add: true, vy: 0.8, n: 4, s: 0.09, a: 0.8 }
  };
  const _c = new THREE.Color(), _c2 = new THREE.Color(), _f1 = new THREE.Color(0xffd070), _f2 = new THREE.Color(0xff3000), _s1 = new THREE.Color(0x8a8a8a), _tp = new THREE.Vector3();
  W.update = function (dt, camPos) {
    if (!W.current) return;
    W.sky.position.copy(camPos);
    W.sky.material.uniforms.time.value += dt;
    W.sun.position.copy(camPos).add(W.sunOff); W.sun.target.position.copy(camPos);
    for (const s of W.spinners) s.rotation.z += dt * (s.userData.spinZ || 0.6);
    for (const f of W.fires) if (Math.random() < 0.6) G.fx.add.emit(f.x + G.rand(-0.3, 0.3), f.y, f.z + G.rand(-0.3, 0.3), G.rand(-0.2, 0.2), G.rand(1, 2.5), G.rand(-0.2, 0.2), G.rand(0.4, 0.8), 0.5, 0.1, _f1, _f2, 0.9, 0, 0, 0);
    for (const t of W.titans) {
      t.ang += dt * 0.012 * t.dir;
      t.root.position.set(Math.cos(t.ang) * t.rad, 0, Math.sin(t.ang) * t.rad);
      t.root.rotation.y = Math.atan2(-Math.sin(t.ang) * t.dir, Math.cos(t.ang) * t.dir);
      t.anim.move = 0.5; t.anim.phase += dt * 0.55; t.anim.aim = 1;
      G.models.animate(t, dt);
      t.fireT -= dt;
      if (t.fireT <= 0) {
        t.fireT = G.rand(3, 8);
        const mz = t.muzzles[Math.random() < 0.5 ? 0 : 1]; mz.getWorldPosition(_tp);
        G.fx.burst(G.fx.add, _tp, 20, { c0: 0xffffff, c1: 0xffa040, sp: [5, 25], life: [0.2, 0.5], s0: [4, 9], s1: 1 });
        setTimeout(() => G.audio.play('explosion', null, 0.25), 600);
      }
    }
    if (W.flyby) {
      const fb = W.flyby;
      if (!fb.ship) { fb.t -= dt; if (fb.t <= 0) { fb.ship = G.models.gunship(); fb.ship.scale.setScalar(1.6); const a = Math.random() * 6.28; fb.dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)); fb.ship.position.copy(camPos).addScaledVector(fb.dir, -260).setY(G.rand(45, 70)); fb.ship.lookAt(_tp.copy(fb.ship.position).add(fb.dir)); G.scene.add(fb.ship); G.audio.play('engine', null, 0.6); } }
      else { fb.ship.position.addScaledVector(fb.dir, dt * 70); if (Math.random() < 0.5) { _tp.copy(fb.ship.position).addScaledVector(fb.dir, -9); G.fx.smoke.emit(_tp.x, _tp.y, _tp.z, 0, 0, 0, 2.5, 1.5, 5, _s1, _s1, 0.3, 0, 0, 0); } if (fb.ship.position.distanceTo(camPos) > 300) { fb.ship.parent && fb.ship.parent.remove(fb.ship); fb.ship = null; fb.t = G.rand(18, 35); } }
    }
    for (const f of W.floaters) { f.userData.bob += dt; f.position.y += Math.sin(f.userData.bob) * dt * 0.4; f.rotation.y += dt * 0.2; }
    for (const s of W.smokers) if (Math.random() < 0.3) G.fx.smoke.emit(s.x + G.rand(-0.5, 0.5), s.y, s.z + G.rand(-0.5, 0.5), G.rand(-0.3, 0.3) + 0.6, G.rand(1.5, 3), G.rand(-0.3, 0.3), 5, 1, 5, _c.set(0x1a1816), _c2.set(0x3a3632), 0.5, 0, 0, 0.1);
    const a = AMB[W.current.amb];
    if (a) {
      _c.set(a.c);
      const sys = a.add ? G.fx.add : G.fx.smoke;
      for (let i = 0; i < a.n; i++) {
        sys.emit(camPos.x + G.rand(-25, 25), camPos.y + G.rand(-3, 12), camPos.z + G.rand(-25, 25),
          (a.wind || 0.3) * G.rand(0, 1), a.vy * G.rand(0.6, 1.4), G.rand(-0.3, 0.3), G.rand(3, 6), a.s, a.s, _c, _c, a.a, 0, 0, 0);
      }
    }
  };
})();
