// Dropfall — procedural 3D models and their animation rigs.
// Sim (x, y) maps to world (x, z); models are built facing +X and turned with rotation.y = -angle.
'use strict';
(function () {
  const T = THREE;
  const MD = DF.Models = {};
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- shared geometry & materials
  const GEO = {
    box: new T.BoxGeometry(1, 1, 1),
    sph: new T.SphereGeometry(1, 14, 10),
    sphLo: new T.SphereGeometry(1, 8, 6),
    cyl: new T.CylinderGeometry(1, 1, 1, 12),
    cylLo: new T.CylinderGeometry(1, 1, 1, 6),
    cone: new T.ConeGeometry(1, 1, 12),
    hexc: new T.CylinderGeometry(1, 1, 1, 6),
    taper: new T.CylinderGeometry(0.6, 1, 1, 10),
    torus: new T.TorusGeometry(1, 0.08, 6, 28),
    oct: new T.OctahedronGeometry(1, 0),
    ico: new T.IcosahedronGeometry(1, 0),
    disc: new T.CylinderGeometry(1, 1, 0.1, 20)
  };
  // cylinders and cones hang down from their joint: shift so the top sits at the origin
  GEO.limb = GEO.cyl.clone(); GEO.limb.translate(0, -0.5, 0);
  GEO.limbLo = GEO.cylLo.clone(); GEO.limbLo.translate(0, -0.5, 0);
  GEO.limbT = new T.CylinderGeometry(0.75, 1, 1, 10); GEO.limbT.translate(0, -0.5, 0);
  GEO.boxDown = GEO.box.clone(); GEO.boxDown.translate(0, -0.5, 0);
  GEO.coneX = GEO.cone.clone(); GEO.coneX.rotateZ(-Math.PI / 2); GEO.coneX.translate(0.5, 0, 0);
  GEO.cylX = GEO.cyl.clone(); GEO.cylX.rotateZ(-Math.PI / 2); GEO.cylX.translate(0.5, 0, 0);
  GEO.cylXc = GEO.cyl.clone(); GEO.cylXc.rotateZ(-Math.PI / 2);
  MD.GEO = GEO;

  const MATS = new Map();
  function mat(col, o) {
    o = o || {};
    const key = col + '|' + (o.r ?? 0.65) + (o.m ?? 0.15) + (o.e || '') + (o.ei ?? 1) + (o.o ?? 1) + (o.ds ? 1 : 0) + (o.add ? 1 : 0) + (o.flat ? 1 : 0);
    let m = MATS.get(key);
    if (!m) {
      if (o.add) m = new T.MeshBasicMaterial({ color: col, transparent: true, opacity: o.o ?? 1, blending: T.AdditiveBlending, depthWrite: false, side: o.ds ? T.DoubleSide : T.FrontSide });
      else m = new T.MeshStandardMaterial({ color: col, roughness: o.r ?? 0.65, metalness: o.m ?? 0.15, emissive: o.e || 0x000000, emissiveIntensity: o.ei ?? 1, transparent: (o.o ?? 1) < 1, opacity: o.o ?? 1, side: o.ds ? T.DoubleSide : T.FrontSide, flatShading: !!o.flat, depthWrite: (o.o ?? 1) >= 1 });
      MATS.set(key, m);
    }
    return m;
  }
  MD.mat = mat;
  MD.FLASH = new T.MeshStandardMaterial({ color: '#c8a090', emissive: '#ff7a50', emissiveIntensity: 0.55, roughness: 0.6 });

  const C = new T.Color();
  function shade(col, f) { C.set(col); const hsl = {}; C.getHSL(hsl); C.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + f))); return '#' + C.getHexString(); }
  MD.shade = shade;

  function part(parent, geo, col, sx, sy, sz, x, y, z, o) {
    const m = new T.Mesh(GEO[geo] || geo, col && col.isMaterial ? col : mat(col, o));
    m.scale.set(sx, sy, sz); m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = !(o && o.noShadow); m.receiveShadow = false;
    parent.add(m); return m;
  }
  function joint(parent, x, y, z) { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g; }
  MD.part = part; MD.joint = joint;

  // a model is { root, ... rig fields, update(state, dt, t) }
  function finish(m) {
    m.meshes = []; m.root.traverse(o => { if (o.isMesh) { m.meshes.push(o); o.userData.mat = o.material; } });
    m.flashOn = false;
    m.setFlash = on => { if (on === m.flashOn) return; m.flashOn = on; for (const o of m.meshes) if (!o.userData.noFlash) o.material = on ? MD.FLASH : o.userData.mat; };
    m.setShadow = on => { if (on === m.shadowOn) return; m.shadowOn = on; for (const o of m.meshes) o.castShadow = on && !o.userData.noShadow; };
    m.shadowOn = true;
    return m;
  }
  MD.finish = finish;
  const glow = (parent, col, r, x, y, z, op) => { const g = part(parent, 'sphLo', col, r, r, r, x, y, z, { add: true, o: op ?? 0.55 }); g.userData.noFlash = true; g.userData.noShadow = true; g.castShadow = false; return g; };
  MD.glow = glow;

  // two-bone IK for limbs that hang along -Y; all points are in the limb's parent space
  const DOWN = new T.Vector3(0, -1, 0), _d = new T.Vector3(), _ax = new T.Vector3(), _up = new T.Vector3(), _el = new T.Vector3(), _lo = new T.Vector3(), _q = new T.Quaternion();
  MD.ik2 = function (sh, el, target, L1, L2, pole) {
    _d.copy(target).sub(sh.position);
    const dist = Math.min(L1 + L2 - 0.05, Math.max(0.5, _d.length()));
    _d.normalize();
    const a = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist))));
    _ax.crossVectors(_d, pole).normalize();
    _up.copy(_d).applyAxisAngle(_ax, -a);
    sh.quaternion.setFromUnitVectors(DOWN, _up);
    _el.copy(sh.position).addScaledVector(_up, L1);
    _lo.copy(target).sub(_el).normalize();
    _q.copy(sh.quaternion).invert(); _lo.applyQuaternion(_q);
    el.quaternion.setFromUnitVectors(DOWN, _lo);
  };
  const POLE = new T.Vector3(-0.3, -1, 0).normalize(), _t1 = new T.Vector3(), _t2 = new T.Vector3();

  // ---------------------------------------------------------------- divers (humanoid)
  // ~40 units tall, facing +X
  MD.diver = function (arm, capeId, o) {
    o = o || {};
    const root = new T.Group(), m = { root, kind: 'diver' };
    const main = arm.main, trim = arm.trim, dark = shade(main, -0.22), under = '#25272a';
    const cls = arm.cls, bulk = cls === 'heavy' ? 1.18 : cls === 'light' ? 0.9 : 1;
    const metal = { r: 0.55, m: 0.35 };
    m.hip = joint(root, 0, 17, 0);
    part(m.hip, 'box', under, 5.5, 4, 9, 0, 0, 0);
    part(m.hip, 'box', dark, 6, 2, 10, 0, 1.5, 0, metal); // belt
    part(m.hip, 'box', '#3a3428', 2.2, 2.6, 2.6, 2.8, 1, 3.2); // pouch
    part(m.hip, 'box', '#3a3428', 2.2, 2.6, 2.6, 2.8, 1, -3.2);
    m.legs = [];
    for (const s of [1, -1]) {
      const L = {};
      L.hip = joint(m.hip, 0, -1.5, 2.6 * s);
      part(L.hip, 'limbT', under, 2.1, 8.5, 2.1, 0, 0, 0);
      part(L.hip, 'box', main, 2.2 * bulk, 4.5, 3.2 * bulk, 1.2, -3.5, 0, metal); // thigh plate
      L.knee = joint(L.hip, 0, -8.5, 0);
      part(L.knee, 'sphLo', dark, 1.9, 1.9, 1.9, 0.6, 0, 0, metal);
      part(L.knee, 'limbT', under, 1.8, 7.5, 1.8, 0, 0, 0);
      part(L.knee, 'box', main, 2.2 * bulk, 5, 3 * bulk, 1, -3.4, 0, metal); // shin guard
      L.foot = joint(L.knee, 0, -7.5, 0);
      part(L.foot, 'box', '#1e1f20', 6, 2.2, 3.4, 1.2, -0.6, 0);
      m.legs.push(L);
    }
    m.torso = joint(m.hip, 0, 1.5, 0);
    part(m.torso, 'box', under, 6, 11, 10.5, 0, 6, 0);
    part(m.torso, 'box', main, 4.2 * bulk, 9, 11 * bulk, 1.4, 7, 0, metal); // chest plate
    part(m.torso, 'box', trim, 0.8, 5, 4, 3.7 * bulk, 8, 0, metal);
    part(m.torso, 'box', main, 4, 8, 10 * bulk, -1.8, 7.5, 0, metal); // back plate
    part(m.torso, 'box', dark, 2, 2.4, 12 * bulk, 1, 2.2, 0, metal); // abdomen band
    for (const s of [1, -1]) { const pd = part(m.torso, 'sph', trim, 3.3 * bulk, 2.2 * bulk, 3.6 * bulk, 0.2, 12.2, 6.4 * s, metal); pd.rotation.x = -0.35 * s; part(m.torso, 'box', MD.shade(main, -0.1), 4 * bulk, 1, 4 * bulk, 0.2, 13.4, 6.4 * s, metal); } // pauldrons
    if (cls === 'heavy') { part(m.torso, 'box', dark, 5, 3, 13, 1, 13, 0, metal); }
    // backpack
    m.pack = joint(m.torso, -4.2, 7, 0);
    part(m.pack, 'box', '#3d4235', 3.4, 9, 8, 0, 0, 0);
    part(m.pack, 'box', '#2c2f28', 1, 3, 6, -1.8, -2, 0);
    m.packExtra = joint(m.pack, -1.8, 0, 0);
    // head
    m.head = joint(m.torso, 0.3, 14.5, 0);
    part(m.head, 'sph', main, 4.4, 4.6, 4.4, 0, 1.6, 0, metal);
    part(m.head, 'box', arm.visor, 1.6, 2.6, 6.2, 3.5, 1.4, 0, { r: 0.15, m: 0.8 });
    part(m.head, 'box', trim, 6.4, 1, 1.4, 0, 5.6, 0, metal); // crest
    part(m.head, 'box', dark, 3.5, 2.2, 7, 1.5, -1.3, 0, metal); // jaw guard
    // arms (aiming pose by default)
    m.arms = [];
    for (const s of [1, -1]) {
      const A = {};
      A.sh = joint(m.torso, 0.5, 11, 6.2 * s);
      part(A.sh, 'limbT', under, 1.7, 6.5, 1.7, 0, 0, 0);
      part(A.sh, 'box', main, 2.6, 4, 2.8, 0, -2.6, 0, metal);
      A.el = joint(A.sh, 0, -6.5, 0);
      part(A.el, 'limbT', under, 1.5, 6, 1.5, 0, 0, 0);
      part(A.el, 'box', dark, 2.3, 3.6, 2.4, 0, -3.6, 0, metal);
      part(A.el, 'sphLo', '#1e1f20', 1.7, 1.7, 1.7, 0, -6.3, 0);
      m.arms.push(A);
    }
    // weapon held at chest
    m.gun = joint(m.torso, 6, 7.5, -1.5);
    m.gunMesh = MD.gunSimple(m.gun, o.gunCls || 'Assault Rifle');
    const pistol = /Pistol|Revolver/.test(o.gunCls || ''); m.gripR = new T.Vector3(pistol ? 0.5 : 1.6, -2.2, 0); m.gripL = new T.Vector3(pistol ? 1 : 5.5, pistol ? -2 : -0.4, 0.4);
    // cape
    const cape = DF.CAPES[capeId];
    if (cape && cape.c1) {
      m.cape = joint(m.torso, -3.8, 12.5, 0);
      const geo = new T.PlaneGeometry(10, 19, 2, 6); geo.translate(0, -9.5, 0); geo.rotateY(Math.PI / 2);
      const cols = []; const c1 = new T.Color(cape.c1), c2 = new T.Color(cape.c2 || cape.c1), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = -p.getY(i) / 19, z = p.getZ(i) / 5;
        let use2 = false;
        switch (cape.pattern) {
          case 'stripe': use2 = Math.abs(z) < 0.3; break;
          case 'split': use2 = z > 0; break;
          case 'border': use2 = Math.abs(z) > 0.8 || y > 0.9; break;
          case 'chevron': use2 = Math.abs(y - 0.5 - Math.abs(z) * 0.3) < 0.12; break;
          case 'star': case 'bolt': case 'flame': case 'hex': use2 = y > 0.35 && y < 0.65 && Math.abs(z) < 0.5; break;
        }
        const c = use2 ? c2 : c1; cols.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
      const cm = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: 0.9 }));
      cm.castShadow = true; m.cape.add(cm); m.capeMesh = cm; m.capeBase = geo.attributes.position.array.slice();
    }
    m.phase = Math.random() * 6; m.dead = 0;
    m.update = (d, dt, t, opt) => {
      const sp = Math.hypot(d.vx || 0, d.vy || 0), amp = Math.min(1, sp / 140);
      m.phase += sp * dt * 0.085;
      const ph = m.phase;
      if (m.dead > 0) { // ragdoll-ish fall
        m.dead += dt; const k = Math.min(1, m.dead / 0.6);
        root.rotation.z = -k * Math.PI / 2 * 0.95; root.position.y = (opt && opt.h || 0) + k * 3;
        m.arms[0].sh.rotation.set(0.6 * k, 0, -0.4 * k); m.arms[1].sh.rotation.set(-0.6 * k, 0, -0.3 * k); m.arms[0].el.rotation.set(0, 0, 0.3); m.arms[1].el.rotation.set(0, 0, 0.3);
        m.legs[0].hip.rotation.z = 0.3 * k; m.legs[1].hip.rotation.z = -0.2 * k;
        return;
      }
      const prone = (d.proneT > 0 || d.diveT > 0) ? 1 : 0;
      m.prone = (m.prone || 0) + (prone - (m.prone || 0)) * Math.min(1, dt * 10);
      root.rotation.z = -m.prone * 1.35;
      for (let i = 0; i < 2; i++) {
        const L = m.legs[i], o2 = i ? Math.PI : 0;
        L.hip.rotation.z = Math.sin(ph + o2) * 0.65 * amp;
        L.knee.rotation.z = -Math.max(0, Math.sin(ph + o2 + 1.2)) * 1.1 * amp - 0.08;
        L.foot.rotation.z = Math.max(0, Math.sin(ph + o2 - 0.5)) * 0.4 * amp;
      }
      m.hip.position.y = 17 - (1 - Math.abs(Math.cos(ph))) * 1.1 * amp;
      m.torso.rotation.y = Math.sin(ph) * 0.12 * amp;
      m.torso.rotation.z = -0.08 * amp - (d.sprinting ? 0.15 : 0);
      // arms hold the gun; recoil kicks them back
      const rec = m.recoil || 0; m.recoil = Math.max(0, rec - dt * 8);
      m.gun.position.set(6 - rec * 1.8 - (d.sprinting ? 2 : 0), 7.5 - (d.sprinting ? 2 : 0), -1.5);
      m.gun.rotation.set(d.sprinting ? 0.5 : 0, d.sprinting ? 0.6 : 0, d.sprinting ? -0.4 : 0);
      m.gun.updateMatrix();
      if (m.gripR) {
        _t1.copy(m.gripR).applyMatrix4(m.gun.matrix); _t2.copy(m.gripL).applyMatrix4(m.gun.matrix);
        MD.ik2(m.arms[0].sh, m.arms[0].el, _t1, 6.5, 6.3, POLE);
        MD.ik2(m.arms[1].sh, m.arms[1].el, _t2, 6.5, 6.3, POLE);
      }
      m.head.rotation.y = Math.sin(t * 0.7 + ph * 0.1) * 0.15;
      // cape sways with motion
      if (m.capeMesh && opt && opt.near) {
        const p = m.capeMesh.geometry.attributes.position, b = m.capeBase;
        for (let i = 0; i < p.count; i++) {
          const y = -b[i * 3 + 1] / 19;
          p.array[i * 3] = b[i * 3] - y * y * (2 + amp * 7) - Math.sin(t * 3 + y * 4 + b[i * 3 + 2] * 0.2) * y * (0.6 + amp * 1.2);
        }
        p.needsUpdate = true;
      }
      // pack visuals
      if (m.packType !== (d.pack && d.pack.type)) {
        m.packType = d.pack && d.pack.type;
        while (m.packExtra.children.length) m.packExtra.remove(m.packExtra.children[0]);
        if (m.packType === 'shield') { part(m.packExtra, 'cylXc', '#4a5a6a', 2.4, 2.4, 2.4, -0.5, 3, 0, { m: 0.5 }); glow(m.packExtra, '#76c6ff', 1.6, -1.5, 3, 0, 0.8); }
        if (m.packType === 'jump') { for (const s of [1, -1]) { part(m.packExtra, 'cyl', '#5a4a3a', 1.6, 6, 1.6, -0.8, -1, 3 * s, { m: 0.5 }); } }
        if (m.packType === 'supply') { part(m.packExtra, 'box', '#6a6040', 3, 7, 8, -1, 0, 0); part(m.packExtra, 'box', '#d8a33a', 3.2, 1.2, 8.2, -1, 1, 0); }
        if (m.packType === 'dog') { part(m.packExtra, 'box', '#5a6066', 2.5, 5, 6, -1, 2, 0, { m: 0.5 }); }
        if (m.packType && DF.BACKPACKS[m.packType] && DF.BACKPACKS[m.packType].ammoFor) { part(m.packExtra, 'box', '#3d4235', 3, 8, 8, -1, 0, 0); for (const s of [-1, 0, 1]) part(m.packExtra, 'cyl', '#5a5a50', 0.9, 6, 0.9, -2.6, 0, 2.5 * s); }
        for (const o2 of m.packExtra.children) { o2.userData.mat = o2.material; m.meshes.push(o2); }
      }
      if (m.carry !== !!d.carrying) { m.carry = !!d.carrying; }
    };
    return finish(m);
  };

  // simple held weapon for third-person divers
  MD.gunSimple = function (g, cls) {
    const dark = '#1c1d1e', mid = '#3a3c3e';
    const long = /Machine Gun|Anti-Materiel|Recoilless|Railgun|Autocannon|Laser Cannon|Guided|Disposable|Heavy|Grenade Launcher|Flamethrower|Arc Thrower/.test(cls);
    const pistol = /Pistol|Revolver/.test(cls);
    const L = pistol ? 6 : long ? 17 : 13;
    part(g, 'box', mid, L * 0.55, 2.6, 2, L * 0.15, 0, 0, { m: 0.6, r: 0.4 });
    part(g, 'cylX', dark, 0.7, L * 0.55, 0.7, L * 0.4, 0.4, 0, { m: 0.7, r: 0.3 });
    if (!pistol) { part(g, 'box', dark, 4, 2, 1.6, -L * 0.25, -0.4, 0); part(g, 'box', dark, 1.4, 3.2, 1.4, L * 0.15, -2.4, 0); }
    if (long) part(g, 'box', '#4a4c44', 5, 3.2, 3, L * 0.1, -0.2, 0);
    return g;
  };

  // ---------------------------------------------------------------- Brood
  MD.bug = function (d) {
    const s = d.r / 10, root = new T.Group(), m = { root, kind: 'bug', s };
    const col = d.col, dark = shade(col, -0.18), darker = shade(col, -0.3), shellCol = shade(col, -0.1);
    const chit = { r: 0.55, m: 0.05 };
    m.body = joint(root, 0, 9 * s, 0);
    part(m.body, 'sph', col, 7 * s, 5.8 * s, 7 * s, 0, 0, 0, chit); // thorax
    for (let i = 0; i < 3; i++) part(m.body, 'sph', shellCol, 3.2 * s, 1.6 * s, 6 * s, 3 * s - i * 3 * s, 4.6 * s - Math.abs(i - 1) * 0.6 * s, 0, { r: 0.35, m: 0.25 }); // dorsal plates
    m.head = joint(m.body, 7 * s, 1 * s, 0);
    part(m.head, 'sph', dark, 4.6 * s, 4 * s, 5 * s, 1.2 * s, 0, 0, chit);
    for (const z of [1, -1]) { part(m.head, 'sphLo', '#0b0806', 1.1 * s, 1.1 * s, 1.1 * s, 4.2 * s, 1.5 * s, 2.2 * s * z, { r: 0.1, m: 0.6 }); }
    m.mand = [];
    for (const z of [1, -1]) { const j = joint(m.head, 4.4 * s, -1.2 * s, 1.6 * s * z); part(j, 'coneX', shade(col, 0.15), 1.1 * s, 5.5 * s, 1.1 * s, 0, 0, 0, chit); m.mand.push(j); }
    if (d.horn) { part(m.head, 'coneX', '#d8ccb0', 3.5 * s, 12 * s, 3 * s, 4 * s, 1.5 * s, 0, { r: 0.4 }); }
    if (d.shell) { const sh = part(m.head, 'sph', shade(col, -0.05), 2 * s, 6 * s, 7.5 * s, 3 * s, 1.5 * s, 0, { r: 0.3, m: 0.3 }); sh.rotation.z = -0.4; }
    m.abd = joint(m.body, -5 * s, 1 * s, 0);
    const al = (d.len || 1.3) * 7 * s;
    if (d.sac) {
      part(m.abd, 'sph', dark, al * 0.9, 5.5 * s, 6.5 * s, -al * 0.75, 0.5 * s, 0, chit);
      m.sac = part(m.abd, 'sph', '#c6ef5a', al * 0.95, 6.6 * s, 7.2 * s, -al * 0.95, 2 * s, 0, { e: '#7ac81a', ei: 0.8, r: 0.3, o: 0.92 });
    } else {
      part(m.abd, 'sph', dark, al, 6 * s, 7 * s, -al * 0.85, 1 * s, 0, chit);
      for (let i = 0; i < 4; i++) part(m.abd, 'sph', shellCol, 1.8 * s, 1.2 * s, 6.2 * s, -al * 0.3 - i * al * 0.38, 5.4 * s - i * 0.6 * s, 0, { r: 0.35, m: 0.2 });
    }
    if (d.caller) m.glowNode = glow(m.body, '#ff9a3a', 2 * s, 0, 5 * s, 0, 0.7);
    // legs
    m.legs = [];
    const n = d.legs || 0, pairs = n / 2;
    for (let i = 0; i < pairs; i++) {
      const lx = pairs === 1 ? 0 : 4.5 * s - i * 9 * s / (pairs - 1);
      for (const side of [1, -1]) {
        const L = {};
        L.hip = joint(m.body, lx, -0.5 * s, 4.5 * s * side);
        L.hip.rotation.y = (lx / (5 * s)) * 0.5 * side;
        L.fem = joint(L.hip, 0, 0, 0); L.fem.rotation.x = -1.9 * side;
        part(L.fem, 'limbLo', darker, 0.9 * s, 9 * s, 0.9 * s, 0, 0, 0, chit);
        L.knee = joint(L.fem, 0, -9 * s, 0); L.knee.rotation.x = 1.48 * side;
        part(L.knee, 'sphLo', dark, 1.1 * s, 1.1 * s, 1.1 * s, 0, 0, 0, chit);
        part(L.knee, 'limbT', darker, 0.8 * s, 13.5 * s, 0.8 * s, 0, 0, 0, chit); part(L.knee, 'cone', darker, 0.7 * s, 2.5 * s, 0.7 * s, 0, -14.2 * s, 0, chit).rotation.x = Math.PI;
        L.side = side; L.i = i; L.gait = ((i + (side > 0 ? 1 : 0)) % 2) * Math.PI;
        m.legs.push(L);
      }
    }
    // burrower tentacles
    if (d.atk === 'tentacle') {
      m.body.position.y = 4 * s; m.tents = [];
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * TAU; let j = joint(root, Math.cos(a) * 9 * s, 2 * s, Math.sin(a) * 9 * s); const chain = [];
        for (let q = 0; q < 5; q++) { part(j, 'limbT', q % 2 ? '#7a3d4e' : '#6d3d4a', (1.5 - q * 0.22) * s, 6 * s, (1.5 - q * 0.22) * s, 0, 0, 0, chit); chain.push(j); j = joint(j, 0, -6 * s, 0); }
        chain[0].rotation.x = Math.PI; m.tents.push({ chain, a });
      }
    }
    m.phase = Math.random() * 6;
    m.update = (e, dt, t) => {
      const sp = Math.hypot(e.vx, e.vy), amp = Math.min(1, sp / 60);
      m.phase += (sp * 0.09 + (e.chargeT > 0 ? 12 : 0)) * dt / Math.max(0.6, s);
      const ph = m.phase;
      if (m.dead > 0) {
        m.dead += dt; const k = Math.min(1, m.dead / 0.5);
        if (d.tier <= 1) { m.body.rotation.x = k * Math.PI * 0.95; m.body.position.y = 9 * s * (1 - k * 0.4); }
        else { m.body.position.y = 9 * s * (1 - k * 0.6); m.body.rotation.z = -k * 0.25; }
        for (const L of m.legs) { L.fem.rotation.x = -1.9 * L.side * (1 - k) - 0.6 * L.side * k; L.knee.rotation.x = (1.48 + 1.1 * k) * L.side; }
        if (m.dead > 4) root.position.y -= dt * 4 * s;
        return;
      }
      for (const L of m.legs) {
        const g = ph + L.gait;
        L.hip.rotation.y = (L.i - (pairs - 1) / 2) * -0.25 * L.side + Math.sin(g) * 0.35 * amp;
        const lift = Math.max(0, Math.cos(g)) * 0.4 * amp;
        L.fem.rotation.x = (-1.9 - lift) * L.side;
        L.knee.rotation.x = (1.48 + lift * 0.6) * L.side;
      }
      m.body.position.y = (d.atk === 'tentacle' ? 4 : 9) * s + Math.abs(Math.sin(ph)) * 0.5 * s * amp + Math.sin(t * 2 + m.phase) * 0.15 * s;
      const atk = Math.max(e.atkAnim || 0, 0); if (e.atkAnim) e.atkAnim -= dt;
      m.head.position.x = 7 * s + atk * 12 * s;
      const open = 0.35 + atk * 2 + Math.sin(t * 9 + m.phase) * 0.08;
      m.mand[0].rotation.y = -open; m.mand[1].rotation.y = open;
      m.abd.rotation.y = Math.sin(ph * 0.5) * 0.12 * amp;
      m.abd.rotation.z = (e.cdFired || 0) > 0 ? 0.6 * e.cdFired : Math.sin(t * 1.5 + m.phase) * 0.04;
      if (m.sac) { const p = 1 + Math.sin(t * 4 + m.phase) * 0.05; m.sac.scale.set(m.sac.userData.sx || (m.sac.userData.sx = m.sac.scale.x), m.sac.scale.y, m.sac.scale.z); m.sac.scale.x = m.sac.userData.sx * p; }
      m.body.rotation.z = e.leapT > 0 ? 0.35 : e.windT > 0 ? -0.2 : e.chargeT > 0 ? -0.15 : 0;
      if (m.tents) for (const tn of m.tents) tn.chain.forEach((j, q) => { if (q) { j.rotation.z = Math.sin(t * 2.5 + q + tn.a * 3) * 0.35; j.rotation.x = Math.cos(t * 2 + q * 0.7 + tn.a) * 0.3; } else { j.rotation.x = Math.PI + Math.sin(t + tn.a) * 0.3; j.rotation.z = Math.cos(tn.a) * 0.6; } });
    };
    return finish(m);
  };

  MD.flyer = function (d) {
    const s = d.r / 10, root = new T.Group(), m = { root, kind: 'flyer', hover: 42 };
    m.body = joint(root, 0, 42, 0);
    part(m.body, 'sph', d.col, 8 * s, 3.6 * s, 4 * s, 0, 0, 0, { r: 0.45 });
    part(m.body, 'sph', shade(d.col, -0.2), 3.5 * s, 3 * s, 3.2 * s, 7 * s, 0.5 * s, 0);
    part(m.body, 'sph', shade(d.col, -0.25), 7 * s, 2.6 * s, 3 * s, -9 * s, 0, 0);
    for (const z of [1, -1]) part(m.body, 'sphLo', '#0b0806', 0.9 * s, 0.9 * s, 0.9 * s, 9.5 * s, 1 * s, 1.3 * s * z, { m: 0.6, r: 0.1 });
    m.wings = [];
    for (const side of [1, -1]) {
      const w = joint(m.body, 1 * s, 1.5 * s, 2.5 * s * side);
      const mem = part(w, 'box', '#d0aa78', 9 * s, 0.25 * s, 15 * s, 0, 0, 7.5 * s * side, { o: 0.72, ds: true, r: 0.8 });
      mem.castShadow = true;
      part(w, 'cyl', shade(d.col, -0.3), 0.5 * s, 16 * s, 0.5 * s, 3 * s, 0.3 * s, 8 * s * side).rotation.x = Math.PI / 2;
      w.userData.side = side; m.wings.push(w);
    }
    m.update = (e, dt, t) => {
      if (m.dead > 0) { m.dead += dt; m.body.position.y = Math.max(2, m.body.position.y - dt * 120); m.body.rotation.x += dt * 6; return; }
      const flap = Math.sin(t * 24 + e.id) * 0.8;
      m.wings[0].rotation.x = flap; m.wings[1].rotation.x = -flap;
      const tgt = e.target && (e.target.veh || e.target); const dist = tgt ? Math.hypot(tgt.x - e.x, tgt.y - e.y) : 999;
      const want = dist < 80 ? 14 : 40;
      m.body.position.y += (want + Math.sin(t * 3 + e.id) * 3 - m.body.position.y) * Math.min(1, dt * 4);
      m.body.rotation.z = dist < 80 ? -0.4 : 0;
    };
    return finish(m);
  };

  // ---------------------------------------------------------------- Foundry
  MD.bot = function (d) {
    const s = d.r / 10, root = new T.Group(), m = { root, kind: 'bot' };
    const col = d.col, dark = shade(col, -0.15), steel = { r: 0.45, m: 0.65 }, big = d.big ? 1.25 : 1;
    m.hip = joint(root, 0, 15 * s, 0);
    part(m.hip, 'box', '#2a2a2c', 5 * s, 4 * s, 8 * s, 0, 0, 0, steel);
    m.legs = [];
    for (const side of [1, -1]) {
      const L = {};
      L.hip = joint(m.hip, 0, -1 * s, 3.4 * s * side);
      part(L.hip, 'boxDown', dark, 3.4 * s * big, 8 * s, 3.4 * s * big, 0, 0, 0, steel);
      L.knee = joint(L.hip, 0, -7.5 * s, 0);
      part(L.knee, 'sphLo', '#222', 2 * s, 2 * s, 2 * s, 0, 0, 0, steel);
      part(L.knee, 'boxDown', col, 3.8 * s * big, 7.5 * s, 3.8 * s * big, 0, 0, 0, steel);
      part(L.knee, 'box', '#1c1c1d', 7 * s, 2 * s, 4.4 * s * big, 1 * s, -7.5 * s, 0, steel);
      m.legs.push(L);
    }
    m.torso = joint(m.hip, 0, 2 * s, 0);
    part(m.torso, 'cyl', '#2a2a2c', 3 * s, 4 * s, 3 * s, 0, 1.5 * s, 0, steel);
    part(m.torso, 'box', col, 7 * s * big, 9 * s, 11 * s * big, 0, 8 * s, 0, steel);
    part(m.torso, 'box', dark, 2 * s, 7 * s, 8 * s * big, 3.8 * s * big, 8 * s, 0, steel);
    for (const side of [1, -1]) { part(m.torso, 'box', shade(col, 0.08), 6 * s * big, 4 * s * big, 5 * s * big, 0, 12.5 * s, 7.5 * s * big * side, steel); }
    if (d.vent) { m.vent = part(m.torso, 'box', '#ff7a2a', 1.2 * s, 5 * s, 6 * s, -4.2 * s * big, 8 * s, 0, { e: '#ff5a10', ei: 1.4 }); m.vent.userData.noFlash = true; for (let i = 0; i < 4; i++) part(m.torso, 'box', '#1a1a1a', 1.4 * s, 0.5 * s, 6.4 * s, -4.4 * s * big, 6.2 * s + i * 1.3 * s, 0); }
    if (d.pack) { const pk = joint(m.torso, -2 * s, 13 * s, 5 * s); part(pk, 'box', '#3a2e26', 6 * s, 4 * s, 4 * s, 0, 0, 0, steel); for (let i = 0; i < 4; i++) part(pk, 'cylXc', '#151515', 0.7 * s, 1.2 * s, 0.7 * s, 3 * s, (i % 2 - 0.5) * 2 * s, (Math.floor(i / 2) - 0.5) * 2 * s); }
    if (d.atk === 'flame') { part(m.torso, 'cyl', '#6a3a2a', 2.2 * s, 9 * s, 2.2 * s, -5 * s, 9 * s, 2.5 * s, steel); part(m.torso, 'cyl', '#6a3a2a', 2.2 * s, 9 * s, 2.2 * s, -5 * s, 9 * s, -2.5 * s, steel); }
    m.head = joint(m.torso, 0.5 * s, 14 * s, 0);
    part(m.head, 'box', dark, 5 * s, 4.5 * s, 4.6 * s, 0, 1.8 * s, 0, steel);
    part(m.head, 'box', '#111', 0.6 * s, 1.4 * s, 4.2 * s, 2.5 * s, 2.2 * s, 0, steel);
    m.eye = part(m.head, 'box', d.eye, 0.5 * s, 0.9 * s, 2.2 * s, 2.85 * s, 2.2 * s, 0, { e: d.eye, ei: 2 }); m.eye.userData.noFlash = true;
    if (d.antenna) { part(m.head, 'cyl', '#888', 0.2 * s, 8 * s, 0.2 * s, -1.5 * s, 7 * s, 1.5 * s, steel); glow(m.head, '#ff3b2f', 0.8 * s, -1.5 * s, 11 * s, 1.5 * s, 0.9); }
    m.arms = [];
    for (const side of [1, -1]) {
      const A = {};
      A.sh = joint(m.torso, 0, 12 * s, 7.5 * s * big * side);
      part(A.sh, 'boxDown', dark, 3 * s * big, 7 * s, 3 * s * big, 0, 0, 0, steel);
      A.el = joint(A.sh, 0, -7 * s, 0);
      part(A.el, 'sphLo', '#222', 1.8 * s, 1.8 * s, 1.8 * s, 0, 0, 0, steel);
      if (d.saw) {
        part(A.el, 'boxDown', col, 2.6 * s, 6 * s, 2.6 * s, 0, 0, 0, steel);
        A.saw = joint(A.el, 0, -7 * s, 0); const disc = part(A.saw, 'disc', '#c8c0b0', 4.5 * s, 1, 4.5 * s, 0, 0, 0, { m: 0.9, r: 0.25 }); disc.rotation.x = Math.PI / 2;
      } else if ((side === -1 && d.atk !== 'melee') || (d.big && d.atk !== 'flame')) {
        part(A.el, 'boxDown', '#1f1f21', 3.4 * s, 4 * s, 3.4 * s * big, 0, 0, 0, steel);
        A.barrel = part(A.el, 'limb', '#141414', 0.9 * s * big, 8 * s, 0.9 * s * big, 0, -3 * s, 0, steel);
        A.muzzle = joint(A.el, 0, -11 * s, 0);
      } else if (d.atk === 'flame' && side === -1) {
        part(A.el, 'boxDown', '#3a2a22', 3.2 * s, 6 * s, 3.2 * s, 0, 0, 0, steel); part(A.el, 'limb', '#1a1a1a', 1.2 * s, 4 * s, 1.2 * s, 0, -6 * s, 0, steel);
        A.pilot = glow(A.el, '#ff9a3a', 0.9 * s, 0, -10.5 * s, 0, 0.9);
      } else {
        part(A.el, 'boxDown', col, 2.8 * s, 6 * s, 2.8 * s * big, 0, 0, 0, steel);
        if (d.atk === 'flame') part(A.el, 'box', '#2f3036', 1.5 * s, 12 * s, 9 * s, 1.5 * s, -4 * s, 0, steel); // shield plate
        else part(A.el, 'box', '#1c1c1d', 2.4 * s, 2.4 * s, 2.4 * s, 0, -7 * s, 0, steel);
      }
      m.arms.push(A);
    }
    m.phase = Math.random() * 6;
    m.update = (e, dt, t) => {
      const sp = Math.hypot(e.vx, e.vy), amp = Math.min(1, sp / 50);
      m.phase += sp * dt * 0.1 / s;
      const ph = m.phase;
      if (m.dead > 0) {
        m.dead += dt; const k = Math.min(1, m.dead / 0.8), kk = k * k;
        root.rotation.z = -kk * Math.PI / 2 * 0.98; root.position.y = (m.h || 0) + Math.sin(k * Math.PI) * 3 * s;
        m.eye.material = mat('#2a0a08'); m.arms[0].sh.rotation.z = 2 * k; m.arms[1].sh.rotation.x = 0.8 * k;
        if (m.vent) m.vent.material = mat('#3a1a0a');
        if (m.dead > 5) root.position.y -= dt * 6;
        return;
      }
      for (let i = 0; i < 2; i++) { const L = m.legs[i], o2 = i ? Math.PI : 0; L.hip.rotation.z = Math.sin(ph + o2) * 0.5 * amp; L.knee.rotation.z = -Math.max(0, Math.sin(ph + o2 + 1.3)) * 0.9 * amp; }
      m.hip.position.y = 15 * s - (1 - Math.abs(Math.cos(ph))) * 0.9 * s * amp;
      m.torso.rotation.y = Math.sin(ph) * 0.08 * amp; m.torso.rotation.x = Math.sin(ph) * 0.05 * amp;
      const hunting = e.state === 'hunt';
      const rec = m.recoil || 0; m.recoil = Math.max(0, rec - dt * 10);
      for (let i = 0; i < 2; i++) {
        const A = m.arms[i];
        const aim = hunting && (A.barrel || A.pilot || d.saw);
        A.sh.rotation.z = aim ? 1.45 - rec * 0.3 : Math.sin(ph + (i ? 0 : Math.PI)) * 0.35 * amp + 0.1;
        A.el.rotation.z = aim ? 0.1 : 0.3;
        if (A.saw) { A.saw.rotation.y += dt * 40; A.sh.rotation.z = hunting ? 1.2 + Math.sin(t * 9 + i * 2) * 0.35 * (e.atkAnim > 0 ? 2 : 0.4) : 0.4; }
        if (A.pilot) A.pilot.scale.setScalar(0.9 * s * (e.flaming ? 3 + Math.random() : 1));
      }
      if (e.atkAnim) e.atkAnim = Math.max(0, e.atkAnim - dt);
      if (m.vent) m.vent.material.emissiveIntensity = 1.1 + Math.sin(t * 6) * 0.4;
      m.head.rotation.y = hunting ? 0 : Math.sin(t * 0.8 + ph) * 0.4;
    };
    return finish(m);
  };

  MD.walker = function (d) {
    const boss = !!d.boss, s = d.r / (boss ? 58 : 18), root = new T.Group(), m = { root, kind: 'walker' };
    const col = d.col, dark = shade(col, -0.15), steel = { r: 0.5, m: 0.6 };
    const H = boss ? 95 : 34;
    m.body = joint(root, 0, H * s, 0);
    if (boss) {
      part(m.body, 'box', col, 70 * s, 26 * s, 50 * s, 0, 0, 0, steel);
      part(m.body, 'box', dark, 60 * s, 8 * s, 44 * s, 0, 16 * s, 0, steel);
      part(m.body, 'box', '#2a2826', 30 * s, 10 * s, 30 * s, -6 * s, -16 * s, 0, steel);
      m.hatch = part(m.body, 'box', '#ff5a20', 16 * s, 1, 16 * s, -6 * s, -21.5 * s, 0, { e: '#ff3a10', ei: 1.2 }); m.hatch.userData.noFlash = true;
      m.turret = joint(m.body, 10 * s, 22 * s, 0);
      part(m.turret, 'box', dark, 22 * s, 10 * s, 18 * s, 0, 0, 0, steel);
      m.barrel = joint(m.turret, 10 * s, 1 * s, 0); part(m.barrel, 'cylX', '#1a1a1a', 3 * s, 40 * s, 3 * s, 0, 0, 0, steel);
      for (const z of [12, -12]) { const e2 = part(m.body, 'box', d.eye, 1, 3 * s, 6 * s, 35.2 * s, 4 * s, z * s, { e: d.eye, ei: 2 }); e2.userData.noFlash = true; }
      for (let i = 0; i < 6; i++) part(m.body, 'box', shade(col, -0.25), 6 * s, 20 * s, 2 * s, -20 * s + i * 8 * s, 0, 25.5 * s, steel);
    } else {
      part(m.body, 'box', col, 22 * s, 12 * s, 18 * s, 0, 0, 0, steel);
      const nose = part(m.body, 'box', dark, 10 * s, 9 * s, 16 * s, 12 * s, -1 * s, 0, steel); nose.rotation.z = -0.4;
      part(m.body, 'box', '#3a3530', 9 * s, 3 * s, 12 * s, -7 * s, 7 * s, 0); // open seat
      m.pilot = joint(m.body, -8 * s, 9 * s, 0);
      part(m.pilot, 'box', '#55504a', 4 * s, 7 * s, 6 * s, 0, 3 * s, 0, steel);
      part(m.pilot, 'box', '#4a4540', 3.5 * s, 3.5 * s, 3.5 * s, 0.5 * s, 8.5 * s, 0, steel);
      const pe = part(m.pilot, 'box', d.eye, 0.4 * s, 0.8 * s, 2 * s, 2.4 * s, 8.8 * s, 0, { e: d.eye, ei: 2 }); pe.userData.noFlash = true;
      m.guns = joint(m.body, 6 * s, -7 * s, 0);
      for (const z of [4, -4]) part(m.guns, 'cylX', '#151515', 1 * s, 16 * s, 1 * s, 0, 0, z * s, steel);
      const ey = part(m.body, 'box', d.eye, 1, 1.4 * s, 6 * s, 16.5 * s, 1 * s, 0, { e: d.eye, ei: 2 }); ey.userData.noFlash = true;
    }
    m.legs = [];
    const nL = boss ? 4 : 2;
    for (let i = 0; i < nL; i++) {
      const L = {};
      const lx = boss ? (i < 2 ? 25 : -25) * s : 0, lz = boss ? (i % 2 ? 28 : -28) * s : (i ? 11 : -11) * s;
      L.hip = joint(m.body, lx, boss ? -6 * s : -2 * s, lz);
      part(L.hip, 'sphLo', '#25231f', (boss ? 7 : 3) * s, (boss ? 7 : 3) * s, (boss ? 7 : 3) * s, 0, 0, 0, steel);
      const th = (boss ? 55 : 19) * s, sh = (boss ? 62 : 22) * s;
      L.th = joint(L.hip, 0, 0, 0);
      part(L.th, 'boxDown', dark, (boss ? 9 : 3.4) * s, th, (boss ? 9 : 3.4) * s, 0, 0, 0, steel);
      L.kn = joint(L.th, 0, -th, 0);
      part(L.kn, 'sphLo', '#25231f', (boss ? 6 : 2.6) * s, (boss ? 6 : 2.6) * s, (boss ? 6 : 2.6) * s, 0, 0, 0, steel);
      part(L.kn, 'boxDown', col, (boss ? 7 : 2.8) * s, sh, (boss ? 7 : 2.8) * s, 0, 0, 0, steel);
      part(L.kn, 'box', '#1a1916', (boss ? 18 : 7) * s, (boss ? 4 : 2) * s, (boss ? 14 : 5) * s, 0, -sh, 0, steel);
      L.th0 = boss ? (i % 2 ? 0.6 : -0.6) : (i ? 0.25 : -0.25); L.i = i; L.thL = th; L.shL = sh;
      m.legs.push(L);
    }
    m.phase = Math.random() * 6; m.H = H * s;
    m.update = (e, dt, t) => {
      const sp = Math.hypot(e.vx, e.vy), amp = Math.min(1, sp / 30);
      m.phase += sp * dt * (boss ? 0.035 : 0.075);
      if (m.dead > 0) { m.dead += dt; const k = Math.min(1, m.dead / 1.2); m.body.position.y = m.H * (1 - k * 0.75); m.body.rotation.x = k * 0.5; m.body.rotation.z = -k * 0.3; for (const L of m.legs) { L.th.rotation.x = L.th0 * (1 + k * 2); L.kn.rotation.z = k * 1.2; } if (m.dead > 6) root.position.y -= dt * 8; return; }
      for (const L of m.legs) {
        const g = m.phase + (boss ? [0, Math.PI, Math.PI, 0][L.i] : L.i * Math.PI);
        L.th.rotation.x = L.th0;
        L.th.rotation.z = 0.5 + Math.sin(g) * 0.35 * amp;
        L.kn.rotation.z = -1.0 - Math.max(0, Math.cos(g)) * 0.5 * amp;
      }
      m.body.position.y = m.H - Math.abs(Math.sin(m.phase)) * 1.5 * s * amp + (boss ? 0 : 0);
      m.body.rotation.x = Math.sin(m.phase) * 0.04 * amp;
      if (m.turret) { m.turret.rotation.y = 0; m.barrel.position.x = 10 * s - (e.aimT > 0 ? 0 : (m.recoil || 0) * 6 * s); m.recoil = Math.max(0, (m.recoil || 0) - dt * 3); if (m.hatch) m.hatch.material.emissiveIntensity = 0.8 + Math.sin(t * 4) * 0.5; }
      if (m.pilot) m.pilot.rotation.y = Math.sin(t * 0.9) * 0.3;
    };
    return finish(m);
  };

  MD.tank = function (d) {
    const s = d.r / 34, root = new T.Group(), m = { root, kind: 'tank' };
    const col = d.col, dark = shade(col, -0.15), steel = { r: 0.55, m: 0.55 };
    m.hull = joint(root, 0, 0, 0);
    part(m.hull, 'box', col, 64 * s, 16 * s, 40 * s, 0, 16 * s, 0, steel);
    const glacis = part(m.hull, 'box', dark, 18 * s, 12 * s, 38 * s, 30 * s, 17 * s, 0, steel); glacis.rotation.z = -0.55;
    m.treads = [];
    for (const side of [1, -1]) {
      part(m.hull, 'box', '#1e1d1a', 70 * s, 14 * s, 11 * s, 0, 8 * s, 24 * s * side, { r: 0.9 });
      for (let i = 0; i < 6; i++) { const w = part(m.hull, 'cylXc', '#2c2b27', 5.5 * s, 3 * s, 5.5 * s, -27 * s + i * 11 * s, 7 * s, 30 * s * side, steel); w.rotation.y = Math.PI / 2; m.treads.push(w); }
      part(m.hull, 'box', dark, 72 * s, 2 * s, 13 * s, 0, 15.5 * s, 24 * s * side, steel); // skirt
    }
    m.vent = part(m.hull, 'box', '#ff7a2a', 1.5 * s, 8 * s, 22 * s, -32.5 * s, 16 * s, 0, { e: '#ff5a10', ei: 1.3 }); m.vent.userData.noFlash = true;
    m.turret = joint(root, 0, 24 * s, 0);
    part(m.turret, 'cyl', dark, 15 * s, 10 * s, 15 * s, -2 * s, 5 * s, 0, steel);
    part(m.turret, 'box', col, 24 * s, 9 * s, 22 * s, 2 * s, 5 * s, 0, steel);
    m.barrel = joint(m.turret, 12 * s, 6 * s, 0);
    part(m.barrel, 'cylX', '#1a1a1a', 2.6 * s, 42 * s, 2.6 * s, 0, 0, 0, steel);
    part(m.barrel, 'cylX', '#222', 3.6 * s, 6 * s, 3.6 * s, 38 * s, 0, 0, steel);
    const ey = part(m.turret, 'box', d.eye, 1, 2 * s, 4 * s, 14.2 * s, 9 * s, 6 * s, { e: d.eye, ei: 2 }); ey.userData.noFlash = true;
    m.hullAng = null;
    m.update = (e, dt, t) => {
      if (m.dead > 0) { m.dead += dt; m.turret.position.y = 24 * s + Math.min(1, m.dead * 2) * 14 * s; m.turret.rotation.z = Math.min(1, m.dead) * 0.6; m.vent.material = mat('#2a1a0a'); if (m.dead > 6) root.position.y -= dt * 6; return; }
      const sp = Math.hypot(e.vx, e.vy);
      const move = sp > 4 ? Math.atan2(e.vy, e.vx) : (m.hullAng ?? e.ang);
      if (m.hullAng == null) m.hullAng = move;
      m.hullAng += DF.U.angDiff(m.hullAng, move) * Math.min(1, dt * 1.5);
      // root faces the turret direction; hull counter-rotates
      m.hull.rotation.y = -(m.hullAng - e.ang);
      for (const w of m.treads) w.rotation.x -= sp * dt * 0.2;
      m.barrel.position.x = 12 * s - (m.recoil || 0) * 8 * s; m.recoil = Math.max(0, (m.recoil || 0) - dt * 2);
      m.vent.material.emissiveIntensity = 1 + Math.sin(t * 5) * 0.4;
    };
    return finish(m);
  };

  MD.gunship = function (d) {
    const s = d.r / 26, root = new T.Group(), m = { root, kind: 'gunship', hover: 80 };
    const col = d.col, steel = { r: 0.45, m: 0.7 };
    m.body = joint(root, 0, 80, 0);
    part(m.body, 'box', col, 40 * s, 10 * s, 16 * s, 0, 0, 0, steel);
    const nose = part(m.body, 'box', shade(col, -0.1), 14 * s, 8 * s, 12 * s, 22 * s, -1 * s, 0, steel); nose.rotation.z = -0.3;
    const ey = part(m.body, 'box', d.eye, 1, 2 * s, 8 * s, 29 * s, 0, 0, { e: d.eye, ei: 2 }); ey.userData.noFlash = true;
    part(m.body, 'box', '#1a1a1a', 10 * s, 5 * s, 6 * s, 8 * s, -7 * s, 0, steel);
    for (const z of [2, -2]) part(m.body, 'cylX', '#111', 0.8 * s, 12 * s, 0.8 * s, 12 * s, -8 * s, z * s, steel);
    m.nac = [];
    for (const side of [1, -1]) {
      part(m.body, 'box', shade(col, -0.2), 6 * s, 2 * s, 14 * s, -4 * s, 2 * s, 12 * s * side, steel);
      const n = joint(m.body, -4 * s, 2 * s, 21 * s * side);
      part(n, 'cyl', '#2a2c30', 5 * s, 14 * s, 5 * s, 0, 0, 0, steel);
      const g = part(n, 'cyl', '#ff8a4a', 4 * s, 1, 4 * s, 0, -7.2 * s, 0, { add: true, o: 0.9 }); g.userData.noFlash = true; g.castShadow = false;
      m.nac.push(n);
    }
    m.update = (e, dt, t) => {
      if (m.dead > 0) { m.dead += dt; m.body.position.y = Math.max(8, m.body.position.y - dt * 70); m.body.rotation.z += dt * 1.5; m.body.rotation.x += dt * 2; if (m.dead > 6) root.position.y -= dt * 6; return; }
      m.body.position.y = 80 + Math.sin(t * 1.7 + e.id) * 4;
      const sp = Math.hypot(e.vx, e.vy);
      m.body.rotation.z = -Math.min(0.3, sp / 400);
      for (const n of m.nac) n.rotation.z = -0.4 * Math.min(1, sp / 100);
    };
    return finish(m);
  };

  // ---------------------------------------------------------------- Veil
  MD.thrall = function (d) {
    const s = d.r / 9, root = new T.Group(), m = { root, kind: 'thrall' };
    const skin = d.col, rag = '#4a4650';
    m.hip = joint(root, 0, 15 * s, 0);
    part(m.hip, 'box', rag, 4 * s, 4 * s, 7 * s, 0, 0, 0, { r: 0.95 });
    m.legs = [];
    for (const side of [1, -1]) { const L = {}; L.hip = joint(m.hip, 0, -1 * s, 2.2 * s * side); part(L.hip, 'limbT', skin, 1.3 * s, 8 * s, 1.3 * s); L.knee = joint(L.hip, 0, -8 * s, 0); part(L.knee, 'limbT', skin, 1.1 * s, 7 * s, 1.1 * s); m.legs.push(L); }
    m.torso = joint(m.hip, 0, 1 * s, 0); m.torso.rotation.z = -0.45;
    part(m.torso, 'box', skin, 4.5 * s, 10 * s, 8 * s, 0, 5 * s, 0, { r: 0.85 });
    part(m.torso, 'box', rag, 4.8 * s, 6 * s, 8.4 * s, 0, 3 * s, 0, { r: 0.95 });
    for (let i = 0; i < 3; i++) part(m.torso, 'box', shade(skin, -0.15), 0.6 * s, 0.6 * s, 7 * s, 2.3 * s, 6 * s + i * 1.5 * s, 0);
    m.head = joint(m.torso, 0.5 * s, 11 * s, 0);
    part(m.head, 'sph', '#a8a2b0', 3 * s, 3.4 * s, 2.8 * s, 0.6 * s, 1.5 * s, 0, { r: 0.7 });
    for (const z of [1, -1]) glow(m.head, '#c9b8ff', 0.6 * s, 3.2 * s, 2 * s, 1 * s * z, 0.95);
    m.arms = [];
    for (const side of [1, -1]) { const A = {}; A.sh = joint(m.torso, 0, 9 * s, 4.5 * s * side); part(A.sh, 'limbT', skin, 1.1 * s, 7.5 * s, 1.1 * s); A.el = joint(A.sh, 0, -7.5 * s, 0); part(A.el, 'limbT', skin, 1 * s, 7 * s, 1 * s); m.arms.push(A); }
    m.phase = Math.random() * 6;
    m.update = (e, dt, t) => {
      const sp = Math.hypot(e.vx, e.vy), amp = Math.min(1, sp / 60);
      m.phase += sp * dt * 0.1;
      if (m.dead > 0) { m.dead += dt; const k = Math.min(1, m.dead / 0.5); root.rotation.z = -k * Math.PI / 2; root.position.y = (m.h || 0) + 2; if (m.dead > 4) root.position.y -= dt * 4; return; }
      const ph = m.phase;
      for (let i = 0; i < 2; i++) { const L = m.legs[i], o2 = i ? Math.PI : 0; L.hip.rotation.z = Math.sin(ph + o2) * 0.7 * amp; L.knee.rotation.z = -Math.max(0, Math.sin(ph + o2 + 1)) * 1.2 * amp; }
      m.hip.position.y = 15 * s - Math.abs(Math.sin(ph)) * 1.2 * s;
      const reach = e.state === 'hunt' ? 1 : 0.3;
      for (let i = 0; i < 2; i++) { const A = m.arms[i]; A.sh.rotation.z = 1.2 * reach + Math.sin(ph * 1.3 + i * 2) * 0.3 + (e.atkAnim > 0 ? 0.6 : 0); A.sh.rotation.x = (i ? -1 : 1) * 0.2; A.el.rotation.z = 0.3; }
      if (e.atkAnim) e.atkAnim = Math.max(0, e.atkAnim - dt);
      m.head.rotation.x = Math.sin(t * 7 + e.id) > 0.92 ? 0.5 : 0; m.head.rotation.y = Math.sin(t * 2.3 + e.id) * 0.3;
      m.torso.rotation.x = Math.sin(ph * 0.5) * 0.15;
    };
    return finish(m);
  };

  MD.veil = function (d) {
    const s = d.r / 12, root = new T.Group(), m = { root, kind: 'veil' };
    const col = d.col, plate = shade(col, -0.15), gl = d.glow, steel = { r: 0.3, m: 0.7 };
    m.float = d.flying ? 34 : 6;
    m.body = joint(root, 0, m.float + 14 * s, 0);
    // robe made of hanging strips that sway
    m.strips = [];
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU, j = joint(m.body, Math.cos(a) * 4.6 * s, -2 * s, Math.sin(a) * 4.6 * s);
      j.rotation.y = -a;
      part(j, 'boxDown', i % 2 ? shade(col, -0.25) : shade(col, -0.32), 1.2 * s, 15 * s, 3.4 * s, 0, 0, 0, { r: 0.8, ds: true });
      j.userData.a = a; m.strips.push(j);
    }
    part(m.body, 'cyl', shade(col, -0.3), 4.5 * s, 4 * s, 4.5 * s, 0, 0, 0, { r: 0.7 });
    part(m.body, 'box', plate, 6 * s, 10 * s, 9 * s, 0, 6 * s, 0, steel);
    part(m.body, 'box', col, 2 * s, 8 * s, 6 * s, 2.6 * s, 6.5 * s, 0, steel);
    for (const side of [1, -1]) { const f = part(m.body, 'box', plate, 5 * s, 2 * s, 7 * s, -0.5 * s, 11 * s, 6 * s * side, steel); f.rotation.x = 0.4 * side; }
    m.head = joint(m.body, 0.5 * s, 13 * s, 0);
    part(m.head, 'box', plate, 4 * s, 7 * s, 3.6 * s, 0, 2.5 * s, 0, steel);
    const crest = part(m.head, 'box', col, 1.4 * s, 6 * s, 1.4 * s, -1.2 * s, 7 * s, 0, steel); crest.rotation.z = 0.5;
    m.orb = glow(m.head, gl, 1.6 * s, 2.3 * s, 3 * s, 0, 0.95);
    part(m.head, 'sphLo', '#ffffff', 0.8 * s, 0.8 * s, 0.8 * s, 2.4 * s, 3 * s, 0, { e: '#ffffff', ei: 2 }).userData.noFlash = true;
    m.arm = joint(m.body, 0.5 * s, 9 * s, -6 * s);
    part(m.arm, 'boxDown', plate, 2 * s, 7 * s, 2 * s, 0, 0, 0, steel);
    if (d.staff) { m.staff = joint(m.arm, 0, -7 * s, 0); part(m.staff, 'cyl', '#d8ccff', 0.4 * s, 26 * s, 0.4 * s, 0, 0, 0, { m: 0.8, r: 0.2 }); m.staffOrb = glow(m.staff, gl, 1.8 * s, 0, 13 * s, 0, 0.9); }
    else if (d.atk !== 'melee') { part(m.arm, 'cylX', '#2a2050', 1.4 * s, 9 * s, 1.4 * s, 0, -7 * s, 0, steel); m.armGlow = glow(m.arm, gl, 1 * s, 9 * s, -7 * s, 0, 0.8); }
    if (d.flying) { m.jets = []; for (const side of [1, -1]) { part(m.body, 'cyl', '#2a2050', 1.6 * s, 5 * s, 1.6 * s, -4 * s, 6 * s, 3 * s * side, steel); m.jets.push(glow(m.body, gl, 1.4 * s, -4 * s, 3 * s, 3 * s * side, 0.8)); } }
    m.update = (e, dt, t) => {
      if (m.dead > 0) { m.dead += dt; const k = Math.min(1, m.dead / 1); m.body.position.y = Math.max(2, m.body.position.y - dt * (d.flying ? 60 : 10)); m.body.rotation.z = -k * 1.4; for (const st of m.strips) st.rotation.z = k * 0.8; if (m.orb) m.orb.visible = false; if (m.dead > 4) root.position.y -= dt * 4; return; }
      const sp = Math.hypot(e.vx, e.vy);
      m.body.position.y = m.float + 14 * s + Math.sin(t * 1.8 + e.id) * 1.5 * s;
      m.body.rotation.z = -Math.min(0.35, sp / 400);
      for (const st of m.strips) { st.rotation.z = Math.sin(t * 3 + st.userData.a * 2) * 0.12 + Math.min(0.5, sp / 220) * Math.cos(st.userData.a); st.rotation.x = Math.sin(t * 2.4 + st.userData.a * 3) * 0.08; }
      const hunt = e.state === 'hunt';
      m.arm.rotation.z = hunt ? 1.3 : 0.15 + Math.sin(t) * 0.1;
      if (m.staff) m.staff.rotation.z = hunt ? -1.0 : 0.1;
      const pulse = 0.8 + Math.sin(t * 5 + e.id) * 0.2;
      m.orb.scale.setScalar(1.6 * s * pulse);
      if (m.jets) for (const j of m.jets) j.scale.setScalar(1.4 * s * (0.8 + Math.random() * 0.5));
    };
    return finish(m);
  };

  MD.eye = function (d) {
    const s = d.r / 11, root = new T.Group(), m = { root, kind: 'eye' };
    m.body = joint(root, 0, 56, 0);
    part(m.body, 'sph', d.col, 9 * s, 9 * s, 9 * s, 0, 0, 0, { r: 0.25, m: 0.75 });
    m.r1 = joint(m.body, 0, 0, 0); part(m.r1, 'torus', shade(d.col, 0.2), 13 * s, 13 * s, 13 * s, 0, 0, 0, { m: 0.8, r: 0.3 });
    m.r2 = joint(m.body, 0, 0, 0); part(m.r2, 'torus', shade(d.col, 0.1), 15.5 * s, 15.5 * s, 15.5 * s, 0, 0, 0, { m: 0.8, r: 0.3 }).rotation.x = Math.PI / 2;
    m.lens = glow(m.body, d.glow, 4 * s, 7.5 * s, 0, 0, 0.95);
    part(m.body, 'sphLo', '#ffffff', 2 * s, 2 * s, 2 * s, 8.4 * s, 0, 0, { e: '#ffffff', ei: 2 }).userData.noFlash = true;
    for (const z of [1, -1]) { const f = part(m.body, 'box', shade(d.col, -0.2), 8 * s, 0.6 * s, 4 * s, -6 * s, 0, 8 * s * z, { m: 0.7 }); f.rotation.x = 0.3 * z; }
    m.update = (e, dt, t) => {
      if (m.dead > 0) { m.dead += dt; m.body.position.y = Math.max(5, m.body.position.y - dt * 90); m.lens.visible = false; if (m.dead > 3) root.position.y -= dt * 5; return; }
      m.body.position.y = 56 + Math.sin(t * 1.4 + e.id) * 4;
      m.r1.rotation.x += dt * 1.6; m.r1.rotation.y += dt * 0.7; m.r2.rotation.z += dt * 1.1;
      const c = Math.max(0, e.callT || 0) / 3.2;
      m.lens.scale.setScalar(4 * s * (1 + c * 0.8 + Math.sin(t * 8) * 0.06 * (1 + c * 4)));
    };
    return finish(m);
  };

  MD.mass = function (d) {
    const s = d.r / 30, root = new T.Group(), m = { root, kind: 'mass' };
    m.body = joint(root, 0, 22 * s, 0);
    m.blobs = [];
    const flesh = { r: 0.55, m: 0.05, e: '#2a1a2a', ei: 0.5 };
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * TAU, rr = i < 3 ? 0 : 14 * s, y = (i % 3 - 1) * 8 * s;
      const sz = (i < 3 ? 17 : 11 + (i % 4) * 2) * s;
      const b = part(m.body, 'sph', i % 2 ? d.col : shade(d.col, -0.12), sz, sz * 0.9, sz, Math.cos(a) * rr, y, Math.sin(a) * rr, flesh);
      b.userData.base = sz; b.userData.k = i; m.blobs.push(b);
    }
    for (let i = 0; i < 6; i++) glow(m.body, '#b39cff', 2.2 * s, Math.cos(i * 1.7) * 16 * s, Math.sin(i * 2.3) * 9 * s, Math.sin(i * 1.7) * 16 * s, 0.85);
    m.arms = [];
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4, j = joint(m.body, Math.cos(a) * 18 * s, 6 * s, Math.sin(a) * 18 * s); part(j, 'limbT', shade(d.col, 0.1), 3 * s, 22 * s, 3 * s, 0, 0, 0, flesh); j.userData.a = a; m.arms.push(j); }
    m.update = (e, dt, t) => {
      if (m.dead > 0) { m.dead += dt; const k = Math.min(1, m.dead / 1.2); m.body.scale.set(1 + k * 0.3, 1 - k * 0.7, 1 + k * 0.3); m.body.position.y = 22 * s * (1 - k * 0.8); if (m.dead > 4) root.position.y -= dt * 5; return; }
      for (const b of m.blobs) { const p = 1 + Math.sin(t * 3 + b.userData.k * 1.7) * 0.07; b.scale.set(b.userData.base * p, b.userData.base * 0.9 / p, b.userData.base * p); }
      const sp = Math.hypot(e.vx, e.vy);
      for (const j of m.arms) { j.rotation.x = Math.sin(t * 2.2 + j.userData.a * 3) * 0.6; j.rotation.z = 1.2 + Math.cos(t * 1.8 + j.userData.a) * 0.4 + (e.atkAnim > 0 ? 0.8 : 0); }
      if (e.atkAnim) e.atkAnim = Math.max(0, e.atkAnim - dt);
      m.body.rotation.y = Math.sin(t * 0.6) * 0.2; m.body.position.y = 22 * s + Math.abs(Math.sin(t * 4 * Math.min(1, sp / 30))) * 3 * s;
    };
    return finish(m);
  };

  MD.glider = function (d) {
    const s = d.r / 26, root = new T.Group(), m = { root, kind: 'glider' };
    m.body = joint(root, 0, 70, 0);
    part(m.body, 'sph', d.col, 22 * s, 5 * s, 12 * s, 0, 0, 0, { r: 0.3, m: 0.6 });
    part(m.body, 'sph', shade(d.col, 0.12), 10 * s, 4 * s, 7 * s, 8 * s, 2 * s, 0, { r: 0.3, m: 0.6 });
    m.core = glow(m.body, d.glow, 4 * s, 10 * s, -1 * s, 0, 0.9);
    m.wings = [];
    for (const side of [1, -1]) {
      const w = joint(m.body, 0, 0, 9 * s * side);
      const shape = new T.Shape(); shape.moveTo(14, 0); shape.quadraticCurveTo(4, 30, -16, 34); shape.lineTo(-8, 0); shape.closePath();
      const g = new T.ShapeGeometry(shape); g.rotateX(side > 0 ? Math.PI / 2 : -Math.PI / 2); g.scale(s, s, s);
      const mm = new T.Mesh(g, mat(shade(d.col, -0.1), { ds: true, r: 0.4, m: 0.5 })); mm.castShadow = true; w.add(mm);
      m.wings.push(w);
    }
    m.tail = []; let j = joint(m.body, -20 * s, 0, 0);
    for (let i = 0; i < 5; i++) { part(j, 'cylX', shade(d.col, -0.2), (1.6 - i * 0.25) * s, -9 * s, (1.6 - i * 0.25) * s, 0, 0, 0); m.tail.push(j); j = joint(j, -9 * s, 0, 0); }
    m.update = (e, dt, t) => {
      if (m.dead > 0) { m.dead += dt; m.body.position.y = Math.max(5, m.body.position.y - dt * 90); m.body.rotation.x += dt * 3; m.core.visible = false; if (m.dead > 5) root.position.y -= dt * 5; return; }
      const f = Math.sin(t * 3 + e.id) * 0.35;
      m.wings[0].rotation.x = f; m.wings[1].rotation.x = -f;
      m.tail.forEach((q, i) => { q.rotation.y = Math.sin(t * 4 - i) * 0.25; });
      m.body.position.y = 70 + Math.sin(t * 1.2) * 6;
      m.body.rotation.x = Math.sin(t * 1.3) * 0.15;
    };
    return finish(m);
  };

  MD.tripod = function (d) {
    const s = d.r / 40, root = new T.Group(), m = { root, kind: 'tripod' };
    const col = d.col, steel = { r: 0.3, m: 0.75 };
    const H = 105 * s;
    m.body = joint(root, 0, H, 0);
    part(m.body, 'hexc', col, 26 * s, 12 * s, 26 * s, 0, 0, 0, steel);
    part(m.body, 'hexc', shade(col, -0.15), 18 * s, 8 * s, 18 * s, 0, 9 * s, 0, steel);
    part(m.body, 'sph', shade(col, 0.1), 12 * s, 7 * s, 12 * s, 0, 13 * s, 0, steel);
    m.core = glow(m.body, d.glow, 7 * s, 22 * s, -4 * s, 0, 0.95);
    part(m.body, 'sphLo', '#ffffff', 3.5 * s, 3.5 * s, 3.5 * s, 23 * s, -4 * s, 0, { e: '#ffffff', ei: 3 }).userData.noFlash = true;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const fin = part(m.body, 'box', shade(col, -0.25), 10 * s, 3 * s, 2 * s, Math.cos(a) * 26 * s, -2 * s, Math.sin(a) * 26 * s, steel); fin.rotation.y = -a; }
    m.legs = [];
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU + Math.PI / 3, L = {};
      L.a = a; L.yaw = joint(m.body, Math.cos(a) * 20 * s, -4 * s, Math.sin(a) * 20 * s); L.yaw.rotation.y = -a;
      L.th = joint(L.yaw, 0, 0, 0);
      part(L.th, 'boxDown', shade(col, -0.2), 5 * s, 55 * s, 5 * s, 0, 0, 0, steel);
      L.kn = joint(L.th, 0, -55 * s, 0);
      part(L.kn, 'sphLo', '#1a1438', 5 * s, 5 * s, 5 * s, 0, 0, 0, steel);
      part(L.kn, 'limbT', '#2a2350', 3 * s, 80 * s, 3 * s, 0, 0, 0, steel);
      part(L.kn, 'cone', '#1a1438', 5 * s, 8 * s, 5 * s, 0, -80 * s, 0, steel).rotation.x = Math.PI;
      L.i = i; m.legs.push(L);
    }
    m.phase = 0;
    m.update = (e, dt, t) => {
      const sp = Math.hypot(e.vx, e.vy), amp = Math.min(1, sp / 30);
      m.phase += sp * dt * 0.03;
      if (m.dead > 0) { m.dead += dt; const k = Math.min(1, m.dead / 1.8); m.body.position.y = H * (1 - k * 0.85); m.body.rotation.z = k * 0.5; for (const L of m.legs) { L.th.rotation.z = 1.2 + k * 0.6; L.kn.rotation.z = -1.4 + k * 1.2; } m.core.visible = false; if (m.dead > 6) root.position.y -= dt * 8; return; }
      for (const L of m.legs) {
        const g = m.phase + L.i * TAU / 3;
        L.th.rotation.z = 1.25 + Math.max(0, Math.sin(g)) * 0.25 * amp;
        L.kn.rotation.z = -1.55 - Math.max(0, Math.sin(g)) * 0.2 * amp;
      }
      m.body.position.y = H + Math.sin(m.phase * 3) * 2 * s * amp + Math.sin(t) * 1.5 * s;
      const charge = e.beamT > 1.6;
      m.core.scale.setScalar(7 * s * (charge ? 1.6 + Math.random() * 0.4 : 1 + Math.sin(t * 3) * 0.08));
    };
    return finish(m);
  };

  // ---------------------------------------------------------------- dispatch
  MD.enemy = function (type) {
    const d = DF.ENEMIES[type];
    switch (d.draw) {
      case 'bug': return MD.bug(d);
      case 'flyer': return MD.flyer(d);
      case 'bot': return MD.bot(d);
      case 'walker': return MD.walker(d);
      case 'tank': return MD.tank(d);
      case 'gunship': return MD.gunship(d);
      case 'thrall': return MD.thrall(d);
      case 'veil': return MD.veil(d);
      case 'eye': return MD.eye(d);
      case 'mass': return MD.mass(d);
      case 'glider': return MD.glider(d);
      case 'tripod': return MD.tripod(d);
    }
    return MD.bug(d);
  };

  // ---------------------------------------------------------------- vehicles
  MD.vehicle = function (vt) {
    const d = DF.VEHICLES[vt], root = new T.Group(), m = { root, kind: 'vehicle', vt };
    const steel = { r: 0.5, m: 0.6 }, col = d.col, dark = shade(col, -0.18);
    if (vt === 'buggy') {
      m.chassis = joint(root, 0, 10, 0);
      part(m.chassis, 'box', col, 50, 6, 26, 0, 0, 0, steel);
      part(m.chassis, 'box', dark, 16, 6, 24, 20, 3, 0, steel).rotation.z = -0.25;
      part(m.chassis, 'box', '#2a2a2a', 20, 4, 22, -6, 4, 0);
      for (const z of [-6, 6]) part(m.chassis, 'box', '#3a3020', 6, 6, 8, -2, 7, z); // seats
      // roll cage
      for (const [x1, z1] of [[10, 12], [10, -12], [-16, 12], [-16, -12]]) part(m.chassis, 'cyl', '#1e1e1e', 0.8, 18, 0.8, x1, 12, z1, steel);
      part(m.chassis, 'box', '#1e1e1e', 28, 1.4, 1.4, -3, 21, 12, steel); part(m.chassis, 'box', '#1e1e1e', 28, 1.4, 1.4, -3, 21, -12, steel);
      part(m.chassis, 'box', '#1e1e1e', 1.4, 1.4, 25, 10, 21, 0, steel); part(m.chassis, 'box', '#1e1e1e', 1.4, 1.4, 25, -16, 21, 0, steel);
      part(m.chassis, 'box', '#283c48', 1, 8, 20, 12, 10, 0, { r: 0.1, m: 0.6, o: 0.6 });
      m.wheels = [];
      for (const [x, z] of [[17, 15], [17, -15], [-17, 15], [-17, -15]]) {
        const w = joint(root, x, 8, z);
        const tire = part(w, 'cyl', '#1a1a1a', 8, 5, 8, 0, 0, 0, { r: 0.95 }); tire.rotation.x = Math.PI / 2;
        const hub = part(w, 'cyl', '#6a6a60', 4, 5.4, 4, 0, 0, 0, steel); hub.rotation.x = Math.PI / 2;
        w.userData.front = x > 0; m.wheels.push(w);
      }
      m.turret = joint(root, -12, 26, 0);
      part(m.turret, 'cyl', '#2a2a26', 4, 4, 4, 0, 0, 0, steel);
      part(m.turret, 'box', '#3a3a36', 12, 5, 6, 3, 3, 0, steel);
      part(m.turret, 'cylX', '#141414', 1, 18, 1, 8, 3.5, 0, steel);
      part(m.turret, 'box', '#3a3a36', 1, 6, 8, -1, 5, 0, steel); // gun shield
      m.riders = joint(m.chassis, -2, 10, 0);
    } else {
      m.hip = joint(root, 0, 34, 0);
      part(m.hip, 'box', '#2a2c28', 12, 8, 18, 0, 0, 0, steel);
      m.legs = [];
      for (const side of [1, -1]) {
        const L = {}; L.h = joint(m.hip, 0, -2, 10 * side);
        part(L.h, 'boxDown', dark, 7, 18, 7, 0, 0, 0, steel);
        L.k = joint(L.h, 0, -16, 0);
        part(L.k, 'sphLo', '#222', 4.5, 4.5, 4.5, 0, 0, 0, steel);
        part(L.k, 'boxDown', col, 7.5, 16, 7.5, 0, 0, 0, steel);
        part(L.k, 'box', '#1a1a18', 16, 4, 11, 2, -16, 0, steel);
        m.legs.push(L);
      }
      m.torso = joint(m.hip, 0, 6, 0);
      part(m.torso, 'box', col, 22, 22, 28, 0, 11, 0, steel);
      part(m.torso, 'box', dark, 8, 14, 22, 9, 13, 0, steel);
      part(m.torso, 'box', '#2c4a5a', 3, 8, 14, 13, 16, 0, { r: 0.1, m: 0.7, e: '#0a2030', ei: 1 }); // canopy
      part(m.torso, 'box', dark, 14, 6, 30, -2, 24, 0, steel);
      for (let i = 0; i < 3; i++) part(m.torso, 'box', '#d8a33a', 1, 1.5, 6, 11.2, 4 + i * 2.2, -9, steel);
      m.armsV = [];
      for (const side of [1, -1]) {
        const A = joint(m.torso, 2, 16, 17 * side);
        part(A, 'box', dark, 12, 10, 8, 0, 0, 0, steel);
        if (vt === 'exo2' || side === -1) {
          if (vt === 'exo2') { part(A, 'cylX', '#1a1a1a', 2.6, 30, 2.6, 4, 0, 0, steel); part(A, 'box', '#2a2a28', 10, 8, 7, 6, -1, 0, steel); }
          else { for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; part(A, 'cylX', '#151515', 0.9, 22, 0.9, 5, Math.cos(a) * 2.2, Math.sin(a) * 2.2, steel); } part(A, 'cylXc', '#2a2a28', 3.4, 4, 3.4, 6, 0, 0, steel); }
        } else { part(A, 'box', '#3a3c38', 14, 12, 10, 6, 0, 0, steel); for (let k = 0; k < 6; k++) part(A, 'cylXc', '#111', 1.4, 1.5, 1.4, 13.2, (k % 3 - 1) * 3.4, (Math.floor(k / 3) - 0.5) * 3.6); }
        A.userData.side = side; m.armsV.push(A);
      }
    }
    m.phase = 0;
    m.update = (v, dt, t) => {
      if (vt === 'buggy') {
        const sp = Math.hypot(v.vx, v.vy);
        const fwd = Math.cos(v.ang) * v.vx + Math.sin(v.ang) * v.vy;
        for (const w of m.wheels) { w.children.forEach(c => c.rotation.y -= fwd * dt * 0.12); }
        m.chassis.position.y = 10 + Math.sin(t * 25) * Math.min(0.8, sp / 300);
        m.chassis.rotation.x = Math.sin(t * 7) * Math.min(0.03, sp / 9000);
        m.turret.rotation.y = -(v.turret - v.ang);
        const n = v.passengers.length + (v.driver ? 1 : 0);
        if (m.riderN !== n) { m.riderN = n; while (m.riders.children.length) m.riders.remove(m.riders.children[0]); for (let i = 0; i < n; i++) { const h = part(m.riders, 'sph', '#6c7458', 3.6, 3.8, 3.6, i < 2 ? 0 : -10, 2, i % 2 ? -6 : 6, { m: 0.3 }); h.userData.mat = h.material; m.meshes.push(h); } }
        return;
      }
      const sp = Math.hypot(v.vx, v.vy), amp = Math.min(1, sp / 60);
      m.phase += sp * dt * 0.06;
      for (let i = 0; i < 2; i++) { const L = m.legs[i]; L.h.rotation.z = Math.sin(m.phase + i * Math.PI) * 0.45 * amp; L.k.rotation.z = -Math.max(0, Math.sin(m.phase + i * Math.PI + 1.2)) * 0.7 * amp; }
      m.hip.position.y = 34 - Math.abs(Math.cos(m.phase)) * 1.5 * amp;
      m.torso.rotation.y = -(v.aim - v.ang);
      m.recoil = [Math.max(0, ((m.recoil || [0, 0])[0]) - dt * 8), Math.max(0, ((m.recoil || [0, 0])[1]) - dt * 8)];
      m.armsV.forEach((A, i) => { A.position.x = 2 - m.recoil[i] * 3; });
    };
    return finish(m);
  };

  // ---------------------------------------------------------------- sentries
  MD.sentry = function (st) {
    const d = DF.SENTRIES[st], root = new T.Group(), m = { root, kind: 'sentry' };
    const steel = { r: 0.5, m: 0.6 };
    if (st === 'dome') {
      part(root, 'cyl', '#3a4a58', 6, 8, 6, 0, 4, 0, steel);
      m.dome = part(root, 'sph', '#76c6ff', d.r, d.r, d.r, 0, 0, 0, { add: true, o: 0.13, ds: true }); m.dome.userData.noFlash = true; m.dome.castShadow = false;
      m.ring = part(root, 'torus', '#9fd8ff', d.r, d.r, d.r, 0, 1, 0, { add: true, o: 0.5 }); m.ring.rotation.x = Math.PI / 2; m.ring.userData.noFlash = true;
      m.update = (s, dt, t) => { const k = Math.min(1, s.life / 2); m.dome.material.opacity = (0.1 + (s.flash > 0 ? 0.15 : 0)) * k; m.dome.scale.set(d.r, d.r * 0.85, d.r); m.ring.rotation.z = t; };
      return finish(m);
    }
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; const leg = part(root, 'box', '#2e302c', 2, 2, 18, Math.cos(a) * 7, 4, Math.sin(a) * 7, steel); leg.rotation.y = -a + Math.PI / 2; leg.rotation.x = 0.3; }
    part(root, 'cyl', '#3a3d38', 4, 10, 4, 0, 8, 0, steel);
    m.head = joint(root, 0, 16, 0);
    const col = d.col;
    if (st === 'tesla') {
      part(root, 'cyl', '#4a5a68', 2.5, 26, 2.5, 0, 22, 0, steel);
      for (let i = 0; i < 4; i++) part(root, 'torus', '#9ab8d0', 4, 4, 4, 0, 14 + i * 5, 0, { m: 0.8 }).rotation.x = Math.PI / 2;
      m.orb = glow(root, '#9fe8ff', 4, 0, 37, 0, 0.9);
    } else {
      part(m.head, 'box', col, 12, 8, 10, 0, 0, 0, steel);
      part(m.head, 'box', shade(col, -0.2), 4, 6, 12, -4, 0, 0, steel);
      if (st === 'mortar' || st === 'emsmortar') { m.barrel = joint(m.head, 4, 4, 0); m.barrel.rotation.z = 0.9; part(m.barrel, 'cylX', '#222', 3, 16, 3, 0, 0, 0, steel); if (st === 'emsmortar') glow(m.head, '#6fb6ff', 1.6, 0, 5, 0, 0.8); }
      else if (st === 'rocket') { for (const z of [-4, 4]) { part(m.head, 'box', '#2a2a28', 14, 6, 5, 3, 0, z, steel); for (const y of [-1.5, 1.5]) part(m.head, 'cylXc', '#111', 1.2, 1, 1.2, 10.2, y, z); } }
      else if (st === 'gatling') { m.barrel = joint(m.head, 6, 0, 0); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; part(m.barrel, 'cylX', '#151515', 0.7, 18, 0.7, 0, Math.cos(a) * 1.8, Math.sin(a) * 1.8, steel); } }
      else if (st === 'ac') { m.barrel = joint(m.head, 6, 0, 0); part(m.barrel, 'cylX', '#151515', 1.8, 26, 1.8, 0, 0, 0, steel); part(m.barrel, 'cylX', '#222', 2.6, 4, 2.6, 22, 0, 0, steel); }
      else if (st === 'flame') { m.barrel = joint(m.head, 6, 0, 0); part(m.barrel, 'cylX', '#2a2220', 1.8, 12, 1.8, 0, 0, 0, steel); m.pilot = glow(m.barrel, '#ff9a3a', 1.2, 13, 0, 0, 0.9); part(m.head, 'cyl', '#6a3a2a', 3, 10, 3, -6, 2, 5, steel); }
      else { m.barrel = joint(m.head, 6, 0, 0); part(m.barrel, 'cylX', '#151515', 1, 18, 1, 0, 0, 0, steel); part(m.head, 'box', '#2a2a28', 6, 6, 3, 0, -1, 6.5, steel); }
      const lamp = part(m.head, 'box', '#9fe07a', 0.6, 1, 2, 6.2, 2.5, 0, { e: '#5fd03a', ei: 2 }); lamp.userData.noFlash = true;
    }
    m.update = (s, dt, t) => {
      m.head.rotation.y = -s.ang;
      if (s.st === 'gatling' && m.barrel) m.barrel.rotation.x += dt * 40 * s.spin;
      if (m.orb) m.orb.scale.setScalar(4 + Math.random() * 1.5);
      if (m.barrel && s.st !== 'gatling' && s.st !== 'mortar' && s.st !== 'emsmortar') m.barrel.position.x = 6 - (m.recoil || 0) * 3;
      m.recoil = Math.max(0, (m.recoil || 0) - dt * 10);
    };
    return finish(m);
  };

  // ---------------------------------------------------------------- props, structures and items
  MD.pod = function (kind) {
    const root = new T.Group(), m = { root, kind: 'pod' }, steel = { r: 0.45, m: 0.6 };
    const s = kind === 'vehicle' ? 1.6 : 1;
    part(root, 'cyl', '#4a4e52', 9 * s, 26 * s, 9 * s, 0, 13 * s, 0, steel);
    part(root, 'cone', '#3a3e42', 9 * s, 12 * s, 9 * s, 0, 32 * s, 0, steel);
    part(root, 'cyl', '#d8a33a', 9.4 * s, 3 * s, 9.4 * s, 0, 18 * s, 0, steel);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; const f = part(root, 'box', '#2e3236', 1.5 * s, 12 * s, 6 * s, Math.cos(a) * 9 * s, 5 * s, Math.sin(a) * 9 * s, steel); f.rotation.y = -a; }
    m.flame = part(root, 'cone', '#ffb070', 7 * s, 40 * s, 7 * s, 0, -20 * s, 0, { add: true, o: 0.85 }); m.flame.rotation.x = Math.PI; m.flame.userData.noFlash = true; m.flame.castShadow = false;
    return finish(m);
  };

  MD.raptor = function () {
    const root = new T.Group(), m = { root }, steel = { r: 0.4, m: 0.7 };
    part(root, 'box', '#4c5258', 60, 8, 12, 0, 0, 0, steel);
    part(root, 'cone', '#4c5258', 6, 18, 6, 39, 0, 0, steel).rotation.z = -Math.PI / 2;
    part(root, 'box', '#2c4a5a', 12, 3, 7, 22, 5, 0, { r: 0.1, m: 0.8 });
    const w = part(root, 'box', '#3e444a', 22, 2, 90, -4, -1, 0, steel); w.rotation.y = 0;
    part(root, 'box', '#3e444a', 10, 14, 2, -26, 8, 0, steel);
    for (const z of [6, -6]) { part(root, 'cyl', '#2a2c2e', 4, 14, 4, -28, 0, z, steel).rotation.z = Math.PI / 2; glow(root, '#ffb070', 3.5, -36, 0, z, 0.9); }
    return finish(m);
  };

  MD.dropship = function (enemy) {
    const root = new T.Group(), m = { root }, steel = { r: 0.45, m: 0.6 };
    if (enemy) {
      part(root, 'box', '#3a3c40', 100, 20, 48, 0, 0, 0, steel);
      part(root, 'box', '#2a2b2e', 34, 14, 80, -20, 10, 0, steel);
      for (const z of [40, -40]) { part(root, 'cyl', '#2a2b2e', 10, 18, 10, -20, 0, z, steel); glow(root, '#ff7a3a', 8, -20, -10, z, 0.8); }
      const e = part(root, 'box', '#ff3b2f', 1, 4, 14, 50.5, 0, 0, { e: '#ff3b2f', ei: 2 }); e.userData.noFlash = true;
    } else {
      part(root, 'box', '#5a5f62', 120, 26, 54, 0, 0, 0, steel);
      part(root, 'cone', '#5a5f62', 26, 30, 26, 74, 0, 0, steel).rotation.z = -Math.PI / 2;
      part(root, 'box', '#2c4a5a', 18, 6, 28, 58, 10, 0, { r: 0.1, m: 0.8, e: '#0a2030' });
      part(root, 'box', '#44484b', 34, 10, 140, -24, 6, 0, steel);
      for (const z of [64, -64]) { part(root, 'cyl', '#3a3e40', 12, 24, 12, -24, 0, z, steel); glow(root, '#ffb070', 9, -24, -14, z, 0.8); }
      part(root, 'box', '#d8a33a', 120.5, 3, 54.5, 0, -6, 0, steel);
      for (const z of [18, -18]) for (const x of [36, -36]) part(root, 'box', '#2a2a2a', 3, 16, 3, x, -20, z, steel);
    }
    return finish(m);
  };

  MD.structure = function (st, faction, M) {
    const root = new T.Group(), m = { root, kind: 'struct' }, steel = { r: 0.5, m: 0.55 };
    switch (st.type) {
      case 'spawner':
        if (faction === 'brood') {
          part(root, 'cyl', '#4a3220', st.r + 12, 10, st.r + 12, 0, 2, 0, { r: 0.9 });
          part(root, 'cyl', '#0d0805', st.r, 11, st.r, 0, 3, 0, { r: 1 });
          m.glowRing = part(root, 'torus', '#a6d83a', st.r - 3, st.r - 3, st.r - 3, 0, 8, 0, { add: true, o: 0.6 }); m.glowRing.rotation.x = Math.PI / 2;
          for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const sp = part(root, 'cone', '#8a6a3a', 3, 18 + (i % 3) * 6, 3, Math.cos(a) * (st.r + 8), 8, Math.sin(a) * (st.r + 8), { r: 0.6 }); sp.rotation.z = Math.cos(a) * -0.4; sp.rotation.x = Math.sin(a) * 0.4; }
          for (let i = 0; i < 5; i++) { const a = i * 1.3; part(root, 'sph', '#c8b070', 5, 6, 5, Math.cos(a) * (st.r + 22), 4, Math.sin(a) * (st.r + 22), { r: 0.3, e: '#3a2a0a', ei: 0.5, o: 0.9 }); }
        } else if (faction === 'foundry') {
          part(root, 'box', '#4a4744', st.r * 2.4, 30, st.r * 2.4, 0, 15, 0, steel);
          part(root, 'box', '#33312f', st.r * 2.6, 4, st.r * 2.6, 0, 31, 0, steel);
          part(root, 'cyl', '#2a2826', 5, 36, 5, st.r * 0.6, 48, st.r * 0.6, steel);
          m.glowRing = part(root, 'box', '#ff5a20', 1, 14, st.r * 1.2, st.r * 1.2 + 0.6, 10, 0, { e: '#ff3a10', ei: 2 });
          for (let i = 0; i < 3; i++) part(root, 'box', '#1a1a1a', 1.5, 1.5, st.r * 1.3, st.r * 1.2 + 1, 4 + i * 5, 0);
        } else {
          for (let i = 0; i < 3; i++) { const sp = part(root, 'cone', '#3a2e6a', 4, 40 + i * 6, 4, Math.cos(i * 2.1) * st.r, 20, Math.sin(i * 2.1) * st.r, { m: 0.6, r: 0.3 }); sp.rotation.z = Math.cos(i * 2.1) * 0.3; }
          m.glowRing = part(root, 'torus', '#c9bfff', st.r, st.r, st.r, 0, 30, 0, { add: true, o: 0.8 });
          m.portal = part(root, 'sph', '#8f7dff', st.r * 0.85, st.r * 0.85, 2, 0, 30, 0, { add: true, o: 0.45 });
        }
        break;
      case 'terminal':
        part(root, 'box', '#2d3238', 14, 22, 18, 0, 11, 0, steel);
        m.screen = part(root, 'box', '#3a7ab8', 1, 9, 13, 7.2, 17, 0, { e: '#2a6ab8', ei: 1.4 });
        part(root, 'cyl', '#4a5058', 4, 70, 4, -20, 35, 0, steel);
        m.rocket = joint(root, -20, 70, 0); part(m.rocket, 'cyl', '#c8c4b8', 5, 30, 5, 0, 15, 0, steel); part(m.rocket, 'cone', '#d8a33a', 5, 10, 5, 0, 35, 0, steel);
        break;
      case 'radar':
        part(root, 'box', '#3a3f45', 20, 16, 20, 0, 8, 0, steel);
        part(root, 'cyl', '#5a5f65', 2.5, 30, 2.5, 0, 30, 0, steel);
        m.dish = joint(root, 0, 46, 0);
        { const g = new T.SphereGeometry(16, 16, 8, 0, TAU, 0, 0.9); const dm = new T.Mesh(g, mat('#9aa4ae', { ds: true, m: 0.7, r: 0.3 })); dm.rotation.z = Math.PI / 2; dm.castShadow = true; m.dish.add(dm); }
        break;
      case 'jammer':
        part(root, 'cyl', '#45403a', st.r, 12, st.r, 0, 6, 0, steel);
        part(root, 'cyl', '#2e2a26', 6, 80, 6, 0, 50, 0, steel);
        for (let i = 0; i < 4; i++) part(root, 'torus', '#5a554d', 12 - i * 2, 12 - i * 2, 12 - i * 2, 0, 30 + i * 16, 0, steel).rotation.x = Math.PI / 2;
        m.light = glow(root, '#ff4a3a', 5, 0, 92, 0, 0.9);
        m.pulse = part(root, 'torus', '#ff5a3a', 1, 1, 1, 0, 3, 0, { add: true, o: 0.6 }); m.pulse.rotation.x = Math.PI / 2;
        break;
      case 'aa':
        part(root, 'cyl', '#45403a', st.r, 14, st.r, 0, 7, 0, steel);
        m.head = joint(root, 0, 22, 0);
        part(m.head, 'box', '#5a554d', 22, 14, 22, 0, 0, 0, steel);
        m.barrels = joint(m.head, 4, 6, 0); m.barrels.rotation.z = 0.7;
        for (const z of [-5, 5]) part(m.barrels, 'cylX', '#2a2826', 2, 40, 2, 0, 0, z, steel);
        break;
      case 'artillery':
        part(root, 'cyl', '#45403a', st.r, 12, st.r, 0, 6, 0, steel);
        m.head = joint(root, 0, 20, 0); part(m.head, 'box', '#5a554d', 26, 16, 20, 0, 0, 0, steel);
        m.barrels = joint(m.head, 6, 6, 0); m.barrels.rotation.z = 0.8; part(m.barrels, 'cylX', '#2a2826', 4, 60, 4, 0, 0, 0, steel);
        break;
      case 'extract':
        part(root, 'cyl', '#3a3c3e', 46, 3, 46, 0, 1.5, 0, steel);
        part(root, 'torus', '#d8a33a', 38, 38, 38, 0, 3.2, 0, { e: '#5a3a0a', ei: 0.6 }).rotation.x = Math.PI / 2;
        m.lights = [];
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; m.lights.push(part(root, 'box', '#6a5a3a', 3, 2, 3, Math.cos(a) * 52, 2, Math.sin(a) * 52, { e: '#000000' })); }
        part(root, 'box', '#2d3238', 14, 22, 14, 70, 11, 0, steel);
        m.screen = part(root, 'box', '#3a7ab8', 1, 7, 10, 62.5, 16, 0, { e: '#2a6ab8', ei: 1.4 });
        break;
      case 'shelter':
        part(root, 'box', '#5b5e5a', 100, 40, 76, 0, 20, -4, steel);
        part(root, 'box', '#4a4d49', 104, 6, 80, 0, 43, -4, steel);
        m.door = part(root, 'box', '#8a7a4a', 4, 28, 28, 51, 14, 30, steel);
        m.door.rotation.y = Math.PI / 2; m.door.position.set(0, 14, 34);
        part(root, 'box', '#d8a33a', 30, 3, 1, 0, 32, 34.5, { e: '#5a3a0a' });
        break;
      case 'shuttle':
        part(root, 'box', '#c9c4b5', 90, 24, 40, 0, 16, 0, steel);
        part(root, 'cone', '#c9c4b5', 20, 30, 20, 58, 16, 0, steel).rotation.z = -Math.PI / 2;
        part(root, 'box', '#2f5f7a', 14, 10, 22, 40, 22, 0, { r: 0.1, m: 0.8 });
        part(root, 'box', '#8a8676', 30, 8, 80, -30, 10, 0, steel);
        m.ramp = part(root, 'box', '#6a6656', 24, 2, 30, -48, 6, 0, steel); m.ramp.rotation.z = 0.35;
        break;
      case 'frigate': {
        const g = joint(root, 0, 0, 0); g.rotation.y = -0.4;
        part(g, 'box', '#5a5c5e', 200, 40, 60, 0, 14, 0, steel);
        const nose = part(g, 'box', '#4e5052', 50, 34, 50, 112, 8, 0, steel); nose.rotation.z = -0.5; nose.rotation.x = 0.3;
        part(g, 'box', '#3e4042', 60, 20, 66, -60, 30, 0, steel);
        part(g, 'cyl', '#232425', 16, 30, 16, 30, 30, 14, steel);
        part(g, 'box', '#454749', 30, 4, 140, -20, 20, 0, steel).rotation.x = 0.2;
        m.fire = glow(g, '#ff8a3a', 10, 30, 46, 14, 0.6);
        break;
      }
      case 'node': {
        const fc = faction === 'brood' ? '#6a4a2a' : faction === 'foundry' ? '#3a3836' : '#2e2650', gc = faction === 'brood' ? '#a6d83a' : faction === 'foundry' ? '#ff3b2f' : '#b39cff';
        part(root, 'hexc', fc, st.r, 40, st.r, 0, 20, 0, steel);
        part(root, 'hexc', shade(fc, 0.08), st.r * 0.7, 40, st.r * 0.7, 0, 60, 0, steel);
        part(root, 'cone', shade(fc, -0.1), st.r * 0.5, 50, st.r * 0.5, 0, 105, 0, steel);
        m.core = glow(root, gc, 14, 0, 70, 0, 0.8);
        break;
      }
    }
    m.update = (s, dt, t, g) => {
      if (st.type === 'spawner') { if (!s.alive && !m.closed) { m.closed = true; root.scale.set(1, 0.3, 1); if (m.glowRing) m.glowRing.visible = false; if (m.portal) m.portal.visible = false; } if (m.glowRing && s.alive) m.glowRing.material.opacity = 0.4 + Math.sin(t * 3 + s.x) * 0.25; if (m.portal && s.alive) m.portal.rotation.y = t; if (m.glowRing && faction === 'veil' && s.alive) m.glowRing.rotation.y = t * 2; }
      if (st.type === 'terminal') { m.screen.material = mat(s.state === 'done' ? '#3a8a4a' : s.state === 'idle' ? '#3a7ab8' : '#d8a33a', { e: s.state === 'done' ? '#2a7a3a' : s.state === 'idle' ? '#2a6ab8' : '#b8831a', ei: 1.4 }); if (s.state === 'launch') m.rocket.position.y = 70 + (3 - s.launchT) ** 2 * 60; if (s.state === 'done') m.rocket.visible = false; }
      if (st.type === 'radar') m.dish.rotation.y = s.state === 'done' ? t : 0.6;
      if ((st.type === 'jammer' || st.type === 'aa' || st.type === 'artillery') && !s.alive && !m.wrecked) { m.wrecked = true; root.rotation.z = 0.3; root.scale.y = 0.4; if (m.light) m.light.visible = false; if (m.pulse) m.pulse.visible = false; }
      if (st.type === 'jammer' && s.alive) { const k = (t * 0.8) % 1; m.pulse.scale.setScalar(st.r + k * 160); m.pulse.material.opacity = 0.6 * (1 - k); }
      if (st.type === 'aa' && s.alive) m.head.rotation.y = Math.sin(t * 0.5) * 1.5;
      if (st.type === 'extract') { const ex = g.M.extract; m.lights.forEach((l, i) => l.material = (ex.state !== 'idle' && Math.floor(t * 4 + i) % 2) ? mat('#ffd27a', { e: '#ffb020', ei: 2 }) : mat('#6a5a3a')); }
      if (st.type === 'shelter') { const k = s.state === 'open' ? 1 : 0; m.door.position.y = 14 + k * 26; }
      if (st.type === 'node' && !s.alive && !m.wrecked) { m.wrecked = true; root.scale.set(1.2, 0.15, 1.2); m.core.visible = false; }
      if (m.core && st.type === 'node') m.core.scale.setScalar(14 * (1 + Math.sin(t * 2) * 0.15));
      if (m.fire) m.fire.scale.setScalar(10 + Math.random() * 4);
    };
    return finish(m);
  };

  MD.item = function (it) {
    const root = new T.Group(), m = { root, kind: 'item' };
    m.spin = joint(root, 0, 6, 0);
    switch (it.kind) {
      case 'weapon': MD.gunSimple(m.spin, it.w.d.cls); m.spin.scale.setScalar(1.3); break;
      case 'pack': part(m.spin, 'box', '#4a5240', 5, 10, 9, 0, 0, 0); part(m.spin, 'box', it.pack.type === 'shield' ? '#76c6ff' : '#d8a33a', 5.4, 2, 9.4, 0, 2, 0); break;
      case 'supply': m.spin.position.y = 0; part(m.spin, 'box', '#6a6040', 18, 12, 12, 0, 6, 0); part(m.spin, 'box', '#d8a33a', 18.4, 3, 12.4, 0, 9, 0); part(m.spin, 'box', '#4a4430', 19, 1.5, 13, 0, 12.5, 0); break;
      case 'blackbox': part(m.spin, 'box', '#e07a2a', 12, 10, 10, 0, 0, 0, { m: 0.4 }); part(m.spin, 'box', '#2a2a2a', 12.4, 3, 6, 0, 0, 0); break;
      case 'sample': { const c = it.tier === 'c' ? '#7fd0ff' : it.tier === 'r' ? '#ff9a3a' : '#e06bff'; for (let i = 0; i < 3; i++) part(m.spin, 'oct', c, 2.5, 5 + i, 2.5, (i - 1) * 3, 0, (i % 2) * 2, { e: c, ei: 0.6, r: 0.2, m: 0.3 }); break; }
      case 'shard': part(m.spin, 'oct', '#b39cff', 4, 6, 4, 0, 0, 0, { e: '#8f7dff', ei: 0.8, r: 0.2, m: 0.5 }); break;
      case 'medal': { const c = part(m.spin, 'cyl', '#ffd27a', 4.5, 1, 4.5, 0, 0, 0, { m: 0.9, r: 0.25 }); c.rotation.x = Math.PI / 2; break; }
      case 'credit': part(m.spin, 'box', '#c9c2a8', 8, 5, 5, 0, 0, 0, { m: 0.5 }); break;
    }
    m.ring = part(root, 'torus', '#ffffff', 10, 10, 10, 0, 0.5, 0, { add: true, o: 0.25 }); m.ring.rotation.x = Math.PI / 2;
    m.update = (it2, dt, t) => { if (it.kind !== 'supply') { m.spin.rotation.y = t * 1.5; m.spin.position.y = 6 + Math.sin(t * 3 + it.x) * 1.5; } m.ring.material.opacity = 0.18 + Math.sin(t * 4) * 0.1; };
    return finish(m);
  };

  MD.colonist = function () {
    const arm = { main: '#d27a2a', trim: '#e8d8b8', visor: '#2a2a2a', cls: 'light', pattern: 'plain' };
    const m = MD.diver(arm, null, {});
    m.gun.visible = false;
    return m;
  };
})();
