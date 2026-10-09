'use strict';
// Stratagems in battle: loadouts, call-ins (orbital, air, logistics, fortifications, EW, drops),
// drop pods, flybys, support zones, AI usage, the stratagem bar, and meteor showers.
(function () {
  const T = THREE, PI = Math.PI;
  const P = SM.Battle.prototype;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const OFFENSIVE = { strike: 1, barrage: 1, laser: 1, empstrike: 1, strafe: 1, missiles: 1, cluster: 1, napalmrun: 1, carpetrun: 1, hackzone: 1, jamzone: 1, gunship: 1 };
  const SUPPORT = { healzone: 1, ammozone: 1, hospital: 1, resetcd: 1, dome: 1 };

  const baseInit = P.init;
  P.init = function () {
    baseInit.call(this);
    this.pods = []; this.flybys = []; this.meteorT = 6;
    const mk = list => (list || []).map(e => { const def = SM.STRAT[e.id]; return def ? { def, ups: e.ups || [], p: SM.stratParams(def, e.ups || []), cd: 8 } : null; }).filter(Boolean);
    this.strats = [mk(this.o.strats), mk(this.o.enemyStrats)];
    this.teams.forEach(t => { t.fuelT = 0; t.blackoutT = 0; });
    this.aiStratT = [4, 4];
    this.initStratUI();
  };

  // ---------------------------------------------------------------- per-step update
  P.stepStrat = function (dt, wm) {
    for (const list of this.strats) for (const s of list) if (s.cd > 0) s.cd -= dt;
    for (const t of this.teams) { if (t.fuelT > 0) t.fuelT -= dt; if (t.blackoutT > 0) t.blackoutT -= dt; }
    // drop pods
    for (let i = this.pods.length - 1; i >= 0; i--) {
      const p = this.pods[i];
      p.t += dt;
      if (!p.landed) {
        const k = Math.min(1, p.t / p.dur);
        const g = this.M.groundAt(p.x, p.z);
        p.mesh.position.set(p.x, g + (1 - k * k) * 220, p.z);
        p.mesh.rotation.y += dt * 4;
        if (Math.random() < 0.9) this.fx.trail(p.x + (Math.random() - 0.5), p.mesh.position.y + 3, p.z + (Math.random() - 0.5), 0x9a9690, true);
        this.fx.glowAt(p.x, p.mesh.position.y - 1, p.z, 0xffb060, 5);
        if (k >= 1) {
          p.landed = true; p.t = 0;
          this.fx.explosion(p.x, g, p.z, p.big ? 2.2 : 1.2); this.fx.dust(p.x, g, p.z, 3);
          SM.Audio.boom(p.big ? 2.5 : 1.4, this.vol({ x: p.x, z: p.z }));
          if (p.crush) this.areaDamage(p.x, p.z, p.crush, 400, 200, null, p.team);
          if (p.big) this.cameraShake = Math.max(this.cameraShake || 0, 0.9);
          p.onLand && p.onLand();
        }
      } else if (p.t > 14) { p.mesh.position.y -= dt * 0.8; if (p.t > 18) { this.scene.remove(p.mesh); this.pods.splice(i, 1); } }
    }
    // flybys (strafing runs, bombers)
    for (let i = this.flybys.length - 1; i >= 0; i--) {
      const f = this.flybys[i];
      f.t += dt;
      f.obj.position.set(f.x0 + f.dx * f.speed * f.t, f.alt, f.z0 + f.dz * f.speed * f.t);
      f.obj.rotation.set(0, Math.atan2(f.dx, f.dz), Math.sin(f.t * 1.5) * 0.15, 'YXZ');
      if (f.rig) SM.animateUnit(f.rig, f.cls, { speed: f.speed }, dt, this.time);
      while (f.events.length && f.events[0].t <= f.t) f.events.shift().fn(f);
      if (f.t > f.dur) { this.scene.remove(f.obj); this.flybys.splice(i, 1); }
    }
    // AI stratagem use
    for (let team = 0; team < 2; team++) {
      if (!this.ai[team] || !this.strats[team].length) continue;
      this.aiStratT[team] -= dt;
      if (this.aiStratT[team] <= 0) { this.aiStratT[team] = 2.5 + Math.random() * 2; this.aiStrat(team); }
    }
    // meteor showers
    if (wm && wm.meteors === undefined) { const w = SM.WEATHER[this.weather.cur]; if (w.meteors && this.weather.blend > 0.5) this.meteorTick(dt); }
  };
  P.meteorTick = function (dt) {
    this.meteorT -= dt;
    if (this.meteorT > 0) return;
    this.meteorT = 2.5 + Math.random() * 4;
    const pool = this.units.filter(u => u.alive && !u.isHQ);
    const c = pool.length && Math.random() < 0.6 ? pool[Math.floor(Math.random() * pool.length)].pos : { x: this.cam.x + (Math.random() - 0.5) * 200, z: this.cam.z + (Math.random() - 0.5) * 160 };
    const x = c.x + (Math.random() - 0.5) * 50, z = c.z + (Math.random() - 0.5) * 50, g = this.M.groundAt(x, z);
    const sx = x - 120, sy = g + 240, sz = z - 40;
    this.fx.lines.add(sx, sy, sz, x, g, z, 0xffb070, 0.7);
    for (let i = 0; i < 20; i++) { const t = i / 20; this.fx.fire.spawn(sx + (x - sx) * t, sy + (g - sy) * t, sz + (z - sz) * t, 0, 0, 0, 0.6 + t * 0.4, 3 * (1 - t) + 1, 0.5, 0xffa040, 0.9, 0, 0); }
    this.later(0.35, () => { this.fx.explosion(x, g, z, 1.8); SM.Audio.boom(1.8, this.vol({ x, z })); this.near(x, z, 9, o => { if (o.alive && !o.isHQ && !SM.isAir(o.cls)) this.damage(o, 180, 90, null, { aoe: true }); }); });
  };

  // ---------------------------------------------------------------- calling stratagems
  P.canStrat = function (team, i) {
    const s = this.strats[team][i];
    if (!s) return 'none';
    if (s.cd > 0) return 'cooldown';
    if (this.teams[team].cp < s.p.cost) return 'cp';
    return null;
  };
  P.callStrat = function (team, i, x, z) {
    const s = this.strats[team][i];
    if (!s || this.canStrat(team, i)) return false;
    if (s.def.target === 'point' && x === undefined) return false;
    this.teams[team].cp -= s.p.cost;
    s.cd = s.p.cooldown;
    if (x !== undefined) { x = SM.clamp(x, -300, 300); z = SM.clamp(z, -300, 300); }
    this.execStrat(team, s.def, s.p, x, z, 1);
    if (s.p.echo) this.later(3.5, () => { if (!this.over) this.execStrat(team, s.def, s.p, x, z, 0.5); });
    if (team === 0) { this.addFeed('Stratagem: ' + s.def.name + '.', '#ffd27a'); SM.Audio.ability(); this.stats.strats = (this.stats.strats || 0) + 1; }
    else if (OFFENSIVE[s.def.fx] && x !== undefined) { this.addFeed('Enemy stratagem: ' + s.def.name + '!', '#ff8a7a'); SM.Audio.alert(); }
    if (team === 0 && this.o.onStrat) this.o.onStrat(s.def);
    return true;
  };
  P.stratSrc = function (team, x, z) { return { team, pos: new T.Vector3(x || 0, 0, z || 0), yaw: 0, turretYaw: 0, cls: { aoe: 0 }, def: { id: null, wt: 'arty' }, buffs: {}, isStrat: true }; };
  P.beacon = function (team, x, z, dur, col) {
    const g = this.M.groundAt(x, z), c = col || (team ? 0xff5040 : 0x60c8ff);
    const steps = Math.ceil(dur / 0.15);
    for (let i = 0; i < steps; i++) this.later(i * 0.15, () => {
      this.fx.lines.add(x, g, z, x, g + 60, z, c, 0.3);
      this.fx.fire.spawn(x + (Math.random() - 0.5) * 2, g + 1, z + (Math.random() - 0.5) * 2, 0, 12 + Math.random() * 10, 0, 1.2, 2, 0.5, c, 0.9, 0, 0);
    });
    this.fx.glowAt(x, g + 1, z, c, 12);
  };
  P.addDome = function (team, x, z, r, dur) {
    const m = new T.Mesh(this.domeGeo || (this.domeGeo = new T.SphereGeometry(1, 28, 16, 0, PI * 2, 0, PI / 2)), new T.MeshBasicMaterial({ color: team ? 0xff7060 : 0x6ad8ff, transparent: true, opacity: 0.16, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    m.position.set(x, this.M.groundAt(x, z), z); m.scale.setScalar(r); this.scene.add(m);
    this.zones.push({ kind: 'dome', x, z, r, t: dur, team, mesh: m });
  };
  P.flyby = function (team, x, z, clsKey, opts) {
    // a jet / bomber pass through (x, z) heading away from the caller's side
    const fac = this.teams[team].fac;
    const def = SM.UNIT_LIST.find(d => d.fac === fac && d.cls === clsKey && d.rank >= 4) || SM.UNIT_LIST.find(d => d.fac === fac && d.cls === clsKey);
    const inst = SM.instantiate(def, [], null, []);
    const dz = team ? 1 : -1, dx = (Math.random() - 0.5) * 0.4, L = Math.hypot(dx, dz);
    const f = { obj: inst.obj, rig: inst.rig, cls: SM.CLASSES[clsKey], dx: dx / L, dz: dz / L, speed: opts.speed || 80, alt: this.M.groundAt(x, z) + (opts.alt || 45), t: 0, dur: 0, events: [] };
    const lead = 260;
    f.x0 = x - f.dx * lead; f.z0 = z - f.dz * lead; f.dur = (lead * 2) / f.speed;
    inst.obj.rotation.order = 'YXZ';
    this.scene.add(inst.obj);
    this.flybys.push(f);
    SM.Audio.shot('rocket', this.vol({ x, z }) * 0.6);
    return f;
  };
  P.podDrop = function (team, x, z, onLand, big, crush) {
    const mb = new SM.MB(0.3);
    const mats = SM.getMats(this.teams[team].fac, 'factory');
    const s = big ? 2.2 : 1.2;
    mb.cyl('hull', 1.3 * s, 1.6 * s, 4 * s, 0, 2 * s, 0, 0, 0, 0, 10); mb.cone('dark', 1.6 * s, 1.6 * s, 0, -0.8 * s, 0, PI, 0, 0, 10);
    for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2; mb.box('accent', 0.2 * s, 3 * s, 0.9 * s, Math.cos(a) * 1.5 * s, 2 * s, Math.sin(a) * 1.5 * s, 0, -a, 0.2); }
    mb.box('glow', 2.8 * s, 0.15, 0.15, 0, 3.5 * s, 0);
    const mesh = mb.build(mats);
    mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(mesh);
    this.pods.push({ x, z, t: 0, dur: 1.5, mesh, onLand, big, crush, team });
  };
  P.stratUnitDef = function (team, cls, rank) {
    const fac = this.teams[team].fac;
    if (SM.CLASSES[cls].move === 'static') {
      const id = 'strat.' + fac + '.' + cls + '.' + rank;
      return SM.UNITS[id] || (SM.UNITS[id] = SM.makeUnit({ id, fac, cls, rank, name: SM.CLASSES[cls].name }));
    }
    const cand = SM.UNIT_LIST.filter(d => d.fac === fac && d.cls === cls && !d.exclusive);
    return cand.filter(d => d.rank <= rank).sort((a, b) => b.rank - a.rank)[0] || cand[0];
  };

  P.execStrat = function (team, s, p, x, z, scale) {
    const src = this.stratSrc(team, x, z);
    const g = x !== undefined ? this.M.groundAt(x, z) : 0;
    const R = p.r || 10;
    const enemiesNear = (cx, cz, r) => { const out = []; this.near(cx, cz, r, o => { if (o.team !== team && o.alive && !o.isHQ && (o.vis[team] || true)) out.push(o); }); return out; };
    switch (s.fx) {
      case 'strike': {
        this.beacon(team, x, z, p.delay, 0x9ae8ff);
        this.later(p.delay, () => {
          for (let i = 0; i < 4; i++) this.fx.beam(x + (Math.random() - 0.5) * 2, g + 420, z + (Math.random() - 0.5) * 2, x, g, z, 0xc8f0ff, 1.0);
          this.fx.explosion(x, g, z, (p.big ? 4 : 1.8) * Math.max(0.6, scale), 'plasma');
          this.areaDamage(x, z, R, p.dmg * scale, 600, src, team);
          SM.Audio.boom(p.big ? 3 : 2, this.vol({ x, z }));
          this.cameraShake = Math.max(this.cameraShake || 0, p.big ? 1.4 : 0.5);
          if (p.big) for (let i = 0; i < 6; i++) this.later(0.1 * i, () => this.fx.explosion(x + (Math.random() - 0.5) * R, g, z + (Math.random() - 0.5) * R, 2));
        });
        break;
      }
      case 'barrage': {
        this.beacon(team, x, z, p.delay, 0xffb060);
        const n = Math.max(1, Math.round(p.n * scale));
        for (let i = 0; i < n; i++) this.later(p.delay + (i / n) * (p.dur || 3), () => {
          const a = Math.random() * PI * 2, rr = Math.sqrt(Math.random()) * R;
          const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, pg = this.M.groundAt(px, pz);
          const pr = this.spawnProjectile(src, null, 'arty', new T.Vector3(px + 40, pg + 260, pz + 20), new T.Vector3(px, pg, pz), false, p.dmg, 300, p.big ? 2 : 1);
          pr.aoe = p.big ? 13 : 9; pr.T = 1.4; pr.vx = (px - pr.sx) / pr.T; pr.vz = (pz - pr.sz) / pr.T; pr.vy = (pg - pr.sy + 4.9 * pr.T * pr.T) / pr.T;
        });
        break;
      }
      case 'laser': {
        this.beacon(team, x, z, p.delay, 0xff6ad8);
        this.later(p.delay, () => this.zones.push({ kind: 'olaser', x, z, r: R, t: p.dur * scale, dps: p.dmg, team, src }));
        break;
      }
      case 'empstrike': case 'hackzone': {
        this.beacon(team, x, z, p.delay || 1.2, 0x7ab0ff);
        this.later(p.delay || 1.2, () => { this.fx.explosion(x, g + 1, z, R / 10, 'emp'); for (let i = 0; i < 30; i++) { const a = i / 30 * PI * 2; this.fx.fire.spawn(x + Math.cos(a) * R, g + 1, z + Math.sin(a) * R, Math.cos(a) * 4, 2, Math.sin(a) * 4, 1.2, 3, 1, 0x7ab0ff, 1, 0, 0); } this.near(x, z, R, o => { if (o.team !== team && o.alive && !o.isHQ && !o.squad) o.buffs.stun = p.dur * scale; }); });
        break;
      }
      case 'strafe': {
        const f = this.flyby(team, x, z, 'cas', { speed: 75, alt: 30 });
        const n = Math.round(p.n * scale), lead = 260;
        for (let i = 0; i < n; i++) {
          const off = (i / n - 0.5) * p.len;
          const tt = (lead + off - 25) / f.speed;
          f.events.push({ t: tt, fn: ff => {
            const ix = x + ff.dx * off + (Math.random() - 0.5) * 4, iz = z + ff.dz * off + (Math.random() - 0.5) * 4, ig = this.M.groundAt(ix, iz);
            this.fx.tracer(ff.obj.position.x, ff.obj.position.y - 1, ff.obj.position.z, ix, ig, iz, 0xffd27a);
            this.later(0.12, () => { this.fx.dust(ix, ig, iz, 0.7); this.fx.sparks(ix, ig + 0.5, iz); this.near(ix, iz, p.r, o => { if (o.team !== team && o.alive && !o.isHQ && !SM.isAir(o.cls)) this.damage(o, p.dmg, 70, src, { kind: 'auto' }); }); });
            if (i % 3 === 0) SM.Audio.shot('auto', this.vol({ x: ix, z: iz }));
          } });
        }
        f.events.sort((a, b) => a.t - b.t);
        break;
      }
      case 'missiles': {
        const n = Math.max(1, Math.round(p.n * scale));
        for (let i = 0; i < n; i++) this.later(0.6 + i * 0.3, () => {
          const tg = enemiesNear(x, z, R).filter(o => !SM.isAir(o.cls)).sort((a, b) => (b.squad ? 0 : 1) - (a.squad ? 0 : 1) || b.def.cp - a.def.cp);
          const t = tg[i % Math.max(1, tg.length)];
          const tx = t ? t.pos.x : x + (Math.random() - 0.5) * R, tz = t ? t.pos.z : z + (Math.random() - 0.5) * R;
          const pr = this.spawnProjectile(src, t || null, 'missile', new T.Vector3(tx + (Math.random() - 0.5) * 60, this.M.groundAt(tx, tz) + 140, tz + (team ? -80 : 80)), new T.Vector3(tx, this.M.groundAt(tx, tz), tz), !!t && Math.random() < 0.88, p.dmg, p.pen || 180, 1);
          pr.vx = 0; pr.vy = -40; pr.vz = 0;
        });
        break;
      }
      case 'cluster': case 'napalmrun': case 'carpetrun': {
        const f = this.flyby(team, x, z, s.fx === 'carpetrun' ? 'bomber' : 'cas', { speed: s.fx === 'carpetrun' ? 55 : 70, alt: s.fx === 'carpetrun' ? 60 : 40 });
        const lead = 260, n = Math.max(1, Math.round(p.n * scale));
        for (let i = 0; i < n; i++) {
          const off = s.fx === 'cluster' ? 0 : (i / Math.max(1, n - 1) - 0.5) * p.len;
          f.events.push({ t: (lead + off - 18) / f.speed + (s.fx === 'cluster' ? i * 0.04 : 0), fn: ff => {
            const bx = x + ff.dx * off + (s.fx === 'cluster' ? (Math.random() - 0.5) * R * 2 : 0), bz = z + ff.dz * off + (s.fx === 'cluster' ? (Math.random() - 0.5) * R * 2 : 0), bg = this.M.groundAt(bx, bz);
            if (s.fx === 'napalmrun') { this.later(0.6, () => { this.zones.push({ kind: 'fire', x: bx, z: bz, r: p.r, t: p.dur, team, from: src }); this.fx.explosion(bx, bg, bz, 1.4); SM.Audio.boom(1.4, this.vol({ x: bx, z: bz })); }); return; }
            const pr = this.spawnProjectile(src, null, 'bomb', new T.Vector3(ff.obj.position.x, ff.obj.position.y - 2, ff.obj.position.z), new T.Vector3(bx, bg, bz), false, p.dmg, 120, 1);
            pr.aoe = s.fx === 'cluster' ? 5 : p.r;
          } });
        }
        f.events.sort((a, b) => a.t - b.t);
        break;
      }
      case 'gunship': {
        const def = this.stratUnitDef(team, 'hgun', 5);
        const n = Math.max(1, Math.round(p.n * scale));
        for (let i = 0; i < n; i++) {
          const hq = this.M.hq[team];
          const u = this.spawnUnit(team, { def, mods: [], skin: null }, hq.x + (i - n / 2) * 12, hq.z + (team ? -20 : 20), { free: true, alt: 20 });
          u.summon = true; u.decoyT = p.dur * scale; this.teams[team].pop -= u.cls.pop;
          this.order(u, { type: 'amove', x: x + (i - n / 2) * 10, z });
        }
        break;
      }
      case 'supply': {
        this.teams[team].cp = Math.min(9999, this.teams[team].cp + p.cpGain * scale);
        const hq = this.M.hq[team]; this.podDrop(team, hq.x + 12, hq.z + (team ? 18 : -18), null, false);
        break;
      }
      case 'healzone': case 'hospital': case 'ammozone': case 'jamzone': {
        const kind = { healzone: 'heal', hospital: 'hospital', ammozone: 'ammo', jamzone: 'jam' }[s.fx];
        const col = { heal: 0x7aff9a, hospital: 0xfff0f0, ammo: 0xffd36a, jam: 0xc58cff }[kind];
        const go = () => {
          const ring = new T.Mesh(this.ringGeo, new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, depthWrite: false }));
          ring.scale.setScalar(R); ring.position.set(x, g + 0.4, z); this.scene.add(ring);
          this.zones.push({ kind, x, z, r: R, t: (p.dur || 10) * scale, team, rate: (p.heal || 0) / (p.dur || 10), mesh: ring, col });
        };
        if (kind === 'jam') go(); else this.podDrop(team, x, z, go, false);
        break;
      }
      case 'fuel': this.teams[team].fuelT = p.dur * scale; for (const u of this.units) if (u.team === team && u.alive && !u.isHQ) this.fx.glowAt(u.pos.x, u.pos.y + 2, u.pos.z, 0xffb347, 6); break;
      case 'resetcd': this.fx.glowAt(x, g + 2, z, 0x7affd8, R); this.near(x, z, R, o => { if (o.team === team && o.alive && o.abil) o.abil.forEach(a => a.cd = 0); }); break;
      case 'sentry': {
        const def = this.stratUnitDef(team, p.cls, s.rank + 1);
        const n = Math.max(1, Math.round(p.n * (scale < 1 ? 0.5 : 1)));
        for (let i = 0; i < n; i++) {
          const px = x + (n > 1 ? (i - (n - 1) / 2) * 9 : 0), pz = z;
          this.podDrop(team, px, pz, () => { const u = this.spawnUnit(team, { def, mods: [], skin: null }, px, pz, { free: true, yaw: team ? 0 : PI }); u.summon = true; u.decoyT = p.dur * scale; }, false);
        }
        break;
      }
      case 'dome': this.addDome(team, x, z, R, p.dur * scale); break;
      case 'minefield': {
        const n = Math.max(1, Math.round(p.n * scale));
        for (let i = 0; i < n; i++) {
          const a = Math.random() * PI * 2, rr = Math.sqrt(Math.random()) * R, mx = x + Math.cos(a) * rr, mz = z + Math.sin(a) * rr;
          const m = new T.Mesh(new T.CylinderGeometry(0.6, 0.7, 0.25, 8), new T.MeshStandardMaterial({ color: team ? 0x5a2a22 : 0x2a3a4a }));
          m.position.set(mx, this.M.groundAt(mx, mz) + 0.1, mz); m.visible = team === 0; this.scene.add(m);
          this.zones.push({ kind: 'mine', x: mx, z: mz, r: 4, t: 240, team, mesh: m, from: src });
        }
        break;
      }
      case 'reveal': case 'scan': {
        const all = s.fx === 'scan';
        for (const o of this.units) if (o.team !== team && o.alive && (all || Math.hypot(o.pos.x - x, o.pos.z - z) < R)) { o.buffs.revealed = p.dur * scale; o.buffs.revealedBy = team; }
        if (!all) for (let i = 0; i < 40; i++) { const a = i / 40 * PI * 2; this.fx.fire.spawn(x + Math.cos(a) * R * 0.2, g + 2, z + Math.sin(a) * R * 0.2, Math.cos(a) * R * 0.8, 0, Math.sin(a) * R * 0.8, 1.2, 3, 1, 0x7affd8, 0.9, 0, 0); }
        this.updateVisibility();
        break;
      }
      case 'blackout': this.teams[1 - team].blackoutT = p.dur * scale; if (team === 1) this.addFeed('Our sensors are blacked out!', '#ff8a7a'); break;
      case 'spoof': {
        const best = this.units.filter(u => u.team === team && u.alive && !u.isHQ && !SM.isAir(u.cls) && !u.isDecoy && u.card && u.cls.move !== 'static').sort((a, b) => b.def.cp - a.def.cp)[0];
        if (!best) break;
        const n = Math.max(1, Math.round(p.n * scale));
        for (let i = 0; i < n; i++) {
          const d = this.spawnUnit(team, best.card, x + (i - (n - 1) / 2) * 10, z + (Math.random() - 0.5) * 8, { free: true });
          d.isDecoy = true; d.summon = true; d.hp = d.maxHp = 1; d.decoyT = p.dur; d.rof = 0; this.teams[team].pop -= d.cls.pop; d.order = { type: 'idle' };
          d.obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.6; } });
        }
        break;
      }
      case 'drop': {
        const def = this.stratUnitDef(team, p.cls, s.rank + 1);
        const n = Math.max(1, Math.round(p.n * (scale < 1 ? 0.5 : 1)));
        const big = p.cls === 'titan' || p.cls === 'htank';
        for (let i = 0; i < n; i++) {
          const px = x + (n > 1 ? (i - (n - 1) / 2) * 10 : 0), pz = z + (Math.random() - 0.5) * 4;
          this.later(i * 0.4, () => this.podDrop(team, px, pz, () => {
            let fx = px, fz = pz;
            const c = SM.cellOf(this.M, fx, fz); if (!this.M.nav.ground[c]) { const c2 = SM.nearestOpen(this.M, this.M.nav.ground, c, 10); if (c2 >= 0) { const q = SM.cellCenter(this.M, c2); fx = q[0]; fz = q[1]; } }
            const u = this.spawnUnit(team, { def, mods: def.mods.slice(0, 4).map(m => m.id), skin: null }, fx, fz, { free: true, yaw: team ? 0 : PI });
            u.summon = true; this.teams[team].pop -= u.cls.pop;
            if (team === 0) this.addFeed(def.name + ' has landed.', '#9fd4ff');
          }, big, p.cls === 'titan' ? 12 : 0));
        }
        break;
      }
    }
  };

  // ---------------------------------------------------------------- zones added by stratagems
  const baseZones = P.updateZones;
  P.updateZones = function (dt) {
    for (const z of this.zones) {
      if (z.kind === 'olaser') {
        // track the nearest enemy
        let best = null, bd = 70;
        this.near(z.x, z.z, 70, o => { if (o.team !== z.team && o.alive && !o.isHQ && !SM.isAir(o.cls)) { const d = Math.hypot(o.pos.x - z.x, o.pos.z - z.z); if (d < bd) { bd = d; best = o; } } });
        if (best) { const d = Math.max(0.01, bd), sp = Math.min(d, 11 * dt); z.x += (best.pos.x - z.x) / d * sp; z.z += (best.pos.z - z.z) / d * sp; }
        const g = this.M.groundAt(z.x, z.z);
        if (Math.random() < 0.7) this.fx.lines.add(z.x + (Math.random() - 0.5) * 2, g + 400, z.z + (Math.random() - 0.5) * 2, z.x, g, z.z, z.team ? 0xff6a8a : 0xff6ad8, 0.12);
        this.fx.glowAt(z.x, g + 0.5, z.z, 0xffd0f0, z.r * 1.5);
        if (Math.random() < dt * 20) this.fx.fire.spawn(z.x + (Math.random() - 0.5) * z.r, g + 0.5, z.z + (Math.random() - 0.5) * z.r, 0, 6, 0, 0.6, 2, 0.5, 0xffa0e0, 1, 0, 8);
        this.near(z.x, z.z, z.r, o => { if (o.team !== z.team && o.alive && !SM.isAir(o.cls)) this.damage(o, z.dps * dt, 300, z.src, { aoe: true, kind: 'laser' }); });
      } else if (z.kind === 'heal' || z.kind === 'hospital') {
        this.near(z.x, z.z, z.r, o => { if (o.team === z.team && o.alive && !o.isHQ && (z.kind === 'heal' || o.squad)) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * z.rate * dt); if (o.squad) this.syncSquad(o); o.repairFx = 0.3; } });
        if (Math.random() < dt * 10) this.fx.fire.spawn(z.x + (Math.random() - 0.5) * z.r * 1.4, this.M.groundAt(z.x, z.z) + 0.5, z.z + (Math.random() - 0.5) * z.r * 1.4, 0, 3, 0, 1, 1.5, 0.4, z.col, 0.9, 0, 0);
      } else if (z.kind === 'ammo') {
        this.near(z.x, z.z, z.r, o => { if (o.team === z.team && o.alive) o.buffs.ammoT = 0.5; });
        if (Math.random() < dt * 6) this.fx.fire.spawn(z.x + (Math.random() - 0.5) * z.r * 1.4, this.M.groundAt(z.x, z.z) + 0.5, z.z + (Math.random() - 0.5) * z.r * 1.4, 0, 3, 0, 1, 1.2, 0.4, z.col, 0.9, 0, 0);
      } else if (z.kind === 'jam') {
        this.near(z.x, z.z, z.r, o => { if (o.team !== z.team && o.alive) o.buffs.ecmDebuff = Math.max(o.buffs.ecmDebuff || 0, 0.5); });
        if (Math.random() < dt * 8) this.fx.fire.spawn(z.x + (Math.random() - 0.5) * z.r * 1.4, this.M.groundAt(z.x, z.z) + 2, z.z + (Math.random() - 0.5) * z.r * 1.4, 0, 1, 0, 0.8, 1.5, 0.3, z.col, 0.8, 0, 0);
      } else if (z.kind === 'dome' && z.mesh) {
        z.mesh.material.opacity = 0.1 + 0.06 * Math.sin(this.time * 3) + (z.t < 2 ? -0.08 * (2 - z.t) : 0);
      }
      if (z.mesh && (z.kind === 'heal' || z.kind === 'hospital' || z.kind === 'ammo' || z.kind === 'jam')) { z.mesh.material.opacity = Math.min(0.6, z.t) * (0.7 + 0.3 * Math.sin(this.time * 4)); }
    }
    baseZones.call(this, dt);
  };

  // ---------------------------------------------------------------- AI
  P.aiStrat = function (team) {
    const tm = this.teams[team], list = this.strats[team];
    const enemies = this.units.filter(o => o.team !== team && o.alive && !o.isHQ && o.vis[team] && !SM.isAir(o.cls));
    const mine = this.units.filter(o => o.team === team && o.alive && !o.isHQ);
    list.forEach((s, i) => {
      if (this.canStrat(team, i) || tm.cp < s.p.cost + 120) return;
      if (Math.random() < 0.35) return;
      const fx = s.def.fx;
      let x, z, go = false;
      if (OFFENSIVE[fx] || fx === 'reveal') {
        let best = null, bn = 0;
        for (const e of enemies) { let n = 0; this.near(e.pos.x, e.pos.z, 25, o => { if (o.team !== team && o.alive && !o.isHQ) n += o.def ? Math.max(1, o.def.cp / 250) : 1; }); if (n > bn) { bn = n; best = e; } }
        if (best && (bn >= 2.5 || best.def.cp >= 450)) { x = best.pos.x; z = best.pos.z; go = true; }
      } else if (SUPPORT[fx]) {
        let best = null, bn = 0;
        for (const u of mine) { if (this.time - u.lastHit > 4) continue; let n = 0; this.near(u.pos.x, u.pos.z, 22, o => { if (o.team === team && o.alive && this.time - o.lastHit < 4) n++; }); if (n > bn) { bn = n; best = u; } }
        if (best && bn >= 2) { x = best.pos.x; z = best.pos.z; go = true; }
      } else if (fx === 'sentry' || fx === 'minefield' || fx === 'drop' || fx === 'spoof') {
        const pts = this.points.filter(p => p.owner !== team || p.contested).sort((a, b) => Math.hypot(a.x - this.M.hq[team].x, a.z - this.M.hq[team].z) - Math.hypot(b.x - this.M.hq[team].x, b.z - this.M.hq[team].z));
        const tp = pts[0] || this.points[Math.floor(Math.random() * this.points.length)];
        x = tp.x + (Math.random() - 0.5) * 20; z = tp.z + (team ? -1 : 1) * 15; go = fx !== 'minefield' || Math.random() < 0.5;
      } else if (fx === 'supply') go = tm.cp < s.p.cost + 400;
      else go = this.time > 90 && mine.length > 5 && Math.random() < 0.3;
      if (go) this.callStrat(team, i, x, z);
    });
  };

  // ---------------------------------------------------------------- stratagem bar UI
  P.initStratUI = function () {
    if (!this.strats[0].length) return;
    const root = this.o.root;
    const bar = document.createElement('div'); bar.className = 'b-strat';
    bar.innerHTML = this.strats[0].map((s, i) => { const br = SM.STRAT_BRANCHES.find(b => b.id === s.def.br); return `<button class="sg" data-i="${i}" style="--bc:${br.color}" title="${esc(s.def.name + ' — ' + s.def.desc)}"><i>${'TYUI'[i]}</i><b>${esc(s.def.name)}</b><span>${s.p.cost} CP</span><em></em></button>`; }).join('');
    root.appendChild(bar);
    this.el.strat = bar;
    bar.querySelectorAll('.sg').forEach(b => b.addEventListener('click', () => { SM.Audio.init(); this.triggerStrat(+b.dataset.i); }));
  };
  P.triggerStrat = function (i) {
    const s = this.strats[0][i]; if (!s) return;
    const why = this.canStrat(0, i);
    if (why) { this.flashMsg(why === 'cp' ? 'Not enough Command Points for ' + s.def.name : s.def.name + ' is on cooldown'); return; }
    if (s.def.target === 'none') { this.callStrat(0, i); return; }
    this.mode = { type: 'strat', i, r: s.p.r || 8, name: s.def.name };
  };
  P.updateStratHUD = function () {
    if (!this.el.strat) return;
    const btns = this.el.strat.children;
    this.strats[0].forEach((s, i) => {
      const b = btns[i]; if (!b) return;
      const why = this.canStrat(0, i);
      b.classList.toggle('off', !!why);
      b.querySelector('em').style.width = s.cd > 0 ? (100 - s.cd / s.p.cooldown * 100) + '%' : '0';
      b.querySelector('span').textContent = s.cd > 0 ? Math.ceil(s.cd) + 's' : s.p.cost + ' CP';
    });
  };
})();
