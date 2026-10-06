'use strict';
// Player, HUD, missions (waves / hold / defend / assassinate / extract), allies,
// drop pods and gunships, menu and the main loop.
(function () {
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const $ = id => document.getElementById(id);
  const TEST = new URLSearchParams(location.search).get('test');

  /* ================= player ================= */
  const P = G.player = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, aimY: 1.3,
    reset(start) {
      const c = G.arsenal.cls;
      this.pos.copy(start); this.vel.set(0, 0, 0); this.yaw = 0; this.pitch = 0;
      this.hp = this.maxHp = c.hp; this.armor = this.maxArmor = c.armor; this.armorDelay = 0;
      this.onGround = true; this.eyeY = 1.85; this.crouch = 0; this.moveAmt = 0; this.bobPhase = 0;
      this.sprinting = false; this.sprintK = 0; this.landDip = 0; this.recoil = 0; this.recoilYaw = 0;
      this.fury = 0; this.furyT = 0; this.dead = false; this.deadT = 0; this.canAct = true;
      this.hurtFlash = 0; this.lastStepPhase = 0; this.invulnT = 0; this.jumpSlam = false;
    },
    hurt(dmg, from, kind) {
      if (this.dead || G.game.state !== 'play') return;
      if (this.invulnT > 0) { if (from) G.fx.sparks(v1.copy(this.pos).setY(this.pos.y + 1.2), v2.set(0, 1, 0), 0xffd060, 3); return; }
      if (this.furyT > 0) dmg *= 0.6;
      let toHp = dmg;
      if (this.armor > 0 && kind !== 'overheat' && kind !== 'poison') {
        const absorb = Math.min(this.armor, dmg * 0.7);
        this.armor -= absorb; toHp = dmg - absorb;
        if (dmg > 1) G.audio.play('armorHit', null, 0.6);
      }
      this.hp -= toHp;
      this.armorDelay = 4;
      this.hurtFlash = Math.min(1, this.hurtFlash + dmg / 25);
      G.shake += Math.min(0.5, dmg / 40);
      if (dmg > 2) G.audio.play('hurt', null, Math.min(1, dmg / 20));
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
      const I = G.input, c = G.arsenal.cls, sens = 0.0022 * G.settings.sens * (1 - G.arsenal.adsK * (G.arsenal.zoom > 0.5 ? 0.75 : 0.45));
      if (this.dead) {
        this.deadT += dt;
        this.eyeY = G.damp(this.eyeY, 0.4, 3, dt);
        this.pitch = G.damp(this.pitch, 0.6, 2, dt);
        this.applyCamera(dt, 0.6 * Math.min(1, this.deadT));
        return;
      }
      this.yaw -= I.mdx * sens; this.pitch -= I.mdy * sens;
      const r = this.recoil * Math.min(1, dt * 22); this.pitch += r; this.recoil -= r;
      const ry = this.recoilYaw * Math.min(1, dt * 22); this.yaw += ry; this.recoilYaw -= ry;
      this.pitch = G.clamp(this.pitch, -1.5, 1.5);
      const k = I.keys;
      const fx = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), sx = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
      const crouching = k.KeyC || k.ControlLeft;
      this.crouch = G.damp(this.crouch, crouching ? 1 : 0, 12, dt);
      const d = G.arsenal.defs[G.arsenal.cur];
      this.sprinting = (k.ShiftLeft || k.ShiftRight) && fx > 0 && !crouching && G.arsenal.adsK < 0.3;
      if (this.sprinting && I.lmb && d.type !== 'melee') this.sprinting = false;
      this.sprintK = G.damp(this.sprintK, this.sprinting ? 1 : 0, 8, dt);
      const fwd = v1.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = v2.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const wish = new THREE.Vector3().addScaledVector(fwd, fx).addScaledVector(right, sx);
      if (wish.lengthSq() > 1) wish.normalize();
      let speed = (this.sprinting ? 10.5 : crouching ? 3.6 : 6.6) * c.speed;
      if (G.arsenal.adsK > 0.5) speed *= 0.6;
      if (G.arsenal.braceT > 0) speed *= 0.35;
      if (this.furyT > 0) speed *= 1.2;
      const acc = this.onGround ? 11 : 2.2;
      this.vel.x = G.damp(this.vel.x, wish.x * speed, acc, dt);
      this.vel.z = G.damp(this.vel.z, wish.z * speed, acc, dt);
      if (I.pressed.Space && this.onGround) { this.vel.y = 7.4 * c.jump; this.onGround = false; G.audio.play('step', null, 0.6); }
      this.vel.y -= 22 * dt;
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      const height = 2.0 - this.crouch * 0.6;
      G.world.collide(this.pos, 0.5, height, 0.55);
      const prevY = this.pos.y;
      this.pos.y += this.vel.y * dt;
      const ceil = G.world.ceilingAt(this.pos.x, this.pos.z, prevY + height - 0.01, 0.3);
      if (this.pos.y + height > ceil && this.vel.y > 0) { this.pos.y = ceil - height; this.vel.y = 0; }
      const gy = G.world.groundAt(this.pos.x, this.pos.z, Math.max(prevY, this.pos.y) + 0.55);
      if (this.pos.y <= gy) {
        if (!this.onGround) {
          if (this.vel.y < -6) { this.landDip = Math.min(1, -this.vel.y / 14); G.audio.play('land', null, 0.7); G.shake += 0.08; }
          G.arsenal.onLand();
        }
        if (gy - this.pos.y > 0.05 && this.onGround) this.eyeLag = (this.eyeLag || 0) - (gy - this.pos.y);
        this.pos.y = gy; this.vel.y = 0; this.onGround = true;
      } else if (this.pos.y > gy + 0.05) this.onGround = false;
      const H = G.worlds.HALF - 0.6;
      this.pos.x = G.clamp(this.pos.x, -H, H); this.pos.z = G.clamp(this.pos.z, -H, H);
      this.landDip = G.damp(this.landDip, 0, 6, dt);
      const hs = Math.hypot(this.vel.x, this.vel.z);
      this.moveAmt = G.clamp(hs / 6.6, 0, 1.6);
      if (this.onGround) {
        this.bobPhase += dt * hs * 1.55 / Math.max(0.85, c.speed);
        const half = Math.floor(this.bobPhase / Math.PI);
        if (half !== this.lastStepPhase && hs > 1) { this.lastStepPhase = half; G.audio.play('step', null, (this.sprinting ? 0.6 : crouching ? 0.15 : 0.35) * (c.armor > 200 ? 1.6 : 1)); }
      }
      this.armorDelay -= dt;
      if (this.armorDelay <= 0) this.armor = Math.min(this.maxArmor, this.armor + this.maxArmor * 0.22 * dt);
      if (this.invulnT > 0) this.invulnT -= dt;
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
      const tall = G.arsenal.cls.armor > 200 ? 0.15 : G.arsenal.cls.hp < 80 ? -0.2 : 0;
      const eye = this.dead ? this.eyeY : 1.85 + tall - this.crouch * 0.55 - this.landDip * 0.12 + (this.eyeLag || 0);
      const cam = G.camera;
      const bobY = this.onGround ? Math.abs(Math.sin(this.bobPhase)) * 0.05 * Math.min(1, this.moveAmt) : 0;
      cam.position.set(this.pos.x, this.pos.y + eye + bobY, this.pos.z);
      const sh = G.shake * 0.05;
      cam.position.x += (Math.random() - 0.5) * sh; cam.position.y += (Math.random() - 0.5) * sh;
      cam.rotation.order = 'YXZ';
      cam.rotation.set(this.pitch + (Math.random() - 0.5) * sh * 0.4, this.yaw, roll + Math.sin(this.bobPhase) * 0.004 * this.moveAmt - G.arsenal.sway.x * 0.15);
      G.shake *= Math.exp(-dt * 5);
      const targetFov = G.settings.fov * (1 - G.arsenal.adsK * (G.arsenal.zoom || 0.28)) + this.sprintK * 6 + (this.furyT > 0 ? 6 : 0);
      if (Math.abs(cam.fov - targetFov) > 0.05) { cam.fov = G.damp(cam.fov, targetFov, 12, dt); cam.updateProjectionMatrix(); G.fx.updateScale(); }
      cam.updateMatrixWorld();
    }
  };

  /* ================= HUD ================= */
  const H = G.hud = {
    init() { this.radar = $('radar').getContext('2d'); this.feed = $('feed'); this.dirs = $('dmgdirs'); },
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
    slots() {
      const A = G.arsenal;
      $('slots').innerHTML = A.order.map((k, i) => `<span class="slot${k === A.cur ? ' on' : ''}">${i + 1} ${A.defs[k].name}</span>`).join('');
      this.lastCur = A.cur;
    },
    update() {
      const A = G.arsenal, d = A.defs[A.cur], s = A.st[A.cur];
      $('hpbar').style.width = (P.hp / P.maxHp * 100) + '%';
      $('arbar').style.width = (P.armor / P.maxArmor * 100) + '%';
      $('hpnum').textContent = Math.ceil(P.hp);
      $('arnum').textContent = Math.ceil(P.armor);
      $('furybar').style.width = (P.furyT > 0 ? P.furyT / 9 * 100 : P.fury) + '%';
      $('furyhint').style.opacity = P.fury >= 100 && P.furyT <= 0 ? 1 : 0;
      $('wname').textContent = d.name;
      if (this.lastCur !== A.cur) this.slots();
      const heat = d.type === 'heat' || d.type === 'smite';
      let ammo;
      if (d.type === 'melee') ammo = '∞';
      else if (heat) ammo = s.lock > 0 ? (d.type === 'smite' ? 'PERILS' : 'VENTING') : Math.round(s.heat) + (d.type === 'smite' ? ' <small>warp</small>' : '°');
      else if (d.type === 'stream') ammo = Math.ceil(s.mag) + ' <small>/ ' + Math.ceil(s.reserve) + '</small>';
      else ammo = s.mag + ' <small>/ ' + s.reserve + '</small>';
      if (this.lastAmmo !== ammo) { $('ammo').innerHTML = ammo; this.lastAmmo = ammo; }
      $('heat').style.display = heat || d.spin ? 'block' : 'none';
      if (heat) { $('heatbar').style.width = s.heat + '%'; $('heatbar').style.background = s.lock > 0 ? '#ff4020' : s.heat > 70 ? '#ffb030' : d.type === 'smite' ? '#a080ff' : '#4ab0ff'; }
      else if (d.spin) { $('heatbar').style.width = A.spin * 100 + '%'; $('heatbar').style.background = '#ffc040'; }
      $('nades').textContent = '◆'.repeat(A.grenades) || '—';
      const lowAmmo = d.mag && d.type !== 'melee' && !heat && s.mag <= d.mag * 0.2 && A.reloadT < 0 && d.mag > 1;
      $('lowammo').style.opacity = lowAmmo ? 1 : 0;
      $('lowammo').textContent = s.mag <= 0 && s.reserve <= 0 ? 'NO AMMO' : 'RELOAD';
      const ab = A.abilities[A.cls.ability];
      $('abname').textContent = 'E — ' + ab.name;
      $('abbar').style.width = (1 - A.abilityCD / ab.cd) * 100 + '%';
      $('ability').classList.toggle('ready', A.abilityCD <= 0);
      const sp = A.spread() * 900 * (1 - A.adsK * 0.7) + 6;
      const ch = $('cross');
      ch.style.setProperty('--gap', sp + 'px');
      ch.style.opacity = d.type === 'melee' ? 0.4 : 1 - A.adsK * 0.85;
      $('adsdot').style.opacity = d.type === 'melee' || d.zoom ? 0 : A.adsK;
      $('vignette').style.opacity = Math.max(P.hurtFlash, P.hp < P.maxHp * 0.35 ? 0.35 + Math.sin(G.t * 5) * 0.15 : 0);
      $('faithfx').style.opacity = P.invulnT > 0 ? 1 : 0;
      $('score').textContent = G.game.stats.score;
      const b = G.game.boss;
      if (b && !b.dead) { $('boss').style.display = 'block'; $('bossname').textContent = b.t.name; $('bossbar').style.width = (b.hp / b.maxHp * 100) + '%'; $('bossshield').style.width = (b.maxShield ? b.shield / b.maxShield * 100 : 0) + '%'; }
      else $('boss').style.display = 'none';
      const ob = G.game.objUI();
      $('obj').style.display = ob ? 'block' : 'none';
      if (ob) { $('objname').textContent = ob.name; $('objbar').style.width = ob.k * 100 + '%'; $('objbar').style.background = ob.col; }
      this.drawRadar();
    },
    drawRadar() {
      const c = this.radar, W = 150, R = 70, range = 45;
      c.clearRect(0, 0, W, W);
      c.save(); c.translate(W / 2, W / 2);
      c.strokeStyle = 'rgba(120,255,140,0.25)'; c.lineWidth = 1;
      for (const r of [R, R * 0.66, R * 0.33]) { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); }
      c.beginPath(); c.moveTo(-R, 0); c.lineTo(R, 0); c.moveTo(0, -R); c.lineTo(0, R); c.stroke();
      const sw = (G.t * 2) % (Math.PI * 2);
      const g = c.createConicGradient ? c.createConicGradient(sw - Math.PI / 2, 0, 0) : null;
      if (g) { g.addColorStop(0, 'rgba(120,255,140,0.25)'); g.addColorStop(0.15, 'rgba(120,255,140,0)'); g.addColorStop(1, 'rgba(120,255,140,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill(); }
      const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw);
      const plot = (px, pz, clamp) => {
        const dx = px - P.pos.x, dz = pz - P.pos.z;
        let x = (dx * cy - dz * sy) / range * R, y = (dx * sy + dz * cy) / range * R;
        const L = Math.hypot(x, y);
        if (L > R) { if (!clamp) return null; x *= R / L; y *= R / L; }
        return [x, y];
      };
      for (const e of G.enemies.list) {
        if (e.dead || e.removed || e.cloaked) continue;
        const p = plot(e.pos.x, e.pos.z, true);
        c.fillStyle = e.team === 'ally' ? '#5ab0ff' : e.isBoss ? '#ff3030' : e.t.elite ? '#ffb030' : 'rgba(140,255,150,0.95)';
        c.beginPath(); c.arc(p[0], p[1], e.isBoss ? 5 : e.t.elite ? 3.5 : 2.4, 0, 7); c.fill();
      }
      for (const pk of G.game.pickups) {
        const p = plot(pk.mesh.position.x, pk.mesh.position.z, false);
        if (p) { c.fillStyle = pk.kind === 'health' ? '#ff5050' : pk.kind === 'ammo' ? '#ffd040' : '#ff8020'; c.fillRect(p[0] - 2, p[1] - 2, 4, 4); }
      }
      const mk = G.game.marker;
      if (mk) { const p = plot(mk.x, mk.z, true); c.strokeStyle = '#ffe060'; c.lineWidth = 2; c.strokeRect(p[0] - 5, p[1] - 5, 10, 10); }
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 4); c.lineTo(-4, 4); c.fill();
      c.restore();
    }
  };

  /* ================= missions ================= */
  const MISSIONS = G.missions = [
    { id: 'm1', world: 'hive', title: 'Ashes of Tertius', foe: 'Traitor cults & daemons', type: 'waves',
      brief: 'The underhive has turned. Cultists have torn open the gates and daemons pour through the breach. Purge every last heretic in the plaza.',
      waves: [[['cultist', 10]], [['cultist', 12], ['fiend', 3]], [['cultist', 14], ['fiend', 4], ['daemonette', 4]], [['cultist', 10], ['fiend', 8], ['horror', 4]]] },
    { id: 'm2', world: 'ice', title: 'The Frozen Horde', foe: 'Greenskins', type: 'waves', allies: [['guardsman', 4]],
      brief: 'A greenskin warband has made landfall on Frostgrave. A guard squad holds the ruins with you. Their warlord is coming to see who is strong enough to fight.',
      waves: [[['brute', 6], ['gretchin', 8]], [['brute', 8], ['shoota', 5]], [['brute', 8], ['shoota', 6], ['nob', 2]]], boss: 'warlord' },
    { id: 'm3', world: 'jungle', title: 'Into the Maw', foe: 'The Swarm', type: 'hold', holdTime: 75,
      pool: ['ripper', 'ripper', 'ripper', 'spitter', 'gargoyle', 'warrior'],
      brief: 'The swarm has consumed the jungle moon. Stand inside the beacon ring while it transmits. When it finishes, the creature that commands the brood will come for you.', boss: 'tyrant' },
    { id: 'm4', world: 'tomb', title: 'The Sleepers Wake', foe: 'Undying Machines', type: 'waves',
      brief: 'Something ancient stirs below the sands. Its legions do not stay dead. Destroy their bodies utterly before they rise again.',
      waves: [[['husk', 8], ['scarab', 10]], [['husk', 10], ['stalker', 5]], [['husk', 10], ['stalker', 6], ['cwraith', 2]]], boss: 'overlord' },
    { id: 'm5', world: 'forge', title: 'Anvil of Wrath', foe: 'Greenskins & traitors', type: 'defend', allies: [['guardsman', 3], ['brother', 1]], relic: 'FORGE REACTOR',
      brief: 'Traitors opened the forge to a greenskin raid. Defend the reactor core at the centre of the forge until the last of them is dead.',
      waves: [[['cultist', 12], ['brute', 4]], [['shoota', 6], ['burna', 3], ['cultist', 8]], [['brute', 8], ['nob', 2], ['fiend', 6]]], boss: 'warlord' },
    { id: 'm6', world: 'shrine', title: 'Fall of the Sanctum', foe: 'Traitor Legions', type: 'defend', allies: [['sister', 2], ['sisterF', 1]], relic: 'RELIQUARY',
      brief: 'Traitor legionaries have come for the bones of a saint. The sisters of the shrine stand with you. The reliquary must not fall.',
      waves: [[['cultist', 12], ['traitor', 3]], [['traitor', 5], ['possessed', 2], ['cultist', 8]], [['traitor', 6], ['possessed', 4], ['horror', 4]]], boss: 'chaosLord' },
    { id: 'm7', world: 'sept', title: 'For the Lesser Evil', foe: 'The Ascendancy', type: 'assassinate', allies: [['brother', 2]],
      pool: ['firewarrior', 'firewarrior', 'drone', 'drone', 'crisis'], boss: 'colossus',
      brief: 'The Ascendancy has fielded a colossal battlesuit over this sept. Break through its shield drones and pulse lines and bring it down. Beware its missile barrage.' },
    { id: 'm8', world: 'craftworld', title: 'Wraithbone Requiem', foe: 'The Starborn', type: 'waves',
      brief: 'We board the dying craftworld to seize its archive. Its guardians, dancers and wraith constructs will not let us. Neither will the god they wake.',
      waves: [[['guardian', 10], ['ranger', 3]], [['guardian', 8], ['banshee', 6]], [['guardian', 8], ['banshee', 4], ['wraithguard', 2], ['ranger', 3]]], boss: 'avatar' },
    { id: 'm9', world: 'agri', title: 'Harvest of Teeth', foe: 'The Brood Cult', type: 'assassinate', allies: [['guardsman', 4]],
      pool: ['hybrid', 'hybrid', 'purestrain', 'purestrain', 'aberrant'], boss: 'patriarch',
      brief: 'The farmers of Messor have been worshipping something in the grain silos. Find the Patriarch of the brood and kill it before the uprising spreads.' },
    { id: 'm10', world: 'scrap', title: 'Gorkaz Must Burn', foe: 'Greenskins', type: 'waves', allies: [['dread', 1]],
      brief: 'The scrap-town of Gorkaz is the heart of the greenskin horde. A venerable dreadnought walks with you. Burn it all.',
      waves: [[['gretchin', 14], ['brute', 6]], [['burna', 4], ['shoota', 6], ['nob', 2]], [['brute', 8], ['nob', 3], ['deffdread', 1]], [['deffdread', 2], ['shoota', 8], ['gretchin', 10]]], boss: 'warlord' },
    { id: 'm11', world: 'hulk', title: 'Sin of Damnation', foe: 'Brood Cult & Swarm', type: 'extract', extractTime: 120,
      pool: ['purestrain', 'purestrain', 'hybrid', 'ripper', 'ripper', 'aberrant', 'lictor'],
      brief: 'The boarding torpedo has failed. Survive in the dark corridors of the hulk until the gunship can reach a hangar, then get to the extraction point.' },
    { id: 'm12', world: 'ash', title: 'The Ashen Convoy', foe: 'Traitors & daemons', type: 'hold', holdTime: 90, allies: [['guardsman', 4], ['dread', 1]],
      pool: ['cultist', 'cultist', 'traitor', 'possessed', 'fiend', 'plaguebearer', 'horror'],
      brief: 'The convoy has broken down in the ash wastes. Hold the signal beacon until the relief column arrives.' },
    { id: 'm13', world: 'ice', title: 'Machine Winter', foe: 'Undying Machines', type: 'extract', extractTime: 120,
      pool: ['husk', 'husk', 'stalker', 'scarab', 'scarab', 'cwraith'],
      brief: 'A tomb has woken beneath the ice. Survive until the gunship can land, then fight your way to it.' },
    { id: 'm14', world: 'jungle', title: 'Hunter\'s Moon', foe: 'The Swarm', type: 'assassinate', allies: [['brother', 2]],
      pool: ['ripper', 'ripper', 'lictor', 'carnifex', 'spitter', 'gargoyle'], boss: 'tyrant',
      brief: 'Lictors stalk the canopy and carnifexes break the trees. Hunt down the Tyrant that leads them.' },
    { id: 'm15', world: 'craftworld', title: 'Uneasy Alliance', foe: 'Daemons', type: 'defend', allies: [['guardian', 4], ['wraithguard', 1]], allyTeam: true, relic: 'WEBWAY GATE',
      brief: 'Daemons pour from a breach in the webway. For once the Starborn fight beside us. Hold the gate until it can be sealed.',
      waves: [[['daemonette', 10], ['horror', 4]], [['plaguebearer', 6], ['fiend', 6], ['horror', 4]], [['daemonette', 10], ['fiend', 6], ['plaguebearer', 4]]], boss: 'bloodlord' },
    { id: 'm16', world: 'sept', title: 'The Greater Hunger', foe: 'The Swarm', type: 'hold', holdTime: 90, allies: [['firewarrior', 5], ['crisis', 1]], allyTeam: true,
      pool: ['ripper', 'ripper', 'ripper', 'spitter', 'gargoyle', 'warrior', 'carnifex'],
      brief: 'The swarm has reached the sept. The Ascendancy asks for our help; we give it, for now. Hold the evacuation beacon.' },
    { id: 'm17', world: 'warp', title: 'The Screaming Rift', foe: 'Everything', type: 'waves', allies: [['brother', 2], ['sister', 1]],
      brief: 'Reality is torn. Every horror of the galaxy spills through the rift. At its heart waits the Blood-Crowned. End it.',
      waves: [[['cultist', 8], ['fiend', 6], ['ripper', 10]], [['traitor', 4], ['husk', 6], ['brute', 6], ['banshee', 4]], [['possessed', 4], ['warrior', 2], ['crisis', 2], ['purestrain', 6], ['deffdread', 1]]], boss: 'bloodlord' },
  ];
  const FACTION_POOLS = {};
  const FACTION_BOSS = { swarm: 'tyrant', green: 'warlord', machine: 'overlord', chaos: 'bloodlord', traitor: 'chaosLord', tau: 'colossus', eldar: 'avatar', cult: 'patriarch' };
  for (const k in G.enemies.types) { const t = G.enemies.types[k]; if (t.boss || t.fac === 'imperium') continue; (FACTION_POOLS[t.fac] = FACTION_POOLS[t.fac] || []).push(k); }

  const GM = G.game = {
    state: 'menu', pickups: [], boss: null, objective: null, props: [],
    progress() { try { return JSON.parse(localStorage.getItem('ironclad_progress') || '{}'); } catch (e) { return {}; } },
    saveProgress(p) { try { localStorage.setItem('ironclad_progress', JSON.stringify(p)); } catch (e) { } },
    banner(t, d, c) { H.banner(t, d, c); },
    start(mission, worldKey, faction) {
      G.audio.init();
      this.mission = mission; this.faction = faction || 'all';
      this.runId = (this.runId || 0) + 1;
      const wk = mission ? mission.world : worldKey;
      G.arsenal.setClass(G.arsenal.clsKey);
      G.worlds.build(wk);
      G.enemies.clear(); G.shots.clear(); G.fx.reset();
      this.pickups = []; this.props = []; this.objective = null; this.marker = null; this.zone = null; this.extract = null;
      this.type = mission ? mission.type : 'endless';
      if (this.type === 'defend') this.makeRelic(mission.relic);
      G.enemies.buildNav();
      P.reset(G.worlds.playerStart);
      G.arsenal.reset(); H.slots();
      G.enemyScale = 1; H.fury(false);
      this.wave = 0; this.queue = []; this.spawnT = 0; this.interT = 3; this.boss = null; this.bossSpawned = false; this.huntT = 0;
      this.holdK = 0; this.timer = 0; this.trickleT = 2;
      this.stats = { kills: 0, heads: 0, gibs: 0, score: 0, time: 0, hits: 0, taken: 0 };
      this.state = 'play';
      document.body.className = 'playing';
      $('menu').style.display = 'none'; $('end').style.display = 'none'; $('pause').style.display = 'none';
      $('hud').style.display = 'block';
      H.banner(mission ? mission.title.toUpperCase() : 'ENDLESS CRUSADE', 3);
      $('objective').textContent = G.worlds.current.name + ' — ' + (mission ? mission.foe : this.faction === 'all' ? 'every faction' : G.enemies.FAC[this.faction].name);
      if (mission && mission.allies) this.deployAllies(mission.allies, mission.allyTeam);
      if (this.type === 'hold') this.makeZone();
      if (this.type === 'assassinate') { const run = this.runId; setTimeout(() => this.runId === run && this.state === 'play' && this.spawnBoss(mission.boss), 2500); }
      if (!TEST) G.input.lock();
    },
    runIdNow() { return this.runId; },
    deployAllies(list, anyTeam) {
      const types = [];
      for (const [t, n] of list) for (let i = 0; i < n; i++) types.push(t);
      const imp = types.filter(t => G.enemies.types[t].fac === 'imperium'), other = types.filter(t => G.enemies.types[t].fac !== 'imperium');
      // imperial allies arrive by drop pod, two or three to a pod; dreadnoughts get their own
      const pods = [];
      const dreads = imp.filter(t => t === 'dread'), men = imp.filter(t => t !== 'dread');
      dreads.forEach(t => pods.push([t]));
      for (let i = 0; i < men.length; i += 3) pods.push(men.slice(i, i + 3));
      pods.forEach((grp, i) => {
        const a = i / Math.max(1, pods.length) * Math.PI * 2 + 0.6;
        const p = new THREE.Vector3(P.pos.x + Math.cos(a) * 7, 0, P.pos.z + Math.sin(a) * 7);
        setTimeout(() => this.state === 'play' && this.dropPod(p, grp), 600 + i * 500);
      });
      other.forEach((t, i) => {
        const a = i / other.length * Math.PI * 2;
        G.enemies.spawn(t, new THREE.Vector3(P.pos.x + Math.cos(a) * 5, 0, P.pos.z + Math.sin(a) * 5), 'ally');
      });
    },
    dropPod(pos, types, team) {
      const H2 = G.worlds.HALF - 4;
      pos.x = G.clamp(pos.x, -H2, H2); pos.z = G.clamp(pos.z, -H2, H2);
      const pod = G.models.dropPod(types[0] === 'sister' || types[0] === 'sisterF' ? G.models.mats.blackArm : null);
      pod.position.set(pos.x, 90, pos.z); G.scene.add(pod);
      this.props.push({ kind: 'pod', obj: pod, t: 0, types, team, pos: pos.clone() });
      G.audio.play('pod', pos, 1);
    },
    gunshipDrop(pos, types) {
      const ship = G.models.gunship();
      const p = pos.clone(); p.x += G.rand(-4, 4); p.z += G.rand(-4, 4);
      ship.position.set(p.x - 120, 60, p.z); ship.lookAt(p.x, 60, p.z);
      G.scene.add(ship);
      this.props.push({ kind: 'drop', obj: ship, t: 0, types, pos: p });
      G.audio.play('engine', p, 0.8);
    },
    makeRelic(name) {
      const m = G.models.relic(); m.position.set(0, 0, 0); G.scene.add(m);
      G.world.addCentered(0, 0, 0, 2.4, 3, 2.4);
      const hp = 4500 * (0.8 + G.settings.difficulty * 0.2);
      this.objective = {
        name: name || 'RELIC', pos: new THREE.Vector3(0, 0, 0), vel: new THREE.Vector3(), hp, maxHp: hp, dead: false, aimY: 1.6, mesh: m,
        hurt(dmg) {
          if (this.dead || GM.state !== 'play') return;
          this.hp -= dmg * 0.6; this.hitT = 0.2;
          if (Math.random() < 0.05) H.killfeed(this.name + ' UNDER ATTACK', 'boss');
          if (this.hp <= 0) { this.hp = 0; this.dead = true; G.fx.explosion(v1.set(0, 2, 0), 3, 0xffc040); G.audio.play('explosion', null, 1); H.banner(this.name + ' DESTROYED', 3, '#ff4020'); const run = GM.runId; setTimeout(() => GM.runId === run && GM.end(false), 2500); }
        }
      };
      this.marker = this.objective.pos;
      G.worlds.playerStart.set(0, 0, 6);
    },
    makeZone() {
      const a = Math.random() * Math.PI * 2;
      const c = new THREE.Vector3(Math.cos(a) * 22, 0, Math.sin(a) * 22);
      const b = G.models.beacon(0x60c0ff); b.position.copy(c); G.scene.add(b);
      this.zone = { c, obj: b };
      this.marker = c;
    },
    objUI() {
      if (this.type === 'defend' && this.objective) return { name: this.objective.name, k: this.objective.hp / this.objective.maxHp, col: '#ffcc40' };
      if (this.type === 'hold' && this.zone) return { name: this.holdK >= 1 ? 'TRANSMISSION COMPLETE' : 'HOLD THE BEACON', k: this.holdK, col: '#60c0ff' };
      if (this.type === 'extract') return this.extract ? { name: 'REACH THE GUNSHIP', k: 1, col: '#60ff80' } : { name: 'SURVIVE UNTIL EXTRACTION', k: this.timer / this.mission.extractTime, col: '#60ff80' };
      return null;
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
        const pool = this.faction === 'all' ? Object.keys(G.enemies.types).filter(k => !G.enemies.types[k].boss && G.enemies.types[k].fac !== 'imperium') : FACTION_POOLS[this.faction];
        const basic = pool.filter(k => !G.enemies.types[k].elite), elite = pool.filter(k => G.enemies.types[k].elite);
        const n = 8 + this.wave * 4;
        list = [];
        for (let i = 0; i < 3; i++) list.push([G.pick(basic), Math.ceil(n / 3)]);
        if (this.wave % 3 === 0 && elite.length) list.push([G.pick(elite), 1 + (this.wave / 6 | 0)]);
        const run = this.runId, w = this.wave;
        const bosses = this.faction === 'all' ? G.enemies.BOSSES : [FACTION_BOSS[this.faction]];
        if (w % 5 === 0) setTimeout(() => this.runId === run && this.state === 'play' && this.spawnBoss(bosses[(w / 5 - 1) % bosses.length], true), 4000);
        if (w % 4 === 0) { const pt = new THREE.Vector3(P.pos.x + 5, 0, P.pos.z + 5); this.dropPod(pt, ['brother', 'brother']); H.banner('REINFORCEMENTS', 1.6, '#60b0ff'); }
      }
      const diffMul = 0.8 + G.settings.difficulty * 0.2;
      this.queue = [];
      for (const [type, count] of list) for (let i = 0; i < Math.max(1, Math.round(count * (G.enemies.types[type].elite ? 1 : diffMul))); i++) this.queue.push(type);
      this.queue.sort(() => Math.random() - 0.5);
      H.banner('WAVE ' + this.wave + (m ? ' / ' + m.waves.length : ''), 2.2);
      G.audio.play('bell', null, 0.6);
    },
    spawnBoss(type, extra) {
      if (!extra) this.bossSpawned = true;
      const far = G.worlds.spawns.slice().sort((a, b) => b.distanceTo(P.pos) - a.distanceTo(P.pos))[0];
      const p = new THREE.Vector3().copy(far).multiplyScalar(0.7);
      const b = G.enemies.spawn(type, p);
      if (!this.boss || !extra) this.boss = b;
      H.banner(b.t.name, 3, '#ff4a2a');
      // the boss brings an honour guard
      const guard = FACTION_POOLS[b.t.fac] || [];
      for (let i = 0; i < 3 && guard.length; i++) { const q = p.clone().add(v1.set(G.rand(-5, 5), 0, G.rand(-5, 5))); G.enemies.spawn(G.pick(guard.filter(k => !G.enemies.types[k].elite)), q); }
    },
    spawnType(type) {
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
      let pts = (e.t.score || 10) * (head ? 1.5 : 1) * (e.gibbed ? 1.25 : 1);
      if (P.furyT > 0) pts *= 1.5;
      s.score += Math.round(pts);
      if (P.furyT <= 0) P.fury = Math.min(100, P.fury + (e.isBoss ? 60 : e.t.elite ? 12 : 4));
      H.killfeed(e.t.name + (e.gibbed ? ' — OBLITERATED' : head ? ' — HEADSHOT' : '') + '  +' + Math.round(pts), e.isBoss ? 'boss' : head ? 'hs' : '');
      const r = Math.random();
      const drop = e.isBoss ? ['health', 'ammo', 'fury', 'health', 'ammo'] : r < 0.12 ? ['health'] : r < 0.28 ? ['ammo'] : r < 0.31 ? ['fury'] : [];
      drop.forEach(k => this.dropPickup(k, e.pos));
      if (e === this.boss) {
        H.banner(e.t.name + ' IS SLAIN', 3, '#ffcc40');
        const run = this.runId;
        if (this.mission && this.type !== 'extract') setTimeout(() => this.runId === run && this.state === 'play' && this.end(true), 4000);
        this.boss = null;
      }
    },
    onAllyDeath(u) { H.killfeed(u.t.name + ' HAS FALLEN', 'boss'); },
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
            G.arsenal.grenades = Math.min(G.arsenal.cls.nades + 2, G.arsenal.grenades + 1);
            take = true; H.killfeed('MUNITIONS RESUPPLIED', 'pick');
          } else if (p.kind === 'fury' && P.furyT <= 0) { P.fury = Math.min(100, P.fury + 30); take = true; H.killfeed('+FURY', 'pick'); }
        }
        if (take) { G.audio.play('pickup', null, 0.8); p.dead = true; }
        if (p.t > 30) p.dead = true;
      }
      this.pickups = this.pickups.filter(p => { if (p.dead) p.mesh.parent && p.mesh.parent.remove(p.mesh); return !p.dead; });
    },
    updateProps(dt) {
      for (const pr of this.props) {
        pr.t += dt;
        const o = pr.obj;
        if (pr.kind === 'pod') {
          if (!pr.landed) {
            const k = Math.min(1, pr.t / 1.4);
            o.position.y = 90 * (1 - k * k);
            o.flame.visible = true;
            if (Math.random() < 0.8) G.fx.smoke.emit(o.position.x, o.position.y + 4, o.position.z, G.rand(-0.5, 0.5), 2, G.rand(-0.5, 0.5), 2, 1, 3, PC1, PC2, 0.6, 0, 0, 0.5);
            if (k >= 1) {
              pr.landed = true; o.position.y = 0; o.flame.visible = false;
              G.fx.explosion(v1.copy(pr.pos).setY(0.5), 1.6, 0xffa040, 0x4a4440);
              G.audio.play('explosion', pr.pos, 1);
              const d = P.pos.distanceTo(pr.pos); if (d < 3) P.vel.add(v2.subVectors(P.pos, pr.pos).setY(0).normalize().multiplyScalar(8));
              G.enemies.radius(pr.pos, 4, 300, {});
            }
          } else if (pr.t < 2.4) {
            const k = G.smooth(Math.min(1, (pr.t - 1.4) / 0.6));
            o.petals.forEach(pt => pt.rotation.x = -k * 1.2);
            if (!pr.spawned && k > 0.5) {
              pr.spawned = true;
              pr.types.forEach((t, i) => { const a = i / pr.types.length * 6.28; G.enemies.spawn(t, v1.copy(pr.pos).add(v2.set(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2)), pr.team || 'ally'); });
            }
          }
        } else if (pr.kind === 'drop' || pr.kind === 'extract') {
          const hoverY = pr.kind === 'extract' ? 2.5 : 7;
          if (pr.t < 3) { const k = G.smooth(pr.t / 3); o.position.set(G.lerp(pr.pos.x - 120, pr.pos.x, k), G.lerp(60, hoverY, k), pr.pos.z); }
          else if (pr.kind === 'drop' && pr.t < 5) {
            if (!pr.spawned) { pr.spawned = true; pr.types.forEach((t, i) => G.enemies.spawn(t, v1.copy(pr.pos).add(v2.set(G.rand(-2, 2), 0, G.rand(-2, 2))), 'ally')); }
          } else if (pr.kind === 'drop') { const k = (pr.t - 5) / 3; o.position.y = hoverY + k * k * 60; o.position.x = pr.pos.x + k * k * 120; if (pr.t > 8) pr.dead = true; }
          if (Math.random() < 0.5) { G.fx.smoke.emit(o.position.x + G.rand(-3, 3), G.world.groundAt(o.position.x, o.position.z, 30) + 0.3, o.position.z + G.rand(-3, 3), G.rand(-3, 3), 0.5, G.rand(-3, 3), 1.2, 0.8, 2.5, PC1, PC2, 0.35, 0, 0, 1); }
        }
        if (pr.dead && o.parent) o.parent.remove(o);
      }
      this.props = this.props.filter(p => !p.dead);
    },
    trickle(dt, pool, cap, rate) {
      this.trickleT -= dt;
      if (this.trickleT <= 0 && G.enemies.alive() < cap) { this.trickleT = rate; this.spawnType(G.pick(pool)); }
    },
    update(dt) {
      this.stats.time += dt;
      const m = this.mission, diff = G.settings.difficulty;
      const cap = 16 + diff * 4;
      if (this.type === 'waves' || this.type === 'defend' || this.type === 'endless') {
        if (this.queue.length) {
          this.spawnT -= dt;
          if (this.spawnT <= 0 && G.enemies.alive() < cap) { this.spawnT = G.rand(0.35, 0.9); this.spawnType(this.queue.shift()); }
        } else if (G.enemies.alive() <= 3 && G.enemies.alive() > 0) {
          this.huntT += dt;
          if (this.huntT > 15) G.enemies.list.forEach(e => e.hunt = true);
        }
        if (!this.queue.length && G.enemies.alive() === 0 && !this.boss) {
          this.huntT = 0; this.interT -= dt;
          if (this.interT <= 0) { this.interT = 5; this.nextWave(); }
        }
        const left = this.queue.length + G.enemies.alive();
        $('wave').textContent = this.boss ? 'SLAY ' + this.boss.t.name : this.wave ? `WAVE ${this.wave}${m ? ' / ' + m.waves.length : ''} — ${left} hostiles` : 'Prepare';
      } else if (this.type === 'hold') {
        const inside = this.zone && P.pos.distanceTo(this.zone.c) < 8 && !P.dead;
        if (this.holdK < 1) {
          if (inside) this.holdK = Math.min(1, this.holdK + dt / m.holdTime);
          this.trickle(dt, m.pool, cap * (0.6 + this.holdK * 0.5), Math.max(0.5, 2.2 - this.holdK * 1.6) / (0.7 + diff * 0.3));
          this.zone.obj.ring.material.opacity = inside ? 0.9 : 0.35 + Math.sin(G.t * 6) * 0.25;
          if (this.holdK >= 1) { H.banner('TRANSMISSION COMPLETE', 2.5, '#60c0ff'); if (m.boss) this.spawnBoss(m.boss); else { const run = this.runId; setTimeout(() => this.runId === run && this.end(true), 2500); } }
          $('wave').textContent = inside ? `TRANSMITTING — ${Math.round(this.holdK * 100)}%` : 'GET TO THE BEACON';
        } else $('wave').textContent = this.boss ? 'SLAY ' + this.boss.t.name : 'Victory';
      } else if (this.type === 'assassinate') {
        if (this.boss) this.trickle(dt, m.pool, cap * 0.6, 3.2 / (0.7 + diff * 0.3));
        $('wave').textContent = this.boss ? 'ASSASSINATE ' + this.boss.t.name : this.bossSpawned ? 'Victory' : 'Locating the target…';
      } else if (this.type === 'extract') {
        if (!this.extract) {
          this.timer += dt;
          this.trickle(dt, m.pool, cap * (0.5 + this.timer / m.extractTime * 0.6), Math.max(0.45, 2 - this.timer / m.extractTime * 1.4) / (0.7 + diff * 0.3));
          $('wave').textContent = `EXTRACTION IN ${Math.max(0, Math.ceil(m.extractTime - this.timer))}s`;
          if (this.timer >= m.extractTime) {
            const far = G.worlds.spawns.slice().sort((a, b) => a.distanceTo(P.pos) - b.distanceTo(P.pos));
            const pt = far[Math.floor(far.length / 2)].clone().multiplyScalar(0.55);
            const ship = G.models.gunship(); G.scene.add(ship); ship.lookAt(pt.x + 1, 60, pt.z);
            const bc = G.models.beacon(0x60ff80); bc.position.copy(pt); G.scene.add(bc);
            this.props.push({ kind: 'extract', obj: ship, t: 0, pos: pt });
            this.extract = pt; this.marker = pt;
            H.banner('GUNSHIP INBOUND — GET TO EXTRACTION', 3, '#60ff80'); G.audio.play('vox', null, 1); G.audio.play('engine', null, 0.8);
          }
        } else {
          this.trickle(dt, m.pool, cap, 0.6);
          const d = P.pos.distanceTo(this.extract);
          $('wave').textContent = `EXTRACTION — ${Math.round(d)} m`;
          if (d < 6 && !P.dead) this.end(true);
        }
      }
      this.updatePickups(dt);
      this.updateProps(dt);
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
      if (!this.mission) { const pr = this.progress(); pr.endlessBest = Math.max(pr.endlessBest || 0, this.wave); this.saveProgress(pr); }
      $('endtitle').textContent = win ? 'VICTORY' : this.mission ? 'YOU HAVE FALLEN' : 'THE CRUSADE ENDS';
      $('endsub').textContent = win ? (this.type === 'extract' ? 'Extracted. The survivors will remember.' : 'Your deeds will be inscribed upon the walls of the reclusiam.') : this.mission ? (this.objective && this.objective.dead ? 'The objective was lost.' : 'Your gene-seed must be recovered. Try again.') : 'You held for ' + this.wave + ' waves.';
      const mm = Math.floor(s.time / 60), sec = Math.floor(s.time % 60);
      $('endstats').innerHTML = `<div><b>${s.kills}</b>kills</div><div><b>${s.heads}</b>headshots</div><div><b>${s.gibs}</b>obliterated</div><div><b>${s.score}</b>score</div><div><b>${mm}:${String(sec).padStart(2, '0')}</b>time</div>`;
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
  const PC1 = new THREE.Color(0x3a3632), PC2 = new THREE.Color(0x6a6560);

  /* ================= menu ================= */
  const WORLD_ART = { hive: ['#8a4a22', '#1a1210'], ice: ['#a8c0d4', '#2a4a6a'], jungle: ['#5a7a3a', '#1a3020'], tomb: ['#1a3a24', '#020604'], forge: ['#6a2a10', '#100806'], warp: ['#8a1040', '#1a0420'],
    shrine: ['#c8902a', '#20140a'], ash: ['#8a7a68', '#2a2622'], scrap: ['#c0a060', '#3a3020'], craftworld: ['#2a3a6a', '#020208'], sept: ['#e8c890', '#3a6a9a'], agri: ['#c8b060', '#3a6aa8'], hulk: ['#5a1a10', '#050202'] };
  const TYPE_LABEL = { waves: 'Purge', hold: 'Hold', defend: 'Defend', assassinate: 'Assassinate', extract: 'Survive & extract' };
  const ROMAN = n => { const r = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, c] of r) while (n >= v) { s += c; n -= v; } return s; };
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
        el.innerHTML = `<span class="mnum">${ROMAN(i + 1)}</span><span class="mtitle">${m.title}</span><span class="mworld">${G.worlds.defs[m.world].name}</span><span class="mfoe">${TYPE_LABEL[m.type]} · ${m.foe}${m.boss ? ' · boss' : ''}${m.allies ? ' · allies' : ''}</span>` +
          (pr['best_' + m.id] ? `<span class="mbest">best ${pr['best_' + m.id]}</span>` : '') + (locked ? '<span class="lock">LOCKED</span>' : '');
        el.onclick = () => { if (locked) return; G.audio.init(); G.audio.play('ui'); this.brief(m); };
        list.appendChild(el);
      });
      $('endlessBest').textContent = pr.endlessBest ? 'Best: wave ' + pr.endlessBest : '';
      this.classes();
    },
    classes() {
      const box = $('classes'); box.innerHTML = '';
      for (const k in G.arsenal.classes) {
        const c = G.arsenal.classes[k];
        const el = document.createElement('button');
        el.className = 'ccard' + (k === G.arsenal.clsKey ? ' on' : '');
        el.innerHTML = `<b>${c.name}</b><span>${c.desc}</span><i>${c.weapons.map(w => G.arsenal.defs[w].name).join(' · ')}</i><em>E: ${G.arsenal.abilities[c.ability].name}</em>`;
        el.onclick = () => { G.arsenal.setClass(k); try { localStorage.setItem('ironclad_class', k); } catch (e) { } G.audio.init(); G.audio.play('ui'); this.classes(); };
        box.appendChild(el);
      }
    },
    brief(m) {
      $('brief').style.display = 'flex';
      $('btitle').textContent = m.title;
      $('bworld').textContent = G.worlds.defs[m.world].name + ' — ' + TYPE_LABEL[m.type] + ' — ' + m.foe;
      $('btext').textContent = m.brief;
      $('bclass').textContent = 'Deploying as: ' + G.arsenal.cls.name + (m.allies ? ' · with ' + m.allies.map(([t, n]) => n + ' × ' + G.enemies.types[t].name).join(', ') : '');
      $('bgo').onclick = () => { $('brief').style.display = 'none'; GM.start(m); };
    }
  };
  G.menu = Menu;

  function bindUI() {
    $('bback').onclick = () => $('brief').style.display = 'none';
    $('endlessGo').onclick = () => { G.audio.init(); GM.start(null, $('endlessWorld').value, $('endlessFac').value); };
    $('resume').onclick = () => { G.input.lock(); };
    $('quit').onclick = () => GM.quit();
    $('endretry').onclick = () => GM.start(GM.mission, G.worlds.key, GM.faction);
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
  function hideViewmodel() {
    const A = G.arsenal;
    A.root.visible = false; A.handL.visible = A.foreL.visible = A.foreR.visible = false;
    for (const k in A.vm) if (A.vm[k].leftClaw) A.vm[k].leftClaw.visible = A.vm[k].leftFore.visible = false;
  }
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    const playing = GM.state === 'play' && (G.input.locked || TEST);
    if (playing) {
      G.t += dt;
      P.update(dt);
      if (!P.dead) { G.arsenal.root.visible = true; G.arsenal.update(dt); }
      else hideViewmodel();
      G.enemies.update(dt);
      G.shots.update(dt);
      GM.update(dt);
      G.fx.update(dt);
      G.worlds.update(dt, G.camera.position);
      H.update();
    } else if (GM.state === 'menu') {
      G.t += dt;
      const a = G.t * 0.05;
      G.camera.position.set(Math.cos(a) * 30, 9, Math.sin(a) * 30);
      G.camera.lookAt(0, 3, 0);
      G.camera.updateMatrixWorld();
      G.fx.update(dt);
      G.worlds.update(dt, G.camera.position);
      hideViewmodel();
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
    G.models.initMats2();
    G.fx.init();
    try { const c = localStorage.getItem('ironclad_class'); if (c && G.arsenal.classes[c]) G.arsenal.clsKey = c; } catch (e) { }
    G.arsenal.init();
    H.init();
    bindUI();
    G.worlds.build('shrine');
    P.reset(G.worlds.playerStart);
    Menu.show();
    $('loading').style.display = 'none';
    frame();
    if (TEST) {
      const q = new URLSearchParams(location.search);
      if (q.get('cls')) G.arsenal.setClass(q.get('cls'));
      const m = MISSIONS.find(x => x.id === TEST) || MISSIONS.find(x => x.world === TEST) || MISSIONS[0];
      GM.start(m);
      window.__ready = true;
    }
  });
})();
