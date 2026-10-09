'use strict';
// Model extras: emplacements, faction style details, per-unit customisation parts, and the animation system.
(function () {
  const T = THREE, PI = Math.PI, MB = SM.MB, K = SM._mk;
  const grp = K.grp;

  // ------------------------------------------------------------ emplacements (stratagem sentries)
  SM.buildStatic = function (u, mats, vis, r) {
    const root = grp(), body = grp('body');
    root.add(body);
    const b = new MB(0.3);
    b.cyl('deck', 2.6, 2.9, 0.5, 0, 0.25, 0, 0, 0, 0, 12);
    for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2; b.sph('cloth', 0.55, Math.cos(a) * 2.8, 0.55, Math.sin(a) * 2.8, 1.3, 0.55, 0.8, 8, 6); if (i % 2) b.sph('cloth', 0.5, Math.cos(a + 0.2) * 2.75, 1.05, Math.sin(a + 0.2) * 2.75, 1.3, 0.5, 0.8, 8, 6); }
    b.box('dark', 0.8, 0.5, 0.6, -1.5, 0.75, -1.2); b.box('accent', 0.6, 0.4, 0.5, 1.6, 0.7, -1.0);
    body.add(b.build(mats));
    const tur = grp('turret', 0, 0.5, 0);
    const tb = new MB(0.3);
    const gun = grp('gun', 0, 1.6, 0.2);
    const gb = new MB(0.4);
    const cls = u.cls;
    if (cls === 'sentry_mg') {
      for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2; tb.cyl('gun', 0.05, 0.05, 1.7, Math.cos(a) * 0.45, 0.75, Math.sin(a) * 0.45, Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3, 5); }
      tb.box('hull', 1.4, 1.0, 0.1, 0, 1.7, 0.75); tb.box('glass', 0.3, 0.12, 0.12, 0.2, 1.95, 0.7);
      gb.box('dark', 0.35, 0.35, 0.9, 0, 0, 0); gb.box('accent', 0.35, 0.3, 0.4, 0.3, -0.1, -0.1);
      gun.add(gb.build(mats)); const br = SM.barrel(mats, 'mg', 1.6, 0.07, vis, r); br.position.z = 0.4; gun.add(br);
    } else if (cls === 'sentry_at') {
      tb.cyl('dark', 0.5, 0.6, 1.2, 0, 0.6, 0, 0, 0, 0, 10);
      gb.box('hull', 1.6, 1.0, 1.6, 0, 0.1, 0);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { gb.cylZ('dark', 0.25, 0.1, -0.4 + i * 0.8, -0.15 + j * 0.5, 0.82, 10); gb.cylZ('red', 0.12, 0.05, -0.4 + i * 0.8, -0.15 + j * 0.5, 0.86, 8); }
      gb.box('glow', 0.5, 0.12, 0.05, 0, 0.55, 0.81);
      gun.add(gb.build(mats)); gun.add(grp('barrel'));
    } else if (cls === 'sentry_aa') {
      tb.cyl('hull', 1.2, 1.3, 0.9, 0, 0.45, 0, 0, 0, 0, 10);
      gb.box('dark', 0.9, 0.8, 0.9, 0, 0, 0);
      const bl = grp('barrel'); const bb = new MB(0.5);
      for (const s of [-1, 1]) { bb.cylZ('gun', 0.08, 2.8, s * 0.6, 0.05, 1.4, 10); bb.cylZ('metal', 0.13, 0.4, s * 0.6, 0.05, 2.7, 10); }
      bl.add(bb.build(mats)); gun.add(gb.build(mats)); gun.add(bl);
      const rad = grp('radar', 0, 2.6, -0.7); const rb = new MB(0.3); rb.box('metal', 1.6, 0.7, 0.08, 0, 0.3, 0, -0.2); rb.cyl('dark', 0.06, 0.06, 0.3, 0, 0, 0); rad.add(rb.build(mats)); tur.add(rad);
    } else {
      gun.position.set(0, 0.6, 0.2); gun.rotation.x = -0.9;
      for (const s of [-1, 1]) { gb.cylZ('gun', 0.16, 1.6, s * 0.7, 0, 0.6, 10); gb.cyl('dark', 0.3, 0.3, 0.06, s * 0.7, -0.15, 0, PI / 2, 0, 0, 10); gb.cyl('gun', 0.04, 0.04, 0.9, s * 0.7 + 0.15, -0.3, 0.6, 0.6, 0, 0, 5); }
      for (let i = 0; i < 4; i++) tb.box('accent', 0.5, 0.3, 0.3, -1.2 + i * 0.3, 0.2, -1.5);
      gun.add(gb.build(mats)); gun.add(grp('barrel'));
    }
    tur.add(tb.build(mats)); tur.add(gun);
    const ant = new MB(0.3); K.antenna(ant, -1.8, 0.5, 0.6, 2.4); body.add(ant.build(mats));
    body.add(tur);
    return root;
  };

  // ------------------------------------------------------------ helpers for attachments
  const tmpV = new T.Vector3();
  function localBox(g) {
    g.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(g);
    const p = g.getWorldPosition(tmpV);
    box.min.sub(p); box.max.sub(p);
    return box;
  }
  const decalGeo = new T.PlaneGeometry(1, 1);
  const decalMats = {};
  function decalMat(kind, fac, text) {
    const key = kind + fac + (text || '');
    if (!decalMats[key]) decalMats[key] = new T.MeshStandardMaterial({ map: SM.decalTexture(kind, fac, text), transparent: true, alphaTest: 0.35, roughness: 0.7, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -3, depthWrite: false });
    return decalMats[key];
  }
  function decal(parent, kind, fac, text, w, h, x, y, z, ry, rx) {
    const m = new T.Mesh(decalGeo, decalMat(kind, fac, text));
    m.scale.set(w, h, 1); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0, 'YXZ'); m.renderOrder = 2;
    parent.add(m); return m;
  }
  function hullBox(group, mats) {
    // bounding box of the camo-hull mesh only (ignores antennas, masts, rotors, arms)
    const box = new T.Box3();
    group.children.forEach(c => {
      const meshes = c.isMesh ? [c] : c.name ? [] : c.children.filter(m => m.isMesh);
      meshes.forEach(m => { if (m.material !== mats.hull) return; m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox.clone(); bb.min.add(c.position); bb.max.add(c.position); box.union(bb); });
    });
    return box.isEmpty() ? null : box;
  }
  function hullGroupOf(body) {
    // first merged mesh group under body is the hull
    for (const c of body.children) if (!c.name && c.children.length) return c;
    return body;
  }

  // ------------------------------------------------------------ faction styles + customisation parts
  SM.finishTemplate = function (obj, u, mats, vis, cu) {
    const kind = SM.unitKind(u), fac = SM.FACTION[u.fac], cls = SM.CLASSES[u.cls];
    const body = obj.getObjectByName('body') || obj;
    const r = SM.rng(u.seed + 77);
    if (kind === 'i') {
      if (cu.holo) addHolo(obj, mats, 2.6, 3.2);
      return;
    }
    let tgt = body;
    if (cls.move === 'mech') tgt = obj.getObjectByName('torso') || body;
    const hb = hullBox(tgt, mats) || localBox(cls.move === 'mech' ? tgt : hullGroupOf(body));
    if (kind === 'n' && SM.CLASSES[u.cls].move !== 'amphib') hb.max.y = Math.min(hb.max.y, hb.min.y + ({ carrier: 7, battleship: 6.5, cruiser: 6, frigate: 5.4, destroyer: 5.2, corvette: 4.5 }[u.cls] || 3.2));
    const all = localBox(obj);
    const W = hb.max.x - hb.min.x, Hh = hb.max.y - hb.min.y, L = hb.max.z - hb.min.z;
    const cx = (hb.min.x + hb.max.x) / 2;
    const extra = new MB(0.25);
    // ---- faction style details
    if (fac.style === 'scrap' && kind !== 'a') {
      for (let i = 0; i < 6; i++) { const s = r() < 0.5 ? -1 : 1; extra.box('accent', 0.08, Hh * (0.15 + r() * 0.2), L * (0.1 + r() * 0.15), cx + s * (W / 2 + 0.03), hb.min.y + Hh * (0.35 + r() * 0.4), hb.min.z + L * (0.15 + r() * 0.7), r() * 0.3, 0, 0); }
      if (kind === 'g' || kind === 't') { for (let i = 0; i < 3; i++) extra.cone('gun', 0.12, 0.7, cx + (i - 1) * W * 0.25, hb.min.y + Hh * 0.45, hb.max.z + 0.25, PI / 2, 0, 0, 6); extra.cylX('tire', Math.min(0.6, Hh * 0.35), 0.4, cx + W / 2 + 0.25, hb.min.y + Hh * 0.6, hb.min.z + L * 0.35, 14); }
      for (let i = 0; i < 2; i++) extra.cyl('gun', 0.1, 0.13, Hh * 0.5, cx + (i ? 1 : -1) * W * 0.35, hb.max.y + Hh * 0.2, hb.min.z + 0.4, 0.3, 0, 0, 8);
    }
    if (fac.style === 'orbital') {
      for (const s of [-1, 1]) { extra.box('glow', 0.04, 0.05, L * 0.75, cx + s * (W / 2 + 0.02), hb.min.y + Hh * 0.72, (hb.min.z + hb.max.z) / 2); extra.box('accent', 0.05, 0.06, L * 0.6, cx + s * W * 0.32, hb.max.y + 0.01, (hb.min.z + hb.max.z) / 2); }
    }
    // ---- customisation parts
    const top = hb.max.y, front = hb.max.z, rear = hb.min.z;
    const ground = kind === 'g' || kind === 't';
    if (cu.sandbags && ground) for (let i = 0; i < 7; i++) extra.sph('cloth', 0.38, cx + (i - 3) * W * 0.12, top - 0.05 + (i % 2) * 0.1, front - L * 0.2, 1.3, 0.55, 0.8, 8, 6);
    if (cu.sparetracks && ground) for (let i = 0; i < 4; i++) extra.box('rubber', W * 0.18, 0.08, 0.32, cx + (i - 1.5) * W * 0.2, hb.min.y + Hh * 0.65, front - 0.05, -0.6, 0, 0);
    if (cu.stowage && ground) { for (let i = 0; i < 3; i++) extra.box(i % 2 ? 'net' : 'dark', 0.5 + r() * 0.4, 0.35, 0.5, cx + (i - 1) * W * 0.28, top + 0.15, rear + L * 0.15); extra.cyl('accent', 0.18, 0.18, 0.5, cx - W * 0.4, top + 0.2, rear + L * 0.32, PI / 2, 0, 0, 8); extra.cyl('accent', 0.16, 0.16, 0.45, cx + W * 0.44, top + 0.2, rear + L * 0.32, 0, 0, PI / 2, 8); }
    if (cu.camonet && ground) for (let i = 0; i < 7; i++) extra.sph('net', 0.6 + r() * 0.4, cx + (r() - 0.5) * W * 0.8, top + 0.05, rear + L * (0.1 + r() * 0.5), 1.4, 0.35, 1.2, 8, 6);
    if (cu.slat && ground) {
      for (const s of [-1, 1]) { const x = cx + s * (W / 2 + 0.35); for (let i = 0; i <= 10; i++) extra.box('gun', 0.04, Hh * 0.7, 0.04, x, hb.min.y + Hh * 0.55, rear + L * 0.1 + i * L * 0.08); for (let j = 0; j < 3; j++) extra.box('gun', 0.04, 0.04, L * 0.8, x, hb.min.y + Hh * (0.25 + j * 0.3), (hb.min.z + hb.max.z) / 2); extra.box('gun', 0.32, 0.04, 0.04, x - s * 0.17, hb.min.y + Hh * 0.85, rear + L * 0.3); extra.box('gun', 0.32, 0.04, 0.04, x - s * 0.17, hb.min.y + Hh * 0.85, rear + L * 0.7); }
      for (let i = 0; i <= 6; i++) extra.box('gun', 0.04, Hh * 0.6, 0.04, cx - W / 2 + i * W / 6, hb.min.y + Hh * 0.55, rear - 0.35);
    }
    if (cu.dozer && kind === 't') { extra.box('hull', W * 1.02, Hh * 0.45, 0.15, cx, hb.min.y + Hh * 0.25, front + 0.65, 0.25, 0, 0); extra.box('gun', W * 1.0, 0.08, 0.2, cx, hb.min.y + 0.05, front + 0.75); for (const s of [-1, 1]) extra.box('gun', 0.15, 0.15, 1.0, cx + s * W * 0.35, hb.min.y + Hh * 0.3, front + 0.2, -0.3, 0, 0); }
    if (cu.spikes && ground) for (let i = 0; i < 5; i++) extra.cone('metal', 0.1, 0.6, cx + (i - 2) * W * 0.2, hb.min.y + Hh * 0.3, front + 0.3, PI / 2, 0, 0, 6);
    if (cu.flagline && kind === 'n') for (let i = 0; i < 9; i++) { const t = i / 8; extra.box(['red', 'white', 'accent', 'glow'][i % 4], 0.05, 0.5, 0.6, cx, top + 1 + t * (all.max.y - top) * 0.8, front - t * L * 0.45); }
    if (cu.goldtrim && kind !== 'i') { extra.box('accent', 0.05, 0.05, L * 0.9, cx + W / 2 + 0.02, top - 0.04, (hb.min.z + hb.max.z) / 2); extra.box('accent', 0.05, 0.05, L * 0.9, cx - W / 2 - 0.02, top - 0.04, (hb.min.z + hb.max.z) / 2); }
    if (cu.contrail && kind === 'a') obj.userData.contrail = true;
    if (Object.keys(extra.L).length) { const g = extra.build(mats); tgt.add(g); }
    // searchlight on the turret (or roof)
    if (cu.searchlight && ground) {
      const tur = obj.getObjectByName('turret') || tgt;
      const tb = tur === tgt ? hb : (hullBox(tur, mats) || localBox(tur));
      const sl = new MB(0.3); const x = (tb.min.x + tb.max.x) / 2 + (tb.max.x - tb.min.x) * 0.3, y = tb.max.y + 0.15, z = tb.max.z - 0.4;
      sl.cyl('gun', 0.04, 0.05, 0.3, x, y, z, 0, 0, 0, 6); sl.cylZ('dark', 0.24, 0.35, x, y + 0.3, z, 12); sl.cylZ('light', 0.2, 0.04, x, y + 0.3, z + 0.19, 12);
      tur.add(sl.build(mats));
    }
    if (cu.pennant && (ground || kind === 'n')) {
      const pole = new MB(0.3); const px = cx - W * 0.35, pz = rear + L * 0.15, py = top;
      pole.cyl('gun', 0.03, 0.04, 2.6, px, py + 1.3, pz, 0, 0, 0, 5); tgt.add(pole.build(mats));
      const p = grp('pennant', px, py + 2.3, pz);
      const flag = new T.Mesh(new T.PlaneGeometry(1.2, 0.6), new T.MeshStandardMaterial({ color: new T.Color(fac.hue).convertSRGBToLinear(), side: T.DoubleSide, roughness: 0.8 }));
      flag.position.x = 0.6; p.add(flag); tgt.add(p);
    }
    // ---- decals
    const midZ = (hb.min.z + hb.max.z) / 2, midY = hb.min.y + Hh * 0.55;
    const sz = Math.min(Hh * 0.55, L * 0.25, 1.6);
    if (cu.insignia) {
      if (kind === 'a') { for (const s of [-1, 1]) decal(tgt, 'insignia', u.fac, '', 1.2, 1.2, cx + s * W * 0.32, top + 0.03, midZ - L * 0.08, 0, -PI / 2); }
      else for (const s of [-1, 1]) decal(tgt, 'insignia', u.fac, '', sz, sz, cx + s * (W / 2 + 0.05), midY, midZ - L * 0.1, s * PI / 2);
    }
    if (cu.number) { const n = String(100 + SM.hash(u.id) % 900); for (const s of [-1, 1]) decal(tgt, 'number', u.fac, n, sz * 1.6, sz * 0.8, cx + s * (W / 2 + 0.06), midY, midZ + L * 0.18, s * PI / 2); }
    if (cu.killmarks) { const tur = obj.getObjectByName('turret'); const tg = tur && ground ? tur : tgt; const tb = tg === tgt ? hb : (hullBox(tg, mats) || localBox(tg)); const w2 = tb.max.x - tb.min.x; decal(tg, 'killmarks', u.fac, '', Math.min(2.2, (tb.max.z - tb.min.z) * 0.7), 0.6, (tb.min.x + tb.max.x) / 2 + w2 / 2 + 0.07, tb.min.y + (tb.max.y - tb.min.y) * 0.55, (tb.min.z + tb.max.z) / 2, PI / 2); }
    if (cu.skull) decal(tgt, 'skull', u.fac, '', sz * 0.9, sz * 0.9, cx, midY, front + 0.06, 0);
    if (cu.sharkmouth && kind === 'a') for (const s of [-1, 1]) decal(tgt, 'shark', u.fac, '', 2.2, 1.4, cx + s * Math.min(W * 0.18, 1.0), hb.min.y + Hh * 0.45, front - L * 0.18, s * PI / 2);
    if (cu.wingstripes && kind === 'a') for (const s of [-1, 1]) decal(tgt, 'stripes', u.fac, '', 2.4, 1.6, cx + s * W * 0.3, top + 0.04, midZ - L * 0.05, PI / 2, -PI / 2);
    if (cu.hullband && kind === 'n') for (const s of [-1, 1]) decal(tgt, 'band', u.fac, '', L * 0.8, Hh * 0.5, cx + s * (W / 2 + 0.06), hb.min.y + Hh * 0.6, midZ, s * PI / 2);
    if (cu.holo) addHolo(obj, mats, Math.max(1.6, W * 0.45), all.max.y + 1.6);
  };
  function addHolo(obj, mats, R, y) {
    const g = grp('holo', 0, y, 0);
    const b = new MB(0.3); b.tor('glow', R, 0.05, 0, 0, 0, PI / 2, 0, 0, 40); b.tor('glow', R * 0.7, 0.03, 0, 0.2, 0, PI / 2, 0, 0, 32);
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; b.box('glow', 0.12, 0.3, 0.12, Math.cos(a) * R, 0, Math.sin(a) * R); }
    g.add(b.build(mats)); obj.add(g);
  }

  // ------------------------------------------------------------ animation
  SM.animateUnit = function (rig, cls, st, dt, time) {
    const sp = st.speed || 0;
    for (const t of rig.tracks) t.offset.y -= sp * dt * 0.35;
    for (const w of rig.wheels) w.rotation.x += sp * dt / 0.62;
    for (const s of rig.sprockets) s.rotation.x += sp * dt / 0.45;
    const steer = SM.clamp((st.steer || 0) * 0.6, -0.5, 0.5);
    for (const s of rig.steer) s.rotation.y += (steer - s.rotation.y) * Math.min(1, dt * 6);
    for (const ro of rig.rotors) ro.rotation.y += dt * 28 * (ro.userData.dir || 1);
    for (const ro of rig.trotors) ro.rotation.x += dt * 45;
    for (const p of rig.props) p.rotation.z += dt * (p.userData.axis === 'z' ? 30 : 20) * (sp > 0.5 || cls.move === 'amphib' ? 1 : 0.3);
    for (const rd of rig.radars) rd.rotation.y += dt * 1.6;
    for (const f of rig.flames) { const s = 0.75 + Math.random() * 0.35 + (st.boost ? 0.6 : 0); f.scale.set(1, s, 1); }
    for (const j of rig.jets) { const on = st.jet; const s = on ? 1 + Math.random() * 0.4 : 0.18 + Math.random() * 0.08; j.scale.set(on ? 1.2 : 0.7, s, on ? 1.2 : 0.7); }
    for (const h of rig.holos) { h.rotation.y += dt * 1.1; h.position.y += Math.sin(time * 2) * 0.004; }
    for (const p of rig.pennants) p.rotation.y = Math.sin(time * 3.2 + p.position.x) * 0.45 - 0.2 - sp * 0.04;
    rig.ailerons.forEach((a, i) => { a.rotation.x = (i ? -1 : 1) * SM.clamp(st.roll || 0, -0.8, 0.8) * 0.7; });
    if (rig.barrels.length) {
      const rc = st.recoil || 0;
      const b0 = rig.barrels[0];
      if (b0.userData.z0 === undefined) b0.userData.z0 = b0.position.z;
      b0.position.z = b0.userData.z0 - rc * (rc > 0.7 ? 0.7 : 0.55);
    }
    const mv = cls.move;
    // hull suspension: squat under acceleration, rock back on firing, engine idle shimmy
    if (rig.body && (mv === 'track' || mv === 'wheel' || mv === 'amphib')) {
      const tp = -(st.accel || 0) * 0.012 + (st.recoil || 0) * (st.recoil > 0.5 ? 0.05 : 0.02) * (cls.casemate ? 1 : 0.6);
      const b = rig.body;
      b.rotation.x += (tp - b.rotation.x) * Math.min(1, dt * 8);
      b.position.y = Math.sin(time * 37) * (sp > 0.5 ? 0.02 : 0.006);
    }
    if (mv === 'inf' || mv === 'static') {
      for (const s of rig.soldiers) {
        if (!s.alive) {
          s.die += dt;
          const k = Math.min(1, s.die * 2.4);
          s.g.rotation.x = s.fallDir * k * PI / 2; s.g.rotation.z = s.fallSide * k;
          s.g.position.y = (s.gy || 0) + (s.die > 2.5 ? -(s.die - 2.5) * 0.5 : 0.12 * k);
          if (s.die > 5) s.g.visible = false;
          continue;
        }
        const moving = sp > 0.3;
        const engaged = !!st.engaged;
        s.crouch += SM.clamp(((!moving && engaged) ? 1 : 0) - s.crouch, -dt * 4, dt * 4);
        const c = s.crouch;
        s.phase += dt * (moving ? sp * 2.3 : 0.8);
        const a = moving ? Math.sin(s.phase) : 0;
        const hipY = 0.98 - 0.32 * c;
        s.legL.position.y = hipY; s.legR.position.y = hipY;
        s.legL.rotation.x = a * 0.75 - c * 1.35; s.legR.rotation.x = -a * 0.75 - c * 0.2;
        s.kneeL.rotation.x = (moving ? Math.max(0, -Math.sin(s.phase - 0.6)) * 1.1 : 0) + c * 1.45;
        s.kneeR.rotation.x = (moving ? Math.max(0, Math.sin(s.phase - 0.6)) * 1.1 : 0) + c * 1.9;
        s.g.position.y = s.gy || 0;
        s.torso.position.y = hipY + (moving ? Math.abs(Math.cos(s.phase)) * 0.05 : Math.sin(time * 1.5 + s.phase) * 0.008);
        s.torso.rotation.x = moving ? 0.14 : c * 0.12;
        s.torso.rotation.y = moving ? Math.sin(s.phase) * 0.08 : 0;
        // facing: whole soldier turns towards the target while engaged
        const want = engaged ? SM.clamp(st.aimLocal || 0, -1.2, 1.2) : 0;
        s.g.rotation.y += (want - s.g.rotation.y) * Math.min(1, dt * 5);
        // arms: aim, swing when running, dip to reload
        if (engaged) { s.reload -= dt; if (s.reload < -0.9) s.reload = 2.5 + Math.random() * 3; }
        const reloading = engaged && s.reload < 0;
        let ax = -(st.aimPitch || 0);
        if (moving && !engaged) ax = 0.35 + Math.sin(s.phase * 2) * 0.06;
        if (reloading) ax = 0.6;
        if (st.firing && !reloading) ax -= 0.05 + Math.random() * 0.05;
        s.arms.rotation.x += (ax - s.arms.rotation.x) * Math.min(1, dt * 12);
        s.arms.position.z = st.firing && !reloading ? -Math.random() * 0.04 : 0;
      }
    } else if (mv === 'mech') {
      const ph = st.phase || 0;
      const moving = sp > 0.3;
      rig.stepped = 0;
      if (rig.spiderLegs.length) {
        rig.spiderLegs.forEach((l, i) => {
          if (l.userData.ry === undefined) l.userData.ry = l.rotation.y;
          const off = (i === 0 || i === 3) ? 0 : PI;
          const sw = moving ? Math.sin(ph + off) : 0;
          l.rotation.y = l.userData.ry + sw * 0.28;
          if (rig.spiderKnees[i]) rig.spiderKnees[i].rotation.x = moving ? -Math.max(0, Math.cos(ph + off)) * 0.4 : 0;
        });
        if (rig.pelvis) rig.pelvis.position.y = (rig.pelvis.userData.y0 || (rig.pelvis.userData.y0 = rig.pelvis.position.y)) + (moving ? Math.abs(Math.sin(ph)) * 0.15 : Math.sin(time) * 0.04);
      } else {
        rig.legs.forEach(l => {
          const p = ph + (l.side ? PI : 0);
          const sw = moving ? Math.sin(p) : 0;
          const lift = moving ? Math.max(0, Math.cos(p)) : 0;
          const prevLift = l.lift || 0; l.lift = lift;
          if (moving && prevLift > 0.05 && lift <= 0.05) rig.stepped = l.side + 1;
          if (l.rev) { l.hip.rotation.x = l.rest[0] - sw * 0.35 + lift * 0.15; l.knee.rotation.x = l.rest[1] - lift * 0.55; l.ankle.rotation.x = -(l.hip.rotation.x + l.knee.rotation.x) + lift * 0.4; }
          else { l.hip.rotation.x = l.rest[0] - sw * 0.42 - lift * 0.25; l.knee.rotation.x = l.rest[1] + lift * 0.85; l.ankle.rotation.x = -(l.hip.rotation.x + l.knee.rotation.x) + lift * 0.35; }
        });
        if (rig.pelvis) {
          const y0 = rig.pelvis.userData.y0 || (rig.pelvis.userData.y0 = rig.pelvis.position.y);
          rig.pelvis.position.y = y0 - (moving ? Math.abs(Math.cos(ph)) * 0.2 : 0) + Math.sin(time * 1.3) * 0.03 + (st.jet ? 0.2 : 0);
          rig.pelvis.rotation.z = moving ? Math.sin(ph) * 0.05 : 0;
          rig.pelvis.rotation.x += ((moving ? 0.07 : 0) - rig.pelvis.rotation.x) * Math.min(1, dt * 4);
        }
      }
      if (rig.armL) rig.armL.rotation.x = moving && !st.firing ? Math.sin(ph) * 0.25 : -(st.aimPitch || 0) - 0.1;
      if (rig.armR) rig.armR.rotation.x = -(st.aimPitch || 0) - 0.1 - (st.recoil || 0) * 0.3;
      if (rig.torso) rig.torso.rotation.z = moving ? Math.sin(ph) * 0.03 : Math.sin(time * 0.9) * 0.01;
    } else if (mv === 'hover' && rig.body) {
      rig.body.position.y = 0.25 + Math.sin(time * 2.1) * 0.12;
      rig.body.rotation.z = Math.sin(time * 1.3) * 0.015;
    }
  };
})();
