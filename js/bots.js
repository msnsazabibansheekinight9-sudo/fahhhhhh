// ============================================================================
// Bots: tiered soldiers with perception (FOV + line of sight + hearing),
// human reaction times, aim error that settles over time, burst discipline,
// strafing, crouching, reloading and A* navigation.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = b - a; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; return d; };

const NAMES = {
  ww1: [['Pte. Atkins', 'Cpl. Hobbs', 'Pte. Barlow', 'Sgt. Whitley', 'Pte. Moss', 'L/Cpl. Finch', 'Pte. Crane'], ['Gefr. Müller', 'Musk. Braun', 'Uffz. Keller', 'Musk. Vogt', 'Gefr. Hahn', 'Musk. Lenz', 'Fw. Roth']],
  ww2: [['Pvt. Kowalski', 'Sgt. Reyes', 'Pfc. Doyle', 'Cpl. Hayes', 'Pvt. Miller', 'Pfc. Novak', 'T/5 Grant'], ['Gefr. Weber', 'Schütze Koch', 'Uffz. Becker', 'Obgfr. Wolf', 'Schütze Frank', 'Gefr. Busch', 'Fw. Kraus']],
  cold: [['Pfc. Walker', 'Sp4 Garza', 'Sgt. Brooks', 'Pvt. Tanaka', 'Cpl. Ortiz', 'Sp4 Bell', 'Pfc. Rhodes'], ['Ryad. Ivanov', 'Efr. Petrov', 'Serzh. Volkov', 'Ryad. Sokolov', 'ML Serzh. Orlov', 'Ryad. Popov', 'Efr. Lebedev']],
  mod: [['SPC Duncan', 'Cpl. Ramos', 'Sgt. Price', 'LCpl. Hart', 'PFC Nguyen', 'SSgt. Cole', 'Cpl. Burke'], ['Hamid', 'Yusuf', 'Karim', 'Tariq', 'Faisal', 'Omar', 'Nabil']],
  now: [['Cpl. Lindqvist', 'Sgt. Okafor', 'Spc. Moreau', 'Pte. Novak', 'Cpl. Brandt', 'Sgt. Silva', 'Spc. Kerr'], ['Mayor Gromov', 'Sgt. Belov', 'Ryad. Zaitsev', 'Efr. Morozov', 'Sgt. Kozlov', 'Ryad. Fedorov', 'Kpt. Egorov']],
  psycho: [['Op. Vesper', 'Op. Kade', 'Lead Halloran', 'Op. Ryker', 'Op. Mercer', 'Op. Sable', 'Op. Voss'], ['Scrap', 'Gutter', 'Hex', 'Rivet', 'Cinder', 'Mange', 'Grinder']]
};
// weighted weapon picks per era and team role
G.eraWeapons = function (era, cls) { return G.WEAPONS.filter(w => w.e === era && (!cls || cls.includes(w.c))); };
// national arsenals per faction: [team 0, team 1] -> { eras to draw from, countries }
const ARSENAL = {
  ww1: [{ eras: ['ww1'], co: ['United Kingdom', 'United States', 'France', 'Canada', 'Kingdom of Italy'] }, { eras: ['ww1'], co: ['German Empire', 'Austria-Hungary'] }],
  ww2: [{ eras: ['ww2'], co: ['United States', 'United Kingdom', 'Australia', 'Poland'] }, { eras: ['ww2'], co: ['Germany', 'Czechoslovakia'] }],
  cold: [{ eras: ['cold'], co: ['United States', 'Belgium / UK', 'West Germany', 'Israel', 'Italy', 'Belgium', 'United Kingdom', 'Austria', 'Switzerland', 'Sweden', 'France', 'South Korea'] }, { eras: ['cold', 'ww2'], co: ['Soviet Union', 'Czechoslovakia', 'China'] }],
  mod: [{ eras: ['mod'], co: ['United States', 'United Kingdom', 'Germany', 'Belgium', 'Italy', 'France', 'Israel / US', 'Switzerland', 'Austria'] }, { eras: ['cold', 'mod'], co: ['Soviet Union', 'Russia', 'China', 'Czechoslovakia'] }],
  now: [{ eras: ['now', 'mod'], co: ['United States', 'Germany', 'United Kingdom', 'Belgium', 'Czech Republic', 'Israel', 'Switzerland', 'Italy', 'Austria', 'Japan'] }, { eras: ['now', 'mod'], co: ['Russia', 'China'] }],
  psycho: [{ eras: ['psycho'], co: ['Blackline Armory', 'Orbital Arms', 'Kessler Dynamics'] }, { eras: ['psycho'], co: ['Rustworks Collective', 'Kessler Dynamics', 'Holloway & Sons', 'Orbital Arms'] }],
};
function pickLoadout(era, role, team) {
  const pools = { rifleman: ['RIF', 'AR', 'BR', 'CAR'], assault: ['SMG', 'SG', 'CAR', 'AR'], gunner: ['LMG'], marksman: ['DMR', 'SR', 'RIF'] };
  const A = ARSENAL[era] && ARSENAL[era][team || 0];
  let list = A ? G.WEAPONS.filter(w => !w.proto && A.eras.includes(w.e) && A.co.includes(w.co) && pools[role].includes(w.c)) : [];
  if (A && !list.length) list = G.WEAPONS.filter(w => A.eras.includes(w.e) && A.co.includes(w.co) && w.c !== 'PST');
  if (!list.length) list = G.eraWeapons(era, pools[role]);
  if (!list.length) list = G.eraWeapons(era, ['RIF', 'AR', 'SMG', 'CAR', 'BR']);
  // prefer the era's own weapons when the faction also draws on an older arsenal
  if (A && A.eras.length > 1) { const own = list.filter(w => w.e === era); if (own.length && Math.random() < .7) list = own; }
  const wp = list[Math.floor(Math.random() * list.length)];
  const L = G.defaultLoadout(wp);
  // bots in later eras use common optics
  if (G.ERA[era].ord >= 3 && ['AR', 'CAR', 'BR', 'LMG'].includes(wp.c)) { const o = G.attachFor(wp, 'optic').filter(a => ['reddot', 'holo', 'acog', 'kobra', 'lpvo'].includes(a.id)); if (o.length && Math.random() < .7) L.optic = o[Math.floor(Math.random() * o.length)].id; }
  return { wp, L };
}
const ROLES = ['rifleman', 'rifleman', 'assault', 'gunner', 'marksman'];

class Bot {
  constructor(game, team, tierId, era, idx, opts = {}) {
    this.game = game; this.team = team; this.tier = G.TIER[tierId]; this.era = era; this.idx = idx;
    this.role = ROLES[idx % ROLES.length];
    const lo = opts.wp ? { wp: opts.wp, L: G.defaultLoadout(opts.wp) } : pickLoadout(era, this.role, team);
    this.wp = lo.wp; this.L = lo.L; this.S = G.resolveStats(this.wp, this.L);
    this.name = opts.name || NAMES[era][team][idx % 7];
    this.pos = V3(); this.vel = V3(); this.yaw = 0; this.pitch = 0;
    this.alive = false; this.hp = 100; this.kills = 0; this.deaths = 0; this.score = 0;
    this.model = G.buildSoldier({ era: opts.look || era, team, tier: tierId, weapon: this.wp, loadout: this.L, kit: opts.kit || null });
    this.model.root.visible = false;
    G.E.world.group.add(this.model.root);
    // tier insignia: a coloured armband so tiers are readable at a glance
    const band = new THREE.Mesh(G.geo.gCylY(.052, .052, .05, 10), G.mat({ color: this.tier.color, roughness: .7 }));
    this.model.arms[0].upper.add(band); band.position.y = .1;
    this.path = []; this.repath = 0; this.think = Math.random() * .25; this.target = null; this.seenT = 0; this.reactT = 0;
    this.aimErr = V3(); this.errT = 0; this.fireCD = 0; this.burstLeft = 0; this.mag = this.S.mag; this.reloadT = 0; this.cycleT = 0;
    this.strafe = 0; this.strafeT = 0; this.crouch = 0; this.stuck = 0; this.lastPos = V3(); this.respawnT = 0; this.lastHeard = null; this.stepT = 0; this.recoil = 0;
    // awareness and personality: every hostile reacts a little differently
    this.sus = 0; this.alert = 'calm'; this.alertT = 0; this.suspect = null; this.duckT = 0; this.coverT = 0; this.hasCover = false; this.lostT = 0; this.nades = Math.random() < .45 ? 1 : 0; this.patrolT = 2 + Math.random() * 4;
    this.pers = { react: .8 + Math.random() * .5, aim: .8 + Math.random() * .45, eyes: .8 + Math.random() * .45, ears: .8 + Math.random() * .4, nerve: Math.random() };
  }
  get eye() { return V3(this.pos.x, this.pos.y + (this.crouch ? 1.1 : 1.58), this.pos.z); }
  spawn(p) {
    if (this.model.gun && this.game.pickups) this.game.pickups = this.game.pickups.filter(q => q.obj !== this.model.gun.holder);
    this.pos.copy(p); this.vel.set(0, 0, 0); this.hp = this.tier.hp * (this.role && this.role.hpK || 1); this.alive = true; if (this.kit) this.armorState = G.newArmorState(); this.mag = this.S.mag; this.reloadT = 0; this.target = null; this.path = [];
    this.yaw = this.team === 0 ? 0 : PI; G.resetSoldier(this.model); this.model.root.rotation.set(0, 0, 0); this.model.root.visible = true;
    this.spawnProt = 1.5; this.sus = 0; this.alert = 'calm'; this.alertT = 0; this.suspect = null; this.duckT = 0;
  }
  hitboxes() { return G.soldierHitboxes(this.model); }
  damage(b, zone, energy, dir, p) {
    if (!this.alive) return { dmg: 0 };
    if (this.spawnProt > 0) return { dmg: 0 };
    let d = b.dmg * energy * (G.ZONE_MUL[zone] || 1);
    let armorStop = false;
    if (this.kit && p) { // the hostile's actual kit: plates, soft armour, helmet and visor resolved like the player's
      const bone = zone === 'head' ? this.model.head : this.model.chest; bone.updateWorldMatrix(true, false);
      const loc = bone.worldToLocal(p.clone()); if (zone === 'head') loc.y += .026;
      const r = G.armorHit(this.kit, zone === 'neck' ? 'chest' : zone, loc, b, (b.v0 || 1) * Math.pow(Math.max(0, energy), 1 / 1.5), this.armorState);
      d *= r.mult; armorStop = r.stopped;
      if (r.stopped) { G.Audio.impact(p, 'metal', false); G.FX.impact(p, dir.clone().negate(), dir, 'metal', .6); if (b.owner === this.game.player && this.game.mode === 'mission') this.game.toast(r.info.replace('STOPPED', 'Hostile armour stopped it —'), 1.1); }
    } else if ((zone === 'chest' || zone === 'stomach') && this.tier.armor < 1 && G.ERA[this.era].ord >= 3) { const m = b.pen >= 4 ? .95 : b.pen >= 3 ? this.tier.armor + .15 : this.tier.armor; d *= m; armorStop = m < .8; }
    this.hp -= d;
    this.model.flinch = Math.min(1.2, this.model.flinch + .7 + d / 60); this.model.flinchDir = Math.sign(Math.random() - .5);
    this.model.headshot = zone === 'head';
    // remember who shot us
    if (b.owner && b.owner.alive) { this.lastHeard = b.owner.pos.clone(); this.sus = Math.max(this.sus, .9); if (this.alert !== 'combat') { this.alert = 'combat'; this.alertT = 45; this.callout(b.owner.pos); } if (!this.target || !this.targetVisible) { this.target = b.owner; this.reactT = this.tier.react * .6 / 1000; } if (this.hasCover || Math.random() < .4) this.duckT = .7 + Math.random() * (1 - this.pers.nerve) * 1.2; }
    if (this.hp <= 0) {
      this.hp = 0; this.alive = false; this.deaths++;
      this.model.dead = .0001; this.model.deathKind = null; this.model.deathDir.copy(dir).setY(0).normalize();
      // convert world fall direction to local
      const inv = -this.yaw; const dx = this.model.deathDir.x, dz = this.model.deathDir.z;
      this.model.deathDir.set(dx * Math.cos(inv) + dz * Math.sin(inv), 0, -dx * Math.sin(inv) + dz * Math.cos(inv)).multiplyScalar(-1);
      this.respawnT = this.game.mode === 'mission' ? 1e9 : 4.5;
      for (const o of this.game.bots) if (o !== this && o.alive && o.team === this.team && o.pos.distanceTo(this.pos) < 25 && G.E.world.los(o.eye, this.eye)) { o.lastHeard = (b.owner && b.owner.pos || this.pos).clone(); o.sus = Math.max(o.sus, .75); if (o.alert === 'calm') { o.alert = 'search'; o.alertT = 35; } o.duckT = Math.max(o.duckT, .6 + Math.random() * .8); }
      this.game.onKill(b.owner, this, b.weapon, zone === 'head');
      if (this.model.gun && this.game.addPickup) this.game.addPickup({ wp: this.wp, L: this.L, mag: Math.max(0, this.mag), reserve: this.S.mag * (this.wp.c === 'PST' ? 2 : this.wp.c === 'LMG' ? 1 : 3), obj: this.model.gun.holder });
      return { dmg: d, killed: true, armorStop };
    }
    return { dmg: d, armorStop };
  }
  enemies() { return this.game.agents.filter(a => a.alive && a.team !== this.team); }
  // shout a contact report: allies nearby (same floor or in sight) start searching where you were seen
  callout(pos, r = 28) {
    if (this.calledT && performance.now() - this.calledT < 4000) return; this.calledT = performance.now();
    if (G.Audio.shout) G.Audio.shout(this.pos);
    for (const b of this.game.bots) { if (b === this || !b.alive || b.team !== this.team || b.alert === 'combat') continue;
      const d = b.pos.distanceTo(this.pos); if (d > r) continue; if (Math.abs(b.pos.y - this.pos.y) > 3 && !G.E.world.los(b.eye, this.eye)) continue;
      b.lastHeard = pos.clone(); b.sus = Math.max(b.sus, .6); b.alert = 'search'; b.alertT = 30; }
  }
  update(dt, now) {
    const M = this.model;
    if (!this.alive) {
      if (M.dead > 0) G.animateSoldier(M, { dt, dead: true });
      this.respawnT -= dt;
      if (this.respawnT <= 1 && M.root.visible) { M.root.position.y -= dt * .6; }
      if (this.respawnT <= 0 && this.game.state === 'play') { if (this.guard) { this.spawn(this.guard.pos.clone().setY(this.guard.pos.y + .05)); this.yaw = this.guard.yaw; this.lastHeard = null; } else this.spawn(this.game.spawnPoint(this.team)); }
      return;
    }
    this.spawnProt -= dt;
    const W = G.E.world, T = this.tier;
    // ---- perception
    // flash-banged: blind and deaf, staggering and crouching
    if (this.stunT > 0) { this.stunT -= dt; this.duckT = Math.max(this.duckT, .2); this.yaw += Math.sin(now * 7 + this.idx) * dt * 1.5; }
    // ---- perception: people notice you over time, not instantly
    this.think -= dt;
    if (this.alertT > 0) { this.alertT -= dt; if (this.alertT <= 0 && this.alert === 'search') this.alert = 'calm'; }
    if (this.think <= 0) {
      const iv = .2 + Math.random() * .1; this.think = iv;
      let best = null, bd = 1e9, bk = 0;
      const eye = this.eye, fwd = V3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const night = G.E.map && G.E.map.env === 'night', nvg = this.kit && this.kit.nvg && this.kit.nvg !== 'n_none';
      for (const e of this.enemies()) {
        const tp = e.eye.clone(); tp.y -= .35;
        const to = tp.clone().sub(eye); const d = to.length(); if (d > 140) continue;
        const dot = to.clone().setY(0).normalize().dot(fwd);
        const fovK = d < 2.5 ? 1 : dot > Math.cos(65 * PI / 180) ? 1 : dot > Math.cos(110 * PI / 180) ? .3 : 0; // focus, peripheral, behind
        if (!fovK) continue;
        if (!W.los(eye, tp)) { if (!W.los(eye, e.eye)) continue; }
        if (this.game.smokeBlocks && this.game.smokeBlocks(eye, tp)) continue; // can't see through a smoke screen
        const vis = e.stance === 2 ? .45 : e.stance === 1 ? .7 : 1;
        const flash = e.lastShotT && now - e.lastShotT < 1.2; // muzzle flash gives you away, even at night
        const range = (60 * vis + 25) * (this.role && this.role.sight || 1) * (night && !nvg && !flash ? .45 : 1) * (e.lightOn ? 1.5 : 1);
        if (d > range) continue;
        const close = 1 - d / range, sp = Math.hypot(e.vel.x, e.vel.z);
        const k = fovK * (.18 + 2.4 * close * close) * (sp > 3 ? 1.7 : sp > .6 ? 1.15 : .7) * (flash ? 2.5 : 1) * this.pers.eyes;
        if (d < bd) { bd = d; best = e; bk = k; }
      }
      const rate = this.alert === 'combat' ? 7 : this.alert === 'search' ? 2.6 : 1.1;
      if (best) { this.sus = Math.min(1.5, this.sus + bk * rate * iv); this.suspect = best.pos.clone(); }
      else this.sus = Math.max(0, this.sus - (this.alert === 'combat' ? .05 : .2) * iv);
      // hearing: running footsteps carry, a crouch-walk barely does
      const Pl = this.game.player;
      if (Pl && Pl.alive && Pl.team !== this.team && !best) { const d = Pl.pos.distanceTo(this.pos), sp = Math.hypot(Pl.vel.x, Pl.vel.z), hr = (sp > 4 ? 14 : sp > 2 ? 7 : sp > .4 ? (Pl.stance ? 2 : 3.5) : 0) * this.pers.ears;
        if (d < hr && Math.abs(Pl.pos.y - this.pos.y) < 3) { this.lastHeard = Pl.pos.clone(); this.sus = Math.max(this.sus, .35); if (this.alert === 'calm') { this.alert = 'search'; this.alertT = 20; } } }
      const was = this.targetVisible;
      this.targetVisible = !!best && this.sus >= 1 && !(this.stunT > 0);
      if (this.targetVisible) {
        if (best !== this.target || !was) { this.reactT = T.react / 1000 * this.pers.react * (.8 + Math.random() * .5) * (bd > 50 ? 1.3 : 1) * (this.alert === 'combat' ? .7 : 1.25); this.errT = 0; }
        if (this.alert !== 'combat') this.callout(best.pos);
        this.alert = 'combat'; this.alertT = 45;
        this.target = best; this.lastSeen = best.pos.clone(); this.seenT = now;
      }
    }
    const tgt = this.target && this.target.alive ? this.target : null;
    if (!tgt) this.target = null;
    const visible = tgt && this.targetVisible;
    // ---- aim
    let desiredYaw = this.yaw, desiredPitch = 0;
    if (visible) {
      const eye = this.eye, aimAt = tgt.eye.clone(); aimAt.y -= Math.random() < T.head ? .02 : .38;
      this.errT -= dt;
      if (this.errT <= 0) { // re-sample aim error, shrinking while engaged
        this.errT = .35 + Math.random() * .4;
        const d = eye.distanceTo(aimAt), moving = Math.hypot(tgt.vel.x, tgt.vel.z) > 1 ? 1.5 : 1;
        const e = T.aimErr * moving * (1 + (this.engageT ? Math.max(0, 1 - this.engageT / 3) : 1)) * (this.vel.lengthSq() > 1 ? 1.4 : 1) / this.pers.aim * (this.hp < this.tier.hp * .35 ? 1.35 : 1);
        this.aimErr.set((Math.random() - .5) * 2 * e, (Math.random() - .5) * 2 * e * .7, 0);
      }
      this.engageT = (this.engageT || 0) + dt;
      // lead moving targets for long shots
      const tof = eye.distanceTo(aimAt) / this.S.v;
      aimAt.addScaledVector(tgt.vel, tof * (T.id === 'elite' || T.id === 'veteran' ? 1 : .4));
      const to = aimAt.sub(eye);
      desiredYaw = Math.atan2(-to.x, -to.z) + this.aimErr.x;
      desiredPitch = Math.atan2(to.y, Math.hypot(to.x, to.z)) + this.aimErr.y;
    } else {
      this.engageT = 0;
      if (this.vel.lengthSq() > .1) desiredYaw = Math.atan2(-this.vel.x, -this.vel.z);
      if (this.lastHeard && !tgt) { const to = this.lastHeard.clone().sub(this.pos); desiredYaw = Math.atan2(-to.x, -to.z); }
    }
    if (!visible && this.sus > .22 && this.suspect && !(this.lastHeard && this.alert === 'combat')) { const to = this.suspect.clone().sub(this.pos); desiredYaw = Math.atan2(-to.x, -to.z); } // "what was that?"
    else if (this.guard && !visible && !this.lastHeard) desiredYaw = (this.patrolDir !== undefined && this.vel.lengthSq() > .2 ? this.patrolDir : this.guard.yaw) + Math.sin(now * (this.alert === 'calm' ? .22 : .6) + this.idx * 1.7) * (this.alert === 'calm' ? .9 : 1.4); // scanning its sector
    const turn = (visible ? T.track : 4) * dt;
    this.yaw += clamp(angDiff(this.yaw, desiredYaw), -turn, turn);
    this.pitch += clamp(desiredPitch - this.pitch, -turn, turn);
    // ---- cover: is there something to duck behind between bursts?
    this.coverT -= dt;
    if (visible && this.coverT <= 0) { this.coverT = .9 + Math.random() * .4; const low = V3(this.pos.x, this.pos.y + .95, this.pos.z), tc = tgt.eye.clone(); tc.y -= .3; this.hasCover = !W.los(low, tc) && W.los(this.eye, tc); }
    if (this.duckT > 0) { this.duckT -= dt; if (this.duckT <= 0) this.reactT = Math.max(this.reactT, .12 + Math.random() * .2); } // pop back up and re-acquire
    // ---- fire
    this.fireCD -= dt; this.reactT -= dt; this.cycleT -= dt;
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.mag = this.S.mag; }
    else if (this.mag <= 0) { this.reloadT = this.reloadDur = this.S.rl[1] * (1.1 - (T.id === 'elite' ? .2 : 0)); G.Audio.mech('magout', this.pos); this.dropMag(); setTimeout(() => this.alive && G.Audio.mech('magin', this.pos), this.reloadDur * 700); }
    const dist = tgt ? tgt.pos.distanceTo(this.pos) : 999;
    const effRange = { SG: 30, SMG: 60, PST: 35, LMG: 150, SR: 400, DMR: 300 }[this.wp.c] || 200;
    const onTarget = visible && Math.abs(angDiff(this.yaw, desiredYaw)) < .08;
    if (visible && this.duckT <= 0 && this.reactT <= 0 && onTarget && this.reloadT <= 0 && this.mag > 0 && this.fireCD <= 0 && this.cycleT <= 0 && dist < effRange && this.spawnProt < 1) {
      const mode = this.S.modes[0];
      if (mode === 'auto') {
        if (this.burstLeft <= 0) this.burstLeft = Math.round((T.burst[0] + Math.random() * (T.burst[1] - T.burst[0])) * (this.role && this.role.burstK || 1)) * (dist < 15 ? 2 : 1);
        this.shoot(); this.burstLeft--; this.fireCD = 60 / this.S.rpm;
        if (this.burstLeft <= 0) { this.fireCD += .25 + Math.random() * .4 * (dist / 40); if (this.hasCover && Math.random() < .5 + (this.hp < this.tier.hp * .5 ? .3 : 0)) this.duckT = .5 + Math.random() * .9; } // duck behind cover between bursts
      } else {
        this.shoot();
        this.fireCD = Math.max(60 / this.S.rpm, (mode === 'semi' ? .28 : .1) + Math.random() * .35 * (dist / 50));
        if (mode === 'bolt' || mode === 'pump' || mode === 'lever') { this.cycleT = (this.wp.cyc || .8) + .3; setTimeout(() => G.Audio.mech(mode === 'bolt' ? 'boltback' : mode, this.pos), 300); }
      }
    }
    if (!visible && this.nades > 0 && this.alert === 'combat' && this.lastSeen && now - this.seenT > 2.5 && now - this.seenT < 12 && this.duckT <= 0 && this.reloadT <= 0 && this.game.throwFrag) {
      const d = this.lastSeen.distanceTo(this.pos);
      if (d > 7 && d < 28 && Math.random() < dt * .5) { this.nades--; const from = this.eye, to = this.lastSeen.clone(), Tf = .9 + d / 22, g = 9.81;
        const v = V3((to.x - from.x) / Tf, (to.y + .3 - from.y + .5 * g * Tf * Tf) / Tf, (to.z - from.z) / Tf); this.game.throwFrag(from, v, this); this.callout(to, 12); }
    }
    // ---- movement
    let move = V3();
    this.repath -= dt;
    const wantDist = { SG: 6, SMG: 10, PST: 8, AR: 22, CAR: 18, BR: 30, RIF: 35, LMG: 35, DMR: 50, SR: 70 }[this.wp.c] || 25;
    if (visible) {
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeT = .6 + Math.random() * 1.4; this.strafe = Math.random() < T.strafe ? (Math.random() < .5 ? -1 : 1) : 0; this.crouch = Math.random() < (this.wp.c === 'LMG' || this.wp.c === 'SR' || this.wp.c === 'DMR' ? .7 : .3) ? 1 : 0; }
      const to = tgt.pos.clone().sub(this.pos).setY(0).normalize();
      const side = V3(-to.z, 0, to.x);
      move.addScaledVector(side, this.strafe);
      if (dist > wantDist * 1.4) move.addScaledVector(to, .8), this.crouch = 0;
      else if (dist < wantDist * .5 && this.wp.c !== 'SG') move.addScaledVector(to, -.5);
      if (this.reloadT > 0 && T.id !== 'recruit') { this.crouch = 1; move.addScaledVector(to, -.6); }
      this.path = [];
    } else {
      this.crouch = 0;
      let goal = null;
      if (tgt && this.lastSeen && now - this.seenT < 8) goal = this.lastSeen;
      else if (this.lastHeard) { goal = this.lastHeard; if (this.pos.distanceTo(goal) < 3) this.lastHeard = null; }
      if (!goal) {
        if (!this.roam || this.pos.distanceTo(this.roam) < 3 || this.repath < -12) {
          // pick a hotspot biased toward the enemy side
          const H = W.hot; const side = this.team === 0 ? -1 : 1;
          const cands = H.filter(h => Math.sign(h.z) === side || Math.random() < .5);
          this.roam = (cands.length ? cands : H)[Math.floor(Math.random() * (cands.length || H.length))] || V3(0, 0, 0);
          this.repath = 0;
        }
        goal = this.roam;
      }
      if (this.repath <= 0 || !this.path.length) { this.path = W.findPath(this.pos, goal); this.repath = 2 + Math.random(); }
      if (this.path.length) {
        const n = this.path[0]; const to = V3(n.x - this.pos.x, 0, n.z - this.pos.z);
        if (to.length() < .7) this.path.shift(); else move.add(to.normalize());
      }
    }
    if (this.guard) { // sentries hold their post: small side-steps while engaged, drift back to the post, never step off a ledge
      const rush = !!this.guard.leash, leash = this.guard.leash || (this.alert !== 'calm' ? 3.5 + this.pers.nerve * 2 : 0), home = V3(this.guard.pos.x - this.pos.x, 0, this.guard.pos.z - this.pos.z);
      const chase = leash ? (visible ? (rush ? tgt.pos : null) : (this.lastHeard || (this.sus > .4 ? this.suspect : null))) : null;
      if (!rush && chase && !visible) this.crouch = this.pers.nerve < .6 ? 1 : 0; // creep toward the noise
      if (chase && Math.abs(chase.y - this.pos.y) < 1.2 && home.length() < leash) { // breachers close the distance, straight at you
        const to = V3(chase.x - this.pos.x, 0, chase.z - this.pos.z); const dd = to.length();
        move = dd > (visible ? 3.5 : 1.5) ? to.normalize().add(visible ? move.setY(0).multiplyScalar(.35) : V3()) : (visible ? move.setY(0).multiplyScalar(.5) : V3());
        if (!visible && dd < 1.5) { this.lastHeard = null; this.suspect = null; this.sus = Math.min(this.sus, .3); }
        if (rush) this.crouch = 0;
      } else {
        move = visible ? move.setY(0).multiplyScalar(.5) : V3();
        if (home.length() > Math.max(2.5, chase ? leash : 0) || (!visible && home.length() > .4 && !this.patrolLeg)) move.copy(home.normalize().multiplyScalar(.7));
        // calm sentries with a beat walk it: post → patrol point → post, pausing at each end
        if (!visible && !chase && this.alert === 'calm' && this.patrol !== null) {
          if (this.patrol === undefined) { this.patrol = null; if (Math.random() < .4) for (let k = 0; k < 8; k++) { const a = Math.random() * PI * 2, r = 4 + Math.random() * 4, px = this.guard.pos.x + Math.cos(a) * r, pz = this.guard.pos.z + Math.sin(a) * r; const gy = W.groundAt(px, pz, this.guard.pos.y + .45, .15); if (Math.abs(gy - this.guard.pos.y) < .1 && W.los(V3(this.guard.pos.x, gy + 1, this.guard.pos.z), V3(px, gy + 1, pz)) && W.los(V3(this.guard.pos.x, gy + .4, this.guard.pos.z), V3(px, gy + .4, pz))) { this.patrol = V3(px, gy, pz); break; } } }
          if (this.patrol) { const goal = this.patrolLeg ? this.patrol : this.guard.pos, to = V3(goal.x - this.pos.x, 0, goal.z - this.pos.z);
            if (to.length() < .5) { this.patrolT -= dt; move.set(0, 0, 0); if (this.patrolT <= 0) { this.patrolLeg = !this.patrolLeg; this.patrolT = 3 + Math.random() * 5; } }
            else { move.copy(to.normalize().multiplyScalar(.45)); this.patrolDir = Math.atan2(-to.x, -to.z); } }
        }
      }
      const ahead = this.pos.clone().addScaledVector(move.clone().normalize(), .6);
      if (move.lengthSq() > 0 && W.groundAt(ahead.x, ahead.z, this.pos.y + .45, .1) < this.pos.y - .35) move.set(0, 0, 0);
      if (visible && this.guard.crouch) this.crouch = 1;
      if (this.duckT > 0) { this.crouch = 1; if (!this.hasCover) move.multiplyScalar(.3); }
    }
    const speed = (this.crouch ? 1.8 : visible ? 2.6 : 3.8) * (this.wp.heavy ? .85 : 1) * (this.role && this.role.speedK || 1) * (this.hp < this.tier.hp * .35 ? .65 : 1) * W.slowAt(this.pos);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);
    this.vel.x += (move.x - this.vel.x) * Math.min(1, dt * 8); this.vel.z += (move.z - this.vel.z) * Math.min(1, dt * 8);
    const before = this.pos.clone();
    W.move(this.pos, this.vel.x * dt, this.vel.z * dt, .32, 1.6);
    this.pos.y = W.groundAt(this.pos.x, this.pos.z, this.pos.y + .45, .15);
    // unstick
    if (move.lengthSq() > .5 && before.distanceTo(this.pos) < speed * dt * .2) { this.stuck += dt; if (this.stuck > .8) { this.path = []; this.repath = 0; this.roam = null; this.stuck = 0; this.strafe *= -1; } } else this.stuck = 0;
    // footsteps near the player
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 1 && this.game.player && this.pos.distanceTo(this.game.player.pos) < 25) { this.stepT += dt * hs * .6; if (this.stepT > 1) { this.stepT = 0; G.Audio.step(G.E.groundKind, this.pos.clone(), hs > 3); } }
    // ---- animate
    M.root.position.copy(this.pos); M.root.rotation.y = this.yaw;
    this.recoil *= Math.pow(.001, dt);
    const rlp = this.reloadT > 0 ? 1 - this.reloadT / this.reloadDur : -1;
    G.animateSoldier(M, { dt, speed: hs, crouch: this.crouch, aimPitch: visible ? this.pitch : 0, aim: visible || !!this.target || this.alert !== 'calm', recoil: this.recoil, sprint: !visible && hs > 3.5 && rlp < 0, reload: rlp });
  }
  shoot() {
    const M = this.model; const salvo = Math.min(this.wp.salvo || 1, Math.max(1, this.mag)); this.mag -= salvo; this.recoil = 1;
    M.root.updateMatrixWorld(true);
    const muzzle = M.gun.holder.localToWorld(M.muzzleLocal.clone());
    const eye = this.eye;
    const dir = V3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    const pellets = this.S.pellets * salvo;
    const cal = G.CAL[this.wp.cal];
    for (let i = 0; i < pellets; i++) {
      const d = dir.clone();
      const spread = (this.S.acc * .00029 * 2 + (pellets > 1 ? .045 : 0) * Math.random() + (this.vel.lengthSq() > 1 ? .01 : 0));
      d.x += (Math.random() - .5) * spread; d.y += (Math.random() - .5) * spread; d.z += (Math.random() - .5) * spread; d.normalize();
      // compensate drop for the target distance
      if (this.target) { const dd = this.target.pos.distanceTo(this.pos); const fl = G.Ballistics.flight(this.S.v, this.S.k, dd); d.y += .5 * 9.81 * fl.t * fl.t / Math.max(5, dd) * (this.tier.id === 'recruit' ? .6 : 1); d.normalize(); }
      G.Ballistics.fire({ pos: eye.clone().addScaledVector(d, .4), dir: d, v: this.S.v, k: this.S.k, dmg: this.S.dmg, pen: this.S.pen, team: this.team, owner: this, tracer: (this.wp.c === 'LMG' && Math.random() < .25) ? (this.team === 1 && G.ERA[this.era].ord >= 2 && this.era !== 'mod' ? 'green' : 'red') : null, streak: false, cal: this.wp.cal, weapon: this.wp, vis: muzzle, pellet: pellets > 1 && !this.wp.salvo && !this.wp.duplex, gyro: this.wp.gyro, he: this.S.he, homing: this.S.homing });
    }
    const fwd = dir;
    G.FX.muzzle(muzzle, fwd, { scale: .5 + cal.cs[0] * 8, sup: this.S.sup, flash: this.S.flash, world: true });
    G.Audio.shot({ cal: this.wp.cal, cls: this.wp.c, sup: this.S.sup, pos: muzzle, loud: this.S.loud });
    // everyone nearby hears it
    for (const b of this.game.bots) if (b !== this && b.alive && b.team !== this.team && b.pos.distanceTo(this.pos) < (this.S.sup ? 15 : 70) && !b.targetVisible) b.lastHeard = this.pos.clone();
    // casing
    if (!this.wp.caseless && Math.random() < .5 && this.game.player && this.pos.distanceTo(this.game.player.pos) < 20) {
      const rt = V3(Math.cos(this.yaw), .8, -Math.sin(this.yaw));
      G.FX.casing(this.wp.cal, muzzle.clone().addScaledVector(fwd, -.4), rt.multiplyScalar(2.5), (x, z, y) => G.E.world.groundAt(x, z, y));
    }
  }
  dropMag() {
    const M = this.model; if (!M.gun || !M.gun.rig.mag || M.gun.rig.magFixed || !this.game.player || this.pos.distanceTo(this.game.player.pos) > 35) return;
    const m = G.mergeByMaterial(M.gun.rig.mag);
    M.root.updateMatrixWorld(true); const p = M.gun.holder.localToWorld(M.magLocal.clone());
    m.position.copy(p); G.FX.scene.add(m);
    G.FX.casings.push({ m, v: V3(0, -1, 0), w: V3(Math.random() * 3, 0, Math.random() * 3), life: 15, bounces: 3, ground: (x, z, y) => G.E.world.groundAt(x, z, y) + .02, shell: false });
  }
  remove() { G.E.world.group.remove(this.model.root); }
}
G.Bot = Bot;
G.pickLoadout = pickLoadout;
})();
