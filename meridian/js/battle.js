'use strict';
// Battle simulation: units, movement, combat, abilities, capture points, tickets and the AI commander.
(function () {
  const T = THREE, PI = Math.PI;
  const angDiff = (a, b) => { let d = a - b; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; return d; };
  const approach = (v, t, s) => v < t ? Math.min(t, v + s) : Math.max(t, v - s);
  const V3 = new T.Vector3(), V3b = new T.Vector3();
  SM.angDiff = angDiff;

  const HQ_CLS = { key: 'hq', name: 'Headquarters', move: 'static', r: 22, aa: 2, range: 95, sight: 130, wt: 'cannon' };

  SM.Battle = class Battle {
    constructor(o) {
      this.o = o;
      this.renderer = o.renderer;
      this.quality = o.quality || 'medium';
      this.def = SM.MAP[o.mapId];
      this.time = 0; this.speed = 1; this.paused = false; this.over = false;
      this.units = []; this.dying = []; this.projectiles = []; this.zones = []; this.timers = [];
      this.uid = 0; this.pathQueue = [];
      this.feed = [];
      this.stats = { kills: [0, 0], losses: [0, 0], captures: [0, 0], deployed: {}, unitScore: {}, dmg: [0, 0], destroyedBy: {}, killsByClass: {}, inf: 0, veh: 0, air: 0 };
      this.visT = 0; this.capT = 0; this.bleedT = 0;
      this.hash = new Map();
    }

    // ---------------------------------------------------------- setup
    init() {
      const o = this.o, def = this.def;
      const N = this.quality === 'low' ? 160 : this.quality === 'high' ? 224 : 192;
      const M = this.M = SM.genMap(def, N);
      const scene = this.scene = new T.Scene();
      const tm = this.tm = SM.TIMES[def.time];
      this.sunDir = new T.Vector3().fromArray(tm.sun).normalize();
      // sky + environment
      this.sky = SM.buildSky(def.time, M.biome); scene.add(this.sky);
      const envScene = new T.Scene();
      const eg = new T.SphereGeometry(50, 24, 12), ec = [], top = new T.Color(tm.top), hor = new T.Color(tm.horizon), gnd = new T.Color(M.biome.low).multiplyScalar(0.5);
      for (let i = 0; i < eg.attributes.position.count; i++) { const y = eg.attributes.position.getY(i) / 50; const c = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : hor.clone().lerp(gnd, Math.min(1, -y * 3)); ec.push(c.r, c.g, c.b); }
      eg.setAttribute('color', new T.Float32BufferAttribute(ec, 3));
      envScene.add(new T.Mesh(eg, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
      const pm = new T.PMREMGenerator(this.renderer);
      this.envRT = pm.fromScene(envScene, 0.02);
      scene.environment = this.envRT.texture;
      pm.dispose(); eg.dispose();
      // lights
      this.hemi = new T.HemisphereLight(tm.hemiSky, tm.hemiGround, tm.hemiI); scene.add(this.hemi);
      const sun = this.sunLight = new T.DirectionalLight(tm.sunColor, tm.sunI);
      sun.castShadow = this.quality !== 'low';
      const sm = this.quality === 'high' ? 4096 : 2048;
      sun.shadow.mapSize.set(sm, sm);
      const sc = sun.shadow.camera; sc.left = -130; sc.right = 130; sc.top = 130; sc.bottom = -130; sc.near = 1; sc.far = 700;
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5;
      scene.add(sun); scene.add(sun.target);
      // fog
      this.fogBase = new T.Color(M.biome.fog).lerp(new T.Color(tm.horizon), 0.35);
      if (def.time === 'night') this.fogBase.multiplyScalar(0.25); else if (def.time === 'dusk') this.fogBase.multiplyScalar(0.75);
      scene.fog = new T.FogExp2(this.fogBase.clone(), 0.0015);
      // terrain
      this.terrain = SM.buildTerrainMesh(M); scene.add(this.terrain);
      this.terrainMesh = this.terrain.children[0];
      this.water = SM.buildWater(M, tm.sun); if (this.water) scene.add(this.water);
      this.props = SM.buildProps(M, this.quality); scene.add(this.props);
      this.fx = new SM.FX(scene, this.quality);
      if (M.lava && this.water) this.lavaLight = true;
      // teams
      const enemyFac = o.enemyFaction;
      this.teams = [0, 1].map(t => ({
        id: t, fac: t ? enemyFac : o.playerFaction, color: t ? 0xff4b3a : 0x38a6ff, css: t ? '#ff5b4a' : '#46b2ff',
        cp: 900, tickets: 800, pop: 0, popCap: 40, cards: (t ? o.enemyLineup : o.lineup).map(e => ({ ...e, cd: 0, def: SM.getUnit(e.id) })).filter(c => c.def),
        incomeMul: t ? (o.diff.income || 1) : 1, accMul: t ? (o.diff.acc || 1) : 1,
        rally: null,
      }));
      // HQs
      M.hq.forEach((h, t) => {
        const team = this.teams[t];
        const obj = SM.buildHQ(team.fac, team.color);
        const y = M.heightAt(h.x, h.z);
        obj.position.set(h.x, y, h.z);
        obj.rotation.y = t ? 0 : PI; // face the centre
        scene.add(obj);
        const hq = this.makeHQ(t, obj, h.x, y, h.z);
        team.hq = hq;
      });
      // capture points
      this.points = M.points.map(p => {
        const obj = SM.buildCapturePoint(p.letter);
        obj.position.set(p.x, M.heightAt(p.x, p.z), p.z);
        scene.add(obj);
        return { x: p.x, z: p.z, letter: p.letter, owner: -1, prog: 0, obj, flag: obj.getObjectByName('flag'), ring: obj.getObjectByName('ring'), fill: obj.getObjectByName('fill'), label: obj.getObjectByName('label'), contested: false, present: [0, 0] };
      });
      // weather
      this.weather = new SM.Weather(scene, M, def.weather, this.quality, id => this.onWeather(id));
      // shared materials for rings / wrecks
      this.ringGeo = new T.RingGeometry(0.86, 1, 40); this.ringGeo.rotateX(-PI / 2);
      this.ringMat = [new T.MeshBasicMaterial({ color: 0x46b2ff, transparent: true, opacity: 0.22, depthWrite: false }), new T.MeshBasicMaterial({ color: 0xff5b4a, transparent: true, opacity: 0.3, depthWrite: false }), new T.MeshBasicMaterial({ color: 0x9cf0ff, transparent: true, opacity: 0.95, depthWrite: false })];
      this.charMat = new T.MeshStandardMaterial({ color: 0x1b1918, roughness: 1, metalness: 0.1 });
      this.projMats = {
        shell: new T.MeshBasicMaterial({ color: 0xffd28a, toneMapped: false }),
        plasma: new T.MeshBasicMaterial({ color: 0x7ef6ff, toneMapped: false, transparent: true, opacity: 0.95, blending: T.AdditiveBlending }),
        plasmaR: new T.MeshBasicMaterial({ color: 0xd07aff, toneMapped: false, transparent: true, opacity: 0.95, blending: T.AdditiveBlending }),
        missile: new T.MeshStandardMaterial({ color: 0xdedede, roughness: 0.5, metalness: 0.4 }),
        bomb: new T.MeshStandardMaterial({ color: 0x3a3c3e, roughness: 0.6, metalness: 0.5 }),
      };
      this.projGeo = { shell: new T.SphereGeometry(0.28, 6, 4), plasma: new T.SphereGeometry(0.75, 8, 6), missile: new T.CylinderGeometry(0.18, 0.18, 1.8, 6).rotateX(PI / 2), bomb: new T.CylinderGeometry(0.4, 0.4, 2.2, 8).rotateX(PI / 2) };
      this.projPool = {};
      // cursor ring for ability targeting
      this.cursorRing = new T.Mesh(new T.RingGeometry(0.92, 1, 48).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.8, depthWrite: false }));
      this.cursorRing.visible = false; this.cursorRing.renderOrder = 9; scene.add(this.cursorRing);
      this.markers = [];
      // camera
      this.camera = new T.PerspectiveCamera(48, 1, 1, 4200);
      const hq0 = M.hq[0];
      this.cam = { x: hq0.x, z: hq0.z - 60, dist: 170, yaw: 0, tx: hq0.x, tz: hq0.z - 60, tdist: 170, tyaw: 0 };
      this.setupAI();
      this.initUI();
      this.addFeed('Battle started on ' + def.name + '. Capture and hold the points to drain enemy tickets.', '#cfe3f2');
      this.onWeather(this.weather.cur, true);
    }

    makeHQ(t, obj, x, y, z) {
      const turrets = [];
      obj.traverse(o => { if (o.name === 'turret') turrets.push({ g: o, gun: o.getObjectByName('gun'), barrel: o.getObjectByName('barrel'), reload: 1, yaw: 0 }); });
      const radar = obj.getObjectByName('radar');
      const hq = {
        id: ++this.uid, isHQ: true, team: t, def: { id: 'hq', name: 'Headquarters', wt: 'cannon', cls: 'hq', rank: 1, cp: 0 }, cls: HQ_CLS,
        pos: new T.Vector3(x, y + 4, z), yaw: 0, hp: 9000, maxHp: 9000, armor: 120, sight: 135, range: 95, dmg: 150, pen: 150, acc: 0.65, rof: 0.5,
        obj, turrets, radar, buffs: {}, vis: [true, true], squad: 0, radius: 22, alive: true, speed: 0,
      };
      this.units.push(hq);
      return hq;
    }

    // ---------------------------------------------------------- stats & spawning
    calcStats(def, mods, skin, team) {
      const m = { hp: 0, armor: 0, speed: 0, dmg: 0, pen: 0, rof: 0, sight: 0, acc: 0, stealth: 0 };
      (mods || []).forEach(id => { const md = def.mods.find(x => x.id === id); if (md && md.eff) for (const k in md.eff) m[k] = (m[k] || 0) + md.eff[k]; });
      const sa = SM.skinAttrs(def.id, def.finish || skin || 'factory');
      for (const k in sa) m[k] = (m[k] || 0) + sa[k];
      const tm = this.teams[team];
      return {
        hp: Math.round(def.hp * (1 + m.hp)), armor: def.armor * (1 + m.armor), speed: def.speed * (1 + m.speed), dmg: def.dmg * (1 + m.dmg),
        pen: def.pen * (1 + (m.pen || 0)), rof: def.rof * (1 + m.rof), sight: def.sight * (1 + m.sight), acc: Math.min(0.97, def.acc * (1 + m.acc) * tm.accMul),
        range: def.range, stealth: m.stealth || 0,
      };
    }

    spawnUnit(team, card, x, z, opts) {
      opts = opts || {};
      const def = card.def, cls = SM.CLASSES[def.cls];
      const inst = SM.instantiate(def, card.mods || [], card.skin);
      const st = this.calcStats(def, card.mods, card.skin, team);
      const u = {
        id: ++this.uid, team, def, cls, card, obj: inst.obj, rig: inst.rig,
        pos: new T.Vector3(x, 0, z), yaw: opts.yaw !== undefined ? opts.yaw : (team ? 0 : PI), speed: 0, vy: 0,
        hp: st.hp, maxHp: st.hp, armor: st.armor, maxSpeed: st.speed, dmg: st.dmg, pen: st.pen, rof: st.rof, sight: st.sight, acc: st.acc, range: st.range, stealth: st.stealth,
        radius: cls.r * (cls.scale || 1), squad: cls.squad || 0, perSoldier: cls.squad ? st.hp / cls.squad : 0,
        order: { type: 'idle' }, path: null, pathIdx: 0, target: null, forced: null, retarget: Math.random() * 0.3, reload: Math.random() * 1.5,
        recoil: 0, turretYaw: 0, torsoYaw: 0, buffs: {}, vis: [team === 0, team === 1], lastSeen: [0, 0], alive: true,
        abil: SM.unitAbilities(def, card.mods).map(id => ({ id, cd: 4 + Math.random() * 3 })),
        phase: Math.random() * 6, stuck: 0, lastHit: -99, kills: 0, dmgDone: 0, spawnT: this.time, alt: 0, bank: 0, pitch: 0, roll: 0,
        anchor: null,
      };
      if (cls.move === 'plane') { u.loiter = cls.loiter || 60; u.alt = 70 + Math.random() * 15; u.speed = st.speed; }
      if (cls.move === 'heli') u.alt = opts.alt || 0;
      u.pos.y = this.surfaceY(u, x, z);
      if (cls.move === 'plane') u.pos.y = u.alt;
      u.obj.rotation.order = 'YXZ';
      u.obj.position.copy(u.pos);
      u.obj.rotation.y = u.yaw;
      this.scene.add(u.obj);
      u.ring = new T.Mesh(this.ringGeo, this.ringMat[team]);
      u.ring.scale.setScalar(u.radius * 1.15); u.ring.renderOrder = 3;
      this.scene.add(u.ring);
      this.units.push(u);
      this.teams[team].pop += cls.pop;
      if (!opts.free) { this.stats.deployed[def.id] = (this.stats.deployed[def.id] || 0) + (team === 0 ? 1 : 0); }
      return u;
    }

    surfaceY(u, x, z) {
      const mv = u.cls.move, M = this.M;
      const g = M.groundAt(x, z);
      if (mv === 'naval') return M.water !== null ? M.water : g;
      if (mv === 'sub') return M.water !== null ? M.water - (u.buffs.cloak > 0 ? 3.5 : 0.9) : g;
      if (mv === 'amphib' || mv === 'hover') return Math.max(g, M.water !== null && !M.lava ? M.water : -999) + (mv === 'amphib' ? 0.1 : 0);
      if (mv === 'heli') return Math.max(g, M.water !== null ? M.water : -999) + (u.alt || 0);
      if (mv === 'plane') return u.alt;
      return g;
    }

    gridFor(u) {
      const mv = u.cls.move;
      if (mv === 'naval' || mv === 'sub') return this.M.nav.naval;
      if (mv === 'hover' || mv === 'amphib') return this.M.nav.amphib;
      if (mv === 'heli' || mv === 'plane') return null;
      return this.M.nav.ground;
    }

    canDeploy(team, card) {
      const tm = this.teams[team], cls = SM.CLASSES[card.def.cls];
      if (card.cd > 0) return 'cooldown';
      if (tm.cp < card.def.cp) return 'cp';
      if (tm.pop + cls.pop > tm.popCap) return 'pop';
      if (SM.isNaval(cls) && !this.M.docks[team]) return 'nowater';
      return null;
    }

    deploy(team, idx) {
      const tm = this.teams[team], card = tm.cards[idx];
      if (!card || this.canDeploy(team, card)) return null;
      tm.cp -= card.def.cp;
      card.cd = 8 + card.def.rank * 2;
      const cls = SM.CLASSES[card.def.cls], hq = this.M.hq[team], dir = team ? 1 : -1;
      let u;
      const front = this.rallyFor(team);
      if (cls.move === 'plane') {
        const x = hq.x + (Math.random() - 0.5) * 120, z = team ? -330 : 330;
        u = this.spawnUnit(team, card, x, z, { yaw: team ? 0 : PI });
        this.order(u, { type: 'amove', x: front.x, z: front.z });
      } else if (SM.isNaval(cls) && cls.move !== 'amphib') {
        const d = this.M.docks[team];
        u = this.spawnUnit(team, card, d.x + (Math.random() - 0.5) * 8, d.z + (Math.random() - 0.5) * 8, { yaw: team ? 0 : PI });
      } else if (cls.move === 'amphib') {
        const d = this.M.docks[team] || hq;
        u = this.spawnUnit(team, card, d.x, d.z, { yaw: team ? 0 : PI });
      } else if (cls.move === 'heli') {
        const x = hq.x + (team ? -14 : 14), z = hq.z + (team ? -10 : 10);
        u = this.spawnUnit(team, card, x, z, { alt: 0.5 });
        u.climb = true;
        this.order(u, { type: 'move', x: front.x + (Math.random() - 0.5) * 20, z: front.z + (Math.random() - 0.5) * 20 });
      } else {
        const off = (Math.random() - 0.5) * 40;
        let x = hq.x + off, z = hq.z + dir * 30;
        const c = SM.cellOf(this.M, x, z);
        if (!this.M.nav.ground[c]) { const c2 = SM.nearestOpen(this.M, this.M.nav.ground, c, 10); if (c2 >= 0) { const p = SM.cellCenter(this.M, c2); x = p[0]; z = p[1]; } }
        u = this.spawnUnit(team, card, x, z);
        this.order(u, { type: 'move', x: front.x + (Math.random() - 0.5) * 24, z: front.z + (Math.random() - 0.5) * 16 });
      }
      if (u && (SM.isNaval(cls) && cls.move !== 'amphib')) { const d = this.M.docks[team]; this.order(u, { type: 'move', x: d.x + (Math.random() - 0.5) * 30, z: d.z + dir * 25 }); }
      if (team === 0) { SM.Audio.deploy(); this.addFeed(card.def.name + ' deployed.', '#9fd4ff'); }
      if (team === 0 && this.o.onDeploy) this.o.onDeploy(card.def);
      return u;
    }

    rallyFor(team) {
      const tm = this.teams[team];
      if (tm.rally) return tm.rally;
      const hq = this.M.hq[team];
      return { x: hq.x, z: hq.z + (team ? 55 : -55) };
    }

    // ---------------------------------------------------------- orders
    order(u, o) {
      if (!u.alive || u.isHQ) return;
      u.order = o;
      u.forced = o.type === 'attack' ? o.target : null;
      u.path = null; u.pathIdx = 0; u.stuck = 0; u.anchor = null;
      if (u.buffs.siege && (o.type === 'move' || o.type === 'amove')) { u.buffs.siege = false; }
      if ((o.type === 'move' || o.type === 'amove') && this.gridFor(u)) this.requestPath(u, o.x, o.z);
      if (o.type === 'move' || o.type === 'amove') u.dest = { x: o.x, z: o.z };
    }
    requestPath(u, x, z) {
      u.pathPending = true;
      if (this.pathQueue.indexOf(u) < 0) this.pathQueue.push(u);
      u.pathGoal = { x, z };
    }
    processPaths() {
      let n = 0;
      while (this.pathQueue.length && n < 6) {
        const u = this.pathQueue.shift();
        if (!u.alive || !u.pathGoal) continue;
        const grid = this.gridFor(u);
        if (!grid) { u.pathPending = false; continue; }
        const p = SM.findPath(this.M, grid, u.pos.x, u.pos.z, u.pathGoal.x, u.pathGoal.z, 26000);
        u.path = p && p.length ? p : null; u.pathIdx = 0; u.pathPending = false;
        if (!u.path && (u.order.type === 'move' || u.order.type === 'amove')) u.order = { type: 'idle' };
        n++;
      }
    }
    groupOrder(list, type, x, z, target) {
      if (!list.length) return;
      if (type === 'attack') { list.forEach(u => this.order(u, { type: 'attack', target })); return; }
      // formation: rows perpendicular to the direction of travel
      let cx = 0, cz = 0; list.forEach(u => { cx += u.pos.x; cz += u.pos.z; }); cx /= list.length; cz /= list.length;
      const dir = Math.atan2(x - cx, z - cz), rx = Math.cos(dir), rz = -Math.sin(dir), fx = Math.sin(dir), fz = Math.cos(dir);
      const sorted = list.slice().sort((a, b) => b.radius - a.radius);
      const per = Math.ceil(Math.sqrt(list.length * 1.6));
      let maxR = 0; sorted.forEach(u => maxR = Math.max(maxR, u.radius));
      const sp = Math.max(9, maxR * 2.3);
      sorted.forEach((u, i) => {
        const row = Math.floor(i / per), col = i % per - (Math.min(per, list.length - row * per) - 1) / 2;
        const ox = rx * col * sp - fx * row * sp, oz = rz * col * sp - fz * row * sp;
        this.order(u, { type, x: x + ox, z: z + oz });
      });
    }

    // ---------------------------------------------------------- main loop
    update(dtReal) {
      if (this.paused || this.over) return;
      let dt = Math.min(0.1, dtReal) * this.speed;
      while (dt > 0.0001) { const s = Math.min(dt, 0.05); this.step(s); dt -= s; if (this.over) break; }
    }

    step(dt) {
      this.time += dt;
      const wm = this.wm = this.weather.mods();
      // income
      for (const tm of this.teams) {
        const owned = this.points.filter(p => p.owner === tm.id).length;
        tm.cp = Math.min(9999, tm.cp + dt * (8 + 3 * owned) * tm.incomeMul);
        tm.cards.forEach(c => { if (c.cd > 0) c.cd = Math.max(0, c.cd - dt); });
      }
      this.processPaths();
      // spatial hash
      this.hash.clear();
      for (const u of this.units) { const k = ((u.pos.x + 400) / 24 | 0) * 100 + ((u.pos.z + 400) / 24 | 0); let a = this.hash.get(k); if (!a) this.hash.set(k, a = []); a.push(u); }
      this.visT -= dt; if (this.visT <= 0) { this.visT = 0.25; this.updateVisibility(); }
      for (let i = 0; i < this.units.length; i++) { const u = this.units[i]; if (u.alive) this.updateUnit(u, dt, wm); }
      this.separate(dt);
      this.updateProjectiles(dt);
      this.updateZones(dt);
      for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
      this.capT -= dt; if (this.capT <= 0) { this.capT = 0.2; this.updateCapture(0.2); }
      this.bleedT -= dt; if (this.bleedT <= 0) { this.bleedT = 2; this.bleed(); }
      this.updateAI(dt);
      // weather damage over time
      if (wm.burnInf > 0.01 || wm.corrode > 0.01) {
        for (const u of this.units) {
          if (u.isHQ || !u.alive) continue;
          let r = 0;
          if (u.cls.move === 'inf') r += wm.burnInf * 0.0016;
          if (!SM.isAir(u.cls)) r += wm.corrode * 0.0008;
          if (r > 0 && u.hp > u.maxHp * 0.12) u.hp = Math.max(u.maxHp * 0.12, u.hp - u.maxHp * r * dt);
          if (u.squad) this.syncSquad(u);
        }
      }
      this.updateDying(dt);
      if (this.time > 25 * 60 && !this.over) this.finish(this.teams[0].tickets >= this.teams[1].tickets ? 0 : 1, 'Time limit reached');
    }

    // ---------------------------------------------------------- visibility
    updateVisibility() {
      const wm = this.wm || { sight: 1 };
      for (const e of this.units) {
        if (!e.alive) continue;
        for (let t = 0; t < 2; t++) {
          if (e.team === t || e.isHQ) { e.vis[t] = true; continue; }
          let seen = false;
          if (e.buffs.revealed > 0 && e.buffs.revealedBy === t) seen = true;
          const cloaked = e.buffs.cloak > 0;
          const sub = e.cls.move === 'sub';
          const air = SM.isAir(e.cls);
          const smoke = this.inSmoke(e.pos.x, e.pos.z);
          if (!seen) for (const u of this.units) {
            if (u.team !== t || !u.alive) continue;
            const dx = u.pos.x - e.pos.x, dz = u.pos.z - e.pos.z, d = Math.sqrt(dx * dx + dz * dz);
            let s = u.sight * wm.sight * (1 - (e.stealth || 0) * 2);
            if (air) s *= 1.35;
            if (smoke) s *= 0.45;
            if (cloaked) s = 14;
            if (sub) s = Math.min(s, e.buffs.cloak > 0 ? 0 : 45);
            if (e.buffs.firedT > 0 && !cloaked) s = Math.max(s, sub ? 90 : s * 1.25);
            if (d < s) { seen = true; break; }
          }
          if (seen) e.lastSeen[t] = this.time;
          e.vis[t] = seen;
        }
      }
    }
    inSmoke(x, z) { for (const zn of this.zones) if (zn.kind === 'smoke' && Math.hypot(zn.x - x, zn.z - z) < zn.r) return true; return false; }

    // ---------------------------------------------------------- per-unit update
    updateUnit(u, dt, wm) {
      if (u.isHQ) { this.updateHQ(u, dt); return; }
      const b = u.buffs;
      for (const k of ['speedT', 'shieldT', 'cloak', 'flares', 'overT', 'stun', 'ecmDebuff', 'revealed', 'repairT', 'firedT', 'healT']) if (b[k] > 0) b[k] -= dt;
      if (b.shieldT <= 0) b.shield = 0;
      if (b.repairT > 0) { u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.35 / 6 * dt); if (u.squad) this.syncSquad(u); }
      if (b.healT > 0) { u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.25 / 5 * dt); if (u.squad) this.syncSquad(u); }
      for (const a of u.abil) if (a.cd > 0) a.cd -= dt * (wm.energy > 1 && a.id === 'shield' ? 1.5 : 1);
      u.recoil = Math.max(0, u.recoil - dt * 3);
      // engineers repair nearby machines
      if (u.cls.repairAura && Math.random() < dt * 2) {
        this.near(u.pos.x, u.pos.z, 26, o => { if (o.team === u.team && o.alive && !o.isHQ && !o.squad && o.hp < o.maxHp && !SM.isAir(o.cls)) { o.hp = Math.min(o.maxHp, o.hp + u.cls.repairAura * 0.5); o.repairFx = 0.6; } });
      }
      if (b.stun > 0) { u.speed = 0; this.place(u, dt); return; }
      const mv = u.cls.move;
      if (mv === 'plane') this.updatePlane(u, dt, wm);
      else if (mv === 'heli') this.updateHeli(u, dt, wm);
      else this.updateGround(u, dt, wm);
      this.updateCombat(u, dt, wm);
    }

    near(x, z, r, fn) {
      const r2 = r * r;
      const i0 = ((x - r + 400) / 24 | 0), i1 = ((x + r + 400) / 24 | 0), j0 = ((z - r + 400) / 24 | 0), j1 = ((z + r + 400) / 24 | 0);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const a = this.hash.get(i * 100 + j); if (!a) continue;
        for (const o of a) { const dx = o.pos.x - x, dz = o.pos.z - z; if (dx * dx + dz * dz <= r2) fn(o); }
      }
    }

    speedMul(u, wm) {
      let m = 1;
      if (u.buffs.speedT > 0) m *= u.buffs.speedMul || 1.6;
      const mv = u.cls.move;
      if (mv === 'naval' || mv === 'sub') m *= wm.navalSlow || 1;
      else if (mv !== 'heli' && mv !== 'plane' && mv !== 'hover') m *= wm.speed;
      return m;
    }

    goalFor(u) {
      // returns the point the unit should currently steer to, or null
      const o = u.order;
      if (u.buffs.siege) return null;
      if (o.type === 'attack') {
        const t = o.target;
        if (!t || !t.alive) { u.order = { type: 'idle' }; u.forced = null; return null; }
        const d = Math.hypot(t.pos.x - u.pos.x, t.pos.z - u.pos.z);
        const rng = this.effRange(u, t);
        if (d < rng * 0.85 && (t.vis[u.team] || t.isHQ)) { u.path = null; return null; }
        if (!this.gridFor(u)) return { x: t.pos.x, z: t.pos.z };
        if (!u.path || (u.repathT = (u.repathT || 0) - 0.05) < 0) { u.repathT = 2; if (!u.pathPending) this.requestPath(u, t.pos.x, t.pos.z); }
      }
      if (o.type === 'idle' && u.anchor && !u.path) return null;
      if (u.path && u.pathIdx < u.path.length) {
        const wp = u.path[u.pathIdx];
        const d = Math.hypot(wp[0] - u.pos.x, wp[1] - u.pos.z);
        const last = u.pathIdx === u.path.length - 1;
        if (d < (last ? 2.5 : Math.max(4, u.radius * 1.2))) {
          u.pathIdx++;
          if (u.pathIdx >= u.path.length) { u.path = null; if (o.type === 'move' || o.type === 'amove') { u.order = { type: 'idle' }; u.anchor = { x: u.pos.x, z: u.pos.z }; } return null; }
        }
        const w = u.path[u.pathIdx];
        return { x: w[0], z: w[1], last: u.pathIdx === u.path.length - 1 };
      }
      if ((o.type === 'move' || o.type === 'amove') && !this.gridFor(u)) {
        const d = Math.hypot(o.x - u.pos.x, o.z - u.pos.z);
        if (d < 4) { if (u.cls.move !== 'plane') { u.order = { type: 'idle' }; u.anchor = { x: u.pos.x, z: u.pos.z }; } return null; }
        return { x: o.x, z: o.z, last: true };
      }
      // idle chase (leashed)
      if (o.type === 'idle' && u.target && u.target.alive && !u.isHQ && u.cls.move !== 'naval') {
        const t = u.target, d = Math.hypot(t.pos.x - u.pos.x, t.pos.z - u.pos.z);
        if (!u.anchor) u.anchor = { x: u.pos.x, z: u.pos.z };
        const leash = Math.hypot(t.pos.x - u.anchor.x, t.pos.z - u.anchor.z);
        if (d > this.effRange(u, t) * 0.9 && leash < 55 && this.gridFor(u)) {
          const grid = this.gridFor(u);
          if (SM.lineOpen(this.M, grid, SM.cellOf(this.M, u.pos.x, u.pos.z), SM.cellOf(this.M, t.pos.x, t.pos.z))) return { x: t.pos.x, z: t.pos.z };
        }
      }
      return null;
    }

    updateGround(u, dt, wm) {
      const mv = u.cls.move;
      const goal = this.goalFor(u);
      const grid = this.gridFor(u);
      const turn = { inf: 7, mech: 2.0, wheel: 1.9, track: 1.5, hover: 2.4, naval: 0.38, sub: 0.45, amphib: 1.2 }[mv] || 1.5;
      const accel = { inf: 14, mech: 6, wheel: 9, track: 6, hover: 9, naval: 1.6, sub: 1.6, amphib: 5 }[mv] || 6;
      let target = 0;
      let dirx = Math.sin(u.yaw), dirz = Math.cos(u.yaw);
      if (u.jump) { this.updateJump(u, dt); return; }
      if (goal) {
        const dx = goal.x - u.pos.x, dz = goal.z - u.pos.z, d = Math.hypot(dx, dz) || 1;
        const want = Math.atan2(dx, dz), diff = angDiff(want, u.yaw);
        const tr = turn * (mv === 'naval' ? 12 / Math.max(6, u.radius) : 1);
        u.yaw += SM.clamp(diff, -tr * dt, tr * dt);
        const facing = Math.abs(diff) < (mv === 'inf' ? 3 : mv === 'naval' || mv === 'sub' ? 1.2 : 0.7);
        target = facing ? u.maxSpeed * this.speedMul(u, wm) : (mv === 'track' || mv === 'mech' ? 0 : u.maxSpeed * 0.3);
        if (goal.last && d < 8) target *= Math.max(0.25, d / 8);
        if (mv === 'inf') { dirx = dx / d; dirz = dz / d; }
      }
      // slope penalty
      if (target > 0 && mv !== 'naval' && mv !== 'sub') {
        const ahead = this.M.groundAt(u.pos.x + dirx * 3, u.pos.z + dirz * 3) - this.M.groundAt(u.pos.x, u.pos.z);
        if (ahead > 0) target *= SM.clamp(1 - ahead * 0.18, 0.45, 1);
      }
      u.speed = approach(u.speed, target, accel * dt);
      if (u.speed > 0.01) {
        const nx = u.pos.x + dirx * u.speed * dt, nz = u.pos.z + dirz * u.speed * dt;
        if (this.walkable(grid, nx, nz)) { u.pos.x = nx; u.pos.z = nz; }
        else if (this.walkable(grid, nx, u.pos.z)) { u.pos.x = nx; u.speed *= 0.7; }
        else if (this.walkable(grid, u.pos.x, nz)) { u.pos.z = nz; u.speed *= 0.7; }
        else { u.speed = 0; u.stuck += dt; }
      }
      // stuck detection
      if (goal) {
        u.progT = (u.progT || 0) + dt;
        if (u.progT > 2.5) {
          const moved = u.lastP ? Math.hypot(u.pos.x - u.lastP.x, u.pos.z - u.lastP.z) : 99;
          u.lastP = { x: u.pos.x, z: u.pos.z }; u.progT = 0;
          if (moved < 1.5 && (u.order.type === 'move' || u.order.type === 'amove')) {
            u.stuck += 1;
            if (u.stuck > 3) { u.order = { type: 'idle' }; u.path = null; u.anchor = { x: u.pos.x, z: u.pos.z }; u.stuck = 0; }
            else if (u.path && u.pathIdx < u.path.length - 1) u.pathIdx++;
            else if (u.dest) this.requestPath(u, u.dest.x, u.dest.z);
          }
        }
      }
      this.place(u, dt);
    }

    walkable(grid, x, z) {
      if (Math.abs(x) > 305 || Math.abs(z) > 305) return false;
      if (!grid) return true;
      return grid[SM.cellOf(this.M, x, z)] === 1;
    }

    place(u, dt) {
      const mv = u.cls.move;
      if (mv === 'plane') return;
      const y = this.surfaceY(u, u.pos.x, u.pos.z);
      if (mv === 'heli') { u.pos.y += (y - u.pos.y) * Math.min(1, dt * 2); return; }
      u.pos.y = y;
      if (mv === 'track' || mv === 'wheel' || mv === 'mech' || mv === 'hover') {
        const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw), L = Math.max(2.5, u.radius * 0.7);
        const hf = this.M.groundAt(u.pos.x + fx * L, u.pos.z + fz * L), hb = this.M.groundAt(u.pos.x - fx * L, u.pos.z - fz * L);
        const hl = this.M.groundAt(u.pos.x - fz * L * 0.6, u.pos.z + fx * L * 0.6), hr = this.M.groundAt(u.pos.x + fz * L * 0.6, u.pos.z - fx * L * 0.6);
        const tp = mv === 'mech' ? 0 : -Math.atan2(hf - hb, 2 * L), tr = mv === 'mech' ? 0 : Math.atan2(hl - hr, 1.2 * L);
        u.pitch += (tp - u.pitch) * Math.min(1, dt * 6); u.roll += (tr - u.roll) * Math.min(1, dt * 6);
        if (mv === 'hover') u.pos.y += 0.6;
      } else if (mv === 'naval' || mv === 'sub' || mv === 'amphib') {
        u.roll = Math.sin(this.time * 0.9 + u.id) * (mv === 'amphib' ? 0.01 : 0.025) * Math.min(1, 10 / u.radius) * 2;
        u.pitch = Math.sin(this.time * 0.7 + u.id * 3) * 0.012;
      }
    }

    updateJump(u, dt) {
      const j = u.jump; j.t += dt;
      const k = Math.min(1, j.t / j.dur);
      u.pos.x = j.x0 + (j.x1 - j.x0) * k; u.pos.z = j.z0 + (j.z1 - j.z0) * k;
      const g = this.M.groundAt(u.pos.x, u.pos.z);
      u.pos.y = g + Math.sin(k * PI) * j.h;
      if (Math.random() < dt * 30) this.fx.fire.spawn(u.pos.x, u.pos.y + 0.5, u.pos.z, 0, -6, 0, 0.3, 1.5, 0.4, 0x8ad8ff, 1, 0, 0);
      if (k >= 1) { u.jump = null; u.pos.y = g; this.fx.dust(u.pos.x, g, u.pos.z, 1.5); u.order = { type: 'idle' }; u.anchor = { x: u.pos.x, z: u.pos.z }; }
    }

    updateHeli(u, dt, wm) {
      const goal = this.goalFor(u);
      const cruise = 24 + (u.id % 5) * 2;
      u.alt += (cruise - u.alt) * Math.min(1, dt * (u.climb ? 0.8 : 1.5));
      if (u.alt > cruise * 0.8) u.climb = false;
      let target = 0;
      if (goal && !u.climb) {
        const dx = goal.x - u.pos.x, dz = goal.z - u.pos.z, d = Math.hypot(dx, dz);
        const want = Math.atan2(dx, dz), diff = angDiff(want, u.yaw);
        u.yaw += SM.clamp(diff, -1.6 * dt, 1.6 * dt);
        target = Math.abs(diff) < 1.2 ? u.maxSpeed * this.speedMul(u, wm) : u.maxSpeed * 0.2;
        if (goal.last && d < 20) target *= Math.max(0.15, d / 20);
      } else if (u.target && u.target.alive) {
        const want = Math.atan2(u.target.pos.x - u.pos.x, u.target.pos.z - u.pos.z);
        u.yaw += SM.clamp(angDiff(want, u.yaw), -1.4 * dt, 1.4 * dt);
      }
      const prev = u.speed;
      u.speed = approach(u.speed, target, 8 * dt);
      u.pos.x = SM.clamp(u.pos.x + Math.sin(u.yaw) * u.speed * dt, -300, 300);
      u.pos.z = SM.clamp(u.pos.z + Math.cos(u.yaw) * u.speed * dt, -300, 300);
      u.pitch += ((u.speed - prev) / Math.max(dt, 0.001) * 0.02 + u.speed * 0.012 - u.pitch) * Math.min(1, dt * 3);
      u.roll += (SM.clamp(goal ? angDiff(Math.atan2(goal.x - u.pos.x, goal.z - u.pos.z), u.yaw) * -0.5 : 0, -0.4, 0.4) - u.roll) * Math.min(1, dt * 2);
      this.place(u, dt);
    }

    updatePlane(u, dt, wm) {
      u.loiter -= dt;
      const home = this.M.hq[u.team];
      let cx, cz;
      const leaving = u.loiter <= 0;
      if (leaving) { cx = home.x; cz = u.team ? -520 : 520; if (!u.leftMsg && u.team === 0) { u.leftMsg = true; this.addFeed(u.def.name + ' is returning to base.', '#9fd4ff'); } }
      else if (u.order.type === 'attack' && u.order.target && u.order.target.alive) { cx = u.order.target.pos.x; cz = u.order.target.pos.z; }
      else if (u.order.x !== undefined) { cx = u.order.x; cz = u.order.z; }
      else { cx = 0; cz = 0; }
      // bombers fly straight over target; others orbit
      const dx = cx - u.pos.x, dz = cz - u.pos.z, d = Math.hypot(dx, dz);
      const orbit = u.def.cls === 'bomber' ? 20 : 55;
      let want = Math.atan2(dx, dz);
      if (!leaving && d < orbit) want = u.yaw + 0.9;
      const tr = u.buffs.speedT > 0 ? 0.6 : 0.85;
      const diff = angDiff(want, u.yaw);
      u.yaw += SM.clamp(diff, -tr * dt, tr * dt);
      u.roll += (SM.clamp(-diff * 1.2, -0.9, 0.9) - u.roll) * Math.min(1, dt * 2.5);
      const sp = u.maxSpeed * (u.buffs.speedT > 0 ? 1.7 : 1);
      u.speed = sp;
      u.pos.x += Math.sin(u.yaw) * sp * dt; u.pos.z += Math.cos(u.yaw) * sp * dt;
      const ground = Math.max(this.M.heightAt(u.pos.x, u.pos.z), this.M.water !== null ? this.M.water : -99);
      u.pos.y += (Math.max(u.alt, ground + 35) - u.pos.y) * Math.min(1, dt * 1.5);
      u.pitch = 0;
      if (leaving && (Math.abs(u.pos.z) > 420 || Math.abs(u.pos.x) > 420)) { this.removeUnit(u, false); }
      if (Math.abs(u.pos.x) > 600 || Math.abs(u.pos.z) > 600) this.removeUnit(u, false);
    }

    // ---------------------------------------------------------- targeting
    effRange(u, t) {
      let r = u.range * (u.buffs.siege ? 1.4 : 1);
      if (t && SM.isAir(t.cls) && !SM.isAir(u.cls)) r *= u.cls.aa === 2 ? 1.1 : 0.8;
      if (t && t.isHQ) r += 18;
      return r;
    }
    canTarget(u, t) {
      if (!t.alive || t.team === u.team) return false;
      if (!t.vis[u.team] && !t.isHQ) return false;
      const ucl = u.cls, tcl = t.cls;
      if (t.isDecoy && u.isHQ) return false;
      const tAir = SM.isAir(tcl);
      if (tAir) {
        if (ucl.aa === 2) return true;
        if (ucl.aa === 1 && tcl.move === 'heli') return true;
        return false;
      }
      if (ucl.navalOnly) return tcl.move === 'naval' || tcl.move === 'sub' || (tcl.move === 'amphib' && this.M.water !== null && this.M.heightAt(t.pos.x, t.pos.z) < this.M.water);
      if (tcl.move === 'sub') return ucl.move === 'naval' || ucl.move === 'sub' || ucl.move === 'heli' || u.isHQ === false && ucl.navalOnly;
      if (u.def.cls === 'fighter') return true;
      return true;
    }
    pickTarget(u) {
      let best = null, bs = -1e9;
      const range = u.range * (u.buffs.siege ? 1.4 : 1) * 1.15;
      const ot = u.order ? u.order.type : 'idle';
      const look = ot === 'idle' || ot === 'amove' ? Math.max(range, Math.min(u.sight, range + 25)) : range;
      const ucl = u.cls;
      const heavyWeapon = u.pen >= 55;
      const check = t => {
        if (!this.canTarget(u, t)) return;
        const d = Math.hypot(t.pos.x - u.pos.x, t.pos.z - u.pos.z);
        const er = this.effRange(u, t);
        if (d > Math.max(look, er)) return;
        if (ucl.minRange && d < ucl.minRange) return;
        let s = -d * 0.6;
        const tAir = SM.isAir(t.cls);
        if (ucl.airFirst || ucl.airOnly) s += tAir ? 200 : -150;
        if (t.isHQ) s -= 120;
        else if (t.squad) s += heavyWeapon ? -40 : 60;
        else s += heavyWeapon ? 60 : -30;
        if (t.isDecoy) s += 80;
        s += (1 - t.hp / t.maxHp) * 30;
        if (t === u.target) s += 25;
        if (d <= er) s += 100;
        if (s > bs) { bs = s; best = t; }
      };
      const rr = Math.max(look, 140);
      this.near(u.pos.x, u.pos.z, rr, check);
      return best;
    }

    updateCombat(u, dt, wm) {
      u.retarget -= dt;
      if (u.retarget <= 0) { u.retarget = 0.35 + Math.random() * 0.2; u.target = this.pickTarget(u); }
      let t = u.forced && u.forced.alive && this.canTarget(u, u.forced) ? u.forced : u.target;
      if (t && !t.alive) { t = null; u.target = null; }
      const rig = u.rig, mv = u.cls.move;
      // aim
      let aligned = false, d = 0, want = 0;
      if (t) {
        const dx = t.pos.x - u.pos.x, dz = t.pos.z - u.pos.z;
        d = Math.hypot(dx, dz);
        want = Math.atan2(dx, dz);
        const local = angDiff(want, u.yaw);
        if (rig && rig.turrets.length && mv !== 'heli' && mv !== 'plane') {
          u.turretYaw += SM.clamp(angDiff(local, u.turretYaw), -2.4 * dt, 2.4 * dt);
          aligned = Math.abs(angDiff(local, u.turretYaw)) < 0.14;
        } else if (mv === 'mech') {
          u.torsoYaw += SM.clamp(angDiff(SM.clamp(local, -1.5, 1.5), u.torsoYaw), -2.2 * dt, 2.2 * dt);
          aligned = Math.abs(angDiff(local, u.torsoYaw)) < 0.2;
          if (!aligned && u.speed < 0.5) u.yaw += SM.clamp(local, -1.2 * dt, 1.2 * dt);
        } else if (mv === 'inf') {
          if (u.speed < 0.5 || u.order.type !== 'move') u.yaw += SM.clamp(local, -5 * dt, 5 * dt);
          aligned = Math.abs(local) < 0.5 || u.speed > 0.5;
        } else if (mv === 'plane') {
          aligned = Math.abs(local) < (u.def.wt === 'bomb' ? PI : 1.1);
        } else if (mv === 'heli') {
          aligned = Math.abs(local) < (u.def.wt === 'missile' ? 0.8 : 0.5);
        } else {
          // casemate / no turret: rotate hull when not travelling
          if (!u.path && u.order.type !== 'move') u.yaw += SM.clamp(local, -1.2 * dt, 1.2 * dt);
          aligned = Math.abs(local) < 0.12;
        }
        if (u.isHQ) aligned = true;
      } else if (rig && rig.turrets.length && mv !== 'heli' && mv !== 'plane') {
        u.turretYaw += SM.clamp(-u.turretYaw, -1.2 * dt, 1.2 * dt);
      } else if (mv === 'mech') u.torsoYaw += SM.clamp(-u.torsoYaw, -1 * dt, 1 * dt);
      u.aimPitch = t ? Math.atan2((t.pos.y + 1.5) - (u.pos.y + 2), Math.max(1, d)) : 0;
      u.firing = false;
      if (u.reload > 0) u.reload -= dt * (u.buffs.overT > 0 ? 2 : 1);
      if (!t || !aligned) return;
      const er = this.effRange(u, t);
      if (d > er) return;
      if (u.cls.minRange && d < u.cls.minRange) return;
      if (u.def.wt === 'bomb') { // only release when nearly overhead
        if (d > 16) return;
      }
      if (u.reload > 0) return;
      u.reload = 1 / Math.max(0.02, u.rof);
      this.fire(u, t, d, wm);
    }

    muzzle(u, out) {
      const rig = u.rig;
      if (u.squad) { const al = rig.soldiers.filter(s => s.alive); const s = al[Math.floor(Math.random() * al.length)] || rig.soldiers[0]; s.g.getWorldPosition(out); out.y += 1.6; return out; }
      if (rig && rig.barrels.length) { rig.barrels[0].getWorldPosition(out); const fx = Math.sin(u.yaw + (u.turretYaw || 0) + (u.torsoYaw || 0)), fz = Math.cos(u.yaw + (u.turretYaw || 0) + (u.torsoYaw || 0)); const L = u.cls.move === 'naval' ? u.radius * 0.35 : Math.min(6, u.radius * 0.9); out.x += fx * L; out.z += fz * L; return out; }
      out.copy(u.pos); out.y += 2; return out;
    }

    hitChance(u, t, d, wm) {
      let p = u.acc;
      p *= SM.isAir(u.cls) ? wm.air : wm.acc;
      if (u.buffs.ecmDebuff > 0) p *= 0.6;
      p *= 1 - 0.3 * Math.min(1, d / Math.max(1, u.range));
      if (t.speed > 3) p *= SM.isAir(t.cls) ? 0.8 : 0.88;
      if (u.speed > 3 && !(u.rig && u.rig.turrets.length)) p *= 0.85;
      if (t.squad) p *= 0.85;
      if (t.radius > 8) p *= 1.15;
      if (t.isHQ) p = 0.95;
      if (this.inSmoke(t.pos.x, t.pos.z)) p *= 0.4;
      if (t.buffs.flares > 0 && (u.def.wt === 'missile' || u.def.wt === 'rocket' || u.cls.aa === 2)) p *= 0.15;
      if (t.buffs.speedT > 0 && SM.isAir(t.cls)) p *= 0.75;
      return SM.clamp(p, 0.03, 0.98);
    }

    fire(u, t, d, wm) {
      const wt = u.def.wt;
      const from = this.muzzle(u, new T.Vector3());
      const to = new T.Vector3(t.pos.x, t.pos.y + (t.isHQ ? 3 : SM.isAir(t.cls) ? 0 : t.squad ? 1 : Math.min(3, t.radius * 0.35)), t.pos.z);
      let dmg = u.dmg, pen = u.pen;
      if (u.cls.airOnly && !SM.isAir(t.cls)) dmg *= 0.4;
      if ((wt === 'laser' || wt === 'plasma' || wt === 'rail') && wm.energy > 1) dmg *= wm.energy;
      if (u.buffs.ap) { dmg *= 1.5; pen *= 2; u.buffs.ap = false; }
      if (u.buffs.cap) { dmg *= 3; pen *= 1.5; u.buffs.cap = false; }
      if (SM.isAir(t.cls) && !SM.isAir(u.cls) && u.cls.aa === 1) dmg *= 0.6;
      if (u.isHQ) { dmg = u.dmg; }
      u.recoil = 1; u.firing = true;
      u.buffs.firedT = 2.5;
      if (u.buffs.cloak > 0 && u.cls.move !== 'sub') u.buffs.cloak = 0;
      const shots = u.squad ? Math.max(1, this.aliveSoldiers(u)) : (wt === 'mg' ? 2 : 1);
      const p = this.hitChance(u, t, d, wm);
      const vol = this.vol(u.pos);
      SM.Audio.shot(wt, vol);
      const fdx = (to.x - from.x) / (d || 1), fdz = (to.z - from.z) / (d || 1);
      const big = u.cls.move === 'naval' || u.def.cls === 'titan' || u.def.cls === 'htank' ? 2 : 1;
      for (let s = 0; s < shots; s++) {
        const src = s === 0 ? from : this.muzzle(u, new T.Vector3());
        const hit = Math.random() < p;
        const miss = hit ? to : new T.Vector3(to.x + (Math.random() - 0.5) * 9, 0, to.z + (Math.random() - 0.5) * 9);
        if (!hit) miss.y = SM.isAir(t.cls) ? to.y + (Math.random() - 0.5) * 6 : this.M.groundAt(miss.x, miss.z);
        const dest = hit ? to : miss;
        switch (wt) {
          case 'mg': case 'auto':
            this.fx.tracer(src.x, src.y, src.z, dest.x, dest.y, dest.z, u.team ? 0xffa060 : 0xffe08a);
            if (s === 0) this.fx.muzzle(src.x, src.y, src.z, fdx, fdz, wt === 'auto' ? 0.8 * big : 0.4, 0xffc070);
            this.later(Math.min(0.3, d / 340), () => {
              if (hit && t.alive) this.damage(t, dmg, pen, u, { kind: wt });
              if (wt === 'auto') this.fx.sparks(dest.x, dest.y, dest.z); else if (Math.random() < 0.4) this.fx.dust(dest.x, dest.y, dest.z, 0.4);
            });
            break;
          case 'rail': case 'laser': {
            const col = wt === 'rail' ? (u.team ? 0xff7a9a : 0x7ad8ff) : (u.team ? 0xff4a6a : 0xff6ad8);
            this.fx.beam(src.x, src.y, src.z, dest.x, dest.y, dest.z, col, wt === 'rail' ? 0.35 : 0.18);
            this.fx.glowAt(src.x, src.y, src.z, col, 4 * big);
            if (hit) this.damage(t, dmg, pen, u, { kind: wt }); this.fx.sparks(dest.x, dest.y, dest.z, col);
            break;
          }
          default: this.spawnProjectile(u, t, wt, src, dest, hit, dmg, pen, big);
        }
      }
      if (wt === 'cannon' || wt === 'arty') { this.fx.muzzle(from.x, from.y, from.z, fdx, fdz, 1.4 * big, 0xffb060); this.fx.flash(from.x, from.y, from.z, 0xffb060, 3, 0.12); }
      if (wt === 'plasma') this.fx.glowAt(from.x, from.y, from.z, 0x8af0ff, 5);
    }

    aliveSoldiers(u) { return u.squad ? Math.max(0, Math.ceil(u.hp / u.perSoldier - 0.001)) : 0; }

    later(t, fn) { this.timers.push({ t, fn }); }

    getProjMesh(kind, team) {
      const key = kind === 'plasma' && team ? 'plasmaR' : kind;
      const pool = this.projPool[key] || (this.projPool[key] = []);
      let m = pool.pop();
      if (!m) {
        const g = kind === 'plasma' ? this.projGeo.plasma : kind === 'missile' ? this.projGeo.missile : kind === 'bomb' ? this.projGeo.bomb : this.projGeo.shell;
        m = new T.Mesh(g, this.projMats[key]);
        m.userData.key = key;
        this.scene.add(m);
      }
      m.visible = true;
      return m;
    }
    freeProj(m) { m.visible = false; (this.projPool[m.userData.key] || (this.projPool[m.userData.key] = [])).push(m); }

    spawnProjectile(u, t, wt, src, dest, hit, dmg, pen, big) {
      const p = { wt, team: u.team, from: u, target: t, hit, dmg, pen, aoe: u.cls.aoe || 0, x: src.x, y: src.y, z: src.z, dx: dest.x, dy: dest.y, dz: dest.z, t: 0, big };
      if (wt === 'arty' || wt === 'bomb') {
        const dist = Math.hypot(dest.x - src.x, dest.z - src.z);
        p.T = wt === 'bomb' ? Math.sqrt(Math.max(1, src.y - dest.y) / 4.9) : 1.4 + dist / 110;
        p.sx = src.x; p.sy = src.y; p.sz = src.z;
        p.vx = (dest.x - src.x) / p.T; p.vz = (dest.z - src.z) / p.T;
        p.vy = (dest.y - src.y + 0.5 * 9.8 * p.T * p.T) / p.T;
        if (wt === 'bomb') { p.vx = Math.sin(u.yaw) * 6 + (dest.x - src.x) / p.T * 0.6; p.vz = Math.cos(u.yaw) * 6 + (dest.z - src.z) / p.T * 0.6; p.vy = (dest.y - src.y + 0.5 * 9.8 * p.T * p.T) / p.T; p.dx = src.x + p.vx * p.T; p.dz = src.z + p.vz * p.T; }
        p.kind = 'ballistic';
        p.mesh = this.getProjMesh(wt === 'bomb' ? 'bomb' : 'shell', u.team);
        if (!p.aoe) p.aoe = wt === 'bomb' ? 12 : 10;
      } else if (wt === 'rocket' || wt === 'missile') {
        p.kind = 'homing'; p.speed = wt === 'missile' ? 120 : 85;
        const up = SM.isAir(u.cls) ? 0 : 8;
        p.vx = Math.sin(u.yaw + (u.turretYaw || 0)) * 30; p.vy = up; p.vz = Math.cos(u.yaw + (u.turretYaw || 0)) * 30;
        p.mesh = this.getProjMesh('missile', u.team);
        p.ttl = 6;
      } else if (wt === 'torpedo') {
        p.kind = 'torpedo'; p.speed = 45; p.y = (this.M.water || 0) - 1; p.ttl = 8; p.mesh = null;
      } else { // cannon, plasma
        p.kind = 'straight'; p.speed = wt === 'plasma' ? 150 : 280; p.mesh = this.getProjMesh(wt === 'plasma' ? 'plasma' : 'shell', u.team);
        if (wt === 'plasma' && big > 1) p.mesh.scale.setScalar(1.6); else if (p.mesh) p.mesh.scale.setScalar(1);
      }
      if (p.mesh) p.mesh.position.set(p.x, p.y, p.z);
      this.projectiles.push(p);
      return p;
    }

    updateProjectiles(dt) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.t += dt;
        let done = false;
        if (p.kind === 'ballistic') {
          const t = Math.min(p.t, p.T);
          const px = p.x, py = p.y, pz = p.z;
          p.x = p.sx + p.vx * t; p.z = p.sz + p.vz * t; p.y = p.sy + p.vy * t - 4.9 * t * t;
          if (p.mesh) { p.mesh.position.set(p.x, p.y, p.z); p.mesh.lookAt(p.x + (p.x - px), p.y + (p.y - py), p.z + (p.z - pz)); }
          if (p.wt === 'arty' && Math.random() < 0.5) this.fx.trail(p.x, p.y, p.z, 0xbbbbbb);
          if (p.t >= p.T) done = true;
        } else if (p.kind === 'straight') {
          const dx = p.dx - p.x, dy = p.dy - p.y, dz = p.dz - p.z, d = Math.hypot(dx, dy, dz);
          const step = p.speed * dt;
          if (d <= step) { p.x = p.dx; p.y = p.dy; p.z = p.dz; done = true; }
          else { p.x += dx / d * step; p.y += dy / d * step; p.z += dz / d * step; }
          if (p.mesh) p.mesh.position.set(p.x, p.y, p.z);
          if (p.wt === 'plasma') this.fx.glowAt(p.x, p.y, p.z, p.team ? 0xd07aff : 0x7ef6ff, 3);
        } else if (p.kind === 'homing') {
          if (p.hit && p.target.alive) { p.dx = p.target.pos.x; p.dy = p.target.pos.y + (SM.isAir(p.target.cls) ? 0 : 1.5); p.dz = p.target.pos.z; }
          const dx = p.dx - p.x, dy = p.dy - p.y, dz = p.dz - p.z, d = Math.hypot(dx, dy, dz) || 1;
          const sp = Math.min(p.speed, 30 + p.t * 160);
          const turn = Math.min(1, dt * (2 + p.t * 6));
          p.vx += (dx / d * sp - p.vx) * turn; p.vy += (dy / d * sp - p.vy) * turn; p.vz += (dz / d * sp - p.vz) * turn;
          const px = p.x, py = p.y, pz = p.z;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.mesh) { p.mesh.position.set(p.x, p.y, p.z); p.mesh.lookAt(p.x + (p.x - px), p.y + (p.y - py), p.z + (p.z - pz)); }
          this.fx.trail(p.x, p.y, p.z, 0xd8d4cc);
          this.fx.glowAt(p.x, p.y, p.z, 0xffb060, 1.6);
          if (d < 2.5 || p.t > p.ttl) done = true;
        } else if (p.kind === 'torpedo') {
          const dx = (p.hit && p.target.alive ? p.target.pos.x : p.dx) - p.x, dz = (p.hit && p.target.alive ? p.target.pos.z : p.dz) - p.z, d = Math.hypot(dx, dz) || 1;
          const step = p.speed * dt;
          p.x += dx / d * Math.min(step, d); p.z += dz / d * Math.min(step, d);
          if (Math.random() < 0.6) this.fx.smoke.spawn(p.x, (this.M.water || 0) + 0.1, p.z, 0, 0.5, 0, 1.2, 1, 2.5, 0xe8f4f8, 0.6, 1, 0);
          if (d < 3 || p.t > p.ttl) done = true;
        }
        if (done) {
          this.projectiles.splice(i, 1);
          if (p.mesh) this.freeProj(p.mesh);
          this.impact(p);
        }
      }
    }

    impact(p) {
      const wt = p.wt, x = p.x, z = p.z;
      const g = this.M.groundAt(x, z);
      const wet = this.M.water !== null && !this.M.ice && !this.M.lava && g < this.M.water - 0.3 && p.y < this.M.water + 2;
      const vol = this.vol({ x, z });
      if (p.aoe) {
        this.areaDamage(x, z, p.aoe, p.dmg, p.pen, p.from, p.team);
        if (wet) this.fx.splash(x, this.M.water, z, p.aoe / 9); else this.fx.explosion(x, Math.max(g, p.y - 1), z, p.aoe / 9);
        SM.Audio.boom(p.aoe / 9, vol);
        return;
      }
      if (p.hit && p.target && p.target.alive) {
        this.damage(p.target, p.dmg, p.pen, p.from, { kind: wt });
        const s = wt === 'cannon' ? 0.55 * p.big : wt === 'torpedo' ? 1.8 : wt === 'plasma' ? 0.6 : 0.5;
        this.fx.explosion(x, p.y, z, s, wt === 'plasma' ? 'plasma' : null);
        SM.Audio.boom(s, vol * 0.8);
        if (wt === 'torpedo') this.fx.splash(x, this.M.water || 0, z, 1.6);
      } else {
        if (wet) this.fx.splash(x, this.M.water, z, wt === 'torpedo' ? 1.5 : 0.6);
        else { this.fx.dust(x, g, z, wt === 'cannon' ? 1.2 : 0.8); if (wt !== 'mg') this.fx.explosion(x, g, z, 0.35, wt === 'plasma' ? 'plasma' : null); }
      }
    }

    areaDamage(x, z, r, dmg, pen, from, team) {
      this.near(x, z, r + 12, o => {
        if (!o.alive || (team >= 0 && o.team === team)) return;
        if (SM.isAir(o.cls) && o.pos.y - this.M.groundAt(o.pos.x, o.pos.z) > 8) return;
        const d = Math.hypot(o.pos.x - x, o.pos.z - z) - o.radius * 0.5;
        if (d > r) return;
        const f = 1 - Math.max(0, d) / r * 0.6;
        this.damage(o, dmg * f, pen, from, { kind: 'aoe', aoe: true });
      });
    }

    damage(t, dmg, pen, from, opt) {
      if (!t.alive || dmg <= 0) return;
      if (t.isDecoy) { this.killUnit(t, from); return; }
      let armor = t.armor * (t.buffs.siege ? 1.3 : 1);
      if (from && from.pos && !t.squad && !t.isHQ) {
        const ang = Math.atan2(from.pos.x - t.pos.x, from.pos.z - t.pos.z);
        if (Math.abs(angDiff(ang, t.yaw)) > 1.2) armor *= 0.6; // side / rear
      }
      let mult = armor <= 0 ? 1 : pen >= armor ? 1 : Math.max(0.05, Math.pow(pen / armor, 1.5));
      if (t.squad && !(opt && opt.aoe) && (opt && (opt.kind === 'cannon' || opt.kind === 'rail' || opt.kind === 'missile' || opt.kind === 'rocket' || opt.kind === 'torpedo'))) mult *= 0.45;
      let v = dmg * mult;
      if (t.buffs.shield > 0) { const a = Math.min(t.buffs.shield, v); t.buffs.shield -= a; v -= a; this.fx.sparks(t.pos.x, t.pos.y + 2, t.pos.z, 0x7ad8ff); }
      if (v <= 0) return;
      t.hp -= v; t.lastHit = this.time; t.lastAttacker = from;
      if (from && from.team !== undefined && from.team >= 0) {
        this.stats.dmg[from.team] += v;
        if (from.def && from.team === 0) this.stats.unitScore[from.def.id] = (this.stats.unitScore[from.def.id] || 0) + v;
      }
      if (t.squad) this.syncSquad(t);
      if (t.isHQ && t.team === 0 && t.hp < t.maxHp * 0.6) { if (!this.hqWarn) { this.hqWarn = true; this.addFeed('Our headquarters is under attack!', '#ff8a7a'); SM.Audio.alert(); } }
      if (t.hp <= 0) this.killUnit(t, from);
    }

    syncSquad(u) {
      const alive = this.aliveSoldiers(u);
      let n = 0;
      for (const s of u.rig.soldiers) { if (s.alive) { n++; if (n > alive) s.alive = false; } }
    }

    killUnit(u, by) {
      if (!u.alive) return;
      u.alive = false; u.hp = 0;
      const tm = this.teams[u.team];
      if (u.isHQ) { this.destroyHQ(u); return; }
      if (!u.summon && !u.isDecoy) tm.pop = Math.max(0, tm.pop - u.cls.pop);
      if (!u.isDecoy && !u.summon) {
        tm.tickets = Math.max(0, tm.tickets - Math.max(3, Math.ceil(u.def.cp / 40)));
        this.stats.losses[u.team]++;
        if (by && by.team !== undefined && by.team >= 0 && by.team !== u.team) {
          this.stats.kills[by.team]++;
          if (by.kills !== undefined) by.kills++;
          if (by.team === 0) {
            const k = u.squad ? 'inf' : SM.isAir(u.cls) ? 'air' : 'veh';
            this.stats[k]++;
            if (by.def && by.def.id) this.stats.unitScore[by.def.id] = (this.stats.unitScore[by.def.id] || 0) + u.def.cp * 2;
          }
        }
        if (u.team === 0) this.addFeed(u.def.name + ' lost.', '#ff9a8a');
        else if (by && by.team === 0) this.addFeed('Destroyed enemy ' + u.def.name + (by.def ? ' (' + by.def.name + ')' : '') + '.', '#ffd27a');
      }
      const i = this.units.indexOf(u); if (i >= 0) this.units.splice(i, 1);
      if (this.selection) { const si = this.selection.indexOf(u); if (si >= 0) this.selection.splice(si, 1); }
      const vol = this.vol(u.pos);
      const mv = u.cls.move;
      u.deadT = 0;
      if (u.ring) { this.scene.remove(u.ring); u.ring = null; }
      if (u.isDecoy) { this.fx.sparks(u.pos.x, u.pos.y + 2, u.pos.z, 0x7ad8ff); this.scene.remove(u.obj); return; }
      if (mv === 'inf') { this.syncSquad(u); u.dieMode = 'inf'; }
      else if (mv === 'plane' || mv === 'heli') { u.dieMode = 'crash'; u.vy = 0; this.fx.explosion(u.pos.x, u.pos.y, u.pos.z, 0.8); SM.Audio.boom(1, vol); }
      else if (mv === 'naval' || mv === 'sub' || mv === 'amphib' && this.M.water !== null && this.M.heightAt(u.pos.x, u.pos.z) < this.M.water) { u.dieMode = 'sink'; this.fx.explosion(u.pos.x, u.pos.y + 2, u.pos.z, Math.min(3, u.radius / 5)); SM.Audio.boom(2, vol); this.fx.emitter(u.obj, 'fire', 14, 3); }
      else {
        u.dieMode = 'wreck';
        const s = Math.min(3, u.radius / 4);
        this.fx.explosion(u.pos.x, u.pos.y + 1.5, u.pos.z, s); SM.Audio.boom(s, vol);
        u.obj.traverse(o => { if (o.isMesh && o.material !== this.charMat && !(o.material && o.material.blending === T.AdditiveBlending)) o.material = this.charMat; });
        if (u.rig.turrets[0] && Math.random() < 0.4) { u.popTurret = { vy: 9 + Math.random() * 6, spin: (Math.random() - 0.5) * 6 }; }
        this.fx.emitter(u.obj, 'fire', 22, 2);
      }
      this.dying.push(u);
    }

    updateDying(dt) {
      for (let i = this.dying.length - 1; i >= 0; i--) {
        const u = this.dying[i];
        u.deadT += dt;
        let remove = false;
        if (u.dieMode === 'inf') { if (u.deadT > 5) remove = true; }
        else if (u.dieMode === 'crash') {
          u.vy -= 22 * dt;
          u.pos.y += u.vy * dt; u.pos.x += Math.sin(u.yaw) * u.speed * dt * 0.8; u.pos.z += Math.cos(u.yaw) * u.speed * dt * 0.8;
          u.yaw += dt * 3; u.roll += dt * 2;
          if (Math.random() < 0.8) this.fx.trail(u.pos.x, u.pos.y, u.pos.z, 0x2a2826, true);
          const g = Math.max(this.M.groundAt(u.pos.x, u.pos.z), this.M.water !== null ? this.M.water : -99);
          if (u.pos.y <= g + 0.5) { this.fx.explosion(u.pos.x, g, u.pos.z, 1.6); SM.Audio.boom(1.6, this.vol(u.pos)); remove = true; }
          if (u.deadT > 8) remove = true;
        } else if (u.dieMode === 'sink') {
          u.pos.y -= dt * 0.9; u.roll += dt * 0.06; u.pitch += dt * 0.02;
          if (u.deadT > 14) remove = true;
        } else if (u.dieMode === 'wreck') {
          if (u.popTurret && u.rig.turrets[0]) { const tg = u.rig.turrets[0]; u.popTurret.vy -= 22 * dt; tg.position.y += u.popTurret.vy * dt; tg.rotation.x += u.popTurret.spin * dt; if (tg.position.y < -2) u.popTurret = null; }
          if (u.deadT > 30) u.pos.y -= dt * 0.5;
          if (u.deadT > 36) remove = true;
        }
        if (remove) {
          this.scene.remove(u.obj);
          this.dying.splice(i, 1);
          for (const tx of u.rig.tracks) tx.dispose();
        }
      }
    }

    removeUnit(u, lost) {
      if (!u.alive) return;
      u.alive = false;
      const tm = this.teams[u.team];
      if (!u.summon && !u.isDecoy) tm.pop = Math.max(0, tm.pop - u.cls.pop);
      const i = this.units.indexOf(u); if (i >= 0) this.units.splice(i, 1);
      if (this.selection) { const si = this.selection.indexOf(u); if (si >= 0) this.selection.splice(si, 1); }
      this.scene.remove(u.obj); if (u.ring) this.scene.remove(u.ring);
    }

    destroyHQ(h) {
      for (let k = 0; k < 8; k++) this.later(k * 0.25, () => { this.fx.explosion(h.pos.x + (Math.random() - 0.5) * 30, h.pos.y, h.pos.z + (Math.random() - 0.5) * 30, 2.5); SM.Audio.boom(3, this.vol(h.pos)); });
      h.obj.traverse(o => { if (o.isMesh) o.material = this.charMat; });
      this.fx.emitter(h.obj, 'fire', 60, 8);
      this.later(2.2, () => this.finish(1 - h.team, h.team === 1 ? 'Enemy headquarters destroyed' : 'Our headquarters was destroyed'));
    }

    updateHQ(h, dt) {
      if (h.radar) h.radar.rotation.y += dt * 1.2;
      h.retarget = (h.retarget || 0) - dt;
      if (h.retarget <= 0) { h.retarget = 0.5; h.target = this.pickTarget(h); }
      const t = h.target && h.target.alive ? h.target : null;
      for (const tr of h.turrets) {
        if (!t) continue;
        const wp = tr.g.getWorldPosition(V3);
        const want = Math.atan2(t.pos.x - wp.x, t.pos.z - wp.z) - h.obj.rotation.y;
        tr.g.rotation.y += SM.clamp(angDiff(want, tr.g.rotation.y), -2 * dt, 2 * dt);
        tr.reload -= dt;
        const d = Math.hypot(t.pos.x - wp.x, t.pos.z - wp.z);
        if (tr.reload <= 0 && d < h.range && Math.abs(angDiff(want, tr.g.rotation.y)) < 0.15) {
          tr.reload = 2.2;
          const air = SM.isAir(t.cls);
          const from = new T.Vector3(wp.x + Math.sin(want + h.obj.rotation.y) * 5, wp.y + 3.4, wp.z + Math.cos(want + h.obj.rotation.y) * 5);
          const to = new T.Vector3(t.pos.x, t.pos.y + 1.5, t.pos.z);
          const hit = Math.random() < (air ? 0.55 : 0.75);
          if (air) { this.fx.tracer(from.x, from.y, from.z, to.x, to.y, to.z, 0xffd08a); if (hit) this.damage(t, 60, 60, h, { kind: 'auto' }); }
          else this.spawnProjectile(h, t, 'cannon', from, hit ? to : new T.Vector3(to.x + (Math.random() - 0.5) * 8, this.M.groundAt(to.x, to.z), to.z + (Math.random() - 0.5) * 8), hit, h.dmg, h.pen, 1);
          this.fx.muzzle(from.x, from.y, from.z, Math.sin(want), Math.cos(want), 1.2);
          SM.Audio.shot('cannon', this.vol(h.pos) * 0.8);
        }
      }
    }

    separate(dt) {
      const list = this.units;
      for (const u of list) {
        if (u.isHQ || !u.alive || u.cls.move === 'plane' || u.jump) continue;
        const layer = u.cls.move === 'heli' ? 1 : 0;
        const grid = this.gridFor(u);
        this.near(u.pos.x, u.pos.z, u.radius + 12, o => {
          if (o === u || !o.alive || o.cls.move === 'plane' || o.jump) return;
          if ((o.cls.move === 'heli' ? 1 : 0) !== layer) return;
          let dx = u.pos.x - o.pos.x, dz = u.pos.z - o.pos.z;
          let d = Math.hypot(dx, dz);
          const min = (o.isHQ ? 26 : o.radius) + u.radius * 0.85;
          if (d >= min) return;
          if (d < 0.01) { dx = Math.random() - 0.5; dz = Math.random() - 0.5; d = Math.hypot(dx, dz); }
          const push = (min - d) * Math.min(1, dt * (o.isHQ ? 6 : 3)) * (u.speed > o.speed + 0.5 ? 0.35 : 0.65);
          const nx = u.pos.x + dx / d * push, nz = u.pos.z + dz / d * push;
          if (this.walkable(grid, nx, nz)) { u.pos.x = nx; u.pos.z = nz; }
        });
      }
    }

    // ---------------------------------------------------------- abilities
    useAbility(u, idx, x, z) {
      const a = u.abil[idx];
      if (!a || !u.alive) return false;
      const A = SM.ABILITIES[a.id];
      if (a.cd > 0 && !(A.toggle && u.buffs.siege)) return false;
      if (A.target === 'point') {
        if (x === undefined) return false;
        const d = Math.hypot(x - u.pos.x, z - u.pos.z);
        if (d > A.range) { const k = A.range / d; x = u.pos.x + (x - u.pos.x) * k; z = u.pos.z + (z - u.pos.z) * k; }
      }
      a.cd = A.cd;
      const b = u.buffs, team = u.team;
      if (team === 0) SM.Audio.ability();
      switch (a.id) {
        case 'sprint': case 'overdrive': b.speedT = 8; b.speedMul = 1.6; break;
        case 'afterburner': b.speedT = 7; b.speedMul = 1.7; b.flares = 3; break;
        case 'repair': b.repairT = 6; break;
        case 'shield': b.shield = u.maxHp * 0.3; b.shieldT = 10; break;
        case 'cloak': b.cloak = u.cls.move === 'sub' ? 14 : 10; break;
        case 'flares': b.flares = 6; for (let i = 0; i < 10; i++) this.fx.fire.spawn(u.pos.x, u.pos.y, u.pos.z, (Math.random() - 0.5) * 20, -Math.random() * 10, (Math.random() - 0.5) * 20, 1.5, 2, 1, 0xffe0a0, 1, 0.5, 6); break;
        case 'overcharge': b.overT = 6; break;
        case 'apRound': b.ap = true; break;
        case 'railCharge': b.cap = true; break;
        case 'entrench': b.siege = !b.siege; a.cd = 4; if (b.siege) { u.speed = 0; u.path = null; u.order = { type: 'idle' }; } break;
        case 'emp': this.fx.explosion(u.pos.x, u.pos.y + 1, u.pos.z, 1.2, 'emp'); this.near(u.pos.x, u.pos.z, 32, o => { if (o.team !== team && o.alive && !o.isHQ && !o.squad) o.buffs.stun = 4; }); break;
        case 'ecm': this.near(u.pos.x, u.pos.z, 45, o => { if (o.team !== team && o.alive) o.buffs.ecmDebuff = 8; }); this.fx.glowAt(u.pos.x, u.pos.y + 3, u.pos.z, 0x9a7aff, 30); break;
        case 'sonar': this.fx.glowAt(u.pos.x, u.pos.y + 2, u.pos.z, 0x7affd8, 40); for (const o of this.units) if (o.team !== team && Math.hypot(o.pos.x - u.pos.x, o.pos.z - u.pos.z) < 160) { o.buffs.revealed = 8; o.buffs.revealedBy = team; } this.updateVisibility(); break;
        case 'nanoRepair': this.near(u.pos.x, u.pos.z, 30, o => { if (o.team === team && o.alive && !o.isHQ) o.buffs.healT = 5; }); this.fx.glowAt(u.pos.x, u.pos.y + 2, u.pos.z, 0x7aff9a, 26); break;
        case 'smoke': this.zones.push({ kind: 'smoke', x, z, r: 18, t: 18, team }); for (let i = 0; i < 40; i++) this.fx.smoke.spawn(x + (Math.random() - 0.5) * 30, this.M.groundAt(x, z) + 1, z + (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 2, 0.6, (Math.random() - 0.5) * 2, 16 + Math.random() * 4, 10, 18, 0xdcdcd8, 0.85, 0.3, 0); break;
        case 'barrage': for (let i = 0; i < 8; i++) this.later(0.3 + i * 0.32, () => { const px = x + (Math.random() - 0.5) * 36, pz = z + (Math.random() - 0.5) * 36; const g = this.M.groundAt(px, pz); this.spawnProjectile(u, null, 'arty', new T.Vector3(u.pos.x, u.pos.y + 6, u.pos.z), new T.Vector3(px, g, pz), false, Math.max(60, u.dmg * 0.6), Math.max(50, u.pen * 0.6), 1).aoe = 8; }); break;
        case 'orbital': this.zones.push({ kind: 'orbital', x, z, r: 18, t: 3, team, from: u }); this.addFeed('Orbital Lance inbound!', team ? '#ff8a7a' : '#ffd27a'); break;
        case 'napalm': this.zones.push({ kind: 'fire', x, z, r: 16, t: 8, team, from: u }); this.fx.explosion(x, this.M.groundAt(x, z), z, 1.5); break;
        case 'carpet': { const dx = Math.sin(u.yaw), dz = Math.cos(u.yaw); for (let i = 0; i < 12; i++) this.later(0.15 * i, () => { const px = x + dx * (i - 6) * 8, pz = z + dz * (i - 6) * 8; const g = this.M.groundAt(px, pz); this.spawnProjectile(u, null, 'bomb', new T.Vector3(px - dx * 20, Math.max(g + 30, u.pos.y), pz - dz * 20), new T.Vector3(px, g, pz), false, u.dmg * 0.7, u.pen, 1).aoe = 11; }); break; }
        case 'jumpjets': u.jump = { x0: u.pos.x, z0: u.pos.z, x1: x, z1: z, t: 0, dur: 1.3, h: 16 }; u.path = null; break;
        case 'grenade': for (let i = 0; i < 3; i++) this.later(0.2 + i * 0.15, () => { const px = x + (Math.random() - 0.5) * 8, pz = z + (Math.random() - 0.5) * 8; const g = this.M.groundAt(px, pz); const p = this.spawnProjectile(u, null, 'arty', new T.Vector3(u.pos.x, u.pos.y + 2, u.pos.z), new T.Vector3(px, g, pz), false, 70, 20, 1); p.aoe = 6; p.T = 1.0; p.vx = (px - p.sx) / p.T; p.vz = (pz - p.sz) / p.T; p.vy = (g - p.sy + 4.9) / p.T; }); break;
        case 'mines': for (let i = 0; i < 3; i++) { const mx = x + (i - 1) * 7, mz = z + (Math.random() - 0.5) * 5; const m = new T.Mesh(new T.CylinderGeometry(0.6, 0.7, 0.25, 8), new T.MeshStandardMaterial({ color: team ? 0x5a2a22 : 0x2a3a4a })); m.position.set(mx, this.M.groundAt(mx, mz) + 0.1, mz); this.scene.add(m); m.visible = team === 0; this.zones.push({ kind: 'mine', x: mx, z: mz, r: 4, t: 240, team, mesh: m, from: u }); } break;
        case 'decoy': { const d = this.spawnUnit(team, u.card, x, z, { free: true }); d.isDecoy = true; d.summon = true; d.hp = d.maxHp = 1; d.decoyT = 12; d.rof = 0; d.obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; } }); this.teams[team].pop -= d.cls.pop; d.order = { type: 'idle' }; break; }
        case 'drones': for (let i = 0; i < 3; i++) this.spawnDrone(u, i); break;
        case 'dismount': {
          const fac = this.teams[team].fac, rank = Math.min(6, Math.max(1, u.def.rank));
          const lineDef = SM.UNIT_LIST.find(d => d.fac === fac && d.cls === 'rifle' && d.rank === rank) || SM.UNIT_LIST.find(d => d.fac === fac && d.cls === 'rifle');
          const s = this.spawnUnit(team, { def: lineDef, mods: [], skin: null }, u.pos.x - Math.sin(u.yaw) * (u.radius + 4), u.pos.z - Math.cos(u.yaw) * (u.radius + 4), { free: true });
          this.teams[team].pop -= s.cls.pop; s.summon = true;
          if (team === 0) this.addFeed('Squad dismounted.', '#9fd4ff');
          break;
        }
        case 'torpedo': for (let i = -1; i <= 1; i++) { const px = x + i * 8, pz = z; const p = this.spawnProjectile(u, null, 'torpedo', new T.Vector3(u.pos.x, (this.M.water || 0) - 1, u.pos.z), new T.Vector3(px, (this.M.water || 0) - 1, pz), false, u.dmg * 0.8, u.pen, 1); p.aoe = 7; } break;
      }
      return true;
    }

    spawnDrone(u, i) {
      const fac = this.teams[u.team].fac;
      const dd = SM.UNIT_LIST.find(d => d.fac === fac && d.cls === 'hscout' && d.rank === 1);
      if (!dd) return;
      const d = this.spawnUnit(u.team, { def: dd, mods: [], skin: null }, u.pos.x + (i - 1) * 6, u.pos.z + 4, { free: true, alt: 4 });
      d.obj.scale.setScalar(0.45); d.radius *= 0.45; d.maxHp = d.hp = 90; d.dmg = 10; d.summon = true; d.decoyT = 25; d.climb = true;
      this.teams[u.team].pop -= d.cls.pop;
      d.order = { type: 'idle' };
      const t = u.target;
      if (t && t.alive) this.order(d, { type: 'attack', target: t });
    }

    updateZones(dt) {
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        z.t -= dt;
        if (z.kind === 'fire') {
          if (Math.random() < dt * 25) this.fx.fire.spawn(z.x + (Math.random() - 0.5) * z.r * 1.6, this.M.groundAt(z.x, z.z) + 0.5, z.z + (Math.random() - 0.5) * z.r * 1.6, 0, 3 + Math.random() * 3, 0, 0.8, 4, 1, 0xff7a20, 0.9, 0.5, -2);
          if (Math.random() < dt * 6) this.fx.smoke.spawn(z.x + (Math.random() - 0.5) * z.r, this.M.groundAt(z.x, z.z) + 2, z.z + (Math.random() - 0.5) * z.r, 0, 3, 0, 4, 4, 12, 0x2a2624, 0.6, 0.2, -0.5);
          this.near(z.x, z.z, z.r, o => { if (o.team !== z.team && o.alive && !SM.isAir(o.cls)) this.damage(o, (o.squad ? 30 : 20) * dt, 40, z.from, { aoe: true }); });
        } else if (z.kind === 'orbital' && z.t <= 0 && !z.fired) {
          z.fired = true;
          const g = this.M.groundAt(z.x, z.z);
          for (let k = 0; k < 4; k++) this.fx.beam(z.x + (Math.random() - 0.5) * 3, g + 400, z.z + (Math.random() - 0.5) * 3, z.x, g, z.z, 0xbfe8ff, 1.2);
          this.fx.explosion(z.x, g, z.z, 3.2, 'plasma');
          this.areaDamage(z.x, z.z, z.r, 900, 400, z.from, z.team);
          SM.Audio.boom(3, this.vol({ x: z.x, z: z.z }));
          this.cameraShake = 1;
        } else if (z.kind === 'orbital' && !z.fired) {
          if (Math.random() < 0.6) this.fx.glowAt(z.x, this.M.groundAt(z.x, z.z) + 1, z.z, 0xbfe8ff, 6 + (3 - z.t) * 6);
        } else if (z.kind === 'mine') {
          let boom = null;
          this.near(z.x, z.z, z.r, o => { if (!boom && o.team !== z.team && o.alive && !o.squad && !SM.isAir(o.cls) && o.cls.move !== 'naval' && o.cls.move !== 'sub' && !o.isHQ) boom = o; });
          if (boom) { this.damage(boom, 260, 200, z.from, { aoe: true }); this.fx.explosion(z.x, this.M.groundAt(z.x, z.z), z.z, 1.2); SM.Audio.boom(1.2, this.vol({ x: z.x, z: z.z })); z.t = 0; }
          if (z.mesh) z.mesh.visible = z.team === 0;
        }
        if (z.t <= 0 && (z.kind !== 'orbital' || z.fired)) { if (z.mesh) { this.scene.remove(z.mesh); z.mesh.geometry.dispose(); z.mesh.material.dispose(); } this.zones.splice(i, 1); }
      }
      // decoys and drones expire
      for (const u of this.units) if (u.decoyT !== undefined) { u.decoyT -= dt; if (u.decoyT <= 0) { if (u.isDecoy) this.killUnit(u, null); else { this.fx.sparks(u.pos.x, u.pos.y, u.pos.z); this.removeUnit(u); } } }
    }

    // ---------------------------------------------------------- capture points & tickets
    updateCapture(dt) {
      for (const p of this.points) {
        const n = [0, 0];
        this.near(p.x, p.z, 21, o => { if (o.alive && !o.isHQ && !o.isDecoy && o.cls.move !== 'plane' && o.cls.move !== 'heli' && o.cls.move !== 'sub') n[o.team] += o.squad ? 1.3 : 1; });
        p.present = n;
        p.contested = n[0] > 0 && n[1] > 0;
        if (p.contested) continue;
        const prev = p.owner;
        if (n[0] > 0) p.prog = Math.min(100, p.prog + dt * 9 * Math.min(3, 0.7 + n[0] * 0.5));
        else if (n[1] > 0) p.prog = Math.max(-100, p.prog - dt * 9 * Math.min(3, 0.7 + n[1] * 0.5));
        if (p.prog >= 100) p.owner = 0; else if (p.prog <= -100) p.owner = 1;
        else if (p.owner === 0 && p.prog <= 0) p.owner = -1; else if (p.owner === 1 && p.prog >= 0) p.owner = -1;
        if (p.owner !== prev) {
          if (p.owner >= 0) {
            this.stats.captures[p.owner]++;
            this.addFeed(p.owner === 0 ? 'Point ' + p.letter + ' captured.' : 'Enemy captured point ' + p.letter + '.', p.owner === 0 ? '#9fd4ff' : '#ff9a8a');
            if (p.owner === 1) SM.Audio.alert();
            if (p.owner === 0 && this.o.onCapture) this.o.onCapture();
          } else if (prev >= 0) this.addFeed('Point ' + p.letter + ' neutralised.', '#cccccc');
        }
      }
    }
    bleed() {
      const own = [0, 0];
      for (const p of this.points) if (p.owner >= 0) own[p.owner]++;
      const diff = own[0] - own[1];
      if (diff > 0) this.teams[1].tickets -= diff;
      else if (diff < 0) this.teams[0].tickets -= -diff;
      for (const tm of this.teams) if (tm.tickets <= 0 && !this.over) { tm.tickets = 0; this.finish(1 - tm.id, tm.id ? 'Enemy reinforcements exhausted' : 'Our reinforcements are exhausted'); }
    }

    finish(winner, reason) {
      if (this.over) return;
      this.over = true;
      this.winner = winner; this.reason = reason;
      const res = { win: winner === 0, reason, time: this.time, tickets: this.teams.map(t => t.tickets), stats: this.stats, map: this.def.id, faction: this.o.playerFaction };
      if (this.o.onEnd) setTimeout(() => this.o.onEnd(res), 900);
    }

    // ---------------------------------------------------------- AI commander
    setupAI() {
      this.ai = [null, { t: 2, next: null, orderT: 0, abilT: 0 }];
      if (this.o.autoplay) this.ai[0] = { t: 1, next: null, orderT: 0, abilT: 0 };
    }
    updateAI(dt) {
      for (let team = 0; team < 2; team++) {
        const ai = this.ai[team];
        if (!ai) continue;
        ai.t -= dt; ai.orderT -= dt; ai.abilT -= dt;
        const tm = this.teams[team];
        if (ai.t <= 0) {
          ai.t = 1.2;
          if (ai.next === null) ai.next = this.aiChooseCard(team);
          if (ai.next !== null && ai.next >= 0) {
            const why = this.canDeploy(team, tm.cards[ai.next]);
            if (!why) { this.deploy(team, ai.next); ai.next = null; }
            else if (why === 'nowater' || (why === 'pop' && Math.random() < 0.3) || (why === 'cooldown' && Math.random() < 0.2)) ai.next = null;
          } else ai.next = null;
        }
        if (ai.orderT <= 0) { ai.orderT = 2; this.aiOrders(team); }
        if (ai.abilT <= 0) { ai.abilT = 0.8; this.aiAbilities(team); }
      }
    }
    aiChooseCard(team) {
      const tm = this.teams[team];
      const enemyAir = this.units.filter(u => u.team !== team && SM.isAir(u.cls) && u.vis[team]).length;
      const mine = this.units.filter(u => u.team === team && !u.isHQ);
      const hasAA = mine.filter(u => u.cls.aa === 2).length;
      const weights = tm.cards.map((c, i) => {
        if (SM.isNaval(c.def.cls === undefined ? {} : SM.CLASSES[c.def.cls]) && !this.M.docks[team]) return 0;
        const cls = SM.CLASSES[c.def.cls];
        let w = 1;
        if (cls.aa === 2 && enemyAir > hasAA) w += 3;
        if (cls.branch === 'infantry') w += mine.filter(u => u.squad).length < 3 ? 2 : 0;
        if (c.def.cp > tm.cp + 600) w *= 0.3;
        const same = mine.filter(u => u.def.id === c.def.id).length;
        w /= (1 + same * 0.7);
        return w;
      });
      const sum = weights.reduce((a, b) => a + b, 0);
      if (sum <= 0) return -1;
      let r = Math.random() * sum;
      for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
      return weights.length - 1;
    }
    aiOrders(team) {
      const mine = this.units.filter(u => u.team === team && !u.isHQ && u.alive && !u.isDecoy);
      const enemyHQ = this.teams[1 - team].hq;
      const myHQ = this.M.hq[team];
      const targets = this.points.map(p => {
        let s = Math.hypot(p.x - myHQ.x, p.z - myHQ.z) * 0.15;
        if (p.owner === team) s += p.present[1 - team] > 0 ? -60 : 60;
        else if (p.owner === 1 - team) s -= 25;
        else s -= 40;
        return { p, s };
      }).sort((a, b) => a.s - b.s);
      const owned = this.points.filter(p => p.owner === team).length;
      for (const u of mine) {
        const mv = u.cls.move;
        if (u.order.type === 'attack' && u.order.target && u.order.target.alive) continue;
        const busy = (u.order.type === 'move' || u.order.type === 'amove') && (this.time - (u.aiT || 0) < 25);
        if (busy) continue;
        if (u.order.type === 'idle' && u.aiGoal && Math.hypot(u.aiGoal.x - u.pos.x, u.aiGoal.z - u.pos.z) < 25 && this.time - (u.aiT || 0) < 30 + Math.random() * 20) {
          if (u.def.wt === 'arty' && !u.buffs.siege && u.target) { const i = u.abil.findIndex(a => a.id === 'entrench'); if (i >= 0) this.useAbility(u, i); }
          continue;
        }
        let goal;
        if (mv === 'plane') {
          const vis = this.units.filter(o => o.team !== team && o.alive && o.vis[team] && !o.isHQ);
          const air = vis.filter(o => SM.isAir(o.cls));
          const pick = u.cls.airFirst && air.length ? air[Math.floor(Math.random() * air.length)] : vis.length ? vis[Math.floor(Math.random() * vis.length)] : null;
          if (pick && (u.def.cls !== 'bomber' || !SM.isAir(pick.cls))) { this.order(u, { type: 'attack', target: pick }); u.aiT = this.time; continue; }
          const tp = targets[Math.floor(Math.random() * Math.min(2, targets.length))].p;
          goal = { x: tp.x, z: tp.z };
          this.order(u, { type: 'amove', x: goal.x, z: goal.z }); u.aiT = this.time; continue;
        }
        if (mv === 'naval' || mv === 'sub') {
          // ships sail towards the point or enemy dock nearest to water
          const ed = this.M.docks[1 - team];
          const cand = targets.map(t => t.p).concat(ed ? [{ x: ed.x, z: ed.z }] : []);
          const c = cand[Math.floor(Math.random() * cand.length)];
          const cc = SM.nearestOpen(this.M, this.M.nav.naval, SM.cellOf(this.M, c.x, c.z), 30);
          if (cc >= 0) { const pnt = SM.cellCenter(this.M, cc); goal = { x: pnt[0], z: pnt[1] }; }
          else continue;
        } else {
          const late = owned >= Math.ceil(this.points.length / 2) && Math.random() < 0.25 && this.time > 240;
          if (late) goal = { x: enemyHQ.pos.x + (Math.random() - 0.5) * 40, z: enemyHQ.pos.z + (team ? -50 : 50) };
          else { const k = Math.min(targets.length - 1, Math.floor(Math.pow(Math.random(), 1.6) * Math.min(3, targets.length))); const tp = targets[k].p; goal = { x: tp.x + (Math.random() - 0.5) * 22, z: tp.z + (Math.random() - 0.5) * 22 }; }
        }
        u.aiGoal = goal; u.aiT = this.time;
        this.order(u, { type: 'amove', x: goal.x, z: goal.z });
      }
    }
    aiAbilities(team) {
      for (const u of this.units) {
        if (u.team !== team || u.isHQ || !u.alive || u.isDecoy) continue;
        u.abil.forEach((a, i) => {
          if (a.cd > 0) return;
          const A = SM.ABILITIES[a.id];
          const hurt = u.hp / u.maxHp, recent = this.time - u.lastHit < 2.5;
          const t = u.target && u.target.alive ? u.target : null;
          let use = false, px, pz;
          switch (a.id) {
            case 'repair': use = hurt < 0.5; break;
            case 'shield': case 'flares': use = recent; break;
            case 'smoke': use = recent && hurt < 0.6; px = u.pos.x; pz = u.pos.z; break;
            case 'cloak': use = hurt < 0.4 && recent; break;
            case 'sprint': case 'overdrive': case 'afterburner': use = u.speed > 2 && (u.order.type === 'move' || u.order.type === 'amove') && u.path && u.path.length > 3; break;
            case 'emp': case 'ecm': { let n = 0; this.near(u.pos.x, u.pos.z, 35, o => { if (o.team !== team && o.alive && !o.squad) n++; }); use = n >= 2; break; }
            case 'nanoRepair': { let n = 0; this.near(u.pos.x, u.pos.z, 30, o => { if (o.team === team && o.alive && o.hp < o.maxHp * 0.6) n++; }); use = n >= 2; break; }
            case 'sonar': use = Math.random() < 0.05; break;
            case 'overcharge': case 'apRound': case 'railCharge': use = !!t; break;
            case 'entrench': use = u.def.wt === 'arty' ? (!u.buffs.siege && !!t) : (u.buffs.siege ? !t && Math.random() < 0.1 : false); break;
            case 'drones': case 'dismount': use = !!t; break;
            case 'decoy': use = recent; px = u.pos.x + (Math.random() - 0.5) * 30; pz = u.pos.z + (Math.random() - 0.5) * 30; break;
            case 'jumpjets': if (u.aiGoal && u.order.type !== 'idle') { const d = Math.hypot(u.aiGoal.x - u.pos.x, u.aiGoal.z - u.pos.z); if (d > 40) { const k = Math.min(1, 55 / d); px = u.pos.x + (u.aiGoal.x - u.pos.x) * k; pz = u.pos.z + (u.aiGoal.z - u.pos.z) * k; use = this.M.nav.ground[SM.cellOf(this.M, px, pz)] === 1; } } break;
            case 'barrage': case 'orbital': case 'napalm': case 'carpet': case 'grenade': case 'mines': case 'torpedo':
              if (t && Math.hypot(t.pos.x - u.pos.x, t.pos.z - u.pos.z) < (A.range || 60) && !SM.isAir(t.cls)) { if (a.id === 'torpedo' && !(t.cls.move === 'naval' || t.cls.move === 'sub')) break; use = true; px = t.pos.x; pz = t.pos.z; }
              break;
          }
          if (use) this.useAbility(u, i, px, pz);
        });
      }
    }

    // ---------------------------------------------------------- weather hooks
    onWeather(id, initial) {
      const w = SM.WEATHER[id];
      if (!initial) this.addFeed('Weather: ' + w.name + '. ' + w.desc, '#e8d9a8');
      if (this.hud) this.hudWeather();
    }

    vol(p) {
      if (!this.cam) return 0;
      const d = Math.hypot(p.x - this.cam.x, p.z - this.cam.z);
      const z = Math.max(0.35, 1 - this.cam.dist / 500);
      return SM.clamp(1 - d / 320, 0, 1) * z;
    }

    addFeed(text, col) {
      this.feed.push({ text, col: col || '#ddd', t: this.time });
      if (this.feed.length > 7) this.feed.shift();
      this.feedDirty = true;
    }

    dispose() {
      this.disposeUI && this.disposeUI();
      this.weather.dispose(); this.fx.dispose();
      this.scene.traverse(o => {
        if (o.isMesh || o.isPoints || o.isLine || o.isInstancedMesh) {
          if (o.userData.shared) return;
        }
      });
      // dispose map-specific geometry (unit templates are cached and shared, keep them)
      const own = [this.terrain, this.water, this.props, this.sky];
      for (const g of own) if (g) g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
      if (this.envRT) this.envRT.dispose();
      this.scene.clear && this.scene.clear();
    }
  };
})();
