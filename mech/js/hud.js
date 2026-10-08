// Ironwalkers — in-battle heads-up display (HTML overlay projected over the cockpit).
(function () {
'use strict';
const MW = window.MW;
const $ = id => document.getElementById(id);
const V = new THREE.Vector3();
const TEAM_COL = ['#3ea6ff', '#ff4a3a'];

function project(p, cam, out) {
  V.copy(p).project(cam);
  const behind = V.z > 1;
  out.x = (V.x * 0.5 + 0.5) * innerWidth; out.y = (-V.y * 0.5 + 0.5) * innerHeight; out.on = !behind && V.x > -1.1 && V.x < 1.1 && V.y > -1.1 && V.y < 1.1;
  return out;
}

const H = MW.hud = {
  root: null, markers: [], t: 0,
  start(B) {
    this.B = B; this.root = $('hud'); this.root.classList.add('on');
    const hud = (B.cfg.playerBuild.cockpit || {}).hud || '#ffb52e';
    document.documentElement.style.setProperty('--hud', hud);
    $('hudMode').textContent = MW.MODE[B.mode].name.toUpperCase() + ' · ' + B.mapDef.name.toUpperCase() + ' · TIER ' + MW.TIERS[B.tier].roman;
    // weapons list
    const wl = $('hudWeapons'); wl.innerHTML = '';
    B.player.weapons.forEach(w => { const d = document.createElement('div'); d.className = 'hw'; d.innerHTML = `<b>${w.group}</b><span>${w.wt.short}</span><i><u></u></i>`; wl.appendChild(d); w.el = d; w.bar = d.querySelector('u'); });
    $('hudAbility').querySelector('span').textContent = B.player.cls.ability.name.toUpperCase();
    $('hudJet').style.display = B.player.st.jumpFuel > 0 ? '' : 'none';
    this.markers.forEach(m => m.remove()); this.markers = [];
    $('hudMarkers').innerHTML = '';
    $('feed').innerHTML = ''; $('announce').innerHTML = '';
    this.mm = $('minimap'); this.mmc = this.mm.getContext('2d');
    this.lastFeed = -1;
    this.dmgArcs = [];
  },
  stop() { if (this.root) this.root.classList.remove('on'); $('scoreboard').classList.remove('on'); $('respawn').classList.remove('on'); },
  dummy() { return { hit() {}, damageFrom() {}, killConfirm() {}, announce() {} }; },
  hit(crit) { const h = $('hitmark'); h.classList.remove('on', 'crit'); void h.offsetWidth; h.classList.add('on'); if (crit) h.classList.add('crit'); },
  killConfirm(m) { const k = $('killconf'); k.textContent = 'DESTROYED ' + m.name.toUpperCase(); k.classList.remove('on'); void k.offsetWidth; k.classList.add('on'); },
  damageFrom(pos) {
    const B = this.B; if (!B || !B.player) return; const P = B.player;
    const a = Math.atan2(pos.x - P.pos.x, pos.z - P.pos.z) - (P.yaw + P.twist);
    const d = document.createElement('div'); d.className = 'dmgarc'; d.style.transform = `translate(-50%,-50%) rotate(${-a}rad)`; $('dmgArcs').appendChild(d);
    setTimeout(() => d.remove(), 1200);
  },
  announce(text, kind) {
    const a = $('announce'); const d = document.createElement('div'); d.className = 'ann ' + (kind || ''); d.textContent = text; a.appendChild(d);
    while (a.children.length > 3) a.firstChild.remove();
    setTimeout(() => d.classList.add('out'), 2600); setTimeout(() => d.remove(), 3200);
  },
  marker(i) { let m = this.markers[i]; if (!m) { m = document.createElement('div'); m.className = 'mk'; m.innerHTML = '<i></i><span></span><b></b>'; $('hudMarkers').appendChild(m); this.markers[i] = m; } return m; },
  update(dt, B) {
    const P = B.player; const cam = B.cam; this.t += dt;
    const fmtT = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    // score bar
    const sc = B.score; let txt0 = Math.floor(sc[0]), txt1 = Math.floor(sc[1]), mid = fmtT(B.maxTime - B.time);
    if (B.mode === 'siege') { const atk = B.attackers === 0; $('hudScoreL').innerHTML = atk ? `GENS ${3 - B.gens.filter(g => g.alive).length}/3` : `TICKETS ${B.tickets}`; $('hudScoreR').innerHTML = atk ? `TICKETS ${B.tickets}` : `GENS ${3 - B.gens.filter(g => g.alive).length}/3`; $('hudScoreSub').textContent = atk ? 'ATTACK — DESTROY ALL 3 GENERATORS' : 'DEFEND THE GENERATORS'; }
    else if (B.mode === 'att') { const al = t => B.mechs.filter(m => m.team === t && m.alive).length; $('hudScoreL').textContent = al(0) + ' LEFT'; $('hudScoreR').textContent = al(1) + ' LEFT'; $('hudScoreSub').textContent = 'LAST TEAM STANDING'; }
    else { $('hudScoreL').textContent = txt0; $('hudScoreR').textContent = txt1; $('hudScoreSub').textContent = B.mode === 'dom' ? 'FIRST TO ' + B.target : B.mode === 'heist' ? 'CAPTURES — FIRST TO 3' : 'KILLS — FIRST TO ' + B.target; }
    $('hudTimer').textContent = mid;
    if (B.mode === 'dom') { $('hudPoints').innerHTML = B.points.map(p => `<span style="border-color:${p.owner >= 0 ? TEAM_COL[p.owner] : '#fff'};background:${p.owner >= 0 ? TEAM_COL[p.owner] + '55' : 'transparent'}">${p.name}</span>`).join(''); } else $('hudPoints').innerHTML = '';
    if (!P) return;
    // status
    const hp = P.hp, st = P.st;
    const col = r => r <= 0 ? '#333' : r < 0.3 ? '#ff3b30' : r < 0.6 ? '#ffb52e' : 'var(--hud)';
    $('dCore').style.background = col(hp.core / st.hp.core); $('dArmL').style.background = col(hp.armL / st.hp.armL); $('dArmR').style.background = col(hp.armR / st.hp.armR); $('dLegs').style.background = col(hp.legs / st.hp.legs);
    $('hudArmor').textContent = Math.max(0, Math.round(hp.core / st.hp.core * 100)) + '%';
    const heat = P.heat / st.heatCap; $('heatFill').style.height = Math.min(100, heat * 100) + '%'; $('heatFill').style.background = heat > 0.85 ? '#ff3b30' : heat > 0.6 ? '#ffb52e' : 'var(--hud)'; $('hudHeat').classList.toggle('warn', heat > 0.85);
    $('hudSpeed').textContent = Math.round(Math.abs(P.speed) * 3.6);
    $('thrFill').style.height = Math.abs(P.speed) / (st.speed * 1.6) * 100 + '%';
    $('jetFill').style.width = (st.jumpFuel ? P.jumpFuel / st.jumpFuel * 100 : 0) + '%';
    $('shieldFill').style.width = (st.shield ? P.shield / st.shield * 100 : 0) + '%'; $('hudShield').style.display = st.shield ? '' : 'none';
    const ab = $('hudAbility'); const abr = P.ability.cd <= 0; ab.classList.toggle('ready', abr); ab.querySelector('i').style.width = (1 - P.ability.cd / P.cls.ability.cd) * 100 + '%'; ab.querySelector('em').textContent = abr ? 'Q' : Math.ceil(P.ability.cd);
    P.weapons.forEach(w => { if (!w.el) return; const r = w.wt.fire === 'beam' && w.beamT > 0 ? 0 : 1 - Math.min(1, w.cd * w.s.rate); w.bar.style.width = (w.wt.fire === 'charge' && w.charge > 0 ? Math.min(1, w.charge / w.wt.charge) : r) * 100 + '%'; w.el.classList.toggle('dead', !w.alive); w.el.classList.toggle('ready', w.cd <= 0 && w.alive); w.el.classList.toggle('g2', w.group === 2); });
    // warnings
    const warn = []; if (P.shutdown > 0) warn.push('SHUTDOWN ' + P.shutdown.toFixed(1)); else if (heat > 0.85) warn.push('HEAT CRITICAL');
    if (B.mslWarn > 0) warn.push('INCOMING MISSILES'); else if (B.lockWarn > 0) warn.push('ENEMY LOCK');
    if (P.fx.emp > 0) warn.push('EMP — SENSORS DISRUPTED'); if (P.carrying) warn.push('CARRYING DATA CORE');
    if (P.alive && P.dropping) warn.push('DROPPING — BRACE');
    $('hudWarn').textContent = warn.join('  ·  ');
    // compass
    const yaw = P.yaw + P.twist; const hdg = ((-yaw * 180 / Math.PI) % 360 + 540) % 360;
    $('compassTape').style.transform = `translateX(${-hdg * 4}px)`;
    $('legMark').style.transform = `translateX(${-(((P.twist * 180 / Math.PI)) * 4)}px)`;
    // crosshair state
    const ch = $('cross'); ch.classList.toggle('lockable', !!P.lockTarget); ch.classList.toggle('zoom', B.zoom > 1);
    $('zoomFrame').classList.toggle('on', B.zoom > 1.5);
    // lock box & markers
    let mi = 0; const pt = { x: 0, y: 0, on: false };
    const lockBox = $('lockBox');
    if (P.alive && P.lockTarget && P.weapons.some(w => w.wt.homing && w.alive)) { project(MW.battle.centerOf(P.lockTarget), cam, pt); if (pt.on) { const s = 70 - (P.lockProg || 0) * 30; lockBox.style.cssText = `display:block;left:${pt.x}px;top:${pt.y}px;width:${s}px;height:${s}px`; lockBox.classList.toggle('locked', !!P.lockLocked); } else lockBox.style.display = 'none'; } else lockBox.style.display = 'none';
    if (P.alive) for (const o of B.mechs) {
      if (!o.alive || o === P) continue; const ally = o.team === P.team;
      if (!ally && !(o.vis && !(o.fx.cloak > 0))) continue;
      const c = MW.battle.centerOf(o); c.y += o.model.hit.coreR * o.sc + 3; project(c, cam, pt); if (!pt.on) continue;
      const m = this.marker(mi++); m.style.display = ''; m.style.left = pt.x + 'px'; m.style.top = pt.y + 'px';
      const dist = o.pos.distanceTo(P.pos);
      m.className = 'mk ' + (ally ? 'ally' : 'enemy') + (o === B.hudTarget ? ' tgt' : '');
      m.children[1].textContent = ally ? (dist < 250 ? o.name : '') : (dist < 400 || o === B.hudTarget ? o.name + ' · ' + o.cls.name : '');
      m.children[2].textContent = o === B.hudTarget ? Math.round(dist) + 'm' : '';
      m.children[0].style.setProperty('--hp', (o.hp.core / o.st.hp.core * 100) + '%');
    }
    // objective markers
    const objs = [];
    if (B.points) B.points.forEach(p => objs.push({ p: new THREE.Vector3(p.x, p.h + 20, p.z), label: p.name, col: p.owner >= 0 ? TEAM_COL[p.owner] : '#fff' }));
    if (B.mode === 'heist') { objs.push({ p: B.core.pos.clone().add(new THREE.Vector3(0, 4, 0)), label: '⬡ CORE', col: '#ffd02a' }); if (P.carrying) { const b = B.world.bases[P.team]; objs.push({ p: new THREE.Vector3(b.x, B.world.heightAt(b.x, b.z) + 10, b.z), label: 'RETURN', col: TEAM_COL[0] }); } }
    if (B.mode === 'siege') B.gens.forEach((g, i) => { if (g.alive) objs.push({ p: g.c.clone().add(new THREE.Vector3(0, 12, 0)), label: 'GEN ' + (i + 1) + ' ' + Math.round(g.hp / g.maxHp * 100) + '%', col: g.team === P.team ? TEAM_COL[0] : TEAM_COL[1] }); });
    if (P.alive) objs.forEach(o => { project(o.p, cam, pt); if (!pt.on) return; const m = this.marker(mi++); m.style.display = ''; m.className = 'mk obj'; m.style.left = pt.x + 'px'; m.style.top = pt.y + 'px'; m.style.setProperty('--c', o.col); m.children[1].textContent = o.label; m.children[2].textContent = Math.round(o.p.distanceTo(P.pos)) + 'm'; });
    for (let i = mi; i < this.markers.length; i++) this.markers[i].style.display = 'none';
    // kill feed
    if (B.feed.length && B.feed[B.feed.length - 1] !== this.lastFeedItem) {
      this.lastFeedItem = B.feed[B.feed.length - 1];
      $('feed').innerHTML = B.feed.map(f => `<div class="${f.me ? 'me' : ''}"><b style="color:${TEAM_COL[f.at] || '#aaa'}">${f.a}</b> ${f.verb ? f.verb : '<i>✕</i> <b style="color:' + TEAM_COL[f.vt] + '">' + f.v + '</b>'}</div>`).join('');
    }
    // minimap (every few frames)
    if ((this.mmT = (this.mmT || 0) - dt) <= 0) {
      this.mmT = 0.1; const c = this.mmc, S = B.world.S, W = this.mm.width; c.clearRect(0, 0, W, W);
      c.save(); c.beginPath(); c.arc(W / 2, W / 2, W / 2 - 2, 0, 7); c.clip();
      const zoomR = Math.min(S, 260); const k = W / (2 * zoomR);
      c.translate(W / 2, W / 2); c.rotate(-(-yaw) - Math.PI); c.scale(1, 1);
      c.globalAlpha = 0.85; c.drawImage(B.mapCanvas, (-S - P.pos.x) * k, (-S - P.pos.z) * k, 2 * S * k, 2 * S * k); c.globalAlpha = 1;
      const info = MW.battle.cockpitInfo(P);
      for (const o of B.mechs) { if (!o.alive || o === P) continue; const shown = o.team === P.team || o.vis || B.time - o.lastFire < 2; if (!shown || (o.team !== P.team && o.fx.cloak > 0)) continue; c.fillStyle = o.team === P.team ? TEAM_COL[0] : TEAM_COL[1]; c.beginPath(); c.arc((o.pos.x - P.pos.x) * k, (o.pos.z - P.pos.z) * k, 3.5, 0, 7); c.fill(); }
      if (B.points) B.points.forEach(p => { c.fillStyle = p.owner >= 0 ? TEAM_COL[p.owner] : '#fff'; c.fillRect((p.x - P.pos.x) * k - 5, (p.z - P.pos.z) * k - 5, 10, 10); c.fillStyle = '#000'; c.font = 'bold 9px sans-serif'; c.fillText(p.name, (p.x - P.pos.x) * k - 3, (p.z - P.pos.z) * k + 3); });
      if (B.mode === 'heist') { c.fillStyle = '#ffd02a'; c.beginPath(); c.arc((B.core.pos.x - P.pos.x) * k, (B.core.pos.z - P.pos.z) * k, 5, 0, 7); c.fill(); }
      B.gens.forEach(g => { if (g.alive) { c.fillStyle = g.team === P.team ? TEAM_COL[0] : TEAM_COL[1]; c.fillRect((g.x - P.pos.x) * k - 4, (g.z - P.pos.z) * k - 4, 8, 8); } });
      c.restore(); void info;
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(W / 2, W / 2 - 7); c.lineTo(W / 2 + 5, W / 2 + 5); c.lineTo(W / 2 - 5, W / 2 + 5); c.fill();
    }
    // death / respawn
    const rs = $('respawn');
    if (!P.alive && !B.over) { rs.classList.add('on'); const killer = B.deathCam && B.deathCam.killer && B.deathCam.killer !== P ? B.deathCam.killer.name : 'the environment'; $('rsKiller').textContent = 'DESTROYED BY ' + killer.toUpperCase(); $('rsTimer').textContent = B.respawnTime < 0 ? 'NO RESPAWNS IN ATTRITION — SPECTATING' : (B.canRespawn(P) ? 'REDEPLOYING IN ' + Math.max(0, P.respawn).toFixed(1) : 'NO TICKETS LEFT'); }
    else rs.classList.remove('on');
    // end banner
    const eb = $('endBanner');
    if (B.over) { eb.classList.add('on'); eb.textContent = B.winner === -1 ? 'DRAW' : B.winner === P.team ? 'VICTORY' : 'DEFEAT'; eb.className = 'on ' + (B.winner === P.team ? 'win' : B.winner === -1 ? '' : 'lose'); } else eb.className = '';
    // scoreboard
    const sb = $('scoreboard');
    if (MW.input.keys.Tab) { sb.classList.add('on'); if ((this.sbT = (this.sbT || 0) - dt) <= 0) { this.sbT = 0.3; const rows = MW.battle.scoreboard(); const tbl = t => `<table><tr><th>Pilot</th><th>Class</th><th>T</th><th>K</th><th>D</th><th>A</th><th>DMG</th><th>Score</th></tr>${rows.filter(r => r.team === t).map(r => `<tr class="${r.me ? 'me' : ''} ${r.alive ? '' : 'dead'}"><td>${r.name}</td><td>${r.cls}</td><td>${r.tier}</td><td>${r.k}</td><td>${r.d}</td><td>${r.a}</td><td>${r.dmg}</td><td>${r.score}</td></tr>`).join('')}</table>`; sb.innerHTML = `<div class="sbt blue"><h3>YOUR TEAM</h3>${tbl(0)}</div><div class="sbt red"><h3>ENEMY</h3>${tbl(1)}</div>`; } }
    else sb.classList.remove('on');
  },
};
})();
