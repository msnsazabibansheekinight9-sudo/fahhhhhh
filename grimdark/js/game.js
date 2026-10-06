'use strict';
// Player, HUD, missions, pickups and the main loop.
(function () {
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const $ = id => document.getElementById(id);
  const TEST = new URLSearchParams(location.search).get('test');

  /* ================= player ================= */
  const P = G.player = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0,
    reset(start) {
      this.pos.copy(start); this.vel.set(0, 0, 0); this.yaw = 0; this.pitch = 0;
      this.hp = this.maxHp = 100; this.armor = this.maxArmor = 100; this.armorDelay = 0;
      this.onGround = true; this.eyeY = 1.85; this.crouch = 0; this.moveAmt = 0; this.bobPhase = 0;
      this.sprinting = false; this.sprintK = 0; this.landDip = 0; this.recoil = 0; this.recoilYaw = 0;
      this.fury = 0; this.furyT = 0; this.dead = false; this.deadT = 0; this.canAct = true; this.noise = 0; this.stepSide = 0;
      this.hurtFlash = 0; this.lastStepPhase = 0;
    },
    hurt(dmg, from, kind) {
      if (this.dead || G.game.state !== 'play') return;
      if (this.furyT > 0) dmg *= 0.6;
      let toHp = dmg;
      if (this.armor > 0 && kind !== 'overheat') {
        const absorb = Math.min(this.armor, dmg * 0.7);
        this.armor -= absorb; toHp = dmg - absorb;
        G.audio.play('armorHit', null, 0.6);
      }
      this.hp -= toHp;
      this.armorDelay = 4;
      this.hurtFlash = Math.min(1, this.hurtFlash + dmg / 25);
      G.shake += Math.min(0.5, dmg / 40);
      G.audio.play('hurt', null, Math.min(1, dmg / 20));
      if (from) G.hud.damageDir(from);
      G.game.stats.taken += dmg;
      if (this.hp <= 0) { this.hp = 0; this.die(); }
    },
    die() {
      this.dead = true; this.deadT = 0;
      G.audio.play('bell', null, 1);
      const run = G.game.runId;
      setTimeout(() => G.game.runId === run && G.game.end(false), 2600);
    },
    update(dt) {
      const I = G.input, sens = 0.0022 * G.settings.sens * (1 - G.arsenal.adsK * 0.45);
      if (this.dead) {
        this.deadT += dt;
        this.eyeY = G.damp(this.eyeY, 0.4, 3, dt);
        this.pitch = G.damp(this.pitch, 0.6, 2, dt);
        this.applyCamera(dt, 0.6 * Math.min(1, this.deadT));
        return;
      }
      this.yaw -= I.mdx * sens; this.pitch -= I.mdy * sens;
      // recoil feeds into the view and recovers partially
      const r = this.recoil * Math.min(1, dt * 22); this.pitch += r; this.recoil -= r;
      const ry = this.recoilYaw * Math.min(1, dt * 22); this.yaw += ry; this.recoilYaw -= ry;
      this.pitch = G.clamp(this.pitch, -1.5, 1.5);
      // movement
      const k = I.keys;
      let fx = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), sx = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
      const crouching = k.KeyC || k.ControlLeft;
      this.crouch = G.damp(this.crouch, crouching ? 1 : 0, 12, dt);
      this.sprinting = (k.ShiftLeft || k.ShiftRight) && fx > 0 && !crouching && G.arsenal.adsK < 0.3 && this.onGround !== false;
      if (this.sprinting && (G.input.lmb && !G.arsenal.defs[G.arsenal.cur].melee)) this.sprinting = false;
      this.sprintK = G.damp(this.sprintK, this.sprinting ? 1 : 0, 8, dt);
      const fwd = v1.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = v2.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const wish = new THREE.Vector3().addScaledVector(fwd, fx).addScaledVector(right, sx);
      if (wish.lengthSq() > 1) wish.normalize();
      let speed = this.sprinting ? 10.5 : crouching ? 3.6 : 6.6;
      if (G.arsenal.adsK > 0.5) speed *= 0.6;
      if (this.furyT > 0) speed *= 1.2;
      const acc = this.onGround ? 11 : 2.2;
      this.vel.x = G.damp(this.vel.x, wish.x * speed, acc, dt);
      this.vel.z = G.damp(this.vel.z, wish.z * speed, acc, dt);
      if (I.pressed.Space && this.onGround) { this.vel.y = 7.4; this.onGround = false; G.audio.play('step', null, 0.6); }
      this.vel.y -= 22 * dt;
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      const height = 2.0 - this.crouch * 0.6;
      G.world.collide(this.pos, 0.5, height, 0.55);
      // vertical
      const prevY = this.pos.y;
      this.pos.y += this.vel.y * dt;
      const ceil = G.world.ceilingAt(this.pos.x, this.pos.z, prevY + height - 0.01, 0.3);
      if (this.pos.y + height > ceil && this.vel.y > 0) { this.pos.y = ceil - height; this.vel.y = 0; }
      const gy = G.world.groundAt(this.pos.x, this.pos.z, Math.max(prevY, this.pos.y) + 0.55);
      if (this.pos.y <= gy) {
        if (!this.onGround && this.vel.y < -6) { this.landDip = Math.min(1, -this.vel.y / 14); G.audio.play('land', null, 0.7); G.shake += 0.08; }
        if (gy - this.pos.y > 0.05 && this.onGround) this.eyeLag = (this.eyeLag || 0) - (gy - this.pos.y);
        this.pos.y = gy; this.vel.y = 0; this.onGround = true;
      } else if (this.pos.y > gy + 0.05) {
        this.onGround = false;
      }
      const H = G.worlds.HALF - 0.6;
      this.pos.x = G.clamp(this.pos.x, -H, H); this.pos.z = G.clamp(this.pos.z, -H, H);
      this.landDip = G.damp(this.landDip, 0, 6, dt);
      const hs = Math.hypot(this.vel.x, this.vel.z);
      this.moveAmt = G.clamp(hs / 6.6, 0, 1.6);
      if (this.onGround) {
        this.bobPhase += dt * hs * 1.55;
        const half = Math.floor(this.bobPhase / Math.PI);
        if (half !== this.lastStepPhase && hs > 1) { this.lastStepPhase = half; G.audio.play('step', null, this.sprinting ? 0.6 : crouching ? 0.15 : 0.35); }
      }
      // armour regenerates, health only in fury
      this.armorDelay -= dt;
      if (this.armorDelay <= 0) this.armor = Math.min(this.maxArmor, this.armor + 22 * dt);
      if (this.furyT > 0) {
        this.furyT -= dt; this.hp = Math.min(this.maxHp, this.hp + 5 * dt);
        if (this.furyT <= 0) { G.enemyScale = 1; G.hud.fury(false); }
      } else if (I.pressed.KeyF && this.fury >= 100) {
        this.fury = 0; this.furyT = 9; G.enemyScale = 0.45; G.audio.play('fury', null, 1); G.hud.fury(true);
        G.hud.banner('RITE OF FURY', 1.6, '#ff5a2a'); G.shake += 0.4;
      }
      this.hurtFlash = G.damp(this.hurtFlash, 0, 3, dt);
      this.applyCamera(dt, 0);
    },
    applyCamera(dt, roll) {
      this.eyeLag = G.damp(this.eyeLag || 0, 0, 12, dt);
      const eye = this.dead ? this.eyeY : 1.85 - this.crouch * 0.55 - this.landDip * 0.12 + (this.eyeLag || 0);
      const cam = G.camera;
      const bobY = this.onGround ? Math.abs(Math.sin(this.bobPhase)) * 0.05 * Math.min(1, this.moveAmt) : 0;
      cam.position.set(this.pos.x, this.pos.y + eye + bobY, this.pos.z);
      const sh = G.shake * 0.05;
      cam.position.x += (Math.random() - 0.5) * sh; cam.position.y += (Math.random() - 0.5) * sh;
      cam.rotation.order = 'YXZ';
      cam.rotation.set(this.pitch + (Math.random() - 0.5) * sh * 0.4, this.yaw, roll + Math.sin(this.bobPhase) * 0.004 * this.moveAmt - G.arsenal.sway.x * 0.15);
      G.shake *= Math.exp(-dt * 5);
      const targetFov = G.settings.fov * (1 - G.arsenal.adsK * 0.28) + this.sprintK * 6 + (this.furyT > 0 ? 6 : 0);
      if (Math.abs(cam.fov - targetFov) > 0.05) { cam.fov = G.damp(cam.fov, targetFov, 12, dt); cam.updateProjectionMatrix(); G.fx.updateScale(); }
      cam.updateMatrixWorld();
    }
  };

  /* ================= HUD ================= */
  const H = G.hud = {
    init() {
      this.radar = $('radar').getContext('2d');
      this.feed = $('feed');
      this.dirs = $('dmgdirs');
    },
    banner(text, dur, color) {
      const b = $('banner');
      b.textContent = text; b.style.color = color || '';
      b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
      clearTimeout(this.bt); this.bt = setTimeout(() => b.classList.remove('show'), (dur || 2) * 1000);
    },
    hitmarker(head, killed) {
      const h = $('hitmark');
      h.className = killed ? 'kill' : head ? 'head' : '';
      h.style.opacity = 1;
      clearTimeout(this.ht); this.ht = setTimeout(() => h.style.opacity = 0, killed ? 220 : 110);
      G.audio.play(killed ? 'kill' : head ? 'headshot' : 'hitmark', null, 0.6);
      G.game.stats.hits++;
    },
    killfeed(text, cls) {
      const d = document.createElement('div');
      d.className = 'kf ' + (cls || ''); d.textContent = text;
      this.feed.prepend(d);
      while (this.feed.children.length > 6) this.feed.lastChild.remove();
      setTimeout(() => d.classList.add('fade'), 3000);
      setTimeout(() => d.remove(), 3800);
    },
    damageDir(from) {
      const dx = from.x - P.pos.x, dz = from.z - P.pos.z;
      const ang = Math.atan2(dx, -dz) + P.yaw;
      const el = document.createElement('div');
      el.className = 'dd'; el.style.transform = `rotate(${ang}rad)`;
      this.dirs.appendChild(el);
      setTimeout(() => el.remove(), 900);
    },
    fury(on) { document.body.classList.toggle('fury', on); },
    update() {
      const A = G.arsenal, d = A.defs[A.cur], s = A.st[A.cur];
      $('hpbar').style.width = (P.hp / P.maxHp * 100) + '%';
      $('arbar').style.width = (P.armor / P.maxArmor * 100) + '%';
      $('hpnum').textContent = Math.ceil(P.hp);
      $('arnum').textContent = Math.ceil(P.armor);
      $('furybar').style.width = (P.furyT > 0 ? P.furyT / 9 * 100 : P.fury) + '%';
      $('furyhint').style.opacity = P.fury >= 100 && P.furyT <= 0 ? 1 : 0;
      $('wname').textContent = d.name;
      let ammo = '';
      if (d.melee) ammo = '∞';
      else if (d.heatWeapon) ammo = s.lock > 0 ? 'VENTING' : Math.round(s.heat) + '°';
      else if (d.stream) ammo = Math.ceil(s.mag) + ' <small>/ ' + Math.ceil(s.reserve) + '</small>';
      else ammo = s.mag + ' <small>/ ' + s.reserve + '</small>';
      if (this.lastAmmo !== ammo) { $('ammo').innerHTML = ammo; this.lastAmmo = ammo; }
      $('heat').style.display = d.heatWeapon ? 'block' : 'none';
      if (d.heatWeapon) { $('heatbar').style.width = s.heat + '%'; $('heatbar').style.background = s.lock > 0 ? '#ff4020' : s.heat > 70 ? '#ffb030' : '#4ab0ff'; }
      $('nades').textContent = '◆'.repeat(A.grenades) || '—';
      $('lowammo').style.opacity = (!d.melee && !d.heatWeapon && s.mag <= (d.mag * 0.2) && A.reloadT < 0) ? 1 : 0;
      $('lowammo').textContent = s.mag <= 0 && s.reserve <= 0 ? 'NO AMMO' : 'RELOAD';
      // crosshair spread
      const sp = A.spread() * 900 * (1 - A.adsK * 0.7) + 6;
      const ch = $('cross');
      ch.style.setProperty('--gap', sp + 'px');
      ch.style.opacity = d.melee ? 0.4 : 1 - A.adsK * 0.85;
      $('adsdot').style.opacity = d.melee ? 0 : A.adsK;
      // vitals
      $('vignette').style.opacity = Math.max(P.hurtFlash, P.hp < 35 ? 0.35 + Math.sin(G.t * 5) * 0.15 : 0);
      $('score').textContent = G.game.stats.score;
      // boss
      const b = G.game.boss;
      if (b && !b.dead) { $('boss').style.display = 'block'; $('bossname').textContent = b.t.name; $('bossbar').style.width = (b.hp / b.maxHp * 100) + '%'; }
      else $('boss').style.display = 'none';
      this.drawRadar();
    },
    drawRadar() {
      const c = this.radar, W = 150, R = 70, range = 45;
      c.clearRect(0, 0, W, W);
      c.save(); c.translate(W / 2, W / 2);
      c.strokeStyle = 'rgba(120,255,140,0.25)'; c.lineWidth = 1;
      for (const r of [R, R * 0.66, R * 0.33]) { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); }
      c.beginPath(); c.moveTo(-R, 0); c.lineTo(R, 0); c.moveTo(0, -R); c.lineTo(0, R); c.stroke();
      // sweep
      const sw = (G.t * 2) % (Math.PI * 2);
      const g = c.createConicGradient ? c.createConicGradient(sw - Math.PI / 2, 0, 0) : null;
      if (g) { g.addColorStop(0, 'rgba(120,255,140,0.25)'); g.addColorStop(0.15, 'rgba(120,255,140,0)'); g.addColorStop(1, 'rgba(120,255,140,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill(); }
      const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw);
      for (const e of G.enemies.list) {
        if (e.dead || e.removed) continue;
        const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z;
        // rotate into view space (forward is up)
        const rx = dx * cy - dz * sy, rz = dx * sy + dz * cy;
        let x = rx / range * R, y = rz / range * R;
        const L = Math.hypot(x, y);
        if (L > R) { x *= R / L; y *= R / L; }
        c.fillStyle = e.isBoss ? '#ff3030' : e.t.elite ? '#ffb030' : 'rgba(140,255,150,0.95)';
        c.beginPath(); c.arc(x, y, e.isBoss ? 5 : e.t.elite ? 3.5 : 2.4, 0, 7); c.fill();
      }
      for (const p of G.game.pickups) {
        const dx = p.mesh.position.x - P.pos.x, dz = p.mesh.position.z - P.pos.z;
        const rx = dx * cy - dz * sy, rz = dx * sy + dz * cy;
        const x = rx / range * R, y = rz / range * R;
        if (Math.hypot(x, y) < R) { c.fillStyle = p.kind === 'health' ? '#ff5050' : p.kind === 'ammo' ? '#ffd040' : '#ff8020'; c.fillRect(x - 2, y - 2, 4, 4); }
      }
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 4); c.lineTo(-4, 4); c.fill();
      c.restore();
    }
  };

  /* ================= missions ================= */
  const MISSIONS = G.missions = [
    { id: 'm1', world: 'hive', title: 'Ashes of Tertius', foe: 'Traitor cults & daemons',
      brief: 'The underhive has turned. Cultists have torn open the gates and daemons pour through the breach. Purge every last heretic in the plaza.',
      waves: [[['cultist', 10]], [['cultist', 12], ['fiend', 3]], [['cultist', 14], ['fiend', 6]], [['cultist', 10], ['fiend', 10]]] },
    { id: 'm2', world: 'ice', title: 'The Frozen Horde', foe: 'Greenskin brutes',
      brief: 'A greenskin warband has made landfall on Frostgrave. Their warlord is coming to see who is strong enough to fight. Show him.',
      waves: [[['brute', 8]], [['brute', 8], ['shoota', 5]], [['brute', 10], ['shoota', 8]]], boss: 'warlord' },
    { id: 'm3', world: 'jungle', title: 'Into the Maw', foe: 'The devouring swarm',
      brief: 'The swarm has consumed the jungle moon. Hold the clearing while the beacon transmits, then slay the creature that commands the brood.',
      waves: [[['ripper', 16]], [['ripper', 18], ['spitter', 6]], [['ripper', 20], ['spitter', 8], ['warrior', 2]]], boss: 'tyrant' },
    { id: 'm4', world: 'tomb', title: 'The Sleepers Wake', foe: 'Undying machines',
      brief: 'Something ancient stirs below the sands. Its legions do not stay dead. Destroy their bodies utterly before they rise again.',
      waves: [[['husk', 8]], [['husk', 10], ['stalker', 5]], [['husk', 12], ['stalker', 8]]], boss: 'overlord' },
    { id: 'm5', world: 'forge', title: 'Anvil of Wrath', foe: 'Greenskins & traitors',
      brief: 'Traitors opened the forge to a greenskin raid in exchange for their lives. Neither shall keep them.',
      waves: [[['cultist', 12], ['brute', 4]], [['shoota', 6], ['brute', 8], ['cultist', 8]], [['brute', 10], ['shoota', 6], ['fiend', 6]]], boss: 'warlord' },
    { id: 'm6', world: 'warp', title: 'The Screaming Rift', foe: 'Everything',
      brief: 'Reality is torn. Every horror of the galaxy spills through the rift. At its heart waits the Blood-Crowned. End it.',
      waves: [[['cultist', 10], ['fiend', 6], ['ripper', 10]], [['husk', 6], ['brute', 8], ['spitter', 6]], [['fiend', 10], ['warrior', 2], ['stalker', 6], ['shoota', 6]]], boss: 'bloodlord' },
  ];
  const ENDLESS_POOL = ['ripper', 'spitter', 'brute', 'shoota', 'husk', 'stalker', 'cultist', 'fiend'];
  const BOSSES = ['warlord', 'tyrant', 'overlord', 'bloodlord'];

  const GM = G.game = {
    state: 'menu', pickups: [], boss: null,
    progress() { try { return JSON.parse(localStorage.getItem('ironclad_progress') || '{}'); } catch (e) { return {}; } },
    saveProgress(p) { try { localStorage.setItem('ironclad_progress', JSON.stringify(p)); } catch (e) { } },
    banner(t, d, c) { H.banner(t, d, c); },
    start(mission, worldKey) {
      G.audio.init();
      this.mission = mission;
      this.runId = (this.runId || 0) + 1;
      this.endless = !mission;
      const wk = mission ? mission.world : worldKey;
      G.worlds.build(wk);
      G.enemies.clear(); G.shots.clear(); G.fx.reset(); G.enemies.buildNav();
      this.pickups.forEach(p => p.mesh.parent && p.mesh.parent.remove(p.mesh)); this.pickups = [];
      P.reset(G.worlds.playerStart);
      G.arsenal.reset();
      G.enemyScale = 1; H.fury(false);
      this.wave = 0; this.queue = []; this.spawnT = 0; this.interT = 3; this.boss = null; this.bossSpawned = false;
      this.stats = { kills: 0, heads: 0, gibs: 0, score: 0, time: 0, hits: 0, taken: 0 };
      this.state = 'play';
      document.body.className = 'playing';
      $('menu').style.display = 'none'; $('end').style.display = 'none'; $('pause').style.display = 'none';
      $('hud').style.display = 'block';
      H.banner(mission ? mission.title.toUpperCase() : 'ENDLESS CRUSADE', 3);
      $('objective').textContent = mission ? G.worlds.current.name + ' — ' + mission.foe : G.worlds.current.name + ' — survive';
      if (!TEST) G.input.lock();
    },
    nextWave() {
      this.wave++;
      const m = this.mission;
      let list;
      if (m) {
        if (this.wave > m.waves.length) {
          if (m.boss && !this.bossSpawned) { this.spawnBoss(m.boss); return; }
          this.end(true); return;
        }
        list = m.waves[this.wave - 1];
      } else {
        const n = 8 + this.wave * 4;
        list = [];
        const kinds = [];
        for (let i = 0; i < 3; i++) kinds.push(G.pick(ENDLESS_POOL));
        kinds.forEach((k, i) => list.push([k, Math.ceil(n / 3)]));
        if (this.wave % 3 === 0) list.push(['warrior', 1 + (this.wave / 6 | 0)]);
        const run = this.runId, w = this.wave;
        if (w % 5 === 0) setTimeout(() => this.runId === run && this.state === 'play' && this.spawnBoss(BOSSES[(w / 5 - 1) % BOSSES.length], true), 4000);
      }
      const diffMul = 0.8 + G.settings.difficulty * 0.2;
      this.queue = [];
      for (const [type, count] of list) for (let i = 0; i < Math.round(count * diffMul); i++) this.queue.push(type);
      this.queue.sort(() => Math.random() - 0.5);
      H.banner('WAVE ' + this.wave + (m ? ' / ' + m.waves.length : ''), 2.2);
      G.audio.play('bell', null, 0.6);
    },
    spawnBoss(type, extra) {
      if (!extra) this.bossSpawned = true;
      const far = G.worlds.spawns.slice().sort((a, b) => b.distanceTo(P.pos) - a.distanceTo(P.pos))[0];
      const p = new THREE.Vector3().copy(far).multiplyScalar(0.7);
      this.boss = G.enemies.spawn(type, p);
      H.banner(this.boss.t.name, 3, '#ff4a2a');
    },
    spawnFromQueue() {
      const type = this.queue.shift();
      // choose a spawn point not too close and preferably out of sight
      const pts = G.worlds.spawns.filter(s => s.distanceTo(P.pos) > 22);
      const p = G.pick(pts.length ? pts : G.worlds.spawns).clone();
      p.x += G.rand(-3, 3); p.z += G.rand(-3, 3);
      G.enemies.spawn(type, p);
    },
    onKill(e, o) {
      const s = this.stats;
      s.kills++;
      const head = o && o.part === 'head';
      if (head) s.heads++;
      if (e.gibbed) s.gibs++;
      let pts = e.t.score * (head ? 1.5 : 1) * (e.gibbed ? 1.25 : 1);
      if (P.furyT > 0) pts *= 1.5;
      s.score += Math.round(pts);
      if (P.furyT <= 0) P.fury = Math.min(100, P.fury + (e.isBoss ? 60 : e.t.elite ? 12 : 4));
      H.killfeed(e.t.name + (e.gibbed ? ' — OBLITERATED' : head ? ' — HEADSHOT' : '') + '  +' + Math.round(pts), e.isBoss ? 'boss' : head ? 'hs' : '');
      // drops
      const r = Math.random();
      const drop = e.isBoss ? ['health', 'ammo', 'fury', 'health', 'ammo'] : r < 0.13 ? ['health'] : r < 0.3 ? ['ammo'] : r < 0.33 ? ['fury'] : [];
      drop.forEach(k => this.dropPickup(k, e.pos));
      if (e === this.boss) {
        H.banner(e.t.name + ' IS SLAIN', 3, '#ffcc40');
        const run = this.runId;
        if (this.mission) setTimeout(() => this.runId === run && this.state === 'play' && this.end(true), 4000);
        this.boss = null;
      }
    },
    onRevive(e) { H.killfeed(e.t.name + ' REASSEMBLES', 'rev'); },
    dropPickup(kind, pos) {
      const m = G.models.pickup(kind);
      m.position.set(pos.x + G.rand(-1, 1), 0.6, pos.z + G.rand(-1, 1));
      G.scene.add(m);
      this.pickups.push({ kind, mesh: m, t: 0 });
    },
    updatePickups(dt) {
      for (const p of this.pickups) {
        p.t += dt;
        p.mesh.rotation.y += dt * 2;
        p.mesh.position.y = 0.6 + Math.sin(p.t * 3) * 0.12 + G.world.groundAt(p.mesh.position.x, p.mesh.position.z, 3);
        const d = Math.hypot(p.mesh.position.x - P.pos.x, p.mesh.position.z - P.pos.z);
        let take = false;
        if (d < 1.7 && !P.dead) {
          if (p.kind === 'health' && P.hp < P.maxHp) { P.hp = Math.min(P.maxHp, P.hp + 35); take = true; H.killfeed('+35 VITALITY', 'pick'); }
          else if (p.kind === 'ammo') {
            for (const k of G.arsenal.order) { const df = G.arsenal.defs[k], st = G.arsenal.st[k]; if (df.reserve) st.reserve = Math.min(df.reserve * 1.5, st.reserve + Math.ceil(df.reserve * 0.35)); }
            G.arsenal.grenades = Math.min(5, G.arsenal.grenades + 1);
            take = true; H.killfeed('MUNITIONS RESUPPLIED', 'pick');
          } else if (p.kind === 'fury' && P.furyT <= 0) { P.fury = Math.min(100, P.fury + 30); take = true; H.killfeed('+FURY', 'pick'); }
        }
        if (take) { G.audio.play('pickup', null, 0.8); p.dead = true; }
        if (p.t > 30) p.dead = true;
      }
      this.pickups = this.pickups.filter(p => { if (p.dead) p.mesh.parent && p.mesh.parent.remove(p.mesh); return !p.dead; });
    },
    update(dt) {
      this.stats.time += dt;
      // wave flow
      if (this.queue.length) {
        this.spawnT -= dt;
        const cap = 18 + G.settings.difficulty * 4;
        if (this.spawnT <= 0 && G.enemies.alive() < cap) { this.spawnT = G.rand(0.35, 0.9); this.spawnFromQueue(); }
      } else if (G.enemies.alive() <= 3 && G.enemies.alive() > 0) {
        // stragglers stop skulking and come for the player
        this.huntT = (this.huntT || 0) + dt;
        if (this.huntT > 15) G.enemies.list.forEach(e => e.hunt = true);
      }
      if (!this.queue.length && G.enemies.alive() === 0 && !this.boss) {
        this.huntT = 0;
        this.interT -= dt;
        if (this.interT <= 0) { this.interT = 5; this.nextWave(); }
      }
      const left = this.queue.length + G.enemies.alive();
      $('wave').textContent = this.boss ? 'SLAY THE ' + (this.boss.t.name.replace(/^THE /, '')) : this.wave ? `WAVE ${this.wave}${this.mission ? ' / ' + this.mission.waves.length : ''} — ${left} hostiles` : 'Prepare';
      this.updatePickups(dt);
    },
    end(win) {
      if (this.state !== 'play') return;
      this.state = 'end';
      document.exitPointerLock && document.exitPointerLock();
      const s = this.stats;
      if (win && this.mission) {
        const pr = this.progress();
        const i = MISSIONS.indexOf(this.mission);
        pr.unlocked = Math.max(pr.unlocked || 1, i + 2);
        pr['best_' + this.mission.id] = Math.max(pr['best_' + this.mission.id] || 0, s.score);
        this.saveProgress(pr);
      }
      if (!this.mission) {
        const pr = this.progress();
        pr.endlessBest = Math.max(pr.endlessBest || 0, this.wave);
        this.saveProgress(pr);
      }
      $('endtitle').textContent = win ? 'VICTORY' : this.mission ? 'YOU HAVE FALLEN' : 'THE CRUSADE ENDS';
      $('endsub').textContent = win ? 'Your deeds will be inscribed upon the walls of the reclusiam.' : this.mission ? 'Your gene-seed must be recovered. Try again, Brother.' : 'You held for ' + (this.wave) + ' waves.';
      const m = Math.floor(s.time / 60), sec = Math.floor(s.time % 60);
      $('endstats').innerHTML = `<div><b>${s.kills}</b>kills</div><div><b>${s.heads}</b>headshots</div><div><b>${s.gibs}</b>obliterated</div><div><b>${s.score}</b>score</div><div><b>${m}:${String(sec).padStart(2, '0')}</b>time</div>`;
      $('end').style.display = 'flex';
      $('hud').style.display = 'none';
      document.body.className = '';
      $('endnext').style.display = win && this.mission && MISSIONS.indexOf(this.mission) < MISSIONS.length - 1 ? '' : 'none';
    },
    quit() {
      this.state = 'menu'; this.runId++;
      document.exitPointerLock && document.exitPointerLock();
      G.enemies.clear(); G.shots.clear();
      if (G.arsenal.flameLoop) { G.arsenal.flameLoop.stop(); G.arsenal.flameLoop = null; }
      if (G.arsenal.chainLoop) { G.arsenal.chainLoop.stop(); G.arsenal.chainLoop = null; }
      $('hud').style.display = 'none'; $('pause').style.display = 'none'; $('end').style.display = 'none';
      document.body.className = '';
      Menu.show();
    }
  };

  /* ================= menu ================= */
  const WORLD_ART = { hive: ['#8a4a22', '#1a1210'], ice: ['#a8c0d4', '#2a4a6a'], jungle: ['#5a7a3a', '#1a3020'], tomb: ['#1a3a24', '#020604'], forge: ['#6a2a10', '#100806'], warp: ['#8a1040', '#1a0420'] };
  const Menu = {
    show() {
      $('menu').style.display = 'flex';
      const pr = GM.progress();
      const un = pr.unlocked || 1;
      const list = $('missions'); list.innerHTML = '';
      MISSIONS.forEach((m, i) => {
        const el = document.createElement('button');
        const locked = i + 1 > un && !pr.all;
        el.className = 'mcard' + (locked ? ' locked' : '');
        const [a, b] = WORLD_ART[m.world];
        el.style.background = `linear-gradient(160deg, ${a}, ${b})`;
        el.innerHTML = `<span class="mnum">${['I', 'II', 'III', 'IV', 'V', 'VI'][i]}</span><span class="mtitle">${m.title}</span><span class="mworld">${G.worlds.defs[m.world].name}</span><span class="mfoe">${m.foe}${m.boss ? ' · boss' : ''}</span>` +
          (pr['best_' + m.id] ? `<span class="mbest">best ${pr['best_' + m.id]}</span>` : '') + (locked ? '<span class="lock">LOCKED</span>' : '');
        el.onclick = () => { if (locked) return; G.audio.init(); G.audio.play('ui'); this.brief(m); };
        list.appendChild(el);
      });
      $('endlessBest').textContent = pr.endlessBest ? 'Best: wave ' + pr.endlessBest : '';
    },
    brief(m) {
      $('brief').style.display = 'flex';
      $('btitle').textContent = m.title;
      $('bworld').textContent = G.worlds.defs[m.world].name + ' — ' + m.foe;
      $('btext').textContent = m.brief;
      $('bgo').onclick = () => { $('brief').style.display = 'none'; GM.start(m); };
    }
  };
  G.menu = Menu;

  function bindUI() {
    $('bback').onclick = () => $('brief').style.display = 'none';
    $('endlessGo').onclick = () => { G.audio.init(); GM.start(null, $('endlessWorld').value); };
    $('resume').onclick = () => { G.input.lock(); };
    $('quit').onclick = () => GM.quit();
    $('endretry').onclick = () => GM.start(GM.mission, G.worlds.key);
    $('endmenu').onclick = () => GM.quit();
    $('endnext').onclick = () => GM.start(MISSIONS[MISSIONS.indexOf(GM.mission) + 1]);
    $('unlockall').onclick = () => { const p = GM.progress(); p.all = true; GM.saveProgress(p); Menu.show(); };
    const bindSel = (id, key, conv) => {
      const el = $(id);
      try { const v = localStorage.getItem('ironclad_' + key); if (v != null) { el.value = v; G.settings[key] = conv(v); } } catch (e) { }
      el.oninput = () => { G.settings[key] = conv(el.value); try { localStorage.setItem('ironclad_' + key, el.value); } catch (e) { } if (key === 'volume') G.audio.setVolume(G.settings.volume); if (key === 'fov') { G.camera.fov = G.settings.fov; G.camera.updateProjectionMatrix(); } };
    };
    bindSel('sDiff', 'difficulty', Number);
    bindSel('sSens', 'sens', Number);
    bindSel('sFov', 'fov', Number);
    bindSel('sVol', 'volume', Number);
    bindSel('sQual', 'quality', String);
    G.renderer.domElement.addEventListener('click', () => { if (GM.state === 'play' && !G.input.locked && !TEST) G.input.lock(); });
    G.onUnlock = () => { if (GM.state === 'play' && !TEST) $('pause').style.display = 'flex'; };
    document.addEventListener('pointerlockchange', () => { if (G.input.locked) $('pause').style.display = 'none'; });
  }

  /* ================= main loop ================= */
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    const playing = GM.state === 'play' && (G.input.locked || TEST);
    if (playing) {
      G.t += dt;
      P.update(dt);
      if (!P.dead) G.arsenal.update(dt);
      else { G.arsenal.root.visible = false; G.arsenal.handL.visible = G.arsenal.foreL.visible = G.arsenal.foreR.visible = false; }
      if (!P.dead) { G.arsenal.root.visible = true; G.arsenal.foreR.visible = true; }
      G.enemies.update(dt);
      G.shots.update(dt);
      GM.update(dt);
      G.fx.update(dt);
      G.worlds.update(dt, G.camera.position);
      H.update();
    } else if (GM.state === 'menu') {
      // slow orbit behind the menu
      G.t += dt;
      const a = G.t * 0.05;
      G.camera.position.set(Math.cos(a) * 30, 9, Math.sin(a) * 30);
      G.camera.lookAt(0, 3, 0);
      G.camera.updateMatrixWorld();
      G.fx.update(dt);
      G.worlds.update(dt, G.camera.position);
      G.arsenal.root.visible = false; G.arsenal.handL.visible = G.arsenal.foreL.visible = G.arsenal.foreR.visible = false;
    }
    const r = G.renderer;
    r.clear();
    r.render(G.scene, G.camera);
    if (GM.state === 'play') { r.clearDepth(); r.render(G.vmScene, G.vmCamera); }
    G.input.endFrame();
  }

  window.addEventListener('load', () => {
    try { const q = localStorage.getItem('ironclad_quality'); if (q) G.settings.quality = q; } catch (e) { }
    G.initRenderer();
    G.input.init();
    G.models.initMats();
    G.fx.init();
    G.arsenal.init();
    H.init();
    bindUI();
    G.worlds.build('hive');
    P.reset(G.worlds.playerStart);
    Menu.show();
    $('loading').style.display = 'none';
    frame();
    if (TEST) {
      const m = MISSIONS.find(x => x.world === TEST) || MISSIONS[0];
      GM.start(m);
      window.__ready = true;
    }
  });
})();
